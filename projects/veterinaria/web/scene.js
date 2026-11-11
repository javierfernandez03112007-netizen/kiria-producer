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
const ANG = { AN: 30, FA: 76, MI: 122, PR: 168, CI: 214, SA: 266, RE: 318 };
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
  const brow = sph(0.05, m, 24, 16); brow.scale.set(1.45, 0.32, 0.5); brow.position.set(0, 0.128, 0.078); g.add(brow);
  for (const sd of [-1, 1]) { const e = sph(0.022, M.dark, 20, 14); e.scale.set(1.0, 0.9, 0.32); e.position.set(sd * 0.031, 0.1, 0.1); g.add(e);
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
  const mat = mesh(new THREE.BoxGeometry(0.34, 0.06, 0.7), M.mattress); mat.position.y = 0.17; g.add(mat);
  const pil = mesh(new THREE.CapsuleGeometry(0.03, 0.17, 6, 12), M.mattress); pil.rotation.z = Math.PI / 2; pil.scale.set(1, 1, 0.55); pil.position.set(0, 0.215, -0.28); g.add(pil);
  const bl = mesh(new THREE.BoxGeometry(0.35, 0.03, 0.4), M.blanket); bl.position.set(0, 0.262, 0.13); g.add(bl);
  for (const z of [-0.36, 0.36]) { const hb = mesh(new THREE.BoxGeometry(0.38, z < 0 ? 0.22 : 0.14, 0.02), M.enamel); hb.position.set(0, 0.13 + (z < 0 ? 0.11 : 0.07), z); g.add(hb); }
  for (const x of [-0.17, 0.17]) for (const z of [-0.33, 0.33]) { const l = cyl(0.008, 0.008, 0.11, ch, 10); l.position.set(x, 0.065, z); g.add(l); const w = cyl(0.014, 0.014, 0.01, M.tubing, 14); w.rotation.z = Math.PI / 2; w.position.set(x, 0.014, z); g.add(w); }
  for (const x of [-0.185, 0.185]) { const r = mesh(new THREE.BoxGeometry(0.008, 0.05, 0.3), ch); r.position.set(x, 0.24, -0.1); g.add(r); }
  const pat = figurine(M.ceramic, 2.5); pat.rotation.x = -Math.PI / 2; pat.position.set(0, 0.236, 0.25); pat.userData.J.shL.rotation.z = -0.15; pat.userData.J.shR.rotation.z = 0.15; g.add(pat); g.userData.pat = pat;
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
// ---------------------------------------------------------------- «Veterinaria por dentro»: animales de plástico brillante (vaca, ternero, perro, gato, caballo,
// cerdo y gallina) hechos con secciones (loft) en el «espacio del animal» (mira hacia +z, suelo en y = 0, medidas reales en metros); manchas y rayas
// con ruido 3D en el sombreador (sin costuras); rayos X (el borde brilla) y esqueletos que salen de las mismas medidas.
const NOISE_GLSL = `
float h3(vec3 p){ p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }
float fbm3(vec3 p){ float a = 0.5, s = 0.; for (int i = 0; i < 4; i++){ s += a * vn3(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }`;

// ---------- loft: anillos (elipse o superelipse) a lo largo de un camino; anillo cerrado (sin costura) y tapas redondeadas
function loftGeo(C, R, o = {}) {
  const nr = o.nr || 28, sub = o.sub || 7, e0 = o.e || 2;
  const cc = new THREE.CatmullRomCurve3(C.map(p => v3(p[0], p[1], p[2])), false, 'catmullrom', 0.5);
  const rc = new THREE.CatmullRomCurve3(R.map(r => v3(r[0], r[1], r[2] ?? e0)), false, 'catmullrom', 0.5);
  const n = (C.length - 1) * sub + 1, S0 = o.side ? v3(...o.side) : v3(1, 0, 0);
  const rings = [];       // [{P, X, U, rx, ry, e}]
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), P = cc.getPoint(u), r = rc.getPoint(u), T = cc.getTangent(u).normalize();
    const X = S0.clone().addScaledVector(T, -S0.dot(T)).normalize(), U = new THREE.Vector3().crossVectors(T, X);
    rings.push({ P, X, U, T, rx: Math.max(1e-4, r.x), ry: Math.max(1e-4, r.y), e: r.z });
  }
  const pos = [], idx = [];
  const ringAt = (g, k) => {           // anillo g escalado k y desplazado d a lo largo de T
    const base = pos.length / 3;
    for (let j = 0; j < nr; j++) {
      const a = j / nr * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), ex = 2 / g.e;
      const fx = Math.sign(ca) * Math.pow(Math.abs(ca), ex), fy = Math.sign(sa) * Math.pow(Math.abs(sa), ex);
      const p = g.P.clone().addScaledVector(g.X, g.rx * fx * k).addScaledVector(g.U, g.ry * fy * k).addScaledVector(g.T, g.d || 0);
      pos.push(p.x, p.y, p.z);
    }
    return base;
  };
  const cap = (g, L, sgn, kk = 4) => { const out = []; for (let q = kk; q >= 1; q--) { const f = q / (kk + 1) * Math.PI / 2; out.push({ ...g, d: sgn * L * Math.sin(f), k: Math.cos(f) }); } return out; };
  const g0 = rings[0], g1 = rings[n - 1];
  const L0 = (o.cap0 ?? 1) * (g0.rx + g0.ry) / 2, L1 = (o.cap1 ?? 1) * (g1.rx + g1.ry) / 2;
  const seq = [...(L0 > 0 ? cap(g0, L0, -1) : []), ...rings.map(g => ({ ...g, k: 1 })), ...(L1 > 0 ? cap(g1, L1, 1).reverse() : [])];
  const bases = seq.map(g => ringAt(g, g.k));
  for (let i = 0; i < seq.length - 1; i++) for (let j = 0; j < nr; j++) {
    const a = bases[i] + j, b = bases[i] + (j + 1) % nr, c = bases[i + 1] + (j + 1) % nr, d = bases[i + 1] + j; idx.push(a, b, d, b, c, d);
  }
  const p0 = g0.P.clone().addScaledVector(g0.T, -L0), p1 = g1.P.clone().addScaledVector(g1.T, L1);
  const i0 = pos.length / 3; pos.push(p0.x, p0.y, p0.z); const i1 = pos.length / 3; pos.push(p1.x, p1.y, p1.z);
  const bf = bases[0], bl = bases[bases.length - 1];
  for (let j = 0; j < nr; j++) { idx.push(i0, bf + (j + 1) % nr, bf + j); idx.push(bl + j, bl + (j + 1) % nr, i1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  geo.setAttribute('aop', new THREE.Float32BufferAttribute(pos.slice(), 3));
  geo.userData.rings = rings; geo.userData.curve = cc; geo.userData.rcurve = rc;
  return geo;
}
const addAop = g => { if (!g.attributes.aop) g.setAttribute('aop', g.attributes.position.clone()); return g; };
// geometría colocada en el espacio del animal (para que las manchas sigan el mismo ruido): esfera, cono y cilindro
function sphG(c, s, rot = [0, 0, 0], seg = 20) { const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)); g.scale(s[0], s[1], s[2]); g.rotateX(rot[0]); g.rotateY(rot[1]); g.rotateZ(rot[2]); g.translate(c[0], c[1], c[2]); return addAop(g); }
function coneG(base, tip, r, seg = 18) { const a = v3(...base), b = v3(...tip), L = a.distanceTo(b); const g = new THREE.ConeGeometry(r, L, seg); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize())); g.translate(a.x, a.y, a.z); return addAop(g); }
function cylG(a0, b0, r0, r1, seg = 18) { const a = v3(...a0), b = v3(...b0), L = a.distanceTo(b); const g = new THREE.CylinderGeometry(r1, r0, L, seg); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize())); g.translate(a.x, a.y, a.z); return addAop(g); }

