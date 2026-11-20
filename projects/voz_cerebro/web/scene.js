// «Le devolvieron la voz» (kiria.ai, 20-11-2026): implante cerebral que convierte en voz lo que intenta decir una persona con ELA.
// Estilo pedido por Javi (láminas en ref/): fondo negro, holograma de oro y azul, todo muy claro y despacio; «flujo óptico» (estelas de partículas) entre escenas.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { triTable, MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { W, H, clamp, prog, lerp, eo, eio, ss, loadTopo, ringSegments, ll, fatLines, arcPoints } from './lib.js';

// ---------------------------------------------------------------- render, resplandor y acabado
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
const PR = window.PR || 1; renderer.setPixelRatio(PR); renderer.setSize(W, H); document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = false; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.localClippingEnabled = true;
const rtA = new THREE.WebGLRenderTarget(W * PR, H * PR, { type: THREE.HalfFloatType, samples: 4 });
rtA.depthTexture = new THREE.DepthTexture(W * PR, H * PR); rtA.depthTexture.type = THREE.FloatType;
const BLW = Math.round(W * PR / 4), BLH = Math.round(H * PR / 4);
const rtB = [0, 1].map(() => new THREE.WebGLRenderTarget(BLW, BLH, { type: THREE.HalfFloatType }));
const rtC = [0, 1].map(() => new THREE.WebGLRenderTarget(Math.round(BLW / 2), Math.round(BLH / 2), { type: THREE.HalfFloatType }));
// los chorros de motores y cohetes van aparte: a media resolución y sin multimuestreo, y se suman luego a la imagen y al resplandor
const rtF = new THREE.WebGLRenderTarget(Math.round(W * PR / 2), Math.round(H * PR / 2), { type: THREE.HalfFloatType });
const fxScene = new THREE.Scene();
const VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
// profundidad de campo (como un objetivo de cine): desenfoque por disco según la distancia a lo enfocado (de una sola pasada, «bokeh» de Gustafsson)
const rtD = new THREE.WebGLRenderTarget(W * PR, H * PR, { type: THREE.HalfFloatType });
const dofM = new THREE.ShaderMaterial({ uniforms: { tA: { value: null }, tD: { value: null }, focus: { value: 30 }, scale: { value: 0 }, logF: { value: 13 }, px: { value: new THREE.Vector2(1 / (W * PR), 1 / (H * PR)) }, maxR: { value: 18 * PR } },
  vertexShader: VS, depthTest: false,
  fragmentShader: `uniform sampler2D tA, tD; uniform float focus, scale, logF, maxR; uniform vec2 px; varying vec2 vUv;
    float lin(vec2 uv){ return exp2(texture2D(tD, uv).x * logF) - 1.0; }
    float bs(float z){ return clamp(abs(1.0 / focus - 1.0 / max(z, 0.01)) * scale, 0.0, 1.0) * maxR; }
    void main(){ float zc = lin(vUv), cs = bs(zc); vec3 col = texture2D(tA, vUv).rgb; float tot = 1.0;
      if (scale <= 0.0) { gl_FragColor = vec4(col, 1.0); return; }
      for (int i = 0; i < 56; i++) { float fi = float(i) + 0.5, r = sqrt(fi / 56.0) * maxR, a = fi * 2.39996323;
        vec2 tc = vUv + vec2(cos(a), sin(a)) * px * r; float z = lin(tc), ss = bs(z); if (z > zc) ss = min(ss, cs * 2.0);
        float m = smoothstep(r - 0.5, r + 0.5, ss); col += mix(col / tot, texture2D(tA, tc).rgb, m); tot += 1.0; }
      gl_FragColor = vec4(col / tot, 1.0); }` });
const brightM = new THREE.ShaderMaterial({ uniforms: { tA: { value: null }, tF: { value: null }, px: { value: new THREE.Vector2(1.5 / (W * PR), 1.5 / (H * PR)) }, th: { value: 1.7 } }, vertexShader: VS, depthTest: false,
  fragmentShader: `uniform sampler2D tA, tF; uniform vec2 px; uniform float th; varying vec2 vUv;
    void main(){ vec3 c = vec3(0.); for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) c += texture2D(tA, vUv + vec2(float(i), float(j)) * px).rgb; c = c / 9.0 + texture2D(tF, vUv).rgb; if (any(isnan(c)) || any(isinf(c))) c = vec3(0.);
      float l = max(c.r, max(c.g, c.b)), k = clamp((l - th) / 1.6, 0., 1.); gl_FragColor = vec4(c * k * k, 1.); }` });
const blurM = new THREE.ShaderMaterial({ uniforms: { tA: { value: null }, d: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false,
  fragmentShader: `uniform sampler2D tA; uniform vec2 d; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tA, vUv).rgb * 0.227027;
      c += (texture2D(tA, vUv + d * 1.384615).rgb + texture2D(tA, vUv - d * 1.384615).rgb) * 0.316216;
      c += (texture2D(tA, vUv + d * 3.230769).rgb + texture2D(tA, vUv - d * 3.230769).rgb) * 0.070270;
      gl_FragColor = vec4(c, 1.); }` });
// desenfoque de movimiento con el flujo de la cámara (traslación + zoom + giro: campo afín medido a la distancia a la
// que se mira), resplandor, aberración cromática, ACES, viñeta y grano. El negro se queda negro.
const post = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, tB: { value: null }, tC: { value: null }, tF: { value: null }, tH: { value: null }, m0: { value: new THREE.Vector2() }, a0: { value: new THREE.Vector2() }, J: { value: new THREE.Vector4() },
    fade: { value: 0 }, white: { value: 0 }, fillk: { value: 0 }, fillc: { value: new THREE.Vector3(0.6, 0.85, 0.95) }, vig: { value: 0.38 }, time: { value: 0 }, flash: { value: 0 }, bloom: { value: 0.75 }, ca: { value: 1 }, mbk: { value: 0.8 }, tint: { value: new THREE.Vector3(0, 0, 0) } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D tA, tB, tC, tF, tH; uniform vec2 m0, a0; uniform vec4 J; uniform vec3 tint; uniform float fade, white, vig, time, flash, bloom, ca, mbk, fillk; uniform vec3 fillc; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec2 p = vUv * 2.0 - 1.0, q = p - a0;
      vec2 m = (m0 + vec2(J.x * q.x + J.y * q.y, J.z * q.x + J.w * q.y)) * 0.5 * mbk;
      float L = length(m); if (L > 0.09) m *= 0.09 / L;
      vec2 c = vUv - .5; vec2 cc = c * 0.0035 * ca; vec3 a = vec3(0.), b = vec3(0.);
      // nº de muestras según cuánto se mueve este píxel (1 si está quieto, hasta 24 en los vuelos rápidos)
      int n = int(clamp(ceil(L * 1920.0 / 2.5), 1.0, 24.0)); float fn = float(n);
      for(int i=0;i<24;i++){ if (i >= n) break; float k = n > 1 ? float(i)/(fn-1.0)-0.5 : 0.0; a += texture2D(tA, vUv-m*k).rgb; } a /= fn;
      a.r += (texture2D(tA, vUv+cc).r - texture2D(tA, vUv).r) * 0.8; a.b += (texture2D(tA, vUv-cc).b - texture2D(tA, vUv).b) * 0.8;
      int nb = n < 6 ? n : 6; float fb = float(nb);
      for(int i=0;i<6;i++){ if (i >= nb) break; float k = nb > 1 ? float(i)/(fb-1.0)-0.5 : 0.0; vec2 u=vUv-m*k; b += texture2D(tB, u).rgb * 0.8 + texture2D(tC, u).rgb * 1.15; } b /= fb;
      a += texture2D(tF, vUv).rgb; a += b * bloom;
      a = mix(a, vec3(0.0), fade); a += flash; a += tint;
      a = clamp((a*(2.51*a+0.03))/(a*(2.43*a+0.59)+0.14),0.,1.); a = pow(a, vec3(1.0/2.2));
      float lu = dot(a, vec3(0.2126,0.7152,0.0722));
      a += vec3(-0.012, 0.010, 0.032) * (1.0 - lu) * (1.0 - lu) + vec3(0.035, 0.012, -0.022) * lu * lu;   // sombras frías, luces cálidas
      a = mix(vec3(lu), a, 1.16); a = mix(a, a*a*(3.0-2.0*a), 0.18);
      vec2 d = c*vec2(1.0,0.5625); a *= 1.0 - vig*smoothstep(0.25,0.92,length(d)*1.6);
      a += (h(vUv*vec2(1080.,1920.) + fract(time*7.13)*91.7) - 0.5) * 0.014 * (0.35 + lu);
      if (any(isnan(a))) a = vec3(0.);
      a = mix(a, fillc, fillk);                                                                          // velo de color (entrar en el agua, el calor)
      vec4 hu = texture2D(tH, vUv); a = mix(a, hu.rgb, hu.a);
      a = mix(a, vec3(1.0), white);
      gl_FragColor = vec4(clamp(a,0.,1.), 1.0); }`,
  depthTest: false,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post), quadScene = new THREE.Scene(); quadScene.add(quad);
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const cam = new THREE.PerspectiveCamera(34, W / H, 0.01, 400); cam.layers.enable(1);
const S = {}; window.S = S; window.cam = cam; window.SCN = scene;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const env = (t, t0, t1, fi = 0.3, fo = 0.3) => (t < t0 || t > t1 ? 0 : Math.min(eo(prog(t, t0, fi)), 1 - prog(t, t1 - fo, fo)));
const hash = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// azar de verdad para nubes de puntos (hash() con índices seguidos dibuja rayas y columnas)
const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (draw) draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { c, g }; return t; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function rrShape(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
function rbox(w, h, d, m, r = 0.06) {   // caja de bordes redondeados (planta w × h, grosor d en z) que mide exactamente w × h × d
  const rz = Math.min(r, d * 0.45), b = Math.min(r * 0.9, rz, w * 0.45, h * 0.45);
  const s = rrShape(w - 2 * b, h - 2 * b, Math.max(0.0001, Math.min(r - b, (w - 2 * b) * 0.5, (h - 2 * b) * 0.5)));
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.0005, d - 2 * rz), bevelEnabled: true, bevelSize: b, bevelThickness: rz, bevelSegments: 3, curveSegments: 8 });
  g.translate(0, 0, -Math.max(0.0005, d - 2 * rz) / 2); const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
}

// ---------------------------------------------------------------- tiempos (palabras de la voz)
let WORDS = [], END = 71.2, VENV = [];
const norm = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
let K = {};
const voice = t => { const i = t * 100; if (!VENV.length || i < 0 || i >= VENV.length - 1) return 0; const a = Math.floor(i); return lerp(VENV[a], VENV[a + 1], i - a); };

// ---------------------------------------------------------------- líneas gruesas (grosor en píxeles) para aristas, campo y cotas
const LMS = [];
function lineMat(color, width = 1.6, opacity = 1, dashed = false) {
  const m = new LineMaterial({ color, linewidth: width, transparent: true, opacity, depthWrite: false, dashed, dashSize: 0.02, gapSize: 0.03, worldUnits: false, toneMapped: false });
  m.resolution.set(W * PR, H * PR); LMS.push(m); return m;
}
// aristas de una malla (estilo plano técnico): se añaden como hijo de la malla
function edges(mesh, color = 0xdfe6ee, width = 1.3, thresh = 28, opacity = 0) {
  const eg = new THREE.EdgesGeometry(mesh.geometry, thresh), g = new LineSegmentsGeometry().fromEdgesGeometry(eg);
  const l = new LineSegments2(g, lineMat(color, width, opacity)); l.renderOrder = 3; mesh.add(l); mesh.userData.edges = l; return l;
}
function polyline(pts, mat) { const g = new LineGeometry(); g.setPositions(pts.flatMap(p => [p.x, p.y, p.z])); const l = new Line2(g, mat); l.computeLineDistances(); l.renderOrder = 4; return l; }
// ---------------------------------------------------------------- utilidades de cámara y animación
// interpolación cúbica monótona (Fritsch–Carlson) con los tiempos reales: suave y sin pasarse nunca de largo.
function mono(t, T, Y) {
  const n = T.length; if (t <= T[0]) return Y[0]; if (t >= T[n - 1]) return Y[n - 1];
  let i = 0; while (t > T[i + 1]) i++;
  const d = k => (Y[k + 1] - Y[k]) / (T[k + 1] - T[k]), hh = k => T[k + 1] - T[k];
  const m = k => { if (k <= 0 || k >= n - 1) return 0; const a = d(k - 1), b = d(k); if (a * b <= 0) return 0; const h0 = hh(k - 1), h1 = hh(k); return 3 * (h0 + h1) / ((2 * h1 + h0) / a + (h1 + 2 * h0) / b); };
  const h = hh(i), u = (t - T[i]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * Y[i] + (u3 - 2 * u2 + u) * h * m(i) + (-2 * u3 + 3 * u2) * Y[i + 1] + (u3 - u2) * h * m(i + 1);
}
// cámara por claves: [[t, [x,y,z] posición, [x,y,z] mira, fov?, roll?], …]
function camKeys(t, KS) {
  const T = KS.map(k => k[0]), comp = (j, c) => mono(t, T, KS.map(k => k[j][c]));
  return { p: v3(comp(1, 0), comp(1, 1), comp(1, 2)), l: v3(comp(2, 0), comp(2, 1), comp(2, 2)), f: mono(t, T, KS.map(k => k[3] || 34)), roll: mono(t, T, KS.map(k => k[4] || 0)) };
}
const keyed = (t, KS) => mono(t, KS.map(k => k[0]), KS.map(k => k[1]));     // valor escalar por claves
const sm5 = x => x * x * x * (x * (x * 6 - 15) + 10);
const win = (t, t0, d) => sm5(clamp((t - t0) / d));                           // 0→1 suave entre t0 y t0+d
const pop = (t, t0, d = 0.35) => { const u = clamp((t - t0) / d); if (u <= 0) return 0; if (u >= 1) return 1; return 1 + Math.sin(u * Math.PI * 1.15) * (1 - u) * 0.55 + (eo(u) - 1); }   // aparece con rebote
const pops = (t, t0, d = 0.35) => Math.max(0.0001, pop(t, t0, d));
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler();
function wpos(o, out = new THREE.Vector3()) { o.updateWorldMatrix(true, false); return out.setFromMatrixPosition(o.matrixWorld); }

// ---------------------------------------------------------------- materiales
const plastic = (c, r = 0.22) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06 });
const metal = (c = 0xd8dde6, r = 0.18) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 1 });
const paint = (c, r = 0.3, cc = 1) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: 0.08, clearcoat: cc, clearcoatRoughness: 0.12 });
const glowM = (c, i = 2.5) => new THREE.MeshStandardMaterial({ color: 0x050505, emissive: c, emissiveIntensity: i, roughness: 0.5 });
const basicGlow = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
const PL = { yellow: 0xf2b415, orange: 0xff6a2b, red: 0xff3b4e, blue: 0x3d8bff, sky: 0x46b4ff, green: 0x19d98a, teal: 0x22c0b0, violet: 0x8a5cff, pink: 0xff6fb5, white: 0xf3f5f9, navy: 0x1b2a4a, dark: 0x1a1d24, steel: 0xc9ced6 };
const MAT = {};
function mats() {
  for (const k in PL) MAT[k] = plastic(PL[k], 0.2);
  MAT.steel = metal(0xd2d7df, 0.22); MAT.dsteel = metal(0x7c8592, 0.35); MAT.gold = metal(0xffc861, 0.2); MAT.copper = metal(0xe08a52, 0.25); MAT.ti = metal(0xb8bcc4, 0.3);
  MAT.rubber = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.7 });
  MAT.black = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.55, metalness: 0.2 });
  MAT.glass = new THREE.MeshPhysicalMaterial({ color: 0x0d1626, roughness: 0.04, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.02 });
}

// ---------------------------------------------------------------- piezas comunes
function cyl(rt, rb, h, m, seg = 32) { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); c.castShadow = true; c.receiveShadow = true; return c; }
function sph(r, m, ws = 24, hs = 16) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), m); s.castShadow = true; return s; }
function tube(pts, r, m, seg, closed = false, rs = 10) { const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), seg || pts.length * 6, r, rs, closed), m); t.castShadow = true; return t; }
function bar(a, b, r, m, seg = 8) { const d = b.clone().sub(a), L = d.length(); const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), m); c.position.copy(a).add(b).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize()); c.castShadow = true; return c; }
function arrow3(len, m, r = 0.05) {         // flecha gruesa a lo largo de +y (base en 0)
  const g = new THREE.Group();
  const sh = cyl(r, r, 1, m, 16); g.add(sh); const hd = new THREE.Mesh(new THREE.ConeGeometry(r * 2.4, r * 4.5, 24), m); hd.castShadow = true; g.add(hd);
  g.userData.setLen = L => { const hl = r * 4.5, s = Math.max(0.001, L - hl); sh.scale.y = s; sh.position.y = s / 2; hd.position.y = s + hl / 2; hd.visible = L > 0.01; sh.visible = L > 0.01; };
  g.userData.setLen(len); return g;
}
function lathe(prof, seg = 48, m, phiStart = 0, phiLen = Math.PI * 2) {      // (sin puntos repetidos seguidos: darían normales NaN → píxeles negros que el resplandor convierte en cuadrados)
  const pts = []; for (const [r, y] of prof) { const q = new THREE.Vector2(r, y); if (!pts.length || q.distanceTo(pts[pts.length - 1]) > 1e-6) pts.push(q); }
  const g = new THREE.Mesh(new THREE.LatheGeometry(pts, seg, phiStart, phiLen), m); g.castShadow = true; g.receiveShadow = true; return g; }
function label(txt, { size = 80, color = '#ffffff', w = 1.6, weight = 800, pill = false, font = 'Inter', bg = 'rgba(20,22,26,.82)' } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = `${weight} ${size}px ${font}`;
  const tw = g.measureText(txt).width; c.width = Math.ceil(tw + size * (pill ? 1.4 : 0.6)); c.height = Math.ceil(size * (pill ? 1.9 : 1.4));
  g.font = `${weight} ${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (pill) { g.fillStyle = bg; rr(g, 2, 2, c.width - 4, c.height - 4, c.height / 2 - 2); g.fill(); }
  g.fillStyle = color; g.fillText(txt, c.width / 2, c.height / 2 + size * 0.04);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / c.width), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 9; return m;
}
function pill(txt, color = '#ffffff', bg = 'rgba(16,20,30,.88)', w = 1.4, size = 70) { return label(txt, { size, w, pill: true, color, bg }); }
// rótulo de dos líneas (arriba pequeño y de color, abajo grande y blanco) en una pastilla
function pill2(l1, l2, c1 = '#9fd0ff', w = 1.0) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), s1 = 54, s2 = 72; g.font = `800 ${s2}px Inter`; const tw = Math.max(g.measureText(l2).width, (g.font = `800 ${s1}px Inter`, g.measureText(l1).width));
  c.width = Math.ceil(tw + 110); c.height = 230; g.fillStyle = 'rgba(14,18,28,.9)'; rr(g, 2, 2, c.width - 4, c.height - 4, 46); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${s1}px Inter`; g.fillStyle = c1; g.fillText(l1, c.width / 2, 70); g.font = `900 ${s2}px Inter`; g.fillStyle = '#ffffff'; g.fillText(l2, c.width / 2, 152);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / c.width), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })); m.renderOrder = 9; return m;
}
function lookLab(l, k, pos) { l.visible = k > 0.01; l.material.opacity = Math.min(1, k); if (pos) l.position.copy(pos); l.quaternion.copy(cam.quaternion); if (l.parent) { const q = new THREE.Quaternion(); l.parent.getWorldQuaternion(q); l.quaternion.premultiply(q.invert()); } }
let _starT = null;
function starTex0() { return _starT || (_starT = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); })); }
function sparks(Z, n = 80, color = 0xffe08a, size = 0.045) { const p = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)), new THREE.PointsMaterial({ color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: starTex0() })); Z.add(p); p.userData.n = n; p.frustumCulled = false; return p; }
function burst(p, c, t, t0, spread = 1, life = 0.6, loop = true, grav = 3) {
  const a = p.geometry.attributes.position.array, n = p.userData.n;
  for (let i = 0; i < n; i++) { let tt = (t - t0) + hash(i) * life * (loop ? 1 : 0.15); tt = loop ? tt % life : Math.max(0, tt); const th = hash(i * 3) * Math.PI * 2, ph = (hash(i * 7) - 0.3) * 1.6, v = (1.2 + hash(i * 11) * 2.2) * spread;
    a[i * 3] = c.x + Math.cos(th) * Math.cos(ph) * v * tt; a[i * 3 + 1] = c.y + Math.sin(ph) * v * tt - grav * tt * tt; a[i * 3 + 2] = c.z + Math.sin(th) * Math.cos(ph) * v * tt; }
  p.geometry.attributes.position.needsUpdate = true;
}
const setOp = (g, a) => g.traverse(o => { if (o.material && !o.userData.keepOp) { o.material.transparent = a < 0.999 || !!o.userData.tr; o.material.opacity = a * (o.userData.op0 ?? 1); o.material.depthWrite = a > 0.5 && !o.userData.tr; } });
const show = (o, k) => { o.visible = k > 0.002; if (o.visible) o.scale.setScalar(Math.max(0.0001, k) * (o.userData.s0 || 1)); };
function facePlane(tex, w, h) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.35, metalness: 0 })); return m; }
// segmentos sueltos (líneas gruesas) que se pueden mover cada fotograma
function segSet(n, color, width = 2, opacity = 1) {
  const g = new LineSegmentsGeometry(), arr = new Float32Array(n * 6); g.setPositions(arr);
  const l = new LineSegments2(g, lineMat(color, width, opacity)); l.frustumCulled = false; l.renderOrder = 4;
  l.userData = { arr, n, set(i, a, b) { arr.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); }, flush() { const ib = g.attributes.instanceStart.data; ib.array.set(arr); ib.needsUpdate = true; } };
  return l;
}
function drawLine(pts, color, width = 2, opacity = 1) { const l = polyline(pts, lineMat(color, width, opacity)); l.userData.nseg = pts.length - 1; l.frustumCulled = false; return l; }
function drawK(l, k) { const n = l.userData.nseg, m = Math.floor(n * clamp(k)); l.geometry.instanceCount = m; l.visible = m > 0; }

// ---------------------------------------------------------------- maniquí articulado (plástico brillante), birrete, diploma, interrogación (de «Industrial»)
function makeDoll(m) {
  const d = new THREE.Group(), J = {};
  const cap = (r, h) => new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 6, 14), m);
  const pivot = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  J.hip = pivot(d, 0, 0.5, 0);
  const pel = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), m); pel.scale.set(1.3, 0.8, 0.9); J.hip.add(pel);
  J.chest = pivot(J.hip, 0, 0.05, 0); const tor = cap(0.085, 0.22); tor.position.y = 0.17; tor.scale.set(1.25, 1, 0.8); J.chest.add(tor);
  J.neck = pivot(J.chest, 0, 0.36, 0); const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 18), m); head.scale.set(0.9, 1.1, 0.95); head.position.y = 0.08; J.neck.add(head); J.head = head;
  for (const sd of [-1, 1]) {
    const sh = pivot(J.chest, sd * 0.13, 0.31, 0); const ua = cap(0.032, 0.14); ua.position.y = -0.09; sh.add(ua);
    const el = pivot(sh, 0, -0.19, 0); const la = cap(0.028, 0.13); la.position.y = -0.085; el.add(la);
    const hand = pivot(el, 0, -0.19, 0); const hm = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), m); hand.add(hm);
    const hp = pivot(J.hip, sd * 0.07, -0.03, 0); const ul = cap(0.042, 0.18); ul.position.y = -0.12; hp.add(ul);
    const kn = pivot(hp, 0, -0.25, 0); const ll = cap(0.036, 0.17); ll.position.y = -0.11; kn.add(ll);
    J[sd < 0 ? 'shL' : 'shR'] = sh; J[sd < 0 ? 'elL' : 'elR'] = el; J[sd < 0 ? 'hL' : 'hR'] = hand; J[sd < 0 ? 'hpL' : 'hpR'] = hp; J[sd < 0 ? 'knL' : 'knR'] = kn;
  }
  d.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  d.userData.J = J; return d;
}
function birrete() {
  const g = new THREE.Group(), m = plastic(0x14161c, 0.25), gold = plastic(0xffc21a, 0.2);
  const board = rbox(1, 0.06, 1, m, 0.02); board.position.y = 0.3; g.add(board);
  const capb = cyl(0.36, 0.4, 0.3, m, 40); capb.position.y = 0.14; g.add(capb);
  const btn = cyl(0.05, 0.05, 0.03, gold, 16); btn.position.y = 0.345; g.add(btn);
  const cord = tube([v3(0, 0.345, 0), v3(0.25, 0.345, 0.25), v3(0.46, 0.34, 0.46)], 0.012, gold, 12); g.add(cord);
  const hang = tube([v3(0.46, 0.34, 0.46), v3(0.5, 0.15, 0.5), v3(0.52, -0.05, 0.5)], 0.012, gold, 12); g.add(hang);
  const tas = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 12), gold); tas.position.set(0.52, -0.1, 0.5); g.add(tas);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
function diploma() {
  const g = new THREE.Group(); const p = cyl(0.045, 0.045, 0.36, plastic(0xfaf3e0, 0.4), 24); p.rotation.z = Math.PI / 2; g.add(p);
  const rib = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.012, 8, 24), plastic(PL.red, 0.25)); rib.rotation.y = Math.PI / 2; g.add(rib); return g;
}
function qmark(m) {
  const g = new THREE.Group(), pts = [];
  for (let i = 0; i <= 18; i++) { const a = lerp(Math.PI * 0.92, -Math.PI * 0.42, i / 18); pts.push(v3(Math.cos(a) * 0.15, 0.2 + Math.sin(a) * 0.15, 0)); }
  pts.push(v3(0.02, -0.02, 0), v3(0, -0.08, 0)); g.add(tube(pts, 0.042, m, 60));
  const dot = sph(0.05, m); dot.position.y = -0.21; g.add(dot); return g;
}

// ---------------------------------------------------------------- luces (siempre las mismas: no cambia el número y no se recompilan los sombreadores)
function buildRig() {
  const key = new THREE.SpotLight(0xfff3e6, 260, 60, 0.55, 0.65, 1.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.radius = 4; key.shadow.camera.near = 0.5; key.shadow.camera.far = 60;
  scene.add(key); scene.add(key.target);
  const a = new THREE.PointLight(0x37c6ff, 40, 22, 1.6), b = new THREE.PointLight(0xff7a3a, 34, 22, 1.6), f = new THREE.PointLight(0xbfdcff, 16, 26, 1.5);
  const sun = new THREE.DirectionalLight(0xffd2a8, 0); sun.position.set(-40, 18, -30); scene.add(sun); scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0x8fb4ff, 0x2a1d22, 0.0); scene.add(hemi);
  scene.add(a, b, f); S.rig = { key, a, b, f, sun, hemi };
}
// coloca las luces alrededor de un foco: c = centro, yaw = hacia dónde mira la escena, k = tamaño, pw = potencia
function rigAt(c, yaw = 0, k = 1, pw = 1, angle = 0.55) {
  const R = S.rig, rot = (x, z) => v3(c.x + x * Math.cos(yaw) + z * Math.sin(yaw), 0, c.z - x * Math.sin(yaw) + z * Math.cos(yaw));
  const kp = rot(-3 * k, 6 * k); R.key.position.set(kp.x, c.y + 9 * k, kp.z); R.key.target.position.copy(c); R.key.intensity = 150 * pw * k * k; R.key.distance = 60 * k; R.key.angle = angle;
  R.key.shadow.camera.far = 40 * k; R.key.shadow.camera.near = 0.3 * k;
  const ap = rot(-5 * k, -3 * k); R.a.position.set(ap.x, c.y + 3 * k, ap.z); R.a.intensity = 30 * pw * k * k; R.a.distance = 22 * k;
  const bp = rot(5 * k, -3 * k); R.b.position.set(bp.x, c.y + 3.5 * k, bp.z); R.b.intensity = 26 * pw * k * k; R.b.distance = 22 * k;
  const fp = rot(0, 9 * k); R.f.position.set(fp.x, c.y + 4 * k, fp.z); R.f.intensity = 16 * pw * k * k; R.f.distance = 26 * k;
  R.key.target.updateMatrixWorld();
}

// ---------------------------------------------------------------- estilo plano técnico (de «Civil»): caras oscuras con aristas blancas
const DARK = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.82, metalness: 0.05 });
const DARK2 = new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.8, metalness: 0.05 });
const TEAL = 0x62e3d4, AMBER = 0xffb547, RED = 0xff5247, EDGE = 0xe6ecf2;
function solid(geo, m = DARK, ew = 1.5, ec = EDGE, eo2 = 1) { const s = new THREE.Mesh(geo, m); s.castShadow = true; s.receiveShadow = true; edges(s, ec, ew, 28, eo2); return s; }
function bx(w, h, d, m, ew, ec) { return solid(new THREE.BoxGeometry(w, h, d), m, ew, ec); }
function textPlane(w, h, draw, px = 512) { const t = canvasTex(px, Math.round(px * h / w), draw); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); m.renderOrder = 5; return m; }
const glowLine = (c, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
// ---------------------------------------------------------------- HUD técnico (lienzo 2D encima del 3D, siempre nítido)
const hudC = document.createElement('canvas'); hudC.width = W * PR; hudC.height = H * PR;
hudC.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none`;
// (no se pone en la página: se compone dentro del último pase de WebGL, así la captura no puede coger un HUD viejo)
const hg = hudC.getContext('2d', { willReadFrequently: true });      // lienzo en memoria (CPU): al subirlo a WebGL siempre lleva lo último dibujado
const hudTex = new THREE.CanvasTexture(hudC); hudTex.colorSpace = THREE.NoColorSpace; hudTex.generateMipmaps = false; hudTex.minFilter = THREE.LinearFilter;
const MONO = '"SpaceMono","DejaVuMono",monospace';
const HC = { white: '#EEF2F6', grey: '#9AA1AB', dim: '#5C636D', amber: '#FFB547', teal: '#62E3D4', red: '#FF5247', green: '#7CF0A9' };
const _pv = new THREE.Vector3();
function proj(v) { _pv.copy(v).project(cam); return { x: (_pv.x + 1) / 2 * W, y: (1 - _pv.y) / 2 * H, ok: _pv.z < 1 && _pv.z > -1 }; }
let HFONT = MONO, HW = [700, 400];
function hfont(px, bold = true) { hg.font = `${bold ? HW[0] : HW[1]} ${px}px ${HFONT}`; }
const typed = (txt, k) => txt.slice(0, Math.floor(txt.length * clamp(k) + 0.001));
function hudBegin() { hg.setTransform(PR, 0, 0, PR, 0, 0); hg.clearRect(0, 0, W, H); hg.lineCap = 'round'; hg.lineJoin = 'round'; }
function glowStroke(col, w, blur = 14) { hg.shadowColor = col; hg.shadowBlur = blur; hg.strokeStyle = col; hg.lineWidth = w; }
function noGlow() { hg.shadowBlur = 0; hg.shadowColor = 'transparent'; }

