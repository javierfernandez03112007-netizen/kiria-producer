// «¿Qué hace que alguien se pare?» (anuncio de kiriaai.com, voz de Javi): un móvil gigante tumbado es el escenario; ver 14_promo.js.
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
// ---------------------------------------------------------------- piezas: la polaroid (de ella sale el tarro), la peana del visor de kiriaai.com, las seis
// presentaciones (caja, bolsa, tarro, botella, lata y taza: mismas formas y etiquetas que la web, web_estudio/index.html «productos en 3D»),
// el móvil, el calendario, la interrogación «¿el tuyo?» y el bocadillo «KIRIA» con el avión de papel
let FONT3 = null;
const PHN = { w: 0.82, h: 1.72, d: 0.085, sw: 0.765, sh: 1.66, y: 0.92 };     // móvil de pie (centro a y = PHN.y)
const SCR = { w: 540, h: Math.round(540 * PHN.sh / PHN.sw) };                    // lienzo de la pantalla
const PS = 0.5;                                                                 // unidades del visor de la web → metros de la escena
const FOTO = { w: 0.8, h: 0.97, d: 0.012, iw: 0.7, top: 0.05, tilt: -0.08, base: 0.045 };   // polaroid de pie en su soporte (inclinada hacia atrás)
const FOTO_IMG_Y = FOTO.h - FOTO.top - FOTO.iw / 2;                             // centro de la imagen (sobre el canto de abajo)
const FOTO_FLOOR = FOTO_IMG_Y - FOTO.iw / 2 + 0.1;                              // «suelo» dentro de la foto (donde está el tarro)
const JAR_R = 0.42 * PS;                                                        // radio del tarro (para pegarlo a la foto)
const PED0 = v3(0, 0, 0.8), PEDW = v3(0, 0.86, 0.34), PEDW_S = 0.62;            // peana: en el suelo delante de la foto / delante de la pantalla
const PED_R = 0.85 * PS, PED_H = 0.16 * PS;
const PHOTO_H = 352, PHOTO_S = 0.7;                                             // tono y saturación de la foto de las fresas (como domColor de la web)
const BRAND = 'TU MARCA', PNAME = 'Fresa';
let FRESAS = null;                                                              // la «foto» del producto: un dibujo de fresas (1024 × 1024)

function rplane(w, h, r, seg = 10) { const g = new THREE.ShapeGeometry(rrShape(w, h, r), seg); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5); return g; }
function text3(str, size, depth, mats, { bevel = 0.008, base = false } = {}) {
  const g = new TextGeometry(str, { font: FONT3, size, depth, curveSegments: 8, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.55, bevelSegments: 2 });
  g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, base ? 0 : -(b.max.y + b.min.y) / 2, -(b.max.z + b.min.z) / 2);
  const m = new THREE.Mesh(g, mats); m.castShadow = true; m.receiveShadow = true; m.userData.w = b.max.x - b.min.x; m.userData.h = b.max.y - b.min.y; return m;
}

// ---------------------------------------------------------------- la foto de las fresas (dibujada: brillo, semillas, cáliz y sombra)
function drawFresas() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  let gr = g.createRadialGradient(560, 380, 40, 512, 520, 780); gr.addColorStop(0, '#fff3ee'); gr.addColorStop(0.5, '#ffd6cf'); gr.addColorStop(1, '#ee9f9f');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 9; i++) { const x = hash(i * 3.3) * 1024, y = hash(i * 7.1) * 520, r = 30 + hash(i * 5.7) * 70; const b = g.createRadialGradient(x, y, 0, x, y, r); b.addColorStop(0, 'rgba(255,255,255,.35)'); b.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = b; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  const berry = (x, y, s, rot) => {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    g.save(); g.filter = 'blur(22px)'; g.fillStyle = 'rgba(110,15,30,.38)'; g.beginPath(); g.ellipse(20, 215, 160, 36, 0, 0, 7); g.fill(); g.restore();
    const body = new Path2D(); body.moveTo(0, -150); body.bezierCurveTo(125, -178, 195, -98, 178, 4); body.bezierCurveTo(160, 104, 64, 188, 0, 218); body.bezierCurveTo(-64, 188, -160, 104, -178, 4); body.bezierCurveTo(-195, -98, -125, -178, 0, -150); body.closePath();
    const rg = g.createRadialGradient(-55, -70, 16, 0, 10, 240); rg.addColorStop(0, '#ff7276'); rg.addColorStop(0.42, '#e3203a'); rg.addColorStop(1, '#880c1e');
    g.fillStyle = rg; g.fill(body);
    g.save(); g.clip(body);
    for (let r = -6; r <= 8; r++) for (let q = -6; q <= 6; q++) { const sx = q * 40 + (r % 2 ? 20 : 0), sy = r * 31 + 8, d = Math.hypot(sx / 178, (sy - 20) / 205); if (d > 0.93) continue;
      g.save(); g.translate(sx, sy); g.rotate(sx / 380); g.fillStyle = 'rgba(80,6,18,.42)'; g.beginPath(); g.ellipse(0, 3, 7.5, 10.5, 0, 0, 7); g.fill();
      g.fillStyle = '#f7d36e'; g.beginPath(); g.ellipse(0, 0, 4.6, 7.6, 0, 0, 7); g.fill(); g.restore(); }
    const hl = g.createRadialGradient(-72, -78, 4, -72, -78, 120); hl.addColorStop(0, 'rgba(255,255,255,.6)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.fillRect(-220, -220, 440, 440);
    const rim = g.createRadialGradient(0, 30, 120, 0, 30, 240); rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(60,0,10,.35)'); g.fillStyle = rim; g.fillRect(-220, -220, 440, 460);
    g.restore();
    for (const a of [-2.3, -1.55, -0.8, 0.8, 1.55, 2.3]) { g.save(); g.translate(0, -150); g.rotate(a);
      const lg = g.createLinearGradient(0, 0, 0, -110); lg.addColorStop(0, '#22702b'); lg.addColorStop(1, '#5fc466'); g.fillStyle = lg;
      g.beginPath(); g.moveTo(-20, 0); g.quadraticCurveTo(-30, -70, 0, -112); g.quadraticCurveTo(30, -70, 20, 0); g.closePath(); g.fill(); g.restore(); }
    g.fillStyle = '#2f8a37'; rr(g, -10, -236, 20, 92, 10); g.fill();
    g.restore();
  };
  berry(286, 690, 0.92, -0.38); berry(760, 700, 0.88, 0.34); berry(522, 500, 1.22, 0.05);
  return c;
}

// ---------------------------------------------------------------- etiquetas (port de PAINT de la web; Anton → Bebas, Instrument Sans → Inter, JetBrains Mono → SpaceMono)
const FD = 'Bebas', FB = 'Inter', FM = 'SpaceMono';
const hsl = (h, s, l) => `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
function pal(kind) {     // como pal() de la web con la foto de las fresas (tono 352, saturación 0,7)
  const h = PHOTO_H, s = PHOTO_S, paper = kind === 'tarro' || kind === 'botella' || kind === 'taza';
  const pb = { tarro: '#f4ecdc', botella: '#f1e8d3', taza: '#f3f1ec' }[kind];
  return { a1: hsl(h, s, 0.5), a2: hsl(h, s, 0.24), base: paper ? pb : kind === 'bolsa' ? hsl(h, s * 0.8, 0.5) : hsl(h, s, 0.2),
    ink: paper ? hsl(h, s, 0.17) : '#ffffff', rope: '#f3eee6', fill: hsl(h, 0.78, 0.33), lid: hsl(h, s, 0.34), cap: hsl(h, s, 0.3), glass: hsl(h, 0.35, 0.09), inner: hsl(h, s, 0.5) };
}
const slugW = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); };
const tline = (g, t, x, y, mw, px, fam, wt = '', ls = 0) => {
  const set = s => { g.font = `${wt} ${s}px ${fam}`; g.letterSpacing = (ls * s).toFixed(1) + 'px'; };
  set(px); const w = g.measureText(t).width; if (w > mw) set(px * mw / w);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y); g.letterSpacing = '0px';
};
const ttitle = (g, t, x, y, mw, mh, fam) => {
  const words = t.split(/\s+/).filter(Boolean); let best = null;
  for (let n = 1; n <= Math.min(3, words.length); n++) {
    const target = t.length / n, ls = []; let cur = '';
    for (const w of words) { if (cur && cur.length + 1 + w.length > target * 1.2 && ls.length < n - 1) { ls.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
    ls.push(cur); g.font = `100px ${fam}`;
    const mx = Math.max(...ls.map(l => g.measureText(l).width)), s = Math.min(mw / mx * 100, mh / (ls.length * 1.04));
    if (!best || s > best.s * 1.04) best = { s, ls };
  }
  g.font = `900 ${best.s}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  best.ls.forEach((l, i) => g.fillText(l, x, y + (i - (best.ls.length - 1) / 2) * best.s * 1.04));
};
const cover = (g, im, x, y, w, h) => { const s = Math.max(w / im.width, h / im.height), iw = im.width * s, ih = im.height * s; g.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); };
const art = (g, x, y, w, h, P, r = 0) => { g.save(); rr(g, x, y, w, h, Math.max(0.01, r)); g.clip(); g.fillStyle = P.base; g.fillRect(x, y, w, h); cover(g, FRESAS, x, y, w, h); g.restore(); };
const tlines = (g, x, y, w, n, lh, col, a = 0.22) => { g.fillStyle = col; g.globalAlpha = a; for (let i = 0; i < n; i++) { rr(g, x, y + i * lh, w * (i === n - 1 ? 0.5 : 0.78 + 0.22 * ((i * 0.618) % 1)), lh * 0.42, lh * 0.21); g.fill(); } g.globalAlpha = 1; };
const tbars = (g, x, y, w, h) => { g.fillStyle = '#ffffff'; rr(g, x - w * 0.08, y - h * 0.12, w * 1.16, h * 1.24, 6); g.fill(); g.fillStyle = '#121212'; const u = w / 96; let px = x, i = 0; while (px < x + w - u) { const bw = u * (1 + ((i * 7 + 3) % 4)); if (i % 2 === 0) g.fillRect(px, y, bw, h); px += bw; i++; } };
const PAINT = {
  boxFront(g, W2, H2, P) { const b = H2 * 0.235; g.fillStyle = P.base; g.fillRect(0, 0, W2, H2); art(g, 0, 0, W2, H2 - b, P);
    const gr = g.createLinearGradient(0, 0, W2, 0); gr.addColorStop(0, P.a1); gr.addColorStop(1, P.a2); g.fillStyle = gr; g.fillRect(0, H2 - b, W2, H2 * 0.009);
    g.fillStyle = P.ink; g.globalAlpha = 0.72; tline(g, BRAND, W2 / 2, H2 - b * 0.68, W2 * 0.84, H2 * 0.03, FM, '700', 0.16); g.globalAlpha = 1;
    tline(g, PNAME, W2 / 2, H2 - b * 0.34, W2 * 0.88, H2 * 0.062, FB, '700'); },
  boxBack(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2); g.fillStyle = P.ink; tline(g, BRAND, W2 / 2, H2 * 0.12, W2 * 0.8, H2 * 0.085, FD);
    g.globalAlpha = 0.85; tline(g, PNAME, W2 / 2, H2 * 0.21, W2 * 0.8, H2 * 0.042, FB, '700'); g.globalAlpha = 1; tlines(g, W2 * 0.1, H2 * 0.3, W2 * 0.8, 9, H2 * 0.042, P.ink); tbars(g, W2 * 0.58, H2 * 0.8, W2 * 0.3, H2 * 0.09); },
  boxSide(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2); g.save(); g.translate(W2 / 2, H2 / 2); g.rotate(-Math.PI / 2); g.fillStyle = P.ink;
    tline(g, BRAND, 0, -W2 * 0.1, H2 * 0.78, W2 * 0.42, FD); g.globalAlpha = 0.75; tline(g, PNAME, 0, W2 * 0.25, H2 * 0.7, W2 * 0.12, FB, '700'); g.restore(); },
  boxTop(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2); g.fillStyle = P.ink; tline(g, BRAND, W2 / 2, H2 / 2, W2 * 0.7, H2 * 0.34, FD); },
  bagFront(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2); art(g, W2 * 0.09, H2 * 0.09, W2 * 0.82, H2 * 0.6, P, W2 * 0.035);
    g.fillStyle = P.ink; tline(g, BRAND, W2 / 2, H2 * 0.8, W2 * 0.8, H2 * 0.1, FD); g.globalAlpha = 0.7; tline(g, slugW(BRAND) + '.es', W2 / 2, H2 * 0.9, W2 * 0.7, H2 * 0.035, FM, '700', 0.06); g.globalAlpha = 1; },
  bagBack(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2); g.fillStyle = P.ink; tline(g, BRAND, W2 / 2, H2 * 0.46, W2 * 0.78, H2 * 0.16, FD);
    g.globalAlpha = 0.7; tline(g, slugW(BRAND) + '.es', W2 / 2, H2 * 0.6, W2 * 0.7, H2 * 0.04, FM, '700', 0.06); g.globalAlpha = 1; },
  bagSide(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2);
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 3; g.beginPath(); g.moveTo(W2 / 2, 0); g.lineTo(W2 / 2, H2 * 0.8); g.lineTo(0, H2 * 0.94); g.moveTo(W2 / 2, H2 * 0.8); g.lineTo(W2, H2 * 0.94); g.stroke();
    const sh = g.createLinearGradient(0, 0, W2, 0); sh.addColorStop(0, 'rgba(0,0,0,0.1)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.06)'); sh.addColorStop(1, 'rgba(0,0,0,0.1)'); g.fillStyle = sh; g.fillRect(0, 0, W2, H2); },
  plain(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2); },
  jarLabel(g, W2, H2, P) { rr(g, 2, 2, W2 - 4, H2 - 4, H2 * 0.07); g.fillStyle = P.base; g.fill();
    g.strokeStyle = P.ink; g.globalAlpha = 0.35; g.lineWidth = 3; rr(g, H2 * 0.04, H2 * 0.04, W2 - H2 * 0.08, H2 - H2 * 0.08, H2 * 0.045); g.stroke(); g.globalAlpha = 1;
    art(g, W2 * 0.09, H2 * 0.1, W2 * 0.82, H2 * 0.54, P, H2 * 0.035);
    g.fillStyle = P.ink; tline(g, BRAND, W2 / 2, H2 * 0.745, W2 * 0.8, H2 * 0.1, FD); g.globalAlpha = 0.8; tline(g, PNAME, W2 / 2, H2 * 0.865, W2 * 0.8, H2 * 0.066, FB, '700'); g.globalAlpha = 1; },
  bottleLabel(g, W2, H2, P) { rr(g, 2, 2, W2 - 4, H2 - 4, H2 * 0.05); g.fillStyle = P.base; g.fill(); g.strokeStyle = P.ink; g.lineWidth = 3;
    g.globalAlpha = 0.45; rr(g, H2 * 0.035, H2 * 0.035, W2 - H2 * 0.07, H2 - H2 * 0.07, H2 * 0.03); g.stroke(); g.globalAlpha = 0.25; rr(g, H2 * 0.06, H2 * 0.06, W2 - H2 * 0.12, H2 - H2 * 0.12, H2 * 0.02); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = P.ink; tline(g, BRAND, W2 / 2, H2 * 0.17, W2 * 0.66, H2 * 0.12, FD); art(g, W2 * 0.24, H2 * 0.27, W2 * 0.52, H2 * 0.45, P, H2 * 0.03);
    ttitle(g, PNAME, W2 / 2, H2 * 0.83, W2 * 0.7, H2 * 0.13, FB); },
  canPrint(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2);
    const gr = g.createLinearGradient(0, 0, 0, H2); gr.addColorStop(0, 'rgba(255,255,255,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2);
    art(g, W2 * 0.31, H2 * 0.07, W2 * 0.38, H2 * 0.66, P, H2 * 0.04);
    g.fillStyle = P.ink; tline(g, BRAND, W2 / 2, H2 * 0.85, W2 * 0.36, H2 * 0.15, FD);
    for (const u of [0.19, 0.81]) { g.save(); g.translate(W2 * u, H2 / 2); g.rotate(-Math.PI / 2); g.globalAlpha = 0.9; tline(g, PNAME.toUpperCase(), 0, 0, H2 * 0.84, W2 * 0.035, FB, '700', 0.04); g.restore(); }
    tbars(g, W2 * 0.025, H2 * 0.62, W2 * 0.07, H2 * 0.2); tlines(g, W2 * 0.9, H2 * 0.18, W2 * 0.08, 8, H2 * 0.07, P.ink, 0.3); },
  mugPrint(g, W2, H2, P) { g.save(); rr(g, 2, 2, W2 - 4, H2 - 4, H2 * 0.06); g.clip(); cover(g, FRESAS, 2, 2, W2 - 4, H2 - 4);
    g.fillStyle = 'rgba(255,255,255,.88)'; rr(g, W2 * 0.3, H2 * 0.74, W2 * 0.4, H2 * 0.17, H2 * 0.04); g.fill(); g.fillStyle = P.a2; tline(g, BRAND, W2 / 2, H2 * 0.83, W2 * 0.36, H2 * 0.12, FD); g.restore(); },
};
function paintTex(w, h, fn, kind) { const T = canvasTex(w, h, (g, W2, H2) => PAINT[fn](g, W2, H2, pal(kind))); return T; }

