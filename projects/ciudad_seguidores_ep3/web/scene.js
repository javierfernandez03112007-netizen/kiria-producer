// «Kiria World, día 3» (kiria.ai, 21-11-2026): el rey firma la ley del homenaje semanal y la ciudad abre el sushi, la pastelería y el veterinario que pidieron tres seguidores.
// Javi: «mejores gráficos, más realistas: la fachada y la gente dentro por los cristales, coches, césped, personas con boca y ojos; que enganche».
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
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.localClippingEnabled = true;
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
// ---------------------------------------------------------------- EL MUNDO del día 3 de Kiria World (unidades: metros; x = este, y = arriba, z = sur)
//   PLAZA (0, 0, 0) con el pedestal en el centro · AYUNTAMIENTO al norte (fachada en z = −15, salón detrás, trono al fondo)
//   CALLE de las tiendas al este (calzada en x ≈ 16–22; fachadas en x = 24, mirando a la plaza): sushi (norte), pastelería, veterinario (sur)
const GOLD = new THREE.Color(1.0, 0.62, 0.18), CYAN = new THREE.Color(0.25, 0.7, 1.0), WHITE = new THREE.Color(1, 1, 1);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const bump = (t, a, b, fi = 0.25, fo = 0.3) => win(t, a, fi) * (1 - win(t, b, fo));
const _v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ad = (p, c) => (p.add(c), c);     // añade y devuelve el HIJO (Object3D.add devuelve el padre: «g.add(x).position…» movía el edificio entero)
const stdM = (c, r = 0.6, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
const addM = (c, op = 1, o = {}) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, ...o });
function glowSprite(col, s = 1, op = 1) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.scale.setScalar(s); return m; }
const pick = (R, arr) => arr[Math.floor(R() * arr.length) % arr.length];
function shadowAll(o, cast = true, recv = true) { o.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = recv; } }); return o; }
function place(o, x, y, z, ry = 0) { o.position.set(x, y, z); o.rotation.y = ry; return o; }
function box(w, h, d, m, x = 0, y = 0, z = 0) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; return b; }
// caja con cantos redondeados (muebles, coches, letreros)
function rboxM(w, h, d, r, m, seg = 3) { const s = new THREE.Shape(), x0 = -w / 2 + r, y0 = -h / 2 + r, x1 = w / 2 - r, y1 = h / 2 - r;
  s.moveTo(x0, -h / 2); s.lineTo(x1, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, y0); s.lineTo(w / 2, y1); s.quadraticCurveTo(w / 2, h / 2, x1, h / 2); s.lineTo(x0, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, y1); s.lineTo(-w / 2, y0); s.quadraticCurveTo(-w / 2, -h / 2, x0, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.98, bevelSegments: seg, curveSegments: 6 }); g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals();
  const mm = new THREE.Mesh(g, m); mm.castShadow = mm.receiveShadow = true; return mm; }

// ---- texturas hechas a mano (lienzo): ruido, ladrillo, baldosa, mármol, madera, asfalto, tierra con hierba; y su mapa de relieve (normal) a partir de la altura
function noise2(R, w, h, oct = 5) { const out = new Float32Array(w * h); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) { const s = 2 ** (o + 2), g = []; for (let i = 0; i <= s; i++) { g.push([]); for (let j = 0; j <= s; j++) g[i].push(R()); }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const fx = x / w * s, fy = y / h * s, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[iy % s][ix % s], b = g[iy % s][(ix + 1) % s], c = g[(iy + 1) % s][ix % s], d = g[(iy + 1) % s][(ix + 1) % s]; out[y * w + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy); }
    tot += amp; amp *= 0.5; }
  for (let i = 0; i < out.length; i++) out[i] /= tot; return out; }
// de un lienzo de altura (gris) a un mapa de normales
function normalFrom(hc, k = 2) { const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), im = g.createImageData(w, h), H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    im.data[i] = (-dx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texOf(c, rep = [1, 1]) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; }
// material con color + relieve a partir de dos lienzos (color y altura)
function texMat(col, hgt, rep, o = {}) { const m = new THREE.MeshStandardMaterial({ map: texOf(col, rep), roughness: o.r ?? 0.8, metalness: o.metal ?? 0, ...(o.extra || {}) });
  if (hgt) { m.normalMap = normalFrom(hgt, o.nk ?? 2); m.normalMap.repeat.set(rep[0], rep[1]); m.normalScale.set(o.ns ?? 1, o.ns ?? 1); } return m; }
// ladrillo (fachadas): hiladas con llaga, color que varía y mortero claro
function brickCanvases(base = [150, 72, 52], seed = 3, W2 = 512) { const R = rng(seed), c = cnv(W2, W2), h = cnv(W2, W2), g = c.getContext('2d'), gh = h.getContext('2d'), rows = 16, bw = W2 / 4, bh = W2 / rows, N = noise2(R, 128, 128, 4);
  g.fillStyle = '#cfc6b8'; g.fillRect(0, 0, W2, W2); gh.fillStyle = '#404040'; gh.fillRect(0, 0, W2, W2);
  for (let r = 0; r < rows; r++) for (let i = -1; i < 5; i++) { const x = i * bw + (r % 2 ? bw / 2 : 0), y = r * bh, v = 0.82 + R() * 0.3, cc = base.map(q => Math.min(255, q * v + (R() - 0.5) * 18));
    g.fillStyle = `rgb(${cc[0] | 0},${cc[1] | 0},${cc[2] | 0})`; g.fillRect(x + 2, y + 2, bw - 4, bh - 4); gh.fillStyle = `rgb(${(170 + R() * 40) | 0},${(170 + R() * 40) | 0},${(170 + R() * 40) | 0})`; gh.fillRect(x + 2, y + 2, bw - 4, bh - 4); }
  const id = g.getImageData(0, 0, W2, W2); for (let y = 0; y < W2; y++) for (let x = 0; x < W2; x++) { const n = N[((y >> 2) % 128) * 128 + ((x >> 2) % 128)], i = (y * W2 + x) * 4, k = 0.86 + n * 0.28; id.data[i] *= k; id.data[i + 1] *= k; id.data[i + 2] *= k; } g.putImageData(id, 0, 0);
  return [c, h]; }
// revoco liso pintado (fachadas de color) con manchas suaves
function stuccoCanvases(rgb, seed = 5, W2 = 256) { const R = rng(seed), c = cnv(W2, W2), h = cnv(W2, W2), g = c.getContext('2d'), gh = h.getContext('2d'), N = noise2(R, W2, W2, 6), id = g.createImageData(W2, W2), ih = gh.createImageData(W2, W2);
  for (let i = 0; i < W2 * W2; i++) { const n = N[i], k = 0.9 + n * 0.16; id.data[i * 4] = rgb[0] * k; id.data[i * 4 + 1] = rgb[1] * k; id.data[i * 4 + 2] = rgb[2] * k; id.data[i * 4 + 3] = 255; const hh = 100 + n * 90 + R() * 30; ih.data[i * 4] = ih.data[i * 4 + 1] = ih.data[i * 4 + 2] = hh; ih.data[i * 4 + 3] = 255; }
  g.putImageData(id, 0, 0); gh.putImageData(ih, 0, 0); return [c, h]; }
// baldosas de piedra (plaza, aceras): piezas rectangulares en hiladas, juntas oscuras
function tileCanvases(base = [178, 170, 158], seed = 7, W2 = 512, nx = 6, ny = 8, joint = 4) { const R = rng(seed), c = cnv(W2, W2), h = cnv(W2, W2), g = c.getContext('2d'), gh = h.getContext('2d'), N = noise2(R, 128, 128, 5);
  g.fillStyle = '#5d5a55'; g.fillRect(0, 0, W2, W2); gh.fillStyle = '#202020'; gh.fillRect(0, 0, W2, W2); const tw = W2 / nx, th = W2 / ny;
  for (let r = 0; r < ny; r++) for (let i = -1; i <= nx; i++) { const x = i * tw + (r % 2 ? tw / 2 : 0), y = r * th, v = 0.86 + R() * 0.22, cc = base.map(q => q * v);
    g.fillStyle = `rgb(${cc[0] | 0},${cc[1] | 0},${cc[2] | 0})`; g.fillRect(x + joint / 2, y + joint / 2, tw - joint, th - joint); const hv = (180 + R() * 50) | 0; gh.fillStyle = `rgb(${hv},${hv},${hv})`; gh.fillRect(x + joint / 2, y + joint / 2, tw - joint, th - joint); }
  const id = g.getImageData(0, 0, W2, W2); for (let y = 0; y < W2; y++) for (let x = 0; x < W2; x++) { const n = N[((y >> 2) % 128) * 128 + ((x >> 2) % 128)], i = (y * W2 + x) * 4, k = 0.88 + n * 0.24; id.data[i] *= k; id.data[i + 1] *= k; id.data[i + 2] *= k; } g.putImageData(id, 0, 0);
  return [c, h]; }
// mármol pulido (salón del ayuntamiento): ajedrezado crema y gris con vetas
function marbleCanvas(seed = 9, W2 = 1024, checker = true) { const R = rng(seed), c = cnv(W2, W2), g = c.getContext('2d'), N = noise2(R, 256, 256, 6), id = g.createImageData(W2, W2), cell = W2 / 4;
  for (let y = 0; y < W2; y++) for (let x = 0; x < W2; x++) { const dark = checker && ((Math.floor(x / cell) + Math.floor(y / cell)) % 2) === 1, n = N[((y >> 2) % 256) * 256 + ((x >> 2) % 256)];
    const vein = Math.pow(Math.abs(Math.sin((x * 0.012 + y * 0.007 + n * 9.0) * 1.6)), 18); const b = dark ? [70, 74, 82] : [232, 226, 212], k = 0.94 + n * 0.1 - vein * (dark ? -0.6 : 0.35);
    const i = (y * W2 + x) * 4; const edge = checker && (x % cell < 2 || y % cell < 2) ? 0.75 : 1; id.data[i] = b[0] * k * edge; id.data[i + 1] = b[1] * k * edge; id.data[i + 2] = b[2] * k * edge; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); return c; }
// tablas de madera (suelos de las tiendas, mesas)
function woodCanvases(base = [150, 105, 66], seed = 11, W2 = 512, planks = 8) { const R = rng(seed), c = cnv(W2, W2), h = cnv(W2, W2), g = c.getContext('2d'), gh = h.getContext('2d'), N = noise2(R, 64, 256, 4), id = g.createImageData(W2, W2), ih = gh.createImageData(W2, W2), pw = W2 / planks;
  const off = Array.from({ length: planks }, () => R() * W2), tone = Array.from({ length: planks }, () => 0.82 + R() * 0.3);
  for (let y = 0; y < W2; y++) for (let x = 0; x < W2; x++) { const p = Math.floor(x / pw), yy = (y + off[p]) % W2, n = N[(Math.floor(yy / 2) % 256) * 64 + Math.floor((x % pw) / pw * 64)], grain = 0.85 + 0.15 * Math.sin((x % pw) * 0.35 + n * 14);
    const seam = (x % pw < 2) || (yy % (W2 / 2) < 2) ? 0.55 : 1, k = tone[p] * grain * seam, i = (y * W2 + x) * 4; id.data[i] = base[0] * k; id.data[i + 1] = base[1] * k; id.data[i + 2] = base[2] * k; id.data[i + 3] = 255;
    const hv = seam < 1 ? 40 : 150 + n * 60; ih.data[i] = ih.data[i + 1] = ih.data[i + 2] = hv; ih.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); gh.putImageData(ih, 0, 0); return [c, h]; }
// asfalto con grava
function asphaltCanvases(seed = 13, W2 = 512) { const R = rng(seed), c = cnv(W2, W2), h = cnv(W2, W2), g = c.getContext('2d'), gh = h.getContext('2d'), N = noise2(R, 128, 128, 5), id = g.createImageData(W2, W2), ih = gh.createImageData(W2, W2);
  for (let y = 0; y < W2; y++) for (let x = 0; x < W2; x++) { const n = N[((y >> 2) % 128) * 128 + ((x >> 2) % 128)], s = R(), v = 52 + n * 26 + (s > 0.93 ? 30 : s < 0.06 ? -14 : 0), i = (y * W2 + x) * 4;
    id.data[i] = v; id.data[i + 1] = v * 1.01; id.data[i + 2] = v * 1.04; id.data[i + 3] = 255; const hv = 110 + (s > 0.9 ? 70 : 0) + n * 40; ih.data[i] = ih.data[i + 1] = ih.data[i + 2] = hv; ih.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); gh.putImageData(ih, 0, 0); return [c, h]; }
// tierra con hierba (debajo de las briznas)
function lawnCanvas(seed = 17, W2 = 512) { const R = rng(seed), c = cnv(W2, W2), g = c.getContext('2d'), N = noise2(R, 128, 128, 6), id = g.createImageData(W2, W2);
  for (let y = 0; y < W2; y++) for (let x = 0; x < W2; x++) { const n = N[((y >> 2) % 128) * 128 + ((x >> 2) % 128)], s = R(), i = (y * W2 + x) * 4, k = 0.75 + n * 0.5 + (s - 0.5) * 0.25;
    id.data[i] = 62 * k; id.data[i + 1] = 108 * k; id.data[i + 2] = 40 * k; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); return c; }
// letrero: texto sobre fondo, en un plano (rótulos de tiendas, pergamino, placas)
function signTex(w, h, draw) { const c = cnv(w, h), g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function signPlane(w, h, px, draw, o = {}) { const t = signTex(px, Math.round(px * h / w), draw); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: o.r ?? 0.5, metalness: o.metal ?? 0, transparent: !!o.alpha, emissive: o.glow ? 0xffffff : 0x000000, emissiveMap: o.glow ? t : null, emissiveIntensity: o.glow ?? 0 })); m.receiveShadow = true; return m; }
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
// ---------------------------------------------------------------- el cielo y la luz: 'dia' (mañana soleada en Kiria World) y 'salon' (dentro del ayuntamiento: luz de las ventanas y lámparas).
// moodSet(nombre) pone uno; moodMix({vice: 0.3, noche: 0.7}) mezcla. Cielo de degradado (cúpula que sigue a la cámara) + reflejos (PMREM de ese cielo).
const _o = new THREE.Object3D();      // objeto de trabajo para las matrices de las instancias
const ASSET = '/projects/ciudad_seguidores_ep3/web/assets/';
const ENV = { rot: 0, env: 1 };
const TEXL = new THREE.TextureLoader(), PENDING = [];
function tx(path, srgb = true, rep = null) { let ok; PENDING.push(new Promise(a => { ok = a; })); const t = TEXL.load(ASSET + path, () => ok(), undefined, () => { console.error('ERROR textura ' + path); ok(); });
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
function waitLoads() { return Promise.all(PENDING); }
const C3 = h => new THREE.Color(h);
// sky: cénit, horizonte, suelo (bajo el horizonte), sol (dirección, color, tamaño); fog: color y densidad (FogExp2, por unidad); key: sol/foco; fill; hemi: cielo, suelo, intensidad
const MOODS = {
  dia:   { zen: 0x5d9be0, hor: 0xd6e8f4, gnd: 0x7d8a6a, sunD: [-0.5, 0.62, 0.6], sunC: 0xfff1d6, sunS: 0.9, stars: 0.0, fogC: 0xd2e2ee, fogD: 0.0035,
           key: [0xfff0d8, 3.4], keyD: [-0.5, 0.62, 0.6], fill: [0xbcd4ff, 0.35], hemi: [0xdfeaff, 0x8a7a60, 0.55], env: 0.65, exp: 1.0 },
  salon: { zen: 0x5d9be0, hor: 0xd6e8f4, gnd: 0x7d8a6a, sunD: [-0.5, 0.62, 0.6], sunC: 0xfff1d6, sunS: 0.9, stars: 0.0, fogC: 0xd2e2ee, fogD: 0.0,
           key: [0xfff0d8, 3.1], keyD: [-0.5, 0.62, 0.6], fill: [0xffd9a8, 0.35], hemi: [0xffe6c8, 0x5a4232, 0.75], env: 0.55, exp: 1.0 },
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
  vec3 c = y > 0. ? mix(hor, zen, pow(clamp(y, 0., 1.), 0.55)) : mix(hor, gnd, clamp(-y * 6., 0., 1.));
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
  S.sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 64, 32), skyMat()); S.sky.renderOrder = -10; S.sky.frustumCulled = false; scene.add(S.sky);
  scene.background = null; S.fog = new THREE.FogExp2(0x000000, 0); scene.fog = S.fog;
}
// la luz: un «sol» que da sombras (sigue a lo que mira la cámara), un relleno y una luz de cielo/suelo
function buildLights() {
  const key = new THREE.DirectionalLight(0xffffff, 2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 4; key.shadow.bias = -0.0003;
  scene.add(key, key.target); const fill = new THREE.DirectionalLight(0xffffff, 0.4); scene.add(fill, fill.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.4); scene.add(hemi); S.L = { key, fill, hemi, keyD: new THREE.Vector3(0, 1, 0), fillD: new THREE.Vector3(-0.95, 0.22, -0.1) };
  moodSet('dia');
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
  sc.left = sc.bottom = -R; sc.right = sc.top = R; sc.near = Math.max(0.1, far * 0.5 - 3 * R - 60); sc.far = far * 0.5 + 3 * R + 120; sc.updateProjectionMatrix(); L.key.shadow.normalBias = R * 0.0012;
  L.fill.position.copy(c).addScaledVector(L.fillD, 300); L.fill.target.position.copy(c);
}
// materiales que llevan sus propios reflejos (con intensidad propia): se les cambia el mapa al cambiar de ambiente
const ENVMATS = new Set();
function envMat(m, k) { if (!m || !m.isMeshStandardMaterial || !scene.environment) return; if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity; if (k !== undefined) m.userData.envK = k; ENVMATS.add(m);
  if (m.envMap !== scene.environment) { m.envMap = scene.environment; m.needsUpdate = true; } m.envMapIntensity = m.userData.envFixed ?? m.userData.env0 * (m.userData.envK ?? 1) * (S.envI ?? 1); }
function envAll(root, k) { root.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) envMat(m, k); }); }
// ---------------------------------------------------------------- EL PUEBLO (día 3, más realista): plaza de piedra con el pedestal, ayuntamiento con pórtico y salón del trono,
// la calle de las tiendas con calzada, aceras y bordillos, franjas de césped de verdad (briznas), árboles, farolas, bancos y edificios alrededor.
const T = {};       // materiales del pueblo
function townMats() {
  const [pc, ph] = tileCanvases([190, 182, 170], 7, 512, 5, 7, 5); T.plaza = texMat(pc, ph, [10, 10], { r: 0.88, ns: 0.8 });
  const [sc, sh] = tileCanvases([176, 176, 172], 19, 512, 4, 4, 4); T.walk = texMat(sc, sh, [1, 1], { r: 0.85, ns: 0.7 });
  const [ac, ah] = asphaltCanvases(13); T.road = texMat(ac, ah, [1, 1], { r: 0.92, ns: 0.6 });
  T.curb = stdM(0xb8b4ac, 0.75); T.mark = stdM(0xf2f0e8, 0.6, { emissive: 0x111111 });
  T.lawn = new THREE.MeshStandardMaterial({ map: texOf(lawnCanvas(), [6, 6]), roughness: 0.95 });
  const [hc, hh] = stuccoCanvases([226, 214, 190], 21); T.stone = texMat(hc, hh, [3, 3], { r: 0.8, ns: 0.6 });
  T.stoneW = stdM(0xeee7da, 0.55); T.gold = new THREE.MeshStandardMaterial({ color: 0xffc85a, roughness: 0.25, metalness: 1 }); T.goldD = new THREE.MeshStandardMaterial({ color: 0xc8922e, roughness: 0.35, metalness: 1 });
  T.iron = stdM(0x23272b, 0.45, { metalness: 0.6 }); T.woodD = stdM(0x4a2e1c, 0.6); T.bark = stdM(0x5a4433, 0.95); T.glassDark = new THREE.MeshPhysicalMaterial({ color: 0x2a3a48, roughness: 0.06, metalness: 0.0, transparent: true, opacity: 0.85, envMapIntensity: 1.4 });
  T.glass = new THREE.MeshPhysicalMaterial({ color: 0xdfeef2, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.08, envMapIntensity: 0.55, depthWrite: false });
  T.frame = stdM(0x2c2f33, 0.4, { metalness: 0.5 }); T.velvet = stdM(0x8c1426, 0.75); T.purple = stdM(0x4b2a78, 0.7);
  T.lampGlow = new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd89a, emissiveIntensity: 1.6, roughness: 0.3 });
  { const c = cnv(256, 256), g = c.getContext('2d'), R = rng(77); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { const v = (90 + R() * 120) | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.ellipse(R() * 256, R() * 256, 4 + R() * 6, 2 + R() * 3, R() * 3.14, 0, 7); g.fill(); }
    const ln = normalFrom(c, 4); ln.repeat.set(3, 3); const lc = cnv(256, 256), lg = lc.getContext('2d'), R2 = rng(78); lg.fillStyle = '#7a7a7a'; lg.fillRect(0, 0, 256, 256); for (let i = 0; i < 1400; i++) { const v = (110 + R2() * 145) | 0; lg.fillStyle = `rgb(${v},${v},${v})`; lg.beginPath(); lg.ellipse(R2() * 256, R2() * 256, 3 + R2() * 5, 2 + R2() * 2, R2() * 3.14, 0, 7); lg.fill(); }
    const lmap = texOf(lc, [3, 3]); T.leaf = [0x3f7a35, 0x4f8a3b, 0x356b2e, 0x5c9440].map(col => new THREE.MeshStandardMaterial({ color: col, map: lmap, normalMap: ln, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.82 })); }
  T.hedge = stdM(0x3a6f30, 0.9);
}
function plane(w, d, m, x, y, z, rep) { const g = new THREE.PlaneGeometry(w, d); if (rep) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rep[0], uv.getY(i) * rep[1]); } const p = new THREE.Mesh(g, m); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; return p; }