// cabecera fija (como en la referencia): título, sección, dato a la derecha y el «mensaje» pendiente (bucle abierto)
function header(t, sub, msg, a = 1) {
  if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic';
  const tk = clamp((t + 0.6) / 0.7);
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('CARGA INALÁMBRICA', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(sub, 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('FRECUENCIA', 1024, 112);
  hfont(32); hg.fillStyle = HC.amber; hg.fillText('87–205 kHz', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('ESTÁNDAR QI', 1024, 178);
  if (msg) {        // [ MENSAJE · ??? ] arriba a la derecha hasta la respuesta
    const { txt, col, k, blink } = msg, on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = a * clamp(k); hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath();
    hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
    hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
    hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y);
  }
  hg.restore();
}

// etiqueta con línea guía: punto en el objeto → codo → texto (se dibuja la línea y luego se teclea el texto)
function callout(anchor, txt, sub, k, o = {}) {
  if (k <= 0.002) return null;
  const A = anchor.isVector3 ? proj(anchor) : anchor; if (anchor.isVector3 && !A.ok) return null;
  let dx = o.dx ?? 150, dy = o.dy ?? -110, right = (o.side ?? dx) >= 0;
  const col = o.color || HC.white, len = o.len ?? 50, size = o.size || 29, subSize = o.subSize || 20;
  hg.save(); hg.letterSpacing = '3px'; hfont(size); let tw = hg.measureText(txt).width; if (sub) { hfont(subSize, false); tw = Math.max(tw, hg.measureText(sub).width); } hg.restore();
  // que el texto no se salga: si no cabe por un lado, se da la vuelta; y nunca invade los subtítulos de arriba
  const fits = r => { const tx = A.x + (r ? Math.abs(dx) : -Math.abs(dx)) + (r ? len + 12 : -len - 12); return r ? tx + tw < W - 30 : tx - tw > 30; };
  if (!fits(right) && fits(!right)) { right = !right; dx = -dx; }
  dx = right ? Math.abs(dx) : -Math.abs(dx);
  let Ey = clamp(A.y + dy, 470, 1500); dy = Ey - A.y;
  const E = { x: A.x + dx, y: Ey }; let T = { x: E.x + (right ? len : -len), y: E.y };
  const over = right ? T.x + 12 + tw - (W - 30) : 30 - (T.x - 12 - tw); if (over > 0) { E.x -= right ? over : -over; T.x -= right ? over : -over; dx = E.x - A.x; }
  const kl = clamp(k / 0.45), kt = clamp((k - 0.3) / 0.7), al = o.a ?? 1;
  hg.save(); hg.globalAlpha = al * (o.fade ?? 1); hg.strokeStyle = col; hg.fillStyle = col; hg.lineWidth = o.lw || 2.2;
  hg.beginPath(); hg.arc(A.x, A.y, 5 * eo(clamp(k / 0.2)), 0, 7); hg.fill();
  hg.globalAlpha *= 0.55; hg.beginPath(); hg.arc(A.x, A.y, 13 * eo(clamp(k / 0.3)), 0, 7); hg.stroke(); hg.globalAlpha = al * (o.fade ?? 1);
  const L1 = Math.hypot(dx, dy), L2 = len, Lt = (L1 + L2) * eo(kl);
  hg.beginPath(); hg.moveTo(A.x, A.y);
  if (Lt <= L1) hg.lineTo(A.x + dx * Lt / L1, A.y + dy * Lt / L1);
  else { hg.lineTo(E.x, E.y); hg.lineTo(E.x + (T.x - E.x) * (Lt - L1) / L2, E.y); }
  hg.stroke();
  if (kt > 0) {
    hg.textAlign = right ? 'left' : 'right'; hg.textBaseline = 'middle'; hg.letterSpacing = '3px'; hfont(size); hg.fillStyle = col;
    hg.shadowColor = o.light ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,.9)'; hg.shadowBlur = o.light ? 0 : 8;
    const tx = T.x + (right ? 12 : -12);
    if (o.bg) { hg.save(); hg.shadowBlur = o.light ? 18 : 0; hg.shadowColor = 'rgba(60,40,30,.18)'; hg.fillStyle = o.light ? 'rgba(255,255,255,.93)' : 'rgba(0,0,0,.72)'; const bh = sub ? size + subSize * 1.7 + 14 : size * 1.55; rr(hg, (right ? tx : tx - tw) - 14, T.y - size * 0.78, tw + 28, bh, 10); hg.fill(); hg.restore(); }
    hg.fillText(typed(txt, kt), tx, T.y - (sub ? 3 : 0));
    if (sub) { hfont(subSize, false); hg.fillStyle = o.subCol || HC.grey; hg.fillText(typed(sub, clamp(kt * 1.4 - 0.4)), tx, T.y + size * 0.5 + subSize * 0.62); }
  }
  hg.restore(); return { A, E, T };
}
// texto grande (titulares técnicos): aparece tecleado con un parpadeo de arranque
function bigText(txt, x, y, size, col, k, o = {}) {
  if (k <= 0.002) return;
  hg.save(); hg.globalAlpha = (o.a ?? 1) * clamp(k * 3) * (k < 0.25 && Math.sin(k * 140) < 0 ? 0.5 : 1);
  hg.textAlign = o.align || 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = (o.ls ?? Math.round(size * 0.14)) + 'px'; hfont(size, o.bold ?? true);
  if (o.glow) { hg.shadowColor = col; hg.shadowBlur = o.glow; }
  const s = typed(txt, o.type === false ? 1 : clamp(k * 1.6));
  if (o.halo) { hg.save(); hg.shadowColor = 'rgba(255,255,255,1)'; hg.shadowBlur = o.halo; hg.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 2; i++) { if (o.scale) { hg.save(); hg.translate(x, y); hg.scale(o.scale, o.scale); hg.fillText(s, 0, 0); hg.restore(); } else hg.fillText(s, x, y); } hg.restore(); }
  if (o.dark) { hg.save(); hg.shadowColor = 'rgba(0,0,0,.95)'; hg.shadowBlur = o.dark; hg.fillStyle = 'rgba(0,0,0,.55)'; for (let i = 0; i < 2; i++) { if (o.scale) { hg.save(); hg.translate(x, y); hg.scale(o.scale, o.scale); hg.fillText(s, 0, 0); hg.restore(); } else hg.fillText(s, x, y); } hg.restore(); if (o.glow) { hg.shadowColor = col; hg.shadowBlur = o.glow; } }
  hg.fillStyle = col;
  if (o.scale) { hg.translate(x, y); hg.scale(o.scale, o.scale); hg.fillText(s, 0, 0); } else hg.fillText(s, x, y);
  hg.restore();
}
// corchetes de enfoque alrededor de un punto
function brackets(P, w, h, k, col = HC.white, lw = 2) {
  if (k <= 0.002 || !P) return;
  const e = eo(clamp(k)), ww = w * (1.6 - 0.6 * e), hh = h * (1.6 - 0.6 * e), c = Math.min(ww, hh) * 0.22;
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.strokeStyle = col; hg.lineWidth = lw; hg.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = P.x + sx * ww / 2, y = P.y + sy * hh / 2; hg.moveTo(x - sx * c, y); hg.lineTo(x, y); hg.lineTo(x, y - sy * c); }
  hg.stroke(); hg.restore();
}
// cota vertical entre dos puntos de pantalla con flechas y rótulo
function dimV(P1, P2, txt, k, col = HC.white, xoff = 0) {
  if (k <= 0.002) return;
  const x = (P1.x + P2.x) / 2 + xoff, y1 = P1.y, y2 = P2.y, e = eo(clamp(k / 0.6)), ym = (y1 + y2) / 2;
  hg.save(); hg.strokeStyle = col; hg.fillStyle = col; hg.lineWidth = 2;
  const a = ym + (y1 - ym) * e, b = ym + (y2 - ym) * e;
  hg.beginPath(); hg.moveTo(x, a); hg.lineTo(x, b); hg.stroke();
  for (const [yy, s] of [[a, Math.sign(y1 - ym)], [b, Math.sign(y2 - ym)]]) { hg.beginPath(); hg.moveTo(x, yy); hg.lineTo(x - 7, yy - s * 12); hg.lineTo(x + 7, yy - s * 12); hg.closePath(); hg.fill();
    hg.beginPath(); hg.moveTo(x - 22, yy); hg.lineTo(x + 22, yy); hg.stroke(); }
  if (txt) { hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.letterSpacing = '3px'; hfont(24); hg.fillText(typed(txt, clamp((k - 0.4) / 0.6)), x + 36, ym); }
  hg.restore();
}
// onda de voz entre dos puntos (el móvil «habla» con el cargador)
function waveform(A, B, amp, t, a = 1, col = HC.teal) {
  if (a <= 0.01 || !A || !B) return;
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy); if (L < 4) return;
  const nx = -dy / L, ny = dx / L, N = 140;
  const path = () => { hg.beginPath(); for (let i = 0; i <= N; i++) { const u = i / N, taper = Math.pow(Math.sin(Math.PI * u), 0.8);
    const w = Math.sin(u * 38 - t * 31) * 0.55 + Math.sin(u * 91 + t * 47) * 0.3 + Math.sin(u * 17 - t * 13) * 0.35;
    const o = amp * taper * w; const x = A.x + dx * u + nx * o, y = A.y + dy * u + ny * o; i ? hg.lineTo(x, y) : hg.moveTo(x, y); } };
  hg.save(); hg.globalAlpha = a * 0.35; glowStroke(col, 9, 24); path(); hg.stroke();
  hg.globalAlpha = a; glowStroke(col, 2.6, 10); path(); hg.stroke(); noGlow();
  hg.globalAlpha = a * 0.9; hg.strokeStyle = '#ffffff'; hg.lineWidth = 1.1; path(); hg.stroke();
  hg.restore();
}
// bocadillo de cómic hecho de líneas técnicas; k2 lo encoge hacia (tx, ty)
function bubble(P, k, k2, t, tx, ty) {
  if (k <= 0.002 || !P) return;
  const e = eo(clamp(k / 0.5)), f = sm5(clamp(k2));
  const cx = lerp(P.x + 150, tx, f), cy = lerp(P.y - 250, ty, f), s = lerp(1, 0.18, f) * (0.6 + 0.4 * e), w = 300 * s, h = 170 * s;
  hg.save(); hg.globalAlpha = clamp(k * 3) * (1 - clamp((k2 - 0.85) / 0.15));
  glowStroke(HC.white, 2.4, 12); hg.fillStyle = 'rgba(0,0,0,.55)';
  rr(hg, cx - w / 2, cy - h / 2, w, h, 28 * s); hg.fill(); hg.stroke();
  if (f < 0.5) { hg.beginPath(); hg.moveTo(cx - w * 0.22, cy + h / 2 - 1); hg.lineTo(lerp(cx - w * 0.33, P.x + 30, 1 - f * 2), lerp(cy + h / 2 + 60 * s, P.y - 40, 1 - f * 2)); hg.lineTo(cx - w * 0.05, cy + h / 2 - 1); hg.stroke(); }
  noGlow(); hg.fillStyle = HC.white; hg.textAlign = 'center'; hg.textBaseline = 'middle';
  hfont(Math.max(8, 92 * s)); hg.letterSpacing = '0px'; hg.fillText('?', cx - 70 * s, cy + 4 * s);
  for (let i = 0; i < 3; i++) { const on = Math.sin(t * 8 - i * 1.2) > 0 ? 1 : 0.3; hg.globalAlpha *= 1; hg.fillStyle = `rgba(238,242,246,${on})`; hg.beginPath(); hg.arc(cx + (5 + i * 36) * s, cy + 6 * s, 8 * s, 0, 7); hg.fill(); }
  hg.restore();
}
// terminal de la conversación TX ⇄ RX (abajo a la izquierda)
function terminal(lines, t, a, title = 'ENLACE  TX ⇄ RX') {
  if (a <= 0.01) return;
  const x = 56, y = 1268, w = 560, lh = 44, vis = lines.filter(l => t >= l.t0).slice(-5), h = 76 + lh * 5;
  hg.save(); hg.globalAlpha = a; hg.fillStyle = 'rgba(0,0,0,.62)'; hg.strokeStyle = 'rgba(238,242,246,.28)'; hg.lineWidth = 1.5;
  rr(hg, x, y, w * eo(clamp(a * 1.4)), h, 6); hg.fill(); hg.stroke();
  hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.letterSpacing = '3px'; hfont(17, false); hg.fillStyle = HC.grey; hg.fillText(title, x + 22, y + 30);
  hg.fillStyle = 'rgba(238,242,246,.2)'; hg.fillRect(x + 22, y + 52, w - 44, 1);
  vis.forEach((l, i) => {
    const kk = clamp((t - l.t0) / (l.d || 0.32)), yy = y + 82 + i * lh;
    hfont(24); hg.fillStyle = l.who === 'TX' ? HC.teal : HC.amber; hg.fillText(l.who, x + 22, yy);
    hg.fillStyle = HC.grey; hg.fillText('›', x + 78, yy);
    hg.fillStyle = l.col || HC.white; const s = typed(l.txt, kk); hg.fillText(s, x + 106, yy);
    if (i === vis.length - 1 && Math.sin(t * 10) > 0) { const tw = hg.measureText(s).width; hg.fillRect(x + 110 + tw, yy - 12, 12, 24); }
  });
  hg.restore();
}
// panel de osciloscopio (abajo a la derecha): fn(u, t) → -1..1
function scope(fn, t, a, title, sub, col = HC.amber, x = 640, y = 1268, w = 384, h = 296) {
  if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.fillStyle = 'rgba(0,0,0,.62)'; hg.strokeStyle = 'rgba(238,242,246,.28)'; hg.lineWidth = 1.5; rr(hg, x, y, w, h, 6); hg.fill(); hg.stroke();
  hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.letterSpacing = '3px'; hfont(17, false); hg.fillStyle = HC.grey; hg.fillText(title, x + 20, y + 30);
  if (sub) { hg.textAlign = 'right'; hfont(17); hg.fillStyle = col; hg.fillText(sub, x + w - 20, y + 30); }
  const gx = x + 20, gy = y + 60, gw = w - 40, gh = h - 84;
  hg.strokeStyle = 'rgba(238,242,246,.12)'; hg.lineWidth = 1; hg.beginPath();
  for (let i = 0; i <= 8; i++) { hg.moveTo(gx + gw * i / 8, gy); hg.lineTo(gx + gw * i / 8, gy + gh); } for (let j = 0; j <= 4; j++) { hg.moveTo(gx, gy + gh * j / 4); hg.lineTo(gx + gw, gy + gh * j / 4); } hg.stroke();
  const draw = () => { hg.beginPath(); for (let i = 0; i <= 260; i++) { const u = i / 260, v = fn(u, t); const px = gx + gw * u, py = gy + gh / 2 - v * gh * 0.42; i ? hg.lineTo(px, py) : hg.moveTo(px, py); } };
  hg.save(); hg.beginPath(); hg.rect(gx, gy, gw, gh); hg.clip();
  glowStroke(col, 2.4, 12); draw(); hg.stroke(); noGlow(); hg.restore();
  hg.restore();
}
// barras horizontales (estilo referencia): [{name, v (0..1), col, txt}]
function hbars(items, t, a, title, x = 640, y = 1268, w = 384) {
  if (a <= 0.01) return;
  const h = 70 + items.length * 74;
  hg.save(); hg.globalAlpha = a; hg.fillStyle = 'rgba(0,0,0,.62)'; hg.strokeStyle = 'rgba(238,242,246,.28)'; hg.lineWidth = 1.5; rr(hg, x, y, w, h, 6); hg.fill(); hg.stroke();
  hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.letterSpacing = '3px'; hfont(17, false); hg.fillStyle = HC.grey; hg.fillText(title, x + 20, y + 30);
  items.forEach((it, i) => {
    const yy = y + 68 + i * 74;
    hfont(19); hg.fillStyle = it.col; hg.textAlign = 'left'; hg.fillText(it.name, x + 20, yy);
    if (it.txt) { hg.textAlign = 'right'; hg.fillText(it.txt, x + w - 20, yy); }
    hg.fillStyle = 'rgba(238,242,246,.12)'; hg.fillRect(x + 20, yy + 18, w - 40, 18);
    hg.fillStyle = it.col; hg.fillRect(x + 20, yy + 18, (w - 40) * clamp(it.v), 18);
    if (it.gap) { hg.fillStyle = 'rgba(255,82,71,.85)'; hg.fillRect(x + 20 + (w - 40) * clamp(it.v), yy + 18, (w - 40) * it.gap, 18); }
  });
  hg.restore();
}
function stamp(txt, x, y, k, col = HC.red, size = 96) {
  if (k <= 0.002) return;
  const s = 1 + 0.6 * (1 - eo(clamp(k / 0.25)));
  hg.save(); hg.globalAlpha = clamp(k * 4); hg.translate(x, y); hg.scale(s, s); hg.rotate(-0.05);
  hfont(size); hg.letterSpacing = Math.round(size * 0.16) + 'px'; hg.textAlign = 'center'; hg.textBaseline = 'middle';
  const tw = hg.measureText(txt).width + size * 0.7, th = size * 1.35;
  glowStroke(col, 5, 22); hg.strokeRect(-tw / 2, -th / 2, tw, th); hg.fillStyle = col; hg.fillText(txt, size * 0.08, 4); noGlow();
  hg.restore();
}
// ---------------------------------------------------------------- flujo óptico: polvo en el espacio que deja estelas según se mueve la cámara
// cada partícula es un cuadrito que va de su posición ahora a su posición vista por la cámara un instante antes:
// al avanzar salen estelas radiales, al girar, en círculo; parada, puntitos que flotan.
const FLOW_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 corner; attribute vec3 ipos; attribute float iseed;
uniform mat4 VP, PVP; uniform vec2 res; uniform float size, bright, time, nearF, farF, drift, rise, riseH, keep;
varying float vA; varying float vS; varying float vT; varying float vLen;
void main(){
  vec3 P = ipos + vec3(sin(time*0.31+iseed*40.), cos(time*0.23+iseed*17.), sin(time*0.27+iseed*9.)) * drift * (0.4 + iseed);
  if (rise > 0.0) P.y = ipos.y + mod(time * rise * (0.4 + iseed) + iseed * 37.0, riseH);   // brasas que suben
  vec4 a = VP * vec4(P,1.), b = PVP * vec4(P,1.);
  if (a.w < nearF * 0.5 || b.w < nearF * 0.25) { gl_Position = vec4(0.,0.,-2.,1.); vA = 0.; vS = 0.; vT = 0.; vLen = 0.; return; }
  vec2 pa = a.xy / a.w * res * 0.5, pb = b.xy / b.w * res * 0.5;
  vec2 d = pb - pa; float L = min(length(d), 700.0);
  vec2 dir = L > 0.01 ? normalize(d) : vec2(1., 0.); vec2 nr = vec2(-dir.y, dir.x);
  float sz = size * (0.55 + iseed * 0.9) * clamp(2.6 / a.w, 0.4, 2.4);
  vec2 px = (corner.x > 0.5 ? pa - dir * sz : pa + dir * (L + sz)) + nr * corner.y * sz;
  gl_Position = vec4(px / (res * 0.5) * a.w, a.z, a.w);
  #include <logdepthbuf_vertex>
  float fog = exp(-a.w * farF), nf = smoothstep(nearF, nearF * 3.0, a.w);
  vA = bright * (0.3 + 0.7 * iseed) * fog * nf * clamp((2.0 * sz) / (L * 0.5 + 2.0 * sz), keep, 1.0);
  vS = corner.x > 0.5 ? -1.0 : (L / sz + 1.0); vT = corner.y; vLen = L / sz;
}`;
const FLOW_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 col; varying float vA; varying float vS; varying float vT; varying float vLen;
void main(){
  #include <logdepthbuf_fragment>
  float ds = max(0., max(-vS, vS - vLen)), dist = length(vec2(ds, vT));
  float a = smoothstep(1.0, 0.2, dist) * vA * mix(1.0, 0.2, clamp(vS / max(vLen, 0.001), 0., 1.));
  if (a < 0.002) discard;
  gl_FragColor = vec4(col * a, a);
}`;
function flowCloud(N, gen, o = {}) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
  g.setAttribute('corner', new THREE.Float32BufferAttribute([1, -1, 1, 1, 0, -1, 0, 1], 2));
  g.setIndex([0, 2, 1, 2, 3, 1]);
  const P = new Float32Array(N * 3), Sd = new Float32Array(N);
  for (let i = 0; i < N; i++) { const p = gen(i); P[i * 3] = p[0]; P[i * 3 + 1] = p[1]; P[i * 3 + 2] = p[2]; Sd[i] = Math.pow(hash(i * 7.31 + (o.seed || 0)), 1.6); }
  g.setAttribute('ipos', new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute('iseed', new THREE.InstancedBufferAttribute(Sd, 1)); g.instanceCount = N;
  const m = new THREE.ShaderMaterial({ vertexShader: FLOW_VS, fragmentShader: FLOW_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { VP: { value: new THREE.Matrix4() }, PVP: { value: new THREE.Matrix4() }, res: { value: new THREE.Vector2(W, H) }, size: { value: o.size || 1.6 }, bright: { value: o.bright || 0.6 },
      time: { value: 0 }, nearF: { value: o.nearF || 0.25 }, farF: { value: o.farF || 0.03 }, drift: { value: o.drift ?? 0.03 }, rise: { value: o.rise || 0 }, riseH: { value: o.riseH || 1 }, keep: { value: o.keep || 0.1 }, col: { value: new THREE.Color(o.col || 0xd8e2ee) } } });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.layers.set(1); mesh.renderOrder = 2; scene.add(mesh); return mesh;
}
const gauss = i => { const u = Math.max(1e-6, hash(i * 1.37)), v = hash(i * 2.91); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
function buildFlow() {
  // polvo cálido en suspensión (como en el haz de luz de una sala): por el círculo de estaciones, alrededor del centro y más lejos
  S.flow = [
    flowCloud(16000, i => { const r = 3 + Math.sqrt(hash(i * 3.1)) * 10.5, a = hash(i * 8.3) * 6.2832; return [r * Math.sin(a), 0.03 + Math.pow(hash(i * 5.7), 1.4) * 3.4, r * Math.cos(a)]; }, { size: 1.7, bright: 0.75, farF: 0.03, seed: 2, col: 0xffe6c4 }),
    flowCloud(5000, i => [gauss(i) * 1.6, 0.02 + Math.abs(gauss(i + 9e3)) * 0.9, gauss(i + 2e4) * 1.6], { size: 1.3, bright: 0.55, seed: 1, nearF: 0.05, farF: 0.08, col: 0xfff0d8 }),
    flowCloud(3000, i => { const th = hash(i * 1.9) * 6.283, r = 16 + hash(i * 6.1) * 22; return [r * Math.cos(th), 0.5 + hash(i * 4.4) * 9, r * Math.sin(th)]; }, { size: 1.4, bright: 0.6, farF: 0.004, nearF: 1, drift: 0.01, seed: 3, col: 0xffe0b8 }),
  ];
}
const _vp = new THREE.Matrix4();
function flowUpdate(t, VP, PVP) {
  for (const m of S.flow) { const u = m.material.uniforms; u.VP.value.copy(VP); u.PVP.value.copy(PVP); u.time.value = t; }
}

// ---------------------------------------------------------------- suelo: espejo muy oscuro + rejilla fina que se apaga con la distancia
const GRID_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vW;
void main(){ vW = (modelMatrix * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.);
  #include <logdepthbuf_vertex>
}`;
const GRID_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float op; uniform vec3 camP; varying vec3 vW;
float gl(vec2 p, float s, float w){ vec2 q = p / s; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); return 1.0 - min(min(g.x, g.y) / w, 1.0); }
void main(){
  #include <logdepthbuf_fragment>
  float a = gl(vW.xz, 0.25, 1.0) * 0.28 + gl(vW.xz, 1.0, 1.25) * 0.55;
  float fade = exp(-0.11 * distance(vW, camP));
  gl_FragColor = vec4(vec3(0.62, 0.68, 0.76) * a * fade * op, 1.0);
}`;
function buildFloor() {
  // suelo de piedra oscura pulida (losas grandes con vetas) que refleja el entorno; la rejilla técnica queda casi apagada
  const tex = repTex(canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#16130f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { let x = hash(i * 4.1) * w, y = hash(i * 8.7) * h, a = hash(i * 2.9) * 6.28; g.strokeStyle = '#3a332b'; g.globalAlpha = 0.1 + hash(i * 6.3) * 0.25; g.lineWidth = 0.6 + hash(i * 3.7) * 2; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 90; k++) { a += (hash(i * 31 + k * 1.3) - 0.5) * 0.6; x += Math.cos(a) * 10; y += Math.sin(a) * 10; g.lineTo(x, y); } g.stroke(); }
    g.globalAlpha = 1; g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 3; for (let k = 0; k <= 2; k++) { g.beginPath(); g.moveTo(k * w / 2, 0); g.lineTo(k * w / 2, h); g.moveTo(0, k * h / 2); g.lineTo(w, k * h / 2); g.stroke(); } }), 30, 30);
  const d = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, metalness: 0.0, clearcoat: 0.8, clearcoatRoughness: 0.12, color: 0xb0a898 }));
  d.rotation.x = -Math.PI / 2; d.position.set(0, -0.002, 0); d.receiveShadow = true; scene.add(d);
  S.gridM = new THREE.ShaderMaterial({ vertexShader: GRID_VS, fragmentShader: GRID_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { op: { value: 0.0 }, camP: { value: new THREE.Vector3() } } });
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), S.gridM); gr.rotation.x = -Math.PI / 2; gr.position.set(0, 0.0008, 0); gr.layers.set(1); gr.visible = false; scene.add(gr);
  S.floor = { d, gr };
}
// ---------------------------------------------------------------- chorros de cohetes y motores: partículas que salen de la tobera, se abren y se enfrían
// (blanco → amarillo → naranja → humo). Cada una vive en bucle (edad 0→1); la estela es su propio movimiento + el de la cámara.
const JET_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 corner; attribute vec4 seed;
uniform mat4 VP, PVP; uniform vec2 res; uniform float time, dtp, len, rad, spread, speed, power, size, bright, kind, turb, floorY;
uniform vec3 orig, dir, origP, dirP;
varying float vA; varying float vS; varying float vT; varying float vLen; varying vec3 vC;
vec3 posAt(float T, vec3 O, vec3 D, out float age) {
  age = fract(T * speed * (0.8 + 0.4 * seed.x) + seed.y * 7.31);
  vec3 up = abs(D.y) < 0.95 ? vec3(0., 1., 0.) : vec3(1., 0., 0.);
  vec3 e1 = normalize(cross(D, up)), e2 = cross(D, e1);
  float a = seed.w * 6.2831853 + T * (1.5 + seed.z * 3.0) * turb, r = mix(rad, spread, pow(age, 0.85)) * sqrt(seed.z);
  vec3 p = O + D * (pow(age, 0.9) * len) + (e1 * cos(a) + e2 * sin(a)) * r;
  p += (e1 * sin(T * 7.0 + seed.x * 40.0) + e2 * cos(T * 6.0 + seed.y * 30.0)) * turb * age * spread * 0.35;
  return p;
}
void main(){
  float ag, ag2;
  vec3 P = posAt(time, orig, dir, ag), P2 = posAt(time - dtp, origP, dirP, ag2);
  if (ag2 > ag) P2 = P;
  vec4 a = VP * vec4(P, 1.), b = PVP * vec4(P2, 1.);
  if (a.w < 0.01 || b.w < 0.005 || power < 0.003) { gl_Position = vec4(0.,0.,-2.,1.); vA = 0.; vS = 0.; vT = 0.; vLen = 0.; vC = vec3(0.); return; }
  vec2 pa = a.xy / a.w * res * 0.5, pb = b.xy / b.w * res * 0.5;
  vec2 d = pb - pa; float L = min(length(d), 400.0);
  vec2 dr = L > 0.01 ? normalize(d) : vec2(1., 0.); vec2 nr = vec2(-dr.y, dr.x);
  float w = size * (0.5 + 0.9 * seed.x) * mix(0.6, 2.6, ag) * (rad + spread) * 0.5;
  float sz = clamp(w * res.y * 0.9 / a.w, 1.0, 120.0);
  vec2 px = (corner.x > 0.5 ? pa - dr * sz : pa + dr * (L + sz)) + nr * corner.y * sz;
  gl_Position = vec4(px / (res * 0.5) * a.w, a.z, a.w);
  #include <logdepthbuf_vertex>
  vec3 c0 = kind < 0.5 ? vec3(1.0, 0.93, 0.78) : vec3(0.75, 0.85, 1.0), c1 = kind < 0.5 ? vec3(1.0, 0.55, 0.16) : vec3(1.0, 0.6, 0.3), c2 = kind < 0.5 ? vec3(0.36, 0.26, 0.22) : vec3(0.25, 0.2, 0.22);
  vC = ag < 0.18 ? mix(c0 * 2.2, c1 * 1.4, ag / 0.18) : mix(c1 * 1.4, c2 * 0.5, (ag - 0.18) / 0.82);
  float fade = (1.0 - smoothstep(0.45, 1.0, ag)) * smoothstep(0.0, 0.03, ag);
  if (kind > 1.5) { vC = vec3(1.0, 0.95, 0.9) * 0.42; fade = smoothstep(0.05, 0.16, ag) * (1.0 - smoothstep(0.35, 1.0, ag)); }   // estela de condensación: blanca, nace a un palmo del motor y se deshace
  fade *= smoothstep(floorY - 0.2, floorY + 0.7, P.y);      // por debajo del mar de nubes no se ve
  vA = bright * power * fade * (0.45 + 0.55 * seed.z) * clamp((2.0 * sz) / (L * 0.5 + 2.0 * sz), 0.3, 1.0);
  vS = corner.x > 0.5 ? -1.0 : (L / sz + 1.0); vT = corner.y; vLen = L / sz;
}`;
const JET_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
varying float vA; varying float vS; varying float vT; varying float vLen; varying vec3 vC;
void main(){
  #include <logdepthbuf_fragment>
  float ds = max(0., max(-vS, vS - vLen)), dist = length(vec2(ds, vT));
  float a = smoothstep(1.0, 0.0, dist); a = a * a * vA * mix(1.0, 0.3, clamp(vS / max(vLen, 0.001), 0., 1.));
  if (a < 0.002) discard;
  gl_FragColor = vec4(vC * a, a);
}`;
function buildJet(o) {
  const N = o.n || 1800, g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
  g.setAttribute('corner', new THREE.Float32BufferAttribute([1, -1, 1, 1, 0, -1, 0, 1], 2)); g.setIndex([0, 2, 1, 2, 3, 1]);
  const sd = new Float32Array(N * 4); for (let i = 0; i < N * 4; i++) sd[i] = hash(i * 0.713 + (o.seed || 1) * 3.1);
  g.setAttribute('seed', new THREE.InstancedBufferAttribute(sd, 4)); g.instanceCount = N;
  const m = new THREE.ShaderMaterial({ vertexShader: JET_VS, fragmentShader: JET_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { VP: { value: new THREE.Matrix4() }, PVP: { value: new THREE.Matrix4() }, res: { value: new THREE.Vector2(W / 2, H / 2) }, time: { value: 0 }, dtp: { value: 1 / 36 },
      len: { value: o.len || 1 }, rad: { value: o.rad || 0.05 }, spread: { value: o.spread || 0.3 }, speed: { value: o.speed || 2.2 }, power: { value: 0 }, size: { value: o.size || 1 }, bright: { value: o.bright || 1 },
      kind: { value: o.kind || 0 }, turb: { value: o.turb ?? 1 }, floorY: { value: -1e9 }, orig: { value: new THREE.Vector3() }, dir: { value: new THREE.Vector3(0, -1, 0) }, origP: { value: new THREE.Vector3() }, dirP: { value: new THREE.Vector3(0, -1, 0) } } });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; fxScene.add(mesh); const J = { mesh, u: m.uniforms, last: null }; FXS.push(J); return J;
}
const FXS = [];
// coloca el chorro: o = tobera (mundo), d = dirección de salida. La estela usa dónde estaba la tobera hace 1/36 s (lo que dura el
// «obturador»): se extrapola del fotograma anterior si es el inmediatamente anterior; si no (primer fotograma de un trozo), sin estela
let NOW = 0;
function jetAt(J, o, d, power) {
  const u = J.u, L = J.last, ok = L && NOW - L.t > 0.001 && NOW - L.t < 0.05, k = ok ? (1 / 36) / (NOW - L.t) : 0;
  u.origP.value.copy(o); u.dirP.value.copy(d).normalize(); if (ok) { u.origP.value.lerp(L.o, k); u.dirP.value.lerp(L.d, k).normalize(); }
  u.orig.value.copy(o); u.dir.value.copy(d).normalize(); u.power.value = power; J.last = { o: o.clone(), d: u.dir.value.clone(), t: NOW };
}
function fxUpdate(t, VP, PVP) { for (const J of FXS) { const u = J.u; u.VP.value.copy(VP); u.PVP.value.copy(PVP); u.time.value = t; } }
// diamantes de choque (cohete encendido): elipses brillantes a lo largo del chorro
function shockDiamonds(n = 6) {
  const g = new THREE.Group(), tx = starTex0();
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tx, color: new THREE.Color(1.0, 0.82, 0.55).multiplyScalar(2.6 - i * 0.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    m.userData.i = i; g.add(m); }
  return g;
}
// ---------------------------------------------------------------- EL MUNDO: todo flota en un vacío negro. Cada escena está en su sitio y la cámara viaja de una a otra sin cortes
// (las estelas del «flujo óptico» hacen de puente). Unidades: la cabeza mide ≈ 2,3 de alto.
//   CABEZA (0, 0, 0) · CORTEZA en grande (MAC) · ORDENADOR / IA (AIP) · VOZ (VOX)
// (posiciones de cada escena: NEU en 21_neuro.js, VOX en 24_voice.js)
const GOLD = new THREE.Color(1.0, 0.62, 0.18), CYAN = new THREE.Color(0.25, 0.7, 1.0), WHITE = new THREE.Color(1, 1, 1);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const bump = (t, a, b, fi = 0.25, fo = 0.3) => win(t, a, fi) * (1 - win(t, b, fo));
const _v = () => new THREE.Vector3();
const stdM = (c, r = 0.5, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
const addM = (c, op = 1, o = {}) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, ...o });
function glowSprite(col, s = 1, op = 1) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.scale.setScalar(s); return m; }

