// Spot «El plan lo ponéis vosotros» (Booking.com para «La pandilla low-cost», trabajo de clase de Javi, 19-11-2026): 40 s, 16:9, seis planos.
// Aquí van los 35 primeros segundos en 3D (planos 1–5); el cierre de marca (plano 6) lo hace el montaje con el último fotograma (el selfi).
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
// ---------------------------------------------------------------- EL MUNDO: seis decorados pequeños (maquetas), uno por sitio, separados 40 m en X. 1 unidad = 1 m.
// +X derecha, +Y arriba, +Z hacia la cámara. Cada plano del guion es un decorado y una cámara; entre planos hay CORTE (no barrido).
function fnOf(n) { try { return eval('typeof ' + n + " === 'function' ? " + n + ' : null'); } catch (e) { return null; } }
const O = { lib: 0, bus: 40, kit: 80, bed: 120, sofa: 160, town: 240 };       // origen (x) de cada decorado
const seg = (t, a, b) => clamp((t - a) / (b - a));
// los planos: nombre, inicio, fin (s). 1 la chispa · 2 el grupo responde (tres planos cortos) · 3 comparar · 4 la votación (+ el abrazo) · 5 el viaje (cuatro planos)
const SHOTS = [['lib', 0, 5], ['bus', 5, 6.65], ['kit', 6.65, 8.3], ['bed', 8.3, 10], ['sofa', 10, 20], ['vote', 20, 24.15], ['hug', 24.15, 25],
  ['arrive', 25, 27.4], ['beach', 27.4, 29.7], ['wall', 29.7, 32.1], ['selfie', 32.1, 35.01]].map(s => ({ n: s[0], a: s[1], b: s[2] }));
function shotAt(t) { for (const s of SHOTS) if (t < s.b) return s; return SHOTS[SHOTS.length - 1]; }
// el alojamiento del ejemplo (INVENTADO: nombres, precios y notas de mentira para enseñar cómo se compara)
const STAYS = [{ id: 'A', name: 'Apto. Las Dunas', score: '8,2', word: 'Muy bien', price: 520, col: '#f0a020' }, { id: 'B', name: 'Piso Brisa del Mar', score: '9,1', word: 'Fantástico', price: 352, col: '#2f9e5a' },
  { id: 'C', name: 'Hostal El Faro', score: '6,4', word: 'Agradable', price: 298, col: '#8a5cd0' }];
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
  tarde:  { zen: 0xe8d9c4, hor: 0xf6ead8, gnd: 0xe0d0b8, sunD: [0.3, 0.8, 0.5], sunC: 0xffffff, sunS: 0.0, stars: 0.0, fogC: 0xf3e6d2, fogD: 0.0,
            key: [0xffe2b8, 2.4], keyD: [-0.3, 0.75, 0.6], fill: [0xffd9b0, 0.5], hemi: [0xfff3e0, 0xc9a67c, 0.9], env: 0.8, exp: 1.0 },
  playa:  { zen: 0x2f8fe6, hor: 0xbfe6ff, gnd: 0xe9d9a8, sunD: [-0.35, 0.55, -0.75], sunC: 0xfff4d0, sunS: 0.9, stars: 0.0, fogC: 0xcfeaff, fogD: 0.0012,
            key: [0xfff0cf, 3.1], keyD: [-0.4, 0.75, 0.5], fill: [0xbfe0ff, 0.6], hemi: [0xd8eeff, 0xe8d6a0, 1.0], env: 0.9, exp: 1.0 },
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
// ---------------------------------------------------------------- LOS DECORADOS: biblioteca, autobús, cocina, dormitorio, salón y el pueblo de playa. Cada uno es un grupo en su origen O.<nombre>.
// (Todo genérico: sin marcas ni rótulos reales.)
const stdM = (c, r = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
const litM = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
function boxAt(par, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; par.add(b); return b; }
function cylAt(par, rt, rb, h, m, x, y, z, seg = 20) { const c = cyl(rt, rb, h, m, seg); c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; par.add(c); return c; }
function tileTex(a, b, n = 4, joint = 'rgba(60,50,40,.18)') { return canvasTex(512, 512, (g, w, h) => { const s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * s, j * s, s, s); }
  g.strokeStyle = joint; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); } }); }
function floorAt(par, w, d, m, x = 0, z = 0, y = 0) { const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); f.rotation.x = -Math.PI / 2; f.position.set(x, y, z); f.receiveShadow = true; par.add(f); return f; }
function plant(s = 1, pot = 0xc9643a) { const g = new THREE.Group(), mp = stdM(pot, 0.8), ml = stdM(0x3f8a4b, 0.7); cylAt(g, 0.2, 0.15, 0.36, mp, 0, 0.18, 0); for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), ml); const a = i * 2.4; l.scale.set(0.55, 1.5, 0.3); l.position.set(Math.cos(a) * 0.14, 0.62 + hash(i) * 0.3, Math.sin(a) * 0.14); l.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5); l.castShadow = true; g.add(l); } g.scale.setScalar(s); return g; }
function frameArt(par, w, h, x, y, z, draw, ry = 0) { const t = canvasTex(256, Math.round(256 * h / w), draw), g = new THREE.Group(); boxAt(g, w + 0.05, h + 0.05, 0.03, stdM(0x2b2620, 0.6), 0, 0, 0); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), stdM(0xffffff, 0.8, { map: t })); p.position.z = 0.017; g.add(p); g.position.set(x, y, z); g.rotation.y = ry; par.add(g); return g; }
const artSun = (c1, c2, c3) => (g, w, h) => { g.fillStyle = c1; g.fillRect(0, 0, w, h); g.fillStyle = c2; g.beginPath(); g.arc(w * 0.62, h * 0.42, w * 0.2, 0, 7); g.fill(); g.fillStyle = c3; g.fillRect(0, h * 0.66, w, h * 0.34); };
// libros de colores en una balda (de x0 a x1)
function booksRow(par, x0, x1, y, z, seed = 1, d = 0.2) { let x = x0, i = 0; const cols = [0xc8553d, 0x2f6fd0, 0xe0a526, 0x3f8a4b, 0x7a5c8a, 0xf1ead9, 0x2b2d42, 0xd97aa6];
  while (x < x1 - 0.03) { const w = 0.03 + hash(seed * 7 + i) * 0.035, h = 0.2 + hash(seed * 3 + i * 1.7) * 0.09; if (hash(seed + i * 2.3) > 0.12) { const b = boxAt(par, w, h, d, stdM(cols[Math.floor(hash(seed * 11 + i) * cols.length)], 0.75), x + w / 2, y + h / 2, z); b.rotation.z = hash(i + seed) > 0.9 ? 0.12 : 0; } x += w + 0.004; i++; } }
function shelfUnit(par, x, z, w = 1.8, h = 2.2, ry = 0, seed = 1) { const g = new THREE.Group(), m = stdM(0x8a623c, 0.6); boxAt(g, w, h, 0.03, m, 0, h / 2, -0.15); boxAt(g, 0.04, h, 0.32, m, -w / 2, h / 2, 0); boxAt(g, 0.04, h, 0.32, m, w / 2, h / 2, 0);
  for (let i = 0; i < 6; i++) { const y = 0.06 + i * (h - 0.1) / 5; boxAt(g, w, 0.035, 0.32, m, 0, y, 0); if (i < 5) booksRow(g, -w / 2 + 0.05, w / 2 - 0.05, y + 0.02, 0.02, seed * 13 + i); } g.position.set(x, 0, z); g.rotation.y = ry; par.add(g); return g; }
function simpleChair(par, x, z, ry, col = 0x8a623c) { const g = new THREE.Group(), m = stdM(col, 0.6); boxAt(g, 0.42, 0.04, 0.42, m, 0, 0.44, 0); boxAt(g, 0.42, 0.42, 0.035, m, 0, 0.74, -0.2); for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) boxAt(g, 0.035, b < 0 ? 0.95 : 0.44, 0.035, m, a, b < 0 ? 0.475 : 0.22, b); g.position.set(x, 0, z); g.rotation.y = ry; par.add(g); return g; }
// hoja de apuntes (con renglones a boli y subrayados)
function notesSheet(par, x, y, z, ry = 0, seed = 1, w = 0.21, h = 0.297) { const t = canvasTex(256, 362, (g, W2, H2) => { g.fillStyle = '#fdfcf6'; g.fillRect(0, 0, W2, H2); g.fillStyle = 'rgba(255,214,60,.55)'; for (let i = 0; i < 3; i++) g.fillRect(24, 60 + hash(seed + i) * 240, 60 + hash(seed * 2 + i) * 120, 14);
    g.strokeStyle = 'rgba(30,40,90,.75)'; g.lineWidth = 2.2; for (let i = 1; i < 16; i++) { g.beginPath(); let xx = 22; g.moveTo(xx, i * 21 + 12); const end = W2 - 26 - hash(i * seed) * 90; while (xx < end) { xx += 6 + hash(xx * i + seed) * 9; g.lineTo(xx, i * 21 + 13 - hash(xx + seed) * 8); } g.stroke(); } });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), stdM(0xffffff, 0.9, { map: t })); p.rotation.set(-Math.PI / 2, 0, ry); p.position.set(x, y, z); p.receiveShadow = true; par.add(p); return p; }

// ================= 1 · BIBLIOTECA: una mesa larga con apuntes, y estanterías al fondo
function buildLib() { const g = new THREE.Group(); g.position.x = O.lib;
  floorAt(g, 16, 12, stdM(0xffffff, 0.55, { map: repTex(woodTex('#b98a5a', '#8a5f36', '#d6ab7a', 3), 5, 4) }));
  boxAt(g, 16, 3.4, 0.2, stdM(0xe9e2d2, 0.9), 0, 1.7, -3.6); boxAt(g, 0.2, 3.4, 12, stdM(0xe4dccb, 0.9), -6, 1.7, 0); boxAt(g, 0.2, 3.4, 12, stdM(0xe4dccb, 0.9), 6, 1.7, 0);
  for (let i = 0; i < 5; i++) shelfUnit(g, -4 + i * 2.0, -3.3, 1.9, 2.4, 0, i + 1);
  const top = stdM(0xffffff, 0.45, { map: repTex(woodTex('#d8b98a', '#b08a58', '#e8cfa6', 6), 2, 1) }), leg = stdM(0x2b2d33, 0.5, { metalness: 0.4 });
  boxAt(g, 2.6, 0.05, 1.15, top, 0, 0.735, 0); for (const [x, z] of [[-1.2, -0.48], [1.2, -0.48], [-1.2, 0.48], [1.2, 0.48]]) boxAt(g, 0.05, 0.71, 0.05, leg, x, 0.355, z);
  boxAt(g, 2.6, 0.05, 1.15, top, 0, 0.735, -1.9); for (const [x, z] of [[-1.2, -2.38], [1.2, -2.38], [-1.2, -1.42], [1.2, -1.42]]) boxAt(g, 0.05, 0.71, 0.05, leg, x, 0.355, z);
  simpleChair(g, 0.02, 0.78, Math.PI); simpleChair(g, -0.85, -0.78, 0); simpleChair(g, 0.7, -1.12, Math.PI); simpleChair(g, -0.6, -2.7, 0);
  // sobre la mesa: apuntes, un libro abierto, fluorescentes, un flexo y un vaso de café para llevar
  const y = 0.7612; notesSheet(g, -0.17, y, 0.2, 0.12, 2); notesSheet(g, -0.3, y + 0.0006, 0.02, -0.22, 5); notesSheet(g, 0.42, y, 0.06, -0.1, 7); notesSheet(g, 0.36, y + 0.0006, -0.17, 0.3, 9); notesSheet(g, -0.62, y, 0.24, 0.05, 11);
  { const b = openBook(0.34, 0.24, 0x2f5fb8, (c, w, h) => textLines(c, 20, 30, w - 40, 16, 18)); b.position.set(-0.05, 0.762, -0.3); b.rotation.y = 0.08; g.add(b); }
  for (const [i, c] of [[0, 0xffe14a], [1, 0xff6fa8], [2, 0x63e07a]]) { const p = cylAt(g, 0.008, 0.008, 0.13, stdM(c, 0.4), 0.3 + i * 0.03, 0.769, 0.33 - i * 0.012, 10); p.rotation.set(Math.PI / 2, 0, 0.25 + i * 0.2); }
  { const p = cylAt(g, 0.0045, 0.0045, 0.145, stdM(0x24304f, 0.4), -0.2, 0.766, 0.22, 8); p.rotation.set(Math.PI / 2, 0, -0.5); }
  { const c = cylAt(g, 0.042, 0.032, 0.11, stdM(0xf4efe4, 0.7), 0.62, 0.815, -0.25); cylAt(g, 0.044, 0.044, 0.012, stdM(0x2b2620, 0.6), 0.62, 0.876, -0.25); boxAt(g, 0.086, 0.045, 0.086, stdM(0xb88a5a, 0.9), 0.62, 0.81, -0.25).visible = false; }
  { const lp = new THREE.Group(); cylAt(lp, 0.09, 0.1, 0.02, leg, 0, 0.01, 0); const a = cylAt(lp, 0.01, 0.01, 0.42, leg, 0, 0.21, 0, 8); const hd = cylAt(lp, 0.05, 0.1, 0.12, stdM(0x2f7d6b, 0.5), 0.08, 0.43, 0); hd.rotation.z = 0.9; const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), litM(0xfff0c8, 1.6)); b.position.set(0.1, 0.4, 0); lp.add(b); lp.position.set(-0.95, 0.76, -0.3); g.add(lp); }
  { const st = new THREE.Group(); for (let i = 0; i < 4; i++) { const b = boxAt(st, 0.2 + hash(i) * 0.04, 0.035, 0.27, stdM([0xc8553d, 0x3f8a4b, 0xe0a526, 0x2b2d42][i], 0.75), hash(i * 3) * 0.02, 0.0175 + i * 0.036, 0); b.rotation.y = (hash(i * 5) - 0.5) * 0.3; } st.position.set(0.95, 0.76, 0.1); g.add(st); }
  // la otra mesa: un portátil y más libros
  { const l = new THREE.Group(); boxAt(l, 0.32, 0.015, 0.22, stdM(0xbfc4cc, 0.4, { metalness: 0.6 }), 0, 0.0075, 0); const s = boxAt(l, 0.32, 0.21, 0.01, stdM(0xbfc4cc, 0.4, { metalness: 0.6 }), 0, 0.115, -0.115); s.rotation.x = -0.2; const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), litM(0xdfe9ff, 0.9)); sc.position.set(0, 0.115, -0.108); sc.rotation.x = -0.2; l.add(sc); l.position.set(-0.8, 0.76, -1.75); g.add(l); }
  g.add(at(plant(1.5), 5.1, 0, -2.6)); g.add(at(plant(1.2, 0x7a8a99), -5.2, 0, -2.4));
  // ventanales (luz de tarde) en la pared izquierda
  for (const z of [-2, 0.4]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.9), litM(0xcfe6ff, 1.15)); w.rotation.y = Math.PI / 2; w.position.set(-5.89, 1.9, z); g.add(w); boxAt(g, 0.06, 2.0, 0.05, stdM(0xf4f1ea, 0.8), -5.86, 1.9, z); }
  return g; }

