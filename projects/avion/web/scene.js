// «Por qué vuela un avión» (voz de Javi): ver 12_scene.js.
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
  S.flow = [];      // (sin polvo en suspensión: el aula está al aire libre)
  if (false) S.flow = [
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
// ---------------------------------------------------------------- «Por qué vuela un avión»: un aula en corte (sin techo ni pared delantera) en un campo,
// de día; la pizarra con el dibujo de siempre; un avión de pasajeros gigante (genérico: sin aerolínea ni logotipos) que pasa por encima;
// un túnel de viento en el aula con el ala en corte y su humo CALCULADO (ala de Joukowski con la condición de Kutta: el aire de arriba llega
// antes de verdad); un avión acrobático boca abajo; el aire empujado hacia abajo; la presión en colores; la estela del avión.
const ROOM = { w: 8, d: 6, h: 3.2 };                       // el aula: x ∈ [-4, 4], z ∈ [-3, 3]
const BOARD = { w: 4.2, h: 1.5, y: 1.65, z: -2.97 };       // la pizarra
const TUN = { x: 0.4, y: 1.55, z: 0.65, L: 4.0, H: 1.3, D: 1.0 };   // el túnel de viento (centro del ala)
const CHORD = 1.4;

// ---------------------------------------------------------------- el ala de Joukowski y su flujo (potencial, con Kutta)
const JK = { mu: { x: -0.09, y: 0.11 } };
JK.R = Math.hypot(1 - JK.mu.x, -JK.mu.y); JK.beta = Math.asin(JK.mu.y / JK.R);
const cadd = (a, b) => ({ x: a.x + b.x, y: a.y + b.y }), csub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const cmul = (a, b) => ({ x: a.x * b.x - a.y * b.y, y: a.x * b.y + a.y * b.x });
const cdiv = (a, b) => { const d = b.x * b.x + b.y * b.y; return { x: (a.x * b.x + a.y * b.y) / d, y: (a.y * b.x - a.x * b.y) / d }; };
const csqrt = a => { const r = Math.hypot(a.x, a.y), t = Math.atan2(a.y, a.x) / 2, s = Math.sqrt(r); return { x: s * Math.cos(t), y: s * Math.sin(t) }; };
const jk = z => cadd(z, cdiv({ x: 1, y: 0 }, z));                         // ζ → z
function jkInv(z) {                                                       // z → ζ (la rama de fuera del círculo)
  const s = csqrt(csub(cmul(z, z), { x: 4, y: 0 })), a = { x: (z.x + s.x) / 2, y: (z.y + s.y) / 2 }, b = { x: (z.x - s.x) / 2, y: (z.y - s.y) / 2 };
  return Math.hypot(a.x - JK.mu.x, a.y - JK.mu.y) >= Math.hypot(b.x - JK.mu.x, b.y - JK.mu.y) ? a : b;
}
function dwdzeta(zt, al) {                                                // velocidad compleja en el plano ζ (U = 1, ángulo de ataque al)
  const d = csub(zt, JK.mu), e1 = { x: Math.cos(al), y: -Math.sin(al) }, e2 = { x: Math.cos(al), y: Math.sin(al) };
  const G = 4 * Math.PI * JK.R * Math.sin(al + JK.beta);
  return cadd(csub(e1, cmul({ x: JK.R * JK.R, y: 0 }, cdiv(e2, cmul(d, d)))), cdiv({ x: 0, y: G / (2 * Math.PI) }, d));
}
function velZ(z, al) {                                                    // (u, v) en el plano del ala
  const zt = jkInv(z), A = dwdzeta(zt, al), B = csub({ x: 1, y: 0 }, cdiv({ x: 1, y: 0 }, cmul(zt, zt))), w = cdiv(A, B);
  return { x: w.x, y: -w.y, zt };
}
// trayectoria de una partícula (integración en ζ: dζ/dt = conj(dw/dζ) / |dz/dζ|²), muestreada cada dt
function jkPath(z0, al, T, dt) {
  let zt = jkInv(z0); const out = [];
  const f = p => { const A = dwdzeta(p, al), B = csub({ x: 1, y: 0 }, cdiv({ x: 1, y: 0 }, cmul(p, p))), b2 = B.x * B.x + B.y * B.y; return { x: A.x / Math.max(b2, 1e-6), y: -A.y / Math.max(b2, 1e-6) }; };
  const sub = 6, h = dt / sub;
  for (let k = 0; k <= T / dt; k++) {
    out.push(jk(zt));
    for (let s = 0; s < sub; s++) {
      const k1 = f(zt), k2 = f({ x: zt.x + k1.x * h / 2, y: zt.y + k1.y * h / 2 }), k3 = f({ x: zt.x + k2.x * h / 2, y: zt.y + k2.y * h / 2 }), k4 = f({ x: zt.x + k3.x * h, y: zt.y + k3.y * h });
      zt = { x: zt.x + h * (k1.x + 2 * k2.x + 2 * k3.x + k4.x) / 6, y: zt.y + h * (k1.y + 2 * k2.y + 2 * k3.y + k4.y) / 6 };
      const d = Math.hypot(zt.x - JK.mu.x, zt.y - JK.mu.y); if (d < JK.R * 1.003) { const s2 = JK.R * 1.003 / d; zt = { x: JK.mu.x + (zt.x - JK.mu.x) * s2, y: JK.mu.y + (zt.y - JK.mu.y) * s2 }; }
    }
  }
  return out;
}
// del plano del ala (cuerda ≈ 4) al mundo: girado -α (el viento llega horizontal y el ala se levanta α) y a escala
const JS = CHORD / 4.1;
function zWorld(z, al, out = new THREE.Vector3()) { const c = Math.cos(-al), s = Math.sin(-al); return out.set(TUN.x + JS * (z.x * c - z.y * s), TUN.y + JS * (z.x * s + z.y * c), TUN.z); }
function airfoilPts(n = 160) { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push(jk({ x: JK.mu.x + JK.R * Math.cos(a), y: JK.mu.y + JK.R * Math.sin(a) })); } return pts; }

// ---------------------------------------------------------------- texturas
// la pizarra en dos capas: el fondo (con el título, siempre) y el dibujo de tiza (el ala, los caminos, los rótulos), que se despega
// cuando el ala sale de la pizarra y vuelve a aparecer al final (bucle)
const BD = { cx: 1000, cy: 420, sc: 240, W: 2048, H: 732 };
BD.x0 = (BD.cx / BD.W - 0.5) * BOARD.w; BD.y0 = BOARD.y + (0.5 - BD.cy / BD.H) * BOARD.h; BD.k = BD.sc * BOARD.w / BD.W / JS;   // dónde está el ala de tiza y a qué escala
function boardBaseTex() {
  return canvasTex(BD.W, BD.H, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1e3a2b'); gr.addColorStop(1, '#183126'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.012 + hash(i) * 0.03})`; g.beginPath(); g.ellipse(hash(i * 2.1) * w, hash(i * 3.7) * h, 60 + hash(i * 5.3) * 200, 20 + hash(i * 7.1) * 60, hash(i) * 3, 0, 7); g.fill(); }
    g.font = '700 70px "Bebas"'; g.fillStyle = 'rgba(245,245,238,.85)'; g.fillText('¿POR QUÉ VUELA UN AVIÓN?', 90, 110);
  });
}
function boardDrawTex() {
  return canvasTex(BD.W, BD.H, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const chalk = (draw, lw = 6, col = 'rgba(245,245,238,') => { for (let k = 0; k < 3; k++) { g.strokeStyle = col + (0.35 + k * 0.2) + ')'; g.lineWidth = lw - k * 1.5; g.lineCap = 'round'; g.lineJoin = 'round'; g.save(); g.translate((hash(k * 3.3) - 0.5) * 2.5, (hash(k * 5.1) - 0.5) * 2.5); draw(); g.restore(); } };
    // el perfil del ala
    const P = airfoilPts(120), cx = BD.cx, cy = BD.cy, sc = BD.sc;
    chalk(() => { g.beginPath(); P.forEach((p, i) => { const x = cx + p.x * sc, y = cy - p.y * sc; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); }, 7);
    // los dos caminos «a la vez»
    g.setLineDash([22, 18]);
    chalk(() => { g.beginPath(); g.moveTo(cx - 640, cy - 10); g.lineTo(cx - 520, cy - 10); g.bezierCurveTo(cx - 420, cy - 210, cx + 280, cy - 170, cx + 560, cy - 30); g.stroke(); }, 5, 'rgba(255,214,120,');
    chalk(() => { g.beginPath(); g.moveTo(cx - 640, cy + 10); g.lineTo(cx - 520, cy + 10); g.bezierCurveTo(cx - 380, cy + 110, cx + 260, cy + 90, cx + 560, cy + 10); g.stroke(); }, 5, 'rgba(140,210,255,');
    g.setLineDash([]);
    g.font = '700 54px "Bebas"'; g.fillStyle = 'rgba(255,214,120,.9)'; g.fillText('A: MÁS CAMINO', cx - 300, cy - 200);
    g.fillStyle = 'rgba(140,210,255,.9)'; g.fillText('B', cx - 300, cy + 150);
    g.fillStyle = 'rgba(245,245,238,.9)'; g.font = '700 62px "Bebas"'; g.fillText('¡LLEGAN A LA VEZ!', cx + 470, cy - 70);
    g.font = '700 58px "Bebas"'; g.fillText('→ VA MÁS RÁPIDO → MENOS PRESIÓN', 110, h - 70);
  });
}
function crossTex() {                                       // la equis roja de rotulador encima del dibujo
  return canvasTex(1024, 366, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#ff3b3b'; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { g.lineWidth = 26 - k * 6; g.globalAlpha = 0.55 + k * 0.2; g.beginPath(); g.moveTo(160 + k * 3, 50); g.lineTo(860, 320 - k * 2); g.moveTo(860 - k * 2, 46); g.lineTo(170, 318); g.stroke(); } });
}
function skyDome() {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = clamp(vP.y, -0.2, 1.0); vec3 top = vec3(0.07, 0.27, 0.74), hor = vec3(0.70, 0.84, 1.0), low = vec3(0.62, 0.74, 0.86); vec3 c = h > 0. ? mix(hor, top, pow(h, 0.42)) : mix(hor, low, -h * 5.); gl_FragColor = vec4(c * 1.08, 1.); }' });
  const s = new THREE.Mesh(new THREE.SphereGeometry(380, 32, 16), m); s.renderOrder = -2; return s;
}
function cloudTex(seed) {
  return canvasTex(512, 256, (g, w, h) => { g.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const x = w * (0.18 + hash(i * 3.1 + seed) * 0.64), y = h * (0.45 + hash(i * 5.3 + seed) * 0.25), r = 40 + hash(i * 7.7 + seed) * 70;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } });
}
function grassTex() {
  const t = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#6fa64a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '40,90,30' : '150,200,90'},${0.08 + hash(i * 3.3) * 0.12})`; g.fillRect(hash(i * 1.7) * w, hash(i * 2.9) * h, 3, 7); } });
  return repTex(t, 40, 40);
}
function pressureTex(al) {                                  // presión alrededor del ala (Cp): azul donde baja, rojo donde sube
  const W2 = 640, H2 = 320, X0 = -2.2, X1 = 2.4, Y0 = -1.15, Y1 = 1.15;   // en metros, respecto al centro del ala
  return canvasTex(W2, H2, (g) => {
    const img = g.createImageData(W2, H2), poly = airfoilPts(200);
    for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
      const X = X0 + (X1 - X0) * i / (W2 - 1), Y = Y1 - (Y1 - Y0) * j / (H2 - 1);
      const c = Math.cos(al), s = Math.sin(al), zx = (X * c - Y * s) / JS, zy = (X * s + Y * c) / JS;      // deshace el giro -α
      let inside = false; for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) { const pa = poly[a], pb = poly[b]; if ((pa.y > zy) !== (pb.y > zy) && zx < (pb.x - pa.x) * (zy - pa.y) / (pb.y - pa.y) + pa.x) inside = !inside; }
      const k = (j * W2 + i) * 4; if (inside) { img.data[k + 3] = 0; continue; }
      const v = velZ({ x: zx, y: zy }, al), cp = 1 - (v.x * v.x + v.y * v.y), q = cp > 0 ? Math.min(1, cp / 0.55) : Math.max(-1, cp / 1.6);
      const r = q > 0 ? 255 : 255 * (1 + q * 0.75), gg = q > 0 ? 255 * (1 - q * 0.75) : 255 * (1 + q * 0.45), bb = q > 0 ? 255 * (1 - q * 0.85) : 255;
      const fall = Math.min(1, Math.max(0, 1.25 - Math.hypot(X / 2.2, Y / 1.1)));
      img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = bb; img.data[k + 3] = 255 * Math.min(1, Math.abs(q) * 1.4) * fall * 0.85;
    }
    g.putImageData(img, 0, 0);
  });
}

