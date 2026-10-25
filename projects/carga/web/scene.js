// «Carga sin cable» — espacio 3D negro con flujo óptico: un móvil burdeos que se despieza sobre su cargador, la bobina de
// cobre, el campo magnético, el anillo de Faraday, el corte transversal, las barras de la prueba, los imanes y la
// conversación entre las dos bobinas (ping, más/menos, morse) hasta que una moneda hace que el cargador corte.
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
uniform mat4 VP, PVP; uniform vec2 res; uniform float size, bright, time, nearF, farF, drift;
varying float vA; varying float vS; varying float vT; varying float vLen;
void main(){
  vec3 P = ipos + vec3(sin(time*0.31+iseed*40.), cos(time*0.23+iseed*17.), sin(time*0.27+iseed*9.)) * drift * (0.4 + iseed);
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
  vA = bright * (0.3 + 0.7 * iseed) * fog * nf * clamp((2.0 * sz) / (L * 0.5 + 2.0 * sz), 0.1, 1.0);
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
      time: { value: 0 }, nearF: { value: o.nearF || 0.25 }, farF: { value: o.farF || 0.03 }, drift: { value: o.drift ?? 0.03 }, col: { value: new THREE.Color(o.col || 0xd8e2ee) } } });
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
// ---------------------------------------------------------------- piezas: bobinas, móvil, cargador, imanes, moneda, llave, Faraday, barras
// cobre con corriente: trazos que corren a lo largo del hilo (uv.x) + calor (rojo anaranjado)
const COPPERS = [];
function copperMat() {
  const m = new THREE.MeshStandardMaterial({ color: 0xc8733f, metalness: 1, roughness: 0.3 });
  const U = { uOff: { value: 0 }, uRep: { value: 60 }, uGlow: { value: 0 }, uHeat: { value: 0 }, uBase: { value: 0.12 }, uCol: { value: new THREE.Color(1.0, 0.55, 0.2) } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vUv2;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvUv2 = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vUv2; uniform float uOff, uRep, uGlow, uHeat, uBase; uniform vec3 uCol;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float ph = fract(vUv2.x * uRep - uOff);
        float dash = smoothstep(0.0, 0.1, ph) * (1.0 - smoothstep(0.28, 0.6, ph));
        totalEmissiveRadiance += uCol * (dash * 1.5 + uBase) * uGlow;
        totalEmissiveRadiance += vec3(1.0, 0.24, 0.05) * uHeat * 1.8;`);
  };
  m.customProgramCacheKey = () => 'copperI';
  m.userData.U = U; COPPERS.push(m); return m;
}
class Spiral extends THREE.Curve {
  constructor(r0, r1, turns) { super(); this.r0 = r0; this.r1 = r1; this.turns = turns; }
  getPoint(u, out = new THREE.Vector3()) { const th = u * this.turns * Math.PI * 2, r = this.r0 + (this.r1 - this.r0) * u; return out.set(r * Math.cos(th), r * Math.sin(th), 0); }
}
// bobina plana (espiral en el plano XY local, normal +z) con sus dos patillas
function coil(r0, r1, turns, wr) {
  const g = new THREE.Group(), m = copperMat(); m.userData.U.uRep.value = turns * 5;
  const sp = new THREE.Mesh(new THREE.TubeGeometry(new Spiral(r0, r1, turns), Math.round(turns * 72), wr, 7, false), m); sp.castShadow = true; g.add(sp);
  const lead = tube([v3(r0, 0, 0), v3(r0 * 0.6, -r0 * 0.4, -wr * 2.5), v3(r1 + 0.03, -r0 * 0.5, -wr * 2.5), v3(r1 + 0.06, -r0 * 0.2, -wr * 2.5)], wr * 0.9, m, 24); g.add(lead);
  g.userData = { m, U: m.userData.U, r0, r1, turns, sp };
  return g;
}
function setCurrent(c, glow, off, heat = 0, base = 0.18) { const U = c.userData.U; U.uGlow.value = glow; U.uOff.value = off; U.uHeat.value = heat; U.uBase.value = base; }

// ---------------------------------------------------------------- materiales del móvil y del cargador
function phoneMats() {
  return {
    frame: new THREE.MeshPhysicalMaterial({ color: 0x531523, metalness: 0.85, roughness: 0.34, clearcoat: 0.4, clearcoatRoughness: 0.35 }),
    back: new THREE.MeshStandardMaterial({ color: 0x3e0e1b, metalness: 0.35, roughness: 0.4 }),
    bump: new THREE.MeshStandardMaterial({ color: 0x47101f, metalness: 0.55, roughness: 0.2 }),
    lens: new THREE.MeshStandardMaterial({ color: 0x050608, metalness: 0.3, roughness: 0.05 }),
    ring: new THREE.MeshStandardMaterial({ color: 0x8a3a4a, metalness: 1, roughness: 0.22 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x040506, metalness: 0.0, roughness: 0.42, emissive: 0xffffff, emissiveIntensity: 0 }),
    batt: new THREE.MeshStandardMaterial({ color: 0x24272d, metalness: 0.4, roughness: 0.5 }),
    board: new THREE.MeshStandardMaterial({ color: 0x0f2a24, metalness: 0.3, roughness: 0.55 }),
    chip: new THREE.MeshStandardMaterial({ color: 0x15171b, metalness: 0.5, roughness: 0.35 }),
    ferrite: new THREE.MeshStandardMaterial({ color: 0x141518, metalness: 0.2, roughness: 0.85 }),
    magnet: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 1, roughness: 0.25, emissive: 0x000000 }),
  };
}
function screenTex() {    // pantalla con el anillo de carga (genérico, sin interfaz real)
  return canvasTex(512, 1024, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(98,227,212,.25)'; g.lineWidth = 18; g.beginPath(); g.arc(w / 2, h * 0.45, 120, 0, 7); g.stroke();
    g.strokeStyle = '#62E3D4'; g.lineWidth = 18; g.lineCap = 'round'; g.beginPath(); g.arc(w / 2, h * 0.45, 120, -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.35); g.stroke();
    g.fillStyle = '#EEF2F6'; g.beginPath(); [[0.02, -0.075], [-0.045, 0.012], [0.0, 0.012], [-0.02, 0.075], [0.048, -0.01], [0.004, -0.01]].forEach(([x, y], i) => (i ? g.lineTo(w / 2 + x * 900, h * 0.45 + y * 900) : g.moveTo(w / 2 + x * 900, h * 0.45 + y * 900))); g.closePath(); g.fill();
  });
}
// móvil: x = ancho, y = largo, z = grosor (pantalla en +z). Partes separables para el despiece.
const PW = 0.72, PL = 1.48, PT = 0.082;
function buildPhone() {
  const M = phoneMats(), P = new THREE.Group(), parts = {};
  const add = (name, mesh, z, ez, xray = true) => { const g = new THREE.Group(); g.add(mesh); g.userData = { z, ez, xray }; g.position.z = z; P.add(g); parts[name] = g; return g; };
  // marco de aluminio (anillo)
  const outer = rrShape(PW, PL, 0.115), inner = rrShape(PW - 0.024, PL - 0.024, 0.104); outer.holes.push(new THREE.Path(inner.getPoints(48).reverse()));
  const fg = new THREE.ExtrudeGeometry(outer, { depth: PT * 0.8, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 4, curveSegments: 14 }); fg.translate(0, 0, -PT * 0.4);
  const frame = new THREE.Mesh(fg, M.frame); frame.castShadow = true; edges(frame, 0xe7d9dc, 1.2, 30);
  add('frame', frame, 0, 0);
  // trasera de cristal mate + isla de cámaras
  const back = rbox(PW - 0.01, PL - 0.01, 0.008, M.back, 0.11); edges(back, 0xe7d9dc, 1.2, 30);
  const bk = add('back', back, -PT / 2 + 0.004, -0.34);
  const bump = rbox(0.3, 0.3, 0.014, M.bump, 0.07); bump.position.set(-0.17, 0.5, -0.009); bk.add(bump);
  [[-0.235, 0.565], [-0.105, 0.565], [-0.17, 0.44]].forEach(([x, y]) => { const r = cyl(0.052, 0.052, 0.012, M.ring, 40); r.rotation.x = Math.PI / 2; r.position.set(x, y, -0.021); bk.add(r);
    const l = cyl(0.04, 0.04, 0.013, M.lens, 40); l.rotation.x = Math.PI / 2; l.position.set(x, y, -0.022); bk.add(l); });
  const fl = cyl(0.015, 0.015, 0.012, new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.3 }), 20); fl.rotation.x = Math.PI / 2; fl.position.set(-0.07, 0.44, -0.02); bk.add(fl);
  // bobina receptora sobre su lámina de ferrita (y los imanes, ocultos hasta su momento)
  const cg = new THREE.Group(); const fer = rbox(0.46, 0.46, 0.004, M.ferrite, 0.05); cg.add(fer); fer.position.z = 0.003;
  const rx = coil(0.07, 0.2, 11, 0.0052); rx.position.z = -0.002; cg.add(rx);
  const mags = new THREE.Group(); for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, mg = rbox(0.055, 0.03, 0.006, M.magnet, 0.008); mg.position.set(Math.cos(a) * 0.255, Math.sin(a) * 0.255, 0); mg.rotation.z = a + Math.PI / 2; mags.add(mg); }
  cg.add(mags); mags.visible = false;
  add('coil', cg, -PT / 2 + 0.014, -0.2, false);
  // batería y placa
  const bt = rbox(0.58, 0.84, 0.03, M.batt, 0.04); edges(bt, 0xbfc6cf, 1.1, 30, 0.5);
  const btl = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.13), new THREE.MeshStandardMaterial({ map: canvasTex(512, 220, (g, w, h) => { g.fillStyle = '#2b2f36'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5d646d'; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#7d858f'; g.font = '700 54px SpaceMono'; g.textAlign = 'center'; g.fillText('Li-ion', w / 2, h / 2 + 18); }), roughness: 0.6 }));
  btl.position.set(0, -0.05, 0.0155); bt.add(btl);
  const bat = add('batt', bt, -0.006, -0.1, false); bat.position.y = -0.2; bat.userData.y = -0.2;
  const bd = rbox(0.6, 0.38, 0.012, M.board, 0.03); for (let i = 0; i < 7; i++) { const c = rbox(0.05 + hash(i) * 0.08, 0.04 + hash(i + 3) * 0.07, 0.01, M.chip, 0.005); c.position.set(-0.22 + (i % 4) * 0.14, -0.1 + Math.floor(i / 4) * 0.17, 0.009); bd.add(c); }
  const brd = add('board', bd, 0.008, 0.08, false); brd.position.y = 0.48; brd.userData.y = 0.48;
  // pantalla
  const sc = rbox(PW - 0.012, PL - 0.012, 0.008, M.screen, 0.11); M.screen.emissiveMap = screenTex(); edges(sc, 0xdfe6ee, 1.2, 30);
  const isl = rbox(0.17, 0.05, 0.002, new THREE.MeshBasicMaterial({ color: 0x000000 }), 0.025); isl.position.set(0, 0.64, 0.0045); sc.add(isl);
  add('screen', sc, PT / 2 - 0.004, 0.32);
  P.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  P.userData = { parts, M, rx, mags };
  scene.add(P); return P;
}
// despiece (0 = cerrado, 1 = abierto) y rayos X (0 = sólido, 1 = solo aristas en las carcasas)
function phoneState(P, ex, xr, edgeBase = 0.1) {
  const { parts } = P.userData;
  for (const k in parts) { const g = parts[k], u = g.userData; g.position.z = u.z + u.ez * ex; }
  for (const k of ['frame', 'back', 'screen']) { const g = parts[k]; setOp(g, 1 - 0.94 * xr); edgeOp(g, edgeBase + 0.85 * xr); }
  for (const k of ['batt', 'board']) setOp(parts[k], 1 - 0.92 * xr);
  edgeOp(parts.batt, 0.25 + 0.5 * xr);
}

// ---------------------------------------------------------------- cargador: disco grafito + bobina emisora dentro + cable
function buildCharger() {
  const C = new THREE.Group();
  const prof = [[0, 0], [0.47, 0], [0.495, 0.008], [0.5, 0.03], [0.5, 0.07], [0.492, 0.09], [0.47, 0.099], [0.43, 0.1], [0, 0.1]].map(([x, y]) => new THREE.Vector2(x, y));
  const shellM = new THREE.MeshStandardMaterial({ color: 0x1b1d22, metalness: 0.15, roughness: 0.55 });
  const shell = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), shellM); shell.castShadow = true; shell.receiveShadow = true; edges(shell, 0xdfe6ee, 1.2, 24);
  C.add(shell);
  const padM = new THREE.MeshStandardMaterial({ color: 0x0d0e11, roughness: 0.92 });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.003, 96), padM); pad.position.y = 0.1015; pad.receiveShadow = true; C.add(pad);
  const ledM = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0x62e3d4, emissiveIntensity: 0 });
  const led = new THREE.Mesh(new THREE.CapsuleGeometry(0.0035, 0.022, 4, 10), ledM); led.rotation.z = Math.PI / 2; led.position.set(0, 0.05, 0.499); C.add(led);
  // interior: ferrita, bobina, placa
  const fer = cyl(0.26, 0.26, 0.012, new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.85 }), 64); fer.position.y = 0.03; C.add(fer);
  const tx = coil(0.085, 0.225, 10, 0.0068); tx.rotation.x = -Math.PI / 2; tx.position.y = 0.0435; C.add(tx);
  const pcb = rbox(0.22, 0.12, 0.01, new THREE.MeshStandardMaterial({ color: 0x0a1714, roughness: 0.6 }), 0.02); pcb.rotation.x = -Math.PI / 2; pcb.position.set(0, 0.018, -0.36); C.add(pcb);
  const mags = new THREE.Group(); const mm = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 1, roughness: 0.25 });
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, mg = rbox(0.06, 0.032, 0.012, mm, 0.008); mg.rotation.x = -Math.PI / 2; mg.rotation.z = a + Math.PI / 2; mg.position.set(Math.cos(a) * 0.3, 0.06, Math.sin(a) * 0.3); mags.add(mg); }
  C.add(mags); mags.visible = false;
  // cable trenzado que se va al fondo
  const cable = tube([v3(0, 0.035, -0.49), v3(0, 0.022, -0.75), v3(-0.25, 0.018, -1.3), v3(-1.1, 0.018, -2.2), v3(-2.6, 0.018, -3.4), v3(-5, 0.018, -5.2)], 0.022, new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.6, metalness: 0.2 }), 120);
  C.add(cable);
  C.userData = { shell, pad, shellM, padM, ledM, tx, mags, fer, pcb, cable };
  scene.add(C); return C;
}
function chargerXray(C, xr, edgeBase = 0.12) {
  const u = C.userData;
  u.shellM.transparent = xr > 0.001; u.shellM.opacity = 1 - 0.93 * xr; u.shellM.depthWrite = xr < 0.5; u.shell.material.visible = xr < 0.985;
  u.padM.transparent = xr > 0.001; u.padM.opacity = 1 - 0.96 * xr; u.padM.depthWrite = xr < 0.5; u.pad.visible = xr < 0.985;
  edgeOp(u.shell, edgeBase + 0.8 * xr);
}

// ---------------------------------------------------------------- campo magnético: bucles de dipolo (ρ = ρ0 + L·sen³θ, y = L·sen²θ·cosθ)
// mitad de arriba (se estira hasta el móvil) y mitad de abajo (aplastada: se cierra por la ferrita)
function buildField() {
  const F = new THREE.Group(), up = new THREE.Group(), dn = new THREE.Group(); F.add(up, dn); F.position.y = 0.044;
  S.fieldM = lineMat(TEAL3.clone(), 2.2, 0, true); S.fieldM.dashSize = 0.035; S.fieldM.gapSize = 0.02;
  S.fieldM2 = lineMat(TEAL3.clone().multiplyScalar(0.6), 1.4, 0, true); S.fieldM2.dashSize = 0.02; S.fieldM2.gapSize = 0.03;
  const lines = [];
  const NA = 14, LS = [0.22, 0.36, 0.55, 0.8];
  for (let a = 0; a < NA; a++) {
    const ph = a / NA * Math.PI * 2 + 0.11;
    LS.forEach((L, j) => {
      const r0 = 0.04 + 0.11 * hash(a * 7 + j * 3), mat = j % 2 ? S.fieldM2 : S.fieldM;
      for (const half of [0, 1]) {
        const pts = []; for (let i = 0; i <= 40; i++) { const th = half ? lerp(Math.PI / 2, Math.PI - 0.02, i / 40) : lerp(0.02, Math.PI / 2, i / 40);
          const rho = r0 + L * Math.pow(Math.sin(th), 3), y = L * Math.sin(th) ** 2 * Math.cos(th); pts.push(v3(rho * Math.cos(ph), y, rho * Math.sin(ph))); }
        const l = polyline(pts, mat); (half ? dn : up).add(l); lines.push({ l, half, n: 40, L });
      }
    });
  }
  scene.add(F); S.field = { F, up, dn, lines };
}
function fieldState(t, k, stretch, off, bright = 1) {
  const f = S.field; f.F.visible = k > 0.003;
  f.up.scale.y = stretch; f.dn.scale.set(1, 0.09, 1);
  const ku = clamp(k * 2), kd = clamp(k * 2 - 1);
  for (const o of f.lines) o.l.geometry.instanceCount = Math.round(o.n * (o.half ? kd : ku));
  S.fieldM.opacity = clamp(k * 2) * bright; S.fieldM2.opacity = clamp(k * 2) * bright * 0.8;
  S.fieldM.dashOffset = -off; S.fieldM2.dashOffset = -off * 0.8;
}

// ---------------------------------------------------------------- moneda genérica (sin cara) y llave
function buildCoin() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xc9b47c, metalness: 1, roughness: 0.28, emissive: 0xff3a10, emissiveIntensity: 0 });
  const pts = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2, r = 0.116 + (i % 2 ? 0.0015 : 0); pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
  const coinG = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.01, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2 }); coinG.translate(0, 0, -0.005);
  const c = new THREE.Mesh(coinG, m); c.rotation.x = -Math.PI / 2; c.castShadow = true; g.add(c);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.004, 8, 64), m); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.007; g.add(rim);
  const st = new THREE.Mesh(new THREE.CircleGeometry(0.03, 5), m); st.rotation.x = -Math.PI / 2; st.position.y = 0.0075; g.add(st);
  g.userData = { m }; g.visible = false; scene.add(g); return g;
}
function buildKey() {
  const s = new THREE.Shape(); s.absarc(0, 0, 0.06, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.022, 0, Math.PI * 2, true); s.holes.push(hole);
  const b = new THREE.Shape(); b.moveTo(0.05, -0.016); b.lineTo(0.27, -0.016); b.lineTo(0.27, 0.0); b.lineTo(0.255, 0.012); b.lineTo(0.24, 0.0); b.lineTo(0.225, 0.016); b.lineTo(0.205, 0.0); b.lineTo(0.19, 0.014); b.lineTo(0.17, 0.016); b.lineTo(0.05, 0.016); b.closePath();
  const m = new THREE.MeshStandardMaterial({ color: 0xbfc4ca, metalness: 1, roughness: 0.3, emissive: 0xff3a10, emissiveIntensity: 0 });
  const g = new THREE.Group();
  for (const sh of [s, b]) { const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2, curveSegments: 24 }); const k = new THREE.Mesh(geo, m); k.rotation.x = -Math.PI / 2; k.castShadow = true; g.add(k); }
  g.userData = { m }; g.visible = false; scene.add(g); return g;
}

// ---------------------------------------------------------------- anillo de Faraday (1831): hierro + dos devanados + galvanómetro, en plano XY
function buildFaraday() {
  const G = new THREE.Group(); scene.add(G); G.visible = false;
  const R = 0.338, tr = 0.045;
  const ironM = new THREE.MeshStandardMaterial({ color: 0x2c2d31, metalness: 0.85, roughness: 0.45 });
  const U = { uA: { value: 0 } };
  ironM.onBeforeCompile = sh => { sh.uniforms.uA = U.uA;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLp; uniform float uA;').replace('void main() {', 'void main() {\n float sA = atan(abs(vLp.x), -vLp.y) / 3.14159265; if (sA > uA) discard;'); };
  ironM.customProgramCacheKey = () => 'ironA';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, tr, 28, 140), ironM); ring.castShadow = true; G.add(ring);
  const ringE = edges(ring, 0xf1e6cf, 1.0, 40, 0);
  const wind = (phc, turns) => { const pts = []; for (let i = 0; i <= turns * 24; i++) { const v = i / (turns * 24), ph = phc + (v - 0.5) * 0.95, ps = v * turns * Math.PI * 2, rw = tr + 0.012;
      pts.push(v3((R + rw * Math.cos(ps)) * Math.cos(ph), (R + rw * Math.cos(ps)) * Math.sin(ph), rw * Math.sin(ps))); }
    const m = copperMat(); m.userData.U.uRep.value = turns * 3; const w = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 40, 0.0075, 6), m); w.castShadow = true; w.userData = { U: m.userData.U }; G.add(w); return w; };
  const wA = wind(-Math.PI / 2, 9), wB = wind(Math.PI / 2, 9);
  // galvanómetro a la derecha del devanado de arriba, pila a la izquierda del de abajo
  const gal = new THREE.Group(); gal.position.set(0.56, 0.26, 0); G.add(gal);
  const dial = cyl(0.12, 0.12, 0.03, new THREE.MeshStandardMaterial({ color: 0x1a1b1f, metalness: 0.6, roughness: 0.4 }), 48); dial.rotation.x = Math.PI / 2; gal.add(dial); edges(dial, 0xf1e6cf, 1.0, 30, 0.9);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.1, 48), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e9e1cf'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.strokeStyle = '#2a2622'; g.lineWidth = 3;
    for (let i = -5; i <= 5; i++) { const a = -Math.PI / 2 + i * 0.22; g.beginPath(); g.moveTo(128 + Math.cos(a) * 92, 150 + Math.sin(a) * 92); g.lineTo(128 + Math.cos(a) * (i % 5 ? 104 : 112), 150 + Math.sin(a) * (i % 5 ? 104 : 112)); g.stroke(); } }) }));
  face.position.z = 0.016; gal.add(face);
  const needle = new THREE.Group(); needle.position.set(0, -0.022, 0.018); gal.add(needle);
  const nd = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.1, 0.002), new THREE.MeshBasicMaterial({ color: 0xb2201a })); nd.position.y = 0.05; needle.add(nd);
  const pile = new THREE.Group(); pile.position.set(-0.54, -0.33, 0); G.add(pile);
  for (let i = 0; i < 6; i++) { const d = cyl(0.06, 0.06, 0.018, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xb87333 : 0x9aa0a8, metalness: 1, roughness: 0.35 }), 36); d.position.y = i * 0.02; pile.add(d); }
  const wireM = new THREE.MeshStandardMaterial({ color: 0xc8733f, metalness: 1, roughness: 0.35 });
  const wires = [tube([v3(0.15, R + 0.03, 0.04), v3(0.36, 0.36, 0.06), v3(0.48, 0.3, 0.03)], 0.004, wireM, 30), tube([v3(0.15, R - 0.05, -0.04), v3(0.36, 0.2, -0.03), v3(0.5, 0.2, -0.02)], 0.004, wireM, 30),
    tube([v3(-0.15, -R - 0.03, 0.04), v3(-0.36, -0.3, 0.05), v3(-0.5, -0.24, 0.02)], 0.004, wireM, 30), tube([v3(-0.15, -R + 0.05, -0.04), v3(-0.38, -0.38, -0.02), v3(-0.56, -0.34, -0.01)], 0.004, wireM, 30)];
  wires.forEach(w => G.add(w));
  // flujo dentro del hierro: círculo de trazos turquesa
  const cp = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; cp.push(v3(Math.cos(a) * R, Math.sin(a) * R, 0)); }
  S.ironFluxM = lineMat(TEAL3.clone(), 2.4, 0, true); S.ironFluxM.dashSize = 0.03; S.ironFluxM.gapSize = 0.025;
  const flux = polyline(cp, S.ironFluxM); G.add(flux);
  G.userData = { U, ring, ringE, wA, wB, gal, needle, pile, wires, flux, ironM, R };
  return G;
}

// ---------------------------------------------------------------- barras de la prueba (cristal + relleno de luz)
function buildBars() {
  const B = new THREE.Group(); scene.add(B);
  const defs = [{ x: -0.78, z: -1.0, h: 1.426, c: 0xd9dee6, k: 0.85 }, { x: -0.26, z: -1.05, h: 2.101, c: 0xff9a2e, k: 1.0 }, { x: 0.26, z: -1.1, h: 2.562, c: 0xff5a3c, k: 1.0 }];
  B.userData.bars = defs.map(d => {
    const g = new THREE.Group(); g.position.set(d.x, 0, d.z); B.add(g);
    const gm = new THREE.MeshPhysicalMaterial({ color: 0x9fb2c8, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.07, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1, 0.36), gm); shell.position.y = 0.5; g.add(shell); const e = edges(shell, 0xe6ecf2, 1.4, 20, 0.9);
    const fm = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: d.c, emissiveIntensity: d.k, roughness: 0.4, transparent: true, opacity: 0.92 });
    const fill = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), fm); fill.position.y = 0.5; g.add(fill);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.012, 0.38), basicGlow(d.c, 2.2)); g.add(cap);
    return { g, shell, fill, cap, e, gm, fm, ...d };
  });
  return B;
}
function barState(b, k, fill, a = 1) {
  b.g.visible = k > 0.002; const H = b.h;
  b.shell.scale.set(1, Math.max(0.001, H * eo(clamp(k))), 1); b.shell.position.y = H * eo(clamp(k)) / 2;
  b.e.material.opacity = 0.9 * a * clamp(k * 3); b.gm.opacity = 0.07 * a;
  const fh = Math.max(0.001, H * clamp(fill)); b.fill.scale.set(1, fh, 1); b.fill.position.y = fh / 2; b.fill.visible = fill > 0.001; b.fm.opacity = 0.92 * a;
  b.cap.position.y = fh; b.cap.visible = fill > 0.001; b.cap.material.opacity = a;
}
// ---------------------------------------------------------------- estado de la escena en cada instante (todo es función de t)
const SEC = new THREE.Plane(new THREE.Vector3(0, 0, -1), 50);          // corte transversal: se queda z ≤ constante
const SECM = [];
function clipAll(objs) { for (const o of objs) o.traverse(m => { if (!m.material) return; (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => { x.clippingPlanes = [SEC]; x.clipping = true; if (!x.isLineMaterial && !x.isShaderMaterial && !SECM.includes(x)) SECM.push(x); }); }); }
let _secSide = false;      // caras de los dos lados solo mientras hay corte (dibujar las dos caras siempre cuesta mucho)
function secSides(on) { if (on === _secSide) return; _secSide = on; for (const x of SECM) { x.side = on ? THREE.DoubleSide : THREE.FrontSide; x.needsUpdate = true; } }
const PY_ON = 0.1 + PT / 2 + 0.0015;
const QE = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));
const Q_ON = QE(-Math.PI / 2, 0.42, 0), Q_OFF = QE(-Math.PI / 2, 0.66, 0), Q_COIN = QE(-Math.PI / 2 + 0.03, 0.42, 0.02);
const pose = (p, q, ex = 0, xr = 0) => ({ p, q, ex, xr });
function vertIdle(t) { return pose(v3(0, 0.98 + 0.015 * Math.sin(t * 1.9), 0), QE(-0.08, -1.62 + 0.1 * Math.sin(t * 0.7), 0.05), 1, 0.2); }
function mixPose(A, B, e, arc = 0) { const p = A.p.clone().lerp(B.p, e); p.y += arc * Math.sin(Math.PI * e); return pose(p, A.q.clone().slerp(B.q, e), lerp(A.ex, B.ex, e), lerp(A.xr, B.xr, e)); }
function phonePose(t) {
  const ON = pose(v3(0, PY_ON, 0), Q_ON), HOV = pose(v3(0, 0.74 + 0.012 * Math.sin(t * 1.7), 0), Q_ON), OFF = pose(v3(0.21, PY_ON, 0.13), Q_OFF);
  const COIN = pose(v3(0.02, PY_ON + 0.0125, 0.02), Q_COIN);
  if (t >= END - 1.45) {                                                     // vuelta al primer fotograma (bucle)
    const u = clamp((t - (END - 1.45)) / 1.3), V = vertIdle(t - END);
    return mixPose(ON, V, sm5(u), 0.1);
  }
  const t0 = Math.max(0, t), V = vertIdle(t0);
  const tc = K.cada - 0.08, tl = K.apoyas + 0.16;
  if (t0 < tc) return V;
  if (t0 < tl) { const u = (t0 - tc) / (tl - tc); const P = mixPose(V, ON, sm5(u)); P.p.copy(V.p).lerp(ON.p, Math.pow(u, 2.1)); P.ex = 1 - sm5(clamp(u * 1.4)); return P; }
  const bounce = (ta) => (t < ta ? 0 : 0.012 * Math.max(0, Math.sin((t - ta) * 34)) * Math.exp(-(t - ta) * 9));
  if (t < K.truco) { const P = pose(ON.p.clone(), Q_ON); P.p.y += bounce(tl); return P; }
  // «el truco»: sale disparado hacia arriba (fuera de plano) y vuelve a bajar cuando el campo «atraviesa la bobina del móvil»
  if (t < K.parece + 0.1) {
    const HIGH = pose(v3(0, 2.9, -0.2), Q_ON);
    const P = t < K.atraviesa - 0.15 ? mixPose(ON, HIGH, sm5(clamp((t - K.truco) / 0.7))) : mixPose(HIGH, HOV, sm5(clamp((t - K.atraviesa + 0.15) / 0.65)));
    P.ex = 0.62 * sm5(clamp((t - K.atraviesa - 0.3) / 0.5)); P.xr = sm5(clamp((t - K.atraviesa - 0.3) / 0.5));
    return P;
  }
  // «parece que carga por contacto»: baja y toca justo en «contacto»
  const tland = K.contacto + 0.1;
  if (t < tland) { const u = clamp((t - (K.parece + 0.1)) / (tland - K.parece - 0.1)); const A = pose(v3(0, 0.74 + 0.012 * Math.sin(t * 1.7), 0), Q_ON, 0.62, 1); const P = mixPose(A, ON, sm5(u)); P.p.y = lerp(A.p.y, ON.p.y, 1 - Math.pow(1 - u, 2.6)); P.ex = 0.62 * (1 - sm5(clamp(u * 1.6))); P.xr = 1 - sm5(clamp(u * 1.5)); return P; }
  if (t < K.descentrado) { const P = pose(ON.p.clone(), Q_ON); P.p.y += bounce(tland) * 0.5; return P; }
  // descentrado → imanes → centrado de golpe
  if (t < K.centran) { const P = mixPose(ON, OFF, sm5(clamp((t - K.descentrado) / 0.5))); P.xr = 0.8 * sm5(clamp((t - K.imanes + 0.1) / 0.4)); return P; }
  const tsn = K.centran + 0.16;
  if (t < tsn) { const u = clamp((t - K.centran) / 0.16); const P = mixPose(OFF, ON, u * u); P.xr = 0.8; return P; }
  // «¿y qué le dice?»: se separa un poco del cargador (rayos X) para ver la conversación entre las dos bobinas
  if (t < K.algo) { const lift = sm5(clamp((t - K.y11 - 0.05) / 0.5)) * (1 - sm5(clamp((t - K.y14) / 0.45)));
    const P = pose(ON.p.clone(), Q_ON); P.p.y += (0.3 + 0.008 * Math.sin(t * 1.7)) * lift + bounce(K.y14 + 0.45) * 0.5;
    P.xr = Math.max(0.8 * (1 - sm5(clamp((t - tsn - 0.25) / 0.4))), 0.7 * lift); return P; }
  // la moneda: se levanta, entra la moneda, se posa encima (y en rayos X para verla)
  const tup = K.algo + 0.35, tdn = K.robando + 0.2;
  if (t < K.proxima) {
    let P;
    if (t < tup) P = mixPose(ON, pose(v3(0, 0.34, 0), Q_ON), sm5((t - K.algo) / 0.35));
    else if (t < tdn) P = mixPose(pose(v3(0, 0.34, 0), Q_ON), COIN, sm5((t - tup) / (tdn - tup)));
    else P = COIN;
    P.xr = 0.82 * sm5(clamp((t - K.algo) / 0.4)); return P;
  }
  // «la próxima vez que lo apoyes»: fuera la moneda y vuelve a apoyarse
  const tre = K.apoyes + 0.12;
  if (t < tre) { const u = clamp((t - K.proxima) / (tre - K.proxima)); const up = pose(v3(0, 0.4, 0), Q_ON);
    const P = u < 0.45 ? mixPose(COIN, up, sm5(u / 0.45)) : mixPose(up, ON, Math.pow((u - 0.45) / 0.55, 2)); P.xr = 0.82 * (1 - sm5(clamp(u * 2))); return P; }
  // «están hablando»: se separa un poco para que se vea la onda entre las dos bobinas, y vuelve a apoyarse
  const lift = sm5(clamp((t - K.estan + 0.05) / 0.35)) * (1 - sm5(clamp((t - K.tu15) / 0.4)));
  const P = pose(ON.p.clone(), Q_ON); P.p.y += bounce(tre) + 0.4 * lift; return P;
}
// corriente: dirección y avance de los trazos (con los cambios de sentido cada vez más rápidos en la frase 4)
let FLIPS = [];
function buildFlips() { FLIPS = []; let tt = K.cambia + 0.05, d = 0.5; while (tt < K.crea - 0.1) { FLIPS.push(tt); tt += Math.max(1 / 90, d); d *= 0.72; } }
function curDir(t) { if (t < K.cambia + 0.05 || t > K.crea - 0.1) return 1; let n = 0; for (const f of FLIPS) { if (t >= f) n++; else break; } return n % 2 ? -1 : 1; }
function curSpeed(t) { return t >= K.cambia && t < K.crea ? 1.3 + 5 * clamp((t - K.cambia) / 2.2) : 1.0; }
function flowOff(t) { let o = 0; const dt = 1 / 240; for (let x = -1; x < t; x += dt) o += curDir(x) * curSpeed(x) * dt; return o; }
// brillo de la bobina emisora a lo largo del vídeo
function txGlow(t) {
  if (t < K.apoyas + 0.2) return 0.8;
  if (t < K.corriente4) return 0.12;
  if (t < K.corta) return keyed(t, [[K.corriente4, 0.15], [K.corriente4 + 0.25, 0.72], [K.crea, 0.72], [K.se6, 0.75], [K.realidad, 0.75], [K.dos7, 0.45], [K.en9, 0.45], [K.en9 + 0.5, 0.6], [K.y11, 0.6], [K.el11, 0.6], [K.y14, 0.75]]);
  if (t < K.corta + 0.08) return 2.2;                                      // chispazo y corte
  if (t < K.apoyes + 0.1) return 0;
  return clamp((t - K.apoyes - 0.1) / 0.3) * 0.75 * (t > END - 1.45 ? 1 - sm5(clamp((t - END + 1.45) / 1.2)) * 0.2 : 1);
}
// golpecitos (modulación de carga) en la frase 13: puntos y rayas
const MORSE = [0.08, 0.08, 0.22, 0.08, 0.08, 0.08, 0.22, 0.22, 0.08, 0.08, 0.22, 0.08];
function tapAt(t) {
  if (t < K.golpecitos - 0.05 || t > K.morse + 0.6) return 0;
  let x = K.golpecitos - 0.05; for (const d of MORSE) { if (t >= x && t < x + d) return 1; x += d + 0.07; if (x > t) break; } return 0;
}
// partículas de energía (frase 8 y la moneda)
function buildEnergy() {
  const N = 150, m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), N);
  m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); m.frustumCulled = false; m.renderOrder = 5; scene.add(m); S.energy = m;
}
function energyAt(t) {
  const m = S.energy, N = m.count, dm = new THREE.Matrix4(); let vis = false;
  const a8 = env(t, K.parte, K.en9 + 0.1, 0.2, 0.25), a14 = env(t, K.robando - 0.1, K.corta + 0.02, 0.2, 0.02);
  for (let i = 0; i < N; i++) {
    let s = 0, x = 0, y = 0, z = 0, r = 1, g = 0.6, b = 0.2;
    const life = 0.9, ph = ((t * (0.8 + hash(i) * 0.5) + hash(i * 3.7)) % life) / life, ang = hash(i * 5.1) * Math.PI * 2, rad = 0.09 + 0.14 * hash(i * 9.2);
    if (a8 > 0.01) {          // suben de la bobina del cargador a la del móvil; algunas se escapan y se vuelven calor
      const lost = hash(i * 13.3) < 0.32 && t > K.pierde, y0 = 0.05, y1 = 0.108;
      x = Math.cos(ang) * rad; z = Math.sin(ang) * rad * 0.35 - 0.02; y = lerp(y0, y1, ph);
      if (lost && ph > 0.35) { const k = (ph - 0.35) / 0.65; x += Math.cos(ang) * k * 0.12; y = lerp(y0, y1, 0.35) + k * 0.02; r = 1; g = lerp(0.6, 0.22, k); b = lerp(0.2, 0.05, k); }
      s = (i % 3 ? 0.0017 : 0) * a8 * Math.sin(Math.PI * ph); vis = true;
    } else if (a14 > 0.01) {  // se desvían hacia la moneda
      const C = S.coin.position; x = lerp(Math.cos(ang) * rad, C.x, ph * ph); z = lerp(Math.sin(ang) * rad, C.z, ph * ph); y = lerp(0.05, C.y, ph) + 0.02 * Math.sin(Math.PI * ph);
      r = 1; g = lerp(0.65, 0.25, ph); b = 0.08; s = 0.0035 * a14 * Math.sin(Math.PI * ph); vis = true;
    }
    dm.makeScale(Math.max(1e-5, s), Math.max(1e-5, s), Math.max(1e-5, s)); dm.setPosition(x, y, z); m.setMatrixAt(i, dm); m.setColorAt(i, _c.setRGB(r * 3, g * 3, b * 3));
  }
  m.visible = vis; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
}
// pings y paquetes entre las dos bobinas (frases 11 y 12)
function glyphTex(ch, col) { return canvasTex(256, 256, (g, w, h) => { g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 30; g.font = `700 190px SpaceMono, DejaVuMono`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, w / 2, h / 2 + 8); }); }
function buildPackets() {
  const mk = (ch, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glyphTex(ch, col), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.renderOrder = 8; m.visible = false; scene.add(m); return m; };
  S.pk = { plus: mk('+', '#FFB547'), minus: mk('−', '#FFB547'), eq: mk('=', '#FFB547'), q: mk('?', '#62E3D4'), ok: mk('✓', '#FFB547') };
  S.rings = [0, 1, 2, 3].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 96), basicGlow(0x62e3d4, 2)); r.rotation.x = Math.PI / 2; r.visible = false; r.renderOrder = 7; scene.add(r); return r; });
  S.dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), basicGlow(0xffb547, 2.5), 40); S.dots.frustumCulled = false; scene.add(S.dots);
}
function packetsAt(t) {
  const yT = 0.06, yR = wp(S.phone.userData.rx).y - 0.01, face = o => o.quaternion.copy(cam.quaternion);
  // anillos: el cargador pregunta (turquesa, sube) y el móvil contesta (ámbar, baja)
  const R = [[K.pregunta, 1], [K.hay11, 1], [K.si11, -1], [K.compatible, -1]];
  S.rings.forEach((r, i) => { const [t0, dir] = R[i], u = (t - t0) / 0.6; r.visible = u > 0 && u < 1; if (!r.visible) return;
    const s = 0.08 + 0.22 * eo(u); r.scale.set(s, s, s * 0.6); r.position.set(0, dir > 0 ? lerp(yT, yR, u) : lerp(yR, yT, u), 0); r.material.color.set(dir > 0 ? 0x62e3d4 : 0xffb547).multiplyScalar(2.2 * (1 - u * 0.7)); });
  // glifos que bajan del móvil al cargador: «+», «−», «=»
  const G = [[S.pk.plus, K.mas12], [S.pk.minus, K.menos], [S.pk.eq, K.asi]];
  G.forEach(([o, t0]) => { const u = (t - t0 + 0.05) / 0.55; o.visible = u > 0 && u < 1.25; if (!o.visible) return; face(o);
    const s = 0.075 * (0.6 + 0.4 * eo(clamp(u * 3))) * (u > 1 ? 1 - (u - 1) * 4 : 1); o.scale.setScalar(Math.max(1e-4, s)); o.position.set(0.0, lerp(yR - 0.03, yT + 0.03, sm5(clamp(u))), 0.12); });
  // ráfaga de paquetes pequeños «varias veces por segundo»
  const dm = new THREE.Matrix4(), a = env(t, K.luego, K.golpecitos, 0.3, 0.3); S.dots.visible = a > 0.01;
  for (let i = 0; i < 40; i++) { const u = ((t - K.luego) * 1.4 + i / 40 * 4) % 1, x = (hash(i * 3.3) - 0.5) * 0.36, z = (hash(i * 7.7) - 0.5) * 0.3; const s = 0.0045 * a * Math.sin(Math.PI * u);
    dm.makeScale(Math.max(1e-5, s), Math.max(1e-5, s), Math.max(1e-5, s)); dm.setPosition(x, lerp(yR, yT, u), z); S.dots.setMatrixAt(i, dm); }
  S.dots.instanceMatrix.needsUpdate = true;
}
// cable USB-C genérico (final: «¿con cable o sin cable?»)
function buildUsb() {
  const g = new THREE.Group(); scene.add(g); g.visible = false;
  const body = rbox(0.1, 0.24, 0.055, new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: 0.35, metalness: 0.2, clearcoat: 0.6 }), 0.025); g.add(body); edges(body, 0xdfe6ee, 1.2, 30, 0.35);
  const tip = rbox(0.07, 0.08, 0.025, new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 1, roughness: 0.2 }), 0.012); tip.position.y = 0.155; g.add(tip);
  const c = tube([v3(0, -0.12, 0), v3(0, -0.3, 0.02), v3(0.1, -0.55, 0.12), v3(0.35, -0.75, 0.3)], 0.016, new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.6 }), 40); g.add(c);
  return g;
}

function stageAt(t) {
  const P = S.phone, C = S.charger, F = S.faraday, cu = C.userData, pu = P.userData;
  // ---- móvil
  const ps = phonePose(t); P.position.copy(ps.p); P.quaternion.copy(ps.q);
  const fadeAll = env(t, K.induccion + 0.15, K.parece + 0.25, 0.45, 0.4);   // Faraday: carcasas fuera
  phoneState(P, ps.ex, ps.xr, 0.08);
  for (const k of ['frame', 'back', 'screen', 'batt', 'board']) { const g = pu.parts[k]; if (fadeAll > 0.001) { setOp(g, (1 - fadeAll) * (k === 'batt' || k === 'board' ? 1 : 1 - 0.94 * ps.xr)); edgeOp(g, (1 - fadeAll) * (0.08 + 0.85 * ps.xr)); } }
  pu.M.screen.emissiveIntensity = 1.1 * env(t, K.apoyas + 0.25, K.truco + 0.2, 0.25, 0.3) + 1.1 * env(t, K.apoyes + 0.25, END - 1.5, 0.25, 0.4);
  // ---- cargador
  let cx = keyed(t, [[0, 0.6], [1.9, 0.6], [2.4, 0], [K.dentro, 0], [K.dentro + 0.5, 1], [K.parece + 0.1, 1], [K.parece + 0.5, 0], [K.imanes - 0.25, 0], [K.imanes + 0.1, 1], [K.centran + 0.5, 1], [K.y11, 0.0], [K.y11 + 0.5, 1], [K.mismo + 0.6, 1], [K.y14 - 0.2, 0]]);
  if (t > END - 1.45) cx = 0.6 * sm5(clamp((t - END + 1.45) / 1.0));
  chargerXray(C, cx, 0.1 * (1 - fadeAll));
  if (fadeAll > 0.001) { cu.shellM.opacity *= 1 - fadeAll; cu.padM.opacity *= 1 - fadeAll; edgeOp(cu.shell, (1 - fadeAll) * (0.1 + 0.8 * cx)); cu.shellM.transparent = cu.padM.transparent = true; }
  cu.fer.visible = cu.pcb.visible = fadeAll < 0.9;
  const ledOn = t > K.apoyas + 0.2 && t < K.corta || t > K.apoyes + 0.15 && t < END - 1.0;
  cu.ledM.emissive.set(t > K.corta && t < K.apoyes ? 0xff4e42 : 0x62e3d4); cu.ledM.emissiveIntensity = ledOn ? 0.7 : (t > K.corta && t < K.corta + 1.2 ? 0.9 * (Math.sin(t * 22) > 0 ? 1 : 0.15) : 0);
  // ---- bobinas: corriente y calor
  const off = flowOff(t), tg = txGlow(t), heat = 0.9 * env(t, K.calor - 0.1, K.en9 + 0.9, 0.4, 0.8);
  const tap = tapAt(t), mod = t > K.mismo && t < K.morse + 0.6 ? 0.35 + 0.9 * tap : 1;
  setCurrent(cu.tx, tg * mod, off, heat * 0.8);
  const macro = env(t, K.dos7 - 0.3, K.en9 + 0.3, 0.3, 0.3);
  const rxOn = (t < K.apoyas + 0.2 ? 0.55 : (t > K.aparece && t < K.corta ? (t < K.aparece + 0.3 ? 0.9 * (t - K.aparece) / 0.3 : 0.75) : (t > K.apoyes + 0.1 ? 0.6 : 0))) * (1 - 0.55 * macro);
  setCurrent(pu.rx, rxOn * mod, -off * 0.9, heat);
  S.rig.coilL.intensity = 1.4 * tg + 2.5 * heat;
  // ---- campo magnético
  const fk = keyed(t, [[K.crea - 0.02, 0], [K.crea + 0.8, 1], [K.induccion + 0.2, 1], [K.y6, 0], [K.realidad + 0.1, 0], [K.dos7, 1], [K.en9 - 0.1, 1], [K.en9 + 0.4, 0], [K.y11, 0], [K.y11 + 0.6, 1], [K.corta, 1], [K.corta + 0.12, 0], [K.apoyes + 0.1, 0], [K.apoyes + 0.7, 1], [END - 1.6, 1], [END - 1.1, 0]]);
  const ph = P.position.y, stretch = 1 + 1.15 * clamp((ph - PY_ON) / 0.6);
  const proto = env(t, K.y11, K.y14, 0.4, 0.4);
  fieldState(t, fk, stretch, off * 0.55, (0.55 + 0.45 * mod) * (1 - 0.35 * proto) * (t > K.corta && t < K.corta + 0.12 ? 2.5 : 1));
  S.rig.fieldL.intensity = 1.6 * fk;
  // ---- Faraday: las bobinas se convierten en los devanados del anillo de hierro
  const fr = env(t, K.y6 - 0.1, K.parece + 0.35, 0.55, 0.45);
  F.visible = fr > 0.002; const fu = F.userData;
  if (F.visible) {
    F.position.set(0, 0.044 + fu.R, 0); fu.U.uA.value = fr; edgeOp(fu.ring, 0.55 * fr);
    const wk = pop(t, K.y6 + 0.05, 0.45) * (1 - win(t, K.parece, 0.3)); fu.wA.scale.setScalar(Math.max(1e-3, wk)); fu.wB.scale.setScalar(Math.max(1e-3, wk));
    fu.wA.position.set(0, -fu.R * (1 - wk), 0); fu.wB.position.set(0, fu.R * (1 - wk), 0);
    fu.wA.userData.U.uGlow.value = 1.1 * wk; fu.wA.userData.U.uOff.value = off; fu.wB.userData.U.uGlow.value = 0.9 * wk * win(t, K.faraday - 0.05, 0.2); fu.wB.userData.U.uOff.value = -off;
    const gk = pop(t, K.descubrio, 0.4) * (1 - win(t, K.parece, 0.3)); fu.gal.scale.setScalar(Math.max(1e-3, gk)); fu.pile.scale.setScalar(Math.max(1e-3, gk)); fu.wires.forEach(w => w.visible = gk > 0.5);
    fu.needle.rotation.z = -0.95 * Math.exp(-Math.max(0, t - K.faraday) * 2.4) * Math.sin(Math.max(0, t - K.faraday) * 9) * (t > K.faraday ? 1 : 0);
    S.ironFluxM.opacity = fr * win(t, K.faraday - 0.1, 0.3); S.ironFluxM.dashOffset = -off * 0.4;
  }
  // las bobinas planas se encogen hacia los devanados mientras crece el anillo
  const mk = win(t, K.y6 - 0.1, 0.45) * (1 - win(t, K.parece, 0.35));
  cu.tx.scale.setScalar(Math.max(1e-3, 1 - mk)); pu.rx.scale.setScalar(Math.max(1e-3, 1 - mk)); pu.parts.coil.children[0].visible = mk < 0.7;
  // ---- corte transversal
  const sec = keyed(t, [[K.realidad - 0.05, 0], [K.realidad + 0.55, 1], [K.en9 - 0.2, 1], [K.en9 + 0.3, 0]]);
  SEC.constant = sec > 0.001 ? lerp(1.2, 0, sm5(sec)) : 50; secSides(sec > 0.001);
  // ---- barras de la prueba
  const bars = S.bars.userData.bars, bOut = 1 - win(t, K.por10, 0.5);
  barState(bars[0], win(t, K.prueba - 0.1, 0.4) * bOut, win(t, K.prueba + 0.1, 0.6) * bOut, 1 + 0.6 * env(t, K.con9, K.cable9 + 0.4, 0.1, 0.3));
  barState(bars[1], win(t, K.cargar9, 0.4) * bOut, win(t, K.gasto, 0.85) * bOut);
  barState(bars[2], win(t, K.descentrado + 0.1, 0.4) * bOut, win(t, K.aun, 0.6) * bOut);
  // ---- imanes
  const mg = env(t, K.imanes - 0.2, K.y11 + 0.2, 0.25, 0.3); cu.mags.visible = pu.mags.visible = mg > 0.01;
  cu.mags.scale.setScalar(Math.max(1e-3, pop(t, K.imanes - 0.2, 0.35))); pu.mags.scale.setScalar(Math.max(1e-3, pop(t, K.imanes - 0.1, 0.35)));
  // ---- moneda y llave
  const coin = S.coin, key = S.key;
  coin.visible = t > K.algo + 0.12 && t < K.apoyes; key.visible = t > K.llaves - 0.35 && t < K.apoyes;
  if (coin.visible) { const inn = sm5(clamp((t - K.algo - 0.12) / 0.5)), out = sm5(clamp((t - K.proxima - 0.05) / 0.45));
    coin.position.set(lerp(0.95, 0.17, inn) + 1.2 * out, 0.1015 + 0.0072, lerp(0.6, 0.15, inn) + 0.6 * out); coin.rotation.y = 2 * (1 - inn) + out;
    const ch = win(t, K.robando, 0.8) * (1 - win(t, K.corta + 0.05, 1.0)); coin.userData.m.emissiveIntensity = 4.5 * ch; coin.userData.m.emissive.setRGB(1, 0.18 + 0.25 * ch, 0.04);
    S.rig.coinL.intensity = 3.5 * ch; S.rig.coinL.position.set(coin.position.x, 0.16, coin.position.z); }
  else S.rig.coinL.intensity = 0;
  if (key.visible) { const inn = sm5(clamp((t - K.llaves + 0.35) / 0.45)), out = sm5(clamp((t - K.proxima) / 0.45));
    key.position.set(lerp(-0.95, -0.24, inn) - 1.2 * out, 0.1015 + 0.006, lerp(-0.6, -0.06, inn) - 0.5 * out); key.rotation.y = 0.7 + 1.5 * (1 - inn);
    const kh = win(t, K.llaves + 0.1, 0.7) * (1 - win(t, K.corta + 0.05, 1.0)); key.userData.m.emissiveIntensity = 4.0 * kh; }
  // ---- energía, pings, paquetes, USB
  energyAt(t); packetsAt(t);
  const ub = S.usb, uk = env(t, K.tu15 - 0.1, END - 1.3, 0.35, 0.4); ub.visible = uk > 0.01;
  if (ub.visible) { ub.position.set(-0.68, 0.45 + 0.03 * Math.sin(t * 2), 0.35); ub.rotation.set(0.15, 0.6 + 0.2 * Math.sin(t * 0.8), -0.25); ub.scale.setScalar(Math.max(1e-3, 1.7 * uk)); }
}
// ---------------------------------------------------------------- cámara: claves + giro cenital (frase 4) + vuelta al primer plano (bucle)
let CK = [], CK_OPEN = [];
function buildCam() {
  // distancias pensadas para vertical (9:16): a 32° caben de ancho ≈ 0,32 × distancia
  CK_OPEN = [
    [-1.4, [1.2, 2.6, 7.8], [0, 0.95, 0], 34, 0.06],
    [0.0, [2.3, 1.85, 4.9], [0, 0.9, 0], 32, 0.035],
    [0.9, [2.0, 1.55, 3.85], [0, 0.85, 0], 32, 0.0],
    [K.cada, [1.85, 1.4, 3.55], [0, 0.75, 0], 32, 0],
  ];
  CK = [
    ...CK_OPEN,
    // cae y se apoya: la cámara baja con él y gira alrededor
    [K.apoyas + 0.2, [2.2, 2.25, 3.4], [0, 0.12, 0], 32],
    [K.y2 + 0.3, [1.15, 2.35, 3.85], [0, 0.15, 0], 32],
    [K.final + 0.25, [-1.1, 2.25, 3.7], [0, 0.15, 0], 32, -0.03],
    // «el truco»: picado rápido al cargador (el móvil sale disparado hacia arriba)
    [K.dentro - 0.1, [0.85, 1.25, 2.0], [0, 0.05, 0], 32, 0.06],
    [K.bobina3, [0.5, 1.45, 1.75], [0, 0.04, 0], 32],
    [K.su, [0.12, 1.75, 1.0], [0, 0.04, 0], 34],
    [K.crea - 0.15, [0.3, 1.9, 0.25], [0, 0.04, 0], 36],
    // el campo sube y el móvil baja hasta él (vista de perfil)
    [K.campo5 + 0.3, [2.4, 0.75, 3.0], [0, 0.3, 0], 32],
    [K.bobina5 + 0.2, [2.9, 0.55, 3.0], [0, 0.42, 0], 32],
    [K.corriente5 + 0.2, [2.6, 0.5, 3.4], [0, 0.44, 0], 32],
    // Faraday: de frente (el anillo está en el plano XY)
    [K.induccion + 0.3, [0.9, 0.55, 4.3], [0, 0.4, 0], 32],
    [K.faraday + 0.4, [-0.5, 0.48, 4.25], [0, 0.4, 0], 32],
    // «parece que carga por contacto»: a ras del borde
    [K.contacto + 0.05, [2.2, 0.45, 1.9], [0.15, 0.12, 0.05], 30],
    [K.realidad, [1.6, 0.3, 1.9], [0.05, 0.1, 0], 30],
    // corte transversal: de frente al corte (z = 0)
    [K.dos7, [0.2, 0.16, 2.3], [0, 0.085, 0], 28],
    [K.tocan + 0.2, [0.05, 0.1, 1.25], [0, 0.08, 0], 26],
    [K.forma, [-0.3, 0.25, 1.8], [0, 0.09, 0], 28],
    // la prueba: se aleja mucho y sube (barras)
    [K.prueba + 0.25, [1.9, 1.8, 5.8], [-0.25, 1.2, -0.6], 32],
    [K.mas9, [2.2, 2.0, 6.2], [-0.25, 1.25, -0.7], 32],
    [K.aun + 0.4, [1.9, 1.95, 5.9], [-0.2, 1.3, -0.7], 32],
    // imanes: arriba, en picado
    [K.imanes, [1.2, 2.4, 2.6], [0.05, 0.08, 0], 32],
    [K.centran + 0.3, [0.9, 2.2, 2.3], [0, 0.1, 0], 32],
    // «¿y qué le dice?»: baja en picado hasta la altura del hueco entre las dos bobinas (se acerca y abre el angular a la vez)
    [K.y11 + 0.25, [0.6, 0.3, 1.05], [0, 0.22, 0], 46],
    [K.el11 + 0.3, [1.5, 1.45, 2.6], [0, 0.25, 0], 34],
    [K.compatible, [0.95, 1.5, 2.75], [0, 0.25, 0], 34],
    [K.bien, [-0.75, 1.4, 2.7], [0, 0.25, 0], 34],
    // se aleja para ver el campo con los golpecitos
    [K.mismo + 0.35, [-1.5, 1.25, 3.2], [0, 0.25, 0], 34],
    [K.morse + 0.3, [2.0, 1.0, 3.0], [0, 0.15, 0], 32],
    // la moneda
    [K.algo, [2.4, 1.45, 3.0], [0.03, 0.12, 0.03], 30],
    [K.moneda, [1.5, 1.0, 1.95], [0.05, 0.11, 0.05], 30],
    [K.corta, [1.42, 0.95, 1.85], [0.04, 0.11, 0.04], 30],
    [K.corta + 0.6, [2.0, 1.3, 2.7], [0.03, 0.12, 0.02], 30],
    // vuelve a apoyarse y «están hablando»
    [K.apoyes + 0.2, [2.1, 1.55, 3.4], [0, 0.2, 0], 32],
    [K.hablando + 0.3, [2.4, 1.4, 3.9], [0, 0.35, 0], 32],
    // «¿con cable o sin cable?»: plano abierto con el cable USB a la izquierda
    [K.con15, [0.25, 1.5, 5.0], [-0.25, 0.35, 0], 32],
    [K.cable15b + 0.3, [0.5, 1.6, 5.3], [-0.2, 0.4, 0], 32],
  ];
}
function spinCam(t) {    // casi cenital sobre la bobina, girando cada vez más deprisa con los cambios de sentido
  const a = 1.2 + 0.35 * (t - K.su) + 0.55 * Math.pow(Math.max(0, t - K.cambia), 1.7), r = 0.36;
  return { p: v3(r * Math.cos(a), 1.9, r * Math.sin(a)), l: v3(0, 0.044, 0), f: 36, roll: 0 };
}
function blendCam(A, B, w) { return { p: A.p.clone().lerp(B.p, w), l: A.l.clone().lerp(B.l, w), f: lerp(A.f, B.f, w), roll: lerp(A.roll, B.roll, w) }; }
function camAt(t) {
  let c = camKeys(t, CK);
  const ws = win(t, K.su - 0.2, 0.5) * (1 - win(t, K.crea - 0.4, 0.45)); if (ws > 0) c = blendCam(c, spinCam(t), ws);
  const we = win(t, END - 1.3, 1.0); if (we > 0) c = blendCam(c, camKeys(t - END, CK_OPEN), we);
  // sacudidas: aterrizajes, imanes y el corte
  let sh = 0; for (const [t0, a] of [[K.apoyas + 0.16, 0.006], [K.contacto + 0.1, 0.004], [K.centran + 0.16, 0.008], [K.corta, 0.012], [K.apoyes + 0.12, 0.005]]) if (t > t0) sh += a * Math.exp(-(t - t0) * 9);
  if (sh > 1e-4) { c.p.x += sh * Math.sin(t * 97); c.p.y += sh * Math.cos(t * 83); c.l.x += sh * 0.5 * Math.sin(t * 71); }
  return c;
}
// ---------------------------------------------------------------- qué pone el HUD en cada instante
const wp = (o, v = new THREE.Vector3()) => o.getWorldPosition(v);
const ckk = (t, t0, t1, d = 0.6) => (t < t0 || t > t1 + 0.3 ? 0 : clamp((t - t0) / d));
const ckf = (t, t1) => 1 - win(t, t1, 0.28);
function co(t, t0, t1, anchor, txt, sub, o = {}) { const k = ckk(t, t0, t1, o.d || 0.6); if (k > 0) callout(anchor, txt, sub, k, { ...o, fade: ckf(t, t1) }); }
let SECT = [], TERM = [];
function buildHudPlan() {
  SECT = [[-9, 'MÓVIL  ·  CARGADOR'], [K.truco, 'TX  ·  BOBINA EMISORA'], [K.crea, 'CAMPO  ·  BOBINA RECEPTORA'], [K.se6, 'INDUCCIÓN  ·  1831'], [K.parece, 'CORTE TRANSVERSAL'],
    [K.pero, 'PÉRDIDAS  ·  CALOR'], [K.en9, 'PRUEBA 2020  ·  0 → 100 %'], [K.por10, 'ALINEACIÓN MAGNÉTICA'], [K.y11, 'PROTOCOLO  ·  TX ⇄ RX'], [K.y14, 'DETECCIÓN DE OBJETOS'], [K.la15, 'MÓVIL  ·  CARGADOR']];
  TERM = [
    { t0: K.pregunta + 0.1, who: 'TX', txt: '¿HAY ALGUIEN?' },
    { t0: K.si11, who: 'RX', txt: 'SÍ, SOY COMPATIBLE ✓' },
    { t0: K.varias, who: 'RX', txt: '· · ·  CADA ≤ 250 ms', col: HC.grey },
    { t0: K.mas12, who: 'RX', txt: 'MÁS  ▲' },
    { t0: K.menos, who: 'RX', txt: 'MENOS  ▼' },
    { t0: K.asi, who: 'RX', txt: 'ASÍ ESTÁ BIEN  ●' },
    { t0: K.cuenta14 + 0.15, who: 'RX', txt: 'RECIBO ESTO  ▮▮▮▮' },
    { t0: K.cuadra, who: 'TX', txt: 'NO CUADRA  ✕', col: HC.red },
    { t0: K.corta, who: 'TX', txt: 'CORTO LA ENERGÍA  ■', col: HC.red, d: 0.4 },
  ];
}
function sectAt(t) { let s = SECT[0][1]; for (const [t0, x] of SECT) if (t >= t0 - 0.05) s = x; return s; }
// flecha de corriente alrededor de la bobina (arco ámbar que gira en el sentido de la corriente)
function coilArrow(t, a) {
  if (a <= 0.01) return;
  const dir = curDir(t), rot = flowOff(t) * 0.9, pts = [];
  for (let i = 0; i <= 64; i++) { const ang = rot + i / 64 * Math.PI * 1.55; pts.push(proj(v3(Math.cos(ang) * 0.3, 0.07, Math.sin(ang) * 0.3))); }
  if (dir < 0) pts.reverse();
  hg.save(); hg.globalAlpha = a; glowStroke(HC.amber, 3, 14); hg.beginPath(); pts.forEach((p, i) => (i ? hg.lineTo(p.x, p.y) : hg.moveTo(p.x, p.y))); hg.stroke();
  const p1 = pts[pts.length - 1], p0 = pts[pts.length - 4], ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
  hg.fillStyle = HC.amber; hg.beginPath(); hg.moveTo(p1.x + Math.cos(ang) * 18, p1.y + Math.sin(ang) * 18); hg.lineTo(p1.x + Math.cos(ang + 2.5) * 16, p1.y + Math.sin(ang + 2.5) * 16); hg.lineTo(p1.x + Math.cos(ang - 2.5) * 16, p1.y + Math.sin(ang - 2.5) * 16); hg.closePath(); hg.fill();
  noGlow(); hg.restore();
}
function hudAt(t) {
  hudBegin();
  const P = S.phone, C = S.charger, pu = P.userData, cu = C.userData;
  const rxW = wp(pu.rx), txW = wp(cu.tx), batW = wp(pu.parts.batt), phW = P.position.clone();
  // ---- cabecera y mensaje pendiente
  let msg = null;
  if (t >= K.estan) msg = { txt: 'MENSAJE · RECIBIDO ✓', col: HC.teal, k: clamp((t - K.estan) / 0.3) };
  else if (t >= K.y11) msg = { txt: 'MENSAJE · DESCIFRANDO', col: HC.amber, k: 1, blink: true };
  else if (t >= K.final) msg = { txt: 'MENSAJE · ???', col: HC.white, k: clamp((t - K.final) / 0.2), blink: true };
  header(t, sectAt(t), msg);
  // ---- la onda de voz entre las dos bobinas (al principio, «están hablando» y el bucle)
  const wa = Math.max(env(t, -2, K.apoyas + 0.15, 0.1, 0.2), env(t, K.estan - 0.05, K.tu15 + 0.3, 0.3, 0.4), win(t, END - 1.0, 0.6));
  if (wa > 0.01) waveform(proj(txW), proj(rxW), 14 + 75 * Math.max(voice(t), t > END - 1.2 ? 0.45 : 0), t, wa);
  // ---- 1-2: RX / TX, bocadillo y «te lo cuento al final»
  co(t, K.movil1, K.apoyas, rxW, 'RX', 'MÓVIL', { dx: -170, dy: -120, d: 0.4 });
  co(t, K.cargador1, K.apoyas, txW, 'TX', 'CARGADOR', { dx: 170, dy: 150, d: 0.4 });
  const bk = ckk(t, K.y2, K.final + 0.5, 0.35);
  if (bk > 0) bubble(proj(phW.clone().add(v3(0, 0.1, 0))), bk, clamp((t - K.cuento) / (K.final + 0.4 - K.cuento)), t, 900, 232);
  // ---- 3-4: la bobina emisora y su corriente
  co(t, K.dentro + 0.1, K.bobina3 - 0.1, v3(0.43, 0.09, 0.22), 'CARCASA', 'PLÁSTICO', { dx: 130, dy: -150, d: 0.4 });
  co(t, K.bobina3, K.cambia, txW.clone().add(v3(0.16, 0.01, 0.08)), 'BOBINA EMISORA', 'HILO DE COBRE · Cu', { dx: 120, dy: -190, color: HC.white });
  coilArrow(t, env(t, K.corriente4, K.crea + 0.1, 0.3, 0.3));
  const sa = env(t, K.corriente4, K.crea, 0.3, 0.3);
  if (sa > 0.01) { const f = 2 + 70 * Math.pow(clamp((t - K.cambia) / 2.6), 2); scope((u, tt) => Math.sin(Math.PI * 2 * u * f * (curDir(tt) > 0 ? 1 : 1) - tt * 14), t, sa, 'CORRIENTE · TX', '87–205 kHz'); }
  const ca = env(t, K.cienmil - 0.1, K.crea, 0.2, 0.3);
  if (ca > 0.01) { const n = Math.round(100000 * eo(clamp((t - K.cienmil + 0.1) / 0.55))), s = '+' + n.toLocaleString('es-ES').replace(/\./g, ' ');
    bigText(s, 56, 1350, 64, HC.amber, ca, { align: 'left', type: false, ls: 4, glow: 18 });
    bigText('CAMBIOS DE SENTIDO', 58, 1420, 20, HC.grey, ca, { align: 'left', bold: false, ls: 4 }); bigText('POR SEGUNDO', 58, 1452, 20, HC.grey, ca, { align: 'left', bold: false, ls: 4 }); }
  // ---- 5: campo y bobina receptora
  const st = S.field.up.scale.y;
  co(t, K.campo5, K.se6, v3(0.42 * Math.cos(0.3), 0.044 + 0.21 * st, 0.42 * Math.sin(0.3)), 'CAMPO MAGNÉTICO', null, { dx: 120, dy: -150, color: HC.teal });
  co(t, K.bobina5, K.se6, rxW, 'BOBINA RECEPTORA', 'DENTRO DEL MÓVIL', { dx: -140, dy: -170 });
  co(t, K.corriente5, K.se6, batW, 'CORRIENTE → BATERÍA', null, { dx: -120, dy: 150, color: HC.amber });
  // ---- 6: inducción · Faraday
  const ia = ckk(t, K.induccion, K.parece - 0.1, 0.5) * ckf(t, K.parece - 0.1);
  bigText('INDUCCIÓN', 540, 1380, 88, HC.teal, ia, { glow: 22 }); bigText('ELECTROMAGNÉTICA', 540, 1452, 24, HC.grey, ia, { bold: false, ls: 8 });
  const fa = ckk(t, K.faraday, K.parece + 0.1, 0.5) * ckf(t, K.parece + 0.1);
  bigText('M. FARADAY · 1831', 540, 1530, 36, HC.white, fa, { ls: 6 });
  const F = S.faraday;
  if (F.visible) { co(t, K.descubrio, K.parece, wp(F).add(v3(-0.33, 0.0, 0.05)), 'ANILLO DE HIERRO', null, { dx: -60, dy: -230, d: 0.45 });
    co(t, K.faraday + 0.1, K.parece, wp(F.userData.gal), 'GALVANÓMETRO', null, { dx: 40, dy: -200, side: -1, d: 0.45 }); }
  // ---- 7: «¿contacto?» y el corte: las bobinas no se tocan
  const ka = ckk(t, K.contacto, K.realidad + 0.3, 0.3) * ckf(t, K.realidad + 0.3);
  if (ka > 0) { const p = proj(v3(0.33, 0.1, 0.28)); brackets(p, 230, 130, ka); bigText('¿CONTACTO?', p.x, p.y - 100, 30, HC.white, ka, { ls: 5 }); }
  co(t, K.bobinas7, K.en9, v3(0.16, 0.111, 0), 'BOBINA RX', 'MÓVIL', { dx: 90, dy: -160, d: 0.45 });
  co(t, K.bobinas7 + 0.15, K.en9, v3(0.17, 0.0435, 0), 'BOBINA TX', 'CARGADOR', { dx: 90, dy: 170, d: 0.45 });
  const da = ckk(t, K.nunca, K.en9, 0.5) * ckf(t, K.en9);
  if (da > 0) dimV(proj(v3(-0.06, 0.05, 0)), proj(v3(-0.06, 0.105, 0)), 'NO SE TOCAN', da, HC.white, -120);
  // ---- 8: pérdidas y calor
  co(t, K.pierde, K.en9, v3(0.24, 0.075, -0.02), 'PÉRDIDAS', null, { dx: 110, dy: -200, color: HC.amber, d: 0.4 });
  co(t, K.calor, K.en9 + 0.2, v3(-0.12, 0.05, -0.01), 'CALOR', null, { dx: -110, dy: 200, color: '#FF8A4C', d: 0.35 });
  // ---- 9-10: barras de la prueba
  const bars = S.bars.userData.bars, top = b => v3(b.x, b.fill.scale.y + 0.02, b.z);
  const ta = ckk(t, K.prueba, K.por10, 0.6) * ckf(t, K.por10);
  if (ta > 0) { hg.save(); hg.globalAlpha = ta; hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, 150, 1440, 780, 56, 28); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 1.5; hg.stroke(); hg.restore();
    bigText('PRUEBA 2020 · MISMO MÓVIL · 0 → 100 %', 540, 1469, 22, HC.white, ta, { bold: false, ls: 3 }); }
  co(t, K.prueba + 0.35, K.descentrado + 0.2, top(bars[0]), 'CON CABLE', '14,26 Wh', { dx: -60, dy: -120, side: -1, len: 40, d: 0.45, subSize: 22, subCol: HC.white });
  co(t, K.gasto + 0.2, K.descentrado + 0.2, top(bars[1]), 'SIN CABLE', '21,01 Wh', { dx: -40, dy: -170, side: -1, len: 40, d: 0.45, subSize: 22, subCol: HC.amber });
  co(t, K.cincuenta, K.aun + 0.1, top(bars[1]).add(v3(0.2, -0.1, 0)), '+47 %', 'MÁS ENERGÍA', { dx: 160, dy: -60, size: 58, color: HC.amber, d: 0.35 });
  co(t, K.descentrado, K.por10, phW.clone().add(v3(0.1, 0.04, 0.1)), 'DESCENTRADO', null, { dx: 120, dy: 140, color: HC.red, d: 0.4 });
  co(t, K.aun + 0.25, K.por10, top(bars[2]), '+80 %', '25,62 Wh', { dx: -140, dy: 60, size: 58, color: '#FF7A55', d: 0.35 });
  // ---- 10: imanes
  co(t, K.imanes, K.y11, v3(0.3 * Math.cos(0.6), 0.07, 0.3 * Math.sin(0.6)), 'IMANES', 'ALINEAN LAS BOBINAS', { dx: 130, dy: -170, d: 0.45 });
  co(t, K.centran + 0.15, K.y11, phW.clone().add(v3(0, 0.05, 0)), 'CENTRADO ✓', null, { dx: -120, dy: -200, color: HC.teal, d: 0.35 });
  // ---- 11-14: la conversación
  terminal(TERM, t, env(t, K.el11, K.la15 + 0.2, 0.35, 0.4));
  const ga = env(t, K.pide, K.se13 + 0.1, 0.3, 0.3);
  if (ga > 0) { const v = keyed(t, [[K.pide, 0.55], [K.mas12 + 0.25, 0.55], [K.mas12 + 0.5, 0.82], [K.menos + 0.25, 0.82], [K.menos + 0.5, 0.38], [K.asi + 0.25, 0.38], [K.asi + 0.5, 0.6]]);
    hbars([{ name: 'POTENCIA', v, col: HC.amber, txt: v > 0.7 ? '▲' : v < 0.45 ? '▼' : '●' }], t, ga, 'CONTROL DE POTENCIA'); }
  const ma = env(t, K.se13, K.y14 + 0.1, 0.3, 0.3);
  if (ma > 0) { scope((u, tt) => { const x = u * 4.2 - (tt - K.se13) * 2.2; let tap = 0, acc = 0; for (const d of MORSE) { const s = (x % 4.2 + 4.2) % 4.2; if (s >= acc && s < acc + d * 2.4) tap = 1; acc += d * 2.4 + 0.17; } return Math.sin(Math.PI * 2 * u * 30) * (tap ? 0.45 : 1); }, t, ma, 'MODULACIÓN DE CARGA', 'RX → TX', HC.teal);
    bigText('·  —  ·  ·  —', 832, 1222, 40, HC.amber, ckk(t, K.como13, K.y14, 0.4) * ckf(t, K.y14), { glow: 16, ls: 6 }); }
  const ea = env(t, K.cuenta14, K.corta + 0.7, 0.3, 0.3);
  if (ea > 0) { const bad = win(t, K.cuadra, 0.35); hbars([{ name: 'ENVÍA', v: 0.86, col: HC.teal }, { name: 'RECIBE', v: 0.86 - 0.32 * bad, col: HC.amber, gap: 0.32 * bad, txt: bad > 0.5 ? 'Δ NO CUADRA' : '' }], t, ea, 'BALANCE DE ENERGÍA'); }
  if (S.coin.visible) co(t, K.moneda, K.corta + 0.6, wp(S.coin), 'MONEDA', 'SE CALIENTA', { dx: 120, dy: 170, color: '#FF7A55', d: 0.35 });
  if (S.key.visible) co(t, K.llaves, K.corta + 0.6, wp(S.key), 'LLAVES', null, { dx: -110, dy: 190, color: '#FF7A55', d: 0.35 });
  stamp('CORTE', 540, 980, ckk(t, K.corta, K.la15, 0.5) * ckf(t, K.la15));
  // ---- 15: ¿con cable o sin cable?
  if (S.usb.visible) co(t, K.con15, END - 1.3, wp(S.usb).add(v3(0, 0.16, 0)), 'CON CABLE', null, { dx: -40, dy: -170, side: -1, d: 0.35 });
  co(t, K.sin15, END - 1.3, txW.clone().add(v3(0.2, 0.06, 0.2)), 'SIN CABLE', null, { dx: 120, dy: -190, d: 0.35 });
}
// ---------------------------------------------------------------- un fotograma
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3();
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
function frame(t) {
  placeCam(camAt(t - 1 / 60)); const prevVP = vpOf();
  placeCam(camAt(t - 1 / 36)); const PVP = vpOf();
  const st = camAt(t); placeCam(st); const VP = vpOf();
  stageAt(t);
  flowUpdate(t, VP, PVP); S.gridM.uniforms.camP.value.copy(cam.position);
  // flujo de la cámara para el desenfoque: cómo se ha movido en pantalla el plano al que se mira
  const d = Math.max(0.05, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _rt.setFromMatrixColumn(cam.matrixWorld, 0); _up.setFromMatrixColumn(cam.matrixWorld, 1);
  const P0 = cam.position.clone().addScaledVector(_fw, d), Px = P0.clone().addScaledVector(_rt, d * 0.4), Py = P0.clone().addScaledVector(_up, d * 0.4);
  const a = [P0, Px, Py].map(p => p.clone().applyMatrix4(VP)), b = [P0, Px, Py].map(p => p.clone().applyMatrix4(prevVP));
  const m = a.map((q, i) => [q.x - b[i].x, q.y - b[i].y]), dx = [a[1].x - a[0].x, a[1].y - a[0].y], dy = [a[2].x - a[0].x, a[2].y - a[0].y];
  const det = dx[0] * dy[1] - dy[0] * dx[1] || 1e-6, N = [[m[1][0] - m[0][0], m[2][0] - m[0][0]], [m[1][1] - m[0][1], m[2][1] - m[0][1]]];
  const inv = [[dy[1] / det, -dy[0] / det], [-dx[1] / det, dx[0] / det]];
  const J = [N[0][0] * inv[0][0] + N[0][1] * inv[1][0], N[0][0] * inv[0][1] + N[0][1] * inv[1][1], N[1][0] * inv[0][0] + N[1][1] * inv[1][0], N[1][0] * inv[0][1] + N[1][1] * inv[1][1]];
  post.uniforms.m0.value.set(m[0][0], m[0][1]); post.uniforms.a0.value.set(a[0].x, a[0].y); post.uniforms.J.value.set(...J);
  // destellos: aterrizajes, «Faraday», imanes y el corte
  let fl = 0; for (const [t0, k] of [[K.apoyas + 0.16, 0.05], [K.faraday, 0.04], [K.centran + 0.16, 0.05], [K.corta, 0.16], [K.apoyes + 0.12, 0.04]]) if (t > t0) fl += k * Math.exp(-(t - t0) / 0.06);
  post.uniforms.flash.value = fl;
  const red = t > K.corta ? 0.06 * Math.exp(-(t - K.corta) / 0.35) : 0; post.uniforms.tint.value.set(red, 0, 0);
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
// portada: el móvil despiezado de pie sobre el cargador, hablando (sin desenfoque)
window.renderCover = function () {
  const t = Number(window.COVER_T || 0.55); frame(t);
  if (window.camOverride) window.camOverride(cam, v3);
  post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); post.uniforms.flash.value = 0;
  drawFrame(t); hudBegin();
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '700' }), new FontFace('SpaceMono', `url(${F}SpaceMono-Regular.ttf)`, { weight: '400' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    tu: atL(1, '=tu'), movil1: atL(1, 'movil'), habla: atL(1, 'habla'), cargador1: atL(1, 'cargador'), cada: atL(1, 'cada'), apoyas: atL(1, 'apoyas'),
    y2: atL(2, '=y'), dice2: atL(2, 'dice'), te2: atL(2, '=te'), cuento: atL(2, 'cuento'), final: atL(2, 'final'),
    truco: atL(3, 'truco'), dentro: atL(3, 'dentro'), cargador3: atL(3, 'cargador'), hay3: atL(3, '=hay'), bobina3: atL(3, 'bobina'), cobre: atL(3, 'cobre'),
    su: atL(4, '=su'), corriente4: atL(4, 'corriente'), cambia: atL(4, 'cambia'), sentido: atL(4, 'sentido'), mas4: atL(4, '=mas'), cienmil: atL(4, '100000'), veces4: atL(4, 'veces'), segundo4: atL(4, 'segundo'),
    crea: atL(5, 'crea'), campo5: atL(5, 'campo'), atraviesa: atL(5, 'atraviesa'), bobina5: atL(5, 'bobina'), movil5: atL(5, 'movil'), y5: atL(5, '=y'), aparece: atL(5, 'aparece'), corriente5: atL(5, 'corriente'),
    se6: atL(6, '=se'), induccion: atL(6, 'induccion'), y6: atL(6, '=y'), descubrio: atL(6, 'descubrio'), faraday: atL(6, 'faraday'),
    parece: atL(7, 'parece'), carga7: atL(7, '=carga'), contacto: atL(7, 'contacto'), realidad: atL(7, 'realidad'), dos7: atL(7, '=dos'), bobinas7: atL(7, 'bobinas'), nunca: atL(7, 'nunca'), tocan: atL(7, 'tocan'),
    pero: atL(8, 'pero'), parte: atL(8, 'parte'), energia8: atL(8, 'energia'), pierde: atL(8, 'pierde'), forma: atL(8, 'forma'), calor: atL(8, 'calor'),
    en9: atL(9, '=en'), prueba: atL(9, 'prueba'), cargar9: atL(9, 'cargar'), sin9: atL(9, '=sin'), gasto: atL(9, 'gasto'), casi: atL(9, 'casi'), cincuenta: atL(9, '50'), mas9: atL(9, '=mas'), con9: atL(9, '=con'), cable9: atL(9, 'cable', 2),
    descentrado: atL(10, 'descentrado'), aun: atL(10, 'aun'), mas10: atL(10, '=mas'), por10: atL(10, '=por'), cargadores: atL(10, 'cargadores'), imanes: atL(10, 'imanes'), centran: atL(10, 'centran'),
    y11: atL(11, '=y'), dice11: atL(11, 'dice'), el11: atL(11, '=el'), pregunta: atL(11, 'pregunta'), hay11: atL(11, '=hay'), alguien: atL(11, 'alguien'), y11b: atL(11, '=y', 2), movil11: atL(11, 'movil'), si11: atL(11, '=si'), soy: atL(11, 'soy'), compatible: atL(11, 'compatible'),
    luego: atL(12, 'luego'), varias: atL(12, 'varias'), segundo12: atL(12, 'segundo'), pide: atL(12, 'pide'), mas12: atL(12, '=mas'), menos: atL(12, 'menos'), o12: atL(12, '=o'), asi: atL(12, 'asi'), bien: atL(12, 'bien'),
    se13: atL(13, '=se'), dice13: atL(13, 'dice'), mismo: atL(13, 'mismo'), campo13: atL(13, 'campo'), golpecitos: atL(13, 'golpecitos'), como13: atL(13, 'como'), morse: atL(13, 'morse'),
    y14: atL(14, '=y'), cuenta14: atL(14, 'cuenta'), energia14: atL(14, 'energia'), recibe: atL(14, 'recibe'), si14: atL(14, '=si'), cuadra: atL(14, 'cuadra'), algo: atL(14, 'algo'), robando: atL(14, 'robando'),
    moneda: atL(14, 'moneda'), llaves: atL(14, 'llaves'), y14b: atL(14, '=y', 2), cargador14: atL(14, 'cargador'), corta: atL(14, 'corta'),
    la15: atL(15, '=la'), proxima: atL(15, 'proxima'), apoyes: atL(15, 'apoyes'), sabes: atL(15, 'sabes'), estan: atL(15, 'estan'), hablando: atL(15, 'hablando'),
    tu15: atL(15, '=tu'), cargas15: atL(15, 'cargas'), con15: atL(15, '=con'), cable15a: atL(15, 'cable', 1), sin15: atL(15, '=sin'), cable15b: atL(15, 'cable', 2),
  };
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.42; }
  buildFlips(); buildCam(); buildHudPlan();
  buildRig(); buildFloor(); buildFlow();
  S.phone = buildPhone(); S.charger = buildCharger(); buildField(); S.faraday = buildFaraday(); S.bars = buildBars();
  S.coin = buildCoin(); S.key = buildKey(); buildEnergy(); buildPackets(); S.usb = buildUsb();
  clipAll([S.phone, S.charger, S.field.F, S.coin, S.key]);
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
