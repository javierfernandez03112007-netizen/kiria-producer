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
// ---------------------------------------------------------------- «El túnel del Banco Central» (Fortaleza, 2005): maqueta en corte, de noche.
// 1 unidad = 1 m en vertical; la avenida va acortada (los rótulos dan las medidas reales: 78 m de túnel, 4 m bajo la calle, 1,10 m de losa).
const TX0 = -4, TX1 = 23, TY = -4.5, TW = 0.8, TH = 0.9, CZ = -0.45;   // túnel: de la casa (x = -4) a bajo la cámara (x = 23); el corte pasa por su centro (z = CZ)
const VX0 = 18, VX1 = 28, VZB = -6;                                   // cámara acorazada (sótano del banco)
const SLB0 = TY + TH / 2, SLB1 = SLB0 + 1.1, ROOM1 = SLB1 + 3.0;      // losa de 1,10 m justo encima del túnel; techo de la cámara
const HX = 23, HR = 0.375;                                            // el agujero: 75 cm
const HOUSE = { x0: -7.6, x1: -0.9 }, AVE = { x0: 0.5, x1: 16.7 }, BANK = { x0: 17.4, x1: 30.2 };
const DOOR = { x: 20.6, y: SLB1 + 1.42, r: 1.12 };                    // puerta redonda de la cámara (pared del fondo)
const PALS = [[24.6, -4.55], [26.35, -4.55], [26.35, -2.75], [20.55, -2.6]];   // palés de billetes (x, z del centro)
const BLK = { w: 0.34, h: 0.17, d: 0.2, nx: 4, ny: 6, nz: 6 };        // bloques de fajos de 50 reales retractilados

function earthTex(seed) {
  return canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4e3828'); gr.addColorStop(0.55, '#3b281b'); gr.addColorStop(1, '#251912'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const x = hash(i * 7.1 + seed) * w, y = hash(i * 3.3 + seed) * h, rx = 20 + hash(i * 1.9) * 70, ry = 6 + hash(i * 2.3) * 16; g.fillStyle = `rgba(${55 + hash(i) * 40 | 0},${36 + hash(i * 2) * 26 | 0},${22 + hash(i * 5) * 16 | 0},.22)`; g.beginPath(); g.ellipse(x, y, rx, ry, (hash(i * 4) - 0.5) * 0.4, 0, 7); g.fill(); }
    for (let i = 0; i < 2800; i++) { const x = hash(i * 1.31 + seed) * w, y = hash(i * 2.93 + seed) * h, r = 0.6 + hash(i * 4.1) * 2.1; g.fillStyle = hash(i * 6.7) > 0.5 ? 'rgba(18,10,6,.5)' : 'rgba(160,128,96,.22)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    for (let i = 0; i < 70; i++) { const x = hash(i * 9.1 + seed) * w, y = hash(i * 8.3 + seed) * h, r = 3 + hash(i * 2.2) * 8; g.fillStyle = 'rgba(118,106,96,.6)'; g.beginPath(); g.ellipse(x, y, r, r * 0.7, hash(i) * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(30,24,20,.35)'; g.beginPath(); g.ellipse(x + 1, y + 1.5, r * 0.8, r * 0.45, hash(i) * 3, 0, 7); g.fill(); }
  });
}
function concTex(px = 256, dark = '#86898e') {
  return canvasTex(px, px, (g, w, h) => { g.fillStyle = dark; g.fillRect(0, 0, w, h); for (let i = 0; i < px * 14; i++) { const x = hash(i * 1.7) * w, y = hash(i * 3.1) * h; g.fillStyle = hash(i * 5.3) > 0.5 ? 'rgba(36,36,40,.28)' : 'rgba(225,225,230,.2)'; g.fillRect(x, y, 1.6, 1.6); } });
}
let EARTH = [], CONC, CONCD;
function earthBox(x0, x1, y0, y1, z0, z1, seed) {
  const t = earthTex(seed); repTex(t, (x1 - x0) / 7, (y1 - y0) / 7);
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
  const b = mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); scene.add(b); EARTH.push(b); return b;
}
function cbox(x0, x1, y0, y1, z0, z1, m = CONC) { const b = mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); scene.add(b); return b; }

