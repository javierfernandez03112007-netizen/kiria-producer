// «Economía por dentro»: todo pasa en el parqué de una bolsa (panel de cotizaciones, mesas con pantallas, columnas y relojes).
// Una montaña dorada (la bolsa, +58 %) con 100 figuritas de gestores abre y cierra el vídeo (bucle). window.renderAt(t) dibuja el instante t.
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
// ---------------------------------------------------------------- «Economía por dentro»: materiales y piezas del parqué de la bolsa.
// Escala real en metros. La sala va de x −7 a 7 y de z −6 a 6 (7 m de alto); el panel de cotizaciones está en la pared del fondo (z −6).
const M = {};
const RX = 7, RZ = 6, RH = 7, DESK_Y = 0.76, PLAT_Y = 0.85;
function repTex(t, rx, ry) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
function marbleTex(base, vein, seed = 3, n = 26, px = 1024) {
  return canvasTex(px, px, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      let x = hash(i * 4.1 + seed) * w, y = hash(i * 8.7 + seed) * h, ang = hash(i * 2.9) * 6.28;
      g.strokeStyle = vein; g.globalAlpha = 0.08 + hash(i * 6.3) * 0.25; g.lineWidth = 0.5 + hash(i * 3.7) * 2.5; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 90; k++) { ang += (hash(i * 31 + k * 1.3) - 0.5) * 0.7; x += Math.cos(ang) * 11; y += Math.sin(ang) * 11; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}
function woodTex(base, dark, light, seed = 1) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 240; i++) {
      const y0 = hash(i * 3.3 + seed) * h, a = 0.05 + hash(i * 7.1 + seed) * 0.2, amp = 2 + hash(i * 1.7) * 8, f = 0.004 + hash(i * 5.5) * 0.012;
      g.strokeStyle = hash(i * 2.2 + seed) > 0.45 ? dark : light; g.globalAlpha = a; g.lineWidth = 0.6 + hash(i * 9.9) * 2.2; g.beginPath();
      for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + i) * amp + Math.sin(x * f * 3.1 + i * 2) * amp * 0.3; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}
function buildMats() {
  M.floor = new THREE.MeshPhysicalMaterial({ map: repTex(marbleTex('#15130f', '#4a4237', 5, 30), 5, 5), roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.08 });
  M.marbleW = new THREE.MeshPhysicalMaterial({ map: repTex(marbleTex('#d8d2c6', '#9c9385', 9, 18, 512), 1, 2), roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.15 });
  M.marbleK = new THREE.MeshPhysicalMaterial({ map: repTex(marbleTex('#121214', '#3c3a3a', 11, 22, 512), 1, 1), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06 });
  M.wall = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.85 });
  M.wallL = new THREE.MeshStandardMaterial({ color: 0x3a3631, roughness: 0.8 });
  M.wood = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#3b2414', '#1f1209', '#5a3a22', 2), 1, 1), roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  M.gold = metal(0xffcf6e, 0.18); M.goldD = metal(0xc79a45, 0.3); M.steel = metal(0xd3d8e0, 0.2); M.dsteel = metal(0x6f7680, 0.35); M.silver = metal(0xe8ebef, 0.1);
  M.goldChart = new THREE.MeshPhysicalMaterial({ color: 0xffc95a, metalness: 1, roughness: 0.16, clearcoat: 0.6, emissive: 0x3a2400, emissiveIntensity: 0.35 });
  M.black = new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.4, metalness: 0.3 });
  M.suit = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.4, clearcoat: 0.4 });       // figuritas (color por instancia)
  M.paper = new THREE.MeshStandardMaterial({ color: 0xf2eee3, roughness: 0.9 });
  M.whiteP = new THREE.MeshPhysicalMaterial({ color: 0xeeece6, roughness: 0.35, clearcoat: 0.6 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe0ea, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  M.coin = metal(0xf2c25b, 0.22);
}
const mesh = (geo, m, cs = true) => { const o = new THREE.Mesh(geo, m); o.castShadow = cs; o.receiveShadow = true; return o; };
const grp = (...ch) => { const g = new THREE.Group(); for (const c of ch) g.add(c); return g; };
const at = (o, x, y, z, ry = 0, rx = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
const strip = g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; };
const mergeAll = gs => mergeGeometries(gs.map(g => strip(g.index ? g.toNonIndexed() : g)));
function cpuTex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { c, g }; return t; }
function plateText(w, h, lines, { fg = '#111', bg = '#f4f1ea', font = 'Inter', weight = 800, px = 512, border = false } = {}) {
  const t = canvasTex(px, Math.round(px * h / w), (g, W2, H2) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W2, H2); }
    if (border) { g.strokeStyle = fg; g.lineWidth = W2 * 0.02; g.strokeRect(W2 * 0.05, H2 * 0.06, W2 * 0.9, H2 * 0.88); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(([s, size, yy, col]) => { g.font = `${weight} ${size * H2}px ${font}`; g.fillStyle = col || fg; g.fillText(s, W2 / 2, yy * H2, W2 * 0.92); });
  });
  return mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, transparent: !bg, polygonOffset: true, polygonOffsetFactor: -2 }), false);
}
// figurita de gestor (muñeco con traje): cuerpo + cabeza, 1 de alto (se escala)
function figGeo() {
  const body = new THREE.CapsuleGeometry(0.11, 0.42, 8, 18); body.translate(0, 0.32, 0);
  const head = new THREE.SphereGeometry(0.1, 24, 16); head.translate(0, 0.76, 0);
  const bag = new THREE.BoxGeometry(0.12, 0.09, 0.035); bag.translate(0.17, 0.14, 0);
  return mergeAll([body, head, bag]);
}
function deskGeo(w = 1.6, d = 0.8) {        // mesa de operador: tablero y dos laterales
  const top = new THREE.BoxGeometry(w, 0.05, d); top.translate(0, DESK_Y - 0.025, 0);
  const s1 = new THREE.BoxGeometry(0.05, DESK_Y - 0.05, d - 0.06); s1.translate(-w / 2 + 0.05, (DESK_Y - 0.05) / 2, 0);
  const s2 = s1.clone(); s2.translate(w - 0.1, 0, 0);
  const back = new THREE.BoxGeometry(w - 0.1, 0.4, 0.03); back.translate(0, DESK_Y - 0.3, -d / 2 + 0.05);
  return mergeAll([top, s1, s2, back]);
}
function monitor(tex, w = 0.56, h = 0.34) {     // pantalla con soporte; la imagen es un lienzo (emite luz)
  const g = new THREE.Group();
  const frame = rbox(w + 0.03, h + 0.03, 0.03, M.black, 0.01); frame.position.y = 0.2 + h / 2; g.add(frame);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1, 1, 1).multiplyScalar(0.9) }));
  scr.position.set(0, 0.2 + h / 2, 0.017); g.add(scr); g.userData.scr = scr;
  const st = cyl(0.015, 0.015, 0.2, M.dsteel, 10); st.position.y = 0.1; g.add(st);
  const ft = cyl(0.09, 0.1, 0.012, M.dsteel, 24); ft.position.y = 0.006; g.add(ft);
  return g;
}
function houseModel() {
  const g = new THREE.Group();
  const body = rbox(0.34, 0.24, 0.3, M.whiteP, 0.012); body.position.y = 0.12; g.add(body);
  const roofS = new THREE.Shape(); roofS.moveTo(-0.2, 0); roofS.lineTo(0, 0.16); roofS.lineTo(0.2, 0); roofS.closePath();
  const roof = mesh(new THREE.ExtrudeGeometry(roofS, { depth: 0.34, bevelEnabled: false }), M.black); roof.position.set(0, 0.24, -0.17); g.add(roof);
  const door = mesh(new THREE.BoxGeometry(0.07, 0.12, 0.01), M.wood); door.position.set(0, 0.06, 0.151); g.add(door);
  for (const x of [-0.1, 0.1]) { const w = mesh(new THREE.BoxGeometry(0.06, 0.06, 0.01), M.black); w.position.set(x, 0.15, 0.151); g.add(w); }
  return g;
}
function towerModel(h = 1.0) {        // torre de oficinas de cristal (maqueta) con planta a planta
  const g = new THREE.Group(), n = 14;
  const tex = canvasTex(128, 512, (c, w, hh) => { c.fillStyle = '#0d1218'; c.fillRect(0, 0, w, hh); for (let y = 6; y < hh; y += 18) for (let x = 6; x < w; x += 16) { c.fillStyle = hash(x * 3.1 + y * 7.7) > 0.55 ? '#ffd88a' : '#1d2732'; c.fillRect(x, y, 10, 11); } });
  const body = mesh(new THREE.BoxGeometry(0.3, h, 0.3), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.4 }));
  body.position.y = h / 2; g.add(body); g.userData.body = body; g.userData.h = h; g.userData.n = n;
  const cap = mesh(new THREE.BoxGeometry(0.32, 0.03, 0.32), M.steel); cap.position.y = h + 0.015; g.add(cap); g.userData.cap = cap;
  return g;
}
function medal(m = M.gold) {
  const g = new THREE.Group();
  const d = cyl(0.11, 0.11, 0.014, m, 64); d.rotation.x = Math.PI / 2; g.add(d);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 10, 64), m); g.add(rim);
  const prof = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), m); prof.scale.set(0.8, 1, 0.25); prof.position.set(0, 0.01, 0.009); g.add(prof);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.004, 6, 48), m); ring.position.z = 0.008; g.add(ring);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function coinGeo() { const c = new THREE.CylinderGeometry(0.03, 0.03, 0.006, 40); const r = new THREE.TorusGeometry(0.029, 0.0018, 6, 40); r.rotateX(Math.PI / 2); return mergeAll([c, r]); }
