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
// ---------------------------------------------------------------- «Química vs Ingeniería Química» (duelo): el laboratorio delante y la fábrica al fondo.
// Primer fotograma: la fábrica entera, en miniatura, DENTRO de un tubo de ensayo gigante sobre la mesa del laboratorio. En «toneladas» la
// fábrica sale del tubo y crece hasta su tamaño real al fondo; al final vuelve a meterse en el tubo (bucle). 1 unidad = 1 m.
const BENCH = { x: 0, z: 3.5, y: 0.92, w: 3.2, d: 1.15 };
const TUBE = { x: 0.15, z: 3.42, r: 0.3, h: 1.45 };            // tubo de ensayo gigante (el del gancho)
const MINI_Y = BENCH.y + 0.33;                                  // suelo de la fábrica en miniatura (dentro del tubo)
const PLANT0 = v3(0, 0, -10), PS0 = 0.027;                       // la fábrica: dónde está a tamaño real y a qué escala cabe en el tubo
const RACK = { x: -0.62, z: 3.8 }, BAL = { x: -1.3, z: 3.2 }, MOL = v3(0.15, 1.95, 3.42);
const TEAL_C = 0x35d6c6, AMB_C = 0xffb547;
let PL_G = null;                                                // grupo de la fábrica

const glassMat = (op = 0.12) => new THREE.MeshPhysicalMaterial({ color: 0xdfeaf2, roughness: 0.03, metalness: 0, transparent: true, opacity: op, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false, side: THREE.DoubleSide });
const liquidMat = (c, i = 0.55) => new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.15, transparent: true, opacity: 0.88, clearcoat: 1 });
// tubo de ensayo: fondo redondo, cuerpo recto y borde
function testTube(r, h, m) {
  const prof = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI / 2; prof.push([Math.max(0.0005, Math.cos(a) * r), r + Math.sin(a) * r]); }
  prof.push([r, h - 0.02 * h]); prof.push([r * 1.12, h]); prof.push([r * 1.12, h * 1.012]); prof.push([r * 0.98, h * 1.016]);
  return lathe(prof, 48, m);
}
function flask(R, H, m) {           // matraz Erlenmeyer
  return lathe([[0.0005, 0], [R, 0], [R * 1.02, 0.03 * H], [R * 0.32, 0.68 * H], [R * 0.3, 0.95 * H], [R * 0.36, H], [R * 0.33, H * 1.01]], 48, m);
}
function beaker(R, H, m) { return lathe([[0.0005, 0], [R, 0], [R, H], [R * 1.06, H * 1.01]], 40, m); }

function buildLab() {
  const L = new THREE.Group(); scene.add(L); S.lab = L;
  // mesa de laboratorio: encimera de cerámica oscura sobre un mueble
  const top = mesh(new THREE.BoxGeometry(BENCH.w, 0.06, BENCH.d), M.ceramicD); top.position.set(BENCH.x, BENCH.y - 0.03, BENCH.z); L.add(top);
  const cab = mesh(new THREE.BoxGeometry(BENCH.w - 0.1, BENCH.y - 0.06, BENCH.d - 0.12), paint(0x22262d, 0.6, 0.2)); cab.position.set(BENCH.x, (BENCH.y - 0.06) / 2, BENCH.z); L.add(cab);
  for (const sx of [-1, 1]) { const h = mesh(new THREE.BoxGeometry(0.02, 0.04, 0.4), MAT.steel); h.position.set(BENCH.x + sx * 0.75, BENCH.y - 0.25, BENCH.z + BENCH.d / 2 - 0.05); L.add(h); }
  // el tubo gigante del gancho, con el «suelo» de la fábrica en miniatura dentro
  const T = new THREE.Group(); T.position.set(TUBE.x, BENCH.y, TUBE.z); L.add(T); S.tube = T;
  S.tubeGlass = testTube(TUBE.r, TUBE.h, glassMat(0.14)); T.add(S.tubeGlass);
  S.tubeRim = new THREE.Mesh(new THREE.TorusGeometry(TUBE.r * 1.12, 0.012, 10, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.6 }));
  S.tubeRim.rotation.x = Math.PI / 2; S.tubeRim.position.y = TUBE.h * 1.006; T.add(S.tubeRim);
  S.miniFloor = cyl(TUBE.r * 0.97, TUBE.r * 0.97, 0.02, paint(0x2b2f36, 0.7, 0.1), 48); S.miniFloor.position.y = MINI_Y - BENCH.y - 0.01; T.add(S.miniFloor);
  S.tubeShards = sparks(scene, 90, 0xdfeaf2, 0.03); S.tubeShards.visible = false;
  // gradilla con tres tubos pequeños (uno, el del químico, se rellena con la sustancia nueva)
  const rack = mesh(new THREE.BoxGeometry(0.5, 0.06, 0.16), M.woodL); rack.position.set(RACK.x, BENCH.y + 0.12, RACK.z); L.add(rack);
  const rb = mesh(new THREE.BoxGeometry(0.5, 0.02, 0.16), M.woodL); rb.position.set(RACK.x, BENCH.y + 0.01, RACK.z); L.add(rb);
  for (const sx of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(0.02, 0.13, 0.14), M.woodL); p.position.set(RACK.x + sx * 0.24, BENCH.y + 0.065, RACK.z); L.add(p); }
  S.smallTubes = [];
  [[-0.14, 0x8f7bff, 0.1], [0, TEAL_C, 0.0], [0.14, AMB_C, 0.12]].forEach(([dx, c, lv], i) => {
    const g = new THREE.Group(); g.position.set(RACK.x + dx, BENCH.y + 0.02, RACK.z); L.add(g);
    g.add(testTube(0.028, 0.24, glassMat(0.2)));
    const liq = cyl(0.025, 0.025, 1, liquidMat(c, 0.7), 20); liq.position.y = 0.028; g.add(liq); liq.userData.c = c;
    g.userData.liq = liq; g.userData.lv = lv; S.smallTubes.push(g);
  });
  // matraz y vaso de precipitados con líquido
  const fk = new THREE.Group(); fk.position.set(0.98, BENCH.y, 3.28); L.add(fk); fk.add(flask(0.13, 0.32, glassMat(0.16)));
  const fl = lathe([[0.0005, 0.005], [0.122, 0.005], [0.123, 0.03], [0.088, 0.115], [0.0005, 0.115]], 40, liquidMat(TEAL_C, 0.6)); fk.add(fl); S.flask = fk;
  const bk = new THREE.Group(); bk.position.set(1.3, BENCH.y, 3.72); L.add(bk); bk.add(beaker(0.1, 0.2, glassMat(0.16)));
  const bl = cyl(0.094, 0.094, 0.09, liquidMat(AMB_C, 0.5), 32); bl.position.y = 0.05; bk.add(bl);
  // balanza de precisión con su pantalla («0,50 g», EJEMPLO) y un cuentagotas encima
  const B = new THREE.Group(); B.position.set(BAL.x, BENCH.y, BAL.z); L.add(B); S.bal = B;
  const base = mesh(new THREE.BoxGeometry(0.34, 0.08, 0.3), paint(0xe9ecef, 0.35, 0.6)); base.position.y = 0.04; B.add(base);
  const pan = cyl(0.11, 0.11, 0.012, MAT.steel, 40); pan.position.set(0, 0.095, -0.02); B.add(pan); S.pan = pan;
  const disp = plateText(0.2, 0.055, [['0,50 g', 0.7, 0.55]], { fg: '#7CF0A9', bg: '#06110b', font: 'SpaceMono', weight: 700 }); disp.position.set(0, 0.045, 0.152); disp.rotation.x = -0.35; B.add(disp);
  const dropper = new THREE.Group(); dropper.position.set(0, 0.42, -0.02); B.add(dropper);
  dropper.add(at(cyl(0.012, 0.004, 0.16, glassMat(0.35), 16), 0, 0.08, 0)); dropper.add(at(cyl(0.02, 0.02, 0.07, plastic(0x1b1d22, 0.4), 16), 0, 0.19, 0));
  S.drop = sph(0.012, liquidMat(TEAL_C, 1.2), 14, 10); S.drop.position.set(0, 0.0, 0); dropper.add(S.drop); S.dropper = dropper;
  // la molécula (bolas y palos): aparece en «moléculas», se reordena en «algo nuevo» y se mete en el tubo pequeño
  const MG = new THREE.Group(); MG.position.copy(MOL); scene.add(MG); S.mol = MG;
  const AT = [[0, 0, 0, 0.13, 'c'], [0.34, 0.12, 0.05, 0.13, 'c'], [-0.32, 0.14, -0.04, 0.13, 'c'], [0.02, -0.34, 0.06, 0.15, 'o'], [0.62, -0.04, 0.1, 0.09, 'h'],
    [0.36, 0.44, -0.08, 0.09, 'h'], [-0.58, -0.05, 0.08, 0.09, 'h'], [-0.36, 0.46, 0.06, 0.09, 'h'], [0.3, -0.58, 0.12, 0.09, 'h']];
  const AM = { c: paint(0x2f343c, 0.25, 1), o: liquidMat(TEAL_C, 0.9), h: paint(0xf2f4f7, 0.25, 1) };
  S.atoms = AT.map(([x, y, z, r, k], i) => { const s = sph(r, AM[k], 28, 20); s.position.set(x, y, z); s.userData.p0 = v3(x, y, z); MG.add(s); return s; });
  // reordenada («algo nuevo»): otra forma y un átomo nuevo que se une
  const P2 = [[0, 0, 0], [0.36, 0.0, 0.05], [-0.36, 0.0, -0.05], [0.0, 0.36, 0.08], [0.66, 0.16, 0.1], [0.5, -0.32, -0.08], [-0.66, 0.16, 0.08], [-0.5, -0.32, 0.06], [0.0, 0.7, 0.14]];
  S.atoms.forEach((s, i) => { s.userData.p1 = v3(...P2[i]); });
  S.newAtom = sph(0.15, liquidMat(AMB_C, 1.1), 28, 20); S.newAtom.userData.p1 = v3(0, -0.36, -0.06); MG.add(S.newAtom);
  const BONDS = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 6], [2, 7], [3, 8]];
  S.bondM = paint(0xc9ced6, 0.3, 0.6);
  S.bonds = BONDS.map(([a, b]) => { const c = cyl(0.028, 0.028, 1, S.bondM, 12); MG.add(c); return { c, a, b }; });
  S.bondNew = cyl(0.028, 0.028, 1, S.bondM, 12); MG.add(S.bondNew);
  // receta: la tarjeta que el químico le pasa a la fábrica
  S.recipe = plateText(0.42, 0.56, [['RECETA', 0.1, 0.13], ['SUSTANCIA NUEVA', 0.06, 0.3], ['1  Mezclar', 0.055, 0.48], ['2  Calentar', 0.055, 0.6], ['3  Destilar', 0.055, 0.72], ['4  Enfriar', 0.055, 0.84]],
    { fg: '#1b1d22', bg: '#f2eee3', font: 'SpaceMono', weight: 700, align: 'left' });
  S.recipe.material.side = THREE.DoubleSide; scene.add(S.recipe); S.recipe.visible = false;
  S.seed = sph(0.06, liquidMat(TEAL_C, 2.6), 20, 14); scene.add(S.seed); S.seed.visible = false;   // la gota del químico que vuelve a encender la fábrica
}