// ---------------------------------------------------------------- materiales
function buildSceneMats() {
  M.wall = new THREE.MeshStandardMaterial({ color: 0xf1e9da, roughness: 0.9 });
  M.wall2 = new THREE.MeshStandardMaterial({ color: 0xcfe1d8, roughness: 0.9 });
  M.board = new THREE.MeshStandardMaterial({ map: boardBaseTex(), roughness: 0.95 });
  M.boardDraw = new THREE.MeshStandardMaterial({ map: boardDrawTex(), roughness: 0.95, transparent: true, depthWrite: false });
  M.boardFrame = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.6 });
  M.cross = new THREE.MeshBasicMaterial({ map: crossTex(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  M.deskTop = M.wood; M.leg = metal(0x9aa3ad, 0.4); M.chair = plastic(0x3c7bd6, 0.4);
  M.grass = new THREE.MeshStandardMaterial({ map: grassTex(), roughness: 0.95 });
  { const t = canvasTex(1024, 1024, (g, w, h) => { const img = g.createImageData(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const n = 0.55 * fbm(i / 22, j / 22, 4) + 0.45 * vnoise(i / 3.5, j / 3.5), v = 255 * (0.74 + 0.26 * n), k = (j * w + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255; } g.putImageData(img, 0, 0); });
    t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16;
    M.land = new THREE.MeshStandardMaterial({ vertexColors: true, map: t, roughness: 0.97, metalness: 0, envMapIntensity: 0.6 }); }
  M.plane = paint(0xf4f6f9, 0.28); M.belly = paint(0xdfe5ec, 0.32); M.tail = paint(0x1b3a6b, 0.3); M.stripe = paint(0x24b3c4, 0.3);
  M.engine = metal(0xb9c0c8, 0.3); M.fan = new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.4, metalness: 0.6 });
  M.win = new THREE.MeshStandardMaterial({ color: 0x0f1724, roughness: 0.15, metalness: 0.5 });
  M.acro = paint(0xe8322f, 0.25); M.acro2 = paint(0xf6f6f6, 0.25);
  M.foil = new THREE.MeshPhysicalMaterial({ color: 0xe9edf2, roughness: 0.25, metalness: 0.3, clearcoat: 1 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.035, roughness: 0.05, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  M.tunBack = new THREE.MeshBasicMaterial({ color: 0x040507, transparent: true, opacity: 1, toneMapped: false });
  M.smoke = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(1.2), transparent: true, opacity: 0.9, toneMapped: false });
  M.balA = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb13b).multiplyScalar(1.6), toneMapped: false });
  M.balB = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x46b8ff).multiplyScalar(1.6), toneMapped: false });
  M.block = new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = 'rgba(190,232,255,.38)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(40,130,255,1)'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12); g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 4; g.strokeRect(13, 13, w - 26, h - 26); }),
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  M.wake = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd8f2ff).multiplyScalar(1.3), transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false });
  M.arrUp = new THREE.MeshPhysicalMaterial({ color: 0xff9a2e, roughness: 0.3, clearcoat: 1, emissive: 0x6a2a00, emissiveIntensity: 0.6 });
  M.arrDn = new THREE.MeshPhysicalMaterial({ color: 0x3aa8ff, roughness: 0.3, clearcoat: 1, emissive: 0x00305a, emissiveIntensity: 0.6 });
}

// ---------------------------------------------------------------- piezas
function desk() {
  const g = new THREE.Group(); g.add(at(mesh(new THREE.BoxGeometry(1.1, 0.04, 0.55), M.deskTop), 0, 0.74, 0));
  for (const [x, z] of [[-0.5, -0.22], [0.5, -0.22], [-0.5, 0.22], [0.5, 0.22]]) g.add(at(mesh(new THREE.BoxGeometry(0.035, 0.72, 0.035), M.leg), x, 0.36, z));
  const ch = new THREE.Group(); ch.add(at(mesh(new THREE.BoxGeometry(0.42, 0.04, 0.4), M.chair), 0, 0.45, 0)); ch.add(at(mesh(new THREE.BoxGeometry(0.42, 0.36, 0.035), M.chair), 0, 0.66, 0.2));
  for (const [x, z] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) ch.add(at(mesh(new THREE.BoxGeometry(0.025, 0.45, 0.025), M.leg), x, 0.225, z));
  ch.position.set(0, 0, 0.55); g.add(ch); return g;
}
function airliner() {                                       // avión de pasajeros de dos pisos, genérico: 46 m de largo
  const g = new THREE.Group(), L = 46, R0 = 3.0;
  const prof = []; for (let i = 0; i <= 40; i++) { const u = i / 40, x = u * L; let r;
    if (u < 0.1) r = R0 * Math.sqrt(1 - Math.pow(1 - u / 0.1, 2)); else if (u < 0.72) r = R0; else r = R0 * (1 - Math.pow((u - 0.72) / 0.28, 1.6) * 0.86); prof.push(new THREE.Vector2(Math.max(0.05, r), x)); }
  prof[0].x = 0.001; prof[prof.length - 1].x = 0.3;
  const fus = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), M.plane); fus.rotation.z = -Math.PI / 2; fus.position.x = -L / 2; fus.scale.set(1, 1, 1); fus.castShadow = true;
  const F = new THREE.Group(); F.add(fus); F.scale.set(1, 1.18, 1); g.add(F);
  // la cola sube (el cono de cola) y la panza más clara
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(R0 * 0.985, R0 * 0.985, L * 0.6, 40, 1, true, Math.PI * 0.7, Math.PI * 0.6), M.belly); belly.rotation.z = Math.PI / 2; belly.position.set(-L * 0.08, 0, 0); F.add(belly);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(R0 * 1.004, R0 * 1.004, L * 0.62, 40, 1, true, Math.PI * 0.46, Math.PI * 0.035), M.stripe); st.rotation.z = Math.PI / 2; st.position.set(-L * 0.07, 0, 0); F.add(st);
  const st2 = st.clone(); st2.rotation.x = Math.PI; F.add(st2);
  // ventanillas: dos pisos, a los dos lados
  const wg = new THREE.BoxGeometry(0.32, 0.42, 0.06), N = 46, wins = new THREE.InstancedMesh(wg, M.win, N * 4); let k = 0;
  for (const side of [-1, 1]) for (const deck of [0, 1]) for (let i = 0; i < N; i++) { const x = -L / 2 + L * 0.13 + i * (L * 0.56 / N);
    _o.position.set(x, deck ? 1.35 : -0.25, side * (R0 - 0.02)); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); _o.updateMatrix(); wins.setMatrixAt(k++, _o.matrix); }
  F.add(wins);
  const ck = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 3.0), M.win); ck.position.set(-L / 2 + 2.6, 1.5, 0); ck.rotation.z = -0.35; F.add(ck);
  // alas en flecha (planta extruida, con diedro)
  const wing = (side) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(9.5, 28); s.lineTo(13, 28); s.lineTo(14.5, 0); s.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelSegments: 2 }); geo.rotateX(Math.PI / 2); geo.translate(0, 0.27, 0);
    const m = new THREE.Mesh(geo, M.plane); m.castShadow = true; m.scale.z = side; m.position.set(-5, -1.6, 0); m.rotation.x = -side * 0.09; return m; };
  S.wings = [wing(1), wing(-1)]; S.wings.forEach(w => g.add(w));
  // motores
  for (const side of [-1, 1]) for (const f of [0.33, 0.64]) { const z = side * 28 * f, x = -5 + 9.5 * f - 1.0;
    const n = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.05, 5.2, 28), M.engine); n.rotation.z = Math.PI / 2; n.position.set(x - 1.5, -3.75 + 0.0899 * Math.abs(z), z); n.castShadow = true; g.add(n);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(1.15, 28), M.fan); fan.rotation.y = -Math.PI / 2; fan.position.set(x - 4.12, n.position.y, z); g.add(fan); fan.position.x = n.position.x - 2.62;
    const py = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 0.3), M.plane); py.position.set(x - 0.4, n.position.y + 1.3, z); g.add(py); }
  // cola: deriva y estabilizadores
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(6.5, 10.5); fin.lineTo(10, 10.5); fin.lineTo(10.5, 0); fin.lineTo(0, 0);
  const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.45, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.15, bevelSegments: 2 }); fg.translate(0, 0, -0.22);
  const fm = new THREE.Mesh(fg, M.tail); fm.position.set(L / 2 - 12, 2.2, 0); fm.castShadow = true; g.add(fm);
  for (const side of [-1, 1]) { const hs = new THREE.Shape(); hs.moveTo(0, 0); hs.lineTo(4.5, 9); hs.lineTo(6.8, 9); hs.lineTo(7.5, 0);
    const hg2 = new THREE.ExtrudeGeometry(hs, { depth: 0.35, bevelEnabled: false }); hg2.rotateX(Math.PI / 2); const h = new THREE.Mesh(hg2, M.plane); h.scale.z = side; h.position.set(L / 2 - 9.5, 1.1, 0); h.castShadow = true; g.add(h); }
  // puntas de ala (aletas arriba y abajo), carenado de la panza, carenados de los flaps y toberas de los motores
  for (const side of [-1, 1]) { const tip = new THREE.Shape(); tip.moveTo(0, -1.0); tip.lineTo(2.6, -0.4); tip.lineTo(3.4, 2.4); tip.lineTo(2.4, 2.4); tip.lineTo(0.2, 0.3); tip.lineTo(0, -1.0);
    const tg = new THREE.ExtrudeGeometry(tip, { depth: 0.12, bevelEnabled: false }); const tm = new THREE.Mesh(tg, M.plane); tm.position.set(-5 + 9.6, -1.6 + 28 * Math.sin(0.09), side * 28.05); g.add(tm);
    for (const f of [0.22, 0.45, 0.68]) { const fz = side * 28 * f, fx = -5 + 9.5 * f + lerp(14.5, 3.5, f) * 0.78; const ft = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 3.6, 4, 10), M.belly); ft.rotation.z = Math.PI / 2; ft.position.set(fx, -1.95 + 0.0899 * Math.abs(fz), fz); g.add(ft); } }
  { const bf = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), M.belly); bf.scale.set(13, 1.6, 3.4); bf.position.set(1.8, -3.0, 0); g.add(bf); }
  g.children.slice().forEach(o => { if (o.isMesh && o.material === M.engine) { const nz = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.6, 20), M.fan); nz.rotation.z = Math.PI / 2; nz.position.set(o.position.x + 3.2, o.position.y, o.position.z); g.add(nz); } });
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.L = L; return g;
}
function acroPlane() {                                      // avioneta acrobática roja (genérica)
  const g = new THREE.Group(), prof = [];
  for (let i = 0; i <= 20; i++) { const u = i / 20; prof.push(new THREE.Vector2(Math.max(0.02, 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * 0.55)), u * 7)); }
  prof[0].x = 0.001;
  const f = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), M.acro); f.rotation.z = -Math.PI / 2; f.position.x = -3.5; f.castShadow = true; g.add(f);
  g.add(at(mesh(new THREE.BoxGeometry(1.5, 0.14, 8.5), M.acro2), -1.2, -0.15, 0));
  g.add(at(mesh(new THREE.BoxGeometry(0.9, 0.08, 3.0), M.acro2), 3.0, 0.2, 0));
  g.add(at(mesh(new THREE.BoxGeometry(1.2, 1.3, 0.08), M.acro), 3.2, 0.75, 0));
  const can = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.win); can.scale.set(1.6, 0.8, 0.8); can.position.set(-0.6, 0.35, 0); g.add(can);
  for (const z of [-0.95, 0.95]) { g.add(bar(v3(-1.6, -0.2, z * 0.35), v3(-1.75, -1.25, z), 0.06, M.leg)); const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 20), MAT.rubber); wh.rotation.x = Math.PI / 2; wh.position.set(-1.75, -1.3, z); g.add(wh); }
  g.add(bar(v3(3.2, 0.0, 0), v3(3.45, -0.45, 0), 0.04, M.leg)); { const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 14), MAT.rubber); tw.rotation.x = Math.PI / 2; tw.position.set(3.45, -0.5, 0); g.add(tw); }
  g.add(at(mesh(new THREE.BoxGeometry(1.52, 0.02, 8.52), M.acro), -1.2, -0.07, 0));      // franja roja por encima del ala blanca
  S.prop = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })); S.prop.rotation.y = Math.PI / 2; S.prop.position.x = -3.6; g.add(S.prop);
  return g;
}

