// «La cerradura por dentro»: una puerta de entrada a escala (1 unidad = 10 cm), que se vuelve transparente para ver el bombín con sus pitones,
// el cerrojo, el resbalón con su cara inclinada y la radiografía que lo empuja; 200 casas; y al final, echar la llave. window.renderAt(t) dibuja
// el instante t (60 fps).
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
// ---------------------------------------------------------------- «La cerradura por dentro»: la puerta, el marco, la cerradura de embutir (caja, resbalón, cerrojo, bombín de
// pitones), la llave, la radiografía y las 200 casas. 1 unidad = 10 cm reales. La puerta abre hacia dentro (−z) girando sobre la bisagra; desde fuera (+z)
// se ve la rendija entre el canto (x = 4,15) y el marco (x = 4,25). El bombín es de perfil europeo con los pitones arriba.
const HING = v3(-4.1, 0, -0.25);
const DX1 = 4.15, JX = 4.25, GX = 4.2;          // canto de la puerta, cara del marco, rendija (por donde entra la lámina)
const LCX = 3.55, LCY = 10.5;                    // eje del bombín (z = 0 es el centro de la puerta)
const LY = 10.95, BY = 10.2;                     // alturas del resbalón y del cerrojo
const PZ = [0.08, 0.12, 0.16, 0.2, 0.24];        // los 5 pitones de la mitad de fuera
const KCUT = [0.022, 0.006, 0.03, 0.012, 0.002]; // profundidad de cada corte de la llave (EJEMPLO)
const SHEAR = 0.065, KTOP = 0.03, PREST = -0.012, PRAD = 0.0135, CHR = 0.015, DRV = 0.06, CHTOP = 0.235, KTIP = 0.05, KLEN = 0.25;
const KU = PZ.map(z => z - KTIP), KH = KCUT.map(d => KTOP - d), KPL = KH.map(h => SHEAR - h);
const BSTEP = 0.18, CLIPOFF = 1000;
const GH = [], GE = [];       // materiales que se vuelven fantasma y aristas que aparecen (modo «por dentro»)
const HZC = v3(0, 0, 60);     // las 200 casas
function doorPt(x, y, z, th) { const dx = x - HING.x, dz = z - HING.z, c = Math.cos(th), s = Math.sin(th); return v3(HING.x + dx * c + dz * s, y, HING.z - dx * s + dz * c); }
function keyTop(u) {          // borde de arriba de la hoja (los dientes) a la distancia u de la punta
  let v = Math.min(KTOP, -0.02 + u * 1.6);
  for (let i = 0; i < 5; i++) v = Math.min(v, KH[i] + Math.max(0, Math.abs(u - KU[i]) - 0.004));
  return v;
}
const ghostM = (m, min = 0.04) => { GH.push({ m, min }); return m; };
const ghostE = (mesh, a = 0.55, col = 0xe6ecf2, w = 1.4, grp = 'door') => { const l = edges(mesh, col, w, 25, 0); GE.push({ l, a, grp }); return l; };