function buildPlant() {
  const g = new THREE.Group(); scene.add(g); PL_G = g; S.plant = g;
  const white = paint(0xe7eaee, 0.38, 0.6), grey = paint(0x8f98a3, 0.42, 0.5), dark = paint(0x2a2f36, 0.6, 0.2), conc = paint(0x4a4e55, 0.9, 0);
  S.plantLights = [];
  const lamp = (x, y, z, c = 0xffd27a, r = 0.09) => { const s = sph(r, glowM(c, 3), 12, 8); s.position.set(x, y, z); g.add(s); S.plantLights.push(s); return s; };
  const add = (o, x, y, z) => { o.position.set(x, y, z); g.add(o); return o; };
  add(mesh(new THREE.BoxGeometry(17, 0.25, 11), conc), 0.5, 0.125, 0);
  // reactor: depósito vertical con fondos abombados sobre patas, aros, agitador y bocas
  const RX = -3.3, RZ = 0.4, RR = 1.35, RH = 3.0, RY = 1.55;
  S.reactor = new THREE.Group(); S.reactor.position.set(RX, 0, RZ); g.add(S.reactor);
  const rv = cyl(RR, RR, RH, white, 48); rv.position.y = RY + RH / 2; S.reactor.add(rv);
  for (const sy of [1, -1]) { const cap = sph(RR, white, 48, 24); cap.scale.set(1, 0.42, 1); cap.position.y = sy > 0 ? RY + RH : RY; S.reactor.add(cap); }
  for (const yy of [0.25, 0.5, 0.75]) { const band = new THREE.Mesh(new THREE.TorusGeometry(RR * 1.005, 0.035, 8, 64), grey); band.rotation.x = Math.PI / 2; band.position.y = RY + RH * yy; S.reactor.add(band); }
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; S.reactor.add(bar(v3(Math.cos(a) * RR * 0.92, 0.25, Math.sin(a) * RR * 0.92), v3(Math.cos(a) * RR * 0.92, RY + 0.4, Math.sin(a) * RR * 0.92), 0.08, grey)); }
  const mot = cyl(0.32, 0.32, 0.55, dark, 24); mot.position.y = RY + RH + RR * 0.42 + 0.35; S.reactor.add(mot);
  const mot2 = mesh(new THREE.BoxGeometry(0.5, 0.36, 0.5), paint(0x3a7bd5, 0.35, 0.8)); mot2.position.y = RY + RH + RR * 0.42 + 0.78; S.reactor.add(mot2);
  for (const [a, y] of [[0.4, RY + RH * 0.8], [2.2, RY + RH * 0.35], [4.1, RY + RH * 0.6]]) { const nz = cyl(0.16, 0.16, 0.45, grey, 20); nz.rotation.z = Math.PI / 2; nz.rotation.y = a; nz.position.set(Math.cos(a) * (RR + 0.18), y, -Math.sin(a) * (RR + 0.18)); S.reactor.add(nz); }
  S.reactorGlow = lamp(RX + RR * 0.72, RY + RH * 0.7, RZ + RR * 0.72, 0xffb547, 0.12);
  // columna de destilación: alta, con plataformas, barandillas y escalera
  const CX = 1.9, CZ = -1.6, CR = 0.75, CH = 10.5;
  S.column = new THREE.Group(); S.column.position.set(CX, 0.25, CZ); g.add(S.column);
  const cb = cyl(CR, CR, CH, white, 40); cb.position.y = CH / 2; S.column.add(cb);
  const ct = sph(CR, white, 40, 20); ct.scale.y = 0.45; ct.position.y = CH; S.column.add(ct);
  for (const yy of [2.6, 5.2, 7.8]) {
    const pl = cyl(CR + 0.62, CR + 0.62, 0.06, grey, 40); pl.position.y = yy; S.column.add(pl);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(CR + 0.6, 0.025, 6, 48), grey); rail.rotation.x = Math.PI / 2; rail.position.y = yy + 0.55; S.column.add(rail);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; S.column.add(bar(v3(Math.cos(a) * (CR + 0.6), yy, Math.sin(a) * (CR + 0.6)), v3(Math.cos(a) * (CR + 0.6), yy + 0.55, Math.sin(a) * (CR + 0.6)), 0.02, grey)); }
    const lp = sph(0.08, glowM(0xffd27a, 3), 10, 8); lp.position.set(CR + 0.55, yy + 0.6, 0); S.column.add(lp); S.plantLights.push(lp);
  }
  for (const sx of [-1, 1]) S.column.add(bar(v3(sx * 0.18, 0, CR + 0.32), v3(sx * 0.18, 8.3, CR + 0.32), 0.025, grey));
  for (let y = 0.4; y < 8.3; y += 0.4) S.column.add(bar(v3(-0.18, y, CR + 0.32), v3(0.18, y, CR + 0.32), 0.015, grey));
  S.columnTop = new THREE.Object3D(); S.columnTop.position.y = CH + 0.4; S.column.add(S.columnTop);
  // intercambiador de calor (horizontal) y bomba
  const HX = new THREE.Group(); HX.position.set(-0.4, 0.25, 3.0); g.add(HX); S.exch = HX;
  const sh = cyl(0.5, 0.5, 3.6, grey, 32); sh.rotation.z = Math.PI / 2; sh.position.y = 1.25; HX.add(sh);
  for (const sx of [-1, 1]) { const hd = sph(0.5, dark, 24, 16); hd.scale.x = 0.4; hd.position.set(sx * 1.8, 1.25, 0); HX.add(hd); HX.add(at(mesh(new THREE.BoxGeometry(0.3, 0.75, 0.7), dark), sx * 1.1, 0.375, 0)); }
  // depósitos de almacenamiento
  S.tanks = [];
  for (const [x, z] of [[5.6, 1.9], [5.6, -2.6]]) { const tg = new THREE.Group(); tg.position.set(x, 0.25, z); g.add(tg);
    const tb = cyl(1.7, 1.7, 3.0, white, 48); tb.position.y = 1.5; tg.add(tb); const dm = sph(1.7, white, 48, 16); dm.scale.y = 0.22; dm.position.y = 3.0; tg.add(dm);
    const st = new THREE.Mesh(new THREE.TorusGeometry(1.71, 0.03, 6, 64), grey); st.rotation.x = Math.PI / 2; st.position.y = 2.2; tg.add(st); S.tanks.push(tg); }
  // chimenea (antorcha) con su luz roja
  S.stack = new THREE.Group(); S.stack.position.set(-6.4, 0.25, -3.4); g.add(S.stack);
  const sk = cyl(0.26, 0.38, 11.5, grey, 24); sk.position.y = 5.75; S.stack.add(sk);
  for (const yy of [3, 6, 9]) { const rg = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 6, 32), dark); rg.rotation.x = Math.PI / 2; rg.position.y = yy; S.stack.add(rg); }
  const red = sph(0.1, glowM(0xff3b30, 4), 10, 8); red.position.y = 11.6; S.stack.add(red); S.plantLights.push(red);
  S.stackTop = new THREE.Object3D(); S.stackTop.position.y = 11.7; S.stack.add(S.stackTop);
  // rack de tuberías y las tuberías que unen reactor → columna → intercambiador → depósitos
  const pr = (x0, x1, z, y) => { for (let x = x0; x <= x1 + 0.01; x += 2.5) { g.add(bar(v3(x, 0.25, z - 0.5), v3(x, y, z - 0.5), 0.06, grey)); g.add(bar(v3(x, 0.25, z + 0.5), v3(x, y, z + 0.5), 0.06, grey)); g.add(bar(v3(x, y, z - 0.55), v3(x, y, z + 0.55), 0.06, grey)); } };
  pr(-5, 7.5, 4.6, 3.6);
  S.pipes = [];
  const PIPE = (pts, r, m) => { const t = tube(pts.map(p => v3(...p)), r, m, pts.length * 14, false, 12); g.add(t); S.pipes.push(t); return t; };
  const pm1 = paint(0xb8c0ca, 0.3, 0.7), pm2 = paint(0xd0a24a, 0.3, 0.7), pm3 = paint(0x7f8a96, 0.3, 0.7);
  PIPE([[-6, 3.75, 4.35], [8.2, 3.75, 4.35]], 0.12, pm1); PIPE([[-6, 3.98, 4.75], [8.2, 3.98, 4.75]], 0.1, pm2); PIPE([[-6, 3.75, 5.05], [8.2, 3.75, 5.05]], 0.14, pm3);
  PIPE([[RX, RY + RH + 0.5, RZ], [RX, RY + RH + 1.4, RZ], [-1.0, RY + RH + 1.4, RZ - 0.6], [CX - 0.9, 6.0, CZ + 0.2], [CX - CR, 6.0, CZ]], 0.13, pm1);
  PIPE([[CX, CH + 0.5, CZ], [CX, CH + 1.1, CZ], [CX + 1.4, CH + 1.1, CZ], [CX + 1.6, 4.5, CZ + 1.6], [CX + 1.6, 3.9, 4.35]], 0.11, pm2);
  PIPE([[-2.2, 1.5, 3.0], [-3.3, 1.5, 2.2], [RX, 1.2, RZ + RR + 0.1]], 0.1, pm3);
  PIPE([[1.4, 1.5, 3.0], [3.4, 1.5, 3.0], [3.9, 1.6, 1.9], [5.6 - 1.75, 1.6, 1.9]], 0.1, pm1);
  PIPE([[5.6, 3.3, 1.9], [5.6, 3.9, 3.2], [5.6, 3.9, 4.35]], 0.09, pm2);
  // flujo por dentro de las tuberías (puntos que corren en «tuberías»)
  S.flowPts = sparks(g, 160, 0xffd27a, 0.12); S.flowPts.visible = false;
  S.flowCurves = S.pipes.map(t => t.geometry.parameters.path);
  // camión cisterna (sale cargado en «toneladas cada día»)
  const TK = new THREE.Group(); TK.position.set(9.5, 0.25, 2.2); g.add(TK); S.truck = TK;
  const cabM = paint(0xf2f4f7, 0.3, 1), chM = paint(0x1d2025, 0.6, 0.2);
  TK.add(at(mesh(new THREE.BoxGeometry(6.2, 0.35, 1.9), chM), 0, 0.85, 0));
  const cabG = mesh(new THREE.BoxGeometry(1.6, 1.8, 2.2), cabM); cabG.position.set(3.4, 1.7, 0); TK.add(cabG);
  TK.add(at(mesh(new THREE.BoxGeometry(0.05, 0.7, 1.9), new THREE.MeshPhysicalMaterial({ color: 0x0d1626, roughness: 0.05, metalness: 0.5, clearcoat: 1 })), 4.21, 2.05, 0));
  const tk = new THREE.Mesh(new THREE.CapsuleGeometry(1.0, 3.4, 10, 32), paint(0xdfe3e8, 0.2, 1)); tk.rotation.z = Math.PI / 2; tk.position.set(-0.6, 2.05, 0); tk.castShadow = true; TK.add(tk);
  for (const x of [-2.4, -1.4, 3.3]) for (const z of [-0.95, 0.95]) { const wh = cyl(0.48, 0.48, 0.35, chM, 24); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.48, z); TK.add(wh); }
  S.smoke = sparks(g, 120, 0xcfd6de, 0.5); S.steam = sparks(g, 70, 0xe6ecf2, 0.35);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}

