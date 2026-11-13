// «El jefe de Nvidia dimite» (estilo del vídeo de Derecho: sala oscura de museo, pedestales de madera con su haz de luz y objetos reales): una alianza
// gigante cae sobre un chip y lo parte, la silla vacía se va, la vitrina con la investigación, los 33 años, la carta, el consejo, la bolsa, el expediente
// del espionaje con las dos relaciones (atribuidas) y la balanza de la pregunta.
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
// para «El jefe de Nvidia dimite». Las estaciones están en un círculo de radio R_ST.
const R_ST = 8.0, R_CAM = 10.6;
const ANG = { D: 30, C: 78, K: 128, P: 178, B: 232 };       // estaciones: 33 años (L3), la carta y la dimisión (L4–L5), la bolsa (L6), el expediente (L7–L8), la balanza (L9)
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
// ---------------------------------------------------------------- objetos de «El jefe de Nvidia dimite» (escala real: 1 unidad = 1 m; las piezas del centro, gigantes):
// la alianza, el chip que se parte, la silla de director, el calendario de años, la placa de su mesa, la carta, el documento del consejo, la campana,
// el panel de bolsa, el expediente con el micrófono, las siluetas (sin cara ni nombre) y el organigrama. Sin logotipos: Nvidia solo va escrito.
function billDraw(g, x, y, w, h) {
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#d6e2c6'); gr.addColorStop(1, '#b5c9a2'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.strokeStyle = '#2f6247'; g.lineWidth = Math.max(1, h * 0.04); g.strokeRect(x + h * 0.06, y + h * 0.06, w - h * 0.12, h - h * 0.12);
  g.beginPath(); g.ellipse(x + w * 0.62, y + h * 0.5, h * 0.3, h * 0.33, 0, 0, 7); g.fillStyle = 'rgba(47,98,71,.22)'; g.fill(); g.strokeStyle = 'rgba(47,98,71,.6)'; g.lineWidth = Math.max(1, h * 0.03); g.stroke();
  for (let r = 0.08; r < 0.3; r += 0.07) { g.beginPath(); g.ellipse(x + w * 0.62, y + h * 0.5, h * r, h * (r + 0.02), 0, 0, 7); g.stroke(); }
  g.fillStyle = '#2f6247'; g.font = `900 ${h * 0.24}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('100', x + w * 0.13, y + h * 0.2); g.fillText('100', x + w * 0.88, y + h * 0.8);
  g.fillStyle = 'rgba(47,98,71,.2)'; for (let i = 0; i < 5; i++) g.fillRect(x + w * 0.08, y + h * (0.36 + i * 0.08), w * 0.24, h * 0.02);
}
let BUNDLE_M = null;
function bundleMats() {
  if (BUNDLE_M) return BUNDLE_M;
  const band = (g, w, h, vertical) => { g.fillStyle = '#d9c27a'; if (vertical) g.fillRect(w * 0.45, 0, w * 0.1, h); else g.fillRect(0, h * 0.45, w, h * 0.1); g.fillStyle = 'rgba(120,80,20,.35)'; if (vertical) { g.fillRect(w * 0.42, 0, 2, h); g.fillRect(w * 0.58 - 2, 0, 2, h); } };
  const top = canvasTex(512, 220, (g, w, h) => { billDraw(g, 0, 0, w, h); band(g, w, h, true); });
  const edge = (long) => canvasTex(512, 48, (g, w, h) => { g.fillStyle = '#bfd1ac'; g.fillRect(0, 0, w, h); for (let y = 1; y < h; y += 2.1) { g.fillStyle = `rgba(30,62,40,${0.18 + hash(y * 3) * 0.22})`; g.fillRect(0, y, w, 0.9); } if (long) { g.fillStyle = '#d9c27a'; g.fillRect(w * 0.45, 0, w * 0.1, h); g.fillStyle = 'rgba(110,80,30,.4)'; g.fillRect(w * 0.45, 0, 2, h); g.fillRect(w * 0.55 - 2, 0, 2, h); } });
  const mT = new THREE.MeshStandardMaterial({ map: top, roughness: 0.75 }), mL = new THREE.MeshStandardMaterial({ map: edge(true), roughness: 0.8 }), mS = new THREE.MeshStandardMaterial({ map: edge(false), roughness: 0.8 });
  BUNDLE_M = [mS, mS, mT, mT, mL, mL]; return BUNDLE_M;
}
const BUN = { w: 0.156, h: 0.012, d: 0.066 };          // un fajo de 100 billetes de 100
function bundleGeo() { return new THREE.BoxGeometry(BUN.w, BUN.h, BUN.d); }
// columna de fajos (instanciada): capas de 2 fajos cruzadas (como ladrillos); setN(k) enseña k capas (la última, cayendo)
function bundleColumn(maxLayers, s = 1) {
  const im = new THREE.InstancedMesh(bundleGeo(), bundleMats(), maxLayers * 2); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
  const g = new THREE.Group(); g.add(im); g.scale.setScalar(s); g.userData.s0 = s;
  const C = { g, im, k: -1, top: 0, setN(k, drop = 0.12) { k = Math.max(0, Math.min(maxLayers, k)); if (Math.abs(k - C.k) < 1e-4) return; C.k = k; const full = Math.floor(k), part = k - full; let c = 0;
      for (let l = 0; l < maxLayers; l++) for (let j = 0; j < 2; j++) { const on = l < full || (l === full && part > 0.02);
        if (!on) { im.setMatrixAt(c++, _zero4); continue; }
        const off = (j - 0.5) * (BUN.d + 0.002), y = BUN.h / 2 + l * BUN.h * 1.02 + (l === full ? (1 - part) * drop : 0);
        if (l % 2 === 0) _o4.position.set((hash(l * 7 + j) - 0.5) * 0.006, y, off); else _o4.position.set(off, y, (hash(l * 5 + j) - 0.5) * 0.006);
        _o4.rotation.set(0, (l % 2 ? Math.PI / 2 : 0) + (hash(l * 4 + j) - 0.5) * 0.05, 0); _o4.scale.setScalar(1); _o4.updateMatrix(); im.setMatrixAt(c++, _o4.matrix); }
      im.instanceMatrix.needsUpdate = true; C.top = (full + (part > 0.02 ? 1 : 0)) * BUN.h * 1.02; } };
  C.setN(0); return C;
}
const _o4 = new THREE.Object3D(), _zero4 = new THREE.Matrix4().makeScale(0, 0, 0);
// las caras de las bobinas pequeñas son espejos planos: al levantarse, alguna refleja el foco hacia la cámara y da un fogonazo de un
// fotograma (valor ≈ 30) que el resplandor convierte en una mancha blanca. Se limita su brillo por debajo del umbral del resplandor (1,7):
// el brillo normal no cambia y el reflejo se queda en un destello pequeño.
const capGlint = (m, c = 1.2) => { m.onBeforeCompile = sh => { const f = sh.fragmentShader.replace('#include <opaque_fragment>', `outgoingLight = min(outgoingLight, vec3(${c.toFixed(2)}));\n#include <opaque_fragment>`);
  if (f === sh.fragmentShader) console.error('ERROR capGlint: no encuentro opaque_fragment'); sh.fragmentShader = f; }; return m; };

