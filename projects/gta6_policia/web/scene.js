// «GTA 6: la policía ya no te busca a ti» (17-11-2026): un solo plano continuo por una calle de Vice City al atardecer (maqueta): la policía busca
// tu ropa y tu coche; las seis estrellas y, debajo, las pistas (coche, ropa, aspecto, cámara, pareja) que se pueden borrar.
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
// ---------------------------------------------------------------- EL MUNDO: una calle de Vice City al atardecer, en maqueta. 1 unidad = 1 m.
// Ejes: +X hacia el este (a lo largo de la calle), +Y arriba, +Z hacia el sur (la playa). La cámara suele mirar al oeste, calle abajo, hacia la puesta de sol.
// Calzada z ∈ [−4, 4]; aceras z ∈ [−7,5, −4] (norte) y [4, 7,5] (sur). Edificios al norte (fachada en z = −7,5). El callejón, entre dos
// edificios, en x ∈ [4, 7,5]. La joyería (con su alarma) en x ∈ [−9, −1]. La cámara de seguridad cuelga de un pórtico en x = −10.
function fnOf(n) { try { return eval('typeof ' + n + " === 'function' ? " + n + ' : null'); } catch (e) { return null; } }
const RING = new THREE.Vector3(0, 0, 0);                    // donde rodean al protagonista (primer y último fotograma)
const ALLEY = { x0: 4, x1: 7.5, z0: -7.5, z1: -19, hide: new THREE.Vector3(6.35, 0, -11.6), bin: new THREE.Vector3(5.2, 0, -10.2) };
const SHOP = { x0: -9, x1: -1, door: -5.2, alarm: new THREE.Vector3(-2.6, 3.55, -7.38) };
const CCTV = { x: -10, y: 2.55, z: -0.7, beam: 2.9 };            // en un pórtico sobre la calle, detrás del protagonista
const WIT = new THREE.Vector3(-3.4, 0.16, -5.5);            // el testigo, en la acera de la joyería
const CAR0 = { p: new THREE.Vector3(3.9, 0, -0.9), yaw: Math.PI - 0.08 };   // el coche del protagonista, aparcado junto a él
const NEON = { pink: 0xff4fb0, teal: 0x45f0e0, yellow: 0xffd34a, violet: 0xa06bff, orange: 0xff8a3d, red: 0xff3b4e, blue: 0x3d8bff };
// posiciones del cerco de policía (primer fotograma): [x, z, orientación]; el frente del coche es su +x local
const RINGP = [[-6.8, -1.2, -0.05], [8.2, -1.3, Math.PI + 0.15], [-2.0, -2.5, -0.2]];
const yawDir = a => new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));       // hacia dónde mira un objeto con rotation.y = a
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
// ---------------------------------------------------------------- el cielo y la luz: 'vice' (atardecer rosa de Vice City, sol bajo) y 'noche' (callejón, más oscuro).
// moodSet(nombre) pone uno; moodMix({vice: 0.3, noche: 0.7}) mezcla. Cielo de degradado (cúpula que sigue a la cámara) + reflejos (PMREM de ese cielo).
const _o = new THREE.Object3D();      // objeto de trabajo para las matrices de las instancias
const ASSET = '/projects/gta6_policia/web/assets/';
const ENV = { rot: 0, env: 1 };
const TEXL = new THREE.TextureLoader(), PENDING = [];
function tx(path, srgb = true, rep = null) { let ok; PENDING.push(new Promise(a => { ok = a; })); const t = TEXL.load(ASSET + path, () => ok(), undefined, () => { console.error('ERROR textura ' + path); ok(); });
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
function waitLoads() { return Promise.all(PENDING); }
const C3 = h => new THREE.Color(h);
// sky: cénit, horizonte, suelo (bajo el horizonte), sol (dirección, color, tamaño); fog: color y densidad (FogExp2, por unidad); key: sol/foco; fill; hemi: cielo, suelo, intensidad
const MOODS = {
  vice:   { zen: 0x1a1452, hor: 0xe8725f, gnd: 0x191024, sunD: [-0.99, 0.085, -0.06], sunC: 0xffb070, sunS: 0.4, stars: 0.3, fogC: 0xb45a80, fogD: 0.0048,
            key: [0xffc6a2, 1.9], keyD: [0.55, 0.62, 0.56], fill: [0xff8a5c, 0.28], hemi: [0x8a70ff, 0x3a2232, 0.58], env: 0.55, exp: 1.0 },
  noche:  { zen: 0x070a24, hor: 0x3a2a66, gnd: 0x07070f, sunD: [-0.9, 0.1, -0.32], sunC: 0xff8a70, sunS: 0.35, stars: 0.9, fogC: 0x241a44, fogD: 0.008,
            key: [0x8f9cff, 1.1], keyD: [-0.5, 0.75, 0.4], fill: [0xff7ab0, 0.35], hemi: [0x4a4a9a, 0x1a1420, 0.5], env: 0.45, exp: 1.0 },
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
  moodSet('vice');
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
// ---------------------------------------------------------------- el decorado: la calle (asfalto, líneas, aceras), los edificios art déco con neón, las torres del fondo,
// palmeras, farolas, el callejón con su contenedor, la joyería con la alarma y la cámara de seguridad en su poste.
const SETU = {};
function boxUV(geo, w, h, d, tile) {              // UV a escala real: una tesela mide `tile` metros en cada cara
  const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  uv.needsUpdate = true; return geo;
}
function repT(t, rx = 1, ry = 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
function facTex(base, seed, emis) {                 // fachada pastel: 4 × 4 ventanas por tesela (12 m), algunas encendidas
  return repT(canvasTex(512, 512, (g, W2, H2) => {
    g.fillStyle = emis ? '#000' : base; g.fillRect(0, 0, W2, H2);
    if (!emis) { for (let i = 0; i < 2600; i++) { g.fillStyle = hash(i * 1.7 + seed) > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'; g.fillRect(hash(i * 3.1 + seed) * W2, hash(i * 5.3) * H2, 2 + hash(i) * 3, 2 + hash(i * 2) * 3); }
      g.fillStyle = 'rgba(255,255,255,.22)'; for (let r = 0; r < 4; r++) g.fillRect(0, r * 128 + 4, W2, 5); }
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { const x = c * 128 + 30, y = r * 128 + 36, w = 68, h = 68, lit = hash(seed * 7.3 + c * 3.1 + r * 5.7) < 0.4;
      if (emis) { if (lit) { g.fillStyle = hash(seed + c * 9 + r) > 0.3 ? '#ffd9a0' : '#bfe0ff'; g.fillRect(x, y, w, h); } }
      else { g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x - 6, y - 6, w + 12, h + 12); g.fillStyle = lit ? '#ffdcae' : '#26314c'; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x + w / 2 - 2, y, 4, h); g.fillRect(x, y + h / 2 - 2, w, 4); } }
  }));
}
function towerTex(seed, emis) {                      // torre lejana: muchas ventanas pequeñas
  return repT(canvasTex(256, 512, (g, W2, H2) => { g.fillStyle = emis ? '#000' : '#171b3a'; g.fillRect(0, 0, W2, H2);
    for (let c = 0; c < 8; c++) for (let r = 0; r < 16; r++) { const lit = hash(seed * 3.3 + c * 7.1 + r * 1.9) < 0.34; g.fillStyle = lit ? (hash(c + r * 3 + seed) > 0.4 ? '#ffcf8f' : '#9fd0ff') : (emis ? '#000' : '#232a52'); g.fillRect(c * 32 + 7, r * 32 + 8, 18, 16); } }));
}
function neonSign(txt, col, h = 1.2, vertical = false) {       // letrero de neón (texto con brillo); mide h de alto (o de ancho por letra si es vertical)
  const css = '#' + new THREE.Color(col).getHexString(), n = txt.length, cw = vertical ? 150 : 110 * n + 60, ch = vertical ? 150 * n + 40 : 190;
  const t = canvasTex(cw, ch, (g, W2, H2) => { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 120px Inter, sans-serif'; g.shadowColor = css; g.shadowBlur = 26; g.fillStyle = css;
    if (vertical) for (let i = 0; i < n; i++) { g.fillText(txt[i], W2 / 2, 90 + i * 150); g.fillText(txt[i], W2 / 2, 90 + i * 150); }
    else { g.fillText(txt, W2 / 2, H2 / 2 + 6); g.fillText(txt, W2 / 2, H2 / 2 + 6); }
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '900 120px Inter, sans-serif'; g.globalAlpha = 0.55;
    if (vertical) for (let i = 0; i < n; i++) g.fillText(txt[i], W2 / 2, 90 + i * 150); else g.fillText(txt, W2 / 2, H2 / 2 + 6); });
  const w = vertical ? h : h * cw / ch, hh = vertical ? h * ch / cw : h;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5), fog: false }));
  m.renderOrder = 3; return m;
}
function palmGeo() {                                   // palmera: tronco curvo + 9 hojas arqueadas (≈ 8 m)
  const S2 = 32, pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(v3(Math.sin(u * 1.2) * 0.035 * S2, u * 0.26 * S2, 0)); }
  const trunk = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.17, 7), leaves = [];
  for (let k = 0; k < 9; k++) { const L = (0.12 + hash(k * 3.7) * 0.03) * S2, lg = new THREE.PlaneGeometry(L, 0.05 * S2, 12, 2); lg.translate(L / 2, 0, 0);
    const p = lg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), u = x / L, wid = Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * 0.35);
      p.setY(i, y * wid); p.setZ(i, (-u * u * 0.075 * S2) - Math.abs(y) * wid * 0.35); }
    lg.rotateX(-Math.PI / 2); lg.rotateZ(0.32); lg.rotateY(k / 9 * Math.PI * 2 + hash(k) * 0.35); lg.translate(Math.sin(1.2) * 0.035 * S2, 0.262 * S2, 0); leaves.push(lg.toNonIndexed()); }
  const lv = mergeGeometries(leaves); lv.computeVertexNormals(); return { trunk, leaves: lv };
}
function buildSet() {
  const G = new THREE.Group(), add = (m, x, y, z) => { m.position.set(x, y, z); G.add(m); return m; };
  const box = (w, h, d, mat, cs = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = cs; m.receiveShadow = true; return m; };
  // ---- suelo: la base de la maqueta, la calzada, las líneas y las aceras
  const asph = repT(canvasTex(512, 512, (g, W2, H2) => { g.fillStyle = '#2c2d35'; g.fillRect(0, 0, W2, H2); for (let i = 0; i < 9000; i++) { const v = 30 + hash(i * 1.3) * 50 | 0; g.fillStyle = `rgba(${v + 20},${v + 20},${v + 30},.55)`; g.fillRect(hash(i * 2.7) * W2, hash(i * 4.1) * H2, 1.5, 1.5); } }), 78, 3);
  const mAsph = new THREE.MeshPhysicalMaterial({ map: asph, roughness: 0.7, clearcoat: 0.18, clearcoatRoughness: 0.45, envMapIntensity: 0.9 });
  const side = repT(canvasTex(256, 256, (g, W2, H2) => { g.fillStyle = '#cbbba8'; g.fillRect(0, 0, W2, H2); g.strokeStyle = 'rgba(90,70,60,.35)'; g.lineWidth = 3; g.strokeRect(0, 0, W2, H2); for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(80,60,50,.07)'; g.fillRect(hash(i * 3.3) * W2, hash(i * 7.7) * H2, 3, 3); } }), 130, 2);
  const mSide = new THREE.MeshStandardMaterial({ map: side, roughness: 0.85 }), mDark = new THREE.MeshStandardMaterial({ color: 0x16131f, roughness: 0.6, metalness: 0.2 });
  add(box(270, 1.4, 44, mDark, false), -65, -0.71, -13.5);                                             // base
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0x140e20, roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; add(floor, 0, -1.42, 0);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(270, 8), mAsph); road.rotation.x = -Math.PI / 2; road.receiveShadow = true; add(road, -65, 0.01, 0);
  const cross = new THREE.Mesh(new THREE.PlaneGeometry(8, 28), mAsph); cross.rotation.x = -Math.PI / 2; cross.receiveShadow = true; add(cross, 21, 0.012, -18);
  const mY = new THREE.MeshStandardMaterial({ color: 0xffd34a, roughness: 0.6, emissive: 0x3a2a00 }), mW = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 });
  for (let x = -200; x < 70; x += 5) add(box(2.6, 0.02, 0.16, mY, false), x + 1.3, 0.025, 0);
  for (const z of [-3.75, 3.75]) add(box(270, 0.02, 0.12, mW, false), -65, 0.025, z);
  for (let i = 0; i < 7; i++) add(box(0.55, 0.02, 6.6, mW, false), 13.2 + i * 0.95 - 3.4, 0.027, 0);    // paso de cebra
  for (const [x0, x1] of [[-200, 17], [25, 70]]) add(box(x1 - x0, 0.16, 3.5, mSide), (x0 + x1) / 2, 0.08, -5.75);
  add(box(270, 0.16, 3.5, mSide), -65, 0.08, 5.75);
  // la playa y el mar, al sur
  add(box(270, 0.3, 13, new THREE.MeshStandardMaterial({ color: 0xeccf9a, roughness: 0.95 }), false), -65, -0.06, 14);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 500), new THREE.MeshPhysicalMaterial({ color: 0x1f7f9c, roughness: 0.16, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.5 })); sea.rotation.x = -Math.PI / 2; add(sea, -65, -0.3, 268);
  // ---- edificios (fachada en z = −7,5): [x0, x1, alto, color, letrero]
  const mRoof = new THREE.MeshStandardMaterial({ color: 0xe6dfd4, roughness: 0.8 }), mTrim = new THREE.MeshStandardMaterial({ color: 0xfbf6ee, roughness: 0.5 });
  const B = [[-36, -24, 11, '#9fe3d0', NEON.pink], [-24, -15, 8.5, '#ffc9a8', NEON.teal], [-15, -9, 10, '#f6e2a0', NEON.violet], [SHOP.x0, SHOP.x1, 7.2, '#ffb3c8', NEON.teal],
    [-1, ALLEY.x0, 12.5, '#8fdcee', NEON.pink], [ALLEY.x1, 17, 10.5, '#d7c2ff', NEON.yellow], [25, 35, 9.5, '#ffb59a', NEON.teal], [35, 48, 13, '#f3f0ff', NEON.pink]];
  { const cols = ['#9fe3d0', '#ffc9a8', '#f6e2a0', '#ffb3c8', '#8fdcee', '#d7c2ff', '#ffb59a', '#f3f0ff'], ncs = [NEON.pink, NEON.teal, NEON.violet, NEON.yellow]; let x = -36, i = 0;
    while (x > -190) { const w = 8 + hash(i * 3.7) * 6; B.push([x - w, x, 7 + hash(i * 5.1) * 8, cols[(i + 3) % 8], ncs[i % 4]]); x -= w; i++; } }
  const D = 11.5; SETU.neon = [];
  B.forEach(([x0, x1, h, col, nc], i) => { const w = x1 - x0, m = new THREE.MeshStandardMaterial({ map: facTex(col, i + 1, false), emissiveMap: facTex(col, i + 1, true), emissive: 0xffd2a0, emissiveIntensity: 1.25, roughness: 0.82 });
    const b = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, D), w, h, D, 12), [m, m, mRoof, mRoof, m, m]); b.castShadow = b.receiveShadow = true; add(b, (x0 + x1) / 2, h / 2, -7.5 - D / 2);
    add(box(w + 0.3, 0.4, D + 0.3, mTrim), (x0 + x1) / 2, h + 0.2, -7.5 - D / 2);
    if (hash(i * 3.3) > 0.4) add(box(w * 0.5, 1.4, D * 0.5, m), (x0 + x1) / 2, h + 1.1, -7.5 - D / 2);
    const nm = basicGlow(nc, 1.5); nm.fog = false; const n1 = add(new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.1, 0.1), nm), (x0 + x1) / 2, h - 0.25, -7.42), n2 = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, h * 0.72, 0.1), nm), x0 + 0.3, h * 0.6, -7.42);
    const n3 = add(new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.08, 0.08), nm), (x0 + x1) / 2, 3.3, -7.42); SETU.neon.push(nm); });
  add(neonSign('HOTEL', NEON.pink, 1.15, true), ALLEY.x0 - 0.9, 7.6, -7.3); add(neonSign('MOTEL', NEON.teal, 1.3), 30, 10.6, -7.3); add(neonSign('BAR', NEON.yellow, 1.1), 14.6, 4.2, -7.3);
  add(neonSign('24H', NEON.violet, 1.0), -12, 4.3, -7.3); add(neonSign('OCEAN', NEON.pink, 1.3), -30, 12.1, -7.3);
  // ---- torres del fondo
  [[-44, 22, 10], [-31, 30, 9], [-19, 24, 11], [-7, 36, 9], [5, 27, 10], [16, 32, 8], [29, 25, 11], [42, 34, 10], [-57, 28, 10], [-70, 38, 11], [-84, 24, 9], [-98, 33, 10], [-112, 27, 11], [-127, 40, 10], [-142, 26, 9], [-158, 34, 11], [-174, 30, 10]].forEach(([x, h, w], i) => { const m = new THREE.MeshStandardMaterial({ map: towerTex(i, false), emissiveMap: towerTex(i, true), emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.5, metalness: 0.3 });
    const b = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, 9), w, h, 9, 14), m); b.castShadow = true; add(b, x, h / 2 - 0.5, -27 - (i % 2) * 3); });
  // ---- palmeras y farolas
  const pg = palmGeo(), mTr = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.85 }), mLf = new THREE.MeshStandardMaterial({ color: 0x2f8f45, roughness: 0.55, side: THREE.DoubleSide });
  const PALMS = [[12.5, 6.3, 1, 3.3], [24, 6.2, 0.92, 5.0], [37, 6.3, 1, 1.2], [10.2, -5.7, 0.8, 4.2], [28, -5.6, 0.9, 0.9]];
  for (let x = -6, i = 0; x > -185; x -= 10.5, i++) { PALMS.push([x + hash(i * 3.1) * 3, 6.3, 0.85 + hash(i * 7.7) * 0.25, hash(i * 1.9) * 6.3]); if (i % 2 && x < -14) PALMS.push([x - 4, -5.6, 0.8 + hash(i * 4.3) * 0.2, hash(i * 2.9) * 6.3]); }
  for (const [x, z, s, ry] of PALMS) {
    const p = new THREE.Group(), a = new THREE.Mesh(pg.trunk, mTr), b = new THREE.Mesh(pg.leaves, mLf); a.castShadow = b.castShadow = true; p.add(a, b); p.scale.setScalar(s); p.rotation.y = ry; add(p, x, 0.16, z); }
  const mPole = new THREE.MeshStandardMaterial({ color: 0x2a2d38, roughness: 0.5, metalness: 0.6 }), mBulb = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe2b0).multiplyScalar(2.4), toneMapped: false, fog: false });
  const LAMPS = [[19.5, 4.6, -1], [11.5, -4.6, 1], [31, -4.6, 1]]; for (let x = -18; x > -180; x -= 22) LAMPS.push([x, 4.6, -1], [x - 11, -4.6, 1]);
  for (const [x, z, sd] of LAMPS) { const l = new THREE.Group(); const p = cyl(0.07, 0.09, 5.6, mPole, 10); p.position.y = 2.8; l.add(p);
    const arm = box(0.08, 0.08, 1.3, mPole); arm.position.set(0, 5.55, sd * 0.6); l.add(arm); const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), mBulb); b.position.set(0, 5.45, sd * 1.2); l.add(b);
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xffd9a0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); h.scale.setScalar(2.6); h.position.copy(b.position); l.add(h); add(l, x, 0.16, z); }
  // ---- el callejón: suelo, tapia del fondo, contenedor, bolsas y un farol
  const al = new THREE.Mesh(new THREE.PlaneGeometry(ALLEY.x1 - ALLEY.x0, 11.5), new THREE.MeshStandardMaterial({ color: 0x23222b, roughness: 0.75 })); al.rotation.x = -Math.PI / 2; al.receiveShadow = true; add(al, (ALLEY.x0 + ALLEY.x1) / 2, 0.17, -13.25);
  add(box(ALLEY.x1 - ALLEY.x0, 5.5, 0.4, new THREE.MeshStandardMaterial({ color: 0x4a3b44, roughness: 0.9 })), (ALLEY.x0 + ALLEY.x1) / 2, 2.75, -18.8);
  const mBin = new THREE.MeshStandardMaterial({ color: 0x2f7d5b, roughness: 0.55, metalness: 0.3 }), bin = new THREE.Group(); { const b = box(2.3, 1.15, 1.15, mBin); b.position.y = 0.72; bin.add(b); const lid = box(2.36, 0.1, 1.2, new THREE.MeshStandardMaterial({ color: 0x1f5a41, roughness: 0.5, metalness: 0.3 })); lid.position.set(0, 1.34, 0); lid.rotation.x = 0.08; bin.add(lid);
    for (const sx of [-0.95, 0.95]) { const w = cyl(0.11, 0.11, 0.1, mDark, 10); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.11, 0.45); bin.add(w); } }
  add(bin, ALLEY.bin.x + 0.05, 0.17, ALLEY.bin.z);
  for (const [x, z, s] of [[7.0, -9.4, 0.42], [6.7, -8.9, 0.34], [4.5, -14.5, 0.4]]) { const s2 = sph(s, new THREE.MeshStandardMaterial({ color: 0x15151b, roughness: 0.35 }), 12, 8); s2.scale.y = 0.8; add(s2, x, 0.17 + s * 0.7, z); }
  const farol = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), mBulb); add(farol, ALLEY.x1 - 0.25, 3.5, -11.5); SETU.alleyL = new THREE.PointLight(0xffc890, 0, 16, 1.6); add(SETU.alleyL, ALLEY.x1 - 0.8, 3.4, -11.5);
  // ---- la joyería: escaparate, toldo, puerta, letrero y la alarma
  const jw = canvasTex(512, 400, (g, W2, H2) => { const gr = g.createLinearGradient(0, 0, 0, H2); gr.addColorStop(0, '#fff1cf'); gr.addColorStop(1, '#f2c98a'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2);
    for (const y of [150, 290]) { g.fillStyle = 'rgba(120,80,40,.35)'; g.fillRect(20, y, W2 - 40, 8); }
    for (let i = 0; i < 10; i++) { const x = 60 + (i % 5) * 98, y = i < 5 ? 108 : 248, c = ['#5ad7ff', '#ff6fb5', '#ffffff', '#7CF0A9', '#b58cff'][i % 5]; g.fillStyle = c; g.strokeStyle = 'rgba(60,40,20,.6)'; g.lineWidth = 3;
      if (i % 2) { g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x + 24, y - 8); g.lineTo(x, y + 30); g.lineTo(x - 24, y - 8); g.closePath(); g.fill(); g.stroke(); } else { g.strokeStyle = '#d9a23a'; g.lineWidth = 9; g.beginPath(); g.arc(x, y + 4, 22, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y - 22, 9, 0, 7); g.fill(); } } });
  const mGlassW = new THREE.MeshBasicMaterial({ map: jw, color: new THREE.Color(1.15, 1.15, 1.15), toneMapped: false }), mFrame = new THREE.MeshStandardMaterial({ color: 0x2a2030, roughness: 0.4, metalness: 0.4 });
  add(box(SHOP.x1 - SHOP.x0 - 0.6, 3.0, 0.2, mFrame), (SHOP.x0 + SHOP.x1) / 2, 1.66, -7.42);
  for (const [x, w] of [[-7.4, 2.0], [-2.9, 2.6]]) add(new THREE.Mesh(new THREE.PlaneGeometry(w, 1.7), mGlassW), x, 1.75, -7.3);
  add(new THREE.Mesh(new THREE.PlaneGeometry(1.25, 2.4), new THREE.MeshPhysicalMaterial({ color: 0x1c2a44, roughness: 0.1, metalness: 0.5, clearcoat: 1 })), SHOP.door, 1.4, -7.3);
  const awT = repT(canvasTex(64, 64, (g, W2, H2) => { g.fillStyle = '#ff6fa8'; g.fillRect(0, 0, W2, H2); g.fillStyle = '#fff5fa'; g.fillRect(0, 0, W2 / 2, H2); }), 8, 1);
  const aw = box(SHOP.x1 - SHOP.x0 - 0.4, 0.08, 1.5, new THREE.MeshStandardMaterial({ map: awT, roughness: 0.7 })); aw.rotation.x = 0.32; add(aw, (SHOP.x0 + SHOP.x1) / 2, 3.25, -6.75);
  add(neonSign('JOYERÍA', NEON.teal, 0.95), (SHOP.x0 + SHOP.x1) / 2 - 0.6, 4.55, -7.3);
  const alarm = new THREE.Group(); { const b = box(0.55, 0.55, 0.22, new THREE.MeshStandardMaterial({ color: 0xd62b3a, roughness: 0.4 })); alarm.add(b); const bell = cyl(0.17, 0.17, 0.06, new THREE.MeshStandardMaterial({ color: 0xffd34a, roughness: 0.3, metalness: 0.6 }), 20); bell.rotation.x = Math.PI / 2; bell.position.z = 0.13; alarm.add(bell);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x551018, toneMapped: false })); led.position.set(0, 0.36, 0.05); alarm.add(led); SETU.alarmLed = led; }
  alarm.position.copy(SHOP.alarm); G.add(alarm); SETU.alarm = alarm;
  // ---- la cámara de seguridad: cuelga de un pórtico sobre la calle, detrás del protagonista; piloto rojo y su cono
  const cc = new THREE.Group(); { for (const z of [-4.3, 4.3]) { const p = cyl(0.09, 0.11, CCTV.beam + 0.1, mPole, 10); p.position.set(0, (CCTV.beam + 0.1) / 2 + 0.16, z); cc.add(p); }
    const bm = box(0.14, 0.14, 8.9, mPole); bm.position.set(0, CCTV.beam + 0.2, 0); cc.add(bm); const hg2 = box(0.06, 0.3, 0.06, mPole); hg2.position.set(0, CCTV.beam, CCTV.z); cc.add(hg2);
    const head = new THREE.Group(); head.position.set(0.1, CCTV.y, CCTV.z); const body = box(0.3, 0.28, 0.66, new THREE.MeshStandardMaterial({ color: 0xf1f3f6, roughness: 0.35 })); head.add(body);
    const lens = cyl(0.1, 0.1, 0.12, new THREE.MeshStandardMaterial({ color: 0x0a0a10, roughness: 0.15, metalness: 0.6 }), 16); lens.rotation.x = Math.PI / 2; lens.position.z = 0.37; head.add(lens);
    const visor = box(0.34, 0.03, 0.56, mPole); visor.position.set(0, 0.16, 0.12); head.add(visor);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0x40080c, toneMapped: false, fog: false })); led.position.set(0.1, 0.08, 0.34); head.add(led);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xff2a3a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); halo.scale.setScalar(1.1); halo.position.copy(led.position); head.add(halo);
    const L = 10.3, cg = new THREE.CylinderGeometry(0.08, 1.15, L, 24, 1, true); cg.translate(0, -L / 2, 0); cg.rotateX(-Math.PI / 2);
    const cone = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: 0xff3b4e, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false })); cone.position.z = 0.4; cone.renderOrder = 4; head.add(cone);
    cc.add(head); SETU.cctv = { head, led, cone, halo }; }
  cc.position.set(CCTV.x, 0, 0); G.add(cc); G.updateMatrixWorld(true); SETU.cctv.head.lookAt(RING.x, 1.0, RING.z);
  SETU.G = G; return G;
}
// el decorado en t: la cámara de seguridad (cono y piloto), la alarma y el farol del callejón
function setAt(t, o = {}) {
  const c = SETU.cctv, k = clamp(o.cctv ?? 0); c.cone.material.opacity = 0.11 * k * (0.8 + 0.2 * Math.sin(t * 9)); c.cone.visible = k > 0.01; c.halo.material.opacity = k > 0.01 && (t * 2.2) % 1 < 0.6 ? 0.9 : 0;
  c.led.material.color.setHex(k > 0.01 && (t * 2.2) % 1 < 0.6 ? 0xff2a3a : 0x40080c); if (k > 0.01 && (t * 2.2) % 1 < 0.6) c.led.material.color.multiplyScalar(2.2);
  const a = clamp(o.alarm ?? 0); SETU.alarmLed.material.color.setHex(a > 0.01 && (t * 6) % 1 < 0.5 ? 0xff3040 : 0x551018); SETU.alarm.rotation.z = a * Math.sin(t * 60) * 0.06;
  SETU.alleyL.intensity = 26 * clamp(o.alley ?? 0);
}
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
// ---------------------------------------------------------------- la escena y su animación, guiada por la voz (K = inicio de cada palabra). Actores: Jason (camisa hawaiana), el
// maniquí gris (Jason «sin su ropa»: la policía busca la ropa, no a él), Lucía, el testigo, el deportivo naranja (y la berlina verde por la que
// se cambia) y tres patrullas. Primer fotograma = último: las patrullas rodean la ropa vacía mientras el maniquí se escabulle.
let TL = {};
const curve = pts => new THREE.CatmullRomCurve3(pts.map(p => v3(p[0], 0, p[1])), false, 'centripetal', 0.5);
function onCurve(c, u) { const p = c.getPointAt(clamp(u)), tg = c.getTangentAt(clamp(u)); return [p.x, p.z, Math.atan2(-tg.z, tg.x)]; }
const seg = (t, a, b) => clamp((t - a) / (b - a));
function ramp(tau, acc, vmax) { const t1 = vmax / acc; return tau <= 0 ? 0 : tau < t1 ? 0.5 * acc * tau * tau : 0.5 * acc * t1 * t1 + vmax * (tau - t1); }   // distancia recorrida arrancando
async function buildScene() {
  TL = { merge0: 5.62, merge1: 6.7, lu0: 6.9, lu1: 9.2, run0: 10.0, run1: 11.95, p3go: 10.95, p2back0: 6.0, p2back1: 9.5, p1pass: K['cuantas_9'] - 0.45, back0: 14.8, back1: 17.7, wit0: 21.4, wit1: 24.3, witGo: K['nadie_6'] + 0.05,
    swap0: K['cambia_8'] - 0.05, swap1: K['coche_8'] + 0.45, gl: K['gafas_8'] + 0.05, cp: K['gorra_8'] + 0.02, p2in0: 39.05, p2in1: 40.85, split: K['separalos_10'] + 0.05,
    p1in0: 43.35, p1in1: 45.35, p3in0: 43.6, p3in1: 45.7, pop: 45.15, unswap0: 44.45, unswap1: 45.15 };
  S.set = buildSet(); scene.add(S.set);
  // la camisa hawaiana (naranja con flores)
  const hw = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ff7a1a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const x = hash(i * 3.1) * w, y = hash(i * 7.7) * h, r = 9 + hash(i * 5.3) * 9; g.fillStyle = i % 3 ? '#fff3d6' : '#ffd23f';
    for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 + i; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.55, r * 0.3, a, 0, 7); g.fill(); } g.fillStyle = '#ff4f6a'; g.beginPath(); g.arc(x, y, r * 0.28, 0, 7); g.fill(); } });
  hw.wrapS = hw.wrapT = THREE.RepeatWrapping; hw.repeat.set(2, 2);
  S.jason = gtaDoll({ shirtMat: new THREE.MeshStandardMaterial({ map: hw, roughness: 0.7 }), pants: 0xf3efe4, skin: 0xd9a27c, hair: 0x5a3a22 });
  S.cap = dollCap(0x2a6bd6); S.glasses = dollGlasses(); S.jason.userData.J.neck.add(S.cap, S.glasses); S.cap.visible = S.glasses.visible = false;
  const mMan = new THREE.MeshPhysicalMaterial({ color: 0xdfe3ea, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  S.nude = gtaDoll({ skinMat: mMan, shirtMat: mMan, pantsMat: mMan, shoeMat: mMan, hairStyle: 'none' });
  S.lucia = gtaDoll({ shirt: 0xe8336e, pants: 0x35508f, skin: 0xc68a62, hair: 0x1c1410, hairStyle: 'ponytail', scale: 1.58 });
  S.wit = gtaDoll({ shirt: 0xffd23f, pants: 0x4a4f5c, skin: 0xe6b996, hair: 0x2c2c30, scale: 1.62 });
  { const ph = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.085, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fe8ff).multiplyScalar(1.6), toneMapped: false })); ph.position.set(0, -0.03, 0.03); S.wit.userData.J.hR.add(ph); S.witPhone = ph; }
  scene.add(S.jason, S.nude, S.lucia, S.wit);
  S.car = carModel({ kind: 'sport', color: 0xff7a1a }); S.car2 = carModel({ kind: 'sedan', color: 0x1fb8a8 }); scene.add(S.car, S.car2);
  S.pol = [0, 1, 2].map(() => { const c = carModel({ kind: 'police' }); scene.add(c); return c; });
  S.beams = [0, 1, 2].map(() => { const b = beamMesh(); scene.add(b); return b; });
  // el «cono de visión» de GTA 5 (como en el minimapa): un sector azul en el suelo delante de la patrulla 3
  { const m = new THREE.Mesh(new THREE.CircleGeometry(10, 28, -0.5, 1.0), new THREE.MeshBasicMaterial({ color: 0x3d8bff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(2.2, 0.07, 0); m.renderOrder = 4; S.pol[2].add(m); S.cone5 = m; }
  S.strobe = new THREE.PointLight(0xff3050, 0, 34, 1.7); scene.add(S.strobe);
  S.ex = label('!', { size: 170, color: '#ffd34a', w: 0.55, weight: 900 }); S.qm = label('?', { size: 170, color: '#ffffff', w: 0.9, weight: 900 }); scene.add(S.ex, S.qm);
  S.puff = sparks(scene, 70, 0xfff0c0, 0.16);
  // trayectos
  S.cv = { jRun: curve([[0, 0], [0.8, -1.6], [1.0, -2.9], [3.0, -5.0], [5.9, -7.6], [6.95, -9.4], [6.9, -10.6], [6.85, -11.1]]),
    lIn: curve([[5.8, -7.8], [3.0, -5.0], [1.0, -2.9], [0.8, -1.2], [LUC.x, LUC.z]]), lOut: curve([[LUC.x, LUC.z], [-0.5, 2.6], [-6, 4.8], [-24, 5.6]]),
    wIn: curve([[-15, -5.5], [-8, -5.5], [WIT.x, WIT.z]]), wOut: curve([[WIT.x, WIT.z], [-8, -5.7], [-22, -5.6]]),
    p1out: curve([[RINGP[0][0], RINGP[0][1]], [-2, -1.4], [1.2, -2.9], [7, -2.9], [13, -2.2], [70, -2]]), p1in: curve([[-60, -1.4], [-18, -1.4], [-11, -1.3], [RINGP[0][0], RINGP[0][1]]]),
    p2in: curve([[46, -2.2], [18, -2.2], [12.5, -2.0], [RINGP[1][0], RINGP[1][1]]]),
    p3out: curve([[RINGP[2][0], RINGP[2][1]], [2, -3.1], [7, -3.2], [13, -2.4], [70, -2.0]]), p3in: curve([[-60, -3.6], [-12, -3.6], [-6, -3.5], [RINGP[2][0], RINGP[2][1]]]) };
  // polvo en el aire (deja estelas cuando se mueve la cámara)
  S.flow.push(flowCloud(4200, i => [-34 + hash(i * 1.3) * 68, 0.3 + Math.pow(hash(i * 2.7), 1.3) * 13, -9 + hash(i * 3.9) * 26], { size: 1.5, bright: 0.42, nearF: 0.5, farF: 0.02, drift: 0.35, seed: 3, col: 0xffd9e6 }));
  S.flow.push(flowCloud(900, i => [ALLEY.x0 + 0.2 + hash(i * 4.3) * 3.1, 0.3 + hash(i * 5.1) * 6, -18.5 + hash(i * 6.7) * 11], { size: 1.3, bright: 0.4, nearF: 0.3, farF: 0.03, drift: 0.2, seed: 5, col: 0xffe2c0 }));
  S.anc = { car: v3(), shirt: v3(), face: v3(), cctv: v3(), lucia: v3(), wit: v3(), alarm: SHOP.alarm.clone(), p2: v3(), nude: v3() };
  envAll(scene);
}
const NUDE0 = new THREE.Vector3(2.2, 0, 1.0), NUDEV = new THREE.Vector3(0.25, 0, 0.05), LUC = new THREE.Vector3(0.9, 0, 0.9);
function showSkin(d, on) { for (const m of d.userData.skin) m.visible = on; }
function setCloth(d, on) { for (const m of d.userData.cloth) m.visible = on; }
// una patrulla en t: [x, z, orientación, luces 0..1]
//  1 (detrás del protagonista): se queda con las luces apagadas; en la frase 9 arranca y PASA DE LARGO; vuelve al final por el oeste.
//  2 (junto a la cámara): se retira marcha atrás sin que se vea; llega por el este en la frase 10 buscando a una pareja.
//  3 (a la derecha): en GTA 5 pasa por delante del callejón con su cono de visión; vuelve al final por el oeste.
function polAt(i, t) {
  const R = RINGP[i], cv = S.cv;
  if (i === 0) { if (t < TL.p1pass) return [R[0], R[1], R[2], 1 - win(t, 10.4, 0.5)];
    if (t < TL.p1in0 - 0.5) { const c = onCurve(cv.p1out, ramp(t - TL.p1pass, 3.4, 8) / cv.p1out.getLength()); return [c[0], c[1], c[2], 0.7]; }
    if (t < TL.p1in0) return [-80, -1.4, 0, 0]; const c = onCurve(cv.p1in, eo(seg(t, TL.p1in0, TL.p1in1))); return [c[0], c[1], t >= TL.p1in1 ? R[2] : c[2], 1]; }
  if (i === 1) { if (t < TL.p2back0) return [R[0], R[1], R[2], 1];
    if (t < TL.p2back1) { const u = eio(seg(t, TL.p2back0, TL.p2back1)); return [R[0] + u * 45, R[1], R[2], 1 - u]; }
    if (t < TL.p2in0) return [80, -2.2, Math.PI, 0]; const c = onCurve(cv.p2in, eo(seg(t, TL.p2in0, TL.p2in1))); return [c[0], c[1], t >= TL.p2in1 ? R[2] : c[2], 1]; }
  if (t < TL.p3go) return [R[0], R[1], R[2], 1 - win(t, 10.4, 0.5)];
  if (t < 26) { const c = onCurve(cv.p3out, ramp(t - TL.p3go, 2.6, 7) / cv.p3out.getLength()); return [c[0], c[1], c[2], 0]; }
  if (t < TL.p3in0) return [-80, -3.6, 0, 0];
  const c = onCurve(cv.p3in, eo(seg(t, TL.p3in0, TL.p3in1))); return [c[0], c[1], t >= TL.p3in1 ? R[2] : c[2], 1];
}
function stageAt(t, st) {
  NOW = t; const J = S.jason, N = S.nude, Lu = S.lucia, Wt = S.wit, cv = S.cv, tw = (t + 1e-4) % END;                 // tw: para que el bucle case
  // ---- ambiente: en el callejón, más de noche
  const dark = sm5(clamp((-8.5 - st.p.z) / 3)) * (st.p.y < 9 ? 1 : clamp((14 - st.p.y) / 5)); moodMix({ vice: 1 - 0.75 * dark, noche: 0.75 * dark });
  setAt(t, { cctv: win(t, K['grabado_5'] - 0.1, 0.5) * (1 - win(t, 41.8, 0.8)), alarm: 0, alley: clamp(dark * 1.3) });
  // ---- las patrullas, sus luces y sus focos
  let ringK = 0;
  for (let i = 0; i < 3; i++) { const p = polAt(i, t); carPose(S.pol[i], p[0], p[1], p[2]); barAt(S.pol[i], t, p[3]); carLights(S.pol[i], p[3]); S.pol[i].visible = Math.abs(p[0]) < 60;
    const near = clamp(1 - Math.hypot(p[0] - RING.x, p[1] - RING.z) / 16) * p[3]; ringK = Math.max(ringK, near);
    const from = v3(p[0], 1.75, p[1]); let to = v3(RING.x, 1.15, RING.z), bk = 0;
    if (t < 10.4) { bk = 1 - win(t, 9.9, 0.4); if (i === 1) { to.lerp(v3(CAR0.p.x, 0.8, CAR0.p.z), win(t, K['coche_1'] - 0.12, 0.35)); bk *= 1 - win(t, TL.p2back0, 0.5); } }
    else if (i === 0 && t >= TL.p1pass && t < TL.p1in0 - 0.5) { bk = clamp(1 - Math.abs(p[0] + 1) / 12); const ah = win(t, TL.p1pass + 1.5, 0.9); to = v3(lerp(RING.x, p[0] + 7, ah), lerp(1.1, 0.3, ah), lerp(RING.z, p[1] + 2.6 + Math.sin(t * 2.4) * 0.9, ah)); }   // pasa de largo: el foco le roza y sigue
    else if (i === 1 && t >= TL.p2in0) { bk = win(t, TL.p2in0 + 0.5, 0.5); const sp = win(t, TL.split, 0.5) * (1 - win(t, TL.pop - 0.7, 0.6)); to = v3(0.5 + Math.sin(t * 3.1) * 1.5 * sp, 1.05, 0.4 + Math.cos(t * 2.3) * 1.1 * sp); }   // busca a una pareja… y ya no la hay
    else if (t >= TL.p1in0) bk = win(t, [TL.p1in1, 0, TL.p3in1][i] - 0.5, 0.5);
    beamSet(S.beams[i], from, to, 0.95, bk * (i === 0 ? 0.55 : 1)); }
  S.cone5.material.opacity = 0.55 * win(t, TL.p3go + 0.3, 0.6) * (1 - win(t, 15.4, 0.8));
  { const ph = Math.floor(t * 6) % 2; S.strobe.color.setHex(ph ? 0x2a6bff : 0xff2a3a); S.strobe.intensity = 26 * ringK; S.strobe.position.set(RING.x + (ph ? 1.5 : -3.5), 2.8, RING.z - 1.6); }
  // ---- Jason: su ropa sola (principio y final), el maniquí que se escabulle y vuelve, la carrera al callejón y la vuelta
  const ghost = t < TL.merge1 || t >= TL.pop; showSkin(J, !ghost); J.visible = true;
  let jp = v3(RING.x, 0, RING.z), jyaw = Math.PI / 2 - 0.12;
  if (t >= TL.run0 && t < TL.back0) { const u = eio(seg(t, TL.run0, TL.run1)), c = onCurve(cv.jRun, u); jp.set(c[0], 0, c[1]); const tg = cv.jRun.getTangentAt(clamp(u)); jyaw = u < 1 ? Math.atan2(tg.x, tg.z) : lerp(Math.atan2(tg.x, tg.z), 0.5, win(t, TL.run1, 0.3));
    if (u < 1) poseRun(J, t * 15); else poseCrouch(J, win(t, TL.run1 - 0.05, 0.3)); }
  else if (t >= TL.back0 && t < TL.back1) { const u = 1 - eio(seg(t, TL.back0, TL.back1)), c = onCurve(cv.jRun, u); jp.set(c[0], 0, c[1]); const tg = cv.jRun.getTangentAt(clamp(u)); jyaw = Math.atan2(-tg.x, -tg.z); poseWalk(J, t * 9.5, 0.7, 0.1); }
  else if (ghost) poseGhost(J, tw);
  else { poseZero(J); const jj = J.userData.J; jj.chest.rotation.x = 0.02 * Math.sin(t * 1.7); jj.neck.rotation.y = 0.25 * Math.sin(t * 0.8); }
  jp.y = jp.z < -4.05 ? 0.16 * clamp((-4.05 - jp.z) / 0.3) : 0;                                         // sube a la acera
  const hover = ghost ? 0.16 + 0.05 * Math.sin(tw / END * Math.PI * 2 * 22) : 0; const pk = t < TL.merge1 + 0.4 && t >= TL.merge1 ? 1 + 0.14 * (1 - seg(t, TL.merge1, TL.merge1 + 0.4)) : 1;
  J.position.set(jp.x, jp.y + hover, jp.z); J.rotation.y = jyaw; J.userData.R.scale.setScalar(J.userData.s0 * pk);
  // el maniquí: se escabulle (principio), vuelve a su ropa, y al final se sale otra vez (bucle)
  { let vis = false, p = v3(), yaw = Math.atan2(NUDEV.x, NUDEV.z);
    if (t < TL.merge0) { vis = true; p.copy(NUDE0).addScaledVector(NUDEV, t); poseSneak(N, tw / END * Math.PI * 2 * 44); }
    else if (t < TL.merge1) { vis = true; const u = eio(seg(t, TL.merge0, TL.merge1)), a = NUDE0.clone().addScaledVector(NUDEV, TL.merge0); p.lerpVectors(a, v3(RING.x, 0, RING.z), u); yaw = Math.atan2(RING.x - a.x, RING.z - a.z); poseRun(N, t * 16); p.y = Math.sin(u * Math.PI) * 0.25; }
    else if (t >= TL.pop) { vis = true; const u = eo(seg(t, TL.pop, END)); p.lerpVectors(v3(RING.x, 0, RING.z), NUDE0, u); p.y = Math.sin(clamp(u * 2.2) * Math.PI) * 0.3; poseSneak(N, tw / END * Math.PI * 2 * 44); }
    N.visible = vis; N.position.copy(p); N.rotation.y = yaw; }
  // gafas y gorra (frase 8); se van al final
  { const g = S.glasses, c = S.cap, kg = pop(t, TL.gl, 0.3) * (1 - win(t, TL.pop - 0.25, 0.25)), kc = pop(t, TL.cp, 0.3) * (1 - win(t, TL.pop - 0.25, 0.25));
    g.visible = kg > 0.01; c.visible = kc > 0.01; g.position.y = 0.092 + (1 - Math.min(1, kg)) * 0.5; g.scale.setScalar(Math.max(0.001, kg)); c.position.y = 0.105 + (1 - Math.min(1, kc)) * 0.5; c.scale.setScalar(Math.max(0.001, kc)); }
  // ---- Lucía: llega (frase 2), se queda junto a Jason, y al separarse sale corriendo (frase 10)
  { let vis = t >= TL.lu0 && t < 43.2, p = v3(LUC.x, 0, LUC.z), yaw = Math.PI / 2 - 0.25;
    if (t < TL.lu1) { const u = eio(seg(t, TL.lu0, TL.lu1)), c = onCurve(cv.lIn, u), tg = cv.lIn.getTangentAt(clamp(u)); p.set(c[0], 0, c[1]); yaw = Math.atan2(tg.x, tg.z); poseWalk(Lu, t * 10, 0.6); if (u >= 1) { poseZero(Lu); yaw = Math.PI / 2 - 0.25; } }
    else if (t >= TL.split) { const u = seg(t, TL.split, TL.split + 2.3), c = onCurve(cv.lOut, u * u * 0.4 + u * 0.6), tg = cv.lOut.getTangentAt(clamp(u)); p.set(c[0], 0, c[1]); yaw = Math.atan2(tg.x, tg.z); poseRun(Lu, t * 16); }
    else { poseZero(Lu); const jj = Lu.userData.J; jj.shR.rotation.z = 0.55; jj.elR.rotation.x = -1.5; jj.hip.rotation.z = 0.05; jj.neck.rotation.y = 0.3 * Math.sin(t * 0.7 + 1); }
    p.y = p.z < -4.05 ? 0.16 : (p.z > 4.05 ? 0.16 : 0); Lu.visible = vis; Lu.position.copy(p); Lu.rotation.y = yaw; }
  // ---- el testigo: llega por la acera, llama (frase 6) y, «si nadie te ve», se da la vuelta y se va
  { let vis = t >= TL.wit0 && t < 31.5, p = v3(WIT.x, WIT.y, WIT.z), yaw = Math.atan2(RING.x - WIT.x, RING.z - WIT.z);
    if (t < TL.wit1) { const u = seg(t, TL.wit0, TL.wit1), c = onCurve(cv.wIn, u); p.set(c[0], WIT.y, c[1]); yaw = lerp(Math.PI / 2, yaw, win(t, TL.wit1 - 0.5, 0.5)); poseWalk(Wt, t * 9, 0.5); }
    else if (t >= TL.witGo) { const u = seg(t, TL.witGo + 0.35, TL.witGo + 5), c = onCurve(cv.wOut, u); p.set(c[0], WIT.y, c[1]); yaw = lerp(yaw, -Math.PI / 2, win(t, TL.witGo, 0.4)); if (u > 0) poseWalk(Wt, t * 9, 0.5); else poseZero(Wt); posePhone(Wt, 1 - win(t, TL.witGo, 0.4)); }
    else { poseZero(Wt); posePhone(Wt, win(t, TL.wit1 + 0.1, 0.4)); }
    Wt.visible = vis; Wt.position.copy(p); Wt.rotation.y = yaw; }
  // ---- el coche: deportivo naranja → berlina verde (frase 8) y vuelta al naranja al final (bucle)
  { const a = seg(t, TL.swap0, TL.swap1), b = seg(t, TL.unswap0, TL.unswap1), k = t < TL.unswap0 ? a : 1 - b, spin = (t < TL.unswap0 ? a : b) * Math.PI * 2;
    const s1 = k < 0.5 ? 1 - Math.pow(k * 2, 2) * 0.85 : 0, s2 = k >= 0.5 ? 0.15 + 0.85 * Math.min(1, pop((k - 0.5) * 2, 0, 1)) : 0;
    S.car.visible = k < 0.5; S.car2.visible = k >= 0.5; for (const [c, s] of [[S.car, s1], [S.car2, s2]]) { carPose(c, CAR0.p.x, CAR0.p.z, CAR0.yaw + spin); c.scale.setScalar(Math.max(0.001, s)); c.position.y = Math.sin(Math.min(1, (t < TL.unswap0 ? a : b)) * Math.PI) * 0.5; }
    const tb = t < TL.unswap0 ? (TL.swap0 + TL.swap1) / 2 : (TL.unswap0 + TL.unswap1) / 2; S.puff.visible = t > tb && t < tb + 0.6; if (S.puff.visible) { burst(S.puff, v3(CAR0.p.x, 0.9, CAR0.p.z), t, tb, 2.4, 0.6, false, 2); S.puff.material.opacity = 1 - seg(t, tb, tb + 0.6); } }
  // ---- «!» del testigo y «?» de la patrulla que busca a una pareja
  { const k1 = pop(t, TL.wit1 + 0.35, 0.3) * (1 - win(t, TL.witGo - 0.1, 0.3)); S.ex.position.set(Wt.position.x, WIT.y + 2.35, Wt.position.z); lookLab(S.ex, k1); S.ex.scale.setScalar(Math.max(0.001, k1));
    const pp = S.pol[1].position, k2 = pop(t, TL.split + 0.45, 0.3) * (1 - win(t, 43.2, 0.4)); S.qm.position.set(pp.x - 1.7, 2.45 + 0.08 * Math.sin(t * 5), pp.z + 0.75); lookLab(S.qm, k2); S.qm.scale.setScalar(Math.max(0.001, k2)); }
  // ---- anclas para los rótulos
  scene.updateMatrixWorld(true); const A = S.anc; A.car.set(CAR0.p.x, 1.25, CAR0.p.z); wpos(J.userData.J.chest, A.shirt).y += 0.3; wpos(J.userData.J.head, A.face); wpos(SETU.cctv.head, A.cctv);
  wpos(Lu.userData.J.head, A.lucia); wpos(S.witPhone, A.wit); A.p2.copy(S.pol[1].position).setY(1.6); wpos(N.userData.J.head, A.nude);
  const c = st.l; lightsAt(c, st.p.distanceTo(c));
}
// ---------------------------------------------------------------- UN SOLO PLANO, SIN CORTES: la cámara no para; se acerca a la boca del callejón, sube, baja hasta el testigo,
// vuelve al coche y al protagonista… y acaba donde empezó (bucle).
let CK = [];
function buildCam() {
  const k = (t, p, l, f = 40) => [t, p, l, f];
  const C0 = [[9.0, 2.4, 0.9], [0, 1.5, -0.3], 40];
  CK = [
    // A · calle abajo, hacia la puesta de sol: la ropa sola rodeada de focos; el maniquí se escabulle hacia la cámara
    k(0, ...C0), k(5.5, [7.6, 2.25, 0.7], [0, 1.45, -0.2], 40),
    // B · vuelve a su ropa; llega Lucía (Jason y Lucía)
    k(7.6, [10.6, 3.5, 1.5], [0.4, 1.4, -0.5], 40), k(9.7, [6.9, 2.2, 1.2], [0.4, 1.4, 0.3], 40),
    // C · GTA 5: corre al callejón y se esconde; la cámara le sigue hasta la boca del callejón mientras pasa la patrulla
    k(10.9, [8.0, 3.6, 2.2], [3.0, 1.2, -4.5], 44), k(11.9, [6.3, 5.0, 2.0], [5.9, 0.9, -8.6], 44), k(14.4, [6.0, 5.4, 1.7], [5.9, 0.8, -9.0], 44),
    // D · sube y vuelve a mirar calle abajo: las seis estrellas sobre el cielo y, debajo, las pistas
    k(15.4, [8.4, 5.7, 2.6], [2.6, 2.0, -3.2], 43), k(16.5, [10.4, 5.0, 1.4], [0.4, 2.6, -1.0], 41), k(18.7, [11.0, 2.6, 0.5], [0, 2.1, -0.2], 40),
    // E · las pistas: coche, ropa, aspecto, cámara
    k(24.0, [9.6, 2.5, 0.2], [0, 2.0, -0.2], 40),
    // F · el testigo y la alarma (la joyería, a la derecha)
    k(25.5, [1.8, 2.5, -0.8], [-3.5, 1.9, -6.0], 42), k(28.9, [0.6, 2.7, -1.6], [-3.3, 2.5, -6.6], 42),
    // G · vuelve: cada pista se puede borrar
    k(30.6, [9.2, 2.5, 0.6], [0.5, 1.9, -0.4], 40),
    // H · cambia de coche; gafas y gorra
    k(32.0, [9.6, 2.5, 0.5], [2.8, 1.0, -0.7], 40), k(33.7, [4.6, 1.95, 0.6], [0, 1.5, 0], 40),
    // I · la patrulla pasa de largo
    k(36.2, [6.4, 2.3, 1.0], [0, 1.4, -0.5], 40), k(37.3, [7.6, 2.5, 0.9], [0.3, 1.5, -0.2], 40),
    // J · buscan a una pareja… sepáralos
    k(39.3, [12.5, 3.2, 0.4], [1.8, 1.3, -0.6], 40), k(41.2, [13.8, 3.4, 0.2], [2, 1.2, -0.7], 40),
    // K · ¿huyes o te cambias?; vuelven las patrullas: como al principio
    k(43.2, [12.0, 3.0, 0.6], [0.5, 1.5, -0.5], 40), k(45.6, [9.8, 2.6, 0.85], [0, 1.5, -0.3], 40), k(END, ...C0),
  ];
  S.C0 = C0;
}
function camAt(t) { if (t <= 1e-6 || t >= END - 1e-6) { const c = S.C0; return { p: v3(...c[0]), l: v3(...c[1]), f: c[2], roll: 0 }; } return camKeys(t, CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { let f = 0; for (const t0 of [(TL.swap0 + TL.swap1) / 2, TL.merge1]) if (t > t0) f += 0.05 * Math.exp(-(t - t0) / 0.1); return f; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l); return { focus: f, scale: (f < 8 ? 0.34 : 0.2) * f }; }
// ---------------------------------------------------------------- HUD: las estrellas (cinco en GTA 5, seis en GTA 6) y, debajo, las pistas que tiene la policía (coche, ropa,
// aspecto, cámara y pareja), con un hilo de neón hasta cada cosa en la calle; rótulos de neón, la cabecera y el truco pendiente.
// Los subtítulos (los pone el montaje) van en y≈330: aquí nada entre y = 250 y y = 420.
let INK = '#F2F5F8', GREY = '#B4BEC9', REDc = '#FF5A4E', AMBc = '#FFC24A', CYAN = '#5CF2E6', PINK = '#FF5FB8', GREENc = '#7CF0A9', VIOL = '#B58CFF', ORNG = '#FF9A3D', GOLDs = '#FFE9A8';
const STAR_Y = 505, STAR_R = 40, PLQ_Y = 596, PLQ_W = 150, PLQ_H = 150, PLQ_GAP = 18;
const PLQ = [{ n: 'COCHE', c: ORNG }, { n: 'ROPA', c: PINK }, { n: 'ASPECTO', c: CYAN }, { n: 'CÁMARA', c: REDc }, { n: 'PAREJA', c: VIOL }];
function buildHudPlan() { HFONT = 'Inter'; HW = [900, 600]; }
const cw = (t, t0, t1, d = 0.25) => win(t, t0, d) * (1 - win(t, t1, d));
const starX = (i, n = 6) => W / 2 + (i - (n - 1) / 2) * 96, plqX = i => W / 2 + (i - 2) * (PLQ_W + PLQ_GAP);
function neon(P3, txt, sub, k, o = {}) {
  if (k <= 0.01 || !P3) return; const A = P3.isVector3 ? proj(P3) : P3; if (P3.isVector3 && !A.ok) return;
  const col = o.color || CYAN, size = o.size || 38, e = eo(clamp(k / 0.5)), dx = o.dx ?? 0, dy = o.dy ?? -170;
  hg.save(); hfont(size); hg.letterSpacing = '2px'; const tw = hg.measureText(txt).width; let sw = 0; if (sub) { hfont(Math.round(size * 0.55), false); sw = hg.measureText(sub).width; } hg.restore();
  const bw = Math.max(tw, sw) + 44, bh = sub ? size * 1.95 : size * 1.4;
  const bx = clamp(A.x + dx - bw / 2, 30, W - 30 - bw), by = clamp(A.y + dy - bh, o.ymin ?? 440, H - 280 - bh);
  const E = { x: clamp(A.x + dx, bx + 20, bx + bw - 20), y: A.y + dy < A.y ? by + bh : by };
  const ax = clamp(A.x, -50, W + 50), ay = clamp(A.y, -50, H + 50);
  hg.save(); hg.globalAlpha = clamp(k * 2.5); hg.lineCap = 'round';
  const lx = ax + (E.x - ax) * e, ly = ay + (E.y - ay) * e;
  hg.shadowColor = col; hg.shadowBlur = 16; hg.strokeStyle = col; hg.lineWidth = 4; hg.beginPath(); hg.moveTo(ax, ay); hg.lineTo(lx, ly); hg.stroke();
  hg.fillStyle = col; hg.beginPath(); hg.arc(ax, ay, 7, 0, 7); hg.fill();
  const kb = clamp((k - 0.35) / 0.4);
  if (kb > 0) { hg.globalAlpha = clamp(k * 2.5) * kb; hg.shadowBlur = 24; hg.shadowColor = 'rgba(0,0,0,.6)'; hg.fillStyle = 'rgba(10,12,24,.86)'; rr(hg, bx, by, bw, bh, 18); hg.fill();
    hg.shadowColor = col; hg.shadowBlur = 14; hg.strokeStyle = col; hg.lineWidth = 2.5; rr(hg, bx, by, bw, bh, 18); hg.stroke();
    hg.shadowBlur = 18; hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(size); hg.letterSpacing = '2px'; hg.fillText(txt, bx + bw / 2, by + (sub ? size * 0.78 : bh / 2 + 2));
    if (sub) { hg.shadowBlur = 0; hfont(Math.round(size * 0.55), false); hg.fillStyle = INK; hg.fillText(sub, bx + bw / 2, by + size * 1.45); } }
  hg.restore();
}
function bigNeon(txt, y, size, col, k, sub = '') {
  if (k <= 0.01) return; const s = 0.85 + 0.15 * eo(clamp(k / 0.6));
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(W / 2, y); hg.scale(s, s); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(size); hg.letterSpacing = Math.round(size * 0.04) + 'px';
  hg.lineJoin = 'round'; hg.strokeStyle = 'rgba(8,6,20,.9)'; hg.lineWidth = size * 0.16; hg.strokeText(txt, 0, 0);
  hg.shadowColor = col; hg.shadowBlur = 28; hg.fillStyle = col; hg.fillText(txt, 0, 0); hg.shadowBlur = 10; hg.fillStyle = '#ffffff'; hg.globalAlpha *= 0.5; hg.fillText(txt, 0, 0);
  if (sub) { hg.globalAlpha = clamp(k * 2); hg.shadowBlur = 12; hg.shadowColor = 'rgba(0,0,0,.9)'; hfont(Math.round(size * 0.36), false); hg.letterSpacing = '3px'; hg.fillStyle = INK; hg.fillText(sub, 0, size * 0.85); }
  hg.restore();
}
// cabecera y el truco pendiente (bucle abierto): «EL TRUCO DE JASON Y LUCÍA · ???» → «EL TRUCO: SEPÁRALOS»
function hdr(t) {
  const a = win(t, 1.7, 0.4) * (1 - win(t, END - 1.1, 0.4)); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic'; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 12;
  hg.letterSpacing = '4px'; hfont(42); hg.fillStyle = INK; hg.textAlign = 'left'; hg.fillText('GTA 6 · LA POLICÍA', 54, 142);
  hg.letterSpacing = '2px'; hfont(22, false); hg.fillStyle = GREY; hg.fillText('LO QUE ROCKSTAR HA CONTADO A IGN', 56, 178);
  hg.textAlign = 'right'; hfont(18, false); hg.fillStyle = GREY; hg.fillText('ASÍ', 1024, 112); hfont(32); hg.fillStyle = PINK; hg.fillText('FUNCIONA', 1024, 148);
  const mk = win(t, K['truco_2'] - 0.1, 0.3) * (1 - win(t, 43.0, 0.4));
  if (mk > 0.01) { const done = t > K['separalos_10'], txt = done ? 'EL TRUCO: SEPÁRALOS' : 'EL TRUCO DE JASON Y LUCÍA · ???', col = done ? GREENc : VIOL, on = done || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = a * mk * (on ? 1 : 0.3); hfont(20); hg.letterSpacing = '2px'; hg.textAlign = 'right'; const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 228;
    hg.fillStyle = 'rgba(10,8,24,.74)'; rr(hg, x0, y - 26, w, 40, 8); hg.fill(); hg.strokeStyle = col; hg.lineWidth = 2; rr(hg, x0, y - 26, w, 40, 8); hg.stroke(); hg.fillStyle = col; hg.fillText(txt, x1 - 17, y + 1); }
  hg.restore();
}
// ---- las estrellas: estado (0 = hueca, 1 = encendida) de cada una y si se ve
function starsAt(t) {
  const lit = [1, 1, 1, 1, 1, 0], sc = [1, 1, 1, 1, 1, 1]; let a = 1, six = 1;
  const blink = t0 => Math.floor((t - t0) * 7) % 2 === 0 ? 1 : 0;
  if (t >= 10.3 && t < K['seis_4'] - 0.1) { six = 1 - win(t, 10.3, 0.4); if (t > K['parpadearan_3']) { const b = blink(K['parpadearan_3']); for (let i = 0; i < 5; i++) lit[i] = b; } a = 1 - win(t, 14.05, 0.4); }
  else if (t >= K['seis_4'] - 0.1 && t < K['todo_6']) { for (let i = 0; i < 6; i++) { const ti = K['seis_4'] - 0.05 + i * 0.14; lit[i] = t > ti ? 1 : 0; sc[i] = pops(t, ti, 0.3); } }
  else if (t >= K['todo_6'] && t < K['pista_7'] - 0.3) { const off = win(t, K['todo_6'], 0.3); for (let i = 0; i < 6; i++) lit[i] = 1 - off; const tc = K['testigo_6'] + 0.42; if (t > tc && t < K['ve_6']) { lit[0] = 1; sc[0] = 0.75 + 0.25 * pops(t, tc, 0.3); } }
  else if (t >= K['pista_7'] - 0.3 && t < K['buscan_10']) { const b = t > K['facil_9'] ? (t > K['facil_9'] + 0.85 ? 0 : blink(K['facil_9'])) : 1; for (let i = 0; i < 6; i++) { const ti = K['pista_7'] - 0.3 + i * 0.08; lit[i] = i < 3 && t > ti ? b : 0; if (i < 3) sc[i] = 0.75 + 0.25 * pops(t, ti, 0.3); } }
  else if (t >= K['buscan_10'] && t < K['cinco_11'] - 0.1) { const tb = TL.split + 0.6, b = t > tb ? (t > tb + 0.6 ? 0 : blink(tb)) : 1; for (let i = 0; i < 6; i++) { const ti = K['buscan_10'] + i * 0.1; lit[i] = i < 2 && t > ti ? b : 0; if (i < 2) sc[i] = 0.75 + 0.25 * pops(t, ti, 0.3); } }
  else if (t >= K['cinco_11'] - 0.1) { for (let i = 0; i < 6; i++) { const ti = K['cinco_11'] - 0.1 + i * 0.12; lit[i] = i < 5 && t > ti ? 1 : 0; if (i < 5) sc[i] = 0.75 + 0.25 * pops(t, ti, 0.3); } }
  return { lit, sc, a, six };
}
function starPath(x, y, r) { hg.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.46 : r; hg.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } hg.closePath(); }
function drawStars(t) {
  const st = starsAt(t); if (st.a <= 0.01) return; const pulse = 1 + 0.05 * Math.sin(t / END * Math.PI * 2 * 60);
  hg.save(); hg.lineJoin = 'round';
  for (let i = 0; i < 6; i++) { const al = st.a * (i === 5 ? st.six : 1); if (al <= 0.01 || st.sc[i] <= 0.01) continue; const n = 5 + st.six, x = starX(i, n), r = STAR_R * st.sc[i] * (st.lit[i] ? pulse : 1);
    hg.globalAlpha = al; hg.shadowColor = 'rgba(0,0,0,.75)'; hg.shadowBlur = 14; starPath(x, STAR_Y, r + 5); hg.fillStyle = 'rgba(10,8,22,.82)'; hg.fill();
    if (st.lit[i]) { hg.shadowColor = '#FFD76A'; hg.shadowBlur = 26; starPath(x, STAR_Y, r); hg.fillStyle = GOLDs; hg.fill(); hg.shadowBlur = 0; starPath(x, STAR_Y, r * 0.62); hg.fillStyle = '#ffffff'; hg.globalAlpha = al * 0.55; hg.fill(); }
    else { hg.shadowBlur = 0; starPath(x, STAR_Y, r); hg.strokeStyle = 'rgba(235,238,245,.75)'; hg.lineWidth = 3; hg.stroke(); } }
  hg.restore();
}
// ---- iconos de las pistas (centrados en 0,0; tamaño ≈ 70)
function icon(i, col) {
  hg.fillStyle = col; hg.strokeStyle = col; hg.lineWidth = 6; hg.lineCap = 'round'; hg.lineJoin = 'round';
  if (i === 0) { hg.beginPath(); rr(hg, -40, -6, 80, 24, 9); hg.fill(); hg.beginPath(); hg.moveTo(-24, -6); hg.lineTo(-13, -27); hg.lineTo(15, -27); hg.lineTo(28, -6); hg.closePath(); hg.fill();
    hg.fillStyle = '#0a0c18'; for (const x of [-22, 22]) { hg.beginPath(); hg.arc(x, 18, 12, 0, 7); hg.fill(); } hg.fillStyle = col; for (const x of [-22, 22]) { hg.beginPath(); hg.arc(x, 18, 7.5, 0, 7); hg.fill(); } }
  else if (i === 1) { hg.beginPath(); hg.moveTo(-14, -30); hg.quadraticCurveTo(0, -18, 14, -30); hg.lineTo(40, -16); hg.lineTo(30, 4); hg.lineTo(20, -2); hg.lineTo(20, 32); hg.lineTo(-20, 32); hg.lineTo(-20, -2); hg.lineTo(-30, 4); hg.lineTo(-40, -16); hg.closePath(); hg.fill(); }
  else if (i === 2) { hg.beginPath(); hg.arc(0, -14, 17, 0, 7); hg.fill(); hg.beginPath(); hg.moveTo(-32, 34); hg.quadraticCurveTo(-32, 6, 0, 6); hg.quadraticCurveTo(32, 6, 32, 34); hg.closePath(); hg.fill(); }
  else if (i === 3) { hg.save(); hg.rotate(0.28); rr(hg, -34, -16, 52, 28, 6); hg.fill(); hg.beginPath(); hg.moveTo(18, -9); hg.lineTo(36, -16); hg.lineTo(36, 12); hg.lineTo(18, 5); hg.closePath(); hg.fill(); hg.restore();
    hg.beginPath(); hg.moveTo(-12, 12); hg.lineTo(-12, 30); hg.lineTo(-34, 30); hg.stroke(); }
  else if (i === 4) { for (const [x, s] of [[-17, 1], [17, 1]]) { hg.beginPath(); hg.arc(x, -15, 13, 0, 7); hg.fill(); hg.beginPath(); hg.moveTo(x - 24, 32); hg.quadraticCurveTo(x - 24, 4, x, 4); hg.quadraticCurveTo(x + 24, 4, x + 24, 32); hg.closePath(); hg.fill(); } }
}
function lockIcon(col, open) { hg.strokeStyle = col; hg.fillStyle = col; hg.lineWidth = 7; hg.lineCap = 'round'; hg.save(); if (open) { hg.translate(-6, -6); hg.rotate(-0.5); } hg.beginPath(); hg.arc(0, -12, 15, Math.PI, 0); hg.lineTo(15, -2); hg.moveTo(-15, -12); hg.lineTo(-15, -2); hg.stroke(); hg.restore(); rr(hg, -24, -4, 48, 38, 8); hg.fill(); }
// estado de cada pista: ap (aparece), on (encendida), off (borrada)
function plqAt(t) {
  const on0 = [K['coche_5'] - 0.05, K['ropa_5'] - 0.05, K['aspecto_5'] - 0.05, K['grabado_5'] + 0.15, K['pareja_10'] - 0.05], off0 = [K['una_8'] - 0.05, K['otra_8'] - 0.05, 1e9, 1e9, TL.split + 0.25];
  const row = win(t, K['debajo_4'] - 0.05, 0.3) * (1 - 0.72 * cw(t, K['todo_6'] + 0.1, K['pista_7'] - 0.35, 0.3)) * (1 - win(t, 42.3, 0.6));
  return PLQ.map((p, i) => { const ap = eo(seg(t, K['debajo_4'] + i * 0.14, K['debajo_4'] + i * 0.14 + 0.35)); let on = t > on0[i] ? 1 : 0, off = t > off0[i] ? 1 : 0;
    if (off && t < off0[i] + 0.4) on = Math.floor((t - off0[i]) * 16) % 2; else if (off) on = 0;                    // parpadea como un neón al apagarse
    const pk = t > on0[i] && !off ? 1 + 0.12 * (1 - seg(t, on0[i], on0[i] + 0.3)) : 1;
    return { ap, on, off: off && t >= off0[i] + 0.4 ? 1 : 0, pk, lock: i === 4 ? (t < K['truco_10'] ? 1 : t < on0[4] ? 2 : 0) : 0, row }; });
}
function drawPlaques(t) {
  const P = plqAt(t); if (P[0].row <= 0.01) return; const A = S.anc, anc = [[A.car], [A.shirt], [A.face], [A.cctv], [A.face, A.lucia]];
  hg.save(); hg.globalAlpha = 0.34 * P[0].row; const gr = hg.createLinearGradient(0, 430, 0, 790); gr.addColorStop(0, 'rgba(8,6,20,0)'); gr.addColorStop(0.2, 'rgba(8,6,20,1)'); gr.addColorStop(0.8, 'rgba(8,6,20,1)'); gr.addColorStop(1, 'rgba(8,6,20,0)'); hg.fillStyle = gr; hg.fillRect(0, 430, W, 360); hg.restore();
  // hilos de neón de cada pista encendida a su cosa en la calle
  P.forEach((p, i) => { if (!p.on || p.ap < 0.99) return; const x = plqX(i), y = PLQ_Y + PLQ_H; for (const a of anc[i]) { const q = proj(a); if (!q.ok) continue; const qx = clamp(q.x, 20, W - 20), qy = clamp(q.y, y + 20, H - 200);
    hg.save(); hg.globalAlpha = 0.9 * p.row; hg.shadowColor = PLQ[i].c; hg.shadowBlur = 14; hg.strokeStyle = PLQ[i].c; hg.lineWidth = 3.5; hg.setLineDash([2, 12]); hg.lineDashOffset = -t * 60; hg.lineCap = 'round'; hg.beginPath(); hg.moveTo(x, y + 4); hg.lineTo(qx, qy); hg.stroke();
    hg.setLineDash([]); hg.fillStyle = PLQ[i].c; hg.beginPath(); hg.arc(qx, qy, 4, 0, 7); hg.fill(); hg.lineWidth = 3; hg.beginPath(); hg.arc(qx, qy, 20 + 4 * Math.sin(t * 6), 0, 7); hg.stroke(); hg.restore(); } });
  P.forEach((p, i) => { if (p.ap <= 0.01) return; const x = plqX(i), y = PLQ_Y - (1 - p.ap) * 26, c = PLQ[i].c, w = PLQ_W * p.pk, h = PLQ_H * p.pk;
    hg.save(); hg.globalAlpha = p.ap * p.row; hg.translate(x, y + PLQ_H / 2);
    hg.shadowColor = 'rgba(0,0,0,.6)'; hg.shadowBlur = 18; hg.fillStyle = 'rgba(12,10,28,.9)'; rr(hg, -w / 2, -h / 2, w, h, 20); hg.fill();
    if (p.on) { hg.shadowColor = c; hg.shadowBlur = 20; hg.strokeStyle = c; hg.lineWidth = 4; } else { hg.shadowBlur = 0; hg.strokeStyle = p.off ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.34)'; hg.lineWidth = 2.5; }
    rr(hg, -w / 2, -h / 2, w, h, 20); hg.stroke();
    hg.save(); hg.translate(0, -16); const ic = p.on ? c : (p.off ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.42)'); if (p.on) { hg.shadowColor = c; hg.shadowBlur = 16; } else hg.shadowBlur = 0;
    if (p.lock) lockIcon(p.lock === 2 ? VIOL : 'rgba(255,255,255,.42)', p.lock === 2); else icon(i, ic); hg.restore();
    hg.shadowBlur = 0; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(21); hg.letterSpacing = '2px'; hg.fillStyle = p.on ? INK : (p.off ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.55)'); hg.fillText(p.lock ? '???' : PLQ[i].n, 0, 52);
    if (p.off) { hg.strokeStyle = REDc; hg.lineWidth = 7; hg.lineCap = 'round'; hg.shadowColor = REDc; hg.shadowBlur = 10; hg.beginPath(); hg.moveTo(-w / 2 + 22, h / 2 - 24); hg.lineTo(w / 2 - 22, -h / 2 + 24); hg.stroke(); }
    hg.restore(); });
}
function hudAt(t) {
  hudBegin(); hdr(t); const A = S.anc;
  drawPlaques(t); drawStars(t);
  // 1 · no te busca a ti: busca tu ropa y tu coche
  neon(A.nude, 'TÚ', '', cw(t, K['ti_1'] - 0.2, 5.55, 0.2), { size: 48, color: INK, dx: 70, dy: -150, ymin: 620 });
  neon(A.shirt, 'TU ROPA', '', cw(t, K['ropa_1'] - 0.12, 5.75, 0.2), { size: 44, color: PINK, dx: -170, dy: -150, ymin: 620 });
  neon(A.car, 'TU COCHE', '', cw(t, K['coche_1'] - 0.12, 6.4, 0.2), { size: 44, color: ORNG, dx: 60, dy: 230, ymin: 620 });
  // 2 · Jason y Lucía
  neon(A.face, 'JASON', '', cw(t, K['jason_2'] - 0.1, 10.15, 0.2), { size: 40, color: ORNG, dx: 170, dy: -150, ymin: 620 });
  neon(A.lucia, 'LUCÍA', '', cw(t, K['lucia_2'] - 0.1, 10.15, 0.2), { size: 40, color: PINK, dx: -170, dy: -170, ymin: 620 });
  // 3 · en GTA 5…  4 · ahora, en GTA 6
  bigNeon('EN GTA 5', 1500, 100, GREY, cw(t, K['gta_3'] - 0.1, 14.45, 0.2), 'ESCONDERTE Y ESPERAR');
  bigNeon('EN GTA 6', 1500, 100, CYAN, cw(t, K['ahora_4'] - 0.05, K['pero_4'] + 0.2, 0.2), 'SEIS ESTRELLAS');
  // 6 · el testigo; la alarma; sin testigo ni alarma, no hay estrellas
  { const u = seg(t, K['testigo_6'] - 0.15, K['testigo_6'] + 0.42), q = proj(A.wit); if (u > 0 && t < K['ve_6'] && q.ok) { const x1 = starX(0, 6), y1 = STAR_Y + 30, x = q.x + (x1 - q.x) * eo(u), y = q.y + (y1 - q.y) * eo(u);
      hg.save(); hg.shadowColor = AMBc; hg.shadowBlur = 14; hg.strokeStyle = AMBc; hg.lineWidth = 4; hg.setLineDash([3, 14]); hg.lineDashOffset = -t * 90; hg.lineCap = 'round'; hg.beginPath(); hg.moveTo(q.x, q.y); hg.lineTo(x, y); hg.stroke(); hg.restore(); } }
  neon(A.wit, 'TESTIGO', 'LLAMA A LA POLICÍA', cw(t, K['testigo_6'] - 0.1, K['nadie_6'] + 0.1, 0.2), { size: 40, color: AMBc, dx: 170, dy: 230, ymin: 800 });
  neon(A.alarm, 'ALARMA', 'EN SILENCIO', cw(t, K['salta_6'] - 0.1, 29.0, 0.2), { size: 40, color: REDc, dx: 150, dy: 260, ymin: 800 });
  bigNeon('SIN TESTIGOS', 1480, 92, GREENc, cw(t, K['hay_6'] - 0.1, 29.15, 0.2), 'NO HAY ESTRELLAS');
  // 8 · una menos… otra menos
  bigNeon('UNA PISTA MENOS', 1520, 84, GREENc, cw(t, K['una_8'] - 0.05, K['unas_8'] + 0.05, 0.15));
  bigNeon('OTRA MENOS', 1520, 84, GREENc, cw(t, K['otra_8'] - 0.05, K['cuantas_9'] + 0.25, 0.15));
  // 10 · el truco: si buscan a una pareja… sepáralos
  neon(A.face, 'JASON', '', cw(t, K['jason_10'] - 0.1, TL.split, 0.2), { size: 36, color: ORNG, dx: 150, dy: -160, ymin: 800 });
  neon(A.lucia, 'LUCÍA', '', cw(t, K['lucia_10'] - 0.1, TL.split, 0.2), { size: 36, color: PINK, dx: -150, dy: -170, ymin: 800 });
  bigNeon('SEPÁRALOS', 1500, 112, VIOL, cw(t, K['separalos_10'] - 0.05, 41.55, 0.15));
  // 11 · ¿huyes o te cambias de ropa?
  bigNeon('¿HUYES…', 1400, 108, INK, cw(t, K['huyes_11'] - 0.05, 45.1, 0.25)); bigNeon('…O TE CAMBIAS?', 1530, 96, PINK, cw(t, K['cambias_11'] - 0.05, 45.1, 0.25));
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
  post.uniforms.ca.value = 0.2; post.uniforms.vig.value = 0.22; post.uniforms.bloom.value = 0.3;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s); window.glLost = () => renderer.getContext().isContextLost();
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