// ---- suelo: plaza, aceras con bordillo, calzada con rayas, franjas de césped
function buildGround(G) {
  G.add(plane(29, 30, T.plaza, -0.5, 0, 0, [1, 1]));                                            // plaza x ∈ [−15, 14], z ∈ [−15, 15]
  G.add(plane(200, 200, T.lawn, 0, -0.02, 0, [20, 20]));                                         // fondo verde (lejos)
  // calle norte-sur de las tiendas: acera oeste x ∈ [13.6, 15.6], calzada [15.6, 22.4], acera este [22.4, 25]
  G.add(plane(2.0, 60, T.walk, 14.6, 0.14, 0, [1, 30])); G.add(plane(2.6, 60, T.walk, 23.7, 0.14, 0, [1.3, 30]));
  G.add(plane(6.8, 80, T.road, 19.0, 0.0, 0, [3.4, 40]));
  for (const x of [15.6, 22.4]) { const c = box(0.22, 0.15, 60, T.curb, x, 0.075, 0); G.add(c); }
  for (let z = -30; z < 30; z += 3.2) G.add(plane(0.14, 1.6, T.mark, 20.0, 0.012, z, null));     // raya discontinua (aparcamiento al oeste, un carril por sentido)
  // calle este-oeste del sur (la esquina de la cola): calzada z ∈ [16, 22]
  G.add(plane(80, 6, T.road, 10, 0.001, 19, [40, 3])); for (let x = -30; x < 50; x += 3.2) { const m = plane(1.6, 0.14, T.mark, x, 0.013, 19, null); G.add(m); }
  G.add(plane(60, 1.6, T.walk, 0, 0.14, 15.8, [30, 0.8])); G.add(box(60, 0.15, 0.22, T.curb, 0, 0.075, 16.6));
  // césped: entre la plaza y la acera (con árboles) y dos parterres en la plaza
  T.lawns = [[12.0, 13.6, -14, 14], [-14.5, -11.5, -12, 12], [-8.5, -4.5, 7.5, 12.5], [4.5, 8.5, 7.5, 12.5]];
  for (const [x0, x1, z0, z1] of T.lawns) { G.add(plane(x1 - x0, z1 - z0, T.lawn, (x0 + x1) / 2, 0.05, (z0 + z1) / 2, [(x1 - x0) / 4, (z1 - z0) / 4]));
    for (const [w, d, x, z] of [[x1 - x0 + 0.24, 0.12, (x0 + x1) / 2, z0], [x1 - x0 + 0.24, 0.12, (x0 + x1) / 2, z1], [0.12, z1 - z0, x0, (z0 + z1) / 2], [0.12, z1 - z0, x1, (z0 + z1) / 2]]) G.add(box(w, 0.14, d, T.curb, x, 0.07, z)); }
}
// ---- briznas de hierba (instancias con vaivén de viento): miles en los céspedes cercanos
const GRASS_VS_INJ = `
  float sway = sin(time * 1.7 + instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.9) * 0.08 + sin(time * 3.1 + instanceMatrix[3].z * 2.1) * 0.03;
  transformed.x += sway * position.y * position.y * 6.0;`;
function grassField(G, rects, n, seed = 1) { const R = rng(seed), g = new THREE.BufferGeometry(), w = 0.012, hgt = 0.11;
  g.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, -w * 0.6, hgt * 0.5, 0.004, w * 0.6, hgt * 0.5, 0.004, 0, hgt, 0.012], 3)); g.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide, vertexColors: false });
  m.onBeforeCompile = sh => { sh.uniforms.time = S.grassTime = S.grassTime || { value: 0 }; sh.vertexShader = 'uniform float time;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>' + GRASS_VS_INJ); };
  const area = rects.reduce((s, r) => s + (r[1] - r[0]) * (r[3] - r[2]), 0), im = new THREE.InstancedMesh(g, m, n), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); let i = 0;
  for (const [x0, x1, z0, z1] of rects) { const cnt = Math.round(n * (x1 - x0) * (z1 - z0) / area); for (let j = 0; j < cnt && i < n; j++, i++) { const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0), s = 0.6 + R() * 0.9;
    q.setFromEuler(new THREE.Euler((R() - 0.5) * 0.5, R() * Math.PI * 2, (R() - 0.5) * 0.5)); M4.compose(_v(x, 0.05, z), q, _v(s, s * (0.7 + R() * 0.8), s)); im.setMatrixAt(i, M4);
    c.setHSL(0.26 + R() * 0.06, 0.45 + R() * 0.2, 0.22 + R() * 0.16); im.setColorAt(i, c); } }
  im.count = i; im.receiveShadow = true; im.castShadow = false; G.add(im); return im; }
// ---- árbol: tronco torneado con ramas y copa de varios racimos de hojas (esferas deformadas, de colores distintos)
const _leafG = []; function leafBlob(seed) { if (_leafG[seed % 6]) return _leafG[seed % 6]; const g = new THREE.IcosahedronGeometry(1, 5), p = g.attributes.position, R = rng(seed + 50), N = Array.from({ length: 8 }, () => [_v(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), R() * 0.25]);
  for (let i = 0; i < p.count; i++) { const v = _v(p.getX(i), p.getY(i), p.getZ(i)); let d = 1; for (const [n, a] of N) d += a * Math.max(0, v.dot(n)) ** 2; v.multiplyScalar(d); p.setXYZ(i, v.x, v.y * 0.85, v.z); }
  g.computeVertexNormals(); return (_leafG[seed % 6] = g); }
function tree(seed, hgt = 6) { const R = rng(seed), g = new THREE.Group(), k = hgt / 6;
  const trunk = new THREE.Mesh(new THREE.LatheGeometry([[0.22, 0], [0.17, 0.4], [0.14, 2.0], [0.11, 3.2], [0.07, 4.2]].map(q => new THREE.Vector2(q[0] * k, q[1] * k)), 12), T.bark); trunk.castShadow = trunk.receiveShadow = true; g.add(trunk);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + R(), b = bar(_v(0, (2.4 + R() * 1.2) * k, 0), _v(Math.cos(a) * 1.2 * k, (3.4 + R()) * k, Math.sin(a) * 1.2 * k), 0.06 * k, T.bark, 6); g.add(b); }
  const n = 7 + Math.floor(R() * 4); for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, r = (0.4 + R() * 1.2) * k, y = (3.6 + R() * 2.0) * k, s = (0.9 + R() * 0.8) * k, l = new THREE.Mesh(leafBlob(seed + i), T.leaf[(seed + i) % 4]);
    l.position.set(Math.cos(a) * r, y, Math.sin(a) * r); l.scale.setScalar(s); l.rotation.set(R() * 3, R() * 3, R() * 3); l.castShadow = l.receiveShadow = true; g.add(l); }
  return g; }
// ---- farola de hierro con farol, banco de listones, papelera, seto
function lampPost() { const g = new THREE.Group(); ad(g, cyl(0.09, 0.12, 0.4, T.iron, 16)).position.y = 0.2; const p = cyl(0.05, 0.065, 3.6, T.iron, 12); p.position.y = 2.2; g.add(p);
  const arm = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 8, 16, Math.PI), T.iron); arm.position.set(0.28, 4.0, 0); g.add(arm);
  const lan = new THREE.Group(); lan.position.set(0.56, 3.72, 0); g.add(lan); ad(lan, cyl(0.06, 0.16, 0.12, T.iron, 6)).position.y = 0.08; const gl = cyl(0.13, 0.09, 0.3, T.lampGlow, 6); gl.position.y = -0.12; lan.add(gl); ad(lan, cyl(0.1, 0.05, 0.06, T.iron, 6)).position.y = -0.3;
  shadowAll(g, true, true); return g; }
function bench() { const g = new THREE.Group(), w = stdM(0x8a5a34, 0.7); for (let i = 0; i < 4; i++) g.add(box(1.7, 0.035, 0.09, w, 0, 0.45, -0.18 + i * 0.12)); for (let i = 0; i < 3; i++) { const b = box(1.7, 0.09, 0.035, w, 0, 0.62 + i * 0.12, -0.26); b.rotation.x = -0.15; g.add(b); }
  for (const x of [-0.7, 0.7]) { g.add(box(0.06, 0.45, 0.06, T.iron, x, 0.22, 0.15)); g.add(box(0.06, 0.9, 0.06, T.iron, x, 0.45, -0.24)); g.add(box(0.06, 0.06, 0.46, T.iron, x, 0.42, -0.04)); } return g; }
function hedge(w, d, h) { return rboxM(w, h, d, Math.min(0.25, h * 0.4), T.hedge, 2); }

// ---- el pedestal del centro de la plaza (mármol, canto de oro, placa) y la estatua de oro que aparecerá
function pedestal() { const g = new THREE.Group(), mt = texOf(marbleCanvas(31, 512, false), [1, 1]), mar = new THREE.MeshPhysicalMaterial({ color: 0xf6f2ea, map: mt, roughness: 0.22, clearcoat: 0.5, clearcoatRoughness: 0.15 });
  ad(g, cyl(1.75, 1.85, 0.25, stdM(0xcfc8bb, 0.6), 48)).position.y = 0.125; ad(g, cyl(1.45, 1.5, 0.2, mar, 48)).position.y = 0.35;
  const prof = [[0.95, 0], [0.95, 0.12], [0.82, 0.22], [0.8, 0.3], [0.68, 0.36], [0.66, 1.9], [0.78, 1.98], [0.8, 2.08], [0.92, 2.16], [0.92, 2.3], [0, 2.3]];
  const col = new THREE.Mesh(new THREE.LatheGeometry(prof.map(q => new THREE.Vector2(q[0], q[1])), 4, Math.PI / 4), mar); col.position.y = 0.45; col.castShadow = col.receiveShadow = true; g.add(col);
  ad(g, box(1.42, 0.08, 1.42, T.gold, 0, 2.8, 0)); ad(g, box(1.36, 0.06, 1.36, T.gold, 0, 0.85, 0));
  const plates = []; for (const [rx, x, z] of [[0, 0, 0.475], [Math.PI / 2, 0.475, 0], [Math.PI, 0, -0.475], [-Math.PI / 2, -0.475, 0]]) { const pl = signPlane(0.78, 0.42, 512, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#e6bf5c'); gr.addColorStop(1, '#a87c26'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.strokeStyle = '#6e4c12'; c.lineWidth = 10; c.strokeRect(10, 10, w - 20, h - 20); c.fillStyle = '#4a3108'; c.font = '900 150px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', w / 2, h / 2 + 8); }, { metal: 0.85, r: 0.3 });
    pl.position.set(x, 1.62, z); pl.rotation.y = rx; g.add(pl); plates.push(pl); }
  g.userData.plates = plates; g.userData.top = 2.84; shadowAll(g); return g; }
// la estatua de oro: una persona de pie con el brazo en alto, toda de oro pulido (aparece al final)
function goldStatue() { const p = person({ seed: 777, hairStyle: 'short', topType: 'long' }), gold = new THREE.MeshStandardMaterial({ color: 0xffc95a, roughness: 0.18, metalness: 1 });
  p.traverse(o => { if (o.isMesh) o.material = gold; }); poseReset(p); const J = p.userData.J; J.shR.rotation.z = 2.7; J.elR.rotation.z = 0.3; J.shL.rotation.z = -0.25; J.shL.rotation.x = -0.2; J.head.rotation.x = -0.12; J.hpL.rotation.x = -0.1; J.knL.rotation.x = 0.15;
  p.scale.setScalar(1.25); return p; }
// ---------------------------------------------------------------- LA GENTE (día 3, Javi: «personas con boca y ojos, más realistas»)
// Cuerpo articulado (cadera, columna, pecho, cuello, cabeza, hombros, codos, muñecas, caderas, rodillas, tobillos), ropa y pelo variados, y una CARA
// pintada en el sombreador de la cabeza: ojos con iris, pupila y brillo que parpadean y miran, cejas, mejillas, nariz en relieve y una boca con
// labios que habla, sonríe y mastica. Sin texturas: la cara se ve nítida tanto de cerca (el rey) como a varios metros (la gente tras los cristales).
const FACE_FN = `
float fFill(float d){ float w = fwidth(d) * 0.8 + 1e-4; return 1.0 - smoothstep(-w, w, d); }
float fEll(vec2 p, vec2 r){ return (length(p / r) - 1.0) * min(r.x, r.y); }
void kwFace(inout vec3 col, inout vec3 em, inout float eyeM){
  vec3 d = normalize(vObj); if (d.z < 0.15) return;
  vec2 p = vec2(atan(d.x, d.z), asin(clamp(d.y, -1., 1.)));
  // mejillas
  for (int s = 0; s < 2; s++) { float sx = s == 0 ? -1. : 1.; col = mix(col, col * vec3(1.06, 0.80, 0.80), blush * (1. - smoothstep(0.02, 0.16, length(p - vec2(0.40 * sx, -0.20))))); }
  // ojos
  for (int s = 0; s < 2; s++) {
    float sx = s == 0 ? -1. : 1.; vec2 c = vec2(0.33 * sx, 0.06); vec2 r = vec2(0.17, 0.1);
    vec2 q = p - c; float ky = max(0.25, 1.0 - 0.32 * pow(q.x / r.x, 2.));
    float de = fEll(vec2(q.x, q.y / ky), r);
    float lidTop = c.y + r.y * (1.0 - 2.05 * blink) - 0.004;
    float vis = fFill(de) * fFill(p.y - lidTop);
    vec2 ic = c + vec2(gaze.x * 0.055, gaze.y * 0.03 - 0.004);
    float di = length(p - ic);
    vec3 ecol = vec3(0.93, 0.92, 0.89);
    ecol = mix(ecol, mix(eyeC * 0.45, eyeC, smoothstep(0.07, 0.025, di)), fFill(di - 0.066));
    ecol = mix(ecol, vec3(0.015), fFill(di - 0.03));
    ecol *= 1.0 - 0.25 * smoothstep(0.0, 0.05, q.y - (lidTop - c.y) + 0.05) * step(0.5, vis);   // sombra del párpado
    col = mix(col, ecol, vis); eyeM = max(eyeM, vis);
    em += vec3(0.75) * fFill(length(p - (ic + vec2(-0.02 * sx * 0.0 - 0.018, 0.024))) - 0.013) * vis;
    // pestañas / línea del párpado de arriba
    float topEdge = min(lidTop, c.y + r.y * ky * sqrt(max(0., 1. - pow(q.x / r.x, 2.))));
    float lash = fFill(abs(p.y - topEdge) - 0.011) * fFill(abs(q.x) - r.x * 1.04);
    col = mix(col, lashC, lash * 0.92);
    // línea suave de abajo
    float botEdge = c.y - r.y * ky * sqrt(max(0., 1. - pow(q.x / r.x, 2.)));
    col = mix(col, col * 0.82, fFill(abs(p.y - botEdge) - 0.006) * fFill(abs(q.x) - r.x * 0.9) * 0.6);
    // ceja
    vec2 bq = p - vec2(0.33 * sx, 0.235 + brow * 0.035);
    float by = 0.03 * (1. - pow(bq.x / 0.16, 2.)) + sx * bq.x * 0.08 * browTilt;
    float bw = 0.021 * (1. - 0.55 * smoothstep(0.0, 0.16, sx * bq.x));
    col = mix(col, browC, fFill(abs(bq.y - by) - bw) * fFill(abs(bq.x) - 0.165));
  }
  // boca
  vec2 mq = p - vec2(0., -0.335);
  float w = 0.165 + 0.035 * smile; float xn = mq.x / w;
  float yy = mq.y - smile * 0.045 * xn * xn + 0.012 * smile;
  float hh = 0.005 + 0.07 * open;
  float lipsD = fEll(vec2(mq.x, yy - 0.002), vec2(w * 1.06, hh + 0.026));
  col = mix(col, lipC, fFill(lipsD) * 0.95);
  float dm = fEll(vec2(mq.x, yy), vec2(w * 0.9, hh));
  vec3 inner = mix(vec3(0.30, 0.06, 0.07), vec3(0.9, 0.88, 0.84), smoothstep(0.3, 0.55, open) * step(hh * 0.35, yy));
  col = mix(col, inner, fFill(dm) * smoothstep(0.0, 0.08, open));
  col = mix(col, lipC * 0.45, fFill(abs(yy) - 0.005) * fFill(abs(xn) - 0.92) * (1. - smoothstep(0.02, 0.1, open)));
  // sombra bajo la nariz y en las comisuras
  col *= 1.0 - 0.12 * (1. - smoothstep(0.0, 0.06, length(p - vec2(0., -0.2))));
}`;
let FACE_MATS = [];
function faceMat(o) {
  const m = new THREE.MeshStandardMaterial({ color: o.skin, roughness: 0.52, metalness: 0 });
  const U = { blink: { value: 0 }, open: { value: 0 }, smile: { value: o.smile ?? 0.35 }, gaze: { value: new THREE.Vector2() }, brow: { value: 0 }, browTilt: { value: 0 }, blush: { value: o.blush ?? 0.22 },
    eyeC: { value: new THREE.Color(o.eye) }, browC: { value: new THREE.Color(o.brow) }, lipC: { value: new THREE.Color(o.lip) }, lashC: { value: new THREE.Color(0x1a1210) } };
  m.userData.U = U;
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vObj;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vObj = position;');
    sh.fragmentShader = 'varying vec3 vObj; uniform float blink, open, smile, brow, browTilt, blush; uniform vec2 gaze; uniform vec3 eyeC, browC, lipC, lashC;\n' + FACE_FN + '\n' + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n vec3 faceE = vec3(0.); float eyeM = 0.; kwFace(diffuseColor.rgb, faceE, eyeM);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.12, eyeM);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += faceE;'); };
  m.customProgramCacheKey = () => 'kwFace3';
  FACE_MATS.push(m); return m; }