// ---- holograma de cristal: borde brillante (fresnel), cuerpo casi transparente y líneas de barrido muy finas
const HOLO_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;   // igual que el material de la pasada de profundidad
#include <logdepthbuf_vertex>
}`;
const HOLO_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 col, col2; uniform float op, scan, time, edge;
varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
#include <logdepthbuf_fragment>
#ifdef USE_LOGDEPTHBUF
  gl_FragDepth -= 3e-6;   // un pelo más cerca que la pasada de profundidad: sin esto, el redondeo dejaba manchas negras en la piel de cristal
#endif
  vec3 N = normalize(vN), V = normalize(vV); float f = 1. - abs(dot(N, V)), fr = pow(f, edge);
  float sl = 0.5 + 0.5 * sin(vW.y * 260. - time * 2.0); sl = smoothstep(0.6, 1.0, sl) * scan;
  vec3 c = mix(col2, col, fr) * (0.035 + 1.25 * fr + 0.08 * sl);
  float a = op * (0.035 + 1.25 * fr + 0.08 * sl);
  gl_FragColor = vec4(c * op, a);
}`;
function holoMat(col = CYAN, op = 1, o = {}) { return new THREE.ShaderMaterial({ vertexShader: HOLO_VS, fragmentShader: HOLO_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: o.side ?? THREE.FrontSide,
  uniforms: { col: { value: col.clone() }, col2: { value: (o.col2 || new THREE.Color(0.05, 0.15, 0.4)).clone() }, op: { value: op }, scan: { value: o.scan ?? 1 }, time: { value: 0 }, edge: { value: o.edge ?? 2.2 } } }); }

// ---- el cerebro de luz (lámina 1 de Javi): cuerpo oscuro, los pliegues encendidos en oro, el borde en azul, chispas que titilan y ondas de actividad.
// «hot» = una zona que se enciende (centro, radio, fuerza): la corteza motora del habla
const BR_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aP; attribute float aF;
varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vW; varying float vF;
void main(){ vP = aP; vF = aF; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`;
const BR_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float op, act, time, sparks, dim; uniform vec4 hot; uniform float hotK; uniform vec3 hotC;
varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vW; varying float vF;
float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main(){
#include <logdepthbuf_fragment>
  vec3 N = normalize(vN), V = normalize(vV); float f = 1. - abs(dot(N, V));
  float fold = smoothstep(0.0, -0.6, vF), crest = smoothstep(0.0, 0.5, vF);                 // vF = arruga (−1 surco … +1 cresta)
  float w = fwidth(vF) * 1.6 + 0.02, line = 1. - smoothstep(0.0, w, abs(vF - 0.05));          // filamentos de luz en el borde de cada pliegue
  vec3 gold = vec3(1.0, 0.56, 0.14), blue = vec3(0.16, 0.5, 1.0);
  float wave = 0.5 + 0.5 * sin(vP.z * 9. + vP.y * 5. - time * 2.2);
  float front = 1. - f;
  vec3 c = vec3(0.006, 0.009, 0.02) + gold * crest * (0.035 + 0.06 * act * wave) * front + gold * line * (0.55 + 0.9 * act * wave) * (0.4 + 0.6 * front)
         + blue * pow(f, 2.2) * 0.9 + blue * fold * 0.025;
  // chispas: puntitos que se encienden y se apagan
  vec3 q = floor(vP * 46.); float r = h3(q), tw = 0.5 + 0.5 * sin(time * (2. + r * 5.) + r * 40.);
  vec3 lp = fract(vP * 46.) - 0.5; float d = length(lp);
  c += (r > 0.86 ? 1. : 0.) * smoothstep(0.22, 0.0, d) * tw * sparks * mix(gold, vec3(1.0, 0.9, 0.7), 0.5) * 2.4;
  // la zona que se enciende
  float hd = distance(vW, hot.xyz), hk = smoothstep(hot.w, hot.w * 0.25, hd) * hotK;
  c += hotC * hk * (0.55 + 0.45 * sin(time * 6.)) * (0.6 + crest) * 1.4;
  c *= dim;
  gl_FragColor = vec4(c * op, op);
}`;
// arrugas alargadas que serpentean (circunvoluciones), no celdas: suma de dos campos de rayas deformadas
const bnz = v => { const a = Math.sin(v.z * 13 + 2.6 * Math.sin(v.y * 5.5 + v.x * 3) + 1.6 * Math.sin(v.x * 7 + 1)), b = Math.sin(v.y * 15 + 2.2 * Math.sin(v.z * 6 + 2) + 1.4 * Math.sin(v.x * 9));
  return 0.62 * a + 0.38 * b * (0.6 + 0.4 * Math.sin(v.z * 3 + v.y * 2)); };
function brainMat() { return new THREE.ShaderMaterial({ vertexShader: BR_VS, fragmentShader: BR_FS, transparent: true, depthWrite: true, side: THREE.FrontSide,
  uniforms: { op: { value: 1 }, act: { value: 0.6 }, time: { value: 0 }, sparks: { value: 1 }, dim: { value: 1 }, hot: { value: new THREE.Vector4(0, 0, 0, 0.2) }, hotK: { value: 0 }, hotC: { value: new THREE.Color(1.0, 0.75, 0.3) } } }); }
// un hemisferio (eje largo en z, la cara medial en x = 0). Devuelve la geometría con aP (posición sin arrugas) y aF (profundidad del surco)
function hemiGeo(seg = 200) { const geo = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)), p = geo.attributes.position, v = new THREE.Vector3(), aP = new Float32Array(p.count * 3), aF = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); aP[i * 3] = v.x; aP[i * 3 + 1] = v.y; aP[i * 3 + 2] = v.z; const n = bnz(v), fold = Math.pow(Math.max(0, -n), 0.7); aF[i] = n;
    v.multiplyScalar(1 + 0.055 * n - 0.03 * fold);
    if (v.x < 0) v.x *= 0.25; v.x *= 0.62; v.y *= 0.62; v.z *= 1.0; if (v.y < -0.2) v.y = -0.2 + (v.y + 0.2) * 0.55;                         // cara medial plana y base más plana
    if (v.z < -0.3 && v.y < 0.1) v.y -= 0.08 * (-v.z - 0.3);                                                                                 // lóbulo occipital un poco caído
    if (v.z > 0.1 && v.y < -0.05) v.y += 0.0;
    p.setXYZ(i, v.x, v.y, v.z); }
  geo.setAttribute('aP', new THREE.BufferAttribute(aP, 3)); geo.setAttribute('aF', new THREE.BufferAttribute(aF, 1)); geo.computeVertexNormals(); return geo; }

