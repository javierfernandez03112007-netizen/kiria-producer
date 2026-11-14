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
// ---------------------------------------------------------------- el centro: una mano derecha de piel, vista por el dorso, sobre el fondo claro. El índice lleva un corte
// que se abre (la piel de arriba desaparece) y deja ver el dedo por dentro: al tirar, la articulación del medio se separa, el gas del líquido se junta y nace
// la burbuja. La mano izquierda (Unger) entra en la frase 7. Al final todo vuelve al primer fotograma (bucle).
const T_HIT = 0.3;
const flexAt = (t, tc, A = 0.95) => { const u = t - tc; if (u < -0.26 || u > 0.62) return 0; return u < 0 ? A * eio(clamp((u + 0.26) / 0.26)) : u < 0.14 ? A : A * (1 - eio(clamp((u - 0.14) / 0.48))); };
const CUT = { y0: 0.17, y1: 0.69, xm: 0.106, open: -0.01, closed: 0.13 };
const qflex = (t, tc, A = 0.6) => { const u = t - tc; if (u < -0.1 || u > 0.25) return 0; return u < 0 ? A * eio((u + 0.1) / 0.1) : u < 0.05 ? A : A * (1 - eio((u - 0.05) / 0.2)); };
const popk = (t, t0) => { const u = t - t0; if (u <= 0) return 0; return u < 0.09 ? eo(u / 0.09) * 1.15 : 1 + 0.15 * Math.exp(-(u - 0.09) * 9) * Math.cos((u - 0.09) * 32); };
const HAND_L = -1.62;
function buildCenter() {
  const Z = new THREE.Group(); scene.add(Z); S.ctr = Z;
  S.hand = realHand({ cut: true }); Z.add(S.hand);
  S.handL = realHand({ cut: true, left: true }); S.handL.position.x = HAND_L; Z.add(S.handL);
  // destello y onda del crujido dentro de la articulación
  const flT = canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(160,220,255,.85)'); gr.addColorStop(0.65, 'rgba(60,160,240,.3)'); gr.addColorStop(1, 'rgba(60,160,240,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const rgT = canvasTex(256, 256, (c, w, h) => { c.strokeStyle = 'rgba(40,140,230,.95)'; c.lineWidth = 6; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 8, 0, 7); c.stroke(); });
  S.jf = new THREE.Sprite(new THREE.SpriteMaterial({ map: flT, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); S.jf.renderOrder = 11; scene.add(S.jf);
  S.jr = new THREE.Sprite(new THREE.SpriteMaterial({ map: rgT, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); S.jr.renderOrder = 11; scene.add(S.jr);
}
// el corte del índice: 1 = abierto
function cutK(t) {
  let k = 1 - win(t, 0.55, 0.7);
  k = Math.max(k, win(t, K.cada3 - 0.3, 0.65) * (1 - win(t, K.respuesta7 - 0.62, 0.5)));
  return Math.max(k, win(t, END - 1.05, 0.75));
}
// cuánto se separa la articulación del medio al tirar del dedo
function pullAt(t) {
  let p = 0.012 * eio(clamp(t / 0.3)) * (1 - win(t, 0.9, 0.5));
  const a = eio(clamp((t - (K.tirar3 - 0.05)) / 0.6)), b = t > K.golpe3 ? 0.007 * (1 - Math.exp(-(t - K.golpe3) * 18)) : 0;
  p += (0.013 * a + b) * (1 - win(t, K.respuesta7 - 0.62, 0.5));
  p += 0.006 * Math.sin(Math.PI * clamp((t - (K.crujir6 - 0.2)) / 0.7));       // vuelve a tirar (no cruje)
  return p;
}
// tamaño de la burbuja (1 = recién nacida)
function bubAt(t) {
  const a = popk(t, T_HIT) * (1 - win(t, 1.0, 0.4));
  const b = popk(t, K.golpe3) * (1 - 0.72 * eio(clamp((t - K.durar6) / (K.enseguida6 + 0.4 - K.durar6)))) * (1 - win(t, K.respuesta7 - 0.62, 0.45));
  return Math.max(a, b);
}
const _jw = new THREE.Vector3(), _q0 = new THREE.Quaternion();
function jointAt(h, t, pull, bk, dotK, conv, shake, grow = 0) {
  const F = h.userData.fingers[0], g = GAP + pull, r = F.r;
  F.fluid.scale.y = g * 1.55; F.fluid.position.y = -pull / 2;
  F.bub.visible = bk > 0.003; F.bub.position.set(0, -pull / 2, 0); F.bub.scale.set(r * 0.33 * bk, g * 0.43 * Math.min(1, bk), r * 0.27 * bk);
  F.dots.visible = dotK > 0.01;
  if (F.dots.visible) { for (let i = 0; i < F.dp.length; i++) { const p = F.dp[i], j = shake * 0.0022;
      _o.position.set(p.x * (1 - conv) + Math.sin(t * 37 + i) * j, (p.y * (g / GAP) - pull / 2) * (1 - conv) - pull / 2 * conv + Math.cos(t * 41 + i * 2) * j, p.z * (1 - conv));
      _o.rotation.set(0, 0, 0); _o.scale.setScalar(Math.max(0.00001, F.dr[i] * dotK * (1 + 0.7 * grow) * (1 - 0.65 * conv))); _o.updateMatrix(); F.dots.setMatrixAt(i, _o.matrix); }
    F.dots.instanceMatrix.needsUpdate = true; }
}
// crujido de un nudillo (destello + onda) en las marcas de la mano
function knuckleFx(h, t, times, s = 1) {
  h.userData.fx.forEach((f, i) => { let k = 0, ku = 9; for (const tc of times[i] || []) { const u = t - tc; if (u > 0 && u < 0.6) { k = Math.max(k, Math.exp(-u * 8)); ku = Math.min(ku, u); } }
    f.flash.scale.setScalar(Math.max(0.0001, 0.22 * s * k)); f.flash.material.opacity = Math.min(1, k * 1.4);
    const rk = ku < 0.55 ? ku / 0.55 : 1; f.ring.scale.setScalar(rk < 1 ? (0.06 + 0.3 * eo(rk)) * s : 0.0001); f.ring.material.opacity = rk < 1 ? (1 - rk) * 0.9 : 0; });
}
function centerAt(t, st) {
  const H = S.hand, U = H.userData;
  H.rotation.y = 0.035 * Math.sin(2 * Math.PI * t / END);
  // crujidos: el principio (tras el del índice por dentro), el «50 años», la frase 9
  const T1 = [[1.72], [], [0.64], [0.98], [1.34]];
  const cyc = []; if (t > K.medico1 - 0.1 && t < K.tenian2) { const c0 = K.medico1 + 0.05; for (let n = 0; n < 5; n++) for (let i = 1; i <= 4; i++) { (cyc[i] = cyc[i] || []).push(c0 + n * 0.5 + (i - 1) * 0.08); } }
  const XC = i => K.mandaselo9 + 0.15 + (i - 1) * 0.14;
  const times = [0, 1, 2, 3, 4].map(i => [...T1[i], ...(cyc[i] || []), ...(i >= 1 ? [XC(i)] : [K.mandaselo9 + 0.8])]);
  const ang = [0, 1, 2, 3, 4].map(i => { let a = 0; for (const tc of T1[i]) a = Math.max(a, flexAt(t, tc)); for (const tc of cyc[i] || []) a = Math.max(a, qflex(t, tc, 0.55)); for (const tc of i >= 1 ? [XC(i)] : [K.mandaselo9 + 0.8]) a = Math.max(a, flexAt(t, tc)); return a; });
  const pull = pullAt(t); handPose2(H, ang, [0, pull]);
  knuckleFx(H, t, times, t > K.medico1 - 0.2 && t < K.tenian2 ? 0.6 : 1);
  // la «artritis» del mito: rojez en los nudillos
  const rk = win(t, K.artritis1 - 0.1, 0.35) * (1 - win(t, K.tenian2 - 0.2, 0.5));
  U.fx.forEach((f, i) => { f.red.scale.setScalar(Math.max(0.0001, (i ? 0.3 : 0.24) * rk * (1 + 0.08 * Math.sin(t * 7 + i)))); f.red.material.opacity = rk * 0.75; });
  // el corte y lo que pasa dentro de la articulación del medio
  const ck = cutK(t); cutUpdate(H, lerp(CUT.closed, CUT.open, ck), CUT.y0, CUT.y1, CUT.xm);
  const bk = bubAt(t);
  const dotK = Math.max(1 - win(t, 0.24, 0.07), win(t, K.liquido3 - 0.1, 0.4) * (1 - win(t, K.golpe3 - 0.04, 0.06)), win(t, END - 1.0, 0.5));
  const conv = Math.max(t < 2 ? eio(clamp((t - 0.06) / 0.24)) : 0, eio(clamp((t - K.gas3) / (K.golpe3 - K.gas3))));
  const shake = win(t, K.presion3 - 0.1, 0.3) * (1 - win(t, K.golpe3 - 0.1, 0.1));
  jointAt(H, t, pull, bk, dotK, conv, shake, win(t, K.presion3 - 0.05, 0.8) * (1 - win(t, K.golpe3 - 0.05, 0.1)));
  const F = U.fingers[0];
  F.cap.material.opacity = 0.38 + 0.3 * env(t, K.capsula3 - 0.05, K.liquido3 + 0.2, 0.25, 0.4);
  F.fluid.material.emissiveIntensity = 0.35 + 0.6 * env(t, K.liquido3 - 0.05, K.tirar3 + 0.1, 0.25, 0.4);
  // destello y onda en la articulación al nacer la burbuja
  F.bub.getWorldPosition(_jw); S.jf.position.copy(_jw); S.jr.position.copy(_jw);
  let fk = 0, ru = 9; for (const tc of [T_HIT, K.golpe3]) { const u = t - tc; if (u > 0 && u < 0.7) { fk = Math.max(fk, Math.exp(-u * 7)); ru = Math.min(ru, u); } }
  S.jf.scale.setScalar(Math.max(0.0001, 0.11 * fk)); S.jf.material.opacity = Math.min(1, fk * 1.3);
  const rr3 = ru < 0.6 ? ru / 0.6 : 1; S.jr.scale.setScalar(rr3 < 1 ? 0.03 + 0.16 * eo(rr3) : 0.0001); S.jr.material.opacity = rr3 < 1 ? (1 - rr3) * 0.9 : 0;
  // la mano izquierda de Unger: entra en la frase 7, cruje una y otra vez; en la 8 se abren los dos índices (sin artritis)
  const L = S.handL, lv = t > K.respuesta7 - 0.4 && t < K.mandaselo9; L.visible = lv;
  if (lv) { const e = eio(clamp((t - (K.respuesta7 - 0.3)) / 0.9)) * (1 - eio(clamp((t - (K.tu9 - 0.1)) / 0.9)));
    L.position.set(lerp(HAND_L - 2.2, HAND_L, e), 0, 0); L.rotation.y = -0.035 * Math.sin(2 * Math.PI * t / END);
    const P7 = 0.7, cy = t > K.crujio7 - 0.3 && t < K.anos7 + 0.4, ph = (t - (K.crujio7 - 0.3)) / P7, u = ((ph % 1) + 1) % 1 * P7, off = i => i ? 0.1 + (i - 1) * 0.06 : 0.36;
    const la = [0, 1, 2, 3, 4].map(i => cy ? qflex(u, off(i), 0.75) : 0); handPose2(L, la, []);
    const lt = [0, 1, 2, 3, 4].map(i => { if (!cy) return []; const c0 = Math.floor(ph) * P7 + (K.crujio7 - 0.3) + off(i); return [c0, c0 - P7]; });
    knuckleFx(L, t, lt, 0.8);
    const lk = win(t, K.ninguna8 - 0.1, 0.6) * (1 - win(t, K.ig8 + 0.3, 0.6)); cutUpdate(L, lerp(CUT.closed, CUT.open, lk), CUT.y0, CUT.y1, CUT.xm);
    jointAt(L, t, 0, 0, 0, 0, 0);
  }
  // en la frase 8 también se abre el índice derecho (los dos sanos)
  if (t > K.ninguna8 - 0.2 && t < K.ig8 + 1.0) { const lk = win(t, K.ninguna8 - 0.1, 0.6) * (1 - win(t, K.ig8 + 0.3, 0.6)); cutUpdate(H, lerp(CUT.closed, CUT.open, Math.max(ck, lk)), CUT.y0, CUT.y1, CUT.xm); }
}
// ---------------------------------------------------------------- objetos alrededor de la mano (estilo ilustración: blanco brillante y suave): el anillo de la resonancia y
// su pantalla (L4), el manómetro y la flecha de tirar (L3), los dos círculos del debate (L5), el reloj de 20 minutos (L6) y, en la 8, una peana blanca
// con el Ig Nobel y las 215 figuritas.
const ST = {};
const _o = new THREE.Object3D();
const softWhite = (c = 0xf7f6f3, r = 0.3) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, clearcoat: 0.8, clearcoatRoughness: 0.15 });
function mriRing() {
  const g = new THREE.Group(), wm = softWhite();
  const prof = [[0.15, 0.0], [0.152, -0.05], [0.17, -0.075], [0.25, -0.08], [0.272, -0.065], [0.28, -0.03], [0.28, 0.03], [0.272, 0.065], [0.25, 0.08], [0.17, 0.075], [0.152, 0.05], [0.15, 0.0]];
  const body = lathe(prof, 96, wm); g.add(body);
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.151, 0.151, 0.1, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.5, side: THREE.BackSide })); g.add(bore);
  const strip = new THREE.Mesh(new THREE.TorusGeometry(0.281, 0.006, 8, 96), new THREE.MeshStandardMaterial({ color: 0x2f8cff, emissive: 0x2f8cff, emissiveIntensity: 1.6 })); strip.rotation.x = Math.PI / 2; g.add(strip);
  const glow = new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.004, 8, 96), new THREE.MeshStandardMaterial({ color: 0x9fd2ff, emissive: 0x6fbaff, emissiveIntensity: 1.4 })); glow.rotation.x = Math.PI / 2; glow.position.y = 0.05; g.add(glow);
  g.userData = { strip, glow }; return g;
}
function mriPanel() {
  const tex = canvasTex(720, 880, () => {}); let lk = -1;
  const g = new THREE.Group(); const fr = rbox(0.46, 0.56, 0.026, softWhite(), 0.04); g.add(fr);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.414, 0.506), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.z = 0.0135; g.add(scr);
  g.userData.draw = k => { k = Math.round(k * 60) / 60; if (k === lk) return; lk = k; const c = tex.userData.g, w = 720, h = 880; c.fillStyle = '#05070a'; c.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2 + 30, gap = 22 + 22 * clamp(k * 1.6);
    const tis = c.createRadialGradient(cx, cy, 40, cx, cy, 330); tis.addColorStop(0, 'rgba(150,154,160,.75)'); tis.addColorStop(1, 'rgba(90,94,100,.35)'); c.fillStyle = tis; c.beginPath(); c.ellipse(cx, cy, 170, 400, 0, 0, 7); c.fill();
    c.fillStyle = '#dfe3e8'; c.beginPath(); c.ellipse(cx, cy + 210 + gap / 2, 72, 190, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(cx, cy - 215 - gap / 2, 78, 200, 0, 0, 7); c.fill();
    c.fillStyle = '#b4bac2'; c.beginPath(); c.ellipse(cx, cy - 38 - gap / 2, 86, 44, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(cx, cy + 40 + gap / 2, 82, 40, 0, 0, 7); c.fill();
    if (k > 0.3) { const r = 36 * eo(clamp((k - 0.3) / 0.25)); c.fillStyle = '#000'; c.beginPath(); c.ellipse(cx, cy, r * 1.7, r, 0, 0, 7); c.fill(); }
    c.fillStyle = '#8b939e'; c.font = '700 30px Inter'; c.textAlign = 'left'; c.fillText('RESONANCIA · DEDO', 30, 52); c.textAlign = 'right'; c.fillStyle = '#ffffff'; c.font = '900 40px Inter'; c.fillText((0.31 * clamp(k)).toFixed(2).replace('.', ',') + ' s', w - 30, 56);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(30, h - 46, w - 60, 8); c.fillStyle = '#4fa3ff'; c.fillRect(30, h - 46, (w - 60) * clamp(k), 8);
    tex.needsUpdate = true; };
  g.userData.draw(0); return g;
}
function dialTex(draw) { return canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.fill(); draw(c, w, h); }); }
function dial(r, tex) {
  const g = new THREE.Group(); const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.07, 16, 72), softWhite(0xeeeeec, 0.25)); g.add(rim);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.12, 72), softWhite(0xeeeeec)); back.rotation.x = Math.PI / 2; back.position.z = -r * 0.06; g.add(back);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.98, 72), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 })); face.position.z = 0.002; g.add(face);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(r, 72), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.02, clearcoat: 1, depthWrite: false })); glass.position.z = r * 0.05; g.add(glass);
  return g;
}
function gaugeSoft() {
  const tex = dialTex((c, w, h) => { const cx = w / 2, cy = h / 2;
    for (let i = 0; i <= 40; i++) { const a = Math.PI * (0.75 + 1.5 * i / 40), L = i % 5 ? 14 : 28; c.strokeStyle = '#2a3340'; c.lineWidth = i % 5 ? 3 : 6; c.beginPath(); c.moveTo(cx + Math.cos(a) * 206, cy + Math.sin(a) * 206); c.lineTo(cx + Math.cos(a) * (206 - L), cy + Math.sin(a) * (206 - L)); c.stroke(); }
    const arc = (a0, a1, col) => { c.strokeStyle = col; c.lineWidth = 18; c.beginPath(); c.arc(cx, cy, 225, Math.PI * (0.75 + 1.5 * a0), Math.PI * (0.75 + 1.5 * a1)); c.stroke(); };
    arc(0, 0.3, '#e04848'); arc(0.3, 0.7, '#f2b33d'); arc(0.7, 1, '#3c9b62');
    c.fillStyle = '#2a3340'; c.textAlign = 'center'; c.font = '900 50px Inter'; c.fillText('PRESIÓN', cx, cy + 120); c.font = '700 30px Inter'; c.fillText('BAJA', cx - 128, cy + 196); c.fillText('ALTA', cx + 128, cy + 196); });
  const g = dial(0.1, tex); const nd = new THREE.Group(); nd.position.z = 0.006; const n = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.08, 0.003).translate(0, 0.032, 0), new THREE.MeshStandardMaterial({ color: 0xd62f2f, roughness: 0.4 })); nd.add(n);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 24), new THREE.MeshStandardMaterial({ color: 0x2a3340 })); hub.rotation.x = Math.PI / 2; nd.add(hub); g.add(nd);
  g.userData.nd = nd; return g;
}
function clockSoft() {
  const tex = dialTex((c, w, h) => { const cx = w / 2, cy = h / 2; c.fillStyle = '#2a3340'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI * 2; c.beginPath(); c.arc(cx + Math.cos(a) * 214, cy + Math.sin(a) * 214, i % 5 ? 5 : 9, 0, 7); c.fill(); if (i % 5 === 0) { c.font = '900 50px Inter'; c.fillText(String(i), cx + Math.cos(a) * 162, cy + Math.sin(a) * 162); } }
    c.font = '700 32px Inter'; c.fillText('MIN', cx, cy + 92); });
  const g = dial(0.11, tex);
  const sweep = new THREE.Mesh(new THREE.CircleGeometry(0.104, 64, Math.PI / 2, 0.001), new THREE.MeshBasicMaterial({ color: 0x4fa3ff, transparent: true, opacity: 0.3, depthWrite: false })); sweep.position.z = 0.004; g.add(sweep);
  const hd = new THREE.Group(); hd.position.z = 0.007; hd.add(new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.09, 0.003).translate(0, 0.038, 0), new THREE.MeshStandardMaterial({ color: 0xd62f2f }))); g.add(hd);
  g.userData = { hd, sweep }; return g;
}
function arrowSoft(col = 0x2f7fe0) {
  const s = new THREE.Shape(); s.moveTo(-0.022, 0); s.lineTo(0.022, 0); s.lineTo(0.022, 0.17); s.lineTo(0.05, 0.17); s.lineTo(0, 0.26); s.lineTo(-0.05, 0.17); s.lineTo(-0.022, 0.17); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 3 }); geo.translate(0, 0, -0.006);
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.3, clearcoat: 1, emissive: col, emissiveIntensity: 0.25 })); m.castShadow = true; return m;
}
// círculo «lupa» del debate: la articulación en grande con su burbuja (nace) o rompiéndose en trocitos (rompe)
function insetJoint(burst) {
  const g = new THREE.Group(), R = 0.19, M = innerMats(), planes = [];
  for (let i = 0; i < 28; i++) planes.push(new THREE.Plane());
  const clipM = m => { const c = m.clone(); c.clippingPlanes = planes; c.clipIntersection = false; return c; };
  const bg = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#b8473e'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 110; i++) { const light = hash(i * 3.1) > 0.45; c.strokeStyle = light ? `rgba(242,146,128,${0.16 + hash(i * 5.3) * 0.26})` : `rgba(104,18,16,${0.14 + hash(i * 2.2) * 0.24})`; c.lineWidth = 3 + hash(i * 7.9) * 7; c.beginPath(); let x = hash(i * 1.7) * w; c.moveTo(x, -10); for (let y = 0; y <= h + 40; y += 40) { x += (hash(i * 13 + y) - 0.5) * 9; c.lineTo(x, y); } c.stroke(); }
    const gr = c.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,220,205,.25)'); gr.addColorStop(1, 'rgba(60,8,6,.55)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 72), new THREE.MeshStandardMaterial({ map: bg, roughness: 0.7 })); disc.position.z = -0.06; g.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.009, 16, 96), softWhite(0xffffff, 0.2)); rim.position.z = -0.03; rim.scale.z = 3; g.add(rim);
  const s = 0.105 / 0.094;      // la articulación del dedo, ampliada
  const lo = new THREE.Mesh(phalanxGeo(-0.3, -0.024, 0.06, 0.055), clipM(M.bone)); const loC = new THREE.Mesh(cartGeo(-0.3, -0.024, 0.06, 0.055, 'head'), clipM(M.cart));
  const up = new THREE.Mesh(phalanxGeo(0.024, 0.3, 0.058, 0.052), clipM(M.bone)); const upC = new THREE.Mesh(cartGeo(0.024, 0.3, 0.058, 0.052, 'base'), clipM(M.cart));
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.062, 40), clipM(M.fluid)); fl.scale.set(1.12, 1, 0.84);
  const capM = clipM(M.caps); const cap = lathe([[0.052, -0.085], [0.064, -0.05], [0.07, 0], [0.064, 0.05], [0.05, 0.085]], 40, capM); cap.scale.set(1.12, 1, 0.84); cap.renderOrder = 6;
  const NB = 30, mb = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10), M.bub, NB); mb.frustumCulled = false; mb.renderOrder = 7;
  const mp = []; for (let i = 0; i < NB; i++) { const a = hash(i * 4.3) * 6.283, rr2 = Math.sqrt(hash(i * 6.1)) * 0.042; mp.push([Math.cos(a) * rr2 * 1.12, (hash(i * 2.3) - 0.5) * 0.034, Math.sin(a) * rr2 * 0.84, 0.0035 + hash(i * 8.3) * 0.005]); }
  const bub = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), M.bub); bub.scale.setScalar(0.0001); bub.renderOrder = 8;
  const J = new THREE.Group(); J.add(lo, loC, up, upC, fl, cap, mb, bub); J.rotation.x = 0.25; J.scale.setScalar(1.55); g.add(J);
  const bits = []; for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), M.bub); b.scale.setScalar(0.0001); J.add(b); bits.push(b); }
  g.userData = { planes, R, bub, bits, J, burst, mb, mp }; return g;
}
function insetClip(g) {      // planos del círculo (en el mundo): solo se ve lo que cae dentro del aro
  const U = g.userData; g.updateWorldMatrix(true, true); const n = U.planes.length, M4 = g.matrixWorld; _m3.getNormalMatrix(M4);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, P = U.planes[i]; P.normal.set(-Math.cos(a), -Math.sin(a), 0); P.constant = U.R * 0.985; P.applyMatrix4(M4, _m3); }
}
const PLAT = v3(HAND_L / 2, -0.42, 1.2);
function buildStations() {
  ST.ring = mriRing(); scene.add(ST.ring);
  ST.panel = mriPanel(); ST.panel.position.set(-0.71, 1.36, 0.32); ST.panel.rotation.y = 0.24; scene.add(ST.panel);
  ST.gauge = gaugeSoft(); ST.gauge.position.set(-0.48, 1.2, 0.3); ST.gauge.rotation.y = 0.3; ST.gauge.userData.s0 = 0.75; scene.add(ST.gauge);
  ST.arrow = arrowSoft(0xd8372c); scene.add(ST.arrow);
  ST.in1 = insetJoint(false); ST.in1.position.set(-0.56, 1.62, 0.62); scene.add(ST.in1);
  ST.in2 = insetJoint(true); ST.in2.position.set(-0.13, 1.62, 0.62); scene.add(ST.in2);
  ST.clock = clockSoft(); ST.clock.position.set(-0.54, 1.46, 0.24); ST.clock.rotation.y = 0.3; scene.add(ST.clock);
  // peana blanca con el premio y las 215 figuritas
  ST.plat = new THREE.Group(); ST.plat.position.copy(PLAT); scene.add(ST.plat);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.28, 0.06, 96), softWhite(0xf4f2ee, 0.45)); top.receiveShadow = true; top.castShadow = true; ST.plat.add(top);
  ST.prize = prize(); ST.prize.position.set(0, 0.03, -0.05); ST.prize.userData.s0 = 2.2; ST.plat.add(ST.prize);
  ST.figs = new THREE.InstancedMesh(studentGeo(false), new THREE.MeshPhysicalMaterial({ color: 0xefe9e1, roughness: 0.45, clearcoat: 0.4 }), 215); ST.figs.castShadow = true; ST.figs.frustumCulled = false; ST.plat.add(ST.figs);
  ST.fpos = []; for (let i = 0; i < 215; i++) { const r = 0.3 + 0.82 * Math.sqrt((i + 0.5) / 215), a = i * 2.39996 + 0.4; ST.fpos.push(v3(Math.cos(a) * r, 0.03, Math.sin(a) * r * 0.92 + 0.08)); }
}
// la pose del índice: un punto a lo largo de su eje (s) y su giro
const _bq = new THREE.Quaternion(), _bp = new THREE.Vector3();
function alongIndex(h, s, out) { const b = h.userData.fingers[0].bones[0]; b.updateWorldMatrix(true, false); b.getWorldQuaternion(_bq); return out.set(0, s, 0).applyMatrix4(b.matrixWorld); }
function stationsAt(t) {
  const H = S.hand;
  // L3: la flecha de tirar (al lado del dedo) y el manómetro (la presión cae)
  { const a = pop(t, K.tirar3 - 0.12, 0.4) * (1 - win(t, K.presion3 + 0.2, 0.3)) + 0.8 * env(t, K.crujir6 - 0.35, K.enseguida6 + 0.3, 0.3, 0.3);
    ST.arrow.visible = a > 0.01; if (ST.arrow.visible) { alongIndex(H, 0.44 + 0.02 * Math.sin(Math.max(0, t - K.tirar3) * 9), _bp); ST.arrow.position.copy(_bp).add(v3(-0.155, 0, 0.05)); ST.arrow.quaternion.copy(_bq); ST.arrow.scale.setScalar(Math.max(0.0001, 0.62 * a)); } }
  { const a = pop(t, K.presion3 - 0.3, 0.4) * (1 - win(t, K.golpe3 + 0.5, 0.3)); show(ST.gauge, a);
    if (ST.gauge.visible) ST.gauge.userData.nd.rotation.z = -1.95 + 3.9 * eio(clamp((t - K.presion3 + 0.05) / (K.cae3 + 0.45 - K.presion3))); }
  // L4: el anillo de resonancia baja por el dedo y la pantalla graba la cavidad (0,31 s)
  { const vin = eio(clamp((t - (K.n2015 + 0.35)) / 0.85)), vout = eio(clamp((t - (K.discute5 - 0.45)) / 0.55)), v = vin * (1 - vout);
    ST.ring.visible = v > 0.002; if (ST.ring.visible) { alongIndex(H, lerp(1.35, 0.42, vin) + 0.9 * vout, _bp); ST.ring.position.copy(_bp); ST.ring.quaternion.copy(_bq); ST.ring.scale.setScalar(Math.max(0.0001, 0.6 + 0.4 * v));
      ST.ring.userData.strip.material.emissiveIntensity = 1.2 + 1.2 * env(t, K.resonancia4 - 0.1, K.segundo4 + 0.4, 0.2, 0.3) * (0.7 + 0.3 * Math.sin(t * 20)); }
    const p = pop(t, K.n2015 + 0.25, 0.45) * (1 - win(t, K.discute5 - 0.35, 0.35)); show(ST.panel, p);
    if (ST.panel.visible) ST.panel.userData.draw(clamp((t - (K.resonancia4 - 0.1)) / (K.segundo4 + 0.25 - K.resonancia4))); }
  // L5: los dos círculos del debate: la burbuja que nace (izquierda) y la que se rompe (derecha)
  for (const [g, t0] of [[ST.in1, K.discute5 - 0.15], [ST.in2, K.discute5 + 0.05]]) { const a = pop(t, t0, 0.45) * (1 - win(t, K.burbuja6 - 0.3, 0.35)); show(g, a); if (!g.visible) continue; insetClip(g);
    const U = g.userData; U.J.rotation.y = 0.25 * Math.sin(t * 0.6);
    { const cv = U.burst ? 0 : eio(clamp((t - (K.nacer5 - 0.6)) / 0.56)), vis = U.burst ? 0 : 1 - win(t, K.nacer5 - 0.05, 0.08);
      for (let i = 0; i < U.mp.length; i++) { const q = U.mp[i]; _o.position.set(q[0] * (1 - cv), q[1] * (1 - cv), q[2] * (1 - cv)); _o.rotation.set(0, 0, 0); _o.scale.setScalar(Math.max(0.00001, q[3] * vis * (1 - 0.4 * cv))); _o.updateMatrix(); U.mb.setMatrixAt(i, _o.matrix); } U.mb.instanceMatrix.needsUpdate = true; }
    if (!U.burst) { const b = popk(t, K.nacer5 - 0.04); U.bub.scale.set(0.05 * b, 0.026 * b + 0.0001, 0.045 * b); }
    else { const u = t - (K.romperse5 - 0.04), alive = u < 0 ? 1 : Math.max(0, 1 - u / 0.08); U.bub.scale.set(0.05 * alive + 0.0001, 0.026 * alive + 0.0001, 0.045 * alive + 0.0001);
      U.bits.forEach((b, i) => { const a2 = i / U.bits.length * Math.PI * 2, e = eo(clamp(u / 0.5)); b.visible = u > 0 && u < 1.3; if (!b.visible) return; b.scale.setScalar(0.011 * (1 - clamp((u - 0.4) / 0.9)));
        b.position.set(Math.cos(a2) * 0.075 * e, Math.sin(a2 * 3) * 0.01 * e, Math.sin(a2) * 0.06 * e); }); } }
  // L6: el reloj de 20 minutos
  { const a = pop(t, K.durar6 + 0.1, 0.45) * (1 - win(t, K.respuesta7 - 0.2, 0.35)); show(ST.clock, a);
    if (ST.clock.visible) { const ck = eio(clamp((t - K.durar6) / (K.minutos6 + 1.0 - K.durar6))), U = ST.clock.userData; U.hd.rotation.z = -ck * Math.PI * 2;
      U.sweep.geometry.dispose(); U.sweep.geometry = new THREE.CircleGeometry(0.104, 64, Math.PI / 2 - ck * Math.PI * 2, Math.max(0.001, ck * Math.PI * 2)); } }
  // L8: la peana, el Ig Nobel y las 215 personas
  { const a = pop(t, K.ig8 - 0.55, 0.5) * (1 - win(t, K.tu9 - 0.25, 0.4)); ST.plat.visible = a > 0.002; if (ST.plat.visible) { ST.plat.scale.setScalar(Math.max(0.0001, a));
      show(ST.prize, pop(t, K.ig8 - 0.12, 0.45)); ST.prize.rotation.y = 0.3 * Math.sin(t * 0.8);
      const t0 = K.n215 - 0.15; for (let i = 0; i < 215; i++) { const p = ST.fpos[i], k = pop(t, t0 + i * 0.0042, 0.3); _o.position.set(p.x, p.y + 0.1 * (1 - clamp(k)), p.z); _o.rotation.set(0, Math.atan2(-p.x, 3 - p.z), 0); _o.scale.setScalar(Math.max(0.0001, k * 1.9)); _o.updateMatrix(); ST.figs.setMatrixAt(i, _o.matrix); }
      ST.figs.instanceMatrix.needsUpdate = true; } }
}
// ---------------------------------------------------------------- cámara: primer plano del índice abierto (cruje a los 0,3 s) → se aleja y se ve la mano entera → entra en el
// dedo (frase 3) → el anillo de resonancia y su pantalla → los dos círculos del debate → vuelve al dedo con el reloj → las dos manos de Unger → la peana con el
// premio y las 215 personas → vuelve a la mano y al primer plano del principio (bucle).
let CKS = [];
const T0 = [0.06, 1.59, 1.32], L0 = [-0.33, 1.31, 0.0], T0b = [0.055, 1.585, 1.34], L0b = [-0.33, 1.308, 0.0], Tm = [0.07, 1.6, 1.28], Lm = [-0.33, 1.312, 0.0];
function buildCam() {
  const HL = HAND_L / 2;
  const A = [
    [-0.4, Tm, Lm, 36], [0.0, T0, L0, 36], [0.35, T0b, L0b, 36],
    [1.3, [0.5, 1.2, 3.3], [-0.1, 0.82, 0], 38], [2.4, [1.0, 1.15, 3.05], [-0.09, 0.84, 0], 38], [K.medico1, [1.2, 1.08, 2.9], [-0.08, 0.86, 0], 38],
    [K.tenian2 - 0.1, [1.05, 1.12, 2.85], [-0.12, 0.88, 0], 38], [K.final2, [0.55, 1.3, 2.0], [-0.25, 1.05, 0], 38],
    [K.nudillo3 + 0.1, [0.1, 1.45, 1.1], [-0.33, 1.25, 0], 37], [K.capsula3, [-0.13, 1.45, 0.62], [-0.35, 1.29, 0.0], 36], [K.liquido3, [-0.2, 1.4, 0.5], [-0.35, 1.285, 0.0], 36],
    [K.tirar3, [-0.12, 1.42, 0.8], [-0.42, 1.33, 0.02], 36], [K.presion3, [-0.24, 1.36, 1.15], [-0.45, 1.26, 0.1], 36], [K.cae3 + 0.45, [-0.235, 1.355, 1.12], [-0.445, 1.262, 0.1], 36], [K.gas3, [-0.2, 1.37, 0.5], [-0.35, 1.287, 0.0], 36],
    [K.golpe3, [-0.23, 1.345, 0.41], [-0.35, 1.287, 0.0], 35], [K.n2015 - 0.2, [-0.235, 1.34, 0.4], [-0.35, 1.286, 0.0], 35],
    [K.n2015 + 0.7, [-0.44, 1.47, 2.3], [-0.59, 1.35, 0.15], 36], [K.resonancia4, [-0.46, 1.45, 2.25], [-0.59, 1.34, 0.15], 36], [K.discute5 - 0.35, [-0.48, 1.44, 2.15], [-0.59, 1.34, 0.15], 36],
    [K.discute5 + 0.4, [-0.345, 1.64, 3.5], [-0.345, 1.6, 0.62], 36], [K.nacer5, [-0.37, 1.64, 3.42], [-0.36, 1.6, 0.62], 36], [K.romperse5, [-0.32, 1.64, 3.42], [-0.33, 1.6, 0.62], 36], [K.burbuja6 - 0.45, [-0.31, 1.64, 3.38], [-0.33, 1.6, 0.62], 36],
    [K.burbuja6 + 0.3, [-0.17, 1.42, 0.6], [-0.36, 1.3, 0.02], 36], [K.durar6 + 0.05, [-0.18, 1.43, 0.68], [-0.38, 1.31, 0.04], 36], [K.durar6 + 0.75, [-0.24, 1.53, 1.32], [-0.46, 1.38, 0.1], 36], [K.minutos6 + 0.3, [-0.245, 1.53, 1.33], [-0.46, 1.38, 0.1], 36], [K.crujir6, [-0.23, 1.52, 1.3], [-0.45, 1.37, 0.09], 36],
    [K.respuesta7 - 0.2, [-0.22, 1.52, 1.32], [-0.44, 1.37, 0.09], 36],
    [K.donald7, [HL, 1.15, 6.6], [HL, 0.82, 0], 38], [K.crujio7, [HL - 0.15, 1.05, 6.2], [HL - 0.1, 0.82, 0], 38], [K.anos7, [HL - 0.1, 1.1, 6.3], [HL, 0.84, 0], 38],
    [K.ninguna8, [HL, 1.45, 4.1], [HL, 1.25, 0], 38], [K.ig8 - 0.35, [HL, 1.42, 4.3], [HL, 1.15, 0.1], 38],
    [K.ig8 + 0.4, [HL, 1.3, 5.6], [HL, 0.35, 0.6], 38], [K.n215, [HL, 1.6, 5.3], [HL, 0.15, 0.8], 38], [K.tu9 - 0.2, [HL + 0.05, 1.62, 5.25], [HL, 0.16, 0.8], 38],
    [K.mandaselo9, [0.45, 1.2, 3.3], [-0.1, 0.85, 0], 38], [K.dara9, [0.6, 1.25, 3.1], [-0.12, 0.88, 0], 38], [END - 1.2, [0.3, 1.38, 1.7], [-0.3, 1.2, 0], 37],
    [END - 0.4, Tm, Lm, 36], [END, T0, L0, 36], [END + 0.35, T0b, L0b, 36],
  ];
  CKS = [A];
}
function camAt(t) {
  const st = camKeys(t, CKS[0]);
  for (const [t0, a0] of [[T_HIT, 0.004], [K.golpe3, 0.004]]) { const u = t - t0; if (u > 0 && u < 0.35) { const a = a0 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; } }
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[T_HIT, 0.035], [K.golpe3, 0.045], [K.nacer5, 0.02], [K.romperse5, 0.02], [K.ig8, 0.02]])
    if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t; centerAt(t, st); stationsAt(t);
  const c = st.l, yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), d = st.p.distanceTo(c);
  lightsAt(c, yaw, clamp(d / 2.6, 0.35, 1.6));
}
// ---------------------------------------------------------------- HUD sobre fondo claro (estilo infografía médica): tinta oscura con halo blanco, rótulos en cajas blancas
// con línea guía, pasos numerados en la frase 3 y la pregunta pendiente (¿da artritis?) en la cabecera.
const INK = '#1C2430', GREY = '#5A6472', GOLD = '#C27A00', TEALc = '#0E8C86', REDc = '#D32F2F', GREEN = '#2E9D57', BLUE = '#1F6FD1';
function buildHudPlan() { HFONT = 'Inter'; HW = [900, 700]; }
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '4px'; hfont(46); hg.fillStyle = INK; hg.textAlign = 'left'; hg.fillText('TUS DEDOS', 54, 142);
  hg.letterSpacing = '2px'; hfont(24, false); hg.fillStyle = GREY; hg.fillText('QUÉ PASA CUANDO TE LOS CRUJES', 56, 180);
  hg.fillStyle = 'rgba(28,36,48,.22)'; hg.fillRect(56, 196, 968, 2);
  hg.textAlign = 'right'; hg.letterSpacing = '2px';
  hfont(18, false); hg.fillStyle = GREY; hg.fillText('ASÍ FUNCIONA', 1024, 112);
  hfont(32); hg.fillStyle = GOLD; hg.fillText('TU CUERPO', 1024, 148);
  hfont(18, false); hg.fillStyle = GREY; hg.fillText('POR DENTRO', 1024, 178);
  const mk = win(t, K.tenian2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = '¿DA ARTRITIS? · ???', col = REDc, blink = true;
    if (t > K.respuesta7 + 0.3) { txt = '50 AÑOS DE PRUEBA (UNGER)'; col = GOLD; blink = false; }
    if (t > K.ninguna8) { txt = 'NO: NI EN UNA MANO NI EN LA OTRA'; col = GREEN; blink = false; }
    if (t > K.tu9) { txt = '¿TÚ TE LOS CRUJES?'; col = INK; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = mk * (on ? 1 : 0.25); hfont(20); hg.letterSpacing = '2px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.fillStyle = 'rgba(255,255,255,.75)'; rr(hg, x0, y - 26, w, 40, 8); hg.fill();
    hg.strokeStyle = col; hg.lineWidth = 2; rr(hg, x0, y - 26, w, 40, 8); hg.stroke();
    hg.fillStyle = col; hg.fillText(txt, x1 - 17, y + 1);
  }
  hg.restore();
}
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function lab(o, x, y, z, txt, sub, k, opt) { if (k <= 0.01 || !o.visible) return; callout(wpo(o, x, y, z), txt, sub, k, { size: 27, subSize: 20, bg: true, light: true, subCol: GREY, ...opt }); }
function labP(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 27, subSize: 20, bg: true, light: true, subCol: GREY, ...opt }); }
const big = (txt, y, size, col, k, o = {}) => bigText(txt, W / 2, y, size, col, k, { type: false, halo: 22, ls: Math.round(size * 0.04), ...o });
const small = (txt, y, size, col, k, o = {}) => bigText(txt, W / 2, y, size, col, k, { halo: 14, ls: 2, ...o });
function stepBadge(n, x, y, k, col) { if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k * 2); const r = 30 * (0.6 + 0.4 * eo(clamp(k * 1.5)));
  hg.fillStyle = col; hg.beginPath(); hg.arc(x, y, r, 0, 7); hg.fill(); hg.fillStyle = '#fff'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(34); hg.letterSpacing = '0px'; hg.fillText(String(n), x, y + 2); hg.restore(); }
