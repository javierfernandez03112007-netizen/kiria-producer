// «Medicina por dentro»: un martillo de reflejos gigante sobre cien figuritas con bata, la vitrina de especialista, los libros y el negatoscopio,
// un círculo de estaciones (una por bloque de la carrera) con objetos realistas, el campo de los 15.000 del MIR y, al final, la residencia, los
// once años y quirófano o consulta. window.renderAt(t) dibuja el instante t (60 fps).
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
// ---------------------------------------------------------------- «Derecho por dentro»: materiales realistas (madera, latón, mármol, piel, papel, tela)
// y las piezas de cada estación. Escala: las figuritas de los estudiantes miden ≈ 0,05; las estaciones están en un círculo de radio R_ST.
const R_ST = 8.0, R_CAM = 10.6;
const ANG = { CS: 30, LF: 72, CL: 114, HO: 156, MI: 198, RE: 262, AN: 304, DU: 346 };
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
  const g = new THREE.Group(); const base = rbox(w + 0.06, 0.08, w + 0.06, M.wood, 0.01); base.rotation.x = Math.PI / 2; base.position.y = 0.04; g.add(base);
  const glass = mesh(new THREE.BoxGeometry(w, h, w), M.glass, false); glass.position.y = 0.08 + h / 2; glass.renderOrder = 7; g.add(glass);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, w)), new THREE.LineBasicMaterial({ color: 0xcfa860 })); frame.position.copy(glass.position); g.add(frame);
  const cap = rbox(w + 0.04, 0.03, w + 0.04, M.wood, 0.008); cap.rotation.x = Math.PI / 2; cap.position.y = 0.08 + h + 0.015; g.add(cap);
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
// ---------------------------------------------------------------- «Medicina por dentro»: materiales y piezas médicas (martillo de reflejos, bata, fonendo,
// cráneo, hueso, corazón, molécula, microscopio, placa de Petri, fármacos, monitor, cerebro, osito, cama de hospital, hoja del MIR, quirófano y consulta)
function buildMedMats() {
  M.coat = new THREE.MeshPhysicalMaterial({ color: 0xf2f4f6, roughness: 0.72, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffffff) });
  M.scrubs = new THREE.MeshPhysicalMaterial({ color: 0x2c7a6c, roughness: 0.78, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x7fd6c4) });
  M.rubber = new THREE.MeshPhysicalMaterial({ color: 0xd6402a, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  M.chrome = metal(0xeef1f5, 0.07);
  M.ivory = new THREE.MeshPhysicalMaterial({ color: 0xe7dcc2, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  M.heart = new THREE.MeshPhysicalMaterial({ color: 0x8c1a22, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  M.heart2 = new THREE.MeshPhysicalMaterial({ color: 0x6e1820, roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  M.vesselR = new THREE.MeshPhysicalMaterial({ color: 0xb8262f, roughness: 0.3, clearcoat: 0.8 });
  M.vesselB = new THREE.MeshPhysicalMaterial({ color: 0x2c4fa8, roughness: 0.3, clearcoat: 0.8 });
  M.brain = new THREE.MeshPhysicalMaterial({ color: 0xe0a69c, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  M.agar = new THREE.MeshPhysicalMaterial({ color: 0xd9a94a, roughness: 0.25, transparent: true, opacity: 0.85, clearcoat: 1 });
  M.dish = new THREE.MeshPhysicalMaterial({ color: 0xe8f0f6, roughness: 0.03, transparent: true, opacity: 0.28, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  M.amber = new THREE.MeshPhysicalMaterial({ color: 0x9a4a0e, roughness: 0.08, transparent: true, opacity: 0.82, clearcoat: 1 });
  M.tubing = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.42, metalness: 0.1 });
  M.enamel = paint(0x15171c, 0.35, 0.8);
  M.mattress = new THREE.MeshStandardMaterial({ color: 0xe9edf0, roughness: 0.85 });
  M.blanket = new THREE.MeshPhysicalMaterial({ color: 0x5d8db4, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0xa9d0f0) });
  M.felt = new THREE.MeshPhysicalMaterial({ color: 0x9a6a3c, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(0xd9b48a) });
  M.dark = new THREE.MeshStandardMaterial({ color: 0x17120e, roughness: 0.9 });
  M.skin = new THREE.MeshPhysicalMaterial({ color: 0xe6d2bd, roughness: 0.5, clearcoat: 0.3 });
  M.bag = new THREE.MeshPhysicalMaterial({ color: 0xdfeef7, roughness: 0.1, transparent: true, opacity: 0.45, clearcoat: 1, depthWrite: false });
  M.liquid = new THREE.MeshPhysicalMaterial({ color: 0xffd36a, roughness: 0.1, transparent: true, opacity: 0.7 });
}
// polígono de esquinas redondeadas (para la cabeza del martillo)
function roundedPoly(P, r) {
  const s = new THREE.Shape(), n = P.length, pt = i => new THREE.Vector2(P[(i + n) % n][0], P[(i + n) % n][1]);
  for (let i = 0; i < n; i++) {
    const c = pt(i), a = pt(i - 1), b = pt(i + 1), p1 = c.clone().add(a.clone().sub(c).normalize().multiplyScalar(r)), p2 = c.clone().add(b.clone().sub(c).normalize().multiplyScalar(r));
    if (i === 0) s.moveTo(p1.x, p1.y); else s.lineTo(p1.x, p1.y); s.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
  }
  s.closePath(); return s;
}
// martillo de reflejos (tipo Taylor): cabeza triangular de goma con la punta hacia abajo y mango de acero cromado
function reflexHammer(s = 1) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(roundedPoly([[-0.27, 0.07], [0.27, 0.07], [0, -0.2]], 0.05), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.022, bevelSegments: 5, curveSegments: 18 });
  geo.translate(0, 0, -0.05); g.add(mesh(geo, M.rubber));
  const slot = mesh(new THREE.BoxGeometry(0.07, 0.035, 0.15), M.chrome); slot.position.y = 0.085; g.add(slot);
  const fer = cyl(0.026, 0.03, 0.07, M.chrome, 28); fer.position.y = 0.13; g.add(fer);
  const handle = cyl(0.015, 0.019, 0.82, M.chrome, 28); handle.position.y = 0.16 + 0.41; g.add(handle);
  for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.0185, 0.0028, 6, 22), M.dsteel); r.rotation.x = Math.PI / 2; r.position.y = 0.62 + i * 0.045; g.add(r); }
  const cap = sph(0.021, M.chrome, 20, 14); cap.position.y = 0.98; g.add(cap);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(s); return g;
}
// fonendo colgado del cuello (U por detrás) y fonendo suelto
function neckSteth(r = 0.05) {
  const g = new THREE.Group(), pts = [v3(r, -0.13, 0.035), v3(r * 1.05, -0.04, 0.012)];
  for (let i = 0; i <= 20; i++) { const a = Math.PI * (i / 20); pts.push(v3(Math.cos(a) * r, 0, -Math.sin(a) * r * 0.9)); }
  pts.push(v3(-r * 1.05, -0.04, 0.012), v3(-r * 0.95, -0.17, 0.045)); g.add(tube(pts, r * 0.085, M.tubing, 90, false, 10));
  const cp = cyl(r * 0.42, r * 0.42, r * 0.2, M.chrome, 28); cp.rotation.x = Math.PI / 2; cp.position.set(-r * 0.95, -0.19, 0.05); g.add(cp);
  const dia = cyl(r * 0.36, r * 0.36, r * 0.05, M.tubing, 28); dia.rotation.x = Math.PI / 2; dia.position.set(-r * 0.95, -0.19, 0.06); g.add(dia);
  for (const dz of [0, 0.02]) { const e = sph(r * 0.13, M.chrome, 12, 8); e.position.set(r * 1.0, -0.14 - dz, 0.04 + dz * 0.4); g.add(e); }
  return g;
}
function stethoscope(s = 1) {
  const g = new THREE.Group();
  const cp = grp(at(cyl(0.034, 0.034, 0.014, M.chrome, 32), 0, 0.007, 0), at(cyl(0.03, 0.03, 0.003, M.tubing, 32), 0, 0.0005, 0), at(cyl(0.008, 0.01, 0.03, M.chrome, 12), 0.03, 0.012, 0, 0, 0, Math.PI / 2));
  g.add(cp); g.userData.cp = cp;
  g.add(tube([v3(0.045, 0.012, 0), v3(0.13, 0.02, 0.05), v3(0.2, 0.012, 0.0), v3(0.24, 0.012, -0.08), v3(0.2, 0.012, -0.16), v3(0.12, 0.012, -0.17)], 0.0065, M.tubing, 60, false, 10));
  for (const sd of [-1, 1]) { g.add(tube([v3(0.12, 0.012, -0.17), v3(0.06, 0.012, -0.17 + sd * 0.04), v3(0.0, 0.012, -0.17 + sd * 0.07)], 0.0055, M.tubing, 20, false, 8));
    g.add(tube([v3(0.0, 0.012, -0.17 + sd * 0.07), v3(-0.07, 0.012, -0.17 + sd * 0.075), v3(-0.12, 0.012, -0.17 + sd * 0.05)], 0.0032, M.chrome, 20, false, 8));
    const e = sph(0.009, M.tubing, 12, 8); e.position.set(-0.125, 0.012, -0.17 + sd * 0.045); g.add(e); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(s); return g;
}
// bata blanca (en percha, para la vitrina), con solapas, botones y bolsillo con bolígrafos
function labCoat(h = 0.46) {
  const k = h / 0.32, g = new THREE.Group();
  g.add(lathe([[0, 0], [0.1 * k, 0], [0.102 * k, 0.01], [0.088 * k, h * 0.3], [0.078 * k, h * 0.6], [0.072 * k, h * 0.86], [0.05 * k, h * 0.95], [0.03 * k, h], [0, h]], 48, M.coat));
  for (const sd of [-1, 1]) {
    const sl = cyl(0.022 * k, 0.03 * k, h * 0.5, M.coat, 20); sl.position.set(sd * 0.088 * k, h * 0.6, 0.0); sl.rotation.z = sd * 0.16; g.add(sl);
    const lap = mesh(new THREE.BoxGeometry(0.028 * k, h * 0.3, 0.005 * k), M.coat); lap.position.set(sd * 0.027 * k, h * 0.77, 0.071 * k); lap.rotation.set(-0.12, 0, -sd * 0.36); g.add(lap);
  }
  const seam = mesh(new THREE.BoxGeometry(0.003 * k, h * 0.62, 0.003 * k), new THREE.MeshStandardMaterial({ color: 0xaab2bb, roughness: 0.8 })); seam.position.set(0, h * 0.33, 0.092 * k); g.add(seam);
  for (let i = 0; i < 3; i++) { const b = cyl(0.006 * k, 0.006 * k, 0.003 * k, M.ceramic, 12); b.rotation.x = Math.PI / 2; b.position.set(0.012 * k, h * (0.24 + i * 0.15), 0.09 * k); g.add(b); }
  const pk = mesh(new THREE.BoxGeometry(0.04 * k, 0.034 * k, 0.004 * k), M.coat); pk.position.set(-0.044 * k, h * 0.68, 0.079 * k); g.add(pk);
  for (const [x, c] of [[-0.054, 0x1b2a4a], [-0.044, 0xb3222b], [-0.036, 0x15171c]]) { const p = cyl(0.0028 * k, 0.0028 * k, 0.03 * k, plastic(c, 0.3), 8); p.position.set(x * k, h * 0.71, 0.081 * k); g.add(p); }
  const st = neckSteth(0.032 * k); st.position.set(0, h * 0.94, 0.0); g.add(st);
  const badge = plateText(0.05 * k, 0.016 * k, [['DR. · EJEMPLO', 0.62, 0.5]], { fg: '#1b2a4a', bg: '#f7f7f4' }); badge.position.set(0.045 * k, h * 0.66, 0.08 * k); g.add(badge);
  return g;
}
function skull(s = 1) {
  const g = new THREE.Group(), m = M.ivory;
  const cr = sph(0.1, m, 48, 32); cr.scale.set(0.88, 0.94, 1.1); cr.position.set(0, 0.135, -0.012); g.add(cr);
  const face = sph(0.075, m, 36, 24); face.scale.set(0.96, 0.86, 0.78); face.position.set(0, 0.078, 0.052); g.add(face);
  const brow = sph(0.05, m, 24, 16); brow.scale.set(1.6, 0.45, 0.6); brow.position.set(0, 0.123, 0.085); g.add(brow);
  for (const sd of [-1, 1]) { const e = sph(0.025, M.dark, 20, 14); e.scale.set(1.05, 0.88, 0.55); e.position.set(sd * 0.033, 0.1, 0.104); g.add(e);
    const ck = sph(0.022, m, 16, 12); ck.scale.set(1.35, 0.75, 1); ck.position.set(sd * 0.058, 0.072, 0.083); g.add(ck);
    const temple = sph(0.03, m, 16, 12); temple.scale.set(0.5, 1, 1.2); temple.position.set(sd * 0.075, 0.1, 0.03); g.add(temple); }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.03, 3), M.dark); nose.position.set(0, 0.07, 0.112); nose.rotation.x = Math.PI; nose.scale.set(1, 1, 0.45); g.add(nose);
  for (let i = 0; i < 10; i++) { const a = (i - 4.5) * 0.15; const t = mesh(new THREE.BoxGeometry(0.0085, 0.013, 0.007), M.ceramic); t.position.set(Math.sin(a) * 0.04, 0.038, 0.072 + Math.cos(a) * 0.033); t.rotation.y = a; g.add(t); }
  const jaw = new THREE.Group(), jp = []; for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + Math.PI * i / 16; jp.push(v3(Math.sin(a) * 0.048, -0.004 * Math.cos(a), Math.cos(a) * 0.05 + 0.055)); }
  jaw.add(tube(jp, 0.012, m, 40, false, 10)); for (const sd of [-1, 1]) jaw.add(tube([v3(sd * 0.048, 0, 0.055), v3(sd * 0.052, 0.04, 0.035), v3(sd * 0.055, 0.06, 0.02)], 0.011, m, 12, false, 8));
  for (let i = 0; i < 10; i++) { const a = (i - 4.5) * 0.15; const t = mesh(new THREE.BoxGeometry(0.0085, 0.011, 0.007), M.ceramic); t.position.set(Math.sin(a) * 0.04, 0.012, 0.072 + Math.cos(a) * 0.033 - 0.002); t.rotation.y = a; jaw.add(t); }
  jaw.position.y = 0.012; g.add(jaw); g.userData.jaw = jaw;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(s); return g;
}
function bone(s = 1) {
  const g = new THREE.Group(), m = M.ivory; g.add(cyl(0.015, 0.017, 0.34, m, 20));
  for (const sd of [-1, 1]) for (const dx of [-1, 1]) { const k = sph(0.025, m, 20, 14); k.position.set(dx * 0.016, sd * 0.172, 0); g.add(k); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
// corazón anatómico (ventrículos, aurículas, aorta, arteria pulmonar, venas cavas y coronarias); late con body.scale
function heartModel(s = 1) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const lv = sph(0.07, M.heart, 40, 28); lv.scale.set(1, 1.22, 0.92); lv.position.set(0.022, 0.06, 0); body.add(lv);
  const rv = sph(0.064, M.heart, 40, 28); rv.scale.set(1, 1.08, 0.86); rv.position.set(-0.034, 0.074, 0.018); body.add(rv);
  const ap = sph(0.05, M.heart, 32, 20); ap.scale.set(0.9, 1.2, 0.85); ap.position.set(0.02, -0.01, 0.005); body.add(ap);
  const atria = sph(0.05, M.heart2, 28, 18); atria.scale.set(1.45, 0.72, 0.95); atria.position.set(-0.004, 0.142, -0.012); body.add(atria);
  body.add(tube([v3(0.012, 0.16, 0), v3(0.02, 0.235, 0.0), v3(-0.02, 0.285, -0.012), v3(-0.065, 0.255, -0.02), v3(-0.075, 0.18, -0.03)], 0.019, M.vesselR, 40, false, 14));
  for (const [x, z] of [[-0.012, -0.004], [0.004, -0.008], [0.02, -0.006]]) body.add(tube([v3(x, 0.27, z), v3(x * 1.4, 0.33, z)], 0.006, M.vesselR, 8, false, 8));
  body.add(tube([v3(-0.032, 0.15, 0.04), v3(-0.024, 0.215, 0.05), v3(0.02, 0.245, 0.04), v3(0.055, 0.235, 0.03)], 0.016, M.vesselB, 30, false, 12));
  body.add(tube([v3(0.06, 0.13, -0.035), v3(0.07, 0.21, -0.045), v3(0.068, 0.29, -0.05)], 0.0135, M.vesselB, 16, false, 10));
  body.add(tube([v3(-0.02, 0.14, 0.055), v3(-0.012, 0.1, 0.075), v3(0.008, 0.05, 0.07), v3(0.02, 0.0, 0.05)], 0.0042, M.vesselR, 30, false, 6));
  body.add(tube([v3(0.04, 0.13, 0.045), v3(0.06, 0.08, 0.05), v3(0.055, 0.02, 0.04)], 0.0038, M.vesselB, 20, false, 6));
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.body = body; g.scale.setScalar(s); return g;
}
const beat = t => { const u = ((t * 1.2) % 1); return Math.exp(-Math.pow((u - 0.08) / 0.045, 2)) + 0.55 * Math.exp(-Math.pow((u - 0.26) / 0.05, 2)); };
// glucosa (bolas y varillas): anillo de seis con sus OH
function molecule(s = 1) {
  const g = new THREE.Group(), C = plastic(0x2a2d33, 0.22), O = plastic(0xd8352a, 0.22), Hm = plastic(0xf2f2f2, 0.28), Bd = M.silver, ring = [];
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, p = v3(Math.cos(a) * 0.09, Math.sin(a) * 0.09, i % 2 ? 0.02 : -0.02); ring.push(p); const o = sph(i === 0 ? 0.03 : 0.026, i === 0 ? O : C, 22, 16); o.position.copy(p); g.add(o); }
  for (let i = 0; i < 6; i++) g.add(bar(ring[i], ring[(i + 1) % 6], 0.008, Bd, 10));
  for (let i = 1; i < 6; i++) { const d = ring[i].clone().setZ(0).normalize(), op = ring[i].clone().addScaledVector(d, 0.07).add(v3(0, 0, i % 2 ? 0.045 : -0.045)), o = sph(0.022, O, 18, 12); o.position.copy(op); g.add(o); g.add(bar(ring[i], op, 0.0065, Bd, 8));
    const hp = op.clone().addScaledVector(d, 0.042), hh = sph(0.014, Hm, 14, 10); hh.position.copy(hp); g.add(hh); g.add(bar(op, hp, 0.005, Bd, 8)); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
// microscopio clásico: base y brazo esmaltados, platina, revólver con tres objetivos, tubo inclinado con ocular, tornillos de enfoque
function microscope(s = 1) {
  const g = new THREE.Group(), en = M.enamel;
  const base = mesh(new THREE.BoxGeometry(0.16, 0.026, 0.2), en); base.position.set(0, 0.013, 0); g.add(base);
  g.add(tube([v3(0, 0.02, -0.07), v3(0, 0.12, -0.085), v3(0, 0.22, -0.07), v3(0, 0.29, -0.03)], 0.022, en, 30, false, 14));
  const stage = mesh(new THREE.BoxGeometry(0.13, 0.012, 0.12), en); stage.position.set(0, 0.13, 0.012); g.add(stage);
  for (const x of [-0.035, 0.035]) { const c = mesh(new THREE.BoxGeometry(0.008, 0.003, 0.06), M.chrome); c.position.set(x, 0.138, 0.02); g.add(c); }
  const slide = mesh(new THREE.BoxGeometry(0.075, 0.002, 0.026), M.dish); slide.position.set(0, 0.1375, 0.015); g.add(slide);
  const smp = cyl(0.008, 0.008, 0.001, plastic(0xc04a8a, 0.4), 16); smp.position.set(0, 0.139, 0.015); g.add(smp); g.userData.sample = smp;
  const lamp = cyl(0.016, 0.02, 0.012, M.chrome, 20); lamp.position.set(0, 0.032, 0.012); g.add(lamp);
  const lightG = sph(0.009, glowM(0xfff2d0, 2.5), 12, 8); lightG.position.set(0, 0.04, 0.012); g.add(lightG); g.userData.light = lightG;
  const head = new THREE.Group(); head.position.set(0, 0.25, 0.012); head.rotation.x = -0.45; g.add(head);
  head.add(at(cyl(0.022, 0.022, 0.15, en, 24), 0, 0.03, 0)); head.add(at(cyl(0.024, 0.024, 0.012, M.chrome, 24), 0, 0.1, 0)); head.add(at(cyl(0.016, 0.016, 0.06, M.tubing, 20), 0, 0.13, 0));
  const turret = cyl(0.035, 0.03, 0.02, M.chrome, 28); turret.position.set(0, 0.205, 0.012); g.add(turret);
  [-0.022, 0, 0.022].forEach((x, i) => { const o = cyl(0.007, 0.009, 0.045 - i * 0.006, M.chrome, 14); o.position.set(x, 0.18, 0.012 + (i === 1 ? 0.01 : 0)); g.add(o); });
  for (const sd of [-1, 1]) { const kn = cyl(0.026, 0.026, 0.016, en, 24); kn.rotation.z = Math.PI / 2; kn.position.set(sd * 0.03, 0.1, -0.08); g.add(kn); const kr = cyl(0.027, 0.027, 0.004, M.chrome, 24); kr.rotation.z = Math.PI / 2; kr.position.set(sd * 0.039, 0.1, -0.08); g.add(kr); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
function petri(s = 1) {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.1, 0], [0.1, 0.022], [0.097, 0.022], [0.097, 0.003], [0, 0.003]], 48, M.dish));
  const agar = cyl(0.096, 0.096, 0.012, M.agar, 48); agar.position.y = 0.009; g.add(agar);
  const cols = []; for (let i = 0; i < 34; i++) { const r = Math.sqrt(hash(i * 3.1)) * 0.082, a = hash(i * 7.7) * 6.28, c = sph(0.004 + hash(i * 1.3) * 0.009, plastic([0xf4ead2, 0xe9cf6a, 0xf8f6f0, 0xd9d0b8][i % 4], 0.35), 14, 8); c.scale.y = 0.35; c.position.set(Math.cos(a) * r, 0.0155, Math.sin(a) * r); g.add(c); cols.push(c); }
  g.userData.cols = cols; g.scale.setScalar(s); return g;
}
function pillBottle(s = 1) {
  const g = new THREE.Group(); g.add(lathe([[0, 0], [0.044, 0], [0.047, 0.01], [0.047, 0.11], [0.04, 0.124], [0.03, 0.13], [0, 0.13]], 40, M.amber));
  const cap = cyl(0.034, 0.034, 0.032, plastic(0xf4f4f2, 0.45), 32); cap.position.y = 0.146; g.add(cap);
  const lt = canvasTex(512, 160, (c, w, h) => { c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#b3222b'; c.fillRect(0, 0, w, 26); c.fillStyle = '#1b2a4a'; c.font = '900 52px Inter'; c.textAlign = 'center'; c.fillText('Rx · 500 mg', w / 2, 88); c.font = '600 26px Inter'; c.fillText('1 COMPRIMIDO CADA 8 H · EJEMPLO', w / 2, 132); });
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0475, 0.0475, 0.06, 40, 1, true, -1.2, 2.4), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.7 })); lab.position.y = 0.06; g.add(lab);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
function blister(s = 1) {
  const g = new THREE.Group(), foil = mesh(new THREE.BoxGeometry(0.17, 0.004, 0.095), metal(0xc9ced6, 0.32)); g.add(foil);
  const pills = []; for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) { const x = -0.064 + c * 0.032, z = -0.022 + r * 0.044;
    const bub = new THREE.Mesh(new THREE.SphereGeometry(0.013, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.dish); bub.scale.set(1, 0.7, 1.35); bub.position.set(x, 0.002, z); g.add(bub);
    const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.0065, 0.016, 6, 12), plastic(r ? 0xf6f3ee : 0xc8323a, 0.3)); p.rotation.x = Math.PI / 2; p.position.set(x, 0.008, z); g.add(p); pills.push(p); }
  g.userData.pills = pills; g.scale.setScalar(s); return g;
}
function syringe(s = 1) {
  const g = new THREE.Group(); g.add(at(cyl(0.012, 0.012, 0.14, M.dish, 24), 0, 0, 0, 0, 0, Math.PI / 2));
  const liq = cyl(0.0105, 0.0105, 0.08, M.liquid, 20); liq.rotation.z = Math.PI / 2; liq.position.x = 0.025; g.add(liq);
  g.add(at(cyl(0.004, 0.004, 0.1, plastic(0xf4f4f2, 0.4), 10), -0.09, 0, 0, 0, 0, Math.PI / 2)); g.add(at(cyl(0.016, 0.016, 0.004, plastic(0xf4f4f2, 0.4), 20), -0.14, 0, 0, 0, 0, Math.PI / 2));
  g.add(at(cyl(0.0012, 0.0012, 0.07, M.chrome, 6), 0.105, 0, 0, 0, 0, Math.PI / 2)); g.add(at(cyl(0.004, 0.003, 0.012, plastic(0x2b78c4, 0.3), 12), 0.074, 0, 0, 0, 0, Math.PI / 2));
  g.scale.setScalar(s); return g;
}
// monitor de constantes: la pantalla se redibuja con el electro en verde
function ecgMonitor(s = 1) {
  const g = new THREE.Group(), box = rbox(0.34, 0.24, 0.07, M.enamel, 0.02); box.position.y = 0.0; g.add(box);
  const scr = canvasPlane(0.3, 0.19, 512, () => {}, { r: 0.3 }); scr.position.set(0, 0.005, 0.0355); g.add(scr);
  scr.material.emissiveMap = scr.userData.tex; scr.material.emissive = new THREE.Color(0xffffff); scr.material.emissiveIntensity = 1.4;
  const stand = grp(at(cyl(0.012, 0.012, 0.16, M.chrome, 12), 0, -0.2, -0.01), at(cyl(0.07, 0.08, 0.012, M.enamel, 28), 0, -0.285, -0.01)); g.add(stand);
  g.userData.scr = scr; g.scale.setScalar(s); return g;
}
function drawEcg(scr, t, alarm = 0) {
  const T = scr.userData.tex, c = T.userData.g, w = T.userData.c.width, h = T.userData.c.height;
  c.fillStyle = '#04100c'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(80,255,170,.08)'; c.lineWidth = 1; for (let x = 0; x < w; x += 24) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  const ecg = u => { const p = ((u % 1) + 1) % 1; return -Math.exp(-Math.pow((p - 0.3) / 0.012, 2)) * 1 + 0.25 * Math.exp(-Math.pow((p - 0.27) / 0.012, 2)) + 0.3 * Math.exp(-Math.pow((p - 0.33) / 0.012, 2)) - 0.12 * Math.exp(-Math.pow((p - 0.12) / 0.03, 2)) - 0.2 * Math.exp(-Math.pow((p - 0.55) / 0.05, 2)); };
  const head = (t * 0.55) % 1; c.lineWidth = 4; c.strokeStyle = alarm > 0.5 ? '#ff5247' : '#5dffa8'; c.shadowColor = c.strokeStyle; c.shadowBlur = 10; c.beginPath();
  for (let i = 0; i <= 200; i++) { const x = i / 200, u = x * 2.2 + Math.floor(t * 0.55) * 2.2, gap = ((x - head + 1) % 1) < 0.06; const y = h * 0.42 + ecg(u + (x > head ? -2.2 : 0)) * h * 0.26; if (gap) { c.moveTo(x * w, y); continue; } i ? c.lineTo(x * w, y) : c.moveTo(x * w, y); }
  c.stroke(); c.shadowBlur = 0; c.fillStyle = '#5dffa8'; c.font = '700 44px SpaceMono'; c.textAlign = 'right'; c.fillText(String(72 + Math.round(Math.sin(t) * 2)), w - 18, h - 22); c.font = '700 20px SpaceMono'; c.fillText('LPM', w - 18, h - 76);
  c.fillStyle = '#7fd0ff'; c.textAlign = 'left'; c.font = '700 34px SpaceMono'; c.fillText('SpO₂ 98', 16, h - 22);
  T.needsUpdate = true;
}
// ruido 3D sencillo (para las circunvoluciones del cerebro)
function n3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, H = (a, b, c) => hash(a * 157.31 + b * 311.73 + c * 74.17 + 0.3);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, k) => a + (b - a) * k;
  return l(l(l(H(xi, yi, zi), H(xi + 1, yi, zi), u), l(H(xi, yi + 1, zi), H(xi + 1, yi + 1, zi), u), v), l(l(H(xi, yi, zi + 1), H(xi + 1, yi, zi + 1), u), l(H(xi, yi + 1, zi + 1), H(xi + 1, yi + 1, zi + 1), u), v), w);
}
function brainModel(s = 1) {
  const g = new THREE.Group(), geo = new THREE.SphereGeometry(0.1, 128, 96), p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize();
    const f = n3(n.x * 9 + 3, n.y * 9 + 7, n.z * 9 + 1) * 0.6 + n3(n.x * 18, n.y * 18, n.z * 18) * 0.4, ridge = 1 - Math.abs(2 * f - 1);
    let r = 0.1 * (1 + 0.05 * Math.pow(ridge, 3) - 0.025);
    r *= 1 - 0.13 * Math.exp(-Math.pow(n.x / 0.05, 2)) * (n.y > -0.35 ? 1 : 0);         // cisura entre los dos hemisferios
    r *= 1 - 0.06 * Math.exp(-Math.pow((n.y + 0.05 - n.z * 0.35) / 0.06, 2)) * (Math.abs(n.x) > 0.55 ? 1 : 0);   // cisura lateral
    v.copy(n).multiplyScalar(r); v.x *= 0.86; v.y *= 0.8; v.z *= 1.12; p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); g.add(mesh(geo, M.brain));
  const cb = sph(0.045, M.brain, 32, 24); cb.scale.set(1.45, 0.66, 0.85); cb.position.set(0, -0.058, -0.075); g.add(cb);
  const stem = cyl(0.018, 0.014, 0.08, M.brain, 16); stem.position.set(0, -0.085, -0.035); stem.rotation.x = 0.35; g.add(stem);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
