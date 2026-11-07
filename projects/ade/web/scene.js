// «ADE no tiene salidas» (voz de Javi): ver 12_ade.js.
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
// ---------------------------------------------------------------- el escenario: edificio de oficinas en corte (planta baja con el portal + 5 plantas de despachos),
// la plaza con las 100 figuritas y la protagonista, las torres de ofertas, el ascensor de cristal, las puertas con su cerradura,
// la llave «ADE» y la escalera «ATAJO». Escala: una figurita mide ≈ 0,065 (con birrete).
const BW = 0.78, BD = 0.44, BZ1 = BD / 2, BZ0 = -BD / 2, FH0 = 0.26, FH = 0.2, NLV = 6, SLT = 0.018;
const LY = k => (k === 0 ? 0 : FH0 + (k - 1) * FH);             // altura del forjado de la planta k (0 = planta baja)
const FLY = k => (k === 0 ? 0.012 : LY(k) + SLT);                  // suelo pisable de la planta k
const TOPY = LY(NLV);                                               // techo de la última planta
const DX = [-0.24, 0, 0.24], DW = 0.085, DH = 0.125, DZ = BZ0 + 0.011;
const ELX = 0.32, ELZ = 0.1, ELR = 0.042;                           // ascensor de cristal (dentro, delante a la derecha)
const PZ0 = 0.72, P0 = v3(0.0, 0, 1.2);                             // centro de la rejilla de 100 · la protagonista
const PORT = { w: 0.28, h: 0.19 };
const DOORN = [null,
  ['ADMINISTRACIÓN', 'CONTABILIDAD', 'COMERCIAL'],
  ['RR. HH.', 'COMPRAS', 'LOGÍSTICA'],
  ['CONSULTORÍA', 'FINANZAS', 'SEGUROS'],
  ['MARKETING', 'CONTROL DE GESTIÓN', 'DIRECCIÓN'],
  ['AUDITORÍA', 'BANCA', 'HACIENDA']];
const OPEN = [[1, 0], [1, 2], [2, 1], [3, 0], [3, 2], [4, 1]];       // despachos con puesto de universitario (los 34)
const SPECIAL = [[5, 0], [5, 1], [5, 2]];                                             // auditoría, banca, Hacienda
const COLS = [{ x: -0.62, z: 0.46, n: 314 }, { x: -0.79, z: 0.46, n: 134 }, { x: -0.96, z: 0.46, n: 126 }];   // 3,67 · 1,57 · 1,47 % de las ofertas
const PT = 0.0026;                                                  // grosor de un folio en la torre
const doorKey = (k, j) => k * 10 + j;

function windowTex(lobby, seed) {
  return canvasTex(1024, lobby ? 256 : 192, (g, w, h) => {
    g.fillStyle = lobby ? '#141a22' : '#0f141c'; g.fillRect(0, 0, w, h);
    const n = lobby ? 6 : 10, mw = w / n;
    for (let i = 0; i < n; i++) {
      const lit = lobby ? 0.8 : hash(i * 3.7 + seed * 11.3), x0 = i * mw + 8, y0 = lobby ? 14 : 16, ww = mw - 16, hh = h - (lobby ? 28 : 40);
      const gr = g.createLinearGradient(0, y0, 0, y0 + hh);
      if (lit > 0.45) { gr.addColorStop(0, lobby ? '#bfc8d2' : '#ffd9a0'); gr.addColorStop(1, lobby ? '#6c7682' : '#c98a42'); g.globalAlpha = lobby ? 0.55 : 0.35 + 0.5 * lit; }
      else { gr.addColorStop(0, '#2c3a4e'); gr.addColorStop(1, '#141c28'); g.globalAlpha = 1; }
      g.fillStyle = gr; g.fillRect(x0, y0, ww, hh); g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(x0, y0 + hh); g.lineTo(x0 + ww * 0.45, y0); g.lineTo(x0 + ww * 0.62, y0); g.lineTo(x0 + ww * 0.17, y0 + hh); g.fill();
    }
    g.fillStyle = '#05070a'; for (let i = 0; i <= n; i++) g.fillRect(i * mw - 4, 0, 8, h); g.fillRect(0, 0, w, 8); g.fillRect(0, h - 10, w, 10);
  });
}
function facadeMat(tex) { return new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.25, transparent: true, opacity: 1 }); }

function officeDoor(name, k, j) {
  const g = new THREE.Group(); g.position.set(DX[j], FLY(k), DZ);
  const fr = M.wood, t = 0.007;
  const jl = mesh(new THREE.BoxGeometry(t, DH + t, 0.012), fr); jl.position.set(-DW / 2 - t / 2, (DH + t) / 2, 0); g.add(jl);
  const jr = jl.clone(); jr.position.x = DW / 2 + t / 2; g.add(jr);
  const lt = mesh(new THREE.BoxGeometry(DW + 2 * t, t, 0.012), fr); lt.position.set(0, DH + t / 2, 0); g.add(lt);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(DW, DH), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc46a).multiplyScalar(0.25), toneMapped: false }));
  glow.position.set(0, DH / 2, -0.004); g.add(glow);
  const pv = new THREE.Group(); pv.position.set(-DW / 2, 0, 0.001); g.add(pv);
  const lf = rbox(DW - 0.003, DH - 0.003, 0.007, M.woodD, 0.002); lf.position.set(DW / 2, DH / 2, 0); pv.add(lf);
  const mo = rbox(DW - 0.03, DH * 0.36, 0.003, M.wood, 0.0015); mo.position.set(DW / 2, DH * 0.7, 0.004); pv.add(mo);
  const mo2 = mo.clone(); mo2.position.y = DH * 0.27; pv.add(mo2);
  const kn = sph(0.0055, M.brass, 14, 10); kn.position.set(DW - 0.012, DH * 0.47, 0.007); pv.add(kn);
  const pl = plateText(0.1, 0.021, [[name, name.length > 12 ? 0.5 : 0.62, 0.56]], { fg: '#f0d590', bg: '#15181d', weight: 800 });
  pl.position.set(0, DH + 0.019, 0.003); g.add(pl);
  const sg = exitSign(0.048); sg.position.set(0, DH + 0.043, 0.006); g.add(sg); signOn(sg, 0);
  const lk = padlock(0.6); lk.position.set(DW / 2 - 0.012, DH * 0.47, 0.016); lk.visible = false; g.add(lk);
  g.userData = { pv, glow, sg, lk, k, j, name, kn };
  return g;
}

