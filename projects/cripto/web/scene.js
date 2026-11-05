// «El mayor robo de criptomonedas de la historia» (hackeo a Binance, 29-10-2026): el portátil de un ingeniero con una videollamada falsa,
// la cartera caliente (cámara acorazada de monedas) conectada a internet, el programa espía, diez cadenas de bloques por las que se escapan
// las monedas, las torres del récord, el hielo de lo congelado y la cartera que se vuelve a llenar. window.renderAt(t) dibuja el instante t.
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
// ---------------------------------------------------------------- piezas: la mesa con el portátil del ingeniero, los otros dos portátiles, la cartera caliente (cámara
// acorazada de cristal llena de monedas) conectada a internet, los cables, el programa espía, las diez cadenas de bloques, las torres del récord y el hielo
let FONT3 = null;
const DESK = { y: 0.74 };
const LAP = { w: 0.66, d: 0.44, sw: 0.6, sh: 0.38, th: 0.018 };       // portátil: base w × d; pantalla sw × sh
const SCRW = 960, SCRH = 608;                                         // lienzo de la pantalla principal
const MAIN = v3(0, DESK.y, 0.55);                                     // portátil del ingeniero (centro de la base)
const SIDE = [v3(-0.6, DESK.y, 0.2), v3(0.6, DESK.y, 0.2)];          // los otros dos ingenieros (en la misma mesa, detrás)
const VAULT = { x: 0, z: -1.5, w: 1.3, h: 1.2, d: 1.0, base: 0.12 };
const NCOIN = 1400, NCH = 10, NBLK = 16, NFZ = 160;
const FROZEN = [1, 3, 6, 8];                                          // cadenas congeladas (≈ 2.850 de 6.300 M$: unas 4 de 10)
const NET = v3(0, 2.55, VAULT.z);                                     // «internet»: el nodo encima de la cartera

function keyTex() { return canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#16181c'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) { g.fillStyle = '#2b2f36'; rr(g, 14 + c * 35, 12 + r * 36, 30, 30, 5); g.fill(); }
  g.fillStyle = '#23262c'; rr(g, 160, 200, 190, 44, 8); g.fill(); }); }
function laptop(scale = 1) {
  const g = new THREE.Group(), bodyM = new THREE.MeshPhysicalMaterial({ color: 0x2b2e35, roughness: 0.32, metalness: 0.75, clearcoat: 0.6 });
  const base = rbox(LAP.w, LAP.d, LAP.th, bodyM, 0.02); base.rotation.x = -Math.PI / 2; base.position.y = LAP.th / 2; g.add(base);
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(LAP.w * 0.86, LAP.d * 0.5), new THREE.MeshStandardMaterial({ map: keyTex(), roughness: 0.7 }));
  kb.rotation.x = -Math.PI / 2; kb.position.set(0, LAP.th + 0.0008, -0.03); g.add(kb);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshStandardMaterial({ color: 0x3a3e46, roughness: 0.4 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, LAP.th + 0.0008, 0.15); g.add(pad);
  const hinge = new THREE.Group(); hinge.position.set(0, LAP.th, -LAP.d / 2 + 0.01); g.add(hinge);
  const LH = LAP.sh + 0.05, lid = rbox(LAP.w, LH, 0.012, bodyM, 0.02); lid.position.set(0, LH / 2, 0); hinge.add(lid);
  const T = canvasTex(Math.round(SCRW * scale), Math.round(SCRH * scale));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(LAP.sw, LAP.sh), new THREE.MeshBasicMaterial({ map: T, toneMapped: false, color: new THREE.Color(1.08, 1.08, 1.08) }));
  scr.position.set(0, LH / 2 + 0.006, 0.0066); hinge.add(scr);
  hinge.rotation.x = -0.3;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(scale); g.userData = { T, scr, hinge }; return g;
}
function desk(w, d) {
  const g = new THREE.Group(), top = rbox(w, d, 0.05, new THREE.MeshPhysicalMaterial({ color: 0x1b1d22, roughness: 0.45, clearcoat: 0.4 }), 0.02);
  top.rotation.x = -Math.PI / 2; top.position.y = DESK.y - 0.025; g.add(top);
  for (const sx of [-1, 1]) { const p = rbox(0.04, DESK.y - 0.05, d * 0.9, metal(0x5d636d, 0.35), 0.01); p.position.set(sx * (w / 2 - 0.08), (DESK.y - 0.05) / 2, 0); g.add(p); }
  return g;
}