function buildGround() {
  CONC = new THREE.MeshStandardMaterial({ map: repTex(concTex(), 3, 3), roughness: 0.86 });
  CONCD = new THREE.MeshStandardMaterial({ map: repTex(concTex(256, '#5d6066'), 3, 3), roughness: 0.9 });
  const XL = -11, XR = 33, YB = -8, ZB = -7;
  const T0 = TY - TH / 2, T1 = TY + TH / 2, ZT = CZ - TW / 2;             // canal del túnel: abierto hacia delante (z > ZT)
  earthBox(XL, XR, YB, T0, ZB, CZ, 1);                                     // por debajo del túnel
  earthBox(XL, TX0 - 0.45, T0, T1, ZB, CZ, 2);                            // a la altura del túnel: a los lados y detrás
  earthBox(TX0 - 0.45, TX1 + 0.45, T0, T1, ZB, ZT, 3);
  earthBox(TX1 + 0.45, XR, T0, T1, ZB, CZ, 4);
  earthBox(XL, TX0 - 0.45, T1, 0, ZB, CZ, 5);                             // por encima: el pozo de la casa queda abierto delante
  earthBox(TX0 - 0.45, TX0 + 0.45, T1, 0, ZB, ZT, 6);
  earthBox(TX0 + 0.45, VX0, T1, 0, ZB, CZ, 7);
  earthBox(VX1, XR, T1, 0, ZB, CZ, 8);
  earthBox(VX0, VX1, -0.4, 0, ZB, VZB, 9);
  // superficie: acera, avenida con marcas, acera
  const asph = new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.75 }), walk = new THREE.MeshStandardMaterial({ map: repTex(concTex(256, '#7a7c80'), 6, 2), roughness: 0.8 });
  cbox(XL, AVE.x0, 0, 0.12, ZB, CZ, walk); cbox(AVE.x1, XR, 0, 0.12, ZB, CZ, walk);
  cbox(AVE.x0, AVE.x1, 0, 0.04, ZB, CZ, asph);
  const lineM = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.6, emissive: 0x202020 });
  for (let z = ZB + 0.4; z < CZ - 0.3; z += 1.4) cbox(8.5, 8.7, 0.04, 0.05, z, z + 0.8, lineM);
  cbox(AVE.x0 + 0.3, AVE.x0 + 0.4, 0.04, 0.05, ZB, CZ, lineM); cbox(AVE.x1 - 0.4, AVE.x1 - 0.3, 0.04, 0.05, ZB, CZ, lineM);
  { const rimM = new THREE.MeshStandardMaterial({ color: 0x6b5440, roughness: 0.9 }); cbox(XL, XR, -0.35, 0, CZ - 0.02, CZ + 0.02, rimM); }
  // farolas
  S.lamps = [];
  for (const [x, z] of [[0.15, -1.2], [16.95, -1.2], [-9.5, -1.2], [31.5, -1.2]]) {
    const pole = cyl(0.07, 0.09, 5.4, M.dsteel, 12); pole.position.set(x, 2.82, z); scene.add(pole);
    const arm = cyl(0.04, 0.04, 1.1, M.dsteel, 8); arm.rotation.z = Math.PI / 2; arm.position.set(x + (x < 8 ? 0.5 : -0.5), 5.45, z); scene.add(arm);
    const head = mesh(new THREE.BoxGeometry(0.55, 0.12, 0.3), glowM(0xffc27a, 3.2)); head.position.set(x + (x < 8 ? 1.0 : -1.0), 5.38, z); scene.add(head);
    const L = new THREE.PointLight(0xffb46a, 22, 13, 1.6); L.position.set(x + (x < 8 ? 1.0 : -1.0), 5.0, z + 0.4); scene.add(L); S.lamps.push(L);
  }
  // cielo nocturno: un degradado lejano
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(260, 120), new THREE.MeshBasicMaterial({ map: canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#02040a'); gr.addColorStop(0.7, '#0b1426'); gr.addColorStop(1, '#16203a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), depthWrite: false, fog: false }));
  sky.position.set(10, 40, -60); scene.add(sky);
}

// ---------------------------------------------------------------- la casa del «césped artificial»
function buildHouse() {
  const stucco = paint(0xd9cdb6, 0.75, 0), roofM = paint(0x6c4a3a, 0.7, 0);
  const g = new THREE.Group(); scene.add(g); S.house = g;
  const { x0, x1 } = HOUSE, z0 = -6.6, z1 = -2.7, h = 3.3;
  const body = mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), stucco); body.position.set((x0 + x1) / 2, h / 2 + 0.12, (z0 + z1) / 2); g.add(body);
  const roof = mesh(new THREE.BoxGeometry(x1 - x0 + 0.4, 0.22, z1 - z0 + 0.4), roofM); roof.position.set((x0 + x1) / 2, h + 0.23, (z0 + z1) / 2); g.add(roof);
  const gar = mesh(new THREE.BoxGeometry(2.6, 2.3, 0.06), new THREE.MeshStandardMaterial({ map: canvasTex(64, 128, (g2, w, hh) => { g2.fillStyle = '#7d8187'; g2.fillRect(0, 0, w, hh); g2.fillStyle = 'rgba(0,0,0,.22)'; for (let y = 0; y < hh; y += 10) g2.fillRect(0, y, w, 2); }), roughness: 0.6, metalness: 0.3 }));
  gar.position.set(x0 + 1.9, 1.27, z1 + 0.03); g.add(gar);
  const win = mesh(new THREE.BoxGeometry(1.3, 1.0, 0.05), glowM(0xffcf8a, 1.4)); win.position.set(x1 - 1.3, 1.9, z1 + 0.03); g.add(win);
  const door = mesh(new THREE.BoxGeometry(0.9, 2.0, 0.05), M.woodL); door.position.set(x1 - 3.1, 1.12, z1 + 0.03); g.add(door);
  // el cartel
  const sign = plateText(4.6, 0.95, [['GRAMA SINTÉTICA', 0.5, 0.53]], { fg: '#f4f1e6', bg: '#1f7a3a', weight: 900, px: 1024, border: true });
  sign.position.set((x0 + x1) / 2, h + 0.95, z1 + 0.05); g.add(sign); S.sign = sign;
  const sub = plateText(3.2, 0.34, [['CÉSPED ARTIFICIAL · VENTA', 0.62, 0.54]], { fg: '#1f2a22', bg: '#e8e2cf', weight: 800, px: 1024 }); sub.position.set((x0 + x1) / 2, h + 0.28, z1 + 0.05); g.add(sub);
  // rollos de césped
  const grassT = canvasTex(256, 64, (g2, w, hh) => { g2.fillStyle = '#2f8d3b'; g2.fillRect(0, 0, w, hh); for (let i = 0; i < 900; i++) { g2.fillStyle = hash(i * 1.9) > 0.5 ? 'rgba(130,220,110,.55)' : 'rgba(10,60,20,.5)'; g2.fillRect(hash(i * 3.7) * w, hash(i * 5.1) * hh, 1.2, 4); } });
  const grassM = new THREE.MeshStandardMaterial({ map: grassT, roughness: 0.85 });
  S.rolls = [];
  [[0, 0], [0.62, 0], [1.24, 0], [0.31, 0.53], [0.93, 0.53], [0.62, 1.06]].forEach(([dx, dy], i) => {
    const r = cyl(0.3, 0.3, 1.6, grassM, 20); r.rotation.x = Math.PI / 2; r.position.set(x1 - 3.4 + dx, 0.42 + dy, z1 + 1.0); scene.add(r); S.rolls.push(r);
  });
  // la camioneta que se lleva la tierra
  const tk = new THREE.Group(); scene.add(tk); S.truck = tk;
  const bodyM = paint(0xe8e6df, 0.4, 1), cab = mesh(new THREE.BoxGeometry(1.5, 1.2, 1.7), bodyM); cab.position.set(0, 1.0, -1.5); tk.add(cab);
  const glassM = new THREE.MeshStandardMaterial({ color: 0x1a2533, roughness: 0.15, metalness: 0.6 }); const ws = mesh(new THREE.BoxGeometry(1.42, 0.55, 0.05), glassM); ws.position.set(0, 1.25, -0.63); tk.add(ws);
  const bed = mesh(new THREE.BoxGeometry(1.5, 0.5, 2.6), bodyM); bed.position.set(0, 0.7, 0.75); tk.add(bed);
  const dirtM = new THREE.MeshStandardMaterial({ map: repTex(earthTex(11), 1, 1), roughness: 1 });
  const dirt = mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), dirtM); dirt.scale.set(0.68, 0.5, 1.15); dirt.position.set(0, 0.95, 0.75); tk.add(dirt); S.dirt = dirt;
  for (const [x, z] of [[-0.72, -1.4], [0.72, -1.4], [-0.72, 1.3], [0.72, 1.3]]) { const w = cyl(0.36, 0.36, 0.28, M.black, 18); w.rotation.z = Math.PI / 2; w.position.set(x, 0.38, z); tk.add(w); }
  const hl = mesh(new THREE.BoxGeometry(1.2, 0.12, 0.05), glowM(0xfff2d6, 2.4)); hl.position.set(0, 0.8, -2.37); tk.add(hl);
}

