// «GTA 6 ocupa 212 gigas» (voz de Javi): ver 12_city.js.
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
  // polvo fino en suspensión: alrededor del edificio y de la plaza (cálido cerca, frío lejos)
  S.flow = [
    flowCloud(9000, i => [gauss(i) * 1.3, 0.02 + Math.pow(hash(i * 5.7), 1.3) * 1.6, 0.4 + gauss(i + 2e4) * 1.1], { size: 1.3, bright: 0.5, seed: 1, nearF: 0.06, farF: 0.06, col: 0xfff0d8 }),
    flowCloud(6000, i => { const r = 2.2 + Math.sqrt(hash(i * 3.1)) * 7, a = hash(i * 8.3) * 6.2832; return [r * Math.sin(a), 0.03 + Math.pow(hash(i * 5.7), 1.4) * 3.2, r * Math.cos(a)]; }, { size: 1.5, bright: 0.55, farF: 0.03, seed: 2, col: 0xd8e6ff }),
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
// ---------------------------------------------------------------- «ADE no tiene salidas»: materiales y piezas (papel, libros, figuritas y haces de luz de «Derecho»)
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
function studentGeo(lo = false) {
  const body = new THREE.CylinderGeometry(lo ? 0.009 : 0.0095, lo ? 0.014 : 0.0145, 0.034, lo ? 6 : 14); body.translate(0, 0.017, 0);
  const sh = new THREE.SphereGeometry(lo ? 0.011 : 0.0115, lo ? 6 : 14, lo ? 4 : 8, 0, Math.PI * 2, 0, Math.PI / 2); sh.translate(0, 0.034, 0);
  const head = new THREE.SphereGeometry(lo ? 0.0075 : 0.008, lo ? 6 : 16, lo ? 4 : 12); head.translate(0, 0.052, 0);
  const parts = [body, sh, head].map(g => g.index ? g.toNonIndexed() : g); parts.forEach(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
  return mergeGeometries(parts);
}
function capGeo() { const b = new THREE.BoxGeometry(0.022, 0.003, 0.022); b.translate(0, 0.062, 0); const c = new THREE.CylinderGeometry(0.008, 0.009, 0.006, 10); c.translate(0, 0.0585, 0); return mergeGeometries([b.toNonIndexed(), c.toNonIndexed()].map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; })); }
function buildMats() {
  M.wood = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#5a3418', '#2c160a', '#7d522c', 1), 1, 1), roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  M.woodD = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#33190c', '#170a04', '#4a2a16', 4), 1, 1), roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.25 });
  M.brass = metal(0xcfa860, 0.27); M.gold = metal(0xffcf6e, 0.18); M.steel = metal(0xd3d8e0, 0.16); M.dsteel = metal(0x8a929e, 0.3);
  M.marble = new THREE.MeshPhysicalMaterial({ map: repTex(marbleTex('#e9e5de', '#8f8a82'), 3, 1), roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.12 });
  M.floorW = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#6b4424', '#3e2410', '#8d5f36', 5), 4, 1), roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  M.stone = new THREE.MeshStandardMaterial({ color: 0x30333b, roughness: 0.8, metalness: 0.05 });
  M.stoneL = new THREE.MeshStandardMaterial({ color: 0x55585f, roughness: 0.75, metalness: 0.05 });
  M.wallIn = new THREE.MeshStandardMaterial({ color: 0x8a8174, roughness: 0.86 });
  M.lobbyWall = new THREE.MeshStandardMaterial({ color: 0x4f545c, roughness: 0.8 });
  M.slab = new THREE.MeshStandardMaterial({ color: 0x202329, roughness: 0.55, metalness: 0.15 });
  M.paper = new THREE.MeshStandardMaterial({ color: 0xf2eee3, roughness: 0.9 });
  M.ceramic = new THREE.MeshPhysicalMaterial({ color: 0xe6e1d8, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xd8e2ea, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.1, clearcoat: 1, clearcoatRoughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  M.black = new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.4, metalness: 0.3 });
  M.lockRed = new THREE.MeshPhysicalMaterial({ color: 0xc8202a, roughness: 0.32, metalness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  M.yellow = new THREE.MeshPhysicalMaterial({ color: 0xf2c218, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.2 });
  M.capM = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.5 });
  M.leather = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  M.pages = new THREE.MeshStandardMaterial({ map: canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#efe9da'; g.fillRect(0, 0, w, h); for (let i = 0; i < h; i += 2) { g.fillStyle = `rgba(120,100,70,${0.05 + hash(i) * 0.12})`; g.fillRect(0, i, w, 1); } }), roughness: 0.92 });
}

// ---------------------------------------------------------------- señal verde de emergencia (pictograma genérico: puerta, figura que corre, flecha y «SALIDA»)
let _exitTex = null;
function exitTex() {
  return _exitTex || (_exitTex = canvasTex(512, 192, (g, w, h) => {
    g.fillStyle = '#00a651'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.fillRect(26, 24, 96, 144); g.fillStyle = '#00a651'; g.fillRect(38, 36, 72, 132);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(154, 44, 15, 0, 7); g.fill();
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#ffffff'; g.lineWidth = 17;
    const L = pts => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
    L([[150, 68], [136, 110]]); L([[136, 110], [160, 130], [154, 164]]); L([[136, 110], [116, 136], [92, 140]]);
    L([[148, 76], [172, 94], [190, 84]]); L([[148, 76], [126, 82], [112, 100]]);
    L([[208, 96], [238, 96]]); L([[226, 80], [244, 96], [226, 112]]);
    g.font = '900 88px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('SALIDA', 262, 100, 236);
  }));
}
function exitSign(w = 0.12) {
  const h = w * 192 / 512, g = new THREE.Group();
  const body = rbox(w * 1.07, h * 1.14, 0.012, plastic(0x0b3420, 0.45), 0.004); g.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: exitTex(), toneMapped: false }));
  face.position.z = 0.0066; g.add(face); g.userData = { face, k: -1, w, h };
  return g;
}
// encendida (k = 1, brilla) o apagada (k = 0, verde muy oscuro)
function signOn(sg, k) { k = clamp(k); if (Math.abs(sg.userData.k - k) < 1e-4) return; sg.userData.k = k; sg.userData.face.material.color.setScalar(lerp(0.07, 2.3, k)); }

// ---------------------------------------------------------------- candado (cuerpo rojo, arco de acero que sube al abrirse)
function padlock(s = 1, body = M.lockRed) {
  const g = new THREE.Group();
  const b = rbox(0.05, 0.042, 0.02, body, 0.008); g.add(b);
  const sh = new THREE.Group(); g.add(sh);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.0165, 0.0045, 10, 28, Math.PI), M.steel); arc.position.y = 0.033; arc.castShadow = true; sh.add(arc);
  for (const sx of [-1, 1]) { const leg = cyl(0.0045, 0.0045, 0.016, M.steel, 10); leg.position.set(sx * 0.0165, 0.025, 0); sh.add(leg); }
  const hole = cyl(0.0056, 0.0056, 0.004, M.black, 16); hole.rotation.x = Math.PI / 2; hole.position.set(0, 0.004, 0.0105); g.add(hole);
  const slot = mesh(new THREE.BoxGeometry(0.0032, 0.01, 0.004), M.black); slot.position.set(0, -0.003, 0.0105); g.add(slot);
  g.userData = { sh, s0: s }; g.scale.setScalar(s); return g;
}

// ---------------------------------------------------------------- la llave «ADE»: dorada, la punta hacia -z; el ojo (con «ADE» por las dos caras) en +z, en el plano yz
function adeKey() {
  const g = new THREE.Group();
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 16, 56), M.gold); bow.rotation.y = Math.PI / 2; bow.position.z = 0.075; bow.castShadow = true; g.add(bow);
  const tx = canvasTex(256, 256, (c, w, h) => { const r = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); r.addColorStop(0, '#ffe7a3'); r.addColorStop(1, '#c89434'); c.fillStyle = r; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill();
    c.fillStyle = '#5a3a0a'; c.font = '900 96px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ADE', w / 2, h / 2 + 6); });
  for (const sd of [1, -1]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.041, 40), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.3, metalness: 0.75 })); d.rotation.y = sd * Math.PI / 2; d.position.set(sd * 0.0012, 0, 0.075); g.add(d); }
  const col = cyl(0.016, 0.016, 0.018, M.gold, 24); col.rotation.x = Math.PI / 2; col.position.z = 0.017; g.add(col);
  const sh = cyl(0.0085, 0.0085, 0.17, M.gold, 20); sh.rotation.x = Math.PI / 2; sh.position.z = -0.075; g.add(sh);
  for (const [z, d] of [[-0.128, 0.026], [-0.146, 0.018], [-0.158, 0.03]]) { const b = mesh(new THREE.BoxGeometry(0.006, d, 0.011), M.gold); b.position.set(0, -0.006 - d / 2, z); g.add(b); }
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 16, 10), M.gold); tip.position.z = -0.16; g.add(tip);
  return g;
}

// ---------------------------------------------------------------- folios de ofertas de empleo
function offerTex(big, col) {
  return canvasTex(256, 362, (g, w, h) => {
    g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d3461'; g.fillRect(0, 0, w, 54); g.fillStyle = '#ffffff'; g.font = '800 25px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('OFERTA DE EMPLEO', w / 2, 29);
    g.fillStyle = '#6b6f78'; g.font = '700 20px Inter'; g.fillText('SE BUSCA', w / 2, 84);
    g.fillStyle = col; g.font = `900 ${big.length > 4 ? 46 : 104}px Inter`; g.fillText(big, w / 2, big.length > 4 ? 136 : 152, w - 30);
    textLines(g, 30, 214, w - 60, 6, 22, 'rgba(40,44,52,.45)', big.length);
    g.strokeStyle = '#d9d4c8'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  });
}
function paperSet(n, tex) {
  const geo = new THREE.BoxGeometry(0.085, 0.0022, 0.12);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82 });
  const im = new THREE.InstancedMesh(geo, m, n); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; return im;
}

// ---------------------------------------------------------------- escalera de mano «ATAJO»
function ladder(len = 1.3) {
  const g = new THREE.Group(), w = 0.07;
  for (const sx of [-1, 1]) { const r = rbox(0.008, len, 0.008, M.yellow, 0.002); r.position.set(sx * w / 2, len / 2, 0); g.add(r); }
  for (let y = 0.06; y < len - 0.02; y += 0.06) { const b = cyl(0.0035, 0.0035, w, M.dsteel, 8); b.rotation.z = Math.PI / 2; b.position.y = y; g.add(b); }
  const sign = plateText(0.14, 0.05, [['ATAJO', 0.62, 0.52]], { fg: '#111111', bg: '#f2c218', weight: 900 }); sign.position.set(0, len * 0.42, 0.01); g.add(sign);
  return g;
}

