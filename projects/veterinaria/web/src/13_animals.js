// ---------------------------------------------------------------- «Veterinaria por dentro»: animales de plástico brillante (vaca, ternero, perro, gato, caballo,
// cerdo y gallina) hechos con secciones (loft) en el «espacio del animal» (mira hacia +z, suelo en y = 0, medidas reales en metros); manchas y rayas
// con ruido 3D en el sombreador (sin costuras); rayos X (el borde brilla) y esqueletos que salen de las mismas medidas.
const NOISE_GLSL = `
float h3(vec3 p){ p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }
float fbm3(vec3 p){ float a = 0.5, s = 0.; for (int i = 0; i < 4; i++){ s += a * vn3(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }`;

// ---------- loft: anillos (elipse o superelipse) a lo largo de un camino; anillo cerrado (sin costura) y tapas redondeadas
function loftGeo(C, R, o = {}) {
  const nr = o.nr || 28, sub = o.sub || 7, e0 = o.e || 2;
  const cc = new THREE.CatmullRomCurve3(C.map(p => v3(p[0], p[1], p[2])), false, 'catmullrom', 0.5);
  const rc = new THREE.CatmullRomCurve3(R.map(r => v3(r[0], r[1], r[2] ?? e0)), false, 'catmullrom', 0.5);
  const n = (C.length - 1) * sub + 1, S0 = o.side ? v3(...o.side) : v3(1, 0, 0);
  const rings = [];       // [{P, X, U, rx, ry, e}]
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), P = cc.getPoint(u), r = rc.getPoint(u), T = cc.getTangent(u).normalize();
    const X = S0.clone().addScaledVector(T, -S0.dot(T)).normalize(), U = new THREE.Vector3().crossVectors(T, X);
    rings.push({ P, X, U, T, rx: Math.max(1e-4, r.x), ry: Math.max(1e-4, r.y), e: r.z });
  }
  const pos = [], idx = [];
  const ringAt = (g, k) => {           // anillo g escalado k y desplazado d a lo largo de T
    const base = pos.length / 3;
    for (let j = 0; j < nr; j++) {
      const a = j / nr * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), ex = 2 / g.e;
      const fx = Math.sign(ca) * Math.pow(Math.abs(ca), ex), fy = Math.sign(sa) * Math.pow(Math.abs(sa), ex);
      const p = g.P.clone().addScaledVector(g.X, g.rx * fx * k).addScaledVector(g.U, g.ry * fy * k).addScaledVector(g.T, g.d || 0);
      pos.push(p.x, p.y, p.z);
    }
    return base;
  };
  const cap = (g, L, sgn, kk = 4) => { const out = []; for (let q = kk; q >= 1; q--) { const f = q / (kk + 1) * Math.PI / 2; out.push({ ...g, d: sgn * L * Math.sin(f), k: Math.cos(f) }); } return out; };
  const g0 = rings[0], g1 = rings[n - 1];
  const L0 = (o.cap0 ?? 1) * (g0.rx + g0.ry) / 2, L1 = (o.cap1 ?? 1) * (g1.rx + g1.ry) / 2;
  const seq = [...(L0 > 0 ? cap(g0, L0, -1) : []), ...rings.map(g => ({ ...g, k: 1 })), ...(L1 > 0 ? cap(g1, L1, 1).reverse() : [])];
  const bases = seq.map(g => ringAt(g, g.k));
  for (let i = 0; i < seq.length - 1; i++) for (let j = 0; j < nr; j++) {
    const a = bases[i] + j, b = bases[i] + (j + 1) % nr, c = bases[i + 1] + (j + 1) % nr, d = bases[i + 1] + j; idx.push(a, b, d, b, c, d);
  }
  const p0 = g0.P.clone().addScaledVector(g0.T, -L0), p1 = g1.P.clone().addScaledVector(g1.T, L1);
  const i0 = pos.length / 3; pos.push(p0.x, p0.y, p0.z); const i1 = pos.length / 3; pos.push(p1.x, p1.y, p1.z);
  const bf = bases[0], bl = bases[bases.length - 1];
  for (let j = 0; j < nr; j++) { idx.push(i0, bf + (j + 1) % nr, bf + j); idx.push(bl + j, bl + (j + 1) % nr, i1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  geo.setAttribute('aop', new THREE.Float32BufferAttribute(pos.slice(), 3));
  geo.userData.rings = rings; geo.userData.curve = cc; geo.userData.rcurve = rc;
  return geo;
}
const addAop = g => { if (!g.attributes.aop) g.setAttribute('aop', g.attributes.position.clone()); return g; };
// geometría colocada en el espacio del animal (para que las manchas sigan el mismo ruido): esfera, cono y cilindro
function sphG(c, s, rot = [0, 0, 0], seg = 20) { const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)); g.scale(s[0], s[1], s[2]); g.rotateX(rot[0]); g.rotateY(rot[1]); g.rotateZ(rot[2]); g.translate(c[0], c[1], c[2]); return addAop(g); }
function coneG(base, tip, r, seg = 18) { const a = v3(...base), b = v3(...tip), L = a.distanceTo(b); const g = new THREE.ConeGeometry(r, L, seg); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize())); g.translate(a.x, a.y, a.z); return addAop(g); }
function cylG(a0, b0, r0, r1, seg = 18) { const a = v3(...a0), b = v3(...b0), L = a.distanceTo(b); const g = new THREE.CylinderGeometry(r1, r0, L, seg); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize())); g.translate(a.x, a.y, a.z); return addAop(g); }