// ---------------------------------------------------------------- el banco y su cámara acorazada (en corte)
function buildBank() {
  const facM = paint(0xcfd3d8, 0.55, 0.2), g = new THREE.Group(); scene.add(g); S.bank = g;
  const { x0, x1 } = BANK, z0 = -7.0, z1 = -2.3, h = 8.6;
  const body = mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), facM); body.position.set((x0 + x1) / 2, h / 2 + 0.12, (z0 + z1) / 2); g.add(body);
  S.bankWin = [];
  for (let fl = 0; fl < 2; fl++) for (let i = 0; i < 6; i++) { const w = mesh(new THREE.BoxGeometry(1.25, 1.5, 0.05), glowM(0xcfe3ff, 0.9)); w.position.set(x0 + 1.4 + i * 1.95, 4.0 + fl * 2.6, z1 + 0.03); g.add(w); S.bankWin.push(w); }
  for (let i = 0; i < 5; i++) { const c = cyl(0.26, 0.3, 3.0, M.stone, 20); c.position.set(x0 + 1.6 + i * 2.4, 1.62, z1 + 0.55); g.add(c); }
  const ent = mesh(new THREE.BoxGeometry(x1 - x0 - 1.2, 0.35, 1.2), M.stone); ent.position.set((x0 + x1) / 2, 3.3, z1 + 0.5); g.add(ent);
  const sign = plateText(7.4, 0.9, [['BANCO CENTRAL', 0.6, 0.54]], { fg: '#e9edf2', bg: '#1d2b44', weight: 900, px: 1024 }); sign.position.set((x0 + x1) / 2, h - 0.75, z1 + 0.05); g.add(sign); S.bankSign = sign;
  const closed = plateText(2.2, 0.55, [['CERRADO', 0.62, 0.54]], { fg: '#ffffff', bg: '#b3122a', weight: 900, px: 512 }); closed.position.set(x0 + 6.4, 2.1, z1 + 1.12); g.add(closed); S.closed = closed;
  // cámara acorazada: paredes, techo y la losa con el agujero (el corte pasa por el centro del agujero)
  cbox(VX0, VX1, ROOM1, ROOM1 + 0.4, VZB, CZ, CONCD);                 // techo
  cbox(VX0 - 0.6, VX0, SLB0, ROOM1 + 0.4, VZB, CZ, CONCD);             // pared izquierda
  cbox(VX1, VX1 + 0.6, SLB0, ROOM1 + 0.4, VZB, CZ, CONCD);             // pared derecha
  { const sh = new THREE.Shape(); sh.moveTo(VX0, SLB1); sh.lineTo(VX1, SLB1); sh.lineTo(VX1, ROOM1); sh.lineTo(VX0, ROOM1); sh.closePath();     // pared del fondo con el hueco de la puerta
    const ho = new THREE.Path(); ho.absarc(DOOR.x, DOOR.y, DOOR.r + 0.04, 0, Math.PI * 2, false); sh.holes.push(ho);
    const w = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false, curveSegments: 48 }), CONCD); w.position.z = VZB; scene.add(w); }
  const corr = mesh(new THREE.PlaneGeometry(6, 5), new THREE.MeshStandardMaterial({ color: 0x8a8f96, emissive: 0xd9d2c4, emissiveIntensity: 0, roughness: 0.6 })); corr.position.set(DOOR.x, DOOR.y, VZB - 0.4); scene.add(corr); S.corr = corr;
  // losa: planta con media muesca (el agujero) en el borde del corte, extruida 1,10 m hacia arriba
  { const sh = new THREE.Shape(), d0 = -CZ, d1 = -VZB; sh.moveTo(VX0 - 0.6, d0); sh.lineTo(HX - HR, d0); sh.absarc(HX, d0, HR, Math.PI, 0, true); sh.lineTo(VX1 + 0.6, d0); sh.lineTo(VX1 + 0.6, d1); sh.lineTo(VX0 - 0.6, d1); sh.closePath();
    const slab = mesh(new THREE.ExtrudeGeometry(sh, { depth: SLB1 - SLB0, bevelEnabled: false, curveSegments: 40 }), CONC); slab.rotation.x = -Math.PI / 2; slab.position.y = SLB0; scene.add(slab); S.slab = slab; }
  // cara del corte de la losa: hormigón con la armadura de acero (puntos y barras), con el hueco del agujero transparente
  { const pxm = 220, Wm = VX1 - VX0 + 1.2, Hm = SLB1 - SLB0, cw = Math.round(Wm * pxm), ch = Math.round(Hm * pxm);
    const tex = canvasTex(cw, ch, (g2, w, h) => {
      g2.fillStyle = '#8f9297'; g2.fillRect(0, 0, w, h); for (let i = 0; i < w * 6; i++) { g2.fillStyle = hash(i * 1.3) > 0.5 ? 'rgba(40,40,44,.3)' : 'rgba(230,230,235,.22)'; g2.fillRect(hash(i * 2.7) * w, hash(i * 4.9) * h, 2, 2); }
      for (let i = 0; i < w * 0.35; i++) { g2.fillStyle = 'rgba(70,70,74,.5)'; g2.beginPath(); g2.arc(hash(i * 7.7) * w, hash(i * 8.9) * h, 1.5 + hash(i) * 3, 0, 7); g2.fill(); }
      for (const yy of [0.07, 0.19, Hm - 0.19, Hm - 0.07]) { const y = (Hm - yy) * pxm; g2.strokeStyle = '#a2532a'; g2.lineWidth = 9; g2.beginPath(); g2.moveTo(10, y); g2.lineTo(w - 10, y); g2.stroke(); g2.strokeStyle = 'rgba(255,170,120,.5)'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(10, y - 2); g2.lineTo(w - 10, y - 2); g2.stroke(); }
      for (const yy of [0.13, Hm - 0.13]) for (let x = 0.1; x < Wm; x += 0.16) { g2.fillStyle = '#b05b2e'; g2.beginPath(); g2.arc(x * pxm, (Hm - yy) * pxm, 7.5, 0, 7); g2.fill(); g2.fillStyle = 'rgba(255,190,140,.6)'; g2.beginPath(); g2.arc(x * pxm - 2, (Hm - yy) * pxm - 2, 2.5, 0, 7); g2.fill(); }
      const hx0 = (HX - HR - (VX0 - 0.6)) * pxm, hw = 2 * HR * pxm; S.plugCan = document.createElement('canvas'); S.plugCan.width = Math.round(hw); S.plugCan.height = h; S.plugCan.getContext('2d').drawImage(g2.canvas, hx0, 0, hw, h, 0, 0, Math.round(hw), h);
      g2.clearRect(hx0, 0, hw, h);
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(Wm, Hm), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.85 }));
    face.position.set((VX0 - 0.6 + VX1 + 0.6) / 2, (SLB0 + SLB1) / 2, CZ + 0.004); face.receiveShadow = true; scene.add(face); S.slabFace = face; }
  // el tapón que se va perforando (media columna de hormigón) y la capa fina que dejan
  { const plug = new THREE.Group(); scene.add(plug); S.plug = plug;
    const c = mesh(new THREE.CylinderGeometry(HR, HR, 1, 40, 1, false, Math.PI / 2, Math.PI), CONC); c.position.y = 0.5; plug.add(c);
    const pt = new THREE.CanvasTexture(S.plugCan); pt.colorSpace = THREE.SRGBColorSpace; S.plugTex = pt; const f = mesh(new THREE.PlaneGeometry(2 * HR, 1), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.85 })); f.position.set(0, 0.5, 0.004); plug.add(f);
    plug.position.set(HX, SLB0, CZ);
    const shellM = new THREE.MeshStandardMaterial({ color: 0x3a3b3f, roughness: 0.95, side: THREE.BackSide });
    const shell = mesh(new THREE.CylinderGeometry(HR, HR, SLB1 - SLB0, 40, 1, true, Math.PI / 2, Math.PI), shellM); shell.position.set(HX, (SLB0 + SLB1) / 2, CZ); scene.add(shell);
    S.layerGlow = new THREE.Mesh(new THREE.TorusGeometry(HR, 0.022, 8, 48, Math.PI), basicGlow(0xffa64a, 1.6)); S.layerGlow.rotation.x = Math.PI / 2; S.layerGlow.rotation.z = Math.PI; scene.add(S.layerGlow);
    S.disc = new THREE.Group(); const dm = mesh(new THREE.CylinderGeometry(HR - 0.02, HR - 0.02, 0.03, 40), M.steel); S.disc.add(dm);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(HR - 0.02, 0.018, 8, 48), basicGlow(0xffd28a, 1.8)); rim.rotation.x = Math.PI / 2; S.disc.add(rim); S.disc.position.set(HX, SLB0 - 0.05, CZ - 0.2); scene.add(S.disc);
    S.frags = Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI, r = HR * (0.25 + 0.6 * hash(i * 3.1)); const fr = mesh(new THREE.BoxGeometry(0.16 + 0.1 * hash(i), 0.07, 0.14 + 0.1 * hash(i * 2)), CONC); fr.userData.p = v3(HX + Math.cos(a) * r, SLB1 - 0.04, CZ - Math.sin(a) * r * 0.9); fr.userData.v = v3((hash(i * 5) - 0.5) * 0.8, -0.4 - hash(i * 7) * 0.6, (hash(i * 9) - 0.5) * 0.4); scene.add(fr); return fr; });
    S.upLight = new THREE.PointLight(0xffc788, 0, 7, 1.6); S.upLight.position.set(HX, SLB1 + 0.4, CZ - 0.3); scene.add(S.upLight);
    S.cone = lightCone(0.55, 2.8, 0.12, 0xffd7a0); S.cone.position.set(HX, SLB1 + 1.4, CZ - 0.25); S.cone.rotation.x = Math.PI; scene.add(S.cone); }
  // puerta redonda
  { const pv = new THREE.Group(); pv.position.set(DOOR.x - DOOR.r, DOOR.y, VZB + 0.62); scene.add(pv); S.doorPv = pv;
    const d = new THREE.Group(); d.position.x = DOOR.r; pv.add(d);
    const body = cyl(DOOR.r, DOOR.r, 0.42, metal(0x9aa2ad, 0.42), 64); body.rotation.x = Math.PI / 2; d.add(body);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(DOOR.r * 0.82, 0.05, 12, 64), M.dsteel); ring.position.z = 0.22; d.add(ring);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, b = sph(0.06, M.dsteel, 12, 8); b.position.set(Math.cos(a) * DOOR.r * 0.92, Math.sin(a) * DOOR.r * 0.92, 0.22); d.add(b); }
    const hub = cyl(0.16, 0.16, 0.12, M.brass, 24); hub.rotation.x = Math.PI / 2; hub.position.z = 0.27; d.add(hub);
    for (let i = 0; i < 3; i++) { const sp = cyl(0.03, 0.03, 0.9, M.brass, 10); sp.rotation.z = i * Math.PI / 3; sp.position.z = 0.3; d.add(sp); }
    S.doorL = new THREE.SpotLight(0xdfe9ff, 0, 18, 0.7, 0.5, 1.2); S.doorL.position.set(DOOR.x, DOOR.y + 0.2, VZB - 0.5); S.doorL.target.position.set(DOOR.x + 1.5, SLB1, -2); scene.add(S.doorL, S.doorL.target); }
  // cámaras y sensores (no funcionaban)
  S.sec = [];
  for (const [x, z, cam2] of [[19.2, -1.4, true], [27.2, -1.4, true], [27.3, -5.3, false], [18.8, -5.0, false]]) {
    const gS = new THREE.Group(); gS.position.set(x, ROOM1 - 0.05, z); scene.add(gS);
    if (cam2) { const b = mesh(new THREE.BoxGeometry(0.22, 0.16, 0.36), paint(0xe9ebee, 0.4, 1)); b.position.set(0, -0.16, 0); b.rotation.x = 0.5; gS.add(b); const arm = cyl(0.03, 0.03, 0.14, M.dsteel, 8); arm.position.y = -0.06; gS.add(arm); }
    else { const b = mesh(new THREE.BoxGeometry(0.2, 0.12, 0.12), paint(0xe9ebee, 0.4, 1)); b.position.y = -0.1; gS.add(b); }
    const led = sph(0.03, glowM(0xff3b30, 3), 10, 8); led.position.set(0.07, cam2 ? -0.1 : -0.12, cam2 ? 0.19 : 0.065); gS.add(led); gS.userData.led = led; S.sec.push(gS);
  }
  const vl = new THREE.PointLight(0xcfe0ff, 0, 12, 1.6); vl.position.set(23, ROOM1 - 0.6, -2.4); scene.add(vl); S.vaultL = vl;
}

