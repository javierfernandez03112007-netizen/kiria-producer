// «La tapa gratis no existe» (voz de Javi): ver 12_bar.js.
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
// ---------------------------------------------------------------- el escenario (en metros): un bar de Granada abierto por delante, de noche. La barra con azulejos,
// los grifos, el jamón, la pizarra «TAPA CON CADA BEBIDA», la caja, la bodega con los barriles debajo del suelo, la calle con otras
// tiendas y la Alhambra al fondo (telón pintado). La caña y su tapa son las protagonistas.
const BX = 3.6, BZ = 2.6, BH = 3.2, CELLAR = 2.3;                  // bar: medio ancho, medio fondo, alto; bodega (fondo bajo el suelo)
const CTR = { x0: -2.4, x1: 2.4, z: -0.55, h: 1.1, d: 0.6 };       // barra: de x0 a x1, cara delantera en z, alto, fondo
const TOP = CTR.h + 0.05;                                            // encimera
const HERO = v3(-0.35, TOP, CTR.z - 0.16);                           // dónde está la caña protagonista
const BIG = v3(-0.35, 0, 0.95);                                      // el vaso gigante (la cuenta), en el suelo delante de la barra
const BIGH = 1.55, BIGR0 = 0.36, BIGR1 = 0.46;                       // alto y radios del vaso gigante
const ROUND_X = [-0.35, -0.08, 0.19, 0.46, 0.73];                    // las rondas a lo largo de la barra
const KEG = v3(0.2, -CELLAR, -0.6);

function buildBarMats() {
  M.stucco = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ece6da'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '120,110,95' : '255,255,255'},${0.04 + hash(i * 3.3) * 0.06})`; g.fillRect(hash(i * 1.7) * w, hash(i * 2.9) * h, 2 + hash(i * 5.1) * 5, 2 + hash(i * 7.3) * 5); } }), roughness: 0.92 });
  M.stucco.map.wrapS = M.stucco.map.wrapT = THREE.RepeatWrapping; M.stucco.map.repeat.set(3, 3);
  M.azulejo = new THREE.MeshPhysicalMaterial({ map: repTex(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f2ede2'; g.fillRect(0, 0, w, h); const c = ['#1f5f8b', '#2e8b6e', '#d9a441'];
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const cx = x * 128 + 64, cy = y * 128 + 64; g.save(); g.translate(cx, cy);
      g.fillStyle = c[0]; for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(0, 30, 10, 26, 0, 0, 7); g.fill(); }
      g.fillStyle = c[2]; g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fill(); g.fillStyle = c[1]; g.beginPath(); g.arc(0, 0, 7, 0, 7); g.fill(); g.restore();
      g.strokeStyle = 'rgba(80,70,60,.35)'; g.lineWidth = 3; g.strokeRect(x * 128, y * 128, 128, 128); } }), 1, 1), roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.15 });
  M.floorTile = new THREE.MeshStandardMaterial({ map: repTex(canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#8e3b22' : '#b4552f'; g.fillRect(x * 64, y * 64, 64, 64); g.fillStyle = `rgba(0,0,0,${0.05 + hash(x * 7 + y) * 0.1})`; g.fillRect(x * 64, y * 64, 64, 64); } g.strokeStyle = '#3a2016'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }), 6, 4), roughness: 0.55 });
  M.brick = new THREE.MeshStandardMaterial({ map: repTex(canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3c2a22'; g.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) { g.fillStyle = `hsl(${12 + hash(r * 9 + c) * 10},${35 + hash(r + c * 3) * 15}%,${28 + hash(r * 3 + c * 7) * 12}%)`; g.fillRect(c * 52 + (r % 2) * 26 - 26, r * 32 + 3, 48, 27); } }), 3, 2), roughness: 0.9 });
  M.beer = new THREE.MeshPhysicalMaterial({ color: 0xf0a514, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.88, emissive: 0x6a3a00, emissiveIntensity: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 });
  M.foam = new THREE.MeshStandardMaterial({ color: 0xfbf6ea, roughness: 0.95 });
  M.glassC = new THREE.MeshPhysicalMaterial({ color: 0xeef6ff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, depthWrite: false, side: THREE.DoubleSide });
  M.plateW = new THREE.MeshPhysicalMaterial({ color: 0xfaf7f0, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.15 });
  M.bread = new THREE.MeshStandardMaterial({ color: 0xd99a52, roughness: 0.8 });
  M.crumb = new THREE.MeshStandardMaterial({ color: 0xf3dcae, roughness: 0.9 });
  M.tortilla = new THREE.MeshStandardMaterial({ color: 0xedbb47, roughness: 0.7 });
  M.crust = new THREE.MeshStandardMaterial({ color: 0xb8742c, roughness: 0.75 });
  M.tomato = new THREE.MeshStandardMaterial({ color: 0xc8381f, roughness: 0.5 });
  M.ham = new THREE.MeshPhysicalMaterial({ color: 0x9c2b2b, roughness: 0.45, clearcoat: 0.3 });
  M.fat = new THREE.MeshStandardMaterial({ color: 0xf0e2d6, roughness: 0.6 });
  M.croq = new THREE.MeshStandardMaterial({ color: 0xc9772e, roughness: 0.75 });
  M.sauce = new THREE.MeshPhysicalMaterial({ color: 0x8a2e12, roughness: 0.3, clearcoat: 0.5 });
  M.meat = new THREE.MeshStandardMaterial({ color: 0x6e3d22, roughness: 0.65 });
  M.chalk = new THREE.MeshStandardMaterial({ color: 0x1e2a24, roughness: 0.9 });
  M.iron = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.5, metalness: 0.6 });
  M.roofT = new THREE.MeshStandardMaterial({ color: 0xa9532f, roughness: 0.75 });
  M.chrome = metal(0xe6e9ee, 0.12);
  M.bottle = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.75, clearcoat: 1, clearcoatRoughness: 0.1 });
}

// ---------------------------------------------------------------- la caña (vaso + cerveza + espuma; la cerveza puede bajar) y las tapas
function cana(s = 1) {
  const g = new THREE.Group(), h = 0.13, r0 = 0.027, r1 = 0.034;
  const glass = lathe([[0.001, 0], [r0, 0], [r0 + 0.001, 0.004], [r1, h], [r1 - 0.002, h]], 32, M.glassC); glass.renderOrder = 8; glass.castShadow = false; g.add(glass);
  const base = cyl(r0, r0, 0.006, M.glassC, 32); base.position.y = 0.003; base.renderOrder = 8; g.add(base);
  const liq = new THREE.Group(); g.add(liq);
  const beer = new THREE.Mesh(new THREE.CylinderGeometry(r1 - 0.003, r0 - 0.002, h - 0.022, 32), M.beer); beer.geometry.translate(0, (h - 0.022) / 2 + 0.006, 0); liq.add(beer);
  const foam = cyl(r1 - 0.002, r1 - 0.0025, 0.016, M.foam, 32); foam.position.y = h - 0.016 + 0.008; g.add(foam);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r1 - 0.002, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.foam); dome.scale.y = 0.18; dome.position.y = h; g.add(dome);
  g.userData = { beer, foam, dome, h, r0, r1 }; g.scale.setScalar(s); return g;
}
// nivel de la caña: 1 llena, 0 vacía
function canaLevel(c, k) { const U = c.userData, hh = (U.h - 0.022) * Math.max(0.0001, k); U.beer.scale.y = Math.max(0.0001, k); U.foam.position.y = 0.006 + hh + 0.008; U.dome.position.y = 0.006 + hh + 0.016; U.foam.visible = U.dome.visible = k > 0.03; }
function plate(r = 0.075) { return lathe([[0.001, 0], [r * 0.72, 0], [r * 0.78, 0.004], [r, 0.014], [r * 0.97, 0.016], [r * 0.76, 0.007], [0.001, 0.007]], 40, M.plateW); }
function tapaFood(kind) {
  const g = new THREE.Group();
  if (kind === 'pan') {          // pan con tomate y aceite
    for (const [x, rz] of [[-0.022, 0.1], [0.022, -0.08]]) { const b = rbox(0.05, 0.03, 0.014, M.bread, 0.006); b.rotation.set(-Math.PI / 2, 0, rz); b.position.set(x, 0.015, 0); g.add(b);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.003, 0.024), M.tomato); t.position.set(x, 0.023, 0); t.rotation.y = rz; g.add(t); }
  } else if (kind === 'tortilla') {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.026, 32, 1, false, -0.45, 0.9), M.tortilla); w.position.set(-0.03, 0.02, 0); w.castShadow = true; g.add(w);
    const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.0605, 0.0605, 0.004, 32, 1, false, -0.45, 0.9), M.crust); cr.position.set(-0.03, 0.034, 0); g.add(cr);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0608, 0.0608, 0.022, 32, 1, true, -0.45, 0.9), M.crust); rim.position.set(-0.03, 0.02, 0); g.add(rim);
    const b = rbox(0.045, 0.028, 0.012, M.bread, 0.005); b.rotation.x = -Math.PI / 2; b.position.set(0.035, 0.013, 0.012); g.add(b);
  } else if (kind === 'montadito') {
    const b = rbox(0.07, 0.035, 0.016, M.bread, 0.007); b.rotation.x = -Math.PI / 2; b.position.y = 0.015; g.add(b);
    for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 16), M.ham); s.position.set(-0.022 + k * 0.022, 0.025 + k * 0.001, 0); s.rotation.z = 0.15; g.add(s); }
  } else if (kind === 'croquetas') {
    for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.026, 6, 12), M.croq); c.rotation.z = Math.PI / 2; c.rotation.y = (k - 1) * 0.5; c.position.set((k - 1) * 0.018, 0.018, (k - 1) * 0.012); c.castShadow = true; g.add(c); }
  } else if (kind === 'albondigas') {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.006, 32), M.sauce); s.position.y = 0.01; g.add(s);
    for (let k = 0; k < 4; k++) { const b = sph(0.014, M.meat, 14, 10); b.position.set(Math.cos(k * 1.7) * 0.022, 0.02, Math.sin(k * 1.7) * 0.022); g.add(b); }
  } else {                        // jamón
    for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.003, 18), M.ham); s.scale.set(1.3, 1, 0.8); s.position.set((hash(k) - 0.5) * 0.06, 0.011 + k * 0.002, (hash(k * 3) - 0.5) * 0.05); s.rotation.y = k; g.add(s);
      const f = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0018, 4, 18, 1.4), M.fat); f.rotation.x = Math.PI / 2; f.position.copy(s.position); f.position.y += 0.002; f.rotation.z = k; g.add(f); }
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function tapa(kind, r = 0.075) { const g = new THREE.Group(); const p = plate(r); g.add(p); const f = tapaFood(kind); f.position.y = 0.006; g.add(f); g.userData.food = f; return g; }
// etiqueta «GRATIS» clavada en un palillo, en 4 trozos que saltan
function gratisTag() {
  const g = new THREE.Group(), w = 0.07, h = 0.034;
  const tx = canvasTex(512, 248, (c, W2, H2) => { c.fillStyle = '#fffdf6'; c.fillRect(0, 0, W2, H2); c.strokeStyle = '#e5243f'; c.lineWidth = 14; c.strokeRect(10, 10, W2 - 20, H2 - 20); c.fillStyle = '#e5243f'; c.font = '900 150px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('GRATIS', W2 / 2, H2 / 2 + 8, W2 - 50); });
  const m = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6, side: THREE.DoubleSide });
  const pick = cyl(0.0012, 0.0012, 0.07, M.wood, 6); pick.position.y = 0.035; g.add(pick);
  const pieces = [];
  for (let i = 0; i < 4; i++) {
    const ix = i % 2, iy = Math.floor(i / 2), geo = new THREE.PlaneGeometry(w / 2, h / 2), uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) + ix) / 2, (uv.getY(k) + iy) / 2);
    const p = new THREE.Mesh(geo, m); p.castShadow = true; const home = v3((ix - 0.5) * w / 2, 0.07 + (iy - 0.5) * h / 2, 0.002); p.position.copy(home); p.userData.home = home; g.add(p); pieces.push(p);
  }
  g.userData = { pieces, pick }; return g;
}