// ---------------------------------------------------------------- libro tumbado con el lomo hacia delante (+z): ancho w (x), fondo h (z), grueso d (y)
function spineBook(w, h, d, color, title) {
  const g = new THREE.Group();
  const cover = rbox(w, h, d, M.leather(color), 0.003); cover.rotation.x = -Math.PI / 2; cover.position.y = d / 2; g.add(cover);
  const pg = mesh(new THREE.BoxGeometry(w * 0.96, d * 0.78, h * 0.94), M.pages); pg.position.set(0, d / 2, -h * 0.03); g.add(pg);
  const sp = plateText(w * 0.86, d * 0.8, [[title, 0.62, 0.55]], { fg: '#e8c77a', weight: 800 }); sp.position.set(0, d / 2, h / 2 + 0.0008); g.add(sp);
  return g;
}
// ---------------------------------------------------------------- certificado (cartulina con sello dorado y cinta roja), calendario de taco y examen
function certificate() {
  const g = new THREE.Group();
  const p = plateText(0.1, 0.07, [['CERTIFICADO', 0.17, 0.3], ['ASESOR FINANCIERO', 0.1, 0.52]], { fg: '#2b2218', bg: '#f1ead8', weight: 800, border: true }); g.add(p);
  const seal = cyl(0.011, 0.011, 0.003, M.gold, 28); seal.rotation.x = Math.PI / 2; seal.position.set(0.028, -0.019, 0.002); g.add(seal);
  for (const sx of [-1, 1]) { const rb = mesh(new THREE.BoxGeometry(0.006, 0.018, 0.001), plastic(0xb01822, 0.4)); rb.position.set(0.028 + sx * 0.005, -0.03, 0.001); rb.rotation.z = sx * 0.3; g.add(rb); }
  return g;
}
function calendarBlock() {
  const g = new THREE.Group();
  const base = rbox(0.06, 0.07, 0.012, plastic(0x2a2d34, 0.4), 0.004); g.add(base);
  const pages = [];
  for (let k = 0; k < 3; k++) {
    const pv = new THREE.Group(); pv.position.set(0, 0.032, 0.0075 + (2 - k) * 0.0008); g.add(pv);
    const pl = plateText(0.054, 0.06, [['AÑO', 0.16, 0.24], [String(k + 1), 0.56, 0.62]], { fg: '#1b1e24', bg: '#f4f1ea', weight: 900 });
    pl.position.y = -0.032; pv.add(pl); pages.push(pv);
  }
  const ring = cyl(0.003, 0.003, 0.05, M.steel, 8); ring.rotation.z = Math.PI / 2; ring.position.set(0, 0.034, 0.008); g.add(ring);
  g.userData.pages = pages; return g;
}
function examSheet() {
  const t = paperTex((g, w, h) => { g.fillStyle = '#1b1e24'; g.font = '900 54px Inter'; g.textAlign = 'center'; g.fillText('EXAMEN', w / 2, 90); g.font = '700 30px Inter'; g.fillText('DE APTITUD', w / 2, 136);
    textLines(g, 50, 190, w - 100, 14, 30, 'rgba(40,36,30,.45)', 4); }, 360, 480);
  return mesh(new THREE.PlaneGeometry(0.06, 0.08), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide }), false);
}
// ---------------------------------------------------------------- «GTA 6 ocupa 212 gigas»: un móvil tumbado en una mesa del que brota, sobre
// una columna de cristal (los datos), una ciudad tropical en miniatura al atardecer. NADA del juego: ni logos, ni personajes, ni lugares
// reales; las consolas solo con su nombre en texto.
const PH = { w: 0.78, l: 1.62, t: 0.08 };            // el móvil (x ancho, z largo, y grosor); la pantalla queda en y = PH.t
const PIL = { w: 0.36, d: 0.84, h: 2.4 };              // la columna de datos: 212 GB = 2,4 de alto
const H128 = PIL.h * 128 / 212, H99 = PIL.h * 99 / 212;
const CW = 3.0, CH = 0.07;                            // la ciudad: tablero de 3 × 3 y su canto
const CTOP = PH.t + PIL.h + CH;                       // altura del suelo de la ciudad cuando ha brotado del todo
const PAST = ['#f59ac0', '#8fe0c9', '#c4b2ff', '#ffc89a', '#94ccff', '#fff0c2', '#ffa99c', '#b6f0a0'];
const CLIP = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PH.t + 0.0005);   // lo de la ciudad solo se ve por encima de la pantalla
const TILE = 0.24;                                    // una tesela de fachada: 4 vanos × 4 plantas