// ---------------------------------------------------------------- texturas
function doorTexs() {
  const Wc = 512, Hc = 1258, sx = Wc / 8.25, sy = Hc / 20.25, X = x => (x + 4.1) * sx, Y = y => (20.3 - y) * sy;
  const panels = [[-2.7, -0.25, 12.2, 18.7], [0.25, 2.75, 12.2, 18.7], [-2.7, -0.25, 2.6, 9.3], [0.25, 2.75, 2.6, 9.3]];
  const col = canvasTex(1024, 1024, (g, w, h) => {      // veta vertical (se repite: nítida de cerca)
    g.fillStyle = '#5c381d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const x0 = hash(i * 3.3) * w, a = 0.05 + hash(i * 7.1) * 0.2, amp = 0.8 + hash(i * 1.7) * 2.2, f = (1 + Math.floor(hash(i * 5.5) * 2)) * 2 * Math.PI / h;
      g.strokeStyle = hash(i * 2.2) > 0.5 ? '#2c170a' : '#86592f'; g.globalAlpha = a; g.lineWidth = 0.6 + hash(i * 9.9) * 2.6; g.beginPath();
      for (let y = 0; y <= h; y += 8) { const x = x0 + Math.sin(y * f + i) * amp + Math.sin(y * f * 2 + i * 2) * amp * 0.3; y ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); g.beginPath(); for (let y = 0; y <= h; y += 8) { const x = x0 - w + Math.sin(y * f + i) * amp + Math.sin(y * f * 2 + i * 2) * amp * 0.3; y ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    }
    g.globalAlpha = 1;
  });
  col.wrapS = col.wrapT = THREE.RepeatWrapping; col.repeat.set(2.2, 4.4);
  const ao = canvasTex(Wc, Hc, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (const [x0, x1, y0, y1] of panels) { const a = X(x0), b = X(x1), c = Y(y1), d = Y(y0);
      g.strokeStyle = '#2a2a2a'; g.lineWidth = 5; g.strokeRect(a, c, b - a, d - c); g.strokeStyle = '#8a8a8a'; g.lineWidth = 3; g.strokeRect(a + 14, c + 14, b - a - 28, d - c - 28); }
  });
  ao.colorSpace = THREE.NoColorSpace;
  const bump = canvasTex(Wc, Hc, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (const [x0, x1, y0, y1] of panels) { const a = X(x0), b = X(x1), c = Y(y1), d = Y(y0);
      g.fillStyle = '#3a3a3a'; g.fillRect(a, c, b - a, d - c); g.fillStyle = '#5c5c5c'; g.fillRect(a + 6, c + 6, b - a - 12, d - c - 12); g.fillStyle = '#9a9a9a'; g.fillRect(a + 16, c + 16, b - a - 32, d - c - 32); }
  });
  bump.colorSpace = THREE.NoColorSpace; return { col, bump, ao };
}
function plasterTex() { return canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#8c857c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = hash(i * 1.3) > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'; g.fillRect(hash(i * 2.7) * w, hash(i * 5.1) * h, 1 + hash(i) * 2, 1 + hash(i * 3.3) * 2); } }); }
// sección (corte) con rayado de dibujo técnico
function hatch(g, x, y, w, h, base, line, step = 9, dir = 1) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = base; g.fillRect(x, y, w, h);
  g.strokeStyle = line; g.lineWidth = 1.6; g.beginPath(); for (let k = -h; k < w + h; k += step) { g.moveTo(x + k, y + (dir > 0 ? h : 0)); g.lineTo(x + k + h, y + (dir > 0 ? 0 : h)); } g.stroke(); g.restore();
}
// la radiografía: una mano (huesos azulados que brillan) sobre película oscura
function xrayTex() {
  return canvasTex(700, 860, (g, w, h) => {
    const gr = g.createRadialGradient(w * 0.55, h * 0.5, 50, w * 0.55, h * 0.5, w * 0.8); gr.addColorStop(0, '#16222e'); gr.addColorStop(1, '#04070b');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(160,200,230,.35)'; g.lineWidth = 3; rr(g, 8, 8, w - 16, h - 16, 18); g.stroke();
    // partes blandas (silueta de la mano)
    const cx = w * 0.56, wy = h * 0.92;
    const fingers = [[-0.62, 0.30, [0.17, 0.11, 0.08]], [-0.2, 0.36, [0.2, 0.12, 0.08, 0.06]], [0.0, 0.37, [0.22, 0.135, 0.09, 0.065]], [0.17, 0.355, [0.205, 0.125, 0.085, 0.062]], [0.36, 0.32, [0.17, 0.1, 0.07, 0.055]]];
    const bones = [];
    const P = (x, y) => [cx + x * w, wy - y * h];
    bones.push([P(-0.09, 0.0), P(-0.075, 0.25), 30], [P(0.07, 0.0), P(0.06, 0.24), 24]);      // radio y cúbito
    const carp = [[-0.09, 0.3], [-0.03, 0.31], [0.03, 0.305], [0.085, 0.295], [-0.07, 0.355], [-0.01, 0.36], [0.05, 0.355], [0.1, 0.345]];
    fingers.forEach(([ang, len, segs], fi) => {
      let x = (fi - 2) * 0.055 + (fi === 0 ? -0.06 : 0), y = fi === 0 ? 0.36 : 0.385, a = ang * 0.55;
      segs.forEach((sl, si) => { const L = sl * (si === 0 ? 1 : 1), x2 = x + Math.sin(a) * L * 0.62, y2 = y + Math.cos(a) * L * 0.9; bones.push([P(x, y), P(x2, y2), (si === 0 ? 17 : 14) - si * 2.2]); x = x2 + Math.sin(a) * 0.012; y = y2 + Math.cos(a) * 0.016; a += ang * 0.06; });
    });
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(90,130,170,.10)'; g.lineCap = 'round'; for (const [a, b, r] of bones) { g.lineWidth = r * 3.2; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    g.shadowColor = 'rgba(170,215,255,.9)'; g.shadowBlur = 18;
    for (const [a, b, r] of bones) { g.strokeStyle = 'rgba(190,220,250,.8)'; g.lineWidth = r; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    for (const [x, y] of carp) { g.fillStyle = 'rgba(205,230,255,.85)'; g.beginPath(); g.ellipse(...P(x, y), 17, 14, 0.3, 0, 7); g.fill(); }
    g.shadowBlur = 0; g.globalCompositeOperation = 'source-over';
    for (const [a, b, r] of bones) { g.strokeStyle = 'rgba(70,100,130,.45)'; g.lineWidth = r * 0.35; g.beginPath(); g.moveTo(a[0] + (b[0] - a[0]) * 0.15, a[1] + (b[1] - a[1]) * 0.15); g.lineTo(a[0] + (b[0] - a[0]) * 0.85, a[1] + (b[1] - a[1]) * 0.85); g.stroke(); }
    g.restore();
    g.fillStyle = 'rgba(230,240,250,.9)'; g.font = '900 64px Inter'; g.fillText('R', 46, 100);
    g.fillStyle = 'rgba(200,215,230,.55)'; g.fillRect(w - 250, h - 92, 200, 50); g.fillStyle = '#0b1118'; g.font = '700 20px Inter'; g.fillText('RX · EJEMPLO', w - 236, h - 60);
  });
}

// ---------------------------------------------------------------- materiales de la puerta y la cerradura
function lockMats() {
  const D = doorTexs();
  M.doorF = ghostM(new THREE.MeshPhysicalMaterial({ map: D.col, aoMap: D.ao, aoMapIntensity: 1, bumpMap: D.bump, bumpScale: 3, roughness: 0.45, clearcoat: 0.55, clearcoatRoughness: 0.28 }));
  M.doorB = ghostM(new THREE.MeshPhysicalMaterial({ map: D.col, roughness: 0.5, clearcoat: 0.4 }));
  M.doorE = ghostM(new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#5a361c', '#2f1a0b', '#7a5230', 4), 1, 1), roughness: 0.5, clearcoat: 0.4 }));
  M.jamb = ghostM(new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#6a4426', '#3a2210', '#8a6038', 7), 1, 1), roughness: 0.5, clearcoat: 0.35 }), 0.1);
  M.wall = ghostM(new THREE.MeshStandardMaterial({ map: repTex(plasterTex(), 6, 6), color: 0xb9b2a8, roughness: 0.92 }), 0.0);
  M.brassP = metal(0xd9b56c, 0.16); M.brassS = metal(0xc8a25a, 0.32); M.chrome = metal(0xe8ecf2, 0.1); M.satin = metal(0xbfc5cc, 0.34); M.dark = metal(0x2a2e35, 0.5);
  M.brassG = ghostM(metal(0xd9b56c, 0.18), 0.0);        // pomo, escudos y mirilla (también se vuelven transparentes)
  M.strike = ghostM(new THREE.MeshStandardMaterial({ map: canvasTex(128, 512, (g, w, h) => {
    g.fillStyle = '#aeb4bc'; g.fillRect(0, 0, w, h); for (let i = 0; i < h; i += 3) { g.fillStyle = `rgba(255,255,255,${0.04 + hash(i) * 0.06})`; g.fillRect(0, i, w, 1); }
    const Y = y => (11.3 - y) / 1.3 * h, Z = z => (z + 0.15) / 0.3 * w;
    g.fillStyle = '#050505'; g.fillRect(Z(-0.095), Y(11.08), Z(0.095) - Z(-0.095), Y(10.82) - Y(11.08)); g.fillRect(Z(-0.075), Y(10.32), Z(0.075) - Z(-0.075), Y(10.08) - Y(10.32));
    for (const y of [11.2, 10.0 + 0.06]) { g.fillStyle = '#6d737b'; g.beginPath(); g.arc(w / 2, Y(y), 9, 0, 7); g.fill(); g.strokeStyle = '#2a2d31'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2 - 6, Y(y)); g.lineTo(w / 2 + 6, Y(y)); g.stroke(); }
  }), metalness: 0.9, roughness: 0.3 }), 1.0);
  M.keyM = metal(0xdfe3e8, 0.14); M.boltM = new THREE.MeshStandardMaterial({ color: 0xb4bbc4, metalness: 1, roughness: 0.3, transparent: true });
  M.latchM = new THREE.MeshStandardMaterial({ color: 0xd9b56c, metalness: 1, roughness: 0.16, transparent: true }); M.hubM = new THREE.MeshStandardMaterial({ color: 0xc8a25a, metalness: 1, roughness: 0.32, transparent: true });
  M.sideM = new THREE.MeshStandardMaterial({ color: 0xbfc5cc, metalness: 1, roughness: 0.34, transparent: true }); M.springL = new THREE.MeshStandardMaterial({ color: 0xd5dbe2, metalness: 1, roughness: 0.25, transparent: true });
  S.sideFade = [M.latchM, M.hubM, M.sideM, M.springL]; M.camM = metal(0x8f98a3, 0.3);
  M.pinK = metal(0xe2b65a, 0.2); M.pinD = metal(0xb8c4d2, 0.18); M.spring = metal(0xd5dbe2, 0.25);
  M.caseM = new THREE.MeshStandardMaterial({ color: 0x23262c, metalness: 0.7, roughness: 0.45, transparent: true, opacity: 0.92 });
  M.inside = new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(w * 0.5, h * 0.35, 10, w * 0.5, h * 0.45, w * 0.7); r.addColorStop(0, '#ffd59a'); r.addColorStop(0.5, '#a8682e'); r.addColorStop(1, '#2a1708'); g.fillStyle = r; g.fillRect(0, 0, w, h); }), color: 0xffffff });
  M.capWood = new THREE.MeshStandardMaterial({ map: repTex(canvasTex(128, 128, (g, w, h) => hatch(g, 0, 0, w, h, '#3b2a1c', '#56402c', 12)), 30, 2), roughness: 0.8 });
  M.capWall = new THREE.MeshStandardMaterial({ map: repTex(canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#1f1f21'; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(20,18,16,.5)'; g.fillRect(hash(i * 1.7) * w, hash(i * 2.9) * h, 2, 2); } }), 20, 2), roughness: 0.9 });
}

// ---------------------------------------------------------------- piezas
function euroShape(r = 0.085, tw = 0.05, top = 0.245, grow = 0) {     // perfil europeo: redondo abajo + torre (pitones) arriba
  const s = new THREE.Shape(), R = r + grow, T = tw + grow, a0 = Math.acos(T / R);
  s.absarc(0, 0, R, a0, Math.PI - a0, true); s.lineTo(-T, top - tw); s.absarc(0, top - tw, T, Math.PI, 0, true); s.lineTo(T, R * Math.sin(a0)); return s;
}
function euroPath(grow = 0.006) { const s = euroShape(0.085, 0.05, 0.245, grow); const p = new THREE.Path(); p.curves = s.curves; p.currentPoint = s.currentPoint; return p; }
function helixGeo(r, turns, wire, axis = 'y') {       // muelle de longitud 1 (se estira con scale)
  const pts = [], n = Math.round(turns * 24); for (let i = 0; i <= n; i++) { const a = i / n * turns * Math.PI * 2, u = i / n; pts.push(axis === 'y' ? v3(Math.cos(a) * r, u, Math.sin(a) * r) : v3(u, Math.cos(a) * r, Math.sin(a) * r)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, wire, 6, false);
}
// semicilindro hueco (por dentro) a lo largo de y: las ranuras de los pitones en el corte
function groove(r, h, m) { const g = new THREE.CylinderGeometry(r, r, h, 16, 1, true, Math.PI, Math.PI); const o = new THREE.Mesh(g, m); return o; }
// plano en el corte x = 0 (mira hacia +x): z de z0 a z1 y y de y0 a y1, dibujado por draw(g, Z(), Y())
function cutFace(z0, z1, y0, y1, px, draw, mat) {
  const w = z1 - z0, h = y1 - y0, Wc = Math.round(px), Hc = Math.round(px * h / w);
  const tex = canvasTex(Wc, Hc, (g) => draw(g, z => (z1 - z) / w * Wc, y => (y1 - y) / h * Hc, Wc, Hc));
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.55, roughness: 0.42, ...(mat || {}) });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.rotation.y = Math.PI / 2; o.position.set(0, (y0 + y1) / 2, (z0 + z1) / 2); return o;
}
function buildCylinder(DI) {
  const CY = new THREE.Group(); CY.position.set(LCX, LCY, 0); DI.add(CY); S.cyl = CY;
  const full = new THREE.Group(), cut = new THREE.Group(); CY.add(full, cut); CY.userData = { full, cut };
  // --- cuerpo entero (fuera de los planos «por dentro»)
  const hg = new THREE.ExtrudeGeometry(euroShape(0.081, 0.046, 0.241), { depth: 0.592, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 28 }); hg.translate(0, 0, -0.296);
  full.add(mesh(hg, M.brassS));
  // --- cuerpo cortado por la mitad (x ≤ 0): piel + cara del corte con las cámaras de los pitones
  {
    const r = 0.085, a0 = Math.acos(0.05 / r), pts = [];
    for (let i = 0; i <= 40; i++) { const a = -Math.PI / 2 - i / 40 * (Math.PI / 2 + (Math.PI - a0) - Math.PI); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    // (de abajo, por la izquierda, hasta la torre)
    pts.length = 0; for (let i = 0; i <= 40; i++) { const a = 1.5 * Math.PI - i / 40 * (1.5 * Math.PI - (Math.PI - a0)); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    pts.push([-0.05, 0.195]); for (let i = 1; i <= 12; i++) { const a = Math.PI - i / 12 * Math.PI / 2; pts.push([Math.cos(a) * 0.05, 0.195 + Math.sin(a) * 0.05]); }
    const pos = [], idx = [], z0 = -0.3, z1 = 0.3;
    pts.forEach(([x, y]) => pos.push(x, y, z0, x, y, z1));
    for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const skin = mesh(g, new THREE.MeshStandardMaterial({ color: 0xc8a25a, metalness: 1, roughness: 0.32, side: THREE.DoubleSide })); cut.add(skin);
    // tapas de los extremos (medio perfil con el hueco del rotor)
    const cap = new THREE.Shape(); cap.moveTo(0, -r); pts.forEach(([x, y]) => cap.lineTo(x, y)); cap.lineTo(0, SHEAR); cap.absarc(0, 0, SHEAR, Math.PI / 2, 1.5 * Math.PI, false); cap.lineTo(0, -r);
    for (const z of [0.3, -0.3]) { const c = mesh(new THREE.ShapeGeometry(cap, 16), new THREE.MeshStandardMaterial({ color: 0xc8a25a, metalness: 1, roughness: 0.3, side: THREE.DoubleSide })); c.position.z = z; cut.add(c); }
    // cara del corte: latón rayado, con las cámaras (ranuras) de los pitones y la ventana de la leva
    const face = cutFace(-0.3, 0.3, -0.085, 0.245, 1100, (g, Z, Y) => {
      const band = (za, zb, ya, yb) => { const x0 = Z(za), x1 = Z(zb), y0 = Y(yb), y1 = Y(ya); hatch(g, Math.min(x0, x1), y0, Math.abs(x1 - x0), y1 - y0, '#b8914a', '#8a6a2c', 10, 1); };
      for (const [za, zb] of [[-0.3, -0.04], [0.04, 0.3]]) { band(za, zb, SHEAR, 0.245); band(za, zb, -0.085, -SHEAR); }
      band(-0.04, 0.04, 0.198, 0.245);                      // puente de arriba (el de la leva)
      g.clearRect(0, 0, 1, 1);
      for (const z of [...PZ, ...PZ.map(z => -z)]) g.clearRect(Z(z + CHR), Y(CHTOP), Z(z - CHR) - Z(z + CHR), Y(SHEAR) - Y(CHTOP));
      // contorno de la torre redondeada (fuera de ella, transparente)
      g.save(); g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.rect(0, Y(0.195), 1100, Y(-0.085) - Y(0.195)); g.rect(0, Y(0.245) - 2, 1100, Y(0.195) - Y(0.245) + 3); g.fill(); g.restore();
      g.strokeStyle = '#6b511f'; g.lineWidth = 3; g.strokeRect(1, 1, 1098, Y(-0.085) - 2);
    });
    cut.add(face); S.cutHousing = face;
    for (const z of [...PZ, ...PZ.map(z => -z)]) { const gr = groove(CHR, CHTOP - SHEAR, new THREE.MeshStandardMaterial({ color: 0x9c7a3c, metalness: 1, roughness: 0.4, side: THREE.BackSide })); gr.position.set(0, (CHTOP + SHEAR) / 2, z); cut.add(gr); }
  }
  // --- rotor (gira con la llave): la mitad de fuera, con su corte, ranuras, cara con bocallave
  const PG = new THREE.Group(); CY.add(PG); S.plug = PG;
  const keywayTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c9a35a'; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, 7); g.fill();
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,240,200,${0.05 + hash(i) * 0.08})`; g.beginPath(); g.arc(w / 2, h / 2, w / 2 * (0.2 + i / 50), 0, 7); g.stroke(); }
    g.strokeStyle = '#6b511f'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 3, 0, 7); g.stroke();
    // bocallave (perfil con quiebros)
    const X = x => w / 2 + x / 0.065 * w / 2, Yv = y => h / 2 - y / 0.065 * h / 2;
    g.fillStyle = '#050403'; g.beginPath(); g.moveTo(X(-0.006), Yv(0.036)); g.lineTo(X(0.006), Yv(0.036)); g.lineTo(X(0.006), Yv(0.012)); g.lineTo(X(0.002), Yv(0.0)); g.lineTo(X(0.007), Yv(-0.016)); g.lineTo(X(0.004), Yv(-0.03)); g.lineTo(X(0.007), Yv(-0.044)); g.lineTo(X(0.004), Yv(-0.056));
    g.lineTo(X(-0.004), Yv(-0.056)); g.lineTo(X(-0.007), Yv(-0.044)); g.lineTo(X(-0.003), Yv(-0.03)); g.lineTo(X(-0.007), Yv(-0.016)); g.lineTo(X(-0.002), Yv(-0.004)); g.lineTo(X(-0.006), Yv(0.012)); g.closePath(); g.fill();
  });
  const plugFace = new THREE.Mesh(new THREE.CircleGeometry(0.065, 48), new THREE.MeshStandardMaterial({ map: keywayTex, metalness: 0.9, roughness: 0.25 }));
  plugFace.position.z = 0.3005; PG.add(plugFace); full.userData.plugFace = plugFace;
  const inFace = new THREE.Mesh(new THREE.CircleGeometry(0.065, 48), new THREE.MeshStandardMaterial({ map: keywayTex, metalness: 0.9, roughness: 0.25 })); inFace.position.z = -0.3005; inFace.rotation.y = Math.PI; full.add(inFace);
  const plugCut = new THREE.Group(); PG.add(plugCut); S.plugCut = plugCut;
  const mkHalf = (z0, z1, parent) => {
    const hg2 = new THREE.CylinderGeometry(SHEAR, SHEAR, z1 - z0, 32, 1, false, Math.PI, Math.PI); const o = new THREE.Mesh(hg2, [M.brassP, new THREE.MeshStandardMaterial({ map: keywayTex, metalness: 0.9, roughness: 0.25 }), M.brassP]);
    o.rotation.x = Math.PI / 2; o.position.z = (z0 + z1) / 2; parent.add(o);
    const f = cutFace(z0, z1, -SHEAR, SHEAR, 600, (g, Z, Y, Wc) => {
      hatch(g, 0, 0, Wc, Y(-SHEAR), '#d6b066', '#a07c36', 10, -1);
      g.clearRect(0, Y(0.032), Wc, Y(-0.055) - Y(0.032));              // bocallave
      for (const z of [...PZ, ...PZ.map(z => -z)]) if (z > z0 && z < z1) g.clearRect(Z(z + CHR), Y(SHEAR), Z(z - CHR) - Z(z + CHR), Y(0.032) - Y(SHEAR));
      g.strokeStyle = '#6b511f'; g.lineWidth = 3; g.strokeRect(1, 1, Wc - 2, Y(-SHEAR) - 2);
    }); parent.add(f);
    const wallK = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 0.087), new THREE.MeshStandardMaterial({ color: 0x5e4a24, metalness: 0.8, roughness: 0.5 })); wallK.rotation.y = Math.PI / 2; wallK.position.set(-0.012, (0.032 - 0.055) / 2, (z0 + z1) / 2); parent.add(wallK);
    for (const z of [...PZ, ...PZ.map(z => -z)]) if (z > z0 && z < z1) { const gr = groove(CHR, SHEAR - 0.032, new THREE.MeshStandardMaterial({ color: 0x9c7a3c, metalness: 1, roughness: 0.4, side: THREE.BackSide })); gr.position.set(0, (SHEAR + 0.032) / 2, z); parent.add(gr); }
  };
  mkHalf(0.04, 0.3, plugCut);
  const inPlug = new THREE.Group(); cut.add(inPlug); mkHalf(-0.3, -0.04, inPlug);      // el rotor de dentro no gira
  // pitones: inferiores (latón, en el rotor) y superiores (acero, en el cuerpo) + muelles
  const pinGeo = (L, tip) => { const g1 = new THREE.CylinderGeometry(PRAD, PRAD, L - (tip ? 0.006 : 0), 20); g1.translate(0, (L + (tip ? 0.006 : 0)) / 2, 0);
    if (!tip) return g1; const c = new THREE.ConeGeometry(PRAD, 0.006, 20); c.rotateX(Math.PI); c.translate(0, 0.003, 0); return mergeGeometries([g1.toNonIndexed(), c.toNonIndexed()]); };
  const springG = helixGeo(0.0105, 9, 0.0026);
  S.pins = PZ.map((z, i) => {
    const kp = mesh(pinGeo(KPL[i], true), M.pinK); kp.position.set(0, PREST, z); PG.add(kp);
    const dp = mesh(pinGeo(DRV, false), M.pinD); dp.position.set(0, PREST + KPL[i], z); CY.add(dp);
    const sp = mesh(springG, M.spring); sp.position.set(0, 0.15, z); CY.add(sp);
    return { kp, dp, sp, z, i };
  });
  S.pinsIn = PZ.map((z0, i) => {      // los de la mitad de dentro: quietos (sin llave)
    const z = -z0, L = SHEAR - KH[4 - i] + 0.004; const kp = mesh(pinGeo(L, true), M.pinK); kp.position.set(0, PREST, z); inPlug.add(kp);
    const dp = mesh(pinGeo(DRV, false), M.pinD); dp.position.set(0, PREST + L, z); cut.add(dp);
    const sp = mesh(springG, M.spring); sp.position.set(0, PREST + L + DRV, z); sp.scale.y = CHTOP - (PREST + L + DRV); cut.add(sp); return kp;
  });
  // leva (gira con el rotor) en el centro
  { const s = new THREE.Shape(), c = 0.035, rr0 = 0.07, y0 = Math.sqrt(rr0 * rr0 - c * c);
    s.moveTo(c, y0); s.absarc(0, 0, rr0, Math.atan2(y0, c), Math.PI - Math.atan2(y0, c), true); s.lineTo(-c, 0.155); s.absarc(0, 0.155, c, Math.PI, 0, true); s.lineTo(c, y0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 20 }); g.translate(0, 0, -0.03);
    const cam = mesh(g, M.camM); PG.add(cam); S.cam = cam; }
  // llave (plata): hoja con los dientes arriba + cabeza con agujero; su z local es la distancia desde la punta
  {
    const KG = new THREE.Group(); PG.add(KG); S.key = KG;
    const s = new THREE.Shape(); s.moveTo(0, -0.022); s.lineTo(0.012, -0.05); s.lineTo(KLEN, -0.05); s.lineTo(KLEN, 0.062);
    for (let i = 200; i >= 0; i--) { const u = i / 200 * KLEN; s.lineTo(u, Math.max(-0.02, keyTop(u))); }
    s.lineTo(0, -0.022);
    const bg = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1, curveSegments: 4 }); bg.translate(0, 0, -0.01); bg.rotateY(-Math.PI / 2);
    KG.add(mesh(bg, M.keyM));
    for (const [v, d] of [[-0.018, 1], [-0.036, -1]]) { const gr = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.006, KLEN - 0.02), M.dark); gr.position.set(d * 0.0102, v, KLEN / 2 + 0.01); KG.add(gr); }
    const hs = new THREE.Shape(), hw = 0.3, hh = 0.25; hs.moveTo(KLEN, -0.08); hs.lineTo(KLEN + 0.05, -hh / 2); hs.lineTo(KLEN + hw - 0.07, -hh / 2); hs.quadraticCurveTo(KLEN + hw, -hh / 2, KLEN + hw, 0); hs.quadraticCurveTo(KLEN + hw, hh / 2, KLEN + hw - 0.07, hh / 2); hs.lineTo(KLEN + 0.05, hh / 2); hs.lineTo(KLEN, 0.08); hs.lineTo(KLEN, -0.08);
    const hole = new THREE.Path(); hole.absarc(KLEN + hw - 0.075, 0, 0.034, 0, Math.PI * 2, true); hs.holes.push(hole);
    const hgk = new THREE.ExtrudeGeometry(hs, { depth: 0.026, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 3, curveSegments: 24 }); hgk.translate(0, 0, -0.013); hgk.rotateY(-Math.PI / 2);
    KG.add(mesh(hgk, M.keyM));
  }
  return CY;
}
function buildLock() {
  const root = new THREE.Group(); scene.add(root); S.root = root;
  const DG = new THREE.Group(); DG.position.copy(HING); root.add(DG);
  const DI = new THREE.Group(); DI.position.set(-HING.x, 0, -HING.z); DG.add(DI); S.DG = DG; S.DI = DI;
  // hoja de la puerta
  const slab = mesh(new THREE.BoxGeometry(8.25, 20.25, 0.5), [M.doorE, M.doorE, M.doorE, M.doorE, M.doorF, M.doorB]); slab.position.set(0.025, 10.175, 0); DI.add(slab); ghostE(slab, 0.5);
  S.ghostCasters = [slab];
  // pomo fijo (centro), mirilla y escudos del bombín
  const knob = lathe([[0, 0], [0.32, 0], [0.33, 0.03], [0.12, 0.06], [0.08, 0.2], [0.1, 0.32], [0.26, 0.42], [0.3, 0.52], [0.26, 0.6], [0, 0.62]], 48, M.brassG); knob.rotation.x = Math.PI / 2; knob.position.set(0, 11.0, 0.25); DI.add(knob); S.ghostCasters.push(knob);
  const peep = lathe([[0, 0], [0.12, 0], [0.12, 0.04], [0.07, 0.07], [0, 0.07]], 32, M.brassG); peep.rotation.x = Math.PI / 2; peep.position.set(0, 15.5, 0.25); DI.add(peep);
  for (const sd of [1, -1]) {
    const s = new THREE.Shape(); s.absarc(0, 0.08, 0.2, 0, Math.PI * 2, false); s.holes.push(euroPath(0.006));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 40 });
    const e = mesh(g, M.brassG); e.position.set(LCX, LCY, sd > 0 ? 0.25 : -0.25); if (sd < 0) e.rotation.y = Math.PI; DI.add(e); S.ghostCasters.push(e);
  }
  // cerradura de embutir: placa de fondo de la caja, aristas de la caja, frente, nuez, resbalón, cerrojo
  const LK = new THREE.Group(); DI.add(LK); S.lockG = LK;
  { const s = new THREE.Shape(); s.moveTo(3.2, 9.85); s.lineTo(4.13, 9.85); s.lineTo(4.13, 11.6); s.lineTo(3.2, 11.6); s.lineTo(3.2, 9.85);
    const eh = euroPath(0.012); eh.curves = eh.curves.map(c => { const cc = c.clone(); if (cc.aX !== undefined) { cc.aX += LCX; cc.aY += LCY; } else for (const k of ['v1', 'v2', 'v0', 'v3']) if (cc[k]) cc[k].add(new THREE.Vector2(LCX, LCY)); return cc; }); s.holes.push(eh);
    const hh = new THREE.Path(); hh.absarc(3.55, 11.35, 0.15, 0, Math.PI * 2, true); s.holes.push(hh);
    const bp = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false, curveSegments: 24 }), M.dark); bp.position.z = -0.1; LK.add(bp); S.backPlate = bp;
    const cb = new THREE.Mesh(new THREE.BoxGeometry(0.93, 1.75, 0.2), new THREE.MeshBasicMaterial({ visible: false })); cb.position.set(3.665, 10.725, 0); LK.add(cb); ghostE(cb, 0.75, 0x9fd0ff, 1.6, 'case'); S.caseBox = cb; }
  const front = mesh(new THREE.BoxGeometry(0.02, 1.95, 0.2), M.satin); front.position.set(4.14, 10.725, 0); LK.add(front); S.frontPlate = front;
  for (const y of [9.9, 11.55]) { const sc = cyl(0.03, 0.03, 0.006, M.dark, 16); sc.rotation.z = Math.PI / 2; sc.position.set(4.152, y, 0); LK.add(sc); }
  const hub = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 32), M.hubM); hub.rotation.x = Math.PI / 2; hub.position.set(3.55, 11.35, 0); LK.add(hub);
  const spin = mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), M.sideM); spin.position.set(3.55, 11.35, -0.2); LK.add(spin);
  // resbalón (latón): planta (x, z) con la cara inclinada hacia fuera (+z), extruido en altura
  { const s = new THREE.Shape(); const P = [[3.7, -0.08], [4.4, -0.08], [4.4, -0.05], [4.18, 0.08], [3.7, 0.08]]; s.moveTo(P[0][0], -P[0][1]); for (const [x, z] of P.slice(1)) s.lineTo(x, -z); s.lineTo(P[0][0], -P[0][1]);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }); g.rotateX(-Math.PI / 2);
    const LG = new THREE.Group(); LK.add(LG); S.latch = LG;
    const lm = mesh(g, M.latchM); lm.position.y = LY - 0.11; LG.add(lm); S.latchMesh = lm;
    const sp = mesh(helixGeo(0.05, 7, 0.009, 'x'), M.springL); sp.position.set(3.22, LY, 0); LK.add(sp); S.latchSpring = sp;
    // la cara inclinada, resaltada (se enciende en L8)
    const bev = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(0.22, 0.13), 0.215), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.25, 0.2).multiplyScalar(2.2), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    bev.position.set(4.29 + 0.509 * 0.009, LY, 0.015 + 0.861 * 0.009); bev.lookAt(bev.position.clone().add(v3(0.13, 0, 0.22))); LG.add(bev); S.bevel = bev; }
  // cerrojo (acero cromado) con los dientes donde empuja la leva
  { const BG = new THREE.Group(); LK.add(BG); S.bolt = BG;
    const b = rbox(0.94, 0.2, 0.12, M.boltM, 0.014); b.position.set(3.67, BY, 0); BG.add(b); S.boltMesh = b;
    for (const x of [3.483, 3.303]) { const tth = mesh(new THREE.BoxGeometry(0.04, 0.07, 0.1), M.boltM); tth.position.set(x, BY + 0.125, 0); BG.add(tth); }
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.95, 1).multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    face.position.set(3.67, BY, 0.0605); face.material.color.multiplyScalar(0.4); BG.add(face); S.boltFace = face; }
  buildCylinder(DI);
  // marco, tapajuntas y pared (con el hueco), cerradero
  const JG = new THREE.Group(); root.add(JG); S.frame = JG;
  const jb = (w, h, d, x, y, z, m) => { const o = mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); JG.add(o); S.ghostCasters.push(o); return o; };
  ghostE(jb(0.4, 20.8, 1.0, 4.45, 10.4, -0.05, M.jamb), 0.35); ghostE(jb(0.4, 20.8, 1.0, -4.4, 10.4, -0.05, M.jamb), 0.25); ghostE(jb(9.25, 0.4, 1.0, 0.025, 20.6, -0.05, M.jamb), 0.25);
  jb(0.7, 21.5, 0.08, 4.6, 10.75, 0.49, M.jamb); jb(0.7, 21.5, 0.08, -4.55, 10.75, 0.49, M.jamb); jb(9.85, 0.7, 0.08, 0.025, 21.15, 0.49, M.jamb);
  jb(11.35, 30, 1.0, 10.325, 15, -0.05, M.wall); jb(11.4, 30, 1.0, -10.3, 15, -0.05, M.wall); jb(9.25, 9.2, 1.0, 0.025, 25.4, -0.05, M.wall);
  M.strike.side = THREE.DoubleSide; const strike = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.3), M.strike); strike.rotation.y = -Math.PI / 2; strike.position.set(JX - 0.0015, 10.65, 0); JG.add(strike);
  // el interior de la casa (luz cálida que se ve por la rendija y al abrir)
  const ins = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), M.inside); ins.position.set(0, 12, -9.5); root.add(ins); S.inside = ins;
  // tapas del corte (planta): puerta (gira con ella), marco y pared
  { const c1 = new THREE.Mesh(new THREE.PlaneGeometry(6.7, 0.5), M.capWood); c1.rotation.x = -Math.PI / 2; c1.position.set(-0.75, 0, 0); DI.add(c1);
    const c2t = canvasTex(1240, 400, (g, w, h) => { const X = x => (x - 2.6) / 1.55 * w, Z = z => (z + 0.25) / 0.5 * h;
      hatch(g, 0, 0, w, h, '#3b2a1c', '#56402c', 12); g.clearRect(X(3.2), Z(-0.1), X(4.15) - X(3.2) + 2, Z(0.1) - Z(-0.1));
      g.fillStyle = '#9aa2ac'; g.fillRect(X(3.2), Z(-0.1), X(4.13) - X(3.2), 9); g.fillRect(X(3.2), Z(0.1) - 9, X(4.13) - X(3.2), 9); g.fillRect(X(3.2), Z(-0.1), 9, Z(0.1) - Z(-0.1));
      g.fillStyle = '#c4cad2'; g.fillRect(X(4.13), Z(-0.1), X(4.15) - X(4.13) + 1, Z(0.1) - Z(-0.1));
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2); });
    const c2 = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.5), new THREE.MeshStandardMaterial({ map: c2t, transparent: true, alphaTest: 0.5, roughness: 0.8 })); c2.rotation.x = -Math.PI / 2; c2.position.set(3.375, 0, 0); DI.add(c2);
    const c3t = canvasTex(1100, 440, (g, w, h) => { const X = x => (x - 4.25) / 2.75 * w, Z = z => (z + 0.55) / 1.1 * h;
      g.clearRect(0, 0, w, h); hatch(g, X(4.25), Z(-0.55), X(4.65) - X(4.25), Z(0.45) - Z(-0.55), '#2e2a26', '#4a443d', 12, -1);
      hatch(g, X(4.25), Z(0.45), X(4.95) - X(4.25), Z(0.53) - Z(0.45), '#2e2a26', '#4a443d', 8, -1);
      g.fillStyle = '#1f1f21'; g.fillRect(X(4.65), Z(-0.55), w - X(4.65), Z(0.45) - Z(-0.55)); for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(20,18,16,.5)'; g.fillRect(X(4.65) + hash(i * 1.7) * (w - X(4.65)), Z(-0.55) + hash(i * 2.9) * (Z(0.45) - Z(-0.55)), 3, 3); }
      g.clearRect(X(JX), Z(-0.095), X(4.47) - X(JX), Z(0.095) - Z(-0.095));
      g.fillStyle = '#c4cad2'; g.fillRect(X(JX) - 3, Z(-0.15), 6, Z(0.15) - Z(-0.15));
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3; g.strokeRect(X(4.25), Z(-0.55), X(4.65) - X(4.25), Z(0.45) - Z(-0.55)); });
    const c3 = new THREE.Mesh(new THREE.PlaneGeometry(2.75, 1.1), new THREE.MeshStandardMaterial({ map: c3t, transparent: true, alphaTest: 0.5, roughness: 0.85 })); c3.rotation.x = -Math.PI / 2; c3.position.set(5.625, 0, 0); root.add(c3);
    const c4 = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 1.0), M.capWall); c4.rotation.x = -Math.PI / 2; c4.position.set(11.5, 0, -0.05); root.add(c4);
    S.caps = [c1, c2, c3, c4]; for (const c of S.caps) { c.visible = false; c.renderOrder = 1; } }
  buildFilm(root);
  // todo lo de la puerta se puede cortar con el plano horizontal (vista en planta)
  S.clipPl = new THREE.Plane(v3(0, -1, 0), CLIPOFF);
  root.traverse(o => { if (!o.material) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { m.clippingPlanes = [S.clipPl]; m.clipShadows = true; } });
  for (const c of S.caps) c.material.clippingPlanes = [];
  S.filmLine.material.clippingPlanes = [];
}

// ---------------------------------------------------------------- la radiografía (cinta que se dobla: entra recta por la rendija y fuera se curva hacia la derecha)
const FILM = { L: 2.3, y0: 9.55, y1: 12.35, n: 120 };
function buildFilm(root) {
  const n = FILM.n, geo = new THREE.BufferGeometry(), pos = new Float32Array((n + 1) * 6), uv = new Float32Array((n + 1) * 4), idx = [];
  for (let i = 0; i <= n; i++) { uv.set([i / n, 0, i / n, 1], i * 4); if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const tex = xrayTex(); tex.wrapS = THREE.ClampToEdgeWrapping;
  const m = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.38, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.94, side: THREE.DoubleSide, depthWrite: false });
  const f = new THREE.Mesh(geo, m); f.frustumCulled = false; f.renderOrder = 6; root.add(f); S.film = f; f.visible = false;
  const lm = lineMat(0xbfe8ff, 8, 1); lm.color.multiplyScalar(2.2); const lg = new LineGeometry(); lg.setPositions(new Float32Array(6 * 3));
  const ln = new Line2(lg, lm); ln.frustumCulled = false; ln.renderOrder = 8; ln.visible = false; root.add(ln); S.filmLine = ln;
}
// st = { zTip, a (ángulo de la curva), off (Vector3), flex, buck, t }
function filmPts(st, n, y) {
  const R = 0.32, ZB = 0.62, a = Math.max(0.02, ZB - st.zTip), arc = R * st.a, out = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n * FILM.L; let x, z, tx, tz;
    if (s <= a) { x = GX; z = st.zTip + s; tx = 0; tz = 1; x += (st.buck || 0) * Math.sin(Math.PI * s / a); }
    else if (s <= a + arc) { const p = (s - a) / R; x = GX + R - R * Math.cos(p); z = st.zTip + a + R * Math.sin(p); tx = Math.sin(p); tz = Math.cos(p); }
    else { const e = s - a - arc; x = GX + R - R * Math.cos(st.a) + e * Math.sin(st.a); z = st.zTip + a + R * Math.sin(st.a) + e * Math.cos(st.a); tx = Math.sin(st.a); tz = Math.cos(st.a);
      const u = e / Math.max(0.01, FILM.L - a - arc), w = (st.flex || 0) * Math.sin(Math.PI * u) * Math.sin(st.t * 7.5 - u * 2.5); x += tz * w; z -= tx * w; }
    out.push([x + st.off.x, y, z + st.off.z]);
  }
  return out;
}
function filmSet(st, clipY) {
  const f = S.film, p = f.geometry.attributes.position.array, n = FILM.n;
  const A = filmPts(st, n, 0); S.filmA = A;
  for (let i = 0; i <= n; i++) { const [x, , z] = A[i]; p.set([x, FILM.y0 + st.off.y, z, x, FILM.y1 + st.off.y, z], i * 6); }
  f.geometry.attributes.position.needsUpdate = true; f.geometry.computeVertexNormals(); f.geometry.computeBoundingSphere();
  if (clipY < FILM.y1) { const B = filmPts(st, 60, clipY + 0.004); S.filmLine.geometry.setPositions(new Float32Array(B.flat())); S.filmLine.computeLineDistances(); }
}

// ---------------------------------------------------------------- las 200 casas (20 × 10): de noche, con la puerta que se enciende en rojo
function buildHouses() {
  const G = new THREE.Group(); G.position.copy(HZC); scene.add(G); S.houses = G; G.visible = false;
  const NX = 20, NZ = 10, N = NX * NZ, SP = 1.75;
  const bodyM = new THREE.MeshStandardMaterial({ color: 0x8f8a82, roughness: 0.85 }), roofM = new THREE.MeshPhysicalMaterial({ color: 0x4a2418, roughness: 0.6, clearcoat: 0.3 });
  const roofG = (() => { const s = new THREE.Shape(); s.moveTo(-0.6, 0); s.lineTo(0.6, 0); s.lineTo(0, 0.5); s.lineTo(-0.6, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 1.0, bevelEnabled: false }); g.translate(0, 0, -0.5); return g; })();
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(1.0, 0.8, 0.9), bodyM, N), roof = new THREE.InstancedMesh(roofG, roofM, N);
  const doorM = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), winM = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const door = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.26, 0.42), doorM, N), win = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.2, 0.18), winM, N * 2);
  body.castShadow = roof.castShadow = true; body.receiveShadow = roof.receiveShadow = true;
  const H = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i, x = (i - (NX - 1) / 2) * SP + (hash(k * 3.1) - 0.5) * 0.35, z = -j * SP + (hash(k * 5.7) - 0.5) * 0.35, ry = (hash(k * 7.7) - 0.5) * 0.35, s = 0.85 + hash(k * 9.1) * 0.3;
    const sy = 0.9 + hash(k * 2.3) * 0.25; q.setFromEuler(new THREE.Euler(0, ry, 0)); sc.set(s, s * sy, s);
    m4.compose(v3(x, 0.4 * sc.y, z), q, sc); body.setMatrixAt(k, m4);
    m4.compose(v3(x, 0.8 * sc.y, z), q, v3(s, sc.y, s * 1.05)); roof.setMatrixAt(k, m4);
    H.push({ x, z, ry, s, sy, d: Math.hypot(x, z + 6) + hash(k * 4.4) * 3 });
    door.setColorAt(k, new THREE.Color(0.06, 0.035, 0.02));
    for (let w = 0; w < 2; w++) win.setColorAt(k * 2 + w, new THREE.Color(1.0, 0.72, 0.38).multiplyScalar(hash(k * 2 + w) > 0.35 ? 1.6 : 0.05));
  }
  const poolT = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolT, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), N);
  for (let k = 0; k < N; k++) pool.setColorAt(k, new THREE.Color(0, 0, 0));
  const alarm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), N); for (let k = 0; k < N; k++) alarm.setColorAt(k, new THREE.Color(0, 0, 0)); G.add(alarm); S.alarm = alarm;
  G.add(body, roof, door, win, pool); S.H = { body, roof, door, win, pool, H, N };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.9 })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0.002, -8); ground.receiveShadow = true; G.add(ground);
}
function housesAt(t, burn) {      // burn(h, k) = 0..1: puerta abierta y luz roja
  const { door, win, H } = S.H, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  const W = (h, lx, lz) => v3(h.x + lx * Math.cos(h.ry) + lz * Math.sin(h.ry), 0, h.z - lx * Math.sin(h.ry) + lz * Math.cos(h.ry));
  H.forEach((h, k) => {
    const b = burn(h, k), s = h.s, fl = b > 0.99 ? 0.85 + 0.15 * Math.sin(t * 13 + k) : 1;
    const p = W(h, 0, 0.453 * s); p.y = 0.21 * s * h.sy;
    q.setFromEuler(new THREE.Euler(0, h.ry, 0)); m4.compose(p, q, v3(s, s * h.sy, 1)); door.setMatrixAt(k, m4);
    c.setRGB(lerp(0.05, 4.2 * fl, b), lerp(0.03, 0.3 * fl, b), lerp(0.02, 0.18 * fl, b)); door.setColorAt(k, c);
    q.setFromEuler(new THREE.Euler(0, h.ry, 0));
    for (let w = 0; w < 2; w++) { const pw = W(h, (w ? 0.3 : -0.3) * s, 0.452 * s); pw.y = 0.55 * s * h.sy; m4.compose(pw, q, v3(s, s, 1)); win.setMatrixAt(k * 2 + w, m4); }
  });
  H.forEach((h, k) => { const b = burn(h, k), p = W(h, 0, 0.75 * h.s); p.y = 0.01; m4.compose(p, q.setFromEuler(new THREE.Euler(0, 0, 0)), v3(h.s, 1, h.s)); S.H.pool.setMatrixAt(k, m4); S.H.pool.setColorAt(k, c.setRGB(1.6 * b, 0.12 * b, 0.06 * b)); });
  H.forEach((h, k) => { const b = burn(h, k), fl = 0.6 + 0.4 * Math.sin(t * 17 + k * 1.7), sz = b > 0.01 ? 1 : 0.0001; m4.compose(v3(h.x, (0.8 + 0.5) * h.s * h.sy + 0.06, h.z), q.setFromEuler(new THREE.Euler(0, 0, 0)), v3(sz, sz, sz)); S.alarm.setMatrixAt(k, m4); S.alarm.setColorAt(k, c.setRGB(b * 5 * fl, b * 0.35 * fl, b * 0.25 * fl)); });
  S.alarm.instanceMatrix.needsUpdate = true; S.alarm.instanceColor.needsUpdate = true;
  S.H.pool.instanceMatrix.needsUpdate = true; S.H.pool.instanceColor.needsUpdate = true;
  door.instanceMatrix.needsUpdate = true; door.instanceColor.needsUpdate = true; win.instanceMatrix.needsUpdate = true;
}
// ---------------------------------------------------------------- estado de cada pieza según el tiempo (puerta, resbalón, cerrojo, rotor, llave, pitones, lámina, fantasma, corte)
let TT = {};
const r60 = x => Math.round(x * 60) / 60;
function buildTimes() {
  TT.cut1 = r60(K.dentro2 + 0.1);         // zambullida en la bocallave (negro)
  TT.cut2 = r60(K.pero7 - 0.05);          // planta del resbalón
  TT.cut3 = r60(K.y10 - 0.04);            // las 200 casas
  TT.cut4 = r60(K.el11 - 0.04);           // planta del cerrojo
  TT.cut5 = r60(K.asi12 - 0.04);          // echa la llave
  TT.l7in = K.resbalon7 + 0.32; TT.l7open = TT.l7in + 0.12; TT.l7rel = TT.l7open + 0.55; TT.l7close = K.portazo7 - 0.62; TT.slam7 = K.portazo7;
  TT.turn6 = [K.gira6, K.gira6 + 1.85]; TT.turn12 = [K.echa12, K.minuto12 + 0.12]; TT.unturn = [K.mandaselo13 + 0.05, K.mandaselo13 + 0.95];
  TT.endOpen = END - 1.7;
}
const inSeg = (t, a, b) => t >= a && t < b;
// la puerta del bucle: abierta del todo en τ = −1 y se cierra de golpe en K.portazo1 (τ = t al principio, τ = t − END al final)
function thetaLoop(tau) {
  const tm = -1.0, T = K.portazo1, TH = 0.75;
  if (tau <= tm - 0.7) return 0;
  if (tau <= tm) return TH * eo(clamp((tau - (tm - 0.7)) / 0.7));
  if (tau < T) { const u = (tau - tm) / (T - tm); return TH * (1 - u * u * u); }
  return 0;
}
function doorTheta(t) {
  if (t < TT.cut1) return thetaLoop(t) + 0.085 * eo(clamp((t - (K.abrirla1 - 0.06)) / 0.5));
  if (inSeg(t, TT.cut2, TT.cut3)) {
    const o = win(t, TT.l7open, 0.6), c = t < TT.slam7 ? Math.pow(clamp((t - TT.l7close) / (TT.slam7 - TT.l7close)), 3) : 1;
    return 0.11 * o * (1 - c) + 0.06 * eo(clamp((t - (K.mete9 + 0.02)) / 0.45));
  }
  if (t >= TT.cut5) return thetaLoop(t - END);
  return 0;
}
// el resbalón empujado por la esquina del marco al cerrar (geometría de la cara inclinada; salta al llegar al agujero del cerradero)
function latchClose(th) {
  if (th <= 0.0018 || th > 0.2) return 0;
  const zr = -0.55 + (4.3 - HING.x) * Math.sin(th);
  return clamp((0.08 - zr) / 0.5909 - 0.07, 0, 0.15);
}
const latchFilm = zTip => clamp((0.08 - (zTip - 0.004)) / 0.5909 - 0.02, 0, 0.2);
// la lámina: { zTip, a, off, flex, buck, t } o null
function filmState(t) {
  if (t >= K.radiografia1 - 0.25 && t < TT.cut1) {
    const t0 = K.radiografia1 - 0.25, ap = 1 - eo(clamp((t - t0) / 0.55));
    const zTip = keyed(t, [[t0 + 0.5, 0.7], [K.puede1 - 0.12, 0.075], [K.abrirla1 - 0.04, -0.065]]);
    return { zTip, a: 1.2, off: v3(2.8 * ap, 0, 1.1 * ap), flex: 0.06 * ap, buck: 0, t };
  }
  if (inSeg(t, K.lamina9 - 0.35, TT.cut3)) {
    const t0 = K.lamina9 - 0.35, ap = 1 - eo(clamp((t - t0) / 0.6));
    const zTip = keyed(t, [[K.entra9 - 0.05, 0.72], [K.rendija9 + 0.1, 0.08], [K.empuja9, 0.072], [K.cara9 + 0.05, 0.0], [K.mete9 - 0.06, -0.065]]);
    const fl = 0.24 * env(t, K.flexible9 - 0.25, K.radiografia9 + 0.2, 0.2, 0.5);
    return { zTip, a: 1.2, off: v3(2.6 * ap, 0, 1.3 * ap), flex: fl + 0.05 * ap, buck: 0, t };
  }
  if (inSeg(t, K.ninguna11 - 0.35, TT.cut5)) {
    const t0 = K.ninguna11 - 0.35, ap = 1 - eo(clamp((t - t0) / 0.5));
    const zTip = keyed(t, [[K.ninguna11 + 0.05, 0.72], [K.lamina11 + 0.05, 0.068]]);
    const push = win(t, K.lamina11 + 0.05, 0.35), bk = push * (0.032 + 0.006 * Math.sin(t * 23));
    return { zTip: Math.max(zTip, 0.066), a: 1.2 + 0.35 * push, off: v3(2.2 * ap, 0, 1.2 * ap), flex: 0.12 * push * (0.6 + 0.4 * Math.sin(t * 13)), buck: bk, t };
  }
  return null;
}
function latchR(t, th, fs) {
  let r = latchClose(th);
  if (inSeg(t, TT.cut2, TT.cut3)) r = Math.max(r, 0.17 * win(t, TT.l7in, 0.14) * (1 - win(t, TT.l7rel, 0.1)));
  if (fs && t < TT.cut4) r = Math.max(r, latchFilm(fs.zTip));
  if (t >= TT.cut5) r = Math.max(r, 0.17 * win(t, END - 1.95, 0.14) * (1 - win(t, END - 1.42, 0.1)));
  return clamp(r, 0, 0.2);
}
function plugPhi(t) {
  let p = 0;
  if (inSeg(t, TT.cut1, TT.cut2)) {
    p += 0.035 * Math.sin((t - K.bloquean4) * Math.PI * 2 * 7.5) * env(t, K.bloquean4 - 0.06, K.giro4 + 0.3, 0.05, 0.15);
    p += 4 * Math.PI * eio(clamp((t - TT.turn6[0]) / (TT.turn6[1] - TT.turn6[0])));
  }
  if (t >= TT.cut5) { p += 4 * Math.PI * eio(clamp((t - TT.turn12[0]) / (TT.turn12[1] - TT.turn12[0]))); p -= 4 * Math.PI * eio(clamp((t - TT.unturn[0]) / (TT.unturn[1] - TT.unturn[0]))); }
  return p;
}
function fPhi(p) { const k = Math.floor(p / (2 * Math.PI)), fr = p - 2 * Math.PI * k; return clamp(k + sm5(clamp((fr - (Math.PI - 0.7)) / 1.4)), 0, 2); }
function boltB(t, p) { if (inSeg(t, TT.cut4, TT.cut5)) return 2 * BSTEP; if (inSeg(t, TT.cut1, TT.cut2) || t >= TT.cut5) return BSTEP * fPhi(p); return 0; }
// la llave: z de su punta (o null si no está)
function keyZ(t) {
  if (inSeg(t, TT.cut1, TT.cut2)) { if (t < K.diente5 - 0.18) return null; return keyed(t, [[K.diente5 - 0.18, 0.66], [K.diente5 + 0.12, 0.31], [K.sube5 + 0.2, 0.2], [K.piton5 + 0.35, 0.1], [K.altura5 - 0.05, KTIP]]); }
  if (t >= TT.cut5) { if (t > END - 1.6) return null; return KTIP + 0.6 * Math.pow(clamp((t - (END - 1.95)) / 0.35), 2); }
  return null;
}
function ghostAt(t) {
  if (t < TT.cut1) return 1 - win(t, K.portazo1 + 0.1, 0.5);
  if (inSeg(t, TT.cut1, TT.cut2)) return 1;
  if (t >= TT.cut5) return Math.max(1 - win(t, K.tu13 - 0.25, 0.6), win(t, END - 1.55, 0.6));
  return 0;
}
function xrayAt(t) { if (t < TT.cut1) return 1 - win(t, K.portazo1 + 0.1, 0.5); if (t >= TT.cut5) return win(t, END - 1.55, 0.6); return 0; }
function clipAt(t) {
  if (inSeg(t, TT.cut2, TT.cut3)) { const up = win(t, K.lamina9 - 0.3, 0.45) * (1 - win(t, K.entra9 + 0.25, 0.45)); return lerp(LY + 0.12, 32, up * up); }
  if (inSeg(t, TT.cut4, TT.cut5)) return BY + 0.18;
  return CLIPOFF;
}
const cutMode = t => inSeg(t, TT.cut1, TT.cut2);

// ---------------------------------------------------------------- extras: línea de corte (dorada) y bloqueos (rojos) en el corte del bombín; polvo
function buildExtras() {
  const sl = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.0035, 0.27), basicGlow(0xffc24a, 2.4)); sl.position.set(0.0012, SHEAR, 0.17); S.cyl.add(sl); S.shearLine = sl; sl.material.opacity = 0;
  S.blockMarks = PZ.map(z => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.004, 0.032), basicGlow(0xff4433, 2.6)); b.position.set(0.0014, SHEAR, z); S.cyl.add(b); b.material.opacity = 0; return b; });
  S.flow = [
    flowCloud(9000, i => [3.8 + gauss(i) * 1.6, 10.8 + gauss(i + 5e3) * 1.4, 0.6 + Math.abs(gauss(i + 9e3)) * 1.8], { size: 1.4, bright: 0.5, seed: 1, nearF: 0.05, farF: 0.05, col: 0xfff0d8, drift: 0.02 }),
    flowCloud(4000, i => [3.55 + gauss(i) * 0.35, 10.55 + gauss(i + 3e3) * 0.3, gauss(i + 6e3) * 0.4], { size: 1.0, bright: 0.35, seed: 2, nearF: 0.02, farF: 0.1, col: 0xd8ecff, drift: 0.004 }),
    flowCloud(5000, i => [gauss(i) * 14, 0.3 + hash(i * 4.4) * 7, 60 - 9 + clamp(gauss(i + 7e3), -2.5, 1.2) * 6], { size: 1.3, bright: 0.45, seed: 3, nearF: 2.0, farF: 0.02, col: 0xffe0b8, drift: 0.02 }),
  ];
}
function ghostSet(g, lines = 1) {
  for (const it of GH) { const m = it.m, op = 1 - g * (1 - it.min), tr = op < 0.999; m.opacity = op; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.depthWrite = op > 0.6; }
  for (const it of GE) { const a = g * it.a * (it.grp === 'door' ? lines : 1); it.l.material.opacity = a; it.l.visible = a > 0.01; }
  for (const o of S.ghostCasters) o.castShadow = g < 0.5;
}

// ---------------------------------------------------------------- aplica el estado
function lockAt(t) {
  const lock = !inSeg(t, TT.cut3, TT.cut4);
  S.root.visible = lock; S.houses.visible = !lock;
  if (!lock) { housesAt(t, h => clamp((t - K.n200 + 0.15 - h.d * 0.022) / 0.3)); return; }
  const th = doorTheta(t), fs = filmState(t), g = ghostAt(t), cy = clipAt(t), cm = cutMode(t);
  S.DG.rotation.y = th;
  const side = inSeg(t, TT.cut1, TT.cut2) ? win(t, K.dentro3, 0.5) * (1 - win(t, K.entonces6 + 0.2, 0.5)) : 0;     // vista lateral del bombín
  ghostSet(g, 1 - side); post.uniforms.xray.value = xrayAt(t);
  M.boltM.opacity = 1 - 0.85 * side; M.boltM.depthWrite = side < 0.5;
  for (const m of S.sideFade) { m.opacity = 1 - 0.9 * side; m.depthWrite = side < 0.5; }
  S.clipPl.constant = cy;
  for (const c of S.caps) { c.visible = cy < 100; c.position.y = cy - 0.0005; }
  S.floor.d.visible = cy > 100; S.inside.visible = cy > 100;
  // bombín: entero o cortado por la mitad (para ver los pitones)
  const U = S.cyl.userData; U.full.visible = !cm; U.cut.visible = cm; S.plugCut.visible = cm; U.full.userData.plugFace.visible = !cm;
  S.frontPlate.visible = !cm;
  const p = plugPhi(t), zk = keyZ(t); S.plug.rotation.z = p;
  S.key.visible = zk !== null; if (zk !== null) S.key.position.z = zk;
  const pw = Math.abs(Math.atan2(Math.sin(p), Math.cos(p))) > 0.06;
  for (const P of S.pins) {
    let yb = PREST; if (zk !== null) { const u = P.z - zk; if (u >= 0 && u <= KLEN) yb = Math.max(PREST, keyTop(u)); }
    P.kp.position.y = yb; const db = pw ? SHEAR : yb + KPL[P.i], dt = db + DRV;
    P.dp.position.y = db; P.sp.position.y = dt; P.sp.scale.y = Math.max(0.01, CHTOP - dt);
  }
  // cerrojo y resbalón
  S.bolt.position.x = boltB(t, p);
  const r = latchR(t, th, fs); S.latch.position.x = -r; S.latchSpring.scale.x = Math.max(0.05, 0.476 - r);
  // lámina
  // (en planta, la lámina se dibuja solo como su corte: una línea que brilla)
  S.film.visible = !!fs && cy > FILM.y1 + 0.3; if (fs) filmSet(fs, cy); S.filmLine.visible = !!fs && cy < FILM.y1;
  // resaltes
  S.bevel.material.opacity = 0.75 * cw2(t, K.cara8 - 0.05, K.lamina9 - 0.2) * (0.75 + 0.25 * Math.sin(t * 9)) + 0.6 * cw2(t, K.empuja9, K.mete9 + 0.2);
  S.boltFace.material.opacity = 0.4 * cw2(t, K.recto11 - 0.05, K.mueve11 + 0.5);
  S.shearLine.material.opacity = 0.9 * cw2(t, K.alinean5 - 0.08, K.gira6 + 0.1) + 0.5 * cw2(t, K.altura5, K.alinean5 - 0.08);
  const bl = cw2(t, K.bloquean4 - 0.05, K.cada5 - 0.1) * (0.7 + 0.3 * Math.sin(t * 20)); for (const b of S.blockMarks) b.material.opacity = bl;
  // el interior (luz cálida por la rendija; más cuando se abre; casi nada en modo fantasma)
  S.inside.material.color.setScalar((0.45 + 2.2 * clamp(th / 0.1)) * Math.pow(1 - g, 3));
}
const cw2 = (t, t0, t1) => win(t, t0, 0.2) * (1 - win(t, t1, 0.2));
// ---------------------------------------------------------------- cámara: portazo en rayos X → la radiografía abre la puerta → zambullida en la bocallave (negro) → el bombín
// cortado (pitones, llave, giro, cerrojo) → corte: planta del resbalón (portazo, cara inclinada, la lámina) → corte: 200 casas → corte: planta del cerrojo
// → corte: echa la llave → se abre la puerta y vuelve al principio (bucle)
let CKS = [], CUTS = [];
const kh = th => doorPt(LCX, LCY, 0.30, th);        // bocallave (con la puerta entreabierta)
function buildCam() {
  CUTS = [TT.cut1, TT.cut2, TT.cut3, TT.cut4, TT.cut5];
  const PM = [6.9, 12.3, 5.6], LMd = [3.3, 10.7, -2.4], P0 = [6.4, 11.7, 3.7], L0 = [3.0, 10.85, -3.4], P1 = [5.75, 11.4, 3.45], L1 = [4.0, 10.85, -0.2];
  const k1 = kh(0.085), n1 = v3(Math.sin(0.085), 0, Math.cos(0.085)), a = (d, dx = 0, dy = 0) => [k1.x + n1.x * d + dx, k1.y + dy, k1.z + n1.z * d];
  const A1 = [
    [-1.5, PM, LMd, 40], [0, P0, L0, 38], [K.portazo1, P1, L1, 36], [K.y1 + 0.05, [5.9, 11.7, 5.6], [4.15, 10.9, 0.2], 38],
    [K.radiografia1 + 0.2, [7.6, 12.0, 6.6], [4.6, 10.9, 0.3], 40], [K.puede1, [7.3, 11.9, 6.2], [4.45, 10.9, 0.2], 39], [K.abrirla1 + 0.3, [7.0, 11.8, 5.9], [4.25, 10.9, 0.0], 38],
    [K.como2 + 0.05, a(1.6, 0.6, 0.35), [k1.x, k1.y, k1.z], 34], [K.vamos2 + 0.15, a(0.45, 0.06, 0.05), [k1.x, k1.y, k1.z], 30], [TT.cut1 - 0.0005, a(0.035), [k1.x - n1.x * 0.2, k1.y, k1.z - n1.z * 0.2], 28],
  ];
  const SV = (z, d, y = 10.6, f = 30, dy = 0) => [[LCX + d, y + dy, z], [LCX, y, z]];
  const A2 = [
    [TT.cut1, [3.95, 10.62, 1.3], [3.6, 10.55, 0.2], 34], [K.cerradura2 + 0.2, [5.2, 11.5, 2.9], [3.75, 10.68, 0], 36], [K.final2, [4.4, 11.25, 3.4], [3.72, 10.68, 0], 36], [K.evitarlo2 + 0.3, [3.2, 11.1, 3.3], [3.72, 10.66, 0], 36],
    [K.dentro3 + 0.25, [4.6, 10.85, 1.4], [3.6, 10.6, 0.15], 34], [K.cilindro3 + 0.15, ...SV(0.14, 1.42), 30], [K.fila3, ...SV(0.12, 1.38), 30], [K.pitones3 + 0.2, ...SV(0.17, 1.3), 30], [K.muelles3 + 0.3, ...SV(0.16, 1.28, 10.63), 30],
    [K.sin4 + 0.1, ...SV(0.13, 1.5, 10.6), 32], [K.bloquean4 + 0.1, ...SV(0.15, 1.36, 10.6), 30], [K.giro4 + 0.3, ...SV(0.14, 1.45, 10.59), 31],
    [K.cada5, ...SV(0.24, 1.55, 10.6), 31], [K.sube5 + 0.1, ...SV(0.2, 1.45, 10.6), 30], [K.altura5 + 0.15, ...SV(0.165, 1.05, 10.62), 28], [K.justa5 + 0.2, ...SV(0.16, 1.0, 10.62), 28],
    [K.alinean5 + 0.05, ...SV(0.16, 1.4, 10.6), 30], [K.entonces6 + 0.2, ...SV(0.16, 1.45, 10.6), 31],
    [K.gira6 - 0.1, [4.95, 11.05, 3.1], [3.75, 10.42, 0.28], 36], [K.empuja6 + 0.2, [5.15, 10.95, 2.85], [3.85, 10.38, 0.18], 36], [K.cerrojo6 + 0.2, [5.3, 10.85, 2.3], [4.05, 10.3, 0.05], 35],
    [K.barra6 + 0.15, [5.5, 10.85, 2.4], [4.25, 10.25, 0], 35], [TT.cut2 - 0.0005, [5.6, 10.8, 2.25], [4.3, 10.22, 0], 34],
  ];
  const PV = (x, z, h, lz = 0, f = 34) => [[x, LY + h, z + h * 0.18], [x, LY, lz], f];
  const A2b = [
    [TT.cut2, [4.75, 12.55, 2.6], [4.1, 10.95, 0.05], 36], [K.resbalon7 - 0.1, ...PV(4.12, 0.0, 2.5, -0.05)], [K.cierra7 - 0.3, ...PV(4.05, -0.25, 3.3, -0.35)], [K.portazo7 + 0.2, ...PV(4.1, -0.15, 3.0, -0.2)],
    [K.cara8, ...PV(4.24, 0.0, 2.2, 0.0, 33)], [K.punto8 + 0.1, ...PV(4.27, 0.0, 1.9, 0.0, 32)], [K.lamina9 - 0.35, ...PV(4.3, 0.05, 2.0, 0.0, 32)],
    [K.lamina9 + 0.25, [6.6, 11.8, 7.8], [5.1, 10.95, 1.2], 38], [K.radiografia9 + 0.1, [6.2, 11.4, 6.6], [5.15, 10.95, 1.2], 37], [K.entra9 + 0.1, [5.6, 13.6, 4.4], [4.55, 10.95, 0.6], 36],
    [K.rendija9 + 0.1, [4.55, 13.4, 1.4], [4.3, 10.95, 0.25], 34], [K.empuja9, ...PV(4.3, 0.15, 2.0, 0.1, 34)], [K.cara9 + 0.2, ...PV(4.25, 0.05, 1.7, 0.02, 32)], [K.mete9, ...PV(4.22, 0.0, 1.75, -0.05, 32)],
    [TT.cut3 - 0.0005, ...PV(4.2, -0.05, 1.9, -0.1, 33)],
  ];
  const H = (x, y, z) => [HZC.x + x, HZC.y + y, HZC.z + z];
  const A3 = [[TT.cut3, H(-7.5, 2.0, 6.5), H(-3.0, 0.5, -1.5), 38], [K.denuncian10, H(-3.5, 4.4, 8.0), H(-1.0, 0.3, -3.5), 40], [K.n200 + 0.2, H(0.5, 9.5, 9.0), H(0.5, 0.0, -6.0), 42], [TT.cut4 - 0.0005, H(3.0, 12.5, 8.0), H(0.8, 0.0, -7.0), 42]];
  const BV = (x, z, h, lz = 0, f = 34) => [[x, BY + h, z + h * 0.18], [x, BY, lz], f];
  const A4 = [[TT.cut4, ...BV(4.15, 0.1, 2.6, 0.0)], [K.cerrojo11 + 0.3, ...BV(4.2, 0.05, 2.3, 0.0)], [K.recto11 + 0.1, ...BV(4.2, 0.12, 1.5, 0.05, 32)], [K.ninguna11, ...BV(4.4, 0.3, 2.5, 0.18)], [K.lamina11 + 0.3, ...BV(4.45, 0.32, 2.6, 0.2)],
    [TT.cut5 - 0.0005, ...BV(4.45, 0.3, 2.8, 0.2)]];
  const A5 = [
    [TT.cut5, [4.75, 11.0, 2.95], [3.72, 10.42, 0.2], 37], [K.echa12 + 0.3, [4.6, 10.95, 2.8], [3.72, 10.4, 0.15], 36], [K.minuto12, [4.8, 10.85, 2.6], [3.9, 10.33, 0.1], 36],
    [K.tu13 + 0.15, [4.0, 11.0, 4.5], [3.4, 10.5, 0], 36], [K.echas13, [2.6, 11.6, 16.0], [0.6, 10.5, 0], 40], [K.mandaselo13 + 0.2, [2.4, 11.8, 21.0], [0.4, 10.6, 0], 40],
    [END - 1.5, PM, LMd, 40], [END, P0, L0, 38], [END + K.portazo1, P1, L1, 36],
  ];
  CKS = [A1, A2, A2b, A3, A4, A5];
}
function camAt(t) {
  let i = 0; while (i < CUTS.length && t >= CUTS[i]) i++;
  const st = camKeys(t, CKS[i]);
  for (const [t0, a0] of [[K.portazo1, 0.05], [K.portazo7, 0.02]]) { const u = t - t0; if (u > 0 && u < 0.5) { const a = a0 * Math.exp(-u * 8); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; st.l.y += Math.sin(u * 83 + 2) * a * 0.5; } }
  return st;
}
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return t; return t - dt; }
// ---------------------------------------------------------------- destellos y fundido a negro (la bocallave)
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[K.portazo1, 0.14], [K.abrirla1, 0.05], [K.alinean5, 0.05], [K.cerrojo6, 0.04], [CUTS[1], 0.1], [K.portazo7, 0.07], [K.debil8, 0.05], [K.mete9, 0.07],
    [CUTS[2], 0.12], [K.n200, 0.1], [CUTS[3], 0.1], [K.mueve11, 0.05], [CUTS[4], 0.1], [K.llave12, 0.04]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { return 0; }
function darkAt(t) { const c = CUTS[0]; return t < c ? eio(clamp((t - (c - 0.36)) / 0.33)) : 1 - eo(clamp((t - c - 0.03) / 0.45)); }
// ---------------------------------------------------------------- un instante de la escena
function stageAt(t, st) {
  NOW = t; lockAt(t);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.25, 1.6), hs = inSeg(t, TT.cut3, TT.cut4);
  rigAt(c, yaw, k, hs ? 1.4 : 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = hs ? 0.35 : 0.1;
  if (hs) { for (const L of [R.a, R.b, R.f]) { L.position.y += 9; L.intensity *= 0.35; } }     // en las casas, sin manchas de luz en los tejados
  scene.fog.density = hs ? 0.028 : 0.016;
  post.uniforms.fade.value = darkAt(t);
}
// ---------------------------------------------------------------- HUD: cabecera con el «mensaje pendiente» (cómo evitarlo), rótulos con línea guía, cotas y cifras
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A', HD = '#8FE6FF';
function hdr(t) {
  const a = 1 - darkAt(t); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic';
  const tk = clamp((t + 0.6) / 0.7);
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('LA CERRADURA', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('POR DENTRO', tk), 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('BOMBÍN', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('5 PITONES', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('PERFIL EUROPEO', 1024, 178);
  const mk = win(t, K.final2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = 'CÓMO EVITARLO · ???', col = HC.red, blink = true;
    if (t > K.echa12) { txt = 'ECHA LA LLAVE'; col = HC.green; blink = false; }
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
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
// flecha curva (giro) alrededor de un punto de pantalla
function arcArrow(C, r, a0, a1, col, k, lw = 5, cross = 0) {
  if (k <= 0.01 || !C) return;
  const a = a0 + (a1 - a0) * eo(clamp(k));
  hg.save(); hg.globalAlpha = clamp(k * 3); glowStroke(col, lw, 14); hg.beginPath(); hg.arc(C.x, C.y, r, a0, a, a1 < a0); hg.stroke();
  const ex = C.x + Math.cos(a) * r, ey = C.y + Math.sin(a) * r, tg = a1 > a0 ? a + Math.PI / 2 : a - Math.PI / 2;
  hg.fillStyle = col; hg.beginPath(); hg.moveTo(ex + Math.cos(tg) * 22, ey + Math.sin(tg) * 22); hg.lineTo(ex + Math.cos(tg + 2.4) * 16, ey + Math.sin(tg + 2.4) * 16); hg.lineTo(ex + Math.cos(tg - 2.4) * 16, ey + Math.sin(tg - 2.4) * 16); hg.closePath(); hg.fill();
  if (cross > 0.01) { const s = 34 * eo(clamp(cross)); glowStroke(HC.red, 9, 18); hg.beginPath(); hg.moveTo(C.x - s, C.y - s); hg.lineTo(C.x + s, C.y + s); hg.moveTo(C.x + s, C.y - s); hg.lineTo(C.x - s, C.y + s); hg.stroke(); }
  noGlow(); hg.restore();
}
function arrowH(A, B, col, k, lw = 6) {      // flecha recta de A a B (pantalla)
  if (k <= 0.01 || !A || !B) return;
  const e = eo(clamp(k)), x = A.x + (B.x - A.x) * e, y = A.y + (B.y - A.y) * e, an = Math.atan2(B.y - A.y, B.x - A.x);
  hg.save(); hg.globalAlpha = clamp(k * 3); glowStroke(col, lw, 14); hg.beginPath(); hg.moveTo(A.x, A.y); hg.lineTo(x, y); hg.stroke();
  hg.fillStyle = col; hg.beginPath(); hg.moveTo(x + Math.cos(an) * 20, y + Math.sin(an) * 20); hg.lineTo(x + Math.cos(an + 2.5) * 18, y + Math.sin(an + 2.5) * 18); hg.lineTo(x + Math.cos(an - 2.5) * 18, y + Math.sin(an - 2.5) * 18); hg.closePath(); hg.fill(); noGlow(); hg.restore();
}
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1440, C = S.cyl;
  // L1: la puerta, abierta
  { const s = cw(t, K.abrirla1 + 0.05, K.como2 + 0.2); if (s > 0.01) stamp('ABIERTA', W / 2, Y, s, HC.red, 84); }
  // L2: corchetes alrededor de la cerradura
  if (inSeg(t, TT.cut1, TT.cut2)) { const b = cw(t, K.cerradura2 - 0.1, K.dentro3); if (b > 0.01) { const A = proj(v3(3.67, 10.72, 0)); if (A.ok) brackets(A, 520, 820, b, HC.white, 2); } }
  // L3: cilindro, pitones, muelles
  if (inSeg(t, TT.cut1, TT.cut2)) {
    lab(wpo(C, 0, -0.07, 0.27), 'CILINDRO', 'BOMBÍN', cw(t, K.cilindro3, K.sin4 - 0.1), { dx: 120, dy: 170, color: HG });
    lab(wpo(S.pins[2].kp, 0, 0.03, 0), 'PITONES', '× 5', cw(t, K.pitones3, K.sin4 - 0.1), { dx: -140, dy: 230 });
    lab(wpo(S.pins[3].sp, 0, 0.5, 0), 'MUELLES', null, cw(t, K.muelles3, K.sin4 - 0.1), { dx: -120, dy: -150, color: HD });
    // L4: sin llave, bloquean el giro
    lab(wpo(C, 0, -0.01, 0.29), 'SIN LLAVE', null, cw(t, K.llave4, K.cada5 - 0.15), { dx: 130, dy: 190, color: HC.grey });
    lab(wpo(C, 0, SHEAR, PZ[2]), 'BLOQUEADO', 'EL PITÓN CRUZA EL CORTE', cw(t, K.bloquean4, K.cada5 - 0.15), { dx: -140, dy: -170, color: HC.red });
    { const k = cw(t, K.giro4 - 0.1, K.cada5 - 0.15); if (k > 0.01) { const P = proj(wpo(C, 0, 0, 0.17)); if (P.ok) arcArrow({ x: P.x, y: P.y + 330 }, 70, -2.6, -0.6, HC.red, k, 5, clamp((t - K.giro4 - 0.15) / 0.3)); } }
    // L5: el diente, la altura justa, la línea de corte
    if (S.key.visible) lab(wpo(S.key, 0, keyTop(KU[1]) - 0.004, KU[1]), 'DIENTE', null, cw(t, K.diente5 + 0.1, K.altura5 - 0.15), { dx: 120, dy: 200, color: HC.white });
    { const k = cw(t, K.altura5, K.alinean5 - 0.1); if (k > 0.01) { const P1 = proj(wpo(C, 0, KH[2], PZ[2] - 0.004)), P2 = proj(wpo(C, 0, SHEAR, PZ[2] - 0.004)); if (P1.ok) dimV(P1, P2, 'ALTURA JUSTA', k, HG, -90); } }
    lab(wpo(C, 0, SHEAR, 0.29), 'LÍNEA DE CORTE', 'TODOS ALINEADOS', cw(t, K.alinean5, K.gira6 - 0.1), { dx: 120, dy: -190, color: HG });
    // L6: gira y empuja el cerrojo
    { const k = cw(t, K.gira6 - 0.05, K.cerrojo6); if (k > 0.01) { const P = proj(wpo(C, 0, 0, 0.62)); if (P.ok) arcArrow(P, 150, -1.9, 0.9, HG, k, 6); } }
    lab(wpo(S.boltMesh, 0.25, 0.1, 0), 'CERROJO', null, cw(t, K.cerrojo6, K.barra6 - 0.05), { dx: 90, dy: 200, color: HD });
    lab(wpo(S.boltMesh, 0.3, 0.1, 0), 'CERROJO', 'BARRA RECTA DE ACERO', cw(t, K.barra6 - 0.05, TT.cut2 + 0.2), { dx: -140, dy: 220, color: HD, len: 40 });
  }
  // L7–L9: planta del resbalón
  if (inSeg(t, TT.cut2, TT.cut3)) {
    const LM = S.latchMesh;
    lab(wpo(LM, 3.95, 0.22, 0.0), 'RESBALÓN', null, cw(t, K.resbalon7, K.tiene8 - 0.2), { dx: -130, dy: -200, color: HG });
    { const k = cw(t, K.cierra7, K.tiene8 - 0.2); if (k > 0.01) bigText('SE CIERRA SOLO', W / 2, Y, 58, HC.white, k, { dark: 24 }); }
    lab(wpo(S.bevel, 0, 0, 0), 'CARA INCLINADA', null, cw(t, K.inclinada8 - 0.05, K.punto8 - 0.05), { dx: 130, dy: 190, color: HG });
    lab(wpo(S.bevel, 0, 0, 0), 'PUNTO DÉBIL', null, cw(t, K.punto8, K.lamina9 - 0.35), { dx: 130, dy: 190, color: HC.red });
    if (S.film.visible && S.filmA) { const A = S.filmA[78];
      lab(v3(A[0], 11.9, A[2]), 'LÁMINA FLEXIBLE', null, cw(t, K.lamina9 + 0.25, K.radiografia9 - 0.1), { dx: -120, dy: -260, color: HC.white });
      lab(v3(A[0], 11.9, A[2]), 'RADIOGRAFÍA', 'O CUALQUIER LÁMINA FINA', cw(t, K.radiografia9, K.entra9 + 0.1), { dx: -120, dy: -260, color: HD }); }
    lab(v3(GX, LY + 0.02, 0.26), 'RENDIJA', null, cw(t, K.rendija9 - 0.1, K.empuja9 + 0.2), { dx: -140, dy: 220, color: HC.white });
    { const k = cw(t, K.empuja9, K.mete9 - 0.05); if (k > 0.01 && S.filmA) { const P = proj(v3(GX, LY, S.filmA[0][2] + 0.03)), Q = proj(v3(GX, LY, S.filmA[0][2] + 0.28)); if (P.ok && Q.ok) arrowH(Q, P, HD, k, 6);
        const B = proj(wpo(LM, 4.0, 0.11, 0)), B2 = proj(wpo(LM, 3.86, 0.11, 0)); if (B.ok && B2.ok) arrowH(B, B2, HG, cw(t, K.cara9 - 0.1, K.mete9 - 0.05), 6); } }
    { const s = cw(t, K.mete9 + 0.04, TT.cut3 + 0.3); if (s > 0.01) stamp('ABIERTA', W / 2, Y, s, HC.red, 84); }
  }
  // L10: más de 200 robos en casas cada día
  if (inSeg(t, TT.cut3 - 0.1, TT.cut4 + 0.1)) {
    const k = cw(t, K.n200 - 0.05, TT.cut4 - 0.05); if (k > 0.01) { const n = Math.min(200, Math.round(200 * eo(clamp((t - K.n200 + 0.05) / 0.6)))); bigText('+' + n, W / 2, Y - 60, 150, HC.red, k, { glow: 26, type: false, dark: 30 });
      bigText('ROBOS EN CASAS', W / 2, Y + 50, 40, HC.white, cw(t, K.robos10 - 0.05, TT.cut4 - 0.05), { dark: 22 });
      bigText('CADA DÍA', W / 2, Y + 112, 46, HG, cw(t, K.cada10 - 0.05, TT.cut4 - 0.05), { glow: 14, dark: 22 });
      bigText('74.353 DENUNCIAS EN 2025 · INTERIOR', W / 2, Y + 170, 20, HC.grey, cw(t, K.dia10 - 0.1, TT.cut4 - 0.05), { dark: 16 }); }
  }
  // L11: el cerrojo es recto: ninguna lámina lo mueve
  if (inSeg(t, TT.cut4, TT.cut5)) {
    lab(wpo(S.boltMesh, 0.1, 0.1, 0), 'CERROJO', null, cw(t, K.cerrojo11, K.recto11 - 0.1), { dx: -130, dy: -200, color: HD });
    lab(wpo(S.boltFace, 0.32, 0, 0), 'RECTO', null, cw(t, K.recto11, K.mueve11 + 0.6), { dx: -130, dy: -200, color: HD });
    { const k = cw(t, K.mueve11 - 0.05, TT.cut5 + 0.2); if (k > 0.01) { bigText('NO SE MUEVE', W / 2, Y, 66, HC.white, k, { glow: 12, dark: 26 });
      const P = proj(v3(GX, BY, 0.25)); if (P.ok) { const s = 36 * eo(clamp(k * 1.5)); hg.save(); glowStroke(HC.red, 9, 18); hg.beginPath(); hg.moveTo(P.x - s, P.y - s); hg.lineTo(P.x + s, P.y + s); hg.moveTo(P.x + s, P.y - s); hg.lineTo(P.x - s, P.y + s); hg.stroke(); noGlow(); hg.restore(); } } }
  }
  // L12: echa la llave (2 vueltas), aunque sea un minuto
  if (t >= TT.cut5) {
    const k = cw(t, K.echa12 - 0.05, K.tu13 - 0.1); if (k > 0.01) { bigText('ECHA LA LLAVE', W / 2, Y - 40, 72, HC.green, k, { glow: 16, type: false, dark: 28 });
      const v = fPhi(plugPhi(t)); const nv = v > 1.5 ? 2 : v > 0.5 ? 1 : 0; if (nv > 0) bigText(nv === 1 ? '1 VUELTA' : '2 VUELTAS', W / 2, Y + 48, 44, HC.white, k, { type: false, dark: 22 });
      bigText('AUNQUE SEA 1 MINUTO', W / 2, Y + 118, 32, HG, cw(t, K.aunque12, K.tu13 - 0.1), { dark: 20 }); }
    { const P = proj(wpo(C, 0, 0, 0.62)); const r = cw(t, K.echa12 - 0.05, K.minuto12 + 0.2); if (r > 0.01 && P.ok) arcArrow(P, 120, -1.9, 0.9 + 6.3 * clamp((t - K.echa12) / 2.2), HC.green, r, 5); }
    // L13: ¿portazo o llave?
    const d = cw(t, K.portazo13 - 0.1, END - 0.7); if (d > 0.01) { bigText('¿PORTAZO', W / 2, Y - 30, 84, HC.red, d, { glow: 16, type: false, dark: 28 }); bigText('O LLAVE?', W / 2, Y + 70, 84, HC.green, cw(t, K.llave13 - 0.1, END - 0.7), { glow: 16, type: false, dark: 28 }); }
  }
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
    portazo1: atL(1, 'portazo'), y1: atL(1, '=y'), radiografia1: atL(1, 'radiografia'), puede1: atL(1, 'puede'), abrirla1: atL(1, 'abrirla'),
    como2: atL(2, 'como'), vamos2: atL(2, 'vamos'), dentro2: atL(2, 'dentro'), cerradura2: atL(2, 'cerradura'), y2: atL(2, '=y'), final2: atL(2, 'final'), comob2: atL(2, 'como', 2), evitarlo2: atL(2, 'evitarlo'),
    dentro3: atL(3, 'dentro'), cilindro3: atL(3, 'cilindro'), fila3: atL(3, 'fila'), pitones3: atL(3, 'pitones'), muelles3: atL(3, 'muelles'),
    sin4: atL(4, 'sin'), llave4: atL(4, 'llave'), pitones4: atL(4, 'pitones'), bloquean4: atL(4, 'bloquean'), giro4: atL(4, 'giro'),
    cada5: atL(5, 'cada'), diente5: atL(5, 'diente'), llave5: atL(5, 'llave'), sube5: atL(5, 'sube'), piton5: atL(5, 'piton'), altura5: atL(5, 'altura'), justa5: atL(5, 'justa'), todos5: atL(5, 'todos'), alinean5: atL(5, 'alinean'),
    entonces6: atL(6, 'entonces'), cilindro6: atL(6, 'cilindro'), gira6: atL(6, 'gira'), empuja6: atL(6, 'empuja'), cerrojo6: atL(6, 'cerrojo'), barra6: atL(6, 'barra'), recta6: atL(6, 'recta'), acero6: atL(6, 'acero'),
    pero7: atL(7, 'pero'), otra7: atL(7, 'otra'), pieza7: atL(7, 'pieza'), resbalon7: atL(7, 'resbalon'), cierra7: atL(7, 'cierra'), solo7: atL(7, 'solo'), portazo7: atL(7, 'portazo'),
    tiene8: atL(8, 'tiene'), cara8: atL(8, 'cara'), inclinada8: atL(8, 'inclinada'), ese8: atL(8, 'ese'), punto8: atL(8, 'punto'), debil8: atL(8, 'debil'),
    una9: atL(9, 'una'), lamina9: atL(9, 'lamina'), flexible9: atL(9, 'flexible'), como9: atL(9, 'como'), radiografia9: atL(9, 'radiografia'), entra9: atL(9, 'entra'), rendija9: atL(9, 'rendija'),
    empuja9: atL(9, 'empuja'), esa9: atL(9, '=esa'), cara9: atL(9, 'cara'), resbalon9: atL(9, 'resbalon'), mete9: atL(9, 'mete'),
    y10: atL(10, '=y'), ojo10: atL(10, 'ojo'), espana10: atL(10, 'espana'), denuncian10: atL(10, 'denuncian'), mas10: atL(10, '=mas'), n200: atL(10, '=200'), robos10: atL(10, 'robos'), casas10: atL(10, 'casas'), cada10: atL(10, 'cada'), dia10: atL(10, 'dia'),
    el11: atL(11, '=el'), cerrojo11: atL(11, 'cerrojo'), cambio11: atL(11, 'cambio'), recto11: atL(11, 'recto'), ninguna11: atL(11, 'ninguna'), lamina11: atL(11, 'lamina'), mueve11: atL(11, 'mueve'),
    asi12: atL(12, 'asi'), echa12: atL(12, '=echa'), siempre12: atL(12, 'siempre'), llave12: atL(12, 'llave'), aunque12: atL(12, 'aunque'), salgas12: atL(12, 'salgas'), minuto12: atL(12, 'minuto'),
    tu13: atL(13, '=tu'), das13: atL(13, 'das'), portazo13: atL(13, 'portazo'), echas13: atL(13, '=echas'), llave13: atL(13, 'llave'), mandaselo13: atL(13, 'mandaselo'), quien13: atL(13, 'quien'), nunca13: atL(13, 'nunca'), echa13: atL(13, '=echa'),
  };
  mats(); buildMats(); lockMats(); buildRig(); buildFloor();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; }
  scene.fog = new THREE.FogExp2(0x000000, 0.016);
  buildTimes(); buildLock(); buildHouses(); buildExtras();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