// ---------------------------------------------------------------- piezas del bar
function pawnGeo() { const g = studentGeo(false); g.scale(27, 27, 27); return g; }        // figurita de cerámica a escala de persona (≈ 1,62 m)
function bottleRow(n, x0, x1, y, z) {
  const g = new THREE.Group(), cols = [0x2f5d3a, 0x6b3a1e, 0xe8e0c8, 0x3b5f8a, 0x8a2a2a, 0x2a2a2a];
  for (let i = 0; i < n; i++) { const c = cols[i % cols.length], hh = 0.26 + hash(i * 3.1) * 0.08;
    const b = lathe([[0.001, 0], [0.036, 0], [0.036, hh * 0.62], [0.014, hh * 0.8], [0.012, hh], [0.001, hh]], 20, M.bottle(c)); b.position.set(lerp(x0, x1, (i + 0.5) / n), y, z); g.add(b); }
  return g;
}
function beerTap() {
  const g = new THREE.Group();
  const col = lathe([[0.001, 0], [0.06, 0], [0.05, 0.02], [0.045, 0.38], [0.06, 0.42], [0.001, 0.42]], 32, M.chrome); g.add(col);
  for (const sx of [-1, 1]) { const arm = cyl(0.012, 0.012, 0.08, M.chrome, 12); arm.rotation.x = Math.PI / 2; arm.position.set(sx * 0.035, 0.36, 0.05); g.add(arm);
    const nz = cyl(0.008, 0.01, 0.05, M.chrome, 12); nz.position.set(sx * 0.035, 0.33, 0.09); g.add(nz);
    const hd = cyl(0.012, 0.016, 0.14, plastic(0x1b1c20, 0.3), 16); hd.position.set(sx * 0.035, 0.46, 0.06); g.add(hd); }
  return g;
}
function cashRegister() {
  const g = new THREE.Group();
  g.add(at(rbox(0.36, 0.12, 0.3, plastic(0x2a2e35, 0.35), 0.02), 0, 0.06, 0, 0, Math.PI / 2));
  const body = rbox(0.3, 0.16, 0.18, plastic(0x3a3f48, 0.3), 0.02); body.position.set(0, 0.2, -0.05); body.rotation.x = -0.35; g.add(body);
  const scr = textPlane(0.16, 0.05, (c, w, h) => { c.fillStyle = '#0c1a10'; c.fillRect(0, 0, w, h); c.fillStyle = '#7cf0a9'; c.font = '700 120px "SpaceMono"'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText('3,00 €', w - 20, h / 2 + 4); }, 512);
  scr.position.set(0, 0.31, 0.0); scr.rotation.x = -0.35; g.add(scr);
  const dr = rbox(0.32, 0.05, 0.28, plastic(0x23262c, 0.4), 0.01); dr.rotation.x = Math.PI / 2; dr.position.set(0, 0.028, 0.02); g.add(dr); g.userData.drawer = dr;
  return g;
}
function hamLeg() {
  const g = new THREE.Group();
  const leg = lathe([[0.001, -0.05], [0.07, 0.0], [0.12, 0.12], [0.13, 0.25], [0.1, 0.38], [0.05, 0.48], [0.03, 0.56], [0.001, 0.58]], 32, M.ham); leg.scale.z = 0.7; g.add(leg);
  const hoof = cyl(0.022, 0.028, 0.08, M.black, 16); hoof.position.y = 0.6; g.add(hoof);
  const rope = cyl(0.004, 0.004, 0.5, plastic(0xd8c9a8, 0.8), 6); rope.position.y = 0.88; g.add(rope);
  g.rotation.z = Math.PI; return g;
}
function chalkboard() {
  const g = new THREE.Group();
  g.add(at(rbox(1.0, 0.7, 0.03, M.wood, 0.01), 0, 0, 0));
  const t = textPlane(0.92, 0.62, (c, w, h) => { c.fillStyle = '#1e2a24'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.92)'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 74px "Bebas"'; c.fillText('TAPA', w / 2, h * 0.26); c.font = '700 58px "Bebas"'; c.fillText('CON CADA', w / 2, h * 0.5); c.fillText('BEBIDA', w / 2, h * 0.72);
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 4; c.beginPath(); c.moveTo(w * 0.2, h * 0.88); c.lineTo(w * 0.8, h * 0.88); c.stroke(); }, 512);
  t.position.z = 0.017; t.material.toneMapped = true; g.add(t); return g;
}
function stool() { const g = new THREE.Group(); g.add(at(cyl(0.17, 0.17, 0.05, M.wood, 24), 0, 0.72, 0)); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.78; g.add(bar(v3(Math.cos(a) * 0.12, 0.7, Math.sin(a) * 0.12), v3(Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17), 0.014, M.iron)); } return g; }
function table() { const g = new THREE.Group(); g.add(at(cyl(0.38, 0.38, 0.04, M.wood, 32), 0, 0.75, 0)); g.add(at(cyl(0.035, 0.05, 0.73, M.iron, 16), 0, 0.37, 0)); g.add(at(cyl(0.25, 0.25, 0.02, M.iron, 24), 0, 0.01, 0)); return g; }
function lampPend(y) { const g = new THREE.Group(); g.add(at(cyl(0.004, 0.004, BH - y, M.iron, 6), 0, (BH - y) / 2, 0)); const sh = lathe([[0.001, 0.12], [0.03, 0.12], [0.16, 0.0], [0.17, -0.01], [0.001, -0.01]], 32, M.iron); g.add(sh);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd29a).multiplyScalar(2.6), toneMapped: false })); b.position.y = 0.01; g.add(b); g.position.y = y; return g; }
// fachada andaluza: encalada, ventanas con luz, balcones de forja, tejado de teja; tienda abajo con su letrero (o el hueco del bar)
function facade(w, floors, shop, seed) {
  const g = new THREE.Group(), fh = 3.2, hTot = fh * (floors + 1);
  const front = mesh(new THREE.BoxGeometry(w, hTot - fh, 0.3), M.stucco); front.position.set(0, fh + (hTot - fh) / 2, 0); g.add(front);
  for (let f = 1; f <= floors; f++) for (let i = 0; i < Math.max(1, Math.round(w / 2.2)); i++) {
    const n = Math.max(1, Math.round(w / 2.2)), x = lerp(-w / 2, w / 2, (i + 0.5) / n), y = fh * f + 1.25;
    const lit = hash(seed * 13 + f * 7 + i) > 0.35, win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.5), new THREE.MeshBasicMaterial({ color: lit ? new THREE.Color(0xffc98a).multiplyScalar(0.9) : new THREE.Color(0x0b1220), toneMapped: false }));
    win.position.set(x, y, 0.152); g.add(win);
    g.add(at(mesh(new THREE.BoxGeometry(1.02, 0.08, 0.06), M.wood), x, y + 0.79, 0.17));
    const bal = new THREE.Group(); bal.position.set(x, y - 0.75, 0.15); g.add(bal);
    bal.add(at(mesh(new THREE.BoxGeometry(1.3, 0.06, 0.45), M.stucco), 0, 0, 0.22));
    for (let k = 0; k <= 10; k++) bal.add(at(cyl(0.008, 0.008, 0.62, M.iron, 6), -0.62 + k * 0.124, 0.33, 0.43));
    bal.add(at(mesh(new THREE.BoxGeometry(1.3, 0.025, 0.025), M.iron), 0, 0.64, 0.43));
  }
  const roof = mesh(new THREE.BoxGeometry(w + 0.3, 0.12, 1.0), M.roofT); roof.position.set(0, hTot + 0.06, -0.3); roof.rotation.x = 0.12; g.add(roof);
  if (shop) {      // tienda: escaparate con luz y letrero
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe0b0).multiplyScalar(0.55), toneMapped: false })); sw.position.set(0, 1.2, 0.0); g.add(sw);
    const wall = mesh(new THREE.BoxGeometry(w, fh, 0.3), M.stucco); wall.position.set(0, fh / 2, -0.16); g.add(wall);
    const sign = plateText(Math.min(w * 0.8, 2.6), 0.42, [[shop, 0.62, 0.55]], { fg: '#f6eedd', bg: '#2a1f18', weight: 800 }); sign.position.set(0, 2.75, 0.17); g.add(sign);
    g.userData.sign = sign;
  }
  g.userData.h = hTot; return g;
}
// telón del fondo: cielo de noche, estrellas, la colina y la fortaleza iluminada (silueta genérica de la Alhambra)
function alhambraBackdrop() {
  const tx = canvasTex(2048, 820, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#020510'); sky.addColorStop(0.55, '#0b1a36'); sky.addColorStop(1, '#2a2440'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + hash(i * 1.3) * 0.7})`; const s = hash(i * 4.1) > 0.97 ? 2.2 : 1.1; g.fillRect(hash(i * 2.7) * w, hash(i * 5.9) * h * 0.6, s, s); }
    const glow = g.createRadialGradient(w * 0.5, h * 0.62, 20, w * 0.5, h * 0.62, w * 0.35); glow.addColorStop(0, 'rgba(255,170,90,.35)'); glow.addColorStop(1, 'rgba(255,150,80,0)'); g.fillStyle = glow; g.fillRect(0, 0, w, h);
    // la colina: azul noche (no un negro plano), con la bruma cálida de la ciudad abajo
    const hillP = new Path2D(); hillP.moveTo(0, h); hillP.lineTo(0, h * 0.82); hillP.bezierCurveTo(w * 0.2, h * 0.74, w * 0.32, h * 0.66, w * 0.46, h * 0.64); hillP.bezierCurveTo(w * 0.62, h * 0.62, w * 0.78, h * 0.7, w, h * 0.78); hillP.lineTo(w, h); hillP.closePath();
    const hill = g.createLinearGradient(0, h * 0.62, 0, h); hill.addColorStop(0, '#060a14'); hill.addColorStop(0.45, '#0b1222'); hill.addColorStop(1, '#221a2a'); g.fillStyle = hill; g.fill(hillP);
    const haze = g.createLinearGradient(0, h * 0.74, 0, h); haze.addColorStop(0, 'rgba(255,150,80,0)'); haze.addColorStop(1, 'rgba(255,150,80,.16)'); g.fillStyle = haze; g.fill(hillP);
    // la fortaleza: murallas y torres, iluminadas de naranja
    const wall = (x0, x1, y, hh) => { const gr = g.createLinearGradient(0, y - hh, 0, y); gr.addColorStop(0, '#f2b26a'); gr.addColorStop(1, '#a8582c'); g.fillStyle = gr; g.fillRect(x0, y - hh, x1 - x0, hh);
      g.fillStyle = 'rgba(60,25,10,.35)'; for (let x = x0; x < x1; x += 14) g.fillRect(x, y - hh, 6, 5); };
    const base = h * 0.645;
    wall(w * 0.3, w * 0.7, base, 34);
    for (const [x, tw, th] of [[0.31, 46, 92], [0.36, 30, 60], [0.42, 38, 74], [0.5, 54, 110], [0.57, 34, 70], [0.63, 44, 88], [0.68, 30, 56]]) wall(w * x - tw / 2, w * x + tw / 2, base, th);
    g.fillStyle = 'rgba(255,220,160,.85)'; for (let i = 0; i < 26; i++) g.fillRect(w * (0.31 + hash(i * 3.3) * 0.38), base - 20 - hash(i * 6.1) * 70, 3, 5);
    // la ciudad: lucecitas bajo la colina
    // la ciudad y el Albaicín: miles de lucecitas, más densas abajo; bajo la fortaleza, el bosque (casi sin luces)
    for (let i = 0; i < 5200; i++) { const x = hash(i * 1.1) * w, y = h * (0.66 + hash(i * 2.3) * 0.34); if (!g.isPointInPath(hillP, x, y)) continue;
      const dens = clamp((y / h - 0.7) / 0.22); if (hash(i * 8.7) > 0.12 + dens * 0.88) continue;
      const warm = hash(i * 9.1) > 0.25; g.fillStyle = warm ? `rgba(255,${170 + hash(i) * 70},${90 + hash(i * 3) * 60},${0.3 + hash(i * 7) * 0.6})` : `rgba(235,240,255,${0.25 + hash(i * 7) * 0.45})`;
      const s = hash(i * 5.3) > 0.9 ? 2.6 : 1.6; g.fillRect(x, y, s, s); }
    for (let i = 0; i < 60; i++) { const x = hash(i * 13.7) * w, y = h * (0.84 + hash(i * 17.1) * 0.15); if (!g.isPointInPath(hillP, x, y)) continue;
      const r = 10 + hash(i * 3.9) * 26, gl = g.createRadialGradient(x, y, 0, x, y, r); gl.addColorStop(0, 'rgba(255,170,90,.18)'); gl.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gl; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(520, 208), new THREE.MeshBasicMaterial({ map: tx, fog: false, toneMapped: false, depthWrite: false }));
  m.position.set(0, 85, -180); m.renderOrder = -1; return m;
}

// ---------------------------------------------------------------- montaje del escenario
function buildBar() {
  const B = new THREE.Group(); scene.add(B); S.bar = B;
  // suelo del bar (sobre la bodega), paredes, techo con vigas
  const fl = mesh(new THREE.BoxGeometry(2 * BX, 0.12, 2 * BZ), M.floorTile); fl.position.set(0, -0.06, 0); B.add(fl);
  B.add(at(mesh(new THREE.BoxGeometry(2 * BX + 0.6, BH + 0.1, 0.3), M.stucco), 0, BH / 2, -BZ - 0.15));
  B.add(at(mesh(new THREE.BoxGeometry(2 * BX - 0.1, 0.9, 0.03), M.azulejo), 0, 0.45, -BZ + 0.02));
  for (const sx of [-1, 1]) B.add(at(mesh(new THREE.BoxGeometry(0.3, BH + 0.1, 2 * BZ + 0.3), M.stucco), sx * (BX + 0.15), BH / 2, 0));
  B.add(at(mesh(new THREE.BoxGeometry(2 * BX + 0.6, 0.25, 2 * BZ + 0.3), M.stucco), 0, BH + 0.12, 0));
  for (let i = 0; i < 7; i++) B.add(at(mesh(new THREE.BoxGeometry(0.16, 0.18, 2 * BZ), M.woodD), -BX + 0.5 + i * (2 * BX - 1) / 6, BH - 0.09, 0));
  // la barra: frente de azulejos, encimera de madera, reposapiés de latón
  const cl = CTR.x1 - CTR.x0, cx = (CTR.x0 + CTR.x1) / 2;
  const front = mesh(new THREE.BoxGeometry(cl, CTR.h, 0.06), M.azulejo); front.position.set(cx, CTR.h / 2, CTR.z - 0.03); B.add(front);
  B.add(at(mesh(new THREE.BoxGeometry(cl, CTR.h, CTR.d - 0.06), M.woodD), cx, CTR.h / 2, CTR.z - 0.06 - (CTR.d - 0.06) / 2));
  const topM = mesh(new THREE.BoxGeometry(cl + 0.1, 0.05, CTR.d + 0.08), M.wood); topM.position.set(cx, CTR.h + 0.025, CTR.z - CTR.d / 2 + 0.04); B.add(topM);
  const rail = cyl(0.025, 0.025, cl, M.brass, 16); rail.rotation.z = Math.PI / 2; rail.position.set(cx, 0.22, CTR.z + 0.12); B.add(rail);
  // detrás: estanterías con botellas, la pizarra, el jamón, los grifos, la caja
  for (const y of [1.45, 1.95, 2.45]) { B.add(at(mesh(new THREE.BoxGeometry(4.6, 0.04, 0.3), M.wood), 0.3, y, -BZ + 0.17)); B.add(at(bottleRow(16, -1.9, 2.5, y + 0.02, -BZ + 0.18), 0, 0, 0)); }
  S.board = chalkboard(); S.board.position.set(-2.75, 1.95, -BZ + 0.05); B.add(S.board);
  S.ham = hamLeg(); S.ham.position.set(-1.6, 2.75, CTR.z - 0.4); B.add(S.ham);
  S.taps = beerTap(); S.taps.position.set(0.95, TOP, CTR.z - 0.35); B.add(S.taps);
  S.reg = cashRegister(); S.reg.position.set(1.9, TOP, CTR.z - 0.3); S.reg.rotation.y = -0.2; B.add(S.reg);
  for (const x of [-1.8, -0.4, 1.0, 2.4]) { const l = lampPend(2.05); l.position.x = x; l.position.z = CTR.z - 0.1; B.add(l); }
  // mesas y taburetes
  for (const [x, z] of [[-2.6, 1.3], [2.7, 1.5]]) { const tb = table(); tb.position.set(x, 0, z); B.add(tb); for (let k = 0; k < 3; k++) { const st = stool(); const a = k * 2.1 + 0.4; st.position.set(x + Math.cos(a) * 0.62, 0, z + Math.sin(a) * 0.62); B.add(st); } }
  for (const x of [-1.9, 2.05]) { const st = stool(); st.position.set(x, 0, CTR.z + 0.4); B.add(st); }
  // la bodega: paredes de ladrillo, barriles y el tubo que sube hasta los grifos
  const C = new THREE.Group(); B.add(C); S.cellar = C;
  C.add(at(mesh(new THREE.BoxGeometry(5.2, 0.12, 3.4), M.stone), 0, -CELLAR - 0.06, -0.6));
  C.add(at(mesh(new THREE.BoxGeometry(5.2, CELLAR, 0.2), M.brick), 0, -CELLAR / 2, -2.35));
  for (const sx of [-1, 1]) C.add(at(mesh(new THREE.BoxGeometry(0.2, CELLAR, 3.4), M.brick), sx * 2.6, -CELLAR / 2, -0.6));
  S.kegs = [];
  for (let i = 0; i < 4; i++) { const k = lathe([[0.001, 0], [0.19, 0], [0.2, 0.02], [0.2, 0.08], [0.19, 0.1], [0.2, 0.12], [0.2, 0.46], [0.19, 0.48], [0.2, 0.5], [0.2, 0.56], [0.19, 0.58], [0.06, 0.6], [0.06, 0.63], [0.001, 0.63]], 32, M.steel);
    k.position.set(-1.0 + i * 0.5, -CELLAR, -1.2 + (i % 2) * 0.5); C.add(k); S.kegs.push(k); }
  S.kegs[2].position.copy(KEG);
  S.tube = tube([KEG.clone().add(v3(0, 0.63, 0)), v3(0.4, -1.2, -0.6), v3(0.9, -0.3, -0.85), v3(0.95, -0.02, -0.9)], 0.018, new THREE.MeshPhysicalMaterial({ color: 0xe0e8f0, roughness: 0.1, transparent: true, opacity: 0.45, clearcoat: 1, clearcoatRoughness: 0.1 }), 60); C.add(S.tube);
  S.beerFlow = tube([KEG.clone().add(v3(0, 0.63, 0)), v3(0.4, -1.2, -0.6), v3(0.9, -0.3, -0.85), v3(0.95, -0.02, -0.9)], 0.012, M.beer, 60); C.add(S.beerFlow);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc98a).multiplyScalar(2.2), toneMapped: false })); bulb.position.set(-0.6, -0.4, -1.4); C.add(bulb);
  // el bar es de una planta (casa baja con azotea): el dintel con el letrero; así se ve la Alhambra por encima
  const lint = mesh(new THREE.BoxGeometry(2 * BX + 0.6, 1.0, 0.3), M.stucco); lint.position.set(0, BH + 0.5, BZ + 0.15); B.add(lint);
  for (const sx of [-1, 1]) B.add(at(mesh(new THREE.BoxGeometry(0.4, BH, 0.36), M.stucco), sx * (BX + 0.1), BH / 2, BZ + 0.15));
  for (let k = 0; k <= 30; k++) B.add(at(cyl(0.012, 0.012, 0.7, M.iron, 6), -BX - 0.2 + k * (2 * BX + 0.4) / 30, BH + 1.35, BZ + 0.1));
  B.add(at(mesh(new THREE.BoxGeometry(2 * BX + 0.6, 0.04, 0.04), M.iron), 0, BH + 1.7, BZ + 0.1));
  S.barSign = plateText(2.4, 0.5, [['BAR · TAPAS', 0.6, 0.55]], { fg: '#f6eedd', bg: '#3a1f12', weight: 900 }); S.barSign.position.set(0, BH + 0.5, BZ + 0.31); B.add(S.barSign);
  S.shops = [];
  for (const [x, w, name, seed] of [[-BX - 0.3 - 2.0, 4.0, 'PANADERÍA', 5], [BX + 0.3 + 2.0, 4.0, 'PELUQUERÍA', 9], [BX + 0.3 + 4.0 + 1.8, 3.6, 'TIENDA', 11], [-BX - 0.3 - 4.0 - 1.8, 3.6, 'FERRETERÍA', 2]]) {
    const f = facade(w, 2, name, seed); f.position.set(x, 0, BZ + 0.15); B.add(f); S.shops.push(f);
  }
  // un cartel de publicidad (genérico, apagado) en la acera de la izquierda
  S.ad = new THREE.Group(); S.ad.position.set(-2.3, 0, 5.0); S.ad.rotation.y = 0.25; B.add(S.ad);
  for (const sx of [-1, 1]) S.ad.add(at(cyl(0.05, 0.05, 2.2, M.iron, 12), sx * 0.9, 1.1, 0));
  S.adFace = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.2), new THREE.MeshBasicMaterial({ map: canvasTex(512, 324, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3d4a63'); gr.addColorStop(1, '#232a39'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.9)'; c.font = '900 92px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ANUNCIO', w / 2, h * 0.42); c.font = '700 36px Inter'; c.fillStyle = 'rgba(255,255,255,.6)'; c.fillText('aquí tu publicidad', w / 2, h * 0.68); }), toneMapped: false }));
  S.adFace.position.y = 2.05; S.ad.add(S.adFace); S.ad.add(at(mesh(new THREE.BoxGeometry(2.0, 1.3, 0.06), M.iron), 0, 2.05, -0.04));
  // farolas (fuera: tapaban los planos de la calle)
  for (const x of []) { const p = cyl(0.05, 0.07, 3.6, M.iron, 12); p.position.set(x, 1.8, 4.6); B.add(p);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffcf8a).multiplyScalar(2.4), toneMapped: false })); b.position.set(x, 3.55, 4.6); B.add(b); }
  B.add(alhambraBackdrop());
}

