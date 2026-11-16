// «Así funciona: el viaje del mensaje de tu madre» (16-11-2026): un solo plano continuo por una maqueta en corte del Atlántico (de España a Brasil)
// sobre un mapa del mundo: el mensaje «Hijo, ¿dónde estás?» viaja por la antena, la fibra y el cable del fondo del mar hasta tu móvil en Brasil.
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
      vec2 d = c*vec2(0.5625,1.0); a *= 1.0 - vig*smoothstep(0.25,0.92,length(d)*1.6);
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
// ---------------------------------------------------------------- EL MUNDO (contrato común de todas las piezas; ver projects/whatsapp_mar/MUNDO.md)
// Todo el vídeo es UNA maqueta de museo: una franja de océano Atlántico en corte (como un acuario largo) apoyada sobre un mapa del mundo,
// de Brasil (Fortaleza) a la península (Sines, Portugal). En los dos extremos hay «viñetas» a escala humana: la playa de Brasil (el hijo) y el
// pueblo de España con la cocina de la madre y la antena; la costa de Portugal con la estación del cable. Tonga es otra maqueta pequeña en el
// Pacífico. La fibra por dentro es un decorado aparte (micro).
// Unidades: en las viñetas, 1 unidad = 1 m. El mapa: 10 unidades por grado (equirrectangular, centrado en LON0). El suelo del mapa es y = 0.
const LON0 = -20, MAPK = 10;
// la función de una pieza si existe (las piezas que aún no han llegado se sustituyen)
function fnOf(n) { try { return eval('typeof ' + n + " === 'function' ? " + n + ' : null'); } catch (e) { return null; } }
function wrapLon(lon) { let l = lon; while (l < LON0 - 180) l += 360; while (l >= LON0 + 180) l -= 360; return l; }
function mapP(lon, lat, y = 0) { return new THREE.Vector3((wrapLon(lon) - LON0) * MAPK, y, -lat * MAPK); }
// ---------- la franja del Atlántico (la maqueta): marco local X (de Brasil a la península), Y arriba, Z hacia la cara de cristal delantera
const SEA = 40;                 // altura del mar (sobre el mapa)
const SW = 40;                  // ancho de la franja (z ∈ [−20, 20])
const XB = 40, XE = 60;         // tierra de Brasil (x ∈ [−XB, 0]) y de la península (x ∈ [L, L+XE])
const GEO = { BR: [-38.54, -3.72], IB: [-8.87, 37.95], TONGA: [-175.2, -21.14], FIJI: [178.44, -18.14], NKC: [-15.97, 18.08] };
const BRm = mapP(...GEO.BR), IBm = mapP(...GEO.IB);
const SL = BRm.distanceTo(IBm);                       // largo del océano en la maqueta (≈ 511 unidades)
const SX = IBm.clone().sub(BRm).normalize(), SY = new THREE.Vector3(0, 1, 0), SZ = new THREE.Vector3().crossVectors(SX, SY);
const SLAB_M = new THREE.Matrix4().makeBasis(SX, SY, SZ).setPosition(BRm);       // local → mundo (la y local es la altura sobre el mapa)
function slabP(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(SLAB_M); }
function slabDir(x, y, z) { return new THREE.Vector3(x, y, z).transformDirection(SLAB_M); }
function inSlab(o) { o.matrixAutoUpdate = true; o.position.copy(BRm); o.quaternion.setFromRotationMatrix(SLAB_M); return o; }   // pone un grupo en el marco de la franja
// viñetas: la playa (origen en la orilla de Brasil, al nivel del mar) y la península (origen en la orilla de Portugal). Mismos ejes que la franja.
const BEACH0 = () => slabP(0, SEA, 0), IBERIA0 = () => slabP(SL, SEA, 0);
function atBeach(g) { inSlab(g); g.position.copy(BEACH0()); return g; }
function atIberia(g) { inSlab(g); g.position.copy(IBERIA0()); return g; }
// ---------- el fondo del mar: profundidad (bajo el nivel del mar, en unidades) a lo largo de la franja, x ∈ [0, SL]
// Brasil: la playa baja suave (x 0→3), plataforma (→25, 8 de hondo), talud (→48), llanura abisal (~33), dorsal en medio (sube a ~17 con su valle), llanura,
// talud de Portugal (estrecho), plataforma (6) y la playa (x = SL).
const _sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
function seaDepth(x) {
  const xr = SL - x;                                                     // distancia a la orilla de Portugal
  let d = 33 + 1.2 * Math.sin(x * 0.07) + 0.8 * Math.sin(x * 0.19 + 1.3);  // llanura abisal (ondulada)
  const mid = SL * 0.56, r = Math.abs(x - mid);                            // la dorsal centroatlántica, con su valle en medio
  d -= 16 * Math.exp(-Math.pow(r / 34, 2)) - 4 * Math.exp(-Math.pow(r / 4, 2)) + 3 * Math.exp(-Math.pow((x - mid + 60) / 10, 2)) + 3 * Math.exp(-Math.pow((x - mid - 70) / 9, 2));
  d -= 9 * Math.exp(-Math.pow((x - SL * 0.3) / 6, 2));                    // un monte submarino
  const br = x < 3 ? 2 * _sm(0, 3, x) : x < 25 ? 2 + 6 * _sm(3, 25, x) : 8 + (d - 8) * _sm(25, 48, x);   // lado de Brasil
  const pt = xr < 3 ? 2 * _sm(0, 3, xr) : xr < 14 ? 2 + 4 * _sm(3, 14, xr) : 6 + (d - 6) * _sm(14, 34, xr); // lado de Portugal
  if (x < 48) return br; if (xr < 34) return pt; return d;
}
function seabedY(x, z = 0) { return SEA - seaDepth(x) + 0.25 * Math.sin(x * 0.9 + z * 0.7) * Math.sin(z * 0.5 - x * 0.3) * clamp(seaDepth(x) / 4); }
// los cables en la franja: el nuestro (el del mensaje) y otro al lado (el que rompe el ancla)
const CABLE_Z = 6, CABLE2_Z = -5;
// ---------- colores de la casa
const COL = { msg: 0x3ccf6e, msgHex: '#3CCF6E', light: 0x9ff3ff, cyan: '#5CF2E6', red: 0xff3b30, gold: 0xffc46b, water: 0x0b5873, deep: 0x041a2b, sand: 0xe7c98f };
// ---------- la burbuja del mensaje en 3D (verde, genérica; sin logos): «Hijo, ¿dónde estás?». Mide ≈ 1 × 0,42 unidades (escala con .scale)
function msgBubble(txt = 'Hijo, ¿dónde estás?') {
  const g = new THREE.Group(), w = 1, h = 0.42, sh = rrShape(w, h, 0.16);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(w, h, 0.16), { depth: 0.06, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3, curveSegments: 10 }),
    new THREE.MeshPhysicalMaterial({ color: COL.msg, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, emissive: COL.msg, emissiveIntensity: 0.35 }));
  body.geometry.translate(0, 0, -0.03); body.castShadow = true; g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 12), body.material); tail.position.set(-w / 2 + 0.1, -h / 2 - 0.03, 0); tail.rotation.z = 0.7; g.add(tail);
  const tex = canvasTex(1024, 430, (c, W2, H2) => { c.fillStyle = '#0b2a14'; c.font = '700 92px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, W2 / 2, H2 / 2 + 4); });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, h * 0.94), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  face.position.z = 0.062; g.add(face); const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -0.062; g.add(back);
  g.userData = { body, face }; return g;
}
// ---------- los cortes de la maqueta (las caras de tierra y roca, como un pastel de capas). Todas las piezas usan esto para que se vea igual.
// strataFace(xs, top, z, o): cara vertical en z (marco local), con x en las muestras xs, desde y = o.bot hasta top(x). Las y se miden respecto al
// NIVEL DEL MAR (o.yOff = lo que hay que sumar para pasar a la y del grupo: 0 en las viñetas, SEA en la franja). o.band: franja de arriba (tierra
// oscura o arena) de ese grosor; o.bandCol su color. La normal mira hacia +z si z > 0 (y hacia −z si z < 0); o.normalX = ±1 para caras en x.
let _strT = null;
function strataTex() {
  if (_strT) return _strT;
  _strT = canvasTex(1024, 1024, (g, w, h) => {
    const L = [[5, '#b08a58'], [0, '#c8b289'], [-6, '#a89272'], [-14, '#b48a5e'], [-24, '#7a6553'], [-34, '#4a403b'], [-46, '#2f2a28']];   // techo de cada capa (y sobre el mar) y color
    const Y = y => (5 - y) / 50 * h;
    for (let i = 0; i < L.length - 1; i++) { const [y0, c] = L[i], y1 = L[i + 1][0]; g.fillStyle = c; g.beginPath(); g.moveTo(0, Y(y0) + (i ? 6 * Math.sin(i * 1.7) : 0));
      for (let x = 0; x <= w; x += 8) g.lineTo(x, Y(y0) + (i ? 7 * Math.sin(x / w * Math.PI * 2 * (2 + i) + i) + 4 * Math.sin(x / w * Math.PI * 2 * 7 + i * 3) : 0));
      g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill(); }
    for (let i = 0; i < 9000; i++) { const x = hash(i * 1.37) * w, y = hash(i * 2.11) * h, r = 0.6 + hash(i * 3.3) * 2.2, a = 0.05 + hash(i * 4.9) * 0.12;
      g.fillStyle = hash(i * 5.7) > 0.5 ? `rgba(255,240,210,${a})` : `rgba(30,20,10,${a})`; g.fillRect(x, y, r, r); }
    for (let i = 0; i < 70; i++) { const y = hash(i * 9.1) * h, a = 0.06 + hash(i * 7.3) * 0.08; g.strokeStyle = `rgba(40,28,18,${a})`; g.lineWidth = 1 + hash(i) * 2; g.beginPath();
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + 5 * Math.sin(x / w * Math.PI * 2 * 3 + i)); g.stroke(); }
  });
  _strT.wrapS = THREE.RepeatWrapping; return _strT;
}
let _strM = null;
const strataMat = () => _strM || (_strM = new THREE.MeshStandardMaterial({ map: strataTex(), roughness: 0.95, metalness: 0, side: THREE.DoubleSide }));
function strataFace(xs, top, z, o = {}) {
  const bot = o.bot ?? -SEA, yOff = o.yOff ?? 0, nx = o.normalX || 0, band = o.band ?? 0, g = new THREE.Group();
  const quad = (yb, yt, mat, uvs) => { const P = [], U = [], I = [];
    xs.forEach((x, i) => { const a = yb(x), b = yt(x); if (nx) { P.push(z, a + yOff, x, z, b + yOff, x); } else P.push(x, a + yOff, z, x, b + yOff, z); U.push(x / 40, uvs ? (a + 45) / 50 : 0, x / 40, uvs ? (b + 45) / 50 : 1); if (i) { const k = i * 2; I.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; g.add(m); return m; };
  quad(() => bot, x => top(x) - band, strataMat(), true);
  if (band > 0) quad(x => top(x) - band, top, new THREE.MeshStandardMaterial({ color: o.bandCol ?? 0x5b4630, roughness: 0.95, side: THREE.DoubleSide }), false);
  return g;
}
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
// ---------------------------------------------------------------- el cielo, la luz y el «ambiente» de cada sitio (MOODS). Cada sitio del plano continuo tiene su luz:
//  museo  la maqueta sobre el mapa del mundo (sala oscura, foco cálido desde arriba)      brasil  la playa al atardecer (sol bajo naranja)
//  iberia el pueblo de noche (luna fría, ventanas cálidas)                                agua    bajo el mar (niebla azul, luz desde arriba)
//  fibra  dentro del hilo de cristal (negro, todo brilla por sí mismo)                    tonga   Tonga al anochecer (azul oscuro, el volcán naranja)
// moodSet(nombre) pone uno; moodMix({brasil: 0.3, museo: 0.7}) mezcla. Un cielo de degradado (cúpula que sigue a la cámara) + reflejos (PMREM de ese cielo).
const _o = new THREE.Object3D();      // objeto de trabajo para las matrices de las instancias
const ASSET = '/projects/whatsapp_mar/web/assets/';
const ENV = { rot: 0, env: 1 };
const TEXL = new THREE.TextureLoader(), PENDING = [];
function tx(path, srgb = true, rep = null) { let ok; PENDING.push(new Promise(a => { ok = a; })); const t = TEXL.load(ASSET + path, () => ok(), undefined, () => { console.error('ERROR textura ' + path); ok(); });
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
function waitLoads() { return Promise.all(PENDING); }
const C3 = h => new THREE.Color(h);
// sky: cénit, horizonte, suelo (bajo el horizonte), sol (dirección, color, tamaño); fog: color y densidad (FogExp2, por unidad); key: sol/foco; fill; hemi: cielo, suelo, intensidad
const MOODS = {
  museo:  { zen: 0x04060c, hor: 0x121a2b, gnd: 0x06080d, sunD: [-0.3, 0.9, 0.3], sunC: 0xffe0b0, sunS: 0.0, stars: 0.25, fogC: 0x0b111c, fogD: 0.00045,
            key: [0xffe2bc, 2.4], keyD: [-0.35, 0.85, 0.4], fill: [0x7f9fff, 0.35], hemi: [0x31456e, 0x18130f, 0.45], env: 0.35, exp: 1.0 },
  brasil: { zen: 0x27305e, hor: 0xffa66b, gnd: 0x3a2a2a, sunD: [-0.92, 0.12, 0.38], sunC: 0xffc27a, sunS: 1.0, stars: 0.0, fogC: 0xe69a7c, fogD: 0.0035,
            key: [0xffb27a, 3.2], keyD: [-0.92, 0.22, 0.32], fill: [0x8a7cff, 0.45], hemi: [0xffb59a, 0x3b2b22, 0.55], env: 0.9, exp: 1.0 },
  iberia: { zen: 0x03050c, hor: 0x1a2340, gnd: 0x05070c, sunD: [0.3, 0.75, -0.55], sunC: 0xc8d6ff, sunS: 0.25, stars: 1.0, fogC: 0x0e1528, fogD: 0.004,
            key: [0x9db4ff, 0.75], keyD: [0.35, 0.8, -0.5], fill: [0xffc48a, 0.18], hemi: [0x2a3a66, 0x120e0b, 0.35], env: 0.3, exp: 1.0 },
  agua:   { zen: 0x0b5f86, hor: 0x0a4d73, gnd: 0x031a2e, sunD: [0, 1, 0], sunC: 0xbff5ff, sunS: 0.0, stars: 0.0, fogC: 0x0b4f78, fogD: 0.032,
            key: [0xbfeeff, 2.0], keyD: [0.1, 1, 0.15], fill: [0x2a8fb8, 0.45], hemi: [0x5fb8e8, 0x06202e, 0.55], env: 0.35, exp: 1.0 },
  abismo: { zen: 0x06223a, hor: 0x031628, gnd: 0x010a14, sunD: [0, 1, 0], sunC: 0x000000, sunS: 0.0, stars: 0.0, fogC: 0x03182c, fogD: 0.028,
            key: [0x7fc8ff, 0.9], keyD: [0.1, 1, 0.15], fill: [0x1d5a8c, 0.35], hemi: [0x2a6c9a, 0x020a12, 0.45], env: 0.25, exp: 1.0 },
  fibra:  { zen: 0x000000, hor: 0x02060a, gnd: 0x000000, sunD: [0, 1, 0], sunC: 0x000000, sunS: 0.0, stars: 0.0, fogC: 0x000000, fogD: 0.0,
            key: [0x9fe8ff, 0.4], keyD: [0.2, 1, 0.3], fill: [0x406080, 0.2], hemi: [0x10202a, 0x000000, 0.2], env: 0.15, exp: 1.0 },
  tonga:  { zen: 0x070b1d, hor: 0x3a2a4a, gnd: 0x07070c, sunD: [-0.8, 0.05, -0.6], sunC: 0xff8a5c, sunS: 0.6, stars: 0.6, fogC: 0x1a1830, fogD: 0.0035,
            key: [0xb6c4ff, 0.9], keyD: [-0.5, 0.7, -0.5], fill: [0xff8a4a, 0.3], hemi: [0x3a3f70, 0x140f10, 0.4], env: 0.35, exp: 1.0 },
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
    if (k !== 'fibra') { const room = new RoomEnvironment(); room.scale.setScalar(0.6); room.traverse(o => { if (o.material) { o.material = o.material.clone(); if (o.material.color) o.material.color.multiplyScalar(0.12); if (o.material.emissive) o.material.emissiveIntensity *= 0.12; } }); sc.add(room); }
    ENVS[k] = PMREM.fromScene(sc, 0.03).texture; }
  S.sky = new THREE.Mesh(new THREE.SphereGeometry(15000, 64, 32), skyMat()); S.sky.renderOrder = -10; S.sky.frustumCulled = false; scene.add(S.sky);
  scene.background = null; S.fog = new THREE.FogExp2(0x000000, 0); scene.fog = S.fog;
}
// la luz: un «sol» que da sombras (sigue a lo que mira la cámara), un relleno y una luz de cielo/suelo
function buildLights() {
  const key = new THREE.DirectionalLight(0xffffff, 2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 4; key.shadow.bias = -0.0003;
  scene.add(key, key.target); const fill = new THREE.DirectionalLight(0xffffff, 0.4); scene.add(fill, fill.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.4); scene.add(hemi); S.L = { key, fill, hemi, keyD: new THREE.Vector3(0, 1, 0), fillD: new THREE.Vector3(0.3, 0.4, 1) };
  moodSet('museo');
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
// ---------------------------------------------------------------- estilo ilustración médica (Javi, 14-11, con imágenes de referencia): una mano de piel de verdad
// sobre un fondo claro y suave; el dedo índice se abre con un corte (la piel de arriba desaparece) y deja ver por dentro los huesos (marfil), el cartílago
// (azulado), la cápsula de la articulación con su líquido, el tendón, las venas y la burbuja.
// La mano es UNA sola superficie suave: un campo de distancias (falanges, metacarpos, almohadillas de la palma, pulgar y antebrazo unidos con un mínimo
// suave) convertido en malla con «marching cubes», con su esqueleto y los pesos calculados (cada dedo se dobla por sus tres articulaciones).
function noiseSkin(g, w, h, n, a = 1) {
  for (let i = 0; i < n; i++) { const x = hash(i * 1.3) * w, y = hash(i * 2.7) * h, r = 1 + hash(i * 4.1) * 5; g.fillStyle = hash(i * 7.7) > 0.5 ? `rgba(150,78,58,${0.035 * a})` : `rgba(255,222,200,${0.07 * a})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  for (let i = 0; i < n / 2; i++) { g.fillStyle = `rgba(110,50,38,${0.045 * a})`; g.fillRect(hash(i * 9.1) * w, hash(i * 3.9) * h, 1.1, 1.1); }      // poros
}
let SKM = null;
function skinBase() {
  if (SKM) return SKM;
  const map = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); noiseSkin(g, w, h, 3200, 1.3); }); map.wrapS = map.wrapT = THREE.RepeatWrapping;
  SKM = { outer: new THREE.MeshPhysicalMaterial({ map, vertexColors: true, roughness: 0.5, sheen: 0.55, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffa98a), clearcoat: 0.12, clearcoatRoughness: 0.5,
      emissive: 0x4a1408, emissiveIntensity: 0.22 }),
    inner: new THREE.MeshStandardMaterial({ color: 0xc4524b, roughness: 0.62, emissive: 0x3a0b08, emissiveIntensity: 0.35, side: THREE.BackSide }) };
  return SKM;
}
// burbuja de gas dentro del líquido: transparente, con el borde plateado (fresnel) y un brillo (lleva los trozos de profundidad logarítmica)
function bubbleMat(op = 1) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { col: { value: new THREE.Color(0.86, 0.94, 1.0).multiplyScalar(1.25) }, op: { value: op } },
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vN; varying vec3 vV; void main(){ vec4 p = vec4(position,1.); vec3 nn = normal;\n#ifdef USE_INSTANCING\np = instanceMatrix * p; nn = mat3(instanceMatrix) * nn;\n#endif\nvec4 mv = modelViewMatrix * p; vN = normalize(normalMatrix * nn); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv;\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: '#include <logdepthbuf_pars_fragment>\nuniform vec3 col; uniform float op; varying vec3 vN; varying vec3 vV; void main(){\n#include <logdepthbuf_fragment>\nvec3 N = normalize(vN); float r = 1. - abs(dot(N, normalize(vV))); float rim = smoothstep(0.45, 0.92, r); vec3 c = mix(vec3(1.0, 1.04, 1.08), vec3(0.1, 0.36, 0.78), rim); float a = mix(0.42, 0.97, rim); float hl = pow(max(dot(N, normalize(vec3(-0.45, 0.6, 0.66))), 0.), 30.); c = mix(c, vec3(1.6), hl); gl_FragColor = vec4(c, clamp(a + hl, 0., 1.) * op); }' });
}
let MUSCLE_T = null;
function muscleTex() {
  if (MUSCLE_T) return MUSCLE_T;
  MUSCLE_T = canvasTex(512, 1024, (g, w, h) => { g.fillStyle = '#b4423a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 150; i++) { const light = hash(i * 3.1) > 0.45; g.strokeStyle = light ? `rgba(242,146,128,${0.16 + hash(i * 5.3) * 0.26})` : `rgba(104,18,16,${0.14 + hash(i * 2.2) * 0.24})`; g.lineWidth = 2 + hash(i * 7.9) * 5;
      g.beginPath(); let x = hash(i * 1.7) * w; g.moveTo(x, -10); for (let y = 0; y <= h + 40; y += 40) { x += (hash(i * 13 + y) - 0.5) * 7; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 16; i++) { g.strokeStyle = 'rgba(255,232,222,.24)'; g.lineWidth = 2.5; g.beginPath(); let x = hash(i * 9.7) * w; g.moveTo(x, 0); for (let y = 0; y <= h; y += 60) { x += (hash(i * 31 + y) - 0.5) * 10; g.lineTo(x, y); } g.stroke(); } });
  MUSCLE_T.wrapS = MUSCLE_T.wrapT = THREE.RepeatWrapping; return MUSCLE_T;
}
function tissueMat() {
  const m = new THREE.MeshPhysicalMaterial({ map: muscleTex(), roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.3, emissive: 0x3a0806, emissiveIntensity: 0.22, side: THREE.BackSide });
  const U = { cutP: { value: new THREE.Vector4(0, 0, 1, -100) }, cutOn: { value: 0 } }; m.userData.U = U;
  m.onBeforeCompile = sh => { sh.uniforms.cutP = U.cutP; sh.uniforms.cutOn = U.cutOn;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos; uniform vec4 cutP; uniform float cutOn;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n{ float dd = abs(dot(cutP.xyz, vWPos) + cutP.w); float kf = (1. - smoothstep(0.011, 0.016, dd)) * cutOn, ks = (1. - smoothstep(0.0035, 0.0055, dd)) * cutOn; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.6, 0.18), kf); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.74, 0.38, 0.26), ks); }'); };
  return m;
}
let IBM = null;
function innerMats() {
  if (IBM) return IBM;
  const pores = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#efe3c8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(170,128,80,${0.18 + hash(i) * 0.3})`; g.beginPath(); g.arc(hash(i * 3.3) * w, hash(i * 5.1) * h, 0.8 + hash(i * 2.2) * 2.6, 0, 7); g.fill(); } });
  pores.wrapS = pores.wrapT = THREE.RepeatWrapping;
  IBM = { bone: new THREE.MeshPhysicalMaterial({ map: pores, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35, emissive: 0x2a2012, emissiveIntensity: 0.12 }),
    cart: new THREE.MeshPhysicalMaterial({ color: 0xa9cdee, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, emissive: 0x15324f, emissiveIntensity: 0.22 }),
    fluid: new THREE.MeshPhysicalMaterial({ color: 0x45a3e6, roughness: 0.05, transparent: true, opacity: 0.6, clearcoat: 1, emissive: 0x1a62b0, emissiveIntensity: 0.5, depthWrite: false }),
    caps: new THREE.MeshPhysicalMaterial({ color: 0xf3f6f9, roughness: 0.35, transparent: true, opacity: 0.5, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
    dot: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }),
    bub: bubbleMat(),
    tendon: new THREE.MeshPhysicalMaterial({ color: 0xf4eee6, roughness: 0.32, sheen: 1, sheenColor: new THREE.Color(0xffffff), clearcoat: 0.4 }),
    artery: new THREE.MeshPhysicalMaterial({ color: 0xc8262c, roughness: 0.3, clearcoat: 0.8, emissive: 0x400406, emissiveIntensity: 0.3 }),
    vein: new THREE.MeshPhysicalMaterial({ color: 0x3f5fae, roughness: 0.3, clearcoat: 0.8, emissive: 0x0b1438, emissiveIntensity: 0.3 }),
    nerve: new THREE.MeshPhysicalMaterial({ color: 0xf2d36b, roughness: 0.35, clearcoat: 0.6 }) };
  return IBM;
}
// desplaza los vértices un poco a lo largo de la normal con ruido suave: formas orgánicas, «no tan perfectas»
function wobble(geo, amp, f = 9, seed = 1) {
  geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = Math.sin(x * f + seed) * Math.sin(y * f * 0.7 + seed * 2.1) * Math.sin(z * f * 1.3 + seed * 0.7) + 0.5 * Math.sin((x + y + z) * f * 2.1 + seed);
    p.setXYZ(i, x + n.getX(i) * amp * k, y + n.getY(i) * amp * k, z + n.getZ(i) * amp * k); }
  geo.computeVertexNormals(); return geo;
}
const V2 = (a) => a.map(([x, y]) => new THREE.Vector2(Math.max(0.00005, x), y));
// falange (a lo largo de +y, de y0 a y1): base ancha con la cara articular un poco hundida, caña más fina y aplanada, cabeza redondeada
function phalanxGeo(y0, y1, rb, rh, distal = false) {
  const L = y1 - y0, P = distal
    ? [[0, 0.02], [rb * 0.7, 0], [rb, 0.06], [rb * 0.92, 0.16], [rb * 0.55, 0.36], [rb * 0.45, 0.6], [rb * 0.62, 0.8], [rb * 0.7, 0.9], [rb * 0.5, 0.98], [0, 1]]
    : [[0, 0.025], [rb * 0.72, 0], [rb, 0.04], [rb * 0.95, 0.12], [rb * 0.66, 0.26], [rb * 0.56, 0.5], [rh * 0.72, 0.74], [rh * 0.98, 0.86], [rh, 0.92], [rh * 0.78, 0.98], [0, 1]];
  const g = new THREE.LatheGeometry(V2(P.map(([x, y]) => [x, y0 + y * L])), 28); g.scale(1.12, 1, 0.84); return wobble(g, rb * 0.03, 60, y0 * 37);
}
// capa de cartílago sobre el extremo de un hueso (cabeza: arriba; base: abajo)
function cartGeo(y0, y1, rb, rh, end) {
  const L = y1 - y0, P = end === 'head' ? [[rh * 1.035, 0.84], [rh * 1.05, 0.92], [rh * 0.81, 0.985], [0, 1.012]] : [[0, -0.012], [rb * 0.74, -0.008], [rb * 0.98, 0.012], [rb * 1.035, 0.035], [rb * 0.99, 0.065]];
  const g = new THREE.LatheGeometry(V2(P.map(([x, y]) => [x, y0 + y * L])), 28); g.scale(1.12, 1, 0.84); return g;
}
const GAP = 0.016;

// ---------- la forma de la mano (en reposo: mano derecha, dorso hacia +z, dedos hacia +y)
const HD = {
  F: [ { x: -0.31, y: 0.86, a: 5, L: [0.42, 0.25, 0.21], r: 0.094 },       // índice, corazón, anular, meñique: nudillo (x, y), giro (grados), falanges, radio
       { x: -0.1, y: 0.9, a: 0, L: [0.46, 0.29, 0.22], r: 0.098 },
       { x: 0.11, y: 0.87, a: -4, L: [0.43, 0.27, 0.21], r: 0.093 },
       { x: 0.3, y: 0.79, a: -9, L: [0.34, 0.21, 0.19], r: 0.08 } ],
  T: [ [-0.25, 0.12, -0.04], [-0.46, 0.39, 0.01], [-0.585, 0.585, 0.045], [-0.67, 0.745, 0.065] ], TR: [0.12, 0.108, 0.1, 0.088],   // pulgar: CMC, MCP, IP, yema
};
for (const d of HD.F) { const a = d.a * D2; d.u = [-Math.sin(a), Math.cos(a)]; const P = [[d.x, d.y]]; let s = 0; for (let j = 0; j < 3; j++) { s += j < 2 ? d.L[j] : d.L[2] - d.r * 0.8; P.push([d.x + d.u[0] * s, d.y + d.u[1] * s]); } d.P = P; }
function capP(a, b, ra, rb, zs) { const izs = 1 / zs, dx = b[0] - a[0], dy = b[1] - a[1], dz = ((b[2] || 0) - (a[2] || 0)) * izs; return { ax: a[0], ay: a[1], az: a[2] || 0, dx, dy, dz, ra, rb, izs, il2: 1 / (dx * dx + dy * dy + dz * dz) }; }
function capD(x, y, z, P) { const px = x - P.ax, py = y - P.ay, pz = (z - P.az) * P.izs; let h = (px * P.dx + py * P.dy + pz * P.dz) * P.il2; h = h < 0 ? 0 : h > 1 ? 1 : h;
  const qx = px - P.dx * h, qy = py - P.dy * h, qz = pz - P.dz * h; return Math.sqrt(qx * qx + qy * qy + qz * qz) - (P.ra + (P.rb - P.ra) * h); }
function ellD(x, y, z, E) { const a = (x - E[0]) / E[3], b = (y - E[1]) / E[4], c = (z - E[2]) / E[5]; return (Math.sqrt(a * a + b * b + c * c) - 1) * E[6]; }
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
function sphD(x, y, z, K) { const a = x - K[0], b = y - K[1], c = (z - K[2]) / K[4]; return Math.sqrt(a * a + b * b + c * c) - K[3]; }
const HP = (() => {
  const meta = HD.F.map(d => capP([d.x * 0.62 - 0.01, 0.16, 0.03], [d.x - d.u[0] * 0.03, d.y - d.u[1] * 0.03, 0.03], 0.085, d.r * 1.05, 1.0));
  const fing = HD.F.map(d => [capP([...d.P[0], 0], [...d.P[1], 0], d.r, d.r * 0.93, 0.86), capP([...d.P[1], 0], [...d.P[2], 0], d.r * 0.93, d.r * 0.86, 0.86), capP([...d.P[2], 0], [...d.P[3], -d.r * 0.06], d.r * 0.86, d.r * 0.8, 0.86)]);
  const knk = HD.F.map(d => [[...d.P[1], 0.005, d.r * 0.955, 0.86], [...d.P[2], 0.004, d.r * 0.875, 0.86]]);
  const thumb = [0, 1, 2].map(j => capP(HD.T[j], HD.T[j + 1], HD.TR[j], HD.TR[j + 1], 0.86));
  const ell = [[-0.03, 0.47, -0.03, 0.38, 0.4, 0.12], [-0.25, 0.27, -0.07, 0.15, 0.2, 0.12], [0.27, 0.32, -0.05, 0.1, 0.3, 0.1]].map(e => [...e, Math.min(e[3], e[4], e[5])]);
  const arm = capP([0, 0.16, 0], [0.02, -2.2, 0], 0.27, 0.3, 0.66);
  return { meta, fing, knk, thumb, ell, arm };
})();
function sdPalm(x, y, z) { let p = capD(x, y, z, HP.meta[0]); for (let i = 1; i < 4; i++) p = smin(p, capD(x, y, z, HP.meta[i]), 0.1); for (const e of HP.ell) p = smin(p, ellD(x, y, z, e), 0.1); return smin(p, capD(x, y, z, HP.arm), 0.16); }
function sdFinger(x, y, z, i) { const F = HP.fing[i]; let f = Math.min(capD(x, y, z, F[0]), capD(x, y, z, F[1]), capD(x, y, z, F[2])); for (const K of HP.knk[i]) f = smin(f, sphD(x, y, z, K), 0.03); return f; }
function sdThumb(x, y, z) { return Math.min(capD(x, y, z, HP.thumb[0]), capD(x, y, z, HP.thumb[1]), capD(x, y, z, HP.thumb[2])); }
const WEB = capP([-0.43, 0.36, -0.01], [-0.29, 0.66, 0.0], 0.05, 0.045, 0.7);
function sdHand(x, y, z) { let d = smin(sdPalm(x, y, z), capD(x, y, z, WEB), 0.09); for (let i = 0; i < 4; i++) d = smin(d, sdFinger(x, y, z, i), 0.05); return smin(d, sdThumb(x, y, z), 0.07); }
// marching cubes (tablas de Paul Bourke, las mismas que usa three) con vértices compartidos por arista → malla indexada
const MC_E = [[0, 0, 0, 0], [1, 0, 0, 1], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0], [1, 0, 1, 1], [0, 1, 1, 0], [0, 0, 1, 1], [0, 0, 0, 2], [1, 0, 0, 2], [1, 1, 0, 2], [0, 1, 0, 2]];
let HAND_GEO = null;
const HAND_Y0 = -0.75;
function handGeo() {
  if (HAND_GEO) return HAND_GEO;
  const h = 0.0085, x0 = -0.86, y0 = HAND_Y0, z0 = -0.27, nx = Math.ceil((0.56 - x0) / h) + 1, ny = Math.ceil((1.9 - y0) / h) + 1, nz = Math.ceil((0.27 - z0) / h) + 1;
  const F = new Float32Array(nx * ny * nz); let q = 0;
  for (let k = 0; k < nz; k++) { const z = z0 + k * h; for (let j = 0; j < ny; j++) { const y = y0 + j * h; for (let i = 0; i < nx; i++, q++) { const x = x0 + i * h; F[q] = -sdHand(x, y, z); } } }
  const id = (i, j, k) => i + nx * (j + ny * k), vmap = new Map(), P = [], I = [];
  const vert = (i, j, k, ax) => { const key = id(i, j, k) * 3 + ax; let v = vmap.get(key); if (v !== undefined) return v;
    const a = F[id(i, j, k)], b = F[ax === 0 ? id(i + 1, j, k) : ax === 1 ? id(i, j + 1, k) : id(i, j, k + 1)], t = a === b ? 0.5 : a / (a - b);
    v = P.length / 3; P.push(x0 + (i + (ax === 0 ? t : 0)) * h, y0 + (j + (ax === 1 ? t : 0)) * h, z0 + (k + (ax === 2 ? t : 0)) * h); vmap.set(key, v); return v; };
  const C = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let ci = 0; for (let c = 0; c < 8; c++) if (F[id(i + C[c][0], j + C[c][1], k + C[c][2])] < 0) ci |= 1 << c;
    if (ci === 0 || ci === 255) continue; const o = ci << 4;
    for (let e = 0; triTable[o + e] !== -1; e += 3) for (let m = 0; m < 3; m++) { const E = MC_E[triTable[o + e + m]]; I.push(vert(i + E[0], j + E[1], k + E[2], E[3])); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  // normales del gradiente del campo, colores de la piel y pesos de los huesos
  const n = P.length / 3, N = new Float32Array(n * 3), COL = new Float32Array(n * 3), UV = new Float32Array(n * 2), SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4), e = h * 0.5;
  const base = new THREE.Color(0xd8987e), red = new THREE.Color(0xcf7468), pale = new THREE.Color(0xe2ab92), cc = new THREE.Color();
  const ssm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  for (let v = 0; v < n; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    const gx = sdHand(x + e, y, z) - sdHand(x - e, y, z), gy = sdHand(x, y + e, z) - sdHand(x, y - e, z), gz = sdHand(x, y, z + e) - sdHand(x, y, z - e), gl = Math.hypot(gx, gy, gz) || 1;
    N[v * 3] = gx / gl; N[v * 3 + 1] = gy / gl; N[v * 3 + 2] = gz / gl;
    UV[v * 2] = x * 1.6 + z * 0.7; UV[v * 2 + 1] = y * 1.6;
    // ¿a qué parte pertenece? (la más cercana: palma/antebrazo, un dedo o el pulgar)
    let best = sdPalm(x, y, z), part = -1; for (let i = 0; i < 4; i++) { const d = sdFinger(x, y, z, i); if (d < best) { best = d; part = i; } } { const d = sdThumb(x, y, z); if (d < best) { best = d; part = 4; } }
    let w = [1, 0, 0, 0], b = [0, 0, 0, 0]; cc.copy(base);
    if (part >= 0 && part < 4) { const d = HD.F[part], s = (x - d.x) * d.u[0] + (y - d.y) * d.u[1];
      const w0 = ssm(-0.05, 0.06, s), w1 = ssm(d.L[0] - 0.035, d.L[0] + 0.035, s), w2 = ssm(d.L[0] + d.L[1] - 0.03, d.L[0] + d.L[1] + 0.03, s);
      const bi = 1 + part * 3; b = [0, bi, bi + 1, bi + 2]; w = [1 - w0, w0 * (1 - w1), w0 * w1 * (1 - w2), w0 * w1 * w2];
      // nudillos algo más rosados por el dorso, y la yema
      const kn = Math.max(Math.exp(-(((s - d.L[0]) / 0.035) ** 2)), Math.exp(-(((s - d.L[0] - d.L[1]) / 0.03) ** 2)) * 0.8, Math.exp(-((s / 0.045) ** 2)) * 0.6) * ssm(0.035, 0.075, z);
      const tip = ssm(d.L[0] + d.L[1] + d.L[2] * 0.45, d.L[0] + d.L[1] + d.L[2], s);
      cc.lerp(red, clamp(kn * 0.4 + tip * 0.4));
    } else if (part === 4) { const A = HD.T[1], B = HD.T[2], ux = B[0] - A[0], uy = B[1] - A[1], ul = Math.hypot(ux, uy), s = ((x - A[0]) * ux + (y - A[1]) * uy) / ul;
      const w1 = ssm(-0.04, 0.05, s), w2 = ssm(ul - 0.03, ul + 0.03, s); b = [0, 13, 14, 0]; w = [1 - w1, w1 * (1 - w2), w1 * w2, 0];
      cc.lerp(red, ssm(ul + 0.05, ul + 0.2, s) * 0.4);
    } else { cc.lerp(pale, ssm(-0.1, 0.12, z) * 0.2 * ssm(0.1, 0.6, y)); }
    COL[v * 3] = cc.r; COL[v * 3 + 1] = cc.g; COL[v * 3 + 2] = cc.b;
    for (let m = 0; m < 4; m++) { SI[v * 4 + m] = b[m]; SW[v * 4 + m] = w[m]; }
  }
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(COL, 3)); g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
  console.log('mano: ' + n + ' vértices, ' + I.length / 3 + ' triángulos');
  HAND_GEO = g; return g;
}
// la misma malla, pero solo con los triángulos alrededor del índice (para la carne de dentro, que solo se ve en el corte)
let INNER_GEO = null;
function innerGeo() {
  if (INNER_GEO) return INNER_GEO; const g = handGeo(), P = g.attributes.position, I = g.index.array, out = [], d = HD.F[0];
  const near = v => { const x = P.getX(v) - d.x, y = P.getY(v) - d.y, s = x * d.u[0] + y * d.u[1], q = x * d.u[1] - y * d.u[0]; return s > 0.05 && s < 0.85 && Math.abs(q) < 0.16; };
  for (let i = 0; i < I.length; i += 3) if (near(I[i]) && near(I[i + 1]) && near(I[i + 2])) out.push(I[i], I[i + 1], I[i + 2]);
  INNER_GEO = new THREE.BufferGeometry(); for (const k in g.attributes) INNER_GEO.setAttribute(k, g.attributes[k]); INNER_GEO.setIndex(out); return INNER_GEO;
}
// el interior de un dedo (falanges con su cartílago, tendón flexor y ligamentos; en la articulación del medio: cápsula blanca, líquido azul con burbujitas de gas y la burbuja)
function fingerInside(F, planes) {
  const M = innerMats(), [b0, b1, b2] = F.bones, L = F.L, r = F.r, g2 = GAP / 2;
  const ends = [[0.02, L[0] - g2], [g2, L[1] - g2], [g2, L[2] * 0.8]], rad = [[0.44, 0.4], [0.4, 0.37], [0.37, 0.3]], segs = [b0, b1, b2];
  F.ph = ends.map(([y0, y1], i) => { const m = new THREE.Mesh(phalanxGeo(y0, y1, r * rad[i][0], r * rad[i][1], i === 2), M.bone); m.castShadow = true; segs[i].add(m); return m; });
  for (let i = 0; i < 2; i++) { const [y0, y1] = ends[i]; segs[i].add(new THREE.Mesh(cartGeo(y0, y1, r * rad[i][0], r * rad[i][1], 'head'), M.cart));
    const [z0, z1] = ends[i + 1]; segs[i + 1].add(new THREE.Mesh(cartGeo(z0, z1, r * rad[i + 1][0], r * rad[i + 1][1], 'base'), M.cart)); }
  for (let i = 0; i < 3; i++) { const l = L[i] * (i === 2 ? 0.7 : 0.98); const t = rbox(r * 0.42, l, r * 0.12, M.tendon, r * 0.05); t.position.set(0, l / 2 + (i ? 0 : 0.01), -r * 0.5); segs[i].add(t); }
  const lgM = M.tendon.clone(); lgM.transparent = true; lgM.opacity = 0.8;
  for (const bj of [b1, b2]) for (const sx of [-1, 1]) for (const k of [-1, 1]) { const lg = cyl(r * 0.035, r * 0.04, bj === b1 ? 0.085 : 0.065, lgM, 10); lg.position.set(sx * r * (0.56 + 0.05 * k), 0, -r * 0.12 + k * r * 0.07); lg.rotation.z = sx * k * 0.12; bj.add(lg); }
  const cm = M.caps.clone();
  if (planes) { cm.clippingPlanes = planes; cm.clipIntersection = true; }
  const cap = lathe([[r * 0.46, -0.085], [r * 0.52, -0.066], [r * 0.6, -0.042], [r * 0.645, -0.016], [r * 0.655, 0.0], [r * 0.645, 0.016], [r * 0.6, 0.04], [r * 0.51, 0.062], [r * 0.44, 0.08]], 40, cm); cap.scale.set(1.12, 1, 0.84); cap.renderOrder = 6; b1.add(cap);
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.42, 1, 32, 1), M.fluid); fl.scale.set(1.12, GAP * 1.6, 0.84); fl.renderOrder = 5; b1.add(fl);
  const NB = 46, dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10), M.bub, NB); dots.frustumCulled = false; dots.renderOrder = 7; b1.add(dots);
  { const o = new THREE.Object3D(); o.scale.setScalar(0.00001); o.updateMatrix(); for (let i = 0; i < NB; i++) dots.setMatrixAt(i, o.matrix); }
  const dp = [], dr = []; for (let i = 0; i < NB; i++) { const a = hash(i * 3.7) * 6.283, rr2 = Math.sqrt(hash(i * 5.3)) * r * 0.4; dp.push(v3(Math.cos(a) * rr2 * 1.12, (hash(i * 2.9) - 0.5) * GAP * 0.8, Math.sin(a) * rr2 * 0.84)); dr.push(0.0017 + hash(i * 7.1) * 0.0027); }
  const bub = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), M.bub); bub.scale.setScalar(0.0001); bub.renderOrder = 8; b1.add(bub);
  Object.assign(F, { cap, fluid: fl, dots, dp, dr, bub });
}
function nailMesh(r, L2) {
  const tex = canvasTex(64, 128, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#e7bcaf'); gr.addColorStop(0.16, '#dfa597'); gr.addColorStop(0.84, '#e2a99b'); gr.addColorStop(0.93, '#ecd0c5'); gr.addColorStop(1, '#f1ddd4'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const m = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.32, clearcoat: 0.55, clearcoatRoughness: 0.18 });
  const geo = new THREE.CylinderGeometry(r * 0.76, r * 0.8, L2 * 0.6, 20, 1, true, -0.9, 1.8); geo.scale(1, 1, 0.92);
  const nm = new THREE.Mesh(geo, m); nm.position.y = L2 * 0.6; nm.renderOrder = 2; return nm;
}
// la mano derecha (o la izquierda con o.left), con su esqueleto, el interior del índice y su corte (o.cut)
function realHand(o = {}) {
  const base = skinBase(), g = new THREE.Group(), geo = handGeo();
  const planes = o.cut ? [0, 1, 2, 3, 4].map(() => new THREE.Plane()) : null, iplanes = o.cut ? [0, 1, 2, 3].map(() => new THREE.Plane()) : null;
  const om = base.outer.clone(), im = tissueMat();
  if (planes) { om.clippingPlanes = planes; om.clipIntersection = true; im.clippingPlanes = iplanes; im.clipIntersection = false; }      // la carne de dentro solo se dibuja en la franja del índice
  const root = new THREE.Bone(), bones = [root], fingers = [];
  for (const d of HD.F) { const b0 = new THREE.Bone(), b1 = new THREE.Bone(), b2 = new THREE.Bone(); b0.position.set(d.x, d.y, 0); b0.rotation.z = d.a * D2; b1.position.y = d.L[0]; b2.position.y = d.L[1];
    root.add(b0); b0.add(b1); b1.add(b2); bones.push(b0, b1, b2); fingers.push({ bones: [b0, b1, b2], L: d.L, r: d.r, d }); }
  // pulgar: t1 en el MCP (eje hacia el IP) y t2 en el IP; su «dorso» mira a la izquierda y un poco hacia delante
  const tq = (A, B) => { const y = v3(B[0] - A[0], B[1] - A[1], B[2] - A[2]).normalize(), z = v3(-0.7, 0, 0.72).normalize(); const x = new THREE.Vector3().crossVectors(y, z).normalize(); z.crossVectors(x, y).normalize(); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); };
  const t1 = new THREE.Bone(), t2 = new THREE.Bone(), q1 = tq(HD.T[1], HD.T[2]), q2 = tq(HD.T[2], HD.T[3]);
  t1.position.set(...HD.T[1]); t1.quaternion.copy(q1); root.add(t1); t2.position.copy(v3(...HD.T[2]).sub(v3(...HD.T[1])).applyQuaternion(q1.clone().invert())); t2.quaternion.copy(q1.clone().invert().multiply(q2)); t1.add(t2); bones.push(t1, t2);
  const mesh = new THREE.SkinnedMesh(geo, om), inner = new THREE.SkinnedMesh(innerGeo(), im); mesh.add(root); g.add(mesh); g.add(inner);
  g.updateMatrixWorld(true); const sk = new THREE.Skeleton(bones); mesh.bind(sk); inner.bind(sk);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = inner.frustumCulled = false;
  // antebrazo: sigue al corte del campo (su sección en y = HAND_Y0 es la elipse del brazo)
  { const ya = HAND_Y0, x0 = 0.02 * (0.16 - ya) / 2.36, r0 = 0.27 + 0.03 * (0.16 - ya) / 2.36;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0 + 0.03, 2.4, 64, 1, true), om); arm.scale.z = 0.66; arm.position.set(x0, ya - 1.2, 0); arm.receiveShadow = true; g.add(arm);
    const c = arm.geometry.attributes.position.count, col = new Float32Array(c * 3), cc = new THREE.Color(0xd99572); for (let i = 0; i < c; i++) { col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; } arm.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  // uñas
  fingers.forEach(F => { const nm = nailMesh(F.r, F.L[2]); F.bones[2].add(nm); F.nail = nm; });
  { const nm = nailMesh(HD.TR[2] * 0.98, 0.21); nm.position.y = 0.105; t2.add(nm); }
  if (o.inside !== false) fingerInside(fingers[0], planes);
  // destello, onda y rojez (la «artritis» del mito) en cada nudillo
  const flT = canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.28, 'rgba(150,215,255,.9)'); gr.addColorStop(0.6, 'rgba(50,150,235,.35)'); gr.addColorStop(1, 'rgba(50,150,235,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const rgT = canvasTex(256, 256, (c, w, h) => { c.strokeStyle = 'rgba(40,140,230,.95)'; c.lineWidth = 7; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 8, 0, 7); c.stroke(); });
  const redT = canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(235,40,40,.75)'); gr.addColorStop(0.5, 'rgba(235,40,40,.3)'); gr.addColorStop(1, 'rgba(235,40,40,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const spr = (map, ro) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); s.scale.setScalar(0.0001); s.renderOrder = ro; g.add(s); return s; };
  const fxp = [v3(...HD.T[1]).add(v3(0, 0, 0.1)), ...HD.F.map(d => v3(d.x, d.y - 0.02, 0.15))];
  const fx = fxp.map(p => { const a = spr(flT, 10), b = spr(rgT, 10), c = spr(redT, 9); for (const s of [a, b, c]) s.position.copy(p); return { flash: a, ring: b, red: c, p }; });
  g.userData = { fingers, thumb: { bones: [t1, t2] }, fx, mesh, inner, planes, iplanes, tissue: im };
  if (o.left) g.scale.x = -1;
  return g;
}
// pose: flexión de cada dedo por el nudillo (rad, hacia la palma; [pulgar, índice, corazón, anular, meñique]) y estiramiento de la articulación del medio
function handPose2(h, ang, pull = []) {
  h.userData.fingers.forEach((f, i) => { const a = ang[i + 1] || 0; f.bones[0].rotation.x = -a; f.bones[1].rotation.x = -a * 0.75; f.bones[2].rotation.x = -a * 0.45; f.bones[1].position.y = f.L[0] + (pull[i + 1] || 0); });
  const [t1, t2] = h.userData.thumb.bones, a = ang[0] || 0; t1.rotation.x = -a * 0.7; t2.rotation.x = -a * 0.6;
}
// planos del corte (en el marco del hueso proximal del índice): quita la piel con z > zc entre y0 e y1 y |x| < xm. zc alto = cerrado
const _m3 = new THREE.Matrix3();
function cutUpdate(h, zc, y0, y1, xm) {
  const P = h.userData.planes; if (!P) return; const b = h.userData.fingers[0].bones[0]; b.updateWorldMatrix(true, false); const M4 = b.matrixWorld; _m3.getNormalMatrix(M4);
  const set = (i, nx, ny, nz, c) => { P[i].normal.set(nx, ny, nz); P[i].constant = c; P[i].applyMatrix4(M4, _m3); };
  set(0, 0, 0, -1, zc); set(1, 0, -1, 0, y0); set(2, 0, 1, 0, -y1); set(3, 1, 0, 0, -xm); set(4, -1, 0, 0, -xm);
  const Q = h.userData.iplanes, e = 0.012, si = (i, nx, ny, nz, c) => { Q[i].normal.set(nx, ny, nz); Q[i].constant = c; Q[i].applyMatrix4(M4, _m3); };
  si(0, 0, 1, 0, -(y0 - e)); si(1, 0, -1, 0, y1 + e); si(2, -1, 0, 0, xm + e); si(3, 1, 0, 0, xm + e);
  const TU = h.userData.tissue.userData.U; TU.cutP.value.set(P[0].normal.x, P[0].normal.y, P[0].normal.z, P[0].constant); TU.cutOn.value = zc < 0.075 ? 1 : 0;
}
// fondo claro y suave: esfera con degradado (lleva los trozos de profundidad logarítmica)
// ---------------------------------------------------------------- EL MAPA DEL MUNDO DE NOCHE (el suelo de la maqueta). Prefijo map.
// Plano en y = 0, equirrectangular (mapP de 05_world.js: 10 unidades por grado, lon −200..160, 3600 × 1800). Texturas de geo_prep.py
// (Natural Earth, dominio público): mapa entero 8192² + detalle del Atlántico (lon −50..10, lat −10..50) y de Tonga (lon −182..−170, lat −25..−13).
// Luces de las ciudades (emisivas, cálidas); las de Mauritania y Tonga van aparte, y encima de esos dos países una capa cian de «internet».
// Cables: ~670 cintas planas de luz (rutas ilustrativas, no datos de TeleGeography) + EllaLink (dorado), el cable de Tonga y ACE.
//   buildMap() → Group   ·   mapAt(t, o)   ·   mapAnchor(nombre) → Vector3
//   o = { draw: 0..1 (aparecen los cables desde sus extremos), glow: brillo de los cables (1), lights: luces de las ciudades (1),
//         ella: posición del pulso de EllaLink de Sines (0) a Fortaleza (1) (< 0 sin pulso), ellaHi: resalte dorado de EllaLink (1),
//         breaks: 0..1 (roturas al azar por el mundo, van saliendo), ace: 0..1 (se rompe ACE frente a Mauritania), tongaCut: 0..1 (se rompe el de Tonga),
//         mauritania: 1 con internet / 0 sin (capa cian), tonga: igual, mauLights / tonLights: luces cálidas de las casas (1; no hace falta tocarlas),
//         sat: 0..1 (el satélite aparece) }
// Anclas: 'mauritania' (centro del país), 'nkc' (Nuakchot), 'ace' (rotura de ACE), 'tonga' (Nukuʻalofa), 'fiji' (Suva), 'tongacut', 'sat',
//         'ella0'..'ella3' (Sines, Funchal, Praia, Fortaleza), 'center'.
// Ojo: en los planos muy altos (el mapa entero) la niebla del ambiente 'museo' se lo come: baja S.fogK (p. ej. 0.05) y vuelve a llamar a moodSet.
const MAP_ATL = [-50, 10, -10, 50], MAP_TON = [-182, -170, -25, -13];
const MAP_Y = 0.12;                                   // altura de los cables sobre el mapa
const MAPS = { anchors: {}, u: null, cu: null };
const mapLL = (lon, lat, y = 0) => new THREE.Vector3((lon - LON0) * MAPK, y, -lat * MAPK);   // sin envolver (los cables pueden salirse del borde)
function mapAnchor(n) { const a = MAPS.anchors[n]; return a ? a.clone() : null; }
function mapTexL(p, srgb) { const t = tx('map/' + p, srgb); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; }

// ---------- el plano: MeshStandardMaterial (le da la luz del museo y la niebla) con el muestreo cambiado: mapa base + detalles sin costura
function mapPlane() {
  const geo = new THREE.PlaneGeometry(3600, 1800, 1, 1); geo.rotateX(-Math.PI / 2);
  const baseC = mapTexL('base_color.jpg', true), baseL = mapTexL('base_lights.png', false);
  const u = MAPS.u = {
    tAtlC: { value: mapTexL('atl_color.jpg', true) }, tAtlL: { value: mapTexL('atl_lights.png', false) },
    tTonC: { value: mapTexL('ton_color.jpg', true) }, tTonL: { value: mapTexL('ton_lights.png', false) },
    rAtl: { value: new THREE.Vector4(...MAP_ATL) }, rTon: { value: new THREE.Vector4(...MAP_TON) },
    uLights: { value: 1 }, uMauL: { value: 1 }, uTonL: { value: 1 }, uMauNet: { value: 1 }, uTonNet: { value: 1 }, uTime: { value: 0 },
  };
  const m = new THREE.MeshStandardMaterial({ map: baseC, emissiveMap: baseL, emissive: 0xffffff, roughness: 0.82, metalness: 0.0 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec2 vMP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvMP = position.xz;');
    sh.fragmentShader = `varying vec2 vMP; uniform sampler2D tAtlC, tAtlL, tTonC, tTonL; uniform vec4 rAtl, rTon; uniform float uLights, uMauL, uTonL, uMauNet, uTonNet, uTime;
      vec2 mapLonLat(){ return vec2(vMP.x / ${MAPK.toFixed(1)} + ${LON0.toFixed(1)}, -vMP.y / ${MAPK.toFixed(1)}); }
      vec2 rUv(vec4 r, vec2 ll){ return vec2((ll.x - r.x) / (r.y - r.x), (ll.y - r.z) / (r.w - r.z)); }
      float rW(vec2 q){ vec2 e = min(q, 1.0 - q); return smoothstep(0.0, 0.06, min(e.x, e.y)); }
      ` + sh.fragmentShader
      .replace('#include <map_fragment>', `
        vec2 ll = mapLonLat(); vec2 qa = rUv(rAtl, ll), qt = rUv(rTon, ll); float wa = rW(qa), wt = rW(qt);
        vec4 mc = texture2D(map, vMapUv);
        if (wa > 0.0) mc = mix(mc, texture2D(tAtlC, qa), wa);
        if (wt > 0.0) mc = mix(mc, texture2D(tTonC, qt), wt);
        diffuseColor *= mc;`)
      .replace('#include <emissivemap_fragment>', `
        vec3 L = texture2D(emissiveMap, vMapUv).rgb;
        if (wa > 0.0) L = mix(L, texture2D(tAtlL, qa).rgb, wa);
        if (wt > 0.0) L = mix(L, texture2D(tTonL, qt).rgb, wt);
        bool isT = ll.x < -150.0; float cL = isT ? uTonL : uMauL, cN = isT ? uTonNet : uMauNet;
        float warm = (L.r + L.g * cL) * uLights;
        vec3 em = vec3(1.0, 0.62, 0.30) * (warm * 1.6 + warm * warm * 2.2);
        // internet: una red cian sobre el país (rejilla fina que respira + borde); se apaga con cN = 0
        float msk = isT ? min(1.0, L.b * 2.5) : L.b; vec2 gq = ll * (isT ? 12.0 : 3.0); vec2 gf = abs(fract(gq) - 0.5);
        float grid = smoothstep(0.43, 0.5, max(gf.x, gf.y));
        float edge = smoothstep(0.25, 0.5, msk) * (1.0 - smoothstep(0.5, 0.85, msk));
        float br = 0.75 + 0.25 * sin(uTime * 3.0 + ll.x * 2.0 + ll.y * 1.3);
        em += vec3(0.25, 0.95, 1.0) * cN * (edge * 0.45 + L.g * 1.9);
        totalEmissiveRadiance = em;`);
  };
  const mesh = new THREE.Mesh(geo, m); mesh.receiveShadow = true; mesh.renderOrder = -1; return mesh;
}

// ---------- los cables: una geometría de cintas (2 vértices por punto), shader propio aditivo
const MAP_CAB_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 nrm; attribute float side, sArc; attribute vec4 cab; attribute vec2 brk; attribute float clen;
uniform float uW0, uWk; varying float vSide, vS, vLen; varying vec4 vCab; varying vec2 vBrk; varying float vX;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); float d = distance(wp.xyz, cameraPosition);
  vec3 vd = (wp.xyz - cameraPosition) / d; vec2 hz = normalize(vd.xz + 1e-5);
  float w = uW0 + uWk * d; if (cab.y > 0.5) w *= (cab.y < 1.5 ? 1.8 : 1.4);
  w *= mix(1.0, 1.0 / max(0.25, abs(vd.y)), abs(dot(nrm, hz)));            // de canto (plano oblicuo) se ensancha para no verse a trazos
  wp.xz += nrm * side * w * 0.5; vSide = side; vS = sArc; vLen = clen; vCab = cab; vBrk = brk; vX = position.x;
  gl_Position = projectionMatrix * viewMatrix * wp;
#include <logdepthbuf_vertex>
}`;
const MAP_CAB_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uDraw, uGlow, uElla, uEllaHi, uBreaks, uAce, uTonCut, uTime; uniform vec3 cCab, cElla, cRed;
varying float vSide, vS, vLen; varying vec4 vCab; varying vec2 vBrk; varying float vX;
void main(){
#include <logdepthbuf_fragment>
  if (abs(vX) > 1800.0) discard;
  float kind = vCab.y;
  // aparece desde los dos extremos hacia el medio (desfase por cable)
  float r = clamp((uDraw - vCab.x * 0.55) / 0.45, 0.0, 1.0);
  float e = min(vS, 1.0 - vS) * vLen, front = r * 0.5 * vLen + (r >= 1.0 ? 1e5 : 0.0);
  if (e > front) discard;
  float head = r < 1.0 ? exp(-pow((front - e) / 6.0, 2.0)) : 0.0;
  float prof = exp(-vSide * vSide * 3.2);
  vec3 c = cCab * (0.85 + 0.15 * vCab.z);
  float I = 1.3 * uGlow;
  if (kind > 0.5 && kind < 1.5) { c = mix(cCab, cElla, uEllaHi); I = mix(1.3, 2.4, uEllaHi) * uGlow;
    if (uElla >= 0.0) { float p = exp(-pow((vS - uElla) * vLen / 9.0, 2.0)); c += vec3(1.0, 0.9, 0.7) * p * 3.0; } }
  vec3 col = c * I * (0.55 + 0.45 * prof) + vec3(1.0) * prof * head * 4.0;
  // roturas: tramo rojo alrededor del punto (y un hueco en el medio)
  float bk = kind > 1.5 && kind < 2.5 ? uAce : kind > 2.5 ? uTonCut : (vBrk.y >= 0.0 ? clamp((uBreaks - vBrk.y) * 12.0, 0.0, 1.0) : 0.0);
  if (bk > 0.0) { float db = abs(vS - vBrk.x) * vLen; float rl = max(22.0, length(vec2(dFdx(vS), dFdy(vS))) * vLen * 9.0); float red = bk * (1.0 - smoothstep(rl * 0.45, rl, db));
    col = mix(col, cRed * (2.2 + 1.2 * sin(uTime * 9.0)), red); if (db < 0.8 * bk) discard; }
  float a = prof * (0.6 + 0.4 * prof);
  gl_FragColor = vec4(col * a, 1.0); }`;

function mapCables(J) {
  const P = [], NR = [], SD = [], SA = [], CB = [], BK = [], CL = [], IX = [];
  const rnd = (i => () => (i = (i * 16807) % 2147483647) / 2147483647)(12345);
  const n = J.cables.length, NB = 70;
  // roturas al azar: NB cables (no especiales) con su punto y su orden de aparición
  const order = [...Array(n).keys()].filter(i => !J.cables[i].n).sort(() => rnd() - 0.5).slice(0, NB);
  const brkOf = {}; order.forEach((ci, k) => { brkOf[ci] = [0.25 + 0.5 * rnd(), k / NB * 0.95]; });
  MAPS.cables = []; MAPS.sparks = [];
  J.cables.forEach((c, ci) => {
    const pts = []; for (let i = 0; i < c.p.length; i += 2) pts.push([c.p[i] / J.scale, c.p[i + 1] / J.scale]);
    const xz = pts.map(([lo, la]) => [(lo - LON0) * MAPK, -la * MAPK]);
    const s = [0]; for (let i = 1; i < xz.length; i++) s.push(s[i - 1] + Math.hypot(xz[i][0] - xz[i - 1][0], xz[i][1] - xz[i - 1][1]));
    const L = s[s.length - 1] || 1;
    const kind = c.n === 'EllaLink' ? 1 : c.n === 'ACE' ? 2 : c.n === 'Tonga Cable' ? 3 : 0;
    let bx = -1, by = -1;
    if (brkOf[ci]) [bx, by] = brkOf[ci];
    const near = (lo, la) => { let b = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.hypot(p[0] - lo, p[1] - la); if (d < bd) { bd = d; b = i; } }); return s[b] / L; };
    if (kind === 2) bx = near(-16.75, 17.4);              // ACE: frente a Nuakchot
    if (kind === 3) bx = near(-175.55, -20.75);           // Tonga: cerca del volcán (Hunga Tonga)
    const delay = kind ? 0 : rnd(), tone = rnd();
    MAPS.cables.push({ pts, xz, s, L, kind, name: c.n || '', stops: c.s || [] });
    if (bx >= 0) { const k = Math.max(1, s.findIndex(v => v >= bx * L)); const t0 = (bx * L - s[k - 1]) / Math.max(1e-6, s[k] - s[k - 1]);
      MAPS.sparks.push({ x: lerp(xz[k - 1][0], xz[k][0], t0), z: lerp(xz[k - 1][1], xz[k][1], t0), rank: kind === 2 ? -2 : kind === 3 ? -3 : by }); if (kind === 2) MAPS.anchors.ace = new THREE.Vector3(MAPS.sparks.at(-1).x, 0, MAPS.sparks.at(-1).z); if (kind === 3) MAPS.anchors.tongacut = new THREE.Vector3(MAPS.sparks.at(-1).x, 0, MAPS.sparks.at(-1).z); }
    // si el cable sale del mapa por un lado, se dibuja otra vez desplazado 360° (el shader recorta |x| > 1800)
    const xs = xz.map(p => p[0]), shifts = [0];
    if (Math.min(...xs) < -1800) shifts.push(3600); if (Math.max(...xs) > 1800) shifts.push(-3600);
    for (const sh of shifts) {
      const base = P.length / 3;
      for (let i = 0; i < xz.length; i++) {
        const a = xz[Math.max(0, i - 1)], b = xz[Math.min(xz.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
        for (const sd of [-1, 1]) { P.push(xz[i][0] + sh, MAP_Y + (kind ? 0.05 : 0) + (ci % 7) * 0.004, xz[i][1]); NR.push(-dz, dx); SD.push(sd); SA.push(s[i] / L); CB.push(delay, kind, tone, 0); BK.push(bx, kind ? -1 : by); CL.push(L); }
        if (i) { const k = base + i * 2; IX.push(k - 2, k - 1, k, k - 1, k + 1, k); }
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('nrm', new THREE.Float32BufferAttribute(NR, 2));
  g.setAttribute('side', new THREE.Float32BufferAttribute(SD, 1)); g.setAttribute('sArc', new THREE.Float32BufferAttribute(SA, 1));
  g.setAttribute('cab', new THREE.Float32BufferAttribute(CB, 4)); g.setAttribute('brk', new THREE.Float32BufferAttribute(BK, 2)); g.setAttribute('clen', new THREE.Float32BufferAttribute(CL, 1));
  g.setIndex(IX);
  const u = MAPS.cu = { uDraw: { value: 1 }, uGlow: { value: 1 }, uElla: { value: -1 }, uEllaHi: { value: 1 }, uBreaks: { value: 0 }, uAce: { value: 0 }, uTonCut: { value: 0 }, uTime: { value: 0 },
    uW0: { value: 0.12 }, uWk: { value: 0.0011 }, cCab: { value: new THREE.Color(0x5fe8ff) }, cElla: { value: new THREE.Color(COL.gold) }, cRed: { value: new THREE.Color(COL.red) } };
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: MAP_CAB_VS, fragmentShader: MAP_CAB_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 2; return mesh;
}

// ---------- chispas de las roturas (sprites aditivos, tamaño mínimo en píxeles para que se vean también desde muy alto)
function mapSparks() {
  const n = MAPS.sparks.length, P = new Float32Array(n * 3), R = new Float32Array(n);
  MAPS.sparks.forEach((s, i) => { P.set([s.x, MAP_Y + 0.4, s.z], i * 3); R[i] = s.rank; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('rank', new THREE.BufferAttribute(R, 1));
  const u = MAPS.su = { uBreaks: { value: 0 }, uAce: { value: 0 }, uTonCut: { value: 0 }, uTime: { value: 0 }, uPR: { value: PR }, tS: { value: starTex0() } };
  const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
      attribute float rank; uniform float uBreaks, uAce, uTonCut, uTime, uPR; varying float vK, vF;
      void main(){ float k = rank < -2.5 ? uTonCut : rank < -1.5 ? uAce : clamp((uBreaks - rank) * 12.0, 0.0, 1.0); vK = k;
        float ph = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.5453);
        vF = 0.6 + 0.4 * sin(uTime * 23.0 + ph * 40.0) * sin(uTime * 7.0 + ph * 13.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float d = -mv.z; gl_PointSize = k <= 0.0 ? 0.0 : uPR * clamp(2600.0 * 4.0 / d, 26.0, 120.0) * (0.7 + 0.5 * vF) * (1.0 + 1.5 * (1.0 - k) * step(0.001, k));
#include <logdepthbuf_vertex>
      }`,
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
      uniform sampler2D tS; varying float vK, vF;
      void main(){
#include <logdepthbuf_fragment>
        if (vK <= 0.0) discard; vec2 q = gl_PointCoord - 0.5; float r = length(q);
        float a = texture2D(tS, gl_PointCoord).a; float star = max(0.0, 1.0 - abs(q.x) * 14.0) * max(0.0, 1.0 - abs(q.y) * 2.2) + max(0.0, 1.0 - abs(q.y) * 14.0) * max(0.0, 1.0 - abs(q.x) * 2.2);
        vec3 c = mix(vec3(1.0, 0.25, 0.12), vec3(1.0, 0.85, 0.6), smoothstep(0.25, 0.0, r));
        gl_FragColor = vec4(c * (a * 3.0 + star * 2.5) * vF * vK, 1.0); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 3; return p;
}

// ---------- el satélite: cuerpo dorado, dos alas de paneles solares, antena, luz que parpadea; haz tenue hasta el mapa
function mapSatellite() {
  const g = new THREE.Group(), s = new THREE.Group(); g.add(s);
  const foil = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.32, metalness: 1, emissive: 0x6a4410, emissiveIntensity: 0.8 });
  const white = paint(0xeef1f5, 0.35), dark = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.5, metalness: 0.6 });
  const pT = canvasTex(512, 160, (c, w, h) => { c.fillStyle = '#0d1b3a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) { const x = 8 + i * 62, y = 8 + j * 50; const gr = c.createLinearGradient(x, y, x + 58, y + 46); gr.addColorStop(0, '#2f5fc4'); gr.addColorStop(1, '#173a8a'); c.fillStyle = gr; c.fillRect(x, y, 56, 44);
      c.strokeStyle = 'rgba(160,200,255,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 28, y); c.lineTo(x + 28, y + 44); c.moveTo(x, y + 22); c.lineTo(x + 56, y + 22); c.stroke(); } });
  const panM = new THREE.MeshPhysicalMaterial({ map: pT, roughness: 0.25, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x4f86ff, emissiveIntensity: 1.1, emissiveMap: pT });
  const body = rbox(1.6, 1.6, 2.0, foil, 0.12); s.add(body);
  const top = rbox(1.7, 0.18, 2.1, white, 0.05); top.position.y = 0.88; s.add(top);
  for (const sd of [-1, 1]) {
    const arm = bar(v3(sd * 0.8, 0, 0), v3(sd * 1.6, 0, 0), 0.06, dark); s.add(arm);
    const wing = new THREE.Group(); wing.position.x = sd * 1.6;
    for (let k = 0; k < 2; k++) { const pn = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 1.5), [dark, dark, panM, dark, dark, dark]); pn.position.x = sd * (1.25 + k * 2.4); pn.castShadow = true; wing.add(pn); }
    s.add(wing);
  }
  const dish = lathe([[0.02, 0], [0.45, 0.12], [0.72, 0.32], [0.74, 0.34]], 32, white); dish.rotation.x = Math.PI; dish.position.y = -1.0; s.add(dish);
  s.add(bar(v3(0, -1.0, 0), v3(0, -1.45, 0), 0.03, dark));
  const ant = bar(v3(0, 0.95, 0.5), v3(0, 2.0, 0.5), 0.025, white); s.add(ant);
  const blink = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff4040, toneMapped: false })); blink.position.set(0, 2.05, 0.5); s.add(blink);
  // el haz: cono abierto que se desvanece hacia el mapa + un círculo de luz en el suelo
  const bT = canvasTex(8, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const beamM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fe8ff).multiplyScalar(0.045), map: bT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 1, 1, 48, 1, true), beamM); beam.geometry.translate(0, -0.5, 0); g.add(beam);
  const fT = canvasTex(256, 256, (c, w, h) => { const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(0.8, 'rgba(255,255,255,.25)'); gr.addColorStop(0.92, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const foot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fe8ff).multiplyScalar(0.10), map: fT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  foot.rotation.x = -Math.PI / 2; g.add(foot);
  s.scale.setScalar(2.6);
  g.userData = { s, beam, foot, blink, beamM, footM: foot.material };
  return g;
}
const MAP_SAT_LL = [-31, 21], MAP_SAT_Y = 95, MAP_SAT_R = 22;

function buildMap() {
  const g = new THREE.Group(); g.name = 'map';
  g.add(mapPlane());
  MAPS.group = g;
  const A = MAPS.anchors;
  A.center = mapLL(-20, 0); A.mauritania = mapLL(-10.6, 20.2); A.nkc = mapLL(-15.97, 18.08); A.tonga = mapLL(-175.2, -21.14); A.fiji = mapLL(178.44 - 360, -18.14);
  A.sat = mapLL(MAP_SAT_LL[0], MAP_SAT_LL[1], MAP_SAT_Y);
  // los cables llegan por fetch (JSON): la carga se suma a las texturas pendientes
  let ok; PENDING.push(new Promise(a => { ok = a; }));
  fetch(ASSET + 'map/cables.json').then(r => r.json()).then(J => {
    const cab = mapCables(J); g.add(cab); g.add(MAPS.sparkPts = mapSparks()); MAPS.cabMesh = cab;
    ['Sines', 'Funchal', 'Praia', 'Fortaleza'].forEach((n, i) => { const p = J.stops[n]; A['ella' + i] = mapLL(p[0], p[1]); });
    ok();
  }).catch(e => { console.error('ERROR cables ' + e); ok(); });
  const sat = MAPS.sat = mapSatellite(); sat.position.copy(A.sat); g.add(sat);
  sat.userData.beam.scale.set(MAP_SAT_R, MAP_SAT_Y, MAP_SAT_R); sat.userData.foot.scale.setScalar(MAP_SAT_R * 2); sat.userData.foot.position.y = -MAP_SAT_Y + 0.2;
  g.userData.anchors = A;
  return g;
}

function mapAt(t, o = {}) {
  const u = MAPS.u, cu = MAPS.cu, su = MAPS.su;
  if (u) { u.uLights.value = o.lights ?? 1; u.uMauL.value = o.mauLights ?? 1; u.uTonL.value = o.tonLights ?? 1; u.uMauNet.value = o.mauritania ?? 1; u.uTonNet.value = o.tonga ?? 1; u.uTime.value = t; }
  if (cu) { cu.uDraw.value = o.draw ?? 1; cu.uGlow.value = o.glow ?? 1; cu.uElla.value = o.ella ?? -1; cu.uEllaHi.value = o.ellaHi ?? 1;
    cu.uBreaks.value = o.breaks ?? 0; cu.uAce.value = o.ace ?? 0; cu.uTonCut.value = o.tongaCut ?? 0; cu.uTime.value = t; }
  if (su) { su.uBreaks.value = o.breaks ?? 0; su.uAce.value = o.ace ?? 0; su.uTonCut.value = o.tongaCut ?? 0; su.uTime.value = t; }
  const S2 = MAPS.sat; if (S2) { const k = o.sat ?? 1; S2.visible = k > 0.002; const d = S2.userData;
    d.s.position.y = Math.sin(t * 0.9) * 0.6; d.s.rotation.y = 0.5 + Math.sin(t * 0.3) * 0.15; d.s.rotation.z = Math.sin(t * 0.7) * 0.05;
    d.s.scale.setScalar(2.6 * Math.max(0.001, eo(clamp(k)))); d.beamM.opacity = k; d.footM.opacity = k; d.blink.visible = (t * 1.2) % 1 < 0.15; }
}
// ---------------------------------------------------------------- la franja del Atlántico en corte (el acuario largo de la maqueta): el fondo del mar (arena en la costa,
// sedimento en lo hondo, la dorsal), las capas de roca en el corte, el agua (láminas de color por profundidad), la superficie con olas y brillo
// (vista desde abajo, un techo de luz), el cristal y su marco, el cable del mensaje (con su pulso de luz) y el otro cable, y la nieve marina.
// Marco de la franja (05_world.js): x de Brasil (0) a Portugal (SL), y desde el mapa (0) hasta el mar (SEA), z ∈ [−SW/2, SW/2].
const SLB = { U: [] };
function slbXs(step = 2) { const xs = []; for (let x = 0; x < 60; x += 0.5) xs.push(x); for (let x = 60; x < SL - 50; x += step) xs.push(x); for (let x = SL - 50; x < SL; x += 0.5) xs.push(x); xs.push(SL); return xs; }
// luz del sol en el agua (cáusticas): se suma a lo iluminado del fondo poco hondo
const SLB_CAUST = `float slbCaust(vec2 p, float t){ vec2 i = p; float c = 1.0; for (int n = 0; n < 4; n++) { float tt = t * (1.0 - (3.5 / float(n + 1)));
  i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x)); c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005))); }
  c /= 4.0; c = 1.17 - pow(c, 1.4); return pow(abs(c), 8.0); }`;
function slbSeabed() {
  const xs = slbXs(2), zs = []; for (let z = -SW / 2; z <= SW / 2 + 1e-6; z += 1) zs.push(z);
  const nx = xs.length, nz = zs.length, P = new Float32Array(nx * nz * 3), C = new Float32Array(nx * nz * 3), U = new Float32Array(nx * nz * 2), D = new Float32Array(nx * nz), I = [];
  const sand = new THREE.Color(0xd2c4a0), mud = new THREE.Color(0x857d70), deep = new THREE.Color(0x4c4f5a), rock = new THREE.Color(0x3e3936), c = new THREE.Color();
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = xs[i], z = zs[j], y = seabedY(x, z), k = i * nz + j, d = seaDepth(x);
    P[k * 3] = x; P[k * 3 + 1] = y; P[k * 3 + 2] = z; U[k * 2] = x / 3; U[k * 2 + 1] = z / 3; D[k] = d;
    const sl = Math.abs(seaDepth(x + 1) - seaDepth(Math.max(0, x - 1))) / 2, n = hash(Math.floor(x * 1.3) * 7.1 + j * 3.3) * 0.08;
    c.copy(sand).lerp(mud, _sm(4, 14, d)).lerp(deep, _sm(18, 30, d)).lerp(rock, clamp(sl * 1.6) * 0.8 + (x > SL * 0.45 && x < SL * 0.67 ? 0.35 * _sm(14, 24, 33 - d) : 0));
    c.offsetHSL(0, 0, n - 0.04); C[k * 3] = c.r; C[k * 3 + 1] = c.g; C[k * 3 + 2] = c.b;
    if (i && j) { const a = (i - 1) * nz + j - 1, b = i * nz + j - 1; I.push(a, a + 1, b, b, a + 1, b + 1); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(U, 2)); geo.setAttribute('depth', new THREE.BufferAttribute(D, 1)); geo.setIndex(I); geo.computeVertexNormals();
  const grain = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 26000; i++) { const v = 90 + hash(i * 1.7) * 90 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(hash(i * 3.1) * w, hash(i * 5.3) * h, 1 + hash(i) * 1.5, 1 + hash(i * 2) * 1.5); }
    for (let r = 0; r < 40; r++) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, r / 40 * h + 5 * Math.sin(x / w * Math.PI * 6 + r)); g.stroke(); } });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.colorSpace = THREE.NoColorSpace;
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, bumpMap: grain, bumpScale: 0.6 });
  const uT = { value: 0 }, uC = { value: 1 }; SLB.U.push(uT);
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.uniforms.uC = uC;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float depth; varying float vDep; varying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvDep = depth; vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT, uC; varying float vDep; varying vec3 vWp;\n' + SLB_CAUST)
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n{ float ck = uC * (1.0 - smoothstep(3.0, 12.0, vDep)) * smoothstep(0.2, 1.2, vDep); reflectedLight.directDiffuse += diffuseColor.rgb * min(slbCaust(vWp.xz * 1.6, uT * 0.5), 1.5) * ck * 0.8; }'); };
  const mesh = new THREE.Mesh(geo, m); mesh.receiveShadow = true; SLB.bedMat = m; SLB.caust = uC; return mesh;
}
// el agua vista desde fuera: láminas de color (más clara arriba, azul marino abajo) a varias profundidades del corte
function slbWaterSlices() {
  const g = new THREE.Group(), xs = slbXs(3);
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    uniforms: { top: { value: new THREE.Color(0x1aa3c4) }, mid: { value: new THREE.Color(0x0b5d86) }, bot: { value: new THREE.Color(0x05203f) }, op: { value: 0.16 } },
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
attribute float dep; varying float vD; varying float vY; void main(){ vD = dep; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 top, mid, bot; uniform float op; varying float vD; varying float vY;
void main(){
#include <logdepthbuf_fragment>
  float k = clamp((${SEA.toFixed(1)} - vY) / 30.0, 0.0, 1.0); vec3 c = k < 0.35 ? mix(top, mid, k / 0.35) : mix(mid, bot, (k - 0.35) / 0.65);
  gl_FragColor = vec4(c, op * (0.75 + 0.5 * k)); }` });
  for (const z of [18.5, 13, 9, 1, -9, -15, -19]) {
    const P = [], A = [], I = []; xs.forEach((x, i) => { const yb = seabedY(x, z); P.push(x, yb, 0, x, SEA, 0); A.push(SEA - yb, 0); if (i) { const k = i * 2; I.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('dep', new THREE.Float32BufferAttribute(A, 1)); geo.setIndex(I);
    const m = new THREE.Mesh(geo, mat); m.position.z = z; m.renderOrder = 1; g.add(m);
  }
  SLB.sliceMat = mat; return g;
}
// la superficie del mar: azul con brillo (reflejos del cielo), clara y transparente donde hay poca agua, espuma en la orilla; vista desde abajo, un techo de luz
function slbSurface() {
  const xs = slbXs(2.5), zs = []; for (let z = -SW / 2; z <= SW / 2 + 1e-6; z += 2) zs.push(z);
  const nx = xs.length, nz = zs.length, P = [], D = [], UV = [], I = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { P.push(xs[i], SEA, zs[j]); D.push(seaDepth(xs[i])); UV.push(xs[i] / 9, zs[j] / 9); if (i && j) { const a = (i - 1) * nz + j - 1, b = i * nz + j - 1; I.push(a, a + 1, b, b, a + 1, b + 1); } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('depth', new THREE.Float32BufferAttribute(D, 1)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setIndex(I); geo.computeVertexNormals();
  const nrm = canvasTex(512, 512, (g, w, h) => {      // olitas (mapa de normales): suma de ondas que se repite
    const img = g.createImageData(w, h), d = img.data, W2 = [];
    for (let i = 0; i < 26; i++) { const f = 2 + Math.floor(Math.pow(hash(i * 3.7), 1.5) * 28), a = hash(i * 5.1) * Math.PI * 2; W2.push([Math.round(Math.cos(a) * f), Math.round(Math.sin(a) * f), 1.6 / f, hash(i * 9.3) * 6.28]); }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let dx = 0, dy = 0; for (const [a, b, amp, ph] of W2) { const s = Math.cos((a * x / w + b * y / h) * Math.PI * 2 + ph) * amp; dx += s * a; dy += s * b; }
      const k = (y * w + x) * 4; d[k] = 128 + dx * 9; d[k + 1] = 128 + dy * 9; d[k + 2] = 255; d[k + 3] = 255; }
    g.putImageData(img, 0, 0); });
  nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping; nrm.colorSpace = THREE.NoColorSpace;
  const m = new THREE.MeshPhysicalMaterial({ color: 0x0a4c6e, roughness: 0.22, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25, normalMap: nrm, normalScale: new THREE.Vector2(0.55, 0.55),
    transparent: true, opacity: 0.9, side: THREE.DoubleSide, envMapIntensity: 1.2 });
  const uT = { value: 0 }; SLB.U.push(uT);
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float depth; varying float vDep; varying vec3 vWp2;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvDep = depth; vWp2 = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT; varying float vDep; varying vec3 vWp2;')
      .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;', 'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0; vec3 mapN2 = texture2D( normalMap, vNormalMapUv * 2.71 + vec2(0.37, 0.61) + vec2(-uT * 0.019, uT * 0.013) ).xyz * 2.0 - 1.0; vec3 mapN3 = texture2D( normalMap, vNormalMapUv * 0.31 + vec2(uT * 0.004, -uT * 0.003) ).xyz * 2.0 - 1.0; mapN = vec3(mapN.xy * 0.5 + mapN2.xy * 0.35 + mapN3.xy * 0.6, 1.0);'))
      .replace('#include <color_fragment>', `#include <color_fragment>
        float sh0 = 1.0 - smoothstep(0.2, 6.0, vDep);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.62, 0.66), sh0 * 0.85);
        diffuseColor.a *= mix(1.0, 0.45, sh0);
        float fo = (1.0 - smoothstep(0.0, 1.6, vDep)) * smoothstep(0.55, 0.95, sin(vDep * 9.0 + uT * 2.2) * 0.5 + 0.5 + 0.25 * sin(vWp2.x * 3.1 + vWp2.z * 2.3));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95), fo * 0.85); diffuseColor.a = mix(diffuseColor.a, 1.0, fo);`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (!gl_FrontFacing) { float r = 0.5 + 0.5 * sin(vWp2.x * 1.7 + uT * 1.3) * sin(vWp2.z * 1.9 - uT * 1.1); vec3 c = mix(vec3(0.32, 0.72, 0.82), vec3(0.85, 0.98, 1.0), r * r);
          #ifdef USE_FOG
          float fd = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth); c = mix(c, fogColor, fd * 0.85);
          #endif
          gl_FragColor = vec4(c, 0.92); }`); };
  const mesh = new THREE.Mesh(geo, m); mesh.renderOrder = 3; SLB.surfMat = m; SLB.surfN = nrm; return mesh;
}
// el cristal (casi invisible; brilla en los bordes) y el marco oscuro de la maqueta
function slbGlass() {
  const g = new THREE.Group(), xs = slbXs(4);
  const gm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.FrontSide, fog: false, uniforms: { tint: { value: new THREE.Color(0xbfe9ff) }, op: { value: 1 } },
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 tint; uniform float op; varying vec3 vN; varying vec3 vV;
void main(){
#include <logdepthbuf_fragment>
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 4.0); gl_FragColor = vec4(tint, (0.035 + 0.45 * f) * op); }` });
  for (const z of [SW / 2, -SW / 2]) {
    const P = [], I = []; xs.forEach((x, i) => { P.push(x, seabedY(x, z) - 0.3, z, x, SEA + 0.6, z); if (i) { const k = i * 2; I.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(z > 0 ? I : I.map((v, i) => I[i - (i % 3) + 2 - (i % 3)])); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, gm); m.renderOrder = 4; g.add(m);
  }
  // marco: un perfil oscuro arriba a cada lado (y abajo, donde el cristal toca la roca)
  const fm = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.35, metalness: 0.6 });
  for (const z of [SW / 2, -SW / 2]) { const top = new THREE.Mesh(new THREE.BoxGeometry(SL, 0.35, 0.35), fm); top.position.set(SL / 2, SEA + 0.6, z); top.castShadow = true; g.add(top);
    const pts = xs.map(x => v3(x, seabedY(x, z) - 0.3, z)); const bot = tube(pts, 0.14, fm, pts.length * 2, false, 6); g.add(bot); }
  SLB.glassMat = gm; return g;
}
// cables: tubo con grosor variable (fino en la costa, más grueso en lo hondo, para que se vea desde lejos) y luz: flujo de datos tenue + el pulso del mensaje
function slbCablePath(z, x0 = 0, x1 = SL) { const pts = []; for (const x of slbXs(2)) if (x >= x0 && x <= x1) pts.push(v3(x, seabedY(x, z) + Math.min(0.05, seaDepth(x) * 0.02), z)); return pts; }
function cableGeo(pts, rad, rs = 10) {
  const n = pts.length, P = [], N = [], UV = [], I = [], L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1])); const tot = L[n - 1];
  const t = new THREE.Vector3(), b = new THREE.Vector3(), nn = new THREE.Vector3(), up = v3(0, 1, 0);
  for (let i = 0; i < n; i++) { t.copy(pts[Math.min(n - 1, i + 1)]).sub(pts[Math.max(0, i - 1)]).normalize(); b.crossVectors(t, up).normalize(); nn.crossVectors(b, t); const r = rad(L[i] / tot, pts[i]);
    for (let j = 0; j <= rs; j++) { const a = j / rs * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a); const dx = nn.x * cs + b.x * sn, dy = nn.y * cs + b.y * sn, dz = nn.z * cs + b.z * sn;
      P.push(pts[i].x + dx * r, pts[i].y + dy * r + r * 0.6, pts[i].z + dz * r); N.push(dx, dy, dz); UV.push(L[i] / tot, j / rs); }
    if (i) for (let j = 0; j < rs; j++) { const a = (i - 1) * (rs + 1) + j, c = i * (rs + 1) + j; I.push(a, a + 1, c, a + 1, c + 1, c); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I);
  g.userData = { L, tot }; return g;
}
function cableMat(o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: o.color ?? 0x1a1f26, roughness: 0.45, metalness: 0.2, emissive: COL.light, emissiveIntensity: 1 });
  m.defines = { USE_UV: '' };
  const u = { uT: { value: 0 }, uPos: { value: -1 }, uLen: { value: o.len ?? 0.012 }, uFlow: { value: o.flow ?? 0.35 }, uBase: { value: o.base ?? 0.35 }, uTot: { value: o.tot ?? 500 }, uPk: { value: 1 }, uRed: { value: 0 } };
  m.userData.u = u;
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT, uPos, uLen, uFlow, uBase, uTot, uPk, uRed;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float d = vUv.x - uPos; float pk = exp(-d * d / (uLen * uLen)) * 6.0 + (d < 0.0 && d > -uLen * 9.0 ? exp(d / (uLen * 3.0)) * 1.2 : 0.0);
        float fl = pow(0.5 + 0.5 * sin((vUv.x * uTot / 6.0 - uT * 1.6) * 6.2832), 6.0) * uFlow;
        float stripe = smoothstep(0.3, 0.0, abs(vUv.y - 0.25)) + smoothstep(0.3, 0.0, abs(vUv.y - 0.75));
        totalEmissiveRadiance = mix(emissive, vec3(1.0, 0.25, 0.15), uRed) * (uBase * (0.5 + stripe) + fl * stripe + pk * uPk * (0.7 + 0.3 * stripe));`); };
  return m;
}
// pulso de luz con halo (para el resplandor): un sprite que sigue el cable
function slbGlowSprite(col = COL.light, s = 1) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: new THREE.Color(col).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); sp.scale.setScalar(s); sp.renderOrder = 6; return sp; }
function pathAt(pts, L, u, out = new THREE.Vector3()) { const tot = L[L.length - 1], d = clamp(u) * tot; let i = 1; while (i < L.length - 1 && L[i] < d) i++; const k = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); return out.copy(pts[i - 1]).lerp(pts[i], clamp(k)); }
async function buildSlab() {
  const g = new THREE.Group(); inSlab(g); SLB.g = g;
  g.add(slbSeabed());
  // el corte: capas de roca bajo el fondo (delante y detrás)
  const xs = slbXs(2);
  for (const z of [SW / 2, -SW / 2]) g.add(strataFace(xs, x => seabedY(x, z) - SEA, z, { bot: -SEA, yOff: SEA, band: 0.5, bandCol: 0xb59a6a }));
  g.add(slbWaterSlices()); g.add(slbSurface()); g.add(slbGlass());
  // la base de la maqueta (zócalo negro) bajo todo
  const base = new THREE.Mesh(new THREE.BoxGeometry(SL + XB + XE + 6, 1.2, SW + 6), new THREE.MeshStandardMaterial({ color: 0x0d0f13, roughness: 0.4, metalness: 0.3 })); base.position.set((SL + XE - XB) / 2, 0.6, 0); base.receiveShadow = true; g.add(base);
  // el cable del mensaje (z = 6) y el otro (z = −5)
  const p1 = slbCablePath(CABLE_Z), g1 = cableGeo(p1, (u, p) => lerp(0.07, 0.32, _sm(6, 26, seaDepth(p.x)))), m1 = cableMat({ tot: g1.userData.tot });
  SLB.c1 = { pts: p1, L: g1.userData.L, mesh: new THREE.Mesh(g1, m1), m: m1 }; SLB.c1.mesh.castShadow = true; g.add(SLB.c1.mesh);
  const c2x0 = fnOf('incCable2') ? 44 : 0, p2 = slbCablePath(CABLE2_Z, c2x0), g2 = cableGeo(p2, (u, p) => lerp(0.055, 0.3, _sm(c2x0, c2x0 + 50, p.x) * _sm(6, 26, seaDepth(p.x)))), m2 = cableMat({ tot: g2.userData.tot, flow: 0.2, base: 0.22 });
  SLB.c2 = { pts: p2, L: g2.userData.L, mesh: new THREE.Mesh(g2, m2), m: m2 }; SLB.c2.mesh.castShadow = true; g.add(SLB.c2.mesh);
  SLB.pulse = slbGlowSprite(COL.light, 1.2); g.add(SLB.pulse);
  g.add(slbDecor());
  // nieve marina (deja estelas al moverse la cámara): mucha cerca de las costas, menos en medio
  const P = (x, y, z) => { const v = slabP(x, y, z); return [v.x, v.y, v.z]; };
  S.flow.push(flowCloud(5000, i => { const x = Math.pow(hash(i * 1.3), 1.6) * 70, z = -19 + hash(i * 2.7) * 38, yb = seabedY(x, z); return P(x, yb + hash(i * 3.9) * (SEA - yb), z); }, { size: 1.5, bright: 0.45, nearF: 0.3, farF: 0.02, drift: 0.15, seed: 7, col: 0xcff6ff }));
  S.flow.push(flowCloud(3000, i => { const x = SL - Math.pow(hash(i * 4.1), 1.6) * 60, z = -19 + hash(i * 5.3) * 38, yb = seabedY(x, z); return P(x, yb + hash(i * 6.7) * (SEA - yb), z); }, { size: 1.5, bright: 0.45, nearF: 0.3, farF: 0.02, drift: 0.15, seed: 8, col: 0xcff6ff }));
  S.flow.push(flowCloud(4000, i => { const x = 40 + hash(i * 7.7) * (SL - 80), z = -19 + hash(i * 8.9) * 38, yb = seabedY(x, z); return P(x, yb + hash(i * 9.1) * (SEA - yb), z); }, { size: 1.7, bright: 0.4, nearF: 1, farF: 0.008, drift: 0.4, seed: 9, col: 0xcff6ff }));
  envAll(g);
  return g;
}
// cada fotograma: tiempo del agua, olas, pulsos y si la cámara está bajo el agua (entonces: niebla azul, sin láminas ni cristal)
function slabAt(t, o = {}) {
  for (const u of SLB.U) u.value = t;
  SLB.surfN.offset.set(t * 0.012, t * 0.007);
  for (const c of [SLB.c1, SLB.c2]) c.m.userData.u.uT.value = t;
  const pu = o.pulse ?? -1, U1 = SLB.c1.m.userData.u; U1.uPos.value = pu; U1.uPk.value = o.pulseK ?? 1; U1.uFlow.value = o.flow ?? 0.35;
  SLB.pulse.visible = pu >= 0 && pu <= 1 && (o.pulseK ?? 1) > 0.01; if (SLB.pulse.visible) { pathAt(SLB.c1.pts, SLB.c1.L, pu, SLB.pulse.position); SLB.pulse.position.y += 0.25; SLB.pulse.updateMatrixWorld(); const dc = wpos(SLB.pulse).distanceTo(cam.position); SLB.pulse.scale.setScalar(clamp(dc * 0.045, 0.25, 9) * (o.pulseS ?? 1)); }
  const under = !!o.under; SLB.sliceMat.uniforms.op.value = under ? 0 : 0.16; SLB.glassMat.uniforms.op.value = under ? 0 : 1; slbDecorAt(t, under);
}
// ¿está un punto (en el mundo) dentro del agua de la franja? (para saber si la cámara va buceando)
function slabUnder(pw) { const p = pw.clone().applyMatrix4(new THREE.Matrix4().copy(SLAB_M).invert()); return p.x > 0 && p.x < SL && Math.abs(p.z) < SW / 2 && p.y < SEA && p.y > seabedY(p.x, p.z) - 1; }
function slabLocal(pw) { return pw.clone().applyMatrix4(new THREE.Matrix4().copy(SLAB_M).invert()); }
// ---------- vida en el fondo cerca de las costas: rocas, praderas de algas que se mecen, haces de luz bajo la superficie y bancos de peces
function slbDecor() {
  const g = new THREE.Group(), zones = [[3, 46], [SL - 46, SL - 3]], okZ = z => Math.abs(z - CABLE_Z) > 1.3 && Math.abs(z - CABLE2_Z) > 1.3;
  // rocas
  const rg = new THREE.IcosahedronGeometry(1, 3); { const p = rg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.18 * Math.sin(x * 3.1 + 1) * Math.sin(y * 2.3 + 2) + 0.12 * Math.sin(z * 4.7 + x * 1.3); p.setXYZ(i, x * k, y * k * 0.65, z * k); } rg.computeVertexNormals(); }
  const rocks = new THREE.InstancedMesh(rg, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), 700); let n = 0;
  for (let i = 0; i < 2600 && n < 700; i++) { const zn = zones[i % 2], x = zn[0] + hash(i * 3.3) * (zn[1] - zn[0]), z = -18.5 + hash(i * 5.9) * 37; if (!okZ(z) || seaDepth(x) < 1.2 || (z > 2 && z < 15)) continue;
    const s = 0.12 + Math.pow(hash(i * 7.1), 3) * 0.9; _o.position.set(x, seabedY(x, z) + s * 0.15, z); _o.rotation.set(hash(i) * 3, hash(i * 2) * 6.3, hash(i * 4) * 3); _o.scale.set(s, s * (0.6 + hash(i * 8) * 0.6), s); _o.updateMatrix(); rocks.setMatrixAt(n, _o.matrix);
    _c.setHSL(0.07 + hash(i * 9) * 0.12, 0.14 + hash(i * 11) * 0.2, 0.42 + hash(i * 13) * 0.2); rocks.setColorAt(n, _c); n++; }
  rocks.count = n; rocks.castShadow = true; rocks.receiveShadow = true; g.add(rocks);
  // algas: hojas finas en manojos (se mecen con la corriente)
  const bl = new THREE.PlaneGeometry(0.09, 1, 1, 6); bl.translate(0, 0.5, 0); { const p = bl.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 0.8)); } }
  const sw = new THREE.MeshStandardMaterial({ color: 0x3f8f4e, roughness: 0.7, side: THREE.DoubleSide }); const uT = { value: 0 }; SLB.U.push(uT);
  sw.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>',
    '#include <begin_vertex>\nfloat ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.9; transformed.x += sin(uT * 1.6 + ph + position.y * 2.0) * position.y * position.y * 0.35; transformed.z += cos(uT * 1.3 + ph) * position.y * position.y * 0.2;'); };
  const weed = new THREE.InstancedMesh(bl, sw, 2600); n = 0;
  for (let c = 0; c < 140 && n < 2600; c++) { const zn = zones[c % 2], x0 = zn[0] + hash(c * 4.4) * (zn[1] - zn[0]), z0 = -18 + hash(c * 6.6) * 36, d0 = seaDepth(x0); if (d0 < 1.5 || d0 > 14 || !okZ(z0)) continue;
    for (let j = 0; j < 18 && n < 2600; j++) { const x = x0 + (hash(c * 31 + j) - 0.5) * 1.6, z = z0 + (hash(c * 37 + j * 3) - 0.5) * 1.6; if (!okZ(z)) continue; const h = 0.5 + hash(c * 41 + j) * 1.6;
      _o.position.set(x, seabedY(x, z) - 0.05, z); _o.rotation.set((hash(j * 3 + c) - 0.5) * 0.4, hash(j * 7 + c) * 6.3, (hash(j * 5 + c) - 0.5) * 0.4); _o.scale.set(1, h, 1); _o.updateMatrix(); weed.setMatrixAt(n, _o.matrix);
      _c.setHSL(0.27 + hash(c * 3 + j) * 0.1, 0.45, 0.25 + hash(c + j * 9) * 0.15); weed.setColorAt(n, _c); n++; } }
  weed.count = n; g.add(weed);
  // haces de luz bajo la superficie (solo se notan bajo el agua)
  const rayT = canvasTex(64, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const g2 = c.createLinearGradient(0, 0, w, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); c.globalCompositeOperation = 'destination-out'; c.fillStyle = g2; c.fillRect(0, 0, w, h); });
  SLB.rayMat = new THREE.MeshBasicMaterial({ map: rayT, color: 0x9fe6ff, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  for (let i = 0; i < 46; i++) { const zn = zones[i % 2], x = zn[0] + hash(i * 2.3) * (zn[1] - zn[0] - 10), z = -17 + hash(i * 4.7) * 34, d = Math.min(seaDepth(x), 12); if (d < 2) continue;
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.8 + hash(i) * 1.6, d * 1.3), SLB.rayMat); r.position.set(x + d * 0.25, SEA - d * 0.62, z); r.rotation.set(0, hash(i * 6.1) * 3.14, 0.32); r.renderOrder = 5; g.add(r); }
  // bancos de peces (pequeños, de colores, nadan en círculo)
  const fg = new THREE.ConeGeometry(0.07, 0.3, 6); fg.rotateZ(-Math.PI / 2); const tail = new THREE.ConeGeometry(0.06, 0.1, 4); tail.rotateZ(Math.PI / 2); tail.translate(-0.19, 0, 0);
  const fish = new THREE.InstancedMesh(mergeGeometries([fg, tail]), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.2 }), 180); fish.frustumCulled = false; g.add(fish);
  SLB.fish = { mesh: fish, schools: [[14, 4.5, 12, 3.0], [27, 6.0, -12, 3.5], [SL - 14, 4.0, 11, 2.6], [SL - 26, 6.5, -2, 3.2]] };
  for (let i = 0; i < 180; i++) { _c.setHSL([0.12, 0.55, 0.08, 0.6][i % 4] + hash(i) * 0.04, 0.8, 0.55); fish.setColorAt(i, _c); }
  return g;
}
function slbDecorAt(t, under) {
  SLB.rayMat.opacity = under ? 0.16 : 0.03;
  const F = SLB.fish; if (!F) return; const per = 45;
  for (let i = 0; i < 180; i++) { const s = F.schools[Math.floor(i / per)], j = i % per, a = t * 0.35 * (j % 2 ? 1 : 0.92) + j * 0.31 + hash(i) * 0.4, r = s[3] * (0.6 + 0.4 * hash(i * 3)), y = SEA - s[1] + Math.sin(a * 2 + j) * 0.4 + (hash(i * 5) - 0.5) * 0.8;
    _o.position.set(s[0] + Math.cos(a) * r, y, s[2] + Math.sin(a) * r * 0.6); _o.rotation.set(0, -a - Math.PI / 2 + Math.sin(t * 6 + j) * 0.15, 0); _o.scale.setScalar(0.8 + hash(i * 7) * 0.5); _o.updateMatrix(); F.mesh.setMatrixAt(i, _o.matrix); }
  F.mesh.instanceMatrix.needsUpdate = true;
}
// ---------------------------------------------------------------- 22 · LA PLAYA DE BRASIL al atardecer (prefijo bea): el móvil del hijo en la toalla
// Marco local (el de la viñeta): origen en la orilla (x = 0) en el centro de la franja, y = 0 nivel del mar; tierra en x ∈ [−40, 0], z ∈ [−20, 20].
// API: buildBeach() → Group (userData.anchors: phone, screenN, towel, manhole, shore, kiosk, palms) · beachAt(t, {screen, notif, buzz})
//      beaMsgPath(k) → {pos, scale}: camino de la burbuja msgBubble() desde el agua (x≈1, z = CABLE_Z) hasta meterse en la pantalla del móvil.
//      BEA_CAM0 = [px,py,pz, lx,ly,lz, fov] (marco local): el primer fotograma (el móvil de cerca con la notificación).
// El mar (x > 0) no está aquí. Ambiente: moodSet('brasil').

// ---------- el terreno: playa que sube suave, orilla mojada, dunas hacia dentro
function beaH(x, z) {
  const u = Math.max(0, -x);
  let y = 0.55 * (1 - Math.exp(-u / 2.6)) + 1.0 * _sm(9, 17, u) + 0.4 * _sm(21, 32, u);
  const dn = _sm(10, 16, u);
  y += dn * (0.3 * Math.sin(z * 0.23 + u * 0.31) * Math.sin(u * 0.17 - z * 0.11 + 1.3) + 0.12 * Math.sin(z * 0.57 - u * 0.4 + 0.7));
  y += _sm(2, 6, u) * (1 - dn) * 0.035 * Math.sin(z * 0.8 + u * 0.6);
  const dc = z - CABLE_Z; y -= 0.03 * Math.exp(-dc * dc / 0.06) * (1 - _sm(4.4, 5.0, u));          // la marca del cable en la arena (desde la orilla a la arqueta)
  const kx = x + 25, kz = z + 3; y = lerp(y, 1.62, Math.exp(-(kx * kx / 18 + kz * kz / 14)) * 0.9);   // explanada del chiringuito
  return y;
}
const BEA = { towel: [-7, 9], towelYaw: 0.12, man: [-5, CABLE_Z], kiosk: [-25, -3] };
// el móvil: en la toalla, boca arriba, con la parte de arriba hacia el mar (+x) y un poco girado
const BEA_PH = (() => { const [tx, tz] = BEA.towel, a = BEA.towelYaw, lx = 0.22, lz = 0.06;
  const x = tx + lx * Math.cos(a) + lz * Math.sin(a), z = tz - lx * Math.sin(a) + lz * Math.cos(a);
  return { x, z, yaw: -Math.PI / 2 + 0.22, y: beaH(x, z) + 0.0075 + 0.0043 }; })();
const BEA_SCREEN = new THREE.Vector3(BEA_PH.x, BEA_PH.y + 0.0045, BEA_PH.z);
// primer fotograma: cámara alta y algo oblicua desde tierra (mira hacia el mar), el móvil derecho en el cuadro
const BEA_CAM0 = (() => { const p = BEA_SCREEN, f = new THREE.Vector3(Math.cos(BEA_PH.yaw + Math.PI / 2), 0, -Math.sin(BEA_PH.yaw + Math.PI / 2));   // f = hacia dónde apunta la parte de arriba del móvil
  const c = p.clone().addScaledVector(f, -0.2).add(new THREE.Vector3(0, 0.27, 0)), l = p.clone().addScaledVector(f, 0.006);
  return [c.x, c.y, c.z, l.x, l.y, l.z, 34]; })();

function beaGrainTex() {
  const t = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#e9e4da'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const y0 = hash(i * 3.7) * h, a = 0.035 + hash(i * 1.9) * 0.03; g.strokeStyle = `rgba(120,95,60,${a})`; g.lineWidth = 6 + hash(i) * 10; g.beginPath();
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + 14 * Math.sin(x / w * Math.PI * 2 * 2 + i) + 6 * Math.sin(x / w * Math.PI * 2 * 5 + i * 2)); g.stroke(); }   // ondulitas del viento
    for (let i = 0; i < 60000; i++) { const x = hash(i * 1.13) * w, y = hash(i * 2.71) * h, r = 0.7 + hash(i * 3.9) * 1.8, k = hash(i * 5.3);
      g.fillStyle = k > 0.62 ? `rgba(255,252,240,${0.25 + 0.4 * hash(i * 7.1)})` : k > 0.2 ? `rgba(150,118,80,${0.12 + 0.2 * hash(i * 6.1)})` : `rgba(70,50,35,${0.15 + 0.2 * hash(i * 8.1)})`; g.fillRect(x, y, r, r); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function beaTerrain() {
  const X0 = -40, X1 = 0, Z0 = -20, Z1 = 20, NX = 200, NZ = 160, P = [], C = [], U = [], I = [];
  const dry = new THREE.Color(0xf6d9a2), wet = new THREE.Color(0xa8865e), dune = new THREE.Color(0xf2cf96), c = new THREE.Color();
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
    const x = lerp(X0, X1, i / NX), z = lerp(Z0, Z1, j / NZ), y = beaH(x, z), u = -x;
    P.push(x, y, z); U.push(x / 1.6, z / 1.6);
    c.copy(dry).lerp(dune, _sm(9, 16, u)); const wk = 1 - _sm(0.4, 2.6 + 0.3 * Math.sin(z * 0.7), u); c.lerp(wet, wk * 0.85);
    const dc = z - CABLE_Z; c.multiplyScalar(1 - 0.12 * Math.exp(-dc * dc / 0.08) * (1 - _sm(4.4, 5.0, u)));
    c.multiplyScalar(0.94 + 0.06 * hash(i * 13.1 + j * 7.7)); C.push(c.r, c.g, c.b);
    if (i && j) { const a = j * (NX + 1) + i, b = a - 1, d = a - (NX + 1), e = d - 1; I.push(e, b, d, d, b, a); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I); geo.computeVertexNormals();
  const gt = beaGrainTex();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: gt, bumpMap: gt, bumpScale: 0.6, roughness: 0.93, metalness: 0 }));
  m.receiveShadow = true; return m;
}
// la espuma que va y viene (una capa fina pegada a la arena, se desplaza su textura)
function beaSwash() {
  const X0 = -2.8, X1 = 0.0, NX = 36, NZ = 120, P = [], U = [], I = [];
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const x = lerp(X0, X1, i / NX), z = lerp(-20, 20, j / NZ); P.push(x, beaH(x, z) + 0.006, z); U.push(i / NX, z / 40 * 14);
    if (i && j) { const a = j * (NX + 1) + i, b = a - 1, d = a - (NX + 1), e = d - 1; I.push(e, b, d, d, b, a); } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I); geo.computeVertexNormals();
  const tex = canvasTex(1024, 1024, (g, w, h) => {
    const fx = v => w * 0.5 + 26 * Math.sin(v / h * Math.PI * 2 * 2) + 12 * Math.sin(v / h * Math.PI * 2 * 5 + 1) + 6 * Math.sin(v / h * Math.PI * 2 * 11);
    for (let v = 0; v < h; v += 2) { const x0 = fx(v); const gr = g.createLinearGradient(x0, 0, w, 0); gr.addColorStop(0, 'rgba(225,240,240,0.55)'); gr.addColorStop(0.08, 'rgba(150,200,205,0.32)'); gr.addColorStop(1, 'rgba(80,150,165,0.42)');
      g.fillStyle = gr; g.fillRect(x0, v, w - x0, 2); }
    for (let i = 0; i < 9000; i++) { const v = hash(i * 1.7) * h, d = Math.pow(hash(i * 2.3), 2.2) * 50, x = fx(v) + d - 3, r = 1.2 + hash(i * 3.1) * 3.2;   // la espuma: encaje blanco en el borde
      g.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * hash(i * 4.4)})`; g.beginPath(); g.arc(x, v, r, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 2500; i++) { const v = hash(i * 5.7) * h, x = fx(v) + 50 + hash(i * 6.3) * 380, r = 0.8 + hash(i * 7.9) * 2;                // restos de espuma detrás
      g.fillStyle = `rgba(255,255,255,${0.2 + 0.35 * hash(i * 8.2)})`; g.beginPath(); g.ellipse(x, v, r * 2.5, r, 0, 0, Math.PI * 2); g.fill(); }
  });
  tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.RepeatWrapping;
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.12, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.receiveShadow = true; m.renderOrder = 1; return m;
}

// ---------- la toalla (rayas de colores, algo de caída y arrugas, flecos)
function beaTowel() {
  const L = 1.8, Wd = 0.9, Lf = 1.9, g = new THREE.Group(), [cx, cz] = BEA.towel, a = BEA.towelYaw;
  const geo = new THREE.PlaneGeometry(Lf, Wd, 95, 45); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const lx = p.getX(i), lz = p.getZ(i), wx = cx + lx * Math.cos(a) + lz * Math.sin(a), wz = cz - lx * Math.sin(a) + lz * Math.cos(a);
    let y = beaH(wx, wz) + 0.006;
    y += 0.014 * Math.exp(-Math.pow((lx * 0.8 + lz * 0.6 + 0.62) / 0.05, 2)) * _sm(-0.45, 0.1, lz);        // arrugas suaves (lejos del móvil)
    y += 0.011 * Math.exp(-Math.pow((lx * 0.9 - lz * 0.4 + 0.45) / 0.04, 2)) * (1 - _sm(-0.1, 0.3, lz));
    y += 0.009 * Math.exp(-Math.pow((lx - 0.62) / 0.035, 2)) * _sm(0.05, 0.4, lz);
    y += 0.03 * _sm(-0.72, -0.95, lx) * (0.6 + 0.4 * Math.sin(lz * 9));                                     // el extremo de tierra algo enrollado
    y += 0.004 * Math.sin(lx * 23 + lz * 7) * Math.sin(lz * 17 - lx * 5);
    p.setXYZ(i, lx, y, lz); }
  geo.computeVertexNormals();
  const tex = canvasTex(2048, 1024, (c, w, h) => {
    const fr = w * (Lf - L) / Lf / 2, cols = ['#13b5c7', '#fff4e0', '#ffcf2e', '#ff5a5f', '#fff4e0', '#1f5fbf', '#3ccf6e', '#fff4e0', '#ffcf2e', '#ff8a3d', '#13b5c7'];
    const sw = (w - 2 * fr) / cols.length;
    cols.forEach((cl, k) => { c.fillStyle = cl; c.fillRect(fr + k * sw, 0, sw + 1, h); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(fr + k * sw + sw * 0.08, 0, sw * 0.04, h); });
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(fr, h * 0.06, w - 2 * fr, h * 0.02); c.fillRect(fr, h * 0.92, w - 2 * fr, h * 0.02);
    for (let i = 0; i < 90000; i++) { const x = fr + hash(i * 1.3) * (w - 2 * fr), y = hash(i * 2.9) * h; c.fillStyle = hash(i * 4.1) > 0.5 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.10)'; c.fillRect(x, y, 2, 2); }   // rizo del algodón
    for (const s of [0, 1]) for (let y = 4; y < h; y += 14) { c.strokeStyle = '#fff1dc'; c.lineWidth = 6; c.beginPath(); const x0 = s ? w - fr : fr, x1 = s ? w - 4 - hash(y) * 14 : 4 + hash(y) * 14;   // flecos
      c.moveTo(x0, y); c.quadraticCurveTo((x0 + x1) / 2, y + 6 * Math.sin(y), x1, y + 3); c.stroke(); }
  });
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.97, metalness: 0, side: THREE.DoubleSide, alphaTest: 0.5 }));
  tex.colorSpace = THREE.SRGBColorSpace; m.receiveShadow = true; m.castShadow = true;
  g.position.set(cx, 0, cz); g.rotation.y = a; g.add(m); return g;
}

// ---------- el móvil (boca arriba; pantalla de bloqueo + la notificación de «Mamá»)
const BEA_SW = 0.0692, BEA_SH = 0.1532, BEA_TW = 1024, BEA_TH = Math.round(1024 * BEA_SH / BEA_SW);
function beaIcon(c, x, y, r) {       // icono genérico: círculo verde con un bocadillo blanco (sin logos)
  const gr = c.createLinearGradient(0, y - r, 0, y + r); gr.addColorStop(0, '#5ee47f'); gr.addColorStop(1, '#22b552'); c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y - r * 0.05, r * 0.52, r * 0.42, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(x - r * 0.32, y + r * 0.22); c.lineTo(x - r * 0.42, y + r * 0.52); c.lineTo(x - r * 0.05, y + r * 0.33); c.fill();
}
function beaLockTex() {
  return canvasTex(BEA_TW, BEA_TH, (c, w, h) => {
    // fondo: atardecer suave sobre el mar
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a2c6e'); gr.addColorStop(0.3, '#7d4a9a'); gr.addColorStop(0.52, '#ee7a6a'); gr.addColorStop(0.64, '#ffb978'); gr.addColorStop(0.66, '#f39a6c'); gr.addColorStop(0.8, '#5a4c86'); gr.addColorStop(1, '#2a2a5c');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const sy = h * 0.6; let rg = c.createRadialGradient(w * 0.5, sy, 0, w * 0.5, sy, w * 0.75); rg.addColorStop(0, 'rgba(255,214,150,.9)'); rg.addColorStop(0.18, 'rgba(255,190,130,.45)'); rg.addColorStop(1, 'rgba(255,160,120,0)');
    c.fillStyle = rg; c.fillRect(0, 0, w, h);
    c.save(); c.beginPath(); c.rect(0, 0, w, h * 0.65); c.clip(); c.fillStyle = '#ffe2a8'; c.beginPath(); c.arc(w * 0.5, sy + 30, 120, 0, Math.PI * 2); c.fill(); c.restore();
    for (let i = 0; i < 26; i++) { const y = h * 0.655 + i * i * 0.9 + i * 8, ww = (220 - i * 6) * (0.6 + 0.4 * hash(i)); c.fillStyle = `rgba(255,205,140,${0.5 - i * 0.017})`; c.fillRect(w * 0.5 - ww / 2 + (hash(i * 3) - 0.5) * 40, y, ww, 4 + i * 0.3); }
    c.fillStyle = 'rgba(30,20,50,.55)'; c.beginPath(); c.moveTo(0, h * 0.62); c.quadraticCurveTo(w * 0.15, h * 0.6, w * 0.3, h * 0.655); c.lineTo(0, h * 0.66); c.fill();   // un cabo lejano
    // la barra de estado
    c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) c.fillRect(w - 250 + i * 22, 78 - i * 9, 14, 18 + i * 9);
    c.strokeStyle = '#fff'; c.lineWidth = 4; rr(c, w - 150, 50, 82, 40, 11); c.stroke(); c.fillRect(w - 143, 57, 58, 26); c.fillRect(w - 64, 63, 6, 14);
    c.fillStyle = '#000'; rr(c, w / 2 - 175, 34, 350, 100, 50); c.fill();                         // la isla de la cámara
    // candado, fecha y hora
    c.fillStyle = 'rgba(255,255,255,.95)'; c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 9; rr(c, w / 2 - 30, 222, 60, 46, 9); c.fill(); c.beginPath(); c.arc(w / 2, 222, 20, Math.PI, 0); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.shadowColor = 'rgba(40,20,60,.35)'; c.shadowBlur = 18;
    c.font = '600 64px Inter'; c.fillText('lunes, 16 de noviembre', w / 2, 380);
    c.font = '700 300px Inter'; c.fillText('18:47', w / 2, 660); c.shadowBlur = 0;
    // abajo: linterna y cámara, y la raya de inicio
    for (const s of [-1, 1]) { const x = w / 2 + s * 360, y = h - 250; c.fillStyle = 'rgba(30,25,45,.45)'; c.beginPath(); c.arc(x, y, 78, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff';
      if (s < 0) { rr(c, x - 16, y - 40, 32, 80, 8); c.fill(); c.fillStyle = 'rgba(30,25,45,.8)'; c.fillRect(x - 6, y - 14, 12, 12); }
      else { rr(c, x - 38, y - 24, 76, 52, 10); c.fill(); c.fillRect(x - 14, y - 34, 28, 12); c.fillStyle = 'rgba(30,25,45,.8)'; c.beginPath(); c.arc(x, y + 2, 15, 0, Math.PI * 2); c.fill(); } }
    c.fillStyle = 'rgba(255,255,255,.9)'; rr(c, w / 2 - 190, h - 52, 380, 14, 7); c.fill();
  });
}
const BEA_CARD = { y0: 750, h: 300 };
function beaCardTex() {
  return canvasTex(BEA_TW, BEA_CARD.h + 40, (c, w, h) => {
    const x0 = 34, y0 = 20, cw = w - 68, ch = BEA_CARD.h;
    c.shadowColor = 'rgba(30,10,40,.35)'; c.shadowBlur = 24; c.shadowOffsetY = 6; c.fillStyle = 'rgba(250,246,248,.86)'; rr(c, x0, y0, cw, ch, 62); c.fill(); c.shadowColor = 'transparent';
    beaIcon(c, x0 + 104, y0 + ch / 2, 64);
    c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.fillStyle = '#121216'; c.font = '800 74px Inter'; c.fillText('Mamá', x0 + 200, y0 + 122);
    c.textAlign = 'right'; c.fillStyle = '#6e6a74'; c.font = '500 52px Inter'; c.fillText('ahora', x0 + cw - 44, y0 + 116);
    c.textAlign = 'left'; c.fillStyle = '#1c1c22'; c.font = '500 70px Inter'; c.fillText('Hijo, ¿dónde estás?', x0 + 200, y0 + 226);
  });
}
function beaRRGeo(w, h, r) { const g = new THREE.ShapeGeometry(rrShape(w, h, r), 10), p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5); return g; }
function beaPhone() {
  const outer = new THREE.Group(), inner = new THREE.Group(); outer.add(inner); inner.rotation.x = -Math.PI / 2;     // inner: XY = pantalla, +z = hacia arriba
  const PW = 0.0752, PH = 0.1605, PD = 0.0086;
  const frameM = new THREE.MeshPhysicalMaterial({ color: 0x3a3f4a, roughness: 0.28, metalness: 0.85, clearcoat: 0.6 });
  const body = rbox(PW, PH, PD, frameM, 0.0115); inner.add(body);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: 0.05, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02 });
  const glass = new THREE.Mesh(beaRRGeo(PW - 0.0016, PH - 0.0016, 0.0105), glassM); glass.position.z = PD / 2 + 0.0002; glass.receiveShadow = true; inner.add(glass);
  const scrM = new THREE.MeshBasicMaterial({ map: beaLockTex(), toneMapped: false });
  const scr = new THREE.Mesh(beaRRGeo(BEA_SW, BEA_SH, 0.0088), scrM); scr.position.z = PD / 2 + 0.0004; inner.add(scr);
  const cardTex = beaCardTex(), ch = BEA_SW * cardTex.image.height / BEA_TW;
  const cardM = new THREE.MeshBasicMaterial({ map: cardTex, transparent: true, depthWrite: false, toneMapped: false });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(BEA_SW, ch), cardM); card.renderOrder = 2;
  const cardY = (0.5 - (BEA_CARD.y0 + 20 + BEA_CARD.h / 2) / BEA_TH) * BEA_SH; card.position.set(0, cardY, PD / 2 + 0.0006); inner.add(card);
  const shine = new THREE.Mesh(beaRRGeo(BEA_SW, BEA_SH, 0.0088), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    map: canvasTex(256, 512, (c, w, h) => { const g = c.createLinearGradient(0, h * 0.15, w, h * 0.55); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.42, 'rgba(255,236,215,0)'); g.addColorStop(0.5, 'rgba(255,236,215,.22)');
      g.addColorStop(0.62, 'rgba(255,236,215,.06)'); g.addColorStop(0.7, 'rgba(255,236,215,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }) }));
  shine.position.z = PD / 2 + 0.0008; shine.renderOrder = 3; inner.add(shine);
  for (const [y, l, s] of [[0.03, 0.022, 1], [0.0, 0.012, -1], [-0.018, 0.012, -1]]) { const b = rbox(0.0016, l, 0.0028, frameM, 0.0007); b.position.set(s * (PW / 2 + 0.0004), y, 0); inner.add(b); }   // botones
  const glow = new THREE.PointLight(0xffe2cf, 0, 0.6, 2); glow.position.set(0, 0, 0.05); inner.add(glow);
  outer.position.set(BEA_PH.x, BEA_PH.y, BEA_PH.z); outer.rotation.y = BEA_PH.yaw;
  outer.userData = { inner, scrM, card, cardM, cardY, shine, glow, glass }; return outer;
}

// ---------- cosas de playa
function beaFlipFlop(col, strapCol) {
  const g = new THREE.Group(), s = new THREE.Shape(), N = 40;
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, y = Math.sin(a), wdt = 0.043 * (1 + 0.22 * y) * (0.82 + 0.18 * Math.cos(2 * a) ** 2), x = Math.cos(a) * wdt - 0.008 * y * y; const yy = y * 0.125;
    i ? s.lineTo(x, yy) : s.moveTo(x, yy); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 8 }); geo.rotateX(-Math.PI / 2);
  const sole = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.55, clearcoat: 0.3 })); sole.castShadow = sole.receiveShadow = true; sole.position.y = 0.004; g.add(sole);
  const top = new THREE.Mesh(new THREE.ShapeGeometry(s, 12), new THREE.MeshStandardMaterial({ color: 0xfff3e2, roughness: 0.7 })); top.rotation.x = -Math.PI / 2; top.position.y = 0.0205; top.scale.setScalar(0.9); top.receiveShadow = true; g.add(top);
  const sm = new THREE.MeshPhysicalMaterial({ color: strapCol, roughness: 0.4, clearcoat: 0.5 });
  const toe = v3(0, 0.021, -0.075);
  for (const sd of [-1, 1]) g.add(tube([toe, v3(sd * 0.022, 0.042, -0.05), v3(sd * 0.04, 0.038, -0.012), v3(sd * 0.044, 0.021, 0.008)], 0.0055, sm, 20, false, 8));
  const knob = sph(0.007, sm); knob.position.copy(toe).setY(0.026); g.add(knob);
  return g;
}
function beaSunglasses() {
  const g = new THREE.Group(), fm = new THREE.MeshPhysicalMaterial({ color: 0x1b1414, roughness: 0.25, clearcoat: 1 });
  const lm = new THREE.MeshPhysicalMaterial({ color: 0x2a1a10, roughness: 0.03, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.2 });
  for (const s of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.026, 32), lm); lens.scale.set(1.15, 0.95, 1); lens.position.set(s * 0.034, 0.03, 0); lens.rotation.x = -1.15; g.add(lens);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0028, 8, 40), fm); rim.scale.set(1.15, 0.95, 1); rim.position.copy(lens.position); rim.rotation.copy(lens.rotation); rim.castShadow = true; g.add(rim);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.003, 0.11), fm); arm.position.set(s * 0.058, 0.004, -0.045); arm.rotation.y = s * 0.55; arm.castShadow = true; g.add(arm);
  }
  g.add(bar(v3(-0.008, 0.042, -0.008), v3(0.008, 0.042, -0.008), 0.0025, fm));
  return g;
}
function beaCoconut() {
  const g = new THREE.Group(), hm = new THREE.MeshStandardMaterial({ color: 0x7fa83a, roughness: 0.6 });
  const n = lathe([[0.0001, 0], [0.05, 0.006], [0.085, 0.04], [0.095, 0.08], [0.085, 0.125], [0.055, 0.155], [0.045, 0.158]], 40, hm); g.add(n);
  const cut = new THREE.Mesh(new THREE.CircleGeometry(0.046, 32), new THREE.MeshStandardMaterial({ color: 0xf1ead2, roughness: 0.8 })); cut.rotation.x = -Math.PI / 2; cut.position.y = 0.1585; g.add(cut);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.012, 20), new THREE.MeshStandardMaterial({ color: 0x3a3020 })); hole.rotation.x = -Math.PI / 2; hole.position.set(0.006, 0.159, 0); g.add(hole);
  const st = canvasTex(64, 256, (c, w, h) => { for (let y = 0; y < h; y += 32) { c.fillStyle = '#ff4f7a'; c.fillRect(0, y, w, 16); c.fillStyle = '#fff6ee'; c.fillRect(0, y + 16, w, 16); } }); st.wrapS = st.wrapT = THREE.RepeatWrapping;
  g.add(tube([v3(0.006, 0.1, 0), v3(0.01, 0.2, 0.004), v3(0.02, 0.255, 0.01), v3(0.05, 0.275, 0.02)], 0.0045, new THREE.MeshPhysicalMaterial({ map: st, roughness: 0.3, clearcoat: 0.6 }), 30, false, 10));
  const fl = new THREE.Mesh(new THREE.CircleGeometry(0.03, 6), new THREE.MeshStandardMaterial({ color: 0xff7aa8, side: THREE.DoubleSide, roughness: 0.6 })); fl.position.set(-0.03, 0.165, 0.02); fl.rotation.set(-1.2, 0, 0.4); g.add(fl);   // una florecita
  const fc = sph(0.008, new THREE.MeshStandardMaterial({ color: 0xffd23f })); fc.position.set(-0.03, 0.17, 0.022); g.add(fc);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g;
}
function beaUmbrella() {
  const g = new THREE.Group(), H = 2.15, R = 1.05, pm = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.35, metalness: 0.4 });
  const pole = cyl(0.018, 0.018, H + 0.35, pm, 12); pole.position.y = (H + 0.35) / 2 - 0.35; g.add(pole);
  const cols = [0xff6a4d, 0xfff4e4, 0x16b3c4, 0xfff4e4]; const N = 8;
  for (let i = 0; i < N; i++) { const geo = new THREE.ConeGeometry(R, 0.42, 6, 4, true, i / N * Math.PI * 2, Math.PI * 2 / N), p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k), r = Math.hypot(x, z) / R, a = Math.atan2(z, x) - i / N * Math.PI * 2; p.setY(k, p.getY(k) - 0.06 * r * r - 0.05 * r * Math.pow(Math.sin(a * N / 2 - Math.PI / 2 + Math.PI / 2), 2) * 0); }
    geo.computeVertexNormals(); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cols[i % 4], roughness: 0.75, side: THREE.DoubleSide })); m.position.y = H; m.castShadow = true; m.receiveShadow = true; g.add(m); }
  const top = sph(0.035, pm); top.position.y = H + 0.23; g.add(top);
  for (let i = 0; i < N; i++) { const a = (i + 0.5) / N * Math.PI * 2; g.add(bar(v3(0, H - 0.25, 0), v3(Math.sin(a) * R * 0.62, H - 0.03, Math.cos(a) * R * 0.62), 0.004, pm, 4)); }
  return g;
}
// palmera de maqueta: tronco anillado y curvo, hojas arqueadas con foliolos, cocos
let _beaFrondT = null;
function beaFrondTex() {
  if (_beaFrondT) return _beaFrondT;
  _beaFrondT = canvasTex(256, 1024, (c, w, h) => {
    for (let i = 0; i < 70; i++) { const y = i / 70 * h, len = w * 0.5 * Math.sin(Math.PI * Math.pow(y / h, 0.75)) * 0.98 + 6;
      const col = `hsl(${92 + 14 * hash(i)}, ${48 + 10 * hash(i * 3)}%, ${30 + 10 * hash(i * 5) + 10 * (y / h)}%)`; c.fillStyle = col;
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(w / 2, y); c.quadraticCurveTo(w / 2 + s * len * 0.6, y + 2, w / 2 + s * len, y + 26 + 14 * (1 - y / h)); c.lineTo(w / 2 + s * len * 0.98, y + 31 + 14 * (1 - y / h)); c.quadraticCurveTo(w / 2 + s * len * 0.5, y + 14, w / 2, y + 12); c.fill(); } }
    c.fillStyle = '#c9b56a'; c.fillRect(w / 2 - 4, 0, 8, h);
  });
  return _beaFrondT;
}
function beaPalm(h, lean, seed) {
  const g = new THREE.Group(), pts = [];
  for (let i = 0; i <= 10; i++) { const s = i / 10; pts.push(v3(lean * h * (0.55 * s * s + 0.15 * s) + 0.15 * Math.sin(s * 3 + seed), s * h, 0.12 * Math.sin(s * 2.3 + seed * 2) * s)); }
  const cv = new THREE.CatmullRomCurve3(pts), NS = 180, NR = 14, P = [], C = [], I = [], len = cv.getLength();
  for (let i = 0; i <= NS; i++) { const s = i / NS, c = cv.getPointAt(s), T = cv.getTangentAt(s), N = new THREE.Vector3(0, 0, 1).cross(T).normalize(), B = T.clone().cross(N).normalize();
    const L = s * len, f = (L * 5.2) % 1, ring = Math.min(1, f / 0.12) * (1 - Math.max(0, (f - 0.12) / 0.5)), r = lerp(0.2, 0.12, s) * (1 + 0.09 * Math.max(0, ring)) + 0.14 * Math.exp(-s * 28);
    const sh = 0.55 + 0.3 * (1 - ring) + 0.08 * hash(i + seed * 50);
    for (let j = 0; j <= NR; j++) { const a = j / NR * Math.PI * 2; P.push(c.x + (Math.cos(a) * N.x + Math.sin(a) * B.x) * r, c.y + (Math.cos(a) * N.y + Math.sin(a) * B.y) * r, c.z + (Math.cos(a) * N.z + Math.sin(a) * B.z) * r);
      C.push(0.62 * sh, 0.5 * sh, 0.38 * sh); if (i && j) { const q = i * (NR + 1) + j; I.push(q - NR - 2, q - 1, q - NR - 1, q - NR - 1, q - 1, q); } } }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); tg.setIndex(I); tg.computeVertexNormals();
  const trunk = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })); trunk.castShadow = trunk.receiveShadow = true; g.add(trunk);
  const top = cv.getPointAt(1), crown = sph(0.2, new THREE.MeshStandardMaterial({ color: 0x6b6a34, roughness: 0.8 })); crown.scale.set(1, 0.8, 1); crown.position.copy(top); g.add(crown);
  const cm = new THREE.MeshStandardMaterial({ color: 0x6f8f2c, roughness: 0.55 });
  for (let k = 0; k < 5; k++) { const a = k * 1.3 + seed, cc = sph(0.1, cm, 16, 12); cc.position.set(top.x + Math.cos(a) * 0.17, top.y - 0.17 - 0.05 * hash(k + seed), top.z + Math.sin(a) * 0.17); g.add(cc); }
  const fm = new THREE.MeshStandardMaterial({ map: beaFrondTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 }), geos = [];
  const NF = 10;
  for (let k = 0; k < NF; k++) {
    const yaw = k / NF * Math.PI * 2 + 0.4 * hash(k + seed * 7), Lf = 2.2 + 0.7 * hash(k * 3 + seed), th0 = 0.75 + 0.35 * hash(k * 5 + seed), th1 = -0.6 - 0.6 * hash(k * 9 + seed);
    const NS2 = 18, NW = 4, PP = [], UU = [], II = []; let x = 0, y = 0;
    const dir = v3(Math.cos(yaw), 0, Math.sin(yaw)), side = v3(-Math.sin(yaw), 0, Math.cos(yaw));
    for (let i = 0; i <= NS2; i++) { const s = i / NS2, th = lerp(th0, th1, Math.pow(s, 1.25)); if (i) { x += Math.cos(th) * Lf / NS2; y += Math.sin(th) * Lf / NS2; }
      const wd = 0.42 * Math.sin(Math.PI * Math.pow(Math.min(s, 0.999), 0.72)) * (1 - 0.25 * s) + 0.01;
      for (let j = 0; j <= NW; j++) { const v = j / NW * 2 - 1, droop = -Math.abs(v) * wd * 0.45 + (v > 0 ? 0.04 : 0) * s;
        const p = dir.clone().multiplyScalar(x).addScaledVector(side, v * wd).add(v3(0, y + droop, 0)).add(top); PP.push(p.x, p.y, p.z); UU.push(j / NW, 1 - s);
        if (i && j) { const q = i * (NW + 1) + j; II.push(q - NW - 2, q - 1, q - NW - 1, q - NW - 1, q - 1, q); } } }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(PP, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(UU, 2)); fg.setIndex(II); geos.push(fg);
  }
  const fronds = new THREE.Mesh(mergeGeometries(geos), fm); fronds.geometry.computeVertexNormals(); fronds.castShadow = true; fronds.receiveShadow = true; g.add(fronds);
  g.userData.top = top; return g;
}
// el chiringuito: tejado de paja, barra, taburetes y luces cálidas colgadas
function beaKiosk() {
  const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ map: woodTex ? woodTex('#9a6a3e', '#6e4626', '#c08a55', 4) : null, color: 0xffffff, roughness: 0.8 });
  const straw = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#c9a24f'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const x = hash(i * 1.7) * w, y = hash(i * 2.3) * h; c.strokeStyle = `rgba(${hash(i) > 0.5 ? '255,225,150' : '110,80,30'},${0.25 + 0.3 * hash(i * 3)})`; c.lineWidth = 1 + hash(i * 5) * 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (hash(i * 7) - 0.5) * 6, y + 30 + hash(i * 9) * 40); c.stroke(); } });
  straw.wrapS = straw.wrapT = THREE.RepeatWrapping; straw.repeat.set(3, 2);
  const sm = new THREE.MeshStandardMaterial({ map: straw, roughness: 0.95, side: THREE.DoubleSide });
  const deck = rbox(4.2, 3.2, 0.15, wood, 0.03); deck.rotation.x = -Math.PI / 2; deck.position.y = 0.075; g.add(deck);
  for (const [x, z] of [[-1.9, -1.4], [1.9, -1.4], [-1.9, 1.4], [1.9, 1.4]]) { const p = cyl(0.07, 0.08, 2.5, wood, 10); p.position.set(x, 1.25, z); g.add(p); }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.4, 4, 3), sm); roof.rotation.y = Math.PI / 4; roof.position.y = 2.5 + 0.7; roof.scale.set(1, 1, 0.82); roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
  const fringe = new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.3, 0.35, 4, 1, true), new THREE.MeshStandardMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95,
    map: canvasTex(1024, 64, (c, w, h) => { for (let x = 0; x < w; x += 3) { c.fillStyle = hash(x) > 0.5 ? '#b8903f' : '#d8b468'; c.fillRect(x, 0, 3, h * (0.55 + 0.45 * hash(x * 1.3))); } }) }));
  fringe.rotation.y = Math.PI / 4; fringe.scale.set(1, 1, 0.82); fringe.position.y = 2.38; fringe.castShadow = true; g.add(fringe);
  const cnt = rbox(3.0, 1.05, 0.55, new THREE.MeshPhysicalMaterial({ color: 0x14a3a8, roughness: 0.45, clearcoat: 0.6 }), 0.04); cnt.position.set(0, 0.15 + 0.52, 1.0); g.add(cnt);
  const topb = rbox(3.2, 0.06, 0.7, wood, 0.02); topb.position.set(0, 1.23, 1.0); g.add(topb);
  const stripes = [0xffcf2e, 0xff5a5f, 0x3ccf6e]; stripes.forEach((cl, i) => { const s = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.07, 0.01), plastic(cl, 0.3)); s.position.set(0, 0.45 + i * 0.12, 1.28); g.add(s); });
  for (let i = 0; i < 3; i++) { const st = new THREE.Group(), seat = cyl(0.2, 0.2, 0.06, plastic(0xff8a3d, 0.3), 20); seat.position.y = 0.78; st.add(seat); const leg = cyl(0.03, 0.04, 0.7, MAT.steel || wood, 8); leg.position.y = 0.4; st.add(leg); st.position.set(-1 + i, 0.15, 1.75); g.add(st); }
  const shelf = rbox(2.6, 0.04, 0.3, wood, 0.01); shelf.position.set(0, 1.55, -1.1); g.add(shelf);
  for (let i = 0; i < 9; i++) { const b = cyl(0.04, 0.045, 0.24, new THREE.MeshPhysicalMaterial({ color: [0x3ccf6e, 0xffcf2e, 0xff5a5f, 0x9fe8ff][i % 4], roughness: 0.1, transmission: 0, clearcoat: 1 }), 12); b.position.set(-1.1 + i * 0.27, 1.69, -1.1); g.add(b); }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(512, 146, (c, w, h) => { c.fillStyle = '#fff4dd'; rr(c, 4, 4, w - 8, h - 8, 24); c.fill();
    c.fillStyle = '#ff5a5f'; c.font = '900 84px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BAR', w / 2, h / 2 + 4); for (const s of [-1, 1]) { c.fillStyle = '#3ccf6e'; c.beginPath(); c.arc(w / 2 + s * 160, h / 2, 22, 0, Math.PI * 2); c.fill(); } }) }));
  sign.position.set(0, 2.3, 1.55); g.add(sign);
  // las luces colgadas: desde el tejado a dos postes delante
  const bm = new THREE.MeshStandardMaterial({ color: 0x221100, emissive: 0xffb860, emissiveIntensity: 5, roughness: 0.4 }), wm = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
  const poles = [v3(-3.6, 0, 3.6), v3(3.6, 0, 3.6)]; for (const p of poles) { const pc = cyl(0.04, 0.05, 2.6, wood, 8); pc.position.copy(p).setY(1.3); g.add(pc); }
  const runs = [[v3(-1.9, 2.35, 1.4), v3(-3.6, 2.55, 3.6)], [v3(-3.6, 2.55, 3.6), v3(3.6, 2.55, 3.6)], [v3(3.6, 2.55, 3.6), v3(1.9, 2.35, 1.4)], [v3(-1.9, 2.35, 1.4), v3(1.9, 2.35, 1.4)]];
  for (const [a, b] of runs) { const pts = [], n = 14, sag = a.distanceTo(b) * 0.09;
    for (let i = 0; i <= n; i++) { const s = i / n; pts.push(a.clone().lerp(b, s).add(v3(0, -sag * 4 * s * (1 - s), 0))); }
    g.add(tube(pts, 0.008, wm, 40, false, 5)); for (let i = 1; i < n; i += 1) { const bl = sph(0.045, bm, 10, 8); bl.castShadow = false; bl.position.copy(pts[i]).add(v3(0, -0.06, 0)); g.add(bl); } }
  const pl = new THREE.PointLight(0xffb366, 0, 9, 1.6); pl.position.set(0, 2.0, 1.6); g.add(pl); g.userData.light = pl;
  g.traverse(o => { if (o.isMesh && o.castShadow === false && o.material !== bm) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
// la arqueta del cable (tapa de hormigón, sin letras)
function beaManhole() {
  const g = new THREE.Group(), ct = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#a7a39b'; c.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { c.fillStyle = hash(i) > 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(40,35,30,.16)'; c.fillRect(hash(i * 1.3) * w, hash(i * 2.7) * h, 1 + hash(i * 3) * 2, 1 + hash(i * 5) * 2); } });
  const cm = new THREE.MeshStandardMaterial({ map: ct, roughness: 0.9 }), cm2 = new THREE.MeshStandardMaterial({ map: ct, color: 0xcfc8bc, roughness: 0.85 });
  const frame = rbox(0.86, 0.86, 0.22, cm, 0.02); frame.rotation.x = -Math.PI / 2; g.add(frame);
  const lid = rbox(0.7, 0.7, 0.05, cm2, 0.012); lid.rotation.x = -Math.PI / 2; lid.position.y = 0.09; g.add(lid);
  for (const s of [-1, 1]) { const h = cyl(0.025, 0.025, 0.012, new THREE.MeshStandardMaterial({ color: 0x2a2724 }), 14); h.position.set(s * 0.24, 0.112, 0); g.add(h); }
  const ln = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.004, 0.012), new THREE.MeshStandardMaterial({ color: 0x77736b })); ln.position.y = 0.116; g.add(ln);
  return g;
}
// huellas en la arena (pisadas que van de la toalla al agua)
function beaFootprints() {
  const tex = canvasTex(128, 256, (c, w, h) => { const blob = (x, y, rx, ry, a) => { const r = c.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); r.addColorStop(0, `rgba(0,0,0,${a})`); r.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.translate(x, y); c.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); c.translate(-x, -y); c.fillStyle = r; c.beginPath(); c.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2); c.fill(); c.restore(); };
    blob(64, 190, 34, 48, 0.85); blob(60, 100, 40, 62, 0.85); for (let i = 0; i < 5; i++) blob(36 + i * 14, 36 + Math.abs(i - 1) * 5, 9, 12, 0.8); });
  const pts = [];
  const track = (x0, z0, x1, z1, n, seed) => { for (let i = 0; i < n; i++) { const s = i / (n - 1), x = lerp(x0, x1, s) + 0.25 * Math.sin(s * 3 + seed), z = lerp(z0, z1, s) + 0.3 * Math.sin(s * 4.2 + seed), d = Math.atan2(x1 - x0, z1 - z0), side = i % 2 ? 1 : -1;
    pts.push([x + Math.cos(d) * 0.09 * side, z - Math.sin(d) * 0.09 * side, d]); } };
  track(-6.0, 10.0, -0.7, 12.2, 18, 1); track(-8.6, 9.6, -14, 11.2, 14, 2); track(-1.2, 4.8, -4.3, 3.0, 9, 3);
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.11, 0.24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6a4a28, map: tex, transparent: true, opacity: 0.45, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), pts.length);
  pts.forEach(([x, z, d], i) => { _o.position.set(x, beaH(x, z) + 0.008, z); _o.rotation.set(0, d + Math.PI, 0); _o.scale.setScalar(1); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); });
  im.receiveShadow = true; im.renderOrder = 1; return im;
}
// vegetación rastrera de las dunas (hojitas redondas en guías) y matas de hierba
function beaPlants() {
  const g = new THREE.Group();
  const leafG = new THREE.CircleGeometry(0.07, 7).rotateX(-Math.PI / 2); leafG.scale(1, 1, 0.8);
  const leafs = [], tufts = [];
  for (let r = 0; r < 70; r++) { let x = -11 - hash(r * 1.7) * 28, z = -19 + hash(r * 2.9) * 38, a = hash(r * 4.1) * 6.28; if (Math.hypot(x - BEA.kiosk[0], z - BEA.kiosk[1]) < 4.5) continue;
    const n = 30 + Math.floor(hash(r * 5.3) * 40); for (let i = 0; i < n; i++) { a += (hash(r * 100 + i) - 0.5) * 0.7; x += Math.cos(a) * 0.09; z += Math.sin(a) * 0.09; if (x > -10 || x < -39.5 || Math.abs(z) > 19.5) break;
      for (let q = 0; q < 4; q++) { const rr2 = 0.05 + 0.22 * hash(r * 17 + i * 5 + q), aa = hash(r * 13 + i * 7 + q) * 6.28; leafs.push([x + Math.cos(aa) * rr2, z + Math.sin(aa) * rr2, aa, 0.8 + 0.7 * hash(r * 31 + i * 3 + q)]); } } }
  for (let i = 0; i < 260; i++) { const x = -10.5 - Math.pow(hash(i * 3.3), 0.8) * 29, z = -19 + hash(i * 5.1) * 38; if (Math.hypot(x - BEA.kiosk[0], z - BEA.kiosk[1]) < 4.5) continue; tufts.push([x, z, hash(i * 7.7) * 6.28, 0.7 + 0.8 * hash(i * 9.1)]); }
  const lm = new THREE.InstancedMesh(leafG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide }), leafs.length), c = new THREE.Color();
  leafs.forEach(([x, z, a, s], i) => { _o.position.set(x, beaH(x, z) + 0.02, z); _o.rotation.set(0.2 * Math.sin(i), a, 0.25 * Math.cos(i * 1.3)); _o.scale.setScalar(s); _o.updateMatrix(); lm.setMatrixAt(i, _o.matrix);
    lm.setColorAt(i, c.setHSL(0.27 + 0.05 * hash(i * 1.1), 0.5, 0.26 + 0.1 * hash(i * 2.2))); });
  lm.castShadow = true; lm.receiveShadow = true; g.add(lm);
  const blades = []; for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, b = new THREE.BufferGeometry(), r = 0.03, hh = 0.35 + 0.15 * hash(k), lean = 0.12 + 0.1 * hash(k * 3);
    b.setAttribute('position', new THREE.Float32BufferAttribute([Math.cos(a + 1.57) * r, 0, Math.sin(a + 1.57) * r, -Math.cos(a + 1.57) * r, 0, -Math.sin(a + 1.57) * r, Math.cos(a) * lean, hh, Math.sin(a) * lean], 3)); b.computeVertexNormals(); blades.push(b); }
  const tm = new THREE.InstancedMesh(mergeGeometries(blades), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide }), tufts.length);
  tufts.forEach(([x, z, a, s], i) => { _o.position.set(x, beaH(x, z) - 0.01, z); _o.rotation.set(0, a, 0); _o.scale.set(s, s * (0.8 + 0.4 * hash(i)), s); _o.updateMatrix(); tm.setMatrixAt(i, _o.matrix);
    tm.setColorAt(i, c.setHSL(0.17 + 0.06 * hash(i * 1.9), 0.42, 0.42 + 0.1 * hash(i * 2.8))); });
  tm.castShadow = true; tm.receiveShadow = true; g.add(tm);
  return g;
}

// ---------- montaje
function buildBeach() {
  const g = new THREE.Group(); g.name = 'beach';
  g.add(beaTerrain());
  const sw = beaSwash(); g.add(sw);
  const band = { band: 0.55, bandCol: 0xd8b57a };
  const xs = []; for (let i = 0; i <= 160; i++) xs.push(-40 + i * 0.25);
  const zs = []; for (let i = 0; i <= 160; i++) zs.push(-20 + i * 0.25);
  g.add(strataFace(xs, x => beaH(x, 20), 20, band), strataFace(xs, x => beaH(x, -20), -20, band), strataFace(zs, z => beaH(-40, z), -40, { ...band, normalX: -1 }));
  g.add(beaTowel());
  const phone = beaPhone(); g.add(phone);
  // las cosas de la toalla
  const [tx, tz] = BEA.towel, ta = BEA.towelYaw, onT = (lx, lz) => { const x = tx + lx * Math.cos(ta) + lz * Math.sin(ta), z = tz - lx * Math.sin(ta) + lz * Math.cos(ta); return v3(x, beaH(x, z) + 0.006, z); };
  const ff1 = beaFlipFlop(0xff5a7a, 0xfff6ec), ff2 = beaFlipFlop(0xff5a7a, 0xfff6ec); ff1.position.copy(onT(-0.55, 0.64)); ff1.position.y -= 0.006; ff1.rotation.y = 1.9; g.add(ff1);
  ff2.position.copy(onT(-0.32, 0.7)); ff2.position.y -= 0.006; ff2.rotation.y = 1.55; g.add(ff2);
  const sg = beaSunglasses(); sg.position.copy(onT(0.02, -0.16)).add(v3(0, 0.004, 0)); sg.rotation.y = 2.3; g.add(sg);
  const co = beaCoconut(); co.position.copy(onT(-0.18, -0.62)); co.position.y -= 0.03; co.rotation.y = 0.6; g.add(co);
  const um = beaUmbrella(); um.position.set(-5.6, beaH(-5.6, 7.0), 7.0); um.rotation.set(0.1, 0.4, 0.12); g.add(um);
  // palmeras (inclinadas hacia el mar)
  const PALMS = [[-13.4, 12.6, 7.0, 0.38, 0.45], [-8.6, 4.2, 6.4, 0.42, 0.0], [-10.8, -2.6, 7.6, 0.3, 0.2], [-17.2, 9.0, 7.6, 0.3, -0.2], [-12.6, -14.6, 7.0, 0.36, 0.5], [-15.5, 1.5, 8.4, 0.22, -0.4]];
  const palms = [], pA = [];
  PALMS.forEach(([x, z, h, l, yaw], i) => { const p = beaPalm(h, l, i + 1); p.position.set(x, beaH(x, z) - 0.05, z); p.rotation.y = yaw; g.add(p); palms.push(p); p.updateMatrix(); pA.push(p.userData.top.clone().applyMatrix4(p.matrix)); });
  const ki = beaKiosk(); ki.position.set(BEA.kiosk[0], beaH(...BEA.kiosk) - 0.05, BEA.kiosk[1]); ki.rotation.y = Math.PI / 2 + 0.25; g.add(ki);
  const mh = beaManhole(); mh.position.set(BEA.man[0], beaH(...BEA.man) - 0.08, BEA.man[1]); g.add(mh);
  g.add(beaFootprints(), beaPlants());
  const anchors = { phone: BEA_SCREEN.clone(), screenN: v3(0, 1, 0), towel: onT(0, 0), manhole: mh.position.clone().add(v3(0, 0.13, 0)), shore: v3(0, 0, CABLE_Z),
    kiosk: ki.position.clone().add(v3(0, 2.6, 0)), palms: pA };
  g.userData = { anchors, phone, swash: sw, kiosk: ki };
  S.bea = g; return g;
}
// t en segundos (la espuma va y viene sola); screen 0..1 enciende la pantalla, notif 0..1 entra la tarjeta (deslizamiento + rebote), buzz 0..1 vibra
function beachAt(t, o = {}) {
  const g = S.bea; if (!g) return; const U = g.userData, ph = U.phone.userData;
  const sc = clamp(o.screen ?? 1), nk = clamp(o.notif ?? 1), bz = clamp(o.buzz ?? 0);
  // la ola: sube rápido y se retira despacio (ciclo de ~5,5 s)
  const cyc = (t / 5.5) % 1, wv = cyc < 0.35 ? Math.sin(cyc / 0.35 * Math.PI / 2) : 0.5 + 0.5 * Math.cos((cyc - 0.35) / 0.65 * Math.PI);
  const front = lerp(-0.25, -2.1, wv);                     // x del frente de la espuma
  U.swash.material.map.offset.x = 0.5 - (front + 2.8) / 2.8; U.swash.material.opacity = 0.75 + 0.25 * wv;
  // pantalla
  ph.scrM.color.setScalar(1.18 * sc); ph.cardM.color.setScalar(1.18 * sc);
  const kb = nk >= 1 ? 1 : nk <= 0 ? 0 : 1 + 2.70158 * Math.pow(nk - 1, 3) + 1.70158 * Math.pow(nk - 1, 2);      // easeOutBack
  ph.card.position.y = ph.cardY + (1 - kb) * 0.022; ph.card.scale.setScalar(0.9 + 0.1 * kb); ph.cardM.opacity = clamp(nk * 3) * sc; ph.card.visible = nk > 0.001 && sc > 0.001;
  ph.glow.intensity = 0.012 * sc;
  ph.shine.material.opacity = 1;
  // vibración
  const P = U.phone; P.position.set(BEA_PH.x + Math.sin(t * 173) * 0.0011 * bz, BEA_PH.y + Math.abs(Math.sin(t * 211)) * 0.0004 * bz, BEA_PH.z + Math.sin(t * 157 + 1) * 0.0009 * bz);
  P.rotation.y = BEA_PH.yaw + Math.sin(t * 190) * 0.02 * bz;
  U.kiosk.userData.light.intensity = 5;
}
// el camino de la burbuja: sale del agua junto a la arqueta (con un saltito), sube por la arena y se mete en la pantalla del móvil
let _beaCurve = null;
function beaMsgPath(k) {
  const P = BEA_SCREEN;
  if (!_beaCurve) _beaCurve = new THREE.CatmullRomCurve3([v3(1.2, -0.35, CABLE_Z), v3(0.7, 0.55, CABLE_Z + 0.1), v3(0.05, 0.85, CABLE_Z + 0.2), v3(-0.9, 0.62, CABLE_Z + 0.5), v3(-2.3, 0.95, CABLE_Z + 1.2),
    v3(-3.9, 1.05, CABLE_Z + 2.0), v3(P.x + 0.75, P.y + 0.6, P.z + 0.35), v3(P.x + 0.18, P.y + 0.2, P.z + 0.05), v3(P.x, P.y + 0.012, P.z)], false, 'centripetal', 0.5);
  const u = clamp(k), s = u < 0.12 ? ss(u / 0.12) * 0.12 : u;                             // sale del agua despacio
  const pos = _beaCurve.getPointAt(clamp(s));
  pos.y += 0.25 * Math.sin(clamp((u - 0.1) / 0.18) * Math.PI) * (u > 0.1 && u < 0.28 ? 1 : 0);   // el saltito al salir del agua
  const scale = lerp(0.42, 0.55, _sm(0, 0.15, u)) * (1 - _sm(0.72, 1, u)) + 0.055 * _sm(0.72, 1, u);
  return { pos, scale };
}
// ---------------------------------------------------------------- 23 · IBERIA: la costa de Portugal (la estación del cable) y un pueblo blanco de España de noche
// (la cocina de la madre, su móvil, la antena y el tubo de fibra bajo la calle). Marco local: origen en la orilla (x = 0), y = 0 nivel del mar,
// tierra x ∈ [0, 60] (+x tierra adentro), z ∈ [−20, 20] (+z hacia la cara de cristal delantera). El mar (x < 0) no es de esta pieza.
// API: buildIberia() → Group (userData.anchors) · iberiaAt(t, {type, send, waves, pulse, pulse2}) · IBE_CAM_IN(u) / IBE_CAM_OUT(u) → [px,py,pz, lx,ly,lz, fov]
const IBE = { Q: {} };
const ibeSm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
function ibeG(x) { return -0.25 + 1.05 * ibeSm(0, 4.2, x) + 2.45 * ibeSm(4.2, 7.6, x) + 0.35 * ibeSm(8, 60, x); }     // el suelo (playa, duna, llano del pueblo)
const IBE_TY = 1.75, IBE_TZ = 20, IBE_TR = 0.3;               // el tubo bajo la calle: y del eje, z de la cara de corte, radio
const IBE_WX = 40.2, IBE_WZ = 13;                              // ventana de la cocina: centro en x y fachada (z)
const IBE_YF = ibeG(40.5) + 0.15;                              // suelo de la cocina
const IBE_WY = IBE_YF + 1.62;                                  // centro de la ventana
const IBE_TWX = 30, IBE_TWZ = -6, IBE_TWG = ibeG(30), IBE_TWH = 25;   // la torre
const IBE_MOM = v3(39.3, IBE_YF, 11.35);                       // la madre (suelo bajo su silla); mira hacia −z
const IBE_TXT = 'Hijo, ¿dónde estás?';

// ---------- texturas y materiales
function ibeUV(geo, sx, sy) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy); return geo; }
function ibeRep(t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function ibeMats() {
  if (IBE.M) return IBE.M; const M2 = {};
  const plaster = ibeRep(canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f3eee4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const a = 0.03 + hash(i * 1.3) * 0.07; g.fillStyle = hash(i * 2.7) > 0.5 ? `rgba(110,100,85,${a})` : `rgba(255,255,255,${a})`; g.fillRect(hash(i * 3.1) * w, hash(i * 4.3) * h, 1 + hash(i) * 3, 1 + hash(i * 5.5) * 3); } }));
  M2.wall = new THREE.MeshStandardMaterial({ map: plaster, color: 0xf6f2ea, roughness: 0.92, emissive: 0x1b2236, emissiveIntensity: 0.55 });   // cal (con un poco de «luz de luna» propia)
  M2.wallIn = new THREE.MeshStandardMaterial({ map: plaster, color: 0xfff4e2, roughness: 0.9, side: THREE.DoubleSide });
  const tiles = ibeRep(canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5a2414'; g.fillRect(0, 0, w, h); const rows = 8, cols = 6, tw = w / cols, th = h / rows;
    for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) { const x = (c + (r % 2) * 0.5) * tw, y = r * th, b = 150 + hash(r * 7.1 + c * 3.3) * 50;
      const gr = g.createLinearGradient(x, 0, x + tw, 0); gr.addColorStop(0, `rgb(${b * 0.55 | 0},${b * 0.22 | 0},${b * 0.13 | 0})`); gr.addColorStop(0.5, `rgb(${b + 45 | 0},${b * 0.5 + 12 | 0},${b * 0.3 | 0})`); gr.addColorStop(1, `rgb(${b * 0.5 | 0},${b * 0.2 | 0},${b * 0.12 | 0})`);
      g.fillStyle = gr; rr(g, x + 2, y - 4, tw - 4, th + 4, 9); g.fill(); g.fillStyle = 'rgba(20,6,2,.45)'; g.fillRect(x + 2, y + th - 3, tw - 4, 3); } }));
  M2.roof = new THREE.MeshStandardMaterial({ map: tiles, color: 0xffffff, roughness: 0.75, emissive: 0x24100a, emissiveIntensity: 0.6 });
  M2.roofEdge = new THREE.MeshStandardMaterial({ color: 0x8a3c22, roughness: 0.8 });
  M2.glassDark = new THREE.MeshStandardMaterial({ color: 0x18233a, roughness: 0.12, metalness: 0.4, emissive: 0x0a1222, emissiveIntensity: 1 });
  const curtain = canvasTex(128, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#7a3a14'); gr.addColorStop(0.22, '#ffcf8a'); gr.addColorStop(0.5, '#fff0c8'); gr.addColorStop(0.78, '#ffcf8a'); gr.addColorStop(1, '#7a3a14'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(60,30,10,.85)'; g.fillRect(w / 2 - 3, 0, 6, h); g.fillRect(0, h * 0.42, w, 6); });
  M2.glassLit = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb45c, emissiveMap: curtain, emissiveIntensity: 1.25, roughness: 0.5 });
  M2.glassLit2 = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc98a, emissiveMap: curtain, emissiveIntensity: 0.8, roughness: 0.5 });
  M2.frame = new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.8, emissive: 0x161a26, emissiveIntensity: 0.5 });
  M2.iron = new THREE.MeshStandardMaterial({ color: 0x1d1f24, roughness: 0.5, metalness: 0.6 });
  M2.wood = new THREE.MeshStandardMaterial({ color: 0x6b4026, roughness: 0.65 });
  M2.woodL = new THREE.MeshStandardMaterial({ color: 0xa8743f, roughness: 0.6 });
  M2.shutter = [0x3d6b4c, 0x2f5f8f, 0x6e3b2a, 0x3d6b4c].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: c, emissiveIntensity: 0.12 }));
  M2.zoc = [0xc79b52, 0x6f88a6, 0x9c5a3c].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, emissive: c, emissiveIntensity: 0.1 }));
  M2.pot = new THREE.MeshStandardMaterial({ color: 0xb4532e, roughness: 0.8 });
  M2.potB = new THREE.MeshStandardMaterial({ color: 0x2c5fb0, roughness: 0.4 });
  M2.leaf = new THREE.MeshStandardMaterial({ color: 0x2f6b2c, roughness: 0.85 });
  M2.flower = [0xe0243a, 0xff5fa0, 0xe0243a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: c, emissiveIntensity: 0.25 }));
  M2.lampBulb = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc070, emissiveIntensity: 3.2 });
  M2.concrete = new THREE.MeshStandardMaterial({ color: 0xdcd9d2, roughness: 0.9, emissive: 0x161a24, emissiveIntensity: 0.5 });
  M2.steel = new THREE.MeshStandardMaterial({ color: 0xc8cdd4, roughness: 0.4, metalness: 0.7, emissive: 0x1c2232, emissiveIntensity: 0.7 });
  M2.grey = new THREE.MeshStandardMaterial({ color: 0x8b9099, roughness: 0.55, metalness: 0.3 });
  M2.white = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.45, emissive: 0x1a2030, emissiveIntensity: 0.4 });
  M2.cable = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.45 });
  const cob = ibeRep(canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5d5a55'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) { const x = c * 25.6 + (r % 2) * 12.8, y = r * 25.6, b = 150 + hash(r * 13.1 + c * 7.7) * 45; g.fillStyle = `rgb(${b | 0},${b - 6 | 0},${b - 14 | 0})`; rr(g, x + 2, y + 2, 22, 22, 7); g.fill(); } }));
  M2.street = new THREE.MeshStandardMaterial({ map: cob, color: 0xcfcac2, roughness: 0.85 });
  M2.pvc = new THREE.MeshStandardMaterial({ color: 0xff7a1f, roughness: 0.5, side: THREE.DoubleSide, emissive: 0x3a1400, emissiveIntensity: 0.5 });
  M2.gravel = new THREE.MeshStandardMaterial({ color: 0xc9b48c, roughness: 1, side: THREE.DoubleSide });
  M2.olive = new THREE.MeshStandardMaterial({ color: 0x5f6e47, roughness: 0.9, flatShading: true });
  M2.cypress = new THREE.MeshStandardMaterial({ color: 0x2b3d29, roughness: 0.9, flatShading: true });
  M2.trunk = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.9 });
  M2.rock = new THREE.MeshStandardMaterial({ color: 0x9a8c78, roughness: 0.95, flatShading: true });
  IBE.M = M2; return M2;
}
function ibeGlow(col, s, k = 1) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: new THREE.Color(col).multiplyScalar(k), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); sp.scale.setScalar(s); return sp; }
const ibeBox = (w, h, d, m, x, y, z) => { const o = mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };

// ---------- el suelo: playa, duna, llano; las calles; las caras de corte
function ibeTerrain(g) {
  const M2 = ibeMats(), geo = new THREE.PlaneGeometry(60, 40, 120, 80); geo.rotateX(-Math.PI / 2); geo.translate(30, 0, 0);
  const P = geo.attributes.position, col = [], c = new THREE.Color(), sand = new THREE.Color(0xd8bf8e), wet = new THREE.Color(0x9c8664), earth = new THREE.Color(0x6e5c44), grass = new THREE.Color(0x56603e);
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); let y = ibeG(x);
    if (x < 7.8) y += 0.06 * Math.sin(x * 3.1 + z * 0.7) * Math.sin(z * 1.3) * clamp(x / 2);
    else y += 0.05 * Math.sin(x * 0.9 + z * 1.7) * Math.sin(z * 0.6 - x * 0.4);
    P.setY(i, y);
    c.copy(wet).lerp(sand, ibeSm(0, 1.6, x)); c.lerp(earth, ibeSm(6.2, 8.4, x)); c.lerp(grass, 0.5 + 0.5 * Math.sin(x * 0.31 + z * 0.23) * Math.sin(z * 0.17)); if (x < 8) c.lerp(sand, 1 - ibeSm(6.2, 8.4, x));
    col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const t = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: 0x0d1018, emissiveIntensity: 1 })); t.receiveShadow = true; g.add(t);
  // calles (empedrado claro): la de delante (sobre el tubo), la de atrás y el callejón hacia la torre
  const strip = (x0, x1, z0, z1) => { const n = Math.max(2, Math.ceil((x1 - x0) / 0.5)), sg = new THREE.PlaneGeometry(x1 - x0, z1 - z0, n, 1); sg.rotateX(-Math.PI / 2); sg.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = sg.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, ibeG(p.getX(i)) + 0.09); sg.computeVertexNormals(); ibeUV(sg, (x1 - x0) / 2.2, (z1 - z0) / 2.2);
    const m = new THREE.Mesh(sg, M2.street); m.receiveShadow = true; g.add(m); return m; };
  strip(8.2, 60, 14.2, 20); strip(13, 60, 0.6, 5.4); strip(28.6, 31.6, 5.4, 14.2); strip(8.2, 13, 5, 14.2);
  // bordillos de la calle de delante
  g.add(ibeBox(51.8, 0.14, 0.18, M2.concrete, 34.1, ibeG(34) + 0.12, 14.2));
  // caras de corte: delante (z = 20, con el tubo cortado a lo largo), detrás (z = −20) y el final (x = 60)
  const xsA = [], xsB = [], xsC = [], xsD = [];
  for (let x = 0; x <= 8; x += 0.25) xsA.push(x); for (let x = 8; x <= 10; x += 0.5) xsB.push(x); for (let x = 10; x <= 30; x += 0.5) xsC.push(x); for (let x = 30; x <= 60; x += 0.5) xsD.push(x);
  const top = x => ibeG(x) + 0.02, sandB = { bot: -SEA, band: 0.6, bandCol: 0xcdb27f }, earthB = { bot: -SEA, band: 0.7, bandCol: 0x4c3c2c };
  g.add(strataFace(xsA, top, 20, sandB), strataFace(xsB, top, 20, earthB), strataFace(xsD, top, 20, earthB));
  g.add(strataFace(xsC, () => IBE_TY - 0.5, 20, { bot: -SEA }), strataFace(xsC, top, 20, { bot: IBE_TY + 0.5, band: 0.7, bandCol: 0x4c3c2c }));
  const all = [...xsA, ...xsB.slice(1), ...xsC.slice(1), ...xsD.slice(1)];
  g.add(strataFace(all.slice(0, 33), top, -20, sandB), strataFace(all.slice(32), top, -20, earthB));
  const zs = []; for (let z = -20; z <= 20; z += 0.5) zs.push(z); g.add(strataFace(zs, () => ibeG(60) + 0.02, 60, { bot: -SEA, band: 0.7, bandCol: 0x4c3c2c, normalX: 1 }));
  // la zanja del tubo en el corte: fondo de grava y techo/suelo
  const tr = new THREE.Mesh(new THREE.PlaneGeometry(20, 1.0), M2.gravel); tr.position.set(20, IBE_TY, IBE_TZ - 0.55); g.add(tr);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(20, 0.55), M2.gravel); p.rotation.x = Math.PI / 2; p.position.set(20, IBE_TY + s * 0.5, IBE_TZ - 0.275); g.add(p); }
  for (const x of [10, 30]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.0), M2.gravel); p.rotation.y = Math.PI / 2; p.position.set(x, IBE_TY, IBE_TZ - 0.275); g.add(p); }
  // el tubo (medio tubo naranja, abierto hacia el corte)
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(IBE_TR, IBE_TR, 20, 28, 1, true, Math.PI / 2, Math.PI), M2.pvc); pipe.rotation.z = Math.PI / 2; pipe.position.set(20, IBE_TY, IBE_TZ); g.add(pipe);
  // rocas en la duna
  for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + hash(i * 3.7) * 0.5, 0), M2.rock); const x = 4.8 + hash(i * 1.9) * 2.4, z = -18 + hash(i * 5.3) * 36; r.position.set(x, ibeG(x) - 0.1, z); r.rotation.set(hash(i) * 3, hash(i * 2) * 3, 0); r.scale.y = 0.6; r.castShadow = r.receiveShadow = true; g.add(r); }
}

// ---------- una casa encalada: o = {x0, x1, z0, z1, h, roof: 'gable'|'flat', zoc, sh, lit: [..], door, balcony, pots}
function ibeHouse(g, o) {
  const M2 = ibeMats(), { x0, x1, z0, z1, h } = o, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, G = ibeG(cx) + 0.09;
  const body = mesh(ibeUV(new THREE.BoxGeometry(w, h + 0.6, d), w / 2.5, (h + 0.6) / 2.5), M2.wall); body.position.set(cx, G + h / 2 - 0.3, cz); g.add(body);
  g.add(ibeBox(w + 0.04, 0.6, d + 0.04, M2.zoc[o.zoc ?? 0], cx, G, cz));
  if (o.roof === 'flat') {
    for (const [a, b, c2, e] of [[w + 0.1, 0.12, cx, z1], [w + 0.1, 0.12, cx, z0], [0.12, d, x0, cz], [0.12, d, x1, cz]]) g.add(ibeBox(a, 0.5, b === 0.12 ? 0.12 : b, M2.wall, c2, G + h + 0.2, e));
    g.add(ibeBox(w + 0.2, 0.08, 0.2, M2.roofEdge, cx, G + h + 0.48, z1));
    const ch = ibeBox(0.5, 0.9, 0.5, M2.wall, x0 + w * 0.75, G + h + 0.4, cz - d * 0.2); g.add(ch); g.add(ibeBox(0.7, 0.08, 0.7, M2.roofEdge, ch.position.x, G + h + 0.88, ch.position.z));
  } else {
    const rh = o.rh ?? Math.min(1.5, d * 0.24), R = d / 2 + 0.35, rise = rh * R / (d / 2), L = Math.hypot(R, rise), a = Math.atan2(rise, R);
    for (const s of [1, -1]) { const sl = mesh(ibeUV(new THREE.BoxGeometry(w + 0.5, 0.14, L), (w + 0.5) / 2.2, L / 2.2), M2.roof); sl.rotation.x = s * a; sl.position.set(cx, G + h + rh - rise / 2 + 0.07, cz + s * R / 2); g.add(sl); }
    g.add(ibeBox(w + 0.5, 0.16, 0.22, M2.roofEdge, cx, G + h + rh + 0.12, cz));
    const tri = new THREE.Shape(); tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, rh); tri.closePath();
    for (const x of [x0, x1]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), M2.wall); m.material = M2.wall; m.rotation.y = Math.PI / 2; m.position.set(x + (x === x0 ? -0.001 : 0.001), G + h, cz); m.castShadow = true; m.receiveShadow = true; g.add(m); m.material.side = THREE.DoubleSide; }
  }
  // ventanas, contraventanas, rejas, puerta, farol, balcón y macetas en la fachada (+z)
  const floors = h > 4.2 ? 2 : 1, n = Math.max(1, Math.floor(w / 2.3)), shM = M2.shutter[o.sh ?? 0];
  let k = 0;
  for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) {
    const x = x0 + (i + 0.5) * w / n, isDoor = f === 0 && i === (o.door ?? 0), y = G + (f === 0 ? 1.55 : 4.1), z = z1;
    if (isDoor) {
      g.add(ibeBox(1.06, 2.2, 0.08, M2.wood, x, G + 1.1, z + 0.03)); g.add(ibeBox(1.3, 0.12, 0.14, M2.frame, x, G + 2.26, z + 0.05));
      for (const dx of [-0.25, 0.25]) g.add(ibeBox(0.4, 0.9, 0.02, M2.woodL, x + dx, G + 1.45, z + 0.08));
      const lamp = new THREE.Group(); lamp.add(ibeBox(0.2, 0.3, 0.2, M2.iron, 0, 0, 0)); const bulb = sph(0.08, M2.lampBulb, 12, 8); bulb.castShadow = false; lamp.add(bulb); bulb.position.y = -0.02;
      const gl = ibeGlow(0xffb766, 1.6, 0.8); lamp.add(gl); lamp.add(ibeBox(0.04, 0.04, 0.3, M2.iron, 0, 0.12, -0.15)); lamp.position.set(x + 0.85, G + 2.7, z + 0.32); g.add(lamp);
      continue;
    }
    const lit = o.lit ? o.lit[k++ % o.lit.length] : 0;
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.15), lit === 1 ? M2.glassLit : lit === 2 ? M2.glassLit2 : M2.glassDark); gl.position.set(x, y, z + 0.012); g.add(gl);
    g.add(ibeBox(1.1, 0.1, 0.16, M2.frame, x, y - 0.63, z + 0.06), ibeBox(1.05, 0.08, 0.08, M2.frame, x, y + 0.62, z + 0.03));
    for (const s of [-1, 1]) { const sh = ibeBox(0.48, 1.2, 0.04, shM, x + s * 0.72, y, z + 0.04); g.add(sh); }
    if (f === 0 && !o.noReja) { for (let b = 0; b < 5; b++) g.add(ibeBox(0.025, 1.2, 0.025, M2.iron, x - 0.36 + b * 0.18, y, z + 0.12)); g.add(ibeBox(0.9, 0.03, 0.03, M2.iron, x, y + 0.6, z + 0.12)); }
    if (f === 1 && o.balcony && i === (o.balIdx ?? 0)) {
      g.add(ibeBox(1.7, 0.1, 0.7, M2.frame, x, y - 0.66, z + 0.35)); g.add(ibeBox(1.7, 0.04, 0.04, M2.iron, x, y + 0.32, z + 0.68));
      for (let b = 0; b <= 12; b++) g.add(ibeBox(0.02, 0.95, 0.02, M2.iron, x - 0.84 + b * 0.14, y - 0.15, z + 0.68));
      for (const s of [-1, 1]) g.add(ibeBox(0.04, 0.04, 0.68, M2.iron, x + s * 0.84, y + 0.32, z + 0.35));
      for (let p = 0; p < 3; p++) ibePot(g, x - 0.55 + p * 0.55, y - 0.6, z + 0.5, p, false);
    }
  }
  if (o.pots) for (let p = 0; p < o.pots; p++) ibePot(g, x0 + 0.6 + (p + 0.5) * (w - 1.2) / o.pots, G + 2.6 + (p % 2) * 0.35, z1 + 0.12, p + 3, true);
  return body;
}
function ibePot(g, x, y, z, i, wall) {      // maceta (de barro o azul, colgada en la pared) con geranios
  const M2 = ibeMats(), p = new THREE.Group(); const c = cyl(0.1, 0.075, 0.16, wall ? M2.potB : M2.pot, 12); c.position.y = 0.08; p.add(c);
  const lf = sph(0.13, M2.leaf, 10, 8); lf.scale.y = 0.7; lf.position.y = 0.2; p.add(lf);
  for (let f = 0; f < 4; f++) { const fl = sph(0.045, M2.flower[(i + f) % 3], 8, 6); fl.castShadow = false; fl.position.set(Math.cos(f * 1.7 + i) * 0.09, 0.27 + 0.03 * hash(f + i), Math.sin(f * 1.7 + i) * 0.09); p.add(fl); }
  p.position.set(x, y, z); g.add(p); return p;
}
function ibeOlive(g, x, z, s = 1) { const M2 = ibeMats(), t = new THREE.Group(), G = ibeG(x); const tr = cyl(0.12 * s, 0.18 * s, 1.4 * s, M2.trunk, 8); tr.position.y = 0.7 * s; t.add(tr);
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.7 + hash(i * 3.3 + x) * 0.4) * s, 1), M2.olive); b.position.set(Math.cos(i * 1.3) * 0.6 * s, (1.7 + hash(i + z) * 0.6) * s, Math.sin(i * 1.3) * 0.6 * s); b.scale.y = 0.7; b.castShadow = true; t.add(b); }
  t.position.set(x, G, z); g.add(t); }
function ibeCypress(g, x, z, s = 1) { const M2 = ibeMats(), c = new THREE.Mesh(new THREE.SphereGeometry(0.7 * s, 10, 12), M2.cypress); c.scale.y = 3.4; c.position.set(x, ibeG(x) + 2.3 * s, z); c.castShadow = true; g.add(c); }
function ibeLampPost(g, x, z) {      // farola fernandina (negra, farol cálido)
  const M2 = ibeMats(), G = ibeG(x) + 0.09, p = new THREE.Group(); const post = cyl(0.06, 0.09, 3.6, M2.iron, 10); post.position.y = 1.8; p.add(post);
  const head = cyl(0.22, 0.12, 0.45, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffbe6e, emissiveIntensity: 2.6, transparent: true, opacity: 0.95 }), 6); head.position.y = 3.85; head.castShadow = false; p.add(head);
  const cap = cyl(0.04, 0.3, 0.2, M2.iron, 6); cap.position.y = 4.17; p.add(cap); const gl = ibeGlow(0xffb766, 3.2, 0.9); gl.position.y = 3.85; p.add(gl);
  p.position.set(x, G, z); g.add(p); return p; }

// ---------- la casa de la madre (una planta) con la COCINA por dentro (la ventana de la cocina mira a +z)
function ibeMotherHouse(g) {
  const M2 = ibeMats(), G = ibeG(40.5) + 0.09, yF = IBE_YF, top = yF + 2.95, H2 = top - (G - 0.3);
  const X0 = 37, X1 = 44, ZB = 6.5, ZF = 13, KX1 = 42.6, KZB = 8.5;
  // fachada con el hueco de la ventana
  const sh = new THREE.Shape(); sh.moveTo(X0, G - 0.3); sh.lineTo(KX1, G - 0.3); sh.lineTo(KX1, top); sh.lineTo(X0, top); sh.closePath();
  const hole = new THREE.Path(), wx0 = IBE_WX - 0.7, wx1 = IBE_WX + 0.7, wy0 = yF + 1.0, wy1 = yF + 2.25; hole.moveTo(wx0, wy0); hole.lineTo(wx0, wy1); hole.lineTo(wx1, wy1); hole.lineTo(wx1, wy0); hole.closePath(); sh.holes.push(hole);
  const fg = new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: false }); ibeUV(fg, 0.4, 0.4); const front = new THREE.Mesh(fg, M2.wall); front.position.z = ZF - 0.25; front.castShadow = front.receiveShadow = true; g.add(front);
  g.add(ibeBox(KX1 - X0 + 0.04, 0.6, 0.06, M2.zoc[1], (X0 + KX1) / 2, G, ZF + 0.02));
  const blk = (x0, x1, z0, z1) => { const b = mesh(ibeUV(new THREE.BoxGeometry(x1 - x0, H2, z1 - z0), (x1 - x0) / 2.5, H2 / 2.5), M2.wall); b.position.set((x0 + x1) / 2, (top + G - 0.3) / 2, (z0 + z1) / 2); g.add(b); return b; };
  blk(KX1, X1, KZB, ZF); blk(X0, X1, ZB, KZB); blk(X0, X0 + 0.25, KZB, ZF - 0.25);
  g.add(ibeBox(1.45, 0.6, 0.06, M2.zoc[1], 43.3, G, ZF + 0.02));
  const roofSlab = ibeBox(X1 - X0, 0.25, ZF - ZB, M2.wall, (X0 + X1) / 2, top - 0.125, (ZB + ZF) / 2); g.add(roofSlab);
  // tejado a dos aguas
  { const d = ZF - ZB, w = X1 - X0, cx = (X0 + X1) / 2, cz = (ZB + ZF) / 2, rh = 1.3, R = d / 2 + 0.35, rise = rh * R / (d / 2), L = Math.hypot(R, rise), a = Math.atan2(rise, R);
    for (const s of [1, -1]) { const sl = mesh(ibeUV(new THREE.BoxGeometry(w + 0.5, 0.14, L), (w + 0.5) / 2.2, L / 2.2), M2.roof); sl.rotation.x = s * a; sl.position.set(cx, top + rh - rise / 2 + 0.07, cz + s * R / 2); g.add(sl); }
    g.add(ibeBox(w + 0.5, 0.16, 0.22, M2.roofEdge, cx, top + rh + 0.12, cz));
    const tri = new THREE.Shape(); tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, rh); tri.closePath();
    for (const x of [X0, X1]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ map: M2.wall.map, color: 0xf6f2ea, roughness: 0.92, emissive: 0x1b2236, emissiveIntensity: 0.55, side: THREE.DoubleSide })); m.rotation.y = Math.PI / 2; m.position.set(x, top, cz); g.add(m); }
    const ch = ibeBox(0.5, 1.4, 0.5, M2.wall, 42.8, top + 1.2, cz - 1.2); g.add(ch); g.add(ibeBox(0.7, 0.08, 0.7, M2.roofEdge, 42.8, top + 1.92, cz - 1.2)); }
  // la ventana de la cocina: marco, alféizar, contraventanas abiertas, maceta de geranios
  g.add(ibeBox(1.6, 0.1, 0.4, M2.frame, IBE_WX, wy0 - 0.05, ZF - 0.05), ibeBox(1.6, 0.12, 0.1, M2.frame, IBE_WX, wy1 + 0.06, ZF + 0.02));
  for (const s of [-1, 1]) { g.add(ibeBox(0.08, wy1 - wy0, 0.1, M2.frame, IBE_WX + s * 0.74, (wy0 + wy1) / 2, ZF + 0.02)); g.add(ibeBox(0.72, 1.3, 0.04, M2.shutter[1], IBE_WX + s * 1.16, (wy0 + wy1) / 2, ZF + 0.05)); }
  ibePot(g, IBE_WX - 0.52, wy0, ZF + 0.08, 1, false);
  // la puerta, su farol y macetas azules en la pared
  g.add(ibeBox(1.06, 2.2, 0.08, M2.wood, 43.3, G + 1.1, ZF + 0.03)); g.add(ibeBox(1.3, 0.12, 0.14, M2.frame, 43.3, G + 2.26, ZF + 0.05));
  { const lamp = new THREE.Group(); lamp.add(ibeBox(0.2, 0.3, 0.2, M2.iron, 0, 0, 0)); const b = sph(0.08, M2.lampBulb, 12, 8); b.castShadow = false; lamp.add(b); lamp.add(ibeGlow(0xffb766, 1.6, 0.8)); lamp.position.set(42.5, G + 2.75, ZF + 0.3); g.add(lamp); }
  for (let p = 0; p < 3; p++) ibePot(g, 37.6 + p * 0.55, G + 2.5 + (p % 2) * 0.3, ZF + 0.12, p + 5, true);

  // ---- LA COCINA (x ∈ [37.25, 42.6], z ∈ [8.5, 12.75], suelo yF, techo yF + 2.7)
  const K = new THREE.Group(); g.add(K); const kx0 = 37.25, kx1 = KX1, kz0 = KZB, kz1 = ZF - 0.25, kh = 2.7, kcx = (kx0 + kx1) / 2, kcz = (kz0 + kz1) / 2;
  const floorT = ibeRep(canvasTex(256, 256, (c, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#b8623a' : '#efe4cf'; c.fillRect(i * 32, j * 32, 32, 32); } c.strokeStyle = 'rgba(60,40,30,.35)'; c.lineWidth = 1.5; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, h); c.moveTo(0, i * 32); c.lineTo(w, i * 32); c.stroke(); } }));
  const fl = new THREE.Mesh(ibeUV(new THREE.PlaneGeometry(kx1 - kx0, kz1 - kz0), (kx1 - kx0) / 2.4, (kz1 - kz0) / 2.4), new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.35 })); fl.rotation.x = -Math.PI / 2; fl.position.set(kcx, yF, kcz); fl.receiveShadow = true; K.add(fl);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(kx1 - kx0, kz1 - kz0), M2.wallIn); ceil.rotation.x = Math.PI / 2; ceil.position.set(kcx, yF + kh, kcz); K.add(ceil);
  const azT = ibeRep(canvasTex(256, 256, (c, w, h) => { const n = 4, s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = i * s, y = j * s; c.fillStyle = '#f4f1ea'; c.fillRect(x, y, s, s);
      c.strokeStyle = '#2a5aa8'; c.lineWidth = 5; c.beginPath(); c.moveTo(x + s / 2, y + 8); c.lineTo(x + s - 8, y + s / 2); c.lineTo(x + s / 2, y + s - 8); c.lineTo(x + 8, y + s / 2); c.closePath(); c.stroke();
      c.fillStyle = '#e0a21c'; c.beginPath(); c.arc(x + s / 2, y + s / 2, 7, 0, 7); c.fill(); c.fillStyle = '#2a5aa8'; for (const [a, b] of [[0, 0], [s, 0], [0, s], [s, s]]) { c.beginPath(); c.arc(x + a, y + b, 9, 0, 7); c.fill(); } }
    c.strokeStyle = 'rgba(150,150,150,.8)'; c.lineWidth = 2; for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, h); c.moveTo(0, i * s); c.lineTo(w, i * s); c.stroke(); } }));
  const azM = new THREE.MeshStandardMaterial({ map: azT, roughness: 0.25, metalness: 0.05 });
  const wallP = (len, x, z, ry) => { const a = new THREE.Mesh(ibeUV(new THREE.PlaneGeometry(len, 1.45), len / 0.6, 1.45 / 0.6), azM); a.position.set(x, yF + 0.725, z); a.rotation.y = ry; K.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(len, kh - 1.45), M2.wallIn); b.position.set(x, yF + 1.45 + (kh - 1.45) / 2, z); b.rotation.y = ry; K.add(b); };
  wallP(kx1 - kx0, kcx, kz0 + 0.005, 0); wallP(kz1 - kz0, kx0 + 0.005, kcz, Math.PI / 2); wallP(kz1 - kz0, kx1 - 0.005, kcz, -Math.PI / 2);
  // encimera con fregadero y fuego, armarios altos
  const cab = new THREE.MeshStandardMaterial({ color: 0x8fb8a8, roughness: 0.55 }), wtop = new THREE.MeshStandardMaterial({ color: 0x3a3634, roughness: 0.3 });
  K.add(ibeBox(3.6, 0.86, 0.6, cab, 39.15, yF + 0.43, kz0 + 0.3), ibeBox(3.64, 0.05, 0.64, wtop, 39.15, yF + 0.885, kz0 + 0.32));
  for (let i = 0; i < 6; i++) K.add(ibeBox(0.02, 0.7, 0.01, M2.iron, 37.35 + i * 0.6 + 0.3, yF + 0.45, kz0 + 0.61));
  K.add(ibeBox(0.55, 0.04, 0.4, M2.steel, 38.3, yF + 0.9, kz0 + 0.3)); { const tap = bar(v3(38.3, yF + 0.9, kz0 + 0.1), v3(38.3, yF + 1.15, kz0 + 0.18), 0.015, M2.steel); K.add(tap); }
  for (const [dx, dz] of [[0, 0], [0.24, 0], [0, 0.22], [0.24, 0.22]]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 20), M2.iron); r.rotation.x = Math.PI / 2; r.position.set(39.8 + dx, yF + 0.915, kz0 + 0.2 + dz); K.add(r); }
  { const pot = cyl(0.12, 0.12, 0.16, new THREE.MeshStandardMaterial({ color: 0xc8322c, roughness: 0.3 }), 20); pot.position.set(39.8, yF + 0.99, kz0 + 0.2); K.add(pot); }
  K.add(ibeBox(1.5, 0.7, 0.35, cab, 38.15, yF + 2.05, kz0 + 0.18));
  // nevera
  const fr = rbox(0.68, 1.8, 0.66, new THREE.MeshPhysicalMaterial({ color: 0xf2f0ea, roughness: 0.3, clearcoat: 0.6 }), 0.06); fr.position.set(41.95, yF + 0.9, kz0 + 0.36); K.add(fr);
  K.add(ibeBox(0.03, 0.4, 0.04, M2.steel, 41.7, yF + 1.35, kz0 + 0.71), ibeBox(0.03, 0.3, 0.04, M2.steel, 41.7, yF + 0.6, kz0 + 0.71), ibeBox(0.66, 0.01, 0.01, M2.grey, 41.95, yF + 1.05, kz0 + 0.70));
  { const mg = ibeBox(0.08, 0.08, 0.01, new THREE.MeshStandardMaterial({ color: 0xffd23f }), 42.1, yF + 1.5, kz0 + 0.70); K.add(mg); const ph = ibeBox(0.14, 0.18, 0.005, new THREE.MeshStandardMaterial({ color: 0x7fb6d9 }), 41.85, yF + 1.45, kz0 + 0.70); K.add(ph); }
  // el reloj de pared: las 22:47 (en España; en Brasil son 4 h menos)
  { const ct = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#fbf8f0'; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill(); c.lineWidth = 10; c.strokeStyle = '#7a4a26'; c.stroke();
      c.fillStyle = '#222'; c.font = '700 34px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; c.fillText(String(i), 128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); }
      const hand = (a, L, wd, col) => { c.strokeStyle = col; c.lineWidth = wd; c.lineCap = 'round'; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.sin(a) * L, 128 - Math.cos(a) * L); c.stroke(); };
      hand((10 + 47 / 60) / 12 * Math.PI * 2, 55, 10, '#1a1a1a'); hand(47 / 60 * Math.PI * 2, 80, 6, '#1a1a1a'); c.fillStyle = '#c8322c'; c.beginPath(); c.arc(128, 128, 8, 0, 7); c.fill(); });
    const cl = new THREE.Mesh(new THREE.CircleGeometry(0.17, 40), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.4 })); cl.position.set(39.75, yF + 1.98, kz0 + 0.035); K.add(cl);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 8, 40), M2.wood); rim.position.copy(cl.position); K.add(rim); IBE.Q.clock = cl; }
  // la mesa con su mantel de cuadros y el frutero
  const tx0 = 38.65, tx1 = 40.45, tz0 = 9.6, tz1 = 10.7, ty = yF + 0.76, tcx = (tx0 + tx1) / 2, tcz = (tz0 + tz1) / 2;
  const clothT = ibeRep(canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#fbf6ee'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(200,40,50,.55)'; for (let i = 0; i < 8; i += 2) { c.fillRect(i * 16, 0, 16, h); c.fillRect(0, i * 16, w, 16); } }));
  const clothM = new THREE.MeshStandardMaterial({ map: clothT, roughness: 0.85, side: THREE.DoubleSide });
  const ctop = new THREE.Mesh(ibeUV(new THREE.BoxGeometry(tx1 - tx0 + 0.1, 0.02, tz1 - tz0 + 0.1), 8, 5), clothM); ctop.position.set(tcx, ty, tcz); ctop.castShadow = ctop.receiveShadow = true; K.add(ctop);
  for (const [w, x, z, ry] of [[tx1 - tx0 + 0.1, tcx, tz1 + 0.05, 0], [tx1 - tx0 + 0.1, tcx, tz0 - 0.05, 0], [tz1 - tz0 + 0.1, tx0 - 0.05, tcz, Math.PI / 2], [tz1 - tz0 + 0.1, tx1 + 0.05, tcz, Math.PI / 2]]) {
    const s = new THREE.Mesh(ibeUV(new THREE.PlaneGeometry(w, 0.28), w * 4.2, 1.2), clothM); s.position.set(x, ty - 0.14, z); s.rotation.y = ry; K.add(s); }
  for (const [x, z] of [[tx0 + 0.08, tz0 + 0.08], [tx1 - 0.08, tz0 + 0.08], [tx0 + 0.08, tz1 - 0.08], [tx1 - 0.08, tz1 - 0.08]]) K.add(ibeBox(0.06, 0.74, 0.06, M2.wood, x, yF + 0.37, z));
  { const bowlM = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.25 }), bowl = lathe([[0.001, 0], [0.07, 0.005], [0.15, 0.05], [0.17, 0.09], [0.16, 0.095]], 32, bowlM); bowl.position.set(39.95, ty + 0.01, 9.98); K.add(bowl);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.163, 0.006, 6, 40), new THREE.MeshStandardMaterial({ color: 0x2a5aa8 })); band.rotation.x = Math.PI / 2; band.position.set(39.95, ty + 0.085, 9.98); K.add(band);
    const fr2 = [[0x6b4a1a, 0.045], [0xf28a1c, 0.05], [0xf28a1c, 0.05], [0xf28a1c, 0.048], [0xc8222a, 0.045], [0x8cc63f, 0.044], [0xf2d23a, 0.04]];
    const fp = [[0, 0.11, 0], [-0.07, 0.1, 0.04], [0.07, 0.1, -0.03], [0.0, 0.1, -0.08], [0.05, 0.1, 0.07], [-0.06, 0.1, -0.06], [0.02, 0.17, 0.0]];
    fr2.forEach(([c, r], i) => { if (i === 0) return; const f = sph(r, new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }), 16, 12); f.position.set(39.95 + fp[i][0], ty + fp[i][1], 9.98 + fp[i][2]); K.add(f); });
    const ban = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 16, 2.0), new THREE.MeshStandardMaterial({ color: 0xf2d23a, roughness: 0.5 })); ban.position.set(39.95, ty + 0.16, 9.98); ban.rotation.set(Math.PI / 2 - 0.4, 0, 0.6); K.add(ban); }
  { const cup = cyl(0.04, 0.035, 0.09, new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.3 }), 16); cup.position.set(38.95, ty + 0.055, 10.3); K.add(cup); const sau = cyl(0.07, 0.06, 0.012, cup.material, 20); sau.position.set(38.95, ty + 0.012, 10.3); K.add(sau); }
  // la lámpara de techo, cálida, sobre la mesa
  { const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.26, 0.2, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x3d6b4c, roughness: 0.5, side: THREE.DoubleSide })); shade.position.set(tcx, yF + 2.05, tcz); K.add(shade);
    K.add(bar(v3(tcx, yF + 2.15, tcz), v3(tcx, yF + kh, tcz), 0.008, M2.iron)); const bulb = sph(0.06, M2.lampBulb, 12, 8); bulb.castShadow = false; bulb.position.set(tcx, yF + 1.98, tcz); K.add(bulb);
    const L = new THREE.PointLight(0xffb070, 5.5, 9, 2); L.position.set(tcx, yF + 1.9, tcz); K.add(L); IBE.Q.kLight = L; }
  // cortinas a los lados de la ventana (por dentro)
  { const cm = new THREE.MeshStandardMaterial({ color: 0xf6efe0, roughness: 0.9, side: THREE.DoubleSide, emissive: 0x3a2a14, emissiveIntensity: 0.3 });
    for (const s of [-1, 1]) { const cg = new THREE.PlaneGeometry(0.45, 1.5, 12, 1); const p = cg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.03 * Math.sin(p.getX(i) * 40)); cg.computeVertexNormals();
      const c2 = new THREE.Mesh(cg, cm); c2.position.set(IBE_WX + s * 0.9, yF + 1.6, kz1 - 0.05); K.add(c2); } }
  // la silla y la madre (de espaldas a la ventana, mirando a −z)
  ibeMother(K);
}

// ---------- la madre: figura sencilla (rebeca, pelo canoso con moño) + manos realistas con su móvil
function ibeMother(K) {
  const M2 = ibeMats(), o = IBE_MOM, B = new THREE.Group(); B.position.copy(o); K.add(B); IBE.Q.mom = B;
  const knit = ibeRep(canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#a9566a'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(70,20,35,.35)'; c.lineWidth = 2; for (let x = 0; x < w; x += 8) { c.beginPath(); for (let y = 0; y <= h; y += 8) c.lineTo(x + ((y / 8) % 2) * 4, y); c.stroke(); } }));
  const cardi = new THREE.MeshStandardMaterial({ map: knit, roughness: 0.95, color: 0xffffff }); IBE.Q.cardi = cardi;
  const skirt = new THREE.MeshStandardMaterial({ color: 0x2f3240, roughness: 0.9 }), hair = new THREE.MeshStandardMaterial({ color: 0xd9d4cc, roughness: 0.75 }), skin = new THREE.MeshStandardMaterial({ color: 0xd9a083, roughness: 0.6 });
  // silla
  B.add(ibeBox(0.44, 0.04, 0.42, M2.woodL, 0, 0.46, 0.02)); for (const [x, z] of [[-0.19, -0.17], [0.19, -0.17], [-0.19, 0.21], [0.19, 0.21]]) B.add(ibeBox(0.035, 0.46, 0.035, M2.woodL, x, 0.23, z));
  for (const x of [-0.19, 0.19]) B.add(ibeBox(0.035, 0.5, 0.035, M2.woodL, x, 0.71, 0.22)); B.add(ibeBox(0.42, 0.08, 0.03, M2.woodL, 0, 0.9, 0.22), ibeBox(0.42, 0.06, 0.03, M2.woodL, 0, 0.72, 0.22));
  // cuerpo
  const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.12, 6, 14), skirt); hips.rotation.z = Math.PI / 2; hips.position.set(0, 0.56, 0.04); hips.scale.set(1, 1.2, 0.9); B.add(hips);
  for (const s of [-1, 1]) { B.add(bar(v3(s * 0.09, 0.55, 0.02), v3(s * 0.1, 0.55, -0.36), 0.075, skirt)); B.add(bar(v3(s * 0.1, 0.55, -0.36), v3(s * 0.1, 0.06, -0.4), 0.06, skirt)); const sh2 = ibeBox(0.09, 0.07, 0.22, M2.iron, s * 0.1, 0.035, -0.45); B.add(sh2); }
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.3, 8, 18), cardi); torso.position.set(0, 0.86, 0.05); torso.scale.set(1.18, 1, 0.82); torso.rotation.x = 0.06; torso.castShadow = true; B.add(torso);
  const neck = cyl(0.045, 0.05, 0.1, skin, 12); neck.position.set(0, 1.12, 0.03); B.add(neck);
  const head = sph(0.095, skin, 24, 18); head.position.set(0, 1.24, 0.0); head.scale.set(0.95, 1.08, 1); B.add(head);
  const hr = sph(0.104, hair, 24, 18); hr.position.set(0, 1.265, 0.022); hr.scale.set(1, 1, 0.98); B.add(hr);
  const bun = sph(0.055, hair, 16, 12); bun.position.set(0, 1.3, 0.1); B.add(bun);
  for (const s of [-1, 1]) { const e = sph(0.018, skin, 8, 6); e.position.set(s * 0.095, 1.23, 0.0); B.add(e); }
  const glassesM = new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.4 }); for (const s of [-1, 1]) B.add(bar(v3(s * 0.093, 1.25, 0.0), v3(s * 0.088, 1.25, -0.08), 0.004, glassesM));
  IBE.Q.shoulders = [v3(-0.19, 1.0, 0.04), v3(0.19, 1.0, 0.04)];
  IBE.Q.arms = [0, 1].map(() => { const ua = cyl(0.052, 0.046, 1, cardi, 14); B.add(ua); const el = sph(0.05, cardi, 12, 10); B.add(el); return { ua, el }; });
  // el móvil (funda lila), su pantalla (chat genérico) y el «marco del móvil» PF (pantalla hacia los ojos de la madre)
  const phone = new THREE.Group(); B.add(phone); IBE.Q.phone = phone;
  const caseM = new THREE.MeshPhysicalMaterial({ color: 0x9a7fe0, roughness: 0.45, clearcoat: 0.4 });
  const body = rbox(0.074, 0.154, 0.011, caseM, 0.012); phone.add(body);
  const bez = rbox(0.07, 0.15, 0.002, new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.2 }), 0.01); bez.position.z = 0.0052; phone.add(bez);
  const cv = document.createElement('canvas'); cv.width = 540; cv.height = 1170; const ctx = cv.getContext('2d'); const stex = new THREE.CanvasTexture(cv); stex.colorSpace = THREE.SRGBColorSpace; stex.anisotropy = 8;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.143), new THREE.MeshBasicMaterial({ map: stex, toneMapped: false, color: 0xffffff })); scr.position.z = 0.0064; scr.renderOrder = 1; phone.add(scr);
  const lens = cyl(0.008, 0.008, 0.003, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 }), 16); lens.rotation.x = Math.PI / 2; lens.position.set(-0.022, 0.06, -0.006); phone.add(lens);
  IBE.Q.scr = { cv, ctx, tex: stex, key: '' };
  const PP = v3(0.0, 0.94, -0.47), eye = v3(0, 1.25, -0.06), Z = eye.clone().sub(PP).normalize(), X = v3(1, 0, 0), Y = new THREE.Vector3().crossVectors(Z, X).normalize();
  phone.position.copy(PP); phone.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); IBE.Q.PF = { X, Y, Z, P: PP };
  // las manos (escala real: 0,1 → ≈ 19 cm de la muñeca a la punta del dedo), con la manga de la rebeca
  const mkHand = left => { const hld = new THREE.Group(); B.add(hld); const h = realHand({ inside: false, left }); h.scale.set(left ? -0.1 : 0.1, 0.1, 0.1); hld.add(h);
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.5, 2.6, 18, 1, true), cardi); sl.position.y = -1.6; sl.scale.z = 0.8; h.add(sl);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 8, 20), cardi); cuff.rotation.x = Math.PI / 2; cuff.scale.y = 0.8; cuff.position.y = -0.32; h.add(cuff);
    h.userData.fingers.forEach(f => { f.bones[0].rotation.z = f.d.a * D2 * 0.35; }); return { hld, h }; };
  IBE.Q.hL = mkHand(true); IBE.Q.hR = mkHand(false);
}

// ---------- la pantalla del móvil: chat genérico (cabecera «Hijo», burbujas, caja de texto, teclado)
const IBE_KB = (() => { const K2 = {}, r1 = 'qwertyuiop', r2 = 'asdfghjklñ', r3 = 'zxcvbnm';
  [...r1].forEach((c, i) => K2[c] = [29 + i * 53.5, 842]); [...r2].forEach((c, i) => K2[c] = [29 + i * 53.5, 934]); [...r3].forEach((c, i) => K2[c] = [109 + i * 53.5, 1026]);
  K2[' '] = [270, 1112]; K2[','] = [128, 1112]; K2['?'] = [412, 1112]; K2['¿'] = K2['?']; K2.send = [492, 718]; return K2; })();
function ibeKeyOf(ch) { const c = ch.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') || ch; return IBE_KB[c] || IBE_KB[ch.toLowerCase()] || IBE_KB[' ']; }
function ibeChat(c, W2, H2, type, send) {
  const n = Math.round(clamp(type) * IBE_TXT.length), sent = send > 0.3, press = send > 0.05 && send < 0.32, slide = clamp((send - 0.3) / 0.22);
  c.fillStyle = '#e8e0d4'; c.fillRect(0, 0, W2, H2);
  c.fillStyle = 'rgba(160,140,110,.12)'; for (let i = 0; i < 60; i++) { c.beginPath(); c.arc(hash(i * 3.1) * W2, 150 + hash(i * 7.7) * 540, 6 + hash(i) * 10, 0, 7); c.fill(); }
  // barra de estado y cabecera
  c.fillStyle = '#1f2a30'; c.fillRect(0, 0, W2, 150); c.fillStyle = '#fff'; c.font = '600 26px Inter'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText('22:47', 28, 26);
  c.fillRect(470, 16, 40, 20); c.fillRect(511, 21, 4, 10); c.fillStyle = '#1f2a30'; c.fillRect(473, 19, 10, 14);
  c.strokeStyle = '#fff'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(38, 82); c.lineTo(22, 100); c.lineTo(38, 118); c.stroke();
  c.fillStyle = '#9fb3bf'; c.beginPath(); c.arc(90, 100, 34, 0, 7); c.fill(); c.fillStyle = '#e8eef2'; c.beginPath(); c.arc(90, 90, 13, 0, 7); c.fill(); c.beginPath(); c.ellipse(90, 122, 22, 14, 0, Math.PI, 0); c.fill();
  c.fillStyle = '#fff'; c.font = '700 40px Inter'; c.fillText('Hijo', 140, 92); c.font = '400 22px Inter'; c.fillStyle = '#b9c6cd'; c.fillText('últ. vez hoy a las 18:12', 140, 126);
  // mensajes
  const chip = (txt, y) => { c.font = '600 20px Inter'; const w = c.measureText(txt).width + 30; c.fillStyle = '#dce8ef'; rr(c, W2 / 2 - w / 2, y, w, 36, 10); c.fill(); c.fillStyle = '#4a5a64'; c.textAlign = 'center'; c.fillText(txt, W2 / 2, y + 19); c.textAlign = 'left'; };
  const bub = (txt, time, y, out, checks) => { c.font = '400 31px Inter'; const tw = c.measureText(txt).width, w = Math.min(430, tw + 130), x = out ? W2 - 18 - w : 18;
    c.fillStyle = 'rgba(0,0,0,.12)'; rr(c, x, y + 3, w, 70, 16); c.fill(); c.fillStyle = out ? '#d6f5c4' : '#ffffff'; rr(c, x, y, w, 70, 16); c.fill();
    c.fillStyle = '#1b1f22'; c.fillText(txt, x + 18, y + 36); c.font = '400 19px Inter'; c.fillStyle = '#7a8a80'; c.fillText(time, x + w - (checks ? 100 : 66), y + 52);
    if (checks) { c.strokeStyle = '#3a9de0'; c.lineWidth = 3.2; c.lineCap = 'round'; for (const dx of [0, 10]) { c.beginPath(); c.moveTo(x + w - 42 + dx, y + 51); c.lineTo(x + w - 36 + dx, y + 57); c.lineTo(x + w - 24 + dx, y + 45); c.stroke(); } } };
  chip('AYER', 172); bub('Mañana te llamo, mamá', '21:05', 226, false); bub('Vale, cariño. Abrígate', '21:06', 312, true, true); chip('HOY', 404);
  if (sent) { c.save(); c.globalAlpha = clamp(slide * 1.6); c.translate(0, (1 - eo(slide)) * 210); bub(IBE_TXT, '22:47', 456, true, true); c.restore(); }
  // caja de texto y botón de enviar
  c.fillStyle = '#e8e0d4'; c.fillRect(0, 676, W2, 90);
  c.fillStyle = '#ffffff'; rr(c, 14, 686, 430, 66, 33); c.fill();
  c.font = '400 30px Inter'; if (!sent && n > 0) { c.fillStyle = '#1b1f22'; c.fillText(IBE_TXT.slice(0, n), 40, 720); const cw = c.measureText(IBE_TXT.slice(0, n)).width; if ((NOW * 2 % 1) < 0.6) c.fillRect(42 + cw, 702, 3, 36); }
  else { c.fillStyle = '#9aa3a8'; c.fillText('Mensaje', 40, 720); }
  const sc = press ? 0.86 : 1; c.fillStyle = press ? '#1f9a52' : '#25b864'; c.beginPath(); c.arc(492, 718, 34 * sc, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(478, 702); c.lineTo(510, 718); c.lineTo(478, 734); c.lineTo(483, 718); c.closePath(); c.fill();
  // teclado
  c.fillStyle = '#cfd3d9'; c.fillRect(0, 776, W2, H2 - 776);
  const cur = n > 0 && !sent && type < 1 ? IBE_TXT[n - 1] : null, curK = cur ? ibeKeyOf(cur) : null, fr = (clamp(type) * IBE_TXT.length) % 1, keyDown = curK && fr < 0.45;
  const key = (lab, x, y, w, dark) => { const dn = keyDown && curK[0] === x && curK[1] === y; c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, x - w / 2, y - 38 + 3, w, 76, 9); c.fill(); c.fillStyle = dn ? '#9fb0c4' : dark ? '#aeb4bd' : '#ffffff'; rr(c, x - w / 2, y - 38, w, 76, 9); c.fill();
    c.fillStyle = '#1b1f22'; c.font = '400 36px Inter'; c.textAlign = 'center'; c.fillText(lab, x, y + 2); c.textAlign = 'left'; };
  for (const ch of 'qwertyuiopasdfghjklñzxcvbnm') { const [x, y] = IBE_KB[ch]; key(ch, x, y, 47); }
  key('⇧', 36, 1026, 62, true); key('⌫', 504, 1026, 62, true); key('123', 46, 1112, 76, true); key(',', 128, 1112, 50); key('', 270, 1112, 220); key('¿?', 412, 1112, 50); key('↵', 490, 1112, 76, true);
  c.fillStyle = '#6c737b'; c.font = '400 22px Inter'; c.textAlign = 'center'; c.fillText('espacio', 270, 1114); c.textAlign = 'left';
  if (keyDown) { const [x, y] = curK; c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, x - 36, y - 150, 72, 100, 12); c.fill(); c.fillStyle = '#fff'; rr(c, x - 36, y - 152, 72, 100, 12); c.fill(); c.fillStyle = '#1b1f22'; c.font = '500 50px Inter'; c.textAlign = 'center'; c.fillText(cur === ' ' ? '␣' : cur.toLowerCase(), x, y - 100); c.textAlign = 'left'; }
}
function ibeScreen(type, send) {
  const sc = IBE.Q.scr, n = Math.round(clamp(type) * IBE_TXT.length), fr = Math.floor((clamp(type) * IBE_TXT.length % 1) * 4), blink = (NOW * 2 % 1) < 0.6 ? 1 : 0;
  const key = `${n}|${fr}|${Math.round(send * 40)}|${blink}`; if (key === sc.key) return; sc.key = key;
  ibeChat(sc.ctx, 540, 1170, type, send); sc.tex.needsUpdate = true;
}
// del lienzo (px) al marco de la madre (B): punto en la pantalla del móvil
function ibeScreenP(px, py, lift = 0) { const F = IBE.Q.PF; return F.P.clone().addScaledVector(F.X, (px / 540 - 0.5) * 0.066).addScaledVector(F.Y, (0.5 - py / 1170) * 0.143).addScaledVector(F.Z, 0.0066 + lift); }
// coloca una mano: base (x de la mano, dedos, dorso) en el marco B, y la mueve para que su punto local `lp` caiga en `target`
const _ibeV = new THREE.Vector3();
function ibePlaceHand(H3, yDir, zDir, lp, target) {
  const y = yDir.clone().normalize(), z = zDir.clone().sub(y.clone().multiplyScalar(zDir.dot(y))).normalize(), x = new THREE.Vector3().crossVectors(y, z);
  H3.hld.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); H3.hld.position.set(0, 0, 0); H3.hld.updateMatrix();
  const B = IBE.Q.mom; B.updateMatrixWorld(true); const pW = lp.isObject3D ? wpos(lp, _ibeV) : H3.h.localToWorld(_ibeV.copy(lp)); const pB = B.worldToLocal(pW.clone());
  H3.hld.position.copy(target).sub(pB);
}
function ibeHands(t, type, send) {
  const Q = IBE.Q, F = Q.PF;
  // mano izquierda: sujeta el móvil por detrás (palma contra la espalda del móvil, el pulgar por el borde izquierdo, los dedos por el derecho)
  handPose2(Q.hL.h, [0.3, 0.22, 0.26, 0.3, 0.34]);
  const dL = F.Y.clone().multiplyScalar(Math.cos(0.6)).addScaledVector(F.X, Math.sin(0.6));
  ibePlaceHand(Q.hL, dL, F.Z.clone().negate(), v3(-0.02, 0.45, -0.16), F.P.clone().addScaledVector(F.Y, -0.035).addScaledVector(F.X, 0.002).addScaledVector(F.Z, -0.012));
  // mano derecha: el índice escribe (tecla de cada letra) y luego pulsa «enviar»
  handPose2(Q.hR.h, [0.55, 0.35, 1.45, 1.55, 1.6]);
  const N = IBE_TXT.length, f = clamp(type) * N, i = Math.min(N - 1, Math.floor(f)), fr = f - Math.floor(f);
  let tp, lift;
  if (send > 0) { const a = ibeKeyOf(IBE_TXT[N - 1]), b = IBE_KB.send, u = eio(clamp(send / 0.12)); tp = [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
    lift = send < 0.12 ? 0.022 * Math.sin(u * Math.PI) + 0.004 : send < 0.3 ? 0.004 + 0.02 * (1 - Math.sin(clamp((send - 0.12) / 0.18) * Math.PI)) * (send > 0.2 ? 1 : 0.2) : 0.004 + 0.03 * eo(clamp((send - 0.3) / 0.3)); }
  else if (type <= 0) { const a = ibeKeyOf(IBE_TXT[0]); tp = a; lift = 0.03; }
  else { const a = ibeKeyOf(IBE_TXT[Math.max(0, i - 1)]), b = ibeKeyOf(IBE_TXT[i]); const u = eio(clamp(fr / 0.4)); tp = i === 0 ? b : [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
    lift = 0.003 + 0.016 * (fr < 0.45 ? Math.sin(clamp(fr / 0.45) * Math.PI) : 0) + (fr > 0.45 ? 0.0 : 0); if (type >= 1) lift = 0.012; }
  const dR = F.Y.clone().multiplyScalar(0.8).addScaledVector(F.X, -0.55).addScaledVector(F.Z, -0.25), tip = Q.hR.h.userData.fingers[0].nail;
  ibePlaceHand(Q.hR, dR, F.Z.clone().addScaledVector(F.Y, -0.2), tip, ibeScreenP(tp[0], tp[1], lift + 0.004));
  // los brazos (de la manga al hombro)
  [Q.hL, Q.hR].forEach((H3, k) => { const B = Q.mom; const el = B.worldToLocal(H3.h.localToWorld(v3(0.02, -2.9, 0))); const sh = Q.shoulders[k], A = Q.arms[k];
    const d = el.clone().sub(sh), L = d.length(); A.ua.scale.set(1, L, 1); A.ua.position.copy(sh).add(el).multiplyScalar(0.5); A.ua.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize()); A.el.position.copy(el); });
}

// ---------- la estación del cable (Portugal) y la arqueta de la playa
function ibeStation(g) {
  const M2 = ibeMats(), cx = 10.4, cz = 10, G = ibeG(cx) + 0.09, w = 4.4, d = 3.6, h = 3.0;
  const b = mesh(ibeUV(new THREE.BoxGeometry(w, h + 0.4, d), w / 3, h / 3), M2.concrete); b.position.set(cx, G + h / 2 - 0.2, cz); g.add(b);
  for (const [a, c2, x, z] of [[w + 0.1, 0.15, cx, cz + d / 2], [w + 0.1, 0.15, cx, cz - d / 2], [0.15, d, cx - w / 2, cz], [0.15, d, cx + w / 2, cz]]) g.add(ibeBox(a, 0.35, c2, M2.concrete, x, G + h + 0.17, z));
  g.add(ibeBox(1.1, 2.1, 0.06, M2.grey, cx + 0.8, G + 1.05, cz + d / 2 + 0.02)); for (let i = 0; i < 6; i++) g.add(ibeBox(0.7, 0.03, 0.02, M2.iron, cx - 1.2, G + 1.6 + i * 0.09, cz + d / 2 + 0.02));
  g.add(ibeBox(0.9, 0.55, 0.06, M2.iron, cx - 1.2, G + 1.82, cz + d / 2 + 0.01));
  const ac = ibeBox(0.8, 0.6, 0.35, M2.white, cx - w / 2 - 0.2, G + 0.6, cz - 0.6); g.add(ac); { const fan = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), M2.iron); fan.rotation.y = -Math.PI / 2; fan.position.set(cx - w / 2 - 0.38, G + 0.6, cz - 0.6); g.add(fan); }
  // la luz (fría, sobre la puerta) + el piloto cian (aquí sale/entra la luz del cable)
  const lamp = ibeBox(0.35, 0.1, 0.22, M2.iron, cx + 0.8, G + 2.4, cz + d / 2 + 0.12); g.add(lamp); const lb = ibeBox(0.3, 0.02, 0.18, new THREE.MeshStandardMaterial({ color: 0, emissive: 0xfff2d8, emissiveIntensity: 3 }), cx + 0.8, G + 2.34, cz + d / 2 + 0.12); g.add(lb);
  const lg = ibeGlow(0xffe9c8, 2.2, 0.9); lg.position.set(cx + 0.8, G + 2.3, cz + d / 2 + 0.25); g.add(lg);
  const pil = sph(0.05, new THREE.MeshStandardMaterial({ color: 0, emissive: COL.light, emissiveIntensity: 2.5 }), 10, 8); pil.position.set(cx + 0.1, G + 2.4, cz + d / 2 + 0.03); g.add(pil); IBE.Q.stPil = pil;
  // valla (postes + malla) alrededor
  const mt = canvasTex(64, 64, (c, w2, h2) => { c.strokeStyle = 'rgba(200,205,210,.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(w2, h2); c.moveTo(w2, 0); c.lineTo(0, h2); c.stroke(); }); ibeRep(mt);
  const meshM = new THREE.MeshStandardMaterial({ map: mt, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 });
  const fx0 = cx - 3.4, fx1 = cx + 3.2, fz0 = cz - 3, fz1 = cz + 3.2, fh = 1.7;
  for (const [a2, b2] of [[[fx0, fz1], [cx - 0.2, fz1]], [[cx + 1.8, fz1], [fx1, fz1]], [[fx1, fz1], [fx1, fz0]], [[fx1, fz0], [fx0, fz0]], [[fx0, fz0], [fx0, fz1]]]) {
    const L = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]), pg = ibeUV(new THREE.PlaneGeometry(L, fh), L * 5, fh * 5), p = new THREE.Mesh(pg, meshM); p.position.set((a2[0] + b2[0]) / 2, ibeG((a2[0] + b2[0]) / 2) + 0.09 + fh / 2, (a2[1] + b2[1]) / 2); p.rotation.y = -Math.atan2(b2[1] - a2[1], b2[0] - a2[0]); g.add(p);
    for (let k = 0; k <= Math.ceil(L / 2); k++) { const u = k / Math.ceil(L / 2), x = lerp(a2[0], b2[0], u), z = lerp(a2[1], b2[1], u); g.add(ibeBox(0.06, fh + 0.1, 0.06, M2.grey, x, ibeG(x) + 0.09 + fh / 2, z)); } }
  // la arqueta en la playa (tapa de hormigón)
  { const ax = 3, az = CABLE_Z, ay = ibeG(ax); g.add(ibeBox(1.3, 0.35, 1.3, M2.concrete, ax, ay + 0.05, az)); g.add(ibeBox(1.0, 0.06, 1.0, M2.grey, ax, ay + 0.25, az));
    for (const s of [-1, 1]) g.add(ibeBox(0.1, 0.04, 0.5, M2.iron, ax + s * 0.3, ay + 0.29, az)); }
  return v3(cx, G, cz);
}

// ---------- la antena: torre de celosía de 25 m, paneles, luz roja, armario y valla
function ibeTower(g) {
  const M2 = ibeMats(), T = new THREE.Group(), G = IBE_TWG + 0.05, Hh = IBE_TWH; T.position.set(IBE_TWX, 0, IBE_TWZ); g.add(T);
  const hw = y => lerp(1.6, 0.55, clamp((y - G) / (Hh - 2))), C = (y, sx, sz) => v3(sx * hw(y), y, sz * hw(y));
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]], nS = 9, lv = k => G + k * (Hh - 2) / nS;
  for (const [sx, sz] of corners) T.add(bar(C(G, sx, sz), C(G + Hh - 2, sx, sz), 0.07, M2.steel, 6));
  for (let k = 0; k < nS; k++) for (let e = 0; e < 4; e++) { const [ax, az] = corners[e], [bx2, bz] = corners[(e + 1) % 4];
    T.add(bar(C(lv(k), ax, az), C(lv(k + 1), bx2, bz), 0.035, M2.steel, 5), bar(C(lv(k), bx2, bz), C(lv(k + 1), ax, az), 0.035, M2.steel, 5), bar(C(lv(k + 1), ax, az), C(lv(k + 1), bx2, bz), 0.04, M2.steel, 5)); }
  // mástil de arriba, plataforma y paneles
  const top = G + Hh - 2; T.add(bar(v3(0, top - 1, 0), v3(0, G + Hh + 1.2, 0), 0.08, M2.steel, 8));
  for (let e = 0; e < 4; e++) { const [ax, az] = corners[e], [bx2, bz] = corners[(e + 1) % 4]; T.add(bar(v3(ax * 1.1, top, az * 1.1), v3(bx2 * 1.1, top, bz * 1.1), 0.05, M2.steel, 5)); }
  const panM = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.4, emissive: COL.light, emissiveIntensity: 0.0 }); IBE.Q.panM = panM;
  IBE.Q.panels = [];
  for (const [a, r] of [[0, 1.25], [2.1, 1.25], [-2.1, 1.25]]) { const dx = Math.sin(a), dz = Math.cos(a), p = rbox(0.32, 1.7, 0.14, panM, 0.05); p.position.set(dx * r, top + 0.9, dz * r); p.rotation.y = a; T.add(p); IBE.Q.panels.push(p);
    T.add(bar(v3(dx * 0.4, top + 0.9, dz * 0.4), v3(dx * (r - 0.08), top + 0.9, dz * (r - 0.08)), 0.03, M2.steel, 5)); }
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.25, 24), M2.white); dish.rotation.x = Math.PI / 2; dish.position.set(0.7, top - 1.6, -0.6); dish.rotation.y = 2.5; T.add(dish);
  // luz roja de balizamiento
  const bm = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2a1a, emissiveIntensity: 3 }), bc = sph(0.13, bm, 12, 8); bc.position.y = G + Hh + 1.25; T.add(bc); const bg = ibeGlow(0xff3020, 2.6, 1.0); bg.position.copy(bc.position); T.add(bg); IBE.Q.beacon = { m: bm, g: bg };
  // escalera de cables por el centro (donde baja la fibra)
  T.add(bar(v3(0.32, G, 0.32), v3(0.32, top + 0.5, 0.32), 0.025, M2.grey, 4), bar(v3(0.32, G, 0.12), v3(0.32, top + 0.5, 0.12), 0.025, M2.grey, 4));
  // base: losa, armario de equipos, valla
  T.add(ibeBox(5.2, 0.25, 5.2, M2.concrete, 0, G, 0));
  const arm = rbox(1.2, 1.7, 0.8, new THREE.MeshStandardMaterial({ color: 0xd8dccf, roughness: 0.6, emissive: 0x161a22, emissiveIntensity: 0.6 }), 0.04); arm.position.set(1.9, G + 0.98, 1.4); T.add(arm);
  for (let i = 0; i < 3; i++) { const led = sph(0.025, new THREE.MeshStandardMaterial({ color: 0, emissive: 0x3cff7a, emissiveIntensity: 2.5 }), 8, 6); led.position.set(1.6 + i * 0.12, G + 1.6, 1.81); T.add(led); }
  T.add(ibeBox(0.02, 1.5, 0.02, M2.grey, 2.0, G + 0.95, 1.81));
  const mt = canvasTex(64, 64, (c, w2, h2) => { c.strokeStyle = 'rgba(200,205,210,.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(w2, h2); c.moveTo(w2, 0); c.lineTo(0, h2); c.stroke(); }); ibeRep(mt);
  const meshM = new THREE.MeshStandardMaterial({ map: mt, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 });
  for (const [x, z, ry] of [[0, 3, 0], [0, -3, 0], [3, 0, Math.PI / 2], [-3, 0, Math.PI / 2]]) { const p = new THREE.Mesh(ibeUV(new THREE.PlaneGeometry(6, 2), 30, 10), meshM); p.position.set(x, G + 1, z); p.rotation.y = ry; T.add(p); }
  for (const [x, z] of [[-3, -3], [3, -3], [3, 3], [-3, 3], [0, 3], [0, -3], [3, 0], [-3, 0]]) T.add(ibeBox(0.07, 2.1, 0.07, M2.grey, x, G + 1.05, z));
  return { top, G };
}

// ---------- el cable: antena → torre → tubo bajo la calle → estación → arqueta → mar (z = 6)
function ibeConduit() {
  const G = IBE_TWG, y = IBE_TY, X = IBE_TWX, Z = IBE_TWZ, top = G + IBE_TWH - 2, zc = IBE_TZ - 0.12, sx = 10.4, sG = ibeG(10.4) + 0.09, ax = 3, ay = ibeG(3);
  const P = [[X + 0.1, top + 0.9, Z + 1.15], [X + 0.25, top + 0.5, Z + 0.6], [X + 0.32, top, Z + 0.22], [X + 0.32, top - 6, Z + 0.22], [X + 0.32, G + 8, Z + 0.22], [X + 0.32, G + 1, Z + 0.22], [X + 0.32, G - 0.4, Z + 0.4],
    [X + 0.2, y + 0.1, Z + 1.2], [X, y, Z + 3], [X, y, 6], [X, y, 12], [X, y, zc - 2], [X - 0.6, y, zc - 0.4], [X - 2, y, zc], [25, y, zc], [20, y, zc], [15, y, zc], [12, y, zc], [10.6, y, zc - 0.4], [10.0, y, zc - 2],
    [sx - 0.4, y, 14], [sx - 0.4, y + 0.4, 12.6], [sx - 0.4, sG + 0.2, 11.6], [sx - 0.5, sG + 0.5, 10.6], [sx - 1.6, sG + 0.4, 9.6], [sx - 2.6, sG - 0.3, 8.6], [7.6, ibeG(7.6) - 0.6, 7.4],
    [5.6, ibeG(5.6) - 0.5, 6.4], [4.2, ay - 0.2, CABLE_Z + 0.05], [ax, ay + 0.1, CABLE_Z], [ax - 0.7, ibeG(ax - 0.7) + 0.03, CABLE_Z], [1.6, ibeG(1.6) + 0.035, CABLE_Z], [0.8, ibeG(0.8) + 0.035, CABLE_Z], [0, ibeG(0) + 0.0, CABLE_Z]].map(p => v3(...p));
  const cv = new THREE.CatmullRomCurve3(P, false, 'centripetal'); cv.arcLengthDivisions = 3000; return cv;
}
function ibeUOf(cv, p) { let best = 0, bd = 1e9; for (let i = 0; i <= 3000; i++) { const u = i / 3000, d = cv.getPointAt(u).distanceToSquared(p); if (d < bd) { bd = d; best = u; } } return best; }

// ---------- las ondas (anillos cian que van de la ventana a los paneles de la antena)
function ibeWavePath() { const top = IBE_TWG + IBE_TWH - 2 + 0.9;
  return new THREE.CatmullRomCurve3([v3(IBE_WX, IBE_WY, IBE_WZ + 0.4), v3(IBE_WX - 0.4, IBE_WY + 2.2, IBE_WZ + 2.6), v3(38.5, IBE_YF + 9, 10.5), v3(35, top - 7, 3), v3(32, top - 1.5, -2.6), v3(IBE_TWX + 0.25, top, IBE_TWZ + 1.5)], false, 'centripetal'); }

// ---------------------------------------------------------------- construir
function buildIberia() {
  const M2 = ibeMats(), g = new THREE.Group(), Q = IBE.Q; g.name = 'iberia'; IBE.root = g;
  ibeTerrain(g);
  // el pueblo: fila de delante (fachadas a la calle de delante, z = 13) y fila de atrás (fachadas a la calle de atrás, z = 0)
  const F = [
    { x0: 15.5, x1: 21.8, z0: 7, z1: 13, h: 5.6, roof: 'gable', zoc: 0, sh: 0, lit: [1, 0, 0, 2], door: 1, balcony: true, balIdx: 0, pots: 2 },
    { x0: 22.2, x1: 27.8, z0: 7.4, z1: 13, h: 3.3, roof: 'flat', zoc: 2, sh: 1, lit: [0, 1], door: 0, pots: 3 },
    { x0: 32.2, x1: 36.6, z0: 7, z1: 13, h: 5.6, roof: 'gable', zoc: 1, sh: 2, lit: [0, 2, 1], door: 0, balcony: true, balIdx: 1 },
    { x0: 44.4, x1: 50, z0: 7, z1: 13, h: 5.6, roof: 'gable', zoc: 0, sh: 1, lit: [2, 0, 0, 1], door: 1, balcony: true, balIdx: 1, pots: 2 },
    { x0: 50.4, x1: 57.5, z0: 7.4, z1: 13, h: 3.4, roof: 'flat', zoc: 1, sh: 0, lit: [0, 1, 0], door: 2, pots: 4 },
    { x0: 14, x1: 20.5, z0: -8, z1: 0, h: 5.4, roof: 'gable', zoc: 2, sh: 3, lit: [0, 1, 2, 0], door: 2, balcony: true, balIdx: 2 },
    { x0: 20.9, x1: 25.6, z0: -6.5, z1: 0, h: 3.3, roof: 'flat', zoc: 0, sh: 1, lit: [1, 0], door: 1, pots: 2 },
    { x0: 35, x1: 41, z0: -7.5, z1: 0, h: 5.6, roof: 'gable', zoc: 1, sh: 0, lit: [0, 0, 1, 0], door: 0, balcony: true, balIdx: 1 },
    { x0: 41.4, x1: 47, z0: -6, z1: 0, h: 3.3, roof: 'flat', zoc: 2, sh: 2, lit: [2, 0], door: 1 },
  ];
  for (const o of F) ibeHouse(g, o);
  ibeChurch(g);
  ibeMotherHouse(g);
  const st = ibeStation(g), tw = ibeTower(g);
  // farolas, árboles, una luz de calle
  for (const [x, z] of [[14.6, 19.3], [24.5, 19.3], [45.5, 19.3], [56, 19.3], [27.8, 4.9], [48, 4.9]]) ibeLampPost(g, x, z);
  for (const [x, z, s] of [[22, -14, 1], [30, -14.5, 1.2], [42, -15, 1], [54, -14, 1.1], [12, -15, 0.9], [9.5, -4, 0.8], [57, 2.5, 0.8]]) ibeOlive(g, x, z, s);
  for (const [x, z] of [[33.5, -9.5], [35.5, -12], [26.5, -12], [8.8, 2.5], [59, -6]]) ibeCypress(g, x, z, 1);
  const sl = new THREE.PointLight(0xffb36a, 60, 26, 2); sl.position.set(37.5, ibeG(37) + 5.2, 17.2); g.add(sl); Q.streetLight = sl;
  // el cable (negro) + su luz (tubo aditivo con color por vértice) + la cabeza del pulso
  const cv = ibeConduit(); Q.cv = cv;
  const cab = new THREE.Mesh(new THREE.TubeGeometry(cv, 900, 0.055, 8, false), M2.cable); cab.castShadow = true; g.add(cab);
  const gg = new THREE.TubeGeometry(cv, 900, 0.085, 8, false), nC = gg.attributes.position.count; gg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(nC * 3), 3));
  const glow = new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); glow.renderOrder = 5; glow.frustumCulled = false; g.add(glow); Q.glow = glow;
  const head = ibeGlow(0xdffeff, 2.2, 2.4); head.renderOrder = 6; g.add(head); Q.head = head; const head2 = ibeGlow(COL.light, 4.5, 0.8); head2.renderOrder = 6; g.add(head2); Q.head2 = head2;
  const pl = new THREE.PointLight(COL.light, 0, 5, 2); g.add(pl); Q.pLight = pl;
  const towerTopP = cv.getPointAt(0);
  Q.uAnt = 0; Q.uSta = ibeUOf(cv, v3(10.4 - 0.5, ibeG(10.4) + 0.59, 10.6)); Q.uSea = 1;
  // la burbuja del mensaje y las ondas
  const bub = msgBubble(IBE_TXT); bub.visible = false; g.add(bub); Q.bub = bub;
  Q.wp = ibeWavePath();
  const ringM = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.light).multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
  Q.rings = []; for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.032, 8, 72), ringM()); r.visible = false; r.renderOrder = 7; g.add(r); Q.rings.push(r); }
  Q.burst = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.light).multiplyScalar(1.3), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); Q.burst.visible = false; g.add(Q.burst);
  Q.antFlash = ibeGlow(COL.light, 6, 1.4); Q.antFlash.position.copy(Q.wp.getPointAt(1)); Q.antFlash.visible = false; g.add(Q.antFlash);
  // anclas (marco local)
  const B = Q.mom; g.updateMatrixWorld(true);
  g.userData.anchors = {
    window: v3(IBE_WX, IBE_WY, IBE_WZ + 0.1), phone: g.worldToLocal(wpos(Q.phone)), antenna: Q.wp.getPointAt(1), towerBase: v3(IBE_TWX, IBE_TWG, IBE_TWZ), towerTop: v3(IBE_TWX, IBE_TWG + IBE_TWH + 1.3, IBE_TWZ),
    station: v3(st.x, st.y + 3.2, st.z), manhole: v3(3, ibeG(3) + 0.3, CABLE_Z), kitchenCam: v3(...IBE_CAM_IN(1).slice(0, 3)), conduitCut: v3(20, IBE_TY, IBE_TZ), sea: v3(0, 0, CABLE_Z), conduit: cv, clock: g.worldToLocal(wpos(Q.clock)),
  };
  iberiaAt(0, {}); return g;
}
function ibeChurch(g) {      // la iglesia (espadaña blanca con campana) al fondo
  const M2 = ibeMats(), x0 = 48, x1 = 57, z0 = -12, z1 = 0, G = ibeG(52) + 0.09;
  ibeHouse(g, { x0, x1, z0, z1, h: 6.5, roof: 'gable', zoc: 0, sh: 2, lit: [0, 0, 0, 0, 0, 0], door: 1, noReja: true, rh: 2.2 });
  const tw = mesh(ibeUV(new THREE.BoxGeometry(3, 11, 3), 1.2, 4), M2.wall); tw.position.set(55.5, G + 5.5, -1.5); g.add(tw);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.2, 4), M2.roof); cap.rotation.y = Math.PI / 4; cap.position.set(55.5, G + 12.1, -1.5); cap.castShadow = true; g.add(cap);
  const arch = ibeBox(1.3, 1.8, 3.05, new THREE.MeshStandardMaterial({ color: 0x0c1020, roughness: 1 }), 55.5, G + 9.3, -1.5); g.add(arch);
  const bell = lathe([[0.001, 0.75], [0.25, 0.7], [0.35, 0.4], [0.42, 0.05], [0.48, 0]], 20, new THREE.MeshStandardMaterial({ color: 0xb48a3a, roughness: 0.35, metalness: 0.8 })); bell.position.set(55.5, G + 8.7, -0.2); g.add(bell);
  const clk = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff0d0, emissiveIntensity: 1.1 })); clk.position.set(55.5, G + 7.0, 0.02); g.add(clk);
  const cross = new THREE.Group(); cross.add(ibeBox(0.1, 1.0, 0.1, M2.iron, 0, 0, 0), ibeBox(0.55, 0.1, 0.1, M2.iron, 0, 0.18, 0)); cross.position.set(55.5, G + 13.6, -1.5); g.add(cross);
}

// ---------------------------------------------------------------- animar
const _ibeC = new THREE.Color();
function iberiaAt(t, o = {}) {
  const Q = IBE.Q, type = clamp(o.type ?? 0), send = clamp(o.send ?? 0), waves = clamp(o.waves ?? 0), pulse = clamp(o.pulse ?? 0), pulse2 = clamp(o.pulse2 ?? 0);
  ibeScreen(type, send); ibeHands(t, type, send);
  // la burbuja: sale de la pantalla y flota (send 0,45→1); con las ondas (waves 0→0,3) cruza la cocina y sale por la ventana; ahí se deshace en anillos
  const bub = Q.bub, F = Q.PF, rise = eo(clamp((send - 0.45) / 0.55)), fly = eio(clamp(waves / 0.3)), pop = clamp((waves - 0.28) / 0.08);
  const pS = Q.mom.localToWorld(ibeScreenP(270, 500, 0.01)), pH = Q.mom.localToWorld(ibeScreenP(270, 500, 0.01).addScaledVector(F.Z, 0.045).addScaledVector(F.Y, 0.035)), win0 = v3(IBE_WX, IBE_WY + 0.1, IBE_WZ + 0.6);
  if (send > 0.45 && pop < 1) {
    let p; if (waves <= 0) p = pS.clone().lerp(pH, rise); else { const mid = pH.clone().lerp(win0, 0.5).add(v3(0, 0.12, 0)); p = pH.clone().multiplyScalar((1 - fly) * (1 - fly)).addScaledVector(mid, 2 * fly * (1 - fly)).addScaledVector(win0, fly * fly); }
    bub.visible = true; bub.position.copy(IBE.root.worldToLocal(p)); bub.position.y += 0.01 * Math.sin(t * 5) * rise;
    const s = (waves <= 0 ? lerp(0.05, 0.075, rise) : lerp(0.075, 0.5, fly * fly)) * (1 + 0.35 * Math.sin(pop * Math.PI)) * (1 - eo(pop));
    bub.scale.setScalar(Math.max(0.001, s)); const qA = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(F.X, F.Y, F.Z)), qB = new THREE.Quaternion();
    bub.quaternion.copy(qA).slerp(qB, eo(fly));
  } else bub.visible = false;
  // destello al deshacerse
  const bk = clamp((waves - 0.3) / 0.16); Q.burst.visible = false && bk < 1;   // (el destello en esfera envolvía la cámara junto a la ventana: apagado) if (Q.burst.visible) { Q.burst.position.copy(win0); Q.burst.scale.setScalar(0.25 + 1.1 * eo(bk)); Q.burst.material.opacity = 0.35 * (1 - bk); }
  // los anillos: salen de la ventana uno tras otro y crecen mientras viajan a la antena (el primero llega con waves ≈ 0,69; el último con waves = 1)
  const wv = (waves - 0.3) / 0.7, k = 1 / 0.55, gap = (k - 1) / (Q.rings.length - 1);
  Q.rings.forEach((r, i) => { const s = wv * k - i * gap; r.visible = waves > 0.3 && s > 0 && s < 1; if (!r.visible) return;
    const p = Q.wp.getPointAt(s), tg = Q.wp.getTangentAt(s); r.position.copy(p); r.quaternion.setFromUnitVectors(v3(0, 0, 1), tg); r.scale.setScalar(0.4 + 1.6 * Math.sin(Math.min(s, 0.75) / 0.75 * Math.PI / 2) - 0.4 * clamp((s - 0.85) / 0.15));
    r.material.opacity = Math.min(1, s / 0.05, (1 - s) / 0.08) * 0.85; });
  const arrive = clamp((waves - 0.68) / 0.32); Q.panM.emissiveIntensity = waves > 0.68 ? 0.6 + 0.9 * Math.abs(Math.sin(waves * 40)) * (1 - 0.5 * arrive) + 0.5 * clamp((pulse) * 3) * (1 - pulse) : 0;
  Q.antFlash.visible = waves > 0.68 || (pulse > 0 && pulse < 0.15); Q.antFlash.material.opacity = waves > 0.68 && pulse <= 0 ? 0.6 + 0.4 * Math.sin(t * 20) : clamp(1 - pulse / 0.15);
  // el pulso de luz por el cable
  const g2 = Q.glow.geometry, cA = g2.attributes.color, seg = 900, rad = 9, Lc = Q.cv.getLength();
  const on = pulse > 0 || pulse2 > 0, uh = pulse2 > 0 ? lerp(Q.uSta, Q.uSea, pulse2) : lerp(Q.uAnt, Q.uSta, pulse), wH = 1.2 / Lc;
  for (let i = 0; i <= seg; i++) { const u = i / seg; let v = 0;
    if (on) { const d = (u - uh) / wH; v = 3.2 * Math.exp(-d * d); if (u < uh) v += 0.55 + 0.9 * Math.exp((u - uh) / (6 / Lc)); }
    _ibeC.setRGB(0.45 * v, 0.92 * v, 1.0 * v); for (let j = 0; j <= rad; j++) cA.setXYZ(i * (rad + 1) + j, _ibeC.r, _ibeC.g, _ibeC.b); }
  cA.needsUpdate = true; Q.glow.visible = on;
  const hp = Q.cv.getPointAt(clamp(uh)); for (const h of [Q.head, Q.head2]) { h.visible = on && uh < 0.999; h.position.copy(hp); }
  Q.head.scale.setScalar(1.3 + 0.2 * Math.sin(t * 30)); Q.pLight.position.copy(hp); Q.pLight.intensity = on ? 6 : 0;
  Q.stPil.material.emissiveIntensity = 1.5 + (Math.abs(uh - Q.uSta) < 0.02 && on ? 6 : 0);
  // la luz roja de la torre parpadea
  const bl = 0.5 + 0.5 * Math.sin(t * 2.6); Q.beacon.m.emissiveIntensity = 1 + 3.5 * bl; Q.beacon.g.material.opacity = 0.35 + 0.65 * bl;
}

// ---------------------------------------------------------------- cámaras (marco local): [px,py,pz, lx,ly,lz, fov]
// el plano de la cocina: casi el punto de vista de la madre, un poco a su derecha, a 30 cm de su móvil
const IBE_KC = { p: [IBE_MOM.x + 0.11, IBE_YF + 1.157, IBE_MOM.z - 0.183], l: [IBE_MOM.x, IBE_YF + 0.928, IBE_MOM.z - 0.462] };
function ibeCam(u, KS) { const c = camKeys(u, KS); return [c.p.x, c.p.y, c.p.z, c.l.x, c.l.y, c.l.z, c.f]; }
// entrada (≈ 1,8 s): desde muy alto sobre el mar baja al pueblo, se mete por la ventana de la cocina y pasa junto a la madre hasta su móvil
function IBE_CAM_IN(u) {
  return ibeCam(u, [
    [0, [-170, 230, 150], [32, 4, 4], 34],
    [0.42, [58, 26, 62], [40, 5, 12], 36],
    [0.7, [40.6, IBE_YF + 2.6, 19.5], [40.2, IBE_WY - 0.1, 12], 38],
    [0.84, [40.2, IBE_WY + 0.05, 13.3], [39.6, IBE_YF + 1.1, 10.8], 40],
    [0.93, [39.85, IBE_YF + 1.42, 11.75], [39.35, IBE_YF + 0.95, 10.9], 38],
    [1, IBE_KC.p, IBE_KC.l, 34]]);
}
// salida (≈ 5 s): retrocede por la ventana delante de la burbuja, plano medio ventana-calle-torre con los anillos, sube a la antena,
// baja por la torre y acaba mirando el corte del tubo bajo la calle con la luz corriendo.
// Sincronía pensada: waves ≈ clamp(u / 0,52) · pulse ≈ clamp((u − 0,55) / 0,45) · (pulse2 después, con otra cámara)
function IBE_CAM_OUT(u) {
  const top = IBE_TWG + IBE_TWH - 2;
  return ibeCam(u, [
    [0, IBE_KC.p, IBE_KC.l, 34],
    [0.06, [39.85, IBE_YF + 1.45, 11.85], [39.35, IBE_YF + 1.0, 10.9], 38],
    [0.12, [40.2, IBE_WY + 0.05, 12.95], [39.7, IBE_YF + 1.1, 10.4], 42],
    [0.2, [40.6, IBE_WY + 0.9, 17.5], [40.2, IBE_WY + 0.3, 12], 44],
    [0.34, [46, 10, 36], [35, 12, 4], 46],
    [0.6, [39, top + 2, 10], [30.5, top + 0.2, -5], 40],
    [0.74, [37.5, 13, 9], [30.4, 7, -5.5], 42],
    [0.8, [39, 11.5, 23], [30, 3.5, 19], 44],
    [0.88, [35, 5.5, 30], [26, 2.4, 20], 44],
    [1, [31.5, 4.3, 26.5], [17.5, 2.0, 19.8], 44]]);
}
// ---------------------------------------------------------------- 24 · DENTRO DE LA FIBRA (decorado micro, prefijo fib). Escala propia: 1 unidad = 10 µm.
// Fibra monomodo «pelada» (sin la funda de plástico de 250 µm): revestimiento de cristal Ø 125 µm (radio 6,25) y núcleo Ø 9 µm (radio 0,45)
// por el que corren los PULSOS (paquetes de bits de luz) y unos rayos que rebotan en zigzag (reflexión total). Al lado, paralelo y en el mismo
// plano vertical (z = 0), un PELO humano castaño de Ø 80 µm (radio 4) con sus escamas de cutícula. Grupo con origen al principio de la fibra,
// la fibra a lo largo de +X (0 … FIB_L). Fondo negro (moodSet('fibra')) y una rejilla de 100 µm muy tenue debajo.
// API: buildFiber() → Group (userData.anchors: fiber, hair, core, fiberTop, hairBottom)
//      fiberAt(t, {speed, hair, pulses, cam}) · speed/hair/pulses 0..1; cam = [x,y,z] de la cámara en el marco local (si no, se toma la de la escena)
//      FIB_CAM(u) → [px,py,pz, lx,ly,lz, fov] en el marco local, u 0..1 (5,9 s: túnel → sale de lado (fibra + pelo) → corre al lado → al núcleo).
const FIB_L = 800, FIB_R = 6.25, FIB_RC = 0.45, FIB_HR = 4, FIB_HY = -(FIB_R + FIB_HR + 4.5), FIB_XS = 226;   // FIB_XS: x del plano medio con el pelo
const FIB_NR = 200, FIB_RS = FIB_L / FIB_NR;                    // anillos de la pared (cada 40 µm)
const FIB_NL = 4 * 66, FIB_LS = 12;                             // marcas de luz (4 por anillo de lámparas, cada 120 µm)
const FIB_NP = 50, FIB_PS = FIB_L / FIB_NP, FIB_BITS = 6;       // paquetes de luz (6 bits cada uno)
const FIB_NZ = 3, FIB_ZH = 30, FIB_ZS = 22, FIB_ZP = 2.6;      // rayos en zigzag: 3 planos × 30 cabezas, 22 trocitos de estela
const FIB_ZPAT = [];
let FIB = null;
const fibTri = x => { const f = x - Math.floor(x); return f < 0.5 ? 4 * f - 1 : 3 - 4 * f; };   // onda triangular −1..1
const fibWrap = x => ((x % FIB_L) + FIB_L) % FIB_L;

const FIB_GLASS_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = -mv.xyz; gl_Position = projectionMatrix * mv;
#include <logdepthbuf_vertex>
}`;
const FIB_GLASS_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 col; uniform float k, rim, spec, inside; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){
#include <logdepthbuf_fragment>
  vec3 n = normalize(vN), v = normalize(vV); float c = abs(dot(n, v)), f = pow(1. - c, 3.);
  if (dot(n, v) < 0.) n = -n;
  vec3 L1 = normalize(vec3(0.35, 0.85, 0.45)), L2 = normalize(vec3(-0.5, -0.3, 0.6));
  float fr = gl_FrontFacing ? 1. : 0.25; float s = fr * pow(max(dot(reflect(-v, n), L1), 0.), 140.) * 1.4 + pow(max(dot(reflect(-v, n), L2), 0.), 30.) * 0.35;
  // dentro: la pared lejana brilla (bruma de luz al fondo del túnel); vetas finas a lo largo, como el cristal estirado
  float vet = 0.5 + 0.5 * sin(atan(vP.z, vP.y) * 18.);
  float dist = length(vV); float far = smoothstep(25., 160., dist) * inside;
  vec3 a = col * (0.03 + rim * f * (1. + 0.4 * vet)) + vec3(0.85, 0.97, 1.) * s * spec + col * far * 0.6;
  gl_FragColor = vec4(a * k, 1.);
}`;

function fibGradTex() { return canvasTex(8, 256, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, '#ffffff'); r.addColorStop(0.12, '#bff6ff'); r.addColorStop(0.5, '#2a7f99'); r.addColorStop(1, '#000000'); g.fillStyle = r; g.fillRect(0, 0, w, h); }); }

// la cutícula del pelo: escamas como tejas (bordes irregulares cada ~6 µm), en color y en relieve
function fibHairTex() {
  const W0 = 512, H0 = 256, rows = 20, R = [];
  for (let j = 0; j < rows; j++) { const pts = []; for (let i = 0; i <= 64; i++) pts.push(j * H0 / rows + 3.2 * Math.sin(i * 0.31 + j * 1.7) + 2.2 * Math.sin(i * 0.9 + j * 4.1) + (hash(j * 77 + i) - 0.5) * 2.2); pts[64] = pts[0]; R.push(pts); }
  const draw = bump => (g, w, h) => {
    g.fillStyle = bump ? '#808080' : '#3e2416'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const x = hash(i * 3.1) * w; g.fillStyle = bump ? `rgba(${hash(i) > 0.5 ? 255 : 0},${hash(i) > 0.5 ? 255 : 0},${hash(i) > 0.5 ? 255 : 0},0.05)` : `rgba(${hash(i) > 0.5 ? '120,80,50' : '30,16,8'},0.18)`; g.fillRect(x, 0, 1 + hash(i * 5) * 3, h); }
    for (let j = 0; j < rows; j++) for (let rep = -1; rep <= 1; rep++) {
      const P = R[j], y0 = rep * h;
      // cada escama: oscura justo bajo el borde (sombra) y clara hacia el borde siguiente (sube la teja)
      const gr = g.createLinearGradient(0, y0 + j * h / rows, 0, y0 + (j + 1) * h / rows);
      if (bump) { gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0.75)'); } else { gr.addColorStop(0, 'rgba(10,4,0,0.35)'); gr.addColorStop(0.8, 'rgba(150,100,62,0.12)'); gr.addColorStop(1, 'rgba(200,150,100,0.3)'); }
      g.fillStyle = gr; g.beginPath(); for (let i = 0; i <= 64; i++) g.lineTo(i * w / 64, y0 + P[i]); const Q = R[(j + 1) % rows]; const dy = j + 1 === rows ? h : 0;
      for (let i = 64; i >= 0; i--) g.lineTo(i * w / 64, y0 + Q[i] + dy); g.closePath(); g.fill();
      g.strokeStyle = bump ? 'rgba(255,255,255,0.9)' : 'rgba(205,160,115,0.55)'; g.lineWidth = 1.4; g.beginPath(); for (let i = 0; i <= 64; i++) g.lineTo(i * w / 64, y0 + P[i] + dy * 0 - 0.8); g.stroke();
    }
  };
  const c = canvasTex(W0, H0, draw(false)), b = canvasTex(W0, H0, draw(true));
  for (const t of [c, b]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, FIB_L / 12); t.anisotropy = 8; }
  c.colorSpace = THREE.SRGBColorSpace; b.colorSpace = THREE.NoColorSpace; return { c, b };
}

function buildFiber() {
  const G = new THREE.Group(); G.name = 'fiber';
  const toX = geo => { geo.rotateZ(-Math.PI / 2); return geo; };     // +Y → +X
  const light = new THREE.Color(COL.light);
  // --- el revestimiento de cristal (brilla en los bordes; por dentro, las paredes del túnel)
  const gm = new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(0x5fd8f0) }, k: { value: 1 }, rim: { value: 1.6 }, spec: { value: 1 }, inside: { value: 0 } },
    vertexShader: FIB_GLASS_VS, fragmentShader: FIB_GLASS_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  const clad = new THREE.Mesh(toX(new THREE.CylinderGeometry(FIB_R, FIB_R, FIB_L, 96, 1, true).translate(0, FIB_L / 2, 0)), gm); clad.renderOrder = 2; G.add(clad);
  // la funda de plástico (250 µm) solo al principio: el tramo que se ve está pelado
  const coat = new THREE.Mesh(toX(new THREE.CylinderGeometry(12.5, 12.5, 40, 64).translate(0, -20, 0)), new THREE.MeshStandardMaterial({ color: 0x1c3a44, roughness: 0.6, emissive: 0x0a2a33, emissiveIntensity: 0.4 }));
  G.add(coat);
  // --- el núcleo: un hilo de luz (desde dentro, todo luz)
  const coreM = new THREE.MeshBasicMaterial({ color: light.clone().multiplyScalar(1.6), toneMapped: false, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const core = new THREE.Mesh(toX(new THREE.CylinderGeometry(FIB_RC, FIB_RC, FIB_L, 24, 1, true).translate(0, FIB_L / 2, 0)), coreM); G.add(core);
  const coreHaloM = new THREE.MeshBasicMaterial({ color: light.clone().multiplyScalar(0.07), toneMapped: false, side: THREE.FrontSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const coreHalo = new THREE.Mesh(toX(new THREE.CylinderGeometry(FIB_RC * 2.4, FIB_RC * 2.4, FIB_L, 24, 1, true).translate(0, FIB_L / 2, 0)), coreHaloM); G.add(coreHalo);
  // --- anillos de la pared y marcas de luz (lámparas del túnel; se alargan en estelas con la velocidad)
  const add = () => new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const ringM = add(); ringM.color.set(0x48c8e0);
  const rings = new THREE.InstancedMesh(toX(new THREE.TorusGeometry(FIB_R - 0.03, 0.035, 4, 96).rotateX(Math.PI / 2)), ringM, FIB_NR); G.add(rings);
  const grad = fibGradTex();
  const lampM = add(); lampM.map = grad;
  const lamps = new THREE.InstancedMesh(toX(new THREE.CylinderGeometry(0.11, 0.11, 1, 8, 1).translate(0, -0.5, 0)), lampM, FIB_NL); G.add(lamps);
  const LC = [0xdff9ff, 0x7fe6ff, 0xffd7a0, 0x7fe6ff];       // una de las cuatro, cálida (como las lámparas del metro)
  for (let i = 0; i < FIB_NL; i++) lamps.setColorAt(i, new THREE.Color(LC[i % 4]).multiplyScalar(i % 4 === 2 ? 2.2 : 2.6));
  // --- los pulsos: paquetes de 6 bits muy brillantes con una estela detrás y un halo
  const bitM = add(); bitM.color.set(0xffffff);
  const bits = new THREE.InstancedMesh(toX(new THREE.CapsuleGeometry(FIB_RC * 0.82, 0.38, 4, 10)), bitM, FIB_NP * FIB_BITS); G.add(bits);
  const BITS = [];
  for (let p = 0; p < FIB_NP; p++) for (let b = 0; b < FIB_BITS; b++) BITS.push(b === 0 || hash(p * 13.7 + b * 3.3) > 0.42 ? 1 : 0);
  const tailM = add(); tailM.map = grad;
  const tails = new THREE.InstancedMesh(toX(new THREE.CylinderGeometry(FIB_RC * 0.95, FIB_RC * 0.5, 1, 12, 1, true).translate(0, -0.5, 0)), tailM, FIB_NP); G.add(tails);
  const halos = [], haloM = new THREE.SpriteMaterial({ map: starTex0(), color: 0x9ff3ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  for (let p = 0; p < FIB_NP; p++) { const s = new THREE.Sprite(haloM); G.add(s); halos.push(s); }
  // --- rayos en zigzag dentro del núcleo (la luz rebota en la pared del núcleo: reflexión total)
  const zigM = add(); zigM.color.set(0xffffff);
  const zig = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.045, 0.045), zigM, FIB_NZ * FIB_ZH * FIB_ZS); G.add(zig);
  for (let i = 0; i < FIB_NZ * FIB_ZH * FIB_ZS; i++) { const j = i % FIB_ZS, f = 1 - j / FIB_ZS; zig.setColorAt(i, new THREE.Color(0x8fefff).multiplyScalar(2.2 * f * f + 0.04)); }
  // --- motas alrededor (polvo de luz fuera del cristal): con la cámara corriendo al lado, son estelas que pasan
  const moteM = add(); moteM.map = grad; moteM.color.set(0x9fe9ff);
  const motes = new THREE.InstancedMesh(toX(new THREE.CylinderGeometry(0.07, 0.07, 1, 6, 1, true).translate(0, -0.5, 0)), moteM, 500); G.add(motes);
  const MOTES = []; for (let i = 0; i < 500; i++) { const a = hash(i * 1.37) * Math.PI * 2, r = FIB_R + 3 + hash(i * 2.71) * 34; MOTES.push([hash(i * 5.3) * FIB_L, Math.cos(a) * r * 0.8 - 4, Math.sin(a) * r, 0.5 + hash(i * 9.1)]); }
  // --- el pelo: castaño oscuro, un poco elíptico e irregular, con escamas
  const hg = new THREE.CylinderGeometry(FIB_HR, FIB_HR, FIB_L, 72, 240, true), hp = hg.attributes.position;
  for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i), a = Math.atan2(z, x), yy = y + FIB_L / 2;
    const k = 1 + 0.035 * Math.sin(yy * 0.045) + 0.02 * Math.sin(yy * 0.13 + 1) + 0.05 * Math.cos(2 * a);       // sección ovalada y grosor que varía
    hp.setX(i, x * k); hp.setZ(i, z * k * 0.97); }
  hg.translate(0, FIB_L / 2, 0); hg.computeVertexNormals(); toX(hg);
  const HT = fibHairTex();
  const hairM = new THREE.MeshPhysicalMaterial({ color: 0x86705f, map: HT.c, bumpMap: HT.b, bumpScale: 2.2, roughness: 0.42, metalness: 0, sheen: 0.7, sheenColor: new THREE.Color(0x9a6a44), sheenRoughness: 0.4, clearcoat: 0.35, clearcoatRoughness: 0.3, transparent: true });
  const hair = new THREE.Mesh(hg, hairM); hair.position.y = FIB_HY; G.add(hair);
  // --- rejilla de micras debajo (líneas cada 100 µm), muy tenue
  const gt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,200,230,0.55)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,200,230,0.18)'; g.lineWidth = 1; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(i * w / 5, 0); g.lineTo(i * w / 5, h); g.moveTo(0, i * h / 5); g.lineTo(w, i * h / 5); g.stroke(); } });
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(FIB_L / 50 + 4, 6); gt.anisotropy = 8;
  const gridM = new THREE.MeshBasicMaterial({ map: gt, color: 0x2a5a66, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(FIB_L + 200, 300).rotateX(-Math.PI / 2), gridM); grid.position.set(FIB_L / 2, FIB_HY - FIB_HR - 9, 0); G.add(grid);
  // --- luces: una cálida delante-arriba (el pelo se ve castaño) y una cian al otro lado (perfil); siguen a la cámara en x
  const warm = new THREE.PointLight(0xfff0e2, 2.6, 0, 0), cool = new THREE.PointLight(0x7fe6ff, 1.4, 0, 0); G.add(warm, cool);
  G.userData.anchors = { fiber: v3(FIB_XS, 0, FIB_R), fiberTop: v3(FIB_XS, FIB_R, 0), core: v3(FIB_XS, 0, 0), hair: v3(FIB_XS, FIB_HY, FIB_HR), hairBottom: v3(FIB_XS, FIB_HY - FIB_HR, 0) };
  FIB = { G, gm, coreM, coreHaloM, rings, ringM, lamps, lampM, bits, bitM, BITS, tails, halos, haloM, zig, hair, hairM, grid, motes, moteM, MOTES, gridM, warm, cool };
  fiberAt(0, {});
  return G;
}

function fiberAt(t, o = {}) {
  const F = FIB; if (!F) return;
  const speed = o.speed ?? 1, hk = clamp(o.hair ?? 0), pk = clamp(o.pulses ?? 1);
  let cp = o.cam ? v3(o.cam[0], o.cam[1], o.cam[2]) : F.G.worldToLocal(cam.position.clone());
  const rad = Math.hypot(cp.y, cp.z), inside = 1 - ss(clamp((rad - FIB_R + 0.6) / 2.2));   // 1 dentro del cristal
  const cx = clamp(cp.x, 0, FIB_L), coreIn = 1 - ss(clamp((rad - FIB_RC) / 0.8));   // dentro del núcleo: destello
  // desplazamientos (sin estado: se pueden pedir fotogramas en cualquier orden; cambia speed despacio)
  const vM = 18 + 70 * speed, vP = 60 + 170 * speed;       // marcas que corren hacia atrás · pulsos hacia delante (adelantan a la cámara)
  const sM = t * vM, sP = t * vP;
  // cristal
  F.gm.uniforms.inside.value = inside; F.gm.uniforms.rim.value = lerp(0.55, 0.22, inside); F.gm.uniforms.spec.value = lerp(0.8, 0.25, inside); F.gm.uniforms.k.value = 1;
  F.coreM.color.set(COL.light).multiplyScalar(lerp(0.75, 0.22, inside) + 0.2 * pk + 2.5 * coreIn);
  // anillos (dentro se ven bien; fuera, apenas)
  F.ringM.color.set(0x48c8e0).multiplyScalar(lerp(0.08, 1.1, inside));
  for (let i = 0; i < FIB_NR; i++) { _o.position.set(fibWrap(i * FIB_RS - sM), 0, 0); _o.rotation.set(0, 0, 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); F.rings.setMatrixAt(i, _o.matrix); }
  F.rings.instanceMatrix.needsUpdate = true;
  // lámparas en la pared: 4 por fila (arriba-izq., arriba-der., abajo…), estelas con la velocidad
  const lLen = 0.35 + 7 * speed * speed;
  F.lampM.color.setScalar(lerp(0.08, 1, inside));
  for (let i = 0; i < FIB_NL; i++) { const row = Math.floor(i / 4), a = [0.7, 2.44, -0.75, 3.95][i % 4];
    _o.position.set(fibWrap(row * FIB_LS + (i % 4) * 3 - sM), Math.cos(a) * (FIB_R - 0.14), Math.sin(a) * (FIB_R - 0.14)); _o.rotation.set(0, 0, 0); _o.scale.set(lLen, 1, 1); _o.updateMatrix(); F.lamps.setMatrixAt(i, _o.matrix); }
  F.lamps.instanceMatrix.needsUpdate = true;
  // pulsos
  const tLen = 3 + 26 * speed * speed;
  for (let p = 0; p < FIB_NP; p++) {
    const x0 = fibWrap(p * FIB_PS + hash(p * 7.7) * 5 + sP), on = pk > 0.01;
    for (let b = 0; b < FIB_BITS; b++) { const i = p * FIB_BITS + b, s = on && F.BITS[i] ? 1 : 0.0001;
      _o.position.set(x0 - b * 0.95, 0, 0); _o.rotation.set(0, 0, 0); _o.scale.set(s, s * pk + 0.0001, s * pk + 0.0001); _o.updateMatrix(); F.bits.setMatrixAt(i, _o.matrix); }
    _o.position.set(x0 - (FIB_BITS - 1) * 0.95 - 0.3, 0, 0); _o.scale.set(on ? tLen : 0.0001, pk + 0.0001, pk + 0.0001); _o.updateMatrix(); F.tails.setMatrixAt(p, _o.matrix);
    const h = F.halos[p]; h.position.set(x0 - 2.4, 0, 0); h.scale.set(5 * pk + 0.001, 2.6 * pk + 0.001, 1); h.visible = on;
  }
  F.bitM.color.set(0xeafdff).multiplyScalar(5.5); F.tailM = F.tails.material; F.tailM.color.set(COL.light).multiplyScalar(1.4 * pk);
  F.haloM.opacity = 0.55 * pk;
  F.bits.instanceMatrix.needsUpdate = true; F.tails.instanceMatrix.needsUpdate = true;
  // rayos en zigzag: el camino es fijo en la fibra; la luz avanza por él dejando estela
  const ds = 0.32, vZ = 50 + 120 * speed;
  for (let z = 0; z < FIB_NZ; z++) { const az = z * Math.PI / FIB_NZ + 0.4, ca = Math.cos(az), sa = Math.sin(az), ph = z * 0.37;
    const P = x => v3(x, ca * FIB_RC * 0.92 * fibTri(x / FIB_ZP + ph), sa * FIB_RC * 0.92 * fibTri(x / FIB_ZP + ph));
    for (let hI = 0; hI < FIB_ZH; hI++) { const xh = fibWrap(hI * (FIB_L / FIB_ZH) + z * 9 + t * vZ);
      for (let j = 0; j < FIB_ZS; j++) { const i = (z * FIB_ZH + hI) * FIB_ZS + j, a = P(xh - j * ds), b = P(xh - j * ds + ds), d = b.clone().sub(a), L = d.length();
        _o.position.copy(a).add(b).multiplyScalar(0.5); _o.quaternion.setFromUnitVectors(v3(1, 0, 0), d.normalize()); const w = pk > 0.01 ? 1 : 0.0001; _o.scale.set(L * 1.15, w, w); _o.updateMatrix(); F.zig.setMatrixAt(i, _o.matrix); } } }
  F.zig.instanceMatrix.needsUpdate = true; F.zig.material.opacity = pk;
  // motas: fijas en el espacio + un poco de deriva; se alargan con la velocidad
  const mLen = 0.2 + 9 * speed * speed; F.moteM.color.set(0x9fe9ff).multiplyScalar(0.9 * (1 - inside) + 0.05);
  for (let i = 0; i < 500; i++) { const m = F.MOTES[i]; _o.position.set(fibWrap(m[0] - sM * 0.3), m[1], m[2]); _o.quaternion.identity(); _o.scale.set(mLen * m[3], m[3], m[3]); _o.updateMatrix(); F.motes.setMatrixAt(i, _o.matrix); }
  F.motes.instanceMatrix.needsUpdate = true;
  // pelo: aparece subiendo un poco y haciéndose opaco
  F.hair.visible = hk > 0.003; F.hairM.opacity = ss(hk); F.hairM.transparent = hk < 0.999; F.hairM.depthWrite = hk > 0.5; F.hair.position.y = FIB_HY - (1 - ss(hk)) * 6;
  F.gridM.opacity = lerp(0.35, 0.8, 1 - inside);
  // luces junto a la cámara
  F.warm.position.set(cx + 10, 22, 30); F.cool.position.set(cx + 25, FIB_HY - 6, -26);
  F.warm.intensity = 2.6 * (0.3 + 0.7 * hk); F.cool.intensity = 1.4 * (0.3 + 0.7 * hk);
}

// cámara (marco local), u 0..1 en 5,9 s: 0–0,3 túnel · 0,3–0,55 sale de lado: fibra + pelo · 0,55–0,95 corre al lado · 0,95–1 al núcleo
const FIB_KEYS = [
  [0.00, [16, 0, 0], [60, 0, 0], 86],                     // dentro del núcleo: todo luz
  [0.06, [36, 2.4, 0.4], [80, 0.2, 0], 76],
  [0.18, [110, 2.9, 0.9], [155, 0, -0.4], 72],
  [0.30, [175, 2.9, 1.4], [220, -0.2, -0.6], 70],
  [0.37, [192, 4, 14], [222, -4, 0], 50],               // atraviesa la pared del cristal
  [0.45, [FIB_XS - 52, 15, 56], [FIB_XS, -7, 0], 34],    // plano medio: fibra arriba, pelo abajo («fino como un pelo»)
  [0.55, [FIB_XS - 36, 13, 50], [FIB_XS + 14, -6.6, 0], 36],
  [0.66, [272, 6, 32], [322, -6, 0], 44],
  [0.82, [345, 0.5, 25], [396, -5, 0], 50],
  [0.93, [398, 0.8, 9], [442, -0.8, 0], 62],
  [1.00, [430, 0, 0], [480, 0, 0], 88],                   // otra vez en el núcleo: todo luz
];
function FIB_CAM(u) { const c = camKeys(clamp(u), FIB_KEYS); return [c.p.x, c.p.y, c.p.z, c.l.x, c.l.y, c.l.z, c.f]; }
// ---------------------------------------------------------------- TONGA (maqueta pequeña del Pacífico): la isla de Tongatapu, el volcán Hunga Tonga–Hunga Haʻapai
// y el único cable de internet (a Fiyi). Enero de 2022: el volcán estalla bajo el mar, el cable salta en trozos y el país se queda sin internet.
// Marco local: origen en la orilla de Tongatapu, y = 0 nivel del mar, +X tierra adentro (isla x ∈ [0, 28]), mar x ∈ [−90, 0], z ∈ [−18, 18], base en y = −30.
// API: buildTonga() → Group (userData.anchors: island, volcano, cableBreak, net, label); tongaAt(t, { te, net }); TON_CAM(u) → [px,py,pz, lx,ly,lz, fov].
//   te = segundos desde que empieza la erupción (<0: antes; 0..6), net = 1 con internet → 0 sin internet (lo llevas tú; las casas siguen con luz).
const TON_X0 = -90, TON_X1 = 28, TON_Z = 18, TON_BOT = -30;
const TON_V = { x: -48, z: -4 };                 // el volcán (centro del cono)
const TON_CZ = 6;                                // el cable (a Fiyi), por el fondo
const TON_BREAK = 0.45;                          // te en que el flujo parte el cable
const TON_SHORE = 2.5;                           // hasta dónde llega el mar (la playa corta el agua en x ≈ 2)
function tonBase(x, z) {                         // el fondo y la isla (sin el volcán)
  if (x > 0) return -1.2 + 2.6 * _sm(0, 4, x) + 0.15 * Math.sin(x * 0.6 + z * 0.4) * _sm(4, 8, x);
  return -1.2 - 25.5 * _sm(0, 24, -x) + 2.2 * _sm(-70, -90, x) + 0.35 * Math.sin(x * 0.5 + z * 0.3) * Math.sin(z * 0.4 - x * 0.2) * _sm(0, 6, -x);
}
function tonCone(x, z) {                         // el cono del volcán con su cráter (el islote asoma ~3 m)
  const dx = x - TON_V.x, dz = z - TON_V.z, r = Math.hypot(dx, dz), rc = 3.4, a = Math.atan2(dz, dx);
  if (r < rc) return 3 - 2.6 * (1 - (r / rc) ** 2);
  const u = clamp((r - rc) / 28);
  return -28.5 + 31.5 * Math.pow(1 - u, 1.5) + 0.9 * Math.sin(a * 7 + 1.3) * u * (1 - u) * 4 + 0.5 * Math.sin(a * 13) * u * (1 - u) * 3;
}
const tonH = (x, z) => Math.max(tonBase(x, z), tonCone(x, z));
function tonWave(x, z, t, te) {                  // la superficie del mar (olas suaves + la ola de la explosión)
  let y = 0.12 * Math.sin(0.5 * x + 1.1 * t) + 0.08 * Math.sin(0.7 * z - 0.9 * t + 0.3 * x) + 0.05 * Math.sin(1.7 * x + 2.3 * z + 1.9 * t);
  if (te > 0) { const r = Math.hypot(x - TON_V.x, z - TON_V.z), R = 6 + 34 * te, A = 2.2 * Math.exp(-te * 0.55); y += A * Math.exp(-(((r - R) / 2.6) ** 2)) - 0.6 * A * Math.exp(-(((r - R + 5) / 3) ** 2)); }
  return y;
}
const tonCablePts = () => {                      // el cable: sale de la estación de la playa (x = 3,5) y va por el fondo hacia −X hasta salir de la maqueta
  const P = []; P.push(v3(4.2, 1.8, TON_CZ), v3(3.2, 1.0, TON_CZ));
  for (let x = 2; x >= TON_X0 - 3; x -= 0.75) P.push(v3(x, tonH(Math.max(x, TON_X0), TON_CZ) + 0.35, TON_CZ));
  return P;
};
function tonGlowTex(stops) { return canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); for (const [k, c] of stops) r.addColorStop(k, c); g.fillStyle = r; g.fillRect(0, 0, w, h); }); }
const TON_SHELL_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
uniform mat4 inv; varying vec3 vL; varying vec3 vN; varying vec3 vV;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vL = (inv * wp).xyz; vec4 mv = viewMatrix * wp; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
#include <logdepthbuf_vertex>
}`;
const TON_SHELL_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 col; uniform float op, mode; varying vec3 vL; varying vec3 vN; varying vec3 vV;
void main(){
#include <logdepthbuf_fragment>
  if (mode < 0.5) { if (vL.y > 0.05 || abs(vL.z) > 18. || vL.x < -90. || vL.x > 2.) discard; } else { if (vL.y < 0.) discard; }
  float rim = 1. - abs(dot(normalize(vN), normalize(vV))); float a = pow(rim, 5.) * 1.2 * op;
  gl_FragColor = vec4(col * a, a); }`;
const TON_WATER_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
#include <logdepthbuf_vertex>
}`;
const TON_WATER_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 top, deep, flashC; uniform float op, time, flash; uniform vec2 vc; varying vec3 vP;
void main(){
#include <logdepthbuf_fragment>
  float k = smoothstep(-29., 0., vP.y); vec3 c = mix(deep, top, pow(k, 1.4));
  float ray = pow(0.5 + 0.5 * sin(vP.x * 0.33 + sin(vP.x * 0.09 + vP.z * 0.1) * 3. + time * 0.35 + vP.y * 0.05), 7.) * smoothstep(-26., -1., vP.y);
  c += top * ray * 0.9 + vec3(0.55, 0.85, 1.) * smoothstep(-1.6, 0., vP.y) * 0.35;
  float d = length(vec2(vP.x - vc.x, vP.y)); c += flashC * flash * exp(-d / 14.);
  gl_FragColor = vec4(c * op, op); }`;

function buildTonga() {
  const G = new THREE.Group(), U = {}; G.userData.T = U; renderer.shadowMap.enabled = true;
  // ---------- base de museo (madera oscura lacada, canto de latón) y la placa
  const base = mesh(new THREE.BoxGeometry(TON_X1 - TON_X0 + 4, 3.4, 2 * TON_Z + 4), new THREE.MeshPhysicalMaterial({ color: 0x1a1210, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 }));
  base.position.set((TON_X0 + TON_X1) / 2, TON_BOT - 1.7, 0); G.add(base);
  const trim = mesh(new THREE.BoxGeometry(TON_X1 - TON_X0 + 4.2, 0.35, 2 * TON_Z + 4.2), metal(0xc9a45c, 0.3)); trim.position.set((TON_X0 + TON_X1) / 2, TON_BOT - 0.15, 0); G.add(trim);
  const plaque = textPlane(16, 2.2, (g, w, h) => { g.fillStyle = '#c9a45c'; rr(g, 4, 4, w - 8, h - 8, 18); g.fill(); g.fillStyle = '#2a1d0e'; g.font = '800 46px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TONGA · PACÍFICO SUR', w / 2, h / 2 + 2); }, 640);
  plaque.position.set(12, TON_BOT - 1.7, TON_Z + 2.02); G.add(plaque);
  // ---------- el terreno: fondo del mar, el cono del volcán con su islote y la isla (una sola malla con colores por altura)
  const NX = 200, NZ = 62, P = [], C = [], I = [], col = new THREE.Color();
  const cSand = new THREE.Color(0xd9bd88), cBed = new THREE.Color(0x8a7a62), cDeep = new THREE.Color(0x5c5248), cRock = new THREE.Color(0x3b3533), cGrass = new THREE.Color(0x4f9a46), cGrass2 = new THREE.Color(0x3d8040), cIslet = new THREE.Color(0x6b5a48);
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
    const x = TON_X0 + (TON_X1 - TON_X0) * i / NX, z = -TON_Z + 2 * TON_Z * j / NZ, yb = tonBase(x, z), yc = tonCone(x, z), y = Math.max(yb, yc);
    P.push(x, y, z);
    if (x > 3.2) col.copy(cGrass).lerp(cGrass2, 0.5 + 0.5 * Math.sin(x * 0.7) * Math.sin(z * 0.9));
    else if (yc > yb) col.copy(y > 0.4 ? cIslet : cRock).lerp(cDeep, clamp(-y / 60) * 0.3);
    else col.copy(cSand).lerp(cBed, _sm(-0.5, -6, y)).lerp(cDeep, _sm(-12, -26, y));
    C.push(col.r, col.g, col.b);
    if (i && j) { const a = (j - 1) * (NX + 1) + i - 1, b = a + 1, c = a + NX + 1, d = c + 1; I.push(a, c, b, b, c, d); }
  }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); tg.setIndex(I); tg.computeVertexNormals();
  const terr = mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 })); G.add(terr);
  // cortes (capas de tierra y roca), igual que en las otras piezas
  const xs = []; for (let i = 0; i <= 236; i++) xs.push(TON_X0 + (TON_X1 - TON_X0) * i / 236);
  const zs = []; for (let i = 0; i <= 72; i++) zs.push(-TON_Z + 2 * TON_Z * i / 72);
  G.add(strataFace(xs, x => tonH(x, TON_Z), TON_Z, { bot: TON_BOT, band: 0.6, bandCol: 0x4a3a2a }));
  G.add(strataFace(xs, x => tonH(x, -TON_Z), -TON_Z, { bot: TON_BOT, band: 0.6, bandCol: 0x4a3a2a }));
  G.add(strataFace(zs, z => tonH(TON_X0, z), TON_X0, { bot: TON_BOT, band: 0.6, bandCol: 0x4a3a2a, normalX: -1 }));
  G.add(strataFace(zs, z => tonH(TON_X1, z), TON_X1, { bot: TON_BOT, band: 0.6, bandCol: 0x3f6a33, normalX: 1 }));
  // el cráter: un charco de lava (se enciende en la erupción)
  const lava = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6a20).multiplyScalar(0.0), toneMapped: false }));
  lava.rotation.x = -Math.PI / 2; lava.position.set(TON_V.x, 0.55, TON_V.z); G.add(lava); U.lava = lava;
  // ---------- el agua en corte (caras laterales con degradado y luz que cae), la superficie con olas y el cristal
  const wmat = (op) => new THREE.ShaderMaterial({ vertexShader: TON_WATER_VS, fragmentShader: TON_WATER_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, premultipliedAlpha: true,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: { top: { value: new THREE.Color(COL.water) }, deep: { value: new THREE.Color(COL.deep) }, flashC: { value: new THREE.Color(0xff7a2a) }, op: { value: op }, time: { value: 0 }, flash: { value: 0 }, vc: { value: new THREE.Vector2(TON_V.x, 0) } } });
  U.wfaces = [];
  const wface = (zf, op, alongZ = false) => {      // tira vertical: abajo el fondo, arriba la superficie (se mueve con las olas)
    const S2 = alongZ ? zs : xs.filter(x => x <= TON_SHORE), n = S2.length, pos = new Float32Array(n * 6), idx = [];
    for (let i = 1; i < n; i++) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
    const m = new THREE.Mesh(g, wmat(op)); m.renderOrder = 5; m.frustumCulled = false; G.add(m);
    const f = { m, S: S2, zf, alongZ }; U.wfaces.push(f); return f;
  };
  wface(-TON_Z, 0.97); wface(TON_X0, 0.6, true); wface(TON_Z, 0.36);
  // superficie
  const SX0 = TON_X0, SX1 = TON_SHORE, SNX = 124, SNZ = 48;
  const sg = new THREE.PlaneGeometry(SX1 - SX0, 2 * TON_Z, SNX, SNZ); sg.rotateX(-Math.PI / 2); sg.translate((SX0 + SX1) / 2, 0, 0);
  sg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(sg.attributes.position.count * 3).fill(1), 3));
  const sea = new THREE.Mesh(sg, new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.78, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2.2, depthWrite: false }));
  sea.renderOrder = 6; sea.frustumCulled = false; G.add(sea); U.sea = sea; U.sea0 = Float32Array.from(sg.attributes.position.array);
  // cristal: casi invisible, con brillo en los cantos
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xdff3ff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.5 });
  const GY0 = TON_BOT, GY1 = 3.2, GH = GY1 - GY0, GL = TON_SHORE - TON_X0 + 1;
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(GL, GH), glassM); p.position.set((TON_X0 + TON_SHORE + 1) / 2, (GY0 + GY1) / 2, s * (TON_Z + 0.05)); p.renderOrder = 7; G.add(p); }
  const pe = new THREE.Mesh(new THREE.PlaneGeometry(2 * TON_Z, GH), glassM); pe.rotation.y = Math.PI / 2; pe.position.set(TON_X0 - 0.05, (GY0 + GY1) / 2, 0); pe.renderOrder = 7; G.add(pe);
  const gx0 = TON_X0 - 0.05, gx1 = TON_SHORE + 1, gz = TON_Z + 0.05;
  const edgeL = [[[gx0, GY1, gz], [gx1, GY1, gz]], [[gx0, GY1, -gz], [gx1, GY1, -gz]], [[gx0, GY1, -gz], [gx0, GY1, gz]], [[gx0, GY0, gz], [gx0, GY1, gz]], [[gx0, GY0, -gz], [gx0, GY1, -gz]],
    [[gx1, GY1, gz], [gx1, 1.4, gz]], [[gx1, GY1, -gz], [gx1, 1.4, -gz]], [[gx0, GY0 + 0.05, gz], [gx1, GY0 + 0.05, gz]]];
  for (const [a, b] of edgeL) G.add(drawLine([v3(...a), v3(...b)], 0xd8f0ff, 1.6, 0.55));
  // ---------- Tongatapu: casitas con luces cálidas, palmeras, la antena y la estación del cable
  const houseM = [plastic(0xf2ece0, 0.4), plastic(0xf5d9b8, 0.4), plastic(0xd9ecf2, 0.4), plastic(0xf2e2c4, 0.4)];
  const roofM = [plastic(0xc4553a, 0.35), plastic(0x2f8f8a, 0.35), plastic(0x8a4a32, 0.35), plastic(0xe0e4e8, 0.35)];
  const winM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb35c).multiplyScalar(2.4), toneMapped: false });
  const roofG = new THREE.ConeGeometry(1.15, 0.8, 4, 1); roofG.rotateY(Math.PI / 4);
  const winG = new THREE.PlaneGeometry(0.34, 0.34), houses = [];
  let hs = 0;
  for (let gx = 0; gx < 7; gx++) for (let gz = 0; gz < 9; gz++) {
    hs++; const x = 6.5 + gx * 2.7 + (hash(hs * 3.1) - 0.5) * 1.1, z = -13.5 + gz * 3.3 + (hash(hs * 5.3) - 0.5) * 1.2;
    if (hash(hs * 7.7) < 0.22 || (Math.abs(z - TON_CZ) < 2.4 && x < 10) || (Math.abs(x - 15) < 2.2 && Math.abs(z + 1) < 2.2)) continue;
    const h = new THREE.Group(), w = 1.2 + hash(hs) * 0.6, d = 1.1 + hash(hs * 2) * 0.5, ht = 0.9 + hash(hs * 4) * 0.5, y0 = tonH(x, z);
    const body = mesh(new THREE.BoxGeometry(w, ht, d), houseM[hs % 4]); body.position.y = ht / 2; h.add(body);
    const roof = mesh(roofG, roofM[(hs * 7) % 4]); roof.scale.set(w / 1.6, 1, d / 1.6); roof.position.y = ht + 0.4; h.add(roof);
    for (const [px, pz, ry] of [[0, d / 2 + 0.01, 0], [w / 2 + 0.01, 0, Math.PI / 2], [-w * 0.22, d / 2 + 0.01, 0], [0, -d / 2 - 0.01, Math.PI]]) {
      if (hash(hs * 11 + px * 3 + pz) < 0.3) continue; const wn = new THREE.Mesh(winG, winM); wn.position.set(px, ht * 0.55, pz); wn.rotation.y = ry; h.add(wn); }
    h.position.set(x, y0 - 0.05, z); h.rotation.y = (hash(hs * 13) - 0.5) * 0.5; G.add(h); houses.push(h);
  }
  U.houses = houses;
  // palmeras pequeñas (tronco curvo + hojas)
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9 }), leafM = new THREE.MeshStandardMaterial({ color: 0x3f9a3a, roughness: 0.6, side: THREE.DoubleSide });
  const leafG = new THREE.PlaneGeometry(1.8, 0.45, 4, 1); { const a = leafG.attributes.position; for (let i = 0; i < a.count; i++) { const x = a.getX(i) + 0.9; a.setX(i, x); a.setY(i, a.getY(i) * (1 - x / 2.2)); a.setZ(i, -0.18 * x * x); } leafG.rotateX(-Math.PI / 2); leafG.computeVertexNormals(); }
  const palm = (x, z, s) => { const g = new THREE.Group(), bend = (hash(x * 3 + z) - 0.5) * 0.9, hgt = 2.6 * s;
    const pts = [0, 0.33, 0.66, 1].map(k => v3(bend * k * k, hgt * k, 0)); g.add(tube(pts, 0.09 * s, trunkM, 8, false, 6));
    for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(leafG, leafM); l.castShadow = true; l.position.copy(pts[3]); l.rotation.set(0, i / 7 * Math.PI * 2 + hash(i + x), 0); l.scale.setScalar(s); g.add(l); }
    g.position.set(x, tonH(x, z) - 0.05, z); g.rotation.y = hash(z * 7 + x) * 6.28; G.add(g); };
  for (let i = 0; i < 46; i++) { const edge = i < 22, x = edge ? 2.6 + hash(i * 1.7) * 2.2 : 5 + hash(i * 2.3) * 22, z = -16.5 + hash(i * 4.1) * 33; if (Math.abs(z - TON_CZ) < 1.6 && x < 6) continue; palm(x, z, 0.8 + hash(i * 9) * 0.45); }
  // la estación del cable (en la playa) y la antena
  const st = mesh(new THREE.BoxGeometry(2.4, 1.3, 2.2), plastic(0xe8eef2, 0.35)); st.position.set(5.2, tonH(5.2, TON_CZ) + 0.6, TON_CZ); G.add(st);
  const stR = mesh(new THREE.BoxGeometry(2.6, 0.18, 2.4), plastic(0x2a3440, 0.4)); stR.position.set(5.2, st.position.y + 0.72, TON_CZ); G.add(stR);
  const TW = v3(15, tonH(15, -1), -1), twH = 9;
  const tw = new THREE.Group(); tw.position.copy(TW); G.add(tw);
  const twM = plastic(0xdfe3e8, 0.35);
  for (const [a, b] of [[[-0.55, 0, -0.55], [-0.08, twH, -0.08]], [[0.55, 0, -0.55], [0.08, twH, -0.08]], [[-0.55, 0, 0.55], [-0.08, twH, 0.08]], [[0.55, 0, 0.55], [0.08, twH, 0.08]]]) tw.add(bar(v3(...a), v3(...b), 0.07, twM, 6));
  for (let k = 1; k < 6; k++) { const y = k * twH / 6, s = 0.55 * (1 - y / twH) + 0.08; for (const [a, b] of [[[-s, y, -s], [s, y, -s]], [[s, y, -s], [s, y, s]], [[s, y, s], [-s, y, s]], [[-s, y, s], [-s, y, -s]]]) tw.add(bar(v3(...a), v3(...b), 0.04, twM, 5)); }
  for (const a of [0, 2.1, 4.2]) { const p = mesh(new THREE.BoxGeometry(0.3, 0.9, 0.12), twM); p.position.set(Math.cos(a) * 0.3, twH - 1, Math.sin(a) * 0.3); p.rotation.y = -a; tw.add(p); }
  const beaconM = new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.light).multiplyScalar(3), toneMapped: false }); const beacon = sph(0.22, beaconM, 12, 8); beacon.position.y = twH + 0.25; tw.add(beacon); U.beacon = beacon;
  // ---------- la capa de «internet»: puntos cian (móviles, wifi) sobre las casas, unidos a la antena; y la antena a la estación del cable
  const dotTex = tonGlowTex([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(160,250,255,.85)'], [0.6, 'rgba(90,230,240,.25)'], [1, 'rgba(90,230,240,0)']]);
  U.dots = []; const top = v3(TW.x, TW.y + twH + 0.2, TW.z);
  const hs2 = houses.slice().sort((a, b) => hash(a.position.x * 7 + a.position.z) - hash(b.position.x * 7 + b.position.z));
  hs2.forEach((h, i) => { if (i % 4 === 3) return;
    const p = h.position.clone(); p.y += 2.6 + hash(i * 3.3) * 0.8; p.x += (hash(i) - 0.5) * 0.6;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: new THREE.Color(COL.light).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    sp.position.copy(p); sp.scale.setScalar(1.3); G.add(sp);
    const mid = p.clone().lerp(top, 0.5); mid.y += 1.2 + p.distanceTo(top) * 0.08; const pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push(new THREE.Vector3().copy(p).multiplyScalar((1 - u) * (1 - u)).addScaledVector(mid, 2 * u * (1 - u)).addScaledVector(top, u * u)); }
    const ln = drawLine(pts, COL.light, 1.4, 0.55); G.add(ln);
    U.dots.push({ sp, ln, th: 0.08 + 0.84 * hash(i * 9.7 + 1.3), ph: hash(i * 5.1) * 6.28, p });
  });
  { const a = v3(5.2, st.position.y + 0.8, TON_CZ), mid = a.clone().lerp(top, 0.5); mid.y += 4; const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push(new THREE.Vector3().copy(a).multiplyScalar((1 - u) * (1 - u)).addScaledVector(mid, 2 * u * (1 - u)).addScaledVector(top, u * u)); }
    U.trunk = drawLine(pts, COL.light, 2.4, 0.9); G.add(U.trunk); }
  // anillos wifi alrededor de la antena (ondas que salen)
  U.rings = []; for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.light).multiplyScalar(2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    r.rotation.x = Math.PI / 2; r.position.copy(top); G.add(r); U.rings.push(r); }
  // icono rojo de «sin conexión» (wifi tachado) flotando sobre la isla
  const offTex = canvasTex(512, 512, (g, w, h) => {
    const gr = g.createRadialGradient(256, 256, 120, 256, 256, 256); gr.addColorStop(0, 'rgba(255,59,48,.55)'); gr.addColorStop(1, 'rgba(255,59,48,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff3b30'; rr(g, 86, 86, 340, 340, 80); g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 6; rr(g, 92, 92, 328, 328, 76); g.stroke();
    g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineWidth = 26;
    for (const r of [150, 104, 58]) { g.beginPath(); g.arc(256, 330, r, Math.PI * 1.22, Math.PI * 1.78); g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(256, 330, 17, 0, 6.29); g.fill();
    g.lineWidth = 30; g.strokeStyle = '#ff3b30'; g.beginPath(); g.moveTo(150, 150); g.lineTo(362, 362); g.stroke(); g.lineWidth = 22; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(150, 150); g.lineTo(362, 362); g.stroke();
  });
  const off = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: offTex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.25) }));
  off.renderOrder = 20; off.position.set(13, 15, 0); off.visible = false; G.add(off); U.off = off;
  // ---------- el cable (a Fiyi): trozos de tubo por el fondo; los del flanco del volcán saltan
  const cp = tonCablePts(), cableM = new THREE.MeshPhysicalMaterial({ color: 0x20262e, roughness: 0.35, clearcoat: 1, emissive: COL.light, emissiveIntensity: 0.0 });
  const brkM = cableM.clone(); U.brkM = brkM; const curve = new THREE.CatmullRomCurve3(cp); U.curve = curve; const CL = curve.getLength(); U.CL = CL;
  U.pieces = []; const PL2 = 2.2, NPc = Math.ceil(CL / PL2);
  for (let k = 0; k < NPc; k++) {
    const s0 = k / NPc, s1 = (k + 1) / NPc, pts = []; for (let q = 0; q <= 6; q++) pts.push(curve.getPointAt(lerp(s0, s1, q / 6)));
    const c = pts[3].clone(); for (const p of pts) p.sub(c);
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.7, 10, false), cableM); m.castShadow = true; m.position.copy(c); G.add(m);
    const brk = c.x < -36 && c.x > -61, i = U.pieces.length;
    if (brk) m.material = brkM;
    U.pieces.push({ m, c, brk, s: (s0 + s1) / 2, v: v3((hash(i * 3.7) - 0.5) * 8, 8 + hash(i * 5.3) * 8, 2 + hash(i * 7.1) * 5), w: v3(hash(i) - 0.5, hash(i * 2) - 0.5, hash(i * 3) - 0.5).multiplyScalar(9) });
  }
  const bk = U.pieces.filter(p => p.brk); U.sBreak = [bk[0].s - 0.5 / NPc, bk[bk.length - 1].s + 0.5 / NPc];     // tramo roto (de la isla hacia fuera: s crece hacia −X)
  U.ends = [curve.getPointAt(U.sBreak[0]), curve.getPointAt(U.sBreak[1])];
  U.cableM = cableM;
  // pulsos de luz que corren por el cable
  const pulseTex = tonGlowTex([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(170,250,255,.8)'], [1, 'rgba(90,230,240,0)']]);
  U.pulses = []; for (let i = 0; i < 4; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pulseTex, color: new THREE.Color(COL.light).multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    sp.scale.setScalar(4.5); G.add(sp); U.pulses.push(sp); }
  // chispas rojas en los extremos rotos
  U.spk = [sparks(G, 90, 0xff5a30, 1.1), sparks(G, 90, 0xff5a30, 1.1)];
  U.endGlow = U.ends.map(p => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pulseTex, color: new THREE.Color(0xff3b30).multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); s.position.copy(p); s.visible = false; s.renderOrder = 8; G.add(s); return s; });
  // ---------- LA ERUPCIÓN
  const VT = v3(TON_V.x, 1.5, TON_V.z); U.VT = VT;
  // destello
  const flashTex = tonGlowTex([[0, 'rgba(255,255,255,1)'], [0.15, 'rgba(255,240,200,.95)'], [0.4, 'rgba(255,150,60,.45)'], [1, 'rgba(255,90,30,0)']]);
  U.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: 0xffffff, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  U.flash.position.copy(VT).add(v3(0, 6, 0)); U.flash.renderOrder = 15; U.flash.visible = false; G.add(U.flash);
  U.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: 0xff7a30, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  U.glow.position.copy(VT).add(v3(0, 4, 0)); U.glow.visible = false; G.add(U.glow);
  U.light = new THREE.PointLight(0xff8a40, 0, 260, 1.3); U.light.position.copy(VT).add(v3(0, 22, -6)); G.add(U.light);
  // columna de ceniza y vapor (bolas de «algodón» iluminadas: se lee de lejos)
  const NA = 300, ashG = new THREE.IcosahedronGeometry(1, 1);
  const ash = new THREE.InstancedMesh(ashG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, emissive: 0x2a201a, emissiveIntensity: 1, flatShading: false }), NA);
  ash.instanceMatrix.setUsage(THREE.DynamicDrawUsage); ash.castShadow = false; ash.frustumCulled = false; G.add(ash); U.ash = ash; U.ashD = [];
  const cAsh = new THREE.Color(0x4e4844), cAsh2 = new THREE.Color(0x2e2a29), cSteam = new THREE.Color(0xe4e8ec);
  for (let i = 0; i < NA; i++) {
    const surge = i < 46, s = hash(i * 1.91), steam = surge || hash(i * 6.6) < 0.3;
    const d = { surge, s, b: surge ? hash(i * 2.7) * 0.5 : Math.pow(hash(i * 2.7), 1.6) * 3.6, phi: hash(i * 3.9) * 6.283, rr: hash(i * 4.4), sz: 0.7 + hash(i * 8.1) * 0.6, hm: 35 + 95 * Math.pow(s, 0.8) };
    U.ashD.push(d); ash.setColorAt(i, (steam ? cSteam : cAsh).clone().lerp(cAsh2, surge ? 0.2 : hash(i * 9.9) * 0.7));
  }
  // rayos dentro de la columna
  U.bolts = []; for (let i = 0; i < 5; i++) { const pts = []; let p = v3(TON_V.x + (hash(i * 3) - 0.5) * 10, 30 + hash(i * 5) * 50, TON_V.z + (hash(i * 7) - 0.5) * 10);
    for (let k = 0; k < 8; k++) { pts.push(p.clone()); p = p.clone().add(v3((hash(i * 11 + k) - 0.5) * 7, -3 - hash(i * 13 + k) * 4, (hash(i * 17 + k) - 0.5) * 7)); }
    const b = tube(pts, 0.28, basicGlow(0xd8ccff, 4), 40, false, 4); b.castShadow = false; b.visible = false; G.add(b); U.bolts.push({ b, t0: 0.7 + i * 0.55 + hash(i * 19) * 0.3 }); }
  // bombas de lava (chispas naranjas)
  U.bombs = sparks(G, 160, 0xffa040, 0.9);
  // onda de choque en el aire (cúpula que se expande) y onda de presión en el agua (esfera recortada al agua del corte)
  const shellM = (c, mode) => new THREE.ShaderMaterial({ vertexShader: TON_SHELL_VS, fragmentShader: TON_SHELL_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { inv: { value: new THREE.Matrix4() }, col: { value: new THREE.Color(c) }, op: { value: 0 }, mode: { value: mode } } });
  U.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), shellM(0xf4f6ff, 1)); U.dome.position.set(TON_V.x, 0, TON_V.z); U.dome.visible = false; U.dome.renderOrder = 9; G.add(U.dome);
  U.pwave = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), shellM(0x9fe8ff, 0)); U.pwave.position.set(TON_V.x, -1, TON_V.z); U.pwave.visible = false; U.pwave.renderOrder = 4; G.add(U.pwave);
  // flujo de rocas y lodo por la ladera (hacia el cable)
  const NR = 110, rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x3a3230, roughness: 0.9 }), NR);
  rocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); rocks.castShadow = true; rocks.frustumCulled = false; G.add(rocks); U.rocks = rocks;
  U.rockD = []; for (let i = 0; i < NR; i++) U.rockD.push({ th: Math.PI / 2 + (hash(i * 2.3) - 0.5) * (i < 80 ? 1.9 : 6.28), lag: hash(i * 3.1), sz: 0.35 + hash(i * 5.9) ** 2 * 1.1 });
  const NM = 70, mud = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x6b5a46, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false }), NM);
  mud.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mud.frustumCulled = false; mud.renderOrder = 3; G.add(mud); U.mud = mud;
  U.mudD = []; for (let i = 0; i < NM; i++) U.mudD.push({ th: Math.PI / 2 + (hash(i * 4.7) - 0.5) * 2.0, lag: hash(i * 6.3), sz: 1.4 + hash(i * 8.8) * 1.8, up: hash(i * 9.4) });
  // ---------- anclas (marco local)
  G.userData.anchors = { island: v3(12, 3, 0), volcano: v3(TON_V.x, 3.5, TON_V.z), cableBreak: curve.getPointAt((U.sBreak[0] + U.sBreak[1]) / 2), net: v3(13, 15, 0), label: v3(12, 20, 0) };
  U.G = G; S.tonga = G; tongaAt(0, { te: -1, net: 1 }); return G;
}
const _tonM = new THREE.Matrix4(), _tonQ = new THREE.Quaternion(), _tonV = new THREE.Vector3(), _tonS = new THREE.Vector3(), _tonE = new THREE.Euler();
function tongaAt(t, o = {}) {
  const G = S.tonga, U = G.userData.T, te = o.te ?? -1, net = clamp(o.net ?? 1), E = te > 0;
  G.updateMatrixWorld(true); const inv = _tonM.copy(G.matrixWorld).invert();
  // ---- mar: olas, la ola de la explosión y espuma
  const sa = U.sea.geometry.attributes.position, sc = U.sea.geometry.attributes.color, s0 = U.sea0, cw = new THREE.Color(COL.water).lerp(new THREE.Color(0x6fc3d8), 0.55);
  for (let i = 0; i < sa.count; i++) { const x = s0[i * 3], z = s0[i * 3 + 2], y = tonWave(x, z, t, te); sa.array[i * 3 + 1] = y;
    let f = 0; if (E) { const r = Math.hypot(x - TON_V.x, z - TON_V.z), R = 6 + 34 * te; f = Math.exp(-(((r - R) / 2.2) ** 2)) * Math.exp(-te * 0.45) + Math.exp(-r / 7) * clamp(1.2 - te * 0.15); }
    f = clamp(f + Math.max(0, y - 0.18) * 1.5); sc.array[i * 3] = lerp(cw.r, 1, f); sc.array[i * 3 + 1] = lerp(cw.g, 1, f); sc.array[i * 3 + 2] = lerp(cw.b, 1, f); }
  sa.needsUpdate = true; sc.needsUpdate = true; U.sea.geometry.computeVertexNormals();
  // ---- flash / brillo
  const fl = E ? Math.exp(-te * 6) * clamp(te / 0.04) : 0, glow = E ? clamp(te / 0.3) * (0.55 + 0.45 * Math.exp(-te * 0.6)) * (0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7.3)) : 0;
  for (const f of U.wfaces) { const g = f.m.geometry.attributes.position, A = g.array;
    f.S.forEach((q, i) => { const x = f.alongZ ? f.zf : q, z = f.alongZ ? q : f.zf, yb = tonH(x, z), yt = Math.max(yb, tonWave(x, z, t, te));
      A.set([x, yb, z, x, yt, z], i * 6); });
    g.needsUpdate = true; const u = f.m.material.uniforms; u.time.value = t; u.flash.value = fl * 0.9 + glow * 0.25; }
  U.flash.visible = fl > 0.01; U.flash.scale.setScalar(12 + 45 * (1 - Math.exp(-te * 6))); U.flash.material.opacity = Math.min(1, fl * 1.3); U.flash.material.color.setScalar(1 + fl * 2);
  U.glow.visible = glow > 0.01; U.glow.scale.setScalar(26 + 8 * glow); U.glow.material.opacity = glow;
  U.lava.material.color.set(0xff6a20).multiplyScalar(3 * glow);
  U.light.intensity = 1600 * fl + 260 * glow;
  // ---- columna de ceniza
  const ash = U.ash;
  U.ashD.forEach((d, i) => { const a = te - d.b; if (!E || a <= 0) { _tonM.makeScale(0, 0, 0); ash.setMatrixAt(i, _tonM); return; }
    let x, y, z, sz;
    if (d.surge) { const R = 4 + (24 + 10 * d.rr) * (1 - Math.exp(-a * 1.5)); y = 0.6 + d.s * 2 + a * 0.5; x = TON_V.x + Math.cos(d.phi) * R; z = TON_V.z + Math.sin(d.phi) * R; sz = (2.4 + a * 1.1 + d.s * 1.2) * d.sz;
      if (Math.abs(z) > TON_Z + 6 || x < TON_X0 - 8) sz *= clamp(1 - (Math.max(Math.abs(z) - TON_Z - 6, TON_X0 - 8 - x)) / 6); sz *= clamp(1 - (a - 0.8) / 1.0); }
    else { y = 2 + d.hm * (1 - Math.exp(-a * 0.85)); const top = Math.pow(clamp(y / d.hm), 8) * (d.s > 0.55 ? 1 : 0.3);
      const rad = (1.5 + y * 0.1) * d.rr + top * (10 + 50 * (1 - Math.exp(-a * 0.35))) * (0.4 + 0.6 * d.rr);
      x = TON_V.x + Math.cos(d.phi) * rad + Math.sin(y * 0.05 + d.phi) * 2; z = TON_V.z + Math.sin(d.phi) * rad; sz = (2 + y * 0.06 + a * 0.6 + top * 3) * d.sz * clamp(a / 0.25); }
    _tonQ.setFromEuler(_tonE.set(d.phi, d.rr * 3, a * 0.2)); _tonM.compose(_tonV.set(x, y, z), _tonQ, _tonS.setScalar(Math.max(0.001, sz))); ash.setMatrixAt(i, _tonM); });
  ash.instanceMatrix.needsUpdate = true; ash.visible = E;
  ash.material.emissive.setRGB(0.05 + 0.22 * glow + 1.1 * fl, 0.045 + 0.08 * glow + 0.75 * fl, 0.045 + 0.02 * glow + 0.55 * fl);
  for (const B of U.bolts) { const k = (te - B.t0) % 2.2; B.b.visible = E && te > B.t0 && k < 0.3 && (k < 0.1 || k > 0.16); }
  U.bombs.visible = E && te < 3.2; if (U.bombs.visible) burst(U.bombs, U.VT, te, 0, 9, 3, false, 9.5);
  U.bombs.material.opacity = clamp(1.6 - te * 0.5);
  // ---- ondas de choque
  U.dome.visible = E && te < 1.6; if (U.dome.visible) { U.dome.scale.setScalar(5 + 150 * (1 - Math.exp(-te * 1.6))); const u = U.dome.material.uniforms; u.inv.value.copy(inv); u.op.value = 0.55 * Math.exp(-te * 2.4) * clamp(te / 0.05); }
  U.pwave.visible = E && te < 1.8; if (U.pwave.visible) { U.pwave.scale.setScalar(3 + 85 * te); const u = U.pwave.material.uniforms; u.inv.value.copy(inv); u.op.value = 1.6 * Math.exp(-te * 1.6) * clamp(te / 0.04); }
  // ---- flujo de rocas y lodo ladera abajo
  const rf = E ? 3.5 + 24 * (1 - Math.exp(-te * 1.05)) : 0;
  U.rockD.forEach((d, i) => { const r = 3.5 + Math.max(0, rf - 3.5 - d.lag * 7), on = E && rf - 3.5 - d.lag * 7 > 0;
    if (!on) { _tonM.makeScale(0, 0, 0); U.rocks.setMatrixAt(i, _tonM); return; }
    const x = TON_V.x + Math.cos(d.th) * r, z = TON_V.z + Math.sin(d.th) * r, y = tonH(x, z) + d.sz * 0.7 + Math.abs(Math.sin(r * 1.3 + i)) * 0.6 * clamp(3 - te);
    _tonQ.setFromEuler(_tonE.set(r * 0.9 + i, i, r * 0.6)); _tonM.compose(_tonV.set(x, y, z), _tonQ, _tonS.setScalar(d.sz)); U.rocks.setMatrixAt(i, _tonM); });
  U.rocks.instanceMatrix.needsUpdate = true;
  U.mudD.forEach((d, i) => { const k = rf - 3.5 - d.lag * 5, on = E && k > 0;
    if (!on) { _tonM.makeScale(0, 0, 0); U.mud.setMatrixAt(i, _tonM); return; }
    const r = 3.5 + k + 1.5, x = TON_V.x + Math.cos(d.th) * r, z = TON_V.z + Math.sin(d.th) * r, y = tonH(x, z) + 0.8 + d.up * (1.5 + te * 1.1);
    _tonM.compose(_tonV.set(x, y, z), _tonQ.identity(), _tonS.set(1, 0.6, 1).multiplyScalar(d.sz * (0.7 + 0.35 * te) * clamp(k / 2))); U.mud.setMatrixAt(i, _tonM); });
  U.mud.instanceMatrix.needsUpdate = true; U.mud.material.opacity = 0.6 * clamp(2.2 - te * 0.25);
  // ---- el cable: luz, pulsos y trozos que saltan
  const kb = te - TON_BREAK, broken = kb > 0;
  U.cableM.emissiveIntensity = 0.75 * (broken ? clamp(1 - kb * 0.8) : 1);
  U.brkM.emissive.set(broken ? 0xff5a20 : COL.light); U.brkM.emissiveIntensity = broken ? 2.2 * Math.exp(-kb * 0.9) + 0.15 : U.cableM.emissiveIntensity;
  for (const p of U.pieces) { if (!p.brk) continue; const m = p.m;
    if (!broken) { m.position.copy(p.c); m.rotation.set(0, 0, 0); continue; }
    const k = kb, dr = (1 - Math.exp(-k * 1.4)) / 1.4; m.position.set(p.c.x + p.v.x * dr, p.c.y + p.v.y * dr - 2.2 * k * k, p.c.z + p.v.z * dr);
    const fl2 = tonH(m.position.x, m.position.z) + 0.5; if (m.position.y < fl2) m.position.y = fl2;
    const sp = 1 - Math.exp(-k * 1.2); m.rotation.set(p.w.x * sp, p.w.y * sp, p.w.z * sp); }
  U.pulses.forEach((sp, i) => { const s = ((t * 0.32 + i / U.pulses.length) % 1); let vis = true, op = 1;
    if (broken) { vis = s < U.sBreak[0]; op = clamp(1 - kb * 0.7); }
    sp.visible = vis && op > 0.01 && net > 0.02; if (!sp.visible) return; sp.position.copy(U.curve.getPointAt(s)); sp.material.opacity = op * Math.min(1, net * 2); });
  U.spk.forEach((p, i) => { p.visible = broken && kb < 4.5; if (p.visible) burst(p, U.ends[i], t, 0, 1.6, 0.7, true, 3); p.material.opacity = clamp(1.4 - kb * 0.3); });
  U.endGlow.forEach(s => { s.visible = broken; s.scale.setScalar(7 + Math.sin(t * 17) * 1.2); s.material.opacity = clamp(1.5 - kb * 0.15); });
  // ---- internet en la isla: los puntos se apagan uno a uno (las casas siguen con luz)
  for (const d of U.dots) { const k = clamp((net - d.th) * 12 + 0.5), br = 0.85 + 0.15 * Math.sin(t * 3 + d.ph);
    d.sp.visible = k > 0.01; d.sp.scale.setScalar(1.3 * (0.4 + 0.6 * k) * br); d.sp.material.opacity = k; d.ln.visible = k > 0.02; d.ln.material.opacity = 0.55 * k; }
  U.trunk.material.opacity = 0.9 * clamp(net * 1.5); U.trunk.visible = net > 0.02;
  U.beacon.material.color.set(net > 0.05 ? COL.light : 0x3a3a3a).multiplyScalar(net > 0.05 ? 1 + 2 * (0.5 + 0.5 * Math.sin(t * 6)) : 1);
  U.rings.forEach((r, i) => { const ph = (t * 0.6 + i / 3) % 1; r.scale.setScalar(1 + ph * 9); r.material.opacity = (1 - ph) * 0.7 * clamp(net * 1.4); r.visible = net > 0.03; });
  // icono «sin conexión»
  const ko = clamp((0.45 - net) / 0.3); U.off.visible = ko > 0.01;
  if (U.off.visible) { const s = ko < 1 ? 1 + Math.sin(ko * Math.PI) * 0.25 : 1; U.off.scale.setScalar(7.5 * eo(ko) * s); U.off.position.y = 15 + 0.3 * Math.sin(t * 2.2); U.off.material.opacity = Math.min(1, ko * 1.5);
    G.getWorldQuaternion(_tonQ).invert(); U.off.quaternion.copy(_tonQ).multiply(cam.quaternion); }
}
// cámara (marco local) para u 0..1 (≈ 6,5 s): llega desde arriba, plano 3/4 (isla, volcán, cable en el corte), erupción en u ≈ 0,15, cable roto en ≈ 0,22,
// y se acerca a la isla mientras se apaga internet (0,5–1)
function TON_CAM(u) {
  const c = camKeys(u, [
    [0.00, [40, 330, 220], [-30, 0, -2], 34],
    [0.12, [110, 140, 205], [-30, 12, -2], 34],
    [0.26, [140, 62, 168], [-32, 28, -4], 34],
    [0.50, [132, 54, 152], [-26, 30, -4], 34],
    [1.00, [62, 30, 100], [2, 11, 0], 33],
  ]);
  return [c.p.x, c.p.y, c.p.z, c.l.x, c.l.y, c.l.z, c.f];
}
// ---------------------------------------------------------------- 26 · los incidentes en el fondo del mar junto a Brasil (38,3–42,9 s):
// «Y no son los tiburones: tres de cada cuatro veces es un ancla o una red de pesca».
// Un tiburón (≈3 m, de maqueta, simpático) huele el cable y se va; un mercante (≈16 m) arrastra su ancla, engancha el cable 2 y lo PARTE
// (chispas y latigazo); pasa un pesquero con su red de arrastre rozando el fondo.
// Marco: el de la franja (como la playa): origen en la orilla de Brasil a nivel del mar (y = 0), +X mar adentro, z ∈ [−20, 20].
// API: buildIncidents() → Group (userData.anchors: shark, anchor, snapPoint, net, ship) · incidentsAt(t, {shark, anchor, snap, net}) (todo 0..1)
//      incCable2() (el tramo del cable 2 que se rompe; ya va dentro de buildIncidents) · INC_CAM(u) → [px,py,pz, lx,ly,lz, fov] (u 0..1 en 4,6 s)
const INC_XH = 19.0;            // x donde el ancla engancha el cable 2
const INC_ZD = 1.0;             // z donde cae el ancla (entre los dos cables)
const INC_XN = 15.6; const INC_NYAW = -0.3, INC_NZ = -1.6, INC_NL = 19;   // la red: rumbo (gira hacia la cámara), z por donde cruza y recorrido
           // x por donde pasa la red
const INC_SN = [16.5, CABLE_Z]; // donde el tiburón huele el cable 1
const INC_R = 0.055;            // radio de los cables
const incBed = (x, z) => seabedY(x, z) - SEA;
const incSS = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const incWin = (x, a, b) => clamp((x - a) / (b - a));
let _incPuffT = null;
function incPuffTex() { return _incPuffT || (_incPuffT = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,.95)'); r.addColorStop(0.45, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); })); }

// ---------------------------------------------------------------- el tiburón (de maqueta: gris azulado, vientre blanco, ojos grandes). Mira a +X, arriba +Y; mide ≈ 3,1 m
function incShark() {
  const top = new THREE.Color(0x7f97ad), belly = new THREE.Color(0xf5f7fa), parts = [];
  const NX = 56, NR = 28;
  const rad = tb => tb < 0.03 ? 0.055 * Math.sqrt(tb / 0.03) : tb < 0.6 ? 0.055 + 0.325 * Math.pow(Math.sin(tb / 0.6 * Math.PI / 2), 1.2) : 0.38 * Math.sqrt(Math.max(0, 1 - Math.pow((tb - 0.6) / 0.4, 2)));
  { const P = [], C = [], U = [], I = [];
    for (let i = 0; i <= NX; i++) { const tb = i / NX, x = -1.5 + 3 * tb, r = rad(tb);
      for (let j = 0; j <= NR; j++) { const f = j / NR * Math.PI * 2, c = Math.cos(f), s = Math.sin(f);
        P.push(x, r * s * (s > 0 ? 0.95 : 0.78), r * c * 0.88); U.push(tb, j / NR);
        const w = incSS((-s - 0.08) / 0.3); const col = top.clone().lerp(belly, w); C.push(col.r, col.g, col.b); } }
    for (let i = 0; i < NX; i++) for (let j = 0; j < NR; j++) { const a = i * (NR + 1) + j, b = a + NR + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals(); parts.push(g.toNonIndexed()); }
  const fin = (sh, th, col, fn) => { const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: th * 0.5, bevelSize: th * 0.6, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -th / 2); if (fn) fn(g); const n = g.attributes.position.count, C = new Float32Array(n * 3); for (let i = 0; i < n; i++) { C[i * 3] = col.r; C[i * 3 + 1] = col.g; C[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(C, 3)); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); parts.push(g); };
  const S2 = pts => { const s = new THREE.Shape(); s.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) pts[i].length === 4 ? s.quadraticCurveTo(...pts[i]) : s.lineTo(...pts[i]); s.closePath(); return s; };
  // aleta dorsal, segunda dorsal, cola (lóbulo de arriba más grande) y pectorales
  fin(S2([[0.52, 0.28], [0.25, 0.62, -0.16, 0.86], [-0.06, 0.55, 0.02, 0.3]]), 0.05, top);
  fin(S2([[-0.66, 0.15], [-0.8, 0.3, -0.96, 0.36], [-0.88, 0.24, -0.9, 0.14]]), 0.035, top);
  fin(S2([[-1.32, 0.07], [-1.6, 0.38, -2.0, 0.8], [-1.78, 0.36, -1.66, 0.04], [-1.8, -0.18, -1.84, -0.46], [-1.55, -0.2, -1.32, -0.06]]), 0.05, top);
  for (const sd of [1, -1]) fin(S2([[0.24, 0], [0.12, 0.45, -0.36, 0.66], [-0.1, 0.3, -0.16, 0]]), 0.04, top, g => {
    g.rotateX(Math.PI / 2 + 0.5); if (sd < 0) g.scale(1, 1, -1); g.translate(0.55, -0.17, 0.2 * sd); });
  const geo = mergeGeometries(parts); geo.computeBoundingSphere();
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.2, side: THREE.DoubleSide });
  const body = new THREE.Mesh(geo, mat); body.castShadow = true; body.receiveShadow = true;
  const g = new THREE.Group(); g.add(body);
  // ojos grandes y brillantes (lo que lo hace simpático) y una sonrisa suave
  const eyeM = new THREE.MeshPhysicalMaterial({ color: 0x0b0d12, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03 });
  const hiM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const sd of [1, -1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 14), eyeM); e.position.set(1.02, 0.1, 0.225 * sd); e.scale.set(1, 1.08, 0.75); g.add(e);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.012, 8, 24), new THREE.MeshStandardMaterial({ color: 0xf2f5f8, roughness: 0.5 })); ring.position.copy(e.position); ring.position.z += 0.012 * sd; ring.rotation.y = sd > 0 ? -0.35 : Math.PI + 0.35; ring.rotation.x = 0; ring.scale.set(1, 1.08, 1); g.add(ring);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), hiM); h.position.set(1.05, 0.135, 0.272 * sd); g.add(h); }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 6, 24, 1.5), new THREE.MeshStandardMaterial({ color: 0x3a4656, roughness: 0.6 }));
  smile.rotation.set(Math.PI / 2, 0, -0.75); smile.position.set(0.98, -0.175, 0); g.add(smile);
  const base = Float32Array.from(geo.attributes.position.array);
  g.userData = { body, geo, base };
  return g;
}
// ondula el cuerpo: A amplitud (m), ph fase, bend curva de giro
function incSharkFlex(sh, A, ph, bend) {
  const { geo, base } = sh.userData, p = geo.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) { const x = base[i], tb = clamp((x + 2.0) / 3.5), w = Math.pow(1 - tb, 1.7);
    p[i + 2] = base[i + 2] + A * w * Math.sin(ph - 4.2 * (1 - tb)) + bend * (1 - tb) * (1 - tb); }
  geo.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------- un barco (casco en planta con proa a −z, obra viva roja, timón y hélice: lo que se ve desde abajo)
function incHull(L, B, draft, free, colTop, colBot) {
  const sh = new THREE.Shape(); sh.moveTo(-B / 2, -L / 2 + 0.4); sh.quadraticCurveTo(-B / 2, -L / 2, -B / 2 + 0.4, -L / 2); sh.lineTo(B / 2 - 0.4, -L / 2); sh.quadraticCurveTo(B / 2, -L / 2, B / 2, -L / 2 + 0.4);
  sh.lineTo(B / 2, L * 0.12); sh.quadraticCurveTo(B / 2, L * 0.4, 0, L / 2); sh.quadraticCurveTo(-B / 2, L * 0.4, -B / 2, L * 0.12); sh.closePath();
  const part = (y0, y1, col, bev) => { const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 16 });
    g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); const m = new THREE.Mesh(g, paint(col, 0.45, 0.4)); m.castShadow = true; m.receiveShadow = true; return m; };
  const g = new THREE.Group();
  g.add(part(-draft + 0.25, -0.3, colBot, 0.25));
  g.add(part(-0.3, free, colTop, 0.12));
  // timón y hélice (girando) bajo la popa
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.5, metalness: 0.5 });
  const brass = metal(0xc9a45c, 0.3);
  const rud = rbox(0.14, 1.3, 1.0, paint(colBot, 0.5, 0.3), 0.05); rud.rotation.y = Math.PI / 2; rud.position.set(0, -draft - 0.25, L / 2 - 0.55); g.add(rud);
  const prop = new THREE.Group(); prop.position.set(0, -draft - 0.25, L / 2 - 1.35);
  const hub = cyl(0.13, 0.13, 0.35, brass, 16); hub.rotation.x = Math.PI / 2; prop.add(hub);
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), brass); b.scale.set(0.42, 1, 0.12); b.position.y = 0.3; const a = new THREE.Group(); a.rotation.z = k * Math.PI * 2 / 3; b.rotation.y = 0.5; a.add(b); prop.add(a); }
  g.add(prop);
  const shaft = cyl(0.06, 0.06, 0.8, dark, 10); shaft.rotation.x = Math.PI / 2; shaft.position.set(0, -draft - 0.25, L / 2 - 1.85); g.add(shaft);
  g.userData.prop = prop; return g;
}
function incMerchant() {      // mercante pequeño (≈16 m): casco azul marino, obra viva roja, puente blanco a popa, chimenea y unos contenedores
  const L = 16, B = 4.2, g = incHull(L, B, 1.8, 1.4, 0x1d2f52, 0xb8382f);
  const white = paint(0xf1f3f5, 0.4, 0.5);
  const br = rbox(3.2, 2.4, 3.0, white, 0.15); br.position.set(0, 2.6, L / 2 - 2.6); g.add(br);
  const fun = cyl(0.45, 0.5, 1.6, paint(0xe2a331, 0.4), 20); fun.position.set(0, 4.5, L / 2 - 2.4); g.add(fun);
  const cols = [0xd94a3a, 0x2f7fd0, 0xe2a331, 0x3aa776, 0xd94a3a];
  cols.forEach((c, i) => { const b = rbox(3.0, 1.1, 2.0, paint(c, 0.5, 0.3), 0.06); b.position.set(0, 1.95, -L / 2 + 3.2 + i * 2.05); g.add(b); });
  g.userData.hawse = v3(B / 2 - 0.55, -0.35, -L / 2 + 1.6); g.userData.L = L;
  return g;
}
function incTrawler() {       // pesquero (≈11 m): casco rojo y blanco, puente adelante, pórtico de popa
  const L = 11, B = 3.6, g = incHull(L, B, 1.5, 1.2, 0xe8ecef, 0xc0392b);
  const wh = rbox(2.4, 1.9, 2.4, paint(0xf1f3f5, 0.4, 0.5), 0.12); wh.position.set(0, 2.2, -L / 2 + 3.4); g.add(wh);
  const blue = paint(0x2f7fd0, 0.4); const gm = metal(0xb9c0c9, 0.35);
  for (const sd of [-1, 1]) g.add(bar(v3(sd * 1.5, 1.2, L / 2 - 0.6), v3(sd * 1.1, 4.0, L / 2 - 0.9), 0.08, gm));
  g.add(bar(v3(-1.15, 4.0, L / 2 - 0.9), v3(1.15, 4.0, L / 2 - 0.9), 0.08, gm));
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(B + 0.06, 0.22, L * 0.62), blue); stripe.position.set(0, 0.85, -0.6); g.add(stripe);
  g.userData.stern = v3(0, 0.2, L / 2 - 0.7); g.userData.L = L;
  return g;
}

// ---------------------------------------------------------------- el ancla (clásica, de cepo: se lee a la primera). Cruz (crown) en el origen, caña hacia +Y, brazos en el plano YZ
function incAnchor() {
  const m = new THREE.MeshStandardMaterial({ color: 0x3b4049, roughness: 0.42, metalness: 0.65 });
  const g = new THREE.Group();
  const sh = cyl(0.075, 0.09, 1.75, m, 18); sh.position.y = 0.875; g.add(sh);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 10, 28), m); ring.position.y = 1.92; ring.rotation.y = Math.PI / 2; ring.castShadow = true; g.add(ring);
  const stock = cyl(0.055, 0.055, 1.5, m, 14); stock.rotation.z = Math.PI / 2; stock.position.y = 1.62; g.add(stock);
  for (const k of [-1, 1]) { const b = sph(0.08, m, 12, 8); b.position.set(0.75 * k, 1.62, 0); g.add(b); }
  // brazos: arco desde la cruz, subiendo hacia la caña, con uña (pala) en la punta
  const arms = []; for (let i = 0; i <= 20; i++) { const u = i / 20, a = (u * 2 - 1) * 1.15; arms.push(v3(0, 0.7 - 0.72 * Math.cos(a), 0.78 * Math.sin(a))); }
  g.add(tube(arms, 0.07, m, 40, false, 12));
  for (const k of [-1, 1]) { const a = 1.15 * k, tip = v3(0, 0.7 - 0.72 * Math.cos(a), 0.78 * Math.sin(a));
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 4), m); f.scale.set(0.35, 1, 1); f.castShadow = true;
    f.position.copy(tip).add(v3(0, 0.1, 0.02 * k)); f.rotation.x = -0.75 * k; g.add(f);
    const pt = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), m); pt.position.copy(tip).add(v3(0, 0.36, -0.12 * k)); pt.rotation.x = -0.75 * k; g.add(pt); }
  const crown = sph(0.1, m, 14, 10); g.add(crown);
  return g;
}

// ---------------------------------------------------------------- la cadena (eslabones instanciados a lo largo de una curva)
function incChain(maxN = 110) {
  const geo = new THREE.TorusGeometry(0.075, 0.026, 8, 16); geo.scale(1, 1.5, 1);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x353a42, roughness: 0.4, metalness: 0.7 }), maxN);
  im.castShadow = true; im.frustumCulled = false; im.count = 0; return im;
}
const _incQ = new THREE.Quaternion(), _incQ2 = new THREE.Quaternion(), _incY = new THREE.Vector3(0, 1, 0);
function incChainSet(im, a, b, sag) {
  const mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= sag;
  const cv = new THREE.QuadraticBezierCurve3(a, mid, b), L = cv.getLength(), n = Math.min(im.instanceMatrix.count, Math.max(2, Math.floor(L / 0.19)));
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, p = cv.getPointAt(u), tg = cv.getTangentAt(u);
    _incQ.setFromUnitVectors(_incY, tg); _incQ2.setFromAxisAngle(_incY, (i % 2) * Math.PI / 2); _incQ.multiply(_incQ2);
    _o.position.copy(p); _o.quaternion.copy(_incQ); _o.scale.setScalar(1); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); }
  im.count = n; im.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- el tramo del cable 2 que se rompe (x ∈ [1, 44], z = CABLE2_Z, medio enterrado). Se deforma con incCable2Set
function incCable2() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.45, metalness: 0.15 });
  const A = new THREE.Mesh(new THREE.BufferGeometry(), m), B = new THREE.Mesh(new THREE.BufferGeometry(), m); A.castShadow = B.castShadow = true; A.receiveShadow = B.receiveShadow = true;
  g.add(A, B);
  // los extremos rotos: cobre y fibra al rojo (se apagan)
  const hot = glowM(0xff6a1f, 4), tips = [];
  for (let k = 0; k < 2; k++) { const t = new THREE.Group(); const c = new THREE.Mesh(new THREE.SphereGeometry(INC_R * 1.05, 14, 10), hot); t.add(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: new THREE.Color(1.0, 0.45, 0.15).multiplyScalar(3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); sp.scale.setScalar(0.5); t.add(sp);
    t.userData.sp = sp; t.userData.c = c; t.visible = false; g.add(t); tips.push(t); }
  g.userData = { A, B, tips, hot, x0: 1, x1: 44 };
  incCable2Set(g, 0, 0, 0, -1, 0);
  return g;
}
// D: desplazamiento en z del punto de enganche (negativo = arrastrado hacia −z), Ly: cuánto se levanta de la arena, W: semiancho de la «V»,
// s: rotura (< 0 = entero), t: tiempo (para el latigazo)
function incCable2Set(g, D, Ly, W, s, t) {
  const U = g.userData, x0 = U.x0, x1 = U.x1, W2 = Math.max(W, 0.5);
  const pt = (x, env, envY, tipK) => { const q = clamp(1 - Math.abs(x - INC_XH) / W2), p = 0.6 * q + 0.4 * incSS(q);
    let dz = D * p, dy = Ly * p;
    if (s >= 0) { const lag = (1 - q) * 2.4; dz = D * p * Math.exp(-3.4 * s) * Math.cos(10.5 * s + lag) * (s > 0 ? 1 : 1); dy = Ly * p * Math.exp(-4 * s) + tipK * Math.pow(q, 3) * Math.sin(Math.PI * Math.min(1, s * 2.2)) * Math.exp(-1.5 * s); }
    const z = CABLE2_Z + dz; let y = incBed(x, z) + dy;
    const e = Math.min(x - x0, x1 - x) / 2; if (e < 1) y -= 0.25 * (1 - e);       // los extremos se meten en la arena
    return v3(x, y, z); };
  const build = (mesh, xa, xb) => { const n = Math.max(6, Math.round((xb - xa) * 4)), P = [];
    for (let i = 0; i <= n; i++) P.push(pt(lerp(xa, xb, i / n), 0, 0, 0.9));
    mesh.geometry.dispose(); mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), n * 2, INC_R, 10, false); return P; };
  if (s < 0) { build(U.A, x0, x1); U.B.visible = false; for (const tp of U.tips) tp.visible = false; return; }
  const gap = 0.05 + 0.8 * eo(clamp(s * 1.6));
  const PA = build(U.A, x0, INC_XH - gap), PB = build(U.B, INC_XH + gap, x1); U.B.visible = true;
  const glow = Math.exp(-3 * s);
  [PA[PA.length - 1], PB[0]].forEach((p, k) => { const tp = U.tips[k]; tp.visible = glow > 0.03; tp.position.copy(p); tp.userData.sp.material.opacity = glow; tp.userData.sp.scale.setScalar(0.25 + 0.5 * glow); });
  U.hot.emissiveIntensity = 4 * glow + 0.2;
}

// ---------------------------------------------------------------- la red de arrastre (embudo de malla con relinga de flotadores naranjas, burlones que ruedan por el fondo,
// puertas y cables hasta el pesquero). Marco local: la boca en z = 0, avanza hacia −z; y = 0 el fondo
function incNet() {
  const g = new THREE.Group(), NU = 22, NV = 44, LEN = 8.5;
  const tex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = 'rgba(190,225,235,0.16)'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(240,250,255,0.95)'; c.lineWidth = 3.2;
    for (let i = -8; i <= 16; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 256, 256); c.stroke(); c.beginPath(); c.moveTo(i * 32, 256); c.lineTo(i * 32 + 256, 0); c.stroke(); } });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(9, 5);
  const sec = (s, th) => { const hw = lerp(3.0, 0.42, Math.pow(s, 0.7)), h = lerp(2.5, 0.75, Math.pow(s, 0.8)), yc = 0.15 + h / 2, c = Math.cos(th), sn = Math.sin(th);
    return v3(hw * Math.sign(c) * Math.pow(Math.abs(c), 0.65), yc + h / 2 * Math.sign(sn) * Math.pow(Math.abs(sn), 0.8), s * LEN - 0.7 * Math.max(0, sn) * (1 - s) * (1 - s)); };
  const P = [], UV = [], I = [];
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) { const p = sec(i / NU, j / NV * Math.PI * 2); P.push(p.x, p.y, p.z); UV.push(j / NV, i / NU); }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setIndex(I); geo.computeVertexNormals();
  const netM = new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.85, emissive: 0x2a4a55, emissiveIntensity: 0.6 });
  const net = new THREE.Mesh(geo, netM); net.renderOrder = 2; g.add(net);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), netM); cap.scale.set(0.42, 0.38, 0.6); cap.position.set(0, 0.15 + 0.75 / 2, LEN); g.add(cap);
  const rope = new THREE.MeshStandardMaterial({ color: 0xece4c8, roughness: 0.7 });
  const line = (f, n, r, m) => { const pts = []; for (let i = 0; i <= n; i++) pts.push(f(i / n)); return tube(pts, r, m, n * 3, false, 8); };
  for (const th of [Math.PI / 2, 0, Math.PI, Math.PI * 0.25, Math.PI * 0.75]) g.add(line(s => sec(s, th), 16, 0.028, rope));
  const head = line(u => sec(0, u * Math.PI), 24, 0.04, rope); g.add(head);
  const footM = new THREE.MeshStandardMaterial({ color: 0x24272d, roughness: 0.6 });
  g.add(line(u => sec(0, Math.PI + u * Math.PI), 24, 0.06, footM));
  const floatM = plastic(0xff7a2b, 0.3), floats = [];
  for (let k = 0; k < 9; k++) { const f = sph(0.15, floatM, 16, 12); f.position.copy(sec(0, Math.PI * (k + 0.5) / 9)).add(v3(0, 0.12, 0)); g.add(f); floats.push(f); }
  const bobs = [];
  for (let k = 0; k < 11; k++) { const b = cyl(0.17, 0.17, 0.13, footM, 18); const p = sec(0, Math.PI + Math.PI * (k + 0.5) / 11); b.position.copy(p); b.rotation.z = Math.PI / 2; g.add(b); bobs.push(b); }
  // puertas (otter boards) y bridas
  const doorM = paint(0xf2b415, 0.4), doors = [];
  for (const sd of [-1, 1]) { const d = rbox(1.4, 0.85, 0.12, doorM, 0.07); d.position.set(3.9 * sd, 0.75, -5.5); d.rotation.y = Math.PI / 2 + 0.35 * sd; d.rotation.z = 0.1 * sd; g.add(d); doors.push(d);
    g.add(bar(v3(3.9 * sd, 0.75, -5.5), sec(0, sd > 0 ? 0 : Math.PI).add(v3(0, 1.1, 0)), 0.02, rope));
    g.add(bar(v3(3.9 * sd, 0.75, -5.5), sec(0, sd > 0 ? -0.15 : Math.PI + 0.15), 0.02, rope)); }
  g.userData = { net, geo, base: Float32Array.from(P), bobs, doors, LEN, NV, NU };
  return g;
}

// ---------------------------------------------------------------- todo junto
function buildIncidents() {
  const G = new THREE.Group(); G.name = 'incidents';
  const A = { shark: new THREE.Object3D(), anchor: new THREE.Object3D(), snapPoint: new THREE.Object3D(), net: new THREE.Object3D(), ship: new THREE.Object3D() };
  for (const k in A) G.add(A[k]);
  // tiburón
  const shark = incShark(); shark.scale.setScalar(0.9); shark.rotation.order = 'YZX'; G.add(shark);
  const NS = v3(INC_SN[0], incBed(INC_SN[0], INC_SN[1]) + 0.13, INC_SN[1]);
  const bubM = new THREE.MeshPhysicalMaterial({ color: 0xdff8ff, roughness: 0.05, transparent: true, opacity: 0.6, clearcoat: 1, depthWrite: false });
  const bubs = []; for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.025 + 0.02 * hash(i * 3.3), 10, 8), bubM); b.visible = false; G.add(b); bubs.push(b); }
  // mercante, cadena, ancla
  const ship = incMerchant(); ship.rotation.y = -Math.PI / 2; G.add(ship);
  const chain = incChain(); G.add(chain);
  const anchor = incAnchor(); anchor.scale.setScalar(0.95); G.add(anchor);
  // cable 2 (el tramo que se rompe)
  const cab = incCable2(); G.add(cab);
  // arena levantada (ancla y red)
  const puffM = () => new THREE.SpriteMaterial({ map: incPuffTex(), color: 0xe2d2ae, transparent: true, depthWrite: false, opacity: 0 });
  const puffs = []; for (let i = 0; i < 34; i++) { const p = new THREE.Sprite(puffM()); p.visible = false; G.add(p); puffs.push(p); }
  const npuffs = []; for (let i = 0; i < 26; i++) { const p = new THREE.Sprite(puffM()); p.visible = false; G.add(p); npuffs.push(p); }
  // chispas de la rotura + destello + luz
  const SPK = new THREE.Group(); G.add(SPK);
  const sp1 = sparks(SPK, 110, 0xffa040, 0.11), sp2 = sparks(SPK, 70, 0xff3b24, 0.08);
  for (const s of [sp1, sp2]) { s.material.toneMapped = false; s.material.color.multiplyScalar(2.2); }
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: new THREE.Color(1, 0.55, 0.2).multiplyScalar(4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
  flash.visible = false; G.add(flash);
  const pl = new THREE.PointLight(0xff7a30, 0, 9, 1.6); G.add(pl);
  // red y pesquero
  const net = incNet(); const bedN = incBed(INC_XN, 0) - 0.05; G.add(net);
  const trawler = incTrawler(); trawler.rotation.y = INC_NYAW; G.add(trawler);
  const wm = new THREE.MeshStandardMaterial({ color: 0x8d949e, roughness: 0.5, metalness: 0.4 });
  const warps = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), wm); G.add(m); return m; });
  for (const b of [ship, trawler]) b.traverse(o => { o.castShadow = false; });
  G.userData = { anchors: A, shark, NS, bubs, ship, chain, anchor, cab, puffs, npuffs, sp1, sp2, flash, pl, net, trawler, warps, bedN };
  incidentsAt(0, { shark: 0, anchor: 0, snap: 0, net: 0 }, G);
  _INC = G;
  return G;
}
let _INC = null;
// claves del tiburón: [s, dx, dy, dz (respecto al punto que huele), giro, cabeceo]
const INC_SHK = [[0, -0.3, 2.3, 6.2, 1.57, -0.12], [0.22, -0.15, 1.3, 3.3, 1.57, -0.25], [0.4, 0, 0.46, 1.27, 1.57, -0.35], [0.47, 0, 0.38, 1.24, 1.57, -0.44], [0.53, 0, 0.48, 1.3, 1.57, -0.32],
  [0.59, 0, 0.38, 1.24, 1.57, -0.44], [0.66, 0, 0.5, 1.35, 1.57, -0.22], [0.78, 0.7, 0.85, 1.9, 0.2, 0.02], [0.88, 0.55, 1.4, 3.4, -0.95, 0.12], [1, -0.2, 2.5, 7.0, -1.57, 0.14]];
const incShk = (s, c) => mono(s, INC_SHK.map(k => k[0]), INC_SHK.map(k => k[c]));
// el ancla: posición de la cruz e inclinación según a (0..0,35 baja · 0,35..0,75 se arrastra · 0,75..1 tira del cable) y la rotura
function incAnchorPose(a, s) {
  const zHook = CABLE2_Z - 0.12, zPull = CABLE2_Z - 2.6;
  let z, lift, tilt, span, sag;
  const yHang = -2.4;
  if (a < 0.35) { const u = eio(a / 0.35); z = INC_ZD; const yb = incBed(INC_XH, z) + 0.12; const y = lerp(yHang, yb, u);
    return { p: v3(INC_XH, y, z), tilt: 0.05 * Math.sin(a * 40) * (1 - u), span: 0, sag: 0 }; }
  if (a < 0.75) { const u = (a - 0.35) / 0.4; z = lerp(INC_ZD, zHook, incSS(u) * 0.3 + u * 0.7); lift = 0.1; tilt = 1.15 * eo(clamp(u * 3)) + 0.06 * Math.sin(u * 30); span = 5.2 * eo(clamp(u * 1.6)); sag = 1.3; }
  else { const u = incSS((a - 0.75) / 0.25); z = lerp(zHook, zPull, u); lift = lerp(0.1, 0.42, u); tilt = 1.15 - 0.15 * u; span = 5.2 + 0.6 * u; sag = lerp(1.3, 0.25, u); }
  if (s > 0) { const u = eo(s); z -= 3.2 * u; lift = lerp(lift, 0.1, u); tilt = 1.0 + 0.1 * u + 0.25 * Math.exp(-4 * s) * Math.sin(s * 18); span += 3.2 * u; sag = lerp(sag, 0.9, u); }
  return { p: v3(INC_XH, incBed(INC_XH, z) + lift, z), tilt, span, sag };
}
function incidentsAt(t, o = {}, G = _INC) {
  const U = G.userData, A = U.anchors;
  const sS = clamp(o.shark ?? 0), aS = clamp(o.anchor ?? 0), snS = clamp(o.snap ?? 0), nS = clamp(o.net ?? 0);
  // ---- tiburón
  { const sh = U.shark, on = sS > 0.001 && sS < 0.999; sh.visible = on;
    const yaw0 = incShk(sS, 4), shake = 0.26 * Math.sin((sS - 0.62) / 0.12 * Math.PI * 2) * (sS > 0.62 && sS < 0.74 ? Math.sin((sS - 0.62) / 0.12 * Math.PI) : 0);
    sh.position.set(U.NS.x + incShk(sS, 1), U.NS.y + incShk(sS, 2), U.NS.z + incShk(sS, 3));
    sh.rotation.set(0.0, yaw0 + shake, incShk(sS, 5));
    const fast = 1 - 0.75 * (incWin(sS, 0.33, 0.42) - incWin(sS, 0.64, 0.74));
    const dy = (incShk(Math.min(1, sS + 0.02), 4) - incShk(Math.max(0, sS - 0.02), 4)) / 0.04;
    incSharkFlex(sh, 0.13 * fast, t * Math.PI * 2 * (1.2 + 1.2 * fast), clamp(-dy * 0.05, -0.3, 0.3));
    A.shark.position.copy(sh.position);
    U.bubs.forEach((b, i) => { const s0 = 0.45 + i * 0.035, k = (sS - s0) / 0.28; b.visible = on && k > 0 && k < 1; if (!b.visible) return;
      b.position.set(U.NS.x + 0.15 * Math.sin(i * 2.1 + k * 6), U.NS.y + 0.12 + k * 1.6, U.NS.z + 0.08 * Math.cos(i * 1.3 + k * 5)); b.material.opacity = 0.6 * (1 - k); }); }
  // ---- barco, cadena, ancla
  const P = incAnchorPose(aS, snS), sh = U.ship;
  const hOff = sh.userData.hawse.clone().applyAxisAngle(_incY, -Math.PI / 2);
  sh.position.set(INC_XH - hOff.x, 0.05 * Math.sin(t * 1.4), P.p.z - P.span - hOff.z);
  sh.rotation.set(0.02 * Math.sin(t * 1.1), -Math.PI / 2, 0.008 * Math.sin(t * 0.9 + 1));
  sh.userData.prop.rotation.z = t * 3;
  A.ship.position.set(sh.position.x, -1.8, sh.position.z);
  const an = U.anchor; an.position.copy(P.p); an.rotation.set(-P.tilt, 0, 0);
  an.updateMatrixWorld(); const ring = v3(0, 1.92, 0).applyMatrix4(an.matrix);
  sh.updateMatrix(); const hw = sh.userData.hawse.clone().applyMatrix4(sh.matrix);
  incChainSet(U.chain, ring, hw, P.sag);
  A.anchor.position.copy(P.p);
  // ---- cable 2: la «V» del enganche y la rotura
  const zHook = CABLE2_Z - 0.12;
  let D = 0, Ly = 0, Wd = 2;
  if (aS > 0.75) { const u = incSS((aS - 0.75) / 0.25); const P1 = incAnchorPose(Math.max(aS, 0.75), 0); D = Math.min(0, P1.p.z - 0.25 - CABLE2_Z) * (u > 0 ? 1 : 0); Ly = 0.38 * u; Wd = 2.5 + 3.2 * u; }
  if (snS > 0) { const P1 = incAnchorPose(1, 0); D = P1.p.z - 0.25 - CABLE2_Z; Ly = 0.38; Wd = 5.7; }
  incCable2Set(U.cab, D, Ly, Wd, snS > 0 ? snS : -1, t);
  const P1 = incAnchorPose(1, 0); A.snapPoint.position.set(INC_XH, incBed(INC_XH, P1.p.z) + 0.4, P1.p.z - 0.25);
  // ---- arena levantada por el ancla
  const crownAt = a => incAnchorPose(a, 0).p;
  U.puffs.forEach((p, i) => { const a0 = i < 5 ? 0.33 + i * 0.006 : 0.37 + (i - 5) / 29 * 0.62, age = (aS - a0) / 0.22 + (snS > 0 ? snS * 0.6 : 0);
    p.visible = aS > a0 && age < 1; if (!p.visible) return;
    const c = crownAt(a0), r1 = hash(i * 7.1), r2 = hash(i * 3.7);
    p.position.set(c.x + (r1 - 0.5) * 1.2, c.y + 0.15 + age * (0.5 + r2 * 0.6), c.z + (r2 - 0.5) * 0.7 + 0.3);
    p.scale.setScalar(0.5 + age * (1.4 + r1)); p.material.opacity = 0.6 * Math.sin(Math.PI * Math.min(1, age * 1.6 + 0.12)) * (1 - age); });
  // ---- la rotura: chispas, destello, luz
  { const on = snS > 0 && snS < 1, c = A.snapPoint.position; const st = snS * 1.1;
    U.sp1.visible = U.sp2.visible = on && snS < 0.85;
    if (U.sp1.visible) { burst(U.sp1, c, st, 0, 0.9, 1.0, false, 1.2); burst(U.sp2, c, st * 0.85, 0, 0.7, 1.0, false, 0.8);
      U.sp1.material.opacity = U.sp2.material.opacity = 1 - incSS(snS / 0.85); }
    const fl = snS > 0 ? Math.exp(-9 * snS) : 0; U.flash.visible = fl > 0.02; U.flash.position.copy(c); U.flash.scale.setScalar(0.6 + 2.4 * fl); U.flash.material.opacity = Math.min(1, fl * 1.4);
    U.pl.position.copy(c); U.pl.intensity = 60 * fl; }
  // ---- la red: avanza en diagonal (la boca mira a medias a la cámara), apoyada en la pendiente del fondo
  { const net = U.net, on = nS > 0.001 && nS < 0.999; net.visible = on; U.trawler.visible = on; for (const w of U.warps) w.visible = on;
    const P0 = incNetPos(nS), f = INC_NF.clone(), nrm = incBedN(P0.x, P0.z);
    const zA = f.clone().negate().addScaledVector(nrm, f.dot(nrm)).normalize(), xA = new THREE.Vector3().crossVectors(nrm, zA);
    net.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, nrm, zA)); net.position.set(P0.x, incBed(P0.x, P0.z) - 0.05, P0.z);
    const nu = net.userData, p = nu.geo.attributes.position.array, b = nu.base;
    for (let i = 0; i < p.length; i += 3) { const s = clamp(b[i + 2] / nu.LEN); p[i] = b[i] * (1 + 0.04 * Math.sin(t * 3.1 + s * 7)); p[i + 1] = b[i + 1] + 0.07 * s * Math.sin(t * 2.6 + s * 9 + b[i] * 0.8); }
    nu.geo.attributes.position.needsUpdate = true;
    for (const bb of nu.bobs) bb.rotation.x = -nS * INC_NL / 0.17;
    const tr = U.trawler; tr.position.copy(P0).addScaledVector(f, 15.5); tr.position.y = 0.05 * Math.sin(t * 1.6); tr.rotation.set(0.025 * Math.sin(t * 1.3), INC_NYAW, 0, 'YXZ');
    tr.updateMatrixWorld(); net.updateMatrixWorld();
    nu.doors.forEach((d, k) => { const a = d.getWorldPosition(new THREE.Vector3()), st = tr.localToWorld(v3((k ? 1 : -1) * 1.2, 0.6, tr.userData.L / 2 - 0.7));
      const w = U.warps[k], dd = st.clone().sub(a); w.position.copy(a).add(st).multiplyScalar(0.5); w.scale.set(1, dd.length(), 1); w.quaternion.setFromUnitVectors(_incY, dd.normalize()); });
    A.net.position.set(P0.x, incBed(P0.x, P0.z) + 1.3, P0.z);
    U.npuffs.forEach((pf, i) => { const n0 = i / 26, age = (nS - n0) / 0.16; pf.visible = on && nS > n0 && age < 1; if (!pf.visible) return;
      const r1 = hash(i * 5.3), r2 = hash(i * 9.1), q = incNetPos(n0), side = (r1 - 0.5) * 5.4;
      pf.position.set(q.x + xA.x * side - f.x * (0.5 + age), incBed(q.x, q.z) + 0.25 + age * 0.6, q.z + xA.z * side - f.z * (0.5 + age));
      pf.scale.setScalar(0.6 + age * (1.6 + r2)); pf.material.opacity = 0.5 * Math.sin(Math.PI * Math.min(1, age * 1.5 + 0.1)) * (1 - age); }); }
}
const INC_NF = new THREE.Vector3(-Math.sin(INC_NYAW), 0, -Math.cos(INC_NYAW));
function incNetPos(n) { return v3(INC_XN, 0, INC_NZ).addScaledVector(INC_NF, (n - 0.55) * INC_NL); }
function incBedN(x, z) { const e = 0.5; return v3(-(incBed(x + e, z) - incBed(x - e, z)) / (2 * e), 1, -(incBed(x, z + e) - incBed(x, z - e)) / (2 * e)).normalize(); }

// ---------------------------------------------------------------- la cámara (marco local) para u 0..1 (4,6 s): plano medio bajo el agua mirando hacia la orilla (−x).
// El tiburón (0–0,3) en el cable 1 (a la izquierda), luego se desliza a la derecha: cae el ancla, se arrastra y parte el cable 2 (0,3–0,75); se abre y pasa la red (0,75–1)
const INC_CAMK = [
  [0.00, [26.6, -4.4, 8.6], [16.5, -5.0, 7.4], 50],
  [0.27, [26.2, -4.5, 7.6], [16.5, -5.1, 6.9], 50],
  [0.40, [27.4, -4.2, 0.4], [18.6, -4.4, -0.9], 54],
  [0.58, [27.2, -4.3, -2.8], [18.8, -4.9, -3.8], 54],
  [0.70, [26.6, -4.4, -5.6], [18.8, -5.4, -6.8], 52],
  [0.80, [27.0, -4.5, -5.2], [18.6, -5.5, -6.0], 54],
  [0.90, [28.4, -4.4, -2.0], [16.8, -5.2, -3.2], 58],
  [1.00, [28.8, -4.3, -1.2], [16.8, -5.1, -2.8], 58]];
function INC_CAM(u) { const c = camKeys(clamp(u), INC_CAMK); return [c.p.x, c.p.y, c.p.z, c.l.x, c.l.y, c.l.z, c.f]; }
// ---------------------------------------------------------------- la escena entera: el mapa (20), la franja del Atlántico (21), la playa de Brasil (22), la península (23),
// la fibra por dentro (24, decorado aparte), Tonga (25) y los incidentes del fondo (26). Si una pieza aún no existe, se pone un sustituto sencillo.
// stageAt(t, st) lo anima todo con la línea de tiempo de la voz (K) y elige la luz según dónde está la cámara.
const FIB0 = new THREE.Vector3(0, -1500, 0);          // la fibra por dentro: lejos, bajo el mapa
const TONm = mapP(...GEO.TONGA), FIJm = mapP(...GEO.FIJI);
const TX = TONm.clone().sub(FIJm).setY(0).normalize(), TZ = new THREE.Vector3().crossVectors(TX, SY), TON_SEA = 30;
const TON_M = new THREE.Matrix4().makeBasis(TX, SY, TZ).setPosition(TONm.clone().setY(TON_SEA));
const Bw = (x, y, z) => slabP(x, y + SEA, z), Iw = (x, y, z) => slabP(SL + x, y + SEA, z), Sw = (x, y, z) => slabP(x, y, z);
const Tw = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(TON_M), Fw = (x, y, z) => new THREE.Vector3(x, y, z).add(FIB0);
function placeholder(txt, w = 4, col = '#ffcf6b') { const g = new THREE.Group(); const l = label(txt, { size: 70, w, pill: true, color: col }); l.position.y = w * 0.3; g.add(l); g.userData.anchors = {}; g.userData.ph = l; return g; }
async function buildScene() {
  S.world = new THREE.Group(); scene.add(S.world);
  // el mapa (o un suelo azul oscuro)
  const fMap = fnOf('buildMap');
  if (fMap) { S.map = await fMap(); S.world.add(S.map); }
  else { const pl = new THREE.Mesh(new THREE.PlaneGeometry(3600, 1800), new THREE.MeshStandardMaterial({ color: 0x0b1a2c, roughness: 0.85 })); pl.rotation.x = -Math.PI / 2; pl.receiveShadow = true; S.world.add(pl); }
  // la franja del Atlántico
  S.slab = await buildSlab(); S.world.add(S.slab);
  // la playa de Brasil y la península (en el marco de la franja)
  const fB = fnOf('buildBeach'), fI = fnOf('buildIberia'), fT = fnOf('buildTonga'), fF = fnOf('buildFiber'), fN = fnOf('buildIncidents');
  S.beach = fB ? await fB() : placeholder('PLAYA DE BRASIL', 6); atBeach(S.beach); S.world.add(S.beach);
  S.iberia = fI ? await fI() : placeholder('PUEBLO · COCINA · ANTENA', 8, '#9fd0ff'); atIberia(S.iberia); S.world.add(S.iberia);
  if (!fI) S.iberia.userData.ph.position.set(30, 6, 0);
  if (!fB) S.beach.userData.ph.position.set(-10, 4, 0);
  S.inc = fN ? await fN() : null; if (S.inc) { atBeach(S.inc); S.world.add(S.inc); }
  // Tonga, en su sitio del Pacífico
  S.tonga = fT ? await fT() : placeholder('TONGA', 10, '#ff8a6b'); S.tonga.matrixAutoUpdate = false; S.tonga.matrix.copy(TON_M); S.world.add(S.tonga);
  // la fibra por dentro (decorado aparte)
  S.fiber = fF ? await fF() : placeholder('FIBRA (DENTRO)', 30, '#9ff3ff'); S.fiber.position.copy(FIB0); scene.add(S.fiber);
  // la burbuja del mensaje (cuando sale del mar en Brasil y sube por la playa)
  S.msg = msgBubble(); S.msg.visible = false; S.world.add(S.msg);
  envAll(scene);
}
// ---------- la luz según dónde está la cámara (se mezcla al pasar de un sitio a otro)
const _wTmp = new THREE.Vector3();
function moodWeights(p, t) {
  if (inFiberWin(t)) return { fibra: 1 };
  const sl = slabLocal(p);
  if (sl.x > -XB && sl.x < SL + XE && Math.abs(sl.z) < SW / 2 && sl.y < SEA && sl.x > 0 && sl.x < SL) {      // bajo el mar de la franja
    const dep = SEA - sl.y; return { agua: 1 - _sm(9, 18, dep), abismo: _sm(9, 18, dep) };
  }
  const dB = p.distanceTo(BEACH0()), dI = p.distanceTo(Iw(25, 0, 0)), dT = p.distanceTo(Tw(-30, 0, 0));
  const w = { brasil: 1 - _sm(45, 170, dB), iberia: 1 - _sm(60, 200, dI), tonga: 1 - _sm(80, 320, dT) };
  w.museo = Math.max(0, 1 - w.brasil - w.iberia - w.tonga); return w;
}
function stageAt(t, st) {
  NOW = t; const fib = inFiberWin(t);
  S.world.visible = !fib; S.fiber.visible = fib;
  moodMix(moodWeights(st.p, t));
  const under = !fib && slabUnderLoose(st.p);
  // la franja: pulsos del mensaje (frase 2: llega a Brasil; frase 8: cruza de Portugal a Brasil; frase 12: sale en Brasil)
  let pulse = -1, pk = 1;
  if (t > 4.3 && t < 6.2) pulse = lerp(0.13, -0.02, clamp((t - 4.3) / 1.6));
  else if (t > K['hunde_8'] - 0.3 && t < K['segundo_8'] + 0.6) pulse = lerp(1.0, -0.01, eio(clamp((t - K['hunde_8']) / (K['segundo_8'] + 0.1 - K['hunde_8']))));
  else if (t > 50.2 && t < 51.6) pulse = lerp(0.07, -0.01, clamp((t - 50.2) / 1.3));
  slabAt(t, { under, pulse, pulseK: pk, pulseS: 1 });
  // el mapa
  const mAt = fnOf('mapAt');
  if (S.map && mAt) {
    mAt(t, { draw: win(t, K['99_3'] - 0.1, 3.4), glow: 1 + 0.6 * env(t, K['cables_3'] - 0.1, K['cables_3'] + 0.7, 0.15, 0.4) + 0.4 * env(t, K['600_9'] - 0.2, K['ano_9'], 0.2, 0.5),
      ella: t > K['hunde_8'] ? clamp((t - K['hunde_8']) / (K['segundo_8'] + 0.1 - K['hunde_8'])) : 0, breaks: t > K['rompen_9'] - 0.1 && t < 43 ? clamp((t - K['rompen_9'] + 0.1) / 2.2) : 0,
      mauritania: t < 20 ? 1 - win(t, K['entero_4'] - 0.35, 0.6) : 1, tonga: 1 - win(t, K['pais_11'] - 0.1, 1.8), sat: env(t, K['99_3'] - 0.3, K['si_4'], 0.4, 0.5), ace: t > K['rompe_4'] - 0.05 && t < 20 ? 1 : 0, tongaCut: t > K['partio_11'] - 0.1 ? 1 : 0 });
  }
  // la playa: el móvil (encendido con la notificación al principio y al final = bucle)
  const fBeach = fnOf('beachAt');
  if (fBeach) fBeach(t, { screen: t < 6 ? 1 : win(t, 56.2, 0.12), notif: t < 6 ? 1 : win(t, 56.3, 0.45), buzz: env(t, 0.12, 0.62, 0.05, 0.1) + env(t, 0.95, 1.4, 0.05, 0.1) + env(t, 56.3, 57.0, 0.05, 0.25) });
  // la burbuja del mensaje sale del mar y sube por la playa hasta el móvil (frase 12)
  { const k = clamp((t - 51.2) / (56.25 - 51.2)), vis = t > 51.2 && t < 56.3; S.msg.visible = vis;
    if (vis) { const fP = fnOf('beaMsgPath'); if (fP) { const r = fP(eio(k)); S.msg.position.copy(S.beach.localToWorld(r.pos.clone())); S.msg.scale.setScalar(r.scale); }
      else { const a = Bw(1, 0.4, 6), b = Bw(-7, 1.0, 9); S.msg.position.lerpVectors(a, b, eio(k)); S.msg.position.y += Math.sin(k * Math.PI) * 1.5; S.msg.scale.setScalar(lerp(1.4, 0.15, k)); }
      S.msg.quaternion.copy(cam.quaternion); } }
  // la península: escribe, envía, ondas, pulso por la torre y el tubo, y de la estación al mar
  const fIb = fnOf('iberiaAt');
  if (fIb) fIb(t, { type: win(t, 13.6, 0.85), send: win(t, K['enviarlo_5'] + 0.15, 0.45), waves: clamp((t - K['su_5'] - 0.1) / (K['cercana_5'] + 0.45 - K['su_5'])), pulse: clamp((t - K['entra_6']) / (K['luz_6'] - K['entra_6'] + 0.1)),
    pulse2: clamp((t - K['portugal_8'] + 0.1) / (K['hunde_8'] + 0.35 - K['portugal_8'])) });
  // la fibra
  const fFb = fnOf('fiberAt'); if (fFb && fib) fFb(t, { speed: 1, hair: win(t, K['fino_7'] - 0.2, 0.5), pulses: 1 });
  // los incidentes del fondo (frase 10)
  const fInc = fnOf('incidentsAt');
  if (fInc && S.inc) fInc(t, { shark: clamp((t - K['y_10'] + 0.1) / (K['tres_10'] - K['y_10'] + 0.2)), anchor: clamp((t - K['tres_10']) / (K['ancla_10'] + 0.25 - K['tres_10'])), snap: clamp((t - K['ancla_10'] - 0.2) / 0.5),
    net: clamp((t - K['o_10'] + 0.2) / (K['pesca_10'] + 0.6 - K['o_10'])) });
  // Tonga (frase 11): la erupción con «volcán»; sin internet desde «el país entero»
  const fTon = fnOf('tongaAt'); if (fTon) fTon(t, { te: t - (K['volcan_11'] + 0.05), net: 1 - win(t, K['pais_11'] - 0.1, 1.8) });
  // luces que siguen a lo que se mira
  const c = st.l; lightsAt(c, st.p.distanceTo(c));
  for (const u of SLB.U) u.value = t;
}
// la cámara bajo el agua de la franja (con un margen para la superficie)
function slabUnderLoose(pw) { const p = slabLocal(pw); return p.x > 0 && p.x < SL && Math.abs(p.z) < SW / 2 + 0.01 && p.y < SEA - 0.02 && p.y > 0; }
// ---------------------------------------------------------------- UN SOLO PLANO, SIN CORTES: la cámara viaja por la maqueta y cambia de sitio ENTRANDO en los sitios
// (el agua, la ventana, la antena, la fibra). Claves en el mundo (con ayudas por marco: Bw playa, Sw franja, Iw península, Tw Tonga, Fw fibra) y
// «ventanas» donde manda la cámara que trae cada pieza (BEA_CAM0, IBE_CAM_IN/OUT, FIB_CAM, INC_CAM, TON_CAM). La fibra es un decorado aparte: se entra
// y se sale con un destello blanco (el salto no se ve y el desenfoque de movimiento no lo cruza).
let CK = [], CWIN = [], FIBW = [0, 0];
const camArr = c => [[c[0], c[1], c[2]], [c[3], c[4], c[5]], c[6] || 40];
function inFiberWin(t) { return t >= FIBW[0] && t < FIBW[1]; }
// cámara de una pieza (marco local) → mundo
function winCam(fr, c) { const p = fr(c[0], c[1], c[2]), l = fr(c[3], c[4], c[5]); return [p.x, p.y, p.z, l.x, l.y, l.z, c[6] || 40]; }
function buildCam() {
  const fv = n => { const f = fnOf(n); return f ? f : null; }, val = n => { try { return eval('typeof ' + n + " !== 'undefined' ? " + n + ' : null'); } catch (e) { return null; } };
  const A = S.beach.userData.anchors || {}, ph = A.phone ? (A.phone.isVector3 ? A.phone.clone() : S.beach.worldToLocal(wpos(A.phone))) : v3(-7, 0.72, 9);
  const C0 = val('BEA_CAM0') || [ph.x + 0.1, ph.y + 0.21, ph.z + 0.14, ph.x, ph.y, ph.z + 0.01, 38];
  const P = (p, l, f = 40) => [p, l, f], k = (t, a) => [t, ...a], V = v => [v.x, v.y, v.z];
  const kB = (t, p, l, f) => k(t, P(V(Bw(...p)), V(Bw(...l)), f)), kS = (t, p, l, f) => k(t, P(V(Sw(...p)), V(Sw(...l)), f)), kI = (t, p, l, f) => k(t, P(V(Iw(...p)), V(Iw(...l)), f));
  const kW = (t, p, l, f) => k(t, P(p, l, f)), kT = (t, p, l, f) => k(t, P(V(Tw(...p)), V(Tw(...l)), f));
  const c0 = winCam(Bw, C0);
  // eje del primer plano: del móvil hacia la cámara (en horizontal) → alejarse/acercarse sin girar
  const c0p = v3(C0[0], C0[1], C0[2]), c0l = v3(C0[3], C0[4], C0[5]), back = c0p.clone().sub(c0l).setY(0).normalize();
  const along = (d, h) => c0l.clone().addScaledVector(back, d).add(v3(0, h, 0)), fwd = (d, h) => c0l.clone().addScaledVector(back, -d).add(v3(0, h, 0));
  // ventanas de las piezas
  const ibeIn = fv('IBE_CAM_IN'), ibeOut = fv('IBE_CAM_OUT'), fibC = fv('FIB_CAM'), incC = fv('INC_CAM'), tonC = fv('TON_CAM');
  const T = { inA: 13.35, inB: 14.95, outA: 15.1, outB: 20.95, fibA: 20.95, fibB: 26.95, incA: 38.55, incB: 42.6, tonA: 44.15, tonB: 49.65 };
  FIBW = [T.fibA, T.fibB];
  CWIN = [];
  if (ibeIn) CWIN.push([T.inA, T.inB, u => winCam(Iw, ibeIn(u))]);
  if (ibeOut) CWIN.push([T.outA, T.outB, u => winCam(Iw, ibeOut(u))]);
  CWIN.push([T.fibA, T.fibB, fibC ? (u => winCam(Fw, fibC(u))) : (u => winCam(Fw, [u * 2400, 0.2, 0.15, u * 2400 + 40, 0, 0, 70])), true]);
  if (incC) CWIN.push([T.incA, T.incB, u => winCam(Bw, incC(u))]);
  if (tonC) CWIN.push([T.tonA, T.tonB, u => winCam(Tw, tonC(u))]);
  const W0 = (t0, f, fr) => k(t0, camArr(winCam(fr, f(0)))), W1 = (t1, f, fr) => k(t1, camArr(winCam(fr, f(1))));
  const keys = [
    // A · 0–3,3 el móvil en la toalla (= último fotograma); «y tú estás en Brasil»: se aleja hacia atrás y arriba (sin girar) y se ve la playa con el mar
    k(0, camArr(c0)), kB(1.05, V(along(0.17, 0.235)), V(c0l), C0[6] - 1.5),
    kB(1.75, V(along(0.75, 0.75)), V(fwd(0.35, 0)), 38), kB(2.45, V(along(3.0, 2.3)), V(fwd(2.6, -0.25)), 42),
    kB(3.25, V(along(7.5, 4.8)), V(fwd(13, -0.6)), 46),
    // B · 3,3–5,8 vuela sobre la orilla, se mete en el agua: el cable en el fondo, la luz corre hacia la playa
    kB(3.95, [-3, 2.3, 11], [14, -1.2, 7], 50), kB(4.35, [7.5, 0.55, 10], [20, -3.6, 7], 54), kB(4.62, [11.2, -1.25, 9.8], [22, -5.6, 6.5], 56),
    kB(5.2, [16.5, -3.4, 9.6], [26, -6.6, 6], 54), kB(5.8, [20.5, -4.0, 9.8], [29, -6.2, 6], 52),
    // C · 5,8–10,6 sube a toda prisa, sale del agua y de la maqueta: la franja sobre el mapa, se encienden los cables del mundo
    kB(6.2, [23.5, -1.6, 11], [33, 0.6, 6], 52), kB(6.5, [26.5, 2.6, 13], [40, -0.8, 4], 50),
    kS(7.3, [6, 110, 92], [86, 30, 0], 44), kS(8.6, [-70, 300, 250], [190, 0, -70], 42), kS(10.1, [-10, 380, 320], [260, 0, -90], 42),
    // D · 10,6–13,3 hacia Mauritania: el cable se rompe y el país se queda sin internet
    kS(11.35, [200, 210, 230], [300, 4, 52], 42), kS(12.6, [262, 101, 142], [308, 0, 56], 40), kS(13.25, [292, 92, 114], [338, 14, 28], 42),
    // E · al pueblo de España (de noche): entra por la ventana de la cocina; la madre envía
    ...(ibeIn ? [W0(T.inA, ibeIn, Iw), W1(T.inB, ibeIn, Iw)] : [kI(13.75, [-60, 70, 70], [30, 5, 10], 44), kI(14.15, [20, 18, 32], [40, 5, 10], 46), kI(14.45, [39, 5.5, 14], [40, 4.5, 9], 50),
      kI(14.75, [40, 4.6, 10.6], [40.2, 4.1, 9.2], 50), kI(T.inB, [40.05, 4.55, 10.5], [40.2, 4.1, 9.2], 49)]),
    // F · las ondas a la antena, baja por la torre y bajo la calle: la onda se vuelve luz en la fibra
    ...(ibeOut ? [W0(T.outA, ibeOut, Iw), W1(T.outB, ibeOut, Iw)] : [kI(T.outA, [40.1, 4.6, 10.8], [40.2, 4.2, 9.2], 49), kI(15.8, [41, 6, 18], [34, 12, 0], 50), kI(16.9, [36, 16, 14], [30, 25, -6], 48),
      kI(17.8, [32, 27, 3], [30, 27.5, -6], 46), kI(18.6, [31.5, 20, -2], [30, 10, -6], 48), kI(19.4, [30, 4.5, 4], [24, 1.5, 20], 50), kI(20.2, [20, 2.5, 26], [16, 1.6, 20], 46), kI(T.outB, [14, 1.75, 21], [10, 1.6, 20], 44)]),
    // G · dentro de la fibra (ventana con destello)
    // H · 26,9–33 sale en Portugal junto a la arqueta; el cable se hunde en el mar; sube y se ve cruzar la luz hasta Brasil
    kI(T.fibB, [3.5, 0.45, 6.5], [2.0, 0.2, 6], 50), kI(27.5, [5.2, 2.3, 10.5], [-3, -0.5, 6], 50), kI(28.1, [-1.5, 0.9, 9], [-10, -4, 6], 52), kI(28.42, [-5, -1.25, 8.5], [-14, -5.2, 6], 54),
    kI(29.0, [-13.5, -4.6, 9.5], [-26, -12, 6], 54), kS(29.6, [SL - 22, 41.5, 22], [SL - 70, 26, 0], 50), kS(30.6, [SL - 90, 112, 190], [300, 20, 0], 44),
    kS(32.0, [262, 212, 300], [222, 14, 0], 42), kS(33.0, [182, 300, 362], [200, 0, -40], 42),
    // I · 33–37,9 el mapa entero: más de 600 cables; chispas rojas donde se rompen
    kW(34.6, [-260, 720, 860], [160, 0, -260], 42), kW(36.4, [-420, 820, 980], [80, 0, -320], 42), kW(37.6, [-300, 380, 420], [-170, 20, 40], 44),
    // J · baja al fondo junto a Brasil: tiburón, ancla, red
    kS(38.15, [16, 58, 34], [20, 34, 4], 48), kS(38.45, [17, 41, 15], [22, 33, 4], 52),
    ...(incC ? [W0(T.incA, incC, Bw), W1(T.incB, incC, Bw)] : [kS(T.incA, [17.5, 37.4, 13], [24, 32.6, 2], 54), kS(40.5, [20, 36.6, 12], [25, 32.6, 0], 54), kS(T.incB, [23, 36.8, 13], [28, 33, 0], 54)]),
    // K · sale y vuela a Tonga (al otro lado del mapa)
    kS(42.95, [24, 46, 20], [0, 80, 120], 52), kW(43.4, [-300, 190, 110], [-760, 60, 160], 46), kW(43.8, [-880, 330, 170], [-1400, 40, 200], 44),
    ...(tonC ? [W0(T.tonA, tonC, Tw), W1(T.tonB, tonC, Tw)] : [kT(T.tonA, [-40, 150, 140], [-30, 0, 0], 44), kT(46.5, [-30, 60, 90], [-25, -5, 0], 44), kT(T.tonB, [-5, 35, 60], [5, 0, 0], 44)]),
    // L · vuelve a Brasil por tierra (Tonga queda al oeste): detrás del chiringuito, mirando al mar; la burbuja sale del agua y sube hasta el móvil
    kW(50.15, [-1180, 330, 260], [-620, 40, 110], 46), kS(50.75, [-150, 95, 20], [10, 40, 6], 46), kB(51.4, [-32, 11, 8], [6, 0, 6], 46),
    kB(52.4, V(along(16, 5.0)), V(fwd(6, -0.4)), 46), kB(53.6, V(along(5.5, 2.6)), V(fwd(2.2, 0)), 44),
    // M · baja al móvil: igual que el primer fotograma (bucle)
    kB(55.0, V(along(1.9, 1.35)), V(fwd(0.45, 0)), 40), kB(56.45, V(along(0.42, 0.4)), V(c0l), 36), k(END, camArr(c0)),
  ].filter(Boolean).sort((a, b) => a[0] - b[0]);
  CK = keys; S.C0 = c0;
}
function camAt(t) {
  for (const [a, b, f] of CWIN) if (t >= a && t <= b) { const c = f(clamp((t - a) / (b - a))); return { p: v3(c[0], c[1], c[2]), l: v3(c[3], c[4], c[5]), f: c[6] || 40, roll: 0 }; }
  if (t >= END - 1e-6 || t <= 1e-6) return { p: v3(S.C0[0], S.C0[1], S.C0[2]), l: v3(S.C0[3], S.C0[4], S.C0[5]), f: S.C0[6], roll: 0 };
  return camKeys(t, CK);
}
// el fotograma anterior (desenfoque de movimiento): no cruza los saltos a la fibra y desde la fibra
function prevT(t, dt) { const a = t - dt; for (const [w0, w1, f, jump] of CWIN) if (jump && ((a < w0) !== (t < w0) || (a < w1) !== (t < w1))) return t; return Math.max(0, a); }
// destellos: al entrar y salir de la fibra (todo blanco un instante), y la erupción de Tonga
function whiteAt(t) { const [a, b] = FIBW; return Math.max(Math.exp(-Math.pow((t - a) / 0.09, 2)), Math.exp(-Math.pow((t - b) / 0.09, 2))) * 0.97; }
function flashAt(t) { const te = t - (K['volcan_11'] + 0.05); return te > 0 ? 0.35 * Math.exp(-te / 0.18) : 0; }
// velo de agua al cruzar la superficie del mar (sube o baja)
function fillAt(t) { const st = camAt(t), sl = slabLocal(st.p); if (inFiberWin(t) || sl.x < 0 || sl.x > SL || Math.abs(sl.z) > SW / 2) return { k: 0, c: [0.6, 0.85, 0.95] };
  const d = Math.abs(sl.y - SEA); return { k: 0.55 * (1 - _sm(0.05, 0.5, d)), c: [0.62, 0.88, 0.96] }; }
// profundidad de campo: de cerca, suave; en el mapa, un poco (aspecto de maqueta)
function dofAt(t, st) { const f = st.p.distanceTo(st.l); if (inFiberWin(t)) return { focus: f, scale: 0 }; const k = f < 1.5 ? 0.55 : f < 40 ? 0.3 : 0.18; return { focus: f, scale: k * f }; }
// ---------------------------------------------------------------- HUD: rótulos de neón (punto en el objeto → línea que brilla → caja oscura con el texto, como el «200 m» de la
// referencia de Javi), títulos grandes («200.000 km/s», «600 CABLES», «¿SATÉLITE O CABLE?»), el cronómetro del cruce (6.000 km · 0,03 s) y la cabecera.
// Los subtítulos (los pone el montaje) van en y≈330: aquí nada entre y=230 y y=420.
let INK = '#F2F5F8', GREY = '#B4BEC9', HOT = '#FF8A3D', REDc = '#FF5A4E', AMBc = '#FFC24A', CYAN = '#5CF2E6', GOLD = '#FFD27A', GREENc = '#7CF0A9';
function buildHudPlan() { HFONT = 'Inter'; HW = [900, 600]; }
const cw = (t, t0, t1, d = 0.25) => win(t, t0, d) * (1 - win(t, t1, d));
function neon(P3, txt, sub, k, o = {}) {
  if (k <= 0.01 || !P3) return; const A = P3.isVector3 ? proj(P3) : P3; if (P3.isVector3 && !A.ok) return;
  const col = o.color || CYAN, size = o.size || 38, e = eo(clamp(k / 0.5)), dx = o.dx ?? 0, dy = o.dy ?? -170;
  hg.save(); hfont(size); hg.letterSpacing = '2px'; const tw = hg.measureText(txt).width; let sw = 0; if (sub) { hfont(Math.round(size * 0.55), false); sw = hg.measureText(sub).width; } hg.restore();
  const bw = Math.max(tw, sw) + 44, bh = sub ? size * 1.95 : size * 1.4;
  const bx = clamp(A.x + dx - bw / 2, 30, W - 30 - bw), by = clamp(A.y + dy - bh, 440, H - 280 - bh);
  const E = { x: clamp(A.x + dx, bx + 20, bx + bw - 20), y: A.y + dy < A.y ? by + bh : by };
  const ax = clamp(A.x, -50, W + 50), ay = clamp(A.y, -50, H + 50);
  hg.save(); hg.globalAlpha = clamp(k * 2.5); hg.lineCap = 'round';
  const lx = ax + (E.x - ax) * e, ly = ay + (E.y - ay) * e;
  hg.shadowColor = col; hg.shadowBlur = 16; hg.strokeStyle = col; hg.lineWidth = 4; hg.beginPath(); hg.moveTo(ax, ay); hg.lineTo(lx, ly); hg.stroke();
  hg.fillStyle = col; hg.beginPath(); hg.arc(ax, ay, 7, 0, 7); hg.fill();
  const kb = clamp((k - 0.35) / 0.4);
  if (kb > 0) { hg.globalAlpha = clamp(k * 2.5) * kb; hg.shadowBlur = 24; hg.shadowColor = 'rgba(0,0,0,.6)'; hg.fillStyle = 'rgba(10,16,22,.84)'; rr(hg, bx, by, bw, bh, 18); hg.fill();
    hg.shadowColor = col; hg.shadowBlur = 14; hg.strokeStyle = col; hg.lineWidth = 2.5; rr(hg, bx, by, bw, bh, 18); hg.stroke();
    hg.shadowBlur = 18; hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(size); hg.letterSpacing = '2px'; hg.fillText(txt, bx + bw / 2, by + (sub ? size * 0.78 : bh / 2 + 2));
    if (sub) { hg.shadowBlur = 0; hfont(Math.round(size * 0.55), false); hg.fillStyle = INK; hg.fillText(sub, bx + bw / 2, by + size * 1.45); } }
  hg.restore();
}
// título grande de neón (centrado), con un rebote al aparecer
function bigNeon(txt, y, size, col, k, sub = '') {
  if (k <= 0.01) return; const s = 0.85 + 0.15 * eo(clamp(k / 0.6));
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(W / 2, y); hg.scale(s, s); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(size); hg.letterSpacing = Math.round(size * 0.04) + 'px';
  hg.shadowColor = 'rgba(0,0,0,.85)'; hg.shadowBlur = 30; hg.fillStyle = 'rgba(0,0,0,.001)'; hg.fillText(txt, 0, 0);
  hg.shadowColor = col; hg.shadowBlur = 28; hg.fillStyle = col; hg.fillText(txt, 0, 0); hg.shadowBlur = 10; hg.fillStyle = '#ffffff'; hg.globalAlpha *= 0.55; hg.fillText(txt, 0, 0);
  if (sub) { hg.globalAlpha = clamp(k * 2); hg.shadowBlur = 12; hg.shadowColor = 'rgba(0,0,0,.9)'; hfont(Math.round(size * 0.36), false); hg.letterSpacing = '3px'; hg.fillStyle = INK; hg.fillText(sub, 0, size * 0.85); }
  hg.restore();
}
// cabecera: «ASÍ FUNCIONA · TU MENSAJE»
function hdr(t) {
  const a = win(t, 1.7, 0.4) * (1 - win(t, END - 1.1, 0.4)) * (1 - 0.85 * cw(t, FIBW[0] - 0.1, FIBW[1] + 0.1, 0.15)); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic'; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 12;
  hg.letterSpacing = '4px'; hfont(42); hg.fillStyle = INK; hg.textAlign = 'left'; hg.fillText('TU MENSAJE', 54, 142);
  hg.letterSpacing = '2px'; hfont(23, false); hg.fillStyle = GREY; hg.fillText('DE ESPAÑA A BRASIL EN 0,03 SEGUNDOS', 56, 178);
  hg.textAlign = 'right'; hfont(18, false); hg.fillStyle = GREY; hg.fillText('ASÍ', 1024, 112); hfont(32); hg.fillStyle = CYAN; hg.fillText('FUNCIONA', 1024, 148);
  hg.restore();
}
// el cronómetro del cruce: los km y los segundos corren mientras la luz cruza el océano
function crossClock(t, a) {
  if (a <= 0.01) return; const t0 = K['hunde_8'], t1 = K['segundo_8'] + 0.1, u = clamp((t - t0) / (t1 - t0)), ue = eio(u);
  const km = Math.round(6000 * ue / 10) * 10, sec = (0.03 * ue).toFixed(3).replace('.', ',');
  hg.save(); hg.globalAlpha = clamp(a * 2); const bw = 820, bh = 210, bx = (W - bw) / 2, y = 1470;
  hg.fillStyle = 'rgba(10,16,22,.84)'; rr(hg, bx, y, bw, bh, 22); hg.fill(); hg.shadowColor = GOLD; hg.shadowBlur = 16; hg.strokeStyle = GOLD; hg.lineWidth = 3; rr(hg, bx, y, bw, bh, 22); hg.stroke();
  hg.textBaseline = 'middle'; hg.textAlign = 'center'; hfont(76); hg.letterSpacing = '2px'; hg.fillStyle = GOLD; hg.fillText(km.toLocaleString('es-ES').replace(/\s/g, '.') + ' km', W / 2, y + 70);
  hg.shadowBlur = 10; hfont(56); hg.fillStyle = INK; hg.fillText(sec + ' s', W / 2, y + 152);
  // barra de Portugal a Brasil
  hg.shadowBlur = 0; hg.fillStyle = 'rgba(255,255,255,.18)'; rr(hg, bx + 40, y + bh - 22, bw - 80, 8, 4); hg.fill(); hg.fillStyle = GOLD; rr(hg, bx + 40, y + bh - 22, (bw - 80) * ue, 8, 4); hg.fill();
  hg.restore();
}
const anc = (g, n) => { const A = g && g.userData && g.userData.anchors; const a = A && A[n]; if (!a) return null; return a.isVector3 ? g.localToWorld(a.clone()) : wpos(a); };
function hudAt(t) {
  hudBegin(); hdr(t);
  // 1 · Brasil
  neon(Bw(-6.5, 0.7, 8.5), 'BRASIL', '18:47', cw(t, K['brasil_1'] - 0.15, K['ese_2'] + 0.25), { size: 50, color: AMBc, dy: -230 });
  // 2 · el fondo del mar
  neon(Sw(27, seabedY(27, CABLE_Z) + 0.2, CABLE_Z), 'FONDO DEL MAR', 'POR UN CABLE', cw(t, K['fondo_2'] - 0.1, K['mas_3'] + 0.2), { size: 42, dy: -260 });
  // 3 · 99 de cada 100 por cable; el satélite, casi solo
  neon(mapP(-42, 30, 0.5), '99 DE CADA 100', 'DATOS ENTRE CONTINENTES: POR CABLE', cw(t, K['99_3'] - 0.05, K['y_4'] + 0.1), { size: 46, color: CYAN, dy: -300 });
  const fA = fnOf('mapAnchor'), sat = fA ? fA('sat') : null;
  if (sat) neon(sat, 'SATÉLITE', 'MENOS DE 1 DE CADA 100', cw(t, K['viajan_3'] - 0.2, K['y_4'] + 0.1), { size: 30, color: GREY, dy: 200, dx: 120 });
  // 4 · Mauritania sin internet
  neon(mapP(...GEO.NKC, 0.5), 'MAURITANIA · 2018', '2 DÍAS SIN INTERNET', cw(t, K['entero_4'] - 0.3, K['al_5'] - 0.2), { size: 40, color: REDc, dy: -240 });
  // 5–6 · España, la antena, la fibra
  neon(Iw(40, 7, 10), 'ESPAÑA', '22:47', cw(t, 13.55, K['enviarlo_5'] + 0.1, 0.2), { size: 46, color: AMBc, dy: -220 });
  neon(anc(S.iberia, 'antenna') || Iw(30, 26, -6), 'ANTENA', '', cw(t, K['antena_5'] - 0.1, K['ahi_6'] + 0.4), { size: 42, dy: -200 });
  neon(Iw(14, 1.6, 20), 'FIBRA ÓPTICA', 'LUZ POR UN HILO DE CRISTAL', cw(t, K['fibra_6'] - 0.1, K['luz_6'] + 0.4), { size: 40, dy: -260 });
  // 7 · fino como un pelo, 200.000 km/s
  if (inFiberWin(t)) { neon(anc(S.fiber, 'fiber'), 'FIBRA · 0,125 mm', '', cw(t, K['fino_7'] - 0.1, K['a_7'] + 0.1, 0.2), { size: 36, dy: -220 });
    neon(anc(S.fiber, 'hair'), 'PELO', '', cw(t, K['pelo_7'] - 0.3, K['a_7'] + 0.1, 0.2), { size: 36, color: AMBc, dy: 220 });
    bigNeon('200.000 km/s', 1460, 112, CYAN, cw(t, K['200000_7'] - 0.05, FIBW[1] - 0.15, 0.2), 'LA VELOCIDAD DE LA LUZ EN EL CRISTAL'); }
  // 8 · Portugal; 6.000 km en 0,03 s
  neon(anc(S.iberia, 'station') || Iw(10, 4, 10), 'PORTUGAL', '', cw(t, K['portugal_8'] - 0.1, K['mar_8'] + 0.2), { size: 46, color: AMBc, dy: -230 });
  crossClock(t, cw(t, K['6000_8'] - 0.15, K['hay_9'] + 0.1));
  // 9 · más de 600 cables; se rompen 150–200 al año
  bigNeon('+600 CABLES', 1450, 104, CYAN, cw(t, K['600_9'] - 0.05, K['rompen_9'] - 0.2, 0.2));
  bigNeon('150–200', 1430, 120, REDc, cw(t, K['150_9'] - 0.05, K['y_10'] + 0.05, 0.2), 'ROTURAS CADA AÑO');
  // 10 · tiburones no; anclas y redes sí
  neon(anc(S.inc, 'shark'), 'TIBURONES', 'CASI NUNCA', cw(t, K['tiburones_10'] - 0.05, K['tres_10'] + 0.3), { size: 40, color: GREY, dy: -220 });
  neon(anc(S.inc, 'snapPoint') || anc(S.inc, 'anchor'), '3 DE CADA 4', 'ANCLAS Y REDES DE PESCA', cw(t, K['tres_10'] - 0.05, K['en_11'] + 0.1), { size: 50, color: REDc, dy: -260 });
  // 11 · Tonga, 5 semanas
  neon(anc(S.tonga, 'label') || anc(S.tonga, 'island') || Tw(10, 2, 0), 'TONGA · 2022', t > K['cinco_11'] - 0.1 ? '5 SEMANAS CASI SIN INTERNET' : 'SU ÚNICO CABLE', cw(t, K['tonga_11'] - 0.1, K['asi_12'] + 0.05), { size: 48, color: REDc, dy: -240 });
  // 13 · ¿satélite o cable?
  bigNeon('¿SATÉLITE', 1350, 108, GREY, cw(t, K['satelite_13'] - 0.05, END - 0.55, 0.3)); bigNeon('O CABLE?', 1490, 108, CYAN, cw(t, K['cable_13'] - 0.05, END - 0.55, 0.3));
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
  await loadEnv(); buildLights(); cam.near = 0.05; cam.far = 20000; cam.updateProjectionMatrix();
  await buildScene();
  await waitLoads();
  post.uniforms.ca.value = 0.2; post.uniforms.vig.value = 0.22; post.uniforms.bloom.value = 0.5;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s); window.glLost = () => renderer.getContext().isContextLost();
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