// ================= 2a · AUTOBÚS: asientos azules, barras amarillas y la ciudad pasando por las ventanas
function buildBus() { const g = new THREE.Group(), U = g.userData; g.position.x = O.bus;
  floorAt(g, 9, 2.7, stdM(0x4a4d55, 0.85), 0, 0.05);
  const pan = stdM(0xe9ecef, 0.6), trim = stdM(0x8d949c, 0.5, { metalness: 0.5 }), seatM = stdM(0x2a57b8, 0.85), seatD = stdM(0x1c3f8f, 0.85), yel = stdM(0xf5c518, 0.35, { metalness: 0.3 });
  for (const z of [-1.28, 1.38]) { boxAt(g, 9, 0.95, 0.06, pan, 0, 0.475, z); boxAt(g, 9, 0.5, 0.06, pan, 0, 2.2, z); for (let x = -4.5; x <= 4.5; x += 1.5) boxAt(g, 0.09, 1.0, 0.07, trim, x, 1.45, z); boxAt(g, 9, 0.05, 0.08, trim, 0, 0.97, z); boxAt(g, 9, 0.05, 0.08, trim, 0, 1.93, z); }
  { const c = boxAt(g, 9, 0.06, 2.7, stdM(0xf2f3f5, 0.8, { emissive: 0xf2f3f5, emissiveIntensity: 0.25 }), 0, 2.45, 0.05); c.castShadow = false; for (let x = -3.6; x <= 3.6; x += 1.8) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.16), litM(0xffffff, 1.5)); l.rotation.x = Math.PI / 2; l.position.set(x, 2.415, 0.05); g.add(l); } }
  // la ciudad: una banda larga de fachadas y árboles que se desliza (textura que se repite)
  const city = canvasTex(2048, 512, (c, w, h) => { const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#9fd0ff'); sky.addColorStop(1, '#e8f3ff'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
    let x = 0, i = 0; while (x < w) { const bw = 150 + hash(i * 3.3) * 170, bh = 230 + hash(i * 7.1) * 200; c.fillStyle = ['#e8d5b5', '#d9b99a', '#c9d3dc', '#f0e2c8', '#d6a98a', '#b9c7b0'][i % 6]; c.fillRect(x, h - bh, bw - 6, bh);
      c.fillStyle = 'rgba(40,60,90,.55)'; for (let yy = h - bh + 26; yy < h - 110; yy += 58) for (let xx = x + 18; xx < x + bw - 44; xx += 48) c.fillRect(xx, yy, 26, 36); c.fillStyle = ['#c0392b', '#2f6fd0', '#3f8a4b', '#e0a526'][i % 4]; c.fillRect(x + 12, h - 96, bw - 30, 20); x += bw; i++; }
    for (let k = 0; k < 9; k++) { const tx = k * 230 + 60; c.fillStyle = '#6b4a2e'; c.fillRect(tx - 5, h - 150, 10, 110); c.fillStyle = '#4c9a55'; c.beginPath(); c.arc(tx, h - 175, 52, 0, 7); c.fill(); } c.fillStyle = '#8f949b'; c.fillRect(0, h - 44, w, 44); });
  city.wrapS = THREE.RepeatWrapping; city.repeat.set(2.6, 1); U.city = city;
  for (const z of [-4.2, 4.4]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(40, 5.2), new THREE.MeshBasicMaterial({ map: city, toneMapped: false })); p.position.set(0, 2.05, z * 1.5); if (z > 0) p.rotation.y = Math.PI; g.add(p); }
  // asientos (miran a +x) a los dos lados del pasillo
  const seat = (x, z) => { const s = new THREE.Group(); const c = rbox(0.44, 0.44, 0.1, seatM, 0.04); c.rotation.x = -Math.PI / 2; c.position.y = 0.45; s.add(c); const b = rbox(0.44, 0.62, 0.09, seatM, 0.05); b.position.set(0, 0.78, 0); b.rotation.y = Math.PI / 2; b.position.x = -0.24; b.rotation.z = 0; s.add(b);
    const hd = rbox(0.3, 0.16, 0.1, seatD, 0.04); hd.rotation.y = Math.PI / 2; hd.position.set(-0.24, 1.12, 0); s.add(hd); boxAt(s, 0.06, 0.4, 0.3, trim, 0, 0.2, 0); const hb = cylAt(s, 0.014, 0.014, 0.4, yel, -0.25, 1.24, 0, 10); hb.rotation.x = Math.PI / 2; s.position.set(x, 0, z); g.add(s); return s; };
  for (let x = -3.3; x <= 3.4; x += 0.95) { if (Math.abs(x - 1.45) > 0.1) { seat(x, -0.98); seat(x, -0.5); } seat(x, 1.08); }
  for (const x of [-2.35, 0.5, 3.35]) { cylAt(g, 0.018, 0.018, 2.4, yel, x, 1.2, 0.3, 10); } { const r = cylAt(g, 0.016, 0.016, 9, yel, 0, 2.1, 0.3, 10); r.rotation.z = Math.PI / 2; }
  for (let i = 0; i < 5; i++) { const s = boxAt(g, 0.02, 0.22, 0.03, stdM(0x2b2d33, 0.7), -2.8 + i * 1.4, 1.98, 0.3); cylAt(g, 0.05, 0.05, 0.012, yel, -2.8 + i * 1.4, 1.84, 0.3, 14).rotation.x = Math.PI / 2; }
  return g; }
function busAt(g, t) { g.userData.city.offset.x = t * 0.22; }

// ================= 2b · COCINA: encimera con armarios, azulejo blanco, nevera y una olla al fuego
function buildKit() { const g = new THREE.Group(); g.position.x = O.kit;
  floorAt(g, 10, 9, stdM(0xffffff, 0.5, { map: repTex(tileTex('#e9e4da', '#cfc7b8', 4), 5, 4.5) }));
  boxAt(g, 10, 3.2, 0.2, stdM(0xf4e9d6, 0.9), 0, 1.6, -1.9); boxAt(g, 0.2, 3.2, 9, stdM(0xf1e4cf, 0.9), -3.6, 1.6, 0); boxAt(g, 0.2, 3.2, 9, stdM(0xf1e4cf, 0.9), 3.9, 1.6, 0);
  { const t = repTex(tileTex('#fbfbf8', '#f4f4ef', 4, 'rgba(120,130,140,.45)'), 9, 1.4); const p = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.75), stdM(0xffffff, 0.35, { map: t })); p.position.set(-0.4, 1.3, -1.795); g.add(p); }
  const cab = stdM(0x3d7a6a, 0.6), topM = stdM(0xf0ece4, 0.4), hand = stdM(0xd9c27a, 0.35, { metalness: 0.7 });
  boxAt(g, 5.6, 0.86, 0.62, cab, -0.4, 0.43, -1.48); boxAt(g, 5.7, 0.05, 0.68, topM, -0.4, 0.885, -1.46);
  for (let i = 0; i < 7; i++) { boxAt(g, 0.76, 0.74, 0.02, stdM(0x448676, 0.6), -2.8 + i * 0.8, 0.45, -1.16); boxAt(g, 0.16, 0.02, 0.02, hand, -2.8 + i * 0.8, 0.74, -1.14); }
  boxAt(g, 5.6, 0.72, 0.36, cab, -0.4, 2.1, -1.62); for (let i = 0; i < 7; i++) { if (i === 3) continue; boxAt(g, 0.76, 0.66, 0.02, stdM(0x448676, 0.6), -2.8 + i * 0.8, 2.1, -1.43); boxAt(g, 0.02, 0.16, 0.02, hand, -2.5 + i * 0.8, 1.9, -1.41); }
  // nevera
  { const f = stdM(0xdfe3e8, 0.35, { metalness: 0.5 }); boxAt(g, 0.78, 1.95, 0.7, f, 2.95, 0.975, -1.45); boxAt(g, 0.74, 0.01, 0.02, stdM(0x8d949c, 0.5), 2.95, 1.3, -1.09); for (const y of [0.9, 1.6]) boxAt(g, 0.03, 0.4, 0.03, stdM(0x8d949c, 0.4, { metalness: 0.7 }), 2.64, y, -1.07);
    for (let i = 0; i < 5; i++) boxAt(g, 0.07, 0.07, 0.006, stdM([0xff6f61, 0xffd166, 0x06d6a0, 0x4a8fc2, 0xf78fb3][i], 0.6), 2.85 + hash(i) * 0.3, 1.45 + hash(i * 3) * 0.35, -1.095).rotation.z = hash(i * 7) - 0.5; }
  // placa con una olla y una sartén; fregadero con ventana encima
  { boxAt(g, 0.6, 0.012, 0.52, stdM(0x1c1d21, 0.2, { metalness: 0.3 }), 1.2, 0.916, -1.46); const pot = cylAt(g, 0.12, 0.12, 0.13, stdM(0xd04a3a, 0.4), 1.07, 0.99, -1.52); for (const s of [-1, 1]) boxAt(g, 0.05, 0.015, 0.03, stdM(0x1c1d21, 0.5), 1.07 + s * 0.14, 1.03, -1.52); cylAt(g, 0.125, 0.125, 0.012, stdM(0xbfc4cc, 0.3, { metalness: 0.7 }), 1.07, 1.06, -1.52);
    cylAt(g, 0.11, 0.09, 0.035, stdM(0x26282e, 0.5), 1.36, 0.94, -1.36); const h = boxAt(g, 0.2, 0.015, 0.025, stdM(0x26282e, 0.5), 1.55, 0.95, -1.3); h.rotation.y = -0.3; }
  { boxAt(g, 0.62, 0.02, 0.42, stdM(0xbfc4cc, 0.3, { metalness: 0.8 }), -1.3, 0.905, -1.46); const tp = cylAt(g, 0.012, 0.012, 0.22, stdM(0xbfc4cc, 0.25, { metalness: 0.9 }), -1.3, 1.02, -1.68, 8); const sp = cylAt(g, 0.01, 0.01, 0.14, stdM(0xbfc4cc, 0.25, { metalness: 0.9 }), -1.3, 1.12, -1.62, 8); sp.rotation.x = Math.PI / 2;
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.66), litM(0xfff0cf, 1.25)); w.position.set(-0.4, 2.1, -1.795 + 0.36); w.visible = false; g.add(w);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.62), litM(0xffe9c0, 1.3)); win.position.set(-0.4, 2.1, -1.79); g.add(win); boxAt(g, 0.03, 0.64, 0.03, stdM(0xf4f1ea, 0.8), -0.4, 2.1, -1.78); boxAt(g, 0.74, 0.03, 0.03, stdM(0xf4f1ea, 0.8), -0.4, 2.1, -1.78); }
  // cosas en la encimera: tostadora, tarros, frutero y una planta
  { const ts = rbox(0.26, 0.17, 0.16, stdM(0xe8e2d6, 0.4), 0.04); ts.position.set(-2.4, 1.0, -1.5); g.add(ts); for (let i = 0; i < 3; i++) { cylAt(g, 0.05, 0.05, 0.14 + i * 0.03, stdM(0xf2ede2, 0.5), -0.2 + i * 0.13, 0.98 + i * 0.015, -1.64); cylAt(g, 0.052, 0.052, 0.02, stdM(0x8a623c, 0.6), -0.2 + i * 0.13, 1.06 + i * 0.03, -1.64); }
    const bowl = cylAt(g, 0.15, 0.08, 0.07, stdM(0xf7f3ea, 0.4), 0.35, 0.945, -1.42); for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), stdM([0xf08a24, 0xe9c229, 0xd43c2f, 0xf08a24, 0x7ab648][i], 0.6)); f.position.set(0.35 + Math.cos(i * 1.3) * 0.06, 0.99 + (i === 4 ? 0.04 : 0), -1.42 + Math.sin(i * 1.3) * 0.06); f.castShadow = true; g.add(f); }
    g.add(at(plant(0.45, 0xf2ede2), -1.95, 0.91, -1.6)); }
  // mesa pequeña con dos sillas y una lámpara colgante; cuadro
  { const t = cylAt(g, 0.5, 0.5, 0.04, stdM(0xe9d7b5, 0.5), -2.2, 0.75, 0.9, 32); cylAt(g, 0.04, 0.04, 0.73, stdM(0x2b2d33, 0.5), -2.2, 0.365, 0.9); cylAt(g, 0.28, 0.3, 0.03, stdM(0x2b2d33, 0.5), -2.2, 0.015, 0.9); simpleChair(g, -2.9, 0.9, Math.PI / 2, 0xd9b98a); simpleChair(g, -2.2, 0.2, 0, 0xd9b98a);
    cylAt(g, 0.004, 0.004, 1.3, stdM(0x2b2d33, 0.5), -2.2, 2.55, 0.9, 6); const sh = cylAt(g, 0.06, 0.24, 0.2, stdM(0xe0a526, 0.5), -2.2, 1.85, 0.9, 24); const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), litM(0xfff0c8, 1.8)); b.position.set(-2.2, 1.78, 0.9); g.add(b); }
  frameArt(g, 0.5, 0.65, 2.0, 1.75, -1.79, artSun('#f7e3c0', '#e85d3a', '#2f6f8f'));
  return g; }

