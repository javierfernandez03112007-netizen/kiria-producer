// «No te enjuagues después de cepillarte» — boca 3D brillante con bacterias de colores. La cámara entra sin cortes en la
// boca, en un diente cortado por la mitad y en los cristales del esmalte, y vuelve a salir. Pensado para 60 fps.
// window.renderAt(t) dibuja el instante t. window.PR = 2 → render real a 2160x3840 (4K vertical).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { W, H, clamp, prog, lerp, eo, eio } from './lib.js';

// ---------------------------------------------------------------- render, resplandor y acabado
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
const PR = window.PR || 1; renderer.setPixelRatio(PR); renderer.setSize(W, H); document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const rtA = new THREE.WebGLRenderTarget(W * PR, H * PR, { type: THREE.HalfFloatType, samples: 4 });
const BW = Math.round(W * PR / 4), BH = Math.round(H * PR / 4);
const rtB = [0, 1].map(() => new THREE.WebGLRenderTarget(BW, BH, { type: THREE.HalfFloatType }));
const rtC = [0, 1].map(() => new THREE.WebGLRenderTarget(Math.round(BW / 2), Math.round(BH / 2), { type: THREE.HalfFloatType }));
const VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
const brightM = new THREE.ShaderMaterial({ uniforms: { tA: { value: null }, px: { value: new THREE.Vector2(1.5 / (W * PR), 1.5 / (H * PR)) } }, vertexShader: VS, depthTest: false,
  fragmentShader: `uniform sampler2D tA; uniform vec2 px; varying vec2 vUv;
    void main(){ vec3 c = vec3(0.); for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) c += texture2D(tA, vUv + vec2(float(i), float(j)) * px).rgb; c /= 9.0;
      float l = max(c.r, max(c.g, c.b)), k = clamp((l - 1.25) / 1.6, 0., 1.); gl_FragColor = vec4(c * k * k, 1.); }` });
const blurM = new THREE.ShaderMaterial({ uniforms: { tA: { value: null }, d: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false,
  fragmentShader: `uniform sampler2D tA; uniform vec2 d; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tA, vUv).rgb * 0.227027;
      c += (texture2D(tA, vUv + d * 1.384615).rgb + texture2D(tA, vUv - d * 1.384615).rgb) * 0.316216;
      c += (texture2D(tA, vUv + d * 3.230769).rgb + texture2D(tA, vUv - d * 3.230769).rgb) * 0.070270;
      gl_FragColor = vec4(c, 1.); }` });
const post = new THREE.ShaderMaterial({        // desenfoque de movimiento, resplandor, aberración cromática, ACES, gradación cálida, viñeta, grano, fundido a blanco
  uniforms: { tA: { value: null }, tB: { value: null }, tC: { value: null }, dir: { value: new THREE.Vector2(0, 0) }, fade: { value: 0 }, white: { value: 0 }, vig: { value: 0.34 },
    time: { value: 0 }, flash: { value: 0 }, bloom: { value: 0.55 }, ca: { value: 1 }, night: { value: 0 } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D tA, tB, tC; uniform vec2 dir; uniform float fade, white, vig, time, flash, bloom, ca, night; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec2 c = vUv - .5; vec2 cc = c * 0.003 * ca; vec3 a = vec3(0.), b = vec3(0.);
      for(int i=0;i<20;i++){ float k=(float(i)/19.0-0.5); vec2 u=vUv+dir*k; a.r+=texture2D(tA, u+cc).r; a.g+=texture2D(tA, u).g; a.b+=texture2D(tA, u-cc).b; } a/=20.0;
      for(int i=0;i<6;i++){ float k=(float(i)/5.0-0.5); vec2 u=vUv+dir*k; b += texture2D(tB, u).rgb * 0.7 + texture2D(tC, u).rgb; } b /= 6.0;
      a += b * bloom;
      a = mix(a, vec3(0.0), fade); a += flash;
      a *= 1.0; a = clamp((a*(2.51*a+0.03))/(a*(2.43*a+0.59)+0.14),0.,1.); a = pow(a, vec3(1.0/2.2));
      float lu = dot(a, vec3(0.2126,0.7152,0.0722));
      a += vec3(0.018, 0.004, -0.006) * (1.0 - lu) * (1.0 - lu) + vec3(0.03, 0.014, -0.012) * lu * lu;    // sombras y luces cálidas
      a = mix(a, a * vec3(0.62, 0.78, 1.25), night * 0.8);                                                 // noche: azulado
      a = mix(vec3(lu), a, 1.16); a = mix(a, a*a*(3.0-2.0*a), 0.2);
      vec2 d = c*vec2(0.5625,1.0); a *= 1.0 - vig*smoothstep(0.22,0.85,length(d)*1.6);
      a += (h(vUv*vec2(1080.,1920.) + fract(time*7.13)*91.7) - 0.5) * 0.022;
      a = mix(a, vec3(1.0), white);
      gl_FragColor = vec4(clamp(a,0.,1.), 1.0); }`,
  depthTest: false,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post), quadScene = new THREE.Scene(); quadScene.add(quad);
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const scene = new THREE.Scene();
const bgTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 910; const g = c.getContext('2d');
  const gr = g.createRadialGradient(256, 400, 30, 256, 455, 620); gr.addColorStop(0, '#6a2e26'); gr.addColorStop(0.55, '#3a1712'); gr.addColorStop(1, '#140806'); g.fillStyle = gr; g.fillRect(0, 0, 512, 910);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
scene.background = bgTex;
const cam = new THREE.PerspectiveCamera(30, W / H, 0.005, 200); cam.layers.enable(1);
const S = {}; window.S = S; window.cam = cam; window.SCN = scene;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const env = (t, t0, t1, fi = 0.3, fo = 0.3) => (t < t0 || t > t1 ? 0 : Math.min(eo(prog(t, t0, fi)), 1 - prog(t, t1 - fo, fo)));
const hash = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (draw) draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { c, g }; return t; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function rbox(w, h, d, m, r = 0.06) {   // caja de bordes redondeados que mide exactamente w × h × d
  const rz = Math.min(r, d * 0.45), b = Math.min(r * 0.9, rz, w * 0.45, h * 0.45);
  w -= 2 * b; h -= 2 * b; r = Math.max(0.0001, Math.min(r - b, w * 0.5, h * 0.5));
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.0005, d - 2 * rz), bevelEnabled: true, bevelSize: b, bevelThickness: rz, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -Math.max(0.0005, d - 2 * rz) / 2); const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
}
function label(txt, { size = 80, color = '#ffffff', w = 1.6, weight = 800, pill = false, font = 'Inter', bg = 'rgba(20,22,26,.82)' } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = `${weight} ${size}px ${font}`;
  const tw = g.measureText(txt).width; c.width = Math.ceil(tw + size * (pill ? 1.4 : 0.6)); c.height = Math.ceil(size * (pill ? 1.9 : 1.4));
  g.font = `${weight} ${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (pill) { g.fillStyle = bg; rr(g, 2, 2, c.width - 4, c.height - 4, c.height / 2 - 2); g.fill(); }
  g.fillStyle = color; g.fillText(txt, c.width / 2, c.height / 2 + size * 0.04);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / c.width), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 9; m.layers.set(1); return m;
}
const zones = {};
function zone(name, x) { const g = new THREE.Group(); g.position.set(x, 0, 0); scene.add(g); zones[name] = g; return g; }

// ---------------------------------------------------------------- tiempos (palabras de la voz)
let WORDS = [], END = 61.5;
const norm = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
function at(word, k = 1) { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if ((exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + word); return 1e9; }
let K = {};

// ---------------------------------------------------------------- materiales comunes
const plastic = (c, r = 0.22) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06 });
const metal = (c = 0xd8dde6, r = 0.18) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 1 });
const glowM = (c, i = 2.5) => new THREE.MeshStandardMaterial({ color: 0x050505, emissive: c, emissiveIntensity: i, roughness: 0.5 });
// el color de cada instancia también brilla un poco (bacterias, iones, cristales)
function instGlow(m, k = 0.35) { m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance += vColor.rgb * ${k.toFixed(3)};\n#endif`); }; m.customProgramCacheKey = () => 'ig' + k; return m; }

// ---------------------------------------------------------------- utilidades de cámara y animación
// cámara por fotogramas clave: [[t, [x,y,z] posición, [x,y,z] mira, fov?], …] en coordenadas de la zona.
// Interpolación cúbica monótona (Fritsch–Carlson) con los tiempos reales: suave y sin pasarse nunca de largo.
function mono(t, T, Y) {
  const n = T.length; if (t <= T[0]) return Y[0]; if (t >= T[n - 1]) return Y[n - 1];
  let i = 0; while (t > T[i + 1]) i++;
  const d = k => (Y[k + 1] - Y[k]) / (T[k + 1] - T[k]), hh = k => T[k + 1] - T[k];
  const m = k => { if (k <= 0 || k >= n - 1) return 0; const a = d(k - 1), b = d(k); if (a * b <= 0) return 0; const h0 = hh(k - 1), h1 = hh(k); return 3 * (h0 + h1) / ((2 * h1 + h0) / a + (h1 + 2 * h0) / b); };
  const h = hh(i), u = (t - T[i]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * Y[i] + (u3 - 2 * u2 + u) * h * m(i) + (-2 * u3 + 3 * u2) * Y[i + 1] + (u3 - u2) * h * m(i + 1);
}
function camKeys(t, KS, ox) {
  const T = KS.map(k => k[0]), comp = (j, c) => mono(t, T, KS.map(k => k[j][c]));
  return { p: v3(comp(1, 0) + ox, comp(1, 1), comp(1, 2)), l: v3(comp(2, 0) + ox, comp(2, 1), comp(2, 2)), f: mono(t, T, KS.map(k => k[3] || 30)) };
}
const keyed = (t, KS) => mono(t, KS.map(k => k[0]), KS.map(k => k[1]));     // valor escalar por claves
const sm5 = x => x * x * x * (x * (x * 6 - 15) + 10);
function sparks(Z, n = 80, color = 0xffe08a, size = 0.045) { const p = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)), new THREE.PointsMaterial({ color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); Z.add(p); p.userData.n = n; p.frustumCulled = false; return p; }
function burst(p, c, t, t0, spread = 1, life = 0.6, loop = true, grav = 3) {
  const a = p.geometry.attributes.position.array, n = p.userData.n;
  for (let i = 0; i < n; i++) { let tt = (t - t0) + hash(i) * life * (loop ? 1 : 0.15); tt = loop ? tt % life : Math.max(0, tt); const th = hash(i * 3) * Math.PI * 2, ph = (hash(i * 7) - 0.3) * 1.6, v = (1.2 + hash(i * 11) * 2.2) * spread;
    a[i * 3] = c.x + Math.cos(th) * Math.cos(ph) * v * tt; a[i * 3 + 1] = c.y + Math.sin(ph) * v * tt - grav * tt * tt; a[i * 3 + 2] = c.z + Math.sin(th) * Math.cos(ph) * v * tt; }
  p.geometry.attributes.position.needsUpdate = true;
}
function lookLab(l, k, pos) { l.visible = k > 0.01; l.material.opacity = k; l.position.copy(pos); l.lookAt(cam.position); }
function pill(txt, color = '#ffffff', bg = 'rgba(20,22,26,.86)', w = 1.4, size = 70) { return label(txt, { size, w, pill: true, color, bg }); }
const PAL = [0xffe14a, 0xff7ac8, 0x4fe3e8, 0x8ef07a, 0xb48cff, 0xffb347, 0x6aa8ff, 0x6ff0c0];
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler();
const UPV = v3(0, 1, 0);
// textura de estrella suave (destellos) y de disco desenfocado (motas de polvo)
const starTex = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(62, 4, 4, 120); g.fillRect(4, 62, 120, 4); });
const discTex = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 62); r.addColorStop(0, 'rgba(255,255,255,.55)'); r.addColorStop(0.75, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); });

// ---------------------------------------------------------------- geometrías orgánicas
function superEllipsoid(a, b, c, e1 = 0.4, e2 = 0.5, seg = 36) {     // caja redondeada «blanda» con muchos vértices (para deformarla)
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)), p = g.attributes.position, sp = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), v = Math.asin(clamp(y, -1, 1)), u = Math.atan2(z, x);
    p.setXYZ(i, a * sp(Math.cos(v), e1) * sp(Math.cos(u), e2), b * sp(Math.sin(v), e1), c * sp(Math.cos(v), e1) * sp(Math.sin(u), e2)); }
  g.computeVertexNormals(); return g;
}
function toothGeo(type, w, h, d) {     // diente con el borde libre abajo (y = -h/2)
  const g = superEllipsoid(w / 2, h / 2, d / 2, type === 'mol' || type === 'pre' ? 0.32 : 0.4, 0.55, 40), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const ty = (y + h / 2) / h;
    if (type === 'inc') { z *= lerp(0.55, 1, ty); x *= lerp(1.04, 0.86, ty); }
    if (type === 'can') { const k = clamp(1 - ty * 2.0); x *= 1 - 0.72 * k * k; z *= 1 - 0.45 * k; }
    if (type === 'pre' || type === 'mol') { if (ty < 0.22) y += 0.016 * Math.cos(x / w * Math.PI * (type === 'mol' ? 4 : 2)) * Math.cos(z / d * Math.PI * 2); x *= lerp(1, 0.9, ty); }
    p.setXYZ(i, x, y, z); }
  g.computeVertexNormals(); return g;
}