// ---------------------------------------------------------------- las presentaciones (geometría como en la web, en sus unidades; la escala PS va en el soporte)
const V2 = pts => pts.map(([x, y]) => new THREE.Vector2(x, y));
const latheG = (pts, n = 96) => new THREE.LatheGeometry(V2(pts), n);
function roundBox(W2, H2, D, r, n = 20) {      // caja con cantos redondeados (los vértices de una caja con muchos segmentos se empujan a una caja interior + radio)
  const geo = new THREE.BoxGeometry(W2, H2, D, n, Math.max(2, Math.round(n * H2 / W2)), Math.max(2, Math.round(n * D / W2)));
  const p = geo.attributes.position, nr = geo.attributes.normal, v = new THREE.Vector3(), c = new THREE.Vector3(), hx = W2 / 2 - r, hy = H2 / 2 - r, hz = D / 2 - r;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz)); v.sub(c).normalize(); nr.setXYZ(i, v.x, v.y, v.z); p.setXYZ(i, c.x + v.x * r, c.y + v.y * r, c.z + v.z * r); }
  return geo;
}
function buildKind(k) {
  const g = new THREE.Group(), P = pal(k), DS = THREE.DoubleSide, add = (geo, m) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  let h = 1;
  if (k === 'caja') {
    const W2 = 0.92, H2 = 1.22, D = 0.4, m = t => new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3 });
    const ms = m(paintTex(448, 1358, 'boxSide', k)), mt = m(paintTex(1024, 446, 'boxTop', k));
    add(roundBox(W2, H2, D, 0.016, 24), [ms, ms, mt, mt, m(paintTex(1024, 1358, 'boxFront', k)), m(paintTex(1024, 1358, 'boxBack', k))]).position.y = H2 / 2; h = H2;
  } else if (k === 'bolsa') {
    const W2 = 0.98, H2 = 1.0, D = 0.38, m = t => new THREE.MeshStandardMaterial({ map: t, roughness: 0.82 }), ms = m(paintTex(400, 1045, 'bagSide', k));
    add(new THREE.BoxGeometry(W2, H2, D), [ms, ms, new THREE.MeshBasicMaterial({ visible: false }), m(paintTex(256, 128, 'plain', k)), m(paintTex(1024, 1045, 'bagFront', k)), m(paintTex(1024, 1045, 'bagBack', k))]).position.y = H2 / 2;
    const inM = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.BackSide, color: new THREE.Color(P.base).multiplyScalar(0.5) });
    add(new THREE.BoxGeometry(W2 - 0.008, H2 - 0.004, D - 0.008), inM).position.y = H2 / 2 + 0.002;
    const rope = new THREE.MeshStandardMaterial({ roughness: 0.75, color: P.rope });
    for (const z of [D / 2 - 0.035, -(D / 2 - 0.035)]) add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.2, H2 - 0.07], [-0.19, H2 + 0.15], [0, H2 + 0.27], [0.19, H2 + 0.15], [0.2, H2 - 0.07]].map(([x, y]) => v3(x, y, z))), 48, 0.013, 10), rope);
    h = H2 + 0.27;
  } else if (k === 'tarro') {
    const r = 0.42, Rl = r - 0.06 + 0.03;
    const glass = add(latheG([[0.001, 0], [r - 0.05, 0], [r - 0.012, 0.012], [r, 0.05], [r, 0.68], [r - 0.014, 0.73], [r - 0.05, 0.765], [r - 0.06, 0.78], [r - 0.06, 0.84]]),
      new THREE.MeshPhysicalMaterial({ color: 0xeef5ff, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.2, specularIntensity: 0.3, side: DS, depthWrite: false, envMapIntensity: 0.7 }));
    glass.castShadow = false; glass.renderOrder = 2;
    add(latheG([[0.001, 0.02], [r - 0.045, 0.02], [r - 0.022, 0.045], [r - 0.022, 0.71], [r - 0.06, 0.725], [0.001, 0.73]]), new THREE.MeshPhysicalMaterial({ color: P.fill, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.2, specularIntensity: 0.5, side: DS }));
    add(latheG([[Rl - 0.012, 0.79], [Rl, 0.8], [Rl, 0.935], [Rl - 0.004, 0.95], [Rl - 0.03, 0.955], [0.001, 0.955]]), new THREE.MeshStandardMaterial({ color: P.lid, metalness: 0.85, roughness: 0.32, side: DS }));
    add(new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.5, 96, 1, true, -0.85, 1.7), new THREE.MeshStandardMaterial({ map: paintTex(1024, 712, 'jarLabel', k), roughness: 0.62, alphaTest: 0.5, side: DS })).position.y = 0.37;
    h = 0.96;
  } else if (k === 'botella') {
    const glass = new THREE.MeshPhysicalMaterial({ color: P.glass, roughness: 0.07, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, side: DS });
    add(latheG([[0.001, 0], [0.22, 0], [0.262, 0.016], [0.27, 0.06], [0.27, 0.78], [0.262, 0.84], [0.236, 0.92], [0.185, 0.995], [0.125, 1.065], [0.097, 1.12], [0.089, 1.18], [0.089, 1.36], [0.099, 1.372], [0.099, 1.398], [0.085, 1.41], [0.001, 1.41]]), glass);
    add(latheG([[0.093, 1.2], [0.096, 1.212], [0.096, 1.404], [0.09, 1.418], [0.001, 1.42]]), new THREE.MeshStandardMaterial({ color: P.cap, metalness: 0.55, roughness: 0.38, side: DS }));
    add(new THREE.CylinderGeometry(0.273, 0.273, 0.44, 96, 1, true, -1.25, 2.5), new THREE.MeshStandardMaterial({ map: paintTex(1024, 660, 'bottleLabel', k), roughness: 0.66, alphaTest: 0.5, side: DS })).position.y = 0.42;
    h = 1.42;
  } else if (k === 'lata') {
    const met = new THREE.MeshStandardMaterial({ color: 0xd4d8df, metalness: 1, roughness: 0.26, side: DS });
    add(latheG([[0.001, 0.035], [0.19, 0.016], [0.232, 0.0], [0.262, 0.004], [0.288, 0.04], [0.3, 0.075], [0.3, 0.905], [0.287, 0.95], [0.266, 0.982], [0.27, 0.99], [0.266, 1.0], [0.254, 0.995], [0.249, 0.978], [0.001, 0.975]]), met);
    add(new THREE.CylinderGeometry(0.3015, 0.3015, 0.83, 128, 1, true, Math.PI, Math.PI * 2), new THREE.MeshPhysicalMaterial({ map: paintTex(2048, 898, 'canPrint', k), metalness: 0.35, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.15 })).position.y = 0.49;
    add(roundBox(0.1, 0.008, 0.17, 0.0035, 8), met).position.set(0, 0.982, 0.05);
    h = 1.0;
  } else if (k === 'taza') {
    const cer = new THREE.MeshPhysicalMaterial({ color: 0xf4f2ee, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.08, side: DS });
    add(latheG([[0.001, 0], [0.37, 0], [0.392, 0.012], [0.4, 0.045], [0.4, 0.84], [0.396, 0.856], [0.386, 0.862]]), cer);
    add(latheG([[0.386, 0.862], [0.374, 0.856], [0.366, 0.836], [0.366, 0.1], [0.35, 0.075], [0.001, 0.07]]), new THREE.MeshPhysicalMaterial({ color: P.inner, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.08, side: DS }));
    const hd = add(new THREE.TorusGeometry(0.19, 0.042, 20, 48, Math.PI), cer); hd.rotation.z = -Math.PI / 2; hd.position.set(0.385, 0.45, 0);
    add(new THREE.CylinderGeometry(0.4025, 0.4025, 0.56, 96, 1, true, -1.02, 2.04), new THREE.MeshPhysicalMaterial({ map: paintTex(1024, 697, 'mugPrint', k), roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.08, alphaTest: 0.5, side: DS })).position.y = 0.45;
    h = 0.86;
  } else if (k === 'q') {      // «¿el tuyo?»
    const q = qmark(paint(0xf2f3f5, 0.2, 1)); q.scale.setScalar(1.75); q.position.y = 0.26 * 1.75 + 0.06; g.add(q); h = 1.05;
  }
  g.userData = { h }; return g;
}

