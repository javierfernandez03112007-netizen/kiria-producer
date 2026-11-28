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
const ASSET = '/projects/escalon_torcido/web/assets/';
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
  noche: { zen: 0x050a1c, hor: 0x1d2a4c, gnd: 0x07090f, sunD: [0.36, 0.40, -0.84], sunC: 0xdbe6ff, sunS: 0.55, stars: 1.0, fogC: 0x111a33, fogD: 0.0075,
           key: [0x9db4ff, 0.42], keyD: [0.36, 0.55, -0.84], fill: [0x4a6aa8, 0.05], hemi: [0x2a3c66, 0x0b0c12, 0.16], env: 0.12, exp: 1.0 },
  atardecer: { zen: 0x34447e, hor: 0xffa070, gnd: 0x5a4a52, sunD: [-0.86, 0.1, 0.5], sunC: 0xffb070, sunS: 1.1, stars: 0.0, clouds: 1.0, fogC: 0xe8a684, fogD: 0.004,
           key: [0xffb582, 2.7], keyD: [-0.86, 0.22, 0.5], fill: [0x8a86e0, 0.3], hemi: [0xffd2b0, 0x4a3e52, 0.55], env: 0.6, exp: 1.0 },
  salonT: { zen: 0x34447e, hor: 0xffa070, gnd: 0x5a4a52, sunD: [-0.86, 0.1, 0.5], sunC: 0xffb070, sunS: 1.1, stars: 0.0, clouds: 1.0, fogC: 0xe8a684, fogD: 0.0,
           key: [0xffa86a, 2.6], keyD: [-0.86, 0.3, 0.42], fill: [0xffd2a0, 0.3], hemi: [0xffdcb8, 0x5a4232, 0.7], env: 0.5, exp: 1.0 },
  plato: { zen: 0x04060c, hor: 0x0a0f20, gnd: 0x020305, sunD: [0.0, 0.9, 0.45], sunC: 0x000000, sunS: 0.0, stars: 0.0, fogC: 0x060a16, fogD: 0.012,
           key: [0xfff1dc, 2.1], keyD: [0.12, 0.72, 0.68], fill: [0x8fb0ff, 0.5], hemi: [0x9fb4e8, 0x0c0e14, 0.42], env: 0.5, exp: 1.0 },
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
uniform vec3 zen, hor, gnd, sunD, sunC; uniform float sunS, stars, clouds; varying vec3 vD;
float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1., 0.)), f.x), mix(h2(i + vec2(0., 1.)), h2(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
void main(){
#include <logdepthbuf_fragment>
  vec3 d = normalize(vD); float y = d.y;
  vec3 c = y > 0. ? mix(hor, zen, pow(clamp(y, 0., 1.), 0.55)) : mix(hor, gnd, clamp(-y * 6., 0., 1.));
  float s = max(dot(d, normalize(sunD)), 0.);
  c += sunC * (pow(s, 6.) * 0.35 + pow(s, 60.) * 0.9 + smoothstep(0.9993, 0.9997, s) * 6.) * sunS;
  // nubes del atardecer (día 5): capa plana proyectada; encendidas en naranja/rosa hacia el sol y malva al otro lado
  if (clouds > 0. && y > 0.0) { vec2 uv = d.xz / (y + 0.1) * 0.9; float n = fbm(uv * 1.3 + vec2(4.1, 2.3)), n2 = fbm(uv * 3.1 + vec2(1.3, 7.7));
    float cov = smoothstep(0.5, 0.72, n * 0.8 + n2 * 0.3) * smoothstep(0.015, 0.09, y) * (1. - smoothstep(0.45, 0.8, y));
    vec3 hs = normalize(vec3(sunD.x, 0., sunD.z)); float sd = max(dot(normalize(vec3(d.x, 0.0001, d.z)), hs), 0.);
    vec3 cl = mix(vec3(0.52, 0.42, 0.62), vec3(1.0, 0.56, 0.42), 0.25 + 0.75 * pow(sd, 1.5)); cl = mix(cl, vec3(1.0, 0.82, 0.6), pow(s, 10.) * 0.8);
    cl *= 0.75 + 0.45 * smoothstep(0.45, 0.85, n2); c = mix(c, cl, cov * clouds * 0.92); }
  if (stars > 0. && y > 0.02) { vec3 q = floor(d * 420.); float r = h3(q); c += vec3(0.9, 0.95, 1.) * step(0.9965, r) * stars * (0.4 + 0.6 * h3(q + 3.1)) * smoothstep(0.02, 0.25, y); }
  gl_FragColor = vec4(c, 1.); }`;
function skyMat() { return new THREE.ShaderMaterial({ uniforms: { zen: { value: C3(0) }, hor: { value: C3(0) }, gnd: { value: C3(0) }, sunD: { value: new THREE.Vector3(0, 1, 0) }, sunC: { value: C3(0) }, sunS: { value: 0 }, stars: { value: 0 }, clouds: { value: 0 } },
  vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false }); }
function skyUniforms(u, M) { u.zen.value.set(M.zen); u.hor.value.set(M.hor); u.gnd.value.set(M.gnd); u.sunD.value.set(...M.sunD).normalize(); u.sunC.value.set(M.sunC); u.sunS.value = M.sunS; u.stars.value = M.stars; u.clouds.value = M.clouds || 0; }
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
  u.sunD.value.copy(vec(M => M.sunD)); u.sunS.value = num(M => M.sunS); u.stars.value = num(M => M.stars); u.clouds.value = num(M => M.clouds || 0);
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
  const em = m.userData.envMapFixed ? ENVS[m.userData.envMapFixed] : scene.environment; if (m.envMap !== em) { m.envMap = em; m.needsUpdate = true; } m.envMapIntensity = m.userData.envFixed ?? m.userData.env0 * (m.userData.envK ?? 1) * (S.envI ?? 1); }
function envAll(root, k) { root.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) envMat(m, k); }); }
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
// ---------------------------------------------------------------- «El escalón torcido»: MANIQUÍES DE ARCILLA (formato «Dos vidas», engine/FORMATO_DOS_VIDAS.md).
// Mismas articulaciones que person() de 21_folk.js (pelvis, spine, chest, neck, head, shL/elL/wrL…, hpL/knL/anL…), así sirven sus poses y la
// cinemática inversa (reachTo). Sin cara, ni pelo, ni ropa: una sola arcilla mate (cálida y erguido el que actúa; gris azulada y encorvado el otro).
function clayMat(c) { return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.62, metalness: 0, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.5), clearcoat: 0.15, clearcoatRoughness: 0.6 }); }
function mannequin(o = {}) {
  const h = o.h ?? 1.62, k = h / 1.72, m = o.mat ?? clayMat(o.col ?? 0xf1e6d6);
  const root = new THREE.Group(), J = {}; root.userData = { J, k, h, seed: o.seed ?? 1, phase: o.phase ?? 0, mat: m };
  const jt = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
  const pel = jt('pelvis', root, 0, 0.9 * k, 0), spine = jt('spine', pel, 0, 0.0, 0), chest = jt('chest', spine, 0, 0.27 * k, 0), neck = jt('neck', chest, 0, 0.19 * k, 0), head = jt('head', neck, 0, 0.07 * k, 0);
  root.userData.base = { pelY: 0.9 * k };
  // tronco torneado (cadera → cintura → pecho → hombros), aplanado
  const prof = [[0.0, -0.07], [0.118, -0.07], [0.128, 0.0], [0.112, 0.13], [0.136, 0.27], [0.142, 0.36], [0.118, 0.425], [0.07, 0.46], [0.04, 0.47], [0.0, 0.47]];
  const tg = new THREE.LatheGeometry(prof.map(q => new THREE.Vector2(q[0] * k, q[1] * k)), 36); tg.scale(1, 1, 0.7); tg.computeVertexNormals(); const torso = pm(tg, m); spine.add(torso); root.userData.torso = torso;
  const hip = pm(new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), m); hip.scale.set(0.122 * k, 0.11 * k, 0.088 * k); hip.position.y = -0.04 * k; pel.add(hip);
  const nk = pm(new THREE.CylinderGeometry(0.036 * k, 0.044 * k, 0.13 * k, 18), m); nk.position.y = 0.02 * k; neck.add(nk);
  // cabeza: huevo liso, algo más grande que la de una persona (se lee de lejos); sin cara
  const HS = [0.105 * k, 0.128 * k, 0.112 * k], HY = 0.115 * k;
  const hd = pm(headGeo(), m); hd.scale.set(...HS); hd.position.y = HY; head.add(hd); root.userData.headMesh = hd; root.userData.HS = HS; root.userData.HY = HY;
  for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
    const sh = jt('sh' + n, chest, s * 0.128 * k, 0.128 * k, 0); sh.add(pm(new THREE.SphereGeometry(0.04 * k, 16, 12), m));
    sh.add(pm(limbG(0.038 * k, 0.03 * k, 0.26 * k), m));
    const el = jt('el' + n, sh, 0, -0.27 * k, 0); el.add(pm(limbG(0.031 * k, 0.024 * k, 0.23 * k), m));
    const wr = jt('wr' + n, el, 0, -0.24 * k, 0); const hand = pm(new THREE.SphereGeometry(1, 16, 12), m); hand.scale.set(0.028 * k, 0.048 * k, 0.018 * k); hand.position.y = -0.04 * k; wr.add(hand);
    const th = pm(limbG(0.01 * k, 0.008 * k, 0.034 * k), m); th.position.set(-s * 0.018 * k, -0.012 * k, 0.012 * k); th.rotation.z = s * 0.7; wr.add(th);
    sh.rotation.z = s * 0.06; el.rotation.x = -0.12; }
  for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
    const hp = jt('hp' + n, pel, s * 0.07 * k, -0.04 * k, 0); hp.add(pm(limbG(0.066 * k, 0.046 * k, 0.4 * k), m));
    const kn = jt('kn' + n, hp, 0, -0.42 * k, 0); kn.add(pm(limbG(0.046 * k, 0.032 * k, 0.38 * k), m));
    const an = jt('an' + n, kn, 0, -0.41 * k, 0); const ft = pm(new THREE.SphereGeometry(1, 18, 12), m); ft.scale.set(0.04 * k, 0.034 * k, 0.105 * k); ft.position.set(0, -0.02 * k, 0.045 * k); an.add(ft); }
  return root; }
// encorvado (el perfeccionista): espalda y cuello hacia delante, hombros caídos
function poseHunch(p, k = 1) { const J = p.userData.J; J.spine.rotation.x += 0.22 * k; J.chest.rotation.x += 0.12 * k; J.neck.rotation.x += 0.2 * k; J.head.rotation.x += 0.14 * k; J.shL.rotation.z -= 0.05 * k; J.shR.rotation.z += 0.05 * k; }
// pulir: las dos manos sobre el bloque (en coordenadas del mundo), la derecha frota en círculos
function posePolish(p, blockW, t, speed = 1, amp = 1) { const ph = t * 5.2 * speed, c = Math.cos(ph), s = Math.sin(ph);
  reachTo(p, 'R', blockW.clone().add(_v(0.05 + 0.05 * c * amp, 0.045 + 0.012 * s * amp, 0.03 + 0.06 * s * amp)), 1, _v(0, -1, -0.6));
  reachTo(p, 'L', blockW.clone().add(_v(-0.02, 0.035, -0.09)), 1, _v(0, -1, -0.6)); }
// arrodillado (para tender la mano por la trampilla)
function poseKneel(p, k = 1) { const J = p.userData.J, kk = p.userData.k; J.pelvis.position.y = lerp(p.userData.base.pelY, 0.5 * kk, k); J.hpL.rotation.x = -1.25 * k; J.knL.rotation.x = 1.25 * k; J.hpR.rotation.x = 0.1 * k; J.knR.rotation.x = 1.55 * k; J.anR.rotation.x = 0.4 * k; J.spine.rotation.x = 0.55 * k; J.neck.rotation.x = 0.35 * k; }
// ---------------------------------------------------------------- LA NOCHE (día 4): luna y estrellas, farolas que alumbran de verdad el suelo y las fachadas,
// ventanas encendidas y zonas que se pueden apagar (el apagón de la calle de la ferretería).
// Las farolas no son luces de three.js (cien luces serían lentísimas): son «luces baratas» solo difusas que se suman en el sombreador de
// TODOS los materiales (las 16 más cercanas a lo que mira la cámara, que se apagan poco a poco al salir de la lista: nada salta).
const NL_MAX = 16;
const NL = { V: { value: Array.from({ length: NL_MAX }, () => new THREE.Vector4()) }, C: { value: Array.from({ length: NL_MAX }, () => new THREE.Vector3()) } };
const NIGHT = { on: false, src: [], mats: [], zones: {}, spr: [] };
const NL_FRAG = `
{ vec3 nP = - vViewPosition;
  for (int i = 0; i < ${NL_MAX}; i++) { float r2 = nlV[i].w; if (r2 <= 0.0) continue; vec3 L = nlV[i].xyz - nP; float d2 = dot(L, L); if (d2 > 9.0 * r2) continue;
    float att = 1.0 / (1.0 + d2 / r2); att *= att * (1.0 - d2 / (9.0 * r2));
    float ndl = max(dot(normal, L * inversesqrt(max(d2, 1e-4))), 0.0);
    reflectedLight.directDiffuse += nlC[i] * (att * ndl) * BRDF_Lambert(material.diffuseColor); } }
`;
// fuente de luz barata: posición, color, intensidad, radio (m) y zona (para el apagón)
function nightSrc(p, color, I, r, zone = 'city') { const s = { p: p.clone ? p.clone() : _v(...p), c: new THREE.Color(color), I, r, zone }; NIGHT.src.push(s); return s; }
// un material que brilla y que se apaga con su zona (farolas, ventanas, carteles)
function nightMat(m, zone = 'city') { NIGHT.mats.push({ m, zone, I: m.emissiveIntensity ?? 1, op: m.opacity }); return m; }
function nightSprite(s, zone = 'city') { NIGHT.spr.push({ s, zone, op: s.material.opacity }); return s; }
function powerAt(zone, t) { const f = NIGHT.zones[zone]; return f ? clamp(f(t), 0, 1) : 1; }
// todos los materiales estándar reciben las luces baratas (se envuelve su onBeforeCompile, p. ej. el de las caras)
function nightify(root) {
  root.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) { if (!m.isMeshStandardMaterial || m.userData.nl || (m.transparent && m.opacity < 0.5)) continue; m.userData.nl = 1;   // el cristal no recibe luz difusa
    const prev = m.onBeforeCompile, pk = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); sh.uniforms.nlV = NL.V; sh.uniforms.nlC = NL.C;
      sh.fragmentShader = `uniform vec4 nlV[${NL_MAX}];\nuniform vec3 nlC[${NL_MAX}];\n` + sh.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + NL_FRAG); };
    m.customProgramCacheKey = function () { return (pk ? pk.call(this) : '') + '|nl'; }; m.needsUpdate = true; } });
}
// cada fotograma (con la cámara ya colocada): las 16 fuentes más cercanas, en coordenadas de la cámara; el resto, a cero
const _nlv = new THREE.Vector3(), _nlRef = new THREE.Vector3();
function nightUpdate(t) {
  if (!NIGHT.on) return;
  for (const e of NIGHT.mats) { const k = powerAt(e.zone, t); if (e.m.emissiveIntensity !== undefined) e.m.emissiveIntensity = e.I * k; if (e.m.isMeshBasicMaterial || e.m.isSpriteMaterial) e.m.opacity = e.op * k; }
  for (const e of NIGHT.spr) e.s.material.opacity = e.op * powerAt(e.zone, t);
  cam.updateMatrixWorld(); const fw = cam.getWorldDirection(_nlRef).clone();
  const ref = cam.position.clone().addScaledVector(fw, 9);                       // un punto 9 m delante de la cámara
  const sc = NIGHT.src.map(s => [s.p.distanceTo(cam.position) * 0.6 + s.p.distanceTo(ref) * 0.4 - s.r * 0.5, s]).sort((a, b) => a[0] - b[0]);
  const cut = sc.length > NL_MAX ? sc[NL_MAX][0] : 1e9;
  for (let i = 0; i < NL_MAX; i++) { const V = NL.V.value[i], C = NL.C.value[i];
    if (i >= sc.length) { V.set(0, 0, 0, 0); C.set(0, 0, 0); continue; }
    const [d, s] = sc[i], fade = cut >= 1e9 ? 1 : clamp((cut - d) / Math.max(1, cut * 0.15), 0, 1), k = s.I * powerAt(s.zone, t) * fade;
    _nlv.copy(s.p).applyMatrix4(cam.matrixWorldInverse); V.set(_nlv.x, _nlv.y, _nlv.z, s.r * s.r); C.set(s.c.r * k, s.c.g * k, s.c.b * k); }
}
// halo de una farola o una bombilla (se apaga con su zona)
function nightGlow(G, p, col, s, op, zone = 'city') { const g = glowSprite(col, s, op); g.position.copy(p); G.add(g); return nightSprite(g, zone); }
// farola de noche: la de siempre con su propia bombilla (por zona), halo y luz barata
const NIGHT_LAMP = {};
function lampMat(zone) { if (NIGHT_LAMP[zone]) return NIGHT_LAMP[zone]; return NIGHT_LAMP[zone] = nightMat(new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffc77a, emissiveIntensity: 5.5, roughness: 0.3 }), zone); }
function nightLamp(G, x, z, rotY, zone = 'city', I = 42) { const l = lampPost(); l.position.set(x, 0, z); l.rotation.y = rotY; G.add(l);
  l.traverse(o => { if (o.isMesh && o.material === T.lampGlow) o.material = lampMat(zone); });
  l.updateMatrixWorld(true); const head = l.localToWorld(_v(0.56, 3.6, 0)); nightSrc(head, 0xffc58a, I, 4.6, zone); nightGlow(G, head, 0xffcf8a, 1.3, 0.75, zone); return l; }
// ventanas: una parte de los cristales oscuros de un edificio pasa a ser ventana encendida (cálida, alguna fría como de tele)
const WIN_LIT = [];
function winLitMat(i, zone) { const k = zone + i; if (WIN_LIT[k]) return WIN_LIT[k]; const cols = [0xffc982, 0xffb46a, 0xffe0b0, 0x9fc4ff];
  return WIN_LIT[k] = nightMat(new THREE.MeshStandardMaterial({ color: 0x302418, emissive: cols[i % 4], emissiveIntensity: [2.2, 1.7, 2.6, 1.3][i % 4], roughness: 0.4 }), zone); }
function lightWindows(root, frac, seed, zone = 'city', glassM = T.glassDark) { const R = rng(seed); root.traverse(o => { if (o.isMesh && o.material === glassM && R() < frac) o.material = winLitMat(Math.floor(R() * 4), zone); }); }
// ---------------------------------------------------------------- «El escalón torcido»: LA CASA CORTADA de dos plantas («casa de muñecas») sobre una isla que flota
// en el cielo del amanecer, con un árbol detrás (se ve por la misma ventana desde las dos plantas: las estaciones pasan por ahí).
// Unidades en metros: x a la derecha, y arriba, z hacia la cámara. La fachada de delante no existe (se ve el corte de muros, forjado y tejado).
//   planta baja: suelo y = 0, techo 2,4 · forjado 2,4–2,7 (con la trampilla y el contador «DÍA 365» en su canto) · planta alta: 2,7–5,2 · tejado a dos aguas (cumbrera 6,7)
const HO = { W: 4.6, D: 3.2, WT: 0.18, H1: 2.4, SL: 0.3, H2: 2.5, RIDGE: 6.7, EAVE: 5.2 };
HO.x0 = -HO.W / 2; HO.x1 = HO.W / 2; HO.zb = -HO.D / 2; HO.zf = HO.D / 2; HO.y2 = HO.H1 + HO.SL; HO.y3 = HO.y2 + HO.H2;
const HATCH = { x: 0.12, z: 0.42, s: 0.9 };                          // trampilla del forjado (encima del banco del de abajo)
const WIN = { x: 1.2, w: 0.92, h: 1.1, y1: 0.98, y2: 0.98 + HO.y2 };   // la misma ventana en las dos plantas (borde inferior a 0,98 m de cada suelo)
// materiales por zona: la planta alta cálida, la baja fría (la vida de cada uno)
function houseMats() {
  const [wc, wh] = stuccoCanvases([232, 204, 168], 41), [bc, bh] = stuccoCanvases([118, 134, 156], 43);
  const [fc, fh] = woodCanvases([176, 128, 84], 45, 512, 7), [gc, gh] = woodCanvases([92, 94, 100], 47, 512, 7);
  return {
    wallUp: texMat(wc, wh, [2, 1.2], { r: 0.92, ns: 0.35 }), wallDn: texMat(bc, bh, [2, 1.2], { r: 0.92, ns: 0.35 }),
    floorUp: texMat(fc, fh, [2.2, 1.6], { r: 0.7, ns: 0.6 }), floorDn: texMat(gc, gh, [2.2, 1.6], { r: 0.75, ns: 0.6 }),
    cut: stdM(0xf4efe6, 0.9), cutDark: stdM(0xd9d2c6, 0.9), slab: stdM(0xcfc7bb, 0.85), frame: stdM(0xf7f3ea, 0.55),
    roof: stdM(0x9a5a44, 0.8), roofIn: stdM(0xd8c9b2, 0.9), glass: new THREE.MeshPhysicalMaterial({ color: 0xeaf2ff, roughness: 0.05, transparent: true, opacity: 0.12, depthWrite: false }),
  }; }
// caja con el frente (cara +z, la del corte) en otro material
function cutBox(w, h, d, m, cut, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [m, m, m, m, cut, m]); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; return b; }
// un muro con un hueco rectangular (ventana): cuatro piezas alrededor. Muro en el plano x–y (grosor en z)
function wallWithHole(G, xa, xb, ya, yb, z, d, hx0, hx1, hy0, hy1, m, cut) {
  const p = (x0, x1, y0, y1) => { if (x1 - x0 < 1e-3 || y1 - y0 < 1e-3) return; G.add(cutBox(x1 - x0, y1 - y0, d, m, cut, (x0 + x1) / 2, (y0 + y1) / 2, z)); };
  p(xa, xb, ya, hy0); p(xa, xb, hy1, yb); p(xa, hx0, hy0, hy1); p(hx1, xb, hy0, hy1); }
// marco de ventana con cruz, cristal y alféizar (hueco centrado en x, de y0 a y0+h, en el muro de atrás)
function windowFrame(G, x, y0, w, h, M) { const z = HO.zb - HO.WT / 2, g = new THREE.Group(); G.add(g); const t = 0.05, dz = HO.WT + 0.02;
  for (const s of [-1, 1]) { g.add(box(t, h + t, dz, M.frame, x + s * (w / 2 - t / 2), y0 + h / 2, z)); g.add(box(w, t, dz, M.frame, x, y0 + (s > 0 ? h - t / 2 : t / 2), z)); }
  g.add(box(0.03, h, 0.05, M.frame, x, y0 + h / 2, z + 0.02)); g.add(box(w, 0.03, 0.05, M.frame, x, y0 + h * 0.58, z + 0.02));
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06), M.glass); gl.position.set(x, y0 + h / 2, z - 0.02); gl.renderOrder = 2; g.add(gl);
  g.add(box(w + 0.16, 0.05, 0.2, M.frame, x, y0 - 0.025, HO.zb + 0.08)); return g; }
// la isla: tapa de hierba (cambia con las estaciones) y la panza de roca hacia abajo
function island(G) { const g = new THREE.Group(); G.add(g); const U = g.userData;
  const top = new THREE.CylinderGeometry(4.3, 4.05, 0.5, 72, 2); { const p = top.attributes.position, R = rng(3); for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
      if (r > 1) { const k = 1 + 0.06 * Math.sin(a * 5 + 1) + 0.04 * Math.sin(a * 11 + 2); p.setX(i, x * k); p.setZ(i, z * k); } } top.computeVertexNormals(); }
  U.grass = new THREE.MeshStandardMaterial({ color: 0x8b9a62, roughness: 0.95 }); const tp = new THREE.Mesh(top, U.grass); tp.position.y = -0.4; tp.receiveShadow = true; g.add(tp);
  const rock = new THREE.ConeGeometry(4.15, 5.0, 40, 10); { const p = rock.attributes.position, R = rng(5); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const n = 1 + 0.12 * Math.sin(a * 7 + y * 1.3) + 0.08 * Math.sin(a * 13 - y * 2.1) + (R() - 0.5) * 0.06; p.setX(i, x * n); p.setZ(i, z * n); } rock.computeVertexNormals(); }
  const rk = new THREE.Mesh(rock, new THREE.MeshStandardMaterial({ color: 0x7a6656, roughness: 0.95, flatShading: true })); rk.rotation.x = Math.PI; rk.position.y = -0.65 - 2.5; g.add(rk);
  // camino de losas hasta la puerta (delante, a la derecha) y matas de hierba
  const R = rng(9); for (let i = 0; i < 4; i++) { const s = box(0.5 + R() * 0.15, 0.04, 0.34 + R() * 0.1, stdM(0xb9b0a2, 0.9), 1.4 + (R() - 0.5) * 0.3, -0.13, 2.05 + i * 0.5); s.rotation.y = (R() - 0.5) * 0.4; g.add(s); }
  return g; }
// el árbol de detrás (mismo para las dos plantas): tronco y ramas siempre; copa, flores y nieve según la estación
function seasonTree(G, x, z) { const g = new THREE.Group(); g.position.set(x, -0.15, z); G.add(g); const U = g.userData, bark = stdM(0x5a4636, 0.9);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.24, 3.4, 12), bark); tr.position.y = 1.7; tr.castShadow = true; g.add(tr);
  const R = rng(17); U.br = [];
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + R() * 0.5, L = 1.2 + R() * 0.8, b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, L, 8), bark); b.geometry.translate(0, L / 2, 0);
    b.position.set(0, 2.6 + R() * 1.0, 0); b.rotation.set(0.75 * Math.sin(a), 0, -0.75 * Math.cos(a)); b.castShadow = true; g.add(b); U.br.push(b); }
  U.leaf = new THREE.MeshStandardMaterial({ color: 0x6f9a4a, roughness: 0.85, flatShading: true }); U.crown = new THREE.Group(); U.crown.position.y = 3.7; g.add(U.crown);
  for (let i = 0; i < 11; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 + R() * 0.45, 1), U.leaf); s.position.set((R() - 0.5) * 2.2, (R() - 0.3) * 1.5, (R() - 0.5) * 1.6); s.castShadow = true; U.crown.add(s); }
  U.bloom = new THREE.MeshStandardMaterial({ color: 0xf7c6d6, roughness: 0.7, flatShading: true }); U.flowers = new THREE.Group(); U.crown.add(U.flowers);
  for (let i = 0; i < 70; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08 + R() * 0.06, 0), U.bloom); const a = R() * 6.28, e = R() * 1.4 - 0.4, r = 1.25 + R() * 0.35;
    s.position.set(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r * 0.8, Math.sin(a) * Math.cos(e) * r * 0.8); U.flowers.add(s); }
  U.snowM = new THREE.MeshStandardMaterial({ color: 0xf5f8ff, roughness: 0.6 }); U.snow = [];
  for (const b of U.br) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.07, 1.0, 6, 1, false, 0, Math.PI), U.snowM); s.geometry.translate(0, 0.62, 0.02); s.rotation.y = -Math.PI / 2; b.add(s); U.snow.push(s); }
  return g; }
// las estaciones: s ∈ [0, 4) → invierno (0), primavera (1), verano (2), otoño (3) y vuelta; devuelve pesos suaves
function seasonW(s) { const u = ((s % 4) + 4) % 4, w = [0, 0, 0, 0]; const i = Math.floor(u), f = sm5(u - i); w[i] = 1 - f; w[(i + 1) % 4] = f; return w; }
const SEAS = { grass: [0xdfe5ec, 0x6f9a48, 0x637f38, 0x86763a], leaf: [0x6f9a4a, 0x8cc25a, 0x5f8f3c, 0xd9822c], crown: [0.0, 0.85, 1.0, 0.9], bloom: [0, 1, 0, 0], snow: [1, 0, 0, 0] };
function seasonMix(arr, w) { const c = new THREE.Color(0, 0, 0), t = new THREE.Color(); for (let i = 0; i < 4; i++) { t.set(arr[i]); c.r += t.r * w[i]; c.g += t.g * w[i]; c.b += t.b * w[i]; } return c; }
function seasonAt(S0, s) { const w = seasonW(s), U = S0.tree.userData;
  S0.isl.userData.grass.color.copy(seasonMix(SEAS.grass, w)); U.leaf.color.copy(seasonMix(SEAS.leaf, w));
  const cr = SEAS.crown.reduce((a, v, i) => a + v * w[i], 0); U.crown.scale.setScalar(Math.max(0.001, 0.25 + 0.75 * cr)); U.crown.visible = cr > 0.02;
  U.flowers.visible = w[1] > 0.05; U.flowers.scale.setScalar(Math.max(0.001, w[1]) / Math.max(0.25, 0.25 + 0.75 * cr));
  const sn = w[0]; for (const s of U.snow) { s.visible = sn > 0.05; s.scale.set(1, 1, Math.max(0.001, sn)); }
  S0.season = w; }
// la casa entera: muros, suelos, forjado con trampilla, tejado con el agujero por donde sale la escalera, ventanas
function buildHouse(G) { const M = houseMats(), H = {}; S.HM = M; const g = new THREE.Group(); G.add(g); H.g = g;
  const { x0, x1, zb, zf, WT, H1, SL, y2, y3 } = HO, xo0 = x0 - WT, xo1 = x1 + WT;
  // zócalo y suelos
  g.add(cutBox(HO.W + 2 * WT + 0.3, 0.16, HO.D + WT + 0.3, M.slab, M.cutDark, 0, -0.08, -WT / 2));
  g.add(cutBox(HO.W, 0.02, HO.D, M.floorDn, M.floorDn, 0, 0.01, 0));
  // muro de atrás con las dos ventanas, muros laterales
  wallWithHole(g, xo0, xo1, 0, H1, zb - WT / 2, WT, WIN.x - WIN.w / 2, WIN.x + WIN.w / 2, WIN.y1, WIN.y1 + WIN.h, M.wallDn, M.cut);
  wallWithHole(g, xo0, xo1, y2, y3, zb - WT / 2, WT, WIN.x - WIN.w / 2, WIN.x + WIN.w / 2, WIN.y2, WIN.y2 + WIN.h, M.wallUp, M.cut);
  for (const [s, xc] of [[-1, x0 - WT / 2], [1, x1 + WT / 2]]) { g.add(cutBox(WT, H1, HO.D + WT, M.wallDn, M.cut, xc, H1 / 2, -WT / 2)); g.add(cutBox(WT, y3 - y2, HO.D + WT, M.wallUp, M.cut, xc, (y2 + y3) / 2, -WT / 2)); }
  // forjado (con el hueco de la trampilla) y el suelo de arriba
  { const hx0 = HATCH.x - HATCH.s / 2, hx1 = HATCH.x + HATCH.s / 2, hz0 = HATCH.z - HATCH.s / 2, hz1 = HATCH.z + HATCH.s / 2, yc = H1 + SL / 2, zA = zb - WT, zB = zf;
    const p = (xa, xb, za, zz) => { if (xb - xa < 1e-3 || zz - za < 1e-3) return; g.add(cutBox(xb - xa, SL, zz - za, M.slab, M.cut, (xa + xb) / 2, yc, (za + zz) / 2)); };
    p(xo0, xo1, zA, hz0); p(xo0, xo1, hz1, zB); p(xo0, hx0, hz0, hz1); p(hx1, xo1, hz0, hz1);
    const fl = (xa, xb, za, zz) => { if (xb - xa < 1e-3 || zz - za < 1e-3) return; const b = box(xb - xa, 0.02, zz - za, M.floorUp, (xa + xb) / 2, y2 + 0.01, (za + zz) / 2); g.add(b); };
    fl(x0, x1, zb, hz0); fl(x0, x1, hz1, zf); fl(x0, hx0, hz0, hz1); fl(hx1, x1, hz0, hz1);
    // las dos hojas de la trampilla (bisagras a los lados; se abren hacia arriba)
    H.hatch = []; const wood = stdM(0x9c6b42, 0.75), wdk = stdM(0x6e4a2e, 0.8);
    for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(HATCH.x + s * HATCH.s / 2, y2 + 0.02, HATCH.z); g.add(piv);
      const leaf = new THREE.Group(); piv.add(leaf); const lw = HATCH.s / 2 - 0.01; leaf.add(box(lw, 0.05, HATCH.s - 0.02, wood, -s * lw / 2, -0.025, 0)); for (const zz of [-0.3, 0.3]) leaf.add(box(lw * 0.9, 0.012, 0.05, wdk, -s * lw / 2, 0.006, zz));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 16), metal(0x8a8478, 0.4)); ring.rotation.x = Math.PI / 2; ring.position.set(-s * (lw - 0.06), 0.008, 0); leaf.add(ring);
      shadowAll(leaf); H.hatch.push({ piv, s }); }
    // marco del hueco visto desde abajo
    for (const [w, d, xx, zz] of [[HATCH.s + 0.08, 0.04, HATCH.x, hz0 - 0.02], [HATCH.s + 0.08, 0.04, HATCH.x, hz1 + 0.02], [0.04, HATCH.s, hx0 - 0.02, HATCH.z], [0.04, HATCH.s, hx1 + 0.02, HATCH.z]]) g.add(box(w, 0.04, d, M.frame, xx, H1 - 0.02, zz)); }
  // tejado a dos aguas: faldón izquierdo entero; el derecho con el agujero de la escalera; triángulo de atrás
  { const run = HO.W / 2 + WT + 0.25, rise = HO.RIDGE - HO.EAVE, Lr = Math.hypot(run, rise + 0.12), ang = Math.atan2(rise + 0.12, run), dz = HO.D + WT + 0.4, zc = -WT / 2 + 0.05, th = 0.14;
    H.roofAng = ang;
    const slope = (s) => { const grp = new THREE.Group(); grp.position.set(0, HO.RIDGE + 0.06, zc); grp.rotation.z = -s * ang; g.add(grp); return grp; };
    const L = slope(-1); L.add(cutBox(Lr, th, dz, M.roof, M.cut, -Lr / 2, 0, 0)); L.add(box(Lr, 0.02, dz - 0.1, M.roofIn, -Lr / 2, -th / 2 - 0.01, -0.02));
    const Rg = slope(1); H.roofR = Rg; const ha = ROOFHOLE.a, hb = ROOFHOLE.b, hz0 = ROOFHOLE.z0, hz1 = ROOFHOLE.z1;      // agujero: de a a b metros desde la cumbrera, de z0 a z1
    const piece = (u0, u1, za, zz) => { if (u1 - u0 < 1e-3 || zz - za < 1e-3) return; Rg.add(cutBox(u1 - u0, th, zz - za, M.roof, M.cut, (u0 + u1) / 2, 0, (za + zz) / 2 - zc)); Rg.add(box(u1 - u0, 0.02, zz - za, M.roofIn, (u0 + u1) / 2, -th / 2 - 0.01, (za + zz) / 2 - zc)); };
    const zA = zc - dz / 2, zB = zc + dz / 2; piece(0, ha, zA, zB); piece(hb, Lr, zA, zB); piece(ha, hb, zA, hz0); piece(ha, hb, hz1, zB);
    // tejas rotas en el borde del agujero
    const R = rng(23), tile = stdM(0x8a4e3a, 0.8); for (let i = 0; i < 9; i++) { const u = ha + R() * (hb - ha), z = (R() < 0.5 ? hz0 : hz1) - zc + (R() - 0.5) * 0.1, tb = box(0.16, 0.03, 0.12, tile, u, th / 2 + 0.01, z); tb.rotation.set((R() - 0.5) * 0.6, R(), (R() - 0.5) * 0.6); Rg.add(tb); }
    // triángulo del muro de atrás (hastial)
    const sh = new THREE.Shape(); sh.moveTo(xo0, y3); sh.lineTo(xo1, y3); sh.lineTo(0, HO.RIDGE); sh.lineTo(xo0, y3); const gg = new THREE.ExtrudeGeometry(sh, { depth: WT, bevelEnabled: false }); gg.translate(0, 0, zb - WT);
    const gm = new THREE.Mesh(gg, [M.wallUp, M.cut]); gm.castShadow = gm.receiveShadow = true; g.add(gm);
    const ridge = box(0.16, 0.16, dz + 0.04, M.roof, 0, HO.RIDGE + 0.1, zc); ridge.rotation.z = Math.PI / 4; g.add(ridge); }
  H.win = [windowFrame(g, WIN.x, WIN.y1, WIN.w, WIN.h, M), windowFrame(g, WIN.x, WIN.y2, WIN.w, WIN.h, M)];
  // rodapiés y una lámpara de techo apagada en cada planta (detalle de casa de verdad)
  for (const [y, m] of [[0, M.frame], [y2, M.frame]]) { g.add(box(HO.W, 0.08, 0.02, m, 0, y + 0.04, zb + 0.01)); for (const s of [-1, 1]) g.add(box(0.02, 0.08, HO.D, m, s * (HO.W / 2 - 0.01), y + 0.04, 0)); }
  shadowAll(g, true, true); return H; }
const ROOFHOLE = { a: 0.17, b: 1.86, z0: -1.32, z1: -0.48 };        // el agujero por donde sale la escalera (metros por el faldón desde la cumbrera, y z)
// el contador del canto del forjado: «DÍA 365» (se repinta al cambiar)
function slabCounter(G) { const c = cnv(2048, 180), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.55, transparent: true });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(HO.W + 2 * HO.WT - 0.1, (HO.W + 2 * HO.WT - 0.1) * 180 / 2048), m); p.position.set(0, HO.H1 + HO.SL / 2, HO.zf + 0.004); G.add(p);
  const U = { c, t, m, key: '' }; p.userData = U; return p; }
function counterDraw(p, st) { const U = p.userData, key = JSON.stringify(st); if (key === U.key) return; U.key = key; const g = U.c.getContext('2d'), W = U.c.width, H = U.c.height;
  g.clearRect(0, 0, W, H); g.textBaseline = 'middle'; g.textAlign = 'center';
  g.font = '700 118px SpaceMono'; g.letterSpacing = '22px'; g.fillStyle = st.col || '#2c2a28'; g.fillText(st.txt, W / 2, H / 2 + 4); U.t.needsUpdate = true; }
// ---------------------------------------------------------------- «El escalón torcido»: LA ESCALERA (365 bloques torcidos, uno por día) y LOS MUEBLES.
// Escalera: tramo recto dentro de la planta alta (del rincón de la izquierda hacia la derecha), sale por el agujero del tejado y sigue en espiral hacia el cielo.
const ST = { N: 365, RUN: 0.26, RISE: 0.24, z: -0.9, x0: -2.0, nIn: 13, nOut: 5, hR: 1.9, hRise: 0.18, hStep: 0.34, bw: 0.4, bh: 0.2, bd: 0.62 };
// posición (centro del bloque) y rumbo de cada escalón i (0…364)
function stairAt(i) {
  const y2 = HO.y2, top = j => y2 + 0.25 + ST.RISE * j;
  if (i < ST.nIn + ST.nOut) return { p: _v(ST.x0 + ST.RUN * i, top(i) - ST.bh / 2, ST.z), yaw: 0 };
  const n = ST.nIn + ST.nOut, e = stairAt(n - 1), j = i - n + 1, dth = ST.hStep / ST.hR, th = j * dth, R = ST.hR * (1 - 0.18 * clamp(j / 300));
  // la espiral empieza donde acaba el tramo recto (θ = 0 en el lado +x del centro) y gira hacia atrás (−z)
  const cx = e.p.x - ST.hR, cz = e.p.z, x = cx + R * Math.cos(th), z = cz - R * Math.sin(th);
  return { p: _v(x, e.p.y + ST.hRise * j, z), yaw: 0 }; }
// el rumbo «hacia arriba» de la escalera (tangente) y el lateral
function stairDir(i) { const a = stairAt(Math.max(0, i - 1)).p, b = stairAt(Math.min(ST.N - 1, i + 1)).p; return b.sub(a).setY(0).normalize(); }
const STAIR = {};
function buildStairs(G) { const g = new THREE.Group(); G.add(g); STAIR.g = g;
  const geo = rboxM(ST.bw, ST.bh, ST.bd, 0.025, null, 2).geometry; geo.computeVertexNormals();
  // arcilla cálida con un poco de grano (cada bloque, su tono)
  const [cc, ch] = stuccoCanvases([236, 214, 182], 61, 256); const m = texMat(cc, ch, [1, 1], { r: 0.78, ns: 0.6 }); STAIR.m = m;
  const im = new THREE.InstancedMesh(geo, m, ST.N); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; g.add(im); STAIR.im = im;
  const R = rng(77), col = new THREE.Color(); STAIR.base = [];
  for (let i = 0; i < ST.N; i++) { const a = stairAt(i), d = stairDir(i), yaw = Math.atan2(-d.z, d.x);
    const straight = [3, 9, 16, 41, 87, 140, 222, 301].includes(i);       // «casi todos»: unos pocos salen rectos
    const tw = straight ? 0 : 1, ry = (R() - 0.5) * 0.44 * tw, rx = (R() - 0.5) * 0.14 * tw, rz = (R() - 0.5) * 0.3 * tw;
    const off = _v((R() - 0.5) * 0.06 * tw, (R() - 0.5) * 0.03 * tw, (R() - 0.5) * 0.1 * tw);
    STAIR.base.push({ p: a.p.clone().add(off), yaw, rx, ry, rz, s: 0.92 + R() * 0.16, straight });
    col.setHSL(0.08 + (R() - 0.5) * 0.03, 0.32 + R() * 0.12, 0.76 + (R() - 0.5) * 0.1); im.setColorAt(i, col); }
  im.instanceColor.needsUpdate = true; stairsAt(ST.N, 0); return g; }
// cuántos hay puestos (n, con decimales: el último va apareciendo) y el «rebobinado» (k: 0 normal … 1 recogiéndose hacia arriba)
const _so = new THREE.Object3D();
function stairsAt(n, t) { const im = STAIR.im;
  for (let i = 0; i < ST.N; i++) { const b = STAIR.base[i], u = clamp(n - i), e = u <= 0 ? 0 : 1 + Math.sin(clamp(u / 0.6) * Math.PI) * (1 - clamp(u / 0.6)) * 0.12;
    _so.position.copy(b.p); _so.position.y += (1 - eo(clamp(u * 1.4))) * 0.5;
    _so.rotation.set(b.rx, b.yaw + b.ry, b.rz, 'YXZ'); _so.scale.set(b.s, 1, 1).multiplyScalar(Math.max(0.0001, e * eo(clamp(u * 1.6)))); _so.updateMatrix(); im.setMatrixAt(i, _so.matrix); }
  im.instanceMatrix.needsUpdate = true; }
// punto de apoyo del pie en el escalón i (encima del bloque)
function stepTop(i) { const b = STAIR.base[clamp(Math.round(i), 0, ST.N - 1)]; return b.p.clone().setY(b.p.y + ST.bh / 2); }

// ---- planta baja: banco de trabajo, taburete, flexo, el bloque pulido, papeles arrugados, bocetos en la pared
const BENCH = { x: 0.66, z: 0.42, top: 0.7, L: 0.95, W: 0.6 };
const SEAT = { x: -0.36, z: 0.42, h: 0.56 };
const BLOCK0 = _v(0.24, BENCH.top + 0.11, 0.42);           // el bloque perfecto, encima del banco (centro)
function workbench(G) { const g = new THREE.Group(); g.position.set(BENCH.x, 0, BENCH.z); G.add(g); const wood = stdM(0x7f6248, 0.7), dark = stdM(0x4b3a2c, 0.8);
  g.add(box(BENCH.L, 0.06, BENCH.W, wood, 0, BENCH.top - 0.03, 0)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.05, BENCH.top - 0.06, 0.05, dark, sx * (BENCH.L / 2 - 0.06), (BENCH.top - 0.06) / 2, sz * (BENCH.W / 2 - 0.06)));
  g.add(box(BENCH.L - 0.1, 0.03, BENCH.W - 0.1, dark, 0, 0.18, 0));
  // lijas, regla y trapo
  const sand = stdM(0xc9a46a, 0.95); for (let i = 0; i < 4; i++) { const s = box(0.14, 0.004, 0.1, sand, 0.15 + i * 0.05, BENCH.top + 0.003 + i * 0.004, -0.16 + i * 0.02); s.rotation.y = i * 0.4; g.add(s); }
  const rule = box(0.32, 0.006, 0.03, metal(0xc8ccd2, 0.3), 0.28, BENCH.top + 0.004, 0.2); rule.rotation.y = 0.3; g.add(rule);
  shadowAll(g); return g; }
function stool(G) { const g = new THREE.Group(); g.position.set(SEAT.x, 0, SEAT.z); G.add(g); const w = stdM(0x6e5440, 0.75);
  ad(g, cyl(0.19, 0.19, 0.05, w, 20)).position.y = SEAT.h - 0.025; for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, l = cyl(0.018, 0.022, SEAT.h - 0.04, w, 8); l.position.set(Math.cos(a) * 0.12, (SEAT.h - 0.04) / 2, Math.sin(a) * 0.12); l.rotation.set(Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1); g.add(l); }
  shadowAll(g); return g; }
// flexo: pie, dos brazos y la pantalla; la bombilla es una luz barata fría
function deskLamp(G) { const g = new THREE.Group(); g.position.set(BENCH.x + 0.36, BENCH.top, BENCH.z - 0.18); G.add(g); const m = stdM(0x2c3036, 0.4, { metalness: 0.5 });
  ad(g, cyl(0.08, 0.09, 0.025, m, 20)).position.y = 0.012; const a1 = new THREE.Group(); a1.position.y = 0.03; a1.rotation.z = 0.5; g.add(a1); const r1 = cyl(0.012, 0.012, 0.36, m, 8); r1.position.y = 0.18; a1.add(r1);
  const a2 = new THREE.Group(); a2.position.y = 0.36; a2.rotation.z = 1.35; a1.add(a2); const r2 = cyl(0.011, 0.011, 0.32, m, 8); r2.position.y = 0.16; a2.add(r2);
  const hd = new THREE.Group(); hd.position.y = 0.32; hd.rotation.z = 0.75; a2.add(hd); const sh = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.13, 24, 1, true), stdM(0x2c3036, 0.4, { metalness: 0.5, side: THREE.DoubleSide })); sh.position.y = -0.03; hd.add(sh);
  const bulbM = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, emissive: 0xdfe9ff, emissiveIntensity: 3.0 }); const bulb = sph(0.03, bulbM, 14, 10); bulb.position.y = -0.07; hd.add(bulb);
  shadowAll(g); g.updateMatrixWorld(true); const wp = bulb.getWorldPosition(new THREE.Vector3());
  return { g, bulbM, bulb, src: nightSrc(wp.clone().add(_v(0, -0.05, 0)), 0xcfe0ff, 3.2, 1.25, 'lamp'), glow: nightGlow(G, wp, 0xe8f0ff, 0.35, 0.6, 'lamp') }; }
// el bloque perfecto: canto vivo, brillo de espejo
function perfectBlock() { const m = new THREE.MeshPhysicalMaterial({ color: 0xf6f3ee, roughness: 0.06, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.02, reflectivity: 0.6, sheen: 0 });
  const b = rboxM(ST.bw, 0.22, ST.bd * 0.6, 0.004, m, 2); b.userData.m = m; return b; }
// papeles arrugados (bolas facetadas) por el suelo: se van acumulando
const PAPER = { N: 64 };
function paperBalls(G) { const geo = new THREE.IcosahedronGeometry(0.05, 1); { const p = geo.attributes.position, R = rng(31); for (let i = 0; i < p.count; i++) { const v = _v(p.getX(i), p.getY(i), p.getZ(i)), k = 0.75 + R() * 0.5; p.setXYZ(i, v.x * k, v.y * k, v.z * k); } geo.computeVertexNormals(); }
  const m = new THREE.MeshStandardMaterial({ color: 0xf1efe8, roughness: 0.95, flatShading: true }); const im = new THREE.InstancedMesh(geo, m, PAPER.N); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; G.add(im);
  const R = rng(37); PAPER.im = im; PAPER.base = [];
  for (let i = 0; i < PAPER.N; i++) { let x, z, ok = false; for (let k = 0; k < 30 && !ok; k++) { const a = R() * Math.PI * 2, r = 0.35 + Math.pow(R(), 1.3) * 1.25; x = SEAT.x + 0.1 + Math.cos(a) * r * 1.1; z = 0.4 + Math.sin(a) * r * 0.6;
      ok = x > HO.x0 + 0.1 && x < HO.x1 - 0.1 && z > HO.zb + 0.1 && z < HO.zf - 0.15 && !(Math.abs(x - BENCH.x) < 0.55 && Math.abs(z - BENCH.z) < 0.36); }
    const s = 0.75 + R() * 0.6; PAPER.base.push({ p: _v(x, 0.05 * s, z), r: _v(R() * 6, R() * 6, R() * 6), s, d: R() }); }
  papersAt(1); return im; }
function papersAt(k) { const im = PAPER.im; for (let i = 0; i < PAPER.N; i++) { const b = PAPER.base[i], u = clamp((k * PAPER.N - i)); _so.position.copy(b.p); _so.position.y += (1 - eo(u)) * 0.6; _so.rotation.set(b.r.x, b.r.y, b.r.z); _so.scale.setScalar(Math.max(0.0001, b.s * eo(u))); _so.updateMatrix(); im.setMatrixAt(i, _so.matrix); } im.instanceMatrix.needsUpdate = true; }
// bocetos clavados en la pared de abajo (escalones dibujados, tachados en rojo)
function sketches(G) { const g = new THREE.Group(); G.add(g); const R = rng(53);
  for (let i = 0; i < 9; i++) { const w = 0.3, h = 0.21, p = signPlane(w, h, 256, (c, W, H) => { c.fillStyle = '#f3efe4'; c.fillRect(0, 0, W, H); c.strokeStyle = '#4a5260'; c.lineWidth = 3;
      c.strokeRect(W * 0.25, H * 0.3, W * 0.5, H * 0.35); c.beginPath(); c.moveTo(W * 0.25, H * 0.3); c.lineTo(W * 0.35, H * 0.18); c.lineTo(W * 0.85, H * 0.18); c.lineTo(W * 0.75, H * 0.3); c.moveTo(W * 0.85, H * 0.18); c.lineTo(W * 0.85, H * 0.53); c.lineTo(W * 0.75, H * 0.65); c.stroke();
      c.font = '700 18px SpaceMono'; c.fillStyle = '#4a5260'; c.fillText('v' + (i + 2), 12, H - 14); c.strokeStyle = 'rgba(200,40,40,0.85)'; c.lineWidth = 6; c.beginPath(); c.moveTo(W * 0.15, H * 0.15); c.lineTo(W * 0.9, H * 0.85); c.moveTo(W * 0.9, H * 0.15); c.lineTo(W * 0.15, H * 0.85); c.stroke(); }, { r: 0.9 });
    p.position.set(-1.9 + (i % 5) * 0.36 + (R() - 0.5) * 0.05, 1.3 + Math.floor(i / 5) * 0.27 + (R() - 0.5) * 0.04, HO.zb + 0.012); p.rotation.z = (R() - 0.5) * 0.12; g.add(p); }
  return g; }
// foco de teatro (el «efecto foco»): cuerpo, cono de luz visible y una luz de verdad con sombra
function theaterSpot(G) { const g = new THREE.Group(); G.add(g); const m = stdM(0x1c1e22, 0.45, { metalness: 0.6 });
  const body = new THREE.Group(); body.position.set(SEAT.x + 0.1, HO.H1 - 0.12, SEAT.z - 0.1); g.add(body);
  const can = cyl(0.12, 0.1, 0.32, m, 20); can.rotation.x = Math.PI / 2; body.add(can); const lens = sph(0.085, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3dc, emissiveIntensity: 0 }), 18, 10); lens.scale.z = 0.3; lens.position.z = 0.17; body.add(lens);
  body.rotation.x = Math.PI / 2;                 // apunta hacia abajo
  const sp = new THREE.SpotLight(0xfff1dc, 0, 6, 0.36, 0.25, 1.2); sp.position.set(SEAT.x + 0.1, HO.H1 - 0.2, SEAT.z - 0.1); sp.target.position.set(SEAT.x + 0.15, 0, SEAT.z); sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -0.0005; g.add(sp, sp.target);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.95, HO.H1 - 0.25, 40, 1, true), new THREE.ShaderMaterial({ uniforms: { k: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vU; varying vec3 vN, vV; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float k; varying vec2 vU; varying vec3 vN, vV; void main(){ float f = pow(1. - abs(dot(vN, vV)), 1.6); float a = k * (0.16 + 0.1 * (1. - vU.y)) * (1. - f * 0.7); gl_FragColor = vec4(vec3(1., 0.95, 0.85) * a, 1.); }' }));
  cone.position.set(SEAT.x + 0.12, (HO.H1 - 0.25) / 2, SEAT.z - 0.05); g.add(cone);
  return { g, body, lens, sp, cone }; }
// ---------------------------------------------------------------- «El escalón torcido»: LA HISTORIA (los tiempos salen de la voz, tiempos.json).
// Casa cortada de dos plantas en una isla que flota al amanecer. Abajo, el perfeccionista (arcilla gris azulada) pule el mismo escalón; arriba, la escalera de
// bloques torcidos que ha puesto el otro (arcilla cálida), uno cada día, sale por el tejado y sube en espiral. El efecto foco (foco de teatro, sala de siluetas que
// le miran: la mitad → uno de cada cuatro) → quieto → el año otra vez en un minuto (×1,01 cada día → ×37,8) → la trampilla se abre, luz cálida, la mano, su
// escalón perfecto como el primero y sube → «mándaselo a quien…»: se enciende el flexo y abajo hay otra persona puliendo (bucle).
let TL = {};
// ambientes de este vídeo: amanecer (siempre) y sala a oscuras (el efecto foco)
MOODS.alba = { zen: 0x3d4f88, hor: 0xffbe92, gnd: 0xe9b998, sunD: [0.16, 0.24, -0.96], sunC: 0xffc27a, sunS: 1.15, stars: 0.0, clouds: 0.85, fogC: 0xefc2a6, fogD: 0.0045,
  key: [0xffd2a0, 3.4], keyD: [0.3, 0.55, -0.78], fill: [0xaebdf0, 0.28], hemi: [0xffe2c8, 0x5a4a52, 0.4], env: 0.34, exp: 1.0 };
MOODS.teatro = { zen: 0x070a16, hor: 0x141a2e, gnd: 0x06070c, sunD: [0.16, 0.24, -0.96], sunC: 0x000000, sunS: 0.0, stars: 0.35, clouds: 0.0, fogC: 0x080a12, fogD: 0.012,
  key: [0xffd2a0, 0.06], keyD: [0.3, 0.55, -0.78], fill: [0x6a7aa8, 0.05], hemi: [0x30384e, 0x0a0b10, 0.1], env: 0.08, exp: 1.0 };
async function buildScene() {
  const LS = i => (WORDS.find(w => w.li === i) || { start: 0 }).start, LE = i => { const ws = WORDS.filter(w => w.li === i); return ws.length ? ws[ws.length - 1].end : 0; };
  const find = (w, li, exact, k = 1) => WORDS.filter(x => x.li === li && (exact ? x.n === norm(w) : x.n.startsWith(norm(w))))[k - 1];
  const W_ = (w, li, d = 0, exact = false, k = 1) => { const v = find(w, li, exact, k); if (!v) console.error('ERROR sin palabra ' + w + '_' + li); return v ? v.start - 0.03 + d : LS(li) + d; };
  const IDX = Array.from({ length: 12 }, (_, i) => i);
  TL = { end: END, L: IDX.map(LS), E: IDX.map(LE),
    abajo: W_('abajo', 1), anyo: W_('año', 1, 0, true), puliendo: W_('puliendo', 1), mismo: W_('mismo', 1), escalon1: W_('escalon', 1),
    arriba: W_('arriba', 2), puesto: W_('puesto', 2), uno2: W_('uno', 2, 0, true), cada2: W_('cada', 2), dia2: W_('dia', 2), torcidos: W_('torcidos', 2), casi: W_('casi', 2), todos: W_('todos', 2),
    abajo3: W_('abajo', 3), vago: W_('vago', 3), cerebro: W_('cerebro', 3), trampa: W_('trampa', 3), efecto: W_('efecto', 3), foco: W_('foco', 3),
    creemos: W_('creemos', 4), mundo: W_('mundo', 4), mirando: W_('mirando', 4), errores: W_('errores', 4),
    universidad: W_('universidad', 5), cornell: W_('cornell', 5), entrar: W_('entrar', 5), estudiantes: W_('estudiantes', 5), clase: W_('clase', 5), camiseta: W_('camiseta', 5), vergonzosa: W_('vergonzosa', 5),
    creian: W_('creian', 6), mitad: W_('mitad', 6), sala: W_('sala', 6), vio: W_('vio', 6, 0, true), uno6: W_('uno', 6, 0, true), cuatro: W_('cuatro', 6),
    nadie: W_('nadie', 7), mira7: W_('mira', 7, 0, true), crees: W_('crees', 7), miedo: W_('miedo', 7), mal: W_('mal', 7, 0, true), quieto7: W_('quieto', 7),
    quieto8: W_('quieto', 8), mejora: W_('mejora', 8, 0, true), mejorar: W_('mejorar', 8), ciento: W_('ciento', 8), dia8: W_('dia', 8), anyo8: W_('año', 8, 0, true), multiplica: W_('multiplica', 8), treinta: W_('treinta', 8), siete: W_('siete', 8),
    escalon9: W_('escalon', 9), torcido9: W_('torcido', 9), ridiculo: W_('ridiculo', 9), deja9b: W_('deja', 9, 0, true, 2), poco: W_('poco', 9), arriba9: W_('arriba', 9),
    manda: W_('mandaselo', 10), quien: W_('quien', 10), meses: W_('meses', 10), esperando: W_('esperando', 10), momento: W_('momento', 10), perfecto: W_('perfecto', 10) };
  // el año otra vez (L8): se recoge la escalera hasta el día 1 y vuelve a crecer hasta el 365
  TL.rw0 = TL.quieto8 - 0.1; TL.rw1 = TL.mejorar - 0.05; TL.gr0 = TL.mejorar + 0.05; TL.gr1 = TL.multiplica + 0.15;
  const G = new THREE.Group(); scene.add(G); S.G = G;
  S.isl = island(G); S.H = buildHouse(G); S.tree = seasonTree(G, WIN.x + 0.2, HO.zb - 2.1);
  S.cnt = slabCounter(G); buildFall(G);
  buildStairs(G);
  S.bench = workbench(G); S.stool = stool(G); S.lamp = deskLamp(G); S.block = perfectBlock(); G.add(S.block); S.block.position.copy(BLOCK0);
  paperBalls(G); S.sk = sketches(G); S.spot = theaterSpot(G);
  buildCast(G);
  S.glint = glowSprite(0xffffff, 0.2, 0); G.add(S.glint);
  // la luz de la trampilla abierta: foco cálido encima (con sombra: solo entra por el hueco) y un haz visible
  S.hsp = new THREE.SpotLight(0xffc98e, 0, 7, 0.62, 0.45, 1.0); S.hsp.position.set(HATCH.x - 0.15, HO.y2 + 1.6, HATCH.z - 0.35); S.hsp.target.position.set(HATCH.x + 0.05, 0, HATCH.z + 0.15);
  S.hsp.castShadow = true; S.hsp.shadow.mapSize.set(1024, 1024); S.hsp.shadow.bias = -0.0006; G.add(S.hsp, S.hsp.target);
  { const geo = new THREE.CylinderGeometry(HATCH.s * 0.7, HATCH.s * 0.86, HO.H1, 4, 1, true); geo.rotateY(Math.PI / 4);
    const m = new THREE.ShaderMaterial({ uniforms: { k: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vU; varying vec3 vN, vV; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float k; varying vec2 vU; varying vec3 vN, vV; void main(){ float f = abs(dot(vN, vV)); float a = k * (0.05 + 0.13 * vU.y) * smoothstep(0.0, 0.5, f); gl_FragColor = vec4(vec3(1., 0.8, 0.52) * a, 1.); }' });
    const sh = new THREE.Mesh(geo, m); sh.position.set(HATCH.x + 0.06, HO.H1 / 2, HATCH.z + 0.08); sh.renderOrder = 5; G.add(sh); S.shaft = sh; }
  // luz cálida de la planta alta (el sol que rebota) y fría de la baja; luz de la trampilla abierta
  nightSrc(_v(0.2, HO.y2 + 1.7, 0.2), 0xffd6a8, 1.6, 2.6, 'up'); nightSrc(_v(-1.2, HO.y2 + 0.9, 0.5), 0xffc890, 0.9, 1.8, 'up');
  nightSrc(_v(-0.6, 1.6, 0.6), 0x9fb6e0, 0.55, 2.2, 'dn');
  S.hsrc = nightSrc(_v(HATCH.x, HO.H1 - 0.25, HATCH.z), 0xffc98e, 0, 1.9, 'hatch');
  const r1 = rng(11); S.flow = [];
  envAll(scene); nightify(scene); NIGHT.on = true;
  NIGHT.zones.up = t => 1 - 0.9 * darkK(t); NIGHT.zones.dn = t => 1 - 0.95 * darkK(t) - 0.95 * outK(t); NIGHT.zones.lamp = t => lampK(t); NIGHT.zones.hatch = t => 1;
}
function stageAt(t, st) { NOW = t; lightsAt(st.l, st.p.distanceTo(st.l)); const d = darkK(t); moodMix({ alba: 1 - d, teatro: d });
  animAt(t, st); }
function fillAt(t) { return { k: 0, c: [0, 0, 0] }; }
// ---------------------------------------------------------------- «El escalón torcido»: LA CÁMARA (un solo plano, siempre moviéndose).
// La casa entera (primer fotograma = último) → se acerca a la planta baja (el que pule) → sube a la alta y mira escalera arriba hasta el cielo → baja deprisa a la
// cabeza del de abajo (cerebro, foco) → detrás de la sala de siluetas (la mitad, uno de cada cuatro) → vuelve delante (quieto) → la casa entera (el año otra vez) y
// sube con la escalera hasta el ×37 → baja a la trampilla (la mano) → mira arriba mientras sube → baja al banco (otra persona) → la casa entera.
let CK = [], CUTS = [];
function buildCam() { const T = TL, WIDE = [[0.0, 3.0, 14.6], [0.0, 3.55, 0.0], 50];
  CK = [
    [0, ...WIDE],
    [T.mismo, [0.12, 2.3, 9.6], [0.08, 1.8, 0.0], 48],                                   // se acerca a la planta baja
    [T.E[1] + 0.15, [0.3, 1.5, 5.0], [0.15, 1.05, 0.2], 44],
    [T.puesto, [0.3, 4.15, 7.0], [0.0, 4.45, -0.6], 46],                                 // la planta alta: la escalera de dentro
    [T.dia2, [0.6, 4.9, 6.2], [0.4, 5.4, -0.8], 46],
    [T.torcidos + 0.1, [0.9, 5.7, 5.9], [0.7, 6.3, -0.8], 46],                            // los ángulos de los bloques (por delante de la casa)
    [T.casi + 0.25, [1.0, 6.0, 5.6], [0.7, 6.9, -0.8], 46],
    [T.todos + 0.15, [1.2, 6.8, 5.2], [0.6, 12.5, -1.4], 48],                            // mira escalera arriba…
    [T.E[2] + 0.15, [1.5, 7.9, 4.6], [0.4, 30, -2.2], 50],                               // …hasta el cielo (él, arriba del todo)
    [T.L[3] + 0.08, [1.45, 7.8, 4.65], [0.45, 30, -2.0], 49],
    [T.abajo3 - 0.05, [0.8, 3.7, 7.2], [0.1, 2.0, 0.0], 46],                             // baja por delante de la casa
    [T.abajo3 + 0.35, [0.3, 1.45, 3.4], [0.0, 1.0, 0.3], 42],                          // al de abajo
    [T.cerebro + 0.1, [0.15, 1.4, 1.95], [-0.12, 1.1, 0.42], 38],                         // su cabeza: el cerebro
    [T.foco + 0.25, [0.32, 1.62, 2.8], [-0.02, 1.0, 0.35], 42],                            // el foco
    [T.mundo + 0.1, [0.55, 2.95, 7.8], [-0.1, 1.05, 0.5], 42],                              // detrás de la sala
    [T.errores + 0.2, [0.45, 2.7, 6.9], [-0.08, 1.0, 0.5], 40],
    [T.camiseta, [0.35, 2.55, 6.4], [-0.05, 1.15, 0.7], 40],                                // la camiseta
    [T.E[6], [0.3, 2.75, 7.0], [-0.05, 1.1, 0.6], 42],                                    // la mitad → uno de cada cuatro
    [T.miedo, [0.3, 1.4, 3.8], [0.05, 1.0, 0.3], 42],                                     // vuelve delante del de abajo: quieto
    [T.quieto7 + 0.3, [0.28, 1.35, 3.5], [0.05, 0.98, 0.3], 41],
    [T.mejorar, [0.0, 3.0, 13.6], [0.0, 3.5, 0.0], 50],                                   // la casa entera: el año otra vez
    [T.anyo8, [0.0, 4.6, 15.4], [0.0, 6.2, 0.0], 50],
    [T.siete + 0.2, [1.5, 7.9, 4.6], [0.4, 34, -2.2], 54],                                // ×37: escalera arriba
    [T.E[8] + 0.3, [0.9, 3.9, 7.6], [0.15, 1.9, 0.0], 46],                                // baja por delante de la casa
    [T.escalon9 + 0.25, [0.25, 1.1, 3.5], [0.0, 1.5, 0.4], 50],                           // la planta baja: el de abajo y la trampilla que se abre
    [T.deja9b, [0.3, 1.15, 3.1], [0.02, 1.6, 0.42], 48],                                  // se levanta y pone su escalón
    [T.poco, [0.48, 1.3, 1.75], [0.07, 1.95, 0.42], 44],                                  // las dos manos
    [T.manda + 0.3, [0.6, 0.9, 2.2], [0.05, 2.9, 0.35], 50],                               // mira arriba mientras sube
    [T.quien + 0.05, [0.5, 1.2, 2.7], [0.02, 1.0, 0.4], 46],                               // baja al banco: otra persona
    [T.perfecto, [0.15, 2.4, 8.2], [0.05, 2.0, 0.0], 48],
    [END, ...WIDE],
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0].toFixed(2) + ' → ' + CK[i][0].toFixed(2)); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { return { focus: st.p.distanceTo(st.l), scale: 0 }; }
// ---------------------------------------------------------------- «El escalón torcido»: LOS PERSONAJES. A = el perfeccionista (abajo), B = otra persona igual que aparece
// al final en su sitio (bucle: «quien lleva meses esperando el momento perfecto»), T = el que actúa (arriba). La sala de siluetas del efecto foco (16, en 4 filas de 4),
// con ojos que se encienden cuando miran; pupitres; la camiseta vergonzosa; el cerebro dentro de la cabeza transparente.
const COL = { A: 0x8f9bab, T: 0xf2e5d1, sil: 0x1d2029 };
const AUD = { rows: [1.95, 2.55, 3.15, 3.75], xs: [-1.65, -0.55, 0.55, 1.65], rise: 0.14 };
function shirtTex() { return signTex(1024, 512, (c, W, H) => { c.fillStyle = '#ffe11a'; c.fillRect(0, 0, W, H);
    // corazón rosa con purpurina y un arcoíris encima (camiseta «vergonzosa» inventada: sin personas ni marcas reales)
    const cx = W / 2, cy = H * 0.56, s = 120; c.save(); c.translate(cx, cy);
    const rb = ['#ff3b3b', '#ff9a1f', '#2fd06b', '#2f8bff', '#a64dff']; rb.forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 16; c.beginPath(); c.arc(0, -40, 175 - i * 16, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); });
    c.beginPath(); c.moveTo(0, s * 0.95); c.bezierCurveTo(-s * 1.6, -s * 0.1, -s * 0.7, -s * 1.15, 0, -s * 0.45); c.bezierCurveTo(s * 0.7, -s * 1.15, s * 1.6, -s * 0.1, 0, s * 0.95); c.fillStyle = '#ff4fa3'; c.fill();
    const R = rng(4); for (let i = 0; i < 260; i++) { const x = (R() - 0.5) * s * 2.4, y = (R() - 0.55) * s * 2; c.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.85)' : 'rgba(255,200,240,0.9)'; c.fillRect(x, y, 3, 3); }
    c.restore();
    c.fillStyle = '#ff4fa3'; c.font = '900 64px Inter'; c.textAlign = 'center'; c.fillText('¡ME ENCANTA!', cx, H * 0.18); }); }
function tshirt(p) { const J = p.userData.J, k = p.userData.k, t = shirtTex(); t.wrapS = THREE.RepeatWrapping; t.offset.x = 0.5;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }), ms = new THREE.MeshStandardMaterial({ color: 0xffe11a, roughness: 0.85 });
  const prof = [[0.124, -0.075], [0.134, 0.0], [0.119, 0.13], [0.143, 0.27], [0.149, 0.36], [0.126, 0.425], [0.077, 0.462], [0.05, 0.47]];
  const g = new THREE.LatheGeometry(prof.map(q => new THREE.Vector2(q[0] * k, q[1] * k)), 36); g.scale(1, 1, 0.72); g.computeVertexNormals(); const sh = pm(g, m); J.spine.add(sh);
  const sl = []; for (const n of ['L', 'R']) { const s = pm(limbG(0.046 * k, 0.04 * k, 0.11 * k), ms); J['sh' + n].add(s); sl.push(s); }
  return { sh, sl, set(k) { const v = Math.max(0.0001, k); sh.scale.setScalar(v); sh.visible = k > 0.002; for (const s of sl) { s.scale.setScalar(v); s.visible = k > 0.002; } } }; }
// cabeza transparente con el cerebro dentro (solo A)
function brainIn(p) { const J = p.userData.J, hd = p.userData.headMesh, HS = p.userData.HS; hd.material = hd.material.clone(); hd.material.transparent = true; p.userData.headM = hd.material;
  const g = new THREE.SphereGeometry(1, 48, 32), q = g.attributes.position; for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), z = q.getZ(i);
    const n = 1 + 0.07 * Math.sin(x * 14 + y * 6) * Math.sin(z * 12 - y * 9) + 0.05 * Math.sin(x * 23 + z * 17) - (Math.abs(x) < 0.08 ? 0.12 * (1 - Math.abs(x) / 0.08) : 0); q.setXYZ(i, x * n, y * n * 0.82, z * n * 1.05); }
  g.computeVertexNormals(); const m = new THREE.MeshStandardMaterial({ color: 0xf0a3b4, roughness: 0.45, emissive: 0xff5a7a, emissiveIntensity: 0 }); const b = new THREE.Mesh(g, m);
  b.scale.set(HS[0] * 0.78, HS[1] * 0.7, HS[2] * 0.82); b.position.set(0, p.userData.HY + HS[1] * 0.12, -HS[2] * 0.05); J.head.add(b); b.visible = false; return { b, m }; }
// silueta de la sala: maniquí oscuro sentado, con dos ojos que se encienden
function silhouette(i) { const p = mannequin({ h: 1.58 + hash(i * 3.1) * 0.12, mat: SILM }); const J = p.userData.J, HS = p.userData.HS, HY = p.userData.HY, eyes = [];
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), EYEM[i]); e.position.set(s * 0.036, HY + 0.012, HS[2] * 0.93); J.head.add(e); eyes.push(e); }
  p.userData.eyes = eyes; return p; }
let SILM = null; const EYEM = [];
function desk() { const g = new THREE.Group(), m = stdM(0x23262e, 0.7); g.add(box(0.62, 0.035, 0.42, m, 0, 0.7, 0)); for (const sx of [-1, 1]) g.add(box(0.035, 0.7, 0.36, m, sx * 0.28, 0.35, 0)); shadowAll(g); return g; }
const CAST = {};
function buildCast(G) {
  CAST.A = mannequin({ col: COL.A, h: 1.62, phase: 0.4 }); G.add(CAST.A); CAST.shirt = tshirt(CAST.A); CAST.shirt.set(0); CAST.brain = brainIn(CAST.A);
  CAST.B = mannequin({ col: COL.A, h: 1.62, phase: 0.4 }); G.add(CAST.B); CAST.B.visible = false;
  CAST.T = mannequin({ col: COL.T, h: 1.66, phase: 2.1 }); G.add(CAST.T);
  CAST.AM = CAST.A.userData.mat; CAST.A0 = new THREE.Color(COL.A); CAST.T0 = new THREE.Color(COL.T);
  // la sala: 16 siluetas sentadas mirando a la casa (de espaldas a la cámara del plano general), con pupitre
  SILM = new THREE.MeshStandardMaterial({ color: COL.sil, roughness: 0.75 }); CAST.aud = []; CAST.desks = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const i = r * 4 + c; EYEM.push(new THREE.MeshStandardMaterial({ color: 0x080808, emissive: 0xffb447, emissiveIntensity: 0 }));
    const p = silhouette(i), x = AUD.xs[c] + (hash(i * 7.7) - 0.5) * 0.18, z = AUD.rows[r] + (hash(i * 5.3) - 0.5) * 0.1, y = -0.15 + AUD.rise * r;
    p.position.set(x, y, z); p.rotation.y = Math.PI + (x - SEAT.x) * 0.06; p.userData.home = _v(x, y, z); p.userData.ry = p.rotation.y; G.add(p); CAST.aud.push(p);
    const d = desk(); d.position.set(x, y, z - 0.42); G.add(d); CAST.desks.push(d);
    const st = new THREE.Group(); ad(st, cyl(0.17, 0.17, 0.04, SILM, 16)).position.y = 0.44; ad(st, cyl(0.025, 0.025, 0.43, SILM, 8)).position.y = 0.215; st.position.set(x, y, z + 0.02); G.add(st); p.userData.seat = st; }
  // las miradas: una línea de luz de cada cabeza a A (se ven desde detrás de la sala, como en una figura de ingeniería)
  CAST.lines = []; const lg = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); lg.translate(0, 0.5, 0);
  for (let i = 0; i < 16; i++) { const m = new THREE.MeshBasicMaterial({ color: 0xffb447, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const l = new THREE.Mesh(lg, m); l.frustumCulled = false; l.renderOrder = 4; G.add(l); CAST.lines.push(l); }
  // una luz baja delante de la sala (lo que rebota del foco) para que se lean las siluetas
  CAST.audL = nightSrc(_v(0, 1.3, 1.9), 0xffd9a8, 0, 3.2, 'aud');
}
// ---------------------------------------------------------------- «El escalón torcido»: LO QUE PASA EN CADA FOTOGRAMA (todo depende solo de t: se puede saltar a cualquier tiempo).
const SEAS0 = 2.55;                                    // estación del principio y del final (finales del verano: luz dorada, hojas que empiezan a girar)
// el «sala a oscuras» del efecto foco: del foco a «nadie te mira»
function darkK(t) { return win(t, TL.foco - 0.08, 0.4) * (1 - win(t, TL.nadie + 0.15, 1.1)); }
function outK(t) { return 0; }
// el flexo: encendido siempre, salvo un instante al final (se apaga cuando se cierra la trampilla y «clic» en «quien»)
function lampK(t) { return 1 - win(t, TL.manda + 0.3, 0.12) + win(t, TL.quien - 0.04, 0.05); }
// cuántos escalones hay puestos: 365, salvo en el año otra vez (L8): se recogen deprisa y vuelven a crecer
function stairN(t) { if (t < TL.rw0 || t > TL.gr1 + 0.5) return ST.N; if (t < TL.rw1) return ST.N * (1 - eio(seg(t, TL.rw0, TL.rw1)));
  if (t < TL.gr0) return 0; const u = seg(t, TL.gr0, TL.gr1); return ST.N * Math.min(1, u < 0.18 ? 0.035 * u / 0.18 : 0.035 + 0.965 * Math.pow((u - 0.18) / 0.82, 1.15)); }
const dayOf = n => clamp(Math.ceil(n - 1e-6), 1, ST.N);
const mult = n => Math.pow(1.01, clamp(n, 0, ST.N));
// el bloque del de abajo: dónde está (en el banco; al final lo baja al suelo para subirse)
const BLOCKF = _v(0.06, 0.11, 0.46);            // en el suelo, debajo de la trampilla
function blockPos(t) { const a = win(t, TL.ridiculo - 0.1, 0.45), b = win(t, TL.deja9b - 0.35, 0.4);
  if (t >= TL.manda + 0.9) return BLOCK0.clone();      // (bucle) vuelve al banco mientras la cámara mira a la trampilla: lo tiene B
  const up = BLOCK0.clone().add(_v(-0.18, 0.18, 0.05)); const p = BLOCK0.clone().lerp(up, a); return p.lerp(BLOCKF, b); }
// A: la vida del de abajo
function animA(t) { const A = CAST.A, U = A.userData, J = U.J; const ts = t > 30 ? t - END : t;
  if (t > TL.arriba9 + 1.15) { A.visible = false; return; } A.visible = true;
  poseReset(A); A.position.set(SEAT.x, 0, SEAT.z); A.rotation.set(0, Math.PI / 2, 0);
  const stand = win(t, TL.estudiantes - 0.2, 0.7) * (1 - win(t, TL.nadie + 0.2, 0.8));           // se levanta para «entrar en clase» con la camiseta
  const up9 = win(t, TL.ridiculo - 0.3, 0.6);                                                    // se levanta para subir
  const frozen = win(t, TL.quieto7, 0.25) * (1 - win(t, TL.escalon9 + 0.2, 0.4));
  const speed = 1 + 0.9 * win(t, TL.vago - 0.1, 0.3) * (1 - win(t, TL.cerebro + 0.2, 0.5));
  const tl8 = t > TL.gr0 && t < TL.gr1 ? (t - TL.gr0) * 9 : 0;                                    // el año a cámara rápida: pule a toda velocidad
  const bp = blockPos(t);
  if (stand < 0.001 && up9 < 0.001) {                                   // sentado, puliendo
    poseSit(A, 0.08); A.position.y = SEAT.h - 0.47 * U.k; poseHunch(A, 1 + 0.25 * frozen); A.updateMatrixWorld(true);
    const pt = frozen > 0.5 ? TL.quieto7 + 0.1 : ts + tl8; posePolish(A, bp, pt, speed * (1 - frozen * 0.999), 1 - frozen);
    if (t > TL.escalon9 - 0.2) { const k = win(t, TL.escalon9 + 0.15, 0.5); J.head.rotation.x = lerp(J.head.rotation.x, -0.75, k); J.neck.rotation.x = lerp(J.neck.rotation.x, -0.35, k); J.spine.rotation.x = lerp(J.spine.rotation.x, 0.0, k); }
  } else if (up9 < 0.001) {                                             // de pie, mirando a la sala, con la camiseta
    const k = stand; A.rotation.y = lerp(Math.PI / 2, 0.15, eio(k)); A.position.x = lerp(SEAT.x, SEAT.x + 0.05, k); A.position.z = lerp(SEAT.z, SEAT.z + 0.35, k);
    poseSit(A, 0.08); A.position.y = (SEAT.h - 0.47 * U.k) * (1 - k); const J2 = J; for (const n of ['hpL', 'hpR', 'knL', 'knR']) J2[n].rotation.x *= 1 - k; J.pelvis.position.y = lerp(0.47 * U.k, U.base.pelY, k); J.spine.rotation.x = lerp(0.08, 0.06, k);
    poseHunch(A, 0.4 * (1 - k) + 0.25); J.shL.rotation.z = -0.1; J.shR.rotation.z = 0.1; J.elL.rotation.x = -0.3; J.elR.rotation.x = -0.3;
    const look = win(t, TL.creian, 0.4); J.head.rotation.y = Math.sin(t * 1.3) * 0.25 * (1 - look); J.head.rotation.x = 0.1 + 0.15 * look;
  } else {                                                              // L9: mira arriba, coge su escalón, lo pone en el suelo, se sube y le dan la mano
    const pl = win(t, TL.deja9b - 0.35, 0.4), on = win(t, TL.deja9b + 0.12, 0.3), reach = win(t, TL.poco - 0.35, 0.35), lift = eio(seg(t, TL.arriba9 - 0.05, TL.arriba9 + 1.05));
    poseSit(A, 0.08); for (const n of ['hpL', 'hpR', 'knL', 'knR']) J[n].rotation.x *= 1 - up9; J.pelvis.position.y = lerp(0.47 * U.k, U.base.pelY, up9);
    A.rotation.y = lerp(Math.PI / 2, 0.05, eio(up9)); A.position.x = lerp(SEAT.x, BLOCKF.x, on); A.position.z = lerp(SEAT.z, BLOCKF.z + 0.02, on);
    A.position.y = (SEAT.h - 0.47 * U.k) * (1 - up9) + 0.22 * eo(on) + 2.85 * lift;
    // agacharse a dejar el bloque (rodillas y espalda), luego erguido con el brazo arriba
    const bend = Math.sin(clamp(pl) * Math.PI) * (1 - on); J.spine.rotation.x = 0.7 * bend; J.hpL.rotation.x = J.hpR.rotation.x = -0.9 * bend; J.knL.rotation.x = J.knR.rotation.x = 1.4 * bend; J.pelvis.position.y -= 0.28 * bend;
    J.head.rotation.x = lerp(-0.2, -0.85, Math.max(reach, 1 - up9 * (1 - win(t, TL.ridiculo + 0.2, 0.3)))); A.updateMatrixWorld(true);
    if (on < 0.5) { reachTo(A, 'L', bp.clone().add(_v(0, 0.02, 0.17)), up9 * (1 - on * 2), _v(0, -1, -0.3)); reachTo(A, 'R', bp.clone().add(_v(0, 0.02, -0.17)), up9 * (1 - on * 2), _v(0, -1, -0.3)); }
    const hand = handMeet(t); if (reach > 0.001) reachTo(A, 'L', hand, reach, _v(0, 0, -1));
    if (reach < 0.999 && on > 0.5) { J.shR.rotation.z = 0.15; J.elR.rotation.x = -0.2; }
  }
  // color: gris azulado; se calienta al subir a la luz
  const warm = win(t, TL.poco, 1.2); CAST.AM.color.copy(CAST.A0).lerp(CAST.T0, warm);
  // la cabeza transparente con el cerebro (L3–L4)
  const br = win(t, TL.cerebro - 0.05, 0.35) * (1 - win(t, TL.mirando, 0.6)); CAST.brain.b.visible = br > 0.01; U.headM.opacity = 1 - 0.72 * br; U.headM.depthWrite = br < 0.5;
  CAST.brain.m.emissiveIntensity = 0.25 * br + 1.6 * bump(t, TL.trampa - 0.05, TL.trampa + 0.5, 0.08, 0.3) * br;
  CAST.shirt.set(pop(t, TL.camiseta - 0.05, 0.4) * (1 - win(t, TL.nadie + 0.1, 0.35)));
}
// donde se encuentran las dos manos (debajo del forjado, en la trampilla)
function handMeet(t) { const lift = eio(seg(t, TL.arriba9 - 0.05, TL.arriba9 + 1.05)); return _v(BLOCKF.x + 0.02, 2.0 + 2.85 * lift, BLOCKF.z - 0.02); }
// B: otra persona igual, en el sitio de A, solo al final (aparece mientras la cámara mira a la trampilla cerrándose)
function animB(t) { const B = CAST.B; B.visible = t > TL.manda + 0.9; if (!B.visible) return; const ts = t - END;
  poseReset(B); B.position.set(SEAT.x, SEAT.h - 0.47 * B.userData.k, SEAT.z); B.rotation.set(0, Math.PI / 2, 0); poseSit(B, 0.08); poseHunch(B, 1); B.updateMatrixWorld(true); posePolish(B, BLOCK0, ts, 1, 1); }
// T: el que actúa (arriba del todo de su escalera; en el año otra vez va subiendo; al final, tumbado en la trampilla tendiendo la mano)
function animT(t, n) { const T = CAST.T, J = T.userData.J;
  const atHatch = t > TL.escalon9 - 0.4 && t < TL.manda + 0.9;
  if (atHatch) { T.visible = true; poseReset(T); const lift = eio(seg(t, TL.arriba9 - 0.05, TL.arriba9 + 1.05)), lean = win(t, TL.escalon9, 0.6) * (1 - 0.7 * lift);
    T.rotation.set(Math.PI / 2, 0, 0); T.position.set(HATCH.x - 0.02, HO.y2 + 0.12, HATCH.z - HATCH.s / 2 - 0.05 - T.userData.base.pelY);
    J.spine.rotation.x = 1.05 * lean; J.chest.rotation.x = 0.25 * lean; J.neck.rotation.x = -0.35 * lean; J.head.rotation.x = -0.2 * lean;
    J.hpL.rotation.x = J.hpR.rotation.x = 0.05; J.shR.rotation.x = -0.4; J.elR.rotation.x = -0.6; T.updateMatrixWorld(true);
    const reach = win(t, TL.ridiculo - 0.15, 0.5); const hand = handMeet(t).add(_v(0.01, 0.06, 0)); reachTo(T, 'L', hand, reach, _v(0, 0, 1)); J.shL.rotation.z *= 1;
    if (reach < 0.999) { J.shL.rotation.x = lerp(-0.4, J.shL.rotation.x, reach); }
    return; }
  if (t > TL.manda + 0.9) { T.visible = false; return; }
  T.visible = true; poseReset(T);
  const i = Math.max(0, Math.floor(n) - 1), top = n < 1 ? _v(ST.x0 - 0.32, HO.y2, ST.z) : stepTop(i), d = stairDir(Math.min(i + 1, ST.N - 1));
  T.position.copy(top); T.rotation.set(0, Math.atan2(d.x, d.z), 0);
  // pone el bloque del día: se agacha, lo deja delante y se endereza (bucle de 1,6 s; en el año otra vez, rápido)
  const fast = t > TL.gr0 && t < TL.gr1, ph = fast ? (t * 9) % 1 : ((t + 0.4) % 1.6) / 1.6, b = Math.sin(clamp(ph / 0.7) * Math.PI);
  J.spine.rotation.x = 0.55 * b; J.hpL.rotation.x = J.hpR.rotation.x = -0.5 * b; J.knL.rotation.x = J.knR.rotation.x = 0.9 * b; J.pelvis.position.y -= 0.16 * b;
  J.shL.rotation.x = J.shR.rotation.x = -0.9 * b - 0.2; J.elL.rotation.x = J.elR.rotation.x = -0.5; J.shL.rotation.z = -0.25; J.shR.rotation.z = 0.25; breathe(T, t); }
// la sala del efecto foco: aparece en «creemos», mira (todos → la mitad → uno de cada cuatro) y se va en «nadie te mira»
const LOOK_HALF = [0, 2, 5, 7, 8, 10, 13, 15], LOOK_QUARTER = [2, 5, 8, 15];
function animAud(t) { CAST.lines.forEach(l => { l.visible = false; }); const vis = win(t, TL.creemos - 0.25, 0.5) * (1 - win(t, TL.nadie + 0.05, 0.6)); const desk = pop(t, TL.clase - 0.12, 0.45) * (1 - win(t, TL.nadie + 0.05, 0.6));
  const Ap = CAST.A.getWorldPosition(new THREE.Vector3()).add(_v(0, 1.2, 0)), half = win(t, TL.mitad - 0.1, 0.3), quarter = win(t, TL.vio - 0.05, 0.3), allK = win(t, TL.mundo - 0.1, 0.5);
  CAST.aud.forEach((p, i) => { p.visible = vis > 0.01; p.userData.seat.visible = vis > 0.01; CAST.desks[i].visible = desk > 0.01; CAST.desks[i].scale.setScalar(Math.max(0.0001, desk));
    if (!p.visible) return; const h = p.userData.home; p.position.set(h.x, h.y - 1.4 * (1 - eo(vis)), h.z); poseReset(p); poseSit(p, 0.12); p.updateMatrixWorld(true);
    // a quién mira: en L4 todos; en «la mitad», 8; en «uno de cada cuatro», 4; el resto, al pupitre
    const lk = LOOK_HALF.includes(i), lq = LOOK_QUARTER.includes(i);
    let m = allK; m = lerp(m, lk ? 1 : 0, half); m = lerp(m, lq ? 1 : 0, quarter); m *= vis;
    const ph = hash(i * 2.3) * 6; lookAtP(p, Ap, m); p.userData.J.head.rotation.x += (1 - m) * 0.45; p.userData.J.head.rotation.y += (1 - m) * Math.sin(t * 0.7 + ph) * 0.2;
    EYEM[i].emissiveIntensity = 4.5 * m * (0.85 + 0.15 * Math.sin(t * 3 + ph));
    // la línea de la mirada: de la cabeza al pecho de A (crece al empezar a mirar)
    const L = CAST.lines[i]; L.visible = m > 0.01; if (L.visible) { const a = p.userData.J.head.getWorldPosition(new THREE.Vector3()).add(_v(0, 0.08, 0)), b = Ap.clone().add(_v((hash(i) - 0.5) * 0.12, -0.25 + (hash(i * 3) - 0.5) * 0.2, 0)), d = b.clone().sub(a), len = d.length() * eo(clamp(m * 1.3));
      L.position.copy(a); L.quaternion.setFromUnitVectors(_v(0, 1, 0), d.normalize()); L.scale.set(0.006, len, 0.006); L.material.opacity = 0.75 * m; } });
  CAST.audL.I = 0.55 * vis; }
// el foco de teatro: cae del techo en «foco», se apaga después de «nadie te mira»
function animSpot(t) { const S0 = S.spot, k = darkK(t), dn = pop(t, TL.foco - 0.12, 0.35) * (1 - win(t, TL.nadie + 0.4, 0.6));
  S0.g.visible = dn > 0.003; S0.body.position.y = HO.H1 - 0.12 + (1 - dn) * 0.3; S0.body.scale.setScalar(Math.max(0.0001, dn));
  const on = win(t, TL.foco, 0.06) * (1 - win(t, TL.nadie + 0.2, 0.7)); S0.sp.intensity = 38 * on; S0.lens.material.emissiveIntensity = 6 * on; S0.cone.material.uniforms.k.value = on; S0.cone.visible = on > 0.01; }
// la trampilla: se abre en «el escalón torcido» (luz cálida que baja) y se cierra en «mándaselo»
function animHatch(t) { const o = eio(seg(t, TL.escalon9 - 0.1, TL.escalon9 + 0.7)) * (1 - eio(seg(t, TL.manda + 0.15, TL.manda + 0.7)));
  for (const h of S.H.hatch) h.piv.rotation.z = -h.s * 1.85 * o; S.hsrc.I = 5.5 * o; S.hatchK = o;
  S.shaft.visible = o > 0.01; S.shaft.material.uniforms.k.value = o; S.hsp.intensity = 26 * o; }
// el brillo que recorre el bloque perfecto al pulirlo
function animGlint(t) { const g = S.glint, ts = t > 30 ? t - END : t, ph = ((ts + 0.2) % 2.4) / 2.4, k = Math.sin(clamp(ph / 0.35) * Math.PI) * (1 - darkK(t) * 0.6) * (CAST.A.visible || CAST.B.visible ? 1 : 0);
  const bp = blockPos(t); g.position.copy(bp).add(_v(-0.16 + 0.32 * clamp(ph / 0.35), 0.075, 0.12)); g.material.opacity = 0.95 * k; g.scale.setScalar(0.12 + 0.18 * k); g.material.rotation = ts * 0.8; }
// estaciones por la ventana y en la isla
function animSeason(t, n) { const s = t > TL.rw0 && t < TL.gr1 + 0.5 ? SEAS0 - 4 + 4 * n / ST.N : SEAS0; seasonAt(S, s); }
function animAt(t, st) {
  const n = stairN(t); stairsAt(n, t);
  counterDraw(S.cnt, { txt: 'DÍA ' + dayOf(n) }); S.cnt.material.opacity = clamp((st.p.distanceTo(S.cnt.position) - 4.5) / 1.5) * (1 - 0.9 * darkK(t)); S.cnt.visible = S.cnt.material.opacity > 0.01;
  papersAt(t > TL.rw0 && t < TL.gr1 + 0.5 ? clamp(n / ST.N) : 1);
  animSeason(t, n); fallAt(t); animA(t); animB(t); animT(t, n); animAud(t); animSpot(t); animHatch(t); animGlint(t);
  S.block.position.copy(blockPos(t)); S.block.rotation.y = 0;
  S.lamp.bulbM.emissiveIntensity = 3.0 * lampK(t);
}
// ---------------------------------------------------------------- «El escalón torcido»: LAS ESTACIONES QUE CAEN (solo en el año otra vez, L8): nieve en invierno,
// pétalos en primavera y hojas en otoño alrededor de la casa (también se ven por las ventanas). Fuera del año otra vez no cae nada (el bucle no cambia).
const FALL = { N: 700, box: [-5.5, 5.5, -1.5, 10.5, -5.0, 3.2] };
let _dotT = null;
function dotTex() { if (_dotT) return _dotT; const c = cnv(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _dotT = new THREE.CanvasTexture(c); return _dotT; }
function buildFall(G) { const R = rng(91), [x0, x1, y0, y1, z0, z1] = FALL.box; S.fall = [];
  for (const [kind, col, size, n] of [['snow', 0xffffff, 0.07, FALL.N], ['petal', 0xffc2d6, 0.06, 420], ['leaf', 0xe0812c, 0.08, 420]]) {
    const pos = new Float32Array(n * 3), seed = []; for (let i = 0; i < n; i++) { const s = { x: x0 + R() * (x1 - x0), y: y0 + R() * (y1 - y0), z: z0 + R() * (z1 - z0), v: kind === 'snow' ? 0.6 + R() * 0.5 : 0.9 + R() * 0.6, ph: R() * 6.28, a: 0.15 + R() * 0.3 };
      // nada dentro de la casa (las plantas se ven limpias)
      if (s.x > HO.x0 - 0.3 && s.x < HO.x1 + 0.3 && s.z > HO.zb - 0.3 && s.z < HO.zf + 0.2) s.z = HO.zb - 0.6 - R() * 3.5;
      seed.push(s); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: col, size, map: dotTex(), transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true, fog: true });
    const p = new THREE.Points(geo, m); p.frustumCulled = false; p.visible = false; G.add(p); S.fall.push({ kind, p, seed, m }); } }
function fallAt(t) { const lap = win(t, TL.gr0 - 0.1, 0.25) * (1 - win(t, TL.gr1, 0.35)), w = S.season || [0, 0, 1, 0], [x0, x1, y0, y1] = FALL.box, Hh = y1 - y0;
  for (const F of S.fall) { const k = lap * (F.kind === 'snow' ? w[0] : F.kind === 'petal' ? w[1] : w[3]); F.p.visible = k > 0.02; F.m.opacity = 0.95 * k; if (!F.p.visible) continue;
    const a = F.p.geometry.attributes.position; F.seed.forEach((s, i) => { const y = y1 - ((y1 - s.y + s.v * t) % Hh + Hh) % Hh; a.setXYZ(i, s.x + Math.sin(t * 1.3 + s.ph) * s.a, y, s.z + Math.cos(t * 1.1 + s.ph) * s.a * 0.6); }); a.needsUpdate = true; } }
// ---------------------------------------------------------------- «El escalón torcido»: RÓTULOS (formato «Dos vidas»): en cada planta, arriba a la izquierda, lo que hay
// y cómo es, en monoespaciada; arriba a la derecha, cuánto ha crecido (×37,8 frente a ×1). Y los datos de cada frase: el ángulo de los bloques torcidos, «efecto foco»,
// Cornell, «creían: la mitad» → «de verdad: 1 de cada 4», 1,01³⁶⁵. Nada por encima de y ≈ 470 (ahí van los subtítulos).
function buildHudPlan() { HFONT = MONO; HW = [700, 400]; }
const fmt1 = x => x.toFixed(1).replace('.', ',');
// caja de rótulo: dos líneas, alineada a la izquierda o a la derecha del punto
function tag(x, y, l1, l2, a, o = {}) { if (a <= 0.01) return; hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic'; hg.letterSpacing = '3px';
  const s1 = o.s1 || 30, s2 = o.s2 || 22, right = o.right; hfont(s1); const w1 = hg.measureText(l1).width; hfont(s2, false); const w2 = l2 ? hg.measureText(l2).width : 0; const w = Math.max(w1, w2) + 30, h = l2 ? s1 + s2 + 28 : s1 + 22;
  const x0 = right ? x - w : x; hg.fillStyle = o.bg || 'rgba(16,18,24,0.58)'; rr(hg, x0, y, w, h, 10); hg.fill();
  hg.textAlign = 'left'; hfont(s1); hg.fillStyle = o.c1 || HC.white; hg.fillText(l1, x0 + 15, y + s1 + 6); if (l2) { hfont(s2, false); hg.fillStyle = o.c2 || '#C9CED6'; hg.fillText(l2, x0 + 15, y + s1 + s2 + 14); }
  hg.restore(); }
function chipC(txt, y, col, a, size = 30) { if (a <= 0.01) return; hg.save(); hg.globalAlpha = clamp(a); hg.letterSpacing = '4px'; hfont(size); const w = hg.measureText(txt).width + 44, x = W / 2 - w / 2, s = 0.9 + 0.1 * eo(clamp(a));
  hg.translate(W / 2, y); hg.scale(s, s); hg.translate(-W / 2, -y); hg.fillStyle = 'rgba(12,14,20,0.78)'; rr(hg, x, y - size * 0.95, w, size * 1.9, size * 0.95); hg.fill(); hg.strokeStyle = col; hg.lineWidth = 2.5; rr(hg, x, y - size * 0.95, w, size * 1.9, size * 0.95); hg.stroke();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(txt, W / 2, y + 2); hg.restore(); }
// visible si el punto está dentro de la pantalla (con margen) y delante de la cámara
const onScr = (P, mx = 30, y0 = 470, y1 = H - 160) => P.ok && P.x > mx && P.x < W - mx && P.y > y0 && P.y < y1;
function hudAt(t) { hudBegin(); const T = TL, n = stairN(t);
  // ---- rótulos de cada planta (siempre que la planta se vea entera de frente)
  const up = proj(_v(HO.x0 + 0.1, HO.y3 - 0.08, HO.zf)), upR = proj(_v(HO.x1 - 0.1, HO.y3 - 0.08, HO.zf)), dn = proj(_v(HO.x0 + 0.1, HO.H1 - 0.08, HO.zf)), dnR = proj(_v(HO.x1 - 0.1, HO.H1 - 0.08, HO.zf));
  const wide = (P, Q) => onScr(P) && onScr(Q) && Q.x - P.x > 380 ? clamp((Q.x - P.x - 380) / 120) : 0;
  const ku = wide(up, upR), kd = wide(dn, dnR) * (1 - darkK(t));
  const dd = dayOf(n), nTxt = dd + (dd === 1 ? ' ESCALÓN' : ' ESCALONES');
  tag(up.x + 8, up.y + 10, nTxt, 'UNO CADA DÍA · TORCIDOS', ku, { c1: '#FFF4E2' });
  tag(upR.x - 8, upR.y + 10, '×' + fmt1(mult(dd)), null, ku, { right: true, s1: 40, c1: '#FFC861' });
  const q7 = win(t, T.quieto7, 0.2) * (1 - win(t, T.escalon9, 0.4));
  tag(dn.x + 8, dn.y + 10, '1 ESCALÓN', q7 > 0.5 ? 'EL MISMO · QUIETO' : 'EL MISMO · PERFECTO', kd, { c1: '#E8EEF6', c2: q7 > 0.5 ? '#FF8A7A' : '#AFC0D6' });
  tag(dnR.x - 8, dnR.y + 10, '×1,0', null, kd, { right: true, s1: 40, c1: '#9FB6D6' });
  // ---- L2: «torcidos, casi todos»: el ángulo de unos bloques (y uno recto)
  const kt = win(t, T.torcidos - 0.05, 0.25) * (1 - win(t, T.E[2] - 0.1, 0.3));
  if (!S.calls) { const c = [], R = [], seen = new Set(); for (let i = 6; i < 17; i++) { const b = STAIR.base[i]; if (b.straight) R.push(i); else c.push(i); }
    c.sort((a, b) => Math.abs(STAIR.base[b].rz) - Math.abs(STAIR.base[a].rz)); const pickd = []; for (const i of c) { const d = Math.round(STAIR.base[i].rz * 180 / Math.PI); if (!seen.has(d) && pickd.length < 3) { seen.add(d); pickd.push(i); } } S.calls = [...pickd.sort((a, b) => a - b), ...R.slice(0, 1)]; }
  S.calls.forEach((i, j) => { const [dx, dy] = [[150, -90], [-170, -60], [160, 70], [-160, 90]][j], d = j * 0.08; const b = STAIR.base[i], P = proj(b.p.clone().add(_v(0, ST.bh / 2, 0))); if (!onScr(P, 40, 470, H - 120)) return;
    const deg = Math.round(b.rz * 180 / Math.PI), txt = b.straight ? '0°' : (deg > 0 ? '+' : '−') + Math.abs(deg) + '°';
    callout(P, txt, b.straight ? 'RECTO' : 'TORCIDO', clamp((kt - d) / 0.5) * kt, { dx, dy, len: 40, size: 38, subSize: 22, color: b.straight ? HC.teal : HC.amber }); });
  // ---- L3: el efecto foco
  chipC('EFECTO FOCO', 560, '#FFE7B8', win(t, T.efecto - 0.05, 0.25) * (1 - win(t, T.mirando, 0.4)), 34);
  // ---- L4: «nuestros errores»: un círculo rojo en el bloque
  { const k = win(t, T.errores - 0.05, 0.25) * (1 - win(t, T.L[5] - 0.2, 0.3)); if (k > 0.01) { const P = proj(blockPos(t).add(_v(0.08, 0.08, 0.1))); if (P.ok) { hg.save(); hg.globalAlpha = k; glowStroke('#FF5247', 3.5, 12); hg.beginPath(); hg.arc(P.x, P.y, 26 + 30 * (1 - eo(k)), 0, 7); hg.stroke(); noGlow();
      hg.fillStyle = '#FF5247'; hfont(26); hg.letterSpacing = '3px'; hg.textAlign = 'left'; hg.fillText('¿SE NOTA?', P.x + 40, P.y - 30); hg.restore(); } } }
  // ---- L5–L6: Cornell, «creían: la mitad» → «de verdad: 1 de cada 4»
  const kc = win(t, T.cornell - 0.1, 0.3) * (1 - win(t, T.nadie, 0.4));
  chipC('UNIVERSIDAD DE CORNELL · 2000', 540, '#EEF2F6', kc, 28);
  chipC('CREÍAN: LA MITAD (1 DE CADA 2)', 640, '#FFB547', win(t, T.mitad - 0.1, 0.3) * (1 - win(t, T.nadie, 0.4)), 28);
  chipC('DE VERDAD: 1 DE CADA 4', 730, '#62E3D4', win(t, T.cuatro - 0.15, 0.3) * (1 - win(t, T.nadie, 0.4)), 30);
  // ---- L8: el año otra vez: 1,01 elevado al día
  { const k = win(t, T.ciento - 0.1, 0.3) * (1 - win(t, T.E[8] + 0.02, 0.3)); if (k > 0.01) { const d = dayOf(n); hg.save(); hg.globalAlpha = k; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '3px';
      hg.fillStyle = 'rgba(12,14,20,0.72)'; rr(hg, W / 2 - 215, 556, 450, 84, 42); hg.fill();
      hfont(34); hg.fillStyle = '#FFF4E2'; hg.fillText('1,01', W / 2 - 46, 600); hfont(22); hg.fillText(String(d), W / 2 + 18, 578); hfont(34); hg.fillStyle = '#FFC861'; hg.fillText('= ' + fmt1(mult(d)), W / 2 + 125, 600); hg.restore(); } }
  // él, arriba del todo de su escalera (al final de L2 y en el ×37)
  { const k = win(t, T.todos - 0.2, 0.3) * (1 - win(t, T.abajo3, 0.25)); if (k > 0.01 && CAST.T.visible) {
      const P = proj(CAST.T.position.clone().add(_v(0, 0.85, 0))); if (P.ok && P.x > 40 && P.x < W - 40 && P.y > 400 && P.y < H - 200) { brackets(P, 90, 130, k, '#FFC861', 3);
        hg.save(); hg.globalAlpha = k; hfont(24); hg.letterSpacing = '3px'; hg.textAlign = 'center'; hg.fillStyle = '#FFC861'; hg.fillText('ÉL · DÍA ' + dayOf(n), P.x, P.y + 100); hg.restore(); } } }
  bigText('×37,8', W / 2, 760, 150, '#FFC861', win(t, T.treinta - 0.05, 0.3) * (1 - win(t, T.E[8] + 0.02, 0.3)), { glow: 30, dark: 24, type: false });
}
window.labelsAt = function (t) { frame(t); return { p: [], h: [], k: [] }; };
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
  nightUpdate(t);                                  // luces baratas de la noche con la cámara definitiva (también en portadas)
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