// ---------------------------------------------------------------- la caña y la tapa protagonistas, las rondas, el vaso gigante, la gente
const NPED = 14;
function buildHero() {
  // la caña y su tapa (y una tapa nueva con su etiqueta al final, para el bucle)
  S.hero = cana(); S.hero.position.copy(HERO); scene.add(S.hero);
  S.htapa = tapa('tortilla'); S.htapa.position.set(HERO.x + 0.14, TOP, HERO.z + 0.04); scene.add(S.htapa);
  S.tag = gratisTag(); S.tag.position.set(HERO.x + 0.15, TOP + 0.022, HERO.z + 0.03); S.tag.rotation.y = -0.25; scene.add(S.tag);
  S.ntapa = tapa('tortilla'); scene.add(S.ntapa);           // la que pone el camarero al final (igual que la del principio)
  S.qm = qmark(new THREE.MeshPhysicalMaterial({ color: 0xffc24a, roughness: 0.25, metalness: 0.4, clearcoat: 0.6 })); S.qm.scale.setScalar(0.22); scene.add(S.qm);
  // las rondas: cañas con su tapa, cada una mejor que la anterior
  const kinds = ['pan', 'montadito', 'croquetas', 'albondigas', 'jamon'];
  S.rounds = ROUND_X.slice(1).map((x, i) => { const c = cana(); c.position.set(x, TOP, HERO.z); scene.add(c); const tp = tapa(kinds[i + 1] || 'jamon', 0.07 + i * 0.006); tp.position.set(x + 0.12, TOP, HERO.z + 0.06); scene.add(tp); return { c, tp }; });
  S.salt = sparks(scene, 160, 0xffffff, 0.012);
  // el vaso gigante: cristal, tres capas (IVA, cerveza, lo que queda) y los iconos que salen de lo que queda
  const G = new THREE.Group(); G.position.copy(BIG); scene.add(G); S.big = G;
  const gl = lathe([[0.001, 0], [BIGR0, 0], [BIGR0 + 0.01, 0.03], [BIGR1, BIGH], [BIGR1 - 0.015, BIGH]], 48, new THREE.MeshPhysicalMaterial({ color: 0xeef6ff, roughness: 0.03, transparent: true, opacity: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, depthWrite: false, side: THREE.DoubleSide }));
  gl.renderOrder = 9; gl.castShadow = false; G.add(gl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(BIGR1 - 0.007, 0.007, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, toneMapped: false })); rim.rotation.x = Math.PI / 2; rim.position.y = BIGH; G.add(rim);
  const fr = [0.27 / 3, 0.5 / 3, 2.23 / 3], cols = [0x9aa1ab, 0xf0a514, 0x3fc58f];
  let y0 = 0.03; S.layers = fr.map((f, i) => { const h = (BIGH - 0.06) * f, r = y => lerp(BIGR0, BIGR1, y / BIGH) - 0.018;
    const geo = new THREE.CylinderGeometry(r(y0 + h), r(y0), h, 48); geo.translate(0, h / 2, 0);
    const m = new THREE.MeshPhysicalMaterial({ color: cols[i], roughness: 0.2, transparent: true, opacity: 0.86, clearcoat: 0.8, clearcoatRoughness: 0.15, emissive: cols[i], emissiveIntensity: 0.18 });
    const L = new THREE.Mesh(geo, m); L.position.y = y0; L.userData = { y0, h }; L.renderOrder = 8; G.add(L); y0 += h; return L; });
  const icon = (o, s = 1) => { o.scale.setScalar(s); G.add(o); return o; };
  const pl = tapa('montadito', 0.075); pl.scale.setScalar(2.2); G.add(pl);
  const house = new THREE.Group(); house.add(at(rbox(0.16, 0.12, 0.12, plastic(0xf3ede0, 0.4), 0.01), 0, 0.06, 0)); const rf = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.08, 4), M.roofT); rf.rotation.y = Math.PI / 4; rf.position.y = 0.16; house.add(rf); house.add(at(rbox(0.04, 0.07, 0.01, M.woodD, 0.004), 0, 0.035, 0.061)); G.add(house);
  const pw = mesh(studentGeo(false), plastic(0x3d8bff, 0.3)); pw.scale.setScalar(3.2); G.add(pw);
  const cn = cyl(0.07, 0.07, 0.016, M.gold, 40); cn.rotation.x = Math.PI / 2; G.add(cn);
  S.icons = [pl, house, pw, cn];
  // la gente: dentro (fijos) y en la calle (andan y, con el letrero, entran)
  S.pawnGeo = pawnGeo();
  const pm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  const inside = [[-1.85, CTR.z + 0.45, 0xe6e1d8], [2.75, 0.5, 0xc9d6e6], [3.2, 0.05, 0xe6e1d8], [-2.95, 1.0, 0xd9c7b0], [-2.25, 1.75, 0xe6e1d8], [2.35, 1.95, 0xc9d6e6], [3.1, 1.15, 0xe6e1d8], [2.0, -1.2, 0xf1ece4]];
  S.inside = new THREE.InstancedMesh(S.pawnGeo, pm, inside.length); S.inside.castShadow = true; S.inside.receiveShadow = true;
  inside.forEach(([x, z, c], i) => { _o.position.set(x, 0, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); _o.updateMatrix(); S.inside.setMatrixAt(i, _o.matrix); S.inside.setColorAt(i, new THREE.Color(c)); });
  scene.add(S.inside);
  S.peds = new THREE.InstancedMesh(S.pawnGeo, pm.clone(), NPED); S.peds.castShadow = true; S.peds.frustumCulled = false; scene.add(S.peds);
  S.pedData = [...Array(NPED)].map((_, i) => ({ x0: -14 + hash(i * 3.7) * 28, z: 4.0 + hash(i * 5.3) * 3.2, v: (hash(i * 7.1) > 0.5 ? 1 : -1) * (0.9 + hash(i * 2.2) * 0.5), enter: i < 9, delay: hash(i * 9.9) * 1.6, col: new THREE.Color([0xe6e1d8, 0xd9c7b0, 0xc9d6e6, 0xe8d0c8][i % 4]) }));
  S.peds.instanceColor = null; S.pedData.forEach((p, i) => S.peds.setColorAt(i, p.col));
  // el letrero en el que se convierte la tapa (aro de luz)
  S.ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 12, 72), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc46a).multiplyScalar(2.6), toneMapped: false, transparent: true, opacity: 0 })); S.ring.visible = false; scene.add(S.ring);
  S.signGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: starTex0(), color: new THREE.Color(1, 0.8, 0.5).multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); S.signGlow.visible = false; scene.add(S.signGlow);
  // platos vacíos con «?» sobre las otras tiendas
  S.shopQ = S.shops.slice(0, 3).map(f => { const g = new THREE.Group(); const p = plate(0.6); p.rotation.x = Math.PI / 2; g.add(p); const q = qmark(new THREE.MeshPhysicalMaterial({ color: 0xffc24a, roughness: 0.25, metalness: 0.4 })); q.scale.setScalar(2.6); q.position.set(0, 1.35, 0.1); g.add(q); g.position.set(f.position.x, 4.4, BZ + 0.9); g.visible = false; scene.add(g); return g; });
  S.coins = [...Array(10)].map((_, i) => { const c = cyl(0.025, 0.025, 0.005, M.gold, 24); c.visible = false; scene.add(c); return c; });
}
// ---------------------------------------------------------------- tiempos y animación (todo depende solo del instante t)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const fract = x => x - Math.floor(x);
const _o = new THREE.Object3D(), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3();
let TT = {};
function buildTimes() {
  TT = {
    crack: K.no1,                                              // 1: la etiqueta «GRATIS» se raja
    reg: K.gana2,                                              // 2: la caja registradora
    qm: K.truco3, qmOff: K.haz4,                               // 3: «el truco que no ves»
    big0: K.haz4, total: K.n3_4, iva: K.n27_5,                 // 4-5: el vaso gigante, la cuenta
    beer: K.n50_6 + 0.35, quedan: K.quedan7,                   // 6-7: la cerveza (desde la bodega) y lo que queda
    icons: [K.tapa7, K.local7, K.sueldos7, K.ganar7],
    bigOut: K.pero8,                                           // 8: el vaso gigante se va; la segunda caña
    rounds: [K.segunda8, K.ronda9, K.siguiente9, K.mejor9],    // 8-9: las rondas
    salt: K.saladas10, sed: K.sed10, drink: K.paga10, coins: K.canas10,   // 10: la sal, la sed, se pagan cañas
    out: K.pero11,                                             // 11: a la calle
    fly: K.tapa12, ringOn: K.regalo12 + 0.1, enter: K.regalo12,           // 12: la tapa se convierte en el letrero; entra la gente
    adOff: K.ellos13 - 0.25,                                   // 13: el anuncio de pago se apaga con «ellos te la sirven…»
    shops: K.negocio14,                                        // 14: ¿cuál es su tapa?
    poll: K.granada15, serve: K.granada15 + 0.1,               // 15: la votación; el camarero pone otra tapa (bucle)
  };
}
function flick(t, t0, d = 0.32) { const u = (t - t0) / d; if (u <= 0) return 0; if (u >= 1) return 1; return (u > 0.1 && u < 0.22) || (u > 0.38 && u < 0.5) || u > 0.72 ? 1 : 0.12; }