function buildBuilding() {
  const B = new THREE.Group(); scene.add(B); S.bld = B;
  // suelo de la planta baja, pared del fondo (por fuera piedra; por dentro, el color de cada planta), laterales, forjados y techo
  B.add(at(mesh(new THREE.BoxGeometry(BW, 0.012, BD), M.marble), 0, 0.006, 0));
  B.add(at(mesh(new THREE.BoxGeometry(BW + 0.06, TOPY + 0.05, 0.03), M.stone), 0, (TOPY + 0.05) / 2, BZ0 - 0.015));
  for (let k = 0; k < NLV; k++) {
    const y0 = FLY(k), y1 = LY(k + 1), p = mesh(new THREE.PlaneGeometry(BW, y1 - y0), k === 0 ? M.lobbyWall : M.wallIn, false);
    p.position.set(0, (y0 + y1) / 2, BZ0 + 0.001); B.add(p);
    // tiras de luz del techo (cálidas en los despachos, frías y planas en la planta baja)
    for (const z of [-0.07, 0.09]) { const st = new THREE.Mesh(new THREE.PlaneGeometry(BW * 0.84, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(k ? 0xffd9a8 : 0xdfe8f2).multiplyScalar(k ? 1.5 : 1.35), toneMapped: false }));
      st.rotation.x = Math.PI / 2; st.position.set(-0.03, y1 - 0.0012, z); B.add(st); }
  }
  for (const sx of [-1, 1]) B.add(at(mesh(new THREE.BoxGeometry(0.03, TOPY + 0.05, BD + 0.03), M.stone), sx * (BW / 2 + 0.015), (TOPY + 0.05) / 2, -0.0));
  for (let k = 1; k <= NLV; k++) {
    const s = new THREE.Shape(); s.moveTo(-BW / 2, -BZ1); s.lineTo(BW / 2, -BZ1); s.lineTo(BW / 2, -BZ0); s.lineTo(-BW / 2, -BZ0); s.closePath();
    if (k < NLV) { const hp = new THREE.Path(); hp.absarc(ELX, -ELZ, ELR + 0.006, 0, Math.PI * 2, true); s.holes.push(hp); }
    const geo = new THREE.ExtrudeGeometry(s, { depth: SLT, bevelEnabled: false, curveSegments: 24 }); geo.rotateX(-Math.PI / 2);
    const sl = mesh(geo, M.slab); sl.position.y = LY(k); B.add(sl);
    if (k < NLV) { const fl = mesh(new THREE.PlaneGeometry(BW, BD), M.floorW, false); fl.rotation.x = -Math.PI / 2; fl.position.set(0, LY(k) + SLT + 0.0006, 0); B.add(fl); }
    // canto del forjado (se ve siempre, también con la fachada abierta)
    B.add(at(mesh(new THREE.BoxGeometry(BW + 0.06, SLT + 0.006, 0.012), M.stoneL), 0, LY(k) + SLT / 2, BZ1 + 0.004));
  }
  // antepecho y un par de máquinas en la azotea
  for (const [w, d, x, z] of [[BW + 0.06, 0.02, 0, BZ1 - 0.0], [BW + 0.06, 0.02, 0, BZ0], [0.02, BD, -BW / 2 - 0.02, 0], [0.02, BD, BW / 2 + 0.02, 0]]) B.add(at(mesh(new THREE.BoxGeometry(w, 0.05, d), M.stone), x, TOPY + SLT + 0.025, z));
  B.add(at(rbox(0.16, 0.06, 0.1, M.stoneL, 0.01), -0.25, TOPY + SLT + 0.05, -0.05, 0, Math.PI / 2));
  B.add(at(cyl(0.045, 0.045, 0.09, M.dsteel, 24), 0.2, TOPY + SLT + 0.045, -0.08));
  // fachada (opaca hasta «Ahora, lo feo»): una por planta; la de abajo, con el hueco del portal
  S.facade = [];
  for (let k = 1; k < NLV; k++) {
    const m = facadeMat(windowTex(false, k)), f = mesh(new THREE.BoxGeometry(BW, FH - SLT, 0.012), m); f.position.set(0, FLY(k) + (FH - SLT) / 2, BZ1 + 0.002); B.add(f); S.facade.push(f);
  }
  { const m = facadeMat(windowTex(true, 0)), sw = (BW - PORT.w - 0.044) / 2, hh = FH0;
    for (const sx of [-1, 1]) { const f = mesh(new THREE.BoxGeometry(sw, hh, 0.012), m); f.position.set(sx * (PORT.w / 2 + 0.022 + sw / 2), hh / 2, BZ1 + 0.002); B.add(f); S.facade.push(f); }
    const lt = mesh(new THREE.BoxGeometry(PORT.w + 0.044, hh - PORT.h - 0.034, 0.012), m); lt.position.set(0, PORT.h + 0.034 + (hh - PORT.h - 0.034) / 2, BZ1 + 0.002); B.add(lt); S.facade.push(lt);
  }
  // línea de luz que barre la fachada cuando se abre
  S.scan = new THREE.Mesh(new THREE.PlaneGeometry(BW + 0.08, 0.006), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fe8ff).multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  S.scan.position.set(0, 0, BZ1 + 0.012); S.scan.visible = false; B.add(S.scan);
  // el portal: marco de piedra, dos hojas de madera (giran hacia dentro), cerradura de latón en la junta y la señal grande de SALIDA
  const P = new THREE.Group(); P.position.set(0, 0.012, BZ1 + 0.012); B.add(P); S.portal = P;
  P.add(at(rbox(0.022, PORT.h + 0.022, 0.03, M.stoneL, 0.004), -PORT.w / 2 - 0.011, (PORT.h + 0.022) / 2, 0));
  P.add(at(rbox(0.022, PORT.h + 0.022, 0.03, M.stoneL, 0.004), PORT.w / 2 + 0.011, (PORT.h + 0.022) / 2, 0));
  P.add(at(rbox(PORT.w + 0.066, 0.022, 0.032, M.stoneL, 0.004), 0, PORT.h + 0.011, 0));
  S.leaves = [-1, 1].map(sd => {
    const pv = new THREE.Group(); pv.position.set(sd * PORT.w / 2, 0, -0.006); P.add(pv);
    const lf = rbox(PORT.w / 2 - 0.002, PORT.h - 0.004, 0.012, M.woodD, 0.003); lf.position.set(-sd * PORT.w / 4, PORT.h / 2, 0); pv.add(lf);
    for (const yy of [0.052, 0.138]) pv.add(at(rbox(PORT.w / 2 - 0.034, 0.064, 0.004, M.wood, 0.002), -sd * PORT.w / 4, yy, 0.007));
    pv.add(at(cyl(0.0035, 0.0035, 0.05, M.brass, 10), -sd * (PORT.w / 2 - 0.018), 0.1, 0.012));
    return pv;
  });
  S.plate = rbox(0.03, 0.052, 0.005, M.brass, 0.003); S.plate.position.set(PORT.w / 2, 0.085, 0.009); S.leaves[0].add(S.plate);
  const kh = cyl(0.0045, 0.0045, 0.004, M.black, 14); kh.rotation.x = Math.PI / 2; kh.position.set(PORT.w / 2, 0.09, 0.0125); S.leaves[0].add(kh);
  const khs = mesh(new THREE.BoxGeometry(0.003, 0.011, 0.004), M.black); khs.position.set(PORT.w / 2, 0.083, 0.0125); S.leaves[0].add(khs);
  S.inGlow = new THREE.Mesh(new THREE.PlaneGeometry(PORT.w, PORT.h), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0d0).multiplyScalar(0.4), toneMapped: false }));
  S.inGlow.position.set(0, PORT.h / 2, -0.03); P.add(S.inGlow);
  S.bigSign = exitSign(0.17); S.bigSign.position.set(0, PORT.h + 0.022 + 0.04, 0.02); P.add(S.bigSign); signOn(S.bigSign, 1);
  S.flood = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h * 0.6, 4, w / 2, h * 0.6, w * 0.55); r.addColorStop(0, 'rgba(255,236,190,1)'); r.addColorStop(0.35, 'rgba(255,214,150,.45)'); r.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  S.flood.position.set(0, 0.13, 0.03); P.add(S.flood);
  // ascensor de cristal con aros de latón en cada planta
  const tubeM = new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, clearcoatRoughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(ELR, ELR, TOPY, 40, 1, true), tubeM); tb.position.set(ELX, TOPY / 2, ELZ); tb.renderOrder = 7; B.add(tb);
  for (let k = 0; k <= NLV; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(ELR + 0.003, 0.0022, 8, 40), M.dsteel); r.rotation.x = Math.PI / 2; r.position.set(ELX, k ? LY(k) + SLT + 0.002 : 0.014, ELZ); B.add(r); }
  S.elevLight = new THREE.Mesh(new THREE.CylinderGeometry(ELR * 0.92, ELR * 0.92, 0.004, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2d6).multiplyScalar(2), toneMapped: false })); S.elevLight.position.set(ELX, TOPY - 0.004, ELZ); B.add(S.elevLight);
  // mostradores grises de la planta baja (pegados al fondo)
  for (const x of [-0.24, 0.02]) B.add(at(rbox(0.2, 0.032, 0.035, M.stoneL, 0.004), x, 0.028, BZ0 + 0.03, 0, Math.PI / 2));
  // puertas de los despachos
  S.doors = {};
  for (let k = 1; k < NLV; k++) for (let j = 0; j < 3; j++) { const d = officeDoor(DOORN[k][j], k, j); B.add(d); S.doors[doorKey(k, j)] = d; }
  // farolas de la plaza (solo brillo: el número de luces no cambia)
  for (const [x, z] of [[0.62, 1.12], [0.62, 0.42], [-1.25, 1.0]]) {
    const pole = cyl(0.006, 0.008, 0.34, M.dsteel, 12); pole.position.set(x, 0.17, z); scene.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(2.2), toneMapped: false })); bulb.position.set(x, 0.35, z); scene.add(bulb);
  }
}

