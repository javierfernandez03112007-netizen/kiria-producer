// ---------------------------------------------------------------- Homer tal cual la hoja de modelo que mandó Javi (web/lab/ref/homer_modelo.jpg), sin inventar nada:
// una figura de coleccionista en 3D (piel con brillo suave y calidez, morro con su grano, ojos húmedos, algodón, cuero). Cabeza, camisa, pantalón y
// zapatos son superficies de campos de distancias + marching cubes (el campo solo se calcula cerca de la superficie).
// Medidas sacadas de la hoja (1 cabeza = 5,1 de la coronilla a la barbilla; la figura vestida mide unas 3,4 cabezas). Unidades: 1 = 10 cm.
// Cabeza con el pivote en el origen y la cara hacia +z: coronilla y = 3,65, ojos y = 1,43, boca y = −0,69 (fija por el paladar y la lengua de dentro),
// barbilla y = −1,45; pies en y = −13,6. La mano derecha de Homer está en −x.
const ssub = (d, cut, k) => { const h = clamp(0.5 - 0.5 * (d + cut) / k); return lerp(d, -cut, h) + k * h * (1 - h); };      // resta suave
const E7 = (cx, cy, cz, rx, ry, rz) => [cx, cy, cz, rx, ry, rz, Math.min(rx, ry, rz)];
const sph4 = (x, y, z, S) => Math.hypot(x - S[0], y - S[1], z - S[2]) - S[3];
const hrSS = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
// elipsoide (distancia aproximada de Íñigo Quílez: buena cerca de la superficie)
function hrE(px, py, pz, rx, ry, rz) {
  const ax = px / rx, ay = py / ry, az = pz / rz, k0 = Math.sqrt(ax * ax + ay * ay + az * az), bx = ax / rx, by = ay / ry, bz = az / rz, k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  return k1 < 1e-9 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1;
}
// elipsoide girado alrededor del eje x (t > 0: la parte de arriba se va hacia atrás)
function hrET(x, y, z, E) { const py = y - E.cy, pz = z - E.cz; return hrE(x - E.cx, py * E.ct - pz * E.st, py * E.st + pz * E.ct, E.rx, E.ry, E.rz); }
const hrTilt = E => Object.assign(E, { ct: Math.cos(E.t), st: Math.sin(E.t) });
// cápsula de radio variable (ra en a, rb en b)
function hrCap(x, y, z, ax, ay, az, bx, by, bz, ra, rb) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, px = x - ax, py = y - ay, pz = z - az;
  const h = clamp((px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz));
  return Math.hypot(px - dx * h, py - dy * h, pz - dz * h) - (ra + (rb - ra) * h);
}
// marching cubes genérico: campo sd(x, y, z) (negativo dentro) en la caja [x0,x1]×[y0,y1]×[z0,z1] con paso h → { P, I }.
// Primero una rejilla gruesa (paso 4h); el campo fino solo se calcula donde la superficie puede estar cerca (el resto se interpola).
function mcBuild(sd, x0, y0, z0, x1, y1, z1, h) {
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1;
  const F = new Float32Array(nx * ny * nz), C = 4, H4 = h * C, cx = Math.ceil((nx - 1) / C) + 2, cy = Math.ceil((ny - 1) / C) + 2, cz = Math.ceil((nz - 1) / C) + 2, cxy = cx * cy;
  const G = new Float32Array(cx * cy * cz);
  for (let k = 0, q = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++, q++) G[q] = -sd(x0 + i * H4, y0 + j * H4, z0 + k * H4);
  const band = H4 * 2.2;
  for (let k = 0, q = 0; k < nz; k++) { const k0 = (k / C) | 0, tk = k / C - k0, z = z0 + k * h;
    for (let j = 0; j < ny; j++) { const j0 = (j / C) | 0, tj = j / C - j0, y = y0 + j * h;
      for (let i = 0; i < nx; i++, q++) { const i0 = (i / C) | 0, ti = i / C - i0, b = i0 + cx * j0 + cxy * k0;
        const a0 = G[b] + (G[b + 1] - G[b]) * ti, a1 = G[b + cx] + (G[b + cx + 1] - G[b + cx]) * ti, a2 = G[b + cxy] + (G[b + cxy + 1] - G[b + cxy]) * ti, a3 = G[b + cxy + cx] + (G[b + cxy + cx + 1] - G[b + cxy + cx]) * ti;
        const c0 = a0 + (a1 - a0) * tj, c1 = a2 + (a3 - a2) * tj, g = c0 + (c1 - c0) * tk;
        F[q] = (g > band || g < -band) ? g : -sd(x0 + i * h, y, z); } } }
  const id = (i, j, k) => i + nx * (j + ny * k), vmap = new Map(), P = [], I = [];
  const vert = (i, j, k, ax) => { const key = id(i, j, k) * 3 + ax; let v = vmap.get(key); if (v !== undefined) return v;
    const a = F[id(i, j, k)], b = F[ax === 0 ? id(i + 1, j, k) : ax === 1 ? id(i, j + 1, k) : id(i, j, k + 1)], t = a === b ? 0.5 : a / (a - b);
    v = P.length / 3; P.push(x0 + (i + (ax === 0 ? t : 0)) * h, y0 + (j + (ax === 1 ? t : 0)) * h, z0 + (k + (ax === 2 ? t : 0)) * h); vmap.set(key, v); return v; };
  const CO = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let ci = 0; for (let c = 0; c < 8; c++) if (F[id(i + CO[c][0], j + CO[c][1], k + CO[c][2])] < 0) ci |= 1 << c;
    if (ci === 0 || ci === 255) continue; const o = ci << 4;
    for (let e = 0; triTable[o + e] !== -1; e += 3) for (let m = 0; m < 3; m++) { const Ed = MC_E[triTable[o + e + m]]; I.push(vert(i + Ed[0], j + Ed[1], k + Ed[2], Ed[3])); }
  }
  return { P, I };
}
// geometría con normales del gradiente del campo y color por vértice
function mcGeometry(sd, box, h, colorFn) {
  const { P, I } = mcBuild(sd, ...box, h), n = P.length / 3, N = new Float32Array(n * 3), COL = new Float32Array(n * 3), UV = new Float32Array(n * 2), e = h * 0.5, c = new THREE.Color();
  for (let v = 0; v < n; v++) { const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    const gx = sd(x + e, y, z) - sd(x - e, y, z), gy = sd(x, y + e, z) - sd(x, y - e, z), gz = sd(x, y, z + e) - sd(x, y, z - e), gl = Math.hypot(gx, gy, gz) || 1;
    N[v * 3] = gx / gl; N[v * 3 + 1] = gy / gl; N[v * 3 + 2] = gz / gl; UV[v * 2] = x * 0.9 + z * 0.4; UV[v * 2 + 1] = y * 0.9;
    colorFn(x, y, z, c); COL[v * 3] = c.r; COL[v * 3 + 1] = c.g; COL[v * 3 + 2] = c.b; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(COL, 3)); g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  return g;
}
// oclusión ambiental por vértice a partir de un campo (oscurece los pliegues: alrededor de los ojos, la oreja, la nariz, la boca, el cuello de la camisa…)
function hrAO(sd, x, y, z, nx, ny, nz, s = 0.06, k = 1.6) {
  let o = 0, w = 1; for (let i = 1; i <= 5; i++) { const t = s * i * i * 0.5 + s * 0.5; o += w * Math.max(0, t - sd(x + nx * t, y + ny * t, z + nz * t)) / t; w *= 0.62; }
  return clamp(1 - k * o * 0.42, 0.18, 1);
}

