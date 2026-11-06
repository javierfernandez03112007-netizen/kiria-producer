// «El perro robot con neuronas humanas» (Cortical Labs, voz de Javi): ver 14_robot.js.
// window.renderAt(t) dibuja el instante t (60 fps).
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
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { W, H, clamp, prog, lerp, eo, eio, ss, loadTopo, ringSegments, ll, fatLines, arcPoints } from './lib.js';

// ---------------------------------------------------------------- render, resplandor y acabado
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
const PR = window.PR || 1; renderer.setPixelRatio(PR); renderer.setSize(W, H); document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.localClippingEnabled = true;
const rtA = new THREE.WebGLRenderTarget(W * PR, H * PR, { type: THREE.HalfFloatType, samples: 4 });
const BLW = Math.round(W * PR / 4), BLH = Math.round(H * PR / 4);
const rtB = [0, 1].map(() => new THREE.WebGLRenderTarget(BLW, BLH, { type: THREE.HalfFloatType }));
const rtC = [0, 1].map(() => new THREE.WebGLRenderTarget(Math.round(BLW / 2), Math.round(BLH / 2), { type: THREE.HalfFloatType }));
// los chorros de motores y cohetes van aparte: a media resolución y sin multimuestreo, y se suman luego a la imagen y al resplandor
const rtF = new THREE.WebGLRenderTarget(Math.round(W * PR / 2), Math.round(H * PR / 2), { type: THREE.HalfFloatType });
const fxScene = new THREE.Scene();
const VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
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
    fade: { value: 0 }, white: { value: 0 }, vig: { value: 0.38 }, time: { value: 0 }, flash: { value: 0 }, bloom: { value: 0.75 }, ca: { value: 1 }, mbk: { value: 0.8 }, xray: { value: 0 }, tint: { value: new THREE.Vector3(0, 0, 0) } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D tA, tB, tC, tF, tH; uniform vec2 m0, a0; uniform vec4 J; uniform vec3 tint; uniform float fade, white, vig, time, flash, bloom, ca, mbk, xray; varying vec2 vUv;
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
      { float xl = dot(a, vec3(0.2126,0.7152,0.0722)); a = mix(a, vec3(xl) * vec3(0.58, 0.86, 1.3) * 1.35, xray); }   // «rayos X»: sin color, azul hielo
      a = mix(a, vec3(0.0), fade); a += flash; a += tint;
      a = clamp((a*(2.51*a+0.03))/(a*(2.43*a+0.59)+0.14),0.,1.); a = pow(a, vec3(1.0/2.2));
      float lu = dot(a, vec3(0.2126,0.7152,0.0722));
      a += vec3(-0.012, 0.010, 0.032) * (1.0 - lu) * (1.0 - lu) + vec3(0.035, 0.012, -0.022) * lu * lu;   // sombras frías, luces cálidas
      a = mix(vec3(lu), a, 1.16); a = mix(a, a*a*(3.0-2.0*a), 0.18);
      vec2 d = c*vec2(0.5625,1.0); a *= 1.0 - vig*smoothstep(0.25,0.92,length(d)*1.6);
      a += (h(vUv*vec2(1080.,1920.) + fract(time*7.13)*91.7) - 0.5) * 0.014 * (0.35 + lu);
      if (any(isnan(a))) a = vec3(0.);
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
function hfont(px, bold = true) { hg.font = `${bold ? 700 : 400} ${px}px ${MONO}`; }
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
    hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 8;
    const tx = T.x + (right ? 12 : -12);
    if (o.bg) { hg.save(); hg.shadowBlur = 0; hg.fillStyle = 'rgba(0,0,0,.72)'; const bh = sub ? size + subSize * 1.7 + 14 : size * 1.55; rr(hg, (right ? tx : tx - tw) - 14, T.y - size * 0.78, tw + 28, bh, 10); hg.fill(); hg.restore(); }
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
  for (let i = 0; i < N; i++) { const p = gen(i); P[i * 3] = p[0]; P[i * 3 + 1] = p[1]; P[i * 3 + 2] = p[2]; Sd[i] = Math.pow(hash((o.seedOf ? o.seedOf(i) : i) * 7.31 + (o.seed || 0)), 1.6); }
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
// ---------------------------------------------------------------- materiales realistas (madera, latón, acero, papel) y utilidades de piezas
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
// ---------------------------------------------------------------- «El perro robot con neuronas humanas» (Cortical Labs, nov. 2026): piezas.
// Un perro robot camina sobre un mapa gigante; en el lomo lleva una cúpula de cristal con un chip de electrodos donde viven neuronas
// humanas (cuerpos que se encienden, dendritas que crecen y pulsos que viajan); Australia dibujada en el suelo; el cerebro de cristal
// con muchísimos puntos de luz; el panel del programa; la pantalla con el Pong y un pasillo de videojuego.
// El mapa (y el polvo) se repiten cada PER metros: el perro acaba PER metros más allá de donde empieza y el último fotograma es el primero.
const DOG = { y: 0.42, hipY: -0.04, hipX: 0.13, hipZ: 0.24, thigh: 0.2, shin: 0.21, footR: 0.03 };
const DOME = { y: 0.101, r: 0.12 };                                       // cúpula sobre el lomo (relativa al cuerpo)
const CHIP = { w: 0.15, t: 0.012 };                                       // chip dentro de la cúpula
const CHIP_Y = DOG.y + DOME.y + 0.012;                                    // altura del centro del chip (perro quieto)
const NN = 38;                                                            // neuronas en el chip (dibujo: «un puñado»)
const PER = 3.6;                                                          // periodo del mapa y del polvo (m)
const RTEAL = 0x2ee6c9, PINK = 0xff5fa8, GOLDC = 0xffc24a;
const MELB = [144.96, -37.81], AUS_S = 0.08;                             // Melbourne (lon, lat) y escala de Australia en el suelo (m por grado)
const _o = new THREE.Object3D();

// ---------------------------------------------------------------- el mapa del suelo: una baldosa de PER × PER con calles, manzanas, un parque y una plaza
function buildMap() {
  const PX = 4096, m2p = PX / PER;
  const T = canvasTex(PX, PX, (g, w, h) => {
    g.fillStyle = '#05080d'; g.fillRect(0, 0, w, h);
    const B = 0.9, road = 0.2;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x0 = (i * B + road / 2) * m2p, y0 = (j * B + road / 2) * m2p, s = (B - road) * m2p, id = i * 4 + j, hsh = hash(id * 7.31 + 1.7);
      if (id === 6) {                                                     // parque: césped oscuro con árboles (puntos)
        g.fillStyle = '#081512'; rr(g, x0, y0, s, s, 26); g.fill();
        for (let k = 0; k < 70; k++) { const px = x0 + 30 + hash(k * 3.1) * (s - 60), py = y0 + 30 + hash(k * 5.7) * (s - 60), r = 9 + hash(k * 1.3) * 14;
          g.fillStyle = 'rgba(46,230,201,.10)'; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); }
        g.strokeStyle = 'rgba(46,230,201,.18)'; g.lineWidth = 4; rr(g, x0, y0, s, s, 26); g.stroke();
        continue;
      }
      if (id === 9) {                                                     // plaza redonda
        g.fillStyle = '#0c131c'; rr(g, x0, y0, s, s, 18); g.fill();
        g.strokeStyle = 'rgba(160,200,230,.16)'; g.lineWidth = 5; g.beginPath(); g.arc(x0 + s / 2, y0 + s / 2, s * 0.32, 0, 7); g.stroke();
        g.beginPath(); g.arc(x0 + s / 2, y0 + s / 2, s * 0.08, 0, 7); g.stroke();
        continue;
      }
      // manzana: entera, partida en dos o en cuatro parcelas (edificios vistos desde arriba)
      const n = hsh > 0.66 ? 1 : hsh > 0.33 ? 2 : 4, gap = 12, cells = n === 1 ? [[0, 0, 1, 1]] : n === 2 ? [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]] : [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]];
      cells.forEach(([a, b, cw, ch], q) => {
        const bx = x0 + a * s + (a ? gap / 2 : 0), by = y0 + b * s + (b ? gap / 2 : 0), ww = cw * s - (cw < 1 ? gap / 2 : 0), hh = ch * s - (ch < 1 ? gap / 2 : 0);
        g.fillStyle = hash(id * 3.7 + q * 1.9) > 0.5 ? '#121e2c' : '#0e1823'; rr(g, bx, by, ww, hh, 12); g.fill();
        g.strokeStyle = 'rgba(46,230,201,.17)'; g.lineWidth = 3; rr(g, bx, by, ww, hh, 12); g.stroke();
      });
    }
    // rejilla fina (cada 10 cm) y líneas de las calles (discontinuas)
    g.strokeStyle = 'rgba(160,200,230,.06)'; g.lineWidth = 2;
    for (let k = 0; k <= 36; k++) { const p = k / 36 * w; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
    g.strokeStyle = 'rgba(238,242,246,.15)'; g.lineWidth = 4; g.setLineDash([40, 50]);
    for (let k = 0; k <= 4; k++) { const p = k * 0.9 * m2p; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
    g.setLineDash([]);
  });
  T.wrapS = T.wrapT = THREE.RepeatWrapping; T.anisotropy = 16;
  const SZ = 30; T.repeat.set(SZ / PER, SZ / PER); T.offset.set(-((SZ / 2 / PER) % 1), -((SZ / 2 / PER) % 1));     // las calles caen en x = 0 y z = 0
  const m = new THREE.Mesh(new THREE.PlaneGeometry(SZ, SZ), new THREE.MeshStandardMaterial({ map: T, roughness: 0.5, metalness: 0.2, color: 0xdde6ee }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; scene.add(m); S.map = m;
  // el objetivo: anillo rojo + cruz + resplandor (se enciende al llegar)
  const tg = new THREE.Group(), rm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff4d61).multiplyScalar(1.5), transparent: true, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.232, 64), rm); ring.rotation.x = -Math.PI / 2; tg.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.095, 48), rm); ring2.rotation.x = -Math.PI / 2; tg.add(ring2);
  for (const a of [0, Math.PI / 2]) for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.014), rm); b.rotation.set(-Math.PI / 2, 0, a); b.position.set(a ? 0 : s * 0.16, 0.001, a ? s * 0.16 : 0); tg.add(b); }
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 48), new THREE.MeshBasicMaterial({ color: 0xff4d61, map: starTex0(), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.002; tg.add(glow);
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.245, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff4d61).multiplyScalar(1.4), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  wave.rotation.x = -Math.PI / 2; wave.position.y = 0.003; tg.add(wave);
  tg.position.y = 0.004; tg.traverse(o => { o.renderOrder = 4; }); scene.add(tg); tg.visible = false; S.target = { g: tg, rm, glow, wave };
}
// la ruta (línea discontinua que se dibuja a medida que anda): los puntos por los que pasa el perro entre «izquierda» y la llegada
function buildRoute() {
  const pts = []; for (let t = TT.z1a - 0.1; t <= TT.fb + 0.05; t += 0.02) { const p = dogPose(t); pts.push(v3(p.x, 0.007, p.z)); }
  S.routeT = []; for (let t = TT.z1a - 0.1; t <= TT.fb + 0.05; t += 0.02) S.routeT.push(t);
  S.route = drawLine(pts, RTEAL, 3.2, 0.95); S.route.material.dashed = true; S.route.material.dashSize = 0.05; S.route.material.gapSize = 0.035; S.route.computeLineDistances();
  S.route.material.needsUpdate = true; scene.add(S.route); S.route.visible = false;
}

