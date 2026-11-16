// «Cuidado cuando calientes agua en el microondas» (Así funciona, 16-11-2026): realista y de cine, en una cocina de verdad (HDRI «Blinds» de Poly Haven,
// CC0): el microondas, la taza de agua que estalla, el magnetrón, las moléculas, el cazo, la mano, el palito de madera.
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
// ---------------------------------------------------------------- la cocina de verdad: el HDRI «Brown Photostudio 02» de Poly Haven (CC0: un loft blanco con su cocina,
// estanterías con botes y ventanales) da el fondo (desenfocado, como con un objetivo de cine) y la luz de todos los reflejos; encima va la encimera de madera
// (textura «kitchen_wood», CC0) y la luz de los ventanales (a la izquierda) con sombras suaves. Unidades: 1 = 1 cm; la encimera está en y = 0.
const _o = new THREE.Object3D();      // objeto de trabajo para las matrices de las instancias
const ASSET = '/projects/microondas/web/assets/';
const ENV = { file: 'brown_photostudio_02', rot: 4.71, bg: 0.07, env: 0.55, blur: 0.25, wb: [1, 1, 1] };   // plató oscuro: la cocina apenas se intuye detrás     // rot 4,71: detrás del micro, las estanterías de la cocina
const TEXL = new THREE.TextureLoader(), PENDING = [];
function tx(path, srgb = true, rep = null) { let ok, ko; PENDING.push(new Promise((a, b) => { ok = a; ko = b; })); const t = TEXL.load(ASSET + path, () => ok(), undefined, e => { console.error('ERROR textura ' + path); ok(); }); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
async function loadEnv() {
  const hdr = await new RGBELoader().loadAsync(ASSET + `ph/${window.ENVFILE || ENV.file}/${window.ENVFILE || ENV.file}_${window.ENVRES || '4k'}.hdr`); hdr.mapping = THREE.EquirectangularReflectionMapping;
  // balance de blancos (neutro con este HDRI)
  if (ENV.wb.some(v => v !== 1)) { const d = hdr.image.data, wb = ENV.wb, f = THREE.DataUtils; const half = d instanceof Uint16Array;
    for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = half ? f.toHalfFloat(f.fromHalfFloat(d[i + c]) * wb[c]) : d[i + c] * wb[c];
    hdr.needsUpdate = true; }
  S.hdr = hdr; scene.background = hdr; scene.environment = hdr;
  envSet(ENV.rot, ENV.bg, ENV.env, ENV.blur);
}
function envSet(rot, bg, env, blur) {
  scene.backgroundRotation.set(0, rot, 0); scene.environmentRotation.set(0, rot, 0);
  scene.backgroundIntensity = bg; scene.environmentIntensity = env; scene.backgroundBlurriness = blur;
}
// la encimera (isla de madera barnizada) con su canto
function buildCounter() {
  const m = new THREE.MeshPhysicalMaterial({ map: tx('ph/kitchen_wood/kitchen_wood_Diffuse_2k.jpg', true, [10, 4]), normalMap: tx('ph/kitchen_wood/kitchen_wood_nor_gl_2k.jpg', false, [10, 4]),
    roughnessMap: tx('ph/kitchen_wood/kitchen_wood_Rough_2k.jpg', false, [10, 4]), aoMap: tx('ph/kitchen_wood/kitchen_wood_AO_2k.jpg', false, [10, 4]), roughness: 0.85, clearcoat: 0.45, clearcoatRoughness: 0.18, normalScale: new THREE.Vector2(0.6, 0.6) });
  const g = new THREE.BoxGeometry(180, 4, 110, 1, 1, 1); g.translate(-40, -2, -20); g.setAttribute('uv1', g.attributes.uv);
  const top = new THREE.Mesh(g, m); top.receiveShadow = true; top.castShadow = true; scene.add(top); S.counter = top;
  return top;
}
// luz de los ventanales (los del HDRI, a la izquierda y un poco por delante): sombras suaves; y un relleno frío muy suave
const WIN_DIR = new THREE.Vector3(-0.8, 0.55, 0.25).normalize();
function buildLights() {
  const key = new THREE.DirectionalLight(0xffe4c4, 2.0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0002;
  scene.add(key, key.target); const fill = new THREE.DirectionalLight(0xdbe6ff, 0.3); scene.add(fill, fill.target);
  const rim = new THREE.DirectionalLight(0x8fb6ff, 1.1); scene.add(rim, rim.target);                // contraluz frío: separa cada cosa del fondo oscuro
  S.L = { key, fill, rim };
}
// la sombra sigue a lo que mira la cámara (más fina cuanto más cerca)
function lightsAt(c, d) {
  const L = S.L, R = clamp(d * 0.7, 6, 120), sc = L.key.shadow.camera;
  L.key.position.copy(c).addScaledVector(WIN_DIR, 400); L.key.target.position.copy(c);
  sc.left = sc.bottom = -R; sc.right = sc.top = R; sc.near = 400 - 3 * R - 30; sc.far = 400 + 3 * R + 60; sc.updateProjectionMatrix(); L.key.shadow.normalBias = R * 0.004;
  L.fill.position.copy(c).add(v3(0.3, 0.4, 1).multiplyScalar(300)); L.fill.target.position.copy(c);
  L.rim.position.copy(c).add(v3(0.5, 0.6, -1).multiplyScalar(300)); L.rim.target.position.copy(c);
}
// espera a que terminen de cargar todas las texturas e imágenes
// cada material con su propia intensidad de reflejos (con scene.environment, three.js ignora envMapIntensity): se le pone el HDRI a mano.
// k: factor extra (dentro del horno cerrado apenas llega la luz de la cocina)
function envMat(m, k = 1) { if (!m || !m.isMeshStandardMaterial || !S.hdr) return; if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity;
  if (m.envMap !== S.hdr) { m.envMap = S.hdr; m.needsUpdate = true; } m.envMapRotation.set(0, ENV.rot, 0); m.envMapIntensity = m.userData.envFixed ?? m.userData.env0 * ENV.env * k; }
function envAll(root, k = 1) { root.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) envMat(m, k); }); }
function waitLoads() { return Promise.all(PENDING); }
// ---------------------------------------------------------------- el microondas (de los de casa, de encimera): carcasa de acero cepillado con los bordes redondeados,
// puerta de cristal negro ahumado con la rejilla de agujeros detrás, panel de mandos de cristal negro con la pantalla de cifras y los botones, interior
// esmaltado con su luz cálida, la tapa de mica de la guía de ondas en la pared derecha y el plato de cristal que gira sobre su aro de ruedas.
// Unidades: cm. Origen del grupo: abajo, en el centro del plano delantero de la carcasa; la puerta mira a +z.
const MWD = { W: 48, H: 28, D: 36, foot: 0.8, cav: { x0: -21, x1: 9, y0: 3.4, y1: 24.6, z0: -33, z1: 0 }, doorX1: 11.5 };
function roundRectShape(x0, y0, x1, y1, r, sh = new THREE.Shape()) {
  sh.moveTo(x0 + r, y0); sh.lineTo(x1 - r, y0); sh.quadraticCurveTo(x1, y0, x1, y0 + r); sh.lineTo(x1, y1 - r); sh.quadraticCurveTo(x1, y1, x1 - r, y1);
  sh.lineTo(x0 + r, y1); sh.quadraticCurveTo(x0, y1, x0, y1 - r); sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0); return sh;
}
function rectPathXY(x0, y0, x1, y1) { const p = new THREE.Path(); p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1); p.lineTo(x0, y1); p.closePath(); return p; }
// acero cepillado: vetas finas horizontales (rugosidad y relieve)
function brushedTex(w = 1024, h = 256) {
  const t = canvasTex(w, h, (g) => { g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const y = hash(i * 1.37) * h, l = 40 + hash(i * 2.9) * 400, x = hash(i * 4.1) * w, c = 110 + hash(i * 7.3) * 60 | 0; g.fillStyle = `rgba(${c},${c},${c},${0.25 + hash(i * 5.5) * 0.35})`; g.fillRect(x, y, l, 1); g.fillRect(x - w, y, l, 1); } });
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function mwMats() {
  const br = brushedTex();
  const metal = new THREE.MeshPhysicalMaterial({ color: 0xb4b9bf, metalness: 0.78, roughness: 0.4, roughnessMap: br, bumpMap: br, bumpScale: 0.15, clearcoat: 0.2, clearcoatRoughness: 0.3, envMapIntensity: 0.85 });
  const enamelT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#58595c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = hash(i * 1.7) > 0.5 ? 'rgba(160,150,135,.10)' : 'rgba(255,255,255,.12)'; g.fillRect(hash(i * 3.1) * w, hash(i * 5.3) * h, 1.2, 1.2); } });
  enamelT.wrapS = enamelT.wrapT = THREE.RepeatWrapping; enamelT.repeat.set(3, 3);
  const enamel = new THREE.MeshPhysicalMaterial({ map: enamelT, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, side: THREE.DoubleSide });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0c0d10, roughness: 0.08, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.7 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 });
  return { metal, enamel, black, rubber };
}
// la rejilla de la puerta: chapa negra con agujeros redondos (≈ 1,5 mm cada 2,5 mm) — por eso la luz pasa y las microondas no
function meshScreenTex(px = 1024, holes = 96) {
  const t = canvasTex(px, px, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; const s = w / holes;
    for (let j = 0; j < holes; j++) for (let i = 0; i < holes; i++) { g.beginPath(); g.arc((i + 0.5 + (j % 2) * 0.5) * s, (j + 0.5) * s, s * 0.32, 0, 7); g.fill(); } });
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// panel de mandos: la pantalla (se redibuja) y los botones serigrafiados
function panelTex() {
  const t = canvasTex(400, 900, () => {}); const g = t.userData.g;
  t.userData.draw = (txt, on) => { const w = 400, h = 900; g.fillStyle = '#07080a'; g.fillRect(0, 0, w, h);
    // pantalla
    g.fillStyle = '#020303'; rr(g, 40, 50, 320, 130, 14); g.fill(); g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; rr(g, 40, 50, 320, 130, 14); g.stroke();
    g.font = '700 92px "DejaVuMono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = on ? '#7dffb2' : 'rgba(125,255,178,.18)'; g.shadowColor = '#7dffb2'; g.shadowBlur = on ? 18 : 0; g.fillText(txt, 200, 118); g.shadowBlur = 0;
    // botones: potencia, descongelar, tiempo, 0–9, parar, empezar
    g.font = '600 24px "Inter", sans-serif'; g.fillStyle = 'rgba(230,232,235,.78)';
    const B = [['POTENCIA', 'DESCONG.'], ['TIEMPO', 'RELOJ'], ['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['PARAR', '0', '+30 s']];
    let y = 250; for (const row of B) { const n = row.length, bw = 300 / n; row.forEach((s, k) => { const x = 50 + bw * k; g.strokeStyle = 'rgba(255,255,255,.14)'; rr(g, x + 6, y - 30, bw - 12, 62, 10); g.stroke(); g.fillText(s, x + bw / 2, y + 2); }); y += 88; }
    g.fillStyle = 'rgba(120,200,255,.85)'; rr(g, 56, y - 30, 288, 66, 12); g.globalAlpha = 0.18; g.fill(); g.globalAlpha = 1; g.fillStyle = 'rgba(200,235,255,.95)'; g.font = '700 28px "Inter", sans-serif'; g.fillText('INICIO', 200, y + 4);
    t.needsUpdate = true; };
  t.userData.draw(':', false); return t;
}
function buildMicrowave() {
  const M = mwMats(), G = new THREE.Group(), U = { M }, C = MWD.cav, W = MWD.W, H = MWD.H, D = MWD.D, y0 = MWD.foot, y1 = y0 + H;
  // carcasa: rectángulo redondeado extruido hacia atrás con el hueco de la cavidad; las paredes del hueco son el esmalte de dentro
  { const sh = roundRectShape(-W / 2, y0, W / 2, y1, 1.8); sh.holes.push(rectPathXY(C.x0, C.y0, C.x1, C.y1));
    const g = new THREE.ExtrudeGeometry(sh, { depth: D - 1.2, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.6, bevelSegments: 4, curveSegments: 10 }); g.translate(0, 0, -D + 0.6);
    // grupos: 0 tapas, 1 lados de fuera, 2 paredes de la cavidad (las que están dentro del hueco)
    const P = g.attributes.position, idx = []; const groups = { 0: [], 1: [], 2: [] };
    for (const gr of g.groups) for (let i = gr.start; i < gr.start + gr.count; i += 3) { const cx = (P.getX(i) + P.getX(i + 1) + P.getX(i + 2)) / 3, cy = (P.getY(i) + P.getY(i + 1) + P.getY(i + 2)) / 3;
      const inside = cx > C.x0 - 0.01 && cx < C.x1 + 0.01 && cy > C.y0 - 0.01 && cy < C.y1 + 0.01; groups[gr.materialIndex === 1 && inside ? 2 : gr.materialIndex].push(i); }
    const ng = new THREE.BufferGeometry(); const attrs = ['position', 'normal', 'uv']; const out = {}; for (const a of attrs) out[a] = [];
    g.clearGroups(); let start = 0;
    for (const k of [0, 1, 2]) { for (const i of groups[k]) for (let v = 0; v < 3; v++) for (const a of attrs) { const A = g.attributes[a]; for (let c = 0; c < A.itemSize; c++) out[a].push(A.array[(i + v) * A.itemSize + c]); }
      ng.addGroup(start, groups[k].length * 3, k); start += groups[k].length * 3; }
    for (const a of attrs) ng.setAttribute(a, new THREE.Float32BufferAttribute(out[a], g.attributes[a].itemSize));
    // uv a escala real para el cepillado y el esmalte
    const UV = ng.attributes.uv, PP = ng.attributes.position, NN = ng.attributes.normal; for (let i = 0; i < UV.count; i++) { const nx = Math.abs(NN.getX(i)), ny = Math.abs(NN.getY(i)); const a = nx > 0.5 ? PP.getZ(i) : PP.getX(i), b = ny > 0.5 ? PP.getZ(i) : PP.getY(i); UV.setXY(i, a / 48, b / 48); }
    const shell = new THREE.Mesh(ng, [M.metal, M.metal, M.enamel]); shell.castShadow = true; shell.receiveShadow = true; G.add(shell); U.shell = shell; }
  // fondo de la cavidad y tapa trasera
  { const bw = new THREE.Mesh(new THREE.PlaneGeometry(C.x1 - C.x0, C.y1 - C.y0), M.enamel); bw.position.set((C.x0 + C.x1) / 2, (C.y0 + C.y1) / 2, C.z0); G.add(bw);
    const bp = new THREE.Mesh(new THREE.PlaneGeometry(C.x1 - C.x0 + 2, C.y1 - C.y0 + 2), M.metal); bp.position.set((C.x0 + C.x1) / 2, (C.y0 + C.y1) / 2, -D - 0.05); bp.rotation.y = Math.PI; G.add(bp); }
  // la tapa de mica de la guía de ondas (pared derecha de la cavidad) y la rejilla de la luz
  { const mica = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshPhysicalMaterial({ color: 0xc9b18a, roughness: 0.55, clearcoat: 0.3, side: THREE.DoubleSide }));
    mica.position.set(C.x1 - 0.02, 15.5, -14); mica.rotation.y = -Math.PI / 2; G.add(mica); U.mica = mica;
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshStandardMaterial({ color: 0x302820, emissive: 0xffc070, emissiveIntensity: 0, alphaMap: meshScreenTex(256, 18), transparent: true, side: THREE.DoubleSide }));
    gr.position.set(C.x1 - 0.03, 21.5, -27); gr.rotation.y = -Math.PI / 2; G.add(gr); U.lampGrille = gr;
    for (const [y, z] of [[11.8, -10.2], [11.8, -17.8], [19.2, -10.2], [19.2, -17.8]]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 12), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 1, roughness: 0.3 })); s.rotation.z = Math.PI / 2; s.position.set(C.x1 - 0.06, y, z); G.add(s); } }
  // la luz de dentro (cálida) y la del plato
  { const L = new THREE.PointLight(0xffe2b4, 0, 60, 2); L.position.set(C.x1 - 3, C.y1 - 3, -26); G.add(L); U.lamp = L;
    const L2 = new THREE.PointLight(0xffe8c4, 0, 50, 2); L2.position.set(-14, C.y1 - 2, -6); G.add(L2); U.lamp2 = L2; }
  // el plato giratorio de cristal sobre su aro de ruedas
  { const cx = (C.x0 + C.x1) / 2, cz = (C.z0 + C.z1) / 2; U.plateC = v3(cx, C.y0, cz);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(9, 0.35, 10, 64), new THREE.MeshStandardMaterial({ color: 0x2a2b2f, roughness: 0.6 })); ring.rotation.x = Math.PI / 2; ring.position.set(cx, C.y0 + 0.6, cz); G.add(ring);
    for (let k = 0; k < 3; k++) { const a = k * 2.094, wh = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.5, 16), M.rubber); wh.rotation.z = Math.PI / 2; wh.rotation.y = a; wh.position.set(cx + Math.cos(a) * 9, C.y0 + 0.75, cz + Math.sin(a) * 9); G.add(wh); }
    const plate = new THREE.Group(); plate.position.set(cx, C.y0 + 1.5, cz); G.add(plate); U.plate = plate;
    const prof = [[0.01, 0.0], [10.5, 0.0], [12.6, 0.35], [13.4, 0.9], [13.6, 1.25], [13.4, 1.35], [12.9, 1.1], [12.2, 0.55], [10.4, 0.25], [0.01, 0.25]].map(([r, y]) => new THREE.Vector2(r, y));
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xe8f2f0, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.32, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
    const pm = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), glass); pm.renderOrder = 3; plate.add(pm); U.plateTop = 0.25 + C.y0 + 1.5; }
  // la puerta: marco de acero, cristal negro ahumado (opaco alrededor, translúcido en la ventana) y la rejilla de agujeros detrás
  { const D2 = new THREE.Group(); D2.position.set(-W / 2, 0, 0); G.add(D2); U.door = D2;      // bisagra a la izquierda
    const dw = MWD.doorX1 + W / 2, wx0 = 3.5, wx1 = dw - 4.5, wy0 = y0 + 4.2, wy1 = y1 - 3.6;
    const fs = roundRectShape(0, y0, dw, y1, 1.4); fs.holes.push(rectPathXY(wx0 - 0.8, wy0 - 0.8, wx1 + 0.8, wy1 + 0.8));
    const fg = new THREE.ExtrudeGeometry(fs, { depth: 2.0, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.4, bevelSegments: 3, curveSegments: 8 }); fg.translate(0, 0, 0.4);
    const fm = new THREE.Mesh(fg, M.metal); fm.castShadow = true; fm.receiveShadow = true; D2.add(fm);
    const alpha = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); const x0 = (wx0 / dw) * w, x1 = (wx1 / dw) * w, ya = (1 - (wy1 - y0) / (y1 - y0)) * h, yb = (1 - (wy0 - y0) / (y1 - y0)) * h; g.fillStyle = '#7a7a7a'; rr(g, x0, ya, x1 - x0, yb - ya, 8); g.fill(); });
    alpha.colorSpace = THREE.NoColorSpace;
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(dw - 1.6, y1 - y0 - 1.6), new THREE.MeshPhysicalMaterial({ color: 0x08090b, roughness: 0.03, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, alphaMap: alpha, transparent: true, envMapIntensity: 1.3, depthWrite: false }));
    gl.position.set(dw / 2, (y0 + y1) / 2, 2.46); gl.renderOrder = 6; D2.add(gl); U.doorGlass = gl;
    const sc = meshScreenTex(); sc.repeat.set((wx1 - wx0) / 25, (wy1 - wy0) / 25);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(wx1 - wx0 + 1.6, wy1 - wy0 + 1.6), new THREE.MeshStandardMaterial({ color: 0x1b1c1f, metalness: 0.7, roughness: 0.45, alphaMap: sc, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    scr.position.set((wx0 + wx1) / 2, (wy0 + wy1) / 2, 1.2); scr.renderOrder = 5; D2.add(scr); U.screen = scr;
    // con la cámara muy cerca, la rejilla queda desenfocada: un velo oscuro uniforme (como en una foto de verdad)
    const veil = new THREE.Mesh(scr.geometry, new THREE.MeshBasicMaterial({ color: 0x0b0c0e, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); veil.position.copy(scr.position); veil.renderOrder = 5; D2.add(veil); U.veil = veil; U.win = { x0: wx0 - W / 2, x1: wx1 - W / 2, y0: wy0, y1: wy1 };
    // junta interior (se ve con la puerta abierta)
    const gs = roundRectShape(1, y0 + 1, dw - 1, y1 - 1, 1.2); gs.holes.push(rectPathXY(wx0 - 0.8, wy0 - 0.8, wx1 + 0.8, wy1 + 0.8));
    const gk = new THREE.Mesh(new THREE.ShapeGeometry(gs), new THREE.MeshStandardMaterial({ color: 0x2d2f33, roughness: 0.7, side: THREE.DoubleSide })); gk.position.z = 0.38; D2.add(gk); }
  // panel de mandos (cristal negro con la pantalla y los botones) y el botón de abrir la puerta
  { const pw = W / 2 - MWD.doorX1 - 0.3, px = MWD.doorX1 + 0.3 + pw / 2; const tex = panelTex(); U.panelTex = tex;
    const pg = new THREE.ExtrudeGeometry(roundRectShape(-pw / 2, y0 + 0.2, pw / 2, y1 - 0.2, 1.2), { depth: 1.6, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3, bevelSegments: 3 }); pg.translate(px, 0, 0.3);
    const pmesh = new THREE.Mesh(pg, M.black); pmesh.castShadow = true; G.add(pmesh);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(pw - 0.6, y1 - y0 - 1.4), new THREE.MeshPhysicalMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true }));
    face.position.set(px, (y0 + y1) / 2, 2.22); face.renderOrder = 4; G.add(face); U.panelFace = face; U.panelX = px;
    const ob = rbox(pw - 3.5, 2.6, 0.8, M.metal, 0.5); ob.position.set(px, y0 + 3.4, 2.4); G.add(ob); }
  // patas
  for (const [x, z] of [[-W / 2 + 4, -4], [W / 2 - 4, -4], [-W / 2 + 4, -D + 4], [W / 2 - 4, -D + 4]]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, MWD.foot, 20), M.rubber); f.position.set(x, MWD.foot / 2, z); G.add(f); }
  G.userData = U; return G;
}
// estado: luz encendida (0–1), giro del plato, puerta (0 cerrada … 1 abierta 100°), texto de la pantalla
function microwaveAt(MW, o) {
  const U = MW.userData, on = o.on ?? 0;
  const lamp = o.lamp ?? on; U.lamp.intensity = 380 * lamp; U.lamp2.intensity = 140 * lamp; U.lampGrille.material.emissiveIntensity = 3 * lamp;
  U.plate.rotation.y = o.turn ?? 0; U.door.rotation.y = -(o.door ?? 0) * 1.75;
  const txt = o.display ?? ':'; if (U._txt !== txt + on) { U._txt = txt + on; U.panelTex.userData.draw(txt, on > 0.5); }
}
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
// ---------------------------------------------------------------- la taza de cerámica esmaltada (verde azulado por fuera, blanca por dentro) con el agua, el estallido
// del agua sobrecalentada a cámara lenta (gotas que se estiran con la velocidad, la columna del centro y el vapor), el café soluble que cae, el palito de madera
// (textura real de roble, CC0) con las burbujas que nacen en sus vetas, y la vista en corte. Unidades: cm; origen de la taza abajo en el centro.
const MUG = { R: 4.15, H: 9.6, WY: 7.9, rIn: y => 3.62 + 0.27 * clamp((y - 0.7) / 8.6) };
const WATER_REFL = { name: 'aguaEspejo', uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tint: { value: new THREE.Color(0.8, 0.9, 0.93) }, k: { value: 1 }, base: { value: 0.42 } },
  vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;\n#include <common>\n#include <logdepthbuf_pars_vertex>\nvoid main(){ vUv = textureMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n#include <logdepthbuf_vertex>\n}',
  fragmentShader: 'uniform vec3 color, tint; uniform sampler2D tDiffuse; uniform float k, base; varying vec4 vUv; varying vec3 vW;\n#include <logdepthbuf_pars_fragment>\nvoid main(){\n#include <logdepthbuf_fragment>\n' +
    'vec3 V = normalize(cameraPosition - vW); float F = 0.02 + 0.98 * pow(1.0 - max(V.y, 0.0), 5.0); vec4 uv = vUv; uv.xy += vec2(sin(vW.x * 6.0 + vW.z * 2.0), sin(vW.z * 5.0 - vW.x * 3.0)) * 0.0025 * uv.w;' +
    'vec3 r = texture2DProj(tDiffuse, uv).rgb; float a = clamp(base + F, 0.0, 1.0) * k; gl_FragColor = vec4(r * tint, a); }' };
