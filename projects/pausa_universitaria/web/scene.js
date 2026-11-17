// Spot «La pausa universitaria» (17-11-2026, trabajo de clase de Javi): 40 s en HORIZONTAL (1920×1080). Una maqueta tipo casa de muñecas:
// aula, pasillo y cafetería de la facultad; el café con leche y la media tostada con tomate y aceite. Un solo plano que viaja de un sitio a otro.
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
// ---------------------------------------------------------------- EL MUNDO: una casa de muñecas (sin pared delantera). 1 unidad = 1 m. +X a la derecha, +Y arriba, +Z hacia la cámara.
// Aula x ∈ [−13, −3] (los alumnos miran a la pizarra, a la izquierda; el reloj, en la pared del fondo) · pasillo x ∈ [−3, 2] · cafetería x ∈ [2, 14].
// Pared del fondo en z = −3,5; suelo hasta z = 3. La puerta del aula está en la pared x = −3.
function fnOf(n) { try { return eval('typeof ' + n + " === 'function' ? " + n + ' : null'); } catch (e) { return null; } }
const ZB = -3.5, WH = 3.1;
const DESK = { x: -5.2, z: 1.2 };                       // el pupitre del protagonista (el más cercano a la cámara, última fila)
const CLOCK = new THREE.Vector3(-6.6, 2.4, ZB + 0.06);
const BAR = { x0: 3.4, x1: 9.2, z: -2.25, h: 0.95 };    // la barra de la cafetería (su tablero, a 0,95 m)
const CUP0 = new THREE.Vector3(4.9, BAR.h, -2.1), CUP1 = new THREE.Vector3(6.37, BAR.h, -2.0), PLATE = new THREE.Vector3(6.6, BAR.h, -2.1);
const TABLE = new THREE.Vector3(8.0, 0, 1.0);          // la mesa donde desayunan
const seg = (t, a, b) => clamp((t - a) / (b - a));
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
// ---------------------------------------------------------------- el fondo y la luz: 'dia' (aula y pasillo, luz de ventana) y 'cafe' (cafetería, más cálida).
// moodSet(nombre) pone uno; moodMix({vice: 0.3, noche: 0.7}) mezcla. Cielo de degradado (cúpula que sigue a la cámara) + reflejos (PMREM de ese cielo).
const _o = new THREE.Object3D();      // objeto de trabajo para las matrices de las instancias
const ASSET = '/projects/pausa_universitaria/web/assets/';
const ENV = { rot: 0, env: 1 };
const TEXL = new THREE.TextureLoader(), PENDING = [];
function tx(path, srgb = true, rep = null) { let ok; PENDING.push(new Promise(a => { ok = a; })); const t = TEXL.load(ASSET + path, () => ok(), undefined, () => { console.error('ERROR textura ' + path); ok(); });
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
function waitLoads() { return Promise.all(PENDING); }
const C3 = h => new THREE.Color(h);
// sky: cénit, horizonte, suelo (bajo el horizonte), sol (dirección, color, tamaño); fog: color y densidad (FogExp2, por unidad); key: sol/foco; fill; hemi: cielo, suelo, intensidad
const MOODS = {
  dia:    { zen: 0xcfe0f2, hor: 0xf3ede2, gnd: 0xe6ddd0, sunD: [0.3, 0.8, 0.5], sunC: 0xffffff, sunS: 0.0, stars: 0.0, fogC: 0xf0e9de, fogD: 0.0,
            key: [0xfff1dc, 2.2], keyD: [0.35, 0.8, 0.55], fill: [0xcfe0ff, 0.5], hemi: [0xffffff, 0xcdbfae, 0.95], env: 0.7, exp: 1.0 },
  cafe:   { zen: 0xe8d9c4, hor: 0xf6ead8, gnd: 0xe0d0b8, sunD: [0.3, 0.8, 0.5], sunC: 0xffffff, sunS: 0.0, stars: 0.0, fogC: 0xf3e6d2, fogD: 0.0,
            key: [0xffe2b8, 2.5], keyD: [-0.3, 0.75, 0.6], fill: [0xffd9b0, 0.5], hemi: [0xfff3e0, 0xc9a67c, 0.9], env: 0.8, exp: 1.0 },
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
  S.sky = new THREE.Mesh(new THREE.SphereGeometry(15000, 64, 32), skyMat()); S.sky.renderOrder = -10; S.sky.frustumCulled = false; scene.add(S.sky);
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
  sc.left = sc.bottom = -R; sc.right = sc.top = R; sc.near = Math.max(0.1, far * 0.5 - 3 * R - 60); sc.far = far * 0.5 + 3 * R + 120; sc.updateProjectionMatrix(); L.key.shadow.normalBias = R * 0.004;
  L.fill.position.copy(c).addScaledVector(L.fillD, 300); L.fill.target.position.copy(c);
}
// materiales que llevan sus propios reflejos (con intensidad propia): se les cambia el mapa al cambiar de ambiente
const ENVMATS = new Set();
function envMat(m, k) { if (!m || !m.isMeshStandardMaterial || !scene.environment) return; if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity; if (k !== undefined) m.userData.envK = k; ENVMATS.add(m);
  if (m.envMap !== scene.environment) { m.envMap = scene.environment; m.needsUpdate = true; } m.envMapIntensity = m.userData.envFixed ?? m.userData.env0 * (m.userData.envK ?? 1) * (S.envI ?? 1); }
function envAll(root, k) { root.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) envMat(m, k); }); }
// ---------------------------------------------------------------- EL DECORADO: una maqueta sin pared delantera con tres estancias seguidas: el aula, el pasillo y la cafetería.
// (Sin logotipos ni nombres oficiales: rótulos genéricos.)
let SETU = {};
const stdM = (c, r = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
function boxAt(par, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; par.add(b); return b; }
function tileTex(a, b, n = 4, joint = 'rgba(60,50,40,.18)') { return canvasTex(512, 512, (g, w, h) => { const s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * s, j * s, s, s);
  for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${hash(i * 7 + j * 3 + k) > 0.5 ? '255,255,255' : '0,0,0'},.035)`; g.fillRect(i * s + hash(k * 3.1 + i) * s, j * s + hash(k * 5.7 + j) * s, 6, 6); } }
  g.strokeStyle = joint; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); } }); }
// pupitre con su silla (el alumno mira a −x): tablero a 0,74 m; asiento a 0,42 m
function pupitre(M) { const g = new THREE.Group();
  boxAt(g, 0.5, 0.03, 0.72, M.desk, 0, 0.725, 0); boxAt(g, 0.44, 0.1, 0.62, M.leg, 0, 0.65, 0);
  for (const [x, z] of [[-0.21, -0.32], [-0.21, 0.32], [0.21, -0.32], [0.21, 0.32]]) boxAt(g, 0.03, 0.71, 0.03, M.leg, x, 0.355, z);
  const c = new THREE.Group(); c.position.x = 0.5; g.add(c); boxAt(c, 0.4, 0.03, 0.42, M.seat, 0, 0.405, 0); boxAt(c, 0.03, 0.34, 0.4, M.seat, 0.2, 0.7, 0);
  for (const [x, z] of [[-0.17, -0.18], [-0.17, 0.18], [0.19, -0.18], [0.19, 0.18]]) boxAt(c, 0.025, x > 0 ? 0.86 : 0.4, 0.025, M.leg, x, x > 0 ? 0.43 : 0.2, z);
  return g; }
// silla de madera de la cafetería (mira a +x en local)
function cafeChair(M) { const c = new THREE.Group(); boxAt(c, 0.4, 0.035, 0.4, M.wood2, 0, 0.405, 0); boxAt(c, 0.03, 0.4, 0.38, M.wood2, -0.19, 0.7, 0);
  for (const [x, z] of [[-0.17, -0.17], [-0.17, 0.17], [0.17, -0.17], [0.17, 0.17]]) boxAt(c, 0.03, x < 0 ? 0.9 : 0.4, 0.03, M.wood2, x, x < 0 ? 0.45 : 0.2, z); return c; }
function cafeTable(M) { const g = new THREE.Group(); const top = cyl(0.42, 0.42, 0.035, M.top, 40); top.position.y = 0.722; g.add(top); const p = cyl(0.035, 0.035, 0.7, M.dark, 12); p.position.y = 0.35; g.add(p); const b = cyl(0.24, 0.26, 0.03, M.dark, 24); b.position.y = 0.015; g.add(b); return g; }
function plant(M, s = 1) { const g = new THREE.Group(); const pot = cyl(0.2, 0.15, 0.36, M.pot, 20); pot.position.y = 0.18; g.add(pot); for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), M.leaf); const a = i * 2.4; l.scale.set(0.55, 1.5, 0.3); l.position.set(Math.cos(a) * 0.14, 0.62 + hash(i) * 0.3, Math.sin(a) * 0.14); l.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5); l.castShadow = true; g.add(l); } g.scale.setScalar(s); return g; }
function backpack(col) { const m = stdM(col, 0.75), g = new THREE.Group(); const b = rbox(0.18, 0.25, 0.09, m, 0.04); g.add(b); const p = rbox(0.13, 0.1, 0.03, stdM(new THREE.Color(col).multiplyScalar(0.75).getHex(), 0.75), 0.015); p.position.set(0, -0.05, -0.055); g.add(p);
  return g; }
function buildSet() {
  const g = new THREE.Group(), U = SETU = {};
  const wood = repTex(woodTex('#b98a5a', '#8a5f36', '#d6ab7a', 2), 1, 1), wood2 = repTex(woodTex('#8a5a34', '#5e3a1e', '#a8743f', 5), 1, 1);
  const M = { desk: stdM(0xd9b98a, 0.55, { map: wood }), leg: stdM(0x3f6f5e, 0.5, { metalness: 0.3 }), seat: stdM(0x4f8f7a, 0.6), wood2: stdM(0xffffff, 0.6, { map: wood2 }), top: stdM(0xf1ead9, 0.4), dark: stdM(0x26282e, 0.5, { metalness: 0.4 }),
    pot: stdM(0xc9643a, 0.8), leaf: stdM(0x3f8a4b, 0.7), white: stdM(0xf4f1ea, 0.85), frame: stdM(0x6b4a2e, 0.6), cork: stdM(0xc79a62, 0.95) };
  U.M = M;
  // ---- suelos (hasta delante de la cámara)
  const fl = (x0, x1, tex, rx, ry, col = 0xffffff, r = 0.6) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 14), stdM(col, r, { map: repTex(tex, rx, ry) })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0, ZB + 7); m.receiveShadow = true; g.add(m); return m; };
  fl(-16, -3, tileTex('#d9d2c4', '#d3ccbd', 4), 6.5, 7); fl(-3, 2, tileTex('#e9dcc6', '#c98f6a', 4), 2.5, 7); fl(2, 17, woodTex('#c79a66', '#9a6f42', '#dcb382', 7), 5, 5, 0xffffff, 0.5);
  // ---- pared del fondo (tres colores) con su zócalo, y paredes laterales
  const wallB = (x0, x1, up, low, hl = 1.05) => { boxAt(g, x1 - x0, WH - hl, 0.16, stdM(up, 0.9), (x0 + x1) / 2, hl + (WH - hl) / 2, ZB - 0.08); boxAt(g, x1 - x0, hl, 0.18, stdM(low, 0.7), (x0 + x1) / 2, hl / 2, ZB - 0.07); boxAt(g, x1 - x0, 0.05, 0.2, M.white, (x0 + x1) / 2, hl, ZB - 0.06); };
  wallB(-13, -3, 0xf2ead8, 0x7fae9b); wallB(-3, 2, 0xf6f1e6, 0x5b86b8); wallB(2, 14, 0x2f5d50, 0x24463d, 0.0001);
  boxAt(g, 0.16, WH, 6.6, stdM(0xf2ead8, 0.9), -13.08, WH / 2, ZB + 3.3); boxAt(g, 0.16, WH, 6.6, stdM(0xe9dcc4, 0.9), 14.08, WH / 2, ZB + 3.3);
  // pared aula | pasillo (x = −3) con el hueco de la puerta en z ∈ [0,4, 1,6]; pared pasillo | cafetería (x = 2), abierta por delante
  const wA = stdM(0xf2ead8, 0.9); boxAt(g, 0.14, WH, 3.9, wA, -3, WH / 2, ZB + 1.95); boxAt(g, 0.14, WH, 1.2, wA, -3, WH / 2, 2.2); boxAt(g, 0.14, WH - 2.1, 1.2, wA, -3, 2.1 + (WH - 2.1) / 2, 1.0);
  for (const z of [0.38, 1.62]) boxAt(g, 0.2, 2.12, 0.06, M.frame, -3, 1.06, z); boxAt(g, 0.2, 0.06, 1.3, M.frame, -3, 2.13, 1.0);
  { const d = boxAt(g, 0.05, 2.05, 1.15, stdM(0x8a5a34, 0.55, { map: wood2 }), -2.88, 1.03, -0.22); d.rotation.y = 0.06; const k = cyl(0.025, 0.025, 0.1, metal(0xd9c27a, 0.3), 10); k.rotation.z = Math.PI / 2; k.position.set(-2.82, 1.0, -0.7); g.add(k); }
  boxAt(g, 0.14, WH, 3.1, stdM(0xf6f1e6, 0.9), 2, WH / 2, ZB + 1.55);
  // techo (no da sombra: la luz entra como en una maqueta) con pantallas de luz
  { const c = new THREE.Mesh(new THREE.PlaneGeometry(27.3, 13), new THREE.MeshStandardMaterial({ color: 0xf7f3ea, roughness: 0.95, emissive: 0xf7f3ea, emissiveIntensity: 0.32 })); c.rotation.x = Math.PI / 2; c.position.set(0.5, WH, ZB + 6.5); g.add(c);
    for (const x of [-11, -8, -5, -0.5, 4.5, 8, 11.5]) for (const z of [-1.8, 1.2, 4.2]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(x > 2 ? 0xffe2b8 : 0xffffff).multiplyScalar(1.5), toneMapped: false })); p.rotation.x = Math.PI / 2; p.position.set(x, WH - 0.01, z); g.add(p); } }
  // ================= AULA
  // pizarra (pared izquierda) con una gráfica de oferta y demanda a tiza
  { const t = canvasTex(1024, 360, (c, w, h) => { c.fillStyle = '#2f5a48'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(120, 40); c.lineTo(120, 300); c.lineTo(460, 300); c.stroke(); c.beginPath(); c.moveTo(150, 80); c.quadraticCurveTo(250, 250, 430, 270); c.stroke(); c.strokeStyle = 'rgba(255,230,140,.9)'; c.beginPath(); c.moveTo(150, 280); c.quadraticCurveTo(300, 230, 430, 70); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '700 34px Inter, sans-serif'; c.fillText('P', 84, 60); c.fillText('Q', 450, 340); c.fillText('O', 440, 60); c.fillText('D', 440, 258); c.font = '700 46px Inter, sans-serif'; c.fillText('Tema 7', 560, 90);
      c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(560, 140 + i * 38); c.lineTo(560 + 260 + hash(i) * 150, 140 + i * 38); c.stroke(); } });
    const b = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.45), stdM(0xffffff, 0.85, { map: t })); b.rotation.y = Math.PI / 2; b.position.set(-12.985, 1.72, -0.6); g.add(b); const fr = boxAt(g, 0.05, 1.57, 4.32, M.frame, -12.99, 1.72, -0.6); fr.position.x = -13.0; boxAt(g, 0.1, 0.04, 4.2, M.frame, -12.93, 0.97, -0.6); }
  boxAt(g, 0.7, 0.05, 1.5, M.desk, -11.7, 0.76, -0.6); boxAt(g, 0.62, 0.74, 1.4, stdM(0xa9805a, 0.6, { map: wood }), -11.7, 0.37, -0.6);
  // ventanas y reloj (pared del fondo)
  for (const x of [-10.6, -8.5, -4.6]) { boxAt(g, 1.5, 1.4, 0.06, M.white, x, 1.95, ZB + 0.02); const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 1.24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfe0ff).multiplyScalar(1.15), toneMapped: false })); gl.position.set(x, 1.95, ZB + 0.055); g.add(gl); boxAt(g, 0.04, 1.26, 0.03, M.white, x, 1.95, ZB + 0.06); boxAt(g, 1.36, 0.04, 0.03, M.white, x, 1.95, ZB + 0.06); }
  { const c = new THREE.Group(); c.position.copy(CLOCK); g.add(c); const rim = cyl(0.25, 0.25, 0.05, M.dark, 40); rim.rotation.x = Math.PI / 2; c.add(rim);
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.225, 40), stdM(0xffffff, 0.5, { map: canvasTex(256, 256, (q, w) => { q.fillStyle = '#fbfaf5'; q.fillRect(0, 0, w, w); q.translate(w / 2, w / 2); for (let i = 0; i < 60; i++) { q.save(); q.rotate(i / 60 * 6.2832); q.fillStyle = '#22252b'; q.fillRect(-(i % 5 ? 1 : 3), -118, i % 5 ? 2 : 6, i % 5 ? 8 : 20); q.restore(); } }) })); f.position.z = 0.027; c.add(f);
    const hand = (l, w, col) => { const p = new THREE.Group(); const h = new THREE.Mesh(new THREE.BoxGeometry(w, l, 0.006), stdM(col, 0.5)); h.position.y = l / 2 - 0.02; p.add(h); p.position.z = 0.034; c.add(p); return p; };
    U.hH = hand(0.12, 0.018, 0x22252b); U.hM = hand(0.18, 0.012, 0x22252b); U.hS = hand(0.2, 0.005, 0xd23a2a); const cap = cyl(0.014, 0.014, 0.02, M.dark, 12); cap.rotation.x = Math.PI / 2; cap.position.z = 0.04; c.add(cap); }
  // pupitres: 4 columnas × 3 filas (el del protagonista: DESK)
  U.desks = []; for (const x of [DESK.x, -6.9, -8.6, -10.3]) for (const z of [1.2, -0.5, -2.2]) { const p = pupitre(M); p.position.set(x, 0, z); g.add(p); U.desks.push(p); }
  // corcho con papeles
  const cork = (x, y, w, h) => { boxAt(g, w + 0.08, h + 0.08, 0.03, M.frame, x, y, ZB + 0.015); boxAt(g, w, h, 0.03, M.cork, x, y, ZB + 0.025); for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.27), stdM([0xffffff, 0xffe9a8, 0xcfe8ff, 0xffd0d0, 0xd8f5d0][i % 5], 0.9)); p.position.set(x - w / 2 + 0.16 + (i % 5) * (w - 0.3) / 4, y + (i < 5 ? 0.17 : -0.17) * (h > 0.7 ? 1 : 0), ZB + 0.045); p.rotation.z = (hash(i * 3.3) - 0.5) * 0.25; g.add(p); } };
  cork(-6.6, 1.45, 1.3, 0.8);
  // ================= PASILLO
  cork(-1.4, 1.75, 1.7, 0.9);
  { const s = plateText(1.35, 0.34, [['CAFETERÍA  →', 0.56, 0.53]], { fg: '#ffffff', bg: '#2f5d50', weight: 900, px: 768 }); s.position.set(0.95, 2.35, ZB + 0.03); g.add(s); boxAt(g, 1.41, 0.4, 0.02, M.white, 0.95, 2.35, ZB + 0.012); }
  { const b = new THREE.Group(); boxAt(b, 1.5, 0.06, 0.42, M.wood2, 0, 0.45, 0); for (const x of [-0.65, 0.65]) boxAt(b, 0.05, 0.45, 0.4, M.dark, x, 0.225, 0); b.position.set(-1.4, 0, ZB + 0.35); g.add(b); }
  { const p = plant(M, 1.25); p.position.set(1.35, 0, ZB + 0.5); g.add(p); }
  // ================= CAFETERÍA
  // barra: cuerpo de listones y tablero de madera
  { const L = BAR.x1 - BAR.x0, cx = (BAR.x0 + BAR.x1) / 2, sl = canvasTex(512, 256, (c, w, h) => { c.fillStyle = '#e7dcc8'; c.fillRect(0, 0, w, h); for (let i = 0; i < 32; i++) { c.fillStyle = i % 2 ? '#d9cbb2' : '#efe6d4'; c.fillRect(i * 16, 0, 14, h); } });
    boxAt(g, L, BAR.h - 0.05, 0.62, stdM(0xffffff, 0.7, { map: repTex(sl, 3, 1) }), cx, (BAR.h - 0.05) / 2, BAR.z); boxAt(g, L + 0.12, 0.05, 0.8, stdM(0xc9b5a2, 0.45, { map: repTex(woodTex('#8a5a34', '#5e3a1e', '#a8743f', 9), 4, 0.6) }), cx, BAR.h - 0.025, BAR.z + 0.02); boxAt(g, L, 0.1, 0.6, M.dark, cx, 0.05, BAR.z + 0.03); }
  // estantes con tazas y botellas, pizarra del desayuno (sin precios) y lámparas
  for (const y of [1.55, 2.0]) { boxAt(g, 2.6, 0.035, 0.24, M.wood2, 8.0, y, ZB + 0.13); for (let i = 0; i < 11; i++) { const k = hash(i * 3.7 + y); const o = y < 1.8 ? lathe([[0, 0], [0.032, 0], [0.042, 0.075], [0.038, 0.075], [0.03, 0.01], [0, 0.008]], 16, stdM(0xfbfaf6, 0.3)) : cyl(0.03, 0.035, 0.2 + k * 0.08, stdM([0x7a9a3a, 0xc9742a, 0x8a2a2a, 0xd9c27a][i % 4], 0.25), 12); o.position.set(6.85 + i * 0.23, y + 0.018 + (y < 1.8 ? 0 : 0.1 + k * 0.04), ZB + 0.13); g.add(o); } }
  { const t = canvasTex(768, 512, (c, w, h) => { c.fillStyle = '#23262b'; c.fillRect(0, 0, w, h); c.fillStyle = '#f6efe0'; c.textAlign = 'center'; c.font = '900 92px Inter, sans-serif'; c.fillText('DESAYUNOS', w / 2, 120); c.fillRect(160, 150, w - 320, 5);
      c.font = '700 54px Inter, sans-serif'; c.fillStyle = '#ffd98a'; c.fillText('Café con leche', w / 2, 240); c.fillStyle = '#f6efe0'; c.fillText('+', w / 2, 305); c.fillStyle = '#ff9d7a'; c.fillText('Media tostada', w / 2, 375); c.font = '500 40px Inter, sans-serif'; c.fillStyle = '#f6efe0'; c.fillText('con tomate y aceite', w / 2, 435); });
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), stdM(0xffffff, 0.9, { map: t })); b.position.set(4.6, 2.0, ZB + 0.04); g.add(b); boxAt(g, 1.58, 1.08, 0.03, M.frame, 4.6, 2.0, ZB + 0.015); }
  { const s = plateText(2.3, 0.42, [['CAFETERÍA', 0.8, 0.53]], { fg: '#f6efe0', weight: 900, px: 768 }); s.position.set(11.6, 2.45, ZB + 0.03); g.add(s); }
  U.lamps = []; boxAt(g, 5.2, 0.03, 0.03, M.dark, 6.3, 2.95, -2.15); for (const x of [3.75, 8.85]) boxAt(g, 0.03, 0.03, 1.35, M.dark, x, 2.95, -2.82);
  for (const x of [4.4, 5.65, 6.9, 8.15]) { boxAt(g, 0.008, 0.75, 0.008, M.dark, x, 2.57, -2.15); const sh = lathe([[0.02, 0.16], [0.05, 0.15], [0.16, 0.0], [0.15, 0.0], [0.045, 0.14], [0.02, 0.14]], 28, stdM(0x1f4a40, 0.5, { side: THREE.DoubleSide })); sh.position.set(x, 2.06, -2.15); g.add(sh);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(2.2), toneMapped: false })); bl.position.set(x, 2.08, -2.15); g.add(bl); U.lamps.push(bl); }
  { const l = new THREE.PointLight(0xffd2a0, 5, 5, 1.6); l.position.set(6.4, 1.95, -1.75); g.add(l); const l2 = new THREE.PointLight(0xffd2a0, 3, 5, 1.6); l2.position.set(4.8, 1.95, -1.75); g.add(l2); }
  // naranjas en un frutero y vasos apilados
  { const b = lathe([[0, 0], [0.07, 0], [0.16, 0.08], [0.15, 0.08], [0.07, 0.015], [0, 0.012]], 28, stdM(0xe9e2d2, 0.5)); b.position.set(8.55, BAR.h, -2.2); g.add(b); const o = stdM(0xf08a1c, 0.55); for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 12), o); const a = i * 1.05; s.position.set(8.55 + (i < 6 ? Math.cos(a) * 0.075 : 0), BAR.h + (i < 6 ? 0.085 : 0.15), -2.2 + (i < 6 ? Math.sin(a) * 0.075 : 0)); s.castShadow = true; g.add(s); } }
  // mesas: la de los protagonistas (TABLE) y otras tres
  for (const [x, z] of [[TABLE.x, TABLE.z], [11.3, 1.9], [12.5, -0.9], [10.6, -1.9]]) { const t = cafeTable(M); t.position.set(x, 0, z); g.add(t); for (const sd of [-1, 1]) { const c = cafeChair(M); c.position.set(x + sd * 0.62, 0, z); c.rotation.y = sd < 0 ? 0 : Math.PI; g.add(c); } }
  { const p = plant(M, 1.5); p.position.set(13.3, 0, ZB + 0.6); g.add(p); const p2 = plant(M, 1.1); p2.position.set(2.6, 0, ZB + 0.5); g.add(p2); }
  return g;
}
// lo que se mueve del decorado: el reloj (casi en punto: da la hora cuando suena el timbre)
function setAt(t, o = {}) { const U = SETU, bell = o.bell ?? 2.9, s = 60 - bell + t, m = 59 + s / 60;
  U.hS.rotation.z = -Math.floor(s) / 60 * Math.PI * 2 - (s % 1 < 0.12 ? 0 : 0); U.hM.rotation.z = -(t < bell ? 59 : 60) / 60 * Math.PI * 2 - (t >= bell ? 0 : 0); U.hH.rotation.z = -(10 + (t < bell ? 59 : 60) / 60) / 12 * Math.PI * 2; }
// ---------------------------------------------------------------- los actores: muñecos de maqueta (con ropa aparte del cuerpo, para que la ropa pueda quedarse sola),
// coches (deportivo, berlina y patrulla con su barra de luces) y los haces de los focos. El frente de un muñeco es +z; el de un coche, +x.
function gtaDoll(o = {}) {
  const mk = (c, r = 0.62) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const mSkin = o.skinMat || mk(o.skin ?? 0xd9a27c), mShirt = o.shirtMat || mk(o.shirt ?? 0xff7a2a), mPants = o.pantsMat || mk(o.pants ?? 0xf1ede2), mShoe = o.shoeMat || mk(o.shoe ?? 0x24242a, 0.5), mHair = o.hairMat || mk(o.hair ?? 0x4a3020, 0.8);
  const d = new THREE.Group(), R = new THREE.Group(), J = {}, skin = [], cloth = []; d.add(R);
  const cap = (r, h, m, list) => { const x = new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 6, 14), m); list.push(x); return x; };
  const pivot = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  J.hip = pivot(R, 0, 0.5, 0);
  const pel = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), mPants); pel.scale.set(1.3, 0.8, 0.9); J.hip.add(pel); cloth.push(pel);
  J.chest = pivot(J.hip, 0, 0.05, 0); const tor = cap(0.085, 0.22, mShirt, cloth); tor.position.y = 0.17; tor.scale.set(1.25, 1, 0.8); J.chest.add(tor);
  J.neck = pivot(J.chest, 0, 0.36, 0); const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.06, 10), mSkin); nk.position.y = 0.0; J.neck.add(nk); skin.push(nk);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 18), mSkin); head.scale.set(0.9, 1.1, 0.95); head.position.y = 0.08; J.neck.add(head); skin.push(head); J.head = head;
  if (o.hairStyle !== 'none') { const hr = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), mHair); hr.scale.set(0.93, 1.1, 1.0); hr.position.set(0, 0.085, -0.008); hr.rotation.x = -0.25; J.neck.add(hr); skin.push(hr);
    if (o.hairStyle === 'ponytail') { const pt = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.14, 4, 10), mHair); pt.position.set(0, 0.06, -0.1); pt.rotation.x = 0.5; J.neck.add(pt); skin.push(pt); } }
  for (const sd of [-1, 1]) {
    const sh = pivot(J.chest, sd * 0.13, 0.31, 0); const ua = cap(0.034, 0.13, mShirt, cloth); ua.position.y = -0.085; sh.add(ua);
    const el = pivot(sh, 0, -0.19, 0); const la = cap(0.028, 0.13, mSkin, skin); la.position.y = -0.085; el.add(la);
    const hand = pivot(el, 0, -0.19, 0); const hm = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), mSkin); hand.add(hm); skin.push(hm);
    const hp = pivot(J.hip, sd * 0.07, -0.03, 0); const ul = cap(0.044, 0.18, mPants, cloth); ul.position.y = -0.12; hp.add(ul);
    const kn = pivot(hp, 0, -0.25, 0); const ll = cap(0.038, 0.17, mPants, cloth); ll.position.y = -0.11; kn.add(ll);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.15), mShoe); ft.position.set(0, -0.225, 0.035); kn.add(ft); cloth.push(ft);
    J[sd < 0 ? 'shL' : 'shR'] = sh; J[sd < 0 ? 'elL' : 'elR'] = el; J[sd < 0 ? 'hL' : 'hR'] = hand; J[sd < 0 ? 'hpL' : 'hpR'] = hp; J[sd < 0 ? 'knL' : 'knR'] = kn;
  }
  R.scale.setScalar(o.scale ?? 1.68);
  d.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  d.userData = { J, R, skin, cloth, s0: o.scale ?? 1.68 }; return d;
}
// gorra y gafas de sol (se cuelgan del cuello: quedan en la cabeza)
function dollCap(col = 0x2a6bd6) { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 });
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.083, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), m); c.scale.set(0.95, 0.95, 1.02); g.add(c);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 20, 1, false, -Math.PI / 2, Math.PI), m); b.scale.set(1, 1, 1.25); b.position.set(0, 0.006, 0.06); g.add(b); g.position.set(0, 0.105, 0.0); g.traverse(x => { if (x.isMesh) x.castShadow = true; }); return g; }
function dollGlasses() { const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0x0c0c12, roughness: 0.08, metalness: 0.5, clearcoat: 1 });
  for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.034, 0.012), m); l.position.set(sx * 0.031, 0, 0); g.add(l); }
  const br = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, 0.01), m); g.add(br); g.position.set(0, 0.092, 0.07); return g; }
// ---- posturas (ángulos en x: negativo = hacia delante)
function poseZero(d) { const J = d.userData.J; for (const k of ['shL', 'shR', 'elL', 'elR', 'hpL', 'hpR', 'knL', 'knR', 'chest', 'neck']) J[k].rotation.set(0, 0, 0); J.hip.position.y = 0.5; J.hip.rotation.set(0, 0, 0); J.shL.rotation.z = -0.1; J.shR.rotation.z = 0.1; }
function poseWalk(d, ph, a = 0.55, lean = 0.05) { poseZero(d); const J = d.userData.J, s = Math.sin(ph);
  J.hpL.rotation.x = -s * a; J.hpR.rotation.x = s * a; J.knL.rotation.x = Math.max(0, Math.cos(ph)) * a * 1.5; J.knR.rotation.x = Math.max(0, -Math.cos(ph)) * a * 1.5;
  J.shL.rotation.x = s * a * 0.9; J.shR.rotation.x = -s * a * 0.9; J.elL.rotation.x = -0.25 - a * 0.6; J.elR.rotation.x = -0.25 - a * 0.6; J.chest.rotation.x = lean; J.hip.position.y = 0.5 - 0.012 * Math.abs(Math.cos(ph)) * (a / 0.55); }
function poseRun(d, ph) { poseWalk(d, ph, 1.0, 0.28); const J = d.userData.J; J.elL.rotation.x = -1.4; J.elR.rotation.x = -1.4; }
function poseCrouch(d, k = 1) { poseZero(d); const J = d.userData.J; J.hip.position.y = 0.5 - 0.2 * k; J.hpL.rotation.x = J.hpR.rotation.x = -1.35 * k; J.knL.rotation.x = J.knR.rotation.x = 2.2 * k; J.chest.rotation.x = 0.55 * k; J.neck.rotation.x = -0.45 * k;
  J.shL.rotation.x = J.shR.rotation.x = -0.9 * k; J.elL.rotation.x = J.elR.rotation.x = -1.3 * k; }
function poseSneak(d, ph) { poseZero(d); const J = d.userData.J, s = Math.sin(ph);                        // de puntillas, exagerado (dibujos animados)
  J.hip.position.y = 0.46 + 0.02 * Math.abs(s); J.hpL.rotation.x = -0.55 - s * 0.55; J.hpR.rotation.x = -0.55 + s * 0.55; J.knL.rotation.x = 0.9 + Math.max(0, s) * 0.7; J.knR.rotation.x = 0.9 + Math.max(0, -s) * 0.7;
  J.chest.rotation.x = 0.32; J.neck.rotation.x = -0.25; J.shL.rotation.x = -1.2; J.shR.rotation.x = -1.2; J.shL.rotation.z = -0.35; J.shR.rotation.z = 0.35; J.elL.rotation.x = -1.7 + s * 0.2; J.elR.rotation.x = -1.7 - s * 0.2; }
function posePhone(d, k = 1) { const J = d.userData.J; J.shR.rotation.x = -0.75 * k; J.shR.rotation.z = 0.35 * k; J.elR.rotation.x = -2.25 * k; }
function poseGhost(d, t) { poseZero(d); const J = d.userData.J; J.shL.rotation.z = -0.5 + 0.05 * Math.sin(t * 2.1); J.shR.rotation.z = 0.5 - 0.05 * Math.sin(t * 2.1); J.elL.rotation.x = -0.3; J.elR.rotation.x = -0.3; }
const faceTo = (d, dx, dz) => { d.rotation.y = Math.atan2(dx, dz); };
// ---- coches
function carModel(o = {}) {
  const kind = o.kind || 'sedan', sport = kind === 'sport', pol = kind === 'police', g = new THREE.Group(), L = sport ? 4.3 : 4.55, Wd = 1.86, bh = sport ? 0.5 : 0.62, y0 = 0.3;
  const mBody = paint(pol ? 0x14161c : (o.color ?? 0xff7a1a), 0.6, 0.1), mGlass = new THREE.MeshPhysicalMaterial({ color: 0x0c1420, roughness: 0.22, metalness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3 }), mTyre = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.85 });
  const flat = m => { m.rotation.x = -Math.PI / 2; return m; };
  const body = flat(rbox(L, Wd, bh, mBody, 0.24)); body.position.y = y0 + bh / 2; g.add(body);
  if (pol) { const wh = flat(rbox(L * 0.44, Wd + 0.03, bh * 0.96, paint(0xf4f6f9, 0.3), 0.12)); wh.position.set(-0.12, y0 + bh / 2, 0); g.add(wh);
    const tx2 = canvasTex(512, 110, (c, W2, H2) => { c.fillStyle = '#16264a'; c.font = '900 84px Inter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('POLICÍA', W2 / 2, H2 / 2 + 4); });
    for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.32), new THREE.MeshBasicMaterial({ map: tx2, transparent: true, depthWrite: false })); p.position.set(-0.12, y0 + bh * 0.5, sz * (Wd / 2 + 0.03)); p.rotation.y = sz < 0 ? Math.PI : 0; g.add(p); } }
  const ch = sport ? 0.4 : 0.5, cab = flat(rbox(L * (sport ? 0.4 : 0.5), Wd * 0.84, ch, mGlass, 0.2)); cab.position.set(sport ? -0.35 : -0.18, y0 + bh + ch / 2 - 0.06, 0); g.add(cab);
  const roof = flat(rbox(L * (sport ? 0.3 : 0.4), Wd * 0.8, 0.07, pol ? paint(0xf4f6f9, 0.3) : mBody, 0.03)); roof.position.set(cab.position.x, y0 + bh + ch - 0.05, 0); g.add(roof);
  if (sport) { const sp = flat(rbox(0.3, Wd * 0.9, 0.05, mBody, 0.02)); sp.position.set(-L / 2 + 0.25, y0 + bh + 0.2, 0); g.add(sp); for (const sz of [-0.6, 0.6]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), mBody); st.position.set(-L / 2 + 0.25, y0 + bh + 0.1, sz); g.add(st); } }
  const wheels = []; for (const [x, z] of [[L * 0.31, Wd / 2 - 0.1], [-L * 0.31, Wd / 2 - 0.1], [L * 0.31, -Wd / 2 + 0.1], [-L * 0.31, -Wd / 2 + 0.1]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 18), mTyre); w.rotation.x = Math.PI / 2; w.position.set(x, 0.34, z); w.castShadow = true; g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.27, 12), new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.3, metalness: 0.8 })); hub.rotation.x = Math.PI / 2; hub.position.copy(w.position); g.add(hub); wheels.push(w); }
  const mHead = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2d0).multiplyScalar(1.1), toneMapped: false, fog: false }), mTail = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2030).multiplyScalar(1.3), toneMapped: false, fog: false });
  for (const sz of [-0.6, 0.6]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.36), mHead); h.position.set(L / 2 - 0.01, y0 + bh * 0.58, sz); g.add(h); const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.4), mTail); tl.position.set(-L / 2 + 0.01, y0 + bh * 0.62, sz); g.add(tl); }
  const U = { kind, body, L, top: y0 + bh + ch, headM: mHead };
  if (pol) { const base = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 1.25), mTyre); base.position.set(cab.position.x, U.top + 0.02, 0); g.add(base); U.bar = [];
    for (const [sz, c] of [[-0.33, 0xff2a3a], [0.33, 0x2a6bff]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.52), new THREE.MeshBasicMaterial({ color: c, toneMapped: false, fog: false })); b.position.set(cab.position.x, U.top + 0.1, sz); b.userData.c = c; g.add(b); U.bar.push(b);
      const hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); hl.position.copy(b.position); hl.scale.setScalar(3.2); g.add(hl); b.userData.halo = hl; } }
  g.traverse(x => { if (x.isMesh && !x.material.transparent) { x.castShadow = true; } }); g.userData = U; return g;
}
// la barra de luces: rojo y azul alternos (k = 0 apagada)
function barAt(car, t, k = 1) { const U = car.userData; if (!U.bar) return; const ph = Math.floor(t * 6) % 2;
  U.bar.forEach((b, i) => { const on = k > 0.01 && ph === i; b.material.color.setHex(b.userData.c).multiplyScalar(on ? 2.4 : 0.25); b.userData.halo.material.opacity = on ? 0.5 * k : 0; }); }
function carLights(car, k) { car.userData.headM.color.setHex(0xfff2d0).multiplyScalar(lerp(0.22, 1.45, clamp(k))); }
function carPose(car, x, z, yaw) { car.position.set(x, 0, z); car.rotation.y = yaw; }
// ---- haz de un foco (cono aditivo de a hacia b) y su mancha de luz en el suelo
let _beamT = null;
function beamMesh(col = 0xfff4d8) {
  _beamT = _beamT || canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0.12)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const cg = new THREE.CylinderGeometry(0.1, 1, 1, 28, 1, true); cg.translate(0, -0.5, 0); cg.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: _beamT, color: col, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false })); m.renderOrder = 5; m.frustumCulled = false;
  const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ map: starTex0(), color: col, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })); spot.rotation.x = -Math.PI / 2; spot.renderOrder = 4;
  const g = new THREE.Group(); g.add(m, spot); g.userData = { m, spot }; return g;
}
function beamSet(B, a, b, r, k) { const U = B.userData; B.visible = k > 0.01; if (!B.visible) return; U.m.position.copy(a); U.m.lookAt(b); const L = a.distanceTo(b); U.m.scale.set(r, r, L); U.m.material.opacity = 0.085 * k;
  U.spot.position.set(b.x, 0.05, b.z); U.spot.scale.setScalar(r * 1.9); U.spot.material.opacity = 0.2 * k; }
// ---------------------------------------------------------------- el desayuno: taza de café con leche (con su plato y vapor), media tostada con tomate y aceite en su plato,
// y lo que lo prepara en la barra: cafetera, jarrita de leche, tostadora, cuenco de tomate con cuchara y aceitera. Medidas reales (m).
const FOOD = {};
function foodMats() {
  if (FOOD.m) return FOOD.m;
  const cer = new THREE.MeshPhysicalMaterial({ color: 0xfbfaf6, roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const toastT = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#e2b56a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = hash(i * 1.7); g.fillStyle = v > 0.6 ? 'rgba(150,90,30,.35)' : 'rgba(255,235,190,.35)'; g.beginPath(); g.arc(hash(i * 3.1) * w, hash(i * 5.3) * h, 1 + hash(i * 7) * 4, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(120,70,20,.5)'; g.lineWidth = 10; g.strokeRect(4, 4, w - 8, h - 8); });
  const tomT = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#d8351f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.fillStyle = hash(i * 2.3) > 0.5 ? 'rgba(255,120,80,.5)' : 'rgba(150,20,10,.45)'; g.beginPath(); g.arc(hash(i * 3.7) * w, hash(i * 6.1) * h, 2 + hash(i) * 5, 0, 7); g.fill(); }
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,225,150,.8)'; g.beginPath(); g.ellipse(hash(i * 9.1) * w, hash(i * 4.3) * h, 2.5, 1.5, hash(i) * 3, 0, 7); g.fill(); } });
  FOOD.m = { cer, crust: new THREE.MeshStandardMaterial({ color: 0xb9792f, roughness: 0.8 }), crumb: new THREE.MeshStandardMaterial({ map: toastT, roughness: 0.85 }),
    tom: new THREE.MeshPhysicalMaterial({ map: tomT, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.3 }), oil: new THREE.MeshPhysicalMaterial({ color: 0xe6b422, roughness: 0.08, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.85 }),
    coffee: new THREE.MeshStandardMaterial({ color: 0x3a2112, roughness: 0.3 }), steel: metal(0xd5d9df, 0.25), dark: new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.5, metalness: 0.3 }),
    red: paint(0xc8322c, 0.3), milk: new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.4 }), glass: new THREE.MeshPhysicalMaterial({ color: 0x8a9a3a, roughness: 0.08, transparent: true, opacity: 0.55, clearcoat: 1 }) };
  return FOOD.m;
}
// taza con plato; level 0..1 (cuánto líquido), milk 0..1 (color: de café solo a café con leche)
function cupModel() {
  const M = foodMats(), g = new THREE.Group();
  const sau = lathe([[0, 0], [0.072, 0], [0.078, 0.006], [0.07, 0.01], [0.03, 0.008], [0, 0.008]], 40, M.cer); g.add(sau);
  const cup = lathe([[0, 0.008], [0.03, 0.008], [0.036, 0.014], [0.046, 0.06], [0.048, 0.082], [0.045, 0.082], [0.042, 0.062], [0.033, 0.02], [0, 0.018]], 44, M.cer); g.add(cup);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0055, 10, 24, Math.PI * 1.25), M.cer); hd.position.set(0.05, 0.048, 0); hd.rotation.z = -Math.PI * 0.62; hd.castShadow = true; g.add(hd);
  const lm = new THREE.MeshStandardMaterial({ color: 0x3a2112, roughness: 0.35 }), liq = new THREE.Mesh(new THREE.CircleGeometry(1, 36), lm); liq.rotation.x = -Math.PI / 2; g.add(liq);
  const foam = new THREE.Mesh(new THREE.RingGeometry(0.55, 1, 36), new THREE.MeshStandardMaterial({ color: 0xf3e3c8, roughness: 0.6, transparent: true, opacity: 0 })); foam.rotation.x = -Math.PI / 2; g.add(foam);
  const steam = [0, 1, 2].map(i => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); g.add(s); return s; });
  g.userData = { sau, set(level, milk, t = 0, hot = 1) { const y = lerp(0.02, 0.074, clamp(level)), r = lerp(0.034, 0.0445, clamp(level)); liq.visible = level > 0.01; liq.position.y = y; liq.scale.setScalar(r); lm.color.setHex(0x3a2112).lerp(_c.setHex(0xc59a6a), clamp(milk));
      foam.position.y = y + 0.0005; foam.scale.setScalar(r); foam.material.opacity = 0.7 * clamp(milk * 1.3 - 0.3);
      steam.forEach((s, i) => { const u = (t * 0.35 + i / 3) % 1; s.position.set(Math.sin(u * 5 + i * 2) * 0.012, 0.09 + u * 0.11, Math.cos(u * 4 + i) * 0.01); s.scale.setScalar(0.03 + u * 0.05); s.material.opacity = 0.22 * hot * clamp(level * 2 - 0.8) * Math.sin(u * Math.PI); }); } };
  g.userData.set(1, 1); return g;
}
// plato con la media tostada: tomate 0..1 (se extiende de un lado a otro) y aceite 0..1 (gotas y brillo)
function toastModel() {
  const M = foodMats(), g = new THREE.Group(), flat = m => { m.rotation.x = -Math.PI / 2; return m; };
  const plate = lathe([[0, 0], [0.085, 0], [0.115, 0.012], [0.112, 0.016], [0.085, 0.006], [0, 0.006]], 48, M.cer); g.add(plate);
  const T = new THREE.Group(); T.position.y = 0.006; T.rotation.y = 0.35; g.add(T);
  const body = flat(rbox(0.185, 0.08, 0.024, M.crust, 0.03)); body.position.y = 0.012; T.add(body);
  const top = flat(new THREE.Mesh(new THREE.ShapeGeometry(rrShape(0.172, 0.068, 0.028), 12), M.crumb)); top.position.y = 0.0245; top.receiveShadow = true; T.add(top);
  { const uv = top.geometry.attributes.uv, p = top.geometry.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 0.172 + 0.5, p.getY(i) / 0.068 + 0.5); }
  const tg = new THREE.ShapeGeometry(rrShape(0.16, 0.058, 0.025), 12); { const uv = tg.attributes.uv, p = tg.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 0.16 + 0.5, p.getY(i) / 0.058 + 0.5); }
  const tm = M.tom.clone(); tm.clippingPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0)]; const tom = flat(new THREE.Mesh(tg, tm)); tom.position.y = 0.0262; T.add(tom);
  const drops = []; for (let i = 0; i < 16; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), M.oil); d.position.set((hash(i * 3.3) - 0.5) * 0.14, 0.0275, (hash(i * 7.1) - 0.5) * 0.045); d.userData.s = 0.004 + hash(i * 5.7) * 0.006; T.add(d); drops.push(d); }
  g.userData = { T, set(tomK, oilK) { g.updateMatrixWorld(true); const a = T.localToWorld(v3(-0.08, 0, 0)), b = T.localToWorld(v3(0.08, 0, 0)), n = a.clone().sub(b).normalize(), pt = a.clone().lerp(b, clamp(tomK));
      tm.clippingPlanes[0].setFromNormalAndCoplanarPoint(n, pt); tom.visible = tomK > 0.01; tm.clearcoat = 0.5 + 0.5 * clamp(oilK); tm.roughness = 0.35 - 0.2 * clamp(oilK);
      drops.forEach((d, i) => { const k = clamp(oilK * 1.6 - i / 16 * 0.6); d.visible = k > 0.01; d.scale.set(d.userData.s * k, d.userData.s * 0.35 * k, d.userData.s * k); }); } };
  g.userData.set(1, 1); return g;
}
// la zona de preparación en la barra
function buildPrep() {
  const M = foodMats(), g = new THREE.Group(), U = {};
  // cafetera: cuerpo, grupo, mango del portafiltro, bandeja
  const mc = new THREE.Group(); { const b = rbox(0.62, 0.42, 0.4, M.red, 0.04); b.position.set(0, 0.33, -0.2); mc.add(b); const top = rbox(0.66, 0.05, 0.44, M.steel, 0.02); top.position.set(0, 0.56, -0.2); mc.add(top);
    const grp2 = cyl(0.045, 0.045, 0.06, M.steel, 20); grp2.position.set(0, 0.25, 0.06); mc.add(grp2); const pf = cyl(0.04, 0.035, 0.03, M.dark, 20); pf.position.set(0, 0.205, 0.06); mc.add(pf);
    const hdl = cyl(0.012, 0.012, 0.14, M.dark, 10); hdl.rotation.x = Math.PI / 2; hdl.position.set(0, 0.2, 0.15); mc.add(hdl);
    const tray = rbox(0.5, 0.02, 0.26, metal(0xb9bec6, 0.5), 0.01); tray.position.set(0, 0.012, 0.03); mc.add(tray); const base = rbox(0.62, 0.12, 0.2, M.red, 0.03); base.position.set(0, 0.06, -0.26); mc.add(base);
    for (let i = 0; i < 3; i++) { const c = cyl(0.03, 0.03, 0.006, M.steel, 16); c.rotation.x = Math.PI / 2; c.position.set(-0.2 + i * 0.2, 0.42, 0.005); mc.add(c); } }
  mc.position.set(CUP0.x, BAR.h, CUP0.z - 0.06); g.add(mc);
  U.coffee = cyl(0.0035, 0.0035, 1, M.coffee, 8); g.add(U.coffee);
  // jarrita de leche
  U.jug = new THREE.Group(); { const j = lathe([[0, 0], [0.034, 0], [0.038, 0.03], [0.033, 0.075], [0.037, 0.095], [0.034, 0.095], [0.03, 0.075], [0.035, 0.03], [0, 0.006]], 28, M.steel); U.jug.add(j);
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 8, 18, Math.PI), M.steel); h.position.set(-0.04, 0.05, 0); h.rotation.z = Math.PI / 2; U.jug.add(h); const ml = new THREE.Mesh(new THREE.CircleGeometry(0.031, 20), M.milk); ml.rotation.x = -Math.PI / 2; ml.position.y = 0.08; U.jug.add(ml); }
  g.add(U.jug); U.milk = cyl(0.004, 0.003, 1, M.milk, 8); g.add(U.milk);
  // tostadora
  const ts = new THREE.Group(); { const b = rbox(0.3, 0.19, 0.17, M.steel, 0.04); b.position.y = 0.105; ts.add(b); const sl = rbox(0.21, 0.012, 0.035, M.dark, 0.005); sl.position.y = 0.2; ts.add(sl); const kn = cyl(0.015, 0.015, 0.02, M.dark, 12); kn.rotation.z = Math.PI / 2; kn.position.set(0.155, 0.08, 0.03); ts.add(kn); }
  ts.position.set(5.72, BAR.h, -2.3); g.add(ts); U.toaster = ts;
  // cuenco de tomate con su cuchara y la aceitera
  const bowl = lathe([[0, 0], [0.04, 0], [0.07, 0.035], [0.074, 0.05], [0.07, 0.05], [0.04, 0.012], [0, 0.01]], 32, M.cer); bowl.position.set(7.02, BAR.h, -2.3); g.add(bowl);
  const tb = new THREE.Mesh(new THREE.CircleGeometry(0.066, 28), M.tom); tb.rotation.x = -Math.PI / 2; tb.position.set(7.02, BAR.h + 0.042, -2.3); g.add(tb);
  U.spoon = new THREE.Group(); { const b = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.steel); b.scale.set(1, 0.45, 1.4); U.spoon.add(b); const h = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.003, 0.13), M.steel); h.position.set(0, 0.004, 0.085); h.rotation.x = -0.12; U.spoon.add(h);
    const t2 = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.tom); t2.scale.set(1, 0.5, 1.3); U.spoon.add(t2); U.spoonTom = t2; }
  g.add(U.spoon);
  U.bottle = new THREE.Group(); { const b = lathe([[0, 0], [0.03, 0], [0.032, 0.01], [0.032, 0.12], [0.014, 0.165], [0.012, 0.2], [0.009, 0.2], [0.009, 0.165], [0, 0.165]], 24, M.glass); U.bottle.add(b); const o = cyl(0.027, 0.027, 0.1, M.oil, 20); o.position.y = 0.062; U.bottle.add(o);
    const sp = cyl(0.004, 0.006, 0.05, M.steel, 10); sp.position.y = 0.222; U.bottle.add(sp); }
  g.add(U.bottle); U.oil = cyl(0.0022, 0.0018, 1, M.oil, 8); g.add(U.oil);
  // la taza y el plato con la tostada (los que se preparan y quedan para el plano final)
  U.cup = cupModel(); g.add(U.cup); U.plate = toastModel(); U.plate.position.copy(PLATE); g.add(U.plate);
  U.bread = U.plate.userData.T; g.userData = U; FOOD.prep = g; return g;
}
function stream(m, a, b, k) { m.visible = k > 0.01; if (!m.visible) return; const d = b.clone().sub(a), L = d.length() * clamp(k * 3); m.scale.set(1, Math.max(0.001, L), 1); m.position.copy(a).addScaledVector(d.normalize(), L / 2); m.quaternion.setFromUnitVectors(v3(0, 1, 0), d); }
// o: coffee (0..1 cae el café), milk (0..1 la leche), slide (0..1 la taza va junto al plato), pop (0..1 la tostada salta de la tostadora al plato), tomato, oil (0..1)
function prepAt(t, o = {}) {
  const U = FOOD.prep.userData, cf = clamp(o.coffee ?? 1), mk = clamp(o.milk ?? 1), sl = clamp(o.slide ?? 1), pp = clamp(o.pop ?? 1), tk = clamp(o.tomato ?? 1), ok = clamp(o.oil ?? 1);
  U.cup.position.lerpVectors(CUP0, CUP1, sm5(sl)); U.cup.rotation.y = -0.6; U.cup.userData.set(0.5 * cf + 0.48 * mk, mk, t, 1);
  const spout = v3(CUP0.x, BAR.h + 0.19, CUP0.z); stream(U.coffee, spout, v3(CUP0.x, BAR.h + 0.03 + 0.03 * cf, CUP0.z), cf > 0 && cf < 1 ? 1 : 0);
  // la jarrita: entra, se inclina y echa la leche; se va
  const jk = mk > 0 && mk < 1 ? Math.min(1, mk * 6, (1 - mk) * 6) : 0; U.jug.visible = jk > 0.01; U.jug.position.set(CUP0.x - 0.075, BAR.h + 0.13 + (1 - jk) * 0.12, CUP0.z + 0.01); U.jug.rotation.z = -1.05 * jk;
  stream(U.milk, v3(CUP0.x - 0.028, BAR.h + 0.142, CUP0.z + 0.01), v3(CUP0.x - 0.005, BAR.h + 0.05 + 0.02 * mk, CUP0.z), jk > 0.85 ? 1 : 0);
  // la tostada: sube de la tostadora, salta al plato y cae en su sitio
  { const B = U.bread, home = v3(0, 0.006, 0), a = U.plate.worldToLocal(U.toaster.localToWorld(v3(0, 0.2, 0))); if (pp < 0.3) { const u = pp / 0.3; B.position.copy(a).add(v3(0, -0.07 + 0.09 * eo(u), 0)); B.rotation.set(Math.PI / 2, 0, 0); }
    else { const u = sm5((pp - 0.3) / 0.7); B.position.lerpVectors(a.clone().add(v3(0, 0.02, 0)), home, u); B.position.y += Math.sin(u * Math.PI) * 0.16; B.rotation.set(Math.PI / 2 * (1 - u), 0.35 * u, 0); } B.visible = pp > 0.001; }
  U.plate.userData.set(tk, ok);
  // la cuchara del tomate: va del cuenco a la tostada y la recorre
  { const act = tk > 0 && tk < 1, a = v3(7.02, BAR.h + 0.06, -2.3), p0 = U.bread.localToWorld(v3(-0.085, 0.035, 0)), p1 = U.bread.localToWorld(v3(0.085, 0.035, 0)); let p = a; if (act) p = tk < 0.15 ? a.clone().lerp(p0, tk / 0.15) : p0.clone().lerp(p1, (tk - 0.15) / 0.85);
    U.spoon.visible = act || tk <= 0; U.spoon.position.copy(act ? p.add(v3(0, 0.004 + 0.006 * Math.sin(tk * 40), 0)) : v3(7.02, BAR.h + 0.052, -2.26)); U.spoon.rotation.set(0, 0.4, act ? 0.25 : 0); U.spoonTom.visible = act; }
  // la aceitera: se levanta, se inclina sobre la tostada y la riega de un lado a otro
  { const rest = v3(7.32, BAR.h, -2.22), act = ok > 0 && ok < 1, k = act ? Math.min(1, ok * 5, (1 - ok) * 5) : 0, tx2 = U.bread.localToWorld(v3(lerp(-0.07, 0.07, ok), 0.03, 0));
    U.bottle.position.lerpVectors(rest, v3(tx2.x + 0.19, BAR.h + 0.2, tx2.z - 0.02), k); U.bottle.rotation.z = 1.9 * k; U.bottle.updateMatrixWorld(true);
    stream(U.oil, U.bottle.localToWorld(v3(0, 0.247, 0)), tx2, k > 0.9 ? 1 : 0); }
}
// ---------------------------------------------------------------- la escena y su coreografía (segundos del guion técnico):
// 0–4 aula (cierra el cuaderno, mira el reloj, suena el timbre) · 4–9 pasillo (ella le propone bajar) · 9–16 la barra (café, leche, tostada, tomate, aceite)
// 16–25 desayunan en la mesa («Ahora sí») · 25–33 cogen las mochilas y vuelven al aula · 33–40 plano final del café y la media tostada.
let TL = {};
const curve = pts => new THREE.CatmullRomCurve3(pts.map(p => v3(p[0], 0, p[1])), false, 'centripetal', 0.5);
const trap = (x, e = 0.16) => { x = clamp(x); const v = 1 / (1 - e); return x < e ? v * x * x / (2 * e) : x > 1 - e ? 1 - v * (1 - x) * (1 - x) / (2 * e) : v * (x - e / 2); };   // arranca y frena suave; en medio, paso constante
function poseSit(d, k = 1) { poseZero(d); const J = d.userData.J; J.hip.position.y = lerp(0.5, 0.5 / d.userData.s0, k); J.hpL.rotation.x = J.hpR.rotation.x = -1.5 * k; J.knL.rotation.x = J.knR.rotation.x = 1.5 * k; }
function armsFwd(d, k = 1) { const J = d.userData.J; J.shL.rotation.x = J.shR.rotation.x = -0.55 * k; J.elL.rotation.x = J.elR.rotation.x = -1.0 * k; }
function walkOn(d, cv, u, ph0 = 0, a = 0.5) { u = clamp(u); const p = cv.getPointAt(u), tg = cv.getTangentAt(u); d.position.set(p.x, 0, p.z); d.rotation.y = Math.atan2(tg.x, tg.z); if (u <= 0 || u >= 1) poseZero(d); else poseWalk(d, u * cv.getLength() * 4.2 + ph0, a, 0.05); }
const yawOf = (cv, u) => { const tg = cv.getTangentAt(clamp(u)); return Math.atan2(tg.x, tg.z); };
async function buildScene() {
  renderer.localClippingEnabled = true;
  TL = { nb0: 0.7, nb1: 1.7, look0: 1.95, bell: 2.9, up0: 3.0, w0: 3.45, w1: 5.5, s0: 3.3, s1: 5.35, goE: 8.6, goH: 8.85, sit: 12.5,
    coffee: [9.55, 10.6], milk: [10.6, 11.5], pop: [11.8, 12.55], tomato: [12.75, 13.9], oil: [14.0, 15.3], slide: [15.3, 15.9],
    sipH: 17.7, yes: K['ahora_4'], sipE: 21.5, st0: 25.2, b0: 25.75, b1: 32.9, bE0: 25.95, bE1: 33.3 };
  S.set = buildSet(); scene.add(S.set); S.prep = buildPrep(); scene.add(S.prep);
  // ---- los protagonistas: él (sudadera azul) y ella (jersey mostaza, coleta), cada uno con su mochila
  S.el = gtaDoll({ shirt: 0x2f6fd0, pants: 0x34466e, skin: 0xd9a27c, hair: 0x3a2618, scale: 1.6 });
  S.ella = gtaDoll({ shirt: 0xe0a526, pants: 0x2b2d42, skin: 0xe6b996, hair: 0x4a2a16, hairStyle: 'ponytail', scale: 1.52 }); scene.add(S.el, S.ella);
  S.bpH = backpack(0xd9482b); S.bpH.position.set(0, 0.2, -0.115); S.el.userData.J.chest.add(S.bpH); S.bpE = backpack(0x1fa39a); S.bpE.position.set(0, 0.2, -0.115); S.ella.userData.J.chest.add(S.bpE);
  S.bpC = backpack(0xd9482b); S.bpC.scale.setScalar(1.6); S.bpC.position.set(DESK.x + 0.47 + 0.34, 0.6, DESK.z); S.bpC.rotation.y = -Math.PI / 2; scene.add(S.bpC);       // colgada del respaldo, en clase
  S.bpF1 = backpack(0xd9482b); S.bpF1.scale.setScalar(1.6); S.bpF1.position.set(TABLE.x - 1.02, 0.2, TABLE.z + 0.3); S.bpF1.rotation.set(-0.18, 0.4, 0); S.bpF2 = backpack(0x1fa39a); S.bpF2.scale.setScalar(1.52); S.bpF2.position.set(TABLE.x + 1.02, 0.19, TABLE.z + 0.3); S.bpF2.rotation.set(-0.18, -0.5, 0); scene.add(S.bpF1, S.bpF2);
  // ---- figurantes: alumnos sentados, la profesora en la pizarra, el camarero y una pareja en otra mesa
  const cols = [0xc8553d, 0x5aa469, 0x8d6cab, 0xe39b3b, 0x4a8fc2, 0xd97aa6], mkx = (i, s) => gtaDoll({ shirt: cols[i % 6], pants: [0x3a4660, 0x2b2d42, 0x6b5a48][i % 3], skin: [0xd9a27c, 0xe6b996, 0xc68a62][i % 3], hair: [0x1c1410, 0x5a3a22, 0x8a5a2a, 0x2c2c30][i % 4], hairStyle: i % 2 ? 'ponytail' : undefined, scale: s ?? 1.5 + hash(i) * 0.12 });
  S.studs = [[-6.9, -0.5], [-8.6, 1.2], [-10.3, -0.5], [DESK.x, -2.2], [-8.6, -2.2], [-6.9, 1.2]].map((p, i) => { const d = mkx(i); d.position.set(p[0] + 0.47, 0, p[1]); d.rotation.y = -Math.PI / 2; scene.add(d); return d; });
  S.prof = gtaDoll({ shirt: 0x7a5c8a, pants: 0x2b2d42, skin: 0xe6b996, hair: 0x6b4a2e, hairStyle: 'ponytail', scale: 1.6 }); S.prof.position.set(-12.3, 0, 0.1); S.prof.rotation.y = -Math.PI / 2; scene.add(S.prof);
  S.bar = gtaDoll({ shirt: 0xf4f1ea, pants: 0x26282e, skin: 0xc68a62, hair: 0x1c1410, scale: 1.64 }); { const a = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.3, 0.012), stdM(0x2b2d42, 0.8)); a.position.set(0, 0.1, 0.072); S.bar.userData.J.chest.add(a); } S.bar.position.set(4.1, 0, -3.02); scene.add(S.bar);
  S.cafe = [[11.3 - 0.6, 1.9, Math.PI / 2], [11.3 + 0.6, 1.9, -Math.PI / 2]].map((p, i) => { const d = mkx(i + 3, 1.56); d.position.set(p[0], 0, p[1]); d.rotation.y = p[2]; scene.add(d); return d; });
  // ---- el cuaderno del pupitre (se cierra: la tapa cae hacia el fondo y queda la cubierta azul arriba) y un boli
  { const nb = new THREE.Group(); nb.position.set(DESK.x - 0.02, 0.742, DESK.z); scene.add(nb); const blue = stdM(0x2f5fb8, 0.6);
    const ptex = sd => canvasTex(256, 360, (g, w, h) => { g.fillStyle = '#fdfcf7'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(70,110,190,.4)'; g.lineWidth = 2; for (let i = 1; i < 17; i++) { g.beginPath(); g.moveTo(14, i * 20 + 12); g.lineTo(w - 14, i * 20 + 12); g.stroke(); }
      g.strokeStyle = 'rgba(30,40,70,.75)'; g.lineWidth = 2.5; for (let i = 1; i < 14; i++) { g.beginPath(); let x = 22; g.moveTo(x, i * 20 + 6); const end = w - 30 - hash(i * sd) * 110; while (x < end) { x += 7 + hash(x * i + sd) * 9; g.lineTo(x, i * 20 + 7 - hash(x + sd) * 8); } g.stroke(); } });
    const page = sd => { const o = new THREE.Group(), p = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.27), stdM(0xffffff, 0.9, { map: ptex(sd) })); p.rotation.z = Math.PI / 2; p.receiveShadow = true; o.add(p); o.rotation.x = -Math.PI / 2; return o; };
    const b0 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.008, 0.2), blue); b0.position.set(0, 0.004, -0.1); b0.castShadow = true; nb.add(b0); const p0 = page(2); p0.position.set(0, 0.0086, -0.1); nb.add(p0);
    const fl = new THREE.Group(); fl.position.set(0, 0.0085, 0); nb.add(fl); const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.008, 0.2), blue); b1.position.set(0, -0.0045, 0.1); b1.castShadow = true; fl.add(b1); const p1 = page(7); p1.position.set(0, 0.0004, 0.1); fl.add(p1);
    const lb = plateText(0.17, 0.075, [['APUNTES', 0.6, 0.54]], { fg: '#24304f', bg: '#fdfcf7', weight: 900, px: 256 }); lb.rotation.x = Math.PI / 2; lb.position.set(0, -0.0092, 0.1); fl.add(lb); S.nbFlap = fl;
    const pen = cyl(0.005, 0.005, 0.14, stdM(0xd23a2a, 0.4), 8); pen.rotation.set(Math.PI / 2, 0, 0.5); pen.position.set(DESK.x + 0.12, 0.747, DESK.z - 0.27); scene.add(pen); }
  // ---- la mesa del desayuno: dos tazas con su plato, dos medias tostadas y los apuntes a un lado
  const tt = 0.7395; S.restH = v3(TABLE.x - 0.19, tt, TABLE.z + 0.2); S.restE = v3(TABLE.x + 0.19, tt, TABLE.z + 0.2);
  S.cupH = cupModel(); S.cupE = cupModel(); for (const [c, r] of [[S.cupH, S.restH], [S.cupE, S.restE]]) { const s = c.userData.sau; s.position.copy(r); scene.add(s, c); c.position.copy(r); }
  S.cupH.rotation.y = 2.4; S.cupE.rotation.y = 0.7;
  S.tabT = [[-0.14, -0.14, 0.5], [0.15, -0.16, -0.4]].map(p => { const o = toastModel(); o.position.set(TABLE.x + p[0], tt, TABLE.z + p[1]); o.rotation.y = p[2]; scene.add(o); return o; });
  { const n = new THREE.Group(); for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.14), stdM([0xffffff, 0xfff3c4, 0xffffff][i], 0.9)); p.position.y = 0.002 + i * 0.004; p.rotation.y = (i - 1) * 0.12; p.castShadow = true; n.add(p); } const c = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.1), stdM(0x2f5fb8, 0.6)); c.position.set(0.02, 0.02, 0); c.rotation.y = -0.3; n.add(c); n.position.set(TABLE.x + 0.02, tt, TABLE.z - 0.3); scene.add(n); }
  // ---- trayectos
  S.cv = { h1: curve([[DESK.x + 0.6, 1.5], [-4.3, 2.0], [-3.65, 1.7], [-3.0, 1.05], [-2.2, 1.0], [-1.55, 1.2]]), e1: curve([[2.9, 0.95], [1.5, 1.0], [0.4, 1.25], [-0.35, 1.35]]),
    hGo: curve([[-1.55, 1.2], [-0.5, 1.7], [1.0, 1.6], [2.4, 1.4], [4.5, 1.5], [6.6, 1.7]]), eGo: curve([[-0.35, 1.35], [0.6, 1.15], [2.0, 1.0], [4.5, 1.1], [7.0, 1.9], [8.6, 1.9]]),
    hBk: curve([[TABLE.x - 0.66, 1.6], [6.5, 1.8], [4.5, 1.5], [2.0, 1.3], [0, 1.3], [-2.2, 1.15], [-3.4, 1.0]]), eBk: curve([[TABLE.x + 0.68, 1.65], [7.6, 2.15], [5.0, 2.05], [2.0, 1.85], [0, 1.9], [-1.8, 1.7], [-2.75, 1.4]]) };
  // motas de polvo en el aire (dejan estela al mover la cámara)
  S.flow.push(flowCloud(2600, i => [-13 + hash(i * 1.3) * 27, 0.3 + hash(i * 2.7) * 2.6, ZB + 0.3 + hash(i * 3.9) * 7], { size: 1.2, bright: 0.22, nearF: 0.3, farF: 0.03, drift: 0.12, seed: 3, col: 0xfff2dc }));
  envAll(scene);
}
// gesto de beber: la taza va de su plato a la boca y vuelve (k 0..1); brazo: 'L' o 'R' (el del lado de la cámara)
function sipAt(d, cup, rest, arm, k, t, level) { const J = d.userData.J, sh = J['sh' + arm], el = J['el' + arm], sg = arm === 'L' ? 1 : -1; k = clamp(k);
  sh.rotation.x = lerp(-0.55, -1.12, k); el.rotation.x = lerp(-1.0, -2.0, k); sh.rotation.z = (arm === 'L' ? -0.1 : 0.1) + sg * 0.42 * k;
  d.updateMatrixWorld(true); const hd = wpos(J.head), f = v3(Math.sin(d.rotation.y), 0, Math.cos(d.rotation.y)), m = hd.clone().addScaledVector(f, 0.14).add(v3(0, -0.11, 0));
  cup.position.lerpVectors(rest, m, sm5(k)); cup.rotation.set(0, cup.rotation.y, 0); cup.rotateOnWorldAxis(v3(-f.z, 0, f.x), -0.75 * sm5(clamp(k * 1.4 - 0.4))); cup.userData.set(level, 1, t, 1); J.neck.rotation.x += -0.12 * k; }
function stageAt(t, st) {
  NOW = t; const H = S.el, E = S.ella, JH = H.userData.J, JE = E.userData.J, cv = S.cv, vz = voice(t);
  const cw = sm5(clamp((st.p.x - 0.5) / 3)); moodMix({ dia: 1 - cw, cafe: cw }); setAt(t, { bell: TL.bell });
  // ---- la barra: café, leche, la tostada salta al plato, tomate, aceite y la taza se arrima
  const sg2 = (a, tt2) => seg(tt2, a[0], a[1]);
  prepAt(t, { coffee: sg2(TL.coffee, t), milk: sg2(TL.milk, t), pop: sg2(TL.pop, t), tomato: sg2(TL.tomato, t), oil: sg2(TL.oil, t), slide: sg2(TL.slide, t) });
  // ---- el cuaderno se cierra
  const nk = sm5(seg(t, TL.nb0, TL.nb1)); S.nbFlap.rotation.x = -Math.PI * nk;
  const atTable = t >= TL.sit && t < TL.st0 + 0.35; S.bpF1.visible = S.bpF2.visible = atTable; S.bpE.visible = !atTable; S.bpH.visible = t >= TL.up0 + 0.3 && !atTable; S.bpC.visible = t < TL.up0 + 0.3;
  // ---- ÉL
  const seat = v3(DESK.x + 0.47, 0, DESK.z), sH = v3(TABLE.x - 0.6, 0, TABLE.z), sE = v3(TABLE.x + 0.6, 0, TABLE.z);
  if (t < TL.w0) {                                             // en clase: cierra el cuaderno, mira el reloj y se levanta
    const up = win(t, TL.up0, TL.w0 - TL.up0), p0 = cv.h1.getPointAt(0); poseSit(H, 1 - up); armsFwd(H, 1 - up);
    const a = Math.sin(Math.PI * nk); JH.shR.rotation.x += -0.5 * a * (1 - up); JH.shR.rotation.z = lerp(0.42, -0.12, nk) * (1 - up) + 0.1 * up; JH.elR.rotation.x += 0.25 * a;
    const lk = win(t, TL.look0, 0.45) * (1 - up); JH.chest.rotation.y = -0.4 * lk; JH.neck.rotation.y = -0.75 * lk; JH.neck.rotation.x = lerp(0.32, -0.26, lk) * (1 - up); JH.chest.rotation.x = 0.1 * (1 - lk) * (1 - up);
    H.position.lerpVectors(seat, p0, up); H.rotation.y = lerp(-Math.PI / 2, yawOf(cv.h1, 0), up);
  } else if (t < TL.goH) {                                     // sale al pasillo, se encuentran y hablan
    const u = trap(seg(t, TL.w0, TL.w1)); walkOn(H, cv.h1, u, 0, 0.55);
    if (u >= 1) { const k = win(t, TL.w1, 0.3); H.rotation.y = lerp(yawOf(cv.h1, 1), 1.12, k); JH.neck.rotation.y = 0.12 * k;
      const nod = Math.sin(clamp((t - K['venga_2']) / 0.5) * Math.PI), sh = win(t, K['no_2'] - 0.12, 0.3) * (1 - win(t, 8.5, 0.3));          // «Venga» (asiente) · «no me da la vida» (se encoge de hombros)
      JH.neck.rotation.x = 0.22 * nod; JH.shL.rotation.z = -0.1 - 0.5 * sh; JH.shR.rotation.z = 0.1 + 0.5 * sh; JH.shL.rotation.x = JH.shR.rotation.x = -0.25 * sh; JH.elL.rotation.x = JH.elR.rotation.x = -1.45 * sh; JH.neck.rotation.y += 0.14 * sh * Math.sin(t * 9);
      if (t > 6.7 && t < 8.7) JH.chest.rotation.x = 0.05 * vz; }
  } else if (t < TL.sit) { walkOn(H, cv.hGo, trap(seg(t, TL.goH, TL.sit)), 0, 0.5); }
  else if (t < TL.b0) {                                        // en la mesa: bebe, «Ahora sí», y se levanta
    const up = win(t, TL.st0, TL.b0 - TL.st0), p0 = cv.hBk.getPointAt(0); poseSit(H, 1 - up); armsFwd(H, 1 - up); H.position.lerpVectors(sH, p0, up); H.rotation.y = lerp(Math.PI / 2, yawOf(cv.hBk, 0), up);
    const k = win(t, TL.sipH, 0.6) * (1 - win(t, TL.sipH + 1.0, 0.5)), k2 = win(t, 22.9, 0.55) * (1 - win(t, 23.8, 0.5)), ys = win(t, TL.yes - 0.05, 0.3) * (1 - win(t, TL.yes + 1.3, 0.5));
    if (up < 0.01) { sipAt(H, S.cupH, S.restH, 'L', Math.max(k, k2), t, t < TL.sipH + 0.6 ? 0.98 : t < 23.3 ? 0.8 : 0.62);
      JH.chest.rotation.x = 0.1 - 0.2 * ys + 0.04 * vz * ys; JH.neck.rotation.x += 0.2 * Math.sin(clamp((t - TL.yes) / 0.45) * Math.PI); JH.shR.rotation.z = 0.1 + 0.3 * ys; JH.shR.rotation.x += 0.25 * ys; JH.neck.rotation.y = 0.1 * Math.sin(t * 0.9); }
    else { S.cupH.position.copy(S.restH); S.cupH.rotation.set(0, 2.4, 0); }
  } else { walkOn(H, cv.hBk, trap(seg(t, TL.b0, TL.b1), 0.1), 0, 0.55); }
  // ---- ELLA
  E.visible = t >= TL.s0 - 0.6;
  if (t < TL.goE) {                                            // llega por el pasillo saludando: «¿Bajamos a desayunar?»
    const u = trap(seg(t, TL.s0, TL.s1)); walkOn(E, cv.e1, u, 1, 0.5); const wv = win(t, 4.35, 0.3) * (1 - win(t, 5.3, 0.3)), pt = win(t, K['desayunar_1'] - 0.1, 0.3) * (1 - win(t, 6.5, 0.4));
    if (u >= 1) { const k = win(t, TL.s1, 0.3); E.rotation.y = lerp(yawOf(cv.e1, 1), -1.12, k); JE.neck.rotation.y = -0.1 * k; JE.hip.rotation.z = 0.04 * k; }
    JE.shR.rotation.z = 0.1 + 2.3 * wv; JE.shR.rotation.x = JE.shR.rotation.x * (1 - wv); JE.elR.rotation.x = lerp(JE.elR.rotation.x, -0.5 + 0.35 * Math.sin(t * 13), wv);
    JE.shL.rotation.x = lerp(JE.shL.rotation.x, 0.75, pt); JE.shL.rotation.z = -0.1 - 0.35 * pt; JE.elL.rotation.x = lerp(JE.elL.rotation.x, -0.35, pt); JE.neck.rotation.z = 0.16 * pt;       // señala hacia la cafetería, a su espalda
    if (t > 4.65 && t < 6.25) JE.chest.rotation.x = 0.05 * vz; if (t > 6.7) JE.neck.rotation.x = 0.1 * Math.sin(clamp((t - 7.4) / 0.6) * Math.PI);
  } else if (t < TL.sit) { walkOn(E, cv.eGo, trap(seg(t, TL.goE, TL.sit)), 1, 0.5); }
  else if (t < TL.bE0) {                                       // en la mesa: habla con las manos, bebe, mira la hora y se levanta
    const up = win(t, TL.st0 + 0.15, TL.bE0 - TL.st0 - 0.15), p0 = cv.eBk.getPointAt(0); poseSit(E, 1 - up); armsFwd(E, 1 - up); E.position.lerpVectors(sE, p0, up); E.rotation.y = lerp(-Math.PI / 2, yawOf(cv.eBk, 0), up);
    const k = win(t, TL.sipE, 0.6) * (1 - win(t, TL.sipE + 1.1, 0.5)), tk = (win(t, 16.0, 0.4) * (1 - win(t, 17.6, 0.4)) + win(t, 20.4, 0.4) * (1 - win(t, 21.3, 0.3))), wt = win(t, 24.1, 0.35) * (1 - win(t, 25.1, 0.3));
    if (up < 0.01) { sipAt(E, S.cupE, S.restE, 'R', k, t, t < TL.sipE + 0.6 ? 0.98 : 0.78);
      JE.shL.rotation.x += -0.35 * tk + 0.12 * tk * Math.sin(t * 5.5); JE.elL.rotation.x += -0.5 * tk + 0.25 * tk * Math.sin(t * 7.1 + 1); JE.shL.rotation.z = -0.1 - 0.25 * tk; JE.neck.rotation.y = -0.08 * Math.sin(t * 1.1); JE.neck.rotation.z = 0.08 * tk * Math.sin(t * 3);
      JE.shL.rotation.x += -0.3 * wt; JE.elL.rotation.x += -0.85 * wt; JE.shL.rotation.z += 0.45 * wt; JE.neck.rotation.x += 0.3 * wt; JE.chest.rotation.x = 0.1 + 0.05 * Math.sin(clamp((t - TL.yes - 0.5) / 0.9) * Math.PI); }
    else { S.cupE.position.copy(S.restE); S.cupE.rotation.set(0, 0.7, 0); }
  } else { walkOn(E, cv.eBk, trap(seg(t, TL.bE0, TL.bE1), 0.1), 1, 0.5); }
  // ---- figurantes
  S.studs.forEach((d, i) => { poseSit(d); armsFwd(d); const J = d.userData.J, st2 = i === 1 ? win(t, 3.3, 0.6) * (1 - win(t, 5.2, 0.6)) : 0; J.neck.rotation.y = 0.35 * Math.sin(t * 0.5 + i * 2.1); J.neck.rotation.x = 0.22 * (0.5 + 0.5 * Math.sin(t * 0.7 + i)); J.chest.rotation.x = 0.1; J.elR.rotation.x += 0.12 * Math.sin(t * 6 + i * 3);
    J.shL.rotation.x = lerp(J.shL.rotation.x, -2.9, st2); J.shR.rotation.x = lerp(J.shR.rotation.x, -2.9, st2); J.elL.rotation.x = lerp(J.elL.rotation.x, -0.3, st2); J.elR.rotation.x = lerp(J.elR.rotation.x, -0.3, st2); J.chest.rotation.x -= 0.2 * st2; });
  { poseZero(S.prof); const J = S.prof.userData.J; J.shR.rotation.x = -2.0 + 0.15 * Math.sin(t * 5); J.elR.rotation.x = -0.5 + 0.2 * Math.sin(t * 7); J.neck.rotation.x = -0.1; }
  { poseZero(S.bar); const J = S.bar.userData.J; J.shL.rotation.x = J.shR.rotation.x = -0.5; J.elL.rotation.x = J.elR.rotation.x = -1.1 + 0.1 * Math.sin(t * 2.3); J.neck.rotation.y = 0.3 * Math.sin(t * 0.6); J.neck.rotation.x = 0.2; J.chest.rotation.y = 0.15 * Math.sin(t * 0.45); }
  S.cafe.forEach((d, i) => { poseSit(d); armsFwd(d); const J = d.userData.J; J.neck.rotation.y = 0.2 * Math.sin(t * 0.8 + i * 3); J.elL.rotation.x += 0.3 * Math.sin(t * 3.1 + i * 2) * (i ? 1 : 0.3); J.chest.rotation.x = 0.1; });
  for (const b of SETU.lamps) b.material.color.setHex(0xffd9a0).multiplyScalar(2.2);
  scene.updateMatrixWorld(true); const c = st.l; lightsAt(c, st.p.distanceTo(c));
}
// ---------------------------------------------------------------- LA CÁMARA: un solo plano que recorre los seis momentos del guion técnico (los «cortes» son barridos rápidos).
let CK = [];
function buildCam() {
  const k = (t, p, l, f = 32) => [t, p, l, f];
  CK = [
    // 0–4 · primer plano del cuaderno que se cierra; sube: él mira el reloj
    k(0, [-5.95, 1.42, 2.25], [-5.2, 0.78, 1.18], 30), k(1.8, [-5.8, 1.45, 2.4], [-5.16, 0.8, 1.18], 30), k(2.6, [-3.75, 1.5, 3.1], [-6.0, 1.9, -3.0], 32), k(3.45, [-3.6, 1.5, 3.2], [-5.9, 1.85, -3.0], 32),
    // 4–9 · plano medio en el pasillo
    k(4.7, [-0.6, 1.45, 4.9], [-1.2, 1.15, 1.2], 32), k(6.6, [-0.95, 1.4, 4.4], [-0.95, 1.2, 1.2], 32), k(8.6, [-0.7, 1.42, 4.6], [-0.85, 1.2, 1.2], 32),
    // 9–16 · planos cortos en la barra: café, leche, tostada, tomate, aceite
    k(9.75, [5.2, 1.27, -1.4], [4.9, 1.03, -2.1], 30), k(11.55, [5.33, 1.24, -1.36], [4.94, 1.03, -2.1], 30), k(12.25, [6.2, 1.36, -1.05], [6.15, 1.03, -2.15], 30), k(12.75, [6.35, 1.33, -1.15], [6.4, 1.0, -2.12], 30),
    k(13.5, [6.8, 1.25, -1.45], [6.6, 0.985, -2.1], 30), k(15.0, [6.52, 1.22, -1.4], [6.56, 0.99, -2.1], 30), k(15.9, [6.42, 1.2, -1.3], [6.49, 0.99, -2.07], 30),
    // 16–25 · desayunan y charlan
    k(16.45, [6.3, 1.4, 1.9], [7.4, 1.0, 0.8], 32), k(17.0, [7.5, 1.5, 4.6], [8.0, 0.95, 1.0], 32), k(21.0, [7.9, 1.42, 4.1], [8.0, 0.97, 1.0], 32), k(25.0, [8.15, 1.5, 4.6], [7.9, 1.0, 1.0], 32),
    // 25–33 · vuelven andando al aula
    k(26.2, [7.0, 1.55, 5.8], [7.2, 1.05, 1.3], 32), k(27.0, [5.2, 1.6, 6.6], [6.2, 1.1, 1.4], 32), k(28.5, [2.4, 1.6, 6.8], [3.4, 1.1, 1.4], 32), k(30.0, [-0.6, 1.6, 6.6], [0.4, 1.1, 1.4], 32),
    k(31.5, [-1.8, 1.6, 6.0], [-2.2, 1.1, 1.3], 32), k(32.5, [-1.9, 1.55, 5.4], [-3.1, 1.15, 1.0], 32),
    // 33–40 · plano final: el café y la media tostada; acercamiento muy lento
    k(33.7, [6.12, 1.26, -0.92], [6.5, 1.0, -2.07], 30), k(END, [6.24, 1.19, -1.24], [6.5, 1.0, -2.07], 30),
  ];
}
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l); return { focus: f, scale: (f < 2 ? 0.5 : f < 8 ? 0.3 : 0.2) * f }; }
// ---------------------------------------------------------------- RÓTULOS: «Otra clase más…» (texto en pantalla, no se dice) y el eslogan del cierre.
function buildHudPlan() {}
function sText(txt, x, y, px, weight, a, o = {}) { if (a <= 0.01) return 0; hg.save(); hg.globalAlpha = clamp(a); hg.font = `${weight} ${px}px Inter, sans-serif`; hg.textAlign = o.align || 'left'; hg.textBaseline = 'alphabetic'; hg.letterSpacing = (o.ls || 0) + 'px';
  hg.shadowColor = 'rgba(0,0,0,.6)'; hg.shadowBlur = px * 0.28 * PR; hg.shadowOffsetY = px * 0.04 * PR; hg.fillStyle = o.col || '#ffffff'; hg.fillText(txt, x, y); const w = hg.measureText(txt).width; hg.restore(); return w; }
function hudAt(t) {
  hudBegin();
  // 0–4 s · «Otra clase más…» (se escribe sola)
  { const a = clamp((t - 0.45) / 0.3) * (1 - clamp((t - 3.5) / 0.4)); if (a > 0.01) sText(typed('Otra clase más…', clamp((t - 0.55) / 0.9)), 1130, 330, 84, 800, a); }
  // 35,8–40 s · eslogan (más de 4 s en pantalla)
  { const t0 = 35.8, a = clamp((t - t0) / 0.5); if (a > 0.01) {
      hg.save(); hg.globalAlpha = 0.62 * a; const gr = hg.createLinearGradient(0, 0, 0, 470); gr.addColorStop(0, 'rgba(10,18,16,1)'); gr.addColorStop(1, 'rgba(10,18,16,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, W, 470); hg.restore();
      const dy = (1 - sm5(a)) * 24, y = 232 + dy;
      sText('CAFETERÍA DE LA FACULTAD', W / 2, 118 + dy, 28, 700, a * 0.9, { align: 'center', ls: 7, col: '#ffd98a' });
      hg.save(); hg.font = '900 104px Inter, sans-serif'; const w1 = hg.measureText('Entre clase y clase, ').width, w2 = hg.measureText('recarga.').width; hg.restore(); const x0 = W / 2 - (w1 + w2) / 2;
      sText('Entre clase y clase, ', x0, y, 104, 900, a); sText('recarga.', x0 + w1, y, 104, 900, clamp((t - t0 - 0.25) / 0.5), { col: '#ffd98a' });
      sText('Café con leche y media tostada de tomate y aceite', W / 2, y + 74, 42, 500, clamp((t - t0 - 0.6) / 0.6), { align: 'center' }); } }
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
  END = 40;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  // una clave por palabra: K['brasil_1'], K['ondas_5'], K['200000_7'], K['tonga_11']… (inicio de la palabra − 0,03 s; la primera vez que sale en esa frase)
  K = {}; for (const w of WORDS) { const key = w.n + '_' + w.li; if (K[key] === undefined) K[key] = w.start - 0.03; }
  K.start = 0; { const K0 = K; K = new Proxy(K0, { get: (o, k) => { if (typeof k === 'string' && !(k in o)) console.error('ERROR sin clave K.' + k); return o[k]; } }); }

  mats(); buildMats(); S.flow = [];
  await loadEnv(); buildLights(); cam.near = 0.03; cam.far = 40000; cam.updateProjectionMatrix();
  await buildScene();
  await waitLoads();
  post.uniforms.ca.value = 0.15; post.uniforms.vig.value = 0.2; post.uniforms.bloom.value = 0.22;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s); window.glLost = () => renderer.getContext().isContextLost();
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