// ================= EL CEREBRO REAL (superficie media de la corteza del Human Connectome Project, «Conte69 32k», incluida en BrainSpace, BSD-3):
// dos hemisferios con su curvatura (aC) y la profundidad de cada surco (aD, en mm: + = hundido). Se pinta en tres estilos, como las láminas de Javi:
//   «luz»  = cuerpo azul noche, la luz de oro saliendo de los surcos, borde azul y chispas (lámina 1)
//   «azul» = todo azul eléctrico con líneas (lámina «señales neuronales»)
//   «rosa» = cerebro de verdad, rosado y brillante (láminas del chip y del brazo robótico): material con luz real
const GLOW_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 aCD; varying vec3 vN; varying vec3 vV; varying vec3 vW; varying vec3 vL; varying float vC; varying float vD;
void main(){ vC = aCD.x; vD = aCD.y; vL = position; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`;
const GLOW_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float op, time, act, sparks, blue, lines; uniform vec3 cA, cB; uniform vec4 hot; uniform float hotK; uniform vec3 hotC;
varying vec3 vN; varying vec3 vV; varying vec3 vW; varying vec3 vL; varying float vC; varying float vD;
float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float ridge(vec3 p){ float n = vn(p) * 0.6 + vn(p * 2.03 + 7.1) * 0.3 + vn(p * 4.1 + 3.3) * 0.1; return 1. - abs(n * 2. - 1.); }
void main(){
#include <logdepthbuf_fragment>
  vec3 N = normalize(vN), V = normalize(vV); float nv = abs(dot(N, V)), f = 1. - nv;
  float sul = smoothstep(-0.6, 3.2, vD);                                    // 0 en la cresta, 1 en el fondo del surco
  float crest = 1. - smoothstep(-2.5, 0.2, vD);
  float grad = smoothstep(-70., 60., vL.z + 0.4 * vL.y);                    // delante (frente) más oro, detrás más azul
  vec3 inner = mix(cB, cA, grad);
  float wave = 0.65 + 0.35 * sin(vL.z * 0.09 + vL.y * 0.05 - time * 1.6);
  vec3 c = vec3(0.004, 0.008, 0.022) * (0.5 + nv);
  c += inner * pow(sul, 1.8) * (0.3 + 0.5 * act * wave);                   // la luz sale de los surcos
  float edge = 1. - smoothstep(0.0, 0.9, abs(vD - 0.4));                    // hilo de luz en el borde de cada pliegue
  c += inner * edge * 0.16 * (0.6 + act * wave) * lines;
  float fil = pow(ridge(vL * 0.11 + vec3(0., 0., time * 0.02)), 26.);         // filamentos finos de luz por toda la superficie (como venas de oro)
  float fil2 = pow(ridge(vL * 0.24 + 11.), 30.);
  c += mix(inner, vec3(1.0, 0.8, 0.45), 0.3) * (fil * 0.75 + fil2 * 0.3) * (0.5 + 0.8 * act * wave) * lines * (0.4 + 0.6 * nv);
  c += cB * pow(f, 3.0) * 0.55 + vec3(0.12, 0.25, 0.6) * crest * pow(f, 1.6) * 0.1;   // borde azul
  vec3 q = floor(vL * 0.42 + 0.5); float r = h3(q), tw = 0.5 + 0.5 * sin(time * (1.5 + r * 4.) + r * 30.); vec3 lp = fract(vL * 0.42 + 0.5) - 0.5;
  c += step(0.84, r) * smoothstep(0.26, 0.0, length(lp)) * tw * sparks * mix(vec3(1.0, 0.78, 0.42), vec3(1.0), 0.3) * 4.0;    // chispas
  float hd = distance(vW, hot.xyz), hk = smoothstep(hot.w, hot.w * 0.2, hd) * hotK;
  c += hotC * hk * (0.6 + 0.4 * sin(time * 6.)) * (0.5 + sul) * 2.2;
  gl_FragColor = vec4(c * op, op);
}`;
function glowBrainMat(o = {}) { return new THREE.ShaderMaterial({ vertexShader: GLOW_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: true,
  uniforms: { op: { value: 1 }, time: { value: 0 }, act: { value: 0.7 }, sparks: { value: 1 }, blue: { value: 0 }, lines: { value: 1 }, cA: { value: (o.cA || new THREE.Color(1.0, 0.55, 0.12)).clone() }, cB: { value: (o.cB || new THREE.Color(0.18, 0.45, 1.0)).clone() },
    hot: { value: new THREE.Vector4(0, 0, 0, 10) }, hotK: { value: 0 }, hotC: { value: new THREE.Color(1.0, 0.8, 0.35) } } }); }
let BRAIN_GEO = null;
async function loadBrainGeo() { if (BRAIN_GEO) return BRAIN_GEO; const meta = await (await fetch(ASSET + 'brain_meta.json')).json(), out = {};
  for (const h of ['lh', 'rh']) { const [pos, idx, attr] = await Promise.all(['pos', 'idx', 'attr'].map(k => fetch(ASSET + `brain_${h}_${k}.bin`).then(r => r.arrayBuffer())));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('aCD', new THREE.BufferAttribute(new Float32Array(attr), 2)); g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
    g.computeVertexNormals(); out[h] = g; }
  BRAIN_GEO = out; return out; }
// color del cerebro rosa (por vértice: más claro en las crestas, más oscuro y rojizo en los surcos)
function pinkColors(g) { const a = g.attributes.aCD, n = a.count, col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const d = clamp((a.getY(i) + 2.5) / 6); c.setRGB(lerp(0.9, 0.42, d), lerp(0.4, 0.08, d), lerp(0.5, 0.16, d)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
// cerebelo con sus láminas finas (folias) y el tronco del encéfalo, en mm como la corteza (se colocan debajo y detrás)
function cerebellumGeo() { const g = new THREE.SphereGeometry(1, 160, 100), p = g.attributes.position, v = new THREE.Vector3(), aCD = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const fol = Math.sin((v.y * 1.0 + 0.22 * v.z * v.z + 0.06 * Math.sin(v.x * 9)) * 64); const d = Math.max(0, -fol) * 2.2; v.multiplyScalar(1 - 0.01 * d);
    if (Math.abs(v.x) < 0.14) v.z -= 0.1; v.set(v.x * 50, v.y * 24, v.z * 31); p.setXYZ(i, v.x, v.y, v.z); aCD[i * 2] = 0; aCD[i * 2 + 1] = d * 1.6 - 0.6; }
  g.setAttribute('aCD', new THREE.BufferAttribute(aCD, 2)); g.computeVertexNormals(); return g; }
function stemGeo() { const pts = [[0, 0], [8, 1], [11, 8], [15, 18], [14.5, 27], [10, 36], [8.5, 48], [8, 62]].map(q => new THREE.Vector2(q[0], -q[1])), g = new THREE.LatheGeometry(pts, 48), n = g.attributes.position.count, aCD = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) aCD[i * 2 + 1] = -1; g.setAttribute('aCD', new THREE.BufferAttribute(aCD, 2)); g.computeVertexNormals(); return g; }
// el cerebro completo (en mm; se escala fuera). style: 'luz' | 'azul'; con pink = true crea además la versión rosa (con luz real)
async function realBrain(o = {}) { const G = await loadBrainGeo(), g = new THREE.Group(), U = g.userData;
  U.gm = glowBrainMat(o); U.parts = [];
  for (const h of ['lh', 'rh']) { const m = new THREE.Mesh(G[h], U.gm); m.position.x = h === 'lh' ? 1.2 : -1.2; m.renderOrder = 3; g.add(m); U.parts.push(m); }
  U.cbm = glowBrainMat(o); U.cbm.uniforms.lines.value = 0.6; const cb = new THREE.Mesh(cerebellumGeo(), U.cbm); cb.position.set(0, -34, -70); cb.rotation.x = 0.3; g.add(cb); U.cb = cb;
  U.stm = glowBrainMat({ cA: new THREE.Color(0.35, 0.5, 0.8), cB: new THREE.Color(0.25, 0.45, 0.9) }); U.stm.uniforms.sparks.value = 0.2; const st = new THREE.Mesh(stemGeo(), U.stm); st.position.set(0, -12, -26); st.rotation.x = 0.3; g.add(st); U.st = st;
  if (o.pink) { const pm = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 1.0, clearcoatRoughness: 0.14, sheen: 0.3, sheenColor: new THREE.Color(1, 0.75, 0.8), transparent: true, opacity: 0 }); U.pm = pm; pm.userData.studio = 1;
    for (const h of ['lh', 'rh']) { if (!G[h].attributes.color) pinkColors(G[h]); const m = new THREE.Mesh(G[h], pm); m.position.x = h === 'lh' ? 1.2 : -1.2; g.add(m); U.parts.push(m); }
    const cbg = cb.geometry; if (!cbg.attributes.color) pinkColors(cbg); const cp = new THREE.Mesh(cbg, pm); cp.position.copy(cb.position); cp.rotation.copy(cb.rotation); g.add(cp); }
  U.mats = [U.gm, U.cbm, U.stm]; return g; }
function brainGlowAt(B, t, o = {}) { const U = B.userData; for (const m of U.mats) { const u = m.uniforms; u.time.value = t; u.op.value = o.op ?? 1; if (o.act !== undefined) u.act.value = o.act; if (o.cA) u.cA.value.copy(o.cA); if (o.cB) u.cB.value.copy(o.cB); if (o.sparks !== undefined) u.sparks.value = o.sparks * (m === U.stm ? 0.2 : 1); }
  for (const m of U.mats) { const vis = (o.op ?? 1) > 0.003; m.visible = vis; }
  if (U.pm) { U.pm.opacity = o.pink ?? 0; U.pm.visible = U.pm.opacity > 0.003; U.pm.depthWrite = U.pm.opacity > 0.98; } }
// ---------------------------------------------------------------- materiales realistas (madera, latón, mármol, piel, papel, tela) y piezas de museo (del vídeo de Derecho)
// para «Qué pasa cuando te crujes los dedos». Las estaciones están en un círculo de radio R_ST.
const R_ST = 8.0, R_CAM = 10.6;
const ANG = { D: 30, C: 78, K: 128, P: 178, B: 232 };       // estaciones: el nudillo (L3), la resonancia (L4), el debate y los 20 min (L5–L6), las manos de Unger (L7), las radiografías (L8)
const D2 = Math.PI / 180;
const stP = (a, r = R_ST, y = 0) => v3(r * Math.sin(a * D2), y, r * Math.cos(a * D2));
const stT = a => v3(Math.cos(a * D2), 0, -Math.sin(a * D2));      // tangente (derecha mirando hacia el centro desde fuera)
const M = {};
function repTex(t, rx, ry) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
function woodTex(base, dark, light, seed = 1) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y0 = hash(i * 3.3 + seed) * h, a = 0.05 + hash(i * 7.1 + seed) * 0.22, amp = 2 + hash(i * 1.7) * 9, f = 0.004 + hash(i * 5.5) * 0.012;
      g.strokeStyle = hash(i * 2.2 + seed) > 0.45 ? dark : light; g.globalAlpha = a; g.lineWidth = 0.6 + hash(i * 9.9) * 2.4; g.beginPath();
      for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + i) * amp + Math.sin(x * f * 3.1 + i * 2) * amp * 0.3; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}
function marbleTex(base, vein, seed = 3, n = 26) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      let x = hash(i * 4.1 + seed) * w, y = hash(i * 8.7 + seed) * h, ang = hash(i * 2.9) * 6.28;
      g.strokeStyle = vein; g.globalAlpha = 0.08 + hash(i * 6.3) * 0.25; g.lineWidth = 0.5 + hash(i * 3.7) * 2.5; g.shadowColor = vein; g.shadowBlur = 6; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 70; k++) { ang += (hash(i * 31 + k * 1.3) - 0.5) * 0.7; x += Math.cos(ang) * 9; y += Math.sin(ang) * 9; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1; g.shadowBlur = 0;
  });
}
function paperTex(draw, w = 512, h = 700) { return canvasTex(w, h, (g, W2, H2) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, W2, H2); const gr = g.createRadialGradient(W2 / 2, H2 / 2, H2 * 0.2, W2 / 2, H2 / 2, H2 * 0.8); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(90,70,40,.18)'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2); if (draw) draw(g, W2, H2); }); }
function textLines(g, x, y, w, n, lh, col = 'rgba(40,36,30,.55)', seed = 1) { g.fillStyle = col; for (let i = 0; i < n; i++) { const ww = w * (i % 7 === 6 ? 0.55 : 0.85 + hash(i * 3.1 + seed) * 0.15); for (let x2 = x; x2 < x + ww;) { const wl = 10 + hash(i * 13 + x2 * 0.7 + seed) * 34; g.fillRect(x2, y + i * lh, Math.min(wl, x + ww - x2), lh * 0.42); x2 += wl + 6; } } }
function buildMats() {
  M.wood = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#3a2112', '#1f1008', '#5c3820', 1), 1, 1), roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.18 });
  M.woodL = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#6b4424', '#3e2410', '#8d5f36', 5), 1, 1), roughness: 0.48, clearcoat: 0.5, clearcoatRoughness: 0.25 });
  M.brass = metal(0xcfa860, 0.27); M.gold = metal(0xffcf6e, 0.18); M.steel = metal(0xd3d8e0, 0.16); M.dsteel = metal(0x8a929e, 0.3); M.silver = metal(0xe6e9ee, 0.12);
  M.marble = new THREE.MeshPhysicalMaterial({ map: repTex(marbleTex('#ece8e1', '#8f8a82'), 1, 1), roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.1 });
  M.stone = new THREE.MeshStandardMaterial({ map: repTex(marbleTex('#cfc9be', '#9a9387', 9, 12), 1, 1), roughness: 0.62 });
  M.cloth = new THREE.MeshPhysicalMaterial({ color: 0x08090c, roughness: 0.78, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0x2c2f37) });
  M.lace = new THREE.MeshPhysicalMaterial({ color: 0xf4f2ec, roughness: 0.7, sheen: 1, sheenColor: new THREE.Color(0xffffff) });
  M.paper = new THREE.MeshStandardMaterial({ color: 0xf2eee3, roughness: 0.9 });
  M.pages = new THREE.MeshStandardMaterial({ map: canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#efe9da'; g.fillRect(0, 0, w, h); for (let i = 0; i < h; i += 2) { g.fillStyle = `rgba(120,100,70,${0.05 + hash(i) * 0.12})`; g.fillRect(0, i, w, 1); } }), roughness: 0.92 });
  M.ceramic = new THREE.MeshPhysicalMaterial({ color: 0xe6e1d8, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  M.ceramicD = new THREE.MeshPhysicalMaterial({ color: 0x55585f, roughness: 0.5, clearcoat: 0.3 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xd8e2ea, roughness: 0.02, metalness: 0, transmission: 0, transparent: true, opacity: 0.07, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  M.wax = new THREE.MeshPhysicalMaterial({ color: 0x8e1418, roughness: 0.35, clearcoat: 0.8 });
  M.leather = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  M.card = new THREE.MeshStandardMaterial({ color: 0xa8784a, roughness: 0.85 });
  M.felt = new THREE.MeshStandardMaterial({ color: 0x163a2a, roughness: 0.95 });
  M.ocean = new THREE.MeshPhysicalMaterial({ color: 0x0a1626, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  M.redLed = glowM(0xff3b30, 3); M.greenLed = glowM(0x34ff8a, 3); M.amberLed = glowM(0xffb547, 3);
  M.sand = new THREE.MeshStandardMaterial({ color: 0xe0b878, roughness: 0.95 });
  M.yellowP = plastic(0xf2c218, 0.35); M.black = new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.4, metalness: 0.3 });
}
const mesh = (geo, m, cs = true) => { const o = new THREE.Mesh(geo, m); o.castShadow = cs; o.receiveShadow = true; return o; };
const grp = (...ch) => { const g = new THREE.Group(); for (const c of ch) g.add(c); return g; };
const at = (o, x, y, z, ry = 0, rx = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
// rótulo pintado (dorado sobre piel, negro sobre papel…) en un plano
function plateText(w, h, lines, { fg = '#e8c77a', bg = null, font = 'Inter', weight = 800, px = 512, border = false, align = 'center' } = {}) {
  const t = canvasTex(px, Math.round(px * h / w), (g, W2, H2) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W2, H2); }
    if (border) { g.strokeStyle = fg; g.lineWidth = W2 * 0.012; g.strokeRect(W2 * 0.05, H2 * 0.06, W2 * 0.9, H2 * 0.88); }
    g.fillStyle = fg; g.textAlign = align; g.textBaseline = 'middle';
    lines.forEach(([s, size, yy]) => { g.font = `${weight} ${size * H2}px ${font}`; g.fillText(s, align === 'center' ? W2 / 2 : W2 * 0.08, yy * H2, W2 * 0.92); });
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: !bg, roughness: 0.4, metalness: bg ? 0 : 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
  return m;
}

// ---------------------------------------------------------------- piezas
function gavel(s = 1) {      // mazo de juez: cabeza torneada con aros de latón y mango
  const g = new THREE.Group(), head = new THREE.Group();
  const hp = [[0, -0.25], [0.07, -0.25], [0.085, -0.235], [0.085, -0.2], [0.075, -0.19], [0.078, -0.07], [0.09, -0.05], [0.09, 0.05], [0.078, 0.07], [0.075, 0.19], [0.085, 0.2], [0.085, 0.235], [0.07, 0.25], [0, 0.25]];
  const h = lathe(hp, 40, M.wood); h.rotation.z = Math.PI / 2; head.add(h);
  for (const x of [-0.13, 0.13]) { const b = cyl(0.0805, 0.0805, 0.03, M.brass, 40); b.rotation.z = Math.PI / 2; b.position.x = x; head.add(b); }
  const hd = lathe([[0, 0], [0.024, 0], [0.026, 0.05], [0.02, 0.32], [0.026, 0.38], [0.03, 0.42], [0.024, 0.45], [0, 0.46]], 24, M.wood); hd.position.y = 0.06; head.add(hd);
  g.add(head); g.userData.head = head; g.scale.setScalar(s); return g;
}
function soundBlock(s = 1) { const g = new THREE.Group(); const a = cyl(0.2, 0.21, 0.06, M.wood, 48); a.position.y = 0.03; g.add(a); const r = cyl(0.205, 0.205, 0.012, M.brass, 48); r.position.y = 0.055; g.add(r); g.scale.setScalar(s); return g; }
function plinth(r = 0.9, h = 0.55) {      // pedestal de madera con canto de latón (como en un museo)
  const g = new THREE.Group();
  const base = lathe([[0, 0], [r * 1.08, 0], [r * 1.08, 0.05], [r, 0.08], [r, h - 0.06], [r * 1.05, h - 0.04], [r * 1.05, h], [0, h]], 64, M.wood); g.add(base);
  const rim = cyl(r * 1.051, r * 1.051, 0.012, M.brass, 64); rim.position.y = h - 0.02; g.add(rim);
  g.userData.top = h; return g;
}
function lightCone(r = 1.1, hgt = 4, op = 0.07, col = 0xffe2b0) {      // haz de luz polvoriento (aditivo, se apaga hacia abajo y en los bordes)
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { op: { value: op }, col: { value: new THREE.Color(col) } },
    vertexShader: 'varying vec2 vU; varying vec3 vN; varying vec3 vV; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float op; uniform vec3 col; varying vec2 vU; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN, vV)), 1.6); float a = op * f * smoothstep(0.0, 0.35, vU.y) * (0.35 + 0.65 * vU.y); gl_FragColor = vec4(col * a, 1.); }' });
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, r, hgt, 40, 1, true), m); c.position.y = hgt / 2; c.renderOrder = 6; c.userData.keepOp = true; return c;
}
function book(w, h, d, color, title, sub = '') {
  const g = new THREE.Group(), lm = M.leather(color);
  const cover = rbox(w, h, d, lm, 0.012); g.add(cover);
  const pg = mesh(new THREE.BoxGeometry(w * 0.94, h * 0.95, d * 0.8), M.pages); pg.position.x = w * 0.03; g.add(pg);
  if (title) { const p = plateText(w * 0.8, h * 0.5, [[title, 0.13, 0.36], [sub, 0.08, 0.62]], { border: true }); p.position.set(0, 0, d / 2 + 0.001); g.add(p);
    const sp = plateText(h * 0.86, d * 0.8, [[title, 0.5, 0.5]]); sp.rotation.set(0, -Math.PI / 2, Math.PI / 2); sp.position.set(-w / 2 - 0.001, 0, 0); g.add(sp); }
  return g;
}
function openBook(w, h, color, pageDraw) {      // libro abierto: dos páginas curvadas sobre las tapas
  const g = new THREE.Group(), lm = M.leather(color);
  const cov = rbox(w * 2.06, 0.02, h * 1.04, lm, 0.008); cov.rotation.x = 0; g.add(cov);
  const tex = paperTex(pageDraw, 1024, 700);
  for (const sd of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(w, h, 24, 1); const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + w / 2; const u = x / w; p.setZ(i, Math.sin(u * Math.PI) * 0.06 * w + (1 - u) * 0.03 * w); p.setX(i, sd * x); uv.setX(i, sd < 0 ? 0.5 - uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5); }
    geo.computeVertexNormals();
    const pm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide });
    const page = mesh(geo, pm); page.rotation.x = -Math.PI / 2; page.position.y = 0.02; g.add(page);
    const blk = mesh(new THREE.BoxGeometry(w * 0.98, 0.03, h * 0.98), M.pages); blk.position.set(sd * w * 0.5, 0.012, 0); g.add(blk);
  }
  g.userData.tex = tex; return g;
}
function toga(h = 0.32, puñetas = true) {       // toga negra (tela con brillo de raso) con puñetas blancas en las mangas
  const g = new THREE.Group();
  const body = lathe([[0, 0], [0.098 * h / 0.32, 0], [0.1 * h / 0.32, 0.01], [0.085 * h / 0.32, h * 0.3], [0.075 * h / 0.32, h * 0.6], [0.07 * h / 0.32, h * 0.86], [0.05 * h / 0.32, h * 0.95], [0.03 * h / 0.32, h], [0, h]], 40, M.cloth);
  g.add(body);
  for (const sd of [-1, 1]) {
    const sl = cyl(0.022 * h / 0.32, 0.034 * h / 0.32, h * 0.42, M.cloth, 20); sl.position.set(sd * 0.085 * h / 0.32, h * 0.62, 0.01); sl.rotation.z = sd * 0.25; g.add(sl);
    if (puñetas) { const p = new THREE.Mesh(new THREE.TorusGeometry(0.032 * h / 0.32, 0.0055 * h / 0.32, 8, 24), M.lace); p.position.set(sd * 0.112 * h / 0.32, h * 0.43, 0.01); p.rotation.set(Math.PI / 2, 0, sd * 0.25); g.add(p); }
  }
  const col = new THREE.Mesh(new THREE.TorusGeometry(0.032 * h / 0.32, 0.008 * h / 0.32, 8, 24), M.lace); col.rotation.x = Math.PI / 2; col.position.y = h * 0.93; g.add(col);
  return g;
}
function figurine(m = M.ceramic, s = 1) {     // figurita de cerámica (maniquí) de ≈ 0,16 × s de alto
  const d = makeDoll(m); d.scale.setScalar(0.16 * s); d.userData.s0 = 0.16 * s; return d;
}
function column(hgt = 1, r = 0.07, m = M.marble) {
  const g = new THREE.Group();
  const base = lathe([[0, 0], [r * 1.45, 0], [r * 1.45, r * 0.25], [r * 1.25, r * 0.4], [r * 1.25, r * 0.55], [r * 1.08, r * 0.7], [0, r * 0.7]], 40, m); g.add(base);
  const sg = new THREE.CylinderGeometry(r * 0.92, r, hgt, 48, 6); const p = sg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), rr2 = Math.hypot(x, z), k = 1 - 0.045 * Math.pow(Math.abs(Math.cos(a * 10)), 0.6); if (rr2 > 1e-4) { p.setX(i, x * k); p.setZ(i, z * k); } }
  sg.computeVertexNormals(); const sh = mesh(sg, m); sh.position.y = r * 0.7 + hgt / 2; g.add(sh);
  const ech = lathe([[0, 0], [r * 0.95, 0], [r * 1.3, r * 0.35], [r * 1.35, r * 0.45], [0, r * 0.45]], 40, m); ech.position.y = r * 0.7 + hgt; g.add(ech);
  const ab = rbox(r * 2.9, r * 2.9, r * 0.32, m, r * 0.05); ab.rotation.x = Math.PI / 2; ab.position.y = r * 0.7 + hgt + r * 0.6; g.add(ab);
  g.userData.h = r * 0.7 + hgt + r * 0.76; return g;
}
function scales(s = 1) {        // balanza de la justicia de latón: el brazo (beam) gira, los platillos cuelgan siempre verticales
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.22, 0], [0.22, 0.03], [0.16, 0.06], [0.06, 0.09], [0.035, 0.12], [0, 0.12]], 48, M.brass));
  const post = lathe([[0, 0], [0.03, 0], [0.022, 0.1], [0.02, 0.9], [0.03, 0.94], [0.035, 1.0], [0, 1.0]], 24, M.brass); post.position.y = 0.1; g.add(post);
  const top = sph(0.04, M.gold); top.position.y = 1.14; g.add(top);
  const beam = new THREE.Group(); beam.position.y = 1.06; g.add(beam);
  const bm = cyl(0.016, 0.016, 0.9, M.brass, 16); bm.rotation.z = Math.PI / 2; beam.add(bm);
  const pans = [];
  for (const sd of [-1, 1]) {
    const end = sph(0.026, M.brass); end.position.x = sd * 0.45; beam.add(end);
    const hang = new THREE.Group(); hang.position.x = sd * 0.45; beam.add(hang);
    for (let k = 0; k < 3; k++) { const a = k * 2.094, c = bar(v3(0, 0, 0), v3(Math.cos(a) * 0.12, -0.42, Math.sin(a) * 0.12), 0.0035, M.brass, 6); hang.add(c); }
    const pan = lathe([[0, -0.44], [0.13, -0.42], [0.15, -0.395], [0.152, -0.39], [0.135, -0.405], [0, -0.425]], 48, M.brass); hang.add(pan);
    pans.push(hang);
  }
  g.userData = { beam, pans }; g.scale.setScalar(s); return g;
}
function scalesTilt(sc, a) { const U = sc.userData; U.beam.rotation.z = a; for (const p of U.pans) p.rotation.z = -a; }
function pen() { const g = new THREE.Group(); const b = lathe([[0, 0], [0.006, 0.004], [0.008, 0.03], [0.009, 0.14], [0.007, 0.16], [0, 0.165]], 20, M.black); g.add(b); const r = cyl(0.0092, 0.0092, 0.01, M.gold, 20); r.position.y = 0.1; g.add(r); const nib = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.025, 12), M.gold); nib.rotation.x = Math.PI; nib.position.y = -0.01; g.add(nib); return g; }
function key(s = 1) { const g = new THREE.Group(); const bow = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 10, 28), M.brass); g.add(bow); const sh = cyl(0.006, 0.006, 0.14, M.brass, 12); sh.rotation.z = Math.PI / 2; sh.position.x = 0.1; g.add(sh); for (const x of [0.15, 0.165]) { const b = mesh(new THREE.BoxGeometry(0.008, 0.03, 0.008), M.brass); b.position.set(x, -0.016, 0); g.add(b); } g.scale.setScalar(s); return g; }
function handcuffs() {
  const g = new THREE.Group();
  for (const sd of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 12, 40, Math.PI * 1.75), M.steel); r.rotation.x = Math.PI / 2; r.position.x = sd * 0.085; r.rotation.z = sd > 0 ? 0.4 : 3.5; r.castShadow = true; g.add(r);
    const bx2 = rbox(0.03, 0.016, 0.022, M.steel, 0.004); bx2.position.set(sd * 0.03, 0, 0); g.add(bx2);
  }
  for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0025, 6, 14), M.steel); l.position.set(-0.012 + k * 0.012, 0, 0); l.rotation.y = k % 2 ? Math.PI / 2 : 0; g.add(l); }
  return g;
}
function hourglass(s = 1) {
  const g = new THREE.Group();
  for (const y of [0, 0.32]) { const d = cyl(0.11, 0.11, 0.025, M.wood, 32); d.position.y = y; g.add(d); }
  for (let k = 0; k < 3; k++) { const a = k * 2.094, p = cyl(0.009, 0.009, 0.3, M.brass, 10); p.position.set(Math.cos(a) * 0.09, 0.16, Math.sin(a) * 0.09); g.add(p); }
  const gl = lathe([[0.001, 0.012], [0.07, 0.02], [0.075, 0.07], [0.04, 0.13], [0.008, 0.16], [0.04, 0.19], [0.075, 0.25], [0.07, 0.3], [0.001, 0.308]], 32, M.glass); g.add(gl);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 24), M.sand); top.rotation.x = Math.PI; top.position.y = 0.215; g.add(top);
  const bot = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.07, 24), M.sand); bot.position.y = 0.05; g.add(bot);
  const stream = cyl(0.002, 0.002, 0.13, M.sand, 6); stream.position.y = 0.1; g.add(stream);
  g.userData = { top, bot, stream }; g.scale.setScalar(s); return g;
}
function magnifier(s = 1) { const g = new THREE.Group(); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.009, 12, 48), M.brass); g.add(rim); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.088, 40), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide })); g.add(lens); const hd = cyl(0.012, 0.015, 0.16, M.wood, 16); hd.position.y = -0.17; g.add(hd); g.scale.setScalar(s); return g; }
function fingerprintTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(160,255,240,.95)'; g.lineWidth = 3.2; g.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const r = 14 + i * 8.6; g.beginPath(); for (let a = 0; a <= 6.3; a += 0.05) { const wob = Math.sin(a * 3 + i * 0.7) * 3 + Math.sin(a * 7 + i) * 1.5, rx = r * 0.78 + wob, ry = r + wob; const x = w / 2 + Math.cos(a) * rx, y = h / 2 + Math.sin(a) * ry * (a > 3.3 && a < 6.1 ? 1 : 0.86); if (hash(i * 7 + Math.floor(a * 3)) < 0.06) { g.moveTo(x, y); continue; } a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  });
}
function marker(n) { const g = new THREE.Group(); const t = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#f2c218'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = '900 84px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), w / 2, h / 2 + 4); });
  for (const sd of [-1, 1]) { const p = mesh(new THREE.PlaneGeometry(0.07, 0.07), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, side: THREE.DoubleSide })); p.position.set(0, 0.032, sd * 0.018); p.rotation.x = sd * 0.48; g.add(p); } return g; }