// ---------------------------------------------------------------- la peana del visor (gira con el producto): aro con el degradado de la marca, ondas, sombra y halo
function buildPed() {
  const g = new THREE.Group(), turn = new THREE.Group(); g.add(turn);
  const T = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#171c29'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 1.5; for (let r = 30; r < 256; r += 13) { circ(c, 256, 256, r); c.stroke(); } });
  const side = new THREE.MeshStandardMaterial({ color: 0x121622, roughness: 0.35, metalness: 0.45 }), top = new THREE.MeshStandardMaterial({ map: T, roughness: 0.42, metalness: 0.3 });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(PED_R, PED_R * 1.046, PED_H, 120), [side, top, side]); ped.position.y = PED_H / 2; ped.castShadow = true; ped.receiveShadow = true; turn.add(ped);
  const GT = canvasTex(512, 2, (c, w) => { const lg = c.createLinearGradient(0, 0, w, 0); [['#ff4d61', 0], ['#b45cff', 0.25], ['#4f7dff', 0.5], ['#b45cff', 0.75], ['#ff4d61', 1]].forEach(([col, o]) => lg.addColorStop(o, col)); c.fillStyle = lg; c.fillRect(0, 0, w, 2); });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(PED_R * 1.001, 0.0085 * PS * 1.4, 8, 180), new THREE.MeshBasicMaterial({ map: GT, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) })); ring.rotation.x = Math.PI / 2; ring.position.y = PED_H; turn.add(ring);
  const radial = (a0, col) => canvasTex(256, 256, (c) => { const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, `rgba(${col},${a0})`); gr.addColorStop(0.55, `rgba(${col},${a0 * 0.45})`); gr.addColorStop(1, `rgba(${col},0)`); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(PED_R * 1.25, PED_R * 1.25), new THREE.MeshBasicMaterial({ map: radial(0.7, '0,0,0'), transparent: true, depthWrite: false, toneMapped: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = PED_H + 0.001; turn.add(sh);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.9 * PS, 3.9 * PS), new THREE.MeshBasicMaterial({ map: radial(0.5, '180,92,255'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); halo.rotation.x = -Math.PI / 2; halo.position.y = 0.004; g.add(halo);
  const ripG = new THREE.RingGeometry(0.962 * PED_R, PED_R, 128);
  const rips = [0, 1, 2].map(i => { const m = new THREE.Mesh(ripG, new THREE.MeshBasicMaterial({ color: i === 1 ? 0xffa31f : 0xff4d61, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = PED_H + 0.002 + i * 0.0005; turn.add(m); return { m, ph: i / 3 }; });
  scene.add(g); S.ped = { g, turn, ring, halo, rips, sh };
}

// ---------------------------------------------------------------- la polaroid en su soporte (la imagen: fondo de estudio, revelado de las fresas)
function drawFondo(g, w, h) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f4dcd2'); gr.addColorStop(0.58, '#ecc6b8'); gr.addColorStop(1, '#d9a596'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = g.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.55, w * 0.8); r.addColorStop(0, 'rgba(255,255,255,.4)'); r.addColorStop(1, 'rgba(110,60,45,.22)'); g.fillStyle = r; g.fillRect(0, 0, w, h);
}
let FOTO_STATE = -1;
function drawFoto(k) {      // k: 0 = fondo vacío; 0..1 = se revela la foto de las fresas; 1 = foto
  const q = Math.round(k * 40) / 40; if (q === FOTO_STATE) return; FOTO_STATE = q;
  const T = S.fotoT, g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height; g.setTransform(1, 0, 0, 1, 0, 0); g.filter = 'none';
  drawFondo(g, w, h);
  if (q > 0) { g.save(); g.globalAlpha = clamp(q * 1.6); g.filter = `saturate(${(0.15 + 0.85 * q).toFixed(2)}) contrast(${(0.55 + 0.45 * q).toFixed(2)}) brightness(${(1.35 - 0.35 * q).toFixed(2)})`; cover(g, FRESAS, 0, 0, w, h); g.restore(); g.filter = 'none';
    if (q < 1) { g.fillStyle = `rgba(60,80,70,${(0.25 * (1 - q) * clamp(q * 4)).toFixed(3)})`; g.fillRect(0, 0, w, h); } }
  T.needsUpdate = true;
}
function buildFoto() {
  const root = new THREE.Group(), tilt = new THREE.Group(); root.add(tilt); tilt.position.y = FOTO.base; tilt.rotation.x = FOTO.tilt;
  const card = rbox(FOTO.w, FOTO.h, FOTO.d, new THREE.MeshPhysicalMaterial({ color: 0xf3f0e9, roughness: 0.55, clearcoat: 0.25 }), 0.01); card.position.y = FOTO.h / 2; tilt.add(card);
  S.fotoT = canvasTex(768, 768);
  const img = new THREE.Mesh(new THREE.PlaneGeometry(FOTO.iw, FOTO.iw), new THREE.MeshPhysicalMaterial({ map: S.fotoT, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.08 }));
  img.position.set(0, FOTO_IMG_Y, FOTO.d / 2 + 0.0008); img.receiveShadow = true; tilt.add(img);
  const shT = canvasTex(256, 64, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(70,30,25,.55)'); gr.addColorStop(1, 'rgba(70,30,25,0)'); c.save(); c.scale(1, h / w); c.fillStyle = gr; c.fillRect(0, 0, w, w); c.restore(); });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.14), new THREE.MeshBasicMaterial({ map: shT, transparent: true, depthWrite: false, toneMapped: false })); sh.position.set(0, FOTO_FLOOR + 0.004, FOTO.d / 2 + 0.0016); sh.renderOrder = 1; tilt.add(sh);
  const stand = rbox(0.58, 0.07, 0.16, plastic(0x14161b, 0.3), 0.025); stand.position.set(0, 0.035, 0); root.add(stand);
  root.traverse(o => { if (o.isMesh && o !== sh) o.castShadow = true; });
  scene.add(root); S.foto = { root, tilt, img, sh, stand };
  drawFoto(0);
}

// ---------------------------------------------------------------- el móvil
function buildPhone() {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshPhysicalMaterial({ color: 0x0b0c10, roughness: 0.28, metalness: 0.65, clearcoat: 1, clearcoatRoughness: 0.05 });
  g.add(rbox(PHN.w, PHN.h, PHN.d, bodyM, 0.13));
  const rimM = metal(0x9aa0aa, 0.22);
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(PHN.w + 0.006, PHN.h + 0.006, 0.12), { depth: 0.03, bevelEnabled: false, curveSegments: 12 }), rimM); rim.geometry.translate(0, 0, -0.015); g.add(rim);
  for (const [y, h] of [[0.42, 0.16], [0.18, 0.09], [0.06, 0.09]]) { const b = rbox(0.012, h, 0.022, rimM, 0.005); b.position.set(y > 0.3 ? PHN.w / 2 + 0.006 : -PHN.w / 2 - 0.006, y, 0); g.add(b); }
  const T = canvasTex(SCR.w, SCR.h); T.anisotropy = 8;
  const scr = new THREE.Mesh(rplane(PHN.sw, PHN.sh, 0.1), new THREE.MeshBasicMaterial({ map: T, toneMapped: false, color: new THREE.Color(1.12, 1.12, 1.12) })); scr.position.z = PHN.d / 2 + 0.0012; g.add(scr);
  const glass = new THREE.Mesh(rplane(PHN.sw + 0.02, PHN.sh + 0.02, 0.11), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.16, depthWrite: false }));
  glass.position.z = PHN.d / 2 + 0.0035; g.add(glass);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.position.set(0, -2, -0.06); scene.add(g); S.phone = g; S.scrT = T; S.scr = scr;
}

// ---------------------------------------------------------------- el calendario «DOMINGO», el bocadillo «KIRIA» y el avión de papel
function buildCal() {
  const g = new THREE.Group(); g.add(rbox(0.5, 0.37, 0.05, plastic(0x17191e, 0.3), 0.03));
  const f = textPlane(0.48, 0.35, (c, w, h) => { c.fillStyle = '#ff4d61'; rr(c, 0, 0, w, h * 0.3, 18); c.fill(); c.fillRect(0, h * 0.15, w, h * 0.15);
    c.fillStyle = '#f2f4f8'; for (const x of [0.28, 0.72]) { c.beginPath(); c.arc(w * x, h * 0.11, h * 0.045, 0, 7); c.fill(); }
    c.fillStyle = '#ffffff'; c.font = `900 ${h * 0.21}px Inter`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '4px'; c.fillText('DOMINGO', w / 2, h * 0.64); }, 512);
  f.position.z = 0.0262; g.add(f);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g); S.cal = g;
}
function buildCTA() {
  const bw = 0.62, bh = 0.27, r = 0.09, s = new THREE.Shape(), x0 = -bw / 2, y0 = -bh / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x0 + 0.16, y0); s.lineTo(x0 + 0.05, y0 - 0.1); s.lineTo(x0 + 0.26, y0); s.lineTo(x0 + bw - r, y0); s.quadraticCurveTo(x0 + bw, y0, x0 + bw, y0 + r);
  s.lineTo(x0 + bw, y0 + bh - r); s.quadraticCurveTo(x0 + bw, y0 + bh, x0 + bw - r, y0 + bh); s.lineTo(x0 + r, y0 + bh); s.quadraticCurveTo(x0, y0 + bh, x0, y0 + bh - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const bg = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.016, bevelSegments: 4, curveSegments: 14 }); bg.translate(0, 0, -0.025);
  const bub = new THREE.Group(); const bm = new THREE.Mesh(bg, paint(0xf6f6f7, 0.25, 1)); bm.castShadow = true; bub.add(bm);
  const lm = paint(0x111317, 0.25, 1);
  S.letters = 'KIRIA'.split('').map(c => text3(c, 0.13, 0.03, lm, { bevel: 0.005 }));
  let lw = 0; S.letters.forEach((o, i) => { lw += o.userData.w + (i ? 0.022 : 0); });
  let lx = -lw / 2; S.letters.forEach((o, i) => { if (i) lx += 0.022; o.position.set(lx + o.userData.w / 2, 0.004, 0.06); lx += o.userData.w; bub.add(o); });
  scene.add(bub); S.bubble = bub;
  const pl = new THREE.Group(), pm = new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.45, side: THREE.DoubleSide });
  const tri = (a, b, c) => { const g = new THREE.BufferGeometry().setFromPoints([a, b, c]); g.computeVertexNormals(); const m = new THREE.Mesh(g, pm); m.castShadow = true; return m; };
  pl.add(tri(v3(0, 0, 0.3), v3(-0.17, 0.02, -0.12), v3(0, -0.02, -0.1)), tri(v3(0, 0, 0.3), v3(0.17, 0.02, -0.12), v3(0, -0.02, -0.1)), tri(v3(0, 0, 0.3), v3(0, -0.02, -0.1), v3(0, -0.09, -0.11)));
  scene.add(pl); S.plane = pl;
}