function teddy(s = 1) {
  const g = new THREE.Group(), m = M.felt, dk = M.dark, add = (o, x, y, z, sx = 1, sy = 1, sz = 1) => { o.position.set(x, y, z); o.scale.set(sx, sy, sz); g.add(o); return o; };
  add(sph(0.05, m, 24, 18), 0, 0.055, 0, 1, 1.15, 0.9); add(sph(0.038, m, 24, 18), 0, 0.135, 0.005);
  for (const sd of [-1, 1]) { add(sph(0.014, m, 14, 10), sd * 0.028, 0.168, 0); add(sph(0.018, m, 14, 10), sd * 0.05, 0.075, 0.012, 1, 1.5, 1); add(sph(0.02, m, 14, 10), sd * 0.03, 0.012, 0.025, 1, 0.8, 1.3); add(sph(0.005, dk, 10, 8), sd * 0.013, 0.143, 0.035); }
  add(sph(0.016, M.ivory, 16, 12), 0, 0.125, 0.034, 1, 0.75, 0.8); add(sph(0.005, dk, 10, 8), 0, 0.131, 0.046);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
// cama de hospital con paciente, gotero (bolsa y vía) y barandillas
function hospitalBed(s = 1) {
  const g = new THREE.Group(), ch = M.chrome;
  const frame = mesh(new THREE.BoxGeometry(0.36, 0.025, 0.72), M.enamel); frame.position.y = 0.13; g.add(frame);
  const mat = rbox(0.34, 0.06, 0.7, M.mattress, 0.02); mat.rotation.x = Math.PI / 2; mat.position.y = 0.17; g.add(mat);
  const pil = rbox(0.24, 0.04, 0.1, M.mattress, 0.018); pil.rotation.x = Math.PI / 2 - 0.25; pil.position.set(0, 0.215, -0.28); g.add(pil);
  const bl = mesh(new THREE.BoxGeometry(0.35, 0.03, 0.42), M.blanket); bl.position.set(0, 0.2, 0.12); g.add(bl);
  for (const z of [-0.36, 0.36]) { const hb = mesh(new THREE.BoxGeometry(0.38, z < 0 ? 0.22 : 0.14, 0.02), M.enamel); hb.position.set(0, 0.13 + (z < 0 ? 0.11 : 0.07), z); g.add(hb); }
  for (const x of [-0.17, 0.17]) for (const z of [-0.33, 0.33]) { const l = cyl(0.008, 0.008, 0.11, ch, 10); l.position.set(x, 0.065, z); g.add(l); const w = cyl(0.014, 0.014, 0.01, M.tubing, 14); w.rotation.z = Math.PI / 2; w.position.set(x, 0.014, z); g.add(w); }
  for (const x of [-0.185, 0.185]) { const r = mesh(new THREE.BoxGeometry(0.008, 0.05, 0.3), ch); r.position.set(x, 0.24, -0.1); g.add(r); }
  const pat = figurine(M.ceramic, 0.95); pat.rotation.x = -Math.PI / 2; pat.position.set(0, 0.205, 0.24); pat.userData.J.shL.rotation.z = -0.15; pat.userData.J.shR.rotation.z = 0.15; g.add(pat); g.userData.pat = pat;
  const pole = cyl(0.006, 0.006, 0.62, ch, 10); pole.position.set(0.24, 0.31, -0.26); g.add(pole); const pb = cyl(0.05, 0.05, 0.01, ch, 20); pb.position.set(0.24, 0.005, -0.26); g.add(pb);
  const hook = cyl(0.003, 0.003, 0.08, ch, 8); hook.rotation.z = Math.PI / 2; hook.position.set(0.24, 0.6, -0.26); g.add(hook);
  const bag = rbox(0.06, 0.09, 0.02, M.bag, 0.01); bag.position.set(0.24, 0.53, -0.26); g.add(bag); const liq = rbox(0.05, 0.06, 0.012, M.liquid, 0.008); liq.position.set(0.24, 0.515, -0.26); g.add(liq);
  g.add(tube([v3(0.24, 0.48, -0.26), v3(0.22, 0.34, -0.2), v3(0.12, 0.26, -0.05), v3(0.09, 0.22, 0.02)], 0.002, M.dish, 30, false, 6));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(s); return g;
}
// figurita con bata (médico/estudiante) o con pijama verde (residente/cirujano): el maniquí con el material de la ropa y fonendo/gorro
function medFig(kind = 'coat', s = 1) {
  const d = figurine(kind === 'scrubs' ? M.scrubs : kind === 'kid' ? plastic(0x5d8db4, 0.45) : M.coat, s), J = d.userData.J; J.head.material = M.skin;
  if (kind === 'coat') { const st = neckSteth(0.075); st.position.set(0, 0.0, 0.0); J.neck.add(st); }
  if (kind === 'scrubs') { const capm = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), M.scrubs); capm.position.set(0, 0.1, 0); capm.scale.set(1, 0.8, 1.05); J.neck.add(capm);
    const mask = mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0x8fc8e8, roughness: 0.8 })); mask.position.set(0, 0.06, 0.07); J.neck.add(mask); }
  return d;
}
// hoja de respuestas del MIR (200 preguntas, 4 opciones); k = cuántas van rellenas; una fallada en rojo
function drawSheet(g, w, h, k, wrong) {
  g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3222b'; g.fillRect(0, 0, w, 54); g.fillStyle = '#fff'; g.font = '900 34px Inter'; g.textAlign = 'left'; g.fillText('EXAMEN MIR · HOJA DE RESPUESTAS', 22, 38);
  g.fillStyle = '#2b2218'; g.font = '600 15px Inter'; g.fillText('200 PREGUNTAS + 10 DE RESERVA · 4 OPCIONES · EJEMPLO', 22, 78);
  const cols = 4, rows = 50, cw = (w - 40) / cols, rh = (h - 110) / rows, n = Math.floor(200 * k);
  for (let q = 0; q < 200; q++) { const c = Math.floor(q / rows), r = q % rows, x0 = 20 + c * cw, y = 100 + r * rh + rh / 2;
    g.fillStyle = 'rgba(40,36,30,.7)'; g.font = '700 9px Inter'; g.textAlign = 'right'; g.fillText(String(q + 1), x0 + 24, y + 3);
    const pick = Math.floor(hash(q * 5.3) * 4);
    for (let o = 0; o < 4; o++) { const x = x0 + 36 + o * 26; g.strokeStyle = 'rgba(40,36,30,.55)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, 8, 3.6, 0, 0, 7); g.stroke();
      if (q < n && o === pick) { g.fillStyle = q === wrong && k > 0.99 ? '#d42a2a' : '#13235c'; g.beginPath(); g.ellipse(x, y, 7, 3, 0, 0, 7); g.fill(); } } }
}
// reloj de pared: las agujas giran (4 h 30 min = 4,5 vueltas del minutero)
function wallClock(s = 1) {
  const g = new THREE.Group(); const rim = cyl(0.16, 0.16, 0.03, M.enamel, 48); rim.rotation.x = Math.PI / 2; g.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.145, 48), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#f6f4ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b1d22'; for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r1 = i % 5 ? 112 : 100; c.save(); c.translate(128, 128); c.rotate(a); c.fillRect(-(i % 5 ? 1 : 3), -122, i % 5 ? 2 : 6, 122 - r1); c.restore(); } c.font = '800 26px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; c.fillText(String(i), 128 + Math.sin(a) * 82, 128 - Math.cos(a) * 82); } }), roughness: 0.6 }));
  face.position.z = 0.016; g.add(face);
  const hh = mesh(new THREE.BoxGeometry(0.012, 0.08, 0.004), M.dark), mm = mesh(new THREE.BoxGeometry(0.008, 0.115, 0.004), M.dark), ss = mesh(new THREE.BoxGeometry(0.003, 0.12, 0.003), plastic(0xd42a2a, 0.3));
  for (const [hand, z] of [[hh, 0.019], [mm, 0.022], [ss, 0.025]]) { hand.geometry.translate(0, hand.geometry.parameters.height / 2 - 0.012, 0); hand.position.z = z; g.add(hand); }
  const pin = cyl(0.008, 0.008, 0.01, M.chrome, 12); pin.rotation.x = Math.PI / 2; pin.position.z = 0.027; g.add(pin);
  g.userData = { hh, mm, ss }; g.scale.setScalar(s); return g;
}
function setClock(c, hours) { const U = c.userData; U.hh.rotation.z = -hours / 12 * Math.PI * 2; U.mm.rotation.z = -(hours % 1) * Math.PI * 2; U.ss.rotation.z = -(hours * 60 % 1) * Math.PI * 2; }
// quirófano en miniatura: mesa de operaciones, lámpara cenital con focos y bandeja de instrumental
function surgery(s = 1) {
  const g = new THREE.Group(), ch = M.chrome;
  const col = cyl(0.04, 0.05, 0.2, M.enamel, 24); col.position.y = 0.1; g.add(col); const base = mesh(new THREE.BoxGeometry(0.22, 0.02, 0.3), M.enamel); base.position.y = 0.01; g.add(base);
  const top = rbox(0.2, 0.62, 0.04, plastic(0x2a3a4a, 0.4), 0.015); top.rotation.x = Math.PI / 2; top.position.y = 0.22; g.add(top);
  const sheet = mesh(new THREE.BoxGeometry(0.22, 0.012, 0.4), M.scrubs); sheet.position.set(0, 0.245, 0.06); g.add(sheet);
  const pat = figurine(M.ceramic, 0.85); pat.rotation.x = -Math.PI / 2; pat.position.set(0, 0.25, 0.2); g.add(pat);
  const arm = tube([v3(0.3, 0.0, -0.3), v3(0.3, 0.75, -0.3), v3(0.18, 0.8, -0.15), v3(0.05, 0.72, 0.0)], 0.012, ch, 30, false, 10); g.add(arm);
  const lamp = new THREE.Group(); lamp.position.set(0.0, 0.66, 0.02); lamp.rotation.x = 0.15; g.add(lamp);
  lamp.add(at(cyl(0.16, 0.13, 0.05, plastic(0xe9edf0, 0.35), 40), 0, 0, 0)); const leds = [];
  for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI * 2, r = i ? 0.085 : 0, l = cyl(0.03, 0.03, 0.004, glowM(0xfff6e8, 4), 20); l.position.set(Math.cos(a) * r, -0.027, Math.sin(a) * r); lamp.add(l); leds.push(l); }
  g.userData.leds = leds; g.userData.lamp = lamp;
  const tray = mesh(new THREE.BoxGeometry(0.16, 0.012, 0.1), ch); tray.position.set(-0.24, 0.2, 0.05); g.add(tray); const tl = cyl(0.006, 0.006, 0.2, ch, 8); tl.position.set(-0.24, 0.1, 0.05); g.add(tl);
  for (let i = 0; i < 4; i++) { const ins = mesh(new THREE.BoxGeometry(0.004, 0.003, 0.08), ch); ins.position.set(-0.29 + i * 0.03, 0.208, 0.05); g.add(ins); }
  g.add(at(cyl(0.12, 0.12, 0.002, glowM(0xfff2d6, 0.0), 40), 0, 0.252, 0.05));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(s); return g;
}
// consulta: mesa con ordenador, silla, fonendo y receta
function consult(s = 1) {
  const g = new THREE.Group();
  const desk = mesh(new THREE.BoxGeometry(0.5, 0.025, 0.28), M.woodL); desk.position.y = 0.2; g.add(desk);
  for (const x of [-0.23, 0.23]) { const l = mesh(new THREE.BoxGeometry(0.02, 0.2, 0.26), M.woodL); l.position.set(x, 0.1, 0); g.add(l); }
  const scr = rbox(0.2, 0.13, 0.012, M.enamel, 0.006); scr.position.set(0.05, 0.3, -0.07); g.add(scr);
  const disp = canvasPlane(0.185, 0.115, 256, (c, w, h) => { c.fillStyle = '#e9f2f8'; c.fillRect(0, 0, w, h); c.fillStyle = '#2b78c4'; c.fillRect(0, 0, w, 22); c.fillStyle = '#1b2a4a'; c.font = '800 14px Inter'; c.fillText('HISTORIA CLÍNICA · EJEMPLO', 8, 50); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(27,42,74,.35)'; c.fillRect(8, 64 + i * 12, 150 - (i % 3) * 30, 5); } }, { r: 0.4 });
  disp.position.set(0.05, 0.3, -0.0635); disp.material.emissiveMap = disp.userData.tex; disp.material.emissive = new THREE.Color(0xffffff); disp.material.emissiveIntensity = 0.8; g.add(disp);
  const st = cyl(0.008, 0.008, 0.07, M.enamel, 10); st.position.set(0.05, 0.245, -0.07); g.add(st);
  const kb = mesh(new THREE.BoxGeometry(0.14, 0.006, 0.045), M.enamel); kb.position.set(0.05, 0.216, 0.04); g.add(kb);
  const ch2 = chair(0.22); ch2.position.set(0.05, 0.0, 0.24); ch2.rotation.y = Math.PI; g.add(ch2); const ch3 = chair(0.16); ch3.scale.setScalar(0.9); ch3.position.set(-0.12, 0, -0.26); g.add(ch3);
  const stt = stethoscope(0.45); stt.position.set(-0.15, 0.214, 0.04); stt.rotation.y = 0.6; g.add(stt);
  const rx = canvasPlane(0.07, 0.1, 128, (c, w, h) => { c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b2a4a'; c.font = '900 24px Inter'; c.fillText('Rx', 10, 30); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(27,42,74,.4)'; c.fillRect(10, 44 + i * 12, 90 - (i % 2) * 30, 4); } }); rx.rotation.x = -Math.PI / 2; rx.position.set(-0.04, 0.2135, 0.05); rx.rotation.z = 0.2; g.add(rx);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(s); return g;
}
// negatoscopio con una radiografía de tórax (la sombra que «falla» se marca en rojo)
function lightbox(s = 1) {
  const g = new THREE.Group(), box = mesh(new THREE.BoxGeometry(0.5, 0.38, 0.04), M.enamel); box.position.y = 0.19; g.add(box);
  const xr = canvasTex(512, 400, (c, w, h) => { c.fillStyle = '#05070a'; c.fillRect(0, 0, w, h);
    const gl = (x, y, rx, ry, a) => { const r = c.createRadialGradient(x, y, 2, x, y, Math.max(rx, ry)); r.addColorStop(0, `rgba(210,220,230,${a})`); r.addColorStop(1, 'rgba(210,220,230,0)'); c.fillStyle = r; c.save(); c.translate(x, y); c.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); c.translate(-x, -y); c.beginPath(); c.arc(x, y, Math.max(rx, ry), 0, 7); c.fill(); c.restore(); };
    gl(w / 2, h * 0.55, 230, 200, 0.18); c.strokeStyle = 'rgba(225,232,240,.75)'; c.lineWidth = 7; c.beginPath(); c.moveTo(w / 2, 20); c.lineTo(w / 2, h - 10); c.stroke();
    for (let i = 0; i < 9; i++) for (const sd of [-1, 1]) { c.strokeStyle = `rgba(220,228,236,${0.5 - i * 0.03})`; c.lineWidth = 5; c.beginPath(); const y = 70 + i * 32; c.moveTo(w / 2 + sd * 10, y); c.quadraticCurveTo(w / 2 + sd * 190, y - 30, w / 2 + sd * 170, y + 60); c.stroke(); }
    gl(w / 2 + 30, h * 0.66, 70, 60, 0.55); gl(w / 2 - 95, h * 0.42, 20, 20, 0.85);
    c.strokeStyle = 'rgba(220,228,236,.6)'; c.lineWidth = 9; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(w / 2 + sd * 30, 40); c.quadraticCurveTo(w / 2 + sd * 120, 30, w / 2 + sd * 200, 60); c.stroke(); } });
  const film = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.33), new THREE.MeshStandardMaterial({ map: xr, emissiveMap: xr, emissive: 0xffffff, emissiveIntensity: 1.25, roughness: 0.5 })); film.position.set(0, 0.19, 0.021); g.add(film);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.034, 0.042, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.25, 0.22).multiplyScalar(3), toneMapped: false, transparent: true, opacity: 0, depthWrite: false })); ring.position.set(-0.0815, 0.19 + 0.33 * (0.5 - 0.42), 0.024); g.add(ring);
  const stand = grp(at(cyl(0.01, 0.01, 0.12, M.chrome, 10), 0, -0.06, -0.01), at(cyl(0.08, 0.09, 0.012, M.enamel, 28), 0, -0.12, -0.01)); g.add(stand);
  g.userData = { ring, film }; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
