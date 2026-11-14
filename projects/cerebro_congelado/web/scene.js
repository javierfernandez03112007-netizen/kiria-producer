// «Qué pasa cuando te crujes los dedos» (estilo del vídeo de Derecho, realista y de cine): una mano gigante en rayos X que se cruje los nudillos, el
// nudillo por dentro con su burbuja, la resonancia de 2015, el debate, los 20 minutos, las dos manos de Unger, las radiografías, el Ig Nobel y las 215 personas.
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
import { triTable } from 'three/addons/objects/MarchingCubes.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
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
    fade: { value: 0 }, white: { value: 0 }, vig: { value: 0.38 }, time: { value: 0 }, flash: { value: 0 }, bloom: { value: 0.75 }, ca: { value: 1 }, mbk: { value: 0.8 }, tint: { value: new THREE.Vector3(0, 0, 0) } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D tA, tB, tC, tF, tH; uniform vec2 m0, a0; uniform vec4 J; uniform vec3 tint; uniform float fade, white, vig, time, flash, bloom, ca, mbk; varying vec2 vUv;
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
  SKM = { outer: new THREE.MeshPhysicalMaterial({ map, vertexColors: true, roughness: 0.5, sheen: 0.55, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffd27a), clearcoat: 0.12, clearcoatRoughness: 0.5,
      emissive: 0x4a3006, emissiveIntensity: 0.2 }),
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
  F: [ { x: -0.27, y: 0.86, a: 6, L: [0.41, 0.25, 0.21], r: 0.118 },       // la mano de Homer: tres dedos gordos + el pulgar (nudillo (x, y), giro, falanges, radio)
       { x: -0.02, y: 0.9, a: 0, L: [0.45, 0.27, 0.22], r: 0.122 },
       { x: 0.23, y: 0.85, a: -7, L: [0.4, 0.25, 0.2], r: 0.115 } ],
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
function sdPalm(x, y, z) { let p = capD(x, y, z, HP.meta[0]); for (let i = 1; i < HD.F.length; i++) p = smin(p, capD(x, y, z, HP.meta[i]), 0.1); for (const e of HP.ell) p = smin(p, ellD(x, y, z, e), 0.1); return smin(p, capD(x, y, z, HP.arm), 0.16); }
function sdFinger(x, y, z, i) { const F = HP.fing[i]; let f = Math.min(capD(x, y, z, F[0]), capD(x, y, z, F[1]), capD(x, y, z, F[2])); for (const K of HP.knk[i]) f = smin(f, sphD(x, y, z, K), 0.03); return f; }
function sdThumb(x, y, z) { return Math.min(capD(x, y, z, HP.thumb[0]), capD(x, y, z, HP.thumb[1]), capD(x, y, z, HP.thumb[2])); }
const WEB = capP([-0.43, 0.36, -0.01], [-0.29, 0.66, 0.0], 0.05, 0.045, 0.7);
function sdHand(x, y, z) { let d = smin(sdPalm(x, y, z), capD(x, y, z, WEB), 0.09); for (let i = 0; i < HD.F.length; i++) d = smin(d, sdFinger(x, y, z, i), 0.05); return smin(d, sdThumb(x, y, z), 0.07); }
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
  const base = new THREE.Color(0xdcae36), red = new THREE.Color(0xcf8f2a), pale = new THREE.Color(0xe7bf4c), cc = new THREE.Color();
  const ssm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  for (let v = 0; v < n; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    const gx = sdHand(x + e, y, z) - sdHand(x - e, y, z), gy = sdHand(x, y + e, z) - sdHand(x, y - e, z), gz = sdHand(x, y, z + e) - sdHand(x, y, z - e), gl = Math.hypot(gx, gy, gz) || 1;
    N[v * 3] = gx / gl; N[v * 3 + 1] = gy / gl; N[v * 3 + 2] = gz / gl;
    UV[v * 2] = x * 1.6 + z * 0.7; UV[v * 2 + 1] = y * 1.6;
    // ¿a qué parte pertenece? (la más cercana: palma/antebrazo, un dedo o el pulgar)
    const NF = HD.F.length; let best = sdPalm(x, y, z), part = -1; for (let i = 0; i < NF; i++) { const d = sdFinger(x, y, z, i); if (d < best) { best = d; part = i; } } { const d = sdThumb(x, y, z); if (d < best) { best = d; part = NF; } }
    let w = [1, 0, 0, 0], b = [0, 0, 0, 0]; cc.copy(base);
    if (part >= 0 && part < NF) { const d = HD.F[part], s = (x - d.x) * d.u[0] + (y - d.y) * d.u[1];
      const w0 = ssm(-0.05, 0.06, s), w1 = ssm(d.L[0] - 0.035, d.L[0] + 0.035, s), w2 = ssm(d.L[0] + d.L[1] - 0.03, d.L[0] + d.L[1] + 0.03, s);
      const bi = 1 + part * 3; b = [0, bi, bi + 1, bi + 2]; w = [1 - w0, w0 * (1 - w1), w0 * w1 * (1 - w2), w0 * w1 * w2];
      // nudillos algo más rosados por el dorso, y la yema
      const kn = Math.max(Math.exp(-(((s - d.L[0]) / 0.035) ** 2)), Math.exp(-(((s - d.L[0] - d.L[1]) / 0.03) ** 2)) * 0.8, Math.exp(-((s / 0.045) ** 2)) * 0.6) * ssm(0.035, 0.075, z);
      const tip = ssm(d.L[0] + d.L[1] + d.L[2] * 0.45, d.L[0] + d.L[1] + d.L[2], s);
      cc.lerp(red, clamp(kn * 0.4 + tip * 0.4));
    } else if (part === NF) { const A = HD.T[1], B = HD.T[2], ux = B[0] - A[0], uy = B[1] - A[1], ul = Math.hypot(ux, uy), s = ((x - A[0]) * ux + (y - A[1]) * uy) / ul;
      const w1 = ssm(-0.04, 0.05, s), w2 = ssm(ul - 0.03, ul + 0.03, s); b = [0, 1 + NF * 3, 2 + NF * 3, 0]; w = [1 - w1, w1 * (1 - w2), w1 * w2, 0];
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
  const tex = canvasTex(64, 128, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#efd79a'); gr.addColorStop(0.16, '#e6c77e'); gr.addColorStop(0.84, '#e9cb84'); gr.addColorStop(0.93, '#f3e3b8'); gr.addColorStop(1, '#f7ecd0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
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
    const c = arm.geometry.attributes.position.count, col = new Float32Array(c * 3), cc = new THREE.Color(0xdcae36); for (let i = 0; i < c; i++) { col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; } arm.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
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
function softBackdrop() {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color(0xf6f1ea) }, bot: { value: new THREE.Color(0xe2d8cc) }, k: { value: 1.12 } },
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: '#include <logdepthbuf_pars_fragment>\nuniform vec3 top, bot; uniform float k; varying vec3 vP; void main(){\n#include <logdepthbuf_fragment>\nfloat e = smoothstep(-0.55, 0.65, vP.y); gl_FragColor = vec4(mix(bot, top, e) * k, 1.); }' });
  const s = new THREE.Mesh(new THREE.SphereGeometry(80, 48, 24), m); s.renderOrder = -1; s.frustumCulled = false; return s;
}
// luces de estudio suaves (cielo cálido, luz principal con sombras suaves, relleno frío y contraluz)
function softLights() {
  const hemi = new THREE.HemisphereLight(0xfff2e6, 0xb9a99b, 0.75);
  const key = new THREE.DirectionalLight(0xfff0e0, 2.7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01; key.shadow.radius = 5;
  const fill = new THREE.DirectionalLight(0xdfeaff, 0.55), rim = new THREE.DirectionalLight(0xffffff, 1.6);
  scene.add(hemi, key, key.target, fill, fill.target, rim, rim.target); S.L = { hemi, key, fill, rim };
}
// coloca las luces alrededor de lo que se mira (c) según desde dónde (yaw) y el tamaño (k)
function lightsAt(c, yaw, k = 1) {
  const L = S.L, rot = (x, y, z) => v3(c.x + x * Math.cos(yaw) + z * Math.sin(yaw), c.y + y, c.z - x * Math.sin(yaw) + z * Math.cos(yaw));
  L.key.position.copy(rot(-3 * k, 4.2 * k, 3.4 * k)); L.key.target.position.copy(c);
  const sc = L.key.shadow.camera, e = 1.6 * k; sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = 0.1; sc.far = 14 * k; sc.updateProjectionMatrix();
  L.fill.position.copy(rot(4 * k, 0.6 * k, 2.4 * k)); L.fill.target.position.copy(c);
  L.rim.position.copy(rot(0.8 * k, 2.6 * k, -4 * k)); L.rim.target.position.copy(c);
  for (const l of [L.key, L.fill, L.rim]) l.target.updateMatrixWorld();
}
// ---------------------------------------------------------------- objetos de «Qué pasa cuando te crujes los dedos» (1 unidad = 1 m; las piezas del centro, gigantes):
// la mano en rayos X (huesos de verdad y piel translúcida; cada dedo se dobla por el nudillo), la maqueta del nudillo en corte con su líquido y la
// burbuja, el manómetro, la resonancia, las campanas de cristal del debate, el reloj de 20 minutos, la caja de luz con las radiografías, el premio
// y las figuritas.
// las caras de las bobinas pequeñas son espejos planos: al levantarse, alguna refleja el foco hacia la cámara y da un fogonazo de un
// fotograma (valor ≈ 30) que el resplandor convierte en una mancha blanca. Se limita su brillo por debajo del umbral del resplandor (1,7):
// el brillo normal no cambia y el reflejo se queda en un destello pequeño.
const capGlint = (m, c = 1.2) => { m.onBeforeCompile = sh => { const f = sh.fragmentShader.replace('#include <opaque_fragment>', `outgoingLight = min(outgoingLight, vec3(${c.toFixed(2)}));\n#include <opaque_fragment>`);
  if (f === sh.fragmentShader) console.error('ERROR capGlint: no encuentro opaque_fragment'); sh.fragmentShader = f; }; return m; };
// ---------- rayos X: la piel brilla en el borde (fresnel) y los huesos, más blancos; todo aditivo, como una radiografía en el aire
function xrayMat(col, base, pw, op) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    uniforms: { col: { value: new THREE.Color(col) }, base: { value: base }, pw: { value: pw }, op: { value: op } },
    // con los trozos del búfer de profundidad logarítmico (el renderizador lo usa): sin ellos, el suelo tapa la mano por debajo del horizonte
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv;\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: '#include <logdepthbuf_pars_fragment>\nuniform vec3 col; uniform float base, pw, op; varying vec3 vN; varying vec3 vV; void main(){\n#include <logdepthbuf_fragment>\nfloat r = 1. - abs(dot(normalize(vN), normalize(vV))); float a = op * (base + (1. - base) * pow(r, pw)); gl_FragColor = vec4(col * a, 1.); }' });
}
let XM = null;
function xrayMats() { if (!XM) XM = { bone: xrayMat(0xdcefff, 0.38, 1.4, 0.95), skin: xrayMat(0x6fb4ff, 0.015, 2.6, 0.75), nail: xrayMat(0x9fd0ff, 0.05, 2.0, 0.5) }; return XM; }
// hueso genérico de largo 1 (eje +y): caña fina y extremos ensanchados
let BONE_G = null;
function boneGeo() { if (!BONE_G) BONE_G = new THREE.LatheGeometry([[0.0, 0.0], [0.62, 0.0], [1.0, 0.05], [0.95, 0.12], [0.62, 0.22], [0.5, 0.5], [0.55, 0.78], [0.9, 0.9], [0.95, 0.96], [0.6, 1.0], [0.0, 1.0]].map(([x, y]) => new THREE.Vector2(x, y)), 18); return BONE_G; }
function boneSeg(len, r, m) { const b = new THREE.Mesh(boneGeo(), m); b.scale.set(r, len, r); return b; }
const _up = new THREE.Vector3(0, 1, 0);
function boneBetween(a, b, r, m) { const d = b.clone().sub(a), L = d.length(); const o = boneSeg(L, r, m); o.position.copy(a); o.quaternion.setFromUnitVectors(_up, d.normalize()); return o; }
// mano derecha con la palma hacia +z y los dedos hacia +y; la muñeca en el origen. Cada dedo: grupo en el nudillo (MCP) que se dobla con rotation.x
function xrayHand(s = 1) {
  const X = xrayMats(), g = new THREE.Group(), fingers = [];
  const F = [ // [base del metacarpiano, nudillo, ángulo (grados), largos de las falanges, radio]
    { b: [0.125, 0.07], k: [0.235, 0.27], a: 38, L: [0.15, 0.115], r: 0.02 },            // pulgar (dos falanges)
    { b: [0.07, 0.12], k: [0.11, 0.42], a: 6, L: [0.2, 0.12, 0.09], r: 0.017 },
    { b: [0.02, 0.125], k: [0.035, 0.44], a: 0, L: [0.22, 0.14, 0.1], r: 0.018 },
    { b: [-0.03, 0.12], k: [-0.04, 0.42], a: -5, L: [0.2, 0.13, 0.095], r: 0.017 },
    { b: [-0.075, 0.11], k: [-0.105, 0.375], a: -12, L: [0.16, 0.1, 0.08], r: 0.015 },
  ];
  for (const f of F) {
    const b = v3(f.b[0], f.b[1], 0), k = v3(f.k[0], f.k[1], 0);
    g.add(boneBetween(b, k, f.r * 1.05, X.bone));                                   // metacarpiano
    const root = new THREE.Group(); root.position.copy(k); root.rotation.z = -f.a * D2; g.add(root);
    let parent = root, y = 0; const joints = [root];
    f.L.forEach((L, i) => {
      const seg = new THREE.Group(); seg.position.y = i === 0 ? 0.008 : y; parent.add(seg); if (i > 0) joints.push(seg);
      const r = f.r * (1 - i * 0.16); seg.add(at(boneSeg(L - 0.012, r, X.bone), 0, 0.006, 0));
      const sk = new THREE.Mesh(new THREE.CapsuleGeometry(r * 2.15, L - 0.02, 6, 16), X.skin); sk.position.y = L / 2; seg.add(sk);
      if (i === f.L.length - 1) { const nail = new THREE.Mesh(new THREE.SphereGeometry(r * 1.6, 12, 8), X.nail); nail.scale.set(1, 1.4, 0.35); nail.position.set(0, L * 0.7, -r * 1.5); seg.add(nail); }
      parent = seg; y = L;
    });
    fingers.push({ root, joints, k: k.clone() });
  }
  // carpo, radio y cúbito
  for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.024 + hash(i) * 0.008, 12, 10), X.bone); c.position.set(-0.07 + (i % 4) * 0.048 + hash(i * 3) * 0.01, 0.035 + Math.floor(i / 4) * 0.045, (hash(i * 7) - 0.5) * 0.02); c.scale.set(1, 0.85, 0.8); g.add(c); }
  g.add(boneBetween(v3(0.06, -0.42, 0), v3(0.07, 0.0, 0), 0.026, X.bone), boneBetween(v3(-0.055, -0.42, 0), v3(-0.05, -0.01, 0), 0.022, X.bone));
  // piel de la palma y del antebrazo
  const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.2, 8, 24), X.skin); palm.scale.set(1.2, 1.1, 0.42); palm.position.set(0.015, 0.25, 0); g.add(palm);
  const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.105, 0.6, 28, 1, true), X.skin); fore.position.set(0.005, -0.28, 0); fore.scale.z = 0.62; g.add(fore);
  // destellos de los nudillos (uno por dedo)
  const fl = canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(170,220,255,.8)'); gr.addColorStop(1, 'rgba(80,160,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const flashes = fingers.map(f => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fl, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false })); sp.position.copy(f.k); sp.position.z = 0.03; sp.scale.setScalar(0.0001); sp.renderOrder = 9; g.add(sp); return sp; });
  g.scale.setScalar(s); g.userData = { fingers, flashes, s0: s }; return g;
}
// pose de los dedos: ang[i] = flexión del nudillo (rad); la articulación de en medio acompaña un poco
function handPose(h, ang) { h.userData.fingers.forEach((f, i) => { const a = ang[i] || 0; f.root.rotation.x = a; for (let j = 1; j < f.joints.length; j++) f.joints[j].rotation.x = a * (j === 1 ? 0.45 : 0.3); }); }
// ---------- maqueta del nudillo en corte (frase 3): cabeza del metacarpiano, base de la falange, cartílago, cápsula, líquido y la burbuja
function knuckleModel() {
  const g = new THREE.Group();
  const boneM = new THREE.MeshPhysicalMaterial({ color: 0xe8dcc4, roughness: 0.55, clearcoat: 0.25 }), cart = new THREE.MeshPhysicalMaterial({ color: 0xcfe3f2, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  const meta = lathe([[0.0, -0.5], [0.06, -0.5], [0.055, -0.3], [0.06, -0.16], [0.09, -0.08], [0.105, -0.02], [0.1, 0.02], [0.07, 0.07], [0.0, 0.085]], 40, boneM); meta.rotation.z = -Math.PI / 2; meta.position.x = -0.12; g.add(meta);
  const capA = new THREE.Mesh(new THREE.SphereGeometry(0.098, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), cart); capA.rotation.z = -Math.PI / 2; capA.position.x = -0.122; g.add(capA);
  const ph = new THREE.Group(); g.add(ph);
  const prox = lathe([[0.0, 0.42], [0.05, 0.42], [0.045, 0.2], [0.055, 0.08], [0.085, 0.02], [0.09, 0.0], [0.0, 0.0]], 40, boneM); prox.rotation.z = -Math.PI / 2; prox.position.x = 0.0; ph.add(prox);
  const cup = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 12, 0, Math.PI * 2, Math.PI * 0.8, Math.PI * 0.2), cart); cup.rotation.z = -Math.PI / 2; cup.position.x = 0.11; ph.add(cup);
  const caps = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshPhysicalMaterial({ color: 0xf2d9c6, roughness: 0.2, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide })); caps.scale.set(0.2, 0.15, 0.15); caps.renderOrder = 6; g.add(caps);
  const fluid = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0xf2b24a, emissive: 0x6b3a08, emissiveIntensity: 0.6, roughness: 0.1, transparent: true, opacity: 0.38, depthWrite: false })); fluid.scale.set(0.045, 0.11, 0.11); fluid.renderOrder = 5; g.add(fluid);
  const bub = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.55, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.3, emissive: 0x88c8ff, emissiveIntensity: 0.4, depthWrite: false })); bub.scale.setScalar(0.0001); bub.renderOrder = 7; g.add(bub);
  g.userData = { ph, fluid, bub, caps }; return g;
}
// manómetro de latón (la presión cae): esfera con aguja
function gauge() {
  const tex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#f4efe2'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 6, 0, 7); c.fill(); c.strokeStyle = '#2b2218'; c.lineWidth = 6;
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.75 + 1.5 * i / 10); c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * 200, h / 2 + Math.sin(a) * 200); c.lineTo(w / 2 + Math.cos(a) * 228, h / 2 + Math.sin(a) * 228); c.stroke(); }
    c.fillStyle = '#c62828'; c.beginPath(); c.arc(w / 2, h / 2, 200, Math.PI * 0.75, Math.PI * 1.05); c.arc(w / 2, h / 2, 186, Math.PI * 1.05, Math.PI * 0.75, true); c.fill();
    c.fillStyle = '#2b2218'; c.font = '800 46px Inter'; c.textAlign = 'center'; c.fillText('PRESIÓN', w / 2, h * 0.72); });
  const g = new THREE.Group(); const rim = cyl(0.11, 0.11, 0.035, M.brass, 48); rim.rotation.x = Math.PI / 2; g.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.1, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })); face.position.z = 0.018; g.add(face);
  const nd = new THREE.Group(); nd.position.z = 0.021; const n = mesh(new THREE.BoxGeometry(0.006, 0.085, 0.003).translate(0, 0.035, 0), new THREE.MeshStandardMaterial({ color: 0x111111 })); nd.add(n); g.add(nd);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.1, 48), M.glass); glass.position.z = 0.024; g.add(glass);
  const st = cyl(0.012, 0.012, 0.18, M.brass, 12); st.position.y = -0.18; g.add(st); const ft = cyl(0.06, 0.07, 0.02, M.wood, 32); ft.position.y = -0.27; g.add(ft);
  g.userData.nd = nd; return g;
}
// ---------- resonancia en miniatura (anillo, carcasa y camilla) y su monitor con la imagen del dedo (k: la cavidad aparece)
function mriMachine() {
  const g = new THREE.Group(), wm = new THREE.MeshPhysicalMaterial({ color: 0xf1f3f5, roughness: 0.3, clearcoat: 0.8 });
  const body = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.09, 24, 64), wm); body.position.y = 0.3; body.scale.z = 1.6; g.add(body);
  const box = rbox(0.62, 0.6, 0.26, wm, 0.06); box.position.y = 0.3; g.add(box);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.3, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.6, side: THREE.BackSide })); hole.rotation.x = Math.PI / 2; hole.position.y = 0.3; g.add(hole);
  const bed = rbox(0.18, 0.5, 0.05, wm, 0.02); bed.rotation.x = Math.PI / 2; bed.position.set(0, 0.17, 0.35); g.add(bed);
  const leg = rbox(0.12, 0.14, 0.2, M.dsteel, 0.02); leg.position.set(0, 0.07, 0.42); g.add(leg);
  const strip = rbox(0.4, 0.02, 0.27, new THREE.MeshStandardMaterial({ color: 0x46b4ff, emissive: 0x46b4ff, emissiveIntensity: 0.8 }), 0.005); strip.position.set(0, 0.52, 0.0); g.add(strip);
  return g;
}
function mriScreen() {
  const tex = canvasTex(720, 900, () => {}); let lk = -1;
  const scr = mesh(new THREE.PlaneGeometry(0.3, 0.375), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), false); scr.position.set(0, 0.38, 0.016);
  const fr = rbox(0.33, 0.405, 0.03, M.black, 0.01); fr.position.y = 0.38; const st = cyl(0.012, 0.012, 0.18, M.dsteel, 12); st.position.y = 0.09; const ft = rbox(0.16, 0.1, 0.012, M.dsteel, 0.006); ft.rotation.x = Math.PI / 2; ft.position.y = 0.006;
  const g = grp(fr, scr, st, ft);
  g.userData.draw = (k) => { k = Math.round(k * 40) / 40; if (k === lk) return; lk = k; const c = tex.userData.g, w = 720, h = 900; c.fillStyle = '#020304'; c.fillRect(0, 0, w, h);
    const gap = 18 + 26 * clamp(k * 1.5);
    const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#3a3d42'); gr.addColorStop(0.5, '#5d6168'); gr.addColorStop(1, '#3a3d42');
    c.fillStyle = 'rgba(120,124,132,.55)'; c.beginPath(); c.ellipse(w / 2, h / 2, 170, 400, 0, 0, 7); c.fill();
    c.fillStyle = '#d9dde3'; c.beginPath(); c.ellipse(w / 2, h / 2 + 230 + gap / 2, 70, 190, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(w / 2, h / 2 - 230 - gap / 2, 78, 200, 0, 0, 7); c.fill();
    c.fillStyle = '#9aa0a8'; c.beginPath(); c.ellipse(w / 2, h / 2 - 40 - gap / 2, 84, 46, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(w / 2, h / 2 + 44 + gap / 2, 80, 42, 0, 0, 7); c.fill();
    if (k > 0.35) { const r = 34 * clamp((k - 0.35) / 0.3); c.fillStyle = '#000'; c.beginPath(); c.ellipse(w / 2, h / 2, r * 1.6, r, 0, 0, 7); c.fill(); }
    c.fillStyle = '#7f8792'; c.font = '700 30px DejaVuMono'; c.textAlign = 'left'; c.fillText('RM · DEDO', 30, 50); c.textAlign = 'right'; c.fillText((0.31 * clamp(k)).toFixed(2).replace('.', ',') + ' s', w - 30, 50);
    tex.needsUpdate = true; };
  g.userData.draw(0); return g;
}
// ---------- campana de cristal con su burbuja (frase 5)
function bellJar() {
  const g = new THREE.Group(); const base = cyl(0.13, 0.14, 0.04, M.wood, 48); base.position.y = 0.02; g.add(base);
  const dome = lathe([[0.0, 0.42], [0.04, 0.418], [0.09, 0.39], [0.115, 0.32], [0.12, 0.2], [0.12, 0.04], [0.112, 0.04], [0.112, 0.2], [0.107, 0.31], [0.083, 0.378], [0.037, 0.406], [0.0, 0.408]], 48, M.glass); dome.renderOrder = 7; g.add(dome);
  const liq = cyl(0.105, 0.105, 0.18, new THREE.MeshPhysicalMaterial({ color: 0xf2b24a, emissive: 0x6b3a08, emissiveIntensity: 0.5, transparent: true, opacity: 0.3, depthWrite: false }), 40); liq.position.y = 0.13; liq.renderOrder = 5; g.add(liq);
  const bub = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.55, clearcoat: 1, iridescence: 1, emissive: 0x88c8ff, emissiveIntensity: 0.45, depthWrite: false })); bub.position.y = 0.13; bub.renderOrder = 6; g.add(bub);
  const bits = []; for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), bub.material); b.scale.setScalar(0.0001); b.position.y = 0.13; g.add(b); bits.push(b); }
  g.userData = { bub, bits }; return g;
}
// ---------- reloj de 20 minutos (frase 6)
function clock20() {
  const tex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#f4efe2'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 6, 0, 7); c.fill(); c.fillStyle = '#2b2218'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI * 2; c.fillRect(w / 2 + Math.cos(a) * 205 - 3, h / 2 + Math.sin(a) * 205 - 3, 6, 6); if (i % 5 === 0) { c.font = '800 44px Inter'; c.fillText(String(i), w / 2 + Math.cos(a) * 160, h / 2 + Math.sin(a) * 160); } }
    c.font = '700 30px Inter'; c.fillText('MINUTOS', w / 2, h * 0.68); });
  const g = new THREE.Group(); const rim = cyl(0.15, 0.15, 0.04, M.brass, 48); rim.rotation.x = Math.PI / 2; g.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.138, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })); face.position.z = 0.021; g.add(face);
  const hd = new THREE.Group(); hd.position.z = 0.025; hd.add(mesh(new THREE.BoxGeometry(0.008, 0.12, 0.003).translate(0, 0.05, 0), new THREE.MeshStandardMaterial({ color: 0xc62828 }))); g.add(hd);
  const sweep = new THREE.Mesh(new THREE.CircleGeometry(0.134, 48, Math.PI / 2, 0.001), new THREE.MeshBasicMaterial({ color: 0x46b4ff, transparent: true, opacity: 0.25, depthWrite: false })); sweep.position.z = 0.023; g.add(sweep);
  const st = cyl(0.012, 0.012, 0.2, M.brass, 12); st.position.y = -0.24; g.add(st); const ft = cyl(0.07, 0.08, 0.02, M.wood, 32); ft.position.y = -0.34; g.add(ft);
  g.userData = { hd, sweep }; return g;
}
// ---------- caja de luz (negatoscopio) con dos radiografías de manos sin artritis (frase 8)
function radiographTex(left) {
  return canvasTex(400, 520, (c, w, h) => { c.fillStyle = '#0b0f14'; c.fillRect(0, 0, w, h); c.save(); if (left) { c.translate(w, 0); c.scale(-1, 1); }
    c.strokeStyle = 'rgba(210,225,240,.9)'; c.lineCap = 'round';
    const fingers = [[230, 300, 290, 150, 9], [205, 250, 215, 60, 8], [180, 245, 180, 40, 8.5], [155, 250, 148, 62, 8], [132, 262, 112, 100, 7]];
    for (const [x0, y0, x1, y1, r] of fingers) { const segs = 4; for (let i = 0; i < segs; i++) { const a = i / segs, b = (i + 0.86) / segs; c.lineWidth = r * 2 * (1 - i * 0.12); c.beginPath(); c.moveTo(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a); c.lineTo(x0 + (x1 - x0) * b, y0 + (y1 - y0) * b); c.stroke(); } }
    c.lineWidth = 20; for (const [x0, x1] of [[200, 205], [160, 165]]) { c.beginPath(); c.moveTo(x0, 330); c.lineTo(x1, 500); c.stroke(); }
    c.fillStyle = 'rgba(210,225,240,.8)'; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(150 + (i % 4) * 22, 290 + Math.floor(i / 4) * 22, 10, 0, 7); c.fill(); }
    c.restore(); c.fillStyle = 'rgba(160,190,220,.8)'; c.font = '700 22px DejaVuMono'; c.fillText(left ? 'IZQUIERDA · CRUJE' : 'DERECHA · NO CRUJE', 18, 34); });
}
function lightBox() {
  const g = new THREE.Group(); const box = rbox(0.62, 0.42, 0.06, M.dsteel, 0.012); box.position.y = 0.36; g.add(box);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.38), new THREE.MeshBasicMaterial({ color: 0xf2f6ff, toneMapped: false })); glow.position.set(0, 0.36, 0.031); g.add(glow);
  const films = [true, false].map((l, i) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.338), new THREE.MeshBasicMaterial({ map: radiographTex(l), transparent: true, opacity: 0.94, toneMapped: false })); f.position.set(-0.145 + i * 0.29, 0.36, 0.034); g.add(f); return f; });
  const st = cyl(0.014, 0.014, 0.16, M.dsteel, 12); st.position.y = 0.08; g.add(st); const ft = rbox(0.24, 0.12, 0.014, M.dsteel, 0.006); ft.rotation.x = Math.PI / 2; ft.position.y = 0.007; g.add(ft);
  g.userData = { films, glow }; return g;
}
// ---------- el premio (estatuilla de latón con su placa)
function prize() {
  const g = new THREE.Group(); const base = rbox(0.12, 0.12, 0.05, M.wood, 0.008); base.rotation.x = Math.PI / 2; base.position.y = 0.025; g.add(base);
  const cup = lathe([[0.0, 0.05], [0.025, 0.05], [0.012, 0.07], [0.01, 0.12], [0.03, 0.14], [0.055, 0.2], [0.06, 0.26], [0.0, 0.26]], 40, M.gold); g.add(cup);
  for (const sd of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.005, 8, 24, Math.PI), M.gold); h.position.set(sd * 0.06, 0.22, 0); h.rotation.z = sd > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(h); }
  const t = canvasTex(512, 160, (c, w, h) => { c.fillStyle = '#c9a24d'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a1d0c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 62px Inter'; c.fillText('IG NOBEL', w / 2, 58); c.font = '700 40px Inter'; c.fillText('MEDICINA · 2009', w / 2, 120); });
  const pl = mesh(new THREE.PlaneGeometry(0.1, 0.031), new THREE.MeshPhysicalMaterial({ map: t, metalness: 0.7, roughness: 0.3 }), false); pl.position.set(0, 0.025, 0.061); g.add(pl); return g;
}
// ---------------------------------------------------------------- el centro (Javi, 14-11): Homer, de pie en la puerta de su casa de Springfield, se come un polo y el dron
// baja hasta él. Al morder, la cámara se mete de golpe en su cabeza (la piel se vuelve cristal y todo se oscurece) y se CONGELA EL CEREBRO (Homer, por fuera,
// no se congela). Dentro pasa lo de cada frase: el frío en el paladar, el nervio da la alarma (primer plano de neuronas), la sangre por la arteria que se
// ensancha, el cráneo y las meninges que duelen, el nervio de la frente y la medida de 2012. Fuera, las peanas en el césped (27 y 13 de cada 100). Dentro
// otra vez para el truco (la lengua contra el paladar). Fuera, Homer aliviado, y el dron vuelve a subir (bucle con el primer fotograma).
let T_HIT = 1.5;      // el mordisco (en el arranque se pone en «comer»)
const P_BITE = v3(-0.19, -1.32, 1.42), D_BITE = v3(0.22, 0.72, -0.66), P_HOLD = v3(-0.36, -1.66, 1.62), D_HOLD = v3(0.2, 0.8, -0.56), P_LOW = v3(-1.0, -3.3, 1.75), D_LOW = v3(0.1, 0.95, 0.3), ELBOW = v3(-2.0, -3.9, 0.9);
const _pp = new THREE.Vector3(), _dd = new THREE.Vector3(), _bw = new THREE.Vector3();
let DK = 0, MAC = 0;                                   // DK: cuánto estamos «dentro» (oscuro + piel de cristal); MAC: primer plano de neuronas
const NRN_POS = new THREE.Vector3(0, 400, 0), NRN_SC = 1, FROST_C = new THREE.Vector3(0, 0.25, 0.3);
// cúpula oscura (fondo de las tomas de dentro): azul casi negro con una neblina muy suave; k = opacidad
function darkDome(r) {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, uniforms: { k: { value: 0 } },
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: `#include <logdepthbuf_pars_fragment>
uniform float k; varying vec3 vP;
float dh(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float dn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(mix(dh(i), dh(i + vec3(1,0,0)), f.x), mix(dh(i + vec3(0,1,0)), dh(i + vec3(1,1,0)), f.x), f.y), mix(mix(dh(i + vec3(0,0,1)), dh(i + vec3(1,0,1)), f.x), mix(dh(i + vec3(0,1,1)), dh(i + vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
#include <logdepthbuf_fragment>
  float nb = dn(vP * 3.) * 0.6 + dn(vP * 7.) * 0.4;
  vec3 c = vec3(0.006, 0.011, 0.026) + vec3(0.008, 0.016, 0.042) * smoothstep(0.35, 0.85, nb) + vec3(0.012, 0.005, 0.026) * smoothstep(0.55, 0.9, dn(vP * 2. + 5.));
  gl_FragColor = vec4(c, k); }` });
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), m); s.renderOrder = -1; s.frustumCulled = false; return s;
}
function buildCenter() {
  S.hero = buildHero(); scene.add(S.hero); S.hero.traverse(o => { o.renderOrder = 30; });
  for (const ic of S.hero.userData.icicles) ic.m.visible = false;          // Homer no se congela por fuera
  S.dome = darkDome(60); scene.add(S.dome);
  const head = S.hero.userData.head;
  if (typeof buildBrain === 'function') S.brain = buildBrain(head);
  if (typeof buildAnatomy === 'function') S.ana = buildAnatomy(head, S.hero.userData.jaw);
  if (typeof buildNeurons === 'function') { S.nrn = buildNeurons(); S.nrn.group.position.copy(NRN_POS); S.nrn.group.scale.setScalar(NRN_SC); scene.add(S.nrn.group);
    S.dome2 = darkDome(80); S.dome2.position.copy(NRN_POS); S.dome2.material.uniforms.k.value = 1; scene.add(S.dome2); }
}
// dentro (0 → 1): del mordisco a cuando se cierra la arteria (frase 7), y otra vez con el truco (frase 9)
function inK(t) { return Math.max(win(t, T_HIT + 0.03, 0.32) * (1 - win(t, K.cierra7 + 0.25, 0.55)), win(t, K.truco9 + 0.12, 0.42) * (1 - win(t, K.calentarlo9 + 0.12, 0.5))); }
// el primer plano de neuronas («un nervio da la alarma»)
const macT = () => [K.nervio3 + 0.38, K.cuerpo4 - 0.06];
function macK(t) { const [a, b] = macT(); return t >= a && t < b ? 1 : 0; }
// el cerebro se congela al morder y se descongela cuando se ve que lo frío es el paladar
function frostK(t) { return win(t, T_HIT + 0.2, 0.95) * (1 - win(t, K.helado3 + 0.25, K.paladar3 + 0.35 - K.helado3 - 0.25)); }
// la arteria cerebral anterior: se ensancha (frase 4), se abre y se cierra (frase 7) y vuelve a la normalidad con el truco
function acaK(t) { let k = win(t, K.ensancha4 - 0.15, 0.7) * (1 - win(t, K.n2012 - 0.1, 0.6)); k = Math.max(k, win(t, K.abre7 - 0.35, 0.5) * (1 - win(t, K.cierra7 - 0.1, 0.6)));
  return Math.max(k, win(t, K.truco9 - 0.05, 0.3) * (1 - win(t, K.paladar9 + 0.2, 0.7))); }
