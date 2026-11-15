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
  cr: { cy: 2.08, cz: -0.06, rx: 1.17, ry: 1.6, ryb: 1.95, rz: 1.47, k: 0.27 },              // cráneo en bala, inclinado hacia atrás (cizalla k)
  jw: { cx: 0, cy: 0.12, cz: 0.18, rx: 1.2, ry: 1.3, rz: 1.08 },                              // mejillas y mandíbula (detrás del morro, bajo las orejas)
  nk: { y0: -0.35, y1: -3.6, cz: 0.06, rx: 0.93, rz: 0.77, k: -0.21 },                         // cuello (sin marcar: la cabeza baja hasta los hombros)
  mu: hrTilt({ cx: 0, cy: -0.07, cz: 1.27, rx: 1.18, ry: 0.66, rz: 1.21, t: -0.36 }),         // el morro de arriba (la punta, hacia delante y abajo)
  ml: { cx: 0, cy: -1.0, cz: 1.02, rx: 1.0, ry: 0.5, rz: 0.86 },                              // labio de abajo y barbilla
  ns: { ax: 0, ay: 0.95, az: 1.2, bx: 0, by: 0.81, bz: 2.23, rx: 0.27, ry: 0.22 },            // la nariz: un cilindro desde entre los ojos
  ey: { cx: 0.75, cy: 1.43, cz: 1.35, rx: 0.57, ry: 0.6, rz: 0.43 },                          // el ojo izquierdo (el derecho, en −x)
  er: { cx: 1.22, cy: 0.42, cz: -0.18, a: 0.45 },                                             // la oreja (girada a hacia delante)
  mo: { y: -0.69, hw: 0.55, t: 0.032, z0: 1.3 },                                              // la boca: altura, media anchura, media rendija, fondo
  cv: { cx: 0, cy: -0.66, cz: 1.05, rx: 0.6, ry: 0.3, rz: 0.55 },                             // el hueco de la boca (su techo es el paladar)
};
{ const E = HM.er; E.nx = Math.cos(E.a); E.nz = Math.sin(E.a); }
function hrCran(x, y, z) { const C = HM.cr, py = y - C.cy, pz = z - C.cz + C.k * py; return hrE(x, py, pz, C.rx, py > 0 ? C.ry : C.ryb, C.rz); }
function hrJaw(x, y, z) { const J = HM.jw; return hrE(x - J.cx, y - J.cy, z - J.cz, J.rx, J.ry, J.rz); }
function hrNeck(x, y, z) { const N = HM.nk, yy = Math.max(y, -1.9), zc = N.cz + N.k * (yy + 1.0), e = (Math.hypot(x / N.rx, (z - zc) / N.rz) - 1) * Math.min(N.rx, N.rz); return Math.max(e, y - N.y0, N.y1 - y); }
function hrMuzzle(x, y, z) { const L = HM.ml; return smin(hrET(x, y, z, HM.mu), hrE(x - L.cx, y - L.cy, z - L.cz, L.rx, L.ry, L.rz), 0.26); }
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
function hrRest(x, y, z) { let d = smin(hrCran(x, y, z), hrJaw(x, y, z), 0.45); d = smin(d, hrNeck(x, y, z), 0.45); return d; }
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
function hrPaint(x, y, z) { return hrRest(x, y, z) - hrMuzzle(x, y, z) + 0.035 - 0.12 * hrSS(0.0, -0.5, y) * hrSS(1.2, 0.6, z); }
const HEAD_BOX = [-1.75, -3.55, -1.75, 1.75, 3.85, 2.75];
// el hueco del cráneo (donde va el cerebro): elipsoide inscrito en el cráneo con 0,26 de hueso y piel
const HEADP = { cran: E7(0, 2.0, -0.12, 0.91, 1.42, 1.18), cav: E7(0, 2.0, -0.12, 0.91, 1.42, 1.18), palate: [0, -0.36, 1.05], forehead: [0, 2.35, 1.38],
  eyes: [[0.75, 1.43, 1.35], [-0.75, 1.43, 1.35]], mouth: [0, -0.69, 2.05] };
const JAW_P = new THREE.Vector3(0, -0.15, -0.3), JAW_A = 0.28;
// el zigzag del pelo (de oreja a oreja por la nuca): puntos (ángulo alrededor de la cabeza en grados, altura). 0° = la nuca; −x (la derecha de Homer) a la izquierda
const HR_ZZ = (() => { const side = [[63, 1.3], [80, 0.92], [80, 1.32], [96, 1.08], [100, 1.58], [114, 1.22]], back = [[-41, 1.18], [-18, 1.64], [0, 1.18]];
  const L = [...side.slice().reverse().map(([a, y]) => [-a, y]), ...back, ...back.slice(0, 2).reverse().map(([a, y]) => [-a, y]), ...side];
  return L.map(([a, y]) => [a * Math.PI / 180 * 1.25, y]); })();
// el garabato «~» de la boca en reposo (de frente: x, y), como en la cabeza grande de frente
const HR_SQ = [[0.02, -0.5], [-0.03, -0.58], [0.0, -0.66], [0.1, -0.71], [0.07, -0.79], [-0.04, -0.84], [0.03, -0.86], [0.17, -0.8], [0.32, -0.7], [0.45, -0.65], [0.55, -0.66]];
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
    R[v * 3] = x; R[v * 3 + 1] = yc; R[v * 3 + 2] = z;
    if (isIn) grad(sdHead, x, y, z, g3); else grad(hrHeadClosed, x, yc, z, g3);
    N[v * 3] = g3[0]; N[v * 3 + 1] = g3[1]; N[v * 3 + 2] = g3[2];
    A[v * 4] = isIn ? -1 : hrPaint(x, yc, z); A[v * 4 + 1] = isIn ? 1 : 0; A[v * 4 + 2] = isIn ? 0.3 : hrAO(hrHeadAO, x, yc, z, g3[0], g3[1], g3[2]); A[v * 4 + 3] = 0;
    UV[v * 2] = x * 0.9 + z * 0.4; UV[v * 2 + 1] = yc * 0.9;
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