function mugProfile() {
  const O = [[0.01, 0], [3.55, 0], [3.82, 0.12], [3.95, 0.45], [4.05, 2], [4.15, 6], [4.24, 9.25], [4.3, 9.5], [4.26, 9.66], [4.14, 9.7], [4.0, 9.6]];
  const I = [[MUG.rIn(9.3), 9.3], [MUG.rIn(6), 6], [MUG.rIn(2), 2], [3.5, 0.95], [3.1, 0.7], [0.01, 0.62]];
  return { pts: [...O, ...I].map(([r, y]) => new THREE.Vector2(r, y)), nOut: O.length };
}
function buildMug(o = {}) {
  const G = new THREE.Group(), U = {};
  const { pts, nOut } = mugProfile(), seg = 96;
  const g = new THREE.LatheGeometry(pts, seg);      // (sin recalcular normales: así no sale la costura)
  // color por vértice: esmalte de fuera (verde azulado oscuro) y de dentro (blanco)
  const col = new Float32Array(g.attributes.position.count * 3), cOut = new THREE.Color(o.color ?? 0x2b5a68), cIn = new THREE.Color(0xf3f1ec), cc = new THREE.Color();
  for (let i = 0; i <= seg; i++) for (let j = 0; j < pts.length; j++) { const k = i * pts.length + j; cc.copy(j < nOut - 1 ? cOut : cIn); if (j === nOut - 1 || j === nOut - 2) cc.copy(cOut).lerp(cIn, 0.35); col[k * 3] = cc.r; col[k * 3 + 1] = cc.g; col[k * 3 + 2] = cc.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const speck = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { c.fillStyle = `rgba(${hash(i) > 0.5 ? '0,0,0' : '255,255,255'},${0.05 + hash(i * 3.3) * 0.08})`; c.beginPath(); c.arc(hash(i * 1.9) * w, hash(i * 7.1) * h, 0.6 + hash(i * 2.2) * 1.4, 0, 7); c.fill(); } });
  speck.wrapS = speck.wrapT = THREE.RepeatWrapping; speck.repeat.set(6, 3); speck.colorSpace = THREE.NoColorSpace;
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, roughnessMap: speck, bumpMap: speck, bumpScale: 0.02, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.0 });
  const body = new THREE.Mesh(g, mat); body.castShadow = true; body.receiveShadow = true; G.add(body); U.mat = mat; U.body = body;
  // el asa: curva en C con sección ovalada
  { const cv = new THREE.CatmullRomCurve3([v3(3.9, 7.6, 0), v3(5.6, 7.7, 0), v3(6.8, 6.4, 0), v3(6.7, 4.0, 0), v3(5.5, 2.6, 0), v3(4.0, 2.4, 0)]);
    const hg = new THREE.TubeGeometry(cv, 64, 0.58, 18, false); const P = hg.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, P.getZ(i) * 0.62); hg.computeVertexNormals();
    const hm = new THREE.MeshPhysicalMaterial({ color: o.color ?? 0x2b5a68, roughness: 0.32, roughnessMap: speck, bumpMap: speck, bumpScale: 0.02, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.0 });
    const h = new THREE.Mesh(hg, hm); h.castShadow = true; G.add(h); U.handle = h; U.hmat = hm; }
  // el agua: superficie (rejilla polar que se deforma: menisco, hervor, el bulto del estallido) en dos capas: un velo de color y el reflejo (aditivo)
  { const NR = 40, NA = 96, rW = MUG.rIn(MUG.WY) - 0.02, pos = [], idx = [];
    // sin vértices repetidos (centro único y la vuelta cerrada) para que las normales no hagan costura
    pos.push(0, 0, 0); for (let i = 1; i <= NR; i++) for (let j = 0; j < NA; j++) { const r = rW * Math.pow(i / NR, 0.85), a = j / NA * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
    const vi = (i, j) => i === 0 ? 0 : 1 + (i - 1) * NA + (j % NA);
    for (let j = 0; j < NA; j++) idx.push(0, vi(1, j + 1), vi(1, j));
    for (let i = 1; i < NR; i++) for (let j = 0; j < NA; j++) { const a = vi(i, j), b = vi(i + 1, j), c = vi(i, j + 1), d = vi(i + 1, j + 1); idx.push(a, c, b, b, c, d); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setIndex(idx); sg.computeVertexNormals();
    U.surfBase = Float32Array.from(pos); U.NR = NR; U.NA = NA; U.rW = rW;
    const tint = new THREE.MeshPhysicalMaterial({ color: 0x8fb2b8, roughness: 0.02, transparent: true, opacity: 0.16, depthWrite: false });
    const refl = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.015, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.01, ior: 1.33, envMapIntensity: 2.4, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const s1 = new THREE.Mesh(sg, tint), s2 = new THREE.Mesh(sg, refl); for (const s of [s1, s2]) { s.position.y = MUG.WY; s.renderOrder = 7; G.add(s); }
    U.surf = sg; U.surfMeshes = [s1, s2];
    // agua quieta: espejo de verdad (Reflector) con Fresnel: refleja el techo del horno (oscurece un poco el agua) y la lámpara (destello);
    // así se ve que hay agua en una taza blanca. Solo cuando la superficie está lisa (en el hervor se usa la malla que se deforma).
    const wr = new Reflector(new THREE.CircleGeometry(rW - 0.02, 96), { textureWidth: 1024, textureHeight: 1024, clipBias: 0.002, multisample: 0, shader: WATER_REFL });
    wr.rotation.x = -Math.PI / 2; wr.position.y = MUG.WY + 0.01; wr.renderOrder = 7; wr.material.transparent = true; wr.material.depthWrite = false; G.add(wr); U.mirror = wr;
    // el cuerpo del agua (solo se ve en corte)
    const wb = new THREE.Mesh(new THREE.CylinderGeometry(rW - 0.01, MUG.rIn(0.8) - 0.02, MUG.WY - 0.65, 64, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x6f9aa6, roughness: 0.05, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
    wb.position.y = (MUG.WY + 0.65) / 2; wb.renderOrder = 6; wb.visible = false; G.add(wb); U.waterBody = wb;
    // la cara del corte del agua (trapecio en z = 0)
    const fs = new THREE.Shape(); fs.moveTo(-MUG.rIn(0.7) + 0.02, 0.66); fs.lineTo(MUG.rIn(0.7) - 0.02, 0.66); fs.lineTo(rW, MUG.WY); fs.lineTo(-rW, MUG.WY); fs.closePath();
    const cf = new THREE.Mesh(new THREE.ShapeGeometry(fs), wb.material); cf.renderOrder = 6; cf.visible = false; G.add(cf); U.cutFace = cf; }
  G.userData = U; return G;
}
// la superficie del agua: menisco en el borde + rizos de hervor (amp) + el bulto del centro (bulge, en cm) y el anillo que se abre (crown)
function mugSurface(M, t, o = {}) {
  const U = M.userData, P = U.surf.attributes.position, B = U.surfBase, amp = o.amp ?? 0, bulge = o.bulge ?? 0, crown = o.crown ?? 0, rise = o.rise ?? 0;
  for (let k = 0; k < P.count; k++) { const x = B[k * 3], z = B[k * 3 + 2], r = Math.hypot(x, z), u = r / U.rW;
    let y = 0.09 * Math.pow(u, 14) + rise;                                     // menisco (y el nivel que sube al hervir)
    y += amp * (0.12 * Math.sin(x * 5.1 + t * 13) * Math.sin(z * 4.3 - t * 11) + 0.06 * Math.sin(r * 9 - t * 20));
    y += bulge * Math.exp(-r * r / 2.2) + crown * 0.6 * Math.exp(-Math.pow((r - 1.6 - crown * 1.5) / 0.55, 2));
    P.setY(k, y); }
  P.needsUpdate = true; U.surf.computeVertexNormals();
}
// corte de la taza (plano x = 0: se quita la mitad de delante) para ver el agua por dentro
function mugCut(M, on) {
  const U = M.userData; if (!U.cutP) U.cutP = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
  M.updateWorldMatrix(true, false); U.cutP[0].constant = new THREE.Vector3().setFromMatrixPosition(M.matrixWorld).z;     // plano z = z de la taza (mundo)
  if (U.cutFace) U.cutFace.visible = !!on;
  const cp = on ? U.cutP : null; for (const m of [U.mat, U.hmat]) { m.clippingPlanes = cp; m.side = on ? THREE.DoubleSide : THREE.FrontSide; m.needsUpdate = true; }
  for (const s of U.surfMeshes) { s.material.clippingPlanes = cp; s.material.needsUpdate = true; }
  U.waterBody.visible = !!on; U.waterBody.material.clippingPlanes = cp;
}
// material de gota de agua (instanciado): uL = dirección hacia la lámpara (en el mundo), se pasa a la vista en cada fotograma
function dropMat() {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: true, uniforms: { uL: { value: new THREE.Vector3(0.7, 0.5, -0.5) }, uL2: { value: new THREE.Vector3(-0.3, 0.6, 0.75) }, bright: { value: 1 } },
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vN; varying vec3 vV; void main(){ vec4 p = vec4(position,1.); vec3 nn = normal;\n#ifdef USE_INSTANCING\np = instanceMatrix * p; nn = mat3(instanceMatrix) * nn;\n#endif\nvec4 mv = modelViewMatrix * p; vN = normalize(normalMatrix * nn); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv;\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: '#include <logdepthbuf_pars_fragment>\nuniform vec3 uL, uL2; uniform float bright; varying vec3 vN; varying vec3 vV; void main(){\n#include <logdepthbuf_fragment>\n' +
      'vec3 N = normalize(vN), V = normalize(vV); float ndv = abs(dot(N, V)), rim = pow(1.0 - ndv, 1.6);' +
      'vec3 c = mix(vec3(1.0, 0.97, 0.92) * 0.85 * bright, vec3(0.05, 0.055, 0.06), smoothstep(0.15, 0.85, rim)); float a = mix(0.16, 0.8, smoothstep(0.1, 0.9, rim));' +
      'float s1 = pow(max(dot(N, normalize(uL + V)), 0.0), 160.0), s2 = pow(max(dot(N, normalize(uL2 + V)), 0.0), 90.0) * 0.35;' +
      'float glint = pow(max(dot(-N, normalize(uL - V)), 0.0), 6.0) * 0.6;' +   // la luz que atraviesa la gota por detrás (destello del lado contrario)
      'c += vec3(1.0, 0.92, 0.78) * (s1 * 5.0 + glint * 1.4) * bright + vec3(0.85, 0.9, 1.0) * s2 * 2.0; a = clamp(a + s1 + s2 + glint * 0.5, 0.0, 1.0);' +
      'gl_FragColor = vec4(c, a); }' });
}
// ---------- el estallido (hervor de golpe del agua sobrecalentada), a cámara lenta. τ = tiempo REAL desde que empieza, en segundos.
// Lo que se ve en los vídeos de verdad: el agua sube de nivel, la superficie se llena de burbujas de vapor que revientan y lanzan rocío fino, del centro sale un
// chorro de gotas alargadas (hacia la cámara si o.dir) y sale vapor. Las gotas se pegan al cristal de la puerta cerrada o caen a la encimera si está abierta.
const SPL = { NB: 64 };
const boilLevel = tau => tau <= 0 ? 0 : 1.3 * clamp(tau / 0.012) * (1 - 0.6 * clamp((tau - 0.06) / 0.08));
function buildSplash(n = 2600, seed = 1) {
  const G = new THREE.Group(), geo = new THREE.SphereGeometry(1, 14, 10);
  // gota = lente pequeña (como en la fotografía de alta velocidad): centro claro (concentra la luz), borde oscuro y el destello de la lámpara del horno
  const m = dropMat();
  const im = new THREE.InstancedMesh(geo, m, n); im.frustumCulled = false; im.renderOrder = 9; G.add(im);
  // burbujas que asoman y revientan en la superficie
  const NB = SPL.NB, BD = new Float32Array(NB * 5);                                     // x, z, rMax, nace, revienta
  for (let j = 0; j < NB; j++) { const h = k => hash(j * 5.13 + k * 2.37 + seed * 3.3), r = 3.2 * Math.sqrt(h(1)), a = h(2) * 6.283, tb = 0.055 * Math.pow(h(4), 1.5);
    BD.set([Math.cos(a) * r, Math.sin(a) * r, 0.22 + 0.55 * Math.pow(h(3), 1.6), tb, tb + 0.004 + 0.011 * h(5)], j * 5); }
  const bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 28, 18), bubbleMat(0.45), NB); bub.frustumCulled = false; bub.renderOrder = 8; G.add(bub);
  // gotas: el chorro del centro (gordas y alargadas) y el rocío de cada burbuja que revienta
  const D = new Float32Array(n * 8);                                                     // x0, z0, vx, vy, vz, tamaño, τ0, tipo
  for (let i = 0; i < n; i++) { const h = k => hash(i * 7.31 + k * 1.913 + seed * 13.7), core = i < n * 0.14;
    if (core) { const r = 1.0 * Math.sqrt(h(1)), a = h(2) * 6.283, out = 4 + 22 * h(4);
      D.set([Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * out, 110 + 170 * h(3), Math.sin(a) * out, 0.035 + 0.06 * Math.pow(h(5), 1.3), 0.008 + 0.03 * h(6), 1], i * 8); }
    else { const j = Math.floor(h(7) * NB), bx = BD[j * 5], bz = BD[j * 5 + 1], br = BD[j * 5 + 2], a = h(2) * 6.283, out = 8 + 45 * h(4);
      D.set([bx + Math.cos(a) * br * 0.6, bz + Math.sin(a) * br * 0.6, Math.cos(a) * out, (35 + 150 * h(3)) * (0.6 + br), Math.sin(a) * out, 0.01 + 0.04 * Math.pow(h(5), 2.2), BD[j * 5 + 4] + 0.002 * h(6), 0], i * 8); } }
  _o.scale.setScalar(0.0001); _o.position.set(0, -1000, 0); _o.updateMatrix(); for (let i = 0; i < n; i++) im.setMatrixAt(i, _o.matrix); for (let j = 0; j < NB; j++) bub.setMatrixAt(j, _o.matrix);
  // vapor: nubecillas (textura de ruido) que suben, crecen y se deshacen; a contraluz de la lámpara del horno brillan
  const st = canvasTex(256, 256, (c, w, h) => { const img = c.createImageData(w, h), d = img.data;
    const n2 = (x, y, f) => { let v = 0, a = 1, s = 0; for (let o = 0; o < 5; o++) { v += a * (Math.sin(x * f * 1.7 + hash(o * 3.1) * 9) * Math.sin(y * f * 1.3 + hash(o * 7.7) * 9) * 0.5 + 0.5); s += a; a *= 0.55; f *= 2.1; } return v / s; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / w - 0.5, v = y / h - 0.5, r = Math.hypot(u, v) * 2, fall = Math.max(0, 1 - r * r) ** 1.6;
      const a = fall * Math.pow(n2(u * 6, v * 6, 1.2), 2.2) * 1.6, i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.min(255, a * 255); }
    c.putImageData(img, 0, 0); });
  const steam = []; for (let i = 0; i < 70; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, color: 0xfff4e6, transparent: true, depthWrite: false, opacity: 0, rotation: hash(i * 9.1) * 6.28 })); s.renderOrder = 10; G.add(s); steam.push(s); }
  G.userData = { im, D, n, steam, seed, bub, BD, NB }; return G;
}
const _sv = new THREE.Vector3(), _sq = new THREE.Quaternion(), _sY = new THREE.Vector3(0, 1, 0);
// o.dir: hacia dónde se inclina el chorro; o.floor: altura (local) del suelo del horno; o.wallZ: con la puerta cerrada, las gotas se quedan pegadas al cristal (z local)
// y resbalan; o.frontZ + o.floorOut: con la puerta abierta, más allá de frontZ caen a la encimera
function splashAt(SP, tau, o = {}) {
  const U = SP.userData, D = U.D, g = 981, dir = o.dir || null, floor = o.floor ?? -0.2, wallZ = o.wallZ ?? null, frontZ = o.frontZ ?? 1e9, floorOut = o.floorOut ?? floor, lv = boilLevel(tau);
  { const mu = U.im.material.uniforms; cam.updateMatrixWorld(); const vm = new THREE.Matrix3().setFromMatrix4(cam.matrixWorldInverse);
    mu.uL.value.copy(o.light || v3(0.72, 0.52, -0.46)).applyMatrix3(vm).normalize(); mu.uL2.value.copy(v3(-0.3, 0.6, 0.75)).applyMatrix3(vm).normalize(); mu.bright.value = o.bright ?? 1; }
  for (let i = 0; i < U.n; i++) { const b = i * 8, t = tau - D[b + 6];
    if (tau <= 0 || t <= 0) { _o.position.set(0, -1000, 0); _o.scale.setScalar(0.0001); _o.updateMatrix(); U.im.setMatrixAt(i, _o.matrix); continue; }
    let vx = D[b + 2], vy = D[b + 3], vz = D[b + 4]; if (dir) { const k = D[b + 7] ? 0.5 : 0.3; vx += dir.x * vy * k; vz += dir.z * vy * k; }
    let x = D[b] + vx * t, y = MUG.WY + lv + vy * t - 0.5 * g * t * t, z = D[b + 1] + vz * t, vyy = vy - g * t, s = D[b + 5] * clamp(t / 0.002), flat = 0;
    if (wallZ !== null && z > wallZ && vz > 0) {                                                        // choca con el cristal de la puerta y resbala
      const th = (wallZ - D[b + 1]) / vz, yh = MUG.WY + lv + vy * th - 0.5 * g * th * th; x = D[b] + vx * th; z = wallZ; y = Math.max(floor, yh - 5 * (t - th)); vx = 0; vyy = -5; vz = 0; flat = 1; }
    const inside = Math.hypot(x, z) < MUG.rIn(MUG.WY) - 0.1, fl = z > frontZ ? floorOut : floor;
    if (inside && y < MUG.WY + lv && vyy < 0) s *= clamp((y - MUG.WY - lv + 0.6) / 0.6);              // las que vuelven a caer dentro se hunden
    if (!inside && y < fl) { const tl = (y - fl) / Math.max(1, -vyy); y = fl; s *= clamp(1 + tl * 10); flat = 2; }   // las que caen fuera se aplastan y se van
    if (flat === 1) { _o.position.set(x, y, z - s * 0.3); _o.quaternion.identity(); _o.scale.set(s * 1.5, s * 1.9, Math.max(0.0001, s * 0.35)); }
    else if (flat === 2) { _o.position.set(x, y + s * 0.15, z); _o.quaternion.identity(); _o.scale.set(Math.max(0.0001, s * 1.7), Math.max(0.0001, s * 0.3), Math.max(0.0001, s * 1.7)); }
    else { const sp = Math.hypot(vx, vyy, vz), stretch = 1 + Math.min(D[b + 7] ? 3.2 : 2.2, sp * 0.009 * (o.blur ?? 1));
      _o.position.set(x, y, z); _sv.set(vx, vyy, vz).normalize(); _o.quaternion.setFromUnitVectors(_sY, _sv);
      _o.scale.set(Math.max(0.0001, s), Math.max(0.0001, s * stretch), Math.max(0.0001, s)); }
    _o.updateMatrix(); U.im.setMatrixAt(i, _o.matrix); }
  U.im.instanceMatrix.needsUpdate = true;
  // las burbujas de la superficie: asoman (casquete), crecen y revientan
  for (let j = 0; j < U.NB; j++) { const b = j * 5, u = (tau - U.BD[b + 3]) / (U.BD[b + 4] - U.BD[b + 3]);
    if (tau <= 0 || u <= 0 || u >= 1) { _o.position.set(0, -1000, 0); _o.scale.setScalar(0.0001); }
    else { const r = U.BD[b + 2] * Math.pow(sm5(clamp(u * 1.25)), 0.6); _o.position.set(U.BD[b], MUG.WY + lv - r * 0.45, U.BD[b + 1]); _o.quaternion.identity(); _o.scale.set(r, r * 0.9, r); }
    _o.updateMatrix(); U.bub.setMatrixAt(j, _o.matrix); }
  U.bub.instanceMatrix.needsUpdate = true;
  U.steam.forEach((s, i) => { const t = tau - 0.012 - (i % 14) * 0.006, k = clamp(t / 0.16); s.visible = t > 0 && (o.steam ?? 1) > 0;
    if (!s.visible) return; const a = hash(i * 3.7) * 6.283, r = 0.6 + 2.6 * hash(i * 5.1) + 9 * k * hash(i * 1.3), d = o.dir ? 6 * k : 0;
    s.position.set(Math.cos(a) * r + (o.dir ? o.dir.x * d : 0), MUG.WY + lv + 1 + 16 * Math.pow(k, 0.7) * (0.4 + hash(i * 2.9)), Math.sin(a) * r + (o.dir ? o.dir.z * d : 0));
    s.scale.setScalar(2.2 + 9 * Math.pow(k, 0.6) * (0.6 + 0.8 * hash(i * 4.4))); s.material.rotation = hash(i * 9.1) * 6.28 + k * (hash(i) - 0.5) * 2;
    s.material.opacity = 0.34 * Math.sin(Math.PI * clamp(k * 1.05)) * (o.steam ?? 1); });
}
// ---------- el bulto del principio (el agua se abomba antes de reventar), continuo: metaballs → superficie con marching cubes. Va en el grupo del estallido.
const ERU = { HE: 6, Y0: -3.2, res: 72 };                 // cubo de 12 cm: de WY-3,2 a WY+8,8; celda ≈ 0,17 cm
function buildErupt(seed = 3) {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transmission: 1, thickness: 1.5, ior: 1.33, specularIntensity: 1, envMapIntensity: 1.6, attenuationColor: new THREE.Color(0xd8f0f2), attenuationDistance: 10 });
  const mc = new THREE.Group(), m = new MarchingCubes(ERU.res, mat, false, false, 60000); m.isolation = 80; m.frustumCulled = false; m.renderOrder = 8;
  m.scale.setScalar(ERU.HE); m.position.set(0, MUG.WY + ERU.Y0 + ERU.HE, 0); mc.add(m);
  const B = [[0, 0, 1.45, 1]];                                                            // x, z, radio, peso: el bulto del centro y los grumos de su superficie
  for (let i = 0; i < 16; i++) { const h = k => hash(i * 4.77 + k * 1.31 + seed * 9.1), a = h(1) * 6.283, r = 0.4 + 1.6 * h(2); B.push([Math.cos(a) * r, Math.sin(a) * r, 0.35 + 0.4 * h(3), 0.6 + 0.4 * h(4)]); }
  mc.userData = { m, B }; return mc;
}
function eruptAt(EP, tau, o = {}) {
  const { m, B } = EP.userData, HE = ERU.HE, cy = MUG.WY + ERU.Y0 + HE, sub = 12, iso = m.isolation, lv = boilLevel(tau);
  const up = clamp(tau / 0.011), burst = clamp((tau - 0.011) / 0.008), k = Math.pow(sm5(up), 0.8) * (1 - sm5(burst));
  EP.visible = k > 0.02; if (!EP.visible) return; m.reset();
  for (const [x, z, r0, w] of B) { const r = r0 * k * (w < 1 ? (0.6 + 0.6 * up) : 1), y = MUG.WY + lv - (w < 1 ? 0.3 : 1.1) + (w < 1 ? 1.2 : 1.7) * k;
    if (r < 0.1) continue; const nx = x / (2 * HE) + 0.5, ny = (y - cy) / (2 * HE) + 0.5, nz = z / (2 * HE) + 0.5, d = r / (2 * HE); m.addBall(nx, ny, nz, d * d * (iso + sub), sub); }
  m.update();
}
// ---------- el café soluble: gránulos que caen (a cámara lenta) y tocan el agua en τHit
function buildCoffee(n = 140) {
  const geo = new THREE.IcosahedronGeometry(1, 1); { const P = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); v.multiplyScalar(0.7 + 0.45 * hash(Math.round(v.x * 50) * 3.1 + Math.round(v.y * 50) * 7.7 + Math.round(v.z * 50) * 1.3)); P.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); }
  const m = new THREE.MeshPhysicalMaterial({ color: 0x24140b, roughness: 0.62, clearcoat: 0.25, sheen: 0.4, sheenColor: new THREE.Color(0x6b4a30) });
  const im = new THREE.InstancedMesh(geo, m, n); im.castShadow = true; im.frustumCulled = false;
  _o.scale.setScalar(0.0001); _o.position.set(0, -1000, 0); _o.updateMatrix(); for (let i = 0; i < n; i++) im.setMatrixAt(i, _o.matrix);
  im.userData = { n }; return im;
}
// u: 0 arriba … 1 tocan el agua (cada gránulo con su retraso)
function coffeeAt(CF, u) {
  const n = CF.userData.n;
  for (let i = 0; i < n; i++) { const h = k => hash(i * 3.17 + k * 9.1), uu = clamp((u - h(1) * 0.25) / 0.75), a = h(2) * 6.283, r = 1.6 * Math.sqrt(h(3));
    const y = MUG.WY + 16 * (1 - uu) * (1 - uu) + 0.3, s = 0.08 + 0.12 * h(4);
    _o.position.set(Math.cos(a) * r, uu >= 1 ? -1000 : y, Math.sin(a) * r); _o.rotation.set(h(5) * 6 + u * 4, h(6) * 6, h(7) * 6); _o.scale.set(s, s * (0.6 + h(8) * 0.6), s * 0.8); _o.updateMatrix(); CF.setMatrixAt(i, _o.matrix); }
  CF.instanceMatrix.needsUpdate = true;
}
// ---------- el palito de madera (textura real de roble) y las burbujas que nacen en sus vetas y suben despacio
function buildStick() {
  const s = new THREE.Shape(), w = 0.32, L = 14; s.moveTo(-w, 0); s.lineTo(-w, L); s.absarc(0, L, w, Math.PI, 0, true); s.lineTo(w, 0); s.absarc(0, 0, w, 0, Math.PI, true);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 16 }); g.translate(0, 0, -0.08);
  const P = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / 6 + 0.5, P.getY(i) / 6);
  const m = new THREE.MeshPhysicalMaterial({ map: tx('ph/white_oak_veneer/white_oak_veneer_Diffuse_2k.jpg'), normalMap: tx('ph/white_oak_veneer/white_oak_veneer_nor_gl_2k.jpg', false), roughnessMap: tx('ph/white_oak_veneer/white_oak_veneer_Rough_2k.jpg', false), roughness: 0.75 });
  for (const t of [m.map, m.normalMap, m.roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); }
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
}
function buildBubbles(n = 90) {
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), bubbleMat(0.9), n); im.frustumCulled = false; im.renderOrder = 8;
  _o.scale.setScalar(0.0001); _o.position.set(0, -1000, 0); _o.updateMatrix(); for (let i = 0; i < n; i++) im.setMatrixAt(i, _o.matrix);
  im.userData = { n }; return im;
}
// burbujas que nacen en puntos de un segmento (a → b, en coordenadas de la taza), crecen, se sueltan y suben hasta la superficie; k: 0..1 cuántas
function bubblesAt(BB, t, a, b, k, o = {}) {
  const n = BB.userData.n, top = o.top ?? MUG.WY, rate = o.rate ?? 1;
  for (let i = 0; i < n; i++) { const h = q => hash(i * 5.33 + q * 2.71), per = 0.9 + 1.4 * h(1), ph = ((t * rate / per + h(2)) % 1 + 1) % 1, u = h(3);
    const on = i / n < k; const nx = a.x + (b.x - a.x) * u + (h(4) - 0.5) * 0.25, ny = a.y + (b.y - a.y) * u, nz = a.z + (b.z - a.z) * u + (h(5) - 0.5) * 0.25;
    let x = nx, y = ny, z = nz, r;
    if (ph < 0.45) r = 0.04 + 0.11 * (ph / 0.45); else { const q = (ph - 0.45) / 0.55; r = 0.15; y = ny + (top - ny) * q * q * 1.2; x += Math.sin(q * 9 + i) * 0.12; }
    const vis = on && y < top - 0.05; _o.position.set(x, vis ? y : -1000, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(vis ? r * (o.scale ?? 1) : 0.0001); _o.updateMatrix(); BB.setMatrixAt(i, _o.matrix); }
  BB.instanceMatrix.needsUpdate = true;
}
// ---------------------------------------------------------------- el cazo al fuego: la cocina eléctrica y el cazo esmaltado son modelos reales escaneados de Poly Haven (CC0);
// la placa grande se pone al rojo, el cazo se ve en corte con el agua y las burbujas que nacen en las rayitas del fondo y suben.
// Unidades: cm. La cocina va lejos del microondas (STOVE_POS), con su encimera a la altura de la del microondas (y ≈ 0).
const STOVE_POS = new THREE.Vector3(78, -88.1, -18), POT_L = v3(-11.5, 87.4, 12.5), POT_R = 8.75, POT_WY = 8.6;
async function loadGLTF(path) { const g = await new GLTFLoader().loadAsync(ASSET + path); g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g.scene; }
function scratchTex() {        // fondo del cazo: esmalte con rayitas (las 900 grandes son donde nacen las burbujas) y otras muy finas; 2048 px para los planos de cerca
  const t = canvasTex(2048, 2048, (g, w, h) => { g.fillStyle = '#b4b9bd'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${hash(i * 9.1) > 0.5 ? '90,92,96' : '245,247,250'},${0.04 + hash(i * 3.3) * 0.06})`; g.beginPath(); g.arc(hash(i * 1.1) * w, hash(i * 2.9) * h, 2 + hash(i * 4.7) * 14, 0, 7); g.fill(); }
    for (let i = 0; i < 5000; i++) { const x = hash(i * 0.71 + 3) * w, y = hash(i * 1.37 + 5) * h, a = hash(i * 2.11 + 7) * 6.28, l = 8 + hash(i * 3.3 + 1) * 90; g.strokeStyle = `rgba(${hash(i * 5.5) > 0.5 ? '80,82,86' : '255,255,255'},${0.08 + hash(i * 6.1) * 0.18})`; g.lineWidth = 0.5 + hash(i * 7.3) * 0.8;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 900; i++) { const x = hash(i * 1.7) * w, y = hash(i * 2.3) * h, a = hash(i * 3.9) * 6.28, l = (6 + hash(i * 5.1) * 60) * 2; g.strokeStyle = `rgba(${hash(i * 7.7) > 0.35 ? '38,40,44' : '255,255,255'},${0.5 + hash(i * 4.4) * 0.45})`; g.lineWidth = (0.7 + hash(i * 6.6) * 1.3) * 2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } });
  t.colorSpace = THREE.SRGBColorSpace; return t;
}
async function buildStove() {
  const G = new THREE.Group(), U = {}; G.position.copy(STOVE_POS); scene.add(G);
  const st = await loadGLTF('ph/electric_stove/electric_stove_1k.gltf'); st.scale.setScalar(100); G.add(st); U.stove = st;
  const potG = new THREE.Group(); potG.position.copy(POT_L); G.add(potG); U.potG = potG;
  const pot = await loadGLTF('ph/pot_enamel_01/pot_enamel_01_1k.gltf'); pot.scale.setScalar(100); potG.add(pot); U.pot = pot;
  pot.traverse(o => { if (o.name && o.name.includes('lid')) o.visible = false; if (o.isMesh) { o.material = o.material.clone(); o.material.side = THREE.DoubleSide; U.potMats = (U.potMats || []).concat(o.material); } });
  // la placa al rojo (encima de la placa de hierro, debajo del cazo)
  const glowT = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,90,30,.0)'); gr.addColorStop(0.35, 'rgba(255,80,20,.85)');
    gr.addColorStop(0.8, 'rgba(200,40,10,.7)'); gr.addColorStop(1, 'rgba(120,20,5,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let r = 0.2; r < 0.48; r += 0.045) { g.strokeStyle = 'rgba(255,170,90,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h / 2, r * w, 0, 7); g.stroke(); } });
  const glow = new THREE.Mesh(new THREE.CircleGeometry(9.2, 64), new THREE.MeshBasicMaterial({ map: glowT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.set(POT_L.x, POT_L.y - 0.55, POT_L.z); G.add(glow); U.glow = glow;
  // agua del cazo: cuerpo (se ve en corte), cara del corte y superficie
  const wm = new THREE.MeshPhysicalMaterial({ color: 0x7aa3ae, roughness: 0.05, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const wb = new THREE.Mesh(new THREE.CylinderGeometry(POT_R - 0.15, POT_R - 0.35, POT_WY - 0.5, 64, 1, true), wm); wb.position.y = (POT_WY + 0.5) / 2; wb.renderOrder = 6; potG.add(wb); U.wb = wb;
  const cutT = canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(170,205,215,.35)'); gr.addColorStop(1, 'rgba(60,110,130,.55)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const cf = new THREE.Mesh(new THREE.PlaneGeometry(2 * (POT_R - 0.2), POT_WY - 0.5), new THREE.MeshPhysicalMaterial({ map: cutT, roughness: 0.04, clearcoat: 1, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  cf.position.set(0, (POT_WY + 0.5) / 2, 0); cf.renderOrder = 7; potG.add(cf); U.cutFace = cf;
  const sf = new THREE.Mesh(new THREE.CircleGeometry(POT_R - 0.15, 64), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.02, clearcoat: 1, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 2 }));
  sf.rotation.x = -Math.PI / 2; sf.position.y = POT_WY; sf.renderOrder = 7; potG.add(sf); U.surf = sf;
  // fondo con rayitas (dentro del cazo)
  const scT = scratchTex(); const bt = new THREE.Mesh(new THREE.CircleGeometry(POT_R - 0.3, 64), new THREE.MeshPhysicalMaterial({ map: scT, bumpMap: scT, bumpScale: -0.03, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 })); bt.rotation.x = -Math.PI / 2; bt.position.y = 0.55; potG.add(bt); U.bottom = bt;
  // burbujas: nacen en el fondo (mitad de atrás, la que se ve en corte), crecen, se sueltan y suben
  const BB = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), bubbleMat(0.85), 700); BB.frustumCulled = false; BB.renderOrder = 8;
  _o.scale.setScalar(0.0001); _o.position.set(0, -1000, 0); _o.updateMatrix(); for (let i = 0; i < 700; i++) BB.setMatrixAt(i, _o.matrix); potG.add(BB); U.bub = BB;
  // el plano de corte (en coordenadas del mundo): quita la mitad de delante del cazo y del agua
  U.cutP = [new THREE.Plane(new THREE.Vector3(0, 0, -1), STOVE_POS.z + POT_L.z)];
  G.userData = U; return G;
}
// estado: heat (placa al rojo), cut (corte), boil (burbujas: 0..1), t
function stoveAt(SV, t, o) {
  const U = SV.userData, cut = (o.cut ?? 0) > 0.5, heat = o.heat ?? 0, boil = o.boil ?? 0;
  U.glow.material.opacity = heat * (0.85 + 0.1 * Math.sin(t * 7)); U.glow.visible = heat > 0.01;
  if (U._cut !== cut) { U._cut = cut; const cp = cut ? U.cutP : null; for (const m of U.potMats) { m.clippingPlanes = cp; m.needsUpdate = true; } for (const m of [U.wb.material, U.surf.material, U.bottom.material]) { m.clippingPlanes = cp; m.needsUpdate = true; } U.cutFace.visible = cut; }
  U.wb.visible = cut;
  const R2 = POT_R - 0.3, NBB = U.bub.count;
  for (let i = 0; i < NBB; i++) { const h = q => hash(i * 4.71 + q * 1.37), j = Math.floor(h(9) * 900), f = h(8);       // la rayita j de la textura del fondo
    const px = hash(j * 1.7) * 1024 + Math.cos(hash(j * 3.9) * 6.28) * (6 + hash(j * 5.1) * 60) * f, py = hash(j * 2.3) * 1024 + Math.sin(hash(j * 3.9) * 6.28) * (6 + hash(j * 5.1) * 60) * f;
    const x0 = (px / 1024 * 2 - 1) * R2, z0 = (py / 1024 * 2 - 1) * R2; if (Math.hypot(x0, z0) > R2 - 0.4 || (cut && z0 > -0.15)) { _o.position.set(0, -1000, 0); _o.scale.setScalar(0.0001); _o.updateMatrix(); U.bub.setMatrixAt(i, _o.matrix); continue; }
    const per = 0.8 + 1.4 * h(1), ph = ((t / per + h(2)) % 1 + 1) % 1, rmax = 0.03 + 0.09 * Math.pow(h(3), 1.5);
    let x = x0, y = 0.56, z = z0, s;
    if (ph < 0.55) { s = rmax * Math.pow(ph / 0.55, 0.6); y = 0.56 + s * 0.8; }                                  // crece pegada a la rayita
    else { const q = (ph - 0.55) / 0.45; s = rmax * (1 + 0.3 * q); y = 0.56 + rmax + (POT_WY - 0.6) * q * q * 1.15; x += Math.sin(q * 8 + i) * 0.12 * q; }   // se suelta y sube
    const vis = h(4) < boil && y < POT_WY - 0.1; _o.position.set(x, vis ? y : -1000, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(vis ? s : 0.0001); _o.updateMatrix(); U.bub.setMatrixAt(i, _o.matrix); }
  U.bub.instanceMatrix.needsUpdate = true;
}
// ================================================================ EL MAGNETRÓN de un microondas de casa (tipo 2M246 / 2M261), de verdad
// Para «Cuidado cuando calientes agua en el microondas»: «Tu microondas lleva dentro un magnetrón…» (sale flotando en vista explosionada) y
// «Dispara ondas que vibran 2.450 millones de veces por segundo» (en corte: el cátodo al rojo en el centro, los electrones girando en espiral
// entre el cátodo y el ánodo de cobre con sus 10 cavidades, y los frentes de onda que salen por la antena).
//
// buildMagnetron(o) → MAG. MAG.group en cm, con el origen en el centro del ánodo; el eje del tubo es y (la antena hacia +y); las aletas salen
//   por ±z; la caja del filamento va abajo, con el condensador pasante y los dos terminales hacia +x. MAG.antennaTip: punta de la antena
//   (coordenadas del grupo; se mueve con la vista explosionada). o.guide = true añade la guía de ondas (un conducto de chapa sobre la brida,
//   o.guideLen cm de largo hacia +y, abierto por el final: ahí va la mica del horno).
// magnetronAt(t, P) con P = { explode, cut, glow, electrons, wave } (0..1) y, opcionales, { guide (0/1: ver la guía), cutYaw, cutHalf (rad:
//   hacia dónde mira y cuánto abre la cuña del corte; por defecto, el cuarto entre +x y +z), cutTop (cm: si se da, dentro de la cuña solo se
//   quita lo que queda por encima de esa altura: con cutHalf = π/2 y cutTop = 0 se ve el ánodo desde arriba, con las paletas cortadas) }.
// buildMagWaves() → MAGW (MAGW.group en coordenadas del microondas: llena la cavidad) y magWavesAt(t, P) con P = { on, flow } (0..1).
// Todo lo global empieza por mag / MAG (los archivos se concatenan en un solo módulo).

// ---------------------------------------------------------------- medidas (cm)
const MAGD = {
  an: { ri: 1.72, ro: 2.0, h: 1.3 },                         // ánodo de cobre: radio interior y exterior, media altura
  vn: { n: 10, ri: 0.6, ro: 1.74, t: 0.2, h: 0.5 },          // paletas (cavidades resonantes): radio de la punta y del pie, grosor, media altura
  ct: { r: 0.2, w: 0.032, h: 0.42, turns: 8 },               // cátodo: filamento en espiral (radio, hilo, media altura, vueltas)
  pl: { y0: 2.7, t: 0.18, x: 4.45, z: 3.7 },                 // chapa de arriba = brida de montaje (de y0 a y0 + t)
  yk: { x: 3.9, z: 3.7, t: 0.18 },                           // yugo en U (abajo y los dos lados en ±x)
  mg: { ri: 1.12, ro: 2.75, y0: 1.52, y1: 2.66 },            // imanes de ferrita en anillo (el de abajo es simétrico)
  fn: { n: 7, x: 3.6, z: 4.88, t: 0.06, dy: 0.36 },          // aletas de aluminio
  fb: { x: 2.3, z: 2.2, y0: -5.25, y1: -2.893, w: 0.08 },     // caja del filamento (chapa de 0,8 mm)
  tip: 5.76,                                                 // punta del capuchón de la antena
};
let MAG = null, MAGW = null, MAGT = null;
const magTmpN3 = new THREE.Matrix3(), magTmpV = new THREE.Vector3(), magTmpM4 = new THREE.Matrix4(), magDown = new THREE.Vector3(0, -1, 0);
const magSst = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const magS5 = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };

// ---------------------------------------------------------------- ruido y texturas procedurales (todas se repiten sin costuras)
function magVN(x, y, px, py, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const H = (i, j) => hash((((i % px) + px) % px) * 3.17 + (((j % py) + py) % py) * 41.73 + s * 113.9);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), a = H(xi, yi), b = H(xi + 1, yi), c = H(xi, yi + 1), d = H(xi + 1, yi + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function magFbm(x, y, px, py, oct, s) { let v = 0, a = 0.5, n = 0, f = 1; for (let o = 0; o < oct; o++) { v += a * magVN(x * f, y * f, px * f, py * f, s + o * 7); n += a; a *= 0.5; f *= 2; } return v / n; }
// dos texturas a la vez: color (sRGB) y datos (r = oclusión, g = rugosidad, b = metal), con un pincel opcional encima (rayas, huellas)
function magImg2(w, h, fn, post) {
  const A = canvasTex(w, h), B = canvasTex(w, h), ga = A.userData.g, gb = B.userData.g;
  const ia = ga.createImageData(w, h), ib = gb.createImageData(w, h), a = ia.data, b = ib.data, c = [0, 0, 0], d = [255, 128, 255];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { d[0] = 255; d[1] = 128; d[2] = 255; fn(i / w, j / h, c, d); const k = (j * w + i) * 4;
    a[k] = c[0]; a[k + 1] = c[1]; a[k + 2] = c[2]; a[k + 3] = 255; b[k] = d[0]; b[k + 1] = d[1]; b[k + 2] = d[2]; b[k + 3] = 255; }
  ga.putImageData(ia, 0, 0); gb.putImageData(ib, 0, 0); if (post) post(ga, gb, w, h);
  B.colorSpace = THREE.NoColorSpace; for (const t of [A, B]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; }
  return [A, B];
}
function magPal(stops, x, c) { let i = 0; while (i < stops.length - 2 && x > stops[i + 1][0]) i++; const [x0, c0] = stops[i], [x1, c1] = stops[i + 1], k = magSst(x0, x1, x); for (let q = 0; q < 3; q++) c[q] = c0[q] + (c1[q] - c0[q]) * k; }
// rayas finas (brillan y son menos rugosas) y huellas de dedos (más rugosas)
function magWear(ga, gb, w, h, n, seed, colS, huellas = 0) {
  for (let i = 0; i < n; i++) { const x = hash(i * 3.1 + seed) * w, y = hash(i * 5.7 + seed) * h, an = hash(i * 7.9 + seed) * Math.PI, L = 8 + hash(i * 9.3 + seed) * 70, cx = Math.cos(an) * L, cy = Math.sin(an) * L;
    for (const [ox, oy] of [[0, 0], [-w, 0], [w, 0], [0, -h], [0, h]]) {
      gb.strokeStyle = 'rgba(255,40,255,0.45)'; gb.lineWidth = 0.7; gb.beginPath(); gb.moveTo(x + ox, y + oy); gb.lineTo(x + ox + cx, y + oy + cy); gb.stroke();
      ga.strokeStyle = colS; ga.lineWidth = 0.7; ga.beginPath(); ga.moveTo(x + ox, y + oy); ga.lineTo(x + ox + cx, y + oy + cy); ga.stroke(); } }
  for (let i = 0; i < huellas; i++) { const x = hash(i * 13.1 + seed) * w, y = hash(i * 17.3 + seed) * h, r = 10 + hash(i * 19.7) * 16;
    for (let k = 0; k < 7; k++) { gb.strokeStyle = 'rgba(255,215,255,0.18)'; gb.lineWidth = 1.6; gb.beginPath(); gb.ellipse(x, y, r - k * 2.2, (r - k * 2.2) * 0.72, hash(i) * 3, 0, 6.3); gb.stroke(); } }
}
function magTextures() {
  if (MAGT) return MAGT; const T = {};
  // acero cincado con pasivado amarillo (bicromatado): dorado con manchas verdosas, cobrizas y violáceas; donde la película es fina, el cinc
  const ZN = [[0.0, [192, 146, 90]], [0.25, [206, 172, 102]], [0.48, [214, 190, 116]], [0.66, [200, 188, 110]], [0.82, [182, 178, 112]], [1.0, [178, 164, 146]]];
  [T.znC, T.znD] = magImg2(512, 512, (u, v, c, d) => {
    const n = magFbm(u * 2, v * 3, 2, 3, 4, 1), m = magFbm(u * 7, v * 2, 7, 2, 3, 2), f = hash(u * 913.1 + v * 7123.7);
    magPal(ZN, n * 0.9 + (m - 0.5) * 0.35 + 0.05, c);
    const z = magSst(0.68, 0.85, m) * 0.3; c[0] += (200 - c[0]) * z; c[1] += (200 - c[1]) * z; c[2] += (194 - c[2]) * z;     // cinc a la vista
    const g = 1 + (f - 0.5) * 0.05; c[0] *= g; c[1] *= g; c[2] *= g;
    d[1] = 255 * (0.26 + 0.12 * m + 0.04 * f);
  }, (ga, gb, w, h) => magWear(ga, gb, w, h, 70, 1, 'rgba(236,226,190,0.3)', 3));
  // espesor de la película de cromato (iridiscencia: amarillo → cobrizo → morado → azul verdoso, según el grosor)
  T.znI = magImg2(256, 256, (u, v, c, d) => { d[1] = 255 * clamp(magFbm(u * 2, v * 3, 2, 3, 4, 7) * 1.3 - 0.15); })[1];
  // cobre: brillante con pátina y manchas de óxido; marcas del torno alrededor
  const CU = [[0.0, [238, 152, 108]], [0.4, [228, 138, 96]], [0.6, [194, 108, 72]], [0.8, [136, 76, 52]], [1.0, [100, 60, 46]]];
  [T.cuC, T.cuD] = magImg2(512, 512, (u, v, c, d) => {
    const n = magFbm(u * 4, v * 4, 4, 4, 5, 11), l = magFbm(u * 2, v * 90, 2, 90, 2, 12), f = hash(u * 517.3 + v * 9131.1);
    const ox = magSst(0.55, 0.8, n);
    magPal(CU, ox * 0.85 + (n - 0.5) * 0.25 + 0.12, c);
    const k = 0.95 + (l - 0.5) * 0.14 + (f - 0.5) * 0.04; c[0] *= k; c[1] *= k; c[2] *= k;
    d[1] = 255 * (0.2 + 0.3 * ox + 0.08 * l); d[2] = 255 * (1 - 0.3 * ox);
  }, (ga, gb, w, h) => magWear(ga, gb, w, h, 40, 5, 'rgba(255,200,170,0.3)'));
  // cobre mecanizado (las paletas por dentro): limpio, con las marcas de la fresa
  [T.cmC, T.cmD] = magImg2(256, 256, (u, v, c, d) => {
    const l = magFbm(u * 2, v * 60, 2, 60, 2, 61), n = magFbm(u * 4, v * 4, 4, 4, 3, 62);
    const k = 0.96 + (l - 0.5) * 0.12; c[0] = 240 * k; c[1] = (156 - n * 14) * k; c[2] = (112 - n * 12) * k;
    d[1] = 255 * (0.17 + 0.1 * l + 0.08 * n);
  });
  // aluminio cepillado (aletas): vetas a lo largo de u, algo de polvo
  [T.alC, T.alD] = magImg2(512, 512, (u, v, c, d) => {
    const s = magFbm(u * 2, v * 160, 2, 160, 3, 21), n = magFbm(u * 5, v * 5, 5, 5, 4, 22), f = hash(u * 7919.1 + v * 113.3);
    const dirt = magSst(0.6, 0.82, n), b = 214 + (s - 0.5) * 26 + (f - 0.5) * 6 - dirt * 30;
    c[0] = b; c[1] = b + 1; c[2] = b + 3 - dirt * 5;
    d[1] = 255 * (0.54 + (s - 0.5) * 0.16 + dirt * 0.2);
  });
  // ferrita: gris muy oscuro, mate, de grano fino con algún cristalito que brilla
  [T.feC, T.feD] = magImg2(256, 256, (u, v, c, d) => {
    const f = hash(u * 3917.1 + v * 77.7), g = hash(u * 131.7 + v * 5711.3), n = magFbm(u * 6, v * 6, 6, 6, 3, 31);
    let b = 66 + (f - 0.5) * 26 + (n - 0.5) * 14, r = 0.72 + (g - 0.5) * 0.16;
    if (f > 0.986) { b += 38; r = 0.42; }
    c[0] = b; c[1] = b; c[2] = b + 2; d[1] = 255 * r; d[2] = 0;
  });
  // cerámica de alúmina (aislante de la antena y del pie del cátodo): blanco roto, motitas
  [T.ceC] = magImg2(256, 256, (u, v, c, d) => { const n = magFbm(u * 4, v * 4, 4, 4, 3, 41), f = hash(u * 2711.3 + v * 91.7); let b = 230 + (n - 0.5) * 10; if (f > 0.994) b -= 55; c[0] = b + 2; c[1] = b; c[2] = b - 9; });
  // hierro niquelado (piezas polares) / acero inoxidable (capuchón)
  [T.stC, T.stD] = magImg2(256, 256, (u, v, c, d) => {
    const n = magFbm(u * 4, v * 4, 4, 4, 4, 51), l = magFbm(u * 2, v * 70, 2, 70, 2, 52), b = 184 + (n - 0.5) * 22 + (l - 0.5) * 12;
    c[0] = b; c[1] = b; c[2] = b - 4; d[1] = 255 * (0.24 + 0.14 * n);
  }, (ga, gb, w, h) => magWear(ga, gb, w, h, 25, 9, 'rgba(240,240,236,0.3)'));
  // oclusión de las aletas (vista en planta: abiertas por los extremos en z, tapadas por el yugo en x y oscuras junto al ánodo)
  T.finAO = magImg2(256, 256, (u, v, c, d) => { const x = (u - 0.5) * 7.2, z = (v - 0.5) * 9.88, e = 4.94 - Math.abs(z), r = Math.hypot(x, z);
    let ao = 1 - 0.68 * magSst(0.0, 2.3, e); ao *= 1 - 0.3 * (1 - magSst(2.0, 2.9, r)); ao *= 1 - 0.18 * magSst(3.0, 3.6, Math.abs(x)); d[0] = 255 * ao; })[1];
  // malla de punto de acero inoxidable (la junta de la antena): bucles al tresbolillo
  [T.knC, T.knD] = magImg2(128, 128, (u, v, c, d) => {
    const x = u * 4, y = v * 4, row = Math.floor(y), off = (row % 2) * 0.5, fx = x + off - Math.floor(x + off) - 0.5, fy = y - row - 0.5;
    const lp = Math.abs(Math.hypot(fx * 1.1, fy * 0.8) - 0.3), k = Math.exp(-lp * lp * 70), b = 60 + 160 * k;
    c[0] = b; c[1] = b; c[2] = b + 4; d[1] = 255 * (0.55 - 0.3 * k);
  });
  // etiqueta de papel plateado (sin marcas: solo los datos de la pieza)
  T.label = canvasTex(512, 300, (g, w, h) => {
    g.fillStyle = '#dcdad2'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(90,80,60,${0.03 + hash(i) * 0.05})`; g.fillRect(hash(i * 3.3) * w, hash(i * 5.1) * h, 2, 2); }
    g.fillStyle = '#1c1c1c'; g.font = '700 46px sans-serif'; g.fillText('MAGNETRÓN', 28, 66); g.font = '500 30px sans-serif';
    g.fillText('2450 MHz   ·   900 W', 28, 118); g.fillText('F: 3,3 V ~   Ea: 4,0 kV', 28, 160); g.fillText('Nº 61-0412-B', 28, 202);
    for (let i = 0; i < 46; i++) { const ww = 1 + (hash(i * 7.7) * 4 | 0); g.fillRect(300 + i * 4.4, 176, ww, 90); }
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 3; g.strokeRect(10, 10, w - 20, h - 20);
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(60,45,20,.0)'); gr.addColorStop(1, 'rgba(60,45,20,.22)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  MAGT = T; return T;
}

// ---------------------------------------------------------------- materiales. Los que se cortan llevan la «tapa del corte»: con el corte activo se
// dibujan por las dos caras y, donde se ve la cara de atrás a través del corte, se pinta como la cara plana del corte (normal del plano, metal
// vivo del color de la pieza). Así las piezas parecen macizas al cortarlas sin tener que construir las tapas.
function magCutPatch(m, capHex, capR, capM, glow = false) {
  const U = { magCapC: { value: new THREE.Color(capHex) }, magCapRM: { value: new THREE.Vector2(capR, capM) }, magW2L: { value: new THREE.Matrix4() }, magGlow: { value: new THREE.Color(0, 0, 0) } }; m.userData.magU = U;
  if (glow) m.defines = { MAG_GLOW: '' };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    // (con MAG_GLOW) la luz del filamento al rojo, sin luz puntual: emisivo en las caras que miran al cátodo, que cae con la distancia al eje
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n#ifdef MAG_GLOW\nvarying vec3 vMagL; varying vec3 vMagN;\n#endif')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef MAG_GLOW\nvMagL = transformed; vMagN = objectNormal;\n#endif');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n#ifdef MAG_GLOW\nvarying vec3 vMagL; varying vec3 vMagN; uniform vec3 magGlow;\n#endif')
      .replace('#include <clipping_planes_pars_fragment>', '#include <clipping_planes_pars_fragment>\nuniform vec3 magCapC; uniform vec2 magCapRM; uniform mat4 magW2L;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float magK = 0.0, magPat = 1.0, magG = 0.5; vec3 magN = vec3(0.0, 0.0, 1.0);
        #if NUM_CLIPPING_PLANES > 0
        if (!gl_FrontFacing) {
          // el rayo de la cámara a este punto: ¿salió de la zona quitada por uno de los planos antes de llegar aquí? → es la tapa de ese plano
          vec3 Pv = -vClipPosition; float sx = 1.0, se = 0.0;
          for (int i = 0; i < NUM_CLIPPING_PLANES; i++) { vec4 pl = clippingPlanes[i]; float nd = dot(pl.xyz, Pv); float s = -pl.w / (abs(nd) > 1e-6 ? nd : 1e-6);
            if (nd > 0.0) { if (s < sx) { sx = s; magN = -pl.xyz; } } else { se = max(se, s); } }
          if (sx < 0.9999 && sx > se) magK = 1.0; else discard;
          // marcas de la fresa en la cara del corte (en el marco de la pieza, para que no «naden» si se mueve)
          vec3 magLP = (magW2L * vec4(transpose(mat3(viewMatrix)) * (Pv * sx - viewMatrix[3].xyz), 1.0)).xyz;
          magG = 0.5 + 0.5 * sin(dot(magLP, vec3(31.0, 160.0, 27.0)) + 2.5 * sin(dot(magLP, vec3(6.0, 2.0, 5.0))));
          magPat = 0.92 + 0.06 * magG + 0.04 * fract(sin(dot(floor(magLP * 80.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        }
        #endif`)
      .replace('#include <color_fragment>', '#include <color_fragment>\nif (magK > 0.5) diffuseColor.rgb = magCapC * magPat;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nif (magK > 0.5) { roughnessFactor = magCapRM.x * (0.8 + 0.4 * magG); metalnessFactor = magCapRM.y; }')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (magK > 0.5) { normal = magN; nonPerturbedNormal = magN; }')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (magK > 0.5) totalEmissiveRadiance = vec3(0.0);
        #ifdef MAG_GLOW
        else { float r = length(vMagL.xz); vec3 rd = vec3(vMagL.x, 0.0, vMagL.z) / max(r, 1e-3);
          float face = max(0.0, -dot(normalize(vMagN), rd)) * 0.85 + 0.15, k = max(r - 0.2, 0.0) / 0.3;
          totalEmissiveRadiance += magGlow * face / (1.0 + k * k) * (1.0 - smoothstep(0.4, 0.95, abs(vMagL.y))); }
        #endif`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        #ifdef USE_CLEARCOAT
        if (magK > 0.5) material.clearcoat = 0.0;
        #endif
        #ifdef USE_IRIDESCENCE
        if (magK > 0.5) material.iridescence = 0.0;
        #endif`);
  };
  m.customProgramCacheKey = () => glow ? 'magcut1g' : 'magcut1';
  return m;
}
// tipos de material: [fábrica, color de la tapa del corte, su rugosidad, su metal]
function magKinds(T) {
  const P = o => new THREE.MeshPhysicalMaterial(o), S = o => new THREE.MeshStandardMaterial(o);
  return {
    zn: [() => P({ map: T.znC, roughnessMap: T.znD, metalnessMap: T.znD, roughness: 1, metalness: 1, iridescence: 0.32, iridescenceIOR: 1.55, iridescenceThicknessMap: T.znI, iridescenceThicknessRange: [190, 380] }), 0xc8c8c2, 0.3, 1],
    cu: [() => S({ map: T.cuC, roughnessMap: T.cuD, metalnessMap: T.cuD, roughness: 1, metalness: 1 }), 0xf0a27e, 0.24, 1],
    cuIn: [() => S({ map: T.cmC, roughnessMap: T.cmD, roughness: 1, metalness: 1, vertexColors: true }), 0xf0a27e, 0.22, 1],
    fe: [() => S({ map: T.stC, roughnessMap: T.stD, roughness: 1.1, metalness: 1, color: 0xd8d8d4 }), 0xcfcfca, 0.3, 1],
    ferr: [() => S({ map: T.feC, roughnessMap: T.feD, roughness: 1, metalness: 0, bumpMap: T.feC, bumpScale: 0.9 }), 0x58585c, 0.6, 0],
    al: [() => P({ map: T.alC, roughnessMap: T.alD, aoMap: T.finAO, aoMapIntensity: 1, roughness: 1, metalness: 1, anisotropy: 0.25, color: 0xdcdcdc, envMapIntensity: 0.75 }), 0xdedfe2, 0.25, 1],
    cer: [() => P({ map: T.ceC, roughness: 0.42, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.3 }), 0xf2efe8, 0.65, 0],
    cap: [() => S({ map: T.stC, roughnessMap: T.stD, roughness: 0.7, metalness: 1, color: 0xf4f4f2 }), 0xd8d8d4, 0.25, 1],
    kov: [() => S({ color: 0x9c968e, roughness: 0.36, metalness: 1 }), 0xb0aaa2, 0.3, 1],
    knit: [() => S({ map: T.knC, roughnessMap: T.knD, bumpMap: T.knC, bumpScale: 1.2, roughness: 1, metalness: 1, color: 0xe8e8e8 }), 0xbcbcbc, 0.4, 1],
    tin: [() => S({ color: 0xdcd8cc, roughness: 0.2, metalness: 1 }), 0xdedad0, 0.2, 1],
    capC: [() => P({ color: 0x7a4a2c, roughness: 0.45, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2 }), 0x8a5a38, 0.6, 0],
    wire: [() => P({ color: 0xa8582a, roughness: 0.32, metalness: 0.75, clearcoat: 1, clearcoatRoughness: 0.12 }), 0xd08a60, 0.3, 1],
    rod: [() => S({ color: 0x3a3a3e, roughness: 0.7, metalness: 0 }), 0x4a4a4e, 0.6, 0],
    label: [() => S({ map: T.label, roughness: 0.55, metalness: 0.15 }), 0xd0d0cc, 0.5, 0],
  };
}

// ---------------------------------------------------------------- geometría
// perfil de torno (polígono cerrado en (r, y), en sentido antihorario = caras hacia fuera) con un chaflán fino en cada esquina: aristas vivas con su brillo
function magProf(poly, b = 0.02) {
  const P = poly.map(([r, y]) => new THREE.Vector2(r, y)), n = P.length, out = [], mid = P[0].clone().add(P[1]).multiplyScalar(0.5); out.push(mid);
  for (let k = 1; k <= n; k++) { const c = P[k % n], p = P[k - 1], q = P[(k + 1) % n], bb = Math.min(b, c.distanceTo(p) * 0.4, c.distanceTo(q) * 0.4);
    if (bb < 1e-4) { out.push(c.clone()); continue; }
    out.push(c.clone().add(p.clone().sub(c).normalize().multiplyScalar(bb)), c.clone().add(q.clone().sub(c).normalize().multiplyScalar(bb))); }
  out.push(mid.clone()); return out;
}
// torno con uv a escala real (s = repeticiones de la textura por cm; número entero de repeticiones alrededor para que no haya costura)
function magLatheGeo(poly, { b = 0.02, seg = 64, s = 0.3, ao = null } = {}) {
  const pts = magProf(poly, b), g = new THREE.LatheGeometry(pts, seg), np = pts.length, L = [0];
  for (let i = 1; i < np; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const uv = g.attributes.uv; for (let i = 0; i <= seg; i++) for (let j = 0; j < np; j++) { const tiles = Math.max(1, Math.round(2 * Math.PI * pts[j].x * s)); uv.setXY(i * np + j, (i / seg) * tiles, L[j] * s); }
  if (ao) { const P = g.attributes.position, N = g.attributes.normal, col = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { const k = ao(Math.hypot(P.getX(i), P.getZ(i)), P.getY(i), (P.getX(i) * N.getX(i) + P.getZ(i) * N.getZ(i)) / Math.max(1e-4, Math.hypot(P.getX(i), P.getZ(i)))); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  return g;
}
// uv planas a escala real según hacia dónde mira cada cara (cajas y extrusiones)
function magBoxUV(g, s) { const P = g.attributes.position, N = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < P.count; i++) { const ax = Math.abs(N.getX(i)), ay = Math.abs(N.getY(i)), az = Math.abs(N.getZ(i)), x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (ax >= ay && ax >= az) uv.setXY(i, z * s, y * s); else if (ay >= az) uv.setXY(i, x * s, z * s); else uv.setXY(i, x * s, y * s); }
  return g; }
function magMesh(g, m, cast = true) { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; }
function magMerge(list) { return mergeGeometries(list.map(g => g.index ? g.toNonIndexed() : g), false); }
// forma en planta (x, z) extruida hacia +y entre y0 e y0 + t (chapas): el plano de la forma pasa a ser el horizontal
function magPlate(shape, y0, t, bev = 0.02, cs = 24) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: t - 2 * bev, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: cs });
  g.translate(0, 0, bev); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g;      // (x, y, z) → (x, z, −y): la profundidad pasa a ser la altura
}
function magRect(x0, y0, x1, y1, r = 0, sh = new THREE.Shape()) {
  if (r <= 0) { sh.moveTo(x0, y0); sh.lineTo(x1, y0); sh.lineTo(x1, y1); sh.lineTo(x0, y1); sh.closePath(); return sh; }
  sh.moveTo(x0 + r, y0); sh.lineTo(x1 - r, y0); sh.quadraticCurveTo(x1, y0, x1, y0 + r); sh.lineTo(x1, y1 - r); sh.quadraticCurveTo(x1, y1, x1 - r, y1);
  sh.lineTo(x0 + r, y1); sh.quadraticCurveTo(x0, y1, x0, y1 - r); sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0); return sh;
}
function magHole(sh, x, y, r) { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); sh.holes.push(p); return sh; }
// hélice (filamento del cátodo, bobinas de choque) a lo largo de y o de x
class MAGHelix extends THREE.Curve {
  constructor(r, len, turns, axis = 'y') { super(); this.r = r; this.len = len; this.turns = turns; this.axis = axis; }
  getPoint(t, out = new THREE.Vector3()) { const a = t * this.turns * Math.PI * 2, c = this.r * Math.cos(a), s = this.r * Math.sin(a), l = (t - 0.5) * this.len; return this.axis === 'y' ? out.set(c, l, s) : out.set(l, c, s); }
}

// ---------------------------------------------------------------- la nube de electrones: cada electrón sale del cátodo y va hacia las paletas
// en espiral, dentro de uno de los 5 «radios» que giran (el modo π de un ánodo de 10 cavidades), con pequeños bucles de cicloide; una parte se
// queda girando pegada al cátodo. Cada electrón es una cinta (estela) de NS tramos calculada en el sombreador (su posición ahora y antes).
const MAG_EL_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 seed; attribute vec3 cs;
uniform float time, power, rc, ra, hh, om, dts, nseg, sz; uniform vec2 res;
varying float vA; varying float vT;
vec3 ePos(float T, vec4 s, out float a) {
  float life = mix(0.55, 1.05, s.x), q = T / life + s.y * 17.0; a = fract(q); float cyc = floor(q);
  float h1 = fract(sin(cyc * 12.9898 + s.z * 78.233) * 43758.5453), h2 = fract(sin(cyc * 4.1414 + s.w * 31.71) * 24634.6345);
  float r, th, y;
  if (s.x < 0.12) { r = rc + 0.03 + 0.1 * h1 * h1; th = om * 2.4 * T + s.z * 6.2832 + s.w * 40.0; y = (h2 - 0.5) * 2.0 * hh; }
  else { float sp = floor(s.w * 5.0), ar = pow(a, 0.8);
    r = mix(rc + 0.03, ra + 0.01, ar);
    th = om * T + sp * 1.256637 + (h1 - 0.5) * 0.42 * (1.0 - 0.4 * ar) - 1.35 * ar;
    float ph = a * 6.2832 * 3.0; r += 0.03 * (1.0 - cos(ph)) * (1.0 - ar); th += 0.1 * sin(ph);
    y = (h2 - 0.5) * 2.0 * hh; }
  return vec3(r * cos(th), y, r * sin(th));
}
void main(){
  float aA, aB; vec3 A = ePos(time - cs.z * dts, seed, aA), B = ePos(time - (cs.z + 1.0) * dts, seed, aB);
  mat4 PM = projectionMatrix * modelViewMatrix; vec4 ca = PM * vec4(A, 1.0), cb = PM * vec4(B, 1.0);
  vec2 pa = ca.xy / ca.w * res * 0.5, pb = cb.xy / cb.w * res * 0.5, d = pb - pa; float L = length(d);
  vec2 dir = L > 0.001 ? d / L : vec2(1.0, 0.0), nr = vec2(-dir.y, dir.x);
  float px = sz * projectionMatrix[1][1] * res.y * 0.5 / max(ca.w, 0.001);
  float w = clamp(px, 1.3, 4.5) * (1.0 - 0.6 * (cs.z + cs.x) / nseg);
  vec4 c = cs.x < 0.5 ? ca : cb; vec2 p = cs.x < 0.5 ? pa - dir * w * step(cs.z, 0.5) : pb;
  p += nr * cs.y * w;
  gl_Position = vec4(p / (res * 0.5) * c.w, c.z, c.w);
  #include <logdepthbuf_vertex>
  float lf = smoothstep(0.0, 0.06, aA) * (1.0 - smoothstep(0.85, 1.0, aA));
  vA = (aB > aA || ca.w < 0.01 || power < 0.002) ? 0.0 : power * pow(1.0 - (cs.z + cs.x) / nseg, 1.4) * lf;
  vT = cs.y;
}`;
const MAG_EL_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
varying float vA; varying float vT;
void main(){
  #include <logdepthbuf_fragment>
  if (vA < 0.002) discard;
  float k = exp(-vT * vT * 3.2);
  vec3 col = mix(vec3(0.2, 0.4, 1.0) * 0.32, vec3(0.9, 1.0, 1.35) * 0.95, k * k);
  gl_FragColor = vec4(col * k, vA);
}`;
function magElectrons(n = 1200, NS = 12) {
  const V = n * NS * 4, seed = new Float32Array(V * 4), cs = new Float32Array(V * 3), idx = new Uint32Array(n * NS * 6);
  let v = 0, q = 0;
  for (let i = 0; i < n; i++) { const s = [hash(i * 1.37 + 0.1), hash(i * 2.71 + 0.3), hash(i * 3.97 + 0.7), hash(i * 5.31 + 0.9)];
    for (let j = 0; j < NS; j++) { const b = v; for (const [x, y] of [[0, -1], [0, 1], [1, -1], [1, 1]]) { seed.set(s, v * 4); cs.set([x, y, j], v * 3); v++; }
      idx.set([b, b + 1, b + 2, b + 2, b + 1, b + 3], q); q += 6; } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(V * 3), 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 4)); g.setAttribute('cs', new THREE.BufferAttribute(cs, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  const m = new THREE.ShaderMaterial({ vertexShader: MAG_EL_VS, fragmentShader: MAG_EL_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,   // (las cintas salen en sentido horario: a dos caras)
    uniforms: { time: { value: 0 }, power: { value: 0 }, rc: { value: MAGD.ct.r + 0.05 }, ra: { value: MAGD.vn.ri }, hh: { value: MAGD.vn.h * 0.86 }, om: { value: 2.4 },
      dts: { value: 0.034 }, nseg: { value: NS }, sz: { value: 0.03 }, res: { value: new THREE.Vector2(W * PR, H * PR) } } });
  const me = new THREE.Mesh(g, m); me.frustumCulled = false; me.renderOrder = 8; return me;
}
// el halo azul de la carga espacial: discos apilados con la misma rueda de 5 radios que los electrones
const MAG_HZ_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`;
const MAG_HZ_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float time, power, rc, ra, om; varying vec3 vL;
void main(){
  #include <logdepthbuf_fragment>
  float r = length(vL.xz), th = atan(vL.z, vL.x), x = (r - rc) / (ra - rc);
  if (x < 0.0 || x > 1.0 || power < 0.002) discard;
  float arm = th - om * time + 1.35 * pow(x, 0.8), s = 0.5 + 0.5 * cos(arm * 5.0);
  float d = pow(s, 3.0) * (1.0 - x) * smoothstep(0.0, 0.2, x) + 0.4 * exp(-x * 5.0);
  gl_FragColor = vec4(vec3(0.3, 0.5, 1.0) * 1.3, power * d * 0.12 * smoothstep(1.0, 0.8, x));
}`;

// ---------------------------------------------------------------- frentes de onda: cáscaras esféricas que crecen desde una fuente; solo se dibuja la
// parte que cae dentro de una caja (la cavidad del horno o la guía). La rejilla de direcciones cubre solo el casquete que ve la caja.
const MAG_SH_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute float iR; attribute float iA; attribute float iS;
uniform vec3 C;
varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vA; varying float vS;
void main(){
  vec3 p = C + position * iR; vP = p; vA = iA; vS = iS;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalize(normalMatrix * position); vV = -mv.xyz;
  gl_Position = iA > 0.0005 ? projectionMatrix * mv : vec4(0.0, 0.0, -2.0, 1.0);
  #include <logdepthbuf_vertex>
}`;
const MAG_SH_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 bMin, bMax, tA, tB; uniform vec2 fadeY; uniform float time, gain, wallK, darkK;
varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vA; varying float vS;
void main(){
  #include <logdepthbuf_fragment>
  if (vA < 0.0005 || vP.x < bMin.x || vP.y < bMin.y || vP.z < bMin.z || vP.x > bMax.x || vP.y > bMax.y || vP.z > bMax.z) discard;
  float c = abs(dot(normalize(vN), normalize(vV))), rm = 1.0 - c, rim = pow(rm, 3.2);
  float band = smoothstep(0.3, 0.62, rm) * (1.0 - smoothstep(0.62, 0.9, rm));      // banda justo dentro del borde: oscurece un poco, como si doblara la luz
  vec3 dw = min(vP - bMin, bMax - vP); float dm = min(dw.x, min(dw.y, dw.z)), wall = wallK * exp(-dm * 2.2);
  float sh = 0.7 + 0.3 * sin(vP.x * 1.7 + time * 2.3 + 2.0 * sin(vP.y * 1.3 - time * 1.1)) * sin(vP.z * 1.5 - time * 1.9 + vS * 5.0);
  float a = vA * gain * sh * smoothstep(fadeY.x, fadeY.y, vP.y);
  vec3 col = (mod(vS, 2.0) < 0.5 ? tA : tB) * a * (0.025 + rim + wall);
  gl_FragColor = vec4(col, a * (darkK * band + 0.12 * rim));
}`;
function magShellSet(C, bMin, bMax, o = {}) {
  const nT = o.nT || 18, nP = o.nP || 44, lam = o.lam || 6.1;
  // la caja vista desde la fuente: dirección media y abertura del casquete
  const corners = []; for (let i = 0; i < 8; i++) corners.push(v3(i & 1 ? bMax.x : bMin.x, i & 2 ? bMax.y : bMin.y, i & 4 ? bMax.z : bMin.z));
  const inside = C.x >= bMin.x - 1e-3 && C.x <= bMax.x + 1e-3 && C.y >= bMin.y - 1e-3 && C.y <= bMax.y + 1e-3 && C.z >= bMin.z - 1e-3 && C.z <= bMax.z + 1e-3;
  const cl = v3(clamp(C.x, bMin.x, bMax.x), clamp(C.y, bMin.y, bMax.y), clamp(C.z, bMin.z, bMax.z)), dmin = C.distanceTo(cl);
  let dmax = 0; for (const p of corners) dmax = Math.max(dmax, C.distanceTo(p));
  let D, tmax;
  if (inside && dmin < 1e-3 && !o.onWall) { D = o.D ? o.D.clone().normalize() : v3(0, 1, 0); tmax = Math.PI; }
  else { D = bMin.clone().add(bMax).multiplyScalar(0.5).sub(C).normalize(); if (o.D) D = o.D.clone().normalize(); tmax = 0; for (const p of corners) tmax = Math.max(tmax, p.clone().sub(C).normalize().angleTo(D)); tmax = Math.min(Math.PI, tmax + 0.04); }
  const U = Math.abs(D.y) < 0.9 ? v3(0, 1, 0) : v3(1, 0, 0), E1 = new THREE.Vector3().crossVectors(D, U).normalize(), E2 = new THREE.Vector3().crossVectors(D, E1);
  const pos = [], idx = [];
  for (let i = 0; i <= nT; i++) { const th = tmax * i / nT, st = Math.sin(th), ct = Math.cos(th);
    for (let j = 0; j <= nP; j++) { const ph = 2 * Math.PI * j / nP; const d = D.clone().multiplyScalar(ct).addScaledVector(E1, st * Math.cos(ph)).addScaledVector(E2, st * Math.sin(ph)); pos.push(d.x, d.y, d.z); } }
  for (let i = 0; i < nT; i++) for (let j = 0; j < nP; j++) { const a = i * (nP + 1) + j, b = a + nP + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const K = Math.max(2, Math.ceil((dmax - dmin) / lam) + 2);
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const iR = new THREE.InstancedBufferAttribute(new Float32Array(K), 1), iA = new THREE.InstancedBufferAttribute(new Float32Array(K), 1), iS = new THREE.InstancedBufferAttribute(new Float32Array(K), 1);
  for (const a of [iR, iA, iS]) a.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('iR', iR); g.setAttribute('iA', iA); g.setAttribute('iS', iS); g.instanceCount = K;
  const m = new THREE.ShaderMaterial({ vertexShader: MAG_SH_VS, fragmentShader: MAG_SH_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
    uniforms: { C: { value: C.clone() }, bMin: { value: bMin.clone() }, bMax: { value: bMax.clone() }, tA: { value: new THREE.Color(o.tA ?? 0x8f7dff) }, tB: { value: new THREE.Color(o.tB ?? 0x6fa8ff) },
      time: { value: 0 }, gain: { value: 0 }, wallK: { value: o.wallK ?? 0 }, darkK: { value: o.darkK ?? 0.35 }, fadeY: { value: new THREE.Vector2(...(o.fadeY || [-1e5, -1e5 + 1])) } } });
  const me = new THREE.Mesh(g, m); me.frustumCulled = false; me.renderOrder = o.ro ?? 4;
  return { mesh: me, g, m, iR, iA, iS, K, lam, dmin, dmax, amp: o.amp ?? 1, tris: nT * nP * 2 * K };
}
// pone los radios del fotograma: frentes cada λ que avanzan a «speed» cm/s; solo hasta el frente de la emisión (Rf) y con atenuación
function magShellsAt(S, t, speed, Rf, gain, att = 30, fade = 3) {
  const ph = ((t * speed) / S.lam) % 1, m0 = Math.floor(S.dmin / S.lam - ph);
  for (let k = 0; k < S.K; k++) { const m = m0 + k, R = (m + ph) * S.lam;
    const a = R < 0.04 ? 0 : S.amp * (1 - magSst(Rf - fade, Rf, R)) * magSst(0.0, 0.8, R) / (1 + R / att);
    S.iR.array[k] = Math.max(R, 0.001); S.iA.array[k] = a > 0.002 ? a : 0; S.iS.array[k] = ((m % 2) + 2) % 2; }
  S.iR.needsUpdate = S.iA.needsUpdate = S.iS.needsUpdate = true; S.m.uniforms.time.value = t; S.m.uniforms.gain.value = gain; S.mesh.visible = gain > 0.002;
}

// ---------------------------------------------------------------- EL MAGNETRÓN
function buildMagnetron(o = {}) {
  const D = MAGD, T = magTextures(), K = magKinds(T), G = new THREE.Group(); G.name = 'magnetron';
  const M = { group: G, parts: [], pieces: [], glowMats: [], antennaTip0: v3(0, D.tip, 0), antennaTip: v3(0, D.tip, 0), tris: 0 };
  // cada «pieza» que se corta tiene sus materiales (con sus planos de corte en su propio marco)
  let piece = null;
  const newPiece = root => { piece = { root, mats: [], planes: [new THREE.Plane(), new THREE.Plane(), new THREE.Plane()] }; M.pieces.push(piece); return piece; };
  const mat = (kind, cut = true, glow = false) => { const [f, ch, cr, cm] = K[kind], m = f(); if (cut && piece) { magCutPatch(m, ch, cr, cm, glow); piece.mats.push(m); if (glow) M.glowMats.push(m); } return m; };
  const part = (obj, off, t0, d) => { M.parts.push({ obj, base: obj.position.clone(), off, t0, d }); return obj; };
  const add = (par, g, m, cast = true) => { const me = magMesh(g, m, cast); par.add(me); return me; };
  newPiece(G);
  const mZn = mat('zn'), mCu = mat('cu'), mCuIn = mat('cuIn', true, true), mFe = mat('fe'), mFeP = mat('fe', true, true), mFerr = mat('ferr'), mAl = mat('al'), mCer = mat('cer'), mCap = mat('cap'), mKov = mat('kov'), mKnit = mat('knit');

  // ---- el tubo (no se mueve): ánodo de cobre con sus 10 paletas, aros de unión, piezas polares de hierro, cátodo, pie de cerámica y cable de antena
  const tube = new THREE.Group(); G.add(tube);
  const inA = new THREE.Group(), poles = new THREE.Group(), stem = new THREE.Group(); tube.add(inA, poles, stem); Object.assign(M, { inA, poles, stem });
  const aoIn = (r, y, nr) => nr < -0.5 ? 0.42 : nr > 0.5 ? 0.62 : 0.75;     // pared de dentro (al fondo de las cavidades), de fuera (entre aletas), caras
  add(tube, magLatheGeo([[D.an.ri, -D.an.h], [D.an.ro, -D.an.h], [D.an.ro, D.an.h], [D.an.ri, D.an.h]], { b: 0.03, seg: 72, s: 0.35, ao: aoIn }), mCuIn);
  { const V = D.vn, L = V.ro - V.ri + 0.04, list = [];
    for (let i = 0; i < V.n; i++) { const a = (i + 0.5) * 2 * Math.PI / V.n, g = new THREE.BoxGeometry(L, 2 * V.h, V.t, 1, 1, 1); g.translate(V.ri + L / 2, 0, 0); g.rotateY(-a); list.push(g); }
    const g = magMerge(list); magBoxUV(g, 0.5); const P = g.attributes.position, col = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { const r = Math.hypot(P.getX(i), P.getZ(i)), k = 1 - 0.55 * magSst(0.7, 1.7, r); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); add(inA, g, mCuIn);
    // aros de unión (alternan las paletas: fijan el modo π), arriba y abajo
    const rings = []; for (const sy of [1, -1]) for (const [r0, r1] of [[0.78, 0.86], [1.0, 1.08]]) { const y0 = sy > 0 ? V.h + 0.004 : -V.h - 0.094, y1 = y0 + 0.09; rings.push(magLatheGeo([[r0, y0], [r1, y0], [r1, y1], [r0, y1]], { b: 0.012, seg: 56, s: 0.5, ao: () => 0.62 })); }
    add(inA, magMerge(rings), mCuIn); }
  // piezas polares (embudos de hierro que concentran el campo) con su tapa y el cuello donde se asienta el imán; la de abajo, simétrica
  const poleTop = [[0.34, 0.6], [0.52, 0.57], [1.71, 1.06], [1.71, 1.31], [2.0, 1.31], [2.0, 1.46], [1.0, 1.46], [1.0, 2.875], [0.34, 2.875]];
  add(poles, magLatheGeo(poleTop, { b: 0.025, seg: 72, s: 0.35 }), mFeP);
  add(poles, magLatheGeo(poleTop.map(([r, y]) => [r, -y]).reverse(), { b: 0.025, seg: 72, s: 0.35 }), mFeP);
  // pie del cátodo: cerámica con su anillo de kovar, debajo del imán de abajo (dentro de la caja del filamento)
  add(stem, magLatheGeo([[0.22, -4.18], [0.6, -4.18], [0.62, -4.1], [0.62, -3.07], [0.6, -2.995], [0.22, -2.995]], { b: 0.03, seg: 48, s: 0.5 }), mCer);
  add(stem, magLatheGeo([[0.3, -2.988], [0.7, -2.988], [0.7, -2.897], [0.3, -2.897]], { b: 0.012, seg: 48, s: 0.5 }), mKov);
  // cátodo (no se corta: es la estrella): filamento de tungsteno en espiral, sombreretes de molibdeno, varilla central y patas
  const mW = new THREE.MeshStandardMaterial({ color: 0x8c8c92, metalness: 1, roughness: 0.42, emissive: 0xff5c1c, emissiveIntensity: 0 });
  const mMo = new THREE.MeshStandardMaterial({ color: 0xb4b4ba, metalness: 1, roughness: 0.3, emissive: 0xff4a12, emissiveIntensity: 0 });
  const mLd = new THREE.MeshStandardMaterial({ color: 0xa8a8ae, metalness: 1, roughness: 0.34 }); M.mW = mW; M.mMo = mMo;
  const C = D.ct; add(inA, new THREE.TubeGeometry(new MAGHelix(C.r, 2 * C.h, C.turns, 'y'), C.turns * 22, C.w, 8, false), mW, false);
  for (const sy of [1, -1]) { const y0 = sy * (C.h + 0.02), y1 = y0 + sy * 0.07; add(inA, magLatheGeo([[0.04, Math.min(y0, y1)], [0.36, Math.min(y0, y1)], [0.36, Math.max(y0, y1)], [0.04, Math.max(y0, y1)]], { b: 0.012, seg: 40, s: 1 }), mMo, false);
    const q0 = sy > 0 ? y1 + 0.003 : y1 - 0.123, q1 = q0 + 0.12; add(inA, magLatheGeo([[0.04, q0], [0.16, q0], [0.16, q1], [0.04, q1]], { b: 0.01, seg: 24, s: 1 }), mMo, false); }
  { const g = new THREE.CylinderGeometry(0.04, 0.04, C.h + 0.09 + 4.32, 10); const me = add(inA, g, mLd, false); me.position.set(0, (C.h + 0.09 - 4.32) / 2, 0); }
  { const g = new THREE.CylinderGeometry(0.05, 0.05, 4.32 - C.h - 0.09, 10); const me = add(inA, g, mLd, false); me.position.set(0.17, (-C.h - 0.09 - 4.32) / 2, 0); }
  // cable de la antena: sale de lo alto de una paleta (por detrás, fuera del corte), atraviesa la pieza polar y sube por el eje
  const mLead = new THREE.MeshStandardMaterial({ color: 0xe0926a, metalness: 1, roughness: 0.3 });
  { const a = (6 + 0.5) * 2 * Math.PI / D.vn.n, c = Math.cos(a), s = Math.sin(a);
    const crv = new THREE.CatmullRomCurve3([v3(1.25 * c, 0.5, 1.25 * s), v3(1.12 * c, 0.78, 1.12 * s), v3(0.6 * c, 1.4, 0.6 * s), v3(0.1 * c, 2.0, 0.1 * s), v3(0, 2.6, 0), v3(0, 5.3, 0)]);
    add(tube, new THREE.TubeGeometry(crv, 80, 0.05, 8, false), mLead, false); }

  // ---- antena: manguito de cobre, aislante de cerámica, anillo de kovar y capuchón (salen hacia arriba en la vista explosionada)
  const antC = new THREE.Group(); G.add(antC); part(antC, v3(0, 7.9, 0), 0.04, 0.62);
  add(antC, magLatheGeo([[0.62, 2.886], [1.22, 2.886], [1.22, 2.96], [0.92, 2.96], [0.92, 3.36], [0.62, 3.36]], { b: 0.015, seg: 56, s: 0.5 }), mCu);
  add(antC, magLatheGeo([[0.62, 3.366], [0.9, 3.366], [0.935, 3.62], [0.935, 4.32], [0.9, 4.58], [0.62, 4.58]], { b: 0.03, seg: 56, s: 0.5 }), mCer);
  add(antC, magLatheGeo([[0.6, 4.586], [0.86, 4.586], [0.86, 4.718], [0.6, 4.718]], { b: 0.015, seg: 56, s: 0.5 }), mKov);
  const capG = new THREE.Group(); G.add(capG); part(capG, v3(0, 9.0, 0), 0.0, 0.6);
  add(capG, magLatheGeo([[0.0, 4.724], [0.77, 4.724], [0.77, 4.86], [0.71, 4.92], [0.71, 5.0], [0.75, 5.05], [0.75, 5.36], [0.68, 5.55], [0.5, 5.68], [0.26, 5.745], [0.0, D.tip]], { b: 0.02, seg: 64, s: 0.6 }), mCap);
  // junta de malla de punto alrededor de la antena (cierra el paso de las microondas entre la brida y la guía)
  const knit = new THREE.Group(); G.add(knit); part(knit, v3(0, 7.1, 0), 0.08, 0.62);
  { const g = new THREE.TorusGeometry(1.42, 0.2, 14, 72); g.rotateX(Math.PI / 2); g.scale(1, 0.62, 1); g.translate(0, D.pl.y0 + D.pl.t + 0.12, 0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 36, uv.getY(i) * 6); add(knit, g, mKnit); }

  // ---- chapa de arriba (brida de montaje con sus 4 agujeros)
  const plate = new THREE.Group(); G.add(plate); part(plate, v3(0, 6.6, 0), 0.12, 0.62);
  { const sh = magRect(-D.pl.x, -D.pl.z, D.pl.x, D.pl.z, 0.45); magHole(sh, 0, 0, 1.04); for (const sx of [-1, 1]) for (const sz of [-1, 1]) magHole(sh, sx * 4.14, sz * 3.05, 0.2);
    const g = magPlate(sh, D.pl.y0, D.pl.t, 0.025, 40); magBoxUV(g, 0.12); add(plate, g, mZn); }
  // ---- imanes de ferrita
  const mgT = new THREE.Group(), mgB = new THREE.Group(); G.add(mgT, mgB); part(mgT, v3(0, 5.8, 0), 0.17, 0.62); part(mgB, v3(0, -1.6, 0), 0.2, 0.62);
  { const pr = [[D.mg.ri, D.mg.y0], [D.mg.ro, D.mg.y0], [D.mg.ro, D.mg.y1], [D.mg.ri, D.mg.y1]];
    add(mgT, magLatheGeo(pr, { b: 0.03, seg: 72, s: 0.45 }), mFerr); add(mgB, magLatheGeo(pr.map(([r, y]) => [r, -y]).reverse(), { b: 0.03, seg: 72, s: 0.45 }), mFerr); }
  // ---- aletas de aluminio (encajadas a presión en el ánodo, con su cuello y las pestañas dobladas en los extremos)
  { const F = D.fn, sh = magRect(-F.x, -F.z, F.x, F.z, 0.12); magHole(sh, 0, 0, 2.04);
    const gp = magPlate(sh, -F.t / 2, F.t, 0.012, 20);
    const gc = magLatheGeo([[2.01, F.t / 2 - 0.01], [2.07, F.t / 2 - 0.01], [2.07, 0.24], [2.01, 0.24]], { b: 0.008, seg: 48 });
    const lips = [-1, 1].map(sz => { const g = new THREE.BoxGeometry(2 * F.x - 0.02, 0.3, F.t, 1, 1, 1); g.translate(0, F.t / 2 - 0.155, sz * (F.z + F.t / 2 - 0.005)); return g; });
    const gf = magMerge([gp, gc, ...lips]), P = gf.attributes.position, uv = gf.attributes.uv;
    for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + 3.6) / 7.2, (P.getZ(i) + 4.94) / 9.88);
    for (let k = 0; k < F.n; k++) { const fg = new THREE.Group(); fg.position.y = (k - (F.n - 1) / 2) * F.dy; G.add(fg); add(fg, gf, mAl); part(fg, v3(0, 4.85 + (k - (F.n - 1) / 2) * 0.12, 0), 0.24 + 0.018 * (F.n - 1 - k), 0.6); } }
  // ---- yugo en U: chapa de abajo, dos dobleces y los lados (con las lengüetas que entran en la chapa de arriba) y la etiqueta
  const yoke = new THREE.Group(); G.add(yoke); part(yoke, v3(0, -5.6, 0), 0.22, 0.66);
  { const Y = D.yk, ro = 0.43, ri = ro - Y.t, xb = Y.x - ro, yb = -D.pl.y0 - Y.t + ro, list = [];
    const sh = magRect(-xb, -Y.z, xb, Y.z, 0); magHole(sh, 0, 0, 1.04); list.push(magPlate(sh, -D.pl.y0 - Y.t, Y.t, 0, 40));
    for (const sx of [1, -1]) {
      const b = new THREE.Shape(); b.absarc(xb, yb, ro, -Math.PI / 2, 0, false); b.lineTo(xb + ri, yb); b.absarc(xb, yb, ri, 0, -Math.PI / 2, true); b.closePath();
      const gb = new THREE.ExtrudeGeometry(b, { depth: 2 * Y.z, bevelEnabled: false, curveSegments: 10 }); gb.translate(0, 0, -Y.z); if (sx < 0) gb.rotateY(Math.PI); list.push(gb);
      const gw = new THREE.BoxGeometry(Y.t, D.pl.y0 - yb, 2 * Y.z); gw.translate(sx * (Y.x - Y.t / 2), (D.pl.y0 + yb) / 2, 0); list.push(gw);
      for (const sz of [-1, 1]) { const gt = new THREE.BoxGeometry(Y.t, 0.3, 0.7); gt.translate(sx * (Y.x - Y.t / 2), D.pl.y0 + 0.13, sz * 1.9); list.push(gt); } }
    const g = magMerge(list); magBoxUV(g, 0.12); add(yoke, g, mZn);
    const lb = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.1), mat('label')); lb.material.userData.magClipOnly = true; lb.rotation.y = -Math.PI / 2; lb.position.set(-Y.x - 0.004, 0.15, 0.1); lb.receiveShadow = true; yoke.add(lb); }

  // ---- caja del filamento (va a un lado en la vista explosionada): chapa de acero, bobinas de choque y el condensador pasante con sus dos terminales
  const fbox = new THREE.Group(); G.add(fbox); part(fbox, v3(5.2, -6.0, 0), 0.3, 0.68);
  newPiece(fbox);
  { const B = D.fb, mB = mat('zn'), list = [];
    const fr = magRect(-B.x, -B.z, B.x, B.z, 0.3); fr.holes.push(magRect(-B.x + B.w, -B.z + B.w, B.x - B.w, B.z - B.w, 0.22, new THREE.Path()));
    list.push(magPlate(fr, B.y0 + B.w, B.y1 - B.y0 - 2 * B.w, 0, 12));
    list.push(magPlate(magRect(-B.x, -B.z, B.x, B.z, 0.3), B.y0, B.w, 0.015, 12));
    const top = magRect(-B.x, -B.z, B.x, B.z, 0.3); magHole(top, 0, 0, 0.72); list.push(magPlate(top, B.y1 - B.w, B.w, 0.015, 24));
    const g = magMerge(list); magBoxUV(g, 0.15); add(fbox, g, mB);
    // condensador pasante: placa de montaje, cuerpo, aislante y los dos terminales planos (estañados, con su agujero)
    const mT = mat('tin'), mCC = mat('capC'), mCan = mat('cap'), yc = -4.1;
    { const g2 = new THREE.BoxGeometry(0.06, 1.9, 2.0); g2.translate(B.x + 0.035, yc, 0); magBoxUV(g2, 0.3); add(fbox, g2, mCan); }
    { const g2 = new THREE.CylinderGeometry(0.78, 0.78, 0.85, 40); g2.rotateZ(-Math.PI / 2); g2.translate(B.x + 0.07 + 0.425, yc, 0); add(fbox, g2, mCan); }
    { const g2 = new THREE.CylinderGeometry(0.62, 0.7, 0.34, 40); g2.rotateZ(-Math.PI / 2); g2.translate(B.x + 0.925 + 0.17, yc, 0); add(fbox, g2, mCC); }
    for (const sz of [-1, 1]) { const s2 = magRect(0, -0.32, 1.1, 0.32, 0.05); magHole(s2, 0.82, 0, 0.1);
      const g2 = new THREE.ExtrudeGeometry(s2, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 16 }); g2.translate(B.x + 1.08, yc, sz * 0.36 - 0.035); add(fbox, g2, mT); }
    // bobinas de choque (hilo de cobre esmaltado sobre varillas de ferrita) y los cables hasta el pie del cátodo y el condensador
    const mWire = mat('wire'), mRod = mat('rod'), fbIn = new THREE.Group(); fbox.add(fbIn); M.fbIn = fbIn;
    for (const sz of [-1, 1]) { const cz = sz * 1.12, cy = -4.4;
      const gr = new THREE.CylinderGeometry(0.19, 0.19, 2.3, 20); gr.rotateZ(Math.PI / 2); gr.translate(0.45, cy, cz); add(fbIn, gr, mRod);
      const gh = new THREE.TubeGeometry(new MAGHelix(0.27, 1.9, 12, 'x'), 12 * 16, 0.045, 6, false); gh.translate(0.45, cy, cz); add(fbIn, gh, mWire);
      const w1 = new THREE.CatmullRomCurve3([v3(sz > 0 ? 0 : 0.17, -4.2, 0), v3(-0.4, -4.3, cz * 0.5), v3(-0.5, cy + 0.27, cz)]);
      const w2 = new THREE.CatmullRomCurve3([v3(1.4, cy + 0.27, cz), v3(1.9, -4.2, cz * 0.6), v3(B.x + 0.1, yc, sz * 0.36)]);
      for (const c of [w1, w2]) add(fbIn, new THREE.TubeGeometry(c, 24, 0.035, 6, false), mWire); } }
  piece = M.pieces[0];

  // ---- guía de ondas (opcional): conducto de chapa sobre la brida alrededor de la antena; acaba abierto (ahí está la mica del horno)
  if (o.guide) { const L = o.guideLen ?? 5.1, gi = { x: 2.2, z: 4.3 }, w = 0.07, y0 = D.pl.y0 + D.pl.t, g = new THREE.Group(); G.add(g); M.guide = g; M.guideBox = [v3(-gi.x, y0, -gi.z), v3(gi.x, y0 + L, gi.z)];
    const fr = magRect(-gi.x - w, -gi.z - w, gi.x + w, gi.z + w, 0.15); fr.holes.push(magRect(-gi.x, -gi.z, gi.x, gi.z, 0.08, new THREE.Path()));
    const gg = magMerge([magPlate(fr, y0, L, 0, 10), magPlate((() => { const s = magRect(-gi.x - 0.6, -gi.z - 0.6, gi.x + 0.6, gi.z + 0.6, 0.3); s.holes.push(magRect(-gi.x, -gi.z, gi.x, gi.z, 0.08, new THREE.Path())); return s; })(), y0 + L - 0.1, 0.1, 0.01, 10)]);
    magBoxUV(gg, 0.12); add(g, gg, mat('fe')); }

  // ---- lo que brilla: luz del filamento (cálida), electrones, halo azul y frentes de onda de la antena
  M.el = magElectrons(); inA.add(M.el);
  { const hm = new THREE.ShaderMaterial({ vertexShader: MAG_HZ_VS, fragmentShader: MAG_HZ_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { time: { value: 0 }, power: { value: 0 }, rc: { value: D.ct.r + 0.04 }, ra: { value: D.vn.ri }, om: { value: 2.4 } } });
    const list = []; for (let k = 0; k < 5; k++) { const g = new THREE.RingGeometry(D.ct.r + 0.03, D.vn.ri, 64, 1); g.rotateX(-Math.PI / 2); g.translate(0, (k - 2) * 0.18, 0); list.push(g); }
    M.haze = new THREE.Mesh(magMerge(list), hm); M.haze.renderOrder = 7; M.haze.frustumCulled = false; inA.add(M.haze); }
  { const src = v3(0, 5.25, 0), free = [v3(-8, D.pl.y0 + D.pl.t + 0.05, -8), v3(8, 15, 8)];
    M.wFree = magShellSet(src, free[0], free[1], { nT: 20, nP: 40, lam: 1.5, D: v3(0, 1, 0), tA: 0xa292ff, tB: 0x86b8ff, ro: 5, fadeY: [3.2, 5.6] }); G.add(M.wFree.mesh);
    if (M.guide) { M.wGuide = magShellSet(src, M.guideBox[0], M.guideBox[1], { nT: 18, nP: 36, lam: 1.5, D: v3(0, 1, 0), tA: 0xa292ff, tB: 0x86b8ff, ro: 5, wallK: 0.12 }); M.guide.add(M.wGuide.mesh); } }
  G.traverse(ob => { if (ob.isMesh && ob.geometry && ob.geometry.index) M.tris += ob.geometry.index.count / 3 * (ob.geometry.instanceCount && ob.geometry.instanceCount < 1e6 ? ob.geometry.instanceCount : 1); else if (ob.isMesh) M.tris += ob.geometry.attributes.position.count / 3; });
  MAG = M; magnetronAt(0, {}, M); return M;
}