function rubberStamp(word, col = "#b8121b") {     // sello de caucho con mango de madera
  const g = new THREE.Group(); const hd = lathe([[0, 0.05], [0.03, 0.05], [0.022, 0.09], [0.026, 0.13], [0.04, 0.16], [0.03, 0.19], [0, 0.195]], 24, M.wood); g.add(hd);
  const b = rbox(0.12, 0.05, 0.08, M.woodL, 0.006); b.rotation.x = Math.PI / 2; b.position.y = 0.03; g.add(b);
  const rub = mesh(new THREE.BoxGeometry(0.115, 0.008, 0.075), new THREE.MeshStandardMaterial({ color: 0x3a0d0f, roughness: 0.8 })); rub.position.y = 0.002; g.add(rub); g.userData.word = word; g.userData.col = col; return g;
}
function building(s = 1, m = M.stone) {        // fachada neoclásica genérica (escalinata, seis columnas, frontón)
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const st = mesh(new THREE.BoxGeometry(1.5 - i * 0.06, 0.04, 0.7 - i * 0.06), m); st.position.y = 0.02 + i * 0.04; g.add(st); }
  const core = mesh(new THREE.BoxGeometry(1.3, 0.56, 0.4), m); core.position.set(0, 0.12 + 0.28, -0.1); g.add(core);
  for (let i = 0; i < 6; i++) { const c = column(0.46, 0.03, m); c.position.set(-0.6 + i * 0.24, 0.12, 0.18); g.add(c); }
  const arch = mesh(new THREE.BoxGeometry(1.42, 0.07, 0.56), m); arch.position.set(0, 0.12 + 0.6 + 0.035, -0.02); g.add(arch);
  const tri = new THREE.Shape(); tri.moveTo(-0.72, 0); tri.lineTo(0.72, 0); tri.lineTo(0, 0.22); tri.closePath();
  const ped = mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.5, bevelEnabled: false }), m); ped.position.set(0, 0.12 + 0.67, -0.27); g.add(ped);
  g.scale.setScalar(s); return g;
}
function tower(w, h, d, seed) { const t = canvasTex(128, 256, (g, W2, H2) => { g.fillStyle = '#0b1220'; g.fillRect(0, 0, W2, H2); for (let y = 6; y < H2; y += 12) for (let x = 6; x < W2; x += 14) { g.fillStyle = hash(x * 0.3 + y * 1.7 + seed) > 0.55 ? 'rgba(255,214,150,.95)' : 'rgba(70,110,160,.35)'; g.fillRect(x, y, 9, 7); } });
  const m = new THREE.MeshPhysicalMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.12, metalness: 0.4, clearcoat: 1 }); const b = mesh(new THREE.BoxGeometry(w, h, d), m); b.position.y = h / 2; const top = mesh(new THREE.BoxGeometry(w * 1.02, 0.015, d * 1.02), M.dsteel); top.position.y = h; return grp(b, top); }
function cardboardBox() { const g = new THREE.Group(), m = M.card, s = 0.2, hh = 0.13;
  const bot = mesh(new THREE.BoxGeometry(s, 0.006, s * 0.7), m); g.add(bot);
  for (const [x, z, w, d] of [[0, s * 0.35, s, 0.006], [0, -s * 0.35, s, 0.006], [s / 2, 0, 0.006, s * 0.7], [-s / 2, 0, 0.006, s * 0.7]]) { const p = mesh(new THREE.BoxGeometry(w, hh, d), m); p.position.set(x, hh / 2, z); g.add(p); }
  const pot = cyl(0.03, 0.022, 0.05, plastic(0xb5532f, 0.6), 20); pot.position.set(-0.05, hh + 0.01, 0); g.add(pot);
  for (let k = 0; k < 6; k++) { const lf = sph(0.025, plastic(0x2f7a3a, 0.5), 10, 8); lf.scale.set(0.6, 1.4, 0.3); lf.position.set(-0.05 + Math.cos(k) * 0.02, hh + 0.06 + hash(k) * 0.03, Math.sin(k) * 0.02); lf.rotation.z = (k - 3) * 0.3; g.add(lf); }
  const mug = cyl(0.024, 0.022, 0.05, M.ceramic, 20); mug.position.set(0.05, hh + 0.0, 0.01); g.add(mug);
  return g; }
function coin(r = 0.03) { const c = cyl(r, r, r * 0.22, M.gold, 32); return c; }
function chair(back = 0.3, m = M.wood) { const g = new THREE.Group(); const seat = mesh(new THREE.BoxGeometry(0.14, 0.02, 0.14), m); seat.position.y = 0.12; g.add(seat);
  const bk = mesh(new THREE.BoxGeometry(0.14, back, 0.02), M.leather(0x2b1a12)); bk.position.set(0, 0.13 + back / 2, -0.065); g.add(bk);
  for (const [x, z] of [[-0.06, -0.06], [0.06, -0.06], [-0.06, 0.06], [0.06, 0.06]]) { const l = cyl(0.007, 0.007, 0.12, m, 8); l.position.set(x, 0.06, z); g.add(l); } return g; }
function star5(r = 0.05, m = M.gold) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.42 : r; const x = Math.cos(a) * rr2, y = Math.sin(a) * rr2; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: r * 0.25, bevelEnabled: true, bevelSize: r * 0.06, bevelThickness: r * 0.06, bevelSegments: 2 }); g.center(); return mesh(g, m); }
function medal() { const g = new THREE.Group(); const d = cyl(0.05, 0.05, 0.01, M.gold, 40); d.rotation.x = Math.PI / 2; g.add(d); const r = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.005, 8, 40), M.brass); g.add(r);
  const rib = mesh(new THREE.BoxGeometry(0.035, 0.09, 0.003), plastic(0x8e1418, 0.5)); rib.position.y = 0.09; g.add(rib); const st = star5(0.025); st.position.z = 0.008; g.add(st); return g; }
function vitrine(w = 0.36, h = 0.7) {      // vitrina de cristal con peana de madera y cerradura
  const g = new THREE.Group(); const base = rbox(w + 0.06, w + 0.06, 0.08, M.wood, 0.01); base.rotation.x = Math.PI / 2; base.position.y = 0.04; g.add(base);
  const glass = mesh(new THREE.BoxGeometry(w, h, w), M.glass, false); glass.position.y = 0.08 + h / 2; glass.renderOrder = 7; g.add(glass);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, w)), new THREE.LineBasicMaterial({ color: 0xcfa860 })); frame.position.copy(glass.position); g.add(frame);
  const cap = rbox(w + 0.04, w + 0.04, 0.03, M.wood, 0.008); cap.rotation.x = Math.PI / 2; cap.position.y = 0.08 + h + 0.015; g.add(cap);
  const lock = rbox(0.05, 0.065, 0.02, M.brass, 0.006); lock.position.set(0, 0.08 + h * 0.45, w / 2 + 0.012); g.add(lock);
  const led = sph(0.008, M.redLed); led.position.set(0, 0.08 + h * 0.45 + 0.018, w / 2 + 0.024); g.add(led);
  const hole = cyl(0.006, 0.006, 0.01, M.black, 12); hole.rotation.x = Math.PI / 2; hole.position.set(0, 0.08 + h * 0.45 - 0.008, w / 2 + 0.023); g.add(hole);
  g.userData = { glass, led, lock, h }; return g;
}
function courtroom(s = 1) {      // sala de vistas en miniatura: estrado elevado, mesas de las partes, banquillo de testigos
  const g = new THREE.Group();
  const floor = mesh(new THREE.BoxGeometry(1.5, 0.02, 1.1), M.woodL); floor.position.y = 0.01; g.add(floor);
  const dais = mesh(new THREE.BoxGeometry(1.1, 0.12, 0.3), M.wood); dais.position.set(0, 0.08, -0.38); g.add(dais);
  const bench = mesh(new THREE.BoxGeometry(1.0, 0.2, 0.08), M.wood); bench.position.set(0, 0.24, -0.28); g.add(bench);
  for (let i = 0; i < 5; i++) { const pnl = mesh(new THREE.BoxGeometry(0.16, 0.13, 0.005), M.woodL); pnl.position.set(-0.4 + i * 0.2, 0.24, -0.239); g.add(pnl); }
  for (let i = -1; i <= 1; i++) { const c = chair(0.26); c.position.set(i * 0.3, 0.14, -0.44); c.scale.setScalar(0.9); g.add(c); }
  for (const sd of [-1, 1]) { const tb = mesh(new THREE.BoxGeometry(0.4, 0.02, 0.18), M.wood); tb.position.set(sd * 0.36, 0.13, 0.18); g.add(tb); for (const x of [-0.18, 0.18]) { const l = mesh(new THREE.BoxGeometry(0.02, 0.12, 0.16), M.wood); l.position.set(sd * 0.36 + x, 0.06, 0.18); g.add(l); }
    for (const x of [-0.1, 0.1]) { const c = chair(0.16); c.position.set(sd * 0.36 + x, 0, 0.32); c.rotation.y = Math.PI; c.scale.setScalar(0.85); g.add(c); } }
  const wit = mesh(new THREE.BoxGeometry(0.18, 0.16, 0.16), M.wood); wit.position.set(0.62, 0.08, -0.12); g.add(wit);
  const gv = gavel(0.18); gv.position.set(0.18, 0.37, -0.29); gv.rotation.y = 0.5; g.add(gv); g.userData.gavel = gv;
  g.scale.setScalar(s); return g;
}
// figuritas de los estudiantes: cuerpo + cabeza fundidos en una geometría (para instanciar miles)
function studentGeo(lo = false) {
  const body = new THREE.CylinderGeometry(lo ? 0.009 : 0.0095, lo ? 0.014 : 0.0145, 0.034, lo ? 6 : 14); body.translate(0, 0.017, 0);
  const sh = new THREE.SphereGeometry(lo ? 0.011 : 0.0115, lo ? 6 : 14, lo ? 4 : 8, 0, Math.PI * 2, 0, Math.PI / 2); sh.translate(0, 0.034, 0);
  const head = new THREE.SphereGeometry(lo ? 0.0075 : 0.008, lo ? 6 : 16, lo ? 4 : 12); head.translate(0, 0.052, 0);
  const parts = [body, sh, head].map(g => g.index ? g.toNonIndexed() : g); parts.forEach(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
  return mergeGeometries(parts);
}
function capGeo() { const b = new THREE.BoxGeometry(0.022, 0.003, 0.022); b.translate(0, 0.062, 0); const c = new THREE.CylinderGeometry(0.008, 0.009, 0.006, 10); c.translate(0, 0.0585, 0); return mergeGeometries([b.toNonIndexed(), c.toNonIndexed()].map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; })); }
// ---------------------------------------------------------------- el fondo y la luz: 'ocaso' (domingo a las siete de la tarde).
// moodSet(nombre) pone uno; moodMix({vice: 0.3, noche: 0.7}) mezcla. Cielo de degradado (cúpula que sigue a la cámara) + reflejos (PMREM de ese cielo).
const _o = new THREE.Object3D();      // objeto de trabajo para las matrices de las instancias
const ASSET = '/projects/voz_cerebro/web/assets/';
const ENV = { rot: 0, env: 1 };
const TEXL = new THREE.TextureLoader(), PENDING = [];
function tx(path, srgb = true, rep = null) { let ok; PENDING.push(new Promise(a => { ok = a; })); const t = TEXL.load(ASSET + path, () => ok(), undefined, () => { console.error('ERROR textura ' + path); ok(); });
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
function waitLoads() { return Promise.all(PENDING); }
const C3 = h => new THREE.Color(h);
// sky: cénit, horizonte, suelo (bajo el horizonte), sol (dirección, color, tamaño); fog: color y densidad (FogExp2, por unidad); key: sol/foco; fill; hemi: cielo, suelo, intensidad
const MOODS = {
  // vacío negro de holograma: casi sin luz de ambiente; lo que se ve brilla por sí mismo (oro y azul) y el resplandor hace el resto
  vacio: { zen: 0x000000, hor: 0x02040a, gnd: 0x000000, sunD: [0.3, 0.8, 0.5], sunC: 0x000000, sunS: 0.0, stars: 0.0, fogC: 0x000000, fogD: 0.0,
           key: [0xbfd8ff, 1.2], keyD: [0.5, 0.7, 0.6], fill: [0xffc070, 0.5], hemi: [0x6a8cff, 0x140a04, 0.35], env: 0.35, exp: 1.0 },
};
const SKY_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vD; void main(){ vD = normalize(position); vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;
#include <logdepthbuf_vertex>
}`;
const SKY_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 zen, hor, gnd, sunD, sunC; uniform float sunS, stars; varying vec3 vD;
float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main(){
#include <logdepthbuf_fragment>
  vec3 d = normalize(vD); float y = d.y;

  vec3 c = vec3(0.0);
  float s = max(dot(d, normalize(sunD)), 0.);
  c += sunC * (pow(s, 6.) * 0.35 + pow(s, 60.) * 0.9 + smoothstep(0.9993, 0.9997, s) * 6.) * sunS;
  if (stars > 0. && y > 0.02) { vec3 q = floor(d * 420.); float r = h3(q); c += vec3(0.9, 0.95, 1.) * step(0.9965, r) * stars * (0.4 + 0.6 * h3(q + 3.1)) * smoothstep(0.02, 0.25, y); }
  gl_FragColor = vec4(c, 1.); }`;
function skyMat() { return new THREE.ShaderMaterial({ uniforms: { zen: { value: C3(0) }, hor: { value: C3(0) }, gnd: { value: C3(0) }, sunD: { value: new THREE.Vector3(0, 1, 0) }, sunC: { value: C3(0) }, sunS: { value: 0 }, stars: { value: 0 } },
  vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false }); }
function skyUniforms(u, M) { u.zen.value.set(M.zen); u.hor.value.set(M.hor); u.gnd.value.set(M.gnd); u.sunD.value.set(...M.sunD).normalize(); u.sunC.value.set(M.sunC); u.sunS.value = M.sunS; u.stars.value = M.stars; }
let PMREM = null; const ENVS = {};
async function loadEnv() {
  PMREM = new THREE.PMREMGenerator(renderer);
  // reflejos de cada ambiente: su cielo en una escena pequeña (+ una «sala» neutra muy suave para que el plástico tenga brillos)
  for (const k in MOODS) { const sc = new THREE.Scene(), m = skyMat(); skyUniforms(m.uniforms, MOODS[k]); const s = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), m); sc.add(s);
    { const room = new RoomEnvironment(); room.scale.setScalar(0.6); room.traverse(o => { if (o.material) { o.material = o.material.clone(); if (o.material.color) o.material.color.multiplyScalar(0.12); if (o.material.emissive) o.material.emissiveIntensity *= 0.12; } }); sc.add(room); }
    ENVS[k] = PMREM.fromScene(sc, 0.03).texture; }
  { const re = new RoomEnvironment(); S.studio = PMREM.fromScene(re, 0.04).texture; }
  S.sky = new THREE.Mesh(new THREE.SphereGeometry(15000, 64, 32), skyMat()); S.sky.renderOrder = -10; S.sky.frustumCulled = false; scene.add(S.sky);
  scene.background = null; S.fog = new THREE.FogExp2(0x000000, 0); scene.fog = S.fog;
}
// la luz: un «sol» que da sombras (sigue a lo que mira la cámara), un relleno y una luz de cielo/suelo
function buildLights() {
  const key = new THREE.DirectionalLight(0xffffff, 2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 4; key.shadow.bias = -0.0003;
  scene.add(key, key.target); const fill = new THREE.DirectionalLight(0xffffff, 0.4); scene.add(fill, fill.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.4); scene.add(hemi); S.L = { key, fill, hemi, keyD: new THREE.Vector3(0, 1, 0), fillD: new THREE.Vector3(-0.95, 0.22, -0.1) };
  moodSet('vacio');
}
// mezcla de ambientes: w = { museo: 0.2, brasil: 0.8 } (se normaliza). Los reflejos son los del que más pesa.
const _ca = new THREE.Color(), _cb = new THREE.Color();
function moodMix(w) {
  let tot = 0; for (const k in w) tot += w[k]; if (tot <= 0) return; const ks = Object.keys(w).filter(k => w[k] > 0);
  const col = f => { _ca.setRGB(0, 0, 0); for (const k of ks) { _cb.set(f(MOODS[k])); _ca.r += _cb.r * w[k] / tot; _ca.g += _cb.g * w[k] / tot; _ca.b += _cb.b * w[k] / tot; } return _ca; };
  const num = f => ks.reduce((s, k) => s + f(MOODS[k]) * w[k] / tot, 0);
  const vec = f => { const v = new THREE.Vector3(); for (const k of ks) v.addScaledVector(new THREE.Vector3(...f(MOODS[k])).normalize(), w[k] / tot); return v.normalize(); };
  const u = S.sky.material.uniforms; u.zen.value.copy(col(M => M.zen)); u.hor.value.copy(col(M => M.hor)); u.gnd.value.copy(col(M => M.gnd)); u.sunC.value.copy(col(M => M.sunC));
  u.sunD.value.copy(vec(M => M.sunD)); u.sunS.value = num(M => M.sunS); u.stars.value = num(M => M.stars);
  S.fog.color.copy(col(M => M.fogC)); S.fog.density = Math.exp(num(M => Math.log(M.fogD + 1e-7))) * (S.fogK ?? 1);
  const L = S.L; L.key.color.copy(col(M => M.key[0])); L.key.intensity = num(M => M.key[1]); L.keyD.copy(vec(M => M.keyD));
  L.fill.color.copy(col(M => M.fill[0])); L.fill.intensity = num(M => M.fill[1]);
  L.hemi.color.copy(col(M => M.hemi[0])); L.hemi.groundColor.copy(col(M => M.hemi[1])); L.hemi.intensity = num(M => M.hemi[2]);
  let best = ks[0]; for (const k of ks) if (w[k] > w[best]) best = k; S.mood = best;
  scene.environment = ENVS[best]; S.envI = num(M => M.env) * ENV.env; scene.environmentIntensity = S.envI;
  for (const m of ENVMATS) envMat(m);
}
function moodSet(k) { moodMix({ [k]: 1 }); }
// la sombra sigue a lo que mira la cámara (más fina cuanto más cerca: sirve de cerca y en planos de cientos de unidades)
function lightsAt(c, d) {
  const L = S.L, R = clamp(d * 0.75, 1.5, 900), sc = L.key.shadow.camera, far = 400 + 3 * R;
  S.sky.position.copy(cam.position);
  L.key.position.copy(c).addScaledVector(L.keyD, far * 0.5); L.key.target.position.copy(c);
  sc.left = sc.bottom = -R; sc.right = sc.top = R; sc.near = Math.max(0.1, far * 0.5 - 3 * R - 60); sc.far = far * 0.5 + 3 * R + 120; sc.updateProjectionMatrix(); L.key.shadow.normalBias = R * 0.004;
  L.fill.position.copy(c).addScaledVector(L.fillD, 300); L.fill.target.position.copy(c);
}
// materiales que llevan sus propios reflejos (con intensidad propia): se les cambia el mapa al cambiar de ambiente
const ENVMATS = new Set();
function envMat(m, k) { if (!m || !m.isMeshStandardMaterial || !scene.environment) return; if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity; if (k !== undefined) m.userData.envK = k; ENVMATS.add(m);
  if (m.envMap !== scene.environment) { m.envMap = scene.environment; m.needsUpdate = true; } m.envMapIntensity = m.userData.envFixed ?? m.userData.env0 * (m.userData.envK ?? 1) * (S.envI ?? 1); }
function envAll(root, k) { root.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) envMat(m, k); }); }
// ---------------------------------------------------------------- LA CABEZA DE CRISTAL (lámina 2 de Javi) con el cerebro de luz dentro, la vía que baja hasta la boca y la garganta,
// la lengua, los labios y la laringe (los músculos del habla) y la onda de la palabra que se queda atrapada detrás de los labios.
// Escaneo de cabeza: LeePerrySmith (Infinite-Realities, CC BY 3.0; viene con los ejemplos de three.js). La cara mira a +z; su lado izquierdo es +x.
const HEAD = { s: 1 };
// tubo con pulsos de luz que viajan (u de 0 a 1 a lo largo); «alive» = hasta dónde llega la señal; más allá, la vía apagada (gris y rota)
const PATH_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float time, alive, op, speed; uniform vec3 col; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
#include <logdepthbuf_fragment>
  float u = vUv.x, f = 1. - abs(dot(normalize(vN), normalize(vV)));
  float p = fract(u * 7. - time * speed), pulse = smoothstep(0.0, 0.05, p) * smoothstep(0.22, 0.05, p);
  float on = 1. - smoothstep(alive - 0.015, alive + 0.015, u);
  float broken = step(0.5, fract(u * 40.)) * 0.5;
  vec3 c = col * on * (0.25 + 0.4 * f + 2.6 * pulse) + vec3(0.25, 0.27, 0.32) * (1. - on) * broken * 0.35;
  float a = op * (on * (0.35 + 0.65 * pulse + 0.4 * f) + (1. - on) * broken * 0.35);
  gl_FragColor = vec4(c * op, a);
}`;
const PATH_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`;
function pathMat(col = GOLD) { return new THREE.ShaderMaterial({ vertexShader: PATH_VS, fragmentShader: PATH_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { time: { value: 0 }, alive: { value: 1 }, op: { value: 1 }, speed: { value: 1.2 }, col: { value: col.clone() } } }); }
async function buildHead() { const g = new THREE.Group(), U = g.userData;
  const gl = await new GLTFLoader().loadAsync(ASSET + 'LeePerrySmith.glb'); let mesh = null; gl.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
  const geo = mesh.geometry.clone(); geo.computeBoundingBox(); const bb = geo.boundingBox, sz = bb.getSize(_v()), ctr = bb.getCenter(_v());
  const s = 2.3 / sz.y; geo.translate(-ctr.x, -ctr.y, -ctr.z); geo.scale(s, s, s); HEAD.s = s;
  // el escaneo trae dentro la «bolsa» de la boca y los ojos: se queda solo la piel (la pieza conectada más grande, uniendo vértices repetidos)
  { const P = geo.attributes.position, I = geo.index.array, n = P.count, key = new Map(), weld = new Int32Array(n);
    for (let i = 0; i < n; i++) { const k = Math.round(P.getX(i) * 2000) + ',' + Math.round(P.getY(i) * 2000) + ',' + Math.round(P.getZ(i) * 2000); if (!key.has(k)) key.set(k, i); weld[i] = key.get(k); }
    const par = new Int32Array(n).map((_, i) => i), f = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }, un = (a, b) => { a = f(a); b = f(b); if (a !== b) par[a] = b; };
    for (let i = 0; i < I.length; i += 3) { un(weld[I[i]], weld[I[i + 1]]); un(weld[I[i]], weld[I[i + 2]]); }
    const cnt = new Map(); for (let i = 0; i < I.length; i += 3) { const r = f(weld[I[i]]); cnt.set(r, (cnt.get(r) || 0) + 1); } let big = -1, bn = 0; cnt.forEach((v, k) => { if (v > bn) { bn = v; big = k; } });
    const keep = []; for (let i = 0; i < I.length; i += 3) if (f(weld[I[i]]) === big) keep.push(I[i], I[i + 1], I[i + 2]); geo.setIndex(keep); U.cut = { tris: I.length / 3, kept: keep.length / 3, parts: cnt.size }; }
  geo.computeVertexNormals();
  // la piel de cristal se pinta solo en su cara más cercana: primero su profundidad (sin color) y luego el brillo; así no se ven la nuca ni lo de dentro del escaneo.
  // Lo que va dentro de la cabeza (cerebro, vías, músculos, chips) se pinta ANTES (orden < 5) y se ve a través del cristal.
  const pre = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, transparent: true })); pre.renderOrder = 5; g.add(pre); U.pre = pre;
  U.holo = holoMat(CYAN, 1, { edge: 2.0 }); U.holo.depthFunc = THREE.LessEqualDepth; const h = new THREE.Mesh(geo, U.holo); h.renderOrder = 8; g.add(h); U.mesh = h; U.geo = geo;
  // puntos de referencia de la cara (sacados del escaneo): punta de la nariz, labios, barbilla
  { const p = geo.attributes.position; let nose = null; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i), x = p.getX(i); if (Math.abs(x) < 0.06 && y > -0.4 && (!nose || z > nose.z)) nose = _v().set(x, y, z); }
    let lip = null; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i), x = p.getX(i); if (Math.abs(x) < 0.04 && y < nose.y - 0.2 && y > nose.y - 0.34 && (!lip || z > lip.z)) lip = _v().set(0, y, z); }
    let chin = null; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i), x = p.getX(i); if (Math.abs(x) < 0.04 && y < nose.y - 0.42 && y > nose.y - 0.62 && (!chin || z > chin.z)) chin = _v().set(0, y, z); }
    U.nose = nose; U.lip = lip; U.chin = chin; }
  // el cerebro real (Conte69) dentro de la cabeza: ≈ 1,12 de largo; centrado en (0, 0,56, −0,10)
  const B = await realBrain({ pink: true }); const BS = 0.00655; B.scale.setScalar(BS); B.position.set(0, 0.56 - 15 * BS, -0.1 + 17 * BS); g.add(B); U.brain = B; B.updateMatrixWorld(true);
  // la corteza motora del habla (hemisferio izquierdo, giro precentral ventral; MNI ≈ (−56, −2, 28) → en el modelo (56, 28, −2)): el vértice más cercano y su normal
  // la normal es la media de 15 mm alrededor (la de la superficie «de fuera», no la de la pared de un surco) y el punto es el más saliente a ≤ 9 mm: la cresta del giro
  { const G = await loadBrainGeo(), P = G.lh.attributes.position, Nn = G.lh.attributes.normal, tgt = _v().set(56, 28, -2), d2 = i => (P.getX(i) - tgt.x) ** 2 + (P.getY(i) - tgt.y) ** 2 + (P.getZ(i) - tgt.z) ** 2;
    const avg = _v(); for (let i = 0; i < P.count; i++) { const d = d2(i); if (d < 225) avg.add(_v().set(Nn.getX(i), Nn.getY(i), Nn.getZ(i)).multiplyScalar(1 - Math.sqrt(d) / 15)); } avg.normalize();
    let best = 0, bs = -1e9; for (let i = 0; i < P.count; i++) { const d = d2(i); if (d < 81) { const s = (P.getX(i) - tgt.x) * avg.x + (P.getY(i) - tgt.y) * avg.y + (P.getZ(i) - tgt.z) * avg.z - 0.02 * d; if (s > bs) { bs = s; best = i; } } }
    const lhMesh = B.userData.parts[0]; lhMesh.updateMatrixWorld(true); U.speechL = _v().set(P.getX(best), P.getY(best), P.getZ(best)); U.speechN = avg.clone();
    U.speech = lhMesh.localToWorld(U.speechL.clone()); U.speechNW = U.speechN.clone().transformDirection(lhMesh.matrixWorld); U.lhMesh = lhMesh; }
  for (const m of B.userData.mats) m.uniforms.hot.value.set(U.speech.x, U.speech.y, U.speech.z, 0.09);
  // músculos del habla: lengua, labios y laringe (holograma azul que se apaga)
  const mm = holoMat(new THREE.Color(0.3, 0.85, 1.0), 0, { edge: 1.6, col2: new THREE.Color(0.1, 0.35, 0.6) });
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 20), mm); tongue.scale.set(0.75, 0.38, 1.25); tongue.position.copy(U.lip).add(_v().set(0, 0.0, -0.32)); g.add(tongue);
  const lips = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 12, 40), mm); lips.scale.set(1, 0.45, 1); lips.position.copy(U.lip).add(_v().set(0, 0, -0.02)); g.add(lips);
  const lar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.24, 24, 1, true), mm); lar.position.set(0, U.chin.y - 0.28, U.chin.z - 0.42); lar.rotation.x = 0.25; g.add(lar);
  U.muscles = [tongue, lips, lar]; U.mm = mm; mm.depthTest = false; U.muscles.forEach(m => m.renderOrder = 4);
  // la vía: de la corteza del habla, por el tronco del encéfalo, a la lengua, a los labios y a la laringe
  const stem = B.localToWorld(_v().set(0, -25, -30)), stem2 = B.localToWorld(_v().set(0, -62, -22)), br = _v().set(0, U.chin.y + 0.05, U.chin.z - 0.55);
  const P0 = [U.speech, U.speech.clone().lerp(stem, 0.5).add(_v().set(0.05, 0.05, 0)), stem, stem2, br];
  const routes = [[...P0, tongue.position.clone().add(_v().set(0, -0.02, -0.06))], [...P0, U.lip.clone().add(_v().set(0, -0.05, -0.1)), lips.position.clone()], [...P0, lar.position.clone().add(_v().set(0, 0.1, 0))]];
  U.pm = pathMat(GOLD); U.paths = routes.map(r => { const c = new THREE.CatmullRomCurve3(r, false, 'centripetal'); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 160, 0.011, 8), U.pm); m.renderOrder = 4; g.add(m); return c; }); U.pm.depthTest = false;
  // la palabra que quiere salir: una onda dorada entre la lengua y los labios, y el destello al chocar
  { const N = 220, pos = new Float32Array(N * 3); const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    U.word = new THREE.Points(gg, new THREE.PointsMaterial({ color: new THREE.Color(1, 0.75, 0.3).multiplyScalar(2), size: 0.034, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: starTex0() })); U.word.frustumCulled = false; U.word.renderOrder = 4; U.word.material.depthTest = false; g.add(U.word);
    U.hit = glowSprite(0xff6a4a, 0.5, 0); U.hit.renderOrder = 4; U.hit.position.copy(U.lip).add(_v().set(0, 0, 0.02)); g.add(U.hit); }
  return g; }