// ---- piezas
const SKINS = [0xf2d3be, 0xe8c1a4, 0xd9ab8c, 0xc79473, 0xa97a5c, 0x8c5f45, 0x6b4634, 0xf6e0d0];
const HAIRC = [0x1d1512, 0x2e2018, 0x4a2f1d, 0x6b4426, 0x8c5a2e, 0xc79a5a, 0xe2c27e, 0x9a3b1c, 0x7d7d80, 0xd8d5d0];
const EYEC = [0x3b2414, 0x4d2f17, 0x5e3a1c, 0x2f6b8a, 0x4b7a45, 0x6e5a30];
const TOPC = [0xc63d3d, 0x2f5fa8, 0x3f8a5e, 0xe2b13c, 0x2b2f38, 0xe8e4dc, 0x7a4fa0, 0xd9773a, 0x5e8fb8, 0x9a2f4f, 0x33706f, 0xb7a68a, 0x1e3352];
const LEGC = [0x2a3346, 0x1f2229, 0x4a4f58, 0x6b5a45, 0x3a4a6b, 0x8a7a62, 0x23262c];
const _mc = new Map();
const matOf = (c, r = 0.85, extra = {}) => { const k = c + '|' + r + JSON.stringify(extra); if (!_mc.has(k)) _mc.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra })); return _mc.get(k); };
const capsG = new Map(); const capG = (r, l) => { const k = r.toFixed(3) + ',' + l.toFixed(3); if (!capsG.has(k)) { const g = new THREE.CapsuleGeometry(r, l, 6, 14); g.translate(0, -l / 2 - r * 0.15, 0); capsG.set(k, g); } return capsG.get(k); };
function pm(g, m) { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; }
// torso: perfil torneado (cintura → pecho → hombros), aplanado de delante a atrás
function torsoGeo(wW, wC, wS, h, flat = 0.64) { const P = [[0.0, 0], [wW, 0.0], [wW * 1.04, h * 0.25], [wC, h * 0.62], [wC * 1.02, h * 0.82], [wS * 0.82, h * 0.95], [wS * 0.35, h * 1.02], [0.0, h * 1.03]].map(q => new THREE.Vector2(q[0], q[1]));
  const g = new THREE.LatheGeometry(P, 28); g.scale(1, 1, flat); g.computeVertexNormals(); return g; }
// la cabeza: esfera con barbilla algo más estrecha (en unidades de cabeza; la malla se escala a metros)
let _headG = null;
function headGeo() { if (_headG) return _headG; const g = new THREE.SphereGeometry(1, 48, 36), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const jaw = y < -0.1 ? 1 - 0.22 * Math.min(1, (-y - 0.1) / 0.8) : 1; x *= jaw; z *= y < -0.2 ? 1 - 0.08 * Math.min(1, (-y - 0.2) / 0.7) : 1; if (z > 0.6 && y < 0.25 && y > -0.55) z += 0.02 * (1 - Math.abs(x)); p.setXYZ(i, x, y, z); }
  g.computeVertexNormals(); return (_headG = g); }
// pelo: casquete (y melena, moño, coleta o rizos según el estilo)
function hairGeo(style) { const G = []; const cap = new THREE.SphereGeometry(1.07, 36, 24, 0, Math.PI * 2, 0, style === 'buzz' ? 1.25 : 1.45); cap.rotateX(-0.28); cap.translate(0, 0.06, -0.05); G.push(cap);
  if (style === 'long' || style === 'bob') { const L = style === 'long' ? 1.9 : 1.15, back = new THREE.CylinderGeometry(1.0, 1.08, L, 32, 4, true, Math.PI * 0.55, Math.PI * 0.9); back.translate(0, -L / 2 + 0.25, -0.12); G.push(back); }
  if (style === 'bun') { const b = new THREE.SphereGeometry(0.42, 18, 14); b.translate(0, 0.72, -0.72); G.push(b); }
  if (style === 'pony') { const b = new THREE.SphereGeometry(0.3, 14, 10); b.translate(0, 0.35, -1.0); G.push(b); const t = new THREE.CapsuleGeometry(0.22, 0.9, 6, 12); t.rotateX(0.35); t.translate(0, -0.3, -1.12); G.push(t); }
  if (style === 'curly') { const R = rng(7); for (let i = 0; i < 26; i++) { const a = R() * Math.PI * 2, e = R() * 1.2 + 0.05, s = new THREE.SphereGeometry(0.32 + R() * 0.12, 10, 8); s.translate(Math.cos(a) * Math.cos(e) * 1.02, 0.15 + Math.sin(e) * 1.02, Math.sin(a) * Math.cos(e) * 1.02 - 0.12); G.push(s); } }
  const g = mergeGeometries(G.map(x => x.index ? x.toNonIndexed() : x)); g.computeVertexNormals(); return g; }
const _hairG = {}; const hairOf = s => _hairG[s] || (_hairG[s] = hairGeo(s));
let _hairN = null;
function hairNormal() { if (_hairN) return _hairN; const c = cnv(256, 256), g = c.getContext('2d'), R = rng(5); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 520; i++) { const x = R() * 256, v = (100 + R() * 120) | 0; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 0.6 + R() * 1.6; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (R() - 0.5) * 20, 90, x + (R() - 0.5) * 20, 170, x + (R() - 0.5) * 12, 256); g.stroke(); }
  _hairN = normalFrom(c, 3.5); _hairN.repeat.set(6, 1); return _hairN; }

// ---- una persona. o: { h, skin, hair:{style,color}, top, topType:'tee'|'long'|'coat'|'apron'|'chef'|'vet'|'king', legs, skirt, shoes, eye, female, seed }
// miembro torneado (cilindro con radios distintos y casquetes redondos): cuelga hacia −y desde la articulación
const _limbG = new Map();
function limbG(r0, r1, L) { const key = [r0, r1, L].map(x => x.toFixed(4)).join(','); if (_limbG.has(key)) return _limbG.get(key);
  const P = [], n = 7; for (let i = 0; i <= n; i++) { const a = Math.PI / 2 * (1 - i / n); P.push(new THREE.Vector2(r0 * Math.cos(a), r0 * Math.sin(a))); }
  P.push(new THREE.Vector2(r0, 0)); for (let i = 1; i <= 6; i++) { const u = i / 6, r = r0 + (r1 - r0) * u + Math.sin(u * Math.PI) * (r0 - r1) * 0.25; P.push(new THREE.Vector2(r, -L * u)); }
  for (let i = 1; i <= n; i++) { const a = -Math.PI / 2 * i / n; P.push(new THREE.Vector2(r1 * Math.cos(a), -L + r1 * Math.sin(a))); }
  const g = new THREE.LatheGeometry(P.map(v => new THREE.Vector2(Math.max(v.x, 1e-4), v.y)), 18); g.computeVertexNormals(); _limbG.set(key, g); return g; }
function person(o = {}) {
  const R = rng(o.seed ?? 1), h = o.h ?? (o.female ? 1.64 + R() * 0.1 : 1.73 + R() * 0.12), k = h / 1.72;
  const skin = o.skin ?? pick(R, SKINS), hairC = o.hairC ?? pick(R, HAIRC), top = o.top ?? pick(R, TOPC), legs = o.legs ?? pick(R, LEGC), shoes = o.shoes ?? pick(R, [0x1b1b1d, 0x3b2a20, 0xe8e6e0, 0x5a4636]);
  const style = o.hairStyle ?? (o.female ? pick(R, ['long', 'bob', 'bun', 'pony', 'curly', 'long']) : pick(R, ['short', 'short', 'buzz', 'curly', 'short', 'bald']));
  const topEff = ['vet', 'chef'].includes(o.topType) ? 0xf6f6f2 : top; const mSkin = matOf(skin, 0.55), mTop = matOf(topEff, 0.8), mTop2 = matOf(new THREE.Color(topEff).multiplyScalar(0.8).getHex(), 0.8), mLegs = matOf(legs, 0.82), mShoe = matOf(shoes, 0.45), mSole = matOf(0x2a2622, 0.7), mHair = matOf(hairC, 0.55, { normalMap: hairNormal(), normalScale: new THREE.Vector2(0.9, 0.9) });
  const root = new THREE.Group(), J = {}; root.userData = { J, k, h, seed: o.seed ?? 1, R, o, phase: R() * 100 };
  const jt = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
  const F = o.female ? 1 : 0;
  const pel = jt('pelvis', root, 0, 0.9 * k, 0), spine = jt('spine', pel, 0, 0.0, 0), chest = jt('chest', spine, 0, 0.27 * k, 0), neck = jt('neck', chest, 0, 0.19 * k, 0), head = jt('head', neck, 0, 0.07 * k, 0);
  root.userData.base = { pelY: 0.9 * k };
  // tronco: cadera → cintura → pecho → hombros caídos → base del cuello (un solo torneado, aplanado)
  const prof = [[0.0, -0.06], [0.13 + 0.015 * F, -0.06], [0.138 + 0.02 * F, 0.02], [0.123 - 0.008 * F, 0.13], [0.142 + 0.006 * F, 0.27], [0.15, 0.36], [0.128 - 0.012 * F, 0.425], [0.075, 0.46], [0.045, 0.47], [0.0, 0.47]];
  const tg = new THREE.LatheGeometry(prof.map(q => new THREE.Vector2(q[0] * k, q[1] * k)), 32); tg.scale(1, 1, 0.68); tg.computeVertexNormals(); const torso = pm(tg, mTop); spine.add(torso);
  // cinturón y cuello de la camisa
  if (!['vet', 'chef', 'king', 'coat'].includes(o.topType) && !o.skirt) { const belt = pm(new THREE.CylinderGeometry(0.137 * k, 0.139 * k, 0.03 * k, 32, 1, true), matOf(0x2a2420, 0.5)); belt.scale.z = 0.68; belt.position.y = 0.02 * k; spine.add(belt); }
  const col = pm(new THREE.TorusGeometry(0.05 * k, 0.012 * k, 8, 24), mTop2); col.rotation.x = Math.PI / 2; col.position.y = 0.455 * k; spine.add(col);
  // pierna de los pantalones arriba (la cadera)
  const hip = pm(new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), mLegs); hip.scale.set((0.135 + 0.015 * F) * k, 0.12 * k, 0.095 * k); hip.position.y = -0.03 * k; pel.add(hip);
  const nk = pm(new THREE.CylinderGeometry(0.04 * k, 0.046 * k, 0.12 * k, 16), mSkin); nk.position.y = 0.02 * k; neck.add(nk);
  // cabeza (grande, estilo animación: la cara se lee de lejos), nariz, orejas y pelo
  const HS = [0.112 * k, 0.136 * k, 0.122 * k], HY = 0.11 * k;
  const fm = faceMat({ skin, eye: o.eye ?? pick(R, EYEC), brow: new THREE.Color(hairC).multiplyScalar(0.7).getHex(), lip: new THREE.Color(skin).lerp(new THREE.Color(0xb4555a), 0.55).getHex(), blush: o.female ? 0.28 : 0.15 });
  const hd = pm(headGeo(), fm); hd.scale.set(...HS); hd.position.y = HY; head.add(hd);
  const nose = pm(new THREE.SphereGeometry(1, 14, 10), mSkin); nose.scale.set(0.018 * k, 0.027 * k, 0.024 * k); nose.position.set(0, HY - 0.016 * k, HS[2] * 0.97); nose.rotation.x = -0.3; head.add(nose);
  for (const s of [-1, 1]) { const ear = pm(new THREE.SphereGeometry(1, 12, 10), mSkin); ear.scale.set(0.013 * k, 0.032 * k, 0.022 * k); ear.position.set(s * HS[0] * 0.97, HY - 0.005 * k, -0.005 * k); head.add(ear); }
  if (style !== 'bald') { const hr = pm(hairOf(style), mHair); hr.scale.set(...HS); hr.position.y = HY; head.add(hr); }
  // brazos (hombro algo metido en el tronco; manga corta o larga)
  const longSleeve = ['long', 'coat', 'chef', 'vet', 'king'].includes(o.topType);
  for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
    const sh = jt('sh' + n, chest, s * (0.132 + 0.008 * (1 - F)) * k, 0.128 * k, 0); const shp = pm(new THREE.SphereGeometry(0.042 * k, 16, 12), mTop); sh.add(shp);
    const up = pm(limbG(0.041 * k, 0.033 * k, 0.26 * k), longSleeve ? mTop : mSkin); sh.add(up);
    if (!longSleeve) { const sl = pm(limbG(0.047 * k, 0.044 * k, 0.1 * k), mTop); sh.add(sl); }
    const el = jt('el' + n, sh, 0, -0.27 * k, 0); const fo = pm(limbG(0.034 * k, 0.026 * k, 0.23 * k), longSleeve ? mTop : mSkin); el.add(fo);
    const wr = jt('wr' + n, el, 0, -0.24 * k, 0); const hand = pm(new THREE.SphereGeometry(1, 14, 10), mSkin); hand.scale.set(0.03 * k, 0.05 * k, 0.017 * k); hand.position.y = -0.04 * k; wr.add(hand);
    const th = pm(limbG(0.01 * k, 0.008 * k, 0.035 * k), mSkin); th.position.set(-s * 0.02 * k, -0.012 * k, 0.012 * k); th.rotation.z = s * 0.7; wr.add(th);
    sh.rotation.z = s * 0.06; el.rotation.x = -0.12; }
  // piernas (muslo y pierna torneados; zapato con suela)
  for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
    const hp = jt('hp' + n, pel, s * 0.075 * k, -0.04 * k, 0); const th = pm(limbG(0.072 * k, 0.05 * k, 0.4 * k), o.skirt ? mSkin : mLegs); hp.add(th);
    const kn = jt('kn' + n, hp, 0, -0.42 * k, 0); const sn = pm(limbG(0.05 * k, 0.034 * k, 0.38 * k), o.shorts || o.skirt ? mSkin : mLegs); kn.add(sn);
    const an = jt('an' + n, kn, 0, -0.41 * k, 0); const shoe = pm(new THREE.SphereGeometry(1, 18, 12), mShoe); shoe.scale.set(0.045 * k, 0.042 * k, 0.115 * k); shoe.position.set(0, -0.015 * k, 0.04 * k); an.add(shoe);
    const sole = pm(new THREE.BoxGeometry(0.085 * k, 0.018 * k, 0.24 * k), mSole); sole.position.set(0, -0.045 * k, 0.04 * k); an.add(sole); }
  // falda, delantal, bata, chaqueta de cocinero, capa de rey
  if (o.skirt) { const sk = pm(new THREE.CylinderGeometry(0.135 * k, 0.21 * k, 0.4 * k, 28, 1, true), matOf(o.skirt, 0.85, { side: THREE.DoubleSide })); sk.scale.z = 0.8; sk.position.y = -0.2 * k; pel.add(sk); }
  if (o.topType === 'apron' || o.topType === 'chef') { const ap = pm(new THREE.BoxGeometry(0.27 * k, 0.6 * k, 0.01 * k), matOf(o.apron ?? 0xf4f1ea, 0.9)); ap.position.set(0, -0.08 * k, 0.122 * k); spine.add(ap); }
  if (o.topType === 'vet' || o.topType === 'coat' || o.topType === 'chef') { const cc = o.topType === 'coat' ? top : 0xf6f6f2, coat = pm(new THREE.CylinderGeometry(0.15 * k, 0.2 * k, 0.48 * k, 28, 1, true), matOf(cc, 0.85, { side: THREE.DoubleSide })); coat.scale.z = 0.72; coat.position.y = -0.2 * k; spine.add(coat);
    if (o.topType === 'vet') { const st = pm(new THREE.TorusGeometry(0.07 * k, 0.006 * k, 8, 24, Math.PI * 1.2), matOf(0x2a2c30, 0.4)); st.rotation.set(Math.PI / 2 + 0.35, 0, Math.PI * 0.9); st.position.set(0, 0.18 * k, 0.06 * k); chest.add(st); } }
  if (o.topType === 'king') { const cape = pm(new THREE.CylinderGeometry(0.17 * k, 0.4 * k, 1.2 * k, 32, 6, true, Math.PI * 0.62, Math.PI * 0.76), matOf(0x8e1424, 0.62, { side: THREE.DoubleSide })); cape.position.set(0, -0.4 * k, -0.03 * k); chest.add(cape);
    const fur = pm(new THREE.TorusGeometry(0.15 * k, 0.04 * k, 10, 32), matOf(0xf4f0e6, 0.95)); fur.rotation.x = Math.PI / 2; fur.scale.set(1, 0.78, 1); fur.position.y = 0.17 * k; chest.add(fur);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, sp = pm(new THREE.SphereGeometry(0.011 * k, 6, 5), matOf(0x111111, 0.6)); sp.position.set(Math.cos(a) * 0.15 * k * 1.18, 0.18 * k, Math.sin(a) * 0.15 * k * 0.92); chest.add(sp); }
    const cr = crown(k * 1.12); cr.position.y = HY + HS[1] * 0.9; head.add(cr); root.userData.crown = cr; }
  if (o.hat === 'chef') { const hb = pm(new THREE.CylinderGeometry(0.115 * k, 0.115 * k, 0.12 * k, 24), matOf(0xf7f7f3, 0.9)); hb.position.y = HY + HS[1] * 0.85; head.add(hb); const pf = pm(new THREE.SphereGeometry(0.15 * k, 18, 12), matOf(0xf7f7f3, 0.9)); pf.scale.y = 0.6; pf.position.y = HY + HS[1] * 0.85 + 0.1 * k; head.add(pf); }
  if (o.hat === 'band') { const b = pm(new THREE.TorusGeometry(HS[0] * 1.03, 0.013 * k, 8, 32), matOf(0xf2f0ea, 0.8)); b.rotation.x = Math.PI / 2 - 0.25; b.scale.z = HS[2] / HS[0]; b.position.set(0, HY + HS[1] * 0.4, -0.01 * k); head.add(b); }
  root.userData.face = fm; root.userData.headMesh = hd; root.userData.HS = HS;
  return root; }
// corona del rey: aro de oro con puntas, gemas y terciopelo dentro
function crown(k = 1) { const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xffc84a, roughness: 0.22, metalness: 1 }), gem = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.05, metalness: 0.2, emissive: c, emissiveIntensity: 0.35 });
  const band = pm(new THREE.CylinderGeometry(0.1 * k, 0.095 * k, 0.05 * k, 40, 1, true), gold); band.material.side = THREE.DoubleSide; g.add(band);
  const vel = pm(new THREE.SphereGeometry(0.093 * k, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), matOf(0x7a0f22, 0.7)); vel.position.y = 0.0; vel.scale.y = 0.75; g.add(vel);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, sp = pm(new THREE.ConeGeometry(0.018 * k, 0.07 * k, 10), gold); sp.position.set(Math.sin(a) * 0.1 * k, 0.055 * k, Math.cos(a) * 0.1 * k); g.add(sp);
    const ball = pm(new THREE.SphereGeometry(0.011 * k, 10, 8), gold); ball.position.set(Math.sin(a) * 0.1 * k, 0.095 * k, Math.cos(a) * 0.1 * k); g.add(ball);
    const gm = pm(new THREE.SphereGeometry(0.011 * k, 12, 8), gem(i % 2 ? 0xd0102a : 0x1060d0)); gm.position.set(Math.sin(a + 0.39) * 0.101 * k, 0.0, Math.cos(a + 0.39) * 0.101 * k); g.add(gm); }
  return g; }

// ---- poses y gestos (todo por ángulos de las articulaciones; t en segundos)
const _P = { blink: 0 };
function blinkAt(t, ph) { const u = (t + ph) % 3.7; return u < 0.12 ? Math.sin(u / 0.12 * Math.PI) : 0; }
function talkAt(t, ph, k = 1) { const s = Math.sin(t * 15 + ph) * 0.5 + 0.5, s2 = Math.sin(t * 9.3 + ph * 2) * 0.5 + 0.5; return k * Math.max(0, s * s2 * 1.3 - 0.15); }
// postura base: de pie, quieto, respirando; mirada a un punto (cabeza y ojos)
function poseReset(p) { const J = p.userData.J; for (const n in J) { const j = J[n]; j.rotation.set(0, 0, 0); } J.pelvis.position.y = p.userData.base.pelY;
  J.shL.rotation.z = -0.06; J.shR.rotation.z = 0.06; J.elL.rotation.x = -0.12; J.elR.rotation.x = -0.12; }
function faceAt(p, t, o = {}) { const U = p.userData.face.userData.U, ph = p.userData.phase; U.blink.value = o.blink ?? blinkAt(t, ph); U.open.value = o.open ?? (o.talk ? talkAt(t, ph, o.talk) : 0); U.smile.value = o.smile ?? 0.35;
  U.gaze.value.set(o.gx ?? Math.sin(t * 0.37 + ph) * 0.25, o.gy ?? 0); U.brow.value = o.brow ?? 0; U.browTilt.value = o.tilt ?? 0; }