// ---------------------------------------------------------------- estado por fotograma
function magnetronAt(t, P = {}, M = MAG) {
  if (!M) return;
  const ex = clamp(P.explode ?? 0), cut = clamp(P.cut ?? 0), gl = clamp(P.glow ?? 0), el = clamp(P.electrons ?? 0), wv = clamp(P.wave ?? 0);
  // 1) vista explosionada: cada pieza a su ritmo (en cascada), y flotando un poco cuando está fuera
  M.parts.forEach((p, i) => { const k = magS5((ex - p.t0) / p.d); p.obj.position.copy(p.base).addScaledVector(p.off, k); if (k > 0) p.obj.position.y += Math.sin(t * 1.15 + i * 1.9) * 0.05 * k; });
  M.antennaTip.copy(M.antennaTip0).add(M.parts.find(p => p.off.y > 5).obj.position);
  M.group.updateWorldMatrix(true, true);
  // 2) corte en cuña: quita {p·n1 > d y p·n2 > d} (en el marco de cada pieza); d baja de fuera hacia el eje
  const on = cut > 0.0005, d = lerp(4.05, 0, eio(cut)), yaw = P.cutYaw ?? Math.PI / 4, half = P.cutHalf ?? Math.PI / 4;
  const n1 = v3(Math.sin(yaw - half), 0, -Math.cos(yaw - half)), n2 = v3(-Math.sin(yaw + half), 0, Math.cos(yaw + half));     // (ya cambiados de signo: normales hacia lo que se queda)
  const h = P.cutTop != null ? lerp(10, P.cutTop, eio(cut)) : -1000;      // corte horizontal: dentro de la cuña solo se quita lo que está por encima de h
  for (const pc of M.pieces) { const Mw = pc.root.matrixWorld; magTmpN3.getNormalMatrix(Mw); magTmpM4.copy(Mw).invert();
    pc.planes[0].set(n1, d).applyMatrix4(Mw, magTmpN3); pc.planes[1].set(n2, d).applyMatrix4(Mw, magTmpN3); pc.planes[2].set(magDown, h).applyMatrix4(Mw, magTmpN3);
    for (const m of pc.mats) if (m.userData.magU) m.userData.magU.magW2L.value.copy(magTmpM4);
    for (const m of pc.mats) if (m.userData.magOn !== on) { m.userData.magOn = on; m.clippingPlanes = on ? pc.planes : null; m.clipIntersection = true; m.clipShadows = true;
      if (!m.userData.magClipOnly) m.side = on ? THREE.DoubleSide : THREE.FrontSide; m.needsUpdate = true; } }
  // con el corte puesto (piezas a dos caras), proyectar sombra duplicaba el coste del fotograma: se apaga salvo P.cutShadows
  const cs = !on || !!P.cutShadows; if (M._cs !== cs) { M._cs = cs; M.group.traverse(o => { if (o.isMesh) { if (o.userData.magCast === undefined) o.userData.magCast = o.castShadow; o.castShadow = cs && o.userData.magCast; } }); }
  // 3) filamento al rojo (y su luz, que tiñe las puntas de las paletas)
  M.inA.visible = on; M.fbIn.visible = on; M.poles.visible = M.stem.visible = on || ex > 0.001;     // lo de dentro, solo si se ve
  M.mW.emissiveIntensity = 2.7 * gl; M.mMo.emissiveIntensity = 0.22 * gl * gl;
  for (const m of M.glowMats) m.userData.magU.magGlow.value.setRGB(0.95 * gl + 0.12 * el, 0.36 * gl + 0.2 * el, 0.1 * gl + 0.45 * el);
  // 4) electrones y su halo
  const U = M.el.material.uniforms; U.time.value = t; U.power.value = el; M.el.visible = el > 0.002 && on;
  M.haze.material.uniforms.time.value = t; M.haze.material.uniforms.power.value = el; M.haze.visible = el > 0.002 && on;
  // 5) frentes de onda desde la antena (dentro de la guía si se ve; si no, al aire, hacia arriba)
  const gOn = !!(M.guide && (P.guide ?? 0) > 0.5); if (M.guide) M.guide.visible = gOn;
  const S = gOn ? M.wGuide : M.wFree, So = gOn ? M.wFree : M.wGuide;
  if (So) So.mesh.visible = false;
  S.m.uniforms.C.value.copy(M.antennaTip).y -= 0.5;
  magShellsAt(S, t, 6.0, 3 + 12 * wv, wv * 0.5, 5, 2.5);
}

