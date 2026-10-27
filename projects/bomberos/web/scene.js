// «Bomberados» (vídeo para la marca): cascos de bombero (8 de cada 10 sin plaza), las multitudes de Madrid, València y
// País Vasco, el examen tipo test contra el reloj, la criba antes de la prueba física, y la app: ruleta, test y duelos.
// Espacio 3D negro con brasas, flujo óptico y suelo espejo.
// Encima, un HUD técnico en blanco y grises (líneas guía, etiquetas monoespaciadas) dibujado en un lienzo 2D.
// window.renderAt(t) dibuja el instante t. Pensado para 60 fps.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { W, H, clamp, prog, lerp, eo, eio, ss } from './lib.js';

// ---------------------------------------------------------------- render, resplandor y acabado
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
const PR = window.PR || 1; renderer.setPixelRatio(PR); renderer.setSize(W, H); document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.localClippingEnabled = true;
const rtA = new THREE.WebGLRenderTarget(W * PR, H * PR, { type: THREE.HalfFloatType, samples: 4 });
const BLW = Math.round(W * PR / 4), BLH = Math.round(H * PR / 4);
const rtB = [0, 1].map(() => new THREE.WebGLRenderTarget(BLW, BLH, { type: THREE.HalfFloatType }));
const rtC = [0, 1].map(() => new THREE.WebGLRenderTarget(Math.round(BLW / 2), Math.round(BLH / 2), { type: THREE.HalfFloatType }));
const VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
const brightM = new THREE.ShaderMaterial({ uniforms: { tA: { value: null }, px: { value: new THREE.Vector2(1.5 / (W * PR), 1.5 / (H * PR)) }, th: { value: 1.7 } }, vertexShader: VS, depthTest: false,
  fragmentShader: `uniform sampler2D tA; uniform vec2 px; uniform float th; varying vec2 vUv;
    void main(){ vec3 c = vec3(0.); for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) c += texture2D(tA, vUv + vec2(float(i), float(j)) * px).rgb; c /= 9.0;
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
  uniforms: { tA: { value: null }, tB: { value: null }, tC: { value: null }, m0: { value: new THREE.Vector2() }, a0: { value: new THREE.Vector2() }, J: { value: new THREE.Vector4() },
    fade: { value: 0 }, white: { value: 0 }, vig: { value: 0.38 }, time: { value: 0 }, flash: { value: 0 }, bloom: { value: 0.75 }, ca: { value: 1 }, mbk: { value: 0.8 }, tint: { value: new THREE.Vector3(0, 0, 0) } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D tA, tB, tC; uniform vec2 m0, a0; uniform vec4 J; uniform vec3 tint; uniform float fade, white, vig, time, flash, bloom, ca, mbk; varying vec2 vUv;
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
      a += b * bloom;
      a = mix(a, vec3(0.0), fade); a += flash; a += tint;
      a = clamp((a*(2.51*a+0.03))/(a*(2.43*a+0.59)+0.14),0.,1.); a = pow(a, vec3(1.0/2.2));
      float lu = dot(a, vec3(0.2126,0.7152,0.0722));
      a = mix(vec3(lu), a, 1.06); a = mix(a, a*a*(3.0-2.0*a), 0.16);
      vec2 d = c*vec2(0.5625,1.0); a *= 1.0 - vig*smoothstep(0.25,0.92,length(d)*1.6);
      a += (h(vUv*vec2(1080.,1920.) + fract(time*7.13)*91.7) - 0.5) * 0.014 * (0.35 + lu);
      a = mix(a, vec3(1.0), white);
      gl_FragColor = vec4(clamp(a,0.,1.), 1.0); }`,
  depthTest: false,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post), quadScene = new THREE.Scene(); quadScene.add(quad);
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); scene.fog = new THREE.FogExp2(0x000000, 0.075);
const cam = new THREE.PerspectiveCamera(32, W / H, 0.004, 400); cam.layers.enable(1);
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
let WORDS = [], END = 59.6, VENV = [];
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
  return { p: v3(comp(1, 0), comp(1, 1), comp(1, 2)), l: v3(comp(2, 0), comp(2, 1), comp(2, 2)), f: mono(t, T, KS.map(k => k[3] || 32)), roll: mono(t, T, KS.map(k => k[4] || 0)) };
}
const keyed = (t, KS) => mono(t, KS.map(k => k[0]), KS.map(k => k[1]));     // valor escalar por claves
const sm5 = x => x * x * x * (x * (x * 6 - 15) + 10);
const win = (t, t0, d) => sm5(clamp((t - t0) / d));                           // 0→1 suave entre t0 y t0+d
const pop = (t, t0, d = 0.35) => { const u = clamp((t - t0) / d); if (u <= 0) return 0; if (u >= 1) return 1; return 1 + Math.sin(u * Math.PI * 1.15) * (1 - u) * 0.55 + (eo(u) - 1); }
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler();
let _starT = null;
function starTex0() { return _starT || (_starT = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); })); }
// opacidad de un grupo entero (las aristas aparte)
function setOp(g, a) { g.traverse(o => { if (o.material && !o.isLineSegments2 && !o.isLine2 && !o.userData.keepOp) { o.material.transparent = a < 0.999; o.material.opacity = a * (o.userData.op0 ?? 1); o.material.depthWrite = a > 0.6; o.visible = a > 0.003; } }); }
function edgeOp(g, a) { g.traverse(o => { if (o.isLineSegments2 && !o.userData.keepOp) { o.material.opacity = a; o.visible = a > 0.003; } }); }
function cyl(rt, rb, h, m, seg = 40) { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); c.castShadow = true; c.receiveShadow = true; return c; }
function sph(r, m, ws = 24, hs = 16) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), m); s.castShadow = true; return s; }
function tube(pts, r, m, seg, closed = false, rs = 8) { const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), seg || pts.length * 8, r, rs, closed), m); t.castShadow = true; return t; }
const glowM = (c, i = 2.5) => new THREE.MeshStandardMaterial({ color: 0x050505, emissive: c, emissiveIntensity: i, roughness: 0.5 });
const basicGlow = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });

// ---------------------------------------------------------------- paleta (gris/blanco + ámbar y turquesa suaves)
const COL = { amber: 0xffb547, teal: 0x5fe3d4, red: 0xff4e42, white: 0xeef2f6, grey: 0x8c939d, copper: 0xc8733f };
const TEAL3 = new THREE.Color(0.35, 1.75, 1.6), AMB3 = new THREE.Color(1.9, 1.05, 0.32);