// ---------------------------------------------------------------- la cabeza (medidas de la cabeza de perfil, las de frente y la nuca)
const HM = {
  c1: { cx: 0, cy: 2.194, cz: -0.005, rx: 1.25, ry: 1.407, rz: 1.539 },                       // cráneo en bala (ajustado a la hoja): la masa grande…
  c2: { cx: 0, cy: 2.95, cz: -0.309, rx: 0.75, ry: 0.72, rz: 1.025 },                         // …y la coronilla, que se va hacia atrás
  jw: hrTilt({ cx: 0, cy: 0.633, cz: 0.034, rx: 1.198, ry: 1.691, rz: 1.045, t: 0.314 }),     // mejillas, sienes y mandíbula (detrás del morro)
  nk: { y0: 0.0, y1: -3.6, cz: 0.058, rx: 0.988, rz: 0.817, k: -0.138 },                      // el cuello (sin marcar: la cabeza baja hasta los hombros)
  mu: hrTilt({ cx: 0, cy: -0.003, cz: 1.326, rx: 1.212, ry: 0.696, rz: 1.188, t: -0.296 }),   // el morro de arriba (la punta, hacia delante y abajo)
  ml: { cx: 0, cy: -1.014, cz: 1.049, rx: 1.002, ry: 0.511, rz: 0.692 },                      // labio de abajo y barbilla
  mj: { cx: 0, cy: -0.474, cz: 0.971, rx: 1.176, ry: 0.752, rz: 0.856 },                      // los carrillos del morro (de frente, un disco)
  ns: { ax: 0, ay: 0.93, az: 1.25, bx: 0, by: 0.8, bz: 2.26, rx: 0.31, ry: 0.25 },            // la nariz: un cilindro desde entre los ojos
  ey: { cx: 0.75, cy: 1.43, cz: 1.37, rx: 0.57, ry: 0.6, rz: 0.45 },                          // el ojo izquierdo (el derecho, en −x)
  er: { cx: 1.27, cy: 0.52, cz: -0.17, a: 0.75 },                                              // la oreja (girada a hacia delante)
  mo: { y: -0.69, hw: 0.55, t: 0.032, z0: 1.3 },                                              // la boca: altura, media anchura, media rendija, fondo
  cv: { cx: 0, cy: -0.66, cz: 1.05, rx: 0.6, ry: 0.3, rz: 0.55 },                             // el hueco de la boca (su techo es el paladar)
};
{ const E = HM.er; E.nx = Math.cos(E.a); E.nz = Math.sin(E.a); }
function hrCran(x, y, z) { const A = HM.c1, B = HM.c2; return smin(hrE(x, y - A.cy, z - A.cz, A.rx, A.ry, A.rz), hrE(x, y - B.cy, z - B.cz, B.rx, B.ry, B.rz), 0.302); }
function hrNeck(x, y, z) { const N = HM.nk, zc = N.cz + N.k * (Math.max(y, -1.9) + 1.0), e = (Math.hypot(x / N.rx, (z - zc) / N.rz) - 1) * Math.min(N.rx, N.rz); return Math.max(e, y - N.y0, N.y1 - y); }
function hrMuzzle(x, y, z) { const L = HM.ml, J = HM.mj; let d = smin(smin(hrET(x, y, z, HM.mu), hrE(x, y - L.cy, z - L.cz, L.rx, L.ry, L.rz), 0.266), hrE(x, y - J.cy, z - J.cz, J.rx, J.ry, J.rz), 0.25);
  return smin(d, hrE(x, y - 0.5, z - 1.98, 0.36, 0.15, 0.3), 0.12); }     // arriba, el morro llega hasta la nariz (sin hueco)
function hrNose(x, y, z) {
  const N = HM.ns, dx = N.bx - N.ax, dy = N.by - N.ay, dz = N.bz - N.az, px = x - N.ax, py = y - N.ay, pz = z - N.az;
  const h = clamp((px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz)), ox = (px - dx * h) / N.rx, oy = (py - dy * h) / N.ry, oz = (pz - dz * h) / N.ry;
  return (Math.sqrt(ox * ox + oy * oy + oz * oz) - 1) * N.ry;
}
// la oreja (ax = |x|): un disco con el hueco, abierto por delante (la C de la hoja) y la T de dentro
function hrEar(ax, y, z) {
  const E = HM.er, px = ax - E.cx, py = y - E.cy, pz = z - E.cz, w = px * E.nx + pz * E.nz, u = -px * E.nz + pz * E.nx;
  if (w * w + u * u + py * py > 0.5) return 0.6;
  let d = hrE(u, py, w, 0.3, 0.36, 0.2);
  d = ssub(d, hrE(u - 0.035, py, w - 0.2, 0.2, 0.25, 0.15), 0.04);
  d = ssub(d, hrE(u - 0.29, py + 0.02, w - 0.1, 0.13, 0.15, 0.17), 0.03);
  d = smin(d, hrCap(u, py, w, -0.13, 0.06, 0.06, 0.12, 0.06, 0.06, 0.034, 0.03), 0.03);
  return smin(d, hrCap(u, py, w, -0.005, 0.06, 0.06, -0.005, -0.13, 0.05, 0.032, 0.028), 0.03);
}
// la cuenca de cada ojo (un poco mayor que el ojo: deja sitio a los párpados)
function hrSock(ax, y, z) { const E = HM.ey; return hrE(ax - E.cx, y - E.cy, z - E.cz, E.rx + 0.035, E.ry + 0.035, E.rz + 0.035); }
function hrEyeD(ax, y, z) { const E = HM.ey; return hrE(ax - E.cx, y - E.cy, z - E.cz, E.rx, E.ry, E.rz); }
// todo lo que no es el morro (para saber dónde acaba el color tostado)
function hrRest(x, y, z) { let d = smin(smin(hrCran(x, y, z), hrET(x, y, z, HM.jw), 0.547), hrNeck(x, y, z), 0.281);
  d = smin(d, hrE(x, y + 0.72, z - 0.2, 1.1, 0.72, 0.85), 0.3);                                   // la mandíbula por detrás del morro (de espaldas no se ve el morro)
  const E = HM.ey, ax = Math.abs(x); return smin(d, Math.max(hrE(ax - E.cx, y - E.cy, z - E.cz, E.rx + 0.06, E.ry + 0.06, E.rz + 0.06), z - E.cz + 0.25), 0.08); }   // la piel que envuelve el ojo por detrás (de espaldas no asoma el blanco)