// ---------------------------------------------------------------- Australia dibujada en el suelo (contorno real, Natural Earth) con Melbourne donde está el perro
async function buildAus() {
  const cs = await loadTopo('../../../engine/geo/countries-50m.json'), au = cs.find(c => c.name === 'Australia');
  const cosL = Math.cos(27 * Math.PI / 180), P = ([lo, la]) => v3((la - MELB[1]) * AUS_S, 0.012, (lo - MELB[0]) * cosL * AUS_S);
  const rings = au.rings.filter(r => r.length > 24).sort((a, b) => b.length - a.length);
  S.aus = rings.map((r, i) => { const pts = []; let last = null; for (const q of r) { const p = P(q); if (!last || p.distanceTo(last) > 0.008) { pts.push(p); last = p; } }
    const l = drawLine(pts, RTEAL, i ? 2.4 : 3.4, 1); l.visible = false; scene.add(l); return l; });
}

// ---------------------------------------------------------------- el perro robot (piezas de plástico y metal; patas con cadera y rodilla)
function buildDog() {
  const dog = new THREE.Group(), body = new THREE.Group(); dog.add(body); body.position.y = DOG.y;
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xe9edf2, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.1 });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x1a1d23, roughness: 0.4, metalness: 0.5, clearcoat: 0.6 });
  const steel = metal(0x9aa3ad, 0.3);
  const torso = rbox(0.3, 0.18, 0.64, shell, 0.07); body.add(torso);
  const belly = rbox(0.24, 0.05, 0.5, dark, 0.02); belly.position.y = -0.1; body.add(belly);
  for (const sd of [-1, 1]) { const st = rbox(0.012, 0.06, 0.4, dark, 0.005); st.position.set(sd * 0.152, 0.0, 0); body.add(st); }
  // franjas de luz en los costados (se encienden con la actividad)
  const stripM = new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.6), transparent: true, opacity: 0.0, toneMapped: false });
  for (const sd of [-1, 1]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.008), stripM); s.rotation.y = sd * Math.PI / 2; s.position.set(sd * 0.1595, 0.03, 0); body.add(s); }
  // cabeza con visor y ojos
  const head = new THREE.Group(); head.position.set(0, 0.06, 0.36); body.add(head);
  const hs = rbox(0.2, 0.15, 0.2, shell, 0.05); hs.position.z = 0.04; head.add(hs);
  const visor = rbox(0.17, 0.07, 0.03, new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: 0.05, metalness: 0.6, clearcoat: 1 }), 0.02); visor.position.set(0, 0.0, 0.14); head.add(visor);
  const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(RTEAL).multiplyScalar(2.2), toneMapped: false });
  const eyes = [-0.045, 0.045].map(x => { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.025, 4, 10), eyeM); e.rotation.z = Math.PI / 2; e.position.set(x, 0.0, 0.158); head.add(e); return e; });
  const neck = cyl(0.04, 0.05, 0.08, dark, 20); neck.rotation.x = Math.PI / 2; neck.position.set(0, 0.04, 0.3); body.add(neck);
  // patas: cadera → muslo → rodilla → espinilla → pie (las rodillas quedan detrás, como en los perros robot de verdad)
  const legs = [];
  for (const [sx, sz, id] of [[-1, 1, 'FL'], [1, 1, 'FR'], [-1, -1, 'BL'], [1, -1, 'BR']]) {
    const hip = new THREE.Group(); hip.position.set(sx * DOG.hipX, DOG.hipY, sz * DOG.hipZ); body.add(hip);
    const hj = sph(0.045, dark, 20, 14); hip.add(hj);
    const motorM = new THREE.MeshStandardMaterial({ color: 0x15171c, emissive: 0xffb547, emissiveIntensity: 0, roughness: 0.5 });
    const hm = cyl(0.05, 0.05, 0.03, motorM, 24); hm.rotation.z = Math.PI / 2; hm.position.x = sx * 0.03; hip.add(hm);
    const th = cyl(0.032, 0.026, DOG.thigh, shell, 16); th.position.y = -DOG.thigh / 2; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -DOG.thigh; hip.add(knee);
    const kj = sph(0.032, dark, 16, 12); knee.add(kj);
    const km = cyl(0.036, 0.036, 0.024, motorM, 20); km.rotation.z = Math.PI / 2; km.position.x = sx * 0.02; knee.add(km);
    const sh = cyl(0.022, 0.016, DOG.shin, steel, 14); sh.position.y = -DOG.shin / 2; knee.add(sh);
    const foot = sph(DOG.footR, new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.85 }), 16, 12); foot.position.y = -DOG.shin; knee.add(foot);
    legs.push({ hip, knee, sx, sz, id, motorM, hm, km, foot });
  }
  // la cúpula de cristal con el chip (y una luz rosa dentro: la de las neuronas)
  const dome = new THREE.Group(); dome.position.y = DOME.y; body.add(dome);
  const ringB = cyl(DOME.r + 0.012, DOME.r + 0.016, 0.02, steel, 48); dome.add(ringB);
  const cap = new THREE.Group(); dome.add(cap);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(DOME.r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x9fb0c0, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.12, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.0 }));
  glass.position.y = 0.01; glass.renderOrder = 8; cap.add(glass);
  const chip = buildChip(); chip.position.y = 0.012; dome.add(chip);
  const domeL = new THREE.PointLight(PINK, 0, 0.75, 2); domeL.position.y = 0.06; dome.add(domeL);
  dog.traverse(o => { if (o.isMesh && o !== glass) o.castShadow = true; });
  scene.add(dog);
  S.dog = { dog, body, head, legs, dome, cap, glass, chip, eyes, eyeM, domeL, stripM, shell };
}

// ---------------------------------------------------------------- el chip: placa, rejilla de electrodos dorados, pocillo con el medio de cultivo,
// neuronas (cuerpos + dendritas) y pulsos
function buildChip() {
  const g = new THREE.Group();
  const pcb = rbox(CHIP.w, CHIP.w, CHIP.t, new THREE.MeshPhysicalMaterial({ color: 0x0f3a2c, roughness: 0.45, metalness: 0.2, clearcoat: 0.8 }), 0.004);
  pcb.rotation.x = -Math.PI / 2; g.add(pcb);
  // pistas de cobre (del borde a la rejilla) y contactos
  const tr = canvasTex(512, 512, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(214,170,90,.6)'; c.lineWidth = 3;
    for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, r0 = 150, r1 = 236, ca = Math.cos(a), sa = Math.sin(a);
      c.beginPath(); c.moveTo(w / 2 + ca * r0, h / 2 + sa * r0); c.lineTo(w / 2 + ca * (r0 + 40), h / 2 + sa * (r0 + 40));
      const m = Math.max(Math.abs(ca), Math.abs(sa)); c.lineTo(w / 2 + ca / m * r1, h / 2 + sa / m * r1); c.stroke(); }
    c.fillStyle = 'rgba(214,170,90,.75)'; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, ca = Math.cos(a), sa = Math.sin(a), m = Math.max(Math.abs(ca), Math.abs(sa)); c.fillRect(w / 2 + ca / m * 236 - 7, h / 2 + sa / m * 236 - 7, 14, 14); } });
  const trM = new THREE.Mesh(new THREE.PlaneGeometry(CHIP.w * 0.98, CHIP.w * 0.98), new THREE.MeshBasicMaterial({ map: tr, transparent: true, depthWrite: false, toneMapped: false }));
  trM.rotation.x = -Math.PI / 2; trM.position.y = CHIP.t / 2 + 0.0004; g.add(trM);
  // rejilla de electrodos (10 × 10) y su brillo (azul = el chip estimula)
  const EN = 10, es = 0.0095, eg = new THREE.BoxGeometry(0.0048, 0.0012, 0.0048);
  const eM = new THREE.MeshStandardMaterial({ color: 0xd9b25c, metalness: 1, roughness: 0.25 });
  const el = new THREE.InstancedMesh(eg, eM, EN * EN); let k = 0; const ePos = [];
  for (let i = 0; i < EN; i++) for (let j = 0; j < EN; j++) { const x = (i - (EN - 1) / 2) * es, z = (j - (EN - 1) / 2) * es; _o.position.set(x, CHIP.t / 2 + 0.0006, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); _o.updateMatrix(); el.setMatrixAt(k++, _o.matrix); ePos.push(v3(x, CHIP.t / 2 + 0.0013, z)); }
  g.add(el);
  const padG = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.011, 0.011), new THREE.MeshBasicMaterial({ color: 0xffffff, map: starTex0(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), EN * EN);
  for (let i = 0; i < EN * EN; i++) { _o.position.copy(ePos[i]); _o.position.y += 0.0003; _o.rotation.set(-Math.PI / 2, 0, 0); _o.scale.setScalar(1); _o.updateMatrix(); padG.setMatrixAt(i, _o.matrix); padG.setColorAt(i, new THREE.Color(0, 0, 0)); }
  padG.renderOrder = 6; padG.frustumCulled = false; g.add(padG);
  // pocillo de cristal con el medio de cultivo (rosa, como el de los laboratorios)
  const well = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.014, 64, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1 }));
  well.position.y = CHIP.t / 2 + 0.007; well.renderOrder = 7; g.add(well);
  const wellRim = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.0012, 8, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.5, clearcoat: 1 }));
  wellRim.rotation.x = Math.PI / 2; wellRim.position.y = CHIP.t / 2 + 0.014; g.add(wellRim);
  const med = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.006, 64), new THREE.MeshStandardMaterial({ color: 0xff5f9a, roughness: 0.45, transparent: true, opacity: 0.08, depthWrite: false, emissive: 0xff5fa8, emissiveIntensity: 0.03 }));
  med.position.y = CHIP.t / 2 + 0.0035; med.renderOrder = 7; g.add(med);
  // neuronas: cuerpos (esferas que brillan) y dendritas (tubos finos que crecen) entre vecinas
  const top = CHIP.t / 2 + 0.003, cells = [];
  for (let i = 0; i < NN; i++) { const a = hash(i * 9.13) * 6.283, r = Math.sqrt(hash(i * 4.71)) * 0.052; cells.push(v3(Math.cos(a) * r, top + hash(i * 2.3) * 0.002, Math.sin(a) * r)); }
  const somaM = cells.map(() => new THREE.MeshStandardMaterial({ color: 0x2a1022, emissive: PINK, emissiveIntensity: 0.6, roughness: 0.4 }));
  const somas = cells.map((p, i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.0032 + hash(i * 5.5) * 0.0018, 14, 10), somaM[i]); s.position.copy(p); s.userData.r = 0.0032 + hash(i * 5.5) * 0.0018; g.add(s); return s; });
  const dendM = new THREE.MeshStandardMaterial({ color: 0x1b0f1a, emissive: 0xc06cff, emissiveIntensity: 0.9, roughness: 0.6 });
  const dends = [];
  for (let i = 0; i < NN; i++) {
    const near = cells.map((p, j) => [j, p.distanceTo(cells[i])]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 2 + Math.floor(hash(i * 1.7) * 2));
    for (const [j] of near) { if (dends.some(d => (d.a === j && d.b === i) || (d.a === i && d.b === j))) continue;
      const A = cells[i], B = cells[j], M2 = A.clone().lerp(B, 0.5).add(v3((hash(i * 3 + j) - 0.5) * 0.012, 0.003, (hash(i + j * 3) - 0.5) * 0.012));
      const curve = new THREE.CatmullRomCurve3([A, M2, B]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0006, 5, false), dendM); g.add(tube);
      dends.push({ a: i, b: j, curve, tube, n: tube.geometry.index.count, seg: 6 * 5 }); }
  }
  // pulsos que viajan por las dendritas
  const PN = 90, pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0017, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd6f0).multiplyScalar(2.6), toneMapped: false }), PN);
  pulses.frustumCulled = false; g.add(pulses);
  // anillos de estímulo (los dispara el chip)
  const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5ab0ff).multiplyScalar(2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const stimE = [12, 27, 34, 45, 53, 61, 66, 72, 87];
  const rings = stimE.map(e => { const m = new THREE.Mesh(new THREE.RingGeometry(0.0035, 0.005, 32), ringM.clone()); m.rotation.x = -Math.PI / 2; m.position.copy(ePos[e]); m.position.y += 0.0005; m.renderOrder = 6; g.add(m); return m; });
  g.userData = { cells, somas, somaM, dends, pulses, PN, eM, padG, rings, stimE, ePos, dendM, med, well };
  return g;
}

