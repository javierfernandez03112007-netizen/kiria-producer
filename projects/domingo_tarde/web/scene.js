// «El domingo por la tarde» (kiria.ai, 19-11-2026): la ansiedad del domingo a las siete. Un cuarto al atardecer y un chico de estilo anime (lámina de referencia de Javi en ref/).
// Un solo plano continuo: puerta → ventana (sale el LUNES) → su cara → la mano en el pecho → los ojos → el cerebro → sale por la ventana (8 de cada 10) → el cuaderno → puerta.
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
// ---------------------------------------------------------------- EL MUNDO (1 unidad = 1 m). +X derecha, +Y arriba, +Z hacia la puerta; la ventana da a −Z (por ahí se pone el sol).
const ROOM = { x0: -2.1, x1: 2.1, z0: -2.2, z1: 2.2, h: 2.6 };
const WIN = { x: 0.1, w: 1.9, y0: 0.95, y1: 2.15 };                               // su ventana (en la pared del fondo, que es la fachada)
const BED = { x: -0.35, z: -1.45, w: 2.1, d: 1.25, top: 0.5 };                    // la cama, bajo la ventana
const BOY = { x: 0.05, z: -1.33, yaw: Math.PI - 0.35 };                            // sentado en la cama, mirando a la ventana (un poco girado)
const FAC = { cols: [WIN.x, WIN.x + 3.8], fh: 2.9, floors: [-2, -1, 0, 1, 2] };   // la fachada: 2 columnas × 5 plantas = 10 ventanas (la suya: columna 0, planta 0)
const seg = (t, a, b) => clamp((t - a) / (b - a));
const bump = (t, a, b, fi = 0.25, fo = 0.3) => win(t, a, fi) * (1 - win(t, b, fo));               // 0→1→0 suave entre a y b
const stdM = (c, r = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
const litM = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
function boxAt(par, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; par.add(b); return b; }
function cylAt(par, rt, rb, h, m, x, y, z, sg = 20) { const c = cyl(rt, rb, h, m, sg); c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; par.add(c); return c; }
function rboxAt(par, w, h, d, m, r, x, y, z) { const b = rbox(w, h, d, m, r); b.position.set(x, y, z); par.add(b); return b; }
// degradado de 4 tonos para el sombreado de dibujo (personaje)
let _toonG = null;
function toonM(c, o = {}) { _toonG = _toonG || (() => { const t = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 140, 140, 140, 255, 205, 205, 205, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
  return new THREE.MeshToonMaterial({ color: c, gradientMap: _toonG, ...o }); }
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
const ASSET = '/projects/pausa_universitaria/web/assets/';
const ENV = { rot: 0, env: 1 };
const TEXL = new THREE.TextureLoader(), PENDING = [];
function tx(path, srgb = true, rep = null) { let ok; PENDING.push(new Promise(a => { ok = a; })); const t = TEXL.load(ASSET + path, () => ok(), undefined, () => { console.error('ERROR textura ' + path); ok(); });
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
function waitLoads() { return Promise.all(PENDING); }
const C3 = h => new THREE.Color(h);
// sky: cénit, horizonte, suelo (bajo el horizonte), sol (dirección, color, tamaño); fog: color y densidad (FogExp2, por unidad); key: sol/foco; fill; hemi: cielo, suelo, intensidad
const MOODS = {
  // domingo, las siete: el sol tocando el horizonte (fuera, hacia −z), naranja; cielo morado; dentro, todo en penumbra azul violeta
  ocaso: { zen: 0x1b1946, hor: 0xe8742f, gnd: 0x1a1430, sunD: [0.2, 0.03, -1], sunC: 0xffc070, sunS: 0.42, stars: 0.25, fogC: 0x8a5a7a, fogD: 0.0,
           key: [0xff9a52, 3.4], keyD: [0.2, 0.2, -1], fill: [0x7a6cff, 0.22], hemi: [0x6f63b8, 0x2a2238, 1.25], env: 0.5, exp: 1.0 },
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
  float k = pow(clamp(y, 0., 1.), 0.5); vec3 mid = vec3(0.36, 0.045, 0.14), mid2 = vec3(0.085, 0.03, 0.2);        // (lineal)      // naranja → rosa → violeta → azul noche
  vec3 c = y > 0. ? (k < 0.22 ? mix(hor, mid, k / 0.22) : k < 0.5 ? mix(mid, mid2, (k - 0.22) / 0.28) : mix(mid2, zen, (k - 0.5) / 0.5)) : mix(hor, gnd, clamp(-y * 6., 0., 1.));
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
  moodSet('ocaso');
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
// ---------------------------------------------------------------- EL CUARTO, LA CIUDAD AL FONDO Y LA FACHADA (según la lámina de referencia de Javi: penumbra violeta, ventana naranja)
function posterTex(w, h, draw) { return canvasTex(w, h, draw); }
function wallArt(par, tex, w, h, x, y, z, ry, tilt = 0, frame = 0) { const g = new THREE.Group(); if (frame) boxAt(g, w + frame, h + frame, 0.012, stdM(0x1b1620, 0.6), 0, 0, -0.004).castShadow = false; const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), stdM(0xffffff, 0.85, { map: tex })); p.position.z = 0.004; p.receiveShadow = true; g.add(p); g.position.set(x, y, z); g.rotation.set(0, ry, tilt); par.add(g); return g; }
// foto pequeña (polaroid) con un dibujo sencillo de colores cálidos
function photoTex(seed) { return canvasTex(96, 112, (g, w, h) => { g.fillStyle = '#efe9df'; g.fillRect(0, 0, w, h); const hue = [18, 32, 280, 210, 340, 45][Math.floor(hash(seed) * 6)]; const gr = g.createLinearGradient(0, 8, 0, 84); gr.addColorStop(0, `hsl(${hue},55%,${45 + hash(seed * 3) * 20}%)`); gr.addColorStop(1, `hsl(${(hue + 40) % 360},45%,22%)`); g.fillStyle = gr; g.fillRect(8, 8, w - 16, 78);
    g.fillStyle = 'rgba(255,230,190,.85)'; g.beginPath(); g.arc(24 + hash(seed * 5) * 48, 26 + hash(seed * 7) * 22, 7 + hash(seed) * 6, 0, 7); g.fill(); g.fillStyle = 'rgba(20,14,30,.75)'; for (let i = 0; i < 3; i++) { const x = 14 + hash(seed + i) * 60, bw = 8 + hash(seed * 2 + i) * 16, bh = 16 + hash(seed * 4 + i) * 30; g.fillRect(x, 86 - bh, bw, bh); } }); }
function bigPoster(seed, txt) { return canvasTex(256, 360, (g, w, h) => { const hue = [255, 12, 200, 330][seed % 4]; const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, `hsl(${hue},45%,22%)`); gr.addColorStop(1, `hsl(${(hue + 50) % 360},55%,38%)`); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,220,170,.8)'; g.beginPath(); g.arc(w * (0.3 + 0.4 * hash(seed)), h * 0.36, 44, 0, 7); g.fill(); g.fillStyle = 'rgba(14,10,24,.8)'; g.beginPath(); g.moveTo(0, h * 0.72); for (let x = 0; x <= w; x += 16) g.lineTo(x, h * (0.6 + 0.14 * hash(seed * 3 + x))); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    if (txt) { g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '900 30px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(txt, w / 2, h - 26); } }); }
function books(par, x0, x1, y, z, seed = 1, dz = 0.17, axis = 'x') { let x = x0, i = 0; const cols = [0x7a3b46, 0x2f4a7a, 0xb98a3a, 0x3f6a5a, 0x5a4a7a, 0xd9cdb8, 0x23232e, 0xa8556a];
  while (x < x1 - 0.03) { const w = 0.025 + hash(seed * 7 + i) * 0.03, h = 0.19 + hash(seed * 3 + i * 1.7) * 0.08; if (hash(seed + i * 2.3) > 0.1) { const m = stdM(cols[Math.floor(hash(seed * 11 + i) * cols.length)], 0.8); if (axis === 'x') boxAt(par, w, h, dz, m, x + w / 2, y + h / 2, z); else boxAt(par, dz, h, w, m, z, y + h / 2, x + w / 2); } x += w + 0.003; i++; } }
function plantPot(s = 1) { const g = new THREE.Group(), mp = stdM(0x6b5f8a, 0.7), ml = stdM(0x3d6a4a, 0.75, { side: THREE.DoubleSide }); cylAt(g, 0.075, 0.055, 0.12, mp, 0, 0.06, 0, 16);
  for (let i = 0; i < 11; i++) { const a = i * 2.4, l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), ml); l.scale.set(0.42, 1.6, 0.16); const up = 0.5 + hash(i) * 0.5; l.position.set(Math.cos(a) * 0.045 * (1.4 - up), 0.14 + up * 0.13, Math.sin(a) * 0.045 * (1.4 - up)); l.rotation.set(Math.sin(a) * (0.9 - up * 0.6), a, Math.cos(a) * (0.9 - up * 0.6)); l.castShadow = true; g.add(l); } g.scale.setScalar(s); return g; }