function breathe(p, t) { const J = p.userData.J, ph = p.userData.phase; J.chest.rotation.x = Math.sin(t * 1.6 + ph) * 0.015; J.head.rotation.y = Math.sin(t * 0.31 + ph) * 0.12; J.head.rotation.x = Math.sin(t * 0.23 + ph * 1.3) * 0.04; }
// sentado en una silla (altura del asiento ≈ 0,46): caderas a 90°, rodillas a 90°
function poseSit(p, lean = 0.08) { const J = p.userData.J, k = p.userData.k; J.pelvis.position.y = 0.47 * k; J.hpL.rotation.x = J.hpR.rotation.x = -Math.PI / 2 + 0.05; J.knL.rotation.x = J.knR.rotation.x = Math.PI / 2 - 0.05; J.spine.rotation.x = lean; J.hpL.rotation.z = -0.05; J.hpR.rotation.z = 0.05; }
// andar: piernas y brazos en vaivén (fase en metros recorridos)
function poseWalk(p, s, amp = 1) { const J = p.userData.J, k = p.userData.k, a = Math.sin(s * 2.6) * 0.42 * amp, b = Math.max(0, -Math.sin(s * 2.6 - 0.6)) * 0.7 * amp, b2 = Math.max(0, Math.sin(s * 2.6 - 0.6 + Math.PI)) * 0.7 * amp;
  J.hpL.rotation.x = a; J.hpR.rotation.x = -a; J.knL.rotation.x = b2; J.knR.rotation.x = b; J.shL.rotation.x = -a * 0.7; J.shR.rotation.x = a * 0.7; J.elL.rotation.x = -0.25; J.elR.rotation.x = -0.25;
  J.pelvis.position.y = p.userData.base.pelY + Math.abs(Math.sin(s * 2.6)) * 0.02 * k; J.chest.rotation.y = a * 0.12; }
// llevar la mano a la boca (comer con palillos, morder un pastel): k = 0 abajo … 1 en la boca
function poseEat(p, side, k) { const J = p.userData.J, sh = J['sh' + side], el = J['el' + side], s = side === 'L' ? -1 : 1; sh.rotation.x = -0.35 - 0.55 * k; sh.rotation.z = s * (0.15 + 0.15 * k); el.rotation.x = -1.2 - 1.05 * k; el.rotation.y = -s * 0.4 * k; }
// saludar con la mano (los que ven la cámara)
function poseWave(p, side, t, k = 1) { const J = p.userData.J, sh = J['sh' + side], el = J['el' + side], s = side === 'L' ? -1 : 1; sh.rotation.z = s * (0.08 + 2.5 * k); sh.rotation.x = -0.2 * k; el.rotation.x = 0; el.rotation.z = s * (0.35 + 0.35 * Math.sin(t * 9)) * k; }
// brazos sobre una mesa o mostrador (trabajar): manos delante a la altura del pecho
function poseWork(p, t, amp = 1) { const J = p.userData.J, ph = p.userData.phase; for (const [n, s] of [['L', -1], ['R', 1]]) { J['sh' + n].rotation.x = -0.75 + Math.sin(t * 4 + ph + s) * 0.08 * amp; J['sh' + n].rotation.z = s * 0.18; J['el' + n].rotation.x = -1.0 + Math.sin(t * 6 + ph + s * 2) * 0.12 * amp; J['el' + n].rotation.y = s * 0.35; } J.spine.rotation.x = 0.12; J.head.rotation.x = 0.25; }
function lookAtP(p, target, k = 1) { const J = p.userData.J; p.updateMatrixWorld(true); const lp = J.neck.worldToLocal(target.clone()); const yaw = Math.atan2(lp.x, lp.z), pitch = -Math.atan2(lp.y - 0.1, Math.hypot(lp.x, lp.z));
  J.head.rotation.y = clamp(yaw, -1.0, 1.0) * k; J.head.rotation.x = clamp(pitch, -0.5, 0.5) * k; }

// brazo con cinemática inversa de dos huesos: lleva la mano (muñeca) a un punto del mundo; el codo se dobla hacia abajo y atrás
const _q1 = new THREE.Quaternion(), _q2b = new THREE.Quaternion(), _yA = new THREE.Vector3(0, -1, 0), _yU = new THREE.Vector3(0, 1, 0);
function reachTo(p, side, target, k = 1, pole = new THREE.Vector3(0, -1, -0.4)) { if (k <= 0.001) return; const J = p.userData.J, sh = J['sh' + side], el = J['el' + side], kk = p.userData.k;
  p.updateMatrixWorld(true); const d = J.chest.worldToLocal(target.clone()).sub(sh.position), L1 = 0.27 * kk, L2 = 0.28 * kk; let D = d.length(); if (D < 1e-4) return;
  D = Math.min(D, (L1 + L2) * 0.995); const dir = d.clone().normalize(), cosA = clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1), A = Math.acos(cosA);
  const n = new THREE.Vector3().crossVectors(dir, pole).normalize(); if (n.lengthSq() < 1e-6) n.set(1, 0, 0); const u = dir.clone().applyAxisAngle(n, A);
  _q1.setFromUnitVectors(_yA, u); const t1 = d.clone().applyQuaternion(_q1.clone().invert()); const psi = Math.atan2(t1.x, t1.z); _q2b.setFromAxisAngle(_yU, psi);
  const qs = _q1.clone().multiply(_q2b), cosE = clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1), bend = Math.PI - Math.acos(cosE);
  if (k >= 0.999) { sh.quaternion.copy(qs); el.rotation.set(-bend, 0, 0); } else { sh.quaternion.slerp(qs, k); el.rotation.x = lerp(el.rotation.x, -bend, k); el.rotation.y *= 1 - k; el.rotation.z *= 1 - k; } }
// ---------------------------------------------------------------- LOS COCHES (más realistas; el morro está en −x local): carrocería de una pieza «tejida» a lo largo del coche (paragolpes, capó, parabrisas,
// techo, luneta y maletero, laterales con caída hacia el techo), lunas tintadas, pilares, faros, pilotos, retrovisores, matrícula y ruedas con llanta.
const CARTYPES = {
  sedan: { L: 4.45, W: 1.82, bot: 0.3, top: [[0, 0.6], [0.04, 0.78], [0.3, 0.9], [0.34, 0.93], [0.47, 1.43], [0.76, 1.45], [0.88, 1.1], [0.92, 1.02], [1, 0.86]], belt: 0.98, ws: [0.335, 0.47], rw: [0.77, 0.89], side: [0.37, 0.8], pillarB: 0.6 },
  hatch: { L: 4.0, W: 1.76, bot: 0.3, top: [[0, 0.6], [0.04, 0.78], [0.27, 0.9], [0.31, 0.94], [0.46, 1.46], [0.83, 1.46], [0.97, 1.08], [1, 0.9]], belt: 0.99, ws: [0.31, 0.46], rw: [0.84, 0.965], side: [0.35, 0.86], pillarB: 0.62 },
  suv:   { L: 4.6, W: 1.9, bot: 0.42, top: [[0, 0.72], [0.04, 0.95], [0.26, 1.06], [0.3, 1.1], [0.42, 1.68], [0.86, 1.7], [0.97, 1.3], [1, 1.05]], belt: 1.16, ws: [0.3, 0.42], rw: [0.87, 0.965], side: [0.33, 0.88], pillarB: 0.6 },
};
function carGeo(T0, paint) { const nu = 64, nv = 40, pos = [], col = [], idx = [], L = T0.L, Wd = T0.W, glass = new THREE.Color(0x0f141a), trim = new THREE.Color(0x1a1c1f), pc = new THREE.Color(paint);
  const topAt = u => { const P = T0.top; for (let i = 1; i < P.length; i++) if (u <= P[i][0]) { const a = P[i - 1], b = P[i], k = (u - a[0]) / (b[0] - a[0]), s = k * k * (3 - 2 * k); return a[1] + (b[1] - a[1]) * (0.5 * k + 0.5 * s); } return P[P.length - 1][1]; };
  for (let i = 0; i <= nu; i++) { const u = i / nu, x = (u - 0.5) * L, yt = topAt(u), yb = T0.bot + (u < 0.04 || u > 0.96 ? 0.08 : 0), endK = Math.sin(Math.min(1, Math.min(u, 1 - u) * 14) * Math.PI / 2);   // los extremos se cierran
    for (let j = 0; j <= nv; j++) { const v = j / nv, a = v * Math.PI * 2;
      // sección: rectángulo redondeado (abajo ancho, arriba más estrecho por la caída del techo)
      const cy = (yt + yb) / 2, hy = (yt - yb) / 2, ca = Math.cos(a), sa = Math.sin(a), sq = (q, p) => Math.sign(q) * Math.pow(Math.abs(q), p);
      let y = cy + hy * sq(sa, 0.35), wHalf = Wd / 2 * (y > T0.belt ? 1 - 0.2 * Math.min(1, (y - T0.belt) / 0.5) : 1) * (0.86 + 0.14 * endK);
      let z = wHalf * sq(ca, 0.3); pos.push(x, y, z);
      // color: luna (parabrisas, laterales, luneta) o pintura; pilares y faldón oscuros
      let c = pc; const up = y > T0.belt + 0.03, onSide = Math.abs(ca) > 0.55, onTop = sa > 0.8;
      if (up && !onTop) { const inWS = u > T0.ws[0] && u < T0.ws[1], inRW = u > T0.rw[0] && u < T0.rw[1], inSide = onSide && u > T0.side[0] && u < T0.side[1] && Math.abs(u - T0.pillarB) > 0.012; if ((inWS || inRW) && !onSide || inSide) c = glass; }
      if (y < yb + 0.12 && sa < -0.3) c = trim; col.push(c.r, c.g, c.b); } }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
let _wheelG = null;
function wheel() { const g = new THREE.Group(); if (!_wheelG) { const tire = new THREE.TorusGeometry(0.25, 0.095, 14, 32), rim = new THREE.CylinderGeometry(0.2, 0.2, 0.17, 28); rim.rotateX(Math.PI / 2); _wheelG = { tire, rim }; }
  const t = new THREE.Mesh(_wheelG.tire, CARM.tire); t.castShadow = true; g.add(t); const r = new THREE.Mesh(_wheelG.rim, CARM.rim); g.add(r);
  for (let i = 0; i < 5; i++) { const s = box(0.05, 0.18, 0.04, CARM.rimD, 0, 0, 0.07); s.rotation.z = i / 5 * Math.PI * 2; s.position.set(Math.sin(i / 5 * Math.PI * 2) * 0.09, Math.cos(i / 5 * Math.PI * 2) * 0.09, 0.07); g.add(s); }
  ad(g, cyl(0.045, 0.045, 0.19, CARM.rimD, 12)).rotation.x = Math.PI / 2; return g; }
const CARM = {};
function car(type = 'sedan', paint = 0xb0141e, seed = 1) {
  if (!CARM.tire) { CARM.tire = stdM(0x151515, 0.9); CARM.rim = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.25, metalness: 1 }); CARM.rimD = new THREE.MeshStandardMaterial({ color: 0x7c8288, roughness: 0.3, metalness: 1 });
    CARM.head = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 0.6, roughness: 0.1 }); CARM.tail = new THREE.MeshStandardMaterial({ color: 0x8a0a10, emissive: 0xff2020, emissiveIntensity: 0.5, roughness: 0.2 });
    CARM.bump = stdM(0x222428, 0.55); CARM.well = new THREE.MeshBasicMaterial({ color: 0x050505 }); CARM.chrome = new THREE.MeshStandardMaterial({ color: 0xe0e4e8, roughness: 0.15, metalness: 1 }); }
  const T0 = CARTYPES[type], g = new THREE.Group(), body = new THREE.Mesh(carGeo(T0, paint), new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.06 }));
  body.castShadow = body.receiveShadow = true; g.add(body); const L = T0.L, Wd = T0.W;
  // pasos de rueda (oscuros) y ruedas
  g.userData.wheels = []; for (const sx of [-1, 1]) for (const fz of [-1, 1]) { const x = fz * L * 0.33, z = sx * (Wd / 2 - 0.13); const well = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24, 0, Math.PI), CARM.well); well.position.set(x, T0.bot + 0.0, sx * (Wd / 2 + 0.002)); if (sx < 0) well.rotation.y = Math.PI; g.add(well);
    const w = wheel(); w.position.set(x, 0.35, z); if (sx < 0) w.rotation.y = Math.PI; w.userData.flip = sx < 0 ? -1 : 1; g.add(w); g.userData.wheels.push(w); }
  // faros, pilotos, paragolpes, retrovisores, manillas, matrículas
  for (const s of [-1, 1]) { const hl = rboxM(0.06, 0.12, 0.34, 0.03, CARM.head, 2); hl.position.set(-L / 2 + 0.1, T0.top[1][1] - 0.06, s * (Wd / 2 - 0.3)); g.add(hl); const tl = rboxM(0.05, 0.12, 0.36, 0.03, CARM.tail, 2); tl.position.set(L / 2 - 0.08, T0.top[T0.top.length - 1][1] - 0.05, s * (Wd / 2 - 0.28)); g.add(tl);
    const mir = rboxM(0.12, 0.09, 0.16, 0.03, body.material, 2); mir.position.set(L * (T0.ws[0] - 0.5) + 0.25, T0.belt + 0.06, s * (Wd / 2 + 0.03)); g.add(mir);
    for (const u of [0.42, 0.66]) { const hd = box(0.16, 0.025, 0.02, CARM.chrome, L * (u - 0.5), T0.belt - 0.12, s * (Wd / 2 - 0.005)); g.add(hd); } }
  for (const fz of [-1, 1]) { const b = rboxM(0.2, 0.22, Wd - 0.06, 0.08, CARM.bump, 2); b.position.set(fz * (L / 2 - 0.06), T0.bot + 0.12, 0); g.add(b);
    const pl = signPlane(0.52, 0.12, 256, (c, w, h) => { c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d4fa8'; c.fillRect(0, 0, 26, h); c.fillStyle = '#111'; c.font = '700 40px DejaVuMono'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('KW ' + String(1000 + seed * 37 % 9000), w / 2 + 12, h / 2 + 2); });
    pl.position.set(fz * (L / 2 + 0.05), T0.bot + 0.16, 0); pl.rotation.y = fz * Math.PI / 2; g.add(pl); }
  g.userData.L = L; return g; }
// avanza un coche por su carril (s = metros recorridos): gira las ruedas
function carRoll(c, s) { for (const w of c.userData.wheels) w.rotation.z = -w.userData.flip * s / 0.35; }
// ---------------------------------------------------------------- LAS TRES TIENDAS que pidieron los seguidores (fachada de verdad + interior visto por los cristales)
//   sushi de @lydiaa.rc (madera oscura, farolillos rojos, barra con el cocinero y todas las mesas llenas) ·
//   pastelería de @salvadormatthias34 (toldo rosa, escaparate de tartas, mostrador y la cola que llega a la esquina) ·
//   consultorio veterinario de @zamii.luu (cruz verde, sala de espera con mascotas y la camilla con el perro que no se deja vacunar).
// Cada edificio se arma en su marco local (fachada en z = 0 mirando a +z, interior hacia −z) y se gira para mirar a la plaza (−x).
const SHOP = { X: 25, W: 8, D: 7, H0: 4.2 };
function shopFrame(G, zc, o) {
  const g = new THREE.Group(); g.position.set(SHOP.X, 0, zc); g.rotation.y = -Math.PI / 2; G.add(g); const U = g.userData; U.zc = zc;
  const W2 = SHOP.W / 2, H0 = SHOP.H0, D = SHOP.D, H = H0 + 2 * 3.3 + 0.6;
  // pisos de arriba: ladrillo o revoco, ventanas con marco blanco, alféizar y alguna maceta
  const wallM = o.wall; const up = box(SHOP.W, H - H0, 0.4, wallM, 0, H0 + (H - H0) / 2, -0.2); up.material = wallM; g.add(up);
  for (let f = 0; f < 2; f++) for (let i = -1; i <= 1; i++) { const y = H0 + 0.9 + f * 3.3, x = i * 2.5; g.add(box(1.25, 1.75, 0.12, T.frame, x, y + 0.85, 0.02)); const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.58), T.glassDark); gl.position.set(x, y + 0.85, 0.09); g.add(gl);
    g.add(box(0.06, 1.58, 0.05, stdM(0xf3f1ec, 0.6), x, y + 0.85, 0.1)); g.add(box(1.45, 0.1, 0.3, stdM(0xe9e4da, 0.6), x, y - 0.05, 0.12)); g.add(box(1.4, 0.12, 0.1, stdM(0xf3f1ec, 0.6), x, y + 1.78, 0.06));
    if ((f + i + o.seed) % 3 === 0) { const pot = box(1.2, 0.22, 0.25, stdM(0x9a5a3a, 0.8), x, y + 0.08, 0.28); g.add(pot); for (let j = 0; j < 5; j++) { const fl = sph(0.09, stdM([0xe8456b, 0xf2c94c, 0xf08ad0, 0xffffff][j % 4], 0.7), 8, 6); fl.position.set(x - 0.45 + j * 0.22, y + 0.28, 0.3); g.add(fl); } } }
  g.add(box(SHOP.W + 0.3, 0.35, 0.6, stdM(0xe6e0d4, 0.6), 0, H - 0.18, 0.1)); g.add(box(SHOP.W, 0.12, 0.45, stdM(0xe6e0d4, 0.6), 0, H0 + 0.05, 0.05));
  // planta baja: zócalo, pilastras, escaparate (vidrio con montantes), puerta de cristal y la banda del rótulo
  g.add(box(SHOP.W, 0.45, 0.3, stdM(0x6f6a64, 0.7), 0, 0.225, 0.05)); for (const s of [-1, 1]) g.add(box(0.45, H0, 0.4, o.pil ?? wallM, s * (W2 - 0.225), H0 / 2, -0.05));
  const fr = o.frame ?? T.frame, x0 = -W2 + 0.45, x1 = W2 - 0.45, dX = x1 - 0.7;                                // puerta a la derecha (vista desde la calle)
  const glassW = (dX - 0.7) - x0; const gl = new THREE.Mesh(new THREE.PlaneGeometry(glassW, 2.85), T.glass); gl.position.set(x0 + glassW / 2, 0.45 + 1.425, 0.0); g.add(gl); U.glass = gl;
  for (const x of [x0, x0 + glassW / 3, x0 + glassW * 2 / 3, dX - 0.7, dX + 0.7]) g.add(box(0.07, 2.95, 0.12, fr, x, 0.45 + 1.45, 0.02));
  g.add(box(x1 - x0, 0.08, 0.12, fr, 0, 3.32, 0.02)); g.add(box(glassW, 0.08, 0.12, fr, x0 + glassW / 2, 0.47, 0.02));
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 2.85), T.glass); door.position.set(dX, 0.0 + 1.425 + 0.02, 0.0); g.add(door); g.add(box(0.04, 0.5, 0.04, T.gold, dX - 0.5, 1.2, 0.07));
  const top = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 0.75), T.glass); top.position.set(0, 3.32 + 0.4, 0.0); g.add(top);
  const sign = signPlane(SHOP.W - 0.9, 0.62, 1024, o.sign, { r: 0.45, glow: o.signGlow ?? 0.35 }); sign.position.set(0, H0 - 0.38 + 0.0, 0.26); g.add(sign); g.add(box(SHOP.W - 0.7, 0.75, 0.2, o.fascia ?? stdM(0x2a2a2a, 0.5), 0, H0 - 0.38, 0.13));
  // cartel de la puerta (ABIERTO / COMPLETO)
  U.doorSign = [0, 1].map(k => { const p = signPlane(0.42, 0.2, 256, (c, w, h) => { c.fillStyle = k ? '#c62828' : '#2e7d32'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 64px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(k ? 'COMPLETO' : 'ABIERTO', w / 2, h / 2 + 3); }, { glow: 0.4 }); p.position.set(dX, 1.75, 0.03); p.visible = !k; g.add(p); return p; });
  // interior: suelo, paredes, techo con lámparas (todo se ve por el escaparate)
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(SHOP.W - 0.1, D), o.floor); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.012, -D / 2); fl.receiveShadow = true; g.add(fl);
  g.add(box(SHOP.W, H0, 0.15, o.inWall, 0, H0 / 2, -D)); for (const s of [-1, 1]) g.add(box(0.15, H0, D, o.inWall, s * (W2 - 0.08), H0 / 2, -D / 2));
  const ce = new THREE.Mesh(new THREE.PlaneGeometry(SHOP.W, D), stdM(0xd8d2c8, 0.9)); ce.rotation.x = Math.PI / 2; ce.position.set(0, H0 - 0.25, -D / 2); g.add(ce);
  g.add(box(SHOP.W, 0.3, D + 0.4, stdM(0x8c8780, 0.8), 0, H0 - 0.1, -D / 2));
  U.lamps = []; for (const x of [-2.4, 0, 2.4]) for (const z of [-1.8, -4.6]) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), T.lampGlow); l.rotation.x = Math.PI / 2; l.position.set(x, H0 - 0.26, z); g.add(l); U.lamps.push(l); }
  U.local = (x, y, z) => g.localToWorld(_v(x, y, z)); U.g = g; U.dX = dX;
  return g; }