// ---------------------------------------------------------------- la caña y la tapa protagonistas, la etiqueta, la tapa que vuela al letrero
const SIGNP = v3(0, BH + 0.5, BZ + 0.42);
function heroAt(t) {
  // etiqueta: entera hasta «no existe»; se raja y los trozos caen; vuelve entera con la tapa nueva del final
  const P = S.tag.userData.pieces, newT = t >= TT.serve;
  P.forEach((p, i) => { const u = clamp((t - TT.crack - i * 0.03) / 0.55), sd = i % 2 ? 1 : -1, up = i < 2 ? -1 : 1;
    p.position.copy(p.userData.home); p.rotation.set(0, 0, 0);
    if (!newT && u > 0) { p.position.x += sd * 0.05 * u; p.position.y += 0.03 * Math.sin(u * Math.PI) - 0.07 * u * u + up * 0.004; p.position.z += 0.04 * u; p.rotation.set(u * 2.2 * sd, u * 1.4, u * 3 * sd); }
    p.visible = newT || t < TT.fly; });
  S.tag.userData.pick.visible = newT || t < TT.fly;
  // la tapa del principio: en la barra; con «la tapa» (12) vuela, crece y se queda como letrero
  const T0 = S.htapa, home = v3(HERO.x + 0.14, TOP, HERO.z + 0.04);
  if (t < TT.fly) { T0.position.copy(home); T0.rotation.set(0, 0, 0); T0.scale.setScalar(1); }
  else { const u = eio(clamp((t - TT.fly) / 1.25)); _p1.copy(home).lerp(SIGNP, u); _p1.y += Math.sin(Math.PI * u) * 1.6; T0.position.copy(_p1);
    T0.rotation.set(lerp(0, Math.PI / 2, u), 0, Math.sin(u * Math.PI) * 0.6); T0.scale.setScalar(lerp(1, 7.8, u)); }
  // la tapa nueva: el camarero la desliza por la barra hasta el sitio de la primera (antes que la etiqueta, que va con ella)
  S.ntapa.visible = t >= TT.serve - 0.6;
  { const u = eio(clamp((t - TT.serve + 0.6) / 0.7)); S.ntapa.position.set(lerp(home.x + 0.9, home.x, u), TOP, lerp(home.z - 0.25, home.z, u)); }
  // la etiqueta acompaña a su tapa (la del principio o la nueva)
  const tp = newT ? S.ntapa : T0; S.tag.visible = newT || t < TT.fly;
  if (S.tag.visible) { S.tag.position.set(tp.position.x + 0.01, TOP + 0.022, tp.position.z - 0.01); }
  // el letrero de siempre se apaga cuando llega la tapa
  S.barSign.visible = t < TT.fly + 0.95 || t > TT.serve; if (S.barSign.visible) S.barSign.material.opacity = 1;
  // el aro de luz del letrero
  const rk = win(t, TT.ringOn + 0.9, 0.35); S.ring.visible = rk > 0.01; S.ring.material.opacity = rk; S.ring.position.copy(SIGNP).add(v3(0, 0, 0.02));
  S.signGlow.visible = rk > 0.01; S.signGlow.position.copy(SIGNP).add(v3(0, 0, 0.05)); S.signGlow.material.opacity = rk * (0.55 + 0.1 * Math.sin(t * 6)); S.signGlow.quaternion.copy(cam.quaternion);
  // el «?» encima de la tapa
  const qk = cwin(t, TT.qm, TT.qmOff, 0.3, 0.25); S.qm.visible = qk > 0.01;
  if (S.qm.visible) { S.qm.position.set(home.x, TOP + 0.2 + Math.sin(t * 3) * 0.008, home.z); S.qm.scale.setScalar(0.22 * backOut(clamp((t - TT.qm) / 0.35)) * (1 - win(t, TT.qmOff - 0.2, 0.2) * 0.999)); S.qm.rotation.y = t * 1.4; }
  // la caja registradora: el cajón sale y saltan monedas (con «gana dinero» y con «se paga en cañas»)
  const dr = S.reg.userData.drawer, open = Math.max(cwin(t, TT.reg, TT.reg + 0.9, 0.12, 0.3), cwin(t, TT.coins, TT.coins + 0.9, 0.12, 0.3)); dr.position.z = 0.02 + open * 0.22;
  S.coins.forEach((c, i) => { const t0 = (i < 5 ? TT.reg : TT.coins) + (i % 5) * 0.05, u = (t - t0) / 0.7; c.visible = u > 0 && u < 1;
    if (c.visible) { wpos(S.reg, _p2); c.position.set(_p2.x + (hash(i) - 0.5) * 0.2 * u, _p2.y + 0.15 + u * 0.5 - u * u * 0.55, _p2.z + 0.25 + u * 0.1); c.rotation.set(u * 9 + i, u * 4, 0); } });
}