// ---------------------------------------------------------------- texturas
function facadeTex(base, trim, mode = 0, seed = 1) {      // mode 0: fachada · 1: ventanas encendidas (emisiva)
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = mode ? '#000' : base; g.fillRect(0, 0, w, h);
    if (!mode) for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.015 + hash(i * 3.7 + seed) * 0.035})`; g.fillRect(hash(i * 1.3 + seed) * w, hash(i * 2.9 + seed) * h, 2, 2); }
    for (let fy = 0; fy < 4; fy++) for (let fx = 0; fx < 4; fx++) {
      const x = fx * 128, y = fy * 128, lit = hash(fx * 7.1 + fy * 3.3 + seed * 1.7) > 0.42;
      if (mode) { if (lit) { g.fillStyle = hash(fx + fy * 5 + seed) > 0.5 ? '#ffd79a' : '#ffe9c4'; g.fillRect(x + 30, y + 34, 68, 56); } continue; }
      g.fillStyle = trim; g.fillRect(x, y + 114, 128, 14); g.fillRect(x + 26, y + 30, 76, 64);
      const gr = g.createLinearGradient(0, y + 34, 0, y + 90); gr.addColorStop(0, '#5d86a6'); gr.addColorStop(1, '#22344a'); g.fillStyle = gr; g.fillRect(x + 30, y + 34, 68, 56);
      g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x + 30, y + 34, 68, 7); g.fillStyle = trim; g.fillRect(x + 62, y + 34, 4, 56);
    }
  });
}
function towerTex(mode = 0, seed = 1) {                  // torre de cristal: muro cortina
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = mode ? '#000' : '#2c5674'; g.fillRect(0, 0, w, h);
    for (let fy = 0; fy < 8; fy++) for (let fx = 0; fx < 8; fx++) {
      const x = fx * 64, y = fy * 64, lit = hash(fx * 3.1 + fy * 7.7 + seed) > 0.55;
      if (mode) { if (lit) { g.fillStyle = '#cfe8ff'; g.fillRect(x + 4, y + 6, 56, 50); } continue; }
      const gr = g.createLinearGradient(x, y, x + 64, y + 64); gr.addColorStop(0, '#7fb6d8'); gr.addColorStop(1, '#2a4d6b'); g.fillStyle = gr; g.fillRect(x + 4, y + 6, 56, 50);
    }
    if (!mode) { g.fillStyle = 'rgba(230,240,250,.55)'; for (let k = 0; k <= 8; k++) { g.fillRect(k * 64 - 2, 0, 4, h); g.fillRect(0, k * 64 - 3, w, 6); } }
  });
}
function groundTex() {                                   // el suelo de la ciudad: calles, aceras, plazas, arena y mar
  const P = 2048, X = x => (x + CW / 2) / CW * P;
  return canvasTex(P, P, (g, w, h) => {
    g.fillStyle = '#d8d0c2'; g.fillRect(0, 0, w, h);                                    // aceras
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(0,0,0,${0.02 + hash(i * 1.7) * 0.03})`; g.fillRect(hash(i * 2.3) * w, hash(i * 4.1) * h, 3, 3); }
    const road = (x0, z0, x1, z1) => { g.fillStyle = '#2a2c31'; g.fillRect(X(x0), X(z0), X(x1) - X(x0), X(z1) - X(z0)); };
    for (const x of AVES) road(x - 0.05, -1.5, x + 0.05, 1.5);
    for (const z of STREETS) road(-1.5, z - 0.05, 0.5, z + 0.05);
    g.strokeStyle = '#f2d36b'; g.lineWidth = 5; g.setLineDash([26, 22]);
    for (const x of AVES) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), h); g.stroke(); }
    for (const z of STREETS) { g.beginPath(); g.moveTo(0, X(z)); g.lineTo(X(0.38), X(z)); g.stroke(); }
    g.setLineDash([]); g.fillStyle = '#f4f4f4';                                          // pasos de cebra
    for (const x of AVES) for (const z of STREETS) for (let k = -3; k <= 3; k++) { g.fillRect(X(x - 0.045), X(z + 0.065) + k * 0, X(x + 0.045) - X(x - 0.045), 0); }
    for (const x of AVES) for (const z of STREETS) for (let k = 0; k < 6; k++) { g.fillRect(X(x - 0.045) + k * 11, X(z + 0.057), 6, 16); g.fillRect(X(x - 0.045) + k * 11, X(z - 0.073), 6, 16); }
    for (const [x0, z0, x1, z1] of PLAZAS) { g.fillStyle = '#7fbf6a'; g.fillRect(X(x0), X(z0), X(x1) - X(x0), X(z1) - X(z0)); g.fillStyle = 'rgba(40,90,40,.25)'; for (let i = 0; i < 300; i++) g.fillRect(X(x0) + hash(i * 3.3 + x0) * (X(x1) - X(x0)), X(z0) + hash(i * 5.1 + z0) * (X(z1) - X(z0)), 4, 4); }
    const sg = g.createLinearGradient(X(0.5), 0, X(0.8), 0); sg.addColorStop(0, '#f3dfb0'); sg.addColorStop(1, '#e9cf98'); g.fillStyle = sg; g.fillRect(X(0.5), 0, X(0.8) - X(0.5), h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(150,110,60,${0.05 + hash(i * 6.1) * 0.08})`; g.fillRect(X(0.5) + hash(i * 2.9) * (X(0.8) - X(0.5)), hash(i * 7.3) * h, 3, 3); }
    const og = g.createLinearGradient(X(0.78), 0, w, 0); og.addColorStop(0, '#5fd6d0'); og.addColorStop(0.12, '#2fa7c4'); og.addColorStop(1, '#16577e'); g.fillStyle = og; g.fillRect(X(0.78), 0, w - X(0.78), h);
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 6; g.beginPath(); for (let z = 0; z <= h; z += 8) g.lineTo(X(0.79) + Math.sin(z * 0.03) * 5, z); g.stroke();
  });
}
function dataTex() {                                     // los datos que suben por la columna: bloquecitos de luz
  const t = canvasTex(256, 512, (g, w, h) => { g.clearRect(0, 0, w, h);
    for (let c = 0; c < 16; c++) { const x = c * 16 + 6; let y = hash(c * 7.7) * 40;
      while (y < h) { const L = 4 + hash(c * 13 + y) * 18, a = 0.25 + hash(c * 3 + y * 0.7) * 0.6; g.fillStyle = `rgba(${hash(c + y) > 0.85 ? '255,140,210' : '140,240,255'},${a})`; g.fillRect(x, y, 3, L); y += L + 6 + hash(c * 5 + y) * 46; } } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function brickTex(px = 1024) {                           // un ladrillo pintado (de cerca): pintura rosa con pinceladas, grietas y desconchones
  return canvasTex(px, px / 2, (g, w, h) => {
    g.fillStyle = '#f08fb4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const x = hash(i * 1.9) * w, y = hash(i * 3.7) * h; g.strokeStyle = `rgba(${hash(i) > 0.5 ? '255,200,220' : '180,70,110'},${0.06 + hash(i * 5.3) * 0.12})`; g.lineWidth = 1 + hash(i * 2.2) * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14 + hash(i * 4.4) * 40, y + (hash(i * 6.6) - 0.5) * 8); g.stroke(); }
    for (let i = 0; i < 9; i++) { const x = hash(i * 11.1) * w, y = hash(i * 13.3) * h, r = 5 + hash(i * 3.9) * 12; g.fillStyle = '#c98a72'; g.beginPath(); for (let k = 0; k <= 10; k++) { const a = k / 10 * 6.283, rr2 = r * (0.6 + hash(i * 19 + k) * 0.8); g.lineTo(x + Math.cos(a) * rr2 * 1.5, y + Math.sin(a) * rr2); } g.fill();
      g.fillStyle = 'rgba(90,40,30,.35)'; for (let k = 0; k < 30; k++) g.fillRect(x + (hash(i * 7 + k) - 0.5) * r * 2, y + (hash(i * 9 + k) - 0.5) * r * 1.4, 2, 2); }
    g.strokeStyle = 'rgba(90,30,50,.45)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { let x = hash(i * 21.7) * w, y = hash(i * 17.3) * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 12; k++) { x += (hash(i * 31 + k) - 0.3) * 30; y += (hash(i * 37 + k) - 0.5) * 24; g.lineTo(x, y); } g.stroke(); }
  });
}
function codeTex() {                                     // el cubito de código: texto verde que corre
  const t = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#04150b'; g.fillRect(0, 0, w, h); g.font = '600 15px DejaVuMono'; g.fillStyle = '#5dff9a';
    const tok = ['if', 'for', '(x)', '{', '}', 'ret', '0x3F', 'int', 'car', 'npc', 'map', '+=', '==', 'ped', 'go()', '1', '0'];
    for (let y = 18; y < h; y += 19) { let x = 6, s = ''; while (x < w - 20) { const k = tok[Math.floor(hash(x * 1.3 + y * 7.1) * tok.length)]; g.fillText(k, x, y); x += (k.length + 1) * 9.5; } } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function screenTex() {                                   // la pantalla del móvil: negra, con el reflejo y las grietas en otra capa
  return canvasTex(512, 1064, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1b2a44'); gr.addColorStop(0.55, '#0c1322'); gr.addColorStop(1, '#2a1a3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const rg = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7); rg.addColorStop(0, 'rgba(120,240,255,.55)'); rg.addColorStop(1, 'rgba(120,240,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h); });
}
function crackTex() {
  return canvasTex(512, 1064, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(235,245,255,.9)'; g.lineCap = 'round';
    const cx = w * 0.5, cy = h * 0.5;
    for (let i = 0; i < 26; i++) { let a = i / 26 * Math.PI * 2 + hash(i) * 0.3, x = cx + Math.cos(a) * 60, y = cy + Math.sin(a) * 120; g.lineWidth = 2.6 - hash(i * 3) * 1.4; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 14; k++) { a += (hash(i * 17 + k) - 0.5) * 0.7; x += Math.cos(a) * (18 + hash(i * 5 + k) * 26); y += Math.sin(a) * (18 + hash(i * 7 + k) * 30); g.lineTo(x, y); } g.stroke(); }
    for (let r = 0; r < 3; r++) { g.lineWidth = 1.4; g.beginPath(); for (let k = 0; k <= 40; k++) { const a = k / 40 * Math.PI * 2; const rr2 = 90 + r * 70 + hash(k * 3 + r) * 26; g.lineTo(cx + Math.cos(a) * rr2 * 0.55, cy + Math.sin(a) * rr2); } g.stroke(); } });
}

// ---------------------------------------------------------------- materiales
function buildCityMats() {
  const clip = m => { m.clippingPlanes = [CLIP]; return m; };
  M.ground = clip(new THREE.MeshStandardMaterial({ map: groundTex(), roughness: 0.75 }));
  M.slab = clip(new THREE.MeshPhysicalMaterial({ color: 0x1b2230, roughness: 0.35, metalness: 0.2, clearcoat: 0.6 }));
  M.slabEdge = clip(basicGlow(0x5ff3ff, 1.6));
  M.water = clip(new THREE.MeshPhysicalMaterial({ color: 0x2fb6d6, roughness: 0.08, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.55 }));
  M.fac = PAST.map((c, i) => { const m = clip(new THREE.MeshStandardMaterial({ map: repTex(facadeTex(c, '#fbf7ef', 0, i + 1), 1, 1), emissiveMap: repTex(facadeTex(c, '#fff', 1, i + 1), 1, 1), emissive: 0xffc27a, emissiveIntensity: 0, roughness: 0.62 })); return m; });
  M.tower = [0, 1, 2].map(i => clip(new THREE.MeshPhysicalMaterial({ map: repTex(towerTex(0, i + 3), 1, 1), emissiveMap: repTex(towerTex(1, i + 3), 1, 1), emissive: 0xbfe3ff, emissiveIntensity: 0, roughness: 0.12, metalness: 0.5, clearcoat: 1 })));
  M.roof = clip(new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.7 }));
  M.trim = clip(new THREE.MeshPhysicalMaterial({ color: 0xfbf7ef, roughness: 0.4, clearcoat: 0.5 }));
  M.neon = [0xff4fb0, 0x45f0e0, 0xffd34a, 0xa06bff].map(c => clip(basicGlow(c, 1.0)));
  M.trunk = clip(new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.85 }));
  M.leaf = clip(new THREE.MeshStandardMaterial({ color: 0x2f8f45, roughness: 0.5, side: THREE.DoubleSide }));
  M.carP = ['#ff5a7a', '#ffd23f', '#3fd0ff', '#ffffff', '#ff8a3d', '#8a6bff', '#2fe0a0'].map(c => clip(paint(new THREE.Color(c).getHex(), 0.25)));
  M.carG = clip(new THREE.MeshPhysicalMaterial({ color: 0x0d1622, roughness: 0.05, metalness: 0.4, clearcoat: 1 }));
  M.tyre = clip(new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.8 }));
  M.pawn = [0xf3ede2, 0xffc3a0, 0x9bd1ff, 0xffe28a, 0xd9b8ff].map(c => clip(plastic(c, 0.35)));
  M.pier = clip(new THREE.MeshStandardMaterial({ color: 0xc9a47a, roughness: 0.8 }));
  M.wheel = clip(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 1 }));
  // el móvil
  M.phone = metal(0xb9bec7, 0.28); M.phoneBk = new THREE.MeshPhysicalMaterial({ color: 0x1b1d22, roughness: 0.25, metalness: 0.3, clearcoat: 1 });
  M.screen = new THREE.MeshPhysicalMaterial({ map: screenTex(), emissiveMap: screenTex(), emissive: 0x3a6a9a, emissiveIntensity: 0.55, roughness: 0.04, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02 });
  M.crack = new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  // la columna de datos
  M.pil = new THREE.MeshPhysicalMaterial({ color: 0x8fe6ff, transparent: true, opacity: 0.16, roughness: 0.06, metalness: 0.1, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  M.data = new THREE.MeshBasicMaterial({ map: dataTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(0x9ff4ff).multiplyScalar(0.85), side: THREE.DoubleSide });
  M.data2 = M.data.clone(); M.data2.map = M.data.map.clone(); M.data2.map.needsUpdate = true;
  M.code = new THREE.MeshBasicMaterial({ map: codeTex(), toneMapped: false, color: new THREE.Color(0xffffff).multiplyScalar(1.3) });
  M.disc = new THREE.MeshPhysicalMaterial({ color: 0xd9dee6, roughness: 0.12, metalness: 0.85, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6 });
  M.brick = new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.75 });
  M.fiber = new THREE.MeshPhysicalMaterial({ color: 0x1a2a36, roughness: 0.3, clearcoat: 1 });
  M.pulse = basicGlow(0x9ff7ff, 2.2);
}
// ---------------------------------------------------------------- piezas
function boxUV(geo, w, h, d, tile = TILE) {              // UV a escala real: una tesela de fachada mide TILE en cada cara
  const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  uv.needsUpdate = true; return geo;
}
function building(w, h, d, kind, ci) {                  // kind 0: deco pastel · 1: torre de cristal
  const g = new THREE.Group(), side = kind ? M.tower[ci % 3] : M.fac[ci % PAST.length];
  const body = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, d), w, h, d, kind ? 0.32 : TILE), [side, side, M.roof, M.roof, side, side]);
  body.position.y = h / 2; body.castShadow = body.receiveShadow = true; g.add(body);
  if (!kind) {                                            // remate art déco: cornisa, escalón y, a veces, torreón redondo con neón
    const c = new THREE.Mesh(new THREE.BoxGeometry(w + 0.012, 0.012, d + 0.012), M.trim); c.position.y = h + 0.006; g.add(c);
    if (hash(ci * 3.3 + w) > 0.35) { const s = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.05, d * 0.55), side); s.position.y = h + 0.037; g.add(s); }
    const nm = M.neon[ci % 4];
    const n1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.016, 0.005, 0.005), nm); n1.position.set(0, h - 0.012, d / 2 + 0.006); g.add(n1);
    const n2 = new THREE.Mesh(new THREE.BoxGeometry(0.005, h * 0.8, 0.005), nm); n2.position.set(w / 2 + 0.004, h * 0.55, d / 2 + 0.004); g.add(n2);
    g.userData.neon = [n1, n2];
  } else {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6), M.trim); a.position.y = h + 0.06; g.add(a);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), M.neon[0]); l.position.y = h + 0.12; g.add(l); g.userData.neon = [l];
  }
  g.userData.h = h; return g;
}
function palmGeo() {                                     // una palmera: tronco curvo con anillos + 8 hojas arqueadas (geometrías unidas)
  const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(v3(Math.sin(u * 1.2) * 0.035, u * 0.26, 0)); }
  const trunk = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0055, 6);
  const leaves = [];
  for (let k = 0; k < 9; k++) {
    const L = 0.12 + hash(k * 3.7) * 0.03, lg = new THREE.PlaneGeometry(L, 0.05, 12, 2); lg.translate(L / 2, 0, 0);
    const p = lg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), u = x / L, wid = Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * 0.35);
      p.setY(i, y * wid); p.setZ(i, -u * u * 0.075 - Math.abs(y) * wid * 0.35); }
    lg.rotateX(-Math.PI / 2); lg.rotateZ(0.32); lg.rotateY(k / 9 * Math.PI * 2 + hash(k) * 0.35); lg.translate(Math.sin(1.2) * 0.035, 0.262, 0); leaves.push(lg);
  }
  const lv = mergeGeometries(leaves.map(x => x.toNonIndexed ? x.toNonIndexed() : x)); lv.computeVertexNormals();
  return { trunk, leaves: lv };
}
function car(ci) {                                       // cochecito: carrocería redondeada, cabina de cristal y 4 ruedas
  const g = new THREE.Group(), L = 0.085, Wd = 0.04;
  const b = rbox(L, Wd, 0.018, M.carP[ci % M.carP.length], 0.008); b.rotation.x = -Math.PI / 2; b.position.y = 0.017; g.add(b);
  const c = rbox(L * 0.55, Wd * 0.86, 0.016, M.carG, 0.007); c.rotation.x = -Math.PI / 2; c.position.set(-0.005, 0.032, 0); g.add(c);
  for (const [x, z] of [[0.026, 0.019], [-0.026, 0.019], [0.026, -0.019], [-0.026, -0.019]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.007, 12), M.tyre); w.rotation.x = Math.PI / 2; w.position.set(x, 0.008, z); g.add(w); }
  g.userData.body = b; return g;
}
function phone() {
  const g = new THREE.Group();
  const body = rbox(PH.w, PH.l, PH.t * 0.94, M.phone, 0.09); body.rotation.x = -Math.PI / 2; body.position.y = PH.t * 0.47; g.add(body);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(PH.w - 0.05, PH.l - 0.05), M.screen); scr.rotation.x = -Math.PI / 2; scr.position.y = PH.t + 0.0008; scr.receiveShadow = true; g.add(scr);
  const cr = new THREE.Mesh(new THREE.PlaneGeometry(PH.w - 0.05, PH.l - 0.05), M.crack); cr.rotation.x = -Math.PI / 2; cr.position.y = PH.t + 0.0016; cr.renderOrder = 5; g.add(cr);
  const isl = rbox(0.16, 0.045, 0.004, M.phoneBk, 0.022); isl.rotation.x = -Math.PI / 2; isl.position.set(0, PH.t + 0.002, -PH.l / 2 + 0.06); g.add(isl);   // la isla de la cámara frontal
  for (const [z, l] of [[-0.35, 0.16], [-0.12, 0.1], [0.02, 0.1]]) { const bt = rbox(0.012, l, 0.02, M.phone, 0.005); bt.rotation.x = -Math.PI / 2; bt.position.set(-PH.w / 2 - 0.004, PH.t * 0.5, z); g.add(bt); }
  const port = rbox(0.09, 0.014, 0.02, M.phoneBk, 0.006); port.position.set(0, PH.t * 0.45, PH.l / 2 + 0.002); g.add(port);
  g.userData.crack = cr; return g;
}

// ---------------------------------------------------------------- montaje
const AVES = [-1.05, -0.35, 0.43], STREETS = [-1.0, -0.2, 0.6];
const PLAZAS = [[-0.98, -0.93, -0.72, -0.62], [-0.28, 0.67, 0.36, 1.47]];          // la segunda: césped despejado frente al edificio protagonista
const XB = [[-1.47, -1.12], [-0.98, -0.42], [-0.28, 0.36]], ZB = [[-1.47, -1.07], [-0.93, -0.27], [-0.13, 0.53], [0.67, 1.47]];
const HERO_B = { x: -0.04, z: 0.35, w: 0.32, d: 0.3, h: 0.36 };     // el edificio rosa cuya fachada se despega (da a la calle z = 0,6)
const HERO_CAR = v3(-0.02, 0, 0.6), HERO_PED = v3(0.2, 0, 0.555), CODE_P = v3(-0.14, 0, 0.84);
function buildCity() {
  const C = new THREE.Group(); scene.add(C); S.city = C;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, CW), M.slab); slab.position.y = -CH / 2; slab.receiveShadow = true; C.add(slab);
  const eg = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.01, 0.006, CW + 0.01), M.slabEdge); eg.position.y = -0.003; C.add(eg);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(CW, CW), M.ground); gr.rotation.x = -Math.PI / 2; gr.position.y = 0.0005; gr.receiveShadow = true; C.add(gr);
  S.waterT = 0; const wat = new THREE.Mesh(new THREE.PlaneGeometry(CW / 2 - 0.78, CW, 1, 1), M.water); wat.rotation.x = -Math.PI / 2; wat.position.set((0.78 + CW / 2) / 2, 0.004, 0); C.add(wat);
  // edificios: un lote por cuarto de manzana; al oeste, torres; en medio, hoteles pastel bajos; la manzana del edificio protagonista, a mano
  S.blds = [];
  const add = (b, x, z, ry = 0) => { b.position.set(x, 0, z); b.rotation.y = ry; C.add(b); b.userData.delay = hash(x * 3.1 + z * 5.7) * 0.5; S.blds.push(b); return b; };
  let ci = 0;
  XB.forEach(([x0, x1], bx2) => ZB.forEach(([z0, z1], bz) => {
    const nx = x1 - x0 > 0.5 ? 2 : 1, nz = z1 - z0 > 0.5 ? 2 : 1;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const lx0 = x0 + (x1 - x0) * i / nx, lx1 = x0 + (x1 - x0) * (i + 1) / nx, lz0 = z0 + (z1 - z0) * j / nz, lz1 = z0 + (z1 - z0) * (j + 1) / nz;
      const cx = (lx0 + lx1) / 2, cz = (lz0 + lz1) / 2, w = (lx1 - lx0) * 0.86, d = (lz1 - lz0) * 0.86;
      if (PLAZAS.some(([a, b, c, e]) => cx > a && cx < c && cz > b && cz < e)) continue;
      if (bx2 === 2 && bz === 2) continue;                                  // la manzana del protagonista
      const tower = bx2 < 2 && bz < 3 && hash(cx * 7 + cz * 3) > 0.25, h = tower ? 0.42 + hash(cx * 2.7 + cz * 9.1) * 0.5 : 0.16 + hash(cx * 5.3 + cz) * 0.2;
      add(building(w, h, d, tower ? 1 : 0, ci++), cx, cz);
    }
  }));
  S.hero = add(building(HERO_B.w, HERO_B.h, HERO_B.d, 0, 0), HERO_B.x, HERO_B.z);       // rosa
  add(building(0.14, 0.24, 0.26, 0, 1), 0.26, 0.36); add(building(0.3, 0.2, 0.22, 0, 2), -0.07, 0.0); add(building(0.14, 0.28, 0.22, 0, 3), 0.27, 0.0);
  // la fachada del protagonista es una lámina aparte (se despega): debajo queda la forma gris
  S.heroGrey = new THREE.Mesh(new THREE.PlaneGeometry(HERO_B.w, HERO_B.h), new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.8, clippingPlanes: [CLIP] }));
  S.heroGrey.position.set(0, HERO_B.h / 2, HERO_B.d / 2 + 0.0015); S.hero.add(S.heroGrey);
  // palmeras (dos mallas instanciadas)
  const pg = palmGeo(), spots = [];
  for (let z = -1.4; z <= 1.4; z += 0.17) spots.push([0.34, z], [0.53, z + 0.08]);
  for (let i = 0; i < 10; i++) spots.push([0.6 + hash(i * 3.1) * 0.14, -1.4 + hash(i * 7.7) * 2.8]);
  for (const [a, b, c, e] of PLAZAS.slice(0, 1)) for (let i = 0; i < 5; i++) spots.push([a + 0.03 + hash(i * 5.1 + a) * (c - a - 0.06), b + 0.03 + hash(i * 2.3 + b) * (e - b - 0.06)]);
  S.palmT = new THREE.InstancedMesh(pg.trunk, M.trunk, spots.length); S.palmL = new THREE.InstancedMesh(pg.leaves, M.leaf, spots.length);
  S.palmT.castShadow = S.palmL.castShadow = true; S.palmSpots = spots;
  spots.forEach(([x, z], i) => { _o.position.set(x, 0, z); _o.rotation.set(0, hash(i * 9.3) * 6.28, 0); const s = 0.8 + hash(i * 4.4) * 0.5; _o.scale.setScalar(s); _o.updateMatrix(); S.palmT.setMatrixAt(i, _o.matrix); S.palmL.setMatrixAt(i, _o.matrix); });
  C.add(S.palmT, S.palmL);
  // muelle con noria en el mar
  const pier = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.012, 0.08), M.pier); pier.position.set(1.03, 0.02, -0.6); C.add(pier);
  for (let k = 0; k < 6; k++) C.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.03, 6), M.pier), 0.8 + k * 0.09, 0.004, -0.6 + (k % 2 ? 0.035 : -0.035)));
  S.wheel = new THREE.Group(); S.wheel.position.set(1.2, 0.17, -0.6); C.add(S.wheel);
  S.wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.005, 8, 48), M.wheel));
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const sp = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.14, 0.003), M.wheel); sp.position.set(Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0); sp.rotation.z = a - Math.PI / 2; S.wheel.add(sp);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.016, 0.016), M.neon[k % 4]); cab.position.set(Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0); S.wheel.add(cab); }
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.19, 0.008), M.wheel); leg.position.set(1.2 + s * 0.05, 0.085, -0.6); leg.rotation.z = s * 0.28; C.add(leg); }
  // rótulos de neón genéricos
  S.signs = [];
  for (const [txt, x, z, h, col] of [['HOTEL', -0.04, 0.505, 0.4, '#ff63b8'], ['CAFÉ', 0.26, 0.495, 0.22, '#5ef2e3'], ['SURF', 0.27, 0.115, 0.26, '#ffd34a'], ['24H', -0.07, 0.115, 0.17, '#a98bff']]) {
    const s = plateText(0.16, 0.05, [[txt, 0.62, 0.55]], { fg: col, bg: null, weight: 900 });
    s.material = new THREE.MeshBasicMaterial({ map: s.material.map, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.7, 1.7, 1.7), clippingPlanes: [CLIP] });
    s.position.set(x, h, z + 0.002); C.add(s); S.signs.push(s);
  }
  // coches (dan vueltas en sus calles: bucle exacto) y el coche protagonista, aparcado
  S.cars = [];
  const lanes = [...AVES.map(x => ({ a: 'z', c: x })), ...STREETS.map(z => ({ a: 'x', c: z }))];
  for (let i = 0; i < 16; i++) { const L = lanes[i % lanes.length], cr = car(i + 1); C.add(cr); S.cars.push({ g: cr, L, s0: hash(i * 5.3), dir: i % 2 ? 1 : -1, n: 1 + (i % 3) }); }
  S.heroCar = car(0); S.heroCar.position.copy(HERO_CAR); C.add(S.heroCar);
  S.racer = car(5); C.add(S.racer);
  // gente (figuritas) por las aceras y la playa; una con cara (la que se despega)
  const PG = studentGeo(); S.peds = [];
  for (let i = 0; i < 26; i++) { const p = new THREE.Mesh(PG, M.pawn[i % 5]); p.castShadow = true; const onBeach = i < 8;
    p.position.set(onBeach ? 0.56 + hash(i * 3.3) * 0.18 : AVES[i % 3] + (i % 2 ? 0.066 : -0.066), 0, onBeach ? -1.3 + hash(i * 7.1) * 2.6 : -1.4 + hash(i * 2.9) * 2.8); p.scale.setScalar(1.3); C.add(p); S.peds.push(p); }
  S.heroPed = new THREE.Mesh(PG, M.pawn[0]); S.heroPed.position.copy(HERO_PED); S.heroPed.scale.setScalar(1.6); S.heroPed.castShadow = true; C.add(S.heroPed);
  // el cubito de código
  S.code = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), M.code); S.code.position.copy(CODE_P).add(v3(0, 0.015, 0)); S.code.castShadow = true; C.add(S.code);
}
function buildDevice() {
  S.phone = phone(); scene.add(S.phone);
  // la columna de datos: caja de cristal + dos capas de datos que suben + aristas de luz
  const P = new THREE.Group(); scene.add(P); S.pil = P;
  P.add(new THREE.Mesh(new THREE.BoxGeometry(PIL.w, 1, PIL.d), M.pil));
  const d1 = new THREE.Mesh(new THREE.BoxGeometry(PIL.w * 0.92, 1, PIL.d * 0.94), M.data); P.add(d1); const d2 = new THREE.Mesh(new THREE.BoxGeometry(PIL.w * 0.7, 1, PIL.d * 0.8), M.data2); P.add(d2);
  P.children.forEach(m => m.position.y = 0.5);
  edges(P.children[0], 0x7ff3ff, 2.2, 28, 1);
  // regla con marcas (0 … 200 GB) a la derecha de la columna
  S.ruler = new THREE.Group(); scene.add(S.ruler); const rx = PIL.w / 2 + 0.06, rz = PIL.d / 2;
  const rm = lineMat(0xbff7ff, 1.6, 0.9);
  const segs = [rx, PH.t, rz, rx, PH.t + PIL.h, rz];
  for (let gb = 0; gb <= 200; gb += 25) { const y = PH.t + PIL.h * gb / 212, L = gb % 50 ? 0.03 : 0.06; segs.push(rx, y, rz, rx + L, y, rz); }
  S.ruler.add(new LineSegments2(new LineSegmentsGeometry().setPositions(segs), rm));
  S.rulerLabs = [];
  for (let gb = 50; gb <= 200; gb += 50) { const l = plateText(0.2, 0.06, [[gb + ' GB', 0.6, 0.55]], { fg: '#bff7ff', weight: 800 }); l.material = new THREE.MeshBasicMaterial({ map: l.material.map, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) }); l.position.set(rx + 0.18, PH.t + PIL.h * gb / 212, rz); S.ruler.add(l); S.rulerLabs.push(l); }
  // la caja de 128 GB (lo que cabe en el móvil): aristas discontinuas
  S.box128 = new THREE.Group(); scene.add(S.box128);
  const bm = lineMat(0xffffff, 2.2, 1, true); bm.dashSize = 0.05; bm.gapSize = 0.035; S.box128M = bm;
  const bg = new THREE.EdgesGeometry(new THREE.BoxGeometry(PIL.w + 0.08, H128, PIL.d + 0.08)); const bl = new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(bg), bm); bl.computeLineDistances(); bl.position.y = PH.t + H128 / 2; S.box128.add(bl);
  // Red Dead 2: otra columna, la mitad de alta, en la mesa
  const R = new THREE.Group(); scene.add(R); S.rd = R; R.position.set(0.95, 0, 0.15);
  const rbase = rbox(PIL.w + 0.1, PIL.d + 0.1, 0.04, M.phoneBk, 0.02); rbase.rotation.x = -Math.PI / 2; rbase.position.y = 0.02; R.add(rbase);
  const rp = new THREE.Mesh(new THREE.BoxGeometry(PIL.w, 1, PIL.d), M.pil.clone()); rp.position.y = 0.5; R.add(rp); edges(rp, 0xffc27a, 2.2, 28, 1);
  const rdat = new THREE.Mesh(new THREE.BoxGeometry(PIL.w * 0.92, 1, PIL.d * 0.94), M.data.clone()); rdat.material.color = new THREE.Color(0xffc27a).multiplyScalar(1.3); rdat.position.y = 0.5; R.add(rdat);
  S.rdCol = [rp, rdat];
  // canciones: discos que caen y se amontonan junto al móvil
  const N = 1400; S.discs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 20), M.disc, N); S.discs.castShadow = true; scene.add(S.discs);
  S.discData = []; const PC = v3(-1.25, 0, 0.35);
  for (let i = 0; i < N; i++) { const r = Math.sqrt(hash(i * 1.7)) * 0.55, a = hash(i * 3.9) * 6.283, h = Math.max(0, 0.42 * (1 - (r / 0.55) ** 1.6)) * (0.5 + hash(i * 2.2) * 0.5) * (i / N) ** 0.3;
    S.discData.push({ p: v3(PC.x + Math.cos(a) * r, 0.002 + h, PC.z + Math.sin(a) * r), t0: 0, rx: (hash(i * 5.1) - 0.5) * 1.2, rz: (hash(i * 6.3) - 0.5) * 1.2, x0: PC.x + (hash(i * 7.7) - 0.5) * 0.3, z0: PC.z + (hash(i * 8.8) - 0.5) * 0.3 }); }
  S.discPC = PC;
  // la fibra: llega por la mesa hasta el móvil, con pulsos de luz
  const fp = [v3(-3.2, 0.012, 2.6), v3(-1.6, 0.012, 2.2), v3(-0.6, 0.012, 1.6), v3(0, 0.03, PH.l / 2 + 0.12), v3(0, 0.04, PH.l / 2 + 0.01)];
  S.fiberCurve = new THREE.CatmullRomCurve3(fp); S.fiber = new THREE.Mesh(new THREE.TubeGeometry(S.fiberCurve, 120, 0.012, 10), M.fiber); S.fiber.castShadow = true; scene.add(S.fiber);
  S.pulses = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.014, 0.08, 4, 8), M.pulse, 14); scene.add(S.pulses);
  // la caja con la «?» encima de la ciudad, el mando tachado, el ladrillo y los iconos que salen del móvil
  S.qm = qmark(new THREE.MeshPhysicalMaterial({ color: 0xff7ac2, roughness: 0.2, metalness: 0.3, clearcoat: 1, emissive: 0x6a1040, emissiveIntensity: 0.4 })); scene.add(S.qm);
  S.pad = gamepad(); scene.add(S.pad);
  S.brick = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.068, 0.105), [M.brick, M.brick, M.brick, M.brick, M.brick, M.brick]); S.brick.castShadow = true; scene.add(S.brick);
  S.icons = []; const IC = ['#ff6fa8', '#5fd2ff', '#ffd34a', '#7ee08a', '#b18bff', '#ff8a5c', '#ffffff', '#4fe0cf'];
  for (let i = 0; i < 24; i++) { const m = rbox(0.16, 0.16, 0.028, plastic(new THREE.Color(IC[i % IC.length]).getHex(), 0.3), 0.032); scene.add(m); S.icons.push(m); }
}
function gamepad() {                                     // mando genérico (sin marca): cuerpo, dos asas, cruceta y botones
  const g = new THREE.Group(), m = plastic(0xf1f3f7, 0.3), d = plastic(0x2a2e36, 0.35);
  const b = rbox(0.42, 0.2, 0.07, m, 0.07); g.add(b);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.12, 6, 12), m); h.position.set(s * 0.17, -0.1, 0); h.rotation.z = s * 0.45; g.add(h); }
  const cx = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.022, 0.02), d); cx.position.set(-0.12, 0.02, 0.04); g.add(cx); const cy2 = cx.clone(); cy2.rotation.z = Math.PI / 2; g.add(cy2);
  for (const [x, y] of [[0.12, 0.05], [0.12, -0.01], [0.09, 0.02], [0.15, 0.02]]) { const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 16), d); bt.rotation.x = Math.PI / 2; bt.position.set(x, y, 0.04); g.add(bt); }
  for (const x of [-0.05, 0.05]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.024, 20), d); st.rotation.x = Math.PI / 2; st.position.set(x, -0.04, 0.04); g.add(st); }
  return g;
}
// ---------------------------------------------------------------- láminas que se despegan (fachada, coche, cara) y ondas de sonido
function buildPeels() {
  const mk = (w, h, mat) => { const geo = new THREE.PlaneGeometry(w, h, 24, 24); geo.translate(0, -h / 2, 0); const m = new THREE.Mesh(geo, mat); m.userData.base = geo.attributes.position.array.slice(); m.userData.w = w; m.userData.h = h; m.castShadow = true; scene.add(m); return m; };
  const heroMat = M.fac[0].clone(); heroMat.map = M.fac[0].map.clone(); heroMat.map.repeat.set(HERO_B.w / TILE, HERO_B.h / TILE); heroMat.map.needsUpdate = true;
  heroMat.emissiveMap = M.fac[0].emissiveMap.clone(); heroMat.emissiveMap.repeat.copy(heroMat.map.repeat); heroMat.emissiveMap.needsUpdate = true; heroMat.side = THREE.DoubleSide; heroMat.clippingPlanes = [CLIP];
  S.peelWall = mk(HERO_B.w, HERO_B.h, heroMat);
  const carMat = new THREE.MeshPhysicalMaterial({ map: canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#ff5a7a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(0, h * 0.62, w, 10); g.fillStyle = '#ffd23f'; g.font = '900 40px Inter'; g.fillText('77', w * 0.62, h * 0.48); }), roughness: 0.3, clearcoat: 1, side: THREE.DoubleSide, clippingPlanes: [CLIP] });
  S.peelCar = mk(0.08, 0.028, carMat);
  const faceMat = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffd9b8'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.fillStyle = '#2a1d16'; g.beginPath(); g.arc(90, 110, 14, 0, 7); g.arc(166, 110, 14, 0, 7); g.fill();
    g.strokeStyle = '#2a1d16'; g.lineWidth = 9; g.beginPath(); g.arc(128, 140, 46, 0.25, Math.PI - 0.25); g.stroke(); g.fillStyle = 'rgba(255,120,120,.35)'; g.beginPath(); g.arc(70, 150, 18, 0, 7); g.arc(186, 150, 18, 0, 7); g.fill(); }), transparent: true, side: THREE.DoubleSide, roughness: 0.6, clippingPlanes: [CLIP] });
  S.peelFace = mk(0.026, 0.026, faceMat);
  // la cuadrícula de píxeles que aparece sobre las láminas grandes
  S.gridTex = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; for (let k = 0; k <= 32; k++) { g.beginPath(); g.moveTo(k * 16, 0); g.lineTo(k * 16, h); g.moveTo(0, k * 16); g.lineTo(w, k * 16); g.stroke(); } });
  S.grids = [S.peelWall, S.peelCar, S.peelFace].map(p => { const gm = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: S.gridTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); gm.renderOrder = 6; scene.add(gm); return gm; });
  // la fachada borrosa (imagen pequeña) para la comparación de cerca
  const low = canvasTex(32, 32, (g, w, h) => { const img = M.fac[0].map.image; g.imageSmoothingEnabled = true; g.drawImage(img, 0, 0, 512, 512, 0, 0, w, h); });
  low.magFilter = THREE.LinearFilter; low.minFilter = THREE.LinearFilter; repTex(low, HERO_B.w / TILE, HERO_B.h / TILE);
  S.blurHalf = new THREE.Mesh(new THREE.PlaneGeometry(HERO_B.w / 2, HERO_B.h), new THREE.MeshStandardMaterial({ map: low, roughness: 0.62, clippingPlanes: [CLIP] }));
  { const uv = S.blurHalf.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5); uv.needsUpdate = true; }
  S.blurHalf.position.set(-HERO_B.w / 4, HERO_B.h / 2, HERO_B.d / 2 + 0.003); S.hero.add(S.blurHalf);
  const div = new THREE.Mesh(new THREE.PlaneGeometry(0.003, HERO_B.h * 1.1), basicGlow(0xffffff, 1.6)); div.position.set(0, HERO_B.h / 2, HERO_B.d / 2 + 0.004); S.hero.add(div); S.blurDiv = div;
  // ondas de sonido: 3 cintas de barritas (voz, canción, calle) + anillos
  S.waves = [0, 1, 2].map(i => { const n = 30, im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), basicGlow([0xfff2c0, 0xff6fd0, 0x7ff3ff][i], 0.9), n); im.userData.n = n; scene.add(im); return im; });
  S.rings = Array.from({ length: 8 }, (_, i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 48), basicGlow(i % 2 ? 0x7ff3ff : 0xff6fd0, 1.5)); r.rotation.x = Math.PI / 2; scene.add(r); return r; });
  S.crossM = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.03), basicGlow(0xff4a5c, 2.0)); S.crossM2 = S.crossM.clone(); scene.add(S.crossM, S.crossM2);
}
// ---------------------------------------------------------------- tiempos y animación (todo depende solo del instante t)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const fract = x => x - Math.floor(x);
const _o = new THREE.Object3D(), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3(), _c1 = new THREE.Color();
let TT = {};
const RISE = 3.4, PRE = 1.0;          // la ciudad brota en 3,4 s, empezando 1 s antes del 0 (el primer fotograma ya está brotando)
function buildTimes() {
  TT = {
    crack: K.movil1,                                            // 1: «no te cabría en el móvil»: la caja de 128 GB se pone roja y la pantalla se raja
    qm: K.por2, qmOff: K.abrirlo2 + 0.25,                       // 2: «¿Por qué pesa tanto?»
    gb: K.hasta3, n212: K.n212_3,                               // 3: «hasta 212 gigas»
    discs: K.n50000_4, rd: K.doble4,                            // 4: canciones y Red Dead 2
    fiber: K.fibra5, clock: K.tardarias5,                       // 5: la fibra y el reloj
    code: K.codigo6, menos: K.realidad6,                        // 6: el código, diminuto
    ves: K.ves7, oyes: K.oyes7,                                 // 7: se enciende la ciudad; anillos de sonido
    wall: K.pared8, car: K.coche8, face: K.cara8, big: K.imagenes8, back: K.para8, blur: K.cerca8,   // 8: las láminas
    voz: K.voz9, song: K.cancion9, noise: K.ruido9, store: K.sonido9,                                 // 9: el sonido
    whole: K.ciudad10, race: K.lista10, raceEnd: K.esperar10 + 0.25,                                  // 10: la ciudad entera
    resp: K.respuesta11, pad: K.no11, padX: K.juego11, down: K.te11b, brick: K.cada11, brickOff: K.playstation12 - 0.2,   // 11: la respuesta
    poll: K.playstation12, hueco: K.haciendo12,                 // 12: votación; los iconos salen del móvil
  };
  TT.downEnd = TT.down + 1.7; TT.reRise = END - PRE;
}
// progreso de la ciudad: 0 = dentro del móvil, 1,15 = arriba del todo (por debajo de 0,15 solo asoma por la pantalla)
function riseAt(t) {
  const up = u => 1.15 * Math.sin(clamp(u) * Math.PI / 2);
  if (t >= TT.reRise) return up((t - TT.reRise) / RISE);
  if (t < TT.down) return up((t + PRE) / RISE);
  if (t < TT.downEnd) return 1.15 * (1 - eio(clamp((t - TT.down) / (TT.downEnd - TT.down))));
  return 0;
}
function cityState(t) {
  const p = riseAt(t), q = clamp((p - 0.15) / 1.0), em = clamp(p / 0.15);
  const sc = lerp(0.2, 1, q), base = p < 0.15 ? PH.t - 0.5 * (1 - em) : PH.t + PIL.h * q;
  return { p, q, sc, base, hp: PIL.h * q };
}
// ---------------------------------------------------------------- el móvil, la columna y la ciudad
function deviceAt(t) {
  const st = cityState(t), C = S.city;
  C.visible = st.p > 0.001; C.position.set(0, st.base + CH * st.sc, 0); C.scale.setScalar(st.sc);
  // los edificios brotan escalonados mientras crece la columna
  for (const b of S.blds) { const k = backOut(clamp((st.q * 1.25 - b.userData.delay) / 0.45)); b.scale.set(1, Math.max(0.001, k), 1); }
  S.pil.visible = st.hp > 0.002; S.pil.scale.set(1, Math.max(0.001, st.hp), 1); S.pil.position.y = PH.t;
  M.data.map.offset.y = -20 * t / END; M.data2.map.offset.y = -34 * t / END + 0.37;      // vueltas enteras: bucle exacto
  // la caja de 128 GB: blanca; con «móvil» se pone roja, parpadea y se va
  const r = win(t, TT.crack, 0.12), gone = win(t, TT.crack + 0.7, 0.5);
  const bin = win(t, K.cabria1 - 0.35, 0.3); S.box128.visible = bin > 0.001 && gone < 0.999 && t < TT.down; S.box128M.color.setRGB(lerp(1, 1, r), lerp(1, 0.3, r), lerp(1, 0.35, r)); S.box128M.opacity = bin * (1 - gone) * (r > 0 && r < 1 && Math.sin(t * 60) > 0 ? 0.4 : 1);
  // la pantalla se raja con «móvil» y se arregla cuando la ciudad vuelve a entrar
  S.phone.userData.crack.material.opacity = win(t, TT.crack, 0.15) * (1 - win(t, TT.down, 0.8)) * 0.85;
  // regla: con «hasta 212»
  const rk = cwin(t, TT.gb - 0.2, TT.rd + 2.6, 0.4, 0.4); S.ruler.visible = rk > 0.01; S.ruler.children[0].material.opacity = rk * 0.9; S.rulerLabs.forEach(l => l.material.opacity = rk);
  // Red Dead 2: la otra columna sube de la mesa
  const rd = backOut(clamp((t - TT.rd) / 0.6)) * (1 - win(t, TT.code - 0.6, 0.5)); S.rd.visible = rd > 0.002; S.rd.scale.set(1, 1, 1);
  S.rdCol.forEach(m => { m.scale.y = Math.max(0.001, H99 * rd); m.position.y = 0.04 + H99 * rd / 2; });
  // la «?» encima de la ciudad
  const qk = cwin(t, TT.qm, TT.qmOff, 0.3, 0.3); S.qm.visible = qk > 0.01;
  if (S.qm.visible) { S.qm.position.set(0.35, CTOP + 0.95 + Math.sin(t * 2.4) * 0.03, 0.2); S.qm.scale.setScalar(1.5 * backOut(clamp((t - TT.qm) / 0.45)) * (qk < 1 ? qk : 1)); S.qm.rotation.y = t * 1.2; }
  // agua y noria
  M.ground.map.offset.set(0, 0); S.wheel.rotation.z = -t / END * Math.PI * 2;
}
// ---------------------------------------------------------------- discos (canciones), fibra con pulsos y reloj
function discsAt(t) {
  const N = S.discData.length, t0 = TT.discs - 0.1, dur = 1.35, gone = win(t, TT.code - 0.6, 0.5);
  S.discs.visible = t > t0 && gone < 1;
  if (!S.discs.visible) return;
  S.discData.forEach((d, i) => { const ti = t0 + (i / N) * dur, u = clamp((t - ti) / 0.45);
    if (u <= 0) { _o.position.set(0, -50, 0); _o.scale.setScalar(0.0001); }
    else { const e = u * u; _o.position.set(lerp(d.x0, d.p.x, u), lerp(1.9, d.p.y, e), lerp(d.z0, d.p.z, u)); _o.rotation.set(d.rx * (1 + (1 - u) * 6), 0, d.rz * (1 + (1 - u) * 6)); _o.scale.setScalar(1 - gone * 0.999); }
    _o.updateMatrix(); S.discs.setMatrixAt(i, _o.matrix); });
  S.discs.instanceMatrix.needsUpdate = true;
}
function fiberAt(t) {
  const k = cwin(t, TT.fiber - 0.3, TT.code - 0.5, 0.4, 0.4); S.fiber.visible = k > 0.01; S.pulses.visible = k > 0.01;
  if (!S.fiber.visible) return; S.fiber.scale.setScalar(1);
  for (let i = 0; i < 14; i++) { const u = fract(t * 0.32 + i / 14), p = S.fiberCurve.getPointAt(u), tg = S.fiberCurve.getTangentAt(u);
    _o.position.copy(p).add(v3(0, 0.012, 0)); _o.quaternion.setFromUnitVectors(v3(0, 1, 0), tg); _o.scale.setScalar(k * (u > 0.97 ? (1 - u) / 0.03 : 1)); _o.updateMatrix(); S.pulses.setMatrixAt(i, _o.matrix); }
  S.pulses.instanceMatrix.needsUpdate = true;
}
// ---------------------------------------------------------------- la ciudad viva: coches, luces, código, láminas, sonido
const _cityM = new THREE.Matrix4();
function cityLocal(p) { return S.city.localToWorld(p.clone()); }
function lifeAt(t) {
  // coches: vueltas exactas por su calle (bucle)
  for (const c of S.cars) { const s = fract(c.s0 + c.dir * c.n * t / END), u = s * 3.0 - 1.5; const off = c.dir * 0.025;
    if (c.L.a === 'z') { c.g.position.set(c.L.c + off, 0, u); c.g.rotation.y = c.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
    else { c.g.position.set(Math.min(u, 0.42), 0, c.L.c + off); c.g.rotation.y = c.dir > 0 ? 0 : Math.PI; c.g.visible = u < 0.42; } }
  // el coche que corre por el paseo con «cualquier sitio»
  { const u = eio(clamp((t - TT.race) / (TT.raceEnd - TT.race))), z = t > TT.downEnd + 0.1 && t < TT.race ? -1.35 : lerp(-1.35, 1.35, u); S.racer.position.set(AVES[1] - 0.025, 0, t >= TT.downEnd ? -1.35 : z); S.racer.rotation.y = -Math.PI / 2; }
  // luces de la ciudad: tenues desde el principio; con «ves» se encienden del todo; se apagan al volver al móvil (bucle)
  const on = win(t, TT.ves - 0.05, 0.5) * (1 - win(t, TT.downEnd, 0.3)), L = 0.25 + 0.95 * on;
  M.fac.forEach(m => m.emissiveIntensity = L * 1.1); M.tower.forEach(m => m.emissiveIntensity = L * 0.9);
  M.neon.forEach((m, i) => { m.opacity = 0.35 + 0.65 * win(t, TT.ves + i * 0.06, 0.25) * (1 - win(t, TT.downEnd, 0.3)); });
  S.signs.forEach((s, i) => { s.material.opacity = 0.3 + 0.7 * win(t, TT.ves + 0.1 + i * 0.08, 0.2) * (1 - win(t, TT.downEnd, 0.3)); });
  // el cubito de código gira y su texto corre
  S.code.rotation.y = 5 * Math.PI * 2 * t / END; M.code.map.offset.y = -14 * t / END;
}
// curva de despegue: la lámina gira sobre su borde de arriba y se curva como una pegatina
function peelShape(m, k) {
  const pa = m.geometry.attributes.position, b = m.userData.base, h = m.userData.h;
  for (let i = 0; i < pa.count; i++) { const y = b[i * 3 + 1], v = -y / h; pa.setXYZ(i, b[i * 3], y, b[i * 3 + 2] + Math.pow(v, 2) * h * 0.55 * k); }
  pa.needsUpdate = true; m.geometry.computeVertexNormals();
}
const _e1 = new THREE.Euler();
function peelsAt(t) {
  const items = [
    { m: S.peelWall, t0: TT.wall, A: v3(HERO_B.x, HERO_B.h, HERO_B.z + HERO_B.d / 2 + 0.002), big: v3(-0.45, 2.75, -1.7), bs: 5.5, g: S.grids[0], tilt: 0.75, fw: 0.07 },
    { m: S.peelCar, t0: TT.car, A: v3(HERO_CAR.x, 0.03, HERO_CAR.z + 0.0205), big: v3(0.62, 1.55, -1.5), bs: 12, g: S.grids[1], tilt: 0.6, fw: 0.04 },
    { m: S.peelFace, t0: TT.face, A: v3(HERO_PED.x, 0.096, HERO_PED.z + 0.0138), big: v3(0.62, 2.75, -1.5), bs: 20, g: S.grids[2], tilt: 0.5, fw: 0.03 },
  ];
  const sc = S.city.scale.x, alive = t > 1.0 && t < TT.down, back = eio(clamp((t - TT.back) / 0.6));
  for (const it of items) {
    const m = it.m; m.visible = alive; if (!alive) { it.g.visible = false; continue; }
    const k = eio(clamp((t - it.t0) / 0.6)) * (1 - back), fly = eio(clamp((t - TT.big + 0.15) / 0.9)) * (1 - back);
    // despegada: se separa hacia la cámara, se curva por abajo y ondea; luego sube al cielo y crece; con «para que de cerca» vuelve a su sitio
    _p1.copy(cityLocal(it.A)).add(v3(0, 0.02 * k * sc, it.fw * k * sc)); _p2.copy(it.big).add(v3(0, CTOP, 0));
    m.position.copy(_p1).lerp(_p2, fly); const s = lerp(sc, sc * it.bs, fly); m.scale.setScalar(s);
    peelShape(m, k * (1 - fly) * 0.9);
    m.rotation.set(-it.tilt * k * (1 - fly), (Math.sin(t * 1.7 + it.bs) * 0.18 * k) * (1 - fly) + Math.sin(t * 0.6 + it.bs) * 0.08 * fly, 0);
    // cuadrícula de píxeles sobre la lámina grande (gira con ella sobre el eje vertical: sin desfase)
    const gk = fly * (1 - win(t, TT.back - 0.2, 0.2)); it.g.visible = gk > 0.01;
    if (it.g.visible) { it.g.material.opacity = gk * 0.8; it.g.rotation.set(0, m.rotation.y, 0); it.g.scale.set(m.userData.w * s, m.userData.h * s, 1);
      it.g.position.copy(m.position).add(v3(Math.sin(m.rotation.y) * 0.004, -m.userData.h * s / 2, Math.cos(m.rotation.y) * 0.004)); }
  }
  // la mitad borrosa de la fachada, solo en la comparación de cerca
  const bk = cwin(t, TT.blur - 0.35, TT.voz - 0.3, 0.2, 0.25); S.blurHalf.visible = S.blurDiv.visible = bk > 0.01;
  S.heroGrey.visible = t > TT.wall - 0.02 && t < TT.back + 0.62;
}
function soundAt(t) {
  const src = [cityLocal(v3(HERO_PED.x, 0.1, HERO_PED.z)), cityLocal(v3(HERO_CAR.x, 0.05, HERO_CAR.z)), cityLocal(v3(0.43, 0.04, -0.2))];
  const t0s = [TT.voz, TT.song, TT.noise], store = eio(clamp((t - TT.store) / 0.7)), sc = S.city.scale.x;
  S.waves.forEach((w, i) => { const k = clamp((t - t0s[i]) / 0.5), on = k > 0 && store < 1 && t < TT.whole + 0.2; w.visible = on; if (!on) return;
    const n = w.userData.n, dir = v3(i === 1 ? -0.7 : i === 2 ? 0.3 : 0.5, 0.75, 0.5).normalize(), L = 0.5 * sc * k;
    for (let j = 0; j < n; j++) { const u = j / (n - 1), a = Math.abs(Math.sin(u * 9 + t * (6 + i * 3) + i)) * (0.4 + 0.6 * Math.abs(Math.sin(u * 23 + t * 3 + i * 2))) * (i === 0 ? 1 : 1.3) * (1 - u * 0.4);
      _p1.copy(src[i]).addScaledVector(dir, u * L);
      // «guardado»: se van a la columna
      _p2.set(0, PH.t + PIL.h * (0.4 + i * 0.15), 0); _p1.lerp(_p2, store);
      _o.position.copy(_p1); _o.rotation.set(0, 0.6, 0); _o.scale.set(0.008 * sc, Math.max(0.0005, a * 0.12 * sc * (1 - store * 0.7)), 0.008 * sc); _o.updateMatrix(); w.setMatrixAt(j, _o.matrix); }
    w.instanceMatrix.needsUpdate = true; });
  // anillos con «oyes»
  S.rings.forEach((r, i) => { const u = (t - TT.oyes - (i % 4) * 0.22) / 1.1; r.visible = u > 0 && u < 1 && t < TT.wall; if (!r.visible) return;
    const P = [cityLocal(v3(HERO_CAR.x, 0.02, HERO_CAR.z)), cityLocal(v3(0.43, 0.02, -0.6)), cityLocal(v3(-0.35, 0.02, 0.2)), cityLocal(v3(-0.7, 0.3, -0.4))][i % 4];
    r.position.copy(P); const R = (0.03 + u * 0.35) * S.city.scale.x; r.scale.set(R, R, R * 0.6); r.material.opacity = (1 - u) * 0.9; });
}
// ---------------------------------------------------------------- la respuesta: el mando tachado, el ladrillo, los iconos que salen
function answerAt(t) {
  const pk = cwin(t, TT.pad, TT.down + 0.3, 0.35, 0.3); S.pad.visible = pk > 0.01;
  if (S.pad.visible) { S.pad.position.set(0, CTOP + 0.55, 0.9); S.pad.scale.setScalar(1.7 * backOut(clamp((t - TT.pad) / 0.4)) * (pk < 1 ? pk : 1)); S.pad.rotation.set(0.15, Math.sin(t * 1.4) * 0.25, 0); }
  const xk = cwin(t, TT.padX, TT.down + 0.3, 0.12, 0.3); S.crossM.visible = S.crossM2.visible = xk > 0.01 && S.pad.visible;
  if (S.crossM.visible) { for (const [m, a] of [[S.crossM, 0.75], [S.crossM2, -0.75]]) { m.position.copy(S.pad.position).add(v3(0, 0, 0.12)); m.rotation.set(0, 0, a); m.scale.set(xk * 1.7, 1.7, 1.7); } }
  // el ladrillo: sale de la pantalla, vuela a la cámara y vuelve a entrar
  const bk0 = clamp((t - TT.brick + 0.15) / 0.9), bk1 = clamp((t - TT.brickOff) / 0.6); S.brick.visible = bk0 > 0 && bk1 < 1;
  if (S.brick.visible) { const e = eio(bk0) * (1 - eio(bk1)); _p1.set(0, PH.t + 0.02, 0); _p2.set(0.0, 0.72, 0.62); S.brick.position.copy(_p1).lerp(_p2, e); S.brick.scale.setScalar(lerp(0.2, 1.0, e));
    S.brick.rotation.set(lerp(-1.2, 0.18, e), lerp(2.4, -0.45, e) + Math.sin(t * 0.9) * 0.05 * e, lerp(0.6, 0.04, e)); }
  // «haciendo hueco»: iconos que salen del móvil disparados
  S.icons.forEach((m, i) => { const t0 = TT.hueco - 0.25 + i * 0.045, u = (t - t0) / 1.1; m.visible = u > 0 && u < 1;
    if (!m.visible) return; const gx = (i % 3 - 1) * 0.2, gz = (Math.floor(i / 3) % 6 - 2.5) * 0.22, a = hash(i * 3.1) * 6.283, sp = 0.9 + hash(i * 5.7) * 0.8;
    m.position.set(gx + Math.cos(a) * sp * u, PH.t + 0.02 + 2.6 * u - 2.4 * u * u, gz + Math.sin(a) * sp * u); m.rotation.set(-Math.PI / 2 + u * 4 * (hash(i) - 0.5), u * 3, u * 2 * (hash(i * 2) - 0.5)); m.scale.setScalar(Math.min(1, u * 8) * (1 - win(t, t0 + 0.85, 0.25))); });
}
function sceneAt(t) { deviceAt(t); discsAt(t); fiberAt(t); lifeAt(t); peelsAt(t); soundAt(t); answerAt(t); }
// ---------------------------------------------------------------- cámara: un solo plano. Empieza junto al móvil con la ciudad brotando y acaba
// exactamente igual (la ciudad vuelve a brotar): el último fotograma enlaza con el primero.
let CKS = [];
const K0C = [[1.6, 1.3, 4.5], [0.0, 0.75, 0.0], 34];
function buildCam() {
  const CY = CTOP;            // altura del suelo de la ciudad
  CKS = [
    [0, ...K0C],
    [K.salido1 + 0.2, [2.2, 1.7, 5.6], [0.0, 1.25, 0.0], 34],
    [K.movil1 + 0.15, [3.2, 2.4, 7.6], [0.0, 1.75, 0.0], 34],                                      // 1: la torre entera; la caja de 128 GB revienta
    [K.por2 + 0.3, [2.4, CY + 1.5, 5.2], [0.2, CY + 0.6, 0.0], 34],                               // 2: «¿por qué pesa tanto?»
    [K.abrirlo2 + 0.3, [0.9, CY + 0.95, 2.3], [0.0, CY + 0.15, 0.0], 34],                         //    «vamos a abrirlo»: a la ciudad
    [K.ocupa2 + 0.1, [0.25, CY + 0.5, 1.35], [-0.15, CY + 0.08, -0.2], 34],
    [K.hasta3, [2.9, 1.9, 6.6], [0.15, 1.55, 0.0], 34],                                             // 3: la torre con la regla: 212 GB
    [K.gigas3 + 0.3, [2.7, 1.75, 6.1], [0.15, 1.45, 0.0], 34],
    [K.n50000_4 + 0.25, [-0.3, 1.0, 3.4], [-1.0, 0.55, 0.2], 34],
    [K.doble4 - 0.25, [-0.2, 1.05, 3.55], [-0.9, 0.6, 0.2], 34],                               // 4: las canciones
    [K.doble4 + 0.45, [0.5, 1.3, 5.2], [0.48, 1.15, 0.0], 34],                                     //    el doble que Red Dead 2
    [K.fibra5 + 0.2, [-1.5, 0.42, 3.0], [-0.45, 0.12, 1.25], 34],                                  // 5: la fibra
    [K.hora5 + 0.2, [0.9, 0.75, 2.6], [0.0, 0.35, 0.4], 34],
    [K.codigo6 - 0.1, [-0.065, CY + 0.045, 0.95], [-0.14, CY + 0.015, 0.84], 34],                  // 6: el cubito de código, enorme…
    [K.realidad6 + 0.05, [-0.062, CY + 0.05, 0.957], [-0.14, CY + 0.016, 0.84], 34],
    [K.menos6 + 0.2, [-0.45, CY + 1.25, 2.5], [-0.14, CY + 0.0, 0.84], 34],                         //    …y diminuto
    [K.ves7 - 1.1, [-1.25, CY + 0.75, 0.62], [0.3, CY + 0.0, 0.58], 34],                          // 7: baja a la calle por arriba (sin atravesar edificios)
    [K.ves7 - 0.55, [-1.25, CY + 0.17, 0.62], [0.4, CY + 0.05, 0.56], 34],                          // 7: por la calle; se enciende todo
    [K.oyes7 + 0.4, [-0.62, CY + 0.17, 0.66], [0.6, CY + 0.06, 0.52], 34],
    [K.pared8, [0.02, CY + 0.2, 1.7], [0.02, CY + 0.15, 0.5], 34],                             // 8: la fachada, el coche y la cara
    [K.coche8 + 0.3, [0.03, CY + 0.17, 1.4], [0.03, CY + 0.12, 0.5], 34],
    [K.cara8 + 0.3, [0.15, CY + 0.1, 0.8], [0.2, CY + 0.085, 0.555], 34],                         //    la cara de la figurita, de cerca
    [K.enormes8, [0.15, CY + 0.5, 3.8], [0.08, CY + 1.65, -1.6], 34],                               //    las láminas, enormes, en el cielo
    [K.para8 + 0.15, [0.2, CY + 0.45, 3.0], [0.05, CY + 1.4, -1.2], 34],
    [K.cerca8 + 0.1, [-0.04, CY + 0.18, 0.92], [-0.04, CY + 0.18, 0.5], 34],                       //    de cerca: borrosa / nítida
    [K.borrosa8 + 0.35, [-0.04, CY + 0.18, 0.9], [-0.04, CY + 0.18, 0.5], 34],
    [K.voz9 + 0.1, [-0.1, CY + 0.16, 1.15], [0.1, CY + 0.08, 0.57], 34],                          // 9: voz, canción, calle
    [K.ruido9 + 0.2, [0.0, CY + 0.3, 1.5], [0.2, CY + 0.08, 0.3], 34],
    [K.sonido9 + 0.35, [1.6, 2.45, 4.0], [0.1, 1.9, 0.0], 34],                                     //    se guarda en la columna
    [K.ciudad10 + 0.2, [2.3, CY + 2.6, 3.7], [0.0, CY, -0.1], 34],                                 // 10: la ciudad entera
    [K.lista10 + 0.15, [-0.1, CY + 0.75, -1.9], [-0.35, CY + 0.0, -0.8], 34],                      //     el coche por el paseo
    [K.esperar10 + 0.3, [-0.1, CY + 0.75, 1.15], [-0.35, CY + 0.0, 1.6], 34],
    [K.respuesta11 + 0.1, [3.0, 2.6, 8.6], [0.0, 1.75, 0.0], 34],                                  // 11: la respuesta
    [K.no11 + 0.2, [0.8, CY + 0.6, 4.4], [0.0, CY + 0.5, 0.8], 34],
    [K.juego11 + 0.3, [0.75, CY + 0.55, 4.2], [0.0, CY + 0.5, 0.8], 34],                                //     no es un juego
    [K.te11b + 0.2, [2.0, 2.0, 5.6], [0.0, 1.2, 0.0], 34],                                         //     es una ciudad: baja al móvil
    [K.ciudad11 + 0.5, [1.5, 1.1, 3.4], [0.0, 0.3, 0.0], 34],
    [K.cada11 + 0.55, [0.07, 0.79, 1.0], [0.0, 0.72, 0.62], 34],                                   //     cada ladrillo, pintado
    [K.pintado11 + 0.3, [0.05, 0.775, 0.96], [0.0, 0.72, 0.62], 34],
    [K.playstation12 + 0.3, [0.95, 1.15, 2.15], [0.0, 0.3, 0.1], 34],                              // 12: votación y «haciendo hueco»
    [K.haciendo12, [0.85, 1.45, 2.3], [0.0, 0.42, 0.0], 34],
    [END - 0.9, [1.55, 1.25, 4.4], [0.0, 0.72, 0.0], 34],
    [END, ...K0C],
  ];
}
function camAt(t) { return camKeys(t, CKS); }
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.crack + 0.02, 0.05], [TT.n212 + 0.05, 0.03], [TT.padX + 0.05, 0.03], [TT.brick + 0.3, 0.02]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st0) {
  NOW = t;
  const c = st0.l, d = st0.p.distanceTo(c), yaw = Math.atan2(st0.p.x - c.x, st0.p.z - c.z), k = clamp(d / 3.0, 0.12, 2.6);
  rigAt(c, yaw, k, 0.7, 0.62);
  const R = S.rig; R.key.color.setHex(0xffd2b4); R.a.color.setHex(0xff5fae); R.b.color.setHex(0x47e6d6); R.f.color.setHex(0xc9d8ff);
  R.sun.intensity = 0; R.hemi.intensity = 0.28;
  scene.fog.density = lerp(0.03, 0.006, clamp((d - 0.3) / 6));
  sceneAt(t);
  post.uniforms.fade.value = 0;
}
// ---------------------------------------------------------------- HUD: la pregunta pendiente (arriba a la derecha), la memoria del móvil, las cifras con su
// fuente, las etiquetas de lo que pesa (imagen, sonido, código) y la votación final
function buildHudPlan() {}
const HGd = '#FFC24A', HRd = '#FF5247', HGr = '#7CF0A9';
function lab(P, txt, sub, k, opt) { if (k <= 0.01 || !P) return; callout(P, txt, sub, k, { size: 27, subSize: 19, bg: true, ...opt }); }
function bracketMsg(t, txt, col, k, blink) {
  if (k <= 0.01) return; const on = !blink || Math.sin(t * 9) > -0.3;
  hg.save(); hg.globalAlpha = k; hfont(21); hg.letterSpacing = '3px'; hg.textAlign = 'right'; hg.textBaseline = 'alphabetic';
  const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
  hg.strokeStyle = col; hg.lineWidth = 1.6; hg.beginPath();
  hg.moveTo(x0 + 10, y - 24); hg.lineTo(x0, y - 24); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
  hg.moveTo(x1 - 10, y - 24); hg.lineTo(x1, y - 24); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
  hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y); hg.restore();
}
// cifra grande abajo (con subtítulo y fuente)
function bigFig(txt, sub, col, k, y = 1330) {
  if (k <= 0.01) return;
  bigText(txt, 540, y, 92, col, k, { glow: 18, dark: 22, ls: 6 });
  if (sub) bigText(sub, 540, y + 78, 30, HC.white, clamp(k * 1.2 - 0.15), { dark: 14, ls: 4 });
}
function srcLine(txt, k) {
  if (k <= 0.01) return;
  hg.save(); hg.globalAlpha = k * 0.85; hfont(17, false); hg.letterSpacing = '2px'; hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.fillStyle = HC.grey;
  const full = 'FUENTE: ' + txt, w = hg.measureText(full).width; if (w > 968) hfont(17 * 968 / w, false);      // nunca se sale por la derecha
  hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 6; hg.fillText(typed(full, clamp(k * 1.5)), 56, 1548); hg.restore();
}
function cross(P, k, s = 34) {
  if (k <= 0.01 || !P) return; const e = backOut(clamp(k / 0.5)), r = s * e;
  hg.save(); hg.globalAlpha = clamp(k * 3); glowStroke(HRd, 9, 18); hg.lineCap = 'round';
  hg.beginPath(); hg.moveTo(P.x - r, P.y - r); hg.lineTo(P.x + r, P.y + r); hg.moveTo(P.x + r, P.y - r); hg.lineTo(P.x - r, P.y + r); hg.stroke(); noGlow(); hg.restore();
}
function pollPills(t, k) {
  if (k <= 0.01) return;
  const items = [['PLAYSTATION', '#6FA8FF', 300], ['XBOX', '#7CF0A9', 790]], y = 1370;
  hg.save(); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '5px';
  items.forEach(([txt, col, x], i) => {
    const kk = backOut(clamp((k - i * 0.15) / 0.5)), pulse = 1 + 0.03 * Math.sin(t * 7 + i * Math.PI);
    hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(x, y); hg.scale(kk * pulse, kk * pulse);
    hfont(44); const w = hg.measureText(txt).width + 80, h = 96;
    hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, -w / 2, -h / 2, w, h, h / 2); hg.fill(); glowStroke(col, 4, 18); rr(hg, -w / 2, -h / 2, w, h, h / 2); hg.stroke(); noGlow();
    hg.fillStyle = col; hg.fillText(txt, 0, 4); hg.restore();
  });
  hg.globalAlpha = clamp(k * 2); hfont(40); hg.fillStyle = HC.white; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 10; hg.fillText('o', 540, y + 2);
  hg.restore();
}
const _hv = new THREE.Vector3();
function smallTag(P, txt, k, col = HC.white, size = 24) {
  if (k <= 0.01 || !P || !P.ok) return;
  hg.save(); hg.globalAlpha = clamp(k * 2); hfont(size); hg.letterSpacing = '3px'; hg.textAlign = 'center'; hg.textBaseline = 'middle';
  const w = hg.measureText(txt).width + 26, h = size * 1.6; hg.fillStyle = 'rgba(0,0,0,.66)'; rr(hg, P.x - w / 2, P.y - h / 2, w, h, h / 2); hg.fill();
  hg.fillStyle = col; hg.fillText(txt, P.x, P.y + 1); hg.restore();
}
function thirst(t, k, lvl) {
  if (k <= 0.01) return;
  const x = 930, y0 = 1300, y1 = 760, w = 46;
  hg.save(); hg.globalAlpha = clamp(k * 2);
  hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, x - w / 2 - 10, y1 - 20, w + 20, y0 - y1 + 40, 18); hg.fill();
  hg.strokeStyle = 'rgba(238,242,246,.45)'; hg.lineWidth = 2; rr(hg, x - w / 2, y1, w, y0 - y1, 12); hg.stroke();
  const yy = lerp(y0, y1, clamp(lvl)); const gr = hg.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#62E3D4'); gr.addColorStop(1, '#FF5247');
  hg.save(); hg.beginPath(); rr(hg, x - w / 2, y1, w, y0 - y1, 12); hg.clip(); hg.fillStyle = gr; hg.fillRect(x - w / 2, yy, w, y0 - yy); hg.restore();
  hfont(22); hg.letterSpacing = '4px'; hg.textAlign = 'center'; hg.fillStyle = HC.white; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 8; hg.fillText('SED', x, y0 + 50);
  hg.restore();
}
// la memoria del móvil (abajo): la barra se llena y se sale en rojo
function storageBar(t, k, over) {
  if (k <= 0.01) return;
  const x0 = 120, x1 = 960, y = 1395, w = x1 - x0, cap = x0 + w * 128 / 212;
  hg.save(); hg.globalAlpha = clamp(k * 2);
  hg.fillStyle = 'rgba(0,0,0,.62)'; rr(hg, x0 - 26, y - 92, w + 52, 170, 26); hg.fill();
  hfont(24); hg.letterSpacing = '3px'; hg.textBaseline = 'middle'; hg.textAlign = 'left'; hg.fillStyle = HC.white; hg.fillText('MEMORIA DEL MÓVIL', x0, y - 50);
  hg.textAlign = 'right'; hg.fillStyle = over > 0.5 ? HRd : HC.grey; hg.fillText(over > 0.5 ? 'NO CABE' : '128 GB', x1, y - 50);
  rr(hg, x0, y - 16, w, 36, 18); hg.fillStyle = 'rgba(255,255,255,.12)'; hg.fill();
  const fill = lerp(x0, x1, clamp(k * 1.15)); hg.save(); rr(hg, x0, y - 16, w, 36, 18); hg.clip();
  hg.fillStyle = '#62E3D4'; hg.fillRect(x0, y - 16, Math.min(fill, cap) - x0, 36);
  if (fill > cap) { hg.fillStyle = over > 0.5 && Math.sin(t * 30) > -0.2 ? '#FF5247' : '#FFB547'; hg.fillRect(cap, y - 16, fill - cap, 36); }
  hg.restore();
  hg.strokeStyle = HC.white; hg.lineWidth = 3; hg.beginPath(); hg.moveTo(cap, y - 30); hg.lineTo(cap, y + 34); hg.stroke();
  hfont(21, false); hg.textAlign = 'center'; hg.fillStyle = HC.white; hg.fillText('TU MÓVIL · 128 GB', (x0 + cap) / 2, y + 52);
  hg.fillStyle = over > 0.5 ? HRd : HC.amber; hg.fillText('GTA 6 · 212 GB', (cap + x1) / 2, y + 52);
  hg.restore();
}
// la descarga (abajo): barra que avanza despacio y el reloj
function downloadBar(t, k, u) {
  if (k <= 0.01) return;
  const x0 = 150, x1 = 930, y = 1420, w = x1 - x0;
  hg.save(); hg.globalAlpha = clamp(k * 2);
  hg.fillStyle = 'rgba(0,0,0,.62)'; rr(hg, x0 - 30, y - 96, w + 60, 150, 26); hg.fill();
  hfont(24); hg.letterSpacing = '3px'; hg.textBaseline = 'middle'; hg.textAlign = 'left'; hg.fillStyle = HC.white; hg.fillText('DESCARGANDO · 212 GB', x0, y - 56);
  hg.textAlign = 'right'; hg.fillStyle = HC.teal; hg.fillText('300 Mb/s', x1, y - 56);
  rr(hg, x0, y - 18, w, 30, 15); hg.fillStyle = 'rgba(255,255,255,.12)'; hg.fill();
  hg.save(); rr(hg, x0, y - 18, w, 30, 15); hg.clip(); hg.fillStyle = '#62E3D4'; hg.fillRect(x0, y - 18, w * clamp(u), 30); hg.restore();
  hg.restore();
}
function hudAt(t) {
  hudBegin();
  const cw2 = (t0, t1, fi = 0.22, fo = 0.22) => win(t, t0, fi) * (1 - win(t, t1, fo));
  // la pregunta, pendiente hasta la respuesta
  bracketMsg(t, 'LO QUE OCUPA · ???', HC.amber, cw2(K.final2, K.respuesta11, 0.3, 0.12), true);
  bracketMsg(t, 'LO QUE OCUPA ↓', HGr, cw2(K.respuesta11, K.pintado11 + 0.6, 0.12, 0.3), false);
  // 1: aún no ha salido; la memoria del móvil se desborda
  { _hv.set(0, PH.t, PH.l / 2); smallTag(proj(_hv), 'SALE EL 19 DE NOVIEMBRE', cw2(K.salido1 - 0.05, K.movil1 + 0.4, 0.2, 0.2), HC.amber, 24); }
  storageBar(t, cw2(K.cabria1 - 0.2, K.por2 + 0.5, 0.5, 0.3), win(t, K.movil1, 0.05));
  // 3: 212 GB con su fuente
  bigFig('212 GB', 'HASTA 212 GB SEGÚN LA CONSOLA', HC.amber, cw2(K.n212_3 - 0.05, K.n50000_4 - 0.2, 0.2, 0.25), 1300);
  srcLine('ROCKSTAR (3-11-2026) · RED DEAD 2: ROCKSTAR (2018) · CANCIONES Y DESCARGA: CÁLCULO DE EJEMPLO', cw2(K.rockstar3, K.codigo6 - 0.3, 0.3, 0.3));
  // 4: canciones y Red Dead 2
  { _hv.copy(S.discPC).add(v3(0, 0.55, 0)); lab(_hv.clone(), '≈ 53.000 CANCIONES', 'MP3 DE 4 MB CADA UNA', cw2(K.n50000_4 + 0.2, K.doble4 - 0.15), { color: HC.white, dx: 120, dy: -150 }); }
  if (S.rd.visible) { _hv.set(S.rd.position.x, H99 + 0.1, S.rd.position.z); lab(_hv.clone(), 'RED DEAD 2 · 99 GB', 'ROCKSTAR · 2018 · PS4', cw2(K.red4 - 0.1, K.fibra5 - 0.2), { color: '#FFC27A', dx: -150, dy: -120 });
    _hv.set(-PIL.w / 2, PH.t + PIL.h * 0.75, PIL.d / 2); lab(_hv.clone(), 'GTA 6 · 212 GB', 'EL DOBLE', cw2(K.doble4 + 0.1, K.fibra5 - 0.2), { color: HC.amber, dx: -140, dy: -90 }); }
  // 5: la fibra y el reloj
  { const p = S.fiberCurve.getPointAt(0.45); lab(p, 'FIBRA · 300 MEGAS', 'TODO PERFECTO', cw2(K.n300_5 - 0.05, K.tardarias5 - 0.1), { color: HC.teal, dx: 120, dy: -170 }); }
  downloadBar(t, cw2(K.tardarias5 - 0.3, K.crees6 - 0.1, 0.3, 0.25), clamp((t - (K.tardarias5 - 0.3)) / 30));
  bigFig('1 h 34 min', 'MÁS DE HORA Y MEDIA', HC.white, cw2(K.hora5 - 0.05, K.crees6 + 0.1, 0.2, 0.25), 1180);
  // 6: el código
  { _hv.copy(S.code.position); S.city.localToWorld(_hv); lab(_hv.clone(), 'EL CÓDIGO', 'EL PROGRAMA DEL JUEGO', cw2(K.codigo6 + 0.05, K.lo7 - 0.1), { color: '#5DFF9A', dx: 130, dy: -130 }); }
  // 8: las láminas: imagen de la pared, del coche y de la cara; borrosa frente a nítida
  [[S.peelWall, 'PARED'], [S.peelCar, 'COCHE'], [S.peelFace, 'CARA']].forEach(([m, txt], i) => { if (!m.visible) return; _hv.copy(m.position); smallTag(proj(_hv), txt + ' · UNA IMAGEN', cw2(K.imagenes8 + 0.3 + i * 0.12, K.para8 + 0.1, 0.2, 0.2), i ? HC.white : HC.amber, 24); });
  if (S.blurHalf.visible) { smallTag({ x: 285, y: 640, ok: true }, 'IMAGEN PEQUEÑA: BORROSA', cw2(K.cerca8, K.voz9 - 0.3, 0.2, 0.2), HRd, 26);
    smallTag({ x: 795, y: 1250, ok: true }, 'IMAGEN GRANDE: NÍTIDA', cw2(K.cerca8 + 0.15, K.voz9 - 0.3, 0.2, 0.2), HGr, 26); }
  // 9: el sonido
  [[v3(HERO_PED.x, 0.13, HERO_PED.z), 'VOZ', K.voz9], [v3(HERO_CAR.x, 0.09, HERO_CAR.z), 'CANCIÓN', K.cancion9], [v3(0.43, 0.09, -0.2), 'RUIDO DE LA CALLE', K.ruido9]].forEach(([p, txt, t0]) => {
    if (!S.city.visible) return; _hv.copy(p); S.city.localToWorld(_hv); smallTag(proj(_hv), txt, cw2(t0 + 0.05, K.sonido9 - 0.05, 0.2, 0.2), HC.white, 24); });
  { _hv.set(0, PH.t + PIL.h * 0.55, PIL.d / 2); lab(_hv.clone(), 'SONIDO GUARDADO', 'DENTRO DE LA DESCARGA', cw2(K.sonido9 + 0.25, K.ciudad10 + 0.4), { color: HC.teal, dx: 140, dy: -100 }); }
  // 10: sin esperar
  if (S.racer.visible && S.city.visible) { _hv.copy(S.racer.position).add(v3(0, 0.08, 0)); S.city.localToWorld(_hv); smallTag(proj(_hv), 'SIN ESPERAR', cw2(K.cualquier10, K.respuesta11 - 0.2, 0.2, 0.2), HC.amber, 24); }
  // 11: no es un juego · es una ciudad · cada ladrillo
  if (S.pad.visible) { _hv.copy(S.pad.position).add(v3(0, -0.36, 0)); smallTag(proj(_hv), 'UN JUEGO', cw2(K.no11 + 0.2, K.te11b, 0.2, 0.2), HC.white, 26); }
  bigFig('UNA CIUDAD', 'CON CADA DETALLE YA HECHO', HC.amber, cw2(K.ciudad11 - 0.05, K.cada11 + 0.1, 0.2, 0.25), 1300);
  if (S.brick.visible) { _hv.copy(S.brick.position).add(v3(0, -0.07, 0)); smallTag(proj(_hv), 'CADA LADRILLO, PINTADO', cw2(K.ladrillo11, K.playstation12 - 0.25, 0.2, 0.2), HC.amber, 26); }
  // 12: ¿PlayStation o Xbox?
  pollPills(t, cw2(K.playstation12 - 0.05, END - 0.35, 0.35, 0.3));
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
  END = Math.ceil((lines[lines.length - 1].end + 1.25) * 2) / 2;          // ≈ 1,3 s de cola tras la última palabra
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    salido1: atL(1, 'salido'), cabria1: atL(1, 'cabria'), movil1: atL(1, 'movil'),
    por2: atL(2, 'por'), abrirlo2: atL(2, 'abrirlo'), final2: atL(2, 'final'), ocupa2: atL(2, 'ocupa'),
    rockstar3: atL(3, 'rockstar'), hasta3: atL(3, 'hasta'), n212_3: atL(3, '=212'), gigas3: atL(3, 'gigas'),
    n50000_4: atL(4, '=50000'), doble4: atL(4, 'doble'), red4: atL(4, 'red'),
    fibra5: atL(5, 'fibra'), n300_5: atL(5, '=300'), tardarias5: atL(5, 'tardarias'), hora5: atL(5, 'hora'),
    crees6: atL(6, 'crees'), codigo6: atL(6, 'codigo'), realidad6: atL(6, 'realidad'), menos6: atL(6, 'menos'),
    lo7: atL(7, '=lo'), ves7: atL(7, 'ves'), oyes7: atL(7, 'oyes'),
    pared8: atL(8, 'pared'), coche8: atL(8, 'coche'), cara8: atL(8, 'cara'), imagenes8: atL(8, 'imagenes'), enormes8: atL(8, 'enormes'), para8: atL(8, 'para'), cerca8: atL(8, 'cerca'), borrosa8: atL(8, 'borrosa'),
    voz9: atL(9, 'voz'), cancion9: atL(9, 'cancion'), ruido9: atL(9, 'ruido'), sonido9: atL(9, 'sonido'),
    ciudad10: atL(10, 'ciudad'), lista10: atL(10, 'lista'), cualquier10: atL(10, 'cualquier'), esperar10: atL(10, 'esperar'),
    respuesta11: atL(11, 'respuesta'), no11: atL(11, '=no'), juego11: atL(11, 'juego'), te11b: atL(11, '=te', 2), ciudad11: atL(11, 'ciudad'), cada11: atL(11, 'cada'), ladrillo11: atL(11, 'ladrillo'), pintado11: atL(11, 'pintado'),
    playstation12: atL(12, 'playstation'), haciendo12: atL(12, 'haciendo'),
  };
  mats(); buildMats(); buildCityMats(); buildRig();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.42; }
  scene.fog = new THREE.FogExp2(0x000000, 0.03);
  buildFlow(); buildFloor(); buildDevice(); buildCity(); buildPeels();
  buildTimes();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.TT = TT; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