// ---------------------------------------------------------------- los palés de billetes de 50 reales (bloques retractilados)
let BLKS = [];
function noteTex() {
  return canvasTex(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#9a5c2c'); gr.addColorStop(0.5, '#c07a3e'); gr.addColorStop(1, '#8e5426'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(255,236,200,${0.06 + hash(y) * 0.12})`; g.fillRect(0, y, w, 1); }
    g.fillStyle = '#efe7d2'; g.fillRect(w * 0.42, 0, w * 0.16, h); g.fillStyle = '#2f2418'; g.font = '900 30px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('50', w * 0.5, h * 0.5);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
  });
}
function buildMoney() {
  const m = new THREE.MeshStandardMaterial({ map: noteTex(), roughness: 0.55 });
  const n = BLK.nx * BLK.ny * BLK.nz;
  S.pals = PALS.map(([px, pz], pi) => {
    const base = mesh(new THREE.BoxGeometry(BLK.nx * BLK.w + 0.12, 0.14, BLK.nz * BLK.d + 0.12), M.woodL); base.position.set(px, SLB1 + 0.07, pz); scene.add(base);
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(BLK.w * 0.96, BLK.h * 0.94, BLK.d * 0.96), m, n); im.castShadow = true; im.receiveShadow = true; scene.add(im);
    const home = [];
    for (let iy = 0; iy < BLK.ny; iy++) for (let ix = 0; ix < BLK.nx; ix++) for (let iz = 0; iz < BLK.nz; iz++) home.push(v3(px + (ix - (BLK.nx - 1) / 2) * BLK.w, SLB1 + 0.14 + (iy + 0.5) * BLK.h, pz + (iz - (BLK.nz - 1) / 2) * BLK.d));
    home.sort((a, b) => b.y - a.y || hash(a.x * 3 + a.z) - hash(b.x * 3 + b.z));     // se van primero los de arriba
    const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BLK.nx * BLK.w + 0.16, BLK.ny * BLK.h + 0.2, BLK.nz * BLK.d + 0.16)), new THREE.LineBasicMaterial({ color: 0x9aa3ad, transparent: true, opacity: 0.55 }));
    cage.position.set(px, SLB1 + 0.14 + (BLK.ny * BLK.h + 0.2) / 2, pz); scene.add(cage);
    return { im, home, n };
  });
  S.fly = new THREE.InstancedMesh(new THREE.BoxGeometry(BLK.w * 1.15, BLK.h * 1.15, BLK.d * 1.15), m, 190); S.fly.castShadow = true; scene.add(S.fly);
}