// ---------------------------------------------------------------- el vaso gigante (la cuenta) y los iconos de lo que queda
function bigAt(t) {
  const G = S.big, k = backOut(clamp((t - TT.big0) / 0.55)) * (1 - eio(clamp((t - TT.bigOut) / 0.45)));
  G.visible = k > 0.002; if (!G.visible) return;
  G.scale.set(Math.max(0.0001, k), Math.max(0.0001, k), Math.max(0.0001, k)); G.rotation.y = t * 0.15;
  const fills = [eo(clamp((t - TT.iva) / 0.5)), eo(clamp((t - TT.beer) / 0.9)), eo(clamp((t - TT.quedan) / 0.8))];
  S.layers.forEach((L, i) => { L.visible = fills[i] > 0.003; L.scale.y = Math.max(0.0001, fills[i]); });
  const ly = S.layers[2].userData, cy = ly.y0 + ly.h * 0.5;
  S.icons.forEach((ic, i) => { const t0 = TT.icons[i], u = eo(clamp((t - t0) / 0.6)); ic.visible = u > 0.002;
    if (!ic.visible) return; const a = -0.9 + i * 0.6 - t * 0.15, R = lerp(0.1, 0.78, u), y = lerp(cy, 0.55 + i * 0.28, u);
    ic.position.set(Math.cos(a) * R, y + Math.sin(t * 2 + i) * 0.02, Math.sin(a) * R + 0.15); ic.rotation.y = -G.rotation.y + 0.3 + Math.sin(t + i) * 0.2; ic.scale.setScalar((i === 0 ? 2.2 : i === 2 ? 3.2 : 1) * backOut(clamp((t - t0) / 0.45))); });
  // el chorro de cerveza que sube por el tubo desde la bodega (solo mientras se ve la bodega)
}
function cellarAt(t) {
  const u = clamp((t - (K.cerveza6 + 0.2)) / 1.2); S.beerFlow.visible = u > 0.01 && t < TT.quedan + 0.5;
  if (S.beerFlow.visible) { const n = S.beerFlow.geometry.index ? S.beerFlow.geometry.index.count : S.beerFlow.geometry.attributes.position.count; S.beerFlow.geometry.setDrawRange(0, Math.floor(n * u)); }
}