function painK(t) {      // las meninges en rojo
  return Math.max(win(t, K.capas5 - 0.1, 0.5) * (1 - win(t, K.n2012 - 0.2, 0.5)), win(t, K.abre7 - 0.25, 0.4) * (1 - win(t, K.cierra7 - 0.05, 0.5)) * 0.85,
    win(t, K.truco9 - 0.05, 0.3) * (1 - win(t, K.paladar9 + 0.1, 0.7)) * 0.7);
}
// pulsos por el nervio: V2 (del paladar al ganglio) con la alarma y antes de la frente; V1 (del ganglio a la frente)
function n2At(t) { const a = (t - K.nervio3 + 0.05) / 0.7; if (a > 0 && a < 1.2) return a; const b = (t - K.nervio6 + 0.1) / 0.7; return b > 0 && b < 1.2 ? b : -1; }
function n1At(t) { const a = (t - K.nervio6 - 0.5) / (K.frente6 - K.nervio6 - 0.3); return a > 0 && a < 1.2 ? a : -1; }
const C_HS = new THREE.Color(0xb9d4ff), C_HG = new THREE.Color(0x56603a), C_LS = new THREE.Color(0x9fb8ff), C_LG = new THREE.Color(0x101018);
function centerAt(t, st) {
  const U = S.hero.userData, mi = U.headMesh.morphTargetInfluences;
  DK = inK(t); MAC = macK(t);
  // la cara: come con la boca entreabierta, la abre antes del mordisco y muerde (T_HIT); luego, el dolor (ojos apretados, mueca, tiritona); con el truco,
  // alivio y sonrisa; al final vuelve a la pose del principio (bucle)
  const bite = win(t, T_HIT - 0.04, 0.08), relief = win(t, K.calentarlo9 + 0.2, 0.6), backK = win(t, END - 0.95, 0.75), pain = win(t, T_HIT + 0.1, 0.4) * (1 - relief);
  let jaw = lerp(0.18 + 0.47 * env(t, T_HIT - 0.45, T_HIT + 0.02, 0.32, 0.04), 0.06, bite);
  jaw = lerp(jaw, 0.18, backK); mi[0] = jaw; mi[1] = relief * (1 - backK); mi[2] = 0.85 * pain * (1 - backK);
  U.jaw.rotation.x = JAW_A * mi[0];
  const shock = env(t, T_HIT + 0.03, T_HIT + 0.5, 0.06, 0.2), squeeze = win(t, T_HIT + 0.42, 0.3) * (1 - relief), blink = Math.max(0, 1 - Math.abs(t - (K.calentarlo9 + 0.75)) / 0.09);
  const open = (1 + 0.5 * shock) * (1 - 0.8 * squeeze) * (1 - blink), pitch = 0.26 * Math.max(1 - bite, backK, env(t, K.tu10 + 0.1, K.mandaselo10, 0.3, 0.3));
  for (const e of U.eyes) eyePose(e, open, 1, 0, pitch);
  // el polo: delante de la boca → muerde → un poco fuera → abajo, contento → otra vez delante de la boca (bucle)
  const toBite = env(t, T_HIT - 0.4, T_HIT + 0.22, 0.36, 0.22), low = win(t, K.calentarlo9 + 0.4, 0.8) * (1 - win(t, END - 1.3, 1.0));
  _pp.copy(P_HOLD).lerp(P_BITE, toBite).lerp(P_LOW, low); _dd.copy(D_HOLD).lerp(D_BITE, toBite).lerp(D_LOW, low); _pp.y += 0.035 * Math.sin(t * 1.7) * (1 - toBite);
  armPose(U, _pp, _dd, ELBOW);
  // la cabeza: un leve movimiento de vida; con dolor, la tiritona y la cabeza un poco gacha
  U.head.rotation.set(0.03 * Math.sin(t * 1.3) + 0.06 * squeeze - 0.04 * pitch, 0.04 * Math.sin(t * 0.9) + pain * 0.012 * Math.sin(t * 37), pain * 0.01 * Math.sin(t * 29));
  S.hero.updateMatrixWorld(true);
  // sin escarcha por fuera; la piel de cristal según DK; el dolor de la frente tiñe la piel
  FZ.r.value = 0; FZ.m.value = -1; FZ.gh.value = DK;
  const fore = env(t, K.frente6 - 0.1, K.n2012 - 0.3, 0.35, 0.5);
  U.head.localToWorld(FZ.pc.value.set(0, 0.5, 0.72)); FZ.pk.value = fore * (0.85 + 0.15 * Math.sin(t * 10));
  // fuera / dentro: cúpula oscura, casa, cielo, luces, reflejos y resplandor
  S.dome.material.uniforms.k.value = DK; S.dome.visible = DK > 0.002; S.house.visible = DK < 0.999; S.sky.visible = DK < 0.999;
  const L = S.L; L.sun.intensity = lerp(3.4, 1.3, DK); L.hemi.intensity = lerp(0.55, 0.6, DK); L.hemi.color.lerpColors(C_HS, C_LS, DK); L.hemi.groundColor.lerpColors(C_HG, C_LG, DK); L.rim.intensity = lerp(1.3, 0.5, DK);
  scene.environment = DK > 0.5 ? S.envRoom : S.envSky; scene.environmentIntensity = lerp(0.75, 0.35, DK);
  post.uniforms.bloom.value = lerp(0.35, 0.9, DK); post.uniforms.vig.value = lerp(0.16, 0.36, DK);
  // dentro de la cabeza
  const cold = win(t, K.enfria3 - 0.1, 0.5) * (1 - win(t, K.paladar9 + 0.3, 0.9)), warm = win(t, K.paladar9 - 0.05, 0.6) * (1 - win(t, K.calentarlo9 + 0.6, 0.4));
  const alarm = env(t, macT()[1] - 0.05, K.sangre4 + 0.3, 0.12, 0.5), pk = painK(t);
  const painPulse = Math.max(env(t, K.esas5 - 0.1, K.nervio6, 0.2, 0.4), 0.5 * pk);
  if (S.brain) brainAt(t, { on: DK, frost: frostK(t), frostC: FROST_C, fibers: 0.55 + 0.45 * Math.max(alarm, pk), alarm, pain: pk, painPulse,
    skull: env(t, K.craneo5 - 0.15, K.nervio6, 0.4, 0.5), arrows: env(t, K.presion5 - 0.2, K.esas5, 0.35, 0.4) });
  if (S.ana) anatomyAt(t, { on: DK, cold, warm, n2: n2At(t), n1: n1At(t), nGlow: Math.min(1, env(t, K.nervio3 - 0.1, K.cuerpo4, 0.3, 0.5) + env(t, K.nervio6 - 0.1, K.n2012 - 0.2, 0.3, 0.5)), fore,
    blood: Math.min(1, 0.25 + env(t, K.sangre4 - 0.15, K.craneo5, 0.3, 0.6) + 0.8 * env(t, K.abre7 - 0.35, K.cierra7, 0.3, 0.4)), aca: acaK(t),
    tongue: win(t, K.aprieta9 + 0.05, 0.9) * (1 - win(t, K.calentarlo9 + 0.5, 0.5)) });
  if (S.nrn) { const [a, b] = macT(); S.nrn.group.visible = MAC > 0; S.dome2.visible = MAC > 0; neuronsAt(t, { on: MAC, pulse: MAC ? (t - a - 0.08) / (b - a - 0.22) : -1, hue: 0, ambient: 1 }); }
}
// ---------------------------------------------------------------- el heladero: personaje propio con el aire que pidió Javi (rechoncho, calvo, bigote, uniforme
// blanco con gorra de plato y pajarita negra), realista como la mano de «los dedos». Cabeza y cuerpo: superficies hechas con campos de distancias +
// marching cubes. Unidades: 1 = 10 cm. Cabeza: centro en (0, 0, 0), cara hacia +z, coronilla en y ≈ 1,15, barbilla en y ≈ −1,15.
const ssub = (d, cut, k) => { const h = clamp(0.5 - 0.5 * (d + cut) / k); return lerp(d, -cut, h) + k * h * (1 - h); };      // resta suave
const E7 = (cx, cy, cz, rx, ry, rz) => [cx, cy, cz, rx, ry, rz, Math.min(rx, ry, rz)];
const sph4 = (x, y, z, S) => Math.hypot(x - S[0], y - S[1], z - S[2]) - S[3];
// marching cubes genérico: campo sd(x, y, z) (negativo dentro) en la caja [x0,x1]×[y0,y1]×[z0,z1] con paso h → { P, I }
function mcBuild(sd, x0, y0, z0, x1, y1, z1, h) {
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1;
  const F = new Float32Array(nx * ny * nz); let q = 0;
  for (let k = 0; k < nz; k++) { const z = z0 + k * h; for (let j = 0; j < ny; j++) { const y = y0 + j * h; for (let i = 0; i < nx; i++, q++) F[q] = -sd(x0 + i * h, y, z); } }
  const id = (i, j, k) => i + nx * (j + ny * k), vmap = new Map(), P = [], I = [];
  const vert = (i, j, k, ax) => { const key = id(i, j, k) * 3 + ax; let v = vmap.get(key); if (v !== undefined) return v;
    const a = F[id(i, j, k)], b = F[ax === 0 ? id(i + 1, j, k) : ax === 1 ? id(i, j + 1, k) : id(i, j, k + 1)], t = a === b ? 0.5 : a / (a - b);
    v = P.length / 3; P.push(x0 + (i + (ax === 0 ? t : 0)) * h, y0 + (j + (ax === 1 ? t : 0)) * h, z0 + (k + (ax === 2 ? t : 0)) * h); vmap.set(key, v); return v; };
  const C = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let ci = 0; for (let c = 0; c < 8; c++) if (F[id(i + C[c][0], j + C[c][1], k + C[c][2])] < 0) ci |= 1 << c;
    if (ci === 0 || ci === 255) continue; const o = ci << 4;
    for (let e = 0; triTable[o + e] !== -1; e += 3) for (let m = 0; m < 3; m++) { const Ed = MC_E[triTable[o + e + m]]; I.push(vert(i + Ed[0], j + Ed[1], k + Ed[2], Ed[3])); }
  }
  return { P, I };
}
// geometría con normales del gradiente del campo y color por vértice
function mcGeometry(sd, box, h, colorFn) {
  const { P, I } = mcBuild(sd, ...box, h), n = P.length / 3, N = new Float32Array(n * 3), COL = new Float32Array(n * 3), UV = new Float32Array(n * 2), e = h * 0.5, c = new THREE.Color();
  for (let v = 0; v < n; v++) { const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    const gx = sd(x + e, y, z) - sd(x - e, y, z), gy = sd(x, y + e, z) - sd(x, y - e, z), gz = sd(x, y, z + e) - sd(x, y, z - e), gl = Math.hypot(gx, gy, gz) || 1;
    N[v * 3] = gx / gl; N[v * 3 + 1] = gy / gl; N[v * 3 + 2] = gz / gl; UV[v * 2] = x * 0.9 + z * 0.4; UV[v * 2 + 1] = y * 0.9;
    colorFn(x, y, z, c); COL[v * 3] = c.r; COL[v * 3 + 1] = c.g; COL[v * 3 + 2] = c.b; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(COL, 3)); g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  return g;
}
// ---------- la cabeza de Homer (en versión real): cráneo alto, ojos grandes y saltones, nariz larga, el morro con la barba de sombra, orejas,
// el pelo en zigzag por detrás y los dos pelos de arriba
const HEADP = {
  cran: E7(0, 0.42, -0.12, 0.74, 1.0, 0.86), muz: E7(0, -0.52, 0.3, 0.66, 0.58, 0.66), jowl: E7(0, -1.05, 0.05, 0.62, 0.42, 0.62),
  neck: capP([0, -0.8, -0.25], [0, -2.3, -0.22], 0.62, 0.64, 0.92),
  brow: capP([-0.34, 0.27, 0.66], [0.34, 0.27, 0.66], 0.08, 0.08, 1),
  nose: capP([0, 0.0, 0.82], [0, -0.27, 1.13], 0.1, 0.12, 1), tip: [0, -0.3, 1.17, 0.13],
  lipU: capP([-0.36, -0.6, 0.86], [0.36, -0.6, 0.86], 0.075, 0.075, 0.9), lipL: capP([-0.3, -0.77, 0.82], [0.3, -0.77, 0.82], 0.06, 0.06, 0.9),
  ears: [E7(0.74, 0.0, -0.24, 0.085, 0.24, 0.17), E7(-0.74, 0.0, -0.24, 0.085, 0.24, 0.17)],
  ahx: [capP([0.8, 0.13, -0.29], [0.81, -0.07, -0.31], 0.022, 0.026, 1), capP([-0.8, 0.13, -0.29], [-0.81, -0.07, -0.31], 0.022, 0.026, 1)],
  socks: [[0.22, 0.12, 0.7, 0.2], [-0.22, 0.12, 0.7, 0.2]], mouth: E7(0, -0.685, 0.6, 0.38, 0.05, 0.36), earH: [[0.83, -0.03, -0.2, 0.072], [-0.83, -0.03, -0.2, 0.072]],
};
function sdHead(x, y, z) {
  const H = HEADP; let d = smin(ellD(x, y, z, H.cran), ellD(x, y, z, H.muz), 0.3);
  d = smin(d, ellD(x, y, z, H.jowl), 0.25); d = smin(d, capD(x, y, z, H.neck), 0.3); d = smin(d, capD(x, y, z, H.brow), 0.1);
  d = smin(d, Math.min(capD(x, y, z, H.nose), sph4(x, y, z, H.tip)), 0.06);
  d = smin(d, capD(x, y, z, H.lipU), 0.05); d = smin(d, capD(x, y, z, H.lipL), 0.05); for (const e of H.ears) d = smin(d, ellD(x, y, z, e), 0.05);
  for (const s of H.socks) d = ssub(d, sph4(x, y, z, s), 0.04);
  d = ssub(d, ellD(x, y, z, H.mouth), 0.025); for (const s of H.earH) d = ssub(d, sph4(x, y, z, s), 0.03); for (const a of H.ahx) d = smin(d, capD(x, y, z, a), 0.02);
  return d;
}
const HEAD_BOX = [-0.92, -1.85, -1.1, 0.92, 1.5, 1.35];
const JAW_P = new THREE.Vector3(0, -0.45, -0.3), JAW_A = 0.3;
const tri = x => 1 - 4 * Math.abs(((x % 1) + 1) % 1 - 0.5);       // onda en triángulo (−1 … 1): el zigzag del pelo
let HEAD_GEO = null;
function headGeo() {
  if (HEAD_GEO) return HEAD_GEO;
  const base = new THREE.Color(0xe1b53a), warm = new THREE.Color(0xd99a2a), inner = new THREE.Color(0x5a1c1a), ssm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const MZ = HEADP.muz, masks = [];
  const g = mcGeometry(sdHead, HEAD_BOX, 0.014, (x, y, z, c) => { c.copy(base);
    // un poco más cálido en la nariz, las orejas y los pliegues
    const wk = Math.exp(-((x * x) + (y + 0.25) ** 2 + (z - 1.1) ** 2) / 0.02) * 0.5 + Math.exp(-(((Math.abs(x) - 0.75) ** 2) + y * y + (z + 0.2) ** 2) / 0.03) * 0.5;
    c.lerp(warm, clamp(wk));
    if (Math.abs(x) < 0.38 && Math.abs(y + 0.685) < 0.055 && z < 0.86 && z > 0.36) c.lerp(inner, ssm(0.86, 0.74, z) * ssm(0.36, 0.48, z));
    // barba de sombra (el morro) y el pelo en zigzag de detrás
    const q = Math.hypot((x - MZ[0]) / 0.74, (y - MZ[1]) / 0.66, (z - MZ[2]) / 0.74);
    const stub = ssm(1.13, 0.97, q) * ssm(-0.36, -0.46, y) * (1 - ssm(-1.08, -1.3, y)) * (1 - (Math.abs(x) < 0.38 && Math.abs(y + 0.685) < 0.06 && z < 0.84 ? 1 : 0));
    const ang = Math.atan2(x, -(z + 0.1)), back = 1 - ssm(1.75, 2.05, Math.abs(ang)), ytop = 0.18 + 0.08 * tri(ang * 2.2 + 0.25);
    const hair = back * ssm(ytop + 0.02, ytop - 0.02, y) * ssm(-0.5, -0.3, y) * ssm(0.2, 0.45, Math.hypot(x, z + 0.12));
    masks.push(stub, hair); });
  g.setAttribute('hmask', new THREE.Float32BufferAttribute(masks, 2));
  // gestos (morph): boca abierta (la mandíbula gira), sonrisa y mueca
  const P = g.attributes.position, n = P.count, jaw = new Float32Array(n * 3), smile = new Float32Array(n * 3), grim = new Float32Array(n * 3), N = g.attributes.normal, jn = new Float32Array(n * 3);
  const R = new THREE.Matrix4().makeRotationX(JAW_A), Rn = new THREE.Matrix3().setFromMatrix4(R), p = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let v = 0; v < n; v++) { const x = P.getX(v), y = P.getY(v), z = P.getZ(v);
    const wj = ssm(-0.62, -0.73, y) * (1 - ssm(-1.3, -1.65, y)) * ssm(-0.35, 0.05, z) * (1 - 0.6 * ssm(0.6, 0.82, Math.abs(x)));
    p.set(x, y, z).sub(JAW_P).applyMatrix4(R).add(JAW_P); jaw[v * 3] = (p.x - x) * wj; jaw[v * 3 + 1] = (p.y - y) * wj; jaw[v * 3 + 2] = (p.z - z) * wj;
    nn.set(N.getX(v), N.getY(v), N.getZ(v)).applyMatrix3(Rn); jn[v * 3] = (nn.x - N.getX(v)) * wj; jn[v * 3 + 1] = (nn.y - N.getY(v)) * wj; jn[v * 3 + 2] = (nn.z - N.getZ(v)) * wj;
    const sx = Math.sign(x) || 1, gc = Math.exp(-(((Math.abs(x) - 0.37) ** 2) + (y + 0.685) ** 2) / 0.014) * ssm(0.5, 0.75, z), gk = Math.exp(-(((Math.abs(x) - 0.42) ** 2) + (y + 0.35) ** 2) / 0.05) * ssm(0.3, 0.6, z);
    smile[v * 3] = sx * 0.04 * gc; smile[v * 3 + 1] = 0.07 * gc + 0.035 * gk; smile[v * 3 + 2] = -0.03 * gc + 0.015 * gk;
    grim[v * 3] = sx * 0.03 * gc; grim[v * 3 + 1] = -0.06 * gc; grim[v * 3 + 2] = -0.01 * gc; }
  g.morphAttributes.position = [new THREE.BufferAttribute(jaw, 3), new THREE.BufferAttribute(smile, 3), new THREE.BufferAttribute(grim, 3)];
  g.morphAttributes.normal = [new THREE.BufferAttribute(jn, 3), new THREE.BufferAttribute(new Float32Array(n * 3), 3), new THREE.BufferAttribute(new Float32Array(n * 3), 3)];
  g.morphTargetsRelative = true;
  console.log('cabeza: ' + n + ' vértices'); HEAD_GEO = g; return g;
}
// barba de sombra y pelo corto: puntitos y mechones sobre la piel (máscaras por vértice)
function stubbly(m) { const prev = m.onBeforeCompile; m.onBeforeCompile = (sh, r) => { prev(sh, r);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 hmask; varying vec2 vHm; varying vec3 vHp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHm = hmask; vHp = position;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vHm; varying vec3 vHp;').replace('#include <color_fragment>', `#include <color_fragment>
{ diffuseColor.rgb *= mix(vec3(0.95, 0.93, 0.9), vec3(1.04, 1.03, 1.0), fzN(vHp * 6.5)) * (0.975 + 0.05 * fzN(vHp * 140.));
  float fw = clamp(length(fwidth(vHp)) * 230., 0., 1.), d1 = fzN(vHp * 240.), d2 = fzN(vHp * 55. + 7.), st = vHm.x;
  float dots = smoothstep(0.56, 0.7, d1) * (1. - fw);
  diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.6, 0.48, 0.26), vec3(0.47, 0.38, 0.22), d2), st * 0.6);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.15, 0.12, 0.08), st * (dots * 0.55 + fw * 0.22));
  float hs = fzN(vHp * vec3(330., 42., 330.)), hv = fzN(vHp * vec3(80., 12., 80.) + 3.);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.07, 0.045) * (0.75 + 0.5 * hv) * (0.8 + 0.4 * hs), clamp(vHm.y * (0.8 + 0.2 * hs), 0., 0.96)); }`); }; return m; }
// ---------- congelación: escarcha que se extiende desde la boca (y se derrite desde la boca con el truco)
const FZ = { c: { value: new THREE.Vector3(0, -0.67, 0.85) }, r: { value: 0 }, m: { value: 0 }, pc: { value: new THREE.Vector3(0, 0.45, 0.72) }, pk: { value: 0 }, gh: { value: 0 } };
function freezable(m) {
  const prev = m.onBeforeCompile; m.transparent = true;
  m.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); sh.uniforms.fzC = FZ.c; sh.uniforms.fzR = FZ.r; sh.uniforms.fzM = FZ.m; sh.uniforms.pnC = FZ.pc; sh.uniforms.pnK = FZ.pk; sh.uniforms.ghK = FZ.gh;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFzW;').replace('#include <project_vertex>', '#include <project_vertex>\nvFzW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vFzW; uniform vec3 fzC, pnC; uniform float fzR, fzM, pnK, ghK;
float fzH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float fzN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(fzH(i), fzH(i + vec3(1,0,0)), f.x), mix(fzH(i + vec3(0,1,0)), fzH(i + vec3(1,1,0)), f.x), f.y), mix(mix(fzH(i + vec3(0,0,1)), fzH(i + vec3(1,0,1)), f.x), mix(fzH(i + vec3(0,1,1)), fzH(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float fzD = distance(vFzW, fzC), fzN1 = fzN(vFzW * 9.) * 0.6 + fzN(vFzW * 23.) * 0.4;
float fzK = (1. - smoothstep(fzR - 0.3, fzR, fzD + fzN1 * 0.25)) * smoothstep(fzM, fzM + 0.3, fzD + fzN1 * 0.25);
float fzB = fzK * (1. - smoothstep(fzR - 0.45, fzR - 0.05, fzD + fzN1 * 0.25));
diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.12, 0.3, 0.6), vec3(0.5, 0.72, 0.93), smoothstep(0.25, 0.85, fzN1)) * (0.85 + 0.3 * fzN(vFzW * 41.)), fzK * 0.9);
float pnD = distance(vFzW, pnC), pnA = pnK * exp(-pnD * pnD / 0.09);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.03, 0.02), clamp(pnA, 0., 0.85));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float fzRim = pow(1. - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2); vec3 fzQ = fract(vFzW * 70.) - 0.5;
totalEmissiveRadiance = mix(totalEmissiveRadiance, vec3(0.0), fzK * 0.8) + vec3(0.9, 0.04, 0.02) * pnA * 0.8 + vec3(0.3, 0.62, 1.0) * fzB * 0.7 + vec3(0.45, 0.7, 1.0) * fzRim * fzK * 0.12 + vec3(1.2) * fzK * step(0.993, fzH(floor(vFzW * 70.))) * (1. - smoothstep(0.15, 0.4, length(fzQ)));`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.18, fzK);')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
{ float ghR = pow(1. - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
  vec3 ghC = vec3(0.5, 0.72, 1.0) * (0.1 + 1.5 * ghR) + vec3(1.0, 0.12, 0.06) * pnA * 1.4;
  gl_FragColor = mix(gl_FragColor, vec4(ghC, clamp(0.03 + 0.72 * ghR + pnA * 0.5, 0., 1.)), ghK); }`); };
  return m;
}
// ---------- piezas de la cara
function eyeTex() {      // textura polar del iris: x = ángulo, y = del centro (arriba, v = 1) al borde (abajo)
  return canvasTex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#050505'); gr.addColorStop(0.38, '#050505'); gr.addColorStop(0.42, '#2a1a0e'); gr.addColorStop(0.7, '#3e2a16'); gr.addColorStop(0.9, '#2a1c10'); gr.addColorStop(1, '#100a05');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const x = hash(i * 3.1) * w; g.strokeStyle = hash(i) > 0.5 ? 'rgba(190,150,90,.35)' : 'rgba(30,18,8,.35)'; g.lineWidth = 1 + hash(i * 2.3) * 1.5; g.beginPath(); g.moveTo(x, h * 0.42); g.lineTo(x + (hash(i * 7.7) - 0.5) * 6, h * (0.75 + hash(i * 5.7) * 0.2)); g.stroke(); } });
}
function makeEye(skinM, R = 0.125, IR = 0.06) {
  const g = new THREE.Group();
  const scl = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), freezable(new THREE.MeshPhysicalMaterial({ color: 0xf4efe8, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }))); g.add(scl);
  const look = new THREE.Group(); g.add(look);
  const iris = new THREE.Mesh(new THREE.SphereGeometry(R + 0.0012, 48, 10, 0, Math.PI * 2, 0, Math.asin(IR / R)), freezable(new THREE.MeshStandardMaterial({ map: eyeTex(), roughness: 0.35 }))); iris.rotation.x = Math.PI / 2; look.add(iris);
  const pup = new THREE.Group(); look.add(pup);
  const cor = new THREE.Mesh(new THREE.SphereGeometry(IR * 1.1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0, clearcoat: 1, clearcoatRoughness: 0, depthWrite: false }));
  cor.rotation.x = Math.PI / 2; cor.position.z = R - IR * 0.75; look.add(cor);
  const lidU = new THREE.Mesh(new THREE.SphereGeometry(R + 0.012, 32, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), skinM), lidL = new THREE.Mesh(new THREE.SphereGeometry(R + 0.01, 32, 14, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), skinM);
  g.add(lidU, lidL); g.userData = { look, pup, lidU, lidL }; return g;
}
// pose de un ojo: abierto (0 cerrado … 1 normal … 1,5 muy abierto), pupila, mirada
function eyePose(e, open, pup = 1, yaw = 0, pitch = 0) { const U = e.userData; U.lidU.rotation.x = lerp(0.3, -0.38, clamp(open, 0, 1)) - 0.55 * clamp(open - 1, 0, 0.6); U.lidL.rotation.x = lerp(-0.1, 0.38, clamp(open, 0, 1)) + 0.25 * clamp(open - 1, 0, 0.6);
  U.pup.scale.setScalar(pup); U.look.rotation.set(pitch, yaw, 0); }
// tubo que adelgaza en las puntas (cejas, bigote)
function taperTube(pts, r, m, seg = 40, rs = 12, prof = u => Math.sin(Math.PI * clamp(u * 0.92 + 0.04))) {
  const cv = new THREE.CatmullRomCurve3(pts), geo = new THREE.TubeGeometry(cv, seg, r, rs, false), P = geo.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) { cv.getPointAt(i / seg, c); const f = prof(i / seg); for (let j = 0; j <= rs; j++) { const k = i * (rs + 1) + j; v.fromBufferAttribute(P, k).sub(c).multiplyScalar(f).add(c); P.setXYZ(k, v.x, v.y, v.z); } }
  geo.computeVertexNormals(); const mm = new THREE.Mesh(geo, m); mm.castShadow = true; return mm;
}
function hairMat(c = 0x4b3424) { return freezable(new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.85, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x8a6a50) })); }
// ---------- la gorra de plato (blanca, banda y visera negras, chapa plateada con un cucurucho)
function capHat(clip) {
  const g = new THREE.Group(), wm = freezable(new THREE.MeshPhysicalMaterial({ color: 0xf6f6f3, roughness: 0.6, sheen: 0.5, sheenColor: new THREE.Color(0xffffff) })), bm = freezable(new THREE.MeshPhysicalMaterial({ color: 0x111215, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }));
  const crown = lathe([[0.0, 0.42], [0.55, 0.43], [0.86, 0.38], [0.9, 0.33], [0.76, 0.16], [0.62, 0.08], [0.61, 0.0]], 64, wm); g.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.625, 0.615, 0.13, 64, 1, true), bm); band.position.y = 0.06; g.add(band);
  const vs = new THREE.Shape(); vs.absarc(0, 0, 1.0, -0.15, Math.PI + 0.15, false); vs.absarc(0, 0, 0.62, Math.PI + 0.15, -0.15, true);
  const vg = new THREE.ExtrudeGeometry(vs, { depth: 0.02, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 32 }); vg.rotateX(Math.PI / 2);
  { const P = vg.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), r = Math.hypot(x, z); P.setY(i, P.getY(i) - Math.max(0, r - 0.62) * 0.45); } vg.computeVertexNormals(); }
  const vis = new THREE.Mesh(vg, bm); vis.rotation.y = Math.PI; vis.scale.set(0.98, 1, -0.8); vis.position.y = 0.02; g.add(vis);
  const bt = canvasTex(128, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#f2f4f7'); gr.addColorStop(1, '#9aa1ab'); c.fillStyle = gr; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, 7); c.fill();
    c.fillStyle = '#7b8490'; c.beginPath(); c.moveTo(w / 2, h * 0.86); c.lineTo(w * 0.36, h * 0.46); c.lineTo(w * 0.64, h * 0.46); c.closePath(); c.fill(); c.beginPath(); c.arc(w / 2, h * 0.4, w * 0.15, 0, 7); c.fill(); });
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), freezable(new THREE.MeshPhysicalMaterial({ map: bt, metalness: 0.6, roughness: 0.3 }))); badge.position.set(0, 0.24, 0.66); badge.rotation.x = -0.35; g.add(badge);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; if (clip) o.material.clippingPlanes = clip; } });
  return g;
}
// ---------- el polo de chocolate
function popsicle() {
  const g = new THREE.Group(); const ch = freezable(new THREE.MeshPhysicalMaterial({ color: 0x4b2a19, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25 }));
  const bar = rbox(0.46, 0.84, 0.17, ch, 0.08); bar.position.y = 0.42 + 0.48; g.add(bar);
  const stick = rbox(0.1, 0.62, 0.026, freezable(new THREE.MeshStandardMaterial({ color: 0xe0c38e, roughness: 0.8 })), 0.04); stick.position.y = 0.31; g.add(stick);
  g.userData = { bar }; return g;
}
// ---------- el cuerpo (camisa blanca) y los brazos
const BODYP = { chest: E7(0, -2.8, -0.22, 1.42, 1.0, 0.98), belly: E7(0, -5.0, -0.02, 1.78, 2.15, 1.55), sh: capP([-1.18, -2.42, -0.28], [1.18, -2.42, -0.28], 0.5, 0.5, 1),
  col: capP([0, -1.55, -0.3], [0, -2.3, -0.27], 0.67, 0.72, 0.92),
  slR: capP([-1.32, -2.45, -0.22], [-1.58, -3.42, 0.12], 0.5, 0.55, 1), slL: capP([1.32, -2.45, -0.22], [1.6, -3.45, -0.1], 0.5, 0.55, 1) };
function sdBody(x, y, z) { const B = BODYP; let d = smin(ellD(x, y, z, B.chest), ellD(x, y, z, B.belly), 0.5); d = smin(d, capD(x, y, z, B.sh), 0.35); d = smin(d, capD(x, y, z, B.col), 0.2);
  d = smin(d, capD(x, y, z, B.slR), 0.18); d = smin(d, capD(x, y, z, B.slL), 0.18);
  d += 0.01 * Math.sin(y * 9 + Math.sin(x * 5) * 1.2) * clamp((-y - 5.6) / 0.8);      // la camisa se arruga al meterse en el pantalón
  return Math.max(d, -(y + 6.95)); }
// punto de la superficie (por delante) de un campo, en x, y
function surfZ(sd, x, y, z0 = 3) { let z = z0; while (z > -2 && sd(x, y, z) > 0) z -= 0.02; let a = z, b = z + 0.02; for (let i = 0; i < 20; i++) { const m = (a + b) / 2; if (sd(x, y, m) > 0) b = m; else a = m; } return (a + b) / 2; }
function shirtMat() {
  const t = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(150,150,160,${0.03 + hash(y) * 0.04})`; g.fillRect(0, y, w, 1); } for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(150,150,160,${0.02 + hash(x * 3.1) * 0.03})`; g.fillRect(x, 0, 1, h); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
  return freezable(new THREE.MeshPhysicalMaterial({ color: 0xf3f3f0, map: t, roughness: 0.82, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffffff), vertexColors: false }));
}
// el pantalón azul (cadera, cintura y piernas, con arrugas abajo) y los zapatos
const PANTP = { hip: E7(0, -7.3, -0.08, 1.56, 0.85, 1.16), waist: E7(0, -6.6, -0.02, 1.26, 0.42, 1.08),
  leg: [capP([0.76, -7.6, -0.08], [0.78, -12.78, -0.04], 0.8, 0.56, 1), capP([-0.76, -7.6, -0.08], [-0.78, -12.78, -0.04], 0.8, 0.56, 1)] };
function sdPants(x, y, z) { const P = PANTP; let d = smin(ellD(x, y, z, P.hip), ellD(x, y, z, P.waist), 0.25); for (const l of P.leg) d = smin(d, capD(x, y, z, l), 0.18);
  d += 0.016 * Math.sin(y * 6.5 + Math.sin(x * 4.0 + z * 3.0) * 1.6) * (0.25 + 0.75 * clamp((-y - 11.0) / 1.6)) + 0.01 * Math.sin(y * 3.1 + x * 7.0) * clamp((-y - 8.6) / 1.0) * (1 - clamp((-y - 10.2) / 0.8));
  return Math.max(d, -(y + 12.82)); }
const SHOEP = [E7(0.8, -13.22, 0.3, 0.48, 0.39, 0.9), E7(-0.8, -13.22, 0.3, 0.48, 0.39, 0.9)];
function sdShoes(x, y, z) { return Math.max(Math.min(ellD(x, y, z, SHOEP[0]), ellD(x, y, z, SHOEP[1])), -(y + 13.6)); }
function pantsMat() {
  const t = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(40,50,80,${0.05 + hash(y) * 0.06})`; g.fillRect(0, y, w, 1); } for (let x = 0; x < w; x += 3) { g.fillStyle = `rgba(40,50,80,${0.04 + hash(x * 1.3) * 0.05})`; g.fillRect(x, 0, 1, h); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 9);
  return freezable(new THREE.MeshPhysicalMaterial({ color: 0x46689f, map: t, roughness: 0.86, sheen: 0.7, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xa6bce6) }));
}
const _up0 = new THREE.Vector3(0, 1, 0), _lv = new THREE.Vector3(), _el = new THREE.Vector3();
function limb(m, a, b) { const d = _lv.copy(b).sub(a), L = d.length(); m.position.copy(a); m.quaternion.setFromUnitVectors(_up0, d.divideScalar(L)); m.scale.set(1, L, 1); }
function buildHero() {
  const G = new THREE.Group(), U = {};
  // cabeza (con su grupo para girarla y el plano de corte de perfil)
  U.cut = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 5)];
  const skin = stubbly(freezable(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.46, sheen: 0.55, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffd27a), clearcoat: 0.14, clearcoatRoughness: 0.45, emissive: 0x4a3006, emissiveIntensity: 0.18 })));
  skin.clippingPlanes = U.cut;
  const skinFlat = freezable(new THREE.MeshPhysicalMaterial({ color: 0xdcae36, roughness: 0.46, sheen: 0.5, sheenColor: new THREE.Color(0xffd27a), emissive: 0x4a3006, emissiveIntensity: 0.18 })); skinFlat.clippingPlanes = U.cut;
  const H = new THREE.Group(); G.add(H); U.head = H;
  const hm = new THREE.Mesh(headGeo(), skin); hm.castShadow = true; hm.receiveShadow = true; H.add(hm); U.headMesh = hm;
  U.eyes = [0.22, -0.22].map(x => { const e = makeEye(skinFlat, 0.19, 0.05); e.position.set(x, 0.12, 0.62); e.traverse(o => { if (o.isMesh && !o.material.clippingPlanes) o.material.clippingPlanes = U.cut; }); H.add(e); return e; });
  const hb = hairMat(0x5a4130); hb.clippingPlanes = U.cut;
  U.brows = [];
  // los dos pelos de arriba (se ven cuando sale volando la gorra)
  const hh = hairMat(0x2a1d14); hh.clippingPlanes = U.cut;
  U.hairs = [-0.05, 0.06].map((x, i) => { const m = taperTube([v3(x, 1.36, 0.3 - i * 0.05), v3(x * 1.4, 1.58, 0.12 - i * 0.04), v3(x * 1.6, 1.62, -0.12 - i * 0.04), v3(x, 1.44, -0.34 - i * 0.04)], 0.013, hh, 40, 6, u => 0.6 + 0.4 * Math.sin(Math.PI * u)); H.add(m); return m; });
  const tm = freezable(new THREE.MeshPhysicalMaterial({ color: 0xf2eee4, roughness: 0.3, clearcoat: 0.6 })); tm.clippingPlanes = U.cut;
  const teethU = new THREE.Group(); for (let i = -4; i <= 4; i++) { const a = i * 0.16, t = rbox(0.075, 0.1, 0.05, tm, 0.02); t.position.set(Math.sin(a) * 0.42, -0.655, 0.36 + Math.cos(a) * 0.42); t.rotation.y = a; teethU.add(t); } H.add(teethU);
  U.jaw = new THREE.Group(); U.jaw.position.copy(JAW_P); H.add(U.jaw);
  const teethL = new THREE.Group(); for (let i = -4; i <= 4; i++) { const a = i * 0.16, t = rbox(0.07, 0.085, 0.045, tm, 0.02); t.position.set(Math.sin(a) * 0.39, -0.715, 0.35 + Math.cos(a) * 0.39); t.rotation.y = a; teethL.add(t); }
  teethL.position.sub(JAW_P); U.jaw.add(teethL);
  U.cap = new THREE.Group(); U.cap.visible = false; H.add(U.cap);
  // cuerpo: la camisa blanca de manga corta (cuello y tres botones), el pantalón azul y los zapatos
  const shirt = shirtMat(); U.shirt = shirt;
  const body = new THREE.Mesh(mcGeometry(sdBody, [-2.25, -7.0, -1.75, 2.25, -1.4, 1.75], 0.034, (x, y, z, c) => c.setRGB(1, 1, 1)), shirt); body.castShadow = true; body.receiveShadow = true; G.add(body); U.body = body;
  for (const s of [-1, 1]) { const cl = rbox(0.52, 0.36, 0.04, shirt, 0.03); cl.position.set(s * 0.33, -1.68, 0.42); cl.rotation.set(-0.55, s * 0.5, s * 0.72); cl.castShadow = true; G.add(cl); }
  const bm = freezable(new THREE.MeshPhysicalMaterial({ color: 0xe9e6df, roughness: 0.3, clearcoat: 1 }));
  for (let i = 0; i < 4; i++) { const y = -2.6 - i * 0.95, b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 20), bm), z = surfZ(sdBody, 0, y), n = v3(0, sdBody(0, y + 0.01, z) - sdBody(0, y - 0.01, z), 0.02).normalize();
    b.quaternion.setFromUnitVectors(_up0, n); b.position.set(0, y, z + 0.012); G.add(b); }
  const pants = new THREE.Mesh(mcGeometry(sdPants, [-2.0, -12.85, -1.5, 2.0, -6.0, 1.4], 0.034, (x, y, z, c) => c.setRGB(1, 1, 1)), pantsMat()); pants.castShadow = true; pants.receiveShadow = true; G.add(pants); U.pants = pants;
  const shoes = new THREE.Mesh(mcGeometry(sdShoes, [-1.2, -13.62, -0.75, 1.2, -12.4, 1.3], 0.022, (x, y, z, c) => c.setRGB(1, 1, 1)), freezable(new THREE.MeshPhysicalMaterial({ color: 0x2a2826, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.25 })));
  shoes.castShadow = true; shoes.receiveShadow = true; G.add(shoes);
  // brazos: los de arriba (de la manga al codo) siguen a los antebrazos
  const armSkin = freezable(new THREE.MeshPhysicalMaterial({ color: 0xdcae36, roughness: 0.46, sheen: 0.5, sheenColor: new THREE.Color(0xffd27a), emissive: 0x4a3006, emissiveIntensity: 0.18 }));
  const upGeo = new THREE.LatheGeometry([[0.001, -0.1], [0.26, -0.07], [0.37, 0.03], [0.4, 0.25], [0.38, 0.6], [0.33, 0.9], [0.26, 1.03], [0.001, 1.1]].map(([r, y]) => new THREE.Vector2(r, y)), 32);
  U.upR = new THREE.Mesh(upGeo, armSkin); U.upL = new THREE.Mesh(upGeo, armSkin); for (const m of [U.upR, U.upL]) { m.castShadow = true; m.receiveShadow = true; G.add(m); }
  U.shR = v3(-1.35, -2.5, -0.2); U.shL = v3(1.35, -2.5, -0.2);
  // brazo derecho (el del polo): antebrazo y mano de piel (la mano realista) con el puño cerrado sobre el palo
  U.armR = new THREE.Group(); G.add(U.armR);
  U.handR = realHand({ inside: false }); U.handR.scale.setScalar(0.92); U.armR.add(U.handR);
  { const X = v3(0, -1, 0), Y = v3(0, 0, 1), Z = new THREE.Vector3().crossVectors(X, Y); U.handR.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    const G = v3(0, 0.72, -0.3).multiplyScalar(0.92).applyQuaternion(U.handR.quaternion); U.handR.position.set(0, 0.2, 0).sub(G); }
  U.handR.updateMatrix();
  handPose2(U.handR, [0.9, 1.45, 1.5, 1.52, 1.55]);
  U.handR.traverse(o => { if (o.isMesh && o.material && !o.isSprite) o.material = freezable(o.material.clone()); });
  U.pop = popsicle(); U.pop.rotation.x = POP_TILT; U.armR.add(U.pop);
  // brazo izquierdo: cae junto al cuerpo, con la mano relajada (la misma mano, en espejo)
  U.handL = realHand({ inside: false }); U.handL.scale.set(-0.92, 0.92, 0.92); G.add(U.handL);
  handPose2(U.handL, [0.3, 0.45, 0.55, 0.65]);
  U.handL.traverse(o => { if (o.isMesh && o.material && !o.isSprite) o.material = freezable(o.material.clone()); });
  { const E = v3(2.05, -4.45, 0.12), W = v3(2.1, -6.7, 0.38), Y = W.clone().sub(E).normalize(), Zh = v3(-1, 0, 0.25).normalize(), X = new THREE.Vector3().crossVectors(Y, Zh).normalize(), Z = new THREE.Vector3().crossVectors(X, Y);
    U.handL.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    const off = v3(0, HAND_Y0 - 2.25, 0).multiply(U.handL.scale).applyQuaternion(U.handL.quaternion); U.handL.position.copy(E).sub(off); limb(U.upL, U.shL, E); }
  // carámbanos (crecen cuando pasa la escarcha)
  const im = new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.85, clearcoat: 1, clearcoatRoughness: 0.02, emissive: 0x4f8fd8, emissiveIntensity: 0.25 }); im.clippingPlanes = U.cut;
  U.icicles = [];
  const ic = (x, y, z, len, r, par = H) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, len, 10).rotateX(Math.PI).translate(0, -len / 2, 0), im); m.position.set(x, y, z); m.scale.setScalar(0.0001); par.add(m); U.icicles.push({ m, p: new THREE.Vector3(x, y, z) }); };
  for (const [x, l] of [[-0.32, 0.15], [-0.22, 0.1], [-0.11, 0.18], [0.0, 0.12], [0.1, 0.17], [0.21, 0.1], [0.31, 0.14]]) ic(x, -0.66, 0.92 - Math.abs(x) * 0.28, l, 0.024);
  ic(0, -0.42, 1.2, 0.13, 0.026); ic(-0.2, -1.07, 0.76, 0.14, 0.03); ic(0.16, -1.08, 0.75, 0.1, 0.025); ic(0.8, -0.2, -0.2, 0.12, 0.025); ic(-0.8, -0.2, -0.2, 0.13, 0.025);
  G.userData = U; return G;
}
// la pose del brazo que sostiene el polo: el puño (con el palo) en P, el polo apuntando a «dir»
const _hq = new THREE.Quaternion(), _hm4 = new THREE.Matrix4(), POP_TILT = 0.7;
function armPose(U, P, dir, E) {      // P: donde está el palo en el puño; dir: hacia dónde apunta el polo; E: hacia dónde queda el codo
  const s = dir.clone().normalize(), e = E.clone().sub(P), n = e.sub(s.clone().multiplyScalar(e.dot(s))).normalize().negate(), ca = Math.cos(POP_TILT), sa = Math.sin(POP_TILT);
  const y = s.clone().multiplyScalar(ca).addScaledVector(n, -sa), z = s.clone().multiplyScalar(sa).addScaledVector(n, ca), x = new THREE.Vector3().crossVectors(y, z).normalize();
  _hm4.makeBasis(x, y, z); U.armR.quaternion.setFromRotationMatrix(_hm4); U.armR.position.copy(P).sub(s.multiplyScalar(0.2));
  _el.set(0, HAND_Y0 - 2.25, 0).applyMatrix4(U.handR.matrix).applyQuaternion(U.armR.quaternion).add(U.armR.position); limb(U.upR, U.shR, _el);
}
// ---------------------------------------------------------------- Springfield (Javi, 14-11, con la imagen de la casa): la casa de los Simpson en versión real —estuco
// melocotón, tejado marrón de tejas asfálticas con el canto gris, la chimenea a la izquierda con ladrillos a la vista, los dos miradores con su toldo de lona,
// la puerta rosa en arco, las ventanas de arriba, el ala de la derecha y el garaje con su puerta blanca—, el jardín, el camino, la acera, la calle, los dos
// coches (el rosa y la ranchera naranja), los árboles, las vallas, la casa del vecino, el buzón, la antena y el cielo con nubes.
// Se construye en decímetros reales con la puerta en el origen y la fachada en z = 0; luego se escala (HSC) para que la puerta mida unas 1,35 veces lo que
// Homer, que está de pie delante de la puerta (cabeza en el origen del mundo, pies en y = GY).
const GY = -13.6, HSC = 0.86, HZ = -6.5;
const SUN_DIR = new THREE.Vector3(-0.42, 0.78, 0.62).normalize();
// textura que se repite (canvas)
function tex2(w, h, draw, srgb = true) { const t = canvasTex(w, h, draw); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (!srgb) t.colorSpace = THREE.NoColorSpace; return t; }
// motas sin costuras (cada una se dibuja también en las copias de los bordes)
function speckle(g, w, h, n, cols, r0, r1, seed = 1) {
  for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; const r = r0 + hash(i * 1.7 + seed) * (r1 - r0), x = hash(i * 3.1 + seed * 7) * w, y = hash(i * 5.3 + seed * 3) * h;
    for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) { if ((ox && Math.abs(x + ox - w / 2) > w / 2 + r) || (oy && Math.abs(y + oy - h / 2) > h / 2 + r)) continue; g.beginPath(); g.arc(x + ox, y + oy, r, 0, 7); g.fill(); } }
}
function blotches(g, w, h, n, cols, r0, r1, a, seed = 1) {
  for (let i = 0; i < n; i++) { const x = hash(i * 9.1 + seed) * w, y = hash(i * 4.7 + seed) * h, r = r0 + hash(i * 2.3 + seed) * (r1 - r0), c = cols[i % cols.length];
    for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, 2 * r, 2 * r); } }
}
// coordenadas de textura a escala real (s = decímetros que cubre la textura): cada cara se proyecta según su normal
function boxUV(geo, s, swap = false) {
  if (geo.index) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  const P = geo.attributes.position, N = geo.attributes.normal, uv = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) { const nx = Math.abs(N.getX(i)), ny = Math.abs(N.getY(i)), nz = Math.abs(N.getZ(i)), x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (ny >= nx && ny >= nz) { uv[i * 2] = (swap ? z : x) / s; uv[i * 2 + 1] = (swap ? x : z) / s; } else if (nx >= nz) { uv[i * 2] = z / s; uv[i * 2 + 1] = y / s; } else { uv[i * 2] = x / s; uv[i * 2 + 1] = y / s; } }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
}
// pared con huecos (rectángulos o arcos) en su plano (u, v), extruida th hacia +z
function wallGeo(u0, u1, v0, v1, holes, th) {
  const s = new THREE.Shape(); s.moveTo(u0, v0); s.lineTo(u1, v0); s.lineTo(u1, v1); s.lineTo(u0, v1); s.closePath();
  for (const H of holes) s.holes.push(H.a ? archPath(H.u, H.v, H.w, H.h) : rectPath(H.u, H.v, H.w, H.h));
  return new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false, curveSegments: 28 });
}
function rectPath(u, v, w, h, P = new THREE.Path()) { P.moveTo(u - w / 2, v); P.lineTo(u + w / 2, v); P.lineTo(u + w / 2, v + h); P.lineTo(u - w / 2, v + h); P.closePath(); return P; }
function archPath(u, v, w, h, P = new THREE.Path()) { const r = w / 2; P.moveTo(u - r, v); P.lineTo(u + r, v); P.lineTo(u + r, v + h - r); P.absarc(u, v + h - r, r, 0, Math.PI, false); P.closePath(); return P; }
function triGeo(u0, u1, v0, um, v1, th, holes = []) { const s = new THREE.Shape(); s.moveTo(u0, v0); s.lineTo(u1, v0); s.lineTo(um, v1); s.closePath(); for (const H of holes) s.holes.push(rectPath(H.u, H.v, H.w, H.h)); return new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false }); }
// caja que se estrecha (abajo w0 × d0, arriba w1 × d1)
function frustumGeo(w0, d0, w1, d1, h) { const g = new THREE.BoxGeometry(1, h, 1), P = g.attributes.position; for (let i = 0; i < P.count; i++) { const top = P.getY(i) > 0; P.setX(i, P.getX(i) * (top ? w1 : w0)); P.setZ(i, P.getZ(i) * (top ? d1 : d0)); } g.computeVertexNormals(); return g; }