// ---------------------------------------------------------------- el túnel por dentro: vigas, bombillas y el tubo de ventilación (aparecen según avanza)
function buildTunnel() {
  const T0 = TY - TH / 2, T1 = TY + TH / 2, ZT = CZ - TW / 2;
  const plankM = new THREE.MeshStandardMaterial({ map: repTex(woodTex('#5c3d22', '#3a2412', '#7a5432', 4), 6, 1), roughness: 0.8 });
  const floor = mesh(new THREE.BoxGeometry(TX1 - TX0 + 0.4, 0.05, TW / 2), plankM); floor.position.set((TX0 + TX1) / 2, T0 + 0.025, (ZT + CZ) / 2); scene.add(floor); S.tFloor = floor;
  S.frames = []; S.bulbs = []; const beamM = M.woodL;
  for (let x = TX0 + 0.6; x < TX1 - 0.2; x += 1.1) {
    const g = new THREE.Group(); g.position.x = x; scene.add(g);
    const post = mesh(new THREE.BoxGeometry(0.1, TH - 0.04, 0.1), beamM); post.position.set(0, TY, ZT + 0.06); g.add(post);
    const top = mesh(new THREE.BoxGeometry(0.1, 0.1, TW / 2 + 0.02), beamM); top.position.set(0, T1 - 0.06, (ZT + CZ) / 2); g.add(top);
    g.userData.x = x; S.frames.push(g);
  }
  for (let x = TX0 + 1.4; x < TX1 - 0.4; x += 2.6) { const b = sph(0.05, glowM(0xffc77a, 4), 12, 8); b.position.set(x, T1 - 0.17, CZ - 0.2); scene.add(b); const wire = cyl(0.006, 0.006, 0.06, M.black, 4); wire.position.set(x, T1 - 0.1, CZ - 0.2); scene.add(wire); b.userData.x = x; S.bulbs.push(b); wire.userData.x = x; S.bulbs.push(wire); }
  const ductM = new THREE.MeshStandardMaterial({ map: canvasTex(64, 16, (g, w, h) => { g.fillStyle = '#6f757e'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.35)'; for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1.4, h); }), roughness: 0.55, metalness: 0.3 });
  ductM.map.wrapS = THREE.RepeatWrapping; ductM.map.repeat.set(40, 1);
  S.duct = cyl(0.07, 0.07, 1, ductM, 16); S.duct.rotation.z = Math.PI / 2; S.duct.position.set(TX0, T1 - 0.13, ZT + 0.12); scene.add(S.duct);
  const shaftL = mesh(new THREE.BoxGeometry(0.06, -T1, 0.06), beamM); shaftL.position.set(TX0 - 0.38, T1 / 2, ZT + 0.06); scene.add(shaftL);
  S.tLights = [0.5, 7.5, 14.5, 21].map(x => { const L = new THREE.PointLight(0xffb867, 0, 6.5, 1.5); L.position.set(x, TY + 0.25, CZ + 0.25); L.userData.x = x; scene.add(L); return L; });
  S.digLine = drawLine([v3(TX0, -0.2, CZ), v3(TX0, TY, CZ), v3(TX1, TY, CZ)].flatMap((p, i, a) => i ? Array.from({ length: 40 }, (_, k) => a[i - 1].clone().lerp(p, (k + 1) / 40)) : [p]), 0xffc06a, 5, 1);
  S.digLine.position.z = 0.03;
}
function buildRobo() { buildGround(); buildHouse(); buildBank(); buildMoney(); buildTunnel(); S.sp = sparks(scene, 70, 0xffc46a, 0.05); }
// ---------------------------------------------------------------- tiempos y animación (todo depende de K: las palabras de la voz)
const sinL = (t, f, ph = 0) => Math.sin(2 * Math.PI * Math.max(1, Math.round(f * END / (2 * Math.PI))) * t / END + ph);   // periódico en END (bucle)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
let TT = {};
function buildTimes() {
  TT = {
    dig0: K.tunel1 - 0.05, dig1: K.debajo1 + 0.15,              // la línea del túnel: de la casa a la cámara
    drill0: K.perforan7, drill1: K.capa7 + 0.1,                // perforan hasta dejar la capa fina
    brk: K.rompen8 + 0.25,                                     // se rompe la última capa
    flow0: K.sacan11 - 0.1, flow1: K.reales11 + 0.7,           // los billetes salen por el túnel
    rw: END - 0.85,                                            // vuelta al principio (bucle)
  };
}

function xDigAt(t) {     // hasta dónde se ve el túnel por dentro: terminado en el gancho (y al final, para el bucle); se construye en la frase 5
  if (t < K.fortaleza2 + 0.4) return TX1 + 0.4;
  if (t < K.avanza5 - 0.5) return TX0 - 1;
  return lerp(TX0 - 0.2, TX1 + 0.4, eio(clamp((t - K.avanza5 + 0.5) / (K.ventilacion5 - K.avanza5 + 0.9))));
}
const lightsOn = t => (t < K.fortaleza2 + 0.4 ? 1 : 0) + (t > K.luz5 - 0.1 ? win(t, K.luz5 - 0.1, 0.25) : 0);
// camino de los bloques de billetes: palé → agujero → túnel → pozo de la casa
function flowPath(u, i, out) {
  const P = PALS[i % 4], top = v3(P[0], SLB1 + 0.3 + BLK.ny * BLK.h, P[1]);
  const pts = [top, v3(HX, SLB1 + 0.55, CZ - 0.22), v3(HX, TY - 0.15, CZ - 0.22), v3(TX0 + 0.2, TY - 0.15, CZ - 0.22), v3(TX0, -0.2, CZ - 0.22)];
  const L = []; let tot = 0; for (let k = 1; k < pts.length; k++) { const d = pts[k].distanceTo(pts[k - 1]); L.push(d); tot += d; }
  let s = u * tot; for (let k = 0; k < L.length; k++) { if (s <= L[k] || k === L.length - 1) return out.copy(pts[k]).lerp(pts[k + 1], clamp(s / L[k])); s -= L[k]; }
  return out.copy(pts[pts.length - 1]);
}
function stageAt2(t) {
  const rw = win(t, TT.rw, 0.7);
  // la línea del túnel (gancho)
  { const k = eio(clamp((t - TT.dig0) / (TT.dig1 - TT.dig0))) * (1 - win(t, K.fortaleza2 + 0.2, 0.5)); drawK(S.digLine, k); S.digLine.material.opacity = 1; }
  // farolas: un parpadeo lento
  S.lamps.forEach((L, i) => { L.intensity = 20 + 2 * sinL(t, 1.3, i); });
  // la casa: el cartel resalta; los rollos de césped botan en «césped artificial»
  S.rolls.forEach((r, i) => { const b = pop(t, K.cesped3 + i * 0.05, 0.4), s = t > K.cesped3 && t < K.cesped3 + 0.6 ? 1 + 0.12 * Math.sin(clamp((t - K.cesped3 - i * 0.05) / 0.4) * Math.PI) : 1; r.scale.set(s, 1, s); void b; });
  // la camioneta con tierra: aparece aparcada y se va por la avenida en «sale tierra»
  { const tk = S.truck, t0 = K.alquilan3 - 0.2, td = K.sale4 - 0.25, vis = t > t0 && t < td + 3; tk.visible = vis;
    if (vis) { const u = clamp((t - td) / 2.6), z = -2.6 - 12 * u * u; tk.position.set(3.1, 0.12, z); tk.rotation.y = 0; tk.scale.setScalar(Math.max(0.001, pop(t, t0, 0.4) * (1 - clamp((-z - 7.5) / 1.5)))); S.dirt.visible = true; } }
  // banco: ventanas y «CERRADO»
  { const closed = cwin(t, K.cerrado8 - 0.1, K.lunes12, 0.3, 0.3); S.bankWin.forEach(w => (w.material.emissiveIntensity = 0.9 * (1 - 0.85 * closed)));
    S.closed.visible = closed > 0.01; S.closed.scale.setScalar(Math.max(0.001, pop(t, K.cerrado8 - 0.1, 0.4) * (1 - win(t, K.lunes12, 0.3)))); }
  // la cámara: luz al principio (gancho), luego a oscuras hasta que entran
  S.vaultL.intensity = 26 * cwin(t, K.camara1 - 0.1, K.fortaleza2 + 0.4, 0.35, 0.5) + 10 * cwin(t, K.entran8, K.abren12, 0.4, 0.3) + 4 * cwin(t, K.abren12, TT.rw, 0.3, 0.5);
  // el túnel por dentro
  { const xd = xDigAt(t);
    S.frames.forEach(f => { const k = clamp((xd - f.userData.x) / 0.8); f.visible = k > 0.01; f.scale.set(1, Math.max(0.001, eo(k)), 1); });
    const lightOn = clamp(lightsOn(t));
    S.bulbs.forEach(b => { b.visible = xd > b.userData.x && (b.geometry.type !== 'SphereGeometry' || lightOn > 0.02); if (b.material.emissiveIntensity !== undefined && b.geometry.type === 'SphereGeometry') b.material.emissiveIntensity = 4 * lightOn; });
    const dk = (t < K.ventilacion5 - 0.15 && t > K.fortaleza2 + 0.4) ? 0 : clamp((xd - TX0) / (TX1 - TX0)), dl = Math.max(0.001, (TX1 - TX0) * dk);
    S.duct.visible = dk > 0.003; S.duct.scale.set(1, dl, 1); S.duct.position.x = TX0 + dl / 2;
    S.tFloor.visible = xd > TX0; S.tFloor.scale.x = Math.max(0.001, clamp((xd - TX0) / (TX1 - TX0)));
    S.tFloor.position.x = TX0 + (TX1 - TX0 + 0.4) * S.tFloor.scale.x / 2 - 0.2; }
  // perforación: el tapón sube hasta dejar una capa fina; el viernes la rompen
  { const yFin = SLB1 - 0.07, ycut = lerp(SLB0, yFin, eio(clamp((t - TT.drill0) / (TT.drill1 - TT.drill0)))), gone = t > TT.brk;
    if (!gone) { S.plug.visible = true; S.plug.position.y = ycut; S.plug.scale.y = Math.max(0.001, SLB1 - ycut); const fr = (SLB1 - ycut) / (SLB1 - SLB0); S.plugTex.repeat.set(1, fr); S.plugTex.offset.set(0, 1 - fr); }
    else if (rw > 0.001) { const hgt = (SLB1 - SLB0) * rw; S.plug.visible = true; S.plug.position.y = SLB1 - hgt; S.plug.scale.y = Math.max(0.001, hgt); }
    else S.plug.visible = false;
    const drilling = t > TT.drill0 - 0.1 && t < TT.drill1 + 0.25;
    S.disc.visible = drilling; S.disc.position.y = ycut - 0.04; S.disc.rotation.y = t * 40;
    const thin = cwin(t, K.capa7 - 0.1, TT.brk, 0.2, 0.05), pulse = 0.55 + 0.45 * Math.sin(t * 7);
    S.layerGlow.visible = (drilling || thin > 0.01) && !gone; S.layerGlow.position.set(HX, ycut + 0.005, CZ + 0.003); S.layerGlow.material.opacity = drilling ? 0.9 : thin * pulse;
    S.sp.visible = drilling && t > TT.drill0; if (S.sp.visible) burst(S.sp, v3(HX, ycut - 0.05, CZ - 0.15), t, TT.drill0, 0.35, 0.45, true, 2.4);
    // los trozos de la capa
    S.frags.forEach((f, i) => { const u = t - TT.brk; f.visible = u > 0 && u < 1.4 && rw < 0.01; if (!f.visible) return; const g = 6;
      f.position.copy(f.userData.p).addScaledVector(f.userData.v, u); f.position.y -= 0.5 * g * u * u; if (f.position.y < TY - TH / 2 + 0.05) f.position.y = TY - TH / 2 + 0.05; f.rotation.set(u * 4 + i, u * 3, u * 2); });
    const up = cwin(t, TT.brk, K.abren12 + 0.3, 0.15, 0.4) * (1 - rw); S.upLight.intensity = 22 * up; S.cone.visible = up > 0.01; S.cone.material.uniforms.op.value = 0.13 * up; }
  // cámaras y sensores: parpadean y se apagan (no funcionaban)
  S.sec.forEach((g, i) => { const tOff = i < 2 ? K.camaras9 : K.sensores9, fl = t > tOff - 0.05 && t < tOff + 0.35 ? (Math.sin((t - tOff) * 60) > 0 ? 1 : 0) : (t < tOff ? 1 : 0);
    g.userData.led.material.emissiveIntensity = 3 * (rw > 0.5 ? 1 : fl); });
  // los billetes: palés llenos → se vacían de arriba abajo mientras salen por el túnel
  { const f = clamp((t - TT.flow0) / (TT.flow1 - TT.flow0)) * (1 - rw);
    S.pals.forEach(P => { const hide = Math.floor(P.n * f); for (let j = 0; j < P.n; j++) { const v = j >= hide; _m4.compose(P.home[j], _q.identity(), _s.setScalar(v ? 1 : 0.0001)); P.im.setMatrixAt(j, _m4); } P.im.instanceMatrix.needsUpdate = true; });
    const N = 190, on = cwin(t, TT.flow0, TT.flow1, 0.2, 0.4) * (1 - rw), per = 2.1; let n = 0;
    if (on > 0.01) for (let i = 0; i < N; i++) { const ph = i / N, u = ((t - TT.flow0) / per + ph) % 1; if (t - TT.flow0 < ph * per) continue;
      flowPath(u, i, _p); _e.set(u * 6 + i, u * 4, i); _q.setFromEuler(_e); _m4.compose(_p, _q, _s.setScalar(on * (u > 0.97 ? (1 - u) / 0.03 : 1))); S.fly.setMatrixAt(n++, _m4); }
    S.fly.count = Math.max(0, n); S.fly.instanceMatrix.needsUpdate = true; S.fly.visible = n > 0; S.fly.count = n || 0; }
  // la puerta: el lunes se abre
  { const o = eio(clamp((t - K.abren12 + 0.05) / 0.95)) * (1 - rw); S.doorPv.rotation.y = -1.5 * o; S.doorL.intensity = 140 * o; S.corr.material.emissiveIntensity = 0.45 * o; }
  // luces del túnel (las bombillas)
  { const on = clamp(lightsOn(t)), xd = xDigAt(t); S.tLights.forEach(L => (L.intensity = 7 * on * (xd > L.userData.x ? 1 : 0))); }
}
// ---------------------------------------------------------------- cámara: un plano continuo por la maqueta (sin cortes) que acaba donde empieza (bucle)
let CKS = [];
let NOWL = new THREE.Vector3();
function buildCam() {
  const A0 = [[32.0, 0.6, 7.2], [13.0, -4.1, -1.2], 40];                  // gancho: desde el banco, la losa y el túnel iluminado hasta la casa del «césped»
  CKS = [
    [0, ...A0],
    [K.metros1, [30.6, 0.1, 6.4], [12.0, -4.2, -1.2], 40],
    [K.camara1 - 0.1, [27.0, -0.4, 6.8], [22.5, -2.0, -2.6], 40],
    [K.banco1 + 0.25, [28.5, 4.0, 12.5], [23.0, 1.5, -2.5], 40],
    // 2: Fortaleza, 2005: toda la calle de noche
    [K.brasil2, [30.5, 1.6, 9.5], [21.5, 5.0, -2.4], 38],
    [K.alquilan3 - 0.1, [14.0, 4.5, 14.0], [2.0, 1.5, -3.0], 38],
    // 3–4: la casa del «césped» y la tierra que sale
    [K.casa3 + 0.3, [1.2, 3.0, 9.8], [-4.0, 2.0, -3.5], 38],
    [K.cesped3, [0.2, 1.8, 7.5], [-3.2, 1.0, -2.2], 38],
    [K.vender4, [2.2, 3.0, 10.4], [-2.4, 1.2, -3.0], 38],
    [K.sale4, [5.5, 3.8, 9.5], [3.2, 0.6, -6.0], 38],
    // 5: bajo la avenida, el túnel avanza
    [K.bajo5 + 0.25, [-4.0, 1.0, 9.0], [6.0, -3.8, -1.2], 40],
    [K.vigas5, [-1.5, -2.6, 5.0], [8.0, -4.4, -1.0], 40],
    [K.ventilacion5, [6.0, -3.4, 4.6], [16.0, -4.4, -1.0], 40],
    // 6: el último obstáculo: la losa de 1,10 m
    [K.obstaculo6, [26.0, -3.2, 5.5], [20.0, -3.9, -1.0], 40],
    [K.hormigon6, [24.8, -3.5, 3.8], [22.0, -3.5, -0.8], 38],
    // 7: la perforación y la capa fina
    [K.martillos7, [24.0, -4.1, 2.6], [23.0, -3.4, -0.6], 38],
    [K.capa7, [23.9, -3.4, 2.3], [23.0, -3.0, -0.6], 38],
    [K.esperan7 + 0.3, [24.2, -3.6, 2.8], [23.0, -3.2, -0.6], 38],
    // 8: el viernes, con el banco cerrado; rompen la capa y entran
    [K.rompen8 + 0.4, [24.3, -3.5, 2.7], [23.0, -2.9, -0.7], 38],
    [K.entran8 + 0.25, [23.6, -1.2, 3.2], [23.0, -1.3, -1.8], 38],
    // 9–10: dentro de la cámara: cámaras y sensores; los billetes de 50
    [K.camaras9, [24.6, -1.7, 4.4], [20.0, -0.5, -2.6], 40],
    [K.funcionan9, [24.0, -1.6, 4.6], [19.6, -0.6, -3.6], 40],
    [K.billetes10, [27.6, -1.3, 2.8], [25.4, -2.0, -3.8], 38],
    [K.rastrear10, [27.9, -1.0, 3.2], [25.6, -2.1, -3.7], 38],
    // 11: salen por el túnel
    [K.sacan11 + 0.2, [25.6, 0.1, 4.8], [23.0, -2.6, -0.9], 40],
    [K.billetes11, [21.4, -3.5, 3.4], [14.0, -4.4, -1.0], 40],
    [K.millones11, [26.5, -2.0, 6.4], [12.0, -4.3, -1.0], 40],
    // 12: el lunes abren la cámara
    [K.lunes12, [26.0, -0.6, 7.4], [21.8, -1.4, -4.0], 38],
    [K.agujero12, [25.0, -0.6, 5.2], [22.9, -2.4, -1.2], 38],
    [K.agujero12 + 0.9, [24.6, -0.8, 4.6], [22.9, -2.6, -1.0], 38],
    // 13–14: el mayor robo de Brasil… ¿dónde está?
    [K.mayor13 + 0.3, [34.0, 6.5, 13.0], [10.0, -2.2, -2.0], 40],
    [K.dinero13, [33.5, 5.0, 11.5], [10.5, -2.6, -1.8], 40],
    [END - 1.6, [33.0, 3.0, 10.0], [12.0, -3.5, -1.2], 40],
    [END, ...A0],
  ];
}
function camAt(t) {
  const st = camKeys(t, CKS);
  for (const [t0, a0] of [[TT.brk, 0.035], [TT.drill0, 0.012]]) { const u = t - t0; if (u > 0 && u < (t0 === TT.drill0 ? TT.drill1 - TT.drill0 : 0.5)) { const a = a0 * (t0 === TT.drill0 ? 1 : Math.exp(-u * 8)); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; } }
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[TT.brk, 0.12], [K.abren12 + 0.25, 0.05]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09);
  return f;
}
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t; NOWL.copy(st.l);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 7, 0.5, 2.6);
  rigAt(c, yaw, k, 0.55, 0.6);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.22;
  stageAt2(t);
  post.uniforms.fade.value = 0;
}
// ---------------------------------------------------------------- HUD: cabecera, cotas (78 m, 4 m, 1,10 m), rótulos y contadores
function buildHudPlan() {}
const HG = '#FFC24A';
const cw = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '8px'; hfont(40); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('EL TÚNEL DEL BANCO', 54, 142);
  hg.letterSpacing = '4px'; hfont(22, false); hg.fillStyle = HC.grey; hg.fillText('FORTALEZA · BRASIL · AGOSTO 2005', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('BOTÍN', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('R$ 164 M', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('3,5 TONELADAS', 1024, 178);
  hg.restore();
}
function counter(x, y, label, val, k, col = HG) {
  if (k <= 0.01) return;
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.textAlign = 'center'; hg.textBaseline = 'middle';
  hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, x - 190, y - 74, 380, 140, 18); hg.fill();
  hg.letterSpacing = '4px'; hfont(22, false); hg.fillStyle = HC.grey; hg.fillText(label, x, y - 40);
  hg.letterSpacing = '2px'; hfont(58); hg.fillStyle = col; hg.shadowColor = col; hg.shadowBlur = 14; hg.fillText(val, x, y + 18);
  hg.restore();
}
function calCard(x, y, top, big, k, col = HC.white) {
  if (k <= 0.01) return;
  const s = 0.85 + 0.15 * eo(clamp(k * 2));
  hg.save(); hg.globalAlpha = clamp(k * 2.5); hg.translate(x, y); hg.scale(s, s);
  hg.fillStyle = '#f2efe6'; rr(hg, -120, -95, 240, 190, 16); hg.fill(); hg.fillStyle = '#b3122a'; rr(hg, -120, -95, 240, 58, 16); hg.fill(); hg.fillRect(-120, -55, 240, 18);
  hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '3px'; hfont(26); hg.fillStyle = '#ffffff'; hg.fillText(top, 0, -64);
  hfont(54); hg.fillStyle = '#16181d'; hg.letterSpacing = '1px'; hg.fillText(big, 0, 22); hg.restore();
}
const fmtR = v => 'R$ ' + Math.round(v) + ' M', fmtT = v => v.toFixed(1).replace('.', ',') + ' t';
function hudAt(t) {
  hudBegin(); hdr(t);
  const T0 = TY - TH / 2, T1 = TY + TH / 2;
  // 1: la cota del túnel (78 m)
  { const k = cw(t, K.n78 - 0.05, K.fortaleza2 + 0.1, 0.3, 0.35); if (k > 0.01) { const A = proj(v3(TX0, T0 - 0.5, CZ)), B = proj(v3(TX1, T0 - 0.5, CZ));
      if (A.ok && B.ok) { hg.save(); hg.globalAlpha = k; hg.strokeStyle = HG; hg.fillStyle = HG; hg.lineWidth = 3; const e = eo(clamp(k / 0.6)), Bx = A.x + (B.x - A.x) * e, By = A.y + (B.y - A.y) * e;
        hg.beginPath(); hg.moveTo(A.x, A.y); hg.lineTo(Bx, By); hg.stroke(); for (const P of [A, { x: Bx, y: By }]) { hg.beginPath(); hg.arc(P.x, P.y, 7, 0, 7); hg.fill(); }
        hg.letterSpacing = '4px'; hfont(44); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 10; hg.fillText(typed('78 m', clamp((k - 0.3) / 0.5)), (A.x + B.x) / 2, (A.y + B.y) / 2 + 52); hg.restore(); } } }
  lab(v3(VX0 + 6.2, SLB1 + 1.4, CZ - 2.6), 'CÁMARA ACORAZADA', null, cw(t, K.camara1, K.fortaleza2 - 0.1), { dx: -90, dy: -150, color: HC.white });
  // 2: Fortaleza, Brasil, 2005
  { const k = cw(t, K.fortaleza2 - 0.05, K.alquilan3 - 0.1, 0.25, 0.3); bigText('FORTALEZA · BRASIL', W / 2, 1480, 56, HC.white, k, { dark: 22 }); bigText('2005', W / 2, 1570, 72, HG, cw(t, K.y20052 - 0.05, K.alquilan3 - 0.1), { dark: 22, glow: 14 }); }
  // 3: la casa alquilada y la empresa falsa
  lab(v3(-4.0, 1.4, -2.6), 'CASA ALQUILADA', 'ENFRENTE DEL BANCO', cw(t, K.casa3 - 0.05, K.falsa3 - 0.1), { dx: 160, dy: 230, color: HC.white });
  { const k = cw(t, K.falsa3 - 0.05, K.tres4 + 0.2, 0.2, 0.3); stamp('FALSA', 700, 1380, k, HC.red, 84); }
  // 4: ventas a 0, abril → agosto, la tierra
  { const k = cw(t, K.tres4, K.casa4 + 0.2, 0.25, 0.3), m = ['ABRIL', 'MAYO', 'JUNIO', 'JULIO'][Math.min(3, Math.floor(clamp((t - K.tres4) / (K.casa4 - K.tres4)) * 4))];
    calCard(250, 1440, '2005', m, k); counter(720, 1440, 'CÉSPED VENDIDO', '0 m', cw(t, K.vender4, K.casa4 + 0.2, 0.25, 0.3), HC.red); }
  if (S.truck.visible) lab(S.dirt.getWorldPosition(new THREE.Vector3()), 'TIERRA', null, cw(t, K.tierra4 - 0.05, K.bajo5 + 0.1), { dx: 120, dy: -140, color: HG });
  // 5: 4 m bajo la avenida; vigas, luz, ventilación
  { const k = cw(t, K.bajo5, K.vigas5 - 0.1, 0.3, 0.3); if (k > 0.01) { const A = proj(v3(5.5, 0.05, CZ)), B = proj(v3(5.5, TY, CZ)); if (A.ok && B.ok) dimV(A, B, '4 m', k, HG, -60); } }
  lab(v3(8.85, T1 - 0.1, CZ - 0.2), 'VIGAS', null, cw(t, K.vigas5 - 0.05, K.luz5 + 0.4), { dx: -80, dy: -160, color: HC.white });
  lab(v3(11.8, T1 - 0.17, CZ - 0.2), 'LUZ', null, cw(t, K.luz5 - 0.05, K.ventilacion5 + 0.3), { dx: 90, dy: -170, color: HG });
  lab(v3(12.5, T1 - 0.13, CZ - 0.33), 'VENTILACIÓN', null, cw(t, K.ventilacion5 - 0.05, K.hasta6 + 0.1), { dx: 110, dy: -170, color: HC.teal });
  // 6: la losa de 1,10 m de hormigón armado
  { const k = cw(t, K.unmetro6 - 0.05, K.perforan7 + 0.1, 0.3, 0.3); if (k > 0.01) { const A = proj(v3(22.25, SLB1, CZ + 0.01)), B = proj(v3(22.25, SLB0, CZ + 0.01)); if (A.ok && B.ok) dimV(A, B, '1,10 m', k, HG, -30); } }
  lab(v3(25.2, (SLB0 + SLB1) / 2, CZ), 'HORMIGÓN ARMADO', 'CON BARRAS DE ACERO', cw(t, K.hormigon6 - 0.05, K.perforan7 + 0.2), { dx: 70, dy: 210, color: HC.white });
  // 7: el agujero (75 cm), la capa fina y la espera
  lab(v3(HX, SLB0 + 0.2, CZ), 'AGUJERO DE 75 cm', null, cw(t, K.perforan7 + 0.2, K.capa7 - 0.15), { dx: 120, dy: 190, color: HC.white });
  lab(v3(HX + 0.2, SLB1 - 0.04, CZ), 'CAPA FINA', 'SIN ROMPER', cw(t, K.capa7 - 0.05, K.viernes8 - 0.1), { dx: 120, dy: -170, color: HG });
  { const k = cw(t, K.esperan7 - 0.05, K.viernes8 - 0.1, 0.2, 0.25); if (k > 0.01) { hg.save(); hg.globalAlpha = clamp(k * 2); hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, W / 2 - 110, 1350, 220, 220, 30); hg.fill(); hg.fillStyle = HC.white; hg.fillRect(W / 2 - 42, 1400, 28, 120); hg.fillRect(W / 2 + 14, 1400, 28, 120); hg.restore(); } }
  // 8: el viernes, con el banco cerrado
  calCard(W / 2, 1440, 'AGOSTO 2005', 'VIERNES', cw(t, K.viernes8 - 0.05, K.rompen8, 0.2, 0.25)); stamp('BANCO CERRADO', W / 2, 1650, cw(t, K.cerrado8 - 0.05, K.rompen8 + 0.1, 0.2, 0.25), HC.red, 46);
  // 9: cámaras y sensores que no funcionan
  for (const [i, tt, txt] of [[0, K.camaras9, 'CÁMARAS'], [3, K.sensores9, 'SENSORES']]) { const g = S.sec[i]; const P = g.getWorldPosition(new THREE.Vector3()).add(v3(0, -0.15, 0));
    lab(P, txt + ' ✕', 'NO FUNCIONAN', cw(t, tt - 0.05, K.solo10 - 0.05), { dx: i ? -100 : 100, dy: 170, color: HC.red }); }
  // 10: billetes de 50 ya usados
  lab(v3(PALS[1][0], SLB1 + 1.2, PALS[1][1] + 0.6), 'BILLETES DE R$ 50', 'YA USADOS', cw(t, K.billetes10 - 0.05, K.sacan11 - 0.1), { dx: -110, dy: -190, color: HG });
  // 11: toneladas y millones
  { const k = cw(t, K.toneladas11 - 0.1, K.lunes12 - 0.05, 0.25, 0.3), u = clamp((t - K.toneladas11 + 0.1) / (K.billetes11 - K.toneladas11 + 0.5));
    counter(290, 1450, 'PESO', fmtT(3.5 * eo(u)), k, HC.white); const u2 = clamp((t - K.n164 + 0.05) / (K.reales11 - K.n164 + 0.4)); counter(790, 1450, 'BOTÍN', fmtR(164 * eo(u2)), cw(t, K.n164 - 0.1, K.lunes12 - 0.05, 0.25, 0.3)); }
  // 12: el lunes
  calCard(W / 2, 1440, 'AGOSTO 2005', 'LUNES', cw(t, K.lunes12 - 0.05, K.agujero12 - 0.1, 0.2, 0.25));
  lab(v3(HX, SLB1 + 0.02, CZ - 0.3), 'EL AGUJERO', null, cw(t, K.agujero12 - 0.05, K.mayor13 - 0.05), { dx: -110, dy: -170, color: HG });
  // 13: el mayor robo a un banco de Brasil; lo recuperado
  { const k = cw(t, K.mayor13 - 0.05, TT.rw, 0.25, 0.4); bigText('EL MAYOR ROBO A UN BANCO', W / 2, 1380, 40, HC.white, k, { dark: 20 }); bigText('DE LA HISTORIA DE BRASIL', W / 2, 1440, 40, HC.white, k, { dark: 20 });
    const k2 = cw(t, K.mayor13b - 0.05, TT.rw, 0.25, 0.4); if (k2 > 0.01) { const x0 = 120, w = W - 240, y = 1530, f = 25 / 164 * eo(clamp((t - K.mayor13b) / 0.8));
      hg.save(); hg.globalAlpha = clamp(k2 * 2); hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, x0 - 20, y - 50, w + 40, 150, 16); hg.fill();
      hg.fillStyle = 'rgba(255,82,71,.85)'; rr(hg, x0, y, w, 30, 15); hg.fill(); hg.fillStyle = HC.green; rr(hg, x0, y, Math.max(30, w * f), 30, 15); hg.fill();
      hg.textBaseline = 'middle'; hg.letterSpacing = '3px'; hfont(22); hg.textAlign = 'left'; hg.fillStyle = HC.green; hg.fillText('RECUPERADO ≈ R$ 25 M', x0, y + 62);
      hg.textAlign = 'right'; hg.fillStyle = '#ff8a80'; hg.fillText('SIN APARECER', x0 + w, y + 62); hg.restore(); } }
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
    cavaron1: atL(1, 'cavaron'), tunel1: atL(1, 'tunel'), n78: atL(1, '78'), metros1: atL(1, 'metros'), llegar1: atL(1, 'llegar'), debajo1: atL(1, 'debajo'), camara1: atL(1, 'camara'), banco1: atL(1, 'banco'),
    fortaleza2: atL(2, 'fortaleza'), brasil2: atL(2, 'brasil'), y20052: atL(2, '2005'),
    alquilan3: atL(3, 'alquilan'), casa3: atL(3, 'casa'), central3: atL(3, 'central'), falsa3: atL(3, 'falsa'), cesped3: atL(3, 'cesped'),
    tres4: atL(4, 'tres'), vender4: atL(4, 'vender'), casa4: atL(4, 'casa'), sale4: atL(4, 'sale'), tierra4: atL(4, 'tierra'),
    bajo5: atL(5, 'bajo'), avanza5: atL(5, 'avanza'), vigas5: atL(5, 'vigas'), luz5: atL(5, 'luz'), ventilacion5: atL(5, 'ventilacion'),
    hasta6: atL(6, 'hasta'), obstaculo6: atL(6, 'obstaculo'), suelo6: atL(6, 'suelo'), unmetro6: atL(6, '=un'), hormigon6: atL(6, 'hormigon'),
    perforan7: atL(7, 'perforan'), martillos7: atL(7, 'martillos'), discos7: atL(7, 'discos'), capa7: atL(7, 'capa'), esperan7: atL(7, 'esperan'),
    viernes8: atL(8, 'viernes'), cerrado8: atL(8, 'cerrado'), rompen8: atL(8, 'rompen'), entran8: atL(8, 'entran'),
    dentro9: atL(9, 'dentro'), camaras9: atL(9, 'camaras'), sensores9: atL(9, 'sensores'), funcionan9: atL(9, 'funcionan'),
    solo10: atL(10, 'solo'), billetes10: atL(10, 'billetes'), usados10: atL(10, 'usados'), rastrear10: atL(10, 'rastrear'),
    sacan11: atL(11, 'sacan'), toneladas11: atL(11, 'toneladas'), billetes11: atL(11, 'billetes'), n164: atL(11, '164'), millones11: atL(11, 'millones'), reales11: atL(11, 'reales'),
    lunes12: atL(12, 'lunes'), abren12: atL(12, 'abren'), agujero12: atL(12, 'agujero'),
    mayor13: atL(13, 'mayor'), mayor13b: atL(13, 'mayor', 2), dinero13: atL(13, 'dinero'), aparecer13: atL(13, 'aparecer'),
    donde14: atL(14, 'donde'),
  };
  mats(); buildMats(); buildRig();
  scene.fog = new THREE.FogExp2(0x02040a, 0.012);
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35; }
  buildFlow(); buildRobo(); buildTimes();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.TT = TT; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
