// «Ingeniería del Software vs Ingeniería Informática» — duelo en un ring (estilo plano técnico: caras oscuras, aristas blancas, rejilla en el
// suelo y polvo con estelas): el chip (Informática) contra el bloque de código (Software), con guantes de boxeo. Alrededor del ring, una
// estación por frase: el ordenador por dentro, los millones de móviles, las cinco ramas, el equipo que entrega, el marcador de notas, el BOE
// con las cinco especialidades, los créditos, la ley en blanco y los títulos que no hacen falta. window.renderAt(t) dibuja el instante t (60 fps).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { W, H, clamp, prog, lerp, eo, eio, ss } from './lib.js';

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
  hg.fillStyle = col; const s = typed(txt, o.type === false ? 1 : clamp(k * 1.6));
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
  // polvo por todo el círculo de estaciones (por donde vuela la cámara), motas alrededor del ring y estrellas lejanas
  S.flow = [
    flowCloud(17000, i => { const r = Math.sqrt(hash(i * 3.1)) * 10.5, a = hash(i * 8.3) * 6.2832; return [r * Math.sin(a), 0.04 + Math.pow(hash(i * 5.7), 1.5) * 3.2, r * Math.cos(a)]; }, { size: 1.8, bright: 0.8, farF: 0.03, seed: 2 }),
    flowCloud(4000, i => [gauss(i) * 1.1, 0.03 + Math.abs(gauss(i + 9e3)) * 0.6, gauss(i + 2e4) * 1.1], { size: 1.3, bright: 0.5, seed: 1, nearF: 0.05, farF: 0.08 }),
    flowCloud(2600, i => { const th = hash(i * 1.9) * 6.283, ph = Math.acos(hash(i * 4.4) * 1.6 - 0.6), r = 55 + hash(i * 6.1) * 45; return [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)]; },
      { size: 1.3, bright: 0.9, farF: 0.002, nearF: 1, drift: 0, seed: 3 }),
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
  const d = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshBasicMaterial({ color: 0x000000 })); d.rotation.x = -Math.PI / 2; d.position.set(0, -0.002, 0); scene.add(d);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: 0.6 })); sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.0004, 0); sh.receiveShadow = true; scene.add(sh);
  S.gridM = new THREE.ShaderMaterial({ vertexShader: GRID_VS, fragmentShader: GRID_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { op: { value: 1 }, camP: { value: new THREE.Vector3() } } });
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), S.gridM); gr.rotation.x = -Math.PI / 2; gr.position.set(0, 0.0008, 0); gr.layers.set(1); scene.add(gr);
  S.floor = { d, sh, gr };
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
// ---------------------------------------------------------------- disposición: el ring en el centro y una estación por frase en un círculo alrededor (mirando hacia fuera);
// la cámara va por fuera del círculo, mirando hacia dentro: detrás de cada estación se ve siempre el ring (el duelo)
const R_ST = 5.5, R_CAM = 7.9;
const ANG = { C: 40, D: 80, E: 120, F: 160, G: 200, H: 240, I: 280, J: 320 };
const rad = a => a * Math.PI / 180;
const stP = (a, r = R_ST, y = 0) => v3(r * Math.sin(rad(a)), y, r * Math.cos(rad(a)));
const stT = a => v3(Math.cos(rad(a)), 0, -Math.sin(rad(a)));                  // tangente (x local de la estación)
function station(a) { const G = new THREE.Group(); G.position.copy(stP(a)); G.rotation.y = rad(a); scene.add(G); return G; }
const SW = '#FFB547', IN = '#62E3D4';
// cara de un bloque de código: «{ }» grande y líneas de código
const CODE_TEX = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#121016'; g.fillRect(0, 0, w, h); g.strokeStyle = SW; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = SW; g.font = '900 250px SpaceMono'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('{ }', w / 2, h * 0.43);
  const L = [[0.18, 0.5], [0.24, 0.34], [0.24, 0.42], [0.18, 0.2]]; L.forEach(([x, l], i) => { g.fillStyle = i % 2 ? 'rgba(255,181,71,.55)' : 'rgba(238,242,246,.55)'; g.fillRect(w * x, h * (0.7 + i * 0.055), w * l, h * 0.025); }); });
// cara del chip: el «die» con pistas de circuito
const DIE_TEX = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#0c1517'; g.fillRect(0, 0, w, h); g.strokeStyle = IN; g.lineWidth = 6; g.strokeRect(30, 30, w - 60, h - 60);
  g.lineWidth = 3; for (let i = 0; i < 26; i++) { const y = 60 + hash(i) * 390, x0 = 40, x1 = 120 + hash(i * 3) * 330; g.strokeStyle = `rgba(98,227,212,${0.35 + hash(i * 7) * 0.5})`; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.lineTo(x1 + 20, y + (hash(i * 5) - 0.5) * 60); g.stroke(); g.fillStyle = IN; g.fillRect(x1 + 14, y + (hash(i * 5) - 0.5) * 60 - 6, 12, 12); }
  g.fillStyle = 'rgba(98,227,212,.18)'; g.fillRect(150, 150, 212, 212); g.strokeStyle = IN; g.lineWidth = 5; g.strokeRect(150, 150, 212, 212);
  g.fillStyle = '#EEF2F6'; g.font = '900 76px SpaceMono'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CPU', 256, 256); });
