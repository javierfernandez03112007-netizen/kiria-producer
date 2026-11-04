// «Ni una sola cámara» (lanzamiento de la web del estudio): un móvil con nuestros vídeos del que salen disparados sus objetos, que forman
// «3,2 M»; una cámara de cine que cae y se queda en aristas; la etiqueta del precio; guion → voz → objeto 3D → subtítulos → sonido; 13,99 € y
// 6,99 €; y «comenta KIRIA». window.renderAt(t) dibuja el instante t (60 fps).
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
// ---------------------------------------------------------------- piezas: el móvil, los objetos de nuestros vídeos, «3,2 M», los 7 días, la cámara de cine,
// las etiquetas del precio, el guion, la onda de la voz, el mazo y su taco, la torre de palabras, el toldo y el bocadillo «KIRIA»
let FONT3 = null;
const PHN = { w: 0.82, h: 1.72, d: 0.085, sw: 0.765, sh: 1.66, y: 0.92 };      // móvil de pie (centro a y = PHN.y)
const WKZ = 1.0;                                                                // zona de trabajo delante del móvil (guion, onda, mazo, torre)
const PIV = v3(0, 0.255, WKZ + 0.48);                                           // eje del mazo (el mango apunta hacia la cámara; la cabeza, de lado)
const SCR = { w: 540, h: Math.round(540 * PHN.sh / PHN.sw) };                    // lienzo de la pantalla
const REELS = [];                                                               // [vídeo][fotograma] imágenes de nuestros vídeos
let PRODUCTO = null;                                                            // foto de ejemplo de «tu objeto» (un dibujo: tarro de mermelada)

function rplane(w, h, r, seg = 10) { const g = new THREE.ShapeGeometry(rrShape(w, h, r), seg); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5); return g; }
// texto 3D (Inter Black); centrado en x y en z; en y, centrado o sobre la línea base (base = true)
function text3(str, size, depth, mats, { bevel = 0.008, base = false } = {}) {
  const g = new TextGeometry(str, { font: FONT3, size, depth, curveSegments: 8, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.55, bevelSegments: 2 });
  g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, base ? 0 : -(b.max.y + b.min.y) / 2, -(b.max.z + b.min.z) / 2);
  const m = new THREE.Mesh(g, mats); m.castShadow = true; m.receiveShadow = true; m.userData.w = b.max.x - b.min.x; m.userData.h = b.max.y - b.min.y; return m;
}
const isLine = o => o.isLineSegments2 || o.isLine2;
function faceOp(g, a) {        // solo las caras (las aristas no se tocan)
  g.traverse(o => { if (!o.isMesh || isLine(o) || !o.material || o.userData.keepOp) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) { const tr = a < 0.999; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = a; m.depthWrite = a > 0.6; m.visible = a > 0.003; } });
}
function edgeOp(g, a, k = 1) {   // aristas: opacidad y cuántas se dibujan (k de 0 a 1)
  g.traverse(o => { if (!isLine(o)) return; o.material.opacity = a; o.visible = a > 0.003 && k > 0.001; const n = o.userData.n0 ?? (o.userData.n0 = o.geometry.instanceCount === Infinity || o.geometry.instanceCount == null ? o.geometry.attributes.instanceStart.count : o.geometry.instanceCount); o.geometry.instanceCount = Math.max(0, Math.round(n * clamp(k))); });
}

// ---------------------------------------------------------------- el móvil
function buildPhone() {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshPhysicalMaterial({ color: 0x0b0c10, roughness: 0.28, metalness: 0.65, clearcoat: 1, clearcoatRoughness: 0.05 });
  const body = rbox(PHN.w, PHN.h, PHN.d, bodyM, 0.13); g.add(body);
  const rimM = metal(0x9aa0aa, 0.22);
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(PHN.w + 0.006, PHN.h + 0.006, 0.12), { depth: 0.03, bevelEnabled: false, curveSegments: 12 }), rimM);
  rim.geometry.translate(0, 0, -0.015); rim.scale.z = 1; g.add(rim);
  for (const [y, h] of [[0.42, 0.16], [0.18, 0.09], [0.06, 0.09]]) { const b = rbox(0.012, h, 0.022, rimM, 0.005); b.position.set(y > 0.3 ? PHN.w / 2 + 0.006 : -PHN.w / 2 - 0.006, y, 0); g.add(b); }
  const T = canvasTex(SCR.w, SCR.h); T.anisotropy = 8;
  const scr = new THREE.Mesh(rplane(PHN.sw, PHN.sh, 0.1), new THREE.MeshBasicMaterial({ map: T, toneMapped: false, color: new THREE.Color(1.18, 1.18, 1.18) }));
  scr.position.z = PHN.d / 2 + 0.0012; g.add(scr);
  const glass = new THREE.Mesh(rplane(PHN.sw + 0.02, PHN.sh + 0.02, 0.11), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.16, depthWrite: false }));
  glass.position.z = PHN.d / 2 + 0.0035; g.add(glass);
  g.position.set(0, PHN.y, 0); scene.add(g);
  S.phone = g; S.scrT = T; S.scr = scr;
}

// ---------------------------------------------------------------- objetos de nuestros vídeos (salen disparados de la pantalla)
function gavel() {          // mazo de madera con anillas de latón: el mango va de (0,0,0) hacia -x; la cabeza, en x = -GL
  const g = new THREE.Group(), GL = 0.48;
  const handle = cyl(0.02, 0.026, GL - 0.03, M.woodL, 20); handle.rotation.z = Math.PI / 2; handle.position.x = -(GL - 0.03) / 2; g.add(handle);
  const knob = sph(0.03, M.woodL, 20, 14); knob.scale.set(1.3, 1, 1); g.add(knob);
  const head = cyl(0.075, 0.075, 0.24, M.wood, 40); head.rotation.x = Math.PI / 2; head.position.x = -GL; g.add(head);
  for (const z of [-0.07, 0.07]) { const b = cyl(0.079, 0.079, 0.02, M.brass, 40); b.rotation.x = Math.PI / 2; b.position.set(-GL, 0, z); g.add(b); }
  for (const z of [-0.125, 0.125]) { const c = cyl(0.064, 0.072, 0.012, M.wood, 40); c.rotation.x = Math.PI / 2; c.position.set(-GL, 0, z); g.add(c); }
  g.userData.GL = GL; return g;
}
function reflexHammer() {   // martillo de reflejos: cabeza triangular de goma roja y mango cromado
  const g = new THREE.Group();
  const hgeo = new THREE.CylinderGeometry(0.09, 0.09, 0.03, 3, 1); hgeo.rotateX(Math.PI / 2); hgeo.rotateZ(Math.PI / 6);
  const head = new THREE.Mesh(hgeo, plastic(0xd2343c, 0.4)); head.castShadow = true; g.add(head);
  const handle = cyl(0.011, 0.013, 0.4, M.silver, 18); handle.position.y = -0.24; g.add(handle);
  const cap = sph(0.016, M.silver); cap.position.y = -0.44; g.add(cap);
  return g;
}
function keyMesh() {        // llave dorada
  const g = new THREE.Group();
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.022, 14, 40), M.gold); bow.castShadow = true; g.add(bow);
  const sh = rbox(0.25, 0.036, 0.018, M.gold, 0.008); sh.position.x = 0.19; g.add(sh);
  for (const [x, h] of [[0.18, 0.034], [0.22, 0.05], [0.26, 0.028], [0.295, 0.044]]) { const tt = rbox(0.022, h, 0.016, M.gold, 0.004); tt.position.set(x, -0.016 - h / 2 + 0.004, 0); g.add(tt); }
  return g;
}
function goggles() {        // gafas de esquí: pantalla de espejo naranja, montura negra y cinta
  const g = new THREE.Group(), Rr = 0.34, p0 = Math.PI / 2 - 0.6, pl = 1.2, t0 = Math.PI / 2 - 0.2, tl = 0.4;
  const lensM = new THREE.MeshPhysicalMaterial({ color: 0xff8a33, metalness: 1, roughness: 0.1, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [200, 700] });
  const lens = new THREE.Mesh(new THREE.SphereGeometry(Rr, 48, 16, p0, pl, t0, tl), lensM); lens.position.z = -Rr + 0.05; g.add(lens);
  const pt = (ph, th, r = Rr + 0.004) => v3(-r * Math.cos(ph) * Math.sin(th), r * Math.cos(th), r * Math.sin(ph) * Math.sin(th) - Rr + 0.05);
  const pts = []; const N = 20;
  for (let i = 0; i <= N; i++) pts.push(pt(p0 + pl * i / N, t0));
  for (let i = 1; i <= 6; i++) pts.push(pt(p0 + pl, t0 + tl * i / 6));
  for (let i = N - 1; i >= 0; i--) pts.push(pt(p0 + pl * i / N, t0 + tl));
  for (let i = 5; i >= 1; i--) pts.push(pt(p0, t0 + tl * i / 6));
  const frM = plastic(0x15161a, 0.35); g.add(tube(pts, 0.016, frM, 140, true, 10));
  const sp = [], L = pts[N], Rg = pts[0];
  for (let i = 0; i <= 16; i++) { const a = Math.PI * i / 16; sp.push(v3(Math.cos(a) * (Rg.x - L.x) / 2 * 1.05 + (Rg.x + L.x) / 2, 0, -Math.sin(a) * 0.3 + Rg.z)); }
  g.add(tube(sp, 0.012, plastic(0x22252c, 0.6), 60));
  return g;
}