// ---------------------------------------------------------------- la sala: suelo de mármol negro pulido, paredes con columnas de mármol claro y arcos,
// lucernario en el techo, el gran panel de cotizaciones al fondo (con una cinta de valores debajo), relojes de cuatro bolsas, filas de mesas
// de operadores con pantallas, y en el centro un pedestal negro con la montaña dorada (la bolsa).
const DESKS_L = [[-4.6, 3.3], [-4.6, 1.3], [-4.6, -0.7], [-4.6, -2.7]], DESKS_R = [[4.6, 3.3], [4.6, 1.3], [4.6, -0.7], [4.6, -2.7]];
const ST3 = v3(-2.4, 0, 2.3), ST4 = v3(-2.4, 0, 0.3), ST5 = v3(-2.4, 0, -1.7), ST8 = v3(2.5, 0, -2.0), ST9 = v3(2.5, 0, 0.1), ST11 = v3(2.4, 0, 2.3);
const BOARD = { w: 10, h: 3.125, y: 4.25, z: -RZ + 0.06 };
function wallBox(x, y, z, w, h, d, m = M.wall) { const b = mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); scene.add(b); return b; }
function buildRoom() {
  const R = S.room = {};
  const fl = mesh(new THREE.PlaneGeometry(2 * RX, 2 * RZ), M.floor, false); fl.rotation.x = -Math.PI / 2; scene.add(fl);
  // paredes y columnas (mármol claro) con arcos oscuros entre ellas
  wallBox(0, RH / 2, -RZ - 0.1, 2 * RX, RH, 0.2); wallBox(0, RH / 2, RZ + 0.1, 2 * RX, RH, 0.2);
  for (const s of [-1, 1]) { wallBox(s * (RX + 0.1), RH / 2, 0, 0.2, RH, 2 * RZ);
    for (let i = 0; i < 6; i++) { const z = -RZ + 1 + i * 2;
      const c = mesh(new THREE.CylinderGeometry(0.28, 0.32, RH - 0.9, 32), M.marbleW); c.position.set(s * (RX - 0.35), (RH - 0.9) / 2 + 0.3, z); scene.add(c);
      const b = mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8), M.marbleW); b.position.set(s * (RX - 0.35), 0.15, z); scene.add(b);
      const k = mesh(new THREE.BoxGeometry(0.8, 0.25, 0.8), M.goldD); k.position.set(s * (RX - 0.35), RH - 0.48, z); scene.add(k);
      if (i < 5) { const a = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 4.2), new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.6 })); a.position.set(s * (RX - 0.02), 2.6, z + 1); a.rotation.y = -s * Math.PI / 2; scene.add(a);
        const arc = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 32, Math.PI), M.marbleW); arc.position.set(s * (RX - 0.05), 4.7, z + 1); arc.rotation.y = -s * Math.PI / 2; scene.add(arc); } } }
  const cornice = mesh(new THREE.BoxGeometry(2 * RX, 0.35, 0.35), M.goldD); cornice.position.set(0, RH - 0.2, -RZ + 0.1); scene.add(cornice);
  // techo con lucernario (paneles que dan una luz fría muy suave)
  const ce = mesh(new THREE.PlaneGeometry(2 * RX, 2 * RZ), M.wallL, false); ce.rotation.x = Math.PI / 2; ce.position.y = RH; scene.add(ce);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.82, 0.95).multiplyScalar(0.9), toneMapped: false }));
    p.rotation.x = Math.PI / 2; p.position.set(-4.2 + i * 2.8, RH - 0.01, -3.2 + j * 3.2); scene.add(p); }
  // el panel de cotizaciones (lienzo) con marco dorado y la cinta de valores debajo
  const bt = S.boardTex = cpuTex(2048, 640);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w, BOARD.h), new THREE.MeshBasicMaterial({ map: bt, toneMapped: false, color: new THREE.Color(1, 1, 1).multiplyScalar(1.15) }));
  board.position.set(0, BOARD.y, BOARD.z); scene.add(board); R.board = board;
  for (const [x, y, w, h] of [[0, BOARD.y + BOARD.h / 2 + 0.06, BOARD.w + 0.24, 0.12], [0, BOARD.y - BOARD.h / 2 - 0.06, BOARD.w + 0.24, 0.12], [-BOARD.w / 2 - 0.06, BOARD.y, 0.12, BOARD.h], [BOARD.w / 2 + 0.06, BOARD.y, 0.12, BOARD.h]]) {
    const f = mesh(new THREE.BoxGeometry(w, h, 0.1), M.goldD); f.position.set(x, y, BOARD.z - 0.02); scene.add(f); }
  const tt = S.tickTex = cpuTex(2048, 64);
  const tick = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w, 0.32), new THREE.MeshBasicMaterial({ map: tt, toneMapped: false })); tick.position.set(0, BOARD.y - BOARD.h / 2 - 0.36, BOARD.z); scene.add(tick); R.tick = tick;
  // relojes de cuatro bolsas (a la izquierda y a la derecha del panel)
  [['MADRID', 9.5], ['LONDRES', 8.5], ['NUEVA YORK', 3.5], ['TOKIO', 17.5]].forEach(([n, hr], i) => {
    const x = (i < 2 ? -1 : 1) * (BOARD.w / 2 + 0.75), y = BOARD.y + 0.75 - (i % 2) * 1.5, g = new THREE.Group(); g.position.set(x, y, -RZ + 0.05); scene.add(g);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.4 })); g.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 48), M.goldD); g.add(rim);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, m = mesh(new THREE.BoxGeometry(0.02, 0.06, 0.005), M.black); m.position.set(Math.sin(a) * 0.35, Math.cos(a) * 0.35, 0.005); m.rotation.z = -a; g.add(m); }
    const hh = mesh(new THREE.BoxGeometry(0.025, 0.2, 0.006), M.black); hh.geometry.translate(0, 0.09, 0); hh.position.z = 0.01; hh.rotation.z = -(hr % 12) / 12 * Math.PI * 2; g.add(hh);
    const mm = mesh(new THREE.BoxGeometry(0.016, 0.3, 0.006), M.black); mm.geometry.translate(0, 0.14, 0); mm.position.z = 0.012; mm.rotation.z = -((hr % 1) * 60) / 60 * Math.PI * 2; g.add(mm);
    const lab = plateText(0.8, 0.14, [[n, 0.7, 0.55]], { bg: null, fg: '#e9e2d2' }); lab.position.set(0, -0.56, 0.01); g.add(lab); });
  // mesas de operadores con tres pantallas cada una (gráficos de ambiente)
  const dg = deskGeo(), dm = new THREE.InstancedMesh(dg, M.wood, DESKS_L.length + DESKS_R.length); dm.castShadow = true; dm.receiveShadow = true;
  const amb = [0, 1, 2, 3].map(k => { const t = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#05070a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.08)'; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      g.strokeStyle = k % 2 ? '#ff5a4e' : '#ffc24a'; g.lineWidth = 3; g.beginPath(); let y = h * 0.6; for (let x = 0; x <= w; x += 8) { y += (hash(x * 0.37 + k * 9) - (k % 2 ? 0.45 : 0.55)) * 14; y = Math.max(20, Math.min(h - 20, y)); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      g.fillStyle = '#c9ced6'; g.font = '700 18px Inter'; g.fillText(['BOLSA ESP', 'EURO / DÓLAR', 'ORO', 'BONO 10 AÑOS'][k], 10, 22); }); return t; });
  [...DESKS_L, ...DESKS_R].forEach(([x, z], i) => { _o.position.set(x, 0, z); _o.rotation.set(0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0); _o.scale.setScalar(1); _o.updateMatrix(); dm.setMatrixAt(i, _o.matrix);
    for (let k = -1; k <= 1; k++) { const mo = monitor(amb[(i + k + 1) % 4], 0.5, 0.3); mo.position.set(x + (x < 0 ? -0.22 : 0.22), DESK_Y, z + k * 0.55); mo.rotation.y = x < 0 ? Math.PI / 2 - k * 0.25 : -Math.PI / 2 + k * 0.25; scene.add(mo); } });
  scene.add(dm);
  // estaciones (mesas cortas para los objetos de cada frase) y pedestales
  for (const p of [ST3, ST4, ST5, ST11]) { const d = mesh(deskGeo(1.2, 0.7), M.wood); d.position.copy(p); d.rotation.y = p.x < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(d); }
  for (const p of [ST8, ST9]) { const pd = lathe([[0, 0], [0.42, 0], [0.42, 0.06], [0.34, 0.1], [0.34, 0.86], [0.4, 0.9], [0.4, 0.95], [0, 0.95]], 48, M.marbleK); pd.position.copy(p); scene.add(pd); }
  // pedestal central (mármol negro con canto dorado)
  const pl = rbox(3.1, 1.5, PLAT_Y, M.marbleK, 0.04); pl.rotation.x = -Math.PI / 2; pl.position.set(0, PLAT_Y / 2, 0.4); scene.add(pl);
  const trim = mesh(new THREE.BoxGeometry(3.12, 0.025, 1.52), M.goldD); trim.position.set(0, PLAT_Y - 0.01, 0.4); scene.add(trim);
}
// ---------------------------------------------------------------- luces: lucernario (luz fría y suave desde arriba), foco cálido que sigue a lo que
// se mira, relleno y contraluz
function buildLights() {
  const sky = new THREE.DirectionalLight(0xdfe8ff, 1.1); sky.castShadow = true; sky.shadow.mapSize.set(2048, 2048);
  const sc = sky.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 7; sc.bottom = -7; sc.near = 0.5; sc.far = 30; sky.shadow.bias = -0.0004; sky.shadow.normalBias = 0.02; sky.shadow.radius = 4;
  sky.position.set(2, 12, 4); sky.target.position.set(0, 0, 0); scene.add(sky, sky.target);
  const hemi = new THREE.HemisphereLight(0xcfd8e8, 0x2a2018, 0.14); scene.add(hemi);
  const key = new THREE.SpotLight(0xffe7c4, 30, 9, 0.75, 1.0, 1.6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.radius = 4; key.shadow.camera.near = 0.2; key.shadow.camera.far = 12;
  scene.add(key, key.target);
  const fill = new THREE.PointLight(0xdfe8ff, 3, 6, 1.6); scene.add(fill);
  const rim = new THREE.PointLight(0xffd7a8, 4, 5, 1.6); scene.add(rim);
  const boardL = new THREE.PointLight(0xffd9a0, 6, 9, 1.6); boardL.position.set(0, BOARD.y, BOARD.z + 1.2); scene.add(boardL);
  S.rig = { sky, hemi, key, fill, rim };
}
function rigAt(c, camP) {
  const R = S.rig, d = c.clone().sub(camP), L = d.length(), u = d.clone().normalize(), side = v3(-u.z, 0, u.x);
  R.key.position.copy(c).addScaledVector(u, -L * 0.55).addScaledVector(side, L * 0.45).add(v3(0, 1.4 + L * 0.3, 0)); R.key.target.position.copy(c); R.key.target.updateMatrixWorld();
  R.key.distance = 3 + L * 2.2; R.key.intensity = 1.0 + 1.4 * L;
  R.fill.position.copy(camP).addScaledVector(side, -0.6).add(v3(0, 0.3, 0)); R.fill.intensity = 0.35 + 0.45 * L; R.fill.distance = 2 + L * 2;
  R.rim.position.copy(c).addScaledVector(u, 0.6 + L * 0.2).add(v3(0, 0.5, 0)); R.rim.intensity = 0.9 + 1.0 * L; R.rim.distance = 2 + L;
}
function buildFlow() {
  S.flow = [
    flowCloud(9000, i => [(hash(i * 1.3) - 0.5) * 2 * RX, 0.05 + Math.pow(hash(i * 4.4), 1.3) * (RH - 0.5), (hash(i * 6.1) - 0.5) * 2 * RZ], { size: 1.3, bright: 0.45, farF: 0.05, nearF: 0.05, seed: 3, col: 0xffe6c4 }),
    flowCloud(3000, i => [gauss(i) * 1.6, PLAT_Y + Math.abs(gauss(i + 9e3)) * 1.0, 0.4 + gauss(i + 2e4) * 1.0], { size: 1.1, bright: 0.5, seed: 1, nearF: 0.05, farF: 0.08, col: 0xfff0d8 }),
  ];
}
// ---------------------------------------------------------------- objetos que se mueven: la montaña dorada y los 100 gestores, las monedas y el embudo,
// la casa del alquiler, las tres pantallas de la macro, la torre de oficinas, las dos medallas, la burbuja, las comisiones, la línea que
// copia a la bolsa y el humo.
const _o = new THREE.Object3D(), _q0 = new THREE.Quaternion(), _Y = v3(0, 1, 0);
const CH = { x0: -1.3, x1: 1.3, z0: -0.1, z1: 0.9, h: 0.6 };
const chartU = u => 0.05 + 0.5 * Math.pow(u, 1.15) + 0.035 * Math.sin(u * 23) * (1 - u * 0.4) + 0.025 * Math.sin(u * 61 + 1) - (u > 0.42 && u < 0.55 ? 0.06 * Math.sin((u - 0.42) / 0.13 * Math.PI) : 0);
const chartY = (x, k = 1) => PLAT_Y + chartU(clamp((x - CH.x0) / (CH.x1 - CH.x0))) * k;
const WIN = [96, 97, 98, 99];           // los 4 que se quedan arriba
const CSUIT = new THREE.Color(0x6a707b), CGOLD = new THREE.Color(0xffc24a);
function buildProps() {
  const P = S.props = {};
  // la montaña dorada: el perfil de la cotización extruido 1 m de fondo
  const sh = new THREE.Shape(); sh.moveTo(CH.x0, 0); const N = 220;
  for (let i = 0; i <= N; i++) { const u = i / N, x = lerp(CH.x0, CH.x1, u); sh.lineTo(x, chartU(u)); }
  sh.lineTo(CH.x1, 0); sh.closePath();
  const cg = new THREE.ExtrudeGeometry(sh, { depth: CH.z1 - CH.z0, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2, curveSegments: 4 });
  const chart = mesh(cg, M.goldChart); chart.position.set(0, PLAT_Y, CH.z0); scene.add(chart); P.chart = chart;
  // los 100 gestores (10 × 10), con traje; los 4 de arriba, dorados
  const fm = new THREE.InstancedMesh(figGeo(), M.suit, 100); fm.castShadow = true; fm.receiveShadow = true; fm.frustumCulled = false; scene.add(fm); P.figs = fm;
  P.fig0 = []; for (let i = 0; i < 100; i++) { const c = i % 10, r = Math.floor(i / 10), u = 0.06 + c * 0.093 + (hash(i * 3.3) - 0.5) * 0.02;
    P.fig0.push({ x: lerp(CH.x0, CH.x1, WIN.includes(i) ? 0.86 + (i - 96) * 0.03 : u), z: CH.z0 + 0.09 + r * 0.088 + (hash(i * 5.1) - 0.5) * 0.02, ts: K.n96 + 0.05 + hash(i * 7.7) * 0.55, rot: hash(i * 2.9) * 6.28 });
    fm.setColorAt(i, WIN.includes(i) ? CGOLD : CSUIT.clone().offsetHSL(0, 0, (hash(i) - 0.5) * 0.06)); }
  // monedas y embudo (L3)
  const fun = lathe([[0.025, 0], [0.03, 0.06], [0.03, 0.09], [0.16, 0.26], [0.17, 0.27], [0.155, 0.27], [0.024, 0.095], [0.02, 0.06], [0.016, 0]], 48, M.silver);
  fun.position.set(ST3.x + 0.05, DESK_Y + 0.11, ST3.z - 0.12); scene.add(fun); P.funnel = fun;
  const legs = [0, 1, 2].map(k => { const a = k / 3 * Math.PI * 2, l = cyl(0.006, 0.006, 0.2, M.dsteel, 8); l.position.set(fun.position.x + Math.cos(a) * 0.1, DESK_Y + 0.1, fun.position.z + Math.sin(a) * 0.1); scene.add(l); return l; });
  const coins = new THREE.InstancedMesh(coinGeo(), M.coin, 25); coins.castShadow = true; coins.frustumCulled = false; scene.add(coins); P.coins = coins;
  P.heap = []; for (let i = 0; i < 24; i++) { const a = hash(i * 1.7) * 6.28, r = Math.sqrt(hash(i * 2.3)) * 0.1; P.heap.push(v3(ST3.x + 0.05 + Math.cos(a) * r, DESK_Y + 0.003 + Math.floor(i / 8) * 0.0065 + 0.003, ST3.z + 0.22 + Math.sin(a) * r)); }
  // casa del alquiler (L4) con su cartel de precio
  const hs = houseModel(); hs.position.set(ST4.x + 0.02, DESK_Y, ST4.z - 0.05); hs.rotation.y = Math.PI / 2; scene.add(hs); P.house = hs;
  P.rentTex = cpuTex(512, 256); P.rentK = -1;
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshStandardMaterial({ map: P.rentTex, roughness: 0.5 })); tag.position.set(ST4.x + 0.05, DESK_Y + 0.5, ST4.z + 0.24); tag.rotation.y = Math.PI / 2; scene.add(tag); P.tag = tag;
  const pole = cyl(0.005, 0.005, 0.42, M.dsteel, 8); pole.position.set(ST4.x + 0.05, DESK_Y + 0.21, ST4.z + 0.24); scene.add(pole);
  const arrow = arrow3(0.3, M.gold, 0.012); arrow.position.set(ST4.x + 0.05, DESK_Y + 0.28, ST4.z - 0.05); scene.add(arrow); P.rentArrow = arrow;
  // las tres pantallas de la macro (L5)
  P.macroTex = [0, 1, 2].map(() => cpuTex(512, 320)); P.macroK = -1;
  P.macroMon = P.macroTex.map((t, k) => { const mo = monitor(t, 0.52, 0.32); mo.position.set(ST5.x + 0.05, DESK_Y, ST5.z - (k - 1) * 0.58); mo.rotation.y = Math.PI / 2 + (k - 1) * 0.22; scene.add(mo); return mo; });
  // torre de oficinas (L8) en su pedestal
  const tw = towerModel(1.0); tw.position.set(ST8.x, 0.95, ST8.z); scene.add(tw); P.tower = tw;
  // dos medallas (L9) en su pedestal, una frente a otra
  P.medals = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(ST9.x, 0.95, ST9.z + s * 0.16); scene.add(g);
    const st = cyl(0.008, 0.012, 0.13, M.dsteel, 10); st.position.y = 0.065; g.add(st); const md = medal(); md.position.y = 0.24; g.add(md); g.userData.md = md; g.userData.s = s; return g; });
  // la burbuja (L10) sobre la montaña y sus gotas al explotar
  P.bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { tm: { value: 0 } },
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv;\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: '#include <common>\n#include <logdepthbuf_pars_fragment>\nuniform float tm; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){\n#include <logdepthbuf_fragment>\n float f = 1.0 - abs(dot(normalize(vN), vV)); float a = pow(f, 2.0) * 2.4 + 0.06; vec3 iri = 0.5 + 0.5 * cos(6.2831 * (f * 1.6 + vP.y * 0.8 + tm * 0.2) + vec3(0.0, 2.1, 4.2)); vec3 c = mix(vec3(1.0), iri, 0.55) * a; float sp = pow(max(0.0, dot(reflect(-vV, normalize(vN)), normalize(vec3(0.4, 0.8, 0.5)))), 60.0) * 2.5; gl_FragColor = vec4(c + sp, 1.0); }' }));
  P.bubble.position.set(0.55, PLAT_Y + 1.0, 0.4); P.bubble.renderOrder = 6; scene.add(P.bubble);
  P.drops = sparks(scene, 160, 0xdfe8ff, 0.03);
  // comisiones (L11): la pila del inversor y la caja de cristal donde se van las monedas
  const cm = new THREE.InstancedMesh(coinGeo(), M.coin, 14); cm.castShadow = true; cm.frustumCulled = false; scene.add(cm); P.cstack = cm;
  const box = mesh(new THREE.BoxGeometry(0.24, 0.2, 0.24), M.glass, false); box.position.set(ST11.x - 0.02, DESK_Y + 0.1, ST11.z - 0.25); scene.add(box); P.cbox = box;
  const bl = plateText(0.3, 0.06, [['COMISIONES', 0.62, 0.55]], { bg: '#121316', fg: '#f2eee6' }); bl.position.set(ST11.x - 0.02, DESK_Y + 0.24, ST11.z - 0.25); bl.rotation.y = -Math.PI / 2; scene.add(bl);
  // la línea que copia a la bolsa (L12): tubo plateado sobre el canto delantero de la montaña
  const pts = []; for (let i = 0; i <= 160; i++) { const x = lerp(CH.x0, CH.x1 + 0.35, i / 160), xx = Math.min(x, CH.x1); pts.push(v3(x, (x <= CH.x1 ? chartY(xx) : chartY(CH.x1) + (x - CH.x1) * 0.35) + 0.012, CH.z1 + 0.03)); }
  P.idxCurve = new THREE.CatmullRomCurve3(pts); P.idx = new THREE.Mesh(new THREE.TubeGeometry(P.idxCurve, 320, 0.012, 10, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 0.9, 1).multiplyScalar(2.2), toneMapped: false }));
  P.idx.geometry.setDrawRange(0, 0); scene.add(P.idx);
  // el «producto» que se convierte en humo (L13)
  const pb = rbox(0.22, 0.22, 0.22, M.gold, 0.02); pb.position.set(0, PLAT_Y + 0.11, 1.32); scene.add(pb); P.pbox = pb;
  P.smoke = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(240 * 3), 3)), new THREE.PointsMaterial({ color: 0xbfc3c8, size: 0.22, transparent: true, opacity: 0.0, depthWrite: false, map: starTex0() }));
  P.smoke.frustumCulled = false; scene.add(P.smoke);
}
// ---------------------------------------------------------------- un instante
function setInst(im, i, p, q, s) { _o.position.copy(p); _o.quaternion.copy(q); _o.scale.setScalar(Math.max(0.0001, s)); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); }
function propsAt(t) {
  const P = S.props;
  // la montaña sube con «subió … 58 %» (y vuelve a su sitio para el bucle)
  const kc = lerp(0.4, 1, eo(clamp((t - K.subio1) / (K.pct1 + 0.35 - K.subio1)))) , kcLoop = t > END - 0.8 ? 1 : kc;
  const ky = t > END - 0.8 ? lerp(1, 0.4, eio(clamp((t - (END - 0.8)) / 0.8))) : kc; P.chart.scale.y = ky;
  // los gestores: 96 resbalan montaña abajo y caen al suelo; al final vuelven a subir (bucle)
  const back = win(t, K.dime14, 0.5);
  for (let i = 0; i < 100; i++) {
    const f = P.fig0[i]; let x = f.x, y = chartY(x, ky), z = f.z, tilt = 0, s = 0.13;
    if (!WIN.includes(i) && t > f.ts && back < 1) {
      const u = t - f.ts, xs = f.x - 1.6 * u * u;
      if (xs > CH.x0) { x = xs; y = chartY(x, ky); tilt = Math.min(0.5, u * 0.9); }
      else { const tEdge = f.ts + Math.sqrt((f.x - CH.x0) / 1.6), ue = t - tEdge, v = 3.2 * (tEdge - f.ts); x = CH.x0 - v * ue * 0.6; y = Math.max(PLAT_Y + 0.013, chartY(CH.x0, ky) - 4.9 * ue * ue); tilt = Math.min(Math.PI / 2, 0.5 + ue * 6); if (y <= PLAT_Y + 0.014) x = CH.x0 - 0.04 - hash(i * 9.1) * 0.19; }
      s = 0.13 * (1 - win(t, K.esto14, 0.3));
    }
    if (back > 0 && !WIN.includes(i)) s = 0.13 * pop(t, K.dime14 + hash(i * 3.7) * 0.5, 0.35);
    _o.position.set(x, y, z); _o.rotation.set(0, f.rot * 0.2 - 0.3, tilt); _o.scale.setScalar(Math.max(0.0001, s)); _o.updateMatrix(); P.figs.setMatrixAt(i, _o.matrix);
  }
  P.figs.instanceMatrix.needsUpdate = true;
  // monedas: montón al decir «rico»; se cuelan por el embudo con «casi nadie» y solo sale una con «consigue»
  for (let i = 0; i < 25; i++) {
    let p = null, q = _q0.identity(), s = 1;
    if (i < 24) { const t0 = K.rico3 - 0.15 + i * 0.012, u = clamp((t - t0) / 0.4), h = P.heap[i];
      if (u <= 0) s = 0; else { p = h.clone(); p.y += (1 - eo(u)) * 0.5; q = new THREE.Quaternion().setFromEuler(new THREE.Euler((hash(i) - 0.5) * 0.3, 0, (hash(i * 2) - 0.5) * 0.3)); }
      const t1 = K.casi3 - 0.05 + i * 0.03, v = clamp((t - t1) / 0.45); if (v > 0 && p) { const top = P.funnel.position.clone().add(v3(0, 0.27, 0)); p = easeArc(h, top, v, 0.18); if (v > 0.85) s = (1 - v) / 0.15; }
      if (t > K.micro4 + 0.6) s = 0; }
    else { const t2 = K.consigue3 - 0.08, u = clamp((t - t2) / 0.35); if (u > 0 && t < K.micro4 + 0.6) { p = P.funnel.position.clone().add(v3(0.0, -0.11 + 0.0 * u, 0)); p.y = lerp(DESK_Y + 0.05, DESK_Y + 0.003, eo(u)); p.x += 0.12 * eo(u); } else s = 0; }
    if (!p) { p = v3(0, -5, 0); s = 0; }
    setInst(P.coins, i, p, q, s);
  }
  P.coins.instanceMatrix.needsUpdate = true;
  // alquiler: el precio sube de 750 € a 1.050 € al decir «sube»; la flecha crece
  { const k = clamp((t - K.sube4) / 0.6), v = Math.round(lerp(750, 1050, eio(k)) / 10) * 10;
    if (v !== P.rentK) { P.rentK = v; const T = P.rentTex, g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height; g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#141416'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#555'; g.font = '800 44px Inter'; g.textAlign = 'center'; g.fillText('ALQUILER', w / 2, 72); g.fillStyle = k > 0 ? '#c0392b' : '#141416'; g.font = '900 104px Inter'; g.fillText(v.toLocaleString('es-ES') + ' €', w / 2, 190); T.needsUpdate = true; }
    P.rentArrow.userData.setLen(0.02 + 0.32 * eo(k)); P.rentArrow.visible = k > 0.01; }
  // macro: inflación, paro y crisis (cada pantalla se dibuja al decir su palabra)
  { const ks = [clamp((t - K.inflacion5 + 0.05) / 0.6), clamp((t - K.paro5 + 0.05) / 0.5), clamp((t - K.crisis5 + 0.05) / 0.6)], key = ks.map(v => Math.round(v * 40)).join(',');
    if (key !== P.macroK) { P.macroK = key; P.macroTex.forEach((T, k) => drawMacro(T, k, ks[k])); } }
  // torre: crece planta a planta con «Finanzas»
  { const k = clamp((t - K.finanzas8 + 0.1) / 0.8), n = P.tower.userData.n, kk = Math.max(0.06, Math.ceil(k * n) / n); P.tower.userData.body.scale.y = kk; P.tower.userData.body.position.y = kk * P.tower.userData.h / 2; P.tower.userData.cap.position.y = kk * P.tower.userData.h + 0.015; }
  // medallas: aparecen con «dos» y se dan la espalda con «contrario»
  P.medals.forEach(g => { const s = g.userData.s, k = pops(t, K.nobel9 - 0.1 + (s > 0 ? 0.12 : 0), 0.4), turn = eio(clamp((t - K.contrario9) / 0.5));
    g.scale.setScalar(k); g.userData.md.rotation.y = s * (Math.PI / 2) * (1 - 2 * turn) * -1 + Math.sin(t * 1.3 + s) * 0.05; });
  // burbuja: se infla con «infla burbujas» y explota al acabar la frase
  { const t0 = K.infla10 - 0.05, tp = K.quien11 - 0.15, k = clamp((t - t0) / (tp - t0)); P.bubble.visible = k > 0 && t < tp; P.bubble.scale.setScalar(0.02 + 0.36 * eo(k) + 0.01 * Math.sin(t * 12)); P.bubble.material.uniforms.tm.value = t;
    P.drops.visible = t > tp && t < tp + 0.7; if (P.drops.visible) burst(P.drops, P.bubble.position, t, tp, 0.9, 0.7, false, 2.5); }
  // comisiones: 5 monedas vuelan de la pila a la caja de cristal
  { for (let i = 0; i < 14; i++) { const base = v3(ST11.x + 0.02, DESK_Y + 0.003 + i * 0.0065, ST11.z + 0.18); let p = base, s = pops(t, K.quien11 + 0.3, 0.4);
      if (i >= 9) { const t0 = K.comisiones11 - 0.35 + (13 - i) * 0.12, u = clamp((t - t0) / 0.4); if (u > 0) p = easeArc(base, P.cbox.position.clone().add(v3(0, -0.05 + (13 - i) * 0.007, 0)), u, 0.15); }
      setInst(P.cstack, i, p, _q0.identity(), s); }
    P.cstack.instanceMatrix.needsUpdate = true; }
  // la línea que copia a la bolsa: se dibuja con «copian» y adelanta con «acaban por delante»
  { const a = clamp((t - K.copian12 + 0.05) / 0.7) * 0.8 + clamp((t - K.acaban12) / 0.9) * 0.2, n = P.idx.geometry.index.count;
    P.idx.geometry.setDrawRange(0, Math.floor(n * a / 6) * 6); P.idx.visible = a > 0.001 && t < K.dime14 + 0.3; }
  // el «producto» brillante aparece con «vendan» y se deshace en humo con «humo»
  { const k = pops(t, K.vendan13 - 0.15, 0.35), th = K.humo13, u = clamp((t - th) / 1.1);
    P.pbox.visible = k > 0.01 && t < th + 0.05; P.pbox.scale.setScalar(k); P.pbox.rotation.y = t * 0.8;
    P.smoke.visible = u > 0 && u < 1; if (P.smoke.visible) { const a = P.smoke.geometry.attributes.position.array, c = P.pbox.position;
      for (let i = 0; i < 240; i++) { const th2 = hash(i * 1.3) * 6.283, ph = (hash(i * 2.7) - 0.2) * 1.2, r = (0.05 + hash(i * 3.9) * 0.5) * eo(u);
        a[i * 3] = c.x + Math.cos(th2) * Math.cos(ph) * r; a[i * 3 + 1] = c.y + Math.sin(ph) * r * 0.7 + u * 0.3; a[i * 3 + 2] = c.z + Math.sin(th2) * Math.cos(ph) * r; }
      P.smoke.geometry.attributes.position.needsUpdate = true; P.smoke.material.opacity = 0.55 * (1 - u); P.smoke.material.size = 0.12 + 0.3 * u; } }
}
function easeArc(a, b, u, hgt) { const p = a.clone().lerp(b, eio(clamp(u))); p.y += Math.sin(Math.PI * clamp(u)) * hgt; return p; }
// pantallas de la macro: 0 inflación (precios que suben), 1 paro (barras), 2 crisis (caída)
function drawMacro(T, k, kk) {
  const g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height;
  g.fillStyle = '#05070a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
  for (let x = 0; x < w; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.fillStyle = '#e9edf2'; g.font = '800 40px Inter'; g.fillText(['INFLACIÓN', 'PARO', 'CRISIS'][k], 22, 52);
  if (kk <= 0) { T.needsUpdate = true; return; }
  g.lineWidth = 7; g.lineJoin = 'round'; g.lineCap = 'round';
  if (k === 0) { g.strokeStyle = '#ffc24a'; g.beginPath(); const n = Math.floor(60 * kk); for (let i = 0; i <= n; i++) { const x = 30 + i * 7.5, y = h - 50 - Math.pow(i / 60, 1.6) * 180 - Math.sin(i * 0.7) * 6; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  if (k === 1) { for (let i = 0; i < 8; i++) { const v = clamp(kk * 8 - i); if (v <= 0) break; const bh = (60 + hash(i * 3.1) * 140) * v; g.fillStyle = i === 7 ? '#ff5a4e' : '#c9ced6'; g.fillRect(36 + i * 56, h - 30 - bh, 38, bh); } }
  if (k === 2) { g.strokeStyle = '#ff5a4e'; g.beginPath(); const n = Math.floor(60 * kk); for (let i = 0; i <= n; i++) { const x = 30 + i * 7.5, y = i < 38 ? h - 120 - i * 2.4 - Math.sin(i) * 5 : h - 211 + (i - 38) * 8.5; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  T.needsUpdate = true;
}
// ---------------------------------------------------------------- el panel de cotizaciones (lienzo de 2048 × 640 = 10 × 3,125 m) y la cinta de valores.
// Lo importante se dibuja en la franja central (≈ 3,6 m), que es lo que entra en un plano vertical; a los lados, tablas de mercados en tenue.
const BW = 2048, BH = 640, CX0 = 650, CX1 = 1398;
function buildBoard() { S.bd = { lastKey: '' }; }
const GOLD = '#FFC24A', REDC = '#FF5A4E', WHT = '#EEF2F6', GRY = '#8A919B';
function bTxt(g, s, x, y, size, col, k = 1, o = {}) { if (k <= 0) return; g.save(); g.globalAlpha = (o.a ?? 1) * clamp(k * 2); g.font = `${o.w || 800} ${size}px ${o.f || 'Inter'}`; g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.fillStyle = col;
  if (o.type !== false && k < 1) { const n = Math.floor(s.length * clamp(k * 1.4)); s = s.slice(0, n); } g.fillText(s, x, y); g.restore(); }
function bLine(g, pts, k, col, w = 6, glow = 14) { if (k <= 0 || pts.length < 2) return; const n = Math.max(2, Math.floor(pts.length * clamp(k))); g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.shadowColor = col; g.shadowBlur = glow;
  g.beginPath(); for (let i = 0; i < n; i++) i ? g.lineTo(pts[i][0], pts[i][1]) : g.moveTo(pts[i][0], pts[i][1]); g.stroke(); g.restore(); }
function sideTables(g, a) {         // tablas de mercados a los lados (sin cifras inventadas: solo nombres y flechas)
  g.save(); g.globalAlpha = a; g.font = '700 30px Inter'; g.textBaseline = 'middle';
  const rows = [['BOLSA ESP', 1], ['EURO / DÓLAR', -1], ['ORO', 1], ['BONO 10 AÑOS', -1], ['PETRÓLEO', 1], ['BOLSA EUROPA', 1], ['BOLSA EE. UU.', 1], ['BOLSA JAPÓN', -1]];
  for (const [x0, x1] of [[70, 560], [1488, 1978]]) rows.forEach(([n, d], i) => { const y = 92 + i * 62; g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x0, y - 26, x1 - x0, 52);
    g.fillStyle = '#c9ced6'; g.textAlign = 'left'; g.fillText(n, x0 + 18, y); g.fillStyle = d > 0 ? GOLD : REDC; g.textAlign = 'right'; g.fillText(d > 0 ? '▲' : '▼', x1 - 18, y); });
  g.restore();
}
function grid(g, a = 1) { g.save(); g.globalAlpha = 0.09 * a; g.strokeStyle = '#ffffff'; g.lineWidth = 1; for (let x = CX0; x <= CX1; x += 44) { g.beginPath(); g.moveTo(x, 60); g.lineTo(x, 600); g.stroke(); } for (let y = 60; y <= 600; y += 44) { g.beginPath(); g.moveTo(CX0, y); g.lineTo(CX1, y); g.stroke(); } g.restore(); }
function walk(n, seed, drift, vol, y0) { const p = []; let y = y0; for (let i = 0; i < n; i++) { y += drift + (hash(i * 1.73 + seed) - 0.5) * vol; p.push(y); } return p; }
const IDX = walk(90, 1, -2.6, 16, 520), FUND = IDX.map((y, i) => y + i * 1.15 + Math.sin(i * 0.4) * 4);
function boardAt(t) {
  const B = S.bd, ph = [
    t < K.entonces2 - 0.1 ? 1 : 0, t >= K.entonces2 - 0.1 && t < K.mates6 - 0.15 ? 1 : 0, t >= K.mates6 - 0.15 && t < K.econom7 - 0.1 ? 1 : 0, t >= K.econom7 - 0.1 && t < K.finanzas8 - 0.1 ? 1 : 0,
    t >= K.finanzas8 - 0.1 && t < K.loco9 - 0.2 ? 1 : 0, t >= K.loco9 - 0.2 && t < K.uno10 - 0.1 ? 1 : 0, t >= K.uno10 - 0.1 && t < K.quien11 - 0.05 ? 1 : 0, t >= K.quien11 - 0.05 && t < K.fondos12 - 0.3 ? 1 : 0,
    t >= K.fondos12 - 0.3 && t < K.para13 - 0.1 ? 1 : 0, t >= K.para13 - 0.1 ? 1 : 0].indexOf(1);
  const q = v => Math.round(clamp(v) * 30);
  const ks = [q((t - K.subio1) / 1.3), q((t - K.n96) / 0.6), q((t - K.para2) / 0.4), q((t - K.mates6) / 0.5), q((t - K.estad6) / 0.5), q((t - K.muchas6) / 0.6), q((t - K.datos7 + 0.1) / 0.6), q((t - K.separar7) / 0.6),
    q((t - K.funciona7) / 0.4), q((t - K.cuanto8) / 0.6), q((t - K.nobel9) / 0.5), q((t - K.dos9) / 0.4), q((t - K.contrario9 - 0.05) / 0.4), q((t - K.uno10 - 0.05) / 1.0), q((t - K.otro10) / 0.4), q((t - K.infla10) / 0.9),
    q((t - K.primero11) / 0.4), q((t - K.cuesta11) / 0.6), q((t - K.copian12) / 0.6), q((t - K.cobran12) / 0.4), q((t - K.acaban12) / 0.8), q((t - K.asesor14) / 0.5), q((t - K.gestor14 - 0.05) / 0.3), q((t - K.indexado14 - 0.05) / 0.3), q((t - K.n2013) / 0.3)];
  const key = ph + '|' + ks.join(',');
  if (key !== B.lastKey) { B.lastKey = key; const T = S.boardTex, g = T.userData.g; const K2 = ks.map(v => v / 30);
    g.fillStyle = '#050608'; g.fillRect(0, 0, BW, BH); sideTables(g, 0.85);
    g.fillStyle = 'rgba(255,194,74,.08)'; g.fillRect(CX0 - 20, 30, CX1 - CX0 + 40, 580);
    if (ph === 0) { grid(g); const pts = IDX.map((y, i) => [CX0 + 30 + i * 7.6, y]); bLine(g, pts, K2[0], GOLD, 8, 18);
      bTxt(g, 'BOLSA ESPAÑOLA · 2025', (CX0 + CX1) / 2, 92, 40, WHT, 1, { w: 700 });
      if (K2[0] >= 1) bTxt(g, '+58,4 %', CX1 - 140, 150, 64, GOLD, 1, { type: false, w: 900 });
      if (K2[1] > 0) for (let j = 0; j < 6; j++) bLine(g, FUND.map((y, i) => [CX0 + 30 + i * 7.6, y + j * 9 + 6]), K2[1], 'rgba(160,166,176,.55)', 3, 0); }
    if (ph === 1) bTxt(g, '?', (CX0 + CX1) / 2, 330, 420, GOLD, K2[2], { type: false, w: 900 });
    if (ph === 2) { bTxt(g, 'max U(x, y)', (CX0 + CX1) / 2, 120, 54, WHT, K2[3], { f: 'Inter', w: 700 }); bTxt(g, 'Y = C + I + G + (X − M)', (CX0 + CX1) / 2, 215, 46, WHT, K2[4], { w: 700 });
      if (K2[5] > 0) { const pts = []; for (let i = 0; i <= 120; i++) { const x = -3 + i / 20; pts.push([(CX0 + CX1) / 2 + x * 100, 560 - 230 * Math.exp(-x * x / 2)]); } bLine(g, pts, K2[5], GOLD, 7, 14); bTxt(g, 'σ', (CX0 + CX1) / 2 + 120, 380, 48, GOLD, K2[5], { type: false }); } }
    if (ph === 3) { grid(g); const n = 40, pts = []; for (let i = 0; i < n; i++) { const x = hash(i * 2.3), y = 0.2 + 0.6 * x + (hash(i * 5.7) - 0.5) * 0.3; pts.push([CX0 + 60 + x * 620, 560 - y * 460]); }
      g.save(); pts.forEach((p, i) => { const a = clamp(K2[6] * 1.3 - i / n * 0.3); if (a <= 0) return; g.globalAlpha = a; g.fillStyle = K2[8] > 0 && (560 - p[1]) / 460 > 0.2 + 0.6 * (p[0] - CX0 - 60) / 620 ? GOLD : WHT; g.beginPath(); g.arc(p[0], p[1], 9, 0, 7); g.fill(); }); g.restore();
      if (K2[7] > 0) { const sl = lerp(0, 0.6, eo(K2[7])), y0 = lerp(0.5, 0.2, eo(K2[7])); bLine(g, [[CX0 + 40, 560 - y0 * 460], [CX1 - 40, 560 - (y0 + sl * (CX1 - CX0 - 80) / 620) * 460]], 1, REDC, 7, 16); }
      bTxt(g, 'y = α + βx', (CX0 + CX1) / 2 + 120, 96, 42, WHT, K2[7], { w: 700 }); }
    if (ph === 4) { bTxt(g, 'VALOR =', (CX0 + CX1) / 2, 200, 66, WHT, K2[9], { w: 800 }); bTxt(g, 'Σ FLUJOS / (1 + r)ᵗ', (CX0 + CX1) / 2, 320, 54, GOLD, K2[9], { w: 800 }); }
    if (ph === 5) { bTxt(g, '2013', (CX0 + CX1) / 2, 215, 120, GOLD, K2[24], { type: false, w: 900 }); bTxt(g, 'NOBEL DE ECONOMÍA', (CX0 + CX1) / 2, 100, 54, WHT, K2[10], { w: 800 });
      bTxt(g, 'FAMA', (CX0 + CX1) / 2 - 190, 420, 70, WHT, K2[11], { w: 900 }); bTxt(g, 'SHILLER', (CX0 + CX1) / 2 + 170, 420, 70, WHT, K2[11], { w: 900 }); bTxt(g, '≠', (CX0 + CX1) / 2 - 10, 420, 90, REDC, K2[12], { type: false, w: 900 }); }
    if (ph === 6) { const mid = (CX0 + CX1) / 2; g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(mid - 2, 60, 4, 540);
      const L = walk(60, 7, 0, 10, 340).map((y, i) => [CX0 + 30 + i * 5.6, y]); bLine(g, L, K2[13], WHT, 5, 10); bTxt(g, 'EL PRECIO', CX0 + 190, 110, 40, WHT, K2[13], { w: 800 }); bTxt(g, 'YA LO SABE TODO', CX0 + 190, 160, 34, WHT, K2[13], { w: 700 });
      const R2 = []; for (let i = 0; i <= 60; i++) { const u = i / 60; R2.push([mid + 30 + i * 5.6, u < 0.8 ? 520 - 380 * Math.pow(u / 0.8, 3) : 140 + (u - 0.8) / 0.2 * 420]); } bLine(g, R2, K2[15], REDC, 6, 14);
      bTxt(g, 'BURBUJA', mid + 190, 110, 44, REDC, K2[14], { w: 900 }); }
    if (ph === 7) { bTxt(g, '¿QUIÉN TENÍA RAZÓN?', (CX0 + CX1) / 2, 110, 50, WHT, 1, { type: false, w: 800 });
      if (K2[17] <= 0) { const w2 = eo(K2[16]); bTxt(g, 'FAMA', (CX0 + CX1) / 2 - 150, 300, 56 + 16 * w2, w2 > 0.5 ? GOLD : WHT, 1, { type: false, w: 900 }); bTxt(g, 'SHILLER', (CX0 + CX1) / 2 + 160, 300, 56, WHT, 1, { type: false, w: 900, a: 1 - 0.6 * w2 }); bTxt(g, 'o', (CX0 + CX1) / 2, 300, 44, GRY, 1, { type: false, w: 700 }); }
      if (K2[17] > 0) { const b0 = 470, x = CX0 + 120; g.save(); g.globalAlpha = clamp(K2[17] * 2); g.fillStyle = GOLD; g.fillRect(x, b0 - 260 * 1.0, 160, 260); g.fillStyle = '#9aa1ab'; g.fillRect(x + 300, b0 - 260 * (9.0 / 14.5) * lerp(1, 1, K2[17]), 160, 260 * (9.0 / 14.5));
        g.fillStyle = REDC; g.globalAlpha *= 0.85; g.fillRect(x + 300, b0 - 260, 160, 260 * (1 - 9.0 / 14.5) * eo(K2[17])); g.restore();
        bTxt(g, 'ÍNDICE  +14,5 %', x + 80, b0 + 50, 30, GOLD, 1, { type: false, w: 800 }); bTxt(g, 'FONDO MEDIO  +9,0 %', x + 380, b0 + 50, 30, WHT, 1, { type: false, w: 800 }); bTxt(g, '1.ᵉʳ SEMESTRE 2026', (CX0 + CX1) / 2, 590, 26, GRY, 1, { type: false, w: 700 }); } }
    if (ph === 8) { grid(g); const pi = IDX.map((y, i) => [CX0 + 30 + i * 7.6, y]); bLine(g, pi, 1, GOLD, 7, 14); bTxt(g, 'BOLSA', CX1 - 90, 130, 34, GOLD, 1, { type: false });
      for (let j = 0; j < 8; j++) bLine(g, FUND.map((y, i) => [CX0 + 30 + i * 7.6, y + j * 10 + 8]), 1, 'rgba(160,166,176,.5)', 3, 0);
      if (K2[18] > 0) { g.save(); g.setLineDash([18, 12]); bLine(g, pi.map(p => [p[0], p[1] - 10]), K2[18], '#DCE6FF', 5, 16); g.restore(); bTxt(g, 'FONDO INDEXADO = COPIA', (CX0 + CX1) / 2, 590, 30, '#DCE6FF', K2[18], { w: 800 }); }
      if (K2[19] > 0) bTxt(g, 'COMISIÓN BAJA', CX0 + 170, 110, 32, '#DCE6FF', K2[19], { w: 800 }); }
    if (ph === 9) {
      if (K2[21] > 0 && K2[22] < 0.25) { const fo = 1 - clamp(K2[22] * 4);
        bTxt(g, 'ESTO NO ES', (CX0 + CX1) / 2, 215, 44, GRY, K2[21], { a: fo, w: 800 }); bTxt(g, 'ASESORAMIENTO', (CX0 + CX1) / 2, 315, 62, WHT, K2[21], { a: fo, type: false, w: 900 });
        bTxt(g, 'FINANCIERO', (CX0 + CX1) / 2, 405, 62, GOLD, K2[21], { a: fo, type: false, w: 900 }); }
      bTxt(g, '¿GESTOR', (CX0 + CX1) / 2, 280, 110, WHT, K2[22], { type: false, w: 900 }); bTxt(g, 'O INDEXADO?', (CX0 + CX1) / 2, 420, 100, GOLD, K2[23], { type: false, w: 900 }); }
    T.needsUpdate = true; }
  // cinta de valores (se mueve sin parar y da vueltas enteras en el bucle)
  { const T = S.tickTex, g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height, txt = '   BOLSA ESP ▲   ·   EURO / DÓLAR ▼   ·   ORO ▲   ·   BONO 10 AÑOS ▼   ·   PETRÓLEO ▲   ·   BOLSA EUROPA ▲   ·   BOLSA EE. UU. ▲   ·   BOLSA JAPÓN ▼';
    g.fillStyle = '#050608'; g.fillRect(0, 0, w, h); g.font = '800 40px Inter'; g.textBaseline = 'middle'; const tw = g.measureText(txt).width, off = -((t / END) * 3 % 1) * tw;
    for (let k = -1; k < Math.ceil(w / tw) + 1; k++) { let x = off + k * tw; g.fillStyle = GOLD; g.fillText(txt, x, h / 2 + 2); }
    T.needsUpdate = true; }
}
// ---------------------------------------------------------------- cámara: los gestores en la montaña dorada → la sala → el panel («?») → monedas →
// alquiler → macro → panel (matemáticas, econometría) → torre → medallas → panel y burbuja → comisiones → la línea que copia → humo → panel → bucle.
let CKS = [], CUTS = [];
const T0 = [1.72, 1.6, 1.78], L0 = [0.78, 1.33, 0.42], TA = [1.95, 1.7, 2.05], LA = [0.7, 1.32, 0.42];
const BV = (z = 1.4, y = 3.1, ly = 3.72, x = 0) => [[x, y, z], [x, ly, -RZ]];
function buildCam() {
  const k = (t, p, l, f = 40) => [t, p, l, f];
  const [bp, bl] = BV(), [bp2, bl2] = BV(1.4, 3.1, 4.05);
  CKS = [[
    k(-1.0, TA, LA, 37), k(0.0, T0, L0, 36), k(K.subio1, [1.8, 1.66, 1.9], [0.7, 1.32, 0.42], 37), k(K.pct1 + 0.3, [3.0, 2.3, 4.3], [0, 1.2, 0.35], 44), k(K.n96 - 0.1, [1.2, 1.8, 2.6], [-0.2, 1.15, 0.4], 42),
    k(K.profes1, [-0.45, 1.45, 2.0], [-1.3, 0.95, 0.4], 44), k(K.peor1, [-0.75, 1.32, 1.55], [-1.42, 0.88, 0.4], 42),
    k(K.para2 - 0.1, bp2, bl2, 44), k(K.final2, [0, 3.2, 1.0], [0, 3.72, -RZ], 43),
    k(K.crees3 + 0.15, [-1.35, 1.3, 3.05], [-2.4, 0.92, 2.3], 40), k(K.realidad3, [-1.5, 1.22, 2.9], [-2.35, 0.95, 2.25], 38), k(K.consigue3 + 0.2, [-1.55, 1.2, 2.85], [-2.35, 0.92, 2.25], 38),
    k(K.micro4 + 0.25, [-1.25, 1.25, 1.15], [-2.35, 1.02, 0.42], 44), k(K.alquiler4 + 0.2, [-1.32, 1.22, 1.1], [-2.35, 1.04, 0.42], 43),
    k(K.macro5 + 0.25, [-0.05, 1.42, -1.6], [-2.35, 1.06, -1.7], 50), k(K.crisis5 + 0.25, [-0.12, 1.4, -1.62], [-2.35, 1.06, -1.7], 49),
    k(K.mates6 + 0.2, bp, bl, 46), k(K.esperas6, [0, 3.3, 1.2], [0, 3.72, -RZ], 45), k(K.econom7 + 0.2, [0.05, 3.32, 1.1], [0.05, 3.74, -RZ], 45), k(K.no7, [0.05, 3.3, 1.0], [0.05, 3.72, -RZ], 45),
    k(K.finanzas8 + 0.3, [1.35, 1.75, -0.6], [2.5, 1.45, -2.0], 44), k(K.empresa8 + 0.2, [1.45, 1.7, -0.75], [2.5, 1.5, -2.0], 43),
    k(K.loco9 + 0.2, [0, 3.2, 1.3], [0, 3.72, -RZ], 46), k(K.nobel9 + 0.1, [0, 3.15, 1.2], [0, 3.72, -RZ], 46), k(K.dos9 + 0.05, [1.6, 1.3, 1.15], [2.5, 1.18, 0.1], 38), k(K.contrario9 + 0.3, [1.55, 1.28, 1.1], [2.5, 1.18, 0.1], 37),
    k(K.uno10 + 0.2, [0, 3.2, 1.3], [0, 3.72, -RZ], 46), k(K.otro10 + 0.2, [0.05, 3.25, 0.8], [0.05, 3.72, -RZ], 42), k(K.infla10 + 0.15, [1.5, 1.95, 2.5], [0.5, 1.75, 0.4], 42), k(K.quien11 - 0.15, [1.45, 1.95, 2.45], [0.55, 1.78, 0.4], 41),
    k(K.quien11 + 0.35, [0, 3.2, 1.3], [0, 3.72, -RZ], 46), k(K.intentar11 - 0.1, [0.05, 3.2, 0.8], [0.05, 3.7, -RZ], 42),
    k(K.cuesta11, [1.25, 1.3, 3.25], [2.38, 0.9, 2.3], 42), k(K.bien11 + 0.15, [1.3, 1.28, 3.2], [2.38, 0.9, 2.3], 41),
    k(K.fondos12 + 0.1, [0, 3.2, 1.0], [0, 3.72, -RZ], 43), k(K.copian12 + 0.3, [2.5, 1.85, 3.1], [0.1, 1.2, 0.5], 44), k(K.todos12 + 0.2, [2.1, 1.7, 2.8], [0.6, 1.3, 0.6], 42),
    k(K.para13 + 0.3, [0.55, 1.4, 2.6], [0, 1.05, 1.3], 40), k(K.humo13 + 0.3, [0.5, 1.35, 2.5], [0, 1.1, 1.3], 39),
    k(K.asesor14, [0, 3.1, 1.2], [0, 3.7, -RZ], 43), k(K.indexado14 + 0.3, [0.05, 3.15, 1.0], [0.05, 3.7, -RZ], 42),
    k(END - 1.0, TA, LA, 37), k(END, T0, L0, 36), k(END + 0.5, [1.7, 1.59, 1.75], [0.78, 1.33, 0.42], 36),
  ]];
  const ks = CKS[0]; for (let i = 1; i < ks.length; i++) if (ks[i][0] <= ks[i - 1][0] + 0.04) ks[i][0] = ks[i - 1][0] + 0.04;
}
function camAt(t) { return camKeys(t, CKS[0]); }
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return t; return t - dt; }
// destellos en los momentos clave
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[K.n96, 0.06], [K.para2, 0.05], [K.contrario9, 0.05], [K.burst, 0.07], [K.primero11, 0.05], [K.humo13, 0.05]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
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
  const tk = clamp((t + 0.6) / 0.7);
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('ECONOMÍA', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('EL GRADO, POR DENTRO', tk), 56, 182);
  hg.globalAlpha = tk; hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('GRADO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('240 ECTS', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('4 AÑOS', 1024, 178);
  const mk = win(t, K.final2 - 0.1, 0.3) * (1 - win(t, K.dime14, 0.4));
  if (mk > 0.01) {
    let txt = 'PARA QUÉ SIRVE · ???', col = HC.red, blink = true;
    if (t > K.sirve13) { txt = 'PARA QUE NO TE VENDAN HUMO'; col = HG; blink = false; }
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
  const P = S.props, Y = 1450, SRC = 'SPIVA · S&P DOW JONES INDICES';
  // L1: +58,4 % · 96 de cada 100
  { const k = cw(t, K.n58 - 0.05, K.n96 - 0.15); if (k > 0.01) { bigText('+58,4 %', W / 2, Y - 20, 130, HG, k, { glow: 26, type: false, dark: 34 }); bigText('BOLSA ESPAÑOLA · 2025', W / 2, Y + 80, 32, HC.white, k, { dark: 22 }); } }
  { const k = cw(t, K.n96 - 0.05, K.entonces2 - 0.1); if (k > 0.01) { const n = Math.min(96, Math.max(1, Math.round(96 * eo(clamp((t - K.n96 + 0.05) / 0.7))))); bigText(n + ' / 100', W / 2, Y - 20, 130, HC.red, k, { glow: 24, type: false, dark: 34 });
      bigText('FONDOS PROFESIONALES: PEOR', W / 2, Y + 80, 32, HC.white, cw(t, K.fondos1 - 0.05, K.entonces2 - 0.1), { dark: 22 }); bigText(SRC, W / 2, Y + 128, 20, HC.grey, cw(t, K.profes1, K.entonces2 - 0.1), { dark: 16 }); } }
  // L3: hacerte rico ✗ → por qué casi nadie lo consigue
  { const k = cw(t, K.rico3 - 0.1, K.micro4 - 0.2); if (k > 0.01) { bigText('HACERTE RICO', W / 2, Y, 70, HC.white, k, { a: 1 - 0.55 * win(t, K.realidad3, 0.3), dark: 26 }); strike(W / 2 - 230, W / 2 + 230, Y, win(t, K.realidad3 - 0.05, 0.3));
      bigText('POR QUÉ CASI NADIE', W / 2, Y + 96, 54, HG, cw(t, K.casi3 - 0.1, K.micro4 - 0.2), { glow: 18, dark: 26 }); bigText('LO CONSIGUE', W / 2, Y + 160, 54, HG, cw(t, K.consigue3 - 0.1, K.micro4 - 0.2), { glow: 18, dark: 26 }); } }
  // L4–L8: asignaturas
  lab(wp(P.house, 0, 0.42, 0), 'MICROECONOMÍA', 'OFERTA Y DEMANDA', cw(t, K.micro4 + 0.05, K.macro5 - 0.2), { dx: 120, dy: -160 });
  lab(wp(P.macroMon[1], 0, 0.42, 0.02), 'MACROECONOMÍA', null, cw(t, K.macro5 + 0.05, K.mates6 - 0.2), { dx: -110, dy: -170 });
  { const k = cw(t, K.mates6 - 0.05, K.econom7 - 0.15); if (k > 0.01) { bigText('MATEMÁTICAS', W / 2, Y + 230, 64, HC.white, k, { dark: 26 }); bigText('+ ESTADÍSTICA', W / 2, Y + 305, 52, HG, cw(t, K.estad6 - 0.05, K.econom7 - 0.15), { glow: 16, dark: 24 }); } }
  { const k = cw(t, K.econom7 - 0.05, K.finanzas8 - 0.15); if (k > 0.01) { bigText('ECONOMETRÍA', W / 2, Y + 230, 66, HG, k, { glow: 18, dark: 26 }); bigText('DATOS: QUÉ FUNCIONA Y QUÉ NO', W / 2, Y + 305, 30, HC.white, cw(t, K.separar7 - 0.05, K.finanzas8 - 0.15), { dark: 20 }); } }
  lab(wp(P.tower, 0, 0.8, 0), 'FINANZAS', 'CUÁNTO VALE UNA EMPRESA', cw(t, K.finanzas8 + 0.1, K.loco9 - 0.2), { dx: -120, dy: -140, color: HG });
  // L9: Nobel 2013: Fama y Shiller
  P.medals.forEach((g, i) => lab(wp(g, 0, 0.36, 0), i ? 'ROBERT SHILLER' : 'EUGENE FAMA', i ? 'LAS BURBUJAS' : 'MERCADOS EFICIENTES', cw(t, K.dos9 + i * 0.1, K.uno10 - 0.2), { dx: i ? -100 : 100, dy: i ? -170 : -40, color: i ? HC.red : HG, size: 24, subSize: 18 }));
  // L10: la burbuja
  if (P.bubble.visible) lab(P.bubble.position.clone().add(v3(0.2, 0.25, 0)), 'BURBUJA', null, cw(t, K.burbujas10 - 0.1, K.burst), { dx: 120, dy: -120, color: HC.red });
  // L11: comisiones · el fondo medio, por detrás
  lab(wp(P.cbox, 0, 0.1, 0), 'COMISIONES', null, cw(t, K.comisiones11 - 0.05, K.fondos12 - 0.2), { dx: 110, dy: -150, color: HC.red });
  { const k = cw(t, K.nunca11 - 0.1, K.fondos12 - 0.2); if (k > 0.01) { bigText('−5,5 PUNTOS', W / 2, Y, 100, HC.red, k, { glow: 20, type: false, dark: 30 }); bigText('FONDO MEDIO FRENTE A LA BOLSA', W / 2, Y + 84, 28, HC.white, k, { dark: 20 }); bigText('1.ER SEMESTRE 2026 · ' + SRC, W / 2, Y + 128, 19, HC.grey, k, { dark: 16 }); } }
  // L12: la copia de la bolsa, por delante
  lab(P.idxCurve.getPointAt(0.55), 'FONDO INDEXADO', 'COPIA A LA BOLSA', cw(t, K.copian12 + 0.1, K.para13 - 0.2), { dx: -120, dy: -160, color: '#DCE6FF' });
  { const k = cw(t, K.acaban12 - 0.05, K.para13 - 0.2); if (k > 0.01) { bigText('LA BOLSA GANÓ', W / 2, Y, 52, HC.white, k, { dark: 24 }); bigText('AL 96 % DE LOS FONDOS', W / 2, Y + 76, 48, HG, k, { glow: 16, dark: 24 }); bigText('BOLSA ESPAÑOLA · 2025 · ' + SRC, W / 2, Y + 126, 19, HC.grey, k, { dark: 16 }); } }
  // L13: humo
  { const k = cw(t, K.humo13 - 0.05, K.esto14); if (k > 0.01) bigText('HUMO', W / 2, Y + 20, 110, HC.white, k * (1 - 0.7 * clamp((t - K.humo13) / 0.9)), { type: false, dark: 30 }); }
  // L14: no es asesoramiento · ¿gestor o indexado?
  { const k = cw(t, K.esto14 - 0.05, END - 0.5); if (k > 0.01) bigText('NO ES ASESORAMIENTO FINANCIERO', W / 2, 1290, 26, HC.grey, k, { dark: 18 }); }
  // (el duelo «¿gestor o indexado?» va en el panel)
}
// ---------------------------------------------------------------- arranque: letras, tiempos de la voz, la sala, el panel, los objetos y la cámara
(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '700' }), new FontFace('SpaceMono', `url(${F}SpaceMono-Regular.ttf)`, { weight: '400' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '800' }), new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    subio1: atL(1, 'subio'), n58: atL(1, '=58'), pasado1: atL(1, 'pasado'), n96: atL(1, '=96'), fondos1: atL(1, 'fondos'), profes1: atL(1, 'profesionales'), peor1: atL(1, 'peor'),
    entonces2: atL(2, 'entonces'), para2: atL(2, '=para'), final2: atL(2, 'final'),
    crees3: atL(3, 'crees'), rico3: atL(3, 'rico'), realidad3: atL(3, 'realidad'), casi3: atL(3, 'casi'), consigue3: atL(3, 'consigue'),
    micro4: atL(4, 'microeconomia'), sube4: atL(4, 'sube'), alquiler4: atL(4, 'alquiler'),
    macro5: atL(5, 'macroeconomia'), inflacion5: atL(5, 'inflacion'), paro5: atL(5, 'paro'), crisis5: atL(5, 'crisis'),
    mates6: atL(6, 'matematicas'), estad6: atL(6, 'estadistica'), muchas6: atL(6, 'muchas'), esperas6: atL(6, 'esperas'),
    econom7: atL(7, 'econometria'), datos7: atL(7, 'datos'), separar7: atL(7, 'separar'), funciona7: atL(7, 'funciona'), no7: atL(7, '=no'),
    finanzas8: atL(8, 'finanzas'), cuanto8: atL(8, 'cuanto'), empresa8: atL(8, 'empresa'),
    loco9: atL(9, 'loco'), n2013: atL(9, '=2013'), nobel9: atL(9, 'nobel'), dos9: atL(9, '=dos'), contrario9: atL(9, 'contrario'),
    uno10: atL(10, '=uno'), otro10: atL(10, 'otro'), infla10: atL(10, 'infla'), burbujas10: atL(10, 'burbujas'),
    quien11: atL(11, 'quien'), primero11: atL(11, 'primero'), intentar11: atL(11, 'intentar'), cuesta11: atL(11, 'cuesta'), comisiones11: atL(11, 'comisiones'), nunca11: atL(11, 'nunca'), bien11: atL(11, 'bien'),
    fondos12: atL(12, 'fondos'), copian12: atL(12, 'copian'), cobran12: atL(12, 'cobran'), acaban12: atL(12, 'acaban'), todos12: atL(12, 'todos'),
    para13: atL(13, '=para'), sirve13: atL(13, 'sirve'), vendan13: atL(13, 'vendan'), humo13: atL(13, 'humo'),
    esto14: atL(14, 'esto'), asesor14: atL(14, 'asesoramiento'), dime14: atL(14, 'dime'), gestor14: atL(14, 'gestor'), indexado14: atL(14, 'indexado'),
  };
  K.pct1 = K.n58 + 0.55; K.burst = K.quien11 - 0.15;
  mats(); buildMats(); buildLights(); buildRoom(); buildFlow(); buildBoard(); buildProps();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3; }
  scene.fog = new THREE.FogExp2(0x070605, 0.045);
  post.uniforms.ca.value = 0.4; post.uniforms.vig.value = 0.42;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