// ---------------------------------------------------------------- todo junto: el producto va en un soporte (pose de la foto ↔ pose de la peana) y gira dentro
const KINDS = ['caja', 'bolsa', 'tarro', 'botella', 'lata', 'taza', 'q'];
function buildL2() {
  FRESAS = drawFresas();
  buildFoto(); buildPed(); buildPhone(); buildCal(); buildCTA();
  const carrier = new THREE.Group(), spin = new THREE.Group(); carrier.add(spin); scene.add(carrier);
  S.kinds = {}; for (const k of KINDS) { const o = buildKind(k); o.visible = false; spin.add(o); S.kinds[k] = o; }
  S.carrier = carrier; S.spin = spin;
}
// ---------------------------------------------------------------- «¿Qué hace que alguien se pare?» (anuncio de kiriaai.com): un móvil gigante tumbado es el escenario.
// Por su pantalla corren publicaciones y los productos que van encima caen al vacío por el borde (la gente pasa de largo); la cinta se para;
// cae una foto, se sube, de ella sale el producto en 3D a una peana con focos; los vídeos del canal, la cámara que no existe, el contador,
// la barra del vídeo con el primer segundo, el rebobinado hasta el primer fotograma y kiriaai.com.
const BIG = { w: 1.5, l: 3.15, t: 0.075, sw: 1.42, sl: 3.07, r: 0.2 };   // móvil tumbado: ancho (x), largo (z), grosor; pantalla
const BSCR = { w: 600, h: Math.round(600 * BIG.sl / BIG.sw) };            // lienzo de la pantalla (arriba = −z, el borde de la cámara del móvil)
const TOPY = BIG.t + 0.0016;                                              // superficie de la pantalla
const FEED = { postH: 560, img0: 96, imgH: 400, top: 120 };              // publicaciones: alto, imagen (desde el borde de arriba de la publicación)
const PSF = 0.34;                                                          // escala de los productos que van en la cinta (unidades de la web → m)
const PEDP = v3(0, TOPY, 0.62);                                            // la peana del estudio (sobre la pantalla)
const FKINDS = ['caja', 'botella', 'lata', 'bolsa', 'taza'];
const POSTN = ['@tumarca', '@la_tienda', '@tu_negocio', '@mi_producto', '@tu_marca_es', '@nuevo_local'];
const POSTC = [[352, 0.7], [205, 0.55], [32, 0.75], [150, 0.45], [265, 0.5], [12, 0.6]];   // tono y saturación del fondo de cada publicación
const scrX = cx => (cx / BSCR.w - 0.5) * BIG.sw, scrZ = cy => (cy / BSCR.h - 0.5) * BIG.sl;    // lienzo → mundo (sobre la pantalla)
let THUMBS = [], PRIMER = null;

function buildBig() {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshPhysicalMaterial({ color: 0x0b0c10, roughness: 0.3, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.06 });
  const body = rbox(BIG.w, BIG.l, BIG.t, bodyM, BIG.r); body.rotation.x = -Math.PI / 2; body.position.y = BIG.t / 2; g.add(body);
  const rimM = metal(0xa3a9b3, 0.22);
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(BIG.w + 0.012, BIG.l + 0.012, BIG.r), { depth: BIG.t * 0.45, bevelEnabled: false, curveSegments: 16 }), rimM);
  rim.rotation.x = -Math.PI / 2; rim.position.y = BIG.t * 0.28; rim.castShadow = true; g.add(rim);
  for (const [z, l] of [[-0.62, 0.34], [-0.2, 0.18], [0.02, 0.18]]) { const b = rbox(0.02, l, 0.03, rimM, 0.008); b.rotation.x = -Math.PI / 2; b.position.set(z < -0.5 ? BIG.w / 2 + 0.01 : -BIG.w / 2 - 0.01, BIG.t / 2, z); g.add(b); }
  const T = canvasTex(BSCR.w, BSCR.h); T.anisotropy = 16;
  const scr = new THREE.Mesh(rplane(BIG.sw, BIG.sl, BIG.r - 0.03), new THREE.MeshBasicMaterial({ map: T, toneMapped: false, color: new THREE.Color(1.05, 1.05, 1.05) }));
  scr.rotation.x = -Math.PI / 2; scr.position.y = TOPY; scr.receiveShadow = true; g.add(scr);
  // cristal: un poco de reflejo de los focos
  const glass = new THREE.Mesh(rplane(BIG.sw + 0.02, BIG.sl + 0.02, BIG.r - 0.02), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.12, depthWrite: false }));
  glass.rotation.x = -Math.PI / 2; glass.position.y = TOPY + 0.0012; g.add(glass);
  // sombra suave de lo que hay encima (no se ve en el negro, pero sí sobre la pantalla): plano que solo recibe sombras
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(BIG.sw, BIG.sl), new THREE.ShadowMaterial({ opacity: 0.45 }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = TOPY + 0.0018; shadowCatcher.receiveShadow = true; g.add(shadowCatcher);
  g.traverse(o => { if (o.isMesh && o !== shadowCatcher && o !== scr) o.castShadow = true; });
  scene.add(g); S.big = g; S.bscrT = T;
}

// ---------------------------------------------------------------- la cinta de publicaciones: productos (copias que comparten geometría y materiales)
function buildFeedProducts() {
  S.fp = {};
  for (const k of ['tarro', ...FKINDS]) {
    const base = buildKind(k), arr = [base];
    for (let i = 0; i < 2; i++) arr.push(base.clone());
    for (const o of arr) { o.visible = false; scene.add(o); }
    S.fp[k] = arr;
  }
}

// ---------------------------------------------------------------- focos de estudio (caja de luz en un pie), la peana y la foto del estudio
function softbox() {
  const g = new THREE.Group(), dk = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.6, metalness: 0.4 });
  const leg = (a) => { const l = bar(v3(0, 0.02, 0), v3(Math.cos(a) * 0.16, 0.0, Math.sin(a) * 0.16), 0.008, dk); return l; };
  for (let i = 0; i < 3; i++) g.add(leg(i * 2.094 + 0.4));
  const pole = cyl(0.011, 0.011, 0.72, dk, 12); pole.position.y = 0.36; g.add(pole);
  const head = new THREE.Group(); head.position.y = 0.74; g.add(head);
  const box = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.07, 0.2, 4, 1, true), dk); box.rotation.set(Math.PI / 2, Math.PI / 4, 0); box.position.z = 0.1; head.add(box);
  const panelM = new THREE.MeshStandardMaterial({ color: 0x222428, emissive: 0xfff4e6, emissiveIntensity: 0, roughness: 0.9 });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), panelM); panel.position.z = 0.2; head.add(panel);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { head, panelM }; return g;
}
function buildStudio() {
  buildPed(); S.ped.g.visible = false;
  S.lights = [-1, 1, 0].map((sd, i) => { const L = softbox(); scene.add(L); L.visible = false; L.userData.sd = sd; L.userData.i = i; return L; });
  // el tarro del estudio (el que sale de la foto)
  S.jar = buildKind('tarro'); S.jarC = new THREE.Group(); S.jarC.add(S.jar); scene.add(S.jarC); S.jarC.visible = false;
  buildFoto(); S.foto.root.visible = false;
  // la cámara de cine que no existe (cuerpo, dos bobinas, objetivo y trípode)
  const c = new THREE.Group(), cm = new THREE.MeshPhysicalMaterial({ color: 0x1b1d22, roughness: 0.35, metalness: 0.6, clearcoat: 0.6 }), mt = metal(0x9aa0a8, 0.25);
  const bd = rbox(0.34, 0.2, 0.14, cm, 0.02); bd.position.y = 0.66; c.add(bd);
  for (const x of [-0.08, 0.1]) { const r = cyl(0.085, 0.085, 0.05, cm, 32); r.rotation.z = Math.PI / 2; r.rotation.y = Math.PI / 2; r.position.set(x, 0.85, 0); c.add(r);
    const hub = cyl(0.025, 0.025, 0.055, mt, 16); hub.rotation.x = Math.PI / 2; hub.position.set(x, 0.85, 0); c.add(hub); }
  const lens = cyl(0.05, 0.06, 0.12, cm, 32); lens.rotation.x = Math.PI / 2; lens.position.set(0.05, 0.66, 0.13); c.add(lens);
  const ring = cyl(0.062, 0.062, 0.02, mt, 32); ring.rotation.x = Math.PI / 2; ring.position.set(0.05, 0.66, 0.19); c.add(ring);
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; c.add(bar(v3(0, 0.56, 0), v3(Math.cos(a) * 0.22, 0.0, Math.sin(a) * 0.22), 0.01, mt)); }
  const cms = []; c.traverse(o => { if (o.isMesh) cms.push(o); }); for (const o of cms) { o.castShadow = true; edges(o, 0xeef2f6, 1.6, 30, 0.85); }
  scene.add(c); c.visible = false; S.filmCam = c;
  S.camSparks = sparks(scene, 140, 0xdfe8ff, 0.03);
  // «3,2 M» en 3D que sale de la pantalla
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xffc24a, metalness: 0.9, roughness: 0.22, clearcoat: 1, emissive: 0x3a2400, emissiveIntensity: 0.4 });
  S.big3 = text3('3,2 M', 0.36, 0.08, gold, { bevel: 0.01 }); S.big3.rotation.x = -Math.PI / 2; scene.add(S.big3); S.big3.visible = false;
}
// ---------------------------------------------------------------- tiempos y animación (todo es función del instante: se puede dibujar en cualquier orden)
// Hay dos relojes: t (el del vídeo: voz, subtítulos, rótulos) y st (el de la escena 3D). Son el mismo salvo en el rebobinado
// («Como el de este»: la escena vuelve hacia atrás hasta el primer fotograma y lo vuelve a reproducir), en el cierre y en el bucle final.
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const easeIn = x => x * x * x;
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const ZS0 = 0.15;
let TT = {};
const T1 = -0.3;                       // instante de la escena al que llega el rebobinado: justo antes del primer fotograma (el tarro aún en el borde)
function buildTimes() {
  TT = {
    stop: K.pare2 + 0.04, dec0: K.pare2 - 0.8,                                        // la cinta frena y se para en seco en «pare»
    foto0: K.mandanos3 - 0.1, fotoLand: K.foto3 + 0.12, up1: K.producto3 + 0.2,      // cae la foto y se sube
    stand0: K.convertimos4 - 0.05, stand1: K.convertimos4 + 0.4,                       // la foto se pone de pie
    pedUp: K.en4 - 0.05, inflate1: K.d3_4 + 0.12, detach: K.d3_4 + 0.2, land: K.con4 + 0.02,   // el tarro sale de la foto («3D») y salta a la peana
    fotoOut: K.con4 + 0.1, luz: K.luz4 - 0.03, mov: K.movimiento4 - 0.02, voz: K.voz4 - 0.03,
    sink0: K.asi5 - 0.1, sink1: K.asi5 + 0.42,                                         // el estudio se recoge en la pantalla: los vídeos del canal
    cam0: K.sin5 - 0.08, camGone: K.camara5 + 0.02,
    cnt0: K.dias6 - 0.25, cntA: K.sumado6, cntB: K.millones6 + 0.05, big3: K.n32_6 - 0.03,
    scrub0: K.secreto7 - 0.15, first: K.primer7 - 0.02, unexp: K.inesperado7 - 0.03,
    rw0: K.como8 - 0.03, rw1: K.este8 + 0.08,
    cta0: K.quieres9 - 0.05, web: K.entra9 - 0.12, bio: K.bio9 - 0.25,
    loop0: END - 1.45,
  };
  TT.swap = (TT.web + TT.bio) / 2;         // con la web tapando la pantalla, el reloj de la escena salta al bucle (no se ve)
  feedSetup();
}
// reloj de la escena
function sceneT(t) {
  if (t < TT.rw0) return t;
  if (t < TT.rw1) { const u = (t - TT.rw0) / (TT.rw1 - TT.rw0); return lerp(TT.rw0, T1, 1 - Math.pow(1 - u, 1.6)); }
  if (t < TT.swap) return T1 + (t - TT.rw1);
  return t - END;
}