// ---------------------------------------------------------------- 0 · la boca: labios brillantes, dientes, lengua y bacterias de colores
const LIP = { A: 1.42, Bu: 1.05, Bl: 1.0 };
function lipCenter(th) {   // eje del rollo del labio. th: 0 comisura dcha., π/2 centro de arriba, π comisura izda., 3π/2 centro de abajo
  const up = Math.sin(th) >= 0, B = up ? LIP.Bu : LIP.Bl;
  let x = LIP.A * Math.cos(th), y = B * Math.sin(th);
  if (up) { const d = th - Math.PI / 2; y += -0.06 * Math.exp(-((d / 0.07) ** 2)) + 0.035 * (Math.exp(-(((d - 0.2) / 0.1) ** 2)) + Math.exp(-(((d + 0.2) / 0.1) ** 2))); }
  return v3(x, y, 0.06 + 0.16 * Math.abs(Math.sin(th)) ** 0.8);
}
function lipR(th) { const s = Math.abs(Math.sin(th)); return Math.sin(th) >= 0 ? 0.06 + 0.17 * s ** 0.8 : 0.06 + 0.22 * s ** 0.9; }
function lipGeo() {
  const NT = 300, NP = 40, pos = [], uv = [], idx = [];
  for (let i = 0; i <= NT; i++) { const th = i / NT * Math.PI * 2, C = lipCenter(th), B = Math.sin(th) >= 0 ? LIP.Bu : LIP.Bl, n = v3(B * Math.cos(th), LIP.A * Math.sin(th), 0).normalize(), r = lipR(th);
    for (let j = 0; j <= NP; j++) { const ph = j / NP * Math.PI * 2, a = r * 1.15 * Math.cos(ph), b = r * 0.95 * Math.sin(ph); pos.push(C.x + n.x * a, C.y + n.y * a, C.z + b); uv.push(i / NT * 48, j / NP); } }
  for (let i = 0; i < NT; i++) for (let j = 0; j < NP; j++) { const a = i * (NP + 1) + j, b = a + NP + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const k = (NT / 4) * (NP + 1) + NP / 4; if (g.attributes.normal.getZ(k) < 0) { const ix = g.index.array; for (let q = 0; q < ix.length; q += 3) { const tmp = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = tmp; } g.computeVertexNormals(); }
  return g;
}
function faceGeo() {         // piel alrededor de la boca: anillos desde el labio hacia fuera, abombada
  const NT = 220, NR = 46, pos = [], idx = [];
  for (let i = 0; i <= NT; i++) { const th = i / NT * Math.PI * 2, C = lipCenter(th);
    for (let j = 0; j <= NR; j++) { const s = j / NR, k = 1 + 9 * s * s, x = C.x * k, y = C.y * k * 1.05, e = Math.exp(-s * 6);
      const far = -0.02 - 0.055 * (x * x + 0.7 * y * y) / (1 + 0.025 * (x * x + y * y));
      pos.push(x, y, (C.z - 0.12) * e + far * (1 - e) + 0.1 * Math.exp(-((x / 1.9) ** 2 + (y / 1.6) ** 2)) * (1 - e)); } }
  for (let i = 0; i < NT; i++) for (let j = 0; j < NR; j++) { const a = i * (NR + 1) + j, b = a + NR + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  if (g.attributes.normal.getZ(5) < 0) { const ix = g.index.array; for (let q = 0; q < ix.length; q += 3) { const tmp = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = tmp; } g.computeVertexNormals(); }
  return g;
}
const ARCH = { up: { rx: 0.94, rz: 1.55, z0: -0.01, yg: 0.66 }, lo: { rx: 0.84, rz: 1.45, z0: -0.09, yg: -0.58 } };
const UPT = [['inc', 0.27, 0.44, 0.13], ['inc', 0.21, 0.38, 0.12], ['can', 0.22, 0.44, 0.15], ['pre', 0.2, 0.32, 0.2], ['pre', 0.2, 0.3, 0.2], ['mol', 0.28, 0.28, 0.26], ['mol', 0.27, 0.26, 0.25]];
const LOT = [['inc', 0.18, 0.34, 0.11], ['inc', 0.19, 0.34, 0.11], ['can', 0.21, 0.38, 0.14], ['pre', 0.2, 0.3, 0.19], ['pre', 0.2, 0.28, 0.2], ['mol', 0.29, 0.26, 0.26], ['mol', 0.28, 0.25, 0.25]];
function archAngle(A, s) { let a = 0, acc = 0; const da = 0.002; while (acc < s && a < 1.7) { acc += Math.hypot(A.rx * Math.cos(a), A.rz * Math.sin(a)) * da; a += da; } return a; }
function archPoint(A, s) { const sd = Math.sign(s) || 1, a = archAngle(A, Math.abs(s)), n = v3(sd * A.rz * Math.sin(a), 0, A.rx * Math.cos(a)).normalize(); return { p: v3(sd * A.rx * Math.sin(a), 0, A.z0 - A.rz * (1 - Math.cos(a))), n }; }
function buildMouth() {
  const Z = zone('mouth', 0);
  // piel, labios y cavidad
  const skinBump = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${hash(i) < 0.5 ? '40,40,40' : '200,200,200'},.25)`; g.beginPath(); g.arc(hash(i * 3.1) * w, hash(i * 5.7) * h, 0.6 + hash(i * 7.3) * 1.6, 0, 7); g.fill(); } });
  skinBump.colorSpace = THREE.NoColorSpace; skinBump.wrapS = skinBump.wrapT = THREE.RepeatWrapping; skinBump.repeat.set(6, 6);
  const face = new THREE.Mesh(faceGeo(), new THREE.MeshStandardMaterial({ color: 0x9a5444, roughness: 0.48, bumpMap: skinBump, bumpScale: 0.6 }));
  { const uv = []; const p = face.geometry.attributes.position; for (let i = 0; i < p.count; i++) uv.push(p.getX(i) * 0.25, p.getY(i) * 0.25); face.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); }
  face.receiveShadow = true; Z.add(face);
  const lipBump = canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 11; i++) { const x = (i + 0.3 * hash(i)) / 11 * w; const gr = g.createLinearGradient(x - 9, 0, x + 9, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(20,20,20,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - 9, 0, 18, h); } });
  lipBump.colorSpace = THREE.NoColorSpace; lipBump.wrapS = lipBump.wrapT = THREE.RepeatWrapping;
  S.lipM = new THREE.MeshPhysicalMaterial({ color: 0xe0303f, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, bumpMap: lipBump, bumpScale: 1.2 });
  const lips = new THREE.Mesh(lipGeo(), S.lipM); lips.castShadow = true; lips.receiveShadow = true; Z.add(lips);
  const cav = new THREE.SphereGeometry(1, 56, 36), col = []; for (let i = 0; i < cav.attributes.position.count; i++) { const k = Math.pow((cav.attributes.position.getZ(i) + 1) / 2, 1.6); _c.setRGB(lerp(0.07, 0.42, k), lerp(0.006, 0.05, k), lerp(0.01, 0.07, k)); col.push(_c.r, _c.g, _c.b); }
  cav.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const cavity = new THREE.Mesh(cav, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.BackSide })); cavity.scale.set(1.3, 1.0, 1.9); cavity.position.set(0, -0.03, -1.65); cavity.receiveShadow = true; Z.add(cavity);
  // lengua con papilas
  const tTex = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#de6474'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4200; i++) { g.fillStyle = hash(i * 1.3) < 0.82 ? 'rgba(250,170,180,.85)' : 'rgba(190,60,78,.8)'; g.beginPath(); g.arc(hash(i * 2.7) * w, hash(i * 4.1) * h, 2 + hash(i * 6.3) * 4, 0, 7); g.fill(); } });
  const tg = new THREE.SphereGeometry(1, 72, 48), tp = tg.attributes.position; for (let i = 0; i < tp.count; i++) { let x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i); if (y > 0) { y *= 0.78; y -= 0.16 * Math.exp(-((x / 0.18) ** 2)) * y; } tp.setXYZ(i, x, y, z); } tg.computeVertexNormals();
  const tongue = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: tTex, bumpMap: tTex, bumpScale: 1.5, roughness: 0.36 })); tongue.scale.set(0.68, 0.32, 0.98); tongue.position.set(0, -0.37, -0.8); tongue.receiveShadow = true; Z.add(tongue); S.tongue = tongue;
  // dientes, encías y papilas entre dientes
  S.toothM = new THREE.MeshPhysicalMaterial({ color: 0xf4f1ea, roughness: 0.2, clearcoat: 0.75, clearcoatRoughness: 0.1 });
  const gumM = new THREE.MeshPhysicalMaterial({ color: 0xe0505f, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.1 });
  S.teeth = []; S.toothPts = [];
  for (const [A, T, upper] of [[ARCH.up, UPT, true], [ARCH.lo, LOT, false]]) {
    for (const sd of [1, -1]) { let s = 0.003;
      T.forEach(([type, w, h, d], k) => { const sc = s + w / 2; s += w + 0.006; const ap = archPoint(A, sd * sc), geo = toothGeo(type, w, h, d);
        const m = new THREE.Mesh(geo, S.toothM); m.castShadow = true; m.receiveShadow = true;
        m.position.set(ap.p.x, upper ? A.yg - 0.04 - h / 2 : A.yg + 0.04 + h / 2, ap.p.z); m.rotation.set(0, Math.atan2(ap.n.x, ap.n.z), upper ? 0 : Math.PI); Z.add(m);
        const coatM = new THREE.MeshStandardMaterial({ color: 0xc8f7ff, transparent: true, opacity: 0, roughness: 0.05, emissive: 0x38d6ff, emissiveIntensity: 0, depthWrite: false });
        const coat = new THREE.Mesh(geo, coatM); coat.position.copy(m.position); coat.rotation.copy(m.rotation); coat.scale.setScalar(1.045); coat.renderOrder = 3; Z.add(coat);
        m.updateMatrix(); const front = k < 3;
        for (let q = 0; q < (front ? 10 : 4); q++) { const lp = v3((hash(q * 3 + k + (upper ? 0 : 50) + (sd > 0 ? 0 : 100)) - 0.5) * w * 0.75, (hash(q * 7 + k * 3 + (upper ? 1 : 2)) - 0.5) * h * 0.82, d / 2 * 0.97); lp.applyMatrix4(m.matrix);
          const nn = v3(0, 0, 1).applyEuler(m.rotation); S.toothPts.push({ p: lp, n: nn, front, upper, x: lp.x }); }
        S.teeth.push({ m, coat, coatM, x: ap.p.x, upper, front, k });
      });
    }
    // encía: tubo a lo largo de la arcada + papilas
    const L = [...T].reduce((a, q) => a + q[1] + 0.006, 0), pts = [];
    for (let i = 0; i <= 60; i++) { const s = (i / 60 * 2 - 1) * L, ap = archPoint(A, s); pts.push(ap.p.clone().add(ap.n.clone().multiplyScalar(0.025)).setY(A.yg)); }
    const gum = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.09, 12), gumM); gum.castShadow = true; gum.receiveShadow = true; Z.add(gum);
    const cone = new THREE.ConeGeometry(0.048, 0.12, 14);
    for (const sd of [1, -1]) { let s = 0.003; T.forEach(([, w], k) => { const b = (k === 0 && sd < 0) ? null : s; s += w + 0.006; if (b === null) return; const ap = archPoint(A, sd * Math.max(0.0001, b));
      const c = new THREE.Mesh(cone, gumM); c.position.copy(ap.p.add(ap.n.multiplyScalar(0.05))).setY(upper ? A.yg - 0.085 : A.yg + 0.085); c.rotation.z = upper ? Math.PI : 0; Z.add(c); }); }
  }
  buildBacteria(Z); buildBrush(Z); buildFluor(Z); buildRinse(Z); buildProps(Z);
  // luces
  const key = new THREE.SpotLight(0xfff0e4, 75, 40, 0.42, 0.65, 1.4); key.position.set(1.6, 4.6, 9.5); key.target.position.set(0, 0, -0.3); key.castShadow = true; key.shadow.mapSize.set(1536, 1536); key.shadow.bias = -0.0002; key.shadow.radius = 4; Z.add(key); Z.add(key.target); S.key = key;
  const fill = new THREE.PointLight(0xffd6c8, 6, 24, 1.4); fill.position.set(-3.5, 0.5, 6.5); Z.add(fill); S.fill = fill;
  const inner = new THREE.PointLight(0xffb0a0, 2.2, 4, 1.5); inner.position.set(0, 0.05, 1.2); Z.add(inner); S.inner = inner;
  const rim = new THREE.PointLight(0xffc4ea, 4, 14, 1.5); rim.position.set(2.5, 3.5, -1.0); Z.add(rim);
  S.moonL = new THREE.DirectionalLight(0x8aa8ff, 0); S.moonL.position.set(-3, 5, 6); Z.add(S.moonL);
}

// ---------------------------------------------------------------- bacterias de colores (bastones, cadenas, espirales, diplococos, racimos) con flagelos
const BAC = [];
function buildBacteria(Z) {
  const mat = () => instGlow(new THREE.MeshPhysicalMaterial({ roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.12 }), 0.34);
  const mk = (geo, n) => { const m = new THREE.InstancedMesh(geo, mat(), n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = false; Z.add(m); m.count = 0; m.userData.cap = n; return m; };
  S.rodM = mk(new THREE.CapsuleGeometry(0.032, 0.12, 6, 14), 150);
  S.cocM = mk(new THREE.SphereGeometry(0.03, 16, 12), 560);
  const hp = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2 * 4; hp.push(v3(Math.cos(a) * 0.026, (i / 96 - 0.5) * 0.22, Math.sin(a) * 0.026)); }
  S.spiM = mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 180, 0.0085, 6), 50);
  const fp = []; for (let i = 0; i <= 40; i++) { const y = i / 40 * 0.16; fp.push(v3(Math.sin(y * 70) * 0.012 * (y / 0.16), y, Math.cos(y * 70) * 0.006 * (y / 0.16))); }
  S.flaM = mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fp), 60, 0.0035, 5), 60);
  // reparto: dentro de la boca, fuera flotando y sobre los dientes de delante (para el plano macro)
  const place = i => { const r = hash(i * 1.37);
    if (r < 0.12) return { p: v3((hash(i * 2.1) - 0.5) * 0.85, -0.3 + hash(i * 3.3) * 0.36, -0.4 + hash(i * 4.4) * 0.5), teeth: true };
    if (r < 0.7) { const a = hash(i * 5.1) * Math.PI * 2, rr = Math.sqrt(hash(i * 6.2)); return { p: v3(Math.cos(a) * rr * 0.88, Math.sin(a) * rr * 0.42 + 0.03, -1.15 + hash(i * 7.7) * 1.4) }; }
    let p; do { p = v3((hash(i * 8.3) - 0.5) * 4.2, (hash(i * 9.9) - 0.5) * 6.0, 0.35 + hash(i * 10.7) * 1.3); i += 0.137; } while (Math.abs(p.x) < 1.6 && Math.abs(p.y) < 1.05); return { p }; };
  let id = 0; const add = (kind, n, extra = {}) => { const pl = place(id); BAC.push({ kind, n, base: pl.p, teeth: !!pl.teeth, ph: hash(id * 3.7) * 6.28, spin: v3(hash(id * 1.1) - 0.5, hash(id * 2.2) - 0.5, hash(id * 3.3) - 0.5).normalize(), ax: v3(hash(id * 4.1) - 0.5, hash(id * 5.2) - 0.5, hash(id * 6.3) - 0.5).normalize(), col: PAL[Math.floor(hash(id * 7.9) * PAL.length)], th: hash(id * 9.31), id, ...extra }); id++; };
  for (let i = 0; i < 58; i++) add('rod', 1, { fla: hash(i * 2.9) < 0.6 });
  for (let i = 0; i < 26; i++) add('rodch', 2 + Math.floor(hash(i * 3.9) * 2));
  for (let i = 0; i < 72; i++) add('chain', 3 + Math.floor(hash(i * 4.9) * 6));
  for (let i = 0; i < 30; i++) add('diplo', 2);
  for (let i = 0; i < 16; i++) add('clus', 5);
  for (let i = 0; i < 46; i++) add('spi', 1);
  // la interrogación: puntos a lo largo de un «?» delante de la boca
  const Q = [], arc = []; for (let i = 0; i <= 60; i++) { const a = lerp(2.75, -0.75, i / 60); arc.push(v3(0.56 * Math.cos(a), 0.78 + 0.56 * Math.sin(a), 1.0)); }
  const e = arc[arc.length - 1]; for (let i = 1; i <= 24; i++) { const k = i / 24; arc.push(v3(lerp(e.x, 0, sm5(k)), lerp(e.y, -0.12, k), 1.0)); }
  for (let i = 1; i <= 10; i++) arc.push(v3(0, -0.12 - i * 0.03, 1.0));
  let len = 0; const cum = [0]; for (let i = 1; i < arc.length; i++) { len += arc[i].distanceTo(arc[i - 1]); cum.push(len); }
  const NQ = 104; for (let k = 0; k < NQ; k++) { const s = k / (NQ - 1) * len; let i = 0; while (i < cum.length - 2 && cum[i + 1] < s) i++; const u = (s - cum[i]) / (cum[i + 1] - cum[i] || 1); const p = arc[i].clone().lerp(arc[i + 1], u), tg = arc[Math.min(arc.length - 1, i + 1)].clone().sub(arc[i]).normalize(); Q.push({ p, tg }); }
  for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28, r = 0.03 + 0.06 * hash(k * 1.7); Q.push({ p: v3(Math.cos(a) * r * 1.3, -0.82 + Math.sin(a) * r * 1.3, 1.0), tg: v3(Math.cos(a), Math.sin(a), 0) }); }
  S.Q = Q;
}
// fondo de cuántas bacterias hay en cada momento (0..1) y cómo se mueven
function bacteriaAt(t) {
  const pop = keyed(t, [[0, 1], [0.35, 1], [1.7, 0.25], [3.25, 0.25], [3.75, 0.92], [7.45, 0.92], [8.7, 0.14], [14.5, 0.14], [31, 0.14], [37.2, 0.14], [39.9, 0.62], [40.6, 0.62], [41.3, 0.14], [50.6, 0.14], [52.2, 0.5], [57.9, 0.5], [59.3, 1], [END + 1, 1]]);
  const dance = env(t, K.estropeas - 0.1, K.sabes - 0.1, 0.25, 0.4), q = env(t, K.sabes - 0.25, K.terminar + 0.25, 0.42, 0.4), repel = env(t, K.protege - 0.4, K.cuentame + 0.2, 0.5, 0.5);
  const counts = { rod: 0, coc: 0, spi: 0, fla: 0 }; let qi = 0;
  for (const b of BAC) {
    let vis = clamp((pop - b.th) / 0.07 + 0.5);
    if (b.teeth && t < K.estropeas) vis = Math.max(0, 1 - prog(t, 0.55 + (b.base.x + 0.5) * 0.8, 0.35));     // el cepillo las barre al pasar
    const amp = 1 + 1.8 * dance, fr = 1 + 1.2 * dance, w = b.ph;
    const P = b.base.clone().add(v3(0.05 * Math.sin(t * 0.9 * fr + w) * amp, 0.04 * Math.sin(t * 1.1 * fr + 2 * w) * amp, 0.03 * Math.sin(t * 0.7 * fr + 3 * w) * amp));
    _q.setFromAxisAngle(b.spin, t * (0.5 + 0.6 * dance) + w); const ax = b.ax.clone().applyQuaternion(_q);
    if (q > 0.001) { if (b.th < 0.92 && qi < S.Q.length && b.kind !== 'clus') { const Qp = S.Q[qi++]; P.lerp(Qp.p.clone().add(v3(0, 0, 0.02 * Math.sin(t * 6 + w))), sm5(q)); ax.lerp(Qp.tg, q).normalize(); } else vis *= 1 - q; }
    if (repel > 0.001) { const d = P.clone().sub(v3(0, 0.05, -0.3)); const L = d.length(); if (L < 1.6) P.add(d.multiplyScalar((1.6 - L) / L * 0.55 * repel)); }
    // al desaparecer salen volando hacia fuera de la boca
    const out = v3(P.x * 1.4, P.y * 1.2 + 0.2, 1.2).normalize().multiplyScalar(3.2 * (1 - sm5(vis)));
    P.add(out); const near = clamp((P.distanceTo(cam.position) - 0.25) / 0.35), sc = (0.4 + 0.6 * vis) * near; if (near < 0.01) continue;
    if (vis < 0.002) continue;
    _q2.setFromUnitVectors(UPV, ax); _c.setHex(b.col);
    const put = (M, key, pos, s = sc) => { if (counts[key] >= M.userData.cap) return; _s.setScalar(s); _m4.compose(pos, _q2, _s); M.setMatrixAt(counts[key], _m4); M.setColorAt(counts[key], _c); counts[key]++; };
    if (b.kind === 'rod') { put(S.rodM, 'rod', P); if (b.fla) put(S.flaM, 'fla', P.clone().add(ax.clone().multiplyScalar(0.09 * sc))); }
    else if (b.kind === 'rodch') { for (let k = 0; k < b.n; k++) put(S.rodM, 'rod', P.clone().add(ax.clone().multiplyScalar((k - (b.n - 1) / 2) * 0.2 * sc))); }
    else if (b.kind === 'spi') put(S.spiM, 'spi', P);
    else if (b.kind === 'chain') { for (let k = 0; k < b.n; k++) { const off = (k - (b.n - 1) / 2) * 0.058 * sc, bend = 0.02 * Math.sin(k * 0.9 + t * 2 + w) * sc; put(S.cocM, 'coc', P.clone().add(ax.clone().multiplyScalar(off)).add(v3(bend, 0, bend * 0.5))); } }
    else if (b.kind === 'diplo') { for (let k = 0; k < 2; k++) put(S.cocM, 'coc', P.clone().add(ax.clone().multiplyScalar((k - 0.5) * 0.056 * sc))); }
    else if (b.kind === 'clus') { for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28 + w; put(S.cocM, 'coc', P.clone().add(v3(Math.cos(a) * 0.04, Math.sin(a) * 0.04, (k % 2 ? 0.02 : -0.02)).multiplyScalar(sc))); } }
  }
  for (const [M, key] of [[S.rodM, 'rod'], [S.cocM, 'coc'], [S.spiM, 'spi'], [S.flaM, 'fla']]) { M.count = counts[key]; M.instanceMatrix.needsUpdate = true; if (M.instanceColor) M.instanceColor.needsUpdate = true; }
}

// ---------------------------------------------------------------- cepillo con cerdas de colores y espuma
function buildBrush(Z) {
  const g = new THREE.Group(); Z.add(g); S.brush = g;
  const head = rbox(0.56, 0.17, 0.05, plastic(0xf4f6fa, 0.25), 0.03); g.add(head);
  const neck = rbox(0.5, 0.09, 0.05, plastic(0x2fbfb8, 0.25), 0.025); neck.position.set(0.5, 0, 0.01); g.add(neck);
  const handle = rbox(1.6, 0.15, 0.08, plastic(0x2fbfb8, 0.25), 0.05); handle.position.set(1.5, 0.0, 0.03); handle.rotation.z = 0.04; g.add(handle);
  const grip = rbox(0.8, 0.1, 0.085, plastic(0xf4f6fa, 0.4), 0.04); grip.position.set(1.45, 0.0, 0.035); g.add(grip);
  const tufts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.13, 8), new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.6 }), 27);
  let n = 0; for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) { _q.setFromAxisAngle(v3(1, 0, 0), Math.PI / 2); _s.set(1, 1 + 0.06 * Math.sin(c * 1.7 + r), 1); _m4.compose(v3(-0.24 + c * 0.06, -0.05 + r * 0.05, -0.09), _q, _s); tufts.setMatrixAt(n, _m4); tufts.setColorAt(n, _c.setHex((c + r) % 3 === 0 ? 0x35c9c1 : 0xffffff)); n++; }
  g.add(tufts);
  S.foam = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.92 }), 230); S.foam.frustumCulled = false; Z.add(S.foam);
}
function brushPos(t) {   // el cepillo frota los dientes de delante (gancho) y otra vez antes de dormir
  const hook = env(t, -1, K.ultimo + 0.75, 0.01, 0.55), night = env(t, K.importa - 0.6, K.dormir + 0.3, 0.35, 0.35), k = Math.max(hook, night);
  const x = 0.12 + 0.2 * Math.sin(t * 2 * Math.PI * 3.2), y = 0.4 + 0.035 * Math.sin(t * 2 * Math.PI * 6.4);
  return v3(lerp(3.6, x, sm5(k)), lerp(0.9, y - 0.02, sm5(k)), 0.2);
}
function brushAt(t) {
  const p = brushPos(t); S.brush.position.copy(p); S.brush.rotation.set(-0.75 + 0.05 * Math.sin(t * 20), 0, 0.06 * Math.sin(t * 2 * Math.PI * 3.2));
  S.brush.visible = p.x < 3.3;
  // espuma: crece al frotar; al terminar queda una capa fina (se encoge); la de «escupe» sale volando
  const grow = prog(t, 0.6, 0.8) * (1 - prog(t, K.ultimo + 0.4, 0.8)), spit = env(t, K.escupe - 0.35, K.escupe + 1.0, 0.2, 0.2), night = env(t, K.importa - 0.3, K.dormir + 0.5, 0.4, 0.4);
  let n = 0; const fly = prog(t, K.escupe - 0.05, 0.9);
  S.toothPts.forEach((tp, i) => { if (!tp.front || n >= 150) return; const r = 0.012 + 0.03 * hash(i * 3.3), g = Math.max(grow * (tp.upper ? 1 : 0.7), night * 0.8); if (g < 0.01) return;
    _s.setScalar(r * g); _m4.compose(tp.p.clone().addScaledVector(tp.n, r * 0.6), _q.identity(), _s); S.foam.setMatrixAt(n++, _m4); });
  for (let i = 0; i < 80; i++) { const a = hash(i * 2.1) * 6.28, rr = hash(i * 3.7), r = 0.015 + 0.035 * hash(i * 5.1);
    if (grow > 0.01 || night > 0.01) { const g = Math.max(grow, night); _s.setScalar(r * g); _m4.compose(p.clone().add(v3(Math.cos(a) * 0.28 * rr, Math.sin(a) * 0.09 * rr - 0.02, -0.16 + 0.04 * hash(i))), _q.identity(), _s); S.foam.setMatrixAt(n++, _m4); }
    else if (spit > 0.01) { const o = v3((hash(i) - 0.5) * 0.35, -0.25 + (hash(i * 7) - 0.5) * 0.18, 0.25), v = v3((hash(i * 11) - 0.5) * 1.2, -2.6 - hash(i * 13), 2.2 + hash(i * 17)); _s.setScalar(r * 1.4 * spit); _m4.compose(o.add(v.multiplyScalar(fly)).add(v3(0, -2.5 * fly * fly, 0)), _q.identity(), _s); S.foam.setMatrixAt(n++, _m4); } }
  S.foam.count = n; S.foam.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- flúor: capa brillante sobre los dientes, iones y destellos
function buildFluor(Z) {
  S.ions = new THREE.InstancedMesh(new THREE.SphereGeometry(0.013, 10, 8), instGlow(new THREE.MeshStandardMaterial({ roughness: 0.3 }), 1.0), 200); S.ions.frustumCulled = false; Z.add(S.ions);
  const sp = new Float32Array(120 * 3), sc = new Float32Array(120 * 3); S.sparkG = new THREE.BufferGeometry(); S.sparkG.setAttribute('position', new THREE.BufferAttribute(sp, 3)); S.sparkG.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  S.spark = new THREE.Points(S.sparkG, new THREE.PointsMaterial({ map: starTex, size: 0.09, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); S.spark.frustumCulled = false; Z.add(S.spark);
  S.shards = sparks(Z, 160, 0xbff4ff, 0.03);
}
function fluorAt(t) {
  // intensidad de la capa de flúor en cada momento
  const coat = keyed(t, [[0, 0], [0.9, 0], [K.perfecto, 0.75], [K.estropeas - 0.05, 0.75], [K.estropeas + 0.25, 0], [K.capa - 0.1, 0], [K.finisima + 0.3, 0.55], [K.fluor1, 0.6], [K.concentrado, 1], [K.pero1, 1],
    [K.lleva, 1], [K.fluor4 + 0.5, 0.08], [K.escupe - 0.5, 0.08], [K.escupe, 1], [K.colutorio, 0.85], [K.importa, 0.9], [K.protege, 1.35], [K.cuentame, 0.5], [END - 0.6, 0], [END + 1, 0]]);
  const sweep = t > K.capa - 0.4 && t < K.capa + 1.5;
  S.teeth.forEach(T => { const d = sweep ? (T.x + 1) * 0.35 : 0, c = sweep ? clamp((t - K.capa + 0.1 - d * 1.2) / 0.5) * coat : coat;
    T.coatM.opacity = 0.32 * Math.min(1, c); T.coatM.emissiveIntensity = 0.55 * c * (0.85 + 0.15 * Math.sin(t * 5 + T.x * 4)); T.coat.visible = c > 0.005; });
  // iones: flotan pegados a la superficie; con «sigue trabajando» se meten en el diente
  const into = prog(t, K.sigue - 0.1, 0.9), wash = prog(t, K.agua2, 2.2) * (1 - prog(t, K.escupe - 0.4, 0.4));
  let n = 0; S.toothPts.forEach((tp, i) => { if (n >= 200) return; const k = clamp(coat * 1.2 - hash(i * 2.3) * 0.3); if (k < 0.02) return;
    const off = (0.03 + 0.07 * hash(i * 5.5)) * (1 - into * (tp.front ? 1 : 0.4)), dr = v3(Math.sin(t * 1.3 + i) * 0.01, Math.sin(t * 1.7 + i * 2) * 0.01, 0);
    const p = tp.p.clone().addScaledVector(tp.n, off).add(dr);
    if (wash > 0) { p.add(v3(1.6 * wash + 0.3 * Math.sin(i), -1.2 * wash * wash - 0.4 * hash(i) * wash, 0.8 * wash)); }
    _s.setScalar(k * (1 - 0.4 * into)); _m4.compose(p, _q.identity(), _s); S.ions.setMatrixAt(n, _m4); S.ions.setColorAt(n, _c.setRGB(0.5, 2.0, 2.6)); n++; });
  S.ions.count = n; S.ions.instanceMatrix.needsUpdate = true; if (S.ions.instanceColor) S.ions.instanceColor.needsUpdate = true;
  // destellos
  const pa = S.sparkG.attributes.position.array, ca = S.sparkG.attributes.color.array, sk = Math.max(env(t, K.perfecto - 0.1, K.estropeas, 0.15, 0.2) * 1.2, coat * 0.5);
  for (let i = 0; i < 120; i++) { const tp = S.toothPts[(i * 7) % S.toothPts.length]; pa[i * 3] = tp.p.x + tp.n.x * 0.02; pa[i * 3 + 1] = tp.p.y; pa[i * 3 + 2] = tp.p.z + tp.n.z * 0.02;
    const tw = Math.max(0, Math.sin(t * (4 + 3 * hash(i)) + i * 2.3)) ** 6 * sk; ca[i * 3] = tw; ca[i * 3 + 1] = tw; ca[i * 3 + 2] = tw; }
  S.sparkG.attributes.position.needsUpdate = true; S.sparkG.attributes.color.needsUpdate = true;
  // al estropearlo, la capa se rompe en esquirlas
  burst(S.shards, v3(0.05, 0.2, 0.2), t, K.estropeas, 0.9, 0.9, false, 1.5); S.shards.material.opacity = env(t, K.estropeas, K.estropeas + 0.9, 0.05, 0.5); S.shards.visible = S.shards.material.opacity > 0.01;
  return coat;
}

// ---------------------------------------------------------------- enjuague: vaso, chorro, ola dentro de la boca y burbujas
function buildRinse(Z) {
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xdff4ff, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const prof = [v3(0, 0, 0), v3(0.26, 0, 0), v3(0.27, 0.02, 0), v3(0.33, 0.78, 0), v3(0.31, 0.78, 0), v3(0.25, 0.04, 0), v3(0, 0.04, 0)].map(p => new THREE.Vector2(p.x, p.y));
  S.glass = new THREE.Group(); Z.add(S.glass); const gl = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), glassM); gl.position.y = -0.39; S.glass.add(gl); gl.renderOrder = 4;
  S.waterM = new THREE.MeshPhysicalMaterial({ color: 0x6fd2ff, roughness: 0.03, clearcoat: 1, transparent: true, opacity: 0.55, emissive: 0x0d4f7e, emissiveIntensity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const inGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.5, 40), S.waterM); inGlass.position.y = -0.1; S.glass.add(inGlass); S.inGlass = inGlass;
  S.stream = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(0, 0, 0), v3(0, -1, 0)]), 8, 0.05, 8), S.waterM); Z.add(S.stream); S.stream.renderOrder = 5;
  S.wave = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.5, 70, 30), S.waterM); S.wave.frustumCulled = false; S.wave.renderOrder = 5; Z.add(S.wave); S.waveBase = S.wave.geometry.attributes.position.array.slice();
  S.bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xe8fbff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.5, depthWrite: false }), 90); S.bub.frustumCulled = false; Z.add(S.bub);
  S.splash = sparks(Z, 140, 0x9fe4ff, 0.035);
  // «no»: aspa roja sobre el vaso
  S.noX = new THREE.Group(); Z.add(S.noX); const xm = glowM(0xff3048, 3.2); for (const s of [-1, 1]) { const b = rbox(0.75, 0.1, 0.06, xm, 0.05); b.rotation.z = s * Math.PI / 4; S.noX.add(b); }
}
function rinseAt(t) {
  // vaso: entra por arriba al oír «te enjuagas», se inclina y vierte; con «no te enjuagues» aparece, se inclina un poco y lo tacha un aspa
  const g1 = env(t, K.enjuagas1 - 0.55, K.lleva, 0.4, 0.45), g2 = env(t, K.enjuagues - 0.75, K.colutorio + 0.2, 0.35, 0.35), gk = Math.max(g1, g2);
  const tilt1 = eio(prog(t, K.enjuagas1 - 0.2, 0.45)), tilt2 = 0.45 * eio(prog(t, K.enjuagues - 0.4, 0.3)) * (1 - eio(prog(t, K.enjuagues + 0.35, 0.3)));
  S.glass.visible = gk > 0.01; S.glass.position.set(g2 > g1 ? 0.6 : 0.35, lerp(3.4, 1.55, sm5(gk)), 0.75); S.glass.rotation.z = g2 > g1 ? tilt2 * 1.4 : tilt1 * 1.75;
  S.inGlass.scale.y = g2 > g1 ? 1 : 1 - 0.85 * prog(t, K.enjuagas1, 0.7);
  const pour = env(t, K.enjuagas1, K.agua2 + 0.35, 0.12, 0.25); S.stream.visible = pour > 0.01;
  if (pour > 0.01) { const gp = S.glass.position, rim = v3(gp.x - 0.33, gp.y + 0.2, gp.z); S.stream.geometry.dispose(); S.stream.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([rim, v3(rim.x - 0.15, rim.y - 0.25, rim.z), v3(0.1, 0.35, 0.45), v3(0.0, -0.1, 0.0)]), 40, 0.045 * pour + 0.005, 10); }
  S.noX.visible = g2 > 0.01; S.noX.position.set(0.6, lerp(3.4, 1.55, sm5(g2)), 1.0); S.noX.scale.setScalar(Math.max(0.01, eo(prog(t, K.enjuagues - 0.05, 0.25)))); S.noX.visible = t > K.enjuagues - 0.05 && g2 > 0.01;
  // ola: sube dentro de la boca, va y viene y baja (se lleva el flúor)
  const lvl = env(t, K.agua1 - 0.15, K.queda2 + 0.45, 0.35, 0.6); S.wave.visible = lvl > 0.01;
  if (lvl > 0.01) { const a = S.wave.geometry.attributes.position.array, b = S.waveBase, top = lerp(-0.75, 0.32, lvl);
    for (let i = 0; i < a.length; i += 3) { const u = (b[i] / 2.5) + 0.5, v = (b[i + 1] / 1.5) + 0.5, x = (u - 0.5) * 2.2, slosh = 0.18 * Math.sin(t * 5.2) * x;
      const yTop = top + slosh + 0.05 * Math.sin(x * 7 - t * 9) + 0.03 * Math.sin(x * 13 + t * 6);
      a[i] = x; a[i + 1] = lerp(-0.8, yTop, v); a[i + 2] = -0.25 - 0.55 * x * x + 0.04 * Math.sin(x * 5 + t * 7) * v; }
    S.wave.geometry.attributes.position.needsUpdate = true; S.wave.geometry.computeVertexNormals(); }
  let n = 0; if (lvl > 0.01) for (let i = 0; i < 90; i++) { const x = (hash(i * 1.3) - 0.5) * 1.8, life = (t * (0.4 + 0.4 * hash(i)) + hash(i * 3)) % 1, y = lerp(-0.7, 0.3 * lvl, life), r = 0.008 + 0.022 * hash(i * 5); _s.setScalar(r * lvl); _m4.compose(v3(x + 0.05 * Math.sin(t * 3 + i), y, -0.2 - 0.5 * x * x), _q.identity(), _s); S.bub.setMatrixAt(n++, _m4); }
  S.bub.count = n; S.bub.instanceMatrix.needsUpdate = true;
  burst(S.splash, v3(0.05, 0.05, 0.2), t, K.agua1 - 0.05, 1.0, 0.7, false, 3); S.splash.material.opacity = env(t, K.agua1 - 0.05, K.agua1 + 0.8, 0.05, 0.4); S.splash.visible = S.splash.material.opacity > 0.01;
}

// ---------------------------------------------------------------- escudo de flúor (teselas hexagonales), colutorio, reloj, plato, temporizador, galleta, zumo, luna, gota, bocadillo
function buildProps(Z) {
  // escudo: teselas hexagonales sobre un cilindro delante de los dientes
  S.hex = new THREE.InstancedMesh(new THREE.RingGeometry(0.068, 0.082, 6), new THREE.MeshBasicMaterial({ color: 0x9ff4ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), 260); S.hex.frustumCulled = false; Z.add(S.hex);
  S.hexP = []; for (let r = 0; r < 10; r++) for (let c = 0; c < 26; c++) { const a = (c - 12.5 + (r % 2) * 0.5) * 0.085, y = -0.48 + r * 0.115; S.hexP.push({ p: v3(Math.sin(a) * 1.62, y, -1.52 + Math.cos(a) * 1.62 + 0.06), a, r, c }); }
  // colutorio (genérico, sin marca), reloj y plato con cubiertos
  S.bottle = new THREE.Group(); Z.add(S.bottle);
  const bp = [[0, 0], [0.22, 0], [0.25, 0.04], [0.26, 0.55], [0.2, 0.7], [0.1, 0.78], [0.1, 0.86], [0, 0.86]].map(([x, y]) => new THREE.Vector2(x, y));
  const bot = new THREE.Mesh(new THREE.LatheGeometry(bp, 48), new THREE.MeshPhysicalMaterial({ color: 0x5fd6c4, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.6, emissive: 0x0f5a50, emissiveIntensity: 0.4 })); S.bottle.add(bot);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 32), plastic(0xf4f6fa)); cap.position.y = 0.92; S.bottle.add(cap);
  const lab = label('COLUTORIO', { size: 70, w: 0.42, pill: true, color: '#0f3b36', bg: 'rgba(240,255,252,.95)' }); lab.position.set(0, 0.32, 0.27); lab.layers.set(0); S.bottle.add(lab);
  S.clock = new THREE.Group(); Z.add(S.clock);
  const cf = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 48), plastic(0xff6a7a, 0.25)); cf.rotation.x = Math.PI / 2; S.clock.add(cf);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.29, 48), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fffaf2'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a2a2a'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.save(); g.translate(128, 128); g.rotate(a); g.fillRect(-4, -118, 8, i % 3 ? 16 : 28); g.restore(); } }) }));
  face.position.z = 0.031; S.clock.add(face);
  S.hourH = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.01), new THREE.MeshStandardMaterial({ color: 0x2a1c1c })); S.hourH.geometry.translate(0, 0.07, 0); S.hourH.position.z = 0.04; S.clock.add(S.hourH);
  S.minH = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.24, 0.01), new THREE.MeshStandardMaterial({ color: 0x2a1c1c })); S.minH.geometry.translate(0, 0.11, 0); S.minH.position.z = 0.045; S.clock.add(S.minH);
  S.plate = new THREE.Group(); Z.add(S.plate);
  const pp = [[0, 0], [0.28, 0], [0.33, 0.03], [0.42, 0.07], [0.43, 0.08], [0.33, 0.05], [0, 0.04]].map(([x, y]) => new THREE.Vector2(x, y));
  const pl = new THREE.Mesh(new THREE.LatheGeometry(pp, 48), plastic(0xfcfcfc, 0.15)); pl.rotation.x = 1.1; S.plate.add(pl);
  for (const [x, w] of [[-0.55, 0.05], [0.55, 0.06]]) { const c = rbox(w, 0.6, 0.02, metal(0xdfe3ea, 0.15), 0.01); c.position.set(x, 0, 0); S.plate.add(c); }
  const food = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), plastic(0xffb347, 0.4)); food.scale.set(1.2, 0.45, 1); food.position.set(0, 0.06, 0.05); food.rotation.x = 1.1; S.plate.add(food);
  // temporizador de media hora alrededor de la boca, galleta y zumo que rebotan
  S.ring = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.035, 12, 160), glowM(0x7fe8ff, 2.6)); Z.add(S.ring);
  S.ringBg = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.02, 8, 160), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })); Z.add(S.ringBg);
  S.min30 = label('30 MIN', { size: 120, w: 0.95, color: '#ffffff', weight: 900, pill: true, bg: 'rgba(20,40,60,.85)' }); Z.add(S.min30);
  S.cookie = new THREE.Group(); Z.add(S.cookie); const ck = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 32), plastic(0xd9a05b, 0.6)); ck.rotation.x = Math.PI / 2; S.cookie.add(ck);
  for (let i = 0; i < 7; i++) { const ch = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), plastic(0x4a2614, 0.4)); const a = i * 2.4, r = 0.06 + 0.12 * hash(i); ch.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.03); S.cookie.add(ch); }
  S.juice = new THREE.Group(); Z.add(S.juice); const jg = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.42, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })); S.juice.add(jg);
  const jl = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.135, 0.32, 32), plastic(0xff9a1f, 0.2)); jl.position.y = -0.04; S.juice.add(jl);
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 10), plastic(0xff5a8a)); straw.position.set(0.05, 0.12, 0); straw.rotation.z = -0.25; S.juice.add(straw);
  // noche: luna creciente y estrellas
  S.moon = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(128, 128, 30, 128, 128, 128); r.addColorStop(0, 'rgba(255,240,200,.5)'); r.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff1c4'; g.beginPath(); g.arc(128, 128, 62, 0, 7); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(156, 112, 56, 0, 7); g.fill(); }), transparent: true, depthWrite: false })); Z.add(S.moon);
  const st = new Float32Array(70 * 3); for (let i = 0; i < 70; i++) { st[i * 3] = (hash(i * 3.1) - 0.5) * 4.2; st[i * 3 + 1] = (hash(i * 4.3) - 0.5) * 6.0; st[i * 3 + 2] = 0.4 + hash(i * 5.7) * 0.6; if (Math.abs(st[i * 3]) < 1.4 && Math.abs(st[i * 3 + 1]) < 1.1) st[i * 3 + 1] += 2.4 * Math.sign(st[i * 3 + 1] || 1); }
  S.stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(st, 3)), new THREE.PointsMaterial({ map: starTex, size: 0.12, color: 0xfff6dc, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); Z.add(S.stars);
  // saliva: gotas brillantes dentro de la boca + gota grande que se encoge
  S.drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0xeaf8ff, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.55, depthWrite: false }), 40); S.drops.frustumCulled = false; Z.add(S.drops);
  const dp = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI; dp.push(new THREE.Vector2(Math.sin(a) * 0.22 * Math.pow(Math.sin(a / 2), 0.5), -Math.cos(a) * 0.3 + 0.0)); }
  S.drop = new THREE.Mesh(new THREE.LatheGeometry(dp, 40), new THREE.MeshPhysicalMaterial({ color: 0x9fdcff, roughness: 0.03, clearcoat: 1, transparent: true, opacity: 0.75, emissive: 0x1a5a8a, emissiveIntensity: 0.5 })); S.drop.rotation.z = Math.PI; Z.add(S.drop);
  S.salLab = pill('SALIVA', '#0f2b40', 'rgba(220,244,255,.95)', 0.55); Z.add(S.salLab);
  // bocadillo de comentario
  S.bubble = new THREE.Group(); Z.add(S.bubble); const bb = rbox(0.8, 0.52, 0.12, plastic(0xffffff, 0.2), 0.22); S.bubble.add(bb); const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 16), plastic(0xffffff, 0.2)); tail.position.set(-0.22, -0.3, 0); tail.rotation.z = 0.5; S.bubble.add(tail);
  for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), plastic(0xff5a6e, 0.2)); d.position.set(-0.2 + i * 0.2, 0, 0.07); S.bubble.add(d); }
  // motas de polvo desenfocadas (bokeh) por delante
  S.bokeh = [[0.12, 0xfff0e0, 40], [0.26, 0xffb8d8, 22], [0.5, 0x9fe8ff, 10]].map(([size, color, n], j) => { const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = (hash(i * 3.3 + j) - 0.5) * 4.5; a[i * 3 + 1] = (hash(i * 5.1 + j) - 0.5) * 7.5; a[i * 3 + 2] = 1.2 + hash(i * 7.9 + j) * 3.5; }
    const p = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(a, 3)), new THREE.PointsMaterial({ map: discTex, size, color, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })); p.userData.base = a.slice(); Z.add(p); return p; });
}
function propsAt(t, coat) {
  // escudo: se ve con la capa de flúor; con «protección» se rompe; de noche vuelve a montarse y brilla
  const sh1 = env(t, K.queda2 - 0.3, K.proteccion + 0.15, 0.35, 0.05), brk = prog(t, K.proteccion - 0.05, 0.9), sh2 = env(t, K.protege - 0.3, K.cuentame + 0.4, 0.45, 0.45);
  let n = 0; S.hexP.forEach((h, i) => { const k = Math.max(sh1, sh2 * clamp((t - K.protege + 0.3) / 0.6 - h.r * 0.04 - Math.abs(h.c - 12.5) * 0.01)); const fly = sh1 > 0 && t > K.proteccion - 0.05 ? brk : 0;
    if (k < 0.01 && fly <= 0) return; const p = h.p.clone(); if (fly > 0) { p.add(v3(Math.sin(h.a) * 2.0 * fly, (hash(i) - 0.3) * 1.5 * fly - 1.4 * fly * fly, 1.2 * fly + hash(i * 3) * fly)); }
    _e.set(fly * 4 * hash(i * 5), h.a + fly * 3, fly * 2); _q.setFromEuler(_e); const s = (fly > 0 ? 1 - fly : k) * (0.92 + 0.08 * Math.sin(t * 6 + i)); _s.setScalar(Math.max(0.001, s)); _m4.compose(p, _q, _s); S.hex.setMatrixAt(n++, _m4); });
  S.hex.count = n; S.hex.instanceMatrix.needsUpdate = true; S.hex.material.opacity = 0.85;
  // colutorio + reloj + plato (columna a la derecha de la boca)
  const cb = env(t, K.colutorio - 0.45, K.intenta + 0.1, 0.4, 0.4), cc = env(t, K.momento - 0.45, K.intenta + 0.1, 0.35, 0.4), cp = env(t, K.despues - 0.4, K.intenta + 0.1, 0.35, 0.4);
  S.bottle.visible = cb > 0.01; S.bottle.position.set(lerp(3.8, 2.35, sm5(cb)), -0.05 + 0.04 * Math.sin(t * 2), 0.6); S.bottle.rotation.set(0, Math.sin(t * 0.8) * 0.3, 0.08 * Math.sin(t * 1.3));
  S.clock.visible = cc > 0.01; S.clock.position.set(lerp(3.8, 2.4, sm5(cc)), 1.3, 0.6); S.clock.rotation.y = -0.2;
  const spin = eio(prog(t, K.momento - 0.15, 1.2)) * Math.PI * 2 * 3; S.minH.rotation.z = -spin; S.hourH.rotation.z = -spin / 12 - 0.4;
  S.plate.visible = cp > 0.01; S.plate.position.set(lerp(3.8, 2.35, sm5(cp)), -1.3, 0.6);
  // temporizador de media hora
  const tr = env(t, K.intenta - 0.35, K.cepillado - 0.1, 0.4, 0.4); S.ring.visible = S.ringBg.visible = tr > 0.01; S.ring.scale.setScalar(lerp(0.6, 1, eo(tr))); S.ringBg.scale.copy(S.ring.scale); S.ringBg.material.opacity = 0.25 * tr;
  const prg = prog(t, K.intenta, K.cepillado - K.intenta - 0.3); S.ring.geometry.setDrawRange(0, Math.floor(S.ring.geometry.index.count * clamp(1 - prg * 0.92) / 6) * 6);
  S.ring.position.set(0, 0, 0.35); S.ringBg.position.set(0, 0, 0.35); S.ring.rotation.z = Math.PI / 2;
  lookLab(S.min30, tr, v3(0, -2.3, 0.45));
  // galleta y zumo: vienen hacia la boca y rebotan contra el anillo
  for (const [o, k0, side] of [[S.cookie, K.comer2, -1], [S.juice, K.beber, 1]]) { const u = prog(t, k0 - 0.45, 1.4); o.visible = tr > 0.01 && u > 0 && u < 1; if (!o.visible) continue;
    const hit = 0.42, x = u < hit ? lerp(side * 3.0, side * 1.95, sm5(u / hit)) : lerp(side * 1.95, side * 3.2, (u - hit) / (1 - hit)), y = u < hit ? lerp(0.9, 0.35, u / hit) : 0.35 + 1.6 * (u - hit) - 2.4 * (u - hit) ** 2;
    o.position.set(x, y, 0.5); o.rotation.set(0, 0, u * side * 6); }
  // noche
  const nt = env(t, K.cepillado - 0.4, K.cuentame - 0.1, 0.6, 0.5); S.moon.visible = nt > 0.01; S.moon.material.opacity = nt; S.moon.position.set(1.1, lerp(3.1, 2.35, eo(nt)), 0.5); S.stars.material.opacity = 0.9 * nt;
  // saliva
  const sv = env(t, K.noche2 - 0.3, K.protege + 0.2, 0.3, 0.3), less = prog(t, K.saliva - 0.1, 0.8);
  let m = 0; if (sv > 0.01) for (let i = 0; i < 40; i++) { if (hash(i * 3.3) < less * 0.8) continue; const life = (t * (0.5 + 0.4 * hash(i)) + hash(i * 7)) % 1, x = (hash(i * 1.7) - 0.5) * 1.3, r = 0.012 + 0.02 * hash(i * 2.9);
    _s.set(r, r * 1.3, r).multiplyScalar(sv); _m4.compose(v3(x, lerp(0.55, -0.05, life * life), -0.25 - 0.4 * x * x), _q.identity(), _s); S.drops.setMatrixAt(m++, _m4); }
  S.drops.count = m; S.drops.instanceMatrix.needsUpdate = true;
  S.drop.visible = sv > 0.01; S.drop.position.set(-2.1, 1.35, 0.6); S.drop.scale.setScalar(Math.max(0.01, sv * lerp(1, 0.45, eio(less)) * (1 + 0.04 * Math.sin(t * 4)))); lookLab(S.salLab, sv, v3(-2.1, 0.82, 0.62));
  // bocadillo
  const bu = env(t, K.comentarios - 0.15, END - 0.5, 0.3, 0.3); S.bubble.visible = bu > 0.01; S.bubble.position.set(1.25, 1.75 + 0.05 * Math.sin(t * 3), 0.6); S.bubble.scale.setScalar(Math.max(0.01, eo(bu) * (1 + 0.12 * Math.sin(Math.PI * clamp((t - K.comentarios + 0.15) / 0.3)))));
  // bokeh: deriva lenta
  S.bokeh.forEach((p, j) => { const a = p.geometry.attributes.position.array, b = p.userData.base; for (let i = 0; i < a.length; i += 3) { a[i] = b[i] + 0.15 * Math.sin(t * 0.3 + i + j); a[i + 1] = b[i + 1] + 0.12 * Math.sin(t * 0.25 + i * 1.3 + j); } p.geometry.attributes.position.needsUpdate = true; });
}
function mouthAt(t) {
  const O = zones.mouth.position;
  bacteriaAt(t); brushAt(t); const coat = fluorAt(t); rinseAt(t); propsAt(t, coat);
  // luz de noche
  const nt = env(t, K.cepillado - 0.4, K.cuentame - 0.1, 0.6, 0.5), dim = env(t, K.seguramente - 0.1, K.sabes - 0.1, 0.35, 0.35) * 0.75; S.night = Math.max(nt, dim);
  S.key.intensity = 75 * (1 - 0.6 * S.night); S.fill.intensity = 6 * (1 - 0.6 * S.night); S.moonL.intensity = 1.2 * S.night;
  const keys = [
    [-1, [0.05, -0.18, 0.95], [0.0, -0.26, -0.3]], [0.0, [0.05, -0.18, 0.95], [0.0, -0.26, -0.3]], [0.5, [0.05, -0.05, 2.2], [0.0, -0.1, -0.2]], [1.05, [0, 0.1, 6.8], [0, 0.06, 0]], [K.perfecto + 0.25, [0, 0.05, 11.0], [0, 0.03, 0]],
    [K.segundo, [0, 0.06, 9.6], [0, 0.06, 0]], [K.estropeas + 0.2, [0, 0.0, 11.4], [0, 0.02, 0]], [K.noche1, [0.35, 0.12, 12.0], [0.2, 0.1, 0]], [K.sabes, [0, 0.12, 10.8], [0, 0.1, 0.6]], [K.terminar + 0.3, [0, 0.14, 8.0], [0, 0.1, 0]],
    [K.boca + 0.2, [0, 0.12, 4.6], [0, 0.1, -0.25]], [K.capa, [0.22, 0.25, 2.7], [0.14, 0.22, -0.1]], [K.fluor1, [0.12, 0.25, 2.0], [0.1, 0.22, -0.05]], [K.fluor2, [0.08, 0.23, 1.5], [0.08, 0.21, 0]],
    [K.sigue, [0.12, 0.22, 1.0], [0.12, 0.21, 0]], [K.dive1, [0.135, 0.24, 0.1], [0.135, 0.24, -0.2]],
    // vuelta del esmalte: salimos del diente hacia atrás
    [K.out3, [0.135, 0.24, 0.12], [0.135, 0.24, -0.2]], [K.out3 + 0.4, [0.1, 0.2, 2.3], [0.08, 0.18, 0]], [K.gesto, [0, 0.12, 7.0], [0, 0.1, 0]], [K.enjuagas1 - 0.3, [0, 0.14, 10.2], [0, 0.12, 0]],
    [K.agua1, [0, 0.5, 11.4], [0, 0.48, 0]], [K.agua2 + 0.3, [0, 0.0, 6.6], [0, -0.02, -0.3]], [K.fluor4, [0.3, -0.12, 5.8], [0.28, -0.2, -0.2]], [K.limpieza, [0, 0.04, 8.4], [0, 0.03, 0]],
    [K.proteccion + 0.2, [0, 0.06, 8.8], [0, 0.04, 0]], [K.escupe - 0.2, [0, 0.1, 10.0], [0, 0.08, 0]], [K.espuma + 0.2, [0, -0.35, 10.8], [0, -0.6, 0]], [K.enjuagues - 0.3, [0.35, 0.4, 11.4], [0.35, 0.45, 0]],
    [K.colutorio, [1.85, 0.15, 7.8], [2.05, 0.1, 0.6]], [K.momento, [1.95, 0.35, 7.6], [2.2, 0.4, 0.6]], [K.despues + 0.2, [1.95, 0.0, 8.2], [2.2, -0.05, 0.6]],
    [K.intenta + 0.1, [0, -0.1, 13.2], [0, -0.15, 0]], [K.hora + 0.4, [0, -0.1, 12.8], [0, -0.15, 0]], [K.cepillado, [0, 0.35, 12.8], [0, 0.42, 0]], [K.importa, [0, 0.12, 6.8], [0, 0.1, 0]],
    [K.noche2, [0, 0.06, 4.0], [0, 0.0, -0.5]], [K.saliva + 0.3, [-0.7, 0.3, 6.6], [-0.95, 0.3, 0]], [K.protege, [0, 0.1, 7.0], [0, 0.08, 0]], [K.horas + 0.3, [0, 0.08, 8.4], [0, 0.06, 0]],
    [K.cuentame + 0.3, [0, 0.1, 11.6], [0, 0.12, 0]], [END - 1.05, [0, 0.1, 11.0], [0, 0.12, 0]], [END, [0.05, -0.18, 0.95], [0.0, -0.26, -0.3]], [END + 2, [0.05, -0.18, 0.95], [0.0, -0.26, -0.3]],
  ];
  const c = camKeys(t, keys, O.x);
  const dz = c.p.z, hand = Math.min(1, dz / 6) * 0.025; c.p.x += hand * Math.sin(t * 0.7); c.p.y += hand * 0.8 * Math.sin(t * 0.93 + 1);
  return c;
}

// ---------------------------------------------------------------- 1 · el diente por dentro: corte con esmalte, dentina y pulpa; una caries que el flúor repara
const ENA = [[0.5, 0.2], [0.62, 0.45], [0.74, 0.8], [0.75, 1.15], [0.62, 1.42], [0.35, 1.58], [0.0, 1.62]];
const DEN = [[0.0, -1.95], [0.12, -1.85], [0.28, -1.4], [0.4, -0.8], [0.47, -0.2], [0.5, 0.2], [0.55, 0.45], [0.65, 0.75], [0.66, 1.05], [0.55, 1.28], [0.3, 1.42], [0.0, 1.45]];
const PUL = [[0.0, -1.7], [0.06, -1.5], [0.12, -0.8], [0.18, 0.0], [0.22, 0.4], [0.24, 0.8], [0.18, 0.98], [0.0, 1.0]];
const smooth2 = (P, n = 48) => new THREE.SplineCurve(P.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(n);
function stripes(base, line, n, ang, w = 512) { return canvasTex(w, w, (g, W2, H2) => { g.fillStyle = base; g.fillRect(0, 0, W2, H2); g.strokeStyle = line; g.lineWidth = 1.6; g.translate(W2 / 2, H2 / 2); g.rotate(ang);
  for (let i = 0; i < n; i++) { const x = (i / n - 0.5) * W2 * 1.6; g.globalAlpha = 0.25 + 0.35 * hash(i); g.beginPath(); g.moveTo(x, -W2); g.bezierCurveTo(x + 18, -W2 / 3, x - 18, W2 / 3, x + 6, W2); g.stroke(); } }); }
function buildTooth() {
  const Z = zone('tooth', 40);
  const enaS = smooth2(ENA), denS = smooth2(DEN, 80), pulS = smooth2(PUL, 48);
  // superficies exteriores (media vuelta: la mitad de atrás) y caras del corte
  const enamelM = new THREE.MeshPhysicalMaterial({ color: 0xf4f1ea, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.08 });
  const half = (pts, m) => { const g = new THREE.LatheGeometry(pts, 64, Math.PI / 2, Math.PI); const me = new THREE.Mesh(g, m); me.castShadow = true; me.receiveShadow = true; Z.add(me); return me; };
  half(enaS, enamelM); half(denS.filter(p => p.y < 0.25), new THREE.MeshPhysicalMaterial({ color: 0xead2a0, roughness: 0.4 }));
  const uvFix = g => { const p = g.attributes.position, uv = []; for (let i = 0; i < p.count; i++) uv.push(p.getX(i) * 0.6 + 0.5, p.getY(i) * 0.3 + 0.5); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g; };
  const sideL = pts => pts.map(p => new THREE.Vector2(-p.x, p.y));
  // esmalte cortado: del cuello por fuera hasta la punta y bajando por el otro lado; vuelta por el borde de la dentina
  const crownD = denS.filter(p => p.y >= 0.2);
  const ena = new THREE.Shape([...enaS, ...sideL(enaS).reverse(), ...sideL(crownD), ...[...crownD].reverse()]);
  const den = new THREE.Shape([...denS, ...sideL(denS).reverse()]); den.holes.push(new THREE.Path([...pulS, ...sideL(pulS).reverse()]));
  const pul = new THREE.Shape([...pulS, ...sideL(pulS).reverse()]);
  const cut = (shape, tex, color, z) => { const m = new THREE.Mesh(uvFix(new THREE.ShapeGeometry(shape, 24)), new THREE.MeshPhysicalMaterial({ map: tex, color, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 })); m.position.z = z; m.receiveShadow = true; Z.add(m); return m; };
  cut(ena, stripes('#f6f2ea', '#cfc6b6', 70, 0.0), 0xffffff, 0.001);
  cut(den, stripes('#efd8a4', '#c9a868', 110, 0.1), 0xffffff, 0.0008);
  S.pulpM = cut(pul, canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#d9465a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,10,30,.7)'; g.lineWidth = 3; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(w / 2 + (hash(i) - 0.5) * 60, h); for (let y = h; y > 0; y -= 30) g.lineTo(w / 2 + (hash(i + y) - 0.5) * 90, y); g.stroke(); } }), 0xffffff, 0.0012).material;
  S.pulpM.emissive = new THREE.Color(0x5a0a14); S.pulpM.emissiveIntensity = 0.5;
  // nervio: hilos claros que bajan por el conducto
  for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 20; i++) { const y = lerp(0.9, -1.65, i / 20); pts.push(v3((k - 1) * 0.05 * (1 - i / 20) + 0.015 * Math.sin(i * 1.7 + k), y, 0.004)); } Z.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.009, 6), glowM(0xffd36a, 1.2))); }
  // encía y hueso (corte de la mandíbula), detrás de la cara del diente
  const gum = rbox(2.9, 0.9, 1.5, new THREE.MeshPhysicalMaterial({ color: 0xe0566a, roughness: 0.35, clearcoat: 0.6 }), 0.12); gum.position.set(0, -0.12, -0.752); Z.add(gum);
  const boneT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#ead8b4'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(150,110,70,${0.25 + 0.3 * hash(i)})`; g.beginPath(); g.ellipse(hash(i * 2.3) * w, hash(i * 3.7) * h, 4 + 12 * hash(i * 5.1), 3 + 8 * hash(i * 6.9), hash(i) * 3, 0, 7); g.fill(); } });
  const bone = rbox(2.9, 1.8, 1.5, new THREE.MeshStandardMaterial({ map: boneT, roughness: 0.7 }), 0.1); bone.position.set(0, -1.45, -0.752); Z.add(bone);
  // caries en la punta: cuña oscura en el esmalte + mancha en la superficie
  S.lesM = new THREE.MeshStandardMaterial({ color: 0x3a1a0c, roughness: 0.6, emissive: 0x000000 });
  const les = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(new THREE.SplineCurve([new THREE.Vector2(0.22, 1.6), new THREE.Vector2(0.58, 1.45), new THREE.Vector2(0.5, 1.33), new THREE.Vector2(0.38, 1.34), new THREE.Vector2(0.3, 1.45), new THREE.Vector2(0.22, 1.6)]).getPoints(40))), S.lesM); les.position.z = 0.002; Z.add(les);
  S.tIons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 10, 8), instGlow(new THREE.MeshStandardMaterial({ roughness: 0.3 }), 1.0), 60); S.tIons.frustumCulled = false; Z.add(S.tIons);
  S.tAcid = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0xff5a2a, roughness: 0.1, clearcoat: 1, emissive: 0x8a1a00, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 }), 18); S.tAcid.frustumCulled = false; Z.add(S.tAcid);
  S.tSpark = sparks(Z, 60, 0xbff6ff, 0.03);
  // rótulos con línea guía
  S.tLab = [['ESMALTE', -0.45, 1.45, -0.82, 1.95], ['DENTINA', -0.45, 0.6, -1.0, 0.1], ['PULPA', -0.1, -0.5, -1.0, -0.75], ['ENCÍA', 0.85, 0.1, 1.0, 0.55], ['HUESO', 0.85, -1.2, 1.0, -1.65]].map(([n, x, y, lx, ly]) => {
    const w = 0.075 * n.length + 0.2, l = pill(n, '#1b1d24', 'rgba(255,255,255,.95)', w); Z.add(l); const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v3(lx + (lx < 0 ? w / 2 : -w / 2), ly, 0.05), v3(x, y, 0.02)]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })); ln.layers.set(1); Z.add(ln); return { l, ln, x: lx, y: ly }; });
  S.cariesLab = pill('CARIES', '#ffffff', 'rgba(120,40,20,.92)', 0.13); Z.add(S.cariesLab);
  const key = new THREE.SpotLight(0xfff2e8, 42, 30, 0.55, 0.6, 1.4); key.position.set(2.5, 5, 7); key.target.position.set(0, 0, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Z.add(key); Z.add(key.target);
  const fill = new THREE.PointLight(0xffd0c0, 4, 20, 1.5); fill.position.set(-3, 1, 5); Z.add(fill);
  const rim = new THREE.PointLight(0x9fe8ff, 6, 14, 1.5); rim.position.set(-2, 3.5, -2.5); Z.add(rim);
}
function toothAt(t) {
  const O = zones.tooth.position, rep = prog(t, K.acidos + 0.5, 1.6), heal = sm5(rep);
  S.lesM.color.setRGB(lerp(0.23, 0.96, heal), lerp(0.1, 0.95, heal), lerp(0.05, 0.92, heal)); S.lesM.emissive.setRGB(0.2 * heal * (1 - heal) * 4, 0.6 * heal * (1 - heal) * 4, 0.7 * heal * (1 - heal) * 4);
  // iones de flúor que entran en la lesión
  let n = 0; const ik = env(t, K.repara + 1.0, K.caries + 0.2, 0.3, 0.3);
  for (let i = 0; i < 60; i++) { const life = (t * 0.7 + hash(i * 3.1)) % 1, a = hash(i * 5.3) * 6.28, r = 0.25 + 0.5 * hash(i * 7.7) * (1 - life);
    const p = v3(0.44 + Math.cos(a) * r, 1.5 + Math.sin(a) * r * 0.6 + 0.4 * (1 - life), 0.08 + 0.3 * (1 - life)); _s.setScalar(ik * (0.6 + 0.4 * Math.sin(t * 9 + i))); _m4.compose(p, _q.identity(), _s); S.tIons.setMatrixAt(n, _m4); S.tIons.setColorAt(n, _c.setRGB(0.5, 2.0, 2.6)); n++; }
  S.tIons.count = ik > 0.01 ? n : 0; S.tIons.instanceMatrix.needsUpdate = true; if (S.tIons.instanceColor) S.tIons.instanceColor.needsUpdate = true;
  // ácidos: rondan la lesión y se retiran
  let m = 0; const ak = env(t, K.dive1, K.caries + 0.4, 0.2, 0.3), away = prog(t, K.acidos, 1.4);
  for (let i = 0; i < 18; i++) { const a = hash(i * 2.9) * 6.28 + t * (0.8 + hash(i)), r = 0.18 + 0.12 * hash(i * 4.1) + 0.9 * away * hash(i * 6.7); _s.setScalar(ak * (1 - 0.8 * away)); _m4.compose(v3(0.44 + Math.cos(a) * r, 1.62 + 0.12 * Math.sin(a * 1.3) + 0.5 * away, 0.12 + Math.sin(a) * 0.08), _q.identity(), _s); S.tAcid.setMatrixAt(m++, _m4); }
  S.tAcid.count = ak > 0.01 ? m : 0; S.tAcid.instanceMatrix.needsUpdate = true;
  burst(S.tSpark, v3(0.44, 1.5, 0.05), t, K.caries - 0.5, 0.5, 0.8, true, 0.5); S.tSpark.material.opacity = 0.8 * env(t, K.acidos + 0.6, K.dive2, 0.3, 0.1);
  const lk = env(t, K.esmalte - 0.1, K.acidos + 0.5, 0.3, 0.3);
  S.tLab.forEach((L, i) => { const k = i === 0 ? env(t, K.esmalte - 0.1, K.acidos + 0.5, 0.25, 0.3) : lk * clamp((t - K.esmalte - 0.1 - i * 0.12) / 0.25); lookLab(L.l, k, v3(L.x, L.y, 0.05)); L.l.rotation.set(0, 0, 0); L.ln.material.opacity = 0.8 * k; L.ln.visible = k > 0.01; });
  lookLab(S.cariesLab, env(t, K.caries - 0.05, K.dive2, 0.12, 0.08), v3(0.43, 1.64, 0.2));
  return camKeys(t, [[K.dive1, [0.0, 1.55, 0.05], [0.0, 1.55, -0.3]], [K.dive1 + 0.55, [0.05, 0.55, 4.4], [0.0, 0.3, 0]], [K.esmalte + 0.3, [0.0, -0.2, 9.5], [0.0, -0.3, 0]], [K.acidos, [0.05, -0.16, 9.0], [0.0, -0.28, 0]],
    [K.acidos + 0.75, [0.42, 1.42, 1.65], [0.43, 1.47, 0]], [K.caries, [0.43, 1.48, 1.1], [0.43, 1.49, 0]], [K.dive2, [0.43, 1.5, 0.06], [0.43, 1.5, -0.3]], [K.dive2 + 1, [0.43, 1.5, 0.06], [0.43, 1.5, -0.3]]], O.x);
}