// ---------------------------------------------------------------- luces fijas (mismo número siempre: no se recompilan sombreadores)
function buildRig() {
  const key = new THREE.SpotLight(0xfff1e4, 34, 14, 0.62, 0.75, 1.4); key.position.set(-1.7, 3.3, 2.1); key.target.position.set(0, 0.15, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.01; key.shadow.radius = 5; key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
  scene.add(key, key.target);
  const rimC = new THREE.PointLight(0x5fd8ff, 1.2, 9, 1.4); rimC.position.set(-2.3, 0.42, -1.9);
  const rimW = new THREE.PointLight(0xff8a55, 1.6, 9, 1.4); rimW.position.set(2.3, 0.48, -1.7);
  const fill = new THREE.PointLight(0xc4d4ff, 2.2, 10, 1.4); fill.position.set(0.6, 1.6, 3.2);
  scene.add(rimC, rimW, fill); S.rig = { key, rimC, rimW, fill, coilL: {}, fieldL: {}, coinL: { position: new THREE.Vector3() } };   // 4 luces: el brillo de bobinas y moneda va en el material
}
// ---------------------------------------------------------------- HUD técnico (lienzo 2D encima del 3D, siempre nítido)
const hudC = document.createElement('canvas'); hudC.width = W * PR; hudC.height = H * PR;
hudC.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none`;
document.body.appendChild(hudC);
const hg = hudC.getContext('2d');
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
  S.flow = [
    flowCloud(7000, i => [gauss(i) * 2.4, Math.abs(gauss(i + 9e3)) * 1.4 + 0.04, gauss(i + 2e4) * 2.4], { size: 1.5, bright: 0.55, seed: 1 }),                       // polvo cerca del cargador
    flowCloud(9000, i => [(hash(i * 3.1) - 0.5) * 40, 0.05 + hash(i * 5.7) * 10, (hash(i * 8.3) - 0.5) * 40 - 2], { size: 1.7, bright: 0.65, farF: 0.022, seed: 2 }),   // espacio amplio
    flowCloud(2600, i => { const th = hash(i * 1.9) * 6.283, ph = Math.acos(hash(i * 4.4) * 1.6 - 0.6), r = 55 + hash(i * 6.1) * 45; return [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)]; },
      { size: 1.3, bright: 0.9, farF: 0.002, nearF: 1, drift: 0, seed: 3 }),                                                                                        // estrellas lejanas
  ];
  // polvo diminuto alrededor de las bobinas (solo se ve en los planos macro)
  S.micro = flowCloud(1800, i => [(hash(i * 2.3) - 0.5) * 0.9, 0.01 + hash(i * 4.1) * 0.32, (hash(i * 6.7) - 0.5) * 0.9], { size: 1.4, bright: 0.7, nearF: 0.012, farF: 2.8, drift: 0.004, seed: 4, col: 0xffe3c0 });
}
const _vp = new THREE.Matrix4();
function flowUpdate(t, VP, PVP) {
  for (const m of [...S.flow, S.micro]) { const u = m.material.uniforms; u.VP.value.copy(VP); u.PVP.value.copy(PVP); u.time.value = t; }
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
  float fade = exp(-length(vW.xz) * 0.16) * exp(-0.055 * distance(vW, camP));
  gl_FragColor = vec4(vec3(0.62, 0.68, 0.76) * a * fade * op, 1.0);
}`;
function buildFloor() {
  const refl = new Reflector(new THREE.PlaneGeometry(80, 80), { textureWidth: 540 * PR, textureHeight: 960 * PR, color: 0x4d5566 }); refl.rotation.x = -Math.PI / 2; scene.add(refl);
  const d = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.84 })); d.rotation.x = -Math.PI / 2; d.position.y = 0.0006; scene.add(d);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.6 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.0012; sh.receiveShadow = true; scene.add(sh);
  S.gridM = new THREE.ShaderMaterial({ vertexShader: GRID_VS, fragmentShader: GRID_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { op: { value: 1 }, camP: { value: new THREE.Vector3() } } });
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), S.gridM); gr.rotation.x = -Math.PI / 2; gr.position.y = 0.0018; gr.layers.set(1); scene.add(gr);
  S.floor = { refl, d, sh, gr };
}
// ---------------------------------------------------------------- «Bomberados»: piezas
// paleta de fuego: oro de casco, naranja brasa, rojo de suspenso; turquesa solo para la app (lo que sí funciona)
const GOLD = 0xf2b233, EMB = 0xff7a2f, RED = 0xe0453a, TEA = 0x2fc7b6;
const CGold = new THREE.Color(2.0, 1.25, 0.3), CEmb = new THREE.Color(2.2, 0.75, 0.2), CRed = new THREE.Color(1.9, 0.25, 0.2), CTe = new THREE.Color(0.25, 1.6, 1.45);
const plasticS = (c, r = 0.28) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.05 });
const metalS = (c, r = 0.25) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 1 });
const SANS = '"Inter", "SpaceMono", sans-serif';
function signPlane(txt, { w = 1, h = 0.25, col = '#EEF2F6', bg = null, size = 0.62, font = SANS, weight = 900, ls = 0 } = {}) {
  const tw = 1024, th = Math.round(1024 * h / w);
  const tex = canvasTex(tw, th, (g, W2, H2) => { if (bg) { g.fillStyle = bg; rr(g, 4, 4, W2 - 8, H2 - 8, H2 * 0.18); g.fill(); }
    let px = Math.round(H2 * size); g.letterSpacing = ls + 'px'; g.font = `${weight} ${px}px ${font}`; const mw = g.measureText(txt).width; if (mw > W2 * 0.92) { px = Math.floor(px * W2 * 0.92 / mw); g.font = `${weight} ${px}px ${font}`; }
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W2 / 2, H2 / 2 + H2 * 0.04); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 6; return m;
}

// ---------------------------------------------------------------- casco de bombero (cúpula, ala que cae atrás, cresta y escudo)
function helmet(col) {
  const g = new THREE.Group(), m = plasticS(col, 0.22);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.scale.set(1, 0.95, 1.12); dome.castShadow = true; g.add(dome);
  const prof = []; for (let i = 0; i <= 10; i++) { const u = i / 10; prof.push(new THREE.Vector2(0.128 + u * 0.075, -0.004 - u * u * 0.02)); }
  const brim = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, side: THREE.DoubleSide })); brim.scale.set(1, 1, 1.18); brim.castShadow = true; g.add(brim);
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.011, 8, 40, Math.PI), m); ridge.rotation.y = Math.PI / 2; ridge.scale.set(1, 0.95, 1.12); g.add(ridge);
  const badge = rbox(0.06, 0.07, 0.012, metalS(0xd9dde3, 0.4), 0.012); badge.position.set(0, 0.075, 0.138); badge.rotation.x = -0.45; g.add(badge);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.135, 36, 12, -1.0, 2.0, 1.25, 0.32), new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.8 }));
  visor.scale.set(1, 0.95, 1.12); g.add(visor);
  g.userData = { m, mats: [m, brim.material] }; return g;
}
// ---------------------------------------------------------------- muñeco articulado (de «FP o carrera»)
function makeDoll(m) {
  const d = new THREE.Group(), J = {};
  const cap = (r, h) => new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 6, 14), m);
  const pivot = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  J.hip = pivot(d, 0, 0.5, 0);
  const pel = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), m); pel.scale.set(1.3, 0.8, 0.9); J.hip.add(pel);
  J.chest = pivot(J.hip, 0, 0.05, 0); const tor = cap(0.085, 0.22); tor.position.y = 0.17; tor.scale.set(1.25, 1, 0.8); J.chest.add(tor);
  J.neck = pivot(J.chest, 0, 0.36, 0); const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 18), m); head.scale.set(0.9, 1.1, 0.95); head.position.y = 0.08; J.neck.add(head);
  for (const sd of [-1, 1]) {
    const sh = pivot(J.chest, sd * 0.13, 0.31, 0); const ua = cap(0.032, 0.14); ua.position.y = -0.09; sh.add(ua);
    const el = pivot(sh, 0, -0.19, 0); const la = cap(0.028, 0.13); la.position.y = -0.085; el.add(la);
    const hp = pivot(J.hip, sd * 0.07, -0.03, 0); const ul = cap(0.042, 0.18); ul.position.y = -0.12; hp.add(ul);
    const kn = pivot(hp, 0, -0.25, 0); const ll = cap(0.036, 0.17); ll.position.y = -0.11; kn.add(ll);
    J[sd < 0 ? 'shL' : 'shR'] = sh; J[sd < 0 ? 'elL' : 'elR'] = el;
  }
  d.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  d.userData.J = J; return d;
}

// ---------------------------------------------------------------- 1: diez cascos (2 × 5) — ocho se apagan y caen
const HZ = v3(0, 0, 0);
function hpos(i) { const c = i % 2, r = Math.floor(i / 2); return v3((c - 0.5) * 0.4, 0.6 + r * 0.3, 0); }
const KEEP = [3, 6];                // los dos que consiguen plaza
function buildHelmets() {
  const G = new THREE.Group(); G.position.copy(HZ); scene.add(G);
  const hs = []; for (let i = 0; i < 10; i++) { const h = helmet(GOLD); h.position.copy(hpos(i)); G.add(h); hs.push(h); }
  const glow = KEEP.map(i => { const l = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.008, 8, 64), basicGlow(GOLD, 2.2)); l.rotation.x = Math.PI / 2; l.position.copy(hpos(i)).add(v3(0, -0.01, 0)); G.add(l); return l; });
  return { G, hs, glow };
}

// ---------------------------------------------------------------- 2-3: multitudes (una figura por aspirante)
const CZ = v3(0, 0, -12);
const REG = [{ name: 'MADRID', n: 1285, ok: 267, x: -2.4 }, { name: 'VALÈNCIA', n: 1634, ok: 92, x: 0 }, { name: 'PAÍS VASCO', n: 1170, ok: 287, x: 2.4 }];
function buildCrowds() {
  const Z = new THREE.Group(); Z.position.copy(CZ); scene.add(Z);
  const blocks = REG.map((R, k) => {
    const cols = Math.ceil(Math.sqrt(R.n * 1.1)), sp = 0.048;
    const m = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.012, 0.03, 3, 6), plasticS(0xffffff, 0.45), R.n);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(R.n * 3), 3); m.frustumCulled = false; m.castShadow = true; Z.add(m);
    const P = []; for (let i = 0; i < R.n; i++) { const c = i % cols, r = Math.floor(i / cols); P.push(v3(R.x + (c - (cols - 1) / 2) * sp + (hash(i * 1.7 + k) - 0.5) * 0.012, 0.027, -r * sp + (hash(i * 2.9 + k) - 0.5) * 0.012)); }
    // los que entran: los primeros (filas delanteras), repartidos al azar dentro de ellas
    const order = P.map((p, i) => i).sort((a, b) => (P[b].z + hash(b * 3.3) * 0.15) - (P[a].z + hash(a * 3.3) * 0.15)), okSet = new Set(order.slice(0, R.ok));
    const lab = signPlane(R.name, { w: 1.2, h: 0.2, col: '#EEF2F6' }); lab.rotation.x = -Math.PI / 2; lab.position.set(R.x, 0.004, 0.25); Z.add(lab);
    return { m, P, ok: okSet, cols, R, lab };
  });
  return { Z, blocks };
}