// ---------------------------------------------------------------- guante de boxeo (rojo brillante): puño, pulgar y puño elástico blanco; mira hacia +z
function glove(col = 0xd8232f) {
  const g = new THREE.Group(), m = plastic(col, 0.25), wm = plastic(0xf3f5f9, 0.3);
  const fist = sph(0.05, m, 24, 18); fist.scale.set(1.0, 0.86, 1.18); fist.position.z = 0.012; g.add(fist);
  const thumb = sph(0.022, m, 16, 12); thumb.scale.set(1, 1, 1.6); thumb.position.set(0.04, -0.012, 0.02); g.add(thumb);
  const cuff = cyl(0.036, 0.04, 0.05, wm, 20); cuff.rotation.x = Math.PI / 2; cuff.position.z = -0.052; g.add(cuff);
  return g;
}
// ---------------------------------------------------------------- los dos aspirantes
function buildChip(s = 1) {         // Informática: chip de pie, con patillas a los cuatro lados
  const G = new THREE.Group(); G.scale.setScalar(s);
  const pkg = bx(0.3, 0.3, 0.035, DARK2, 1.6, TEAL); G.add(pkg);
  const die = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), new THREE.MeshStandardMaterial({ map: DIE_TEX, emissive: 0xffffff, emissiveMap: DIE_TEX, emissiveIntensity: 0.9, roughness: 0.4 })); die.position.z = 0.0185; G.add(die);
  const pinM = metal(0xc9ced6, 0.3);
  for (let i = 0; i < 9; i++) { const u = -0.12 + i * 0.03;
    for (const [x, y, rz] of [[u, 0.162, 0], [u, -0.162, 0], [0.162, u, Math.PI / 2], [-0.162, u, Math.PI / 2]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.008), pinM); p.position.set(x, y, -0.01); p.rotation.z = rz; G.add(p); } }
  G.userData = { die }; return G;
}
function buildCode(s = 1) {         // Software: bloque de código con «{ }»
  const G = new THREE.Group(); G.scale.setScalar(s);
  const b = solid(new THREE.BoxGeometry(0.3, 0.3, 0.07), DARK2, 1.6, AMBER); G.add(b);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshStandardMaterial({ map: CODE_TEX, emissive: 0xffffff, emissiveMap: CODE_TEX, emissiveIntensity: 0.9, roughness: 0.4 })); f.position.z = 0.0355; G.add(f);
  return G;
}
// ---------------------------------------------------------------- el ring (en el centro), los aspirantes con guantes, el rayo entre ellos, el BOE que cae, el anillo de 5 especialidades del chip
const RING_H = 0.14;
function buildRing() {
  const G = new THREE.Group(); scene.add(G); S.ring = G;
  const base = bx(1.5, RING_H, 1.5, DARK, 1.6, EDGE); base.position.y = RING_H / 2; G.add(base);
  const apron = textPlane(1.5, RING_H * 0.9, (g, w, h) => { g.fillStyle = '#0b0d11'; g.fillRect(0, 0, w, h); g.font = '900 26px Inter'; g.textBaseline = 'middle'; g.textAlign = 'right'; g.fillStyle = IN; g.fillText('INFORMÁTICA', w / 2 - 30, h / 2 + 2); g.textAlign = 'left'; g.fillStyle = SW; g.fillText('SOFTWARE', w / 2 + 30, h / 2 + 2); g.fillStyle = '#EEF2F6'; g.textAlign = 'center'; g.fillText('VS', w / 2, h / 2 + 2); }, 1024);
  apron.position.set(0, RING_H / 2, 0.752); G.add(apron);
  const postM = [plastic(TEAL, 0.25), plastic(AMBER, 0.25), plastic(0xf3f5f9, 0.3), plastic(0xf3f5f9, 0.3)];
  [[-0.7, 0.7], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7]].forEach(([x, z], i) => { const p = cyl(0.025, 0.025, 0.5, postM[i % 2 === 0 ? 0 : 1], 16); if (z < 0) p.material = postM[2]; p.position.set(x, RING_H + 0.25, z); G.add(p); });
  for (const y of [0.16, 0.28, 0.4]) {    // cuerdas (que brillan un poco)
    const pts = [[-0.7, 0.7], [0.7, 0.7], [0.7, -0.7], [-0.7, -0.7], [-0.7, 0.7]].map(([x, z]) => v3(x, RING_H + y, z));
    const r = drawLine(pts, 0xf2f4f8, 2.2, 0.85); G.add(r); }
  S.chip = buildChip(1); G.add(S.chip);
  S.code = buildCode(1); G.add(S.code);
  S.glovesI = [glove(0xd8232f), glove(0xd8232f)]; S.glovesI.forEach(g => G.add(g));
  S.glovesS = [glove(0x2459d8), glove(0x2459d8)]; S.glovesS.forEach(g => G.add(g));
  S.bolt = segSet(24, 0xffffff, 2.6, 1); G.add(S.bolt); S.bolt2 = segSet(24, TEAL, 1.6, 0.9); G.add(S.bolt2);
  S.lblI = pill('INFORMÁTICA', IN, 'rgba(10,14,18,.9)', 0.36, 64); G.add(S.lblI);
  S.lblS = pill('SOFTWARE', SW, 'rgba(10,14,18,.9)', 0.3, 64); G.add(S.lblS);
  // el BOE que cae en medio y el anillo de las 5 especialidades que sale del chip
  S.boe = buildBook(0.62, 'BOE'); G.add(S.boe.G);
  S.ring5 = buildRing5(0.62); G.add(S.ring5.G);
  S.qm = qmark(new THREE.MeshPhysicalMaterial({ color: 0xffc21a, emissive: 0xff9a00, emissiveIntensity: 0.5, roughness: 0.2, clearcoat: 1 })); S.qm.scale.setScalar(0.42); G.add(S.qm);
  // final: quien sabe hacerlo (maniquí con portátil) y el cinturón de campeón
  S.coder = new THREE.Group(); G.add(S.coder);
  const desk = bx(0.36, 0.02, 0.22, DARK2, 1.2); desk.position.set(0, RING_H + 0.24, 0.05); S.coder.add(desk);
  for (const [x, z] of [[-0.16, -0.05], [0.16, -0.05], [-0.16, 0.15], [0.16, 0.15]]) { const l = cyl(0.008, 0.008, 0.23, metal(0x8a929e, 0.4), 8); l.position.set(x, RING_H + 0.115, z); S.coder.add(l); }
  S.lap = buildLaptop(0.62); S.lap.G.position.set(0, RING_H + 0.25, 0.07); S.coder.add(S.lap.G);
  S.doll = makeDoll(plastic(0xf1f3f7, 0.18)); S.doll.scale.setScalar(0.6); S.doll.position.set(0, RING_H - 0.02, -0.16); S.coder.add(S.doll);
  S.belt = buildBelt(); G.add(S.belt);
}
// anillo de 5 especialidades (la del software en ámbar): sale del chip; la porción del software se separa
const SPEC = ['COMPUTACIÓN', 'COMPUTADORES', 'SOFTWARE', 'SISTEMAS DE INFORMACIÓN', 'TECNOLOGÍAS DE LA INFORMACIÓN'];
function buildRing5(s = 1) {
  const G = new THREE.Group(); G.scale.setScalar(s); const parts = [];
  for (let i = 0; i < 5; i++) { const a0 = Math.PI / 2 - i * 2 * Math.PI / 5 - 0.03, a1 = a0 - 2 * Math.PI / 5 + 0.06, sh = new THREE.Shape();
    const r0 = 0.22, r1 = 0.4, N = 20; for (let k = 0; k <= N; k++) { const a = lerp(a0, a1, k / N); const x = Math.cos(a) * r1, y = Math.sin(a) * r1; k ? sh.lineTo(x, y) : sh.moveTo(x, y); }
    for (let k = N; k >= 0; k--) { const a = lerp(a0, a1, k / N); sh.lineTo(Math.cos(a) * r0, Math.sin(a) * r0); }
    const col = i === 2 ? AMBER : 0x1f3a3f, m = new THREE.MeshStandardMaterial({ color: col, emissive: i === 2 ? AMBER : TEAL, emissiveIntensity: i === 2 ? 0.55 : 0.12, roughness: 0.4 });
    const p = solid(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }), m, 1.4, i === 2 ? AMBER : TEAL); const am = (a0 + a1) / 2; p.userData = { am, i }; G.add(p); parts.push(p);
    const lb = label(SPEC[i], { size: 64, w: SPEC[i].length > 14 ? 0.34 : 0.24, color: i === 2 ? '#1a1206' : '#cfeee9', weight: 900 }); lb.position.set(Math.cos(am) * 0.31, Math.sin(am) * 0.31, 0.032); lb.rotation.z = am - Math.PI / 2 + (Math.sin(am) < -0.2 ? Math.PI : 0); p.add(lb); }
  return { G, parts };
}
// ---------------------------------------------------------------- libro (el BOE o «LEY»), de «Civil»: tapa que se abre sobre el lomo
function buildBook(s = 1, kind = 'BOE') {
  const G = new THREE.Group(); G.scale.setScalar(s);
  const w = 0.42, d = 0.58, t = 0.014, pg = 0.05;
  const coverTex = canvasTex(420, 580, (g, W_, H_) => { g.fillStyle = '#1a1f27'; g.fillRect(0, 0, W_, H_); g.strokeStyle = '#d8c48a'; g.lineWidth = 6; g.strokeRect(22, 22, W_ - 44, H_ - 44); g.lineWidth = 2; g.strokeRect(34, 34, W_ - 68, H_ - 68);
    g.fillStyle = '#e8d9a8'; g.textAlign = 'center';
    if (kind === 'BOE') { g.font = '900 120px Inter'; g.fillText('BOE', W_ / 2, 230); g.font = '600 22px Inter'; g.fillText('BOLETÍN OFICIAL', W_ / 2, 300); g.fillText('DEL ESTADO', W_ / 2, 332); g.font = '500 20px SpaceMono'; g.fillText('Núm. 187 · 4-8-2009', W_ / 2, 480); }
    else { g.font = '900 92px Inter'; g.fillText('LEY', W_ / 2, 230); g.font = '600 24px Inter'; g.fillText('¿QUIÉN PUEDE', W_ / 2, 320); g.fillText('PROGRAMAR?', W_ / 2, 354); } });
  const CM = new THREE.MeshStandardMaterial({ color: 0x1a1f27, roughness: 0.6 }), PM = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.95 });
  const back = bx(w, t, d, CM, 1.4); back.position.set(w / 2, t / 2, 0); G.add(back);
  const pagesR = bx(w - 0.02, pg, d - 0.03, PM, 1.0); pagesR.position.set(w / 2, t + pg / 2, 0); G.add(pagesR);
  const pageTex = canvasTex(420, 560, (g, W_, H_) => { g.fillStyle = '#e4ded0'; g.fillRect(0, 0, W_, H_);
    if (kind === 'BOE') { g.fillStyle = '#2b2f36'; g.font = '700 22px Inter'; g.fillText('Ingeniería Informática', 30, 56); g.font = '500 16px Inter'; g.fillText('Tecnologías específicas:', 30, 92);
      ['Computación', 'Ingeniería de Computadores', 'Ingeniería del Software', 'Sistemas de Información', 'Tecnologías de la Información'].forEach((s_, i) => { g.fillStyle = i === 2 ? '#b8730a' : '#2b2f36'; g.font = (i === 2 ? '800 ' : '500 ') + '18px Inter'; g.fillText((i + 1) + '. ' + s_, 40, 130 + i * 32); });
      g.fillStyle = 'rgba(43,47,54,.35)'; for (let i = 0; i < 9; i++) g.fillRect(30, 320 + i * 22, 300 + (i * 37) % 60, 7); } });
  const page = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.03, d - 0.04), new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.95 })); page.rotation.x = -Math.PI / 2; page.position.set(w / 2, t + pg + 0.0015, 0); page.receiveShadow = true; G.add(page);
  const yp = t + pg / 2, hinge = new THREE.Group(); hinge.position.y = yp; G.add(hinge);
  const cv = bx(w, t, d, CM, 1.4); cv.position.set(-w / 2, t / 2 - yp, 0); hinge.add(cv);
  const pagesL = bx(w - 0.02, pg, d - 0.03, PM, 1.0); pagesL.position.set(-w / 2, 0, 0); hinge.add(pagesL);
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.03, d - 0.04), new THREE.MeshStandardMaterial({ color: 0xe4ded0, roughness: 0.95 })); lp.rotation.x = -Math.PI / 2; lp.position.set(-w / 2, pg / 2 + 0.0015, 0); hinge.add(lp);
  const ct = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.01, d - 0.01), new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: coverTex, emissiveIntensity: 0.25 }));
  ct.rotation.x = Math.PI / 2; ct.rotation.z = Math.PI; ct.position.set(-w / 2, -yp - 0.0015, 0); hinge.add(ct);
  const spine = bx(t * 1.2, pg + 2 * t, d, CM, 1.2); spine.position.set(-t * 0.4, (pg + 2 * t) / 2, 0); G.add(spine);
  return { G, hinge, page, w, d, top: t + pg + t };
}
// ---------------------------------------------------------------- portátil (pantalla con código que se escribe) y cinturón de campeón
function buildLaptop(s = 1) {
  const G = new THREE.Group(); G.scale.setScalar(s);
  const base = bx(0.34, 0.014, 0.23, DARK2, 1.2); base.position.y = 0.007; G.add(base);
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12), new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.7 })); kb.rotation.x = -Math.PI / 2; kb.position.set(0, 0.0145, 0.02); G.add(kb);
  const lid = new THREE.Group(); lid.position.set(0, 0.014, -0.112); lid.rotation.x = -0.25; G.add(lid);
  const sc = bx(0.34, 0.22, 0.01, DARK2, 1.2); sc.position.y = 0.11; lid.add(sc);
  const scrT = canvasTex(512, 320, () => {}), scr = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), new THREE.MeshBasicMaterial({ map: scrT, toneMapped: false })); scr.position.set(0, 0.11, 0.0055); lid.add(scr);
  return { G, lid, scrT };
}
const CODE_LINES = ['function entrega() {', '  const app = build(codigo);', '  test(app);', '  return deploy(app);', '}', '', '> npm run build', '✓ build OK'];
function drawScreen(T, k, done) {     // k: cuánto código se ha escrito (0-1)
  const g = T.userData.g, w = 512, h = 320; g.fillStyle = '#0b0e12'; g.fillRect(0, 0, w, h);
  g.font = '700 25px SpaceMono'; const total = CODE_LINES.join('').length; let left = Math.floor(total * clamp(k));
  CODE_LINES.forEach((s_, i) => { const n = Math.min(s_.length, left); left -= n; if (n <= 0) return; g.fillStyle = s_.startsWith('✓') ? '#7CF0A9' : s_.startsWith('>') ? '#9AA1AB' : i % 2 ? SW : '#EEF2F6'; g.fillText(s_.slice(0, n), 20, 38 + i * 34); });
  if (done) { g.fillStyle = 'rgba(124,240,169,.18)'; g.fillRect(0, 0, w, h); }
  T.needsUpdate = true;
}
function buildBelt() {
  const G = new THREE.Group(), gold = metal(0xffc861, 0.2), strap = plastic(0x15171c, 0.4);
  const st = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 48), strap); st.scale.set(1, 1, 0.35); st.rotation.x = Math.PI / 2; G.add(st);
  const plate = cyl(0.06, 0.06, 0.012, gold, 32); plate.rotation.x = Math.PI / 2; plate.position.z = 0.115; G.add(plate);
  const star = textPlane(0.08, 0.08, (g, w, h) => { g.fillStyle = '#5a3a08'; g.font = '900 300px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', w / 2, h / 2 + 20); }, 256); star.position.z = 0.1215; G.add(star);
  for (const s of [-1, 1]) { const side = cyl(0.035, 0.035, 0.01, gold, 24); side.rotation.x = Math.PI / 2; side.position.set(s * 0.075, 0, 0.098); side.rotation.y = s * 0.6; G.add(side); }
  return G;
}
// ---------------------------------------------------------------- C · el ordenador por dentro: torre que se abre en despiece (y vuelve a montarse)
function buildPC() {
  const G = station(ANG.C); S.pc = G; const parts = [];
  const PCB = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#0f2a1f'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(160,230,190,.45)'; g.lineWidth = 3; for (let i = 0; i < 40; i++) { const x = hash(i) * w, y = hash(i * 2) * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (hash(i * 3) - 0.5) * 300, y); g.lineTo(x + (hash(i * 3) - 0.5) * 300, y + (hash(i * 4) - 0.5) * 200); g.stroke(); } });
  const caseG = new THREE.Group(); G.add(caseG);
  const back = bx(0.5, 0.62, 0.02, DARK, 1.4); back.position.set(0, 0.31, -0.19); caseG.add(back);
  for (const [x, y, w, h, d] of [[0, 0.62, 0.5, 0.02, 0.4], [0, 0.0, 0.5, 0.02, 0.4], [-0.25, 0.31, 0.02, 0.62, 0.4], [0.25, 0.31, 0.02, 0.62, 0.4]]) { const p = bx(w, h, d, DARK, 1.4); p.position.set(x, y + (h === 0.02 ? 0.01 : 0), 0); caseG.add(p); }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.6), new THREE.MeshPhysicalMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false })); glass.position.set(0, 0.31, 0.2); glass.renderOrder = 7; caseG.add(glass); edges(glass, EDGE, 1.2, 28, 0.8);
  const part = (mesh, name, dx, dy, dz) => { mesh.userData.home = mesh.position.clone(); mesh.userData.off = v3(dx, dy, dz); mesh.userData.name = name; G.add(mesh); parts.push(mesh); return mesh; };
  const mb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.46, 0.012), new THREE.MeshStandardMaterial({ map: PCB, roughness: 0.6 })); mb.position.set(0.0, 0.34, -0.16); edges(mb, 0x7fe0b0, 1.2, 28, 0.9); part(mb, 'PLACA BASE', 0, 0.08, 0.2);
  const cpu = new THREE.Group(); cpu.add(bx(0.09, 0.09, 0.04, DARK2, 1.3, TEAL)); const fan = cyl(0.045, 0.045, 0.03, metal(0x9aa0aa, 0.35), 24); fan.rotation.x = Math.PI / 2; fan.position.z = 0.035; cpu.add(fan); cpu.position.set(-0.02, 0.42, -0.13); part(cpu, 'CPU', -0.14, 0.26, 0.85);
  const ram = new THREE.Group(); for (const x of [0, 0.03]) { const r = bx(0.012, 0.16, 0.035, new THREE.MeshStandardMaterial({ color: 0x1b2433, roughness: 0.5 }), 1.2, 0x9fb4cc); r.position.x = x; ram.add(r); } ram.position.set(0.11, 0.42, -0.13); part(ram, 'RAM', 0.2, 0.22, 0.7);
  const gpu = new THREE.Group(); gpu.add(bx(0.3, 0.06, 0.1, DARK2, 1.3, 0x9fb4cc)); for (const x of [-0.07, 0.07]) { const f = cyl(0.035, 0.035, 0.012, metal(0x7c8592, 0.4), 24); f.position.set(x, -0.036, 0); gpu.add(f); } gpu.position.set(-0.03, 0.22, -0.08); part(gpu, 'GRÁFICA', 0.02, 0.0, 0.9);
  const psu = bx(0.2, 0.1, 0.16, DARK2, 1.3); psu.position.set(-0.12, 0.07, -0.05); part(psu, 'FUENTE', -0.12, 0.0, 0.6);
  const ssd = bx(0.1, 0.012, 0.07, new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.5 }), 1.2, TEAL); ssd.position.set(0.12, 0.1, -0.02); part(ssd, 'DISCO', 0.16, 0.06, 0.75);
  G.userData = { parts, caseG, glass };
}
// ---------------------------------------------------------------- D · los programas que usan millones: terminal → app → móvil → un mar de móviles encendidos
const APP_TEX = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#0b0e12'; g.fillRect(0, 0, w, h); g.fillStyle = SW; rr(g, 58, 150, 140, 140, 34); g.fill(); g.fillStyle = '#1a1206'; g.font = '900 78px SpaceMono'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('{}', 128, 222);
  g.fillStyle = 'rgba(238,242,246,.5)'; for (let i = 0; i < 4; i++) g.fillRect(40, 340 + i * 30, 176 - i * 24, 12); });