// ---------------------------------------------------------------- LAS ONDAS DENTRO DEL HORNO (coordenadas del microondas). Salen por la mica (pared
// derecha) y rebotan en las paredes: frentes de la fuente y de sus «imágenes» (las reflexiones en las 6 paredes, hasta 2 rebotes), cada uno
// recortado a la cavidad; en la pared, donde choca el frente, brilla un poco. Por defecto, 1 rebote (6 fuentes); o.depth = 2 → 19 fuentes (más caro). λ visible = 6,1 cm (media longitud de onda real, 12,2 cm: crestas y valles).
function buildMagWaves(o = {}) {
  const C = (typeof MWD !== 'undefined' && MWD.cav) || { x0: -21, x1: 9, y0: 3.4, y1: 24.6, z0: -33, z1: 0 };
  const bMin = v3(C.x0, C.y0, C.z0), bMax = v3(C.x1, C.y1, C.z1), S0 = o.src ? o.src.clone() : v3(C.x1, 15.5, -14), lam = o.lam ?? 6.1;
  const G = new THREE.Group(); G.name = 'magWaves'; const W = { group: G, sets: [], tris: 0 };
  const walls = [[0, C.x0], [0, C.x1], [1, C.y0], [1, C.y1], [2, C.z0], [2, C.z1]];
  const refl = (p, ax, w) => { const q = p.clone(); q.setComponent(ax, 2 * w - p.getComponent(ax)); return q; };
  const srcs = [{ p: S0, n: 0 }], seen = new Set([S0.toArray().map(x => x.toFixed(2)).join()]);
  for (let depth = 1; depth <= (o.depth ?? 1); depth++) for (const s of srcs.filter(s => s.n === depth - 1)) for (const [ax, w] of walls) {
    const q = refl(s.p, ax, w), key = q.toArray().map(x => x.toFixed(2)).join(); if (seen.has(key) || q.distanceTo(s.p) < 0.01) continue; seen.add(key); srcs.push({ p: q, n: depth }); }
  for (const s of srcs) { const onW = s.n === 0, set = magShellSet(s.p, bMin, bMax, { nT: onW ? 24 : s.n === 1 ? 14 : 9, nP: onW ? 56 : s.n === 1 ? 32 : 22, lam, onWall: onW, D: onW ? v3(-1, 0, 0) : null, amp: Math.pow(0.6, s.n), wallK: 0.5, darkK: 0.18, ro: 4 });
    W.sets.push(set); G.add(set.mesh); W.tris += set.tris; }
  // el brillo de la boca: un resplandor suave sobre la mica, donde salen las ondas
  { const gt = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
    const m = new THREE.MeshBasicMaterial({ map: gt, color: new THREE.Color(0x8f86ff), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const me = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), m); me.position.set(C.x1 - 0.05, S0.y, S0.z); me.rotation.y = -Math.PI / 2; me.renderOrder = 4; G.add(me); W.glow = me; }
  W.src = S0; W.box = [bMin, bMax]; MAGW = W; magWavesAt(0, {}, W); return W;
}
function magWavesAt(t, P = {}, W = MAGW) {
  if (!W) return;
  const on = clamp(P.on ?? 0), flow = clamp(P.flow ?? 0), Rf = 2 + flow * 110;
  for (const s of W.sets) magShellsAt(s, t, 14, Rf, on * 0.36, 40, 4);
  W.glow.material.opacity = on * clamp(flow * 4) * (0.5 + 0.15 * Math.sin(t * 9.0)); W.glow.visible = W.glow.material.opacity > 0.002;
}
// ---------------------------------------------------------------- las moléculas de agua, por dentro (frase 4, 13,9–18,5 s: «El agua intenta seguirlas: sus moléculas giran sin
// parar, y eso es calor»). La cámara, metida en el agua de la taza a escala molecular: cientos de moléculas de H₂O en bolas y varillas (el oxígeno rojo y los
// dos hidrógenos blancos a 104,5°, con barniz brillante, reflejos de dos cajas de luz, subsuperficie y sombra de contacto) en un volumen de agua azul verdosa
// oscura con profundidad de campo (las de delante y las del fondo desenfocadas), partículas en suspensión y dispersión (el agua se come antes el rojo).
// El campo de las microondas oscila (MOL_NU veces por segundo en pantalla; el de verdad, 2.450 millones de veces, no se vería): con cada cresta una lámina de luz
// fría barre el volumen de arriba abajo (dispersión exacta a lo largo de cada rayo) y deja un borde frío en las moléculas; las partículas en suspensión se mecen
// a un lado y al otro con él y dejan un trazo corto (la dirección del campo, que se invierte).
// Las moléculas son dipolos (el lado del oxígeno, negativo; el de los hidrógenos, positivo): intentan seguir el campo y giran a un lado y al otro, con un poco
// de retraso (ese retraso es justo lo que calienta), cada vez más agitadas; se encienden por dentro como brasas, con un halo de luz en el agua, que crece
// («y eso es calor»), y los enlaces de hidrógeno (puntos tenues entre el hidrógeno de una y el oxígeno de la de al lado) se rompen y se rehacen.
// Cómo se dibuja: «impostores». Cada átomo es un cuadrado de 2 triángulos y el sombreador calcula la esfera exacta (rayo-esfera), su profundidad (logarítmica,
// como el resto de la escena), su desenfoque según la distancia al foco (el disco borroso de verdad: solape de dos círculos) y su desenfoque de movimiento
// (barrido durante un obturador de 180°); las varillas, igual, con un cilindro. Átomos, varillas, puntos de luz y halos van en un solo InstancedMesh ordenado de
// atrás adelante en cada fotograma (≈ 12 triángulos por molécula; 4.000–9.000 en total). Unidades propias: 1 ≈ 1,5 Å (una molécula mide ≈ 1,4 × 0,8).
// El grupo está lejos de la cocina (MOL_ORIGIN) y una esfera de agua profunda alrededor tapa el fondo de la cocina.
// API: buildMolecules() → MOL (MOL.group ya colocado: hay que añadirlo a la escena) · moleculesAt(t, P) con P = { on, field, heat } (0…1; opcionales: dipole
// 0…1 = nube δ−/δ+ de la protagonista, focus = distancia de enfoque, aperture = multiplica la abertura, cam = cámara con la que se ordena y desenfoca; por
// defecto la global `cam`, que tiene que estar YA colocada para ese fotograma) · moleculesCam(u) → [px,py,pz, lx,ly,lz, fov] en el mundo (u 0…1) ·
// MOL.heroAt() → { O, H1, H2, p } de la molécula protagonista en el mundo (para los rótulos δ−/δ+ del HUD) · MOL.E (dirección del campo) y MOL.fieldValue
// (el campo que nota la protagonista en ese fotograma, −1…1: para una flecha del HUD que se invierta).