// ---------------------------------------------------------------- 5-7: el examen tipo test, el temario y el cronómetro
const EZ = v3(9, 0, -20), NQ = 30;
function sheetTex() {
  return canvasTex(720, 1000, (g, w, h) => {
    g.fillStyle = '#F1EEE7'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1B1F27'; g.font = '700 34px SpaceMono'; g.letterSpacing = '6px'; g.textAlign = 'left'; g.fillText('EXAMEN · TEST', 40, 66);
    g.font = '400 20px SpaceMono'; g.fillStyle = '#5C636D'; g.fillText('PRIMER EJERCICIO · ELIMINATORIO', 40, 100);
    g.fillStyle = '#C9C3B6'; g.fillRect(40, 118, w - 80, 2);
    g.font = '700 20px SpaceMono'; g.letterSpacing = '2px';
    for (let q = 0; q < NQ; q++) { const col = q < 15 ? 0 : 1, row = q % 15, x = 50 + col * 340, y = 160 + row * 55;
      g.fillStyle = '#1B1F27'; g.fillText(String(q + 1).padStart(2, '0'), x, y + 7);
      for (let o = 0; o < 4; o++) { g.strokeStyle = '#7A7468'; g.lineWidth = 2.5; g.beginPath(); g.arc(x + 70 + o * 60, y, 15, 0, 7); g.stroke(); g.fillStyle = '#7A7468'; g.font = '400 14px SpaceMono'; g.fillText('ABCD'[o], x + 65 + o * 60, y + 5); g.font = '700 20px SpaceMono'; } }
  });
}
// centro de la burbuja (opción o) de la pregunta q, en coordenadas del plano de la hoja (0,9 × 1,25 m)
function bubbleXY(q, o) { const col = q < 15 ? 0 : 1, row = q % 15, x = 50 + col * 340 + 70 + o * 60, y = 160 + row * 55; return [(x / 720 - 0.5) * 0.9, (0.5 - y / 1000) * 1.25]; }
function stopwatch() {
  const g = new THREE.Group();
  const body = cyl(0.3, 0.3, 0.09, metalS(0xc9ced6, 0.3), 64); body.rotation.x = Math.PI / 2; g.add(body);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.27, 64), new THREE.MeshBasicMaterial({ map: canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#0D0F12'; c.beginPath(); c.arc(256, 256, 256, 0, 7); c.fill();
    for (let i = 0; i < 60; i++) { const a = i / 60 * 6.283, r0 = i % 5 ? 222 : 200; c.strokeStyle = i % 5 ? '#5C636D' : '#EEF2F6'; c.lineWidth = i % 5 ? 3 : 7; c.beginPath(); c.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0); c.lineTo(256 + Math.sin(a) * 240, 256 - Math.cos(a) * 240); c.stroke(); } }), toneMapped: false }));
  face.position.z = 0.046; g.add(face);
  const arc = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.235, 64, 1, Math.PI / 2, 0.001), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.4, 0.3), transparent: true, opacity: 0.85, side: THREE.DoubleSide, toneMapped: false }));
  arc.position.z = 0.048; g.add(arc);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.24, 0.006), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.5, 0.3), toneMapped: false })); hand.geometry.translate(0, 0.1, 0); hand.position.z = 0.052; g.add(hand);
  const crown = cyl(0.04, 0.04, 0.06, metalS(0xc9ced6), 20); crown.position.y = 0.33; g.add(crown);
  const btn = cyl(0.05, 0.05, 0.03, metalS(0xc9ced6), 20); btn.position.y = 0.375; g.add(btn);
  g.userData = { hand, arc }; return g;
}
function buildExam() {
  const Z = new THREE.Group(); Z.position.copy(EZ); scene.add(Z);
  const sheet = new THREE.Group(); sheet.position.set(0, 1.0, 0); Z.add(sheet);
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.25, 0.008), [plasticS(0xe9e5dc, 0.8), plasticS(0xe9e5dc, 0.8), plasticS(0xe9e5dc, 0.8), plasticS(0xe9e5dc, 0.8), new THREE.MeshStandardMaterial({ map: sheetTex(), roughness: 0.85 }), plasticS(0xe9e5dc, 0.8)]);
  paper.castShadow = true; sheet.add(paper);
  // marcas: una por pregunta (respondida en oro, fallo en rojo); y «−0,33» que salen de los fallos
  const marks = new THREE.InstancedMesh(new THREE.CircleGeometry(0.017, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NQ);
  marks.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NQ * 3), 3); marks.frustumCulled = false; sheet.add(marks); marks.position.z = 0.0055;
  const ans = []; for (let q = 0; q < NQ; q++) ans.push({ o: Math.floor(hash(q * 4.1) * 4), wrong: hash(q * 7.7) < 0.3 });
  const minus = []; for (let k = 0; k < 6; k++) { const s = signPlane('−0,33', { w: 0.26, h: 0.09, col: '#FF5A4E', font: '"SpaceMono"', weight: 700 }); Z.add(s); minus.push(s); }
  // el temario: una pila de libros a la izquierda
  const books = new THREE.Group(); books.position.set(-0.8, 0, 0.1); Z.add(books);
  const bc = [0x8c2f2a, 0x2f4d6b, 0x6b5a2f, 0x3d6b4d, 0x5a2f6b, 0x7a3f22, 0x2f5f6b, 0x6b2f45, 0x4d4d4d, 0x8a6a2a];
  for (let i = 0; i < 10; i++) { const b = rbox(0.42 + hash(i) * 0.06, 0.07 + hash(i * 2.3) * 0.03, 0.3, plasticS(bc[i], 0.6), 0.01); b.rotation.x = Math.PI / 2; b.position.set((hash(i * 5.1) - 0.5) * 0.04, 0.05 + i * 0.1, 0); b.rotation.z = (hash(i * 3.7) - 0.5) * 0.12; books.add(b); }
  const bl = signPlane('TEMARIO', { w: 0.5, h: 0.1, col: '#EEF2F6', font: '"SpaceMono"', weight: 700, ls: 6 }); bl.position.set(-0.8, 1.15, 0.12); Z.add(bl);
  const sw = stopwatch(); sw.position.set(1.05, 1.05, 0.15); sw.scale.setScalar(0.85); Z.add(sw);
  // «leer» ≠ «entrenar»: el libro abierto frente al examen con el reloj
  const open = new THREE.Group(); open.position.set(-0.8, 1.55, 0.2); Z.add(open);
  for (const s of [-1, 1]) { const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.32), new THREE.MeshStandardMaterial({ map: canvasTex(256, 340, (c, w, h) => { c.fillStyle = '#EDE8DD'; c.fillRect(0, 0, w, h); c.fillStyle = '#8C857A'; for (let i = 0; i < 18; i++) c.fillRect(22, 30 + i * 16, 180 + hash(i * s) * 30, 5); }), side: THREE.DoubleSide, roughness: 0.8 }));
    pg.position.x = s * 0.125; pg.rotation.y = -s * 0.25; open.add(pg); }
  return { Z, sheet, marks, ans, minus, books, bl, sw, open };
}

// ---------------------------------------------------------------- 8: la criba — la puerta del test y, detrás, la torre de la prueba física
const GZ = v3(18, 0, -15);
function buildGates() {
  const Z = new THREE.Group(); Z.position.copy(GZ); scene.add(Z);
  const pm = plasticS(0xe9edf2, 0.35);
  const arch = (w, h, lab, col) => { const g = new THREE.Group(); const a = rbox(0.08, h, 0.08, pm, 0.02), b = a.clone(), c = rbox(w + 0.08, 0.1, 0.1, pm, 0.02);
    a.position.set(-w / 2, h / 2, 0); b.position.set(w / 2, h / 2, 0); c.position.set(0, h, 0); g.add(a, b, c);
    const s = signPlane(lab, { w: w * 0.9, h: 0.16, col }); s.position.set(0, h + 0.17, 0); g.add(s); return g; };
  const gT = arch(1.3, 1.0, 'TEST', '#FFB547'); gT.position.set(0, 0, 0); Z.add(gT);
  const gF = arch(1.3, 1.0, 'PRUEBA FÍSICA', '#EEF2F6'); gF.position.set(0, 0, -3.2); Z.add(gF);
  // torre de maniobras (escalera) detrás de la prueba física
  const tw = new THREE.Group(); tw.position.set(0.9, 0, -3.8); Z.add(tw);
  for (const x of [-0.18, 0.18]) { const r = cyl(0.025, 0.025, 2.6, metalS(0x8c939d), 10); r.position.set(x, 1.3, 0); tw.add(r); }
  for (let i = 0; i < 12; i++) { const r = cyl(0.015, 0.015, 0.36, metalS(0x8c939d), 8); r.rotation.z = Math.PI / 2; r.position.set(0, 0.2 + i * 0.2, 0); tw.add(r); }
  // aspirantes: casi todos se quedan en el test (rojos), unos pocos pasan a la física y aún menos la superan
  const N = 420, figs = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.03, 0.07, 3, 8), plasticS(0xffffff, 0.45), N);
  figs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); figs.frustumCulled = false; figs.castShadow = true; Z.add(figs);
  const F = []; for (let i = 0; i < N; i++) { const k = hash(i * 2.7), stage = k < 0.8 ? 0 : k < 0.95 ? 1 : 2;   // 80 % caen en el test, 15 % en la física (ilustrativo)
    const zz = stage === 0 ? 0.3 + hash(i * 4.1) * 1.6 : stage === 1 ? -0.4 - hash(i * 4.1) * 2.4 : -3.5 - hash(i * 4.1) * 0.8;
    F.push({ stage, x: (hash(i * 6.3) - 0.5) * (stage === 0 ? 2.2 : 1.1), z: zz, d: hash(i * 8.8) }); }
  return { Z, figs, F, gT, gF, tw };
}