// ---------------------------------------------------------------- la cinta de publicaciones: desplazamiento (px) con «tirones» del dedo, frenada y parada
const FV = { V0: 1000, P: 0.66, a: 0.55, b: 1.05, tau: 0.17 };
const FV_I = FV.a * FV.P + FV.b * FV.tau * (1 - Math.exp(-FV.P / FV.tau));
function offBase(t) { const n = Math.floor(t / FV.P), ph = t - n * FV.P; return FV.V0 * (n * FV_I + FV.a * ph + FV.b * FV.tau * (1 - Math.exp(-ph / FV.tau))); }
function velBase(t) { const ph = t - Math.floor(t / FV.P) * FV.P; return FV.V0 * (FV.a + FV.b * Math.exp(-ph / FV.tau)); }
let OFF_SHIFT = 0, JAR_I = 0, JAR0_I = 0;
const FCY = FEED.top + FEED.img0 + FEED.imgH / 2;        // centro de la imagen de la publicación 0 cuando el desplazamiento es 0
function feedOff(st) {
  if (st <= TT.dec0) return offBase(st) + OFF_SHIFT;
  const d = TT.stop - TT.dec0, v0 = velBase(TT.dec0), u = clamp((st - TT.dec0) / d);
  return offBase(TT.dec0) + v0 * d * (1 - (1 - u) * (1 - u)) / 2 + OFF_SHIFT;
}
const postCy = (i, st) => FCY + i * FEED.postH - feedOff(st);      // centro (y del lienzo) de la imagen de la publicación i
function feedSetup() {
  // que una publicación (con el tarro) se pare justo en el borde: centro de su imagen a 15 px del canto de arriba
  OFF_SHIFT = 0; const o = feedOff(TT.stop), i = Math.ceil((o - FCY + 15) / FEED.postH);
  OFF_SHIFT = FCY + i * FEED.postH - 15 - o; JAR_I = i;
  // y que en el primer fotograma otro tarro esté cayendo: el que cruzó el borde entre 0,45 y 0,1 s antes
  JAR0_I = null; for (let k = -6; k < 6; k++) { const te = crossT(k); if (te > -0.5 && te < -0.08) { JAR0_I = k; break; } }
}
function crossT(i) {      // cuándo cruza el borde de arriba el centro de la publicación i (bisección: el desplazamiento siempre crece)
  const target = FCY + i * FEED.postH; if (feedOff(TT.stop) < target) return 1e9;
  let a = -30, b = TT.stop; for (let k = 0; k < 50; k++) { const m = (a + b) / 2; if (feedOff(m) < target) a = m; else b = m; } return (a + b) / 2;
}
function kindOf(i) { if (i === JAR_I || i === JAR0_I) return 'tarro'; return FKINDS[((i % FKINDS.length) + FKINDS.length) % FKINDS.length]; }
// pose de un producto de la cinta (o null si no se ve)
function feedPose(i, st) {
  const cy = postCy(i, st), H2 = BSCR.h;
  if (cy > H2 + 40) return null;
  const grow = eo(clamp((H2 + 40 - cy) / 170));
  const z = scrZ(cy), x = 0;
  if (cy >= 0) {
    // inercia: cuando la cinta da un tirón, el producto se inclina un poco hacia atrás
    const acc = (velAt(st + 0.02) - velAt(st - 0.02)) / 0.04, tilt = clamp(acc * 2.2e-5, -0.06, 0.12);
    let rx = tilt, y = TOPY;
    if (i === JAR_I && st > TT.stop - 0.25) {         // se queda en el borde, tambaleándose
      const u = st - TT.stop + 0.25; rx = -0.22 * Math.sin(u * 9) * Math.exp(-u * 1.6) - 0.03; y = TOPY;
    }
    const gone = eio(clamp((st - TT.foto0 + 0.25) / 0.4));          // al caer la foto, los que quedan se meten en la pantalla
    return { p: v3(x, y - 0.1 * gone, z), rx, s: grow * (1 - gone), rot: 0.35 * Math.sin(i * 1.7) };
  }
  const te = crossT(i), dt = st - te; if (dt > 1.6) return null;
  const vz = -0.45 * velAt(te) / H2 * BIG.sl;         // al salir por el borde sigue un poco hacia delante y cae
  return { p: v3(x, TOPY - 4.9 * dt * dt, -BIG.sl / 2 + vz * dt), rx: -(2.6 * dt + 3.2 * dt * dt), s: 1, rot: 0.35 * Math.sin(i * 1.7) + 0.6 * dt * Math.sin(i * 3.1) };
}
function velAt(st) { return (feedOff(st + 0.004) - feedOff(st - 0.004)) / 0.008; }
function feedProducts(st, vis) {
  for (const k in S.fp) for (const o of S.fp[k]) o.visible = false;
  if (!vis) return;
  const used = {}, o0 = feedOff(st), i0 = Math.floor((o0 - FCY - 900) / FEED.postH), i1 = Math.ceil((o0 - FCY + BSCR.h + 200) / FEED.postH);
  for (let i = i0; i <= i1; i++) {
    const P = feedPose(i, st); if (!P || P.s <= 0.002) continue;
    const k = kindOf(i), n = used[k] || 0; used[k] = n + 1; const o = S.fp[k][n]; if (!o) continue;
    o.visible = true; o.position.copy(P.p); o.rotation.set(P.rx, P.rot + Math.PI, 0);      // de frente hacia el borde (la cámara del gancho)
    o.scale.setScalar(Math.max(0.001, P.s * (1 - S.ctaHide)) * PSF);
  }
}