// ---------------------------------------------------------------- monedas (de oro, con el símbolo grabado) y la cartera
let COIN_GEO = null, COIN_MATS = null;
function coinParts() {
  if (COIN_GEO) return;
  COIN_GEO = new THREE.CylinderGeometry(0.055, 0.055, 0.01, 30);
  const face = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w * 0.4, h * 0.35, 10, w / 2, h / 2, w * 0.6); gr.addColorStop(0, '#fff1b8'); gr.addColorStop(0.6, '#e8b23a'); gr.addColorStop(1, '#b8801c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,70,10,.75)'; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, 7); g.stroke();
    g.fillStyle = 'rgba(120,70,10,.85)'; g.font = `900 ${h * 0.46}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₿', w / 2, h * 0.53); });
  const side = new THREE.MeshPhysicalMaterial({ color: 0xffc85a, metalness: 1, roughness: 0.28 });
  const top = new THREE.MeshPhysicalMaterial({ map: face, metalness: 0.85, roughness: 0.3 });
  COIN_MATS = [side, top, top];
}
function buildVault() {
  const g = new THREE.Group(); g.position.set(VAULT.x, 0, VAULT.z);
  const base = rbox(VAULT.w + 0.14, VAULT.base, VAULT.d + 0.14, metal(0x2c3036, 0.35), 0.03); base.rotation.x = -Math.PI / 2; base.position.y = VAULT.base / 2; g.add(base);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(VAULT.w, VAULT.h, VAULT.d), new THREE.MeshPhysicalMaterial({ color: 0xdfe8f2, transparent: true, opacity: 0.1, roughness: 0.06, depthWrite: false, side: THREE.DoubleSide }));
  glass.position.y = VAULT.base + VAULT.h / 2; glass.renderOrder = 3; edges(glass, 0xe6ecf2, 1.8, 28, 0.85); g.add(glass);
  const top = rbox(VAULT.w + 0.06, VAULT.d + 0.06, 0.05, metal(0x3a3f47, 0.3), 0.02); top.rotation.x = -Math.PI / 2; top.position.y = VAULT.base + VAULT.h + 0.025; g.add(top);
  const dial = cyl(0.11, 0.11, 0.04, metal(0x9aa0a8, 0.25), 40); dial.rotation.x = Math.PI / 2; dial.position.set(0.42, VAULT.base + VAULT.h * 0.55, VAULT.d / 2 + 0.03); g.add(dial);
  const led = sph(0.025, new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0x35ff8a, emissiveIntensity: 3 })); led.position.set(0.42, VAULT.base + VAULT.h * 0.55 + 0.17, VAULT.d / 2 + 0.03); g.add(led);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(VAULT.w * 1.6, VAULT.d * 1.6), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (c) => { const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,170,60,.85)'); gr.addColorStop(1, 'rgba(255,120,30,0)'); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = VAULT.base + 0.004; g.add(glow);
  const plate = textPlane(0.9, 0.08, (c, w, h) => { c.fillStyle = '#e8edf3'; c.font = `700 ${h * 0.62}px SpaceMono`; c.letterSpacing = '6px'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CARTERA CALIENTE', w / 2, h / 2); }, 640);
  plate.position.set(0, VAULT.base / 2, VAULT.d / 2 + 0.072); g.add(plate);
  g.traverse(o => { if (o.isMesh && o !== glass && o !== glow && o !== plate) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g); S.vault = { g, led, glow, glass };
}

// ---------------------------------------------------------------- cables (con un brillo que corre por dentro) y el nodo de internet
function flowTex() { const T = canvasTex(256, 8, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.45, 'rgba(255,255,255,.15)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.15)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  T.wrapS = T.wrapT = THREE.RepeatWrapping; return T; }
function cable(pts, r = 0.012) {
  const curve = new THREE.CatmullRomCurve3(pts), T = flowTex(); T.repeat.set(Math.max(1, Math.round(curve.getLength() * 1.6)), 1);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, r, 8), new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.5, emissive: 0xffffff, emissiveMap: T, emissiveIntensity: 1.2 }));
  m.castShadow = true; scene.add(m); return { m, curve, T };
}
function buildNet() {
  const g = new THREE.Group(); g.position.copy(NET);
  const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 2), new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.6, transparent: true, opacity: 0.85 }));
  edges(ico, 0xeef4ff, 1.4, 1, 0.9); g.add(ico);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.006, 8, 120), basicGlow(0xffffff, 1.4)); ring.rotation.x = Math.PI / 2.3; g.add(ring);
  scene.add(g); S.net = { g, ico, ring };
}

// ---------------------------------------------------------------- el programa espía (un bicho negro de ojos rojos)
function buildBug() {
  const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, roughness: 0.2, metalness: 0.4, clearcoat: 1 });
  const body = sph(0.034, m, 24, 16); body.scale.set(1, 0.62, 1.35); g.add(body);
  const head = sph(0.019, m, 18, 12); head.position.set(0, 0.004, 0.05); g.add(head);
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x150000, emissive: 0xff2a2a, emissiveIntensity: 5 });
  for (const sx of [-1, 1]) { const e = sph(0.0055, eyeM, 10, 8); e.position.set(sx * 0.009, 0.012, 0.064); g.add(e); }
  const legM = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.4 });
  const legs = [];
  for (const sx of [-1, 1]) for (const k of [-1, 0, 1]) { const piv = new THREE.Group(); piv.position.set(sx * 0.022, 0, k * 0.022); g.add(piv);
    const L = cyl(0.0028, 0.002, 0.06, legM, 6); L.rotation.z = sx * 1.1; L.position.set(sx * 0.024, -0.008, 0); piv.add(L); legs.push({ piv, sx, k }); }
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,40,40,.7)'); gr.addColorStop(1, 'rgba(255,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  gl.rotation.x = -Math.PI / 2; gl.position.y = -0.02; g.add(gl);
  g.traverse(o => { if (o.isMesh && o !== gl) o.castShadow = true; });
  g.userData = { legs }; scene.add(g); return g;
}

// ---------------------------------------------------------------- las diez cadenas de bloques (caras oscuras con aristas blancas)
function chainCurve(c) {
  const a = lerp(-1.15, 1.15, c / (NCH - 1)), dx = Math.sin(a), dz = -Math.cos(a);
  const s = v3(VAULT.x + dx * 0.5, VAULT.base + VAULT.h * 0.8, VAULT.z + dz * 0.4), pts = [];
  for (let k = 0; k <= 8; k++) { const u = k / 8, r = 0.15 + 9 * u; pts.push(v3(s.x + dx * r, s.y + 1.3 * u + 0.5 * Math.sin(u * Math.PI), s.z + dz * r)); }
  return new THREE.CatmullRomCurve3(pts);
}
function buildChains() {
  S.chains = [];
  for (let c = 0; c < NCH; c++) {
    const curve = chainCurve(c), mat = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.6, metalness: 0.1, emissive: 0x000000 });
    const blocks = [];
    for (let k = 0; k < NBLK; k++) { const u = (k + 0.5) / NBLK, p = curve.getPointAt(u), b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), mat);
      b.castShadow = true; edges(b, 0xe6ecf2, 1.3, 28, 0.9); b.position.copy(p); b.lookAt(curve.getPointAt(Math.min(1, u + 0.01))); scene.add(b); blocks.push({ b, u }); }
    const line = drawLine(curve.getSpacedPoints(80), 0xe6ecf2, 1.6, 0.6); scene.add(line);
    S.chains.push({ curve, mat, blocks, line });
  }
  S.ice = sparks(scene, 220, 0xcfeeff, 0.05);
}

// ---------------------------------------------------------------- las torres del récord (monedas apiladas) y el reloj de los 20 minutos
function buildTowers() {
  coinParts();
  const mk = (n, x) => { const im = new THREE.InstancedMesh(COIN_GEO, COIN_MATS, n); im.castShadow = true; im.frustumCulled = false; scene.add(im); return { im, n, x }; };
  S.towers = [mk(60, -0.6), mk(252, 0.6)];      // 1.500 M$ (Bybit, 2025) frente a 6.300 M$ (Binance, 2026): 4,2 veces
}

// ---------------------------------------------------------------- todo junto
function buildCripto() {
  coinParts();
  const d = desk(1.9, 0.95); d.position.set(0, 0, 0.5); scene.add(d);
  S.lap = laptop(1); S.lap.position.copy(MAIN); scene.add(S.lap);
  S.side = SIDE.map(p => { const l = laptop(0.72); l.position.set(p.x, DESK.y, p.z); l.rotation.y = -Math.sign(p.x) * 0.35; scene.add(l); return l; });
  buildVault(); buildNet();
  // cables: de cada portátil al suelo y a la cartera; de la cartera a internet
  const vF = v3(VAULT.x, 0.03, VAULT.z + VAULT.d / 2 + 0.1);
  S.cMain = cable([v3(0.12, DESK.y + 0.012, MAIN.z - LAP.d / 2 - 0.02), v3(0.1, DESK.y + 0.012, 0.12), v3(0.05, DESK.y + 0.01, 0.06), v3(0, 0.4, 0.0), v3(0, 0.03, -0.25), v3(0.05, 0.03, -0.6), vF]);
  S.cSide = SIDE.map((p, i) => { const sx = Math.sign(p.x); return cable([v3(p.x + sx * 0.05, DESK.y + 0.012, p.z - 0.16), v3(sx * 0.82, DESK.y + 0.012, 0.06), v3(sx * 0.98, 0.4, -0.02), v3(sx * 1.02, 0.03, -0.3),
    v3(sx * 1.02, 0.03, VAULT.z + 0.25), v3(sx * (VAULT.w / 2 + 0.12), 0.03, VAULT.z)]); });
  S.cNet = cable([v3(VAULT.x, VAULT.base + VAULT.h + 0.05, VAULT.z), v3(VAULT.x + 0.04, 1.85, VAULT.z), v3(NET.x, NET.y - 0.33, NET.z)], 0.014);
  // monedas: las de la cartera (y las que se escapan) y las congeladas
  S.coins = new THREE.InstancedMesh(COIN_GEO, COIN_MATS, NCOIN); S.coins.castShadow = true; S.coins.frustumCulled = false; scene.add(S.coins);
  S.fcoins = new THREE.InstancedMesh(COIN_GEO, COIN_MATS, NFZ); S.fcoins.frustumCulled = false; scene.add(S.fcoins);
  const ice = new THREE.Color(0xbfe6ff); for (let i = 0; i < NFZ; i++) S.fcoins.setColorAt(i, ice); S.fcoins.instanceColor.needsUpdate = true;
  // el montón dentro de la cartera: más alto en el centro; las de arriba son las primeras en salir
  const pile = [];
  for (let i = 0; i < NCOIN; i++) { const x = (hash(i * 1.31) - 0.5) * (VAULT.w - 0.16), z = (hash(i * 2.17) - 0.5) * (VAULT.d - 0.14), r = Math.hypot(x / (VAULT.w / 2), z / (VAULT.d / 2));
    const hmax = 0.12 + 0.62 * Math.max(0, 1 - r * r); pile.push({ p: v3(VAULT.x + x, VAULT.base + 0.01 + hmax * Math.pow(hash(i * 3.71), 0.6), VAULT.z + z), rx: (hash(i * 4.3) - 0.5) * 0.9, rz: (hash(i * 5.9) - 0.5) * 0.9, ry: hash(i * 6.1) * 6.28 }); }
  S.pile = pile; S.outOrder = pile.map((q, i) => i).sort((a, b) => pile[b].p.y - pile[a].p.y); S.outRank = new Array(NCOIN); S.outOrder.forEach((i, k) => (S.outRank[i] = k));
  S.bug = buildBug(); S.bugs = [buildBug(), buildBug()];
  buildChains(); buildTowers();
}
// ---------------------------------------------------------------- tiempos y animación (todo es función del instante t)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const easeIn = x => x * x * x;
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
function bez(p0, p1, p2, p3, u, out) { const v = 1 - u; return out.set(0, 0, 0).addScaledVector(p0, v * v * v).addScaledVector(p1, 3 * v * v * u).addScaledVector(p2, 3 * v * u * u).addScaledVector(p3, u * u * u); }
let TT = {};
const SUCK = 1.3;                                    // lo que tarda una moneda en meterse en la pantalla
function buildTimes() {
  TT = {
    rew0: K.binance3 - 0.15,                         // el dinero vuelve a estar en la cartera (empieza la historia)
    hot0: K.carteras3, net0: K.conectadas3,          // cartera caliente, conectada a internet
    mail0: K.oferta4 - 0.1, call0: K.videollamadas5, hr: K.recursos5, ceo: K.jefe5, fake: K.existe5,
    test0: K.prueba6, run: K.ejecutar6, bug0: K.programa7, av: K.antivirus7, calm: K.pero8, wait: K.esperaron8,
    ai: K.ia9, jump: K.saltaron9, land: K.ingenieros9 + 0.2,
    date: K.n29_10, attack: K.atacan10, timer0: K.n20_10, timer1: K.salen10, out0: K.salen10 - 0.1, chain0: K.salen10 - 0.25,
    big: K.mayor11, x4: K.cuatro11, rec: K.record11, fbi: K.fbi12, niegan: K.niegan12,
    money: K.y13, frz: K.congelado13 - 0.1, ref0: K.resto14, dlg: K.entrevista15 - 0.15, sus: K.sospecha15, chOut: K.entrevista15 - 0.3,
    loop: END - 1.25,
  };
}

// ---------------------------------------------------------------- pantallas (lienzo 2D)
function silhouette(g, cx, cy, s, col = '#8a919c') {      // persona sin cara (recreación)
  g.fillStyle = col; g.beginPath(); g.arc(cx, cy - s * 0.32, s * 0.2, 0, 7); g.fill();
  g.beginPath(); g.ellipse(cx, cy + s * 0.32, s * 0.42, s * 0.3, 0, Math.PI, 0); g.fill();
}
function topBar(g, W2, title, col = '#e8ecf2') {
  g.fillStyle = '#15181e'; g.fillRect(0, 0, W2, 54); g.fillStyle = col; g.font = '700 24px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(title, 24, 28);
  [['#ff5f57', 0], ['#febc2e', 1], ['#28c840', 2]].forEach(([c, i]) => { g.fillStyle = c; g.beginPath(); g.arc(W2 - 90 + i * 26, 28, 8, 0, 7); g.fill(); });
}
function drawCall(g, t, W2, H2, glow) {
  g.fillStyle = '#0d0f13'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'Videollamada · Entrevista de trabajo');
  g.fillStyle = '#1d2129'; rr(g, 24, 70, W2 - 48, H2 - 160, 18); g.fill(); silhouette(g, W2 / 2, H2 / 2 - 10, 260);
  g.fillStyle = 'rgba(0,0,0,.55)'; rr(g, 40, H2 - 150, 250, 44, 10); g.fill(); g.fillStyle = '#fff'; g.font = '700 22px Inter'; g.fillText('Recursos Humanos', 56, H2 - 128);
  g.fillStyle = Math.sin(t * 6) > 0 ? '#ff4b4b' : '#7a2020'; g.beginPath(); g.arc(W2 - 70, 98, 9, 0, 7); g.fill();
  [[-90, '#2a2f38'], [0, '#e5484d'], [90, '#2a2f38']].forEach(([dx, c]) => { g.fillStyle = c; g.beginPath(); g.arc(W2 / 2 + dx, H2 - 46, 26, 0, 7); g.fill(); });
  if (glow > 0.01) { const gr = g.createRadialGradient(W2 / 2, H2 / 2 - 20, 0, W2 / 2, H2 / 2 - 20, W2 * 0.45); gr.addColorStop(0, `rgba(255,214,120,${0.85 * glow})`); gr.addColorStop(1, 'rgba(255,170,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2); }
}
function drawDash(g, t, W2, H2) {
  g.fillStyle = '#0d0f13'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'Operaciones · cartera caliente');
  g.fillStyle = '#7cf0a9'; g.font = '700 26px SpaceMono'; g.fillText('● CONECTADA A INTERNET', 30, 100);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(30, 150 + i * 60); g.lineTo(W2 - 30, 150 + i * 60); g.stroke(); }
  g.strokeStyle = '#ffc24a'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 60; i++) { const x = 30 + (W2 - 60) * i / 60, y = 330 - 90 * Math.sin(i * 0.21 + t * 0.6) * 0.5 - i * 1.6; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
}
function drawMail(g, t, W2, H2, k) {
  g.fillStyle = '#f4f5f7'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'Correo');
  g.fillStyle = '#111'; g.font = '800 34px Inter'; g.textAlign = 'left'; g.fillText('Nueva oferta de trabajo', 40, 112);
  g.fillStyle = '#5b616b'; g.font = '600 22px Inter'; g.fillText('De: Director de proyecto · plataforma de empleo', 40, 152);
  g.fillStyle = 'rgba(0,0,0,.14)'; for (let i = 0; i < 6; i++) { rr(g, 40, 200 + i * 40, (W2 - 80) * (i === 5 ? 0.5 : 0.85 + 0.15 * hash(i)), 16, 8); g.fill(); }
  g.fillStyle = '#2563eb'; rr(g, 40, H2 - 110, 220, 64, 32); g.fill(); g.fillStyle = '#fff'; g.font = '800 24px Inter'; g.textAlign = 'center'; g.fillText('Responder', 150, H2 - 78);
  if (k < 1) { g.fillStyle = `rgba(0,0,0,${1 - k})`; g.fillRect(0, 0, W2, H2); }
}
function drawTwo(g, t, W2, H2) {
  g.fillStyle = '#0d0f13'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'Videollamada · 2.ª entrevista');
  const tw = (W2 - 72) / 2, th = H2 - 150;
  const tile = (x, on, name, ceo) => { if (on <= 0.01) return; g.save(); g.globalAlpha = on; g.fillStyle = '#1d2129'; rr(g, x, 76, tw, th, 16); g.fill(); silhouette(g, x + tw / 2, 76 + th / 2, 190);
    g.fillStyle = 'rgba(0,0,0,.55)'; rr(g, x + 14, 76 + th - 54, tw * 0.62, 40, 10); g.fill(); g.fillStyle = '#fff'; g.font = '700 20px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(name, x + 28, 76 + th - 34);
    if (ceo) { const gl = win(t, TT.fake, 0.15); g.strokeStyle = gl > 0.5 ? '#ff4b4b' : 'rgba(255,255,255,.5)'; g.setLineDash([8, 6]); g.lineWidth = 3; rr(g, x + tw - 110, 92, 90, 90, 12); g.stroke(); g.setLineDash([]);
      g.fillStyle = gl > 0.5 ? '#ff4b4b' : 'rgba(255,255,255,.6)'; g.font = '900 54px Inter'; g.textAlign = 'center'; g.fillText('?', x + tw - 65, 140);
      if (gl > 0.01 && Math.sin(t * 40) > 0) { g.fillStyle = 'rgba(255,60,60,.25)'; g.fillRect(x, 76 + th * hash(Math.floor(t * 30)), tw, 18); } }
    g.restore(); };
  tile(24, win(t, TT.hr - 0.1, 0.2), 'Recursos Humanos', false); tile(48 + tw, win(t, TT.ceo - 0.1, 0.2), 'CEO', true);
}
function drawCode(g, t, W2, H2, stage) {      // editor + terminal de la «prueba técnica»
  g.fillStyle = '#0f1116'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'prueba-tecnica — editor');
  g.fillStyle = '#151820'; g.fillRect(0, 54, 210, H2 - 54); g.fillStyle = '#9aa1ab'; g.font = '600 20px SpaceMono'; g.textAlign = 'left'; g.textBaseline = 'middle';
  ['prueba-tecnica/', '  README.md', '  instalar.sh', '  src/', '  test/'].forEach((s, i) => g.fillText(s, 16, 90 + i * 34));
  for (let i = 0; i < 9; i++) { g.fillStyle = ['#7aa2f7', '#9ece6a', '#bb9af7', '#e0af68'][i % 4]; g.globalAlpha = 0.75; rr(g, 240 + (i % 3) * 30, 84 + i * 30, 160 + 260 * hash(i * 2.3), 14, 7); g.fill(); } g.globalAlpha = 1;
  const ty = H2 - 190; g.fillStyle = '#07080b'; g.fillRect(210, ty, W2 - 210, 190); g.fillStyle = '#7cf0a9'; g.font = '700 22px SpaceMono';
  const cmd = '$ ./instalar.sh && ejecutar prueba', k = clamp((t - TT.run + 0.1) / 0.5); g.fillText(cmd.slice(0, Math.floor(cmd.length * k)), 230, ty + 34);
  if (k >= 1) { const p = clamp((t - TT.run - 0.45) / 1.2); g.fillStyle = '#2a2f38'; rr(g, 230, ty + 70, W2 - 280, 18, 9); g.fill(); g.fillStyle = '#7cf0a9'; rr(g, 230, ty + 70, (W2 - 280) * p, 18, 9); g.fill();
    if (p >= 1) { g.fillStyle = '#e6ebf2'; g.fillText('✓ Prueba completada', 230, ty + 124); } }
  if (stage === 'bug' && Math.sin(t * 23) > 0.6) { g.fillStyle = 'rgba(255,40,40,.22)'; g.fillRect(0, 54 + (H2 - 54) * hash(Math.floor(t * 20)), W2, 26); }
}
function drawAV(g, t, W2, H2, k) {
  if (k <= 0.01) return; g.save(); g.globalAlpha = k; const w = 420, h = 150, x = W2 - w - 24, y = 70;
  g.fillStyle = '#1b2a20'; rr(g, x, y, w, h, 16); g.fill(); g.strokeStyle = '#3ddc84'; g.lineWidth = 3; rr(g, x, y, w, h, 16); g.stroke();
  g.fillStyle = '#3ddc84'; g.font = '900 54px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('✓', x + 60, y + h / 2);
  g.textAlign = 'left'; g.fillStyle = '#e6ebf2'; g.font = '800 26px Inter'; g.fillText('Antivirus', x + 110, y + 56); g.fillStyle = '#9fe8bd'; g.font = '700 24px Inter'; g.fillText('Sin amenazas', x + 110, y + 96); g.restore();
}
function drawAI(g, t, W2, H2) {
  g.fillStyle = '#0f1116'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'Asistente IA interno', '#ffb4b4');
  for (let i = 0; i < 5; i++) { const on = win(t, TT.ai + 0.2 + i * 0.35, 0.2); if (on <= 0) break; g.globalAlpha = on; const me = i % 2 === 0;
    g.fillStyle = me ? '#3b1d22' : '#1d2129'; rr(g, me ? W2 - 520 : 30, 80 + i * 92, 490, 70, 18); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; rr(g, (me ? W2 - 500 : 50), 100 + i * 92, 300 + 120 * hash(i), 14, 7); g.fill(); rr(g, (me ? W2 - 500 : 50), 124 + i * 92, 200 + 100 * hash(i + 3), 14, 7); g.fill(); }
  g.globalAlpha = 1; g.fillStyle = 'rgba(255,40,40,.12)'; g.fillRect(0, 0, W2, H2);
}
function drawAlert(g, t, W2, H2) {
  g.fillStyle = '#1a0607'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'Operaciones · cartera caliente', '#ffb4b4');
  g.fillStyle = Math.sin(t * 8) > 0 ? '#ff4b4b' : '#a01d1d'; g.font = '900 52px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚠ RETIRADAS EN CURSO', W2 / 2, 140);
  g.font = '700 24px SpaceMono'; g.textAlign = 'left';
  for (let i = 0; i < 7; i++) { const n = Math.floor(t * 12) + i; g.fillStyle = `rgba(255,180,180,${0.85 - i * 0.1})`; g.fillText(`− ${(hash(n) * 900 + 50).toFixed(2)} → 0x${Math.floor(hash(n * 3.3) * 0xffffff).toString(16).padStart(6, '0')}…`, 60, 230 + i * 44); }
}
function drawOk(g, t, W2, H2) {
  g.fillStyle = '#07140c'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'Operaciones · cartera caliente', '#b9f5cf');
  g.fillStyle = '#3ddc84'; g.font = '900 52px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('✓ FONDOS REPUESTOS', W2 / 2, H2 / 2 - 30);
  g.fillStyle = '#9fe8bd'; g.font = '700 26px Inter'; g.fillText('Según Binance, ningún cliente pierde dinero', W2 / 2, H2 / 2 + 40);
}
function drawDialog(g, t, W2, H2) {
  drawCode(g, t, W2, H2, ''); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W2, H2);
  const w = 620, h = 300, x = (W2 - w) / 2, y = (H2 - h) / 2, warn = win(t, TT.sus - 0.05, 0.15);
  g.fillStyle = '#f4f5f7'; rr(g, x, y, w, h, 22); g.fill();
  if (warn > 0) { g.strokeStyle = `rgba(255,59,59,${warn})`; g.lineWidth = 10; rr(g, x - 6, y - 6, w + 12, h + 12, 26); g.stroke(); }
  g.fillStyle = '#ffc24a'; rr(g, x + 34, y + 40, 76, 92, 10); g.fill(); g.fillStyle = '#7a5410'; g.font = '800 20px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ZIP', x + 72, y + 98);
  g.textAlign = 'left'; g.fillStyle = '#111'; g.font = '800 30px Inter'; g.fillText('prueba_tecnica.zip', x + 134, y + 70); g.fillStyle = '#5b616b'; g.font = '600 22px Inter'; g.fillText('¿Descargar y ejecutar?', x + 134, y + 110);
  g.fillStyle = '#e5484d'; rr(g, x + 34, y + h - 92, 260, 60, 30); g.fill(); g.fillStyle = '#2a2f38'; rr(g, x + w - 294, y + h - 92, 260, 60, 30); g.fill();
  g.fillStyle = '#fff'; g.font = '800 24px Inter'; g.textAlign = 'center'; g.fillText('Ejecutar', x + 164, y + h - 62); g.fillText('Cancelar', x + w - 164, y + h - 62);
}
function drawMain(t, glow) {
  const T = S.lap.userData.T, g = T.userData.g, W2 = T.userData.c.width, H2 = T.userData.c.height; g.setTransform(1, 0, 0, 1, 0, 0);
  if (t < TT.rew0 - 0.2 || t >= TT.loop) drawCall(g, t, W2, H2, glow);
  else if (t < TT.mail0) drawDash(g, t, W2, H2);
  else if (t < TT.call0) drawMail(g, t, W2, H2, win(t, TT.mail0, 0.25));
  else if (t < TT.test0) drawTwo(g, t, W2, H2);
  else if (t < TT.calm) { drawCode(g, t, W2, H2, t > TT.bug0 ? 'bug' : ''); drawAV(g, t, W2, H2, cwin(t, TT.av - 0.05, TT.calm, 0.15, 0.2)); }
  else if (t < TT.ai) drawCode(g, t, W2, H2, '');
  else if (t < TT.attack) drawAI(g, t, W2, H2);
  else if (t < TT.ref0 + 0.6) drawAlert(g, t, W2, H2);
  else if (t < TT.dlg) drawOk(g, t, W2, H2);
  else drawDialog(g, t, W2, H2);
  T.needsUpdate = true;
}
function drawSide(i, t, red) {
  const T = S.side[i].userData.T, g = T.userData.g, W2 = T.userData.c.width, H2 = T.userData.c.height; g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = red ? '#1a0607' : '#0f1116'; g.fillRect(0, 0, W2, H2); topBar(g, W2, red ? 'Acceso remoto' : 'Carteras · firmas', red ? '#ffb4b4' : '#e8ecf2');
  for (let k = 0; k < 8; k++) { g.fillStyle = red ? 'rgba(255,120,120,.5)' : 'rgba(150,170,200,.45)'; rr(g, 30 + (k % 2) * 30, 90 + k * 46, 200 + 300 * hash(k * 1.7 + i), 16, 8); g.fill(); }
  if (red && Math.sin(t * 8) > 0) { g.fillStyle = '#ff4b4b'; g.font = '900 60px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚠', W2 - 90, H2 - 80); }
  T.needsUpdate = true;
}

// ---------------------------------------------------------------- monedas
const _o = new THREE.Object3D(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
let SCRP = null, SCRN = null;                         // centro de la pantalla y su normal (en el mundo)
function screenFrame() { if (SCRP) return; S.lap.updateMatrixWorld(true); const s = S.lap.userData.scr; SCRP = s.localToWorld(v3(0, 0, 0)); SCRN = s.localToWorld(v3(0, 0, 1)).sub(SCRP).normalize(); }
const SD = i => hash(i * 7.31) * 2.0, RW = i => hash(i * 2.9) * 0.9, RFD = i => hash(i * 9.7) * 1.4;
function pileAt(i, k = 1) { const q = S.pile[i]; _o.position.copy(q.p); _o.rotation.set(q.rx, q.ry, q.rz); _o.scale.setScalar(Math.max(0.001, k)); return k > 0.002; }
function suckAt(i, u) {
  const q = S.pile[i], P = q.p, e = eio(u);
  _a.copy(P).add(v3(0, 1.0 + hash(i) * 0.5, 0.2)); _b.copy(SCRP).addScaledVector(SCRN, 0.55).add(v3((hash(i * 3) - 0.5) * 0.4, 0.15, 0));
  bez(P, _a, _b, SCRP, e, _o.position);
  if (u > 0.55) { const w = (u - 0.55) / 0.45, ang = w * 9 + hash(i * 5) * 6.28, r = 0.16 * (1 - w) * Math.sin(w * Math.PI * 0.9 + 0.3); _o.position.x += Math.cos(ang) * r; _o.position.y += Math.sin(ang) * r; }
  _o.rotation.set(q.rx + u * 9, q.ry + u * 5, q.rz + u * 7); _o.scale.setScalar(Math.max(0.001, 1 - easeIn(clamp((u - 0.78) / 0.22)))); return true;
}
function coinMain(i, t) {
  const tau = t >= TT.loop ? t - END : t;
  if (tau < 3.0) { const u = (tau + 0.6 - SD(i)) / SUCK; if (u <= 0) return pileAt(i); if (u >= 1) return false; return suckAt(i, u); }
  if (t < TT.rew0) return false;
  const tOut = TT.out0 + S.outRank[i] / NCOIN * 3.2;
  if (t < tOut) return pileAt(i, pops(t, TT.rew0 + RW(i), 0.35));
  // vuelta: caen desde arriba
  if (t >= TT.ref0 + RFD(i)) { const u = clamp((t - TT.ref0 - RFD(i)) / 0.55); if (u >= 1) return pileAt(i); const q = S.pile[i]; _o.position.copy(q.p); _o.position.y += 2.6 * (1 - u * u); _o.rotation.set(q.rx + (1 - u) * 6, q.ry, q.rz + (1 - u) * 4); _o.scale.setScalar(1); return true; }
  // por su cadena
  const c = i % NCH, ch = S.chains[c], s = (t - tOut) / 2.0;
  let u;
  if (t < TT.frz) u = s < 1 ? s : s - Math.floor(s);
  else { const sf = (TT.frz - tOut) / 2.0, uf = sf < 1 ? sf : sf - Math.floor(sf); u = uf + (t - TT.frz) / 2.0; if (u >= 1) return false; }
  const q = S.pile[i];
  if (s < 0.15) { const w = s / 0.15, st = ch.curve.getPointAt(0.01); bez(q.p, _a.copy(q.p).add(v3(0, 0.6, 0)), _b.copy(st).add(v3(0, 0.25, 0)), st, eio(w), _o.position); }
  else { ch.curve.getPointAt(clamp(u), _o.position); _o.position.x += (hash(i * 1.9) - 0.5) * 0.18; _o.position.y += 0.16 + (hash(i * 2.7) - 0.5) * 0.14 + 0.03 * Math.sin(t * 9 + i); _o.position.z += (hash(i * 3.9) - 0.5) * 0.18; }
  _o.rotation.set(t * 4 + i, t * 3 + i * 0.7, i); _o.scale.setScalar(1); return true;
}
function coinsAt(t) {
  screenFrame(); let n = 0;
  for (let i = 0; i < NCOIN; i++) if (coinMain(i, t)) { _o.updateMatrix(); S.coins.setMatrixAt(n++, _o.matrix); }
  S.coins.count = n; S.coins.instanceMatrix.needsUpdate = true; S.coins.visible = n > 0;
  // congeladas: el hielo avanza desde la cartera hacia fuera
  let m = 0; const fo = 1 - win(t, TT.chOut, 0.6);
  if (t > TT.frz && fo > 0.002) for (let k = 0; k < NFZ; k++) { const c = FROZEN[k % FROZEN.length], ch = S.chains[c], u = 0.05 + 0.9 * (Math.floor(k / FROZEN.length) + hash(k * 1.3)) / (NFZ / FROZEN.length);
    const sc = pops(t, TT.frz + u * 0.9, 0.3) * fo; if (sc <= 0.002) continue; ch.curve.getPointAt(u, _o.position); _o.position.y += 0.16; _o.position.x += (hash(k * 2.1) - 0.5) * 0.16; _o.position.z += (hash(k * 3.1) - 0.5) * 0.16;
    _o.rotation.set(k, k * 0.7, k * 1.3); _o.scale.setScalar(sc); _o.updateMatrix(); S.fcoins.setMatrixAt(m++, _o.matrix); }
  S.fcoins.count = m; S.fcoins.instanceMatrix.needsUpdate = true; S.fcoins.visible = m > 0;
}

// ---------------------------------------------------------------- el programa espía: sale de la pantalla, baja por el cable y espera; luego salta a los otros portátiles
let BUGP = null;
function bugPaths() {
  if (BUGP) return BUGP; screenFrame();
  const kb = S.lap.localToWorld(v3(0, LAP.th + 0.02, -0.02)), back = S.lap.localToWorld(v3(0, LAP.th + 0.02, -LAP.d / 2 + 0.05)), sOut = SCRP.clone().addScaledVector(SCRN, 0.03);
  const emerge = new THREE.CatmullRomCurve3([sOut, sOut.clone().add(v3(0.06, -0.1, 0.02)), kb.clone().add(v3(0.08, 0.01, 0.08)), kb, back]);
  const sideP = S.side.map(l => { l.updateMatrixWorld(true); return l.localToWorld(v3(0, LAP.th + 0.03, -0.02)); });
  const wait = S.cMain.curve.getPointAt(0.42);
  const jumps = S.cSide.map((cb, i) => new THREE.CatmullRomCurve3([wait, v3(Math.sign(SIDE[i].x) * 0.6, 0.03, -0.6), cb.curve.getPointAt(0.55), cb.curve.getPointAt(0.25), cb.curve.getPointAt(0.02), sideP[i]]));
  BUGP = { emerge, jumps, sideP }; return BUGP;
}
function placeBug(b, curve, u, t, moving) {
  u = clamp(u); curve.getPointAt(u, b.position); curve.getTangentAt(Math.min(0.999, Math.max(0.001, u)), _d); b.position.y += 0.02;
  b.lookAt(_a.copy(b.position).add(_d)); for (const L of b.userData.legs) L.piv.rotation.x = moving ? 0.5 * Math.sin(t * 28 + L.k * 2 + L.sx) : 0.08 * Math.sin(t * 3 + L.k);
}
function bugsAt(t) {
  const P = bugPaths(), B = S.bug, out = 1 - win(t, TT.big, 0.3);
  B.visible = t > TT.bug0 - 0.05 && out > 0.01;
  if (B.visible) {
    if (t < TT.calm) placeBug(B, P.emerge, (t - TT.bug0) / 1.6, t, true);
    else if (t < TT.attack) { const u = 0.42 * clamp((t - TT.calm) / 1.2); if (t < TT.calm + 1.2) placeBug(B, S.cMain.curve, u, t, true); else placeBug(B, S.cMain.curve, 0.42, t, false); }
    else placeBug(B, S.cMain.curve, 0.42 + 0.58 * eio(clamp((t - TT.attack) / 1.2)), t, true);
    B.scale.setScalar(Math.max(0.001, pop(t, TT.bug0, 0.3) * out * (1 + 0.08 * Math.sin(t * 6))));
  }
  S.bugs.forEach((b, i) => { b.visible = t > TT.jump - 0.05 && out > 0.01; if (!b.visible) return; const u = (t - TT.jump) / (TT.land - TT.jump); placeBug(b, P.jumps[i], u, t, u < 1); b.scale.setScalar(Math.max(0.001, pop(t, TT.jump, 0.3) * out)); });
}

// ---------------------------------------------------------------- todo en el instante t
function stageAt2(t) {
  // monedas, bicho, pantallas
  const suckGlow = 0.5 * (t < 3 ? clamp(1 - Math.abs(t - 0.9) / 2) : t >= TT.loop ? clamp((t - TT.loop) / 1.25) : 0);
  drawMain(t, suckGlow); S.side.forEach((l, i) => drawSide(i, t, t > TT.land));
  coinsAt(t); bugsAt(t);
  // cartera: caliente (brillo naranja) y luego en alarma
  { const V = S.vault, hot = cwin(t, TT.hot0, TT.attack + 0.5, 0.4, 0.4), alarm = t > TT.attack && t < TT.ref0 + 1.5;
    V.glow.material.opacity = 0.25 + 0.65 * hot + (alarm ? 0.4 * (0.5 + 0.5 * Math.sin(t * 10)) : 0); V.glow.material.color.set(alarm ? 0xff4040 : 0xffffff);
    V.led.material.emissive.set(alarm ? 0xff2a2a : 0x35ff8a); V.led.material.emissiveIntensity = alarm ? 3 + 3 * (Math.sin(t * 12) > 0 ? 1 : 0) : 3; }
  // internet y cables (el brillo corre por dentro; rojo cuando entra el programa espía)
  { const k = pop(t, TT.net0, 0.4), N = S.net; N.g.visible = k > 0.002 && t < TT.loop; N.g.scale.setScalar(Math.max(0.001, k)); N.g.rotation.y = t * 0.4; N.ring.rotation.z = t * 0.8;
    S.cNet.m.visible = t > TT.net0 - 0.05; S.cNet.m.material.emissiveIntensity = 1.4 * win(t, TT.net0, 0.5) * (t < TT.loop ? 1 : 0); S.cNet.T.offset.x = -t * 0.6; }
  const redMain = t > TT.calm && t < TT.ref0, redSide = t > TT.land && t < TT.ref0;
  for (const [cb, red, sp] of [[S.cMain, redMain, 0.5], [S.cSide[0], redSide, 0.45], [S.cSide[1], redSide, 0.45]]) { cb.T.offset.x = -t * sp; cb.m.material.emissive.set(red ? 0xff3030 : 0xffffff); cb.m.material.emissiveIntensity = red ? 1.8 : 0.9; }
  // cadenas de bloques: se construyen desde la cartera; hielo en las congeladas; se van al final
  { const fade = 1 - win(t, TT.chOut, 0.6);
    S.chains.forEach((ch, c) => { const fz = FROZEN.includes(c);
      ch.blocks.forEach(({ b, u }, k) => { const s = pop(t, TT.chain0 + u * 0.9, 0.3) * fade; b.visible = s > 0.002; if (!b.visible) return; b.scale.setScalar(Math.max(0.001, s));
        if (fz) { const ik = win(t, TT.frz + u * 0.9, 0.25); b.material.color.setRGB(lerp(0.08, 0.8, ik), lerp(0.09, 0.93, ik), lerp(0.11, 1.0, ik)); b.material.emissive.setRGB(0.25 * ik, 0.65 * ik, 1.1 * ik); b.scale.multiplyScalar(1 + 0.18 * ik); } });
      ch.line.visible = t > TT.chain0 && fade > 0.01; ch.line.material.opacity = 0.6 * fade * win(t, TT.chain0, 0.8); });
    S.ice.visible = t > TT.frz && t < TT.chOut + 0.6; if (S.ice.visible) { const a = S.ice.geometry.attributes.position.array, n = S.ice.userData.n;
      for (let k = 0; k < n; k++) { const c = FROZEN[k % FROZEN.length], u = clamp(hash(k * 3.1) * clamp((t - TT.frz) / 0.9)), p = S.chains[c].curve.getPointAt(u); a[k * 3] = p.x + (hash(k) - 0.5) * 0.4; a[k * 3 + 1] = p.y + 0.1 + (hash(k * 2) - 0.5) * 0.4 + 0.1 * Math.sin(t * 2 + k); a[k * 3 + 2] = p.z + (hash(k * 5) - 0.5) * 0.4; }
      S.ice.geometry.attributes.position.needsUpdate = true; S.ice.material.opacity = 0.9 * fade; S.ice.material.size = 0.09; } }
  // torres del récord: la grande (este robo) y la pequeña (el récord anterior)
  { const out = 1 - win(t, TT.money, 0.4);
    S.towers.forEach((T, j) => { const t0 = j === 1 ? TT.big : TT.rec, dur = j === 1 ? 1.5 : 0.5, kk = clamp((t - t0) / dur), cnt = Math.floor(T.n * kk); let m = 0;
      if (out > 0.002) for (let i = 0; i < cnt; i++) { const drop = clamp((t - t0 - i / T.n * dur) / 0.12); _o.position.set(T.x + (hash(i * 1.7 + j) - 0.5) * 0.012, 0.005 + i * 0.01 + 0.25 * (1 - drop), 1.3 + (hash(i * 2.3 + j) - 0.5) * 0.012);
        _o.rotation.set(0, i * 0.37, 0); _o.scale.set(4.3 * out, 1, 4.3 * out); _o.updateMatrix(); T.im.setMatrixAt(m++, _o.matrix); }
      T.im.count = m; T.im.instanceMatrix.needsUpdate = true; T.im.visible = m > 0; }); }
}
// ---------------------------------------------------------------- cámara: un solo plano continuo (sin cortes) que acaba donde empieza (bucle)
let CKS = [];
function buildCam() {
  const A0 = [[1.3, 1.62, 2.15], [0.0, 1.0, -0.35], 34];          // el portátil con la videollamada y las monedas metiéndose en la pantalla
  CKS = [
    [0, ...A0],
    [K.recuperado2, [0.45, 1.6, 2.4], [0.0, 0.95, -0.6], 34],        // la cartera vacía, detrás
    [K.binance3 + 0.3, [-0.95, 1.75, 1.75], [0.0, 0.85, -1.4], 34],  // 3: la cartera caliente
    [K.conectadas3, [-0.75, 2.15, 1.95], [0.0, 1.55, -1.4], 34],     // … conectada a internet
    [K.ingenieros4, [0.5, 1.4, 2.15], [0.0, 0.98, 0.42], 34],      // 4: el portátil del ingeniero
    [K.videollamadas5, [0.16, 1.2, 1.95], [0.0, 0.98, 0.42], 34],   // 5: las videollamadas
    [K.prueba6, [-0.16, 1.18, 1.92], [0.0, 0.97, 0.42], 34],          // 6: la prueba
    [K.programa7, [0.45, 1.15, 1.7], [0.0, 0.86, 0.45], 34],          // 7: sale el programa espía
    [K.esperaron8, [0.95, 1.25, 1.4], [0.0, 0.42, -0.1], 34],         // 8: baja por el cable y espera
    [K.saltaron9, [0.0, 2.25, 2.95], [0.0, 0.85, 0.15], 40],          // 9: salta a los otros dos portátiles
    [K.ingenieros9, [0.0, 2.1, 2.8], [0.0, 0.85, 0.1], 40],
    [K.atacan10, [0.45, 1.95, 1.65], [0.0, 0.9, -1.45], 34],          // 10: el ataque
    [K.salen10, [0.0, 3.4, 3.9], [0.0, 1.3, -3.4], 38],               // … salen por diez cadenas de bloques
    [K.bloques10, [0.0, 4.6, 5.0], [0.0, 1.6, -4.6], 40],
    [K.mayor11, [0.3, 2.05, 5.2], [0.0, 1.3, 1.3], 42],           // 11: las torres del récord
    [K.record11, [-0.35, 1.9, 5.35], [-0.12, 1.1, 1.3], 42],
    [K.fbi12, [0.0, 3.6, 4.6], [0.0, 1.5, -3.6], 40],                 // 12: el FBI
    [K.congelado13, [1.6, 3.4, 3.7], [0.0, 1.5, -4.2], 40],           // 13: congelado
    [K.resto14, [0.6, 1.95, 2.45], [0.0, 0.85, -1.4], 34],            // 14: la cartera se vuelve a llenar
    [K.entrevista15, [0.32, 1.25, 2.05], [0.0, 0.97, 0.45], 34],        // 15: «si te piden descargar algo… sospecha»
    [K.sospecha15, [0.2, 1.2, 1.95], [0.0, 0.98, 0.45], 34],
    [END - 0.25, ...A0],
    [END, ...A0],
  ];
}
function camAt(t) {
  const st = camKeys(t, CKS);
  const u = t - TT.attack; if (u > 0 && u < 0.6) { const a = 0.02 * Math.exp(-u * 7); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; }
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.attack, 0.06], [TT.out0, 0.05], [TT.frz, 0.05], [TT.sus, 0.04]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t;
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.35, 1.3);
  rigAt(c, yaw, k, 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.16;
  scene.fog.density = 0.018;
  stageAt2(t);
  post.uniforms.fade.value = 0;
}
// ---------------------------------------------------------------- HUD: cabecera (con kiriaai.com), rótulos con línea guía, reloj de los 20 minutos, torres y cierre
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A', HICE = '#9FDCFF';
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
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
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('EL MAYOR ROBO CRIPTO', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText('HACKEO A BINANCE · 29 OCT 2026', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.letterSpacing = '3px'; hfont(16, false); hg.fillStyle = 'rgba(238,242,246,.55)'; hg.fillText('VÍDEO HECHO CON IA · KIRIAAI.COM', 56, 232);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('ROBADO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('+6.000 M$', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('EN UNOS 20 MIN', 1024, 178);
  hg.restore();
  bracketMsg(t, '¿RECUPERADO?', HC.amber, win(t, K.recuperado2, 0.3) * (1 - win(t, K.y13, 0.25)), true);
  bracketMsg(t, '≈ 2.850 M$ CONGELADOS', HICE, win(t, K.n2850_13 + 0.3, 0.3) * (1 - win(t, END - 1.3, 0.3)), false);
}
// reloj: de 00:00 a 20:00 mientras salen las monedas
function timerHud(t) {
  const k = cwin(t, TT.timer0 - 0.1, K.mayor11 - 0.1); if (k <= 0.01) return;
  const u = clamp((t - TT.timer0) / (TT.timer1 + 0.6 - TT.timer0)), secs = Math.round(u * 1200), mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
  bigText(`${mm}:${ss}`, W / 2, 1490, 110, HG, k, { glow: 16, type: false, dark: 24, ls: 8 });
  bigText('MINUTOS', W / 2, 1572, 26, HC.grey, k, { type: false, dark: 14, ls: 8 });
}
function panel2(l1, l2, c1, c2, y, k) {
  if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k); hfont(34); hg.letterSpacing = '4px'; const w = Math.max(hg.measureText(l1).width, (hfont(26), hg.measureText(l2).width)) + 70;
  hg.fillStyle = 'rgba(0,0,0,.72)'; rr(hg, W / 2 - w / 2, y - 62, w, 132, 12); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 1.5; hg.stroke();
  hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(34); hg.fillStyle = c1; hg.fillText(typed(l1, clamp(k * 1.5)), W / 2, y - 18); hfont(26); hg.fillStyle = c2; hg.fillText(typed(l2, clamp(k * 1.5 - 0.3)), W / 2, y + 30); hg.restore();
}
function hudAt(t) {
  hudBegin(); hdr(t);
  // 3: la cartera caliente
  lab(v3(VAULT.x + VAULT.w / 2, VAULT.base + VAULT.h * 0.8, VAULT.z + VAULT.d / 2), 'CARTERA CALIENTE', 'CONECTADA A INTERNET', cw(t, K.carteras3, K.ingenieros4 - 0.1), { dx: 120, dy: -170, color: HG });
  // 5: la empresa que no existe
  if (t > TT.fake - 0.1 && t < TT.test0) { screenFrame(); lab(S.lap.userData.scr.localToWorld(v3(0.2, 0.08, 0)), 'EMPRESA FALSA', null, cw(t, TT.fake, TT.test0 - 0.05), { dx: 90, dy: -160, color: HC.red }); }
  // 7–8: el programa espía
  if (S.bug.visible) {
    lab(S.bug.position, 'PROGRAMA ESPÍA', 'EL ANTIVIRUS NO LO VE', cw(t, K.espia7, K.pero8 - 0.05), { dx: -130, dy: -170, color: HC.red });
    lab(S.bug.position, 'ESPERANDO…', 'SEMANAS', cw(t, K.esperaron8, K.ia9 - 0.05), { dx: 120, dy: -150, color: HC.red });
  }
  // 9: la IA interna y los otros dos ingenieros
  lab(wpo(S.lap, 0, 0.42, -0.2), 'IA DE LA EMPRESA', null, cw(t, K.ia9, K.saltaron9), { dx: 120, dy: -150, color: HC.red });
  S.side.forEach((l, i) => lab(wpo(l, 0, 0.45, -0.2), i ? 'INGENIERO 3' : 'INGENIERO 2', null, cw(t, TT.land - 0.2, K.n29_10), { dx: i ? -40 : 40, dy: -150, color: HC.red }));
  // 10: el día, el reloj y las cadenas
  // el sello se va antes de que salga el reloj (en el mismo sitio): con la voz de Javi se pisaban ≈ 0,7 s
  { const k = cwin(t, K.n29_10 - 0.05, TT.timer0 - 0.35, 0.2, 0.25); if (k > 0.01) stamp('29 OCT 2026', W / 2, 1480, k, HC.red, 70); }
  timerHud(t);
  lab(S.chains[NCH - 2].curve.getPointAt(0.55), '10 CADENAS DE BLOQUES', null, cw(t, K.cadenas10, K.mayor11 - 0.1), { dx: -150, dy: -140, color: HC.white });
  // 11: las torres
  lab(v3(0.6, 2.55, 1.3), 'ESTE ROBO', '+6.000 M$ · 2026', cw(t, TT.big + 0.6, K.fbi12), { dx: -60, dy: -130, color: HG });
  lab(v3(-0.6, 0.65, 1.3), 'RÉCORD ANTERIOR', '~1.500 M$ · BYBIT, 2025', cw(t, TT.rec, K.fbi12), { dx: -60, dy: -170, color: HC.white });
  { const k = cwin(t, TT.x4, K.fbi12, 0.15, 0.3); if (k > 0.01) bigText('×4', W / 2, 1020, 170, HG, k, { glow: 18, type: false, dark: 26 }); }
  // 12: el FBI
  panel2('FBI: HACKERS DE COREA DEL NORTE', 'GRUPO TRADERTRAITOR', HC.white, HC.grey, 1470, cw(t, K.fbi12, K.y13 - 0.1));
  { const k = cwin(t, K.niegan12, K.y13 - 0.1, 0.15, 0.25); if (k > 0.01) stamp('LO NIEGAN', W / 2, 1640, k, HC.red, 56); }
  // 13: congelado · 14: lo repone Binance
  lab(S.chains[FROZEN[1]].curve.getPointAt(0.45), '≈ 2.850 M$', 'CONGELADOS', cw(t, K.n2850_13 + 0.2, K.resto14), { dx: -140, dy: -150, color: HICE });
  lab(v3(VAULT.x - VAULT.w / 2, VAULT.base + VAULT.h * 0.75, VAULT.z + VAULT.d / 2), 'LO PONE BINANCE', 'SEGÚN BINANCE, NINGÚN CLIENTE PIERDE', cw(t, K.puesto14, K.entrevista15 - 0.1), { dx: -110, dy: -170, color: HG });
  // 15: sospecha
  { const k = cwin(t, K.sospecha15, END - 0.35, 0.15, 0.3); if (k > 0.01) stamp('SOSPECHA', W / 2, 1500, k, HC.red, 96); }
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
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '800' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  FONT3 = new FontLoader().parse(await new TTFLoader().loadAsync(F + 'Inter-Black.otf'));
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = Math.ceil(lines[lines.length - 1].end + 2.0);
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    robaron1: atL(1, 'robaron'), n6000_1: atL(1, '6000'), millones1: atL(1, 'millones'), dolares1: atL(1, 'dolares'), n20_1: atL(1, '=20'), minutos1: atL(1, 'minutos'), empezo1: atL(1, 'empezo'), entrevista1: atL(1, 'entrevista'), trabajo1: atL(1, 'trabajo'),
    recuperado2: atL(2, 'recuperado'), dinero2: atL(2, 'dinero'), final2: atL(2, 'final'),
    binance3: atL(3, 'binance'), plataforma3: atL(3, 'plataforma'), criptomonedas3: atL(3, 'criptomonedas'), guarda3: atL(3, 'guarda'), carteras3: atL(3, 'carteras'), conectadas3: atL(3, 'conectadas'), internet3: atL(3, 'internet'),
    ingenieros4: atL(4, 'ingenieros'), recibe4: atL(4, 'recibe'), oferta4: atL(4, 'oferta'), trabajo4: atL(4, 'trabajo'),
    videollamadas5: atL(5, 'videollamadas'), recursos5: atL(5, 'recursos'), humanos5: atL(5, 'humanos'), jefe5: atL(5, 'jefe'), empresa5: atL(5, 'empresa'), existe5: atL(5, 'existe'),
    prueba6: atL(6, 'prueba'), ejecutar6: atL(6, 'ejecutar'), codigo6: atL(6, 'codigo'), ordenador6: atL(6, 'ordenador'),
    dentro7: atL(7, 'dentro'), programa7: atL(7, 'programa'), espia7: atL(7, 'espia'), antivirus7: atL(7, 'antivirus'), detecto7: atL(7, 'detecto'),
    pero8: atL(8, '=pero'), robaron8: atL(8, 'robaron'), nada8: atL(8, 'nada'), esperaron8: atL(8, 'esperaron'),
    ia9: atL(9, '=ia'), propia9: atL(9, 'propia'), saltaron9: atL(9, 'saltaron'), ordenadores9: atL(9, 'ordenadores'), otros9: atL(9, 'otros'), ingenieros9: atL(9, 'ingenieros'),
    n29_10: atL(10, '29'), octubre10: atL(10, 'octubre'), atacan10: atL(10, 'atacan'), n20_10: atL(10, '=20'), minutos10: atL(10, 'minutos'), n6000_10: atL(10, '6000'), salen10: atL(10, 'salen'), diez10: atL(10, 'diez'), cadenas10: atL(10, 'cadenas'), bloques10: atL(10, 'bloques'),
    mayor11: atL(11, 'mayor'), robo11: atL(11, 'robo'), historia11: atL(11, 'historia'), cuatro11: atL(11, 'cuatro'), record11: atL(11, 'record'),
    fbi12: atL(12, 'fbi'), atribuye12: atL(12, 'atribuye'), hackers12: atL(12, 'hackers'), corea12: atL(12, 'corea'), niegan12: atL(12, 'niegan'),
    y13: atL(13, '=y'), dinero13: atL(13, 'dinero'), n2850_13: atL(13, '2850'), congelado13: atL(13, 'congelado'),
    resto14: atL(14, 'resto'), puesto14: atL(14, 'puesto'), binance14: atL(14, 'binance'), dice14: atL(14, 'dice'), ningun14: atL(14, 'ningun'), cliente14: atL(14, 'cliente'), perdido14: atL(14, 'perdido'), nada14: atL(14, 'nada'),
    entrevista15: atL(15, 'entrevista'), piden15: atL(15, 'piden'), descargar15: atL(15, 'descargar'), algo15: atL(15, 'algo'), sospecha15: atL(15, 'sospecha'),
  };
  mats(); buildMats(); buildRig(); buildFloor();
  S.floor.d.material.color.set(0x3c3832); S.floor.d.material.clearcoat = 0.6;
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6; }
  scene.fog = new THREE.FogExp2(0x000000, 0.018);
  buildFlow(); buildCripto(); buildTimes();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.TT = TT; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
