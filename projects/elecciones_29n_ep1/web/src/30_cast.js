// ---------------------------------------------------------------- 29N · LOS CUATRO CANDIDATOS (muñecos estilizados, no fotos): se reconocen por el pelo, la barba,
// la altura, el traje y su nombre. Feijóo (PP): pelo cano corto, frente despejada, sin gafas (desde 2024), traje azul marino y corbata azul. Sánchez (PSOE): alto y
// delgado, pelo oscuro con canas en las sienes, traje azul oscuro y corbata granate. Abascal (Vox): pelo oscuro hacia atrás, barba cerrada con canas en el mentón,
// ancho de hombros, traje oscuro y camisa blanca sin corbata. Colau (Frente Amplio): pelo corto castaño oscuro con flequillo ladeado, americana oscura y camiseta clara.
const T = {};
const PARTY = {
  pp: { sig: 'PP', col: 0x1f86e0, css: '#1f86e0', ink: '#ffffff', who: 'Alberto Núñez Feijóo', short: 'Feijóo' },
  psoe: { sig: 'PSOE', col: 0xe30613, css: '#e30613', ink: '#ffffff', who: 'Pedro Sánchez', short: 'Sánchez' },
  vox: { sig: 'VOX', col: 0x5dbb2a, css: '#5dbb2a', ink: '#ffffff', who: 'Santiago Abascal', short: 'Abascal' },
  fa: { sig: 'FRENTE AMPLIO', col: 0xff5a1f, css: '#ff5a1f', ink: '#d6f23c', who: 'Ada Colau', short: 'Colau' },
};
const ORDER = ['pp', 'psoe', 'vox', 'fa'];            // orden de escaños en el Congreso saliente (2023): el mismo en la voz, en el plató y en la serie
// radio del tronco (en unidades k) a la altura y: el mismo perfil torneado que usa person()
function torsoR(y, F = 0) { const P = [[0.13 + 0.015 * F, -0.06], [0.138 + 0.02 * F, 0.02], [0.123 - 0.008 * F, 0.13], [0.142 + 0.006 * F, 0.27], [0.15, 0.36], [0.128 - 0.012 * F, 0.425], [0.075, 0.46], [0.045, 0.47]];
  if (y <= P[0][1]) return P[0][0]; for (let i = 0; i < P.length - 1; i++) if (y <= P[i + 1][1]) { const u = (y - P[i][1]) / (P[i + 1][1] - P[i][1]); return lerp(P[i][0], P[i + 1][0], u); } return P[P.length - 1][0]; }