// ---------------------------------------------------------------- «3,2 M», los 7 días y la nube de ▶
function buildNumber() {
  const m = paint(0xf2f3f5, 0.2, 1), parts = ['3', ',', '2', 'M'], size = 0.36, gap = 0.035, sp = 0.09;
  const ms = parts.map(c => text3(c, size, 0.11, m, { base: true, bevel: 0.01 }));
  let w = 0; ms.forEach((o, i) => { w += o.userData.w + (i ? (i === 3 ? sp : gap) : 0); });
  let x = -w / 2; const g = new THREE.Group(); g.position.set(0, 2.14, 0.12); scene.add(g);
  ms.forEach((o, i) => { if (i) x += i === 3 ? sp : gap; o.position.x = x + o.userData.w / 2; x += o.userData.w; g.add(o); o.userData.home = o.position.clone(); });
  S.num = { g, ms };
  // días: L M X J V S D
  S.days = 'LMXJVSD'.split('').map((c, i) => {
    const t = new THREE.Group(); const b = rbox(0.145, 0.185, 0.03, plastic(0x17191e, 0.3), 0.02); t.add(b);
    const f = textPlane(0.12, 0.16, (gg, w2, h2) => { gg.fillStyle = 'rgba(238,242,246,.95)'; gg.fillRect(0, 0, w2, h2 * 0.2); gg.fillStyle = '#17191e'; gg.fillRect(w2 * 0.2, h2 * 0.05, w2 * 0.12, h2 * 0.1); gg.fillRect(w2 * 0.68, h2 * 0.05, w2 * 0.12, h2 * 0.1);
      gg.fillStyle = '#eef2f6'; gg.font = `900 ${h2 * 0.58}px Inter`; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText(c, w2 / 2, h2 * 0.62); }, 128);
    f.position.z = 0.017; t.add(f); t.position.set(-0.51 + i * 0.17, 1.95, 0.1); scene.add(t); return t;
  });
  // ▶ que suben de la pantalla a las cifras
  const tri = new THREE.Shape(); tri.moveTo(-0.4, -0.5); tri.lineTo(0.55, 0); tri.lineTo(-0.4, 0.5); tri.lineTo(-0.4, -0.5);
  const im = new THREE.InstancedMesh(new THREE.ShapeGeometry(tri), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.3), toneMapped: false, transparent: true, depthWrite: false, side: THREE.DoubleSide }), 420);
  im.frustumCulled = false; im.renderOrder = 6; scene.add(im); S.plays = im;
  S.playData = Array.from({ length: 420 }, (_, i) => ({ a: v3((hash(i * 1.3) - 0.5) * 0.66, PHN.y + (hash(i * 2.7) - 0.5) * 1.5, PHN.d / 2 + 0.01), d: 0.55 + hash(i * 5.1) * 0.35, t0: hash(i * 7.7) * 0.75, gl: i % 4, u: hash(i * 9.1), v: hash(i * 3.3), s: 0.028 + hash(i * 6.6) * 0.022 }));
}

// ---------------------------------------------------------------- cámara de cine (caras oscuras con aristas blancas)
function buildMovieCam() {
  const g = new THREE.Group();
  const body = bx(0.36, 0.21, 0.15); g.add(body);
  const lens = solid(new THREE.CylinderGeometry(0.052, 0.052, 0.11, 20)); lens.rotation.z = Math.PI / 2; lens.position.x = 0.235; g.add(lens);
  const hood = solid(new THREE.CylinderGeometry(0.085, 0.058, 0.07, 4, 1, false)); hood.rotation.z = Math.PI / 2; hood.rotation.x = Math.PI / 4; hood.position.x = 0.32; g.add(hood);
  const r1 = solid(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 22)); r1.rotation.x = Math.PI / 2; r1.position.set(-0.075, 0.205, 0); g.add(r1);
  const r2 = solid(new THREE.CylinderGeometry(0.082, 0.082, 0.035, 20)); r2.rotation.x = Math.PI / 2; r2.position.set(0.105, 0.19, 0); g.add(r2);
  const vf = bx(0.09, 0.05, 0.05); vf.position.set(-0.215, 0.05, 0.05); g.add(vf);
  const leg = bx(0.05, 0.06, 0.05); leg.position.set(0, -0.135, 0); g.add(leg);
  g.position.set(0.42, 0.165, 1.25); scene.add(g); S.mcam = g;
  // aristas en coordenadas del mundo (pose en el suelo): de aquí salen las líneas que forman la etiqueta
  g.rotation.set(0, -0.5, 0); g.updateMatrixWorld(true);
  const segs = []; g.traverse(o => { if (!isLine(o)) return; const a = o.geometry.attributes.instanceStart, b = o.geometry.attributes.instanceEnd; for (let i = 0; i < a.count; i++) segs.push([v3(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix4(o.matrixWorld), v3(b.getX(i), b.getY(i), b.getZ(i)).applyMatrix4(o.matrixWorld)]); });
  S.camSegs = segs;
}

// ---------------------------------------------------------------- etiquetas del precio
function tagShape(s = 1) {
  const W2 = 0.3 * s, H2 = 0.17 * s, xp = -0.17 * s, r = 0.03 * s, sh = new THREE.Shape();
  sh.moveTo(-0.3 * s, 0); sh.lineTo(xp, H2); sh.lineTo(W2 - r, H2); sh.quadraticCurveTo(W2, H2, W2, H2 - r); sh.lineTo(W2, -H2 + r); sh.quadraticCurveTo(W2, -H2, W2 - r, -H2); sh.lineTo(xp, -H2); sh.lineTo(-0.3 * s, 0);
  const hole = new THREE.Path(); hole.absarc(-0.215 * s, 0, 0.026 * s, 0, Math.PI * 2, true); sh.holes.push(hole); return sh;
}
function drawTag(T, big, small, col = '#111317') {
  const g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height; g.clearRect(0, 0, w, h);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col;
  let fs = h * 0.56; g.font = `900 ${fs}px Inter`; const tw = g.measureText(big).width; if (tw > w * 0.9) { fs *= w * 0.9 / tw; g.font = `900 ${fs}px Inter`; }
  g.fillText(big, w / 2, h * (small ? 0.6 : 0.52));
  if (small) { g.font = `800 ${h * 0.15}px SpaceMono`; g.letterSpacing = '6px'; g.fillStyle = '#5c636d'; g.fillText(small, w / 2, h * 0.2); g.letterSpacing = '0px'; }
  T.needsUpdate = true;
}
function priceTag(s = 1) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(tagShape(s), { depth: 0.012 * s, bevelEnabled: true, bevelThickness: 0.005 * s, bevelSize: 0.005 * s, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -0.006 * s);
  const body = new THREE.Mesh(geo, paint(0xf4f0e6, 0.35, 0.6)); body.castShadow = true; g.add(body);
  const mk = rot => { const T = canvasTex(520, 300); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.44 * s, 0.254 * s), new THREE.MeshBasicMaterial({ map: T, transparent: true, depthWrite: false, toneMapped: false }));
    p.position.set(0.075 * s, 0, rot ? -0.0122 * s : 0.0122 * s); if (rot) p.rotation.y = Math.PI; p.renderOrder = 7; g.add(p); return T; };
  const fT = mk(false), bT = mk(true);
  const str = tube([v3(-0.215 * s, 0, 0), v3(-0.28 * s, 0.09 * s, 0.01 * s), v3(-0.31 * s, 0.24 * s, 0), v3(-0.27 * s, 0.4 * s, -0.01 * s)], 0.0035, plastic(0x2a2c31, 0.6), 30); g.add(str);
  g.userData = { fT, bT, s, body }; scene.add(g); return g;
}

// ---------------------------------------------------------------- guion, onda de la voz, mazo + taco, torre de palabras
function buildWork() {
  // el guion: papel un poco curvado que sale de la pantalla
  const T = canvasTex(620, 860); const geo = new THREE.PlaneGeometry(0.62, 0.86, 16, 1); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, 0.035 * (x / 0.31) ** 2); } geo.computeVertexNormals();
  const paper = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: T, roughness: 0.8, side: THREE.DoubleSide, transparent: true })); paper.castShadow = true; scene.add(paper);
  S.paper = paper; S.paperT = T;
  // 24 barras: primero son las líneas del guion; luego, la onda de la voz
  S.barM = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.4, toneMapped: true });
  S.bars = Array.from({ length: 24 }, () => { const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), S.barM); b.castShadow = true; scene.add(b); return b; });
  // el mazo (eje en PIV) y su taco
  const pv = new THREE.Group(); pv.position.copy(PIV); scene.add(pv); const gv = gavel(); gv.rotation.y = -Math.PI / 2; pv.add(gv);
  gv.traverse(o => { if (o.isMesh && !isLine(o)) edges(o, 0xf4f8ff, 2.3, 22, 1); });
  S.gavel = { pv, gv };
  const blk = new THREE.Group(); const b0 = cyl(0.2, 0.21, 0.16, M.wood, 48); b0.position.y = 0.08; blk.add(b0);
  const b1 = cyl(0.212, 0.212, 0.02, M.brass, 48); b1.position.y = 0.17; blk.add(b1);
  blk.position.set(0, 0, WKZ); scene.add(blk); S.block = blk;
  // la torre: cada palabra del subtítulo es un bloque (normal: oscuro con letra blanca; la que suena: blanco con letra negra)
  const words = [['SUBTÍTULOS', 0.6], ['PALABRA', 0.37], ['A', 0.13], ['PALABRA', 0.37]];
  S.tower = words.map(([w, wd], i) => {
    const g = new THREE.Group(); const blkM = plastic(0x14161b, 0.3); const box = rbox(wd, 0.1, 0.1, blkM, 0.022); g.add(box);
    const mkT = (bg, fg) => canvasTex(Math.round(480 * wd / 0.4), 120, (gg, w2, h2) => { if (bg) { gg.fillStyle = bg; rr(gg, 6, 6, w2 - 12, h2 - 12, 16); gg.fill(); }
      gg.fillStyle = fg; gg.font = `400 ${h2 * 0.8}px Bebas`; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.letterSpacing = '4px'; gg.fillText(w, w2 / 2, h2 * 0.54); });
    const tN = mkT(null, '#f3f5f8'), tH = mkT('#f3f5f8', '#0d0e11');
    const fp = new THREE.Mesh(new THREE.PlaneGeometry(wd * 0.96, 0.096), new THREE.MeshBasicMaterial({ map: tN, transparent: true, depthWrite: false, toneMapped: false })); fp.position.z = 0.0505; fp.renderOrder = 7; g.add(fp);
    scene.add(g); return { g, fp, tN, tH, wd, blkM };
  });
  // anillos del sonido
  S.rings = Array.from({ length: 7 }, () => { const r = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 96), basicGlow(0xffffff, 1.4)); r.rotation.x = -Math.PI / 2; r.renderOrder = 8; scene.add(r); return r; });
  // onda expansiva del golpe
  S.shock = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 96), basicGlow(0xffe7b0, 2.2)); S.shock.rotation.x = -Math.PI / 2; S.shock.position.set(0, 0.012, WKZ); S.shock.renderOrder = 8; scene.add(S.shock);
  S.sp = sparks(scene, 90, 0xffe2a0, 0.03);
}