const HMAT = {};
function houseMats() {
  const M = HMAT;
  const stC = tex2(512, 512, (g, w, h) => { g.fillStyle = '#dea781'; g.fillRect(0, 0, w, h); blotches(g, w, h, 34, ['255,228,200', '160,100,62'], 30, 110, 0.08);
    speckle(g, w, h, 7000, ['rgba(255,236,214,.16)', 'rgba(140,86,52,.12)'], 0.5, 1.5); });
  const stB = tex2(512, 512, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); speckle(g, w, h, 16000, ['rgba(255,255,255,.22)', 'rgba(0,0,0,.24)'], 0.5, 1.7, 3); }, false);
  M.stucco = new THREE.MeshStandardMaterial({ map: stC, bumpMap: stB, bumpScale: 0.9, roughness: 0.93 });
  // tejas asfálticas: filas al tresbolillo, con su sombra y el grano
  const shingle = (bump) => tex2(512, 512, (g, w, h) => { const rows = 16, rh = h / rows; g.fillStyle = bump ? '#7a7a7a' : '#5e4130'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) { const tw = w / 8, off = (r % 2) * tw / 2;
      for (let k = -1; k < 9; k++) { const x = k * tw + off + (hash(r * 13 + k) - 0.5) * 6, c = hash(r * 7.3 + k * 1.9);
        g.fillStyle = bump ? `rgb(${150 + c * 40 | 0},${150 + c * 40 | 0},${150 + c * 40 | 0})` : `rgb(${92 + c * 34 | 0},${62 + c * 22 | 0},${42 + c * 16 | 0})`;
        g.fillRect(x + 1, r * rh + 1, tw - 2, rh - 1); }
      const gr = g.createLinearGradient(0, r * rh + rh * 0.62, 0, r * rh + rh); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, bump ? 'rgba(0,0,0,.55)' : 'rgba(20,10,4,.45)'); g.fillStyle = gr; g.fillRect(0, r * rh, w, rh); }
    speckle(g, w, h, 9000, bump ? ['rgba(255,255,255,.25)', 'rgba(0,0,0,.25)'] : ['rgba(170,130,96,.25)', 'rgba(30,18,10,.25)'], 0.4, 1.2, 5); }, !bump);
  M.roof = new THREE.MeshStandardMaterial({ map: shingle(false), bumpMap: shingle(true), bumpScale: 2.2, roughness: 0.88 });
  M.trim = new THREE.MeshStandardMaterial({ color: 0x7d8486, roughness: 0.6 });
  M.trimD = new THREE.MeshStandardMaterial({ color: 0x6f4630, roughness: 0.55 });          // marcos marrones
  M.frame = new THREE.MeshStandardMaterial({ color: 0x6a4431, roughness: 0.5 });
  M.white = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.6 });
  const brick = tex2(256, 256, (g, w, h) => { g.fillStyle = '#c9b8a6'; g.fillRect(0, 0, w, h); const bh = h / 8, bw = w / 3.5;
    for (let r = 0; r < 8; r++) for (let k = -1; k < 5; k++) { const c = hash(r * 5 + k * 3.3); g.fillStyle = `rgb(${150 + c * 40 | 0},${58 + c * 20 | 0},${40 + c * 14 | 0})`; g.fillRect(k * bw + (r % 2) * bw / 2 + 2, r * bh + 2, bw - 4, bh - 4); }
    speckle(g, w, h, 1500, ['rgba(0,0,0,.18)', 'rgba(255,220,200,.12)'], 0.5, 1.4, 9); });
  M.brick = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.85, bumpMap: brick, bumpScale: 1.4 });
  const conc = (joint) => tex2(512, 512, (g, w, h) => { g.fillStyle = '#b8b4ab'; g.fillRect(0, 0, w, h); blotches(g, w, h, 20, ['90,88,80', '230,228,220'], 20, 80, 0.07, 4); speckle(g, w, h, 9000, ['rgba(70,66,60,.22)', 'rgba(250,250,245,.2)'], 0.4, 1.3, 7);
    if (joint) { g.fillStyle = 'rgba(60,56,50,.55)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); } });
  M.conc = new THREE.MeshStandardMaterial({ map: conc(false), roughness: 0.9 }); M.concJ = new THREE.MeshStandardMaterial({ map: conc(true), roughness: 0.9 });
  const asph = tex2(512, 512, (g, w, h) => { g.fillStyle = '#3a3c3f'; g.fillRect(0, 0, w, h); blotches(g, w, h, 26, ['20,20,22', '90,90,92'], 30, 120, 0.12, 2); speckle(g, w, h, 16000, ['rgba(150,150,150,.3)', 'rgba(10,10,10,.3)'], 0.4, 1.2, 11); });
  M.asph = new THREE.MeshStandardMaterial({ map: asph, roughness: 0.95 });
  // césped: briznas en muchos verdes (y, encima, manchas grandes de otro verde por el shader)
  const grass = tex2(1024, 1024, (g, w, h) => { g.fillStyle = '#3f6e22'; g.fillRect(0, 0, w, h); g.lineCap = 'round';
    for (let i = 0; i < 26000; i++) { const x = hash(i * 1.37) * w, y = hash(i * 2.91) * h, l = 4 + hash(i * 5.1) * 9, a = -1.57 + (hash(i * 7.7) - 0.5) * 1.1, c = hash(i * 3.3);
      g.strokeStyle = `rgba(${40 + c * 70 | 0},${85 + c * 75 | 0},${18 + c * 30 | 0},.85)`; g.lineWidth = 1 + hash(i * 9.9) * 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } });
  grass.anisotropy = 8;
  M.grass = new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 });
  M.grass.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vGW; float gH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(gH(i), gH(i + vec2(1, 0)), f.x), mix(gH(i + vec2(0, 1)), gH(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{ vec2 q = vGW.xz; float m = gN(q / 260.) * 0.6 + gN(q / 90.) * 0.4; diffuseColor.rgb *= mix(vec3(0.82, 0.86, 0.7), vec3(1.12, 1.1, 0.95), m); }`); };
  M.wood = new THREE.MeshStandardMaterial({ color: 0x8b4b31, roughness: 0.75 });
  M.woodL = new THREE.MeshStandardMaterial({ map: tex2(256, 256, (g, w, h) => { g.fillStyle = '#a77b52'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '70,44,24' : '200,160,120'},.18)`; g.fillRect(hash(i * 3.1) * w, 0, 1 + hash(i * 1.7) * 2, h); } g.fillStyle = 'rgba(40,24,12,.6)'; g.fillRect(0, 0, 3, h); }), roughness: 0.8 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0x24363d, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.62, envMapIntensity: 1.8, depthWrite: false });
  M.curtain = new THREE.MeshStandardMaterial({ map: tex2(256, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (let i = 0; i <= 16; i++) gr.addColorStop(i / 16, i % 2 ? '#d9d2c2' : '#f4efe4'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), roughness: 0.9 });
  M.fabric = new THREE.MeshStandardMaterial({ map: tex2(512, 64, (g, w, h) => { for (let i = 0; i < 16; i++) { const gr = g.createLinearGradient(i * w / 16, 0, (i + 1) * w / 16, 0); gr.addColorStop(0, '#5e3420'); gr.addColorStop(0.5, '#8a5232'); gr.addColorStop(1, '#5e3420'); g.fillStyle = gr; g.fillRect(i * w / 16, 0, w / 16, h); } speckle(g, w, h, 1500, ['rgba(0,0,0,.15)', 'rgba(255,220,180,.08)'], 0.4, 1, 13); }), roughness: 0.85, side: THREE.DoubleSide });
  M.door = new THREE.MeshStandardMaterial({ map: canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#d27c6a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,30,20,.5)'; g.lineWidth = 3;
    for (const [x, y, ww, hh] of [[14, 70, 42, 90], [72, 70, 42, 90], [14, 175, 42, 66], [72, 175, 42, 66]]) { g.strokeRect(x, y, ww, hh); g.strokeStyle = 'rgba(255,200,180,.35)'; g.strokeRect(x + 3, y + 3, ww - 6, hh - 6); g.strokeStyle = 'rgba(90,30,20,.5)'; }
    speckle(g, w, h, 800, ['rgba(0,0,0,.06)', 'rgba(255,255,255,.06)'], 0.5, 1.2, 17); }), roughness: 0.45 });
  M.gdoor = new THREE.MeshStandardMaterial({ map: canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#ece5d6'; g.fillRect(0, 0, w, h); for (let r = 1; r < 4; r++) { g.fillStyle = 'rgba(80,70,55,.45)'; g.fillRect(0, r * h / 4 - 2, w, 3); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(0, r * h / 4 + 1, w, 2); }
    for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { g.strokeStyle = 'rgba(120,108,90,.28)'; g.lineWidth = 2; g.strokeRect(k * w / 6 + 8, r * h / 4 + 10, w / 6 - 16, h / 4 - 20); } }), roughness: 0.5 });
  M.metal = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 1, roughness: 0.35 });
  M.brass = new THREE.MeshStandardMaterial({ color: 0xd9b25e, metalness: 1, roughness: 0.25 });
  M.bark = new THREE.MeshStandardMaterial({ map: tex2(256, 256, (g, w, h) => { g.fillStyle = '#4b3b2c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '20,14,8' : '120,104,86'},.35)`; g.fillRect(hash(i * 3.1) * w, hash(i * 5.7) * h, 1 + hash(i * 1.3) * 3, 10 + hash(i * 2.9) * 50); } }), roughness: 0.95 });
  const leafB = tex2(256, 256, (g, w, h) => { g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { const x = hash(i * 1.9) * w, y = hash(i * 3.7) * h, a = hash(i * 7.1) * 6.28, c = 90 + hash(i * 5.5) * 165 | 0;
    g.fillStyle = `rgb(${c},${c},${c})`; g.beginPath(); g.ellipse(x, y, 7, 3.4, a, 0, 7); g.fill(); } }, false);
  M.leaf = new THREE.MeshStandardMaterial({ color: 0xffffff, bumpMap: leafB, bumpScale: 6, roughness: 0.82 });
  M.conifer = new THREE.MeshStandardMaterial({ color: 0x1f4a2a, bumpMap: leafB, bumpScale: 5, roughness: 0.85 });
}

// ---------- piezas
function hMesh(G, geo, m, s = 40, o = {}) { geo = boxUV(geo, s, o.swap); const me = new THREE.Mesh(geo, m); me.castShadow = o.cast !== false; me.receiveShadow = true; G.add(me); return me; }
function hBox(G, x0, y0, z0, x1, y1, z1, m, s = 40, o = {}) { return hMesh(G, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), m, s, o); }
// ventana: marco marrón, parteluz, cristal y visillos; f = 'z' (en una pared que mira a +z) o 'x-' (pared que mira a −x)
function hWindow(G, cx, cy, w, h, face = 'z', o = {}) {
  const M = HMAT, g = new THREE.Group(); G.add(g); g.position.set(cx, cy, 0);
  if (face === 'z') g.position.z = o.z ?? 0; else { g.position.x = o.x ?? 0; g.position.z = cx; g.position.y = cy; g.rotation.y = face === 'x-' ? -Math.PI / 2 : Math.PI / 2; }
  const fr = new THREE.Shape(); fr.moveTo(-w / 2 - 1, -h / 2 - 1); fr.lineTo(w / 2 + 1, -h / 2 - 1); fr.lineTo(w / 2 + 1, h / 2 + 1); fr.lineTo(-w / 2 - 1, h / 2 + 1); fr.closePath(); fr.holes.push(rectPath(0, -h / 2, w, h));
  const fm = new THREE.Mesh(new THREE.ExtrudeGeometry(fr, { depth: 1.4, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.2, bevelSegments: 1 }), M.frame); fm.position.z = -0.6; fm.castShadow = true; g.add(fm);
  const mul = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.9), M.frame); mul.position.z = -0.9; g.add(mul);
  const mh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, 0.8), M.frame); mh.position.set(0, h * 0.18, -0.9); g.add(mh);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.glass); gl.position.z = -1.2; gl.renderOrder = 2; g.add(gl);
  const cu = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.42, h * 0.95), M.curtain); for (const s of [-1, 1]) { const c = cu.clone(); c.position.set(s * w * 0.3, 0, -3.2); g.add(c); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0x2c2620, roughness: 1 })); back.position.z = -6; g.add(back);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 3.4, 1.0, 2.6), M.trim); sill.position.set(0, -h / 2 - 1.4, 0.6); sill.castShadow = true; g.add(sill);
  return g;
}