// ================= 2c · DORMITORIO: la cama, guirnalda de luces, pósteres y un escritorio
function buildBed() { const g = new THREE.Group(); g.position.x = O.bed;
  floorAt(g, 9, 8, stdM(0xffffff, 0.55, { map: repTex(woodTex('#c9a070', '#a07a4c', '#dcb98a', 9), 4, 4) }));
  boxAt(g, 9, 3.2, 0.2, stdM(0x2f4d6b, 0.9), 0, 1.6, -1.5); boxAt(g, 0.2, 3.2, 8, stdM(0xe9e2d2, 0.9), -3.2, 1.6, 0); boxAt(g, 0.2, 3.2, 8, stdM(0xe9e2d2, 0.9), 3.6, 1.6, 0);
  { const r = floorAt(g, 2.6, 1.7, stdM(0xe7d9c4, 0.95), 0.2, 0.75, 0.006); }
  // la cama (a lo largo de x; la cabeza a la izquierda)
  const wood = stdM(0x9a6f42, 0.6); boxAt(g, 2.15, 0.26, 1.1, wood, 0, 0.19, -0.75); for (const [x, z] of [[-1, -1.25], [1, -1.25], [-1, -0.25], [1, -0.25]]) boxAt(g, 0.07, 0.1, 0.07, wood, x, 0.05, z); boxAt(g, 0.07, 0.75, 1.1, wood, -1.08, 0.55, -0.75);
  { const m = rbox(2.05, 1.02, 0.22, stdM(0xf4f1ea, 0.9), 0.07); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.43, -0.75); g.add(m); const d = rbox(1.25, 1.06, 0.1, stdM(0xe07a5f, 0.9), 0.045); d.rotation.x = -Math.PI / 2; d.position.set(0.42, 0.56, -0.75); g.add(d);
    const fold = rbox(0.2, 1.06, 0.12, stdM(0xf2cc8f, 0.9), 0.05); fold.rotation.x = -Math.PI / 2; fold.position.set(-0.26, 0.575, -0.75); g.add(fold);
    const pl = rbox(0.5, 0.72, 0.15, stdM(0xfdfcf7, 0.9), 0.07); pl.rotation.x = -Math.PI / 2; pl.position.set(-0.72, 0.6, -0.75); pl.rotation.y = 0; g.add(pl); const cu = rbox(0.34, 0.34, 0.12, stdM(0x81b29a, 0.9), 0.055); cu.position.set(-0.92, 0.78, -1.08); cu.rotation.set(-0.2, 0.3, 0.2); g.add(cu); }
  // mesilla con lámpara
  { boxAt(g, 0.45, 0.5, 0.4, wood, -1.55, 0.25, -1.15); boxAt(g, 0.4, 0.02, 0.02, stdM(0xd9c27a, 0.4, { metalness: 0.7 }), -1.55, 0.32, -0.945); cylAt(g, 0.07, 0.08, 0.02, stdM(0x2b2d33, 0.5), -1.6, 0.51, -1.2); cylAt(g, 0.012, 0.012, 0.22, stdM(0x2b2d33, 0.5), -1.6, 0.62, -1.2, 8);
    const sh = cylAt(g, 0.08, 0.13, 0.17, new THREE.MeshStandardMaterial({ color: 0xffe2b0, roughness: 0.7, emissive: 0xffc878, emissiveIntensity: 1.1 }), -1.6, 0.8, -1.2, 24); sh.castShadow = false; const pl = new THREE.PointLight(0xffc37a, 1.2, 4, 1.6); pl.position.set(-1.5, 0.95, -0.95); g.add(pl); }
  // guirnalda de luces en la pared, pósteres y balda
  for (let i = 0; i < 22; i++) { const x = -2.6 + i * 0.26, y = 2.45 - 0.16 * Math.sin((i % 7) / 6 * Math.PI); const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), litM(0xffd98a, 1.9)); b.position.set(x, y, -1.38); g.add(b); }
  frameArt(g, 0.55, 0.75, -0.6, 1.65, -1.385, artSun('#1d3557', '#f4a261', '#2a9d8f')); frameArt(g, 0.42, 0.42, 0.15, 1.85, -1.385, (c, w, h) => { c.fillStyle = '#f2cc8f'; c.fillRect(0, 0, w, h); c.fillStyle = '#e07a5f'; c.beginPath(); c.moveTo(w * 0.1, h * 0.85); c.lineTo(w * 0.45, h * 0.25); c.lineTo(w * 0.9, h * 0.85); c.fill(); c.fillStyle = '#fdfcf7'; c.beginPath(); c.arc(w * 0.72, h * 0.25, w * 0.09, 0, 7); c.fill(); });
  frameArt(g, 0.42, 0.3, 0.15, 1.42, -1.385, artSun('#bfe6ff', '#fff3b0', '#3d9bd1'));
  boxAt(g, 1.2, 0.035, 0.22, wood, 1.6, 1.75, -1.3); booksRow(g, 1.05, 1.75, 1.77, -1.3, 4, 0.16); g.add(at(plant(0.4, 0xf2ede2), 2.05, 1.77, -1.3));
  // escritorio con portátil y silla; mochila en el suelo
  { boxAt(g, 1.3, 0.04, 0.6, stdM(0xf1ead9, 0.5), 2.6, 0.74, -1.05); for (const [x, z] of [[2.0, -1.3], [3.2, -1.3], [2.0, -0.8], [3.2, -0.8]]) boxAt(g, 0.04, 0.72, 0.04, stdM(0x2b2d33, 0.5), x, 0.36, z); simpleChair(g, 2.6, -0.45, Math.PI, 0x2f4d6b);
    const l = new THREE.Group(); boxAt(l, 0.32, 0.015, 0.22, stdM(0xbfc4cc, 0.4, { metalness: 0.6 }), 0, 0.0075, 0); const s = boxAt(l, 0.32, 0.21, 0.01, stdM(0xbfc4cc, 0.4, { metalness: 0.6 }), 0, 0.115, -0.12); s.rotation.x = -0.2; const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), litM(0x9fc4ff, 0.9)); sc.position.set(0, 0.115, -0.113); sc.rotation.x = -0.2; l.add(sc); l.position.set(2.6, 0.76, -1.1); g.add(l); }
  { const b = rbox(0.32, 0.42, 0.18, stdM(0xe0a526, 0.8), 0.07); b.position.set(1.35, 0.21, -0.1); b.rotation.set(-0.15, 0.5, 0); g.add(b); }
  return g; }

// ================= 3–4 · SALÓN: el sofá, la mesa baja, una lámpara de pie, plantas y cuadros
const SOFA = { z: -0.55, seat: 0.44 }, TBL = { x: 0, y: 0.42, z: 0.95 };
function buildSofa() { const g = new THREE.Group(); g.position.x = O.sofa;
  floorAt(g, 12, 10, stdM(0xffffff, 0.5, { map: repTex(woodTex('#c79a66', '#9a6f42', '#dcb382', 7), 5, 4) }));
  boxAt(g, 12, 3.3, 0.2, stdM(0xf3ead9, 0.9), 0, 1.65, -1.6); boxAt(g, 0.2, 3.3, 10, stdM(0xefe4d0, 0.9), -4.6, 1.65, 0); boxAt(g, 0.2, 3.3, 10, stdM(0xefe4d0, 0.9), 4.6, 1.65, 0); boxAt(g, 12, 0.12, 0.03, stdM(0xfbf8f1, 0.7), 0, 0.06, -1.49);
  floorAt(g, 3.6, 2.6, stdM(0xffffff, 0.95, { map: canvasTex(512, 384, (c, w, h) => { c.fillStyle = '#e8dcc6'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c96f4a'; c.lineWidth = 10; c.strokeRect(22, 22, w - 44, h - 44); c.strokeStyle = '#2f6f8f'; c.lineWidth = 5; c.strokeRect(44, 44, w - 88, h - 88); for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#c96f4a' : '#2f6f8f'; c.beginPath(); c.arc(90 + i * 41, h / 2, 9, 0, 7); c.fill(); } }) }), 0, 0.45, 0.006);
  // sofá de tres plazas (mira a +z)
  { const s = new THREE.Group(), fab = stdM(0x2f7d86, 0.95), fab2 = stdM(0x286c74, 0.95); const base = rbox(2.5, 0.92, 0.3, fab2, 0.08); base.rotation.x = -Math.PI / 2; base.position.set(0, 0.2, 0); s.add(base);
    for (let i = 0; i < 3; i++) { const c = rbox(0.72, 0.72, 0.16, fab, 0.07); c.rotation.x = -Math.PI / 2; c.position.set(-0.73 + i * 0.73, 0.4, 0.08); s.add(c); const b = rbox(0.72, 0.5, 0.2, fab, 0.09); b.position.set(-0.73 + i * 0.73, 0.72, -0.33); b.rotation.x = -0.16; s.add(b); }
    const bk = rbox(2.5, 0.72, 0.2, fab2, 0.09); bk.position.set(0, 0.55, -0.44); s.add(bk); for (const sx of [-1, 1]) { const a = rbox(0.24, 0.5, 0.92, fab2, 0.1); a.position.set(sx * 1.22, 0.42, 0); s.add(a); }
    for (const [x, c] of [[-0.98, 0xf2cc8f], [0.98, 0xe07a5f]]) { const cu = rbox(0.36, 0.36, 0.13, stdM(c, 0.95), 0.06); cu.position.set(x, 0.66, -0.22); cu.rotation.set(-0.3, x < 0 ? 0.4 : -0.4, 0); s.add(cu); }
    for (const [x, z] of [[-1.15, -0.4], [1.15, -0.4], [-1.15, 0.38], [1.15, 0.38]]) cylAt(s, 0.025, 0.02, 0.07, stdM(0x6b4a2e, 0.6), x, 0.035, z, 10); s.position.set(0, 0, SOFA.z); g.add(s); }
  // mesa baja (redondeada) con unas patatas y dos latas
  { const t = rbox(1.25, 0.7, 0.045, stdM(0xffffff, 0.45, { map: repTex(woodTex('#e0c39a', '#b8925e', '#f0d9b5', 11), 1, 1) }), 0.08); t.rotation.x = -Math.PI / 2; t.position.set(TBL.x, TBL.y - 0.0225, TBL.z); g.add(t); for (const [x, z] of [[-0.52, -0.26], [0.52, -0.26], [-0.52, 0.26], [0.52, 0.26]]) { const l = cylAt(g, 0.022, 0.016, 0.4, stdM(0x2b2d33, 0.5), TBL.x + x, 0.2, TBL.z + z, 10); }
    const bw = cylAt(g, 0.11, 0.07, 0.06, stdM(0xf7f3ea, 0.4), 0.4, TBL.y + 0.03, TBL.z - 0.12, 24); for (let i = 0; i < 12; i++) { const c = cylAt(g, 0.022, 0.022, 0.004, stdM(0xf0c35a, 0.6), 0.4 + (hash(i) - 0.5) * 0.12, TBL.y + 0.062 + hash(i * 3) * 0.02, TBL.z - 0.12 + (hash(i * 7) - 0.5) * 0.12, 10); c.rotation.set(hash(i) * 2, 0, hash(i * 5) * 2); }
    for (const [x, z, c] of [[-0.42, -0.14, 0xe5533d], [-0.33, 0.05, 0x2f9e6b]]) { cylAt(g, 0.031, 0.031, 0.115, stdM(c, 0.35, { metalness: 0.5 }), x, TBL.y + 0.0575, TBL.z + z, 20); cylAt(g, 0.027, 0.031, 0.006, stdM(0xcfd4da, 0.3, { metalness: 0.8 }), x, TBL.y + 0.118, TBL.z + z, 20); } }
  // lámpara de pie, plantas, estantería, cuadros y ventana
  { cylAt(g, 0.16, 0.18, 0.03, stdM(0x2b2d33, 0.5), -2.0, 0.015, -0.9); cylAt(g, 0.014, 0.014, 1.6, stdM(0x2b2d33, 0.5), -2.0, 0.8, -0.9, 8); const sh = cylAt(g, 0.16, 0.24, 0.3, new THREE.MeshStandardMaterial({ color: 0xffe9c4, roughness: 0.7, emissive: 0xffc878, emissiveIntensity: 0.9 }), -2.0, 1.7, -0.9, 28); sh.castShadow = false; const pl = new THREE.PointLight(0xffc98a, 1.0, 5, 1.6); pl.position.set(-1.85, 1.55, -0.6); g.add(pl); }
  g.add(at(plant(1.7, 0xf2ede2), 2.2, 0, -1.0)); g.add(at(plant(1.0), -3.4, 0, -1.1)); shelfUnit(g, 3.6, -1.3, 1.4, 2.0, 0, 9);
  frameArt(g, 0.75, 0.55, -0.55, 1.95, -1.485, artSun('#f6d6ad', '#e76f51', '#264653')); frameArt(g, 0.42, 0.55, 0.3, 1.95, -1.485, artSun('#bfe6ff', '#ffe08a', '#2a9d8f')); frameArt(g, 0.42, 0.42, 0.95, 2.0, -1.485, (c, w, h) => { c.fillStyle = '#fdf6e3'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e07a5f'; c.lineWidth = 14; c.beginPath(); c.arc(w / 2, h / 2, w * 0.28, 0, 7); c.stroke(); });
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), litM(0xffe2b8, 1.25)); w.position.set(-2.9, 1.75, -1.49); g.add(w); boxAt(g, 0.04, 1.52, 0.04, stdM(0xfbf8f1, 0.7), -2.9, 1.75, -1.48); boxAt(g, 1.32, 0.04, 0.04, stdM(0xfbf8f1, 0.7), -2.9, 1.75, -1.48); for (const sx of [-1, 1]) boxAt(g, 0.3, 1.9, 0.05, stdM(0xe9c9a0, 0.95), -2.9 + sx * 0.8, 1.7, -1.44); }
  return g; }

// ================= 5 · EL PUEBLO DE PLAYA: mar al fondo (−z), arena, un murete blanco y el paseo, y detrás la calle de casas blancas
const TOWN = { wall: -2, sea: -15, street: 22, houses: 18.2 };
function palm(h = 4.2, lean = 0.25, seed = 1) { const g = new THREE.Group(), mt = stdM(0x9a7b55, 0.9), ml = stdM(0x3f9a4f, 0.75, { side: THREE.DoubleSide }); const n = 7; let x = 0;
  for (let i = 0; i < n; i++) { const y0 = i * h / n, s = cylAt(g, 0.11 - i * 0.006, 0.12 - i * 0.006, h / n + 0.03, mt, x + lean * (i + 0.5) / n * (i / n) * 2, y0 + h / n / 2, 0, 10); s.rotation.z = -lean * (i / n) * 0.9; x = lean * ((i + 1) / n) * ((i + 1) / n) * 1.6; }
  const top = new THREE.Group(); top.position.set(x, h, 0); g.add(top); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + hash(seed + i) * 0.4, f = new THREE.Group(); f.rotation.y = a; top.add(f);
    for (let k = 0; k < 5; k++) { const sgm = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.36 - k * 0.05), ml); sgm.rotation.set(-Math.PI / 2 + 0.0, 0, 0); const u = k / 4; sgm.position.set(0, 0.25 - u * u * 0.95 + (k === 0 ? 0 : 0.06), 0.2 + k * 0.38); sgm.rotation.x = -Math.PI / 2 + 0.25 + u * 0.75; sgm.castShadow = true; f.add(sgm); } }
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), stdM(0x6b4a2e, 0.8)); c.position.set(Math.cos(i * 2.1) * 0.12, -0.08, Math.sin(i * 2.1) * 0.12); top.add(c); } return g; }
function parasol(col = 0xe5533d, col2 = 0xfdfcf7) { const g = new THREE.Group(); cylAt(g, 0.02, 0.02, 2.1, stdM(0xf4f1ea, 0.5), 0, 1.05, 0, 8); const t = canvasTex(256, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#' + new THREE.Color(col).getHexString() : '#' + new THREE.Color(col2).getHexString(); c.fillRect(i * w / 8, 0, w / 8, h); } });
  const c = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.42, 16, 1, true), stdM(0xffffff, 0.8, { map: t, side: THREE.DoubleSide })); c.position.y = 2.1; c.castShadow = true; g.add(c); g.rotation.z = 0.08; return g; }