// ---------- materiales: manchas (vaca, perro) o rayas (gato) con ruido 3D; el ruido va en el espacio del animal (atributo aop)
function patchMat(c1, c2, o = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: o.r ?? 0.36, metalness: 0, clearcoat: o.cc ?? 0.75, clearcoatRoughness: o.ccr ?? 0.16 });
  const U = { pc1: { value: new THREE.Color(c1) }, pc2: { value: new THREE.Color(c2) }, pf: { value: o.f ?? 2.4 }, pth: { value: o.th ?? 0.5 }, pseed: { value: v3(...(o.seed || [1.3, 7.1, 3.7])) },
    pgrad: { value: new THREE.Vector4(...(o.grad || [0, 0, 0, 0])) }, pmode: { value: o.mode || 0 }, pdir: { value: v3(...(o.dir || [0, 0, 1])) }, pstr: { value: o.str || 60 }, pwarp: { value: o.warp ?? 0.45 } };
  m.userData.u = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aop; varying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = aop;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vOP; uniform vec3 pc1, pc2, pseed, pdir; uniform vec4 pgrad; uniform float pf, pth, pmode, pstr, pwarp;\n${NOISE_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 q = vOP * pf + pseed; q += pwarp * (vec3(vn3(q * 0.9 + 3.1), vn3(q * 0.9 + 7.7), vn3(q * 0.9 + 1.9)) - 0.5);
        float mm = pmode < 0.5 ? fbm3(q) : 0.5 + 0.5 * sin(dot(vOP, pdir) * pstr + fbm3(q) * 5.0);
        mm += dot(pgrad.xyz, vOP) + pgrad.w;
        float ww = max(fwidth(mm), 1e-4) * 1.1;
        diffuseColor.rgb *= mix(pc1, pc2, smoothstep(pth - ww, pth + ww, mm));`);
  };
  m.customProgramCacheKey = () => 'patch';
  return m;
}
// rayos X: el borde brilla (cuanto más de canto, más luz), aditivo; con planos de recorte para el barrido
const XR_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec3 vN; varying vec3 vV;
void main(){ vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mvPosition.xyz; gl_Position = projectionMatrix * mvPosition;
#include <logdepthbuf_vertex>
#include <clipping_planes_vertex>
}`;
const XR_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
uniform vec3 col; uniform float op, pw, base;
varying vec3 vN; varying vec3 vV;
void main(){
#include <clipping_planes_fragment>
#include <logdepthbuf_fragment>
  float r = 1.0 - abs(dot(normalize(vN), normalize(vV))); float a = (base + pow(r, pw)) * op;
  gl_FragColor = vec4(col * a, 1.0); }`;
function xrayMat(col = 0x8fd2ff, o = {}) {
  return new THREE.ShaderMaterial({ vertexShader: XR_VS, fragmentShader: XR_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, clipping: true,
    uniforms: { col: { value: new THREE.Color(col) }, op: { value: o.op ?? 1 }, pw: { value: o.pw ?? 2.6 }, base: { value: o.base ?? 0.03 } } });
}
const boneMat = () => new THREE.MeshStandardMaterial({ color: 0xe9eef3, emissive: 0xbfe4ff, emissiveIntensity: 0.6, roughness: 0.55 });

// ---------- definiciones (metros, mirando a +z). Cada parte: C (centros), R ([rx, ry, e]), padre, pivote, material
const mirX = C => C.map(p => [-p[0], p[1], p[2]]);
const ANIMALS = {
  cow: {
    mats: () => ({ body: patchMat(0xf6f3ec, 0x141417, { f: 2.3, th: 0.5, grad: [0, 0.32, 0, -0.32], seed: [2.1, 5.3, 1.7] }), dark: plastic(0x1a1918, 0.4), pink: plastic(0xd9a49a, 0.38),
      horn: new THREE.MeshPhysicalMaterial({ color: 0xe9dcc0, roughness: 0.35, clearcoat: 0.6 }), eye: new THREE.MeshPhysicalMaterial({ color: 0x08080a, roughness: 0.1, clearcoat: 1 }) }),
    parts: [
      { n: 'body', C: [[0, 1.20, -0.86], [0, 1.18, -0.62], [0, 1.10, -0.38], [0, 1.05, -0.14], [0, 1.06, 0.10], [0, 1.10, 0.34], [0, 1.14, 0.58]],
        R: [[0.15, 0.17], [0.30, 0.33], [0.33, 0.40], [0.35, 0.44], [0.35, 0.44], [0.29, 0.40], [0.21, 0.32]], e: 2.2, cap0: 0.5, cap1: 0.6, nr: 40, sub: 8 },
      { n: 'neck', piv: [0, 1.22, 0.52], C: [[0, 1.20, 0.46], [0, 1.24, 0.70], [0, 1.24, 0.86]], R: [[0.19, 0.27], [0.16, 0.23], [0.13, 0.18]], cap0: 0, cap1: 0.4 },
      { n: 'dew', par: 'neck', C: [[0, 0.98, 0.52], [0, 1.0, 0.66], [0, 1.08, 0.80]], R: [[0.05, 0.12], [0.045, 0.1], [0.04, 0.06]], cap0: 0.4, cap1: 0.6 },
      { n: 'head', par: 'neck', piv: [0, 1.27, 0.90], C: [[0, 1.29, 0.90], [0, 1.23, 0.99], [0, 1.12, 1.10], [0, 1.01, 1.20], [0, 0.95, 1.26]],
        R: [[0.11, 0.11], [0.125, 0.13], [0.11, 0.11], [0.09, 0.09], [0.10, 0.08]], e: 2.2, cap0: 0.8, cap1: 0.6 },
      { n: 'nose', par: 'head', m: 'pink', sph: [[0, 0.95, 1.31], [0.105, 0.075, 0.055], [-0.6, 0, 0]] },
      { n: 'nost', par: 'head', m: 'dark', sph: [[0.04, 0.945, 1.358], [0.014, 0.01, 0.008], [-0.6, 0, 0]], mir: 1 },
      { n: 'eye', par: 'head', m: 'eye', sph: [[0.098, 1.19, 1.03], [0.026, 0.026, 0.026]], mir: 1 },
      { n: 'ear', par: 'head', piv: [0.11, 1.27, 0.97], C: [[0.11, 1.27, 0.97], [0.18, 1.27, 0.975], [0.27, 1.25, 0.985]], R: [[0.03, 0.016], [0.062, 0.013], [0.036, 0.01]], side: [0, 0, 1], cap0: 0.3, cap1: 0.8, mir: 1 },
      { n: 'horn', par: 'head', m: 'horn', C: [[0.07, 1.34, 0.93], [0.13, 1.39, 0.925], [0.18, 1.47, 0.95]], R: [[0.028, 0.028], [0.02, 0.02], [0.006, 0.006]], side: [0, 0, 1], cap0: 0.2, cap1: 0.6, nr: 14, mir: 1 },
      { n: 'legF', piv: [0.16, 1.0, 0.42], C: [[0.16, 1.0, 0.42], [0.165, 0.62, 0.44], [0.165, 0.40, 0.43], [0.165, 0.12, 0.44], [0.165, 0.06, 0.445]],
        R: [[0.08, 0.13], [0.075, 0.09], [0.055, 0.065], [0.045, 0.05], [0.05, 0.055]], cap0: 0.3, cap1: 0.2, mir: 1, leg: 1 },
      { n: 'hoofF', par: 'legF', m: 'dark', cyl: [[0.165, 0.0, 0.448], [0.165, 0.07, 0.445], 0.06, 0.05], mir: 1 },
      { n: 'legH', piv: [0.16, 1.08, -0.58], C: [[0.16, 1.08, -0.58], [0.18, 0.78, -0.66], [0.185, 0.48, -0.74], [0.18, 0.30, -0.70], [0.175, 0.12, -0.66], [0.175, 0.06, -0.655]],
        R: [[0.12, 0.24], [0.105, 0.17], [0.06, 0.08], [0.05, 0.06], [0.045, 0.05], [0.05, 0.055]], cap0: 0.3, cap1: 0.2, mir: 1, leg: 1 },
      { n: 'hoofH', par: 'legH', m: 'dark', cyl: [[0.175, 0.0, -0.652], [0.175, 0.07, -0.655], 0.06, 0.05], mir: 1 },
      { n: 'tail', piv: [0, 1.37, -0.86], C: [[0, 1.37, -0.86], [0, 1.36, -0.93], [0, 1.20, -0.965], [0, 0.90, -0.96], [0, 0.64, -0.955]], R: [[0.035, 0.035], [0.028, 0.028], [0.02, 0.02], [0.016, 0.016], [0.014, 0.014]], cap0: 0.3, cap1: 0.3, nr: 12 },
      { n: 'tuft', par: 'tail', m: 'dark', C: [[0, 0.70, -0.955], [0, 0.56, -0.955], [0, 0.44, -0.95]], R: [[0.02, 0.02], [0.048, 0.045], [0.02, 0.02]], cap0: 0.4, cap1: 0.9, nr: 14 },
      { n: 'udder', m: 'pink', sph: [[0, 0.66, -0.40], [0.16, 0.12, 0.19]] },
      { n: 'teat', m: 'pink', cyl: [[0.06, 0.58, -0.33], [0.06, 0.50, -0.33], 0.02, 0.016], mir: 1 },
      { n: 'teat2', m: 'pink', cyl: [[0.06, 0.58, -0.47], [0.06, 0.50, -0.47], 0.02, 0.016], mir: 1 },
    ],
    skel: { spine: 0.62, vs: 0.075, ribs: [0.52, -0.30, 13], pelvis: [[0, 1.16, -0.62], [0.2, 0.08, 0.26]], scap: [[0.2, 1.22, 0.42], [0.02, 0.2, 0.12], -0.35], br: 0.024 },
  },
  dog: {
    mats: () => ({ body: patchMat(0xf5f1ea, 0xc98a4b, { f: 7, th: 0.5, grad: [0, 2.2, -0.3, -0.62], warp: 0.35, seed: [4.4, 1.2, 8.1] }), dark: plastic(0x5a3420, 0.4), nose: new THREE.MeshPhysicalMaterial({ color: 0x0c0b0b, roughness: 0.25, clearcoat: 1 }),
      eye: new THREE.MeshPhysicalMaterial({ color: 0x0a0807, roughness: 0.08, clearcoat: 1 }), pink: plastic(0xd98f8f, 0.4) }),
    parts: [
      { n: 'body', C: [[0, 0.27, -0.13], [0, 0.28, -0.06], [0, 0.29, 0.04], [0, 0.30, 0.10]], R: [[0.075, 0.08], [0.09, 0.095], [0.092, 0.10], [0.08, 0.095]], e: 2.1, cap0: 0.75, cap1: 0.6, nr: 32 },
      { n: 'neck', piv: [0, 0.33, 0.09], C: [[0, 0.32, 0.08], [0, 0.37, 0.13], [0, 0.41, 0.16]], R: [[0.06, 0.07], [0.055, 0.06], [0.05, 0.055]], cap0: 0, cap1: 0.5 },
      { n: 'head', par: 'neck', piv: [0, 0.42, 0.16], C: [[0, 0.47, 0.11], [0, 0.48, 0.165], [0, 0.465, 0.22], [0, 0.44, 0.27], [0, 0.432, 0.30]], R: [[0.065, 0.06], [0.095, 0.09], [0.085, 0.08], [0.048, 0.042], [0.042, 0.036]], cap0: 0.9, cap1: 0.6, nr: 32 },
      { n: 'nose', par: 'head', m: 'nose', sph: [[0, 0.442, 0.334], [0.022, 0.017, 0.015]] },
      { n: 'eye', par: 'head', m: 'eye', sph: [[0.047, 0.492, 0.243], [0.017, 0.018, 0.014]], mir: 1 },
      { n: 'tongue', par: 'head', m: 'pink', sph: [[0, 0.408, 0.29], [0.018, 0.006, 0.025], [0.3, 0, 0]] },
      { n: 'ear', par: 'head', m: 'dark', piv: [0.085, 0.505, 0.15], C: [[0.08, 0.505, 0.15], [0.104, 0.47, 0.156], [0.11, 0.415, 0.162]], R: [[0.022, 0.01], [0.034, 0.011], [0.028, 0.01]], side: [0, 0, 1], cap0: 0.3, cap1: 0.9, mir: 1 },
      { n: 'legF', piv: [0.05, 0.27, 0.07], C: [[0.05, 0.27, 0.07], [0.052, 0.15, 0.075], [0.052, 0.05, 0.08], [0.052, 0.02, 0.09]], R: [[0.032, 0.036], [0.024, 0.026], [0.022, 0.024], [0.026, 0.034]], cap0: 0.3, cap1: 0.6, mir: 1, leg: 1 },
      { n: 'legH', piv: [0.055, 0.28, -0.10], C: [[0.055, 0.28, -0.10], [0.06, 0.18, -0.12], [0.058, 0.10, -0.14], [0.056, 0.045, -0.125], [0.056, 0.02, -0.11]], R: [[0.045, 0.055], [0.034, 0.04], [0.024, 0.026], [0.022, 0.024], [0.026, 0.034]], cap0: 0.3, cap1: 0.6, mir: 1, leg: 1 },
      { n: 'tail', piv: [0, 0.32, -0.15], C: [[0, 0.32, -0.15], [0, 0.37, -0.19], [0, 0.42, -0.20], [0, 0.45, -0.19]], R: [[0.018, 0.018], [0.015, 0.015], [0.011, 0.011], [0.007, 0.007]], cap0: 0.3, cap1: 0.6, nr: 12 },
    ],
    skel: { spine: 0.55, vs: 0.02, ribs: [0.07, -0.04, 10], pelvis: [[0, 0.30, -0.10], [0.045, 0.022, 0.06]], scap: [[0.055, 0.33, 0.07], [0.008, 0.055, 0.032], -0.4], br: 0.007 },
  },
  cat: {
    mats: () => ({ body: patchMat(0x9fa2a8, 0x6a6d74, { mode: 1, f: 14, th: 0.62, dir: [0.25, 0.2, 1], str: 95, warp: 0.3, seed: [3.3, 2.2, 6.6], grad: [0, 1.0, 0, -0.25] }),
      pink: plastic(0xd99a9a, 0.4), eye: new THREE.MeshPhysicalMaterial({ color: 0xb9c45a, roughness: 0.05, clearcoat: 1, emissive: 0x2a3008 }), pupil: new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.1, clearcoat: 1 }) }),
    parts: [
      { n: 'body', C: [[0, 0.22, -0.17], [0, 0.225, -0.10], [0, 0.225, 0.02], [0, 0.235, 0.12], [0, 0.24, 0.16]], R: [[0.055, 0.06], [0.07, 0.075], [0.072, 0.08], [0.065, 0.075], [0.055, 0.065]], cap0: 0.7, cap1: 0.6, nr: 32 },
      { n: 'neck', piv: [0, 0.26, 0.15], C: [[0, 0.25, 0.14], [0, 0.30, 0.18], [0, 0.33, 0.20]], R: [[0.05, 0.055], [0.042, 0.045], [0.04, 0.042]], cap0: 0, cap1: 0.5 },
      { n: 'head', par: 'neck', piv: [0, 0.34, 0.20], C: [[0, 0.355, 0.17], [0, 0.36, 0.21], [0, 0.35, 0.25], [0, 0.335, 0.275]], R: [[0.045, 0.045], [0.06, 0.052], [0.048, 0.042], [0.028, 0.026]], cap0: 0.9, cap1: 0.7, nr: 32 },
      { n: 'nose', par: 'head', m: 'pink', sph: [[0, 0.343, 0.293], [0.009, 0.007, 0.006]] },
      { n: 'eye', par: 'head', m: 'eye', sph: [[0.026, 0.368, 0.252], [0.013, 0.012, 0.01]], mir: 1 },
      { n: 'pupil', par: 'head', m: 'pupil', sph: [[0.028, 0.368, 0.2605], [0.0035, 0.009, 0.003]], mir: 1 },
      { n: 'ear', par: 'head', cone: [[0.032, 0.39, 0.205], [0.05, 0.445, 0.20], 0.024], mir: 1 },
      { n: 'legF', piv: [0.04, 0.22, 0.12], C: [[0.04, 0.22, 0.12], [0.042, 0.12, 0.13], [0.042, 0.04, 0.135], [0.042, 0.014, 0.142]], R: [[0.03, 0.035], [0.022, 0.024], [0.018, 0.02], [0.02, 0.026]], cap0: 0.3, cap1: 0.6, mir: 1, leg: 1 },
      { n: 'legH', piv: [0.045, 0.23, -0.13], C: [[0.045, 0.23, -0.13], [0.05, 0.15, -0.15], [0.048, 0.08, -0.175], [0.046, 0.035, -0.16], [0.046, 0.014, -0.15]], R: [[0.045, 0.06], [0.032, 0.04], [0.02, 0.022], [0.018, 0.02], [0.02, 0.026]], cap0: 0.3, cap1: 0.6, mir: 1, leg: 1 },
      { n: 'tail', piv: [0, 0.25, -0.18], C: [[0, 0.25, -0.18], [0, 0.27, -0.26], [0, 0.33, -0.31], [0, 0.41, -0.31], [0, 0.46, -0.27]], R: [[0.018, 0.018], [0.016, 0.016], [0.015, 0.015], [0.014, 0.014], [0.012, 0.012]], cap0: 0.3, cap1: 0.7, nr: 12 },
    ],
    skel: { spine: 0.55, vs: 0.018, ribs: [0.10, -0.05, 11], pelvis: [[0, 0.24, -0.13], [0.035, 0.02, 0.05]], scap: [[0.045, 0.27, 0.11], [0.006, 0.045, 0.025], -0.4], br: 0.006 },
  },
  horse: {
    mats: () => ({ body: patchMat(0x6a4630, 0x2a1b14, { f: 1.4, th: 0.5, grad: [0, -2.4, 0, 1.55], warp: 0.2, seed: [1.1, 9.2, 4.4] }), dark: plastic(0x1c1613, 0.45),
      eye: new THREE.MeshPhysicalMaterial({ color: 0x07070a, roughness: 0.08, clearcoat: 1 }), hair: new THREE.MeshPhysicalMaterial({ color: 0x1f1714, roughness: 0.55, clearcoat: 0.3, sheen: 1, sheenColor: new THREE.Color(0x5a4636) }) }),
    parts: [
      { n: 'body', C: [[0, 1.27, -0.78], [0, 1.29, -0.66], [0, 1.24, -0.40], [0, 1.20, -0.10], [0, 1.22, 0.20], [0, 1.28, 0.45], [0, 1.32, 0.58]],
        R: [[0.15, 0.18], [0.26, 0.29], [0.30, 0.34], [0.31, 0.36], [0.30, 0.36], [0.25, 0.36], [0.19, 0.30]], e: 2.2, cap0: 0.6, cap1: 0.6, nr: 40, sub: 8 },
      { n: 'neck', piv: [0, 1.40, 0.50], C: [[0, 1.35, 0.46], [0, 1.55, 0.66], [0, 1.78, 0.80], [0, 1.92, 0.86]], R: [[0.17, 0.30], [0.13, 0.24], [0.10, 0.17], [0.085, 0.12]], cap0: 0, cap1: 0.5 },
      { n: 'mane', par: 'neck', m: 'hair', C: [[0, 2.0, 0.84], [0, 1.86, 0.74], [0, 1.64, 0.60], [0, 1.47, 0.47]], R: [[0.022, 0.05], [0.03, 0.075], [0.03, 0.075], [0.02, 0.05]], side: [1, 0, 0], cap0: 0.6, cap1: 0.6 },
      { n: 'head', par: 'neck', piv: [0, 1.95, 0.86], C: [[0, 1.97, 0.84], [0, 1.92, 0.93], [0, 1.80, 1.05], [0, 1.67, 1.16], [0, 1.61, 1.21]], R: [[0.09, 0.11], [0.10, 0.12], [0.08, 0.095], [0.07, 0.08], [0.075, 0.07]], cap0: 0.8, cap1: 0.7 },
      { n: 'eye', par: 'head', m: 'eye', sph: [[0.093, 1.90, 0.97], [0.022, 0.024, 0.022]], mir: 1 },
      { n: 'nost', par: 'head', m: 'dark', sph: [[0.04, 1.63, 1.235], [0.016, 0.022, 0.01], [-0.7, 0, 0]], mir: 1 },
      { n: 'ear', par: 'head', cone: [[0.055, 2.03, 0.86], [0.075, 2.15, 0.87], 0.032], mir: 1 },
      { n: 'forelock', par: 'head', m: 'hair', sph: [[0, 2.02, 0.90], [0.05, 0.06, 0.04], [0.6, 0, 0]] },
      { n: 'legF', piv: [0.15, 1.10, 0.42], C: [[0.15, 1.10, 0.42], [0.15, 0.75, 0.45], [0.145, 0.50, 0.44], [0.145, 0.15, 0.45], [0.145, 0.08, 0.47]],
        R: [[0.10, 0.14], [0.07, 0.085], [0.045, 0.055], [0.04, 0.045], [0.045, 0.05]], cap0: 0.3, cap1: 0.2, mir: 1, leg: 1 },
      { n: 'hoofF', par: 'legF', m: 'dark', cyl: [[0.145, 0.0, 0.475], [0.145, 0.085, 0.47], 0.062, 0.048], mir: 1 },
      { n: 'legH', piv: [0.14, 1.18, -0.58], C: [[0.14, 1.18, -0.58], [0.16, 0.86, -0.66], [0.165, 0.55, -0.76], [0.16, 0.32, -0.70], [0.155, 0.14, -0.64], [0.155, 0.08, -0.625]],
        R: [[0.11, 0.24], [0.1, 0.16], [0.055, 0.07], [0.045, 0.055], [0.04, 0.045], [0.045, 0.05]], cap0: 0.3, cap1: 0.2, mir: 1, leg: 1 },
      { n: 'hoofH', par: 'legH', m: 'dark', cyl: [[0.155, 0.0, -0.622], [0.155, 0.085, -0.625], 0.062, 0.048], mir: 1 },
      { n: 'tail', m: 'hair', piv: [0, 1.36, -0.86], C: [[0, 1.37, -0.84], [0, 1.31, -0.95], [0, 1.06, -1.01], [0, 0.78, -0.99], [0, 0.56, -0.95]], R: [[0.05, 0.06], [0.06, 0.07], [0.075, 0.07], [0.06, 0.06], [0.025, 0.03]], cap0: 0.4, cap1: 0.8, nr: 16 },
    ],
    skel: { spine: 0.6, vs: 0.075, ribs: [0.48, -0.25, 13], pelvis: [[0, 1.24, -0.62], [0.18, 0.08, 0.24]], scap: [[0.18, 1.36, 0.42], [0.02, 0.22, 0.12], -0.4], br: 0.024 },
  },
  pig: {
    mats: () => ({ body: patchMat(0xefb7aa, 0xd99a8e, { f: 6, th: 0.62, warp: 0.3 }), snout: plastic(0xd98b80, 0.4), dark: plastic(0x2a1f1d, 0.45), eye: new THREE.MeshPhysicalMaterial({ color: 0x07070a, roughness: 0.08, clearcoat: 1 }) }),
    parts: [
      { n: 'body', C: [[0, 0.62, -0.62], [0, 0.64, -0.52], [0, 0.62, -0.25], [0, 0.60, 0.05], [0, 0.61, 0.30], [0, 0.62, 0.45]], R: [[0.16, 0.18], [0.25, 0.26], [0.30, 0.30], [0.31, 0.31], [0.28, 0.29], [0.20, 0.24]], e: 2.2, cap0: 0.6, cap1: 0.4, nr: 36 },
      { n: 'head', piv: [0, 0.66, 0.45], C: [[0, 0.66, 0.40], [0, 0.645, 0.56], [0, 0.585, 0.68], [0, 0.545, 0.76]], R: [[0.19, 0.22], [0.16, 0.17], [0.10, 0.10], [0.075, 0.07]], cap0: 0, cap1: 0.15, nr: 32 },
      { n: 'snout', par: 'head', m: 'snout', cyl: [[0, 0.54, 0.765], [0, 0.535, 0.80], 0.078, 0.075] },
      { n: 'nost', par: 'head', m: 'dark', sph: [[0.022, 0.535, 0.80], [0.011, 0.016, 0.006]], mir: 1 },
      { n: 'eye', par: 'head', m: 'eye', sph: [[0.088, 0.72, 0.585], [0.016, 0.018, 0.014]], mir: 1 },
      { n: 'ear', par: 'head', piv: [0.10, 0.80, 0.47], C: [[0.10, 0.80, 0.47], [0.15, 0.85, 0.57], [0.16, 0.80, 0.66]], R: [[0.04, 0.012], [0.072, 0.013], [0.05, 0.01]], cap0: 0.3, cap1: 0.8, mir: 1 },
      { n: 'legF', piv: [0.13, 0.45, 0.32], C: [[0.13, 0.45, 0.32], [0.13, 0.25, 0.33], [0.13, 0.08, 0.335], [0.13, 0.05, 0.34]], R: [[0.07, 0.08], [0.05, 0.055], [0.04, 0.045], [0.04, 0.045]], cap0: 0.3, cap1: 0.2, mir: 1, leg: 1 },
      { n: 'hoofF', par: 'legF', m: 'dark', cyl: [[0.13, 0.0, 0.342], [0.13, 0.05, 0.34], 0.043, 0.04], mir: 1 },
      { n: 'legH', piv: [0.14, 0.50, -0.45], C: [[0.14, 0.50, -0.45], [0.145, 0.30, -0.50], [0.14, 0.15, -0.52], [0.135, 0.05, -0.49]], R: [[0.10, 0.12], [0.07, 0.08], [0.045, 0.05], [0.04, 0.045]], cap0: 0.3, cap1: 0.2, mir: 1, leg: 1 },
      { n: 'hoofH', par: 'legH', m: 'dark', cyl: [[0.135, 0.0, -0.488], [0.135, 0.05, -0.49], 0.043, 0.04], mir: 1 },
      { n: 'tail', piv: [0, 0.72, -0.66], helix: [[0, 0.72, -0.66], 0.03, 0.06, 2.2, 0.011] },
    ],
    skel: { spine: 0.6, vs: 0.05, ribs: [0.30, -0.22, 13], pelvis: [[0, 0.68, -0.46], [0.14, 0.06, 0.16]], scap: [[0.17, 0.70, 0.30], [0.015, 0.14, 0.09], -0.35], br: 0.016 },
  },
  hen: {
    mats: () => ({ body: patchMat(0xf5f1e8, 0xd9d1c2, { f: 18, th: 0.6, warp: 0.4 }), red: plastic(0xd2262c, 0.32), beak: plastic(0xe7aa36, 0.32), leg: plastic(0xe8b93c, 0.35),
      eye: new THREE.MeshPhysicalMaterial({ color: 0x0a0806, roughness: 0.08, clearcoat: 1 }) }),
    parts: [
      { n: 'body', C: [[0, 0.30, -0.16], [0, 0.28, -0.10], [0, 0.26, 0.0], [0, 0.27, 0.08], [0, 0.30, 0.12]], R: [[0.06, 0.07], [0.11, 0.12], [0.12, 0.13], [0.10, 0.12], [0.07, 0.09]], cap0: 0.7, cap1: 0.7, nr: 32 },
      { n: 'tailf', C: [[0, 0.31, -0.13], [0, 0.40, -0.19], [0, 0.47, -0.205]], R: [[0.05, 0.035], [0.065, 0.025], [0.05, 0.015]], cap0: 0.2, cap1: 0.7 },
      { n: 'wing', C: [[0.10, 0.31, 0.06], [0.118, 0.29, -0.04], [0.10, 0.29, -0.14]], R: [[0.05, 0.02], [0.072, 0.022], [0.03, 0.015]], side: [0, 1, 0], cap0: 0.6, cap1: 0.8, mir: 1 },
      { n: 'neck', piv: [0, 0.34, 0.10], C: [[0, 0.33, 0.09], [0, 0.40, 0.12], [0, 0.45, 0.13]], R: [[0.06, 0.06], [0.045, 0.045], [0.04, 0.04]], cap0: 0, cap1: 0.5 },
      { n: 'head', par: 'neck', piv: [0, 0.46, 0.13], C: [[0, 0.465, 0.11], [0, 0.475, 0.14], [0, 0.47, 0.17]], R: [[0.035, 0.035], [0.04, 0.038], [0.03, 0.03]], cap0: 0.9, cap1: 0.8 },
      { n: 'beak', par: 'head', m: 'beak', cone: [[0, 0.466, 0.185], [0, 0.458, 0.222], 0.012] },
      { n: 'comb', par: 'head', m: 'red', sph: [[0, 0.512, 0.118], [0.006, 0.016, 0.014]] },
      { n: 'comb2', par: 'head', m: 'red', sph: [[0, 0.52, 0.14], [0.006, 0.02, 0.014]] },
      { n: 'comb3', par: 'head', m: 'red', sph: [[0, 0.512, 0.162], [0.006, 0.016, 0.013]] },
      { n: 'wattle', par: 'head', m: 'red', sph: [[0, 0.435, 0.172], [0.007, 0.016, 0.012]] },
      { n: 'eye', par: 'head', m: 'eye', sph: [[0.03, 0.478, 0.152], [0.006, 0.006, 0.006]], mir: 1 },
      { n: 'legF', m: 'leg', piv: [0.04, 0.20, 0.0], C: [[0.04, 0.20, 0.0], [0.042, 0.12, 0.0], [0.04, 0.03, 0.02], [0.04, 0.008, 0.024]], R: [[0.03, 0.035], [0.011, 0.011], [0.009, 0.009], [0.009, 0.009]], cap0: 0.3, cap1: 0.4, mir: 1, nr: 12, leg: 1 },
      { n: 'toe1', par: 'legF', m: 'leg', cyl: [[0.04, 0.007, 0.024], [0.04, 0.006, 0.075], 0.006, 0.004], mir: 1 },
      { n: 'toe2', par: 'legF', m: 'leg', cyl: [[0.04, 0.007, 0.024], [0.065, 0.006, 0.065], 0.006, 0.004], mir: 1 },
      { n: 'toe3', par: 'legF', m: 'leg', cyl: [[0.04, 0.007, 0.024], [0.016, 0.006, 0.066], 0.006, 0.004], mir: 1 },
    ],
    skel: { spine: 0.5, vs: 0.02, ribs: [0.06, -0.08, 7], keel: [[0, 0.19, 0.0], [0.012, 0.06, 0.12]], pelvis: [[0, 0.32, -0.09], [0.05, 0.02, 0.06]], br: 0.006, bird: 1 },
  },
};
ANIMALS.calf = { ...ANIMALS.cow, mats: () => ({ ...ANIMALS.cow.mats(), body: patchMat(0xf6f3ec, 0x141417, { f: 2.3, th: 0.5, grad: [0, 0.32, 0, -0.32], seed: [5.5, 2.2, 7.7] }) }) };

// ---------- construir: grupo del animal con un pivote por parte (para animar) y la lista de mallas
function makeAnimal(kind, sc = 1) {
  const D = ANIMALS[kind], mats = D.mats(), A = new THREE.Group(), root = new THREE.Group(); root.scale.setScalar(sc); A.add(root);
  const G = { root }, PV = { root: v3(0, 0, 0) }, solids = [];
  const parts = [], isMir = n => !!D.parts.find(q => q.n === n && q.mir);
  for (const p of D.parts) {
    if (p.mir) for (const [sd, sf] of [[1, 'R'], [-1, 'L']]) parts.push({ ...p, sd, nm: p.n + sf, parN: p.par ? (isMir(p.par) ? p.par + sf : p.par) : 'root' });
    else parts.push({ ...p, sd: 1, nm: p.n, parN: p.par || 'root' });
  }
  const mx = (P, sd) => P ? [P[0] * sd, P[1], P[2]] : P;
  for (const p of parts) {
    const sd = p.sd, nm = p.nm, parG = G[p.parN] || root, parP = PV[p.parN] || PV.root;
    let geo;
    if (p.C) geo = loftGeo(p.C.map(c => mx(c, sd)), p.R, { e: p.e, cap0: p.cap0, cap1: p.cap1, nr: p.nr, sub: p.sub, side: p.side });
    else if (p.sph) geo = sphG(mx(p.sph[0], sd), p.sph[1], p.sph[2] ? [p.sph[2][0], p.sph[2][1] * sd, p.sph[2][2] * sd] : [0, 0, 0]);
    else if (p.cyl) geo = cylG(mx(p.cyl[0], sd), mx(p.cyl[1], sd), p.cyl[2], p.cyl[3]);
    else if (p.cone) geo = coneG(mx(p.cone[0], sd), mx(p.cone[1], sd), p.cone[2]);
    else if (p.helix) { const [c0, r, h, turns, tr] = p.helix, pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40, a = u * turns * Math.PI * 2; pts.push(v3(c0[0] + Math.sin(a) * r * (1 - 0.3 * u), c0[1] + u * h, c0[2] - Math.cos(a) * r * (1 - 0.3 * u) - u * 0.03 + r)); }
      geo = addAop(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, tr, 8, false)); }
    const piv = p.piv ? v3(...mx(p.piv, sd)) : null;
    let holder = parG, hp = parP;
    if (piv) { const g = new THREE.Group(); g.position.copy(piv).sub(parP); parG.add(g); G[nm] = g; PV[nm] = piv; holder = g; hp = piv; }
    geo.translate(-hp.x, -hp.y, -hp.z);
    const m = new THREE.Mesh(geo, mats[p.m || 'body']); m.castShadow = true; m.receiveShadow = true; m.userData.part = nm; holder.add(m); solids.push(m);
    if (!piv) { G[nm + '_m'] = m; }
    p.geo = geo; p.holder = holder; p.hp = hp;
  }
  A.userData = { kind, D, G, PV, mats, solids, parts, sc };
  return A;
}
// ---------- esqueleto (huesos que brillan) dentro de los mismos pivotes: columna, costillas, pelvis, escápulas, patas, cuello, cráneo y cola
function addSkeleton(A, bm) {
  const { D, G, PV, parts } = A.userData, sk = D.skel, br = sk.br, out = [];
  const add = (holder, hp, geos) => { if (!geos.length) return; const gg = mergeGeometries(geos.map(g => { const q = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(q.attributes)) if (!['position', 'normal'].includes(k)) q.deleteAttribute(k); return q; }));
    gg.translate(-hp.x, -hp.y, -hp.z); const m = new THREE.Mesh(gg, bm); m.visible = false; holder.add(m); out.push(m); };
  const ball = (c, r) => { const g = new THREE.SphereGeometry(r, 10, 8); g.translate(c.x, c.y, c.z); return g; };
  const ell = (c, s, rx = 0, rz = 0) => { const g = new THREE.SphereGeometry(1, 14, 10); g.scale(s[0], s[1], s[2]); g.rotateX(rx); g.rotateZ(rz); g.translate(c[0], c[1], c[2]); return g; };
  const rod = (a, b, r) => { const L = a.distanceTo(b); const g = new THREE.CylinderGeometry(r, r, L, 8); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize())); g.translate(a.x, a.y, a.z); return g; };
  const chain = (pts, r, step, size, out2) => { let acc = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = a.distanceTo(b); acc += L; if (acc >= step) { acc = 0; out2.push(ell([b.x, b.y, b.z], [size, size * 0.8, size * 0.75])); } } };
  const byName = n => parts.find(p => p.nm === n);
  // tronco: columna por encima del centro de cada sección, costillas y esternón
  { const body = byName('body'), rings = body.geo.userData.rings, gs = [];
    const top = rings.map(g => g.P.clone().addScaledVector(g.U, g.ry * sk.spine));
    chain(top, br, sk.vs, br * 1.15, gs); for (let i = 1; i < top.length; i++) gs.push(rod(top[i - 1], top[i], br * 0.45));
    const [z0, z1, nR] = sk.ribs || [0, 0, 0], low = [];
    for (let i = 0; i < nR; i++) { const z = lerp(z0, z1, i / Math.max(1, nR - 1)); let best = rings[0]; for (const g of rings) if (Math.abs(g.P.z - z) < Math.abs(best.P.z - z)) best = g;
      for (const sd of [-1, 1]) { const pts = []; for (let k = 0; k <= 10; k++) { const a = lerp(Math.PI * 0.42, -Math.PI * 0.44, k / 10); pts.push(best.P.clone().add(v3(sd * best.rx * 0.86 * Math.cos(a), best.ry * (k ? 0.86 : sk.spine) * Math.sin(a), 0))); }
        const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, br * 0.3, 6, false); gs.push(tg); }
      low.push(best.P.clone().add(v3(0, -best.ry * 0.86 * Math.sin(Math.PI * 0.44), 0))); }
    if (low.length > 1) for (let i = 1; i < low.length; i++) gs.push(rod(low[i - 1], low[i], br * 0.6));
    if (sk.pelvis) { const [c, s] = sk.pelvis; for (const sd of [-1, 1]) gs.push(ell([c[0] + sd * s[0] * 0.55, c[1], c[2]], [s[0] * 0.45, s[1], s[2]], 0, sd * 0.35)); }
    if (sk.scap) { const [c, s, rx] = sk.scap; for (const sd of [-1, 1]) gs.push(ell([sd * c[0], c[1], c[2]], s, rx, 0)); }
    if (sk.keel) { const [c, s] = sk.keel; gs.push(ell(c, s)); }
    add(G.root, PV.root, gs); }
  // patas, cuello, cola y alas: huesos a lo largo de su camino; cráneo: la cabeza encogida
  for (const p of parts) {
    if (!p.C || p.nm === 'body') continue;
    const rings = p.geo.userData.rings, gs = [];
    if (p.leg) { const cp = p.C.map(c => v3(c[0] * p.sd, c[1], c[2])); for (let i = 1; i < cp.length; i++) { const r = Math.min(p.R[i - 1][0], p.R[i - 1][1]) * 0.36; gs.push(rod(cp[i - 1], cp[i], r)); gs.push(ball(cp[i - 1], r * 1.45)); } }
    else if (/^(neck|tail)/.test(p.nm)) { const pts = rings.map(g => g.P.clone()); chain(pts, br, sk.vs * (p.nm.startsWith('tail') ? 0.7 : 1), br * (p.nm.startsWith('tail') ? 0.9 : 1.5), gs); for (let i = 1; i < pts.length; i++) gs.push(rod(pts[i - 1], pts[i], br * 0.4)); }
    else if (p.nm === 'head') { const g = loftGeo(p.C.map(c => [c[0], c[1], c[2]]), p.R.map(r => [r[0] * 0.78, r[1] * 0.74, r[2]]), { cap0: p.cap0, cap1: p.cap1, nr: 20, sub: 5 }); gs.push(g); }
    else if (/^wing/.test(p.nm)) { const pts = rings.map(g => g.P.clone()); for (let i = 1; i < pts.length; i++) gs.push(rod(pts[i - 1], pts[i], br * 0.5)); }
    else continue;
    add(p.holder, p.hp, gs);
  }
  A.userData.bones = out; return out;
}
// ---------- rayos X: una copia de cada malla con el material del borde + el esqueleto; barrido con dos planos de recorte (lo escaneado se ve por dentro)
function addXray(A, col = 0x8fd2ff, o = {}) {
  const xm = xrayMat(col, o), bm = boneMat(), shells = [];
  for (const m of A.userData.solids) { const s = new THREE.Mesh(m.geometry, xm); s.position.copy(m.position); s.rotation.copy(m.rotation); s.scale.copy(m.scale); s.visible = false; s.renderOrder = 7; m.parent.add(s); shells.push(s); }
  const bones = addSkeleton(A, bm);
  const pS = new THREE.Plane(v3(1, 0, 0), 0), pX = new THREE.Plane(v3(-1, 0, 0), 0);
  const solidMats = new Set(A.userData.solids.map(m => m.material));
  A.userData.xr = { xm, bm, shells, bones, pS, pX, solidMats, mode: 'solid' };
  return A.userData.xr;
}
// modo: 'solid' (normal), 'xray' (todo por dentro) o 'scan' (barrido: dirección D en el mundo, posición s; lo de D·x < s se ve por dentro)
function xrMode(A, mode, D, s) {
  const X = A.userData.xr; if (!X) return;
  const clip = mode === 'scan';
  if (clip) { X.pS.normal.copy(D); X.pS.constant = -s; X.pX.normal.copy(D).negate(); X.pX.constant = s; }
  if (X.mode !== mode || clip !== X.clip) {
    for (const m of X.solidMats) { m.clippingPlanes = clip ? [X.pS] : null; m.needsUpdate = true; }
    X.xm.clippingPlanes = clip ? [X.pX] : null; X.xm.needsUpdate = true; X.bm.clippingPlanes = clip ? [X.pX] : null; X.bm.needsUpdate = true;
    X.mode = mode; X.clip = clip;
  }
  const sv = mode !== 'xray', xv = mode !== 'solid';
  for (const m of A.userData.solids) m.visible = sv;
  for (const m of X.shells) m.visible = xv;
  for (const m of X.bones) m.visible = xv;
}
// ---------- poses y movimientos
function poseAnimal(A, o = {}) {
  const G = A.userData.G, set = (n, rx = 0, ry = 0, rz = 0) => { if (G[n]) G[n].rotation.set(rx, ry, rz); };
  set('neck', o.neck || 0, o.neckY || 0, 0); set('head', o.head || 0, o.headY || 0, o.headZ || 0);
  const wk = o.walk || 0, ph = o.phase || 0;
  for (const [n, off] of [['legFR', 0], ['legFL', Math.PI], ['legHR', Math.PI], ['legHL', 0]]) if (G[n]) G[n].rotation.set((o.legs?.[n] ?? 0) + Math.sin(ph + off) * wk, 0, 0);
  if (G.tail) G.tail.rotation.set(o.tailX || 0, 0, o.tail || 0);
  if (G.earR) G.earR.rotation.set(0, 0, o.ear || 0); if (G.earL) G.earL.rotation.set(0, 0, -(o.ear || 0));
}
// guante largo de palpación (de hombro a dedos) en naranja translúcido: la mano en el origen (dedos hacia +y) y la manga hacia −y
function glove(len = 0.8) {
  const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0xff7a1c, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.88, sheen: 0.6, sheenColor: new THREE.Color(0xffc08a) });
  const hand = new THREE.Group(); g.add(hand);
  hand.add(mesh(sphG([0, 0.055, 0], [0.046, 0.06, 0.02]), m));
  [[-0.03, 0.105, 0.05, -0.08], [-0.01, 0.112, 0.058, -0.02], [0.012, 0.11, 0.055, 0.03], [0.032, 0.102, 0.045, 0.1]].forEach(([x, y, L, a]) => { const f = mesh(cylG([x, y, 0], [x + Math.sin(a) * L, y + Math.cos(a) * L, 0.004], 0.0105, 0.0095, 12), m); hand.add(f); hand.add(mesh(sphG([x + Math.sin(a) * L, y + Math.cos(a) * L, 0.004], [0.0095, 0.0095, 0.0095]), m)); });
  hand.add(mesh(cylG([-0.04, 0.04, 0.005], [-0.075, 0.085, 0.012], 0.012, 0.0105, 12), m)); hand.add(mesh(sphG([-0.075, 0.085, 0.012], [0.0105, 0.0105, 0.0105]), m));
  const sleeve = new THREE.Group(); g.add(sleeve);
  sleeve.add(mesh(loftGeo([[0, 0.02, 0], [0, -0.05, 0], [0, -0.3, 0], [0, -0.55, 0], [0, -0.8, 0]], [[0.034, 0.02], [0.034, 0.028], [0.042, 0.038], [0.05, 0.047], [0.058, 0.055]], { cap0: 0, cap1: 0, nr: 24, side: [1, 0, 0] }), m));
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.006, 8, 28), m); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.8; sleeve.add(cuff);
  sleeve.scale.y = len / 0.8; g.userData = { hand, sleeve, m, len };
  return g;
}
// ---------------------------------------------------------------- «Veterinaria por dentro»: materiales y piezas (la clínica en miniatura con su pared que revienta,
// camilla, frasco y jeringas, garrapata y microbios, granja con silo, pienso y ADN, quirófano, supermercado y matadero, útero y arco de rayos X)
function buildVetMats() {
  M.tile = new THREE.MeshPhysicalMaterial({ map: canvasTex(512, 512, (g, w, h) => { const n = 8; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = 222 + Math.round(hash(i * 7.1 + j * 3.3) * 14) - ((i + j) % 2 ? 22 : 0); g.fillStyle = `rgb(${v},${v - 1},${v - 4})`; g.fillRect(i * w / n, j * h / n, w / n, h / n); }
    g.strokeStyle = 'rgba(90,90,96,.55)'; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * w / n, 0); g.lineTo(i * w / n, h); g.moveTo(0, i * h / n); g.lineTo(w, i * h / n); g.stroke(); } }), roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  M.plaster = new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#e4dfd6'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '255,255,255' : '120,110,100'},${0.03 + hash(i * 3.3) * 0.05})`; g.fillRect(hash(i * 1.7) * w, hash(i * 2.9) * h, 2, 2); } }), roughness: 0.82 });
  M.plasterIn = new THREE.MeshStandardMaterial({ color: 0x9c8f80, roughness: 0.95 });
  M.band = new THREE.MeshPhysicalMaterial({ color: 0x3c6f78, roughness: 0.45, clearcoat: 0.5 });
  M.steelB = metal(0xd3d9e0, 0.26);
  M.barnR = new THREE.MeshPhysicalMaterial({ color: 0x8c2a22, roughness: 0.5, clearcoat: 0.4 });
  M.roofG = new THREE.MeshPhysicalMaterial({ color: 0x3b3f46, roughness: 0.55, clearcoat: 0.3 });
  M.trim = new THREE.MeshPhysicalMaterial({ color: 0xf2f0ea, roughness: 0.4, clearcoat: 0.5 });
  M.hay = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d9b45a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.strokeStyle = `rgba(${hash(i) > 0.5 ? '255,236,170' : '150,110,40'},.5)`; g.lineWidth = 1.5; const x = hash(i * 1.3) * w, y = hash(i * 2.7) * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + hash(i * 5.1) * 30, y + (hash(i * 7.7) - 0.5) * 8); g.stroke(); } }), roughness: 0.92 });
  M.pellet = new THREE.MeshStandardMaterial({ color: 0x7a5532, roughness: 0.8 });
  M.foam = new THREE.MeshStandardMaterial({ color: 0xf5f5f2, roughness: 0.75 });
  M.meat = new THREE.MeshPhysicalMaterial({ map: canvasTex(512, 384, (g, w, h) => { g.fillStyle = '#7c1119'; g.fillRect(0, 0, w, h); for (let i = 0; i < 18; i++) { let x = hash(i * 4.1) * w, y = hash(i * 8.7) * h, a = hash(i * 2.9) * 6.28; g.strokeStyle = 'rgba(240,215,205,.55)'; g.lineWidth = 1 + hash(i * 6.3) * 2; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 24; k++) { a += (hash(i * 31 + k * 1.3) - 0.5) * 0.9; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = 'rgba(245,232,214,.95)'; g.fillRect(0, h - 40, w, 40); }), roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15 });
  M.wrap = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.07, clearcoat: 1, depthWrite: false });
  M.concrete = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9a9c9f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '255,255,255' : '40,40,40'},${0.04 + hash(i * 3.1) * 0.06})`; g.fillRect(hash(i * 1.9) * w, hash(i * 2.3) * h, 3, 3); } }), roughness: 0.9 });
  M.tickM = new THREE.MeshPhysicalMaterial({ color: 0x4a2c20, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.1 });
  M.tickD = new THREE.MeshPhysicalMaterial({ color: 0x1e1410, roughness: 0.4, clearcoat: 0.6 });
  M.germ = new THREE.MeshStandardMaterial({ color: 0x0a1a0e, emissive: 0x7dff6a, emissiveIntensity: 1.6, roughness: 0.4 });
  M.germ2 = new THREE.MeshStandardMaterial({ color: 0x1a0a14, emissive: 0xff5ab4, emissiveIntensity: 1.5, roughness: 0.4 });
  M.drape = new THREE.MeshPhysicalMaterial({ color: 0x2f7d6b, roughness: 0.8, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x8fe0c8), side: THREE.DoubleSide });
  M.helmet = plastic(0xf4f4f1, 0.28);
  M.grass = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3f6b2a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '120,170,70' : '30,60,20'},.35)`; g.fillRect(hash(i * 1.3) * w, hash(i * 2.1) * h, 2, 3); } }), roughness: 0.9 });
}
// ---------- pared que revienta: rejilla irregular de trozos (cada uno extruido, con su centro y su velocidad para la explosión)
function wallShards(w, h, nx, ny, thick, seed = 1) {
  const P = []; for (let i = 0; i <= nx; i++) { P.push([]); for (let j = 0; j <= ny; j++) { let x = i / nx * w - w / 2, y = j / ny * h - h / 2;
    if (i > 0 && i < nx) x += (hash(i * 13.1 + j * 7.7 + seed) - 0.5) * w / nx * 0.7; if (j > 0 && j < ny) y += (hash(i * 3.7 + j * 11.3 + seed) - 0.5) * h / ny * 0.7; P[i].push(new THREE.Vector2(x, y)); } }
  const out = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const q = [P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1]], c = q.reduce((a, b) => a.clone().add(b), new THREE.Vector2()).multiplyScalar(0.25);
    const split = hash(i * 5.3 + j * 9.1 + seed) > 0.55, polys = split ? (hash(i + j * 3 + seed) > 0.5 ? [[q[0], q[1], q[2]], [q[0], q[2], q[3]]] : [[q[0], q[1], q[3]], [q[1], q[2], q[3]]]) : [q];
    for (const poly of polys) {
      const pc = poly.reduce((a, b) => a.clone().add(b), new THREE.Vector2()).multiplyScalar(1 / poly.length);
      const sh = new THREE.Shape(poly.map(p => p.clone().sub(pc).multiplyScalar(0.985)));
      const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false }); g.translate(0, 0, -thick / 2);
      const m = new THREE.Mesh(g, [M.plaster, M.plasterIn]); m.castShadow = true; m.receiveShadow = true;
      m.userData = { c: new THREE.Vector3(pc.x, pc.y, 0), r: Math.hypot(pc.x / (w / 2), pc.y / (h / 2)), k: hash(i * 2.1 + j * 4.3 + seed * 1.7), k2: hash(i * 6.7 + j * 1.9 + seed * 3.1) };
      out.push(m);
    }
  }
  return out;
}
// ---------- camilla de exploración (acero) con columna hidráulica
function examTable(s = 1) {
  const g = new THREE.Group();
  const top = rbox(0.56, 0.3, 0.03, M.steelB, 0.02); top.rotation.x = -Math.PI / 2; top.position.y = 0.215; g.add(top);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1, 0.006, 6, 4), M.steelB); lip.visible = false; g.add(lip);
  g.add(at(cyl(0.035, 0.045, 0.18, M.steelB, 24), 0, 0.11, 0)); g.add(at(cyl(0.12, 0.13, 0.02, M.enamel, 32), 0, 0.01, 0));
  g.add(at(cyl(0.05, 0.05, 0.03, M.enamel, 24), 0, 0.19, 0));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.scale.setScalar(s); return g;
}
// ---------- frasco de medicamento inyectable (vidrio, tapón de goma, cápsula de aluminio, etiqueta)
function vial(s = 1) {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.05, 0], [0.053, 0.008], [0.053, 0.11], [0.046, 0.125], [0.022, 0.135], [0.02, 0.15], [0, 0.15]], 48, M.dish));
  const liq = lathe([[0, 0.004], [0.049, 0.004], [0.05, 0.01], [0.05, 0.085], [0, 0.085]], 40, new THREE.MeshPhysicalMaterial({ color: 0xf2c75a, roughness: 0.05, transparent: true, opacity: 0.75, clearcoat: 1, emissive: 0x3a2a05 })); g.add(liq);
  g.add(at(cyl(0.026, 0.026, 0.02, metal(0xc9ced6, 0.25), 32), 0, 0.158, 0)); g.add(at(cyl(0.02, 0.02, 0.006, plastic(0xc8323a, 0.35), 24), 0, 0.17, 0));
  const lt = canvasTex(512, 200, (c, w, h) => { c.fillStyle = '#f6f4ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b2a4a'; c.fillRect(0, 0, w, 34); c.fillStyle = '#ffffff'; c.font = '800 24px Inter'; c.textAlign = 'center'; c.fillText('USO VETERINARIO', w / 2, 25);
    c.fillStyle = '#1b2a4a'; c.font = '900 64px Inter'; c.fillText('FÁRMACO', w / 2, 110); c.font = '600 26px Inter'; c.fillText('mg / kg · EJEMPLO', w / 2, 160); });
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0535, 0.0535, 0.07, 48, 1, true, -1.3, 2.6), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.6 })); lab.position.y = 0.055; g.add(lab);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
// ---------- jeringa con el líquido que se llena (fill 0–1) y el émbolo que se mueve; a lo largo de +x, aguja a la derecha
function syringeV(s = 1) {
  const g = new THREE.Group(), L = 0.14;
  const barrel = cyl(0.012, 0.012, L, M.dish, 24); barrel.rotation.z = Math.PI / 2; g.add(barrel);
  for (let i = 0; i <= 10; i++) { const tk = mesh(new THREE.BoxGeometry(0.0012, 0.004, 0.001), new THREE.MeshBasicMaterial({ color: 0x2a3a5a })); tk.position.set(-L / 2 + 0.01 + i * 0.012, 0.0085, 0.0085); g.add(tk); }
  const liq = cyl(0.0105, 0.0105, 1, new THREE.MeshPhysicalMaterial({ color: 0xf2c75a, roughness: 0.05, transparent: true, opacity: 0.85, emissive: 0x3a2a05 }), 20); liq.rotation.z = Math.PI / 2; g.add(liq);
  const pl = new THREE.Group(); g.add(pl);
  pl.add(at(cyl(0.0105, 0.0105, 0.008, plastic(0x22252b, 0.4), 20), 0, 0, 0, 0, 0, Math.PI / 2)); pl.add(at(cyl(0.004, 0.004, 0.12, plastic(0xf4f4f2, 0.4), 10), -0.064, 0, 0, 0, 0, Math.PI / 2));
  pl.add(at(cyl(0.016, 0.016, 0.004, plastic(0xf4f4f2, 0.4), 20), -0.125, 0, 0, 0, 0, Math.PI / 2));
  g.add(at(cyl(0.017, 0.017, 0.004, plastic(0xf4f4f2, 0.4), 20), -L / 2, 0, 0, 0, 0, Math.PI / 2));
  g.add(at(cyl(0.004, 0.003, 0.012, plastic(0x2b78c4, 0.3), 12), L / 2 + 0.006, 0, 0, 0, 0, Math.PI / 2)); g.add(at(cyl(0.0012, 0.0012, 0.06, M.chrome, 6), L / 2 + 0.042, 0, 0, 0, 0, Math.PI / 2));
  g.userData.setFill = f => { const ff = clamp(f) * (L - 0.012); liq.visible = ff > 0.001; liq.scale.set(1, Math.max(0.0001, ff), 1); liq.position.x = L / 2 - 0.004 - ff / 2; pl.position.x = L / 2 - 0.008 - ff; };
  g.userData.setFill(0); g.scale.setScalar(s); return g;
}
// ---------- garrapata (cuerpo ovalado brillante, escudo, cabeza y ocho patas) mirando a +z
function tick(s = 1) {
  const g = new THREE.Group();
  const body = sph(0.05, M.tickM, 28, 18); body.scale.set(0.8, 0.42, 1); body.position.y = 0.03; g.add(body);
  const shield = sph(0.03, M.tickD, 20, 12); shield.scale.set(0.9, 0.35, 0.8); shield.position.set(0, 0.046, 0.025); g.add(shield);
  const head = sph(0.014, M.tickD, 14, 10); head.scale.set(1, 0.7, 1.4); head.position.set(0, 0.03, 0.058); g.add(head);
  const legs = [];
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { const z = 0.03 - i * 0.02, l = new THREE.Group(); l.position.set(sd * 0.03, 0.028, z); g.add(l);
    const a = v3(0, 0, 0), b = v3(sd * 0.035, 0.02, (1.5 - i) * 0.012), c = v3(sd * 0.06, -0.025, (1.5 - i) * 0.022); l.add(tube([a, b, c], 0.0035, M.tickD, 12, false, 6)); legs.push(l); }
  g.userData.legs = legs; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
// ---------- microbio: esfera que brilla con pinchos (una sola malla)
function microbe(r = 0.012, m = M.germ) {
  const gs = [new THREE.IcosahedronGeometry(r, 2)];
  for (let i = 0; i < 14; i++) { const d = v3(hash(i * 3.3) - 0.5, hash(i * 7.1) - 0.5, hash(i * 1.9) - 0.5).normalize(); const c = new THREE.CylinderGeometry(r * 0.12, r * 0.12, r * 0.7, 5); c.translate(0, r * 1.2, 0);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d)); gs.push(c); const k = new THREE.SphereGeometry(r * 0.22, 6, 4); k.translate(0, r * 1.55, 0); k.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d)); gs.push(k); }
  return new THREE.Mesh(mergeGeometries(gs.map(g => { const q = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(q.attributes)) if (!['position', 'normal'].includes(k)) q.deleteAttribute(k); return q; })), m);
}
// ---------- granja: establo rojo con tejado a dos aguas, silo, valla, pacas, comedero con pienso y la doble hélice del ADN
function barn(s = 1) {
  const g = new THREE.Group(), w = 0.5, d = 0.36, h = 0.26;
  g.add(at(mesh(new THREE.BoxGeometry(w, h, d), M.barnR), 0, h / 2, 0));
  const sh = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.03, 0), new THREE.Vector2(w / 2 + 0.03, 0), new THREE.Vector2(0, 0.17)]);
  const gab = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, 0.15)]), { depth: d, bevelEnabled: false }); gab.translate(0, h, -d / 2); g.add(mesh(gab, M.barnR));
  for (const sd of [-1, 1]) { const r = mesh(new THREE.BoxGeometry(Math.hypot(w / 2 + 0.04, 0.16) + 0.02, 0.016, d + 0.06), M.roofG); r.position.set(sd * (w / 4 + 0.01), h + 0.085, 0); r.rotation.z = -sd * Math.atan2(0.16, w / 2 + 0.04); g.add(r); }
  const door = mesh(new THREE.BoxGeometry(0.16, 0.18, 0.006), M.barnR); door.position.set(0, 0.09, d / 2 + 0.003); g.add(door);
  for (const [x0, y0, x1, y1] of [[-0.08, 0, -0.08, 0.18], [0.08, 0, 0.08, 0.18], [-0.08, 0.18, 0.08, 0.18], [-0.08, 0, 0.08, 0.18], [-0.08, 0.18, 0.08, 0]]) g.add(bar(v3(x0, y0, d / 2 + 0.008), v3(x1, y1, d / 2 + 0.008), 0.006, M.trim, 6));
  g.add(at(mesh(new THREE.BoxGeometry(0.07, 0.06, 0.006), M.trim), 0, 0.3, d / 2 + 0.004)); g.add(at(mesh(new THREE.BoxGeometry(0.06, 0.05, 0.007), M.black), 0, 0.3, d / 2 + 0.005));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.scale.setScalar(s); return g;
}
function silo(s = 1) {
  const g = new THREE.Group(); g.add(at(cyl(0.085, 0.085, 0.5, metal(0xc5cbd2, 0.32), 40), 0, 0.25, 0));
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.087, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), metal(0xd8dde3, 0.25)), 0, 0.5, 0));
  for (let i = 1; i < 7; i++) g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.003, 6, 40), M.dsteel), 0, i * 0.07, 0, 0, Math.PI / 2));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.scale.setScalar(s); return g;
}
function fence(len = 0.6, n = 5) { const g = new THREE.Group(); for (let i = 0; i <= n; i++) g.add(at(mesh(new THREE.BoxGeometry(0.014, 0.08, 0.014), M.woodL), -len / 2 + i * len / n, 0.04, 0));
  for (const y of [0.03, 0.065]) g.add(at(mesh(new THREE.BoxGeometry(len, 0.012, 0.006), M.woodL), 0, y, 0.008)); return g; }