const MOL_ORIGIN = new THREE.Vector3(0, 2000, 0);
const MOL_NU = 2.0;                                                         // Hz en pantalla: 4 inversiones del campo por segundo
const MOL_LAMBDA = 16;                                                      // longitud de la onda en pantalla (unidades): el pulso cruza la imagen en ≈ 0,15 s
const MOL_K = new THREE.Vector3(0.22, -1, -0.32).normalize();               // hacia dónde viaja la onda: de arriba abajo, alejándose un poco
const MOL_E = new THREE.Vector3(1, 0, 0).addScaledVector(MOL_K, -MOL_K.x).normalize();   // el campo eléctrico (perpendicular a la onda: casi horizontal)
const MOL_DOF = 300, MOL_DOFMAX = 90;                                       // abertura (px de 1920 · unidades) y desenfoque máximo (px)
const MOL_FOG = 0.072;                                                      // extinción del agua por unidad
// la molécula (centro de masas en el origen; el dipolo, del oxígeno hacia los hidrógenos, es +y)
const MOL_M = (() => {
  const L = 0.68, a = 104.5 * Math.PI / 180, hx = L * Math.sin(a / 2), hy = L * Math.cos(a / 2), yo = -hy / 9;   // 16·yO + 2·(yO + hy) = 0
  return { L, rO: 0.25, rH: 0.155, rS: 0.058, O: new THREE.Vector3(0, yo, 0), H1: new THREE.Vector3(-hx, yo + hy, 0), H2: new THREE.Vector3(hx, yo + hy, 0) };
})();
// cámara: entra todavía avanzando (viene de acercarse a la superficie del agua), rodea despacio a la protagonista y al final empieza a salir
const MOL_CAMK = [[0, [1.5, 0.85, 11.2], [0.16, 0.06, 0], 42], [0.25, [0.75, 0.42, 6.5], [0.03, 0.02, 0], 42], [0.56, [-1.35, 0.22, 6.0], [-0.06, 0.0, 0], 42],
  [0.8, [-2.0, 0.75, 7.9], [-0.22, 0.08, -0.2], 43], [1, [-3.1, 1.9, 14.5], [-0.65, 0.22, -1.2], 44]];
let MOL = null;

function molRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function molRandQuat(r) { const u1 = r(), u2 = r() * 2 * Math.PI, u3 = r() * 2 * Math.PI, a = Math.sqrt(1 - u1), b = Math.sqrt(u1); return new THREE.Quaternion(a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3)); }
const molSs = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
function molCamLocal(u) { return camKeys(clamp(u), MOL_CAMK); }
function moleculesCam(u) { const c = molCamLocal(u), o = MOL ? MOL.group.position : MOL_ORIGIN; return [c.p.x + o.x, c.p.y + o.y, c.p.z + o.z, c.l.x + o.x, c.l.y + o.y, c.l.z + o.z, c.f]; }

// ---------------------------------------------------------------- GLSL común: profundidad, agua, pulso del campo, luz
const MOL_GLSL = `
uniform vec3 uKey, uKeyU, uRim, uRimU, uKeyCol, uRimCol, uWaveK, uE, uOrig;
uniform float uTime, uPhase, uKappa, uField, uHeat, uOn, uFogK;
uniform vec2 uPz;
float molDepth(float zv) {
#ifdef USE_LOGDEPTHBUF
  return log2(1.0 + zv) * logDepthBufFC * 0.5;
#else
  return 0.5 * ((uPz.x * -zv + uPz.y) / zv) + 0.5;
#endif
}
// pulso del campo en un punto (sin^16 de la fase): una cresta estrecha que barre el volumen
float molPulse(vec3 pl) { float s = sin(uPhase - uKappa * dot(pl, uWaveK)); s *= s; s *= s; s *= s; return s * s; }
// luz del pulso dispersada a lo largo del rayo, exacta: ∫ σ e^(−σs) sin^16(fase(s)) ds de 0 a D, con sin^16 = Σ a_k cos(2kφ) (6 armónicos;
// el 7.º y el 8.º no se notan) y cada término integrado con una exponencial compleja. Así la lámina de luz se ve barrer la imagen con su perspectiva.
float molPulseScatter(float xi0, float beta, float D, float sg) {
  float th = uPhase - uKappa * xi0, Dm = min(D, 60.0 / sg), eD = exp(-sg * Dm);
  float res = 0.196381 * (1.0 - eD);
  for (int k = 1; k <= 6; k++) {
    float fk = float(k), ak = k == 1 ? -0.349121 : (k == 2 ? 0.244385 : (k == 3 ? -0.133301 : (k == 4 ? 0.055542 : (k == 5 ? -0.017090 : 0.003662))));
    float wk = 2.0 * fk * uKappa * beta, tk = 2.0 * fk * th;
    vec2 ome = vec2(1.0 - eD * cos(wk * Dm), eD * sin(wk * Dm)), iz = vec2(sg, -wk) / (sg * sg + wk * wk);
    vec2 q = vec2(ome.x * iz.x - ome.y * iz.y, ome.x * iz.y + ome.y * iz.x) * sg;
    res += ak * (cos(tk) * q.x - sin(tk) * q.y);
  }
  return max(res, 0.0);
}
// el color del agua profunda en una dirección: más clara hacia arriba y hacia la luz de contra (dispersión hacia delante); se templa con el calor
vec3 molWaterCol(vec3 d) {
  vec3 c = mix(vec3(0.0006, 0.0031, 0.0064), vec3(0.0042, 0.022, 0.041), smoothstep(-0.8, 0.9, d.y));
  float f = max(dot(d, uRim), 0.0);
  c += vec3(0.007, 0.035, 0.058) * pow(f, 5.0) + vec3(0.0018, 0.010, 0.018) * f * f;
  c = mix(c, vec3(0.0075, 0.0034, 0.0016) * (0.55 + 0.6 * smoothstep(-0.7, 0.7, d.y)) + vec3(0.010, 0.004, 0.001) * pow(f, 3.0), 0.4 * uHeat);   // el agua se templa
  return c * (1.0 + 2.2 * (1.0 - uOn));
}
// luz que dispersa el agua entre la cámara (o, local) y un punto a distancia D en la dirección d; T = lo que pasa del objeto
float molSg() { return uFogK * (1.0 + 10.0 * (1.0 - uOn) * (1.0 - uOn)); }
vec3 molTrans(float D) { return exp(-molSg() * D * vec3(1.2, 1.0, 0.98)); }        // el agua se come antes el rojo: lo lejano se oscurece y se enfría
vec3 molWater(vec3 o, vec3 d, float D, out vec3 T) {
  float sg = molSg();
  T = molTrans(D);
  float pa = molPulseScatter(dot(o, uWaveK), dot(d, uWaveK), D, sg);
  return (1.0 - T) * molWaterCol(d) + vec3(0.013, 0.062, 0.094) * uField * pa;
}
// caja de luz (rectángulo de bordes suaves) vista en el reflejo R
float molBox(vec3 R, vec3 L, vec3 U, vec2 sz, float soft) {
  float w = dot(R, L); if (w < 0.05) return 0.0;
  vec2 q = abs(vec2(dot(R, U), dot(R, cross(L, U))) / w);
  vec2 e = 1.0 - smoothstep(sz - soft, sz + soft, q);
  return e.x * e.y * sz.x * sz.y / ((sz.x + soft) * (sz.y + soft));          // borrosa, más grande pero igual de energía
}
vec3 molEnv(vec3 R, float soft) {
  return molWaterCol(R) * 2.2 + uKeyCol * 3.6 * molBox(R, uKey, uKeyU, vec2(0.5, 0.34), soft + 0.1) + uRimCol * 2.8 * molBox(R, uRim, uRimU, vec2(0.7, 0.12), soft + 0.03);
}
`;

// ---------------------------------------------------------------- impostores: átomos (esferas), varillas (cilindros) y los puntos de los enlaces de hidrógeno
// Tipos: 0 oxígeno, 1 hidrógeno, 2 varilla, 3 punto de luz (motas en suspensión y puntos de los enlaces de hidrógeno), 4 halo (luz alrededor de una molécula caliente).
// iA: esfera/punto/halo → centro + radio · varilla → extremo del oxígeno + radio
// iB: esfera → vecino 1 + tipo · varilla → extremo del hidrógeno + tipo · punto/halo → color + tipo
// iC: esfera → vecino 2 + calor · varilla → (0) + calor · punto/halo → (0) + intensidad
// iD: esfera/punto → su centro al abrir el obturador (desenfoque de movimiento) · varilla → lo que se mueve su centro durante el obturador · halo → su centro
// Se dibujan de atrás adelante con mezcla premultiplicada (los puntos y halos suman: alfa 0) y sin escribir profundidad (solo se prueba contra el fondo y la
// escena): las varillas se recortan justo donde salen de cada esfera, así el orden basta y no hay cortes rectos en los bordes desenfocados.
const MOL_IMP_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 iA, iB, iC, iD;
uniform float uFocus, uDofK, uDofMax, uResY;
varying vec3 vPos, vB, vC, vD; varying vec4 vA, vI;
void main() {
  float ty = iB.w, r = iA.w;
  vec3 a = (modelViewMatrix * vec4(iA.xyz, 1.0)).xyz, b = (modelViewMatrix * vec4(iB.xyz, 1.0)).xyz, c = (modelViewMatrix * vec4(iC.xyz, 1.0)).xyz;
  bool stick = ty > 1.5 && ty < 2.5;
  vec3 a0 = stick ? a : (modelViewMatrix * vec4(iD.xyz, 1.0)).xyz, mv = stick ? mat3(modelViewMatrix) * iD.xyz : a - a0;
  vec3 ctr = stick ? (a + b) * 0.5 : (a + a0) * 0.5;
  float z = max(-ctr.z, 0.05);
  float px = z * 2.0 / (projectionMatrix[1][1] * uResY);                                   // un píxel, en unidades, a esa distancia
  float coc = min(uDofK * abs(1.0 / uFocus - 1.0 / z), uDofMax) * uResY / 1920.0;          // radio del desenfoque (px)
  float bw = (coc + 0.75) * px;                                                            // … en unidades (con el antialias)
  vec3 p;
  if (!stick) {                       // esfera (o su barrido): cuadrado de cara a la cámara en el centro del recorrido
    float R = r + bw + 0.5 * length(mv), D = length(ctr), hs = R / sqrt(max(1.0 - R * R / (D * D), 0.04)) * 1.04;
    vec3 f = ctr / D, rt = cross(f, vec3(0.0, 1.0, 0.0)); rt = length(rt) > 1e-3 ? normalize(rt) : vec3(1.0, 0.0, 0.0); vec3 up = cross(rt, f);
    p = ctr + (rt * position.x + up * position.y) * hs;
  } else {                            // varilla: cuadrado a lo largo del eje, ensanchado con su movimiento
    vec3 ax = b - a; float L = length(ax); vec3 ah = ax / max(L, 1e-5);
    vec3 sd = cross(ah, normalize(ctr)); float sl = length(sd); sd = sl > 1e-4 ? sd / sl : vec3(1.0, 0.0, 0.0);
    float w = (r + bw + 0.5 * length(mv - ah * dot(mv, ah))) * 1.3;
    p = (position.x < 0.0 ? a - ah * w : b + ah * w) + sd * position.y * w;
  }
  vPos = p; vA = vec4(a, r); vB = ty > 2.5 ? iB.xyz : b; vC = c; vD = stick ? mv : a0; vI = vec4(ty, iC.w, bw, px);
  gl_Position = projectionMatrix * vec4(p, 1.0);
  #include <logdepthbuf_vertex>
}`;
const MOL_IMP_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
${MOL_GLSL}
uniform float uRO, uRH, uRS;
varying vec3 vPos, vB, vC, vD; varying vec4 vA, vI;
// área común de dos círculos de radios r y b con los centros a distancia d (el disco borroso de una esfera: su cobertura exacta)
float molOverlap(float d, float r, float b) {
  if (d >= r + b) return 0.0;
  if (d <= abs(r - b)) { float m = min(r, b); return PI * m * m; }
  float d2 = d * d, r2 = r * r, b2 = b * b;
  return r2 * acos(clamp((d2 + r2 - b2) / (2.0 * d * r), -1.0, 1.0)) + b2 * acos(clamp((d2 + b2 - r2) / (2.0 * d * b), -1.0, 1.0))
    - 0.5 * sqrt(max((-d + r + b) * (d + r - b) * (d - r + b) * (d + r + b), 0.0));
}
// cobertura de una esfera de radio r desenfocada (bw) y barrida de c0 a c1 durante el obturador (media de 4 posiciones);
// en c deja el centro donde el rayo pasa más cerca (ahí se sombrea)
float molSphCov(vec3 rd, vec3 c1, vec3 c0, float r, float bw, float px, out vec3 c) {
  vec3 mv = c1 - c0; float alpha;
  if (length(mv) > 0.3 * px) {
    alpha = 0.0;
    for (int i = 0; i < 4; i++) { vec3 ci = c0 + mv * ((float(i) + 0.5) * 0.25); float ti = dot(rd, ci); alpha += molOverlap(sqrt(max(dot(ci, ci) - ti * ti, 0.0)), r, bw); }
    alpha *= 0.25 / (PI * bw * bw);
    float rm = dot(rd, mv), Aq = dot(mv, mv) - rm * rm, Bq = dot(c0, mv) - dot(rd, c0) * rm;
    c = c0 + mv * clamp(Aq > 1e-12 ? -Bq / Aq : 1.0, 0.0, 1.0);
  } else { c = c1; float tc = dot(rd, c); alpha = molOverlap(sqrt(max(dot(c, c) - tc * tc, 0.0)), r, bw) / (PI * bw * bw); }
  return alpha;
}
// oclusión de una esfera (centro c, radio r) sobre un punto p con normal n
float molOccS(vec3 p, vec3 n, vec3 c, float r) { vec3 di = c - p; float l = length(di); float h = l / r; return clamp(max(dot(n, di / l), 0.0) / (h * h), 0.0, 1.0); }
// … y de una varilla (segmento a-b de radio r): como la esfera más cercana del segmento
float molOccC(vec3 p, vec3 n, vec3 a, vec3 b, float r) { vec3 ab = b - a; float s = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return molOccS(p, n, a + ab * s, r * 1.15); }
// la luz sobre la superficie (todo en el mundo): difusa envolvente, subsuperficie, brillo ancho, barniz con el reflejo nítido de las cajas de luz y fresnel
vec3 molShade(vec3 N, vec3 V, vec3 alb, float rough, float coat, float sss, float soft, out vec3 spec) {
  float NV = max(dot(N, V), 0.0), F = 0.04 + 0.96 * pow(1.0 - NV, 5.0);
  float k1 = dot(N, uKey), k2 = dot(N, uRim);
  vec3 dif = uKeyCol * max((k1 + 0.2) / 1.2, 0.0) + uRimCol * 0.65 * max((k2 + 0.1) / 1.1, 0.0);
  dif += uKeyCol * sss * smoothstep(-0.55, 0.05, k1) * (1.0 - smoothstep(0.05, 0.6, k1));          // el terminador se aclara (luz que entra y sale)
  vec3 amb = mix(vec3(0.004, 0.014, 0.02), vec3(0.022, 0.068, 0.095), N.y * 0.5 + 0.5);
  vec3 c = alb * (dif + amb) * (1.0 - F * coat);
  float a = rough * rough, a2 = a * a; spec = vec3(0.0);
  vec3 H1 = normalize(uKey + V), H2 = normalize(uRim + V);
  float d1 = max(dot(N, H1), 0.0), d2 = max(dot(N, H2), 0.0);
  float D1 = a2 / (PI * pow(d1 * d1 * (a2 - 1.0) + 1.0, 2.0)), D2 = a2 / (PI * pow(d2 * d2 * (a2 - 1.0) + 1.0, 2.0));
  spec = (uKeyCol * D1 * max(k1, 0.0) + uRimCol * D2 * max(k2, 0.0) * 0.7) * 0.06 + molEnv(reflect(-V, N), soft) * F * coat;
  return c;
}
void main() {
  vec3 rd = normalize(vPos);
  float ty = vI.x, bw = vI.z, px = vI.w, kb = max(bw - px, 0.0);
  vec3 N, P, alb; float alpha, glow = 0.0, ao = 1.0, rough = 0.42, coat = 1.0, sss = 0.0;
  float onk = smoothstep(0.0, 0.35, uOn);
  if (ty > 3.5) {                         // halo: la luz que el agua dispersa alrededor de una molécula caliente (suma: alfa 0 con la mezcla premultiplicada)
    vec3 c = vA.xyz; float r = vA.w + bw, tc = dot(rd, c), d = sqrt(max(dot(c, c) - tc * tc, 0.0)), q = d / r;
    float k = exp(-3.4 * q * q) * (1.0 - smoothstep(0.75, 1.0, q));
    if (k < 0.002) discard;
    gl_FragColor = vec4(vB * vI.y * k * molTrans(length(c)) * onk, 0.0);
    gl_FragDepth = molDepth(-c.z);
    return;
  }
  if (ty > 2.5) {                         // punto de luz (mota o enlace): esfera emisiva diminuta, desenfocada y barrida (suma)
    vec3 c; float a = molSphCov(rd, vA.xyz, vD, vA.w, bw, px, c) * vI.y;
    if (a < 0.0015) discard;
    gl_FragColor = vec4(vB * a * molTrans(length(c)) * onk, 0.0);
    gl_FragDepth = molDepth(-c.z);
    return;
  }
  if (ty < 1.5) {                         // átomo: esfera exacta, desenfocada con su disco y barrida con su movimiento
    vec3 c; float r = vA.w;
    alpha = molSphCov(rd, vA.xyz, vD, r, bw, px, c);
    if (alpha < 0.004) discard;
    float tc = dot(rd, c), d = sqrt(max(dot(c, c) - tc * tc, 0.0));
    vec3 sd = d > 1e-6 ? (rd * tc - c) / d : vec3(0.0);
    float de = min(d * r / (r + kb * 0.85 + px * 0.5), r * 0.999);                          // con desenfoque, el sombreado se estira al disco
    N = normalize(sd * de - rd * sqrt(r * r - de * de));
    P = c + N * r;
    bool isO = ty < 0.5;
    alb = isO ? vec3(0.30, 0.012, 0.011) : vec3(0.72, 0.74, 0.77);
    rough = isO ? 0.36 : 0.42; sss = isO ? 0.18 : 0.32; glow = vI.y;
    // sombra de contacto: el otro átomo cercano y las varillas que salen de este
    float rr1 = isO ? uRH : uRO;
    ao = 1.0 - 0.85 * molOccS(P, N, vB, rr1) - 0.25 * molOccS(P, N, vC, uRH);
    ao -= 0.9 * molOccC(P, N, c, vB, uRS) + (isO ? 0.9 * molOccC(P, N, c, vC, uRS) : 0.0);
    ao = clamp(ao, 0.25, 1.0);
  } else {                                // varilla: cilindro exacto entre el oxígeno (A) y el hidrógeno (B)
    vec3 A = vA.xyz, B = vB; float r = vA.w, L = length(B - A); vec3 ah = (B - A) / L;
    float bb = dot(rd, ah), dd = dot(rd, -A), ee = dot(ah, -A), den = max(1.0 - bb * bb, 1e-5);
    float tR = (bb * ee - dd) / den, sA = (ee - bb * dd) / den;
    vec3 q = rd * tR - (A + ah * sA); float d = length(q);
    float R = r + kb * 0.85 + px * 0.5, bwm = bw + 0.5 * length(vD - ah * dot(vD, ah));        // + lo que se mueve de lado durante el obturador
    alpha = clamp((min(d + bwm, r) - max(d - bwm, -r)) / (2.0 * bwm), 0.0, 1.0);
    float sO = sqrt(max(uRO * uRO - r * r, 0.0)), sH = L - sqrt(max(uRH * uRH - r * r, 0.0));           // donde sale de cada esfera
    alpha *= smoothstep(sO - bwm * 0.5, sO + bwm * 0.5, sA) * (1.0 - smoothstep(sH - bwm * 0.5, sH + bwm * 0.5, sA));
    if (alpha < 0.004) discard;
    vec3 qh = d > 1e-6 ? q / d : vec3(0.0); vec3 vv = normalize(-rd + ah * bb);
    float de = min(d * r / R, r * 0.999);
    N = normalize(qh * (de / r) + vv * sqrt(1.0 - (de / r) * (de / r)));
    P = A + ah * clamp(sA, 0.0, L) + N * r;
    float hs = smoothstep(0.3, 0.7, sA / L);                                                    // mitad roja (oxígeno) y mitad blanca (hidrógeno)
    alb = mix(vec3(0.21, 0.009, 0.009), vec3(0.68, 0.70, 0.73), hs);
    rough = 0.38; sss = 0.15; glow = vI.y;
    ao = clamp(1.0 - 0.9 * molOccS(P, N, A, uRO) - 0.9 * molOccS(P, N, B, uRH), 0.3, 1.0);
  }
  // al mundo (las direcciones del grupo son las del mundo)
  vec3 Nw = (vec4(N, 0.0) * viewMatrix).xyz, Vw = (vec4(-rd, 0.0) * viewMatrix).xyz, Dw = -Vw;
  vec3 Pl = cameraPosition + (vec4(P, 0.0) * viewMatrix).xyz - uOrig, Ol = cameraPosition - uOrig;
  float soft = 0.035 + kb / max(vA.w, 0.02) * 0.35;
  vec3 col;
  {
    vec3 spec; col = molShade(Nw, Vw, alb, mix(rough, 0.8, clamp(soft * 1.5, 0.0, 1.0)), coat, sss, soft, spec) * ao;
    // el pulso del campo, al pasar, ilumina las moléculas con luz fría (sobre todo por arriba y en los bordes)
    float NV = max(dot(Nw, Vw), 0.0), pl = molPulse(Pl) * uField;
    col += vec3(0.3, 0.78, 1.0) * pl * pow(1.0 - NV, 2.5) * (0.55 + 0.6 * max(dot(Nw, -uWaveK), 0.0)) * ao * (1.0 - 0.7 * glow);   // solo en el borde: el cuerpo no cambia de color
    // calor: brilla desde dentro como el metal al rojo: el núcleo amarillo-naranja (al final pasa del umbral del resplandor) y el borde rojo oscuro;
    // la difusa se apaga y el barniz sigue reflejando las cajas de luz
    vec3 core = ty < 0.5 ? vec3(1.0, 0.33, 0.05) : (ty < 1.5 ? vec3(1.0, 0.6, 0.24) : vec3(1.0, 0.4, 0.09));
    float pr = pow(NV, 1.2);
    col = col * (1.0 - 0.65 * glow) + spec * ao * (1.0 - 0.3 * glow);
    col += mix(vec3(0.62, 0.06, 0.008), core, pr) * (0.3 * glow + 4.4 * glow * glow * glow) * (0.35 + 0.65 * pr);
  }
  vec3 T; float D = length(P);
  vec3 ins = molWater(Ol, Dw, D, T);
  col = col * T + ins;
  alpha = clamp(alpha * onk, 0.0, 1.0);
  gl_FragColor = vec4(col * alpha, alpha);
  gl_FragDepth = molDepth(-P.z);
}`;