// figuritas con bata para miles de instancias: cuerpo (bata acampanada) y cabeza aparte (otro color)
function coatGeo(lo = false) {
  const body = new THREE.CylinderGeometry(lo ? 0.008 : 0.0085, lo ? 0.0155 : 0.016, 0.036, lo ? 6 : 16); body.translate(0, 0.018, 0);
  const sh = new THREE.SphereGeometry(lo ? 0.0105 : 0.011, lo ? 6 : 16, lo ? 4 : 8, 0, Math.PI * 2, 0, Math.PI / 2); sh.translate(0, 0.035, 0);
  const parts = [body, sh].map(g => g.index ? g.toNonIndexed() : g); parts.forEach(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
  return mergeGeometries(parts);
}
function headGeo(lo = false) { const h = new THREE.SphereGeometry(lo ? 0.0075 : 0.008, lo ? 6 : 16, lo ? 4 : 12); h.translate(0, 0.053, 0); return h; }
// ---------------------------------------------------------------- el centro: el martillo de reflejos y las 100 figuritas con bata (L1), la vitrina con la bata de
// especialista (L2), los libros y los huesos → el negatoscopio (L3) y el campo de los que se presentan al MIR: plazas (L9) y los 500 primeros (L10)
const SP = 0.06;                                   // separación entre figuritas
const GOLD3 = [23, 56, 81];                        // las tres que quedan en pie (menos de 4 de cada 100)
const FN = 123, FG = 75, FD = 4;                   // campo de 123 × 123 = 15.129 (más de quince mil); 75 filas = 9.225 plazas; 4 filas = 492 (antes del 500)
const FSP = 0.06;
const gridPos = i => v3(((i % 10) - 4.5) * SP, 0, (Math.floor(i / 10) - 4.5) * SP);
const fieldPos = (c, r) => v3((c - 61) * FSP, 0, (61 - r) * FSP);     // fila 0 = delante (z +): los primeros números
const ME_C = 47, ME_R = 38;                        // «tu número» (EJEMPLO): fila 38, columna 47 → nº 4.722
const T_HIT = 0.3;
const _o = new THREE.Object3D(), _up = v3(0, 1, 0), _ax = new THREE.Vector3(), _col = new THREE.Color();
const C_COAT = new THREE.Color(0xf2f4f6), C_GREY = new THREE.Color(0x3d3c3f), C_GOLD = new THREE.Color(0xffc24a), C_DIM = new THREE.Color(0x26272b), C_DERM = new THREE.Color(0x8fe6ff), C_SKIN = new THREE.Color(0xe6d2bd);
function buildCenter() {
  const Z = new THREE.Group(); scene.add(Z); S.ctr = Z;
  // rejilla de 100 (cuerpo con bata + cabeza) y birretes
  const gm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.62, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.5 });
  S.grid = new THREE.InstancedMesh(coatGeo(false), gm, 100); S.grid.castShadow = true; S.grid.receiveShadow = true; S.grid.frustumCulled = false;
  S.heads = new THREE.InstancedMesh(headGeo(false), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.45, clearcoat: 0.3 }), 100); S.heads.castShadow = true; S.heads.frustumCulled = false;
  for (let i = 0; i < 100; i++) { S.grid.setColorAt(i, C_COAT); S.heads.setColorAt(i, C_SKIN); } Z.add(S.grid, S.heads);
  S.caps = new THREE.InstancedMesh(capGeo(), new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.5 }), 100); S.caps.castShadow = true; S.caps.frustumCulled = false; Z.add(S.caps);
  S.gold3 = GOLD3.map(i => { const g = new THREE.Group(); g.add(mesh(coatGeo(false), M.gold)); g.add(mesh(headGeo(false), M.gold));
    const lc = lightCone(0.05, 0.9, 0.22, 0xffd58a); g.add(lc); g.userData.cone = lc; g.position.copy(gridPos(i)); Z.add(g); return g; });
  // el martillo de reflejos gigante y el anillo de la onda
  S.ham = reflexHammer(0.72); Z.add(S.ham);
  S.shock = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  S.shock.rotation.x = -Math.PI / 2; S.shock.position.y = 0.004; Z.add(S.shock);
  S.dust = sparks(Z, 220, 0xffe0b0, 0.018);
  // vitrina con la bata de especialista y el diploma del grado
  S.vit = vitrine(0.34, 0.66); S.vit.position.set(0, 0, -0.72); Z.add(S.vit);
  const stand = grp(at(cyl(0.006, 0.006, 0.5, M.brass, 10), 0, 0.33, 0), at(cyl(0.004, 0.004, 0.2, M.brass, 8), 0, 0.57, 0, 0, 0, Math.PI / 2), at(cyl(0.05, 0.05, 0.01, M.brass, 24), 0, 0.085, 0));
  const coat = labCoat(0.46); coat.position.y = 0.11; S.vit.add(stand, coat);
  const plq = plateText(0.2, 0.045, [['ESPECIALISTA', 0.62, 0.5]], { fg: '#e8c77a', bg: '#2b1a12', border: true }); plq.position.set(0, 0.11, 0.176); S.vit.add(plq);
  S.dip = new THREE.Group(); Z.add(S.dip);
  const roll = cyl(0.012, 0.012, 0.25, M.paper, 20); roll.rotation.z = Math.PI / 2; S.dip.add(roll);
  const dpt = canvasTex(1024, 360, (g, w, h) => { g.fillStyle = '#f1ead8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b08a3e'; g.lineWidth = 8; g.strokeRect(18, 18, w - 36, h - 36); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '700 46px Inter'; g.fillText('TÍTULO UNIVERSITARIO OFICIAL DE', w / 2, 110); g.font = '900 98px Inter'; g.fillText('GRADO EN MEDICINA', w / 2, 225); g.font = '500 34px Inter'; g.fillText('360 créditos ECTS · 6 años', w / 2, 300); });
  S.dipP = mesh(new THREE.PlaneGeometry(0.24, 0.084), new THREE.MeshStandardMaterial({ map: dpt, roughness: 0.8, side: THREE.DoubleSide }), false); S.dipP.position.y = -0.06; S.dip.add(S.dipP);
  const rib = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.004, 8, 20), plastic(0x8e1418, 0.3)); rib.rotation.y = Math.PI / 2; S.dip.add(rib); S.dip.userData.rib = rib;
  // los libros (con las hojas que pasan solas), los huesos y el negatoscopio
  const BK = [[0x6e1414, 'ANATOMÍA'], [0x173d2a, 'FISIOLOGÍA'], [0x1b2a4a, 'HISTOLOGÍA'], [0x4a2a14, 'BIOQUÍMICA'], [0x2a1a2e, 'PATOLOGÍA'], [0x14361f, 'FARMACOLOGÍA']];
  S.books = BK.map(([c, n], k) => { const b = book(0.2, 0.28, 0.05, c, n, ''); b.userData.k = k; Z.add(b); return b; });
  S.flip = []; for (let k = 0; k < 9; k++) { const p = mesh(new THREE.PlaneGeometry(0.19, 0.27), new THREE.MeshStandardMaterial({ map: paperTex((g, w, h) => { textLines(g, 40, 60, w - 80, 12, 22, 'rgba(40,36,30,.5)', k); g.strokeStyle = 'rgba(60,40,30,.55)'; g.lineWidth = 3; g.beginPath(); g.ellipse(w / 2, h * 0.68, 60, 110, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(w / 2 - 20, h * 0.52); g.lineTo(w / 2 + 20, h * 0.84); g.stroke(); }), roughness: 0.85, side: THREE.DoubleSide }), false); p.geometry.translate(0.095, 0, 0); const pv = new THREE.Group(); pv.add(p); Z.add(pv); S.flip.push(pv); }
  S.skull = skull(1.15); S.skull.position.set(-0.36, 0, 0.12); Z.add(S.skull);
  S.bone = bone(1.0); S.bone.rotation.set(0, 0.4, Math.PI / 2); S.bone.position.set(0.34, 0.03, 0.16); Z.add(S.bone);
  S.lbox = lightbox(1.0); S.lbox.position.set(0, 0, -0.2); Z.add(S.lbox);
  S.mag = magnifier(0.8); Z.add(S.mag);
  S.ob = openBook(0.34, 0.46, 0x6e1414, (g, w, h) => { g.fillStyle = '#2b2218'; g.textAlign = 'left'; g.font = '800 30px Inter'; g.fillText('ATLAS DE ANATOMÍA', 70, 80); g.fillText('Lámina 1', w / 2 + 60, 80);
    g.strokeStyle = 'rgba(70,40,30,.75)'; g.lineWidth = 4; const cx = w / 4 + 10, cy = h * 0.58; g.beginPath(); g.arc(cx, cy - 190, 40, 0, 7); g.stroke(); g.beginPath(); g.moveTo(cx, cy - 150); g.lineTo(cx, cy + 60); g.stroke();
    for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(cx, cy - 100 + i * 16, 70 - Math.abs(i - 4) * 4, 7, 0, Math.PI, 0); g.stroke(); }
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(cx + sd * 18, cy - 140); g.lineTo(cx + sd * 90, cy - 30); g.lineTo(cx + sd * 100, cy + 70); g.stroke(); g.beginPath(); g.moveTo(cx + sd * 25, cy + 70); g.lineTo(cx + sd * 40, cy + 220); g.lineTo(cx + sd * 42, cy + 300); g.stroke(); }
    g.beginPath(); g.ellipse(cx, cy + 70, 45, 22, 0, 0, 7); g.stroke(); textLines(g, w / 2 + 60, 120, w / 2 - 130, 22, 24, 'rgba(40,36,30,.5)', 7); });
  const lect = mesh(new THREE.BoxGeometry(0.5, 0.36, 0.34), M.wood); lect.position.y = 0.18; S.lect = grp(lect); S.lect.add(S.ob); S.ob.position.set(0, 0.37, 0); S.ob.rotation.x = 0.32;
  S.lect.position.set(0, 0, 0.55); Z.add(S.lect);
  S.ctrCone = lightCone(1.6, 5, 0.05); Z.add(S.ctrCone);
  // el campo del MIR: 15.129 figuritas sencillas (cuerpo y cabeza) y el resplandor de las plazas
  const n = FN * FN;
  S.field = new THREE.InstancedMesh(coatGeo(true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }), n); S.field.frustumCulled = false; S.field.receiveShadow = true;
  S.fieldH = new THREE.InstancedMesh(headGeo(true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), n); S.fieldH.frustumCulled = false;
  for (let i = 0; i < n; i++) { S.field.setColorAt(i, C_COAT); S.fieldH.setColorAt(i, C_SKIN); } Z.add(S.field, S.fieldH);
  const glowT = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7); r.addColorStop(0, 'rgba(255,200,90,.9)'); r.addColorStop(0.6, 'rgba(255,180,60,.35)'); r.addColorStop(1, 'rgba(255,170,50,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  S.gglow = new THREE.Mesh(new THREE.PlaneGeometry(FN * FSP * 1.05, FG * FSP * 1.12), new THREE.MeshBasicMaterial({ map: glowT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  S.gglow.rotation.x = -Math.PI / 2; S.gglow.position.set(0, 0.003, fieldPos(0, (FG - 1) / 2).z); Z.add(S.gglow);
  S.dline = new THREE.Mesh(new THREE.PlaneGeometry(FN * FSP * 1.02, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fe6ff).multiplyScalar(3), transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
  S.dline.rotation.x = -Math.PI / 2; S.dline.position.set(0, 0.004, fieldPos(0, FD - 0.5).z); Z.add(S.dline);
  S.me = new THREE.Group(); S.me.add(mesh(coatGeo(false), M.gold)); S.me.add(mesh(headGeo(false), M.gold)); const mc = lightCone(0.06, 1.4, 0.3, 0xffd58a); S.me.add(mc); S.me.userData.cone = mc; S.me.position.copy(fieldPos(ME_C, ME_R)); Z.add(S.me);
}
function fallState(i, t) {       // ángulo de caída (0 = de pie) de la figurita i de la rejilla
  const P = gridPos(i), dist = Math.hypot(P.x, P.z), dl = T_HIT + dist / 2.8 + hash(i * 3.7) * 0.05;
  let u = clamp((t - dl) / 0.26), th = Math.PI / 2 * 0.94 * u * u;
  if (u >= 1) th -= 0.1 * Math.sin(Math.PI * clamp((t - dl - 0.26) / 0.22)) * Math.exp(-(t - dl - 0.26) * 6);
  const up = clamp((t - (K.y2 + 0.05 + hash(i * 5.1) * 0.45)) / 0.32); th *= 1 - eio(up);
  return { th, slide: 0.025 * clamp(u) * (1 - eio(up)), lie: clamp(u) * (1 - eio(up)) };
}
function centerAt(t, st) {
  const fieldOn = t > K.mas9 - 0.6 && t < K.despues11 + 0.6, startOn = t < K.dentro3 + 0.9 || t > K.si13 - 1.5;
  const Z = S.ctr; Z.visible = fieldOn || startOn; if (!Z.visible) return;
  const showStart = startOn;
  // ---- el martillo: baja acelerando, golpea (onda, polvo, temblor), rebota y se va; al final vuelve a bajar hasta la pose del principio
  const yTop = 0.62; let gy = yTop * (1 - clamp(t / T_HIT) * clamp(t / T_HIT));
  if (t > T_HIT) { const u = t - T_HIT; gy = 0.05 * Math.abs(Math.sin(u * 14)) * Math.exp(-u * 9); }
  gy += eio(clamp((t - 1.25) / 0.9)) * 2.8;
  if (t > K.si13) gy = 2.8 - (2.8 - yTop) * eio(clamp((t - (END - 2.2)) / 2.2));
  S.ham.position.set(0.0, 0.158 + gy, 0.02); S.ham.rotation.set(0, 0.35, 0); S.ham.visible = showStart && gy < 2.7;
  const ush = t - T_HIT; S.shock.visible = ush > 0 && ush < 0.9; if (S.shock.visible) { const e = eo(clamp(ush / 0.85)); S.shock.scale.setScalar(0.1 + e * 1.9); S.shock.material.opacity = 0.85 * (1 - e); }
  S.dust.visible = ush > 0 && ush < 1.6; if (S.dust.visible) { burst(S.dust, v3(0, 0.02, 0), t, T_HIT, 0.45, 1.5, false, 0.7); S.dust.material.opacity = 1 - clamp(ush / 1.6); }
  // ---- la rejilla: caen 97 (gris), quedan 3 dorados; con «Y ninguno…» se levantan todos y con «carrera» llevan birrete
  const sink = win(t, K.crees3 - 0.1, 0.7) * (1 - win(t, K.si13 + 0.3, 0.8));
  const capK = pop(t, K.carrera2 - 0.05, 0.4) * (1 - win(t, K.crees3 - 0.1, 0.4));
  const gv = showStart && t < K.dentro3 + 0.9 || t > K.si13 - 1.5; S.grid.visible = S.heads.visible = gv;
  if (gv) {
    for (let i = 0; i < 100; i++) {
      const P = gridPos(i), f = fallState(i, t), isG = GOLD3.includes(i) && t > T_HIT && t < K.y2 + 0.1;
      const th = GOLD3.includes(i) ? 0 : f.th, lie = GOLD3.includes(i) ? 0 : f.lie;
      const d = Math.hypot(P.x, P.z) > 1e-4 ? v3(P.x, 0, P.z).normalize() : v3(1, 0, 0); _ax.set(d.z, 0, -d.x);
      _o.position.copy(P).addScaledVector(d, f.slide); _o.position.y = 0.011 * Math.sin(th) - sink * 0.09; _o.quaternion.setFromAxisAngle(_ax, th);
      _o.scale.setScalar(isG ? 0.0001 : 1); _o.updateMatrix(); S.grid.setMatrixAt(i, _o.matrix); S.heads.setMatrixAt(i, _o.matrix);
      _col.copy(C_COAT).lerp(C_GREY, lie); S.grid.setColorAt(i, _col); _col.copy(C_SKIN).lerp(C_GREY, lie * 0.8); S.heads.setColorAt(i, _col);
      _o.scale.setScalar(Math.max(0.0001, capK) * (isG ? 0 : 1)); _o.updateMatrix(); S.caps.setMatrixAt(i, _o.matrix);
    }
    S.grid.instanceMatrix.needsUpdate = true; S.grid.instanceColor.needsUpdate = true; S.heads.instanceMatrix.needsUpdate = true; S.heads.instanceColor.needsUpdate = true; S.caps.instanceMatrix.needsUpdate = true;
  }
  S.caps.visible = gv && capK > 0.002;
  const gk = t > T_HIT + 0.05 && t < K.y2 + 0.1;
  S.gold3.forEach((g, n) => { g.visible = gk; if (!gk) return; const k = pop(t, K.cuatro1 - 0.05 + n * 0.08, 0.4); g.scale.setScalar(1 + 0.25 * k); g.userData.cone.material.uniforms.op.value = 0.22 * k * (1 - win(t, K.y2 - 0.2, 0.3)); });
  // ---- la vitrina (L2): sube del suelo, se cierra con luz roja; el diploma se desenrolla con «carrera»
  const vk = win(t, K.y2 - 0.1, 0.5) * (1 - win(t, K.crees3 - 0.2, 0.5));
  S.vit.visible = vk > 0.01; S.vit.position.y = -0.85 * (1 - vk);
  if (S.vit.visible) { const led = S.vit.userData.led; led.material.emissiveIntensity = 3 * (t > K.ninguno2 ? 1 : 0) * (0.6 + 0.4 * Math.sin(t * 9)); }
  const dk = win(t, K.carrera2 - 0.25, 0.35) * (1 - win(t, K.crees3 - 0.3, 0.3));
  S.dip.visible = dk > 0.01; if (S.dip.visible) { S.dip.position.set(0, 0.2 + 0.03 * Math.sin(t * 2), 0.12); S.dip.rotation.set(-0.15, 0, 0); const uk = eo(clamp((t - K.carrera2) / 0.45)); S.dipP.scale.set(Math.max(0.001, uk), 1, 1); S.dipP.visible = uk > 0.01; S.dip.userData.rib.visible = uk < 0.1; S.dip.scale.setScalar(dk); }
  // ---- L3: los libros suben apilados; con «memorizar» pasan las hojas; con «huesos» salen el cráneo y el fémur;
  //      con «En realidad» los libros salen volando, sube el negatoscopio y la lupa encuentra «qué falla» (aro rojo)
  const bk = win(t, K.crees3 - 0.15, 0.5), fly = win(t, K.realidad3 - 0.15, 0.6), end3 = t < K.dentro3 + 0.9;
  S.books.forEach((b, k) => { b.visible = bk > 0.01 && end3 && fly < 0.999; if (!b.visible) return;
    const A = v3(0, 0.025 + k * 0.052 - 0.4 * (1 - bk), 0.05), dir = v3(Math.cos(k * 1.9) * 2.2, 1.4 + k * 0.15, -1.5 - hash(k) * 1.2), e = eio(clamp((fly - k * 0.05) / 0.8));
    b.position.copy(A).addScaledVector(dir, e); b.rotation.set(-Math.PI / 2 + e * 3 * (k % 2 ? 1 : -1), e * 2, (k - 2.5) * 0.12 + e * 4); b.scale.setScalar(1 - 0.5 * e); });
  const fk = win(t, K.memorizar3 - 0.1, 0.2) * (1 - win(t, K.realidad3 - 0.2, 0.15));
  S.flip.forEach((p, k) => { p.visible = fk > 0.01 && end3; if (!p.visible) return; const top = v3(-0.095, 0.025 + 6 * 0.052 + 0.004, 0.05); const ph = ((t * 3.2 + k / 9) % 1); p.position.copy(top); p.rotation.set(-Math.PI / 2, 0, 0); p.rotateY(-Math.PI * eio(ph)); });
  const hk = pop(t, K.huesos3 - 0.12, 0.4) * (1 - win(t, K.realidad3 - 0.1, 0.4)); show(S.skull, hk * 1.15 * (end3 ? 1 : 0)); show(S.bone, pop(t, K.huesos3 + 0.05, 0.4) * (1 - win(t, K.realidad3 - 0.1, 0.4)) * (end3 ? 1 : 0));
  if (S.skull.visible) { S.skull.rotation.y = 0.5 + Math.sin(t * 1.4) * 0.15; S.skull.userData.jaw.rotation.x = 0.1 + 0.08 * Math.max(0, Math.sin(t * 7)); }
  const lk = win(t, K.realidad3 - 0.25, 0.5) * (end3 ? 1 : 0); S.lbox.visible = lk > 0.01; S.lbox.position.y = -0.6 * (1 - lk);
  S.lbox.userData.film.material.emissiveIntensity = 1.25 * (0.3 + 0.7 * win(t, K.realidad3, 0.25));
  const rk = win(t, K.falla3 - 0.05, 0.25); S.lbox.userData.ring.material.opacity = rk * (0.75 + 0.25 * Math.sin(t * 12)); S.lbox.userData.ring.scale.setScalar(1 + 0.6 * (1 - eo(rk)));
  const mk = win(t, K.encontrar3 - 0.3, 0.4) * (1 - win(t, K.asi3, 0.3)) * (end3 ? 1 : 0); S.mag.visible = mk > 0.01;
  if (S.mag.visible) { const u = clamp((t - K.encontrar3 + 0.2) / (K.falla3 - K.encontrar3 + 0.2)), x = lerp(0.12, -0.0815, eio(u)), y = lerp(0.3, 0.19 + 0.33 * 0.08, eio(u)); S.mag.position.set(x, y - 0.6 * (1 - lk), -0.2 + 0.07); S.mag.rotation.set(0, 0, 0.5); S.mag.scale.setScalar(0.8 * mk); }
  const ok = win(t, K.asi3 - 0.4, 0.5); S.lect.visible = ok > 0.01 && end3; S.lect.position.y = -0.8 * (1 - ok);
  S.ctrCone.visible = startOn; S.ctrCone.material.uniforms.op.value = 0.05 * (t < K.dentro3 + 0.5 ? 1 : 0);
  // ---- el campo del MIR (L9–L10)
  const fv = fieldOn && t > K.mas9 - 0.5; S.field.visible = S.fieldH.visible = fv; S.me.visible = false; S.gglow.visible = S.dline.visible = fv;
  if (fv) {
    const t0 = K.n15000 - 0.15, gOn = win(t, K.n9000 - 0.05, 0.4), dim = win(t, K.plazas9 - 0.1, 0.6), dOn = win(t, K.dermatologia10 - 0.1, 0.5), dOff = win(t, K.agoto10 - 0.05, 0.6);
    const meK = win(t, K.numero9 - 0.2, 0.4) * (1 - win(t, K.este10 - 0.1, 0.4)), out = win(t, K.despues11 - 0.2, 0.6);
    let i = 0;
    for (let r = 0; r < FN; r++) for (let c = 0; c < FN; c++, i++) {
      const P = fieldPos(c, r), dist = Math.hypot(P.x, P.z - 3.6), k = pop(t, t0 + dist / 5.5 + hash(i * 0.37) * 0.1, 0.3) * (1 - out);
      _o.position.set(P.x, -0.09 * out, P.z); _o.quaternion.identity(); _o.scale.setScalar(Math.max(0.0001, k) * (c === ME_C && r === ME_R && meK > 0.01 ? 0.0001 : 1)); _o.updateMatrix(); S.field.setMatrixAt(i, _o.matrix); S.fieldH.setMatrixAt(i, _o.matrix);
      _col.copy(C_COAT);
      if (r < FG) _col.lerp(C_GOLD, gOn); else _col.lerp(C_DIM, dim * 0.85);
      if (r < FD) { _col.lerp(C_DERM, dOn); _col.lerp(C_GREY, dOff * 0.5); } else if (dOn > 0) _col.multiplyScalar(1 - 0.55 * dOn);
      if (meK > 0) _col.multiplyScalar(1 - 0.45 * meK);
      S.field.setColorAt(i, _col); _col.copy(C_SKIN).multiplyScalar((r >= FG ? 1 - 0.75 * dim : 1) * (1 - 0.5 * Math.max(meK, r < FD ? 0 : dOn))); S.fieldH.setColorAt(i, _col);
    }
    S.field.instanceMatrix.needsUpdate = true; S.field.instanceColor.needsUpdate = true; S.fieldH.instanceMatrix.needsUpdate = true; S.fieldH.instanceColor.needsUpdate = true;
    S.gglow.material.opacity = 0.6 * gOn * (1 - dOn * 0.7) * (1 - out); S.dline.material.opacity = dOn * (1 - out) * (0.8 + 0.2 * Math.sin(t * 10));
    S.me.visible = meK > 0.01; if (S.me.visible) { S.me.scale.setScalar(1 + 0.6 * pop(t, K.numero9 - 0.2, 0.4)); S.me.userData.cone.material.uniforms.op.value = 0.3 * meK; }
  }
}
// ---------------------------------------------------------------- estaciones (una por frase) en el círculo de radio R_ST: cuerpo sano (L4), lo que falla (L5), clínicas (L6),
// el hospital (L7), el MIR (L8), la residencia (L11), los años (L12) y quirófano o consulta (L13). Cada una: pedestal de madera con canto de latón y su haz de luz.
const ST = {};
function station(name, a, r = 0.95) {
  const Z = new THREE.Group(); Z.position.copy(stP(a)); Z.rotation.y = a * D2; scene.add(Z);
  const pl = plinth(r, 0.55); Z.add(pl); const lc = lightCone(r * 1.15, 4.6, 0.055); Z.add(lc);
  const top = new THREE.Group(); top.position.y = 0.55; Z.add(top);
  ST[name] = { Z, top, a, cone: lc }; return ST[name];
}
const TOP = 0.55;
function canvasPlane(w, h, px, draw, opts = {}) {        // plano con lienzo que se puede redibujar
  const t = canvasTex(px, Math.round(px * h / w), draw); const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: opts.r ?? 0.85, transparent: !!opts.tr, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }), opts.cs ?? false);
  m.userData.tex = t; return m;
}
function bookB(c, title) { const b = book(0.16, 0.22, 0.04, c, title, ''); b.rotation.x = -Math.PI / 2; return b; }
function buildStations() {
  // ---------- L4 el cuerpo sano: cráneo y fémur (Anatomía), corazón que late (Fisiología), glucosa (Bioquímica)
  { const s = station('CS', ANG.CS, 1.0);
    s.skull = skull(1.6); s.skull.position.set(-0.42, 0, -0.02); s.skull.rotation.y = 0.35; s.top.add(s.skull);
    s.bone = bone(1.1); s.bone.rotation.set(0, -0.5, Math.PI / 2); s.bone.position.set(-0.3, 0.03, 0.33); s.top.add(s.bone);
    s.heart = heartModel(1.7); s.heart.position.set(0.02, 0.03, 0.02); s.top.add(s.heart);
    s.hstand = grp(at(cyl(0.006, 0.006, 0.05, M.brass, 8), 0, 0.025, 0), at(cyl(0.06, 0.07, 0.012, M.wood, 24), 0, 0.006, 0)); s.hstand.position.set(0.02, 0, 0.02); s.top.add(s.hstand);
    s.mol = molecule(1.4); s.mol.position.set(0.44, 0.36, 0.04); s.top.add(s.mol);
    s.mstand = grp(at(cyl(0.005, 0.005, 0.22, M.brass, 8), 0, 0.11, 0), at(cyl(0.05, 0.06, 0.012, M.wood, 24), 0, 0.006, 0)); s.mstand.position.set(0.44, 0, 0.04); s.top.add(s.mstand);
  }
  // ---------- L5 lo que falla: microscopio (Patología), placa de Petri con colonias (Microbiología), frasco, blíster y jeringa (Farmacología)
  { const s = station('LF', ANG.LF, 1.0);
    s.mic = microscope(2.1); s.mic.position.set(-0.36, 0, -0.08); s.mic.rotation.y = 0.5; s.top.add(s.mic);
    s.pet = petri(1.5); s.pet.position.set(0.02, 0, 0.22); s.top.add(s.pet);
    s.bot = pillBottle(1.5); s.bot.position.set(0.38, 0, -0.18); s.top.add(s.bot);
    s.bli = blister(1.4); s.bli.position.set(0.36, 0.006, 0.18); s.bli.rotation.y = -0.4; s.top.add(s.bli);
    s.syr = syringe(1.3); s.syr.position.set(0.12, 0.02, -0.28); s.syr.rotation.y = 0.5; s.top.add(s.syr);
  }
  // ---------- L6 las clínicas: monitor con el electro (corazón), cerebro, osito y niño (niños), fonendo
  { const s = station('CL', ANG.CL, 1.05);
    s.mon = ecgMonitor(1.25); s.mon.position.set(-0.36, 0.36, -0.2); s.mon.rotation.y = 0.35; s.top.add(s.mon); drawEcg(s.mon.userData.scr, 0);
    s.st = stethoscope(1.3); s.st.position.set(-0.25, 0.0, 0.25); s.st.rotation.y = -0.3; s.top.add(s.st);
    s.brain = brainModel(1.9); s.brain.position.set(0.06, 0.26, -0.02); s.top.add(s.brain);
    s.bstand = grp(at(cyl(0.006, 0.006, 0.13, M.brass, 8), 0, 0.065, 0), at(cyl(0.07, 0.08, 0.012, M.wood, 24), 0, 0.006, 0)); s.bstand.position.set(0.06, 0, -0.02); s.top.add(s.bstand);
    s.ted = teddy(1.6); s.ted.position.set(0.42, 0, 0.12); s.ted.rotation.y = -0.6; s.top.add(s.ted);
    s.kid = medFig('kid', 0.62); s.kid.position.set(0.3, 0, 0.3); s.kid.rotation.y = -0.4; s.top.add(s.kid);
  }
  // ---------- L7 sexto: casi todo el año en el hospital (cama con paciente y gotero; médica y dos estudiantes con bata)
  { const s = station('HO', ANG.HO, 1.1);
    s.bed = hospitalBed(1.15); s.bed.position.set(-0.1, 0, -0.05); s.bed.rotation.y = Math.PI / 2; s.top.add(s.bed);
    s.doc = medFig('coat', 1.25); s.doc.position.set(0.0, 0, 0.42); s.doc.rotation.y = Math.PI * 0.95; s.top.add(s.doc); s.doc.userData.J.shR.rotation.x = -0.5;
    s.stu = [medFig('coat', 1.05), medFig('coat', 1.05)]; s.stu.forEach((f, i) => { f.position.set(0.32 + i * 0.16, 0, 0.3 - i * 0.12); f.rotation.y = Math.PI * 1.15; s.top.add(f); });
    s.mon = ecgMonitor(0.7); s.mon.position.set(-0.45, 0.42, -0.3); s.mon.rotation.y = 0.6; s.top.add(s.mon);
  }
  // ---------- L8 el MIR: hoja de respuestas (200 preguntas), reloj (4 h 30 min) y lápiz
  { const s = station('MI', ANG.MI, 1.1);
    s.desk = grp(at(mesh(new THREE.BoxGeometry(0.8, 0.025, 0.46), M.woodL), 0, 0.12, 0)); for (const x of [-0.37, 0.37]) s.desk.add(at(mesh(new THREE.BoxGeometry(0.03, 0.12, 0.42), M.woodL), x, 0.06, 0)); s.top.add(s.desk);
    s.sheetK = -1; s.wrong = 137; s.sheet = canvasPlane(0.34, 0.46, 1024, (g, w, h) => drawSheet(g, w, h, 0, s.wrong), { cs: false });
    s.sheet.rotation.x = -Math.PI / 2; s.sheet.rotation.z = 0.06; s.sheet.position.set(-0.05, 0.1335, 0.0); s.desk.add(s.sheet);
    s.pen = pen(); s.pen.rotation.set(0.0, 0.6, -1.25); s.top.add(s.pen);
    s.clk = wallClock(1.35); s.clk.position.set(0.32, 0.55, -0.22); s.clk.rotation.y = -0.25; s.top.add(s.clk);
    s.cpost = grp(at(cyl(0.008, 0.008, 0.36, M.brass, 8), 0, 0.18, 0), at(cyl(0.06, 0.07, 0.012, M.wood, 24), 0, 0.006, 0)); s.cpost.position.set(0.32, 0, -0.24); s.top.add(s.cpost);
  }
  // ---------- L11 la residencia: escalera R1…R5, residente con pijama verde, nómina con monedas y la guardia (reloj a las 3)
  { const s = station('RE', ANG.RE, 1.15);
    s.steps = [0, 1, 2, 3, 4].map(k => { const st2 = mesh(new THREE.BoxGeometry(0.62, 0.06 * (k + 1), 0.13), k === 4 ? new THREE.MeshPhysicalMaterial({ color: 0x3a2112, roughness: 0.45, transparent: true, opacity: 0.55 }) : M.wood); st2.position.set(-0.08, 0.03 * (k + 1), 0.32 - k * 0.13); s.top.add(st2);
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.622, 0.005, 0.132), M.brass); e.position.set(-0.08, 0.06 * (k + 1), 0.32 - k * 0.13); s.top.add(e);
      const lb = plateText(0.09, 0.045, [['R' + (k + 1), 0.8, 0.5]], { fg: '#e8c77a' }); lb.position.set(-0.32, 0.06 * (k + 1) + 0.0035, 0.32 - k * 0.13); lb.rotation.x = -Math.PI / 2; s.top.add(lb); return st2; });
    s.res = medFig('scrubs', 1.0); s.top.add(s.res);
    s.nom = canvasPlane(0.2, 0.27, 512, (g, w, h) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'left'; g.font = '900 40px Inter'; g.fillText('NÓMINA', 26, 58); g.font = '600 15px Inter'; g.fillText('MÉDICO INTERNO RESIDENTE · EJEMPLO', 26, 86);
      [['Sueldo base', '•••'], ['Complemento de grado', '•••'], ['Guardias', '•••'], ['LÍQUIDO A PERCIBIR', '•••• €']].forEach(([a, b], i) => { g.font = (a === a.toUpperCase() ? '800 ' : '500 ') + '20px Inter'; g.fillText(a, 26, 150 + i * 56); g.textAlign = 'right'; g.fillText(b, w - 26, 150 + i * 56); g.textAlign = 'left'; g.fillStyle = 'rgba(40,36,30,.25)'; g.fillRect(26, 162 + i * 56, w - 52, 2); g.fillStyle = '#2b2218'; }); });
    s.nom.rotation.x = -Math.PI / 2; s.nom.rotation.z = -0.25; s.nom.position.set(0.42, 0.004, 0.22); s.top.add(s.nom);
    s.coins = []; for (let i = 0; i < 6; i++) { const c = coin(0.026); c.position.set(0.44, 0.004 + i * 0.006, -0.02); s.top.add(c); s.coins.push(c); }
    s.clk = wallClock(0.85); s.clk.position.set(0.38, 0.5, -0.3); s.clk.rotation.y = -0.4; s.top.add(s.clk); setClock(s.clk, 3.0);
    s.cpost = grp(at(cyl(0.007, 0.007, 0.36, M.brass, 8), 0, 0.18, 0), at(cyl(0.05, 0.06, 0.012, M.wood, 24), 0, 0.006, 0)); s.cpost.position.set(0.38, 0, -0.32); s.top.add(s.cpost);
    s.moon = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdfe8ff).multiplyScalar(1.6), toneMapped: false })); s.moon.position.set(0.12, 0.85, -0.42); s.top.add(s.moon);
  }
  // ---------- L12 once años: 6 libros del grado + 5 de la residencia y el cirujano encima
  { const s = station('AN', ANG.AN, 1.0);
    const cG = [0x6e1414, 0x173d2a, 0x1b2a4a, 0x4a2a14, 0x2a1a2e, 0x14361f];
    s.books = []; for (let k = 0; k < 11; k++) { const g = k < 6 ? bookB(cG[k], (k + 1) + '.º') : bookB(0x2c7a6c, 'R' + (k - 5)); g.position.set(-0.18, 0.02 + k * 0.042, 0.06); g.rotation.z = (hash(k * 3.3) - 0.5) * 0.25; s.top.add(g); s.books.push(g); }
    s.sur = medFig('scrubs', 1.35); s.sur.position.set(0.24, 0, 0.05); s.sur.rotation.y = -0.3; s.top.add(s.sur);
    s.scal = grp(at(mesh(new THREE.BoxGeometry(0.006, 0.006, 0.07), M.chrome), 0, 0, 0), at(mesh(new THREE.BoxGeometry(0.004, 0.012, 0.03), M.chrome), 0, 0.004, 0.048)); s.scal.position.set(0, -0.02, 0.03); s.scal.scale.setScalar(1 / (0.16 * 1.35)); s.sur.userData.J.hR.add(s.scal);
    s.sur.userData.J.shR.rotation.x = -0.8; s.sur.userData.J.elR.rotation.x = -0.9;
    s.sp = sparks(s.top, 140, 0xffd58a, 0.025);
  }
  // ---------- L13 ¿quirófano o consulta?: los dos, uno a cada lado
  { const s = station('DU', ANG.DU, 1.25);
    s.sur = surgery(1.05); s.sur.position.set(-0.42, 0, 0.0); s.sur.rotation.y = 0.35; s.top.add(s.sur);
    s.con = consult(1.05); s.con.position.set(0.4, 0, 0.02); s.con.rotation.y = -0.35; s.top.add(s.con);
    s.div = mesh(new THREE.BoxGeometry(0.012, 0.5, 0.012), M.brass); s.div.position.set(0, 0.25, 0.1); s.top.add(s.div);
  }
}
function stationsAt(t) {
  const vis = (s, a, b) => { s.Z.visible = t > a && t < b; return s.Z.visible; };
  // L4
  { const s = ST.CS; if (vis(s, K.dentro3 - 0.2, K.patologia5 + 0.8)) {
    show(s.skull, pop(t, K.anatomia4 - 0.15, 0.45) * 1.6); s.skull.rotation.y = 0.35 + 0.8 * (1 - eo(clamp((t - K.anatomia4) / 0.8))); s.skull.userData.jaw.rotation.x = 0.06 + 0.06 * Math.max(0, Math.sin(t * 6));
    show(s.bone, pop(t, K.anatomia4 + 0.05, 0.4) * 1.1);
    const hk = pop(t, K.fisiologia4 - 0.15, 0.45); show(s.heart, hk * 1.7); show(s.hstand, hk); if (s.heart.visible) { const b = beat(t) * clamp((t - K.fisiologia4) / 0.3); s.heart.userData.body.scale.setScalar(1 + 0.07 * b); s.heart.rotation.y = 0.4 + Math.sin(t * 0.8) * 0.25; }
    const mk = pop(t, K.bioquimica4 - 0.15, 0.45); show(s.mol, mk * 1.4); show(s.mstand, mk); s.mol.rotation.set(t * 0.6, t * 0.9, 0.3);
  } }
  // L5
  { const s = ST.LF; if (vis(s, K.bioquimica4 - 0.4, K.clinicas6 + 0.8)) {
    show(s.mic, pop(t, K.patologia5 - 0.15, 0.45) * 2.1); s.mic.userData.light.material.emissiveIntensity = 2.5 * win(t, K.patologia5 + 0.2, 0.3);
    show(s.pet, pop(t, K.microbiologia5 - 0.15, 0.45) * 1.5); s.pet.userData.cols.forEach((c, i) => { const k = clamp((t - K.microbiologia5 - 0.05 - hash(i * 2.2) * 0.6) / 0.35); c.visible = k > 0; c.scale.set(eo(k), 0.35 * eo(k), eo(k)); });
    show(s.bot, pop(t, K.farmacologia5 - 0.15, 0.4) * 1.5); show(s.bli, pop(t, K.farmacologia5, 0.4) * 1.4); show(s.syr, pop(t, K.farmacologia5 + 0.18, 0.4) * 1.3);
    s.bli.userData.pills.forEach((p, i) => { const k = clamp((t - K.farmacologia5 - 0.1 - i * 0.04) / 0.2); p.visible = k > 0; p.position.y = 0.008 + 0.06 * (1 - eo(k)); });
  } }
  // L6
  { const s = ST.CL; if (vis(s, K.farmacologia5 - 0.4, K.hospital7 - 0.6)) {
    show(s.st, pop(t, K.clinicas6 - 0.15, 0.45) * 1.3);
    const mk = pop(t, K.corazon6 - 0.2, 0.45); show(s.mon, mk * 1.25); if (s.mon.visible) drawEcg(s.mon.userData.scr, t);
    const bk = pop(t, K.cerebro6 - 0.15, 0.45); show(s.brain, bk * 1.9); show(s.bstand, bk); s.brain.rotation.y = -0.6 + t * 0.5;
    show(s.ted, pop(t, K.ninos6 - 0.15, 0.4) * 1.6); show(s.kid, pop(t, K.ninos6 + 0.05, 0.4));
  } }
  // L7
  { const s = ST.HO; if (vis(s, K.ninos6 + 0.2, K.mir8 + 0.4)) {
    show(s.bed, pop(t, K.sexto7 - 0.2, 0.45) * 1.15); show(s.doc, pop(t, K.casi7 - 0.1, 0.4)); s.stu.forEach((f, i) => show(f, pop(t, K.entero7 - 0.1 + i * 0.1, 0.4)));
    const mk = pop(t, K.hospital7 - 0.15, 0.4); show(s.mon, mk * 0.7); if (s.mon.visible) drawEcg(s.mon.userData.scr, t);
  } }
  // L8
  { const s = ST.MI; if (vis(s, K.dentro7 - 0.3, K.n15000 + 0.4)) {
    s.desk.visible = true; s.desk.scale.setScalar(Math.max(0.0001, pop(t, K.falta8 - 0.2, 0.45)));
    const fk = clamp((t - K.n200 + 0.05) / (K.media8 - K.n200 + 0.3)), wr = t > K.fallo8 - 0.05 ? 1 : 0, key = fk + wr * 2;
    if (Math.abs(key - s.sheetK) > 0.004) { const T = s.sheet.userData.tex; drawSheet(T.userData.g, T.userData.c.width, T.userData.c.height, wr ? 1 : fk, wr ? s.wrong : -1); T.needsUpdate = true; s.sheetK = key; }
    const q = Math.min(199, Math.floor(200 * fk)), col = Math.floor(q / 50), row = q % 50;
    const rh = (1385 - 110) / 50, u = (20 + col * 246 + 36 + 26 * Math.floor(hash(q * 5.3) * 4)) / 1024 - 0.5, v = (100 + row * rh + rh / 2) / 1385 - 0.5;
    const P = v3(u * 0.34, 0, v * 0.46).applyAxisAngle(_up, 0.06).add(v3(-0.05, 0.1335, 0)); s.desk.localToWorld(P); s.top.worldToLocal(P);
    s.pen.visible = s.desk.scale.x > 0.5 && t < K.resta8 + 0.6; s.pen.position.copy(P).add(v3(0, 0.012 + (fk > 0 && fk < 1 ? 0.004 * Math.abs(Math.sin(t * 40)) : 0.03), 0));
    const ck = pop(t, K.cuatro8 - 0.2, 0.45); show(s.clk, ck * 1.35); show(s.cpost, ck); setClock(s.clk, 14 + 4.5 * eio(clamp((t - K.cuatro8) / (K.media8 - K.cuatro8 + 0.4))));
  } }
  // L11
  { const s = ST.RE; if (vis(s, K.agoto10 + 0.6, K.carrera12 + 0.6)) {
    s.steps.forEach((st2, k) => { const kk = pop(t, (k < 4 ? K.cuatro11 : K.cinco11) - 0.25 + k * 0.06, 0.35); st2.visible = kk > 0.01; st2.scale.set(1, Math.max(0.001, kk), 1); });
    const lvl = clamp((t - K.residencia11 + 0.3) / 1.2) * 5, z = 0.45 - lvl * 0.13, hop = Math.sin((lvl % 1) * Math.PI) * 0.05;
    s.res.visible = t > K.cuatro11 - 0.1; s.res.position.set(-0.08, 0.06 * Math.min(5, Math.floor(lvl + 0.5)) + hop, z); const J = s.res.userData.J; J.hpL.rotation.x = Math.sin(lvl * Math.PI * 2) * 0.5; J.hpR.rotation.x = -Math.sin(lvl * Math.PI * 2) * 0.5;
    show(s.nom, pop(t, K.cobrando11 - 0.15, 0.4)); s.coins.forEach((c, i) => { const k = clamp((t - K.cobrando11 - 0.05 - i * 0.05) / 0.18); c.visible = k > 0; c.position.y = 0.004 + i * 0.006 + 0.15 * (1 - eo(k)); });
    const gk = pop(t, K.guardias11 - 0.2, 0.4); show(s.clk, gk * 0.85); show(s.cpost, gk); show(s.moon, gk);
  } }
  // L12
  { const s = ST.AN; if (vis(s, K.guardias11 - 0.4, K.guardalo13 - 0.6)) {
    s.books.forEach((b, k) => { const t0 = k < 6 ? K.seis12 - 0.1 + k * 0.08 : K.cinco12 - 0.1 + (k - 6) * 0.08, kk = clamp((t - t0) / 0.2); b.visible = kk > 0; b.position.y = 0.02 + k * 0.042 + 0.3 * (1 - eo(kk)); });
    show(s.sur, pop(t, K.cirujano12 - 0.2, 0.45));
    s.sp.visible = t > K.once12 && t < K.once12 + 2; if (s.sp.visible) burst(s.sp, v3(-0.18, 0.5, 0.06), t, K.once12, 0.35, 1.4, false, 0.25);
  } }
  // L13
  { const s = ST.DU; if (vis(s, K.cirujano12 - 0.2, END + 1)) {
    show(s.sur, pop(t, K.si13 - 0.3, 0.45) * 1.05); show(s.con, pop(t, K.si13 - 0.1, 0.45) * 1.05); show(s.div, pop(t, K.si13, 0.4));
    const qk = win(t, K.quirofano13 - 0.15, 0.3), ck = win(t, K.consulta13 - 0.15, 0.3);
    s.sur.userData.leds.forEach(l => { l.material.emissiveIntensity = 0.6 + 5 * qk; });
    s.con.traverse(o => { if (o.material && o.material.emissiveMap) o.material.emissiveIntensity = 0.3 + 1.2 * ck; });
  } }
  for (const k in ST) { const s = ST[k]; if (s.Z.visible) s.cone.material.uniforms.op.value = 0.055; }
}
// ---------------------------------------------------------------- cámara: entre las figuritas bajo el martillo → la vitrina → los libros, los huesos y el negatoscopio → se zambulle
// en la lámina del atlas (blanco) → estaciones (cuerpo sano, lo que falla, clínicas, hospital, MIR) → corte al campo de los 15.000 → corte a la residencia,
// los años y quirófano o consulta → vuelve al centro (bucle)
let CKS = [], CUTS = [];
const stCam = (a, dist, h, dx = 0) => { const p = stP(a, dist, h).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const stLook = (a, y, dx = 0, r = R_ST) => { const p = stP(a, r, y).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const T0 = [0.52, 0.15, 1.02], L0 = [0, 0.34, 0], TA = [0.58, 0.19, 1.16], LA = [0, 0.32, 0];
function buildCam() {
  const { CS, LF, CL, HO, MI, RE, AN, DU } = ANG;
  const g56 = gridPos(56), me = fieldPos(ME_C, ME_R);
  const cut1 = Math.round((K.dentro3 + 0.5) * 60) / 60, cut2 = Math.round((K.mas9 - 0.05) * 60) / 60, cut3 = Math.round((K.y11 - 0.05) * 60) / 60; CUTS = [cut1, cut2, cut3];
  const A1 = [
    [-1.0, TA, LA, 44], [0.0, T0, L0, 44], [T_HIT, [0.47, 0.14, 0.92], [0, 0.24, 0], 43],
    [K.cuatro1, [0.5, 0.36, 0.95], [0, 0.03, 0], 38], [K.cien1, [0.62, 0.55, 1.0], [0, 0, 0], 37], [K.medicos1, [-0.15, 0.32, 0.78], [0, 0.03, 0], 35],
    [K.elegir1, [g56.x + 0.13, 0.11, g56.z + 0.26], [g56.x, 0.04, g56.z], 33], [K.dermatologos1 + 0.3, [g56.x + 0.17, 0.15, g56.z + 0.32], [g56.x - 0.02, 0.045, g56.z - 0.02], 33],
    [K.y2 + 0.1, [0.0, 0.27, 0.68], [0, 0.24, -0.6], 37], [K.carrera2, [0.06, 0.31, 1.2], [0, 0.2, 0.0], 38], [K.final2, [0.0, 0.33, 0.3], [0, 0.36, -0.6], 34], [K.falta2 + 0.05, [0.0, 0.39, -0.16], [0, 0.38, -0.55], 32],
    [K.crees3 + 0.35, [0.6, 0.95, 1.6], [0, 0.25, 0], 35], [K.memorizar3, [0.26, 0.56, 0.74], [0, 0.33, 0.05], 34], [K.huesos3 + 0.25, [0.05, 0.5, 0.95], [-0.05, 0.18, 0.1], 36],
    [K.realidad3 + 0.1, [0.0, 0.62, 1.55], [0, 0.3, -0.2], 38], [K.encontrar3, [-0.04, 0.42, 0.8], [-0.06, 0.24, -0.2], 34], [K.falla3 + 0.1, [-0.07, 0.3, 0.36], [-0.08, 0.215, -0.18], 30],
    [K.asi3, [0.05, 0.64, 1.0], [0.1, 0.4, 0.52], 34], [cut1 - 0.0005, [0.17, 0.47, 0.62], [0.17, 0.4, 0.55], 32],
  ];
  const hold = (t, a, d, h, dx, ly, ldx, lr = R_ST, f = 34) => [t, stCam(a, d, h, dx), stLook(a, ly, ldx, lr), f];
  const A2 = [
    [cut1, stCam(CS, 9.35, 1.0, -0.32), stLook(CS, 0.9, -0.34), 34], [K.anatomia4 + 0.1, stCam(CS, 9.3, 0.95, -0.38), stLook(CS, 0.78, -0.42), 34],
    [K.fisiologia4 + 0.15, stCam(CS, 9.4, 0.98, 0.0), stLook(CS, 0.85, 0.02), 34], [K.bioquimica4 + 0.2, stCam(CS, 9.5, 1.05, 0.35), stLook(CS, 0.9, 0.44), 35], hold(K.luego5 - 0.25, CS, 9.55, 1.06, 0.38, 0.9, 0.45, R_ST, 35),
    [K.luego5 + 0.15, stCam(LF, 10.0, 1.3), stLook(LF, 0.65), 35], [K.patologia5 + 0.1, stCam(LF, 9.35, 1.05, -0.3), stLook(LF, 0.8, -0.36), 34],
    [K.microbiologia5 + 0.1, stCam(LF, 9.2, 0.95, 0.02), stLook(LF, 0.58, 0.02, R_ST + 0.2), 33], [K.farmacologia5 + 0.15, stCam(LF, 9.35, 1.0, 0.33), stLook(LF, 0.65, 0.36), 34], hold(K.desde6 - 0.2, LF, 9.4, 1.0, 0.36, 0.65, 0.38, R_ST, 34),
    [K.desde6 + 0.2, stCam(CL, 10.1, 1.3, 0), stLook(CL, 0.7, 0), 35], [K.clinicas6 + 0.1, stCam(CL, 9.5, 0.95, -0.2), stLook(CL, 0.62, -0.24, R_ST + 0.25), 34],
    [K.corazon6 + 0.1, stCam(CL, 9.4, 1.05, -0.32), stLook(CL, 0.95, -0.36, R_ST - 0.2), 34], [K.cerebro6 + 0.1, stCam(CL, 9.35, 1.0, 0.05), stLook(CL, 0.85, 0.06), 34],
    [K.ninos6 + 0.1, stCam(CL, 9.35, 0.85, 0.36), stLook(CL, 0.66, 0.38, R_ST + 0.15), 34], hold(K.sexto7 - 0.2, CL, 9.4, 0.86, 0.38, 0.66, 0.4, R_ST + 0.15, 34),
    [K.sexto7 + 0.2, stCam(HO, 10.2, 1.4, 0), stLook(HO, 0.7, 0), 36], [K.entero7 + 0.1, stCam(HO, 9.6, 1.05, 0.25), stLook(HO, 0.72, 0.1, R_ST + 0.1), 35],
    [K.hospital7 + 0.2, stCam(HO, 9.45, 1.0, -0.1), stLook(HO, 0.75, -0.1, R_ST - 0.05), 34], hold(K.que8 + 0.1, HO, 9.45, 1.0, -0.12, 0.75, -0.12, R_ST - 0.05, 34),
    [K.falta8 + 0.3, stCam(MI, 10.0, 1.4, 0), stLook(MI, 0.7, 0), 35], [K.n200 + 0.1, stCam(MI, 9.2, 1.15, -0.08), stLook(MI, 0.68, -0.06, R_ST + 0.05), 33],
    [K.cuatro8 + 0.1, stCam(MI, 9.35, 1.05, 0.25), stLook(MI, 0.98, 0.3, R_ST - 0.1), 34], [K.media8 + 0.2, stCam(MI, 9.4, 1.1, 0.2), stLook(MI, 0.9, 0.22, R_ST - 0.1), 34],
    [K.fallo8, stCam(MI, 9.0, 0.95, -0.05), stLook(MI, 0.68, -0.05, R_ST + 0.08), 31], hold(cut2 - 0.0005, MI, 8.98, 0.94, -0.04, 0.68, -0.05, R_ST + 0.08, 31),
  ];
  const A3 = [
    [cut2, [1.0, 2.0, 6.4], [0, 0, 2.0], 40], [K.n15000 + 0.3, [1.4, 3.4, 7.0], [0, 0, 1.0], 42], [K.n9000 + 0.1, [2.0, 6.6, 7.8], [0.2, 0, 0.3], 42], [K.plazas9 + 0.4, [2.0, 8.2, 7.2], [0.2, 0, 0.0], 41],
    [K.tu9 + 0.1, [0.3, 2.4, 4.3], [-0.6, 0, 1.6], 38], [K.numero9 + 0.3, [-0.55, 0.5, 2.1], [me.x, 0.05, me.z], 35], [K.especialidad9 + 0.1, [-0.5, 0.42, 1.88], [me.x, 0.06, me.z], 33], [K.ciudad9 + 0.3, [-0.42, 0.62, 2.1], [me.x, 0.04, me.z - 0.06], 34],
    [K.este10 + 0.2, [0.8, 1.5, 5.4], [0, 0, 3.3], 38], [K.dermatologia10 + 0.3, [0.5, 0.85, 4.6], [0, 0, 3.45], 36], [K.agoto10 + 0.2, [0.15, 0.68, 4.35], [0, 0, 3.42], 34], [K.n500 + 0.3, [-0.4, 1.1, 5.0], [0, 0, 3.2], 37],
    [cut3 - 0.0005, [-0.5, 1.2, 5.2], [0, 0, 3.15], 37],
  ];
  const A4 = [
    [cut3, stCam(RE, 10.2, 1.3, 0), stLook(RE, 0.7, 0), 36], [K.cuatro11 + 0.1, stCam(RE, 9.6, 1.0, -0.1), stLook(RE, 0.68, -0.08, R_ST + 0.1), 34], [K.residencia11 + 0.4, stCam(RE, 9.5, 1.1, -0.05), stLook(RE, 0.85, -0.08, R_ST - 0.1), 34],
    [K.cobrando11 + 0.1, stCam(RE, 9.4, 0.95, 0.36), stLook(RE, 0.6, 0.42, R_ST + 0.15), 33], [K.guardias11 + 0.1, stCam(RE, 9.5, 1.15, 0.3), stLook(RE, 0.95, 0.35, R_ST - 0.2), 34], hold(K.seis12 - 0.25, RE, 9.55, 1.16, 0.3, 0.95, 0.35, R_ST - 0.2, 34),
    [K.seis12 + 0.15, stCam(AN, 9.6, 1.0, -0.15), stLook(AN, 0.75, -0.18, R_ST + 0.06), 34], [K.cinco12 + 0.2, stCam(AN, 9.55, 1.25, -0.12), stLook(AN, 0.98, -0.18, R_ST + 0.06), 34], [K.once12 + 0.1, stCam(AN, 9.9, 1.3, 0.0), stLook(AN, 0.92, 0.0), 36],
    [K.cirujano12 + 0.2, stCam(AN, 9.45, 1.0, 0.22), stLook(AN, 0.8, 0.24, R_ST + 0.05), 34], hold(K.si13 - 0.3, AN, 9.5, 1.0, 0.22, 0.8, 0.24, R_ST + 0.05, 34),
    [K.si13 + 0.2, stCam(DU, 10.4, 1.4, 0), stLook(DU, 0.7, 0), 37], [K.guardalo13, stCam(DU, 10.1, 1.25, 0), stLook(DU, 0.72, 0), 37],
    [K.quirofano13 + 0.1, stCam(DU, 9.5, 1.05, -0.4), stLook(DU, 0.8, -0.42), 35], [K.consulta13 + 0.12, stCam(DU, 9.5, 1.05, 0.38), stLook(DU, 0.78, 0.4), 35], [K.consulta13 + 0.4, stCam(DU, 10.0, 1.2, 0.2), stLook(DU, 0.75, 0.1), 36],
    [END - 0.25, TA, LA, 44], [END, T0, L0, 44], [END + T_HIT, [0.47, 0.14, 0.92], [0, 0.24, 0], 43],
  ];
  CKS = [A1, A2, A3, A4];
}
function camAt(t) {
  let i = 0; while (i < CUTS.length && t >= CUTS[i]) i++;
  const st = camKeys(t, CKS[i]);
  const u = t - T_HIT; if (u > 0 && u < 0.45) { const a = 0.012 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; st.l.y += Math.sin(u * 83 + 2) * a * 0.6; }
  return st;
}
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return t; return t - dt; }
// ---------------------------------------------------------------- destellos y blanco (la zambullida en la lámina del atlas)
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[T_HIT, 0.16], [K.cuatro1, 0.05], [K.ninguno2, 0.05], [K.falla3, 0.06], [K.anatomia4, 0.04], [K.patologia5, 0.04], [K.corazon6, 0.04], [K.sexto7, 0.04], [K.mir8, 0.05], [K.fallo8, 0.06],
    [CUTS[1], 0.14], [K.n9000, 0.06], [K.numero9 + 0.2, 0.05], [K.agoto10, 0.08], [CUTS[2], 0.14], [K.cobrando11, 0.04], [K.once12, 0.08], [K.quirofano13, 0.05], [K.consulta13, 0.05]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { const c = CUTS[0]; return t < c ? eio(clamp((t - (c - 0.3)) / 0.3)) : 1 - eo(clamp((t - c - 0.05) / 0.4)); }
// ---------------------------------------------------------------- un instante de la escena
function stageAt(t, st) {
  NOW = t; centerAt(t, st); stationsAt(t);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.2, 1.6);
  rigAt(c, yaw, k, 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0.0; R.hemi.intensity = 0.12 + 0.25 * (t > CUTS[1] && t < CUTS[2] ? 1 : 0);
}
// ---------------------------------------------------------------- HUD: cabecera con el «mensaje pendiente» (qué te falta), cifras grandes y rótulos con línea guía
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A', HD = '#8FE6FF';
function hdr(t) {
  const a = 1 - 0.85 * whiteAt(t); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic';
  const tk = clamp((t + 0.6) / 0.7);
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('MEDICINA', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('EL GRADO, POR DENTRO', tk), 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('GRADO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('360 ECTS', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('6 AÑOS', 1024, 178);
  const mk = win(t, K.final2, 0.3) * (1 - win(t, K.si13 + 0.5, 0.4));
  if (mk > 0.01) {
    let txt = 'LO QUE TE FALTA · ???', col = HC.red, blink = true;
    if (t > K.mir8) { txt = 'MIR · 200 PREGUNTAS'; col = HC.green; blink = false; }
    if (t > K.residencia11) { txt = 'MIR + RESIDENCIA'; col = HG; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = a * mk; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath();
    hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
    hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
    hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y);
  }
  hg.restore();
}
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));        // ventana de un rótulo
function lab(o, x, y, z, txt, sub, k, opt) { if (k <= 0.01 || !o.visible) return; callout(wpo(o, x, y, z), txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1430;
  // L1: menos de 4 de cada 100 · pueden elegir Dermatología
  { const k = cw(t, K.cuatro1, K.y2 - 0.2); if (k > 0.01) { bigText('< 4 / 100', W / 2, Y, 120, HG, k, { glow: 26, type: false, dark: 30, ls: 6 }); bigText('PUEDEN ELEGIR DERMATOLOGÍA', W / 2, Y + 96, 30, HC.white, cw(t, K.elegir1, K.y2 - 0.2), { dark: 20 }); } }
  // L2: la especialidad, cerrada · ¿qué te falta?
  if (S.vit.visible) { const L = S.vit.userData.lock; lab(L, 0, 0, 0.01, 'ESPECIALISTA', 'NO CON EL GRADO', cw(t, K.ninguno2 + 0.1, K.final2 - 0.1), { dx: 150, dy: -90, color: HC.red });
    const q = cw(t, K.falta2, K.crees3); if (q > 0.01) { const P = proj(wpo(L, 0, 0.02, 0.02)); if (P.ok) bigText('?', P.x, P.y - 150, 150, HC.red, q, { glow: 30, type: false }); } }
  // L3: memorizar ✗ → diagnosticar ✓
  { const k = cw(t, K.memorizar3 - 0.05, K.asi3); if (k > 0.01) { bigText('MEMORIZAR', W / 2, Y, 64, HC.white, k, { a: 1 - 0.55 * win(t, K.realidad3, 0.3), dark: 24 });
      const s = win(t, K.realidad3 - 0.05, 0.3); if (s > 0.01) { hg.save(); hg.strokeStyle = HC.red; hg.lineWidth = 7; hg.shadowColor = HC.red; hg.shadowBlur = 14; hg.beginPath(); hg.moveTo(W / 2 - 230, Y); hg.lineTo(W / 2 - 230 + 460 * eo(s), Y); hg.stroke(); hg.restore(); }
      bigText('DIAGNOSTICAR', W / 2, Y + 100, 70, HG, cw(t, K.encontrar3 - 0.1, K.asi3), { glow: 20, dark: 26 }); } }
  if (S.lbox.visible) lab(S.lbox.userData.ring, 0, 0.04, 0, 'AQUÍ FALLA', null, cw(t, K.falla3 + 0.05, K.asi3), { dx: -120, dy: -150, color: HC.red });
  // L4–L8: rótulos de cada estación
  const CS = ST.CS; if (CS.Z.visible) { lab(CS.skull, 0, 0.24, 0, 'ANATOMÍA', null, cw(t, K.anatomia4 + 0.1, K.luego5 - 0.1), { dx: -110, dy: -130 });
    lab(CS.heart, 0, 0.3, 0, 'FISIOLOGÍA', null, cw(t, K.fisiologia4 + 0.1, K.luego5 - 0.1), { dx: 100, dy: -150, color: HC.red }); lab(CS.mol, 0, 0.1, 0, 'BIOQUÍMICA', null, cw(t, K.bioquimica4 + 0.1, K.luego5 - 0.1), { dx: -100, dy: -140, color: HG }); }
  const LF = ST.LF; if (LF.Z.visible) { lab(LF.mic, 0, 0.3, 0, 'PATOLOGÍA', null, cw(t, K.patologia5 + 0.1, K.desde6 - 0.1), { dx: -110, dy: -120 });
    lab(LF.pet, 0, 0.03, 0, 'MICROBIOLOGÍA', null, cw(t, K.microbiologia5 + 0.1, K.desde6 - 0.1), { dx: -100, dy: -170, color: HC.green }); lab(LF.bot, 0, 0.16, 0, 'FARMACOLOGÍA', null, cw(t, K.farmacologia5 + 0.1, K.desde6 - 0.1), { dx: 100, dy: -130, color: HD }); }
  const CL = ST.CL; if (CL.Z.visible) { const k = cw(t, K.tercero6 - 0.05, K.sexto7 - 0.2); if (k > 0.01) bigText('DESDE 3.º · CLÍNICAS', W / 2, Y + 40, 44, HC.white, k, { dark: 24 });
    lab(CL.mon, 0, 0.13, 0, 'CORAZÓN', 'CARDIOLOGÍA', cw(t, K.corazon6 + 0.1, K.sexto7 - 0.15), { dx: -100, dy: -120, color: HC.red }); lab(CL.brain, 0, 0.1, 0, 'CEREBRO', 'NEUROLOGÍA', cw(t, K.cerebro6 + 0.1, K.sexto7 - 0.15), { dx: 100, dy: -160 });
    lab(CL.ted, 0, 0.18, 0, 'NIÑOS', 'PEDIATRÍA', cw(t, K.ninos6 + 0.1, K.sexto7 - 0.15), { dx: 100, dy: -110, color: HG }); }
  const HO = ST.HO; if (HO.Z.visible) { const k = cw(t, K.sexto7, K.mir8 - 0.3); if (k > 0.01) { bigText('6.º · ROTATORIO', W / 2, Y, 70, HC.white, k, { glow: 12, dark: 26 }); bigText('CASI TODO EL AÑO EN EL HOSPITAL', W / 2, Y + 76, 28, HG, cw(t, K.entero7, K.mir8 - 0.3), { dark: 20 }); } }
  const MI = ST.MI; if (MI.Z.visible) { const k = cw(t, K.n200 - 0.05, K.cuatro8 - 0.1); if (k > 0.01) { const n = Math.min(200, Math.round(200 * eo(clamp((t - K.n200 + 0.05) / 0.6)))); bigText(String(n), W / 2, Y - 10, 130, HC.white, k, { glow: 14, type: false, dark: 30 }); bigText('PREGUNTAS · 4 OPCIONES', W / 2, Y + 80, 30, HC.white, k, { dark: 20 }); }
    const c = cw(t, K.cuatro8 - 0.05, K.fallo8 - 0.1); if (c > 0.01) { bigText('4 H 30 MIN', W / 2, Y, 96, HG, c, { glow: 18, type: false, dark: 30 }); }
    const f = cw(t, K.fallo8 - 0.05, K.mas9 - 0.1); if (f > 0.01) { bigText('ACIERTO +3', W / 2, Y - 20, 60, HC.green, f, { type: false, dark: 24 }); bigText('FALLO −1', W / 2, Y + 60, 72, HC.red, cw(t, K.resta8 - 0.1, K.mas9 - 0.1), { glow: 16, type: false, dark: 26 }); } }
  // L9: +15.000 · ≈ 9.000 plazas · tu número
  { const k = cw(t, K.n15000 - 0.1, K.tu9 - 0.2); if (k > 0.01) { const n = Math.round(15000 * eo(clamp((t - K.n15000 + 0.1) / 0.9)) / 100) * 100; bigText('+' + n.toLocaleString('es-ES'), W / 2, Y - 40, 110, HC.white, k, { type: false, dark: 34 });
      bigText('SE PRESENTAN AL MIR', W / 2, Y + 50, 28, HC.white, k, { dark: 24 }); bigText('≈ 9.000 PLAZAS', W / 2, Y + 150, 80, HG, cw(t, K.n9000 - 0.05, K.tu9 - 0.2), { glow: 18, type: false, dark: 34 }); }
    const m = cw(t, K.numero9 - 0.05, K.este10 - 0.15); if (m > 0.01 && S.me.visible) { callout(S.me.position.clone().add(v3(0, 0.07, 0)), 'TU NÚMERO', 'Nº 4.722 · EJEMPLO', m, { dx: 110, dy: -160, size: 28, subSize: 20, bg: true, color: HG });
      bigText('→ ESPECIALIDAD', W / 2, Y, 50, HC.white, cw(t, K.especialidad9 - 0.1, K.este10 - 0.15), { dark: 24 }); bigText('→ CIUDAD', W / 2, Y + 70, 50, HG, cw(t, K.ciudad9 - 0.1, K.este10 - 0.15), { dark: 24 }); } }
  // L10: Dermatología, agotada antes del 500
  { const k = cw(t, K.dermatologia10 - 0.05, K.y11 - 0.1); if (k > 0.01) { bigText('DERMATOLOGÍA', W / 2, Y - 30, 70, HD, k, { glow: 18, dark: 28 });
      const n = Math.min(500, Math.max(1, Math.round(500 * eo(clamp((t - K.dermatologia10) / (K.agoto10 - K.dermatologia10 + 0.2)))))); bigText('Nº 1 → ' + n, W / 2, Y + 50, 40, HC.white, k, { type: false, dark: 22 });
      const s = cw(t, K.agoto10 - 0.05, K.y11 - 0.1); if (s > 0.01) stamp('AGOTADA', W / 2, Y + 170, s, HC.red, 84); } }
  // L11–L12
  const RE = ST.RE; if (RE.Z.visible) { const k = cw(t, K.cuatro11 - 0.05, K.cobrando11 - 0.1); if (k > 0.01) { bigText('4 – 5 AÑOS', W / 2, Y, 96, HC.white, k, { glow: 14, type: false, dark: 28 }); bigText('DE RESIDENCIA', W / 2, Y + 80, 34, HG, cw(t, K.residencia11 - 0.1, K.cobrando11 - 0.1), { dark: 22 }); }
    lab(RE.nom, 0, 0.12, 0, 'COBRANDO', 'CONTRATO DE RESIDENTE', cw(t, K.cobrando11 + 0.1, K.seis12 - 0.1), { dx: -110, dy: -140, color: HC.green }); lab(RE.clk, 0, 0.16, 0, 'GUARDIAS', null, cw(t, K.guardias11 + 0.05, K.seis12 - 0.1), { dx: -110, dy: -120, color: HC.amber }); }
  const AN = ST.AN; if (AN.Z.visible) { const a = cw(t, K.seis12 - 0.05, K.si13 - 0.1); if (a > 0.01) { const s6 = 'GRADO 6', s5 = cw(t, K.cinco12 - 0.1, K.si13 - 0.1); bigText(s6, W / 2 - (s5 > 0.01 ? 180 : 0), Y, 70, HC.white, a, { type: false, dark: 26 });
      if (s5 > 0.01) bigText('+ MIR 5', W / 2 + 190, Y, 70, '#62E3D4', s5, { type: false, dark: 26 });
      const o = cw(t, K.once12 - 0.05, K.si13 - 0.1); if (o > 0.01) bigText('= 11 AÑOS', W / 2, Y + 100, 96, HG, o, { glow: 22, type: false, dark: 30 }); }
    lab(AN.sur, 0, 1.15, 0, 'CIRUJANO', null, cw(t, K.cirujano12 + 0.05, K.si13 - 0.1), { dx: 110, dy: -130, color: HG }); }
  // L13: guárdalo · ¿quirófano o consulta?
  { const g = cw(t, K.guardalo13 - 0.05, K.dime13); if (g > 0.01) { const s = eo(clamp((t - K.guardalo13 + 0.05) / 0.3)); hg.save(); hg.globalAlpha = g; hg.translate(W / 2, Y); hg.scale(s, s); hg.fillStyle = HG; hg.shadowColor = HG; hg.shadowBlur = 24; hg.beginPath(); hg.moveTo(-50, -80); hg.lineTo(50, -80); hg.lineTo(50, 80); hg.lineTo(0, 45); hg.lineTo(-50, 80); hg.closePath(); hg.fill(); hg.restore(); }
    const d = cw(t, K.quirofano13 - 0.15, END - 0.6); if (d > 0.01) { bigText('¿QUIRÓFANO', W / 2 - 10, Y - 20, 74, '#62E3D4', d, { glow: 14, type: false, dark: 26 }); bigText('O CONSULTA?', W / 2, Y + 70, 74, HG, cw(t, K.consulta13 - 0.1, END - 0.6), { glow: 18, type: false, dark: 26 }); } }
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
    menos1: atL(1, 'menos'), cuatro1: atL(1, '=4'), cien1: atL(1, '=100'), medicos1: atL(1, 'medicos'), mir1: atL(1, '=mir'), elegir1: atL(1, 'elegir'), dermatologos1: atL(1, 'dermatologos'),
    y2: atL(2, '=y'), ninguno2: atL(2, 'ninguno'), especialista2: atL(2, 'especialista'), carrera2: atL(2, 'carrera'), final2: atL(2, 'final'), falta2: atL(2, 'falta'),
    crees3: atL(3, 'crees'), medicina3: atL(3, 'medicina'), memorizar3: atL(3, 'memorizar'), huesos3: atL(3, 'huesos'), realidad3: atL(3, 'realidad'), encontrar3: atL(3, 'encontrar'), falla3: atL(3, 'falla'), asi3: atL(3, 'asi'), dentro3: atL(3, 'dentro'),
    primero4: atL(4, 'primero'), cuerpo4: atL(4, 'cuerpo'), sano4: atL(4, 'sano'), anatomia4: atL(4, 'anatomia'), fisiologia4: atL(4, 'fisiologia'), bioquimica4: atL(4, 'bioquimica'),
    luego5: atL(5, 'luego'), falla5: atL(5, 'falla'), patologia5: atL(5, 'patologia'), microbiologia5: atL(5, 'microbiologia'), farmacologia5: atL(5, 'farmacologia'),
    desde6: atL(6, 'desde'), tercero6: atL(6, 'tercero'), clinicas6: atL(6, 'clinicas'), corazon6: atL(6, 'corazon'), cerebro6: atL(6, 'cerebro'), ninos6: atL(6, 'ninos'),
    sexto7: atL(7, 'sexto'), casi7: atL(7, 'casi'), entero7: atL(7, 'entero'), dentro7: atL(7, 'dentro'), hospital7: atL(7, 'hospital'),
    que8: atL(8, '=que'), falta8: atL(8, 'falta'), mir8: atL(8, '=mir'), n200: atL(8, '=200'), preguntas8: atL(8, 'preguntas'), cuatro8: atL(8, 'cuatro'), media8: atL(8, 'media'), fallo8: atL(8, 'fallo'), resta8: atL(8, 'resta'),
    mas9: atL(9, '=mas'), n15000: atL(9, '=15000'), medicos9: atL(9, 'medicos'), n9000: atL(9, '=9000'), plazas9: atL(9, 'plazas'), tu9: atL(9, '=tu'), numero9: atL(9, 'numero'), decide9: atL(9, 'decide'), especialidad9: atL(9, 'especialidad'), ciudad9: atL(9, 'ciudad'),
    este10: atL(10, 'este'), dermatologia10: atL(10, 'dermatologia'), agoto10: atL(10, 'agoto'), n500: atL(10, '=500'),
    y11: atL(11, '=y'), despues11: atL(11, 'despues'), cuatro11: atL(11, 'cuatro'), cinco11: atL(11, 'cinco'), residencia11: atL(11, 'residencia'), cobrando11: atL(11, 'cobrando'), guardias11: atL(11, 'guardias'),
    seis12: atL(12, 'seis'), carrera12: atL(12, 'carrera'), cinco12: atL(12, 'cinco'), residencia12: atL(12, 'residencia'), once12: atL(12, 'once'), cirujano12: atL(12, 'cirujano'),
    si13: atL(13, '=si'), medicina13: atL(13, 'medicina'), guardalo13: atL(13, 'guardalo'), dime13: atL(13, 'dime'), quirofano13: atL(13, 'quirofano'), consulta13: atL(13, 'consulta'),
  };
  mats(); buildMats(); buildMedMats(); buildRig(); buildFloor(); buildFlow();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  scene.fog = new THREE.FogExp2(0x000000, 0.035);
  buildCenter(); buildStations();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