// ---------------------------------------------------------------- tu negocio (toldo) y el bocadillo «KIRIA»
function buildCTA() {
  const aw = new THREE.Group(); aw.position.set(0, PHN.y + PHN.h / 2 + 0.11, 0.02); scene.add(aw);
  const n = 7, sw = (PHN.w + 0.16) / n, wM = paint(0xf2f2f2, 0.45, 0.3), dM = paint(0x1b1d22, 0.45, 0.3);
  S.slats = [];
  for (let i = 0; i < n; i++) { const piv = new THREE.Group(); piv.position.x = -(PHN.w + 0.16) / 2 + sw * (i + 0.5); aw.add(piv);
    const sl = rbox(sw * 0.98, 0.012, 0.42, i % 2 ? dM : wM, 0.004); sl.position.z = 0.21; piv.add(sl);
    const val = rbox(sw * 0.98, 0.075, 0.01, i % 2 ? dM : wM, 0.004); val.position.set(0, -0.034, 0.42); piv.add(val);
    S.slats.push(piv); }
  const bar = cyl(0.012, 0.012, PHN.w + 0.2, metal(0x9aa0aa, 0.25), 12); bar.rotation.z = Math.PI / 2; aw.add(bar);
  S.awning = aw;
  // bocadillo
  const bw = 0.62, bh = 0.27, r = 0.09, s = new THREE.Shape(), x0 = -bw / 2, y0 = -bh / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x0 + 0.16, y0); s.lineTo(x0 + 0.05, y0 - 0.1); s.lineTo(x0 + 0.26, y0); s.lineTo(x0 + bw - r, y0); s.quadraticCurveTo(x0 + bw, y0, x0 + bw, y0 + r);
  s.lineTo(x0 + bw, y0 + bh - r); s.quadraticCurveTo(x0 + bw, y0 + bh, x0 + bw - r, y0 + bh); s.lineTo(x0 + r, y0 + bh); s.quadraticCurveTo(x0, y0 + bh, x0, y0 + bh - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const bg = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.016, bevelSegments: 4, curveSegments: 14 }); bg.translate(0, 0, -0.025);
  const bub = new THREE.Group(); const bm = new THREE.Mesh(bg, paint(0xf6f6f7, 0.25, 1)); bm.castShadow = true; bub.add(bm);
  const lm = paint(0x111317, 0.25, 1);
  S.letters = 'KIRIA'.split('').map(c => text3(c, 0.13, 0.03, lm, { bevel: 0.005 }));
  let lw = 0; S.letters.forEach((o, i) => { lw += o.userData.w + (i ? 0.022 : 0); });
  let lx = -lw / 2; S.letters.forEach((o, i) => { if (i) lx += 0.022; o.position.set(lx + o.userData.w / 2, 0.004, 0.06); lx += o.userData.w; bub.add(o); });
  scene.add(bub); S.bubble = bub;
}

// ---------------------------------------------------------------- «prueba tu objeto en 3D»: la foto, el tarro en 3D, el ¿? y el avión de papel
function buildProduct() {
  const T = canvasTex(400, 480, (g, w, h) => { g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h); const im = PRODUCTO, s = Math.max((w - 40) / im.width, (h - 120) / im.height);
    g.save(); g.beginPath(); g.rect(20, 20, w - 40, h - 120); g.clip(); g.drawImage(im, 20 + (w - 40 - im.width * s) / 2, 20 + (h - 120 - im.height * s) / 2, im.width * s, im.height * s); g.restore();
    g.fillStyle = '#2a2c31'; g.font = '900 38px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TU OBJETO', w / 2, h - 52); });
  const card = new THREE.Group(); card.add(rbox(0.4, 0.48, 0.012, paint(0xf4f1e8, 0.5, 0.3), 0.012));
  const cf = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.48), new THREE.MeshStandardMaterial({ map: T, roughness: 0.6 })); cf.position.z = 0.0066; card.add(cf);
  scene.add(card); S.card = card;
  const jar = new THREE.Group(), r = 0.17;
  jar.add(lathe([[0.001, 0], [r - 0.02, 0], [r, 0.02], [r, 0.27], [r - 0.006, 0.29], [r - 0.024, 0.305], [r - 0.024, 0.33]], 64, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transparent: true, opacity: 0.22, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false })));
  jar.add(lathe([[0.001, 0.008], [r - 0.012, 0.008], [r - 0.008, 0.02], [r - 0.008, 0.26], [0.001, 0.262]], 64, plastic(0xb3122a, 0.25)));
  jar.add(lathe([[r - 0.012, 0.31], [r - 0.006, 0.312], [r - 0.006, 0.37], [r - 0.012, 0.376], [0.001, 0.377]], 64, metal(0xd4a640, 0.28)));
  const LT = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(40,36,30,.6)'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#2a2c31'; g.font = '900 64px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TU MARCA', w / 2, 92);
    g.fillStyle = '#b3122a'; g.font = '800 30px Inter'; g.fillText('FRESA · HECHA A MANO', w / 2, 150);
    [[150, 205], [256, 212], [362, 205]].forEach(([x, y]) => { g.fillStyle = '#e8434f'; g.beginPath(); g.ellipse(x, y, 20, 24, 0, 0, 7); g.fill(); g.fillStyle = '#3f9a3f'; g.beginPath(); g.moveTo(x - 14, y - 18); g.lineTo(x, y - 32); g.lineTo(x + 14, y - 18); g.closePath(); g.fill(); }); });
  const label = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.003, r + 0.003, 0.16, 64, 1, true, -1.1, 2.2), new THREE.MeshStandardMaterial({ map: LT, roughness: 0.6 })); label.position.y = 0.14; jar.add(label);
  jar.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(jar); S.jar = jar;
  const q = qmark(paint(0xf2f3f5, 0.2, 1)); scene.add(q); S.q = q;
  const pl = new THREE.Group(), pm = new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.45, side: THREE.DoubleSide });
  const tri = (a, b, c) => { const g = new THREE.BufferGeometry().setFromPoints([a, b, c]); g.computeVertexNormals(); const m = new THREE.Mesh(g, pm); m.castShadow = true; return m; };
  pl.add(tri(v3(0, 0, 0.3), v3(-0.17, 0.02, -0.12), v3(0, -0.02, -0.1)), tri(v3(0, 0, 0.3), v3(0.17, 0.02, -0.12), v3(0, -0.02, -0.1)), tri(v3(0, 0, 0.3), v3(0, -0.02, -0.1), v3(0, -0.09, -0.11)));
  scene.add(pl); S.plane = pl;
}