function buildPhones() {
  const G = station(ANG.D); S.ph = G;
  const term = new THREE.Group(); term.position.set(0, 0.95, 0); G.add(term);
  term.add(bx(0.5, 0.32, 0.02, DARK2, 1.3, AMBER));
  const tT = canvasTex(512, 320, () => {}), tScr = new THREE.Mesh(new THREE.PlaneGeometry(0.47, 0.29), new THREE.MeshBasicMaterial({ map: tT, toneMapped: false })); tScr.position.z = 0.011; term.add(tScr);
  const app = rbox(0.1, 0.1, 0.025, new THREE.MeshStandardMaterial({ color: AMBER, emissive: AMBER, emissiveIntensity: 0.6, roughness: 0.3 }), 0.025); G.add(app);
  const phone = new THREE.Group(); phone.position.set(0, 0.42, 0.1); G.add(phone);
  phone.add(rbox(0.13, 0.26, 0.012, plastic(0x15171c, 0.3), 0.02));
  const pS = new THREE.Mesh(new THREE.PlaneGeometry(0.118, 0.236), new THREE.MeshBasicMaterial({ map: APP_TEX, toneMapped: false })); pS.position.z = 0.0065; phone.add(pS);
  // el mar de móviles: tumbados en el suelo, de la estación hacia el ring, con la pantalla encendida
  const NX = 44, NZ = 50, geo = new THREE.BoxGeometry(0.05, 0.004, 0.1), mats_ = new THREE.MeshBasicMaterial({ map: APP_TEX, toneMapped: false });
  const sea = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.05, 0.1), mats_, NX * NZ); sea.frustumCulled = false;
  const pos = []; for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) pos.push([(i - (NX - 1) / 2) * 0.075 + (hash(i * 7 + j) - 0.5) * 0.02, 0.003, 0.25 - j * 0.085 + (hash(i + j * 3) - 0.5) * 0.02, hash(i * 13 + j * 7)]);
  G.add(sea);
  G.userData = { term, tT, app, phone, sea, pos };
}
const TERM_LINES = ['$ git commit -m "nueva versión"', '$ build --release', '  compilando… 100%', '✓ app lista'];
function drawTerm(T, k) { const g = T.userData.g, w = 512, h = 320; g.fillStyle = '#0b0e12'; g.fillRect(0, 0, w, h); g.font = '700 24px SpaceMono'; const total = TERM_LINES.join('').length; let left = Math.floor(total * clamp(k));
  TERM_LINES.forEach((s_, i) => { const n = Math.min(s_.length, left); left -= n; if (n <= 0) return; g.fillStyle = s_.startsWith('✓') ? '#7CF0A9' : s_.startsWith('$') ? SW : '#9AA1AB'; g.fillText(s_.slice(0, n), 18, 48 + i * 44); }); T.needsUpdate = true; }