// ---------------------------------------------------------------- 9-12: la app — ruleta del temario, pregunta, duelo en directo, contra la IA
const AZ = v3(4, 0, -32);
const TOPICS = ['LEGISLACIÓN', 'FÍSICA', 'QUÍMICA', 'CALLEJERO', 'CONSTRUCCIÓN', 'P. AUXILIOS', 'HIDRÁULICA', 'PSICOTÉCNICO'];
const TCOL = ['#F2B233', '#2FC7B6', '#E0453A', '#EEF2F6', '#FF7A2F', '#62E3D4', '#B98BFF', '#FFD36B'];
function buildApp() {
  const Z = new THREE.Group(); Z.position.copy(AZ); scene.add(Z);
  // ruleta
  const wheel = new THREE.Group(); wheel.position.set(0, 1.35, 0); Z.add(wheel);
  const wt = canvasTex(1024, 1024, (g, w, h) => { const n = TOPICS.length;
    for (let i = 0; i < n; i++) { g.fillStyle = TCOL[i]; g.beginPath(); g.moveTo(512, 512); g.arc(512, 512, 500, i / n * 6.2832 - Math.PI / 2, (i + 1) / n * 6.2832 - Math.PI / 2); g.closePath(); g.fill();
      g.save(); g.translate(512, 512); g.rotate((i + 0.5) / n * 6.2832 - Math.PI / 2); g.fillStyle = i === 3 || i === 7 ? '#14171C' : '#0B0D10'; g.font = '900 44px Inter'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(TOPICS[i], 470, 0); g.restore(); }
    g.fillStyle = '#0B0D10'; g.beginPath(); g.arc(512, 512, 90, 0, 7); g.fill(); g.strokeStyle = '#EEF2F6'; g.lineWidth = 10; g.beginPath(); g.arc(512, 512, 500, 0, 7); g.stroke(); });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 96), [plasticS(0x16191e, 0.4), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.35 }), plasticS(0x16191e, 0.4)]);
  disc.rotation.x = Math.PI / 2; disc.castShadow = true; wheel.add(disc);
  const ptr = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 3), plasticS(0xeef2f6, 0.25)); ptr.rotation.z = Math.PI; ptr.position.set(0, 0.51, 0.04); wheel.add(ptr);
  // tarjeta de pregunta
  const card = new THREE.Group(); card.position.set(0, 1.35, 0.25); Z.add(card);
  const ct = canvasTex(720, 900, (g, w, h) => { g.fillStyle = '#F1EEE7'; rr(g, 0, 0, w, h, 40); g.fill(); g.fillStyle = '#1B1F27'; g.font = '700 30px SpaceMono'; g.letterSpacing = '4px'; g.fillText('CALLEJERO · 12/20', 40, 70);
    g.fillStyle = '#9AA3AE'; for (let i = 0; i < 3; i++) { rr(g, 40, 120 + i * 40, [600, 520, 380][i], 20, 10); g.fill(); }
    for (let o = 0; o < 4; o++) { g.strokeStyle = '#7A7468'; g.lineWidth = 4; rr(g, 40, 300 + o * 130, w - 80, 100, 24); g.stroke(); g.fillStyle = '#1B1F27'; g.font = '900 40px Inter'; g.fillText('ABCD'[o], 75, 365 + o * 130); g.fillStyle = '#B7B0A3'; rr(g, 140, 340 + o * 130, 300 + hash(o) * 160, 20, 10); g.fill(); } });
  const cardM = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.9), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.6, transparent: true })); card.add(cardM);
  const okBar = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.9, 1.1), transparent: true, opacity: 0.0, toneMapped: false })); okBar.position.set(0, -0.03, 0.002);   // la opción B (fila 430-530 de 900 px) card.add(okBar);
  // duelo: dos opositores y la IA
  const duel = new THREE.Group(); duel.position.set(0, 0, -0.2); Z.add(duel);
  const dA = makeDoll(plasticS(GOLD, 0.3)), dB = makeDoll(plasticS(TEA, 0.3)); dA.scale.setScalar(1.2); dB.scale.setScalar(1.2); dA.position.set(-0.55, 0, 0); dB.position.set(0.55, 0, 0); dA.rotation.y = 0.5; dB.rotation.y = -0.5; duel.add(dA, dB);
  const ai = new THREE.Group(); ai.position.set(0.55, 0.9, 0); duel.add(ai);
  const aiHead = rbox(0.34, 0.28, 0.28, plasticS(0x1a1d22, 0.3), 0.06); ai.add(aiHead);
  const aiEye = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.0, 1.9), toneMapped: false })); aiEye.position.z = 0.142; ai.add(aiEye);
  const aiLab = signPlane('IA', { w: 0.2, h: 0.1, col: '#62E3D4', font: '"SpaceMono"', weight: 700 }); aiLab.position.set(0, 0.24, 0); ai.add(aiLab);
  const vs = signPlane('VS', { w: 0.4, h: 0.22, col: '#FF7A2F' }); vs.position.set(0, 1.0, 0.1); duel.add(vs);
  const bars = [-1, 1].map(s => { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.05), new THREE.MeshBasicMaterial({ color: s < 0 ? CGold : CTe, toneMapped: false })); b.position.set(s * 0.55, 1.35, 0.05); duel.add(b); return b; });
  // cierre: el nombre de la marca
  const end = new THREE.Group(); end.position.set(0, 1.45, 0.3); Z.add(end);
  const title = signPlane('BOMBERADOS', { w: 0.95, h: 0.19, col: '#FFFFFF' }); end.add(title);
  const sub = signPlane('LA APP PARA OPOSITORES A BOMBERO', { w: 0.85, h: 0.05, col: '#FFB547', font: '"SpaceMono"', weight: 700, ls: 4 }); sub.position.y = -0.16; end.add(sub);
  return { Z, wheel, disc, card, cardM, okBar, duel, dA, dB, ai, vs, bars, end, title, sub };
}
// ---------------------------------------------------------------- estado de la escena en cada instante (todo es función de t)
const wpos = (o, v = new THREE.Vector3()) => o.getWorldPosition(v);
const popS = (t, t0, d = 0.35) => Math.max(1e-4, pop(t, t0, d));
function loopT(t) { return t > END - 0.72 ? t - END : t; }      // al final, el principio otra vez (bucle)
const _ec = new THREE.Color(), _m = new THREE.Matrix4(), _qq = new THREE.Quaternion(), _ee = new THREE.Euler(), _pp = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
const GREY = new THREE.Color(0x3a3c40), DIMC = new THREE.Color(0.16, 0.17, 0.19);