// ---------- materiales: manchas (vaca, perro) o rayas (gato) con ruido 3D; el ruido va en el espacio del animal (atributo aop)
function patchMat(c1, c2, o = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: o.r ?? 0.36, metalness: 0, clearcoat: o.cc ?? 0.75, clearcoatRoughness: o.ccr ?? 0.16 });
  const U = { pc1: { value: new THREE.Color(c1) }, pc2: { value: new THREE.Color(c2) }, pf: { value: o.f ?? 2.4 }, pth: { value: o.th ?? 0.5 }, pseed: { value: v3(...(o.seed || [1.3, 7.1, 3.7])) },
    pgrad: { value: new THREE.Vector4(...(o.grad || [0, 0, 0, 0])) }, pmode: { value: o.mode || 0 }, pdir: { value: v3(...(o.dir || [0, 0, 1])) }, pstr: { value: o.str || 60 }, pwarp: { value: o.warp ?? 0.45 } };
  m.userData.u = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aop; varying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = aop;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vOP; uniform vec3 pc1, pc2, pseed, pdir; uniform vec4 pgrad; uniform float pf, pth, pmode, pstr, pwarp;\n${NOISE_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 q = vOP * pf + pseed; q += pwarp * (vec3(vn3(q * 0.9 + 3.1), vn3(q * 0.9 + 7.7), vn3(q * 0.9 + 1.9)) - 0.5);
        float mm = pmode < 0.5 ? fbm3(q) : 0.5 + 0.5 * sin(dot(vOP, pdir) * pstr + fbm3(q) * 5.0);
        mm += dot(pgrad.xyz, vOP) + pgrad.w;
        float ww = max(fwidth(mm), 1e-4) * 1.1;
        diffuseColor.rgb *= mix(pc1, pc2, smoothstep(pth - ww, pth + ww, mm));`);
  };
  m.customProgramCacheKey = () => 'patch';
  return m;
}
// rayos X: el borde brilla (cuanto más de canto, más luz), aditivo; con planos de recorte para el barrido
const XR_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec3 vN; varying vec3 vV;
void main(){ vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mvPosition.xyz; gl_Position = projectionMatrix * mvPosition;
#include <logdepthbuf_vertex>
#include <clipping_planes_vertex>
}`;
const XR_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
uniform vec3 col; uniform float op, pw, base;
varying vec3 vN; varying vec3 vV;
void main(){
#include <clipping_planes_fragment>
#include <logdepthbuf_fragment>
  float r = 1.0 - abs(dot(normalize(vN), normalize(vV))); float a = (base + pow(r, pw)) * op;
  gl_FragColor = vec4(col * a, 1.0); }`;
function xrayMat(col = 0x8fd2ff, o = {}) {
  return new THREE.ShaderMaterial({ vertexShader: XR_VS, fragmentShader: XR_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, clipping: true,
    uniforms: { col: { value: new THREE.Color(col) }, op: { value: o.op ?? 1 }, pw: { value: o.pw ?? 2.6 }, base: { value: o.base ?? 0.03 } } });
}
const boneMat = () => new THREE.MeshStandardMaterial({ color: 0xe9eef3, emissive: 0xbfe4ff, emissiveIntensity: 0.6, roughness: 0.55 });

// ---------- definiciones (metros, mirando a +z). Cada parte: C (centros), R ([rx, ry, e]), padre, pivote, material
const mirX = C => C.map(p => [-p[0], p[1], p[2]]);
const ANIMALS = {
  cow: {
    mats: () => ({ body: patchMat(0xf6f3ec, 0x141417, { f: 2.3, th: 0.5, grad: [0, 0.32, 0, -0.32], seed: [2.1, 5.3, 1.7] }), dark: plastic(0x1a1918, 0.4), pink: plastic(0xd9a49a, 0.38),
      horn: new THREE.MeshPhysicalMaterial({ color: 0xe9dcc0, roughness: 0.35, clearcoat: 0.6 }), eye: new THREE.MeshPhysicalMaterial({ color: 0x08080a, roughness: 0.1, clearcoat: 1 }) }),
    parts: [
      { n: 'body', C: [[0, 1.20, -0.86], [0, 1.18, -0.62], [0, 1.10, -0.38], [0, 1.05, -0.14], [0, 1.06, 0.10], [0, 1.10, 0.34], [0, 1.14, 0.58]],
        R: [[0.15, 0.17], [0.30, 0.33], [0.33, 0.40], [0.35, 0.44], [0.35, 0.44], [0.29, 0.40], [0.21, 0.32]], e: 2.2, cap0: 0.5, cap1: 0.6, nr: 40, sub: 8 },
      { n: 'neck', piv: [0, 1.22, 0.52], C: [[0, 1.20, 0.46], [0, 1.24, 0.70], [0, 1.24, 0.86]], R: [[0.19, 0.27], [0.16, 0.23], [0.13, 0.18]], cap0: 0, cap1: 0.4 },
      { n: 'dew', par: 'neck', C: [[0, 0.98, 0.52], [0, 1.0, 0.66], [0, 1.08, 0.80]], R: [[0.05, 0.12], [0.045, 0.1], [0.04, 0.06]], cap0: 0.4, cap1: 0.6 },
      { n: 'head', par: 'neck', piv: [0, 1.27, 0.90], C: [[0, 1.29, 0.90], [0, 1.23, 0.99], [0, 1.12, 1.10], [0, 1.01, 1.20], [0, 0.95, 1.26]],
        R: [[0.11, 0.11], [0.125, 0.13], [0.11, 0.11], [0.09, 0.09], [0.10, 0.08]], e: 2.2, cap0: 0.8, cap1: 0.6 },
      { n: 'nose', par: 'head', m: 'pink', sph: [[0, 0.95, 1.31], [0.105, 0.075, 0.055], [-0.6, 0, 0]] },
      { n: 'nost', par: 'head', m: 'dark', sph: [[0.04, 0.945, 1.358], [0.014, 0.01, 0.008], [-0.6, 0, 0]], mir: 1 },
      { n: 'eye', par: 'head', m: 'eye', sph: [[0.098, 1.19, 1.03], [0.026, 0.026, 0.026]], mir: 1 },
      { n: 'ear', par: 'head', piv: [0.11, 1.27, 0.97], C: [[0.11, 1.27, 0.97], [0.18, 1.27, 0.975], [0.27, 1.25, 0.985]], R: [[0.03, 0.016], [0.062, 0.013], [0.036, 0.01]], side: [0, 0, 1], cap0: 0.3, cap1: 0.8, mir: 1 },
      { n: 'horn', par: 'head', m: 'horn', C: [[0.07, 1.34, 0.93], [0.13, 1.39, 0.925], [0.18, 1.47, 0.95]], R: [[0.028, 0.028], [0.02, 0.02], [0.006, 0.006]], side: [0, 0, 1], cap0: 0.2, cap1: 0.6, nr: 14, mir: 1 },
      { n: 'legF', piv: [0.16, 1.0, 0.42], C: [[0.16, 1.0, 0.42], [0.165, 0.62, 0.44], [0.165, 0.40, 0.43], [0.165, 0.12, 0.44], [0.165, 0.06, 0.445]],
        R: [[0.08, 0.13], [0.075, 0.09], [0.055, 0.065], [0.045, 0.05], [0.05, 0.055]], cap0: 0.3, cap1: 0.2, mir: 1, leg: 1 },
      { n: 'hoofF', par: 'legF', m: 'dark', cyl: [[0.165, 0.0, 0.448], [0.165, 0.07, 0.445], 0.06, 0.05], mir: 1 },
      { n: 'legH', piv: [0.16, 1.08, -0.58], C: [[0.16, 1.08, -0.58], [0.18, 0.78, -0.66], [0.185, 0.48, -0.74], [0.18, 0.30, -0.70], [0.175, 0.12, -0.66], [0.175, 0.06, -0.655]],
        R: [[0.12, 0.24], [0.105, 0.17], [0.06, 0.08], [0.05, 0.06], [0.045, 0.05], [0.05, 0.055]], cap0: 0.3, cap1: 0.2, mir: 1, leg: 1 },
      { n: 'hoofH', par: 'legH', m: 'dark', cyl: [[0.175, 0.0, -0.652], [0.175, 0.07, -0.655], 0.06, 0.05], mir: 1 },
      { n: 'tail', piv: [0, 1.37, -0.86], C: [[0, 1.37, -0.86], [0, 1.36, -0.93], [0, 1.20, -0.965], [0, 0.90, -0.96], [0, 0.64, -0.955]], R: [[0.035, 0.035], [0.028, 0.028], [0.02, 0.02], [0.016, 0.016], [0.014, 0.014]], cap0: 0.3, cap1: 0.3, nr: 12 },
      { n: 'tuft', par: 'tail', m: 'dark', C: [[0, 0.70, -0.955], [0, 0.56, -0.955], [0, 0.44, -0.95]], R: [[0.02, 0.02], [0.048, 0.045], [0.02, 0.02]], cap0: 0.4, cap1: 0.9, nr: 14 },
      { n: 'udder', m: 'pink', sph: [[0, 0.66, -0.40], [0.16, 0.12, 0.19]] },
      { n: 'teat', m: 'pink', cyl: [[0.06, 0.58, -0.33], [0.06, 0.50, -0.33], 0.02, 0.016], mir: 1 },
      { n: 'teat2', m: 'pink', cyl: [[0.06, 0.58, -0.47], [0.06, 0.50, -0.47], 0.02, 0.016], mir: 1 },
    ],
    skel: { spine: 0.62, vs: 0.075, ribs: [0.52, -0.30, 13], pelvis: [[0, 1.16, -0.62], [0.2, 0.08, 0.26]], scap: [[0.2, 1.22, 0.42], [0.02, 0.2, 0.12], -0.35], br: 0.024 },
  },
  dog: {
    mats: () => ({ body: patchMat(0xf5f1ea, 0xc98a4b, { f: 7, th: 0.5, grad: [0, 2.2, -0.3, -0.62], warp: 0.35, seed: [4.4, 1.2, 8.1] }), dark: plastic(0x5a3420, 0.4), nose: new THREE.MeshPhysicalMaterial({ color: 0x0c0b0b, roughness: 0.25, clearcoat: 1 }),
      eye: new THREE.MeshPhysicalMaterial({ color: 0x0a0807, roughness: 0.08, clearcoat: 1 }), pink: plastic(0xd98f8f, 0.4) }),
    parts: [
      { n: 'body', C: [[0, 0.27, -0.13], [0, 0.28, -0.06], [0, 0.29, 0.04], [0, 0.30, 0.10]], R: [[0.075, 0.08], [0.09, 0.095], [0.092, 0.10], [0.08, 0.095]], e: 2.1, cap0: 0.75, cap1: 0.6, nr: 32 },
      { n: 'neck', piv: [0, 0.33, 0.09], C: [[0, 0.32, 0.08], [0, 0.37, 0.13], [0, 0.41, 0.16]], R: [[0.06, 0.07], [0.055, 0.06], [0.05, 0.055]], cap0: 0, cap1: 0.5 },
      { n: 'head', par: 'neck', piv: [0, 0.42, 0.16], C: [[0, 0.47, 0.11], [0, 0.48, 0.165], [0, 0.465, 0.22], [0, 0.44, 0.27], [0, 0.432, 0.30]], R: [[0.065, 0.06], [0.095, 0.09], [0.085, 0.08], [0.048, 0.042], [0.042, 0.036]], cap0: 0.9, cap1: 0.6, nr: 32 },
      { n: 'nose', par: 'head', m: 'nose', sph: [[0, 0.442, 0.334], [0.022, 0.017, 0.015]] },
      { n: 'eye', par: 'head', m: 'eye', sph: [[0.047, 0.492, 0.243], [0.017, 0.018, 0.014]], mir: 1 },
      { n: 'tongue', par: 'head', m: 'pink', sph: [[0, 0.408, 0.29], [0.018, 0.006, 0.025], [0.3, 0, 0]] },
      { n: 'ear', par: 'head', m: 'dark', piv: [0.085, 0.505, 0.15], C: [[0.08, 0.505, 0.15], [0.104, 0.47, 0.156], [0.11, 0.415, 0.162]], R: [[0.022, 0.01], [0.034, 0.011], [0.028, 0.01]], side: [0, 0, 1], cap0: 0.3, cap1: 0.9, mir: 1 },
      { n: 'legF', piv: [0.05, 0.27, 0.07], C: [[0.05, 0.27, 0.07], [0.052, 0.15, 0.075], [0.052, 0.05, 0.08], [0.052, 0.02, 0.09]], R: [[0.032, 0.036], [0.024, 0.026], [0.022, 0.024], [0.026, 0.034]], cap0: 0.3, cap1: 0.6, mir: 1, leg: 1 },
      { n: 'legH', piv: [0.055, 0.28, -0.10], C: [[0.055, 0.28, -0.10], [0.06, 0.18, -0.12], [0.058, 0.10, -0.14], [0.056, 0.045, -0.125], [0.056, 0.02, -0.11]], R: [[0.045, 0.055], [0.034, 0.04], [0.024, 0.026], [0.022, 0.024], [0.026, 0.034]], cap0: 0.3, cap1: 0.6, mir: 1, leg: 1 },
      { n: 'tail', piv: [0, 0.32, -0.15], C: [[0, 0.32, -0.15], [0, 0.37, -0.19], [0, 0.42, -0.20], [0, 0.45, -0.19]], R: [[0.018, 0.018], [0.015, 0.015], [0.011, 0.011], [0.007, 0.007]], cap0: 0.3, cap1: 0.6, nr: 12 },
    ],
    skel: { spine: 0.55, vs: 0.02, ribs: [0.07, -0.04, 10], pelvis: [[0, 0.30, -0.10], [0.045, 0.022, 0.06]], scap: [[0.055, 0.33, 0.07], [0.008, 0.055, 0.032], -0.4], br: 0.007 },
  },
  cat: {
    mats: () => ({ body: patchMat(0x9fa2a8, 0x6a6d74, { mode: 1, f: 14, th: 0.62, dir: [0.25, 0.2, 1], str: 95, warp: 0.3, seed: [3.3, 2.2, 6.6], grad: [0, 1.0, 0, -0.25] }),
      pink: plastic(0xd99a9a, 0.4), eye: new THREE.MeshPhysicalMaterial({ color: 0xb9c45a, roughness: 0.05, clearcoat: 1, emissive: 0x2a3008 }), pupil: new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.1, clearcoat: 1 }) }),
    parts: [
      { n: 'body', C: [[0, 0.22, -0.17], [0, 0.225, -0.10], [0, 0.225, 0.02], [0, 0.235, 0.12], [0, 0.24, 0.16]], R: [[0.055, 0.06], [0.07, 0.075], [0.072, 0.08], [0.065, 0.075], [0.055, 0.065]], cap0: 0.7, cap1: 0.6, nr: 32 },
      { n: 'neck', piv: [0, 0.26, 0.15], C: [[0, 0.25, 0.14], [0, 0.30, 0.18], [0, 0.33, 0.20]], R: [[0.05, 0.055], [0.042, 0.045], [0.04, 0.042]], cap0: 0, cap1: 0.5 },
      { n: 'head', par: 'neck', piv: [0, 0.34, 0.20], C: [[0, 0.355, 0.17], [0, 0.36, 0.21], [0, 0.35, 0.25], [0, 0.335, 0.275]], R: [[0.045, 0.045], [0.06, 0.052], [0.048, 0.042], [0.028, 0.026]], cap0: 0.9, cap1: 0.7, nr: 32 },
      { n: 'nose', par: 'head', m: 'pink', sph: [[0, 0.343, 0.293], [0.009, 0.007, 0.006]] },
      { n: 'eye', par: 'head', m: 'eye', sph: [[0.026, 0.368, 0.252], [0.013, 0.012, 0.01]], mir: 1 },
      { n: 'pupil', par: 'head', m: 'pupil', sph: [[0.028, 0.368, 0.2605], [0.0035, 0.009, 0.003]], mir: 1 },
      { n: 'ear', par: 'head', cone: [[0.032, 0.39, 0.205], [0.05, 0.445, 0.20], 0.024], mir: 1 },
      { n: 'legF', piv: [0.04, 0.22, 0.12], C: [[0.04, 0.22, 0.12], [0.042, 0.12, 0.13], [0.042, 0.04, 0.135], [0.042, 0.014, 0.142]], R: [[0.03, 0.035], [0.022, 0.024], [0.018, 0.02], [0.02, 0.026]], cap0: 0.3, cap1: 0.6, mir: 1, leg: 1 },
      { n: 'legH', piv: [0.045, 0.23, -0.13], C: [[0.045, 0.23, -0.13], [0.05, 0.15, -0.15], [0.048, 0.08, -0.175], [0.046, 0.035, -0.16], [0.046, 0.014, -0.15]], R: [[0.045, 0.06], [0.032, 0.04], [0.02, 0.022], [0.018, 0.02], [0.02, 0.026]], cap0: 0.3, cap1: 0.6, mir: 1, leg: 1 },
      { n: 'tail', piv: [0, 0.25, -0.18], C: [[0, 0.25, -0.18], [0, 0.27, -0.26], [0, 0.33, -0.31], [0, 0.41, -0.31], [0, 0.46, -0.27]], R: [[0.018, 0.018], [0.016, 0.016], [0.015, 0.015], [0.014, 0.014], [0.012, 0.012]], cap0: 0.3, cap1: 0.7, nr: 12 },
    ],
    skel: { spine: 0.55, vs: 0.018, ribs: [0.10, -0.05, 11], pelvis: [[0, 0.24, -0.13], [0.035, 0.02, 0.05]], scap: [[0.045, 0.27, 0.11], [0.006, 0.045, 0.025], -0.4], br: 0.006 },
  },
  horse: {
    mats: () => ({ body: patchMat(0x6a4630, 0x2a1b14, { f: 1.4, th: 0.5, grad: [0, -2.4, 0, 1.55], warp: 0.2, seed: [1.1, 9.2, 4.4] }), dark: plastic(0x1c1613, 0.45),
      eye: new THREE.MeshPhysicalMaterial({ color: 0x07070a, roughness: 0.08, clearcoat: 1 }), hair: new THREE.MeshPhysicalMaterial({ color: 0x1f1714, roughness: 0.55, clearcoat: 0.3, sheen: 1, sheenColor: new THREE.Color(0x5a4636) }) }),
    parts: [
      { n: 'body', C: [[0, 1.27, -0.78], [0, 1.29, -0.66], [0, 1.24, -0.40], [0, 1.20, -0.10], [0, 1.22, 0.20], [0, 1.28, 0.45], [0, 1.32, 0.58]],
        R: [[0.15, 0.18], [0.26, 0.29], [0.30, 0.34], [0.31, 0.36], [0.30, 0.36], [0.25, 0.36], [0.19, 0.30]], e: 2.2, cap0: 0.6, cap1: 0.6, nr: 40, sub: 8 },
      { n: 'neck', piv: [0, 1.40, 0.50], C: [[0, 1.35, 0.46], [0, 1.55, 0.66], [0, 1.78, 0.80], [0, 1.92, 0.86]], R: [[0.17, 0.30], [0.13, 0.24], [0.10, 0.17], [0.085, 0.12]], cap0: 0, cap1: 0.5 },
      { n: 'mane', par: 'neck', m: 'hair', C: [[0, 2.0, 0.84], [0, 1.86, 0.74], [0, 1.64, 0.60], [0, 1.47, 0.47]], R: [[0.022, 0.05], [0.03, 0.075], [0.03, 0.075], [0.02, 0.05]], side: [1, 0, 0], cap0: 0.6, cap1: 0.6 },
      { n: 'head', par: 'neck', piv: [0, 1.95, 0.86], C: [[0, 1.97, 0.84], [0, 1.92, 0.93], [0, 1.80, 1.05], [0, 1.67, 1.16], [0, 1.61, 1.21]], R: [[0.09, 0.11], [0.10, 0.12], [0.08, 0.095], [0.07, 0.08], [0.075, 0.07]], cap0: 0.8, cap1: 0.7 },
      { n: 'eye', par: 'head', m: 'eye', sph: [[0.093, 1.90, 0.97], [0.022, 0.024, 0.022]], mir: 1 },
      { n: 'nost', par: 'head', m: 'dark', sph: [[0.04, 1.63, 1.235], [0.016, 0.022, 0.01], [-0.7, 0, 0]], mir: 1 },
      { n: 'ear', par: 'head', cone: [[0.055, 2.03, 0.86], [0.075, 2.15, 0.87], 0.032], mir: 1 },
      { n: 'forelock', par: 'head', m: 'hair', sph: [[0, 2.02, 0.90], [0.05, 0.06, 0.04], [0.6, 0, 0]] },
      { n: 'legF', piv: [0.15, 1.10, 0.42], C: [[0.15, 1.10, 0.42], [0.15, 0.75, 0.45], [0.145, 0.50, 0.44], [0.145, 0.15, 0.45], [0.145, 0.08, 0.47]],
        R: [[0.10, 0.14], [0.07, 0.085], [0.045, 0.055], [0.04, 0.045], [0.045, 0.05]], cap0: 0.3, cap1: 0.2, mir: 1, leg: 1 },
      { n: 'hoofF', par: 'legF', m: 'dark', cyl: [[0.145, 0.0, 0.475], [0.145, 0.085, 0.47], 0.062, 0.048], mir: 1 },
      { n: 'legH', piv: [0.14, 1.18, -0.58], C: [[0.14, 1.18, -0.58], [0.16, 0.86, -0.66], [0.165, 0.55, -0.76], [0.16, 0.32, -0.70], [0.155, 0.14, -0.64], [0.155, 0.08, -0.625]],
        R: [[0.11, 0.24], [0.1, 0.16], [0.055, 0.07], [0.045, 0.055], [0.04, 0.045], [0.045, 0.05]], cap0: 0.3, cap1: 0.2, mir: 1, leg: 1 },
      { n: 'hoofH', par: 'legH', m: 'dark', cyl: [[0.155, 0.0, -0.622], [0.155, 0.085, -0.625], 0.062, 0.048], mir: 1 },
      { n: 'tail', m: 'hair', piv: [0, 1.36, -0.86], C: [[0, 1.37, -0.84], [0, 1.31, -0.95], [0, 1.06, -1.01], [0, 0.78, -0.99], [0, 0.56, -0.95]], R: [[0.05, 0.06], [0.06, 0.07], [0.075, 0.07], [0.06, 0.06], [0.025, 0.03]], cap0: 0.4, cap1: 0.8, nr: 16 },
    ],
    skel: { spine: 0.6, vs: 0.075, ribs: [0.48, -0.25, 13], pelvis: [[0, 1.24, -0.62], [0.18, 0.08, 0.24]], scap: [[0.18, 1.36, 0.42], [0.02, 0.22, 0.12], -0.4], br: 0.024 },
  },
  pig: {
    mats: () => ({ body: patchMat(0xefb7aa, 0xd99a8e, { f: 6, th: 0.62, warp: 0.3 }), snout: plastic(0xd98b80, 0.4), dark: plastic(0x2a1f1d, 0.45), eye: new THREE.MeshPhysicalMaterial({ color: 0x07070a, roughness: 0.08, clearcoat: 1 }) }),
    parts: [
      { n: 'body', C: [[0, 0.62, -0.62], [0, 0.64, -0.52], [0, 0.62, -0.25], [0, 0.60, 0.05], [0, 0.61, 0.30], [0, 0.62, 0.45]], R: [[0.16, 0.18], [0.25, 0.26], [0.30, 0.30], [0.31, 0.31], [0.28, 0.29], [0.20, 0.24]], e: 2.2, cap0: 0.6, cap1: 0.4, nr: 36 },
      { n: 'head', piv: [0, 0.66, 0.45], C: [[0, 0.66, 0.40], [0, 0.645, 0.56], [0, 0.585, 0.68], [0, 0.545, 0.76]], R: [[0.19, 0.22], [0.16, 0.17], [0.10, 0.10], [0.075, 0.07]], cap0: 0, cap1: 0.15, nr: 32 },
      { n: 'snout', par: 'head', m: 'snout', cyl: [[0, 0.54, 0.765], [0, 0.535, 0.80], 0.078, 0.075] },
      { n: 'nost', par: 'head', m: 'dark', sph: [[0.022, 0.535, 0.80], [0.011, 0.016, 0.006]], mir: 1 },
      { n: 'eye', par: 'head', m: 'eye', sph: [[0.088, 0.72, 0.585], [0.016, 0.018, 0.014]], mir: 1 },
      { n: 'ear', par: 'head', piv: [0.10, 0.80, 0.47], C: [[0.10, 0.80, 0.47], [0.15, 0.85, 0.57], [0.16, 0.80, 0.66]], R: [[0.04, 0.012], [0.072, 0.013], [0.05, 0.01]], cap0: 0.3, cap1: 0.8, mir: 1 },
      { n: 'legF', piv: [0.13, 0.45, 0.32], C: [[0.13, 0.45, 0.32], [0.13, 0.25, 0.33], [0.13, 0.08, 0.335], [0.13, 0.05, 0.34]], R: [[0.07, 0.08], [0.05, 0.055], [0.04, 0.045], [0.04, 0.045]], cap0: 0.3, cap1: 0.2, mir: 1, leg: 1 },
      { n: 'hoofF', par: 'legF', m: 'dark', cyl: [[0.13, 0.0, 0.342], [0.13, 0.05, 0.34], 0.043, 0.04], mir: 1 },
      { n: 'legH', piv: [0.14, 0.50, -0.45], C: [[0.14, 0.50, -0.45], [0.145, 0.30, -0.50], [0.14, 0.15, -0.52], [0.135, 0.05, -0.49]], R: [[0.10, 0.12], [0.07, 0.08], [0.045, 0.05], [0.04, 0.045]], cap0: 0.3, cap1: 0.2, mir: 1, leg: 1 },
      { n: 'hoofH', par: 'legH', m: 'dark', cyl: [[0.135, 0.0, -0.488], [0.135, 0.05, -0.49], 0.043, 0.04], mir: 1 },
      { n: 'tail', piv: [0, 0.72, -0.66], helix: [[0, 0.72, -0.66], 0.03, 0.06, 2.2, 0.011] },
    ],
    skel: { spine: 0.6, vs: 0.05, ribs: [0.30, -0.22, 13], pelvis: [[0, 0.68, -0.46], [0.14, 0.06, 0.16]], scap: [[0.17, 0.70, 0.30], [0.015, 0.14, 0.09], -0.35], br: 0.016 },
  },
  hen: {
    mats: () => ({ body: patchMat(0xf5f1e8, 0xd9d1c2, { f: 18, th: 0.6, warp: 0.4 }), red: plastic(0xd2262c, 0.32), beak: plastic(0xe7aa36, 0.32), leg: plastic(0xe8b93c, 0.35),
      eye: new THREE.MeshPhysicalMaterial({ color: 0x0a0806, roughness: 0.08, clearcoat: 1 }) }),
    parts: [
      { n: 'body', C: [[0, 0.30, -0.16], [0, 0.28, -0.10], [0, 0.26, 0.0], [0, 0.27, 0.08], [0, 0.30, 0.12]], R: [[0.06, 0.07], [0.11, 0.12], [0.12, 0.13], [0.10, 0.12], [0.07, 0.09]], cap0: 0.7, cap1: 0.7, nr: 32 },
      { n: 'tailf', C: [[0, 0.31, -0.13], [0, 0.40, -0.19], [0, 0.47, -0.205]], R: [[0.05, 0.035], [0.065, 0.025], [0.05, 0.015]], cap0: 0.2, cap1: 0.7 },
      { n: 'wing', C: [[0.10, 0.31, 0.06], [0.118, 0.29, -0.04], [0.10, 0.29, -0.14]], R: [[0.05, 0.02], [0.072, 0.022], [0.03, 0.015]], side: [0, 1, 0], cap0: 0.6, cap1: 0.8, mir: 1 },
      { n: 'neck', piv: [0, 0.34, 0.10], C: [[0, 0.33, 0.09], [0, 0.40, 0.12], [0, 0.45, 0.13]], R: [[0.06, 0.06], [0.045, 0.045], [0.04, 0.04]], cap0: 0, cap1: 0.5 },
      { n: 'head', par: 'neck', piv: [0, 0.46, 0.13], C: [[0, 0.465, 0.11], [0, 0.475, 0.14], [0, 0.47, 0.17]], R: [[0.035, 0.035], [0.04, 0.038], [0.03, 0.03]], cap0: 0.9, cap1: 0.8 },
      { n: 'beak', par: 'head', m: 'beak', cone: [[0, 0.466, 0.185], [0, 0.458, 0.222], 0.012] },
      { n: 'comb', par: 'head', m: 'red', sph: [[0, 0.512, 0.118], [0.006, 0.016, 0.014]] },
      { n: 'comb2', par: 'head', m: 'red', sph: [[0, 0.52, 0.14], [0.006, 0.02, 0.014]] },
      { n: 'comb3', par: 'head', m: 'red', sph: [[0, 0.512, 0.162], [0.006, 0.016, 0.013]] },
      { n: 'wattle', par: 'head', m: 'red', sph: [[0, 0.435, 0.172], [0.007, 0.016, 0.012]] },
      { n: 'eye', par: 'head', m: 'eye', sph: [[0.03, 0.478, 0.152], [0.006, 0.006, 0.006]], mir: 1 },
      { n: 'legF', m: 'leg', piv: [0.04, 0.20, 0.0], C: [[0.04, 0.20, 0.0], [0.042, 0.12, 0.0], [0.04, 0.03, 0.02], [0.04, 0.008, 0.024]], R: [[0.03, 0.035], [0.011, 0.011], [0.009, 0.009], [0.009, 0.009]], cap0: 0.3, cap1: 0.4, mir: 1, nr: 12, leg: 1 },
      { n: 'toe1', par: 'legF', m: 'leg', cyl: [[0.04, 0.007, 0.024], [0.04, 0.006, 0.075], 0.006, 0.004], mir: 1 },
      { n: 'toe2', par: 'legF', m: 'leg', cyl: [[0.04, 0.007, 0.024], [0.065, 0.006, 0.065], 0.006, 0.004], mir: 1 },
      { n: 'toe3', par: 'legF', m: 'leg', cyl: [[0.04, 0.007, 0.024], [0.016, 0.006, 0.066], 0.006, 0.004], mir: 1 },
    ],
    skel: { spine: 0.5, vs: 0.02, ribs: [0.06, -0.08, 7], keel: [[0, 0.19, 0.0], [0.012, 0.06, 0.12]], pelvis: [[0, 0.32, -0.09], [0.05, 0.02, 0.06]], br: 0.006, bird: 1 },
  },
};
ANIMALS.calf = { ...ANIMALS.cow, mats: () => ({ ...ANIMALS.cow.mats(), body: patchMat(0xf6f3ec, 0x141417, { f: 2.3, th: 0.5, grad: [0, 0.32, 0, -0.32], seed: [5.5, 2.2, 7.7] }) }) };

// ---------- construir: grupo del animal con un pivote por parte (para animar) y la lista de mallas
function makeAnimal(kind, sc = 1) {
  const D = ANIMALS[kind], mats = D.mats(), A = new THREE.Group(), root = new THREE.Group(); root.scale.setScalar(sc); A.add(root);
  const G = { root }, PV = { root: v3(0, 0, 0) }, solids = [];
  const parts = [], isMir = n => !!D.parts.find(q => q.n === n && q.mir);
  for (const p of D.parts) {
    if (p.mir) for (const [sd, sf] of [[1, 'R'], [-1, 'L']]) parts.push({ ...p, sd, nm: p.n + sf, parN: p.par ? (isMir(p.par) ? p.par + sf : p.par) : 'root' });
    else parts.push({ ...p, sd: 1, nm: p.n, parN: p.par || 'root' });
  }
  const mx = (P, sd) => P ? [P[0] * sd, P[1], P[2]] : P;
  for (const p of parts) {
    const sd = p.sd, nm = p.nm, parG = G[p.parN] || root, parP = PV[p.parN] || PV.root;
    let geo;
    if (p.C) geo = loftGeo(p.C.map(c => mx(c, sd)), p.R, { e: p.e, cap0: p.cap0, cap1: p.cap1, nr: p.nr, sub: p.sub, side: p.side });
    else if (p.sph) geo = sphG(mx(p.sph[0], sd), p.sph[1], p.sph[2] ? [p.sph[2][0], p.sph[2][1] * sd, p.sph[2][2] * sd] : [0, 0, 0]);
    else if (p.cyl) geo = cylG(mx(p.cyl[0], sd), mx(p.cyl[1], sd), p.cyl[2], p.cyl[3]);
    else if (p.cone) geo = coneG(mx(p.cone[0], sd), mx(p.cone[1], sd), p.cone[2]);
    else if (p.helix) { const [c0, r, h, turns, tr] = p.helix, pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40, a = u * turns * Math.PI * 2; pts.push(v3(c0[0] + Math.sin(a) * r * (1 - 0.3 * u), c0[1] + u * h, c0[2] - Math.cos(a) * r * (1 - 0.3 * u) - u * 0.03 + r)); }
      geo = addAop(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, tr, 8, false)); }
    const piv = p.piv ? v3(...mx(p.piv, sd)) : null;
    let holder = parG, hp = parP;
    if (piv) { const g = new THREE.Group(); g.position.copy(piv).sub(parP); parG.add(g); G[nm] = g; PV[nm] = piv; holder = g; hp = piv; }
    geo.translate(-hp.x, -hp.y, -hp.z);
    const m = new THREE.Mesh(geo, mats[p.m || 'body']); m.castShadow = true; m.receiveShadow = true; m.userData.part = nm; holder.add(m); solids.push(m);
    if (!piv) { G[nm + '_m'] = m; }
    p.geo = geo; p.holder = holder; p.hp = hp;
  }
  A.userData = { kind, D, G, PV, mats, solids, parts, sc };
  return A;
}
// ---------- esqueleto (huesos que brillan) dentro de los mismos pivotes: columna, costillas, pelvis, escápulas, patas, cuello, cráneo y cola
function addSkeleton(A, bm) {
  const { D, G, PV, parts } = A.userData, sk = D.skel, br = sk.br, out = [];
  const add = (holder, hp, geos) => { if (!geos.length) return; const gg = mergeGeometries(geos.map(g => { const q = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(q.attributes)) if (!['position', 'normal'].includes(k)) q.deleteAttribute(k); return q; }));
    gg.translate(-hp.x, -hp.y, -hp.z); const m = new THREE.Mesh(gg, bm); m.visible = false; holder.add(m); out.push(m); };
  const ball = (c, r) => { const g = new THREE.SphereGeometry(r, 10, 8); g.translate(c.x, c.y, c.z); return g; };
  const ell = (c, s, rx = 0, rz = 0) => { const g = new THREE.SphereGeometry(1, 14, 10); g.scale(s[0], s[1], s[2]); g.rotateX(rx); g.rotateZ(rz); g.translate(c[0], c[1], c[2]); return g; };
  const rod = (a, b, r) => { const L = a.distanceTo(b); const g = new THREE.CylinderGeometry(r, r, L, 8); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize())); g.translate(a.x, a.y, a.z); return g; };
  const chain = (pts, r, step, size, out2) => { let acc = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = a.distanceTo(b); acc += L; if (acc >= step) { acc = 0; out2.push(ell([b.x, b.y, b.z], [size, size * 0.8, size * 0.75])); } } };
  const byName = n => parts.find(p => p.nm === n);
  // tronco: columna por encima del centro de cada sección, costillas y esternón
  { const body = byName('body'), rings = body.geo.userData.rings, gs = [];
    const top = rings.map(g => g.P.clone().addScaledVector(g.U, g.ry * sk.spine));
    chain(top, br, sk.vs, br * 1.15, gs); for (let i = 1; i < top.length; i++) gs.push(rod(top[i - 1], top[i], br * 0.45));
    const [z0, z1, nR] = sk.ribs || [0, 0, 0], low = [];
    for (let i = 0; i < nR; i++) { const z = lerp(z0, z1, i / Math.max(1, nR - 1)); let best = rings[0]; for (const g of rings) if (Math.abs(g.P.z - z) < Math.abs(best.P.z - z)) best = g;
      for (const sd of [-1, 1]) { const pts = []; for (let k = 0; k <= 10; k++) { const a = lerp(Math.PI * 0.42, -Math.PI * 0.44, k / 10); pts.push(best.P.clone().add(v3(sd * best.rx * 0.86 * Math.cos(a), best.ry * (k ? 0.86 : sk.spine) * Math.sin(a), 0))); }
        const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, br * 0.3, 6, false); gs.push(tg); }
      low.push(best.P.clone().add(v3(0, -best.ry * 0.86 * Math.sin(Math.PI * 0.44), 0))); }
    if (low.length > 1) for (let i = 1; i < low.length; i++) gs.push(rod(low[i - 1], low[i], br * 0.6));
    if (sk.pelvis) { const [c, s] = sk.pelvis; for (const sd of [-1, 1]) gs.push(ell([c[0] + sd * s[0] * 0.55, c[1], c[2]], [s[0] * 0.45, s[1], s[2]], 0, sd * 0.35)); }
    if (sk.scap) { const [c, s, rx] = sk.scap; for (const sd of [-1, 1]) gs.push(ell([sd * c[0], c[1], c[2]], s, rx, 0)); }
    if (sk.keel) { const [c, s] = sk.keel; gs.push(ell(c, s)); }
    add(G.root, PV.root, gs); }
  // patas, cuello, cola y alas: huesos a lo largo de su camino; cráneo: la cabeza encogida
  for (const p of parts) {
    if (!p.C || p.nm === 'body') continue;
    const rings = p.geo.userData.rings, gs = [];
    if (p.leg) { const cp = p.C.map(c => v3(c[0] * p.sd, c[1], c[2])); for (let i = 1; i < cp.length; i++) { const r = Math.min(p.R[i - 1][0], p.R[i - 1][1]) * 0.36; gs.push(rod(cp[i - 1], cp[i], r)); gs.push(ball(cp[i - 1], r * 1.45)); } }
    else if (/^(neck|tail)/.test(p.nm)) { const pts = rings.map(g => g.P.clone()); chain(pts, br, sk.vs * (p.nm.startsWith('tail') ? 0.7 : 1), br * (p.nm.startsWith('tail') ? 0.9 : 1.5), gs); for (let i = 1; i < pts.length; i++) gs.push(rod(pts[i - 1], pts[i], br * 0.4)); }
    else if (p.nm === 'head') { const g = loftGeo(p.C.map(c => [c[0], c[1], c[2]]), p.R.map(r => [r[0] * 0.78, r[1] * 0.74, r[2]]), { cap0: p.cap0, cap1: p.cap1, nr: 20, sub: 5 }); gs.push(g); }
    else if (/^wing/.test(p.nm)) { const pts = rings.map(g => g.P.clone()); for (let i = 1; i < pts.length; i++) gs.push(rod(pts[i - 1], pts[i], br * 0.5)); }
    else continue;
    add(p.holder, p.hp, gs);
  }
  A.userData.bones = out; return out;
}
// ---------- rayos X: una copia de cada malla con el material del borde + el esqueleto; barrido con dos planos de recorte (lo escaneado se ve por dentro)
function addXray(A, col = 0x8fd2ff, o = {}) {
  const xm = xrayMat(col, o), bm = boneMat(), shells = [];
  for (const m of A.userData.solids) { const s = new THREE.Mesh(m.geometry, xm); s.position.copy(m.position); s.rotation.copy(m.rotation); s.scale.copy(m.scale); s.visible = false; s.renderOrder = 7; m.parent.add(s); shells.push(s); }
  const bones = addSkeleton(A, bm);
  const pS = new THREE.Plane(v3(1, 0, 0), 0), pX = new THREE.Plane(v3(-1, 0, 0), 0);
  const solidMats = new Set(A.userData.solids.map(m => m.material));
  A.userData.xr = { xm, bm, shells, bones, pS, pX, solidMats, mode: 'solid' };
  return A.userData.xr;
}
// modo: 'solid' (normal), 'xray' (todo por dentro) o 'scan' (barrido: dirección D en el mundo, posición s; lo de D·x < s se ve por dentro)
function xrMode(A, mode, D, s) {
  const X = A.userData.xr; if (!X) return;
  const clip = mode === 'scan';
  if (clip) { X.pS.normal.copy(D); X.pS.constant = -s; X.pX.normal.copy(D).negate(); X.pX.constant = s; }
  if (X.mode !== mode || clip !== X.clip) {
    for (const m of X.solidMats) { m.clippingPlanes = clip ? [X.pS] : null; m.needsUpdate = true; }
    X.xm.clippingPlanes = clip ? [X.pX] : null; X.xm.needsUpdate = true; X.bm.clippingPlanes = clip ? [X.pX] : null; X.bm.needsUpdate = true;
    X.mode = mode; X.clip = clip;
  }
  const sv = mode !== 'xray', xv = mode !== 'solid';
  for (const m of A.userData.solids) m.visible = sv;
  for (const m of X.shells) m.visible = xv;
  for (const m of X.bones) m.visible = xv;
}
// ---------- poses y movimientos
function poseAnimal(A, o = {}) {
  const G = A.userData.G, set = (n, rx = 0, ry = 0, rz = 0) => { if (G[n]) G[n].rotation.set(rx, ry, rz); };
  set('neck', o.neck || 0, o.neckY || 0, 0); set('head', o.head || 0, o.headY || 0, o.headZ || 0);
  const wk = o.walk || 0, ph = o.phase || 0;
  for (const [n, off] of [['legFR', 0], ['legFL', Math.PI], ['legHR', Math.PI], ['legHL', 0]]) if (G[n]) G[n].rotation.set((o.legs?.[n] ?? 0) + Math.sin(ph + off) * wk, 0, 0);
  if (G.tail) G.tail.rotation.set(o.tailX || 0, 0, o.tail || 0);
  if (G.earR) G.earR.rotation.set(0, 0, o.ear || 0); if (G.earL) G.earL.rotation.set(0, 0, -(o.ear || 0));
}
// guante largo de palpación (de hombro a dedos) en naranja translúcido: la mano en el origen (dedos hacia +y) y la manga hacia −y
function glove(len = 0.8) {
  const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0xff7a1c, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.88, sheen: 0.6, sheenColor: new THREE.Color(0xffc08a) });
  const hand = new THREE.Group(); g.add(hand);
  hand.add(mesh(sphG([0, 0.055, 0], [0.046, 0.06, 0.02]), m));
  [[-0.03, 0.105, 0.05, -0.08], [-0.01, 0.112, 0.058, -0.02], [0.012, 0.11, 0.055, 0.03], [0.032, 0.102, 0.045, 0.1]].forEach(([x, y, L, a]) => { const f = mesh(cylG([x, y, 0], [x + Math.sin(a) * L, y + Math.cos(a) * L, 0.004], 0.0105, 0.0095, 12), m); hand.add(f); hand.add(mesh(sphG([x + Math.sin(a) * L, y + Math.cos(a) * L, 0.004], [0.0095, 0.0095, 0.0095]), m)); });
  hand.add(mesh(cylG([-0.04, 0.04, 0.005], [-0.075, 0.085, 0.012], 0.012, 0.0105, 12), m)); hand.add(mesh(sphG([-0.075, 0.085, 0.012], [0.0105, 0.0105, 0.0105]), m));
  const sleeve = new THREE.Group(); g.add(sleeve);
  sleeve.add(mesh(loftGeo([[0, 0.02, 0], [0, -0.05, 0], [0, -0.3, 0], [0, -0.55, 0], [0, -0.8, 0]], [[0.034, 0.02], [0.034, 0.028], [0.042, 0.038], [0.05, 0.047], [0.058, 0.055]], { cap0: 0, cap1: 0, nr: 24, side: [1, 0, 0] }), m));
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.006, 8, 28), m); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.8; sleeve.add(cuff);
  sleeve.scale.y = len / 0.8; g.userData = { hand, sleeve, m, len };
  return g;
}