// la cabeza con la boca cerrada (sin rendija)
function hrHeadClosed(x, y, z) {
  const ax = Math.abs(x); let d = hrRest(x, y, z);
  d = smin(d, hrMuzzle(x, y, z), 0.3);
  d = smin(d, hrNose(x, y, z), 0.12);
  d = smin(d, hrEar(ax, y, z), 0.07);
  return ssub(d, hrSock(ax, y, z), 0.07);
}
// la rendija de la boca y el hueco de dentro (negativo dentro)
function hrMouthCut(x, y, z) {
  const M = HM.mo, C = HM.cv, ax = Math.abs(x), tx = ax < M.hw ? M.t * Math.sqrt(1 - (ax / M.hw) ** 2) : 0;
  const slit = Math.max(Math.abs(y - M.y) - tx, M.z0 - z, ax - M.hw);
  return Math.min(slit, hrE(x - C.cx, y - C.cy, z - C.cz, C.rx, C.ry, C.rz));
}
// la cabeza tal como es la malla (la boca con su rendija abierta y el hueco): la usan también el corte de perfil y el cerebro
function sdHead(x, y, z) { return Math.max(hrHeadClosed(x, y, z), -hrMouthCut(x, y, z)); }
// la cabeza cerrada con los ojos (para la oclusión)
function hrHeadAO(x, y, z) { return Math.min(hrHeadClosed(x, y, z), hrEyeD(Math.abs(x), y, z)); }
// el color tostado del morro: > 0 dentro (la parte de la superficie que es del morro y no del resto de la cabeza)
function hrPaint(x, y, z) {
  const ax = Math.abs(x), yt = 0.6 - 0.6 * Math.pow(Math.min(1, ax / 1.18), 2.4) + 0.22 * hrSS(1.5, 0.8, z) * hrSS(0.5, 1.0, ax);       // borde de arriba (de frente)
  const zb = y > 0 ? 0.5 + 1.1 * y : y < -0.9 ? 0.5 + 1.4 * Math.pow(-0.9 - y, 1.3) : 0.5;                                          // borde de atrás (de perfil)
  return Math.min(hrRest(x, y, z) - hrMuzzle(x, y, z) + 0.05, (yt - y) * 0.7, (z - zb) * 0.7);
}
const HEAD_BOX = [-1.75, -3.55, -1.75, 1.75, 3.85, 2.75];
// el hueco del cráneo (donde va el cerebro): elipsoide inscrito en el cráneo con 0,26 de hueso y piel
const HEADP = { cran: E7(0, 2.0, -0.12, 0.91, 1.42, 1.18), cav: E7(0, 2.0, -0.12, 0.91, 1.42, 1.18), palate: [0, -0.36, 1.05], forehead: [0, 2.35, 1.38],
  eyes: [[0.75, 1.43, 1.35], [-0.75, 1.43, 1.35]], mouth: [0, -0.69, 2.05] };
const JAW_P = new THREE.Vector3(0, -0.15, -0.3), JAW_A = 0.28;
// el zigzag del pelo (de oreja a oreja por la nuca): puntos (ángulo alrededor de la cabeza en grados, altura). 0° = la nuca; −x (la derecha de Homer) a la izquierda
const HR_ZZ = (() => { const side = [[63, 1.5], [80, 0.95], [80, 1.42], [96, 1.15], [100, 1.68], [114, 1.33]], back = [[-41, 1.12], [-18, 1.6], [0, 1.12]];
  const L = [...side.slice().reverse().map(([a, y]) => [-a, y]), ...back, ...back.slice(0, 2).reverse().map(([a, y]) => [-a, y]), ...side];
  return L.map(([a, y]) => [a * Math.PI / 180 * 1.25, y]); })();
// los dos pelos de arriba: arcos tumbados hacia atrás (pie izquierdo, punta, pie derecho)
function hrHairPts() {
  const arc = (zc, yf, w, h, lean, yaw, n = 26) => { const P = [], cy = Math.cos(yaw), sy = Math.sin(yaw), cl = Math.cos(lean), sl = Math.sin(lean);
    for (let i = 0; i <= n; i++) { const a = Math.PI * i / n, u = -Math.cos(a) * w, v = Math.sin(a) * h;      // el arco en su plano (u: de lado a lado, v: hacia arriba)
      const yy = yf + v * cl, zz = zc - v * sl; P.push([u * cy, yy, zz + u * sy]); } return P; };
  return [arc(-0.42, 3.5, 0.58, 0.36, 0.95, 0.42), arc(-0.92, 3.32, 0.62, 0.36, 1.05, 0.42)];
}
// el garabato «~» de la boca en reposo (de frente: x, y), como en la cabeza grande de frente
const HR_SQ = [[0.44, -0.13], [0.53, -0.28], [0.56, -0.42], [0.48, -0.53], [0.32, -0.57], [0.12, -0.57], [-0.02, -0.59], [-0.07, -0.66], [99, 99],
  [0.33, -0.58], [0.3, -0.68], [0.23, -0.8], [0.16, -0.92]];