// la onda de la palabra: avanza de la lengua a los labios (k de 0 a 1) y se aplasta contra ellos; a = brillo
function wordWave(U, k, a, t) { const p = U.word.geometry.attributes.position, N = p.count, z0 = U.lip.z - 0.36, z1 = U.lip.z - 0.03, front = lerp(z0, z1, Math.min(1, k));
  for (let i = 0; i < N; i++) { const u = i / (N - 1), z = front - u * 0.22, amp = 0.075 * Math.sin(u * Math.PI) * (k > 1 ? Math.max(0, 1 - (k - 1) * 2) : 1); p.setXYZ(i, Math.sin(u * 40 - t * 14) * amp * 0.5, U.lip.y + Math.sin(u * 22 - t * 10) * amp, Math.min(z, z1)); }
  p.needsUpdate = true; U.word.material.opacity = a; }
// ---------------------------------------------------------------- LAS NEURONAS (en NEU), como la lámina de Javi: cuerpos azules translúcidos con el núcleo de oro, ramas azules con motas de oro,
// una sinapsis en el centro con la chispa dorada entre los dos botones, y neuronas desenfocadas al fondo. Entra la punta de un electrodo (aguja plateada con la punta de oro)
// que «escucha»: cuando una neurona dispara, la chispa viaja hasta la punta, que se enciende, y la señal sube por la aguja.
const NEU = new THREE.Vector3(0, 0, -400);
function neuronCell(seed, R = 0.32, o = {}) { const g = new THREE.Group(), curves = [];
  const memb = holoMat(new THREE.Color(0.38, 0.6, 1.0), 1, { edge: 1.5, col2: new THREE.Color(0.14, 0.22, 0.62), scan: 0 });
  const soma = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), memb); soma.scale.set(1, 1.12, 0.95); g.add(soma);
  const nucG = glowSprite(0xffa040, R * 3.0, 0.85); g.add(nucG); const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.3, 24, 16), addM(new THREE.Color(1.0, 0.72, 0.35).multiplyScalar(1.8), 0.95)); g.add(core);
  const dm = holoMat(new THREE.Color(0.38, 0.62, 1.0), 0.95, { edge: 1.3, col2: new THREE.Color(0.12, 0.22, 0.65), scan: 0 });
  const branch = (o0, dir, len, r0, depth, sd) => { const pts = [o0.clone()]; let p = o0.clone(), d = dir.clone().normalize(); const k = 7;
    for (let i = 1; i <= k; i++) { d.add(_v().set(hash(sd * 7 + i) - 0.5, hash(sd * 11 + i) - 0.5, hash(sd * 13 + i) - 0.5).multiplyScalar(0.5)).normalize(); p = p.clone().addScaledVector(d, len / k); pts.push(p); }
    const c = new THREE.CatmullRomCurve3(pts); curves.push(c); const tg = new THREE.TubeGeometry(c, 48, r0, 10), pp = tg.attributes.position, uv = tg.attributes.uv;
    for (let i = 0; i < pp.count; i++) { const u = uv.getX(i), cc = c.getPointAt(u), sc = 1 - 0.82 * u; pp.setXYZ(i, cc.x + (pp.getX(i) - cc.x) * sc, cc.y + (pp.getY(i) - cc.y) * sc, cc.z + (pp.getZ(i) - cc.z) * sc); } tg.computeVertexNormals();
    g.add(new THREE.Mesh(tg, dm)); if (depth > 0) for (let j = 0; j < 2; j++) { const at = 0.4 + j * 0.3; branch(c.getPointAt(at), c.getTangentAt(at).add(_v().set(hash(sd + j) - 0.5, hash(sd * 2 + j) - 0.5, hash(sd * 3 + j) - 0.5).multiplyScalar(1.5)), len * 0.55, r0 * 0.55, depth - 1, sd * 1.7 + j * 3.3); } };
  const nd = o.nd ?? (5 + Math.floor(hash(seed * 3.1) * 3));
  for (let i = 0; i < nd; i++) { const a = i / nd * Math.PI * 2 + hash(seed + i) * 0.6, el = (hash(seed * 5 + i) - 0.4) * 1.3, d = _v().set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); branch(d.clone().multiplyScalar(R * 0.85), d, 1.7 + hash(seed * 9 + i) * 1.4, R * 0.26, 2, seed * 31 + i * 7); }
  // motas de oro sobre las ramas (como en la lámina)
  const dots = []; curves.forEach((c, i) => { for (let k = 0; k < 3; k++) { const u = hash(seed * 17 + i * 5 + k); if (u < 0.15) continue; const s = glowSprite(0xffc070, 0.07 + hash(i + k) * 0.06, 0.85); s.position.copy(c.getPointAt(u)); g.add(s); dots.push(s); } });
  g.userData = { curves, nucG, core, memb, dm, R, dots }; return g; }
// el botón de una sinapsis (el extremo bulboso del axón), con vesículas de oro dentro
function synBouton(dir, len = 2.4) { const g = new THREE.Group(), memb = holoMat(new THREE.Color(0.4, 0.62, 1.0), 1, { edge: 1.4, col2: new THREE.Color(0.14, 0.24, 0.66), scan: 0 });
  const pr = [[0.0, 0], [0.42, 0.05], [0.52, 0.28], [0.44, 0.55], [0.22, 0.8], [0.12, 1.1], [0.1, len]].map(q => new THREE.Vector2(q[0], q[1])); const m = new THREE.Mesh(new THREE.LatheGeometry(pr, 40), memb); g.add(m);
  const ves = []; for (let i = 0; i < 26; i++) { const s = glowSprite(i % 3 ? 0xffb040 : 0xffe0a0, 0.07 + hash(i * 3) * 0.05, 0.9); s.position.set((hash(i) - 0.5) * 0.6, 0.12 + hash(i * 2) * 0.45, (hash(i * 5) - 0.5) * 0.6); g.add(s); ves.push(s); }
  g.quaternion.setFromUnitVectors(_v().set(0, 1, 0), dir.clone().normalize()); g.userData = { ves, memb }; return g; }
function buildNeuro() { const g = new THREE.Group(), U = g.userData; g.position.copy(NEU);
  // la sinapsis en el centro: dos botones casi tocándose (hueco de 0,18) y la chispa entre ellos
  U.b1 = synBouton(_v().set(-1, 0.25, 0.1)); U.b1.position.set(-0.11, 0, 0); g.add(U.b1);
  U.b2 = synBouton(_v().set(1, -0.2, -0.1)); U.b2.position.set(0.11, 0, 0); g.add(U.b2);
  U.spark = glowSprite(0xffd070, 1.6, 0); g.add(U.spark); U.spark2 = glowSprite(0xffffff, 0.5, 0); g.add(U.spark2);
  U.rays = new THREE.Group(); for (let i = 0; i < 10; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.02), addM(new THREE.Color(1.0, 0.8, 0.4).multiplyScalar(2), 0)); r.rotation.z = i / 10 * Math.PI; U.rays.add(r); } g.add(U.rays);
  // neuronas alrededor (las cercanas, nítidas; las del fondo, más grandes y desenfocadas por la profundidad de campo)
  U.cells = []; const P = [[-2.6, 1.4, -0.8, 0.42], [2.4, 1.6, -1.2, 0.36], [2.0, -1.8, -0.4, 0.34], [-2.2, -2.0, -1.4, 0.3], [0.4, 3.0, -2.6, 0.32], [-3.6, -0.2, -3.5, 0.4], [3.8, 0.2, -3.8, 0.38], [0.2, -3.4, -2.8, 0.34], [-1.2, 2.6, -5, 0.45], [1.8, -0.4, -6, 0.5], [-4.6, 2.8, -7, 0.5], [4.4, -3.0, -7.5, 0.55]];
  P.forEach((q, i) => { const c = neuronCell(i + 3, q[3]); c.position.set(q[0], q[1], q[2]); c.rotation.set(hash(i) * 3, hash(i * 2) * 3, hash(i * 5) * 3); g.add(c); U.cells.push(c); });
  // chispas que viajan por las ramas
  U.sparks = []; for (let i = 0; i < 40; i++) { const s = glowSprite(i % 4 ? 0xffc060 : 0xa0e0ff, 0.26, 0); g.add(s); U.sparks.push(s); }
  // el electrodo: una aguja que baja desde arriba; su punta queda junto a la neurona 0
  const nd = new THREE.Group(), L = 6; const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.012, L, 32), new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.15, metalness: 1.0, emissive: 0x1a2a3a, emissiveIntensity: 0.6 }));
  cone.position.y = L / 2; nd.add(cone); U.tipM = addM(new THREE.Color(1.0, 0.78, 0.35).multiplyScalar(2.2), 0.6); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), U.tipM); nd.add(tip); U.tipG = glowSprite(0xffc060, 0.6, 0); nd.add(U.tipG);
  const sig = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, L, 8, 1, true), new THREE.ShaderMaterial({ vertexShader: PATH_VS, fragmentShader: PATH_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, alive: { value: 1 }, op: { value: 0 }, speed: { value: 2.5 }, col: { value: GOLD.clone() } } })); sig.position.y = L / 2; nd.add(sig); U.sig = sig;
  nd.position.set(-1.55, 0.95, 0.3); nd.rotation.z = -0.35; g.add(nd); U.needle = nd;
  U.target = U.cells[0]; return g; }
// k = 1: la neurona del electrodo dispara; fire = actividad general; a = brillo de todo
function neuroAt(N, t, o) { const U = N.userData, a = o.a ?? 1; N.visible = a > 0.01; if (!N.visible) return;
  const sp = o.syn ?? 0, ph = (t * 1.3) % 1, flash = Math.pow(Math.max(0, Math.sin(ph * Math.PI)), 6) * sp;
  U.spark.material.opacity = (0.25 + 0.75 * flash) * sp * a; U.spark.scale.setScalar(0.9 + 1.2 * flash); U.spark2.material.opacity = flash * a; U.rays.children.forEach((r, i) => { r.material.opacity = flash * 0.5 * a * (0.5 + 0.5 * hash(i + Math.floor(t * 8))); r.scale.x = 0.4 + flash * (0.6 + hash(i) * 0.8); });
  [U.b1, U.b2].forEach(b => b.userData.ves.forEach((v, i) => { v.material.opacity = a * (0.5 + 0.5 * Math.sin(t * 3 + i)); }));
  // chispas por las ramas
  let k = 0; U.cells.forEach((c, ci) => { c.userData.memb.uniforms.op.value = a; c.userData.dm.uniforms.op.value = a * 0.95; c.userData.nucG.material.opacity = 0.85 * a * (1 + 0.5 * (o.fire ?? 0) * Math.max(0, Math.sin(t * 7 + ci)));
    c.userData.dots.forEach(d => d.material.opacity = 0.85 * a); c.updateMatrixWorld(true);
    for (let j = 0; j < 3 && k < U.sparks.length; j++, k++) { const cv = c.userData.curves[(j * 3 + ci) % c.userData.curves.length], u = (t * (0.35 + 0.2 * hash(ci * 3 + j)) + hash(ci + j * 7)) % 1, s = U.sparks[k];
      s.position.copy(c.localToWorld(cv.getPointAt(1 - u))).sub(NEU); s.material.opacity = a * (o.fire ?? 0.4) * Math.sin(u * Math.PI); } });
  // la punta del electrodo: se enciende cuando le llega la chispa de la neurona 0
  const lis = o.listen ?? 0, beat = Math.pow(Math.max(0, Math.sin(t * 5.2)), 8) * lis; U.tipM.opacity = (0.4 + 0.6 * beat) * a; U.tipG.material.opacity = (0.15 + 0.85 * beat) * a * lis; U.tipG.scale.setScalar(0.4 + 0.6 * beat);
  U.sig.material.uniforms.op.value = lis * a; U.sig.material.uniforms.time.value = t; U.needle.children[0].material.opacity = a; }
// ---------------------------------------------------------------- LA IMPLANTACIÓN (lámina del brazo robótico): cuatro herramientas cromadas con aros de luz cian bajan desde arriba,
// cada una con un chip de 8 × 8 agujas, y lo colocan en la corteza del habla del cerebro rosa. Medidas de los chips en mm (≈ 3,2 mm de lado, agujas de 1,5 mm),
// a la escala del cerebro.
const CHIPMM = { side: 3.2, n: 8, len: 1.5, base: 0.35 };
function chipMM() { const g = new THREE.Group(), C = CHIPMM;
  const base = new THREE.Mesh(new THREE.BoxGeometry(C.side, C.base, C.side), new THREE.MeshPhysicalMaterial({ color: 0xbfd6e6, roughness: 0.12, metalness: 0.3, transmission: 0.0, clearcoat: 1, emissive: 0x0b2236, emissiveIntensity: 0.9,
    map: canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#6f8ea6'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffd27a'; c.lineWidth = 3; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const x = 16 + i * 32, y = 16 + j * 32; c.beginPath(); c.arc(x, y, 7, 0, 7); c.stroke(); } c.strokeStyle = '#9fe6ff'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); }) }));
  base.position.y = C.base / 2; g.add(base);
  const ng = new THREE.ConeGeometry(0.09, C.len, 10); ng.translate(0, -C.len / 2, 0); ng.rotateX(Math.PI);                       // punta hacia abajo
  const nm = new THREE.InstancedMesh(ng, new THREE.MeshStandardMaterial({ color: 0xe9eef3, roughness: 0.15, metalness: 1.0, emissive: 0x223344, emissiveIntensity: 0.5 }), C.n * C.n); const m4 = new THREE.Matrix4(), st = C.side / C.n; let k = 0;
  for (let i = 0; i < C.n; i++) for (let j = 0; j < C.n; j++) { m4.makeTranslation(-C.side / 2 + st * (i + 0.5), -C.len / 2, -C.side / 2 + st * (j + 0.5)); nm.setMatrixAt(k++, m4); } g.add(nm);
  // haz de cables (sale del chip hacia arriba)
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 6, 10), new THREE.MeshStandardMaterial({ color: 0xd4a84a, roughness: 0.3, metalness: 0.9, emissive: 0x3a2008, emissiveIntensity: 0.6 })); wire.position.set(C.side / 2 - 0.3, C.base + 3, 0); wire.visible = false; g.add(wire);
  const halo = glowSprite(0x7fd8ff, C.side * 2.4, 0); halo.position.y = C.base; g.add(halo);
  g.userData = { base, nm, halo, wire }; return g; }
// herramienta cromada (cuerpo largo, anillos, aro de luz y boquilla); la punta está en el origen y el cuerpo sube por +y
function tool() { const g = new THREE.Group(), chrome = new THREE.MeshStandardMaterial({ color: 0xf0f4f8, roughness: 0.12, metalness: 1.0 }), dark = new THREE.MeshStandardMaterial({ color: 0x15191f, roughness: 0.35, metalness: 0.8 }), led = addM(new THREE.Color(0.25, 0.9, 1.0).multiplyScalar(2.4), 1);
  const r = 0.02; const add = (m, y) => { m.position.y = y; g.add(m); return m; };
  add(cyl(r * 0.25, r * 0.55, r * 1.6, chrome, 24), r * 0.8); add(cyl(r * 0.75, r * 0.75, r * 0.5, dark, 32), r * 1.85); add(new THREE.Mesh(new THREE.TorusGeometry(r * 0.78, r * 0.08, 10, 40), led), r * 1.85).rotation.x = Math.PI / 2;
  add(cyl(r, r, r * 3, chrome, 32), r * 3.6); add(cyl(r * 1.08, r * 1.08, r * 0.35, dark, 32), r * 5.3); add(new THREE.Mesh(new THREE.TorusGeometry(r * 1.1, r * 0.07, 10, 40), led), r * 5.3).rotation.x = Math.PI / 2;
  add(cyl(r * 0.9, r * 0.9, 1.2, chrome, 32), r * 5.5 + 0.6); const tipL = glowSprite(0x7fefff, r * 3, 0.9); tipL.position.y = r * 0.1; g.add(tipL);
  g.userData = { tipL }; return g; }
function buildArms(head) { const U = head.userData, g = new THREE.Group(), A = g.userData; head.add(g);
  const n = U.speechNW.clone(), up = _v().set(0, 1, 0), t1 = _v().crossVectors(n, up).normalize(), t2 = _v().crossVectors(n, t1).normalize(), BS = U.brain.scale.x, sp = 5.2 * BS;
  A.spots = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => U.speech.clone().addScaledVector(t1, a * sp / 2).addScaledVector(t2, b * sp / 2));
  A.n = n; A.q = new THREE.Quaternion().setFromUnitVectors(_v().set(0, 1, 0), n);
  A.chips = A.spots.map(() => { const c = chipMM(); c.scale.setScalar(BS); g.add(c); return c; });
  A.tools = A.spots.map((p, i) => { const t = tool(); t.traverse(o => o.renderOrder = 4); g.add(t); return t; }); A.chips.forEach(c => c.traverse(o => o.renderOrder = 4));
  // luces del quirófano (solo cuando el cerebro es rosa)
  A.lights = new THREE.Group(); g.add(A.lights); const k1 = new THREE.PointLight(0xfff0e6, 0, 6, 1.4); k1.position.copy(U.speech).addScaledVector(n, 0.9).add(_v().set(0, 0.6, 0.3)); const k2 = new THREE.PointLight(0x5fd8ff, 0, 4, 1.6); k2.position.copy(U.speech).addScaledVector(n, 0.4).add(_v().set(0, -0.3, -0.5));
  const k3 = new THREE.PointLight(0xffd0d8, 0, 6, 1.4); k3.position.set(-1.2, 1.6, 1.2); A.lights.add(k1, k2, k3); A.L = [k1, k2, k3];
  return g; }
// kk[i] = 0 arriba (lejos) … 1 chip colocado; out = la herramienta se retira tras soltarlo; ins = cuánto han entrado las agujas (0–1)
function armsAt(head, t, o) { const U = head.userData, A = head.userData.arms.userData, BS = U.brain.scale.x, Lr = o.lights ?? 0;
  A.L[0].intensity = 1.5 * Lr; A.L[1].intensity = 1.4 * Lr; A.L[2].intensity = 0.6 * Lr;
  A.spots.forEach((p, i) => { const k = o.k[i], out = o.out[i], T = A.tools[i], C = A.chips[i], L = CHIPMM.len * BS, Bh = CHIPMM.base * BS;
    const sway = _v().set(Math.sin(i * 1.7) * 0.05, 0, Math.cos(i * 2.1) * 0.05).multiplyScalar(1 - sm5(k));
    T.position.copy(p).addScaledVector(A.n, L + Bh + 0.25 * (1 - sm5(k)) + 0.45 * sm5(out)).add(sway); T.quaternion.copy(A.q); T.visible = (o.a ?? 1) > 0.01 && out < 0.999;
    const ins = sm5(o.ins ?? 0); C.visible = (o.a ?? 1) > 0.01 && (o.showChips ?? 1) > 0; C.quaternion.copy(A.q);
    if (k < 0.999) C.position.copy(T.position).addScaledVector(A.n, -Bh); else C.position.copy(p).addScaledVector(A.n, L * (1 - ins));
    C.userData.halo.material.opacity = Math.min(1, o.glow ?? 0) * (0.6 + 0.4 * Math.sin(t * 6 + i)); C.userData.halo.scale.setScalar(CHIPMM.side * 2.4 * (1 + 3.5 * (o.big ?? 0))); T.userData.tipL.material.opacity = 0.9 * (1 - out); }); }   // big: al final los chips brillan desde lejos (la voz sale de ahí)