// ---------------------------------------------------------------- las rondas, la sal y la sed
function roundsAt(t) {
  S.rounds.forEach((R, i) => { const t0 = TT.rounds[i], gone = clamp((t - (TT.shops - 0.4)) / 0.3);
    const k = clamp((t - t0) / 0.45); R.c.visible = R.tp.visible = k > 0 && gone < 1;
    if (!R.c.visible) return;
    const e = eio(k); R.c.position.set(ROUND_X[i + 1] + (1 - e) * 0.5, TOP, HERO.z); R.tp.position.set(ROUND_X[i + 1] + 0.12 + (1 - e) * 0.5, TOP, HERO.z + 0.06);
    R.tp.rotation.y = (1 - e) * 1.5; const s = Math.max(0.0001, 1 - gone); R.c.scale.setScalar(s); R.tp.scale.setScalar(s);
    // «la sed se paga en cañas»: se beben (baja la cerveza) y llegan llenas otra vez
    const d = clamp((t - TT.drink - i * 0.08) / 0.35), r = clamp((t - TT.coins - i * 0.06) / 0.3);
    canaLevel(R.c, t < TT.drink ? 1 : r > 0 ? lerp(0.12, 1, eio(r)) : lerp(1, 0.12, eio(d)));
  });
  canaLevel(S.hero, 1);
  // la sal: destellos sobre las tapas
  const sk = cwin(t, TT.salt, TT.drink + 0.6, 0.2, 0.4); S.salt.visible = sk > 0.01;
  if (S.salt.visible) { const a = S.salt.geometry.attributes.position.array;
    for (let i = 0; i < 160; i++) { const j = i % 5, x = j === 0 ? HERO.x + 0.14 : ROUND_X[j] + 0.12, tt = fract(t * 0.7 + hash(i * 3.1)), y = TOP + 0.14 - tt * 0.12;
      a[i * 3] = x + (hash(i * 5.3) - 0.5) * 0.09; a[i * 3 + 1] = y; a[i * 3 + 2] = HERO.z + 0.06 + (hash(i * 7.7) - 0.5) * 0.08; }
    S.salt.geometry.attributes.position.needsUpdate = true; S.salt.material.opacity = sk; }
}