// ---------- la casa
function buildHouse() {
  houseMats(); const M = HMAT, G = new THREE.Group(); G.scale.setScalar(HSC); G.position.set(0, GY, HZ);
  const tp = Math.tan(28 * Math.PI / 180), cp = Math.cos(28 * Math.PI / 180), P = 28 * Math.PI / 180, TH = 3;
  const XL = -52, XR = 50, ZB = -80, EH = 56, RY = EH + 40 * tp;
  // fachada con la puerta en arco y las dos ventanas de arriba
  const holes = [{ a: 1, u: 0, v: 1.6, w: 11, h: 22.5 }, { u: -27, v: 34, w: 20, h: 14 }, { u: 25, v: 34, w: 20, h: 14 }];
  hMesh(G, wallGeo(XL, XR, 0, EH, holes, TH).translate(0, 0, -TH), M.stucco);
  // pared izquierda (con dos ventanas), derecha y trasera
  hMesh(G, wallGeo(ZB, 0, 0, EH, [{ u: -50, v: 34, w: 16, h: 14 }, { u: -50, v: 9, w: 16, h: 14 }], TH).rotateY(-Math.PI / 2).translate(XL + TH, 0, 0), M.stucco);
  hMesh(G, wallGeo(0, -ZB, 0, EH, [], TH).rotateY(Math.PI / 2).translate(XR - TH, 0, 0), M.stucco);
  hMesh(G, wallGeo(-XR, -XL, 0, EH, [], TH).rotateY(Math.PI).translate(0, 0, ZB + TH), M.stucco);
  // hastiales (triángulos de los lados)
  hMesh(G, triGeo(ZB, 0, EH, ZB / 2, RY, TH).rotateY(-Math.PI / 2).translate(XL + TH, 0, 0), M.stucco);
  hMesh(G, triGeo(0, -ZB, EH, -ZB / 2, RY, TH).rotateY(Math.PI / 2).translate(XR - TH, 0, 0), M.stucco);
  // suelo/techo interior (para que por las ventanas no se vea el cielo)
  hBox(G, XL + TH, 27, ZB + TH, XR - TH, 28, -TH, M.white, 40, { cast: false });
  // tejado a dos aguas: faldones, cumbrera, canto gris (frente y lados) y alero
  const ZR = ZB / 2, OV = 7, SL = (40 + OV) / cp, XC = (XL + XR) / 2, RW = XR - XL + 10;
  for (const s of [1, -1]) { const zc = ZR + s * (40 + OV) / 2, yc = EH + ((40 + OV) / 2 - OV) * tp + 1.4 / cp + 0.2;
    hMesh(G, new THREE.BoxGeometry(RW, 2.8, SL).rotateX(s * P).translate(XC, yc, zc), M.roof, 24);
    const ye = EH - OV * tp;      // altura del alero
    hBox(G, XC - RW / 2 - 0.6, ye - 3.4, s > 0 ? OV - 0.4 : ZB - OV - 1.0, XC + RW / 2 + 0.6, ye + 1.6, s > 0 ? OV + 1.0 : ZB - OV + 0.4, M.trim);
    hBox(G, XC - RW / 2, ye - 2.6, s > 0 ? 0 : ZB - OV, XC + RW / 2, ye - 1.8, s > 0 ? OV : ZB, M.trim, 40, { cast: false });
    for (const xx of [XC - RW / 2 - 0.2, XC + RW / 2 + 0.2]) hMesh(G, new THREE.BoxGeometry(1.4, 4.4, SL + 0.6).rotateX(s * P).translate(xx, yc - 1.2, zc), M.trim); }
  hBox(G, XC - RW / 2, RY + 2.6, ZR - 2.2, XC + RW / 2, RY + 4.0, ZR + 2.2, M.roof, 24);
  // la chimenea (por fuera de la pared izquierda, cerca del frente): base ancha, hombro inclinado, tiro y remate; ladrillos a la vista
  { const cz = -22, X0 = XL - 11;
    hBox(G, X0, 0, cz - 8, XL, 34, cz + 8, M.stucco);
    hMesh(G, frustumGeo(11, 16, 8, 9, 6).translate(XL - 5.5, 37, cz), M.stucco);
    hBox(G, XL - 9.5, 40, cz - 4.5, XL - 1.5, RY + 10, cz + 4.5, M.stucco);
    hBox(G, XL - 10.4, RY + 10, cz - 5.4, XL - 0.6, RY + 12, cz + 5.4, M.trim);
    hBox(G, XL - 7.5, RY + 12, cz - 2.6, XL - 3.5, RY + 13, cz + 2.6, new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 1 }));
    for (const [y, z, w, h] of [[8, cz + 8.05, 5, 3.2], [20, cz + 8.05, 4, 2.4], [48, cz + 4.55, 3.5, 2.6], [62, cz + 4.55, 4, 2.2]]) hBox(G, (y < 34 ? X0 + 2 : XL - 8) , y, z - 0.01, (y < 34 ? X0 + 2 : XL - 8) + w, y + h, z + 0.35, M.brick, 6);
    for (const [y, z, h] of [[14, cz - 3, 3], [26, cz + 2, 2.4], [55, cz - 1, 2.6]]) hBox(G, (y < 34 ? X0 : XL - 9.5) - 0.35, y, z, (y < 34 ? X0 : XL - 9.5) + 0.01, y + h, z + 4.5, M.brick, 6); }
  // la antena de la tele (en el tejado, a la izquierda)
  { const ax = -30, ay = RY + 2.8; G.add(bar(v3(ax, ay, ZR), v3(ax, ay + 17, ZR), 0.32, M.metal, 8));
    for (const [y, l] of [[ay + 16, 9], [ay + 13.5, 7], [ay + 11, 5]]) G.add(bar(v3(ax - l / 2, y, ZR + 0.6), v3(ax + l / 2, y, ZR + 0.6), 0.16, M.metal, 6));
    G.add(bar(v3(ax, ay + 16, ZR + 0.6), v3(ax, ay + 16, ZR + 7), 0.16, M.metal, 6)); }
  // los miradores: base de estuco, banda de cristal en tres paños, remate y el toldo de lona en cuarto de cúpula
  for (const xb of [-27, 25]) {
    const trap = (bw, fw, dp, inset = 0) => { const s = new THREE.Shape(); s.moveTo(xb - bw / 2 + inset, 0); s.lineTo(xb + bw / 2 - inset, 0); s.lineTo(xb + fw / 2 - inset * 0.6, -dp + inset); s.lineTo(xb - fw / 2 + inset * 0.6, -dp + inset); s.closePath(); return s; };
    const up = (shape, y0, h, m, s = 40) => hMesh(G, new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, y0, 0), m, s);
    up(trap(26, 15, 7), 0, 7, M.stucco); up(trap(27, 16, 7.6), 6.6, 0.9, M.trim);
    const gb = up(trap(26, 15, 7, 0.6), 7.5, 16.5, M.glass); gb.castShadow = false; gb.renderOrder = 2;
    up(trap(25, 14, 6.2, 1.2), 7.5, 16.5, M.curtain);
    up(trap(27, 16, 7.6), 24, 1.6, M.trim);
    for (const [x, z] of [[xb - 13, 0], [xb - 7.5, 7], [xb + 7.5, 7], [xb + 13, 0]]) hBox(G, x - 0.6, 7.5, z - 0.6, x + 0.6, 24, z + 0.6, M.frame, 10);
    const aw = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 14, 0, Math.PI, 0, Math.PI / 2), M.fabric); aw.scale.set(14.5, 8.2, 9.6); aw.position.set(xb, 25.6, 0.2); aw.castShadow = true; aw.receiveShadow = true; G.add(aw);
    const hem = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 64, Math.PI), M.trimD); hem.rotation.x = Math.PI / 2; hem.scale.set(14.5, 9.6, 8); hem.position.set(xb, 25.6, 0.2); G.add(hem);
  }
  // la puerta: arco marrón, hoja rosa (con su pomo), escalón y felpudo
  { const ring = archPath(0, 0.4, 14.6, 25.2, new THREE.Shape()); ring.holes.push(archPath(0, 1.6, 11, 22.5));
    hMesh(G, new THREE.ExtrudeGeometry(ring, { depth: 0.9, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelSegments: 2, curveSegments: 28 }), M.trimD, 20);
    const leaf = new THREE.Mesh(new THREE.ExtrudeGeometry(archPath(0, 1.6, 11, 22.5, new THREE.Shape()), { depth: 1.0, bevelEnabled: false, curveSegments: 28 }), M.door); leaf.position.z = -2.4;
    { const g = leaf.geometry, Pp = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < Pp.count; i++) uv.setXY(i, (Pp.getX(i) + 5.5) / 11, (Pp.getY(i) - 1.6) / 22.5); }
    leaf.receiveShadow = true; G.add(leaf);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), M.brass); kn.position.set(3.7, 11.8, -1.0); G.add(kn);
    const kp = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.3, 16), M.brass); kp.rotation.x = Math.PI / 2; kp.position.set(3.7, 11.8, -1.35); G.add(kp);
    hBox(G, -8.5, 0, 0, 8.5, 1.6, 4.8, M.conc, 30);
    hBox(G, -4.2, 1.6, 0.4, 4.2, 1.75, 3.6, new THREE.MeshStandardMaterial({ color: 0x3d4a2c, roughness: 1 }), 10, { cast: false });
    const lamp = new THREE.Group(); lamp.position.set(9.5, 17, 0.6); G.add(lamp);
    const lb = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.0, 2.0), new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 0.25, roughness: 0.4 })); lb.position.set(0, 0, 0.9); lamp.add(lb);
    const lt = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 2.6), M.frame); lt.position.set(0, 1.7, 0.9); lamp.add(lt); }
  // ventanas
  hWindow(G, -27, 41, 20, 14, 'z', { z: 0 }); hWindow(G, 25, 41, 20, 14, 'z', { z: 0 });
  hWindow(G, -50, 41, 16, 14, 'x-', { x: XL }); hWindow(G, -50, 16, 16, 14, 'x-', { x: XL });
  // ala derecha (dos plantas, retranqueada) con su ventana y su tejado
  { const X0 = XR - 0.5, X1 = 76, Z0 = -14, Z1 = -78, E2 = 50, R2 = E2 + 32 * tp;
    hMesh(G, wallGeo(X0, X1, 0, E2, [{ u: 64, v: 33, w: 14, h: 12 }], TH).translate(0, 0, Z0 - TH), M.stucco);
    hMesh(G, wallGeo(-Z0, -Z1, 0, E2, [], TH).rotateY(Math.PI / 2).translate(X1 - TH, 0, 0), M.stucco);
    hMesh(G, triGeo(-Z0, -Z1, E2, (-Z0 - Z1) / 2, R2, TH).rotateY(Math.PI / 2).translate(X1 - TH, 0, 0), M.stucco);
    hWindow(G, 64, 39, 14, 12, 'z', { z: Z0 });
    const ZR2 = (Z0 + Z1) / 2, SL2 = (32 + 6) / cp;
    for (const s of [1, -1]) { const zc = ZR2 + s * 38 / 2, yc = E2 + (19 - 6) * tp + 1.4 / cp + 0.2; hMesh(G, new THREE.BoxGeometry(X1 - X0 + 6, 2.8, SL2).rotateX(s * P).translate((X0 + X1 + 6) / 2, yc, zc), M.roof, 24);
      const ye = E2 - 6 * tp; hBox(G, X0, ye - 3.2, s > 0 ? Z0 + 5 : Z1 - 7, X1 + 6.6, ye + 1.4, s > 0 ? Z0 + 7 : Z1 - 5, M.trim); } }
  // el garaje: puerta blanca de paneles, hastial con su ventanuco, tejado a dos aguas con la cumbrera hacia la calle
  { const X0 = 56, X1 = 116, Z0 = 4, Z1 = -56, E3 = 26, q = 24 * Math.PI / 180, tq = Math.tan(q), cq = Math.cos(q), XM = (X0 + X1) / 2, R3 = E3 + 30 * tq;
    { const s = new THREE.Shape(); s.moveTo(X0, 0); s.lineTo(XM - 22, 0); s.lineTo(XM - 22, 21); s.lineTo(XM + 22, 21); s.lineTo(XM + 22, 0); s.lineTo(X1, 0); s.lineTo(X1, E3); s.lineTo(X0, E3); s.closePath();
      hMesh(G, new THREE.ExtrudeGeometry(s, { depth: TH, bevelEnabled: false }).translate(0, 0, Z0 - TH), M.stucco); }
    hMesh(G, triGeo(X0, X1, E3, XM, R3, TH, [{ u: XM, v: 29, w: 5, h: 5 }]).translate(0, 0, Z0 - TH), M.stucco);
    hMesh(G, wallGeo(-Z0, -Z1, 0, E3, [], TH).rotateY(Math.PI / 2).translate(X1 - TH, 0, 0), M.stucco);
    hMesh(G, wallGeo(Z1, Z0, 0, E3, [], TH).rotateY(-Math.PI / 2).translate(X0 + TH, 0, 0), M.stucco);
    hBox(G, XM - 22, 0, Z0 - 2.2, XM + 22, 21, Z0 - 1.4, M.gdoor, 44);
    { const gd = G.children[G.children.length - 1].geometry, Pp = gd.attributes.position, uv = gd.attributes.uv; for (let i = 0; i < Pp.count; i++) uv.setXY(i, (Pp.getX(i) - XM + 22) / 44, Pp.getY(i) / 21); }
    for (const [x0, x1, y0, y1] of [[XM - 23.2, XM - 22, 0, 22.2], [XM + 22, XM + 23.2, 0, 22.2], [XM - 23.2, XM + 23.2, 21, 22.2]]) hBox(G, x0, y0, Z0 - 0.2, x1, y1, Z0 + 0.6, M.white, 20);
    hWindow(G, XM, 31.5, 5, 5, 'z', { z: Z0 });
    const SL3 = (30 + 4) / cq;
    for (const s of [-1, 1]) { const xc = XM + s * 17, yc = E3 + (17 - 4) * tq + 1.4 / cq + 0.2;
      hMesh(G, new THREE.BoxGeometry(SL3, 2.8, Z0 - Z1 + 8).rotateZ(-s * q).translate(xc, yc, (Z0 + Z1) / 2), M.roof, 24, { swap: true });
      hMesh(G, new THREE.BoxGeometry(SL3 + 0.6, 4.2, 1.4).rotateZ(-s * q).translate(xc, yc - 1.2, Z0 + 4.2), M.trim);
      const xe = XM + s * 34; hBox(G, Math.min(xe, xe - s * 1.4), E3 - 4 * tq - 3.4, Z1 - 4, Math.max(xe, xe - s * 1.4), E3 - 4 * tq + 1.4, Z0 + 4, M.trim); }
    hBox(G, XM - 1.6, R3 + 2.3, Z1 - 4, XM + 1.6, R3 + 3.6, Z0 + 4, M.roof, 24, { swap: true }); }
  // suelo: césped (a los dos lados de la calle), camino, entrada de coches, acera con juntas, bordillos y asfalto
  { const lawn = (z0, z1) => { const g = new THREE.PlaneGeometry(2400, z1 - z0, 1, 1).rotateX(-Math.PI / 2).translate(0, 0, (z0 + z1) / 2); return hMesh(G, g, M.grass, 30, { cast: false }); };
    lawn(-1300, 86); lawn(161.5, 1300);
    hBox(G, -6, 0, 4.8, 6, 0.35, 72, M.conc, 30, { cast: false }); hBox(G, 6, 0, 34, 58, 0.33, 44, M.conc, 30, { cast: false });
    hBox(G, 58, 0, 4, 114, 0.4, 72, M.concJ, 28, { cast: false });
    hBox(G, -1200, 0, 72, 1200, 0.45, 86, M.concJ, 14, { cast: false }); hBox(G, -1200, 0, 161.5, 1200, 0.45, 175.5, M.concJ, 14, { cast: false });
    hBox(G, -1200, -1.6, 86, 1200, 0.55, 87.6, M.conc, 30, { cast: false }); hBox(G, -1200, -1.6, 159.9, 1200, 0.55, 161.5, M.conc, 30, { cast: false });
    hBox(G, -1200, -1.8, 87.6, 1200, -1.25, 159.9, M.asph, 40, { cast: false }); }
  // el buzón
  { const bx = -12, bz = 68; hBox(G, bx - 0.5, 0, bz - 0.5, bx + 0.5, 10, bz + 0.5, M.woodL, 10);
    const mb = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 5, 24, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x6d7378, metalness: 0.6, roughness: 0.4 }));
    mb.rotation.z = Math.PI / 2; mb.rotation.y = Math.PI / 2; mb.position.set(bx, 10.2, bz); mb.castShadow = true; G.add(mb); hBox(G, bx - 1.6, 9.6, bz - 2.5, bx + 1.6, 10.2, bz + 2.5, mb.material, 10);
    hBox(G, bx + 1.6, 10.5, bz + 0.5, bx + 1.9, 13, bz + 1.4, new THREE.MeshStandardMaterial({ color: 0xc8322a, roughness: 0.5 }), 10); }
  // vallas: de estacas (izquierda) y de tablas (detrás)
  { const pk = new THREE.Shape(); pk.moveTo(-0.65, 0); pk.lineTo(0.65, 0); pk.lineTo(0.65, 10); pk.lineTo(0, 11.4); pk.lineTo(-0.65, 10); pk.closePath();
    const pg = new THREE.ExtrudeGeometry(pk, { depth: 0.5, bevelEnabled: false }); const n = 34, im = new THREE.InstancedMesh(pg, M.wood, n); im.castShadow = im.receiveShadow = true;
    for (let i = 0; i < n; i++) { _o.position.set(-96, 0, -30 + i * 3); _o.rotation.set(0, Math.PI / 2, 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); } G.add(im);
    for (const y of [3, 8]) hBox(G, -97.2, y, -31, -96.4, y + 1, 72, M.wood, 20);
    const bw = 2.2, nb = Math.round(250 / bw), bi = new THREE.InstancedMesh(new THREE.BoxGeometry(bw - 0.15, 18, 0.6), M.woodL, nb); bi.castShadow = bi.receiveShadow = true;
    for (let i = 0; i < nb; i++) { _o.position.set(-97 + i * bw, 9, -112); _o.rotation.set(0, 0, 0); _o.scale.set(1, 1 + (hash(i) - 0.5) * 0.03, 1); _o.updateMatrix(); bi.setMatrixAt(i, _o.matrix); } G.add(bi);
    const nb2 = Math.round(95 / bw), bj = new THREE.InstancedMesh(new THREE.BoxGeometry(bw - 0.15, 18, 0.6), M.woodL, nb2); bj.castShadow = bj.receiveShadow = true;
    for (let i = 0; i < nb2; i++) { _o.position.set(140, 9, -112 + i * bw); _o.rotation.set(0, Math.PI / 2, 0); _o.updateMatrix(); bj.setMatrixAt(i, _o.matrix); } G.add(bj); }
  buildCars(G); buildPlants(G); buildNeighbour(G);
  return G;
}
// (_o: el Object3D de trabajo de 20_stations.js)
// ---------- los coches: berlina rosa y ranchera naranja (carrocería extruida de su perfil, habitáculo de cristal, ruedas, luces, cromados)
function carMesh(color, wagon = false) {
  const g = new THREE.Group(), paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.3, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x141c22, roughness: 0.05, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, metalness: 1, roughness: 0.15 }), rub = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.85 });
  const L = 23, W = 8.6;
  const body = new THREE.Shape(); body.moveTo(-L, 3.2); body.lineTo(-L, 9.2); body.quadraticCurveTo(-L + 0.4, 10.4, -L + 2, 10.5); body.lineTo(L - 2.4, 9.9); body.quadraticCurveTo(L, 9.6, L + 0.3, 8);
  body.lineTo(L + 0.3, 3.4); body.lineTo(15.2 + 4.3, 3.2); body.absarc(15.2, 3.2, 4.3, 0, Math.PI, false); body.lineTo(-14 + 4.3, 3.2); body.absarc(-14, 3.2, 4.3, 0, Math.PI, false); body.closePath();
  const bg = new THREE.ExtrudeGeometry(body, { depth: 2 * W - 2.4, bevelEnabled: true, bevelSize: 1.2, bevelThickness: 1.2, bevelSegments: 4, curveSegments: 16 }); bg.translate(0, 0, -(W - 1.2));
  const bm = new THREE.Mesh(bg, paint); bm.castShadow = bm.receiveShadow = true; g.add(bm);
  const cab = new THREE.Shape(); const r0 = wagon ? -L + 1.2 : -12.5, r1 = wagon ? -L + 1.8 : -6.8; cab.moveTo(r0, 10.3); cab.lineTo(r1, 14.6); cab.lineTo(5.2, 14.8); cab.lineTo(11.5, 10.1); cab.closePath();
  const cg = new THREE.ExtrudeGeometry(cab, { depth: 2 * W - 3.4, bevelEnabled: true, bevelSize: 0.7, bevelThickness: 0.7, bevelSegments: 3 }); cg.translate(0, 0, -(W - 1.7));
  const cm = new THREE.Mesh(cg, glass); cm.castShadow = true; g.add(cm);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.2 - r1 + 0.6, 0.7, 2 * W - 2.6), paint); roof.position.set((5.2 + r1) / 2, 14.95, 0); roof.castShadow = true; g.add(roof);
  for (const x of [r1 + 0.3, (r1 + 5.2) / 2 + (wagon ? -3 : 0), 5.0]) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.4, 0.5), paint); p.position.set(x, 12.6, s * (W - 1.1)); p.rotation.z = x > 4 ? -0.6 : x < r1 + 1 ? (wagon ? 0.1 : 0.62) : 0; g.add(p); }
  for (const [x, y, z] of [[15.2, 3.3, 1], [-14, 3.3, 1], [15.2, 3.3, -1], [-14, 3.3, -1]]) {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(2.6, 1.15, 14, 32), rub); tire.position.set(x, y, z * (W - 1.6)); tire.scale.z = 1.25; tire.castShadow = true; g.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.5, 24), chrome); rim.rotation.x = Math.PI / 2; rim.position.set(x, y, z * (W - 0.55)); g.add(rim); }
  for (const s of [-1, 1]) { const hl = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 20), new THREE.MeshStandardMaterial({ color: 0xf6f3e8, emissive: 0xfff2d0, emissiveIntensity: 0.2, roughness: 0.1 })); hl.rotation.z = Math.PI / 2; hl.position.set(L + 0.55, 7.4, s * 5.6); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 2.6), new THREE.MeshStandardMaterial({ color: 0x9a1010, emissive: 0x5a0606, emissiveIntensity: 0.4, roughness: 0.2 })); tl.position.set(-L - 0.55, 8.2, s * 6.2); g.add(tl); }
  for (const x of [L + 0.9, -L - 0.9]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 2 * W + 0.4), chrome); b.position.set(x, 4.6, 0); b.castShadow = true; g.add(b); }
  const gr = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.4, 6.4), new THREE.MeshStandardMaterial({ color: 0x1a1c1e, metalness: 0.5, roughness: 0.4 })); gr.position.set(L + 0.5, 6.7, 0); g.add(gr);
  return g;
}
function buildCars(G) {
  const c1 = carMesh(0xd77fc8); c1.position.set(76, 0.4, 44); c1.rotation.y = Math.PI / 2 + 0.06; G.add(c1);
  const c2 = carMesh(0xd6582e, true); c2.position.set(100, 0.4, 30); c2.rotation.y = Math.PI / 2 - 0.05; G.add(c2);
}
// ---------- árboles (copa de grumos con relieve de hojas), coníferas, arbustos y seto
function buildPlants(G) {
  const M = HMAT, ico = new THREE.SphereGeometry(1, 22, 14);      // malla con índices: normales suaves (las del icosaedro salían en facetas)
  { const P = ico.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const k = 1 + 0.16 * Math.sin(v.x * 5.1 + v.y * 3.3) * Math.sin(v.z * 4.7 - v.y * 2.1) + 0.08 * Math.sin(v.x * 11 + v.z * 9); v.multiplyScalar(k); P.setXYZ(i, v.x, v.y, v.z); } ico.computeVertexNormals(); }
  const blobs = []; const col = new THREE.Color();
  const tree = (x, z, h, r, seed) => { const tr = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.09, r * 0.15, h * 0.62, 12), M.bark); tr.position.set(x, h * 0.31, z); tr.castShadow = true; G.add(tr);
    for (let i = 0; i < 6; i++) { const a = hash(seed + i * 3.1) * 6.28, l = r * (0.4 + hash(seed + i) * 0.4); G.add(bar(v3(x, h * (0.42 + 0.06 * i), z), v3(x + Math.cos(a) * l, h * (0.6 + 0.05 * i), z + Math.sin(a) * l), r * 0.035, M.bark, 6)); }
    for (let i = 0; i < 46; i++) { const u = hash(seed + i * 1.37), w = hash(seed + i * 2.71), q = hash(seed + i * 4.13); const th = u * 6.283, ph = Math.acos(1 - 2 * w * 0.9), rr = r * (0.55 + 0.45 * Math.cbrt(q));
      blobs.push([x + Math.sin(ph) * Math.cos(th) * rr, h * 0.72 + Math.cos(ph) * rr * 0.8, z + Math.sin(ph) * Math.sin(th) * rr, r * (0.3 + 0.18 * hash(seed + i * 5.9)), 0.75 + 0.35 * hash(seed + i * 7.3) + 0.15 * (Math.cos(ph))]); } };
  for (const [x, z, h, r, s] of [[-75, -150, 120, 42, 1], [-10, -175, 135, 48, 2], [52, -160, 112, 40, 3], [-150, -60, 105, 38, 4], [-165, 40, 125, 44, 5], [-118, -190, 110, 40, 6], [100, -205, 120, 44, 7], [-230, -120, 120, 46, 8], [230, 220, 110, 40, 9], [-240, 230, 120, 44, 10]]) tree(x, z, h, r, s * 17.3);
  // arbustos junto a la casa y el seto de la derecha
  const bush = (x, z, r, n, seed) => { for (let i = 0; i < n; i++) { const a = hash(seed + i) * 6.28, d = r * 0.45 * hash(seed + i * 2.2); blobs.push([x + Math.cos(a) * d, r * (0.5 + 0.3 * hash(seed + i * 3.3)), z + Math.sin(a) * d, r * (0.5 + 0.25 * hash(seed + i * 4.4)), 0.7 + 0.3 * hash(seed + i * 5.5)]); } };
  for (const [x, z, r, s] of [[-13, 6, 4.2, 1], [13, 6, 4.2, 2], [-44, 12, 5.5, 3], [-66, 6, 6, 4], [41, 11, 5, 5], [8, 11, 2.2, 6], [-90, 50, 5, 7]]) bush(x, z, r, 7, s * 31.7);
  for (let i = 0; i < 20; i++) bush(124, -30 + i * 5.2, 5.6, 3, 900 + i * 13.1);
  const im = new THREE.InstancedMesh(ico, M.leaf, blobs.length); im.castShadow = im.receiveShadow = true;
  blobs.forEach((b, i) => { _o.position.set(b[0], b[1], b[2]); _o.rotation.set(hash(i * 1.1) * 6, hash(i * 2.2) * 6, 0); _o.scale.setScalar(b[3]); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix);
    col.setRGB(0.16 * b[4], 0.33 * b[4], 0.1 * b[4]); im.setColorAt(i, col); });
  G.add(im);
  // coníferas (a la derecha, detrás)
  for (const [x, z, h, s] of [[160, -140, 150, 1], [188, -100, 120, 2], [214, -160, 160, 3], [176, -60, 95, 4]]) { const tr = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, h * 0.3, 8), M.bark); tr.position.set(x, h * 0.15, z); G.add(tr);
    for (let k = 0; k < 6; k++) { const y0 = h * (0.14 + k * 0.13), rr = h * (0.2 - k * 0.028); const c = new THREE.Mesh(new THREE.ConeGeometry(rr, h * 0.3, 18, 1), M.conifer); c.position.set(x, y0 + h * 0.15, z); c.rotation.y = hash(s * 9 + k) * 3; c.castShadow = true; c.receiveShadow = true; G.add(c); } }
}
// ---------- la casa del vecino (a la derecha): estuco claro, tejado gris a cuatro aguas
function buildNeighbour(G) {
  const M = HMAT, m = new THREE.MeshStandardMaterial({ map: M.stucco.map, bumpMap: M.stucco.bumpMap, bumpScale: 0.9, roughness: 0.93, color: 0xf0e6cf });
  hBox(G, 160, 0, -100, 290, 48, -12, m);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4, 1), new THREE.MeshStandardMaterial({ map: M.roof.map, bumpMap: M.roof.bumpMap, bumpScale: 2.2, roughness: 0.88, color: 0x9a9fa6 })); roof.rotation.y = Math.PI / 4; roof.scale.set(104, 26, 70); roof.position.set(225, 48 + 13, -56); roof.castShadow = true; G.add(roof);
  for (const x of [175, 205, 245, 270]) hWindow(G, x, 36, 14, 12, 'z', { z: -12 });
  for (const x of [175, 270]) hWindow(G, x, 14, 14, 12, 'z', { z: -12 });
  hBox(G, 214, 0, -12.4, 226, 22, -11.6, M.white, 20);
}
// ---------- el cielo: degradado, sol y nubes de algodón (fbm); dk = 1 lo oscurece (dentro de la cabeza)
const SKY_U = { sun: { value: SUN_DIR.clone() }, dk: { value: 0 }, env: { value: 0 } };
function skyMat() {
  return new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: SKY_U,
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: `#include <logdepthbuf_pars_fragment>
uniform vec3 sun; uniform float dk, env; varying vec3 vD;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0., w = 0.5; for (int i = 0; i < 6; i++) { a += w * n2(p); p = p * 2.07 + vec2(1.7, 9.2); w *= 0.5; } return a; }
void main(){
#include <logdepthbuf_fragment>
  vec3 d = normalize(vD); float e = d.y;
  vec3 zen = vec3(0.075, 0.2, 0.52), hor = vec3(0.5, 0.66, 0.86), c = mix(hor, zen, pow(clamp(e, 0., 1.), 0.6));
  c = mix(c, vec3(0.16, 0.17, 0.12), smoothstep(0.0, -0.08, e));
  float s = max(dot(d, sun), 0.); c += vec3(1.0, 0.86, 0.62) * (pow(s, 6.) * 0.22 + pow(s, 60.) * 0.6) + vec3(1.0, 0.95, 0.85) * pow(s, 2000.) * 30. * (1. - env);
  if (e > 0.01 && env < 0.5) { vec2 uv = d.xz / (e + 0.08) * 1.1; float cl = fbm(uv * 0.9 + vec2(3.1, 1.3)), cl2 = fbm(uv * 0.9 + vec2(3.1, 1.3) + sun.xz * 0.06);
    float k = smoothstep(0.5, 0.74, cl) * smoothstep(0.01, 0.12, e) * (1. - smoothstep(0.75, 0.98, e));
    vec3 cc = mix(vec3(0.55, 0.6, 0.7), vec3(1.25, 1.22, 1.15), clamp(0.5 + (cl - cl2) * 6., 0., 1.)); c = mix(c, cc, k * 0.92); }
  c = mix(c, vec3(0.004, 0.008, 0.02), dk);
  gl_FragColor = vec4(c, 1.); }` });
}
// el mundo de fuera: cielo, casa, luz del sol (con la sombra que sigue a la cámara), cielo de relleno y contraluz; y el entorno para los reflejos
function buildWorld() {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), skyMat()); sky.renderOrder = -2; sky.frustumCulled = false; scene.add(sky); S.sky = sky;
  { const es = new THREE.Scene(), m = skyMat(); m.uniforms = { sun: SKY_U.sun, dk: { value: 0 }, env: { value: 1 } }; es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), m));
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.0, 0.1, 100).texture; scene.environmentIntensity = 0.75; }
  S.house = buildHouse(); scene.add(S.house);
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.4); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.radius = 3; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xb9d4ff, 0x56603a, 0.55), rim = new THREE.DirectionalLight(0xdfe9ff, 1.3); scene.add(hemi, rim, rim.target);
  S.L = { sun, hemi, rim };
  scene.fog = new THREE.FogExp2(0xa9c2dc, 0.00022);
}
// la sombra del sol cubre lo que se ve: más ancha cuanto más lejos está la cámara
function sunAt(c, d, yaw) {
  const L = S.L, R = clamp(d * 0.62, 4.5, 260), sh = L.sun.shadow, cmr = sh.camera;
  L.sun.position.copy(c).addScaledVector(SUN_DIR, 900); L.sun.target.position.copy(c);
  cmr.left = cmr.bottom = -R; cmr.right = cmr.top = R; cmr.near = 900 - 3 * R - 60; cmr.far = 900 + 3 * R + 120; cmr.updateProjectionMatrix();
  sh.bias = -0.00006; sh.normalBias = R * 0.0016;
  L.rim.position.set(c.x + Math.sin(yaw + 2.6) * 50, c.y + 30, c.z + Math.cos(yaw + 2.6) * 50); L.rim.target.position.copy(c);
}
// ---------------------------------------------------------------- en el césped, delante de Homer: dos peanas con 100 figuritas cada una (comer rápido / despacio);
// a las que les da el «cerebro congelado» se les pone la cabeza azul hielo (27 de cada 100 frente a 13; BMJ 2002).
const ST = {};
const _o = new THREE.Object3D();
const softWhite = (c = 0xf7f6f3, r = 0.3) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, clearcoat: 0.8, clearcoatRoughness: 0.15 });
const PLAT_SP = 1.12, FIG_SC = 36;
function buildStations() {
  ST.plats = [-9.5, 9.5].map((x, k) => { const g = new THREE.Group(); g.position.set(x, GY, 20); scene.add(g);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.5, 0.9, 96), softWhite(0xf4f2ee, 0.4)); top.position.y = 0.45; top.receiveShadow = true; top.castShadow = true; g.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(7.25, 0.12, 8, 96), new THREE.MeshStandardMaterial({ color: k ? 0x2e9d57 : 0xd32f2f, roughness: 0.4, emissive: k ? 0x0d3a1f : 0x4a0c0c, emissiveIntensity: 0.6 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.92; g.add(rim);
    const figs = new THREE.InstancedMesh(studentGeo(false), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.45, clearcoat: 0.4 }), 100); figs.castShadow = true; figs.receiveShadow = true; figs.frustumCulled = false; g.add(figs);
    const pos = [], order = []; _o.position.set(0, 0, 0); _o.rotation.set(0, 0, 0); _o.scale.setScalar(0.0001); _o.updateMatrix();
    for (let i = 0; i < 100; i++) { pos.push(v3(((i % 10) - 4.5) * PLAT_SP, 0.9, (Math.floor(i / 10) - 4.5) * PLAT_SP)); order.push(i); figs.setColorAt(i, _clay); figs.setMatrixAt(i, _o.matrix); }
    order.sort((a, b) => hash(a * 7.3 + k * 13) - hash(b * 7.3 + k * 13)); g.userData = { figs, pos, order, n: k ? 13 : 27 }; g.visible = false; return g; });
}
const _ice = new THREE.Color(0x6fb2f2), _clay = new THREE.Color(0xefe9e1), _cc = new THREE.Color();
function stationsAt(t) {
  const vk = pop(t, K.comes8 - 0.35, 0.5) * (1 - win(t, K.truco9 + 0.1, 0.4)) * (1 - DK);
  ST.plats.forEach((g, k) => { g.visible = vk > 0.002; if (!g.visible) return; g.scale.setScalar(Math.max(0.0001, vk)); const U = g.userData, tf = k ? K.n13 - 0.15 : K.n27 - 0.15;
    for (let j = 0; j < 100; j++) { const i = U.order[j], p = U.pos[i], kk = pop(t, K.comes8 - 0.2 + i * 0.006, 0.3), fz = j < U.n ? clamp((t - tf - j * 0.022) / 0.25) : 0;
      _o.position.set(p.x, p.y + 1.2 * (1 - clamp(kk)), p.z); _o.rotation.set(0, (hash(i * 3.3) - 0.5) * 0.6, fz * 0.06 * Math.sin(t * 30 + i)); _o.scale.setScalar(Math.max(0.0001, FIG_SC * kk)); _o.updateMatrix(); U.figs.setMatrixAt(i, _o.matrix);
      _cc.copy(_clay).lerp(_ice, fz); U.figs.setColorAt(i, _cc); }
    U.figs.instanceMatrix.needsUpdate = true; U.figs.instanceColor.needsUpdate = true; });
}
// ---------------------------------------------------------------- cámara: plano de dron sobre la casa de Springfield que baja hasta Homer → al morder, se mete de golpe en la
// cabeza (el cerebro se congela; vuelta alrededor) → el paladar → se lanza dentro del nervio (primer plano de neuronas) → el cerebro con la alarma → el cuello y
// la sangre que sube → la arteria que se ensancha → el cráneo y las meninges → la frente → la arteria de 2012 → fuera, las peanas en el césped → dentro, el truco
// → fuera, Homer aliviado → el dron vuelve a subir (bucle con el primer fotograma).
let CKS = [];
const DR0 = [[38, 98, 262], [20, -4, -24], 45];
function buildCam() {
  const D = DR0, mt = macT();
  const A = [
    [-0.6, [33, 84, 228], [18, -4, -22], 44], [0.0, D[0], D[1], D[2]],
    [0.5, [24, 55, 150], [8, -3, -14], 42], [0.95, [10, 14, 62], [3, -5, -4], 38], [1.3, [-1.8, -0.4, 13.5], [0, -1.3, 0.2], 34], [T_HIT - 0.05, [-1.5, -0.45, 10.2], [0, -1.0, 0.3], 33],
    [T_HIT + 0.32, [1.0, 0.55, 4.6], [0, 0.45, -0.05], 34], [T_HIT + 0.8, [2.8, 0.85, 2.9], [0, 0.6, -0.12], 34], [3.2, [3.9, 0.8, 0.9], [0, 0.6, -0.12], 34], [4.05, [3.7, 0.45, -1.4], [0, 0.45, -0.12], 34],
    [K.helado3, [3.3, -0.25, 0.9], [0, -0.4, 0.3], 33], [K.paladar3, [2.6, -0.45, 0.75], [0, -0.52, 0.42], 32], [K.nervio3, [2.3, -0.2, 0.6], [0.2, -0.25, 0.35], 32], [mt[0] - 0.02, [0.95, -0.16, 0.44], [0.26, -0.18, 0.3], 30],
    [mt[1], [4.6, 0.5, 1.2], [0, 0.45, -0.15], 34], [K.sangre4, [4.4, -0.8, 0.6], [0.3, -0.8, -0.1], 34], [9.9, [4.0, -0.3, 0.6], [0.25, -0.25, -0.05], 33], [K.arteria4, [3.3, 0.45, 0.8], [0.05, 0.45, 0.15], 33],
    [K.ensancha4, [2.3, 0.62, 0.75], [0.02, 0.62, 0.3], 32], [K.segundos4 + 0.3, [2.25, 0.65, 0.7], [0.02, 0.64, 0.3], 32],
    [K.craneo5, [3.9, 1.4, -2.4], [0, 0.6, -0.15], 34], [K.presion5, [3.5, 1.0, 2.0], [0, 0.65, -0.12], 34], [K.capas5, [2.9, 0.95, 1.3], [0, 0.72, -0.12], 33], [K.esas5, [2.2, 0.85, 1.0], [0, 0.75, -0.1], 32], [K.duelen5 + 0.3, [2.15, 0.88, 0.9], [0, 0.76, -0.1], 32],
    [K.nervio6, [2.8, 0.2, 2.6], [0.15, 0.2, 0.15], 34], [K.frente6, [1.0, 0.6, 3.5], [0.05, 0.5, 0.5], 34], [K.ahi6, [0.9, 0.62, 3.4], [0.05, 0.5, 0.5], 34],
    [K.n2012, [3.6, 0.75, 0.6], [0, 0.65, 0.1], 34], [K.abre7, [2.6, 0.72, 0.65], [0, 0.68, 0.2], 33], [K.cierra7, [2.7, 0.72, 0.6], [0, 0.68, 0.2], 33],
    [K.cierra7 + 0.6, [4, 0, 14], [0, -2, 0], 36], [K.comes8 + 0.3, [0, 2, 78], [0, -9, 10], 36], [K.n13 + 0.3, [0.6, 1.6, 74], [0, -9, 10], 36],
    [K.truco9 + 0.5, [2.2, -0.2, 3.6], [0, -0.3, 0.3], 34], [K.medicos9, [2.7, -0.4, 0.8], [0, -0.52, 0.4], 32], [K.paladar9, [2.5, -0.5, 0.75], [0, -0.56, 0.42], 32], [K.calentarlo9 + 0.1, [2.6, -0.5, 0.8], [0, -0.55, 0.42], 32],
    [K.calentarlo9 + 0.75, [-2.0, -0.9, 9.0], [0, -1.1, 0.3], 34], [K.mandaselo10, [-2.4, -1.2, 10.5], [0, -1.4, 0.3], 34], [END - 1.5, [6, 6, 40], [2, -4, -5], 38],
    [END, D[0], D[1], D[2]], [END + 0.6, [33, 84, 228], [18, -4, -22], 44],
  ];
  CKS = [A];
}
// el primer plano de neuronas va con su propia cámara (en las coordenadas del grupo de neuronas)
function camAt(t) {
  if (macK(t) && S.nrn) { const [a, b] = macT(), c = neuronsCam(clamp((t - a) / (b - a))), g = S.nrn.group;
    const p = v3(c[0], c[1], c[2]).multiplyScalar(NRN_SC).add(g.position), l = v3(c[3], c[4], c[5]).multiplyScalar(NRN_SC).add(g.position); return { p, l, f: c[6] || 34, roll: 0 }; }
  const st = camKeys(t, CKS[0]);
  const u = t - T_HIT; if (u > 0 && u < 0.35) { const a = 0.012 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; }
  return st;
}
// el fotograma anterior (para el desenfoque de movimiento) no cruza un corte de plano
function prevT(t, dt) { const a = t - dt; return macK(a) !== macK(t) ? t : a; }
function flashAt(t) { let f = 0; const mt = macT(); for (const [t0, k] of [[T_HIT, 0.035], [mt[0], 0.06], [mt[1], 0.05], [K.n27, 0.012], [K.calentarlo9, 0.02]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t; centerAt(t, st); stationsAt(t);
  const c = st.l, yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), d = st.p.distanceTo(c);
  sunAt(c, d, yaw);
}
// ---------------------------------------------------------------- HUD: cabecera con el truco pendiente, pasos numerados y rótulos con línea guía. Fuera (día) va en tinta oscura con
// halo blanco; dentro de la cabeza (fondo oscuro) se pasa a texto claro con sombra oscura.
let INK = '#1C2430', GREY = '#5A6472', GOLD = '#C27A00', TEALc = '#0E8C86', REDc = '#D32F2F', GREEN = '#2E9D57', BLUE = '#1F6FD1', ICE = '#2F86D6', HUDD = false;
function hudPalette(dark) { HUDD = dark; if (dark) { INK = '#F2F5F8'; GREY = '#A9B4C2'; GOLD = '#FFC24A'; REDc = '#FF5A4E'; GREEN = '#7CF0A9'; ICE = '#8FD3FF'; }
  else { INK = '#1C2430'; GREY = '#5A6472'; GOLD = '#C27A00'; REDc = '#D32F2F'; GREEN = '#2E9D57'; ICE = '#2F86D6'; } }
function buildHudPlan() { HFONT = 'Inter'; HW = [900, 700]; }
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic'; hg.shadowColor = HUDD ? 'rgba(0,0,0,.9)' : 'rgba(255,255,255,.95)'; hg.shadowBlur = 12;
  hg.letterSpacing = '4px'; hfont(46); hg.fillStyle = INK; hg.textAlign = 'left'; hg.fillText('TU CEREBRO', 54, 142);
  hg.letterSpacing = '2px'; hfont(24, false); hg.fillStyle = GREY; hg.fillText('QUÉ PASA CUANDO TE «CONGELA» UN HELADO', 56, 180);
  hg.fillStyle = HUDD ? 'rgba(240,245,250,.25)' : 'rgba(28,36,48,.22)'; hg.fillRect(56, 196, 968, 2);
  hg.textAlign = 'right'; hg.letterSpacing = '2px';
  hfont(18, false); hg.fillStyle = GREY; hg.fillText('ASÍ FUNCIONA', 1024, 112);
  hfont(32); hg.fillStyle = ICE; hg.fillText('TU CUERPO', 1024, 148);
  hfont(18, false); hg.fillStyle = GREY; hg.fillText('POR DENTRO', 1024, 178);
  const mk = win(t, K.final2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = 'EL TRUCO PARA QUITARLO · ???', col = REDc, blink = true;
    if (t > K.truco9) { txt = 'EL TRUCO: LA LENGUA EN EL PALADAR'; col = GREEN; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = mk * (on ? 1 : 0.25); hfont(20); hg.letterSpacing = '2px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.fillStyle = HUDD ? 'rgba(8,12,20,.72)' : 'rgba(255,255,255,.75)'; rr(hg, x0, y - 26, w, 40, 8); hg.fill(); hg.strokeStyle = col; hg.lineWidth = 2; rr(hg, x0, y - 26, w, 40, 8); hg.stroke();
    hg.fillStyle = col; hg.fillText(txt, x1 - 17, y + 1);
  }
  hg.restore();
}
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function labW(P, txt, sub, k, opt) { if (k <= 0.01 || !P.ok) return; callout(P, txt, sub, k, { size: 27, subSize: 20, bg: true, light: !HUDD, subCol: GREY, ...opt }); }
const hal = n => HUDD ? { dark: n } : { halo: n };
const big = (txt, y, size, col, k, o = {}) => bigText(txt, W / 2, y, size, col, k, { type: false, ...hal(22), ls: Math.round(size * 0.04), ...o });
const small = (txt, y, size, col, k, o = {}) => bigText(txt, W / 2, y, size, col, k, { ...hal(14), ls: 2, ...o });
function stepBadge(n, x, y, k, col) { if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k * 2); const r = 30 * (0.6 + 0.4 * eo(clamp(k * 1.5)));
  hg.fillStyle = col; hg.beginPath(); hg.arc(x, y, r, 0, 7); hg.fill(); hg.fillStyle = '#fff'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(34); hg.letterSpacing = '0px'; hg.fillText(String(n), x, y + 2); hg.restore(); }