// ---------------------------------------------------------------- E · la generalista: un chip grande y sus 5 ramas alrededor (circuitos, redes, sistemas operativos, IA… y software)
function buildHub() {
  const G = station(ANG.E); S.hub = G;
  const chip = buildChip(1.5); chip.position.set(0, 0.72, 0); G.add(chip);
  const sats = [], links = segSet(5, TEAL, 2, 0.9); G.add(links);
  const at = [[-0.25, 1.16], [0.25, 1.16], [-0.27, 0.32], [0.27, 0.32], [0, 1.36]];
  const mk = [
    () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.008), new THREE.MeshStandardMaterial({ color: 0x0f2a1f, roughness: 0.6 })); edges(b, 0x7fe0b0, 1.2, 28, 1); g.add(b);
      for (let i = 0; i < 4; i++) { const c = bx(0.025, 0.02, 0.012, DARK2, 1, 0x7fe0b0); c.position.set(-0.05 + i * 0.033, (i % 2 ? 0.02 : -0.02), 0.01); g.add(c); } return g; },
    () => { const g = new THREE.Group(); const P = [[0, 0.05], [-0.06, 0.0], [0.06, 0.01], [-0.03, -0.05], [0.04, -0.05]].map(([x, y]) => v3(x, y, 0)); P.forEach(p => { const s = sph(0.012, glowM(TEAL, 1.6), 10, 8); s.position.copy(p); g.add(s); });
      const l = segSet(6, TEAL, 1.6, 0.9); [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [1, 2]].forEach(([a, b], i) => l.userData.set(i, P[a], P[b])); l.userData.flush(); g.add(l); return g; },
    () => { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const w = bx(0.12, 0.08, 0.004, DARK2, 1.1, i === 2 ? 0xffffff : 0x9fb4cc); w.position.set(-0.02 + i * 0.02, 0.02 - i * 0.02, i * 0.008); g.add(w); const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.012), glowLine(i === 2 ? 0x9fd0ff : 0x5b6b80, 1)); bar.position.set(-0.02 + i * 0.02, 0.054 - i * 0.02, i * 0.008 + 0.003); g.add(bar); } return g; },
    () => { const g = new THREE.Group(); const L = [3, 4, 2], P = []; L.forEach((n, li) => { P.push([]); for (let k = 0; k < n; k++) { const p = v3(-0.06 + li * 0.06, (k - (n - 1) / 2) * 0.03, 0); const s = sph(0.009, glowM(0xb08cff, 1.8), 10, 8); s.position.copy(p); g.add(s); P[li].push(p); } });
      const l = segSet(3 * 4 + 4 * 2, 0xb08cff, 1.1, 0.7); let q = 0; for (let a = 0; a < 2; a++) P[a].forEach(p => P[a + 1].forEach(r => l.userData.set(q++, p, r))); l.userData.flush(); g.add(l); return g; },
    () => buildCode(0.42),
  ];
  const names = ['CIRCUITOS', 'REDES', 'SISTEMAS OPERATIVOS', 'INTELIGENCIA ARTIFICIAL', 'SOFTWARE'];
  for (let i = 0; i < 5; i++) { const s = mk[i](); s.position.set(at[i][0], at[i][1], 0.05); G.add(s); sats.push(s);
    const lb = label(names[i], { size: 64, w: names[i].length > 12 ? 0.3 : 0.18, color: i === 4 ? SW : '#cfeee9', weight: 900 }); lb.position.set(0, -0.1, 0.01); s.add(lb); }
  G.userData = { chip, sats, links, at };
}
// ---------------------------------------------------------------- F · Software va al grano: requisitos ✓, arquitectura (cajas que se unen), pruebas (filas en verde) y el ciclo que entrega versiones
function buildPipe() {
  const G = station(ANG.F); S.pipe = G;
  // requisitos: hoja con casillas que se marcan
  const req = new THREE.Group(); req.position.set(0, 1.22, 0); G.add(req);
  req.add(bx(0.34, 0.22, 0.01, DARK2, 1.2, AMBER));
  const reqT = canvasTex(512, 330, () => {}); const reqP = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), new THREE.MeshBasicMaterial({ map: reqT, transparent: true, toneMapped: false })); reqP.position.z = 0.0055; req.add(reqP);
  // arquitectura: 4 cajas y sus conexiones
  const arch = new THREE.Group(); arch.position.set(0, 0.88, 0); G.add(arch);
  const boxes = [[-0.12, 0.06], [0.12, 0.06], [0, -0.06], [0, 0.17]].map(([x, y], i) => { const b = bx(0.1, 0.06, 0.04, DARK2, 1.3, i === 3 ? AMBER : 0x9fb4cc); b.position.set(x, y, 0); arch.add(b); return b; });
  const archL = segSet(4, AMBER, 2, 0.9); arch.add(archL);
  // pruebas: filas que se ponen en verde
  const tests = new THREE.Group(); tests.position.set(0, 0.56, 0); G.add(tests);
  tests.add(bx(0.34, 0.2, 0.01, DARK2, 1.2, 0x7cf0a9));
  const testT = canvasTex(512, 300, () => {}); const testP = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.18), new THREE.MeshBasicMaterial({ map: testT, transparent: true, toneMapped: false })); testP.position.z = 0.0055; tests.add(testP);
  // entrega: ciclo (flecha circular) que suelta una versión en cada vuelta
  const loop = new THREE.Group(); loop.position.set(0, 0.24, 0); G.add(loop);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.01, 8, 64, Math.PI * 1.7), glowLine(AMBER, 1.4)); loop.add(arc);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.045, 16), glowLine(AMBER, 1.4)); head.position.set(0.09, 0, 0); loop.add(head);
  const vers = ['v1.0', 'v1.1', 'v1.2', 'v1.3'].map((v, i) => { const p = pill(v, '#1a1206', 'rgba(255,181,71,.95)', 0.09, 64); G.add(p); return p; });
  G.userData = { req, reqT, arch, boxes, archL, tests, testT, loop, arc, head, vers };
}
function drawReq(T, n) { const g = T.userData.g, w = 512, h = 330; g.clearRect(0, 0, w, h); g.font = '700 30px Inter'; g.fillStyle = SW; g.fillText('REQUISITOS', 22, 44);
  ['Registro de usuarios', 'Pago con tarjeta', 'Funciona sin conexión'].forEach((s_, i) => { const y = 100 + i * 70, on = i < n; g.strokeStyle = on ? '#7CF0A9' : '#9AA1AB'; g.lineWidth = 4; g.strokeRect(22, y - 28, 36, 36);
    if (on) { g.strokeStyle = '#7CF0A9'; g.lineWidth = 6; g.beginPath(); g.moveTo(28, y - 10); g.lineTo(38, y + 2); g.lineTo(54, y - 22); g.stroke(); } g.fillStyle = '#EEF2F6'; g.font = '600 28px Inter'; g.fillText(s_, 76, y); }); T.needsUpdate = true; }
function drawTests(T, n) { const g = T.userData.g, w = 512, h = 300; g.clearRect(0, 0, w, h); g.font = '700 30px Inter'; g.fillStyle = '#7CF0A9'; g.fillText('PRUEBAS', 22, 42);
  for (let i = 0; i < 5; i++) { const y = 86 + i * 44, on = i < n; g.fillStyle = on ? 'rgba(124,240,169,.22)' : 'rgba(238,242,246,.08)'; g.fillRect(22, y - 26, 468, 36); g.fillStyle = on ? '#7CF0A9' : '#9AA1AB'; g.font = '700 26px SpaceMono'; g.fillText((on ? '✓ ' : '· ') + ['login', 'pago', 'offline', 'carga', 'seguridad'][i], 34, y); } T.needsUpdate = true; }