// parche pegado al tronco entre dos alturas; a0(y) y a1(y) son los ángulos (rad) del borde izquierdo y derecho; off = separación hacia fuera
function torsoPatch(k, F, y0, y1, a0, a1, off, mat, rows = 14, cols = 8) { const pos = [], idx = [];
  for (let j = 0; j <= rows; j++) { const y = lerp(y0, y1, j / rows), r = torsoR(y, F) + off; for (let i = 0; i <= cols; i++) { const a = lerp(a0(y), a1(y), i / cols); pos.push(r * Math.sin(a) * k, y * k, r * Math.cos(a) * 0.68 * k + off * 0.5 * k); } }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const p = j * (cols + 1) + i; idx.push(p, p + 1, p + cols + 1, p + 1, p + cols + 2, p + cols + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; }
// traje: camisa en V, solapas, corbata (o cuello abierto), bajo de la chaqueta y botones
function suitOn(p, o = {}) { const J = p.userData.J, k = p.userData.k, F = o.female ? 1 : 0, jacket = new THREE.Color(o.jacket), yb = o.low ?? 0.17, yt = 0.452;
  const mShirt = new THREE.MeshStandardMaterial({ color: o.shirt ?? 0xf6f6f2, roughness: 0.7, side: THREE.DoubleSide }), mLap = new THREE.MeshStandardMaterial({ color: jacket.clone().multiplyScalar(o.lapK ?? 1.45), roughness: 0.6, side: THREE.DoubleSide }), mJ = new THREE.MeshStandardMaterial({ color: jacket, roughness: 0.7, side: THREE.DoubleSide });
  const wV = y => (o.wide ?? 0.6) * Math.pow(clamp((y - yb) / (yt - yb)), 0.85);
  J.spine.add(torsoPatch(k, F, yb, yt, y => -wV(y), y => wV(y), 0.004, mShirt));
  for (const s of [-1, 1]) J.spine.add(torsoPatch(k, F, yb - 0.01, yt + 0.004, y => s * wV(y), y => s * (wV(y) + 0.1 + 0.2 * clamp((y - yb) / (yt - yb))), 0.0095, mLap, 14, 3));
  if (o.tie !== undefined && o.tie !== null) { const mTie = new THREE.MeshStandardMaterial({ color: o.tie, roughness: 0.5, side: THREE.DoubleSide });
    const half = y => { const w = y > 0.418 ? 0.017 : y > 0.24 ? lerp(0.029, 0.012, (y - 0.24) / 0.178) : lerp(0.002, 0.029, (y - (yb - 0.005)) / (0.24 - (yb - 0.005))); return w / torsoR(y, F); };
    J.spine.add(torsoPatch(k, F, yb - 0.005, 0.444, y => -half(y), y => half(y), 0.0085, mTie, 16, 2)); }
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.05 * k, 0.012 * k, 0.034 * k), mShirt); c.position.set(s * 0.03 * k, 0.455 * k, 0.05 * k); c.rotation.set(0.5, s * -0.5, s * (o.tie == null ? 0.75 : 0.5)); c.castShadow = true; J.spine.add(c); }
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.143 * k, 0.16 * k, 0.17 * k, 28, 1, true), mJ); hem.scale.z = 0.72; hem.position.y = -0.115 * k; hem.castShadow = true; J.spine.add(hem);
  for (const s of [-1, 1]) { const pad = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 14), mJ); pad.scale.set(0.086 * k, 0.04 * k, 0.073 * k); pad.position.set(s * 0.1 * k, 0.42 * k, -0.004 * k); pad.rotation.z = -s * 0.22; pad.castShadow = true; pad.receiveShadow = true; J.spine.add(pad); }
  for (const y of [0.13, 0.06]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.008 * k, 8, 6), new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.4 })); b.position.set(0.004 * k, y * k, (torsoR(y, F) * 0.68 + 0.006) * k); J.spine.add(b); }
  return p; }
// ---- pelo y barba a medida. Una cáscara sobre la cabeza recortada por una función: a = ángulo lateral (0 de frente, + hacia SU izquierda = derecha de la imagen),
// e = altura (0 ≈ ojos, π/2 = coronilla), d = dirección unitaria. m(a, e, d) > 0 = hay pelo; el borde se recorta en el sombreador con el valor interpolado (sale
// limpio y con antialias); v = grosor en radios de cabeza; c = color por vértice (canas, mechas).
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const gss = (x, w) => Math.exp(-(x / w) * (x / w));
function knots(x, K) { if (x <= K[0][0]) return K[0][1]; for (let i = 0; i < K.length - 1; i++) if (x <= K[i + 1][0]) return lerp(K[i][1], K[i + 1][1], sstep(K[i][0], K[i + 1][0], x)); return K[K.length - 1][1]; }