// ---------------------------------------------------------------- fondo: esfera de agua profunda alrededor de todo (tapa la cocina)
const MOL_BG_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vW;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`;
const MOL_BG_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
${MOL_GLSL}
varying vec3 vW;
float molH3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float molN3(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(molH3(i), molH3(i + vec3(1, 0, 0)), f.x), mix(molH3(i + vec3(0, 1, 0)), molH3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(molH3(i + vec3(0, 0, 1)), molH3(i + vec3(1, 0, 1)), f.x), mix(molH3(i + vec3(0, 1, 1)), molH3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
void main() {
  #include <logdepthbuf_fragment>
  vec3 d = normalize(vW - cameraPosition), Ol = cameraPosition - uOrig;
  vec3 T; vec3 c = molWater(Ol, d, 1e6, T);
  // nubes muy suaves de luz dispersa (el volumen no es plano)
  float n = molN3(d * 2.6 + vec3(0.0, uTime * 0.03, uTime * 0.02)) * 0.65 + molN3(d * 6.1 - vec3(uTime * 0.02, 0.0, 0.0)) * 0.35;
  c *= 0.86 + 0.28 * n;
  gl_FragColor = vec4(c, 1.0);
}`;

// ---------------------------------------------------------------- dónde está cada molécula (y cómo mira al empezar)
function molLayout(rng) {
  const path = []; for (let i = 0; i <= 160; i++) path.push(molCamLocal(i / 160));
  const pos = [], quat = [];
  // la protagonista en el centro: el oxígeno arriba y los hidrógenos abajo (dipolo hacia abajo, de cara a la cámara): con el campo casi horizontal gira
  // en el plano de la imagen, a un lado y al otro, como un péndulo
  pos.push(new THREE.Vector3(0, 0, 0)); quat.push(new THREE.Quaternion(0, 0, 1, 0).multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), 0.25)));
  const hero = (k) => MOL_M[k].clone().applyQuaternion(quat[0]).add(pos[0]);
  // dos vecinas con enlace de hidrógeno: una recibe el hidrógeno de la protagonista y otra le da uno a su oxígeno
  { const H = hero('H2'), O = hero('O'), dir = H.clone().sub(O).normalize(), c = H.clone().addScaledVector(dir, 1.3 + MOL_M.L * 0.1);
    pos.push(c); const q = new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), dir.clone().add(v3(0.3, -0.2, -0.5)).normalize()); quat.push(q); }
  { const O = hero('O'), dir = v3(-0.55, 0.8, -0.35).normalize(), c = O.clone().addScaledVector(dir, 1.3 + MOL_M.L);
    pos.push(c); const vloc = MOL_M.H1.clone().sub(MOL_M.O).normalize(), q = new THREE.Quaternion().setFromUnitVectors(vloc, dir.clone().negate());
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(dir, 1.1)); quat.push(q); }
  const s = 3.0;
  for (let z = -36; z < 16; z += s) for (let y = -24; y < 24; y += s) for (let x = -19; x < 19; x += s) {
    const p = v3(x + s * (0.12 + rng() * 0.76), y + s * (0.12 + rng() * 0.76), z + s * (0.12 + rng() * 0.76));
    const d = 14 - p.z; if (d < 0) continue;
    if (Math.abs(p.x + 0.9) > 4 + 0.3 * d || Math.abs(p.y - 0.4) > 4.5 + 0.46 * d) continue;
    if (p.length() < 2.2 || pos.some(o => o.distanceToSquared(p) < 2.15 * 2.15)) continue;          // nunca se tocan (alcance de cada una ≤ 0,81 + temblor)
    let ok = true, dmin = 1e9;
    for (let i = 0; i < path.length && ok; i++) {
      const c = path[i].p, dc = c.distanceTo(p); dmin = Math.min(dmin, dc); if (dc < 2.5) { ok = false; break; }
      if (i % 2 === 0) {                                  // línea de visión de la cámara a la protagonista: siempre despejada
        const l = path[i].l, cl = l.clone().sub(c), tt = clamp(p.clone().sub(c).dot(cl) / cl.lengthSq());
        if (tt > 0.04 && tt < 0.9 && c.clone().addScaledVector(cl, tt).distanceTo(p) < 1.3) ok = false;
      }
    }
    if (ok && rng() < 1 - 0.62 * molSs(13, 30, dmin)) { pos.push(p); quat.push(molRandQuat(rng)); }
  }
  // enlaces de hidrógeno: muchas moléculas apuntan uno de sus hidrógenos al oxígeno de la vecina más cercana (la red del agua)
  const n = pos.length;
  for (let i = 3; i < n; i++) {
    if (rng() > 0.62) continue;
    let bj = -1, bd = 3.5; for (let j = 0; j < n; j++) { if (j === i) continue; const dd = pos[i].distanceTo(pos[j]); if (dd < bd) { bd = dd; bj = j; } }
    if (bj < 0) continue;
    const dir = pos[bj].clone().sub(pos[i]).normalize(), vloc = (rng() < 0.5 ? MOL_M.H1 : MOL_M.H2).clone().sub(MOL_M.O).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(vloc, dir); q.premultiply(new THREE.Quaternion().setFromAxisAngle(dir, rng() * 6.283)); quat[i] = q;
  }
  return { pos, quat };
}

// ---------------------------------------------------------------- construir
function buildMolecules() {
  const rng = molRng(161120);
  const g = new THREE.Group(); g.name = 'moleculas'; g.position.copy(MOL_ORIGIN);
  const { pos, quat } = molLayout(rng), n = pos.length;
  // datos de cada molécula: posición y orientación de partida, eje y amplitud del giro (dipolo × campo), retraso, agitación térmica, calor propio
  const D = { n, pos: new Float32Array(n * 3), q0: new Float32Array(n * 4), ax: new Float32Array(n * 3), amp: new Float32Array(n), lag: new Float32Array(n),
    tf: new Float32Array(n * 6), jf: new Float32Array(n * 6), hot: new Float32Array(n), xi: new Float32Array(n) };
  const _p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    pos[i].toArray(D.pos, i * 3); D.q0[i * 4] = quat[i].x; D.q0[i * 4 + 1] = quat[i].y; D.q0[i * 4 + 2] = quat[i].z; D.q0[i * 4 + 3] = quat[i].w;
    _p.set(0, 1, 0).applyQuaternion(quat[i]);                       // dipolo (del oxígeno, −, hacia los hidrógenos, +)
    const ax = _p.clone().cross(MOL_E), sa = ax.length();             // el par de fuerzas gira el dipolo hacia el campo alrededor de dipolo × campo
    if (sa < 0.05) ax.set(0, 0, 1).cross(_p); ax.normalize(); ax.toArray(D.ax, i * 3);
    D.amp[i] = Math.sqrt(Math.max(sa, 0.12)) * (0.8 + 0.4 * rng());
    D.lag[i] = 0.32 + 0.3 * rng();                                   // retraso de fase (rad): intentan seguirlo y no llegan
    for (let k = 0; k < 3; k++) { D.tf[i * 6 + k] = (0.55 + 1.6 * rng()) * 2 * Math.PI; D.tf[i * 6 + 3 + k] = rng() * 6.283; D.jf[i * 6 + k] = (0.5 + 1.3 * rng()) * 2 * Math.PI; D.jf[i * 6 + 3 + k] = rng() * 6.283; }
    D.hot[i] = 0.5 + 0.5 * rng(); D.xi[i] = pos[i].dot(MOL_K);
  }
  D.amp[0] = 1.0; D.lag[0] = 0.4; D.hot[0] = 0.9;
  // candidatos a enlace de hidrógeno: el hidrógeno de una molécula cerca del oxígeno de otra y casi en línea con su enlace O–H
  const bonds = [], at = (i, k) => MOL_M[k].clone().applyQuaternion(quat[i]).add(pos[i]);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i === j || pos[i].distanceToSquared(pos[j]) > 3.6 * 3.6) continue;
    const Oi = at(i, 'O'), Oj = at(j, 'O');
    for (const k of ['H1', 'H2']) { const H = at(i, k), d = H.distanceTo(Oj), c = H.clone().sub(Oi).normalize().dot(Oj.clone().sub(H).normalize());
      if (d < 2.3 && c > 0.85 && (i < 3 || j < 3 || rng() < 0.45)) bonds.push({ i, h: k === 'H1' ? 1 : 2, j, d0: d }); }
  }
  // uniformes compartidos (las tres capas leen los mismos objetos)
  const key = v3(-0.62, 0.62, 0.48).normalize(), rim = v3(0.46, 0.42, -0.78).normalize();
  const U = { uKey: { value: key }, uKeyU: { value: key.clone().cross(v3(0, 0, 1)).normalize() }, uRim: { value: rim }, uRimU: { value: rim.clone().cross(v3(0, 1, 0)).normalize() },
    uKeyCol: { value: new THREE.Color(1.0, 0.94, 0.86).multiplyScalar(1.15) }, uRimCol: { value: new THREE.Color(0.48, 0.86, 1.0).multiplyScalar(1.0) },
    uWaveK: { value: MOL_K.clone() }, uE: { value: MOL_E.clone() }, uOrig: { value: g.position.clone() },
    uTime: { value: 0 }, uPhase: { value: 0 }, uKappa: { value: 2 * Math.PI / MOL_LAMBDA }, uOmega: { value: 2 * Math.PI * MOL_NU }, uField: { value: 0 }, uHeat: { value: 0 }, uOn: { value: 1 },
    uFogK: { value: MOL_FOG }, uPz: { value: new THREE.Vector2() }, uFocus: { value: 7 }, uDofK: { value: MOL_DOF }, uDofMax: { value: MOL_DOFMAX }, uResY: { value: H * PR },
    uRes: { value: new THREE.Vector2(W * PR, H * PR) }, uRO: { value: MOL_M.rO }, uRH: { value: MOL_M.rH }, uRS: { value: MOL_M.rS } };
  const setPz = (r, s, camera) => { const e = camera.projectionMatrix.elements; U.uPz.value.set(e[10], e[14]); };
  // fondo
  const bg = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({ uniforms: U, vertexShader: MOL_BG_VS, fragmentShader: MOL_BG_FS, side: THREE.BackSide, depthWrite: true }));
  bg.frustumCulled = false; bg.renderOrder = -100; g.add(bg);
  // impostores
  const MAXP = n * 6 + 8000 + 2600, quad = new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3);
  const geo = new THREE.InstancedBufferGeometry(); geo.setAttribute('position', quad); geo.setIndex([0, 1, 2, 0, 2, 3]);
  const attr = k => { const a = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(k, a); return a; };
  const aA = attr('iA'), aB = attr('iB'), aC = attr('iC'), aD = attr('iD'); geo.instanceCount = 0;
  const imp = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: U, vertexShader: MOL_IMP_VS, fragmentShader: MOL_IMP_FS, transparent: true, premultipliedAlpha: true, depthWrite: false, depthTest: true }));
  imp.frustumCulled = false; imp.renderOrder = 10; imp.onBeforeRender = setPz; g.add(imp);
  // partículas en suspensión (posición de partida + semilla): flotan, brillan al pasar el pulso y se mecen con el campo a un lado y al otro
  const NM = 2600, motes = new Float32Array(NM * 4), path = []; for (let i = 0; i <= 60; i++) path.push(molCamLocal(i / 60).p);
  for (let i = 0; i < NM; i++) { let p; do { p = v3(-7.5 + 14 * rng(), -7 + 15 * rng(), -16 + 32 * rng()); } while (path.some(c => c.distanceTo(p) < 0.9)); motes.set([p.x, p.y, p.z, rng()], i * 4); }
  MOL = { group: g, D, bonds, U, imp, geo, attrs: [aA, aB, aC, aD], motes, bg, MAXP, n,
    tmp: { A: new Float32Array(MAXP * 4), B: new Float32Array(MAXP * 4), C: new Float32Array(MAXP * 4), D: new Float32Array(MAXP * 4), key: new Float32Array(MAXP), ord: new Uint32Array(MAXP) },
    atoms: new Float32Array(n * 9), vis: new Uint8Array(n), hero: { O: v3(0, 0, 0), H1: v3(0, 0, 0), H2: v3(0, 0, 0), p: v3(0, -1, 0) }, fieldValue: 0, E: MOL_E.clone(), K: MOL_K.clone(),
    heroAt() { return this.hero; } };
  return MOL;
}

// ---------------------------------------------------------------- un fotograma
// cuaternión por vector de giro (ángulo · eje) y producto, en números sueltos (sin crear objetos en el bucle)
function molQRot(wx, wy, wz, out) { const a = Math.hypot(wx, wy, wz); if (a < 1e-9) { out[0] = out[1] = out[2] = 0; out[3] = 1; return out; } const s = Math.sin(a / 2) / a; out[0] = wx * s; out[1] = wy * s; out[2] = wz * s; out[3] = Math.cos(a / 2); return out; }
function molQMul(a, b, o) { const x = a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], y = a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], z = a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], w = a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]; o[0] = x; o[1] = y; o[2] = z; o[3] = w; return o; }
function molQApply(q, v, o, k) { const tx = 2 * (q[1] * v.z - q[2] * v.y), ty = 2 * (q[2] * v.x - q[0] * v.z), tz = 2 * (q[0] * v.y - q[1] * v.x);
  o[k] = v.x + q[3] * tx + q[1] * tz - q[2] * ty; o[k + 1] = v.y + q[3] * ty + q[2] * tx - q[0] * tz; o[k + 2] = v.z + q[3] * tz + q[0] * ty - q[1] * tx; }
const molQs = [[0, 0, 0, 1], [0, 0, 0, 1], [0, 0, 0, 1], [0, 0, 0, 1]], molTmpV = new Float32Array(9), molTmpPrev = new Float32Array(9);
const MOL_SHUT = 1 / 120;                                                    // obturador de 180° a 60 fps
// la pose de la molécula i en el instante t: el dipolo intenta seguir al campo (a un lado y al otro, con retraso) + la agitación del calor.
// Escribe los 3 átomos (O, H1, H2) en out (9 números) y deja el giro en molQs[3]; devuelve el campo que nota (−1…1)
function molPose(D, i, t, field, heat, out) {
  const i3 = i * 3, i6 = i * 6, Phi = 2 * Math.PI * MOL_NU * t, kap = 2 * Math.PI / MOL_LAMBDA;
  const swing = (0.62 + 0.38 * heat) * field, tAmp = 0.06 + 0.5 * heat, jAmp = 0.025 + 0.15 * heat;
  const qs = molQs[0], qt = molQs[1], q0 = molQs[2], qq = molQs[3];
  const ef = Math.sin(Phi - kap * D.xi[i] - D.lag[i]), sw = swing * D.amp[i] * ef;
  molQRot(D.ax[i3] * sw, D.ax[i3 + 1] * sw, D.ax[i3 + 2] * sw, qs);
  molQRot(tAmp * Math.sin(D.tf[i6] * t + D.tf[i6 + 3]), tAmp * Math.sin(D.tf[i6 + 1] * t + D.tf[i6 + 4]), tAmp * Math.sin(D.tf[i6 + 2] * t + D.tf[i6 + 5]), qt);
  q0[0] = D.q0[i * 4]; q0[1] = D.q0[i * 4 + 1]; q0[2] = D.q0[i * 4 + 2]; q0[3] = D.q0[i * 4 + 3];
  molQMul(qt, molQMul(qs, q0, qq), qq);
  const px = D.pos[i3] + jAmp * Math.sin(D.jf[i6] * t + D.jf[i6 + 3]), py = D.pos[i3 + 1] + jAmp * Math.sin(D.jf[i6 + 1] * t + D.jf[i6 + 4]), pz = D.pos[i3 + 2] + jAmp * Math.sin(D.jf[i6 + 2] * t + D.jf[i6 + 5]);
  molQApply(qq, MOL_M.O, out, 0); molQApply(qq, MOL_M.H1, out, 3); molQApply(qq, MOL_M.H2, out, 6);
  for (let k = 0; k < 9; k += 3) { out[k] += px; out[k + 1] += py; out[k + 2] += pz; }
  return ef;
}