function house(w, h, d, seed) { const g = new THREE.Group(), wh = stdM(0xfbf9f3, 0.9), cols = [0x2f6fd0, 0x1f9e9a, 0xe07a5f, 0xe0a526, 0x3f8a4b], c = stdM(cols[seed % cols.length], 0.6), dark = stdM(0x33414f, 0.4);
  boxAt(g, w, h, d, wh, 0, h / 2, 0); boxAt(g, w + 0.14, 0.14, d + 0.14, wh, 0, h + 0.07, 0); boxAt(g, w, 0.35, 0.06, stdM(0xe9e2d2, 0.9), 0, 0.175, d / 2 + 0.03);
  boxAt(g, 0.95, 2.05, 0.08, c, -w * 0.22, 1.025, d / 2 + 0.02); boxAt(g, 0.06, 0.06, 0.06, stdM(0xd9c27a, 0.3, { metalness: 0.8 }), -w * 0.22 + 0.32, 1.05, d / 2 + 0.07);
  const nf = Math.max(1, Math.round(h / 3)); for (let f = 0; f < nf; f++) for (const x of f === 0 ? [w * 0.22] : [-w * 0.22, w * 0.22]) { const y = 1.75 + f * 2.9; if (y + 0.8 > h) continue; boxAt(g, 0.9, 1.1, 0.05, dark, x, y, d / 2 + 0.01); for (const sx of [-1, 1]) boxAt(g, 0.42, 1.14, 0.05, c, x + sx * 0.68, y, d / 2 + 0.04);
    if (f > 0) { boxAt(g, 1.5, 0.06, 0.5, wh, x, y - 0.75, d / 2 + 0.25); for (let i = 0; i < 7; i++) boxAt(g, 0.025, 0.5, 0.025, stdM(0x2b2d33, 0.5), x - 0.7 + i * 0.233, y - 0.47, d / 2 + 0.48); boxAt(g, 1.5, 0.03, 0.03, stdM(0x2b2d33, 0.5), x, y - 0.22, d / 2 + 0.48); }
    else { const pot = cylAt(g, 0.13, 0.1, 0.22, stdM(0xc9643a, 0.8), x + 0.9, 0.11, d / 2 + 0.35); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), stdM(seed % 2 ? 0xd9488f : 0xe5533d, 0.8)); fl.position.set(x + 0.9, 0.38, d / 2 + 0.35); fl.castShadow = true; g.add(fl); } }
  if (seed % 3 === 0) { const aw = boxAt(g, 1.6, 0.04, 0.9, stdM(cols[(seed + 2) % cols.length], 0.8), -w * 0.22, 2.4, d / 2 + 0.42); aw.rotation.x = 0.3; }
  return g; }
function buildTown() { const g = new THREE.Group(), U = g.userData; g.position.x = O.town;
  // arena, mar (con una franja clara en la orilla) y espuma
  floorAt(g, 400, 60, stdM(0xf0d48a, 0.95), 0, -20, 0); const sea = floorAt(g, 4000, 3000, stdM(0x1c9fc7, 0.22, { metalness: 0.15 }), 0, TOWN.sea - 1500 - 2, 0.03); sea.receiveShadow = false; U.sea = sea;
  const sh = floorAt(g, 400, 9, new THREE.MeshStandardMaterial({ color: 0x6fd6e3, roughness: 0.2, transparent: true, opacity: 0.75 }), 0, TOWN.sea - 5.5, 0.045); sh.receiveShadow = false;
  const foam = floorAt(g, 400, 0.5, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), 0, TOWN.sea - 1, 0.05); U.foam = foam;
  // paseo (baldosas claras) con su murete blanco; y la calle
  floorAt(g, 400, TOWN.street + 8 - TOWN.wall, stdM(0xffffff, 0.8, { map: repTex(tileTex('#e3d3bb', '#d8c6aa', 4, 'rgba(120,100,70,.3)'), 100, 7) }), 0, (TOWN.street + 8 + TOWN.wall) / 2, 0.02);
  boxAt(g, 400, 0.55, 0.42, stdM(0xfbf9f3, 0.9), 0, 0.275, TOWN.wall); boxAt(g, 400, 0.06, 0.5, stdM(0x2f6fd0, 0.6), 0, 0.58, TOWN.wall); boxAt(g, 400, 0.12, 0.43, stdM(0x2f6fd0, 0.6), 0, 0.06, TOWN.wall);
  // palmeras a lo largo del paseo y sombrillas con toallas en la arena
  for (let i = -6; i <= 6; i++) { const p = palm(4.0 + hash(i) * 1.2, (hash(i * 3) - 0.5) * 0.7, i); p.position.set(i * 7 + 2.5, 0, TOWN.wall + 2.2 + hash(i * 5)); p.rotation.y = hash(i * 9) * 6; g.add(p); }
  const pc = [0xe5533d, 0x2f6fd0, 0xe0a526, 0x1f9e9a, 0xd9488f]; for (let i = 0; i < 14; i++) { const x = -42 + i * 6.5 + hash(i) * 2, z = -5.5 - hash(i * 3) * 5.5; if (Math.abs(x) < 5) continue; const p = parasol(pc[i % 5]); p.position.set(x, 0, z); g.add(p); const tw = boxAt(g, 0.8, 0.02, 1.7, stdM(pc[(i + 2) % 5], 0.95), x + 0.7, 0.012, z + 0.3); tw.rotation.y = hash(i) - 0.5; }
  // casas blancas de la calle (fachada hacia +z) y, enfrente, otra hilera que cierra el fondo de la calle
  for (let i = -7; i <= 7; i++) { const w = 4.6 + hash(i * 1.3) * 1.6, h = 3.4 + Math.floor(hash(i * 2.7) * 2.2) * 2.9, hs = house(w, h, 5, i + 20); hs.position.set(i * 6.3, 0, TOWN.houses - 2.5); g.add(hs); }
  for (let i = -6; i <= 6; i++) { const p = palm(3.6 + hash(i * 2) * 0.8, 0.2, i + 40); p.position.set(i * 9.5 - 3, 0, TOWN.houses + 1.0); g.add(p); }
  // farolas y un banco
  for (let i = -5; i <= 5; i++) { cylAt(g, 0.04, 0.05, 3.2, stdM(0x2b2d33, 0.5), i * 9 + 5, 1.6, TOWN.houses + 0.7, 8); const l = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), stdM(0xfdfcf7, 0.3)); l.position.set(i * 9 + 5, 3.3, TOWN.houses + 0.7); g.add(l); }
  // veleros lejanos
  for (let i = 0; i < 5; i++) { const b = new THREE.Group(); boxAt(b, 3, 0.5, 0.9, stdM(0xfdfcf7, 0.6), 0, 0.25, 0); const s = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([v3(0, 0.5, 0), v3(0, 4.6, 0), v3(1.9, 0.6, 0)]), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); b.add(s); b.position.set(-90 + i * 47 + hash(i) * 20, 0, TOWN.sea - 60 - hash(i * 3) * 120); g.add(b); }
  return g; }
function townAt(g, t) { g.userData.foam.position.z = TOWN.sea - 1 + 0.5 * Math.sin(t * 1.3); g.userData.foam.material.opacity = 0.6 + 0.25 * Math.sin(t * 1.3 + 1); }
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
// ---------------------------------------------------------------- CARAS, MÓVILES, BRAZOS Y OBJETOS
// ---- cara: dos ojos y una boca (sonrisa que crece; boca abierta para gritar de alegría)
function addFace(d) { const J = d.userData.J, dark = new THREE.MeshStandardMaterial({ color: 0x1b1512, roughness: 0.35 }), mm = new THREE.MeshStandardMaterial({ color: 0x8a2f27, roughness: 0.5 }), F = { eyes: [] };
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 12, 10), dark); e.position.set(sx * 0.027, 0.092, 0.0625); J.neck.add(e); F.eyes.push(e);
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.0028, 0.016, 3, 6), d.userData.hairM || dark); b.rotation.z = Math.PI / 2 + sx * 0.12; b.position.set(sx * 0.027, 0.11, 0.0615); J.neck.add(b); }
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0042, 6, 16, Math.PI), mm); m.rotation.set(0.28, 0, Math.PI); m.position.set(0, 0.07, 0.0708); J.neck.add(m); F.mouth = m;
  const o = new THREE.Mesh(new THREE.CircleGeometry(0.02, 18, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ color: 0x5a1712, roughness: 0.6 })); o.position.set(0, 0.072, 0.0735); o.rotation.x = 0.3; J.neck.add(o); F.open = o; o.visible = false;
  d.userData.F = F; return d; }
function smile(d, k, open = 0, t = 0, seed = 0) { const F = d.userData.F; if (!F) return; k = clamp(k); F.open.visible = open > 0.5; F.mouth.visible = !F.open.visible; F.mouth.scale.set(0.55 + 0.45 * k, 0.12 + 0.88 * k, 1); F.open.scale.setScalar(0.9 + 0.25 * open);
  const b = (t * 0.31 + hash(seed * 3.7)) % 1 < 0.035 ? 0.12 : 1; for (const e of F.eyes) e.scale.set(1, b * (1 - 0.25 * k * (open > 0.5 ? 1 : 0)), 1); }
// ---- móvil: cuerpo oscuro y pantalla (textura). El frente es +z y la parte de arriba +y
const PH = { w: 0.074, h: 0.156 };
function phoneModel(tex, col = 0x1c1d21) { const g = new THREE.Group(); const b = rbox(PH.w, PH.h, 0.009, new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.5 }), 0.012); g.add(b);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(PH.w - 0.007, PH.h - 0.008), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); s.position.z = 0.0049; g.add(s); g.userData.scr = s;
  const cm = new THREE.Mesh(new THREE.CircleGeometry(0.008, 16), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.2 })); cm.rotation.y = Math.PI; cm.position.set(0.02, 0.058, -0.0048); g.add(cm); return g; }
// pantalla de chat (fija) para los móviles de los planos cortos
function chatTex(mine) { return canvasTex(270, 570, (g, w, h) => { g.fillStyle = '#efe7dc'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f7a68'; g.fillRect(0, 0, w, 62); g.fillStyle = '#fff'; g.font = '700 24px Inter, sans-serif'; g.fillText('VERANO 🌴', 16, 40);
    const bub = (y, txt, me) => { g.font = '500 19px Inter, sans-serif'; const tw = Math.min(w - 60, g.measureText(txt).width + 24); g.fillStyle = me ? '#d9fdd3' : '#ffffff'; rr(g, me ? w - 14 - tw : 14, y, tw, 40, 12); g.fill(); g.fillStyle = '#1b1b1b'; g.fillText(txt, (me ? w - 14 - tw : 14) + 12, y + 27); };
    bub(90, '¿y si nos vamos?', false); if (mine) bub(144, mine, true); g.fillStyle = '#fff'; rr(g, 12, h - 56, w - 24, 42, 21); g.fill(); }); }
// ---- brazo hasta un punto del mundo (dos huesos): el codo cae hacia atrás/abajo
function armTo(d, side, target, k = 1) { if (k <= 0.001) return; const J = d.userData.J, sh = J['sh' + side], el = J['el' + side]; d.updateMatrixWorld(true);
  const p = sh.parent.worldToLocal(target.clone()).sub(sh.position), L = 0.19, dist = Math.min(p.length(), 2 * L * 0.999), a = Math.acos(dist / (2 * L)), q0 = sh.quaternion.clone(), e0 = el.rotation.x;
  sh.quaternion.setFromUnitVectors(_yn, p.normalize()); sh.rotateX(a); el.rotation.set(-2 * a, 0, 0);
  if (k < 0.999) { const q1 = sh.quaternion.clone(); sh.quaternion.copy(q0).slerp(q1, k); el.rotation.x = lerp(e0, -2 * a, k); } }
const _yn = new THREE.Vector3(0, -1, 0);
const headW = d => wpos(d.userData.J.head);
const handW = (d, side) => wpos(d.userData.J['h' + side]);
// mirar a un punto con la cabeza (giro y cabeceo limitados)
function lookAtPt(d, target, k = 1) { const J = d.userData.J; d.updateMatrixWorld(true); const p = J.chest.worldToLocal(target.clone()).sub(J.neck.position).sub(v3(0, 0.08, 0)); const yaw = clamp(Math.atan2(p.x, p.z), -1.1, 1.1), pit = clamp(-Math.atan2(p.y, Math.hypot(p.x, p.z)), -0.6, 0.85); J.neck.rotation.y = yaw * k; J.neck.rotation.x = pit * k; }
// sostener el móvil delante de la cara: se coloca el móvil (mirando a los ojos) y la mano va a él
function holdPhone(d, ph, o = {}) { const J = d.userData.J; d.updateMatrixWorld(true); const side = o.side || 'R', sx = side === 'R' ? 1 : -1, s = d.userData.s0;
  const P = J.chest.localToWorld(v3((o.x ?? 0.06) * sx, o.y ?? 0.24, o.z ?? 0.2)); ph.position.copy(P); const hw = headW(d); ph.up.set(0, 1, 0); ph.lookAt(hw); if (o.roll) ph.rotateZ(o.roll);
  const grip = P.clone().add(v3(0, -0.05, 0).applyQuaternion(ph.quaternion)).add(v3(0.03 * sx, 0, -0.012).applyQuaternion(ph.quaternion)); armTo(d, side, grip); if (o.both) armTo(d, side === 'R' ? 'L' : 'R', P.clone().add(v3(-0.03 * sx, -0.05, -0.012).applyQuaternion(ph.quaternion)));
  lookAtPt(d, P, o.look ?? 1); return P; }
// ---- maleta con ruedas (se arrastra inclinada) y bocadillo
function suitcase(col) { const g = new THREE.Group(), m = stdM(col, 0.45), dk = stdM(0x26282e, 0.5); const b = rbox(0.4, 0.58, 0.24, m, 0.05); b.position.y = 0.37; g.add(b); for (const y of [0.25, 0.5]) boxAt(g, 0.41, 0.015, 0.245, stdM(new THREE.Color(col).multiplyScalar(0.7).getHex(), 0.5), 0, y, 0);
  for (const sx of [-1, 1]) { cylAt(g, 0.006, 0.006, 0.42, stdM(0xbfc4cc, 0.3, { metalness: 0.8 }), sx * 0.11, 0.86, -0.07, 6); const w = cylAt(g, 0.04, 0.04, 0.03, dk, sx * 0.15, 0.04, -0.08, 12); w.rotation.z = Math.PI / 2; } boxAt(g, 0.26, 0.025, 0.03, dk, 0, 1.07, -0.07); g.userData.handle = v3(0, 1.07, -0.07); return g; }
