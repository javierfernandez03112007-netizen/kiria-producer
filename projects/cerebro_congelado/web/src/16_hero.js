// ---------------------------------------------------------------- el heladero: personaje propio con el aire que pidió Javi (rechoncho, calvo, bigote, uniforme
// blanco con gorra de plato y pajarita negra), realista como la mano de «los dedos». Cabeza y cuerpo: superficies hechas con campos de distancias +
// marching cubes. Unidades: 1 = 10 cm. Cabeza: centro en (0, 0, 0), cara hacia +z, coronilla en y ≈ 1,15, barbilla en y ≈ −1,15.
const ssub = (d, cut, k) => { const h = clamp(0.5 - 0.5 * (d + cut) / k); return lerp(d, -cut, h) + k * h * (1 - h); };      // resta suave
const E7 = (cx, cy, cz, rx, ry, rz) => [cx, cy, cz, rx, ry, rz, Math.min(rx, ry, rz)];
const sph4 = (x, y, z, S) => Math.hypot(x - S[0], y - S[1], z - S[2]) - S[3];
// marching cubes genérico: campo sd(x, y, z) (negativo dentro) en la caja [x0,x1]×[y0,y1]×[z0,z1] con paso h → { P, I }
function mcBuild(sd, x0, y0, z0, x1, y1, z1, h) {
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1;
  const F = new Float32Array(nx * ny * nz); let q = 0;
  for (let k = 0; k < nz; k++) { const z = z0 + k * h; for (let j = 0; j < ny; j++) { const y = y0 + j * h; for (let i = 0; i < nx; i++, q++) F[q] = -sd(x0 + i * h, y, z); } }
  const id = (i, j, k) => i + nx * (j + ny * k), vmap = new Map(), P = [], I = [];
  const vert = (i, j, k, ax) => { const key = id(i, j, k) * 3 + ax; let v = vmap.get(key); if (v !== undefined) return v;
    const a = F[id(i, j, k)], b = F[ax === 0 ? id(i + 1, j, k) : ax === 1 ? id(i, j + 1, k) : id(i, j, k + 1)], t = a === b ? 0.5 : a / (a - b);
    v = P.length / 3; P.push(x0 + (i + (ax === 0 ? t : 0)) * h, y0 + (j + (ax === 1 ? t : 0)) * h, z0 + (k + (ax === 2 ? t : 0)) * h); vmap.set(key, v); return v; };
  const C = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let ci = 0; for (let c = 0; c < 8; c++) if (F[id(i + C[c][0], j + C[c][1], k + C[c][2])] < 0) ci |= 1 << c;
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
// ---------- la cabeza
const HEADP = {
  cran: E7(0, 0.3, -0.2, 0.76, 0.86, 0.9), face: E7(0, -0.38, 0.12, 0.66, 0.74, 0.66),
  cheeks: [E7(0.42, -0.3, 0.42, 0.3, 0.3, 0.3), E7(-0.42, -0.3, 0.42, 0.3, 0.3, 0.3)],
  chin: E7(0, -0.98, 0.5, 0.3, 0.2, 0.24), dchin: E7(0, -1.08, 0.2, 0.5, 0.3, 0.48),
  neck: capP([0, -0.75, -0.32], [0, -2.3, -0.28], 0.6, 0.62, 0.92),
  brow: capP([-0.4, 0.2, 0.68], [0.4, 0.2, 0.68], 0.1, 0.1, 1),
  nose: capP([0, 0.06, 0.74], [0, -0.33, 0.95], 0.06, 0.1, 1), nosW: [E7(0.12, -0.37, 0.84, 0.095, 0.08, 0.09), E7(-0.12, -0.37, 0.84, 0.095, 0.08, 0.09)],
  lipU: capP([-0.2, -0.6, 0.79], [0.2, -0.6, 0.79], 0.055, 0.055, 0.9), lipL: capP([-0.17, -0.74, 0.77], [0.17, -0.74, 0.77], 0.065, 0.065, 0.9),
  ears: [E7(0.77, -0.08, -0.18, 0.1, 0.3, 0.2), E7(-0.77, -0.08, -0.18, 0.1, 0.3, 0.2)],
  socks: [[0.3, 0.02, 0.72, 0.17], [-0.3, 0.02, 0.72, 0.17]], mouth: E7(0, -0.67, 0.6, 0.23, 0.045, 0.32), earH: [[0.84, -0.06, -0.12, 0.1], [-0.84, -0.06, -0.12, 0.1]],
};
function sdHead(x, y, z) {
  const H = HEADP; let d = smin(ellD(x, y, z, H.cran), ellD(x, y, z, H.face), 0.35);
  for (const c of H.cheeks) d = smin(d, ellD(x, y, z, c), 0.18);
  d = smin(d, ellD(x, y, z, H.chin), 0.15); d = smin(d, ellD(x, y, z, H.dchin), 0.22); d = smin(d, capD(x, y, z, H.neck), 0.25);
  d = smin(d, capD(x, y, z, H.brow), 0.12); d = smin(d, capD(x, y, z, H.nose), 0.08); for (const w of H.nosW) d = smin(d, ellD(x, y, z, w), 0.05);
  d = smin(d, capD(x, y, z, H.lipU), 0.05); d = smin(d, capD(x, y, z, H.lipL), 0.05); for (const e of H.ears) d = smin(d, ellD(x, y, z, e), 0.06);
  for (const s of H.socks) d = ssub(d, sph4(x, y, z, s), 0.06);
  d = ssub(d, ellD(x, y, z, H.mouth), 0.025); for (const s of H.earH) d = ssub(d, sph4(x, y, z, s), 0.04);
  return d;
}
const HEAD_BOX = [-0.98, -1.85, -1.18, 0.98, 1.24, 1.12];
const JAW_P = new THREE.Vector3(0, -0.42, -0.32), JAW_A = 0.3;
let HEAD_GEO = null;
function headGeo() {
  if (HEAD_GEO) return HEAD_GEO;
  const base = new THREE.Color(0xdca189), lip = new THREE.Color(0xc06a62), blush = new THREE.Color(0xd8877a), inner = new THREE.Color(0x5a1c1a), ssm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const g = mcGeometry(sdHead, HEAD_BOX, 0.014, (x, y, z, c) => { c.copy(base);
    const lk = Math.max(Math.exp(-((y + 0.6) ** 2 + (Math.abs(x) * 0.6) ** 2) / 0.004), Math.exp(-((y + 0.74) ** 2 + (Math.abs(x) * 0.6) ** 2) / 0.005)) * ssm(0.7, 0.78, z);
    const bk = Math.exp(-(((Math.abs(x) - 0.42) ** 2) + (y + 0.25) ** 2) / 0.03) * ssm(0.5, 0.7, z) * 0.45 + Math.exp(-((x * x) + (y + 0.33) ** 2) / 0.006) * ssm(0.9, 1.0, z) * 0.35;
    const ek = Math.exp(-(((Math.abs(x) - 0.8) ** 2) + (y + 0.06) ** 2) / 0.03) * 0.35;
    c.lerp(blush, clamp(bk + ek)); c.lerp(lip, clamp(lk * 1.1));
    if (Math.abs(x) < 0.24 && Math.abs(y + 0.67) < 0.06 && z < 0.74) c.lerp(inner, ssm(0.76, 0.66, z)); });
  // gestos (morph): boca abierta (la mandíbula gira), sonrisa y mueca de dolor
  const P = g.attributes.position, n = P.count, jaw = new Float32Array(n * 3), smile = new Float32Array(n * 3), grim = new Float32Array(n * 3), N = g.attributes.normal, jn = new Float32Array(n * 3);
  const R = new THREE.Matrix4().makeRotationX(JAW_A), Rn = new THREE.Matrix3().setFromMatrix4(R), p = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let v = 0; v < n; v++) { const x = P.getX(v), y = P.getY(v), z = P.getZ(v);
    const wj = ssm(-0.6, -0.71, y) * (1 - ssm(-1.25, -1.6, y)) * ssm(-0.38, 0.0, z) * (1 - 0.6 * ssm(0.55, 0.8, Math.abs(x)));
    p.set(x, y, z).sub(JAW_P).applyMatrix4(R).add(JAW_P); jaw[v * 3] = (p.x - x) * wj; jaw[v * 3 + 1] = (p.y - y) * wj; jaw[v * 3 + 2] = (p.z - z) * wj;
    nn.set(N.getX(v), N.getY(v), N.getZ(v)).applyMatrix3(Rn); jn[v * 3] = (nn.x - N.getX(v)) * wj; jn[v * 3 + 1] = (nn.y - N.getY(v)) * wj; jn[v * 3 + 2] = (nn.z - N.getZ(v)) * wj;
    const sx = Math.sign(x) || 1, gc = Math.exp(-(((Math.abs(x) - 0.21) ** 2) + (y + 0.67) ** 2) / 0.012) * ssm(0.55, 0.72, z), gk = Math.exp(-(((Math.abs(x) - 0.36) ** 2) + (y + 0.4) ** 2) / 0.04) * ssm(0.4, 0.6, z);
    smile[v * 3] = sx * 0.035 * gc; smile[v * 3 + 1] = 0.06 * gc + 0.035 * gk; smile[v * 3 + 2] = -0.03 * gc + 0.015 * gk;
    grim[v * 3] = sx * 0.03 * gc; grim[v * 3 + 1] = -0.05 * gc; grim[v * 3 + 2] = -0.01 * gc; }
  g.morphAttributes.position = [new THREE.BufferAttribute(jaw, 3), new THREE.BufferAttribute(smile, 3), new THREE.BufferAttribute(grim, 3)];
  g.morphAttributes.normal = [new THREE.BufferAttribute(jn, 3), new THREE.BufferAttribute(new Float32Array(n * 3), 3), new THREE.BufferAttribute(new Float32Array(n * 3), 3)];
  g.morphTargetsRelative = true;
  console.log('cabeza: ' + n + ' vértices'); HEAD_GEO = g; return g;
}
// ---------- congelación: escarcha que se extiende desde la boca (y se derrite desde la boca con el truco)
const FZ = { c: { value: new THREE.Vector3(0, -0.67, 0.85) }, r: { value: 0 }, m: { value: 0 }, pc: { value: new THREE.Vector3(0, 0.45, 0.72) }, pk: { value: 0 } };
function freezable(m) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); sh.uniforms.fzC = FZ.c; sh.uniforms.fzR = FZ.r; sh.uniforms.fzM = FZ.m; sh.uniforms.pnC = FZ.pc; sh.uniforms.pnK = FZ.pk;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFzW;').replace('#include <project_vertex>', '#include <project_vertex>\nvFzW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vFzW; uniform vec3 fzC, pnC; uniform float fzR, fzM, pnK;
float fzH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float fzN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(fzH(i), fzH(i + vec3(1,0,0)), f.x), mix(fzH(i + vec3(0,1,0)), fzH(i + vec3(1,1,0)), f.x), f.y), mix(mix(fzH(i + vec3(0,0,1)), fzH(i + vec3(1,0,1)), f.x), mix(fzH(i + vec3(0,1,1)), fzH(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float fzD = distance(vFzW, fzC), fzN1 = fzN(vFzW * 9.) * 0.6 + fzN(vFzW * 23.) * 0.4;
float fzK = (1. - smoothstep(fzR - 0.3, fzR, fzD + fzN1 * 0.25)) * smoothstep(fzM, fzM + 0.3, fzD + fzN1 * 0.25);
float fzB = fzK * (1. - smoothstep(fzR - 0.45, fzR - 0.05, fzD + fzN1 * 0.25));
diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.12, 0.3, 0.6), vec3(0.5, 0.72, 0.93), smoothstep(0.25, 0.85, fzN1)) * (0.85 + 0.3 * fzN(vFzW * 41.)), fzK * 0.9);
float pnD = distance(vFzW, pnC), pnA = pnK * exp(-pnD * pnD / 0.09);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.03, 0.02), clamp(pnA, 0., 0.85));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float fzRim = pow(1. - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2); vec3 fzQ = fract(vFzW * 70.) - 0.5;
totalEmissiveRadiance = mix(totalEmissiveRadiance, vec3(0.0), fzK * 0.8) + vec3(0.9, 0.04, 0.02) * pnA * 0.8 + vec3(0.3, 0.62, 1.0) * fzB * 0.7 + vec3(0.45, 0.7, 1.0) * fzRim * fzK * 0.12 + vec3(1.2) * fzK * step(0.993, fzH(floor(vFzW * 70.))) * (1. - smoothstep(0.15, 0.4, length(fzQ)));`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.18, fzK);'); };
  return m;
}
// ---------- piezas de la cara
function eyeTex() {      // textura polar del iris: x = ángulo, y = del centro (arriba, v = 1) al borde (abajo)
  return canvasTex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#050505'); gr.addColorStop(0.38, '#050505'); gr.addColorStop(0.42, '#5a3b1f'); gr.addColorStop(0.7, '#86602f'); gr.addColorStop(0.9, '#5a3e22'); gr.addColorStop(1, '#22160c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const x = hash(i * 3.1) * w; g.strokeStyle = hash(i) > 0.5 ? 'rgba(190,150,90,.35)' : 'rgba(30,18,8,.35)'; g.lineWidth = 1 + hash(i * 2.3) * 1.5; g.beginPath(); g.moveTo(x, h * 0.42); g.lineTo(x + (hash(i * 7.7) - 0.5) * 6, h * (0.75 + hash(i * 5.7) * 0.2)); g.stroke(); } });
}
function makeEye(skinM) {
  const g = new THREE.Group(), R = 0.125;
  const scl = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), freezable(new THREE.MeshPhysicalMaterial({ color: 0xf4efe8, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }))); g.add(scl);
  const look = new THREE.Group(); g.add(look);
  const iris = new THREE.Mesh(new THREE.SphereGeometry(R + 0.0012, 48, 10, 0, Math.PI * 2, 0, Math.asin(0.06 / R)), freezable(new THREE.MeshStandardMaterial({ map: eyeTex(), roughness: 0.35 }))); iris.rotation.x = Math.PI / 2; look.add(iris);
  const pup = new THREE.Group(); look.add(pup);
  const cor = new THREE.Mesh(new THREE.SphereGeometry(0.066, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0, clearcoat: 1, clearcoatRoughness: 0, depthWrite: false }));
  cor.rotation.x = Math.PI / 2; cor.position.z = R - 0.045; look.add(cor);
  const lidU = new THREE.Mesh(new THREE.SphereGeometry(R + 0.012, 32, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), skinM), lidL = new THREE.Mesh(new THREE.SphereGeometry(R + 0.01, 32, 14, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), skinM);
  g.add(lidU, lidL); g.userData = { look, pup, lidU, lidL }; return g;
}
// pose de un ojo: abierto (0 cerrado … 1 normal … 1,5 muy abierto), pupila, mirada
function eyePose(e, open, pup = 1, yaw = 0, pitch = 0) { const U = e.userData; U.lidU.rotation.x = lerp(0.3, -0.38, clamp(open, 0, 1)) - 0.55 * clamp(open - 1, 0, 0.6); U.lidL.rotation.x = lerp(-0.1, 0.38, clamp(open, 0, 1)) + 0.25 * clamp(open - 1, 0, 0.6);
  U.pup.scale.setScalar(pup); U.look.rotation.set(pitch, yaw, 0); }
// tubo que adelgaza en las puntas (cejas, bigote)
function taperTube(pts, r, m, seg = 40, rs = 12, prof = u => Math.sin(Math.PI * clamp(u * 0.92 + 0.04))) {
  const cv = new THREE.CatmullRomCurve3(pts), geo = new THREE.TubeGeometry(cv, seg, r, rs, false), P = geo.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) { cv.getPointAt(i / seg, c); const f = prof(i / seg); for (let j = 0; j <= rs; j++) { const k = i * (rs + 1) + j; v.fromBufferAttribute(P, k).sub(c).multiplyScalar(f).add(c); P.setXYZ(k, v.x, v.y, v.z); } }
  geo.computeVertexNormals(); const mm = new THREE.Mesh(geo, m); mm.castShadow = true; return mm;
}
function hairMat(c = 0x4b3424) { return freezable(new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.85, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x8a6a50) })); }
// ---------- la gorra de plato (blanca, banda y visera negras, chapa plateada con un cucurucho)
function capHat(clip) {
  const g = new THREE.Group(), wm = freezable(new THREE.MeshPhysicalMaterial({ color: 0xf6f6f3, roughness: 0.6, sheen: 0.5, sheenColor: new THREE.Color(0xffffff) })), bm = freezable(new THREE.MeshPhysicalMaterial({ color: 0x111215, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }));
  const crown = lathe([[0.0, 0.42], [0.55, 0.43], [0.86, 0.38], [0.9, 0.33], [0.76, 0.16], [0.62, 0.08], [0.61, 0.0]], 64, wm); g.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.625, 0.615, 0.13, 64, 1, true), bm); band.position.y = 0.06; g.add(band);
  const vs = new THREE.Shape(); vs.absarc(0, 0, 1.0, -0.15, Math.PI + 0.15, false); vs.absarc(0, 0, 0.62, Math.PI + 0.15, -0.15, true);
  const vg = new THREE.ExtrudeGeometry(vs, { depth: 0.02, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 32 }); vg.rotateX(Math.PI / 2);
  { const P = vg.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), r = Math.hypot(x, z); P.setY(i, P.getY(i) - Math.max(0, r - 0.62) * 0.45); } vg.computeVertexNormals(); }
  const vis = new THREE.Mesh(vg, bm); vis.rotation.y = Math.PI; vis.scale.set(0.98, 1, -0.8); vis.position.y = 0.02; g.add(vis);
  const bt = canvasTex(128, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#f2f4f7'); gr.addColorStop(1, '#9aa1ab'); c.fillStyle = gr; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, 7); c.fill();
    c.fillStyle = '#7b8490'; c.beginPath(); c.moveTo(w / 2, h * 0.86); c.lineTo(w * 0.36, h * 0.46); c.lineTo(w * 0.64, h * 0.46); c.closePath(); c.fill(); c.beginPath(); c.arc(w / 2, h * 0.4, w * 0.15, 0, 7); c.fill(); });
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), freezable(new THREE.MeshPhysicalMaterial({ map: bt, metalness: 0.6, roughness: 0.3 }))); badge.position.set(0, 0.24, 0.66); badge.rotation.x = -0.35; g.add(badge);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; if (clip) o.material.clippingPlanes = clip; } });
  return g;
}
// ---------- el polo de chocolate
function popsicle() {
  const g = new THREE.Group(); const ch = freezable(new THREE.MeshPhysicalMaterial({ color: 0x4b2a19, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25 }));
  const bar = rbox(0.46, 0.84, 0.17, ch, 0.08); bar.position.y = 0.42 + 0.48; g.add(bar);
  const stick = rbox(0.1, 0.62, 0.026, freezable(new THREE.MeshStandardMaterial({ color: 0xe0c38e, roughness: 0.8 })), 0.04); stick.position.y = 0.31; g.add(stick);
  g.userData = { bar }; return g;
}
// ---------- el cuerpo (camisa blanca) y los brazos
const BODYP = { chest: E7(0, -2.55, -0.25, 1.3, 0.9, 0.86), belly: E7(0, -3.55, -0.12, 1.38, 1.15, 1.06), sh: capP([-1.12, -2.25, -0.28], [1.12, -2.25, -0.28], 0.44, 0.44, 1),
  col: capP([0, -1.55, -0.3], [0, -2.3, -0.27], 0.67, 0.72, 0.92),
  slR: capP([-1.3, -2.35, -0.22], [-1.38, -3.25, 0.2], 0.42, 0.38, 1), slL: capP([1.3, -2.35, -0.22], [1.42, -3.3, -0.1], 0.42, 0.38, 1) };
function sdBody(x, y, z) { const B = BODYP; let d = smin(ellD(x, y, z, B.chest), ellD(x, y, z, B.belly), 0.4); d = smin(d, capD(x, y, z, B.sh), 0.3); d = smin(d, capD(x, y, z, B.col), 0.2);
  d = smin(d, capD(x, y, z, B.slR), 0.18); d = smin(d, capD(x, y, z, B.slL), 0.18); return Math.max(d, -(y + 4.8)); }
function shirtMat() {
  const t = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(150,150,160,${0.03 + hash(y) * 0.04})`; g.fillRect(0, y, w, 1); } for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(150,150,160,${0.02 + hash(x * 3.1) * 0.03})`; g.fillRect(x, 0, 1, h); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
  return freezable(new THREE.MeshPhysicalMaterial({ color: 0xf3f3f0, map: t, roughness: 0.82, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffffff), vertexColors: false }));
}
function buildHero() {
  const G = new THREE.Group(), U = {};
  // cabeza (con su grupo para girarla y el plano de corte de perfil)
  U.cut = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 5)];
  const skin = freezable(new THREE.MeshPhysicalMaterial({ map: skinBase().outer.map, vertexColors: true, roughness: 0.5, sheen: 0.55, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffa98a), clearcoat: 0.12, clearcoatRoughness: 0.5, emissive: 0x4a1408, emissiveIntensity: 0.2 }));
  skin.clippingPlanes = U.cut;
  const skinFlat = freezable(new THREE.MeshPhysicalMaterial({ color: 0xd59a83, roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color(0xffa98a), emissive: 0x4a1408, emissiveIntensity: 0.2 })); skinFlat.clippingPlanes = U.cut;
  const H = new THREE.Group(); G.add(H); U.head = H;
  const hm = new THREE.Mesh(headGeo(), skin); hm.castShadow = true; hm.receiveShadow = true; H.add(hm); U.headMesh = hm;
  U.eyes = [0.3, -0.3].map(x => { const e = makeEye(skinFlat); e.position.set(x, 0.02, 0.6); e.traverse(o => { if (o.isMesh && !o.material.clippingPlanes) o.material.clippingPlanes = U.cut; }); H.add(e); return e; });
  const hb = hairMat(0x5a4130); hb.clippingPlanes = U.cut;
  U.brows = [1, -1].map(s => { const b = taperTube([v3(s * 0.1, 0.0, 0.0), v3(s * 0.27, 0.05, -0.02), v3(s * 0.44, -0.01, -0.11)], 0.034, hb, 30, 10); const gb = new THREE.Group(); gb.position.set(0, 0.29, 0.78); gb.add(b); b.scale.z = 0.7; H.add(gb); return gb; });
  const mu = hairMat(0x4a3224); mu.clippingPlanes = U.cut;
  U.must = taperTube([v3(-0.36, -0.7, 0.66), v3(-0.25, -0.57, 0.82), v3(-0.1, -0.5, 0.92), v3(0, -0.495, 0.94), v3(0.1, -0.5, 0.92), v3(0.25, -0.57, 0.82), v3(0.36, -0.7, 0.66)], 0.075, mu, 60, 14, u => 0.35 + 0.65 * Math.pow(Math.sin(Math.PI * u), 0.6)); H.add(U.must);
  const tm = freezable(new THREE.MeshPhysicalMaterial({ color: 0xf2eee4, roughness: 0.3, clearcoat: 0.6 })); tm.clippingPlanes = U.cut;
  const teethU = new THREE.Group(); for (let i = -3; i <= 3; i++) { const a = i * 0.2, t = rbox(0.07, 0.09, 0.05, tm, 0.02); t.position.set(Math.sin(a) * 0.3, -0.645, 0.45 + Math.cos(a) * 0.3); t.rotation.y = a; teethU.add(t); } H.add(teethU);
  U.jaw = new THREE.Group(); U.jaw.position.copy(JAW_P); H.add(U.jaw);
  const teethL = new THREE.Group(); for (let i = -3; i <= 3; i++) { const a = i * 0.2, t = rbox(0.065, 0.08, 0.045, tm, 0.02); t.position.set(Math.sin(a) * 0.28, -0.7, 0.44 + Math.cos(a) * 0.28); t.rotation.y = a; teethL.add(t); }
  teethL.position.sub(JAW_P); U.jaw.add(teethL);
  U.cap = capHat(U.cut); U.cap.position.set(0, 0.86, -0.2); U.cap.rotation.x = -0.1; U.cap.scale.set(1.0, 1.0, 1.12); H.add(U.cap);
  // cuerpo: camisa, cuello, pajarita y botones
  const shirt = shirtMat(); U.shirt = shirt;
  const body = new THREE.Mesh(mcGeometry(sdBody, [-2.0, -4.85, -1.3, 2.0, -1.4, 1.2], 0.03, (x, y, z, c) => c.setRGB(1, 1, 1)), shirt); body.castShadow = true; body.receiveShadow = true; G.add(body); U.body = body;
  const bt = freezable(new THREE.MeshPhysicalMaterial({ color: 0x0d0e11, roughness: 0.3, sheen: 1, sheenColor: new THREE.Color(0x3a3d48), clearcoat: 0.3 }));
  const bow = new THREE.Group(); bow.position.set(0, -1.72, 0.5); G.add(bow);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), bt); w.scale.set(0.26, 0.15, 0.07); w.position.set(s * 0.22, 0, 0); w.rotation.z = s * 0.12; w.castShadow = true; bow.add(w); }
  const kn = rbox(0.12, 0.13, 0.1, bt, 0.04); bow.add(kn);
  for (const s of [-1, 1]) { const cl = rbox(0.45, 0.32, 0.04, shirt, 0.03); cl.position.set(s * 0.3, -1.62, 0.36); cl.rotation.set(-0.5, s * 0.5, s * 0.75); cl.castShadow = true; G.add(cl); }
  const bm = freezable(new THREE.MeshPhysicalMaterial({ color: 0xe9e6df, roughness: 0.3, clearcoat: 1 }));
  for (let i = 0; i < 4; i++) { const y = -2.25 - i * 0.6, b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 20), bm); const zf = -0.25 + 0.86 * Math.sqrt(Math.max(0, 1 - ((y + 2.55) / 0.9) ** 2)), zb = -0.12 + 1.06 * Math.sqrt(Math.max(0, 1 - ((y + 3.55) / 1.15) ** 2));
    b.rotation.x = Math.PI / 2; b.position.set(0, y, Math.max(zf, zb) + 0.012); G.add(b); }
  // brazo derecho (el del polo): antebrazo y mano de piel (la mano realista) con el puño cerrado sobre el palo
  U.armR = new THREE.Group(); G.add(U.armR);
  U.handR = realHand({ inside: false }); U.handR.scale.setScalar(0.92); U.armR.add(U.handR);
  { const X = v3(0, -1, 0), Y = v3(0, 0, 1), Z = new THREE.Vector3().crossVectors(X, Y); U.handR.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    const G = v3(0, 0.72, -0.3).multiplyScalar(0.92).applyQuaternion(U.handR.quaternion); U.handR.position.set(0, 0.2, 0).sub(G); }
  handPose2(U.handR, [0.9, 1.45, 1.5, 1.52, 1.55]);
  U.handR.traverse(o => { if (o.isMesh && o.material && !o.isSprite) o.material = freezable(o.material.clone()); });
  U.pop = popsicle(); U.armR.add(U.pop);
  // brazo izquierdo: cae junto al cuerpo
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.23, 2.2, 32), skinFlat.clone()); fl.material.clippingPlanes = null; fl.position.set(1.47, -4.25, -0.12); fl.rotation.z = 0.04; fl.visible = false; G.add(fl);
  // carámbanos (crecen cuando pasa la escarcha)
  const im = new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.85, clearcoat: 1, clearcoatRoughness: 0.02, emissive: 0x4f8fd8, emissiveIntensity: 0.25 }); im.clippingPlanes = U.cut;
  U.icicles = [];
  const ic = (x, y, z, len, r, par = H) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, len, 10).rotateX(Math.PI).translate(0, -len / 2, 0), im); m.position.set(x, y, z); m.scale.setScalar(0.0001); par.add(m); U.icicles.push({ m, p: new THREE.Vector3(x, y, z) }); };
  for (const [x, l] of [[-0.3, 0.16], [-0.22, 0.11], [-0.12, 0.19], [0.0, 0.13], [0.11, 0.17], [0.21, 0.1], [0.31, 0.15]]) ic(x, -0.56 - Math.abs(x) * 0.35, 0.86 - Math.abs(x) * 0.45, l, 0.022);
  ic(0, -0.42, 0.98, 0.12, 0.025); ic(-0.12, -1.13, 0.62, 0.14, 0.03); ic(0.1, -1.14, 0.6, 0.1, 0.025); ic(0.81, -0.36, -0.12, 0.12, 0.025); ic(-0.81, -0.36, -0.12, 0.13, 0.025);
  G.userData = U; return G;
}
// la pose del brazo que sostiene el polo: el puño (con el palo) en P, el polo apuntando a «dir»
const _hq = new THREE.Quaternion(), _hm4 = new THREE.Matrix4();
function armPose(U, P, dir, E) {      // P: donde está el palo en el puño; dir: hacia dónde apunta el polo; E: hacia dónde queda el codo
  const y = dir.clone().normalize(), e = E.clone().sub(P), z = e.sub(y.clone().multiplyScalar(e.dot(y))).normalize().negate(), x = new THREE.Vector3().crossVectors(y, z).normalize();
  _hm4.makeBasis(x, y, z); U.armR.quaternion.setFromRotationMatrix(_hm4); U.armR.position.copy(P).sub(y.clone().multiplyScalar(0.2));
}