function moleculesAt(t, P = {}) {
  const M = MOL; if (!M) return;
  const on = clamp(P.on ?? 1), field = clamp(P.field ?? 0), heat = clamp(P.heat ?? 0);
  M.group.visible = on > 0.001; if (!M.group.visible) return;
  const D = M.D, n = D.n, U = M.U, o = M.group.position;
  // la cámara con la que se ordena y se desenfoca (la global, ya colocada para este fotograma)
  const C = P.cam || cam; C.updateMatrixWorld(); const e = C.matrixWorld.elements;
  const cx = e[12] - o.x, cy = e[13] - o.y, cz = e[14] - o.z, fx = -e[8], fy = -e[9], fz = -e[10], rx = e[0], ry = e[1], rz = e[2], ux = e[4], uy = e[5], uz = e[6];
  const tv = Math.tan((C.fov || 40) * Math.PI / 360), th = tv * (C.aspect || W / H);
  const omega = 2 * Math.PI * MOL_NU, kap = 2 * Math.PI / MOL_LAMBDA, Phi = omega * t;
  const A = M.tmp.A, B = M.tmp.B, Cc = M.tmp.C, Dd = M.tmp.D, key = M.tmp.key, ord = M.tmp.ord, at = M.atoms;
  let np = 0;
  const push = (ax, ay, az, aw, bx, by, bz, bw, ccx, ccy, ccz, cw, dx, dy, dz) => {
    const k = np * 4; A[k] = ax; A[k + 1] = ay; A[k + 2] = az; A[k + 3] = aw; B[k] = bx; B[k + 1] = by; B[k + 2] = bz; B[k + 3] = bw; Cc[k] = ccx; Cc[k + 1] = ccy; Cc[k + 2] = ccz; Cc[k + 3] = cw;
    Dd[k] = dx; Dd[k + 1] = dy; Dd[k + 2] = dz;
    const mx = bw === 2 ? (ax + bx) / 2 : ax, my = bw === 2 ? (ay + by) / 2 : ay, mz = bw === 2 ? (az + bz) / 2 : az;
    key[np] = (mx - cx) * fx + (my - cy) * fy + (mz - cz) * fz; np++;
  };
  for (let i = 0; i < n; i++) {
    const ef = molPose(D, i, t, field, heat, molTmpV), qq = molQs[3];
    for (let k = 0; k < 9; k++) at[i * 9 + k] = molTmpV[k];
    const px = D.pos[i * 3], py = D.pos[i * 3 + 1], pz = D.pos[i * 3 + 2];
    if (i === 0) { M.hero.O.set(at[0], at[1], at[2]).add(o); M.hero.H1.set(at[3], at[4], at[5]).add(o); M.hero.H2.set(at[6], at[7], at[8]).add(o);
      M.hero.p.set(0, 1, 0).applyQuaternion(new THREE.Quaternion(qq[0], qq[1], qq[2], qq[3])); M.fieldValue = field * Math.sin(Phi - kap * D.xi[0]); }
    // ¿se ve? (cono de la cámara con margen)
    const dx = px - cx, dy = py - cy, dz = pz - cz, zc = dx * fx + dy * fy + dz * fz;
    const vis = zc > 0.25 && Math.abs(dx * rx + dy * ry + dz * rz) < zc * th + 2.2 && Math.abs(dx * ux + dy * uy + dz * uz) < zc * tv + 2.2;
    M.vis[i] = vis ? 1 : 0; if (!vis) continue;
    // calor propio: crece con el calor y late un poco con cada giro (cuanto más rápido gira, más se calienta)
    const glow = heat * D.hot[i] * (0.82 + 0.18 * Math.abs(Math.cos(Phi - kap * D.xi[i] - D.lag[i])));
    const b = i * 9, Ox = at[b], Oy = at[b + 1], Oz = at[b + 2], H1x = at[b + 3], H1y = at[b + 4], H1z = at[b + 5], H2x = at[b + 6], H2y = at[b + 7], H2z = at[b + 8];
    // dónde estaban al abrir el obturador (desenfoque de movimiento)
    const pv = molTmpPrev; molPose(D, i, t - MOL_SHUT, field, heat, pv);
    push(Ox, Oy, Oz, MOL_M.rO, H1x, H1y, H1z, 0, H2x, H2y, H2z, glow, pv[0], pv[1], pv[2]);
    push(H1x, H1y, H1z, MOL_M.rH, Ox, Oy, Oz, 1, H2x, H2y, H2z, glow, pv[3], pv[4], pv[5]);
    push(H2x, H2y, H2z, MOL_M.rH, Ox, Oy, Oz, 1, H1x, H1y, H1z, glow, pv[6], pv[7], pv[8]);
    // las varillas, a mitad del obturador, con lo que se mueve su centro
    const mOx = (Ox + pv[0]) / 2, mOy = (Oy + pv[1]) / 2, mOz = (Oz + pv[2]) / 2;
    for (const h of [3, 6]) { const hx = (at[b + h] + pv[h]) / 2, hy = (at[b + h + 1] + pv[h + 1]) / 2, hz = (at[b + h + 2] + pv[h + 2]) / 2;
      push(mOx, mOy, mOz, MOL_M.rS, hx, hy, hz, 2, 0, 0, 0, glow, (Ox + at[b + h] - pv[0] - pv[h]) / 2, (Oy + at[b + h + 1] - pv[1] - pv[h + 1]) / 2, (Oz + at[b + h + 2] - pv[2] - pv[h + 2]) / 2); }
    if (glow > 0.04) push(px, py, pz, 1.15 + 0.35 * glow, 1.0, 0.34, 0.07, 4, 0, 0, 0, 0.36 * glow * glow * glow + 0.025 * glow, px, py, pz);
  }
  const fx0 = at[0] - cx, fy0 = at[1] - cy, fz0 = at[2] - cz, focus = P.focus ?? Math.max(1, fx0 * fx + fy0 * fy + fz0 * fz);
  // el dipolo de la protagonista (opcional, P.dipole 0…1): una nube tenue rojiza en el oxígeno (δ−) y azulada en los hidrógenos (δ+), los colores de los
  // mapas de carga; para acompañar a los rótulos δ−/δ+ del HUD (MOL.heroAt() da dónde ponerlos)
  const dip = clamp(P.dipole ?? 0);
  if (dip > 0.01 && M.vis[0]) {
    push(at[0], at[1], at[2], 0.62, 1.0, 0.16, 0.2, 4, 0, 0, 0, 0.2 * dip, at[0], at[1], at[2]);
    for (const h of [3, 6]) push(at[h], at[h + 1], at[h + 2], 0.46, 0.22, 0.52, 1.0, 4, 0, 0, 0, 0.22 * dip, at[h], at[h + 1], at[h + 2]);
  }
  // enlaces de hidrógeno: puntos tenues entre el hidrógeno de una y el oxígeno de la otra; se rompen al girar o separarse y se rehacen al volver
  for (const bd of M.bonds) {
    if (!M.vis[bd.i] || !M.vis[bd.j] || np > M.MAXP - 20) continue;
    const hb = bd.i * 9 + bd.h * 3, ob = bd.j * 9, oi = bd.i * 9;
    const Hx = at[hb], Hy = at[hb + 1], Hz = at[hb + 2], Ox = at[ob], Oy = at[ob + 1], Oz = at[ob + 2];
    const bz = (Hx - cx) * fx + (Hy - cy) * fy + (Hz - cz) * fz, near = 1 - molSs(2.2, 5.0, Math.abs(bz - focus));   // solo cerca del plano de foco
    if (near < 0.03) continue;
    let vx = Ox - Hx, vy = Oy - Hy, vz = Oz - Hz; const d = Math.hypot(vx, vy, vz); vx /= d; vy /= d; vz /= d;
    let wx = Hx - at[oi], wy = Hy - at[oi + 1], wz = Hz - at[oi + 2]; const wl = Math.hypot(wx, wy, wz); wx /= wl; wy /= wl; wz /= wl;
    const s = near * (1 - molSs(bd.d0 + 0.08, bd.d0 + 0.5, d)) * molSs(0.8, 0.94, vx * wx + vy * wy + vz * wz);
    if (s < 0.03) continue;
    const a0 = MOL_M.rH + 0.07, a1 = d - MOL_M.rO - 0.07, nd = Math.max(3, Math.round((a1 - a0) / 0.13));
    for (let k = 0; k <= nd; k++) { const u = a0 + (a1 - a0) * k / nd; const qx = Hx + vx * u, qy = Hy + vy * u, qz = Hz + vz * u; push(qx, qy, qz, 0.021, 0.52, 0.81, 0.95, 3, 0, 0, 0, s * 0.7, qx, qy, qz); }
  }
  // partículas en suspensión: deriva lenta + el empuje del campo (velocidad ∝ campo → posición ∝ −cos(fase)), con su trazo durante el obturador
  { const Mo = M.motes, NM = Mo.length / 4, Ex = MOL_E.x, Ey = MOL_E.y, Ez = MOL_E.z, Kx = MOL_K.x, Ky = MOL_K.y, Kz = MOL_K.z, Tm = t - 1 / 60;
    for (let i = 0; i < NM && np < M.MAXP - 1; i++) {
      const bx = Mo[i * 4], by = Mo[i * 4 + 1], bz = Mo[i * 4 + 2], sd = Mo[i * 4 + 3], xi = bx * Kx + by * Ky + bz * Kz, am = 0.2 * field * (0.6 + 0.8 * ((sd * 7.31) % 1));
      const sx = bx + 0.16 * Math.sin(t * 0.23 + sd * 61), sy = by + 0.16 * Math.sin(t * 0.19 + sd * 37), sz = bz + 0.16 * Math.sin(t * 0.21 + sd * 17), ph = omega * t - kap * xi, ph0 = omega * Tm - kap * xi;
      const e1 = -am * Math.cos(ph), e0 = -am * Math.cos(ph0);
      const x = sx + Ex * e1, y = sy + Ey * e1, z = sz + Ez * e1;
      const dx = x - cx, dy = y - cy, dz = z - cz, zc = dx * fx + dy * fy + dz * fz;
      if (zc < 0.4 || Math.abs(dx * rx + dy * ry + dz * rz) > zc * th + 0.6 || Math.abs(dx * ux + dy * uy + dz * uz) > zc * tv + 0.6) continue;
      const pulse = Math.pow(Math.abs(Math.sin(ph)), 16) * field, wm = ((sd * 5.3) % 1) * heat * 0.55, I = (0.9 + 2.6 * Math.pow((sd * 13.7) % 1, 3)) * (1 + 2.2 * pulse);
      push(x, y, z, 0.005 + 0.011 * sd * sd, (0.62 + 0.38 * wm) * I, (0.84 - 0.22 * wm) * I, (1.0 - 0.66 * wm) * I, 3, 0, 0, 0, 1, sx + Ex * e0, sy + Ey * e0, sz + Ez * e0);
    } }
  // de atrás adelante (para que los desenfoques se mezclen bien) y a la GPU
  for (let i = 0; i < np; i++) ord[i] = i;
  const sub = ord.subarray(0, np); sub.sort((a, b) => key[b] - key[a]);
  const [aA, aB, aC, aD] = M.attrs, dA = aA.array, dB = aB.array, dC = aC.array, dD = aD.array;
  for (let k = 0; k < np; k++) { const s = sub[k] * 4, d = k * 4; for (let c = 0; c < 4; c++) { dA[d + c] = A[s + c]; dB[d + c] = B[s + c]; dC[d + c] = Cc[s + c]; dD[d + c] = Dd[s + c]; } }
  for (const a of M.attrs) { a.clearUpdateRanges(); a.addUpdateRange(0, np * 4); a.needsUpdate = true; }
  M.geo.instanceCount = np; M.np = np;
  // uniformes
  U.uFocus.value = focus; U.uDofK.value = (P.aperture ?? 1) * MOL_DOF * clamp(focus / 7, 1, 1.8);      // al alejarse, el fondo sigue cremoso
  U.uTime.value = t; U.uPhase.value = Phi; U.uField.value = field; U.uHeat.value = heat; U.uOn.value = on; U.uOrig.value.copy(o);
  U.uResY.value = H * PR; U.uRes.value.set(W * PR, H * PR);
}
// ---------------------------------------------------------------- la escena del plano continuo: el micro (con su interior en rayos X y el magnetrón: módulo xray), la taza
// con el agua, el estallido, la cocina eléctrica con el cazo al lado, las moléculas y los paisajes de cerca (módulos), la cucharilla con el café, el
// termómetro, los avisos de la FDA, la mano y el palito. Todo en un plató oscuro con polvo en el aire (estelas al moverse la cámara).
const MW_POS = new THREE.Vector3(0, 0, -6), MAGLIFT = new THREE.Vector3(17, 40, -20);    // MAGLIFT: el magnetrón levantado (fase E)
let MUGW = new THREE.Vector3();          // base de la taza en el mundo
async function buildScene() {
  S.mw = buildMicrowave(); S.mw.position.copy(MW_POS); scene.add(S.mw);
  const U = S.mw.userData; S.mug = buildMug(); S.mug.position.copy(U.plateC).add(v3(0, U.plateTop - U.plateC.y + 0.02, 0)).add(MW_POS); scene.add(S.mug); MUGW.copy(S.mug.position);
  S.splash = buildSplash(2600, 1); S.splash.position.copy(MUGW); scene.add(S.splash);      // el estallido no gira con el plato
  S.erupt = buildErupt(3); S.splash.add(S.erupt);
  S.coffee = buildCoffee(); S.mug.add(S.coffee);
  S.stick = typeof buildMacStick === 'function' ? buildMacStick() : buildStick(); S.stick.visible = false; scene.add(S.stick);
  S.bub = buildBubbles(90); S.mug.add(S.bub);
  S.stove = await buildStove();
  if (typeof buildXray === 'function') S.xr = buildXray(S.mw);
  else if (typeof buildMagnetron === 'function') { S.mag = buildMagnetron(); scene.add(S.mag.group); S.mag.group.visible = false; }
  if (typeof buildMagWaves === 'function') { S.waves = buildMagWaves(); S.mw.add(S.waves.group); }
  if (typeof buildMolecules === 'function') { S.mol = buildMolecules(); scene.add(S.mol.group); }
  if (typeof buildMacro === 'function') { S.mac = buildMacro(); for (const g of Object.values(S.mac.groups || {})) scene.add(g); }
  // la mano (piel de «los dedos»): entra a coger la taza y se aparta
  S.hand = realHand({ inside: false }); S.hand.scale.setScalar(7.2); S.hand.visible = false; scene.add(S.hand);
  S.hand.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.geometry.type === 'CylinderGeometry') { o.scale.y = 3.2; o.position.y = HAND_Y0 - 1.2 * 3.2; } });
  S.hand.userData.fingers.forEach(f => { f.bones[0].rotation.z = f.d.a * D2 * 0.35; });
  S.spoon = buildSpoon(); scene.add(S.spoon);
  S.thermo = buildThermo(); scene.add(S.thermo);
  S.signs = buildSigns(); scene.add(S.signs);
  // polvo en el aire del plató (deja estelas cuando la cámara se mueve: el «flujo óptico») y motas dentro del horno
  S.flow.push(flowCloud(9000, i => [-90 + hash(i * 1.3) * 230, -10 + hash(i * 2.7) * 90, -90 + hash(i * 3.9) * 170], { size: 1.7, bright: 0.5, nearF: 3, farF: 0.004, drift: 0.8, seed: 4, col: 0xffe6c4 }));
  S.flow.push(flowCloud(1800, i => [-20 + hash(i * 5.1) * 28, 4 + hash(i * 6.3) * 20, -38 + hash(i * 7.7) * 31], { size: 1.2, bright: 0.35, nearF: 0.8, farF: 0.02, drift: 0.25, seed: 5, col: 0xfff0d8 }));
  // reflejos: cada material con su HDRI; lo de dentro del horno, con menos
  envAll(scene, 1); const IN = [U.M.enamel, U.mica.material, U.lampGrille.material]; U.plate.traverse(o => o.material && IN.push(o.material));
  S.inner = [...new Set(IN)]; S.innerRoots = [S.mug, S.splash];
}
function innerEnv(k) { for (const m of S.inner) envMat(m, k); for (const r of S.innerRoots) envAll(r, k); }
// ---------- la cucharilla con café soluble (aparece sobre la taza, se inclina y lo echa)
function buildSpoon() {
  const g = new THREE.Group(), steel = new THREE.MeshPhysicalMaterial({ color: 0xd9dde2, metalness: 1, roughness: 0.18, envMapIntensity: 1.2, side: THREE.DoubleSide });
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), steel); bowl.scale.set(1, 0.42, 1.35); g.add(bowl);
  const hd = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 11), steel); hd.position.set(0, 0.25, -7.2); hd.rotation.x = -0.12; g.add(hd);
  const coffee = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a170b, roughness: 0.85 })); coffee.scale.set(1, 0.35, 1.3); coffee.position.y = -0.05; g.add(coffee);
  g.userData = { coffee }; g.visible = false; return g;
}
// ---------- termómetro de laboratorio metido en el agua: la columna roja sube y pasa de 100
function buildThermo() {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.35, envMapIntensity: 1.5, depthWrite: false });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 17, 24), glass); tube.position.y = 8.5; tube.renderOrder = 6; g.add(tube);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 16), new THREE.MeshStandardMaterial({ color: 0xd62b2b, roughness: 0.25, emissive: 0x4a0000 })); g.add(bulb);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1, 12), new THREE.MeshStandardMaterial({ color: 0xe8302a, roughness: 0.3, emissive: 0x7a0a05 })); col.position.y = 0.5; g.add(col);
  const tick = new THREE.MeshBasicMaterial({ color: 0x1c2430 });
  for (let d = 20; d <= 110; d += 10) { const y = 2 + (d - 20) / 90 * 14, m = new THREE.Mesh(new THREE.BoxGeometry(d % 50 === 0 ? 0.55 : 0.35, 0.05, 0.05), tick); m.position.set(0.5, y, 0); g.add(m); }
  g.userData = { col, Y: d => 2 + (d - 20) / 90 * 14 }; g.visible = false; return g;
}
// ---------- avisos (triángulos amarillos con «!») que salen alrededor del micro al hablar de la FDA
function buildSigns() {
  const g = new THREE.Group(), tex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#FFC400'; c.strokeStyle = '#1C1C1C'; c.lineWidth = 16; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(w / 2, 22); c.lineTo(w - 18, h - 30); c.lineTo(18, h - 30); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#1C1C1C'; c.font = '900 150px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('!', w / 2, h - 58); });
  const P = [[-34, 30, -10], [30, 38, -18], [-24, 46, -32], [40, 20, -4], [-44, 14, -24], [10, 52, -26]];
  for (const p of P) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.position.set(...p); s.userData.p = v3(...p); s.scale.setScalar(0.001); g.add(s); }
  g.visible = false; return g;
}
// el estallido: τ (segundos reales) en cada momento (cámara lenta)
function tauAt(t) {
  if (t < SHT.B0) return 0.055;                                                                     // A: congelado (primer fotograma = último)
  if (t < SHT.C0) return 0.055 * (1 - win(t, SHT.B0, 0.95));                                        // B: se rebobina (las gotas vuelven a la taza)
  if (t >= K.saltar1 && t < SHT.E0) return clamp((t - K.saltar1) * 0.075, 0, 0.11) + Math.max(0, t - SHT.D0 - 0.3) * 0.12;   // C–D: salta a la cara (y luego se apaga)
  if (t >= SHT.P0 && t < K.manos9 - 0.15) return clamp((t - SHT.P0 - 0.04) * 0.07, 0, 0.16);       // P: al echar el café
  if (t >= K.manos9 - 0.15 && t < SHT.R0) return clamp((t - K.manos9 + 0.15) * 0.07, 0, 0.12);     // Q: le salta a la mano
  if (t >= SHT.U1) return 0.055 * clamp((t - SHT.U1) / (END - SHT.U1));                             // U: estalla otra vez y se congela (bucle)
  return 0;
}
function mugRot(t, sh) { const R = -0.6, w = 0.5;
  if (sh === 'B') return R - w * Math.max(0, K.saltar1 - t) * 0.4; if (sh === 'U') return R - w * Math.max(0, SHT.U1 - t);
  if (sh === 'G' || sh === 'L' || sh === 'N') return R + w * (t - SHT.G0) * 0.6; return R; }