function dragCase(c, d, side, back = 0.42, tilt = 0.5) { const yaw = d.rotation.y, sx = side === 'R' ? 1 : -1; d.updateMatrixWorld(true); const sh = wpos(d.userData.J['sh' + side]);
  const hx = sh.x + Math.cos(yaw) * (-0.1 * sx) - Math.sin(yaw) * 0.22, hz = sh.z - Math.sin(yaw) * (-0.1 * sx) - Math.cos(yaw) * 0.22, hy = 0.74, H = c.userData.handle;      // la mano, algo detrás del hombro
  c.rotation.set(0, 0, 0); c.rotation.order = 'YXZ'; c.rotation.y = yaw; c.rotation.x = tilt; const off = H.clone().applyEuler(c.rotation); c.position.set(hx - off.x, 0.04, hz - off.z); c.position.y = Math.max(0, hy - off.y); armTo(d, side, v3(hx, c.position.y + off.y, hz)); }
function bocadillo() { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.15, 6, 12), stdM(0xd9a55a, 0.8)); b.rotation.z = Math.PI / 2; b.castShadow = true; g.add(b); const f = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.066), stdM(0x7ab648, 0.8)); g.add(f); const f2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.01, 0.07), stdM(0xe5533d, 0.7)); f2.position.y = 0.008; g.add(f2);
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.09, 12, 1, true), stdM(0xfdfcf7, 0.9, { side: THREE.DoubleSide })); p.rotation.z = Math.PI / 2; p.position.x = -0.05; g.add(p); return g; }
// comer: la mano sube el bocadillo a la boca (k = 0 abajo, 1 en la boca)
function eatAt(d, food, side, k) { const J = d.userData.J, sx = side === 'R' ? 1 : -1; d.updateMatrixWorld(true); const rest = J.chest.localToWorld(v3(0.08 * sx, 0.1, 0.17)), mouth = J.chest.localToWorld(v3(0.02 * sx, 0.385, 0.115)), P = rest.lerp(mouth, sm5(clamp(k))); food.position.copy(P); food.rotation.set(0, d.rotation.y + 0.5 * sx, 0.25 * sx); armTo(d, side, P.clone().add(v3(0, -0.03, 0))); }
// ---- brazo suelto para el plano cenital de la votación: la yema del índice está en el origen y el brazo se aleja por +x
function voteArm(sleeve, skin) { const g = new THREE.Group(), ms = stdM(skin, 0.6), mc = stdM(sleeve, 0.75), cap = (r, l, m, x) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), m); c.rotation.z = Math.PI / 2; c.position.x = x; c.castShadow = true; g.add(c); return c; };
  cap(0.0075, 0.06, ms, 0.037); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), ms); hd.scale.set(1.15, 0.6, 0.95); hd.position.set(0.108, 0.008, 0); hd.castShadow = true; g.add(hd);
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0075, 0.02, 4, 8), ms); f.rotation.z = Math.PI / 2; f.position.set(0.075, -0.004, 0.016 + i * 0.016 - 0.008); f.castShadow = true; g.add(f); }
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.028, 4, 8), ms); th.rotation.set(0, 0.7, Math.PI / 2); th.position.set(0.085, 0.0, -0.034); g.add(th);
  cap(0.027, 0.2, ms, 0.27); cap(0.036, 0.5, mc, 0.62); return g; }
function armPose(a, tip, yaw, tilt = 0.3) { a.position.copy(tip); a.rotation.set(0, yaw, tilt); }