const tri = x => 1 - 4 * Math.abs(((x % 1) + 1) % 1 - 0.5);       // onda en triángulo (−1 … 1)
let HEAD_GEO = null;
function headGeo() {
  if (HEAD_GEO) return HEAD_GEO;
  const t0 = performance.now(), hh = 0.028, M = HM.mo;
  const { P, I } = mcBuild(sdHead, ...HEAD_BOX, hh), n = P.length / 3;
  const R = new Float32Array(n * 3), N = new Float32Array(n * 3), A = new Float32Array(n * 4), UV = new Float32Array(n * 2), inner = new Uint8Array(n), e = 0.012;
  const grad = (f, x, y, z, o) => { const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e), gl = Math.hypot(gx, gy, gz) || 1; o[0] = gx / gl; o[1] = gy / gl; o[2] = gz / gl; };
  const g3 = [0, 0, 0];
  for (let v = 0; v < n; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2], ax = Math.abs(x), isIn = hrHeadClosed(x, y, z) < -0.006;
    inner[v] = isIn ? 1 : 0;
    // la boca se cierra: los labios se juntan sobre la rendija (las posiciones abiertas sirven para los gestos)
    let yc = y;
    if (ax < M.hw + 0.05 && z > M.z0 - 0.05) { const tx = ax < M.hw ? M.t * Math.sqrt(1 - (ax / M.hw) ** 2) : 0, dy = y - M.y, a = Math.abs(dy), b = 3 * M.t;
      if (a < b) yc = M.y + Math.sign(dy) * (a <= tx ? 0 : (a - tx) * b / (b - tx)); }
    let xc = x, zc = z;
    if (!isIn && yc !== y) for (let it = 0; it < 3; it++) { const d = hrHeadClosed(xc, yc, zc); grad(hrHeadClosed, xc, yc, zc, g3); xc -= g3[0] * d; yc -= g3[1] * d; zc -= g3[2] * d; }
    R[v * 3] = xc; R[v * 3 + 1] = yc; R[v * 3 + 2] = zc;
    if (isIn) grad(sdHead, x, y, z, g3); else grad(hrHeadClosed, xc, yc, zc, g3);
    N[v * 3] = g3[0]; N[v * 3 + 1] = g3[1]; N[v * 3 + 2] = g3[2];
    A[v * 4] = isIn ? -1 : hrPaint(xc, yc, zc); A[v * 4 + 1] = isIn ? 1 : 0; A[v * 4 + 2] = isIn ? 0.3 : hrAO(hrHeadAO, xc, yc, zc, g3[0], g3[1], g3[2]); A[v * 4 + 3] = 0;
    UV[v * 2] = xc * 0.9 + zc * 0.4; UV[v * 2 + 1] = yc * 0.9;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(R, 3)); g.setIndex(I);
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('hm', new THREE.BufferAttribute(A, 4)); g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  // gestos (morph, relativos): 0 = la «O» de la hoja (la mandíbula gira en JAW_P), 1 = sonrisa grande, 2 = dientes apretados (mueca)
  const jaw = new Float32Array(n * 3), smile = new Float32Array(n * 3), grim = new Float32Array(n * 3), jn = new Float32Array(n * 3);
  const Rm = new THREE.Matrix4().makeRotationX(JAW_A), Rn = new THREE.Matrix3().setFromMatrix4(Rm), p = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let v = 0; v < n; v++) {
    const x = P[v * 3], y0 = P[v * 3 + 1], z = R[v * 3 + 2], y = R[v * 3 + 1], ax = Math.abs(x), sx = Math.sign(x) || 1;
    // ¿labio de abajo (1) o de arriba (0)? En la rendija lo dice la posición abierta; fuera, una transición suave por la mejilla
    const inSlit = ax < M.hw + 0.02 && z > M.z0 - 0.1, cw = hrSS(M.hw + 0.02, M.hw - 0.14, ax) * (inSlit ? 1 : 0);
    const below = lerp(hrSS(M.y + 0.3, M.y - 0.3, y), y0 < M.y ? 1 : 0, cw);
    // la mandíbula: el labio de abajo y la barbilla (por delante), el suelo de la boca; se apaga hacia la nuca y el cuello
    const wjr = hrSS(-0.35, 0.45, z) * (1 - hrSS(-1.55, -2.0, y)) * (1 - 0.55 * hrSS(0.75, 1.15, ax)), wj = below * wjr;
    p.set(x, y, z).sub(JAW_P).applyMatrix4(Rm).add(JAW_P);
    const lip = Math.exp(-(((y - M.y) / 0.42) ** 2)) * hrSS(0.9, 1.5, z), prof = ax < M.hw ? Math.sqrt(1 - (ax / M.hw) ** 2) : 0;
    // «O»: la mandíbula baja, la boca se redondea (las comisuras hacia el centro) y los labios salen un poco
    jaw[v * 3] = (p.x - x) * wj - 0.42 * x * lip * hrSS(1.3, 0.7, ax);
    jaw[v * 3 + 1] = (p.y - y) * wj + below * lip * 0.42 * (1 - prof) * (1 - hrSS(0.75, 1.0, ax)) + (1 - below) * lip * 0.1 * prof;
    jaw[v * 3 + 2] = (p.z - z) * wj + 0.1 * lip * hrSS(1.2, 0.3, ax);
    nn.set(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]).applyMatrix3(Rn); jn[v * 3] = (nn.x - N[v * 3]) * wj; jn[v * 3 + 1] = (nn.y - N[v * 3 + 1]) * wj; jn[v * 3 + 2] = (nn.z - N[v * 3 + 2]) * wj;
    // sonrisa: comisuras arriba, afuera y atrás; el labio de arriba sube un poco (dientes de arriba) y el de abajo baja en «U»; las mejillas suben
    const gc = Math.exp(-(((ax - 0.55) ** 2) + (y - M.y) ** 2) / 0.09) * hrSS(0.6, 1.4, z), ck = Math.exp(-(((ax - 0.75) ** 2) + (y + 0.1) ** 2) / 0.22) * hrSS(0.5, 1.3, z);
    smile[v * 3] = sx * 0.2 * gc; smile[v * 3 + 1] = 0.3 * gc + 0.1 * ck + lip * (0.1 * (1 - below) - 0.36 * below * Math.max(prof, 0.25 * hrSS(0.95, 0.5, ax))); smile[v * 3 + 2] = -0.12 * gc;
    // mueca (dientes apretados): los labios se separan en un rectángulo ancho, las comisuras se van hacia los lados
    const pr2 = ax < M.hw + 0.1 ? Math.pow(Math.max(0, 1 - (ax / (M.hw + 0.1)) ** 4), 0.5) : 0;
    grim[v * 3] = sx * 0.2 * gc; grim[v * 3 + 1] = lip * (0.2 * (1 - below) - 0.22 * below) * pr2 - 0.02 * gc + 0.08 * ck; grim[v * 3 + 2] = -0.1 * gc;
  }
  g.morphAttributes.position = [new THREE.BufferAttribute(jaw, 3), new THREE.BufferAttribute(smile, 3), new THREE.BufferAttribute(grim, 3)];
  g.morphAttributes.normal = [new THREE.BufferAttribute(jn, 3), new THREE.BufferAttribute(new Float32Array(n * 3), 3), new THREE.BufferAttribute(new Float32Array(n * 3), 3)];
  g.morphTargetsRelative = true;
  console.log('cabeza: ' + n + ' vértices, ' + (I.length / 3) + ' triángulos, ' + Math.round(performance.now() - t0) + ' ms'); HEAD_GEO = g; return g;
}

// ---------------------------------------------------------------- materiales: escarcha y modo fantasma (freezable) y la piel de la figura (stubbly)
// ---------- congelación: escarcha que se extiende desde la boca (y se derrite desde la boca con el truco); FZ.gh: la piel y la ropa se vuelven cristal azul
const FZ = { c: { value: new THREE.Vector3(0, -0.67, 2.2) }, r: { value: 0 }, m: { value: 0 }, pc: { value: new THREE.Vector3(0, 2.3, 1.45) }, pk: { value: 0 }, gh: { value: 0 } };
function freezable(m) {
  const prev = m.onBeforeCompile; m.transparent = true;
  m.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); sh.uniforms.fzC = FZ.c; sh.uniforms.fzR = FZ.r; sh.uniforms.fzM = FZ.m; sh.uniforms.pnC = FZ.pc; sh.uniforms.pnK = FZ.pk; sh.uniforms.ghK = FZ.gh;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFzW;').replace('#include <project_vertex>', '#include <project_vertex>\nvFzW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vFzW; uniform vec3 fzC, pnC; uniform float fzR, fzM, pnK, ghK;