// 1: los diez cascos — se tiñen de rojo al decir «ocho» y caen al decir «se quedan sin plaza»; los dos que quedan brillan
function helmetsAt(t) {
  const H = S.helm, tt = loopT(t), inLoop = t > END - 0.72;
  const vis = tt < K.ultima + 0.7; H.G.visible = vis; if (!vis) return;
  let n = 0;
  H.hs.forEach((h, i) => {
    const P = hpos(i), keep = KEEP.includes(i), idx = keep ? -1 : n++;
    const red = keep || inLoop ? 0 : sm5(clamp((tt - K.ocho - (7 - idx) * 0.06) / 0.2));
    const fall = keep || inLoop ? 0 : clamp((tt - K.quedan - idx * 0.05) / 0.9);
    const y = P.y - (fall > 0 ? Math.min(P.y - 0.09, 4.5 * fall * fall * 0.81) : 0);
    h.position.set(P.x + fall * (hash(i * 3.1) - 0.5) * 0.5, y, P.z + fall * (hash(i * 5.7) - 0.3) * 0.6);
    h.rotation.set(0.25 + 0.06 * Math.sin(tt * 1.3 + i) + fall * (2 + hash(i) * 3), Math.sin(tt * 0.8 + i * 0.7) * 0.35 + fall * 2, fall * (hash(i * 9) - 0.5) * 4);
    const dark = keep || inLoop ? 0 : sm5(clamp((tt - K.quedan - idx * 0.05) / 0.35));
    _ec.set(GOLD).lerp(new THREE.Color(RED), red * (1 - dark)).lerp(GREY, dark);
    H.hs[i].userData.mats.forEach(m => { m.color.copy(_ec); m.emissive.copy(_ec).multiplyScalar(keep ? 0.12 + 0.25 * sm5(clamp((tt - K.plaza) / 0.4)) : 0.05 * red * (1 - dark)); });
  });
  H.glow.forEach((g, k) => { const a = inLoop ? 0 : sm5(clamp((tt - K.plaza + 0.1) / 0.4)); g.visible = a > 0.01; g.scale.setScalar(0.6 + 0.4 * a + 0.04 * Math.sin(tt * 6 + k)); });
}
// 2-3: multitudes — aparecen por filas; en Madrid y València se encienden en oro los que entran; en el País Vasco, rojo el 75 % que suspende
function crowdsAt(t) {
  const C = S.crowd, vis = t > K.ultima - 1.0 && t < K.uno + 0.2; C.Z.visible = vis; if (!vis) return;
  const t0s = [K.ultima + 0.2, K.valencia - 0.3, K.pais - 0.4], fdur = [K.personas - K.ultima - 0.2, K.aspirantes - K.valencia + 0.3, 0.6], tok = [K.doscientas, K.noventa, K.setenta];
  C.blocks.forEach((B, k) => {
    const rows = Math.ceil(B.R.n / B.cols);
    B.P.forEach((P, i) => {
      const r = Math.floor(i / B.cols), app = sm5(clamp((t - t0s[k] - (r / rows) * fdur[k]) / 0.25)), ok = B.ok.has(i), lit = sm5(clamp((t - tok[k] - hash(i * 1.3) * 0.25) / 0.3));
      let sink = 0;
      if (k === 2 && !ok) sink = lit;
      _m.compose(_pp.set(P.x, P.y - sink * 0.02, P.z), _qq.identity(), _one.set(Math.max(1e-3, app), Math.max(1e-3, app * (1 - 0.6 * sink)), Math.max(1e-3, app))); B.m.setMatrixAt(i, _m);
      if (ok) _ec.setRGB(0.75, 0.78, 0.82).lerp(CGold, lit); else _ec.setRGB(0.75, 0.78, 0.82).lerp(k === 2 ? CRed : DIMC, lit);
      B.m.setColorAt(i, _ec);
    });
    _one.set(1, 1, 1); B.m.instanceMatrix.needsUpdate = true; B.m.instanceColor.needsUpdate = true;
    B.lab.material.opacity = sm5(clamp((t - t0s[k]) / 0.4));
  });
}
// 5-7: el examen — se rellenan las respuestas, los fallos se ponen rojos y restan; el cronómetro se queda sin tiempo
function examAt(t) {
  const E = S.exam, vis = t > K.uno - 1.0 && t < K.duro + 0.5; E.Z.visible = vis; if (!vis) return;
  const nAns = Math.floor(NQ * 0.72 * clamp((t - K.decenas + 0.2) / Math.max(0.8, K.contestar - K.decenas)));
  let n = 0; const wr = t > K.fallo - 0.05;
  E.ans.forEach((a, q) => { if (q >= nAns) return; const [x, y] = bubbleXY(q, a.o); _m.makeTranslation(x, y, 0); E.marks.setMatrixAt(n, _m);
    _ec.copy(a.wrong && wr ? CRed : new THREE.Color(0.12, 0.12, 0.14)); E.marks.setColorAt(n, _ec); n++; });
  E.marks.count = n; E.marks.instanceMatrix.needsUpdate = true; if (E.marks.instanceColor) E.marks.instanceColor.needsUpdate = true;
  const wrongQs = E.ans.map((a, q) => q).filter(q => E.ans[q].wrong && q < nAns);
  E.minus.forEach((m, k) => { const q = wrongQs[k], u = clamp((t - K.resta + 0.1 - k * 0.08) / 1.2); m.visible = q !== undefined && u > 0 && u < 1;
    if (!m.visible) return; const [x, y] = bubbleXY(q, E.ans[q].o); m.position.set(x + 0.12, 1.0 + y + u * 0.35, 0.05); m.material.opacity = 1 - u * u; });
  // cronómetro: la aguja corre y el arco rojo se llena hasta «no llegar a contestar»
  const tw = clamp((t - K.tiempo + 0.2) / Math.max(0.6, K.contestar - K.tiempo + 0.2));
  E.sw.userData.hand.rotation.z = -tw * 6.2832 * 3; E.sw.userData.arc.geometry.dispose();
  E.sw.userData.arc.geometry = new THREE.RingGeometry(0.2, 0.235, 64, 1, Math.PI / 2 - tw * 6.2832, Math.max(0.001, tw * 6.2832));
  E.sw.userData.arc.material.opacity = 0.85 * (t > K.contestar ? 0.5 + 0.5 * Math.sign(Math.sin(t * 18)) : 1);
  E.sw.scale.setScalar(popS(t, K.tiempo - 0.25, 0.4)); E.sw.visible = t > K.tiempo - 0.3;
  // leer ≠ entrenar: el temario aparece al nombrarlo y el libro abierto sobre la pila
  E.books.visible = E.bl.visible = t > K.tres - 0.25; E.books.scale.setScalar(popS(t, K.tres - 0.25, 0.45)); E.bl.material.opacity = sm5(clamp((t - K.tres) / 0.3));
  E.open.visible = t > K.leerse - 0.2; E.open.scale.setScalar(popS(t, K.leerse - 0.2, 0.4)); E.open.rotation.y = 0.15 * Math.sin(t);
}
// 8: la criba — casi todos se quedan en la puerta del test
function gatesAt(t) {
  const G = S.gates, vis = t > K.duro - 1.0 && t < K.eso + 0.5; G.Z.visible = vis; if (!vis) return;
  const fall = sm5(clamp((t - K.cae + 0.1) / 0.5));
  G.F.forEach((f, i) => { const red = f.stage === 0 ? fall : 0, tip = f.stage === 0 ? clamp((t - K.cae - f.d * 0.4) / 0.35) : 0;
    _ee.set(tip * 1.45, f.d * 6, 0); _qq.setFromEuler(_ee); _m.compose(_pp.set(f.x, 0.065 - tip * 0.03, f.z), _qq, _one.set(1, 1, 1)); G.figs.setMatrixAt(i, _m);
    _ec.setRGB(0.75, 0.78, 0.82).lerp(f.stage === 2 ? CGold : CRed, f.stage === 2 ? sm5(clamp((t - K.antes) / 0.4)) : red); G.figs.setColorAt(i, _ec); });
  G.figs.instanceMatrix.needsUpdate = true; G.figs.instanceColor.needsUpdate = true;
}
// 9-12: la app
function appAt(t) {
  const A = S.app, tt = t, vis = t > K.eso - 1.0 && t < END - 0.3; A.Z.visible = vis; if (!vis) return;
  // el nombre: aparece en «Bomberados», se va al girar la ruleta y vuelve al final
  const t1 = popS(t, K.bomberados9 - 0.05, 0.45) * (1 - sm5(clamp((t - K.giras + 0.25) / 0.3))), t2 = popS(t, K.bomberados12 - 0.05, 0.5);
  const tk = t < K.giras ? t1 : t2; A.end.visible = tk > 0.01; A.end.scale.setScalar(Math.max(1e-3, tk)); A.sub.visible = t < K.giras || t > K.bomberados12 + 0.2;
  // ruleta: gira y frena en «CALLEJERO»
  const wv = t > K.giras - 0.3 && t < K.compites + 0.2; A.wheel.visible = wv;
  if (wv) { const u = clamp((t - K.giras + 0.2) / Math.max(0.8, K.haces - K.giras + 0.2)), target = 3.5 / 8 * 6.2832; A.disc.rotation.y = target + (1 - eo(u)) * 6.2832 * 3;
    A.wheel.scale.setScalar(Math.max(1e-3, popS(t, K.giras - 0.3, 0.4) * (1 - sm5(clamp((t - K.haces + 0.1) / 0.4))))); A.wheel.position.set(0, 1.35 + 0.35 * sm5(clamp((t - K.haces + 0.1) / 0.4)), -0.3 * sm5(clamp((t - K.haces) / 0.4))); }
  // pregunta: aparece en «haces test» y se acierta la B
  const cv = t > K.haces - 0.2 && t < K.compites + 0.3; A.card.visible = cv;
  if (cv) { A.card.scale.setScalar(popS(t, K.haces - 0.2, 0.4) * (1 - sm5(clamp((t - K.compites) / 0.3)))); A.okBar.material.opacity = 0.85 * sm5(clamp((t - K.test10 - 0.35) / 0.2)); A.card.rotation.y = 0.12 * Math.sin(t * 1.5); }
  // duelo en directo y, después, contra la IA
  const dv = t > K.compites - 0.3 && t < K.bomberados12 - 0.05; A.duel.visible = dv;
  if (dv) { const ia = sm5(clamp((t - K.inteligencia + 0.1) / 0.35));
    A.duel.scale.setScalar(popS(t, K.compites - 0.3, 0.45) * (1 - sm5(clamp((t - K.bomberados12 + 0.35) / 0.3))));
    A.dB.scale.setScalar(Math.max(1e-3, 1.2 * (1 - ia))); A.ai.scale.setScalar(Math.max(1e-3, ia)); A.ai.rotation.y = -0.5 + 0.2 * Math.sin(t * 2);
    const cheer = sm5(clamp((t - K.jugando) / 0.3)) * (1 - sm5(clamp((t - K.bomberados12 + 0.4) / 0.3)));
    for (const [d, s] of [[A.dA, -1], [A.dB, 1]]) { const J = d.userData.J; J.shL.rotation.set(0, 0, -0.15 - 2.5 * cheer * (s < 0 ? 1 : 0)); J.shR.rotation.set(0, 0, 0.15 + 2.5 * cheer * (s < 0 ? 1 : 0)); J.neck.rotation.x = 0.05 * Math.sin(t * 8); }
    A.bars.forEach((b, k) => { const v = clamp((t - K.compites) / 4) * (k ? 0.75 : 0.9) + 0.06 * Math.sin(t * 5 + k); b.scale.x = Math.max(0.02, v); b.position.x = (k ? 0.55 : -0.55) - 0.25 * (1 - b.scale.x); });
  }
}
function stageAt(t) { helmetsAt(t); crowdsAt(t); examAt(t); gatesAt(t); appAt(t); }
// ---------------------------------------------------------------- cámara: cascos (0,·,0) → multitudes (0,·,-12) → examen (9,·,-20) → criba (18,·,-15) → app (4,·,-32)
// zonas lejos unas de otras: cada vuelo atraviesa el campo de brasas y deja estelas
let CK = [], CK_OPEN = [];
function buildCam() {
  // primer segundo: pegados al escudo del casco de arriba, entre brasas; luego se abre la rejilla de diez
  CK_OPEN = [
    [-1.5, [-0.15, 1.9, 0.68], [-0.2, 1.8, 0.08], 32, 0.03],
    [0.0, [-0.16, 1.89, 0.56], [-0.2, 1.8, 0.08], 32, 0.05],
    [0.6, [-0.11, 1.72, 0.95], [-0.17, 1.68, 0.0], 32, 0.02],
  ];
  CK = [
    ...CK_OPEN,
    [K.diez, [0.1, 1.36, 4.6], [0, 1.3, 0], 32, 0.01],
    [K.quedan, [0.05, 1.34, 4.8], [0, 1.3, 0], 32],
    [K.plaza + 0.2, [0.25, 1.3, 4.4], [0, 1.28, 0], 32, -0.01],
    // Madrid: 1.285 figuras para 267 plazas
    [K.ultima + 0.15, [-2.4, 4.6, -7.6], [-2.4, 0, -12.3], 32, 0.03],
    [K.doscientas + 0.4, [-2.37, 4.4, -7.9], [-2.4, 0, -12.32], 32],
    // València y el País Vasco
    [K.valencia + 0.05, [0, 5.0, -7.3], [0, 0, -12.35], 32, -0.02],
    [K.noventa + 0.35, [0.03, 4.8, -7.55], [0, 0, -12.35], 32],
    [K.pais + 0.05, [2.4, 4.6, -7.6], [2.4, 0, -12.3], 32, 0.02],
    [K.examen3 + 0.2, [2.37, 4.4, -7.9], [2.4, 0, -12.32], 32],
    // ¿por qué? se eleva sobre las tres
    [K.porque + 0.15, [0.1, 11.0, -4.0], [0, 0, -12.4], 50],
    [K.gente + 0.3, [0.05, 12.0, -3.5], [0, 0, -12.2], 50],
    // el examen
    [K.uno + 0.1, [9.2, 1.2, -15.4], [9, 1.05, -20], 32, 0.02],
    [K.decenas, [9.12, 1.15, -15.6], [9, 1.05, -20], 32],
    [K.fallo, [9.05, 1.12, -15.75], [8.98, 1.05, -20], 32],
    [K.resta + 0.5, [9.1, 1.12, -15.7], [9.0, 1.05, -20], 32],
    // el tiempo
    [K.tiempo + 0.1, [10.2, 1.3, -17.45], [10.05, 1.05, -19.85], 32, -0.02],
    [K.contestar + 0.3, [10.12, 1.25, -17.8], [10.05, 1.05, -19.85], 32],
    // leer ≠ entrenar: plano general de temario, examen y reloj
    [K.tres + 0.1, [9.18, 1.55, -11.0], [9.2, 1.0, -20], 32],
    [K.examen7 + 0.3, [9.22, 1.53, -11.4], [9.2, 1.0, -20], 32],
    // la criba: la puerta del test y, al fondo, la prueba física
    [K.duro + 0.1, [18.9, 1.5, -10.9], [18.3, 0.9, -17.5], 32, 0.02],
    [K.cae, [18.1, 2.4, -11.6], [18, 0.2, -15.4], 34],
    [K.test8 + 0.3, [17.9, 2.6, -11.9], [18, 0.2, -15.6], 34],
    // la app: el nombre, la ruleta, la pregunta, el duelo y la IA
    [K.existe + 0.2, [4, 1.5, -28.3], [4, 1.45, -31.7], 32, 0.03],
    [K.opositores9, [4, 1.5, -28.5], [4, 1.45, -31.7], 32],
    [K.giras + 0.1, [4.05, 1.45, -27.8], [4, 1.35, -32], 32],
    [K.haces + 0.1, [4.1, 1.42, -29.5], [4, 1.36, -31.75], 32],
    [K.compites + 0.2, [4.0, 1.25, -26.7], [4, 0.85, -32.2], 32],
    [K.inteligencia, [4.15, 1.25, -26.8], [4.13, 0.88, -32.2], 32],
    [K.estudias + 0.2, [3.9, 1.2, -26.9], [4, 0.85, -32.2], 32, -0.02],
    [K.dia11, [4.0, 1.25, -26.7], [4, 0.88, -32.2], 32],
    // cierre: la marca
    [K.bomberados12 + 0.15, [4, 1.5, -28.4], [4, 1.42, -31.7], 32],
    [END - 0.75, [4, 1.5, -28.6], [4, 1.42, -31.7], 32],
  ];
}
function blendCam(A, B, w) { return { p: A.p.clone().lerp(B.p, w), l: A.l.clone().lerp(B.l, w), f: lerp(A.f, B.f, w), roll: lerp(A.roll, B.roll, w) }; }
function camAt(t) {
  let c = camKeys(t, CK);
  const we = win(t, END - 0.72, 0.62); if (we > 0) c = blendCam(c, camKeys(t - END, CK_OPEN), we);   // golpe rápido de vuelta a los cascos (bucle)
  let sh = 0; for (const [t0, a] of [[K.quedan + 0.3, 0.012], [K.setenta, 0.006], [K.fallo, 0.006], [K.contestar, 0.008], [K.cae, 0.01], [K.bomberados9, 0.008], [K.bomberados12, 0.008]]) if (t > t0) sh += a * Math.exp(-(t - t0) * 8);
  if (sh > 1e-4) { c.p.x += sh * Math.sin(t * 97); c.p.y += sh * Math.cos(t * 83); }
  return c;
}
// las luces acompañan a lo que se mira (siempre las mismas 4)
function rigFollow(l) { const R = S.rig; R.key.position.set(l.x - 1.7, Math.max(l.y, 0.6) + 3.0, l.z + 2.1); R.key.target.position.set(l.x, Math.max(0, l.y - 0.6), l.z); R.key.target.updateMatrixWorld();
  R.rimC.position.set(l.x - 2.3, 0.6, l.z - 1.9); R.rimW.position.set(l.x + 2.3, 0.7, l.z - 1.7); R.fill.position.set(l.x + 0.6, l.y + 1.4, l.z + 3.2); }