// ---------- la alianza (de pie, en el plano x-y: la cámara la ve redonda desde +z)
function ringObj(R = 0.32, wd = 0.12, th = 0.05) {
  const ri = R - th, b = th * 0.32, prof = [[ri, -wd / 2 + 0.01], [R - b, -wd / 2], [R - b * 0.2, -wd / 2 + b * 0.9], [R + th * 0.06, 0], [R - b * 0.2, wd / 2 - b * 0.9], [R - b, wd / 2], [ri, wd / 2 - 0.01], [ri - th * 0.05, 0], [ri, -wd / 2 + 0.01]];
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffc865, metalness: 1, roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.15 }); capGlint(m, 2.2);
  const band = lathe(prof.map(([x, y]) => [x, y]), 96, m); band.rotation.x = Math.PI / 2;      // eje del anillo a lo largo de z
  const g = new THREE.Group(); g.add(band); g.userData = { R, wd }; return g;
}
// ---------- el chip gigante (encapsulado de una tarjeta gráfica genérico): dos mitades que se separan con el golpe
function chipTopTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#c9ced6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${hash(i * 1.7) * 0.06})`; g.fillRect(hash(i * 3.1) * w, hash(i * 5.3) * h, 2 + hash(i) * 30, 1); }
    g.strokeStyle = 'rgba(70,76,86,.55)'; g.lineWidth = 6; rr(g, 40, 40, w - 80, h - 80, 30); g.stroke();
    g.fillStyle = 'rgba(52,58,68,.85)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 210px Inter'; g.fillText('GPU', w / 2, h * 0.44);
    g.font = '700 54px DejaVuMono'; g.fillText('CHIP GRÁFICO · 2026', w / 2, h * 0.62);
    g.beginPath(); g.arc(120, h - 120, 26, 0, 7); g.fill();
  });
}
function chipSubTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#18202b'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(214,170,80,.55)'; g.lineWidth = 3;
    for (let i = 0; i < 160; i++) { const s = Math.floor(hash(i * 2.3) * 4), p = 40 + hash(i * 7.7) * (w - 80); g.beginPath();
      if (s === 0) { g.moveTo(p, 30); g.lineTo(p, 30 + 40 + hash(i) * 140); } else if (s === 1) { g.moveTo(p, h - 30); g.lineTo(p, h - 70 - hash(i) * 140); } else if (s === 2) { g.moveTo(30, p); g.lineTo(70 + hash(i) * 140, p); } else { g.moveTo(w - 30, p); g.lineTo(w - 70 - hash(i) * 140, p); } g.stroke(); }
    g.fillStyle = '#d9b25c'; for (let i = 0; i < 46; i++) { const p = 50 + i * ((w - 100) / 45); g.fillRect(p - 7, 8, 14, 22); g.fillRect(p - 7, h - 30, 14, 22); g.fillRect(8, p - 7, 22, 14); g.fillRect(w - 30, p - 7, 22, 14); }
  });
}
function uvPlane(w, h, u0, u1, v0, v1) { const p = new THREE.PlaneGeometry(w, h); const uv = p.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0)); return p; }
function chipObj(S0 = 0.9) {
  const sub = new THREE.MeshPhysicalMaterial({ map: chipSubTex(), roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 }), edge = new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.6 });
  const ihs = new THREE.MeshPhysicalMaterial({ map: chipTopTex(), metalness: 0.85, roughness: 0.32, clearcoat: 0.3 }); capGlint(ihs, 2.0);
  const ihsSide = new THREE.MeshStandardMaterial({ color: 0xb9bec7, metalness: 0.9, roughness: 0.35 });
  const T = 0.045, IH = 0.03, IW = S0 * 0.62, halves = [];
  for (const sd of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.x = sd * S0 / 2; const h = new THREE.Group(); h.position.x = -sd * S0 / 2; piv.add(h);
    const sb = mesh(new THREE.BoxGeometry(S0 / 2 - 0.004, T, S0), [edge, edge, sub, edge, edge, edge]); sb.position.set(sd * (S0 / 4 + 0.002), T / 2 + 0.012, 0);
    { const uvs = sb.geometry.attributes.uv; for (let i = 0; i < uvs.count; i++) { const f = Math.floor(i / 4); if (f === 2) uvs.setX(i, sd < 0 ? uvs.getX(i) * 0.5 : 0.5 + uvs.getX(i) * 0.5); } }
    h.add(sb);
    const ib = mesh(new THREE.BoxGeometry(IW / 2 - 0.004, IH, IW), ihsSide); ib.position.set(sd * (IW / 4 + 0.002), 0.012 + T + IH / 2, 0); h.add(ib);
    const it = mesh(uvPlane(IW / 2 - 0.004, IW, sd < 0 ? 0 : 0.5, sd < 0 ? 0.5 : 1, 0, 1), ihs, false); it.rotation.x = -Math.PI / 2; it.position.set(sd * (IW / 4 + 0.002), 0.012 + T + IH + 0.0008, 0); h.add(it);
    for (let i = 0; i < 26; i++) { const x = sd * (IW / 2 + 0.03 + hash(i * 3.3 + sd) * (S0 / 2 - IW / 2 - 0.07)), z = (hash(i * 7.1 + sd * 3) - 0.5) * S0 * 0.86; const c = mesh(new THREE.BoxGeometry(0.03, 0.014, 0.016), i % 3 ? M.ceramicD : M.brass); c.position.set(x, 0.012 + T + 0.007, z); c.rotation.y = hash(i) > 0.5 ? Math.PI / 2 : 0; h.add(c); }
    const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 8, 6), M.silver || M.steel, 14 * 28); let k = 0;
    for (let a = 0; a < 14; a++) for (let b = 0; b < 28; b++) { _o4.position.set(sd * (0.02 + a * 0.03), 0.007, -S0 / 2 + 0.03 + b * 0.031); _o4.rotation.set(0, 0, 0); _o4.scale.setScalar(1); _o4.updateMatrix(); balls.setMatrixAt(k++, _o4.matrix); }
    h.add(balls); halves.push(piv);
  }
  const g = grp(...halves); g.userData = { halves, S0, top: 0.012 + T + IH }; return g;
}
// ---------- silla de director (piel negra, base de cinco radios con ruedas)
function execChair(s = 1) {
  const g = new THREE.Group(), lea = M.leather(0x111215), alu = M.steel;
  const seat = rbox(0.5, 0.5, 0.09, lea, 0.04); seat.rotation.x = Math.PI / 2; seat.position.y = 0.5; g.add(seat);
  const back = rbox(0.48, 0.66, 0.09, lea, 0.05); back.position.set(0, 0.9, -0.24); back.rotation.x = -0.12; g.add(back);
  const head = rbox(0.34, 0.16, 0.08, lea, 0.04); head.position.set(0, 1.3, -0.29); head.rotation.x = -0.12; g.add(head);
  for (const sd of [-1, 1]) { const ar = rbox(0.06, 0.3, 0.05, lea, 0.02); ar.rotation.x = Math.PI / 2; ar.position.set(sd * 0.27, 0.68, -0.02); g.add(ar);
    g.add(bar(v3(sd * 0.27, 0.66, 0.06), v3(sd * 0.24, 0.52, 0.02), 0.012, alu)); }
  const post = cyl(0.025, 0.03, 0.36, alu, 20); post.position.y = 0.28; g.add(post);
  for (let i = 0; i < 5; i++) { const a = i * 1.2566, e = v3(Math.cos(a) * 0.32, 0.07, Math.sin(a) * 0.32); g.add(bar(v3(0, 0.11, 0), e, 0.016, alu)); const w = sph(0.03, M.black); w.position.set(e.x, 0.03, e.z); g.add(w); }
  g.scale.setScalar(s); g.userData.s0 = s; return g;
}
// ---------- calendario de taco con años (frase 3: de 1993 a 2026)
function yearCalendar() {
  const tex = canvasTex(400, 480, () => {}); const side = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.85 });
  const m = mesh(new THREE.BoxGeometry(0.13, 0.155, 0.04).translate(0, 0.0775, 0), [side, side, side, side, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), side]);
  const ring = mesh(new THREE.BoxGeometry(0.135, 0.012, 0.045), M.brass); ring.position.y = 0.16; const g = grp(m, ring); g.userData.tex = tex; g.userData.n = -1;
  g.userData.draw = (y) => { if (g.userData.n === y) return; g.userData.n = y; const G = tex.userData.g, w = 400, h = 480; G.fillStyle = '#fbfaf6'; G.fillRect(0, 0, w, h); G.fillStyle = '#16181d'; G.fillRect(0, 0, w, 110);
    G.fillStyle = '#ffffff'; G.font = '900 52px Inter'; G.textAlign = 'center'; G.textBaseline = 'middle'; G.fillText('AL FRENTE', w / 2, 58); G.fillStyle = y >= 2026 ? '#c62828' : '#16181d'; G.font = '900 150px Inter'; G.fillText(String(y), w / 2, 290);
    G.fillStyle = '#7d838e'; G.font = '700 34px Inter'; G.fillText(y >= 2026 ? 'NOVIEMBRE' : 'AÑO ' + (y - 1992), w / 2, 435); tex.needsUpdate = true; };
  g.userData.draw(1993); return g;
}
// ---------- placa de su mesa (madera y latón)
function nameplate(l1, l2, s = 1) {
  const g = new THREE.Group(); const wd = new THREE.Shape(); wd.moveTo(-0.03, 0); wd.lineTo(0.03, 0); wd.lineTo(0.008, 0.06); wd.lineTo(-0.008, 0.06); wd.closePath();
  const blk = mesh(new THREE.ExtrudeGeometry(wd, { depth: 0.3, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2 }).translate(0, 0, -0.15), M.wood); blk.rotation.y = Math.PI / 2; g.add(blk);
  const t = canvasTex(1024, 220, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e9cd88'); gr.addColorStop(1, '#b58f45'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.strokeStyle = '#7a5a22'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#2a1d0c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 96px Inter'; c.fillText(l1, w / 2, 86); c.font = '700 54px Inter'; c.fillText(l2, w / 2, 170); });
  const pl = mesh(new THREE.PlaneGeometry(0.28, 0.06), new THREE.MeshPhysicalMaterial({ map: t, metalness: 0.75, roughness: 0.3 }), false); pl.position.set(0, 0.031, 0.0265); pl.rotation.x = -Math.atan2(0.022, 0.06); g.add(pl);
  g.scale.setScalar(s); g.userData.s0 = s; return g;
}
// ---------- la carta del domingo: la frase se escribe a máquina (k de 0 a 1)
function letterObj() {
  const tex = canvasTex(768, 1000, () => {}); let lastK = -1;
  const p = mesh(new THREE.PlaneGeometry(0.21, 0.274), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1 }), false);
  p.userData.draw = (k) => { k = Math.round(k * 40) / 40; if (k === lastK) return; lastK = k; const g = tex.userData.g, w = 768, h = 1000;
    g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = '700 30px DejaVuMono'; g.fillText('PARA: TODOS LOS EMPLEADOS', 60, 90); g.font = '400 28px DejaVuMono'; g.fillText('8 DE NOVIEMBRE DE 2026', 60, 136);
    g.fillRect(60, 160, w - 120, 3); const q = 'Fui infiel a mi mujer.', n = Math.floor(q.length * clamp(k));
    g.font = '700 48px DejaVuMono'; g.fillText(q.slice(0, n), 60, 280); if (k > 0 && k < 1 && Math.floor(k * 40) % 2 === 0) g.fillRect(60 + g.measureText(q.slice(0, n)).width + 4, 244, 22, 44);
    textLines(g, 60, 360, w - 120, 13, 38, 'rgba(40,36,30,.35)', 7); g.font = '400 24px DejaVuMono'; g.fillStyle = 'rgba(40,36,30,.6)'; g.fillText('(traducción de la carta publicada)', 60, h - 60); tex.needsUpdate = true; };
  p.userData.draw(0); return p;
}
// ---------- documento que se sella (frase 5: el consejo abre la investigación)
function boardDoc() {
  const draw = (g, w, h, k) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '800 34px Inter'; g.fillText('CONSEJO DE ADMINISTRACIÓN', w / 2, 90);
    g.font = '900 52px Inter'; g.fillText('INVESTIGACIÓN', w / 2, 170); g.fillText('INDEPENDIENTE', w / 2, 228); g.font = '600 26px Inter'; g.fillText('Comité de consejeros independientes y abogados externos', w / 2, 280);
    textLines(g, 60, 330, w - 120, 8, 28, 'rgba(40,36,30,.42)', 5);
    if (k > 0) { g.save(); g.globalAlpha = Math.min(1, k * 1.5); g.translate(w / 2, h * 0.76); g.rotate(-0.12); g.strokeStyle = '#c62828'; g.lineWidth = 14; rr(g, -220, -70, 440, 140, 16); g.stroke(); g.fillStyle = '#c62828'; g.font = '900 96px Inter'; g.textBaseline = 'middle'; g.fillText('ABIERTA', 0, 6); g.restore(); } };
  const t = canvasTex(768, 1000, (g, w, h) => draw(g, w, h, 0)); const p = mesh(new THREE.PlaneGeometry(0.21, 0.274), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1 }), false);
  p.userData = { tex: t, draw, k: -1 }; return p;
}
// ---------- carpeta (vitrina de la frase 2 y expediente de la frase 7)
function folderObj(l1, l2, stampTxt) {
  const t = canvasTex(700, 900, (g, w, h) => { g.fillStyle = '#d8b878'; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(120,80,30,${hash(i * 2.1) * 0.08})`; g.fillRect(hash(i * 3.7) * w, hash(i * 9.1) * h, 3, 3); }
    g.fillStyle = '#f4efe2'; g.fillRect(120, 160, w - 240, 170); g.strokeStyle = '#6b5530'; g.lineWidth = 4; g.strokeRect(120, 160, w - 240, 170);
    g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 58px Inter'; g.fillText(l1, w / 2, 222, w - 280); g.font = '700 34px Inter'; g.fillText(l2, w / 2, 290, w - 280);
    g.save(); g.translate(w / 2, 600); g.rotate(-0.16); g.strokeStyle = '#b8121b'; g.lineWidth = 12; rr(g, -250, -62, 500, 124, 14); g.stroke(); g.fillStyle = '#b8121b'; g.font = '900 84px Inter'; g.fillText(stampTxt, 0, 6); g.restore(); });
  const side = new THREE.MeshStandardMaterial({ color: 0xc9a868, roughness: 0.8 });
  const m = mesh(new THREE.BoxGeometry(0.24, 0.012, 0.31), [side, side, new THREE.MeshStandardMaterial({ map: t, roughness: 0.75 }), side, side, side]); m.position.y = 0.006; return grp(m);
}
// ---------- campana de apertura de la bolsa (latón, en su arco de madera) con su martillo
function bellObj() {
  const g = new THREE.Group();
  const bell = lathe([[0.004, 0.17], [0.03, 0.165], [0.052, 0.14], [0.06, 0.09], [0.07, 0.04], [0.088, 0.008], [0.092, 0.0], [0.084, 0.002], [0.062, 0.04], [0.05, 0.09], [0.042, 0.14], [0.02, 0.158], [0.004, 0.16]], 48, M.gold);
  const hb = new THREE.Group(); hb.position.y = 0.42; bell.position.y = -0.18; hb.add(bell); g.add(hb);
  const clap = sph(0.016, M.brass); clap.position.y = -0.16; hb.add(clap);
  for (const sd of [-1, 1]) { const p = rbox(0.04, 0.46, 0.04, M.wood, 0.008); p.position.set(sd * 0.16, 0.23, 0); g.add(p); }
  const top = rbox(0.38, 0.05, 0.05, M.wood, 0.01); top.position.y = 0.47; g.add(top); const base = rbox(0.44, 0.04, 0.16, M.wood, 0.01); base.rotation.x = Math.PI / 2; base.position.y = 0.02; g.add(base);
  const ham = new THREE.Group(); ham.position.set(0.15, 0.3, 0.06); const hh = cyl(0.016, 0.016, 0.06, M.wood, 16); hh.rotation.z = Math.PI / 2; hh.position.x = -0.1; const hs = cyl(0.005, 0.005, 0.12, M.woodL, 8); hs.rotation.z = Math.PI / 2; hs.position.x = -0.04; ham.add(hh, hs); g.add(ham);
  g.userData = { hb, ham }; return g;
}
// ---------- panel de bolsa: la acción el miércoles y el desplome al abrir el jueves (k: 0 → 1)
function tickerBoard() {
  const tex = canvasTex(900, 640, () => {}); let lk = -1;
  const scr = mesh(new THREE.PlaneGeometry(0.54, 0.384), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), false); scr.position.set(0, 0.36, 0.016);
  const fr = rbox(0.58, 0.43, 0.03, M.black, 0.01); fr.position.y = 0.36; const st = cyl(0.012, 0.012, 0.16, M.dsteel, 12); st.position.y = 0.08; const ft = rbox(0.18, 0.1, 0.012, M.dsteel, 0.006); ft.rotation.x = Math.PI / 2; ft.position.y = 0.006;
  const g = grp(fr, scr, st, ft);
  g.userData.draw = (k) => { k = Math.round(k * 60) / 60; if (k === lk) return; lk = k; const c = tex.userData.g, w = 900, h = 640; c.fillStyle = '#05070a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c8ced8'; c.font = '700 34px DejaVuMono'; c.textAlign = 'left'; c.fillText('ACCIÓN DE NVIDIA (EN $)', 36, 56); c.fillStyle = '#5c6470'; c.font = '400 24px DejaVuMono'; c.fillText('MIÉ 11 NOV', 70, h - 30); c.fillText('JUE 12 · APERTURA', 470, h - 30);
    c.strokeStyle = 'rgba(120,130,145,.25)'; c.lineWidth = 1; for (let y = 120; y < h - 70; y += 70) { c.beginPath(); c.moveTo(36, y); c.lineTo(w - 36, y); c.stroke(); }
    const yOf = p => 130 + (180 - p) / (180 - 140) * (h - 230), pts = []; for (let i = 0; i <= 40; i++) pts.push([60 + i * 9.5, yOf(173.8 + Math.sin(i * 0.9) * 1.2 + Math.sin(i * 2.3) * 0.6)]);
    c.strokeStyle = '#9fe0b4'; c.lineWidth = 5; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
    c.setLineDash([8, 10]); c.strokeStyle = 'rgba(200,206,216,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(440, 100); c.lineTo(440, h - 60); c.stroke(); c.setLineDash([]);
    if (k > 0) { const kk = clamp(k), x0 = 440, y0 = pts[pts.length - 1][1], drop = [[x0, y0], [x0 + 26, yOf(160)], [x0 + 44, yOf(152)], [x0 + 70, yOf(149)], [x0 + 110, yOf(150.5)], [x0 + 160, yOf(149.3)], [x0 + 230, yOf(151)]];
      const n = 1 + kk * (drop.length - 1), fi = Math.floor(n); c.strokeStyle = '#ff4d5e'; c.lineWidth = 6; c.beginPath(); c.moveTo(pts[pts.length - 1][0], y0); for (let i = 0; i < Math.min(fi, drop.length); i++) c.lineTo(drop[i][0], drop[i][1]);
      if (fi < drop.length) { const a = drop[fi - 1], b = drop[fi], f = n - fi; c.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); } c.stroke();
      c.globalAlpha = clamp((kk - 0.5) / 0.3); c.fillStyle = '#ff4d5e'; c.font = '900 120px DejaVuMono'; c.textAlign = 'right'; c.fillText('−13 %', w - 40, 200); c.globalAlpha = 1; }
    tex.needsUpdate = true; };
  g.userData.draw(0); return g;
}
// ---------- micrófono oculto (frase 7)
function bugObj() {
  const g = new THREE.Group(); const b = rbox(0.05, 0.03, 0.014, M.black, 0.005); b.rotation.x = Math.PI / 2; b.position.y = 0.008; g.add(b);
  const grill = cyl(0.009, 0.009, 0.004, M.dsteel, 16); grill.position.set(-0.012, 0.016, 0); g.add(grill); const led = sph(0.003, M.redLed); led.position.set(0.016, 0.016, 0.008); g.add(led);
  g.add(bar(v3(0.022, 0.012, 0), v3(0.07, 0.008, 0.03), 0.0012, M.dsteel, 6)); g.userData.led = led; return g;
}
// ---------- silueta sin cara (busto de metacrilato oscuro sobre una peana de latón): no representa a nadie concreto
function silhouette(h = 0.3, col = 0x24262c) {
  const s = new THREE.Shape(), r = h * 0.15, nw = h * 0.07, sw = h * 0.42, cy = h * 0.74;
  s.moveTo(-sw, 0); s.bezierCurveTo(-sw, h * 0.3, -sw * 0.75, h * 0.42, -nw * 1.6, h * 0.46); s.lineTo(-nw, h * 0.52); s.lineTo(-nw, cy - r * 0.9);
  s.absarc(0, cy, r, Math.PI * 1.32, Math.PI * -0.32, true); s.lineTo(nw, h * 0.52); s.lineTo(nw * 1.6, h * 0.46); s.bezierCurveTo(sw * 0.75, h * 0.42, sw, h * 0.3, sw, 0); s.lineTo(-sw, 0);
  const m = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const b = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2, curveSegments: 24 }).translate(0, 0.012, -0.006), m);
  const base = rbox(sw * 2.3, 0.07, 0.014, M.brass, 0.005); base.rotation.x = Math.PI / 2; base.position.y = 0.007; const g = grp(b, base); g.userData.m = m; return g;
}
// ---------- organigrama en un atril (k: la línea del CEO a la directiva se dibuja)
function orgChart() {
  const tex = canvasTex(700, 820, () => {}); let lk = -1;
  const board = mesh(new THREE.PlaneGeometry(0.34, 0.4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), false); board.position.set(0, 0.36, 0.012); board.rotation.x = -0.12;
  const back = rbox(0.36, 0.42, 0.016, M.wood, 0.008); back.position.set(0, 0.36, 0.0); back.rotation.x = -0.12;
  const legs = [bar(v3(-0.14, 0.0, 0.06), v3(-0.12, 0.42, -0.02), 0.008, M.woodL), bar(v3(0.14, 0.0, 0.06), v3(0.12, 0.42, -0.02), 0.008, M.woodL), bar(v3(0, 0.0, -0.12), v3(0, 0.4, -0.03), 0.008, M.woodL)];
  const g = grp(back, board, ...legs);
  g.userData.draw = (k) => { k = Math.round(k * 30) / 30; if (k === lk) return; lk = k; const c = tex.userData.g, w = 700, h = 820; c.fillStyle = '#f2eee3'; c.fillRect(0, 0, w, h);
    const box = (x, y, bw, txt, on) => { c.fillStyle = on ? '#2b2218' : 'rgba(43,34,24,.18)'; c.strokeStyle = on ? '#2b2218' : 'rgba(43,34,24,.35)'; c.lineWidth = 5; rr(c, x - bw / 2, y - 45, bw, 90, 12); c.stroke(); c.font = '800 38px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x, y + 2); };
    c.strokeStyle = 'rgba(43,34,24,.35)'; c.lineWidth = 4; c.beginPath(); c.moveTo(350, 175); c.lineTo(350, 300); c.moveTo(130, 300); c.lineTo(570, 300); for (const x of [130, 350, 570]) { c.moveTo(x, 300); c.lineTo(x, 380); } c.stroke();
    box(350, 130, 260, 'CEO', true); box(130, 425, 190, 'VP', false); box(570, 425, 190, 'VP', false); box(350, 425, 210, 'DIRECTIVA', k > 0.5);
    if (k > 0) { c.strokeStyle = '#c62828'; c.lineWidth = 9; c.beginPath(); c.moveTo(350, 175); c.lineTo(350, 175 + 205 * clamp(k * 1.4)); c.stroke(); }
    c.fillStyle = 'rgba(43,34,24,.55)'; c.font = '600 26px Inter'; c.fillText('A SUS ÓRDENES', 350, 520); tex.needsUpdate = true; };
  g.userData.draw(0); return g;
}
// ---------------------------------------------------------------- el centro: un chip gigante de tarjeta gráfica y una alianza de oro que cae sobre él como el
// mazo de Derecho y lo parte en dos (chispas, onda, polvo); detrás, la silla de director vacía, que se va rodando con «ha dimitido». En la frase 2 sube la
// vitrina con la carpeta de la investigación. Al final todo se rebobina: el chip se cierra, la silla vuelve y la alianza sube (bucle).
const T_HIT = 0.3, RING_R = 0.32, DROP = 0.36;
const _o = new THREE.Object3D(), _ax = new THREE.Vector3();
function buildCenter() {
  const Z = new THREE.Group(); scene.add(Z); S.ctr = Z;
  S.chip = chipObj(0.9); S.chip.position.y = 0.03; Z.add(S.chip);
  for (const sd of [-1, 1]) { const b = rbox(0.08, 0.8, 0.03, M.black, 0.006); b.rotation.x = Math.PI / 2; b.position.set(sd * 0.38, 0.015, 0); Z.add(b); }    // tacos bajo los bordes (el centro puede hundirse)
  S.ring = ringObj(RING_R, 0.12, 0.05); Z.add(S.ring);
  S.chair = execChair(0.92); Z.add(S.chair);
  S.shock = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  S.shock.rotation.x = -Math.PI / 2; S.shock.position.y = 0.004; Z.add(S.shock);
  S.dust = sparks(Z, 200, 0xffe0b0, 0.03); S.zap = sparks(Z, 140, 0xbfe4ff, 0.02);
  // la vitrina (frase 2) con la carpeta de la investigación en su atril
  S.vit = vitrine(0.34, 0.6); S.vit.position.set(0.58, 0, -0.5); S.vit.rotation.y = -0.45; Z.add(S.vit);
  const easel = grp(at(mesh(new THREE.BoxGeometry(0.2, 0.012, 0.12), M.brass), 0, 0.086, 0), at(mesh(new THREE.BoxGeometry(0.012, 0.2, 0.012), M.brass), 0, 0.18, -0.04, 0, -0.25));
  S.fold = folderObj('INVESTIGACIÓN', 'CONSEJO DE ADMINISTRACIÓN', 'CONFIDENCIAL'); S.fold.rotation.x = Math.PI / 2 - 0.18; S.fold.position.set(0, 0.098 + 0.16, 0.0); S.vit.add(easel, S.fold);
  S.ctrCone = lightCone(1.6, 5, 0.05); Z.add(S.ctrCone);
}
const CHIP_TOP = () => 0.03 + S.chip.userData.top;
function centerAt(t, st) {
  const Z = S.ctr, vis = t < K.jensen3 + 2.2 || t > K.mandaselo9 - 1.2; Z.visible = vis; if (!vis) return;
  const rew = eio(clamp((t - (END - 1.7)) / 1.7));                 // rebobinado final (0 → 1)
  // ---- la alianza: cae acelerando, se clava en el chip (rebote corto); al final sube hasta la pose del primer fotograma
  const top = CHIP_TOP(), sink = 0.022;
  let y = top + RING_R + DROP * (1 - clamp(t / T_HIT) * clamp(t / T_HIT));
  if (t > T_HIT) { const u = t - T_HIT; y = top + RING_R - sink * clamp(u / 0.05) + 0.03 * Math.abs(Math.sin(u * 14)) * Math.exp(-u * 9); }
  y += (sink + DROP) * rew;
  S.ring.position.set(0, y, 0.0); S.ring.rotation.set(0, 0.02 * Math.sin(t * 0.7), (t > T_HIT ? 0.03 * Math.sin((t - T_HIT) * 16) * Math.exp(-(t - T_HIT) * 4) : 0));
  // ---- el chip: se parte en dos con el golpe (el centro se hunde y las mitades se separan); al final se cierra
  const br = (t > T_HIT ? eo(clamp((t - T_HIT) / 0.12)) : 0) * (1 - rew);
  S.chip.userData.halves.forEach((h, i) => { const sd = i ? 1 : -1; h.rotation.z = sd * 0.05 * br; h.position.x = sd * (0.45 + 0.018 * br); });
  // ---- onda, polvo y chispas eléctricas en la grieta
  const ush = t - T_HIT; S.shock.visible = ush > 0 && ush < 0.9; if (S.shock.visible) { const e = eo(clamp(ush / 0.85)); S.shock.scale.setScalar(0.1 + e * 1.4); S.shock.material.opacity = 0.85 * (1 - e); }
  S.dust.visible = ush > 0 && ush < 1.6; if (S.dust.visible) { burst(S.dust, v3(0, 0.05, 0), t, T_HIT, 0.4, 1.5, false, 0.7); S.dust.material.opacity = 1 - clamp(ush / 1.6); }
  S.zap.visible = ush > 0 && ush < 1.1; if (S.zap.visible) { burst(S.zap, v3(0, top, 0), t, T_HIT, 0.25, 0.9, false, 1.2); S.zap.material.opacity = 1 - clamp(ush / 1.1); }
  // ---- la silla vacía: con «ha dimitido» se va rodando hacia atrás y gira; al final vuelve
  const go = eo(clamp((t - (K.dimitido1 - 0.05)) / 1.8)) * (1 - rew);
  S.chair.position.set(0.05 + 0.2 * go, 0, -1.0 - 2.2 * go); S.chair.rotation.y = 0.1 + 2.5 * go + 0.04 * Math.sin(t * 0.8) * (1 - go);
  // ---- la vitrina (frase 2): sube con «su empresa»; la luz roja de la cerradura parpadea con «otra cosa»
  const vk = win(t, K.empresa2 - 0.2, 0.6) * (1 - win(t, K.jensen3 + 0.9, 0.4));
  S.vit.visible = vk > 0.01; S.vit.position.y = -0.75 * (1 - vk);
  if (S.vit.visible) { const on = t > K.otra2 - 0.05 ? 1 : 0; S.vit.userData.led.material.emissiveIntensity = 3 * on * (0.6 + 0.4 * Math.sin(t * 9)); }
  S.ctrCone.material.uniforms.op.value = 0.05;
}
// ---------------------------------------------------------------- estaciones en el círculo de radio R_ST (pedestal de madera con canto de latón y su haz de luz;
// su +z local mira hacia fuera, hacia la cámara): D los 33 años y la empresa más valiosa (L3), C la carta, la investigación y la dimisión (L4–L5),
// K la bolsa (L6), P el expediente del espionaje y las dos relaciones (L7–L8) y B la balanza de la pregunta (L9).
const ST = {};
function station(name, a, r = 1.0) {
  const Z = new THREE.Group(); Z.position.copy(stP(a)); Z.rotation.y = a * D2; scene.add(Z);
  const pl = plinth(r, 0.55); Z.add(pl); const lc = lightCone(r * 1.15, 4.6, 0.055); Z.add(lc);
  const top = new THREE.Group(); top.position.y = 0.55; Z.add(top);
  ST[name] = { Z, top, a, cone: lc }; return ST[name];
}
const TOP = 0.55, LAY = BUN.h * 1.02;
function looseBundles(n, parent) { const ms = bundleMats(), out = []; for (let i = 0; i < n; i++) { const b = mesh(bundleGeo(), ms); parent.add(b); out.push(b); } return out; }
function buildStations() {
  // ---------- L3: 33 años al frente (calendario de años y la placa de su mesa) y la empresa más valiosa del mundo (columna de fajos y medalla)
  { const s = station('D', ANG.D, 1.0);
    s.cal = yearCalendar(); s.cal.position.set(-0.3, 0, -0.02); s.cal.rotation.y = 0.3; s.cal.scale.setScalar(1.35); s.cal.userData.s0 = 1.35; s.top.add(s.cal);
    s.np = nameplate('JENSEN HUANG', 'CEO · NVIDIA', 1.0); s.np.position.set(0.0, 0, 0.16); s.top.add(s.np);
    s.col = bundleColumn(50, 1.0); s.col.g.position.set(0.3, 0, -0.16); s.top.add(s.col.g);
    s.med = grp(medal()); s.med.scale.setScalar(1.6); s.top.add(s.med); s.sp = sparks(s.top, 120, 0xffd58a, 0.022);
  }
  // ---------- L4–L5: la carta del domingo, el documento del consejo que se sella y, con «dimitió», la placa que cae y la silla que se va
  { const s = station('C', ANG.C, 1.0);
    s.letter = letterObj(); s.letter.rotation.set(-Math.PI / 2, 0, 0.06); s.letter.position.set(-0.04, 0.003, 0.28); s.letter.scale.setScalar(1.5); s.top.add(s.letter);
    s.pen = pen(); s.pen.rotation.set(Math.PI / 2, 0, -0.6); s.pen.position.set(0.2, 0.01, 0.3); s.top.add(s.pen);
    s.ring = ringObj(0.045, 0.018, 0.008); s.ring.rotation.x = Math.PI / 2; s.ring.position.set(0.24, 0.01, 0.12); s.top.add(s.ring);
    s.doc = boardDoc(); s.doc.rotation.set(-Math.PI / 2, 0, 0.1); s.doc.position.set(-0.32, 0.003, -0.12); s.doc.scale.setScalar(1.3); s.top.add(s.doc);
    s.stp = rubberStamp('ABIERTA'); s.top.add(s.stp);
    s.np = nameplate('JENSEN HUANG', 'CEO', 0.85); s.np.position.set(0.3, 0, -0.06); s.top.add(s.np);
    s.chair = execChair(0.3); s.chair.position.set(0.3, 0, -0.42); s.top.add(s.chair);
  }
  // ---------- L6: la campana de apertura, el panel de la acción (−13 %) y la columna de fajos que pierde su parte de arriba
  { const s = station('K', ANG.K, 1.05);
    s.bell = bellObj(); s.bell.position.set(-0.4, 0, 0.12); s.bell.rotation.y = 0.45; s.top.add(s.bell);
    s.board = tickerBoard(); s.board.position.set(0.04, 0, -0.18); s.board.scale.setScalar(1.25); s.top.add(s.board);
    s.col = bundleColumn(40, 1.0); s.col.g.position.set(0.48, 0, 0.12); s.top.add(s.col.g);
    s.loose = looseBundles(5, s.top);
  }
  // ---------- L7–L8: el expediente con la lupa y el micrófono; la silueta de la mujer (según The Washington Post) y el organigrama con la directiva
  // (según The New York Times). Siluetas sin cara ni nombre
  { const s = station('P', ANG.P, 1.05);
    s.fold = folderObj('EXPEDIENTE', '¿OBJETIVO DE ESPIONAJE?', 'CONFIDENCIAL'); s.fold.position.set(-0.02, 0, 0.26); s.fold.rotation.y = -0.08; s.fold.scale.setScalar(1.25); s.top.add(s.fold);
    s.mag = magnifier(1.5); s.top.add(s.mag);
    s.bug = bugObj(); s.bug.scale.setScalar(1.8); s.bug.userData.s0 = 1.8; s.bug.position.set(0.06, 0.016, 0.24); s.top.add(s.bug);
    s.sil1 = silhouette(0.36); s.sil1.position.set(-0.4, 0, -0.18); s.sil1.rotation.y = 0.25; s.top.add(s.sil1);
    s.org = orgChart(); s.org.position.set(0.32, 0, -0.32); s.org.rotation.y = -0.2; s.top.add(s.org);
    s.sil2 = silhouette(0.24); s.sil2.position.set(0.3, 0, -0.06); s.sil2.rotation.y = -0.2; s.top.add(s.sil2);
  }
  // ---------- L9: la balanza. Vida privada (la alianza) frente al cargo (la placa de CEO)
  { const s = station('B', ANG.B, 1.05);
    s.sc = scales(0.75); s.sc.position.set(0, 0, -0.05); s.top.add(s.sc);
    s.ring = ringObj(0.06, 0.024, 0.011); s.np = nameplate('CEO', 'NVIDIA', 0.42); s.top.add(s.ring, s.np);
  }
}
function stationsAt(t) {
  const vis = (s, a, b) => { s.Z.visible = t > a && t < b; return s.Z.visible; };
  // L3
  { const s = ST.D; if (vis(s, K.final2 - 0.4, K.escribio4 + 0.5)) {
    show(s.cal, pop(t, K.jensen3 - 0.1, 0.4)); s.cal.userData.draw(1993 + Math.round(33 * eio(clamp((t - (K.n33 - 0.25)) / (K.frente3 - K.n33 + 0.2)))));
    show(s.np, pop(t, K.huang3 - 0.15, 0.4));
    const k = keyed(t, [[0, 0], [K.nvidia3 - 0.1, 0], [K.mundo3 + 0.2, 48]]); s.col.setN(k, 0.1);
    const mk = pop(t, K.valiosa3 - 0.1, 0.45); s.med.visible = mk > 0.01; s.med.position.set(0.3, s.col.top + 0.17 + 0.012 * Math.sin(t * 3), -0.16); s.med.rotation.y = 0.25 * Math.sin(t * 1.6); s.med.scale.setScalar(Math.max(0.0001, 1.6 * mk));
    s.sp.visible = t > K.valiosa3 && t < K.valiosa3 + 1.8; if (s.sp.visible) burst(s.sp, v3(0.3, s.col.top + 0.17, -0.16), t, K.valiosa3, 0.3, 1.4, false, 0.25);
  } }
  // L4–L5
  { const s = ST.C; if (vis(s, K.mundo3 - 0.3, K.abrir6 + 0.3)) {
    s.letter.userData.draw(clamp((t - (K.fui4 - 0.02)) / (K.mujer4 + 0.3 - K.fui4)));
    show(s.doc, pop(t, K.consejo5 - 0.25, 0.4) * 1.3);
    const sd = t - (K.investigacion5 + 0.05), down = sd > 0 ? (sd < 0.12 ? sd / 0.12 : sd < 0.32 ? 1 : Math.max(0, 1 - (sd - 0.32) / 0.25)) : 0;
    s.stp.visible = t > K.consejo5 - 0.2 && t < K.dimitio5 + 0.4; s.stp.position.set(-0.32, 0.3 - 0.295 * eio(down) + 0.1 * (1 - win(t, K.consejo5 - 0.2, 0.3)), -0.12); s.stp.rotation.y = 0.1;
    const dk = sd > 0.1 ? 1 : 0; if (dk !== s.doc.userData.k) { const T = s.doc.userData.tex; s.doc.userData.draw(T.userData.g, T.userData.c.width, T.userData.c.height, dk); T.needsUpdate = true; s.doc.userData.k = dk; }
    const fall = eio(clamp((t - (K.dimitio5 - 0.05)) / 0.45)); s.np.rotation.x = -1.42 * fall; s.np.position.set(0.3, 0.004 * fall, -0.06 - 0.03 * fall);
    const go = eo(clamp((t - (K.dimitio5 - 0.05)) / 1.4)); s.chair.position.set(0.3 + 0.12 * go, 0, -0.42 - 0.28 * go); s.chair.rotation.y = 2.2 * go;
  } }
  // L6
  { const s = ST.K; if (vis(s, K.dimitio5 - 0.3, K.respuesta7 + 0.4)) {
    const hb = s.bell.userData, u = t - K.abrir6; hb.ham.rotation.z = u < 0 ? 0.6 * win(t, K.abrir6 - 0.45, 0.35) : 0.6 * (1 - eo(clamp(u / 0.06))) + 0.35 * clamp((u - 0.12) / 0.4);
    hb.hb.rotation.z = u > 0 ? 0.09 * Math.sin(u * 22) * Math.exp(-u * 2.2) : 0;
    s.board.userData.draw(clamp((t - (K.hundio6 - 0.1)) / (K.n13 + 0.3 - K.hundio6)));
    const fk = t - (K.hundio6 + 0.05); s.col.setN(fk > 0 ? 35 : 40, 0.08);
    s.loose.forEach((b, i) => { const t0 = 0.0 + i * 0.07, u2 = Math.max(0, fk - t0), y0 = 40 * LAY + BUN.h / 2 - i * LAY, ang = 0.6 + i * 1.1;
      b.visible = fk > t0 - 1e-3; if (!b.visible) return; const dx = Math.cos(ang) * 0.35 * u2, dz = Math.sin(ang) * 0.25 * u2;
      const y = Math.max(BUN.h / 2 + 0.002 + i * 0.004, y0 - 4.9 * u2 * u2); b.position.set(0.48 + dx, y, 0.12 + dz); b.rotation.set(1.5 * Math.min(u2, 0.45) * (i % 2 ? 1 : -1), i * 0.7, 2.1 * Math.min(u2, 0.45)); });
  } }
  // L7–L8
  { const s = ST.P; if (vis(s, K.n13 - 0.3, K.crees9 + 0.6)) {
    const mu = eio(clamp((t - (K.investigan7 - 0.2)) / (K.espionaje7 - K.investigan7 + 0.2))); s.mag.position.set(-0.34 + 0.4 * mu, 0.1 - 0.02 * mu, 0.36 - 0.12 * mu); s.mag.rotation.set(-1.0, 0, 0.4 - 0.3 * mu);
    show(s.bug, pop(t, K.espionaje7 - 0.12, 0.35)); s.bug.userData.led.material.emissiveIntensity = 3 * (Math.sin(t * 10) > 0 ? 1 : 0.2);
    show(s.sil1, pop(t, K.mujer8 - 0.15, 0.45)); s.sil1.userData.m.emissive.setHex(0x5a0d12); s.sil1.userData.m.emissiveIntensity = 0.6 * win(t, K.sospechosa8 - 0.1, 0.3);
    show(s.org, pop(t, K.otra8 - 0.3, 0.45)); s.org.userData.draw(clamp((t - (K.relacion8 - 0.05)) / (K.directiva8 + 0.3 - K.relacion8)));
    show(s.sil2, pop(t, K.directiva8 - 0.12, 0.45));
  } }
  // L9: la balanza duda (sube y baja) mientras se hace la pregunta
  { const s = ST.B; if (vis(s, K.crees9 - 0.7, K.mandaselo9 + 1.2)) {
    const u = t - (K.crees9 - 0.1), tilt = u > 0 ? 0.17 * Math.sin(u * 2.4) * Math.exp(-u * 0.22) : 0; scalesTilt(s.sc, tilt);
    const pans = s.sc.userData.pans.map(p => { p.updateWorldMatrix(true, false); const w = p.localToWorld(v3(0, -0.42, 0)); return s.top.worldToLocal(w); });
    s.ring.position.copy(pans[0]).add(v3(0, 0.009 + 0.06, 0)); s.ring.rotation.set(0, 0.2, 0); show(s.ring, pop(t, K.crees9 - 0.4, 0.4));
    s.np.position.copy(pans[1]).add(v3(0, 0.009, 0.0)); s.np.rotation.set(0, -0.15, 0); show(s.np, pop(t, K.crees9 - 0.3, 0.4));
  } }
  for (const k in ST) { const s = ST[k]; if (s.Z.visible) s.cone.material.uniforms.op.value = 0.055; }
}
// ---------------------------------------------------------------- cámara (como en Derecho y GTA): baja frente al chip cuando cae la alianza → la silla que se va → la
// vitrina con la carpeta → retrocede en línea recta (sin girar) hasta el primer pedestal → la carta y el consejo → la bolsa → el expediente y las siluetas →
// la balanza → vuelve al centro por el hueco de 205°: el chip se cierra y la alianza sube hasta la pose del primer fotograma (bucle).
let CKS = [], CUTS = [];
const stCam = (a, dist, h, dx = 0) => { const p = stP(a, dist, h).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const stLook = (a, y, dx = 0, r = R_ST) => { const p = stP(a, r, y).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const T0 = [0.18, 0.42, 2.25], L0 = [0, 0.5, 0], T1 = [0.176, 0.416, 2.21], L1 = [0, 0.498, 0], Tm = [0.184, 0.424, 2.29], Lm = [0, 0.502, 0];
function buildCam() {
  const { D, C, K: KK, P, B } = ANG;
  const hold = (t, a, d, h, dx, ly, ldx, lr = R_ST, f = 34) => [t, stCam(a, d, h, dx), stLook(a, ly, ldx, lr), f];
  const A = [
    [-0.4, Tm, Lm, 40], [0.0, T0, L0, 40], [0.5, T1, L1, 40], [T_HIT + 0.35, [0.2, 0.45, 2.12], [0, 0.46, 0], 40],
    [K.dimitido1, [0.3, 0.62, 2.25], [0.0, 0.52, -0.6], 38], [K.confesar1, [0.16, 0.7, 2.0], [0, 0.46, -0.3], 38], [K.infidelidad1, [0.08, 0.55, 1.98], [0, 0.44, 0], 38],
    [K.empresa2, [0.8, 0.6, 1.5], [0.45, 0.4, -0.4], 38], [K.investiga2, [1.25, 0.6, 0.8], [0.56, 0.38, -0.5], 37],
    [K.otra2, [1.28, 0.56, 0.52], [0.57, 0.38, -0.5], 35], [K.final2 + 0.25, [1.26, 0.55, 0.42], [0.57, 0.38, -0.5], 34],
    // de la vitrina al pedestal D sin girar: retrocede en línea recta mirando al centro, sube, pasa por encima del pedestal y baja delante de él
    [K.final2 + 0.79, [2.14, 0.95, 2.48], [0.35, 0.42, -0.3], 38], [K.final2 + 1.43, [3.2, 1.55, 4.96], [0.3, 0.42, -0.2], 40],
    [K.final2 + 1.83, [4.25, 1.75, 7.43], [2.5, 0.5, 3.83], 40], [K.final2 + 2.28, stCam(D, 10.3, 1.35, -0.15), stLook(D, 0.72, -0.1), 38],
    [K.anos3, stCam(D, 9.6, 1.08, -0.18), stLook(D, 0.6, -0.16, R_ST + 0.05), 36], [K.frente3, stCam(D, 9.5, 1.04, -0.12), stLook(D, 0.6, -0.1, R_ST + 0.08), 35],
    [K.nvidia3, stCam(D, 9.7, 1.1, 0.05), stLook(D, 0.85, 0.1), 36], [K.valiosa3, stCam(D, 9.85, 1.25, 0.15), stLook(D, 1.05, 0.2), 38], hold(K.domingo4 - 0.25, D, 9.9, 1.27, 0.16, 1.07, 0.2, R_ST, 38),
    [K.domingo4 + 0.35, stCam(C, 9.6, 1.25, -0.05), stLook(C, 0.58, -0.02, R_ST + 0.1), 37], [K.fui4, stCam(C, 9.15, 1.15, -0.04), stLook(C, 0.56, -0.04, R_ST + 0.28), 34],
    hold(K.mujer4 + 0.3, C, 9.13, 1.14, -0.04, 0.56, -0.04, R_ST + 0.28, 34),
    [K.consejo5 + 0.2, stCam(C, 9.5, 1.2, -0.3), stLook(C, 0.58, -0.3, R_ST - 0.1), 35], hold(K.investigacion5 + 0.35, C, 9.45, 1.17, -0.3, 0.58, -0.31, R_ST - 0.1, 35),
    [K.dimitio5, stCam(C, 9.6, 1.05, 0.25), stLook(C, 0.66, 0.28, R_ST - 0.15), 36], hold(K.jueves6 - 0.25, C, 9.65, 1.07, 0.27, 0.66, 0.3, R_ST - 0.15, 36),
    [K.jueves6 + 0.35, stCam(KK, 9.7, 1.1, -0.3), stLook(KK, 0.85, -0.3), 37], [K.abrir6, stCam(KK, 9.45, 1.0, -0.35), stLook(KK, 0.82, -0.36, R_ST + 0.1), 35],
    [K.hundio6, stCam(KK, 9.6, 1.05, 0.05), stLook(KK, 0.98, 0.05, R_ST - 0.2), 36], [K.n13, stCam(KK, 9.75, 1.1, 0.2), stLook(KK, 0.92, 0.22, R_ST - 0.1), 37], hold(K.respuesta7 - 0.25, KK, 9.78, 1.1, 0.22, 0.92, 0.23, R_ST - 0.1, 37),
    [K.respuesta7 + 0.35, stCam(P, 9.75, 0.98, -0.12), stLook(P, 0.62, -0.08, R_ST + 0.12), 36], [K.espionaje7, stCam(P, 9.4, 0.9, 0.0), stLook(P, 0.6, 0.04, R_ST + 0.2), 33],
    hold(K.extranjero7 + 0.3, P, 9.42, 0.9, 0.0, 0.6, 0.04, R_ST + 0.2, 33),
    [K.mujer8, stCam(P, 9.6, 1.0, -0.3), stLook(P, 0.75, -0.36, R_ST - 0.1), 35], [K.china8, stCam(P, 9.5, 0.98, -0.32), stLook(P, 0.76, -0.36, R_ST - 0.12), 34],
    [K.otra8, stCam(P, 9.7, 1.05, 0.2), stLook(P, 0.85, 0.28, R_ST - 0.2), 36], [K.directiva8, stCam(P, 9.6, 1.0, 0.24), stLook(P, 0.82, 0.3, R_ST - 0.18), 35], hold(K.crees9 - 0.25, P, 9.62, 1.0, 0.25, 0.82, 0.31, R_ST - 0.18, 35),
    [K.crees9 + 0.35, stCam(B, 10.6, 1.36, 0.0), stLook(B, 1.02, 0.0), 36], [K.obligar9, stCam(B, 10.4, 1.3, 0.05), stLook(B, 1.0, 0.04), 35], [K.dimitir9 + 0.2, stCam(B, 10.45, 1.32, 0.0), stLook(B, 1.0, 0.0), 35],
    [K.mandaselo9 - 0.1, stCam(B, 10.5, 1.65, -1.7), stLook(B, 1.0, -0.7), 38], [K.mandaselo9 + 0.6, [5.0 * Math.sin(205 * D2), 1.4, 5.0 * Math.cos(205 * D2)], [0, 0.35, 0], 42],
    [END - 1.9, [-1.6, 0.85, 1.6], [0, 0.45, 0], 41], [END - 1.2, [0.7, 0.5, 2.3], [0, 0.48, 0], 40], [END - 0.4, Tm, Lm, 40],
    [END, T0, L0, 40], [END + 0.5, T1, L1, 40],
  ];
  CKS = [A];
}
function camAt(t) {
  const st = camKeys(t, CKS[0]);
  const u = t - T_HIT; if (u > 0 && u < 0.45) { const a = 0.012 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; st.l.y += Math.sin(u * 83 + 2) * a * 0.6; }
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[T_HIT, 0.16], [K.valiosa3, 0.05], [K.investigacion5 + 0.17, 0.06], [K.dimitio5 + 0.3, 0.04], [K.abrir6, 0.05], [K.hundio6 + 0.05, 0.06], [K.espionaje7, 0.04]])
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
  // vuelos que cruzan haces: de la vitrina al pedestal D (entra y sale suave) y de la balanza al centro; fuera de ellos, el haz a su valor
  const fk = t > K.mandaselo9 - 0.1 && t < END - 1.3 ? 1 : win(t, K.final2 + 0.25, 0.3) * (1 - win(t, K.final2 + 2.6, 0.3));
  coneFade(S.ctrCone, 0.05, t, st, fk); for (const k in ST) if (ST[k].Z.visible) coneFade(ST[k].cone, 0.055, t, st, fk);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.2, 1.2);
  rigAt(c, yaw, k, 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0.0; R.hemi.intensity = 0.12;
}
// ---------------------------------------------------------------- HUD (como en Derecho): cabecera con la pregunta pendiente (¿qué investigan?), cifras grandes y
// rótulos con línea guía. Todo lo que no confirma Nvidia lleva el medio que lo publica.
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A';
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('NVIDIA', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText('LA DIMISIÓN DE SU JEFE', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('DIMITE EL', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('12 NOV', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('TRAS 33 AÑOS', 1024, 178);
  const mk = win(t, K.otra2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = '¿QUÉ INVESTIGAN? · ???', col = HC.red, blink = true;
    if (t > K.respuesta7 + 0.3) { txt = '¿OBJETIVO DE ESPIONAJE? (CONSEJO)'; col = HG; blink = false; }
    if (t > K.crees9) { txt = '¿Y TÚ QUÉ CREES?'; col = HC.white; blink = false; }
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
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1430;
  // L1: dimite · tras confesar una infidelidad
  { const a = cw(t, K.dimitido1 - 0.05, K.confesar1 - 0.32); if (a > 0.01) { bigText('DIMITE', W / 2, Y, 120, HC.white, a, { glow: 20, type: false, dark: 30 }); bigText('EL JEFE DE NVIDIA', W / 2, Y + 92, 30, HG, a, { dark: 20 }); }
    const b = cw(t, K.confesar1 - 0.05, K.pero2 - 0.1); if (b > 0.01) { bigText('TRAS CONFESAR', W / 2, Y - 10, 44, HC.white, b, { dark: 24 }); bigText('UNA INFIDELIDAD', W / 2, Y + 62, 60, HG, b, { glow: 14, dark: 26 }); }
    if (S.ctr.visible) { lab(S.chip, 0.33, 0.12, 0.3, 'NVIDIA', 'CHIPS PARA LA IA', cw(t, K.nvidia1, K.dimitido1 - 0.05), { dx: 120, dy: -140, color: HC.green });
      lab(S.chair, 0, 1.25, 0, 'SU SILLA', 'VACÍA', cw(t, K.dimitido1 + 0.3, K.confesar1 + 0.2), { dx: -120, dy: -120, color: HC.white }); } }
  // L2: no investiga si fue infiel… sino otra cosa (la «?» roja sobre la vitrina)
  { const a = cw(t, K.no2 - 0.05, K.otra2 - 0.32); if (a > 0.01) { bigText('NO INVESTIGA', W / 2, Y - 10, 44, HC.white, a, { dark: 24 }); bigText('SI FUE INFIEL', W / 2, Y + 60, 56, HC.white, a, { dark: 26 }); }
    const b = cw(t, K.otra2 - 0.05, K.jensen3 - 0.1); if (b > 0.01) bigText('SINO OTRA COSA', W / 2, Y + 20, 62, HC.red, b, { glow: 16, dark: 26 });
    if (S.vit.visible) { const L = S.vit.userData.lock; const q = cw(t, K.otra2, K.jensen3 + 0.2); if (q > 0.01) { const P = proj(wpo(L, 0, 0.02, 0.02)); if (P.ok) bigText('?', P.x, P.y - 150, 150, HC.red, q, { glow: 30, type: false }); } } }
  // L3: 33 años al frente · la empresa más valiosa del mundo
  { const D = ST.D; const a = cw(t, K.n33 - 0.1, K.nvidia3 - 0.1); if (a > 0.01) { bigText('33 AÑOS', W / 2, Y, 110, HC.white, a, { glow: 18, type: false, dark: 30 }); bigText('AL FRENTE · COFUNDÓ NVIDIA EN 1993', W / 2, Y + 88, 28, HC.white, a, { dark: 20 }); }
    const b = cw(t, K.valiosa3 - 0.1, K.domingo4 - 0.15); if (b > 0.01) { bigText('N.º 1 DEL MUNDO', W / 2, Y, 92, HG, b, { glow: 22, type: false, dark: 30 }); bigText('5,85 BILLONES $ · OCTUBRE DE 2026', W / 2, Y + 86, 28, HC.white, b, { dark: 20 }); }
    if (D.Z.visible) { lab(D.np, 0, 0.06, 0.02, 'JENSEN HUANG', 'COFUNDADOR Y CEO', cw(t, K.huang3 + 0.2, K.nvidia3 - 0.1), { dx: 130, dy: -170, color: HC.white });
      lab(D.med, 0, 0.0, 0.02, 'LA EMPRESA MÁS VALIOSA', 'DEL MUNDO (OCT. 2026)', cw(t, K.valiosa3 + 0.15, K.domingo4 - 0.1), { dx: -150, dy: -110, color: HG }); } }
  // L4: «Fui infiel a mi mujer»
  { const C = ST.C; const a = cw(t, K.fui4 - 0.05, K.consejo5 - 0.1); if (a > 0.01) { bigText('«FUI INFIEL A MI MUJER»', W / 2, Y, 52, HC.white, a, { glow: 10, dark: 28 }); bigText('CARTA A SUS EMPLEADOS · DOMINGO 8 NOV', W / 2, Y + 80, 26, HG, a, { dark: 20 }); }
    if (C.Z.visible) { lab(C.letter, 0.0, 0.11, 0, 'SU CARTA', '8 DE NOVIEMBRE', cw(t, K.escribio4, K.fui4 - 0.1), { dx: 130, dy: -200, color: HC.white });
      // L5: la investigación y la dimisión
      lab(C.doc, 0, 0.12, 0, 'EL CONSEJO', 'ABRE UNA INVESTIGACIÓN', cw(t, K.consejo5 + 0.1, K.pocos5 - 0.1), { dx: 140, dy: -170, color: HG });
      lab(C.np, 0, 0.03, 0, 'DIMITE', '12 DE NOVIEMBRE', cw(t, K.dimitio5 + 0.25, K.jueves6 - 0.1), { dx: -140, dy: -160, color: HC.red }); }
    const b = cw(t, K.investigacion5 - 0.05, K.dimitio5 - 0.32); if (b > 0.01) { bigText('INVESTIGACIÓN', W / 2, Y - 10, 64, HC.white, b, { glow: 12, type: false, dark: 28 }); bigText('INDEPENDIENTE · LA ABRE EL CONSEJO', W / 2, Y + 64, 28, HG, b, { dark: 20 }); }
    const c = cw(t, K.dimitio5 - 0.05, K.jueves6 - 0.1); if (c > 0.01) { bigText('DIMITE', W / 2, Y, 120, HC.red, c, { glow: 24, type: false, dark: 30 }); bigText('SE ANUNCIA EL 12 DE NOVIEMBRE', W / 2, Y + 90, 28, HC.white, c, { dark: 20 }); } }
  // L6: −13 % al abrir la bolsa
  { const Kk = ST.K; const a = cw(t, K.abrir6 - 0.05, K.hundio6 - 0.32); if (a > 0.01) bigText('JUEVES · APERTURA', W / 2, Y + 20, 56, HC.white, a, { dark: 26 });
    const b = cw(t, K.hundio6 - 0.05, K.respuesta7 - 0.1); if (b > 0.01) { const n = Math.round(13 * eo(clamp((t - K.hundio6 + 0.05) / 0.9))); bigText('−' + n + ' %', W / 2, Y, 140, HC.red, b, { glow: 26, type: false, dark: 30 }); bigText('AL ABRIR LA BOLSA · CAYÓ MÁS DE UN 13 %', W / 2, Y + 100, 26, HC.white, b, { dark: 20 }); }
    if (Kk.Z.visible) lab(Kk.bell.userData.hb, 0, -0.12, 0.05, 'APERTURA', 'JUEVES 12 NOV', cw(t, K.abrir6 + 0.1, K.hundio6 - 0.1), { dx: 130, dy: -170, color: HG }); }
  // L7: ¿objetivo de espionaje extranjero?
  { const P = ST.P; const a = cw(t, K.objetivo7 - 0.05, K.segun8 - 0.1); if (a > 0.01) { bigText('¿OBJETIVO DE ESPIONAJE', W / 2, Y - 10, 46, HC.white, a, { dark: 24 }); bigText('EXTRANJERO?', W / 2, Y + 58, 60, HG, cw(t, K.espionaje7 - 0.1, K.segun8 - 0.1), { glow: 14, dark: 26 }); bigText('LO INVESTIGA EL CONSEJO DE NVIDIA', W / 2, Y + 118, 24, HC.white, a, { dark: 18 }); }
    if (P.Z.visible) { lab(P.fold, 0, 0.0, 0.0, 'LA RESPUESTA', 'LO QUE INVESTIGA EL CONSEJO', cw(t, K.respuesta7 + 0.4, K.espionaje7 - 0.1), { dx: 130, dy: -230, color: HG });
      // L8: las dos relaciones, cada una con el medio que la publica
      lab(P.sil1, 0, 0.36 * 0.74, 0, 'SOSPECHOSA DE ESPIAR', 'PARA CHINA · SEGÚN THE WASHINGTON POST', cw(t, K.sospechosa8, K.y8 - 0.05), { dx: 120, dy: -200, color: HC.red, subSize: 17 });
      lab(P.sil2, 0, 0.24 * 0.74, 0, 'DIRECTIVA A SUS ÓRDENES', 'SEGÚN THE NEW YORK TIMES', cw(t, K.directiva8 + 0.1, K.crees9 - 0.1), { dx: -120, dy: -230, color: HC.white, subSize: 17 }); }
    const b = cw(t, K.mujer8 - 0.05, K.y8 - 0.1); if (b > 0.01) { bigText('LA MUJER CON LA QUE FUE INFIEL', W / 2, Y - 10, 34, HC.white, b, { dark: 22 }); bigText('¿ESPÍA PARA CHINA?', W / 2, Y + 60, 64, HC.red, cw(t, K.sospechosa8 - 0.1, K.y8 - 0.1), { glow: 14, dark: 26 }); bigText('SOSPECHOSA, SEGÚN THE WASHINGTON POST', W / 2, Y + 120, 24, HC.white, cw(t, K.sospechosa8 - 0.1, K.y8 - 0.1), { dark: 18 }); }
    const c = cw(t, K.otra8 - 0.05, K.crees9 - 0.32); if (c > 0.01) { bigText('OTRA RELACIÓN', W / 2, Y - 10, 64, HC.white, c, { glow: 10, type: false, dark: 26 }); bigText('CON UNA DIRECTIVA A SUS ÓRDENES', W / 2, Y + 62, 32, HG, cw(t, K.directiva8 - 0.1, K.crees9 - 0.1), { dark: 20 }); bigText('SEGÚN THE NEW YORK TIMES', W / 2, Y + 116, 24, HC.white, c, { dark: 18 }); } }
  // L9: la pregunta y el envío
  { const Bs = ST.B; const a = cw(t, K.crees9 - 0.05, K.mandaselo9 - 0.3); if (a > 0.01) { bigText('¿POR UNA INFIDELIDAD', W / 2, Y - 10, 50, HC.white, a, { dark: 26 }); bigText('LE TIENEN QUE OBLIGAR A DIMITIR?', W / 2, Y + 62, 42, HG, cw(t, K.obligar9 - 0.15, K.mandaselo9 - 0.05), { glow: 12, dark: 24 }); }
    if (Bs.Z.visible) { lab(Bs.ring, 0, 0.06, 0, 'VIDA PRIVADA', null, cw(t, K.crees9 + 0.3, K.mandaselo9 - 0.1), { dx: -110, dy: -200, color: HG });
      lab(Bs.np, 0, 0.03, 0, 'SU CARGO', null, cw(t, K.crees9 + 0.5, K.mandaselo9 - 0.1), { dx: 110, dy: -230, color: HC.white }); }
    const m = cw(t, K.mandaselo9 - 0.05, END - 0.6); if (m > 0.01) { bigText('MÁNDASELO A QUIEN DIGA', W / 2, Y - 10, 40, HC.white, m, { dark: 24 }); bigText('QUE ES SU VIDA PRIVADA', W / 2, Y + 60, 52, HG, cw(t, K.vida9 - 0.1, END - 0.6), { glow: 14, dark: 26 }); } }
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
    jefe1: atL(1, 'jefe'), nvidia1: atL(1, 'nvidia'), dimitido1: atL(1, 'dimitido'), dias1: atL(1, 'dias'), despues1: atL(1, 'despues'), confesar1: atL(1, 'confesar'), infidelidad1: atL(1, 'infidelidad'),
    pero2: atL(2, 'pero'), empresa2: atL(2, 'empresa'), no2: atL(2, '=no'), investiga2: atL(2, 'investiga'), infiel2: atL(2, 'infiel'), sino2: atL(2, 'sino'), otra2: atL(2, 'otra'), cosa2: atL(2, 'cosa'), digo2: atL(2, 'digo'), final2: atL(2, 'final'),
    jensen3: atL(3, 'jensen'), huang3: atL(3, 'huang'), llevaba3: atL(3, 'llevaba'), n33: atL(3, '=33'), anos3: atL(3, 'anos'), frente3: atL(3, 'frente'), nvidia3: atL(3, 'nvidia'), llego3: atL(3, 'llego'), valiosa3: atL(3, 'valiosa'), mundo3: atL(3, 'mundo'),
    domingo4: atL(4, 'domingo'), escribio4: atL(4, 'escribio'), empleados4: atL(4, 'empleados'), fui4: atL(4, 'fui'), infiel4: atL(4, 'infiel'), mujer4: atL(4, 'mujer'),
    consejo5: atL(5, 'consejo'), abrio5: atL(5, 'abrio'), investigacion5: atL(5, 'investigacion'), pocos5: atL(5, 'pocos'), dimitio5: atL(5, 'dimitio'),
    jueves6: atL(6, 'jueves'), abrir6: atL(6, 'abrir'), bolsa6: atL(6, 'bolsa'), accion6: atL(6, 'accion'), hundio6: atL(6, 'hundio'), mas6: atL(6, '=mas'), n13: atL(6, '=13'),
    respuesta7: atL(7, 'respuesta'), investigan7: atL(7, 'investigan'), huang7: atL(7, 'huang'), objetivo7: atL(7, 'objetivo'), operacion7: atL(7, 'operacion'), espionaje7: atL(7, 'espionaje'), extranjero7: atL(7, 'extranjero'),
    segun8: atL(8, 'segun'), washington8: atL(8, 'washington'), post8: atL(8, 'post'), mujer8: atL(8, 'mujer'), infiel8: atL(8, 'infiel'), sospechosa8: atL(8, 'sospechosa'), espiar8: atL(8, 'espiar'), china8: atL(8, 'china'),
    y8: atL(8, '=y'), york8: atL(8, 'york'), times8: atL(8, 'times'), cuenta8: atL(8, 'cuenta'), otra8: atL(8, 'otra'), relacion8: atL(8, 'relacion'), directiva8: atL(8, 'directiva'), ordenes8: atL(8, 'ordenes'),
    crees9: atL(9, 'crees'), infidelidad9: atL(9, 'infidelidad'), obligar9: atL(9, 'obligar'), dimitir9: atL(9, 'dimitir'), mandaselo9: atL(9, 'mandaselo'), quien9: atL(9, 'quien'), diga9: atL(9, 'diga'), vida9: atL(9, 'vida'), privada9: atL(9, 'privada'),
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