// ---------------------------------------------------------------- la pantalla del móvil gigante (lienzo 2D)
function bStatus(g, light = false) {
  g.fillStyle = light ? '#111' : '#ffffff'; g.font = '700 30px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('9:41', 46, 46);
  g.lineWidth = 3; g.strokeStyle = g.fillStyle; rr(g, BSCR.w - 98, 32, 54, 27, 7); g.stroke(); g.fillRect(BSCR.w - 94, 36, 40, 19);
  g.fillStyle = '#000000'; rr(g, BSCR.w / 2 - 76, 18, 152, 46, 23); g.fill();
}
function postImg(g, i, x, y, w, h) {       // la «foto» de cada publicación: fondo de estudio del color de la marca
  const [hh, ss] = POSTC[((i % POSTC.length) + POSTC.length) % POSTC.length];
  const gr = g.createRadialGradient(x + w / 2, y + h * 0.35, 10, x + w / 2, y + h * 0.55, w * 0.85);
  gr.addColorStop(0, hsl(hh, ss * 0.6, 0.86)); gr.addColorStop(0.55, hsl(hh, ss * 0.7, 0.62)); gr.addColorStop(1, hsl(hh, ss, 0.3)); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x + w / 2, y + h * 0.8, w * 0.22, h * 0.05, 0, 0, 7); g.fill();
}
function drawPost(g, i, top) {
  const n = ((i % POSTN.length) + POSTN.length) % POSTN.length;
  g.fillStyle = '#3a3f49'; g.beginPath(); g.arc(46, top + 46, 26, 0, 7); g.fill();
  g.fillStyle = hsl(POSTC[n][0], 0.6, 0.6); g.beginPath(); g.arc(46, top + 46, 20, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.font = '800 26px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(POSTN[n], 86, top + 46);
  g.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(BSCR.w - 70 + k * 14, top + 46, 3.5, 0, 7); g.fill(); }
  postImg(g, i, 0, top + FEED.img0, BSCR.w, FEED.imgH);
  const iy = top + FEED.img0 + FEED.imgH + 34; g.strokeStyle = '#ffffff'; g.lineWidth = 4.5; g.lineJoin = 'round';
  let x = 42; g.beginPath(); g.moveTo(x, iy + 12); g.bezierCurveTo(x - 24, iy - 4, x - 15, iy - 24, x, iy - 11); g.bezierCurveTo(x + 15, iy - 24, x + 24, iy - 4, x, iy + 12); g.stroke();
  x = 100; g.beginPath(); g.arc(x, iy - 2, 15, 0.4, Math.PI * 2 - 0.1); g.lineTo(x + 18, iy + 16); g.closePath(); g.stroke();
  x = 152; g.beginPath(); g.moveTo(x - 16, iy - 4); g.lineTo(x + 16, iy - 15); g.lineTo(x + 5, iy + 16); g.lineTo(x - 1, iy + 1); g.closePath(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.3)'; rr(g, 30, iy + 34, 300, 14, 7); g.fill();
}
function drawFeed(g, st, dim = 0) {
  g.fillStyle = '#0c0e14'; g.fillRect(0, 0, BSCR.w, BSCR.h);
  const o = feedOff(st), i0 = Math.floor((o - FEED.top) / FEED.postH) - 1;
  for (let i = i0; i < i0 + 5; i++) drawPost(g, i, FEED.top + i * FEED.postH - o);
  g.fillStyle = '#0c0e14'; g.fillRect(0, 0, BSCR.w, 92); bStatus(g);
  if (dim > 0) { g.fillStyle = `rgba(6,7,10,${0.82 * dim})`; g.fillRect(0, 0, BSCR.w, BSCR.h); }
}
// subir la foto: recuadro discontinuo, la foto dentro y el progreso
const UPB = { x: 300, y: 0, w: 430, h: 520 };
function drawUpload(g, st, k) {
  const fz = S.fotoFlatZ, cy = (fz / BIG.sl + 0.5) * BSCR.h; UPB.y = cy;
  g.save(); g.globalAlpha = k;
  const p = clamp((st - TT.fotoLand) / (TT.up1 - TT.fotoLand)), done = p >= 1;
  g.strokeStyle = done ? '#7cf0a9' : 'rgba(255,255,255,.75)'; g.lineWidth = 4; g.setLineDash(done ? [] : [18, 12]); rr(g, UPB.x - UPB.w / 2, cy - UPB.h / 2, UPB.w, UPB.h, 30); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#ffffff'; g.font = '800 30px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(done ? '✓  Foto subida' : st < TT.fotoLand ? 'Suelta aquí tu foto' : 'Subiendo…', UPB.x, cy + UPB.h / 2 + 52);
  if (st > TT.fotoLand - 0.05) { const bw = UPB.w - 40, by = cy + UPB.h / 2 + 100; g.fillStyle = 'rgba(255,255,255,.15)'; rr(g, UPB.x - bw / 2, by, bw, 14, 7); g.fill(); g.fillStyle = done ? '#7cf0a9' : '#ffffff'; rr(g, UPB.x - bw / 2, by, Math.max(14, bw * eio(p)), 14, 7); g.fill(); }
  g.restore();
}
function drawStudioBg(g, k) {        // como el visor de la web: degradado azul noche con el halo violeta
  g.save(); g.globalAlpha = k;
  let gr = g.createRadialGradient(BSCR.w / 2, BSCR.h * 0.3, 0, BSCR.w / 2, BSCR.h * 0.3, BSCR.h * 0.9); gr.addColorStop(0, '#1b2133'); gr.addColorStop(1, '#090b11'); g.fillStyle = gr; g.fillRect(0, 0, BSCR.w, BSCR.h);
  const pz = (PEDP.z / BIG.sl + 0.5) * BSCR.h; gr = g.createRadialGradient(BSCR.w / 2, pz, 0, BSCR.w / 2, pz, BSCR.w * 0.75); gr.addColorStop(0, 'rgba(180,92,255,0.3)'); gr.addColorStop(1, 'rgba(180,92,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, BSCR.w, BSCR.h);
  g.restore();
}
function drawGrid(g, st, k) {        // el perfil del canal: nuestros vídeos (portadas reales)
  g.save(); g.globalAlpha = k; g.fillStyle = '#0c0e14'; g.fillRect(0, 0, BSCR.w, BSCR.h); bStatus(g);
  g.fillStyle = '#ffffff'; g.font = '900 34px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('kiria.ai', BSCR.w / 2, 128);
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '700 21px SpaceMono'; g.letterSpacing = '3px'; g.fillText('VÍDEOS HECHOS CON IA', BSCR.w / 2, 170); g.letterSpacing = '0px';
  const cw = 196, ch = Math.round(cw * 16 / 9), gap = 6, x0 = (BSCR.w - 3 * cw - 2 * gap) / 2, y0 = 210 - 60 * clamp((st - TT.sink1) / 3);
  THUMBS.forEach((im, i) => { const c = i % 3, r = Math.floor(i / 3), x = x0 + c * (cw + gap), y = y0 + r * (ch + gap);
    const a = clamp((st - TT.sink0 - 0.06 * i) / 0.25); if (a <= 0) return; g.save(); g.globalAlpha = k * a; g.drawImage(im, x, y + 20 * (1 - a), cw, ch); g.restore(); });
  g.restore();
}
function drawCounter(g, st, k) {
  g.save(); g.globalAlpha = k; g.fillStyle = '#090b10'; g.fillRect(0, 0, BSCR.w, BSCR.h); bStatus(g);
  const u = eio(clamp((st - TT.cntA) / (TT.cntB - TT.cntA))), n = Math.round(3200000 * u);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffffff'; g.font = '900 88px Inter'; g.fillText(n.toLocaleString('es-ES'), BSCR.w / 2, 600);
  g.fillStyle = '#ffc24a'; g.font = '800 36px Inter'; g.fillText('visualizaciones', BSCR.w / 2, 676);
  g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '700 24px SpaceMono'; g.letterSpacing = '4px'; g.fillText('EN 7 DÍAS', BSCR.w / 2, 736); g.letterSpacing = '0px';
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; rr(g, BSCR.w / 2 - 110, 800, 220, 64, 32); g.stroke();
  g.fillStyle = '#ffffff'; g.font = '800 30px Inter'; g.fillText('0 cámaras', BSCR.w / 2, 833);
  g.restore();
}
// la barra del vídeo: el primer segundo se enciende
const SCRUB = { x0: 50, x1: 550, y: 1145 };
function drawScrub(g, st, k, t) {
  g.save(); g.globalAlpha = k; g.fillStyle = '#05060a'; g.fillRect(0, 0, BSCR.w, BSCR.h);
  if (PRIMER) { const iw = 540, ih = iw * 16 / 9, x = (BSCR.w - iw) / 2, y = 100; g.save(); g.globalAlpha = k * (0.6 + 0.4 * win(st, TT.unexp, 0.3)); rr(g, x, y, iw, ih, 18); g.clip(); g.drawImage(PRIMER, x, y, iw, ih); g.restore();
    const f = win(st, TT.unexp, 0.25) * (1 - win(st, TT.unexp + 0.9, 0.4)); if (f > 0) { g.save(); g.globalAlpha = k * f; g.strokeStyle = '#ffc24a'; g.lineWidth = 6; g.shadowColor = '#ffc24a'; g.shadowBlur = 24; rr(g, x, y, iw, ih, 18); g.stroke(); g.restore(); } }
  const gr = g.createLinearGradient(0, BSCR.h * 0.7, 0, BSCR.h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.85)'); g.fillStyle = gr; g.fillRect(0, 0, BSCR.w, BSCR.h);
  const L = SCRUB.x1 - SCRUB.x0, one = L / END, f = win(st, TT.first, 0.25), ph = lerp(0.62, 1 / END, eio(clamp((st - TT.first) / 0.5)));
  g.fillStyle = 'rgba(255,255,255,.28)'; rr(g, SCRUB.x0, SCRUB.y - 6, L, 12, 6); g.fill();
  g.fillStyle = '#ffffff'; rr(g, SCRUB.x0, SCRUB.y - 6, L * ph, 12, 6); g.fill();
  if (f > 0) { g.save(); g.shadowColor = '#ffc24a'; g.shadowBlur = 26 * f; g.fillStyle = '#ffc24a'; rr(g, SCRUB.x0 - 4, SCRUB.y - 11, one + 8, 22, 9); g.fill(); g.restore(); }
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(SCRUB.x0 + L * ph, SCRUB.y, 15, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '700 24px SpaceMono'; g.textAlign = 'left'; g.textBaseline = 'middle';
  const s = Math.round(ph * END); g.fillText(`0:${String(s).padStart(2, '0')}`, SCRUB.x0, SCRUB.y + 46); g.textAlign = 'right'; g.fillText(`0:${String(Math.round(END)).padStart(2, '0')}`, SCRUB.x1, SCRUB.y + 46);
  g.restore();
}
// la web (kiriaai.com: «Vídeos que paran el scroll.») y el perfil con el enlace en la bio
function drawWeb(g, t, k) {
  g.save(); g.globalAlpha = k; g.fillStyle = '#0a0b10'; g.fillRect(0, 0, BSCR.w, BSCR.h); bStatus(g);
  g.fillStyle = '#1a1f2c'; rr(g, 20, 88, BSCR.w - 40, 64, 32); g.fill();
  g.strokeStyle = '#8f98ab'; g.lineWidth = 3; g.beginPath(); g.arc(58, 116, 7, Math.PI, 0); g.stroke(); g.fillStyle = '#8f98ab'; rr(g, 48, 116, 20, 15, 3); g.fill();
  g.fillStyle = '#e6eaf2'; g.font = '700 27px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('kiriaai.com', 84, 121);
  g.fillStyle = '#ff6b7d'; g.font = '700 21px SpaceMono'; g.letterSpacing = '4px'; g.fillText('KIRIA.AI ESTUDIO', 44, 250); g.letterSpacing = '0px';
  g.fillStyle = '#ffffff'; g.font = '900 64px Inter';
  g.fillText('Vídeos que', 42, 330);
  const gr = g.createLinearGradient(42, 0, 260, 0); gr.addColorStop(0, '#ff4d61'); gr.addColorStop(1, '#4f7dff'); g.fillStyle = gr; g.fillText('paran', 42, 404);
  g.fillStyle = '#ffffff'; g.fillText(' el scroll.', 42 + g.measureText('paran').width, 404);
  g.fillStyle = 'rgba(255,255,255,.22)'; rr(g, 44, 460, 470, 16, 8); g.fill(); rr(g, 44, 492, 380, 16, 8); g.fill();
  // tres trabajos (portadas reales)
  const cw = 160, ch = Math.round(cw * 16 / 9);
  [1, 6, 0].forEach((j, i) => { const im = THUMBS[j]; if (!im) return; const x = 44 + i * (cw + 16), y = 560; g.save(); rr(g, x, y, cw, ch, 16); g.clip(); g.drawImage(im, x, y, cw, ch); g.restore(); });
  const by = 960, pr = t > TT.web + 0.6 && t < TT.web + 0.75 ? 0.96 : 1;
  g.save(); g.translate(BSCR.w / 2, by); g.scale(pr, pr); g.fillStyle = '#ffffff'; rr(g, -(BSCR.w - 88) / 2, -44, BSCR.w - 88, 88, 44); g.fill();
  g.fillStyle = '#0c0e14'; g.font = '800 31px Inter'; g.textAlign = 'center'; g.fillText('Pedir propuesta', 0, 2); g.restore();
  g.restore();
}
function drawBio(g, t, k) {
  g.save(); g.globalAlpha = k; g.fillStyle = '#0c0e14'; g.fillRect(0, 0, BSCR.w, BSCR.h); bStatus(g);
  g.fillStyle = '#ffffff'; g.font = '800 30px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('kiria.ai', BSCR.w / 2, 126);
  const ax = 110, ay = 260; const ag = g.createLinearGradient(ax - 70, ay - 70, ax + 70, ay + 70); ag.addColorStop(0, '#ff4d61'); ag.addColorStop(1, '#4f7dff');
  g.strokeStyle = ag; g.lineWidth = 6; g.beginPath(); g.arc(ax, ay, 72, 0, 7); g.stroke(); g.fillStyle = '#16181d'; g.beginPath(); g.arc(ax, ay, 64, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.font = '900 40px Inter'; g.fillText('k', ax, ay + 2);
  g.textAlign = 'left'; g.font = '900 30px Inter'; g.fillText('kiria.ai', 220, 236); g.fillStyle = 'rgba(255,255,255,.65)'; g.font = '600 24px Inter'; g.fillText('Vídeos hechos con IA', 220, 276);
  g.fillStyle = 'rgba(255,255,255,.22)'; rr(g, 44, 380, 420, 16, 8); g.fill(); rr(g, 44, 410, 330, 16, 8); g.fill();
  const lk = 0.5 + 0.5 * Math.sin((t - TT.bio) * 8), on = t > TT.bio;
  g.save(); if (on) { g.shadowColor = '#7cc4ff'; g.shadowBlur = 18 + 14 * lk; }
  g.fillStyle = on ? '#9fd0ff' : '#7aa7d6'; g.strokeStyle = g.fillStyle; g.lineWidth = 5; g.lineCap = 'round';
  g.save(); g.translate(62, 476); g.rotate(-0.78); rr(g, -20, -9, 22, 18, 9); g.stroke(); rr(g, -2, -9, 22, 18, 9); g.stroke(); g.restore();   // eslabones
  g.font = '800 34px Inter'; g.fillText('kiriaai.com', 96, 476); g.restore();
  if (on) { g.strokeStyle = `rgba(159,208,255,${0.5 + 0.4 * lk})`; g.lineWidth = 3; rr(g, 30, 444, 320, 64, 16); g.stroke(); }
  const cw = 176, ch = Math.round(cw * 16 / 9);
  THUMBS.slice(0, 3).forEach((im, i) => { const x = 18 + (i % 3) * (cw + 6), y = 560; g.drawImage(im, x, y, cw, ch); });
  g.restore();
}
function drawBigScreen(t, st) {
  const g = S.bscrT.userData.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  if (t >= TT.cta0 && t < TT.loop0 + 0.45) {      // cierre: la cinta (que sigue) → la web → el perfil con el enlace → la cinta otra vez (bucle)
    drawFeed(g, st);
    const kw = win(t, TT.web - 0.1, 0.35) * (1 - win(t, TT.loop0 + 0.05, 0.35));
    if (kw > 0) { if (t < TT.bio) drawWeb(g, t, kw); else { drawWeb(g, t, kw * (1 - win(t, TT.bio, 0.3))); drawBio(g, t, kw * win(t, TT.bio, 0.3)); } }
  } else if (st < TT.foto0 - 0.4 || t >= TT.loop0 + 0.45) drawFeed(g, st);
  else if (st < TT.stand1) { drawFeed(g, st, win(st, TT.foto0 - 0.4, 0.35)); drawUpload(g, st, win(st, TT.foto0 - 0.3, 0.3) * (1 - win(st, TT.stand0, 0.4))); if (st > TT.stand0) drawStudioBg(g, win(st, TT.stand0, 0.4)); }
  else if (st < TT.sink0) drawStudioBg(g, 1);
  else if (st < TT.cnt0) { drawStudioBg(g, 1); drawGrid(g, st, win(st, TT.sink0, 0.35)); }
  else if (st < TT.scrub0) { drawGrid(g, st, 1); drawCounter(g, st, win(st, TT.cnt0, 0.35)); }
  else { drawCounter(g, st, 1); drawScrub(g, st, win(st, TT.scrub0, 0.35), t); }
  g.restore(); S.bscrT.needsUpdate = true;
}

// ---------------------------------------------------------------- el estudio: foto, peana, tarro, focos, cámara de cine y «3,2 M»
const _qa = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _pa = new THREE.Vector3(), _pb = new THREE.Vector3();
function bez(p0, p1, p2, p3, u, out) { const v = 1 - u; return out.set(0, 0, 0).addScaledVector(p0, v * v * v).addScaledVector(p1, 3 * v * v * u).addScaledVector(p2, 3 * v * u * u).addScaledVector(p3, u * u * u); }
function photoPose(zs, outP, outQ) { S.foto.tilt.updateWorldMatrix(true, false); outP.set(0, FOTO_FLOOR, FOTO.d / 2 + 0.0015 + JAR_R * zs).applyMatrix4(S.foto.tilt.matrixWorld); S.foto.tilt.getWorldQuaternion(outQ); }
const studioK = st => 1 - eio(clamp((st - TT.sink0) / (TT.sink1 - TT.sink0)));        // el estudio se recoge
function spinAt(st) { return 0.5 * Math.max(0, st - TT.land) + 2 * Math.PI * eio(clamp((st - TT.mov) / 0.8)); }
function stageStudio(st) {
  const sk = studioK(st), on = st > TT.foto0 && st < TT.sink1 + 0.05;
  // la foto: cae plana sobre la pantalla, se sube, se pone de pie; cuando sale el tarro se esconde en la pantalla
  { const R = S.foto.root, vis = on && st < TT.fotoOut + 0.4; R.visible = vis;
    if (vis) { const fz = S.fotoFlatZ0;
      if (st < TT.fotoLand) { const u = clamp((st - TT.foto0) / (TT.fotoLand - TT.foto0)); R.position.set(0.1 * (1 - u), lerp(1.1, TOPY + 0.004, u * u), fz); R.rotation.set(-Math.PI / 2 + 0.5 * (1 - u), 0.6 * (1 - u), 0); }
      else if (st < TT.stand0) { const b = st - TT.fotoLand; R.position.set(0, TOPY + 0.004 + 0.03 * Math.abs(Math.sin(b * 14)) * Math.exp(-b * 9), fz); R.rotation.set(-Math.PI / 2, 0, 0); }
      else { const u = eio(clamp((st - TT.stand0) / (TT.stand1 - TT.stand0))); R.position.set(0, TOPY + 0.004, fz); R.rotation.set(-Math.PI / 2 * (1 - u), 0, 0); }
      const out = clamp((st - TT.fotoOut) / 0.4); R.scale.setScalar(Math.max(0.001, 1 - easeIn(out))); R.position.y -= 0.3 * out;
      S.foto.stand.visible = st > TT.stand1 - 0.1; S.foto.tilt.rotation.x = FOTO.tilt * eio(clamp((st - TT.stand0) / (TT.stand1 - TT.stand0)));   // plana del todo sobre la pantalla
      drawFoto(st < TT.fotoLand ? 1 : 1); }
  }
  // la peana sube de la pantalla en «en (3D)»
  { const P = S.ped, vis = on && st > TT.pedUp; P.g.visible = vis && sk > 0.002;
    if (P.g.visible) { const u = backOut((st - TT.pedUp) / 0.4); P.g.position.set(PEDP.x, PEDP.y - (1 - clamp(u)) * 0.12, PEDP.z); P.g.scale.setScalar(Math.max(0.001, clamp(u, 0, 1.2) * sk) * 0.86); P.turn.rotation.y = spinAt(st);
      const fl = Math.exp(-Math.max(0, st - TT.land) / 0.25) * (st > TT.land ? 1 : 0) + Math.exp(-Math.max(0, st - TT.luz) / 0.3) * (st > TT.luz ? 1 : 0);
      P.halo.material.opacity = 0.85 + fl * 0.4; P.ring.material.color.setScalar(1.5 + fl * 1.2);
      P.rips.forEach(r => { const q = (st * 0.3 + r.ph) % 1; r.m.scale.setScalar(0.36 + 0.71 * q); r.m.material.opacity = (0.42 + fl * 0.6) * Math.pow(1 - q, 1.6) * Math.min(1, q / 0.08); }); } }
  // el tarro: dentro de la foto (relieve), se hincha («3D»), salta a la peana y gira
  { const C = S.jarC, vis = on && st > TT.stand0 + 0.05 && sk > 0.002; C.visible = vis;
    if (vis) { const top = v3(PEDP.x, PEDP.y + PED_H * 0.86, PEDP.z), ps = 0.5 * 0.86 * sk;
      if (st < TT.detach) { const zs = lerp(ZS0, 1, eio(clamp((st - K.en4 + 0.05) / (TT.inflate1 - K.en4 + 0.05)))); photoPose(zs, C.position, C.quaternion); C.scale.set(0.5, 0.5, 0.5 * zs); }
      else if (st < TT.land) { const e = eio((st - TT.detach) / (TT.land - TT.detach)); photoPose(1, _pa, _qa); bez(_pa, _pa.clone().add(v3(0, 0.3, 0.25)), top.clone().add(v3(0, 0.45, 0)), top, e, C.position); C.quaternion.copy(_qa).slerp(_qi, e); C.scale.setScalar(lerp(0.5, ps, e)); }
      else { C.position.copy(top); C.quaternion.identity(); C.scale.setScalar(ps); const b = st - TT.land; if (b < 0.42) { const sq = 0.12 * Math.sin(b / 0.42 * Math.PI) * (1 - b / 0.42); C.scale.set(ps * (1 + sq * 0.5), ps * (1 - sq), ps * (1 + sq * 0.5)); }
        C.position.y -= 0.12 * (1 - sk); }
      S.jar.rotation.y = st > TT.land ? spinAt(st) - 0.35 : 0; } }
  // los focos: salen en «luz» y se encienden
  S.lights.forEach((L, i) => { const t0 = TT.luz - 0.12 + i * 0.05, k = on ? pop(st, t0, 0.35) * sk : 0; L.visible = k > 0.002;
    if (!L.visible) return; const [lx, lz] = [[-0.62, 0.5], [0.62, 0.5], [0.0, -0.18]][i];
    L.position.set(PEDP.x + lx, TOPY, lz); L.scale.setScalar(Math.max(0.001, k));
    L.userData.head.lookAt(v3(PEDP.x, PEDP.y + 0.3, PEDP.z)); const lit = win(st, TT.luz + i * 0.06, 0.08); L.userData.panelM.emissiveIntensity = 2.6 * lit; });
  // la cámara de cine: aparece en «sin» y se deshace en «cámara»
  { const Cm = S.filmCam, k = pop(st, TT.cam0, 0.35), gone = clamp((st - TT.camGone) / 0.32), vis = st > TT.cam0 && gone < 1 && st < TT.cnt0; Cm.visible = vis;
    if (vis) { Cm.position.set(-0.3, TOPY, 0.1); Cm.rotation.set(0, 0.6 + 0.2 * Math.sin(st), 0); Cm.scale.setScalar(Math.max(0.001, k * (1 - easeIn(gone))) * 1.45); setOp(Cm, 1 - gone); }
    const sp = S.camSparks, sv = st > TT.camGone && st < TT.camGone + 0.9; sp.visible = sv; if (sv) { burst(sp, v3(-0.3, TOPY + 0.55, 0.1), st, TT.camGone, 0.55, 0.9, false, 0.4); sp.material.opacity = 1 - clamp((st - TT.camGone - 0.4) / 0.5); } }
  // «3,2 M» en 3D: sale de la pantalla
  { const B = S.big3, k = pop(st, TT.big3, 0.45), out = clamp((st - TT.scrub0) / 0.3), vis = st > TT.big3 && out < 1; B.visible = vis;
    if (vis) { B.position.set(0, TOPY + 0.05 + 0.02 * Math.sin(st * 2), -0.62); B.scale.setScalar(Math.max(0.001, k * (1 - easeIn(out))) * 0.8); } }
}
function stageAt2(t, st) {
  S.ctaHide = t >= TT.cta0 && t < TT.loop0 + 0.3 ? eio(clamp((t - TT.web + 0.5) / 0.35)) : 0;     // en el cierre, los productos se van antes de que salga la web
  feedProducts(st, (st < TT.foto0 + 0.6 || st < 0) && !(t >= TT.cta0 && t < TT.loop0 + 0.3 && t >= TT.web + 0.2));
  stageStudio(st);
  drawBigScreen(t, st);
}
// ---------------------------------------------------------------- cámara: un solo plano (sin cortes). En el rebobinado vuelve por su camino al primer fotograma;
// en el cierre sube a ver la pantalla desde arriba y al final baja otra vez al primer fotograma (bucle)
let CKS = [], A0 = null;
function buildCam() {
  A0 = [[0.62, 0.36, -2.95], [0.0, -0.02, -1.25], 40];                       // desde más allá del borde: los productos vienen hacia ti y caen al vacío
  const TOP = [[0.0, 4.65, 0.98], [0.0, 0.0, -0.02], 40];                      // la pantalla entera, desde arriba
  CKS = [
    [-3, ...A0],
    [0, ...A0],
    [K.producto1, [0.5, 0.42, -3.1], [0.0, -0.02, -1.2], 40],
    [K.gente1, [0.36, 0.4, -3.05], [0.0, 0.0, -1.3], 40],
    [TT.stop, [0.3, 0.42, -2.6], [0.0, 0.12, -1.45], 40],                      // «se pare»: el tarro, en el borde
    [K.final2, [0.22, 0.4, -2.45], [0.0, 0.12, -1.47], 40],
    [K.mandanos3 - 0.25, [0.35, 1.45, -2.75], [0.0, 0.0, -1.1], 40],          // sube por encima del borde antes de ir a la foto
    [K.mandanos3 + 0.1, [0.45, 2.7, -1.25], [0.0, 0.0, -0.45], 40],           // 3: cae la foto y se sube
    [K.foto3 + 0.15, [0.8, 3.05, 1.0], [0.0, 0.0, -0.42], 40],
    [K.producto3, [0.75, 2.9, 1.25], [0.0, 0.0, -0.4], 40],
    [K.convertimos4 + 0.25, [0.5, 1.25, 3.3], [0.0, 0.32, 0.2], 40],          // 4: la foto, de pie; sale el tarro
    [K.d3_4 + 0.2, [-0.35, 1.05, 3.25], [0.0, 0.3, 0.45], 40],
    [K.luz4, [-0.85, 1.2, 3.2], [0.0, 0.34, 0.5], 40],
    [K.movimiento4 + 0.3, [0.55, 1.0, 3.25], [0.0, 0.34, 0.55], 40],
    [K.voz4, [0.8, 1.05, 3.05], [0.0, 0.32, 0.6], 40],
    [K.asi5 + 0.5, ...TOP],                                                     // 5: los vídeos del canal
    [K.sin5, [0.0, 4.45, 0.92], [0.0, 0.0, -0.02], 40],
    [K.camara5 + 0.25, [-0.15, 3.3, 1.45], [-0.2, 0.0, 0.0], 40],              // la cámara que se deshace
    [K.dias6, [0.0, 4.4, 0.85], [0.0, 0.0, -0.1], 40],                        // 6: el contador
    [K.visualizaciones6, [0.0, 3.9, 0.55], [0.0, 0.0, -0.32], 40],
    [K.secreto7, [0.0, 4.4, 0.95], [0.0, 0.0, 0.05], 40],                      // 7: la barra del vídeo y el primer segundo
    [K.primer7 + 0.2, [0.0, 3.5, 1.75], [0.0, 0.0, 0.42], 40],
    [K.inesperado7, [0.0, 3.85, 1.35], [0.0, 0.0, 0.05], 40],
    [TT.rw0, [0.0, 4.0, 1.2], [0.0, 0.0, -0.05], 40],
  ];
  CKS.TOP = TOP;
}
const camPath = st => camKeys(st, CKS);
function camAt(t) {
  if (t < TT.cta0) return camPath(sceneT(t));
  const c0 = camPath(sceneT(TT.cta0)), arr = v => [v.x, v.y, v.z];
  return camKeys(t, [[TT.cta0, arr(c0.p), arr(c0.l), c0.f], [TT.cta0 + 0.55, [0.35, 2.3, -2.55], [0.0, 0.0, -0.9], 40], [TT.web + 0.25, ...CKS.TOP], [TT.loop0, [0.0, 4.3, 0.92], [0.0, 0.0, -0.06], 40],
    [END - 0.75, [0.45, 1.9, -2.75], [0.0, 0.0, -1.05], 40], [END - 0.12, ...A0], [END, ...A0]]);
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.stop, 0.03], [TT.land, 0.035], [TT.luz, 0.05], [TT.camGone, 0.04], [TT.rw1, 0.07]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function lightsOn(st) { return win(st, TT.luz, 0.12) * studioK(st); }
function stageAt(t, st0) {
  const st = sceneT(t); NOW = t;
  const c = st0.l, d = st0.p.distanceTo(c), yaw = Math.atan2(st0.p.x - c.x, st0.p.z - c.z), k = clamp(d / 5, 0.4, 1.2);
  rigAt(c, yaw, k, 0.95 + 0.5 * lightsOn(st), 0.62);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.14;
  scene.fog.density = 0.05;
  stageAt2(t, st);
  post.uniforms.fade.value = 0;
}
// ---------------------------------------------------------------- HUD: cabecera, la pregunta pendiente, rótulos con línea guía, la onda de la voz, el rebobinado y el cierre
function buildHudPlan() {}
const HG = '#FFC24A';
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function lab(P, txt, sub, k, opt) { if (k <= 0.01 || !P) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
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
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('VÍDEOS CON IA', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText('PARA TU NEGOCIO · SIN CÁMARAS', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('ESTUDIO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('KIRIAAI.COM', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('ENLACE EN LA BIO', 1024, 178);
  hg.restore();
  bracketMsg(t, '¿QUÉ LO PARA?', HC.amber, win(t, K.pare2 + 0.15, 0.3) * (1 - win(t, TT.first, 0.2)), true);
  bracketMsg(t, 'EL PRIMER SEGUNDO', HG, win(t, TT.first + 0.1, 0.3) * (1 - win(t, END - 1.3, 0.3)), false);
}
const wpt = (x, y, z) => v3(x, y, z);
const scrPt = (cx, cy) => v3(scrX(cx), TOPY, scrZ(cy));
// el rebobinado: «◀◀» y rayas de cinta de vídeo
function rewindFx(t) {
  const k = cwin(t, TT.rw0 - 0.02, TT.rw1, 0.08, 0.12); if (k <= 0.01) return;
  hg.save(); hg.globalAlpha = k;
  for (let i = 0; i < 9; i++) { const y = ((hash(i * 7.7 + Math.floor(t * 30) * 0.37) * H) | 0), h = 4 + hash(i * 3.1 + t) * 22;
    hg.fillStyle = `rgba(230,240,255,${0.05 + 0.12 * hash(i * 5.3 + t * 2)})`; hg.fillRect(0, y, W, h); }
  hg.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < H; y += 6) hg.fillRect(0, y, W, 2);
  hfont(130); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '0px'; hg.fillStyle = HC.white; hg.shadowColor = 'rgba(0,0,0,.8)'; hg.shadowBlur = 20;
  hg.fillText('◀◀', W / 2, 1180); hfont(26); hg.letterSpacing = '6px'; hg.fillText('REBOBINANDO', W / 2, 1290);
  hg.restore();
}
function hudAt(t) {
  hudBegin(); hdr(t);
  const st = sceneT(t);
  // 1: los productos pasan de largo y caen por el borde
  lab(wpt(0, TOPY, -1.56), 'PASAN DE LARGO', null, cw(t, K.y1 - 0.05, K.que2 + 0.1), { dx: -150, dy: -150, color: HC.red });
  // 2: el tarro se queda en el borde
  if (t < TT.rw0) lab(wpt(0, TOPY + 0.32, -1.5), 'SE PARA', null, cw(t, TT.stop + 0.08, K.mandanos3 - 0.05), { dx: 140, dy: -160, color: HG });
  // 3: la foto
  lab(wpt(0, TOPY, S.fotoFlatZ), 'TU FOTO', null, cw(t, TT.fotoLand + 0.05, K.convertimos4 - 0.05), { dx: 160, dy: -150, color: HC.white });
  // 4: 3D, luz, movimiento y voz
  if (S.jarC.visible && t < TT.rw0) {
    const jp = wpt(PEDP.x, PEDP.y + 0.48, PEDP.z);
    lab(S.jarC.position.clone().add(v3(0, 0.44, 0)), '3D', null, cw(t, K.d3_4 + 0.05, K.luz4 - 0.05), { dx: 140, dy: -170, color: HG });
    const L0 = S.lights[0]; if (L0.visible) lab(L0.userData.head.getWorldPosition(new THREE.Vector3()), 'LUZ', null, cw(t, K.luz4, K.movimiento4 - 0.05), { dx: 130, dy: -120, side: 1, color: HC.white });
    lab(jp, 'MOVIMIENTO', null, cw(t, K.movimiento4, K.voz4 - 0.05), { dx: 140, dy: -190, color: HC.white });
    const vk = cw(t, K.voz4 - 0.05, K.asi5 + 0.05);
    if (vk > 0.01) { const A = proj(wpt(PEDP.x - 0.5, PEDP.y + 0.05, PEDP.z + 0.42)), B = proj(wpt(PEDP.x + 0.5, PEDP.y + 0.05, PEDP.z + 0.42));
      waveform(A, B, 26 + 70 * voice(t), t, vk, HC.teal); lab(proj(wpt(PEDP.x + 0.5, PEDP.y + 0.05, PEDP.z + 0.42)), 'VOZ', null, vk, { dx: 60, dy: -140, color: HC.teal }); }
  }
  // 5: todos nuestros vídeos · la cámara que no existe
  if (t < TT.rw0) {
    { const k = cw(t, K.todos5 - 0.05, K.sin5 - 0.1); if (k > 0.01) { const a = proj(scrPt(10, 200)), b = proj(scrPt(BSCR.w - 10, 1300)); brackets({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, Math.abs(b.x - a.x), Math.abs(b.y - a.y), k, HG, 3);
      bigText('NUESTROS VÍDEOS', W / 2, 1600, 40, HG, k, { dark: 20, ls: 6 }); } }
    if (S.filmCam.visible) lab(S.filmCam.position.clone().add(v3(0.05, 0.7, 0)), 'CÁMARA', null, cw(t, TT.cam0 + 0.1, TT.camGone), { dx: 150, dy: -120, color: HC.white });
    { const k = cwin(t, TT.camGone + 0.05, K.y6 - 0.05, 0.15, 0.25); if (k > 0.01) stamp('0 CÁMARAS', W / 2, 1560, k, HC.red, 70); }
    // 6: el dato
    // 7: el primer segundo de la barra
    { const k = cw(t, TT.first + 0.05, TT.rw0); if (k > 0.01) { const one = (SCRUB.x1 - SCRUB.x0) / END; lab(scrPt(SCRUB.x0 + one / 2, SCRUB.y), '1.ER SEGUNDO', null, k, { dx: 120, dy: -230, color: HG }); } }
  }
  // 8: el rebobinado y «este»: el primer fotograma otra vez
  rewindFx(t);
  { const k = cw(t, TT.rw1 + 0.02, TT.cta0 + 0.3); if (k > 0.01) { brackets({ x: W / 2, y: 1060 }, 940, 1380, k, HG, 4);       // visor: este es el primer segundo
      hg.save(); hg.globalAlpha = clamp(k) * (Math.sin(t * 10) > -0.2 ? 1 : 0.35); hg.fillStyle = HC.red; hg.beginPath(); hg.arc(110, 425, 11, 0, 7); hg.fill(); hg.restore();
      bigText('0:00', 136, 427, 30, HC.white, k, { align: 'left', type: false, dark: 14, ls: 4 }); } }
  // 9: el cierre
  { const k = cw(t, K.kiriaaicom9 - 0.02, END - 0.6); if (k > 0.01) bigText('KIRIAAI.COM', W / 2, 1585, 74, HC.white, k, { glow: 14, type: false, dark: 26 }); }
  { const k = cw(t, K.enlace9 - 0.05, END - 0.6); if (k > 0.01) bigText('ENLACE EN LA BIO', W / 2, 1672, 32, HG, k, { dark: 18, ls: 6 }); }
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
  FONT3 = new FontLoader().parse(await new TTFLoader().loadAsync(F + 'Inter-Black.otf'));
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  const img = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  THUMBS = (await Promise.all(['cripto', 'quimica', 'medicina', 'cerradura', 'robo_banco', 'economia', 'gafas', 'magisterio', 'lanzamiento'].map(n => img(`../assets/thumbs/${n}.jpg`)))).filter(Boolean);
  PRIMER = await img('../assets/primer.jpg');
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = Math.ceil(lines[lines.length - 1].end + 2.6);
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  // frases: 1 gancho · 2 pregunta · 3 la foto · 4 3D, luz, movimiento y voz · 5 los vídeos del canal, sin cámara · 6 3,2 millones · 7 el primer segundo · 8 «como el de este» · 9 kiriaai.com
  K = {
    tienes1: atL(1, 'tienes'), producto1: atL(1, 'producto'), y1: atL(1, '=y'), sabes1: atL(1, 'sabes'), gente1: atL(1, 'gente'),
    que2: atL(2, '=que'), alguien2: atL(2, 'alguien'), pare2: atL(2, '=pare'), mirarlo2: atL(2, 'mirarlo'), digo2: atL(2, 'digo'), final2: atL(2, 'final'),
    mandanos3: atL(3, 'mandanos'), foto3: atL(3, 'foto'), producto3: atL(3, 'producto'),
    convertimos4: atL(4, 'convertimos'), en4: atL(4, '=en'), d3_4: atL(4, '3d'), con4: atL(4, '=con'), luz4: atL(4, 'luz'), movimiento4: atL(4, 'movimiento'), voz4: atL(4, 'voz'),
    asi5: atL(5, 'asi'), todos5: atL(5, 'todos'), videos5: atL(5, 'videos'), canal5: atL(5, 'canal'), sin5: atL(5, '=sin'), sola5: atL(5, 'sola'), camara5: atL(5, 'camara'),
    y6: atL(6, '=y'), n7_6: atL(6, '=7'), dias6: atL(6, 'dias'), han6: atL(6, '=han'), sumado6: atL(6, 'sumado'), n32_6: atL(6, '32'), millones6: atL(6, 'millones'), visualizaciones6: atL(6, 'visualizaciones'),
    el7: atL(7, '=el'), secreto7: atL(7, 'secreto'), paren7: atL(7, 'paren'), primer7: atL(7, 'primer'), segundo7: atL(7, 'segundo'), inesperado7: atL(7, 'inesperado'), video7: atL(7, 'video'),
    como8: atL(8, 'como'), este8: atL(8, 'este'),
    quieres9: atL(9, 'quieres'), negocio9: atL(9, 'negocio'), entra9: atL(9, 'entra'), kiriaaicom9: atL(9, 'kiriaai'), enlace9: atL(9, 'enlace'), bio9: atL(9, 'bio'),
  };
  mats(); buildMats(); buildRig();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; }
  scene.fog = new THREE.FogExp2(0x000000, 0.05);
  buildFlow();
  FRESAS = drawFresas();
  buildBig(); buildFeedProducts(); buildStudio();
  S.fotoFlatZ0 = 0.05; S.fotoFlatZ = S.fotoFlatZ0 - (FOTO.base + FOTO_IMG_Y);
  buildTimes();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.TT = TT; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