// ---- muebles y comida
function stool(m) { const g = new THREE.Group(); ad(g, cyl(0.18, 0.18, 0.06, m, 20)).position.y = 0.72; ad(g, cyl(0.025, 0.025, 0.7, T.iron, 8)).position.y = 0.36; ad(g, cyl(0.2, 0.22, 0.03, T.iron, 20)).position.y = 0.015; return g; }
function chairS(m) { const g = new THREE.Group(); g.add(box(0.44, 0.05, 0.44, m, 0, 0.46, 0)); g.add(box(0.44, 0.48, 0.05, m, 0, 0.72, -0.2)); for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) g.add(box(0.04, 0.46, 0.04, m, x, 0.23, z)); return g; }
function table(w, d, m) { const g = new THREE.Group(); g.add(box(w, 0.05, d, m, 0, 0.75, 0)); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(0.05, 0.73, 0.05, T.iron, x * (w / 2 - 0.06), 0.365, z * (d / 2 - 0.06))); return g; }
function sushiPlate() { const g = new THREE.Group(); ad(g, cyl(0.13, 0.12, 0.015, stdM(0x1b1b1b, 0.3), 24)).position.y = 0.008;
  for (let i = 0; i < 4; i++) { const r = rboxM(0.05, 0.03, 0.026, 0.008, stdM(0xf5f2ea, 0.8), 1); r.position.set(-0.06 + i * 0.04, 0.03, 0); g.add(r); const f = rboxM(0.055, 0.012, 0.03, 0.005, stdM(i % 2 ? 0xf27f45 : 0xd8313b, 0.4), 1); f.position.set(-0.06 + i * 0.04, 0.05, 0); g.add(f); }
  return g; }
function cake(r, h, cBody, cTop, seed = 1) { const g = new THREE.Group(), R = rng(seed); ad(g, cyl(r, r, h, stdM(cBody, 0.7), 32)).position.y = h / 2; ad(g, cyl(r * 1.01, r * 1.01, h * 0.12, stdM(cTop, 0.5), 32)).position.y = h * 0.95;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, b = sph(r * 0.12, stdM(R() > 0.5 ? 0xd8233a : 0xf7f3ea, 0.4), 10, 8); b.position.set(Math.cos(a) * r * 0.75, h + r * 0.05, Math.sin(a) * r * 0.75); g.add(b); } return g; }
function tieredCake() { const g = new THREE.Group(); let y = 0; [[0.24, 0.18, 0xf7e9e9, 0xf2b8c6], [0.18, 0.16, 0xf7e9e9, 0xf2b8c6], [0.12, 0.14, 0xf7e9e9, 0xf2b8c6]].forEach(([r, h, a, b], i) => { const c = cake(r, h, a, b, i + 3); c.position.y = y; g.add(c); y += h; }); return g; }
// ---- el perro del veterinario (cuerpo, cabeza con hocico, orejas caídas, patas articuladas y cola)
function dog(col = 0xc98a4b) { const g = new THREE.Group(), m = stdM(col, 0.85), md = stdM(new THREE.Color(col).multiplyScalar(0.7).getHex(), 0.85), J = {}; g.userData.J = J;
  const body = new THREE.Group(); body.position.y = 0.36; g.add(body); J.body = body; const tr = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.36, 8, 16), m); tr.rotation.x = Math.PI / 2; tr.castShadow = true; body.add(tr);
  const hd = new THREE.Group(); hd.position.set(0, 0.12, 0.27); body.add(hd); J.head = hd; hd.add(sph(0.11, m, 20, 14)); const sn = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.08, 6, 12), md); sn.rotation.x = Math.PI / 2; sn.position.set(0, -0.03, 0.12); hd.add(sn);
  ad(hd, sph(0.026, stdM(0x111111, 0.2), 10, 8)).position.set(0, -0.01, 0.2); for (const s of [-1, 1]) { const e = sph(0.017, stdM(0x111111, 0.1), 10, 8); e.position.set(s * 0.045, 0.035, 0.09); hd.add(e); const hl = sph(0.005, stdM(0xffffff, 0.1, { emissive: 0xffffff, emissiveIntensity: 0.6 }), 6, 4); hl.position.set(s * 0.04, 0.043, 0.105); hd.add(hl);
    const ear = new THREE.Group(); ear.position.set(s * 0.085, 0.06, -0.01); hd.add(ear); J['ear' + (s < 0 ? 'L' : 'R')] = ear; const em = sph(1, md, 12, 8); em.scale.set(0.025, 0.08, 0.05); em.position.y = -0.06; ear.add(em); ear.rotation.z = s * 0.25; }
  for (const [n, x, z] of [['FL', -0.08, 0.17], ['FR', 0.08, 0.17], ['BL', -0.08, -0.17], ['BR', 0.08, -0.17]]) { const l = new THREE.Group(); l.position.set(x, -0.04, z); body.add(l); J[n] = l; const lg = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.22, 6, 10), m); lg.position.y = -0.15; lg.castShadow = true; l.add(lg); const paw = sph(0.042, md, 10, 8); paw.position.set(0, -0.3, 0.015); l.add(paw); }
  const tail = new THREE.Group(); tail.position.set(0, 0.06, -0.3); body.add(tail); J.tail = tail; const tl = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.2, 6, 10), m); tl.position.y = 0.11; tail.add(tl); tail.rotation.x = -0.6;
  shadowAll(g); return g; }
function buildShops(G) {
  const [bc, bh] = brickCanvases([150, 70, 50], 3), [b2c, b2h] = brickCanvases([176, 120, 86], 5), brickA = texMat(bc, bh, [2, 1.6], { r: 0.85, ns: 1.2 }), brickB = texMat(b2c, b2h, [2, 1.6], { r: 0.85, ns: 1.2 });
  const [sc1, sh1] = stuccoCanvases([238, 206, 214], 41), pinkSt = texMat(sc1, sh1, [3, 3], { r: 0.8, ns: 0.4 }); const [sc2, sh2] = stuccoCanvases([226, 236, 232], 43), mintSt = texMat(sc2, sh2, [3, 3], { r: 0.8, ns: 0.4 });
  const [wc, wh] = woodCanvases([150, 108, 70], 11), woodF = texMat(wc, wh, [2, 2], { r: 0.6, ns: 0.5 }); const [w2c, w2h] = woodCanvases([196, 160, 118], 12), woodL = texMat(w2c, w2h, [2, 2], { r: 0.55, ns: 0.5 });
  const [tc, th] = tileCanvases([232, 230, 226], 23, 512, 6, 6, 3), tileW = texMat(tc, th, [3, 3], { r: 0.4, ns: 0.4 });
  const SH = {};
  // --- SUSHI (norte)
  SH.sushi = shopFrame(G, -8.5, { seed: 1, wall: brickA, floor: woodF, inWall: stdM(0xe9dfcc, 0.9), fascia: stdM(0x2b1d14, 0.5), frame: stdM(0x2b1d14, 0.5), pil: stdM(0x2b1d14, 0.6),
    sign: (c, w, h) => { c.fillStyle = '#20150e'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8102e'; c.beginPath(); c.arc(70, h / 2, 34, 0, 7); c.fill(); c.fillStyle = '#f5efe2'; c.font = '900 52px Inter'; c.textBaseline = 'middle'; c.fillText('SUSHI', 125, h / 2 - 12); c.font = '700 26px Inter'; c.fillStyle = '#e8b04a'; c.fillText('de @lydiaa.rc', 128, h / 2 + 24);
      c.textAlign = 'right'; c.font = '700 30px Inter'; c.fillStyle = '#f5efe2'; c.fillText('寿司 · RESTAURANTE', w - 40, h / 2 + 4); } });
  { const g = SH.sushi, U = g.userData; U.lanterns = []; for (const x of [-3.3, 3.3]) { const l = new THREE.Group(); l.position.set(x, 3.0, 0.45); g.add(l); const b = sph(0.22, new THREE.MeshStandardMaterial({ color: 0xd8232a, emissive: 0xff3a2a, emissiveIntensity: 0.9, roughness: 0.6 }), 16, 12); b.scale.y = 1.25; l.add(b); ad(l, cyl(0.12, 0.12, 0.05, stdM(0x111111, 0.5), 12)).position.y = 0.3; ad(l, cyl(0.12, 0.12, 0.05, stdM(0x111111, 0.5), 12)).position.y = -0.3; U.lanterns.push(l); }
    // barra al fondo con el cocinero, mesas junto al escaparate (todas llenas)
    const bar0 = box(5.6, 1.05, 0.7, woodL, -0.6, 0.525, -5.6); g.add(bar0); g.add(box(5.8, 0.06, 0.85, stdM(0xd8c3a0, 0.4), -0.6, 1.08, -5.55)); for (let i = 0; i < 5; i++) { const st = stool(stdM(0x2b1d14, 0.6)); st.position.set(-2.8 + i * 1.1, 0, -4.9); g.add(st); }
    for (let i = 0; i < 4; i++) { const p = sushiPlate(); p.position.set(-2.8 + i * 1.3, 1.11, -5.4); g.add(p); }
    const shelf = box(5.6, 0.05, 0.3, woodL, -0.6, 2.1, -6.85); g.add(shelf); for (let i = 0; i < 8; i++) ad(g, cyl(0.05, 0.05, 0.25, stdM([0x2d6b3c, 0x8a1c1c, 0xe8e2d0][i % 3], 0.3), 12)).position.set(-3.2 + i * 0.7, 2.25, -6.85);
    const art = signPlane(2.2, 1.2, 512, (c, w, h) => { c.fillStyle = '#efe6d2'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a4f7a'; c.lineWidth = 10; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(w * 0.2 + i * 70, h * 0.75, 60 + i * 6, Math.PI, Math.PI * 1.9); c.stroke(); } c.fillStyle = '#c8102e'; c.beginPath(); c.arc(w * 0.78, h * 0.3, 40, 0, 7); c.fill(); }); art.position.set(1.8, 2.9, -6.9); g.add(art);
    U.tables = [[-2.6, -1.4], [-0.2, -1.4], [-2.6, -3.0], [-0.2, -3.0]].map(([x, z]) => { const t = table(1.0, 0.8, woodL); t.position.set(x, 0, z); g.add(t); for (const s of [-1, 1]) { const p = sushiPlate(); p.position.set(x + s * 0.22, 0.78, z); g.add(p); const ch = chairS(stdM(0x2b1d14, 0.6)); ch.position.set(x + s * 0.75, 0, z); ch.rotation.y = -s * Math.PI / 2; g.add(ch); } return [x, z]; });
    for (const [x, z] of [[2.9, -0.8], [-3.5, -6.2]]) { const pot = cyl(0.2, 0.16, 0.4, stdM(0x2b2b2b, 0.6), 16); pot.position.set(x, 0.2, z); g.add(pot); for (let i = 0; i < 6; i++) { const b = cyl(0.015, 0.015, 1.6 + i * 0.1, stdM(0x6f9a3c, 0.6), 6); b.position.set(x + Math.cos(i) * 0.08, 1.0, z + Math.sin(i) * 0.08); b.rotation.z = (i - 3) * 0.05; g.add(b); } }
    // cortina «noren» de la puerta
    for (let i = 0; i < 3; i++) { const n = signPlane(0.42, 0.7, 128, (c, w, h) => { c.fillStyle = '#1f3a5f'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2ece0'; c.font = '700 60px serif'; c.textAlign = 'center'; c.fillText(['寿', '司', '屋'][i], w / 2, h * 0.6); }, { r: 0.8 }); n.position.set(U.dX - 0.45 + i * 0.45, 2.95, 0.06); n.material.side = THREE.DoubleSide; g.add(n); }
    shadowAll(g, true, true); }
  // --- PASTELERÍA (centro): toldo de rayas rosa, escaparate de tartas y mostrador
  SH.pastry = shopFrame(G, -0.5, { seed: 2, wall: pinkSt, floor: woodF, inWall: stdM(0xd9a3b5, 0.9), fascia: stdM(0xf2c6d3, 0.5), frame: stdM(0xf7f3ef, 0.5), pil: stdM(0xf2dce4, 0.6),
    sign: (c, w, h) => { c.fillStyle = '#f7d6e0'; c.fillRect(0, 0, w, h); c.fillStyle = '#8a2f4f'; c.font = 'italic 900 64px Inter'; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText('Pastelería', w / 2 - 120, h / 2 - 2); c.font = '700 28px Inter'; c.fillStyle = '#b34a70'; c.fillText('de @salvadormatthias34', w / 2 + 250, h / 2 + 6); } });
  { const g = SH.pastry, U = g.userData; // toldo de rayas inclinado
    const aw = signTex(1024, 256, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#e86f98'; c.fillRect(i * w / 16, 0, w / 16, h); } c.fillStyle = 'rgba(0,0,0,.1)'; c.fillRect(0, h - 26, w, 26); });
    const awn = new THREE.Mesh(new THREE.PlaneGeometry(SHOP.W - 0.6, 1.4, 1, 6), new THREE.MeshStandardMaterial({ map: aw, side: THREE.DoubleSide, roughness: 0.85 })); awn.position.set(0, 3.15, 0.65); awn.rotation.x = -1.05; awn.castShadow = true; g.add(awn);
    for (let i = 0; i < 16; i++) { const v = new THREE.Mesh(new THREE.CircleGeometry(0.235, 12, 0, Math.PI), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xffffff : 0xe86f98, side: THREE.DoubleSide, roughness: 0.85 })); v.rotation.z = Math.PI; v.position.set(-3.45 + i * 0.46, 2.82, 1.24); g.add(v); }
    // escaparate: gradas con tartas
    const disp = box(4.0, 0.7, 0.8, stdM(0x6b3f2c, 0.55), -1.55, 0.35, -0.55); g.add(disp); const disp2 = box(4.0, 0.35, 0.5, stdM(0x6b3f2c, 0.55), -1.55, 0.88, -0.75); g.add(disp2);
    const tc = tieredCake(); tc.position.set(-1.6, 0.7, -0.4); g.add(tc); for (const [x, c1, c2, z, y] of [[-3.1, 0x5a3424, 0x3b2116, -0.35, 0.7], [-0.3, 0xf3e3c3, 0xe8b64a, -0.35, 0.7], [-2.6, 0xf7e9e9, 0xd8233a, -0.75, 1.05], [-0.8, 0x6b3a26, 0xf2ece0, -0.75, 1.05]]) { const ck = cake(0.17, 0.15, c1, c2, Math.round(x * 10)); ck.position.set(x, y, z); g.add(ck); }
    // mostrador con vitrina y la caja registradora
    g.add(box(4.6, 1.0, 0.75, stdM(0x8a4f63, 0.5), 0.6, 0.5, -4.4)); const vit = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 0.6), T.glass); vit.position.set(0.6, 1.2, -4.4); g.add(vit);
    for (let i = 0; i < 6; i++) { const ck = cake(0.11, 0.09, [0xf7e9e9, 0x5a3424, 0xf3e3c3][i % 3], [0xd8233a, 0xf2ece0, 0xe8b64a][i % 3], 20 + i); ck.position.set(-1.2 + i * 0.7, 1.03, -4.4); g.add(ck); }
    g.add(box(0.36, 0.22, 0.32, stdM(0x2a2a2a, 0.4), 2.5, 1.11, -4.4)); const sh2 = box(5.6, 0.05, 0.35, woodL, 0.4, 2.0, -6.85); g.add(sh2); for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 4, 8), stdM(0xc68a3c, 0.6)); b.rotation.z = Math.PI / 2; b.position.set(-2.0 + i * 0.5, 2.1, -6.85); g.add(b); }
    shadowAll(g, true, true); }
  // --- VETERINARIO (sur): cruz verde, sala de espera, camilla de acero
  SH.vet = shopFrame(G, 7.5, { seed: 3, wall: brickB, floor: tileW, inWall: stdM(0xa9d3cb, 0.9), fascia: stdM(0x0f7a6c, 0.5), frame: stdM(0xf3f1ec, 0.5), pil: stdM(0xd9e6e2, 0.6),
    sign: (c, w, h) => { c.fillStyle = '#0f7a6c'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.fillRect(48, h / 2 - 12, 72, 24); c.fillRect(72, h / 2 - 36, 24, 72); c.font = '900 46px Inter'; c.textBaseline = 'middle'; c.fillText('VETERINARIO', 150, h / 2 - 12); c.font = '700 26px Inter'; c.fillStyle = '#bff3e8'; c.fillText('Consultorio de @zamii.luu', 152, h / 2 + 24);
      c.save(); c.translate(w - 90, h / 2); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 8, 20, 0, 7); c.fill(); for (const [x, y] of [[-22, -16], [-8, -26], [8, -26], [22, -16]]) { c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); } c.restore(); } });
  { const g = SH.vet, U = g.userData; const steel = new THREE.MeshStandardMaterial({ color: 0xd6dadd, roughness: 0.25, metalness: 0.9 });
    const tab = new THREE.Group(); tab.position.set(-1.2, 0, -2.6); g.add(tab); U.exam = tab; tab.add(box(1.3, 0.05, 0.7, steel, 0, 0.88, 0)); ad(tab, cyl(0.06, 0.06, 0.85, steel, 12)).position.y = 0.43; tab.add(box(0.7, 0.04, 0.5, steel, 0, 0.02, 0));
    for (let i = 0; i < 4; i++) { const c = chairS(stdM(0x0f7a6c, 0.5)); c.position.set(1.4 + (i % 2) * 0.6, 0, -1.2 - Math.floor(i / 2) * 1.6); c.rotation.y = -Math.PI / 2; g.add(c); }
    g.add(box(1.8, 1.05, 0.6, stdM(0xf3f1ec, 0.5), 2.3, 0.525, -5.6)); const poster = signPlane(1.4, 1.0, 512, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#0f7a6c'; c.font = '900 64px Inter'; c.fillText('VACUNAS', 40, 110); c.font = '600 34px Inter'; c.fillStyle = '#333'; ['Perros · Gatos', 'Revisiones', 'Chips'].forEach((s, i) => c.fillText(s, 44, 190 + i * 56)); }); poster.position.set(-1.2, 2.3, -6.9); g.add(poster);
    const carrier = box(0.5, 0.35, 0.35, stdM(0x9ac7e8, 0.5), 2.0, 0.65, -2.1); g.add(carrier);
    shadowAll(g, true, true); }
  return SH; }
// ---------------------------------------------------------------- EL AYUNTAMIENTO: fachada clásica con pórtico de columnas, escalinata, puerta abierta y banderas de Kiria World;
// dentro, el salón del trono: suelo de mármol, alfombra roja, columnas, ventanas altas con haces de sol, lámparas de araña, el estandarte, el trono
// sobre su tarima, la mesita con el pergamino de la ley y el sello de oro, dos guardias y los vecinos que miran.
const HALL = { X0: -13, X1: 13, ZF: -16, ZB: -34, H: 12, FL: 0.6 };
function wallWithHoles(w, h, holes, depth, mat) { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, h); s.lineTo(0, h); s.lineTo(0, 0);
  for (const [x, y, hw, hh, arch] of holes) { const p = new THREE.Path(); p.moveTo(x - hw, y); p.lineTo(x + hw, y); p.lineTo(x + hw, y + hh - (arch ? hw : 0)); if (arch) p.absarc(x, y + hh - hw, hw, 0, Math.PI, false); else p.lineTo(x - hw, y + hh); p.lineTo(x - hw, y); s.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 16 }); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m; }