// ---------- vista térmica (como una cámara FLIR): al cruzar el cristal de la puerta en L
const thermalMat = (T0, T1, y0, y1, nz = 0.03) => new THREE.ShaderMaterial({ uniforms: { T0: { value: T0 }, T1: { value: T1 }, y0: { value: y0 }, y1: { value: y1 }, nz: { value: nz } },
  vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vW; void main(){ vec4 p = vec4(position, 1.);\n#ifdef USE_INSTANCING\np = instanceMatrix * p;\n#endif\nvec4 w = modelMatrix * p; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;\n#include <logdepthbuf_vertex>\n}',
  fragmentShader: '#include <logdepthbuf_pars_fragment>\nuniform float T0, T1, y0, y1, nz; varying vec3 vW;\nfloat hh(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }\n' +
    'vec3 iron(float t){ t = clamp(t, 0., 1.); vec3 c0 = vec3(0.02,0.01,0.08), c1 = vec3(0.17,0.04,0.42), c2 = vec3(0.55,0.08,0.5), c3 = vec3(0.88,0.2,0.24), c4 = vec3(0.98,0.5,0.1), c5 = vec3(1.,0.84,0.3), c6 = vec3(1.,0.98,0.88);\n' +
    'if (t < .2) return mix(c0, c1, t / .2); if (t < .4) return mix(c1, c2, (t - .2) / .2); if (t < .6) return mix(c2, c3, (t - .4) / .2); if (t < .75) return mix(c3, c4, (t - .6) / .15); if (t < .9) return mix(c4, c5, (t - .75) / .15); return mix(c5, c6, (t - .9) / .1); }\n' +
    'void main(){\n#include <logdepthbuf_fragment>\nfloat k = clamp((vW.y - y0) / (y1 - y0), 0., 1.); float n = (sin(vW.x * 1.7 + vW.z * 2.3) * sin(vW.z * 1.9 - vW.x * 1.1) + 0.5 * sin(vW.x * 4.1 - vW.z * 3.7) + (hh(vW * 40.) - .5) * 0.25) * nz;\n' +
    'vec3 c = iron(mix(T0, T1, k) + n); gl_FragColor = vec4(pow(c, vec3(2.2)) * 1.25, 1.); }' });
let THERM = false;
function thermal(on) {
  if (on === THERM) return; THERM = on; const U = S.mw.userData, Um = S.mug.userData, my = MUGW.y;
  const swap = (root, mk) => root.traverse(o => { if (!(o.isMesh || o.isSprite) || o === S.splash || o.parent === S.splash) return; if (on) { o.userData.m0 = o.material; const tm = mk(o); o.material = Array.isArray(o.material) ? o.material.map(() => tm) : tm; } else if (o.userData.m0) { o.material = o.userData.m0; o.userData.m0 = null; } });
  const cool = thermalMat(0.16, 0.12, 0, 26, 0.02), grille = thermalMat(0.34, 0.34, 0, 1, 0.01), plate = thermalMat(0.22, 0.2, 0, 10, 0.02);
  const mug = thermalMat(0.4, 0.26, my + 5.5, my + 9.8, 0.02), water = thermalMat(0.96, 0.9, -1, 1, 0.035);
  swap(S.mw, o => o.material === U.lampGrille.material ? grille : U.plate.getObjectById(o.id) ? plate : cool);
  swap(S.mug, o => Um.surfMeshes.includes(o) || o === Um.mirror ? water : mug);
  S.splash.visible = !on;
  S.thermBg = S.thermBg || new THREE.Color(0x04020e);
}
function stageAt(t, st) {
  NOW = t; const U = S.mw.userData, sh = shotAt(t), mx = MUGW.x, my = MUGW.y, mz = MUGW.z;
  // la puerta: abierta desde «pero» (se abre) hasta el palito; se cierra en «¿micro…»
  const door = (sh === 'O' ? win(t, K.pero8 - 0.05, 0.5) : ['P', 'Q', 'R', 'S'].includes(sh) ? 1 : sh === 'T' ? 1 - win(t, SHT.T0 + 0.3, 0.5) : 0) * 0.78;
  const running = ['A', 'B', 'C', 'G', 'H', 'L', 'M', 'N', 'U'].includes(sh) ? 1 : 0;
  const secs = Math.max(0, Math.ceil(60 - t * 0.9)), disp = sh === 'R' ? (t < K.calientes10 + 0.2 ? '3:00' : t < K.mas10 ? '2:00' : '1:00') : sh === 'S' || sh === 'T' ? '1:00' : (running ? `0:${String(secs % 60).padStart(2, '0')}` : '12:34');
  const rot = mugRot(t, sh); S.mug.rotation.y = rot; microwaveAt(S.mw, { on: running, lamp: Math.max(running, door > 0.05 ? 1 : 0), turn: rot, door, display: disp });
  // vista térmica: al cruzar el cristal en L, hasta zambullirse en la taza (M)
  thermal(t > 25.15 && t < K.lisa6 + 0.2);
  { const want = THERM ? S.thermBg : sh === 'I' ? null : S.hdr; if (scene.background !== want) scene.background = want; }
  // la taza: estallido (A congelado, B rebobinado, C salta a la cara, P con el café, Q a la mano, U otra vez)
  const tau = tauAt(t), doorShut = door < 0.05;
  if (!THERM) innerEnv(lerp(0.25, 0.6, clamp(door / 0.78)));
  { const dz = Math.abs(st.p.z - (-4.8)), near = door < 0.05 ? 1 - clamp((dz - 5) / 22) : 0; U.screen.material.opacity = 1 - near; U.veil.material.opacity = near * 0.55; }   // rejilla desenfocada de cerca
  const sdir = sh === 'P' ? v3(0.15, 0, 1) : sh === 'Q' ? v3(0.6, 0.1, 0.8) : v3(0, 0, 1);
  splashAt(S.splash, tau, { dir: sdir, floor: -0.05, wallZ: doorShut ? -6 - mz - 0.25 : null, frontZ: -6 - mz, floorOut: -my, steam: 1, light: doorShut ? null : v3(0.2, 0.8, 0.55) });
  eruptAt(S.erupt, tau, { dir: sdir, floor: -0.05, wallZ: doorShut ? -6 - mz - 0.25 : null });
  const bulge = tau > 0 ? 0.35 * Math.exp(-Math.pow((tau - 0.012) / 0.02, 2)) : 0, crown = tau > 0 ? clamp(tau / 0.05) : 0;
  mugSurface(S.mug, t, { amp: tau > 0 ? 0.35 * clamp(tau / 0.02) : (sh === 'S' ? 0.03 : 0.004), bulge, crown: crown * 0.4, rise: boilLevel(tau) });
  { const Um = S.mug.userData, calm = tau <= 0 && !THERM; Um.mirror.visible = calm; Um.surfMeshes[0].visible = !calm; Um.surfMeshes[1].visible = !calm && !THERM; }
  // la cucharilla aparece, se inclina y echa el café (O)
  { const sp = S.spoon, vis = sh === 'O' && t > K.mueves8 - 0.2; sp.visible = vis;
    if (vis) { const a = win(t, K.mueves8 - 0.2, 0.5), tilt = win(t, K.echas8 - 0.15, 0.35); sp.position.set(mx + 0.5, my + 15 + 4 * (1 - a), mz + 1.5); sp.rotation.set(-0.3 - 1.0 * tilt, 0.4, 0.15); sp.userData.coffee.visible = tilt < 0.6; } }
  coffeeAt(S.coffee, sh === 'O' || sh === 'P' ? clamp((t - (K.echas8 + 0.05)) / (K.hierve8 - K.echas8 - 0.05)) : 0);
  // el termómetro (N): metido en el agua, la columna sube y pasa de 100
  { const th = S.thermo, vis = sh === 'N'; th.visible = vis;
    if (vis) { const d = lerp(80, 104, win(t, K.agua7 + 0.2, K.cien7 + 0.5 - K.agua7)), y = th.userData.Y(d); th.position.set(mx - 1.6, my + 0.9, mz + 0.8); th.rotation.set(0.12, 0, 0.22);
      th.userData.col.scale.y = y; th.userData.col.position.y = y / 2; } }
  // el palito (S): cae dentro de la taza y se queda apoyado
  { const sk = S.stick, vis = sh === 'S' || (sh === 'T' && t < SHT.T0 + 0.6); sk.visible = vis;
    if (vis) { const f = win(t, K.palito10 - 0.1, 0.45); sk.position.set(mx + 0.9, my + 0.75 + 16 * (1 - f) * (1 - f), mz - 0.6); sk.rotation.set(-0.12, 0.25, -0.22 - 0.5 * (1 - f)); } }
  bubblesAt(S.bub, t, v3(0.9, 1.2, -0.5), v3(2.2, 7.6, -1.4), 0, { rate: 0.55, scale: 0.55 });
  if (S.mac) macroAt(t, { pot: sh === 'K' ? 1 : 0, mug: sh === 'M' ? 1 : 0, stick: sh === 'S' ? 1 : 0 });
  // la cocina: el cazo en la placa (al rojo desde «calor»), hirviendo al final
  stoveAt(S.stove, t, { heat: sh === 'J' ? win(t, K.calor5 - 0.3, 0.6) : (['K', 'L', 'T', 'U'].includes(sh) ? 1 : 0), cut: 0, boil: sh === 'K' || sh === 'J' ? clamp((t - K.calor5) / 1.4) : (['T', 'L'].includes(sh) ? 0.8 : 0) });
  { const Us = S.stove.userData; Us.surf.material.envMapIntensity = sh === 'K' ? 0.1 : 1.6; for (const m of Us.potMats) m.envMapIntensity = (m.userData.env0 ?? 1) * ENV.env * (sh === 'K' ? 0.45 : 1); }
  // el micro por dentro (rayos X), el magnetrón que sube con el radar de la guerra, y las ondas
  if (S.xr) xrayAt(t, { open: (sh === 'D' ? win(t, SHT.D0 + 0.2, 0.9) : ['E', 'F'].includes(sh) ? 1 : sh === 'G' ? 1 - win(t, SHT.G0 + 0.4, 1.2) : 0),
    glow: ['D', 'E', 'F'].includes(sh) ? 1 : 0, hot: ['F', 'G'].includes(sh) ? 1 : 0.3, fan: running, lift: sh === 'E' ? win(t, SHT.E0 + 0.1, 0.8) * (1 - win(t, K.dispara3 - 0.45, 0.4)) : 0,
    radar: sh === 'E' ? win(t, K.radares2 - 0.1, 0.6) * (1 - win(t, K.mundial2 + 0.2, 0.35)) : 0, beam: sh === 'F' ? win(t, K.ondas3 - 0.1, 0.5) : 0 });
  else if (S.mag) { const e = sh === 'E'; S.mag.group.visible = e;
    if (e) { const up = win(t, SHT.E0 + 0.1, 0.8), G = S.mag.group; G.position.lerpVectors(v3(17, 15.5, -20), MAGLIFT, up); G.rotation.set(0, 0.4 * up, (1 - up) * Math.PI / 2); G.updateMatrixWorld(true);
      magnetronAt(t, { explode: win(t, K.pieza2, 1.0) * (1 - win(t, K.mundial2 - 0.1, 0.6)), cut: 0, glow: 0.4, electrons: 0, wave: 0 }); } }
  if (S.waves) magWavesAt(t, { on: sh === 'G' ? 1 : 0, flow: sh === 'G' ? clamp((t - SHT.G0) / 2.2) : 0 });
  // la carcasa se vuelve de cristal (si no hay módulo de rayos X)
  if (!S.xr) { const gk = sh === 'D' || sh === 'E' ? win(t, SHT.D0 + 0.3, 0.6) * (1 - win(t, K.dispara3 - 0.3, 0.4)) : 0; if (!THERM) U.shell.material.forEach((m, i) => { if (i < 2) { m.transparent = gk > 0; m.opacity = 1 - 0.85 * gk; m.depthWrite = gk < 0.5; } }); }
  if (S.mol) moleculesAt(t, { on: sh === 'I' ? clamp((t - SHT.I0) / 0.3 + 0.15) : 0, field: sh === 'I' ? win(t, K.intenta4, 0.4) : 0, heat: sh === 'I' ? clamp((t - K.giran4 + 0.2) / (K.calor4 - K.giran4 + 0.6)) : 0,
    dipole: sh === 'I' ? win(t, K.moleculas4, 0.3) * (1 - win(t, K.giran4 + 0.5, 0.4)) : 0 });
  // los avisos de la FDA: salen uno a uno alrededor del micro (Q)
  { const g = S.signs, vis = sh === 'Q'; g.visible = vis;
    if (vis) g.children.forEach((s, i) => { const k = pop(t, K.fda9 + 0.12 + i * 0.32, 0.45) * (1 - win(t, SHT.R0 - 0.4, 0.3)); s.scale.setScalar(Math.max(0.001, 9 * k)); s.position.copy(s.userData.p).add(v3(0, Math.sin(t * 2 + i) * 0.6, 0)); }); }
  // la mano: entra por la puerta abierta a coger la taza; le salta el agua y se aparta (Q)
  { const vis = sh === 'Q' && t > K.avisos9 - 0.3; S.hand.visible = vis;
    if (vis) { const hit = K.manos9 - 0.1, reach = win(t, K.avisos9 - 0.3, hit - K.avisos9 + 0.3), back = win(t, hit + 0.05, 0.3);
      const handle = S.mug.localToWorld(v3(6.2, 5.6, 0)), from = v3(22, 20, 22), F = handle.clone().sub(from).normalize();
      const B = v3(0.25, 1, 0.1); B.addScaledVector(F, -B.dot(F)).normalize(); const X = new THREE.Vector3().crossVectors(F, B);
      S.hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, F, B)); S.hand.rotateX(-0.25 * back); S.hand.rotateZ(0.15);
      S.hand.position.copy(handle).addScaledVector(F, -(13.6 + 12 * (1 - reach) + 16 * back)).add(v3(1.5 * back, 2 * back, 0));
      handPose2(S.hand, [0.35 + 0.3 * reach - 0.4 * back, 0.3 + 0.45 * reach - 0.35 * back, 0.4 + 0.45 * reach - 0.35 * back, 0.5 + 0.4 * reach - 0.35 * back, 0.6 + 0.35 * reach - 0.35 * back]); } }
  // luces que siguen a lo que se mira
  const c = st.l; lightsAt(c, st.p.distanceTo(c));
}
// ---------------------------------------------------------------- UN SOLO PLANO, SIN CORTES (Javi, 16-11: «la cámara está en constante movimiento… ningún corte ni cambio de
// plano: es la cámara la que accede a algún lugar para cambiar de escena»). Fases (la letra la usa stageAt):
//  A  0–0,7      el agua congelada en pleno estallido dentro del horno (primer fotograma = último)
//  B  →3,0       el estallido se rebobina y la cámara sale por la puerta: el micro entero, encendido
//  C  →tu        vuelve a entrar a toda prisa: el agua salta a la cara (gotas en el objetivo)
//  D  →magnetrón sale y sube: la carcasa se abre en rayos X, se ven las piezas
//  E  →dispara   el magnetrón sube y a su alrededor aparece un radar de la II Guerra Mundial
//  F  →+1,4      el magnetrón vuelve a su sitio y la cámara vuela por la guía de ondas hasta el horno
//  G  →agua      las ondas llenan el horno; la cámara rodea la taza
//  H  →+0,7      se zambulle en el agua (velo azul)
//  I  →cazo      las moléculas (su mundo; al final, velo naranja del calor)
//  J  →abajo     sale del agua… en el cazo, y se aleja: el cazo en la placa al rojo
//  K  →microondas6 baja al fondo del cazo: las burbujas nacen en las rayitas
//  L  →lisa      sube y vuela hasta el micro; al cruzar el cristal, vista térmica: el agua caliente, la taza no
//  M  →agua7     se zambulle en la taza: el fondo liso, una burbuja sin sitio
//  N  →pero      sale: el termómetro pasa de 100 °C y el agua sigue quieta
//  O  →hierve    se abre la puerta, cae el café
//  P  →FDA       estalla y sale fuera; la cámara retrocede
//  Q  →truco     avisos de la FDA: la mano que se quema
//  R  →mete      el panel: 1:00
//  S  →micro     el palito cae en la taza y la cámara baja por sus vetas
//  T  →mándaselo ¿micro… o cazo? (de uno al otro)
//  U  →fin       vuelve dentro del micro: estalla y se congela (= primer fotograma)
let SHT = {}, SHOTS = [], CK = [], CWIN = [];
function shotAt(t) { let s = SHOTS[0][0]; for (const [k, t0] of SHOTS) if (t >= t0) s = k; return s; }
function segAt(t) { return 0; }
const camArr = (c) => [[c[0], c[1], c[2]], [c[3], c[4], c[5]], c[6] || 45];
function buildCam() {
  const m = MUGW, mx = m.x, my = m.y, mz = m.z, wy = my + MUG.WY;                       // la taza (base) y la superficie del agua
  const pot = v3(STOVE_POS.x + POT_L.x, STOVE_POS.y + POT_L.y, STOVE_POS.z + POT_L.z), pw = pot.y + POT_WY;   // el cazo (base) y su agua
  const MG = MAGLIFT;                                                                    // el magnetrón levantado
  SHT = { A0: 0, B0: 0.7, C0: 3.0, D0: K.tu2, E0: K.magnetron2, F0: K.dispara3, G0: K.dispara3 + 1.4, H0: K.agua4, I0: K.agua4 + 0.7, J0: K.cazo5, K0: K.abajo5,
    L0: K.microondas6 - 0.05, M0: K.lisa6, N0: K.agua7, O0: K.pero8, P0: K.hierve8, Q0: K.fda9, R0: K.truco10, S0: K.mete10, T0: K.micro11, U0: K.mandaselo11, U1: K.microondas11 - 0.05 };
  SHOTS = 'ABCDEFGHIJKLMNOPQRSTU'.split('').map(k => [k, SHT[k + '0']]);
  // ventanas con su propia cámara (módulos): [t0, t1, función(u) → [px,py,pz, lx,ly,lz, fov], salto?]
  const fx = typeof xrayCam === 'function' ? xrayCam : null, fmol = typeof moleculesCam === 'function' ? moleculesCam : null;
  const fpot = typeof macCamPot === 'function' ? macCamPot : null, fmug = typeof macCamMug === 'function' ? macCamMug : null, fstk = typeof macCamStick === 'function' ? macCamStick : null;
  CWIN = [];
  if (fx) CWIN.push([K.dispara3 + 0.35, SHT.G0 - 0.05, fx]);
  if (fmol) CWIN.push([SHT.I0, SHT.J0, fmol, true]);                                        // true: se entra y se sale con un velo (sin empalme)
  if (fpot) CWIN.push([K.abajo5 + 0.45, SHT.L0 - 0.2, fpot]);
  if (fmug) CWIN.push([K.lisa6 + 0.25, SHT.N0 - 0.15, fmug]);
  if (fstk) CWIN.push([K.vetas10 - 0.25, SHT.T0 - 0.15, fstk]);
  const P = (p, l, f = 45) => [p, l, f], k = (t, c) => [t, ...c];
  const at = (f, u) => camArr(f(u));
  const win0 = (f, t0) => f ? k(t0, at(f, 0)) : null, win1 = (f, t1) => f ? k(t1, at(f, 1)) : null;
  const A0 = P([2, 21, -9], [mx, my + 8.4, mz], 58), A1 = P([0.6, 21.2, -9.3], [mx, my + 8.6, mz], 58);
  const keys = [
    k(0, A0), k(SHT.B0, A1),
    // B: el estallido se rebobina; la cámara sale hacia atrás por la puerta y se ve el micro entero
    k(1.45, P([1, 19.5, -1.5], [mx, my + 7, mz], 50)), k(2.2, P([18, 21, 28], [-4, 13, -20], 44)), k(SHT.C0, P([28, 22, 40], [-3, 13, -20], 42)),
    // C: vuelve a entrar a toda prisa; el agua salta hacia el objetivo
    k(3.5, P([3, 19.5, 3], [mx, wy + 1, mz], 46)), k(3.86, P([-3.6, 18.6, -8.6], [mx, wy + 2, mz], 52)), k(SHT.D0 - 0.05, P([-3, 19.2, -7.4], [mx, wy + 2.5, mz], 54)),
    // D: sale por la puerta subiendo; la carcasa se abre: las piezas por dentro
    k(4.8, P([0, 23, 5], [4, 16, -20], 50)), k(5.3, P([24, 38, 28], [8, 16, -20], 46)), k(SHT.E0, P([38, 46, 26], [9, 17, -20], 44)),
    // E: el magnetrón sube; alrededor aparece el radar de la II Guerra Mundial; la cámara lo rodea
    k(6.5, P([44, 52, 6], [MG.x, MG.y - 2, MG.z], 42)), k(K.radares2 + 0.1, P([34, 64, 22], [MG.x, MG.y + 4, MG.z], 50)), k(8.3, P([-8, 62, 24], [MG.x, MG.y + 6, MG.z], 54)),
    k(K.dispara3 - 0.1, P([4, 44, 2], [14, 24, -20], 48)),
    // F: el magnetrón vuelve; la cámara se mete por la guía de ondas (módulo) y sale al horno por la mica
    ...(fx ? [win0(fx, K.dispara3 + 0.35), win1(fx, SHT.G0 - 0.05)] : [k(K.dispara3 + 0.35, P([13, 17, -20], [9, 15.5, -20], 60)), k(SHT.G0 - 0.05, P([6, 16, -20], [mx, wy, mz], 58))]),
    // G: las ondas llenan el horno; la cámara rodea la taza por dentro
    k(11.4, P([-1, 19.5, -11.5], [mx, wy - 1, mz], 56)), k(12.4, P([-16, 20, -16], [mx, wy - 1, mz - 1.5], 56)), k(13.3, P([-13, 21.5, -30], [mx, wy - 1, mz], 56)),
    k(SHT.H0, P([-7.5, 21.5, -25], [mx, wy, mz], 50)),
    // H: se zambulle en el agua de la taza
    k(14.32, P([-6.2, 16.2, -22.8], [mx, wy - 6, mz - 0.1], 50)), k(SHT.I0, P([-6.05, wy - 0.2, -22.55], [mx, wy - 7, mz], 52)),
    // I: las moléculas (su mundo, entre velos)
    ...(fmol ? [] : [k(SHT.I0 + 0.01, P([mx, wy - 1, mz], [mx, wy - 5, mz], 50)), k(SHT.J0 - 0.01, P([mx, wy - 1.5, mz], [mx, wy - 5, mz], 50))]),
    // J: sale del agua… dentro del cazo; sube y se aleja: el cazo en la placa al rojo
    k(SHT.J0, P([pot.x - 0.2, pw - 1.6, pot.z + 0.3], [pot.x, pw + 6, pot.z], 62)), k(19.35, P([pot.x + 1.6, pw + 5.5, pot.z + 2.4], [pot.x, pw - 3, pot.z], 54)),
    k(20.05, P([pot.x + 26, pot.y + 21, pot.z + 31], [pot.x, pot.y + 2, pot.z], 44)),
    // K: baja al fondo del cazo (módulo): las burbujas nacen en las rayitas
    ...(fpot ? [win0(fpot, K.abajo5 + 0.45), win1(fpot, SHT.L0 - 0.2)] : [k(K.abajo5 + 0.45, P([pot.x + 2, pw + 4, pot.z + 3], [pot.x, pot.y + 1, pot.z], 50)), k(SHT.L0 - 0.2, P([pot.x + 1, pot.y + 1.2, pot.z + 1.5], [pot.x - 2, pot.y + 0.3, pot.z - 2], 54))]),
    // L: sube, cruza la cocina hasta el micro y entra por el cristal: vista térmica
    k(23.85, P([pot.x - 0.5, pw + 6, pot.z + 1], [mx + 20, 14, -16], 52)), k(24.55, P([24, 22, 18], [-4, 14, -20], 50)), k(25.2, P([-2, 18.5, -3.4], [mx, wy - 2, mz], 52)),
    k(26.0, P([3, 20.5, -10], [mx, my + 6, mz], 54)), k(SHT.M0, P([-10, 21.5, -11.5], [mx, my + 6, mz], 54)),
    // M: se zambulle en la taza (módulo): el fondo liso, una burbuja sin sitio
    ...(fmug ? [win0(fmug, K.lisa6 + 0.25), win1(fmug, SHT.N0 - 0.15)] : [k(K.lisa6 + 0.25, P([mx - 1, wy + 3, mz + 2], [mx, my + 1, mz], 52)), k(SHT.N0 - 0.15, P([mx + 1, my + 1.6, mz + 1], [mx - 1.5, my + 0.9, mz - 2], 56))]),
    // N: sale: el termómetro pasa de 100 °C; el agua quieta
    k(29.95, P([mx + 1.5, wy + 2.5, mz + 3], [mx, wy - 2, mz], 52)), k(30.7, P([5, 21, -9], [mx, my + 8, mz], 50)), k(31.7, P([-12, 21, -10], [mx, my + 8, mz], 50)),
    k(SHT.O0, P([2, 21.5, -8.5], [mx, my + 8, mz], 50)),
    // O: se abre la puerta y la cámara sale; cae el café (la cámara lo sigue hasta el agua)
    k(32.9, P([7, 25, 7], [mx, my + 9, mz], 48)), k(33.6, P([2, 31, 8], [mx, wy + 3, mz], 46)), k(34.4, P([-4.5, 25, -12], [mx, wy, mz], 46)), k(SHT.P0, P([-4.8, 22.5, -13], [mx, wy + 0.5, mz], 48)),
    // P: estalla y sale fuera; la cámara retrocede deprisa
    k(35.45, P([-3, 22.5, -3], [mx, wy + 3, mz], 54)), k(36.2, P([5, 26, 28], [mx, wy + 2, mz + 2], 46)), k(SHT.Q0, P([20, 33, 55], [-4, 15, -18], 44)),
    // Q: los avisos de la FDA alrededor; la mano que va a coger la taza y se quema
    k(38.4, P([-28, 30, 52], [-2, 16, -18], 46)), k(39.6, P([16, 27, 26], [-4, 13, -20], 44)), k(40.9, P([12, 25, 20], [-5, 13, -20], 44)), k(SHT.R0 - 0.1, P([22, 30, 30], [10, 20, -8], 42)),
    // R: el panel: 1:00
    k(42.9, P([31, 30, 22], [17.9, 24.6, -3.8], 32)), k(43.8, P([27, 28.5, 16], [17.9, 24.2, -3.8], 32)),
    // S: el palito cae en la taza; la cámara baja por sus vetas (módulo)
    k(44.6, P([4, 30, 14], [mx, my + 8, mz], 46)),
    ...(fstk ? [win0(fstk, K.vetas10 - 0.25), win1(fstk, SHT.T0 - 0.15)] : [k(K.vetas10 - 0.25, P([mx + 2, wy + 3, mz + 3], [mx + 1, wy - 2, mz], 50)), k(SHT.T0 - 0.15, P([mx + 1.5, my + 3, mz + 2], [mx + 1, my + 1, mz], 52))]),
    // T: ¿micro… o cazo?
    k(48.6, P([10, 40, 40], [0, 15, -20], 46)), k(49.15, P([pot.x + 6, 34, 34], [pot.x, pot.y + 5, pot.z], 44)), k(SHT.U0, P([40, 36, 46], [18, 12, -15], 44)),
    // U: vuelve dentro del micro; estalla y se congela (bucle)
    k(50.4, P([12, 24, 22], [-5, 14, -20], 46)), k(51.2, P([2, 21, -3], [mx, wy + 2, mz], 52)), k(END, A0),
  ].filter(Boolean);
  CK = keys;
}
// la cámara en t: el recorrido por claves, y dentro de cada ventana, la cámara del módulo
function camAt(t) {
  for (const [a, b, f] of CWIN) if (t >= a && t <= b) { const c = f(clamp((t - a) / (b - a))); return { p: v3(c[0], c[1], c[2]), l: v3(c[3], c[4], c[5]), f: c[6] || 45, roll: 0 }; }
  const st = camKeys(t, CK);
  for (const [t0, a0] of [[K.cara1, 0.35], [SHT.P0 + 0.1, 0.4], [K.manos9 - 0.05, 0.3], [K.cara9, 0.5]]) { const u = t - t0;
    if (u > 0 && u < 0.6) { const a = a0 * Math.exp(-u * 6); st.p.x += Math.sin(u * 83) * a; st.p.y += Math.sin(u * 71 + 1) * a * 0.8; } }
  return st;
}
// el fotograma anterior (desenfoque de movimiento): no cruza los saltos entre mundos (entrar y salir de las moléculas, tapados por el velo)
function prevT(t, dt) { const a = t - dt; for (const [w0, w1, f, jump] of CWIN) if (jump && ((a < w0) !== (t < w0) || (a < w1) !== (t < w1))) return t; return Math.max(0, a); }
function flashAt(t) { let f = 0; for (const [t0, k] of [[K.cara1 + 0.02, 0.025], [SHT.P0 + 0.08, 0.03]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
// velo de color a pantalla completa: azul al entrar en el agua, naranja del calor al salir de las moléculas
function fillAt(t) {
  const blue = win(t, SHT.H0 + 0.42, 0.26) * (1 - win(t, SHT.I0 + 0.02, 0.32));
  const hot = win(t, SHT.J0 - 0.45, 0.4) * (1 - win(t, SHT.J0 + 0.02, 0.3));
  return blue > hot ? { k: blue, c: [0.62, 0.86, 0.96] } : { k: hot, c: [1.0, 0.62, 0.3] };
}
// profundidad de campo: suave (que se lea todo); algo más en los planos de cerca
const DOFK = { A: 0.9, B: 0.5, C: 0.9, D: 0.3, E: 0.3, F: 0.4, G: 0.5, H: 0.6, I: 0, J: 0.5, K: 0.8, L: 0.4, M: 0.8, N: 0.6, O: 0.5, P: 0.6, Q: 0.4, R: 0.5, S: 0.6, T: 0.3, U: 0.6 };
function dofAt(t, st) { const sh = shotAt(t), f = st.p.distanceTo(st.l), k = DOFK[sh] ?? 0.5; return { focus: f, scale: k * f }; }
// ---------------------------------------------------------------- HUD del plano continuo: rótulos de neón cian (como el «200 m» de la referencia de Javi): un punto en el
// objeto, una línea que brilla y una caja oscura con el texto; la cuenta de las ondas; «> 100 °C»; la ficha de la FDA; las gotas que salpican al
// objetivo; la cabecera con el truco pendiente (bucle abierto) y «¿micro… o cazo?».
let INK = '#F2F5F8', GREY = '#B4BEC9', HOT = '#FF8A3D', COOL = '#7FC4FF', GREEN = '#7CF0A9', REDc = '#FF5A4E', AMBc = '#FFC24A', CYAN = '#5CF2E6', HUDD = true;
function buildHudPlan() { HFONT = 'Inter'; HW = [900, 600]; }
const cw = (t, t0, t1, d = 0.25) => win(t, t0, d) * (1 - win(t, t1, d));
const big = (txt, y, size, col, k, o = {}) => bigText(txt, W / 2, y, size, col, k, { type: false, dark: 22, ls: Math.round(size * 0.04), ...o });
const small = (txt, y, size, col, k, o = {}) => bigText(txt, W / 2, y, size, col, k, { dark: 14, ls: 2, ...o });
// rótulo de neón: punto en el objeto → línea que brilla → caja oscura redondeada con el texto (y una segunda línea opcional)
function neon(P3, txt, sub, k, o = {}) {
  if (k <= 0.01 || !P3) return; const A = P3.isVector3 ? proj(P3) : P3; if (P3.isVector3 && !A.ok) return;
  const col = o.color || CYAN, size = o.size || 38, e = eo(clamp(k / 0.5)), dx = o.dx ?? 0, dy = o.dy ?? -170;
  hg.save(); hfont(size); hg.letterSpacing = '2px'; const tw = hg.measureText(txt).width; let sw = 0; if (sub) { hfont(Math.round(size * 0.55), false); sw = hg.measureText(sub).width; } hg.restore();
  const bw = Math.max(tw, sw) + 44, bh = sub ? size * 1.95 : size * 1.4;
  const bx = clamp(A.x + dx - bw / 2, 30, W - 30 - bw), by = clamp(A.y + dy - bh, 420, H - 260 - bh);
  const E = { x: bx + bw / 2, y: A.y + dy < A.y ? by + bh : by };
  hg.save(); hg.globalAlpha = clamp(k * 2.5); hg.lineCap = 'round';
  const lx = A.x + (E.x - A.x) * e, ly = A.y + (E.y - A.y) * e;                                     // la línea crece del objeto a la caja
  hg.shadowColor = col; hg.shadowBlur = 16; hg.strokeStyle = col; hg.lineWidth = 4; hg.beginPath(); hg.moveTo(A.x, A.y); hg.lineTo(lx, ly); hg.stroke();
  hg.fillStyle = col; hg.beginPath(); hg.arc(A.x, A.y, 7, 0, 7); hg.fill();
  const kb = clamp((k - 0.35) / 0.4);
  if (kb > 0) { hg.globalAlpha = clamp(k * 2.5) * kb; hg.shadowBlur = 24; hg.shadowColor = 'rgba(0,0,0,.6)'; hg.fillStyle = 'rgba(10,16,22,.82)'; rr(hg, bx, by, bw, bh, 18); hg.fill();
    hg.shadowColor = col; hg.shadowBlur = 14; hg.strokeStyle = col; hg.lineWidth = 2.5; rr(hg, bx, by, bw, bh, 18); hg.stroke();
    hg.shadowBlur = 18; hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(size); hg.letterSpacing = '2px'; hg.fillText(txt, bx + bw / 2, by + (sub ? size * 0.78 : bh / 2 + 2));
    if (sub) { hg.shadowBlur = 0; hfont(Math.round(size * 0.55), false); hg.fillStyle = INK; hg.fillText(sub, bx + bw / 2, by + size * 1.45); } }
  hg.restore();
}
// cabecera: «ASÍ FUNCIONA · EL MICROONDAS» y el truco pendiente
function hdr(t) {
  const a = win(t, SHT.B0, 0.35) * (1 - win(t, END - 0.9, 0.4)); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic'; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 12;
  hg.letterSpacing = '4px'; hfont(44); hg.fillStyle = INK; hg.textAlign = 'left'; hg.fillText('EL MICROONDAS', 54, 142);
  hg.letterSpacing = '2px'; hfont(23, false); hg.fillStyle = GREY; hg.fillText('POR QUÉ EL AGUA PUEDE SALTARTE A LA CARA', 56, 178);
  hg.textAlign = 'right'; hfont(18, false); hg.fillStyle = GREY; hg.fillText('ASÍ', 1024, 112); hfont(32); hg.fillStyle = HOT; hg.fillText('FUNCIONA', 1024, 148);
  const mk = win(t, K.cara1 + 0.2, 0.3);
  if (mk > 0.01) { let txt = 'EL TRUCO PARA EVITARLO · ???', col = REDc, blink = true;
    if (t > K.truco10) { txt = 'EL TRUCO: NO LA CALIENTES DE MÁS'; col = GREEN; blink = false; }
    if (t > K.palito10) { txt = 'EL TRUCO: UN PALITO DE MADERA'; col = GREEN; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3; hg.globalAlpha = a * mk * (on ? 1 : 0.25); hfont(20); hg.letterSpacing = '2px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 228;
    hg.fillStyle = 'rgba(8,12,20,.72)'; rr(hg, x0, y - 26, w, 40, 8); hg.fill(); hg.strokeStyle = col; hg.lineWidth = 2; rr(hg, x0, y - 26, w, 40, 8); hg.stroke(); hg.fillStyle = col; hg.fillText(txt, x1 - 17, y + 1); }
  hg.restore();
}
// la cuenta de las ondas: sube hasta 2.450.000.000 cuando se dice
function countUp(t, a) {
  if (a <= 0.01) return; const k = clamp((t - K.n2450 + 0.1) / 1.1), n = Math.round(2450 * (1 - Math.pow(1 - k, 3))) * 1e6, s = n.toLocaleString('es-ES').replace(/ /g, '.');
  hg.save(); hg.globalAlpha = clamp(a * 2); const y = 1430, bw = 900, bh = 190, bx = (W - bw) / 2;
  hg.fillStyle = 'rgba(10,16,22,.8)'; rr(hg, bx, y, bw, bh, 22); hg.fill(); hg.shadowColor = CYAN; hg.shadowBlur = 16; hg.strokeStyle = CYAN; hg.lineWidth = 3; rr(hg, bx, y, bw, bh, 22); hg.stroke();
  hg.fillStyle = CYAN; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(92); hg.letterSpacing = '3px'; hg.fillText(s, W / 2, y + 78);
  hg.shadowBlur = 0; hfont(30, false); hg.fillStyle = INK; hg.letterSpacing = '4px'; hg.fillText('VECES POR SEGUNDO', W / 2, y + 150); hg.restore();
}
// la ficha de la FDA
function fdaCard(t, a) {
  if (a <= 0.01) return; const x0 = 90, x1 = 990, y0 = 1330, y1 = 1580, e = eo(clamp(a * 1.4));
  hg.save(); hg.globalAlpha = clamp(a * 2); hg.translate(0, (1 - e) * 40);
  hg.fillStyle = 'rgba(255,255,255,.95)'; hg.shadowColor = 'rgba(0,0,0,.4)'; hg.shadowBlur = 26; rr(hg, x0, y0, x1 - x0, y1 - y0, 18); hg.fill(); hg.shadowBlur = 0;
  hg.fillStyle = '#D32F2F'; rr(hg, x0, y0, 14, y1 - y0, 7); hg.fill();
  hg.textAlign = 'left'; hg.textBaseline = 'alphabetic'; hg.letterSpacing = '3px'; hfont(26); hg.fillStyle = '#5A6472'; hg.fillText('AVISO OFICIAL · FDA (EE. UU.)', x0 + 48, y0 + 62);
  hg.letterSpacing = '1px'; hfont(46); hg.fillStyle = '#1C2430'; hg.fillText(typed('Quemaduras graves', clamp((a - 0.2) * 2)), x0 + 48, y0 + 128);
  hfont(32, false); hg.fillStyle = '#1C2430'; hg.fillText(typed('por agua sobrecalentada en el microondas', clamp((a - 0.35) * 2)), x0 + 48, y0 + 180);
  hfont(26); hg.fillStyle = '#D32F2F'; hg.fillText(typed('en las manos y en la cara', clamp((a - 0.5) * 2)), x0 + 48, y0 + 222);
  hg.restore();
}
// gotas en el objetivo (cuando el agua salta a la cámara): lentes pequeñas con brillo, que resbalan
function lensDrops(t, t0, seed) {
  const u = t - t0; if (u < 0 || u > 1.1) return; const a = 1 - clamp((u - 0.6) / 0.5);
  hg.save(); for (let i = 0; i < 26; i++) { const h = k => hash(i * 7.7 + k * 3.1 + seed), d0 = h(1) * 0.15; if (u < d0) continue;
    const x = h(2) * W, y = 380 + h(3) * (H - 700) + (u - d0) * (40 + 160 * h(4)), r = 14 + 46 * Math.pow(h(5), 2);
    const g = hg.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, `rgba(255,255,255,${0.55 * a})`); g.addColorStop(0.55, `rgba(200,225,235,${0.12 * a})`); g.addColorStop(0.92, `rgba(20,30,40,${0.35 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    hg.fillStyle = g; hg.beginPath(); hg.ellipse(x, y, r, r * (1 + 0.25 * h(6)), 0, 0, 7); hg.fill(); }
  hg.restore();
}
function hudAt(t) {
  const sh = shotAt(t); hudBegin(); hdr(t);
  const mw = (x, y, z) => S.mw.localToWorld(v3(x, y, z)), mg = (x, y, z) => S.mug.localToWorld(v3(x, y, z));
  const pot = v3(STOVE_POS.x + POT_L.x, STOVE_POS.y + POT_L.y, STOVE_POS.z + POT_L.z), A = S.xr && S.xr.anchors;
  const anc = k => A && A[k] ? (typeof A[k] === 'function' ? A[k]() : A[k]) : null;
  // C y P: el agua salta al objetivo
  lensDrops(t, K.cara1 - 0.05, 1); lensDrops(t, SHT.P0 + 0.45, 7);
  // D–E: las piezas por dentro; el magnetrón; el radar de la guerra
  if (sh === 'D' || sh === 'E') { const kd = cw(t, SHT.D0 + 0.8, SHT.E0 + 0.6);
    neon(anc('transformer'), 'TRANSFORMADOR', '', kd * 0.9, { size: 26, dx: -120, dy: 140, color: INK }); neon(anc('fan'), 'VENTILADOR', '', kd * 0.9, { size: 26, dx: 120, dy: 160, color: INK });
    const pm = anc('magnetron') || (S.mag ? S.mag.group.localToWorld(v3(0, 0, 0)) : MAGLIFT);
    neon(pm, 'MAGNETRÓN', t > K.radares2 - 0.1 ? 'LA PIEZA DE LOS RADARES' : '', cw(t, K.magnetron2 - 0.1, K.dispara3 - 0.3), { size: 46, dy: -200 });
    if (t > K.segunda2 - 0.2) neon(MAGLIFT.clone().add(v3(0, 16, 0)), 'II GUERRA MUNDIAL', '', cw(t, K.segunda2 - 0.15, K.dispara3 - 0.3), { size: 34, dy: -120, color: AMBc }); }
  // F–G: las ondas, 2.450 millones de veces por segundo
  if (sh === 'F') neon(anc('waveguide'), 'GUÍA DE ONDAS', '', cw(t, K.ondas3 - 0.2, K.ondas3 + 0.6), { size: 30, dy: -150 });
  countUp(t, cw(t, K.n2450 - 0.1, K.agua4 - 0.2));
  // I: la molécula de agua
  if (sh === 'I' && S.mol && S.mol.heroAt) neon(S.mol.heroAt().O, 'MOLÉCULA DE AGUA', 'H₂O', cw(t, K.moleculas4 - 0.05, K.giran4 + 0.7), { size: 36, dy: 360 });
  // J: el calor viene de abajo
  if (sh === 'J') neon(pot.clone().add(v3(0, -0.4, 6)), 'CALOR', '↑ DESDE ABAJO', cw(t, K.calor5 - 0.1, K.abajo5 + 0.4), { size: 44, color: HOT, dy: 220 });
  // K: las rayitas
  if (sh === 'K') neon(camAt(t).l, 'RAYITAS', 'AQUÍ NACEN LAS BURBUJAS', cw(t, K.rayitas5 - 0.15, SHT.L0 - 0.3), { size: 40, dy: -240 });
  // L: vista térmica
  if (sh === 'L' && THERM) { neon(mg(0.8, MUG.WY, 0.5), 'AGUA', 'CALIENTE', cw(t, K.agua6 - 0.15, SHT.M0), { size: 40, color: HOT, dx: -120, dy: -220 });
    neon(mg(0, 3.5, 4.1), 'TAZA', 'CASI NADA', cw(t, K.taza6 - 0.15, SHT.M0), { size: 40, color: COOL, dx: 140, dy: 240 }); }
  // M: la taza lisa
  if (sh === 'M') neon(camAt(t).l, 'LISA', 'NINGÚN SITIO DONDE NACER', cw(t, K.lisa6 + 0.3, SHT.N0 - 0.2), { size: 40, dy: -260 });
  // N: más de 100 °C y quieta
  if (sh === 'N' && S.thermo.visible) { S.thermo.updateMatrixWorld(); const top = S.thermo.localToWorld(v3(0, S.thermo.userData.col.scale.y, 0));
    neon(top, '> 100 °C', t > K.sigue7 - 0.1 ? 'Y SIGUE QUIETA' : '', cw(t, K.cien7 - 0.05, SHT.O0 - 0.1), { size: 64, color: HOT, dx: 160, dy: -200 }); }
  // Q: la FDA
  fdaCard(t, cw(t, K.fda9 + 0.2, SHT.R0 - 0.1, 0.35));
  // R: el temporizador
  if (sh === 'R') neon(mw(17.9, 23.9, 2.3), 'NO DE MÁS', '', cw(t, K.calientes10 - 0.1, SHT.S0), { size: 40, color: GREEN, dy: 260 });
  // S: las vetas del palito
  if (sh === 'S' && S.stick.visible && t > K.vetas10 - 0.3) neon(camAt(t).l, 'VETAS', 'LAS BURBUJAS NACEN AQUÍ', cw(t, K.vetas10 - 0.1, SHT.T0 - 0.2), { size: 40, color: GREEN, dy: -240 });
  // T: ¿micro… o cazo?
  if (sh === 'T') { neon(mw(0, 29.5, -18), '¿MICRO…', '', cw(t, K.micro11 - 0.05, K.mandaselo11 + 0.2, 0.15), { size: 64, color: INK, dy: -160 });
    neon(pot.clone().add(v3(0, 13.8, 0)), '…O CAZO?', '', cw(t, K.cazo11 - 0.05, K.mandaselo11 + 0.2, 0.15), { size: 64, color: HOT, dy: -160 }); }
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
  K = {
    cuidado1: atL(1, 'cuidado'), calientes1: atL(1, 'calientes'), agua1: atL(1, 'agua'), microondas1: atL(1, 'microondas'), saltar1: atL(1, 'saltar'), cara1: atL(1, 'cara'),
    tu2: atL(2, '=tu'), magnetron2: atL(2, 'magnetron'), pieza2: atL(2, 'pieza'), radares2: atL(2, 'radares'), segunda2: atL(2, 'segunda'), mundial2: atL(2, 'mundial'),
    dispara3: atL(3, 'dispara'), ondas3: atL(3, 'ondas'), vibran3: atL(3, 'vibran'), n2450: atL(3, '=2450'), millones3: atL(3, 'millones'), segundo3: atL(3, 'segundo'),
    agua4: atL(4, 'agua'), intenta4: atL(4, 'intenta'), seguirlas4: atL(4, 'seguirlas'), moleculas4: atL(4, 'moleculas'), giran4: atL(4, 'giran'), calor4: atL(4, 'calor'),
    cazo5: atL(5, 'cazo'), calor5: atL(5, 'calor'), abajo5: atL(5, 'abajo'), burbujas5: atL(5, 'burbujas'), nacen5: atL(5, 'nacen'), rayitas5: atL(5, 'rayitas'), fondo5: atL(5, 'fondo'),
    microondas6: atL(6, 'microondas'), calienta6: atL(6, 'calienta'), agua6: atL(6, 'agua'), taza6: atL(6, 'taza'), lisa6: atL(6, 'lisa'), burbuja6: atL(6, 'burbuja'), nacer6: atL(6, 'nacer'),
    agua7: atL(7, 'agua'), pasa7: atL(7, 'pasa'), cien7: atL(7, 'cien'), grados7: atL(7, 'grados'), sigue7: atL(7, 'sigue'), quieta7: atL(7, 'quieta'),
    pero8: atL(8, 'pero'), mueves8: atL(8, 'mueves'), echas8: atL(8, 'echas'), cafe8: atL(8, 'cafe'), hierve8: atL(8, 'hierve'), golpe8: atL(8, 'golpe'), salta8: atL(8, 'salta'), fuera8: atL(8, 'fuera'),
    fda9: atL(9, 'fda'), estados9: atL(9, 'estados'), avisos9: atL(9, 'avisos'), quemaduras9: atL(9, 'quemaduras'), manos9: atL(9, 'manos'), cara9: atL(9, 'cara'),
    truco10: atL(10, 'truco'), calientes10: atL(10, 'calientes'), mas10: atL(10, 'mas'), mete10: atL(10, 'mete'), palito10: atL(10, 'palito'), madera10: atL(10, 'madera'), vetas10: atL(10, 'vetas'),
    burbujas10: atL(10, 'burbujas'), nacen10: atL(10, 'nacen'), poco10: atL(10, 'poco'),
    micro11: atL(11, 'micro'), cazo11: atL(11, 'cazo'), mandaselo11: atL(11, 'mandaselo'), quien11: atL(11, 'quien'), cafe11: atL(11, 'cafe'), microondas11: atL(11, 'microondas'),
  };
  mats(); buildMats(); S.flow = [];
  await loadEnv(); buildCounter(); buildLights(); cam.near = 0.05; cam.far = 8000; cam.updateProjectionMatrix();
  await buildScene();
  await waitLoads();
  post.uniforms.ca.value = 0.2; post.uniforms.vig.value = 0.22; post.uniforms.bloom.value = 0.5;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s); window.glLost = () => renderer.getContext().isContextLost();
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