function buildLaunch() {
  buildPhone(); buildNumber(); buildMovieCam(); buildWork(); buildCTA(); buildProduct();
  // objetos que salen de la pantalla (posición y giro en el primer fotograma, y a qué cifra van)
  const birr = birrete(); birr.scale.setScalar(0.42);
  const doll = makeDoll(M.gold); doll.scale.setScalar(0.62);
  const gv = gavel(); const gvG = new THREE.Group(); gv.position.x = 0.24; gvG.add(gv);
  S.burst = [
    { o: gvG, p: v3(-0.3, 1.46, 1.3), r: [0.4, 0.7, 0.5], gl: 0, w: [1.2, 2.1, 0.6] },
    { o: keyMesh(), p: v3(-0.3, 0.66, 1.45), r: [0.3, -0.5, 0.9], gl: 1, w: [2.4, 1.2, 3.1] },
    { o: reflexHammer(), p: v3(0.36, 1.12, 1.4), r: [0.2, 0.4, -0.6], gl: 2, w: [1.5, 2.6, 1.1] },
    { o: goggles(), p: v3(0.3, 1.72, 1.05), r: [0.15, -0.6, 0.25], gl: 3, w: [0.8, 1.6, 0.5] },
    { o: birr, p: v3(-0.08, 2.0, 0.95), r: [0.5, 0.3, -0.3], gl: 3, w: [1.3, 0.9, 1.7], s0: 0.42 },
    { o: doll, p: v3(-0.48, 1.05, 1.0), r: [0.2, 0.9, 0.5], gl: 3, w: [1.9, 1.1, 0.9], s0: 0.62 },
  ];
  for (const b of S.burst) { b.o.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(b.o); }
  // cristales de la pantalla
  const shM = new THREE.MeshPhysicalMaterial({ color: 0xdfe9f5, roughness: 0.03, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  S.shards = Array.from({ length: 56 }, (_, i) => { const s = new THREE.Shape(), k = 0.045 + hash(i * 4.4) * 0.1; s.moveTo(0, 0); s.lineTo(k * (0.6 + hash(i) * 0.8), k * 0.25); s.lineTo(k * 0.2, k * (0.7 + hash(i * 2) * 0.6)); s.lineTo(0, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), shM); edges(m, 0xeef4ff, 1.1, 1, 0.55); scene.add(m);
    return { m, a: v3((hash(i * 1.7) - 0.5) * 0.7, PHN.y + (hash(i * 2.3) - 0.5) * 1.5, 0.06), v: v3((hash(i * 3.1) - 0.5) * 1.4, (hash(i * 5.3) - 0.35) * 1.1, 0.6 + hash(i * 6.9) * 1.2), w: hash(i * 8.1) * 6 }; });
  // las aristas de la cámara de cine vuelan y se meten en la pantalla del móvil (allí salen los resultados)
  const nSeg = S.camSegs.length; S.morph = segSet(nSeg, 0xeef2f6, 2.6, 1); scene.add(S.morph);
  S.tagSegs = Array.from({ length: nSeg }, (_, i) => { const p = v3((hash(i * 1.7) - 0.5) * 0.6, PHN.y + (hash(i * 3.9) - 0.5) * 1.4, PHN.d / 2 + 0.01); return [p, p.clone()]; });
}
// ---------------------------------------------------------------- tiempos y animación de cada pieza (todo es función del instante t: se puede dibujar en cualquier orden)
const inSeg = (t, a, b) => t >= a && t < b;
const sinL = (t, f, ph = 0) => Math.sin(2 * Math.PI * Math.max(1, Math.round(f * END / (2 * Math.PI))) * t / END + ph);     // periódico en END (bucle sin saltos)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const easeIn = x => x * x * x;
let TT = {};
function buildTimes() {
  TT = {
    glyph: [K.k32 + 0.17, K.coma1 + 0.1, K.dos1 + 0.06, K.millones1 + 0.05],     // «3», «,», «2», «M» (al oírlos)
    loop: END - 0.75,                                                 // los objetos vuelven a salir de la pantalla (bucle)
    land: K.camara1 + 0.03,                                           // la cámara de cine toca el suelo
    slam: K.oyes5 + 0.03,                                             // el mazo golpea el taco
    words: [K.subtitulos6, K.palabra6, K.a6, K.palabra6b].map(x => x + 0.03),
    suck: K.ademas8 + 0.02,                                           // las palabras y el taco se meten en la pantalla del móvil
    morph0: K.camara1 + 0.43, morph1: K.mas2 + 0.5,                  // las aristas de la cámara de cine se meten en la pantalla: los resultados
    swipes: [0.95, 2.1, 3.3, 10.0, 12.6, 15.0, 18.0, K.videos11 - 0.05, K.videos11 + 0.4, END - 0.7],   // 10: el bucle vuelve al mismo vídeo
  };
  TT.rings = [[K.sonido7, 4], [K.sonido7 + 0.12, 4], [K.efecto7, 0], [K.a7, 1], [K.efecto7b, 2], [K.efecto7b + 0.13, 3]];
}

// ---------------------------------------------------------------- la pantalla del móvil (lienzo 2D)
const pingpong = (k, n) => { const m = k % (2 * n - 2); return m < n ? m : 2 * n - 2 - m; };
function feedIdx(t) { let n = 0, last = -9; for (const s of TT.swipes) if (t >= s) { n++; last = s; } return { n, u: clamp((t - last) / 0.26) }; }
function drawReel(g, i, t, y0) {
  const R = REELS[i % REELS.length]; const im = R[pingpong(Math.floor(Math.max(0, t) * 10), R.length)];
  const w = SCR.w, h = w * 16 / 9, y = y0 + (SCR.h - h) / 2; g.drawImage(im, 0, y, w, h);
}
function icons(g, a = 1) {      // iconos genéricos de un vídeo vertical (sin logotipos): me gusta, comentar, enviar
  g.save(); g.globalAlpha = a; g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.lineJoin = 'round'; g.lineCap = 'round'; const x = SCR.w - 58; let y = SCR.h - 430;
  g.beginPath(); g.moveTo(x, y + 18); g.bezierCurveTo(x - 34, y - 6, x - 22, y - 34, x, y - 16); g.bezierCurveTo(x + 22, y - 34, x + 34, y - 6, x, y + 18); g.stroke();
  y += 92; g.beginPath(); g.arc(x, y, 22, 0.4, Math.PI * 2 - 0.1); g.lineTo(x + 26, y + 24); g.closePath(); g.stroke();
  y += 92; g.beginPath(); g.moveTo(x - 24, y - 6); g.lineTo(x + 24, y - 22); g.lineTo(x + 8, y + 24); g.lineTo(x - 2, y + 2); g.closePath(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(46, SCR.h - 196, 22, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.75)'; rr(g, 82, SCR.h - 210, 170, 22, 11); g.fill(); g.fillStyle = 'rgba(255,255,255,.45)'; rr(g, 30, SCR.h - 158, 330, 18, 9); g.fill();
  g.restore();
}
function statusBar(g, dark = true) {
  g.fillStyle = dark ? '#ffffff' : '#111111'; g.font = '700 30px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('9:41', 40, 44);
  rr(g, SCR.w - 92, 30, 52, 26, 7); g.lineWidth = 3; g.strokeStyle = g.fillStyle; g.stroke(); g.fillRect(SCR.w - 88, 34, 38, 18);
  g.fillStyle = '#000000'; rr(g, SCR.w / 2 - 70, 18, 140, 44, 22); g.fill();
}
function drawFeed(g, t) {
  const { n, u } = feedIdx(t), e = eio(u);
  g.fillStyle = '#000'; g.fillRect(0, 0, SCR.w, SCR.h);
  if (u < 1) { drawReel(g, n + 9, t, -e * SCR.h); drawReel(g, n, t, (1 - e) * SCR.h); } else drawReel(g, n, t, 0);
  icons(g, 1); statusBar(g, true);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, SCR.h - 8, SCR.w, 4); g.fillStyle = '#ffffff'; g.fillRect(0, SCR.h - 8, SCR.w * ((t / END * 12) % 1), 4);
}
// resultados reales de la cuenta (ver FUENTES.md): visualizaciones (panel de Instagram, dato de Javi) y Metricool (seguidores, me gusta, envíos)
const STATS = [['3,2 M', 'visualizaciones en 7 días', 3.2, v => v.toFixed(1).replace('.', ',') + ' M'],
  ['+2.500', 'seguidores nuevos en 6 días', 2500, v => '+' + miles(v)],
  ['+150.000', 'me gusta en 2 semanas', 150000, v => '+' + miles(v)],
  ['+37.000', 'veces enviados en 2 semanas', 37000, v => '+' + miles(v)]];
function miles(v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
const GAINS = [124, 93, 127, 140, 975, 1138];      // seguidores nuevos por día, 27 oct – 1 nov (Metricool)
function drawStats(g, t, k) {
  g.fillStyle = '#0b0c0f'; g.fillRect(0, 0, SCR.w, SCR.h); statusBar(g, true);
  g.save(); g.globalAlpha = k; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#ffffff'; g.font = '900 44px Inter'; g.fillText('Resultados', 36, 204);      // más abajo que la barra de estado: el subtítulo no lo pisa
  g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '500 24px Inter'; g.fillText('de nuestros propios vídeos', 36, 240);
  let y = 296;
  STATS.forEach(([fin, lab, val, fmt], i) => {
    const u = eo(clamp((t - K.mas2 - 0.05 - i * 0.16) / 0.8)), a = clamp((t - K.mas2 + 0.1 - i * 0.16) / 0.25);
    g.globalAlpha = k * a; g.fillStyle = '#16181d'; rr(g, 24, y, SCR.w - 48, 176, 26); g.fill();
    if (i === 1) { const hl = cwin(t, K.n2500, K.como2 - 0.1, 0.2, 0.3); if (hl > 0) { g.save(); g.globalAlpha = k * a * hl; g.strokeStyle = '#7cf0a9'; g.lineWidth = 6; g.shadowColor = '#7cf0a9'; g.shadowBlur = 24; rr(g, 24, y, SCR.w - 48, 176, 26); g.stroke(); g.restore(); } }
    g.fillStyle = i === 0 ? '#ffc24a' : '#ffffff'; g.font = '900 78px Inter'; g.fillText(u >= 0.999 ? fin : fmt(val * u), 52, y + 96);
    g.fillStyle = 'rgba(255,255,255,.62)'; g.font = '600 27px Inter'; g.fillText(lab, 54, y + 142);
    if (i === 1) { const mx = Math.max(...GAINS), bw = 22, x0 = SCR.w - 56 - GAINS.length * (bw + 8); GAINS.forEach((v, j) => { const h = 72 * v / mx * eo(clamp((t - K.seis2 - 0.1 - j * 0.06) / 0.5)); g.fillStyle = j >= 4 ? '#7cf0a9' : 'rgba(124,240,169,.45)'; rr(g, x0 + j * (bw + 8), y + 98 - h, bw, Math.max(4, h), 5); g.fill(); }); }
    y += 196;
  });
  g.restore();
}
function drawComments(g, t, k, typed, posted) {
  drawFeed(g, t);
  g.fillStyle = `rgba(0,0,0,${0.45 * k})`; g.fillRect(0, 0, SCR.w, SCR.h);
  const top = SCR.h - (SCR.h * 0.62) * eo(k); g.save(); g.fillStyle = '#16181d'; rr(g, 0, top, SCR.w, SCR.h, 34); g.fill();
  g.fillStyle = 'rgba(255,255,255,.3)'; rr(g, SCR.w / 2 - 40, top + 18, 80, 8, 4); g.fill();
  g.fillStyle = '#ffffff'; g.font = '800 30px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Comentarios', SCR.w / 2, top + 66);
  let y = top + 130;
  if (posted > 0) { g.globalAlpha = posted; g.fillStyle = '#9aa1ab'; g.beginPath(); g.arc(56, y + 10, 24, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; rr(g, 96, y - 8, 140, 14, 7); g.fill();
    g.fillStyle = '#ffffff'; g.font = '900 38px Inter'; g.textAlign = 'left'; g.fillText('KIRIA', 96, y + 26); g.globalAlpha = 1; y += 100; }
  for (let i = 0; i < 3; i++) { g.fillStyle = '#3a3f49'; g.beginPath(); g.arc(56, y + 10, 24, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.28)'; rr(g, 96, y - 6, 120 + 60 * hash(i), 14, 7); g.fill(); rr(g, 96, y + 20, 260 + 90 * hash(i + 5), 14, 7); g.fill(); y += 96; }
  const iy = SCR.h - 120; g.fillStyle = '#23262d'; rr(g, 24, iy, SCR.w - 140, 76, 38); g.fill();
  g.font = '900 36px Inter'; g.textAlign = 'left'; g.fillStyle = typed ? '#ffffff' : 'rgba(255,255,255,.4)'; g.fillText(typed || 'Añade un comentario…', 54, iy + 40);
  if (typed && Math.sin(t * 12) > 0) { const tw = g.measureText(typed).width; g.fillStyle = '#ffffff'; g.fillRect(58 + tw, iy + 20, 3, 40); }
  g.fillStyle = typed ? '#ffffff' : '#3a3f49'; g.beginPath(); g.arc(SCR.w - 66, iy + 38, 36, 0, 7); g.fill();
  g.fillStyle = typed ? '#111' : '#777'; g.beginPath(); g.moveTo(SCR.w - 82, iy + 50); g.lineTo(SCR.w - 66, iy + 22); g.lineTo(SCR.w - 50, iy + 50); g.closePath(); g.fill();
  g.restore();
}
function drawReelProduct(g, t, k) {   // un vídeo de redes con el tarro en 3D delante (sale de la pantalla): aquí solo el fondo, el pedestal y la interfaz
  const gr = g.createRadialGradient(SCR.w / 2, SCR.h * 0.5, 30, SCR.w / 2, SCR.h * 0.5, SCR.h * 0.62); gr.addColorStop(0, '#ffe3cf'); gr.addColorStop(0.55, '#f08a7a'); gr.addColorStop(1, '#8c1d2a');
  g.fillStyle = gr; g.fillRect(0, 0, SCR.w, SCR.h);
  g.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + t * 0.15; g.beginPath(); g.moveTo(SCR.w / 2, SCR.h * 0.6); g.arc(SCR.w / 2, SCR.h * 0.6, SCR.h, a, a + 0.12); g.closePath(); g.fill(); }
  g.fillStyle = '#f7e9de'; g.beginPath(); g.ellipse(SCR.w / 2, SCR.h * 0.72, 190, 46, 0, 0, 7); g.fill(); g.fillStyle = '#e2cbbb'; g.fillRect(SCR.w / 2 - 190, SCR.h * 0.72, 380, 70); g.beginPath(); g.ellipse(SCR.w / 2, SCR.h * 0.72 + 70, 190, 46, 0, 0, 7); g.fill();
  g.fillStyle = '#f7e9de'; g.beginPath(); g.ellipse(SCR.w / 2, SCR.h * 0.72, 190, 46, 0, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.font = '900 46px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NUEVO', SCR.w / 2, 190);
  g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '700 24px Inter'; g.fillText('@tumarca', SCR.w / 2, 236);
  const gr2 = g.createLinearGradient(0, SCR.h * 0.78, 0, SCR.h); gr2.addColorStop(0, 'rgba(0,0,0,0)'); gr2.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = gr2; g.fillRect(0, 0, SCR.w, SCR.h);
  icons(g, 1); statusBar(g, true);
  const hk = clamp((t - K.redes8) / 0.55); if (hk > 0 && hk < 1) { g.save(); g.globalAlpha = 1 - hk * hk; g.translate(SCR.w / 2, SCR.h * 0.34); g.scale(0.5 + hk, 0.5 + hk); g.fillStyle = '#ff4d61';
    g.beginPath(); g.moveTo(0, 60); g.bezierCurveTo(-120, -20, -60, -110, 0, -50); g.bezierCurveTo(60, -110, 120, -20, 0, 60); g.fill(); g.restore(); }
  if (t > K.redes8) { const x = SCR.w - 58, y = SCR.h - 430; g.fillStyle = '#ff4d61'; g.beginPath(); g.moveTo(x, y + 18); g.bezierCurveTo(x - 34, y - 6, x - 22, y - 34, x, y - 16); g.bezierCurveTo(x + 22, y - 34, x + 34, y - 6, x, y + 18); g.fill(); }
  g.fillStyle = '#ffffff'; g.fillRect(0, SCR.h - 8, SCR.w * clamp((t - K.ver8) / 3), 4);
  if (k < 1) { g.fillStyle = `rgba(0,0,0,${1 - k})`; g.fillRect(0, 0, SCR.w, SCR.h); }
}
function drawWeb(g, t, k) {      // página web (el móvil se ha estirado en horizontal): se dibuja en el tamaño estirado para que no se deforme
  const sx = S.phone.scale.x, sy = S.phone.scale.y, W2 = SCR.w * sx, H2 = SCR.h * sy; g.save(); g.setTransform(1 / sx, 0, 0, 1 / sy, 0, 0);
  g.fillStyle = '#f5f2ec'; g.fillRect(0, 0, W2, H2);
  g.fillStyle = '#e4e0d8'; g.fillRect(0, 0, W2, 70); [['#ff5f57', 0], ['#febc2e', 1], ['#28c840', 2]].forEach(([c, i]) => { g.fillStyle = c; g.beginPath(); g.arc(34 + i * 30, 35, 10, 0, 7); g.fill(); });
  g.fillStyle = '#ffffff'; rr(g, 140, 16, Math.min(W2 - 180, 560), 38, 19); g.fill(); g.fillStyle = '#6b7280'; g.font = '600 22px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('tutienda.es', 166, 36);
  g.fillStyle = '#16181d'; g.font = '900 30px Inter'; g.fillText('TU MARCA', 40, 118); g.fillStyle = 'rgba(22,24,29,.35)'; for (let i = 0; i < 3; i++) { rr(g, W2 - 380 + i * 120, 108, 90, 16, 8); g.fill(); }
  const hx = W2 * 0.06, hy = 170, hw = W2 * 0.42, hh = H2 - 230; const gr = g.createRadialGradient(hx + hw / 2, hy + hh * 0.62, 10, hx + hw / 2, hy + hh * 0.62, hw * 0.6); gr.addColorStop(0, '#e9e4da'); gr.addColorStop(1, '#f5f2ec'); g.fillStyle = gr; rr(g, hx, hy, hw, hh, 28); g.fill();
  g.fillStyle = 'rgba(22,24,29,.12)'; g.beginPath(); g.ellipse(hx + hw / 2, hy + hh * 0.86, hw * 0.3, 18, 0, 0, 7); g.fill();
  const tx = W2 * 0.54; g.fillStyle = '#16181d'; g.font = '900 64px Inter'; g.fillText('Tu producto', tx, hy + 70); g.font = '900 64px Inter'; g.fillStyle = '#b3122a'; g.fillText('en 3D', tx, hy + 146);
  g.fillStyle = 'rgba(22,24,29,.35)'; [0, 1, 2].forEach(i => { rr(g, tx, hy + 200 + i * 34, (W2 * 0.38) * (i === 2 ? 0.6 : 1), 16, 8); g.fill(); });
  g.fillStyle = '#16181d'; rr(g, tx, hy + 330, 260, 66, 33); g.fill(); g.fillStyle = '#ffffff'; g.font = '800 26px Inter'; g.textAlign = 'center'; g.fillText('Gíralo con el dedo', tx + 130, hy + 364);
  g.restore(); if (k < 1) { g.fillStyle = `rgba(0,0,0,${1 - k})`; g.fillRect(0, 0, SCR.w, SCR.h); }
}
function drawDM(g, t, k) {       // mensaje privado con el enlace
  g.fillStyle = '#0b0c0f'; g.fillRect(0, 0, SCR.w, SCR.h); statusBar(g, true);
  g.save(); g.globalAlpha = k; g.fillStyle = '#16181d'; g.fillRect(0, 76, SCR.w, 96); g.fillStyle = '#3a3f49'; g.beginPath(); g.arc(70, 124, 30, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.font = '800 30px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Mensajes', 116, 124);
  g.fillStyle = '#ffffff'; rr(g, SCR.w - 220, 230, 190, 70, 35); g.fill(); g.fillStyle = '#111317'; g.font = '900 32px Inter'; g.textAlign = 'center'; g.fillText('KIRIA', SCR.w - 125, 266);
  const m = win(t, K.privado9 - 0.05, 0.3); if (m > 0) { g.globalAlpha = k * m; const y = 340 + 30 * (1 - eo(m));
    g.fillStyle = '#23262d'; rr(g, 30, y, 400, 92, 30); g.fill(); g.fillStyle = '#ffffff'; g.font = '700 28px Inter'; g.textAlign = 'left'; g.fillText('¡Aquí tienes el enlace!', 58, y + 46);
    g.fillStyle = '#23262d'; rr(g, 30, y + 112, 440, 170, 26); g.fill(); g.fillStyle = '#7cf0a9'; rr(g, 54, y + 136, 120, 120, 20); g.fill();
    g.strokeStyle = '#0b0c0f'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.arc(98, y + 196, 22, 0.6, 3.9); g.stroke(); g.beginPath(); g.arc(130, y + 196, 22, 3.75, 7.05); g.stroke();
    g.fillStyle = '#ffffff'; g.font = '800 30px Inter'; g.fillText('Enlace', 196, y + 180); g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '600 22px Inter'; g.fillText('Toca para abrir', 196, y + 222); }
  g.restore();
}
function drawScreen(t) {
  const g = S.scrT.userData.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const tS0 = K.mas2 - 0.1, tS1 = K.como2 + 0.25, tR = K.ver8 - 0.25, tW = K.pagina8 - 0.3, tF = K.si11 + 0.1, tm = K.comenta11, tD = K.privado9 - 0.05, tEnd = END - 0.85;
  if (t >= tS0 && t < tS1) drawStats(g, t, win(t, tS0, 0.2));
  else if (t >= tR && t < tW) drawReelProduct(g, t, win(t, tR, 0.25));
  else if (t >= tW && t < tF) drawWeb(g, t, 1 - win(t, K.si11 - 0.1, 0.2));      // se apaga mientras el móvil vuelve a su forma (y entra el tarro)
  else if (t >= tm && t < tD) {
    const typed = 'KIRIA'.slice(0, clamp(Math.floor((t - K.kiria11) / 0.09) + 1, 0, 5) * (t >= K.kiria11 ? 1 : 0));
    const posted = win(t, K.kiria11 + 0.6, 0.25); drawComments(g, t, win(t, tm, 0.3), posted > 0.5 ? '' : typed, posted);
  } else if (t >= tD && t < tEnd + 0.3) drawDM(g, t, win(t, tD, 0.2) * (1 - win(t, tEnd, 0.3)));
  else { drawFeed(g, t); const b = t >= tF && t < tF + 0.5 ? 1 - win(t, tF + 0.22, 0.25) : 0; if (b > 0) { g.fillStyle = `rgba(0,0,0,${b})`; g.fillRect(0, 0, SCR.w, SCR.h); } }
  g.restore(); S.scrT.needsUpdate = true;
}

// ---------------------------------------------------------------- el guion (lienzo del papel)
function drawPaper(t, linesOn) {
  const T = S.paperT, g = T.userData.g, w = 620, h = 860; g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h); const gr = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(90,70,40,.16)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const tk = clamp((t - K.guion3 - 0.05) / 0.35); g.fillStyle = '#16181d'; g.font = '900 54px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('GUION'.slice(0, Math.ceil(5 * tk)), 52, 92);
  g.fillStyle = 'rgba(22,24,29,.45)'; g.fillRect(52, 132, w - 104, 3);
  if (linesOn) {
    const n = 12, typed = clamp((t - K.que3) / 0.85) * n;
    const hl = win(t, K.desde3, 0.45);
    if (hl > 0) { g.fillStyle = 'rgba(255,194,74,.85)'; g.fillRect(44, PL0 - 22, (w - 88) * eo(hl), 44); }
    for (let i = 0; i < n; i++) { const k = clamp(typed - i); if (k <= 0) break; const lw = PLW(i); g.fillStyle = '#2a2c31'; g.fillRect(52, PL0 + i * PLS - 7, lw * k, 14); }
    const sw = win(t, K.segundo3, 0.25); if (sw > 0) { g.save(); g.globalAlpha = sw; g.translate(w - 110, 92); g.strokeStyle = '#d33a3a'; g.fillStyle = '#d33a3a'; g.lineWidth = 6; g.beginPath(); g.arc(0, 6, 30, 0, 7); g.stroke(); g.fillRect(-8, -36, 16, 10);
      g.beginPath(); g.moveTo(0, 6); g.lineTo(0, -14); g.stroke(); g.font = '800 30px SpaceMono'; g.textAlign = 'right'; g.fillText('0:01', -44, 8); g.restore(); }
  }
  T.needsUpdate = true;
}
const PL0 = 196, PLS = 52, PLW = i => (i === 11 ? 300 : 430 + 86 * hash(i * 3.7 + 1)) * (i === 0 ? 1.05 : 1);

// ---------------------------------------------------------------- todo en el instante t
const _o = new THREE.Object3D(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
function bez(p0, p1, p2, p3, u, out) { const v = 1 - u; return out.set(0, 0, 0).addScaledVector(p0, v * v * v).addScaledVector(p1, 3 * v * v * u).addScaledVector(p2, 3 * v * u * u).addScaledVector(p3, u * u * u); }
function glyphWorld(i) { const o = S.num.ms[i]; o.updateWorldMatrix(true, false); return v3(0, o.userData.h * 0.42, 0).applyMatrix4(o.matrixWorld); }
function stageAt2(t) {
  // móvil: flota un poco
  S.phone.position.y = PHN.y + 0.012 * sinL(t, 1.6); S.phone.rotation.y = 0.04 * sinL(t, 0.7);
  { const wk = eio(clamp((t - K.pagina8 + 0.3) / 0.4)) * (1 - eio(clamp((t - K.si11) / 0.35))); S.phone.scale.set(1 + 0.85 * wk, 1 - 0.4 * wk, 1); }
  S.phone.updateMatrixWorld(true);
  drawScreen(t);
  { const dim = cwin(t, K.como2 + 0.2, K.ademas8 + 0.2, 0.5, 0.4); S.scr.material.color.setScalar(1.18 - 0.78 * dim); }   // la pantalla se apaga un poco mientras pasa lo de delante
  // ---- 1: los objetos salen disparados de la pantalla y se convierten en «3,2 M»
  const tau = t > TT.loop ? t - END : t;
  for (const b of S.burst) {
    const gT = TT.glyph[b.gl], t0 = Math.max(0.03, gT - 0.42), s0 = v3(b.p.x * 0.35, PHN.y + (b.p.y - PHN.y) * 0.4, 0.05);
    let p, s = 1, vis = true;
    if (tau < 0) { const u = clamp((tau + 0.75) / 0.75), e = 1 - Math.pow(1 - u, 2.2); p = s0.clone().lerp(b.p, e); s = 0.4 + 0.6 * e; }
    else if (tau < t0) { p = b.p.clone().add(b.p.clone().sub(s0).multiplyScalar(tau * 0.32)); }
    else if (tau < gT) { const u = (tau - t0) / (gT - t0), e = eio(u); const from = b.p.clone().add(b.p.clone().sub(s0).multiplyScalar(t0 * 0.32)), to = glyphWorld(b.gl);
      p = bez(from, from.clone().add(v3(0, 0.25, 0.3)), to.clone().add(v3(0, 0.15, 0.45)), to, e, new THREE.Vector3()); s = 1 - easeIn(clamp((u - 0.45) / 0.55)); }
    else vis = false;
    b.o.visible = vis && s > 0.01 && tau > -0.75;
    if (b.o.visible) { b.o.position.copy(p); b.o.scale.setScalar(s * (b.s0 || 1)); b.o.rotation.set(b.r[0] + b.w[0] * tau * 0.35, b.r[1] + b.w[1] * tau * 0.35, b.r[2] + b.w[2] * tau * 0.35); }
  }
  S.shards.forEach((sh, i) => { const vis = tau > -0.75 && tau < 1.5; sh.m.visible = vis; if (!vis) return;
    sh.m.position.copy(sh.a).addScaledVector(sh.v, tau * 0.55); sh.m.rotation.set(sh.w + tau * 2.1, sh.w * 0.7 + tau * 1.3, sh.w * 1.3);
    const a = clamp((tau + 0.6) / 0.25) * (1 - clamp((tau - 0.7) / 0.6)); sh.m.material.opacity = 0.35 * a; sh.m.userData.edges.material.opacity = 0.55 * a; });
  // cifras: aparecen al oírlas; brillan cuando les llegan las ▶
  const gone = win(t, K.ni1 - 0.05, 0.35);
  S.num.ms.forEach((o, i) => { const k = t < TT.loop ? pop(t, TT.glyph[i] - 0.06, 0.4) * (1 - gone) : 0; o.visible = k > 0.002; o.scale.setScalar(Math.max(0.0001, k)); });
  S.num.g.position.y = 2.14 + 0.02 * Math.sin(t * 1.3) + 0.6 * gone;
  const vis = K.visual1 - 0.08;
  S.num.ms[0].material.emissive.setScalar(0.35 * cwin(t, vis + 0.3, K.en1 + 0.5, 0.4, 0.5));
  // ▶ de la pantalla a las cifras
  { let n = 0; const on = t > vis && t < vis + 1.8;
    if (on) for (let i = 0; i < S.playData.length; i++) { const d = S.playData[i], st = vis + d.t0, u = (t - st) / d.d; if (u <= 0 || u >= 1) continue;
      const o = S.num.ms[d.gl]; o.updateWorldMatrix(true, false); const tg = v3((d.u - 0.5) * o.userData.w * 0.85, o.userData.h * (0.1 + d.v * 0.8), 0.07).applyMatrix4(o.matrixWorld);
      const a = d.a.clone(); a.y += S.phone.position.y - PHN.y;
      bez(a, a.clone().add(v3(0, 0.15, 0.6)), tg.clone().add(v3(0, -0.2, 0.5)), tg, eio(u), _a);
      _o.position.copy(_a); _o.quaternion.copy(cam.quaternion); _o.scale.setScalar(d.s * Math.min(1, u * 6) * (1 - easeIn(clamp((u - 0.8) / 0.2)))); _o.updateMatrix(); S.plays.setMatrixAt(n++, _o.matrix); }
    S.plays.count = n; S.plays.instanceMatrix.needsUpdate = true; S.plays.visible = n > 0; }
  // los 7 días
  S.days.forEach((d, i) => { const t0 = K.siete1 + 0.02 + i * 0.07, k = t < TT.loop ? pop(t, t0, 0.38) * (1 - gone) : 0; d.visible = k > 0.002; if (!d.visible) return;
    d.scale.setScalar(Math.max(0.001, k)); d.position.y = 1.95 + 0.6 * gone; d.rotation.x = -Math.PI / 2 * (1 - eo(clamp((t - t0) / 0.3))) + 0.12 * Math.sin(Math.max(0, t - K.dias1 - i * 0.05) * 9) * Math.exp(-Math.max(0, t - K.dias1 - i * 0.05) * 5) * (t > K.dias1 + i * 0.05 ? 1 : 0); });
  // ---- la cámara de cine cae, se queda en aristas y sus líneas forman la etiqueta
  { const t0 = K.ni1 - 0.2, tl = TT.land, g = S.mcam, vis = t > t0 && t < TT.morph0 + 0.05; g.visible = vis;
    if (vis) { const u = clamp((t - t0) / (tl - t0)); let y = 0.165 + (3.3 - 0.165) * (1 - u * u);
      if (t > tl) { const b = t - tl; y = 0.165 + 0.06 * Math.abs(Math.sin(b * 11)) * Math.exp(-b * 9); }
      g.position.set(0.42, y, 1.25); const r = 1 - eo(u); g.rotation.set(0.7 * r + (t > tl ? 0.03 * Math.sin((t - tl) * 20) * Math.exp(-(t - tl) * 8) : 0), -0.5 + 1.4 * r, 0.5 * r);
      faceOp(g, 1 - win(t, tl + 0.1, 0.32)); edgeOp(g, 1, 1); } }
  { const t0 = TT.morph0, t1 = TT.morph1, vis = t > t0 && t < t1 + 0.2, M2 = S.morph; M2.visible = vis;
    if (vis) { const N = S.camSegs.length, T2 = S.tagSegs.length;
      for (let i = 0; i < N; i++) { const di = (i / N) * 0.22, u = eio(clamp((t - t0 - di) / 0.42)), A = S.camSegs[i], B = S.tagSegs[i % T2], lift = Math.sin(Math.PI * u) * 0.22;
        _a.copy(A[0]).lerp(B[0], u); _a.y += lift; _b.copy(A[1]).lerp(B[1], u); _b.y += lift; M2.userData.set(i, _a, _b); }
      M2.userData.flush(); M2.material.opacity = 1 - win(t, t1, 0.18); } }
  // ---- 2: el ¿? sale de la pantalla; 3: el guion sale de la pantalla
  { const tq = K.como2 - 0.04, Q = S.q, vis = t > tq && t < K.guion3 + 0.25; Q.visible = vis;
    if (vis) { const e = eo(clamp((t - tq) / 0.45)), out = eio(clamp((t - K.guion3 + 0.25) / 0.35)); Q.position.set(0, lerp(1.0, 1.2, e), lerp(0.05, 0.75, e)); Q.rotation.set(0, (t - tq) * 2.4, 0.15 * Math.sin(t * 3));
      Q.scale.setScalar(Math.max(0.001, pop(t, tq, 0.45) * 1.25 * (1 - out))); } }
  { const t0 = K.guion3 - 0.12, tb = K.una4 - 0.05, P = S.paper, vis = t > t0 && t < K.voz4 + 0.35; P.visible = vis;
    if (vis) { const e = eo(clamp((t - t0) / 0.5)); P.position.set(0, 1.08 + 0.02 * Math.sin(t * 2) - 0.02 * e, lerp(0.05, WKZ, e)); P.scale.setScalar(lerp(0.35, 1, e)); P.rotation.set(-0.05 * (1 - e), 0.18 * (1 - e) + 0.03 * Math.sin(t * 1.1), 0.02 * Math.sin(t * 1.4));
      const out = win(t, tb + 0.22, 0.3); P.material.opacity = 1 - out; P.position.z -= out * 0.3; drawPaper(t, t < tb + 0.04); } }
  // ---- 4: las líneas del guion se levantan y son la onda de la voz; 5: se recogen y empieza el mazo
  { const t0 = K.una4 - 0.05, tv = K.voz4 + 0.05, tc = K.cada5, vis = t > t0 && t < tc + 0.5; S.bars.forEach(b => (b.visible = vis));
    if (vis) { S.paper.updateWorldMatrix(true, false);
      const k1 = eio(clamp((t - t0) / (tv - t0 + 0.12))), kc = eio(clamp((t - tc) / 0.45));
      S.barM.emissiveIntensity = 2.2 * k1; S.barM.color.setScalar(lerp(0.03, 0.9, k1));
      S.bars.forEach((b, i) => { const li = i >> 1, half = i & 1, lw = PLW(li) * 0.62 / 620, x0 = -0.31 + 52 * 0.62 / 620, xl = half ? x0 + lw * 0.5 : x0, wl = lw * 0.5 - 0.006;
        const yl = 0.43 - (PL0 + li * PLS) * 0.86 / 860; const Pw = v3(xl + wl / 2, yl, 0.035 * ((xl + wl / 2) / 0.31) ** 2 + 0.006).applyMatrix4(S.paper.matrixWorld);
        const xw = -0.46 + i * 0.04, env = voice(t - 0.03 - Math.abs(i - 11.5) * 0.006), hh = 0.04 + 0.5 * env * (0.55 + 0.45 * Math.sin(i * 1.7 + t * 11)) * (1 - 0.5 * Math.abs(i - 11.5) / 12);
        const Pw2 = v3(xw, 1.0, WKZ); b.position.copy(Pw).lerp(Pw2, k1); b.rotation.set(0, 0, Math.PI / 2 * (1 - k1));
        const len = lerp(wl, hh, k1); b.scale.set(lerp(0.014, 0.022, k1), Math.max(0.002, len * (1 - kc)), lerp(0.004, 0.022, k1));
        if (kc > 0) { b.position.lerp(v3(0, 0.92, WKZ + 0.18), kc * 0.6); } }); } }
  gavelAt(t); towerAt(t); productAt(t); ctaAt(t);
}

// ---------------------------------------------------------------- el mazo (se construye en 3D y golpea justo en «oyes»)
function gavelAt(t) {
  const { pv, gv } = S.gavel, t0 = K.cada5 - 0.02, tD = K.d3_5, tm = K.que5, ts = TT.slam, vis = t > t0 && t < ts + 0.9;
  pv.visible = vis; if (!vis) return;
  edgeOp(gv, 1 - 0.8 * win(t, tD + 0.45, 0.5), clamp((t - t0) / (tD - t0 - 0.1)));
  faceOp(gv, win(t, tD - 0.02, 0.3));
  let th = 1.0, x = PIV.x;
  if (t > tm) th = 1.0 + 0.28 * eio(clamp((t - tm) / 0.7)) + 0.06 * clamp((t - tm - 0.7) / (ts - tm - 0.78));
  if (t > ts - 0.08) { const u = clamp((t - ts + 0.08) / 0.08); th = lerp(1.34, 0, u * u); }
  if (t > ts) { const b = t - ts; th = 0.13 * Math.abs(Math.sin(b * 16)) * Math.exp(-b * 9); if (b > 0.32) { const v = eio(clamp((b - 0.32) / 0.4)); th = 0.9 * v; x = PIV.x + 1.3 * v; } }
  pv.position.set(x, PIV.y + (t < tm ? 0.28 * (1 - eio(clamp((t - tm + 0.2) / 0.6))) : 0), PIV.z); pv.rotation.set(th, 0, 0);
}

// ---------------------------------------------------------------- el taco, la torre de palabras, los anillos del sonido y el «remolino» hacia la etiqueta
function suckK(t, i) { return eio(clamp((t - TT.suck - 0.04 * i) / 0.48)); }
const SUCKP = v3(0, PHN.y + 0.15, 0.05);      // las palabras y el taco se meten en la pantalla
function suckTo(o, k, home) { if (k <= 0) return; const tg = SUCKP; o.position.copy(home).lerp(tg, k); o.position.y += Math.sin(Math.PI * k) * 0.25; }
function towerAt(t) {
  // taco
  { const k = pop(t, K.que5, 0.35), sk = suckK(t, 4), vis = k > 0.002 && sk < 0.999 && t < TT.loop; S.block.visible = vis;
    if (vis) { S.block.scale.setScalar(Math.max(0.001, k * (1 - sk))); S.block.position.set(0, 0, WKZ); S.block.rotation.set(0, 0, 0); suckTo(S.block, sk, v3(0, 0, WKZ)); S.block.rotation.y = sk * 4; } }
  // onda expansiva y chispas del golpe
  { const b = t - TT.slam, vis = b > 0 && b < 0.6; S.shock.visible = vis; if (vis) { const u = b / 0.6; S.shock.scale.setScalar(0.25 + 1.4 * eo(u)); S.shock.material.opacity = (1 - u) * 0.9; }
    S.sp.visible = b > 0 && b < 0.9; if (S.sp.visible) burst(S.sp, v3(0, 0.2, WKZ + 0.02), t, TT.slam, 0.5, 0.9, false, 2.6); }
  // las palabras del subtítulo, en dos filas (SUBTÍTULOS / PALABRA A PALABRA): cada una cae a su sitio al oírla
  let last = -1; TT.words.forEach((tw, i) => { if (t >= tw) last = i; });
  S.tower.forEach((w, i) => {
    const tw = TT.words[i], t0 = tw - 0.22, sk = suckK(t, 3 - i), vis = t > t0 && sk < 0.999 && t < TT.loop; w.g.visible = vis; if (!vis) return;
    const [xF, yF] = WSLOT[i], ryF = [0.04, -0.06, 0.05, -0.04][i];
    const u = clamp((t - t0) / 0.22); let y = yF + 0.32 * (1 - u * u);
    const b = t - tw; let sy = 1; if (b > 0 && b < 0.3) sy = 1 - 0.2 * Math.sin(b / 0.3 * Math.PI) * Math.exp(-b * 6);
    let pul = 0; for (const [te, wi] of TT.rings) if (wi === i || wi === 4) { const d = t - te; if (d > 0 && d < 0.35) pul = Math.max(pul, Math.sin(d / 0.35 * Math.PI)); }
    const home = v3(xF, y + 0.012 * Math.sin(t * 2.2 + i), WKZ); w.g.position.copy(home); w.g.rotation.set(0.05 * (1 - u), ryF, 0);
    w.g.scale.set(1 + 0.1 * pul, sy * (1 + 0.1 * pul), 1 + 0.1 * pul);
    if (sk > 0) { suckTo(w.g, sk, home); w.g.scale.multiplyScalar(1 - sk); w.g.rotation.z = sk * 3; }
    const hl = (i === last && t < TT.words[3] + 0.45) || pul > 0.15; const want = hl ? w.tH : w.tN; if (w.fp.material.map !== want) { w.fp.material.map = want; w.fp.material.needsUpdate = true; }
  });
  // anillos del sonido (alrededor de cada palabra; el de «sonido», de todas)
  S.rings.forEach((r, j) => { const ev = TT.rings[j]; if (!ev) { r.visible = false; return; } const d = t - ev[0], vis = d > 0 && d < 0.6; r.visible = vis; if (!vis) return;
    const u = d / 0.6, all = ev[1] === 4, P = all ? [0, 0.77] : WSLOT[ev[1]]; r.position.set(P[0], P[1], WKZ); r.scale.setScalar((all ? 0.35 : 0.12) + (all ? 0.75 : 0.45) * eo(u)); r.material.opacity = (1 - u) * 0.95; });
}
const WSLOT = [[0, 0.86], [-0.28, 0.68], [0, 0.68], [0.28, 0.68]];

// ---------------------------------------------------------------- «prueba tu objeto en 3D»: la foto se vuelve un tarro en 3D; en redes (reel) y en una página web
function productAt(t) {
  const tc = K.probar8 - 0.15, t3 = K.d3_8 - 0.05, tw = K.pagina8 - 0.3, tgo = K.si11;
  { const C = S.card, vis = t > tc && t < t3 + 0.3; C.visible = vis;
    if (vis) { const e = eo(clamp((t - tc) / 0.5)), m = eio(clamp((t - t3) / 0.28)); const p = v3(-0.9, 0.3, 1.7).lerp(v3(-0.06, 0.98, 1.15), e).lerp(v3(0, 0.95, 1.1), m);
      C.position.copy(p); C.rotation.set(-0.3 * (1 - e) + 0.03 * Math.sin(t * 2), 0.6 * (1 - e) + 0.08 * Math.sin(t * 1.3) + m * 1.2, -0.25 * (1 - e)); C.scale.setScalar(Math.max(0.001, (1 - m) * (1 + 0.04 * Math.sin(t * 3)))); } }
  { const J = S.jar, vis = t > t3 && t < tgo + 0.55; J.visible = vis;
    if (vis) { const k = pop(t, t3, 0.45), wk = eio(clamp((t - tw) / 0.45)), gk = eio(clamp((t - tgo) / 0.5));
      const vk = eio(clamp((t - K.ver8 + 0.1) / 0.6));
      const tr1 = K.redes8 + 0.15, tr2 = K.web8 + 0.1, ry = 0.25 * Math.sin((t - t3) * 2) + 2 * Math.PI * (eio(clamp((t - t3) / (tr1 - t3))) + eio(clamp((t - tr1) / (tr2 - tr1))));   // gira como en un expositor y se para de frente en «redes» y en «web»      // «ver cómo se vería en redes»: se pone delante del vídeo, sobre el pedestal
      const p = v3(0, 0.78, 1.1).lerp(v3(0, 0.6, 0.2), vk).lerp(v3(-0.33, 0.42, 0.35), wk).lerp(v3(0, PHN.y, 0.05), gk);
      J.position.copy(p); J.position.y += 0.015 * Math.sin(t * 2.2); J.rotation.set(0.12 * (1 - vk) + 0.05, ry, 0.04 * Math.sin(t * 1.5)); J.scale.setScalar(Math.max(0.001, k * lerp(lerp(1.25, 1.0, vk), 1.45, wk) * (1 - gk))); } }
}
// ---------------------------------------------------------------- el bocadillo «KIRIA», el avión de papel con el enlace y la vuelta al principio
function ctaAt(t) {
  S.awning.visible = false;
  const tb = K.comenta11 - 0.03, tp = K.paso9 - 0.05, tin = K.privado9 + 0.25;
  { const vis = t > tb && t < tp + 0.32, B = S.bubble; B.visible = vis;
    if (vis) { const e = eio(clamp((t - tb) / 0.45)), back = eio(clamp((t - tp) / 0.3)); const p = v3(0.12, 1.12, 0.06).lerp(v3(0.3, 1.5, 0.52), e);
      B.position.copy(p); B.position.y += 0.015 * Math.sin(t * 2.4); B.rotation.set(0.03 * Math.sin(t * 1.5), -0.22 + 0.05 * Math.sin(t * 0.9), 0.04 * Math.sin(t * 1.2)); B.scale.setScalar(Math.max(0.001, pop(t, tb, 0.45) * (1 - back)));
      S.letters.forEach((l, i) => { const k = pop(t, K.kiria11 + i * 0.09, 0.3); l.visible = k > 0.002; l.scale.setScalar(Math.max(0.001, k)); l.position.z = 0.06 + 0.03 * Math.sin(clamp((t - K.kiria11 - i * 0.09) / 0.3) * Math.PI); }); } }
  { const P = S.plane, vis = t > tp && t < tin; P.visible = vis;
    if (vis) { const u = clamp((t - tp) / (tin - tp)), e = eio(u), A = v3(0.3, 1.5, 0.52), B1 = v3(0.95, 1.85, 1.0), B2 = v3(-0.55, 1.75, 1.15), Z = v3(0.0, 1.15, 0.06);
      const pos = bez(A, B1, B2, Z, e, new THREE.Vector3()), nx = bez(A, B1, B2, Z, Math.min(1, e + 0.02), new THREE.Vector3());
      P.position.copy(pos); P.lookAt(nx.x + (nx.x === pos.x ? 0.001 : 0), nx.y, nx.z + 0.0001); P.rotateZ(Math.sin(u * Math.PI * 2) * 0.5); P.scale.setScalar(Math.max(0.001, pop(t, tp, 0.25) * (1 - easeIn(clamp((u - 0.8) / 0.2)))) * 0.9); } }
}
// ---------------------------------------------------------------- cámara: un solo plano continuo alrededor del móvil (sin cortes) que acaba donde empieza (bucle)
let CKS = [];
const CUTS = [];
function buildCam() {
  const A0 = [[1.05, 1.42, 5.3], [0.02, 1.36, 0.35], 34];
  CKS = [
    [0, ...A0],
    [K.millones1 + 0.1, [0.72, 1.6, 5.85], [0.0, 1.5, 0.2], 34],
    [K.siete1, [0.35, 1.68, 6.15], [0.0, 1.44, 0.2], 34],
    [K.ni1 + 0.2, [0.85, 1.35, 5.8], [0.2, 0.95, 0.45], 34],
    [TT.land + 0.3, [1.0, 1.0, 4.6], [0.3, 0.58, 0.95], 34],
    // 2: las aristas de la cámara de cine se meten en la pantalla → los resultados, de cerca
    [K.mas2 + 0.55, [0.14, 1.12, 3.15], [0.0, 1.08, 0.1], 34],
    [K.dias2, [0.04, 1.08, 2.95], [0.0, 1.04, 0.1], 34],
    [K.como2 + 0.35, [0.3, 1.12, 3.55], [0.0, 1.05, 0.7], 34],
    // 3–7: guion, voz, objeto en 3D, subtítulos y sonido delante del móvil
    [K.guion3 + 0.3, [0.3, 1.15, 3.7], [0.0, 1.04, 0.85], 34],
    [K.segundo3 + 0.2, [0.1, 1.1, 3.4], [0.0, 1.05, WKZ], 34],
    [K.voz4 + 0.25, [-0.15, 1.05, 3.45], [0.0, 1.0, WKZ], 34],
    [K.d3_5 + 0.2, [0.75, 1.02, 3.35], [-0.06, 0.74, WKZ + 0.2], 34],
    [K.mueve5, [0.95, 0.86, 3.45], [0.0, 0.46, WKZ + 0.15], 34],
    [TT.slam, [0.82, 0.62, 3.05], [0.0, 0.3, WKZ + 0.1], 34],
    [K.subtitulos6 + 0.35, [0.25, 1.0, 4.15], [0.0, 0.68, WKZ], 34],
    [K.efecto7, [-0.2, 0.98, 4.05], [0.0, 0.7, WKZ], 34],
    // 8: todo entra en el móvil; tu objeto en 3D, en redes y en una página web
    [K.ademas8 + 0.3, [0.1, 1.15, 3.9], [0.0, 0.95, 0.5], 34],
    [K.objeto8 + 0.2, [-0.1, 1.08, 3.55], [-0.03, 0.95, 1.0], 34],
    [K.d3_8 + 0.3, [0.35, 1.02, 3.55], [0.0, 0.92, 0.8], 34],
    [K.redes8, [0.18, 1.08, 3.75], [0.0, 0.94, 0.3], 34],
    [K.pagina8 + 0.15, [0.0, 1.12, 4.8], [-0.02, 0.98, 0.3], 34],
    [K.web8 + 0.35, [0.06, 1.1, 4.6], [-0.02, 0.98, 0.3], 34],
    // 9: comenta KIRIA → el enlace llega por privado
    [K.comenta11 + 0.3, [0.4, 1.4, 4.2], [0.12, 1.3, 0.3], 34],
    [K.privado9 + 0.2, [0.35, 1.38, 4.3], [0.1, 1.28, 0.3], 34],
    [END - 1.0, [0.6, 1.5, 4.85], [0.06, 1.42, 0.3], 34],
    [END, ...A0],
  ];
}
function camAt(t) {
  const st = camKeys(t, CKS);
  for (const [t0, a0] of [[TT.land, 0.02], [TT.slam, 0.045]]) { const u = t - t0; if (u > 0 && u < 0.5) { const a = a0 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; st.l.y += Math.sin(u * 83 + 2) * a * 0.5; } }
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[TT.land, 0.04], [TT.slam, 0.1], [TT.suck + 0.5, 0.04], [K.d3_8, 0.035], [K.privado9 + 0.25, 0.04]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { return 0; }
function darkAt(t) { return 0; }
let NOWT = 0;
function stageAt(t, st) {
  NOW = t; NOWT = t;
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.35, 1.3);
  rigAt(c, yaw, k, 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.14;
  scene.fog.density = 0.02;
  stageAt2(t);
  post.uniforms.fade.value = 0;
}
// ---------------------------------------------------------------- HUD: cabecera con los resultados, rótulos con línea guía y el cierre «comenta KIRIA»
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A', HD = '#8FE6FF';
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('NI UNA SOLA CÁMARA', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText('VÍDEOS EN 3D · HECHOS CON IA', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('VISUALIZACIONES', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('3,2 M', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('EN 7 DÍAS', 1024, 178);
  const mk = win(t, K.comenta11, 0.3) * (1 - win(t, END - 1.2, 0.4));
  if (mk > 0.01) {
    const txt = 'COMENTA «KIRIA»', col = HG, blink = false;
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
// anillo de cuenta atrás (1 minuto) alrededor de un punto de pantalla
function timerRing(P, r, k, u, txt) {
  if (k <= 0.01 || !P || !P.ok) return;
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.strokeStyle = 'rgba(238,242,246,.25)'; hg.lineWidth = 6; hg.beginPath(); hg.arc(P.x, P.y, r, 0, 7); hg.stroke();
  glowStroke(HG, 7, 16); hg.beginPath(); hg.arc(P.x, P.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(u)); hg.stroke(); noGlow();
  hfont(34); hg.letterSpacing = '4px'; hg.fillStyle = HG; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(txt, P.x, P.y - r - 36); hg.restore();
}
function hudAt(t) {
  hudBegin(); hdr(t);
  // 3: el gancho, en el primer segundo
  if (S.paper.visible) { const P = wpo(S.paper, -0.12, 0.43 - PL0 * 0.86 / 860, 0.03); lab(P, 'EL GANCHO', 'SEGUNDO 1', cw(t, K.desde3 + 0.15, K.una4 - 0.1), { dx: -130, dy: 230, color: HG }); }
  // 4: la voz
  lab(v3(0.46, 1.05, WKZ), 'VOZ', null, cw(t, K.voz4 - 0.02, K.cada5 - 0.05), { dx: 110, dy: 200, color: HD });
  // 5: el objeto en 3D
  if (S.gavel.pv.visible) lab(wpo(S.gavel.gv, -0.48, 0.0, 0.13), 'OBJETO EN 3D', null, cw(t, K.d3_5 + 0.05, K.que5 + 0.1), { dx: -120, dy: -200, color: HC.white });
  // cierre: comenta KIRIA y te paso el enlace por privado
  { const k = cw(t, K.kiria11 + 0.45, END - 1.0); if (k > 0.01) {
      bigText('COMENTA «KIRIA»', W / 2, 1540, 66, HC.white, k, { glow: 12, type: false, dark: 26 });
      bigText('Y TE PASO EL ENLACE POR PRIVADO', W / 2, 1628, 30, HG, cw(t, K.paso9 - 0.05, END - 1.0), { dark: 18, ls: 4 }); } }
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
  const names = await (await fetch('img/reels.json')).json();
  PRODUCTO = new Image(); PRODUCTO.src = 'img/producto.jpg'; await PRODUCTO.decode();
  for (let i = 0; i < names.length; i++) { const R = []; for (let j = 1; j <= 6; j++) { const im = new Image(); im.src = `img/r${i}_${j}.jpg`; await im.decode(); R.push(im); } REELS.push(R); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = Math.ceil(lines[lines.length - 1].end + 2.6);
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  // frases: 1 = 3,2 M · 2 = seguidores · 3 = guion · 4 = voz · 5 = 3D · 6 = subtítulos · 7 = sonido · 8 = prueba tu objeto · 9 = comenta KIRIA
  // (las claves conservan los nombres de la primera versión para no tocar la escena)
  K = {
    k32: atL(1, '32'), millones1: atL(1, 'millones'), visual1: atL(1, 'visualizaciones'), en1: atL(1, '=en'), siete1: atL(1, '=7'), dias1: atL(1, 'dias'), y1: atL(1, '=y'), ni1: atL(1, '=ni'), sola1: atL(1, 'sola'), camara1: atL(1, 'camara'),
    mas2: atL(2, 'mas'), n2500: atL(2, '2500'), seguidores2: atL(2, 'seguidores'), seis2: atL(2, '=6'), dias2: atL(2, 'dias'), como2: atL(2, 'como'),
    guion3: atL(3, 'guion'), que3: atL(3, '=que'), engancha3: atL(3, 'engancha'), desde3: atL(3, 'desde'), primer3: atL(3, 'primer'), segundo3: atL(3, 'segundo'),
    una4: atL(4, '=una'), voz4: atL(4, 'voz'),
    cada5: atL(5, 'cada'), objeto5: atL(5, 'objeto'), construido5: atL(5, 'construido'), d3_5: atL(5, '3d'), que5: atL(5, '=que'), mueve5: atL(5, 'mueve'), justo5: atL(5, 'justo'), oyes5: atL(5, 'oyes'),
    subtitulos6: atL(6, 'subtitulos'), palabra6: atL(6, 'palabra'), a6: atL(6, '=a'), palabra6b: atL(6, 'palabra', 2),
    sonido7: atL(7, 'sonido'), efecto7: atL(7, 'efecto'), a7: atL(7, '=a'), efecto7b: atL(7, 'efecto', 2),
    ademas8: atL(8, 'ademas'), probar8: atL(8, 'probar'), objeto8: atL(8, 'objeto'), d3_8: atL(8, '3d'), ver8: atL(8, '=ver'), redes8: atL(8, 'redes'), pagina8: atL(8, 'pagina'), web8: atL(8, 'web'),
    si11: atL(9, '=si'), videos11: atL(9, 'videos'), comenta11: atL(9, 'comenta'), kiria11: atL(9, 'kiria'), paso9: atL(9, 'paso'), enlace9: atL(9, 'enlace'), privado9: atL(9, 'privado'),
  };
  // «3,2» es una sola palabra en los tiempos: «tres», «coma» y «dos» se reparten por sílabas
  K.coma1 = K.k32 + 0.24; K.dos1 = K.k32 + 0.56;
  mats(); buildMats(); buildRig(); buildFloor();
  S.floor.d.material.color.set(0x3c3832); S.floor.d.material.clearcoat = 0.6;      // suelo más oscuro que en la cerradura
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6; }
  scene.fog = new THREE.FogExp2(0x000000, 0.02);
  buildFlow(); buildLaunch(); buildTimes();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.TT = TT; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