// ---------------------------------------------------------------- la plaza: 100 figuritas (rejilla 10 × 10), la protagonista, los 700 «graduados nuevos» y los birretes
const C_CER = new THREE.Color(0xe6e1d8), C_LIT = new THREE.Color(0xfff1d6), C_GREY = new THREE.Color(0x4a4b51), C_GOLD = new THREE.Color(0xffc24a), C_DIMF = new THREE.Color(0x77777c);
const NR = 700;
const gridPos = i => v3(((i % 10) - 4.5) * 0.06, 0, PZ0 + (Math.floor(i / 10) - 4.5) * 0.06);
let STAY = [], UP = [], FIG = [], RIV = [];
function buildCrowd() {
  const gm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  S.grid = new THREE.InstancedMesh(studentGeo(false), gm, 100); S.grid.castShadow = true; S.grid.receiveShadow = true; S.grid.frustumCulled = false; scene.add(S.grid);
  S.caps = new THREE.InstancedMesh(capGeo(), M.capM, 100); S.caps.castShadow = true; S.caps.frustumCulled = false; scene.add(S.caps);
  for (let i = 0; i < 100; i++) S.grid.setColorAt(i, C_CER);
  S.hero = mesh(studentGeo(false), M.ceramic); S.hero.position.copy(P0); scene.add(S.hero);
  S.heroCap = mesh(capGeo(), M.capM); S.heroCap.position.copy(P0); scene.add(S.heroCap);
  // quién se queda fuera (20), quién sube (34): elegidos al azar, siempre los mismos
  const ord = [...Array(100).keys()].sort((a, b) => hash(a * 7.13 + 1) - hash(b * 7.13 + 1));
  STAY = ord.slice(0, 20).sort((a, b) => a - b);
  const inn = ord.slice(20);
  // los 80 entran por cuatro carriles del portal, por filas (primero los de delante del edificio)
  const lanes = [-0.084, -0.028, 0.028, 0.084], lobby = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 10; c++) lobby.push(v3(-0.335 + c * 0.066, FLY(0), -0.165 + r * 0.046));
  const inSorted = inn.slice().sort((a, b) => gridPos(a).z - gridPos(b).z || gridPos(a).x - gridPos(b).x);
  const lobbySorted = lobby.slice().sort((a, b) => b.z - a.z || a.x - b.x);       // los primeros, a las filas de delante
  FIG = [...Array(100)].map((_, i) => ({ gp: gridPos(i), stay: STAY.includes(i) }));
  inSorted.forEach((i, r) => {
    const f = FIG[i], lane = lanes[r % 4], gp = f.gp, ls = lobbySorted[r];
    const pts = [gp.clone(), v3(lerp(gp.x, lane, 0.6), 0, 0.42), v3(lane, 0, BZ1 + 0.06), v3(lane, FLY(0), BZ1 - 0.06), ls.clone()];
    f.enter = mkPath(pts, K.n8_5 - 0.02 + Math.floor(r / 4) * 0.085 + (r % 4) * 0.02, 0.62); f.ls = ls;
  });
  // los 34 que suben: los de la planta baja más cerca del ascensor salen antes
  const upIdx = inn.slice().sort((a, b) => hash(a * 3.31 + 5) - hash(b * 3.31 + 5)).slice(0, 34).sort((a, b) => FIG[a].ls.distanceTo(v3(ELX, 0, ELZ)) - FIG[b].ls.distanceTo(v3(ELX, 0, ELZ)));
  UP = upIdx; const per = [6, 6, 5, 6, 5, 6];
  const slots = []; OPEN.forEach(([k, j], d) => { for (let m = 0; m < per[d]; m++) slots.push({ k, j, p: v3(DX[j] + (Math.floor(m / 2) - (Math.ceil(per[d] / 2) - 1) / 2) * 0.03 + (m % 2) * 0.012, FLY(k), DZ + 0.055 + (m % 2) * 0.032) }); });
  slots.sort((a, b) => a.k - b.k || a.p.x - b.p.x);
  const slotOrder = [...slots.keys()].sort((a, b) => hash(a * 9.1) - hash(b * 9.1));
  upIdx.forEach((i, r) => {
    const f = FIG[i], sl = slots[slotOrder[r]], y = sl.p.y;
    const pts = [f.ls.clone(), v3(ELX - 0.06, FLY(0), ELZ), v3(ELX, FLY(0), ELZ), v3(ELX, y, ELZ), v3(ELX - 0.07, y, ELZ - 0.03), v3(sl.p.x, y, ELZ - 0.05), sl.p.clone()];
    f.up = mkPath(pts, K.trabajan7 + 0.15 + r * 0.056, 0.85); f.slot = sl;
  });
  // los «graduados nuevos»: llegan por la derecha y llenan la plaza (primero los que van más lejos)
  S.river = new THREE.InstancedMesh(studentGeo(true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), NR); S.river.frustumCulled = false; S.river.castShadow = true; scene.add(S.river);
  S.rcaps = new THREE.InstancedMesh(capGeo(), M.capM, NR); S.rcaps.frustumCulled = false; scene.add(S.rcaps);
  const cells = [];
  for (let r = 0; r < 26; r++) for (let c = 0; c < 60; c++) {
    const x = -0.5 + c * 0.034 + (r % 2) * 0.017 + (hash(r * 61 + c) - 0.5) * 0.012, z = 0.28 + r * 0.032 + (hash(r * 17 + c * 3) - 0.5) * 0.01;
    if (x > 1.3 || z > 1.1) continue;
    if (Math.hypot(x - P0.x, z - P0.z) < 0.07) continue;
    if (STAY.some(i => Math.hypot(x - FIG[i].gp.x, z - FIG[i].gp.z) < 0.03)) continue;
    if (x < -0.45 && z < 0.66) continue;
    cells.push(v3(x, 0, z));
  }
  cells.sort((a, b) => Math.hypot(a.x, a.z - 0.3) - Math.hypot(b.x, b.z - 0.3));
  const take = cells.slice(0, NR).sort((a, b) => a.x - b.x);
  RIV = take.map((p, i) => {
    const sx = 3.0 + hash(i * 4.7) * 0.9, sz = p.z + (hash(i * 2.3) - 0.5) * 0.2;
    const pts = [v3(sx, 0, sz), v3(lerp(sx, p.x, 0.55), 0, lerp(sz, p.z, 0.8)), p.clone()], enter = mkPath(pts, 0, 1);
    enter.t0 = K.cada9 - 0.15 + (i / NR) * 1.85; enter.dur = enter.L / 1.45;
    const dd = Math.hypot(p.x, p.z - BZ1), lane = [-0.09, -0.03, 0.03, 0.09][i % 4];
    const tin = K.portal15 - 0.05 + clamp(dd / 1.35) * 2.6 + hash(i * 8.1) * 0.25;
    const absorb = mkPath([p.clone(), v3(lerp(p.x, lane, 0.75), 0, BZ1 + 0.12), v3(lane, 0, BZ1 + 0.02), v3(lane * 0.6, FLY(0), BZ1 - 0.12)], tin, 0.55 + dd * 0.55);
    return { p, enter, absorb };
  });
  // los 20 de fuera también entran al final (con los nuevos)
  STAY.forEach((i, r) => { const f = FIG[i], gp = f.gp, lane = [-0.06, 0.0, 0.06][r % 3], dd = Math.hypot(gp.x, gp.z - BZ1);
    f.absorb = mkPath([gp.clone(), v3(lerp(gp.x, lane, 0.7), 0, BZ1 + 0.12), v3(lane, 0, BZ1 + 0.02), v3(lane * 0.6, FLY(0), BZ1 - 0.12)], K.portal15 + clamp(dd / 1.35) * 2.4 + r * 0.03, 0.55 + dd * 0.55); });
}
// recorrido por puntos (longitudes precalculadas); t0 = salida, dur = lo que tarda
function mkPath(pts, t0, dur) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1])); return { pts, cum, L: cum[cum.length - 1], t0, dur }; }
function pathPos(P, u, out) {
  const s = clamp(u) * P.L; let i = 1; while (i < P.cum.length - 1 && P.cum[i] < s) i++;
  const a = P.pts[i - 1], b = P.pts[i], seg = P.cum[i] - P.cum[i - 1]; return out.copy(a).lerp(b, seg > 1e-9 ? (s - P.cum[i - 1]) / seg : 0);
}
// posición en el instante t (con saltitos al andar: son figuritas de cerámica); devuelve el progreso 0..1
function walk(P, t, out, hop = 0.0045) {
  const s = clamp((t - P.t0) / P.dur), u = s * s * (3 - 2 * s) * 0.35 + s * 0.65; pathPos(P, u, out);
  if (s > 0 && s < 1) out.y += hop * Math.abs(Math.sin(u * P.L / 0.032 * Math.PI));
  return s;
}

