// «Magisterio por dentro»: todo pasa dentro de un aula de Infantil (pizarra, rincones, mesas con macarrones, mesa de la maestra).
// Un collar de macarrones blancos y negros abre y cierra el vídeo (bucle). window.renderAt(t) dibuja el instante t (60 fps).
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
let WORDS = [], END = 61.2, VENV = [];
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
const _vp = new THREE.Matrix4();
function flowUpdate(t, VP, PVP) {
  for (const m of S.flow) { const u = m.material.uniforms; u.VP.value.copy(VP); u.PVP.value.copy(PVP); u.time.value = t; }
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
// ---------------------------------------------------------------- «Magisterio por dentro»: materiales y piezas del aula de Infantil.
// Escala real en metros: mesa de los niños 0,55 m, sillita 0,31 m, macarrón 4 cm. El aula va de x −4,2 a 4,2 y de z −3,6 a 3,6 (3 m de alto);
// la pizarra está en la pared del fondo (z −3,6), las ventanas a la izquierda (x −4,2) y la puerta a la derecha (x 4,2).
const M = {};
const RX = 4.2, RZ = 3.6, RH = 3.0, TABLE_Y = 0.55;
function repTex(t, rx, ry) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
function woodTex(base, dark, light, seed = 1) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y0 = hash(i * 3.3 + seed) * h, a = 0.05 + hash(i * 7.1 + seed) * 0.2, amp = 2 + hash(i * 1.7) * 8, f = 0.004 + hash(i * 5.5) * 0.012;
      g.strokeStyle = hash(i * 2.2 + seed) > 0.45 ? dark : light; g.globalAlpha = a; g.lineWidth = 0.6 + hash(i * 9.9) * 2.2; g.beginPath();
      for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + i) * amp + Math.sin(x * f * 3.1 + i * 2) * amp * 0.3; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}
function speckTex(base, cols, n, seed = 1, px = 512, rmax = 2.4) {      // terrazo, yeso, corcho
  return canvasTex(px, px, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.25 + hash(i * 1.9 + seed) * 0.6; const r = 0.4 + hash(i * 5.3 + seed) * rmax;
      g.beginPath(); g.ellipse(hash(i * 3.7 + seed) * w, hash(i * 8.1 + seed) * h, r, r * (0.6 + hash(i * 2.3) * 0.6), hash(i) * 3, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  });
}
function buildMats() {
  M.wood = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#bf9c71', '#94724b', '#d8bb92', 2), 1, 1), roughness: 0.66, clearcoat: 0.12, clearcoatRoughness: 0.4 });
  M.woodD = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#4c3423', '#2c1d12', '#6b4b31', 4), 1, 1), roughness: 0.6, clearcoat: 0.1, clearcoatRoughness: 0.4 });
  M.wall = new THREE.MeshStandardMaterial({ map: repTex(speckTex('#e6e2da', ['#d8d3ca', '#efebe4'], 2200, 3, 512, 1.6), 6, 3), roughness: 0.93 });
  M.wallLow = new THREE.MeshPhysicalMaterial({ color: 0x8f949b, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.3 });
  M.floor = new THREE.MeshPhysicalMaterial({ map: repTex(speckTex('#8e8a83', ['#6f6b65', '#b5b0a7', '#57534e', '#cfc9bf'], 9000, 7, 1024, 2.2), 7, 6), roughness: 0.32, clearcoat: 0.75, clearcoatRoughness: 0.12 });
  M.ceil = new THREE.MeshStandardMaterial({ color: 0xd7d3cb, roughness: 0.95 });
  M.plW = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.12 });      // sillitas (color por instancia)
  M.macW = new THREE.MeshPhysicalMaterial({ color: 0xf1eee8, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.25 });
  M.macB = new THREE.MeshPhysicalMaterial({ color: 0x141416, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.1 });
  M.macN = new THREE.MeshPhysicalMaterial({ color: 0xe6c27a, roughness: 0.55, clearcoat: 0.2, sheen: 0.3, sheenColor: new THREE.Color(0xfff0c8) });
  M.macI = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.2 });    // macarrones sueltos (color por instancia)
  M.peg = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#dcbf95', '#b8956a', '#ecd6b2', 9), 1, 1), roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  M.pegI = new THREE.MeshPhysicalMaterial({ color: 0xdcbd92, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  M.gold = metal(0xffcf6e, 0.2); M.steel = metal(0xd3d8e0, 0.25); M.dsteel = metal(0x7d858f, 0.35);
  M.paper = new THREE.MeshStandardMaterial({ color: 0xf2eee3, roughness: 0.9 });
  M.cork = new THREE.MeshStandardMaterial({ map: repTex(speckTex('#a8835a', ['#7d5c3a', '#c9a378', '#5e4329'], 6000, 11, 512, 2), 2, 1), roughness: 0.95 });
  M.felt = new THREE.MeshStandardMaterial({ map: repTex(speckTex('#3d3c3a', ['#2e2d2b', '#4c4b48'], 5000, 13, 512, 1.4), 3, 3), roughness: 1 });
  M.chalk = new THREE.MeshStandardMaterial({ color: 0xf2f1ea, roughness: 0.95 });
  M.black = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.45, metalness: 0.2 });
  M.string = new THREE.MeshStandardMaterial({ color: 0xf4efe2, roughness: 0.8 });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x1a1b1f, roughness: 0.75 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xdfe8ee, roughness: 0.03, transparent: true, opacity: 0.06, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
}
function cpuTex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { c, g }; return t; }
const mesh = (geo, m, cs = true) => { const o = new THREE.Mesh(geo, m); o.castShadow = cs; o.receiveShadow = true; return o; };
const grp = (...ch) => { const g = new THREE.Group(); for (const c of ch) g.add(c); return g; };
const at = (o, x, y, z, ry = 0, rx = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
const strip = g => { g = g.index ? g : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; };
const mergeAll = gs => mergeGeometries(gs.map(g => strip(g.index ? g.toNonIndexed() : g)));
// rótulo pintado en un plano (cartel de la puerta, tarjetas del abecedario, calendario…)
function plateText(w, h, lines, { fg = '#111', bg = '#f4f1ea', font = 'Inter', weight = 800, px = 512, border = false } = {}) {
  const t = canvasTex(px, Math.round(px * h / w), (g, W2, H2) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W2, H2); }
    if (border) { g.strokeStyle = fg; g.lineWidth = W2 * 0.02; g.strokeRect(W2 * 0.05, H2 * 0.06, W2 * 0.9, H2 * 0.88); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(([s, size, yy, col]) => { g.font = `${weight} ${size * H2}px ${font}`; g.fillStyle = col || fg; g.fillText(s, W2 / 2, yy * H2, W2 * 0.92); });
  });
  return mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }), false);
}