function winGlass(hw, hh, arch, mat) { const s = new THREE.Shape(); s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, hh - (arch ? hw : 0)); if (arch) s.absarc(0, hh - hw, hw, 0, Math.PI, false); else s.lineTo(-hw, hh); s.lineTo(-hw, 0); return new THREE.Mesh(new THREE.ShapeGeometry(s, 16), mat); }
function columnC(hgt, r, m, cap) { const P = [[r * 1.35, 0], [r * 1.35, 0.18], [r * 1.12, 0.26], [r, 0.4], [r * 0.9, hgt - 0.5], [r * 1.05, hgt - 0.35], [r * 1.4, hgt - 0.15], [r * 1.4, hgt], [0, hgt]];
  const g = new THREE.Group(), sh = new THREE.Mesh(new THREE.LatheGeometry(P.map(q => new THREE.Vector2(q[0], q[1])), 28), m); sh.castShadow = sh.receiveShadow = true; g.add(sh); if (cap) { const c = box(r * 3, 0.16, r * 3, cap, 0, hgt + 0.08, 0); g.add(c); } return g; }
function flagMesh(w, h, draw) { const g = new THREE.PlaneGeometry(w, h, 24, 8); g.translate(w / 2, 0, 0); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: signTex(512, Math.round(512 * h / w), draw), side: THREE.DoubleSide, roughness: 0.8 })); m.castShadow = true; m.userData.p0 = g.attributes.position.array.slice(); return m; }
function flagWave(m, t) { const p = m.geometry.attributes.position, p0 = m.userData.p0; for (let i = 0; i < p.count; i++) { const x = p0[i * 3], y = p0[i * 3 + 1]; p.setZ(i, Math.sin(x * 2.2 - t * 4 + y * 0.6) * 0.12 * x); } p.needsUpdate = true; m.geometry.computeVertexNormals(); }
const KW_FLAG = (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5b2f93'); g.addColorStop(1, '#3d1f69'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#e8b64a'; c.fillRect(0, h * 0.42, w, h * 0.16);
  c.save(); c.translate(w * 0.5, h * 0.5); c.fillStyle = '#ffd36a'; c.beginPath(); const s = h * 0.32; c.moveTo(-s, s * 0.4); c.lineTo(-s, -s * 0.5); c.lineTo(-s * 0.5, 0); c.lineTo(0, -s * 0.7); c.lineTo(s * 0.5, 0); c.lineTo(s, -s * 0.5); c.lineTo(s, s * 0.4); c.closePath(); c.fill(); c.restore(); };