// ---------------------------------------------------------------- las torres de ofertas (folios), la torre fantasma de «el doble» y la llave
function buildPapers() {
  S.papA = paperSet(COLS[0].n, offerTex('ADE', '#c8202a')); scene.add(S.papA);
  S.papB = paperSet(COLS[1].n, offerTex('MARKETING', '#2b7a50')); scene.add(S.papB);
  S.papC = paperSet(COLS[2].n, offerTex('MEDICINA', '#2a5b9b')); scene.add(S.papC);
  const h2 = COLS[1].n * PT;
  S.ghost = new THREE.Mesh(new THREE.BoxGeometry(0.09, h2, 0.125), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x62e3d4).multiplyScalar(0.5), transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  edges(S.ghost, 0x62e3d4, 2, 20, 0.0); S.ghost.position.set(COLS[1].x, h2 * 1.5, COLS[1].z); S.ghost.visible = false; scene.add(S.ghost);
  // la lluvia del principio: cada folio i cae a partir de s_i (también al final, con t − END: el bucle es exacto)
  S.rain = [...Array(COLS[0].n)].map((_, i) => {
    const s = -1.6 + hash(i * 1.91 + 3) * 3.4, a = hash(i * 6.1) * 6.283, r = 0.06 + Math.sqrt(hash(i * 2.7)) * 0.3;
    let xl = P0.x + Math.cos(a) * r, zl = 0.86 + Math.sin(a) * r * 0.8; if (Math.hypot(xl - P0.x, zl - P0.z) < 0.06) zl -= 0.08;
    return { s, fall: 1.0 + hash(i * 3.3) * 0.45, x0: xl + (hash(i * 7.2) - 0.5) * 0.4, z0: Math.min(1.12, zl + (hash(i * 5.9) - 0.5) * 0.3), xl, zl,
      rx: (hash(i * 5.5) - 0.5) * 5, rz: (hash(i * 8.8) - 0.5) * 5, ry: hash(i * 9.4) * 6.28, sw: 0.6 + hash(i * 4.4) * 1.2 };
  });
  S.key = adeKey(); S.key.visible = false; scene.add(S.key);
  S.keyGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: starTex0(), color: new THREE.Color(1, 0.85, 0.5).multiplyScalar(1.5), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  S.keyGlow.visible = false; scene.add(S.keyGlow);
  // auditoría: calendario y examen · banca: certificado · Hacienda: temario
  const da = S.doors[doorKey(5, 0)], db = S.doors[doorKey(5, 1)], dh = S.doors[doorKey(5, 2)];
  S.cal = calendarBlock(); S.cal.position.set(-0.048, 0.05, 0.03); S.cal.visible = false; da.add(S.cal);
  S.exam = examSheet(); S.exam.position.set(0.088, 0.062, 0.012); S.exam.visible = false; da.add(S.exam);
  S.cert = certificate(); S.cert.visible = false; db.add(S.cert);
  const BK = [[0x6e1414, 'TEMARIO'], [0x173d2a, 'TEMA 1-30'], [0x1b2a4a, 'TEMA 31-60'], [0x4a2a14, 'TEMA 61-90'], [0x2a1a2e, 'SUPUESTOS'], [0x14361f, 'LEGISLACIÓN']];
  S.books = BK.map(([c, n], k) => { const b = spineBook(0.07 - k * 0.003, 0.05, 0.012, c, n); b.visible = false; dh.add(b); return b; });
  S.lad = ladder(1.24); S.lad.visible = false; scene.add(S.lad);
}
// ---------------------------------------------------------------- tiempos y animación (todo depende solo del instante t: se puede dibujar en cualquier orden)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const fract = x => x - Math.floor(x);
let TT = {};
function buildTimes() {
  TT = {
    signOff: K.salidas1 + 0.06,                                   // 1: la señal de SALIDA se apaga
    col0: K.y2, colB: K.carrera2 + 0.25,                          // 2: los folios forman las torres
    trap: K.trampa3,                                               // 3: «tiene trampa»
    ghost: K.doble4,                                               // 4: «más del doble»
    gridUp: K.n4_5 - 0.12, portO1: K.n8_5 - 0.5, enter: K.n8_5, portC1: K.media6 + 0.2,     // 5: las 100; entran 80
    cut: K.ahora7 + 0.04, up: K.trabajan7 + 0.1,                   // 7: la fachada se abre; suben 34
    caps: K.trabajos8 - 0.05, gray: K.pedian8,                     // 8: a los demás se les cae el birrete
    river: K.cada9,                                                // 9: los nuevos
    three: K.tres10,                                               // 10: tres salidas
    aud: K.auditorias11, yr: K.n3_11, exam: K.examen11, est: K.estado11,   // 11
    ban: K.banco12, cert: K.certificado12,                        // 12
    hac: K.hacienda13, opo: K.oposicion13,                         // 13
    try0: K.ninguna14 + 0.1,                                       // 14: la llave no abre ninguna
    fly: K.esa15, keyIn: K.ade15 - 0.06, turn: K.llave15 - 0.3, openP: K.portal15 - 0.12, locks: K.muchos15 - 0.08,   // 15
    allOn: K.salidas16, lad: K.atajos16 - 0.06, ladX: K.ninguno16, // 16
    portC2: K.no17 + 0.3, facIn: K.salidas17 + 0.1, papUp: K.auditoria17 + 0.3,   // 17 y vuelta al principio
  };
  TT.tries = [0, 1, 2].map(j => TT.try0 + j * 0.6);
  // cuándo se abre cada despacho con puesto: al llegar su primera figurita
  TT.doorOpen = {};
  for (const i of UP) { const f = FIG[i], key = doorKey(f.slot.k, f.slot.j), ta = f.up.t0 + f.up.dur * 0.78; TT.doorOpen[key] = Math.min(TT.doorOpen[key] ?? 1e9, ta - 0.25); }
  // orden de los candados de «muchos despachos» (los cerrados que no son los tres de arriba)
  TT.lockOrder = [];
  for (let k = 1; k < NLV; k++) for (let j = 0; j < 3; j++) { const key = doorKey(k, j); if (OPEN.some(([a, b]) => a === k && b === j) || SPECIAL.some(([a, b]) => a === k && b === j)) continue; TT.lockOrder.push(key); }
  TT.lockOrder.sort((a, b) => hash(a * 1.7) - hash(b * 1.7));
}
// parpadeo de un tubo al encenderse (k sube a 1 con dos fallos) o al apagarse
function flick(t, t0, d = 0.32) { const u = (t - t0) / d; if (u <= 0) return 0; if (u >= 1) return 1; return (u > 0.1 && u < 0.22) || (u > 0.38 && u < 0.5) || u > 0.72 ? 1 : 0.12; }

// ---------------------------------------------------------------- folios: lluvia (principio y final), torres y vuelta al cielo
const _o = new THREE.Object3D(), _pp = new THREE.Vector3(), _pq = new THREE.Vector3(), _e2 = new THREE.Euler();
function rainPos(i, tau, out, eul) {           // false si aún no ha empezado a caer (está fuera de cuadro, arriba)
  const R = S.rain[i]; if (tau < R.s) return false;
  const u = Math.min(1, (tau - R.s) / R.fall), w = 1 - u;
  out.set(lerp(R.x0, R.xl, u) + Math.sin(u * Math.PI * 2 * R.sw) * 0.05 * w, lerp(1.25, 0.0035 + (i % 9) * 0.0024, u * (0.75 + 0.25 * u)), lerp(R.z0, R.zl, u) + Math.cos(u * Math.PI * 2 * R.sw) * 0.04 * w);
  eul.set(R.rx * w + Math.sin(u * 9 + i) * 0.4 * w, R.ry + u * 1.2, R.rz * w + Math.cos(u * 7 + i) * 0.4 * w); return true;
}
function colPos(c, k, out, eul) { const C = COLS[c]; out.set(C.x + (hash(k * 3.1 + c) - 0.5) * 0.004, (k + 0.5) * PT, C.z + (hash(k * 5.3 + c) - 0.5) * 0.004); eul.set(0, (hash(k * 7.7 + c) - 0.5) * 0.12, 0); }
function papersAt(t) {
  const A = S.papA, n = COLS[0].n, hide = () => { _o.scale.setScalar(0.0001); };
  for (let i = 0; i < n; i++) {
    _o.scale.setScalar(1);
    const tf = TT.col0 + (i / n) * 1.45;
    if (t >= TT.papUp) { if (!rainPos(i, t - END, _pp, _e2)) hide(); _o.position.copy(_pp); _o.rotation.copy(_e2); }      // otra vez la lluvia (bucle): las torres ya no se ven
    else if (t >= tf) { const e = eio(clamp((t - tf) / 0.5)); rainPos(i, Math.min(t, tf + 0.5), _pq, _e2); colPos(0, i, _pp, _e2);
      _o.position.copy(_pq).lerp(_pp, e); _o.position.y += Math.sin(Math.PI * e) * 0.22; const R = S.rain[i]; _o.rotation.set(R.rx * (1 - e) * 0.3, lerp(R.ry, _e2.y, e), R.rz * (1 - e) * 0.3); }
    else { if (!rainPos(i, t, _pp, _e2)) hide(); _o.position.copy(_pp); _o.rotation.copy(_e2); }
    _o.updateMatrix(); A.setMatrixAt(i, _o.matrix);
  }
  A.instanceMatrix.needsUpdate = true;
  [[S.papB, 1], [S.papC, 2]].forEach(([P, c]) => {
    const m = COLS[c].n;
    for (let k = 0; k < m; k++) {
      const tb = TT.colB + (k / m) * 1.15 + c * 0.08;
      colPos(c, k, _pp, _e2); _o.rotation.copy(_e2); _o.scale.setScalar(1);
      if (t < tb || t >= TT.papUp) _o.scale.setScalar(0.0001);
      else if (t < tb + 0.14) _pp.y += (1 - (t - tb) / 0.14) * 0.06;
      _o.position.copy(_pp); _o.updateMatrix(); P.setMatrixAt(k, _o.matrix);
    }
    P.instanceMatrix.needsUpdate = true;
  });
  // la torre fantasma: el doble de la segunda… y la de ADE sigue siendo más alta
  const gk = cwin(t, TT.ghost - 0.05, K.n4_5 - 0.1, 0.3, 0.3), h2 = COLS[1].n * PT; S.ghost.visible = gk > 0.01;
  if (S.ghost.visible) { const e = eo(clamp((t - TT.ghost + 0.05) / 0.55)); S.ghost.position.y = lerp(h2 * 0.5, h2 * 1.5, e) + 0.002; S.ghost.material.opacity = 0.32 * gk; S.ghost.userData.edges.material.opacity = 0.95 * gk; }
}