function check(P, k, col = GREEN, s = 1) { if (k <= 0.01 || !P.ok) return; hg.save(); hg.globalAlpha = clamp(k * 2); const r = 46 * s * (0.5 + 0.5 * eo(clamp(k * 1.6)));
  hg.fillStyle = col; hg.beginPath(); hg.arc(P.x, P.y, r, 0, 7); hg.fill(); hg.strokeStyle = '#fff'; hg.lineWidth = 9 * s; hg.beginPath(); hg.moveTo(P.x - r * 0.42, P.y + r * 0.02); hg.lineTo(P.x - r * 0.1, P.y + r * 0.34); hg.lineTo(P.x + r * 0.46, P.y - r * 0.3); hg.stroke(); hg.restore(); }
function cross(P, k, s = 1) { if (k <= 0.01 || !P.ok) return; hg.save(); hg.globalAlpha = clamp(k * 2); const r = 40 * s * (0.5 + 0.5 * eo(clamp(k * 1.6)));
  hg.fillStyle = REDc; hg.beginPath(); hg.arc(P.x, P.y, r, 0, 7); hg.fill(); hg.strokeStyle = '#fff'; hg.lineWidth = 8 * s; hg.beginPath(); hg.moveTo(P.x - r * 0.38, P.y - r * 0.38); hg.lineTo(P.x + r * 0.38, P.y + r * 0.38); hg.moveTo(P.x + r * 0.38, P.y - r * 0.38); hg.lineTo(P.x - r * 0.38, P.y + r * 0.38); hg.stroke(); hg.restore(); }