// ---------------------------------------------------------------- HUD: cabecera (tema + marca), cifras grandes, etiquetas y sellos
const ckk = (t, t0, t1, d = 0.6) => (t < t0 || t > t1 + 0.3 ? 0 : clamp((t - t0) / d));
const ckf = (t, t1) => 1 - win(t, t1, 0.28);
function co(t, t0, t1, anchor, txt, sub, o = {}) { const k = ckk(t, t0, t1, o.d || 0.6); if (k > 0) callout(anchor, txt, sub, k, { ...o, fade: ckf(t, t1) }); }
let SECT = [];
function buildHudPlan() {
  SECT = [[-9, 'LOS DATOS'], [K.porque, 'POR QUÉ SE SUSPENDE'], [K.duro, 'DÓNDE SE CAE'], [K.eso, 'LA SOLUCIÓN']];
}
function sectAt(t) { let s = SECT[0][1]; for (const [t0, x] of SECT) if (t >= t0 - 0.05) s = x; return s; }
function headerB(t, sub) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '7px'; hfont(40); hg.textAlign = 'left'; hg.fillStyle = '#F2B233'; hg.fillText('OPOSICIÓN A BOMBERO', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(sub, 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 198, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '5px'; hfont(30); hg.fillStyle = HC.white; hg.fillText('BOMBERADOS', 1024, 150);
  hg.restore();
}
function pill(txt, t, t0, t1, y = 1540, col = HC.white) { const k = ckk(t, t0, t1, 0.4) * ckf(t, t1); if (k <= 0) return; hg.save(); hg.globalAlpha = k; hfont(21, false); hg.letterSpacing = '3px';
  const w = hg.measureText(txt).width + 60; hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, 540 - w / 2, y - 28, w, 56, 28); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 1.5; hg.stroke();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(typed(txt, k * 1.5), 540, y + 1); hg.restore(); }