// ---------------------------------------------------------------- G · el marcador: notas de corte (escala de 0 a 14)
const SC_K = 0.085;       // m por punto
function buildScore() {
  const G = station(ANG.G); S.score = G;
  const scale = new THREE.Group(); G.add(scale);
  const tick = glowLine(0xd8f2ff, 1.2);
  for (let v = 0; v <= 14; v++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(v % 2 ? 0.03 : 0.06, 0.004, 0.004), tick); tk.position.set(-0.32, 0.05 + v * SC_K, 0); scale.add(tk);
    if (v % 2 === 0) { const l = label(String(v), { size: 80, w: 0.06, color: '#cfe0ee', weight: 800, font: 'SpaceMono' }); l.position.set(-0.38, 0.05 + v * SC_K, 0); scale.add(l); } }
  const axis = new THREE.Mesh(new THREE.BoxGeometry(0.004, 14 * SC_K, 0.004), tick); axis.position.set(-0.32, 0.05 + 7 * SC_K, 0); scale.add(axis);
  const bars = [[TEAL, -0.12], [AMBER, 0.14]].map(([c, x]) => { const b = solid(new THREE.BoxGeometry(0.16, 1, 0.12), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.35 }), 1.4, 0xffffff); b.position.set(x, 0.05, 0); G.add(b); return b; });
  const top14 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.004, 0.004), glowLine(0xffffff, 0.8)); top14.position.set(0.0, 0.05 + 14 * SC_K, 0); G.add(top14);
  const names = [pill('INFORMÁTICA', IN, 'rgba(10,14,18,.9)', 0.2, 64), pill('SOFTWARE', SW, 'rgba(10,14,18,.9)', 0.17, 64)]; names[0].position.set(-0.12, 0.0, 0.08); names[1].position.set(0.14, 0.0, 0.08); names.forEach(n => G.add(n));
  const uni = label('POLITÉCNICA DE MADRID · 2025', { size: 60, w: 0.5, color: '#9AA1AB', weight: 700 }); uni.position.set(0.02, 0.05 + 14 * SC_K + 0.07, 0); G.add(uni);
  G.userData = { bars, names, uni };
}
// ---------------------------------------------------------------- H · el BOE abierto y el anillo de las 5 especialidades encima
function buildSpec() {
  const G = station(ANG.H); S.spec = G;
  const lect = bx(0.3, 0.42, 0.24, DARK, 1.3); lect.position.set(0, 0.21, 0); G.add(lect);
  const book = buildBook(0.9, 'BOE'); book.G.position.set(0, 0.42, 0); book.G.rotation.x = 0.0; G.add(book.G);
  const r5 = buildRing5(1.15); r5.G.position.set(0, 1.08, 0.05); G.add(r5.G);
  G.userData = { book, r5 };
}
// ---------------------------------------------------------------- I · los créditos: dos columnas de 24 cubos (10 créditos cada uno): 12 iguales, 5 de especialidad (≈ 48), el resto
function buildCredits() {
  const G = station(ANG.I); S.cred = G; const cols = [];
  const cm = { base: new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.4, emissive: 0x303540, emissiveIntensity: 0.4 }), I: new THREE.MeshStandardMaterial({ color: TEAL, emissive: TEAL, emissiveIntensity: 0.45, roughness: 0.35 }),
    S: new THREE.MeshStandardMaterial({ color: AMBER, emissive: AMBER, emissiveIntensity: 0.45, roughness: 0.35 }), rest: new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.6 }) };
  for (const [k, x] of [['I', -0.13], ['S', 0.13]]) { const cubes = []; for (let i = 0; i < 24; i++) { const kind = i < 12 ? 'base' : i < 17 ? k : 'rest'; const c = solid(new THREE.BoxGeometry(0.15, 0.042, 0.12), cm[kind], 1.0, kind === 'base' ? 0x9aa1ab : 0xffffff, 0.6); c.position.set(x, 0.023 + i * 0.047, 0); G.add(c); cubes.push(c); } cols.push(cubes); }
  const names = [pill('INFORMÁTICA', IN, 'rgba(10,14,18,.9)', 0.2, 64), pill('SOFTWARE', SW, 'rgba(10,14,18,.9)', 0.17, 64)]; names[0].position.set(-0.13, -0.03, 0.09); names[1].position.set(0.13, -0.03, 0.09); names.forEach(n => G.add(n));
  const brace = segSet(3, 0xffffff, 2, 0.9); G.add(brace);
  const lbBase = pill('120 CRÉDITOS IGUALES', '#10131a', 'rgba(238,242,246,.95)', 0.3, 60); G.add(lbBase);
  const lb48 = pill('48 DE ESPECIALIDAD', '#1a1206', 'rgba(255,181,71,.95)', 0.28, 60); G.add(lb48);
  G.userData = { cols, brace, lbBase, lb48 };
}
// ---------------------------------------------------------------- J · la ley en blanco; los dos títulos que se van; el portátil que compila igual; «ni un título, ni un colegio»
function buildLaw() {
  const G = station(ANG.J); S.law = G;
  const law = buildBook(1.0, 'LEY'); law.G.position.set(0, 0.0, 0.05); G.add(law.G);
  const scrolls = [[IN, 'INFORMÁTICA'], [SW, 'SOFTWARE']].map(([c, n], i) => { const g = new THREE.Group(); const sc = cyl(0.03, 0.03, 0.28, plastic(0xfaf3e0, 0.4), 24); sc.rotation.z = Math.PI / 2; g.add(sc);
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 8, 24), plastic(c === IN ? TEAL : AMBER, 0.25)); rib.rotation.y = Math.PI / 2; g.add(rib);
    const lb = pill(n, c, 'rgba(10,14,18,.9)', 0.2, 64); lb.position.set(0, -0.07, 0.02); g.add(lb); G.add(g); return g; });
  const lap = buildLaptop(1.2); G.add(lap.G);
  const title = new THREE.Group(); G.add(title);
  title.add(textPlane(0.3, 0.21, (g, w, h) => { g.fillStyle = '#efe7d2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b89a52'; g.lineWidth = 10; g.strokeRect(16, 16, w - 32, h - 32); g.fillStyle = '#4a3a1a'; g.textAlign = 'center'; g.font = '900 64px Inter'; g.fillText('TÍTULO', w / 2, h * 0.45); g.font = '500 30px Inter'; g.fillText('universitario', w / 2, h * 0.68); }, 512));
  const college = new THREE.Group(); G.add(college);
  const cb = bx(0.3, 0.03, 0.14, DARK2, 1.2); cb.position.y = 0.015; college.add(cb);
  for (let i = 0; i < 4; i++) { const c = cyl(0.012, 0.012, 0.15, DARK2, 12); c.position.set(-0.1 + i * 0.066, 0.105, 0.03); edges(c, EDGE, 1, 40, 0.8); college.add(c); }
  const roof = solid(new THREE.CylinderGeometry(0.0, 0.18, 0.07, 3, 1), DARK2, 1.2); roof.rotation.y = Math.PI / 6; roof.scale.set(1, 1, 0.45); roof.position.y = 0.215; college.add(roof);
  const cl = label('COLEGIO', { size: 70, w: 0.16, color: '#EEF2F6', weight: 900 }); cl.position.set(0, 0.31, 0.03); college.add(cl);
  const X = () => { const m = textPlane(0.36, 0.36, (g, w, h) => { g.strokeStyle = '#FF5247'; g.lineWidth = 40; g.lineCap = 'round'; g.beginPath(); g.moveTo(60, 60); g.lineTo(w - 60, h - 60); g.moveTo(w - 60, 60); g.lineTo(60, h - 60); g.stroke(); }, 256); m.renderOrder = 9; G.add(m); return m; };
  const xs = [X(), X()];
  G.userData = { law, scrolls, lap, title, college, xs };
}
// ---------------------------------------------------------------- el escenario en cada instante
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[K.rivales + 0.12, 0.08], [K.boe1 + 0.16, 0.1], [K.parte + 0.3, 0.07], [K.ninguna, 0.05], [K.por3 + 0.05, 0.08], [K.millones + 0.05, 0.08], [K.n1 + 1.1, 0.05], [K.n2 + 1.1, 0.05],
    [K.especialidades, 0.06], [K.n48, 0.06], [K.nada, 0.07], [K.titulo12 + 0.05, 0.07], [K.colegio + 0.05, 0.07], [K.hacerlo, 0.1]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.07);
  return f;
}
function whiteAt() { return 0; }
const _v = new THREE.Vector3();
// pose de un aspirante (local del ring): x, y, giro, escala
function champ(t, side) {      // side −1 = chip (izquierda), +1 = código (derecha)
  const ph = side < 0 ? 0 : 1.7, bob = 0.018 * lsin(t, 2.4, ph), shake = Math.exp(-Math.max(0, t - K.ninguna) * 5) * (t > K.ninguna ? 1 : 0) * 0.02 * Math.sin(t * 70 + ph);
  let x = side * 0.25, y = RING_H + 0.34 + bob, ry = -side * 0.42, s = 0.85;
  const apart = win(t, K.pelea - 0.6, 0.6) * (1 - win(t, END - 1.4, 0.9)); x += side * 0.2 * apart; ry = lerp(ry, -side * 0.2, apart);
  if (side < 0 && t > K.vosotros3 && t < K.dentro + 0.3) { s = 1 + 0.06 * voice(t); }
  if (side > 0 && t > K.solo && t < K.nosotros3 + 0.4) { s = 1 - 0.18 * win(t, K.solo, 0.25) * (1 - win(t, K.nosotros3, 0.35)); }
  if (side > 0 && t > K.software14 - 0.1) { const k = env(t, K.software14 - 0.05, K.informatica14, 0.15, 0.3); y += 0.08 * k; s += 0.12 * k; }
  if (side < 0 && t > K.informatica14 - 0.1) { const k = env(t, K.informatica14 - 0.05, K.comentarios, 0.15, 0.3); y += 0.08 * k; s += 0.12 * k; }
  return { x: x + shake, y, ry, s };
}
// oscilación de bucle (en t = END igual que en t = 0)
const lfreq = f => 2 * Math.PI * Math.max(1, Math.round(f * END / (2 * Math.PI))) / END, lsin = (t, f, ph = 0) => Math.sin(t * lfreq(f) + ph);
function ringAt(t) {
  // ---- aspirantes y guantes
  const C = champ(t, -1), D = champ(t, 1);
  // el bloque de código entra en el chip («una es parte de la otra») y vuelve a su esquina
  const into = win(t, K.parte - 0.05, 0.42) * (1 - win(t, K.y2 + 0.02, 0.4));
  const r5k = pop(t, K.una1 - 0.05, 0.4) * (1 - win(t, K.y2 + 0.15, 0.35));
  S.chip.position.set(C.x, C.y, 0); S.chip.rotation.set(0, C.ry, 0); S.chip.scale.setScalar(C.s);
  S.chip.userData.die.material.emissiveIntensity = 0.9 + 1.2 * (t > K.dicen3 - 0.2 && t < K.dentro + 0.3 ? voice(t) : 0) + 0.8 * env(t, K.informatica14 - 0.05, K.comentarios, 0.15, 0.3);
  S.ring5.G.visible = r5k > 0.01; S.ring5.G.position.set(C.x, C.y, 0.06); S.ring5.G.rotation.set(0, C.ry, 0); S.ring5.G.scale.setScalar(0.55 * Math.max(0.001, r5k));
  const sec = S.ring5.parts[2], am = sec.userData.am, slot = v3(Math.cos(am) * 0.31 * 0.55, Math.sin(am) * 0.31 * 0.55, 0.05).applyAxisAngle(v3(0, 1, 0), C.ry).add(v3(C.x, C.y, 0.06));
  const home = v3(D.x, D.y, 0); S.code.position.copy(home).lerp(slot, sm5(into)); S.code.rotation.set(0, lerp(D.ry, C.ry, into), 0); S.code.scale.setScalar(D.s * lerp(1, 0.34, sm5(into)));
  const punch = (t0, len = 0.28) => { const u = (t - t0) / len; return u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0; };
  const jab = (side, k) => { const per = 0.85, ph = side < 0 ? 0 : 0.42, u = ((t + ph) % per) / per; return (u < 0.28 ? Math.sin(u / 0.28 * Math.PI) : 0) * k; };
  const fight = 1 - win(t, K.una1 - 0.3, 0.3) * (1 - win(t, K.y2 + 0.2, 0.3));      // cuando el código entra en el chip, se para la pelea
  const calm = (1 - win(t, K.dicen3 - 0.3, 0.4)) + win(t, K.pelea - 0.6, 0.6) * 0 + win(t, END - 1.6, 0.8);
  const clash = punch(K.rivales - 0.05, 0.3);
  const drop = env(t, K.ninguna, K.dicen3, 0.15, 0.4);
  [[S.glovesI, C, -1], [S.glovesS, D, 1]].forEach(([gl, P, side]) => {
    const show_ = 1 - sm5(into) * (side > 0 ? 1 : 0.85);
    gl.forEach((g, i) => { const lr = i ? 1 : -1, fwd = v3(-side, 0, 0).applyAxisAngle(v3(0, 1, 0), P.ry * 0.5);
      const ext = Math.max(clash * (i === 0 ? 1 : 0.4), jab(side, clamp(calm) * fight * (i === (side < 0 ? 0 : 1) ? 1 : 0.25)) * 0.9);
      const base = v3(P.x, P.y - 0.05 - 0.07 * drop, 0.12).add(v3(0, lr * 0.06, 0)).add(fwd.clone().multiplyScalar(0.1 + ext * 0.12));
      g.position.copy(base); g.visible = show_ > 0.02; g.scale.setScalar(Math.max(0.001, show_) * (P.s));
      g.lookAt(g.getWorldPosition(_v).add(fwd.clone().multiplyScalar(1)).add(v3(0, 0, 0.0))); g.rotation.z += lr * 0.3; });
  });
  // rayo entre los dos (pelea) y chispas al chocar
  const bk = fight * clamp(calm) * (0.55 + 0.45 * Math.max(clash, Math.abs(Math.sin(t * 13)))), A = v3(C.x + 0.11, C.y, 0.13), B = v3(D.x - 0.11, D.y, 0.13);
  [S.bolt, S.bolt2].forEach((L, li) => { L.visible = bk > 0.05 && into < 0.05; if (!L.visible) return; const n = 24, seed = Math.floor(t * 24) + li * 100; let prev = A.clone();
    for (let i = 1; i <= n; i++) { const u = i / n, p = A.clone().lerp(B, u); p.y += (hash(seed + i * 1.7) - 0.5) * 0.09 * Math.sin(u * Math.PI); p.z += (hash(seed + i * 3.1) - 0.5) * 0.06 * Math.sin(u * Math.PI); if (i === n) p.copy(B); L.userData.set(i - 1, prev, p); prev = p; }
    L.userData.flush(); L.material.opacity = bk * (li ? 0.8 : 1); });
  lookLab(S.lblI, env(t, -1, K.una1, 0.01, 0.3) + env(t, K.dicen3 - 0.2, K.programais, 0.3, 0.3) + env(t, K.informatica14 - 0.2, END - 1.2, 0.3, 0.3), v3(C.x, RING_H + 0.1, 0.25)); S.lblI.scale.setScalar(1);
  lookLab(S.lblS, env(t, -1, K.una1, 0.01, 0.3) + env(t, K.software14 - 0.2, END - 1.2, 0.3, 0.3), v3(D.x, RING_H + 0.1, 0.25));
  // ---- el BOE cae en medio; la «?» encima en «la ley»
  const bt = K.boe1 - 0.25, bu = clamp((t - bt) / 0.4), gone = win(t, K.dicen3 - 0.4, 0.4);
  S.boe.G.visible = t > bt && gone < 0.99; S.boe.G.position.set(-0.13 * 0.62 * 0 - 0.13, RING_H + 0.002 + 1.6 * (1 - bu * bu) + 0.02 * Math.exp(-Math.max(0, t - bt - 0.4) * 9) * Math.sin((t - bt) * 40) + 0.8 * gone * gone, 0.1);
  S.boe.G.rotation.set(0, 0.25 * (1 - bu), 0); S.boe.hinge.rotation.z = -Math.PI; S.boe.G.scale.setScalar(0.62 * Math.max(0.001, 1 - gone));
  const qk = pop(t, K.ley2 - 0.05, 0.4) * (1 - win(t, K.dicen3 - 0.3, 0.3)); S.qm.visible = qk > 0.01; S.qm.position.set(0, RING_H + 0.36 + 0.02 * Math.sin(t * 3), 0.1); S.qm.rotation.y = 0.4 * Math.sin(t * 1.3); S.qm.scale.setScalar(0.42 * Math.max(0.001, qk));
  // ---- final: quien sabe hacerlo (con el portátil) y el cinturón; todo se va antes del último fotograma
  const ck = pop(t, K.pelea - 0.3, 0.4) * (1 - win(t, END - 1.25, 0.4));
  S.coder.visible = ck > 0.01; S.coder.scale.setScalar(Math.max(0.001, ck)); S.coder.position.y = 0;
  if (S.coder.visible) { const J = S.doll.userData.J; J.shL.rotation.x = J.shR.rotation.x = -1.1; J.elL.rotation.x = J.elR.rotation.x = -0.4 + 0.08 * Math.sin(t * 22); J.hpL.rotation.x = J.hpR.rotation.x = -1.4; J.knL.rotation.x = J.knR.rotation.x = 1.4; J.neck.rotation.x = 0.25;
    const up = win(t, K.hacerlo - 0.15, 0.35); J.shL.rotation.x = J.shR.rotation.x = lerp(-1.1, -2.9, up); J.elL.rotation.x = J.elR.rotation.x = lerp(-0.4 + 0.08 * Math.sin(t * 22), -0.3, up);
    drawScreen(S.lap.scrT, clamp((t - K.pelea) / 2.4), t > K.hacerlo - 0.2); }
  const bl = clamp((t - (K.quien - 0.1)) / 0.75), be = 1 - Math.pow(1 - bl, 3), beltOn = t > K.quien - 0.1 && ck > 0.01;
  S.belt.visible = beltOn; if (beltOn) { const above = v3(0, RING_H + 0.66, -0.14); S.belt.position.copy(above).add(v3(0, 0.9 * (1 - be), 0)); S.belt.rotation.set(0.25, (1 - be) * 4 + 0.3 * Math.sin(t * 1.5), 0); S.belt.scale.setScalar(0.62 * ck * (bl >= 1 ? 1 + 0.08 * Math.exp(-(t - K.hacerlo) * 8) * Math.sin((t - K.hacerlo) * 30) : 1)); }
}
// ---------------------------------------------------------------- C · el ordenador: se abre en despiece en «por dentro» y vuelve a montarse con «montar»
function pcAt(t) {
  const G = S.pc, on = t > K.dicen3 && t < K.construimos + 0.3; G.visible = on; if (!on) return;
  const ex = win(t, K.por3 - 0.05, 0.45) * (1 - win(t, K.montar - 0.05, 0.6));
  G.userData.parts.forEach((p, i) => { const k = sm5(clamp(ex * 1.25 - i * 0.05)); p.position.copy(p.userData.home).addScaledVector(p.userData.off, k); p.rotation.set(0.25 * k * (i % 2 ? 1 : -1), 0.4 * k * (i % 3 - 1), 0); });
  setOp(G.userData.caseG, 1 - 0.75 * ex); G.userData.glass.position.z = 0.2 + 0.5 * ex; G.userData.glass.position.y = 0.31 + 0.25 * ex; G.userData.glass.rotation.x = -0.6 * ex; G.userData.glass.material.opacity = 0.16 * (1 - clamp(ex * 3)); G.userData.glass.visible = ex < 0.33; if (G.userData.glass.userData.edges) G.userData.glass.userData.edges.material.opacity = 0.8 * (1 - clamp(ex * 3));
}
// ---------------------------------------------------------------- D · el código se compila en una app, la app entra en el móvil y el móvil se multiplica
function phonesAt(t) {
  const G = S.ph, on = t > K.ordenador4 - 0.3 && t < K.generalista + 0.4; G.visible = on; if (!on) return; const U = G.userData;
  drawTerm(U.tT, clamp((t - (K.nosotros4 - 0.4)) / 1.0));
  const ak = pop(t, K.construimos + 0.25, 0.3), am = sm5(clamp((t - (K.programas + 0.1)) / 0.45));
  U.app.visible = ak > 0.01 && am < 1; U.app.position.copy(v3(0, 0.95, 0.04).lerp(v3(0, 0.44, 0.12), am)); U.app.scale.setScalar(Math.max(0.001, ak) * (1 - 0.6 * am)); U.app.rotation.y = 0.5 * Math.sin(t * 3);
  const pk = pop(t, K.programas - 0.05, 0.35); U.phone.visible = pk > 0.01; U.phone.scale.setScalar(Math.max(0.001, pk)); U.phone.rotation.y = 0.15 * Math.sin(t * 1.2);
  // el mar de móviles: se enciende en ola desde el móvil hacia el ring
  const sk = clamp((t - (K.millones - 0.25)) / 0.9); U.sea.visible = sk > 0.001;
  if (U.sea.visible) { U.pos.forEach(([x, y, z, h], i) => { const d = Math.hypot(x, z - 0.25), k = clamp(sk * 3.2 - d * 0.9 - h * 0.3); _p.set(x, y + 0.0, z); _q.setFromEuler(_e.set(-Math.PI / 2, 0, (h - 0.5) * 0.3)); _s.setScalar(Math.max(0.0001, sm5(k))); _m4.compose(_p, _q, _s); U.sea.setMatrixAt(i, _m4); }); U.sea.instanceMatrix.needsUpdate = true; }
}
// ---------------------------------------------------------------- E · la generalista: las 5 ramas salen del chip, una por palabra
function hubAt(t) {
  const G = S.hub, on = t > K.generalista - 1.2 && t < K.grano + 0.3; G.visible = on; if (!on) return; const U = G.userData;
  const ws = [K.circuitos, K.redes, K.sistemas, K.inteligencia, K.software5];
  U.chip.userData.die.material.emissiveIntensity = 0.9 + 0.6 * voice(t);
  U.sats.forEach((s, i) => { const k = pop(t, ws[i] - 0.05, 0.4), from = v3(0, 0.72, 0.06); s.visible = k > 0.01; s.scale.setScalar(Math.max(0.001, k) * (i === 4 ? 1 + 0.15 * env(t, ws[4], ws[4] + 0.8, 0.1, 0.4) : 1)); s.position.copy(from).lerp(v3(U.at[i][0], U.at[i][1], 0.05), sm5(clamp((t - ws[i] + 0.05) / 0.35))); s.rotation.y = 0.25 * Math.sin(t * 1.4 + i);
    U.links.userData.set(i, from, s.position); });
  U.links.userData.flush(); U.links.material.opacity = 0.8;
}
// ---------------------------------------------------------------- F · requisitos ✓, arquitectura, pruebas en verde y versiones que salen del ciclo
function pipeAt(t) {
  const G = S.pipe, on = t > K.software6 - 0.4 && t < K.politecnica + 0.3; G.visible = on; if (!on) return; const U = G.userData;
  const rk = pop(t, K.requisitos - 0.05, 0.35); U.req.scale.setScalar(Math.max(0.001, rk)); drawReq(U.reqT, Math.floor(clamp((t - K.requisitos) / 0.6) * 3.01));
  const ak = pop(t, K.arquitectura - 0.05, 0.35); U.arch.scale.setScalar(Math.max(0.001, ak));
  const hub = U.boxes[3].position; U.boxes.forEach((b, i) => { if (i < 3) { const k = sm5(clamp((t - K.arquitectura - i * 0.1) / 0.3)); b.position.y = [0.06, 0.06, -0.06][i] + 0.12 * (1 - k); U.archL.userData.set(i, b.position, hub); } });
  U.archL.userData.set(3, U.boxes[0].position, U.boxes[1].position); U.archL.userData.flush(); U.archL.material.opacity = 0.9 * clamp((t - K.arquitectura - 0.25) / 0.3);
  const tk = pop(t, K.pruebas - 0.05, 0.35); U.tests.scale.setScalar(Math.max(0.001, tk)); drawTests(U.testT, Math.floor(clamp((t - K.pruebas) / 0.7) * 5.01));
  const lk = pop(t, K.equipos - 0.05, 0.35); U.loop.scale.setScalar(Math.max(0.001, lk)); U.loop.rotation.z = -Math.max(0, t - K.equipos) * 5.5;
  U.vers.forEach((v, i) => { const t0 = K.entregan + i * 0.42, u = clamp((t - t0) / 0.9); v.visible = t > t0 && u < 1; v.position.set(0.12 + u * 0.32, 0.24 + u * 0.25, 0.02); v.material.opacity = 1 - u * u; v.scale.setScalar(0.9 + 0.3 * eo(clamp(u * 3))); lookLab(v, 1 - u * u, null); });
}
// ---------------------------------------------------------------- G · el marcador: las dos barras suben a su nota; casi iguales
function scoreAt(t) {
  const G = S.score, on = t > K.politecnica - 0.5 && t < K.boe8 + 0.3; G.visible = on; if (!on) return; const U = G.userData;
  const v1 = 10.175 * eo(clamp((t - (K.n1 - 0.25)) / 1.2)), v2 = 10.036 * eo(clamp((t - (K.n2 - 0.25)) / 1.2));
  [v1, v2].forEach((v, i) => { const b = U.bars[i]; b.visible = v > 0.01; b.scale.y = Math.max(0.001, v * SC_K); b.position.y = 0.05 + v * SC_K / 2; });
  U.names.forEach(n => lookLab(n, 1, null)); lookLab(U.uni, win(t, K.politecnica, 0.4), null);
}
// ---------------------------------------------------------------- H · el BOE se abre y sale el anillo de las 5 especialidades; la del software se separa
function specAt(t) {
  const G = S.spec, on = t > K.boe8 - 0.6 && t < K.mitad + 0.3; G.visible = on; if (!on) return; const U = G.userData;
  U.book.hinge.rotation.z = -Math.PI * (1 - win(t, K.boe8 + 0.1, 0.5));
  const rk = pop(t, K.cinco - 0.05, 0.45); U.r5.G.visible = rk > 0.01; U.r5.G.scale.setScalar(1.15 * Math.max(0.001, rk)); U.r5.G.position.y = 1.08 + 0.05 * Math.sin(t * 1.5); U.r5.G.rotation.z = 0.1 * Math.sin(t * 0.7);
  const out = win(t, K.especialidades + 0.2, 0.4), sec = U.r5.parts[2]; sec.position.set(Math.cos(sec.userData.am) * 0.09 * out, Math.sin(sec.userData.am) * 0.09 * out, 0.06 * out);
  sec.material.emissiveIntensity = 0.55 + 0.6 * out;
}
// ---------------------------------------------------------------- I · los créditos: 12 cubos iguales en las dos columnas; luego los 5 de la especialidad (≈ 48)
function credAt(t) {
  const G = S.cred, on = t > K.mitad - 0.6 && t < K.ley10 + 0.2; G.visible = on; if (!on) return; const U = G.userData;
  U.cols.forEach((cubes, ci) => cubes.forEach((c, i) => { const t0 = i < 12 ? K.mitad - 0.1 + i * 0.05 : i < 17 ? K.n48 - 0.1 + (i - 12) * 0.07 : K.especialidad9 + (i - 17) * 0.04, k = pop(t, t0, 0.3); c.visible = k > 0.01; c.scale.setScalar(Math.max(0.001, k)); c.position.y = 0.023 + i * 0.047 + 0.15 * (1 - clamp((t - t0) / 0.25)); }));
  const bk = win(t, K.misma - 0.05, 0.35), x0 = 0.24, y0 = 0.0, y1 = 12 * 0.047;
  U.brace.userData.set(0, v3(x0, y0 + 0.01, 0.07), v3(x0 + 0.03, y0 + 0.01, 0.07)); U.brace.userData.set(1, v3(x0 + 0.03, y0 + 0.01, 0.07), v3(x0 + 0.03, y1, 0.07)); U.brace.userData.set(2, v3(x0 + 0.03, y1, 0.07), v3(x0, y1, 0.07)); U.brace.userData.flush(); U.brace.material.opacity = 0.9 * bk; U.brace.visible = bk > 0.01;
  lookLab(U.lbBase, bk, v3(0.0, y1 / 2, 0.12)); lookLab(U.lb48, win(t, K.n48 + 0.1, 0.3), v3(0.0, 0.023 + 14.5 * 0.047, 0.12));
}
// ---------------------------------------------------------------- J · la ley en blanco; los títulos que se van; el portátil que compila; «ni un título, ni un colegio»
function lawAt(t) {
  const G = S.law, on = t > K.ley10 - 0.7 && t < K.pelea + 0.2; G.visible = on; if (!on) return; const U = G.userData;
  const lawK = 1 - win(t, K.profesion - 0.5, 0.35); U.law.G.visible = lawK > 0.01; U.law.G.scale.setScalar(Math.max(0.001, lawK)); U.law.G.position.set(-0.2, 0.0, 0.0);
  U.law.hinge.rotation.z = -Math.PI * (1 - win(t, K.programar10 - 0.1, 0.55));
  const mid = env(t, K.profesion - 0.35, K.titulo12 - 0.1, 0.3, 0.25);
  U.lap.G.visible = mid > 0.01; U.lap.G.position.set(0, 0.0, 0.05); U.lap.G.scale.setScalar(1.2 * Math.max(0.001, mid)); drawScreen(U.lap.scrT, clamp((t - K.profesion) / 3.2), t > K.otra11 - 0.4);
  U.scrolls.forEach((s, i) => { const tg = i === 0 ? K.una11 : K.otra11, fly = clamp((t - tg) / 0.6); s.visible = mid > 0.01 && fly < 1; s.position.set((i ? 0.09 : -0.09) + (i ? 1 : -1) * fly * 0.6, (i ? 0.5 : 0.64) + fly * 0.9 + 0.02 * Math.sin(t * 2 + i), 0.08); s.rotation.set(0, 0, (i ? -1 : 1) * fly * 2); s.scale.setScalar(Math.max(0.001, mid) * (1 - fly * 0.5)); });
  const tk = pop(t, K.titulo12 - 0.15, 0.3) * (1 - win(t, K.pelea - 0.3, 0.3)); U.title.visible = tk > 0.01; U.title.position.set(-0.15, 0.45, 0.1); U.title.scale.setScalar(Math.max(0.001, tk)); U.title.rotation.y = 0.15;
  const ck = pop(t, K.colegio - 0.2, 0.3) * (1 - win(t, K.pelea - 0.3, 0.3)); U.college.visible = ck > 0.01; U.college.position.set(0.17, 0.18, 0.06); U.college.scale.setScalar(Math.max(0.001, ck)); U.college.rotation.y = -0.2;
  [[U.xs[0], K.titulo12 + 0.05, v3(-0.15, 0.45, 0.13)], [U.xs[1], K.colegio + 0.05, v3(0.17, 0.32, 0.14)]].forEach(([x, t0, p]) => { const k = pop(t, t0, 0.22) * (1 - win(t, K.pelea - 0.3, 0.3)); x.visible = k > 0.01; x.position.copy(p); x.scale.setScalar(Math.max(0.001, k) * (1 + 0.4 * (1 - clamp((t - t0) / 0.15)))); x.material.opacity = clamp(k * 2); });
}
const _sunD = new THREE.Vector3();
function stageAt(t, st) {
  NOW = t;
  ringAt(t); pcAt(t); phonesAt(t); hubAt(t); pipeAt(t); scoreAt(t); specAt(t); credAt(t); lawAt(t);
  // luces alrededor de lo que mira la cámara (la principal del lado de la cámara)
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 6, 0.22, 1.2);
  rigAt(c, yaw, k, 1.2);
  const R = S.rig; R.sun.intensity = 0.0; R.hemi.intensity = 0.08;
  S.gridM.uniforms.camP.value.copy(st.p);
}
// ---------------------------------------------------------------- cámara: el ring de frente → alrededor del círculo de estaciones (por fuera, mirando hacia dentro) → vuelta al ring.
// Sin cortes: todo es un vuelo continuo (flujo óptico). El último fotograma es el primero (bucle).
let CK = [], CUTS = [];
const stCam = (a, dist, h, dx = 0) => { const p = stP(a, dist, h).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const stLook = (a, y, dx = 0, r = R_ST) => { const p = stP(a, r, y).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
function buildCam() {
  const { C, D, E, F, G, H, I, J } = ANG, T0 = [0.08, 0.62, 2.85], L0 = [0, 0.5, 0], TA = [0.14, 0.64, 2.98];
  CK = [
    [-1.0, TA, L0, 32], [0.0, T0, L0, 32],
    [K.rivales, [0.0, 0.58, 2.45], [0, 0.48, 0], 32],                                                  // choque de guantes
    [K.boe1 - 0.25, [0.0, 0.95, 2.45], [0, 0.42, 0], 33],                                             // cae el BOE
    [K.parte + 0.1, [-0.25, 0.62, 1.75], [-0.3, 0.5, 0], 31], [K.otra + 0.2, [-0.18, 0.62, 1.9], [-0.25, 0.5, 0], 31],   // el código entra en el chip
    [K.final2, [0.0, 0.85, 2.3], [0, 0.5, 0], 33], [K.ley2 + 0.2, [0.0, 0.95, 2.0], [0, 0.6, 0], 33], [K.ninguna + 0.1, [0.0, 0.8, 2.3], [0, 0.5, 0], 33],
    [K.dicen3, [-0.55, 0.66, 1.95], [-0.3, 0.52, 0], 32], [K.solo + 0.1, [-0.45, 0.62, 1.8], [-0.05, 0.5, 0], 32],
    [K.funciona, stCam(C, R_CAM + 0.4, 1.3), stLook(C, 0.5), 34], [K.ordenador3 + 0.2, stCam(C, R_CAM - 0.7, 0.9), stLook(C, 0.38), 34],
    [K.dentro + 0.3, stCam(C, R_CAM - 0.6, 0.95, 0.05), stLook(C, 0.42, 0.0, R_ST + 0.4), 38],
    [K.vosotros4, stCam(C, R_CAM - 0.6, 0.92), stLook(C, 0.4, 0, R_ST + 0.3), 37], [K.ordenador4 + 0.1, stCam(C, R_CAM - 0.2, 0.95), stLook(C, 0.36), 34],
    [K.construimos, stCam(D, R_CAM - 0.3, 1.1), stLook(D, 0.82), 34], [K.programas + 0.3, stCam(D, R_CAM - 0.8, 0.8), stLook(D, 0.5), 34],
    [K.millones + 0.45, stCam(D, R_CAM + 0.7, 2.3), stLook(D, 0.0, 0, R_ST - 1.0), 40],
    [K.generalista, stCam(E, R_CAM + 0.4, 1.3), stLook(E, 0.85), 36], [K.circuitos, stCam(E, R_CAM - 0.05, 1.0), stLook(E, 0.85), 35], [K.software5 + 0.3, stCam(E, R_CAM + 0.1, 1.05), stLook(E, 0.86), 35],
    [K.grano, stCam(F, R_CAM - 0.3, 1.45), stLook(F, 1.2), 34], [K.arquitectura + 0.1, stCam(F, R_CAM - 0.4, 1.2), stLook(F, 0.95), 34], [K.pruebas + 0.1, stCam(F, R_CAM - 0.4, 0.9), stLook(F, 0.6), 34],
    [K.entregan, stCam(F, R_CAM - 0.25, 0.75), stLook(F, 0.4), 34], [K.semanas + 0.3, stCam(F, R_CAM + 0.2, 0.95), stLook(F, 0.7), 36],
    [K.y2025, stCam(G, R_CAM + 0.3, 1.0), stLook(G, 0.7), 36], [K.n1 - 0.2, stCam(G, R_CAM - 0.1, 0.9), stLook(G, 0.6), 34], [K.ni7 - 0.2, stCam(G, R_CAM - 0.2, 1.05), stLook(G, 0.85), 34],
    [K.decimas + 0.35, stCam(G, R_CAM - 1.0, 0.95, 0.01), stLook(G, 0.9, 0.01), 31],
    [K.boe8 + 0.1, stCam(H, R_CAM + 0.2, 1.1), stLook(H, 0.8), 36], [K.cinco, stCam(H, R_CAM - 0.2, 1.05), stLook(H, 0.95), 34], [K.informatica8 + 0.3, stCam(H, R_CAM - 0.5, 1.1), stLook(H, 1.05), 33],
    [K.mitad + 0.2, stCam(I, R_CAM + 0.1, 0.8), stLook(I, 0.55), 35], [K.n48, stCam(I, R_CAM - 0.2, 0.9), stLook(I, 0.65), 34], [K.especialidad9 + 0.4, stCam(I, R_CAM - 0.3, 0.95), stLook(I, 0.7), 34],
    [K.ley10 + 0.1, stCam(J, R_CAM - 0.7, 1.05), stLook(J, 0.08), 34], [K.nada + 0.3, stCam(J, R_CAM - 0.95, 1.05), stLook(J, 0.04, -0.05), 34],
    [K.profesion, stCam(J, R_CAM - 0.7, 0.85), stLook(J, 0.42), 34], [K.otra11 + 0.2, stCam(J, R_CAM - 0.6, 0.9), stLook(J, 0.48), 34],
    [K.titulo12 + 0.1, stCam(J, R_CAM - 0.8, 0.75), stLook(J, 0.42, -0.1), 34], [K.colegio + 0.15, stCam(J, R_CAM - 0.8, 0.72), stLook(J, 0.3, 0.12), 34],
    [K.pelea + 0.2, [0.45, 1.2, 3.0], [0, 0.45, 0], 34], [K.quien, [0.2, 0.72, 1.6], [0, 0.42, 0], 33], [K.hacerlo + 0.2, [0.12, 0.64, 1.38], [0, 0.42, 0], 32],
    [K.software14 + 0.1, [0.2, 0.7, 2.2], [0.12, 0.48, 0], 33], [K.informatica14 + 0.1, [-0.2, 0.7, 2.2], [-0.12, 0.48, 0], 33], [K.comentarios + 0.2, [0.0, 0.8, 2.6], [0, 0.5, 0], 33],
    [END - 1.0, TA, L0, 32], [END, T0, L0, 32],
  ];
}
function camAt(t) { return camKeys(t, CK); }
function prevT(t, dt) { return t - dt; }
// ---------------------------------------------------------------- rótulos 2D (solo los que ayudan a leer): piezas del ordenador, las notas que suben y la diferencia
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
function hudAt(t) {
  hudBegin();
  // despiece del ordenador
  if (S.pc.visible) { const k = win(t, K.por3 + 0.25, 0.3) * (1 - win(t, K.montar - 0.2, 0.3));
    if (k > 0.01) S.pc.userData.parts.forEach((p, i) => { const pos = wpos(p); callout(pos, p.userData.name, null, clamp(k * 1.3 - i * 0.06), { dx: i % 2 ? 110 : -110, dy: -60 - (i % 3) * 40, size: 24, bg: true, color: i === 1 ? HC.teal : HC.white }); }); }
  // «millones»
  if (S.ph.visible) { const k = win(t, K.millones + 0.1, 0.3); if (k > 0.01) bigText('MILLONES DE USUARIOS', W / 2, 1480, 46, HC.amber, k, { glow: 18 }); }
  // las notas de corte que suben y la diferencia
  if (S.score.visible) {
    const U = S.score.userData, v1 = 10.175 * eo(clamp((t - (K.n1 - 0.25)) / 1.2)), v2 = 10.036 * eo(clamp((t - (K.n2 - 0.25)) / 1.2));
    [[v1, 0, HC.teal], [v2, 1, HC.amber]].forEach(([v, i, col]) => { if (v < 0.05) return; const b = U.bars[i], top = wpo(S.score, b.position.x, 0.05 + v * SC_K + 0.06, 0.06), P = proj(top);
      if (!P.ok) return; hg.save(); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '2px'; hfont(40); hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 10; hg.fillStyle = col; hg.fillText(v.toFixed(3).replace('.', ','), P.x, P.y); hg.restore(); });
    const gk = win(t, K.ni7 - 0.05, 0.35);
    if (gk > 0.01) { const a = proj(wpo(S.score, 0.01, 0.05 + 10.175 * SC_K, 0.07)), b = proj(wpo(S.score, 0.01, 0.05 + 10.036 * SC_K, 0.07)); dimV(a, b, '0,139', gk, HC.white, 0); }
  }
}
// ---------------------------------------------------------------- un fotograma
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3();
function frame(t) {
  placeCam(camAt(prevT(t, 1 / 60))); const prevVP = vpOf();
  placeCam(camAt(prevT(t, 1 / 36))); const PVP = vpOf();
  const st = camAt(t); placeCam(st); const VP = vpOf();
  stageAt(t, st); flowUpdate(t, VP, PVP); fxUpdate(t, VP, PVP);
  const d = Math.max(0.05, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _rt.setFromMatrixColumn(cam.matrixWorld, 0); _up.setFromMatrixColumn(cam.matrixWorld, 1);
  const P0 = cam.position.clone().addScaledVector(_fw, d), Px = P0.clone().addScaledVector(_rt, d * 0.4), Py = P0.clone().addScaledVector(_up, d * 0.4);
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
// portada: el cara a cara en el ring (sin HUD)
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : 0.4; frame(t);
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
    crees: atL(1, 'crees'), software1: atL(1, 'software'), informatica1: atL(1, 'informatica'), rivales: atL(1, 'rivales'), realidad: atL(1, 'realidad'), boe1: atL(1, 'boe'), una1: atL(1, '=una'), parte: atL(1, 'parte'), otra: atL(1, 'otra'),
    y2: atL(2, '=y'), final2: atL(2, 'final'), ley2: atL(2, 'ley'), gustar: atL(2, 'gustar'), ninguna: atL(2, 'ninguna'),
    dicen3: atL(3, 'dicen'), vosotros3: atL(3, 'vosotros'), solo: atL(3, 'solo'), programais: atL(3, 'programais'), nosotros3: atL(3, 'nosotros'), funciona: atL(3, 'funciona'), ordenador3: atL(3, 'ordenador'), por3: atL(3, '=por'), dentro: atL(3, 'dentro'),
    responden: atL(4, 'responden'), vosotros4: atL(4, 'vosotros'), montar: atL(4, 'montar'), ordenador4: atL(4, 'ordenador'), nosotros4: atL(4, 'nosotros'), construimos: atL(4, 'construimos'), programas: atL(4, 'programas'), millones: atL(4, 'millones'),
    generalista: atL(5, 'generalista'), circuitos: atL(5, 'circuitos'), redes: atL(5, 'redes'), sistemas: atL(5, 'sistemas'), inteligencia: atL(5, 'inteligencia'), software5: atL(5, 'software'),
    software6: atL(6, 'software'), grano: atL(6, 'grano'), requisitos: atL(6, 'requisitos'), arquitectura: atL(6, 'arquitectura'), pruebas: atL(6, 'pruebas'), equipos: atL(6, 'equipos'), entregan: atL(6, 'entregan'), semanas: atL(6, 'semanas'),
    politecnica: atL(7, 'politecnica'), y2025: atL(7, '2025'), informatica7: atL(7, 'informatica'), n1: atL(7, '10175'), software7: atL(7, 'software'), n2: atL(7, '10036'), ni7: atL(7, '=ni'), decimas: atL(7, 'decimas'),
    boe8: atL(8, 'boe'), cinco: atL(8, 'cinco'), especialidades: atL(8, 'especialidades'), informatica8: atL(8, 'informatica'),
    mitad: atL(9, 'mitad'), misma: atL(9, 'misma'), cambian: atL(9, 'cambian'), n48: atL(9, '48'), especialidad9: atL(9, 'especialidad'),
    ley10: atL(10, 'ley'), programar10: atL(10, 'programar'), nada: atL(10, 'nada'),
    profesion: atL(11, 'profesion'), regulada: atL(11, 'regulada'), programar11: atL(11, 'programar'), una11: atL(11, '=una', 2), otra11: atL(11, '=otra'),
    titulo12: atL(12, 'titulo'), colegio: atL(12, 'colegio'),
    pelea: atL(13, 'pelea'), titulo13: atL(13, 'titulo'), quien: atL(13, 'quien'), hacerlo: atL(13, 'hacerlo'),
    software14: atL(14, 'software'), informatica14: atL(14, 'informatica'), comentarios: atL(14, 'comentarios'), mandaselo: atL(14, 'mandaselo'), informatico: atL(14, 'informatico'),
  };
  mats(); buildRig(); buildFloor(); buildFlow();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45; }
  buildRing(); buildPC(); buildPhones(); buildHub(); buildPipe(); buildScore(); buildSpec(); buildCredits(); buildLaw();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