// ---------------------------------------------------------------- el cerebro (holograma): dos hemisferios con circunvoluciones que brillan en los surcos y el
// borde, y muchísimos puntos de luz dentro
const BRAIN_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aP; varying vec3 vP; varying vec3 vN; varying vec3 vV;
void main(){ vP = aP; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
const BRAIN_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 col; uniform float op, lit; varying vec3 vP; varying vec3 vN; varying vec3 vV;
float nz(vec3 v){ return sin(v.x * 11. + sin(v.y * 7.) * 2.) * sin(v.y * 13. + sin(v.z * 9.) * 2.) * sin(v.z * 12. + sin(v.x * 8.) * 2.); }
void main(){
  #include <logdepthbuf_fragment>
  float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.4);
  float n = nz(vP), w = fwidth(n) * 1.4 + 0.015, fold = 1. - smoothstep(0., w, abs(n));
  float a = op * (0.05 + 0.85 * f + 0.6 * fold * (0.45 + 0.55 * lit));
  gl_FragColor = vec4(col * a, a);
}`;
const bnz = v => Math.sin(v.x * 11 + Math.sin(v.y * 7) * 2) * Math.sin(v.y * 13 + Math.sin(v.z * 9) * 2) * Math.sin(v.z * 12 + Math.sin(v.x * 8) * 2);
function buildBrain() {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);      // eje largo a lo largo de z (se orienta hacia la cámara)
  const geo = new THREE.SphereGeometry(1, 160, 110), p = geo.attributes.position, v = new THREE.Vector3(), aP = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); aP[i * 3] = v.x; aP[i * 3 + 1] = v.y; aP[i * 3 + 2] = v.z;
    v.multiplyScalar(1 + 0.055 * bnz(v)); if (v.x < 0) v.x *= 0.3; v.x *= 0.6; v.y *= 0.56; if (v.y < -0.22) v.y = -0.22 + (v.y + 0.22) * 0.6; p.setXYZ(i, v.x, v.y, v.z); }
  geo.setAttribute('aP', new THREE.BufferAttribute(aP, 3)); geo.computeVertexNormals();
  const gm = new THREE.ShaderMaterial({ vertexShader: BRAIN_VS, fragmentShader: BRAIN_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { col: { value: new THREE.Color(0xff7fbf).multiplyScalar(1.15) }, op: { value: 0 }, lit: { value: 0 } } });
  for (const sd of [-1, 1]) { const h = new THREE.Mesh(geo, gm); h.position.x = sd * 0.2; h.scale.x = sd; h.renderOrder = 7; inner.add(h); }      // cara medial plana, una frente a la otra
  // puntos (26.000: la idea de «muchísimos», no son 86.000 millones)
  const N = 26000, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { let x, y, z, k = 0; do { x = hash(i * 1.31 + k) * 2 - 1; y = hash(i * 2.17 + k) * 2 - 1; z = hash(i * 3.71 + k) * 2 - 1; k += 0.37; } while (x * x + y * y + z * z > 0.9);
    const sd = x >= 0 ? 1 : -1; pos[i * 3] = sd * (0.21 + Math.abs(x) * 0.52); pos[i * 3 + 1] = Math.max(-0.2, y * 0.5); pos[i * 3 + 2] = z * 0.93; }
  const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: new THREE.Color(0xff8fc8).multiplyScalar(1.5), size: 0.02, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, map: starTex0() }));
  pts.frustumCulled = false; inner.add(pts);
  scene.add(g); g.visible = false; S.brain = { g, gm, pts, N };
}

// ---------------------------------------------------------------- la pantalla flotante (pregunta, Pong y un pasillo de videojuego) y el panel del programa
function buildScreen() {
  const g = new THREE.Group(), T = canvasTex(640, 400);
  g.add(rbox(0.56, 0.37, 0.02, new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.6, metalness: 0.4 }), 0.02));
  const scr = new THREE.Mesh(rplane(0.52, 0.325, 0.012), new THREE.MeshBasicMaterial({ map: T, toneMapped: false })); scr.position.z = 0.0105; g.add(scr);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.43), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fd0ff).multiplyScalar(0.25), map: starTex0(), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  back.position.z = -0.02; back.scale.setScalar(1.6); g.add(back);
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  scene.add(g); g.visible = false; S.screen = { g, T, back };
  const P = canvasTex(560, 600), panel = new THREE.Mesh(rplane(0.3, 0.32, 0.016), new THREE.MeshBasicMaterial({ map: P, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  panel.renderOrder = 9; scene.add(panel); panel.visible = false; S.code = { panel, P };
}
function rplane(w, h, r, seg = 10) { const geo = new THREE.ShapeGeometry(rrShape(w, h, r), seg); const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5); return geo; }

// ---------------------------------------------------------------- polvo en suspensión que se repite cada PER metros (así el bucle es exacto)
function buildDust() {
  const M = 260, tiles = [];
  for (let i = -3; i <= 4; i++) for (let j = -3; j <= 3; j++) tiles.push([i, j]);
  const gen = (q, hmax) => { const ti = tiles[Math.floor(q / M)], k = q % M; return [ti[0] * PER + hash(k * 3.1 + hmax) * PER, 0.03 + Math.pow(hash(k * 5.7 + hmax), 1.3) * hmax, ti[1] * PER + hash(k * 8.3 + hmax) * PER]; };
  S.flow = [flowCloud(M * tiles.length, q => gen(q, 2.2), { size: 1.5, bright: 0.55, farF: 0.06, nearF: 0.18, drift: 0, seed: 2, col: 0xd8e6ff, seedOf: q => q % M })];
}
// ---------------------------------------------------------------- tiempos y animación (todo es función del instante t: se puede dibujar en cualquier orden)
// El perro: paseo inicial hacia ti (y es el mismo paseo con el que acaba, PER metros más allá: bucle exacto), quieto mientras se ve el
// chip, «izquierda, derecha, adelante» y la llegada al objetivo; al final mira a cámara y vuelve a andar.
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const easeIn = x => x * x * x;
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const fract = x => x - Math.floor(x);
const H0 = Math.PI / 2;                                                   // rumbo: hacia +x
const RT = { tx: 1.52, hL: H0 + 0.7, hR: H0 - 0.7, step: 0.24 };          // objetivo en (tx, 0); giros de 40°
const DUTY = 0.62, LIFT = 0.055, RTURN = 0.3;                            // trote: apoyo 62 % del ciclo; altura del pie; «radio» al girar en el sitio
let TT = {}, STRIDE = 0.19, STEPA = 0.06, GT = null, ZL = [0, 0], ZR = [0, 0];
function buildTimes() {
  TT = {
    w1: 4.4,                                                                // el paseo inicial termina (quieto en el origen)
    scr0: K.aprendido2 - 0.05, lock: K.final2 - 0.05, scr1: K.digo2 + 0.5,   // 2: la pantalla con la pregunta
    aus0: K.empresa3 - 0.05, ausOff: K.en4 + 0.3,                           // 3: Australia en el suelo
    ret0: K.en4 - 0.05, elec: K.electrodos4, grow: K.crecen4,              // 4: el chip pelado, los electrodos y las neuronas que crecen
    prog: K.programa6, izq: K.izquierda6, der: K.derecha6, ade: K.adelante6, // 6
    obj: K.objetivo7,                                                        // 7
    jug: K.jugaron11, pong: K.pong11, doom: K.doom11,                        // 11
    w0: K.neuronas12 + 0.05,                                                 // 12: vuelve a andar (el paseo del principio)
  };
  TT.z1a = TT.izq + 0.02; TT.z1b = TT.z1a + 0.6;
  TT.z2a = TT.der + 0.02; TT.z2b = TT.z2a + 0.6;
  TT.fa = TT.ade + 0.06; TT.fb = K.mapa7 - 0.08;
  ZL = [RT.step * Math.sin(RT.hL), RT.step * Math.cos(RT.hL)]; ZR = [ZL[0] + RT.step * Math.sin(RT.hR), ZL[1] + RT.step * Math.cos(RT.hR)];
  buildGait(); buildRates();
}

// ---------------------------------------------------------------- la ruta: 0→1 con velocidad suave (sube, crucero, baja)
const _rp = {};
function rampPos(u, a) {
  const key = a.toFixed(3), n = 2000; let T = _rp[key];
  if (!T) { T = new Float64Array(n + 1); let s = 0; const v = x => { const p = clamp(x / a), q = clamp((1 - x) / a); return p * p * (3 - 2 * p) * q * q * (3 - 2 * q); };
    for (let i = 1; i <= n; i++) { s += v((i - 0.5) / n) / n; T[i] = s; } for (let i = 1; i <= n; i++) T[i] /= s; _rp[key] = T; }
  const f = clamp(u) * n, i = Math.floor(f); return i >= n ? 1 : lerp(T[i], T[i + 1], f - i);
}
const segXZ = (t, t0, t1, A, B, a = 0.3) => { const u = rampPos((t - t0) / (t1 - t0), a); return [lerp(A[0], B[0], u), lerp(A[1], B[1], u)]; };
function walkXZ(tt, sh) { const t0 = TT.w0 - END; return [sh + lerp(RT.tx - PER, 0, rampPos((tt - t0) / (TT.w1 - t0), 0.11)), 0]; }
function dogXZ(t) {
  if (t >= TT.w0) return walkXZ(t - END, PER);
  if (t <= TT.w1) return walkXZ(t, 0);
  if (t < TT.z1a) return [0, 0];
  if (t < TT.z1b) return segXZ(t, TT.z1a, TT.z1b, [0, 0], ZL);
  if (t < TT.z2a) return ZL;
  if (t < TT.z2b) return segXZ(t, TT.z2a, TT.z2b, ZL, ZR);
  if (t < TT.fa) return ZR;
  if (t < TT.fb) return segXZ(t, TT.fa, TT.fb, ZR, [RT.tx, 0], 0.2);
  return [RT.tx, 0];
}
const dogH = t => H0 + (RT.hL - H0) * win(t, TT.z1a - 0.1, 0.26) + (RT.hR - RT.hL) * win(t, TT.z2a - 0.1, 0.3) + (H0 - RT.hR) * win(t, TT.fa - 0.12, 0.3);
function dogPose(t) { const [x, z] = dogXZ(t); return { x, z, h: dogH(t) }; }
// el paso: fase del trote = distancia recorrida (+ lo girado) / zancada; la zancada se ajusta para que en el vídeo entero quepa un número exacto de pasos
function buildGait() {
  const dt = 1 / 240, n = Math.round(END / dt) + 1, g = new Float64Array(n), sp = new Float64Array(n);
  let prev = dogXZ(0), ph = dogH(0), acc = 0;
  for (let i = 1; i < n; i++) { const t = i * dt, p = dogXZ(t), h = dogH(t), d = Math.hypot(p[0] - prev[0], p[1] - prev[1]) + RTURN * Math.abs(h - ph); acc += d; g[i] = acc; sp[i] = d / dt; prev = p; ph = h; }
  sp[0] = sp[1];
  const sm = new Float64Array(n), R = 30; for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = -R; j <= R; j++) { const k = (i + j + n - 1) % (n - 1); s += sp[k]; c++; } sm[i] = s / c; }
  STRIDE = acc / Math.round(acc / 0.19); STEPA = DUTY * STRIDE / 2;
  GT = { dt, n, g, sp: sm, tot: acc };
}
function gaitPhase(t) { let base = 0; while (t < 0) { t += END; base -= GT.tot; } while (t > END) { t -= END; base += GT.tot; } const f = t / GT.dt, i = Math.min(GT.n - 2, Math.floor(f)); return (base + lerp(GT.g[i], GT.g[i + 1], f - i)) / STRIDE; }
function gaitAct(t) { t = ((t % END) + END) % END; const f = t / GT.dt, i = Math.min(GT.n - 2, Math.floor(f)); return clamp(lerp(GT.sp[i], GT.sp[i + 1], f - i) / 0.15); }
function legIK(L, fz, fy) {
  const L1 = DOG.thigh, L2 = DOG.shin, D = Math.min(L1 + L2 - 1e-4, Math.hypot(fz, fy)), beta = Math.atan2(-fz, -fy);
  const gam = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1)), del = Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));
  L.hip.rotation.x = beta + gam; L.knee.rotation.x = -(Math.PI - del);
}
const explodeK = t => cwin(t, K.chip9 - 0.15, K.maquina9 + 0.6, 0.5, 0.5);
const _lc = new THREE.Vector3();
function dogAt(t) {
  const D = S.dog, [x, z] = dogXZ(t), h = dogH(t), ph = gaitPhase(t), act = gaitAct(t), X = explodeK(t);
  D.dog.position.set(x, 0, z); D.dog.rotation.y = h;
  const idle = 1 - act;
  D.body.position.y = DOG.y + act * 0.007 * Math.cos(4 * Math.PI * ph) + 0.003 * Math.sin(2 * Math.PI * 26 * t / END) * idle;
  D.body.rotation.z = act * 0.022 * Math.sin(2 * Math.PI * ph); D.body.rotation.x = act * 0.012 * Math.sin(4 * Math.PI * ph + 1);
  const hipH = D.body.position.y + DOG.hipY, mg = Math.max(cwin(t, K.pasos6 - 0.05, TT.fb + 0.2, 0.15, 0.4) * (0.7 + 0.8 * act), cwin(t, K.motores9 - 0.05, K.todavia10, 0.12, 0.3) * 1.8);
  for (const L of D.legs) {
    const p = fract(ph + (L.id === 'FL' || L.id === 'BR' ? 0 : 0.5));
    let fz, lift = 0;
    if (p < DUTY) fz = STEPA * (1 - 2 * p / DUTY);
    else { const u = (p - DUTY) / (1 - DUTY); fz = -STEPA + 2 * STEPA * sm5(u); lift = Math.sin(Math.PI * u); }
    L.hip.position.x = L.sx * (DOG.hipX + 0.1 * X);
    legIK(L, fz * act, -(hipH - DOG.footR) + lift * act * LIFT);
    L.motorM.emissiveIntensity = mg * (0.75 + 0.25 * Math.sin(t * 20 + L.sx * 2 + L.sz));
  }
  // despiece («el chip, el programa y los motores»)
  D.cap.position.y = 0.13 * X; D.chip.position.y = 0.012 + 0.3 * X; D.head.position.z = 0.36 + 0.14 * X;
  // la cabeza: mira un poco a los lados cuando está quieto; en «derechos» se gira hacia ti
  let yaw = 0.14 * Math.sin(2 * Math.PI * 3 * t / END + 0.5) * idle, pitch = 0.04 * Math.sin(2 * Math.PI * 5 * t / END) * idle;
  const lk = cwin(t, K.derechos12 - 0.12, TT.w0 + 0.1, 0.32, 0.4);
  if (lk > 0.001) { D.dog.updateMatrixWorld(); _lc.copy(cam.position); D.body.worldToLocal(_lc); const a = clamp(Math.atan2(_lc.x, _lc.z - 0.36), -1.15, 1.15), b = clamp(Math.atan2(_lc.y - 0.06, Math.hypot(_lc.x, _lc.z - 0.36)), -0.3, 0.35);
    yaw = lerp(yaw, a, lk); pitch = lerp(pitch, -b, lk); }
  D.head.rotation.set(pitch, yaw, 0);
  D.eyeM.color.copy(new THREE.Color(RTEAL)).multiplyScalar(2.2 + 1.8 * lk);
  // la cúpula de cristal se aparta de la vista cuando la cámara se mete a ver el chip
  D.glass.material.opacity = 0.015 + 0.105 * clamp((cam.position.distanceTo(D.dome.getWorldPosition(_lc)) - 0.5) / 0.5);
}

// ---------------------------------------------------------------- las neuronas del chip: presencia (se recogen y vuelven a crecer), disparos, pulsos y estímulos
const RATE = [], RATE2 = [], PHS = [], PRATE = [];
function buildRates() {
  for (let i = 0; i < NN; i++) { RATE.push(Math.max(1, Math.round((0.7 + 1.5 * hash(i * 3.3)) * END)) / END); RATE2.push(Math.round((4 + 4 * hash(i * 8.1)) * END) / END); PHS.push(hash(i * 7.7)); }
  for (let k = 0; k < 90; k++) PRATE.push(Math.round((1.4 + 2.2 * hash(k * 5.1)) * END) / END);
}
const tsI = i => TT.grow + 0.55 * hash(i * 4.4);
const grown = t => t < TT.grow ? 1 - win(t, TT.ret0, 0.32) : clamp((t - TT.grow) / 0.9);
function somaPres(i, t) { return t < TT.grow ? 1 - win(t, TT.ret0, 0.32) : pop(t, tsI(i), 0.3); }
function dendGrow(d, t) { return t < TT.grow ? 1 - win(t, TT.ret0 - 0.05, 0.3) : clamp((t - (Math.max(tsI(d.a), tsI(d.b)) + 0.12)) / 0.6); }
function nBurst(t) {
  return 1.0 * cwin(t, K.responden5 - 0.05, K.responden5 + 1.0, 0.06, 0.4) + 0.6 * cwin(t, K.convierte6 - 0.1, K.pasos6 + 0.3, 0.15, 0.3)
    + 1.0 * cwin(t, K.punado8 - 0.08, K.punado8 + 0.6, 0.05, 0.4) + 0.8 * cwin(t, TT.jug, TT.doom + 0.7, 0.1, 0.3) + 0.5 * cwin(t, K.neuronas1, K.vivas1 + 0.5, 0.15, 0.4);
}
const nAct = t => (0.42 + 0.1 * Math.sin(2 * Math.PI * 7 * t / END) + nBurst(t)) * grown(t);
function spike(i, t) { const a = Math.exp(-fract(t * RATE[i] + PHS[i]) * 14), b = Math.exp(-fract(t * RATE2[i] + PHS[i] * 3.1) * 12) * Math.min(1, nBurst(t)); return Math.max(a, b); }
const stimEnv = t => Math.max(cwin(t, K.manda5 + 0.1, K.escucha5 + 0.15, 0.12, 0.25), 0.7 * cwin(t, TT.jug, TT.doom + 0.5, 0.15, 0.3));
const _col = new THREE.Color();
function chipAt(t) {
  const U = S.dog.chip.userData, na = nAct(t);
  for (let i = 0; i < NN; i++) { const pr = somaPres(i, t), s = U.somas[i]; s.visible = pr > 0.003; s.scale.set(Math.max(0.001, pr), Math.max(0.001, pr) * 0.75, Math.max(0.001, pr));
    U.somaM[i].emissiveIntensity = (0.45 + 3.4 * spike(i, t) * Math.min(1.2, na)) * clamp(pr); }
  for (const d of U.dends) { const gk = dendGrow(d, t), c = Math.floor(gk * d.n / d.seg) * d.seg; d.tube.geometry.setDrawRange(0, c); d.tube.visible = c > 0; d.g = gk; }
  U.dendM.emissiveIntensity = 0.7 + 0.5 * Math.min(1, na);
  for (let k = 0; k < U.PN; k++) {
    const xx = t * PRATE[k] + hash(k * 2.9), c = Math.floor(xx), u = xx - c, d = U.dends[Math.floor(hash(k * 13.1 + c * 7.7) * U.dends.length)], rev = hash(k + c * 3.1) > 0.5;
    const on = hash(k * 1.7 + c * 5.3) < na * 0.8 && d.g >= 1;
    if (on) { _o.position.copy(d.curve.getPoint(rev ? 1 - u : u)); _o.scale.setScalar(0.6 + 0.7 * Math.sin(Math.PI * u)); } else { _o.position.set(0, 0, 0); _o.scale.setScalar(0.0001); }
    _o.rotation.set(0, 0, 0); _o.updateMatrix(); U.pulses.setMatrixAt(k, _o.matrix);
  }
  U.pulses.instanceMatrix.needsUpdate = true;
  const se = stimEnv(t);
  for (let i = 0; i < 100; i++) {
    const ix = Math.floor(i / 10), iz = i % 10, sj = U.stimE.indexOf(i);
    let e = 1.7 * Math.exp(-Math.pow((t - TT.elec - 0.05 - (ix + iz) / 18 * 0.55) / 0.08, 2));          // barrido en «electrodos»
    if (sj >= 0) e += 1.9 * se * (fract(t * 5 + sj * 0.13) < 0.35 ? 1 : 0.12);
    _col.setRGB(0.28 * e, 0.6 * e, 1.0 * e); U.padG.setColorAt(i, _col);
  }
  U.padG.instanceColor.needsUpdate = true;
  U.rings.forEach((m, j) => { const s = fract(t * 2.2 + j * 0.37); m.scale.setScalar(1 + 4 * s); m.material.opacity = (1 - s) * se * 0.9; m.visible = se > 0.01; });
  S.dog.domeL.intensity = (0.03 + 0.1 * Math.min(1.4, na));
  S.dog.stripM.opacity = clamp(0.2 + 0.6 * na);
}

// ---------------------------------------------------------------- el mapa: Australia, la ruta y el objetivo
function mapAt(t) {
  // Australia (en «empresa de Australia»): se dibuja el contorno con el perro en Melbourne
  const ak = cwin(t, TT.aus0, TT.ausOff, 0.05, 0.35);
  S.aus.forEach((l, i) => { const k = i ? clamp((t - TT.aus0 - 0.45 - i * 0.05) / 0.3) : clamp((t - TT.aus0) / 0.85); l.visible = ak > 0.01 && k > 0; if (l.visible) { drawK(l, k); l.material.opacity = ak; } });
  // la ruta, a medida que anda (y se apaga al final, para el bucle)
  const fin = 1 - win(t, TT.w0 + 0.2, 0.9), rv = t > TT.z1a - 0.1 && fin > 0.005; S.route.visible = rv;
  if (rv) { let n = 0; while (n < S.routeT.length && S.routeT[n] <= t) n++; drawK(S.route, n / (S.routeT.length - 1)); S.route.material.opacity = 0.95 * fin; }
  // el objetivo
  const T = S.target, tv = t > TT.obj - 0.05 && fin > 0.005; T.g.visible = tv;
  if (tv) { T.g.position.set(RT.tx, 0.004, 0); T.g.scale.setScalar(Math.max(0.001, pop(t, TT.obj, 0.4))); T.rm.opacity = fin * (0.85 + 0.15 * Math.sin(t * 7));
    const s = fract(t * 1.1); T.wave.scale.setScalar(1 + 1.6 * s); T.wave.material.opacity = (1 - s) * 0.7 * fin * (t < TT.fb ? 1 : 0.4);
    T.glow.material.opacity = fin * (t < TT.fb ? 0.15 : 0.3 + 0.9 * Math.exp(-(t - TT.fb) / 0.5)); }
}

// ---------------------------------------------------------------- el cerebro (8: «no es un cerebro… el tuyo tiene unos 86.000 millones»)
function brainAt(t) {
  const B = S.brain, t0 = K.cerebro8 - 0.06, vis = t > t0 && t < K.chip9 + 0.45; B.g.visible = vis; if (!vis) return;
  const [x, z] = dogXZ(t), k = pop(t, t0, 0.55), out = win(t, K.aqui8 - 0.15, 0.4);
  B.g.position.set(x, lerp(0.7, 1.5, eo(clamp((t - t0) / 0.6))), z);
  B.g.scale.setScalar(Math.max(0.001, 0.5 * (0.2 + 0.8 * k) * (1 + 0.1 * win(t, K.tuyo8, 0.8)) * (1 - 0.9 * easeIn(out))));
  B.g.lookAt(cam.position); B.g.rotateZ(Math.PI); B.g.rotateX(Math.PI / 2 - 0.5); B.g.rotateZ(0.12 * Math.sin((t - t0) * 0.5));      // visto desde arriba: los dos hemisferios
  B.gm.uniforms.op.value = 0.9 * clamp(k) * (1 - out); B.gm.uniforms.lit.value = win(t, K.n86_8, 1.2);
  const u = clamp((t - (K.n86_8 - 0.15)) / (K.millones8 + 0.45 - K.n86_8 + 0.15));
  B.pts.geometry.setDrawRange(0, Math.floor(B.N * Math.pow(u, 1.6))); B.pts.material.opacity = 0.95 * (1 - out) * (1 - 0.45 * win(t, K.aqui8, 0.4));
}

// ---------------------------------------------------------------- la pantalla (2: «¿qué habían aprendido?» · 11: Pong y el pasillo)
function screenAt(t) {
  const Sc = S.screen, v1 = t > TT.scr0 && t < TT.scr1, v2 = t > K.aprendido11 - 0.05 && t < K.le12 + 0.3; Sc.g.visible = v1 || v2; if (!Sc.g.visible) return;
  const t0 = v1 ? TT.scr0 : K.aprendido11 - 0.05, t1 = v1 ? TT.scr1 : K.le12 + 0.3, [x, z] = dogXZ(t);
  const k = Math.max(0.001, pop(t, t0, 0.42) * (1 - easeIn(win(t, t1 - 0.36, 0.36))));
  Sc.g.position.set(x - 0.05, 1.12 + 0.012 * Math.sin(t * 1.7), z); Sc.g.scale.setScalar(k); Sc.g.lookAt(cam.position);
  Sc.back.material.opacity = 0.5 * clamp(k);
  const g = Sc.T.userData.g, W2 = 640, H2 = 400;
  if (t >= TT.doom - 0.06 && v2) drawCorridor(g, t - TT.doom);
  else if (t >= TT.jug && v2) drawPong(g, t - TT.jug);
  else if (v1 && t >= TT.lock) drawLock(g, t - TT.lock);
  else drawQ(g, t);
  Sc.T.needsUpdate = true;
}
function scanlines(g, W2, H2, a = 0.22) { g.fillStyle = `rgba(0,0,0,${a})`; for (let y = 0; y < H2; y += 4) g.fillRect(0, y, W2, 2); }
function drawQ(g, t) {
  const W2 = 640, H2 = 400, fr = Math.floor(t * 24);
  g.fillStyle = '#05070b'; g.fillRect(0, 0, W2, H2);
  for (let i = 0; i < 260; i++) { const x = Math.floor(hash(i * 3.1 + fr * 0.71) * 64) * 10, y = Math.floor(hash(i * 5.3 + fr * 1.37) * 40) * 10, v = hash(i * 1.9 + fr); g.fillStyle = `rgba(${150 + v * 100 | 0},${170 + v * 80 | 0},${200 + v * 55 | 0},${0.05 + v * 0.18})`; g.fillRect(x, y, 10, 10); }
  const gl = hash(fr * 3.3) > 0.8 ? (hash(fr) - 0.5) * 22 : 0;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 230px ${MONO}`;
  g.fillStyle = 'rgba(255,95,168,.75)'; g.fillText('?', W2 / 2 + gl - 6, H2 / 2 + 8); g.fillStyle = 'rgba(98,227,212,.75)'; g.fillText('?', W2 / 2 - gl + 6, H2 / 2 + 8);
  g.fillStyle = '#EEF2F6'; g.fillText('?', W2 / 2 + gl * 0.3, H2 / 2 + 8);
  g.font = `700 22px ${MONO}`; g.fillStyle = 'rgba(238,242,246,.65)'; g.fillText('ARCHIVO: ???', W2 / 2, H2 - 34);
  scanlines(g, W2, H2);
}
function drawLock(g, t) {
  const W2 = 640, H2 = 400; g.fillStyle = '#05070b'; g.fillRect(0, 0, W2, H2);
  const k = eo(clamp(t / 0.25)), cx = W2 / 2, cy = 168;
  g.strokeStyle = '#FFC24A'; g.lineWidth = 16; g.beginPath(); g.arc(cx, cy - 40 + 20 * (1 - k), 52, Math.PI, 0); g.lineTo(cx + 52, cy - 10); g.moveTo(cx - 52, cy - 40 + 20 * (1 - k)); g.lineTo(cx - 52, cy - 10); g.stroke();
  g.fillStyle = '#FFC24A'; rr(g, cx - 80, cy - 14, 160, 118, 16); g.fill(); g.fillStyle = '#05070b'; g.beginPath(); g.arc(cx, cy + 34, 14, 0, 7); g.fill(); g.fillRect(cx - 5, cy + 38, 10, 34);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 40px ${MONO}`; g.fillStyle = '#EEF2F6'; g.letterSpacing = '6px'; g.fillText('AL FINAL', cx, 340); g.letterSpacing = '0px';
  scanlines(g, W2, H2, 0.18);
}
// Pong: dos palas y la pelota (la de la izquierda la mueven las neuronas); píxeles gordos
function drawPong(g, u) {
  const W2 = 640, H2 = 400, P = 10; g.fillStyle = '#020304'; g.fillRect(0, 0, W2, H2);
  g.fillStyle = 'rgba(238,242,246,.5)'; for (let y = 10; y < H2; y += 30) g.fillRect(W2 / 2 - 4, y, 8, 16);
  const vx = 560, vy = 330, bx0 = 300, by0 = 120, tri = (x, a, b) => { const L = b - a, m = fract((x - a) / (2 * L)) * 2; return a + L * (m < 1 ? m : 2 - m); };
  const bx = tri(bx0 + vx * u, 50, W2 - 60), by = tri(by0 + vy * u, 20, H2 - 30);
  const pl = clamp(lerp(by, H2 / 2, 0.25) - 40, 10, H2 - 90), pr = clamp(H2 - by - 40 + 30 * Math.sin(u * 3), 10, H2 - 90);
  g.fillStyle = '#FF5FA8'; g.fillRect(30, Math.round(pl / P) * P, 16, 80); g.fillStyle = '#EEF2F6'; g.fillRect(W2 - 46, Math.round(pr / P) * P, 16, 80);
  g.fillRect(Math.round(bx / P) * P, Math.round(by / P) * P, 16, 16);
  g.font = `700 54px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#FF5FA8'; g.fillText(String(3 + Math.floor(u * 1.4)), W2 / 2 - 70, 18); g.fillStyle = '#EEF2F6'; g.fillText('2', W2 / 2 + 70, 18);
  scanlines(g, W2, H2, 0.2);
}
// pasillo de un videojuego en primera persona (genérico): paredes de ladrillo que pasan, suelo, techo, punto de mira y un arma de píxeles
let _cor = null;
function drawCorridor(g, u) {
  const W2 = 640, H2 = 400, w = 160, h = 100; if (!_cor) { const c = document.createElement('canvas'); c.width = w; c.height = h; _cor = c.getContext('2d'); }
  const c = _cor, cx = w / 2 + 6 * Math.sin(u * 2.2), cy = h / 2 - 4; c.fillStyle = '#120806'; c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y++) { const d = Math.abs(y - cy) / (h / 2); c.fillStyle = y < cy ? `rgb(${20 + d * 30 | 0},${14 + d * 18 | 0},${12 + d * 14 | 0})` : `rgb(${40 + d * 70 | 0},${28 + d * 40 | 0},${18 + d * 22 | 0})`; c.fillRect(0, y, w, 1); }
  for (let s = 0; s < 14; s++) {                     // tramos de pared que se acercan
    const z = 1 + ((s - fract(u * 2.6)) * 0.55), z1 = z + 0.55; if (z <= 0.2) continue;
    for (const sd of [-1, 1]) { const x0 = cx + sd * 34 / z, x1 = cx + sd * 34 / z1, y0a = cy - 30 / z, y0b = cy + 30 / z, y1a = cy - 30 / z1, y1b = cy + 30 / z1, sh = clamp(1.3 / z);
      c.fillStyle = `rgb(${70 * sh + 30 | 0},${36 * sh + 14 | 0},${24 * sh + 10 | 0})`; c.beginPath(); c.moveTo(x0, y0a); c.lineTo(x1, y1a); c.lineTo(x1, y1b); c.lineTo(x0, y0b); c.closePath(); c.fill();
      c.strokeStyle = `rgba(0,0,0,${0.5 * sh})`; c.lineWidth = 1; for (let r = 1; r < 5; r++) { const ya = lerp(y0a, y0b, r / 5), yb = lerp(y1a, y1b, r / 5); c.beginPath(); c.moveTo(x0, ya); c.lineTo(x1, yb); c.stroke(); } }
  }
  c.fillStyle = '#000'; c.fillRect(cx - 34 / 8.7, cy - 30 / 8.7, 68 / 8.7, 60 / 8.7);
  const bob = Math.abs(Math.sin(u * 7)) * 3, fl = fract(u * 1.6) < 0.12;
  if (fl) { c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(w / 2, h - 30 - bob, 7, 0, 7); c.fill(); }
  c.fillStyle = '#3a3f46'; c.fillRect(w / 2 - 6, h - 26 - bob, 12, 26); c.fillStyle = '#5a616b'; c.fillRect(w / 2 - 4, h - 34 - bob, 8, 10); c.fillStyle = '#b07a56'; c.fillRect(w / 2 - 9, h - 12 - bob, 18, 12);
  c.fillStyle = '#7CF0A9'; c.fillRect(w / 2 - 1, h / 2 - 5, 2, 3); c.fillRect(w / 2 - 1, h / 2 + 2, 2, 3); c.fillRect(w / 2 - 5, h / 2 - 1, 3, 2); c.fillRect(w / 2 + 2, h / 2 - 1, 3, 2);
  g.imageSmoothingEnabled = false; g.drawImage(_cor.canvas, 0, 0, W2, H2); g.imageSmoothingEnabled = true;
  scanlines(g, W2, H2, 0.16);
}