function buildRoom() { const g = new THREE.Group(), R = ROOM, U = g.userData;
  const wallM = stdM(0x9a94b4, 0.95), wall2 = stdM(0x8d87a8, 0.95), wood = stdM(0xffffff, 0.6, { map: repTex(woodTex('#8a6a4c', '#5e4530', '#a8855f', 4), 3, 3) }), dark = stdM(0x1c1a24, 0.6), woodD = stdM(0x6a4f38, 0.65);
  // suelo, techo y paredes (la del fondo es la fachada: buildFacade)
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0 + 1.2), wood); f.rotation.x = -Math.PI / 2; f.position.set(0, 0, 0.6); f.receiveShadow = true; g.add(f); }
  boxAt(g, R.x1 - R.x0 + 0.3, 0.12, R.z1 - R.z0 + 0.3, stdM(0xb9b3cc, 0.95), 0, R.h + 0.06, 0); boxAt(g, 0.12, R.h, R.z1 - R.z0, wallM, R.x0 - 0.06, R.h / 2, 0); boxAt(g, 0.12, R.h, R.z1 - R.z0, wallM, R.x1 + 0.06, R.h / 2, 0);
  // pared de la puerta, con el hueco (x de 0,0 a 0,9; alto 2,05) y la hoja abierta hacia dentro
  { const z = R.z1 + 0.06, d0 = 0.0, d1 = 0.9; boxAt(g, d0 - R.x0, R.h, 0.12, wall2, (d0 + R.x0) / 2, R.h / 2, z); boxAt(g, R.x1 - d1, R.h, 0.12, wall2, (d1 + R.x1) / 2, R.h / 2, z); boxAt(g, d1 - d0, R.h - 2.05, 0.12, wall2, (d0 + d1) / 2, 2.05 + (R.h - 2.05) / 2, z);
    for (const x of [d0 - 0.03, d1 + 0.03]) boxAt(g, 0.07, 2.1, 0.18, woodD, x, 1.05, z); boxAt(g, d1 - d0 + 0.13, 0.07, 0.18, woodD, (d0 + d1) / 2, 2.085, z);
    const leaf = boxAt(g, 0.04, 2.03, 0.86, woodD, d1 + 0.02, 1.015, R.z1 - 0.44); boxAt(g, 0.07, 0.03, 0.12, stdM(0xb9a06a, 0.4, { metalness: 0.7 }), d1 - 0.02, 1.02, R.z1 - 0.78);
    boxAt(g, 5, R.h, 0.1, stdM(0x6f6a86, 0.95), 0, R.h / 2, R.z1 + 1.3); }
  // marco de la ventana (por dentro), parteluz, estor recogido y repisa
  { const fm = stdM(0x2a2533, 0.6), x0 = WIN.x - WIN.w / 2, x1 = WIN.x + WIN.w / 2, z = R.z0 + 0.03; const W = new THREE.Group(); g.add(W); U.winFrame = W;
    boxAt(W, WIN.w + 0.12, 0.06, 0.1, fm, WIN.x, WIN.y1 + 0.03, z); boxAt(W, WIN.w + 0.12, 0.05, 0.1, fm, WIN.x, WIN.y0 - 0.02, z); for (const x of [x0 - 0.03, x1 + 0.03]) boxAt(W, 0.06, WIN.y1 - WIN.y0 + 0.1, 0.1, fm, x, (WIN.y0 + WIN.y1) / 2, z);
    boxAt(W, 0.03, WIN.y1 - WIN.y0, 0.05, fm, WIN.x, (WIN.y0 + WIN.y1) / 2, z - 0.08); boxAt(W, WIN.w + 0.2, 0.13, 0.12, stdM(0x3a3447, 0.8), WIN.x, WIN.y1 + 0.13, z + 0.04);
    boxAt(g, WIN.w + 0.3, 0.035, 0.24, woodD, WIN.x, WIN.y0 - 0.02, R.z0 + 0.12);
    // en la repisa: una planta, unos libros tumbados, el bote de lápices y el despertador (19:00)
    const pl = plantPot(1.15); pl.position.set(x0 + 0.14, WIN.y0, R.z0 + 0.13); g.add(pl);
    cylAt(g, 0.04, 0.035, 0.1, stdM(0x3a3447, 0.7), x1 - 0.48, WIN.y0 + 0.05, R.z0 + 0.12, 14); for (let i = 0; i < 5; i++) { const p = cylAt(g, 0.004, 0.004, 0.15, stdM([0xd9a441, 0xc0504a, 0x3f6a9a, 0x2a2533, 0xd9cdb8][i], 0.5), x1 - 0.48 + (hash(i) - 0.5) * 0.04, WIN.y0 + 0.12, R.z0 + 0.12 + (hash(i * 3) - 0.5) * 0.04, 6); p.rotation.set((hash(i * 5) - 0.5) * 0.4, 0, (hash(i * 7) - 0.5) * 0.4); }
    const ck = new THREE.Group(); rboxAt(ck, 0.2, 0.09, 0.07, stdM(0x15131c, 0.4), 0.02, 0, 0.045, 0); U.clockTex = canvasTex(256, 110, null); const face = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.075), new THREE.MeshBasicMaterial({ map: U.clockTex, toneMapped: false })); face.position.set(0, 0.045, 0.036); ck.add(face); ck.position.set(x1 - 0.2, WIN.y0, R.z0 + 0.14); ck.rotation.y = -0.12; g.add(ck); U.clock = ck; }
  // cama bajo la ventana: canapé, colchón, edredón azul revuelto, dos almohadas y una manta a los pies
  { const B = BED, x0 = B.x - B.w / 2; boxAt(g, B.w + 0.06, 0.24, B.d + 0.06, woodD, B.x, 0.14, B.z); boxAt(g, 0.06, 0.62, B.d + 0.06, woodD, x0 - 0.03, 0.4, B.z);
    const mt = rbox(B.w, B.d, 0.2, stdM(0xcfcbe0, 0.95), 0.07); mt.rotation.x = -Math.PI / 2; mt.position.set(B.x, 0.36, B.z); g.add(mt);
    const dv = rbox(B.w * 0.8, B.d + 0.08, 0.1, stdM(0x34427e, 0.95), 0.045); dv.rotation.x = -Math.PI / 2; dv.position.set(B.x + B.w * 0.1, 0.455, B.z + 0.02); g.add(dv); const fd = rbox(0.24, B.d + 0.08, 0.12, stdM(0x3d4d90, 0.95), 0.055); fd.rotation.x = -Math.PI / 2; fd.position.set(x0 + B.w * 0.21, 0.475, B.z + 0.02); g.add(fd);
    for (let i = 0; i < 5; i++) { const w = rbox(0.5 + hash(i) * 0.4, 0.2 + hash(i * 3) * 0.2, 0.05, stdM(0x2e3a70, 0.95), 0.024); w.rotation.set(-Math.PI / 2, 0, hash(i * 7) * 3); w.position.set(B.x + 0.45 + (hash(i * 5) - 0.5) * 0.9, 0.49, B.z + 0.25 + (hash(i * 9) - 0.5) * 0.5); g.add(w); }
    for (const [dx, dz, ry] of [[0.22, -0.3, 0.08], [0.24, 0.24, -0.12]]) { const p = rbox(0.42, 0.56, 0.15, stdM(0xb9b6d0, 0.95), 0.07); p.rotation.set(-Math.PI / 2 + 0.12, 0, ry); p.position.set(x0 + dx, 0.56, B.z + dz); g.add(p); } }
  // escritorio (pared derecha) con flexo encendido, monitor, teclado y papeles; cajonera; silla de oficina
  { const dx = R.x1 - 0.36; boxAt(g, 0.66, 0.04, 1.3, woodD, dx, 0.74, -1.2); boxAt(g, 0.6, 0.7, 0.42, woodD, dx, 0.36, -0.78); for (let i = 0; i < 3; i++) { boxAt(g, 0.02, 0.19, 0.38, stdM(0x7a5c42, 0.6), dx - 0.31, 0.14 + i * 0.22, -0.78); boxAt(g, 0.02, 0.02, 0.1, dark, dx - 0.325, 0.14 + i * 0.22, -0.78); } boxAt(g, 0.04, 0.72, 0.04, woodD, dx - 0.28, 0.36, -1.8); boxAt(g, 0.04, 0.72, 0.04, woodD, dx + 0.28, 0.36, -1.8);
    const lp = new THREE.Group(); cylAt(lp, 0.07, 0.08, 0.02, dark, 0, 0.01, 0, 18); const a1 = cylAt(lp, 0.008, 0.008, 0.3, dark, -0.04, 0.16, 0, 8); a1.rotation.z = 0.28; const a2 = cylAt(lp, 0.008, 0.008, 0.26, dark, -0.15, 0.36, 0, 8); a2.rotation.z = 1.0; const sh = cylAt(lp, 0.035, 0.075, 0.1, dark, -0.27, 0.4, 0, 18); sh.rotation.z = -0.5;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), litM(0xffc880, 2.2)); bulb.position.set(-0.285, 0.375, 0); lp.add(bulb); lp.position.set(dx + 0.12, 0.76, -1.66); lp.rotation.y = -0.5; g.add(lp);
    const pl = new THREE.PointLight(0xffb060, 0.7, 2.6, 1.8); pl.position.set(dx - 0.15, 1.1, -1.55); g.add(pl); U.lamp = pl;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshBasicMaterial({ map: starTex0(), color: 0xffb060, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); pool.rotation.x = -Math.PI / 2; pool.position.set(dx - 0.12, 0.765, -1.52); g.add(pool);
    boxAt(g, 0.03, 0.34, 0.56, dark, dx + 0.2, 1.02, -1.1); boxAt(g, 0.1, 0.02, 0.2, dark, dx + 0.17, 0.77, -1.1); boxAt(g, 0.03, 0.12, 0.04, dark, dx + 0.19, 0.83, -1.1); boxAt(g, 0.14, 0.015, 0.4, stdM(0x2a2733, 0.5), dx - 0.08, 0.768, -1.1);
    for (let i = 0; i < 4; i++) { const p = boxAt(g, 0.2, 0.002, 0.28, stdM(0xe9e4d8, 0.9), dx - 0.1 + hash(i) * 0.08, 0.763 + i * 0.002, -0.72 + hash(i * 3) * 0.06); p.rotation.y = (hash(i * 5) - 0.5) * 0.5; }
    const ch = new THREE.Group(); const st = rbox(0.44, 0.44, 0.07, dark, 0.03); st.rotation.x = -Math.PI / 2; st.position.y = 0.47; ch.add(st); const bk = rbox(0.42, 0.5, 0.06, dark, 0.03); bk.position.set(0, 0.82, -0.2); bk.rotation.x = -0.1; ch.add(bk); cylAt(ch, 0.025, 0.025, 0.36, stdM(0x55525e, 0.4, { metalness: 0.6 }), 0, 0.26, 0, 10); boxAt(ch, 0.03, 0.22, 0.03, dark, 0, 0.6, -0.2);
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283, l = boxAt(ch, 0.3, 0.025, 0.035, dark, Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15); l.rotation.y = -a; cylAt(ch, 0.025, 0.025, 0.03, dark, Math.cos(a) * 0.29, 0.025, Math.sin(a) * 0.29, 10).rotation.z = Math.PI / 2; } ch.position.set(dx - 0.62, 0, -1.15); ch.rotation.y = -1.9; g.add(ch);
    // mochila apoyada en la cajonera
    const bp = rbox(0.3, 0.42, 0.17, stdM(0x2f3a5c, 0.85), 0.07); bp.position.set(dx - 0.42, 0.21, -0.42); bp.rotation.set(-0.12, -0.9, 0); g.add(bp); const bp2 = rbox(0.2, 0.16, 0.05, stdM(0x27304d, 0.85), 0.02); bp2.position.set(dx - 0.5, 0.15, -0.37); bp2.rotation.set(-0.12, -0.9, 0); g.add(bp2); }
  // estanterías (pared derecha) con libros y figuras
  for (const [y, z0, z1, sd] of [[1.42, -1.75, -0.55, 3], [1.82, -1.75, -0.55, 5], [2.2, -1.75, -0.85, 8]]) { boxAt(g, 0.22, 0.03, z1 - z0, woodD, R.x1 - 0.11, y, (z0 + z1) / 2); books(g, z0 + 0.04, z1 - 0.3, y + 0.015, R.x1 - 0.11, sd, 0.15, 'z'); cylAt(g, 0.035, 0.03, 0.09, stdM(0x6b5f8a, 0.6), R.x1 - 0.11, y + 0.06, z1 - 0.14, 12); }
  // pared izquierda: el póster «Better Days Ahead», fotos y dos pósteres; guitarra apoyada
  { const x = R.x0 + 0.004, t = canvasTex(256, 380, (c, w, h) => { c.fillStyle = '#17141f'; c.fillRect(0, 0, w, h); c.fillStyle = '#e9dfd0'; c.font = '700 54px Inter, sans-serif'; c.textAlign = 'center'; ['Better', 'Days', 'Ahead'].forEach((s, i) => c.fillText(s, w / 2, 140 + i * 66)); });
    wallArt(g, t, 0.5, 0.74, x, 1.72, 0.55, Math.PI / 2, 0, 0.02); wallArt(g, bigPoster(1), 0.44, 0.62, x, 1.75, -0.35, Math.PI / 2, 0.02); wallArt(g, bigPoster(2), 0.36, 0.5, x, 1.3, 1.25, Math.PI / 2, -0.03);
    for (let i = 0; i < 26; i++) { const z = -1.3 + (i % 9) * 0.3 + hash(i) * 0.08, y = 0.95 + Math.floor(i / 9) * 0.34 + hash(i * 3) * 0.1 + (i % 2) * 0.05; if (z > -0.6 && z < -0.1 && y > 1.4) continue; if (z > 0.28 && z < 0.82 && y > 1.3) continue; wallArt(g, photoTex(i + 1), 0.11, 0.13, x, y, z, Math.PI / 2, (hash(i * 7) - 0.5) * 0.25); }
    const gt = new THREE.Group(), gm = stdM(0xb9864a, 0.45), gd = stdM(0x2a1c14, 0.5); const b1 = cylAt(gt, 0.19, 0.19, 0.09, gm, 0, 0.2, 0, 28); b1.rotation.x = Math.PI / 2; const b2 = cylAt(gt, 0.145, 0.145, 0.09, gm, 0, 0.45, 0, 28); b2.rotation.x = Math.PI / 2; const hole = cylAt(gt, 0.045, 0.045, 0.092, gd, 0, 0.36, 0, 18); hole.rotation.x = Math.PI / 2;
    boxAt(gt, 0.05, 0.52, 0.025, gd, 0, 0.84, 0.035); boxAt(gt, 0.07, 0.16, 0.022, gd, 0, 1.17, 0.03); boxAt(gt, 0.09, 0.02, 0.012, gd, 0, 0.14, 0.05); gt.position.set(R.x0 + 0.2, 0.02, 0.05); gt.rotation.set(-0.08, 1.2, 0.14); g.add(gt); }
  // pared de la puerta (lo que se ve detrás de él en los planos de cara): pósteres, fotos y una balda
  { const z = R.z1 - 0.004; wallArt(g, bigPoster(3), 0.5, 0.7, -1.1, 1.62, z, Math.PI, 0.02, 0.02); wallArt(g, bigPoster(4), 0.4, 0.56, -0.42, 1.78, z, Math.PI, -0.03); wallArt(g, bigPoster(6), 0.42, 0.58, 1.5, 1.6, z, Math.PI, 0.02, 0.02);
    boxAt(g, 0.9, 0.03, 0.2, woodD, -1.35, 2.15, R.z1 - 0.1); books(g, -1.76, -1.1, 2.165, R.z1 - 0.1, 12, 0.15); }
  // alfombra, zapatillas y lámpara de techo (apagada)
  { const r = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.6), stdM(0x4a3d5c, 1.0)); r.rotation.x = -Math.PI / 2; r.position.set(0.2, 0.006, 0.25); r.receiveShadow = true; g.add(r);
    for (const [x, z, ry] of [[0.55, -0.42, 0.5], [0.72, -0.5, 0.15]]) { const s = new THREE.Group(); const sole = rbox(0.1, 0.27, 0.03, stdM(0xe9e6ee, 0.7), 0.014); sole.rotation.x = -Math.PI / 2; sole.position.y = 0.015; s.add(sole); const up = rbox(0.095, 0.2, 0.07, stdM(0x1d2233, 0.8), 0.03); up.rotation.x = -Math.PI / 2; up.position.set(0, 0.06, -0.03); s.add(up); const toe = rbox(0.092, 0.09, 0.04, stdM(0xe9e6ee, 0.7), 0.018); toe.rotation.x = -Math.PI / 2; toe.position.set(0, 0.04, 0.088); s.add(toe); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s); }
    cylAt(g, 0.004, 0.004, 0.32, dark, 0.2, R.h - 0.16, 0.3, 6); const sh = cylAt(g, 0.07, 0.2, 0.13, stdM(0x23202c, 0.6, { side: THREE.DoubleSide }), 0.2, R.h - 0.38, 0.3, 24); sh.castShadow = false; }
  return g; }
// el despertador de la repisa: 19:00 y DOM
function clockDraw(g) { const U = g.userData.clockTex.userData, c = U.g; c.fillStyle = '#07060a'; c.fillRect(0, 0, 256, 110); c.fillStyle = '#ffb347'; c.shadowColor = '#ff8a2a'; c.shadowBlur = 14; c.font = '700 74px "SpaceMono", monospace'; c.textAlign = 'center'; c.fillText('19:00', 118, 82); c.font = '700 22px "SpaceMono", monospace'; c.fillText('DOM', 222, 34); c.shadowBlur = 0; g.userData.clockTex.needsUpdate = true; }