// la forma de la cabeza (la misma de person(), con la mandíbula a medida: jw = cuánto se estrecha hacia la barbilla; 0,22 = la de todos)
function headShape(x, y, z, jw) { const hx = x * (y < -0.1 ? 1 - jw * Math.min(1, (-y - 0.1) / 0.8) : 1); let hz = z * (y < -0.2 ? 1 - 0.08 * Math.min(1, (-y - 0.2) / 0.7) : 1); if (hz > 0.6 && y < 0.25 && y > -0.55) hz += 0.02 * (1 - Math.abs(hx)); return [hx, y, hz]; }
function headGeoJ(jw) { const g = new THREE.SphereGeometry(1, 56, 42), p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, ...headShape(p.getX(i), p.getY(i), p.getZ(i), jw)); g.computeVertexNormals(); return g; }
function shellGeo(jw, mfn, vfn, cfn, tilt = 0.55) { const g = new THREE.SphereGeometry(1, 120, 90); g.rotateY(-Math.PI / 2); g.rotateX(-tilt);
  const P = g.attributes.position, n = P.count, M = new Float32Array(n), C = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const [hx, hy, hz] = headShape(P.getX(i), P.getY(i), P.getZ(i), jw), L = Math.hypot(hx, hy, hz), d = [hx / L, hy / L, hz / L], a = Math.atan2(hx, hz), e = Math.asin(clamp(hy / L, -1, 1));
    const m = mfn(a, e, d), r = 1.012 + Math.max(0, vfn(a, e, m, d)), c = cfn(a, e, m, d); M[i] = m; P.setXYZ(i, hx * r, hy * r, hz * r); C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b; }
  g.computeVertexNormals(); const I = g.index.array, out = []; for (let i = 0; i < I.length; i += 3) if (M[I[i]] > 0 || M[I[i + 1]] > 0 || M[I[i + 2]] > 0) out.push(I[i], I[i + 1], I[i + 2]);
  g.setIndex(out); g.setAttribute('aM', new THREE.BufferAttribute(M, 1)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); return g; }
let _shM = null;
function shellMats() { if (_shM) return _shM; const vs = s => 'attribute float aM; varying float vM;\n' + s.replace('#include <begin_vertex>', '#include <begin_vertex>\n vM = aM;');
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.52, normalMap: hairNormal(), normalScale: new THREE.Vector2(0.75, 0.75), side: THREE.DoubleSide, alphaTest: 0.5, alphaToCoverage: true });
  m.onBeforeCompile = sh => { sh.vertexShader = vs(sh.vertexShader); sh.fragmentShader = 'varying float vM;\n' + sh.fragmentShader.replace('#include <alphatest_fragment>', 'diffuseColor.a = clamp(0.5 + vM * 6.0, 0., 1.);\n#include <alphatest_fragment>'); };
  m.customProgramCacheKey = () => 'shell1';
  const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  dm.onBeforeCompile = sh => { sh.vertexShader = vs(sh.vertexShader); sh.fragmentShader = 'varying float vM;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', 'if (vM < 0.) discard;\n#include <clipping_planes_fragment>'); };
  dm.customProgramCacheKey = () => 'shellD'; return (_shM = [m, dm]); }