function buildHall(G) {
  const H = HALL, g = new THREE.Group(), U = g.userData; G.add(g); S.hall = g;
  const [ic, ih] = stuccoCanvases([238, 226, 204], 33); const inner = texMat(ic, ih, [4, 3], { r: 0.85, ns: 0.4 });
  // fachada (z = ZF): puerta en arco, ventanas de planta baja en arco y ventanas altas
  const frontHoles = [[13, H.FL, 1.7, 5.4, true]]; for (const x of [13 - 5.2, 13 + 5.2, 13 - 9.6, 13 + 9.6]) frontHoles.push([x, 1.8, 0.8, 3.8, true]); for (const x of [13 - 3.4, 13 + 3.4, 13 - 6.9, 13 + 6.9, 13 - 10.4, 13 + 10.4]) frontHoles.push([x, 7.6, 0.7, 2.6, true]);
  const front = wallWithHoles(26, H.H, frontHoles, 0.5, T.stone); front.position.set(H.X0, 0, H.ZF - 0.5); g.add(front);
  const frontIn = wallWithHoles(26, H.H, frontHoles, 0.02, inner); frontIn.position.set(H.X0, 0, H.ZF - 0.53); g.add(frontIn);
  for (const [x, y, hw, hh, a] of frontHoles.slice(1)) { const gl = winGlass(hw, hh, a, T.glassDark); gl.position.set(H.X0 + x, y, H.ZF - 0.25); g.add(gl); const sill = box(hw * 2 + 0.3, 0.12, 0.35, T.stoneW, H.X0 + x, y - 0.06, H.ZF + 0.1); g.add(sill); }
  // laterales con ventanas altas (entra el sol de la mañana por el este) y fondo
  const sideHoles = [[18 - 4, 2.2, 1.0, 6.4, true], [18 - 9, 2.2, 1.0, 6.4, true], [18 - 14, 2.2, 1.0, 6.4, true]];
  for (const sx of [-1, 1]) { const w = wallWithHoles(18, H.H, sideHoles, 0.5, T.stone); w.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; w.position.set(sx > 0 ? H.X1 : H.X0, 0, sx > 0 ? H.ZB : H.ZF); if (sx < 0) w.position.x = H.X0 + 0.5 - 0.5; g.add(w);
    const wi = wallWithHoles(18, H.H, sideHoles, 0.02, inner); wi.rotation.y = w.rotation.y; wi.position.copy(w.position); wi.position.x += -sx * 0.52; g.add(wi);
    for (const [z, y, hw, hh, a] of sideHoles) { const gl = winGlass(hw, hh, a, T.glass); gl.rotation.y = w.rotation.y; gl.position.set(sx > 0 ? H.X1 - 0.25 : H.X0 + 0.25, y, sx > 0 ? H.ZB + z : H.ZF - z); g.add(gl); } }
  const back = box(26, H.H, 0.5, T.stone, 0, H.H / 2, H.ZB - 0.25); g.add(back); const backIn = box(26, H.H, 0.02, inner, 0, H.H / 2, H.ZB + 0.02); g.add(backIn);
  const roof = box(27, 0.5, 19, T.stoneW, 0, H.H + 0.25, (H.ZF + H.ZB) / 2 - 0.25); g.add(roof); for (let x = -12.5; x <= 12.5; x += 0.55) ad(g, cyl(0.09, 0.11, 0.7, T.stoneW, 10)).position.set(x, H.H + 0.85, H.ZF - 0.2); g.add(box(26.4, 0.18, 0.4, T.stoneW, 0, H.H + 1.25, H.ZF - 0.2));
  // techo artesonado por dentro y suelo de mármol
  const coff = signTex(1024, 1024, (c, w, h) => { c.fillStyle = '#e9dcc0'; c.fillRect(0, 0, w, h); const n = 8, s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = i * s, y = j * s, gr = c.createLinearGradient(x, y, x + s, y + s); gr.addColorStop(0, '#d8c39a'); gr.addColorStop(1, '#bfa575'); c.fillStyle = gr; c.fillRect(x + s * 0.12, y + s * 0.12, s * 0.76, s * 0.76); c.fillStyle = '#e2b54e'; c.beginPath(); c.arc(x + s / 2, y + s / 2, s * 0.07, 0, 7); c.fill(); } });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(25.5, 18), new THREE.MeshStandardMaterial({ map: coff, roughness: 0.8 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H.H - 0.02, (H.ZF + H.ZB) / 2); g.add(ceil);
  const mt = texOf(marbleCanvas(), [6, 4.2]); const floor = new THREE.Mesh(new THREE.PlaneGeometry(25.6, 18), new THREE.MeshPhysicalMaterial({ map: mt, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.12 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, H.FL, (H.ZF + H.ZB) / 2); floor.receiveShadow = true; g.add(floor);
  g.add(box(26, H.FL, 18, T.stoneW, 0, H.FL / 2, (H.ZF + H.ZB) / 2));
  // zócalo de madera
  for (const [w, d, x, z] of [[25.4, 0.08, 0, H.ZB + 0.06], [0.08, 17.4, H.X0 + 0.56, (H.ZF + H.ZB) / 2], [0.08, 17.4, H.X1 - 0.56, (H.ZF + H.ZB) / 2]]) g.add(box(w, 1.3, d, T.woodD, x, H.FL + 0.65, z));
  // escalinata y pórtico de seis columnas con frontón (y el escudo con la corona)
  for (let i = 0; i < 4; i++) { const d = 1.4 - 0.35 * i; g.add(box(20 - i * 0.4, 0.15, d, T.stoneW, 0, 0.075 + i * 0.15, -14.0 + d / 2)); }
  g.add(box(19.2, H.FL, 2.2, T.stoneW, 0, H.FL / 2, H.ZF + 0.9));
  for (const x of [-8.2, -4.9, -1.65, 1.65, 4.9, 8.2]) { const c = columnC(7.2, 0.42, T.stoneW, T.stoneW); c.position.set(x, H.FL, H.ZF + 1.3); g.add(c); }
  g.add(box(18.6, 0.9, 2.4, T.stoneW, 0, H.FL + 7.6, H.ZF + 1.0)); g.add(box(18.9, 0.25, 2.6, T.stoneW, 0, H.FL + 8.15, H.ZF + 1.0));
  { const s = new THREE.Shape(); s.moveTo(-9.4, 0); s.lineTo(9.4, 0); s.lineTo(0, 2.6); s.lineTo(-9.4, 0); const pg = new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: false }); const ped = new THREE.Mesh(pg, T.stoneW); ped.position.set(0, H.FL + 8.27, H.ZF - 0.2); ped.castShadow = ped.receiveShadow = true; g.add(ped);
    const crest = signPlane(2.4, 1.6, 512, (c, w, h) => { c.clearRect(0, 0, w, h); KW_FLAG(c, w, h); }, { r: 0.5 }); crest.position.set(0, H.FL + 9.2, H.ZF + 2.22); g.add(crest);
    const txt = signPlane(8, 0.7, 1024, (c, w, h) => { c.fillStyle = '#e9e2d2'; c.fillRect(0, 0, w, h); c.fillStyle = '#5a4a32'; c.font = '700 88px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '14px'; c.fillText('AYUNTAMIENTO DE KIRIA WORLD', w / 2, h / 2 + 4); }, { r: 0.7 }); txt.position.set(0, H.FL + 7.62, H.ZF + 2.21); g.add(txt); }
  // puerta de dos hojas (abiertas hacia dentro)
  const dm = stdM(0x3c2617, 0.55); U.doors = []; for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(s * 1.7, H.FL, H.ZF - 0.5); g.add(piv); const leaf = box(1.7, 4.7, 0.12, dm, -s * 0.85, 2.35, 0); piv.add(leaf); for (let i = 0; i < 3; i++) piv.add(box(1.3, 1.0, 0.04, stdM(0x4d321e, 0.5), -s * 0.85, 0.9 + i * 1.4, 0.07)); piv.rotation.y = -s * 1.35; U.doors.push(piv); }
  // banderas en el tejado y sobre la puerta
  U.flags = []; for (const x of [-11, 11]) { const pole = cyl(0.05, 0.06, 5, T.goldD, 10); pole.position.set(x, H.H + 2.8, H.ZF - 1); g.add(pole); const f = flagMesh(2.6, 1.6, KW_FLAG); f.position.set(x, H.H + 4.4, H.ZF - 1); g.add(f); U.flags.push(f); }
  // ---- dentro: alfombra, columnas, estandarte, lámparas, tarima y trono
  const carpetT = signTex(256, 1024, (c, w, h) => { c.fillStyle = '#8e1a28'; c.fillRect(0, 0, w, h); const R = rng(3); for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${R() > 0.5 ? '255,255,255' : '0,0,0'},0.035)`; c.fillRect(R() * w, R() * h, 2, 2); } c.fillStyle = '#d8a845'; c.fillRect(10, 0, 10, h); c.fillRect(w - 20, 0, 10, h); });
  const cm = new THREE.MeshStandardMaterial({ map: carpetT, roughness: 0.95 }); const carpet = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 13.6), cm); carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, H.FL + 0.012, -23.2); carpet.receiveShadow = true; g.add(carpet);
  for (const x of [-7.2, 7.2]) for (const z of [-19.5, -23.5, -27.5]) { const c = columnC(H.H - H.FL - 0.6, 0.38, stdM(0xf3eee4, 0.3), T.goldD); c.position.set(x, H.FL, z); g.add(c); }
  // tarima de tres escalones (con alfombra) y el trono
  for (let i = 0; i < 3; i++) { const z0 = -30.2 - i * 0.55; g.add(box(7 - i * 0.6, 0.2, z0 - H.ZB, T.stoneW, 0, H.FL + 0.1 + i * 0.2, (z0 + H.ZB) / 2)); const cp = new THREE.Mesh(new THREE.PlaneGeometry(3.2, z0 - H.ZB), cm); cp.rotation.x = -Math.PI / 2; cp.position.set(0, H.FL + 0.205 + i * 0.2, (z0 + H.ZB) / 2); g.add(cp); }
  const DY = H.FL + 0.6, TZ = -32.6; U.dais = DY;
  const th = new THREE.Group(); th.position.set(0, DY, TZ); g.add(th); U.throne = th;
  th.add(box(1.5, 0.3, 1.1, T.goldD, 0, 0.15, 0)); const cush = rboxM(1.1, 0.16, 0.85, 0.06, T.velvet, 2); cush.position.set(0, 0.38, 0.05); th.add(cush);
  const bk = new THREE.Group(); bk.position.set(0, 0.3, -0.48); th.add(bk); bk.add(box(1.5, 2.6, 0.14, T.gold, 0, 1.3, 0)); const vp = rboxM(1.05, 2.0, 0.08, 0.05, T.velvet, 2); vp.position.set(0, 1.25, 0.08); bk.add(vp);
  for (const s of [-1, 1]) { const pst = cyl(0.08, 0.09, 2.9, T.gold, 16); pst.position.set(s * 0.72, 1.45, 0.02); bk.add(pst); const ball = sph(0.13, T.gold, 20, 14); ball.position.set(s * 0.72, 2.98, 0.02); bk.add(ball);
    const arm = rboxM(0.16, 0.12, 0.95, 0.05, T.gold, 2); arm.position.set(s * 0.66, 0.72, 0.42); th.add(arm); const armP = cyl(0.05, 0.06, 0.42, T.gold, 12); armP.position.set(s * 0.66, 0.5, 0.82); th.add(armP); }
  const tc = crown(2.2); tc.position.set(0, 2.75, 0.04); bk.add(tc);
  shadowAll(th);
  // mesita con el pergamino de la ley y el sello de oro (a la derecha del rey)
  const tb = new THREE.Group(); tb.position.set(1.25, DY, TZ + 0.55); g.add(tb); U.table = tb; ad(tb, cyl(0.32, 0.32, 0.04, T.woodD, 32)).position.y = 0.8; ad(tb, cyl(0.04, 0.05, 0.78, T.goldD, 12)).position.y = 0.4; ad(tb, cyl(0.22, 0.26, 0.04, T.goldD, 24)).position.y = 0.02;
  U.lawT = signTex(768, 1024, drawLaw(0)); U.lawT2 = signTex(768, 1024, drawLaw(1)); const law = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ map: U.lawT, roughness: 0.85 })); law.rotation.x = -Math.PI / 2; law.rotation.z = 0.25; law.position.set(0, 0.825, 0); law.receiveShadow = true; tb.add(law); U.law = law;
  const seal = new THREE.Group(); tb.add(seal); U.seal = seal; ad(seal, cyl(0.05, 0.055, 0.03, T.gold, 32)).position.y = 0.015; ad(seal, cyl(0.022, 0.03, 0.12, T.goldD, 16)).position.y = 0.09; ad(seal, sph(0.038, T.gold, 20, 14)).position.y = 0.17; shadowAll(seal);
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.008, 32), new THREE.MeshStandardMaterial({ color: 0xa0141e, roughness: 0.35 })); wax.position.set(0.05, 0.83, 0.12); wax.visible = false; tb.add(wax); U.wax = wax;
  // estandarte detrás del trono y dos banderas
  const ban = flagMesh(5.4, 7.2, (c, w, h) => { c.fillStyle = '#4b2878'; c.fillRect(0, 0, w, h); c.fillStyle = '#e2b04a'; c.fillRect(0, 0, w, 18); c.fillRect(0, h - 18, w, 18); c.save(); c.translate(w / 2, h * 0.4); const s = w * 0.28; c.fillStyle = '#ffd36a'; c.beginPath(); c.moveTo(-s, s * 0.4); c.lineTo(-s, -s * 0.5); c.lineTo(-s * 0.5, 0); c.lineTo(0, -s * 0.7); c.lineTo(s * 0.5, 0); c.lineTo(s, -s * 0.5); c.lineTo(s, s * 0.4); c.closePath(); c.fill(); c.restore();
    c.fillStyle = '#ffe3a0'; c.font = '900 64px Inter'; c.textAlign = 'center'; c.fillText('KIRIA', w / 2, h * 0.68); c.fillText('WORLD', w / 2, h * 0.78); });
  ban.position.set(-2.7, H.FL + 5.2, H.ZB + 0.3); g.add(ban); U.banner = ban;
  // lámparas de araña: aro de oro, brazos y velas encendidas
  U.chand = []; for (const z of [-21.5, -27]) { const c = new THREE.Group(); c.position.set(0, 8.6, z); g.add(c); ad(c, cyl(0.02, 0.02, 2.4, T.goldD, 6)).position.y = 1.4; const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 10, 48), T.gold); ring.rotation.x = Math.PI / 2; c.add(ring);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, x = Math.cos(a), zz = Math.sin(a); const cd = cyl(0.025, 0.025, 0.16, stdM(0xf4efe2, 0.6), 8); cd.position.set(x, 0.1, zz); c.add(cd); const fl = sph(0.03, T.lampGlow, 8, 6); fl.position.set(x, 0.21, zz); c.add(fl); const gs = glowSprite(0xffc98a, 0.55, 0.55); gs.position.set(x, 0.24, zz); c.add(gs); }
    U.chand.push(c); }
  // haces de sol que entran por las ventanas del este (polvo en el aire)
  const shaftM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { op: { value: 0.22 }, col: { value: new THREE.Color(1.0, 0.86, 0.62) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float op; uniform vec3 col; varying vec2 vUv; void main(){ float a = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.3, vUv.y) * (0.55 + 0.45 * vUv.y); gl_FragColor = vec4(col * a * op, a * op); }' });
  U.shafts = []; for (const z of [-20, -25, -30]) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 11, 1, 1), shaftM); sh.position.set(H.X0 + 4.0, 4.4, z + 1.0); sh.rotation.set(0, -0.5, 0.7); g.add(sh); U.shafts.push(sh); }
  U.shaftM = shaftM;
  return g; }
// el pergamino: «LEY Nº 1 · Una vez a la semana, Kiria World homenajeará a su mejor seguidor» (k = 0 sin sello … 1 sellado)
function drawLaw(k) { return (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75); gr.addColorStop(0, '#f6ecd2'); gr.addColorStop(1, '#d9c497'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#a3864f'; c.lineWidth = 6; c.strokeRect(26, 26, w - 52, h - 52); c.fillStyle = '#3a2a14'; c.textAlign = 'center'; c.font = '900 64px Inter'; c.fillText('LEY Nº 1', w / 2, 150); c.font = '600 22px Inter'; c.fillText('REINO DE KIRIA WORLD', w / 2, 192);
  c.font = '700 46px Inter'; const L = ['Una vez a la', 'semana, Kiria', 'World homenajeará', 'a su mejor', 'seguidor.']; L.forEach((s, i) => c.fillText(s, w / 2, 300 + i * 66));
  c.font = 'italic 600 30px Inter'; c.fillText('— el rey', w / 2, 690); c.strokeStyle = '#3a2a14'; c.lineWidth = 3; c.beginPath(); c.moveTo(w * 0.3, 760); c.bezierCurveTo(w * 0.45, 720, w * 0.55, 800, w * 0.7, 750); c.stroke();
  if (k > 0) { c.save(); c.globalAlpha = Math.min(1, k * 1.5); c.translate(w * 0.62, h * 0.86); c.fillStyle = '#a3121c'; c.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = 70 + (i % 2 ? 8 : 0); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.fillStyle = '#7a0a12'; c.beginPath(); c.arc(0, 0, 52, 0, 7); c.fill(); c.fillStyle = '#c9333c'; const s = 30; c.beginPath(); c.moveTo(-s, s * 0.4); c.lineTo(-s, -s * 0.5); c.lineTo(-s * 0.5, 0); c.lineTo(0, -s * 0.7); c.lineTo(s * 0.5, 0); c.lineTo(s, -s * 0.5); c.lineTo(s, s * 0.4); c.closePath(); c.fill(); c.restore(); } }; }
// ---------------------------------------------------------------- LA ESCENA del día 3: quién está dónde y qué hace (los tiempos llegan con la voz de Javi)
let TL = {}; const PEOPLE = [], CARS = [], ROLES = [];
// edificio de fondo: fachada con ventanas, planta baja con persiana o portal, cornisa (para cerrar la plaza y la calle)
function genericFront(w, floors, wall, seed) { const R = rng(seed), g = new THREE.Group(), H0 = 3.8, H = H0 + floors * 3.2 + 0.5;
  g.add(box(w, H, 0.5, wall, 0, H / 2, -0.25)); g.add(box(w, H, 8, stdM(0x9a948a, 0.9), 0, H / 2, -4.5));
  const nW = Math.max(2, Math.floor(w / 2.6)); for (let f = 0; f < floors; f++) for (let i = 0; i < nW; i++) { const x = -w / 2 + (i + 0.5) * w / nW, y = H0 + 0.8 + f * 3.2; g.add(box(1.2, 1.7, 0.1, T.frame, x, y + 0.85, 0.02)); const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.54), T.glassDark); gl.position.set(x, y + 0.85, 0.08); g.add(gl);
    if (R() < 0.5) { const cu = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.4), stdM(pick(R, [0xe8dcc0, 0xc9d8e8, 0xe8c9c9]), 0.9)); cu.position.set(x - 0.26, y + 0.85, 0.06); g.add(cu); }
    g.add(box(1.4, 0.1, 0.28, stdM(0xe6e0d4, 0.6), x, y - 0.05, 0.12)); if (R() < 0.3) { g.add(box(1.6, 0.08, 0.7, stdM(0xe6e0d4, 0.6), x, y - 0.06, 0.35)); for (let k = 0; k < 7; k++) ad(g, cyl(0.012, 0.012, 0.9, T.iron, 6)).position.set(x - 0.75 + k * 0.25, y + 0.42, 0.68); g.add(box(1.6, 0.04, 0.04, T.iron, x, y + 0.88, 0.68)); } }
  for (let i = 0; i < nW; i++) { const x = -w / 2 + (i + 0.5) * w / nW; if (R() < 0.6) { g.add(box(w / nW - 0.5, 2.9, 0.08, stdM(0x6f7378, 0.5, { metalness: 0.4 }), x, 1.5, 0.02)); for (let k = 0; k < 14; k++) g.add(box(w / nW - 0.5, 0.02, 0.1, stdM(0x55595e, 0.5), x, 0.2 + k * 0.2, 0.04)); }
    else { g.add(box(1.1, 2.4, 0.1, stdM(0x5a3a26, 0.5), x, 1.2, 0.03)); g.add(box(1.4, 0.3, 0.2, stdM(0xe6e0d4, 0.6), x, 2.55, 0.08)); } }
  g.add(box(w + 0.3, 0.35, 0.6, stdM(0xe6e0d4, 0.6), 0, H - 0.18, 0.1)); g.add(box(w, 0.15, 0.4, stdM(0xe6e0d4, 0.6), 0, H0, 0.05)); shadowAll(g); return g; }
async function buildScene() {
  const LS = i => (WORDS.find(w => w.li === i) || { start: 0 }).start, LE = i => { const ws = WORDS.filter(w => w.li === i); return ws.length ? ws[ws.length - 1].end : 0; };
  const W_ = (w, li, d = 0) => { const k = norm(w) + '_' + li, o = Object.getPrototypeOf(K) === Object.prototype ? K : K; const v = WORDS.find(x => x.li === li && x.n.startsWith(norm(w))); return v ? v.start - 0.03 + d : LS(li) + d; };
  TL = { end: END, L: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(LS), E: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(LE),
    stamp: W_('firmar', 1, 0.25), tocar: W_('tocar', 1), trono: W_('trono', 2), ley2: W_('ley', 2), semana: W_('semana', 2), homen: W_('homenajeara', 2), seguidor: W_('seguidor', 2), final: W_('final', 3), tu: W_('tu', 3),
    crece: W_('crece', 4), pedis: W_('pedis', 4), sushi: W_('sushi', 5), mesa: W_('mesa', 5), libre: W_('mesa', 5, 0.15), past: W_('pasteleria', 6), tartas: W_('tartas', 6), escap: W_('escaparate', 6), cola: W_('cola', 6), esquina: W_('esquina', 6),
    vet: W_('veterinario', 7), paciente: W_('paciente', 7), perro: W_('perro', 7), vacunar: W_('vacunar', 7), plaza: W_('plaza', 8), pedestal: W_('pedestal', 8), vacio: W_('vacio', 8),
    coment: W_('comentario', 9), gusta: W_('gusta', 9), semana9: W_('semana', 9), construir: W_('construira', 9), nombre: W_('nombre', 9), estatua: W_('estatua', 9), oro: W_('oro', 9), manda: W_('mandaselo', 10), estatua10: W_('estatua', 10) };
  townMats(); const G = new THREE.Group(); scene.add(G); S.G = G;
  buildGround(G); buildHall(G); S.shops = buildShops(G);
  // edificios de fondo: lado oeste de la plaza, lado sur (tras la calle transversal), norte de la calle de las tiendas y la esquina
  const walls = [[[214, 196, 168], 51], [[198, 214, 226], 52], [[226, 204, 176], 53], [[232, 220, 196], 54], [[205, 190, 210], 55]].map(([c, s]) => { const [a, b] = stuccoCanvases(c, s); return texMat(a, b, [3, 3], { r: 0.85, ns: 0.4 }); });
  const [bc, bh] = brickCanvases([140, 84, 60], 9), brickC = texMat(bc, bh, [2, 1.6], { r: 0.85, ns: 1.2 });
  for (let i = 0; i < 4; i++) { const b = genericFront(8, 3 + (i % 2), walls[i % 5], 60 + i); b.position.set(-16, 0, -10 + i * 8); b.rotation.y = Math.PI / 2; G.add(b); }
  for (let i = 0; i < 6; i++) { const b = genericFront(8, 2 + (i % 3), i % 2 ? brickC : walls[(i + 2) % 5], 70 + i); b.position.set(-18 + i * 8.2, 0, 23.5); b.rotation.y = Math.PI; G.add(b); }
  { const b = genericFront(8, 3, walls[3], 80); b.position.set(SHOP.X, 0, -16.5); b.rotation.y = -Math.PI / 2; G.add(b); const c = genericFront(3.5, 2, brickC, 81); c.position.set(SHOP.X, 0, 13.25); c.rotation.y = -Math.PI / 2; G.add(c);
    for (let i = 0; i < 3; i++) { const d = genericFront(8, 2 + i % 2, walls[(i + 1) % 5], 82 + i); d.position.set(SHOP.X, 0, -24.6 - i * 8.1); d.rotation.y = -Math.PI / 2; G.add(d); } }
  // plaza: pedestal, bancos, farolas, árboles en los céspedes, setos y parterres
  S.ped = pedestal(); G.add(S.ped);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5, b = bench(); b.position.set(Math.sin(a) * 6.2, 0, Math.cos(a) * 6.2); b.rotation.y = a + Math.PI; G.add(b); }
  for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9], [14.6, -6], [14.6, 6], [23.0, -12.6], [23.0, 3.6], [23.0, 14.7]]) { const l = lampPost(); l.position.set(x, 0, z); l.rotation.y = x > 14 ? (x > 20 ? Math.PI : 0) : Math.atan2(-x, -z) - Math.PI / 2; G.add(l); }
  const R = rng(91); for (const [x, z, h] of [[12.8, -11, 6.5], [12.8, -3.5, 6], [12.8, 4, 6.8], [12.8, 11.5, 6.2], [-14, -13.5, 7], [-13, 0, 6.5], [-13, 9, 7.2], [-6.5, 10, 5.5], [6.5, 10, 5.8]]) { const t = tree(Math.floor(R() * 1000), h); t.position.set(x, 0.05, z); t.rotation.y = R() * 6; G.add(t); }
  for (const [x, z, w, d] of [[-6.5, 12.3, 3.6, 0.6], [6.5, 12.3, 3.6, 0.6], [-6.5, 7.7, 3.6, 0.6], [6.5, 7.7, 3.6, 0.6]]) { const hd = hedge(w, d, 0.7); hd.position.set(x, 0.4, z); G.add(hd); }
  S.grass = grassField(G, T.lawns, 70000, 5);
  // coches: aparcados en el lado de la plaza y alguno que pasa
  const paints = [0xb0141e, 0xf2f2ee, 0x1c2430, 0x8e9aa6, 0x1f4f8f, 0x2f6b3a, 0xc9a227, 0x6a1a2a];
  [[-20, 1], [-14.6, -1], [-8.8, 1], [-2.4, 1], [3.6, -1], [9.6, 1]].forEach(([z, d], i) => { const c = car(['sedan', 'hatch', 'suv'][i % 3], paints[i % paints.length], i + 1); c.position.set(16.65, 0.0, z); c.rotation.y = d > 0 ? Math.PI / 2 : -Math.PI / 2; G.add(c); CARS.push({ c, park: true }); });
  for (let i = 0; i < 3; i++) { const c = car(['hatch', 'sedan', 'suv'][i], paints[(i + 4) % paints.length], 20 + i); G.add(c); CARS.push({ c, lane: i % 2 ? 21.2 : 18.8, dir: i % 2 ? -1 : 1, off: i * 31, v: 6 + i }); }
  // ---- la gente
  const H = S.hall.userData, add = (p, x, y, z, ry, role, par = G) => { p.position.set(x, y, z); p.rotation.y = ry; par.add(p); PEOPLE.push(p); p.userData.role = role; ROLES.push(p); return p; };
  S.king = add(person({ topType: 'king', seed: 101, top: 0xf2e6c8, legs: 0x5a1020, hairStyle: 'short', hairC: 0x2e2018, skin: 0xe8c1a4, eye: 0x4d2f17 }), 0, H.dais, -32.6 + 0.16, 0, { k: 'king', vip: 'king' }, S.hall);
  for (const s of [-1, 1]) { const gd = add(person({ seed: 110 + s, topType: 'long', top: 0x2b3a6b, legs: 0x1c1c22 }), s * 2.3, HALL.FL, -29.4, 0, { k: 'guard' }, S.hall); const hb = new THREE.Group(); ad(hb, cyl(0.02, 0.02, 2.4, T.woodD, 8)).position.y = 1.2; const bl = box(0.02, 0.32, 0.18, T.goldD, 0, 2.42, 0.05); hb.add(bl); ad(hb, new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.25, 8), T.goldD)).position.y = 2.65; hb.position.set(-s * 0.28, 0, 0.12); gd.add(hb); gd.userData.halberd = hb; }
  for (let i = 0; i < 8; i++) { const side = i % 2 ? 1 : -1, row = Math.floor(i / 2); add(person({ seed: 120 + i, female: i % 3 === 0 }), side * (2.4 + (row % 2) * 0.8), HALL.FL, -22.5 - row * 1.1, Math.PI + side * 0.25, { k: 'court' }, S.hall); }
  // sushi
  { const g = S.shops.sushi, U = g.userData; S.lydia = add(person({ female: true, seed: 201, topType: 'long', top: 0x1b1b1d, legs: 0x1b1b1d, hairStyle: 'long', hairC: 0x2e2018 }), U.dX - 0.4, 0, -1.4, Math.PI * 0.85, { k: 'owner', vip: 'lydiaa.rc' }, g);
    add(person({ seed: 202, topType: 'chef', hat: 'band' }), -0.6, 0, -6.4, 0, { k: 'chefSushi' }, g);
    U.tables.forEach(([x, z], ti) => { for (const s of [-1, 1]) add(person({ seed: 210 + ti * 2 + (s > 0), female: (ti + (s > 0)) % 2 === 0 }), x + s * 0.75, 0, z, s < 0 ? Math.PI / 2 : -Math.PI / 2, { k: 'diner', side: s > 0 ? 'L' : 'R' }, g); });
    for (let i = 0; i < 5; i++) add(person({ seed: 230 + i, female: i % 2 === 1 }), -2.8 + i * 1.1, 0, -4.85, Math.PI, { k: 'bar' }, g);
    S.couple = [add(person({ seed: 240, female: true }), U.dX + 0.4, 0, 2.4, Math.PI, { k: 'couple' }, g), add(person({ seed: 241 }), U.dX - 0.25, 0, 2.6, Math.PI, { k: 'couple' }, g)]; }
  // pastelería y la cola hasta la esquina
  { const g = S.shops.pastry, U = g.userData; S.salvador = add(person({ seed: 301, topType: 'chef', hat: 'chef', hairStyle: 'short' }), 0.6, 0, -5.25, 0, { k: 'baker', vip: 'salvadormatthias34' }, g);
    add(person({ seed: 302, female: true }), -0.6, 0, -3.5, Math.PI, { k: 'buy' }, g); add(person({ seed: 303 }), 1.4, 0, -3.55, Math.PI, { k: 'buy' }, g);
    S.queue = []; for (let i = 0; i < 15; i++) { const q = add(person({ seed: 310 + i, female: i % 2 === 0 }), U.dX + 0.3 + i * 0.8, 0, 1.25 + (i % 2) * 0.12, -Math.PI / 2, { k: 'queue', i }, g); S.queue.push(q); } }
  // veterinario: la veterinaria, el perro en la camilla, su dueño y la sala de espera
  { const g = S.shops.vet, U = g.userData; S.zamii = add(person({ female: true, seed: 401, topType: 'vet', hairStyle: 'pony', hairC: 0x1d1512, legs: 0x3a6b8a }), -1.2, 0, -3.35, 0, { k: 'vet', vip: 'zamii.luu' }, g);
    const syr = new THREE.Group(); syr.add(cyl(0.012, 0.012, 0.11, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, roughness: 0.1 }), 10)); ad(syr, cyl(0.002, 0.002, 0.05, CARM.chrome || stdM(0xdddddd, 0.2), 4)).position.y = -0.08; syr.rotation.z = Math.PI / 2; S.zamii.userData.J.wrL.add(syr); syr.position.set(0, -0.08, 0.03); S.syringe = syr;
    S.dog = dog(0xc98a4b); S.dog.position.set(-1.2, 0.9, -2.6); S.dog.rotation.y = -Math.PI / 2; g.add(S.dog);
    add(person({ seed: 402 }), -0.15, 0, -2.3, -Math.PI / 2, { k: 'owner2' }, g);
    add(person({ seed: 403, female: true }), 1.4, 0, -1.2, -Math.PI / 2, { k: 'wait' }, g); add(person({ seed: 404 }), 2.0, 0, -2.8, -Math.PI / 2, { k: 'wait' }, g);
    const small = dog(0xf2efe8); small.scale.setScalar(0.6); small.position.set(1.1, 0, -2.6); small.rotation.y = -Math.PI / 2; g.add(small); S.dog2 = small; }
  // la plaza: paseantes, gente sentada en los bancos, un niño con globo, alguien con perro
  S.walkers = []; const WR = rng(501);
  for (let i = 0; i < 10; i++) { const p = add(person({ seed: 510 + i, female: WR() < 0.5 }), 0, 0, 0, 0, { k: 'walk', r: 7.5 + WR() * 4, a0: WR() * 6.3, v: (0.9 + WR() * 0.5) * (WR() < 0.5 ? -1 : 1) }); S.walkers.push(p); }
  for (let i = 0; i < 4; i++) { const a = [0.5, 1.55, 3.6, 4.65][i] , p = add(person({ seed: 530 + i, female: i % 2 === 0 }), Math.sin(a) * 6.45, 0, Math.cos(a) * 6.45, a + Math.PI, { k: 'sit' }); }
  // el sello pasa a la mano del rey (cuelga bajo la muñeca derecha) y la mesita se acerca al trono
  { const H = S.hall.userData; H.table.position.set(0.85, H.dais, -32.6 + 0.78); H.seal.position.set(0.098, 0.85, 0.181);
    S.sealFx = sparks(H.table, 60, 0xffd27a, 0.02); }
  S.statue = goldStatue(); S.statue.position.set(0, S.ped.userData.top, 0); S.statue.rotation.y = Math.PI * 0.25; G.add(S.statue); S.statue.visible = false; S.statFx = sparks(G, 160, 0xffe08a, 0.06);
  S.namePlates = S.ped.userData.plates.map(pl => { const n = signPlane(0.78, 0.42, 512, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#f2cf6c'); gr.addColorStop(1, '#b4862c'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.strokeStyle = '#6e4c12'; c.lineWidth = 10; c.strokeRect(10, 10, w - 20, h - 20); c.fillStyle = '#3d2806'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 64px Inter'; c.fillText('TU NOMBRE', w / 2, h / 2 - 14); c.font = '700 30px Inter'; c.fillText('mejor seguidor de la semana', w / 2, h / 2 + 46); }, { metal: 0.85, r: 0.3 });
    n.position.copy(pl.position); n.rotation.copy(pl.rotation); n.position.addScaledVector(_v(0, 0, 1).applyEuler(pl.rotation), 0.004); n.visible = false; S.ped.add(n); return n; });
  // la tarjeta del comentario (encima del pedestal): bocadillo con el corazón y los «me gusta» que suben
  S.cardT = signTex(1024, 384, () => {}); S.card = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), new THREE.MeshBasicMaterial({ map: S.cardT, transparent: true, toneMapped: false })); S.card.position.set(0, 4.6, 0); G.add(S.card); S.card.visible = false;
  // foco sobre el pedestal (haz de luz polvoriento)
  S.beam = lightCone(1.6, 7, 0.09, 0xffe7b8); S.beam.position.set(0, 6.4, 0); G.add(S.beam);
  // polvo en el aire (flujo óptico): en el salón (en los haces de sol) y en la calle
  const r1 = rng(11), r2 = rng(22);
  S.flow = [flowCloud(5000, () => [(r1() - 0.5) * 24, HALL.FL + r1() * 10, -17 - r1() * 16], { size: 1.3, bright: 0.55, seed: 1, nearF: 0.08, farF: 0.02, col: 0xfff0d0 }),
    flowCloud(6000, () => [-14 + r2() * 40, 0.3 + r2() * 9, -18 + r2() * 36], { size: 1.2, bright: 0.35, seed: 2, nearF: 0.1, farF: 0.015, col: 0xfff6e2 })];
  envAll(scene);
}
// ---- cada fotograma: la historia
const _tg = new THREE.Vector3();
function drawCard(n, a) { const c = S.cardT.image.getContext('2d'), w = 1024, h = 384; c.clearRect(0, 0, w, h); c.globalAlpha = 1; c.fillStyle = 'rgba(255,255,255,0.96)'; rr(c, 10, 10, w - 20, h - 90, 60); c.fill(); c.beginPath(); c.moveTo(150, h - 82); c.lineTo(120, h - 10); c.lineTo(230, h - 82); c.fill();
  c.fillStyle = '#d6dbe3'; c.beginPath(); c.arc(110, 140, 62, 0, 7); c.fill(); c.fillStyle = '#9aa3b0'; c.beginPath(); c.arc(110, 122, 24, 0, 7); c.fill(); c.beginPath(); c.arc(110, 186, 40, Math.PI, 0); c.fill();
  c.fillStyle = '#1a1d22'; c.font = '800 54px Inter'; c.textBaseline = 'middle'; c.fillText('Tu comentario', 200, 100); c.fillStyle = '#5b6370'; c.font = '600 40px Inter'; c.fillText('«Quiero un…»', 200, 168);
  c.fillStyle = '#e23b55'; c.save(); c.translate(w - 300, 220); c.scale(2.2, 2.2); c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-14, -6, -8, -18, 0, -10); c.bezierCurveTo(8, -18, 14, -6, 0, 6); c.fill(); c.restore();
  c.fillStyle = '#e23b55'; c.font = '900 64px Inter'; c.fillText(n.toLocaleString('es-ES'), w - 250, 226); S.cardT.needsUpdate = true; S.card.material.opacity = a; }
function stageAt(t, st) { NOW = t; lightsAt(st.l, st.p.distanceTo(st.l)); if (S.grassTime) S.grassTime.value = t;
  const H = S.hall.userData, inHall = st.p.z < -16.6 && Math.abs(st.p.x) < 13; for (const f of H.flags) flagWave(f, t);
  moodMix({ dia: inHall ? 0.25 : 1, salon: inHall ? 0.75 : 0 });
  // el pergamino: sin sello hasta el golpe, sellado después
  const sealed = t >= TL.stamp; H.law.material.map = sealed ? H.lawT2 : H.lawT; H.law.material.needsUpdate = H.law.userData.s !== sealed; H.law.userData.s = sealed;
  burst(S.sealFx, _v(0.098, 0.84, 0.181), t, TL.stamp, 0.6, 0.5, false, 1.5); S.sealFx.material.opacity = bump(t, TL.stamp, TL.stamp + 0.35, 0.02, 0.4);
  for (const p of PEOPLE) { poseReset(p); breathe(p, t); const r = p.userData.role, ph = p.userData.phase;
    if (r.k === 'king') { poseSit(p, 0.05);
      // el golpe del sello: la mano baja sobre el pergamino, sella y sube; luego descansa en el brazo del trono
      // el sello (en la mesita) sube y baja; la mano del rey lo agarra por el pomo
      const dn = seg(t, TL.stamp + 0.12, TL.stamp + 0.7), back = win(t, TL.end - 1.0, 0.8);
      const hY = t < TL.stamp ? 0.16 * (1 - sm5(seg(t, TL.stamp - 0.3, TL.stamp))) + 0.015 * Math.sin(t * 2.5) : 0.2 * sm5(dn) * (1 - back) + 0.16 * back;
      H.seal.position.y = 0.828 + hY; H.table.updateMatrixWorld(true); const top = H.table.localToWorld(_v(0.098, 0.828 + hY + 0.24, 0.181));
      const rest = Math.max(1 - win(t, TL.stamp + 0.9, 0.8), back); if (rest > 0.01) reachTo(p, 'R', top, rest);
      // en «tú», señala a la cámara
      const pt = bump(t, TL.tu - 0.25, TL.E[3] + 0.5, 0.3, 0.4); if (pt > 0.01) reachTo(p, 'L', st.p.clone().lerp(p.localToWorld(_v(0, 1.0, 0.3)), 0.82), pt);
      lookAtP(p, st.p, 0.6 + 0.4 * bump(t, TL.trono - 0.4, TL.ley2, 0.4, 0.4)); faceAt(p, t, { smile: 0.75, gx: 0.0, gy: -0.1, brow: 0.3 * bump(t, TL.tu - 0.2, TL.E[3], 0.2, 0.3) }); }
    else if (r.k === 'court') { const cl = bump(t, TL.seguidor, TL.final + 0.6, 0.2, 0.4); if (cl > 0.01) { const c = Math.abs(Math.sin(t * 9 + ph)); for (const [n, s] of [['L', -1], ['R', 1]]) { p.userData.J['sh' + n].rotation.x = -1.0 * cl; p.userData.J['sh' + n].rotation.z = s * (0.15 + 0.25 * c) * cl; p.userData.J['el' + n].rotation.x = -0.9 * cl; p.userData.J['el' + n].rotation.y = -s * 0.6 * cl; } }
      lookAtP(p, H.throne.getWorldPosition(_tg).add(_v(0, 1.6, 0)), 0.8); faceAt(p, t, { smile: 0.4 + 0.4 * cl, open: cl > 0.1 ? 0.35 * cl : undefined }); }
    else if (r.k === 'diner') { poseSit(p, 0.12); const e = Math.max(0, Math.sin(t * 1.3 + ph)); poseEat(p, r.side, e); faceAt(p, t, { talk: e < 0.2 ? 1 : 0, open: e > 0.9 ? 0.3 : undefined, smile: 0.5 }); }
    else if (r.k === 'bar') { poseSit(p, 0.1); p.userData.J.pelvis.position.y = 0.74 * p.userData.k; faceAt(p, t, { talk: (Math.sin(t * 0.7 + ph) > 0.3) ? 1 : 0, smile: 0.45 }); }
    else if (r.k === 'chefSushi' || r.k === 'baker') { poseWork(p, t, 1); faceAt(p, t, { smile: 0.55 }); }
    else if (r.k === 'owner') { faceAt(p, t, { smile: 0.7, talk: bump(t, TL.sushi, TL.libre, 0.2, 0.2) }); const w = bump(t, TL.sushi + 0.2, TL.libre + 0.3, 0.3, 0.3); if (w > 0.01) poseWave(p, 'R', t, w); }
    else if (r.k === 'couple') { const k = sm5(seg(t, TL.sushi - 0.6, TL.libre - 0.2)), sad = bump(t, TL.libre + 0.1, TL.L[6], 0.2, 0.4); p.position.z = lerp(3.4, 2.0, k); p.position.x = p.userData.x0 ?? (p.userData.x0 = p.position.x); if (k > 0.01 && k < 0.99) poseWalk(p, k * 3, 1);
      if (sad > 0.01) { for (const [n, s] of [['L', -1], ['R', 1]]) { p.userData.J['sh' + n].rotation.z = s * (0.08 + 0.55 * sad); p.userData.J['el' + n].rotation.x = -1.3 * sad; } } faceAt(p, t, { open: 0.45 * sad, brow: 0.8 * sad, smile: 0.35 - 0.6 * sad }); }
    else if (r.k === 'queue') { faceAt(p, t, { talk: Math.sin(t * 0.6 + ph) > 0.4 ? 1 : 0, smile: 0.4 }); if (r.i % 4 === 1) lookAtP(p, p.localToWorld(_v(0.6, 1.5, 0.2)), 0.5); }
    else if (r.k === 'vet') { const sy = bump(t, TL.paciente - 0.3, TL.L[8] + 0.2, 0.4, 0.4), oh = bump(t, TL.vacunar - 0.45, TL.L[8] + 0.4, 0.15, 0.4);
      p.userData.J.shL.rotation.x = -0.9 * sy - 0.6 * oh; p.userData.J.elL.rotation.x = -1.2 * sy; p.userData.J.shL.rotation.z = -0.2;
      lookAtP(p, S.dog.getWorldPosition(_tg).add(_v(0, 0.3, 0)), 0.8); faceAt(p, t, { smile: 0.5 - 0.7 * oh, open: 0.5 * oh, brow: 0.9 * oh }); }
    else if (r.k === 'owner2') { const oh = bump(t, TL.vacunar - 0.4, TL.L[8] + 0.4, 0.15, 0.4); lookAtP(p, S.dog.getWorldPosition(_tg).add(_v(0, 0.3, 0)), 0.8); faceAt(p, t, { open: 0.4 * oh, brow: 0.8 * oh, smile: 0.3 }); if (oh > 0.01) { p.userData.J.shR.rotation.x = -1.1 * oh; p.userData.J.shL.rotation.x = -1.1 * oh; } }
    else if (r.k === 'walk') { const s = t * r.v + r.a0 * r.r, a = s / r.r; p.position.set(Math.sin(a) * r.r, 0, Math.cos(a) * r.r); p.rotation.y = a + (r.v > 0 ? Math.PI / 2 : -Math.PI / 2); poseWalk(p, Math.abs(s), 1); faceAt(p, t, {}); }
    else if (r.k === 'sit') { poseSit(p, 0.05); faceAt(p, t, { talk: Math.sin(t * 0.5 + ph) > 0 ? 1 : 0 }); }
    else faceAt(p, t, { talk: Math.sin(t * 0.8 + ph) > 0.5 ? 0.8 : 0 });
    // al final, toda la plaza aplaude la estatua
    if (r.k === 'walk' || r.k === 'sit' || r.k === 'queue') { const ap = bump(t, TL.estatua + 0.2, TL.end, 0.4, 0.4); if (ap > 0.01 && (r.k !== 'queue')) { const c = Math.abs(Math.sin(t * 9 + ph)); for (const [n, s] of [['L', -1], ['R', 1]]) { p.userData.J['sh' + n].rotation.x = -1.0 * ap; p.userData.J['sh' + n].rotation.z = s * (0.15 + 0.25 * c) * ap; p.userData.J['el' + n].rotation.x = -0.9 * ap; p.userData.J['el' + n].rotation.y = -s * 0.6 * ap; } } } }
  // el cartel de la puerta del sushi: ABIERTO → COMPLETO
  { const D = S.shops.sushi.userData.doorSign; D[0].visible = t < TL.libre; D[1].visible = t >= TL.libre; }
  // el perro: tiembla en la camilla; con «vacunar» salta y se esconde detrás de su dueño
  if (S.dog) { const J = S.dog.userData.J, j0 = TL.vacunar - 0.45, j = seg(t, j0, j0 + 0.55), run = seg(t, j0 + 0.55, j0 + 1.3);
    const P0 = _v(-1.2, 0.9, -2.6), P1 = _v(-0.55, 0, -1.9), P2 = _v(0.25, 0, -2.0); const p = j < 1 ? P0.clone().lerp(P1, j) : P1.clone().lerp(P2, sm5(run)); if (j > 0 && j < 1) p.y = lerp(0.9, 0, j) + Math.sin(j * Math.PI) * 0.45;
    S.dog.position.copy(p); S.dog.rotation.y = -Math.PI / 2 + (j > 0 ? Math.PI * 0.75 * sm5(Math.min(1, j * 2)) : 0); const tr = j <= 0 ? 1 : 0.2;
    J.body.position.x = Math.sin(t * 40) * 0.004 * tr; J.head.rotation.y = j <= 0 ? Math.sin(t * 8) * 0.5 * bump(t, TL.perro, TL.vacunar - 0.45, 0.2, 0.1) + Math.sin(t * 2) * 0.15 : Math.sin(t * 3) * 0.2; J.tail.rotation.z = Math.sin(t * 14) * 0.6;
    for (const [n, s] of [['FL', 1], ['FR', -1], ['BL', -1], ['BR', 1]]) J[n].rotation.x = run > 0 && run < 1 ? Math.sin(t * 18) * 0.7 * s : (j > 0 && j < 1 ? -0.6 * s * 0.3 : 0);
    J.earL.rotation.z = -0.25 - 0.3 * (j > 0 && j < 1 ? 1 : 0); J.earR.rotation.z = 0.25 + 0.3 * (j > 0 && j < 1 ? 1 : 0); }
  if (S.dog2) { const J = S.dog2.userData.J; J.tail.rotation.z = Math.sin(t * 10) * 0.5; J.head.rotation.y = Math.sin(t * 1.3) * 0.4; }
  // el pedestal: foco, tarjeta del comentario con los «me gusta» que suben y la estatua que sube con chispas
  const cardA = bump(t, TL.coment, TL.estatua - 0.2, 0.35, 0.35); S.card.visible = cardA > 0.01; if (S.card.visible) { drawCard(Math.round(lerp(12, 4821, sm5(seg(t, TL.gusta - 0.2, TL.construir)))), cardA); S.card.lookAt(st.p); }
  S.beam.material.uniforms.op.value = 0.09 * win(t, TL.pedestal - 0.3, 0.6);
  { const k = seg(t, TL.estatua - 0.1, TL.estatua + 0.9); S.statue.visible = k > 0 && t < TL.end - 0.05; S.statue.scale.setScalar(1.25 * (0.001 + 0.999 * sm5(k))); S.statue.position.y = S.ped.userData.top - 0.6 * (1 - sm5(k)); S.statue.rotation.y = Math.PI * 0.25 + (1 - sm5(k)) * 3;
    burst(S.statFx, _v(0, S.ped.userData.top + 1.0, 0), t, TL.estatua, 1.2, 1.1, false, 1.2); S.statFx.material.opacity = bump(t, TL.estatua, TL.estatua + 1.0, 0.05, 0.6);
    const nm = t >= TL.nombre - 0.1 && t < TL.end - 0.05; S.namePlates.forEach(n => n.visible = nm); S.ped.userData.plates.forEach(pl => pl.visible = !nm); }
  // coches que pasan
  for (const C of CARS) if (!C.park) { const s = ((t * C.v + C.off) % 90) - 45; C.c.position.set(C.lane, 0, C.dir * s); C.c.rotation.y = C.dir > 0 ? Math.PI / 2 : -Math.PI / 2; carRoll(C.c, t * C.v); }
}
function fillAt(t) { return { k: 0, c: [0, 0, 0] }; }
// ---------------------------------------------------------------- LA CÁMARA: un solo plano, sin cortes. Empieza pegada al pergamino (el sello cae), sube a la cara del rey, vuelve
// a leer la ley, el rey señala a cámara, sale volando por la puerta a la plaza (estelas de polvo), recorre las tres tiendas por sus cristales, sigue la
// cola hasta la esquina, ve escaparse al perro, cruza a la plaza (el pedestal vacío, la tarjeta del comentario, la estatua de oro) y vuelve al salón
// hasta el mismo pergamino del principio (bucle).
let CK = [], CUTS = [];
function buildCam() { const T = TL, P0 = [1.3, 2.4, -30.95], L0 = [0.93, 2.15, -31.66];
  CK = [
    [0, P0, L0, 36], [T.stamp - 0.3, [1.27, 2.42, -31.0], [0.94, 2.17, -31.66], 36], [T.stamp + 0.2, [1.25, 2.38, -31.03], [0.94, 2.13, -31.66], 36],                                                        // el sello cae sobre la ley
    [T.trono - 0.2, [0.78, 2.62, -30.85], [0.08, 2.33, -32.4], 34], [T.ley2 - 0.1, [0.62, 2.56, -30.6], [0.05, 2.32, -32.4], 34],           // la cara del rey
    [T.semana - 0.15, [0.97, 2.6, -31.48], [0.85, 2.03, -31.85], 30], [T.seguidor + 0.3, [0.93, 2.5, -31.42], [0.85, 2.03, -31.85], 30],     // la ley, de cerca
    [T.final - 0.1, [0.42, 2.72, -29.3], [0.0, 2.27, -32.3], 36], [T.E[3] + 0.12, [0.25, 2.9, -27.6], [0.0, 2.2, -32.0], 38],               // «cómo ser tú»: el rey señala
    [T.E[3] + 0.5, [0.4, 2.9, -26.9], [2.6, 2.6, -29.8], 40], [T.E[3] + 0.95, [0.5, 2.9, -25.6], [3.7, 2.6, -24.8], 40], [T.E[3] + 1.4, [0.4, 2.87, -23.4], [2.6, 2.7, -19.8], 41], [T.crece, [0.3, 2.85, -21.0], [1.5, 2.6, -14.0], 42],   // giro suave hacia la puerta                     // gira hacia la puerta…
    [T.pedis - 0.2, [0.0, 2.85, -15.4], [2.0, 2.8, -5.0], 44], [T.E[4] + 0.15, [6.0, 3.4, -8.0], [24.0, 2.8, -7.0], 44],                  // …sale a la plaza y mira a las tiendas
    [T.sushi - 0.1, [16.8, 2.1, -9.0], [25.5, 1.9, -8.4], 40], [T.sushi + 1.0, [21.6, 1.7, -8.8], [27.2, 1.35, -8.6], 40],                // el sushi lleno
    [T.mesa - 0.05, [22.6, 1.65, -6.6], [25.0, 1.7, -5.5], 40], [T.E[5] - 0.05, [22.75, 1.7, -5.3], [25.0, 1.6, -5.5], 40], [T.E[5] + 0.3, [20.6, 2.0, -3.6], [25.3, 1.8, -3.0], 42],   // se aparta de la fachada para pasar a la pastelería              // «COMPLETO»
    [T.past + 0.15, [21.6, 1.9, -2.2], [25.6, 1.45, -1.4], 42], [T.tartas + 0.2, [22.6, 1.55, -1.6], [25.8, 1.1, -1.9], 40],              // el escaparate de tartas
    [T.cola - 0.2, [22.2, 2.2, 0.8], [23.6, 1.45, 7.0], 44], [T.esquina + 0.3, [22.0, 2.4, 5.6], [23.7, 1.4, 14.5], 44],                   // la cola hasta la esquina
    [T.vet + 0.1, [24.2, 1.7, 5.4], [27.3, 1.25, 5.9], 40], [T.vacunar - 0.5, [24.3, 1.5, 6.0], [27.4, 1.0, 6.2], 38], [T.E[7] + 0.3, [24.3, 1.45, 6.9], [27.0, 0.45, 7.5], 40], [T.E[7] + 0.62, [24.1, 3.3, 7.2], [20.0, 2.6, 6.0], 44],   // sube antes de cruzar (no atraviesa la cola)   // el perro
    [T.L[8] + 0.5, [18.0, 4.2, 8.0], [6.0, 2.5, 3.0], 46], [T.pedestal + 0.1, [2.3, 2.2, 6.3], [0.0, 2.0, 0.0], 42],                         // a la plaza: el pedestal vacío
    [T.coment, [2.7, 2.4, 5.2], [0.0, 3.4, 0.0], 42], [T.construir, [2.9, 2.5, 4.6], [0.0, 3.6, 0.0], 42], [T.estatua + 0.5, [3.2, 2.3, 5.8], [0.0, 3.9, 0.0], 46], [T.E[9] + 0.1, [2.1, 1.85, 3.7], [0.0, 2.3, 0.3], 42],
    [T.manda + 0.2, [1.6, 4.2, -3.0], [0.5, 3.0, -20.0], 46], [T.estatua10 + 0.1, [0.4, 2.9, -16.0], [0.6, 2.5, -28.0], 44], [END - 0.45, [1.38, 2.5, -30.7], [0.93, 2.15, -31.66], 38],   // vuelta al salón…
    [END, P0, L0, 36],                                                                                                                         // …y al pergamino (bucle)
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0].toFixed(2) + ' → ' + CK[i][0].toFixed(2)); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l); return { focus: f, scale: f < 1.2 ? 0.35 * f : 0.05 * f }; }
// ---------------------------------------------------------------- RÓTULOS: los nombres de los seguidores NO están aquí (privacidad): el montaje los pinta en local con las posiciones
// que da window.labelsAt(t) (quién se ve, dónde cae su cabeza y a cuántos píxeles por metro). Aquí, en la imagen, no se dibuja nada.
function buildHudPlan() { HFONT = 'Inter'; HW = [700, 500]; }
function hudAt(t) { hudBegin(); }
window.labelsAt = function (t) {
  frame(t); const out = [], e = vpOf().elements, f = (H / 2) / Math.tan(cam.fov * Math.PI / 360), inHall = cam.position.z < -16.6 && Math.abs(cam.position.x) < 13, R = v => Math.round(v);
  PEOPLE.forEach((p, i) => { if (!p.visible || (p === S.statue)) return; const isHall = p.parent === S.hall; if (isHall !== inHall) return;
    p.updateMatrixWorld(true); const hp = p.userData.J.head.getWorldPosition(_v()).add(_v(0, 0.36 * p.userData.k, 0)), cw = e[3] * hp.x + e[7] * hp.y + e[11] * hp.z + e[15]; if (cw <= 0.3) return;
    const ppm = f / cw; if (ppm < 95) return; const sx = ((e[0] * hp.x + e[4] * hp.y + e[8] * hp.z + e[12]) / cw + 1) / 2 * W, sy = (1 - (e[1] * hp.x + e[5] * hp.y + e[9] * hp.z + e[13]) / cw) / 2 * H;
    if (sx < -150 || sx > W + 150 || sy < 0 || sy > H + 150) return; out.push([i, R(sx), R(sy), R(ppm * 10)]); });
  return { p: out, h: [] }; };
// quién es quién (índices de PEOPLE): los cuatro que nombra la voz y el oficio de algunos
window.whoIs = () => { const r = {}; PEOPLE.forEach((p, i) => { const R0 = p.userData.role; r[i] = { k: R0.k, vip: R0.vip || null }; }); return r; };
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
  await loadEnv(); buildLights(); cam.near = 0.02; cam.far = 4000; cam.updateProjectionMatrix();
  await buildScene();
  await waitLoads();
  post.uniforms.ca.value = 0.08; post.uniforms.vig.value = 0.28; post.uniforms.bloom.value = 0.14;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s); window.glLost = () => renderer.getContext().isContextLost();
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