// ---------------------------------------------------------------- figuritas
const _fp = new THREE.Vector3(), _col = new THREE.Color();
function crowdAt(t) {
  const G = S.grid, Cp = S.caps;
  for (let i = 0; i < 100; i++) {
    const f = FIG[i]; let sc = pops(t, TT.gridUp + hash(i * 2.9) * 0.4, 0.4);
    _fp.copy(f.gp); _col.copy(C_CER); let capFall = -1;
    if (f.stay) {
      _col.lerp(C_GREY, win(t, TT.enter + 0.5, 0.6) * 0.85);
      if (t >= f.absorb.t0) { const s = walk(f.absorb, t, _fp); sc *= 1 - clamp((s - 0.72) / 0.28); }
    } else {
      _col.lerp(C_LIT, win(t, TT.enter - 0.05 + hash(i) * 0.25, 0.25));
      walk(f.enter, t, _fp);
      if (f.up && t >= f.up.t0) { const s = walk(f.up, t, _fp); _col.lerp(C_GOLD, clamp((s - 0.7) / 0.3)); }
      else if (f.up) { /* aún en la planta baja */ }
      if (!f.up) { _col.lerp(C_GREY, win(t, TT.gray + hash(i * 5.1) * 0.35, 0.3)); capFall = TT.caps + hash(i * 3.7) * 0.7; }
    }
    if (sc < 0.002) _o.scale.setScalar(0.0001); else _o.scale.setScalar(sc);
    _o.position.copy(_fp); _o.rotation.set(0, 0, 0); _o.updateMatrix(); G.setMatrixAt(i, _o.matrix); G.setColorAt(i, _col);
    // birrete: en la cabeza; a los de la planta baja se les cae al suelo
    if (capFall > 0 && t > capFall) {
      const u = clamp((t - capFall) / 0.34), b = t > capFall + 0.34 ? Math.abs(Math.sin((t - capFall - 0.34) * 18)) * Math.exp(-(t - capFall - 0.34) * 9) * 0.006 : 0;
      const sd = hash(i * 9.3) > 0.5 ? 1 : -1;
      _o.position.set(_fp.x + sd * 0.022 * u, _fp.y - 0.0585 * u * u + b, _fp.z + 0.014 * u); _o.rotation.set(0.25 * u, hash(i) * 2 * u, sd * 0.4 * u * (1 - u));
    }
    _o.updateMatrix(); Cp.setMatrixAt(i, _o.matrix);
  }
  G.instanceMatrix.needsUpdate = true; G.instanceColor.needsUpdate = true; Cp.instanceMatrix.needsUpdate = true;
  // los graduados nuevos
  const Rm = S.river, Rc = S.rcaps;
  for (let j = 0; j < NR; j++) {
    const R = RIV[j]; let sc = 1;
    if (t < R.enter.t0 || t < TT.river - 0.5) sc = 0;
    else { walk(R.enter, t, _fp, 0.004); if (t >= R.absorb.t0) { const s = walk(R.absorb, t, _fp, 0.004); sc = 1 - clamp((s - 0.7) / 0.3); } }
    _o.position.copy(_fp); _o.rotation.set(0, 0, 0); _o.scale.setScalar(Math.max(0.0001, sc)); _o.updateMatrix(); Rm.setMatrixAt(j, _o.matrix); Rc.setMatrixAt(j, _o.matrix);
  }
  Rm.instanceMatrix.needsUpdate = true; Rc.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- edificio: fachada, portal, despachos, señales, candados, llave y escalera
const _kp = new THREE.Vector3(), _kq = new THREE.Vector3(), _kd = new THREE.Vector3(), _kc = new THREE.Vector3(), _ky = new THREE.Vector3();
function lockWorld(key, out) { const d = S.doors[key]; return d.userData.lk.getWorldPosition(out); }
function buildingAt(t) {
  // fachada: se va de arriba abajo con «Ahora, lo feo» (barrido de luz) y vuelve de abajo arriba al final
  const nF = S.facade.length;
  S.facade.forEach((f, idx) => {
    const lvl = idx < NLV - 1 ? idx + 1 : 0;
    const a = 1 - win(t, TT.cut + (NLV - 1 - lvl) * 0.13, 0.3) + win(t, TT.facIn + lvl * 0.1, 0.35);
    f.material.opacity = clamp(a); f.visible = a > 0.01; f.material.depthWrite = a > 0.6;
  });
  { const u = (t - TT.cut) / 0.95; S.scan.visible = u > 0 && u < 1; if (S.scan.visible) { S.scan.position.y = lerp(TOPY + 0.02, 0.01, u); S.scan.material.opacity = Math.sin(u * Math.PI); } }
  // portal: se abre para los 80, se cierra; la llave lo vuelve a abrir; se cierra al final
  const op = Math.max(eio(win(t, TT.portO1, 0.45)) * (1 - eio(win(t, TT.portC1, 0.5))), eio(win(t, TT.openP, 0.55)) * (1 - eio(win(t, TT.portC2, 0.55))));
  S.leaves[0].rotation.y = op * 1.35; S.leaves[1].rotation.y = -op * 1.35;
  S.inGlow.material.color.setRGB(1, 0.86, 0.66).multiplyScalar(0.1 + op * 0.55);
  const fl = win(t, TT.openP + 0.05, 0.25) * (1 - win(t, TT.openP + 0.6, 1.6) * 0.65) * (1 - win(t, TT.portC2 - 0.2, 0.5)); S.flood.visible = fl > 0.01; S.flood.material.opacity = fl;
  // señal grande del portal: encendida, se apaga con «salidas»; se enciende con «Salidas tiene»
  signOn(S.bigSign, t < TT.allOn ? 1 - flick(t, TT.signOff, 0.4) : flick(t, TT.allOn, 0.35));
  // despachos
  for (const key in S.doors) {
    const d = S.doors[key], U = d.userData, sp = SPECIAL.findIndex(([a, b]) => a === U.k && b === U.j), ot = TT.doorOpen[key];
    const o = ot ? eio(win(t, ot, 0.4)) : 0;
    U.pv.rotation.y = -o * 1.25; U.glow.material.color.setRGB(1, 0.77, 0.42).multiplyScalar(0.18 + o * 1.9);
    let on = t >= TT.allOn ? flick(t, TT.allOn + 0.04 + hash(key * 1.3) * 0.5, 0.3) : 0;
    if (sp >= 0 && t >= TT.three) on = Math.max(on, flick(t, TT.three + sp * 0.14, 0.3));
    signOn(U.sg, on);
    // candados: los tres de arriba, con su frase; los demás en cascada con «muchos despachos»
    let lt = null; if (sp === 0) lt = TT.aud; if (sp === 1) lt = TT.ban; if (sp === 2) lt = TT.hac;
    const li = TT.lockOrder.indexOf(+key); if (li >= 0) lt = TT.locks + li * 0.2;
    const lk = U.lk; lk.visible = lt !== null && t > lt && t < TT.facIn + 2;
    if (lk.visible) { const u = clamp((t - lt) / 0.3); lk.scale.setScalar(U.lk.userData.s0 * Math.max(0.0001, backOut(u))); lk.userData.sh.position.y = 0.014 * (1 - eio(clamp((t - lt - 0.18) / 0.12))); lk.position.y = DH * 0.47 + 0.03 * (1 - eo(u)); }
    // destello rojo cuando la llave «ADE» no gira
    if (sp >= 0) { const tr = TT.tries[sp], fx = t > tr + 0.28 ? Math.exp(-(t - tr - 0.28) * 7) : 0; lk.children[0].material.emissive?.setRGB(fx * 0.9, 0, 0); }
  }
  // auditoría: el calendario pasa tres hojas (año 1, 2, 3) y aparece el examen; banca: el certificado entra en la cerradura; Hacienda: el temario crece
  S.cal.visible = t > TT.aud + 0.25 && t < TT.facIn; if (S.cal.visible) { S.cal.scale.setScalar(Math.max(0.0001, backOut(clamp((t - TT.aud - 0.25) / 0.3)))); S.cal.userData.pages.forEach((pv, k) => { const tf = TT.yr + 0.1 + k * 0.28; pv.rotation.x = k < 2 ? -eio(clamp((t - tf) / 0.22)) * 2.6 : 0; pv.visible = pv.rotation.x > -2.55; }); }
  S.exam.visible = t > TT.exam - 0.05 && t < TT.facIn; if (S.exam.visible) { const u = clamp((t - TT.exam + 0.05) / 0.35); S.exam.scale.setScalar(Math.max(0.0001, backOut(u))); S.exam.rotation.z = (1 - eo(u)) * 0.8; }
  S.cert.visible = t > TT.cert - 0.1 && t < TT.facIn; if (S.cert.visible) { const u = eio(clamp((t - TT.cert + 0.1) / 0.6)), lk = S.doors[doorKey(5, 1)].userData.lk; S.cert.position.set(lerp(-0.06, lk.position.x - 0.005, u), lerp(0.1, lk.position.y - 0.035, u), lerp(0.08, 0.03, u)); S.cert.rotation.set(0, lerp(0.6, 0, u), lerp(-0.4, 0, u)); S.cert.scale.setScalar(lerp(0.9, 0.55, u)); }
  S.books.forEach((b, k) => { const tb = TT.opo - 0.05 + k * 0.09; b.visible = t > tb && t < TT.facIn; if (b.visible) { const u = clamp((t - tb) / 0.2); b.rotation.set(0, (hash(k * 3.3) - 0.5) * 0.25, 0); b.position.set(-0.088 + (hash(k * 1.9) - 0.5) * 0.008, k * 0.0122 + (1 - eo(u)) * 0.05, 0.045); } });
  keyAt(t);
  // escalera «ATAJO»: aparece apoyada en la fachada, se tacha y se cae
  const L = S.lad; L.visible = t > TT.lad && t < TT.ladX + 0.75;
  if (L.visible) { const pu = backOut(clamp((t - TT.lad) / 0.28)), fu = clamp((t - TT.ladX - 0.08) / 0.6); L.scale.setScalar(Math.max(0.0001, pu)); L.position.set(0.3, -fu * fu * 0.25, 0.6 + fu * 0.15); L.rotation.set(-0.29 + fu * fu * 1.7, 0, fu * 0.25); }
}
// la llave: prueba las tres cerraduras de arriba (no gira), baja creciendo hasta el portal, entra, gira y se deshace en luz
const _kh = new THREE.Vector3(), _kx = new THREE.Vector3(), _kyy = new THREE.Vector3();
const AX_T = new THREE.Vector3(-0.35, -0.18, -1).normalize(), AX_P = new THREE.Vector3(0, 0, -1), TIP = 0.168, S_IN = 1.15;
const _kf1 = new THREE.Vector3(), _kf2 = new THREE.Vector3();
function keyFlight(t, out) {          // dónde va la llave mientras baja desde Hacienda hasta el portal (también la sigue la cámara)
  const u = eio(clamp((t - TT.fly) / (TT.keyIn - TT.fly)));
  lockWorld(doorKey(5, 2), _kf1); _kf1.y += 0.0024; _kf1.z += 0.0063; _kf1.addScaledVector(AX_T, -(TIP * 0.3 + 0.03));
  _kf2.set(0, 0.102, BZ1 + 0.0205).addScaledVector(AX_P, -(TIP * S_IN + 0.1));
  out.copy(_kf1).lerp(_kf2, u); out.x += Math.sin(Math.PI * u) * 0.22; out.z += Math.sin(Math.PI * u) * 0.3; return out;
}
function keyAt(t) {
  const K0 = S.key, vis = t > TT.try0 - 0.3 && t < TT.openP + 0.45; K0.visible = vis; S.keyGlow.visible = false; if (!vis) return;
  _kh.set(0, 0.102, BZ1 + 0.0205);                                  // ojo de la cerradura del portal (puerta cerrada)
  // delante de la cerradura del despacho j de arriba: la punta toca el ojo; back = cuánto se separa
  const front = (j, s, ax, back, out) => { lockWorld(doorKey(5, j), out); out.y += 0.0024; out.z += 0.0063; return out.addScaledVector(ax, -(TIP * s + back)); };
  let s = 0.3, roll = 0; const pos = _kp, axis = _kd;
  if (t < TT.fly) {
    axis.copy(AX_T);
    let j = 0; for (let q = 0; q < 3; q++) if (t >= TT.tries[q] - 0.05) j = q;
    const tr = TT.tries[j];
    if (t < tr) { front(0, s, axis, 0.05, pos); pos.y += 0.05 * (1 - eo(clamp((t - TT.try0 + 0.3) / 0.3))); }
    else if (t < tr + 0.14) front(j, s, axis, 0.035 * (1 - eio((t - tr) / 0.14)), pos);
    else if (t < tr + 0.42) { front(j, s, axis, 0, pos); roll = Math.sin((t - tr - 0.14) * 38) * 0.25 * (1 - (t - tr - 0.14) / 0.28); }
    else if (j < 2 && t < tr + 0.6) { const u = eio((t - tr - 0.42) / 0.18); front(j, s, axis, 0.03, pos); front(j + 1, s, axis, 0.03, _kq); pos.lerp(_kq, u); pos.y += Math.sin(Math.PI * u) * 0.025; }
    else front(j, s, axis, 0.03 * clamp((t - tr - 0.42) / 0.1), pos);
  } else if (t < TT.keyIn) {
    const u = eio(clamp((t - TT.fly) / (TT.keyIn - TT.fly)));
    s = lerp(0.3, S_IN, u); axis.copy(AX_T).lerp(AX_P, u).normalize(); keyFlight(t, pos);
  } else {
    s = S_IN; axis.copy(AX_P);
    const u = eio(clamp((t - TT.keyIn) / 0.3)); pos.copy(_kh).addScaledVector(AX_P, -(TIP * S_IN - 0.022 + 0.1 * (1 - u)));
    roll = eio(clamp((t - TT.turn) / 0.28)) * Math.PI / 2;
    const gone = clamp((t - TT.openP - 0.1) / 0.3); s *= 1 - gone * gone;
    S.keyGlow.visible = t > TT.turn; S.keyGlow.position.copy(pos).addScaledVector(AX_P, -0.08); S.keyGlow.quaternion.copy(cam.quaternion);
    S.keyGlow.material.opacity = win(t, TT.turn + 0.12, 0.2) * (0.55 + gone * 1.3) * (1 - clamp((t - TT.openP - 0.38) / 0.08)); S.keyGlow.scale.setScalar(0.5 + gone * 1.5);
  }
  K0.position.copy(pos); K0.scale.setScalar(Math.max(0.0001, s));
  // la punta (−z de la llave) apunta a la cerradura; el ojo de la llave se gira hacia la cámara (más el giro de «no gira» / «gira»)
  _kq.copy(pos).sub(axis); K0.up.set(0, 1, 0); K0.lookAt(_kq); K0.updateMatrixWorld();
  _kc.copy(cam.position).sub(pos).normalize(); _ky.setFromMatrixColumn(K0.matrixWorld, 2).normalize(); _kc.addScaledVector(_ky, -_kc.dot(_ky));
  _kx.setFromMatrixColumn(K0.matrixWorld, 0).normalize(); _kyy.setFromMatrixColumn(K0.matrixWorld, 1).normalize();
  K0.rotateZ(Math.atan2(_kc.dot(_kyy), _kc.dot(_kx)) + roll);
}
function sceneAt(t) { papersAt(t); crowdAt(t); buildingAt(t); }
// ---------------------------------------------------------------- cámara: un solo plano que recorre la maqueta. Empieza a ras de suelo junto a la figurita
// (la lluvia de ofertas, la señal de SALIDA) y acaba exactamente igual: el último fotograma enlaza con el primero.
let CKS = [];
const K0C = [[0.05, 0.075, 1.5], [0.0, 0.19, 0.72], 34];
function buildCam() {
  const D5 = FLY(5) + 0.062;                                                     // centro de las puertas de arriba
  CKS = [
    [0, ...K0C],
    [1.9, [0.045, 0.08, 1.45], [0.0, 0.2, 0.7], 34],
    [K.y2 + 0.05, [0.0, 0.11, 1.42], [-0.12, 0.24, 0.7], 34],                 // 2: sube y se ve la torre de ADE
    [K.empresas2 + 0.1, [-0.2, 0.5, 2.1], [-0.6, 0.42, 0.46], 34],
    [K.trampa3, [0.3, 0.46, 1.95], [0.0, 0.42, 0.3], 34],                     // 3: «tiene trampa»
    [K.cuento3 + 0.15, [0.15, 0.36, 1.55], [0.0, 0.34, 0.25], 34],
    [K.aparece4, [-0.55, 0.5, 2.25], [-0.78, 0.42, 0.46], 34],                // 4: las tres torres
    [K.segunda4 + 0.2, [-0.6, 0.52, 2.15], [-0.79, 0.43, 0.46], 34],
    [K.n4_5 + 0.15, [0.3, 0.52, 1.95], [0.0, 0.12, 0.62], 34],                 // 5: la plaza y las 100
    [K.trabajando5 + 0.3, [0.22, 0.4, 1.66], [0.0, 0.12, 0.45], 34],
    [K.n32_6, [0.12, 0.5, 1.9], [0.02, 0.36, 0.25], 34],                       // 6: el sueldo
    [K.ahora7, [0.06, 0.62, 2.3], [0.06, 0.6, 0.0], 34],                       // 7: de frente; se abre la fachada
    [K.solo7 + 0.3, [0.08, 0.66, 2.35], [0.06, 0.62, 0.0], 34],
    [K.universitario7 + 0.4, [0.06, 0.56, 2.05], [0.04, 0.5, 0.0], 34],
    [K.resto8 + 0.05, [-0.5, 0.21, 0.86], [-0.06, 0.06, -0.03], 34],          // 8: la planta baja, de lado (se caen los birretes)
    [K.carrera8 + 0.3, [-0.54, 0.19, 0.8], [-0.08, 0.055, -0.04], 34],
    [K.salen9, [0.85, 0.85, 2.35], [0.25, 0.12, 0.62], 34],                    // 9: llegan los nuevos por la derecha
    [K.nuevos9 + 0.3, [0.9, 0.95, 2.5], [0.15, 0.2, 0.55], 34],
    [K.tres10 + 0.15, [0.0, D5 + 0.03, 1.55], [0.0, D5, -0.2], 34],             // 10: las tres puertas de arriba
    [K.tipicas10 + 0.35, [0.0, D5 + 0.03, 1.4], [0.0, D5, -0.2], 34],
    [K.auditorias11 + 0.1, [-0.2, D5 + 0.02, 0.46], [-0.24, D5, -0.2], 34],     // 11: auditoría
    [K.estado11 + 0.2, [-0.18, D5 + 0.01, 0.42], [-0.235, D5 - 0.005, -0.2], 34],
    [K.banco12, [0.05, D5 + 0.02, 0.46], [0.0, D5, -0.2], 34],                  // 12: banca
    [K.aparte12 + 0.25, [0.06, D5 + 0.01, 0.42], [0.0, D5 - 0.005, -0.2], 34],
    [K.hacienda13, [0.2, D5 + 0.02, 0.46], [0.235, D5, -0.2], 34],              // 13: Hacienda (por delante del ascensor)
    [K.oposicion13 + 0.5, [0.2, D5 + 0.0, 0.44], [0.235, D5 - 0.015, -0.2], 34],
    [TT.tries[0], [-0.16, D5 + 0.04, 0.72], [-0.24, D5, -0.2], 34],             // 14: la llave prueba las tres
    [TT.tries[1], [0.06, D5 + 0.04, 0.72], [0.0, D5, -0.2], 34],
    [TT.tries[2] + 0.2, [0.19, D5 + 0.04, 0.72], [0.235, D5, -0.2], 34],
    [TT.fly + 0.5, [0.55, 0.72, 1.45], [0.18, 0.55, 0.22], 34],                 // 15: baja con la llave hasta el portal
    [TT.keyIn + 0.1, [0.36, 0.27, 1.05], [0.05, 0.13, 0.38], 34],
    [TT.openP + 0.15, [0.3, 0.26, 0.98], [0.02, 0.13, 0.34], 34],
    [K.despachos15 + 0.2, [0.05, 0.72, 2.45], [0.02, 0.64, 0.0], 34],           // «muchos despachos»: todo el edificio
    [K.cerradura15 + 0.3, [0.02, 0.74, 2.5], [0.02, 0.65, 0.0], 34],
    [K.atajos16, [0.2, 0.7, 2.45], [0.1, 0.6, 0.1], 34],                         // 16: salidas encendidas; la escalera «ATAJO»
    [K.ninguno16 + 0.5, [0.28, 0.62, 2.3], [0.15, 0.5, 0.2], 34],
    [K.salidas17, [0.22, 0.2, 1.75], [0.0, 0.2, 0.7], 34],                       // 17: vuelve a la plaza
    [K.banca17 + 0.2, [0.06, 0.08, 1.52], [0.0, 0.19, 0.72], 34],
    [END, ...K0C],
  ];
}
const _cf = new THREE.Vector3();
function camAt(t) {
  const c = camKeys(t, CKS);
  if (t > TT.fly && t < TT.keyIn) { const u = clamp((t - TT.fly) / (TT.keyIn - TT.fly)); keyFlight(t, _cf); c.l.lerp(_cf, Math.pow(Math.sin(Math.PI * u), 0.7) * 0.85); }   // sigue a la llave
  return c;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.cut, 0.03], [TT.openP + 0.1, 0.06], [TT.allOn, 0.025], [TT.ladX + 0.02, 0.03]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st0) {
  NOW = t;
  const c = st0.l, d = st0.p.distanceTo(c), yaw = Math.atan2(st0.p.x - c.x, st0.p.z - c.z), k = clamp(d / 3.2, 0.3, 1.1);
  rigAt(c, yaw, k, 0.8, 0.6);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.16;
  scene.fog.density = lerp(0.12, 0.05, clamp((d - 0.6) / 2));
  sceneAt(t);
  post.uniforms.fade.value = 0;
}
// ---------------------------------------------------------------- HUD: la trampa pendiente (arriba a la derecha), rótulos con línea guía, cifras grandes con su fuente,
// corchetes en las tres puertas, las ✗ de la llave, los sellos del final y la pregunta de bando
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
  hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 6; hg.fillText(typed('FUENTE: ' + txt, clamp(k * 1.5)), 56, 1548); hg.restore();
}
function cross(P, k, s = 34) {
  if (k <= 0.01 || !P) return; const e = backOut(clamp(k / 0.5)), r = s * e;
  hg.save(); hg.globalAlpha = clamp(k * 3); glowStroke(HRd, 9, 18); hg.lineCap = 'round';
  hg.beginPath(); hg.moveTo(P.x - r, P.y - r); hg.lineTo(P.x + r, P.y + r); hg.moveTo(P.x + r, P.y - r); hg.lineTo(P.x - r, P.y + r); hg.stroke(); noGlow(); hg.restore();
}
function pollPills(t, k) {
  if (k <= 0.01) return;
  const items = [['AUDITORÍA', '#62E3D4', 290], ['BANCA', '#FFC24A', 790]], y = 1370;
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
function hudAt(t) {
  hudBegin();
  const cw2 = (t0, t1, fi = 0.22, fo = 0.22) => win(t, t0, fi) * (1 - win(t, t1, fo));
  // la trampa, pendiente hasta la respuesta
  bracketMsg(t, 'LA TRAMPA · ???', HC.amber, cw2(TT.trap + 0.05, K.trampa15, 0.3, 0.12), true);
  bracketMsg(t, 'LA TRAMPA ↓', HGr, cw2(K.trampa15, K.ade15 + 0.9, 0.12, 0.3), false);
  // 2 · 4: las torres de ofertas
  const top = c => _hv.set(COLS[c].x, COLS[c].n * PT + 0.01, COLS[c].z).clone();
  lab(top(0), 'LA MÁS PEDIDA', 'POR LAS EMPRESAS', cw2(K.piden2 - 0.05, K.trampa3 - 0.1), { color: HGd, dx: 120, dy: -60 });
  lab(top(0), 'ADE', '3,67 % DE LAS OFERTAS', cw2(K.ade4 + 0.05, K.n4_5 - 0.15), { color: HGd, dx: 130, dy: -40 });
  lab(top(1), 'COMERCIO Y MARKETING', '2.ª · 1,57 %', cw2(K.segunda4 - 0.25, K.n4_5 - 0.15), { color: HC.white, dx: -110, dy: 120 });
  lab(_hv.set(COLS[1].x, COLS[1].n * PT * 2 + 0.01, COLS[1].z).clone(), 'EL DOBLE', 'Y NO LLEGA', cw2(K.doble4 + 0.35, K.n4_5 - 0.15), { color: HC.teal, dx: -120, dy: -90 });
  srcLine('INFORME INFOEMPLEO ADECCO, OFERTAS DE EMPLEO DE 2024', cw2(K.ade4 + 0.2, K.n4_5 - 0.15));
  // 5 · 6 · 7: trabajan, cobran, puesto de universitario
  bigFig('8 DE CADA 10', 'TRABAJAN 4 AÑOS DESPUÉS', HC.white, cw2(K.n8_5 - 0.05, K.cobran6 + 0.15));
  { const k = cw2(K.n32_6 - 0.1, K.ahora7 - 0.1), n = Math.round(32000 * eo(clamp((t - K.n32_6 + 0.1) / 0.8)) / 100) * 100;
    bigFig(n.toLocaleString('es-ES').replace(/ /g, '.') + ' €', 'AL AÑO, DE MEDIA', HGd, k); }
  srcLine('U-RANKING 2026 (FUNDACIÓN BBVA E IVIE) · ADMINISTRACIÓN Y EMPRESA', cw2(K.n8_5, K.resto8 + 2.4));
  bigFig('4 DE CADA 10', 'CON PUESTO DE UNIVERSITARIO', HGd, cw2(K.n4_7 - 0.05, K.resto8 - 0.1));
  // 8: el resto
  lab(_hv.set(-0.1, 0.075, 0.05).clone(), 'SIN PUESTO DE UNIVERSITARIO', 'CASI 6 DE CADA 10', cw2(K.resto8 + 0.25, K.y9 - 0.1), { color: HC.grey, subCol: HC.white, dx: 140, dy: -170 });
  // 9: los nuevos
  { const k = cw2(K.salen9 - 0.05, K.fijate10 - 0.1), n = Math.round(14988 * eo(clamp((t - K.salen9) / 1.6)));
    bigFig('+' + n.toLocaleString('es-ES').replace(/ /g, '.'), 'GRADUADOS NUEVOS EN UN AÑO', HC.white, k, 1300); }
  // 10: tres salidas típicas
  SPECIAL.forEach(([k5, j], q) => { const d = S.doors[doorKey(k5, j)]; d.getWorldPosition(_hv); _hv.y += DH / 2; const P = proj(_hv);
    brackets(P.ok ? P : null, 190, 300, cw2(K.tres10 + q * 0.18, K.firmar11 + 0.1, 0.25, 0.25), HGr, 3); });
  // 11: auditoría · 12: banca · 13: Hacienda
  { const d = S.doors[doorKey(5, 0)];
    lab(d.localToWorld(v3(-0.048, 0.08, 0.035)), '3 AÑOS', 'DE EXPERIENCIA', cw2(K.n3_11, K.banco12 - 0.5), { color: HGd, dx: -60, dy: -160 });
    lab(d.localToWorld(v3(0.088, 0.04, 0.02)), 'EXAMEN DEL ESTADO', 'PARA FIRMAR AUDITORÍAS', cw2(K.examen11, K.banco12 - 0.5), { color: HC.white, dx: 60, dy: 190 }); }
  srcLine('LEY 22/2015 DE AUDITORÍA DE CUENTAS, ART. 9', cw2(K.n3_11, K.banco12 - 0.5));
  { const d = S.doors[doorKey(5, 1)], c = S.cert; if (c.visible) { c.getWorldPosition(_hv); lab(_hv.clone(), 'CERTIFICADO APARTE', 'LO EXIGE LA CNMV', cw2(K.certificado12, K.inspector13 - 0.2), { color: HGd, dx: 90, dy: -170 }); } }
  srcLine('CNMV, GUÍA TÉCNICA 4/2017 (MIFID II)', cw2(K.certificado12, K.inspector13 - 0.2));
  stamp('OPOSICIÓN', 540, 1330, cw2(K.oposicion13 + 0.05, K.ninguna14 - 0.05, 0.05, 0.2), HRd, 84);
  srcLine('CUERPO SUPERIOR DE INSPECTORES DE HACIENDA DEL ESTADO', cw2(K.oposicion13, K.ninguna14 - 0.05));
  // 14: la llave «ADE» no gira en ninguna
  SPECIAL.forEach(([k5, j], q) => { const tr = TT.tries[q]; lockWorld(doorKey(k5, j), _hv); _hv.y += 0.045; const P = proj(_hv); cross(P.ok ? P : null, cw2(tr + 0.28, TT.fly + 0.2, 0.25, 0.25), 30); });
  // 15: la llave del portal y los candados
  if (S.key.visible && t > K.llave15 - 0.1) { S.key.getWorldPosition(_hv); lab(_hv.clone(), 'ADE', 'LA LLAVE DEL PORTAL', cw2(K.llave15 - 0.05, K.pero15 + 0.1), { color: HGd, dx: -150, dy: -230 }); }
  { const key = TT.lockOrder[0]; lockWorld(key, _hv); lab(_hv.clone(), 'SU PROPIA CERRADURA', 'EN MUCHOS DESPACHOS', cw2(K.propia15 - 0.1, K.salidas16 - 0.1), { color: HRd, dx: 150, dy: -150 }); }
  // 16: salidas sí, atajos no
  stamp('SALIDAS ✓', 540, 1280, cw2(K.salidas16 + 0.05, K.mandaselo17 - 0.1, 0.05, 0.25), HGr, 70);
  stamp('ATAJOS ✗', 540, 1430, cw2(K.ninguno16 + 0.02, K.mandaselo17 - 0.1, 0.05, 0.25), HRd, 70);
  // 17: ¿auditoría o banca?
  pollPills(t, cw2(K.auditoria17 - 0.05, END - 0.35, 0.35, 0.3));
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
  END = Math.ceil((lines[lines.length - 1].end + 1.25) * 2) / 2;          // ≈ 1,3 s de cola tras la última palabra (59 s)
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    dijeron1: atL(1, 'dijeron'), ade1: atL(1, '=ade'), no1: atL(1, '=no'), salidas1: atL(1, 'salidas'),
    y2: atL(2, '=y'), carrera2: atL(2, 'carrera'), piden2: atL(2, 'piden'), empresas2: atL(2, 'empresas'),
    tiene3: atL(3, 'tiene'), trampa3: atL(3, 'trampa'), final3: atL(3, 'final'), cuento3: atL(3, 'cuento'),
    ade4: atL(4, '=ade'), aparece4: atL(4, 'aparece'), doble4: atL(4, 'doble'), ofertas4: atL(4, 'ofertas'), segunda4: atL(4, 'segunda'), carrera4: atL(4, 'carrera'),
    n4_5: atL(5, '=4'), anos5: atL(5, 'anos'), acabar5: atL(5, 'acabar'), n8_5: atL(5, '=8'), trabajando5: atL(5, 'trabajando'),
    cobran6: atL(6, 'cobran'), media6: atL(6, 'media'), n32_6: atL(6, '32000'), euros6: atL(6, 'euros'), ano6: atL(6, '=ano'),
    ahora7: atL(7, 'ahora'), feo7: atL(7, 'feo'), trabajan7: atL(7, 'trabajan'), solo7: atL(7, 'solo'), n4_7: atL(7, '=4'), tienen7: atL(7, 'tienen'), puesto7: atL(7, 'puesto'), universitario7: atL(7, 'universitario'),
    resto8: atL(8, 'resto'), trabajos8: atL(8, 'trabajos'), pedian8: atL(8, 'pedian'), carrera8: atL(8, 'carrera'),
    y9: atL(9, '=y'), cada9: atL(9, 'cada'), salen9: atL(9, 'salen'), n15_9: atL(9, '15000'), graduados9: atL(9, 'graduados'), nuevos9: atL(9, 'nuevos'),
    fijate10: atL(10, 'fijate'), tres10: atL(10, 'tres'), salidas10: atL(10, 'salidas'), tipicas10: atL(10, 'tipicas'),
    firmar11: atL(11, 'firmar'), auditorias11: atL(11, 'auditorias'), n3_11: atL(11, '=3'), experiencia11: atL(11, 'experiencia'), examen11: atL(11, 'examen'), estado11: atL(11, 'estado'),
    asesorar12: atL(12, 'asesorar'), banco12: atL(12, 'banco'), certificado12: atL(12, 'certificado'), aparte12: atL(12, 'aparte'),
    inspector13: atL(13, 'inspector'), hacienda13: atL(13, 'hacienda'), oposicion13: atL(13, 'oposicion'),
    ninguna14: atL(14, 'ninguna'), abre14: atL(14, 'abre'), ade14: atL(14, '=ade'),
    esa15: atL(15, 'esa'), trampa15: atL(15, 'trampa'), ade15: atL(15, '=ade'), llave15: atL(15, 'llave'), portal15: atL(15, 'portal'), pero15: atL(15, 'pero'),
    muchos15: atL(15, 'muchos'), despachos15: atL(15, 'despachos'), propia15: atL(15, 'propia'), cerradura15: atL(15, 'cerradura'),
    salidas16: atL(16, 'salidas'), atajos16: atL(16, 'atajos'), ninguno16: atL(16, 'ninguno'),
    mandaselo17: atL(17, 'mandaselo'), dijo17: atL(17, 'dijo'), ade17: atL(17, '=ade'), no17: atL(17, '=no'), salidas17: atL(17, 'salidas'), auditoria17: atL(17, 'auditoria'), banca17: atL(17, 'banca'),
  };
  mats(); buildMats(); buildRig();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45; }
  scene.fog = new THREE.FogExp2(0x000000, 0.08);
  buildFlow(); buildFloor(); buildBuilding(); buildCrowd(); buildPapers();
  buildTimes();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.TT = TT; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