function bigPill(txt, t, t0, t1, y, col) { const k = ckk(t, t0, t1, 0.4) * ckf(t, t1); if (k <= 0) return; hg.save(); hg.globalAlpha = k; const yy = y + 6 * Math.sin(t * 6);
  hfont(36); hg.letterSpacing = '4px'; const w = hg.measureText(txt).width + 90; glowStroke(col, 3, 18); hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, 540 - w / 2, yy - 50, w, 100, 50); hg.fill(); hg.stroke(); noGlow();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(txt, 540, yy + 2); hg.restore(); }
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function hudAt(t) {
  hudBegin();
  const tt = loopT(t), A = S.app, E = S.exam, G = S.gates;
  headerB(t, sectAt(t));
  // ---- 1: 8 de cada 10 sin plaza
  const k1 = ckk(tt, K.ocho - 0.05, K.ultima - 0.1, 0.25) * ckf(tt, K.ultima - 0.1);
  if (k1 > 0) { const gr = hg.createLinearGradient(0, 1460, 0, 1860); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.45, `rgba(0,0,0,${0.72 * k1})`); gr.addColorStop(1, `rgba(0,0,0,${0.72 * k1})`); hg.fillStyle = gr; hg.fillRect(0, 1460, W, 400); }
  if (k1 > 0) { const n = Math.min(8, Math.floor(clamp((tt - K.ocho) / 0.55) * 8 + 0.999)), pb = tt > K.quedan ? Math.exp(-(tt - K.quedan) * 5) : 0;
    bigText(`${n} / 10`, 540, 1660, Math.round(140 * (1 + 0.2 * pb)), HC.red, k1, { type: false, glow: 28 + 30 * pb, ls: 6 });
    bigText('SIN PLAZA', 540, 1770, 44, HC.white, k1 * clamp((tt - K.quedan + 0.1) / 0.3), { ls: 10 }); }
  // ---- 2: Madrid
  const km = ckk(t, K.ultima + 0.15, K.valencia - 0.2, 0.3) * ckf(t, K.valencia - 0.2);
  if (km > 0) { bigText(fmt(1285 * clamp((t - K.ultima - 0.2) / (K.personas - K.ultima - 0.2))), 540, 1330, 120, HC.white, km, { type: false, glow: 18, ls: 6 });
    bigText('PRESENTADOS', 540, 1420, 30, HC.grey, km, { ls: 8 });
    bigText('267 PLAZAS', 540, 1500, 64, '#F2B233', km * clamp((t - K.doscientas + 0.1) / 0.3), { type: false, glow: 20, ls: 6 }); }
  pill('COMUNIDAD DE MADRID · BOMBERO ESPECIALISTA · 2025', t, K.ultima, K.valencia - 0.2, 1620);
  // ---- 3: València y País Vasco
  const kv = ckk(t, K.valencia - 0.05, K.pais - 0.2, 0.3) * ckf(t, K.pais - 0.2);
  if (kv > 0) { bigText(fmt(1634 * clamp((t - K.valencia + 0.3) / (K.aspirantes - K.valencia))), 540, 1330, 120, HC.white, kv, { type: false, glow: 18, ls: 6 });
    bigText('ASPIRANTES', 540, 1420, 30, HC.grey, kv, { ls: 8 });
    bigText('92 PLAZAS', 540, 1500, 64, '#F2B233', kv * clamp((t - K.noventa + 0.1) / 0.3), { type: false, glow: 20, ls: 6 }); }
  pill('AYUNTAMIENTO DE VALÈNCIA · 2026', t, K.valencia, K.pais - 0.2, 1620);
  const kp = ckk(t, K.setenta - 0.05, K.porque - 0.35, 0.3) * ckf(t, K.porque - 0.35);
  if (kp > 0) { bigText(`${Math.round(75 * sm5(clamp((t - K.setenta) / 0.6)))} %`, 540, 1340, 150, HC.red, kp, { type: false, glow: 30, ls: 6 });
    bigText('SUSPENDIÓ EL PRIMER EXAMEN', 540, 1460, 36, HC.white, kp * clamp((t - K.suspendio3 + 0.1) / 0.3), { ls: 6 }); }
  pill('OPE ÁLAVA Y GIPUZKOA · DATO DEL GOBIERNO VASCO', t, K.pais, K.porque - 0.35, 1620);
  // ---- 4: ¿por qué?
  bigText('¿POR QUÉ?', 540, 1380, 130, '#FF7A2F', ckk(t, K.porque - 0.05, K.uno - 0.1, 0.3) * ckf(t, K.uno - 0.1), { glow: 30, ls: 12 });
  // ---- 5: el test
  stamp('ELIMINATORIO', 540, 1500, ckk(t, K.eliminatorio - 0.05, K.temario5 + 0.6, 0.3) * ckf(t, K.temario5 + 0.6), HC.red, 70);
  if (E.Z.visible) { co(t, K.decenas - 0.05, K.manana + 0.4, v3(EZ.x + 0.3, 1.45, EZ.z + 0.01), 'DECENAS DE PREGUNTAS', null, { dx: 100, dy: -170, color: HC.white, d: 0.4, bg: true });
    bigText('1 SOLA MAÑANA', 540, 1560, 54, '#F2B233', ckk(t, K.sola - 0.05, K.algunas, 0.3) * ckf(t, K.algunas), { type: false, glow: 14, ls: 6 });
    co(t, K.fallo - 0.05, K.dos6 - 0.1, v3(EZ.x - 0.2, 1.25, EZ.z + 0.01), 'CADA FALLO RESTA', null, { dx: -100, dy: -200, color: HC.red, d: 0.35, bg: true });
  // ---- 6: el tiempo
    co(t, K.psicotecnico - 0.1, K.tres - 0.1, wpos(E.sw).add(v3(0, 0.33, 0.05)), 'PSICOTÉCNICO', 'CONTRA EL RELOJ', { dx: -110, dy: -170, color: HC.white, d: 0.35, bg: true });
    stamp('SIN CONTESTAR', 540, 1520, ckk(t, K.contestar - 0.05, K.tres - 0.1, 0.3) * ckf(t, K.tres - 0.1), HC.red, 66);
  // ---- 7: leer ≠ entrenar
    co(t, K.leerse - 0.05, K.duro - 0.1, v3(EZ.x - 0.8, 1.75, EZ.z + 0.2), 'LEER', null, { dx: -60, dy: -170, color: HC.grey, d: 0.35 });
    co(t, K.entrenar - 0.1, K.duro - 0.1, v3(EZ.x + 1.05, 1.35, EZ.z + 0.15), 'ENTRENAR', null, { dx: 60, dy: -230, color: '#F2B233', d: 0.35 });
    bigText('≠', 540, 1380, 220, HC.white, ckk(t, K.entrenar - 0.2, K.duro - 0.1, 0.3) * ckf(t, K.duro - 0.1), { type: false, glow: 20 }); }
  // ---- 8: la criba
  if (G.Z.visible) { co(t, K.cae - 0.05, K.eso - 0.1, wpos(G.gT).add(v3(-0.5, 0.15, 0.6)), 'LA MAYORÍA CAE AQUÍ', null, { dx: 60, dy: 230, color: HC.red, d: 0.35, bg: true, size: 34 });
    co(t, K.duro + 0.3, K.cae + 0.2, wpos(G.gF).add(v3(0, 1.2, 0)), 'LO DURO NO ES ESTO', null, { dx: 80, dy: -160, color: HC.white, d: 0.35, bg: true }); }
  // ---- 9-11: la app
  if (A.wheel.visible) co(t, K.ruleta - 0.05, K.haces, wpos(A.wheel).add(v3(0.5, 0.45, 0.05)), 'RULETA DEL TEMARIO', null, { dx: 60, dy: -150, color: '#F2B233', d: 0.35 });
  if (A.duel.visible) { co(t, K.directo - 0.1, K.inteligencia - 0.1, wpos(A.dA).add(v3(0, 0.9, 0)), 'EN DIRECTO', 'CONTRA OTROS OPOSITORES', { dx: -90, dy: -200, color: '#F2B233', d: 0.35 });
    co(t, K.inteligencia - 0.05, K.estudias, wpos(A.ai).add(v3(0, 0.15, 0)), 'CONTRA LA IA', null, { dx: 80, dy: -180, color: '#62E3D4', d: 0.35 });
    // reloj de la partida
    const kr = ckk(t, K.reloj - 0.1, K.bomberados12 - 0.2, 0.3) * ckf(t, K.bomberados12 - 0.2);
    if (kr > 0) { const left = Math.max(0, 20 - (t - K.reloj) * 4); hg.save(); hg.globalAlpha = kr; const cx = 540, cy = 1430, r = 70;
      hg.strokeStyle = 'rgba(238,242,246,.2)'; hg.lineWidth = 10; hg.beginPath(); hg.arc(cx, cy, r, 0, 7); hg.stroke();
      glowStroke('#FF7A2F', 10, 18); hg.beginPath(); hg.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 6.2832 * left / 20); hg.stroke(); noGlow();
      hg.fillStyle = HC.white; hfont(44); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '2px'; hg.fillText(`0:${String(Math.ceil(left)).padStart(2, '0')}`, cx, cy + 2); hg.restore(); } }
  // ---- 12: cierre
  bigPill('PRUEBA GRATIS · 5 DÍAS', t, K.pruebala - 0.1, END - 0.75, 1460, '#F2B233');
}
// ---------------------------------------------------------------- un fotograma
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3();
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
function frame(t) {
  placeCam(camAt(t - 1 / 60)); const prevVP = vpOf();
  placeCam(camAt(t - 1 / 36)); const PVP = vpOf();
  const st = camAt(t); placeCam(st); const VP = vpOf();
  rigFollow(st.l); stageAt(t);
  flowUpdate(t, VP, PVP); S.gridM.uniforms.camP.value.copy(cam.position);
  const d = Math.max(0.05, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _rt.setFromMatrixColumn(cam.matrixWorld, 0); _up.setFromMatrixColumn(cam.matrixWorld, 1);
  const P0 = cam.position.clone().addScaledVector(_fw, d), Px = P0.clone().addScaledVector(_rt, d * 0.4), Py = P0.clone().addScaledVector(_up, d * 0.4);
  const a = [P0, Px, Py].map(p => p.clone().applyMatrix4(VP)), b = [P0, Px, Py].map(p => p.clone().applyMatrix4(prevVP));
  const m = a.map((q, i) => [q.x - b[i].x, q.y - b[i].y]), dx = [a[1].x - a[0].x, a[1].y - a[0].y], dy = [a[2].x - a[0].x, a[2].y - a[0].y];
  const det = dx[0] * dy[1] - dy[0] * dx[1] || 1e-6, N = [[m[1][0] - m[0][0], m[2][0] - m[0][0]], [m[1][1] - m[0][1], m[2][1] - m[0][1]]];
  const inv = [[dy[1] / det, -dy[0] / det], [-dx[1] / det, dx[0] / det]];
  const J = [N[0][0] * inv[0][0] + N[0][1] * inv[1][0], N[0][0] * inv[0][1] + N[0][1] * inv[1][1], N[1][0] * inv[0][0] + N[1][1] * inv[1][0], N[1][0] * inv[0][1] + N[1][1] * inv[1][1]];
  post.uniforms.m0.value.set(m[0][0], m[0][1]); post.uniforms.a0.value.set(a[0].x, a[0].y); post.uniforms.J.value.set(...J);
  let fl = 0; for (const [t0, k] of [[K.quedan + 0.3, 0.06], [K.setenta, 0.05], [K.cae, 0.06], [K.bomberados9, 0.08], [K.bomberados12, 0.1]]) if (t > t0) fl += k * Math.exp(-(t - t0) / 0.07);
  post.uniforms.flash.value = fl; post.uniforms.tint.value.set(0, 0, 0);
  return st;
}
function blurPass(src, dst, dx, dy) { quad.material = blurM; blurM.uniforms.tA.value = src.texture; blurM.uniforms.d.value.set(dx, dy); renderer.setRenderTarget(dst); renderer.render(quadScene, quadCam); }
function drawFrame(t) {
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  quad.material = brightM; brightM.uniforms.tA.value = rtA.texture; renderer.setRenderTarget(rtB[0]); renderer.render(quadScene, quadCam);
  blurPass(rtB[0], rtB[1], 1 / BLW, 0); blurPass(rtB[1], rtB[0], 0, 1 / BLH);
  blurPass(rtB[0], rtC[1], 2 / BLW, 0); blurPass(rtC[1], rtC[0], 0, 2 / BLH); blurPass(rtC[0], rtC[1], 3 / BLW, 0); blurPass(rtC[1], rtC[0], 0, 3 / BLH);
  quad.material = post; post.uniforms.tA.value = rtA.texture; post.uniforms.tB.value = rtB[0].texture; post.uniforms.tC.value = rtC[0].texture; post.uniforms.time.value = t;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
}
window.renderAt = function (t) {
  frame(t);
  if (window.camOverride) { window.camOverride(cam, v3); post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); }
  if (window.dbgHide) window.dbgHide();
  drawFrame(t); hudAt(t);
  return true;
};
// portada: los cascos cayendo y los dos que quedan, encendidos (sin HUD)
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : K.quedan + 0.45; frame(t);
  const C = window.COVER_CAM || [0.35, 1.25, 3.6, 0, 1.3, 0, 34];
  cam.fov = C[6]; cam.updateProjectionMatrix(); cam.position.set(C[0], C[1], C[2]); cam.up.set(0, 1, 0); cam.lookAt(C[3], C[4], C[5]); cam.updateMatrixWorld(); rigFollow(v3(C[3], C[4], C[5]));
  if (window.camOverride) window.camOverride(cam, v3);
  post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); post.uniforms.flash.value = 0;
  drawFrame(t); hudBegin();
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '700' }), new FontFace('SpaceMono', `url(${F}SpaceMono-Regular.ttf)`, { weight: '400' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    ocho: atL(1, '=ocho'), diez: atL(1, 'diez'), opositores1: atL(1, 'opositores'), madrid: atL(1, 'madrid'), quedan: atL(1, 'quedan'), plaza: atL(1, '=plaza'),
    ultima: atL(2, 'ultima'), comunidad: atL(2, 'comunidad'), presentaron: atL(2, 'presentaron'), personas: atL(2, 'personas'), doscientas: atL(2, 'doscientas', 2), plazas2: atL(2, 'plazas'),
    valencia: atL(3, 'valencia'), aspirantes: atL(3, 'aspirantes'), noventa: atL(3, 'noventa'), pais: atL(3, 'pais'), setenta: atL(3, 'setenta'), suspendio3: atL(3, 'suspendio'), examen3: atL(3, 'examen'),
    porque: atL(4, '=por'), suspende4: atL(4, 'suspende'), tanta: atL(4, 'tanta'), gente: atL(4, 'gente'),
    uno: atL(5, '=uno'), test5: atL(5, '=test'), eliminatorio: atL(5, 'eliminatorio'), temario5: atL(5, 'temario'), enorme: atL(5, 'enorme'), decenas: atL(5, 'decenas'), preguntas: atL(5, 'preguntas'), sola: atL(5, 'sola'), manana: atL(5, 'manana'), algunas: atL(5, 'algunas'), fallo: atL(5, 'fallo'), resta: atL(5, 'resta'),
    dos6: atL(6, '=dos'), tiempo: atL(6, 'tiempo'), mayoria6: atL(6, 'mayoria'), psicotecnico: atL(6, 'psicotecnico'), llegar: atL(6, 'llegar'), contestar: atL(6, 'contestar'),
    tres: atL(7, '=tres'), leerse: atL(7, 'leerse'), temario7: atL(7, 'temario'), entrenar: atL(7, 'entrenar'), examen7: atL(7, 'examen'),
    duro: atL(8, 'duro'), fisica: atL(8, 'fisica'), mayoria8: atL(8, 'mayoria'), cae: atL(8, '=cae'), antes: atL(8, 'antes'), test8: atL(8, '=test'),
    eso: atL(9, '=eso'), existe: atL(9, 'existe'), bomberados9: atL(9, 'bomberados'), app: atL(9, '=app'), opositores9: atL(9, 'opositores'),
    giras: atL(10, 'giras'), ruleta: atL(10, 'ruleta'), temario10: atL(10, 'temario'), haces: atL(10, 'haces'), test10: atL(10, '=test'), compites: atL(10, 'compites'), directo: atL(10, 'directo'), otros: atL(10, 'otros'), inteligencia: atL(10, 'inteligencia'), artificial: atL(10, 'artificial'),
    estudias: atL(11, 'estudias'), jugando: atL(11, 'jugando'), reloj: atL(11, 'reloj'), dia11: atL(11, '=dia'),
    bomberados12: atL(12, 'bomberados'), pruebala: atL(12, 'pruebala'), gratis: atL(12, 'gratis'), cinco: atL(12, 'cinco'), dias: atL(12, '=dias'),
  };
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  buildCam(); buildHudPlan();
  buildRig(); buildFloor(); buildFlow();
  // brasas que suben por todo el recorrido y polvo: el flujo óptico de los vuelos
  S.flow.push(flowCloud(40000, i => [-4 + hash(i * 1.31 + 7) * 28, 0.02, -36 + hash(i * 2.17 + 3) * 40], { size: 3.6, bright: 1.6, seed: 7, col: 0xffa060, rise: 0.22, riseH: 4.5, drift: 0.06, farF: 0.025, keep: 0.5 }));
  // y nubes más densas alrededor de cada zona (cascos, multitudes, examen, criba, app)
  for (const [k, Z] of [[0, v3(0, 0, 0)], [1, v3(0, 0, -11)], [2, v3(9, 0, -18)], [3, v3(18, 0, -13)], [4, v3(4, 0, -30)]])
    S.flow.push(flowCloud(6000, i => [Z.x + gauss(i + k * 1e5) * 2.2, 0.02, Z.z + gauss(i + k * 1e5 + 5e4) * 2.2], { size: 3.0, bright: 1.35, seed: 10 + k, col: 0xff9a50, rise: 0.18, riseH: 3.2, drift: 0.05, farF: 0.035, keep: 0.45 }));
  S.flow.push(flowCloud(9000, i => [-4 + hash(i * 3.71 + 1) * 28, 0.05 + hash(i * 4.33) * 5, -36 + hash(i * 5.91 + 2) * 40], { size: 1.4, bright: 0.55, seed: 8, farF: 0.03, keep: 0.3 }));
  S.helm = buildHelmets(); S.crowd = buildCrowds(); S.exam = buildExam(); S.gates = buildGates(); S.app = buildApp();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