// ---------------------------------------------------------------- 2 · dentro del esmalte: cristales hexagonales que el flúor endurece, ácido que rebota, reservas y la placa con su azúcar
function buildMicro() {
  const Z = zone('micro', 80);
  const NX = 42, NZ = 26, R = 0.09, dx = R * 1.75, dz = R * 1.52;
  S.cry = new THREE.InstancedMesh(new THREE.CylinderGeometry(R * 0.97, R * 0.97, 1.6, 6), instGlow(new THREE.MeshStandardMaterial({ roughness: 0.22 }), 0.22), NX * NZ);
  S.cryP = []; let n = 0;
  for (let i = 0; i < NX; i++) for (let k = 0; k < NZ; k++) { const x = (i - (NX - 1) / 2) * dx + (k % 2) * dx / 2, z = (k - (NZ - 1) / 2) * dz, y = -0.8 + 0.035 * hash(i * 13 + k * 7);
    S.cryP.push({ x, z, y, d: Math.hypot(x - 0.2, z - 0.2) }); S.cry.setColorAt(n, _c.setRGB(0.86, 0.78, 0.64)); _m4.compose(v3(x, y, z), _q.setFromAxisAngle(UPV, Math.PI / 6), _s.setScalar(1)); S.cry.setMatrixAt(n++, _m4); }
  S.cry.castShadow = false; S.cry.receiveShadow = true; Z.add(S.cry);
  // iones de flúor que caen en los cristales
  S.mIons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 12, 10), instGlow(new THREE.MeshStandardMaterial({ roughness: 0.3 }), 1.0), 160); S.mIons.frustumCulled = false; Z.add(S.mIons);
  // ácido: gotas rojas que caen y rebotan
  S.mAcid = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xff5a2a, roughness: 0.08, clearcoat: 1, emissive: 0x7a1600, emissiveIntensity: 0.6 }), 30); S.mAcid.frustumCulled = false; Z.add(S.mAcid);
  S.mSpark = sparks(Z, 200, 0xffd9a8, 0.035);
  // reservas de fluoruro cálcico: glóbulos lechosos sobre la superficie que sueltan flúor poco a poco
  S.res = []; for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), new THREE.MeshPhysicalMaterial({ color: 0xa8ecff, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.62, emissive: 0x24bfff, emissiveIntensity: 0.9, depthWrite: false }));
    const r = 0.14 + 0.15 * hash(i * 3.3); m.userData = { r, x: -2.3 + (i % 3) * 0.55 + 0.2 * hash(i), z: -0.5 + Math.floor(i / 3) * 0.5 + 0.15 * hash(i * 2), t0: i * 0.11 }; m.renderOrder = 3; Z.add(m); S.res.push(m); }
  // placa: bacterias grandes en una película gelatinosa, junto a un terrón de azúcar
  const mat = () => instGlow(new THREE.MeshPhysicalMaterial({ roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.12 }), 0.34);
  S.pRod = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.11, 0.42, 8, 16), mat(), 12); S.pCoc = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 18, 14), mat(), 40);
  const hp = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2 * 4; hp.push(v3(Math.cos(a) * 0.09, (i / 96 - 0.5) * 0.75, Math.sin(a) * 0.09)); } S.pSpi = new THREE.InstancedMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 180, 0.028, 8), mat(), 5);
  [S.pRod, S.pCoc, S.pSpi].forEach(m => { m.frustumCulled = false; Z.add(m); });
  S.pB = []; for (let i = 0; i < 20; i++) { const a = hash(i * 4.4) * 6.28, r = 0.35 + 0.75 * Math.sqrt(hash(i * 5.5)); S.pB.push({ kind: i < 10 ? 'rod' : i < 16 ? 'chain' : 'spi', p: v3(1.6 + Math.cos(a) * r, 0.2 + 0.25 * hash(i * 6.6), -0.1 + Math.sin(a) * r * 0.7), ax: v3(hash(i) - 0.5, hash(i * 2) * 0.6, hash(i * 3) - 0.5).normalize(), col: PAL[i % PAL.length], ph: hash(i * 7.7) * 6.28 }); }
  S.film = []; for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xd8f0a0, roughness: 0.2, clearcoat: 1, transparent: true, opacity: 0.16, depthWrite: false })); m.scale.set(0.5 + 0.3 * hash(i), 0.3, 0.45 + 0.25 * hash(i * 2)); m.position.set(1.3 + (i % 4) * 0.35, 0.18, -0.4 + Math.floor(i / 4) * 0.55); m.renderOrder = 4; Z.add(m); S.film.push(m); }
  const sugT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${200 + 55 * hash(i)},${210 + 45 * hash(i * 2)},${230 + 25 * hash(i * 3)},.8)`; const x = hash(i * 1.7) * w, y = hash(i * 2.9) * h, s = 6 + 18 * hash(i * 4.1); g.fillRect(x, y, s, s); } });
  S.sugar = rbox(0.5, 0.5, 0.5, new THREE.MeshPhysicalMaterial({ map: sugT, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.2, emissive: 0x222222 }), 0.05); S.sugar.position.set(2.2, 0.26, 0.32); S.sugar.rotation.y = 0.35; Z.add(S.sugar);
  S.sugSp = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(30 * 3), 3)), new THREE.PointsMaterial({ map: starTex, size: 0.09, color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); Z.add(S.sugSp);
  S.bub2 = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xff4a3a, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.7, emissive: 0x6a0a00, emissiveIntensity: 0.5, depthWrite: false }), 24); S.bub2.frustumCulled = false; Z.add(S.bub2);
  // rótulos
  S.hydro = pill('HIDROXIAPATITA', '#1b1d24', 'rgba(255,248,236,.95)', 0.56); S.fluo = pill('FLUORAPATITA', '#0b2a33', 'rgba(150,240,255,.97)', 0.52); S.resLab = pill('RESERVAS DE FLÚOR', '#0b2a33', 'rgba(220,250,255,.95)', 0.42);
  S.placaLab = pill('PLACA', '#1b1d24', 'rgba(220,255,170,.95)', 0.3); S.azuLab = pill('AZÚCAR', '#1b1d24', 'rgba(255,255,255,.96)', 0.32); [S.hydro, S.fluo, S.resLab, S.placaLab, S.azuLab].forEach(l => Z.add(l));
  const key = new THREE.SpotLight(0xfff4ea, 36, 30, 0.6, 0.6, 1.4); key.position.set(1.5, 6, 5); key.target.position.set(0, 0, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0003; Z.add(key); Z.add(key.target);
  const rim = new THREE.PointLight(0x6fe0ff, 3.5, 14, 1.4); rim.position.set(-3, 2.5, -2.5); Z.add(rim);
  const warm = new THREE.PointLight(0xffb08a, 7, 14, 1.5); warm.position.set(3.5, 2, 3); Z.add(warm);
}
function microAt(t) {
  const O = zones.micro.position, t0 = K.mete - 0.1;
  // cada cristal se convierte (crema → azul hielo brillante) cuando le llega su ion
  const tc = i => t0 + 0.25 + S.cryP[i].d * 0.42 + 0.25 * hash(i * 3.3);
  S.cryP.forEach((c, i) => { const k = sm5(prog(t, tc(i), 0.35)), fl = Math.exp(-Math.max(0, t - tc(i)) * 5) * (t > tc(i) ? 1 : 0); _c.setRGB(lerp(0.86, 0.3, k) + fl * 0.6, lerp(0.78, 0.72, k) + fl * 1.6, lerp(0.64, 1.3, k) + fl * 2.0); S.cry.setColorAt(i, _c); });
  S.cry.instanceColor.needsUpdate = true;
  let n = 0; S.cryP.forEach((c, i) => { if (n >= 110 || c.d > 1.6 || hash(i * 1.7) > 0.5) return; const tt = tc(i), u = prog(t, tt - 0.7, 0.7); if (u <= 0 || u >= 1) return; _s.setScalar(1); _m4.compose(v3(c.x, lerp(2.4, 0.02, u * u), c.z), _q.identity(), _s); S.mIons.setMatrixAt(n, _m4); S.mIons.setColorAt(n, _c.setRGB(0.5, 2.0, 2.6)); n++; });
  // las reservas sueltan iones que vuelven a bajar a los cristales
  S.res.forEach((m, j) => { const ud = m.userData, g = sm5(prog(t, K.reservas - 0.15 + ud.t0, 0.5)); m.visible = g > 0.01; m.scale.setScalar(Math.max(0.001, ud.r * g * (1 + 0.04 * Math.sin(t * 3 + j)))); m.position.set(ud.x, ud.r * 0.55 * g, ud.z);
    if (t > K.soltando - 0.3) for (let q = 0; q < 3; q++) { const life = ((t - K.soltando + 0.3) * 0.55 + q / 3 + hash(j * 5)) % 1; if (n >= 160) break; const a = hash(j * 7 + q) * 6.28;
      _m4.compose(v3(ud.x + Math.cos(a) * 0.35 * life, ud.r * 1.1 + 0.45 * Math.sin(Math.PI * life), ud.z + Math.sin(a) * 0.35 * life), _q.identity(), _s.setScalar(0.8)); S.mIons.setMatrixAt(n, _m4); S.mIons.setColorAt(n, _c.setRGB(0.5, 2.0, 2.6)); n++; } });
  // iones que rondan la placa y frenan a las bacterias
  const calm = sm5(prog(t, K.frena + 0.3, 2.4));
  if (t > K.frena - 0.4) for (let q = 0; q < 26 && n < 160; q++) { const a = hash(q * 3.7) * 6.28 + t * 0.6, r = 0.4 + 0.8 * hash(q * 1.9); _m4.compose(v3(1.6 + Math.cos(a) * r, 0.35 + 0.35 * Math.sin(t * 1.3 + q), -0.1 + Math.sin(a) * r * 0.7), _q.identity(), _s.setScalar(0.7 * prog(t, K.frena - 0.4, 0.5))); S.mIons.setMatrixAt(n, _m4); S.mIons.setColorAt(n, _c.setRGB(0.5, 2.0, 2.6)); n++; }
  S.mIons.count = n; S.mIons.instanceMatrix.needsUpdate = true; if (S.mIons.instanceColor) S.mIons.instanceColor.needsUpdate = true;
  // ácido: cae y rebota en el esmalte ya endurecido
  let m = 0; for (let i = 0; i < 30; i++) { const td = K.acido1 - 0.45 + hash(i * 2.1) * 0.5, x = (hash(i * 3.3) - 0.5) * 2.4 + 0.2, z = (hash(i * 4.4) - 0.5) * 1.6, fall = 0.42;
    const u = t - td; if (u < 0 || u > 1.6) continue; let y; if (u < fall) y = lerp(2.2, 0.075, (u / fall) ** 2); else { const b = u - fall, v0 = 3.2; y = 0.075 + v0 * b - 4.9 * b * b; if (y < 0.075) continue; }
    _m4.compose(v3(x + (u > fall ? (hash(i) - 0.5) * (u - fall) * 1.5 : 0), y, z), _q.identity(), _s.setScalar(1)); S.mAcid.setMatrixAt(m++, _m4); }
  S.mAcid.count = m; S.mAcid.instanceMatrix.needsUpdate = true;
  burst(S.mSpark, v3(0.2, 0.05, 0.0), t, K.acido1 - 0.05, 1.1, 0.6, false, 2); S.mSpark.material.opacity = env(t, K.acido1 - 0.05, K.acido1 + 0.7, 0.05, 0.4); S.mSpark.visible = S.mSpark.material.opacity > 0.01;
  // placa: bacterias que se mueven mucho y, con el flúor, se calman y apagan; burbujas de ácido que se encogen
  const c = { rod: 0, coc: 0, spi: 0 };
  S.pB.forEach((b, i) => { const amp = lerp(1, 0.25, calm), fr = lerp(1, 0.3, calm), P = b.p.clone().add(v3(0.08 * Math.sin(t * 2.2 * fr + b.ph) * amp, 0.05 * Math.sin(t * 2.9 * fr + b.ph * 2) * amp, 0.06 * Math.sin(t * 1.7 * fr + b.ph * 3) * amp));
    _q.setFromAxisAngle(v3(0, 1, 0), t * 0.8 * fr + b.ph); const ax = b.ax.clone().applyQuaternion(_q); _q2.setFromUnitVectors(UPV, ax); _c.setHex(b.col); const gr = (_c.r + _c.g + _c.b) / 3; _c.setRGB(lerp(_c.r, gr, 0.45 * calm), lerp(_c.g, gr, 0.45 * calm), lerp(_c.b, gr, 0.45 * calm));
    const put = (M, key, pos) => { _m4.compose(pos, _q2, _s.setScalar(1)); M.setMatrixAt(c[key], _m4); M.setColorAt(c[key], _c); c[key]++; };
    if (b.kind === 'rod') put(S.pRod, 'rod', P); else if (b.kind === 'spi') put(S.pSpi, 'spi', P); else for (let k = 0; k < 5 && c.coc < 40; k++) put(S.pCoc, 'coc', P.clone().add(ax.clone().multiplyScalar((k - 2) * 0.19))); });
  for (const [M, key] of [[S.pRod, 'rod'], [S.pCoc, 'coc'], [S.pSpi, 'spi']]) { M.count = c[key]; M.instanceMatrix.needsUpdate = true; if (M.instanceColor) M.instanceColor.needsUpdate = true; }
  let q = 0; const shrink = sm5(prog(t, K.convierten - 0.2, K.acido2 - K.convierten + 0.5));
  for (let i = 0; i < 24; i++) { const b = S.pB[i % 10], life = (t * 0.5 + hash(i * 3.9)) % 1, r = 0.05 + 0.06 * hash(i * 2.2); const s = r * (1 - shrink) * Math.sin(Math.PI * life); if (s < 0.004) continue;
    _m4.compose(b.p.clone().add(v3(0.15 * Math.sin(i), 0.15 + 0.7 * life, 0.1 * Math.cos(i))), _q.identity(), _s.setScalar(s)); S.bub2.setMatrixAt(q++, _m4); }
  S.bub2.count = t > K.frena - 0.5 ? q : 0; S.bub2.instanceMatrix.needsUpdate = true;
  const sa = S.sugSp.geometry.attributes.position.array; for (let i = 0; i < 30; i++) { const tw = Math.max(0, Math.sin(t * 4 + i * 2.1)); sa[i * 3] = 2.2 + (hash(i) - 0.5) * 0.55; sa[i * 3 + 1] = 0.26 + (hash(i * 2) - 0.5) * 0.55 + (tw < 0.2 ? 9 : 0); sa[i * 3 + 2] = 0.32 + (hash(i * 3) - 0.5) * 0.55; } S.sugSp.geometry.attributes.position.needsUpdate = true;
  // rótulos (en la mitad de abajo del plano)
  const hk = env(t, K.mete - 0.05, K.resistente + 0.1, 0.25, 0.15), fk = env(t, K.resistente - 0.1, K.acido1 + 0.35, 0.15, 0.25);
  lookLab(S.hydro, hk, v3(0.15, 0.22, 1.25)); lookLab(S.fluo, fk, v3(0.15, 0.22, 1.25));
  lookLab(S.resLab, env(t, K.reservas + 0.25, K.frena - 0.2, 0.25, 0.3), v3(-1.58, 0.1, 0.95));
  lookLab(S.placaLab, env(t, K.placa - 0.1, K.azucar - 0.25, 0.25, 0.2), v3(2.0, 0.25, 1.0)); lookLab(S.azuLab, env(t, K.azucar - 0.1, K.out3, 0.2, 0.1), v3(2.2, 0.2, 0.95));
  return camKeys(t, [[K.dive2, [0.0, 0.12, 0.06], [0.0, -0.5, -0.35]], [K.dive2 + 0.5, [0.1, 2.0, 3.4], [0.1, -0.1, -0.2]], [K.resistente, [0.3, 2.3, 3.8], [0.2, -0.15, -0.2]], [K.acido1, [0.2, 2.0, 3.4], [0.15, 0.1, 0]],
    [K.reservas, [-1.3, 1.6, 2.9], [-1.5, 0.05, 0]], [K.soltando, [-1.5, 1.2, 2.2], [-1.55, 0.15, 0]], [K.frena + 0.2, [1.3, 1.9, 3.6], [1.6, 0.35, 0]], [K.placa, [1.7, 1.5, 3.0], [1.85, 0.4, 0.1]],
    [K.azucar, [2.0, 1.2, 2.3], [2.2, 0.35, 0.3]], [K.acido2, [2.12, 0.95, 1.7], [2.2, 0.33, 0.3]], [K.out3, [2.2, 0.42, 0.63], [2.2, 0.38, 0.3]], [K.out3 + 1, [2.2, 0.42, 0.63], [2.2, 0.38, 0.3]]], O.x);
}

// ---------------------------------------------------------------- secuencia: boca → diente → esmalte → boca (cada paso: la cámara se mete en algo blanco y sale)
let SEQ = [];
function segIdx(t) { let i = 0; SEQ.forEach((s, k) => { if (t >= s.t0) i = k; }); return i; }
function whiteAt(t) { let w = 0; SEQ.forEach(s => { if (!s.trans) return; const d = t - s.t0; w = Math.max(w, d < 0 ? clamp(1 + d / 0.2) ** 2 : clamp(1 - d / 0.28) ** 1.5); }); return w; }
function camState(t) { const i = segIdx(t), cur = SEQ[i], c = cur.fn(t); return { p: c.p, l: c.l, f: c.f || 30, zone: cur.zone, fn: cur.fn, i }; }
const _f = new THREE.Vector3(), _w = new THREE.Vector3();
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.updateMatrixWorld(); }
function frame(t) {
  const prev = camState(t - 1 / 60); placeCam(prev); const prevVP = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  post.uniforms.flash.value = 0; S.night = 0;
  const st = camState(t); placeCam(st); st.fn(t);                  // segunda pasada con la cámara ya colocada: los rótulos miran a la cámara buena
  for (const k in zones) zones[k].visible = k === st.zone;
  scene.environmentIntensity = st.zone === 'mouth' ? 0.42 : 0.5;
  post.uniforms.white.value = whiteAt(t); post.uniforms.night.value = st.zone === 'mouth' ? S.night : 0;
  // desenfoque: cuánto se ha movido en pantalla el punto al que miramos (a su distancia real)
  let dx = 0, dy = 0;
  if (prev.i === st.i) { const dist = st.p.distanceTo(st.l); cam.getWorldDirection(_f); _w.copy(cam.position).addScaledVector(_f, dist).applyMatrix4(prevVP); dx = -_w.x * 0.25; dy = -_w.y * 0.25; const L = Math.hypot(dx, dy), MX = 0.08; if (L > MX) { dx *= MX / L; dy *= MX / L; } }
  return { dir: [dx, dy], fade: 0, vig: 0.34 };
}
function blurPass(src, dst, dx, dy) { quad.material = blurM; blurM.uniforms.tA.value = src.texture; blurM.uniforms.d.value.set(dx, dy); renderer.setRenderTarget(dst); renderer.render(quadScene, quadCam); }
function drawFrame(st, t) {
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  quad.material = brightM; brightM.uniforms.tA.value = rtA.texture; renderer.setRenderTarget(rtB[0]); renderer.render(quadScene, quadCam);
  blurPass(rtB[0], rtB[1], 1 / BW, 0); blurPass(rtB[1], rtB[0], 0, 1 / BH);
  blurPass(rtB[0], rtC[1], 2 / BW, 0); blurPass(rtC[1], rtC[0], 0, 2 / BH); blurPass(rtC[0], rtC[1], 3 / BW, 0); blurPass(rtC[1], rtC[0], 0, 3 / BH);
  quad.material = post; post.uniforms.tA.value = rtA.texture; post.uniforms.tB.value = rtB[0].texture; post.uniforms.tC.value = rtC[0].texture;
  post.uniforms.dir.value.set(st.dir[0], st.dir[1]); post.uniforms.fade.value = st.fade; post.uniforms.vig.value = st.vig; post.uniforms.time.value = t;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
}
window.renderAt = function (t) {
  const st = frame(t);
  if (window.camOverride) { window.camOverride(cam, v3); st.dir = [0, 0]; }
  drawFrame(st, t);
  return true;
};
// portada: la boca abierta llena de bacterias de colores, de frente (sin cepillo), algo baja para dejar sitio al título
window.renderCover = function () {
  const t = Number(window.COVER_T || K.estropeas + 1.5), st = frame(t);   // las bacterias bailando, antes del «?»
  cam.fov = 30; cam.updateProjectionMatrix(); cam.position.set(0, 0.25, 10.6); cam.up.set(0, 1, 0); cam.lookAt(0, 0.45, 0); cam.updateMatrixWorld();
  post.uniforms.white.value = 0; post.uniforms.night.value = 0; st.dir = [0, 0]; drawFrame(st, t);
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '800' }),
    new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-SemiBold.otf)`, { weight: '600' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  WORDS = lines.flatMap(l => l.words.map(w => ({ ...w, n: norm(w.w) })));
  END = lines[lines.length - 1].end + 1.2;
  K = {
    cepillas: at('cepillas'), perfecto: at('perfecto'), ultimo: at('ultimo'), segundo: at('segundo'), estropeas: at('estropeas'), seguramente: at('seguramente'), noche1: at('noche', 1), sabes: at('sabes'), terminar: at('terminar'),
    boca: at('boca'), capa: at('capa'), finisima: at('finisima'), pasta: at('pasta'), fluor1: at('fluor', 1), concentrado: at('concentrado'), fluor2: at('fluor', 2), sigue: at('sigue'), trabajando: at('trabajando'),
    repara: at('repara'), esmalte: at('esmalte'), acidos: at('acidos'), caries: at('caries'), mete: at('mete'), resistente: at('resistente'), acido1: at('=acido', 1),
    reservas: at('reservas'), soltando: at('soltando'), frena: at('frena'), placa: at('placa'), convierten: at('convierten'), azucar: at('azucar'), acido2: at('=acido', 2),
    pero1: at('=pero', 1), gesto: at('gesto'), enjuagas1: at('enjuagas', 1), agua1: at('=agua', 1), agua2: at('=agua', 2), lleva: at('lleva'), fluor4: at('fluor', 4), queda2: at('queda', 2), limpieza: at('limpieza'), proteccion: at('proteccion'),
    escupe: at('escupe'), espuma: at('espuma'), enjuagues: at('enjuagues'), colutorio: at('colutorio'), momento: at('momento'), despues: at('despues'),
    intenta: at('intenta'), comer2: at('=comer', 2), beber: at('beber'), hora: at('=hora'), cepillado: at('cepillado'), importa: at('importa'), dormir: at('dormir'), noche2: at('noche', 2), saliva: at('saliva'), protege: at('protege'), horas: at('horas'),
    cuentame: at('cuentame'), comentarios: at('comentarios'),
  };
  K.dive1 = K.trabajando + 0.62; K.dive2 = K.caries + 0.32; K.out3 = K.pero1 - 0.05;
  SEQ = [{ zone: 'mouth', t0: -1, fn: mouthAt }, { zone: 'tooth', t0: K.dive1, fn: toothAt, trans: 1 }, { zone: 'micro', t0: K.dive2, fn: microAt, trans: 1 }, { zone: 'mouth', t0: K.out3, fn: mouthAt, trans: 1 }];
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.85; }
  buildMouth(); buildTooth(); buildMicro();
  window.K = K; window.SEQ = SEQ;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