function hayBale(s = 1) { const b = rbox(0.12, 0.07, 0.07, M.hay, 0.012); b.rotation.x = -Math.PI / 2; b.position.y = 0.035; const g = grp(b); g.scale.setScalar(s); return g; }
function trough(s = 1) {
  const g = new THREE.Group(); g.add(at(mesh(new THREE.BoxGeometry(0.3, 0.012, 0.09), M.woodL), 0, 0.006, 0));
  for (const z of [-1, 1]) g.add(at(mesh(new THREE.BoxGeometry(0.3, 0.06, 0.01), M.woodL), 0, 0.03, z * 0.045)); for (const x of [-1, 1]) g.add(at(mesh(new THREE.BoxGeometry(0.01, 0.06, 0.09), M.woodL), x * 0.15, 0.03, 0));
  const N = 160, pm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), M.pellet, N); pm.castShadow = true; g.add(pm);
  g.userData = { pm, N }; g.scale.setScalar(s); return g;
}
function fillTrough(T, k, t) {      // k: 0–1 lo lleno; los granos caen desde arriba
  const { pm, N } = T.userData, o = new THREE.Object3D();
  for (let i = 0; i < N; i++) { const ki = clamp((k * 1.25 - hash(i * 3.7) * 0.25)); const x = (hash(i * 1.1) - 0.5) * 0.27, z = (hash(i * 2.3) - 0.5) * 0.07, y0 = 0.018 + hash(i * 5.9) * 0.03;
    const fall = clamp((ki - 0.0) / 1.0); const y = lerp(0.35, y0, eo(fall)); o.position.set(x, ki > 0.001 ? y : -1, z); o.scale.setScalar(ki > 0.001 ? 1 : 0.0001); o.rotation.set(i, i * 2, 0); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); }
  pm.instanceMatrix.needsUpdate = true;
}
function dnaHelix(h = 0.5, r = 0.06, turns = 2.2) {
  const g = new THREE.Group(), n = 26, mA = plastic(0x3d8bff, 0.2), mB = plastic(0xff6a2b, 0.2), mR = [plastic(0x19d98a, 0.25), plastic(0xf2b415, 0.25)];
  const items = [];
  for (let i = 0; i < n; i++) { const u = i / (n - 1), a = u * turns * Math.PI * 2, y = u * h; const pA = v3(Math.cos(a) * r, y, Math.sin(a) * r), pB = v3(-Math.cos(a) * r, y, -Math.sin(a) * r);
    const sA = sph(0.013, mA, 14, 10); sA.position.copy(pA); const sB = sph(0.013, mB, 14, 10); sB.position.copy(pB); const rung = bar(pA, pB, 0.005, mR[i % 2], 8);
    const it = grp(sA, sB, rung); g.add(it); items.push(it); }
  const strands = [0, 1].map(k => { const pts = []; for (let i = 0; i <= 120; i++) { const u = i / 120, a = u * turns * Math.PI * 2 + k * Math.PI; pts.push(v3(Math.cos(a) * r, u * h, Math.sin(a) * r)); } return tube(pts, 0.006, k ? mB : mA, 240, false, 8); });
  strands.forEach(s => g.add(s)); g.userData = { items, strands, n }; return g;
}
// ---------- quirófano: lámpara de techo con anillo de luces, máquina de anestesia (fuelle y dial) y sutura
function surgLamp(s = 1) {
  const g = new THREE.Group(), lamp = new THREE.Group(); g.add(lamp);
  lamp.add(at(cyl(0.16, 0.13, 0.05, plastic(0xe9edf0, 0.35), 40), 0, 0, 0)); const leds = [];
  for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI * 2, r = i ? 0.085 : 0, l = cyl(0.028, 0.028, 0.004, glowM(0xfff6e8, 0.2), 20); l.position.set(Math.cos(a) * r, -0.027, Math.sin(a) * r); lamp.add(l); leds.push(l); }
  g.add(tube([v3(0, 0.02, 0), v3(0, 0.18, 0), v3(0.12, 0.3, 0), v3(0.3, 0.32, 0)], 0.012, M.chrome, 30, false, 10));
  g.userData = { leds, lamp }; g.scale.setScalar(s); return g;
}
function anesthesia(s = 1) {
  const g = new THREE.Group(); g.add(at(rbox(0.16, 0.26, 0.12, M.enamel, 0.015), 0, 0.15, 0));
  const dial = cyl(0.03, 0.03, 0.01, M.chrome, 32); dial.rotation.x = Math.PI / 2; dial.position.set(-0.035, 0.22, 0.062); g.add(dial);
  const face = cyl(0.026, 0.026, 0.004, new THREE.MeshBasicMaterial({ color: 0xf4f4f0 }), 32); face.rotation.x = Math.PI / 2; face.position.set(-0.035, 0.22, 0.068); g.add(face);
  const needle = mesh(new THREE.BoxGeometry(0.002, 0.022, 0.002), M.redLed); needle.position.set(-0.035, 0.22, 0.072); g.add(needle);
  const bag = sph(0.035, new THREE.MeshPhysicalMaterial({ color: 0x1b1d22, roughness: 0.6, clearcoat: 0.3 }), 20, 14); bag.scale.set(1, 1.3, 1); bag.position.set(0.045, 0.06, 0.07); g.add(bag);
  for (let i = 0; i < 3; i++) { const fl = cyl(0.012, 0.012, 0.06, M.dish, 12); fl.position.set(0.03 + i * 0.016, 0.24, 0.05); g.add(fl); const bl = sph(0.005, glowM(0x7fd6ff, 2), 8, 6); bl.position.set(0.03 + i * 0.016, 0.22 + i * 0.008, 0.05); g.add(bl); }
  g.userData = { bag, needle }; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
// ---------- supermercado: bandeja de carne (bandeja de corcho, filete con vetas, film y etiqueta) y estante refrigerado
function meatTray(s = 1, label = true) {
  const g = new THREE.Group(); const tr = rbox(0.2, 0.14, 0.018, M.foam, 0.012); tr.rotation.x = -Math.PI / 2; tr.position.y = 0.009; g.add(tr);
  const steak = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape((() => { const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, r = 1 + 0.12 * Math.sin(a * 2 + 0.6) + 0.06 * Math.sin(a * 5); pts.push(new THREE.Vector2(Math.cos(a) * 0.078 * r, Math.sin(a) * 0.05 * r)); } return pts; })()), { depth: 0.014, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3 }), M.meat);
  steak.rotation.x = -Math.PI / 2; steak.position.y = 0.018; steak.castShadow = true; g.add(steak);
  const film = rbox(0.205, 0.145, 0.03, M.wrap, 0.014); film.rotation.x = -Math.PI / 2; film.position.y = 0.022; film.userData.tr = 1; g.add(film);
  if (label) { const lb = plateText(0.07, 0.04, [['TERNERA', 0.32, 0.36], ['EJEMPLO', 0.2, 0.72]], { fg: '#1b2a4a', bg: '#f4f2ea' }); lb.rotation.x = -Math.PI / 2; lb.position.set(0.055, 0.038, 0.035); g.add(lb); }
  g.userData = { steak, film }; g.scale.setScalar(s); return g;
}
// ---------- matadero (edificio industrial genérico con su puerta, rótulo y semáforo) y casco blanco
function abattoir(s = 1) {
  const g = new THREE.Group(), w = 0.62, h = 0.3, d = 0.36;
  g.add(at(mesh(new THREE.BoxGeometry(w, h, d), M.concrete), 0, h / 2, 0));
  g.add(at(mesh(new THREE.BoxGeometry(w + 0.03, 0.025, d + 0.03), M.roofG), 0, h + 0.012, 0));
  const door = mesh(new THREE.BoxGeometry(0.16, 0.17, 0.008), metal(0xa9b0b8, 0.35)); door.position.set(0.08, 0.085, d / 2 + 0.004); g.add(door);
  for (let i = 0; i < 9; i++) g.add(at(mesh(new THREE.BoxGeometry(0.16, 0.002, 0.003), M.dsteel), 0.08, 0.012 + i * 0.019, d / 2 + 0.009));
  const sign = plateText(0.34, 0.06, [['MATADERO', 0.62, 0.52]], { fg: '#f2f2ee', bg: '#1b1e24' }); sign.position.set(-0.08, 0.235, d / 2 + 0.003); g.add(sign);
  for (let i = 0; i < 3; i++) g.add(at(mesh(new THREE.BoxGeometry(0.07, 0.05, 0.004), glowM(0xffe2a8, 0.6)), -0.22 + i * 0.09, 0.12, d / 2 + 0.003));
  const lampR = sph(0.016, glowM(0xff3b30, 0.0), 16, 12), lampG = sph(0.016, glowM(0x34ff8a, 0.0), 16, 12); lampR.position.set(0.2, 0.2, d / 2 + 0.012); lampG.position.set(0.2, 0.158, d / 2 + 0.012);
  g.add(at(mesh(new THREE.BoxGeometry(0.045, 0.09, 0.012), M.black), 0.2, 0.179, d / 2 + 0.004)); g.add(lampR, lampG);
  g.userData = { door, lampR, lampG }; g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.scale.setScalar(s); return g;
}
function helmet(r = 0.08) { const g = new THREE.Group(); const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), M.helmet); dome.scale.set(1, 0.85, 1.08); g.add(dome);
  const brim = cyl(r * 1.05, r * 1.12, r * 0.08, M.helmet, 24); brim.scale.z = 1.12; g.add(brim); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }
// ---------- arco del escáner de rayos X (dos postes, travesaño y una lámina de luz azul)
function scanArch(w = 0.7, h = 0.62) {
  const g = new THREE.Group(), m = plastic(0x1d2026, 0.3);
  for (const x of [-w / 2, w / 2]) g.add(at(rbox(0.04, 0.04, h, m, 0.01), x, h / 2, 0, 0, 0, 0)), g.children[g.children.length - 1].rotation.x = Math.PI / 2;
  const top = rbox(w + 0.04, 0.05, 0.05, m, 0.01); top.position.y = h; g.add(top);
  const strip = mesh(new THREE.BoxGeometry(w - 0.02, 0.008, 0.012), glowM(0x8fd2ff, 4)); strip.position.set(0, h - 0.03, 0.022); g.add(strip);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.04, h - 0.04), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { op: { value: 0 }, time: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float op, time; varying vec2 vU; void main(){ float l = 0.35 + 0.65 * smoothstep(0.0, 0.25, vU.y) * smoothstep(1.0, 0.75, vU.y); float s = 0.7 + 0.3 * sin(vU.y * 120.0 - time * 14.0); gl_FragColor = vec4(vec3(0.35, 0.72, 1.0) * op * l * s * 0.55, 1.0); }' }));
  sheet.position.y = h / 2; sheet.renderOrder = 8; sheet.userData.keepOp = true; g.add(sheet);
  g.userData = { sheet, strip }; return g;
}
// ---------- útero de vaca preñada (bolsa con dos cuernos) para la radiografía
function uterusGeo() { return loftGeo([[0, 0, -0.1], [0, 0.02, 0.0], [0, 0.0, 0.12], [0, -0.04, 0.22], [0, -0.1, 0.28]], [[0.05, 0.05], [0.09, 0.08], [0.13, 0.12], [0.12, 0.11], [0.06, 0.06]], { cap0: 0.6, cap1: 0.8, nr: 24 }); }
// ---------- lámpara de rayos X para la plataforma de Anatomía: poste en el centro, brazo hasta el borde, cabezal con lente azul y cono de luz hasta la plataforma
function xrayLamp(R = 0.6, h = 0.66) {
  const g = new THREE.Group(), m = plastic(0x23262c, 0.3);
  g.add(at(cyl(0.005, 0.005, 2.0, M.dsteel, 8), 0, h + 1.0, R));
  const head = rbox(0.16, 0.16, 0.11, m, 0.02); head.rotation.x = -Math.PI / 2; head.position.set(0, h, R); g.add(head);
  const lens = cyl(0.05, 0.05, 0.006, glowM(0x8fd2ff, 5), 32); lens.position.set(0, h - 0.058, R); g.add(lens);
  const cone = lightCone(0.17, h - 0.06, 0.32, 0x8fd2ff); cone.position.set(0, (h - 0.06) / 2, R); g.add(cone);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.17, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fd2ff).multiplyScalar(2.5), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.002, R); g.add(ring);
  const line = mesh(new THREE.BoxGeometry(0.004, 0.002, 0.34), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fd2ff).multiplyScalar(3), toneMapped: false }), false); line.position.set(0, 0.003, R); g.add(line);
  const pt = new THREE.Object3D(); pt.position.set(0, 0, R); g.add(pt);
  g.userData = { cone, lens, ring, pt }; return g;
}
// ---------------------------------------------------------------- centro: la clínica veterinaria en miniatura (suelo de baldosas, dos paredes, camilla con el cachorro,
// negatoscopio y estante) y una vaca de tamaño real que revienta la pared del fondo y mete la cabeza. Al final se rebobina (bucle).
const CL_W = 1.5, CL_D = 1.1, CL_H = 1.25, WALL_Z = -0.55, WALL_T = 0.05, FLOOR_Y = 0.02;
const HOLE = { x0: -0.34, x1: 0.28, y0: 0.5, y1: 1.21 };
const COW_X = -0.04, COW_Z0 = -1.814, COW_LUNGE = 0.3;
const SHARD_G = 6.0;
function buildCenter() {
  const Z = new THREE.Group(); scene.add(Z); S.ctr = Z;
  // suelo de baldosas (tablero) y paredes
  const fl = mesh(new THREE.BoxGeometry(CL_W, FLOOR_Y, CL_D), [M.concrete, M.concrete, M.tile, M.concrete, M.concrete, M.concrete]); fl.position.set(0, FLOOR_Y / 2, 0); Z.add(fl);
  M.tile.map.repeat.set(1, 1);
  const hw = HOLE, wz = WALL_Z, wm = [M.plasterIn, M.plasterIn, M.plasterIn, M.plasterIn, M.plaster, M.plaster];
  const wallBox = (x0, x1, y0, y1) => { const m = mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, WALL_T), wm); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, wz); Z.add(m); return m; };
  wallBox(-CL_W / 2, hw.x0, 0, CL_H); wallBox(hw.x1, CL_W / 2, 0, CL_H); wallBox(hw.x0, hw.x1, 0, hw.y0); wallBox(hw.x0, hw.x1, hw.y1, CL_H);
  const lw = mesh(new THREE.BoxGeometry(WALL_T, CL_H, CL_D + WALL_T), M.plaster); lw.position.set(-CL_W / 2 - WALL_T / 2, CL_H / 2, -WALL_T / 2); Z.add(lw);
  // franja de color (zócalo) y rodapié
  for (const [w, x, z, ry] of [[CL_W, 0, wz + WALL_T / 2 + 0.002, 0], [CL_D, -CL_W / 2 + 0.002, 0, Math.PI / 2]]) { const b = mesh(new THREE.BoxGeometry(w, 0.05, 0.004), M.band); b.position.set(x, 0.3, z); b.rotation.y = ry; Z.add(b);
    const sk = mesh(new THREE.BoxGeometry(w, 0.03, 0.008), M.enamel); sk.position.set(x, FLOOR_Y + 0.015, z); sk.rotation.y = ry; Z.add(sk); }
  // la parte de la pared que revienta
  S.wall = new THREE.Group(); S.wall.position.set((hw.x0 + hw.x1) / 2, (hw.y0 + hw.y1) / 2, wz); Z.add(S.wall);
  S.shards = wallShards(hw.x1 - hw.x0, hw.y1 - hw.y0, 6, 6, WALL_T, 3); for (const m of S.shards) { m.position.copy(m.userData.c); S.wall.add(m); }
  S.dust = sparks(Z, 260, 0xe8ded0, 0.03); S.chips = sparks(Z, 120, 0xbfb2a0, 0.016);
  // camilla, cachorro y gato
  S.table = examTable(1); S.table.position.set(0.06, FLOOR_Y, 0.02); Z.add(S.table);
  S.dog = makeAnimal('dog', 0.5); S.dog.position.set(0.12, FLOOR_Y + 0.23, 0.04); S.dog.rotation.y = -0.35; Z.add(S.dog);
  S.cat = makeAnimal('cat', 0.5); S.cat.position.set(-0.1, FLOOR_Y + 0.23, 0.06); S.cat.rotation.y = 0.5; Z.add(S.cat);
  // negatoscopio con la radiografía de un perro (pared izquierda) y estante con frascos (pared del fondo)
  S.lbox = lightbox(0.8); S.lbox.position.set(-CL_W / 2 + 0.03, 0.42, -0.12); S.lbox.rotation.y = Math.PI / 2; S.lbox.children.forEach(c => { if (!c.isMesh && c.children.length === 2) c.visible = false; }); Z.add(S.lbox);
  const shelf = mesh(new THREE.BoxGeometry(0.4, 0.012, 0.09), M.woodL); shelf.position.set(0.5, 0.56, wz + 0.07); Z.add(shelf);
  [[0.36, 0.7], [0.45, 0.55], [0.55, 0.65], [0.64, 0.5]].forEach(([x, s2], i) => { const b = i % 2 ? pillBottle(s2) : vial(s2); b.position.set(x, 0.566, wz + 0.07); Z.add(b); });
  // fonendo sobre la camilla («curando») y el guante largo (aparece con «brazo entero»)
  S.steth = stethoscope(0.9); S.steth.position.set(-0.08, FLOOR_Y + 0.232, 0.14); S.steth.rotation.y = 0.6; Z.add(S.steth);
  S.glove = glove(0.8); S.glove.scale.setScalar(0.42); Z.add(S.glove);
  // la vaca de tamaño real al otro lado de la pared, y los otros animales grandes (para «muchos animales a la vez»)
  S.cow = makeAnimal('cow', 1); S.cow.position.set(COW_X, 0, COW_Z0); Z.add(S.cow);
  S.horse = makeAnimal('horse', 1); S.horse.position.set(-1.3, 0, -1.4); S.horse.rotation.y = 0.6; Z.add(S.horse);
  S.pig = makeAnimal('pig', 1); S.pig.position.set(0.98, 0, 0.62); S.pig.rotation.y = -Math.PI / 2 - 0.35; Z.add(S.pig);
  S.hen = makeAnimal('hen', 1.25); S.hen.position.set(-CL_W / 2 - 0.02, CL_H, 0.15); S.hen.rotation.y = 0.9; Z.add(S.hen);
  for (const o of [S.horse, S.pig, S.hen]) o.userData.s0 = o.scale.x;
  Z.traverse(o => { if (o.isMesh && o.castShadow === undefined) o.castShadow = true; });
}
// estado de la pared: u = segundos desde el reventón (negativo: la vaca empuja; al final se rebobina hasta el estado del primer fotograma)
function burstU(t) { const r0 = END - 1.25; if (t < r0) return t - T_HIT; return lerp(-T_HIT, r0 - T_HIT > 1.4 ? 1.4 : r0 - T_HIT, eio(clamp((END - t) / 1.25))); }
function shardAt(m, u) {
  const d = m.userData, c = d.c, R = HOLE, w = R.x1 - R.x0, h = R.y1 - R.y0;
  if (u <= 0) { const b = Math.max(0, 1 - d.r * 0.8) * (0.022 + 0.006 * Math.sin(NOW * 40 + d.k * 9) * (u > -0.25 ? 1 : 0)); m.position.set(c.x, c.y, b); m.rotation.set((d.k - 0.5) * 0.06, (d.k2 - 0.5) * 0.06, 0); return; }
  const vy = 0.5 + d.k2 * 1.1, yFloor = FLOOR_Y + 0.02 - (R.y0 + R.y1) / 2, y0 = c.y;
  const tHit = (vy + Math.sqrt(vy * vy + 2 * SHARD_G * (y0 - yFloor))) / SHARD_G, ut = Math.min(u, tHit), tt = tHit + 0.12;
  // los trozos caen DENTRO de la clínica (entre 0,2 y 0,9 m de la pared y sin salirse por los lados): así ninguno pasa por delante de la cámara
  const wx = (R.x0 + R.x1) / 2, vz = Math.min(1.1 + d.k * 1.6 + (1 - d.r) * 0.8, (0.2 + 0.7 * d.k) / tt);
  const vx = clamp(c.x / (w / 2) * 0.9 + (d.k - 0.5) * 0.8, (-0.66 - wx - c.x) / tt, (0.66 - wx - c.x) / tt);
  const slide = u > tHit ? (1 - Math.exp(-(u - tHit) * 6)) * 0.12 : 0;
  m.position.set(c.x + vx * ut + vx * slide, y0 + vy * ut - 0.5 * SHARD_G * ut * ut, vz * ut + vz * slide);
  const sp = ut + slide * 2; m.rotation.set(-(1.2 + d.k * 4) * sp, (d.k2 - 0.5) * 5 * sp, (d.k - 0.5) * 6 * sp);
}
function centerAt(t, st) {
  const Z = S.ctr, on = t < CUTS[0] + 0.05 || t > CUTS[CUTS.length - 1] - 0.05; Z.visible = on; if (!on) return;
  const u = burstU(t);
  for (const m of S.shards) shardAt(m, u);
  // polvo y esquirlas del reventón
  const wc = S.wall.position;
  S.dust.visible = u > 0 && u < 1.6; if (S.dust.visible) { burst(S.dust, v3(wc.x, wc.y, wc.z + 0.05), u, 0, 0.35, 1.6, false, 0.25); S.dust.material.opacity = 0.55 * (1 - clamp(u / 1.6)); S.dust.material.transparent = true; }
  S.chips.visible = u > 0 && u < 1.0; if (S.chips.visible) { burst(S.chips, v3(wc.x, wc.y, wc.z + 0.05), u, 0, 0.8, 1.0, false, 2.6); }
  // la vaca: empuja (u < 0, con temblor), embiste al reventar y mueve la cabeza
  const C = S.cow, lung = u <= 0 ? 0 : eo(clamp(u / 0.32)) * COW_LUNGE;
  const push = u <= 0 ? 0.012 * Math.sin(NOW * 31) : 0;
  C.position.set(COW_X, 0, COW_Z0 + lung + push);
  // al final (rebobinado) las poses se funden con las del principio (tiempo t − END) para que el último fotograma enlace con el primero
  const lb = win(t, END - 1.3, 0.9), mixP = (a, b) => { const o = {}; for (const k in a) o[k] = typeof a[k] === 'number' ? lerp(a[k], b[k] ?? 0, lb) : a[k]; return o; };
  const cowP = tt => { const sniff = u > 0.6 ? Math.sin(tt * 1.7) * 0.06 : 0, nod = tt > K.vaca1 - 0.1 && tt < K.vaca1 + 0.9 ? Math.sin((tt - K.vaca1 + 0.1) * 11) * 0.06 * (1 - clamp((tt - K.vaca1) / 0.9)) : 0;
    const lookDog = u > 0.6 ? 0.18 * win(tt, 1.0, 0.8) : 0;
    return { neck: 0.75 + nod, neckY: sniff * 0.6 - lookDog * 0.4, head: -0.6 + sniff * 0.5, headY: -lookDog, tail: Math.sin(tt * 2.3) * 0.25, ear: 0.15 + 0.12 * Math.sin(tt * 3.1) }; };
  poseAnimal(C, lb > 0 ? mixP(cowP(t), cowP(t - END)) : cowP(t));
  // cachorro: se asusta con el golpe, mira a la vaca, ladea la cabeza con «¿por qué?»
  const D = S.dog, jump = u > 0 && u < 0.5 ? Math.sin(u / 0.5 * Math.PI) * 0.035 : 0;
  D.position.y = FLOOR_Y + 0.23 + jump;
  const dogP = tt => { const tilt = win(tt, K.por2 - 0.1, 0.3) * (1 - win(tt, K.crees3, 0.4));
    return { neck: -0.1 - (u > 0 && u < 0.6 ? 0.25 : 0), headY: (u > 0.1 ? 0.5 * (1 - win(tt, 1.6, 0.6)) : 0) + 0.15 * Math.sin(tt * 1.3), headZ: 0.35 * tilt, tail: Math.sin(tt * 13) * 0.45, ear: -0.1 + (u > 0 && u < 0.8 ? 0.5 : 0) }; };
  poseAnimal(D, lb > 0 ? mixP(dogP(t), dogP(t - END)) : dogP(t));
  // gato: salta a la camilla con «gatos»
  const ck = pop(t, K.gatos1 - 0.18, 0.4) * (1 - win(t, END - 1.15, 0.4)); S.cat.visible = ck > 0.01; if (S.cat.visible) { S.cat.scale.setScalar(Math.max(0.0001, ck)); S.cat.position.y = FLOOR_Y + 0.23 + 0.08 * Math.sin(clamp((t - K.gatos1 + 0.18) / 0.4) * Math.PI);
    poseAnimal(S.cat, { headY: 0.25 * Math.sin(t * 0.9), tail: Math.sin(t * 2.6) * 0.3, tailX: 0.1 }); }
  show(S.steth, pop(t, K.curando1 - 0.1, 0.4) * (1 - win(t, END - 1.15, 0.4)) * 0.9);
  // el guante: cae con «y un día», se estira con «brazo entero» y gira despacio
  { const G = S.glove, k = win(t, K.y1 - 0.1, 0.45), off = 1 - win(t, K.crees3 - 0.2, 0.4) + (t > CUTS[CUTS.length - 1] ? 1 : 0); G.visible = k > 0.01 && off > 0.01 && t < CUTS[0];
    if (G.visible) { const s2 = 0.42 * k; G.scale.setScalar(Math.max(0.0001, s2)); G.position.set(0.36, 0.66 - 0.12 * eo(k) + 0.012 * Math.sin(t * 2), 0.22); G.rotation.set(0.15, t * 0.6, -0.25);
      G.userData.sleeve.scale.y = lerp(0.18, 1, eo(clamp((t - K.brazo1 + 0.05) / 0.5))); } }
  // animales grandes alrededor con «muchos animales a la vez»
  const big = [[S.horse, K.muchos3 - 0.12], [S.pig, K.animales3 - 0.12], [S.hen, K.vez3 - 0.45]];
  for (const [A, t0] of big) { const k = t > CUTS[CUTS.length - 1] ? (A === S.horse ? 1 - win(t, END - 1.2, 0.5) : 0) : pop(t, t0, 0.45); A.visible = k > 0.01; if (A.visible) A.scale.setScalar(Math.max(0.0001, k) * A.userData.s0); }
  poseAnimal(S.horse, { neck: 0.05 * Math.sin(t * 1.1), headY: 0.1 * Math.sin(t * 0.7), tail: Math.sin(t * 1.9) * 0.2, ear: 0.1 });
  poseAnimal(S.pig, { headY: 0.12 * Math.sin(t * 1.4), tail: 0 });
  poseAnimal(S.hen, { neck: 0.15 * Math.sin(t * 4.2), head: -0.1 });
}
// ---------------------------------------------------------------- estaciones en el círculo de radio R_ST (una por asignatura): Anatomía (plataforma giratoria con seis
// animales que cruzan el arco de rayos X), Farmacología (el mismo frasco, tres jeringas), Microbiología y parásitos (placa, garrapata y microbios que saltan
// del animal a la persona), Producción animal (granja, pienso y ADN), Cirugía (quirófano), lo que comes (supermercado y matadero) y Reproducción (la vaca en rayos X).
const ST = {};
function station(name, a, r = 0.95) {
  const Z = new THREE.Group(); Z.position.copy(stP(a)); Z.rotation.y = a * D2; scene.add(Z);
  const pl = plinth(r, 0.55); Z.add(pl); const lc = lightCone(r * 1.15, 4.6, 0.035); Z.add(lc);
  const top = new THREE.Group(); top.position.y = 0.55; Z.add(top);
  ST[name] = { Z, top, a, cone: lc }; return ST[name];
}
const TOP = 0.55;
function canvasPlane(w, h, px, draw, opts = {}) {        // plano con lienzo que se puede redibujar
  const t = canvasTex(px, Math.round(px * h / w), draw); const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: opts.r ?? 0.85, transparent: !!opts.tr, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }), opts.cs ?? false);
  m.userData.tex = t; return m;
}
// ---------- Anatomía: orden de la voz (perro, gato, caballo, vaca, cerdo, gallina), longitud ≈ 0,44 cada uno
const AN_KIND = [['dog', 0.78], ['cat', 0.85], ['horse', 0.19], ['cow', 0.2], ['pig', 0.3], ['hen', 0.85]];
const AN_R = 0.72, AN_SW = 0.26;      // radio de la plataforma y medio recorrido del barrido de rayos X (de la cabeza a la cola, delante)
function buildStations() {
  // ---------- L4 Anatomía
  { const s = station('AN', ANG.AN, 1.12);
    s.tt = new THREE.Group(); s.tt.position.y = 0.0; s.top.add(s.tt);
    s.tt.add(at(cyl(1.05, 1.07, 0.04, M.enamel, 72), 0, 0.02, 0)); s.tt.add(at(new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.008, 8, 96), M.brass), 0, 0.04, 0, 0, Math.PI / 2));
    for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, tk = mesh(new THREE.BoxGeometry(0.004, 0.002, 0.05), M.brass); tk.position.set(Math.sin(a) * 0.98, 0.041, Math.cos(a) * 0.98); tk.rotation.y = a; s.tt.add(tk); }
    s.ani = AN_KIND.map(([k, sc], i) => { const A = makeAnimal(k, sc), f = i * Math.PI / 3; A.position.set(Math.sin(f) * AN_R, 0.04, Math.cos(f) * AN_R); A.rotation.y = f - Math.PI / 2; addXray(A, 0x8fd2ff, { pw: 2.4, base: 0.04 }); xrMode(A, 'scan', v3(1, 0, 0), -1e9); s.tt.add(A); A.userData.s0 = 1; return A; });
    s.lamp = xrayLamp(AN_R, 0.66); s.lamp.position.y = 0.04; s.top.add(s.lamp);
  }
  // ---------- L5 Farmacología: el mismo frasco; gato, perro y caballo con su jeringa (de pequeña a enorme)
  { const s = station('FA', ANG.FA, 1.0);
    s.vial = vial(2.3); s.vial.position.set(-0.3, 0, -0.22); s.top.add(s.vial);
    s.ani = [['cat', 0.62, [-0.12, 0, 0.42], 0.9], ['dog', 0.62, [0.06, 0, 0.06], 0.6], ['horse', 0.2, [0.2, 0, -0.36], 0.35]].map(([k, sc, p, ry]) => { const A = makeAnimal(k, sc); A.position.set(...p); A.rotation.y = ry; s.top.add(A); A.userData.s0 = 1; return A; });
    s.syr = [[0.55, [-0.12, 0.36, 0.42]], [1.0, [0.06, 0.48, 0.06]], [2.0, [0.2, 0.66, -0.36]]].map(([sc, p]) => { const g = syringeV(sc); g.position.set(...p); g.rotation.z = -Math.PI / 2; s.top.add(g); g.userData.s0 = sc; return g; });
    s.lines = s.syr.map(g => { const a = v3(-0.3, 0.36, -0.22), b = g.position.clone().add(v3(0, 0.08 * g.userData.s0, 0)), m = a.clone().lerp(b, 0.5).add(v3(0, 0.25, 0)); const l = drawLine(new THREE.QuadraticBezierCurve3(a, m, b).getPoints(40), 0xffc24a, 2.4, 0.9); s.top.add(l); return l; });
  }
  // ---------- L6 Microbiología y parásitos: placa de Petri, garrapata, vaca y persona; los microbios saltan de una a otra
  { const s = station('MI', ANG.MI, 1.05);
    s.pet = petri(3.0); s.pet.position.set(-0.3, 0, -0.32); s.top.add(s.pet);
    s.tick = tick(2.4); s.tick.position.set(0.28, 0, 0.3); s.tick.rotation.y = -2.3; s.top.add(s.tick);
    s.cow = makeAnimal('cow', 0.2); s.cow.position.set(0.32, 0, -0.28); s.cow.rotation.y = -0.6; s.top.add(s.cow);
    s.hum = figurine(M.ceramic.clone(), 1.9); s.hum.position.set(-0.3, 0, 0.32); s.hum.rotation.y = 0.6; s.top.add(s.hum);
    s.germs = []; for (let i = 0; i < 26; i++) { const g = microbe(0.011 + hash(i * 3.3) * 0.008, i % 4 ? M.germ : M.germ2); g.visible = false; s.top.add(g); s.germs.push(g); }
    s.cowTint = s.cow.userData.mats.body; s.humMat = s.hum.userData.J.head.material;
  }
  // ---------- L7 Producción animal: granja (establo, silo, valla, vacas y gallinas), pienso y ADN
  { const s = station('PR', ANG.PR, 1.05);
    s.grass = at(cyl(0.98, 0.98, 0.012, M.grass, 72), 0, 0.006, 0); s.top.add(s.grass);
    s.barn = barn(1.25); s.barn.position.set(-0.3, 0.012, -0.36); s.barn.rotation.y = 0.35; s.top.add(s.barn);
    s.silo = silo(1.1); s.silo.position.set(0.22, 0.012, -0.5); s.top.add(s.silo);
    s.fences = [[0, 0.62, 0], [-0.55, 0.38, 1.0], [0.55, 0.38, -1.0]].map(([x, z, ry]) => { const f = fence(0.55, 5); f.position.set(x, 0.012, z); f.rotation.y = ry; s.top.add(f); return f; });
    s.cows = [[0.34, -0.05, -2.2], [0.1, 0.12, -0.6], [0.45, 0.25, 2.6]].map(([x, z, ry]) => { const A = makeAnimal('cow', 0.12); A.position.set(x, 0.012, z); A.rotation.y = ry; s.top.add(A); return A; });
    s.hens = [[-0.48, 0.12, 0.6], [-0.4, 0.2, 2.0]].map(([x, z, ry]) => { const A = makeAnimal('hen', 0.3); A.position.set(x, 0.012, z); A.rotation.y = ry; s.top.add(A); return A; });
    s.hay = [[-0.42, 0.42, 0.3], [-0.3, 0.5, -0.4]].map(([x, z, ry]) => { const h = hayBale(1.3); h.position.set(x, 0.012, z); h.rotation.y = ry; s.top.add(h); return h; });
    s.tro = trough(1.3); s.tro.position.set(-0.08, 0.012, 0.38); s.tro.rotation.y = 0.1; s.top.add(s.tro);
    s.dna = dnaHelix(0.5, 0.065, 2.2); s.dna.position.set(0.3, 0.02, 0.28); s.top.add(s.dna);
  }
  // ---------- L8 Cirugía: camilla de quirófano, el perro tumbado con el paño verde, lámpara, anestesia, monitor y puntos
  { const s = station('CI', ANG.CI, 1.0);
    s.table = examTable(1.45); s.table.position.set(0, 0, 0); s.top.add(s.table);
    const ty = 0.215 * 1.45 + 0.022;
    s.dog = makeAnimal('dog', 0.85); s.dog.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(v3(0, -1, 0), v3(0, 0, -1), v3(1, 0, 0))); s.dog.position.set(-0.05, ty + 0.08, 0.24); s.top.add(s.dog);
    poseAnimal(s.dog, { legs: { legFR: -0.5, legFL: -0.3, legHR: 0.4, legHL: 0.25 }, neck: -0.2, ear: 0.3 });
    s.drape = rbox(0.3, 0.26, 0.012, M.drape, 0.01); s.drape.rotation.x = -Math.PI / 2; s.drape.position.set(0.02, ty + 0.165, 0.0); s.top.add(s.drape);
    s.cut = mesh(new THREE.BoxGeometry(0.11, 0.002, 0.012), new THREE.MeshPhysicalMaterial({ color: 0xc04a52, roughness: 0.4, clearcoat: 0.6 })); s.cut.position.set(0.02, ty + 0.172, 0.0); s.top.add(s.cut);
    s.stitches = []; for (let i = 0; i < 6; i++) { const st2 = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0016, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x1b2a4a, roughness: 0.5 })); st2.position.set(-0.03 + i * 0.019, ty + 0.173, 0); st2.rotation.set(0, Math.PI / 2, 0); st2.visible = false; s.top.add(st2); s.stitches.push(st2); }
    s.needle = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0018, 6, 20, Math.PI * 1.1), M.chrome); s.needle.visible = false; s.top.add(s.needle);
    s.lamp = surgLamp(1.25); s.lamp.position.set(0.0, 0.78, 0.02); s.top.add(s.lamp);
    s.pole = at(cyl(0.012, 0.012, 0.8, M.chrome, 12), 0.38, 0.4, 0.02); s.top.add(s.pole); s.top.add(at(cyl(0.08, 0.09, 0.015, M.enamel, 28), 0.38, 0.008, 0.02));
    s.anes = anesthesia(1.25); s.anes.position.set(0.56, 0, -0.2); s.anes.rotation.y = -0.6; s.top.add(s.anes);
    s.mask = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.05, 20, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xdfeef7, roughness: 0.1, transparent: true, opacity: 0.6, clearcoat: 1, side: THREE.DoubleSide })); s.mask.visible = false; s.top.add(s.mask);
    s.hose = drawLine(new THREE.CatmullRomCurve3([v3(0.5, 0.3, -0.16), v3(0.44, 0.22, -0.12), v3(0.3, ty + 0.08, -0.134)]).getPoints(30), 0x9fb3c4, 3, 1); s.top.add(s.hose);
    s.mon = ecgMonitor(1.0); s.mon.position.set(-0.5, 0.42, -0.3); s.mon.rotation.y = 0.5; s.top.add(s.mon); drawEcg(s.mon.userData.scr, 0);
  }
  // ---------- L9 Lo que comes: frigorífico del supermercado con la bandeja, matadero con su semáforo, el veterinario oficial y los animales que pasan
  { const s = station('SA', ANG.SA, 1.25);
    s.fridge = new THREE.Group(); s.fridge.position.set(-0.45, 0, 0.3); s.fridge.rotation.y = 0.5; s.top.add(s.fridge);
    s.fridge.add(at(rbox(0.5, 0.3, 0.16, M.trim, 0.02), 0, 0.08, 0, 0, -Math.PI / 2));
    s.fridge.add(at(mesh(new THREE.BoxGeometry(0.46, 0.006, 0.26), M.steelB), 0, 0.162, 0)); s.fridge.add(at(mesh(new THREE.BoxGeometry(0.5, 0.02, 0.02), glowM(0xdff2ff, 2.2)), 0, 0.17, -0.15));
    s.trays = [[-0.13, 0.04, 0.2], [0.13, 0.03, -0.2]].map(([x, z, ry]) => { const tr = meatTray(0.95, false); tr.position.set(x, 0.165, z); tr.rotation.y = ry; s.fridge.add(tr); return tr; });
    s.tray = meatTray(1.7); s.tray.position.set(-0.12, 0, 0.62); s.tray.rotation.y = 0.25; s.top.add(s.tray);
    s.mag = magnifier(1.2); s.mag.visible = false; s.top.add(s.mag);
    s.stamp = rubberStamp('INSPECCIONADO'); s.stamp.scale.setScalar(1.6); s.stamp.visible = false; s.top.add(s.stamp);
    s.mark = canvasPlane(0.2, 0.11, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#b8121b'; g.lineWidth = 14; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 12, h / 2 - 12, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#b8121b'; g.font = '900 56px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('INSPECCIONADO', w / 2, h / 2 + 4, w - 70); }, { tr: true }); s.mark.rotation.x = -Math.PI / 2; s.mark.visible = false; s.top.add(s.mark);
    s.ab = abattoir(1.25); s.ab.position.set(0.22, 0, -0.42); s.ab.rotation.y = -0.15; s.top.add(s.ab);
    s.vet = medFig('coat', 2.0); s.hel = helmet(0.088); s.hel.position.set(0, 0.11, 0); s.vet.userData.J.neck.add(s.hel); s.vet.visible = false; s.top.add(s.vet);
    s.clip = mesh(new THREE.BoxGeometry(0.15, 0.2, 0.012), M.woodL); s.clip.position.set(0, -0.02, 0.03); s.clip.rotation.x = -0.6; s.vet.userData.J.hR.add(s.clip);
    s.line = [['pig', 0.17], ['cow', 0.12], ['pig', 0.17], ['cow', 0.12]].map(([k, sc]) => { const A = makeAnimal(k, sc); A.visible = false; s.top.add(A); return A; });
  }
  // ---------- L10 Reproducción: la vaca en rayos X con el útero, el ternero dentro y el brazo del veterinario con el guante largo
  { const s = station('RE', ANG.RE, 1.2);
    s.cow = makeAnimal('cow', 0.5); s.cow.position.set(0.05, 0, 0.0); s.cow.rotation.y = -Math.PI / 2 + 0.25; addXray(s.cow, 0x8fd2ff, { pw: 2.2, base: 0.035 }); xrMode(s.cow, 'scan', v3(1, 0, 0), -1e9); s.top.add(s.cow);
    const root = s.cow.userData.G.root;
    s.ut = new THREE.Mesh(uterusGeo(), xrayMat(0xff7aa8, { pw: 1.6, base: 0.12 })); s.ut.position.set(0, 0.86, -0.62); s.ut.scale.setScalar(1.35); s.ut.renderOrder = 8; root.add(s.ut);
    s.utCore = new THREE.Mesh(uterusGeo(), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5c8a).multiplyScalar(0.35), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); s.utCore.position.copy(s.ut.position); s.utCore.scale.setScalar(1.24); root.add(s.utCore);
    s.calf = makeAnimal('calf', 0.11); poseAnimal(s.calf, { neck: 0.9, head: 0.4, legs: { legFR: -1.4, legFL: -1.3, legHR: 1.5, legHL: 1.4 } }); s.calf.position.set(0, 0.77, -0.52); s.calf.rotation.set(0.35, 0.0, 0); root.add(s.calf);
    { const fm = xrayMat(0xffc27a, { pw: 1.4, base: 0.25 }); for (const m of s.calf.userData.solids) m.material = fm; s.calfM = fm; }
    s.arm = glove(0.8); root.add(s.arm); s.arm.userData.m.emissive = new THREE.Color(0xff6a10); s.arm.userData.m.emissiveIntensity = 0.0;
    s.vet = medFig('coat', 10.5); s.vet.userData.J.shR.visible = false; root.add(s.vet);
  }
}
// ---------- un instante de cada estación
function stationsAt(t) {
  const vis = (s, a, b) => { s.Z.visible = t > a && t < b; return s.Z.visible; };
  // L4 Anatomía: la plataforma gira y cada animal cruza el arco cuando se nombra (lo que ha cruzado se ve en rayos X)
  { const s = ST.AN; if (vis(s, CUTS[0] - 0.05, K.medicamento5)) {
    const T6 = [K.perro4, K.gato4, K.caballo4, K.vaca4, K.cerdo4, K.gallina4], D60 = Math.PI / 3;
    const th = keyed(t, [[CUTS[0] - 0.3, 0.12], ...T6.flatMap((tt, i) => [[tt - 0.12, -i * D60 + 0.025], [tt + 0.16, -i * D60 - 0.025]]), [T6[5] + 1.0, -5 * D60 - 0.15], [T6[5] + 2.0, -5 * D60 - 0.25]]);
    s.tt.rotation.y = th;
    const D = v3(1, 0, 0).applyQuaternion(s.Z.quaternion), front = s.top.localToWorld(v3(0, 0, AN_R)); let lampX = -AN_SW;
    s.ani.forEach((A, i) => {
      const pk = i === 0 ? 1 : pop(t, K.muchos4 - 0.1 + i * 0.07, 0.4); A.visible = pk > 0.01; if (!A.visible) return; A.scale.setScalar(Math.max(0.0001, pk));
      const sig = clamp((t - T6[i] + 0.1) / 0.32), sx = lerp(-AN_SW, AN_SW, eio(sig)); if (sig > 0 && sig < 1) lampX = sx;
      xrMode(A, 'scan', D, sig <= 0 ? -1e9 : sig >= 1 ? 1e9 : D.dot(front) + sx);
      poseAnimal(A, { walk: 0.0, neck: 0.05 * Math.sin(t * 2 + i), tail: Math.sin(t * 3 + i) * 0.2 });
    });
    s.lamp.position.x = lampX; const LU = s.lamp.userData, pul = 0.8 + 0.2 * Math.sin(t * 9); LU.cone.material.uniforms.op.value = 0.32 * pul; LU.lens.material.emissiveIntensity = 4 + Math.sin(t * 9); LU.ring.material.opacity = 0.8 * pul;
  } }
  // L5 Farmacología: el frasco, los tres animales y sus jeringas que se llenan con «otra dosis»
  { const s = ST.FA; if (vis(s, K.vaca4, K.parasitos6)) {
    show(s.vial, pop(t, K.farmacologia5 - 0.15, 0.45) * 2.3); s.vial.rotation.y = 0.4 * Math.sin(t * 0.7);
    s.ani.forEach((A, i) => { const k = pop(t, K.mismo5 - 0.1 + i * 0.08, 0.4); A.visible = k > 0.01; if (A.visible) A.scale.setScalar(Math.max(0.0001, k)); poseAnimal(A, { headY: 0.2 * Math.sin(t * 1.2 + i), tail: Math.sin(t * 3 + i) * 0.3 }); });
    s.syr.forEach((g, i) => { const k = pop(t, K.otra5 - 0.15 + i * 0.1, 0.4); g.visible = k > 0.01; if (g.visible) { g.scale.setScalar(Math.max(0.0001, k) * g.userData.s0); g.userData.setFill(eo(clamp((t - K.dosis5 - i * 0.12) / 0.55)) * [0.25, 0.55, 0.95][i]); } });
    s.lines.forEach((l, i) => drawK(l, clamp((t - K.medicamento5 - i * 0.12) / 0.45) * (1 - win(t, K.especie5 + 0.6, 0.3))));
  } }
  // L6 Microbiología: colonias que crecen, la garrapata camina, los microbios rodean a la vaca y saltan a la persona
  { const s = ST.MI; if (vis(s, K.dosis5, K.granjas7)) {
    show(s.pet, pop(t, K.microbiologia6 - 0.15, 0.45) * 3.0); s.pet.userData.cols.forEach((c, i) => { const k = clamp((t - K.microbiologia6 - 0.05 - hash(i * 2.2) * 0.7) / 0.35); c.visible = k > 0; c.scale.set(eo(k), 0.35 * eo(k), eo(k)); });
    const tk = pop(t, K.parasitos6 - 0.2, 0.45); show(s.tick, tk * 2.4); if (s.tick.visible) { const w = t * 9; s.tick.userData.legs.forEach((l, i) => { l.rotation.y = Math.sin(w + i * 1.7) * 0.25; }); s.tick.position.set(0.28 - 0.06 * clamp((t - K.parasitos6) / 2), 0, 0.3 + 0.04 * clamp((t - K.parasitos6) / 2)); }
    const ck = pop(t, K.enferma6 - 0.25, 0.45); show(s.cow, ck); poseAnimal(s.cow, { headY: 0.15 * Math.sin(t * 1.3), neck: 0.25 * win(t, K.animal6, 0.5) });
    const hk = pop(t, K.y6 - 0.1, 0.45); show(s.hum, hk);
    const sick = win(t, K.animal6 - 0.1, 0.5), sickH = win(t, K.ti6 - 0.15, 0.4);
    s.cow.userData.mats.body.emissive.setRGB(0.25 * sick, 0.02 * sick, 0.04 * sick);
    s.humMat.emissive = s.humMat.emissive || new THREE.Color(); s.hum.traverse(o => { if (o.isMesh && o.material.emissive) o.material.emissive.setRGB(0.4 * sickH, 0.03 * sickH, 0.05 * sickH); });
    const cc = v3(0.32, 0.2, -0.28), hc = v3(-0.3, 0.2, 0.32);
    s.germs.forEach((g, i) => { const t0 = K.enferma6 + i * 0.03, k = clamp((t - t0) / 0.3); g.visible = k > 0.01; if (!g.visible) return;
      const a = t * (1.6 + hash(i) * 1.5) + i * 2.4, r = 0.12 + hash(i * 3.1) * 0.08, yy = 0.05 + hash(i * 5.3) * 0.22;
      const orb = (c) => v3(c.x + Math.cos(a) * r, yy + Math.sin(a * 1.3) * 0.03, c.z + Math.sin(a) * r);
      const j = clamp((t - K.y6 - 0.05 - (i % 13) * 0.08) / 0.7), jump = i % 2 === 0 ? eio(j) : 0;
      const p = orb(cc).lerp(orb(hc), jump); p.y += Math.sin(jump * Math.PI) * 0.35; g.position.copy(p); g.scale.setScalar(eo(k)); g.rotation.set(t * 2 + i, t * 3, 0); });
  } }
  // L7 Producción animal: la granja se monta, el pienso cae en el comedero, el ADN sube girando
  { const s = ST.PR; if (vis(s, K.ti6 - 0.1, K.anestesia8)) {
    show(s.barn, pop(t, K.granjas7 - 0.2, 0.45) * 1.25); show(s.silo, pop(t, K.granjas7 - 0.05, 0.45) * 1.1);
    s.fences.forEach((f, i) => show(f, pop(t, K.produccion7 + i * 0.1, 0.35)));
    s.cows.forEach((A, i) => { show(A, pop(t, K.animal7 - 0.1 + i * 0.08, 0.4)); poseAnimal(A, { neck: 0.7 + 0.1 * Math.sin(t * 2 + i), tail: Math.sin(t * 2.4 + i) * 0.3 }); });
    s.hens.forEach((A, i) => { show(A, pop(t, K.granjas7 + 0.15 + i * 0.1, 0.35)); poseAnimal(A, { neck: 0.4 * Math.max(0, Math.sin(t * 6 + i * 2)) }); });
    s.hay.forEach((h, i) => show(h, pop(t, K.alimentacion7 - 0.1 + i * 0.1, 0.4) * 1.3)); show(s.tro, pop(t, K.alimentacion7 - 0.15, 0.4) * 1.3); fillTrough(s.tro, clamp((t - K.alimentacion7) / 0.6), t);
    const dk = clamp((t - K.genetica7 + 0.1) / 0.5); s.dna.visible = dk > 0.01; s.dna.rotation.y = t * 1.6; s.dna.userData.items.forEach((it, i) => { const k = clamp(dk * 1.4 - i / 26 * 0.4); it.visible = k > 0.01; it.scale.setScalar(Math.max(0.0001, eo(k))); });
    s.dna.userData.strands.forEach(st2 => { st2.scale.y = Math.max(0.0001, eo(dk)); st2.visible = dk > 0.01; });
  } }
  // L8 Cirugía: la lámpara se enciende, la mascarilla y el monitor, los puntos uno a uno
  { const s = ST.CI; if (vis(s, K.genetica7 - 0.1, K.espana9)) {
    const lk = win(t, K.quirofano8 - 0.05, 0.2); s.lamp.userData.leds.forEach(l => l.material.emissiveIntensity = 0.2 + 5 * lk); s.lamp.userData.lamp.children[0].material.emissive = new THREE.Color(0xfff2d6).multiplyScalar(0.12 * lk);
    const ak = pop(t, K.anestesia8 - 0.1, 0.4); s.mask.visible = ak > 0.01; if (s.mask.visible) { s.mask.scale.setScalar(Math.max(0.0001, ak)); s.mask.position.set(0.255, 0.215 * 1.45 + 0.102, -0.134); s.mask.rotation.set(0, 0, -Math.PI / 2); }
    drawK(s.hose, clamp((t - K.anestesia8) / 0.35)); s.anes.userData.bag.scale.set(1, 1.3 + 0.15 * Math.sin(t * 4) * win(t, K.anestesia8, 0.3), 1);
    show(s.mon, pop(t, K.anestesia8 + 0.1, 0.4)); if (s.mon.visible) drawEcg(s.mon.userData.scr, t);
    const n = s.stitches.length; s.stitches.forEach((st2, i) => { st2.visible = t > K.puntos8 - 0.1 + i * 0.07; });
    const nk = clamp((t - K.puntos8 + 0.1) / (n * 0.07)); s.needle.visible = nk > 0 && nk < 1; if (s.needle.visible) { const x = -0.03 + nk * 0.095; s.needle.position.set(x, 0.215 * 1.45 + 0.205, 0); s.needle.rotation.set(0, Math.PI / 2, t * 12); }
  } }
  // L9 Lo que comes: la bandeja y la lupa; el matadero en rojo hasta que entra el veterinario oficial; los animales pasan; el sello «INSPECCIONADO»
  { const s = ST.SA; if (vis(s, K.puntos8 - 0.1, K.reproduccion10)) {
    const mk = win(t, K.vigilas9 - 0.15, 0.35) * (1 - win(t, K.espana9 - 0.1, 0.35)); s.mag.visible = mk > 0.01; if (s.mag.visible) { s.mag.scale.setScalar(1.2 * mk); s.mag.position.set(-0.12 + 0.05 * Math.sin(t * 2.2), 0.2, 0.62 + 0.03 * Math.cos(t * 1.7)); s.mag.rotation.set(-1.25, 0, 0.2); }
    const on = win(t, K.dentro9 - 0.05, 0.15); s.ab.userData.lampR.material.emissiveIntensity = 4 * (1 - on) * win(t, K.matadero9 - 0.1, 0.2); s.ab.userData.lampG.material.emissiveIntensity = 4 * on;
    s.ab.userData.door.position.y = 0.085 + 0.15 * win(t, K.oficial9, 0.4) * (1 - win(t, K.dentro9 + 0.25, 0.3));
    // el veterinario: llega por la derecha y entra; vuelve a salir para revisar a los animales
    const wk = clamp((t - K.veterinario9 + 0.15) / 1.05), back = win(t, K.revisando9 - 0.2, 0.3);
    s.vet.visible = t > K.sin9 - 0.1 && (wk < 0.98 || back > 0.01);
    if (s.vet.visible) { const J = s.vet.userData.J, p0 = v3(0.72, 0, 0.15), p1 = v3(0.3, 0, -0.2), p2 = v3(0.42, 0, 0.18); const p = back > 0.01 ? p2 : p0.clone().lerp(p1, eio(wk));
      s.vet.position.copy(p); s.vet.rotation.y = back > 0.01 ? -1.3 : Math.atan2(p1.x - p0.x, p1.z - p0.z); const sw = back > 0.01 ? 0 : Math.sin(wk * 14) * 0.45 * (wk < 1 ? 1 : 0);
      J.hpL.rotation.x = sw; J.hpR.rotation.x = -sw; J.shL.rotation.x = -sw * 0.7; J.shR.rotation.x = back > 0.01 ? -1.0 : sw * 0.7; J.elR.rotation.x = back > 0.01 ? -0.6 : 0; s.clip.visible = back > 0.01; }
    s.line.forEach((A, i) => { const t0 = K.revisando9 + i * 0.32, u = (t - t0) / 1.6; A.visible = u > 0 && u < 1.05; if (!A.visible) return;
      const p = v3(0.75, 0, 0.32).lerp(v3(0.05, 0, 0.0), clamp(u)); A.position.copy(p); A.rotation.y = Math.atan2(-0.7, -0.32); poseAnimal(A, { walk: 0.35, phase: t * 9 + i }); A.position.y = Math.abs(Math.sin(t * 9 + i)) * 0.005; });
    // el sello cae sobre la bandeja con «después»
    const sk = clamp((t - K.despues9 + 0.25) / 0.3), up = win(t, K.despues9 + 0.25, 0.35); s.stamp.visible = sk > 0 && t < K.despues9 + 0.9;
    if (s.stamp.visible) s.stamp.position.set(-0.12, 0.05 + 0.4 * (1 - eio(sk)) + 0.25 * up, 0.62); s.stamp.rotation.y = 0.25;
    s.mark.visible = t > K.despues9 + 0.04; s.mark.position.set(-0.12, 0.066, 0.62); s.mark.rotation.z = -0.25;
  } }
  // L10 Reproducción: la vaca pasa a rayos X; el útero y el ternero; el brazo con el guante entra hasta el hombro
  { const s = ST.RE; if (vis(s, K.dentro9, CUTS[CUTS.length - 1] + 0.02)) {
    const D = v3(0, 0, 1).applyQuaternion(s.cow.getWorldQuaternion(new THREE.Quaternion())), c = s.cow.getWorldPosition(new THREE.Vector3());
    const sk = clamp((t - K.reproduccion10 + 0.1) / 0.6), L = 0.7; xrMode(s.cow, 'scan', D, sk <= 0 ? -1e9 : sk >= 1 ? 1e9 : D.dot(c) + lerp(-L, L, eio(sk)));
    const uk = win(t, K.vaca10, 0.4); s.ut.visible = s.utCore.visible = uk > 0.01; s.ut.material.uniforms.op.value = uk * (1 + 0.5 * win(t, K.utero10 - 0.05, 0.2) * Math.max(0, Math.sin((t - K.utero10) * 8)));
    s.utCore.material.opacity = 0.5 * uk;
    const fk = win(t, K.prenada10 - 0.05, 0.35); s.calf.visible = fk > 0.01; s.calfM.uniforms.op.value = fk * (0.8 + 0.2 * Math.sin(t * 5));
    // el brazo: de fuera (detrás de la vaca) a dentro, encima del útero
    const ak = eio(clamp((t - K.palpa10 + 0.1) / (K.dentro10 + 0.3 - K.palpa10))) , deep = 0.08 * win(t, K.brazo10b - 0.1, 0.4);
    const hand = v3(0, 1.06, lerp(-1.3, -0.5 - deep, ak)), sh = v3(0.24, 1.42, lerp(-2.15, -1.36 - deep, ak));
    s.arm.visible = s.vet.visible = t > K.saber10;
    if (s.arm.visible) { const d = hand.clone().sub(sh), Lr = d.length(); s.arm.position.copy(hand); s.arm.quaternion.setFromUnitVectors(v3(0, 1, 0), d.clone().normalize()); s.arm.scale.setScalar(Lr / 0.95);
      s.arm.userData.m.emissiveIntensity = 0.35 * win(t, K.palpa10, 0.3); s.arm.userData.hand.rotation.x = 0.25 * win(t, K.utero10, 0.3);
      s.vet.position.set(sh.x - 0.218, 0, sh.z - 0.02); s.vet.rotation.y = 0.0; const J = s.vet.userData.J; J.hpL.rotation.x = 0.1; J.hpR.rotation.x = -0.1; }
    poseAnimal(s.cow, { neck: 0.05, headY: 0.15 * Math.sin(t * 0.8), tail: 0.35, tailX: -0.2 });
  } }
}
// ---------------------------------------------------------------- cámara: en la clínica (el cachorro, la vaca que revienta la pared, el guante) → se aleja y aparecen los
// animales grandes → se zambulle en la mancha blanca de la vaca (blanco) → estaciones (Anatomía, Farmacología, Microbiología, Producción, Cirugía, lo que comes,
// Reproducción) → corte a la clínica → perros y gatos o vacas y caballos → vuelve al primer fotograma mientras la pared se rebobina (bucle)
let CKS = [], CUTS = [];
const T_HIT = -0.14;          // el reventón empezó justo antes del primer fotograma (el primer fotograma ya es la pared saltando)
const stCam = (a, dist, h, dx = 0) => { const p = stP(a, dist, h).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const stLook = (a, y, dx = 0, r = R_ST) => { const p = stP(a, r, y).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const T0 = [0.42, 0.45, 1.05], L0 = [-0.02, 0.64, -0.4], TA = [0.46, 0.47, 1.15], LA = [-0.02, 0.64, -0.4], T1 = [0.38, 0.44, 0.98], L1 = [-0.03, 0.66, -0.38];
function buildCam() {
  const { AN, FA, MI, PR, CI, SA, RE } = ANG;
  const cut1 = Math.round((K.anatomia4 - 0.12) * 60) / 60, cut3 = Math.round((K.asi11 - 0.08) * 60) / 60; CUTS = [cut1, cut3];
  const A1 = [
    [-1.0, TA, LA, 40], [0.0, T0, L0, 40], [0.3, T1, L1, 39],
    [K.curando1, [0.36, 0.48, 0.95], [0.06, 0.42, -0.05], 37], [K.gatos1, [0.12, 0.5, 1.08], [0.0, 0.38, 0.0], 37],
    [K.dia1, [0.5, 0.5, 1.05], [0.26, 0.47, 0.12], 36], [K.entero1, [0.7, 0.56, 1.0], [0.33, 0.5, 0.16], 36],
    [K.dentro1, [0.42, 0.62, 0.62], [0.0, 0.66, -0.3], 36], [K.vaca1 + 0.2, [0.28, 0.68, 0.42], [-0.04, 0.66, -0.3], 36],
    [K.por2 + 0.2, [0.3, 0.5, 0.95], [0.08, 0.4, 0.0], 36], [K.final2 + 0.2, [0.18, 0.5, 0.92], [0.06, 0.39, 0.0], 36],
    [K.mascotas3, [-0.06, 0.52, 1.0], [0.02, 0.36, 0.02], 36], [K.realidad3, [0.15, 0.62, 1.1], [0.0, 0.5, -0.15], 38],
    [K.muchos3, [0.9, 1.75, 3.0], [-0.3, 0.85, -0.8], 40], [K.vez3, [0.75, 1.95, 2.7], [-0.2, 1.0, -1.1], 40],
    [cut1 - 0.0005, [0.12, 1.62, -1.25], [0.05, 1.45, -1.65], 36],
  ];
  const hold = (t, a, d, h, dx, ly, ldx, lr = R_ST, f = 34) => [t, stCam(a, d, h, dx), stLook(a, ly, ldx, lr), f];
  const A2 = [
    [cut1, stCam(AN, 9.6, 0.9, 0.0), stLook(AN, 0.8, 0.0, 8.5), 34], [K.anatomia4 + 0.3, stCam(AN, 9.95, 1.05, 0.15), stLook(AN, 0.78, 0, 8.55), 35],
    [K.muchos4, stCam(AN, 10.2, 1.25, 0.1), stLook(AN, 0.75, 0, 8.4), 36], [K.perro4, stCam(AN, 10.0, 1.05, 0.05), stLook(AN, 0.76, 0.0, 8.6), 34],
    [K.gallina4 + 0.3, stCam(AN, 10.0, 1.1, -0.08), stLook(AN, 0.76, -0.05, 8.6), 34], hold(K.farmacologia5 - 0.3, AN, 10.0, 1.1, -0.1, 0.76, -0.06, 8.6, 34),
    [K.farmacologia5 + 0.1, stCam(FA, 9.9, 1.25, -0.1), stLook(FA, 0.85, 0.0, 8.05), 35], [K.mismo5, stCam(FA, 9.75, 1.15, -0.25), stLook(FA, 0.82, -0.15, 7.9), 34],
    [K.otra5, stCam(FA, 9.85, 1.2, 0.05), stLook(FA, 0.9, 0.05, 8.05), 35], [K.especie5 + 0.2, stCam(FA, 9.9, 1.25, 0.15), stLook(FA, 0.92, 0.1, 8.0), 35],
    hold(K.microbiologia6 - 0.28, FA, 9.92, 1.25, 0.17, 0.92, 0.11, 8.0, 35),
    [K.microbiologia6 + 0.05, stCam(MI, 9.3, 1.5, -0.28), stLook(MI, 0.6, -0.3, 7.7), 34], [K.parasitos6 - 0.15, stCam(MI, 9.25, 1.45, -0.22), stLook(MI, 0.6, -0.26, 7.72), 34], [K.parasitos6 + 0.25, stCam(MI, 9.6, 1.05, 0.25), stLook(MI, 0.62, 0.25, 8.3), 34],
    [K.enferma6, stCam(MI, 9.8, 1.2, 0.15), stLook(MI, 0.72, 0.25, 7.8), 34], [K.y6, stCam(MI, 10.0, 1.3, 0.0), stLook(MI, 0.75, 0.0, 8.0), 36],
    [K.ti6, stCam(MI, 9.75, 1.1, -0.2), stLook(MI, 0.7, -0.25, 8.3), 34], hold(K.produccion7 - 0.22, MI, 9.75, 1.1, -0.22, 0.7, -0.26, 8.3, 34),
    [K.produccion7 + 0.15, stCam(PR, 10.0, 1.45, 0.0), stLook(PR, 0.7, 0.0, 7.95), 36], [K.granjas7, stCam(PR, 9.9, 1.35, -0.15), stLook(PR, 0.72, -0.15, 7.75), 35],
    [K.alimentacion7, stCam(PR, 9.6, 1.05, -0.1), stLook(PR, 0.62, -0.08, 8.3), 34], [K.genetica7, stCam(PR, 9.7, 1.15, 0.2), stLook(PR, 0.85, 0.28, 8.25), 34],
    hold(K.cirugia8 - 0.25, PR, 9.72, 1.17, 0.22, 0.87, 0.29, 8.25, 34),
    [K.cirugia8 + 0.1, stCam(CI, 10.2, 1.7, 0.0), stLook(CI, 0.98, 0.0, 8.0), 36], [K.quirofano8, stCam(CI, 10.0, 1.6, -0.05), stLook(CI, 1.05, 0.0, 8.0), 36],
    [K.anestesia8, stCam(CI, 9.8, 1.45, 0.25), stLook(CI, 0.92, 0.18, 7.95), 35], [K.puntos8, stCam(CI, 9.55, 1.5, 0.02), stLook(CI, 0.9, 0.02, 7.98), 33],
    hold(K.y9 - 0.22, CI, 9.53, 1.5, 0.02, 0.9, 0.02, 7.98, 33),
    [K.y9 + 0.12, stCam(SA, 10.1, 1.3, -0.2), stLook(SA, 0.65, -0.2, 8.5), 35], [K.vigilas9, stCam(SA, 9.75, 1.05, -0.15), stLook(SA, 0.6, -0.12, 8.6), 33],
    [K.espana9, stCam(SA, 10.2, 1.25, 0.15), stLook(SA, 0.78, 0.2, 7.7), 36], [K.funcionar9, stCam(SA, 10.0, 1.15, 0.25), stLook(SA, 0.75, 0.25, 7.7), 35],
    [K.veterinario9, stCam(SA, 10.0, 1.15, 0.45), stLook(SA, 0.72, 0.42, 7.8), 35], [K.dentro9, stCam(SA, 9.95, 1.1, 0.35), stLook(SA, 0.72, 0.3, 7.75), 35],
    [K.revisando9 + 0.2, stCam(SA, 10.1, 1.2, 0.35), stLook(SA, 0.68, 0.35, 8.2), 35], [K.antes9, stCam(SA, 10.05, 1.15, 0.2), stLook(SA, 0.66, 0.25, 8.2), 35],
    [K.despues9, stCam(SA, 9.85, 1.05, -0.1), stLook(SA, 0.6, -0.12, 8.65), 33], hold(K.y10 - 0.25, SA, 9.83, 1.04, -0.11, 0.6, -0.12, 8.65, 33),
    [K.y10 + 0.1, stCam(RE, 10.7, 1.35, 0.15), stLook(RE, 0.92, 0.1, 7.95), 38], [K.reproduccion10, stCam(RE, 10.6, 1.3, 0.2), stLook(RE, 0.95, 0.15, 7.95), 38],
    [K.prenada10, stCam(RE, 10.2, 1.25, 0.4), stLook(RE, 1.0, 0.38, 7.95), 36], [K.palpa10, stCam(RE, 10.2, 1.3, 0.62), stLook(RE, 1.05, 0.58, 7.9), 36],
    [K.dentro10, stCam(RE, 10.05, 1.25, 0.6), stLook(RE, 1.03, 0.52, 7.92), 35], [K.metido10 + 0.2, stCam(RE, 10.3, 1.3, 0.62), stLook(RE, 1.02, 0.55, 7.92), 36],
    hold(cut3 - 0.0005, RE, 10.32, 1.31, 0.63, 1.02, 0.55, 7.92, 36),
  ];
  const A3 = [
    [cut3, [1.08, 0.66, 0.72], [-0.05, 0.4, -0.02], 36], [K.curar11, [1.0, 0.62, 0.6], [-0.05, 0.39, 0.0], 35],
    [K.pero11, [0.2, 0.5, 0.7], [0.0, 0.5, -0.2], 36], [K.vaca11 + 0.1, [0.3, 0.66, 0.45], [-0.04, 0.68, -0.3], 36],
    [K.perros12, [0.2, 0.5, 0.95], [0.04, 0.38, 0.0], 37], [K.vacas12, [0.6, 1.9, 3.1], [-0.4, 0.95, -0.9], 40], [K.leo12, [0.75, 1.95, 3.25], [-0.35, 0.95, -0.85], 40],
    [END - 1.0, [0.8, 0.6, 1.5], [-0.02, 0.56, -0.4], 40], [END - 0.25, TA, LA, 40], [END, T0, L0, 40], [END + 0.3, T1, L1, 39],
  ];
  CKS = [A1, A2, A3];
}
function camAt(t) {
  let i = 0; while (i < CUTS.length && t >= CUTS[i]) i++;
  const st = camKeys(t, CKS[i]);
  for (const th of [T_HIT, END + T_HIT]) { const u = t - th; if (u > 0 && u < 0.5) { const a = 0.014 * Math.exp(-u * 8); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; st.l.y += Math.sin(u * 83 + 2) * a * 0.6; } }
  return st;
}
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return t; return t - dt; }
// ---------------------------------------------------------------- destellos y blanco (la zambullida en la mancha blanca de la vaca)
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[T_HIT, 0.16], [END + T_HIT, 0.16], [K.entero1, 0.04], [K.muchos3, 0.04], [K.anatomia4, 0.04], [K.farmacologia5, 0.04], [K.microbiologia6, 0.04], [K.produccion7, 0.04], [K.cirugia8, 0.04], [K.quirofano8, 0.06],
    [K.matadero9, 0.04], [K.dentro9, 0.05], [K.despues9, 0.08], [K.reproduccion10, 0.07], [K.utero10, 0.05], [CUTS[1], 0.14], [K.vaca11, 0.05], [K.vacas12, 0.05]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { const c = CUTS[0]; return t < c ? eio(clamp((t - (c - 0.32)) / 0.32)) : 1 - eo(clamp((t - c - 0.05) / 0.4)); }
// ---------------------------------------------------------------- un instante de la escena
function stageAt(t, st) {
  NOW = t; centerAt(t, st); stationsAt(t);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.2, 1.6);
  const xr = t > K.reproduccion10 && t < CUTS[1] ? win(t, K.reproduccion10, 0.5) : 0;
  rigAt(c, yaw, k, 1.15 * (1 - 0.55 * xr), 0.6);
  const R = S.rig; R.sun.intensity = 0.0; R.hemi.intensity = 0.12 * (1 - 0.5 * xr);
}
// ---------------------------------------------------------------- HUD: cabecera con el «mensaje pendiente» (lo del brazo), titulares de cada asignatura y rótulos con línea guía
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A', HD = '#8FE6FF', HT = '#62E3D4';
function hdr(t) {
  const a = 1 - 0.85 * whiteAt(t); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic';
  const tk = 1;     // la cabecera ya está escrita en el primer fotograma (así enlaza con el último)
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('VETERINARIA', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('EL GRADO, POR DENTRO', tk), 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('GRADO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('300 ECTS', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('5 AÑOS', 1024, 178);
  const mk = win(t, K.final2, 0.3) * (1 - win(t, K.asi11 + 0.6, 0.4));
  if (mk > 0.01) {
    let txt = 'LO DEL BRAZO · ???', col = HC.red, blink = true;
    if (t > K.reproduccion10) { txt = 'REPRODUCCIÓN ✓'; col = HC.green; blink = false; }
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
// lista con marcas (✓) que se van encendiendo
function checklist(items, x, y, t, a = 1, size = 40) {
  for (let i = 0; i < items.length; i++) { const [txt, t0, col] = items[i], k = cw(t, t0 - 0.08, 1e9) * a; if (k <= 0.01) continue;
    bigText('✓ ' + txt, x, y + i * (size * 1.5), size, col || HC.white, k, { align: 'left', dark: 22, ls: 4 }); }
}
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1430;
  // L1: el guante largo · la vaca
  if (S.glove.visible) lab(S.glove.userData.hand, 0, 0.12, 0, 'GUANTE LARGO', 'HASTA EL HOMBRO', cw(t, K.entero1 - 0.1, K.dentro1 + 0.2), { dx: -120, dy: -120, color: '#FF9A4A' });
  { const k = cw(t, K.dentro1 - 0.05, K.por2 - 0.1); if (k > 0.01) bigText('DENTRO DE UNA VACA', W / 2, Y + 40, 56, HC.white, k, { glow: 10, dark: 26 }); }
  // L2: ¿por qué?
  { const q = cw(t, K.por2 - 0.05, K.crees3 - 0.1); if (q > 0.01) bigText('?', W / 2, Y - 30, 240, HC.red, q, { glow: 34, type: false, dark: 34 }); }
  // L3: mascotas → muchos animales
  { const k = cw(t, K.mascotas3 - 0.1, K.realidad3); if (k > 0.01) bigText('MASCOTAS', W / 2, Y, 80, HD, k, { glow: 18, dark: 28 });
    const m = cw(t, K.muchos3 - 0.1, CUTS[0] - 0.25); if (m > 0.01) { bigText('MUCHOS ANIMALES', W / 2, Y - 20, 64, HG, m, { glow: 18, dark: 28 }); bigText('A LA VEZ', W / 2, Y + 60, 40, HC.white, cw(t, K.vez3 - 0.1, CUTS[0] - 0.25), { dark: 22 }); } }
  // L4: Anatomía y el nombre de cada animal al cruzar el arco
  { const s = ST.AN; if (s.Z.visible) {
    const k = cw(t, K.anatomia4 - 0.05, K.perro4 - 0.15); if (k > 0.01) { bigText('ANATOMÍA', W / 2, Y - 20, 92, HC.white, k, { glow: 14, dark: 30 }); bigText('NO DE UN CUERPO: DE MUCHOS', W / 2, Y + 70, 30, HG, cw(t, K.sino4 - 0.1, K.perro4 - 0.15), { dark: 22 }); }
    const T6 = [K.perro4, K.gato4, K.caballo4, K.vaca4, K.cerdo4, K.gallina4, K.farmacologia5 - 0.25], N6 = ['PERRO', 'GATO', 'CABALLO', 'VACA', 'CERDO', 'GALLINA'];
    for (let i = 0; i < 6; i++) { const k2 = cw(t, T6[i] - 0.06, T6[i + 1] - 0.1); if (k2 > 0.01) { bigText(N6[i], W / 2, Y, 96, HD, k2, { glow: 20, type: false, dark: 30 }); bigText(`${i + 1} / 6`, W / 2, Y + 80, 30, HC.grey, k2, { type: false, dark: 20 }); } }
  } }
  // L5: Farmacología: el mismo fármaco, otra dosis para cada especie
  { const s = ST.FA; if (s.Z.visible) {
    bigText('FARMACOLOGÍA', W / 2, Y - 20, 74, HC.white, cw(t, K.farmacologia5 - 0.05, K.otra5 - 0.1), { glow: 12, dark: 28 });
    bigText('EL MISMO FÁRMACO', W / 2, Y + 64, 34, HG, cw(t, K.mismo5 - 0.1, K.otra5 - 0.1), { dark: 22 });
    bigText('OTRA DOSIS', W / 2, Y, 84, HG, cw(t, K.otra5 - 0.05, K.microbiologia6 - 0.3), { glow: 18, type: false, dark: 30 });
    bigText('PARA CADA ESPECIE', W / 2, Y + 76, 32, HC.white, cw(t, K.cada5 - 0.1, K.microbiologia6 - 0.3), { dark: 22 });
    lab(s.vial, 0, 0.17, 0, 'MISMO FRASCO', null, cw(t, K.mismo5, K.otra5 + 0.2), { dx: -110, dy: -130, color: HG });
    ['GATO', 'PERRO', 'CABALLO'].forEach((n, i) => lab(s.syr[i], 0.07, 0, 0, n, null, cw(t, K.para5 ?? K.cada5 - 0.15 + i * 0.1, K.microbiologia6 - 0.3), { dx: i === 2 ? 110 : -110, dy: -90 - i * 20, color: HD }));
  } }
  // L6: Microbiología y parásitos · zoonosis
  { const s = ST.MI; if (s.Z.visible) {
    bigText('MICROBIOLOGÍA', W / 2, Y - 20, 72, HC.green, cw(t, K.microbiologia6 - 0.05, K.enferma6 - 0.1), { glow: 16, dark: 28 });
    lab(s.tick, 0, 0.06, 0, 'PARÁSITOS', 'GARRAPATA', cw(t, K.parasitos6 + 0.05, K.enferma6 + 0.4), { dx: 110, dy: -140, color: HC.amber });
    bigText('LO QUE ENFERMA A UN ANIMAL', W / 2, Y, 38, HC.white, cw(t, K.enferma6 - 0.05, K.y6 - 0.05), { dark: 24 });
    bigText('Y LO QUE PUEDE PASARTE A TI', W / 2, Y, 38, HC.red, cw(t, K.y6 - 0.05, K.produccion7 - 0.3), { glow: 12, dark: 24 });
    lab(s.hum, 0, 1.0, 0, 'ZOONOSIS', 'DEL ANIMAL A LA PERSONA', cw(t, K.ti6 - 0.1, K.produccion7 - 0.3), { dx: -110, dy: -150, color: HC.red });
  } }
  // L7: Producción animal: granjas, alimentación, genética
  { const s = ST.PR; if (s.Z.visible) { const a = cw(t, K.produccion7 - 0.05, K.cirugia8 - 0.3);
    bigText('PRODUCCIÓN ANIMAL', W / 2, Y - 60, 58, HC.white, a, { glow: 12, dark: 28 });
    checklist([['GRANJAS', K.granjas7, HC.white], ['ALIMENTACIÓN', K.alimentacion7, HG], ['GENÉTICA', K.genetica7, HD]], 300, Y + 10, t, a, 38);
  } }
  // L8: Cirugía: quirófano, anestesia, puntos
  { const s = ST.CI; if (s.Z.visible) { const a = cw(t, K.cirugia8 - 0.05, K.y9 - 0.25);
    bigText('CIRUGÍA', W / 2, Y - 40, 92, HC.white, a, { glow: 14, dark: 30 });
    lab(s.lamp.userData.lamp, 0, -0.03, 0, 'QUIRÓFANO', null, cw(t, K.quirofano8, K.y9 - 0.25), { dx: 120, dy: 60, color: HG });
    lab(s.mask, 0, 0.02, 0, 'ANESTESIA', null, cw(t, K.anestesia8 + 0.05, K.y9 - 0.25), { dx: 110, dy: -120, color: HD });
    lab(s.cut, 0.0, 0.0, 0, 'PUNTOS', null, cw(t, K.puntos8 - 0.02, K.y9 - 0.25), { dx: -110, dy: -110, color: HT });
  } }
  // L9: lo que comes · ningún matadero sin veterinario oficial · antes y después
  { const s = ST.SA; if (s.Z.visible) {
    bigText('LO QUE CASI NADIE SABE', W / 2, Y, 46, HG, cw(t, K.y9 - 0.05, K.tambien9 - 0.1), { glow: 12, dark: 26 });
    bigText('TAMBIÉN VIGILAS', W / 2, Y - 30, 52, HC.white, cw(t, K.tambien9 - 0.05, K.espana9 - 0.1), { dark: 26 }); bigText('LO QUE COMES', W / 2, Y + 50, 64, HG, cw(t, K.comes9 - 0.1, K.espana9 - 0.1), { glow: 16, dark: 28 });
    lab(s.ab, -0.08, 0.3, 0.18, 'MATADERO', 'EN ESPAÑA', cw(t, K.matadero9 - 0.05, K.revisando9), { dx: -120, dy: -120 });
    { const k = cw(t, K.ningun9 - 0.05, K.dentro9 - 0.05); if (k > 0.01) { bigText('SIN VETERINARIO OFICIAL', W / 2, Y - 10, 40, HC.red, k, { glow: 12, dark: 26 }); bigText('✗ NO FUNCIONA', W / 2, Y + 60, 48, HC.red, cw(t, K.funcionar9 - 0.05, K.dentro9 - 0.05), { type: false, dark: 26 }); } }
    { const k = cw(t, K.dentro9 - 0.05, K.revisando9 - 0.05); if (k > 0.01) bigText('✓ VETERINARIO DENTRO', W / 2, Y + 20, 48, HC.green, k, { glow: 14, type: false, dark: 26 }); }
    if (s.vet.visible) lab(s.vet.userData.J.neck, 0, 0.2, 0, 'VETERINARIO OFICIAL', null, cw(t, K.veterinario9 + 0.1, K.revisando9 - 0.1), { dx: 110, dy: -130, color: HC.green });
    bigText('REVISA CADA ANIMAL', W / 2, Y - 30, 46, HC.white, cw(t, K.revisando9 - 0.05, K.y10 - 0.3), { dark: 24 });
    { const a = cw(t, K.antes9 - 0.05, K.y10 - 0.3); if (a > 0.01) { bigText('✓ ANTES', W / 2 - 170, Y + 50, 56, HC.green, a, { type: false, dark: 26 }); bigText('✓ DESPUÉS', W / 2 + 150, Y + 50, 56, HC.green, cw(t, K.despues9 - 0.05, K.y10 - 0.3), { type: false, dark: 26 }); } }
  } }
  // L10: ¿y lo del brazo? Reproducción · ¿preñada? · útero · el brazo dentro
  { const s = ST.RE; if (s.Z.visible) {
    bigText('¿Y LO DEL BRAZO?', W / 2, Y, 64, HC.red, cw(t, K.y10 - 0.05, K.reproduccion10 - 0.05), { glow: 14, dark: 28 });
    bigText('REPRODUCCIÓN', W / 2, Y, 80, HC.green, cw(t, K.reproduccion10 - 0.05, K.saber10 - 0.05), { glow: 16, dark: 28 });
    bigText('¿PREÑADA?', W / 2, Y, 84, '#FF8FB5', cw(t, K.saber10 - 0.05, K.palpa10 - 0.1), { glow: 18, dark: 28 });
    lab(s.calf, 0, 0.12 / 0.11 * 0.0 + 0.0, 0, 'TERNERO', null, cw(t, K.prenada10 + 0.05, K.palpa10 - 0.05), { dx: -110, dy: -140, color: '#FFC27A' });
    lab(s.ut, 0, 0.14, 0.1, 'ÚTERO', null, cw(t, K.utero10 - 0.05, cut3Of() - 0.05), { dx: -110, dy: -150, color: '#FF8FB5' });
    bigText('SE PALPA DESDE DENTRO', W / 2, Y, 44, HC.white, cw(t, K.palpa10 - 0.05, K.con10 - 0.05), { dark: 24 });
    bigText('CON EL BRAZO METIDO', W / 2, Y, 50, '#FF9A4A', cw(t, K.con10 - 0.05, cut3Of() - 0.05), { glow: 14, dark: 26 });
  } }
  // L11–L12: vas a curar perros y gatos, pero antes, la vaca · ¿perros y gatos o vacas y caballos? · mándaselo
  if (t > CUTS[1]) {
    bigText('PERROS Y GATOS', W / 2, Y, 64, HD, cw(t, K.perros11 - 0.05, K.pero11 - 0.05), { glow: 14, dark: 26 });
    bigText('PERO ANTES, LA VACA', W / 2, Y, 60, HG, cw(t, K.pero11 - 0.05, K.perros12 - 0.1), { glow: 16, dark: 26 });
    const d = cw(t, K.perros12 - 0.05, K.te12 - 0.1); if (d > 0.01) { bigText('¿PERROS Y GATOS', W / 2, Y - 30, 58, HD, d, { glow: 14, type: false, dark: 26 }); bigText('O VACAS Y CABALLOS?', W / 2, Y + 50, 58, HG, cw(t, K.o12 - 0.05, K.te12 - 0.1), { glow: 16, type: false, dark: 26 }); }
    bigText('TE LEO EN COMENTARIOS', W / 2, Y, 42, HC.white, cw(t, K.te12 - 0.05, K.mandaselo12 - 0.05), { dark: 24 });
    { const m = cw(t, K.mandaselo12 - 0.05, END - 0.55); if (m > 0.01) { bigText('MÁNDASELO A QUIEN', W / 2, Y - 20, 44, HC.white, m, { dark: 24 }); bigText('QUIERE SER VETERINARIO', W / 2, Y + 44, 44, HG, cw(t, K.quien12 - 0.05, END - 0.55), { glow: 12, dark: 24 }); } }
  }
}
const cut3Of = () => CUTS[CUTS.length - 1];
// ---------------------------------------------------------------- un fotograma (renderAt), portada y arranque: tipos de letra, tiempos de la voz y escena
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
    imaginas1: atL(1, 'imaginas'), veterinaria1: atL(1, 'veterinaria'), curando1: atL(1, 'curando'), perros1: atL(1, 'perros'), gatos1: atL(1, 'gatos'), y1: atL(1, '=y', 2), dia1: atL(1, 'dia'),
    meter1: atL(1, 'meter'), brazo1: atL(1, 'brazo'), entero1: atL(1, 'entero'), dentro1: atL(1, 'dentro'), vaca1: atL(1, 'vaca'),
    por2: atL(2, 'por'), digo2: atL(2, 'digo'), final2: atL(2, 'final'),
    crees3: atL(3, 'crees'), carrera3: atL(3, 'carrera'), mascotas3: atL(3, 'mascotas'), realidad3: atL(3, 'realidad'), estudias3: atL(3, 'estudias'), muchos3: atL(3, 'muchos'), animales3: atL(3, 'animales'), vez3: atL(3, 'vez'),
    anatomia4: atL(4, 'anatomia'), no4: atL(4, '=no'), cuerpo4: atL(4, 'cuerpo'), sino4: atL(4, 'sino'), muchos4: atL(4, 'muchos'), perro4: atL(4, 'perro'), gato4: atL(4, 'gato'), caballo4: atL(4, 'caballo'), vaca4: atL(4, 'vaca'), cerdo4: atL(4, 'cerdo'), gallina4: atL(4, 'gallina'),
    farmacologia5: atL(5, 'farmacologia'), mismo5: atL(5, 'mismo'), medicamento5: atL(5, 'medicamento'), otra5: atL(5, 'otra'), dosis5: atL(5, 'dosis'), cada5: atL(5, 'cada'), especie5: atL(5, 'especie'),
    microbiologia6: atL(6, 'microbiologia'), parasitos6: atL(6, 'parasitos'), enferma6: atL(6, 'enferma'), animal6: atL(6, 'animal'), y6: atL(6, '=y', 2), pasarte6: atL(6, 'pasarte'), ti6: atL(6, '=ti'),
    produccion7: atL(7, 'produccion'), animal7: atL(7, 'animal'), granjas7: atL(7, 'granjas'), alimentacion7: atL(7, 'alimentacion'), genetica7: atL(7, 'genetica'),
    cirugia8: atL(8, 'cirugia'), quirofano8: atL(8, 'quirofano'), anestesia8: atL(8, 'anestesia'), puntos8: atL(8, 'puntos'),
    y9: atL(9, '=y'), casi9: atL(9, 'casi'), sabe9: atL(9, 'sabe'), tambien9: atL(9, 'tambien'), vigilas9: atL(9, 'vigilas'), comes9: atL(9, 'comes'), espana9: atL(9, 'espana'), ningun9: atL(9, 'ningun'), matadero9: atL(9, 'matadero'),
    funcionar9: atL(9, 'funcionar'), sin9: atL(9, '=sin'), veterinario9: atL(9, 'veterinario'), oficial9: atL(9, 'oficial'), dentro9: atL(9, 'dentro'), revisando9: atL(9, 'revisando'), cada9: atL(9, 'cada'), animal9: atL(9, 'animal'), antes9: atL(9, 'antes'), despues9: atL(9, 'despues'),
    y10: atL(10, '=y'), brazo10: atL(10, 'brazo'), reproduccion10: atL(10, 'reproduccion'), saber10: atL(10, 'saber'), vaca10: atL(10, 'vaca'), prenada10: atL(10, 'prenada'), palpa10: atL(10, 'palpa'), utero10: atL(10, 'utero'), desde10: atL(10, 'desde'),
    dentro10: atL(10, 'dentro'), con10: atL(10, '=con'), brazo10b: atL(10, 'brazo', 2), metido10: atL(10, 'metido'),
    asi11: atL(11, 'asi'), si11: atL(11, '=si'), curar11: atL(11, 'curar'), perros11: atL(11, 'perros'), gatos11: atL(11, 'gatos'), pero11: atL(11, 'pero'), antes11: atL(11, 'antes'), vaca11: atL(11, 'vaca'),
    perros12: atL(12, 'perros'), gatos12: atL(12, 'gatos'), o12: atL(12, '=o'), vacas12: atL(12, 'vacas'), caballos12: atL(12, 'caballos'), te12: atL(12, '=te'), leo12: atL(12, 'leo'), mandaselo12: atL(12, 'mandaselo'), quien12: atL(12, 'quien'), veterinario12: atL(12, 'veterinario'),
  };
  mats(); buildMats(); buildMedMats(); buildVetMats(); buildRig(); buildFloor(); buildFlow();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  scene.fog = new THREE.FogExp2(0x000000, 0.035);
  buildCenter(); buildStations();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