function step(n, txt, col, a, Y) { hg.save(); hfont(54); hg.letterSpacing = '2px'; const w = hg.measureText(txt).width; hg.restore(); stepBadge(n, W / 2 - w / 2 - 48, Y, a, col); bigText(txt, W / 2 + 22, Y, 54, INK, a, { type: false, ...hal(20), ls: 2 }); }
// la gráfica del Doppler (2012): el flujo en la arteria sube cuando empieza el dolor y baja cuando se va
function doppler(t, a) {
  const x0 = 70, x1 = 1010, y0 = 1080, y1 = 1380, t0 = K.midieron7 - 0.2, t2 = K.cierra7 + 0.6, k = clamp((t - t0) / (t2 - t0)), A = (K.empieza7 - 0.1 - t0) / (t2 - t0), B = (K.cierra7 - 0.1 - t0) / (t2 - t0);
  const val = u => u < A ? 0.2 : u < A + 0.1 ? 0.2 + 0.62 * eio((u - A) / 0.1) : u < B ? 0.82 + 0.025 * Math.sin(u * 70) : u < B + 0.12 ? 0.82 - 0.58 * eio((u - B) / 0.12) : 0.24;
  hg.save(); hg.globalAlpha = clamp(a * 2); hg.fillStyle = HUDD ? 'rgba(8,12,22,.84)' : 'rgba(255,255,255,.92)'; hg.shadowColor = HUDD ? 'rgba(0,0,0,.5)' : 'rgba(60,40,30,.18)'; hg.shadowBlur = 18; rr(hg, x0 - 20, y0 - 70, x1 - x0 + 40, y1 - y0 + 100, 18); hg.fill(); hg.shadowBlur = 0;
  hfont(24); hg.letterSpacing = '2px'; hg.fillStyle = GREY; hg.textAlign = 'left'; hg.textBaseline = 'alphabetic'; hg.fillText('FLUJO EN LA ARTERIA DEL CEREBRO · DOPPLER', x0, y0 - 30);
  const gx0 = x0, gx1 = x1, gy0 = y1 - 10, gy1 = y0 + 20;
  hg.strokeStyle = HUDD ? 'rgba(240,245,250,.14)' : 'rgba(28,36,48,.12)'; hg.lineWidth = 2; for (let i = 0; i <= 3; i++) { const y = gy0 + (gy1 - gy0) * i / 3; hg.beginPath(); hg.moveTo(gx0, y); hg.lineTo(gx1, y); hg.stroke(); }
  if (k > A) { hg.fillStyle = HUDD ? 'rgba(255,90,78,.18)' : 'rgba(211,47,47,.12)'; hg.fillRect(gx0 + (gx1 - gx0) * A, gy1 - 10, (gx1 - gx0) * (Math.min(k, B + 0.06) - A), gy0 - gy1 + 10); }
  hg.strokeStyle = REDc; hg.lineWidth = 7; hg.lineJoin = 'round'; hg.beginPath(); for (let i = 0; i <= 160; i++) { const u = i / 160 * k, x = gx0 + (gx1 - gx0) * u, y = gy0 + (gy1 - gy0) * val(u); i ? hg.lineTo(x, y) : hg.moveTo(x, y); } hg.stroke();
  hg.fillStyle = INK; hg.beginPath(); hg.arc(gx0 + (gx1 - gx0) * k, gy0 + (gy1 - gy0) * val(k), 9, 0, 7); hg.fill();
  hfont(34); hg.textAlign = 'center'; if (k > A + 0.05) { hg.fillStyle = REDc; hg.fillText('DOLOR', gx0 + (gx1 - gx0) * (A + B) / 2, gy1 + 30); }
  if (k > B + 0.1) { hg.fillStyle = GREEN; hg.fillText('SE VA', gx0 + (gx1 - gx0) * Math.min(0.9, B + 0.2), gy0 - 30); }
  hg.restore();
}
const HL = (x, y, z) => { const h = S.hero.userData.head; return proj(wpo(h, x, y, z)); };
function hudAt(t) {
  hudPalette(DK > 0.5); hudBegin(); hdr(t);
  const IN = DK > 0.6 && !MAC;
  const Y = 1440;
  // L1–L2: ¡cerebro congelado!
  { const a = cw(t, 0.45, K.final2 - 0.32); if (a > 0.01) { big('¡CEREBRO CONGELADO!', Y, 74, ICE, a); small('¿POR QUÉ DUELE TANTO?', Y + 70, 28, INK, a); } }
  { const a = cw(t, K.final2 - 0.05, K.helado3 - 0.3); if (a > 0.01) { big('AL FINAL, EL TRUCO', Y, 70, INK, a); small('PARA QUITÁRTELO', Y + 66, 28, GREEN, a); } }
  // L3: 1 el frío toca el paladar · el nervio da la alarma
  { const a = cw(t, K.helado3 - 0.05, K.cuerpo4 - 0.32); if (a > 0.01) step(1, t < K.nervio3 - 0.1 ? 'EL FRÍO TOCA EL PALADAR' : 'UN NERVIO DA LA ALARMA', ICE, a, Y);
    if (IN) { labW(HL(0.05, -0.53, 0.45), 'PALADAR', null, cw(t, K.paladar3 - 0.05, K.cuerpo4 - 0.3), { dx: -150, dy: 150, color: ICE });
      labW(HL(0.27, -0.12, 0.28), 'NERVIO TRIGÉMINO', 'LLEVA LA ALARMA', cw(t, K.nervio3, macT()[0] - 0.05), { dx: 150, dy: -160, color: GOLD }); }
    if (MAC) labW({ x: 540, y: 960, ok: true }, 'NEURONAS DEL NERVIO', 'LA SEÑAL SALTA DE UNA A OTRA', cw(t, macT()[0] + 0.1, macT()[1] - 0.05), { dx: 130, dy: -330, color: GOLD }); }
  // L4: 2 llega sangre de golpe · la arteria se ensancha
  { const a = cw(t, K.cuerpo4 - 0.05, K.cuerpo4 + 2.2); if (a > 0.01) step(2, 'LLEGA SANGRE CALIENTE', REDc, a, Y);
    const b = cw(t, K.arteria4 - 0.05, K.craneo5 - 0.32); if (b > 0.01) { big('LA ARTERIA SE ENSANCHA', Y, 62, REDc, b); small('EN SEGUNDOS', Y + 64, 28, INK, cw(t, K.ensancha4, K.craneo5 - 0.32)); }
    if (IN) labW(HL(0.03, 0.62, 0.5), 'ARTERIA CEREBRAL ANTERIOR', null, cw(t, K.arteria4 + 0.1, K.craneo5 - 0.3), { dx: 120, dy: -170, color: REDc }); }
  // L5: 3 el cráneo no se estira · las capas que envuelven el cerebro sí duelen (el cerebro no)
  { const a = cw(t, K.craneo5 - 0.05, K.capas5 - 0.32); if (a > 0.01) step(3, 'EL CRÁNEO NO SE ESTIRA', INK, a, Y);
    const b = cw(t, K.capas5 - 0.05, K.nervio6 - 0.32); if (b > 0.01) { big('LAS MENINGES SÍ DUELEN', Y, 62, REDc, b); small('EL CEREBRO EN SÍ NO SIENTE DOLOR', Y + 64, 28, INK, cw(t, K.cerebro5 - 0.1, K.nervio6 - 0.32)); }
    if (IN) { labW(HL(0.0, 1.3, -0.45), 'CRÁNEO', 'NO CEDE', cw(t, K.craneo5, K.capas5 - 0.2), { dx: 120, dy: -120, color: INK });
      labW(HL(0.0, 1.16, -0.35), 'MENINGES', 'SÍ TIENEN SENSORES DE DOLOR', cw(t, K.capas5 + 0.1, K.nervio6 - 0.3), { dx: 130, dy: -120, color: REDc }); } }
  // L6: 4 el nervio también llega a la frente
  { const a = cw(t, K.nervio6 - 0.05, K.n2012 - 0.32); if (a > 0.01) step(4, t < K.eso6 - 0.1 ? 'EL NERVIO LLEGA A LA FRENTE' : 'POR ESO TE DUELE AHÍ', GOLD, a, Y);
    if (IN) labW(HL(0.0, 0.55, 0.74), 'LA FRENTE', null, cw(t, K.frente6, K.n2012 - 0.3), { dx: -120, dy: -150, color: REDc }); }
  // L7: 2012 · Harvard · el dolor va con la arteria
  { const a = cw(t, K.n2012 - 0.05, K.comes8 - 0.32); if (a > 0.01) { doppler(t, a); big('2012 · HARVARD', 1480, 64, INK, cw(t, K.n2012 - 0.05, K.dolor7 - 0.32));
      const b = cw(t, K.dolor7 - 0.05, K.comes8 - 0.32); if (b > 0.01) big(t < K.va7 - 0.05 ? 'ARTERIA ABIERTA = DOLOR' : 'SE CIERRA = SE VA', 1480, 52, t < K.va7 - 0.05 ? REDc : GREEN, b); } }
  // L8: comer rápido: el doble (27 de cada 100 frente a 13)
  { const a = cw(t, K.comes8 - 0.05, K.truco9 - 0.32); if (a > 0.01) {
      for (const [k, txt, col, n, t1] of [[0, 'RÁPIDO', REDc, 27, K.n27], [1, 'DESPACIO', GREEN, 13, K.n13]]) { const g = ST.plats[k]; if (!g.visible) continue; const P = proj(wpo(g, 0, 4.2, -3.5)); if (!P.ok) continue;
        bigText(txt, P.x, P.y - 110, 42, col, a, { type: false, halo: 16, ls: 1 }); const c = Math.round(n * clamp((t - t1 + 0.15) / 0.6)); if (t > t1 - 0.15) bigText(c + ' DE 100', P.x, P.y - 60, 36, ICE, a, { type: false, halo: 14, ls: 1 }); }
      big(t < K.n27 - 0.1 ? 'SI COMES RÁPIDO…' : 'EL DOBLE', Y + 40, 72, t < K.n27 - 0.1 ? INK : REDc, a); small('ESTUDIO CON 145 ALUMNOS · BMJ, 2002', Y + 108, 24, GREY, cw(t, K.n27 - 0.1, K.truco9 - 0.32)); } }
  // L9: el truco
  { const a = cw(t, K.truco9 - 0.05, K.calentarlo9 + 0.6); if (a > 0.01) { big('EL TRUCO', Y - 20, 80, GREEN, a); small(t < K.aprieta9 - 0.1 ? 'EL QUE RECOMIENDAN LOS MÉDICOS' : 'LA LENGUA CONTRA EL PALADAR', Y + 50, 30, INK, a); }
    if (IN) labW(HL(0.05, -0.7, 0.4), 'LENGUA', 'CALIENTA EL PALADAR', cw(t, K.lengua9, K.calentarlo9 - 0.2), { dx: -150, dy: 160, color: GOLD }); }
  // L10: ¿muerdes o chupas? · mándaselo
  { const a = cw(t, K.tu10 - 0.05, K.mandaselo10 - 0.3); if (a > 0.01) { big('¿MUERDES EL HELADO', Y - 10, 60, INK, a); big('O LO CHUPAS?', Y + 60, 60, ICE, cw(t, K.chupas10 - 0.1, K.mandaselo10 - 0.3)); }
    const m = cw(t, K.mandaselo10 - 0.05, END - 0.6); if (m > 0.01) { small('MÁNDASELO A', Y - 10, 40, INK, m, { type: false }); big('QUIEN LO MUERDE', Y + 56, 64, REDc, cw(t, K.muerde10 - 0.15, END - 0.6)); } }
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
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    duele1: atL(1, 'duele'), cerebro1: atL(1, 'cerebro'), comer1: atL(1, 'comer'), helado1: atL(1, 'helado'),
    final2: atL(2, 'final'), truco2: atL(2, 'truco'), quitartelo2: atL(2, 'quitartelo'),
    helado3: atL(3, 'helado'), enfria3: atL(3, 'enfria'), paladar3: atL(3, 'paladar'), nervio3: atL(3, 'nervio'), alarma3: atL(3, 'alarma'),
    cuerpo4: atL(4, 'cuerpo'), manda4: atL(4, 'manda'), sangre4: atL(4, 'sangre'), caliente4: atL(4, 'caliente'), golpe4: atL(4, 'golpe'), arteria4: atL(4, 'arteria'), cerebro4: atL(4, 'cerebro'), ensancha4: atL(4, 'ensancha'), segundos4: atL(4, 'segundos'),
    craneo5: atL(5, 'craneo'), estira5: atL(5, 'estira'), presion5: atL(5, 'presion'), aprieta5: atL(5, 'aprieta'), capas5: atL(5, 'capas'), envuelven5: atL(5, 'envuelven'), cerebro5: atL(5, 'cerebro'), esas5: atL(5, 'esas'), duelen5: atL(5, 'duelen'),
    nervio6: atL(6, 'nervio'), avisa6: atL(6, 'avisa'), frente6: atL(6, 'frente'), eso6: atL(6, '=eso'), duele6: atL(6, 'duele'), ahi6: atL(6, 'ahi'),
    n2012: atL(7, '=2012'), midieron7: atL(7, 'midieron'), harvard7: atL(7, 'harvard'), dolor7: atL(7, 'dolor'), empieza7: atL(7, 'empieza'), arteria7: atL(7, 'arteria'), abre7: atL(7, 'abre'), va7: atL(7, '=va'), cierra7: atL(7, 'cierra'),
    comes8: atL(8, 'comes'), rapido8: atL(8, 'rapido'), doble8: atL(8, 'doble'), n27: atL(8, '=27'), cada8: atL(8, 'cada'), n100: atL(8, '=100'), frente8: atL(8, 'frente'), n13: atL(8, '=13'),
    truco9: atL(9, 'truco'), medicos9: atL(9, 'medicos'), aprieta9: atL(9, 'aprieta'), lengua9: atL(9, 'lengua'), paladar9: atL(9, 'paladar'), calentarlo9: atL(9, 'calentarlo'),
    tu10: atL(10, '=tu'), muerdes10: atL(10, 'muerdes'), helado10: atL(10, 'helado'), chupas10: atL(10, 'chupas'), mandaselo10: atL(10, 'mandaselo'), muerde10: atL(10, 'muerde'),
  };

  T_HIT = K.comer1 + 0.08;
  mats(); buildMats(); S.flow = [];
  buildWorld(); cam.far = 30000; cam.updateProjectionMatrix();
  { const pm = new THREE.PMREMGenerator(renderer); S.envRoom = pm.fromScene(new RoomEnvironment(), 0.04).texture; S.envSky = scene.environment; }
  buildCenter(); buildStations();
  post.uniforms.ca.value = 0.25; post.uniforms.vig.value = 0.16; post.uniforms.bloom.value = 0.35;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s); window.glLost = () => renderer.getContext().isContextLost();
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