// ================= la ciudad al fondo: siluetas, el sol, nubes y el LUNES que sale como la luna
function buildCity() { const g = new THREE.Group(), U = g.userData;
  // siluetas en tres términos (más claras cuanto más lejos) con ventanitas encendidas
  const wt = canvasTex(64, 128, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) for (let j = 0; j < 10; j++) if (hash(i * 7.3 + j * 3.1) > 0.62) { c.fillStyle = hash(i + j * 5) > 0.5 ? '#ffc070' : '#ffe2a8'; c.fillRect(6 + i * 14, 8 + j * 12, 7, 6); } }); wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
  for (const [z, n, col, y0, hh] of [[-460, 46, 0x5a3358, -40, 26], [-300, 40, 0x38254a, -40, 22], [-170, 30, 0x231a36, -40, 16], [-70, 16, 0x171226, -40, 9]]) for (let i = 0; i < n; i++) { const span = -z * 1.5, x = (i / (n - 1) - 0.5) * span + (hash(i * 3.3 + z) - 0.5) * span / n, w = span / n * (0.6 + hash(i * 1.7 + z) * 0.7), top = -5 - z * 0.012 + (hash(i * 7.1 + z) - 0.35) * hh;
      const t = wt.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(w / 9)), Math.max(1, Math.round((top - y0) / 18))); t.offset.set(hash(i), hash(i * 3));
      const m = new THREE.MeshBasicMaterial({ color: col, toneMapped: false, fog: false }), b = new THREE.Mesh(new THREE.BoxGeometry(w, top - y0, 10), m); b.position.set(x, (top + y0) / 2, z); g.add(b);
      const lw = new THREE.Mesh(new THREE.PlaneGeometry(w, top - y0), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: z < -250 ? 0.35 : 0.75, fog: false })); lw.position.set(x, (top + y0) / 2, z + 5.1); g.add(lw);
      if (z > -200 && hash(i * 9 + z) > 0.6) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5 + hash(i) * 5, 0.3), m); a.position.set(x + w * 0.2, top + 3, z); g.add(a); } }
  // nubes alargadas: violeta arriba y naranja por debajo
  for (let i = 0; i < 9; i++) { const t = canvasTex(512, 128, (c, w, h) => { for (let k = 0; k < 16; k++) { const x = 60 + hash(i * 11 + k) * 390, y = 44 + hash(i * 5 + k * 3) * 40, rx = 50 + hash(k + i) * 90, ry = 10 + hash(k * 7 + i) * 16, gr = c.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.save(); c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y); c.fillStyle = gr; c.fillRect(x - rx, y - rx, rx * 2, rx * 2); c.restore(); }
      c.globalCompositeOperation = 'source-in'; const gr = c.createLinearGradient(0, 30, 0, 100); gr.addColorStop(0, i % 3 ? '#4a3578' : '#5e3f84'); gr.addColorStop(0.55, '#a8456a'); gr.addColorStop(1, '#f08a48'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    const w = 260 + hash(i * 3) * 300, m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.22), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, fog: false, opacity: 0.9 })); m.position.set((hash(i * 7) - 0.5) * 900, 34 + hash(i * 13) * 210, -760 - hash(i) * 60); m.renderOrder = -5; g.add(m); (U.clouds = U.clouds || []).push(m); m.userData.x0 = m.position.x; }
  // resplandor del sol en el horizonte
  { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xff9a4a, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })); s.position.set(118, 16, -740); s.scale.set(520, 260, 1); s.renderOrder = -6; g.add(s); }
  // el LUNES: letras enormes de luna (pálidas, con cráteres) y su halo
  { const t = canvasTex(2048, 640, (c, w, h) => { c.font = '900 520px Inter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; const gr = c.createLinearGradient(0, 80, 0, 560); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(1, '#ffe2b8'); c.lineJoin = 'round'; c.strokeStyle = 'rgba(120,50,60,.55)'; c.lineWidth = 16; c.strokeText('LUNES', w / 2, h / 2 + 18); c.fillStyle = gr; c.fillText('LUNES', w / 2, h / 2 + 18);
      c.globalCompositeOperation = 'source-atop'; for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(190,150,140,${0.1 + hash(i) * 0.14})`; c.beginPath(); c.arc(hash(i * 3) * w, 80 + hash(i * 7) * 480, 8 + hash(i * 5) * 34, 0, 7); c.fill(); } });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(150, 150 * 640 / 2048), new THREE.MeshBasicMaterial({ map: t, transparent: true, color: new THREE.Color(0xffffff).multiplyScalar(1.5), toneMapped: false, fog: false, depthWrite: false })); m.renderOrder = -4;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xffd9a8, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })); halo.scale.set(300, 130, 1); halo.renderOrder = -5;
    const dark = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0x2a1238, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false, fog: false })); dark.scale.set(360, 150, 1); dark.renderOrder = -6;
    const G = new THREE.Group(); G.add(dark, halo, m); G.position.set(-34, 0, -520); g.add(G); U.lunes = G; U.halo = halo; }
  return g; }
// k: 0 escondido tras los edificios · 1 arriba del todo
function lunesAt(g, k, t) { const U = g.userData; U.lunes.position.y = lerp(-30, 48, k) + 0.6 * Math.sin(t * 0.7); U.halo.material.opacity = 0.12 + 0.22 * clamp(k * 1.5); for (const c of U.clouds) c.position.x = c.userData.x0 + t * 0.9; }

// ================= la fachada (pared del fondo del cuarto vista por fuera): 10 ventanas iguales; en 8 hay alguien sentado como él
function miniPerson(o) { const g = new THREE.Group(), mk = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }), mats = [mk(o.shirt), mk(o.pants), mk(o.skin), mk(o.hair)]; g.userData.mats = mats; g.userData.cols = mats.map(m => m.color.clone());
  const cap = (r, l, m, x, y, z, rx = 0, rz = 0) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), m); c.position.set(x, y, z); c.rotation.set(rx, 0, rz); g.add(c); return c; };
  if (o.pose === 'techo') { cap(0.13, 0.42, mats[0], 0, 0.14, 0, 0, Math.PI / 2); cap(0.08, 0.6, mats[1], 0.62, 0.1, 0.06, 0, Math.PI / 2); cap(0.08, 0.6, mats[1], 0.62, 0.1, -0.1, 0, Math.PI / 2); const h = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), mats[2]); h.position.set(-0.44, 0.17, 0); g.add(h); const hr = new THREE.Mesh(new THREE.SphereGeometry(0.122, 14, 10, 0, 6.3, 0, 1.7), mats[3]); hr.position.set(-0.46, 0.17, 0); hr.rotation.z = 1.2; g.add(hr); cap(0.045, 0.3, mats[0], -0.1, 0.2, 0.2, 0.5, 1.2); return g; }
  cap(0.14, 0.3, mats[0], 0, 0.38, 0, 0.12); for (const s of [-1, 1]) { if (o.pose === 'rodillas') { cap(0.075, 0.34, mats[1], s * 0.1, 0.28, -0.26, 0.9); cap(0.065, 0.32, mats[1], s * 0.1, 0.2, -0.42, -0.5); cap(0.05, 0.3, mats[0], s * 0.2, 0.36, -0.22, 1.2, s * 0.3); } else { cap(0.075, 0.3, mats[1], s * 0.2, 0.1, -0.2, 1.57, s * 0.6); cap(0.065, 0.3, mats[1], s * 0.14, 0.08, -0.36, 1.57, -s * 1.1); cap(0.05, 0.3, mats[0], s * 0.2, 0.34, -0.06, 0.5, s * 0.25); } }
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), mats[2]); h.position.set(0, 0.78, -0.03); g.add(h); const hr = new THREE.Mesh(new THREE.SphereGeometry(0.128, 14, 10, 0, 6.3, 0, o.long ? 2.1 : 1.75), mats[3]); hr.position.set(0, 0.79, 0.012); hr.rotation.x = 0.35; g.add(hr); if (o.long) cap(0.1, 0.22, mats[3], 0, 0.6, 0.09);
  if (o.phone) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.12), new THREE.MeshBasicMaterial({ color: 0xbfd8ff, toneMapped: false })); p.position.set(0, 0.42, -0.3); p.rotation.x = -0.9; g.add(p); g.userData.phone = p; } return g; }
function buildFacade() { const g = new THREE.Group(), U = g.userData, plaster = stdM(0xdcb596, 0.92), trim = stdM(0xb98f76, 0.9), fm = stdM(0x2a2533, 0.6); U.rooms = [];
  const sh = new THREE.Shape(); sh.moveTo(-9, -15); sh.lineTo(13, -15); sh.lineTo(13, 17); sh.lineTo(-9, 17); sh.closePath();
  const slots = []; for (const cx of FAC.cols) for (const f of FAC.floors) slots.push({ cx, cy: (WIN.y0 + WIN.y1) / 2 + f * FAC.fh, mine: cx === WIN.x && f === 0, f });
  for (const s of slots) { const h = new THREE.Path(), x0 = s.cx - WIN.w / 2, x1 = s.cx + WIN.w / 2, y0 = s.cy - 0.6, y1 = s.cy + 0.6; h.moveTo(x0, y0); h.lineTo(x0, y1); h.lineTo(x1, y1); h.lineTo(x1, y0); h.closePath(); sh.holes.push(h); }
  const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.15, bevelEnabled: false }), plaster); wall.position.z = ROOM.z0 - 0.15; wall.castShadow = wall.receiveShadow = true; g.add(wall);
  // por dentro, la pared del cuarto (misma forma, color de las otras paredes)
  { const s2 = new THREE.Shape(); s2.moveTo(ROOM.x0, 0); s2.lineTo(ROOM.x1, 0); s2.lineTo(ROOM.x1, ROOM.h); s2.lineTo(ROOM.x0, ROOM.h); s2.closePath(); const h = new THREE.Path(), x0 = WIN.x - WIN.w / 2, x1 = WIN.x + WIN.w / 2; h.moveTo(x0, WIN.y0); h.lineTo(x0, WIN.y1); h.lineTo(x1, WIN.y1); h.lineTo(x1, WIN.y0); h.closePath(); s2.holes.push(h);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s2), stdM(0x9a94b4, 0.95)); m.position.z = ROOM.z0 + 0.002; m.receiveShadow = true; g.add(m); }
  const X = new THREE.Group(); g.add(X); U.ext = X;                    // lo de fuera (solo se ve con la cámara fuera)
  for (let f = -3; f <= 3; f++) boxAt(X, 22, 0.16, 0.1, trim, 2, 0.02 + f * FAC.fh + (WIN.y0 - 0.5), ROOM.z0 - 0.2).castShadow = false;
  cylAt(X, 0.06, 0.06, 32, stdM(0x5a5262, 0.5, { metalness: 0.5 }), 2.0, 1, ROOM.z0 - 0.24, 10);
  const people = [{ shirt: 0x7a4a3a, pants: 0x8a8690, skin: 0xe9b890, hair: 0x2a1a16, long: 1 }, { shirt: 0x3a5a7a, pants: 0x2a2a36, skin: 0xd9a070, hair: 0x15100e, pose: 'rodillas' }, { shirt: 0x8a6a2a, pants: 0x4a4a5a, skin: 0xf0c4a0, hair: 0x8a5a2a, phone: 1 }, { shirt: 0x5a3a6a, pants: 0x9a96a0, skin: 0xc68a62, hair: 0x1a1414, long: 1, pose: 'rodillas' },
    { shirt: 0x3a6a5a, pants: 0x2f3a5c, skin: 0xe9b890, hair: 0x3a2618 }, { shirt: 0x9a4a5a, pants: 0x3a3a46, skin: 0xf0c4a0, hair: 0x5a3a22, pose: 'techo' }, { shirt: 0x4a4a8a, pants: 0x8a8690, skin: 0xd9a070, hair: 0x15100e, phone: 1 }, null, null];
  const wallCols = [0xc9a58a, 0x9ab0c0, 0xd0b0a0, 0xa9b89a, 0xc0a0b8, 0xd8c090, 0x9aa0c8, 0x808090, 0x808090]; let pi = 0;
  for (const s of slots) { const x0 = s.cx - WIN.w / 2, zf = ROOM.z0 - 0.16;
    boxAt(X, WIN.w + 0.24, 0.07, 0.2, trim, s.cx, s.cy - 0.64, zf - 0.04); boxAt(X, WIN.w + 0.16, 0.09, 0.08, trim, s.cx, s.cy + 0.65, zf); boxAt(X, 0.05, 1.2, 0.05, fm, s.cx, s.cy, zf + 0.06); for (const sx of [-1, 1]) boxAt(X, 0.05, 1.2, 0.05, fm, s.cx + sx * (WIN.w / 2 - 0.025), s.cy, zf + 0.06); boxAt(X, WIN.w, 0.05, 0.05, fm, s.cx, s.cy + 0.575, zf + 0.06); boxAt(X, WIN.w, 0.05, 0.05, fm, s.cx, s.cy - 0.575, zf + 0.06);
    if (hash(s.cx * 3 + s.f) > 0.55) { const ac = boxAt(X, 0.7, 0.42, 0.3, stdM(0xcfcbd6, 0.6), s.cx + (s.cx > 1 ? 1.45 : -1.45), s.cy - 0.75, zf - 0.16); }
    if (s.mine) { U.mine = s; continue; }
    const R = new THREE.Group(), P = people[pi], wc = wallCols[pi]; pi++; R.position.set(s.cx, s.cy - 0.6 - WIN.y0, ROOM.z0); X.add(R);
    const mk = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }), mats = [mk(wc), mk(new THREE.Color(wc).multiplyScalar(0.8).getHex()), mk(0x6a5040), mk(0x4a5a90), mk(0xd0cce0)], cols = mats.map(m => m.color.clone());
    const pl = (w, h, m, x, y, z, rx = 0, ry = 0) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); R.add(p); return p; };
    pl(3.4, 2.6, mats[0], 0, 1.3, 3.0, 0, Math.PI); pl(3.0, 2.6, mats[1], -1.7, 1.3, 1.5, 0, Math.PI / 2); pl(3.0, 2.6, mats[1], 1.7, 1.3, 1.5, 0, -Math.PI / 2); pl(3.4, 3.0, mats[2], 0, 0, 1.5, -Math.PI / 2); pl(3.4, 3.0, mats[1], 0, 2.6, 1.5, Math.PI / 2);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 1.2), mats[3]); bed.position.set(-0.2, 0.25, 0.85); R.add(bed); const pil = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.7), mats[4]); pil.position.set(-0.95, 0.56, 0.85); R.add(pil);
    for (let i = 0; i < 3; i++) { const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), mk([0x6a4a7a, 0xc07050, 0x4a6a8a][(i + pi) % 3])); fr.position.set(-0.9 + i * 0.75, 1.7 + (i % 2) * 0.15, 2.98); fr.rotation.y = Math.PI; R.add(fr); mats.push(fr.material); cols.push(fr.material.color.clone()); }
    let per = null; if (P) { per = miniPerson(P); per.scale.setScalar(1.3); per.position.set(0.15 + (hash(pi) - 0.5) * 0.5, 0.5, 0.7); per.rotation.y = Math.PI + (hash(pi * 3) - 0.5) * 0.7; if (P.pose === 'techo') { per.rotation.y = 0; per.position.x = 0; } R.add(per); }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xffb060, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); glow.position.set(1.1, 1.3, 2.2); glow.scale.setScalar(2.6); R.add(glow);
    // sin nadie: persiana bajada
    let blind = null; if (!P) { blind = new THREE.Group(); for (let i = 0; i < 13; i++) boxAt(blind, WIN.w, 0.085, 0.02, stdM(0x8a8494, 0.7), 0, WIN.y0 + 0.05 + i * 0.094, -0.06).castShadow = false; R.add(blind); }
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w, 1.2), new THREE.MeshBasicMaterial({ color: 0x1a1a30, transparent: true, opacity: 1, toneMapped: false })); pane.position.set(0, WIN.y0 + 0.6, -0.02); pane.rotation.y = Math.PI; R.add(pane);
    U.rooms.push({ R, s, mats, cols, per, glow, pane, has: !!P }); }
  return g; }
// enciende la habitación i (k de 0 a 1): la luz cálida, el cristal se aclara y se ve a quien está dentro
const _dk = new THREE.Color(0x0e0c18);
function roomLit(r, k) { k = clamp(k); r.mats.forEach((m, i) => m.color.copy(_dk).lerp(r.cols[i], 0.12 + 0.88 * k)); r.pane.material.opacity = r.has ? 0.9 - 0.82 * k : 0; r.glow.material.opacity = 0.5 * k;
  if (r.per) { const pm = r.per.userData; pm.mats.forEach((m, i) => m.color.copy(_dk).lerp(pm.cols[i], 0.1 + 0.9 * k)); if (pm.phone) pm.phone.material.color.setHex(0xbfd8ff).multiplyScalar(0.3 + 0.9 * k); } }
// ---------------------------------------------------------------- EL CHICO (estilo anime, según la lámina de Javi): cabeza con barbilla, ojos grandes dibujados en lienzo
// (se redibujan: parpadeo, mirada, cejas de preocupación, reflejo), pelo revuelto de mechones, sudadera oscura con capucha, pantalón gris claro y manos con dedos.
// El frente es +z; su izquierda (L) es +x. Medidas reales en metros. Articulaciones en userData.J (cadera, pecho, cuello, cabeza, hombros, codos, muñecas, caderas, rodillas).
const HEAD_R = 0.112;
function headPt(az, el, k = 1, out = new THREE.Vector3()) {
  const ce = Math.cos(el); let x = Math.sin(az) * ce, y = Math.sin(el), z = Math.cos(az) * ce;
  x *= 0.9; z *= z > 0 ? 0.93 : 0.98;
  if (y < 0) { const t = -y, fr = Math.max(0, Math.cos(az)); x *= 1 - 0.42 * Math.pow(t, 1.5); if (z > 0) z = z * (1 - 0.1 * t * t) + 0.17 * Math.sin(Math.PI * t) * fr * fr; else z *= 1 - 0.3 * t; y *= 1 + 0.13 * t; }
  return out.set(x * HEAD_R * k, y * HEAD_R * k, z * HEAD_R * k);
}
// malla de un trozo de superficie: fn(az, v) → punto; u crece con az (hacia +x), v hacia arriba
function surfGeo(az0, az1, na, nv, fn) { const pos = [], uv = [], idx = [], p = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= na; i++) { const u = i / na, v = j / nv; fn(lerp(az0, az1, u), v, p); pos.push(p.x, p.y, p.z); uv.push(u, v); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < na; i++) { const a = j * (na + 1) + i, b = a + 1, c = a + na + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; }
const patchGeo = (az0, az1, el0, el1, k, na = 16, nv = 16) => surfGeo(az0, az1, na, nv, (az, v, p) => headPt(az, lerp(el0, el1, v), k, p));
// mechón: tubo aplastado que se afila, apoyado en la cabeza (la cara ancha mira hacia fuera)
function lockGeo(pts, w, th, sg = 9) { const cv = new THREE.CatmullRomCurve3(pts), pos = [], idx = [], R = 6, p = new THREE.Vector3(), t = new THREE.Vector3(), n = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i <= sg; i++) { const u = i / sg; cv.getPoint(u, p); cv.getTangent(u, t); n.copy(p).normalize(); n.addScaledVector(t, -t.dot(n)).normalize(); b.crossVectors(t, n); const f = Math.pow(1 - u, 0.7) * (0.5 + 0.5 * Math.min(1, u * 5));
    for (let k = 0; k < R; k++) { const a = k / R * Math.PI * 2; pos.push(p.x + b.x * w * f * Math.cos(a) + n.x * th * f * Math.sin(a), p.y + b.y * w * f * Math.cos(a) + n.y * th * f * Math.sin(a), p.z + b.z * w * f * Math.cos(a) + n.z * th * f * Math.sin(a)); } }
  for (let i = 0; i < sg; i++) for (let k = 0; k < R; k++) { const a = i * R + k, b2 = i * R + (k + 1) % R, c = a + R, d = b2 + R; idx.push(a, c, b2, b2, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }

// ---- el ojo (lienzo 384 × 512; el ojo derecho se dibuja en espejo). o: open 0–1, gx/gy mirada (−1…1), worry 0–1, refl 0–1 (el LUNES reflejado), mirror
function drawEye(tex, o) { const c = tex.userData.g, W2 = 384, H2 = 512; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W2, H2); c.save(); if (o.mirror) { c.translate(W2, 0); c.scale(-1, 1); }
  const cx = 192, cy = 372, ew = 112, op = clamp(o.open ?? 1), eh = 66 * (0.25 + 0.75 * op), w = clamp(o.worry ?? 0), gx = (o.gx ?? 0) * (o.mirror ? -1 : 1), gy = o.gy ?? 0, inX = cx - ew, inY = cy + 8, outX = cx + ew, outY = cy - 4 + 12 * w;
  const lidU = () => { c.moveTo(inX, inY); c.bezierCurveTo(cx - ew * 0.5, cy - eh * (1.25 - 0.35 * w), cx + ew * 0.45, cy - eh * 1.42, outX, outY); }, lidL = () => c.bezierCurveTo(cx + ew * 0.5, cy + eh * 0.82, cx - ew * 0.4, cy + eh * 0.78, inX, inY);
  if (op > 0.1) {
    c.save(); c.beginPath(); lidU(); lidL(); c.closePath(); c.fillStyle = '#f6f0ea'; c.fill(); c.clip();
    const ix = cx + gx * 30, iy = cy - 6 + gy * 22, ir = 62, gr = c.createRadialGradient(ix, iy + 14, 6, ix, iy, ir); gr.addColorStop(0, '#6a7c9c'); gr.addColorStop(0.55, '#3c4660'); gr.addColorStop(1, '#1d2230'); c.fillStyle = gr; c.beginPath(); c.arc(ix, iy, ir, 0, 7); c.fill();
    c.strokeStyle = '#11141c'; c.lineWidth = 6; c.beginPath(); c.arc(ix, iy, ir - 2, 0, 7); c.stroke();
    { const g2 = c.createRadialGradient(ix, iy + ir * 0.62, 2, ix, iy + ir * 0.62, ir * 0.75); g2.addColorStop(0, 'rgba(255,170,90,.7)'); g2.addColorStop(1, 'rgba(255,170,90,0)'); c.fillStyle = g2; c.beginPath(); c.arc(ix, iy, ir - 3, 0, 7); c.fill(); }      // el atardecer en el iris
    c.fillStyle = '#090a10'; c.beginPath(); c.arc(ix, iy, 25, 0, 7); c.fill();
    if ((o.refl ?? 0) > 0.01) { c.save(); c.beginPath(); c.arc(ix, iy, ir - 4, 0, 7); c.clip(); c.globalAlpha = o.refl; if (o.mirror) { c.translate(ix, 0); c.scale(-1, 1); c.translate(-ix, 0); } c.fillStyle = '#fff3d8'; c.shadowColor = '#ffe0a0'; c.shadowBlur = 10; c.font = '900 30px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('LUNES', ix, iy + 34 - 16 * o.refl); c.restore(); }
    { const g3 = c.createLinearGradient(0, cy - eh * 1.4, 0, cy); g3.addColorStop(0, 'rgba(40,24,50,.62)'); g3.addColorStop(1, 'rgba(40,24,50,0)'); c.fillStyle = g3; c.fillRect(0, 0, W2, H2); }                                             // sombra del párpado
    c.fillStyle = 'rgba(255,255,255,.96)'; c.beginPath(); c.ellipse(ix - 22, iy - 26, 13, 17, -0.3, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(ix + 24, iy + 22, 6, 0, 7); c.fill(); c.restore();
    c.strokeStyle = '#1a1116'; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 15; c.beginPath(); lidU(); c.stroke();                                                         // pestañas de arriba (línea gruesa)
    c.fillStyle = '#1a1116'; c.beginPath(); c.moveTo(outX - 26, outY - 16); c.quadraticCurveTo(outX + 8, outY - 6, outX + 22, outY - 20); c.quadraticCurveTo(outX + 10, outY + 8, outX - 12, outY + 4); c.fill();
    c.strokeStyle = 'rgba(120,70,60,.55)'; c.lineWidth = 4; c.beginPath(); c.moveTo(inX + 26, inY - eh * 1.0 - 14); c.quadraticCurveTo(cx + 10, cy - eh * 1.42 - 26, outX - 12, outY - 30); c.stroke();                               // pliegue del párpado
    c.strokeStyle = 'rgba(110,64,56,.75)'; c.lineWidth = 4; c.beginPath(); c.moveTo(outX - 4, outY + 6); c.bezierCurveTo(cx + ew * 0.5, cy + eh * 0.84, cx - ew * 0.1, cy + eh * 0.82, cx - ew * 0.45, cy + eh * 0.62); c.stroke();
  } else { c.strokeStyle = '#1a1116'; c.lineCap = 'round'; c.lineWidth = 13; c.beginPath(); c.moveTo(inX, inY); c.quadraticCurveTo(cx, cy + 34, outX, outY + 6); c.stroke(); }
  // ceja: gruesa junto a la nariz y fina fuera; con preocupación, el extremo de dentro sube
  { const by = cy - 150, yi = by - 4 - 30 * w, yo = by + 6 + 14 * w, xi = cx - ew * 0.98, xo = cx + ew * 1.12, ym = by - 16 - 6 * w; c.fillStyle = '#231718'; c.beginPath(); c.moveTo(xi, yi - 12); c.quadraticCurveTo(cx, ym - 12, xo, yo - 3); c.lineTo(xo, yo + 3); c.quadraticCurveTo(cx, ym + 10, xi, yi + 13); c.closePath(); c.fill(); }
  c.restore(); tex.needsUpdate = true; }
// la boca (lienzo 256 × 160): m de −1 (triste) a +1 (sonrisa)
function drawMouth(tex, m) { const c = tex.userData.g; c.clearRect(0, 0, 256, 160); c.lineCap = 'round'; c.strokeStyle = '#7a3a38'; c.lineWidth = 7; c.beginPath(); c.moveTo(92, 74 - 5 * m); c.quadraticCurveTo(128, 74 + 13 * m, 164, 74 - 5 * m); c.stroke();
  c.strokeStyle = 'rgba(150,80,70,.4)'; c.lineWidth = 5; c.beginPath(); c.moveTo(112, 98); c.quadraticCurveTo(128, 103, 144, 98); c.stroke(); tex.needsUpdate = true; }

// ---- mano con dedos: la muñeca en el origen, los dedos hacia −y y la palma mirando a −z. side: +1 izquierda, −1 derecha (el pulgar cambia de lado)
function handModel(side, mSkin) { const g = new THREE.Group(), F = []; const cap = (r, l, par, y) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 5, 10), mSkin); c.position.y = y; c.castShadow = true; par.add(c); return c; };
  const palm = rbox(0.078, 0.084, 0.026, mSkin, 0.012); palm.position.set(0, -0.046, 0); g.add(palm);
  [[-0.028, 0.03, 0.022], [-0.0095, 0.034, 0.025], [0.0095, 0.032, 0.024], [0.028, 0.026, 0.019]].forEach(([x, l1, l2], i) => { const a = new THREE.Group(); a.position.set(x * side * -1, -0.088, 0); g.add(a); cap(0.0088, l1, a, -l1 / 2 - 0.004); const b = new THREE.Group(); b.position.y = -l1 - 0.012; a.add(b); cap(0.0082, l2, b, -l2 / 2 - 0.004); F.push([a, b]); });
  const t0 = new THREE.Group(); t0.position.set(-0.036 * side, -0.03, -0.004); t0.rotation.z = -0.75 * side; g.add(t0); cap(0.0098, 0.032, t0, -0.022); const t1 = new THREE.Group(); t1.position.y = -0.046; t0.add(t1); cap(0.009, 0.022, t1, -0.014);
  g.userData = { F, t0, t1, side }; return g; }
function handCurl(h, k, spread = 0) { const U = h.userData; U.F.forEach(([a, b], i) => { a.rotation.x = k * 1.25; b.rotation.x = k * 1.35; a.rotation.z = spread * (i - 1.5) * 0.09 * U.side; }); U.t1.rotation.x = k * 0.7; U.t0.rotation.x = k * 0.9; U.t0.rotation.z = -U.side * lerp(0.75, 0.12, clamp(k * 1.2)); }

function animeBoy() {
  const d = new THREE.Group(), J = {}, U = { J }, mSkin = toonM(0xf2c5a2), mSkinH = toonM(0xf2c5a2), mHood = toonM(0x34314a), mHood2 = toonM(0x403c58), mPants = toonM(0xc4c2c6), mHair = toonM(0x2b1d1f), mSock = toonM(0xe9e6ee);
  U.mats = { mSkin, mSkinH, mHair, mHood, mHood2, mPants }; const piv = (par, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); par.add(p); return p; };
  const mesh = (geo, m, par, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; par.add(o); return o; };
  const cap = (r, l, m, par, y) => mesh(new THREE.CapsuleGeometry(r, l, 6, 14), m, par, 0, y, 0);
  J.hip = piv(d, 0, 0.09, 0); { const p = mesh(new THREE.SphereGeometry(0.15, 20, 14), mPants, J.hip); p.scale.set(1.12, 0.62, 0.9); }
  J.chest = piv(J.hip, 0, 0.12, 0);
  { const pr = [[0.001, -0.17], [0.172, -0.17], [0.19, -0.1], [0.186, 0], [0.18, 0.12], [0.19, 0.24], [0.186, 0.31], [0.145, 0.365], [0.075, 0.4], [0.056, 0.425], [0.001, 0.425]].map(p => new THREE.Vector2(p[0], p[1]));
    const t = mesh(new THREE.LatheGeometry(pr, 36), mHood, J.chest); t.scale.set(1, 1, 0.7); U.torso = t;
    const hood = mesh(new THREE.SphereGeometry(0.09, 18, 12), mHood2, J.chest, 0, 0.365, -0.085); hood.scale.set(1.3, 0.8, 0.8); const col = mesh(new THREE.TorusGeometry(0.068, 0.03, 10, 24), mHood2, J.chest, 0, 0.405, 0.004); col.rotation.x = Math.PI / 2 + 0.25; col.scale.set(1, 0.85, 1);
    const pk = rbox(0.21, 0.1, 0.03, mHood2, 0.03); pk.position.set(0, -0.045, 0.122); J.chest.add(pk); for (const s of [-1, 1]) { const st = mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.085, 6), toonM(0x8f8aa6), J.chest, s * 0.03, 0.325, 0.126); st.rotation.x = -0.12; } }
  J.neck = piv(J.chest, 0, 0.4, 0); mesh(new THREE.CylinderGeometry(0.04, 0.046, 0.11, 14), mSkinH, J.neck, 0, 0.035, 0);
  J.head = piv(J.neck, 0, 0.075, 0); const HC = piv(J.head, 0, 0.1, 0); U.headC = HC;                           // HC: centro de la cabeza
  U.headMesh = mesh(surfGeo(-Math.PI, Math.PI, 144, 90, (az, v, p) => headPt(az, lerp(-Math.PI / 2, Math.PI / 2, v), 1, p)), mSkinH, HC);
  for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.023, 12, 10), mSkinH, HC); headPt(s * 1.52, -0.1, 0.99, e.position); e.scale.set(0.45, 1, 0.72); }
  { const n = mesh(new THREE.SphereGeometry(0.009, 12, 10), mSkinH, HC); headPt(0, -0.36, 1.0, n.position); n.position.z -= 0.0035; n.scale.set(0.55, 0.9, 0.9); n.castShadow = false; }
  // ojos, boca (lienzos sobre la piel)
  const eyeTex = () => canvasTex(384, 512, null), eyeM = t => new THREE.MeshToonMaterial({ map: t, gradientMap: mSkinH.gradientMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  U.eyeL = eyeTex(); U.eyeR = eyeTex(); U.mouthT = canvasTex(256, 160, null); const AZ = 0.385, DA = 0.37;
  U.eyeML = mesh(patchGeo(AZ - DA, AZ + DA, -0.3, 0.56, 1.004, 24, 24), eyeM(U.eyeL), HC); U.eyeMR = mesh(patchGeo(-AZ - DA, -AZ + DA, -0.3, 0.56, 1.004, 24, 24), eyeM(U.eyeR), HC); U.mouthM = mesh(patchGeo(-0.3, 0.3, -0.86, -0.5, 1.004, 14, 10), eyeM(U.mouthT), HC);
  for (const m of [U.eyeML, U.eyeMR, U.mouthM]) { m.castShadow = false; m.renderOrder = 3; }
  // pelo: casquete + flequillo + patillas + mechones revueltos de coronilla y nuca
  const hairline = az => { const a = Math.abs(az); return a < 0.9 ? 0.74 : a < 1.5 ? lerp(0.74, 0.1, (a - 0.9) / 0.6) : a < 2.0 ? lerp(0.1, -0.38, (a - 1.5) / 0.5) : -0.62; };
  const HG = new THREE.Group(); HC.add(HG); U.hair = HG; mesh(surfGeo(-Math.PI, Math.PI, 64, 22, (az, v, p) => { const el = lerp(hairline(az), Math.PI / 2, v); headPt(az, el, 1.045 + 0.03 * Math.sin(Math.max(0, el)), p); }), mHair, HG);
  const hp = (az, el, k) => headPt(az, el, k), lock = (pts, w, th = 0.0075) => mesh(lockGeo(pts, w, th), mHair, HG);
  for (let i = 0; i < 10; i++) { const a = -0.92 + i * 0.205 + (hash(i * 3.1) - 0.5) * 0.08, sw = 0.1 + (hash(i * 5.7) - 0.3) * 0.22, tip = 0.2 + hash(i * 7.3) * 0.2 + Math.abs(a) * 0.12; lock([hp(a * 0.75, 1.08, 1.06), hp(a * 0.95, 0.72, 1.11), hp(a + sw * 0.5, 0.45, 1.1), hp(a + sw, tip, 1.075)], 0.026 + hash(i) * 0.008); }
  for (const s of [-1, 1]) { for (let i = 0; i < 3; i++) lock([hp(s * (0.95 + i * 0.16), 0.8, 1.06), hp(s * (1.08 + i * 0.17), 0.3, 1.1), hp(s * (1.12 + i * 0.15), -0.1 - i * 0.05, 1.08), hp(s * (1.06 + i * 0.16), -0.36 + i * 0.1, 1.05)], 0.022);
    for (let i = 0; i < 2; i++) lock([hp(s * (1.45 + i * 0.3), 0.6, 1.07), hp(s * (1.55 + i * 0.3), 0.1, 1.12), hp(s * (1.6 + i * 0.3), -0.34, 1.12 + i * 0.03)], 0.032); }
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2 + hash(i * 2.3) * 0.3, e0 = 0.85 + hash(i * 4.1) * 0.5, tw = (hash(i * 6.7) - 0.5) * 0.7; lock([hp(a, e0, 1.05), hp(a + tw * 0.4, e0 - 0.22, 1.16), hp(a + tw, e0 - 0.42, 1.2 + hash(i * 9.1) * 0.1)], 0.03 + hash(i) * 0.012, 0.009); }
  for (let i = 0; i < 11; i++) { const a = 2.0 + (i / 10) * (Math.PI * 2 - 4.0), tw = (hash(i * 3.7) - 0.5) * 0.25; lock([hp(a, 0.25, 1.06), hp(a + tw * 0.5, -0.25, 1.12), hp(a + tw, -0.74 - hash(i * 5.1) * 0.12, 1.16)], 0.034, 0.009); }
  // brazos y manos
  for (const s of [1, -1]) { const k = s > 0 ? 'L' : 'R', sh = piv(J.chest, s * 0.172, 0.325, 0); cap(0.056, 0.2, mHood, sh, -0.135); const sph = mesh(new THREE.SphereGeometry(0.066, 14, 10), mHood, sh);
    const el = piv(sh, 0, -0.27, 0); cap(0.05, 0.16, mHood, el, -0.115); mesh(new THREE.CylinderGeometry(0.052, 0.05, 0.045, 14), mHood2, el, 0, -0.225, 0); const h = piv(el, 0, -0.25, 0); const hm = handModel(s, mSkin); h.add(hm); hm.traverse(o => { if (o.isMesh) o.castShadow = true; });
    J['sh' + k] = sh; J['el' + k] = el; J['h' + k] = h; U['hand' + k] = hm;
    const hpj = piv(J.hip, s * 0.09, -0.01, 0); cap(0.076, 0.3, mPants, hpj, -0.2); const kn = piv(hpj, 0, -0.42, 0); cap(0.062, 0.3, mPants, kn, -0.2); mesh(new THREE.SphereGeometry(0.07, 12, 10), mPants, kn);
    const ft = rbox(0.085, 0.2, 0.07, mSock, 0.03); ft.position.set(0, -0.43, 0.05); ft.rotation.x = Math.PI / 2 - 0.5; kn.add(ft); J['hp' + k] = hpj; J['kn' + k] = kn; }
  d.userData = U; return d;
}
// ---- posturas
const _yn = new THREE.Vector3(0, -1, 0), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _m4b = new THREE.Matrix4();
function aimJoint(j, dirParent) { j.quaternion.setFromUnitVectors(_yn, dirParent.clone().normalize()); }
// sentado con las piernas cruzadas (direcciones en el espacio del muñeco)
function poseCross(d) { const J = d.userData.J; for (const k of ['hip', 'chest', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'hL', 'hR', 'hpL', 'hpR', 'knL', 'knR']) J[k].rotation.set(0, 0, 0);
  const leg = (k, s, ankle) => { const hp = J['hp' + k], kn = J['kn' + k], td = new THREE.Vector3(0.72 * s, -0.045, 0.69).normalize(); aimJoint(hp, td); const knee = hp.position.clone().addScaledVector(td, 0.42), sd = ankle.clone().sub(knee).normalize(); kn.quaternion.setFromUnitVectors(_yn, sd.applyQuaternion(hp.quaternion.clone().invert())); };
  leg('L', 1, new THREE.Vector3(-0.06, -0.035, 0.5)); leg('R', -1, new THREE.Vector3(0.08, -0.035, 0.37)); }
// brazo (dos huesos de 0,27 y 0,25 m) hasta un punto del mundo; sw gira el codo alrededor de la línea hombro–mano
function armTo(d, side, target, sw = 0, k = 1) { if (k <= 0.001) return; const J = d.userData.J, sh = J['sh' + side], el = J['el' + side], a = 0.27, b = 0.25; d.updateMatrixWorld(true);
  const p = sh.parent.worldToLocal(target.clone()).sub(sh.position), dist = clamp(p.length(), Math.abs(a - b) + 0.01, a + b - 0.002), al = Math.acos(clamp((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1)), be = Math.acos(clamp((a * a + b * b - dist * dist) / (2 * a * b), -1, 1));
  const q0 = sh.quaternion.clone(), e0 = el.quaternion.clone(); sh.quaternion.setFromUnitVectors(_yn, p.normalize()); sh.rotateY(sw); sh.rotateX(al); el.rotation.set(-(Math.PI - be), 0, 0);
  if (k < 0.999) { sh.quaternion.copy(q0.slerp(sh.quaternion, k)); el.quaternion.copy(e0.slerp(el.quaternion, k)); } }
// orienta la mano en el mundo: los dedos hacia F y la palma mirando hacia N
function handAim(d, side, F, N, k = 1) { const h = d.userData.J['h' + side]; d.updateMatrixWorld(true); const y = F.clone().normalize().negate(), z = N.clone().normalize().negate(); z.addScaledVector(y, -y.dot(z)).normalize(); const x = new THREE.Vector3().crossVectors(y, z);
  _m4b.makeBasis(x, y, z); _qa.setFromRotationMatrix(_m4b); h.parent.getWorldQuaternion(_qb); _qa.premultiply(_qb.invert()); if (k >= 0.999) h.quaternion.copy(_qa); else h.quaternion.slerp(_qa, k); }
const headW = d => wpos(d.userData.headC);
// la cabeza mira a un punto del mundo (reparte entre cuello y cabeza)
function lookAtPt(d, target, k = 1, lim = 0.9) { const J = d.userData.J; d.updateMatrixWorld(true); const p = J.chest.worldToLocal(target.clone()).sub(J.neck.position).sub(new THREE.Vector3(0, 0.175, 0)); const yaw = clamp(Math.atan2(p.x, p.z), -lim, lim) * k, pit = clamp(-Math.atan2(p.y, Math.hypot(p.x, p.z)), -0.5, 0.75) * k;
  J.neck.rotation.y += yaw * 0.45; J.head.rotation.y += yaw * 0.55; J.neck.rotation.x += pit * 0.4; J.head.rotation.x += pit * 0.6; }
// «fantasma»: la piel y el pelo se vuelven translúcidos para ver el cerebro
function boyGhost(d, g) { const U = d.userData, M = U.mats; g = clamp(g); for (const [m, o] of [[M.mSkinH, 1 - 0.7 * g], [M.mHair, 1 - 0.8 * g]]) { const tr = g > 0.005; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = o; }
  for (const m of [U.eyeML, U.eyeMR, U.mouthM]) m.material.opacity = 1 - 0.85 * g; }
// ---------------------------------------------------------------- OBJETOS: el cuaderno (dos páginas que se escriben solas) y el boli, los «pensamientos del lunes» (despertador, calendario, tareas),
// el cerebro con su alarma, el pulso rojo hasta el pecho y el nudo que aprieta.
const NB = { pw: 0.148, ph: 0.21, cw: 640, ch: 908 };
// bloc de notas de una página (espiral arriba). Ejes: x a la derecha del texto, y hacia arriba, z hacia quien escribe
function buildNotebook() { const g = new THREE.Group(), U = g.userData, cover = stdM(0x2f3f73, 0.7);
  const open = new THREE.Group(); g.add(open); U.open = open; const cv = rbox(0.158, 0.222, 0.007, cover, 0.006); cv.rotation.x = -Math.PI / 2; cv.position.y = 0.0035; open.add(cv);
  U.tex = canvasTex(NB.cw, NB.ch, null); { const p = new THREE.Mesh(new THREE.PlaneGeometry(NB.pw, NB.ph), stdM(0xffffff, 0.9, { map: U.tex })); p.rotation.x = -Math.PI / 2; p.position.set(0, 0.0078, 0.003); p.receiveShadow = true; open.add(p); }
  for (let i = 0; i < 12; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0011, 5, 10), stdM(0xcfd2da, 0.3, { metalness: 0.8 })); r.position.set(-0.066 + i * 0.012, 0.008, -0.105); open.add(r); }
  const closed = new THREE.Group(); g.add(closed); U.closed = closed; const cc = rbox(0.158, 0.222, 0.016, cover, 0.006); cc.rotation.x = -Math.PI / 2; cc.position.y = 0.008; closed.add(cc); const lb = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.04), stdM(0xe9e4d8, 0.9)); lb.rotation.x = -Math.PI / 2; lb.position.set(0, 0.0165, -0.04); closed.add(lb);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }
function buildPen() { const g = new THREE.Group(); const b = cyl(0.0045, 0.0045, 0.125, stdM(0xe9e6ee, 0.4), 10); b.position.y = 0.0825; g.add(b); const t = cyl(0.0045, 0.0008, 0.02, stdM(0x23212e, 0.4), 10); t.position.y = 0.01; g.add(t); const c = cyl(0.0048, 0.0048, 0.03, stdM(0x2f3f73, 0.5), 10); c.position.y = 0.135; g.add(c); return g; }   // la punta en el origen, el boli hacia +y
// texto «a mano»: letra a letra con un poco de baile; k = cuánto se ha escrito (0–1). Devuelve dónde va la punta (píxeles del lienzo)
function handText(c, txt, x, y, px, k, seed = 1, col = '#28305e') { c.fillStyle = col; c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.font = `500 ${px}px Inter, sans-serif`; const n = Math.floor(txt.length * clamp(k) + 0.0001); let cx = x, tip = [x, y];
  for (let i = 0; i < txt.length; i++) { const ch = txt[i], w = c.measureText(ch).width * 0.96; if (i < n) { c.save(); c.translate(cx, y + (hash(seed * 7 + i) - 0.5) * px * 0.1); c.transform(1, 0, -0.22, 1, 0, 0); c.rotate((hash(seed * 3 + i * 1.7) - 0.5) * 0.09); c.fillText(ch, 0, 0); c.restore(); tip = [cx + w, y - px * 0.25]; } cx += w; } return tip; }
function strokeK(c, pts, k, lw = 5, col = '#28305e') { if (k <= 0.001) return; let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash([L * clamp(k), L * 2]); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); c.restore(); }
function paper(c) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#f4f0e6'; c.fillRect(0, 0, NB.cw, NB.ch); c.strokeStyle = 'rgba(90,110,170,.26)'; c.lineWidth = 2; for (let y = 150; y < 440; y += 86) { c.beginPath(); c.moveTo(30, y); c.lineTo(NB.cw - 30, y); c.stroke(); } }
// la página: arriba, la lista de lo que preocupa del lunes (w = [título, línea 1, 2, 3], de 0 a 1); abajo, el dato del estudio (s = { a, b, moon, nine }). Devuelve dónde va la punta del boli
const NOTE_LINES = ['– Entregar el trabajo', '– Reunión a las 9:00', '– Madrugar (6:45)'], NOTE_Y = [222, 308, 394];
function drawNote(nb, w, s) { const t = nb.userData.tex, c = t.userData.g, ink = '#28305e'; paper(c); let tip = [60, 100];
  { const a = handText(c, 'LUNES', 56, 122, 80, w[0], 1); if (w[0] > 0) tip = a; strokeK(c, [[52, 140], [180, 146], [300, 138]], seg(w[0], 0.8, 1), 6); }
  NOTE_LINES.forEach((x, i) => { if (w[i + 1] > 0) { const b = handText(c, x, 46, NOTE_Y[i], 46, w[i + 1], i + 2); tip = b; } });
  // quien lo apunta se duerme antes: dos barras (lo que tarda en dormirse cada uno) y la diferencia, «9 min»
  const y1 = 560, y2 = 700, x0 = 56, xa = 580, xb = 404;
  if (s.a > 0) { handText(c, 'Sin apuntar', x0, y1 - 22, 38, seg(s.a, 0, 0.45), 41); strokeK(c, [[x0, y1 + 14], [xa, y1 + 14]], seg(s.a, 0.3, 1), 30, '#8a90b8'); tip = [lerp(x0, xa, seg(s.a, 0.3, 1)), y1 + 10]; }
  if (s.b > 0) { handText(c, 'Apuntando', x0, y2 - 22, 38, seg(s.b, 0, 0.45), 42); strokeK(c, [[x0, y2 + 14], [xb, y2 + 14]], seg(s.b, 0.3, 1), 30, '#e9914a'); tip = [lerp(x0, xb, seg(s.b, 0.3, 1)), y2 + 10]; }
  if (s.moon > 0) { c.save(); c.globalAlpha = seg(s.moon, 0, 0.4); c.fillStyle = '#e9b949'; c.beginPath(); c.arc(520, 486, 30, 0, 7); c.fill(); c.fillStyle = '#f4f0e6'; c.beginPath(); c.arc(534, 476, 26, 0, 7); c.fill(); c.restore(); handText(c, 'z', 430, 500, 34, seg(s.moon, 0.3, 0.5), 31); handText(c, 'z', 452, 478, 42, seg(s.moon, 0.5, 0.75), 32); handText(c, 'z', 480, 452, 52, seg(s.moon, 0.75, 1), 33); if (s.moon < 1) tip = [470, 470]; }
  if (s.nine > 0.01) { const k = pop(s.nine, 0, 1); c.save(); c.globalAlpha = clamp(s.nine * 3); c.setLineDash([10, 9]); c.strokeStyle = ink; c.lineWidth = 4; c.beginPath(); c.moveTo(xb + 16, y2 - 16); c.lineTo(xb + 16, y2 + 60); c.moveTo(xa, y1 + 40); c.lineTo(xa, y2 + 60); c.stroke(); c.setLineDash([]);
    c.translate(292, y2 + 128); c.scale(k, k); c.fillStyle = '#e9914a'; rr(c, -150, -56, 300, 112, 30); c.fill(); c.fillStyle = '#fff'; c.font = '900 58px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('9 min antes', 0, 22); c.restore(); tip = [300, y2 + 110]; }
  t.needsUpdate = true; return tip; }
// punto del mundo de un píxel de la página
function notePt(nb, u, v, lift = 0.001) { return nb.localToWorld(new THREE.Vector3(-NB.pw / 2 + u / NB.cw * NB.pw, 0.0078 + lift, 0.003 - NB.ph / 2 + v / NB.ch * NB.ph)); }

// ---- los pensamientos del lunes: tres objetos pequeños que brillan y dan vueltas alrededor de la cabeza
function thoughtIcons() { const mk = (c, k = 1) => litM(c, k), out = [];
  { const g = new THREE.Group(); const f = new THREE.Mesh(new THREE.CircleGeometry(0.034, 28), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (c, w) => { c.fillStyle = '#fff8ea'; c.fillRect(0, 0, w, w); c.fillStyle = '#23212e'; c.font = '900 44px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('7:00', 64, 80); }), toneMapped: false })); f.position.z = 0.011; g.add(f);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.039, 0.02, 28), mk(0xff5a4a)); b.rotation.x = Math.PI / 2; g.add(b); for (const s of [-1, 1]) { const bl = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8, 0, 6.3, 0, 1.6), mk(0xffc85a)); bl.position.set(s * 0.026, 0.036, 0); bl.rotation.z = -s * 0.6; g.add(bl); const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.016, 6), mk(0xff5a4a)); ft.position.set(s * 0.022, -0.042, 0); ft.rotation.z = s * 0.4; g.add(ft); } out.push(g); }
  { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.076), new THREE.MeshBasicMaterial({ map: canvasTex(132, 152, (c, w, h) => { c.fillStyle = '#fff8ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#e5533d'; c.fillRect(0, 0, w, 40); c.fillStyle = '#fff'; c.font = '900 26px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('LUNES', w / 2, 30); c.fillStyle = '#23212e'; c.font = '900 78px Inter, sans-serif'; c.fillText('L', w / 2, 124); }), toneMapped: false })); g.add(p); out.push(g); }
  { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.08), new THREE.MeshBasicMaterial({ map: canvasTex(124, 160, (c, w, h) => { c.fillStyle = '#f2e6c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#8a6a4a'; c.fillRect(34, 0, 56, 16); c.strokeStyle = '#23212e'; c.lineWidth = 6; for (let i = 0; i < 3; i++) { c.strokeRect(16, 38 + i * 38, 18, 18); c.beginPath(); c.moveTo(46, 48 + i * 38); c.lineTo(104, 48 + i * 38); c.stroke(); } c.fillStyle = '#e5533d'; c.beginPath(); c.arc(98, 134, 20, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = '900 30px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('!', 98, 145); }), toneMapped: false })); g.add(p); out.push(g); }
  for (const g of out) { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xffd9a0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); h.scale.setScalar(0.2); h.position.z = -0.01; g.add(h); g.userData.halo = h; }
  return out; }
// ---- cerebro (dentro de la cabeza; solo se ve cuando la cabeza se vuelve translúcida), con la amígdala (la alarma) y sus ondas
function buildBrain() { const g = new THREE.Group(), U = g.userData, geo = new THREE.SphereGeometry(0.082, 48, 36), p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize(); let d = 0.045 * Math.sin(13 * n.x + 4 * Math.sin(9 * n.y + 2)) * Math.sin(12 * n.z + 3 * Math.sin(8 * n.x)) + 0.03 * Math.sin(17 * n.y + 5 * Math.sin(11 * n.z)); const fx = Math.abs(n.x); if (fx < 0.14) d -= 0.1 * (1 - fx / 0.14); v.multiplyScalar(1 + d); p.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals();
  U.mat = new THREE.MeshStandardMaterial({ color: 0xffb0b8, roughness: 0.6, emissive: 0xff6f86, emissiveIntensity: 0.9 }); const m = new THREE.Mesh(geo, U.mat); m.scale.set(0.84, 0.72, 1.0); g.add(m);
  U.amy = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff2a2a, toneMapped: false, depthTest: false, transparent: true })); U.amy.position.set(0.02, -0.026, 0.018); U.amy.renderOrder = 6; g.add(U.amy);
  const sp = (c, s) => { const x = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: c, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false })); x.scale.setScalar(s); x.renderOrder = 7; return x; };
  U.amyGlow = sp(0xff3030, 0.12); U.amyGlow.position.copy(U.amy.position); g.add(U.amyGlow);
  const rt = canvasTex(128, 128, (c, w) => { c.strokeStyle = '#fff'; c.lineWidth = 7; c.beginPath(); c.arc(64, 64, 54, 0, 7); c.stroke(); });
  U.rings = [0, 1, 2].map(() => { const x = new THREE.Sprite(new THREE.SpriteMaterial({ map: rt, color: 0xff4040, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false })); x.position.copy(U.amy.position); x.renderOrder = 7; g.add(x); return x; });
  return g; }
function brainAt(g, vis, alarm, t) { const U = g.userData; g.visible = vis > 0.01; if (!g.visible) return; U.mat.emissiveIntensity = 0.35 + 0.75 * vis; U.mat.emissive.setHex(0xff6f86).lerp(_c.setHex(0xff3a3a), 0.45 * alarm * (0.5 + 0.5 * Math.sin(t * 9)));
  const pu = 0.5 + 0.5 * Math.sin(t * 9); U.amy.material.opacity = alarm; U.amy.scale.setScalar(0.6 + alarm * (0.8 + 0.5 * pu)); U.amyGlow.material.opacity = alarm * (0.5 + 0.5 * pu);
  U.rings.forEach((r, i) => { const u = ((t * 1.1 + i / 3) % 1); r.scale.setScalar(0.03 + u * 0.34); r.material.opacity = alarm * (1 - u) * 0.9; }); }
// ---- el pulso rojo (de la cabeza al pecho) y el latido: gotas de luz sobre una curva, por encima de todo
function buildPulse() { const g = new THREE.Group(), U = g.userData; U.beads = []; for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xff4a3a, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false })); s.renderOrder = 8; g.add(s); U.beads.push(s); }
  U.heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xff3a3a, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false })); U.heart.renderOrder = 8; g.add(U.heart); return g; }
function pulseAt(g, pts, k, beat, t) { const U = g.userData, cv = new THREE.CatmullRomCurve3(pts); U.beads.forEach((b, i) => { const u = ((t * 0.9 + i / U.beads.length) % 1); cv.getPoint(u, b.position); b.scale.setScalar(0.035 + 0.02 * Math.sin(u * Math.PI)); b.material.opacity = k * Math.sin(u * Math.PI) * 0.95; });
  const hb = Math.pow(Math.max(0, Math.sin(t * 9.5)), 6) + 0.6 * Math.pow(Math.max(0, Math.sin(t * 9.5 - 1.1)), 6); U.heart.position.copy(pts[pts.length - 1]); U.heart.scale.setScalar(0.16 + 0.1 * hb); U.heart.material.opacity = beat * (0.35 + 0.6 * hb); }
// ---- el nudo del pecho: un aro de luz que se cierra
function buildKnot() { const m = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.0045, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff7a4a).multiplyScalar(1.8), transparent: true, opacity: 0, toneMapped: false, depthWrite: false })); m.rotation.x = Math.PI / 2; m.renderOrder = 5; return m; }
// ---------------------------------------------------------------- LA ESCENA Y SU COREOGRAFÍA (un solo plano continuo; tiempos de la voz de Javi)
// 0 puerta: el LUNES asoma tras los edificios · 2,2 «el lunes ya está saliendo» (sube como la luna) · 5,2 su cara · 6,8 el cuarto · 9,9 la mano al pecho (el nudo)
// 11,3 los ojos · 12,5 el cerebro y los pensamientos del lunes dando vueltas · 17,2 la alarma y el pulso al pecho · 19,4 la cámara sale: 8 de las 10 ventanas
// 26,1 vuelve: escribe en el cuaderno (los pensamientos caen a la página) · 29,9 quien apunta se duerme 9 min antes · 36 suelta el boli, respira, puerta (bucle).
let TL = {};
async function buildScene() {
  TL = { lunes: K['lunes_1'], face: K['por_2'], room: K['estas_3'], chest: K['encoge_3'], eyes: K['no_4'], brain: K['cerebro_4'], viv: K['viviendo_4'], alarm: K['enciende_5'], al2: K['alarma_5'], only: K['y_6'],
    casi: K['casi_6'], diez: K['diez_6'], help: K['lo_7'], write: K['escribe_7'], est: K['en_8'], dormir: K['dormir_8'], dormian: K['dormian_8'], nueve: K['nueve_8'], send: K['mandaselo_9'] };
  S.room = buildRoom(); S.city = buildCity(); S.fac = buildFacade(); scene.add(S.room, S.city, S.fac); clockDraw(S.room);
  const b = S.boy = animeBoy(); b.position.set(BOY.x, BED.top + 0.03, BOY.z); b.rotation.y = BOY.yaw; scene.add(b);
  S.brain = buildBrain(); S.brain.position.set(0, 0.022, -0.012); b.userData.headC.add(S.brain); S.pulse = buildPulse(); scene.add(S.pulse); S.knot = buildKnot(); S.knot.position.set(0, 0.2, 0); S.knot.scale.set(1, 0.72, 1); b.userData.J.chest.add(S.knot);
  S.nb = buildNotebook(); S.nb.rotation.order = 'YXZ'; scene.add(S.nb); S.pen = buildPen(); scene.add(S.pen); S.icons = thoughtIcons(); for (const i of S.icons) { scene.add(i); i.traverse(o => { if (o.material && o.material.color) o.userData.c0 = o.material.color.clone(); }); }
  S.L.fillD.set(-0.04, 0.1, -1).normalize();
}
const _v = () => new THREE.Vector3(), nbXa = nb => new THREE.Vector3(1, 0, 0).applyQuaternion(nb.quaternion), nbZa = nb => new THREE.Vector3(0, 0, 1).applyQuaternion(nb.quaternion);
// orden en que se encienden las ventanas de la fachada (la suya es la 1) y cuándo
function litTimes() { const n = S.fac.userData.rooms.filter(r => r.has).length, t0 = TL.casi - 0.05, t1 = TL.diez + 0.25; return [...Array(n)].map((_, i) => t0 + (i + 1) * (t1 - t0) / n); }
function stageAt(t, st) {
  NOW = t; const b = S.boy, U = b.userData, J = U.J, inside = cam.position.z > -2.6, vz = voice(t);
  // ---- luz: el sol entra por la ventana; el LUNES, al subir, da una luz fría de luna
  const loopIn = win(t, END - 2.3, 2.3), rise = t < 20 ? lerp(0.6, 1, sm5(seg(t, 0.2, TL.lunes + 2.0))) : (1 - sm5(seg(t, TL.write - 0.2, TL.write + 2.4))) * 1 + 0.6 * loopIn * (t > TL.write + 2.4 ? 1 : 0);
  lunesAt(S.city, rise, t); S.L.fill.color.setHex(0xcdd6ff); S.L.fill.intensity = 0.08 + 0.4 * clamp(rise);
  if (inside) lightsAt(_v().set(0, 1.2, -0.3), 6.6); else lightsAt(_v().set(2, 1.5, -2.2), Math.max(8, Math.min(26, -cam.position.z)));
  S.fac.userData.ext.visible = cam.position.z < -2.0; S.room.userData.winFrame.visible = cam.position.z > -2.15 || cam.position.z < -4;
  // ---- estados
  const worry = t < TL.help ? lerp(0.7, 1, win(t, TL.face - 0.3, 0.6)) : lerp(1, 0.12, sm5(seg(t, TL.help, TL.est + 1.5))) + 0.58 * loopIn, calm = sm5(seg(t, TL.write, TL.send + 0.6)) * (1 - loopIn);
  const kChest = bump(t, TL.chest - 0.62, TL.only + 0.1, 0.5, 0.6), squeeze = bump(t, TL.chest - 0.1, TL.eyes + 0.2, 0.3, 0.6), ghost = bump(t, TL.brain - 0.3, TL.only + 0.2, 0.55, 0.6), alarm = win(t, TL.alarm - 0.12, 0.35) * (1 - win(t, TL.only - 0.1, 0.5));
  const nbOn = t > TL.only + 2.2 && t < TL.send + 1.25, kW = nbOn ? win(t, TL.help - 0.2, 0.5) * (1 - win(t, TL.send + 0.15, 0.5)) : 0, kHold = nbOn ? 1 - win(t, TL.send + 0.95, 0.3) : 0;
  // ---- cuerpo: piernas cruzadas, espalda encorvada por la preocupación; respira (más deprisa con la alarma)
  poseCross(b); const br = Math.sin(t * (1.7 + 2.6 * alarm)) * (0.5 + 0.8 * alarm), slump = worry * (1 - 0.5 * calm) + 0.25 * bump(t, TL.face - 0.2, TL.room, 0.4, 0.5), sigh = bump(t, TL.send + 0.3, TL.send + 1.6, 0.5, 0.7);
  J.chest.rotation.x = 0.06 + 0.17 * slump + 0.012 * br - 0.05 * sigh; J.chest.position.y = 0.12 + 0.004 * br + 0.012 * sigh; J.neck.rotation.x = 0.1 * slump; U.torso.scale.set(1 - 0.05 * squeeze + 0.012 * br, 1, 0.7 + 0.012 * br - 0.03 * squeeze);
  for (const k of ['shL', 'shR']) J[k].position.y = 0.325 + 0.018 * squeeze + 0.006 * br - 0.012 * calm;
  const kCam = Math.max(0.6 * bump(t, TL.face - 0.4, TL.room + 0.2, 0.5, 0.6), 0.45 * bump(t, TL.room - 0.3, TL.chest + 0.3, 0.7, 0.7), 0.75 * bump(t, TL.eyes - 0.5, TL.only + 0.3, 0.6, 0.7));      // cuánto se gira hacia la cámara en los planos de cara
  // ---- cabeza: mira a la ventana (al LUNES); baja con «¿por qué pesa tanto?»; al cuaderno mientras escribe; al final levanta la vista
  const nbLook = nbOn ? win(t, TL.help - 0.3, 0.6) * (1 - win(t, TL.send + 0.35, 0.6)) : 0, down = bump(t, TL.face + 0.3, TL.eyes - 0.2, 0.6, 0.6) * 0.5 + 0.3 * bump(t, TL.chest - 0.3, TL.eyes - 0.3, 0.4, 0.4);
  // ---- el cuaderno: cerrado a su lado en la cama; mientras escribe, abierto en el regazo
  const nb = S.nb; nb.userData.open.visible = nbOn; nb.userData.closed.visible = !nbOn; b.updateMatrixWorld(true);
  const rest = b.localToWorld(_v().set(-0.5, 0.012, 0.02)), lap = b.localToWorld(_v().set(0.03, 0.215, 0.36)), back = win(t, TL.send + 0.95, 0.3);
  if (nbOn) { nb.position.copy(lap).lerp(rest.clone().add(_v().set(0, 0.1, 0)), back); nb.rotation.set(0.2 * (1 - back), BOY.yaw + Math.PI + lerp(0.1, 0.02, sm5(seg(t, 26.75, 27.3))), 0); } else { nb.position.copy(rest); nb.rotation.set(0, BOY.yaw + 0.35, 0); }
  nb.updateMatrixWorld(true);
  const wr = [seg(t, TL.write - 0.3, TL.write + 0.4), ...[0, 1, 2].map(i => seg(t, TL.write + 0.5 + i * 0.72, TL.write + 1.16 + i * 0.72))], sR = { a: seg(t, TL.est + 0.45, TL.est + 1.25), b: seg(t, K['apuntaban_8'] - 0.05, K['apuntaban_8'] + 1.0), moon: seg(t, TL.dormir - 0.1, TL.dormir + 0.6), nine: seg(t, TL.nueve - 0.03, TL.nueve + 0.45) };
  let tip = null; if (nbOn) { const tp = drawNote(nb, wr, sR); const away = win(t, TL.nueve + 0.3, 0.4); tip = notePt(nb, tp[0], tp[1], 0.002 + 0.02 * bump(t, TL.est - 0.2, TL.est + 0.45, 0.2, 0.2) + 0.03 * away).addScaledVector(nbXa(nb), 0.1 * away).addScaledVector(nbZa(nb), 0.07 * away); }
  // ---- manos: en las rodillas · la derecha al pecho · escribir (derecha) y sujetar el cuaderno (izquierda)
  const fw = _v().set(0, 0, 1).applyQuaternion(b.quaternion), rt = _v().set(1, 0, 0).applyQuaternion(b.quaternion), up = _v().set(0, 1, 0), nbX = _v().set(1, 0, 0).applyQuaternion(nb.quaternion), nbZ = _v().set(0, 0, 1).applyQuaternion(nb.quaternion), nbY = _v().set(0, 1, 0).applyQuaternion(nb.quaternion);
  for (const [k, s] of [['L', 1], ['R', -1]]) { const knee = b.localToWorld(_v().set(0.3 * s, 0.19, 0.3)), F = fw.clone().multiplyScalar(0.85).addScaledVector(rt, -0.3 * s).addScaledVector(up, -0.35), N = up.clone().negate().addScaledVector(fw, 0.25); let T = knee, curl = 0.28, spread = 0.3, sw = 0.5 * s;
    if (k === 'R') { const C = J.chest.localToWorld(_v().set(0.035, 0.215, 0.118)), cf = _v().set(0.62, 0.72, 0.15).applyQuaternion(J.chest.getWorldQuaternion(_qa)), cn = _v().set(0, -0.12, -1).applyQuaternion(_qa); const wc = C.clone().addScaledVector(cf.clone().normalize(), -0.052).addScaledVector(cn.clone().normalize(), -0.016);
      T = knee.clone().lerp(wc, kChest); F.lerp(cf, kChest); N.lerp(cn, kChest); curl = lerp(curl, 0.1 + 0.12 * squeeze, kChest); spread = lerp(spread, 1, kChest); sw = lerp(sw, -0.95, kChest);
      if (kW > 0.001 && tip) { const wp = tip.clone().addScaledVector(nbX, 0.06).addScaledVector(nbY, 0.045).addScaledVector(nbZ, 0.1); T.lerp(wp, kW); F.lerp(tip.clone().addScaledVector(nbY, 0.02).sub(wp).normalize(), kW); N.lerp(nbY.clone().negate().addScaledVector(nbX, -0.25), kW); curl = lerp(curl, 0.85, kW); spread = lerp(spread, 0, kW); sw = lerp(sw, -0.6, kW); } }
    else if (kHold > 0.001) { const hp = notePt(nb, 0, 830, 0.018).addScaledVector(nbX, -0.155); T = knee.clone().lerp(hp, kHold); F.lerp(nbX.clone().addScaledVector(nbZ, -0.22), kHold); N.lerp(nbY.clone().negate(), kHold); curl = lerp(curl, 0.32, kHold); spread = lerp(spread, 0, kHold); }
    armTo(b, k, T, sw); handAim(b, k, F, N); handCurl(U['hand' + k], curl, spread); }
  // el boli: en la mano mientras escribe; si no, sobre el cuaderno cerrado
  { const p = S.pen; if (nbOn && tip && kW > 0.5) { p.position.copy(tip); const hw = wpos(J.hR); p.quaternion.setFromUnitVectors(_v().set(0, 1, 0), hw.clone().addScaledVector(nbY, 0.07).addScaledVector(nbZ, 0.03).sub(tip).normalize()); } else { p.position.copy(nbOn ? nb.position : rest).add(_v().set(0, 0.022, 0)).addScaledVector(nbX, 0.02); p.quaternion.setFromUnitVectors(_v().set(0, 1, 0), nbZ.clone().addScaledVector(nbX, 0.3).normalize()); p.position.addScaledVector(nbZ, -0.07); } }
  // la cabeza (después de las manos, para que mire lo que toca)
  { const far = _v().set(-6 + 3 * Math.sin(t * 0.4), 8 + 20 * rise, -300), hw = headW(b), dF = far.sub(hw).normalize(), dC = cam.position.clone().sub(hw).normalize(), tgt = hw.clone().addScaledVector(dF.lerp(dC, kCam).normalize(), 5); lookAtPt(b, tgt, 1 - nbLook); if (nbLook > 0.001) lookAtPt(b, nb.position.clone().addScaledVector(nbY, 0.02), nbLook); J.head.rotation.x += 0.3 * down * (1 - nbLook) + 0.05 * slump; J.head.rotation.z = 0.06 * slump - 0.05 * sigh; }
  // ---- cara: ojos (parpadeo, mirada, preocupación, el LUNES reflejado) y boca
  const blinks = [1.1, 4.7, 6.55, 8.9, 10.95, 13.4, 16.2, 18.9, 26.9, 29.7, 32.5, 35.75, 37.4], bl = Math.max(...blinks.map(x => bump(t, x, x + 0.07, 0.05, 0.09))), sighC = bump(t, TL.send + 0.5, TL.send + 1.2, 0.2, 0.3);
  const open = (1 - 0.95 * Math.max(bl, sighC)) * (1 - 0.18 * nbLook - 0.1 * down + 0.12 * alarm), gx = 0.1 * Math.sin(t * 0.9) - 0.42 * kCam + 0.3 * bump(t, TL.eyes + 0.25, TL.eyes + 0.75, 0.08, 0.1), gy = 0.25 * nbLook + 0.2 * down - 0.1 * alarm, refl = bump(t, TL.eyes - 0.5, TL.brain + 0.2, 0.4, 0.3);
  drawEye(U.eyeL, { open, gx, gy, worry, refl }); drawEye(U.eyeR, { open, gx, gy, worry, refl, mirror: true }); drawMouth(U.mouthT, lerp(-0.7, 0.55, calm) - 0.25 * alarm);
  // ---- el nudo del pecho, la cabeza translúcida con el cerebro, la alarma y el pulso
  { const k = S.knot; k.visible = squeeze > 0.01; const s = lerp(1.9, 1.0, sm5(seg(t, TL.chest - 0.15, TL.chest + 0.45))) * (1 + 0.025 * Math.sin(t * 14)); k.scale.set(s, s * 0.72, 1); k.material.opacity = squeeze * 0.95; }
  boyGhost(b, ghost); brainAt(S.brain, ghost, alarm, t);
  { const a = S.brain.userData.amy.getWorldPosition(_v()), n = J.neck.getWorldPosition(_v()), hC = J.chest.localToWorld(_v().set(0.05, 0.2, 0.06)); pulseAt(S.pulse, [a, a.clone().lerp(n, 0.6).add(_v().set(0, 0, 0)), n, n.clone().lerp(hC, 0.55), hC], alarm * win(t, TL.al2 - 0.15, 0.3), alarm, t); S.pulse.visible = alarm > 0.01; }
  // ---- los pensamientos del lunes: giran alrededor de la cabeza; con la alarma, rojos y deprisa; luego caen al cuaderno y se vuelven renglones
  { const hw = headW(b), n = S.icons.length; S.icons.forEach((ic, i) => { const a0 = pop(t, TL.viv - 0.05 + i * 0.27, 0.35) * (1 - win(t, TL.only - 0.15 + i * 0.08, 0.3)); let sc = a0, vis = a0 > 0.01;
      if (vis) { const ang = i / n * Math.PI * 2 + t * (1.5 + 2.2 * alarm) + 0.6 * Math.sin(t * 0.7); ic.position.set(hw.x + Math.cos(ang) * 0.225, hw.y + 0.03 + 0.035 * Math.sin(t * 2.1 + i * 2), hw.z + Math.sin(ang) * 0.225); if (i === 0 && alarm > 0.3) ic.position.x += 0.006 * Math.sin(t * 70); }
      else if (nbOn && t < TL.est) { const tw = TL.write + 0.5 + i * 0.72, a1 = pop(t, TL.help + 0.35 + i * 0.12, 0.3), fall = sm5(seg(t, tw - 0.1, tw + 0.3)); sc = a1 * (1 - fall); vis = sc > 0.01; const hov = notePt(nb, 560, NOTE_Y[i] - 16, 0.035 + 0.006 * Math.sin(t * 3 + i)), land = notePt(nb, 320, NOTE_Y[i] - 16, 0.004); sc *= 0.4; ic.position.copy(hov).lerp(land, fall); }
      ic.visible = vis; if (!vis) return; ic.scale.setScalar(sc * (0.9 + 0.12 * alarm)); ic.quaternion.copy(cam.quaternion); ic.traverse(o => { if (o.userData.c0) o.material.color.copy(o.userData.c0).lerp(_c.setRGB(1.6, 0.3, 0.25), 0.55 * alarm * (0.6 + 0.4 * Math.sin(t * 9))); }); ic.userData.halo.material.color.setHex(0xffd9a0).lerp(_c.setHex(0xff3030), alarm); }); }
  // ---- la fachada: se encienden las habitaciones de quienes están igual que él
  if (!inside) { const LT = litTimes(); let n = 0; S.fac.userData.rooms.forEach(r => { roomLit(r, r.has ? win(t, LT[n++], 0.3) : 0); }); }
}
// velo rojo muy suave con la alarma
function fillAt(t) { const a = win(t, TL.alarm - 0.12, 0.35) * (1 - win(t, TL.only - 0.1, 0.5)); return { k: 0.07 * a * (0.5 + 0.5 * Math.sin(t * 9)), c: [1, 0.12, 0.1] }; }
// ---------------------------------------------------------------- LA CÁMARA: un solo plano continuo, sin cortes. Claves [t, posición, mira, focal°, giro].
// Sigue la lámina de Javi: puerta → hombro y ventana → cara → cuerpo sentado → mano en el pecho → ojos → (sale por la ventana) cabeza y pecho → fachada → cuaderno → puerta.
let CK = [];
function buildCam() {
  stageAt(8, { p: v3(0, 1.5, 2), l: v3(0, 1.3, -1.3) }); const b = S.boy; b.updateMatrixWorld(true);
  const H = headW(b), f = v3(0, 0, 1).applyQuaternion(b.quaternion), px = v3(-f.z, 0, f.x), C = b.userData.J.chest.localToWorld(v3(0, 0.2, 0.1)), E = H.clone().addScaledVector(f, 0.1).add(v3(0, 0.0, 0)); S.headRef = H.clone();
  const at = (o, a, s, u) => o.clone().addScaledVector(f, a).addScaledVector(px, s).add(v3(0, u, 0)), A = p => [p.x, p.y, p.z], D0 = [0.42, 1.5, 2.62], L0 = [0.1, 1.42, -2.2];
  const nbP = b.localToWorld(v3(0.03, 0.215, 0.36)), k = (t, p, l, fv, r = 0) => [t, Array.isArray(p) ? p : A(p), Array.isArray(l) ? l : A(l), fv, r];
  const eP = at(H, 0.5, 0.1, 0.012), eL = H.clone().add(eP.clone().sub(H).normalize().multiplyScalar(0.1)).add(v3(0, 0.012, 0));          // los ojos: con la cabeza ya girada hacia la cámara
  const facC = [(FAC.cols[0] + FAC.cols[1]) / 2, (WIN.y0 + WIN.y1) / 2];
  CK = [
    k(0, D0, L0, 54), k(1.7, [0.52, 1.55, 0.25], [0.36, 1.68, -2.2], 46), k(TL.lunes + 1.9, [0.5, 1.52, -0.42], [0.38, 1.7, -2.2], 42),                                  // puerta → por encima del hombro: el LUNES sale
    k(TL.face + 0.25, at(H, 0.3, 0.8, 0.02), at(H, 0, 0, -0.01), 34), k(TL.face + 1.0, at(H, 0.74, 0.3, 0.0), at(H, 0, 0, -0.015), 30), k(TL.room - 0.1, at(H, 0.76, 0.25, -0.01), at(H, 0, 0, -0.02), 30),     // «¿Por qué pesa tanto?»: su cara
    k(TL.room + 1.0, [1.27, 1.3, -1.9], at(C, 0, 0, 0.2), 51), k(TL.chest - 0.75, [1.2, 1.28, -1.93], at(C, 0, 0, 0.2), 51),                                       // «Estás en tu cuarto, sin nada que hacer…»
    k(TL.chest + 0.15, at(C, 0.74, 0.3, 0.1), at(C, 0.02, 0, 0.05), 36), k(TL.eyes - 0.35, at(C, 0.68, 0.26, 0.1), at(C, 0.02, 0, 0.06), 36),                           // «…y se te encoge el pecho»
    k(TL.eyes + 0.2, eP, eL, 27), k(TL.brain - 0.15, A(eP.clone().lerp(eL, 0.08)), eL, 27),                                     // «No es pereza»: los ojos
    k(TL.viv - 0.1, [0.5, H.y + 0.2, -3.02], at(H, 0, 0, -0.12), 36), k(TL.alarm, [0.67, H.y + 0.17, -2.72], at(H, 0, 0, -0.13), 35), k(TL.only - 0.05, [0.6, H.y + 0.15, -2.8], at(H, 0, 0, -0.14), 35),      // el cerebro, los pensamientos, la alarma (la cámara ya está saliendo por la ventana)
    k(TL.only + 0.8, [0.9, 1.5, -7.0], [0.5, 1.5, -2.2], 35), k(TL.only + 2.0, [facC[0] - 1.5, facC[1] - 1.0, -25.6], [facC[0], facC[1], -2.2], 34), k(TL.help - 0.55, [facC[0] + 1.3, facC[1] + 0.8, -24.2], [facC[0], facC[1], -2.2], 34),   // sale: la fachada entera
    k(TL.help + 0.1, [0.6, 1.62, -3.2], at(H, 0, 0, -0.2), 36), k(TL.help + 0.6, at(nbP, 0.3, 0, 0.78), at(nbP, 0.07, 0, 0), 38),                                                           // vuelve a entrar por la ventana y sube sobre el cuaderno
    k(TL.write - 0.15, at(nbP, 0.02, 0, 0.62), at(nbP, 0.05, 0, 0), 38), k(TL.est - 0.25, at(nbP, 0.02, 0, 0.6), at(nbP, 0.05, 0, 0), 38),                                                 // cenital: escribe la lista
    k(TL.est + 0.6, at(nbP, -0.03, 0, 0.56), at(nbP, 0.0, 0, 0), 36), k(TL.send - 0.15, at(nbP, -0.03, 0, 0.53), at(nbP, 0.0, 0, 0), 36),                                                     // baja a la mitad de abajo: las barras y «9 min antes»
    k(TL.send + 0.75, [0.42, 1.8, -1.0], [0.34, 1.5, -2.2], 40), k(TL.send + 1.7, [0.5, 1.58, 0.4], [0.3, 1.5, -2.2], 46), k(END, D0, L0, 54),                                             // suelta el boli, respira… y vuelta a la puerta
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0] + ' → ' + CK[i][0]);
}
function camAt(t) { t = clamp(t, 0, END); const T = CK.map(k => k[0]), c = (j, i) => mono(t, T, CK.map(k => k[j][i])); const st = { p: v3(c(1, 0), c(1, 1), c(1, 2)), l: v3(c(2, 0), c(2, 1), c(2, 2)), f: mono(t, T, CK.map(k => k[3])), roll: mono(t, T, CK.map(k => k[4])) };
  const a = 0.004 * clamp(Math.hypot(st.l.x - st.p.x, st.l.z - st.p.z) / 0.4); st.p.x += a * Math.sin(t * 1.3); st.p.y += a * Math.sin(t * 1.7 + 1) * 0.8; return st; }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l); return { focus: f, scale: (f < 1.2 ? 0.5 : f < 4 ? 0.36 : 0.25) * f }; }
// ---------------------------------------------------------------- RÓTULOS (lienzo 2D): el número de cada ventana que se enciende («8 de cada 10») y la fuente de cada dato.
function buildHudPlan() {}
function sText(txt, x, y, px, weight, a, o = {}) { if (a <= 0.01) return; hg.save(); hg.globalAlpha = clamp(a); hg.font = `${weight} ${px}px Inter, sans-serif`; hg.textAlign = o.align || 'center'; hg.textBaseline = 'alphabetic'; hg.shadowColor = 'rgba(0,0,0,.75)'; hg.shadowBlur = px * 0.35 * PR; hg.shadowOffsetY = px * 0.05 * PR; hg.fillStyle = o.col || '#ffffff'; hg.fillText(txt, x, y); hg.restore(); }
function hudAt(t) {
  hudBegin();
  if (cam.position.z < -9) { const LT = litTimes(), U = S.fac.userData, out = 1 - win(t, TL.help - 0.5, 0.3); let n = 0;
    const badge = (cx, cy, num, t0) => { const k = pop(t, t0, 0.3) * out; if (k <= 0.01) return; const p = proj(v3(cx - WIN.w / 2 + 0.2, cy + 0.42, ROOM.z0 - 0.3)); hg.save(); hg.translate(p.x, p.y); hg.scale(k, k); hg.shadowColor = 'rgba(0,0,0,.5)'; hg.shadowBlur = 14 * PR; hg.fillStyle = '#ff9a3d'; hg.beginPath(); hg.arc(0, 0, 30, 0, 7); hg.fill(); hg.shadowBlur = 0; hg.fillStyle = '#1a1420'; hg.font = '900 38px Inter, sans-serif'; hg.textAlign = 'center'; hg.fillText(String(num), 0, 14); hg.restore(); };
    badge(U.mine.cx, U.mine.cy, 1, TL.casi - 0.1); U.rooms.forEach(r => { if (r.has) { badge(r.s.cx, r.s.cy, n + 2, LT[n]); n++; } });
    sText('Encuesta de LinkedIn · EE. UU., 2021 · jóvenes: 78 %', W / 2, 1838, 30, 700, win(t, TL.casi - 0.6, 0.4) * out, { col: '#f4ead8' }); }
  sText('Universidad de Baylor, 2018 · 57 estudiantes', W / 2, 1838, 30, 700, win(t, TL.est + 0.2, 0.4) * (1 - win(t, TL.send - 0.3, 0.3)), { col: '#f4ead8' });
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
  await loadEnv(); buildLights(); cam.near = 0.03; cam.far = 40000; cam.updateProjectionMatrix();
  await buildScene();
  await waitLoads();
  post.uniforms.ca.value = 0.18; post.uniforms.vig.value = 0.42; post.uniforms.bloom.value = 0.36;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s); window.glLost = () => renderer.getContext().isContextLost();
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