// ---------------------------------------------------------------- ONDAS DE LUZ (láminas «señales neuronales» y «una voz propia»): líneas hechas de muchos puntos que brillan.
// waveLine(n, cols): puntos con color propio; waveSet(...) los coloca a lo largo de un eje con una forma (EEG con picos, o voz)
function waveLine(n, cols, size = 0.02) { const g = new THREE.BufferGeometry(), col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const u = i / (n - 1), k = u * (cols.length - 1), a = Math.floor(Math.min(k, cols.length - 1.001)); c.copy(cols[a]).lerp(cols[a + 1], k - a); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: starTex0(), toneMapped: false })); m.frustumCulled = false; return m; }
// EEG: línea horizontal (de x0 a x1) con ruido y picos; «spk» = cuántos picos; «sh» = cuánto se ha dibujado (de izquierda a derecha)
function eegAt(m, x0, x1, y, z, t, amp, spk, sh = 1, a = 1, seed = 0) { const p = m.geometry.attributes.position, n = p.count;
  for (let i = 0; i < n; i++) { const u = i / (n - 1), x = lerp(x0, x1, u), tt = u * 18 - t * 2.2 + seed; let v = Math.sin(tt * 3.1) * 0.18 + Math.sin(tt * 7.3 + 1) * 0.1 + Math.sin(tt * 23.7 + seed) * 0.045 + Math.sin(tt * 41.3 + 2 + seed) * 0.03;
    const sp = hash(Math.floor(tt * 2.5) * 1.7 + seed), ph = ((tt * 2.5) % 1 + 1) % 1;   // (% de un negativo da negativo: eso hacía las columnas de puntos) if (sp > 1 - spk) v += (ph < 0.18 ? Math.sin(ph / 0.18 * Math.PI) * 1.5 : ph < 0.32 ? -Math.sin((ph - 0.18) / 0.14 * Math.PI) * 0.75 : 0);   // picos más bajos: los altos se veían como columnas de puntos
    const env = Math.sin(Math.min(1, u * 1.0) * Math.PI); p.setXYZ(i, x, y + v * amp * (0.35 + 0.65 * env), z); }
  p.needsUpdate = true; m.geometry.setDrawRange(0, Math.floor(n * clamp(sh))); m.material.opacity = a; }
// voz: varias líneas que salen de un punto (la boca) en una dirección (dir), ondulando en «up» y en «side», con forma de onda de sonido
function voiceAt(m, o, k, t, amp, a, len = 3.0) { const p = m.geometry.attributes.position, n = p.count, f = 6 + k * 1.7, D = o.dir || _v().set(o.dx ?? 1, 0, 0), Up = o.up || _v().set(0, 1, 0), Sd = o.side || _v().set(0, 0, 1);
  for (let i = 0; i < n; i++) { const u = i / (n - 1), env = Math.sin(Math.min(1, u * 2.6) * Math.PI / 2) * (1 - 0.5 * u) * (0.55 + 0.45 * Math.sin(u * 5 - t * 2 + k));
    const yy = Math.sin(u * f * 4 - t * 10 + k * 1.3) * (0.05 + 0.38 * amp) * env * (1 - k * 0.1), zz = Math.cos(u * f * 3 - t * 8 + k * 2) * (0.02 + 0.14 * amp) * env;
    p.setXYZ(i, o.x + D.x * u * len + Up.x * yy + Sd.x * zz, o.y + D.y * u * len + Up.y * yy + Sd.y * zz, o.z + D.z * u * len + Up.z * yy + Sd.z * zz); }
  p.needsUpdate = true; m.material.opacity = a; }
// ---------------------------------------------------------------- LA VOZ (en VOX), lámina «una voz propia»: el perfil de una cara hecho de partículas azules y moradas (mira a −x, a la izquierda de la pantalla)
// y la onda de colores que sale de su boca. Detrás de la cabeza, las grabaciones antiguas (vídeos) que alimentan la voz; arriba, la voz de robot que se tacha.
const VOX = new THREE.Vector3(-60, 0, 0);   // girada 90°: su «delante» (+z local) mira a +x, por donde llega la cámara desde el cerebro
function holoPanel(w, h, cw, ch, col = CYAN) { const g = new THREE.Group(), tex = canvasTex(cw, ch, null);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); g.add(p);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)), new THREE.LineBasicMaterial({ color: col.clone().multiplyScalar(1.4), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, toneMapped: false })); g.add(frame);
  g.userData = { tex, g: tex.userData.g, cw, ch, p, frame }; return g; }
function panelOp(P, a) { P.visible = a > 0.01; P.userData.p.material.opacity = a; P.userData.frame.material.opacity = 0.9 * a; }
const MONOF = '"SpaceMono","DejaVuMono",monospace';
function buildVoice(headGeo) { const g = new THREE.Group(), U = g.userData; g.position.copy(VOX); g.rotation.y = Math.PI / 2; g.updateMatrixWorld(true);
  // cara de partículas: puntos del escaneo, girados para mirar a −x; más densos y brillantes en el perfil
  const p = headGeo.attributes.position, n = p.count, pos = [], col = [], c = new THREE.Color(), R = rng(77);
  const cell = q => Math.floor(q / 0.035), key = (x, y, z) => cell(x) + ',' + cell(y) + ',' + cell(z), dens = new Map();
  for (let i = 0; i < n; i++) { const k = key(p.getX(i), p.getY(i), p.getZ(i)); dens.set(k, (dens.get(k) || 0) + 1); }
  let avg = 0; dens.forEach(v => avg += v); avg /= dens.size;
  for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y < -0.95) continue; const rep = 1 + (R() > 0.5 ? 1 : 0), eq = Math.min(1.3, Math.sqrt(avg / dens.get(key(x, y, z)))), back = 1 - sm5(clamp((-z + 0.05) / 0.5));
    if (back <= 0.02 && R() > 0.25) continue;
    for (let r = 0; r < rep; r++) { const j = (R() - 0.5) * 0.012; pos.push(-z + j, y + j, x + j); const k = clamp((y + 0.6) / 1.6); c.setRGB(lerp(0.25, 0.55, k), lerp(0.55, 0.3, k), 1.0).multiplyScalar((0.7 + 0.5 * R()) * eq * (0.12 + 0.88 * back)); col.push(c.r, c.g, c.b); } }
  // polvo de partículas detrás de la cara (la nuca se deshace en polvo, como en la lámina): más denso cerca de la cabeza
  for (let i = 0; i < 9000; i++) { const u = Math.pow(R(), 1.6), x = -0.1 + u * 1.5, y = (R() - 0.45) * 2.2 * (0.85 + 0.3 * u), zz = (R() - 0.5) * 1.3 * (0.7 + 0.6 * u); pos.push(x, y, zz); c.setRGB(0.35, 0.45, 1).multiplyScalar((0.25 + 0.4 * R()) * (1 - 0.6 * u)); col.push(c.r, c.g, c.b); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  U.face = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.016, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: starTex0(), toneMapped: false })); g.add(U.face);
  // la boca (donde empieza la onda): el punto más adelantado de los labios
  let lip = null; for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (Math.abs(x) < 0.04 && y < -0.14 && y > -0.3 && (!lip || z > lip.z)) lip = { y, z }; }
  U.mouth = _v().set(-lip.z - 0.03, lip.y - 0.02, 0);
  const cols = [new THREE.Color(0.3, 0.95, 1.6), new THREE.Color(0.45, 0.5, 1.9), new THREE.Color(1.5, 0.4, 1.4), new THREE.Color(1.7, 0.95, 0.35)];
  U.waves = [0, 1, 2, 3, 4, 5].map(k => { const w = waveLine(900, cols, 0.024); g.add(w); return w; });
  // las grabaciones antiguas (tres vídeos) detrás de la cabeza y la onda que va de ellas a la cabeza
  U.films = [0, 1, 2].map(i => { const P = holoPanel(0.46, 0.3, 360, 236, new THREE.Color(1.0, 0.7, 0.35)); P.position.set(-1.12 + i * 0.5, -1.02 - (i === 1 ? 0.05 : 0), 0.3); g.add(P); return P; });
  U.feed = waveLine(500, [new THREE.Color(1.6, 0.9, 0.4), new THREE.Color(1.0, 0.6, 1.4)], 0.018); g.add(U.feed);
  U.robot = holoPanel(0.95, 0.38, 600, 240, new THREE.Color(1.0, 0.35, 0.3)); U.robot.position.set(-0.97, 0.55, 0.25); U.robot.scale.setScalar(0.8); g.add(U.robot);
  return g; }
function drawFilm(P, i, t, a) { const U = P.userData, c = U.g, w = U.cw, h = U.ch; c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(32,20,8,.8)'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,200,120,.10)'; for (let k = 0; k < 6; k++) c.fillRect(0, (k * 41 + t * 30) % h, w, 2);
  c.fillStyle = 'rgba(255,214,150,.85)'; const by = 150 + 3 * Math.sin(t * 7 + i); c.beginPath(); c.arc(115, by - 74, 32, 0, 7); c.fill(); c.beginPath(); c.ellipse(115, by + 24, 56, 50, 0, Math.PI, 0); c.fill();
  c.strokeStyle = 'rgba(255,200,120,.95)'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x < 140; x += 3) { const y = 118 + Math.sin(x * 0.2 + t * 9 + i) * 24 * Math.sin(x / 140 * Math.PI) * (0.6 + 0.4 * Math.sin(t * 3 + i)); x ? c.lineTo(195 + x, y) : c.moveTo(195 + x, y); } c.stroke();
  c.font = `700 22px ${MONOF}`; c.fillStyle = '#ffd08a'; c.fillText(['2019', '2020', '2021'][i], 14, 30); c.fillText('● REC', w - 90, 30); U.tex.needsUpdate = true; panelOp(P, a); }
function drawRobot(P, t, a, cross) { const U = P.userData, c = U.g, w = U.cw, h = U.ch; c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(40,8,8,.6)'; c.fillRect(0, 0, w, h);
  c.font = `700 26px ${MONOF}`; c.fillStyle = '#ff8a7a'; c.fillText('VOZ ROBÓTICA', 20, 36); c.strokeStyle = '#ff6a5a'; c.lineWidth = 4; c.beginPath(); let y;
  for (let x = 20; x < w - 20; x += 24) { y = hash(Math.floor(x / 24) + Math.floor(t * 8)) > 0.5 ? 110 : 180; c.lineTo(x, y); c.lineTo(x + 24, y); } c.stroke();
  if (cross > 0) { c.strokeStyle = '#ff3b30'; c.lineWidth = 14; c.lineCap = 'round'; const k = clamp(cross * 2), k2 = clamp(cross * 2 - 1); c.beginPath(); c.moveTo(60, 40); c.lineTo(60 + (w - 120) * k, 40 + (h - 80) * k); c.stroke(); if (k2 > 0) { c.beginPath(); c.moveTo(w - 60, 40); c.lineTo(w - 60 - (w - 120) * k2, 40 + (h - 80) * k2); c.stroke(); } }
  U.tex.needsUpdate = true; panelOp(P, a); }
// ---------------------------------------------------------------- LA COREOGRAFÍA (un solo plano; tiempos de la voz de Javi)
// 0 cabeza de cristal con el cerebro de luz: la palabra se queda en los labios · 5,1 ELA: la señal baja hacia la boca y se corta · 10,7 el cerebro solo (lámina 1), la zona del habla
// 12,9 el cerebro se vuelve rosa y bajan los brazos cromados (lámina del implante) · 16,6 colocan los 4 chips; 19,7 «256»: las agujas entran · 21,8 la cámara entra: neuronas (lámina 1b)
// 24,4 la señal sube por la aguja → el cerebro azul con la onda (lámina «señales») y las palabras · 30,7 el 97 % · 35,2 la cara de partículas y su voz (lámina «una voz propia»)
// 42,4 «2025», 1/40 de segundo · 47,9 vuelve la cabeza de cristal con los chips: la voz sale sin mover los labios · 56,2 vuelta al principio (bucle).
let TL = {};
const GOLDA = new THREE.Color(1.0, 0.55, 0.12), BLUEB = new THREE.Color(0.18, 0.45, 1.0), EL_A = new THREE.Color(0.3, 0.62, 1.15), EL_B = new THREE.Color(0.12, 0.32, 1.0);
async function buildScene() {
  TL = { hablar: K['hablar_1'], decir: K['decir_1'], ela: K['ela_2'], destruye: K['destruye_2'], neur: K['neuronas_2'], musc: K['musculos_2'], pens: K['pensamientos_3'], intactos: K['intactos_3'],
    cient: K['cientificos_4'], escuch: K['escucharlos_4'], impl: K['implantaron_5'], cuatro: K['cuatro_5'], chips: K['chips_5'], e256: K['256_5'], electr: K['electrodos_5'], captar: K['captar_5'],
    cuando: K['cuando_6'], intenta: K['intenta_6'], ia: K['inteligencia_6'], interpreta: K['interpreta_6'], senales: K['senales_6'], convierte: K['convierte_6'], palabras: K['palabras_6'],
    result: K['resultado_7'], prec: K['precision_7'], p97: K['97_7'], incre: K['increible_8'], grab: K['grabaciones_8'], recon: K['reconstruir_8'], voz: K['voz_8'], robot: K['robotica_8'],
    y2025: K['2025_9'], tecno: K['tecnologia_9'], treal: K['tiempo_9'], todavia: K['todavia_10'], posib: K['posibilidad_10'], recup: K['recuperar_10'], mover: K['mover_10'], labios: K['labios_10'],
    futuro: K['futuro_11'], perder: K['perder_11'], palabras2: K['palabras_11'] };
  TL.k = [0, 1, 2, 3].map(i => TL.cuatro - 0.35 + i * 0.55);                       // cuándo se posa cada chip
  TL.fly0 = TL.incre - 0.77; TL.fly1 = TL.grab - 0.57;                               // el vuelo del cerebro azul a la cara (recto, por −x)
  S.head = await buildHead(); scene.add(S.head); const U = S.head.userData; U.arms = buildArms(S.head);
  S.neuro = buildNeuro(); scene.add(S.neuro);
  // reflejos de estudio (cromo, chips, cerebro rosa, aguja): sin ellos el metal se ve negro en el vacío
  const studioOn = o => { const m = o.material; if (m && (m.metalness > 0.5 || m.userData.studio || m.clearcoat > 0.5)) { m.envMap = S.studio; m.envMapIntensity = m.metalness > 0.5 ? 1.3 : 0.4; m.needsUpdate = true; } };
  S.head.traverse(studioOn); S.neuro.traverse(studioOn); U.brain.userData.pm.envMap = S.studio; U.brain.userData.pm.envMapIntensity = 0.4;
  // brillo azul oscuro de fondo detrás del cerebro rosa (como la lámina del brazo robótico)
  S.haze = [0, 1, 2].map(i => { const h = glowSprite(i === 1 ? 0x1a3a7a : 0x10264f, 5 + i * 2, 0); h.position.set(-1.5 - i * 1.2, 0.6 + (i - 1) * 0.8, -1.5 - i); scene.add(h); return h; });
  S.voice = buildVoice(U.geo); scene.add(S.voice);
  // la onda EEG que atraviesa el cerebro azul
  S.eeg = waveLine(6000, [new THREE.Color(0.6, 0.85, 2.2), new THREE.Color(1.6, 1.9, 2.4), new THREE.Color(0.6, 0.85, 2.2)], 0.03); scene.add(S.eeg);
  S.eeg2 = waveLine(4000, [new THREE.Color(0.25, 0.5, 1.8), new THREE.Color(0.5, 0.8, 2.0)], 0.018); scene.add(S.eeg2);
  for (const e of [S.eeg, S.eeg2]) { e.material.depthTest = false; e.renderOrder = 20; }
  // flujo óptico: polvo de luz alrededor de la cabeza, en el camino a la cara (VOX) y entre las neuronas
  // (con rng: hash() con índices seguidos hacía columnas de puntos)
  const ballR = (R, r0, rnd) => { let x, y, z; do { x = rnd() * 2 - 1; y = rnd() * 2 - 1; z = rnd() * 2 - 1; } while (x * x + y * y + z * z > 1 || x * x + y * y + z * z < r0 * r0); return [x * R, y * R, z * R]; };
  const r1 = rng(11), r2 = rng(22), r3 = rng(33);
  S.flow = [flowCloud(9000, () => ballR(9, 0.22, r1), { size: 1.3, bright: 0.45, seed: 1, nearF: 0.08, farF: 0.05, col: 0x9fc8ff }),
    // el túnel del vuelo cerebro → cara (a lo largo de −x): estelas largas y brillantes (keep alto) para que el viaje se vea
    flowCloud(14000, () => { const x = -4 - r2() * 51, a = r2() * 6.2832, rr = 0.35 + Math.sqrt(r2()) * 2.6; return [x, 0.35 + Math.sin(a) * rr * 0.9, Math.cos(a) * rr]; }, { size: 1.5, bright: 0.85, seed: 2, nearF: 0.06, farF: 0.02, keep: 0.4, col: 0xb8b0ff }),
    flowCloud(7000, () => { const b = ballR(10, 0.1, r3); return [NEU.x + b[0], NEU.y + b[1], NEU.z + b[2] - 2]; }, { size: 1.3, bright: 0.5, seed: 3, nearF: 0.05, farF: 0.05, col: 0xffd28a })];
}
const ZERO4 = [0, 0, 0, 0];
function stageAt(t, st) {
  NOW = t; const U = S.head.userData, B = U.brain, vz = voice(t), loopK = win(t, END - 1.6, 1.4);
  U.holo.uniforms.time.value = t; U.pm.uniforms.time.value = t;
  // ---- la cabeza de cristal: se ve al principio, en la ELA, y otra vez al final (con los chips)
  const headOp = Math.max(1 - win(t, TL.pens - 0.3, 0.9), win(t, TL.todavia - 0.6, 1.0) * (1 - win(t, END + 1, 1)));
  U.holo.uniforms.op.value = headOp; U.mesh.visible = headOp > 0.01;
  // ---- el cerebro: luz de oro (1) → rosa (2) → azul eléctrico (3) → rosa con chips (4) → luz de oro (vuelta al principio)
  const toPink = win(t, TL.cient - 0.2, 1.1) * (1 - win(t, TL.e256 + 2.2, 0.6)), toBlue = win(t, TL.cuando + 0.6, 0.6) * (1 - win(t, TL.incre - 0.4, 0.8)), pink2 = win(t, TL.todavia - 0.4, 1.0) * (1 - win(t, TL.futuro - 0.3, 1.2));
  const pink = Math.max(toPink, pink2), glowOp = clamp(1 - pink), cA = GOLDA.clone().lerp(EL_A, toBlue), cB = BLUEB.clone().lerp(EL_B, toBlue);
  const act = 0.65 + 0.6 * bump(t, TL.pens - 0.2, TL.cient, 0.5, 0.6) + 0.15 * toBlue + 0.25 * vz;
  const gridK = bump(t, TL.result, TL.incre - 0.5, 0.4, 0.4);
  brainGlowAt(B, t, { op: glowOp * (1 - 0.35 * toBlue) * (1 - 0.55 * gridK), pink: pink, act, cA, cB, sparks: 1 - 0.5 * toBlue });
  S.haze.forEach((h, i) => { h.material.opacity = 0.55 * Math.max(toPink, pink2 * 0.6); });
  const hotK = bump(t, TL.intactos - 0.6, TL.e256, 0.5, 0.6); for (const m of B.userData.mats) { m.uniforms.hotK.value = hotK; m.uniforms.lines.value = 1 + 0.8 * toBlue; }
  B.visible = !(st.p.z < -100);
  S.flow[1].material.uniforms.bright.value = 0.85 * bump(t, TL.fly0 - 0.1, TL.fly1 + 0.2, 0.3, 0.4);
  // ---- la ELA: la señal baja por la vía; con «destruye» se corta a mitad y los músculos se apagan
  const elaOn = bump(t, TL.ela - 0.6, TL.pens + 0.2, 0.5, 0.6), alive = 1 - 0.58 * sm5(seg(t, TL.destruye, TL.musc + 0.3)); U.pm.uniforms.op.value = elaOn; U.pm.uniforms.alive.value = alive;
  U.mm.uniforms.op.value = elaOn * (1 - 0.82 * sm5(seg(t, TL.destruye + 0.6, TL.musc + 0.5))); U.mm.uniforms.time.value = t; U.muscles.forEach(m => m.visible = elaOn > 0.01);
  // ---- la palabra que se queda en los labios (al principio y, fuera ya del bucle, nada más)
  { const k = seg(t, 1.9, TL.decir - 0.1) + 0.6 * seg(t, TL.decir - 0.1, TL.decir + 0.6), a = bump(t, 1.8, TL.decir + 0.5, 0.3, 0.4); wordWave(U, k, a, t); const hit = bump(t, TL.decir - 0.25, TL.decir + 0.5, 0.08, 0.35); U.hit.material.opacity = hit * 0.7; U.hit.scale.setScalar(0.07 + 0.09 * hit); }
  // ---- brazos y chips
  { const k = TL.k.map(tk => seg(t, tk - 0.6, tk)), out = TL.k.map(tk => seg(t, tk + 0.15, tk + 0.75)), armsVis = bump(t, TL.cient + 0.2, TL.e256 + 0.8, 0.3, 0.3), chipsVis = t > TL.cient ? 1 : 0;
    const ins = seg(t, TL.e256 + 0.05, TL.e256 + 0.9), endFade = 1 - win(t, END - 2.2, 1.6);
    armsAt(S.head, t, { k: k.map(x => armsVis > 0 || x >= 1 ? x : 0), out: out.map((x, i) => armsVis > 0.01 ? x : 1), ins, lights: Math.max(toPink, pink2), glow: bump(t, TL.e256 - 0.1, TL.captar, 0.2, 0.5) + 0.6 * bump(t, TL.posib, TL.labios + 0.6, 0.4, 0.5), a: chipsVis * endFade, showChips: chipsVis, big: bump(t, TL.posib - 0.3, TL.labios + 0.6, 0.5, 0.6) });
    U.arms.userData.tools.forEach(T => T.visible = T.visible && armsVis > 0.01); }
  // ---- las neuronas (se ve solo con la cámara allí)
  { const inN = st.p.distanceTo(NEU) < 30; neuroAt(S.neuro, t, { a: inN ? 1 : 0, syn: 1, fire: 0.5 + 0.8 * bump(t, TL.cuando - 0.1, TL.cuando + 1.4, 0.2, 0.4), listen: win(t, TL.captar - 0.5, 0.4) }); }
  // ---- la onda EEG que atraviesa el cerebro azul: se dibuja de izquierda a derecha y, con «palabras», se convierte en letras (HUD)
  { const a = bump(t, TL.ia - 0.5, TL.result + 0.4, 0.5, 0.5) * (st.p.z > -100 ? 1 : 0), c = S.head.localToWorld(_v().set(0, 0.56, -0.1)), sh = seg(t, TL.ia - 0.5, TL.interpreta + 0.4);
    eegAt(S.eeg, -2.6, 2.6, c.y, c.z + 0.05, t, 0.26 + 0.16 * vz, 0.35, sh, a); S.eeg.position.set(0, 0, 0); S.eeg.rotation.y = Math.PI / 2;
    eegAt(S.eeg2, -2.6, 2.6, c.y - 0.06, c.z + 0.05, t * 0.8, 0.09, 0.15, sh, a * 0.6, 7); S.eeg2.rotation.y = Math.PI / 2; }
  // ---- la cara de partículas y su voz
  { const V = S.voice.userData, a = bump(t, TL.incre - 1.2, TL.todavia - 0.2, 0.8, 0.8); V.face.material.opacity = a * 0.95; V.face.visible = a > 0.01;
    const amp = (0.35 + 0.9 * vz) * win(t, TL.recon - 0.2, 0.5), wa = a * win(t, TL.recon - 0.3, 0.5);
    V.waves.forEach((w, k) => { voiceAt(w, { x: V.mouth.x, y: V.mouth.y, z: V.mouth.z, dx: -1 }, k, t, amp * (1 - 0.1 * k), wa * (1 - k * 0.1), 3.4); w.position.set(0, 0, (k - 2.5) * 0.02); });
    const fa = a * bump(t, TL.grab - 0.3, TL.robot + 0.4, 0.4, 0.6); V.films.forEach((P, i) => drawFilm(P, i, t, fa * win(t, TL.grab - 0.3 + i * 0.2, 0.3)));
    { const p = V.feed.geometry.attributes.position, n = p.count, A0 = _v().set(-0.62, -0.85, 0.3), A1 = _v().set(-0.15, -0.55, 0.25), A2 = _v().set(0.25, -0.1, 0.0); for (let i = 0; i < n; i++) { const u = i / (n - 1), q = A0.clone().lerp(A1, Math.min(1, u * 2)).lerp(A2, Math.max(0, u * 2 - 1)); p.setXYZ(i, q.x + Math.sin(u * 40 - t * 12) * 0.05 * Math.sin(u * Math.PI), q.y + Math.cos(u * 34 - t * 10) * 0.05 * Math.sin(u * Math.PI), q.z); } p.needsUpdate = true; V.feed.material.opacity = fa * win(t, TL.grab + 0.6, 0.4); }
    drawRobot(V.robot, t, a * bump(t, TL.robot - 1.0, TL.y2025 + 0.4, 0.3, 0.4), seg(t, TL.robot - 0.1, TL.robot + 0.5)); }
  // ---- la voz final: sale de la cabeza de cristal (desde los chips) sin mover los labios
  { const a = bump(t, TL.recup - 0.2, TL.futuro + 0.6, 0.5, 0.8); U.voiceOut = U.voiceOut || (() => { const ws = [0, 1, 2].map(k => { const w = waveLine(700, [new THREE.Color(0.35, 0.7, 1.6), new THREE.Color(0.8, 0.45, 1.8), new THREE.Color(1.2, 0.45, 1.3)], 0.02); S.head.add(w); return w; }); return ws; })();
    U.voiceOut.forEach((w, k) => voiceAt(w, { x: U.lip.x, y: U.lip.y - 0.01, z: U.lip.z + 0.07, dir: _v().set(0, 0, 1), up: _v().set(0, 1, 0), side: _v().set(1, 0, 0) }, k, t, 0.35 + 0.8 * vz, a * (1 - 0.15 * k), 2.6)); }
}
function fillAt(t) { return { k: 0, c: [0, 0, 0] }; }
// ---------------------------------------------------------------- LA CÁMARA: un solo plano. Tres «saltos» de mundo (entrar en la corteza, salir por la aguja y volver de la cara a la cabeza) van tapados por un destello
// y por las estelas del flujo óptico; el desenfoque de movimiento no cruza esos saltos.
let CK = [], CUTS = [];
function buildCam() {
  const U = S.head.userData, SP = U.speech, N = U.speechNW.clone().normalize(), BC = S.head.localToWorld(_v().set(0, 0.56, -0.1)), A = v => [v.x, v.y, v.z];
  const bc = (x, y, z) => A(BC.clone().add(_v().set(x, y, z))), nu = (x, y, z) => [NEU.x + x, NEU.y + y, NEU.z + z];
  S.voice.updateMatrixWorld(true); const vo = (x, y, z) => A(S.voice.localToWorld(_v().set(x, y, z)));       // la escena de la voz está girada 90°
  const tip = NEU.clone().add(_v().set(-1.55, 0.95, 0.3));
  const D0 = [2.62, 0.45, 2.75], L0 = [-0.07, 0.16, 0.16], far = k => D0.map((d, i) => L0[i] + (d - L0[i]) * k);
  // el implante: plano general del cerebro rosa (las herramientas llegan por la normal, arriba a la derecha) y acercamiento en órbita hacia la zona del habla
  const Cw = BC.clone().add(_v().set(3.0, 0.2, 3.3)), tg = Cw.clone().sub(SP); tg.addScaledVector(N, -tg.dot(N)).normalize();
  const orb = (d, ang) => A(SP.clone().addScaledVector(N, d * Math.cos(ang)).addScaledVector(tg, d * Math.sin(ang)));
  const chip0 = U.arms.userData.spots[0], mid = (a, b, k) => A(a.clone().lerp(b, k));
  TL.cuts = CUTS = [TL.captar - 0.62, TL.intenta + 0.95, TL.todavia - 0.05];
  CK = [
    [0, D0, L0, 36], [TL.decir, far(0.93), L0, 36],                                                                                 // la cabeza: la palabra se queda en los labios
    [TL.ela + 0.6, [3.15, 0.05, 1.45], [0, 0.02, 0.22], 38], [TL.musc + 0.6, [3.0, 0.02, 1.32], [0, 0.0, 0.24], 38],                // la vía hacia la boca y la garganta
    [TL.pens + 0.7, bc(3.35, -0.09, 1.5), bc(0, -0.09, -0.03), 32], [TL.cient - 0.1, bc(3.12, -0.05, 1.33), bc(0, -0.09, -0.03), 32],  // el cerebro solo, entero (lámina 1)
    [TL.cient + 1.0, A(Cw), bc(0.06, 0.0, 0.05), 32],                                                                               // se vuelve rosa: plano general con las herramientas
    [TL.impl, orb(2.7, 0.62), mid(BC.clone().add(_v().set(0.06, 0, 0.05)), SP, 0.6), 32], [TL.k[1], orb(1.35, 0.72), A(SP), 32],     // los chips, uno a uno
    [TL.k[3] + 0.2, orb(0.6, 0.86), A(SP), 32], [TL.e256 + 0.35, orb(0.26, 1.0), A(SP), 32], [TL.e256 + 0.95, orb(0.2, 0.75), A(SP), 32],   // las agujas entran
    [CUTS[0] - 0.45, A(chip0.clone().addScaledVector(N, 0.09).addScaledVector(tg, 0.02)), A(chip0), 32], [CUTS[0] - 0.05, A(chip0.clone().addScaledVector(N, 0.004)), A(chip0.clone().addScaledVector(N, -0.05)), 32],   // y la cámara entra por un chip
    [CUTS[0], nu(-1.25, 3.6, 1.6), A(tip), 34], [TL.captar + 0.5, nu(0.6, 1.5, 3.3), nu(-1.6, 1.05, -0.2), 34], [TL.cuando - 0.1, nu(0.9, 1.0, 3.8), nu(-1.2, 0.8, -0.2), 34],   // las neuronas y el electrodo
    [CUTS[1] - 0.05, nu(0.9, 5.2, 3.6), nu(-0.4, 4.2, 0.3), 36],                                                                    // sube con la señal por la aguja…
    [CUTS[1], bc(4.7, 0.1, 0.08), bc(0, -0.09, -0.03), 32], [TL.palabras, bc(4.25, 0.08, 0.05), bc(0, -0.09, -0.03), 32], [TL.fly0, bc(3.95, 0.06, 0.03), bc(0, -0.09, -0.03), 32],   // …y sale al cerebro azul con la onda
    [TL.fly0 + 0.35, [1.3, 0.47, -0.1], [-3, 0.42, -0.1], 32], [TL.fly0 + 0.65, [-12, 0.4, -0.05], [-20, 0.38, 0], 34], [TL.fly0 + 0.95, [-40, 0.25, 0.1], [-48, 0.1, 0.2], 34],   // vuelo recto: atraviesa el cerebro y el túnel de luz
    [TL.fly1 - 0.3, [-52.6, 0.1, 0.35], vo(-0.55, -0.1, 0), 34], [TL.fly1, vo(-0.55, -0.1, 5.6), vo(-0.55, -0.1, 0), 34],              // …hasta la cara de partículas
    [TL.robot + 0.4, vo(-0.6, -0.08, 5.3), vo(-0.58, -0.1, 0), 34], [TL.todavia - 0.5, vo(-0.62, -0.05, 5.0), vo(-0.6, -0.08, 0), 34],
    [CUTS[2] - 0.03, vo(-0.66, -0.12, 1.6), vo(-0.66, -0.14, -2), 34],                                                              // se lanza hacia su boca…
    [CUTS[2], far(2.9), L0, 36], [CUTS[2] + 0.6, far(1.25), L0, 36],                                                                // …y llega volando a la cabeza de cristal
    [TL.posib, [2.5, 0.38, 2.6], [0, 0.18, 0.18], 36], [TL.labios + 0.5, [2.75, 0.12, 3.0], [0, 0.08, 0.55], 36],                     // la voz sale sin mover los labios
    [END - 0.6, D0, L0, 36], [END, D0, L0, 36],
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0] + ' → ' + CK[i][0]);
}
// entre dos claves que cruzan un salto, la cámara no interpola: salta
function camAt(t) { t = clamp(t, 0, END); const cut = CUTS.find(c => Math.abs(t - c) < 1e-9); let ks = CK; for (const c of CUTS) { if (t < c) { ks = ks.filter(k => k[0] < c); break; } ks = ks.filter(k => k[0] >= c); }
  if (ks.length < 2) ks = CK; return camKeys(t, ks); }