// ---------------------------------------------------------------- PANTALLAS DEL MÓVIL PROTAGONISTA (lienzo 540 × 1160 que se redibuja)
const BK = { blue: '#003580', cta: '#0071c2', yel: '#febb02', ink: '#1a1a1a', grey: '#6b6b6b' };
function scrText(g, txt, x, y, px, w = 700, col = BK.ink, align = 'left') { g.font = `${w} ${px}px Inter, "Noto Color Emoji", sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(txt, x, y); g.textAlign = 'left'; }
// pantalla de bloqueo: se enciende (k) y baja el aviso del grupo (n)
function drawLock(g, w, h, k, n) { g.fillStyle = '#050608'; g.fillRect(0, 0, w, h); if (k <= 0.01) return; g.save(); g.globalAlpha = clamp(k);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ff9a5a'); gr.addColorStop(0.55, '#e0527a'); gr.addColorStop(1, '#3b2a6b'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,240,200,.9)'; g.beginPath(); g.arc(w * 0.5, h * 0.66, 120, 0, 7); g.fill(); g.fillStyle = '#2a1f55'; g.fillRect(0, h * 0.72, w, h * 0.28); g.fillStyle = 'rgba(255,255,255,.14)'; for (let i = 0; i < 6; i++) g.fillRect(w * 0.5 - 150 + i * 14, h * 0.74 + i * 34, 300 - i * 28, 8);
  scrText(g, '17:42', w / 2, 250, 150, 500, '#ffffff', 'center'); scrText(g, 'jueves, 4 de junio', w / 2, 310, 34, 500, 'rgba(255,255,255,.9)', 'center');
  if (n > 0.01) { const y = 400 - (1 - sm5(clamp(n))) * 70; g.globalAlpha = clamp(k) * clamp(n * 1.5); g.fillStyle = 'rgba(255,255,255,.96)'; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 26; g.shadowOffsetY = 8; rr(g, 14, y, w - 28, 240, 40); g.fill(); g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.fillStyle = '#25b34b'; g.beginPath(); g.arc(76, y + 62, 32, 0, 7); g.fill(); g.fillStyle = '#fff'; rr(g, 58, y + 46, 36, 27, 9); g.fill(); g.beginPath(); g.moveTo(62, y + 68); g.lineTo(60, y + 82); g.lineTo(74, y + 72); g.fill();
    scrText(g, 'VERANO 🌴', 124, y + 78, 50, 900); scrText(g, 'ahora', w - 46, y + 74, 28, 500, BK.grey, 'right'); scrText(g, '¿y si nos vamos?', 44, y + 178, 57, 700); }
  g.restore(); }
// tarjeta de un alojamiento (datos de ejemplo inventados)
function stayCard(g, s, x, y, w, h, o = {}) { g.save(); g.globalAlpha *= o.a ?? 1; g.fillStyle = o.sel ? '#e7f1fb' : '#ffffff'; g.shadowColor = 'rgba(0,0,0,.16)'; g.shadowBlur = 14; g.shadowOffsetY = 4; rr(g, x, y, w, h, 22); g.fill(); g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  if (o.sel) { g.strokeStyle = BK.cta; g.lineWidth = 7; rr(g, x, y, w, h, 22); g.stroke(); }
  const ph = h - 32; g.save(); rr(g, x + 16, y + 16, ph * 0.8, ph, 14); g.clip(); const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#bfe6ff'); gr.addColorStop(0.62, '#8fd3f0'); gr.addColorStop(0.63, s.col); gr.addColorStop(1, s.col); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(x + 16 + ph * 0.58, y + 16 + ph * 0.28, ph * 0.11, 0, 7); g.fill(); g.fillStyle = '#fdfcf7'; g.fillRect(x + 16 + ph * 0.14, y + 16 + ph * 0.42, ph * 0.5, ph * 0.4); g.fillStyle = '#33414f'; g.fillRect(x + 16 + ph * 0.24, y + 16 + ph * 0.52, ph * 0.1, ph * 0.12); g.fillRect(x + 16 + ph * 0.44, y + 16 + ph * 0.52, ph * 0.1, ph * 0.12); g.restore();
  const tx = x + 16 + ph * 0.8 + 18, k = h / 200; scrText(g, s.name, tx, y + 50 * k, 29 * k, 900); g.fillStyle = BK.blue; rr(g, tx, y + 68 * k, 72 * k, 52 * k, 10); g.fill(); scrText(g, s.score, tx + 36 * k, y + 105 * k, 32 * k, 900, '#fff', 'center'); scrText(g, s.word, tx + 84 * k, y + 104 * k, 27 * k, 700, BK.ink);
  scrText(g, s.price + ' €', x + w - 20, y + h - 26 * k, 44 * k, 900, BK.ink, 'right'); scrText(g, '4 noches', tx, y + h - 28 * k, 24 * k, 500, BK.grey); g.restore(); }
function appHeader(g, w, title) { g.fillStyle = BK.blue; g.fillRect(0, 0, w, 128); scrText(g, 'Booking.com', 28, 84, 48, 900, '#ffffff'); if (title) scrText(g, title, 28, 196, 42, 900); }
// la votación: tres opciones → todos señalan la B (sel) → queda sola con el botón «Reservar» (ex) → se pulsa (press) → confirmada (ok)
function drawVote(g, w, h, o) { g.fillStyle = '#f2f3f5'; g.fillRect(0, 0, w, h); appHeader(g, w, null); const ex = sm5(clamp(o.ex)), ok = clamp(o.ok);
  g.save(); g.globalAlpha = 1 - ex; scrText(g, '¿Cuál reservamos?', 28, 200, 46, 900); g.restore();
  for (let i = 0; i < 3; i++) { const s = STAYS[i], y0 = 236 + i * 236, isB = i === 1; if (!isB && ex > 0.99) continue; stayCard(g, s, 20, isB ? lerp(y0, 190, ex) : y0, w - 40, 212, { sel: isB && o.sel > 0.5, a: isB ? 1 : 1 - ex }); }
  if (ex > 0.01) { g.save(); g.globalAlpha = ex; scrText(g, 'Total para 4 personas', 30, 480, 30, 500, BK.grey); scrText(g, '352 €', w - 30, 484, 50, 900, BK.ink, 'right'); scrText(g, '88 € por persona', w - 30, 536, 34, 700, '#1f8a4c', 'right'); g.fillStyle = '#d9dde3'; g.fillRect(30, 568, w - 60, 3);
    scrText(g, '✓ Cancelación gratis', 30, 632, 32, 700, '#1f8a4c'); scrText(g, '✓ A 200 m de la playa', 30, 684, 32, 700, '#1f8a4c');
    const p = clamp(o.press), bw = (w - 60) * (1 - 0.04 * p), bh = 132 * (1 - 0.04 * p), bx = w / 2 - bw / 2, by = 800 + (132 - bh) / 2; g.fillStyle = p > 0.5 ? '#00579a' : BK.cta; g.shadowColor = 'rgba(0,60,130,.45)'; g.shadowBlur = 22 * (1 - p); g.shadowOffsetY = 8 * (1 - p); rr(g, bx, by, bw, bh, 18); g.fill(); g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; scrText(g, 'Reservar', w / 2, 800 + 86, 62, 900, '#ffffff', 'center'); g.restore(); }
  if (ok > 0.01) { g.save(); g.globalAlpha = sm5(ok); g.fillStyle = '#ffffff'; g.fillRect(0, 128, w, h - 128); const s = 0.6 + 0.4 * pop(o.ok, 0, 1); g.translate(w / 2, 440); g.scale(s, s); g.fillStyle = '#1f9d55'; g.beginPath(); g.arc(0, 0, 118, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 26; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-52, 4); g.lineTo(-14, 44); g.lineTo(56, -36); g.stroke(); g.setTransform(1, 0, 0, 1, 0, 0);
    scrText(g, '¡Reserva', w / 2, 680, 76, 900, BK.ink, 'center'); scrText(g, 'confirmada!', w / 2, 766, 76, 900, BK.ink, 'center'); scrText(g, 'Piso Brisa del Mar · 4 noches', w / 2, 846, 32, 500, BK.grey, 'center'); g.restore(); } }
// punto del mundo de un píxel (u, v) de la pantalla del móvil protagonista cuando está tumbado en la mesa
function scrPt(ph, u, v, lift = 0.004) { const s = ph.scale.x; return ph.localToWorld(v3((u / 540 - 0.5) * (PH.w - 0.007), (0.5 - v / 1160) * (PH.h - 0.008), 0.0049 + lift / s)); }
// ---------------------------------------------------------------- LA ESCENA Y SU COREOGRAFÍA (segundos del guion técnico; cada plano tiene su decorado)
// 0–5 biblioteca: llega el aviso y A coge el móvil · 5–10 responden B (bus), C (cocina) y D (cama) · 10–20 los cuatro en el sofá comparan
// 20–24 votación cenital y «Reservar» · 24–25 abrazo · 25–35 el viaje: llegan con maletas, corren al mar, comen en el murete y se hacen el selfi.
let TL = {};
const trap = (x, e = 0.16) => { x = clamp(x); const v = 1 / (1 - e); return x < e ? v * x * x / (2 * e) : x > 1 - e ? 1 - v * (1 - x) * (1 - x) / (2 * e) : v * (x - e / 2); };
const bump = (t, a, b, fi = 0.25, fo = 0.3) => win(t, a, fi) * (1 - win(t, b, fo));               // 0→1→0 suave entre a y b
function poseSit(d, k = 1) { poseZero(d); const J = d.userData.J; J.hip.position.y = lerp(0.5, 0.5 / d.userData.s0, k); J.hpL.rotation.x = J.hpR.rotation.x = -1.5 * k; J.knL.rotation.x = J.knR.rotation.x = 1.5 * k; }
function handsLap(d) { const J = d.userData.J; J.shL.rotation.x = J.shR.rotation.x = -0.45; J.elL.rotation.x = J.elR.rotation.x = -0.9; J.shL.rotation.z = 0.12; J.shR.rotation.z = -0.12; }
function armsUp(d, k = 1, t = 0, ph = 0) { const J = d.userData.J, w = 0.18 * Math.sin(t * 11 + ph); J.shL.rotation.x = lerp(J.shL.rotation.x, -2.75 + w, k); J.shR.rotation.x = lerp(J.shR.rotation.x, -2.75 - w, k); J.shL.rotation.z = lerp(J.shL.rotation.z, -0.35, k); J.shR.rotation.z = lerp(J.shR.rotation.z, 0.35, k); J.elL.rotation.x = lerp(J.elL.rotation.x, -0.35, k); J.elR.rotation.x = lerp(J.elR.rotation.x, -0.35, k); }
const PEOPLE = { A: { shirt: 0xf2664b, pants: 0x3b4f7a, skin: 0xe6b996, hair: 0x4a2a16, hairStyle: 'ponytail', scale: 1.55 }, B: { shirt: 0x2f9e6b, pants: 0xcbb894, skin: 0xc68a62, hair: 0x1c1410, scale: 1.66 },
  C: { shirt: 0xf2b632, pants: 0x2b2d42, skin: 0xd9a27c, hair: 0x8a5a2a, hairStyle: 'ponytail', scale: 1.52 }, D: { shirt: 0x7d5fd0, pants: 0x55606e, skin: 0xe6b996, hair: 0x3a2618, scale: 1.62 } };
async function buildScene() {
  TL = { on: 1.0, notif: 1.15, grab0: 3.05, grab1: 3.75, lift1: 4.9, bub: [5.5, 7.1, 8.8], panel: 10.7, sort: 11.2, rev: K['mirad_1'], split: K['sale_2'], div: K['dividimos_2'], no: K['uf_3'], si: K['este_4'],
    vota: K['votamos_5'], c3: K['tres_5'], c2: K['dos_5'], c1: K['uno_5'], snap: 34.2 };
  TL.point = Math.min(TL.c1 + 0.35, 22.3); TL.ex = TL.point + 0.42; TL.press = TL.ex + 0.62; TL.ok = TL.press + 0.14; TL.fly = TL.ok + 0.2;      // todos señalan → queda «Reservar» → D pulsa → confirmada
  S.sets = { lib: buildLib(), bus: buildBus(), kit: buildKit(), bed: buildBed(), sofa: buildSofa(), town: buildTown() }; for (const k in S.sets) scene.add(S.sets[k]);
  S.P = {}; for (const k in PEOPLE) { const d = addFace(gtaDoll(PEOPLE[k])); d.rotation.order = 'YXZ'; scene.add(d); S.P[k] = d; }
  { const cp = dollCap(0xf5f1e6); S.P.B.userData.J.neck.add(cp); S.capB = cp; const c2 = dollCap(0x2f6fd0); S.P.D.userData.J.neck.add(c2); c2.rotation.y = Math.PI; S.capD = c2; S.hairBD = ['B', 'D'].flatMap(k => S.P[k].userData.J.neck.children.filter(c => c.isMesh && c.material.color.getHex() === PEOPLE[k].hair && c.geometry.type === 'SphereGeometry')); }
  // figurantes
  const xc = [0x4a8fc2, 0xd97aa6, 0xe39b3b, 0x8d6cab, 0xc8553d, 0x5aa469]; S.X = xc.map((c, i) => { const d = addFace(gtaDoll({ shirt: c, pants: [0x3a4660, 0x2b2d42, 0x6b5a48][i % 3], skin: [0xd9a27c, 0xe6b996, 0xc68a62][i % 3], hair: [0x1c1410, 0x5a3a22, 0x8a5a2a, 0x2c2c30][i % 4], hairStyle: i % 2 ? 'ponytail' : undefined, scale: 1.5 + hash(i) * 0.14 })); scene.add(d); return d; });
  // móviles: el protagonista (pantalla que cambia) y los de B, C y D con el chat
  S.heroTex = canvasTex(540, 1160, g => { g.fillStyle = '#050608'; g.fillRect(0, 0, 540, 1160); }); S.ph = phoneModel(S.heroTex); scene.add(S.ph);
  S.phB = phoneModel(chatTex('¡¡SÍ!!'), 0x2b6cb0); S.phC = phoneModel(chatTex('¿cuánto nos sale?'), 0xd9488f); S.phD = phoneModel(chatTex('yo pongo mis ahorros'), 0x1c1d21); scene.add(S.phB, S.phC, S.phD);
  S.cases = [0xe5533d, 0x2f6fd0, 0xe0a526, 0x1f9e9a].map(c => { const s = suitcase(c); scene.add(s); return s; }); S.food = [0, 1, 2, 3].map(() => { const b = bocadillo(); scene.add(b); return b; });
  S.arms = ['A', 'B', 'C', 'D'].map(k => { const a = voteArm(PEOPLE[k].shirt, PEOPLE[k].skin); scene.add(a); return a; });
}
function heroDraw(fn) { const U = S.heroTex.userData; fn(U.g, 540, 1160); S.heroTex.needsUpdate = true; }
const SETOF = { lib: 'lib', bus: 'bus', kit: 'kit', bed: 'bed', sofa: 'sofa', vote: 'sofa', hug: 'sofa', arrive: 'town', beach: 'town', wall: 'town', selfie: 'town' };
const MOODOF = { lib: 'dia', bus: 'dia', kit: 'tarde', bed: 'tarde', sofa: 'tarde', town: 'playa' };
function stageAt(t, st) {
  NOW = t; const sh = shotAt(t), n = sh.n, set = SETOF[n], P = S.P, { A, B, C, D } = P, ox = O[set], vz = voice(t), u = t - sh.a;
  for (const k in S.sets) S.sets[k].visible = k === set; moodSet(MOODOF[set]); lightsAt(st.l, Math.max(2.2, st.p.distanceTo(st.l) * 1.3));
  for (const d of [A, B, C, D, ...S.X]) { d.visible = false; d.position.set(0, 0, 0); d.rotation.set(0, 0, 0); poseZero(d); smile(d, 0.35, 0, t, d.id); }
  for (const o of [S.ph, S.phB, S.phC, S.phD, ...S.cases, ...S.food, ...S.arms]) o.visible = false; S.ph.scale.setScalar(1); S.ph.up.set(0, 1, 0); S.capB.visible = S.capD.visible = set === 'town'; for (const h of S.hairBD) h.visible = set !== 'town';
  const put = (d, x, y, z, ry = 0) => { d.visible = true; d.position.set(ox + x, y, z); d.rotation.y = ry; return d.userData.J; };
  const sitX = (d, x, z, ry, y = 0.08) => { const J = put(d, x, y, z, ry); poseSit(d); handsLap(d); return J; };

  if (n === 'lib') {
    // ---- 1 · LA CHISPA: el móvil entre los apuntes; se enciende con el aviso del grupo y la mano de A lo coge
    const J = sitX(A, 0.02, 0.8, Math.PI, 0.07); J.chest.rotation.x = 0.22; J.neck.rotation.x = 0.45;
    sitX(S.X[0], -0.85, -0.8, 0, 0.07).chest.rotation.x = 0.3; S.X[0].userData.J.neck.rotation.x = 0.5; sitX(S.X[1], 0.7, -1.14, Math.PI, 0.07).chest.rotation.x = 0.25; sitX(S.X[2], -0.6, -2.72, 0, 0.07).neck.rotation.x = 0.4;
    const on = seg(t, TL.on, TL.on + 0.22), nf = seg(t, TL.notif, TL.notif + 0.45), buzz = bump(t, TL.on, TL.on + 0.55, 0.05, 0.2), g1 = sm5(seg(t, TL.grab0, TL.grab1)), lf = sm5(seg(t, TL.grab1 + 0.05, TL.lift1));
    heroDraw((g, w, h) => drawLock(g, w, h, on, nf));
    const ph = S.ph; ph.visible = true; const p0 = v3(ox + 0.13 + 0.0012 * buzz * Math.sin(t * 190), 0.7665, 0.2), p1 = v3(ox + 0.17, 0.9, 0.3); ph.position.lerpVectors(p0, p1, lf);
    const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.1 + 0.02 * buzz * Math.sin(t * 170))), q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.15, 0, -0.06)); ph.quaternion.copy(q0).slerp(q1, lf);
    // la mano entra por abajo a la derecha (brazo con dedos), agarra el móvil por el borde y lo levanta; los brazos del muñeco quedan fuera de plano
    armTo(A, 'L', v3(ox + 0.42, 0.79, 0.56)); armTo(A, 'R', v3(ox - 0.2, 0.785, 0.34));
    { const a = S.arms[0]; a.visible = true; const out = v3(ox + 0.5, 0.86, 0.62), grip = ph.position.clone().add(v3(-0.012, 0.014 + 0.006 * lf, 0.052 + 0.014 * lf)); armPose(a, out.lerp(grip, g1), -0.62 + 0.2 * lf, 0.3 + 0.25 * lf); }
    const lk = win(t, TL.notif + 0.1, 0.35); if (lk > 0) { J.neck.rotation.y = -0.25 * lk; } smile(A, 0.35 + 0.65 * win(t, 1.8, 0.6), 0, t, 1);
  } else if (n === 'bus') {
    // ---- 2a · B, en el autobús: lee, sonríe y celebra con el puño
    busAt(S.sets.bus, t); const J = sitX(B, 0.5, -0.5, Math.PI / 2, 0.1); J.chest.rotation.x = 0.06; S.phB.visible = true; holdPhone(B, S.phB, { y: 0.3, z: 0.27, look: 0.55 });
    const k = win(t, TL.bub[0] + 0.1, 0.25), w = Math.sin((t - TL.bub[0]) * 16); J.shL.rotation.x = lerp(J.shL.rotation.x, -2.3 + 0.2 * w, k); J.elL.rotation.x = lerp(J.elL.rotation.x, -1.5, k); J.shL.rotation.z = lerp(J.shL.rotation.z, -0.3, k); J.neck.rotation.x -= 0.15 * k; smile(B, 0.3 + 0.7 * win(t, 5.25, 0.25), k > 0.5 ? 1 : 0, t, 2);
    B.position.y += 0.012 * Math.sin(t * 23) * 0.5; sitX(S.X[0], -1.4, -0.98, Math.PI / 2, 0.1); sitX(S.X[1], 2.4, 1.08, Math.PI / 2, 0.1); sitX(S.X[2], -2.35, 1.08, Math.PI / 2, 0.1); sitX(S.X[3], -0.45, -0.98, Math.PI / 2, 0.1); S.X[3].userData.J.neck.rotation.y = -0.9; J.neck.rotation.y -= 0.42 * k; J.neck.rotation.x -= 0.12 * k;
  } else if (n === 'kit') {
    // ---- 2b · C, en la cocina, apoyada en la encimera: escribe con los pulgares y se ríe
    const J = put(C, 0.25, 0, -0.96, 0.28); J.hip.rotation.x = -0.08; J.chest.rotation.x = 0.1; J.hpL.rotation.x = -0.12; J.knL.rotation.x = 0.2; S.phC.visible = true; holdPhone(C, S.phC, { both: true, x: 0.0, y: 0.29, z: 0.25, look: 0.5 });
    const k = win(t, TL.bub[1] - 0.2, 0.3); J.neck.rotation.z = 0.14 * k; J.chest.rotation.z = 0.04 * Math.sin(t * 3); smile(C, 0.3 + 0.7 * win(t, 6.95, 0.3), 0, t, 3);
  } else if (n === 'bed') {
    // ---- 2c · D, tumbado en la cama con el móvil sobre la cara; patalea de alegría
    D.visible = true; D.position.set(ox + 0.92, 0.705, -0.75); D.rotation.set(-Math.PI / 2, Math.PI / 2, 0); const J = D.userData.J, k = win(t, TL.bub[2] - 0.1, 0.3), w = Math.sin((t - TL.bub[2]) * 15);
    J.hpR.rotation.x = -0.95 - 0.25 * k * Math.max(0, w); J.knR.rotation.x = 1.7; J.hpL.rotation.x = -0.25 * k * Math.max(0, -w) - 0.05; J.knL.rotation.x = 0.1 + 0.5 * k * Math.max(0, -w); J.neck.rotation.x = 0.22;
    D.updateMatrixWorld(true); const hw = headW(D), Pp = v3(hw.x + 0.2, hw.y + 0.33 + 0.012 * Math.sin(t * 2.2), hw.z + 0.02); S.phD.visible = true; S.phD.position.copy(Pp); S.phD.up.set(-1, 0, 0); S.phD.lookAt(hw);
    armTo(D, 'L', Pp.clone().add(v3(0.05, -0.012, -0.035))); armTo(D, 'R', Pp.clone().add(v3(0.05, -0.012, 0.035))); smile(D, 0.3 + 0.7 * win(t, 8.6, 0.3), k > 0.5 ? 1 : 0, t, 4);
  } else if (n === 'sofa') {
    // ---- 3 · COMPARAR ENTRE TODOS: los cuatro apretados en el sofá alrededor del móvil de A
    const xs = { B: -0.74, A: -0.25, C: 0.25, D: 0.74 }, z0 = SOFA.z + 0.1, pp = v3(ox + 0.0, 1.0, z0 + 0.4 + 0.01 * Math.sin(t * 1.7));
    const no = bump(t, TL.no - 0.05, TL.no + 1.0, 0.2, 0.3), si = win(t, TL.si - 0.05, 0.25), rev = bump(t, TL.rev - 0.15, TL.rev + 1.9, 0.3, 0.35), spl = bump(t, TL.split - 0.1, TL.split + 2.6, 0.3, 0.4);
    for (const k of ['B', 'A', 'C', 'D']) { const d = P[k], x = xs[k], J = sitX(d, x, z0, -x * 0.42, 0.09), ln = -x * 0.3; J.hip.rotation.z = ln * 0.9; J.chest.rotation.z = ln * 0.5; J.chest.rotation.x = 0.14 - 0.16 * no + 0.06 * si; d.position.x -= x * 0.12 * (1 - no * 0.5);
      d.position.y += 0.012 * si * Math.abs(Math.sin((t - TL.si) * 9 + x * 3)); }
    // A sostiene el móvil en el centro (la pantalla hacia ellos) y pasa el dedo
    { const J = A.userData.J; S.ph.visible = true; S.ph.position.copy(pp); S.ph.lookAt(v3(ox, 1.3, z0 - 0.1)); armTo(A, 'R', pp.clone().add(v3(-0.03, -0.055, 0.012))); const sw = 0.5 + 0.5 * Math.sin(t * 5.2); armTo(A, 'L', pp.clone().add(v3(-0.045, -0.01 + 0.03 * sw, -0.03))); }
    // C señala la pantalla («¡Mirad las reseñas de este!»)
    { const J = C.userData.J; armTo(C, 'L', pp.clone().add(v3(0.03, 0.035, -0.025)), rev + 0.6 * si * (1 - rev)); J.chest.rotation.x += 0.05 * vz * rev; }
    // B cuenta con la mano («…si lo dividimos entre cuatro»)
    { const J = B.userData.J; J.shL.rotation.x = lerp(J.shL.rotation.x, -1.5, spl); J.elL.rotation.x = lerp(J.elL.rotation.x, -1.75 + 0.25 * Math.sin(t * 7), spl); J.shL.rotation.z = lerp(J.shL.rotation.z, -0.45, spl); J.chest.rotation.x += 0.05 * vz * spl; }
    // D celebra el «este sí»
    { const J = D.userData.J; J.shR.rotation.x = lerp(J.shR.rotation.x, -2.6, si); J.elR.rotation.x = lerp(J.elR.rotation.x, -1.3 + 0.3 * Math.sin(t * 13), si); J.shR.rotation.z = lerp(J.shR.rotation.z, 0.35, si); }
    for (const k of ['B', 'A', 'C', 'D']) { const d = P[k], J = d.userData.J; lookAtPt(d, pp, 0.5); if (k === 'B') J.neck.rotation.y += 0.55 * spl * (0.6 + 0.4 * Math.sin(t * 2.3)); J.neck.rotation.y += 0.32 * no * Math.sin((t - TL.no) * 13 + xs[k]); J.neck.rotation.x += -0.15 * no + 0.2 * si * Math.sin((t - TL.si) * 11);
      smile(d, clamp(0.45 + 0.2 * rev - 0.6 * no + 0.6 * si), si > 0.6 && (k === 'D' || k === 'C') ? 1 : 0, t, xs[k] * 9); }
  } else if (n === 'vote') {
    // ---- 4 · LA VOTACIÓN (cenital): el móvil en la mesa y cuatro manos; todos señalan la misma; D pulsa «Reservar»
    const ph = S.ph; ph.visible = true; ph.scale.setScalar(1.15); ph.position.set(ox + TBL.x, TBL.y + 0.0056, TBL.z + 0.02); ph.rotation.set(-Math.PI / 2, 0, 0); ph.updateMatrixWorld(true);
    const pt = win(t, TL.point, 0.16), ex = seg(t, TL.ex, TL.ex + 0.3), press = bump(t, TL.press, TL.press + 0.14, 0.06, 0.1), ok = seg(t, TL.ok, TL.ok + 0.32), fly = win(t, TL.fly, 0.3), back = win(t, TL.ex - 0.05, 0.25);
    heroDraw((g, w, h) => drawVote(g, w, h, { sel: t >= TL.point + 0.12 ? 1 : 0, ex, press: t >= TL.press + 0.05 && t < TL.ok + 0.02 ? 1 : 0, ok }));
    const c = v3(ox + TBL.x, TBL.y + 0.02, TBL.z + 0.02), yaw = [Math.PI * 1.25, 2.5, 0.6435, -Math.PI / 4], rest = [[-0.1, 0.09], [-0.115, -0.075], [0.115, -0.075], [0.1, 0.09]], tg = [[150, 610], [170, 520], [400, 520], [390, 620]];
    const tap = Math.max(bump(t, TL.c3, TL.c3 + 0.18, 0.07, 0.11), bump(t, TL.c2, TL.c2 + 0.18, 0.07, 0.11), bump(t, TL.c1, TL.c1 + 0.18, 0.07, 0.11)), inn = win(t, 20.05, 0.4);
    S.arms.forEach((a, i) => { a.visible = true; const r = v3(c.x + rest[i][0] * (1.7 - 0.9 * inn), c.y + 0.012 + 0.016 * (1 - tap) + 0.004 * Math.sin(t * 3 + i), c.z + rest[i][1] * (1.7 - 0.9 * inn)), p = scrPt(ph, tg[i][0], tg[i][1], 0.006);
      let tip = r.clone().lerp(p, pt * (1 - (i === 3 ? 0 : back))); if (i === 3) { const b = scrPt(ph, 400, 880, 0.02 - 0.016 * press); tip.lerp(b, sm5(seg(t, TL.ex + 0.05, TL.press - 0.02))); }
      tip.y += 0.28 * fly * (1 + 0.2 * i); tip.x += rest[i][0] * 1.6 * fly; tip.z += rest[i][1] * 1.6 * fly; armPose(a, tip, yaw[i], 0.3 + 0.25 * fly + 0.1 * (1 - pt) * tap); });
  } else if (n === 'hug') {
    // ---- 4 (final) · ¡reservado!: saltan y se abrazan delante del sofá
    const xs = { B: -0.52, A: -0.17, C: 0.17, D: 0.52 }; let i = 0; for (const k of ['B', 'A', 'C', 'D']) { const d = P[k], x = xs[k], J = put(d, x, 0, 0.18 + 0.1 * Math.abs(x), -x * 0.4), jp = Math.abs(Math.sin((t - 24.15) * 6.6 + i * 0.9)); d.position.y = 0.2 * jp; J.knL.rotation.x = J.knR.rotation.x = 0.5 * (1 - jp); J.hpL.rotation.x = J.hpR.rotation.x = -0.25 * (1 - jp);
      if (k === 'A' || k === 'C') armsUp(d, 1, t, i); else { armsUp(d, 1, t, i); const s = k === 'B' ? 'L' : 'R'; J['sh' + s].rotation.x = -1.3; J['sh' + s].rotation.z = k === 'B' ? 0.9 : -0.9; J['el' + s].rotation.x = -0.6; } J.neck.rotation.x = -0.2; smile(d, 1, 1, t, i); i++; }
  } else if (n === 'arrive') {
    // ---- 5a · EL VIAJE: llegan andando con las maletas por la calle de casas blancas
    const off = [[0, 21.3], [-1.0, 20.5], [-1.9, 21.6], [-2.9, 20.8]]; ['A', 'C', 'B', 'D'].forEach((k, i) => { const d = P[k], J = put(d, -3 + 1.35 * u + off[i][0], 0, off[i][1], Math.PI / 2); poseWalk(d, (u * 1.35 + i * 0.7) * 4.3, 0.55, 0.06); d.rotation.y = Math.PI / 2;
      const s = i % 2 ? 'L' : 'R', c = S.cases[i]; c.visible = true; dragCase(c, d, s); smile(d, 1, i === 0 ? 1 : 0, t, i);
      if (k === 'A') { const pk = bump(t, 25.5, 27.0, 0.3, 0.3); J.shL.rotation.x = lerp(J.shL.rotation.x, -1.75, pk); J.elL.rotation.x = lerp(J.elL.rotation.x, -0.15, pk); J.shL.rotation.z = -0.15; } if (k === 'D') J.neck.rotation.y = 0.6 * Math.sin(t * 1.8); if (k === 'C') J.neck.rotation.y = -0.45; });
    put(S.X[0], 9.5, 0, 19.4, 2.2); put(S.X[1], 10.2, 0, 19.2, -2.4); put(S.X[4], -9, 0, 19.3, 1.2);
  } else if (n === 'beach') {
    // ---- 5b · corren hacia el mar
    townAt(S.sets.town, t); const xs = [-1.6, -0.5, 0.55, 1.7], zo = [0.4, -0.3, 0, 0.6]; ['B', 'A', 'C', 'D'].forEach((k, i) => { const d = P[k], J = put(d, xs[i] + 0.15 * Math.sin(t * 2 + i), 0, -5.6 - 2.5 * u + zo[i], Math.PI); poseRun(d, (u * 2.5 + i * 0.8) * 3.4); d.rotation.y = Math.PI + 0.1 * Math.sin(t * 3 + i);
      if (i !== 2) armsUp(d, i === 1 ? 1 : 0.85, t, i); smile(d, 1, 1, t, i); });
    put(S.X[2], -7.2, 0, -7.5, 0.6); put(S.X[3], 8.3, 0, -9.2, -0.4); put(S.X[5], -10.5, 0, -4.2, 0.2);
  } else if (n === 'wall') {
    // ---- 5c · comen un bocadillo sentados en el murete, con el mar detrás
    townAt(S.sets.town, t); const xs = [-0.93, -0.31, 0.31, 0.93]; ['B', 'A', 'C', 'D'].forEach((k, i) => { const d = P[k], J = sitX(d, xs[i], TOWN.wall + 0.06, (i - 1.5) * -0.1, 0.19); J.knL.rotation.x = 1.5 + 0.28 * Math.sin(t * 3.1 + i); J.knR.rotation.x = 1.5 - 0.28 * Math.sin(t * 3.1 + i * 1.7);
      const f = S.food[i]; f.visible = true; const bite = bump(t, 29.9 + i * 0.5, 30.5 + i * 0.5, 0.3, 0.3) + bump(t, 31.3 + (3 - i) * 0.15, 32.4, 0.3, 0.3); eatAt(d, f, i % 2 ? 'L' : 'R', Math.min(1, bite)); const lg = bump(t, 30.6 + i * 0.4, 31.6 + i * 0.3, 0.2, 0.3);
      J.chest.rotation.x = -0.1 * lg; J.neck.rotation.y = (i < 2 ? 0.5 : -0.5) * lg; J.neck.rotation.x = -0.15 * lg; smile(d, 0.8, lg > 0.5 && bite < 0.3 ? 1 : 0, t, i); });
    put(S.X[2], -7.2, 0, -7.5, 0.6); put(S.X[3], 8.3, 0, -9.2, -0.4); put(S.X[5], -10.5, 0, -4.2, 0.2);
  } else {
    // ---- 5d · EL SELFI: se juntan; A estira el brazo con el móvil (la cámara es el móvil) y posan
    townAt(S.sets.town, t); const zc = -4.6, inn = sm5(seg(t, 32.1, 33.0)), peak = win(t, TL.snap - 0.5, 0.4), bob = 0.01 * Math.sin(t * 5);
    const cfg = { A: [-0.2, 0.12, 0.13, 0.15], C: [0.2, 0.1, 0.16, -0.15], B: [-0.5, -0.22, 0, 0.3], D: [0.52, -0.2, 0, -0.32] };
    for (const k of ['A', 'C', 'B', 'D']) { const d = P[k], c = cfg[k], far = (k === 'B' ? -1.3 : k === 'D' ? 1.4 : k === 'C' ? 0.5 : -0.3) * (1 - inn), J = put(d, c[0] + far, 0, zc + c[1] - 0.5 * (1 - inn) * (k === 'B' || k === 'D' ? 1 : 0), c[3]); poseCrouch(d, c[2] * 1.6); J.shL.rotation.x = J.shR.rotation.x = 0; J.elL.rotation.x = J.elR.rotation.x = -0.2; J.neck.rotation.x = 0; J.chest.rotation.x = 0.04;
      J.hip.rotation.z = -c[0] * 0.3 * inn; d.position.y = bob * (k === 'A' ? 0 : 1) + (k === 'D' ? 0.1 * bump(t, 33.0, 33.5, 0.2, 0.25) : 0); lookAtPt(d, st.p); J.neck.rotation.z = -c[0] * 0.3; smile(d, 1, peak > 0.3 || k === 'D' ? 1 : 0, t, c[0] * 7); }
    armTo(A, 'L', v3(ox - 0.62, 1.12, zc + 0.6)); { const J = A.userData.J; J.shR.rotation.x = -0.4; J.elR.rotation.x = -2.3; J.shR.rotation.z = -0.3; }                         // A: una mano al móvil (sale del plano) y la otra, saludo
    { const J = C.userData.J; J.shR.rotation.x = lerp(0, -0.35, peak); J.shR.rotation.z = 0.5 * peak; J.elR.rotation.x = lerp(-0.2, -2.5, peak); }                                           // C: la uve
    armsUp(B, peak, 0, 1); { const J = D.userData.J; J.shL.rotation.x = -2.7 * inn; J.shL.rotation.z = -0.3; J.elL.rotation.x = -0.3; J.shR.rotation.x = -1.2 * peak; J.shR.rotation.z = -0.8 * peak; J.elR.rotation.x = -0.9 * peak; }
    put(S.X[2], -7.2, 0, -7.5, 0.6); put(S.X[3], 8.3, 0, -9.2, -0.4);
  }
}
// ---------------------------------------------------------------- LA CÁMARA: un juego de claves por plano; entre planos hay CORTE (el desenfoque de movimiento no cruza el corte).
// claves: [t, [x,y,z] posición, [x,y,z] a dónde mira, focal°] en metros del decorado (se suma su origen). «shake» = cámara en mano.
let CAMS = {};
function buildCam() {
  const T = TBL, zc = -4.6;
  CAMS = {
    lib: { o: O.lib, k: [[0, [-0.62, 1.1, 0.7], [0.28, 0.8, -0.6], 30], [0.9, [-0.5, 1.12, 0.66], [0.26, 0.79, -0.45], 30], [2.0, [0.13, 1.1, 0.4], [0.13, 0.77, 0.197], 30], [3.7, [0.133, 1.085, 0.392], [0.13, 0.77, 0.197], 30], [5, [0.15, 1.13, 0.47], [0.15, 0.8, 0.22], 30]] },
    bus: { o: O.bus, shake: 0.006, k: [[5, [2.3, 1.1, 0.12], [0.62, 1.1, -0.47], 30], [6.65, [2.12, 1.1, 0.08], [0.62, 1.11, -0.47], 30]] },
    kit: { o: O.kit, k: [[6.65, [1.25, 1.25, 1.35], [0.28, 1.2, -0.95], 30], [8.3, [1.1, 1.25, 1.15], [0.28, 1.2, -0.95], 30]] },
    bed: { o: O.bed, k: [[8.3, [1.05, 1.9, 1.75], [-0.12, 0.78, -0.72], 30], [10, [0.9, 1.8, 1.55], [-0.14, 0.78, -0.72], 30]] },
    sofa: { o: O.sofa, k: [[10, [0, 1.0, 3.25], [0, 0.98, -0.4], 32], [10.6, [0.02, 1.0, 3.2], [0.02, 0.98, -0.4], 32], [11.5, [0.92, 0.98, 3.5], [0.92, 0.96, -0.4], 32], [16.5, [0.9, 0.98, 3.35], [0.9, 0.96, -0.4], 32], [20, [0.86, 0.98, 3.2], [0.86, 0.96, -0.4], 32]] },
    vote: { o: O.sofa, k: [[20, [T.x, T.y + 0.47, T.z + 0.1], [T.x, T.y, T.z + 0.02], 30], [22.2, [T.x, T.y + 0.44, T.z + 0.095], [T.x, T.y, T.z + 0.02], 30], [24.15, [T.x, T.y + 0.42, T.z + 0.09], [T.x, T.y, T.z + 0.02], 30]] },
    hug: { o: O.sofa, shake: 0.012, k: [[24.15, [0.35, 1.35, 3.9], [0, 1.3, 0.2], 32], [25, [0.25, 1.33, 3.5], [0, 1.32, 0.2], 32]] },
    arrive: { o: O.town, shake: 0.016, k: [[25, [-1.2, 1.15, 25.6], [-4.3, 1.0, 21.0], 32], [27.4, [2.05, 1.15, 25.6], [-1.05, 1.0, 21.0], 32]] },
    beach: { o: O.town, shake: 0.02, k: [[27.4, [1.3, 1.55, -1.2], [0, 1.0, -8.5], 32], [29.7, [1.0, 1.6, -5.6], [0, 1.0, -14], 32]] },
    wall: { o: O.town, shake: 0.01, k: [[29.7, [0.7, 1.15, 1.75], [0, 1.05, -2], 32], [32.1, [0.45, 1.12, 1.35], [0, 1.05, -2], 32]] },
    selfie: { o: O.town, shake: 0.007, k: [[32.1, [0.0, 1.2, zc + 1.45], [0.02, 1.3, zc], 46], [33.0, [0.0, 1.52, zc + 1.3], [0.02, 1.36, zc], 46], [35.01, [0.0, 1.54, zc + 1.27], [0.02, 1.36, zc], 46]] },
  };
  for (const n in CAMS) { const C = CAMS[n]; C.k = C.k.map(k => [k[0], [k[1][0] + C.o, k[1][1], k[1][2]], [k[2][0] + C.o, k[2][1], k[2][2]], k[3]]); }
}
function camAt(t) { t = clamp(t, 0, END); const sh = shotAt(t), C = CAMS[sh.n], st = camKeys(t, C.k), a = C.shake || 0;
  if (a) { const nz = (f, p) => Math.sin(t * f + p) * 0.6 + Math.sin(t * f * 2.3 + p * 1.7) * 0.4; st.p.x += a * nz(2.1, 1); st.p.y += a * nz(2.7, 2) * 0.8; st.l.x += a * 1.6 * nz(1.7, 3); st.l.y += a * 1.3 * nz(2.3, 4); st.roll = a * 0.5 * nz(1.3, 5); }
  return st; }
function prevT(t, dt) { return Math.max(shotAt(t).a, t - dt); }                // nunca antes del corte
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l), n = shotAt(t).n; return { focus: f, scale: (n === 'lib' ? 0.42 : n === 'vote' ? 0.9 : f < 2.2 ? 0.34 : f < 8 ? 0.26 : 0.2) * f }; }
// ---------------------------------------------------------------- RÓTULOS Y PANTALLAS (lienzo 2D): los bocadillos del chat (plano 2), la pantalla de la app a la derecha del sofá (plano 3),
// los textos del guion («Compara precios. Lee opiniones reales.», «Decidís entre todos.») y el confeti del abrazo. El cierre de marca (plano 6) lo hace el montaje.
function buildHudPlan() {}
const EMO = 'Inter, "Noto Color Emoji", sans-serif';
function sText(txt, x, y, px, weight, a, o = {}) { if (a <= 0.01) return 0; hg.save(); hg.globalAlpha = clamp(a); hg.font = `${weight} ${px}px ${EMO}`; hg.textAlign = o.align || 'left'; hg.textBaseline = 'alphabetic';
  if (o.shadow !== false) { hg.shadowColor = 'rgba(0,0,0,.55)'; hg.shadowBlur = px * 0.3 * PR; hg.shadowOffsetY = px * 0.05 * PR; } hg.fillStyle = o.col || '#ffffff'; hg.fillText(txt, x, y); const w = hg.measureText(txt).width; hg.restore(); return w; }
// bocadillo de chat (verde claro, como un mensaje enviado) con su hora y el doble check; aparece con rebote
function chatBubble(txt, cx, cy, t, t0, px = 60) { const k = pop(t, t0, 0.32); if (k <= 0.01) return; hg.save(); hg.font = `700 ${px}px ${EMO}`; const tw = hg.measureText(txt).width, w = tw + px * 1.3, h = px * 2.05; cx = clamp(cx, w / 2 + 40, W - w / 2 - 40);
  hg.translate(cx, cy); hg.scale(k, k); hg.globalAlpha = clamp((t - t0) / 0.1); hg.shadowColor = 'rgba(0,0,0,.4)'; hg.shadowBlur = 30 * PR; hg.shadowOffsetY = 10 * PR; hg.fillStyle = '#d9fdd3'; rr(hg, -w / 2, -h / 2, w, h, px * 0.5); hg.fill();
  hg.beginPath(); hg.moveTo(w / 2 - px * 0.5, h / 2 - 6); hg.lineTo(w / 2 + px * 0.25, h / 2 + px * 0.42); hg.lineTo(w / 2 - px * 1.25, h / 2 - 2); hg.closePath(); hg.fill(); hg.shadowColor = 'transparent'; hg.shadowBlur = 0; hg.shadowOffsetY = 0;
  hg.fillStyle = '#111b21'; hg.textAlign = 'left'; hg.textBaseline = 'alphabetic'; hg.fillText(txt, -tw / 2 - px * 0.12, px * 0.18); hg.font = `500 ${px * 0.36}px Inter, sans-serif`; hg.fillStyle = '#5f7a72'; hg.textAlign = 'right'; hg.fillText('17:4' + (2 + Math.floor(hash(txt.length) * 3)) + '  ✓✓', w / 2 - px * 0.4, h / 2 - px * 0.2); hg.restore(); }
// ---- la app en grande (plano 3). Lienzo virtual de 540 de ancho dentro del marco del móvil
function appPanel(t) {
  const kin = sm5(seg(t, TL.panel, TL.panel + 0.5)) * (1 - sm5(seg(t, 19.6, 20.0))); if (kin <= 0.01) return; const x0 = 1296 + (1 - kin) * 760, y0 = 26, w = 556, h = 1000, s = (w - 28) / 540, vh = (h - 28) / s, g = hg;
  g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 50 * PR; g.shadowOffsetY = 18 * PR; g.fillStyle = '#16181d'; rr(g, x0, y0, w, h, 58); g.fill(); g.restore();
  g.save(); g.translate(x0 + 14, y0 + 14); g.scale(s, s); rr(g, 0, 0, 540, vh, 54); g.clip(); g.fillStyle = '#f2f3f5'; g.fillRect(0, 0, 540, vh);
  // cabecera, buscador y filtros
  appHeader(g, 540, null); g.fillStyle = BK.blue; g.fillRect(0, 126, 540, 110); g.fillStyle = '#fff'; g.strokeStyle = BK.yel; g.lineWidth = 7; rr(g, 20, 136, 500, 78, 14); g.fill(); g.stroke(); scrText(g, '🔍  Playa · 4 noches · 4 personas', 42, 187, 27, 700);
  const tapS = bump(t, TL.sort - 0.08, TL.sort + 0.25, 0.08, 0.2), sorted = sm5(seg(t, TL.sort + 0.12, TL.sort + 0.55)), chips = [['Precio más bajo', sorted > 0.3], ['Opiniones 8+', t > TL.rev - 0.3 && t < TL.no], ['Filtros', false]]; let cx = 20;
  for (const [c, on] of chips) { g.font = `700 23px Inter, sans-serif`; const cw = g.measureText(c).width + 34; g.fillStyle = on ? '#e7f1fb' : '#fff'; g.strokeStyle = on ? BK.cta : '#b9c0ca'; g.lineWidth = on ? 4 : 2.5; rr(g, cx, 258, cw, 56, 28); g.fill(); g.stroke(); scrText(g, c, cx + 17, 294, 23, 700, on ? BK.cta : BK.ink); cx += cw + 10; }
  if (tapS > 0.01) { g.save(); g.globalAlpha = 0.35 * tapS; g.fillStyle = BK.cta; g.beginPath(); g.arc(110, 286, 30 + 50 * (1 - tapS), 0, 7); g.fill(); g.restore(); }
  // la lista: al ordenar por precio, las tarjetas cambian de sitio (A 520 € · B 352 € · C 298 €  →  C · B · A)
  const no = bump(t, TL.no - 0.05, TL.si - 0.12, 0.18, 0.22), si = win(t, TL.si - 0.05, 0.25), gone = win(t, TL.no + 0.75, 0.3), ord0 = [0, 1, 2], ord1 = [2, 1, 0];
  for (let i = 0; i < 3; i++) { const st = STAYS[i], y = 336 + lerp(ord0[i], ord1[i], sorted) * 214, isB = i === 1, isC = i === 2, shx = isC ? 9 * no * Math.sin((t - TL.no) * 38) * (1 - gone) : 0;
    stayCard(g, st, 20 + shx, y - (isB ? 6 * si : 0), 500, 198, { sel: isB && (si > 0.4 || (t > TL.rev && t < TL.no)), a: isC ? 1 - 0.62 * gone : isB ? 1 : 1 - 0.5 * si });
    if (isC && no > 0.02 || isC && gone > 0.02) { const k = pop(t, TL.no + 0.12, 0.3); if (k > 0.01) { g.save(); g.translate(270 + shx, y + 99); g.scale(k, k); g.rotate(-0.12); g.strokeStyle = '#d4281c'; g.lineWidth = 9; g.fillStyle = 'rgba(255,255,255,.9)'; rr(g, -200, -50, 400, 100, 16); g.fill(); g.stroke(); scrText(g, '“Ruidoso de noche”', 0, 14, 36, 900, '#d4281c', 'center'); g.restore(); } }
    if (isB && si > 0.02) { const k = pop(t, TL.si + 0.02, 0.32); g.save(); g.translate(462, y + 6); g.scale(k, k); g.fillStyle = '#1f9d55'; g.beginPath(); g.arc(0, 0, 44, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-20, 2); g.lineTo(-5, 17); g.lineTo(22, -14); g.stroke(); g.restore(); } }
  // hoja que sube: primero las opiniones, después la cuenta entre cuatro
  const sheet = sm5(seg(t, TL.rev - 0.1, TL.rev + 0.3)) * (1 - sm5(seg(t, TL.no - 0.3, TL.no - 0.02))); if (sheet > 0.01) { const sy = vh - (vh - 372) * sheet, sp = sm5(seg(t, TL.split - 0.12, TL.split + 0.2));
    g.save(); g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 30; g.shadowOffsetY = -6; g.fillStyle = '#ffffff'; rr(g, 0, sy, 540, vh, 40); g.fill(); g.restore(); g.fillStyle = '#cfd4da'; rr(g, 230, sy + 16, 80, 8, 4); g.fill(); g.save(); g.translate(0, sy);
    scrText(g, 'Piso Brisa del Mar', 30, 84, 38, 900); g.fillStyle = BK.blue; rr(g, 30, 106, 84, 62, 12); g.fill(); scrText(g, '9,1', 72, 150, 38, 900, '#fff', 'center'); scrText(g, 'Fantástico', 130, 136, 30, 900); scrText(g, '214 opiniones', 130, 168, 24, 500, BK.grey);
    if (sp < 0.99) { g.save(); g.globalAlpha = 1 - sp; const revs = [['L', '#e07a5f', 'Lucía', 'Limpio y a 2 minutos', 'de la playa.'], ['M', '#3d9bd1', 'Marcos', 'Íbamos cuatro amigos:', 'perfecto y barato.'], ['S', '#81b29a', 'Sara', 'El anfitrión, majísimo.', 'Repetiríamos.']];
      revs.forEach((r, i) => { const k = pop(t, TL.rev + 0.3 + i * 0.36, 0.3); if (k <= 0.01) return; const y = 196 + i * 178; g.save(); g.translate(270, y + 80); g.scale(k, k); g.translate(-270, -80); g.fillStyle = '#f3f6fa'; rr(g, 24, 0, 492, 162, 20); g.fill(); g.fillStyle = r[1]; g.beginPath(); g.arc(70, 48, 28, 0, 7); g.fill(); scrText(g, r[0], 70, 59, 30, 900, '#fff', 'center');
        scrText(g, r[2], 112, 44, 27, 900); scrText(g, '★★★★★', 112, 76, 25, 700, '#f5a623'); scrText(g, '“' + r[3], 44, 116, 28, 500); scrText(g, r[4] + '”', 44, 148, 28, 500); g.restore(); }); g.restore(); }
    if (sp > 0.01) { g.save(); g.globalAlpha = sp; const t4 = Math.min(K['dividimos_2'], TL.no - 1.6), t5 = Math.min(K['cuatro_2'], TL.no - 0.95); scrText(g, 'Precio total · 4 noches', 270, 232, 30, 500, BK.grey, 'center'); scrText(g, '352 €', 270, 326, 104, 900, BK.ink, 'center');
      const k4 = pop(t, t4, 0.3); if (k4 > 0.01) { g.save(); g.translate(270, 396); g.scale(k4, k4); scrText(g, '÷ 4 personas', 0, 0, 52, 900, BK.cta, 'center'); g.restore(); }
      const k5 = pop(t, t5, 0.36); if (k5 > 0.01) { g.save(); g.translate(270, 530); g.scale(k5, k5); g.fillStyle = '#e6f6ec'; rr(g, -220, -112, 440, 172, 28); g.fill(); scrText(g, '88 €', 0, 0, 118, 900, '#1f8a4c', 'center'); scrText(g, 'por persona', 0, 44, 32, 700, '#1f8a4c', 'center'); g.restore(); } g.restore(); }
    g.restore(); }
  g.restore();
  sText('Pantalla simulada · datos de ejemplo', x0 + w / 2, y0 + h + 32, 20, 500, 0.85 * kin, { align: 'center' });
}
function hudAt(t) {
  hudBegin(); const n = shotAt(t).n;
  // ---- 2 · los mensajes del grupo
  if (n === 'bus') { const p = proj(headW(S.P.B)); chatBubble('¡¡SÍ!!', p.x - 430, p.y - 150, t, TL.bub[0], 104); }
  if (n === 'kit') { const p = proj(headW(S.P.C)); chatBubble('¿cuánto nos sale?', p.x - 520, p.y - 120, t, TL.bub[1], 72); }
  if (n === 'bed') { const p = proj(headW(S.P.D)); chatBubble('yo pongo mis ahorros del verano 💸', p.x + 560, p.y - 300, t, TL.bub[2], 58); }
  // ---- 3 · la app y «Compara precios. Lee opiniones reales.»
  if (n === 'sofa') { appPanel(t); const out = 1 - win(t, 19.5, 0.4), a1 = win(t, TL.sort + 0.1, 0.35) * out, a2 = win(t, TL.rev + 0.25, 0.35) * out;
    if (a1 > 0.01) { hg.save(); hg.globalAlpha = 0.5 * a1; const gr = hg.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, 'rgba(20,14,8,1)'); gr.addColorStop(1, 'rgba(20,14,8,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, 1200, 300); hg.restore(); }
    sText('Compara precios.', 70 - (1 - a1) * 30, 122, 74, 900, a1); sText('Lee opiniones reales.', 70 - (1 - a2) * 30, 208, 74, 900, a2, { col: '#ffd66b' }); }
  // ---- 4 · «Decidís entre todos.» y el confeti del abrazo
  if (n === 'vote' || n === 'hug') { const a = win(t, TL.vota + 0.35, 0.4) * (1 - win(t, 24.75, 0.25)), y = n === 'hug' ? 1000 : 128; hg.save(); hg.font = `900 84px ${EMO}`; const w1 = hg.measureText('Decidís ').width, w2 = hg.measureText('entre todos.').width; hg.restore();
    sText('Decidís ', W / 2 - (w1 + w2) / 2, y, 84, 900, a); sText('entre todos.', W / 2 - (w1 + w2) / 2 + w1, y, 84, 900, a, { col: '#ffd66b' }); }
  if (n === 'hug') { const u = t - 24.15 + 0.25, cols = ['#febb02', '#0071c2', '#f2664b', '#2f9e6b', '#ffffff', '#7d5fd0']; hg.save(); for (let i = 0; i < 90; i++) { const x = hash(i * 1.7) * W, sp = 520 + hash(i * 3.1) * 520, y = -60 + sp * u - 300 * hash(i * 5.3), r = u * (3 + hash(i) * 6) + i;
      hg.save(); hg.translate(x + 40 * Math.sin(u * 4 + i), y); hg.rotate(r); hg.fillStyle = cols[i % cols.length]; hg.globalAlpha = 0.95; hg.fillRect(-11, -6, 22, 12 * Math.abs(Math.cos(r * 1.3)) + 3); hg.restore(); } hg.restore(); }
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
  END = 35;
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