// ---------------------------------------------------------------- macarrón: tubo hueco con estrías (rigatoni), de 4 cm × 1,4 cm, eje y
function macGeo(L = 0.04, ro = 0.0068, ri = 0.0048, nr = 16) {
  const k = a => 1 + 0.065 * Math.cos(a * nr), dk = a => -0.065 * nr * Math.sin(a * nr);
  const o = new THREE.CylinderGeometry(ro, ro, L, 96, 1, true), p = o.attributes.position, n = o.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = ro * k(a), dr = ro * dk(a);
    p.setX(i, r * Math.cos(a)); p.setZ(i, r * Math.sin(a));
    const nx = r * Math.cos(a) + dr * Math.sin(a), nz = r * Math.sin(a) - dr * Math.cos(a), l = Math.hypot(nx, nz); n.setXYZ(i, nx / l, 0, nz / l);
  }
  const inn = new THREE.CylinderGeometry(ri, ri, L, 40, 1, true); { const nn = inn.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, -nn.getX(i), -nn.getY(i), -nn.getZ(i)); const ix = inn.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 2]; ix[i + 2] = t; } }
  const cap = s => { const c = new THREE.RingGeometry(ri, ro, 96, 1), q = c.attributes.position; for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), r = Math.hypot(x, y); if (r > (ri + ro) / 2) { const a = Math.atan2(y, x), kk = k(a); q.setX(i, x * kk); q.setY(i, y * kk); } }
    c.rotateX(s > 0 ? -Math.PI / 2 : Math.PI / 2); c.translate(0, s * L / 2, 0); return c; };
  return mergeAll([o, inn, cap(1), cap(-1)]);
}
// ---------------------------------------------------------------- muñeco de madera (como los de jugar): sentado (cuerpo + cabeza) o de pie
function pegGeo(stand = false) {
  const body = stand ? new THREE.CapsuleGeometry(0.11, 0.5, 8, 20) : new THREE.CapsuleGeometry(0.1, 0.2, 8, 20);
  body.translate(0, stand ? 0.36 : 0.2, 0);
  const head = new THREE.SphereGeometry(stand ? 0.1 : 0.09, 28, 20); head.translate(0, stand ? 0.84 : 0.51, 0);
  return mergeAll([body, head]);
}
// ---------------------------------------------------------------- muebles
function chairGeo() {          // sillita de Infantil (asiento a 0,31 m), respaldo hacia −z
  const parts = [];
  const seat = new THREE.BoxGeometry(0.29, 0.024, 0.28); seat.translate(0, 0.3, 0); parts.push(seat);
  const back = new THREE.BoxGeometry(0.29, 0.17, 0.022); back.translate(0, 0.49, -0.13); parts.push(back);
  for (const [x, z] of [[-0.125, -0.12], [0.125, -0.12], [-0.125, 0.12], [0.125, 0.12]]) { const l = new THREE.CylinderGeometry(0.011, 0.011, 0.3, 10); l.translate(x, 0.15, z); parts.push(l); }
  for (const x of [-0.125, 0.125]) { const l = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 8); l.translate(x, 0.4, -0.125); parts.push(l); }
  return mergeAll(parts);
}
function kidTable(w = 1.2, d = 0.6) {
  const g = new THREE.Group();
  const top = rbox(w, d, 0.034, M.wood, 0.02); top.rotation.x = -Math.PI / 2; top.position.y = TABLE_Y - 0.017; g.add(top);
  const edge = mesh(new THREE.BoxGeometry(w - 0.06, 0.05, d - 0.06), M.wood); edge.position.y = TABLE_Y - 0.055; g.add(edge);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = cyl(0.022, 0.022, TABLE_Y - 0.03, M.steel, 14); l.position.set(x * (w / 2 - 0.07), (TABLE_Y - 0.03) / 2, z * (d / 2 - 0.07)); g.add(l); }
  return g;
}
function shelfUnit(w, h, d, rows, m = M.wood) {         // estantería baja abierta
  const g = new THREE.Group(), t = 0.022;
  for (const x of [-w / 2 + t / 2, w / 2 - t / 2]) { const s = mesh(new THREE.BoxGeometry(t, h, d), m); s.position.set(x, h / 2, 0); g.add(s); }
  for (let i = 0; i <= rows; i++) { const s = mesh(new THREE.BoxGeometry(w, t, d), m); s.position.set(0, 0.04 + i * (h - 0.06) / rows, 0); g.add(s); }
  const b = mesh(new THREE.BoxGeometry(w, h, 0.01), m); b.position.set(0, h / 2, -d / 2 + 0.005); g.add(b);
  return g;
}
function book(w, h, d, c, seed = 1) {          // libro de cuentos (tapa dura de un color y cantos de papel)
  const g = new THREE.Group();
  const cov = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.5, clearcoat: 0.5 });
  const a = mesh(new THREE.BoxGeometry(w, h, 0.004), cov); a.position.z = d / 2 - 0.002; g.add(a);
  const b = mesh(new THREE.BoxGeometry(w, h, 0.004), cov); b.position.z = -d / 2 + 0.002; g.add(b);
  const sp = mesh(new THREE.BoxGeometry(0.004, h, d), cov); sp.position.x = -w / 2 + 0.002; g.add(sp);
  const pg = mesh(new THREE.BoxGeometry(w - 0.008, h - 0.008, d - 0.008), M.paper); pg.position.x = 0.002; g.add(pg);
  return g;
}
function pencil(L = 0.17) {           // lápiz hexagonal de madera con mina, a lo largo de +y (punta arriba)
  const g = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.0042, 0.0042, L * 0.86, 6), new THREE.MeshPhysicalMaterial({ color: 0x1c1c1f, roughness: 0.35, clearcoat: 0.8 })); body.position.y = L * 0.43; g.add(body);
  const cone = mesh(new THREE.CylinderGeometry(0.0012, 0.0042, L * 0.1, 18), M.wood); cone.position.y = L * 0.86 + L * 0.05; g.add(cone);
  const tip = mesh(new THREE.ConeGeometry(0.0013, L * 0.035, 12), M.black); tip.position.y = L * 0.96 + L * 0.016; g.add(tip);
  const ferr = cyl(0.0046, 0.0046, 0.012, M.steel, 18); ferr.position.y = -0.004; g.add(ferr);
  const er = cyl(0.0043, 0.0043, 0.012, new THREE.MeshStandardMaterial({ color: 0xe9e6e0, roughness: 0.8 }), 18); er.position.y = -0.016; g.add(er);
  return g;
}
function top3() {        // peonza de madera
  const g = new THREE.Group();
  const b = lathe([[0, 0], [0.006, 0.004], [0.03, 0.03], [0.048, 0.055], [0.05, 0.065], [0.04, 0.078], [0.012, 0.082], [0.008, 0.11], [0, 0.112]], 48, M.wood); g.add(b);
  const band = cyl(0.0505, 0.0505, 0.008, M.macB, 48); band.position.y = 0.061; g.add(band);
  const tip = cyl(0.0015, 0.004, 0.012, M.steel, 12); tip.position.y = 0.002; g.add(tip);
  return g;
}
function infinity(m) {      // ∞ (lemniscata) de tubo
  const pts = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2, d = 1 + Math.sin(a) ** 2; pts.push(v3(0.09 * Math.cos(a) / d, 0.09 * Math.sin(a) * Math.cos(a) / d, 0)); }
  return tube(pts, 0.009, m, 240, true, 14);
}
// ---------------------------------------------------------------- el aula: suelo de terrazo, paredes con zócalo, tres ventanas con sol (izquierda),
// pizarra con abecedario (fondo), puerta con cartel, calendario y corcho (derecha), estanterías (delante), cinco mesas con 25 sillitas,
// rincón de matemáticas (ábaco), rincón de lectura (alfombra y estantería de cuentos), tallímetro y mesa de la maestra.
const TABLES = [[0, 0], [-1.8, -0.95], [1.8, -0.95], [-1.75, 1.35], [1.75, 1.35]];
const SEATS = [];          // 25 sitios: [x, z, giro] (5 por mesa: dos por cada lado largo y uno en la cabecera)
for (const [tx, tz] of TABLES) {
  for (const sx of [-0.3, 0.3]) { SEATS.push([tx + sx, tz + 0.5, Math.PI]); SEATS.push([tx + sx, tz - 0.5, 0]); }
  SEATS.push([tx + (tx > 0 ? 0.78 : -0.78), tz, tx > 0 ? -Math.PI / 2 : Math.PI / 2]);
}
const WIN_Z = [-2.05, 0.05, 2.15], WIN_Y0 = 0.95, WIN_Y1 = 2.6, WIN_W = 1.3;
const SUN_DIR = new THREE.Vector3(1, -0.82, -0.3).normalize();
function wallBox(x, y, z, w, h, d, m = M.wall) { const b = mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); scene.add(b); return b; }
function buildRoom() {
  const R = S.room = {};
  // suelo y techo
  const fl = mesh(new THREE.PlaneGeometry(2 * RX, 2 * RZ), M.floor, false); fl.rotation.x = -Math.PI / 2; scene.add(fl);
  const ce = mesh(new THREE.PlaneGeometry(2 * RX, 2 * RZ), M.ceil, false); ce.rotation.x = Math.PI / 2; ce.position.y = RH; scene.add(ce);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const p = mesh(new THREE.BoxGeometry(1.2, 0.03, 0.3), new THREE.MeshStandardMaterial({ color: 0xf4f2ec, emissive: 0xfff6e8, emissiveIntensity: 0.25, roughness: 0.6 }), false); p.position.set(-2.4 + i * 2.4, RH - 0.02, -1.4 + j * 2.8); scene.add(p); }
  // pared del fondo (pizarra), delante y derecha: yeso arriba, zócalo pintado abajo (hasta 1,0 m) con una moldura
  const T = 0.12;
  for (const [x, z, w, d] of [[0, -RZ - T / 2, 2 * RX + 2 * T, T], [0, RZ + T / 2, 2 * RX + 2 * T, T]]) { wallBox(x, RH / 2, z, w, RH, d); wallBox(x, 0.5, z + (z < 0 ? T / 2 + 0.004 : -T / 2 - 0.004), w - 0.02, 1.0, 0.008, M.wallLow); }
  // derecha, con el hueco de la puerta (z 0,85…1,75, hasta 2,1 m)
  const DZ0 = 0.85, DZ1 = 1.75, DH = 2.1;
  wallBox(RX + T / 2, RH / 2, (-RZ + DZ0) / 2, T, RH, DZ0 + RZ); wallBox(RX + T / 2, RH / 2, (DZ1 + RZ) / 2, T, RH, RZ - DZ1); wallBox(RX + T / 2, (DH + RH) / 2, (DZ0 + DZ1) / 2, T, RH - DH, DZ1 - DZ0);
  for (const [z0, z1] of [[-RZ, DZ0], [DZ1, RZ]]) wallBox(RX - 0.004, 0.5, (z0 + z1) / 2, 0.008, 1.0, z1 - z0, M.wallLow);
  // puerta (entreabierta no: cerrada) con cartel «AULA 3 AÑOS» y rótulo «CEIP» encima
  const door = mesh(new THREE.BoxGeometry(0.04, DH - 0.01, DZ1 - DZ0 - 0.02), M.woodD); door.position.set(RX + 0.01, DH / 2, (DZ0 + DZ1) / 2); scene.add(door);
  const knob = sph(0.03, M.steel); knob.position.set(RX - 0.03, 1.0, DZ1 - 0.12); scene.add(knob);
  const sign = plateText(0.42, 0.3, [['AULA', 0.22, 0.3], ['3 AÑOS', 0.34, 0.66]], { border: true }); sign.position.set(RX - 0.015, 1.5, (DZ0 + DZ1) / 2); sign.rotation.y = -Math.PI / 2; scene.add(sign); R.sign = sign;
  const ceip = plateText(0.7, 0.16, [['CEIP', 0.7, 0.55]], { bg: '#121316', fg: '#f2eee6' }); ceip.position.set(RX - 0.01, DH + 0.22, (DZ0 + DZ1) / 2); ceip.rotation.y = -Math.PI / 2; scene.add(ceip); R.ceip = ceip;
  // izquierda: tres ventanas (la luz del sol entra por ellas)
  const zs = [-RZ, ...WIN_Z.flatMap(z => [z - WIN_W / 2, z + WIN_W / 2]), RZ];
  for (let i = 0; i < zs.length; i += 2) wallBox(-RX - T / 2, RH / 2, (zs[i] + zs[i + 1]) / 2, T, RH, zs[i + 1] - zs[i]);
  for (const z of WIN_Z) { wallBox(-RX - T / 2, WIN_Y0 / 2, z, T, WIN_Y0, WIN_W); wallBox(-RX - T / 2, (WIN_Y1 + RH) / 2, z, T, RH - WIN_Y1, WIN_W);
    const fm = new THREE.MeshPhysicalMaterial({ color: 0xf3f3f0, roughness: 0.35, clearcoat: 0.6 });
    for (const [y, h] of [[WIN_Y0 + 0.025, 0.05], [WIN_Y1 - 0.025, 0.05], [(WIN_Y0 + WIN_Y1) / 2 + 0.25, 0.04]]) { const b = mesh(new THREE.BoxGeometry(0.08, h, WIN_W), fm); b.position.set(-RX - 0.02, y, z); scene.add(b); }
    for (const dz of [-WIN_W / 2 + 0.025, 0, WIN_W / 2 - 0.025]) { const b = mesh(new THREE.BoxGeometry(0.08, WIN_Y1 - WIN_Y0, 0.04), fm); b.position.set(-RX - 0.02, (WIN_Y0 + WIN_Y1) / 2, z + dz); scene.add(b); }
    const gl = mesh(new THREE.PlaneGeometry(WIN_W, WIN_Y1 - WIN_Y0), M.glass, false); gl.rotation.y = Math.PI / 2; gl.position.set(-RX - 0.03, (WIN_Y0 + WIN_Y1) / 2, z); scene.add(gl);
    const sill = mesh(new THREE.BoxGeometry(0.22, 0.03, WIN_W + 0.1), fm); sill.position.set(-RX + 0.06, WIN_Y0 - 0.015, z); scene.add(sill);
  }
  for (const [z0, z1] of [[-RZ, WIN_Z[0] - WIN_W / 2], [WIN_Z[0] - WIN_W / 2, RZ]]) wallBox(-RX + 0.004, 0.5, (z0 + z1) / 2, 0.008, 1.0, z1 - z0, M.wallLow);
  // fuera: cielo luminoso (se ve blanco por las ventanas y da resplandor)
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.93, 0.8).multiplyScalar(2.2), toneMapped: false, fog: false }));
  sky.rotation.y = Math.PI / 2; sky.position.set(-RX - 2.5, 1.8, 0); scene.add(sky);
  // haces de sol: un prisma por ventana (la ventana barrida en la dirección del sol), aditivo y que se apaga a lo largo
  const beamM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { op: { value: 0.03 }, col: { value: new THREE.Color(1.0, 0.86, 0.62) } },
    vertexShader: 'attribute float along; varying float vA; varying vec3 vN; varying vec3 vV; void main(){ vA = along; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float op; uniform vec3 col; varying float vA; varying vec3 vN; varying vec3 vV; void main(){ float f = 0.35 + 0.65 * pow(1.0 - abs(dot(normalize(vN), vV)), 1.2); float a = op * f * pow(1.0 - vA, 1.6) * smoothstep(0.0, 0.06, vA); gl_FragColor = vec4(col * a, 1.); }' });
  R.beamM = beamM;
  for (const z of WIN_Z) {
    const c = [[WIN_Y0 + 0.05, z - WIN_W / 2 + 0.05], [WIN_Y0 + 0.05, z + WIN_W / 2 - 0.05], [WIN_Y1 - 0.05, z + WIN_W / 2 - 0.05], [WIN_Y1 - 0.05, z - WIN_W / 2 + 0.05]].map(([y, zz]) => v3(-RX, y, zz));
    const L = 4.2, far = c.map(p => p.clone().addScaledVector(SUN_DIR, Math.min(L, (p.y - 0.01) / -SUN_DIR.y)));
    const P = [...c, ...far], quads = [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], pos = [], al = [];
    for (const q of quads) for (const k of [0, 1, 2, 0, 2, 3]) { const p = P[q[k]]; pos.push(p.x, p.y, p.z); al.push(q[k] >= 4 ? 1 : 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('along', new THREE.Float32BufferAttribute(al, 1)); g.computeVertexNormals();
    const b = new THREE.Mesh(g, beamM); b.renderOrder = 6; b.frustumCulled = false; scene.add(b);
  }
  // pizarra (3,2 × 1,2 m) con marco de madera, bandeja con tizas y borrador; encima, el abecedario
  const BW = 3.2, BH = 1.2, BY = 1.5;
  const bt = S.boardTex = cpuTex(2048, 768); bt.anisotropy = 8;
  const board = mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.88, metalness: 0 }), false); board.position.set(0, BY, -RZ + 0.03); scene.add(board); R.board = board;
  const gt = S.glowTex = cpuTex(1024, 384);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshBasicMaterial({ map: gt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, color: new THREE.Color(1, 0.95, 0.85).multiplyScalar(2.4) }));
  glow.position.set(0, BY, -RZ + 0.034); glow.renderOrder = 7; scene.add(glow); R.glow = glow;
  for (const [x, y, w, h] of [[0, BY + BH / 2 + 0.03, BW + 0.12, 0.06], [0, BY - BH / 2 - 0.03, BW + 0.12, 0.06], [-BW / 2 - 0.03, BY, 0.06, BH], [BW / 2 + 0.03, BY, 0.06, BH]]) { const f = mesh(new THREE.BoxGeometry(w, h, 0.05), M.woodD); f.position.set(x, y, -RZ + 0.025); scene.add(f); }
  const tray = mesh(new THREE.BoxGeometry(BW, 0.025, 0.08), M.woodD); tray.position.set(0, BY - BH / 2 - 0.07, -RZ + 0.05); scene.add(tray);
  for (let i = 0; i < 4; i++) { const c = cyl(0.005, 0.005, 0.08, M.chalk, 10); c.rotation.z = Math.PI / 2; c.position.set(-1.2 + i * 0.13, BY - BH / 2 - 0.05, -RZ + 0.055); scene.add(c); }
  const er = grp(mesh(new THREE.BoxGeometry(0.14, 0.03, 0.05), M.woodD), at(mesh(new THREE.BoxGeometry(0.14, 0.012, 0.05), M.felt), 0, -0.021, 0)); er.position.set(1.1, BY - BH / 2 - 0.035, -RZ + 0.05); scene.add(er);
  const ABC = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', NC = 14;
  for (let i = 0; i < NC; i++) { const l = ABC[i]; const c = plateText(0.2, 0.26, [[l, 0.62, 0.42], [l.toLowerCase(), 0.26, 0.82, '#555']], { border: true }); c.position.set(-1.95 + i * 0.3, 2.53, -RZ + 0.01); c.rotation.z = (hash(i * 3.3) - 0.5) * 0.06; scene.add(c); }
  // tallímetro (a la izquierda de la pizarra): regla de 0 a 1,60 m
  const tall = mesh(new THREE.PlaneGeometry(0.34, 1.62), new THREE.MeshStandardMaterial({ roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, map: canvasTex(256, 1220, (g, w, h) => {
    g.fillStyle = '#f3f0e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#16171a';
    for (let c = 0; c <= 160; c += 2) { const y = h - c / 160 * (h - 20) - 6, big = c % 10 === 0; g.fillRect(0, y - (big ? 2 : 1), big ? 110 : (c % 5 === 0 ? 70 : 40), big ? 4 : 2); if (big && c > 0) { g.font = '800 46px Inter'; g.fillText(String(c), 124, y + 16); } }
    g.font = '800 30px Inter'; g.fillText('cm', 190, 40); }) }), false);
  tall.position.set(-2.62, 0.83, -RZ + 0.012); scene.add(tall); R.tall = tall;
  // corcho con dibujos (derecha, junto a la mesa de la maestra) y calendario + tarjeta de prácticas (derecha, junto a la puerta)
  const cork = mesh(new THREE.BoxGeometry(0.03, 0.9, 1.5), M.cork); cork.position.set(RX - 0.015, 1.55, -2.2); scene.add(cork);
  for (let i = 0; i < 6; i++) { const d = mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(256, 188, (g, w, h) => { g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#222'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.arc(w * (0.3 + hash(i) * 0.4), h * 0.35, 22 + hash(i * 2) * 14, 0, 7); g.stroke(); g.beginPath(); g.moveTo(w * 0.15, h * 0.85); for (let k = 0; k < 8; k++) g.lineTo(w * (0.15 + k * 0.1), h * (0.85 - hash(i * 9 + k) * 0.25)); g.stroke(); }) }), false);
    d.rotation.y = -Math.PI / 2; d.rotation.x = (hash(i * 7) - 0.5) * 0.12; d.position.set(RX - 0.035, 1.75 - Math.floor(i / 3) * 0.38, -2.65 + (i % 3) * 0.45); scene.add(d); }
  // estanterías del frente con cajas y mochilas en los percheros (se ven en el plano de la maestra)
  const fs = shelfUnit(2.4, 0.9, 0.4, 2); fs.position.set(-1.6, 0, RZ - 0.2); fs.rotation.y = Math.PI; scene.add(fs);
  for (let i = 0; i < 6; i++) { const b = rbox(0.34, 0.24, 0.3, i % 2 ? M.macB : M.macW, 0.02); b.rotation.x = -Math.PI / 2; b.position.set(-2.4 + (i % 3) * 0.8 - (i > 2 ? 0 : 0) + 0.2, 0.18 + Math.floor(i / 3) * 0.42, RZ - 0.22); scene.add(b); }
  for (let i = 0; i < 6; i++) { const hk = cyl(0.008, 0.008, 0.06, M.steel, 8); hk.rotation.x = Math.PI / 2; hk.position.set(0.9 + i * 0.4, 1.25, RZ - 0.03); scene.add(hk);
    const bp = rbox(0.22, 0.28, 0.1, new THREE.MeshPhysicalMaterial({ color: [0xe8e5df, 0x2a2b2f, 0xb9b4ab][i % 3], roughness: 0.6, clearcoat: 0.3 }), 0.04); bp.position.set(0.9 + i * 0.4, 1.06, RZ - 0.09); scene.add(bp); }
  // cinco mesas y 25 sillitas (blancas y negras alternas)
  for (const [x, z] of TABLES) { const tb = kidTable(); tb.position.set(x, 0, z); scene.add(tb); }
  const ch = new THREE.InstancedMesh(chairGeo(), M.plW, SEATS.length); ch.castShadow = true; ch.receiveShadow = true;
  SEATS.forEach(([x, z, r], i) => { _o.position.set(x, 0, z); _o.rotation.set(0, r, 0); _o.scale.setScalar(1); _o.updateMatrix(); ch.setMatrixAt(i, _o.matrix); ch.setColorAt(i, new THREE.Color(i % 2 ? 0x1c1c1f : 0xf0efea)); });
  scene.add(ch); R.chairs = ch;
  // mesa de la maestra (fondo a la derecha) con su silla
  const dk = new THREE.Group(); dk.position.set(2.65, 0, -2.75); scene.add(dk); R.desk = dk;
  const dt = rbox(1.3, 0.65, 0.04, M.woodD, 0.02); dt.rotation.x = -Math.PI / 2; dt.position.y = 0.75; dk.add(dt);
  const pan = mesh(new THREE.BoxGeometry(1.24, 0.5, 0.02), M.woodD); pan.position.set(0, 0.47, -0.28); dk.add(pan);
  for (const x of [-0.6, 0.6]) { const s = mesh(new THREE.BoxGeometry(0.04, 0.73, 0.6), M.woodD); s.position.set(x, 0.365, 0); dk.add(s); }
  const tch = grp(at(mesh(new THREE.BoxGeometry(0.44, 0.04, 0.42), M.black), 0, 0.46, 0), at(mesh(new THREE.BoxGeometry(0.44, 0.42, 0.03), M.black), 0, 0.7, 0.2), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => at(cyl(0.012, 0.012, 0.46, M.steel, 10), a * 0.19, 0.23, b * 0.18)));
  tch.position.set(2.65, 0, -3.3); tch.rotation.y = Math.PI; scene.add(tch);
  for (let i = 0; i < 3; i++) { const b = book(0.2, 0.27, 0.03, [0xe9e6e0, 0x1d1e22, 0xb5afa4][i]); b.rotation.set(-Math.PI / 2, 0, 0.1 * i); b.position.set(2.05 + 0.02 * i, 0.785 + 0.032 * i, -2.85); scene.add(b); }
  // rincón de matemáticas (esquina del fondo a la izquierda) y rincón de lectura (pared de las ventanas, en medio)
  const ms = shelfUnit(1.0, 0.55, 0.38, 1); ms.position.set(-3.95, 0, -2.75); ms.rotation.y = Math.PI / 2; scene.add(ms);
  const rug = mesh(new THREE.CircleGeometry(0.95, 64), M.felt, false); rug.rotation.x = -Math.PI / 2; rug.position.set(-3.05, 0.004, 0.25); scene.add(rug);
  const bs = shelfUnit(1.2, 0.8, 0.3, 2); bs.position.set(-4.02, 0, 0.25); bs.rotation.y = Math.PI / 2; scene.add(bs);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { const b = book(0.2, 0.26, 0.025, [0xefebe3, 0x222326, 0xc9c2b6, 0x6d6a66][(i + r) % 4]); b.rotation.set(-0.2, Math.PI / 2, 0); b.position.set(-3.93, 0.2 + r * 0.38, -0.12 + i * 0.25); scene.add(b); }
  for (const [x, z, s] of [[-2.6, 0.95, 1], [-3.45, -0.45, 0.85]]) { const c = sph(0.22 * s, new THREE.MeshPhysicalMaterial({ color: 0xd9d4ca, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0xffffff) }), 32, 20); c.scale.set(1, 0.38, 1); c.position.set(x, 0.07 * s, z); scene.add(c); }
}
// ---------------------------------------------------------------- luces del aula: el sol por las ventanas (con sombras), luz de techo suave y un foco
// que sigue a lo que se mira (para que siempre se lea el objeto)
function buildLights() {
  const sun = new THREE.DirectionalLight(0xffdcb0, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -6; sc.right = 6; sc.top = 5; sc.bottom = -5; sc.near = 0.5; sc.far = 30; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
  sun.position.copy(SUN_DIR.clone().multiplyScalar(-12)); sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xdce6f2, 0x4a4036, 0.1); scene.add(hemi);
  const key = new THREE.SpotLight(0xfff1e2, 30, 9, 0.75, 1.0, 1.6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.radius = 4; key.shadow.camera.near = 0.2; key.shadow.camera.far = 10;
  scene.add(key, key.target);
  const fill = new THREE.PointLight(0xdfe8ff, 3, 6, 1.6); scene.add(fill);
  const rim = new THREE.PointLight(0xffd7a8, 4, 5, 1.6); scene.add(rim);
  S.rig = { sun, hemi, key, fill, rim };
}
function rigAt(c, camP) {        // c = lo que se mira; el foco va arriba y un poco por delante, el relleno al lado de la cámara y el contraluz detrás
  const R = S.rig, d = c.clone().sub(camP), L = d.length(), u = d.clone().normalize(), side = v3(-u.z, 0, u.x);
  R.key.position.copy(c).addScaledVector(u, -L * 0.55).addScaledVector(side, L * 0.45).add(v3(0, 1.4 + L * 0.3, 0)); R.key.target.position.copy(c); R.key.target.updateMatrixWorld();
  R.key.distance = 3 + L * 2.2; R.key.intensity = 1.0 + 1.4 * L;
  R.fill.position.copy(camP).addScaledVector(side, -0.6).add(v3(0, 0.3, 0)); R.fill.intensity = 0.35 + 0.45 * L; R.fill.distance = 2 + L * 2;
  R.rim.position.copy(c).addScaledVector(u, 0.6 + L * 0.2).add(v3(0, 0.5, 0)); R.rim.intensity = 0.8 + 0.9 * L; R.rim.distance = 2 + L;
}
// polvo en suspensión por toda el aula (más en los haces de sol)
function buildFlow() {
  S.flow = [
    flowCloud(9000, i => { const z = WIN_Z[i % 3] + (hash(i * 3.1) - 0.5) * WIN_W, y = WIN_Y0 + hash(i * 5.7) * (WIN_Y1 - WIN_Y0), s = hash(i * 8.3) * ((y - 0.02) / -SUN_DIR.y);
      return [-RX + SUN_DIR.x * s, y + SUN_DIR.y * s, z + SUN_DIR.z * s]; }, { size: 1.5, bright: 0.85, farF: 0.05, nearF: 0.08, seed: 2, col: 0xffe2b8 }),
    flowCloud(5000, i => [(hash(i * 1.3) - 0.5) * 2 * RX, 0.05 + hash(i * 4.4) * 2.6, (hash(i * 6.1) - 0.5) * 2 * RZ], { size: 1.2, bright: 0.35, farF: 0.06, nearF: 0.05, seed: 3, col: 0xf0e6d8 }),
  ];
}
// ---------------------------------------------------------------- objetos que se mueven: el collar (abre y cierra el vídeo), los macarrones sueltos
// (cuenco → «?» → cordón con la serie), el ábaco, las letras de pasta, los niños del tallímetro, los iconos de la mesa, el calendario,
// los muñecos de la oposición y los 25 niños.
const _o = new THREE.Object3D(), _col = new THREE.Color(), _q0 = new THREE.Quaternion(), _Y = v3(0, 1, 0);
const CW = new THREE.Color(0xf1eee8), CB = new THREE.Color(0x141416), CN = new THREE.Color(0xe6c27a);
const NK_C = v3(0, 0.84, 0), NK_R = 0.105, NK_N = 16;
const BOWL = v3(0.44, TABLE_Y, 0.0), LACE_Z = 0.2, LACE_X0 = -0.22, LACE_X1 = 0.25, LACE_Y = TABLE_Y + 0.0075, SHEET = v3(0.12, TABLE_Y + 0.0012, -0.15);
const NQ = 16, NL = 40;          // 16 macarrones forman la «?»; 40 en total sueltos
const SER_N = 8, SER_X = i => LACE_X1 - 0.07 - i * 0.047;      // la serie (en el cordón, de la punta hacia dentro)
const ABA = v3(-3.92, 0.55, -2.75);
function easeArc(a, b, u, hgt) { const p = a.clone().lerp(b, eio(clamp(u))); p.y += Math.sin(Math.PI * clamp(u)) * hgt; return p; }
function buildProps(font) {
  const P = S.props = {};
  const MG = S.macGeo = macGeo();
  // collar flotante sobre la mesa central: 16 macarrones blancos y negros en un cordón, y una chispa que lo recorre
  const nk = new THREE.Group(); nk.position.copy(NK_C); scene.add(nk); P.nk = nk;
  const ring = new THREE.Group(); ring.rotation.x = 0.42; nk.add(ring); P.nkRing = ring;
  const th = new THREE.Mesh(new THREE.TorusGeometry(NK_R, 0.0011, 6, 160), M.string); th.rotation.x = Math.PI / 2; ring.add(th);
  P.nkMac = [];
  for (let i = 0; i < NK_N; i++) { const a = (i + 0.5) / NK_N * Math.PI * 2, m = mesh(MG, i % 2 ? M.macB : M.macW); m.position.set(NK_R * Math.cos(a), 0, NK_R * Math.sin(a)); m.quaternion.setFromUnitVectors(_Y, v3(-Math.sin(a), 0, Math.cos(a))); m.rotateY(i * 0.7); ring.add(m); P.nkMac.push(m); }
  P.spark = []; for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.0034 * (1 - i / 16), 10, 8), basicGlow(0xfff2d6, 1)); s.renderOrder = 8; ring.add(s); P.spark.push(s); }
  P.sparkL = new THREE.PointLight(0xffe6c0, 0, 0.6, 1.8); ring.add(P.sparkL);
  // cuenco de cerámica con macarrones; los sueltos son una sola malla instanciada
  const bowl = lathe([[0, 0], [0.04, 0], [0.042, 0.004], [0.07, 0.02], [0.088, 0.055], [0.09, 0.062], [0.084, 0.062], [0.082, 0.055], [0.064, 0.022], [0.036, 0.008], [0, 0.008]], 64, new THREE.MeshPhysicalMaterial({ color: 0xf2f0eb, roughness: 0.25, clearcoat: 1 }));
  bowl.position.copy(BOWL); scene.add(bowl);
  const mi = new THREE.InstancedMesh(MG, M.macI, NL); mi.castShadow = true; mi.receiveShadow = true; mi.frustumCulled = false; scene.add(mi); P.mi = mi;
  P.bowlPos = []; P.bowlQ = []; P.qPos = []; P.qQ = [];
  for (let i = 0; i < NL; i++) {
    const r = 0.055 * Math.sqrt(hash(i * 3.7)), a = hash(i * 9.1) * 6.283, y = 0.016 + hash(i * 2.3) * 0.032 + (0.055 - r) * 0.25;
    P.bowlPos.push(BOWL.clone().add(v3(r * Math.cos(a), y, r * Math.sin(a))));
    P.bowlQ.push(new THREE.Quaternion().setFromEuler(new THREE.Euler(hash(i * 4.4) * 3, hash(i * 5.5) * 3, Math.PI / 2 + (hash(i * 6.6) - 0.5))));
    mi.setColorAt(i, i >= 24 && i < 24 + SER_N ? ((i - 24) % 2 ? CB : CW) : i < NQ ? (i % 2 ? CB : CW) : (hash(i * 7.7) > 0.55 ? CN : (i % 2 ? CB : CW)));
  }
  // la «?» tumbada en la mesa (se lee desde delante, de pie hacia el fondo): arco + palo + punto (un macarrón de pie)
  { const cx = -0.43, cz = -0.1, R0 = 0.105, path = [];
    for (let i = 0; i <= 60; i++) { const a = lerp(Math.PI * 0.95, -Math.PI * 0.42, i / 60); path.push(v3(cx + Math.cos(a) * R0, 0, cz - 0.07 - Math.sin(a) * R0)); }
    const e = path[path.length - 1]; for (let i = 1; i <= 10; i++) path.push(v3(lerp(e.x, cx + 0.005, i / 10), 0, lerp(e.z, cz + 0.13, i / 10)));
    const len = []; let L = 0; path.forEach((p, i) => { if (i) L += p.distanceTo(path[i - 1]); len.push(L); });
    const n = NQ - 1, at2 = s => { let k = 1; while (k < len.length - 1 && len[k] < s) k++; const u = (s - len[k - 1]) / (len[k] - len[k - 1]); return [path[k - 1].clone().lerp(path[k], u), path[k].clone().sub(path[k - 1]).normalize()]; };
    for (let i = 0; i < n; i++) { const [p, d] = at2(0.02 + i * (L - 0.04) / (n - 1)); P.qPos.push(p.add(v3(0, TABLE_Y + 0.0072, 0))); P.qQ.push(new THREE.Quaternion().setFromUnitVectors(_Y, d)); }
    P.qPos.push(v3(cx + 0.005, TABLE_Y + 0.02, cz + 0.205)); P.qQ.push(new THREE.Quaternion());
  }
  // cordón con punta de plástico (para ensartar) y hoja de escritura con pauta
  { const pts = []; for (let i = 0; i <= 30; i++) { const x = lerp(LACE_X0 - 0.12, LACE_X1, i / 30); pts.push(v3(x, LACE_Y + (x < LACE_X0 ? -0.0055 : 0), LACE_Z + Math.sin(i * 0.9) * 0.002 + (x < LACE_X0 ? (LACE_X0 - x) * 0.6 : 0))); }
    const lace = tube(pts, 0.0016, M.string, 120, false, 8); scene.add(lace); P.lace = lace;
    const ag = cyl(0.0022, 0.0022, 0.022, M.black, 12); ag.rotation.z = Math.PI / 2; ag.position.set(LACE_X1 + 0.01, LACE_Y, LACE_Z); scene.add(ag); P.aglet = ag; }
  const wt = cpuTex(1024, 720); P.sheetTex = wt;
  const sheet = mesh(new THREE.PlaneGeometry(0.24, 0.17), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 }), false);
  sheet.rotation.set(-Math.PI / 2, 0, 0.08); sheet.position.copy(SHEET); scene.add(sheet); P.sheet = sheet; P.sheetK = -1;
  const pc = pencil(); pc.visible = false; scene.add(pc); P.pencil = pc;
  // ábaco del rincón de matemáticas: marco de madera y 5 varillas con 10 macarrones grandes cada una (la de arriba, de pasta natural)
  { const ab = new THREE.Group(); ab.position.copy(ABA); ab.rotation.y = Math.PI / 2; scene.add(ab); P.ab = ab;
    const W2 = 0.72, H2 = 0.52, f = 0.04;
    for (const x of [-W2 / 2, W2 / 2]) { const s = mesh(new THREE.BoxGeometry(f, H2 + 0.06, f), M.woodD); s.position.set(x, H2 / 2 + 0.03, 0); ab.add(s); }
    for (const y of [0.03, H2 + 0.03]) { const s = mesh(new THREE.BoxGeometry(W2 + f, f, f), M.woodD); s.position.set(0, y, 0); ab.add(s); }
    const ft = mesh(new THREE.BoxGeometry(W2 + 0.12, 0.025, 0.2), M.woodD); ft.position.y = 0.012; ab.add(ft);
    P.abY = []; for (let r = 0; r < 5; r++) { const y = 0.1 + r * 0.095; P.abY.push(y); const rod = cyl(0.004, 0.004, W2, M.steel, 10); rod.rotation.z = Math.PI / 2; rod.position.y = y; ab.add(rod); }
    const bm = new THREE.InstancedMesh(MG, M.macI, 50); bm.castShadow = true; bm.receiveShadow = true; ab.add(bm); P.abM = bm; P.abW = W2;
    for (let r = 0; r < 5; r++) for (let i = 0; i < 10; i++) bm.setColorAt(r * 10 + i, r === 4 ? CN : (r % 2 ? CB : CW));
  }
  // letras de pasta «MAMÁ» en la alfombra (rincón de lectura) y un cuento abierto
  { P.letters = []; const word = ['M', 'A', 'M', 'A']; let x = 0;
    const lg = new THREE.Group(); lg.position.set(-2.55, 0.004, -0.12); lg.rotation.y = Math.PI / 2; scene.add(lg); P.lg = lg;
    const geos = word.map(c => { const g = new TextGeometry(c, { font, size: 0.11, depth: 0.028, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 3 }); g.computeBoundingBox(); return g; });
    const total = geos.reduce((s, g) => s + g.boundingBox.max.x - g.boundingBox.min.x + 0.03, -0.03);
    x = -total / 2; geos.forEach((g, i) => { const w = g.boundingBox.max.x - g.boundingBox.min.x; g.translate(-g.boundingBox.min.x - w / 2, 0, -0.015);
      const m = mesh(g, M.macN); const p = new THREE.Group(); p.add(m); p.position.set(x + w / 2, 0, 0); lg.add(p); P.letters.push(p); x += w + 0.03; });
    const ac = mesh(new THREE.BoxGeometry(0.028, 0.05, 0.03), M.macN); ac.position.set(0.01, 0.142, 0); ac.rotation.z = -0.7; P.letters[3].add(ac);
    // cuento abierto: tapas y dos páginas con dibujos
    const bk = new THREE.Group(); bk.position.set(-2.78, 0.012, 0.32); bk.rotation.y = Math.PI / 2 + 0.35; scene.add(bk); P.book = bk;
    const pageTex = s => canvasTex(512, 640, (g, w, h) => { g.fillStyle = '#f4f0e6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1c1c1e'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
      if (s) { g.beginPath(); g.arc(w * 0.5, h * 0.36, 90, 0, 7); g.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; g.beginPath(); g.moveTo(w * 0.5 + Math.cos(a) * 120, h * 0.36 + Math.sin(a) * 120); g.lineTo(w * 0.5 + Math.cos(a) * 165, h * 0.36 + Math.sin(a) * 165); g.stroke(); } }
      else { g.beginPath(); g.moveTo(w * 0.2, h * 0.55); g.lineTo(w * 0.5, h * 0.25); g.lineTo(w * 0.8, h * 0.55); g.lineTo(w * 0.8, h * 0.62); g.stroke(); g.strokeRect(w * 0.25, h * 0.55, w * 0.5, h * 0.25); g.strokeRect(w * 0.43, h * 0.65, w * 0.14, h * 0.15); }
      g.fillStyle = '#1c1c1e'; g.font = '800 64px Inter'; g.textAlign = 'center'; g.fillText(s ? 'SOL' : 'CASA', w / 2, h * 0.92); });
    P.bookL = new THREE.Group(); P.bookR = new THREE.Group(); bk.add(P.bookL, P.bookR);
    const cov = new THREE.MeshPhysicalMaterial({ color: 0x1d1e22, roughness: 0.5, clearcoat: 0.6 });
    for (const [G, s] of [[P.bookL, -1], [P.bookR, 1]]) { const c = mesh(new THREE.BoxGeometry(0.2, 0.004, 0.26), cov); c.position.x = s * 0.1; G.add(c);
      const pg = mesh(new THREE.PlaneGeometry(0.19, 0.25), new THREE.MeshStandardMaterial({ map: pageTex(s > 0), roughness: 0.85 }), false); pg.rotation.x = -Math.PI / 2; pg.position.set(s * 0.1, 0.0035, 0); G.add(pg); }
  }
  // niños de madera junto al tallímetro: 1, 3 y 6 años (0,75 · 0,95 · 1,15 m)
  { const sg = pegGeo(true); P.kidsH = [[-2.95, 0.75], [-2.28, 0.95], [-1.9, 1.15]].map(([x, h]) => { const k = mesh(sg, M.peg); k.position.set(x, 0, -RZ + 0.32); k.userData.s0 = h / 0.95; k.scale.setScalar(k.userData.s0); scene.add(k); return k; }); }
  // iconos sobre tres sitios de la mesa 1: «b d» (dislexia), peonza (TDAH), ∞ dorado (autismo)
  { const ic = []; const bd = new THREE.Group();
    ['b', 'd'].forEach((c, i) => { const g = new TextGeometry(c, { font, size: 0.1, depth: 0.02, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2 }); g.center(); const m = mesh(g, M.macW); m.position.x = (i - 0.5) * 0.09; bd.add(m); });
    bd.position.set(-2.02, TABLE_Y + 0.052, -0.95); scene.add(bd); ic.push(bd);
    const tp = top3(); tp.position.set(-1.8, TABLE_Y, -0.95); scene.add(tp); ic.push(tp);
    const inf = infinity(new THREE.MeshPhysicalMaterial({ color: 0xffc95a, metalness: 1, roughness: 0.2, emissive: 0x6a4a10, emissiveIntensity: 0.4 })); inf.position.set(-1.58, TABLE_Y + 0.06, -0.95); scene.add(inf); ic.push(inf);
    ic.forEach(o => { o.userData.y0 = o.position.y; });
    P.icons = ic; }
  // calendario de pared (las hojas pasan) y tarjeta «EN PRÁCTICAS» colgada de un gancho
  { const cal = new THREE.Group(); cal.position.set(RX - 0.012, 1.45, -0.3); cal.rotation.y = -Math.PI / 2; scene.add(cal); P.cal = cal;
    const bkb = mesh(new THREE.BoxGeometry(0.4, 0.56, 0.01), M.woodD); bkb.position.z = -0.005; cal.add(bkb);
    const MONTHS = ['SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE', 'ENERO', 'FEBRERO', 'MARZO'];
    const pageT = m => canvasTex(360, 480, (g, w, h) => { g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#141416'; g.fillRect(0, 0, w, 92); g.fillStyle = '#f5f2ea'; g.font = '800 40px Inter'; g.textAlign = 'center'; g.fillText(MONTHS[m], w / 2, 62);
      g.fillStyle = '#222'; g.font = '700 26px Inter'; for (let d = 0; d < 30; d++) { const c = (d + m * 3) % 7, r = Math.floor((d + m * 3) / 7); g.fillText(String(d + 1), 36 + c * 48, 140 + r * 64); } });
    P.calTex = MONTHS.map((_, m) => pageT(m));
    P.calBase = mesh(new THREE.PlaneGeometry(0.36, 0.48), new THREE.MeshStandardMaterial({ map: P.calTex[0], roughness: 0.85 }), false); P.calBase.position.set(0, -0.02, 0.002); cal.add(P.calBase);
    P.calPiv = new THREE.Group(); P.calPiv.position.set(0, 0.22, 0.004); cal.add(P.calPiv);
    P.calFlip = mesh(new THREE.PlaneGeometry(0.36, 0.48), new THREE.MeshStandardMaterial({ map: P.calTex[0], roughness: 0.85 }), false); P.calFlip.position.y = -0.24; P.calPiv.add(P.calFlip);
    const back = mesh(new THREE.PlaneGeometry(0.36, 0.48), new THREE.MeshStandardMaterial({ color: 0xece8de, roughness: 0.9, side: THREE.BackSide }), false); P.calFlip.add(back);
    for (const x of [-0.1, 0.1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.002, 6, 16), M.steel); r.position.set(x, 0.225, 0.006); cal.add(r); }
    const hook = cyl(0.006, 0.006, 0.05, M.steel, 8); hook.rotation.z = Math.PI / 2; hook.position.set(RX - 0.03, 1.62, 0.14); scene.add(hook);
    const bd = new THREE.Group(); bd.position.set(RX - 0.05, 1.62, 0.14); scene.add(bd); P.badge = bd;
    const strap = tube([v3(0, 0, 0), v3(-0.01, -0.12, -0.05), v3(-0.012, -0.24, 0)], 0.004, M.black, 30); bd.add(strap);
    const strap2 = tube([v3(0, 0, 0), v3(-0.01, -0.12, 0.05), v3(-0.012, -0.24, 0)], 0.004, M.black, 30); bd.add(strap2);
    const card = plateText(0.09, 0.12, [['EN', 0.16, 0.3], ['PRÁCTICAS', 0.15, 0.48], ['MAESTRA / O', 0.08, 0.72, '#666']], { border: true, px: 360 }); card.rotation.y = -Math.PI / 2; card.position.set(-0.014, -0.3, 0); bd.add(card);
    const clip = mesh(new THREE.BoxGeometry(0.008, 0.02, 0.016), M.steel); clip.position.set(-0.013, -0.245, 0); bd.add(clip);
  }
  // mesa de la maestra: temario de la oposición, 19 muñecos en fila y una sillita dorada (la plaza)
  { const tm = new THREE.Group(); tm.position.set(2.37, 0.77, -2.98); scene.add(tm); P.temario = tm;
    const bnd = rbox(0.06, 0.3, 0.24, new THREE.MeshPhysicalMaterial({ color: 0x1b1c20, roughness: 0.4, clearcoat: 0.6 }), 0.01); bnd.rotation.y = Math.PI / 2; bnd.position.y = 0.15; tm.add(bnd);
    const lab = plateText(0.16, 0.05, [['TEMARIO', 0.6, 0.55]], { bg: '#f2eee6' }); lab.position.set(0, 0.2, 0.031); tm.add(lab);
    const pg = pegGeo(false); const dm = new THREE.InstancedMesh(pg, M.pegI, 19); dm.castShadow = true; dm.receiveShadow = true; dm.frustumCulled = false; scene.add(dm); P.dolls = dm;
    P.dollPos = []; for (let i = 0; i < 19; i++) { const r = Math.floor(i / 5), c = i % 5; P.dollPos.push(v3(2.6 + (c - 2) * 0.056 + (r % 2) * 0.028 + (hash(i * 3.1) - 0.5) * 0.01, 0.77, -2.5 - r * 0.058)); }
    const gc = new THREE.Group(); gc.position.set(2.6, 0.77, -2.93); scene.add(gc); P.goldChair = gc;
    const gm = new THREE.MeshPhysicalMaterial({ color: 0xffcf6e, metalness: 1, roughness: 0.22, emissive: 0xffb030, emissiveIntensity: 0 }); gm.color.setHex(0xd9b25c); P.goldM = gm;
    const cg = chairGeo(); const c = mesh(cg, gm); c.scale.setScalar(0.17); gc.add(c);
  }
  // los 25 niños (aparecen sentados en las sillitas)
  { const kg = pegGeo(false); const km = new THREE.InstancedMesh(kg, M.pegI, SEATS.length); km.castShadow = true; km.receiveShadow = true; km.frustumCulled = false; scene.add(km); P.kids = km;
    P.kidOrd = SEATS.map((s, i) => [i, Math.hypot(s[0] - 0.5, s[1] + 3)]).sort((a, b) => a[1] - b[1]).map(a => a[0]); }
}
// ---------------------------------------------------------------- un instante
function setInst(im, i, p, q, s) { _o.position.copy(p); _o.quaternion.copy(q); _o.scale.setScalar(Math.max(0.0001, s)); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); }
function propsAt(t) {
  const P = S.props;
  // collar: gira despacio (dos vueltas por bucle) y la chispa da 40 vueltas por bucle (el último fotograma enlaza con el primero)
  P.nk.rotation.y = Math.PI * 4 * t / END;
  const glowK = 0.55 + 0.45 * Math.max(1 - win(t, 2.6, 0.6), win(t, 52.3, 0.8));
  const ph = (t / END * 40) % 1;
  P.spark.forEach((s, i) => { const a = (ph - i * 0.011) * Math.PI * 2; s.position.set(NK_R * Math.cos(a), 0, NK_R * Math.sin(a)); s.material.color.setRGB(1, 0.95, 0.84).multiplyScalar((6 - i * 0.38) * glowK); });
  { const a = ph * Math.PI * 2; P.sparkL.position.set(NK_R * Math.cos(a), 0.01, NK_R * Math.sin(a)); P.sparkL.intensity = 0.25 * glowK; }
  // macarrones sueltos: cuenco → «?» (L2) → cuenco (L12) → cordón (L13, la serie) → cuenco (L15)
  const T_Q = K.para2 - 0.05, T_BACK = K.macarrones12, T_HOME = K.asi15 + 0.3;
  for (let i = 0; i < NL; i++) {
    let p = P.bowlPos[i], q = P.bowlQ[i];
    if (i < NQ) { const t0 = T_Q + i * 0.025, u = clamp((t - t0) / 0.45), v = clamp((t - T_BACK - i * 0.015) / 0.4);
      if (u > 0 && v < 1) { p = v > 0 ? easeArc(P.qPos[i], P.bowlPos[i], v, 0.12) : easeArc(P.bowlPos[i], P.qPos[i], u, 0.14); q = _q0.copy(v > 0 ? P.qQ[i] : P.bowlQ[i]).slerp(v > 0 ? P.bowlQ[i] : P.qQ[i], eio(v > 0 ? v : u)).clone(); } }
    const j = i - 24;            // la serie usa los macarrones 24…31 (blanco, negro, blanco…)
    if (j >= 0 && j < SER_N) { const ts = serT(j), u = clamp((t - ts) / 0.35), w = clamp((t - T_HOME - j * 0.03) / 0.4);
      const sp = v3(SER_X(j), LACE_Y, LACE_Z), sq = new THREE.Quaternion().setFromUnitVectors(_Y, v3(1, 0, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(_Y, j * 0.9));
      if (u > 0 && w < 1) { if (w > 0) { p = easeArc(sp, P.bowlPos[i], w, 0.1); q = sq.clone().slerp(P.bowlQ[i], eio(w)); }
        else { const tip = v3(LACE_X1 + 0.05, LACE_Y + 0.015, LACE_Z); p = u < 0.55 ? easeArc(P.bowlPos[i], tip, u / 0.55, 0.12) : tip.clone().lerp(sp, eio((u - 0.55) / 0.45)); q = P.bowlQ[i].clone().slerp(sq, eio(clamp(u / 0.55))); } } }
    setInst(P.mi, i, p, q, 1);
  }
  P.mi.instanceMatrix.needsUpdate = true; if (P.mi.instanceColor) P.mi.instanceColor.needsUpdate = false;
  // hoja de escritura: «mamá» a lápiz con pauta, se escribe al decir «escribir»; el lápiz sigue la punta
  { const k = clamp((t - K.escribir12 + 0.05) / 0.9), kk = Math.round(k * 120) / 120;
    if (kk !== P.sheetK) { P.sheetK = kk; const T = P.sheetTex, g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height;
      g.fillStyle = '#f6f2e8'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(40,40,46,.45)'; g.lineWidth = 2;
      for (const yy of [0.36, 0.46, 0.56, 0.66]) { g.beginPath(); g.moveTo(40, h * yy); g.lineTo(w - 40, h * yy); g.stroke(); }
      g.fillStyle = '#222'; g.font = '700 46px Inter'; g.fillText('Nombre: ________', 60, 90);
      if (kk > 0) { g.save(); g.beginPath(); g.rect(0, 0, 120 + (w - 200) * kk, h); g.clip(); g.fillStyle = '#26262a'; g.font = 'italic 500 250px Cormorant'; g.fillText('mamá', 120, h * 0.6); g.restore(); }
      T.needsUpdate = true; }
    const pc = P.pencil, on = win(t, K.usara12 - 0.1, 0.3) * (1 - win(t, K.si13 + 0.4, 0.3));
    pc.visible = on > 0.01; if (pc.visible) { const x = SHEET.x - 0.12 + 0.24 * (0.12 + 0.75 * k), z = SHEET.z + 0.004 + (k > 0 && k < 1 ? Math.sin(k * 60) * 0.006 : 0);
      const tipP = v3(x, TABLE_Y + 0.0015 + (k > 0 && k < 1 ? 0 : 0.02) + 0.08 * (1 - on), z), d = v3(-0.42, -0.82, 0.38).normalize(), s = Math.max(0.001, pops(t, K.usara12 - 0.1, 0.35));
      pc.quaternion.setFromUnitVectors(_Y, d); pc.scale.setScalar(s); pc.position.copy(tipP).addScaledVector(d, -0.17 * s); } }
  // ábaco: la varilla de arriba suma 2 + 3 (pasan a la derecha) al decir «sumar»
  { const bm = P.abM, W2 = P.abW;
    const sp = 0.05;
    for (let r = 0; r < 5; r++) for (let i = 0; i < 10; i++) {
      let x = -W2 / 2 + 0.045 + i * sp;
      if (r === 4) { const moved = i < 5 ? 0 : (i >= 8 ? win(t, K.sumar5 - 0.05, 0.3) : win(t, K.sumar5 + 0.25, 0.3)); x = lerp(x, W2 / 2 - 0.045 - (9 - i) * sp, moved); }
      _o.position.set(x, P.abY[r], 0); _o.quaternion.setFromUnitVectors(_Y, v3(1, 0, 0)); _o.rotateY(i * 1.3 + r); _o.scale.setScalar(1.2); _o.updateMatrix(); bm.setMatrixAt(r * 10 + i, _o.matrix); }
    bm.instanceMatrix.needsUpdate = true; }
  // letras de pasta: «letra a letra»; el cuento se abre al decir «leer»
  { const ts = [K.letra6 - 0.08, K.letra6 + 0.12, K.letra6 + 0.32, K.letra6b - 0.04];
    P.letters.forEach((l, i) => { const k = pops(t, ts[i], 0.35); show(l, k); l.rotation.x = -0.5 * (1 - eo(clamp((t - ts[i]) / 0.4))); });
    const o = eo(clamp((t - K.ensenar6) / 0.5)); P.bookL.rotation.z = lerp(-Math.PI * 0.98, 0.04, o); P.bookR.rotation.z = -0.04; P.book.scale.setScalar(pops(t, K.lengua6 + 0.1, 0.4)); }
  // niños del tallímetro (crecen al aparecer)
  { const ts = [K.aprender4, K.nino4, K.edad4]; P.kidsH.forEach((k, i) => show(k, pops(t, ts[i] - 0.1, 0.4) * (1 - win(t, K.matematicas5 + 0.2 + i * 0.05, 0.3)))); }
  // iconos de la mesa 1: b/d se dan la vuelta (espejo), la peonza gira, el ∞ brilla
  { const ts = [K.dislexia7, K.tdah7, K.autismo7];
    P.icons.forEach((o, i) => { const k = pops(t, ts[i] - 0.08, 0.4); o.visible = k > 0.002; if (!o.visible) return; o.scale.setScalar(k); o.position.y = o.userData.y0 + (i === 1 ? 0 : 0.004 * Math.sin(t * 2.4 + i)); });
    P.icons[0].rotation.y = Math.PI * Math.floor(clamp((t - K.dislexia7) / 0.5) * 3) + Math.sin(t * 1.3) * 0.2;
    P.icons[1].rotation.y = t * 22; P.icons[1].rotation.z = 0.08 * Math.sin(t * 5);
    P.icons[2].rotation.y = Math.sin(t * 1.1) * 0.5; }
  // calendario: pasan seis hojas (septiembre → marzo) al decir «meses»; la tarjeta aparece al decir «prácticas»
  { const n = 6, f = clamp((t - K.meses8) / 0.95) * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
    if (f <= 0) { P.calBase.material.map = P.calTex[0]; P.calFlip.visible = false; }
    else if (f >= n) { P.calBase.material.map = P.calTex[n]; P.calFlip.visible = false; }
    else { P.calBase.material.map = P.calTex[i + 1]; P.calFlip.material.map = P.calTex[i]; P.calFlip.visible = true; P.calPiv.rotation.x = -Math.PI * 0.95 * eio(u); }
    const b = pops(t, K.practicas8 - 0.08, 0.4); P.badge.visible = b > 0.002; P.badge.scale.setScalar(Math.max(0.001, b)); P.badge.rotation.x = 0.25 * Math.sin((t - K.practicas8) * 7) * Math.exp(-Math.max(0, t - K.practicas8) * 2.5); }
  // oposición: el temario aparece, los 19 muñecos entran en fila y la sillita dorada brilla al decir «plaza»
  { show(P.temario, pops(t, K.oposicion10 - 0.08, 0.4));
    for (let i = 0; i < 19; i++) { const k = pops(t, K.diecinueve10 - 0.12 + i * 0.03, 0.3); setInst(P.dolls, i, P.dollPos[i].clone().add(v3(0, 0.03 * (1 - clamp(k)), 0)), _q0.identity(), 0.15 * k); }
    P.dolls.instanceMatrix.needsUpdate = true;
    show(P.goldChair, pops(t, K.oposicion10 + 0.25, 0.4)); P.goldM.emissiveIntensity = 1.6 * win(t, K.plaza10 - 0.05, 0.25) * (0.75 + 0.25 * Math.sin(t * 10)); }
  // los 25 niños: aparecen en ola al decir «veinticinco» y se van al pasar a la mesa (L12)
  { for (let n = 0; n < SEATS.length; n++) { const i = P.kidOrd[n], [x, z] = SEATS[i];
      const k = pops(t, K.veinticinco11 - 0.1 + n * 0.02, 0.35) * (1 - win(t, K.y12 + 0.05 + n * 0.006, 0.25));
      setInst(P.kids, i, v3(x, 0.312, z), _q0.identity(), k); }
    P.kids.instanceMatrix.needsUpdate = true; }
}
function serT(j) { return j === 0 ? K.ensartarlos12 - 0.1 : j === 1 ? K.negro13 - 0.12 : K.negro13 + 0.12 + (j - 2) * 0.1; }
// ---------------------------------------------------------------- la pizarra (lienzo de 2048 × 768 = 3,2 × 1,2 m): tiza que se escribe al decirse.
// Izquierda: el cerebro (L3) y sus conexiones encendidas (L14). Centro: «¿FÁCIL?», Cataluña y 100 aspirantes, casi la mitad tachados (L9).
// Derecha: la fecha y un sol (siempre) y las matemáticas de 11 años (L13).
const BCW = 2048, BCH = 768;
const boardW = (px, py) => v3((px / BCW - 0.5) * 3.2, 1.5 + (0.5 - py / BCH) * 1.2, -RZ + 0.036);
const BR = { x: 70, y: 150, w: 560, h: 430 };            // caja del cerebro en el lienzo
const brainP = ([u, v]) => [BR.x + u * BR.w, BR.y + v * BR.h];
function smoothPts(pts, n = 8) {        // Catmull-Rom → polilínea densa
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); } }
  out.push(pts[pts.length - 1]); return out;
}
const BRAIN_OUT = [[0.10, 0.62], [0.05, 0.48], [0.07, 0.33], [0.15, 0.2], [0.28, 0.1], [0.44, 0.05], [0.6, 0.06], [0.75, 0.12], [0.87, 0.23], [0.94, 0.38], [0.94, 0.52], [0.89, 0.62], [0.8, 0.68], [0.68, 0.7], [0.58, 0.68], [0.5, 0.72], [0.42, 0.8], [0.3, 0.82], [0.2, 0.78], [0.13, 0.71], [0.10, 0.62]];
const BRAIN_IN = [
  [[0.66, 0.7], [0.76, 0.74], [0.84, 0.8], [0.82, 0.88], [0.72, 0.9], [0.62, 0.85], [0.6, 0.78]],
  [[0.65, 0.8], [0.72, 0.79], [0.8, 0.82]], [[0.66, 0.85], [0.73, 0.85], [0.78, 0.87]],
  [[0.56, 0.74], [0.57, 0.86], [0.58, 0.99]], [[0.62, 0.86], [0.63, 0.99]],
  [[0.2, 0.66], [0.32, 0.6], [0.44, 0.56], [0.55, 0.53], [0.63, 0.5]],
  [[0.5, 0.06], [0.48, 0.18], [0.5, 0.3], [0.46, 0.42], [0.48, 0.52]],
  [[0.16, 0.32], [0.26, 0.29], [0.32, 0.36], [0.41, 0.31]], [[0.11, 0.45], [0.22, 0.43], [0.3, 0.48], [0.39, 0.45]],
  [[0.22, 0.18], [0.3, 0.23], [0.37, 0.16]], [[0.58, 0.2], [0.66, 0.25], [0.73, 0.19], [0.81, 0.26]],
  [[0.58, 0.34], [0.68, 0.39], [0.77, 0.34], [0.88, 0.41]], [[0.6, 0.47], [0.71, 0.51], [0.84, 0.5]],
  [[0.28, 0.71], [0.39, 0.66], [0.5, 0.64]], [[0.24, 0.76], [0.36, 0.75]],
];
function polyLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
function buildBoard() {
  const B = S.bd = {};
  // pizarra de fondo: casi negra, con nubes de tiza borrada y pasadas de borrador
  const base = B.base = document.createElement('canvas'); base.width = BCW; base.height = BCH; const g = base.getContext('2d');
  g.fillStyle = '#1b1e1d'; g.fillRect(0, 0, BCW, BCH);
  for (let i = 0; i < 70; i++) { const x = hash(i * 3.1) * BCW, y = hash(i * 5.3) * BCH, r = 60 + hash(i * 7.7) * 260, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(235,235,225,${0.025 + hash(i * 1.9) * 0.035})`); gr.addColorStop(1, 'rgba(235,235,225,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  g.lineCap = 'round'; for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(230,230,220,${0.012 + hash(i * 4.4) * 0.02})`; g.lineWidth = 50 + hash(i * 6.6) * 70; g.beginPath(); const x = hash(i * 8.8) * BCW, y = hash(i * 9.9) * BCH; g.moveTo(x, y); g.lineTo(x + 200 + hash(i) * 400, y + (hash(i * 2) - 0.5) * 60); g.stroke(); }
  for (let i = 0; i < 40000; i++) { g.fillStyle = `rgba(255,255,255,${hash(i * 0.37) * 0.035})`; g.fillRect(hash(i * 1.71) * BCW, hash(i * 2.93) * BCH, 2, 2); }
  // ruido para el grano de la tiza (se resta de los trazos)
  const nz = B.noise = document.createElement('canvas'); nz.width = BCW; nz.height = BCH; const ng = nz.getContext('2d');
  for (let i = 0; i < 260000; i++) { ng.fillStyle = `rgba(0,0,0,${0.35 + hash(i * 0.913) * 0.65})`; const s = 1 + (hash(i * 1.37) > 0.8 ? 1 : 0); ng.fillRect(hash(i * 2.17) * BCW, hash(i * 3.31) * BCH, s, s); }
  B.chalk = document.createElement('canvas'); B.chalk.width = BCW; B.chalk.height = BCH; B.cg = B.chalk.getContext('2d', { willReadFrequently: true });
  // el cerebro en polilíneas (contorno + surcos), en el orden en que se dibuja
  B.brain = [smoothPts(BRAIN_OUT.map(brainP), 10), ...BRAIN_IN.map(p => smoothPts(p.map(brainP), 8))];
  B.brainLen = B.brain.map(polyLen); B.brainTot = B.brainLen.reduce((a, b) => a + b, 0);
  // red de conexiones (L14): nodos dentro del contorno y aristas a los vecinos, en orden de crecimiento desde el centro
  const poly = BRAIN_OUT, inside = (u, v) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > v) !== (yj > v) && u < (xj - xi) * (v - yi) / (yj - yi) + xi) c = !c; } return c; };
  const nodes = []; for (let i = 0; nodes.length < 230 && i < 5000; i++) { const u = hash(i * 1.913 + 7), v = hash(i * 3.17 + 2); if (inside(u, v)) nodes.push([u, v]); }
  const edges = [], seen = new Set();
  nodes.forEach((a, i) => { const d = nodes.map((b, j) => [j, Math.hypot(a[0] - b[0], (a[1] - b[1]) * 0.77)]).sort((p, q) => p[1] - q[1]);
    for (let k = 1; k <= 4; k++) { const j = d[k][0], key = Math.min(i, j) + '_' + Math.max(i, j); if (!seen.has(key)) { seen.add(key); edges.push([i, j]); } }
    if (hash(i * 5.5) > 0.6) { const j = d[6 + Math.floor(hash(i * 8.1) * 14)][0], key = Math.min(i, j) + '_' + Math.max(i, j); if (!seen.has(key)) { seen.add(key); edges.push([i, j]); } } });
  const c0 = nodes.reduce((b, n, i) => (Math.hypot(n[0] - 0.5, n[1] - 0.42) < Math.hypot(nodes[b][0] - 0.5, nodes[b][1] - 0.42) ? i : b), 0);
  edges.forEach(e => { const m = [(nodes[e[0]][0] + nodes[e[1]][0]) / 2, (nodes[e[0]][1] + nodes[e[1]][1]) / 2]; e.push(Math.hypot(m[0] - nodes[c0][0], m[1] - nodes[c0][1]) + hash(e[0] * 3 + e[1]) * 0.12); });
  edges.sort((a, b) => a[2] - b[2]); B.nodes = nodes; B.edges = edges; B.lastKey = ''; B.lastG = -1;
  // los 100 aspirantes (10 × 10) y los 45 que se tachan (orden fijo)
  B.cross = Array.from({ length: 100 }, (_, i) => i).sort((a, b) => hash(a * 7.31) - hash(b * 7.31)).slice(0, 45);
}
// trazo de tiza: la fracción k de la polilínea, con dos pasadas (una más fina y desplazada) para que no quede «digital»
function chalkLine(g, pts, k, w = 6, a = 0.92) {
  if (k <= 0) return; const L = polyLen(pts) * clamp(k); let acc = 0;
  for (const [dx, dy, ww, aa] of [[0, 0, w, a], [1.2, -0.8, w * 0.55, a * 0.6]]) {
    g.save(); g.globalAlpha = aa; g.lineWidth = ww; g.strokeStyle = '#f1f0e8'; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0] + dx, pts[0][1] + dy); acc = 0;
    for (let i = 1; i < pts.length; i++) { const s = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + s >= L) { const u = (L - acc) / s; g.lineTo(lerp(pts[i - 1][0], pts[i][0], u) + dx, lerp(pts[i - 1][1], pts[i][1], u) + dy); break; }
      g.lineTo(pts[i][0] + dx, pts[i][1] + dy); acc += s; }
    g.stroke(); g.restore(); }
}
function chalkText(g, txt, x, y, size, k, o = {}) {        // se escribe de izquierda a derecha
  if (k <= 0) return; g.save(); g.font = `${o.w || 800} ${size}px ${o.font || 'Inter'}`; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
  const tw = g.measureText(txt).width, x0 = (o.align === 'left' ? x : x - tw / 2) - 10;
  g.beginPath(); g.rect(x0, y - size, (tw + 20) * clamp(k), size * 2); g.clip();
  g.translate(x, y); g.rotate(o.rot || -0.015); g.fillStyle = '#f1f0e8'; g.globalAlpha = o.a ?? 0.95; g.fillText(txt, 0, 0); g.restore();
}
function stick(g, x, y, s, k) {           // muñeco de palitos (cabeza, cuerpo, brazos, piernas)
  if (k <= 0) return; const e = clamp(k);
  chalkLine(g, [[x, y - 14 * s], [x, y + 6 * s]], e, 3.2); chalkLine(g, [[x - 9 * s, y - 6 * s], [x + 9 * s, y - 6 * s]], e, 3);
  chalkLine(g, [[x - 7 * s, y + 18 * s], [x, y + 6 * s], [x + 7 * s, y + 18 * s]], e, 3);
  g.save(); g.globalAlpha = 0.92 * e; g.strokeStyle = '#f1f0e8'; g.lineWidth = 3.2; g.beginPath(); g.arc(x, y - 20 * s, 6 * s, 0, 7 * e); g.stroke(); g.restore();
}
function boardAt(t) {
  const B = S.bd;
  const kb = clamp((t - K.aprender3 + 0.05) / (K.cerebro3 + 0.25 - K.aprender3));
  const kf = clamp((t - K.facil9 + 0.05) / 0.45), kc = clamp((t - K.cataluna9) / 0.5), kp = clamp((t - K.este9 + 0.05) / (K.casi9 + 0.15 - K.este9)), kx = clamp((t - K.mitad9) / (K.examen9 + 0.1 - K.mitad9));
  const km = clamp((t - K.predice13) / (K.matematicas13 + 0.55 - K.predice13)), ko = clamp((t - K.once13 + 0.05) / 0.4);
  const key = [kb, kf, kc, kp, kx, km, ko].map(v => Math.round(v * 120)).join(',');
  if (key !== B.lastKey) {
    B.lastKey = key; const g = B.cg; g.clearRect(0, 0, BCW, BCH);
    // siempre: la fecha y un sol de clase de Infantil (arriba a la derecha)
    chalkText(g, 'NOVIEMBRE', 1830, 70, 40, 1, { a: 0.8 });
    { const sx = 1960, sy = 160; chalkLine(g, smoothPts(Array.from({ length: 13 }, (_, i) => [sx + Math.cos(i / 12 * 6.283) * 24, sy + Math.sin(i / 12 * 6.283) * 24]), 4), 1, 4, 0.8);
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; chalkLine(g, [[sx + Math.cos(a) * 34, sy + Math.sin(a) * 34], [sx + Math.cos(a) * 50, sy + Math.sin(a) * 50]], 1, 4, 0.8); } }
    // L3: el cerebro
    if (kb > 0) { let L = B.brainTot * kb; B.brain.forEach((p, i) => { const l = B.brainLen[i], u = clamp(L / l); chalkLine(g, p, u, i ? 4.5 : 6.5); L -= l; }); }
    // L9: «¿FÁCIL?», Cataluña 2026 y los 100 aspirantes; se tachan 45
    chalkText(g, '¿FÁCIL?', 1024, 110, 92, kf);
    chalkText(g, 'CATALUÑA · 2026', 1024, 188, 40, kc, { w: 700 });
    if (kp > 0) for (let i = 0; i < 100; i++) { const c = i % 10, r = Math.floor(i / 10), x = 772 + c * 56, y = 262 + r * 47; stick(g, x, y, 0.95, clamp(kp * 1.6 - (i / 100) * 0.6) * 1.0); }
    if (kx > 0) B.cross.forEach((i, n) => { const c = i % 10, r = Math.floor(i / 10), x = 772 + c * 56, y = 262 + r * 47 - 4, e = clamp(kx * 45 / 6 - n / 6) ; if (e <= 0) return;
      chalkLine(g, [[x - 17, y - 22], [x + 17, y + 20]], clamp(e * 2), 4.2); chalkLine(g, [[x + 17, y - 22], [x - 17, y + 20]], clamp(e * 2 - 1), 4.2); });
    // L13: matemáticas de quinto (11 años)
    chalkText(g, '3/4 + 1/2 = 5/4', 1690, 360, 66, km);
    chalkText(g, '11 AÑOS', 1690, 480, 56, ko, { w: 700 });
    // grano: se come parte de los trazos; luego, pizarra + tiza
    g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.42; g.drawImage(B.noise, 0, 0); g.restore();
    const T = S.boardTex, bg = T.userData.g; bg.drawImage(B.base, 0, 0); bg.drawImage(B.chalk, 0, 0); T.needsUpdate = true;
  }
  // L14: la red se enciende (crece muy deprisa: «un millón por segundo») y se apaga al volver al collar
  const t0 = K.crea14 - 0.25, t1 = K.segundo14 + 0.4, grow = t < t0 ? 0 : clamp((Math.exp(3.2 * (t - t0) / (t1 - t0)) - 1) / (Math.exp(3.2) - 1));
  const fade = win(t, K.cerebro14 - 0.3, 0.4) * (1 - win(t, K.magisterio15 - 0.4, 0.6)), gk = Math.round(grow * 400) / 400 + Math.round(fade * 60) * 10;
  if (gk !== B.lastG || (fade > 0 && fade < 1) || grow > 0 && grow < 1 || fade > 0) {
    B.lastG = gk; const T = S.glowTex, g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height, sx = w / BCW, sy = h / BCH;
    g.clearRect(0, 0, w, h);
    if (fade > 0.001) {
      g.save(); g.scale(sx, sy); g.globalAlpha = 0.35 * fade; B.brain.forEach((p, i) => { g.strokeStyle = '#fff4e0'; g.lineWidth = i ? 5 : 7; g.lineCap = 'round'; g.beginPath(); p.forEach((q, k) => (k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke(); }); g.restore();
      const n = Math.floor(B.edges.length * grow), P2 = q => [(BR.x + q[0] * BR.w) * sx, (BR.y + q[1] * BR.h) * sy];
      g.lineCap = 'round'; g.lineWidth = 1.3;
      for (let i = 0; i < n; i++) { const [a, b] = B.edges[i], A = P2(B.nodes[a]), Bq = P2(B.nodes[b]), fl = 0.55 + 0.45 * Math.sin(t * 9 + i * 1.7);
        g.strokeStyle = `rgba(255,236,200,${(0.55 * fl * fade).toFixed(3)})`; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(Bq[0], Bq[1]); g.stroke(); }
      const nn = Math.min(B.nodes.length, Math.floor(B.nodes.length * Math.min(1, grow * 1.4)));
      for (let i = 0; i < nn; i++) { const p = P2(B.nodes[i]), on = hash(i * 3.3 + Math.floor(t * 14)) > 0.82; g.fillStyle = `rgba(255,248,232,${((on ? 1 : 0.55) * fade).toFixed(3)})`; g.beginPath(); g.arc(p[0], p[1], on ? 3 : 1.7, 0, 7); g.fill(); }
    }
    T.needsUpdate = true;
  }
}
// ---------------------------------------------------------------- cámara: el collar → la mesa desde arriba («?») → el aula → la pizarra (cerebro) →
// tallímetro → ábaco → rincón de lectura → mesa 1 → calendario y puerta → pizarra (Cataluña) → mesa de la maestra → la clase vista por la
// maestra → la mesa (ensartar, escribir, la serie) → pizarra (11 años) → pizarra (conexiones) → el collar (bucle).
let CKS = [], CUTS = [];
const T0 = [0.2, 1.02, 0.66], L0 = [0, 0.835, 0], TA = [0.24, 1.06, 0.78], LA = [0, 0.83, 0];
const BRD = (x, d = 2.2, y = 1.48, ly = 1.47, dx = 0) => [[x + dx, y, -RZ + d], [x, ly, -RZ]];
function buildCam() {
  const k = (t, p, l, f = 40) => [t, p, l, f];
  const [b1p, b1l] = BRD(-1.07, 2.4, 1.44, 1.4), [b2p, b2l] = BRD(0, 2.35, 1.5, 1.5), [b3p, b3l] = BRD(1.05, 2.5, 1.42, 1.38), [b4p, b4l] = BRD(-1.07, 2.4, 1.44, 1.4);
  CKS = [[
    k(-1.0, TA, LA, 35), k(0.0, T0, L0, 34), k(K.collares1 - 0.1, [0.17, 0.99, 0.58], [0, 0.835, 0], 34), k(K.macarrones1 + 0.35, [0.42, 1.06, 0.98], [0.06, 0.72, 0], 40),
    k(K.verdad1 + 0.15, [0.36, 1.0, 0.86], [0.05, 0.73, 0], 39), k(K.para2 + 0.35, [-0.34, 1.32, 0.42], [-0.43, 0.55, -0.12], 38), k(K.final2 + 0.3, [-0.36, 1.27, 0.37], [-0.43, 0.55, -0.12], 37),
    k(K.jugar3 + 0.1, [1.2, 1.7, 2.3], [-0.2, 0.55, -0.5], 44), k(K.ninos3 + 0.35, [1.9, 2.05, 3.1], [-0.4, 0.5, -0.9], 46),
    k(K.realidad3 + 0.4, [0.6, 1.75, 0.6], [-0.7, 1.2, -2.5], 44), k(K.aprende3, [-0.75, 1.52, -1.1], [-1.05, 1.46, -RZ], 42), k(K.cerebro3 + 0.15, b1p, b1l, 40), k(K.psicologia4 - 0.2, [-1.08, 1.44, -RZ + 2.25], b1l, 41),
    k(K.psicologia4 + 0.3, [-2.42, 1.12, -0.5], [-2.42, 0.62, -RZ + 0.3], 50), k(K.edad4 + 0.25, [-2.4, 1.1, -0.62], [-2.42, 0.62, -RZ + 0.3], 49),
    k(K.matematicas5 + 0.25, [-2.62, 1.2, -1.32], [-3.9, 0.84, -2.72], 44), k(K.sumar5 - 0.1, [-2.85, 1.12, -1.55], [-3.9, 0.88, -2.74], 42), k(K.contar5 + 0.3, [-2.92, 1.1, -1.62], [-3.9, 0.9, -2.75], 41),
    k(K.lengua6 + 0.3, [-1.45, 0.95, 0.55], [-2.66, 0.16, 0.08], 46), k(K.leer6, [-1.48, 0.78, 0.3], [-2.66, 0.12, 0.04], 46), k(K.letra6b + 0.2, [-1.42, 0.64, -0.1], [-2.55, 0.1, -0.12], 48),
    k(K.dislexia7 + 0.15, [-1.98, 0.84, -0.34], [-2.02, 0.6, -0.95], 42), k(K.tdah7 - 0.25, [-1.96, 0.84, -0.35], [-2.0, 0.6, -0.95], 42), k(K.tdah7 + 0.12, [-1.79, 0.83, -0.36], [-1.8, 0.6, -0.95], 42), k(K.autismo7 - 0.25, [-1.77, 0.83, -0.37], [-1.79, 0.6, -0.95], 42), k(K.autismo7 + 0.12, [-1.6, 0.84, -0.36], [-1.6, 0.61, -0.95], 42),
    k(K.misma7, [-1.5, 1.2, 0.5], [-1.8, 0.6, -0.95], 44), k(K.clase7 + 0.35, [1.3, 2.3, 2.9], [-1.2, 0.55, -1.0], 46),
    k(K.meses8 + 0.1, [2.7, 1.5, 0.6], [4.18, 1.4, -0.12], 44), k(K.practicas8 + 0.2, [2.72, 1.48, 0.66], [4.18, 1.36, -0.02], 44), k(K.colegio8 + 0.25, [2.72, 1.62, 0.1], [4.18, 1.85, 1.3], 46),
    k(K.facil9 + 0.35, [0, 1.42, -RZ + 2.35], [0, 1.32, -RZ], 44), k(K.mitad9, [0.02, 1.4, -RZ + 2.25], [0, 1.31, -RZ], 43), k(K.entrar9 + 0.2, [0.0, 1.4, -RZ + 2.2], [0, 1.31, -RZ], 43),
    k(K.oposicion10 + 0.1, [2.52, 1.24, -1.5], [2.5, 0.84, -2.8], 44), k(K.diecinueve10 + 0.1, [2.6, 1.18, -1.58], [2.6, 0.82, -2.72], 42), k(K.plaza10 + 0.1, [2.6, 1.08, -1.9], [2.6, 0.82, -2.86], 40), k(K.infantil10 + 0.3, [2.6, 1.07, -1.92], [2.6, 0.82, -2.86], 40),
    k(K.sacas11 + 0.1, [0.45, 1.62, -3.05], [0.0, 0.55, 1.0], 50), k(K.anos11 + 0.2, [0.42, 1.6, -3.0], [0.0, 0.55, 1.0], 50), k(K.tu11 + 0.1, [0.36, 1.56, -2.8], [0.0, 0.6, 1.0], 48),
    k(K.macarrones12 + 0.25, [0.36, 1.0, 0.85], [0.1, 0.6, 0.05], 42), k(K.ensartarlos12 + 0.15, [0.05, 0.75, 0.62], [0.17, 0.565, 0.2], 36), k(K.pinza12, [0.07, 0.71, 0.54], [0.18, 0.562, 0.2], 34), k(K.usara12 - 0.22, [0.08, 0.7, 0.52], [0.18, 0.562, 0.2], 34),
    k(K.usara12, [0.24, 0.88, 0.25], [0.11, 0.56, -0.14], 38), k(K.escribir12 + 0.6, [0.2, 0.84, 0.18], [0.1, 0.56, -0.15], 36),
    k(K.alterna13 + 0.2, [0.44, 0.82, 0.64], [0.03, 0.56, 0.2], 44), k(K.serie13 + 0.2, [0.4, 0.8, 0.6], [0.02, 0.56, 0.2], 44), k(K.cuatro13, [0.42, 0.84, 0.66], [0.02, 0.565, 0.2], 45), k(K.predice13 - 0.05, [0.42, 0.86, 0.68], [0.02, 0.57, 0.2], 45),
    k(K.matematicas13 + 0.15, b3p, b3l, 42), k(K.once13 + 0.4, [1.05, 1.42, -RZ + 2.4], b3l, 42),
    k(K.primeros14, b4p, b4l, 42), k(K.segundo14 + 0.2, [-1.07, 1.42, -RZ + 2.1], [-1.07, 1.4, -RZ], 42),
    k(K.magisterio15, [0.34, 1.02, 0.88], [0.04, 0.78, 0], 40), k(K.collares15, [0.24, 0.94, 0.6], [0, 0.83, 0], 39), k(K.sabiendo15, [0.18, 0.92, 0.47], [0, 0.835, 0], 38),
    k(K.facil16, [0.2, 0.93, 0.48], [0, 0.835, 0], 39),
    k(END - 1.0, TA, LA, 35), k(END, T0, L0, 34), k(END + 0.5, [0.19, 1.01, 0.62], [0, 0.835, 0], 34),
  ]];
  // con otra voz, dos claves podrían quedar en el mismo instante o al revés: se fuerzan siempre crecientes
  const ks = CKS[0]; for (let i = 1; i < ks.length; i++) if (ks[i][0] <= ks[i - 1][0] + 0.04) ks[i][0] = ks[i - 1][0] + 0.04;
}
function camAt(t) { return camKeys(t, CKS[0]); }
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return t; return t - dt; }
// destellos en los momentos clave
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[K.verdad1, 0.08], [K.cerebro3, 0.05], [K.suspendio9, 0.05], [K.plaza10, 0.05], [K.tu11, 0.07], [K.millon14, 0.08], [K.sabiendo15, 0.07]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt() { return 0; }
// ---------------------------------------------------------------- un instante de la escena
function stageAt(t, st) { NOW = t; propsAt(t); boardAt(t); rigAt(st.l, st.p); }
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
  hudAt(t); drawFrame(t);
  return true;
};
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : 0.6; frame(t);
  if (window.COVER_CAM) { const C = window.COVER_CAM; cam.fov = C[6]; cam.updateProjectionMatrix(); cam.position.set(C[0], C[1], C[2]); cam.up.set(0, 1, 0); cam.lookAt(C[3], C[4], C[5]); cam.updateMatrixWorld(); rigAt(v3(C[3], C[4], C[5]), cam.position); }
  const VP = vpOf(); flowUpdate(t, VP, VP); fxUpdate(t, VP, VP);
  post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); post.uniforms.flash.value = 0; post.uniforms.white.value = 0;
  hudBegin(); drawFrame(t);
  return true;
};
// ---------------------------------------------------------------- HUD: cabecera con la pregunta pendiente (¿para qué sirven?), cifras grandes y rótulos
function buildHudPlan() {}
const HG = '#FFC24A';
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  const tk = clamp((t - K.magisterio1 + 0.1) / 0.6);
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('MAGISTERIO', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('EL GRADO, POR DENTRO', tk), 56, 182);
  hg.globalAlpha = tk; hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('GRADO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('240 ECTS', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('4 AÑOS', 1024, 178);
  const mk = win(t, K.final2 - 0.1, 0.3) * (1 - win(t, K.mandaselo16 + 0.4, 0.4));
  if (mk > 0.01) {
    let txt = 'PARA QUÉ SIRVEN · ???', col = HC.red, blink = true;
    if (t > K.pinza12) { txt = 'PINZA → ESCRITURA'; col = HC.green; blink = false; }
    if (t > K.serie13) { txt = 'SERIES → MATEMÁTICAS'; col = HC.green; blink = false; }
    if (t > K.conexiones14) { txt = '+1 MILLÓN DE CONEXIONES/S'; col = HC.green; blink = false; }
    if (t > K.sabiendo15) { txt = 'SABIENDO POR QUÉ'; col = HG; blink = false; }
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
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));        // ventana de un rótulo
const wp = (o, x = 0, y = 0, z = 0) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
function strike(x0, x1, y, k, col = HC.red) { if (k <= 0.01) return; hg.save(); hg.strokeStyle = col; hg.lineWidth = 7; hg.shadowColor = col; hg.shadowBlur = 14; hg.beginPath(); hg.moveTo(x0, y); hg.lineTo(x0 + (x1 - x0) * eo(k), y); hg.stroke(); hg.restore(); }
function pinchIcon(P, k) {          // pulgar e índice (líneas técnicas) que se cierran sobre el macarrón
  if (k <= 0.01 || !P || !P.ok) return;
  const c = eo(clamp(k)), gap = lerp(70, 14, c), sd = P.x > W / 2 ? -1 : 1;
  hg.save(); hg.globalAlpha = clamp(k * 2); glowStroke(HC.white, 3, 10); hg.lineCap = 'round'; hg.lineJoin = 'round';
  for (const s of [-1, 1]) { hg.save(); hg.translate(P.x + sd * 40, P.y + s * gap); hg.scale(sd, 1); hg.rotate(s * 0.35); hg.beginPath(); hg.moveTo(0, -18); hg.lineTo(170, -22); hg.arcTo(195, 0, 170, 22, 22); hg.lineTo(0, 18); hg.arc(0, 0, 18, Math.PI / 2, Math.PI * 1.5); hg.stroke();
    hg.globalAlpha *= 0.6; hg.beginPath(); hg.moveTo(18, -8); hg.lineTo(42, -8); hg.moveTo(18, 8); hg.lineTo(42, 8); hg.stroke(); hg.restore(); }
  noGlow(); hg.setLineDash([6, 8]); hg.strokeStyle = HG; hg.lineWidth = 2; hg.beginPath(); hg.moveTo(P.x + sd * 20, P.y - gap - 30); hg.lineTo(P.x + sd * 20, P.y + gap + 30); hg.stroke(); hg.setLineDash([]);
  hg.restore();
}
function plane(x, y, s, k) {           // avión de papel (mándaselo)
  if (k <= 0.01) return; const e = eo(clamp(k)); hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(x + (1 - e) * -120, y + (1 - e) * 60); hg.scale(s, s); hg.rotate(-0.25);
  hg.fillStyle = HG; hg.shadowColor = HG; hg.shadowBlur = 22; hg.beginPath(); hg.moveTo(-70, 0); hg.lineTo(80, -40); hg.lineTo(-10, 18); hg.closePath(); hg.fill();
  hg.fillStyle = '#b58425'; hg.beginPath(); hg.moveTo(-10, 18); hg.lineTo(80, -40); hg.lineTo(5, 45); hg.closePath(); hg.fill(); hg.restore();
}
function hudAt(t) {
  hudBegin(); hdr(t);
  const P = S.props, Y = 1450;
  // L1: el collar · «es verdad»
  lab(NK_C.clone().add(v3(0.09, 0.02, 0)), 'COLLAR DE MACARRONES', null, cw(t, K.collares1 - 0.05, K.y1), { dx: 120, dy: -150 });
  { const k = cw(t, K.verdad1 - 0.05, K.para2 + 0.15); if (k > 0.01) stamp('ES VERDAD', W / 2, 1380, k, HG, 92); }
  // L3: jugar ✗ → cómo aprende un cerebro
  { const k = cw(t, K.jugar3 - 0.05, K.cerebro3 + 0.6); if (k > 0.01) { bigText('JUGAR', W / 2, Y, 76, HC.white, k, { a: 1 - 0.55 * win(t, K.realidad3, 0.3), dark: 26 }); strike(W / 2 - 170, W / 2 + 170, Y, win(t, K.realidad3 - 0.05, 0.3));
      const a = cw(t, K.aprende3 - 0.1, K.cerebro3 + 0.6); bigText('CÓMO APRENDE', W / 2, Y + 100, 60, HG, a, { glow: 18, dark: 26 }); bigText('UN CEREBRO', W / 2, Y + 170, 60, HG, cw(t, K.cerebro3 - 0.1, K.cerebro3 + 0.6), { glow: 18, dark: 26 }); } }
  // L4: tallímetro y edades
  lab(wp(S.room.tall, 0.17, 0.55, 0), 'PSICOLOGÍA', 'DEL DESARROLLO', cw(t, K.psicologia4 + 0.05, K.aprender4 + 0.1), { dx: 120, dy: -170 });
  { const ts = [K.aprender4, K.nino4, K.edad4], nm = [['1 AÑO', 'PRIMEROS PASOS'], ['3 AÑOS', 'FRASES'], ['6 AÑOS', 'EMPIEZA A LEER']];
    P.kidsH.forEach((kd, i) => lab(wp(kd, 0, 0.93, 0), nm[i][0], nm[i][1], cw(t, ts[i], K.matematicas5 - 0.2), { dx: i === 1 ? -120 : 120, dy: -110 - i * 60, color: i === 2 ? HG : HC.white, size: 24, subSize: 18 })); }
  // L5: el ábaco · 2 + 3 · contar
  lab(wp(P.ab, 0, 0.62, 0), 'MATEMÁTICAS', null, cw(t, K.matematicas5 + 0.05, K.sumar5 - 0.1), { dx: -120, dy: -150 });
  { const k = cw(t, K.sumar5 - 0.05, K.lengua6 - 0.2); if (k > 0.01) { bigText('2 + 3', W / 2 - 60, Y, 110, HC.white, k, { type: false, dark: 30 }); bigText('= 5', W / 2 + 200, Y, 110, HG, cw(t, K.sumar5 + 0.5, K.lengua6 - 0.2), { glow: 20, type: false, dark: 30 }); } }
  { const k = cw(t, K.contar5 - 0.1, K.lengua6 - 0.2); if (k > 0.01) for (let i = 0; i < 5; i++) { const x = P.abW / 2 - 0.045 - (4 - i) * 0.05, Q = proj(wp(P.ab, x, P.abY[4] + 0.075, 0)); if (Q.ok) bigText(String(i + 1), Q.x, Q.y, 54, HG, clamp((t - K.contar5 + 0.1 - i * 0.07) / 0.2) * k, { type: false, glow: 14, dark: 18 }); } }
  // L6: lengua · leer · letra a letra
  lab(v3(-3.88, 0.85, 0.25), 'LENGUA', null, cw(t, K.lengua6 + 0.05, K.leer6), { dx: 120, dy: -170 });
  lab(wp(P.book, 0, 0.02, 0), 'LEER', null, cw(t, K.leer6 - 0.05, K.letra6), { dx: -120, dy: -150 });
  lab(wp(P.letters[0], 0, 0.15, 0), 'LETRA A LETRA', null, cw(t, K.letra6 + 0.1, K.dislexia7 - 0.2), { dx: 110, dy: -150, color: HG });
  // L7: tres sitios de la misma mesa
  { const nm = ['DISLEXIA', 'TDAH', 'AUTISMO'], ts = [K.dislexia7, K.tdah7, K.autismo7];
    P.icons.forEach((o, i) => lab(wp(o, 0, i === 1 ? 0.12 : 0.07, 0), nm[i], null, cw(t, ts[i] + 0.05, K.meses8 - 0.25), { dx: i === 0 ? -110 : 110, dy: -120 - i * 50, color: i === 2 ? HG : HC.white }));
    const k = cw(t, K.misma7 - 0.05, K.meses8 - 0.2); if (k > 0.01) bigText('EN LA MISMA CLASE', W / 2, Y + 40, 56, HC.white, k, { dark: 26 }); }
  // L8: calendario · prácticas · colegio
  lab(wp(P.cal, 0, 0.22, 0.01), 'MESES', 'DE PRÁCTICAS', cw(t, K.meses8 + 0.05, K.facil9 - 0.15), { dx: -110, dy: -150 });
  lab(wp(P.badge, -0.02, -0.3, 0), 'PRÁCTICUM', '50 ECTS CON EL TFG', cw(t, K.practicas8 + 0.05, K.facil9 - 0.15), { dx: -120, dy: 70, color: HG });
  lab(wp(S.room.ceip, 0, 0, 0), 'COLEGIO', null, cw(t, K.colegio8, K.facil9 - 0.1), { dx: -120, dy: -90 });
  // L9: Cataluña: casi la mitad suspende el examen de acceso
  { const k = cw(t, K.mitad9 - 0.05, K.oposicion10 - 0.3); if (k > 0.01) { bigText('45,5 %', W / 2, Y, 130, HC.red, k, { glow: 24, type: false, dark: 34 });
      bigText('SUSPENDIÓ EL EXAMEN DE ACCESO', W / 2, Y + 100, 30, HC.white, cw(t, K.suspendio9, K.oposicion10 - 0.3), { dark: 22 });
      bigText('PAP 2026 · 2.346 DE 5.155', W / 2, Y + 150, 22, HC.grey, cw(t, K.examen9, K.oposicion10 - 0.3), { dark: 18 }); } }
  // L10: oposición en Canarias: 19 por plaza
  lab(wp(P.temario, 0, 0.3, 0), 'OPOSICIÓN', null, cw(t, K.oposicion10 + 0.05, K.diecinueve10 - 0.1), { dx: -120, dy: -150 });
  { const k = cw(t, K.canarias10, K.sacas11 - 0.2); if (k > 0.01) bigText('CANARIAS · 2026', W / 2, Y + 168, 24, HC.grey, k, { dark: 18 }); }
  { const k = cw(t, K.diecinueve10 - 0.1, K.sacas11 - 0.2); if (k > 0.01) { const n = Math.max(1, Math.min(19, Math.ceil((t - K.diecinueve10 + 0.12) / 0.03))); bigText(String(n), W / 2, Y - 40, 140, HC.white, k, { type: false, dark: 34 });
      bigText('POR PLAZA', W / 2, Y + 62, 52, HG, cw(t, K.plaza10 - 0.08, K.sacas11 - 0.2), { type: false, glow: 18, dark: 22 });
      bigText('EN INFANTIL', W / 2, Y + 118, 30, HC.white, cw(t, K.infantil10 - 0.05, K.sacas11 - 0.2), { dark: 18 }); } }
  lab(wp(P.goldChair, 0, 0.06, 0), '1 PLAZA', null, cw(t, K.plaza10, K.sacas11 - 0.2), { dx: 100, dy: -140, color: HG });
  // L11: hasta 25 niños de 3 años… y tú
  { const k = cw(t, K.veinticinco11 - 0.1, K.y12); if (k > 0.01) { const n = Math.max(1, Math.min(25, Math.ceil((t - K.veinticinco11 + 0.1) / 0.02))); bigText(String(n), W / 2, Y - 20, 150, HC.white, k * (1 - 0.6 * win(t, K.y11b, 0.2)), { type: false, dark: 34 });
      bigText('NIÑOS DE 3 AÑOS', W / 2, Y + 90, 36, HC.white, cw(t, K.tres11 - 0.05, K.y12) * (1 - 0.6 * win(t, K.y11b, 0.2)), { dark: 22 }); } }
  { const k = cw(t, K.y11b - 0.05, K.y12 + 0.1); if (k > 0.01) { bigText('Y TÚ', W / 2, 1180, 120, HG, k, { glow: 26, type: false, dark: 30 }); brackets({ x: W / 2, y: 1000 }, 900, 1200, k, HG, 3); } }
  // L12: ensartar · la pinza · escribir
  lab(v3(SER_X(0), LACE_Y + 0.008, LACE_Z), 'ENSARTAR', null, cw(t, K.ensartarlos12 + 0.1, K.pinza12 - 0.05), { dx: -120, dy: -170 });
  { const k = cw(t, K.pinza12 - 0.1, K.usara12 - 0.05), Q = proj(v3(SER_X(0) + 0.02, LACE_Y + 0.01, LACE_Z)); pinchIcon(Q, k); if (k > 0.01 && Q.ok) lab(Q, 'PINZA', 'PULGAR + ÍNDICE', k, { dx: -120, dy: -200, color: HG }); }
  if (P.pencil.visible) lab(wp(P.pencil, 0, 0.12, 0), 'ESCRITURA', null, cw(t, K.escribir12 - 0.05, K.si13 + 0.2), { dx: 120, dy: -160, color: HG });
  // L13: la serie · el estudio · 4 → 11 años
  { const k = cw(t, K.blanco13 - 0.05, K.predice13); if (k > 0.01) { const A = proj(v3(SER_X(0), LACE_Y, LACE_Z)), B2 = proj(v3(SER_X(1), LACE_Y, LACE_Z));
      if (A.ok) bigText('B', A.x, A.y - 90, 46, HC.white, cw(t, K.blanco13 - 0.05, K.predice13), { type: false, dark: 16 }); if (B2.ok) bigText('N', B2.x, B2.y - 90, 46, HC.white, cw(t, K.negro13 - 0.05, K.predice13), { type: false, dark: 16 });
      const s = cw(t, K.serie13 - 0.1, K.segun13); if (s > 0.01) { const C = proj(v3((SER_X(0) + SER_X(SER_N - 1)) / 2, LACE_Y, LACE_Z)); if (C.ok) { brackets(C, 720, 170, s, HG, 3); bigText('PRIMERA SERIE', W / 2, Y + 20, 56, HG, s, { glow: 18, dark: 26 }); } } } }
  { const k = cw(t, K.segun13 - 0.05, K.predice13 + 0.3); if (k > 0.01) { bigText('ESTUDIO: 517 NIÑOS, DE 4 A 11 AÑOS', W / 2, Y + 110, 26, HC.white, k, { dark: 20 }); bigText('RITTLE-JOHNSON Y OTROS (2017)', W / 2, Y + 152, 20, HC.grey, k, { dark: 16 }); } }
  { const k = cw(t, K.cuatro13 - 0.05, K.primeros14 - 0.2); if (k > 0.01) { bigText('4 AÑOS', W / 2 - 200, Y - 120, 60, HC.white, k, { type: false, dark: 26 }); const a = cw(t, K.predice13, K.primeros14 - 0.2);
      if (a > 0.01) { hg.save(); hg.globalAlpha = a; hg.strokeStyle = HG; hg.fillStyle = HG; hg.lineWidth = 6; hg.shadowColor = HG; hg.shadowBlur = 14; const x0 = W / 2 - 60, x1 = x0 + 160 * eo(clamp((t - K.predice13) / 0.4)); hg.beginPath(); hg.moveTo(x0, Y - 120); hg.lineTo(x1, Y - 120); hg.stroke(); hg.beginPath(); hg.moveTo(x1 + 18, Y - 120); hg.lineTo(x1 - 6, Y - 134); hg.lineTo(x1 - 6, Y - 106); hg.closePath(); hg.fill(); hg.restore(); }
      bigText('11 AÑOS', W / 2 + 250, Y - 120, 60, HG, cw(t, K.once13 - 0.05, K.primeros14 - 0.2), { type: false, glow: 18, dark: 26 }); } }
  // L14: un millón de conexiones por segundo
  { const k = cw(t, K.crea14 - 0.05, K.asi15); if (k > 0.01) { const u = clamp((t - K.crea14) / (K.millon14 + 0.2 - K.crea14)), n = Math.round(1e6 * (Math.exp(5 * u) - 1) / (Math.exp(5) - 1));
      bigText('+' + n.toLocaleString('es-ES'), W / 2, Y, 120, HG, k, { glow: 26, type: false, dark: 34 }); bigText('CONEXIONES POR SEGUNDO', W / 2, Y + 96, 34, HC.white, cw(t, K.conexiones14 - 0.05, K.asi15), { dark: 22 });
      bigText('CENTER ON THE DEVELOPING CHILD · HARVARD', W / 2, Y + 146, 19, HC.grey, cw(t, K.segundo14 - 0.1, K.asi15), { dark: 16 }); } }
  // L15: así que sí… pero sabiendo por qué
  { const k = cw(t, K.si15 - 0.05, K.magisterio15 + 0.4); if (k > 0.01) stamp('SÍ', W / 2, 1380, k, HG, 120); }
  { const k = cw(t, K.pero15 - 0.05, K.mandaselo16 - 0.1); if (k > 0.01) { bigText('…PERO SABIENDO', W / 2, Y, 62, HC.white, k, { dark: 26 }); bigText('POR QUÉ', W / 2, Y + 90, 92, HG, cw(t, K.sabiendo15 + 0.1, K.mandaselo16 - 0.1), { glow: 24, type: false, dark: 30 }); } }
  // L16: mándaselo · ¿Infantil o Primaria?
  { const k = cw(t, K.mandaselo16 - 0.05, K.infantil16 - 0.1); if (k > 0.01) { plane(W / 2 - 230, Y - 10, 0.9, k); bigText('MÁNDASELO', W / 2 + 70, Y, 70, HC.white, k, { dark: 26 }); bigText('A QUIEN DIJO QUE ERA FÁCIL', W / 2, Y + 86, 30, HG, cw(t, K.dijo16, K.infantil16 - 0.1), { dark: 20 }); } }
  { const d = cw(t, K.infantil16 - 0.1, END - 0.5); if (d > 0.01) { bigText('¿INFANTIL', W / 2, Y - 20, 84, HC.white, d, { glow: 14, type: false, dark: 28 }); bigText('O PRIMARIA?', W / 2, Y + 80, 84, HG, cw(t, K.primaria16 - 0.1, END - 0.5), { glow: 18, type: false, dark: 28 }); } }
}
// ---------------------------------------------------------------- arranque: letras, tiempos de la voz, el aula, la pizarra, los objetos y la cámara
(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '700' }), new FontFace('SpaceMono', `url(${F}SpaceMono-Regular.ttf)`, { weight: '400' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '800' }), new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' }),
    new FontFace('Cormorant', `url(${F}CormorantGaramond-300-italic.ttf)`, { style: 'italic', weight: '500' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const font3d = await new FontLoader().loadAsync('./node_modules/three/examples/fonts/helvetiker_bold.typeface.json');
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    magisterio1: atL(1, 'magisterio'), carrera1: atL(1, 'carrera'), collares1: atL(1, 'collares'), macarrones1: atL(1, 'macarrones'), y1: atL(1, '=y'), verdad1: atL(1, 'verdad'),
    para2: atL(2, 'para'), sirven2: atL(2, 'sirven'), final2: atL(2, 'final'),
    crees3: atL(3, 'crees'), jugar3: atL(3, 'jugar'), ninos3: atL(3, 'ninos'), realidad3: atL(3, 'realidad'), aprender3: atL(3, 'aprender'), aprende3: atL(3, '=aprende'), cerebro3: atL(3, 'cerebro'),
    psicologia4: atL(4, 'psicologia'), aprender4: atL(4, 'aprender'), nino4: atL(4, 'nino'), edad4: atL(4, 'edad'),
    matematicas5: atL(5, 'matematicas'), sumar5: atL(5, 'sumar'), contar5: atL(5, 'contar'),
    lengua6: atL(6, 'lengua'), ensenar6: atL(6, 'ensenar'), leer6: atL(6, 'leer'), letra6: atL(6, '=letra'), letra6b: atL(6, '=letra', 2),
    dislexia7: atL(7, 'dislexia'), tdah7: atL(7, 'tdah'), autismo7: atL(7, 'autismo'), misma7: atL(7, 'misma'), clase7: atL(7, 'clase'),
    meses8: atL(8, 'meses'), practicas8: atL(8, 'practicas'), colegio8: atL(8, 'colegio'),
    facil9: atL(9, 'facil'), cataluna9: atL(9, 'cataluna'), este9: atL(9, 'este'), casi9: atL(9, 'casi'), mitad9: atL(9, 'mitad'), suspendio9: atL(9, 'suspendio'), examen9: atL(9, 'examen'), entrar9: atL(9, 'entrar'),
    oposicion10: atL(10, 'oposicion'), canarias10: atL(10, 'canarias'), diecinueve10: atL(10, 'diecinueve'), plaza10: atL(10, 'plaza'), infantil10: atL(10, 'infantil'),
    sacas11: atL(11, 'sacas'), veinticinco11: atL(11, 'veinticinco'), tres11: atL(11, 'tres'), anos11: atL(11, 'anos'), y11b: atL(11, '=y', 2), tu11: atL(11, '=tu'),
    y12: atL(12, '=y'), macarrones12: atL(12, 'macarrones'), ensartarlos12: atL(12, 'ensartarlos'), pinza12: atL(12, 'pinza'), usara12: atL(12, 'usara'), escribir12: atL(12, 'escribir'),
    si13: atL(13, '=si'), alterna13: atL(13, 'alterna'), blanco13: atL(13, 'blanco'), negro13: atL(13, 'negro'), serie13: atL(13, 'serie'), segun13: atL(13, 'segun'), cuatro13: atL(13, 'cuatro'), predice13: atL(13, 'predice'), matematicas13: atL(13, 'matematicas'), once13: atL(13, 'once'),
    primeros14: atL(14, 'primeros'), cerebro14: atL(14, 'cerebro'), crea14: atL(14, 'crea'), millon14: atL(14, 'millon'), conexiones14: atL(14, 'conexiones'), segundo14: atL(14, 'segundo'),
    asi15: atL(15, 'asi'), si15: atL(15, '=si'), magisterio15: atL(15, 'magisterio'), collares15: atL(15, 'collares'), pero15: atL(15, 'pero'), sabiendo15: atL(15, 'sabiendo'),
    mandaselo16: atL(16, 'mandaselo'), dijo16: atL(16, 'dijo'), facil16: atL(16, 'facil'), infantil16: atL(16, 'infantil'), primaria16: atL(16, 'primaria'),
  };
  mats(); buildMats(); buildLights(); buildRoom(); buildFlow(); buildBoard(); buildProps(font3d);
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.22; }
  scene.fog = new THREE.FogExp2(0x0d0c0b, 0.055);
  post.uniforms.ca.value = 0.4; post.uniforms.vig.value = 0.42;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