function buildQuimica() { buildFloor(); buildLab(); buildPlant(); }
// ---------------------------------------------------------------- tiempos y animación (todo depende de K: las palabras de la voz)
let TT = {};
function buildTimes() {
  TT = {
    grow0: K.toneladas2 - 0.12, grow1: K.toneladas2 + 1.55,      // la fábrica sale del tubo y crece hasta su tamaño real
    mol0: K.moleculas5 - 0.05, molNew: K.algo5 - 0.05,            // la molécula aparece y se reordena («algo nuevo»)
    molIn0: K.tubo5 - 0.1, molIn1: K.ensayo5 + 0.45,              // la molécula entra en el tubo pequeño
    rec0: K.receta6 - 0.15, rec1: K.fabrica6 + 0.85,              // la receta vuela del laboratorio al reactor
    flow0: K.tuberias6 - 0.1, flow1: K.baratas6 + 1.2,            // el producto corre por las tuberías
    truck0: K.toneladas6 - 0.15,                                   // el camión cisterna sale cargado
    off0: K.sin11 - 0.05, seed0: K.nada11 - 0.6, relight: K.fabricar11 + 0.35,   // sin el químico la fábrica se apaga; llega su gota y se enciende
    rw: END - 1.35,                                                // vuelta al principio: la fábrica se mete otra vez en el tubo
  };
}
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const _pa = new THREE.Vector3(), _pb = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _qq = new THREE.Quaternion();
function plantK(t) { return eio(clamp((t - TT.grow0) / (TT.grow1 - TT.grow0))) * (1 - eio(clamp((t - TT.rw) / (END - 0.12 - TT.rw)))); }
function plantScale(t) { return PS0 * Math.pow(1 / PS0, plantK(t)); }
function plantOn(t) { return 1 - win(t, TT.off0, 0.35) * (1 - win(t, TT.relight, 0.4)); }
function stageAt2(t) {
  // --- la fábrica: dentro del tubo (miniatura) → tamaño real al fondo → otra vez al tubo
  const k = plantK(t), s = plantScale(t), on = plantOn(t);
  { const from = v3(TUBE.x, MINI_Y, TUBE.z); S.plant.position.copy(from).lerp(PLANT0, k); S.plant.position.y += Math.sin(k * Math.PI) * 3.2; S.plant.scale.setScalar(s); S.plant.rotation.y = (1 - k) * 0.35; }
  // --- el tubo gigante: se rompe cuando sale la fábrica y vuelve a aparecer al final
  { const gone = win(t, TT.grow0 - 0.05, 0.22) * (1 - win(t, TT.rw + 0.25, 0.6)), a = 1 - gone;
    S.tube.visible = a > 0.01; S.tubeGlass.material.opacity = 0.14 * a; S.tubeRim.material.opacity = 0.6 * a; S.miniFloor.scale.setScalar(Math.max(0.001, a));
    const u = t - TT.grow0; S.tubeShards.visible = u > 0 && u < 1.1 && t < TT.rw; if (S.tubeShards.visible) { burst(S.tubeShards, v3(TUBE.x, BENCH.y + 0.8, TUBE.z), t, TT.grow0, 0.55, 1.2, false, 5); S.tubeShards.material.opacity = 1 - clamp(u / 1.1); } }
  // --- humo de la chimenea y vapor de la columna (en coordenadas de la fábrica; el tamaño de los puntos sigue a la escala)
  { const sm = S.smoke, st = S.steam; sm.visible = st.visible = on > 0.05;
    if (sm.visible) { burst(sm, v3(-6.4, 11.95, -3.4), t, 0, 0.32, 3.2, true, -0.55); sm.material.size = 0.9 * s; sm.material.opacity = 0.32 * on;
      burst(st, v3(1.9, 11.4, -1.6), t, 0.4, 0.25, 2.4, true, -0.6); st.material.size = 0.6 * s; st.material.opacity = 0.28 * on; } }
  S.plantLights.forEach((l, i) => { l.material.emissiveIntensity = (3 + 0.6 * Math.sin(t * 3 + i)) * on; });
  S.reactorGlow.material.emissiveIntensity = (3 + 9 * cwin(t, K.reactores6 - 0.05, K.columnas6, 0.15, 0.4)) * on;
  // --- el producto corriendo por las tuberías
  { const a = cwin(t, TT.flow0, TT.flow1, 0.3, 0.6) * on; S.flowPts.visible = a > 0.01;
    if (S.flowPts.visible) { const arr = S.flowPts.geometry.attributes.position.array, n = S.flowPts.userData.n, C = S.flowCurves;
      for (let i = 0; i < n; i++) { const c = C[i % C.length], u = (hash(i * 1.37) + (t - TT.flow0) * (0.22 + hash(i) * 0.1)) % 1, p = c.getPointAt(u); arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; }
      S.flowPts.geometry.attributes.position.needsUpdate = true; S.flowPts.material.size = 0.22 * s; S.flowPts.material.opacity = a; } }
  // --- el camión cisterna sale cargado y vuelve a su sitio para el bucle
  { const u = clamp((t - TT.truck0) / 4.0); S.truck.position.x = 9.5 + 16 * u * u; S.truck.visible = (u < 0.98 || t > TT.rw) && plantK(t) > 0.5; if (t > TT.rw) S.truck.position.x = 9.5; }   // en miniatura no cabe en el tubo
  // --- la gota del cuentagotas en «gramos»
  { const u = clamp((t - K.gramos2 + 0.25) / 0.38); S.drop.position.y = -0.325 * u * u; S.drop.scale.setScalar(Math.max(0.001, u < 1 ? 1 : 1 - clamp((t - K.gramos2 - 0.13) / 0.15))); }
  // --- la molécula: aparece átomo a átomo, se reordena con un átomo nuevo y entra en el tubo pequeño
  { const vis = t > TT.mol0 - 0.05 && t < TT.molIn1 + 0.05; S.mol.visible = vis;
    if (vis) {
      const re = eio(clamp((t - TT.molNew) / 0.6)), inn = eio(clamp((t - TT.molIn0) / (TT.molIn1 - TT.molIn0)));
      S.atoms.forEach((a, i) => { a.position.copy(a.userData.p0).lerp(a.userData.p1, re); a.scale.setScalar(pops(t, TT.mol0 + i * 0.06, 0.32)); });
      S.newAtom.position.copy(S.newAtom.userData.p1); S.newAtom.scale.setScalar(pops(t, K.nuevo5 - 0.05, 0.4)); S.newAtom.material.emissiveIntensity = 1.1 + 3 * Math.exp(-Math.max(0, t - K.nuevo5) * 3);
      const bond = (c, A, B, ok) => { _pa.copy(A.position); _pb.copy(B.position); const d = _pa.distanceTo(_pb); c.visible = ok && d > 0.01; if (!c.visible) return; c.position.copy(_pa).add(_pb).multiplyScalar(0.5); c.scale.set(1, d, 1); c.quaternion.setFromUnitVectors(_up, _pb.sub(_pa).normalize()); };
      S.bonds.forEach(b => bond(b.c, S.atoms[b.a], S.atoms[b.b], S.atoms[b.a].scale.x > 0.6 && S.atoms[b.b].scale.x > 0.6));
      bond(S.bondNew, S.atoms[0], S.newAtom, S.newAtom.scale.x > 0.6);
      const tgt = v3(RACK.x, BENCH.y + 0.36, RACK.z); S.mol.position.copy(MOL).lerp(tgt, inn); S.mol.scale.setScalar(Math.max(0.001, 1 - 0.94 * inn) * (inn > 0.97 ? 1 - (inn - 0.97) / 0.03 : 1));
      S.mol.rotation.set(0.25 * Math.sin(t * 0.7), t * 0.75, 0);
    } }
  // --- los tubos pequeños: el del químico se llena con la sustancia nueva
  S.smallTubes.forEach((g, i) => { const liq = g.userData.liq; let lv = g.userData.lv;
    if (i === 1) lv = 0.15 * eio(clamp((t - TT.molIn1 + 0.25) / 0.6)) * (1 - win(t, TT.rw, 0.5));
    liq.visible = lv > 0.003; liq.scale.y = Math.max(0.001, lv); liq.position.y = 0.028 + lv / 2;
    liq.material.emissiveIntensity = i === 1 ? 0.7 + 2.5 * cwin(t, TT.molIn1 - 0.2, K.ingeniero6 + 0.3, 0.2, 0.5) + 2.2 * cwin(t, TT.seed0 - 0.3, TT.seed0 + 0.4, 0.15, 0.3) : 0.7; });
  // --- la receta vuela del laboratorio al reactor
  { const u = clamp((t - TT.rec0) / (TT.rec1 - TT.rec0)), R = S.recipe; R.visible = u > 0 && u < 1;
    if (R.visible) { const a = v3(-0.1, 1.75, 4.55), b = v3(-3.3, 5.3, -9.4), e = eio(clamp((u - 0.22) / 0.78));
      R.position.copy(a).lerp(b, e); R.position.y += Math.sin(e * Math.PI) * 3.0;
      R.scale.setScalar(Math.max(0.001, pop(t, TT.rec0, 0.35) * (1.5 + 5 * e) * (1 - clamp((u - 0.9) / 0.1))));
      R.quaternion.copy(cam.quaternion); R.rotateZ(0.12 * Math.sin(t * 2.2)); } }
  // --- la gota del químico que vuelve a encender la fábrica (frase 11)
  { const u = clamp((t - TT.seed0) / (TT.relight - TT.seed0)); S.seed.visible = u > 0 && u < 1;
    if (S.seed.visible) { const a = v3(RACK.x, BENCH.y + 0.3, RACK.z), b = v3(-3.3, 5.6, -9.6), e = eio(u); S.seed.position.copy(a).lerp(b, e); S.seed.position.y += Math.sin(e * Math.PI) * 4.5; S.seed.scale.setScalar(1.6 + 5 * e); } }
}
// ---------------------------------------------------------------- cámara: un plano continuo (sin cortes) que acaba donde empieza (bucle)
let CKS = [];
let NOWL = new THREE.Vector3();
function buildCam() {
  const A0 = [[0.62, 1.7, 5.6], [0.15, 1.52, 3.42], 40];             // gancho: la fábrica dentro del tubo de ensayo
  CKS = [
    [0, ...A0],
    [K.misma1, [0.5, 1.7, 5.2], [0.15, 1.6, 3.42], 40],
    [K.gramos2 - 0.12, [-0.68, 1.42, 4.35], [-1.3, 1.02, 3.2], 36],     // 1: la balanza: gramos
    [K.toneladas2 + 0.15, [1.4, 2.4, 7.2], [0.0, 2.4, -0.5], 42],      // la fábrica sale del tubo
    [K.cobra3, [3.0, 4.3, 11.5], [0.0, 4.0, -7.5], 44],                // … y crece al fondo
    [K.final3, [0.0, 3.0, 10.2], [0.0, 3.4, -5.0], 42],                // 2: el duelo, laboratorio delante y fábrica detrás
    [K.primero4, [-1.6, 2.5, 8.8], [0.0, 3.0, -4.0], 42],              // 3: 1.º curso, casi igual
    [K.laboratorio4 + 0.35, [1.4, 2.5, 8.3], [0.0, 3.0, -4.0], 42],
    [K.separan5 + 0.1, [0.9, 2.15, 6.0], [0.15, 1.8, 3.42], 40],       // 4: el químico: la molécula
    [K.moleculas5 + 0.1, [0.95, 2.3, 6.15], [0.15, 1.95, 3.42], 38],
    [K.nuevo5 + 0.25, [-0.55, 2.25, 6.05], [0.15, 1.95, 3.42], 38],
    [K.tubo5 + 0.05, [-0.1, 1.48, 4.75], [-0.62, 1.12, 3.8], 36],       // … que entra en el tubo de ensayo
    [K.ensayo5 + 0.45, [0.0, 1.42, 4.68], [-0.62, 1.1, 3.8], 36],
    [K.receta6, [0.9, 2.2, 7.0], [-0.1, 1.85, 4.4], 40],                // 5: la receta vuela a la fábrica
    [K.fabrica6 + 0.35, [5.0, 5.4, 4.5], [-1.5, 3.8, -7.5], 44],
    [K.reactores6, [-0.6, 5.6, -2.4], [-3.3, 3.6, -9.6], 40],          // reactor
    [K.columnas6, [5.2, 7.8, -4.4], [1.9, 6.6, -11.6], 42],            // columna
    [K.tuberias6, [4.6, 7.4, -0.4], [0.0, 3.8, -6.0], 42],             // tuberías
    [K.toneladas6, [13.0, 2.8, -1.6], [9.8, 1.7, -7.8], 42],           // el camión, cargado
    [K.seguras6, [9.0, 7.6, 5.8], [0.5, 3.6, -9.5], 44],
    [K.baratas6 + 0.45, [7.6, 6.9, 6.8], [0.5, 3.6, -9.5], 44],
    [K.uno7, [-1.6, 2.0, 6.6], [0.0, 1.45, 3.4], 40],                  // 6: dónde acaba cada uno
    [K.farmaceuticas7 + 0.15, [-1.2, 2.1, 6.3], [0.0, 1.5, 3.4], 40],
    [K.otro7, [6.6, 5.2, 3.8], [0.0, 4.0, -9.5], 44],
    [K.depuradoras7 + 0.25, [5.6, 5.5, 4.8], [0.0, 4.0, -9.5], 44],
    [K.trabajo8, [0.0, 3.5, 11.8], [0.0, 3.0, -4.0], 44],              // 7: trabajo y sueldo (con el duelo de fondo)
    [K.cuatro9, [-2.4, 3.7, 11.2], [0.0, 3.6, -5.0], 44],
    [K.mas10 + 0.45, [2.4, 3.7, 11.2], [0.0, 3.6, -5.0], 44],
    [K.sin11, [5.6, 5.0, 2.8], [-1.0, 3.6, -9.5], 44],                 // 8: sin el químico, la fábrica se apaga…
    [K.fabricar11, [1.2, 3.3, 9.8], [-1.6, 3.0, -4.5], 44],            // … y su gota la enciende
    [K.laboratorio12, [0.0, 3.0, 10.3], [0.0, 3.3, -5.0], 42],         // 9: ¿laboratorio o fábrica?
    [K.ingenieria12 + 0.35, [0.0, 2.8, 9.7], [0.0, 3.2, -5.0], 42],
    [END - 1.0, [0.9, 1.95, 6.3], [0.15, 1.66, 3.42], 40],
    [END, ...A0],
  ];
}
function camAt(t) {
  const st = camKeys(t, CKS);
  const u = t - TT.grow0; if (u > 0 && u < 0.6) { const a = 0.04 * Math.exp(-u * 6); st.p.x += Math.sin(u * 83) * a; st.p.y += Math.sin(u * 71 + 1) * a; }   // golpe al romperse el tubo
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.grow0, 0.1], [K.nuevo5, 0.05], [TT.relight, 0.06]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t; NOWL.copy(st.l);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 6, 0.45, 2.8);
  rigAt(c, yaw, k, 0.62, 0.62);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.3;
  stageAt2(t);
  post.uniforms.fade.value = 0;
}
// ---------------------------------------------------------------- HUD: cabecera del duelo, rótulos y el marcador (trabajo y sueldo)
function buildHudPlan() {}
const TEAL_H = '#35D6C6', AMB_H = '#FFB547';
const cw = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 27, subSize: 19, bg: true, ...opt }); }
const fmtE = v => Math.round(v).toLocaleString('es-ES').replace(/ /g, '.') + ' €';
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic'; hg.textAlign = 'left'; hg.letterSpacing = '6px'; hfont(40);
  let x = 54; for (const [s, c] of [['QUÍMICA', TEAL_H], [' VS ', HC.white], ['ING. QUÍMICA', AMB_H]]) { hg.fillStyle = c; hg.fillText(s, x, 142); x += hg.measureText(s).width; }
  hg.letterSpacing = '4px'; hfont(22, false); hg.fillStyle = HC.grey; hg.fillText('DUELO DE CARRERAS', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  // la pregunta abierta, arriba a la derecha, hasta la respuesta
  const k = cw(t, K.cobra3, K.n27_9, 0.3, 0.3);
  if (k > 0.01) { const on = Math.sin(t * 9) > -0.3, txt = '¿QUIÉN COBRA MÁS?'; hg.globalAlpha = k; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 150; hg.strokeStyle = AMB_H; hg.lineWidth = 1.5; hg.beginPath();
    hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10); hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
    hg.fillStyle = AMB_H; if (on) hg.fillText(txt, x1 - 15, y); }
  hg.restore();
}
function panel(x, y, w, h, a, border = 'rgba(238,242,246,.22)') { hg.save(); hg.globalAlpha = a; hg.fillStyle = 'rgba(4,6,10,.72)'; rr(hg, x, y, w, h, 18); hg.fill(); hg.strokeStyle = border; hg.lineWidth = 1.5; rr(hg, x, y, w, h, 18); hg.stroke(); hg.restore(); }
function txt(s, x, y, size, col, a = 1, o = {}) { if (a <= 0.01) return; hg.save(); hg.globalAlpha = a; hg.textAlign = o.align || 'left'; hg.textBaseline = 'middle'; hg.letterSpacing = (o.ls ?? 3) + 'px'; hfont(size, o.bold ?? true); hg.fillStyle = col; hg.fillText(o.type === undefined ? s : typed(s, o.type), x, y); hg.restore(); }
function check(x, y, k, col) { if (k <= 0.01) return; const e = eo(clamp(k / 0.4)); hg.save(); hg.globalAlpha = clamp(k * 3); hg.strokeStyle = col; hg.lineWidth = 6; hg.lineCap = 'round'; hg.beginPath(); hg.moveTo(x - 14, y); hg.lineTo(x - 14 + 10 * clamp(e * 2), y + 10 * clamp(e * 2)); if (e > 0.5) hg.lineTo(x - 4 + 20 * (e - 0.5) * 2, y + 10 - 22 * (e - 0.5) * 2); hg.stroke(); hg.restore(); }
function person(x, y, s, col, a) { hg.save(); hg.globalAlpha = a; hg.fillStyle = col; hg.beginPath(); hg.arc(x, y - 22 * s, 10 * s, 0, 7); hg.fill(); rr(hg, x - 12 * s, y - 8 * s, 24 * s, 34 * s, 9 * s); hg.fill(); hg.restore(); }
function chip(s, x, y, col, k, size = 34) { if (k <= 0.01) return; const sc = 0.8 + 0.2 * eo(clamp(k * 2)); hg.save(); hg.globalAlpha = clamp(k * 2.5); hg.translate(x, y); hg.scale(sc, sc); hg.letterSpacing = '4px'; hfont(size); const w = hg.measureText(s).width + 56, h = size * 1.9;
  hg.fillStyle = 'rgba(4,6,10,.8)'; rr(hg, -w / 2, -h / 2, w, h, h / 2); hg.fill(); hg.strokeStyle = col; hg.lineWidth = 3; rr(hg, -w / 2, -h / 2, w, h, h / 2); hg.stroke(); hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(s, 0, 2); hg.restore(); }