// ---------------------------------------------------------------- montaje
function buildWorld() {
  S.sky = skyLand(); scene.add(S.sky);
  const grd = new THREE.Mesh(new THREE.PlaneGeometry(440, 440), M.grass); grd.rotation.x = -Math.PI / 2; grd.position.y = -0.01; grd.receiveShadow = true; scene.add(grd);
  S.clouds = [];
  // el aula
  const C = new THREE.Group(); scene.add(C); S.room = C;
  const fl = mesh(new THREE.BoxGeometry(ROOM.w, 0.12, ROOM.d), M.wood); fl.position.y = -0.06; C.add(fl);
  C.add(at(mesh(new THREE.BoxGeometry(ROOM.w + 0.3, ROOM.h, 0.22), M.wall), 0, ROOM.h / 2, -ROOM.d / 2 - 0.11));
  C.add(at(mesh(new THREE.BoxGeometry(ROOM.w + 0.3, 0.9, 0.04), M.wall2), 0, 0.45, -ROOM.d / 2 + 0.01));
  for (const sx of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(0.22, ROOM.h, ROOM.d + 0.22), M.wall); w.position.set(sx * (ROOM.w / 2 + 0.11), ROOM.h / 2, 0); C.add(w); }
  // ventana en la pared izquierda (hueco con marco y cristal)
  const win = new THREE.Group(); win.position.set(-ROOM.w / 2 + 0.005, 1.75, -0.2);
  win.add(at(mesh(new THREE.BoxGeometry(0.04, 1.3, 2.2), new THREE.MeshPhysicalMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.35, roughness: 0.05 })), 0.02, 0, 0));
  for (const z of [-1.1, 0, 1.1]) win.add(at(mesh(new THREE.BoxGeometry(0.08, 1.36, 0.06), M.boardFrame), 0.04, 0, z));
  for (const y of [-0.65, 0.65]) win.add(at(mesh(new THREE.BoxGeometry(0.08, 0.06, 2.26), M.boardFrame), 0.04, y, 0));
  C.add(win);
  // la pizarra, su marco, la tiza y la equis roja
  const bd = mesh(new THREE.PlaneGeometry(BOARD.w, BOARD.h), M.board); bd.position.set(0, BOARD.y, BOARD.z); C.add(bd); S.board = bd;
  S.boardDraw = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w, BOARD.h), M.boardDraw); S.boardDraw.position.set(0, BOARD.y, BOARD.z + 0.006); S.boardDraw.renderOrder = 3; C.add(S.boardDraw);
  for (const [w2, h2, x, y] of [[BOARD.w + 0.16, 0.08, 0, BOARD.y + BOARD.h / 2 + 0.04], [BOARD.w + 0.16, 0.08, 0, BOARD.y - BOARD.h / 2 - 0.04], [0.08, BOARD.h, -BOARD.w / 2 - 0.04, BOARD.y], [0.08, BOARD.h, BOARD.w / 2 + 0.04, BOARD.y]])
    C.add(at(mesh(new THREE.BoxGeometry(w2, h2, 0.05), M.boardFrame), x, y, BOARD.z + 0.01));
  C.add(at(mesh(new THREE.BoxGeometry(BOARD.w, 0.04, 0.1), M.boardFrame), 0, BOARD.y - BOARD.h / 2 - 0.08, BOARD.z + 0.06));
  S.cross = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w * 0.86, BOARD.h * 0.86), M.cross); S.cross.position.set(0.15, BOARD.y, BOARD.z + 0.012); S.cross.renderOrder = 4; C.add(S.cross);
  // reloj de pared
  const clk = new THREE.Group(); clk.position.set(2.9, 2.55, BOARD.z + 0.02); C.add(clk);
  clk.add(new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })));
  clk.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 8, 32), M.leg), 0, 0, 0.005));
  S.clockH = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.12, 0.01), M.fan); S.clockH.geometry.translate(0, 0.06, 0); S.clockH.position.z = 0.01; clk.add(S.clockH);
  S.clockM = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.18, 0.01), M.fan); S.clockM.geometry.translate(0, 0.09, 0); S.clockM.position.z = 0.012; clk.add(S.clockM);
  // pupitres (3 filas × 4) y la mesa del profe
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { if (r === 1 && c >= 1) continue; const d = desk(); d.position.set(-2.55 + c * 1.7, 0, -0.6 + r * 1.45); C.add(d); }
  const td = new THREE.Group(); td.position.set(-2.6, 0, -2.0); td.add(at(mesh(new THREE.BoxGeometry(1.6, 0.06, 0.8), M.wood), 0, 0.76, 0)); td.add(at(mesh(new THREE.BoxGeometry(1.5, 0.7, 0.7), M.woodD), 0, 0.37, 0)); C.add(td);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), new THREE.MeshStandardMaterial({ color: 0x3f8fd6, roughness: 0.4 })); globe.position.set(-2.1, 1.02, -2.0); C.add(globe);
  C.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.1, 16), M.leg), -2.1, 0.84, -2.0));
  // el avión gigante y la avioneta
  S.big = airliner(); scene.add(S.big);
  S.acro = acroPlane(); scene.add(S.acro);
  S.acroSmoke = new THREE.InstancedMesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.85, depthWrite: false }), 260); scene.add(S.acroSmoke);
  // los efectos del cielo: bloques de aire, estela, presión alrededor del avión
  S.blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(5.5, 5.5, 5.5), M.block, 140); S.blocks.renderOrder = 2; scene.add(S.blocks);
  // «la diferencia lo levanta»: flechas naranjas debajo del avión
  S.liftArrows = [0, 1, 2].map(() => { const a = arrow3(14, M.arrUp, 0.9); scene.add(a); return a; });
  S.wake = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 8, 6), M.wake, 1400); scene.add(S.wake);
  // presión alrededor del avión: halo azul encima de las alas (baja) y rojo debajo (alta), siempre de cara a la cámara
  const halo = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  S.lowP = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0x1f6dff, transparent: true, depthWrite: false, opacity: 0, fog: false }));
  S.highP = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xff3d1f, transparent: true, depthWrite: false, opacity: 0, fog: false }));
  S.lowP.material.blending = THREE.AdditiveBlending; scene.add(S.lowP, S.highP);
}
function buildTunnel() {
  const T = new THREE.Group(); scene.add(T); S.tunnel = T;
  // mesas debajo y la caja de cristal con sus aristas
  T.add(at(mesh(new THREE.BoxGeometry(TUN.L + 0.3, 0.06, TUN.D + 0.3), M.wood), TUN.x + 0.2, TUN.y - TUN.H / 2 - 0.04, TUN.z));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) T.add(at(mesh(new THREE.BoxGeometry(0.06, TUN.y - TUN.H / 2 - 0.07, 0.06), M.leg), TUN.x + 0.2 + x * (TUN.L / 2 - 0.05), (TUN.y - TUN.H / 2 - 0.07) / 2, TUN.z + z * (TUN.D / 2 - 0.05)));
  const box = new THREE.Mesh(new THREE.BoxGeometry(TUN.L, TUN.H, TUN.D), M.glass); box.position.set(TUN.x + 0.2, TUN.y, TUN.z); T.add(box); edges(box, 0xcfefff, 1.6, 28, 0.9); S.tunBox = box;
  S.tunBack = new THREE.Mesh(new THREE.PlaneGeometry(TUN.L - 0.02, TUN.H - 0.02), M.tunBack); S.tunBack.position.set(TUN.x + 0.2, TUN.y, TUN.z - TUN.D / 2 + 0.012); T.add(S.tunBack);
  S.tunFloor = new THREE.Mesh(new THREE.PlaneGeometry(TUN.L - 0.02, TUN.D - 0.02), M.tunBack); S.tunFloor.rotation.x = -Math.PI / 2; S.tunFloor.position.set(TUN.x + 0.2, TUN.y - TUN.H / 2 + 0.012, TUN.z); T.add(S.tunFloor);
  const fanG = new THREE.Group(); fanG.position.set(TUN.x + 0.2 - TUN.L / 2 - 0.05, TUN.y, TUN.z); T.add(fanG);
  fanG.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 10, 40), M.leg), 0, 0, 0, Math.PI / 2));
  S.fanBlades = new THREE.Group(); fanG.add(S.fanBlades);
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.1), M.fan); b.geometry.translate(0, 0.22, 0); b.rotation.x = i / 6 * Math.PI * 2; S.fanBlades.add(b); }
  // el ala (perfil de Joukowski extruido a lo ancho del túnel)
  const P = airfoilPts(160), sh = new THREE.Shape(); P.forEach((p, i) => i ? sh.lineTo(p.x * JS, p.y * JS) : sh.moveTo(p.x * JS, p.y * JS));
  const fg = new THREE.ExtrudeGeometry(sh, { depth: TUN.D * 0.96, bevelEnabled: false, curveSegments: 1 }); fg.translate(0, 0, -TUN.D * 0.48);
  S.foil = new THREE.Mesh(fg, M.foil); S.foil.castShadow = true; S.foil.position.set(TUN.x, TUN.y, TUN.z); T.add(S.foil);
  // el flujo calculado: líneas de corriente con 3° y con 9°, pulsos de humo, las dos bolitas
  S.AL0 = 3 * Math.PI / 180; S.AL1 = 9 * Math.PI / 180;
  const NL = 21, NP = 160, seeds = []; for (let i = 0; i < NL; i++) seeds.push(-1.7 + 3.4 * i / (NL - 1));
  const lineSet = al => seeds.map(y0 => { const raw = jkPath({ x: -6.2, y: y0 }, al, 15, 0.025);
    const pts = raw.map(z => zWorld(z, al)).filter(p => p.x <= TUN.x + 0.2 + TUN.L / 2 - 0.02 && p.x >= TUN.x + 0.2 - TUN.L / 2 + 0.02);
    const out = []; for (let k = 0; k < NP; k++) out.push(pts[Math.min(pts.length - 1, Math.round(k / (NP - 1) * (pts.length - 1)))].clone()); return out; });
  S.lines0 = lineSet(S.AL0); S.lines1 = lineSet(S.AL1);
  S.slMat = lineMat(0xf2f8ff, 2.0, 0.0);
  S.slines = S.lines0.map(pts => { const l = polyline(pts, S.slMat); T.add(l); return l; });
  // pulsos de humo (como en el túnel de Cambridge): 4 pulsos de 34 partículas soltadas a la vez
  S.pulseN = 34; S.pulses = [];
  for (let k = 0; k < 4; k++) for (let i = 0; i < S.pulseN; i++) { const y0 = -1.5 + 3.0 * i / (S.pulseN - 1); S.pulses.push({ k, y0, path: jkPath({ x: -4.2, y: y0 }, S.AL0, 12, 0.03) }); }
  S.smoke = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 8, 6), M.smoke, S.pulses.length); T.add(S.smoke);
  S.pulses1 = []; for (let k = 0; k < 4; k++) for (let i = 0; i < S.pulseN; i++) { const y0 = -1.5 + 3.0 * i / (S.pulseN - 1); S.pulses1.push({ k, y0, path: jkPath({ x: -4.2, y: y0 }, S.AL1, 12, 0.03) }); }
  S.smoke1 = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 8, 6), M.smoke, S.pulses1.length); T.add(S.smoke1);
  // las dos bolitas: la de arriba y la de abajo de la línea que se divide en el borde de ataque
  const Y0 = -0.5197;                                                   // línea que se divide en el borde de ataque (calculada con 3°)
  S.pA = jkPath({ x: -4.2, y: Y0 + 0.04 }, S.AL0, 12, 0.03); S.pB = jkPath({ x: -4.2, y: Y0 - 0.04 }, S.AL0, 12, 0.03);
  S.ballA = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), M.balA); S.ballB = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), M.balB); T.add(S.ballA, S.ballB);
  // el contorno del perfil (para el «mito»: las bolitas van pegadas al ala y llegan a la vez)
  const n = P.length, iTE = P.reduce((b, p, i) => p.x > P[b].x ? i : b, 0), iLE = P.reduce((b, p, i) => p.x < P[b].x ? i : b, 0);
  const walk = (a, b, dir) => { const o = []; for (let i = a; ; i = (i + dir + n) % n) { o.push(P[i]); if (i === b) break; } return o; };
  const up = walk(iLE, iTE, -1), dn = walk(iLE, iTE, 1); S.upPath = up.reduce((s, p) => s + (p.y > JK.mu.y ? 1 : 0), 0) > up.length / 2 ? up : dn; S.dnPath = S.upPath === up ? dn : up;
  // la cara de arriba, para iluminarla en «curva por arriba»
  S.upPts = S.upPath.map(p => zWorld(p, S.AL0).add(v3(0, 0, TUN.D * 0.485))); S.upLineMat = lineMat(0xffc24a, 6, 1); S.upLine = polyline(S.upPts, S.upLineMat); S.upLine.renderOrder = 6; T.add(S.upLine);
  // la presión (con 9°) en un panel delante del ala, y las flechas
  S.press = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), new THREE.MeshBasicMaterial({ map: pressureTex(S.AL1), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  S.press.position.set(TUN.x + 0.1, TUN.y, TUN.z + TUN.D * 0.49); S.press.renderOrder = 5; T.add(S.press);
  S.arrUp = arrow3(0.5, M.arrUp, 0.055); S.arrDn = arrow3(0.5, M.arrDn, 0.055); S.arrDn.rotation.z = Math.PI; T.add(S.arrUp, S.arrDn);
  S.arrUp.position.set(TUN.x - 0.05, TUN.y + 0.1, TUN.z + 0.25); S.arrDn.position.set(TUN.x + 1.12, TUN.y + 0.02, TUN.z + 0.25);
  // la carrera: la línea de meta en el borde de salida y el rastro de cada bolita
  const TEz = S.upPath[S.upPath.length - 1]; S.teX = zWorld(TEz, S.AL0).x; S.teY = zWorld(TEz, S.AL0).y;
  S.finMat = lineMat(0xffffff, 3, 0.9, true); S.finMat.dashSize = 0.045; S.finMat.gapSize = 0.035;
  S.finish = polyline([v3(S.teX, TUN.y - 0.6, TUN.z + TUN.D * 0.5 + 0.01), v3(S.teX, TUN.y + 0.6, TUN.z + TUN.D * 0.5 + 0.01)], S.finMat); S.finish.renderOrder = 6; T.add(S.finish);
  const endX = TUN.x + 0.2 + TUN.L / 2 - 0.05, trail = (path, col) => { const pts = []; for (const z of path) { const p = zWorld(z, S.AL0).add(v3(0, 0, TUN.D * 0.5)); if (p.x > endX) break; pts.push(p); } const m = lineMat(col, 3.5, 0.75); const l = polyline(pts, m); l.renderOrder = 5; T.add(l); l.userData.n = pts.length; l.userData.m = m; return l; };
  S.trailA = trail(S.pA, 0xffb13b); S.trailB = trail(S.pB, 0x46b8ff);
  const cross = path => { for (let i = 1; i < path.length; i++) { const a = zWorld(path[i - 1], S.AL0).x, b = zWorld(path[i], S.AL0).x; if (a < S.teX && b >= S.teX) return (i - 1 + (S.teX - a) / (b - a)) * 0.03; } return 99; };
  S.tauA = cross(S.pA); S.tauB = cross(S.pB);
  // la corriente que sale del borde de salida con el ala inclinada (9°): hacia abajo (para la flecha «aire hacia abajo»)
  { const al = S.AL1, c = Math.cos(al), sn = Math.sin(al), rot = (p, a) => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
    let Wp = rot(TEz, -al); Wp = { x: Wp.x + 0.1, y: Wp.y - 0.02 }; S.dnFlow = [];
    for (let i = 0; i < 80; i++) { S.dnFlow.push(v3(TUN.x + JS * Wp.x, TUN.y + JS * Wp.y, TUN.z + TUN.D * 0.5 + 0.02));
      const v = velZ(rot(Wp, al), al), w = rot(v, -al), L = Math.hypot(w.x, w.y) || 1; Wp = { x: Wp.x + w.x / L * 0.05, y: Wp.y + w.y / L * 0.05 }; } }
}
// ---------------------------------------------------------------- el mundo realista: un valle verde con montañas, río y pueblos; nubes (con su sombra en el
// suelo), nubes grises al fondo, pájaros y el cielo. El aula está en el prado del fondo del valle (el origen); el avión vuela muy por encima.
const SUN = new THREE.Vector3(0.76, 0.63, 0.15).normalize();     // hacia el sol: ≈ 39° de altura, por detrás del avión (su sombra cae delante)
const HAZE = new THREE.Color().setRGB(0.72, 0.82, 0.95);          // color de la bruma del horizonte (lineal): cielo y niebla iguales
const LAND = { cx: -3500, cz: 0, size: 22000, n: 520, outer: 90000, no: 150 };
function _h2(i, j) { let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y) { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = _h2(i, j), b = _h2(i + 1, j), c = _h2(i, j + 1), d = _h2(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, o = 5) { let s = 0, a = 0.5, f = 1, n = 0; for (let k = 0; k < o; k++) { s += a * vnoise(x * f + k * 17.3, y * f - k * 9.1); n += a; a *= 0.5; f *= 2.03; } return s / n; }
function ridged(x, y, o = 6) { let s = 0, a = 0.5, f = 1, n = 0, w = 1; for (let k = 0; k < o; k++) { let r = 1 - Math.abs(vnoise(x * f + k * 31.7, y * f + k * 11.3) * 2 - 1); r *= r; s += a * r * w; w = clamp(r * 1.7); n += a; a *= 0.5; f *= 2.1; } return s / n; }
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function valleyZ(x) { return 900 * Math.sin(x / 4200) + 480 * Math.sin(x / 1700 + 1.3); }
function landH(x, z) {
  const zc = valleyZ(x), d = Math.abs(z - zc), dr = Math.abs(z - zc - 18 * Math.sin(x / 230)), wall = sstep(650, 4300, d);
  const mtn = 1500 * ridged(x / 4600, z / 4600) + 420 * fbm(x / 1700 + 7, z / 1700, 4);
  const hills = 46 * fbm(x / 900, z / 900, 3);                        // el fondo del valle: lomas suaves (nunca por debajo del río)
  let h = wall * (mtn + 150 * wall) + (1 - wall) * hills;
  h = Math.min(h, -7 + 24 * Math.pow(dr / 70, 2));                   // el cauce del río
  const r = Math.hypot(x, z), flat = sstep(230, 900, r);              // el prado del colegio: llano
  return h * flat - 0.06 * (1 - flat);
}
const _lin = (r, g, b) => [Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)];
const LC = { f1: _lin(0.37, 0.52, 0.22), f2: _lin(0.45, 0.56, 0.27), f3: _lin(0.56, 0.56, 0.33), f4: _lin(0.30, 0.45, 0.19), f5: _lin(0.47, 0.43, 0.30), forest: _lin(0.13, 0.27, 0.11), forest2: _lin(0.19, 0.33, 0.13),
  meadow: _lin(0.42, 0.52, 0.24), rock: _lin(0.47, 0.45, 0.42), rock2: _lin(0.36, 0.34, 0.32), snow: _lin(0.95, 0.96, 0.99), gravel: _lin(0.58, 0.56, 0.50) };
const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
function landCol(x, z, h, ny) {
  const n1 = fbm(x / 340, z / 340, 3), n2 = vnoise(x / 150 + 50, z / 150 - 20), n3 = fbm(x / 60, z / 60, 2);
  const fa = 0.35 + 0.9 * (vnoise(x / 2500, z / 2500) - 0.5), fu = x * Math.cos(fa) + z * Math.sin(fa) + 40 * vnoise(x / 300, z / 300), fv = -x * Math.sin(fa) + z * Math.cos(fa);
  const fi = Math.floor(fu / (70 + 50 * vnoise(x / 900, z / 900))), fj = Math.floor(fv / (110 + 90 * _h2(fi, 7))), fh = _h2(fi, fj);
  let c = fh > 0.86 ? LC.f5 : fh > 0.72 ? LC.f3 : fh > 0.5 ? LC.f2 : fh > 0.25 ? LC.f1 : LC.f4; c = mix3(c, LC.f1, 0.3 + 0.3 * n2);   // parcelas de campos (poco contraste: sin escalones)
  c = mix3(c, mix3(LC.forest, LC.forest2, n3), sstep(18, 110, h + 70 * (n1 - 0.5)));     // bosque en las laderas
  c = mix3(c, LC.meadow, sstep(950, 1150, h + 150 * (n1 - 0.5)));                         // prados de alta montaña
  c = mix3(c, mix3(LC.rock, LC.rock2, n3), Math.max(sstep(0.84, 0.62, ny) * sstep(150, 500, h), sstep(1250, 1450, h + 120 * (n1 - 0.5))));
  c = mix3(c, LC.snow, sstep(1500, 1650, h + 180 * (n1 - 0.5)) * sstep(0.55, 0.78, ny));
  const dr = Math.abs(z - valleyZ(x) - 18 * Math.sin(x / 230)); c = mix3(c, LC.gravel, sstep(48, 26, dr) * 0.55);   // orillas del río
  const k = 0.9 + 0.2 * n3; return [c[0] * k, c[1] * k, c[2] * k];
}
// ---------------------------------------------------------------- nubes: grupos de cúmulos (sprites con textura propia: arriba al sol, abajo gris) y nubes grises al fondo
function cloudPuffTex(seed, gray = 0) {
  const W2 = 512, H2 = 384;
  return canvasTex(W2, H2, (g) => {
    const m = document.createElement('canvas'); m.width = W2; m.height = H2; const q = m.getContext('2d');
    for (let i = 0; i < 34; i++) { const x = W2 * (0.16 + 0.68 * hash(i * 3.1 + seed)), y = H2 * (0.38 + 0.36 * Math.pow(hash(i * 5.3 + seed), 0.7)), r = 46 + 96 * hash(i * 7.7 + seed) * (1 - 0.4 * Math.abs(x / W2 - 0.5) * 2);
      const gr = q.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = gr; q.fillRect(x - r, y - r, 2 * r, 2 * r); }
    const A = q.getImageData(0, 0, W2, H2).data, img = g.createImageData(W2, H2), D = img.data;
    for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
      const k = (j * W2 + i) * 4, a0 = A[k + 3] / 255; if (a0 < 0.01) { D[k + 3] = 0; continue; }
      const n = fbm(i / 38 + seed * 7, j / 38, 4), y = j / H2, bottom = sstep(0.86, 0.7, y);
      const a = clamp((a0 * 1.55 - 0.16) * (0.72 + 0.56 * n)) * bottom;
      const up = j > 6 ? A[((j - 6) * W2 + i) * 4 + 3] / 255 : 0, edge = clamp(1 - up);                // más claro donde no hay nube encima (al sol)
      let b = 0.74 + 0.22 * sstep(0.8, 0.3, y) + 0.16 * edge + 0.1 * (n - 0.5); b = clamp(b * (gray ? 0.86 : 1));
      D[k] = 255 * clamp(b * 0.985); D[k + 1] = 255 * clamp(b * 0.99); D[k + 2] = 255 * clamp(b * 1.0 + (1 - b) * 0.12); D[k + 3] = 255 * a;
    }
    g.putImageData(img, 0, 0);
  });
}
function buildLand() {
  // el suelo: una malla fina alrededor del vuelo y otra gruesa hasta el horizonte (un poco más baja donde se pisan)
  S.cloudList = [];
  for (let i = 0; i < 90; i++) { const x = -14000 + 19000 * hash(i * 2.71), z = -7000 + 14000 * hash(i * 6.13), s = 220 + 380 * hash(i * 9.7);
    if (Math.abs(z - 380) < 1700 + 0.12 * Math.max(0, -x) && x > -6500) continue;       // lejos del pasillo de la cámara: se ven de lado, en el horizonte
    S.cloudList.push({ x, y: 1380 + 380 * hash(i * 4.4), z, s }); }
  for (const c of S.cloudList) { const t = (c.y - Math.max(0, landH(c.x, c.z))) / SUN.y; c.gx = c.x - SUN.x * t; c.gz = c.z - SUN.z * t; }      // dónde cae la sombra de cada nube
  const shade = (x, z) => { let f = 1; for (const c of S.cloudList) { const d2 = ((x - c.gx) ** 2 + (z - c.gz) ** 2) / (c.s * c.s * 0.75); if (d2 < 9) f *= 1 - 0.5 * Math.exp(-d2); } return f; };
  const grid = (cx, cz, size, n, lower) => {
    const geo = new THREE.PlaneGeometry(size, size, n, n); geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position, N = P.count, col = new Float32Array(N * 3), uv = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { const x = P.getX(i) + cx, z = P.getZ(i) + cz; let h = landH(x, z); if (lower) h -= lower(x, z); P.setXYZ(i, x, h, z); uv[i * 2] = x / 140; uv[i * 2 + 1] = z / 140; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const NO = geo.attributes.normal;
    for (let i = 0; i < N; i++) { const x = P.getX(i), z = P.getZ(i), c = landCol(x, z, P.getY(i), NO.getY(i)), f = shade(x, z) * 1.15; col[i * 3] = c[0] * f; col[i * 3 + 1] = c[1] * f; col[i * 3 + 2] = c[2] * f; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, M.land); m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m;
  };
  const half = LAND.size / 2;
  S.landNear = grid(-2600, -700, 9200, 560, null);                                        // fina (16 m) donde miran el dron y la avioneta
  S.land = grid(LAND.cx, LAND.cz, LAND.size, LAND.n, (x, z) => { const e = Math.min(x + 7200, 2000 - x, z + 5300, 3900 - z); return e <= 0 ? 0 : 14 * Math.min(1, e / 300); });
  S.landFar = grid(LAND.cx, LAND.cz, LAND.outer, LAND.no, (x, z) => { const dx = Math.abs(x - LAND.cx) - half, dz = Math.abs(z - LAND.cz) - half, e = Math.max(dx, dz); return e < -1500 ? 90 : e < 0 ? 90 * (-e / 1500) : 0; });
  // el río (cinta brillante por el fondo del valle)
  { const pts = [], wid = []; for (let x = -26000; x <= 12000; x += 60) { const z = valleyZ(x) + 18 * Math.sin(x / 230); pts.push([x, z]); wid.push(34 + 10 * Math.sin(x / 900)); }
    const pos = new Float32Array(pts.length * 6), idx = [];
    pts.forEach(([x, z], i) => { const [x2, z2] = pts[Math.min(pts.length - 1, i + 1)], [x0, z0] = pts[Math.max(0, i - 1)], tx = x2 - x0, tz = z2 - z0, L = Math.hypot(tx, tz), nx = -tz / L, nz = tx / L, w = wid[i] / 2;
      pos.set([x + nx * w, -5.2, z + nz * w, x - nx * w, -5.2, z - nz * w], i * 6); if (i) idx.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    S.river = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x1f5a70, roughness: 0.3, metalness: 0.05, envMapIntensity: 0.4 })); S.river.receiveShadow = true; S.river.frustumCulled = false; scene.add(S.river); }
  // pueblos: casas blancas con tejado rojo junto al río
  { const NH = 520, walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xeee6da, roughness: 0.9 }), NH);
    const rg = new THREE.CylinderGeometry(0.0001, 0.72, 1, 4, 1); rg.rotateY(Math.PI / 4); const roofs = new THREE.InstancedMesh(rg, new THREE.MeshStandardMaterial({ color: 0x6b3a2c, roughness: 0.9 }), NH);
    let k = 0; const towns = [-11800, -9300, -6900, -4600, -2600, -1100, 1600, 3900, 6200];
    towns.forEach((tx, ti) => { const n = 40 + Math.floor(30 * hash(ti * 3.3)), side = hash(ti * 7.1) > 0.5 ? 1 : -1, cz = valleyZ(tx) + side * (150 + 120 * hash(ti));
      for (let j = 0; j < n && k < NH; j++) { const a = hash(ti * 100 + j * 1.7) * 6.283, r = 25 + 170 * Math.sqrt(hash(ti * 100 + j * 2.9)), x = tx + Math.cos(a) * r * 1.4, z = cz + Math.sin(a) * r * 0.8;
        if (Math.abs(z - valleyZ(x)) < 45 || Math.hypot(x, z) < 400) continue;
        const w = 8 + 6 * hash(j * 3.7 + ti), d = 9 + 7 * hash(j * 5.1 + ti), hh = 5 + 4 * hash(j * 2.3 + ti), y = landH(x, z), yaw = hash(j * 9.1 + ti) * 3.14;
        _o.position.set(x, y + hh / 2 - 0.5, z); _o.rotation.set(0, yaw, 0); _o.scale.set(w, hh, d); _o.updateMatrix(); walls.setMatrixAt(k, _o.matrix);
        _o.position.set(x, y + hh - 0.5 + 1.6, z); _o.scale.set(w * 1.45, 3.2, d * 1.45); _o.updateMatrix(); roofs.setMatrixAt(k, _o.matrix); k++; } });
    walls.count = roofs.count = k; walls.receiveShadow = roofs.receiveShadow = true; walls.frustumCulled = roofs.frustumCulled = false; scene.add(walls, roofs); }
  // las nubes: cada grupo, 7-12 sprites (base plana, más grandes abajo)
  const texW = [1, 2, 3, 4, 5, 6].map(s => cloudPuffTex(s)), texG = [7, 8, 9].map(s => cloudPuffTex(s, 1));
  S.cloudSprites = [];
  S.cloudList.forEach((c, ci) => { const n = 7 + Math.floor(6 * hash(ci * 1.9));
    for (let j = 0; j < n; j++) { const a = hash(ci * 31 + j * 2.3) * 6.283, r = c.s * 0.55 * Math.sqrt(hash(ci * 17 + j * 4.1)), up = c.s * 0.28 * hash(ci * 11 + j * 6.7) * (1 - r / (c.s * 0.6)), sz = c.s * (0.5 + 0.45 * hash(ci * 13 + j * 8.9));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texW[(ci + j) % texW.length], transparent: true, depthWrite: false, fog: true })); sp.material.color.setScalar(1.75);
      sp.position.set(c.x + Math.cos(a) * r * 1.2, c.y + up + sz * 0.22, c.z + Math.sin(a) * r * 0.9); sp.scale.set(sz * 1.35, sz, 1); scene.add(sp); S.cloudSprites.push(sp); } });
  // nubes grises al fondo, cerca del horizonte (sin niebla: ya llevan su color de lejos)
  S.farClouds = [];
  for (let i = 0; i < 22; i++) { const a = -Math.PI * 0.45 + Math.PI * 0.9 * hash(i * 3.9) + (i % 2 ? Math.PI : 0), r = 15000 + 12000 * hash(i * 5.5), w = 2600 + 3400 * hash(i * 2.2);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texG[i % texG.length], transparent: true, depthWrite: false, fog: false, opacity: 0.85 }));
    const gcol = 0.86 + 0.16 * hash(i * 8.1); sp.material.color.setRGB(gcol * 0.95, gcol * 0.98, gcol * 1.04);
    sp.position.set(-3500 + Math.cos(a) * r, 1800 + 1800 * hash(i * 6.6), Math.sin(a) * r * 0.8); sp.scale.set(w * 1.5, w * 0.55, 1); scene.add(sp); S.farClouds.push(sp); }
  // pájaros: dos bandadas en uve (ánsares), con aleteo
  const bm = new THREE.MeshStandardMaterial({ color: 0x5b554b, roughness: 0.85 }), wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.18, 0, 0, 0.22, 0, 0, 0.12, 0, 0.55, -0.18, 0, 0, 0.12, 0, 0.55, -0.02, 0, 0.92, -0.02, 0, 0.92, 0.12, 0, 0.55, 0.16, 0, 0.98]), 3)); wingGeo.computeVertexNormals();
  const makeBird = () => { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), bm); body.scale.set(0.95, 0.2, 0.22); g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.45, 6), bm); neck.rotation.z = Math.PI / 2 + 0.15; neck.position.set(-0.62, 0.04, 0); g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), bm); head.position.set(-0.86, 0.08, 0); g.add(head);
    const wl = new THREE.Mesh(wingGeo, bm), wr = new THREE.Mesh(wingGeo, bm); wr.scale.z = -1; wl.material.side = THREE.DoubleSide; g.add(wl, wr); g.userData.w = [wl, wr];
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(1.9); scene.add(g); return g; };
  S.flocks = [{ n: 9, f0: 25, y: 1532, z: 393, sp: 16 }, { n: 13, f0: -159, y: 1518, z: 326, sp: 16 }].map(F => ({ ...F, birds: Array.from({ length: F.n }, makeBird) }));
}
// el cielo: degradado de bruma a azul, con el sol y su halo (sigue a la cámara)
function skyLand() {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, uniforms: { sunDir: { value: SUN }, haze: { value: HAZE } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 sunDir, haze; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 zen = vec3(0.075, 0.22, 0.60), hor = haze, gnd = haze * vec3(0.86, 0.9, 0.92);
        vec3 c = h > 0. ? mix(hor, zen, pow(clamp(h * 1.05, 0., 1.), 0.48)) : mix(hor, gnd, clamp(-h * 6., 0., 1.));
        float s = max(dot(d, sunDir), 0.); c += vec3(1.0, 0.9, 0.72) * (pow(s, 1800.) * 30. + pow(s, 40.) * 0.35 + pow(s, 6.) * 0.12);
        gl_FragColor = vec4(c, 1.); }` });
  const s = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), m); s.renderOrder = -10; s.frustumCulled = false; return s;
}
function birdsAt(t) {
  const u = t < 13 ? t : (t >= 43 ? t - END : null);
  for (const F of S.flocks) F.birds.forEach((b, i) => { b.visible = u !== null; if (!b.visible) return;
    const row = Math.ceil(i / 2), side = i === 0 ? 0 : (i % 2 ? 1 : -1), P = bigBase(0);
    b.position.set(P.x + F.f0 - F.sp * u + row * 6.5 + 0.6 * Math.sin(u * 0.9 + i), F.y + 0.4 * Math.sin(u * 1.3 + i * 1.7) + row * 0.3, F.z + side * row * 5);
    b.rotation.set(0, 0, 0.04 * Math.sin(u * 0.8 + i));
    const fl = 0.62 * Math.sin(2 * Math.PI * 2.6 * u + i * 0.9); b.userData.w[0].rotation.x = -fl; b.userData.w[1].rotation.x = fl; });
}
// ---------------------------------------------------------------- tiempos y animación (todo depende solo del instante t)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const fract = x => x - Math.floor(x);
const _o = new THREE.Object3D(), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3(), _e3 = new THREE.Euler(), _q3 = new THREE.Quaternion();
let TT = {};
function buildTimes() {
  TT = {
    crack: K.mal1, nasa: K.nasa2, n575: K.n575_2,                         // 1-2: la equis en la pizarra, la NASA, 575 t
    emerge: K.ala3, split: K.aire3, meet: K.vez3,                         // 3: el ala sale de la pizarra («el ala»); el «mito»: llegan a la vez
    cita: K.cita4, tunnel: K.tunel4, pulse: K.tunel4 + 0.3, first: K.antes4,   // 4: el túnel de viento; el de arriba llega antes
    acro: K.si5 - 0.4, inv: K.boca5,                                      // 5: la avioneta (su propio plano), boca abajo
    tilt: K.inclinada6 - 0.2, push: K.empuja6,                            // 6: el ala se inclina y empuja el aire hacia abajo
    blocks: K.cientos7,                                                   // 7: cientos de toneladas de aire
    arrDn: K.abajo8, arrUp: K.empuja8b,                                   // 8: acción y reacción
    press: K.arriba9, lift: K.levanta9,                                   // 9: la presión; levanta el avión
    wake: K.respuesta10, poll: K.ventanilla11,                            // 10-11
    back: K.ventanilla11 + 0.3,                                           // el ala vuelve a la pizarra (bucle)
  };
  TT.cut0 = K.esa1 - 0.05;                                               // del avión a la pizarra
  TT.fly0 = TT.emerge + 0.22; TT.fly1 = TT.fly0 + 0.85; TT.curva = TT.fly1 - 0.05; TT.balls = TT.fly1 + 0.15;   // el ala vuela de la pizarra a su sitio
}
// ---------------------------------------------------------------- el avión gigante: vuela de verdad (35 m/s) a 2.100 m por encima del valle; el mismo pasillo al
// principio, con los bloques de aire y al final (bucle: u = t al principio, u = t - END al final)
const BIG = { v: 35, psi: 0, x0: 0, y0: 1500, z0: 350 };
function bigU(t) { return t < TT.cut0 + 0.3 ? t : ((t >= 32.4 && t < 36.6) || t >= 43.2) ? t - END : null; }
function bigBase(t) { const u = bigU(t) ?? 0, d = BIG.v * u; return { x: BIG.x0 - Math.cos(BIG.psi) * d, y: BIG.y0, z: BIG.z0 + Math.sin(BIG.psi) * d }; }
const MAN = { az: 9, wz: 2 * Math.PI / 6.4, ay: 5, wy: 2 * Math.PI / 4.7 };
function bigPose(t) {
  const u = bigU(t); if (u === null) return { on: false, x: 0, y: -900, z: 0, lift: 0, yaw: 0, roll: 0, pitch: 0 };
  const B = bigBase(t), lift = t > 40 ? 5 * eio(clamp((t - TT.lift) / 1.4)) * (1 - eio(clamp((t - 52.4) / 3.2))) : 0;
  const dz = MAN.az * Math.sin(MAN.wz * u), vz = MAN.az * MAN.wz * Math.cos(MAN.wz * u), az = -MAN.az * MAN.wz * MAN.wz * Math.sin(MAN.wz * u);
  const dy = MAN.ay * Math.sin(MAN.wy * u + 1.0), vy = MAN.ay * MAN.wy * Math.cos(MAN.wy * u + 1.0);
  return { on: true, x: B.x, y: B.y + lift + dy, z: B.z + dz, lift, yaw: Math.atan2(vz, BIG.v), roll: 0.036 * az, pitch: Math.atan2(vy, BIG.v) * 0.8 };
}
// un punto del avión (coordenadas propias: morro en -x, alas en ±z) en el mundo
function bigLocal(P, lx, ly, lz, out) { const c = Math.cos(BIG.psi), s = Math.sin(BIG.psi); return out.set(P.x + lx * c + lz * s, P.y + ly, P.z - lx * s + lz * c); }
// la avioneta: en su propio sitio del valle, a 520 m; se da la vuelta y sigue boca abajo
function acroPose(t) { const k = t - TT.acro; return { k, x: -2600 - 40 * k, y: 520 + Math.sin(k * 1.1) * 2.5, z: -650, roll: Math.PI * eio(clamp((t - TT.inv + 0.85) / 0.75)) }; }
function skyAt(t) {
  const P = bigPose(t), B = S.big; B.visible = P.on; B.position.set(P.x, P.y, P.z);
  _e3.set(P.roll || 0, BIG.psi + (P.yaw || 0), -(P.pitch || 0) - (P.lift ? 0.03 * Math.sin(clamp((t - TT.lift) / 1.4) * Math.PI) : 0), 'YZX'); B.quaternion.setFromEuler(_e3);      // rumbo, cabeceo y alabeo
  // la avioneta y su humo de exhibición
  const A = acroPose(t); S.acro.visible = A.k > 0 && A.k < 4.0;
  if (S.acro.visible) { S.acro.position.set(A.x, A.y, A.z); S.acro.rotation.set(A.roll, 0, 0.05); S.prop.rotation.x = t * 40; }
  S.acroSmoke.visible = A.k > 0 && A.k < 4.0;
  if (S.acroSmoke.visible) { const N = 420;
    for (let i = 0; i < N; i++) { const age = i * 0.0095, Q = acroPose(t - age); let s = 0;
      if (Q.k > 0.05) { s = Math.min(1, age * 6) * (1 - clamp((age - 3.2) / 1.4)) * (0.55 + age * 0.35); _o.position.set(Q.x + 3.7, Q.y + 0.05 - age * 0.6 + (hash(i * 3.1) - 0.5) * age * 0.8, Q.z + (hash(i * 5.3) - 0.5) * age * 0.8); _o.scale.setScalar(Math.max(0.0001, s * (1.25 + age * 1.3))); }
      else _o.scale.setScalar(0.0001); _o.rotation.set(0, 0, 0); _o.updateMatrix(); S.acroSmoke.setMatrixAt(i, _o.matrix); }
    S.acroSmoke.instanceMatrix.needsUpdate = true; }
  // bloques de aire que el ala echa hacia abajo (cientos de toneladas por segundo)
  const bk = cwin(t, TT.blocks - 0.35, 36.4, 0.3, 0.3); S.blocks.visible = bk > 0.01 && P.on;
  if (S.blocks.visible) { const N = 140;
    for (let i = 0; i < N; i++) { const te = 32.0 + (i / N) * 4.4, u = t - te; let s = 0;
      if (u > 0 && u < 2.8) { const zs = (hash(i * 3.1) * 2 - 1) * 26, xs = lerp(9.5, 8, Math.abs(zs) / 28) + 3 + hash(i * 1.7) * 3;
        s = Math.min(1, u * 4) * (1 - clamp((u - 2.2) / 0.6)); bigLocal(P, xs + u * 7, -4 - 6 * u - 4.5 * u * u, zs, _o.position); _o.rotation.set(u * 0.6 * hash(i), u * 0.5 + hash(i * 2.2), 0); }
      _o.scale.setScalar(Math.max(0.0001, s * bk)); _o.updateMatrix(); S.blocks.setMatrixAt(i, _o.matrix); }
    S.blocks.instanceMatrix.needsUpdate = true; }
  // la estela: el aire que el ala va dejando hacia abajo, todo el rato
  const wk = cwin(t, TT.wake - 0.5, K.ventanilla11 - 0.25, 0.6, 0.22); S.wake.visible = wk > 0.01 && P.on;      // «todo el rato»; se apaga al cambiar de plano
  if (S.wake.visible) { const N = 1400;
    for (let i = 0; i < N; i++) { const te = 44.5 + (i / N) * 10.5, u = t - te; let s = 0;
      if (u > 0 && u < 4.0) { const zs = (hash(i * 7.3) * 2 - 1) * 27, xs = lerp(9.5, 8, Math.abs(zs) / 28) + 1.5 + hash(i * 1.3) * 2;
        s = (1 - clamp((u - 3.0) / 1.0)) * Math.min(1, u * 4); bigLocal(P, xs + u * 6, -2.5 - 7 * u - 2.2 * u * u - hash(i * 2.9) * 1.5, zs, _o.position); }
      _o.rotation.set(0, 0, 0); _o.scale.set(s * wk * 0.6, s * wk * 3.6, s * wk * 0.6); _o.updateMatrix(); S.wake.setMatrixAt(i, _o.matrix); }
    S.wake.instanceMatrix.needsUpdate = true; }
  // presión alrededor del avión: azul encima de las alas, rojo debajo
  const pk = cwin(t, TT.lift - 0.3, K.flota10, 0.4, 0.6) * (P.on ? 1 : 0);
  S.lowP.visible = S.highP.visible = pk > 0.01;
  if (pk > 0.01) { bigLocal(P, 3, 13, 0, S.lowP.position); S.lowP.scale.set(70, 22, 1); S.lowP.material.opacity = pk * 0.8;
    bigLocal(P, 3, -14, 0, S.highP.position); S.highP.scale.set(80, 26, 1); S.highP.material.opacity = pk * 0.8; }
  // y la diferencia lo levanta: tres flechas que empujan desde abajo
  const lk = cwin(t, TT.lift - 0.1, K.flota10 - 0.2, 0.45, 0.4) * (P.on ? 1 : 0);
  S.liftArrows.forEach((a, i) => { a.visible = lk > 0.01; if (!a.visible) return; const z = (i - 1) * 17, x = i === 1 ? 2 : 8;
    bigLocal(P, x, -27 + 3 * Math.sin(t * 3 + i), z, a.position); a.userData.setLen(14 * backOut(clamp((lk - i * 0.12) / 0.6))); a.quaternion.identity(); });
}
// ---------------------------------------------------------------- el aula: la equis, el reloj, el dibujo de tiza (se despega con el ala y vuelve al final)
function drawAt(t) { return 1 - win(t, TT.emerge + 0.15, 0.7) + win(t, TT.back + 0.2, 1.0); }
function roomAt(t) {
  const ck = cwin(t, TT.crack, TT.emerge - 0.2, 0.12, 0.3); M.cross.opacity = ck * 0.95; S.cross.visible = ck > 0.01; S.cross.scale.setScalar(0.85 + 0.15 * backOut(clamp((t - TT.crack) / 0.3)));
  S.clockM.rotation.z = -Math.PI * 2 * 4 * t / END; S.clockH.rotation.z = -Math.PI * 2 * t / END;
  const dk = drawAt(t); M.boardDraw.opacity = dk; S.boardDraw.visible = dk > 0.005;
}
// ---------------------------------------------------------------- el túnel: el ala sale de la pizarra, el «mito», el humo de verdad, la inclinación
function alphaAt(t) { return lerp(S.AL0, S.AL1, alphaMix(t)); }
function alphaMix(t) { return eio(clamp((t - TT.tilt) / 0.9)) * (1 - eio(clamp((t - TT.back) / 1.2))); }
// dónde está el ala: 0 en la pizarra (plana, como el dibujo), 1 en su sitio
function foilK(t) { return eio(clamp((t - TT.fly0) / (TT.fly1 - TT.fly0))) * (1 - eio(clamp((t - TT.back) / 1.5))); }
function tunnelAt(t) {
  const al = alphaAt(t), mv = alphaMix(t), e = foilK(t);
  // el ala: aparece rellenando el dibujo de tiza, se despega y vuela a su sitio (girando un poco para que se vea que es de verdad)
  const on = t > TT.emerge && t < TT.back + 1.55; S.foil.visible = on;
  if (on) { const pop = backOut(clamp((t - TT.emerge) / 0.3)) * (t < TT.back ? 1 : 1 - clamp((t - TT.back - 1.35) / 0.2)), k = lerp(BD.k, 1, e);
    S.foil.position.set(lerp(BD.x0, TUN.x, e), lerp(BD.y0, TUN.y, e) + 0.35 * Math.sin(Math.PI * e) * (t < TT.back ? 1 : 0), lerp(BOARD.z + 0.02, TUN.z, e));
    S.foil.scale.set(k * lerp(0.9, 1, pop), k * lerp(0.9, 1, pop), Math.max(0.015, e) * Math.max(0.001, pop));
    S.foil.rotation.set(0, (t < TT.back ? 0.55 : -0.4) * Math.sin(Math.PI * e), -al * e); }
  // «curva por arriba»: la cara de arriba se ilumina de borde a borde
  const ck = cwin(t, TT.curva - 0.1, TT.split + 0.4, 0.1, 0.3); S.upLine.visible = ck > 0.01 && e > 0.98;
  if (S.upLine.visible) { S.upLine.geometry.instanceCount = Math.max(1, Math.round((S.upPts.length - 1) * clamp((t - TT.curva + 0.1) / 0.45))); S.upLineMat.opacity = ck; }
  // la caja de cristal (con fondo negro, como los túneles de humo), el ventilador y las líneas de corriente
  const tk = cwin(t, TT.tunnel, TT.back + 0.4, 0.45, 0.6); S.tunnel.children.forEach(c => { if (c !== S.foil && c !== S.upLine) c.visible = tk > 0.01; });
  M.tunBack.opacity = tk; S.tunBox.scale.set(1, lerp(0.6, 1, eo(tk)), lerp(0.4, 1, eo(tk)));
  S.fanBlades.rotation.x = t * 25; S.slMat.opacity = tk * 0.45;
  if (tk > 0.01) S.slines.forEach((l, i) => { const A = S.lines0[i], B = S.lines1[i], arr = new Float32Array(A.length * 3);
    for (let k = 0; k < A.length; k++) { arr[k * 3] = lerp(A[k].x, B[k].x, mv); arr[k * 3 + 1] = lerp(A[k].y, B[k].y, mv); arr[k * 3 + 2] = A[k].z; } l.geometry.setPositions(arr); });
  // los pulsos de humo: con 3° mientras se habla del túnel; con 9° cuando el ala empuja el aire hacia abajo
  const puff = (mesh, list, al2, k, tau0) => { mesh.visible = k > 0.01 && tk > 0.01; if (!mesh.visible) return;
    list.forEach((p, i) => { const tau = tau0 - p.k * 1.15, s = tau > 0 ? k : 0; zWorld(pathAt(p.path, tau, 0.03), al2, _p1);
      const inside = _p1.x < TUN.x + 0.2 + TUN.L / 2 - 0.03; _o.position.copy(_p1); _o.position.z += TUN.D * 0.3; _o.rotation.set(0, 0, 0); _o.scale.setScalar(Math.max(0.0001, inside ? s : 0)); _o.updateMatrix(); mesh.setMatrixAt(i, _o.matrix); });
    mesh.instanceMatrix.needsUpdate = true; };
  puff(S.smoke, S.pulses, S.AL0, cwin(t, TT.pulse - 0.05, TT.acro + 0.3, 0.1, 0.4), (t - TT.pulse) * 3.2);
  puff(S.smoke1, S.pulses1, S.AL1, cwin(t, TT.tilt + 0.6, TT.blocks + 0.2, 0.15, 0.3), 2.5 + (t - TT.tilt - 0.6) * 4.2);
  // las dos bolitas: el «mito» (pegadas al ala, llegan a la vez) y luego el humo de verdad (la de arriba llega antes)
  const bv = (t > TT.balls && t < TT.acro + 0.3); S.ballA.visible = S.ballB.visible = bv;
  if (bv) {
    if (t < TT.tunnel + 0.25) {
      const f = eio(clamp((t - TT.split) / (TT.meet - TT.split)));
      const pa = surfAt(S.upPath, f, 0.13), pb = surfAt(S.dnPath, f, -0.13);
      zWorld(pa, al, S.ballA.position).add(v3(0, 0, TUN.D * 0.5)); zWorld(pb, al, S.ballB.position).add(v3(0, 0, TUN.D * 0.5));
      const sc = backOut(clamp((t - TT.balls) / 0.4)) * (1 - clamp((t - TT.tunnel + 0.05) / 0.25)); S.ballA.scale.setScalar(Math.max(0.001, sc)); S.ballB.scale.setScalar(Math.max(0.001, sc));
    } else {
      const tau = (t - TT.pulse) * 3.2; zWorld(pathAt(S.pA, tau, 0.03), S.AL0, S.ballA.position).add(v3(0, 0, TUN.D * 0.5)); zWorld(pathAt(S.pB, tau, 0.03), S.AL0, S.ballB.position).add(v3(0, 0, TUN.D * 0.5));
      const sc = 1.15 * backOut(clamp((t - TT.tunnel - 0.25) / 0.35)), end = TUN.x + 0.2 + TUN.L / 2 - 0.05;
      S.ballA.scale.setScalar(Math.max(0.001, S.ballA.position.x < end ? sc : 0)); S.ballB.scale.setScalar(Math.max(0.001, S.ballB.position.x < end ? sc : 0));
    }
  }
  // la meta (el borde de salida): la «cita» del mito y la meta de la carrera de verdad; los rastros de las bolitas
  const fk = cwin(t, TT.split + 0.3, TT.acro + 0.2, 0.3, 0.3); S.finish.visible = fk > 0.01 && e > 0.98; S.finMat.opacity = fk * 0.85;
  const rk = cwin(t, TT.pulse, TT.acro + 0.2, 0.2, 0.3); S.trailA.visible = S.trailB.visible = rk > 0.01;
  if (rk > 0.01) { const tau = (t - TT.pulse) * 3.2; for (const L of [S.trailA, S.trailB]) { L.geometry.instanceCount = Math.max(1, Math.min(L.userData.n - 1, Math.round(tau / 0.03))); L.userData.m.opacity = rk * 0.8; } }
  // flechas: el ala empuja el aire hacia abajo; el aire empuja el ala hacia arriba
  const dk = cwin(t, TT.arrDn, TT.press + 0.2, 0.35, 0.3), uk = cwin(t, TT.arrUp, TT.press + 0.2, 0.35, 0.3);
  S.arrDn.visible = dk > 0.01 && tk > 0.01; S.arrUp.visible = uk > 0.01 && tk > 0.01;
  S.arrDn.userData.setLen(0.75 * backOut(dk)); S.arrUp.userData.setLen(0.75 * backOut(uk));
  // presión (con el ala inclinada)
  S.press.material.opacity = cwin(t, TT.press - 0.1, TT.lift - 0.3, 0.45, 0.4) * 0.95; S.press.visible = S.press.material.opacity > 0.01 && tk > 0.01;
  S.press.rotation.z = 0;
}
function pathAt(path, tau, dt) { if (tau <= 0) return path[0]; const f = tau / dt, i = Math.min(path.length - 2, Math.floor(f)), u = Math.min(1, f - i); return { x: lerp(path[i].x, path[i + 1].x, u), y: lerp(path[i].y, path[i + 1].y, u) }; }
function surfAt(path, f, dy) { const i = Math.min(path.length - 2, Math.floor(f * (path.length - 1))), u = f * (path.length - 1) - i; return { x: lerp(path[i].x, path[i + 1].x, u), y: lerp(path[i].y, path[i + 1].y, u) + dy }; }
function sceneAt(t) { skyAt(t); roomAt(t); tunnelAt(t); birdsAt(t); }
// ---------------------------------------------------------------- cámara. Planos: A) un único plano de dron, desde arriba y detrás, siguiendo al avión que
// vuela sobre el valle (del principio a «te lo enseño al final»); B) la pizarra y la explicación (como estaba); la avioneta, con su
// propia cámara; C) y E) el túnel; D) y F) el avión en el cielo; G) vuelta al plano del dron (bucle: el último fotograma enlaza con el primero).
// Un plano «big» o «acro» lleva la cámara pegada al avión o a la avioneta (las claves son posiciones relativas).
let SHOTS = [], CUTS = [];
const K0C = [[94, 50, 34], [-12, 5, 0], 54];                      // dron: detrás, arriba y a la izquierda del avión (se ven las alas por encima)
// el dron no se queda quieto: barre de izquierda a derecha y baja. Las claves de antes del 0 y de después de END son las mismas, así la
// cámara ya viene moviéndose en el primer fotograma y el bucle no se nota (misma posición y misma velocidad).
const LOOPK = [[-1.6, [104, 58, 62], [-13, 6, 0], 54], [0, ...K0C], [1.5, [82, 41, -6], [-10, 3, 0], 52], [3.0, [70, 31, -42], [-7, 1, 0], 50]];
function buildCam() {
  const TX = TUN.x, TY = TUN.y, TZ = TUN.z, SK = (a, l, f) => [a, l, f];
  SHOTS = [
    [0, LOOPK.map(k => [k[0], k[1], k[2], k[3]]), 'big'],                                     // A: el avión vuela sobre el valle (3 s, cámara en movimiento)
    [TT.cut0, [                                                                               // B: «…y esa explicación»: la pizarra; la equis; la NASA; 575 t; el ala sale
      [TT.cut0, [1.15, 1.5, 6.6], [0.15, 1.85, -3.0], 37],
      [K.mal1 - 0.12, [0.36, 1.62, 4.15], [0.13, 1.62, -3.0], 34],                                 //    «está mal»: la equis
      [K.nasa2 + 0.35, [0.22, 1.63, 3.85], [0.12, 1.62, -3.0], 34],                               //    «lo dice la NASA»: el sello
      [K.aire2, [-1.5, 1.8, 4.6], [0.05, 1.72, -3.0], 35],                                         //    la cámara rodea la pizarra
      [K.n575_2 + 0.3, [-0.2, 2.15, 5.6], [0.0, 1.55, -3.0], 36],
      [K.final2, [1.45, 1.75, 4.9], [0.15, 1.62, -3.0], 35],
      [K.ala3 - 0.25, [0.42, 1.66, 4.25], [0.04, 1.6, -3.0], 34],                                 //    «el ala»: sale de la pizarra
      [K.ala3 + 0.05, [0.32, 1.66, 4.2], [0.02, 1.6, -3.0], 34],
      [TT.fly1 + 0.05, [0.5, 1.82, 6.3], [0.42, 1.6, TZ], 34],
      [K.camino3, [0.5, 1.77, 5.8], [0.45, 1.56, TZ], 34],
      [K.vez3, [0.7, 1.71, 5.5], [0.7, TY, TZ], 34],                                               //    «a la vez»
      [K.cita4 + 0.1, [0.8, 1.69, 5.35], [0.8, TY, TZ], 34],
      [K.viento4, [0.55, 1.8, 7.9], [0.55, TY, TZ], 34],                                           // 4: el túnel de viento
      [K.llega4, [0.6, 1.74, 6.9], [0.62, TY, TZ], 34],
      [K.antes4b + 0.2, [0.75, 1.7, 6.6], [0.78, TY - 0.03, TZ], 34],                              //    el de arriba llega antes
      [K.si5 - 0.05, [0.78, 1.7, 6.55], [0.8, TY - 0.03, TZ], 34],
    ]],
    [K.si5 - 0.05, [                                                                          // 5: la avioneta, con su propia cámara: se da la vuelta
      [K.si5 - 0.05, [20, 5, 32], [-1, 0, 0], 44],
      [K.boca5, [13, 5.5, 29], [0, 0, 0], 44],
      [K.clave6 - 0.08, [9, 5.5, 27], [-1, 0, 0], 44],
    ], 'acro'],
    [K.clave6 - 0.08, [                                                                       // C: el ala se inclina y empuja el aire hacia abajo
      [K.clave6 - 0.08, [0.55, 1.78, 7.2], [0.5, TY, TZ], 34],
      [K.inclinada6, [0.62, 1.72, 6.5], [0.6, TY - 0.04, TZ], 34],
      [K.empuja6 + 0.2, [0.95, 1.62, 6.3], [0.95, TY - 0.08, TZ], 34],
      [K.cientos7 - 0.03, [1.12, 1.6, 6.6], [1.1, TY - 0.12, TZ], 34],
    ]],
    [K.cientos7 - 0.03, [                                                                     // D: el avión en el cielo (desde detrás y abajo): los bloques de aire caen de las alas
      [K.cientos7 - 0.03, [34, -17, 94], [2, -12, 0], 52],
      [K.si8 - 0.03, [4, -23, 97], [2, -13, 0], 51],
    ], 'big'],
    [K.si8 - 0.03, [                                                                          // E: acción y reacción; la presión
      [K.si8 - 0.03, [0.78, 1.75, 7.3], [0.78, TY - 0.05, TZ], 34],
      [K.abajo8, [0.82, 1.7, 7.0], [0.8, TY - 0.05, TZ], 34],
      [K.arriba8, [0.72, 1.74, 6.9], [0.7, TY, TZ], 34],
      [K.arriba9 + 0.1, [0.5, 1.72, 7.0], [0.5, TY, TZ], 34],
      [K.sube9 + 0.3, [0.45, 1.66, 6.4], [0.45, TY, TZ], 34],
      [K.levanta9 - 0.05, [0.45, 1.64, 6.2], [0.45, TY, TZ], 34],
    ]],
    [K.levanta9 - 0.05, [                                                                     // F: el avión sube (la cámara no sube con él); no flota: la estela
      [K.levanta9 - 0.05, [18, -20, 98], [2, -12, 0], 52],
      [K.respuesta10, [36, -21, 92], [2, -12, 0], 52],
      [K.flota10, [62, -24, 82], [0, -15, 0], 53],
      [K.rato10, [84, -30, 58], [0, -16, 0], 53],
      [K.ventanilla11 - 0.03, [88, -31, 52], [0, -16, 0], 53],
    ], 'big'],
    [K.ventanilla11 - 0.03, [                                                                 // G: vuelta al dron del principio (bucle)
      [K.ventanilla11 - 0.03, [128, 66, -20], [-14, -40, 0], 54],                                 //    (el avión arriba: la encuesta va debajo)
      ...LOOPK.map(k => [k[0] + END, k[1], k[2], k[3]]),                                       //    y enlaza con el principio (misma velocidad)
    ], 'big'],
  ];
  CUTS = SHOTS.slice(1).map(s => s[0]);
}
function camAt(t, tb = t) { let S0 = SHOTS[0]; for (const s of SHOTS) if (t >= s[0]) S0 = s; const c = camKeys(t, S0[1]); c.kind = S0[2] || 'room';
  if (c.kind !== 'room') { const B = c.kind === 'big' ? bigBase(tb) : acroPose(tb); c.p.x += B.x; c.p.y += B.y; c.p.z += B.z; c.l.x += B.x; c.l.y += B.y; c.l.z += B.z; }
  return c; }
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return c; return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.crack + 0.02, 0.025], [TT.nasa + 0.05, 0.02]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st0) {
  NOW = t;
  const R = S.rig, sun = R.sun, room = st0.kind === 'room';
  if (room) { const c = st0.l, d = st0.p.distanceTo(c), yaw = Math.atan2(st0.p.x - c.x, st0.p.z - c.z), k = clamp(d / 3.0, 0.3, 4.0); rigAt(c, yaw, k, 0.35, 0.7); }
  else { R.key.intensity = R.a.intensity = R.b.intensity = R.f.intensity = 0; }        // en el cielo, solo el sol y el cielo
  R.sun.intensity = room ? 2.4 : 2.9; R.hemi.intensity = room ? 0.95 : 0.75; R.hemi.color.setHex(0xbfdcff); R.hemi.groundColor.setHex(room ? 0x6a8a4a : 0x7b8270);
  R.key.color.setHex(0xfff1dc); R.a.color.setHex(0xcfe6ff); R.b.color.setHex(0xffe2c4); R.f.color.setHex(0xffffff);
  // la sombra del sol: en el aula, alrededor del aula; en el cielo, alrededor del avión (su sombra cae en el valle) o de la avioneta
  const T0 = room ? _p2.set(0, 0, 0) : (st0.kind === 'big' ? _p2.copy(bigPose(t)) : _p2.set(acroPose(t).x, acroPose(t).y, acroPose(t).z));
  if (st0.kind === 'big' && !bigPose(t).on) T0.copy(bigBase(t));
  const sc = sun.shadow.camera, half = room ? 9 : st0.kind === 'big' ? 46 : 12, dist = room ? 60 : 400;
  sun.target.position.copy(T0); sun.position.copy(T0).addScaledVector(SUN, dist); sun.target.updateMatrixWorld();
  if (sc.right !== half || sc.far !== (room ? 120 : 4500)) { sc.left = sc.bottom = -half; sc.right = sc.top = half; sc.near = 1; sc.far = room ? 120 : 4500; sc.updateProjectionMatrix(); }
  scene.fog.density = 0.00009; S.sky.position.copy(st0.p);
  sceneAt(t);
  post.uniforms.fade.value = 0;
}
// ---------------------------------------------------------------- HUD: la pregunta pendiente, el sello de la NASA, las cifras con su fuente, las etiquetas del
// túnel (las bolitas, el ángulo, las flechas, la presión), «no flota» y la votación con los asientos
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
  if (sub) { hg.save(); hg.letterSpacing = '4px'; hfont(30); const w = hg.measureText(sub).width; hg.restore();      // el subtítulo nunca se sale
    bigText(sub, 540, y + 78, w > 990 ? 30 * 990 / w : 30, HC.white, clamp(k * 1.2 - 0.15), { dark: 14, ls: 4 }); }
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
  const items = [['VENTANILLA', '#62E3D4', 290], ['PASILLO', '#FFC24A', 790]], y = 1515;
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
  const w = hg.measureText(txt).width + 26, h = size * 1.6, x = clamp(P.x, w / 2 + 28, W - w / 2 - 28); hg.fillStyle = 'rgba(0,0,0,.7)'; rr(hg, x - w / 2, P.y - h / 2, w, h, h / 2); hg.fill();
  hg.fillStyle = col; hg.fillText(txt, x, P.y + 1); hg.restore();
}
// el sello rojo de «INCORRECTA»
function stamp2(P, k, k2 = 1) {
  if (k <= 0.01 || !P || !P.ok) return; const e = backOut(clamp(k / 0.35)), s = lerp(2.1, 1.35, e);
  hg.save(); hg.globalAlpha = clamp(k * 3); hg.translate(P.x, P.y); hg.rotate(-0.14); hg.scale(s, s);
  hfont(58); hg.letterSpacing = '6px'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; const w = hg.measureText('INCORRECTA').width + 70;
  glowStroke(HRd, 7, 10); rr(hg, -w / 2, -62, w, 124, 14); hg.stroke(); noGlow(); hg.fillStyle = HRd; hg.fillText('INCORRECTA', 0, -14);
  hfont(26, false); hg.letterSpacing = '5px'; hg.globalAlpha = clamp(k * 3) * clamp(k2 * 2); hg.fillText(typed('SEGÚN LA NASA', clamp(k2 * 1.5)), 0, 34); hg.restore();
}
// los asientos de una fila: ventanilla y pasillo
function seats(t, k) {
  if (k <= 0.01) return; const y = 1290, sw = 92, sh = 104, gap = 14, aisle = 70, n = 6, total = n * sw + (n - 2) * gap + aisle, x0 = 540 - total / 2;
  hg.save(); hg.globalAlpha = clamp(k * 2);
  hg.fillStyle = 'rgba(0,0,0,.55)'; rr(hg, x0 - 40, y - 90, total + 80, sh + 150, 28); hg.fill();
  for (let i = 0; i < n; i++) { const left = i < 3, j = left ? i : i - 3, x = x0 + (left ? 0 : 3 * sw + 2 * gap + aisle) + j * (sw + gap);
    const win = i === 0 || i === n - 1, ais = i === 2 || i === 3, kk = backOut(clamp((k - i * 0.06) / 0.5)), pulse = (win || ais) ? 1 + 0.04 * Math.sin(t * 6 + (win ? 0 : Math.PI)) : 1;
    hg.save(); hg.translate(x + sw / 2, y + sh / 2); hg.scale(kk * pulse, kk * pulse);
    hg.fillStyle = win ? '#62E3D4' : ais ? '#FFC24A' : 'rgba(238,242,246,.35)'; rr(hg, -sw / 2, -sh / 2, sw, sh, 18); hg.fill();
    hg.fillStyle = 'rgba(0,0,0,.25)'; rr(hg, -sw / 2 + 10, -sh / 2 + 10, sw - 20, 26, 8); hg.fill(); hg.restore(); }
  hfont(22); hg.letterSpacing = '3px'; hg.textAlign = 'center'; hg.fillStyle = HC.white; hg.fillText('PASILLO', 540, y - 46);
  hg.strokeStyle = 'rgba(238,242,246,.5)'; hg.lineWidth = 2; hg.setLineDash([8, 8]); hg.beginPath(); hg.moveTo(540, y - 30); hg.lineTo(540, y + sh + 20); hg.stroke(); hg.setLineDash([]);
  hg.restore();
}
// el ángulo del ala: la horizontal (discontinua) y la cuerda, con su arco
const _a1 = new THREE.Vector3(), _a2 = new THREE.Vector3(), _a3 = new THREE.Vector3();
function angleMark(t, k) {
  if (k <= 0.01) return; const al = alphaAt(t), LE = S.upPath[0], TE = S.upPath[S.upPath.length - 1], zf = TUN.z + TUN.D * 0.5 + 0.02;
  zWorld(LE, al, _a1).z = zf; zWorld({ x: TE.x + (TE.x - LE.x) * 0.22, y: TE.y + (TE.y - LE.y) * 0.22 }, al, _a2).z = zf; _a3.set(_a1.x + (_a2.x - _a1.x) * 1.0 / Math.cos(al), _a1.y, zf);
  const A = proj(_a1), B = proj(_a2), Cc = proj(_a3); if (!A.ok) return;
  hg.save(); hg.globalAlpha = clamp(k * 2);
  hg.setLineDash([14, 10]); glowStroke('rgba(238,242,246,.9)', 3, 6); hg.beginPath(); hg.moveTo(A.x, A.y); hg.lineTo(A.x + (Cc.x - A.x) * eo(clamp(k * 1.5)), Cc.y); hg.stroke(); hg.setLineDash([]);
  glowStroke(HGd, 4, 10); hg.beginPath(); hg.moveTo(A.x, A.y); hg.lineTo(A.x + (B.x - A.x) * eo(clamp(k * 1.5)), A.y + (B.y - A.y) * eo(clamp(k * 1.5))); hg.stroke();
  const r = Math.hypot(B.x - A.x, B.y - A.y) * 0.6, a0 = 0, a1 = Math.atan2(B.y - A.y, B.x - A.x);
  glowStroke(HGd, 4, 10); hg.beginPath(); hg.arc(A.x, A.y, r, a0, a0 + (a1 - a0) * clamp(k * 2 - 0.4)); hg.stroke(); noGlow(); hg.restore();
  smallTag({ x: A.x + r + 10, y: A.y + (B.y - A.y) * 0.95 + 46, ok: true }, 'UN POCO INCLINADA', clamp(k * 2 - 0.5), HGd, 26);
}
// el aire sale del ala hacia abajo: una flecha que sigue la corriente de verdad (calculada) detrás del borde de salida
function downArrow(t, k) {
  if (k <= 0.01 || !S.dnFlow) return; const n = S.dnFlow.length, m = Math.max(2, Math.round(n * eo(clamp(k * 1.6))));
  const P = S.dnFlow.slice(0, m).map(p => proj(p)); if (!P[0].ok) return;
  hg.save(); hg.globalAlpha = clamp(k * 2); glowStroke(HC.teal, 9, 16); hg.beginPath(); P.forEach((p, i) => i ? hg.lineTo(p.x, p.y) : hg.moveTo(p.x, p.y)); hg.stroke();
  const a = P[m - 1], b = P[m - 2], ang = Math.atan2(a.y - b.y, a.x - b.x); hg.fillStyle = HC.teal; hg.beginPath();
  hg.moveTo(a.x + Math.cos(ang) * 26, a.y + Math.sin(ang) * 26); hg.lineTo(a.x + Math.cos(ang + 2.4) * 26, a.y + Math.sin(ang + 2.4) * 26); hg.lineTo(a.x + Math.cos(ang - 2.4) * 26, a.y + Math.sin(ang - 2.4) * 26); hg.closePath(); hg.fill();
  noGlow(); hg.restore();
  smallTag({ x: a.x - 40, y: a.y + 58, ok: true }, 'AIRE HACIA ABAJO', clamp(k * 2 - 0.4), HC.teal, 28);
}
function hudAt(t) {
  hudBegin();
  const cw2 = (t0, t1, fi = 0.22, fo = 0.22) => win(t, t0, fi) * (1 - win(t, t1, fo));
  // la pregunta, pendiente hasta la respuesta
  bracketMsg(t, 'LO QUE LO SOSTIENE · ???', HC.amber, cw2(K.final2, K.respuesta10, 0.3, 0.12), true);
  bracketMsg(t, 'LO QUE LO SOSTIENE ↓', HGr, cw2(K.respuesta10, K.rato10 + 0.6, 0.12, 0.3), false);
  // 1-2: la NASA y las 575 toneladas
  { _hv.set(0.2, BOARD.y, BOARD.z); stamp2(proj(_hv), cw2(K.nasa2 - 0.05, K.sostiene2 + 0.5, 0.15, 0.3), 1); }      // «lo dice la NASA», sobre el dibujo tachado
  bigFig('575 t', 'AIRBUS A380 · PESO MÁXIMO AL DESPEGAR', HC.white, cw2(K.n575_2 - 0.05, K.final2 + 0.05, 0.2, 0.25), 1300);
  srcLine('NASA GLENN · UNIVERSIDAD DE CAMBRIDGE · AIRBUS · «CIENTOS DE TONELADAS»: CÁLCULO DE EJEMPLO', cw2(K.nasa2, K.rato10, 0.3, 0.3));
  // 3-4: las bolitas: el «mito» y el humo de verdad
  if (S.ballA.visible) { S.ballA.getWorldPosition(_hv); _hv.y += 0.1; smallTag(proj(_hv), 'A · MÁS CAMINO', cw2(K.camino3 - 0.1, K.vez3 - 0.2, 0.2, 0.2), HC.amber, 26); }
  if (S.ballB.visible) { S.ballB.getWorldPosition(_hv); _hv.y -= 0.1; smallTag(proj(_hv), 'B', cw2(K.camino3 - 0.1, K.vez3 - 0.2, 0.2, 0.2), HC.teal, 26); }
  { const tA = TT.pulse + S.tauA / 3.2, tB = TT.pulse + S.tauB / 3.2, end = K.si5 - 0.1;
    _hv.set(S.teX, TUN.y + 0.66, TUN.z + TUN.D * 0.5); smallTag(proj(_hv), 'A · LLEGA ANTES', cw2(tA, end, 0.15, 0.2), HC.amber, 28);
    _hv.set(S.teX, TUN.y - 0.66, TUN.z + TUN.D * 0.5); smallTag(proj(_hv), 'B · LLEGA DESPUÉS', cw2(tB, end, 0.15, 0.2), HC.teal, 28); }
  { zWorld(S.upPath[S.upPath.length - 1], alphaAt(t), _hv); _hv.z += TUN.D * 0.5; _hv.y += 0.16; const P = proj(_hv), ck = cw2(K.vez3 - 0.1, K.tunel4, 0.2, 0.3);
    smallTag(P, 'CITA: A LA VEZ', ck, HC.white, 26); if (P.ok) cross({ x: P.x, y: P.y }, cw2(K.cita4 - 0.05, K.tunel4, 0.1, 0.3), 46); }
  { _hv.set(TUN.x + 0.2, TUN.y + TUN.H / 2 + 0.05, TUN.z); lab(_hv.clone(), 'TÚNEL DE VIENTO', 'HUMO DE COLORES · UNIVERSIDAD DE CAMBRIDGE', cw2(K.tunel4 + 0.2, K.llega4, 0.25, 0.25), { color: HC.white, dx: 110, dy: -120 }); }
  // 5: boca abajo
  if (S.acro.visible) { S.acro.getWorldPosition(_hv); _hv.y -= 1.6; smallTag(proj(_hv), 'BOCA ABAJO', cw2(K.boca5 - 0.1, K.clave6, 0.2, 0.2), HC.amber, 28); }
  // 6: el ángulo y el aire hacia abajo
  angleMark(t, cw2(TT.tilt - 0.05, K.empuja6 + 0.1, 0.3, 0.3));
  downArrow(t, cw2(K.empuja6 + 0.05, K.cientos7 - 0.05, 0.6, 0.15));
  // 7: cientos de toneladas
  bigFig('≈ 480 t/s', 'DE AIRE HACIA ABAJO · UN A380 EN CRUCERO (CÁLCULO DE EJEMPLO)', HC.teal, cw2(K.cientos7 + 0.05, K.si8 - 0.28, 0.2, 0.22), 1300);
  // 8: acción y reacción
  if (S.arrDn.visible) { S.arrDn.getWorldPosition(_hv); _hv.y -= 0.66; smallTag(proj(_hv), 'EL ALA EMPUJA EL AIRE ↓', cw2(K.abajo8, K.arriba9, 0.2, 0.2), HC.teal, 26); }
  if (S.arrUp.visible) { S.arrUp.getWorldPosition(_hv); _hv.y += 0.62; smallTag(proj(_hv), 'EL AIRE EMPUJA EL ALA ↑', cw2(K.empuja8b, K.arriba9, 0.2, 0.2), HC.amber, 26); }
  // 9: presiones
  { _hv.set(TUN.x + 0.1, TUN.y + 0.42, TUN.z + TUN.D * 0.5); smallTag(proj(_hv), 'PRESIÓN BAJA', cw2(K.baja9 - 0.1, K.levanta9 - 0.2, 0.2, 0.2), '#7CC8FF', 26);
    _hv.set(TUN.x + 0.1, TUN.y - 0.4, TUN.z + TUN.D * 0.5); smallTag(proj(_hv), 'PRESIÓN ALTA', cw2(K.sube9 - 0.1, K.levanta9 - 0.2, 0.2, 0.2), '#FF8A6A', 26); }
  if (S.big.visible) { S.big.getWorldPosition(_hv); _hv.y -= 34; smallTag(proj(_hv), 'LA DIFERENCIA LO LEVANTA', cw2(K.levanta9, K.respuesta10, 0.2, 0.2), HC.white, 26); }
  // 10: la respuesta
  bigFig('NO FLOTA', 'SE SUJETA EMPUJANDO EL AIRE HACIA ABAJO', HC.amber, cw2(K.flota10 - 0.05, K.rato10 + 0.4, 0.2, 0.25), 1290);
  // 11: ¿ventanilla o pasillo?
  seats(t, cw2(K.ventanilla11 - 0.1, K.profe11 + 0.25, 0.35, 0.3));            // se quita antes de que el avión baje al centro (bucle)
  pollPills(t, cw2(K.ventanilla11 - 0.05, K.profe11 + 0.25, 0.35, 0.3));
}
// ---------------------------------------------------------------- un fotograma
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up2 = new THREE.Vector3();
function frame(t) {
  placeCam(camAt(prevT(t, 1 / 60), t)); const prevVP = vpOf();
  placeCam(camAt(prevT(t, 1 / 36), t)); const PVP = vpOf();
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
    explicaron1: atL(1, 'explicaron'), esa1: atL(1, 'esa'), colegio1: atL(1, 'colegio'), avion1: atL(1, 'avion'), mal1: atL(1, 'mal'),
    nasa2: atL(2, 'nasa'), sostiene2: atL(2, 'sostiene'), aire2: atL(2, 'aire'), avion2: atL(2, 'avion'), n575_2: atL(2, '=575'), toneladas2: atL(2, 'toneladas'), final2: atL(2, 'final'),
    contaron3: atL(3, 'contaron'), ala3: atL(3, 'ala'), aire3: atL(3, 'aire'), curva3: atL(3, 'curva'), arriba3: atL(3, 'arriba'), camino3: atL(3, 'camino'), corre3: atL(3, 'corre'), vez3: atL(3, 'vez'),
    pero4: atL(4, 'pero'), cita4: atL(4, 'cita'), tunel4: atL(4, 'tunel'), viento4: atL(4, 'viento'), llega4: atL(4, 'llega'), antes4: atL(4, 'antes'), mucho4: atL(4, 'mucho'), antes4b: atL(4, 'antes', 2),
    si5: atL(5, '=si'), curva5: atL(5, 'curva'), boca5: atL(5, 'boca'), abajo5: atL(5, 'abajo'),
    clave6: atL(6, 'clave'), inclinada6: atL(6, 'inclinada'), empuja6: atL(6, 'empuja'), abajo6: atL(6, 'abajo'),
    cientos7: atL(7, 'cientos'), segundo7: atL(7, 'segundo'),
    si8: atL(8, '=si'), abajo8: atL(8, 'abajo'), empuja8b: atL(8, 'empuja', 2), arriba8: atL(8, 'arriba'),
    arriba9: atL(9, 'arriba'), baja9: atL(9, 'baja'), sube9: atL(9, 'sube'), diferencia9: atL(9, 'diferencia'), levanta9: atL(9, 'levanta'), entero9: atL(9, 'entero'),
    respuesta10: atL(10, 'respuesta'), flota10: atL(10, 'flota'), rato10: atL(10, 'rato'),
    ventanilla11: atL(11, 'ventanilla'), pasillo11: atL(11, 'pasillo'), mandaselo11: atL(11, 'mandaselo'), profe11: atL(11, 'profe'),
  };
  mats(); buildMats(); buildSceneMats(); buildRig();
  { const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene(), sk = skyLand(); es.add(sk);                 // el reflejo del cielo y del valle
    const gr = new THREE.Mesh(new THREE.CircleGeometry(950, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.12, 0.13, 0.11) })); gr.rotation.x = -Math.PI / 2; gr.position.y = -70; es.add(gr);
    scene.environment = pm.fromScene(es, 0.02, 0.1, 3000).texture; scene.environmentIntensity = 0.75; }
  scene.fog = new THREE.FogExp2(HAZE.clone(), 0.00009); cam.near = 0.05; cam.far = 160000; cam.updateProjectionMatrix();
  buildFlow(); buildWorld(); buildTunnel(); buildLand();
  scene.traverse(o => { if (o.isInstancedMesh) o.frustumCulled = false; });      // las instancias se mueven: que nunca se recorten por una esfera vieja
  { const sun = S.rig.sun; sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.position.set(-18, 30, 22); sun.target.position.set(0, 0, 0); const c = sun.shadow.camera; c.left = c.bottom = -9; c.right = c.top = 9; c.near = 1; c.far = 90; sun.shadow.bias = -0.0004; }
  buildTimes();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.TT = TT; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