// ---------------------------------------------------------------- el panel del programa (6 y 9): convierte la respuesta en pasos (EJEMPLO)
const CODE = [['respuesta = leer_chip()', '#FF5FA8'], ['si respuesta == A:', '#EEF2F6'], ['    paso(IZQUIERDA)', '#FFB547'], ['si respuesta == B:', '#EEF2F6'], ['    paso(DERECHA)', '#FFB547'], ['si respuesta == C:', '#EEF2F6'], ['    paso(ADELANTE)', '#FFB547']];
function codeAt(t) {
  const v1 = cwin(t, TT.prog + 0.1, TT.izq - 0.12, 0.3, 0.3), v2 = 0, k = v1, Pn = S.code.panel;      // (en 9 el programa va en el HUD)
  Pn.visible = k > 0.01; if (!Pn.visible) return;
  const [x, z] = dogXZ(t), t0 = TT.prog + 0.1;
  Pn.position.set(x - 0.28, 0.83, z + 0.36);
  Pn.quaternion.copy(cam.quaternion); Pn.scale.setScalar(Math.max(0.001, pop(t, t0, 0.4) * clamp(k * 1.5) * (v1 >= v2 ? 1 : 0.7))); Pn.material.opacity = clamp(k);
  const g = S.code.P.userData.g, W2 = 560, H2 = 600;
  g.clearRect(0, 0, W2, H2); g.fillStyle = 'rgba(6,10,16,.9)'; rr(g, 4, 4, W2 - 8, H2 - 8, 26); g.fill(); g.strokeStyle = 'rgba(46,230,201,.6)'; g.lineWidth = 3; rr(g, 4, 4, W2 - 8, H2 - 8, 26); g.stroke();
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `700 24px ${MONO}`; g.fillStyle = '#9AA1AB'; g.letterSpacing = '4px'; g.fillText('PROGRAMA · EJEMPLO', 36, 52); g.letterSpacing = '0px';
  g.fillStyle = 'rgba(238,242,246,.25)'; g.fillRect(36, 80, W2 - 72, 2);
  const ty = clamp((t - t0) / 1.0) * CODE.reduce((s, l) => s + l[0].length, 0); let left = ty;
  g.font = `700 27px ${MONO}`;
  CODE.forEach(([s, col], i) => { const n = Math.max(0, Math.min(s.length, Math.floor(left))); left -= s.length; g.fillStyle = col; g.fillText(s.slice(0, n), 36, 130 + i * 66);
    if (n > 0 && n < s.length && Math.sin(t * 12) > 0) g.fillRect(36 + g.measureText(s.slice(0, n)).width + 4, 116 + i * 66, 14, 28); });
  S.code.P.needsUpdate = true;
}
// ---------------------------------------------------------------- cámara: un solo plano que sigue al perro (claves relativas a su posición en el suelo).
// Empieza delante de él mientras anda hacia ti y acaba igual, PER metros más allá: el último fotograma es el primero.
let CKS = [];
const K0 = [[1.85, 0.98, 0.75], [0.05, 0.42, 0.0], 34];
function buildCam() {
  const C = CHIP_Y;
  CKS = [
    [0, ...K0],
    [0.6, [1.78, 0.95, 0.74], [0.08, 0.43, 0.0], 34],
    [K.cerebro1 + 0.12, [1.25, 0.7, 0.55], [0.42, 0.48, 0.0], 34],                 // «no tiene cerebro»: la cabeza
    [K.pero1 + 0.28, [0.85, 1.25, 0.6], [0.05, 0.55, 0.0], 34],
    [K.neuronas1 + 0.35, [0.3, 0.86, 0.24], [0.0, C, 0.0], 34],                       // «neuronas humanas vivas»: la cúpula
    [K.vivas1 + 0.45, [0.26, 0.84, 0.32], [0.0, C, 0.0], 34],
    [K.aprendido2 + 0.35, [2.3, 1.45, 2.0], [0.05, 0.8, 0.0], 34],             // 2: la pantalla con la pregunta
    [K.como2, [2.0, 1.3, 1.75], [0.05, 0.75, 0.0], 34],
    [K.digo2 + 0.25, [2.0, 1.6, 1.6], [0.05, 0.8, 0.0], 34],
    [K.cortical3 + 0.25, [-0.3, 3.4, 2.2], [0.3, 0.3, -0.35], 34],                  // 3: sube; Australia en el suelo
    [K.australia3 + 0.15, [0.25, 9.5, -0.82], [0.85, 0.0, -0.82], 34],
    [K.en4 - 0.12, [0.32, 9.1, -0.8], [0.84, 0.0, -0.8], 34],
    [K.chip4 + 0.25, [-0.14, 0.87, 0.14], [0.0, C, 0.0], 34],                        // 4: baja en picado al chip
    [K.electrodos4 + 0.3, [-0.17, 0.81, 0.1], [0.0, C, 0.0], 34],
    [K.crecen4 + 0.45, [-0.07, 0.83, 0.2], [0.0, C, 0.005], 34],
    [K.cultivadas4 + 0.2, [0.12, 0.8, 0.21], [0.0, C, 0.0], 34],
    [K.laboratorio4 + 0.5, [0.2, 0.76, 0.17], [0.0, C, 0.0], 34],
    [K.chip5 + 0.2, [0.23, 0.69, 0.18], [0.0, C + 0.004, 0.0], 34],                  // 5: señales y respuesta, a ras del chip
    [K.senales5 + 0.2, [0.19, 0.67, 0.12], [0.0, C, 0.0], 34],
    [K.escucha5, [0.15, 0.68, 0.21], [0.0, C, 0.0], 34],
    [K.responden5 + 0.3, [0.17, 0.73, 0.19], [0.0, C + 0.008, 0.0], 34],
    [K.programa6 + 0.18, [-0.9, 1.4, 1.95], [-0.1, 0.62, 0.2], 34],                // 6: el programa, los pasos
    [K.pasos6 + 0.1, [-1.15, 1.3, 1.85], [-0.1, 0.6, 0.2], 34],
    [K.izquierda6 - 0.08, [-2.6, 1.85, 0.4], [0.6, 0.2, 0.0], 34],                 // por detrás: izquierda y derecha se ven como son
    [K.adelante6 + 0.35, [-2.55, 1.85, 0.4], [0.65, 0.2, 0.0], 34],
    [K.objetivo7, [-2.4, 1.9, 0.45], [0.7, 0.15, 0.0], 34],                         // 7: hacia el objetivo
    [K.mapa7 + 0.35, [-2.3, 3.6, 0.15], [-0.45, 0.0, 0.0], 34],                       // «mapa»: la ruta, desde arriba
    [K.ojo8 + 0.05, [-2.25, 3.55, 0.18], [-0.42, 0.0, 0.0], 34],
    [K.no8 + 0.15, [1.5, 1.1, 2.2], [0.0, 0.6, 0.0], 34],                          // 8: «no es un cerebro»
    [K.cerebro8 + 0.45, [2.3, 1.6, 3.6], [0.0, 1.0, 0.0], 34],
    [K.millones8, [2.05, 1.7, 3.2], [0.0, 1.1, 0.0], 34],
    [K.aqui8 - 0.05, [1.75, 1.5, 2.7], [0.0, 1.0, 0.0], 34],
    [K.punado8 + 0.15, [0.3, 0.86, 0.28], [0.0, C, 0.0], 34],                         // «aquí hay un puñado»: la cúpula
    [K.chip9 - 0.05, [0.6, 1.05, 0.65], [0.0, 0.58, 0.0], 34],
    [K.chip9 + 0.4, [2.15, 1.45, 2.25], [0.18, 0.7, 0.0], 34],                         // 9: el despiece
    [K.motores9 + 0.2, [1.85, 1.1, 2.45], [0.15, 0.52, 0.05], 34],
    [K.maquina9 + 0.25, [2.3, 1.45, 2.15], [0.15, 0.6, 0.0], 34],
    [K.revisado10, [2.4, 1.3, 1.4], [0.0, 0.5, 0.0], 34],                          // 10: sin revisar
    [K.cientificos10 + 0.45, [2.2, 1.35, 1.8], [0.0, 0.55, 0.0], 34],
    [K.aprendido11 + 0.25, [1.9, 1.5, 1.9], [-0.05, 0.86, -0.05], 34],               // 11: la pantalla vuelve: Pong y el pasillo
    [K.neuronas11 + 0.2, [1.8, 1.4, 1.8], [0.0, 0.85, 0.0], 34],
    [K.jugaron11 + 0.15, [1.35, 1.35, 1.35], [-0.08, 1.0, -0.08], 34],
    [K.doom11 + 0.1, [1.2, 1.32, 1.2], [-0.05, 1.08, 0.0], 34],
    [K.le12 + 0.4, [0.6, 0.8, 2.7], [0.25, 0.46, 0.0], 34],                          // 12: de lado; gira la cabeza hacia ti
    [K.maquina12, [0.62, 0.8, 2.55], [0.25, 0.46, 0.0], 34],
    [K.neuronas12 + 0.25, [1.0, 0.9, 2.0], [0.1, 0.45, 0.0], 34],
    [END - 1.2, [1.6, 1.0, 1.15], [0.06, 0.42, 0.0], 34],
    [END, ...K0],
  ];
}
// la cámara va donde va el perro (su posición en el suelo, sin el balanceo del paso)
function camAt(t) { const c = camKeys(t, CKS), [x, z] = dogXZ(t); c.p.x += x; c.p.z += z; c.l.x += x; c.l.z += z; return c; }
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[K.chip4 + 0.2, 0.04], [TT.fb, 0.035], [K.cerebro8, 0.045], [K.revisado10, 0.035], [K.pong11, 0.03], [K.doom11, 0.04]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st0) {
  NOW = t;
  const c = st0.l, d = st0.p.distanceTo(c), yaw = Math.atan2(st0.p.x - c.x, st0.p.z - c.z), k = clamp(d / 5, 0.35, 1.4);
  rigAt(c, yaw, k, 0.85, 0.6);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.12;
  scene.fog.density = lerp(0.085, 0.022, clamp((st0.p.y - 1.5) / 5));
  dogAt(t); chipAt(t); mapAt(t); brainAt(t); screenAt(t); codeAt(t);
  post.uniforms.fade.value = 0;
}
// ---------------------------------------------------------------- HUD: cabecera con la actividad en vivo, la pregunta pendiente, rótulos con línea guía, flechas,
// el osciloscopio de estímulo y respuesta, el contador del cerebro, el sello y las etiquetas del final
function buildHudPlan() {}
const HP = '#FF5FA8', HB = '#6FB8FF', HG = '#FFC24A';
const cw = (t, t0, t1) => win(t, t0, 0.22) * (1 - win(t, t1, 0.22));
function lab(P, txt, sub, k, opt) { if (k <= 0.01 || !P) return; callout(P, txt, sub, k, { size: 27, subSize: 19, bg: true, ...opt }); }
function bracketMsg(t, txt, col, k, blink) {
  if (k <= 0.01) return; const on = !blink || Math.sin(t * 9) > -0.3;
  hg.save(); hg.globalAlpha = k; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right'; hg.textBaseline = 'alphabetic';
  const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
  hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath();
  hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
  hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
  hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y); hg.restore();
}
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('PERRO ROBOT', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText('GUIADO POR NEURONAS HUMANAS', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  // a la derecha: la actividad de las neuronas, en vivo
  hg.textAlign = 'right'; hg.letterSpacing = '3px'; hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('ACTIVIDAD', 1024, 104);
  const x0 = 830, x1 = 1024, yb = 152;
  hg.beginPath(); for (let i = 0; i <= 96; i++) { const u = i / 96, tau = t - (1 - u) * 1.6; let v = 0; for (let j = 0; j < 6; j++) v = Math.max(v, spike(j, tau)); v *= Math.min(1.2, nAct(tau) + 0.25);
    const y = yb - v * 34 + Math.sin(u * 60 + t * 9) * 1.2; i ? hg.lineTo(lerp(x0, x1, u), y) : hg.moveTo(x0, y); }
  glowStroke(HP, 2.2, 10); hg.stroke(); noGlow();
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('EN VIVO', 1024, 182);
  if (Math.sin(t * 6) > -0.2) { hg.fillStyle = HC.red; hg.beginPath(); hg.arc(1024 - hg.measureText('EN VIVO').width - 16, 176, 6, 0, 7); hg.fill(); }
  hg.restore();
  bracketMsg(t, '¿QUÉ APRENDIERON?', HC.amber, win(t, K.aprendido2 + 0.1, 0.3) * (1 - win(t, K.pong11 - 0.05, 0.12)), true);
  bracketMsg(t, 'PONG', HG, win(t, K.pong11 - 0.05, 0.15) * (1 - win(t, K.doom11 - 0.05, 0.08)), false);
  bracketMsg(t, 'PONG · DOOM', HG, win(t, K.doom11 - 0.05, 0.12) * (1 - win(t, END - 1.3, 0.3)), false);
}
const chipPt = p => S.dog.chip.localToWorld(p.clone());
// flecha gruesa con brillo (dirección en grados: 180 izquierda, 0 derecha, -90 arriba)
function bigArrow(x, y, ang, k, col, txt) {
  if (k <= 0.01) return; const s = 0.6 + 0.4 * backOut(clamp(k * 1.6));
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(x, y);
  hg.save(); hg.rotate(ang * Math.PI / 180); hg.scale(s, s);
  hg.beginPath(); hg.moveTo(-110, -26); hg.lineTo(20, -26); hg.lineTo(20, -70); hg.lineTo(120, 0); hg.lineTo(20, 70); hg.lineTo(20, 26); hg.lineTo(-110, 26); hg.closePath();
  hg.fillStyle = 'rgba(0,0,0,.45)'; hg.fill(); glowStroke(col, 5, 22); hg.stroke(); noGlow(); hg.restore();
  hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '8px'; hfont(40); hg.fillStyle = col; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 14;
  hg.fillText(txt, 0, ang === -90 ? 150 : 128); hg.restore();
}
// osciloscopio de dos canales: estímulo del chip (azul) y respuesta de las neuronas (rosa)
function stimScope(t, a) {
  if (a <= 0.01) return;
  const x = 56, y = 1290, w = 968, h = 226;
  hg.save(); hg.globalAlpha = a; hg.fillStyle = 'rgba(0,0,0,.62)'; hg.strokeStyle = 'rgba(238,242,246,.28)'; hg.lineWidth = 1.5; rr(hg, x, y, w, h, 8); hg.fill(); hg.stroke();
  const rows = [['ESTÍMULO', HB, u => { const tau = t - (1 - u) * 1.4, e = stimEnv(tau); return e * (fract(tau * 5) < 0.35 ? 1 : 0); }, win(t, K.manda5, 0.2)],
    ['RESPUESTA', HP, u => { const tau = t - (1 - u) * 1.4; let v = 0; for (let j = 0; j < 8; j++) v = Math.max(v, spike(j, tau)); return v * Math.min(1, nAct(tau)); }, win(t, K.escucha5, 0.2)]];
  rows.forEach(([name, col, fn, k], r) => {
    const yy = y + 34 + r * 100, gx = x + 220, gw = w - 250;
    hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.letterSpacing = '3px'; hfont(21); hg.fillStyle = col; hg.globalAlpha = a * (0.35 + 0.65 * k); hg.fillText(name, x + 26, yy + 30);
    hg.strokeStyle = 'rgba(238,242,246,.12)'; hg.lineWidth = 1; hg.beginPath(); hg.moveTo(gx, yy + 58); hg.lineTo(gx + gw, yy + 58); hg.stroke();
    hg.save(); hg.beginPath(); hg.rect(gx, yy - 4, gw, 70); hg.clip(); hg.beginPath();
    for (let i = 0; i <= 300; i++) { const u = i / 300, v = fn(u) * k; const py = yy + 58 - v * 54 + (r ? Math.sin(u * 140 + t * 30) * 1.5 : 0); i ? hg.lineTo(gx + gw * u, py) : hg.moveTo(gx, py); }
    glowStroke(col, 2.6, 12); hg.stroke(); noGlow(); hg.restore();
  });
  hg.restore();
}
// línea de datos discontinua que corre de A a B
function flowLine(A, B, k, col, t) {
  if (k <= 0.01 || !A || !B || !A.ok || !B.ok) return; const e = eo(clamp(k * 1.5));
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.setLineDash([12, 14]); hg.lineDashOffset = -t * 160; glowStroke(col, 3, 12);
  hg.beginPath(); hg.moveTo(A.x, A.y); hg.lineTo(lerp(A.x, B.x, e), lerp(A.y, B.y, e)); hg.stroke(); hg.setLineDash([]); noGlow();
  hg.fillStyle = col; hg.beginPath(); hg.arc(lerp(A.x, B.x, e), lerp(A.y, B.y, e), 6, 0, 7); hg.fill(); hg.restore();
}
// el programa en 9 (es software: va en el HUD, a la izquierda)
function codeCard(t, k, t0) {
  if (k <= 0.01) return; const x = 56, y = 540, w = 372, h = 300, e = eo(clamp(k * 1.6));
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.fillStyle = 'rgba(6,10,16,.86)'; rr(hg, x, y, w * e, h, 12); hg.fill(); hg.strokeStyle = 'rgba(46,230,201,.7)'; hg.lineWidth = 2; rr(hg, x, y, w * e, h, 12); hg.stroke();
  if (e > 0.95) { hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.letterSpacing = '3px'; hfont(17); hg.fillStyle = '#62E3D4'; hg.fillText('PROGRAMA · EJEMPLO', x + 22, y + 32);
    hg.fillStyle = 'rgba(238,242,246,.22)'; hg.fillRect(x + 22, y + 52, w - 44, 1.5); hg.letterSpacing = '0px'; hfont(17);
    let left = clamp((t - t0) / 0.8) * CODE.reduce((s2, l) => s2 + l[0].length, 0);
    CODE.forEach(([s2, col], i) => { const n = Math.max(0, Math.min(s2.length, Math.floor(left))); left -= s2.length; hg.fillStyle = col; hg.fillText(s2.slice(0, n), x + 22, y + 84 + i * 32); }); }
  hg.restore();
}
const fmtN = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function hudAt(t) {
  hudBegin(); hdr(t);
  const D = S.dog, U = D.chip.userData;
  D.dog.updateMatrixWorld(true);
  const headP = D.head.localToWorld(v3(0, 0.03, 0.12)), domeP = D.dome.localToWorld(v3(0, 0.13, 0));
  // 1: «no tiene cerebro» (la cabeza) · «neuronas humanas vivas» (la cúpula)
  { const k = cw(t, K.cerebro1 - 0.05, K.pero1 + 0.15); if (k > 0.01) { const P = proj(headP); brackets(P, 210, 190, k, HC.red, 3); lab(headP, 'SIN CEREBRO', null, k, { dx: -150, dy: -170, color: HC.red }); } }
  lab(domeP, 'NEURONAS HUMANAS', t > K.vivas1 - 0.03 ? 'VIVAS' : null, cw(t, K.neuronas1 - 0.03, K.y2 + 0.25), { dx: 150, dy: -210, color: HP, subCol: HC.white });
  // 3: Cortical Labs · Australia · Melbourne
  { const k = cw(t, K.cortical3 - 0.03, TT.ausOff - 0.15); if (k > 0.01) { bigText('CORTICAL LABS', W / 2, 1450, 66, HC.white, k, { glow: 12, dark: 24 }); bigText('EMPRESA · AUSTRALIA', W / 2, 1530, 30, '#62E3D4', win(t, K.empresa3 - 0.03, 0.2) * k, { dark: 16, ls: 6 }); } }
  lab(v3(dogXZ(t)[0], 0.3, 0), 'MELBOURNE', null, cw(t, K.australia3 + 0.2, TT.ausOff - 0.2), { dx: 110, dy: -120, color: '#62E3D4' });
  // 4: chip, electrodos, neuronas humanas, cultivadas en laboratorio
  lab(chipPt(v3(0.07, CHIP.t / 2, 0.07)), 'CHIP', null, cw(t, K.chip4 + 0.05, K.electrodos4 - 0.05), { dx: 150, dy: -170, color: HC.white });
  lab(chipPt(U.ePos[44]), 'ELECTRODOS', null, cw(t, K.electrodos4 - 0.02, K.crecen4 - 0.05), { dx: 150, dy: -200, color: HB });
  lab(chipPt(U.cells[5]), 'NEURONAS HUMANAS', null, cw(t, K.neuronas4 - 0.03, K.cultivadas4 - 0.05), { dx: -150, dy: -190, color: HP });
  lab(chipPt(v3(0.045, CHIP.t / 2 + 0.008, -0.04)), 'CULTIVADAS EN LABORATORIO', 'A PARTIR DE CÉLULAS MADRE', cw(t, K.cultivadas4 - 0.03, K.el5 - 0.05), { dx: 60, dy: -200, color: HC.white, len: 30 });
  // 5: señales y respuesta
  stimScope(t, cw(t, K.manda5 - 0.15, K.programa6 - 0.1));
  lab(chipPt(U.ePos[U.stimE[3]]), 'SEÑALES ELÉCTRICAS', null, cw(t, K.senales5 - 0.03, K.escucha5 - 0.05), { dx: 150, dy: -200, color: HB });
  lab(chipPt(U.cells[12]), 'RESPUESTA', null, cw(t, K.responden5 - 0.03, K.programa6 - 0.05), { dx: -150, dy: -210, color: HP });
  // 6: el programa; la respuesta → pasos; izquierda, derecha, adelante
  { const Pn = S.code.panel; if (Pn.visible) lab(Pn.position.clone().add(v3(0, 0.17, 0)), 'PROGRAMA', null, cw(t, K.programa6 - 0.03, K.izquierda6 - 0.2), { dx: 120, dy: -140, color: '#62E3D4' }); }
  { const A = proj(domeP), Pn = S.code.panel, B = Pn.visible ? proj(Pn.position) : null;
    flowLine(A, B, cw(t, K.convierte6 - 0.05, K.izquierda6 - 0.15), HP, t);
    const k2 = cw(t, K.pasos6 - 0.25, K.izquierda6 - 0.1); if (B && k2 > 0.01) for (const L of D.legs) flowLine(B, proj(L.hm.getWorldPosition(new THREE.Vector3())), k2, HC.amber, t);
    lab(D.legs[1].hm.getWorldPosition(new THREE.Vector3()), 'PASOS', null, cw(t, K.pasos6 - 0.03, K.izquierda6 - 0.1), { dx: 140, dy: 120, color: HC.amber }); }
  bigArrow(W / 2, 1330, 180, cwin(t, K.izquierda6 - 0.03, K.derecha6 - 0.05, 0.08, 0.1), HC.amber, 'IZQUIERDA');
  bigArrow(W / 2, 1330, 0, cwin(t, K.derecha6 - 0.03, K.adelante6 - 0.05, 0.08, 0.1), HC.amber, 'DERECHA');
  bigArrow(W / 2, 1330, -90, cwin(t, K.adelante6 - 0.03, K.adelante6 + 0.75, 0.08, 0.2), HC.amber, 'ADELANTE');
  // 7: el objetivo
  lab(v3(RT.tx, 0.02, 0), 'OBJETIVO', t > TT.fb ? 'ALCANZADO' : null, cw(t, K.objetivo7 - 0.03, K.ojo8 + 0.1), { dx: 140, dy: -170, color: '#FF4D61', subCol: '#7CF0A9' });
  // 8: no es un cerebro · el tuyo: 86.000 millones · aquí, un puñado
  lab(domeP, 'NO ES UN CEREBRO', null, cw(t, K.no8 - 0.03, K.tuyo8 - 0.05), { dx: 150, dy: -170, color: HC.red });
  if (S.brain.g.visible) lab(S.brain.g.position.clone().add(v3(0, 0.3, 0)), 'TU CEREBRO', null, cw(t, K.tuyo8 - 0.03, K.aqui8 - 0.05), { dx: -140, dy: -120, color: HC.white });
  { const k = cw(t, K.n86_8 - 0.1, K.aqui8 + 0.15); if (k > 0.01) { const u = clamp((t - (K.n86_8 - 0.1)) / (K.millones8 + 0.15 - K.n86_8 + 0.1));
      bigText(fmtN(86e9 * Math.pow(u, 3)), W / 2, 1110, 74, '#FF8FC8', k, { type: false, glow: 16, dark: 24, ls: 4 });
      bigText('NEURONAS · CEREBRO HUMANO', W / 2, 1182, 25, HC.white, k, { dark: 14, ls: 5 }); } }
  lab(chipPt(U.cells[9]), 'UN PUÑADO', null, cw(t, K.punado8 - 0.05, K.chip9 - 0.1), { dx: 150, dy: -190, color: HP });
  // 9: chip, programa y motores: máquina
  lab(chipPt(v3(0.07, CHIP.t / 2, 0.07)), 'CHIP', null, cw(t, K.chip9 - 0.03, K.maquina9 + 0.4), { dx: 140, dy: -130, color: HC.white });
  codeCard(t, cw(t, K.programa9 - 0.03, K.todavia10 - 0.05), K.programa9 - 0.03);
  lab(D.legs[1].hm.getWorldPosition(new THREE.Vector3()), 'MOTORES', null, cw(t, K.motores9 - 0.03, K.maquina9 + 0.4), { dx: 150, dy: 110, color: HC.amber });
  { const k = cw(t, K.maquina9 - 0.05, K.todavia10 + 0.1); if (k > 0.01) { const P = proj(D.body.localToWorld(v3(0, 0.0, 0.05))); brackets({ x: P.x, y: P.y - 40 }, 760, 700, k, HC.white, 3); bigText('MÁQUINA', W / 2, 1480, 64, HC.white, k, { glow: 10, dark: 22 }); } }
  // 10: sin revisar
  { const k = cwin(t, K.revisado10 - 0.03, K.aprendido11 - 0.25, 0.15, 0.25); if (k > 0.01) stamp('SIN REVISAR', W / 2, 1450, k, HC.red, 78); }
  // 11: según la empresa; Pong; Doom
  { const Sc = S.screen.g; if (Sc.visible && t > K.aprendido11) { const top = Sc.position.clone().add(v3(0, 0.2, 0));
      { const k = cw(t, K.segun11 - 0.03, K.le12); if (k > 0.01) { const P = proj(Sc.position.clone().add(v3(0, -0.24, 0))); bigText('SEGÚN CORTICAL LABS', W / 2, clamp(P.y + 40, 600, 1500), 28, HC.white, k, { dark: 16, ls: 5 }); } }
      lab(top, 'PONG', null, win(t, K.pong11 - 0.03, 0.22) * (t < K.doom11 - 0.04 ? 1 : 0), { dx: 120, dy: -110, color: HG });
      lab(top, 'DOOM', null, win(t, K.doom11 - 0.04, 0.22) * (1 - win(t, K.le12 + 0.1, 0.2)), { dx: 120, dy: -110, color: HG }); } }
  // 12: ¿derechos?
  lab(headP, '¿DERECHOS?', null, cw(t, K.derechos12 - 0.03, END - 1.5), { dx: 130, dy: -200, color: HG, size: 34 });
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
  return st;
}
function blurPass(src, dst, dx, dy) { quad.material = blurM; blurM.uniforms.tA.value = src.texture; blurM.uniforms.d.value.set(dx, dy); renderer.setRenderTarget(dst); renderer.render(quadScene, quadCam); }
function drawFrame(t) {
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  renderer.setRenderTarget(rtF); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(fxScene, cam);
  quad.material = brightM; brightM.uniforms.tA.value = rtA.texture; brightM.uniforms.tF.value = rtF.texture; renderer.setRenderTarget(rtB[0]); renderer.render(quadScene, quadCam);
  blurPass(rtB[0], rtB[1], 1 / BLW, 0); blurPass(rtB[1], rtB[0], 0, 1 / BLH);
  blurPass(rtB[0], rtC[1], 2 / BLW, 0); blurPass(rtC[1], rtC[0], 0, 2 / BLH); blurPass(rtC[0], rtC[1], 3 / BLW, 0); blurPass(rtC[1], rtC[0], 0, 3 / BLH);
  hg.getImageData(0, 0, 1, 1); hudTex.needsUpdate = true; post.uniforms.tH.value = hudTex;
  quad.material = post; post.uniforms.tA.value = rtA.texture; post.uniforms.tF.value = rtF.texture; post.uniforms.tB.value = rtB[0].texture; post.uniforms.tC.value = rtC[0].texture; post.uniforms.time.value = t;
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
    new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '800' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Bebas', `url(${F}BebasNeue-Regular.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '800' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' }),
    new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '600' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = Math.ceil(lines[lines.length - 1].end + 2.6);
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  // 1 gancho · 2 pregunta · 3 Cortical Labs, Australia · 4 chip, electrodos, crecen · 5 señales, respuesta · 6 programa, pasos · 7 objetivo, mapa
  // 8 no es un cerebro, 86.000 millones, un puñado · 9 chip, programa, motores · 10 sin revisar · 11 Pong y Doom · 12 ¿derechos?
  K = {
    perro1: atL(1, 'perro'), no1: atL(1, '=no'), cerebro1: atL(1, 'cerebro'), pero1: atL(1, 'pero'), guian1: atL(1, 'guian'), neuronas1: atL(1, 'neuronas'), vivas1: atL(1, 'vivas'),
    y2: atL(2, '=y'), aprendido2: atL(2, 'aprendido'), neuronas2: atL(2, 'neuronas'), como2: atL(2, 'como'), final2: atL(2, 'final'), digo2: atL(2, 'digo'),
    cortical3: atL(3, 'cortical'), labs3: atL(3, 'labs'), empresa3: atL(3, 'empresa'), australia3: atL(3, 'australia'),
    en4: atL(4, '=en'), chip4: atL(4, 'chip'), electrodos4: atL(4, 'electrodos'), crecen4: atL(4, 'crecen'), neuronas4: atL(4, 'neuronas'), cultivadas4: atL(4, 'cultivadas'), laboratorio4: atL(4, 'laboratorio'),
    el5: atL(5, '=el'), chip5: atL(5, 'chip'), manda5: atL(5, 'manda'), senales5: atL(5, 'senales'), escucha5: atL(5, 'escucha'), responden5: atL(5, 'responden'),
    un6: atL(6, '=un'), programa6: atL(6, 'programa'), convierte6: atL(6, 'convierte'), pasos6: atL(6, 'pasos'), izquierda6: atL(6, 'izquierda'), derecha6: atL(6, 'derecha'), adelante6: atL(6, 'adelante'),
    perro7: atL(7, 'perro'), objetivo7: atL(7, 'objetivo'), mapa7: atL(7, 'mapa'),
    ojo8: atL(8, 'ojo'), no8: atL(8, '=no'), cerebro8: atL(8, 'cerebro'), tuyo8: atL(8, 'tuyo'), n86_8: atL(8, '86'), millones8: atL(8, 'millones'), aqui8: atL(8, 'aqui'), punado8: atL(8, 'punado'),
    y9: atL(9, '=y'), chip9: atL(9, 'chip'), programa9: atL(9, 'programa'), motores9: atL(9, 'motores'), siguen9: atL(9, 'siguen'), maquina9: atL(9, 'maquina'),
    todavia10: atL(10, 'todavia'), revisado10: atL(10, 'revisado'), cientificos10: atL(10, 'cientificos'),
    aprendido11: atL(11, 'aprendido'), segun11: atL(11, 'segun'), neuronas11: atL(11, 'neuronas'), jugaron11: atL(11, 'jugaron'), pong11: atL(11, 'pong'), doom11: atL(11, 'doom'),
    le12: atL(12, '=le'), derechos12: atL(12, 'derechos'), maquina12: atL(12, 'maquina'), neuronas12: atL(12, 'neuronas'),
  };
  mats(); buildMats(); buildRig();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  scene.fog = new THREE.FogExp2(0x000000, 0.085);
  buildTimes();
  buildDust(); buildMap(); buildRoute(); await buildAus();
  buildDog(); buildBrain(); buildScreen();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.TT = TT; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