float fzH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float fzN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(fzH(i), fzH(i + vec3(1,0,0)), f.x), mix(fzH(i + vec3(0,1,0)), fzH(i + vec3(1,1,0)), f.x), f.y), mix(mix(fzH(i + vec3(0,0,1)), fzH(i + vec3(1,0,1)), f.x), mix(fzH(i + vec3(0,1,1)), fzH(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float fzD = distance(vFzW, fzC), fzN1 = fzN(vFzW * 9.) * 0.6 + fzN(vFzW * 23.) * 0.4;
float fzK = (1. - smoothstep(fzR - 0.3, fzR, fzD + fzN1 * 0.25)) * smoothstep(fzM, fzM + 0.3, fzD + fzN1 * 0.25);
float fzB = fzK * (1. - smoothstep(fzR - 0.45, fzR - 0.05, fzD + fzN1 * 0.25));
diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.12, 0.3, 0.6), vec3(0.5, 0.72, 0.93), smoothstep(0.25, 0.85, fzN1)) * (0.85 + 0.3 * fzN(vFzW * 41.)), fzK * 0.9);
float pnD = distance(vFzW, pnC), pnA = pnK * exp(-pnD * pnD / 0.35);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.03, 0.02), clamp(pnA, 0., 0.85));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float fzRim = pow(1. - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2); vec3 fzQ = fract(vFzW * 70.) - 0.5;
totalEmissiveRadiance = mix(totalEmissiveRadiance, vec3(0.0), fzK * 0.8) + vec3(0.9, 0.04, 0.02) * pnA * 0.8 + vec3(0.3, 0.62, 1.0) * fzB * 0.7 + vec3(0.45, 0.7, 1.0) * fzRim * fzK * 0.12 + vec3(1.2) * fzK * step(0.993, fzH(floor(vFzW * 70.))) * (1. - smoothstep(0.15, 0.4, length(fzQ)));`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.18, fzK);')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
{ float ghR = pow(1. - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
  vec3 ghC = vec3(0.5, 0.72, 1.0) * (0.1 + 1.5 * ghR) + vec3(1.0, 0.12, 0.06) * pnA * 1.4;
  gl_FragColor = mix(gl_FragColor, vec4(ghC, clamp(0.03 + 0.72 * ghR + pnA * 0.5, 0., 1.)), ghK); }`); };
  return m;
}
// colores de la hoja (calibrados para que, con la luz de estudio y el acabado ACES, el promedio salga como la hoja: piel #F7C846, morro #CF9259)
const HR_COL = { skin: new THREE.Color(0.93, 0.56, 0.085), muz: new THREE.Color(0.6, 0.255, 0.105), pants: new THREE.Color(0.165, 0.21, 0.55) };
// la piel de la figura: color de la hoja (amarillo y, en la cabeza, el morro tostado con su grano finísimo), luz que envuelve la sombra en tono cálido
// (calidez de subsurface fingida, sin transmission), microtextura muy sutil y, en la cabeza, el zigzag del pelo y el garabato de la boca en reposo
// pintados como en la hoja. Va después de freezable() (usa su ruido fzN). o.head: la malla de la cabeza (atributo hm: morro, boca por dentro, oclusión).
function stubbly(m, o = {}) {
  const prev = m.onBeforeCompile, head = !!o.head;
  m.customProgramCacheKey = () => 'hrSkin' + (head ? 'H' : 'P');
  m.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r);
    sh.uniforms.hrSkin = { value: HR_COL.skin }; sh.uniforms.hrMuz = { value: HR_COL.muz };
    if (head) { sh.uniforms.hrZZ = { value: HR_ZZ.map(([a, b]) => new THREE.Vector2(a, b)) }; sh.uniforms.hrSQ = { value: HR_SQ.map(([a, b]) => new THREE.Vector2(a, b)) }; }
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHp; varying vec4 vHm; varying float vMouth;' + (head ? '\nattribute vec4 hm;' : ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHp = position; vHm = ' + (head ? 'hm;\nvMouth = clamp(morphTargetInfluences[0] + morphTargetInfluences[1] * 1.3 + morphTargetInfluences[2] * 1.3, 0., 1.);' : 'vec4(-1., 0., 1., 0.); vMouth = 0.;'));
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vHp; varying vec4 vHm; varying float vMouth; uniform vec3 hrSkin, hrMuz;` + (head ? `
uniform vec2 hrZZ[${HR_ZZ.length}]; uniform vec2 hrSQ[${HR_SQ.length}];
float hrSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)); }` : ''))
      .replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment.replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
        `reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
  { float hrW = saturate( ( dot( geometryNormal, directLight.direction ) + 0.5 ) / 1.5 );          // la luz envuelve la sombra (piel cálida)
    reflectedLight.directDiffuse += max( hrW * hrW - dotNL, 0. ) * vec3( 1.0, 0.62, 0.36 ) * 0.85 * directLight.color * BRDF_Lambert( material.diffuseColor ); }`))
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 c = hrSkin * (0.975 + 0.05 * fzN(vHp * 7.)) * (0.988 + 0.024 * fzN(vHp * 95.));` + (head ? `
  float fw = max(fwidth(vHm.x), 1e-4), mz = smoothstep(-fw, fw, vHm.x);
  float g1 = fzN(vHp * 230.), g2 = fzN(vHp * 61. + 3.), g3 = fzN(vHp * 17. + 7.);
  vec3 mc = hrMuz * (0.95 + 0.1 * g3) * (1.04 - 0.08 * smoothstep(0.55, 0.8, g2));
  mc = mix(mc, hrMuz * 0.55, smoothstep(0.66, 0.82, g1) * 0.5);                                   // el grano de la barba (del color de la hoja)
  c = mix(c, mc, mz);
  c = mix(c, vec3(0.13, 0.025, 0.02), clamp(vHm.y, 0., 1.));                                      // la boca por dentro
  // el zigzag del pelo (línea fina, como en la hoja) y el garabato «~» de la boca en reposo
  { float ph = atan(vHp.x, -(vHp.z + 0.2)) * 1.25, d = 9.;
    for (int i = 0; i < ${HR_ZZ.length - 1}; i++) d = min(d, hrSeg(vec2(ph, vHp.y), hrZZ[i], hrZZ[i + 1]));
    float aa = fwidth(d) + 1e-4, ln = (1. - smoothstep(0.019 - aa, 0.019 + aa, d)) * step(abs(ph), 2.6) * (1. - vHm.y);
    c = mix(c, vec3(0.16, 0.1, 0.03), ln * 0.92); }
  if (vHp.z > 1.35 && vHm.y < 0.5) { float d = 9.;
    for (int i = 0; i < ${HR_SQ.length - 1}; i++) { if (hrSQ[i].x > 50. || hrSQ[i + 1].x > 50.) continue; d = min(d, hrSeg(vHp.xy, hrSQ[i], hrSQ[i + 1])); }
    float aa = fwidth(d) + 1e-4, ln = (1. - smoothstep(0.036 - aa, 0.036 + aa, d)) * (1. - vMouth) * smoothstep(1.35, 1.6, vHp.z);
    c = mix(c, vec3(0.2, 0.07, 0.03), ln * 0.95); }` : '') + `
  diffuseColor.rgb = c; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * (0.9 + 0.2 * fzN(vHp * 140.))' + (head ? ' + 0.12 * smoothstep(-0.02, 0.02, vHm.x)' : '') + ', 0.05, 1.);')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= vHm.z; reflectedLight.directDiffuse *= mix(1., vHm.z, 0.55); reflectedLight.indirectSpecular *= mix(1., vHm.z, 0.7);'); };
  return m;
}
function hrSkinMat(head) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, clearcoat: 0.1, clearcoatRoughness: 0.4, sheen: 0.15, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xffd890) });
  return stubbly(freezable(m), { head });
}

// ---------------------------------------------------------------- ojos (círculos blancos grandes, brillantes y húmedos, con el punto negro), párpados solo al parpadear
function hrLidGeo(top) {      // media cáscara (párpado de arriba o de abajo) con un gesto de arrugas (morph) para los ojos apretados
  const g = new THREE.SphereGeometry(1.055, 48, 20, 0, Math.PI * 2, top ? 0 : Math.PI / 2, Math.PI / 2), P = g.attributes.position, d = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), th = Math.acos(clamp(Math.abs(y) / 1.055, 0, 1)), e = Math.PI / 2 - th;   // e: distancia al borde
    const k = 0.06 * Math.pow(Math.sin(e * 9.5), 2) * Math.exp(-e * 2.2) * (0.6 + 0.4 * Math.abs(x)) + 0.05 * Math.exp(-e * 6);
    d[i * 3] = x * k; d[i * 3 + 1] = y * k; d[i * 3 + 2] = z * k; }
  g.morphAttributes.position = [new THREE.BufferAttribute(d, 3)]; g.morphTargetsRelative = true; return g;
}
function makeEye(lidM) {
  const E = HM.ey, g = new THREE.Group(), s = new THREE.Group(); s.scale.set(E.rx, E.ry, E.rz); g.add(s);
  const white = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), freezable(new THREE.MeshPhysicalMaterial({ color: 0xfbfaf7, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.025, sheen: 0.2, sheenColor: new THREE.Color(0xffffff) })));
  white.castShadow = true; white.receiveShadow = true; s.add(white);
  const look = new THREE.Group(); s.add(look);
  const pup = new THREE.Mesh(new THREE.SphereGeometry(1.004, 40, 10, 0, Math.PI * 2, 0, 0.165), freezable(new THREE.MeshPhysicalMaterial({ color: 0x050403, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02 })));
  pup.rotation.x = Math.PI / 2; look.add(pup);
  const lidU = new THREE.Mesh(hrLidGeo(true), lidM), lidL = new THREE.Mesh(hrLidGeo(false), lidM); lidU.castShadow = lidL.castShadow = true; s.add(lidU, lidL);
  g.userData = { s, look, pup, lidU, lidL, base: s.scale.clone() }; eyePose(g, 1); return g;
}
// pose de un ojo: abierto (0 cerrado … 1 normal … 1,5 muy abierto), pupila, mirada (yaw: hacia +x; pitch > 0: hacia abajo).
// Por debajo de 0,3 los párpados se cierran; entre 0,1 y 0,3 (ojos apretados de dolor) salen las arrugas de los párpados.
function eyePose(e, open, pup = 1, yaw = 0, pitch = 0) {
  const U = e.userData, cl = 1 - hrSS(0.3, 0.88, open), sq = hrSS(0.36, 0.2, open) * hrSS(0.0, 0.1, open);
  U.lidU.rotation.x = lerp(-1.95, 0.08, cl); U.lidL.rotation.x = lerp(1.9, 0.08, cl); U.lidU.visible = U.lidL.visible = cl > 0.002;
  U.lidU.morphTargetInfluences[0] = U.lidL.morphTargetInfluences[0] = sq;
  U.s.scale.copy(U.base).multiplyScalar(1 + 0.06 * clamp(open - 1, 0, 0.5));
  U.pup.scale.setScalar(pup); U.look.rotation.set(pitch, yaw, 0);
}
// tubo que adelgaza en las puntas (los pelos)
function taperTube(pts, r, m, seg = 40, rs = 12, prof = u => Math.sin(Math.PI * clamp(u * 0.92 + 0.04))) {
  const cv = new THREE.CatmullRomCurve3(pts), geo = new THREE.TubeGeometry(cv, seg, r, rs, false), P = geo.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) { cv.getPointAt(i / seg, c); const f = prof(i / seg); for (let j = 0; j <= rs; j++) { const k = i * (rs + 1) + j; v.fromBufferAttribute(P, k).sub(c).multiplyScalar(f).add(c); P.setXYZ(k, v.x, v.y, v.z); } }
  geo.computeVertexNormals(); const mm = new THREE.Mesh(geo, m); mm.castShadow = true; return mm;
}
function hairMat(c = 0x2a2420) { return freezable(new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55, sheen: 0.8, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x8a7a6a), clearcoat: 0.3, clearcoatRoughness: 0.4 })); }

// ---------------------------------------------------------------- el polo de chocolate (1,5 veces el de antes)
function popsicle() {
  const g = new THREE.Group(); const ch = freezable(new THREE.MeshPhysicalMaterial({ color: 0x3f2215, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.22, sheen: 0.3, sheenColor: new THREE.Color(0x8a5a3a) }));
  const bar = rbox(0.69, 1.26, 0.26, ch, 0.12); bar.position.y = 0.63 + 0.72; g.add(bar);
  const stick = rbox(0.15, 0.93, 0.04, freezable(new THREE.MeshStandardMaterial({ color: 0xe0c38e, roughness: 0.8 })), 0.06); stick.position.y = 0.465; g.add(stick);
  g.userData = { bar }; return g;
}

// ---------------------------------------------------------------- el cuerpo: camisa blanca de manga corta con cuello de dos puntas, pantalón azul y zapatos de cuero
// (la figura vestida de la hoja: barriga grande en pera, hombros caídos y estrechos, piernas cortas y gruesas)
const BD = {
  ch: { cy: -3.1, cz: -0.12, rx: 1.78, ry: 1.3, rz: 1.32 },              // pecho
  be: { cy: -5.45, cz: 0.42, rx: 2.86, ry: 2.18, rz: 2.22 },             // barriga
  shA: [0.8, -2.05, -0.2], shB: [2.0, -2.82, -0.22], shR: 0.56,         // hombros caídos (del cuello al brazo)
  wy: -6.3,                                                              // la camisa se mete en el pantalón
};
function hrShirtSD(x, y, z) {
  const ax = Math.abs(x), C = BD.ch, B = BD.be;
  let d = smin(hrE(x, y - C.cy, z - C.cz, C.rx, C.ry, C.rz), hrE(x, y - B.cy, z - B.cz, B.rx, B.ry, B.rz), 0.9);
  d = smin(d, hrCap(ax, y, z, ...BD.shA, ...BD.shB, BD.shR, BD.shR * 0.95), 0.5);
  // arrugas suaves: bajo los brazos, sobre la barriga (al meterse en el pantalón) y en la espalda
  d += 0.012 * Math.sin(y * 7 + Math.sin(x * 3.1) * 1.4) * hrSS(-5.6, -6.3, y) + 0.008 * Math.sin(x * 5.5 + y * 2.0) * hrSS(1.2, 2.2, ax) * hrSS(-2.6, -4.0, y);
  d = Math.max(d, -(y + 6.95));                                           // por debajo, dentro del pantalón
  return ssub(d, (Math.hypot(x / 0.99, (z - 0.06) / 0.82) - 1) * 0.82 + Math.max(0, -1.95 - y) * 3, 0.06);   // el hueco del cuello
}
const PT = { wy0: -6.1, wb: { cy: -6.95, cz: 0.3, rx: 2.66, ry: 1.05, rz: 2.12 }, hp: { cy: -7.45, cz: 0.08, rx: 2.55, ry: 1.3, rz: 1.95 }, lx: 1.16, la: -7.6, lb: -13.05, ra: 1.13, rb: 1.06, hem: -13.12 };
function hrPantsSD(x, y, z) {
  const ax = Math.abs(x), H = PT.hp, B = PT.wb;
  let d = smin(hrE(x, y - B.cy, z - B.cz, B.rx, B.ry, B.rz), hrE(x, y - H.cy, z - H.cz, H.rx, H.ry, H.rz), 0.6);    // la cintura (bajo la barriga) y la cadera
  d = smin(d, hrCap(ax, y, z, PT.lx, PT.la, 0.06, PT.lx - 0.03, PT.lb, 0.14, PT.ra, PT.rb), 0.5);
  // la «V» de la entrepierna, arrugas abajo (el bajo se apoya en el zapato) y en las rodillas
  d += 0.03 * hrSS(-8.1, -8.7, y) * Math.exp(-((x / 0.22) ** 2)) * hrSS(-1.0, 0.5, z);
  d += 0.022 * Math.sin(y * 6.2 + Math.sin(x * 3.3 + z * 2.6) * 1.8) * hrSS(-11.6, -12.9, y) + 0.01 * Math.sin(y * 3.4 + x * 6.0 + z) * hrSS(-9.3, -10.3, y) * (1 - hrSS(-11.0, -11.8, y));
  return Math.max(d, PT.hem - y, y - PT.wy0);
}
const SHOE = { x: 1.17, y: -13.29, z: 0.5, rx: 0.7, ry: 0.4, rz: 1.27 };
function hrShoesSD(x, y, z) {
  const ax = Math.abs(x), S = SHOE, d0 = hrE(ax - S.x, y - S.y, z - S.z, S.rx, S.ry, S.rz);
  let d = smin(d0, hrE(ax - S.x, y + 13.2, z + 0.05, 0.62, 0.42, 0.72), 0.2);       // talón
  d = smin(d, hrE(ax - S.x, y + 12.95, z - 0.05, 0.6, 0.3, 0.6), 0.25);              // el empeine sube hasta el pantalón
  return Math.max(d, -13.6 - y);
}
function hrClothTex(w, draw, rep) { const t = canvasTex(w, w, draw); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.NoColorSpace; return t; }
function shirtMat() {      // algodón blanco: tejido fino (relieve) y un brillo aterciopelado
  const b = hrClothTex(256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(255,255,255,${0.16 + hash(y) * 0.12})`; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(0,0,0,${0.12 + hash(x * 3.1) * 0.1})`; g.fillRect(x, 0, 1, h); }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '255,255,255' : '0,0,0'},0.08)`; g.fillRect(hash(i * 2.3) * w, hash(i * 5.7) * h, 1 + hash(i) * 3, 1); } }, 9);
  return freezable(new THREE.MeshPhysicalMaterial({ color: 0xdcdad4, bumpMap: b, bumpScale: 1.6, roughness: 0.88, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xf4f4f4) }));
}
function pantsMat() {      // algodón azul (sarga: diagonales finas)
  const b = hrClothTex(256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.lineWidth = 1.2;
    for (let k = -h; k < w; k += 4) { g.strokeStyle = `rgba(255,255,255,${0.2 + hash(k) * 0.15})`; g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); }
    for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(0,0,0,${0.06 + hash(i) * 0.06})`; g.fillRect(hash(i * 2.3) * w, hash(i * 5.7) * h, 1, 1 + hash(i) * 2); } }, 10);
  return freezable(new THREE.MeshPhysicalMaterial({ color: HR_COL.pants, bumpMap: b, bumpScale: 0.7, roughness: 0.84, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x9fb2e8) }));
}
function shoeMat() {       // cuero negro con su grano y brillo
  const b = hrClothTex(256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '255,255,255' : '0,0,0'},${0.05 + hash(i * 3.3) * 0.08})`; g.beginPath(); g.arc(hash(i * 2.3) * w, hash(i * 5.7) * h, 0.6 + hash(i * 7.1) * 1.6, 0, 7); g.fill(); } }, 6);
  return freezable(new THREE.MeshPhysicalMaterial({ color: 0x1a1918, bumpMap: b, bumpScale: 0.35, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.18, sheen: 0.2, sheenColor: new THREE.Color(0x605a55) }));
}
// el cuello de la camisa: una tira alrededor del cuello y las dos puntas que caen sobre el pecho
function hrCollar(m) {
  const g = new THREE.Group(), N = 72, band = [], top = [];
  const ring = (y, r0, out) => { const P = []; for (let i = 0; i <= N; i++) { const a = -Math.PI + 2 * Math.PI * i / N, gap = Math.abs(a) < 0.2;
    P.push(v3(Math.sin(a) * (1.02 + out) * r0, y + 0.05 * Math.cos(a), 0.06 + Math.cos(a) * (0.84 + out) * r0)); } return P; };
  // la tira (abierta delante): superficie entre dos anillos, con grosor
  const geo = new THREE.BufferGeometry(), P = [], I = [], lo = ring(-2.06, 1.0, 0.07), hi = ring(-1.62, 1.0, 0.0);
  const open = i => Math.abs(-Math.PI + 2 * Math.PI * i / N) < 0.32;
  for (let i = 0; i <= N; i++) { P.push(lo[i].x, lo[i].y, lo[i].z, hi[i].x, hi[i].y, hi[i].z); }
  for (let i = 0; i < N; i++) { if (open(i) || open(i + 1)) continue; const a = i * 2, b = a + 1, c = a + 2, d = a + 3; I.push(a, c, b, b, c, d); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(I); geo.computeVertexNormals();
  const bm = m.clone(); bm.side = THREE.DoubleSide; const bandM = new THREE.Mesh(geo, bm); bandM.castShadow = true; g.add(bandM);
  // las dos puntas: lengüetas dobladas hacia abajo y afuera desde el cuello
  for (const s of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.95, 0.05); sh.quadraticCurveTo(0.75, -0.35, 0.28, -0.98); sh.quadraticCurveTo(0.08, -0.55, 0, 0);
    const eg = new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 10 });
    const pm = new THREE.Mesh(eg, m); pm.castShadow = true; pm.scale.set(s, 1, 1);
    pm.position.set(s * 0.12, -1.7, 0.9); pm.rotation.set(-0.95, s * 0.62, s * 0.18); g.add(pm); }
  return g;
}
const _up0 = new THREE.Vector3(0, 1, 0), _lv = new THREE.Vector3(), _el = new THREE.Vector3();
// la mano (de skin_v2.js): tamaño, punto del puño por donde pasa el palo y las dos poses (puño y relajada) [pulgar, índice, corazón, anular]
const HR_HAND_S = 1.3, HR_GRIP = [0, 0.86, -0.3], HR_FIST = [0.9, 1.5, 1.55, 1.58], HR_RELAX = [0.25, 0.5, 0.6, 0.7];
function limb(m, a, b) { const d = _lv.copy(b).sub(a), L = d.length(); m.position.copy(a); m.quaternion.setFromUnitVectors(_up0, d.divideScalar(L)); m.scale.set(1, L, 1); }
// la manga corta: sigue al brazo (pegada al hombro, a lo largo del brazo, sin estirarse)
function hrSleevePose(s, a, b) { const d = _lv.copy(b).sub(a).normalize(); s.position.copy(a); s.quaternion.setFromUnitVectors(_up0, d); }
function hrSleeveGeo() {
  const prof = [[0.56, 1.1], [0.6, 1.15], [0.69, 1.13], [0.71, 1.06], [0.7, 0.9], [0.71, 0.6], [0.72, 0.25], [0.7, -0.05], [0.6, -0.22], [0.4, -0.33], [0.001, -0.36]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 56), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(x, z), k = 1 + 0.025 * Math.sin(a * 5 - y * 3) * hrSS(0.0, 0.5, y) + 0.04 * hrSS(0.95, 1.1, y) * Math.sin(a * 3);
    P.setXYZ(i, x * k, y, z * k); }
  g.computeVertexNormals(); return g;
}
function buildHero() {
  const G = new THREE.Group(), U = {};
  U.cut = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 9)];
  // cabeza (grupo pivote en el origen)
  const skin = hrSkinMat(true); skin.clippingPlanes = U.cut; U.skinMat = skin;
  const skinP = hrSkinMat(false); skinP.clippingPlanes = U.cut;
  const H = new THREE.Group(); G.add(H); U.head = H;
  const hm = new THREE.Mesh(headGeo(), skin); hm.castShadow = true; hm.receiveShadow = true; H.add(hm); U.headMesh = hm;
  U.eyes = [1, -1].map(s => { const e = makeEye(skinP); e.position.set(s * HM.ey.cx, HM.ey.cy, HM.ey.cz); e.traverse(o => { if (o.isMesh) o.material.clippingPlanes = U.cut; }); H.add(e); return e; });
  U.brows = [];
  const hh = hairMat(); hh.clippingPlanes = U.cut;
  U.hairs = hrHairPts().map(L => { const m = taperTube(L.map(p => v3(...p)), 0.036, hh, 48, 10, u => 0.55 + 0.45 * Math.sin(Math.PI * clamp(u * 1.1 - 0.05))); H.add(m); return m; });
  // dientes (arriba, en la cabeza; abajo, en la mandíbula) y la lengua
  const tm = freezable(new THREE.MeshPhysicalMaterial({ color: 0xf3efe4, roughness: 0.22, clearcoat: 0.7, clearcoatRoughness: 0.1 })); tm.clippingPlanes = U.cut;
  const M = HM.mo, teeth = (y0, h, R, cz, n, w) => { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.19, t = rbox(w, h, 0.09, tm, 0.035);
    t.position.set(Math.sin(a) * R, y0, cz + Math.cos(a) * R); t.rotation.y = a; t.castShadow = true; g.add(t); } return g; };
  U.teethU = teeth(M.y + 0.08, 0.22, 0.62, 1.15, 8, 0.16); H.add(U.teethU);
  U.jaw = new THREE.Group(); U.jaw.position.copy(JAW_P); H.add(U.jaw);
  U.teethL = teeth(M.y - 0.08, 0.19, 0.58, 1.14, 8, 0.15); U.teethL.position.sub(JAW_P); U.jaw.add(U.teethL);
  const tg = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), freezable(new THREE.MeshPhysicalMaterial({ color: 0xa8333a, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.25 })));
  tg.material.clippingPlanes = U.cut; tg.scale.set(0.42, 0.11, 0.44); tg.position.set(0, M.y - 0.2, 1.08).sub(JAW_P); U.jaw.add(tg); U.tongue = tg;
  // con la sonrisa, el labio de abajo baja y los dientes de abajo con él (de la hoja: solo se ven los de arriba)
  U.teethL.onBeforeRender = () => { const mi = hm.morphTargetInfluences; U.teethL.position.set(0, -0.3 * mi[1], 0).sub(JAW_P); U.teethL.updateMatrixWorld(true); };
  U.teethU.onBeforeRender = () => { const mi = hm.morphTargetInfluences; U.teethU.position.y = 0.12 * mi[0]; U.teethU.updateMatrixWorld(true); };
  U.cap = new THREE.Group(); U.cap.visible = false; H.add(U.cap);
  // cuerpo: camisa, cuello, pantalón y zapatos
  const shirt = shirtMat(); U.shirt = shirt;
  const body = new THREE.Mesh(mcGeometry(hrShirtSD, [-3.1, -7.0, -2.0, 3.1, -1.5, 2.9], 0.05, (x, y, z, c) => c.setRGB(1, 1, 1)), shirt); body.castShadow = true; body.receiveShadow = true; G.add(body); U.body = body;
  U.collar = hrCollar(shirt); G.add(U.collar);
  const pants = new THREE.Mesh(mcGeometry(hrPantsSD, [-2.8, -13.2, -2.2, 2.8, -5.9, 2.6], 0.05, (x, y, z, c) => c.setRGB(1, 1, 1)), pantsMat()); pants.castShadow = true; pants.receiveShadow = true; G.add(pants); U.pants = pants;
  const shoes = new THREE.Mesh(mcGeometry(hrShoesSD, [-2.0, -13.62, -0.9, 2.0, -12.5, 1.9], 0.03, (x, y, z, c) => c.setRGB(1, 1, 1)), shoeMat()); shoes.castShadow = true; shoes.receiveShadow = true; G.add(shoes); U.shoes = shoes;
  // brazos: de la manga al codo (siguen a los antebrazos) y las mangas
  const upGeo = new THREE.LatheGeometry([[0.001, -0.14], [0.34, -0.1], [0.5, 0.03], [0.55, 0.25], [0.54, 0.6], [0.51, 0.85], [0.47, 0.98], [0.35, 1.08], [0.001, 1.13]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
  U.upR = new THREE.Mesh(upGeo, skinP); U.upL = new THREE.Mesh(upGeo, skinP); for (const m of [U.upR, U.upL]) { m.castShadow = true; m.receiveShadow = true; G.add(m); }
  const slGeo = hrSleeveGeo(); U.slR = new THREE.Mesh(slGeo, shirt); U.slL = new THREE.Mesh(slGeo, shirt); for (const m of [U.slR, U.slL]) { m.castShadow = true; m.receiveShadow = true; G.add(m); }
  U.shR = v3(-2.08, -2.78, -0.22); U.shL = v3(2.08, -2.78, -0.22);
  // brazo derecho (el del polo): antebrazo y mano con el puño cerrado sobre el palo
  U.armR = new THREE.Group(); G.add(U.armR);
  U.handR = realHand({ inside: false }); U.handR.scale.setScalar(HR_HAND_S); U.armR.add(U.handR);
  { const X = v3(0, -1, 0), Y = v3(0, 0, 1), Z = new THREE.Vector3().crossVectors(X, Y); U.handR.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    const Gp = v3(...HR_GRIP).multiplyScalar(HR_HAND_S).applyQuaternion(U.handR.quaternion); U.handR.position.set(0, 0.2, 0).sub(Gp); }
  U.handR.updateMatrix();
  handPose2(U.handR, HR_FIST);
  U.handR.traverse(o => { if (o.isMesh && o.material && !o.isSprite) { o.material = stubbly(freezable(o.material.clone())); o.material.clippingPlanes = null; } });
  U.pop = popsicle(); U.pop.rotation.x = POP_TILT; U.armR.add(U.pop);
  // brazo izquierdo: cae junto a la barriga, con la mano relajada (la misma mano, en espejo)
  U.handL = realHand({ inside: false }); U.handL.scale.set(-HR_HAND_S, HR_HAND_S, HR_HAND_S); G.add(U.handL);
  handPose2(U.handL, HR_RELAX);
  U.handL.traverse(o => { if (o.isMesh && o.material && !o.isSprite) o.material = stubbly(freezable(o.material.clone())); });
  { const E = v3(3.2, -4.95, 0.05), W = v3(3.32, -6.45, 0.42), Y = W.clone().sub(E).normalize(), Zh = v3(-1, 0, 0.3).normalize(), X = new THREE.Vector3().crossVectors(Y, Zh).normalize(), Z = new THREE.Vector3().crossVectors(X, Y);
    U.handL.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    const off = v3(0, ARM_ELB, 0).multiply(U.handL.scale).applyQuaternion(U.handL.quaternion); U.handL.position.copy(E).sub(off); limb(U.upL, U.shL, E); hrSleevePose(U.slL, U.shL, E); }
  U.icicles = [];
  G.userData = U; return G;
}
// la pose del brazo que sostiene el polo: el puño (con el palo) en P, el polo apuntando a «dir»; E: hacia dónde queda el codo
const _hq = new THREE.Quaternion(), _hm4 = new THREE.Matrix4(), POP_TILT = 0.3;
function armPose(U, P, dir, E) {
  const s = dir.clone().normalize(), e = E.clone().sub(P), n = e.sub(s.clone().multiplyScalar(e.dot(s))).normalize().negate(), ca = Math.cos(POP_TILT), sa = Math.sin(POP_TILT);
  const y = s.clone().multiplyScalar(ca).addScaledVector(n, -sa), z = s.clone().multiplyScalar(sa).addScaledVector(n, ca), x = new THREE.Vector3().crossVectors(y, z).normalize();
  _hm4.makeBasis(x, y, z); U.armR.quaternion.setFromRotationMatrix(_hm4); U.armR.position.copy(P).sub(s.multiplyScalar(0.2));
  _el.set(0, ARM_ELB, 0).applyMatrix4(U.handR.matrix).applyQuaternion(U.armR.quaternion).add(U.armR.position); limb(U.upR, U.shR, _el); hrSleevePose(U.slR, U.shR, _el);
}