function hudAt(t) {
  hudBegin(); hdr(t);
  // 1: química e ingeniería química, «¿la misma carrera?»
  if (S.tube.visible) lab(v3(TUBE.x + TUBE.r * 0.95, BENCH.y + 1.15, TUBE.z), 'QUÍMICA', null, cw(t, K.quimica1 - 0.05, K.realidad2), { dx: -150, dy: 230, color: TEAL_H });
  lab(S.plant.getWorldPosition(new THREE.Vector3()).add(v3(0, 0.18, 0)), 'INGENIERÍA QUÍMICA', null, cw(t, K.ingenieria1 - 0.05, K.realidad2), { dx: 140, dy: 300, color: AMB_H });
  bigText('¿LA MISMA CARRERA?', W / 2, 1640, 50, HC.white, cw(t, K.misma1 - 0.05, K.realidad2 + 0.1), { dark: 22 });
  // 2: gramos y toneladas
  { const k = cw(t, K.gramos2 - 0.05, K.otra2, 0.2, 0.25); if (k > 0.01) { panel(330, 1420, 420, 170, k); txt('GRAMOS', W / 2, 1468, 24, HC.grey, k, { align: 'center', bold: false }); txt('0,50 g', W / 2, 1535, 66, TEAL_H, k, { align: 'center', ls: 2 }); } }
  bigText('TONELADAS', W / 2, 1560, 92, AMB_H, cw(t, K.toneladas2 - 0.05, K.cual3 - 0.05, 0.15, 0.3), { dark: 26, glow: 16 });
  // 3: la pregunta
  bigText('¿QUIÉN COBRA MÁS?', W / 2, 1480, 64, HC.white, cw(t, K.cual3 - 0.05, K.primero4 - 0.05), { dark: 24 });
  bigText('TE LO DIGO AL FINAL', W / 2, 1565, 30, HC.grey, cw(t, K.digo3 - 0.1, K.primero4 - 0.05), { dark: 18 });
  // 4: 1.º curso, casi igual
  { const k = cw(t, K.primero4 - 0.05, K.separan5 + 0.15, 0.25, 0.3);
    if (k > 0.01) { const x = 90, y = 1230, w = 900, h = 470; panel(x, y, w, h, k);
      txt('1.º CURSO', x + 36, y + 52, 30, HC.white, k); txt('QUÍMICA', x + 560, y + 52, 22, TEAL_H, k, { align: 'center' }); txt('ING. QUÍMICA', x + 760, y + 52, 22, AMB_H, k, { align: 'center' });
      [['Química', K.quimica4], ['Matemáticas', K.matematicas4], ['Física', K.fisica4], ['Laboratorio', K.laboratorio4]].forEach(([s, t0], i) => {
        const yy = y + 130 + i * 82, kk = win(t, t0 - 0.06, 0.3) * k; if (kk <= 0.01) return;
        hg.save(); hg.globalAlpha = k * 0.35; hg.fillStyle = 'rgba(238,242,246,.4)'; hg.fillRect(x + 36, yy - 40, w - 72, 1.2); hg.restore();
        txt(s, x + 36, yy, 34, HC.white, kk, { bold: false, ls: 1, type: clamp(kk * 1.6) }); check(x + 560, yy - 6, kk, TEAL_H); check(x + 760, yy - 6, clamp((t - t0 - 0.12) / 0.3) * k, AMB_H); });
      stamp('CASI IGUAL', W / 2, y + h + 70, cw(t, K.laboratorio4 + 0.35, K.separan5 + 0.15, 0.2, 0.3), TEAL_H, 52); } }
  // 5: el químico: moléculas, algo nuevo, tubo de ensayo
  if (S.mol.visible) { lab(S.atoms[1].getWorldPosition(new THREE.Vector3()), 'MOLÉCULAS', null, cw(t, K.moleculas5 - 0.05, K.nuevo5 - 0.1), { dx: 130, dy: 280, color: TEAL_H });
    lab(S.newAtom.getWorldPosition(new THREE.Vector3()), 'SUSTANCIA NUEVA', null, cw(t, K.nuevo5 - 0.05, K.tubo5 - 0.05), { dx: -120, dy: 300, color: AMB_H }); }
  lab(v3(RACK.x, BENCH.y + 0.22, RACK.z), 'TUBO DE ENSAYO', null, cw(t, K.tubo5 - 0.05, K.ingeniero6 - 0.1), { dx: 120, dy: 280, color: HC.white });
  // 6: la fábrica: receta, reactor, columna, tuberías, toneladas, seguras y baratas
  if (S.recipe.visible) lab(S.recipe.position.clone(), 'RECETA', null, cw(t, K.receta6 - 0.05, K.fabrica6 + 0.2, 0.2, 0.2), { dx: 140, dy: 200, color: HC.white });
  lab(v3(-3.3, 4.6, -9.6), 'REACTOR', null, cw(t, K.reactores6 - 0.05, K.columnas6 - 0.05, 0.2, 0.2), { dx: 140, dy: 260, color: AMB_H });
  lab(v3(1.9, 8.6, -11.6), 'COLUMNA DE DESTILACIÓN', null, cw(t, K.columnas6 - 0.05, K.tuberias6 - 0.05, 0.2, 0.2), { dx: -140, dy: 360, color: AMB_H });
  lab(v3(2.4, 3.98, -5.25), 'TUBERÍAS', null, cw(t, K.tuberias6 - 0.05, K.salgan6, 0.2, 0.2), { dx: 140, dy: 300, color: AMB_H });
  if (S.truck.visible) lab(S.truck.getWorldPosition(new THREE.Vector3()).add(v3(-0.6, 3.2, 0)), 'TONELADAS AL DÍA', null, cw(t, K.toneladas6 - 0.05, K.seguras6, 0.2, 0.25), { dx: -140, dy: 320, color: AMB_H });
  chip('✓ SEGURAS', 330, 1560, AMB_H, cw(t, K.seguras6 - 0.05, K.uno7 - 0.1, 0.15, 0.25), 34); chip('✓ BARATAS', 760, 1560, AMB_H, cw(t, K.baratas6 - 0.05, K.uno7 - 0.1, 0.15, 0.25), 34);
  // 7: dónde acaba cada uno
  { const k = cw(t, K.uno7 - 0.05, K.trabajo8 - 0.05, 0.25, 0.3);
    if (k > 0.01) { const cols = [[60, TEAL_H, 'QUÍMICO', [['LABORATORIOS', K.laboratorios7], ['INVESTIGACIÓN', K.investigacion7], ['FARMACÉUTICAS', K.farmaceuticas7]], K.uno7],
      [560, AMB_H, 'ING. QUÍMICO', [['PLANTAS QUÍMICAS', K.plantas7], ['REFINERÍAS', K.refinerias7], ['DEPURADORAS', K.depuradoras7]], K.otro7]];
      for (const [x, col, title, items, t0] of cols) { const kk = win(t, t0 - 0.08, 0.3) * k; if (kk <= 0.01) continue; panel(x, 1420, 460, 330, kk, col);
        txt(title, x + 32, 1472, 28, col, kk); items.forEach(([s, ti], i) => { const ki = win(t, ti - 0.06, 0.25) * k; txt('· ' + s, x + 32, 1550 + i * 64, 27, HC.white, ki, { bold: false, ls: 2, type: clamp(ki * 1.5) }); }); } } }
  // 8: trabajo: unos 8 de cada 10 (afiliados a la Seguridad Social)
  { const k = cw(t, K.trabajo8 - 0.05, K.pero9 + 0.15, 0.25, 0.3);
    if (k > 0.01) { panel(70, 1250, 940, 440, k); txt('TRABAJANDO · 4 AÑOS DESPUÉS', 104, 1300, 24, HC.grey, k, { bold: false });
      [[TEAL_H, 'QUÍMICA', '81,2 %', 1420], [AMB_H, 'ING. QUÍMICA', '84,6 %', 1580]].forEach(([col, name, pc, y], r) => {
        txt(name, 104, y - 62, 22, col, k);
        for (let i = 0; i < 10; i++) { const on = i < 8, ki = clamp((t - K.n8_8 + 0.3 - i * 0.05) / 0.25); person(130 + i * 66, y + 10, 1.25, on && ki > 0 ? col : 'rgba(238,242,246,.22)', k * (on ? 0.35 + 0.65 * ki : 0.6)); }
        txt(pc, 980, y + 6, 36, col, k * win(t, K.n10_8 - 0.1, 0.3), { align: 'right', ls: 1 }); }); } }
  // 9 y 10: lo que ganan (base media de cotización), con la diferencia
  { const k = cw(t, K.pero9 + 0.05, K.eso11 + 0.1, 0.3, 0.35);
    if (k > 0.01) { const x = 70, y = 1080, w = 940, h = 660, base = y + h - 120, top = y + 150, MX = 34000;
      panel(x, y, w, h, k); txt('LO QUE GANAN · 4 AÑOS DESPUÉS', x + 34, y + 50, 26, HC.white, k); txt('BASE MEDIA DE COTIZACIÓN AL AÑO', x + 34, y + 90, 20, HC.grey, k, { bold: false });
      const bars = [[x + 250, TEAL_H, 'QUÍMICA', 27253, K.n27_9], [x + 690, AMB_H, 'ING. QUÍMICA', 31202, K.n31_10]];
      for (const [bx, col, name, v, t0] of bars) { const g = eio(clamp((t - t0 + 0.15) / 0.8)), val = v * g, hh = (base - top) * val / MX;
        hg.save(); hg.globalAlpha = k; hg.fillStyle = 'rgba(238,242,246,.08)'; hg.fillRect(bx - 80, top, 160, base - top);
        hg.shadowColor = col; hg.shadowBlur = 18; hg.fillStyle = col; hg.fillRect(bx - 80, base - hh, 160, hh); hg.restore();
        txt(name, bx, base + 44, 24, col, k, { align: 'center' }); if (g > 0.01) txt(fmtE(val), bx, base - hh - 40, 44, HC.white, k, { align: 'center', ls: 1 }); }
      const kd = win(t, K.casi10 - 0.05, 0.35) * k;
      if (kd > 0.01) { const y1 = base - (base - top) * 27253 / MX, y2 = base - (base - top) * 31202 / MX, xx = x + 460; hg.save(); hg.globalAlpha = kd; hg.strokeStyle = AMB_H; hg.lineWidth = 3; hg.setLineDash([10, 8]);
        hg.beginPath(); hg.moveTo(x + 330, y1); hg.lineTo(xx + 140, y1); hg.stroke(); hg.setLineDash([]); hg.beginPath(); hg.moveTo(xx + 10, y1); hg.lineTo(xx + 10, y2); hg.stroke(); hg.restore();
        txt('+3.949 €', xx + 10, y1 + 62, 40, AMB_H, kd, { align: 'center', ls: 1 }); }
      txt('FUENTE: U-RANKING 2025 (FUNDACIÓN BBVA-IVIE) · SEG. SOCIAL · EGRESADOS DE 2019', W / 2, y + h - 28, 15, HC.grey, k * 0.9, { align: 'center', bold: false, ls: 1 }); } }
  // 11: sin el químico…
  stamp('SIN QUÍMICO', W / 2, 1500, cw(t, K.sin11 - 0.05, K.nada11 + 0.1, 0.2, 0.3), HC.red, 64);
  bigText('NADA QUE FABRICAR', W / 2, 1610, 38, HC.white, cw(t, K.nada11 - 0.05, TT.relight + 0.2, 0.2, 0.3), { dark: 20 });
  // 12: ¿laboratorio o fábrica?
  bigText('¿LABORATORIO O FÁBRICA?', W / 2, 1400, 58, HC.white, cw(t, K.laboratorio12 - 0.05, END - 1.15, 0.2, 0.4), { dark: 24 });
  chip('EQUIPO QUÍMICA', W / 2, 1540, TEAL_H, cw(t, K.equipo12 - 0.05, END - 1.15, 0.15, 0.4), 32);
  chip('EQUIPO ING. QUÍMICA', W / 2, 1660, AMB_H, cw(t, K.equipo12b - 0.05, END - 1.15, 0.15, 0.4), 32);
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
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '800' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = Math.ceil(lines[lines.length - 1].end + 2.0);
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    crees1: atL(1, 'crees'), quimica1: atL(1, 'quimica'), ingenieria1: atL(1, 'ingenieria'), misma1: atL(1, 'misma'), carrera1: atL(1, 'carrera'),
    realidad2: atL(2, 'realidad'), gramos2: atL(2, 'gramos'), otra2: atL(2, 'otra'), toneladas2: atL(2, 'toneladas'),
    cual3: atL(3, 'cual'), cobra3: atL(3, 'cobra'), digo3: atL(3, 'digo'), final3: atL(3, 'final'),
    primero4: atL(4, 'primero'), quimica4: atL(4, 'quimica'), matematicas4: atL(4, 'matematicas'), fisica4: atL(4, 'fisica'), laboratorio4: atL(4, 'laboratorio'),
    separan5: atL(5, 'separan'), quimico5: atL(5, 'quimico'), moleculas5: atL(5, 'moleculas'), algo5: atL(5, 'algo'), nuevo5: atL(5, 'nuevo'), tubo5: atL(5, 'tubo'), ensayo5: atL(5, 'ensayo'),
    ingeniero6: atL(6, 'ingeniero'), receta6: atL(6, 'receta'), fabrica6: atL(6, 'fabrica'), reactores6: atL(6, 'reactores'), columnas6: atL(6, 'columnas'), tuberias6: atL(6, 'tuberias'),
    salgan6: atL(6, 'salgan'), toneladas6: atL(6, 'toneladas'), dia6: atL(6, 'dia'), seguras6: atL(6, 'seguras'), baratas6: atL(6, 'baratas'),
    uno7: atL(7, 'uno'), laboratorios7: atL(7, 'laboratorios'), investigacion7: atL(7, 'investigacion'), farmaceuticas7: atL(7, 'farmaceuticas'),
    otro7: atL(7, 'otro'), plantas7: atL(7, 'plantas'), refinerias7: atL(7, 'refinerias'), depuradoras7: atL(7, 'depuradoras'),
    trabajo8: atL(8, 'trabajo'), igual8: atL(8, 'igual'), n8_8: atL(8, '=8'), n10_8: atL(8, '=10'),
    pero9: atL(9, 'pero'), cuatro9: atL(9, 'cuatro'), gana9: atL(9, 'gana'), n27_9: atL(9, '27'),
    ingeniero10: atL(10, 'ingeniero'), n31_10: atL(10, '31'), casi10: atL(10, 'casi'), n4_10: atL(10, '4'), mas10: atL(10, 'mas'),
    eso11: atL(11, 'eso'), sin11: atL(11, 'sin'), fabrica11: atL(11, 'fabrica'), nada11: atL(11, 'nada'), fabricar11: atL(11, 'fabricar'),
    laboratorio12: atL(12, 'laboratorio'), fabrica12: atL(12, 'fabrica'), equipo12: atL(12, 'equipo'), equipo12b: atL(12, 'equipo', 2), ingenieria12: atL(12, 'ingenieria'),
  };
  mats(); buildMats(); buildRig();
  scene.fog = new THREE.FogExp2(0x02040a, 0.012);
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35; }
  buildFlow(); buildQuimica(); buildTimes();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.TT = TT; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