function prevT(t, dt) { let p = Math.max(0, t - dt); for (const c of CUTS) if (t >= c && p < c) p = c; return p; }
function whiteAt(t) { return 0; }
function flashAt(t) { return CUTS.reduce((s, c) => Math.max(s, bump(t, c - 0.14, c + 0.04, 0.12, 0.28)), 0) * 0.7; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l), inN = st.p.distanceTo(NEU) < 30; return { focus: f, scale: (inN ? 0.55 : f < 0.6 ? 0.5 : 0.18) * f }; }
// ---------------------------------------------------------------- RÓTULOS (lienzo 2D, limpios, en Inter): cada cosa con su nombre cuando se nombra, los contadores (4 chips, 256 electrodos,
// 97 de cada 100), «2025 · 1/40 de segundo», «ensayo clínico» y las fuentes en pequeño. Nunca en la franja de los subtítulos (arriba, y ≈ 250–420).
function buildHudPlan() { HFONT = 'Inter'; HW = [700, 500]; }
const HGOLD = '#FFC56A', HBLUE = '#8FD3FF', HRED = '#FF6A5A', HGREEN = '#7CF0A9';
function htx(txt, x, y, px, w, a, o = {}) { if (a <= 0.01) return 0; hg.save(); hg.globalAlpha = clamp(a); hg.font = `${w} ${px}px Inter, sans-serif`; hg.textAlign = o.align || 'center'; hg.textBaseline = 'alphabetic'; hg.letterSpacing = (o.ls ?? 0) + 'px';
  hg.shadowColor = o.glow || 'rgba(0,0,0,.85)'; hg.shadowBlur = (o.glow ? 26 : px * 0.25) * PR; hg.fillStyle = o.col || '#fff'; hg.fillText(txt, x, y); const tw = hg.measureText(txt).width; hg.restore(); return tw; }
function lab(P, txt, sub, t, t0, t1, o = {}) { const k = clamp((t - t0) / 0.6) * (1 - win(t, t1, 0.35)); if (k <= 0.01) return; callout(P, txt, sub, Math.min(1, (t - t0) / 0.9), { size: 30, subSize: 22, color: o.col || HC.white, subCol: o.subCol || HC.grey, dx: o.dx ?? 150, dy: o.dy ?? 120, len: 46, a: k, bg: true }); }
function counter(t, t0, from, to, dur) { return Math.round(lerp(from, to, sm5(clamp((t - t0) / dur)))); }
function hudAt(t) {
  hudBegin(); const U = S.head.userData, inHead = cam.position.z > -100 && cam.position.x > -30;
  // ---- ELA: la vía, el corte y los músculos
  if (inHead) { const c0 = U.paths[1].getPointAt(0.5), cut = U.paths[1].getPointAt(0.42 + 0.0), mus = U.muscles[1].position.clone();
    lab(c0, 'NEURONAS MOTORAS', 'llevan la orden a los músculos', t, TL.neur - 0.2, TL.pens - 0.3, { col: HGOLD, dx: 150, dy: -190 });
    lab(mus, 'LENGUA · LABIOS · LARINGE', 'los músculos del habla', t, TL.musc - 0.2, TL.pens - 0.3, { col: HBLUE, dx: 110, dy: 300 });
    // la corteza del habla (cerebro solo y cerebro rosa)
    lab(U.speech, 'CORTEZA MOTORA DEL HABLA', 'aquí nace la orden de hablar', t, TL.intactos - 0.4, TL.impl - 0.2, { col: HGOLD, dx: -150, dy: 260 }); }
  // ---- 4 chips · 256 electrodos
  { const a = clamp((t - (TL.cuatro - 0.2)) / 0.4) * (1 - win(t, CUTS[0] - 0.3, 0.3)); if (a > 0.01) { const nC = TL.k.filter(tk => t >= tk).length, nE = t < TL.e256 ? 0 : counter(t, TL.e256, 0, 256, 1.0);
      hg.save(); hg.globalAlpha = a; hg.fillStyle = 'rgba(4,10,22,.72)'; rr(hg, 160, 1430, 760, 240, 34); hg.fill(); hg.strokeStyle = 'rgba(143,211,255,.55)'; hg.lineWidth = 2; rr(hg, 160, 1430, 760, 240, 34); hg.stroke(); hg.restore();
      htx(String(nC), 330, 1580, 120, 900, a, { col: HBLUE }); htx('CHIPS', 330, 1630, 26, 700, a, { col: HC.grey, ls: 4 });
      htx(String(nE), 690, 1580, 120, 900, a * clamp((t - TL.e256 + 0.1) / 0.3), { col: HGOLD }); htx('ELECTRODOS', 690, 1630, 26, 700, a * clamp((t - TL.e256 + 0.1) / 0.3), { col: HC.grey, ls: 4 });
      htx('×', 510, 1570, 60, 500, a * 0.6, { col: HC.grey }); } }
  // ---- las neuronas y el electrodo
  if (cam.position.distanceTo(NEU) < 30) { const tip = NEU.clone().add(_v().set(-1.55, 0.95, 0.3)); lab(tip, 'ELECTRODO', 'escucha a la neurona', t, TL.captar - 0.3, TL.cuando + 0.15, { col: HGOLD, dx: 160, dy: 200 });
    lab(S.neuro.userData.cells[0].getWorldPosition(_v()), 'NEURONA', null, t, TL.captar + 0.2, TL.cuando + 0.15, { col: HBLUE, dx: -150, dy: -160 }); }
  // ---- la IA y las palabras
  { const a = clamp((t - TL.ia) / 0.4) * (1 - win(t, TL.result - 0.2, 0.3)); if (a > 0.01 && inHead) { htx('INTELIGENCIA ARTIFICIAL', W / 2, 1430, 30, 700, a, { col: HBLUE, ls: 6 }); htx('señal → sonidos → palabras', W / 2, 1476, 26, 500, a * 0.85, { col: HC.grey }); }
    const wa = clamp((t - TL.convierte) / 0.3) * (1 - win(t, TL.result - 0.35, 0.3)); if (wa > 0.01) { const s = '«Hola, sigo aquí»', n = Math.floor(s.length * clamp((t - TL.convierte) / 1.0)); htx(s.slice(0, Math.max(1, n)), W / 2, 1610, 92, 900, wa, { glow: '#ffb347' }); htx('frase de ejemplo', W / 2, 1668, 22, 500, wa * 0.8, { col: HC.grey, ls: 3 }); } }
  // ---- 97 de cada 100
  { const a = clamp((t - TL.result - 0.05) / 0.4) * (1 - win(t, TL.incre - 0.6, 0.4)); if (a > 0.01) { const k = clamp((t - TL.prec) / 1.6), wrong = [23, 58, 86], x0 = W / 2 - 4.5 * 62, y0 = 560;
      hg.save(); hg.globalAlpha = a * 0.9; hg.fillStyle = 'rgba(4,10,22,.7)'; rr(hg, x0 - 60, y0 - 60, 9 * 62 + 120, 9 * 62 + 120, 30); hg.fill(); hg.restore();
      for (let i = 0; i < 100; i++) { const on = clamp(k * 100 - i), bad = wrong.includes(i), x = x0 + (i % 10) * 62, y = y0 + Math.floor(i / 10) * 62; hg.save(); hg.globalAlpha = a; hg.fillStyle = on > 0 ? (bad ? HRED : HGREEN) : 'rgba(120,150,190,.25)';
        if (on > 0) { hg.shadowColor = hg.fillStyle; hg.shadowBlur = 14 * PR; } hg.beginPath(); hg.arc(x, y, 20 * (0.7 + 0.3 * eo(on)), 0, 7); hg.fill(); hg.restore(); }
      htx(`${counter(t, TL.prec, 0, 97, 1.6)} %`, W / 2, 1360, 170, 900, a, { glow: '#7CF0A9' }); htx('DE LAS PALABRAS, BIEN', W / 2, 1420, 30, 700, a, { col: HC.grey, ls: 5 }); } }
  // ---- grabaciones antiguas, su voz, voz robótica
  if (cam.position.x < -30) { const V = S.voice.userData; lab(V.films[1].getWorldPosition(_v()), 'GRABACIONES ANTIGUAS', 'su voz de antes de la ELA', t, TL.grab, TL.robot - 0.6, { col: HGOLD, dx: -60, dy: -200 });
    lab(S.voice.localToWorld(V.mouth.clone().add(_v().set(-0.75, -0.04, 0))), 'SU PROPIA VOZ', null, t, TL.voz - 0.2, TL.y2025 - 0.2, { col: HBLUE, dx: 40, dy: 240 }); }
  // ---- 2025 · 1/40 de segundo
  { const a = clamp((t - TL.y2025) / 0.4) * (1 - win(t, TL.todavia - 0.3, 0.3)); if (a > 0.01) { htx('2025', W / 2, 1300, 150, 900, a, { glow: '#8FD3FF' });
      const k = clamp((t - TL.tecno) / 0.6); if (k > 0) { const cx = W / 2, cy = 1500; hg.save(); hg.globalAlpha = a * k; hg.strokeStyle = 'rgba(143,211,255,.25)'; hg.lineWidth = 10; hg.beginPath(); hg.arc(cx - 230, cy - 18, 46, 0, 7); hg.stroke();
        hg.strokeStyle = HBLUE; hg.shadowColor = HBLUE; hg.shadowBlur = 16 * PR; hg.beginPath(); hg.arc(cx - 230, cy - 18, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp((t - TL.tecno) / 0.4)); hg.stroke(); hg.restore();
        htx('0,025 s', cx + 40, cy, 74, 900, a * k, { col: '#fff' }); htx('de la señal a su voz · 1/40 de segundo', cx, cy + 62, 26, 500, a * k, { col: HC.grey }); } } }
  // ---- ensayo clínico y labios quietos
  { const a = clamp((t - TL.todavia - 0.2) / 0.4) * (1 - win(t, TL.recup - 0.2, 0.3)); if (a > 0.01) { hg.save(); hg.globalAlpha = a; hg.strokeStyle = 'rgba(255,197,106,.8)'; hg.lineWidth = 2.5; rr(hg, W / 2 - 290, 1440, 580, 96, 48); hg.stroke(); hg.restore(); htx('ENSAYO CLÍNICO · EXPERIMENTAL', W / 2, 1502, 30, 700, a, { col: HGOLD, ls: 4 }); } }
  if (inHead) lab(U.lip, 'LABIOS QUIETOS', 'la voz sale del ordenador', t, TL.mover - 0.3, TL.futuro, { col: HBLUE, dx: 120, dy: 260 });
  // ---- fuentes (pequeño, abajo)
  const src = t > TL.impl - 0.3 && t < TL.result ? 'BrainGate2 · UC Davis · NEJM, 2024' : t > TL.result && t < TL.incre - 0.4 ? 'NEJM, 2024 · 97,5 % de acierto' : t > TL.y2025 && t < TL.todavia ? 'Nature, 2025' : '';
  if (src) htx(src, W / 2, 1860, 24, 500, 0.75, { col: '#c9d6e6' });
}
// ---------------------------------------------------------------- un fotograma
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up2 = new THREE.Vector3();
function frame(t) {
  placeCam(camAt(prevT(t, 1 / 60))); const prevVP = vpOf();
  placeCam(camAt(prevT(t, 1 / 36))); const PVP = vpOf();
  const st = camAt(t); placeCam(st); const VP = vpOf();
  stageAt(t, st); flowUpdate(t, VP, PVP); fxUpdate(t, VP, PVP);
  const d = Math.max(0.05, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _rt.setFromMatrixColumn(cam.matrixWorld, 0); _up2.setFromMatrixColumn(cam.matrixWorld, 1);
  const P0 = cam.position.clone().addScaledVector(_fw, d), Px = P0.clone().addScaledVector(_rt, d * 0.4), Py = P0.clone().addScaledVector(_up2, d * 0.4);
  const a = [P0, Px, Py].map(p => p.clone().applyMatrix4(VP)), b = [P0, Px, Py].map(p => p.clone().applyMatrix4(prevVP));
  const m = a.map((q, i) => [q.x - b[i].x, q.y - b[i].y]), dx = [a[1].x - a[0].x, a[1].y - a[0].y], dy = [a[2].x - a[0].x, a[2].y - a[0].y];
  const det = dx[0] * dy[1] - dy[0] * dx[1] || 1e-6, N = [[m[1][0] - m[0][0], m[2][0] - m[0][0]], [m[1][1] - m[0][1], m[2][1] - m[0][1]]];
  const inv = [[dy[1] / det, -dy[0] / det], [-dx[1] / det, dx[0] / det]];
  const J = [N[0][0] * inv[0][0] + N[0][1] * inv[1][0], N[0][0] * inv[0][1] + N[0][1] * inv[1][1], N[1][0] * inv[0][0] + N[1][1] * inv[1][0], N[1][0] * inv[0][1] + N[1][1] * inv[1][1]];
  post.uniforms.m0.value.set(m[0][0], m[0][1]); post.uniforms.a0.value.set(a[0].x, a[0].y); post.uniforms.J.value.set(...J);
  post.uniforms.flash.value = flashAt(t); post.uniforms.white.value = whiteAt(t); post.uniforms.tint.value.set(0, 0, 0);
  if (typeof fillAt === 'function') { const F = fillAt(t); post.uniforms.fillk.value = F.k; post.uniforms.fillc.value.set(F.c[0], F.c[1], F.c[2]); }
  { const D = typeof dofAt === 'function' ? dofAt(t, st) : null; dofM.uniforms.focus.value = D ? D.focus : d; dofM.uniforms.scale.value = D ? D.scale : 0; }
  return st;
}
function blurPass(src, dst, dx, dy) { quad.material = blurM; blurM.uniforms.tA.value = src.texture; blurM.uniforms.d.value.set(dx, dy); renderer.setRenderTarget(dst); renderer.render(quadScene, quadCam); }
let SRC = rtA;                                     // la imagen que sigue (con profundidad de campo si toca)
function drawFrame(t) {
  renderer.setRenderTarget(rtA); renderer.render(scene, cam); SRC = rtA;
  if (dofM.uniforms.scale.value > 0) { quad.material = dofM; dofM.uniforms.tA.value = rtA.texture; dofM.uniforms.tD.value = rtA.depthTexture; dofM.uniforms.logF.value = Math.log2(cam.far + 1);
    renderer.setRenderTarget(rtD); renderer.render(quadScene, quadCam); SRC = rtD; }
  renderer.setRenderTarget(rtF); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(fxScene, cam);
  quad.material = brightM; brightM.uniforms.tA.value = SRC.texture; brightM.uniforms.tF.value = rtF.texture; renderer.setRenderTarget(rtB[0]); renderer.render(quadScene, quadCam);
  blurPass(rtB[0], rtB[1], 1 / BLW, 0); blurPass(rtB[1], rtB[0], 0, 1 / BLH);
  blurPass(rtB[0], rtC[1], 2 / BLW, 0); blurPass(rtC[1], rtC[0], 0, 2 / BLH); blurPass(rtC[0], rtC[1], 3 / BLW, 0); blurPass(rtC[1], rtC[0], 0, 3 / BLH);
  hg.getImageData(0, 0, 1, 1); hudTex.needsUpdate = true; post.uniforms.tH.value = hudTex;
  quad.material = post; post.uniforms.tA.value = SRC.texture; post.uniforms.tF.value = rtF.texture; post.uniforms.tB.value = rtB[0].texture; post.uniforms.tC.value = rtC[0].texture; post.uniforms.time.value = t;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
}
window.renderAt = function (t) {
  frame(t);
  if (window.camOverride) { window.camOverride(cam, v3); post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); const VP = vpOf(); flowUpdate(t, VP, VP); fxUpdate(t, VP, VP); }
  if (window.dbgHide) window.dbgHide();
  hudAt(t); drawFrame(t);
  return true;
};
// portada (sin HUD)
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : 0.6; frame(t);
  if (window.COVER_CAM) { const C = window.COVER_CAM; cam.fov = C[6]; cam.updateProjectionMatrix(); cam.position.set(C[0], C[1], C[2]); cam.up.set(0, 1, 0); cam.lookAt(C[3], C[4], C[5]); cam.updateMatrixWorld(); }
  if (window.camOverride) window.camOverride(cam, v3);
  const VP = vpOf(); flowUpdate(t, VP, VP); fxUpdate(t, VP, VP);
  post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); post.uniforms.flash.value = 0; post.uniforms.white.value = 0;
  hudBegin(); drawFrame(t);
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '700' }), new FontFace('SpaceMono', `url(${F}SpaceMono-Regular.ttf)`, { weight: '400' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  // una clave por palabra: K['brasil_1'], K['ondas_5'], K['200000_7'], K['tonga_11']… (inicio de la palabra − 0,03 s; la primera vez que sale en esa frase)
  K = {}; for (const w of WORDS) { const key = w.n + '_' + w.li; if (K[key] === undefined) K[key] = w.start - 0.03; }
  K.start = 0; { const K0 = K; K = new Proxy(K0, { get: (o, k) => { if (typeof k === 'string' && !(k in o)) console.error('ERROR sin clave K.' + k); return o[k]; } }); }

  mats(); buildMats(); S.flow = [];
  await loadEnv(); buildLights(); cam.near = 0.002; cam.far = 20000; cam.updateProjectionMatrix();
  await buildScene();
  await waitLoads();
  post.uniforms.ca.value = 0.18; post.uniforms.vig.value = 0.42; post.uniforms.bloom.value = 0.36;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s); window.glLost = () => renderer.getContext().isContextLost();
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