function crac(P, k, col = BLUE) { if (k <= 0.01 || !P.ok) return; hg.save(); hg.globalAlpha = clamp(k * 3) * (1 - clamp((k - 0.7) / 0.3)); const s = 0.7 + 0.5 * eo(clamp(k * 3));
  hg.translate(P.x, P.y); hg.rotate(-0.12); hg.scale(s, s); hfont(54); hg.letterSpacing = '2px'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.lineWidth = 10; hg.strokeStyle = '#fff'; hg.strokeText('¡CRAC!', 0, 0); hg.fillStyle = col; hg.fillText('¡CRAC!', 0, 0); hg.restore(); }
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1440, H1 = S.hand.userData, F = H1.fingers[0];
  // L1: el crujido del principio; «¿artritis?» en rojo; 50 años
  { const P = proj(S.jf.position); const k = clamp((t - T_HIT) / 0.9); if (t > T_HIT && t < T_HIT + 0.9) crac({ x: P.x + 150, y: P.y - 230, ok: P.ok }, k); }
  { const a = cw(t, K.artritis1 - 0.05, K.medico1 - 0.2); if (a > 0.01) { big('¿ARTRITIS?', Y, 104, REDc, a); small('LO QUE SIEMPRE TE HAN DICHO', Y + 84, 28, INK, a); } }
  { const a = cw(t, K.medico1 - 0.05, K.tenian2 - 0.32); if (a > 0.01) { big(Math.round(1 + 49 * eo(clamp((t - K.medico1) / (K.anos1 + 0.2 - K.medico1)))) + ' AÑOS', Y, 120, GOLD, a); small('UN MÉDICO LO COMPROBÓ EN SU PROPIA MANO', Y + 90, 28, INK, a); } }
  // L2: ¿tenían razón?
  { const a = cw(t, K.tenian2 - 0.05, K.cada3 - 0.1); if (a > 0.01) { big('¿TENÍAN RAZÓN?', Y, 84, INK, a); small('TE LO DIGO AL FINAL', Y + 78, 28, REDc, cw(t, K.digo2 - 0.1, K.cada3 - 0.1)); } }
  // L3: los pasos, como en una lámina: 1 la cápsula con líquido · 2 tiras · 3 la presión cae · 4 ¡burbuja!
  { const st = [[K.cada3 - 0.05, K.tirar3 - 0.32, 1, 'UNA CÁPSULA CON LÍQUIDO', TEALc], [K.tirar3 - 0.05, K.presion3 - 0.32, 2, 'TIRAS DEL DEDO', REDc], [K.presion3 - 0.05, K.gas3 - 0.32, 3, 'LA PRESIÓN CAE', BLUE], [K.gas3 - 0.05, K.n2015 - 0.32, 4, 'EL GAS FORMA UNA BURBUJA', TEALc]];
    for (const [t0, t1, n, txt, col] of st) { const a = cw(t, t0, t1); if (a <= 0.01) continue; hg.save(); hfont(58); hg.letterSpacing = '2px'; const w = hg.measureText(txt).width; hg.restore();
      stepBadge(n, W / 2 - w / 2 - 50, Y, a, col); bigText(txt, W / 2 + 24, Y, 58, INK, a, { type: false, halo: 20, ls: 2 }); }
    const c = cw(t, K.golpe3 - 0.05, K.n2015 - 0.32); if (c > 0.01) small('DE GOLPE, EN MENOS DE UN SEGUNDO', Y + 76, 28, GREY, c);
    if (cutK(t) > 0.5 && t > K.cada3 && t < K.n2015) {
      lab(F.ph[0], 0, 0.3, 0.03, 'HUESO', null, cw(t, K.nudillo3 + 0.2, K.capsula3 - 0.1), { dx: -170, dy: -40, color: INK });
      lab(F.cap, -F.r * 0.62, 0.0, 0.0, 'CÁPSULA', 'LA ENVUELVE', cw(t, K.capsula3 - 0.05, K.liquido3 - 0.1), { dx: -170, dy: -150, color: TEALc });
      lab(F.fluid, F.r * 0.3, 0, 0.02, 'LÍQUIDO SINOVIAL', 'CON GASES DISUELTOS', cw(t, K.liquido3 - 0.05, K.tirar3 - 0.1), { dx: 150, dy: -200, color: TEALc });
      lab(F.bub, 0, 0, 0.0, 'BURBUJA DE GAS', null, cw(t, K.golpe3 + 0.1, K.n2015 - 0.1), { dx: 160, dy: -180, color: TEALc }); }
    if (t > K.golpe3 && t < K.golpe3 + 0.9) { const P = proj(S.jf.position); crac({ x: P.x - 120, y: P.y - 250, ok: P.ok }, clamp((t - K.golpe3) / 0.9)); }
    if (ST.arrow.visible && t < K.burbuja6) labP(proj(ST.arrow.localToWorld(v3(0, 0.27, 0))), 'TIRAS', null, cw(t, K.tirar3, K.presion3 - 0.1), { dx: -60, dy: -120, color: REDc }); }
  // L4: 2015, la resonancia: 0,31 s
  { const a = cw(t, K.n2015 - 0.05, K.menos4 - 0.32); if (a > 0.01) { big('2015', Y, 120, INK, a); small('LO GRABAN POR PRIMERA VEZ EN UNA RESONANCIA', Y + 88, 26, BLUE, a); }
    const b = cw(t, K.menos4 - 0.05, K.discute5 - 0.32); if (b > 0.01) { big('0,31 s', Y, 130, BLUE, b); small('MENOS DE UN TERCIO DE SEGUNDO', Y + 92, 28, INK, b); }
    lab(ST.panel, 0, 0.29, 0.02, 'RESONANCIA MAGNÉTICA', 'PLOS ONE, 2015', cw(t, K.grabaron4, K.menos4 - 0.1), { dx: 120, dy: -150, color: BLUE }); }
  // L5: ¿al nacer o al romperse?
  { const a = cw(t, K.discute5 - 0.05, K.burbuja6 - 0.32); if (a > 0.01) { small('LOS CIENTÍFICOS AÚN NO SE PONEN DE ACUERDO', Y + 40, 30, INK, a); }
    for (const [g, txt, col, t0, sub] of [[ST.in1, '¿AL NACER?', TEALc, K.nacer5 - 0.4, 'KAWCHUK, 2015'], [ST.in2, '¿AL ROMPERSE?', GOLD, K.romperse5 - 0.4, 'ESTUDIOS DE 1971 Y 2018']]) {
      if (!g.visible) continue; const P = proj(wpo(g, 0, 0.19, 0)); const k = cw(t, t0, K.burbuja6 - 0.32);
      if (k > 0.01 && P.ok) { bigText(txt, P.x, P.y - 70, 44, col, k, { type: false, halo: 16, ls: 1 }); bigText(sub, P.x, P.y - 26, 20, GREY, k, { type: false, halo: 10, ls: 1, bold: false }); } }
    for (const [g, t0] of [[ST.in1, K.nacer5], [ST.in2, K.romperse5]]) if (g.visible && t > t0 && t < t0 + 0.9) { const P = proj(wpo(g, 0, -0.13, 0.05)); crac(P, clamp((t - t0) / 0.9), g === ST.in1 ? TEALc : GOLD); } }
  // L6: 20 minutos · ese dedo no vuelve a crujir
  { const b = cw(t, K.durar6 - 0.05, K.respuesta7 - 0.32); if (b > 0.01) { small(t < K.eso6 - 0.1 ? 'LA BURBUJA PUEDE DURAR' : 'Y MIENTRAS, ESE DEDO', Y - 78, 30, INK, b, { type: false });
      big(t < K.eso6 - 0.1 ? 'HASTA 20 MIN' : 'NO VUELVE A CRUJIR', Y, t < K.eso6 - 0.1 ? 104 : 78, t < K.eso6 - 0.1 ? BLUE : REDc, b); }
    if (t > K.burbuja6 && t < K.respuesta7) { lab(F.bub, 0, 0, 0, 'LA BURBUJA', 'SE VA DISOLVIENDO', cw(t, K.burbuja6 + 0.3, K.eso6 - 0.1), { dx: 150, dy: -180, color: TEALc });
      const P = proj(S.jf.position); cross({ x: P.x - 150, y: P.y + 40, ok: P.ok }, cw(t, K.crujir6 + 0.1, K.respuesta7 - 0.3)); } }
  // L7: Donald Unger, 50 años crujiendo una sola mano
  { const a = cw(t, K.donald7 - 0.05, K.dos7 - 0.32); if (a > 0.01) { big('DONALD UNGER', Y, 84, INK, a); small('MÉDICO · SOLO SE CRUJÍA LA IZQUIERDA', Y + 78, 28, GOLD, cw(t, K.sola7 - 0.1, K.dos7 - 0.32)); }
    const b = cw(t, K.dos7 - 0.05, K.tuvo8 - 0.32); if (b > 0.01) { big(t < K.n50b - 0.05 ? '2 VECES AL DÍA' : '50 AÑOS', Y, 104, GOLD, b); small('MÁS DE 36.500 CRUJIDOS', Y + 84, 28, INK, cw(t, K.n50b - 0.1, K.tuvo8 - 0.32)); }
    if (S.handL.visible) for (const [h, t1, a1, a2, col] of [[S.handL, K.sola7, 'LA IZQUIERDA', 'SE LA CRUJÍA', GOLD], [S.hand, K.mano7, 'LA DERECHA', 'NUNCA (PARA COMPARAR)', INK]]) {
      const k = cw(t, t1, K.tuvo8 - 0.1), P = proj(wpo(h, -0.1, 1.95, 0.05)); if (k <= 0.01 || !P.ok) continue; const y = Math.max(540, P.y - 90);
      bigText(a1, P.x, y, 34, col, k, { type: false, halo: 16, ls: 1 }); bigText(a2, P.x, y + 36, 21, GREY, k, { type: false, halo: 12, ls: 1, bold: false }); } }
  // L8: ninguna artritis · Ig Nobel · 215 personas
  { const a = cw(t, K.ninguna8 - 0.05, K.ig8 - 0.32); if (a > 0.01) { big('NINGUNA ARTRITIS', Y, 84, GREEN, a); small('NI EN UNA MANO NI EN LA OTRA', Y + 78, 28, INK, a); }
    if (S.handL.visible) { const k = cw(t, K.ninguna8 - 0.1, K.ig8 - 0.1); check(proj(wpo(S.handL, -0.35, 1.95, 0.1)), k); check(proj(wpo(S.hand, -0.35, 1.95, 0.1)), cw(t, K.ninguna8 + 0.1, K.ig8 - 0.1)); }
    const b = cw(t, K.ig8 - 0.05, K.n215 - 0.32); if (b > 0.01) { big('IG NOBEL', Y, 116, GOLD, b); small('MEDICINA · 2009', Y + 88, 30, INK, b); }
    const c = cw(t, K.n215 - 0.05, K.tu9 - 0.32); if (c > 0.01) { big(Math.round(215 * eo(clamp((t - K.n215 + 0.05) / 0.9))) + ' PERSONAS', Y, 96, INK, c); small('ESTUDIO DE 2011: LA MISMA CONCLUSIÓN', Y + 80, 28, GREEN, c); } }
  // L9: ¿tú te los crujes? · mándaselo
  { const a = cw(t, K.tu9 - 0.05, K.mandaselo9 - 0.3); if (a > 0.01) big('¿TÚ TE LOS CRUJES?', Y, 80, INK, a);
    const m = cw(t, K.mandaselo9 - 0.05, END - 0.6); if (m > 0.01) { small('MÁNDASELO A QUIEN TE DICE', Y - 10, 40, INK, m, { type: false }); big('QUE TE DARÁ ARTRITIS', Y + 62, 60, REDc, cw(t, K.dara9 - 0.1, END - 0.6)); } }
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
    crujirte1: atL(1, 'crujirte'), dedos1: atL(1, 'dedos'), artritis1: atL(1, 'artritis'), medico1: atL(1, 'medico'), n50: atL(1, '=50'), anos1: atL(1, 'anos'), comprobarlo1: atL(1, 'comprobarlo'),
    tenian2: atL(2, 'tenian'), razon2: atL(2, 'razon'), digo2: atL(2, 'digo'), final2: atL(2, 'final'),
    cada3: atL(3, 'cada'), nudillo3: atL(3, 'nudillo'), capsula3: atL(3, 'capsula'), liquido3: atL(3, 'liquido'), tirar3: atL(3, 'tirar'), dedo3: atL(3, 'dedo'), presion3: atL(3, 'presion'), cae3: atL(3, 'cae'), gas3: atL(3, 'gas'), golpe3: atL(3, 'golpe'), burbuja3: atL(3, 'burbuja'),
    n2015: atL(4, '=2015'), grabaron4: atL(4, 'grabaron'), resonancia4: atL(4, 'resonancia'), menos4: atL(4, 'menos'), tercio4: atL(4, 'tercio'), segundo4: atL(4, 'segundo'),
    discute5: atL(5, 'discute'), ruido5: atL(5, 'ruido'), burbuja5: atL(5, 'burbuja'), nacer5: atL(5, 'nacer'), romperse5: atL(5, 'romperse'),
    burbuja6: atL(6, 'burbuja'), durar6: atL(6, 'durar'), n20: atL(6, '=20'), minutos6: atL(6, 'minutos'), eso6: atL(6, '=eso'), dedo6: atL(6, 'dedo'), crujir6: atL(6, 'crujir'), enseguida6: atL(6, 'enseguida'),
    respuesta7: atL(7, 'respuesta'), donald7: atL(7, 'donald'), unger7: atL(7, 'unger'), crujio7: atL(7, 'crujio'), sola7: atL(7, 'sola'), mano7: atL(7, 'mano'), dos7: atL(7, '=dos'), veces7: atL(7, 'veces'), dia7: atL(7, 'dia'), n50b: atL(7, '=50'), anos7: atL(7, 'anos'),
    tuvo8: atL(8, 'tuvo'), artritis8: atL(8, 'artritis'), ninguna8: atL(8, 'ninguna'), mano8: atL(8, 'mano'), dieron8: atL(8, 'dieron'), ig8: atL(8, '=ig'), nobel8: atL(8, 'nobel'), estudio8: atL(8, 'estudio'), n215: atL(8, '=215'), personas8: atL(8, 'personas'), mismo8: atL(8, 'mismo'),
    tu9: atL(9, '=tu'), crujes9: atL(9, 'crujes'), mandaselo9: atL(9, 'mandaselo'), dice9: atL(9, 'dice'), dara9: atL(9, 'dara'), artritis9: atL(9, 'artritis'),
  };
  mats(); buildMats(); softLights(); S.flow = [];
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; }
  scene.background = new THREE.Color(0xf3ede6); scene.add(softBackdrop());
  buildCenter(); buildStations();
  post.uniforms.ca.value = 0.25; post.uniforms.vig.value = 0.16; post.uniforms.bloom.value = 0.35;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