function shellOn(p, g) { const [m, dm] = shellMats(), o = new THREE.Mesh(g, m); o.customDepthMaterial = dm; o.scale.set(...p.userData.HS); o.position.y = 0.11 * p.userData.k; o.castShadow = true; o.receiveShadow = true; p.userData.J.head.add(o); return o; }
const hcol = h => new THREE.Color(h);
// cabeza a medida: mandíbula, proporciones y nariz
function headFit(p, jw, hs, ns) { const J = p.userData.J; p.userData.headMesh.geometry = headGeoJ(jw); J.head.scale.set(...hs); const nose = J.head.children[1]; nose.scale.x *= ns[0]; nose.scale.y *= ns[1]; nose.scale.z *= ns[2]; }
function faceTune(p, o) { const U = p.userData.face.userData.U; if (o.brow !== undefined) U.browC.value.set(o.brow); if (o.lip !== undefined) U.lipC.value.set(o.lip); if (o.blush !== undefined) U.blush.value = o.blush; if (o.browW !== undefined) U.browW.value = o.browW; }
// pelo corto de hombre: la línea del pelo por nudos (|a| → altura): frente, entradas, sien, patilla, oreja y nuca
const hairline = (fc, ft, sb) => [[0, fc], [0.4, fc + 0.04], [0.8, ft], [1.04, lerp(ft, 0.3, 0.62)], [1.17, 0.28], [1.26, sb], [1.41, sb], [1.49, 0.27], [1.84, 0.27], [2.02, -0.25], [2.5, -0.47], [3.15, -0.47]];
// ---- los cuatro
function candidate(id) { let p;
  if (id === 'pp') { const jw = 0.25; p = person({ seed: 11, h: 1.76, skin: 0xdfb195, hairStyle: 'bald', hairC: 0xbfc1c4, eye: 0x5e4a36, top: 0x1b2a47, legs: 0x1b2a47, shoes: 0x141416, topType: 'long' });
    suitOn(p, { jacket: 0x1b2a47, shirt: 0xf7f8fa, tie: 0x2a64b8 }); headFit(p, jw, [0.97, 1.03, 1.0], [1.08, 1.14, 1.12]);
    // pelo cano corto y fino, frente despejada con entradas, peinado hacia un lado
    const HL = hairline(0.72, 0.95, 0.02), cTop = hcol(0xb2b4b8), cSide = hcol(0xd6d7d9);
    shellOn(p, shellGeo(jw, (a, e) => e - knots(Math.abs(a), HL), (a, e, m, d) => (0.028 + 0.03 * sstep(0.5, 1.1, e) + 0.018 * gss(a + 0.25, 0.5) * gss(e - 0.95, 0.22)) * sstep(0, 0.1, m) - 0.014 * gss(d[0] - 0.4, 0.035) * sstep(0.2, 0.5, d[2] + 0.5) * sstep(0.55, 0.75, d[1]),
      (a, e) => cTop.clone().lerp(cSide, sstep(1.05, 0.45, e))));
    faceTune(p, { brow: 0x5f5c58, lip: 0xbf8778, blush: 0.14, browW: 0.95 }); }
  else if (id === 'psoe') { const jw = 0.16; p = person({ seed: 12, h: 1.9, skin: 0xcd9a76, hairStyle: 'bald', hairC: 0x3a3532, eye: 0x4d2f17, top: 0x161f33, legs: 0x161f33, shoes: 0x141416, topType: 'long' });
    suitOn(p, { jacket: 0x161f33, shirt: 0xf7f8fa, tie: 0x8a1626 }); headFit(p, jw, [0.96, 1.06, 1.0], [1.04, 1.1, 1.1]);
    // pelo oscuro con volumen delante (tupé corto) y canas en las sienes y las patillas
    const HL = hairline(0.64, 0.84, 0.0), cDark = hcol(0x1f1a17), cGray = hcol(0x9c9995);
    shellOn(p, shellGeo(jw, (a, e) => e - knots(Math.abs(a), HL), (a, e, m) => (0.038 + 0.05 * sstep(0.45, 1.0, e) + 0.065 * gss(e - 0.86, 0.3) * gss(a + 0.08, 0.8)) * sstep(0, 0.075, m),
      (a, e) => cDark.clone().lerp(cGray, clamp(0.1 + 0.8 * sstep(0.92, 0.4, e) * sstep(0.6, 1.15, Math.abs(a)) * sstep(2.9, 1.9, Math.abs(a)) + 0.35 * sstep(0.2, -0.3, e) * sstep(1.9, 2.4, Math.abs(a))))));
    faceTune(p, { brow: 0x2a2522, lip: 0xb9806f, blush: 0.1, browW: 1.18 }); }
  else if (id === 'vox') { const jw = 0.13; p = person({ seed: 13, h: 1.8, skin: 0xcfa07f, hairStyle: 'bald', hairC: 0x2a221d, eye: 0x3b2414, top: 0x1a2130, legs: 0x1a2130, shoes: 0x141416, topType: 'long' });
    suitOn(p, { jacket: 0x1a2130, shirt: 0xf7f8fa, tie: null, wide: 0.5 }); headFit(p, jw, [1.03, 1.0, 1.02], [1.0, 1.0, 1.0]);
    // pelo oscuro peinado hacia atrás, pegado; barba cerrada y cuidada con canas a los lados del mentón
    const HL = hairline(0.6, 0.8, -0.14), cDark = hcol(0x1c1613), cGray = hcol(0x86827d), cBeard = hcol(0x221c18), cChin = hcol(0x8f8c87);
    shellOn(p, shellGeo(jw, (a, e) => e - knots(Math.abs(a), HL), (a, e, m) => (0.032 + 0.04 * sstep(0.45, 1.0, e)) * sstep(0, 0.06, m),
      (a, e) => cDark.clone().lerp(cGray, 0.45 * sstep(0.7, 0.25, e) * sstep(0.8, 1.2, Math.abs(a)) * sstep(1.9, 1.5, Math.abs(a)))));
    const top = [[0, -0.205], [0.3, -0.215], [0.5, -0.27], [0.85, -0.22], [1.15, -0.06], [1.36, 0.1], [1.5, 0.1]];
    const bm = (a, e) => { const A = Math.abs(a); return Math.min(knots(A, top) - e, (1.5 - A) * 0.6, e + 1.25, (Math.hypot(a / 0.225, (e + 0.34) / 0.062) - 1) * 0.06); };
    shellOn(p, shellGeo(jw, bm, (a, e, m) => (0.032 + 0.034 * sstep(-0.2, -0.75, e) + 0.045 * gss(a, 0.55) * sstep(-0.5, -0.95, e)) * sstep(0, 0.07, m),
      (a, e) => cBeard.clone().lerp(cChin, 0.62 * Math.max(gss(a - 0.23, 0.2) * gss(e + 0.7, 0.24), gss(a + 0.23, 0.2) * gss(e + 0.7, 0.24))), 0.0));
    faceTune(p, { brow: 0x1e1814, lip: 0xa97566, blush: 0.1, browW: 1.22 }); p.userData.J.spine.scale.x = 1.08; p.userData.J.neck.scale.x = 1 / 1.08 * 1.04; }
  else { const jw = 0.2; p = person({ seed: 14, female: true, h: 1.66, skin: 0xe6c0a6, hairStyle: 'bald', hairC: 0x3b2a1e, eye: 0x4d2f17, top: 0x22262e, legs: 0x22262e, shoes: 0x1a1a1c, topType: 'long' });
    suitOn(p, { jacket: 0x22262e, shirt: 0xefe6d8, tie: undefined, female: true, low: 0.2, wide: 0.72, lapK: 1.6 }); headFit(p, jw, [1.04, 0.98, 1.0], [0.92, 0.9, 0.9]);
    // media melena corta castaña que tapa las orejas y llega a la mandíbula, con el flequillo largo cruzando la frente hacia un lado
    const F = a => lerp(0.36, 0.82, sstep(-0.85, 0.75, a)), B = a => { const A = Math.abs(a); return A < 0.95 ? F(a) : lerp(F(Math.sign(a) * 0.95), -0.44, sstep(0.95, 1.16, A)) - 0.06 * sstep(1.8, 2.6, A); };
    const cBrown = hcol(0x2a1c13), cLight = hcol(0x4f3520);
    shellOn(p, shellGeo(jw, (a, e) => e - B(a), (a, e, m) => 0.032 + (0.05 + 0.04 * sstep(0.3, 1.0, e) + 0.05 * sstep(0.9, 1.3, Math.abs(a)) * sstep(0.5, -0.1, e) + 0.2 * clamp((-e - 0.1) / 0.8) * sstep(0.9, 1.2, Math.abs(a))) * sstep(0, 0.12, m),
      (a, e) => cBrown.clone().lerp(cLight, 0.22 + 0.2 * Math.sin(a * 21 + e * 4))));
    for (const i of [2, 3]) p.userData.J.head.children[i].visible = false;      // las orejas quedan bajo el pelo
    faceTune(p, { brow: 0x2a1c14, lip: 0xc27870, blush: 0.3, browW: 0.8 }); }
  p.userData.party = id; return p; }
