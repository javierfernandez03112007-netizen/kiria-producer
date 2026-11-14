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
// ---------------------------------------------------------------- el centro: una mano gigante en rayos X que se cruje los nudillos uno a uno (en cada uno estalla
// un destello de luz). Al final vuelve a la pose del primer fotograma (bucle).
const T_HIT = 0.3, HAND_S = 2.2;
const CRACK = [1.72, 0.3, 0.64, 0.98, 1.34];          // pulgar, índice, corazón, anular, meñique
const flexAt = (t, tc) => { const u = t - tc; if (u < -0.26 || u > 0.62) return 0; return u < 0 ? 1.25 * eio(clamp((u + 0.26) / 0.26)) : u < 0.14 ? 1.25 : 1.25 * (1 - eio(clamp((u - 0.14) / 0.48))); };
function buildCenter() {
  const Z = new THREE.Group(); scene.add(Z); S.ctr = Z;
  S.hand = xrayHand(HAND_S); S.hand.position.set(0, 1.32, 0); Z.add(S.hand);
  S.base = grp(cyl(0.5, 0.56, 0.08, M.wood, 64), at(cyl(0.505, 0.505, 0.012, M.brass, 64), 0, 0.03, 0)); S.base.position.y = 0.04; Z.add(S.base);
  S.ctrCone = lightCone(1.6, 5, 0.05); Z.add(S.ctrCone);
}
function centerAt(t, st) {
  const Z = S.ctr, vis = t < K.cada3 + 2.4 || t > K.mandaselo9 - 1.0; Z.visible = vis; if (!vis) return;
  // los cinco nudillos al principio y un crujido más con «¿tú te los crujes?»
  const XC = i => K.mandaselo9 + 0.15 + (i - 1) * 0.14;                 // un crujido más, ya de vuelta en el centro
  const ang = CRACK.map((tc, i) => flexAt(t, tc) + (i >= 1 && i <= 4 ? flexAt(t, XC(i)) : 0));
  handPose(S.hand, ang);
  S.hand.userData.flashes.forEach((f, i) => { let k = 0; for (const tc of [CRACK[i], ...(i >= 1 && i <= 4 ? [XC(i)] : [])]) { const u = t - tc; if (u > 0 && u < 0.5) k = Math.max(k, Math.exp(-u * 7)); }
    f.scale.setScalar(Math.max(0.0001, 0.42 * k)); f.material.opacity = Math.min(1, k * 1.3); });
  S.hand.rotation.y = 0.1 * Math.sin(t * 0.35);
  S.ctrCone.material.uniforms.op.value = 0.05;
}
// ---------------------------------------------------------------- estaciones en el círculo de radio R_ST (pedestal de madera con canto de latón y su haz de luz;
// su +z local mira hacia fuera, hacia la cámara): D el nudillo por dentro (L3), C la resonancia (L4), K el debate y los 20 minutos (L5–L6),
// P las dos manos de Unger (L7) y B las radiografías, el premio y las 215 personas (L8).
const ST = {};
function station(name, a, r = 1.0) {
  const Z = new THREE.Group(); Z.position.copy(stP(a)); Z.rotation.y = a * D2; scene.add(Z);
  const pl = plinth(r, 0.55); Z.add(pl); const lc = lightCone(r * 1.15, 4.6, 0.055); Z.add(lc);
  const top = new THREE.Group(); top.position.y = 0.55; Z.add(top);
  ST[name] = { Z, top, a, cone: lc }; return ST[name];
}
const LH = 0.42;      // escala de las manos de Unger
function buildStations() {
  { const s = station('D', ANG.D, 1.0);
    s.kn = knuckleModel(); s.kn.position.set(-0.02, 0.24, 0.06); s.kn.scale.setScalar(1.35); s.top.add(s.kn);
    s.g = gauge(); s.g.position.set(0.5, 0.28, -0.12); s.g.rotation.y = -0.35; s.top.add(s.g);
    s.sp = sparks(s.top, 80, 0xbfe4ff, 0.018);
  }
  { const s = station('C', ANG.C, 1.0);
    s.mri = mriMachine(); s.mri.position.set(-0.26, 0, -0.08); s.mri.rotation.y = 0.45; s.mri.scale.setScalar(0.85); s.top.add(s.mri);
    s.scr = mriScreen(); s.scr.position.set(0.34, 0, 0.06); s.scr.rotation.y = -0.3; s.scr.scale.setScalar(1.25); s.top.add(s.scr);
  }
  { const s = station('K', ANG.K, 1.05);
    s.j1 = bellJar(); s.j1.position.set(-0.27, 0, 0.12); s.top.add(s.j1);
    s.j2 = bellJar(); s.j2.position.set(0.27, 0, 0.12); s.top.add(s.j2);
    s.clk = clock20(); s.clk.position.set(0, 0.36, -0.3); s.clk.scale.setScalar(1.4); s.top.add(s.clk);
  }
  { const s = station('P', ANG.P, 1.05);
    s.hL = xrayHand(LH); s.hL.scale.x = -LH; s.hL.position.set(-0.22, 0.27, 0.0); s.top.add(s.hL);
    s.hR = xrayHand(LH); s.hR.position.set(0.22, 0.27, 0.0); s.top.add(s.hR);
    for (const x of [-0.22, 0.22]) { const b = cyl(0.07, 0.08, 0.03, M.wood, 32); b.position.set(x, 0.015, 0); s.top.add(b); }
  }
  { const s = station('B', ANG.B, 1.05);
    s.lb = lightBox(); s.lb.position.set(-0.1, 0, -0.2); s.lb.scale.setScalar(1.15); s.top.add(s.lb);
    s.pr = prize(); s.pr.position.set(0.46, 0, 0.0); s.pr.rotation.y = -0.3; s.pr.scale.setScalar(1.3); s.pr.userData.s0 = 1.3; s.top.add(s.pr);
    s.figs = new THREE.InstancedMesh(studentGeo(true), new THREE.MeshPhysicalMaterial({ color: 0xe6e1d8, roughness: 0.4, clearcoat: 0.5 }), 215); s.figs.frustumCulled = false; s.top.add(s.figs);
    s.fpos = []; for (let i = 0; i < 215; i++) { const c = i % 22, r = Math.floor(i / 22); s.fpos.push(v3((c - 10.5) * 0.034, 0, 0.16 + r * 0.032)); }
  }
}
function stationsAt(t) {
  const vis = (s, a, b) => { s.Z.visible = t > a && t < b; return s.Z.visible; };
  // L3: al tirar del dedo se abre la articulación, la presión cae y nace la burbuja de golpe
  { const s = ST.D; if (vis(s, K.final2 - 0.4, K.resonancia4 + 0.5)) { const U = s.kn.userData;
    const pull = eio(clamp((t - (K.tirar3 - 0.05)) / 0.6)); U.ph.position.x = 0.05 * pull; U.fluid.scale.set(0.045 + 0.03 * pull, 0.11, 0.11); U.fluid.position.x = 0.025 * pull;
    const pr = eio(clamp((t - (K.presion3 - 0.05)) / 0.5)); s.g.userData.nd.rotation.z = -1.9 + 3.2 * pr;
    const b = t - (K.golpe3 - 0.02), bk = b > 0 ? (b < 0.12 ? eo(b / 0.12) * 1.15 : 1 + 0.15 * Math.exp(-(b - 0.12) * 7) * Math.cos((b - 0.12) * 30)) : 0;
    U.bub.scale.setScalar(Math.max(0.0001, 0.055 * bk)); U.bub.position.x = 0.025 * pull;
    s.sp.visible = b > 0 && b < 0.9; if (s.sp.visible) burst(s.sp, s.top.worldToLocal(U.bub.getWorldPosition(v3(0, 0, 0))), t, K.golpe3, 0.22, 0.8, false, 0.2);
  } }
  // L4: la resonancia: en el monitor aparece la cavidad y el reloj llega a 0,31 s
  { const s = ST.C; if (vis(s, K.burbuja3 - 0.4, K.ruido5)) s.scr.userData.draw(clamp((t - (K.grabaron4 - 0.1)) / (K.segundo4 + 0.3 - K.grabaron4))); }
  // L5–L6: el debate (la burbuja que nace y la que se rompe) y el reloj de 20 minutos (la burbuja se encoge despacio)
  { const s = ST.K; if (vis(s, K.segundo4 - 0.3, K.donald7 - 0.3)) { const A = s.j1.userData, Bq = s.j2.userData;
    const na = t - (K.nacer5 - 0.05), nk = na > 0 ? (na < 0.15 ? eo(na / 0.15) * 1.12 : 1 + 0.12 * Math.exp(-(na - 0.15) * 6) * Math.cos((na - 0.15) * 25)) : 0.0001;
    const shrink = 1 - 0.85 * eio(clamp((t - K.durar6) / (K.crujir6 - K.durar6)));
    A.bub.scale.setScalar(Math.max(0.0001, 0.055 * nk * shrink));
    const ro = t - (K.romperse5 - 0.05); Bq.bub.scale.setScalar(ro > 0 ? Math.max(0.0001, 0.055 * (1 - eo(clamp(ro / 0.1)))) : 0.055);
    Bq.bits.forEach((b, i) => { const a = i * 0.7, u = Math.max(0, ro); b.visible = ro > 0 && ro < 1.4; if (!b.visible) return; b.scale.setScalar(0.011 * (1 - clamp(u / 1.4))); b.position.set(Math.cos(a) * 0.06 * eo(clamp(u / 0.3)), 0.13 + 0.05 * u + Math.sin(a * 1.7) * 0.03, Math.sin(a) * 0.05 * eo(clamp(u / 0.3))); });
    const ck = eio(clamp((t - K.durar6) / (K.minutos6 + 1.0 - K.durar6))); s.clk.userData.hd.rotation.z = -ck * Math.PI * 2;
    s.clk.userData.sweep.geometry.dispose(); s.clk.userData.sweep.geometry = new THREE.CircleGeometry(0.134, 48, Math.PI / 2 - ck * Math.PI * 2, Math.max(0.001, ck * Math.PI * 2));
  } }
  // L7: las dos manos de Unger: la izquierda cruje una y otra vez (dos veces al día, 50 años) y la derecha no
  { const s = ST.P; if (vis(s, K.minutos6, K.tuvo8 + 0.5)) {
    const cyc = t > K.crujio7 - 0.3 && t < K.anos7 + 0.4, ph = (t - (K.crujio7 - 0.3)) / 0.55;
    const ang = [0, 1, 2, 3, 4].map(i => cyc ? flexAt(((ph % 1) + 1) % 1 * 0.55, 0.12 + i * 0.06) * 0.9 : 0); handPose(s.hL, ang);
    s.hL.userData.flashes.forEach((f, i) => { const u = (((ph % 1) + 1) % 1) * 0.55 - (0.12 + i * 0.06); const k = cyc && u > 0 && u < 0.3 ? Math.exp(-u * 9) : 0; f.scale.setScalar(Math.max(0.0001, 0.16 * k)); f.material.opacity = Math.min(1, k * 1.3); });
    handPose(s.hR, [0, 0, 0, 0, 0]);
  } }
  // L8: las radiografías limpias, el premio y las 215 personas
  { const s = ST.B; if (vis(s, K.anos7 - 0.3, K.crujes9 + 0.2)) {
    show(s.pr, pop(t, K.ig8 - 0.15, 0.45));
    const t0 = K.n215 - 0.15; for (let i = 0; i < 215; i++) { const p = s.fpos[i], k = pop(t, t0 + (i % 22) * 0.012 + Math.floor(i / 22) * 0.05, 0.3); _o.position.set(p.x, 0.08 * (1 - clamp(k)), p.z); _o.rotation.set(0, Math.PI, 0); _o.scale.setScalar(Math.max(0.0001, k * 1.1)); _o.updateMatrix(); s.figs.setMatrixAt(i, _o.matrix); }
    s.figs.instanceMatrix.needsUpdate = true;
  } }
  for (const k in ST) { const s = ST[k]; if (s.Z.visible) s.cone.material.uniforms.op.value = 0.055; }
}
const _o = new THREE.Object3D();
// ---------------------------------------------------------------- cámara: frente a la mano gigante en rayos X → retrocede en línea recta (sin girar) hasta el primer
// pedestal → la resonancia → el debate y el reloj → las manos de Unger → las radiografías y las 215 personas → vuelve rodeando la mano hasta la pose
// del primer fotograma (bucle).
let CKS = [], CUTS = [];
const stCam = (a, dist, h, dx = 0) => { const p = stP(a, dist, h).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const stLook = (a, y, dx = 0, r = R_ST) => { const p = stP(a, r, y).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const T0 = [0.5, 2.0, 4.2], L0 = [0, 2.35, 0], T1 = [0.49, 1.995, 4.15], L1 = [0, 2.345, 0], Tm = [0.51, 2.005, 4.25], Lm = [0, 2.355, 0];
function buildCam() {
  const { D, C, K: KK, P, B } = ANG;
  const hold = (t, a, d, h, dx, ly, ldx, lr = R_ST, f = 34) => [t, stCam(a, d, h, dx), stLook(a, ly, ldx, lr), f];
  const A = [
    [-0.4, Tm, Lm, 40], [0.0, T0, L0, 40], [0.5, T1, L1, 40],
    [K.artritis1, [0.9, 2.1, 4.0], [0, 2.3, 0], 40], [K.n50, [0.3, 1.9, 4.5], [0, 2.2, 0], 40], [K.razon2, [-0.4, 2.2, 4.3], [0, 2.3, 0], 40],
    [K.final2 + 0.25, [0.4, 1.9, 4.6], [0, 2.1, 0], 40],
    // al primer pedestal sin girar: retrocede mirando a la mano, pasa por encima del pedestal y baja delante de él
    [K.final2 + 0.79, [1.55, 1.75, 5.7], [0.0, 1.9, 0.0], 40], [K.final2 + 1.43, [2.7, 1.7, 6.85], [0.2, 1.4, 0.8], 40],
    [K.final2 + 1.83, [3.7, 1.75, 7.8], [2.3, 0.75, 4.6], 40], [K.final2 + 2.28, stCam(D, 10.3, 1.35, -0.15), stLook(D, 0.8, -0.05), 38],
    [K.tirar3, stCam(D, 9.55, 1.05, -0.05), stLook(D, 0.8, -0.02, R_ST + 0.06), 36], [K.presion3, stCam(D, 9.62, 1.08, 0.14), stLook(D, 0.8, 0.14, R_ST), 36],
    [K.golpe3, stCam(D, 9.38, 0.98, 0.0), stLook(D, 0.8, 0.0, R_ST + 0.06), 33], hold(K.n2015 - 0.25, D, 9.36, 0.97, 0.0, 0.8, 0.0, R_ST + 0.06, 33),
    [K.n2015 + 0.35, stCam(C, 10.15, 1.2, 0.04), stLook(C, 0.82, 0.04), 38], [K.resonancia4, stCam(C, 9.6, 1.05, 0.15), stLook(C, 0.95, 0.2, R_ST - 0.05), 35],
    [K.tercio4, stCam(C, 9.45, 1.02, 0.22), stLook(C, 0.97, 0.27, R_ST), 34], hold(K.discute5 - 0.45, C, 9.45, 1.02, 0.23, 0.97, 0.28, R_ST, 34),
    [K.discute5 + 0.15, stCam(KK, 9.75, 1.0, 0.0), stLook(KK, 0.72, 0.0, R_ST + 0.05), 37], [K.nacer5, stCam(KK, 9.6, 0.95, -0.12), stLook(KK, 0.7, -0.12, R_ST + 0.1), 35],
    [K.romperse5, stCam(KK, 9.6, 0.95, 0.12), stLook(KK, 0.7, 0.12, R_ST + 0.1), 35], [K.durar6, stCam(KK, 9.8, 1.1, 0.0), stLook(KK, 0.95, 0.0, R_ST - 0.15), 36],
    [K.crujir6, stCam(KK, 9.7, 1.0, -0.15), stLook(KK, 0.8, -0.15, R_ST), 35], hold(K.respuesta7 - 0.25, KK, 9.72, 1.0, -0.16, 0.8, -0.16, R_ST, 35),
    [K.respuesta7 + 0.35, stCam(P, 10.0, 1.15, 0.0), stLook(P, 0.95, 0.0), 37], [K.crujio7, stCam(P, 9.75, 1.05, -0.04), stLook(P, 0.95, -0.04, R_ST), 36],
    [K.dos7, stCam(P, 9.75, 1.05, -0.05), stLook(P, 0.96, -0.05), 36], hold(K.tuvo8 - 0.25, P, 9.8, 1.07, 0.0, 0.96, 0.0, R_ST, 36),
    [K.tuvo8 + 0.35, stCam(B, 10.2, 1.25, 0.0), stLook(B, 0.95, 0.0, R_ST - 0.1), 37], [K.ig8, stCam(B, 9.8, 1.05, 0.3), stLook(B, 0.85, 0.35, R_ST), 35],
    [K.n215, stCam(B, 9.9, 1.35, 0.0), stLook(B, 0.62, 0.0, R_ST + 0.2), 37], hold(K.tu9 - 0.25, B, 9.95, 1.36, 0.0, 0.62, 0.0, R_ST + 0.2, 37),
    // vuelta: sale de la estación hacia el hueco de 205° y rodea la mano hasta ponerse delante
    [K.tu9 + 0.3, stCam(B, 10.5, 1.75, -1.7), stLook(B, 1.0, -0.7), 38], [K.mandaselo9 + 0.4, [5.2 * Math.sin(205 * D2), 2.1, 5.2 * Math.cos(205 * D2)], [0, 2.1, 0], 42],
    [END - 2.0, [-3.9, 2.1, -0.4], [0, 2.2, 0], 42], [END - 1.15, [-2.3, 2.05, 3.4], [0, 2.3, 0], 41], [END - 0.4, Tm, Lm, 40],
    [END, T0, L0, 40], [END + 0.5, T1, L1, 40],
  ];
  CKS = [A];
}
function camAt(t) {
  const st = camKeys(t, CKS[0]);
  const u = t - T_HIT; if (u > 0 && u < 0.35) { const a = 0.008 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; }
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[T_HIT, 0.06], [K.golpe3, 0.06], [K.nacer5, 0.03], [K.romperse5, 0.03], [K.ninguna8, 0.03], [K.ig8, 0.04]])
    if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { return 0; }
function coneFade(cone, base, t, st, k = 1) {        // el haz se apaga solo mientras la cámara atraviesa su superficie (si no, la pantalla se pone blanca); k: cuánto se aplica
  const w = new THREE.Vector3(); cone.getWorldPosition(w); const R0 = cone.geometry.parameters.radiusBottom, H = cone.geometry.parameters.height, y = st.p.y - (w.y - H / 2);
  const r = R0 + (0.06 - R0) * clamp(y / H), d = Math.hypot(st.p.x - w.x, st.p.z - w.z); cone.material.uniforms.op.value = base * (1 - k + k * clamp((Math.abs(d - r) - 0.05) / 0.2));
}
function stageAt(t, st) {
  NOW = t; centerAt(t, st); stationsAt(t);
  const fk = t > K.tu9 - 0.2 && t < END - 1.3 ? 1 : win(t, K.final2 + 0.25, 0.3) * (1 - win(t, K.final2 + 2.6, 0.3));
  coneFade(S.ctrCone, 0.05, t, st, fk); for (const k in ST) if (ST[k].Z.visible) coneFade(ST[k].cone, 0.055, t, st, fk);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.2, 1.2);
  rigAt(c, yaw, k, 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0.0; R.hemi.intensity = 0.12;
}
// ---------------------------------------------------------------- HUD (como en Derecho): cabecera con la pregunta pendiente (¿da artritis?), cifras grandes y
// rótulos con línea guía.
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A';
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('TUS DEDOS', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText('QUÉ PASA CUANDO TE LOS CRUJES', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('ASÍ FUNCIONA', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('TU CUERPO', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('POR DENTRO', 1024, 178);
  const mk = win(t, K.tenian2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = '¿DA ARTRITIS? · ???', col = HC.red, blink = true;
    if (t > K.respuesta7 + 0.3) { txt = '50 AÑOS DE PRUEBA (UNGER)'; col = HG; blink = false; }
    if (t > K.ninguna8) { txt = 'NO: NI EN UNA MANO NI EN LA OTRA'; col = HC.green; blink = false; }
    if (t > K.tu9) { txt = '¿TÚ TE LOS CRUJES?'; col = HC.white; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = mk; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath();
    hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
    hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
    hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y);
  }
  hg.restore();
}
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function lab(o, x, y, z, txt, sub, k, opt) { if (k <= 0.01 || !o.visible) return; callout(wpo(o, x, y, z), txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1430;
  // L1: 50 años
  { const a = cw(t, K.medico1 - 0.05, K.tenian2 - 0.32); if (a > 0.01) { bigText(Math.round(1 + 49 * eo(clamp((t - K.medico1) / (K.anos1 + 0.2 - K.medico1)))) + ' AÑOS', W / 2, Y, 110, HG, a, { glow: 18, type: false, dark: 30 }); bigText('UN MÉDICO LO COMPROBÓ EN SU PROPIA MANO', W / 2, Y + 88, 26, HC.white, a, { dark: 20 }); } }
  // L2: ¿tenían razón? (la «?» roja junto a la mano)
  { const a = cw(t, K.tenian2 - 0.05, K.cada3 - 0.1); if (a > 0.01) { bigText('¿TENÍAN RAZÓN?', W / 2, Y + 10, 72, HC.white, a, { glow: 10, type: false, dark: 28 });
      if (S.ctr.visible) { const P = proj(wpo(S.hand, 0.0, 0.42, 0.08)); if (P.ok) bigText('?', P.x + 190, P.y - 120, 170, HC.red, a, { glow: 30, type: false }); } } }
  // L3: la cápsula con líquido, la presión cae, la burbuja
  { const D = ST.D; const U = D.kn.userData;
    if (D.Z.visible) { lab(U.caps, 0.0, 0.9, 0.3, 'CÁPSULA', 'LLENA DE LÍQUIDO SINOVIAL', cw(t, K.capsula3, K.tirar3 - 0.1), { dx: 120, dy: -200, color: HG });
      lab(D.g, 0, 0.1, 0.02, 'PRESIÓN', 'DENTRO DEL NUDILLO', cw(t, K.presion3, K.gas3 - 0.1), { dx: -140, dy: -150, color: HC.red });
      lab(U.bub, 0, 1.0, 0, 'BURBUJA DE GAS', 'SE FORMA DE GOLPE', cw(t, K.golpe3 + 0.1, K.n2015 - 0.1), { dx: 130, dy: -190, color: HC.teal }); }
    const a = cw(t, K.tirar3 - 0.05, K.presion3 - 0.32); if (a > 0.01) bigText('TIRAS DEL DEDO', W / 2, Y + 20, 64, HC.white, a, { glow: 8, type: false, dark: 26 });
    const b = cw(t, K.presion3 - 0.05, K.golpe3 - 0.32); if (b > 0.01) bigText('LA PRESIÓN CAE', W / 2, Y + 20, 72, HC.red, b, { glow: 14, type: false, dark: 28 });
    const c = cw(t, K.golpe3 - 0.05, K.n2015 - 0.32); if (c > 0.01) { bigText('¡BURBUJA!', W / 2, Y, 110, HC.teal, c, { glow: 22, type: false, dark: 30 }); bigText('EL GAS DEL LÍQUIDO SE JUNTA DE GOLPE', W / 2, Y + 86, 26, HC.white, c, { dark: 20 }); } }
  // L4: 2015, la resonancia: 0,31 s
  { const C = ST.C; const a = cw(t, K.n2015 - 0.05, K.menos4 - 0.32); if (a > 0.01) { bigText('2015', W / 2, Y, 110, HC.white, a, { glow: 14, type: false, dark: 30 }); bigText('LA PRIMERA VEZ QUE SE GRABA EN UNA RESONANCIA', W / 2, Y + 86, 24, HG, a, { dark: 20 }); }
    const b = cw(t, K.menos4 - 0.05, K.discute5 - 0.32); if (b > 0.01) { bigText('0,31 s', W / 2, Y, 120, HG, b, { glow: 22, type: false, dark: 30 }); bigText('MENOS DE UN TERCIO DE SEGUNDO', W / 2, Y + 90, 28, HC.white, b, { dark: 20 }); }
    if (C.Z.visible) lab(C.scr, 0, 0.56, 0.02, 'RESONANCIA MAGNÉTICA', 'PLOS ONE, 2015', cw(t, K.grabaron4, K.menos4 - 0.1), { dx: -140, dy: -170, color: HC.white }); }
  // L5–L6: ¿al nacer o al romperse? · 20 minutos
  { const Kk = ST.K; const a = cw(t, K.discute5 - 0.05, K.burbuja6 - 0.32); if (a > 0.01) { bigText('¿AL NACER…', W / 2, Y - 10, 64, HC.white, a, { glow: 8, type: false, dark: 26 }); bigText('O AL ROMPERSE?', W / 2, Y + 62, 64, HG, cw(t, K.romperse5 - 0.1, K.burbuja6 - 0.32), { glow: 12, type: false, dark: 26 }); bigText('LOS CIENTÍFICOS AÚN NO SE PONEN DE ACUERDO', W / 2, Y + 122, 24, HC.white, a, { dark: 18 }); }
    if (Kk.Z.visible) { lab(Kk.j1, 0, 0.42, 0, '¿AL NACER?', 'RESONANCIA, 2015', cw(t, K.nacer5 - 0.05, K.burbuja6 - 0.1), { dx: -110, dy: -180, color: HC.teal });
      lab(Kk.j2, 0, 0.42, 0, '¿AL ROMPERSE?', 'ESTUDIOS DE 1971 Y 2018', cw(t, K.romperse5 - 0.05, K.burbuja6 - 0.1), { dx: 110, dy: -180, color: HG }); }
    const b = cw(t, K.durar6 - 0.05, K.respuesta7 - 0.32); if (b > 0.01) { const n = Math.round(20 * eio(clamp((t - K.durar6) / (K.minutos6 + 1.0 - K.durar6)))); bigText(n + ' MIN', W / 2, Y, 120, HG, b, { glow: 20, type: false, dark: 30 }); bigText(t < K.eso6 ? 'LA BURBUJA PUEDE SEGUIR AHÍ' : 'Y MIENTRAS, ESE DEDO NO VUELVE A CRUJIR', W / 2, Y + 90, 28, HC.white, b, { dark: 20 }); } }
  // L7: Donald Unger, 50 años crujiendo una sola mano
  { const P = ST.P; const a = cw(t, K.donald7 - 0.05, K.dos7 - 0.32); if (a > 0.01) { bigText('DONALD UNGER', W / 2, Y, 76, HC.white, a, { glow: 10, type: false, dark: 28 }); bigText('MÉDICO · SOLO LA MANO IZQUIERDA', W / 2, Y + 74, 28, HG, cw(t, K.sola7 - 0.1, K.dos7 - 0.32), { dark: 20 }); }
    const b = cw(t, K.dos7 - 0.05, K.tuvo8 - 0.32); if (b > 0.01) { bigText(t < K.n50b - 0.05 ? '2 VECES AL DÍA' : '50 AÑOS', W / 2, Y, 100, HG, b, { glow: 18, type: false, dark: 30 }); bigText('MÁS DE 36.500 CRUJIDOS', W / 2, Y + 84, 28, HC.white, cw(t, K.n50b - 0.1, K.tuvo8 - 0.32), { dark: 20 }); }
    if (P.Z.visible) { lab(P.hL, 0.03, 0.62, 0.05, 'LA IZQUIERDA', 'SE LA CRUJÍA', cw(t, K.sola7, K.tuvo8 - 0.1), { dx: -40, dy: -290, color: HG });
      lab(P.hR, 0.03, 0.62, 0.05, 'LA DERECHA', 'NO (PARA COMPARAR)', cw(t, K.mano7, K.tuvo8 - 0.1), { dx: 40, dy: -150, color: HC.white }); } }
  // L8: ninguna artritis · Ig Nobel · 215 personas
  { const Bs = ST.B; const a = cw(t, K.ninguna8 - 0.05, K.ig8 - 0.32); if (a > 0.01) { bigText('NINGUNA ARTRITIS', W / 2, Y, 70, HC.green, a, { glow: 14, type: false, dark: 28 }); bigText('NI EN UNA MANO NI EN LA OTRA', W / 2, Y + 74, 28, HC.white, a, { dark: 20 }); }
    const b = cw(t, K.ig8 - 0.05, K.n215 - 0.32); if (b > 0.01) { bigText('IG NOBEL', W / 2, Y, 100, HG, b, { glow: 20, type: false, dark: 30 }); bigText('MEDICINA · 2009', W / 2, Y + 84, 28, HC.white, b, { dark: 20 }); }
    const c = cw(t, K.n215 - 0.05, K.tu9 - 0.32); if (c > 0.01) { bigText(Math.round(215 * eo(clamp((t - K.n215 + 0.05) / 0.9))) + ' PERSONAS', W / 2, Y, 84, HC.white, c, { glow: 10, type: false, dark: 28 }); bigText('ESTUDIO DE 2011: LA MISMA CONCLUSIÓN', W / 2, Y + 80, 28, HC.green, c, { dark: 20 }); }
    if (Bs.Z.visible) { const F = Bs.lb.userData.films; lab(F[0], 0, 0.1, 0.005, 'SIN ARTRITIS', null, cw(t, K.ninguna8 - 0.1, K.ig8 - 0.1), { dx: -110, dy: -150, color: HC.green }); lab(F[1], 0, 0.1, 0.005, 'SIN ARTRITIS', null, cw(t, K.ninguna8 + 0.1, K.ig8 - 0.1), { dx: 110, dy: -150, color: HC.green }); } }
  // L9: ¿tú te los crujes? · mándaselo
  { const a = cw(t, K.tu9 - 0.05, K.mandaselo9 - 0.3); if (a > 0.01) bigText('¿TÚ TE LOS CRUJES?', W / 2, Y + 20, 68, HC.white, a, { glow: 10, type: false, dark: 28 });
    const m = cw(t, K.mandaselo9 - 0.05, END - 0.6); if (m > 0.01) { bigText('MÁNDASELO A QUIEN TE DICE', W / 2, Y - 10, 40, HC.white, m, { dark: 24 }); bigText('QUE TE DARÁ ARTRITIS', W / 2, Y + 60, 56, HG, cw(t, K.dara9 - 0.1, END - 0.6), { glow: 14, dark: 26 }); } }
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
  if (S.ctrCone) S.ctrCone.visible = false;      // en la portada, sin el haz del centro (de frente se ve como columnas)
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
  mats(); buildMats(); buildRig(); buildFloor(); buildFlow();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5;
    scene.environmentRotation.y = Math.PI / 2; }      // girado 90°: si no, el suelo pulido refleja un panel de luz del entorno detrás del pedestal P y se ve todo blanco
  scene.fog = new THREE.FogExp2(0x000000, 0.035);
  buildCenter(); buildStations();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