// ---------------------------------------------------------------- la calle: gente que pasa (bucle exacto) y, con el letrero, entra; el anuncio de pago; las tiendas
const PED_W = 40;
function streetAt(t) {
  const P = S.peds, v0 = PED_W / END;          // cada uno da una vuelta exacta en todo el vídeo
  S.pedData.forEach((d, i) => {
    const v = Math.sign(d.v) * v0 * (1 + (i % 3)), xl = ((d.x0 + v * t + PED_W / 2) % PED_W + PED_W) % PED_W - PED_W / 2;
    let x = xl, z = d.z, sc = 1;
    if (d.enter && t > TT.enter + d.delay) {
      const t1 = TT.enter + d.delay, xe = ((d.x0 + v * t1 + PED_W / 2) % PED_W + PED_W) % PED_W - PED_W / 2, u = clamp((t - t1) / 2.6), e = u * u * (3 - 2 * u);
      const door = v3((hash(i * 4.4) - 0.5) * 3.0, 0, BZ - 0.6);
      x = lerp(xe, door.x, e); z = lerp(d.z, door.z, e); sc = 1 - clamp((u - 0.75) / 0.25);
      if (Math.abs(xe) > 9) sc = 0;            // los que están lejos siguen andando fuera de cuadro
    }
    const hop = Math.abs(Math.sin((x + z) * 3.2)) * 0.04;
    _o.position.set(x, hop, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(Math.max(0.0001, sc)); _o.updateMatrix(); P.setMatrixAt(i, _o.matrix);
  });
  P.instanceMatrix.needsUpdate = true;
  // el anuncio de pago: parpadea y se apaga con «otros pagan publicidad»; vuelve al final (bucle)
  const on = t < TT.adOff ? 1 : 1 - flick(t, TT.adOff + 0.25, 0.45) * 0.88 + win(t, END - 2.5, 0.8) * 0.88;
  S.adFace.material.color.setScalar(lerp(0.12, 1.0, clamp(on)));
  // platos vacíos con «?» sobre las otras tiendas
  S.shopQ.forEach((g, i) => { const k = cwin(t, TT.shops + i * 0.18, TT.poll - 0.2, 0.35, 0.3); g.visible = k > 0.01; if (g.visible) { g.scale.setScalar(Math.max(0.0001, backOut(clamp((t - TT.shops - i * 0.18) / 0.4)) * (k < 1 ? k : 1))); g.children[1].rotation.y = t * 1.6; } });
}
function sceneAt(t) { heroAt(t); bigAt(t); cellarAt(t); roundsAt(t); streetAt(t); }
// ---------------------------------------------------------------- cámara: un solo plano. Empieza pegada a la caña y la tapa con su etiqueta «GRATIS» y acaba
// exactamente igual (el camarero pone otra tapa igual): el último fotograma enlaza con el primero.
let CKS = [];
const K0C = [[-0.03, 1.33, -0.06], [-0.26, 1.2, -0.68], 34];
function buildCam() {
  const S1 = [-0.05, 1.31, -0.13], L1 = [-0.26, 1.19, -0.68];
  CKS = [
    [0, ...K0C],
    [K.en2 - 0.1, S1, L1, 34],
    [K.aun2 + 0.2, [0.5, 1.8, 5.5], [0.0, 1.7, -0.4], 34],                      // 2: sale a la calle: el bar entero y la Alhambra
    [K.dinero2 + 0.4, [0.3, 2.2, 13.5], [0.0, 4.2, 0.0], 34],
    [K.dentro3 - 0.1, [0.2, 1.6, 4.4], [-0.2, 1.3, -0.6], 34],                  // 3: «te lo enseño por dentro»
    [K.ves3 + 0.15, [0.02, 1.45, 1.35], [-0.24, 1.24, -0.66], 34],
    [K.cuenta4 + 0.3, [0.75, 1.25, 5.0], [-0.35, 0.85, 0.95], 34],              // 4: el vaso gigante
    [K.iva5 + 0.2, [0.65, 1.15, 4.8], [-0.35, 0.8, 0.95], 34],
    [K.cerveza6 + 0.05, [0.25, 0.85, 2.0], [0.15, 0.0, 0.1], 34],               // 6: picado a la bodega
    [K.n50_6 - 0.15, [0.95, -1.0, 1.45], [0.2, -1.95, -0.6], 34],
    [K.centimos6 + 0.35, [1.0, -1.15, 1.3], [0.25, -1.85, -0.6], 34],
    [K.quedan7 + 0.3, [0.7, 1.1, 4.8], [-0.35, 0.85, 0.95], 34],                // 7: vuelve al vaso: lo que queda
    [K.ganar7 + 0.4, [0.95, 1.2, 5.2], [-0.3, 0.92, 0.95], 34],
    [K.primera8, [-0.12, 1.42, 0.5], [-0.2, 1.19, -0.68], 34],                   // 8: la barra: la segunda caña
    [K.segunda8 + 0.5, [-0.05, 1.42, 0.48], [-0.12, 1.19, -0.68], 34],
    [K.siguiente9, [0.12, 1.44, 0.52], [0.1, 1.19, -0.68], 34],                  // 9: las rondas
    [K.mejor9 + 0.4, [0.3, 1.45, 0.56], [0.3, 1.19, -0.68], 34],
    [K.sal10 + 0.2, [0.32, 1.38, 0.3], [0.3, 1.18, -0.66], 34],                  // 10: la sal
    [K.canas10 + 0.35, [0.3, 1.5, 0.78], [0.25, 1.2, -0.66], 34],
    [K.otro11 + 0.1, [0.3, 2.2, 13.5], [0.0, 4.1, 0.0], 34],                    // 11: a la calle
    [K.regalo12 + 0.1, [0.2, 2.3, 9.4], [0.0, 3.1, 2.4], 34],                   // 12: la tapa se convierte en el letrero
    [K.bar12, [0.0, 2.2, 10.6], [0.0, 2.7, 2.4], 34],
    [K.publicidad13 - 0.15, [-1.2, 2.6, 16.5], [-1.5, 2.7, 4.0], 34],          // 13: el anuncio de pago, entero al oír «publicidad», frente a la tapa
    [K.sirven13 + 0.2, [-1.3, 2.62, 16.9], [-1.55, 2.7, 4.0], 34],             //     se apaga con «ellos te la sirven…»
    [K.negocio14 + 0.1, [6.2, 3.8, 21.0], [7.0, 4.3, 2.6], 34],                // 14: las otras tiendas
    [K.tapa14 + 0.3, [7.4, 3.8, 21.5], [7.8, 4.4, 2.6], 34],
    [K.granada15 - 0.2, [0.4, 1.7, 2.6], [-0.25, 1.22, -0.6], 34],              // 15: vuelve a la barra
    [END - 1.0, [-0.03, 1.33, -0.05], [-0.26, 1.2, -0.68], 34],
    [END, ...K0C],
  ];
}
function camAt(t) { return camKeys(t, CKS); }
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.crack + 0.02, 0.03], [TT.reg + 0.05, 0.02], [TT.ringOn + 0.9, 0.05]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st0) {
  NOW = t;
  const c = st0.l, d = st0.p.distanceTo(c), yaw = Math.atan2(st0.p.x - c.x, st0.p.z - c.z), k = clamp(d / 3.2, 0.14, 3.2);
  rigAt(c, yaw, k, 0.6, 0.62);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.22;
  scene.fog.density = lerp(0.05, 0.012, clamp((d - 0.6) / 8));
  sceneAt(t);
  post.uniforms.fade.value = 0;
}
// ---------------------------------------------------------------- HUD: el truco pendiente (arriba a la derecha), la cuenta del vaso con su fuente, la bodega,
// las rondas numeradas, el medidor de sed, el anuncio frente a la tapa y la votación final
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
  const items = [['GRANADA', '#62E3D4', 300], ['JAÉN', '#FFC24A', 780]], y = 1370;
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
function hudAt(t) {
  hudBegin();
  const cw2 = (t0, t1, fi = 0.22, fo = 0.22) => win(t, t0, fi) * (1 - win(t, t1, fo));
  // el truco, pendiente hasta la respuesta
  bracketMsg(t, 'EL TRUCO · ???', HC.amber, cw2(K.truco3 + 0.05, K.verdadero11, 0.3, 0.12), true);
  bracketMsg(t, 'EL TRUCO ↓', HGr, cw2(K.verdadero11, K.bar12 + 0.9, 0.12, 0.3), false);
  // 4-7: la cuenta en el vaso gigante
  if (S.big.visible) {
    const k = S.big.scale.x, Ly = i => { const L = S.layers[i].userData; return S.big.localToWorld(v3(0.3, L.y0 + L.h * 0.5, 0.25)); };
    lab(S.big.localToWorld(v3(0.0, BIGH + 0.04, 0)), '3 €', 'CAÑA CON TAPA EN GRANADA', cw2(K.n3_4 - 0.05, K.pero8, 0.25, 0.2) * clamp(k), { color: HC.white, dx: -120, dy: -90 });
    lab(Ly(0), 'IVA · 0,27 €', 'EL 10 % DE LA HOSTELERÍA', cw2(K.n27_5, K.pero8, 0.25, 0.2) * clamp(k), { color: HC.grey, subCol: HC.white, dx: 150, dy: 60 });
    lab(Ly(1), 'CERVEZA · ≈ 0,50 €', 'LO QUE LE CUESTA AL BAR', cw2(TT.beer + 0.2, K.pero8, 0.25, 0.2) * clamp(k), { color: HGd, dx: 150, dy: -10 });
    lab(Ly(2), 'QUEDAN · 2,23 €', 'PARA TODO LO DEMÁS', cw2(K.quedan7 + 0.2, K.pero8, 0.25, 0.2) * clamp(k), { color: '#3FC58F', dx: 150, dy: -110 });
    ['TAPA', 'LOCAL', 'SUELDOS', 'GANAR'].forEach((txt, i) => { const ic = S.icons[i]; if (!ic.visible) return; ic.getWorldPosition(_hv); _hv.y -= 0.16; smallTag(proj(_hv), txt, cw2(TT.icons[i] + 0.15, K.pero8, 0.2, 0.2), i === 3 ? HGd : HC.white); });
  }
  srcLine('GUÍAS DE GRANADA · LEY DEL IVA (10 %) · CERVEZA: ESTIMACIÓN DEL SECTOR', cw2(K.n3_4, K.pero8));
  // 6: la bodega
  { const kg = S.kegs[2]; kg.getWorldPosition(_hv); _hv.y += 0.62; lab(_hv.clone(), 'UN BARRIL DE 30 LITROS', '≈ 150 CAÑAS · ≈ 0,50 € CADA UNA', cw2(K.cerveza6 + 0.6, K.quedan7 - 0.25), { color: HGd, dx: -130, dy: -150 }); }
  // 8-9: las rondas, numeradas
  const rk = [S.hero, ...S.rounds.map(r => r.c)];
  rk.forEach((c, i) => { if (!c.visible) return; c.getWorldPosition(_hv); _hv.y += 0.2; const t0 = i === 0 ? K.primera8 : TT.rounds[i - 1] + 0.15;
    smallTag(proj(_hv), (i + 1) + '.ª', cw2(t0, K.pero11, 0.2, 0.25), i === 0 ? HC.white : HGd, 26); });
  // 10: la sed sube con la sal y baja cuando llega otra caña
  const lv = clamp((t - TT.salt) / (TT.drink - TT.salt)) * 0.92 * (1 - eio(clamp((t - TT.coins) / 0.4)) * 0.85);
  thirst(t, cw2(TT.salt + 0.1, K.pero11 - 0.05, 0.25, 0.25), lv);
  // 12-13: la tapa es el anuncio; el anuncio de pago, apagado
  if (S.ring.visible) { lab(SIGNP.clone().add(v3(0.55, -0.1, 0.1)), 'SU ANUNCIO', 'SE SIRVE EN UN PLATO', cw2(K.anuncio12, K.negocio14 - 0.1), { color: HGd, dx: 150, dy: 160 }); }
  { S.adFace.getWorldPosition(_hv); lab(_hv.clone().add(v3(0.0, 0.7, 0)), 'PUBLICIDAD', 'SE PAGA', cw2(K.publicidad13 + 0.05, K.negocio14 - 0.1), { color: HC.grey, subCol: HC.white, dx: -110, dy: -140 }); }
  // 15: ¿Granada o Jaén?
  pollPills(t, cw2(K.granada15 - 0.05, END - 0.35, 0.35, 0.3));
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
    tapa1: atL(1, 'tapa'), gratis1: atL(1, 'gratis'), no1: atL(1, '=no'), existe1: atL(1, 'existe'),
    en2: atL(2, '=en'), granada2: atL(2, 'granada'), ponen2: atL(2, 'ponen'), cana2: atL(2, 'cana'), aun2: atL(2, 'aun'), bar2: atL(2, '=bar'), gana2: atL(2, 'gana'), dinero2: atL(2, 'dinero'),
    como3: atL(3, 'como'), dentro3: atL(3, 'dentro'), final3: atL(3, 'final'), truco3: atL(3, 'truco'), ves3: atL(3, 'ves'),
    haz4: atL(4, 'haz'), cuenta4: atL(4, 'cuenta'), cana4: atL(4, 'cana'), tapa4: atL(4, 'tapa'), n3_4: atL(4, '=3'), euros4: atL(4, 'euros'),
    n27_5: atL(5, '=27'), centimos5: atL(5, 'centimos'), iva5: atL(5, 'iva'),
    cerveza6: atL(6, 'cerveza'), cuesta6: atL(6, 'cuesta'), n50_6: atL(6, '=50'), centimos6: atL(6, 'centimos'),
    quedan7: atL(7, 'quedan'), n2_7: atL(7, '=2'), tapa7: atL(7, 'tapa'), local7: atL(7, 'local'), sueldos7: atL(7, 'sueldos'), ganar7: atL(7, 'ganar'),
    pero8: atL(8, 'pero'), negocio8: atL(8, 'negocio'), primera8: atL(8, 'primera'), cana8: atL(8, 'cana'), segunda8: atL(8, 'segunda'),
    tapa9: atL(9, 'tapa'), cambia9: atL(9, 'cambia'), ronda9: atL(9, 'ronda'), siguiente9: atL(9, 'siguiente'), mejor9: atL(9, 'mejor'),
    muchas10: atL(10, 'muchas'), saladas10: atL(10, 'saladas'), sal10: atL(10, '=sal'), sed10: atL(10, '=sed'), sed10b: atL(10, '=sed', 2), paga10: atL(10, 'paga'), canas10: atL(10, 'canas'),
    pero11: atL(11, 'pero'), verdadero11: atL(11, 'verdadero'), truco11: atL(11, 'truco'), otro11: atL(11, 'otro'),
    tapa12: atL(12, 'tapa'), regalo12: atL(12, 'regalo'), anuncio12: atL(12, 'anuncio'), bar12: atL(12, '=bar'),
    mientras13: atL(13, 'mientras'), publicidad13: atL(13, 'publicidad'), ellos13: atL(13, 'ellos'), sirven13: atL(13, 'sirven'), plato13: atL(13, 'plato'),
    negocio14: atL(14, 'negocio'), cual14: atL(14, 'cual'), tapa14: atL(14, 'tapa'),
    mandaselo15: atL(15, 'mandaselo'), gratis15: atL(15, 'gratis'), granada15: atL(15, 'granada'), jaen15: atL(15, 'jaen'),
  };
  mats(); buildMats(); buildBarMats(); buildRig();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.42; }
  scene.fog = new THREE.FogExp2(0x000000, 0.03);
  buildFlow(); buildFloor(); buildBar(); buildHero();
  buildTimes();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.TT = TT; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
