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
// ---------------------------------------------------------------- «FP o carrera»: piezas
// colores de bando: FP turquesa, CARRERA ámbar
const TEAL = 0x2fc7b6, AMBER = 0xf0a332;
const CT = new THREE.Color(0.25, 1.6, 1.45), CA = new THREE.Color(1.9, 1.05, 0.25);
const plasticS = (c, r = 0.28) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.05 });
const metalS = (c, r = 0.25) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 1 });
const SANS = '"Inter", "SpaceMono", sans-serif';
function textTex(w, h, draw) { return canvasTex(w, h, draw); }
function signPlane(txt, { w = 1, h = 0.25, col = '#EEF2F6', bg = null, size = 0.62, font = SANS, weight = 900, ls = 0 } = {}) {
  const tw = 1024, th = Math.round(1024 * h / w);
  const tex = textTex(tw, th, (g, W2, H2) => { if (bg) { g.fillStyle = bg; rr(g, 4, 4, W2 - 8, H2 - 8, H2 * 0.18); g.fill(); }
    let px = Math.round(H2 * size); g.letterSpacing = ls + 'px'; g.font = `${weight} ${px}px ${font}`; const mw = g.measureText(txt).width; if (mw > W2 * 0.92) { px = Math.floor(px * W2 * 0.92 / mw); g.font = `${weight} ${px}px ${font}`; }
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W2 / 2, H2 / 2 + H2 * 0.04); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 6; return m;
}

// ---------------------------------------------------------------- ofertas de trabajo: tarjetas
function cardTex() {
  return textTex(320, 424, (g, w, h) => {
    g.fillStyle = '#E8ECF1'; rr(g, 0, 0, w, h, 26); g.fill();
    g.fillStyle = '#1B1F27'; rr(g, 0, 0, w, 78, 26); g.fill(); g.fillRect(0, 50, w, 28);
    g.fillStyle = '#EEF2F6'; g.font = '700 34px SpaceMono'; g.letterSpacing = '6px'; g.textAlign = 'left'; g.fillText('OFERTA', 24, 52);
    g.fillStyle = '#9AA3AE'; for (let i = 0; i < 6; i++) { const ww = [230, 180, 250, 150, 210, 120][i]; rr(g, 24, 112 + i * 38, ww, 14, 7); g.fill(); }
    g.strokeStyle = '#C3CAD3'; g.lineWidth = 4; rr(g, 24, 344, 160, 52, 12); g.stroke();
  });
}
const CARD_W = 0.34, CARD_H = 0.45;
const GRID_C = v3(0, 1.55, 0);
function gridPos(i) { const c = i % 5, r = Math.floor(i / 5); return v3(GRID_C.x + (c - 2) * 0.4, GRID_C.y + (0.5 - r) * 0.52, GRID_C.z); }
function buildCards() {
  const tex = cardTex(), G = new THREE.Group(); scene.add(G);
  const cards = [];
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group(); G.add(g);
    const body = rbox(CARD_W, CARD_H, 0.014, plasticS(0xd9dee5, 0.5), 0.03); g.add(body);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W - 0.01, CARD_H - 0.01), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); face.position.z = 0.0075; g.add(face);
    // relleno de color que sube desde abajo (FP turquesa / CARRERA ámbar)
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W - 0.01, CARD_H - 0.01), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, depthWrite: false, toneMapped: false }));
    fill.position.z = 0.009; fill.visible = false; g.add(fill);
    const bFP = signPlane('FP', { w: 0.3, h: 0.14, col: '#04110F' }), bGR = signPlane('GRADO', { w: 0.34, h: 0.11, col: '#1A1004' });
    for (const b of [bFP, bGR]) { b.position.set(0, -0.09, 0.011); b.scale.setScalar(0.85); b.visible = false; g.add(b); }
    cards.push({ g, fill, bFP, bGR, face });
  }
  // lluvia: muchas tarjetas que vienen hacia la cámara (algunas ya teñidas)
  const N = 320, rain = new THREE.InstancedMesh(new THREE.BoxGeometry(CARD_W * 1.25, CARD_H * 1.25, 0.012), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }), N);
  rain.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); rain.frustumCulled = false; scene.add(rain);
  const seeds = []; for (let i = 0; i < N; i++) { const k = hash(i * 9.1); seeds.push({ x: (hash(i * 1.3) - 0.5) * 7, y: 0.4 + hash(i * 2.7) * 2.8, z: -hash(i * 4.4) * 42, rx: hash(i * 5.5) * 6, ry: hash(i * 6.6) * 6, k });
    rain.setColorAt(i, k < 0.47 ? new THREE.Color(0.45, 1.0, 0.93) : k < 0.68 ? new THREE.Color(1.0, 0.78, 0.42) : new THREE.Color(1, 1, 1)); }
  rain.instanceColor.needsUpdate = true;
  return { G, cards, rain, seeds };
}

// ---------------------------------------------------------------- arena: podios, muñecos, trofeo
const AR = v3(0, 0, -7);
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
function podium(col, name) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const c = cyl(0.42, 0.46, 1, plasticS(0x15171c, 0.45), 64); c.position.y = 0.5; body.add(c); edges(c, 0xdfe6ee, 1.1, 30, 0.25);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.425, 0.012, 8, 96), basicGlow(col, 2.2)); rim.rotation.x = Math.PI / 2; g.add(rim);
  const lab = signPlane(name, { w: 0.62, h: 0.16, col: '#' + new THREE.Color(col).getHexString() }); g.add(lab);
  g.userData = { body, rim, lab }; return g;
}
function setPodiumH(p, h) { p.userData.body.scale.y = h; p.userData.rim.position.y = h + 0.003; p.userData.lab.position.set(0, h * 0.5, 0.465); }
function trophy() {
  const g = new THREE.Group();
  const prof = [[0, 0], [0.13, 0], [0.13, 0.035], [0.05, 0.06], [0.035, 0.2], [0.05, 0.24], [0.15, 0.29], [0.19, 0.42], [0.2, 0.5], [0.185, 0.5], [0.17, 0.42], [0.13, 0.31], [0.0, 0.27]].map(([x, y]) => new THREE.Vector2(x, y));
  const mL = metalS(0xffc861, 0.22), mR = metalS(0xffc861, 0.22);
  const L = new THREE.Mesh(new THREE.LatheGeometry(prof, 48, Math.PI, Math.PI), mL), R = new THREE.Mesh(new THREE.LatheGeometry(prof, 48, 0, Math.PI), mR);
  for (const m of [L, R]) { m.material.side = THREE.DoubleSide; m.castShadow = true; g.add(m); }
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 24, Math.PI * 1.2), s < 0 ? mL : mR); h.position.set(s * 0.2, 0.38, 0); h.rotation.z = s < 0 ? Math.PI * 0.4 : -Math.PI * 0.4 + Math.PI; g.add(h); }
  const base = rbox(0.3, 0.3, 0.08, plasticS(0x1a1c21, 0.4), 0.02); base.rotation.x = -Math.PI / 2; base.position.y = -0.04; g.add(base);
  g.userData = { mL, mR }; return g;
}
function qmark(m) {
  const g = new THREE.Group(), pts = [];
  for (let i = 0; i <= 18; i++) { const a = lerp(Math.PI * 0.92, -Math.PI * 0.42, i / 18); pts.push(v3(Math.cos(a) * 0.15, 0.2 + Math.sin(a) * 0.15, 0)); }
  pts.push(v3(0.02, -0.02, 0), v3(0, -0.08, 0)); g.add(tube(pts, 0.042, m, 60));
  const dot = sph(0.05, m); dot.position.y = -0.21; g.add(dot); return g;
}
function numTex(txt, col, bg = '#101318') { return textTex(256, 256, (g, w, h) => { g.fillStyle = bg; rr(g, 6, 6, w - 12, h - 12, 28); g.fill(); g.strokeStyle = col; g.lineWidth = 8; rr(g, 10, 10, w - 20, h - 20, 26); g.stroke();
  g.fillStyle = col; g.font = `900 150px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 8); }); }
function yearBlock(n, col, colHex) { const g = new THREE.Group(); const b = rbox(0.3, 0.3, 0.3, plasticS(0x14171c, 0.4), 0.03); g.add(b);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshBasicMaterial({ map: numTex(String(n), colHex), toneMapped: false })); f.position.z = 0.152; g.add(f);
  const e = new THREE.Mesh(new THREE.BoxGeometry(0.305, 0.305, 0.305), new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.6, toneMapped: false })); g.add(e);
  g.userData = { f }; return g; }
function boardTex(txt) { return textTex(420, 300, (g, w, h) => { g.fillStyle = '#0f1512'; rr(g, 0, 0, w, h, 18); g.fill(); g.strokeStyle = '#6b5a3a'; g.lineWidth = 10; rr(g, 5, 5, w - 10, h - 10, 16); g.stroke();
  g.fillStyle = '#EEE7D6'; g.font = `700 54px "DejaVuMono"`; g.textAlign = 'center'; g.textBaseline = 'middle'; txt.split('\n').forEach((l, i, a) => g.fillText(l, w / 2, h / 2 + (i - (a.length - 1) / 2) * 64)); }); }
function buildArena() {
  const Z = new THREE.Group(); Z.position.copy(AR); scene.add(Z);
  const pF = podium(TEAL, 'FP'), pC = podium(AMBER, 'CARRERA'); pF.position.x = -0.62; pC.position.x = 0.62; Z.add(pF, pC); setPodiumH(pF, 0.35); setPodiumH(pC, 0.35);
  const dF = makeDoll(plasticS(TEAL, 0.25)), dC = makeDoll(plasticS(AMBER, 0.25)); dF.scale.setScalar(1.3); dC.scale.setScalar(1.3); Z.add(dF, dC);
  // anillo del ring en el suelo: mitad turquesa, mitad ámbar
  for (const [c, a0] of [[TEAL, Math.PI / 2], [AMBER, -Math.PI / 2]]) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.01, 6, 128, Math.PI), basicGlow(c, 1.8)); r.rotation.x = -Math.PI / 2; r.rotation.z = a0; r.position.y = 0.004; Z.add(r); }
  const tr = trophy(); tr.position.set(0, 1.0, -0.5); Z.add(tr);
  const q = qmark(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffffff, emissiveIntensity: 1.6 })); q.position.set(0, 1.25, 0.05); q.scale.setScalar(1.1); Z.add(q);
  // bloques de años, maletín (prácticas), pizarras (teoría), herramientas
  const yF = [1, 2].map(n => { const b = yearBlock(n, CT, '#62E3D4'); Z.add(b); return b; });
  const yC = [1, 2, 3, 4].map(n => { const b = yearBlock(n, CA, '#FFB547'); Z.add(b); return b; });
  const half = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.14), new THREE.MeshBasicMaterial({ color: CT, transparent: true, opacity: 0.85, toneMapped: false })); half.position.set(0, -0.07, 0.155); yC[0].add(half); half.visible = false;
  const bc = new THREE.Group(); const bcb = rbox(0.34, 0.24, 0.1, plasticS(0x3a2a1c, 0.45), 0.03); bc.add(bcb); const hnd = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 20, Math.PI), metalS(0xc9ced6)); hnd.position.y = 0.12; bc.add(hnd);
  const clasp = rbox(0.05, 0.03, 0.02, metalS(0xc9ced6), 0.005); clasp.position.set(0, 0.07, 0.055); bc.add(clasp); Z.add(bc);
  const boards = ['∫ f(x) dx', 'det(A)', 'O(n log n)'].map(t => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.33), new THREE.MeshStandardMaterial({ map: boardTex(t), roughness: 0.8 })); Z.add(m); return m; });
  const wr = new THREE.Group(); { const s = new THREE.Shape(); s.moveTo(-0.02, -0.16); s.lineTo(0.02, -0.16); s.lineTo(0.02, 0.08); s.lineTo(0.06, 0.12); s.lineTo(0.04, 0.17); s.lineTo(0.015, 0.13); s.lineTo(-0.015, 0.13); s.lineTo(-0.04, 0.17); s.lineTo(-0.06, 0.12); s.lineTo(-0.02, 0.08); s.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: TEAL, emissiveIntensity: 1.4, metalness: 0.5, roughness: 0.3 })); m.geometry.center(); wr.add(m); }
  const hm = new THREE.Group(); { const hh = cyl(0.012, 0.012, 0.3, new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: TEAL, emissiveIntensity: 1.2 }), 12); hm.add(hh); const hd = rbox(0.12, 0.05, 0.05, new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: TEAL, emissiveIntensity: 1.4 }), 0.01); hd.position.y = 0.15; hm.add(hd); }
  Z.add(wr, hm);
  // «lo que hay debajo»: engranajes y una placa bajo el podio de FP
  const under = new THREE.Group(); under.position.set(-0.62, -0.55, 0); Z.add(under);
  const gm = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: AMBER, emissiveIntensity: 1.1, metalness: 0.7, roughness: 0.35 });
  const gears = [[0.22, 12, 0, 0, 0], [0.14, 8, 0.33, 0.06, 0.05], [0.17, 10, -0.3, -0.12, -0.08]].map(([r, n, x, y, z]) => { const s = new THREE.Shape(), hN = n * 4;
    for (let i = 0; i <= hN; i++) { const a = i / hN * Math.PI * 2, k = i % 4, rr2 = k === 1 || k === 2 ? r * 1.16 : r; i ? s.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : s.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
    const p = new THREE.Path(); p.absarc(0, 0, r * 0.3, 0, Math.PI * 2, true); s.holes.push(p);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false }); geo.translate(0, 0, -0.025); const m = new THREE.Mesh(geo, gm); m.position.set(x, y, z); m.rotation.x = -Math.PI / 2; under.add(m); return m; });
  const pcb = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), new THREE.MeshBasicMaterial({ map: textTex(700, 500, (g, w, h) => { g.fillStyle = '#03100c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2fc7b6'; g.lineWidth = 3; g.globalAlpha = 0.8;
    for (let i = 0; i < 40; i++) { let x = hash(i) * w, y = hash(i * 3) * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { if (k % 2) x += (hash(i * 7 + k) - 0.5) * 220; else y += (hash(i * 5 + k) - 0.5) * 160; g.lineTo(x, y); } g.stroke(); g.fillStyle = '#62E3D4'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
    g.globalAlpha = 1; g.fillStyle = '#8fd'; g.font = '700 30px DejaVuMono'; for (let i = 0; i < 12; i++) g.fillText(hash(i * 2.2) > 0.5 ? '1011 0110' : '0100 1101', hash(i * 9) * w * 0.8, hash(i * 4) * h); }), transparent: true, opacity: 0.9, toneMapped: false }));
  pcb.rotation.x = -Math.PI / 2; pcb.position.y = -0.18; under.add(pcb);
  Z.userData = { pF, pC, dF, dC, tr, q, yF, yC, half, bc, boards, wr, hm, under, gears };
  return Z;
}

// ---------------------------------------------------------------- datos: títulos que se rompen y profesiones reguladas
const DZ = v3(7, 0, -12);
function diploma(ribbon) {
  const g = new THREE.Group(); const p = cyl(0.045, 0.045, 0.36, plasticS(0xf3ecd8, 0.45), 32); p.rotation.z = Math.PI / 2; g.add(p);
  const rib = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.013, 8, 28), new THREE.MeshStandardMaterial({ color: 0x080808, emissive: ribbon, emissiveIntensity: 1.6 })); rib.rotation.y = Math.PI / 2; g.add(rib);
  for (const s of [-1, 1]) { const e = cyl(0.046, 0.046, 0.004, plasticS(0xd8cfb4, 0.5), 32); e.rotation.z = Math.PI / 2; e.position.x = s * 0.181; g.add(e); }
  return g;
}
function shards(col, n = 140) { const m = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xf3ecd8, roughness: 0.5, emissive: col, emissiveIntensity: 0.25 }), n); m.frustumCulled = false; m.visible = false; scene.add(m); return m; }
function rowTex(txt, mark, col) { return textTex(1100, 200, (g, w, h) => { g.fillStyle = 'rgba(16,19,24,.92)'; rr(g, 4, 4, w - 8, h - 8, 22); g.fill(); g.strokeStyle = 'rgba(238,242,246,.25)'; g.lineWidth = 3; rr(g, 4, 4, w - 8, h - 8, 22); g.stroke();
  g.fillStyle = '#EEF2F6'; g.font = '700 64px SpaceMono'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(txt, 46, h / 2 + 4);
  g.fillStyle = col; g.font = '700 96px DejaVuMono'; g.textAlign = 'right'; g.fillText(mark, w - 50, h / 2 + 6); }); }
function buildData() {
  const Z = new THREE.Group(); Z.position.copy(DZ); scene.add(Z);
  const dipF = diploma(TEAL), dipC = diploma(AMBER); dipF.scale.setScalar(2.4); dipC.scale.setScalar(2.4); Z.add(dipF, dipC);
  const shF = shards(TEAL), shC = shards(AMBER);
  // panel «PROFESIONES REGULADAS»
  const panel = new THREE.Group(); panel.position.set(0, 1.5, -0.4); Z.add(panel);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.75), new THREE.MeshStandardMaterial({ color: 0x0a0d12, transparent: true, opacity: 0.55, roughness: 0.2, metalness: 0.2, depthWrite: false })); panel.add(glass); edges(glass, 0xdfe6ee, 1.4, 20, 0.9);
  const title = signPlane('PROFESIONES REGULADAS', { w: 1.7, h: 0.17, col: '#EEF2F6', font: 'SpaceMono', weight: 700, size: 0.5, ls: 6 }); title.position.set(0, 0.68, 0.01); panel.add(title);
  const sub = signPlane('RD 1837/2008 · ANEXO VIII', { w: 1.2, h: 0.08, col: '#9AA1AB', font: 'SpaceMono', weight: 400, size: 0.6, ls: 4 }); sub.position.set(0, 0.55, 0.01); panel.add(sub);
  const rows = [['INGENIERO INDUSTRIAL', '✓', '#7CF0A9'], ['INGENIERO DE TELECOM.', '✓', '#7CF0A9'], ['INGENIERÍA INFORMÁTICA', '✕', '#FF5247']].map(([t, mk, c], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.31), new THREE.MeshBasicMaterial({ map: rowTex(t, mk, c), transparent: true, depthWrite: false, toneMapped: false })); m.position.set(0, 0.24 - i * 0.4, 0.015); m.renderOrder = 7; panel.add(m); return m; });
  const strike = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 0.01), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.35, 0.3), toneMapped: false, depthTest: false, transparent: true, opacity: 1 })); strike.renderOrder = 9; strike.position.set(-0.1, 0.24 - 2 * 0.4, 0.04); panel.add(strike);
  Z.userData = { dipF, dipC, shF, shC, panel, rows, strike, glass };
  return Z;
}

// ---------------------------------------------------------------- oposiciones: torre de puertas (C2 → A1) y la puerta del máster
const GZ = v3(14, 0, -7);
const LEVELS = [['C2', 'ESO'], ['C1', 'BACHILLER / TÉCNICO'], ['B', 'TÉCNICO SUPERIOR'], ['A2', 'GRADO'], ['A1', 'GRADO']];
function keyMesh(col) {
  const s = new THREE.Shape(); s.absarc(0, 0, 0.06, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absarc(0, 0, 0.022, 0, Math.PI * 2, true); s.holes.push(hole);
  const b = new THREE.Shape(); b.moveTo(0.05, -0.016); b.lineTo(0.27, -0.016); b.lineTo(0.27, 0.0); b.lineTo(0.255, 0.012); b.lineTo(0.24, 0.0); b.lineTo(0.225, 0.016); b.lineTo(0.205, 0.0); b.lineTo(0.19, 0.014); b.lineTo(0.17, 0.016); b.lineTo(0.05, 0.016); b.closePath();
  const m = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: col, emissiveIntensity: 1.5, metalness: 0.6, roughness: 0.3 }), g = new THREE.Group();
  for (const sh of [s, b]) { const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 24 }); geo.translate(-0.1, 0, -0.01); g.add(new THREE.Mesh(geo, m)); }
  return g;
}
function lockMesh() { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff5247, emissiveIntensity: 1.6, metalness: 0.5, roughness: 0.3 });
  const body = rbox(0.11, 0.09, 0.04, m, 0.015); g.add(body); const sh = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 8, 20, Math.PI), m); sh.position.y = 0.045; g.add(sh); g.userData = { sh, m }; return g; }
function doorFrame(w, h, sign) {
  const g = new THREE.Group(), fm = plasticS(0x1b1e24, 0.4);
  for (const s of [-1, 1]) { const p = rbox(0.06, h, 0.08, fm, 0.01); p.position.set(s * (w / 2 + 0.03), h / 2, 0); g.add(p); }
  const top = rbox(w + 0.18, 0.07, 0.09, fm, 0.01); top.position.y = h + 0.035; g.add(top);
  const hinge = new THREE.Group(); hinge.position.set(-w / 2, 0, 0); g.add(hinge);
  const door = rbox(w, h, 0.03, plasticS(0x2a2e36, 0.35), 0.01); door.position.set(w / 2, h / 2, 0); hinge.add(door); edges(door, 0xdfe6ee, 1.1, 30, 0.5);
  const light = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.96, h * 0.96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); light.position.set(0, h / 2, -0.03); g.add(light);
  if (sign) { const sg = signPlane(sign, { w: w * 0.9, h: 0.13, col: '#EEF2F6', font: 'SpaceMono', weight: 700, size: 0.6, ls: 4 }); sg.position.set(0, h + 0.035, 0.05); g.add(sg); }
  g.userData = { hinge, light, door }; return g;
}
function buildGates() {
  const Z = new THREE.Group(); Z.position.copy(GZ); scene.add(Z);
  const lv = LEVELS.map(([code, req], k) => {
    const g = new THREE.Group(); g.position.y = 0.12 + k * 0.66; Z.add(g);
    const plat = rbox(1.25, 0.04, 0.5, plasticS(0x15171c, 0.5), 0.01); plat.rotation.x = -Math.PI / 2; plat.position.y = -0.02; g.add(plat); edges(plat, 0xdfe6ee, 1, 30, 0.35);
    const d = doorFrame(0.6, 0.5, null); g.add(d);
    const c = signPlane(code, { w: 0.34, h: 0.2, col: '#EEF2F6', font: 'SpaceMono', weight: 700, size: 0.8 }); c.position.set(-0.62, 0.27, 0.05); g.add(c);
    const r = signPlane(req, { w: 0.9, h: 0.085, col: k >= 3 ? '#FFB547' : k === 2 ? '#62E3D4' : '#9AA1AB', font: 'SpaceMono', weight: 700, size: 0.62, ls: 2 }); r.position.set(0.0, 0.58, 0.05); g.add(r);
    const lock = lockMesh(); lock.position.set(0.18, 0.26, 0.05); lock.visible = k >= 3; g.add(lock);
    return { g, d, lock };
  });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.012, 3.4, 0.012), basicGlow(0xdfe6ee, 0.9)); rail.position.set(0.86, 1.7, 0); Z.add(rail);
  const kF = keyMesh(TEAL), kC = keyMesh(AMBER); kF.scale.setScalar(1.5); kC.scale.setScalar(1.5); Z.add(kF, kC);
  const md = doorFrame(0.8, 1.25, 'MÁSTER'); md.position.set(1.85, 0, 0.35); md.rotation.y = -0.35; Z.add(md);
  const mlock = lockMesh(); mlock.scale.setScalar(1.6); mlock.position.set(0.25, 0.65, 0.06); md.add(mlock);
  Z.userData = { lv, kF, kC, md, mlock };
  return Z;
}

// ---------------------------------------------------------------- veredicto: cohete de FP, puertas de la carrera, puente a la universidad, botones
function university() {
  const g = new THREE.Group(), m = plasticS(0xd9dde3, 0.5);
  const base = rbox(1.4, 0.12, 0.7, m, 0.02); base.rotation.x = -Math.PI / 2; base.position.y = 0.06; g.add(base);
  for (let i = 0; i < 6; i++) { const c = cyl(0.045, 0.05, 0.62, m, 20); c.position.set(-0.55 + i * 0.22, 0.43, 0.22); g.add(c); }
  const ent = rbox(1.4, 0.08, 0.7, m, 0.02); ent.rotation.x = -Math.PI / 2; ent.position.y = 0.78; g.add(ent);
  const s = new THREE.Shape(); s.moveTo(-0.72, 0); s.lineTo(0.72, 0); s.lineTo(0, 0.3); s.closePath();
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: false }), m); ped.position.set(0, 0.82, -0.3); g.add(ped);
  const wall = rbox(1.2, 0.62, 0.05, plasticS(0x24272e, 0.6), 0.01); wall.position.set(0, 0.43, 0.0); g.add(wall);
  const sg = signPlane('UNIVERSIDAD', { w: 0.9, h: 0.09, col: '#1B1F27', font: 'SpaceMono', weight: 700, size: 0.7, ls: 6 }); sg.position.set(0, 0.78, 0.36); g.add(sg);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); edges(base, 0xdfe6ee, 1, 30, 0.3);
  return g;
}
function buildVerdict(A) {
  const Z = A; // en coordenadas de la arena
  const uni = university(); uni.position.set(1.2, 0, -2.0); uni.rotation.y = -0.25; Z.add(uni);
  const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(v3(lerp(-0.62, 1.1, u), 0.38 + Math.sin(Math.PI * u) * 1.1, lerp(0, -1.7, u))); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const bridgeM = new THREE.MeshBasicMaterial({ color: CT, transparent: true, opacity: 0.9, toneMapped: false });
  const bridge = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.035, 10, false), bridgeM); Z.add(bridge);
  const U = { uA: { value: 0 } };
  bridgeM.onBeforeCompile = sh => { sh.uniforms.uA = U.uA; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vUv2;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvUv2 = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vUv2; uniform float uA;').replace('void main() {', 'void main() {\n if (vUv2.x > uA) discard;'); };
  bridgeM.customProgramCacheKey = () => 'bridgeA';
  const ects = signPlane('−30 ECTS', { w: 0.62, h: 0.16, col: '#04110F', bg: '#62E3D4', font: 'SpaceMono', weight: 700, size: 0.62 }); Z.add(ects);
  // barrera de la PAU (se levanta)
  const bar = new THREE.Group(); bar.position.copy(curve.getPoint(0.55)).add(v3(0, -0.02, 0)); Z.add(bar);
  const arm = new THREE.Group(); bar.add(arm);
  const stripes = textTex(512, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#EEF2F6' : '#FF5247'; g.fillRect(i * w / 8, 0, w / 8, h); } g.fillStyle = '#111'; g.font = '700 40px SpaceMono'; g.textAlign = 'center'; g.fillText('PAU', w / 2, 46); });
  const armM = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.03), new THREE.MeshBasicMaterial({ map: stripes, toneMapped: false })); armM.position.x = 0.35; arm.add(armM);
  const post = cyl(0.025, 0.03, 0.3, plasticS(0x2a2e36), 12); post.position.y = -0.15; bar.add(post);
  // cohete de FP («empezar antes») y puertas de la carrera («más puertas»)
  const rocket = new THREE.Group(); { const b = cyl(0.05, 0.06, 0.24, new THREE.MeshStandardMaterial({ color: 0x0b0b0b, emissive: TEAL, emissiveIntensity: 1.6 }), 20); rocket.add(b);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 20), new THREE.MeshStandardMaterial({ color: 0x0b0b0b, emissive: 0xffffff, emissiveIntensity: 1.4 })); nose.position.y = 0.17; rocket.add(nose);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 16), basicGlow(0xffd27a, 2.6)); fl.rotation.x = Math.PI; fl.position.y = -0.22; rocket.add(fl); rocket.userData.fl = fl; }
  Z.add(rocket);
  const fan = [0, 1, 2].map(i => { const d = doorFrame(0.26, 0.42, null); d.scale.setScalar(1); Z.add(d); return d; });
  // botones finales
  const btn = (txt, col, colHex) => { const g = new THREE.Group(); const b = rbox(1.15, 0.36, 0.14, new THREE.MeshStandardMaterial({ color: 0x0b0b0b, emissive: col, emissiveIntensity: 0.9, roughness: 0.35 }), 0.06); g.add(b);
    const t = signPlane(txt, { w: 1.05, h: 0.26, col: '#05080A', font: SANS, weight: 900, size: 0.5 }); t.position.z = 0.073; g.add(t); edges(b, 0xffffff, 1.4, 30, 0.6); return g; };
  const bF = btn('EQUIPO FP', TEAL), bC = btn('EQUIPO CARRERA', AMBER); Z.add(bF, bC);
  return { uni, bridge, U, curve, ects, bar, arm, rocket, fan, bF, bC };
}
// ---------------------------------------------------------------- estado de la escena en cada instante (todo es función de t)
const wpos = (o, v = new THREE.Vector3()) => o.getWorldPosition(v);
const popS = (t, t0, d = 0.35) => Math.max(1e-4, pop(t, t0, d));
// avance de la lluvia de tarjetas (velocidad alta al principio, luego flota)
function rainDist(t) { let d = 0; const dt = 1 / 120; for (let x = -3; x < t; x += dt) d += (x < 0.15 ? 26 : lerp(26, 2.2, sm5(clamp((x - 0.15) / 1.2)))) * dt; return d; }
function loopT(t) { return t > END - 1.25 ? t - END : t; }      // al final, el principio otra vez (bucle)
function cardsAt(t) {
  const C = S.cards, tt = loopT(t), inLoop = t > END - 1.25;
  const out = inLoop ? 0 : sm5(clamp((t - (K.y2 - 0.12)) / 0.7));
  const vis = tt < K.y2 + 0.9;
  // diez tarjetas: llegan volando hasta la cuadrícula
  const arr = eo(clamp((tt + 0.7) / 1.6));
  C.cards.forEach((c, i) => {
    c.g.visible = vis;
    if (!vis) return;
    const P = gridPos(i), stg = i * 0.04, a2 = eo(clamp((tt + 0.5 - stg) / 1.0));
    c.g.position.set(P.x * (1 + 1.5 * (1 - a2)), P.y + (1 - a2) * (i % 3 - 1) * 0.5, P.z - 9 * (1 - a2) + out * 8 * (i % 2 ? 1 : -0.6));
    c.g.position.x += out * (i % 2 ? 3 : -3); c.g.position.y += out * (1.5 - (i % 5) * 0.6);
    c.g.rotation.set((1 - a2) * (2.5 + i) + out * 3 * (i % 3), (1 - a2) * (1.7 - i * 0.3) + 0.12 * Math.sin(tt * 1.3 + i), out * (i % 2 ? 2 : -2));
    // relleno: casi cinco turquesa (4 + 0,7), dos ámbar (2 + 0,14)
    let f = 0, col = null, badge = '';
    if (i < 5 && !inLoop) { f = (i < 4 ? 1 : 0.7) * sm5(clamp((tt - (K.cinco + i * 0.12)) / 0.3)); col = CT; badge = 'FP'; }
    if (i >= 5 && i <= 7 && !inLoop) { f = (i < 7 ? 1 : 0.14) * sm5(clamp((tt - (K.carrera1 + (i - 5) * 0.12)) / 0.3)); col = CA; badge = 'GRADO'; }
    c.fill.visible = f > 0.002;
    if (c.fill.visible) { c.fill.material.color.copy(col); c.fill.scale.y = f; c.fill.position.y = -(CARD_H - 0.01) / 2 * (1 - f); }
    c.bFP.visible = f > 0.6 && badge === 'FP'; c.bGR.visible = f > 0.6 && badge === 'GRADO';
    const dim = i >= 8 || i === 7 ? 0.55 + 0.45 * (1 - sm5(clamp((tt - K.carrera1 - 0.5) / 0.4))) : 1;
    c.face.material.color.setScalar(dim);
  });
  // lluvia
  const R = C.rain, rv = tt < K.y2 + 0.6, dm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1);
  R.visible = rv;
  if (rv) { const d = rainDist(tt), fade = 1 - out;
    C.seeds.forEach((sd, i) => { let z = sd.z + d; z = ((z + 42) % 51 + 51) % 51 - 42; const side = sd.x < 0 ? -1 : 1, x = side * (0.5 + Math.abs(sd.x) * 0.62);
      e.set(sd.rx + tt * 0.7, sd.ry + tt * 0.5, 0); q.setFromEuler(e); s.setScalar(fade); dm.compose(_p.set(x, sd.y, z), q, s); R.setMatrixAt(i, dm); });
    R.instanceMatrix.needsUpdate = true; }
}
// muñecos: pose base + gestos
function dollPose(d, side, t, speak, point, cheer) {
  const J = d.userData.J, br = Math.sin(t * 2.2 + side) * 0.02;
  J.chest.rotation.x = br; J.neck.rotation.set(0.05 * Math.sin(t * 9) * speak, 0, 0);
  const sw = speak * Math.sin(t * 7.5 + side);
  J.shL.rotation.set(0.15 * sw, 0, 0.18 + 0.1 * speak); J.shR.rotation.set(-0.15 * sw, 0, -0.18 - 0.1 * speak);
  J.elL.rotation.set(-0.5 * speak, 0, 0); J.elR.rotation.set(-0.5 * speak, 0, 0);
  if (point > 0) { const sh = side < 0 ? J.shR : J.shL, el = side < 0 ? J.elR : J.elL; sh.rotation.z = lerp(sh.rotation.z, side < 0 ? -1.45 : 1.45, point); sh.rotation.x = lerp(sh.rotation.x, -0.25, point); el.rotation.x = lerp(el.rotation.x, 0, point); }
  if (cheer > 0) { J.shL.rotation.z = lerp(J.shL.rotation.z, 2.7, cheer); J.shR.rotation.z = lerp(J.shR.rotation.z, -2.7, cheer); J.elL.rotation.x = J.elR.rotation.x = -0.3 * cheer; d.position.y += 0.06 * cheer * Math.abs(Math.sin(t * 9)); }
}
function arenaAt(t) {
  const A = S.arena.userData, V = S.verdict;
  const hC = 0.35 + 0.45 * sm5(clamp((t - K.nunca) / 0.6)) * (1 - sm5(clamp((t - K.quien) / 0.5)));
  setPodiumH(A.pF, 0.35); setPodiumH(A.pC, hC);
  A.dF.position.set(-0.62, 0.35, 0); A.dC.position.set(0.62, hC, 0);
  A.dF.rotation.y = 0.55; A.dC.rotation.y = -0.55;
  const spF = env(t, K.los4, K.vosotros + 1.3, 0.2, 0.3), spC = Math.max(env(t, K.y5, K.debajo + 0.5, 0.2, 0.3), env(t, K.dicen2, K.nivel + 0.4, 0.2, 0.3));
  const ptF = env(t, K.vosotros - 0.05, K.teoria + 0.6, 0.2, 0.3), ptC = env(t, K.sabeis - 0.05, K.debajo + 0.4, 0.2, 0.3);
  const chF = env(t, K.fp15 - 0.05, K.equipo2, 0.15, 0.25) + env(t, K.las, K.primero, 0.2, 0.3), chC = env(t, K.carrera15 - 0.05, K.comentarios + 0.5, 0.15, 0.3) + env(t, K.las, K.primero, 0.2, 0.3);
  dollPose(A.dF, -1, t, spF, ptF, Math.min(1, chF)); dollPose(A.dC, 1, t, spC, ptC, Math.min(1, chC));
  if (t > K.nunca && t < K.quien) A.dC.userData.J.neck.rotation.x = 0.25 * sm5(clamp((t - K.nunca) / 0.5)) * (1 - sm5(clamp((t - K.tienen) / 0.6)));   // mira por encima del hombro
  // trofeo con interrogación; se ilumina de los dos colores en «las dos»
  const tk = sm5(clamp((t - K.las) / 0.35));
  const trv = Math.max(env(t, K.tienen - 0.35, K.los4 + 0.2, 0.35, 0.3), t > K.entonces - 0.2 && t < END - 1.25 ? sm5(clamp((t - K.entonces + 0.2) / 0.4)) : 0);
  A.tr.visible = trv > 0.01; A.tr.scale.setScalar(Math.max(1e-3, trv)); A.tr.position.y = 1.0 + 0.04 * Math.sin(t * 2); A.tr.rotation.y = t * 0.6;
  A.tr.userData.mL.emissive.copy(CT).multiplyScalar(1.0 * tk); A.tr.userData.mR.emissive.copy(CA).multiplyScalar(1.0 * tk);
  A.q.visible = tk < 0.99 && trv > 0.01; A.q.position.set(0, 1.42 + 0.03 * Math.sin(t * 3), -0.45); A.q.scale.setScalar(0.75 * (1 - tk) * trv + 1e-3); A.q.rotation.y = Math.sin(t * 1.5) * 0.4;
  // años: 2 turquesa / 4 ámbar (se quedan hasta el final), maletín, pizarras, herramientas
  A.yF.forEach((b, k) => { const p = popS(t, K.dos4 + k * 0.13, 0.4); b.visible = t > K.dos4; b.scale.setScalar(p); b.position.set(-1.15, 0.16 + k * 0.31, 0.38); b.rotation.y = 0.35; });
  A.yC.forEach((b, k) => { const p = popS(t, K.cuatro + k * 0.1, 0.4); b.visible = t > K.cuatro; b.scale.setScalar(p); b.position.set(1.15, 0.16 + k * 0.31, 0.38); b.rotation.y = -0.35; });
  A.half.visible = t > K.convalidado - 0.05; A.half.scale.x = sm5(clamp((t - K.convalidado + 0.05) / 0.3)) + 1e-3;
  const bk = env(t, K.practicas, K.responden, 0.3, 0.4); A.bc.visible = bk > 0.01; A.bc.scale.setScalar(popS(t, K.practicas, 0.4) * (bk > 0 ? 1 : 0) + 1e-3);
  A.bc.position.set(-1.15 + 0.25 * sm5(clamp((t - K.trabajar) / 0.5)), 0.95 + 0.04 * Math.sin(t * 2.5), 0.4); A.bc.rotation.set(0.1, 0.5 + t * 0.4, 0);
  A.boards.forEach((b, k) => { const p = env(t, K.teoria + k * 0.12, K.herramientas, 0.3, 0.3); b.visible = p > 0.01; b.scale.setScalar(popS(t, K.teoria + k * 0.12, 0.4));
    const P = [[1.7, 1.5, 0.1], [1.05, 1.85, -0.3], [1.8, 0.72, -0.25]][k]; b.position.set(P[0], P[1] + 0.03 * Math.sin(t * 2 + k), P[2]); b.rotation.set(0, -0.45, 0.06 * Math.sin(t + k)); });
  const tl = env(t, K.herramientas - 0.05, K.vamos + 0.2, 0.3, 0.3);
  [A.wr, A.hm].forEach((o, k) => { o.visible = tl > 0.01; o.scale.setScalar(Math.max(1e-3, tl) * 1.6); const a = t * 2.2 + k * Math.PI; o.position.set(-0.62 + Math.cos(a) * 0.42, 1.6 + 0.08 * Math.sin(a * 2), Math.sin(a) * 0.42); o.rotation.set(t * 1.5, t * 2 + k, 0.4); });
  A.gears.forEach((g, k) => { g.rotation.z = (k % 2 ? -1 : 1) * t * (1.2 + k * 0.4); });
  // veredicto
  const rk = clamp((t - K.antes) / 0.9);
  V.rocket.visible = t > K.antes - 0.3 && t < K.las; V.rocket.position.set(-1.15, 0.78 + 4.2 * rk * rk, 0.38); V.rocket.rotation.y = t * 4; V.rocket.userData.fl.scale.set(1, 0.6 + 0.5 * Math.sin(t * 40) * 0.3 + (rk > 0 ? 0.8 : 0), 1);
  V.fan.forEach((d, i) => { const p = env(t, K.puertas + i * 0.08, K.las, 0.3, 0.4); d.visible = p > 0.01; d.scale.setScalar(Math.max(1e-3, p) * 1.0);
    d.position.set(1.15 + (i - 1) * 0.32, 1.42, 0.38 - Math.abs(i - 1) * 0.12); d.rotation.y = -0.35 + (i - 1) * 0.35;
    const op = sm5(clamp((t - K.abiertas - i * 0.08) / 0.35)); d.userData.hinge.rotation.y = -1.3 * op; d.userData.light.material.opacity = 0.85 * op; d.userData.light.material.color.copy(CA); });
  const ub = sm5(clamp((t - K.luego) / 0.5)); V.uni.visible = ub > 0.01; V.uni.scale.set(1, Math.max(1e-3, ub), 1);
  V.U.uA.value = sm5(clamp((t - K.primero) / (K.carrera14 + 0.4 - K.primero))); V.bridge.visible = V.U.uA.value > 0.002;
  const bp = V.curve.getPoint(0.55); V.bar.visible = t > K.carrera14 - 0.2 && t < END - 1.3; V.arm.rotation.z = 1.35 * sm5(clamp((t - K.selectividad) / 0.4));
  V.ects.visible = t > K.medio - 0.05 && t < END - 1.3; V.ects.scale.setScalar(popS(t, K.medio, 0.35)); V.ects.position.copy(V.curve.getPoint(0.35)).add(v3(0, 0.22, 0)); V.ects.quaternion.copy(cam.quaternion);
  const bt = (b, y, t0, tp) => { const p = env(t, t0, END - 1.3, 0.35, 0.3); b.visible = p > 0.01; b.scale.setScalar(Math.max(1e-3, pop(t, t0, 0.45)));
    const press = Math.exp(-Math.max(0, t - tp) * 6) * (t > tp ? 1 : 0); b.position.set(0, y - 0.04 * press, 0.35 - 0.05 * press); b.children[0].material.emissiveIntensity = 0.9 + 1.4 * press; };
  bt(V.bF, 2.55, K.equipo - 0.05, K.fp15); bt(V.bC, 2.08, K.equipo + 0.1, K.carrera15);
}
function dataAt(t) {
  const D = S.data.userData;
  const sh = t > K.exige;
  [D.dipF, D.dipC].forEach((d, k) => { d.visible = !sh && t > K.vamos; d.position.set(0, k ? 1.12 : 1.88, 0.45); d.rotation.set(t * 1.4 + k, 0.3 * Math.sin(t + k), 0.15); d.scale.setScalar(2.4 * popS(t, K.vamos + 0.3 + k * 0.1, 0.4)); });
  [[D.shF, 1.88], [D.shC, 1.12]].forEach(([m, y], k) => { const u = t - K.exige; m.visible = u > 0 && u < 1.6; if (!m.visible) return; const dm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < m.count; i++) { const a = hash(i * 3.1 + k) * Math.PI * 2, b = (hash(i * 5.7 + k) - 0.5) * 2, sp = 0.8 + hash(i * 7.3 + k) * 2.2;
      const x0 = (hash(i * 1.9 + k) - 0.5) * 0.86, P = v3(x0 + Math.cos(a) * sp * u * 0.8, y + b * 0.1 + Math.sin(a) * sp * u * 0.6 - 0.6 * u * u, 0.45 + (hash(i * 2.3) - 0.3) * sp * u);
      e.set(u * 7 + i, u * 5 + i * 2, 0); q.setFromEuler(e); const s = 0.03 * (0.5 + hash(i * 9.9)) * (1 - u / 1.6); dm.compose(_p.copy(P).add(DZ), q, _s.set(s, s * 0.4, s)); m.setMatrixAt(i, dm); }
    m.instanceMatrix.needsUpdate = true; });
  const pk = sm5(clamp((t - K.ingenieria + 0.1) / 0.5)); D.panel.visible = pk > 0.01 && t < K.oposiciones; D.panel.scale.set(Math.max(1e-3, pk), Math.max(1e-3, pk), 1); D.panel.rotation.y = -0.12 + 0.05 * Math.sin(t * 0.7);
  const rt = [K.industrial, K.teleco, K.informatica7]; D.rows.forEach((r, i) => { const p = popS(t, rt[i], 0.35); r.visible = t > rt[i]; r.scale.setScalar(p); });
  D.strike.visible = t > K.regulada; D.strike.scale.x = Math.max(1e-3, sm5(clamp((t - K.regulada) / 0.35)));
}
function gatesAt(t) {
  const G = S.gates.userData, yk = k => 0.12 + k * 0.66;
  // llave ámbar (grado): sube hasta A1/A2 y las abre; llave turquesa (FP): sube hasta B y choca en A2
  const ua = sm5(clamp((t - K.oposiciones) / 2.3)), yA = lerp(0.3, yk(4) + 0.25, ua);
  const ut = sm5(clamp((t - K.con9) / 1.4)), bump = env(t, K.b9 - 0.05, K.b9 + 0.5, 0.12, 0.3), yT = lerp(0.3, yk(2) + 0.25, ut) + 0.42 * bump;
  const toM = sm5(clamp((t - K.y10) / 0.6)), toMa = sm5(clamp((t - K.master - 0.2) / 0.45));
  const md = wpos(G.md).sub(GZ).add(v3(0.12, 0.65, 0.12));
  G.kC.position.copy(v3(0.86, yA, 0.12).lerp(md, toMa)); G.kC.rotation.set(0, 0.3, t * 2.5 * (1 - toMa));
  G.kF.position.copy(v3(0.98, yT, 0.12).lerp(md.clone().add(v3(-0.1, 0.0, 0.08)), toM * (1 - sm5(clamp((t - K.master - 0.1) / 0.3))) )); G.kF.rotation.set(0, 0.3, t * 2.5 * (1 - toM));
  G.kF.visible = t > K.oposiciones - 0.2; G.kC.visible = t > K.oposiciones - 0.2;
  G.lv.forEach((l, k) => {
    let open = 0;
    if (k >= 3) open = sm5(clamp((t - (K.exigen + (k - 3) * 0.18)) / 0.5));
    else if (k === 2) open = sm5(clamp((t - K.mucho) / 0.5));
    else open = Math.max(sm5(clamp((t - K.con9 - 0.25 - k * 0.2) / 0.4)), sm5(clamp((t - K.oposiciones - 0.2 - k * 0.25) / 0.4)));
    l.d.userData.hinge.rotation.y = -1.25 * open; const lm = l.d.userData.light.material; lm.opacity = 0.75 * open; lm.color.copy(k >= 3 ? CA : CT);
    if (l.lock.visible) { const lo = sm5(clamp((t - (K.exigen + (k - 3) * 0.18 - 0.15)) / 0.25)); l.lock.userData.sh.position.y = 0.045 + 0.03 * lo; l.lock.scale.setScalar(1 - 0.999 * sm5(clamp((t - K.exigen - 0.6) / 0.3))); l.lock.userData.m.emissive.set(lo > 0.5 ? 0xffb547 : 0xff5247); }
  });
  const mo = sm5(clamp((t - K.universitario) / 0.5)); G.md.userData.hinge.rotation.y = -1.3 * mo; G.md.userData.light.material.opacity = 0.85 * mo; G.md.userData.light.material.color.copy(CA);
  G.mlock.userData.sh.position.y = 0.045 + 0.03 * sm5(clamp((t - K.universitario + 0.1) / 0.2)); G.mlock.visible = mo < 0.6;
  G.mlock.userData.m.emissive.set(t > K.universitario - 0.1 ? 0xffb547 : 0xff5247);
}
function stageAt(t) {
  // cada zona solo existe mientras se ve (así no aparecen al fondo de otra)
  const inLoop = t > END - 1.3;
  S.cards.G.visible = t < K.hay2 + 0.3 || inLoop;
  S.arena.visible = (t > K.y2 - 0.4 && t < K.programar + 0.2) || (t > K.punto11 && t < END - 0.15);
  S.data.visible = t > K.debajo && t < K.oposiciones + 0.4;
  S.gates.visible = t > K.si7 && t < K.quien + 0.3;
  cardsAt(t); if (S.arena.visible) arenaAt(t); if (S.data.visible) dataAt(t); if (S.gates.visible) gatesAt(t);
  S.data.userData.shF.visible = S.data.userData.shF.visible && S.data.visible; S.data.userData.shC.visible = S.data.userData.shC.visible && S.data.visible;
}
// ---------------------------------------------------------------- cámara: zonas lejos unas de otras para que los vuelos dejen estelas
let CK = [], CK_OPEN = [];
function buildCam() {
  CK_OPEN = [
    [-1.5, [1.4, 2.0, 12.5], [0, 1.55, 0], 34, 0.05],
    [0.0, [0.7, 1.75, 8.6], [0, 1.55, 0], 32, 0.02],
    [1.0, [0.4, 1.65, 7.0], [0, 1.55, 0], 32, 0],
  ];
  CK = [
    ...CK_OPEN,
    [K.la1, [-0.3, 1.6, 6.8], [0, 1.55, 0], 32],
    [K.y2 - 0.05, [-0.45, 1.6, 6.6], [0, 1.55, 0], 32],
    // vuelo a la arena
    [K.hay2 + 0.1, [2.3, 1.75, -2.3], [0, 0.95, -7], 32, -0.04],
    [K.nunca, [0.9, 1.9, -1.6], [0.1, 1.15, -7], 32],
    [K.nivel + 0.25, [0.6, 1.85, -1.9], [0.1, 1.15, -7], 32],
    [K.tienen + 0.45, [0.35, 1.3, -4.6], [0, 1.05, -7.4], 32],
    [K.bando, [-0.5, 1.2, -4.3], [0, 1.0, -7.4], 32, 0.03],
    // los de FP / los de la carrera
    [K.dos4, [-2.6, 1.5, -3.0], [-0.85, 0.9, -7], 32],
    [K.trabajar, [-2.4, 1.4, -2.8], [-0.85, 0.9, -7], 32],
    [K.cuatro, [2.8, 1.85, -2.6], [0.95, 1.2, -7], 32],
    [K.teoria + 0.3, [2.95, 1.95, -2.3], [1.05, 1.25, -7.1], 32],
    [K.responden, [1.8, 1.7, -2.6], [0.3, 1.15, -7], 32],
    [K.herramientas, [-1.9, 1.6, -2.9], [-0.62, 1.25, -7], 32],
    // «lo que hay debajo»: baja por debajo del suelo
    [K.debajo, [-1.0, -0.35, -4.3], [-0.62, -0.55, -7], 38],
    // vuelo a los datos: títulos y profesiones reguladas
    [K.programar, [7.75, 1.55, -7.9], [7, 1.5, -11.6], 32, 0.03],
    [K.titulo, [7.55, 1.6, -7.7], [7, 1.5, -11.6], 32],
    [K.ingenieria + 0.2, [7.35, 1.55, -5.8], [7, 1.5, -12.4], 32],
    [K.punto8 + 0.3, [6.8, 1.5, -6.0], [7, 1.5, -12.4], 32],
    // vuelo a las oposiciones
    [K.oposiciones + 0.1, [15.3, 1.5, -1.4], [14.15, 1.55, -7], 32, -0.03],
    [K.grupo9, [15.2, 2.2, -1.5], [14.2, 2.3, -7], 32],
    [K.con9 + 0.1, [15.1, 1.6, -1.6], [14.2, 1.6, -7], 32],
    [K.b9 + 0.1, [15.0, 1.9, -1.6], [14.3, 1.9, -7], 32],
    [K.master, [16.6, 1.15, -2.9], [15.7, 0.8, -6.65], 32],
    [K.punto11 + 0.3, [16.4, 1.3, -2.7], [15.6, 0.85, -6.7], 32],
    // vuelta a la arena: ¿quién tiene razón?
    [K.quien + 0.1, [0.4, 1.35, -4.3], [0, 1.05, -7.4], 32, 0.03],
    [K.antes - 0.75, [0.2, 1.38, -4.15], [0, 1.05, -7.4], 32],
    [K.antes, [-2.5, 1.7, -2.6], [-1.15, 1.4, -7], 32],
    [K.fp13 + 0.15, [-2.5, 2.4, -2.6], [-1.15, 2.4, -7], 32],
    [K.puertas, [2.6, 2.0, -2.8], [1.15, 1.55, -7], 32],
    [K.carrera13, [2.5, 2.05, -2.6], [1.15, 1.6, -7], 32],
    // la jugada maestra: trofeo de los dos colores y el puente a la universidad
    [K.maestra + 0.2, [0.45, 1.45, -3.9], [0, 1.05, -7.4], 32],
    [K.primero + 0.2, [-1.6, 2.2, -0.6], [0.3, 0.9, -8.0], 32],
    [K.selectividad, [0.2, 1.9, -1.0], [0.35, 0.95, -8.3], 32],
    [K.convalidado, [1.4, 1.8, -1.6], [0.6, 0.9, -7.8], 32],
    // ¿equipo FP o equipo carrera?
    [K.equipo + 0.15, [0.2, 2.3, -1.4], [0, 2.15, -7], 32],
    [K.comentarios, [-0.2, 2.35, -1.3], [0, 2.15, -7], 32],
  ];
}
function blendCam(A, B, w) { return { p: A.p.clone().lerp(B.p, w), l: A.l.clone().lerp(B.l, w), f: lerp(A.f, B.f, w), roll: lerp(A.roll, B.roll, w) }; }
function camAt(t) {
  let c = camKeys(t, CK);
  const we = win(t, END - 1.25, 0.95); if (we > 0) c = blendCam(c, camKeys(t - END, CK_OPEN), we);
  let sh = 0; for (const [t0, a] of [[K.nunca, 0.006], [K.exige, 0.012], [K.punto8, 0.008], [K.punto11, 0.008], [K.las, 0.01]]) if (t > t0) sh += a * Math.exp(-(t - t0) * 8);
  if (sh > 1e-4) { c.p.x += sh * Math.sin(t * 97); c.p.y += sh * Math.cos(t * 83); }
  return c;
}
// las luces acompañan a lo que se mira (siempre las mismas 4)
function rigFollow(l) { const R = S.rig; R.key.position.set(l.x - 1.7, Math.max(l.y, 0.6) + 3.0, l.z + 2.1); R.key.target.position.set(l.x, Math.max(0, l.y - 0.6), l.z); R.key.target.updateMatrixWorld();
  R.rimC.position.set(l.x - 2.3, 0.6, l.z - 1.9); R.rimW.position.set(l.x + 2.3, 0.7, l.z - 1.7); R.fill.position.set(l.x + 0.6, l.y + 1.4, l.z + 3.2); }
// ---------------------------------------------------------------- HUD: cabecera con marcador, datos y pique entre bandos
const ckk = (t, t0, t1, d = 0.6) => (t < t0 || t > t1 + 0.3 ? 0 : clamp((t - t0) / d));
const ckf = (t, t1) => 1 - win(t, t1, 0.28);
function co(t, t0, t1, anchor, txt, sub, o = {}) { const k = ckk(t, t0, t1, o.d || 0.6); if (k > 0) callout(anchor, txt, sub, k, { ...o, fade: ckf(t, t1) }); }
let SECT = [];
function buildHudPlan() {
  SECT = [[-9, 'OFERTAS DE EMPLEO  ·  ESPAÑA'], [K.y2, 'EL PIQUE'], [K.los4, 'LO QUE DICE CADA BANDO'], [K.vamos, 'LOS DATOS'], [K.pero9, 'OPOSICIONES  ·  MÁSTER'], [K.entonces, 'VEREDICTO'], [K.equipo, 'TU TURNO']];
}
function sectAt(t) { let s = SECT[0][1]; for (const [t0, x] of SECT) if (t >= t0 - 0.05) s = x; return s; }
function scoreAt(t) { return [t > K.punto8 + 0.25 ? 1 : 0, t > K.punto11 + 0.25 ? 1 : 0]; }
function headerFP(t, sub, msg) {
  hg.save(); hg.textBaseline = 'alphabetic'; const tk = clamp((t + 0.6) / 0.7);
  hg.letterSpacing = '8px'; hfont(46); hg.textAlign = 'left';
  const parts = [['FP', HC.teal], [' VS ', HC.grey], ['CARRERA', HC.amber]]; let x = 54, n = Math.floor(13 * tk);
  for (const [s, c] of parts) { const ss = s.slice(0, Math.max(0, n)); n -= s.length; hg.fillStyle = c; hg.fillText(ss, x, 142); x += hg.measureText(s).width; }
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(sub, 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 198, 968, 1.5);
  // marcador
  const [a, b] = scoreAt(t), pa = t > K.punto8 + 0.25 ? Math.exp(-(t - K.punto8 - 0.25) * 5) : 0, pb = t > K.punto11 + 0.25 ? Math.exp(-(t - K.punto11 - 0.25) * 5) : 0;
  hg.textAlign = 'right'; hg.letterSpacing = '3px'; hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('MARCADOR', 1024, 108);
  hfont(Math.round(52 * (1 + 0.5 * pb))); hg.fillStyle = HC.amber; hg.shadowColor = HC.amber; hg.shadowBlur = 20 * pb; hg.fillText(String(b), 1024, 166); const wb = hg.measureText(String(b)).width;
  hg.shadowBlur = 0; hfont(40, false); hg.fillStyle = HC.grey; hg.fillText('—', 1024 - wb - 16, 160); const wd = hg.measureText('—').width;
  hfont(Math.round(52 * (1 + 0.5 * pa))); hg.fillStyle = HC.teal; hg.shadowColor = HC.teal; hg.shadowBlur = 20 * pa; hg.fillText(String(a), 1024 - wb - wd - 32, 166); hg.shadowBlur = 0;
  if (msg) { const { txt, col, k, blink } = msg, on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = clamp(k); hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 240;
    hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath(); hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
    hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke(); hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y); }
  hg.restore();
}
// «+1» que vuela desde la escena hasta el marcador
function plusOne(t, t0, col, x1) { const u = (t - t0) / 0.6; if (u < 0 || u > 1.2) return; const e = sm5(clamp(u));
  bigText('+1', lerp(540, x1, e), lerp(980, 150, e), Math.round(lerp(220, 60, e)), col, 1, { type: false, glow: 30, a: u > 1 ? 1 - (u - 1) * 5 : 1 }); }
function pill(txt, t, t0, t1, y = 1470) { const k = ckk(t, t0, t1, 0.4) * ckf(t, t1); if (k <= 0) return; hg.save(); hg.globalAlpha = k; hfont(21, false); hg.letterSpacing = '3px';
  const w = hg.measureText(txt).width + 60; hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, 540 - w / 2, y - 28, w, 56, 28); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 1.5; hg.stroke();
  hg.fillStyle = HC.white; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(typed(txt, k * 1.5), 540, y + 1); hg.restore(); }
function hudAt(t) {
  hudBegin();
  const A = S.arena.userData, V = S.verdict, G = S.gates.userData, C = S.cards;
  let msg = null;
  if (t >= K.las) msg = { txt: 'VEREDICTO · LAS DOS ✓', col: HC.white, k: clamp((t - K.las) / 0.3) };
  else if (t >= K.final) msg = { txt: 'VEREDICTO · ???', col: HC.white, k: clamp((t - K.final) / 0.2), blink: true };
  headerFP(t, sectAt(t), msg);
  // ---- 1: ofertas
  const s1 = ckk(t, K.fp1, K.y2 - 0.15, 0.35) * ckf(t, K.y2 - 0.15), s2 = ckk(t, K.dos1 - 0.1, K.y2 - 0.15, 0.35) * ckf(t, K.y2 - 0.15);
  bigText('FP · 46,96 %', 540, 1330, 76, HC.teal, s1, { type: false, glow: 18, ls: 6 });
  bigText('CARRERA · 21,42 %', 540, 1425, 76, HC.amber, s2, { type: false, glow: 18, ls: 6 });
  pill('INFOEMPLEO ADECCO · TODAS LAS OFERTAS DE 2024', t, K.ofertas, K.y2 - 0.2, 1530);
  // ---- 2: «nunca estará a su nivel»
  const nk = ckk(t, K.nunca + 0.1, K.tienen + 0.4, 0.5) * ckf(t, K.tienen + 0.4);
  if (nk > 0) { const a = proj(wpos(A.dF).add(v3(0.0, 1.3, 0))), b = proj(wpos(A.dC).add(v3(0.0, 1.3, 0))); dimV({ x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y }, '«SU NIVEL»', nk, HC.amber, 0); }
  // ---- 4-5: lo que dice cada bando
  co(t, K.dos4, K.vosotros, wpos(A.dF).add(v3(0, 1.3, 0)), '«2 AÑOS + PRÁCTICAS»', 'Y A TRABAJAR', { dx: -120, dy: -170, color: HC.teal, d: 0.45 });
  co(t, K.cuatro, K.responden, wpos(A.yC[3]).add(v3(0, 0.2, 0)), '«4 AÑOS DE TEORÍA»', 'DICEN LOS DE FP', { dx: 100, dy: -150, side: -1, color: HC.teal, d: 0.45 });
  co(t, K.herramientas, K.debajo, wpos(A.wr), '«SABÉIS USAR HERRAMIENTAS»', 'DICEN LOS DE LA CARRERA', { dx: 120, dy: -170, color: HC.amber, d: 0.45 });
  co(t, K.debajo, K.vamos + 0.3, wpos(A.under).add(v3(0.2, 0.1, 0)), '«LO QUE HAY DEBAJO»', null, { dx: 120, dy: -200, color: HC.amber, d: 0.4 });
  bigText('DATOS', 540, 980, 120, HC.white, ckk(t, K.datos - 0.05, K.programar, 0.3) * ckf(t, K.programar), { glow: 24, ls: 30 });
  // ---- 7-8: ningún título obligatorio · profesiones reguladas · punto FP
  stamp('NINGÚN TÍTULO OBLIGATORIO', 540, 1350, ckk(t, K.titulo, K.ingenieria + 0.8, 0.4) * ckf(t, K.ingenieria + 0.8), HC.white, 46);
  stamp('PUNTO PARA FP', 540, 1380, ckk(t, K.punto8, K.punto8 + 1.0, 0.4) * ckf(t, K.punto8 + 1.0), HC.teal, 64);
  plusOne(t, K.punto8 + 0.05, HC.teal, 890);
  // ---- 9-11: oposiciones, máster, punto carrera
  pill('ESTATUTO DEL EMPLEADO PÚBLICO · ART. 76', t, K.oposiciones, K.y10, 1530);
  co(t, K.grupo9 - 0.2, K.con9, wpos(G.kC), 'GRADO', 'ABRE A1 Y A2', { dx: -110, dy: 90, color: HC.amber, d: 0.4 });
  co(t, K.con9, K.y10, wpos(G.kF), 'TÉCNICO SUPERIOR', 'HASTA EL GRUPO B', { dx: -120, dy: 120, color: HC.teal, d: 0.4 });
  if (t > K.b9 && t < K.y10) { const p = proj(wpos(G.lv[3].g).add(v3(0.2, 0.25, 0.1))); stamp('✕', p.x, p.y, ckk(t, K.b9, K.y10, 0.25) * ckf(t, K.y10), HC.red, 70); }
  pill('REAL DECRETO 822/2021 · ACCESO AL MÁSTER', t, K.master - 0.3, K.punto11, 1530);
  if (t > K.master && t < K.universitario + 0.1) { const p = proj(wpos(G.md).add(v3(0.1, 0.9, 0.2))); stamp('✕', p.x, p.y, ckk(t, K.master, K.universitario, 0.25) * ckf(t, K.universitario), HC.red, 80); }
  stamp('PUNTO PARA LA CARRERA', 540, 1380, ckk(t, K.punto11, K.punto11 + 1.0, 0.4) * ckf(t, K.punto11 + 1.0), HC.amber, 56);
  plusOne(t, K.punto11 + 0.05, HC.amber, 1010);
  // ---- 13-14: veredicto
  if (V.rocket.visible) co(t, K.antes, K.tener, wpos(V.rocket), 'EMPEZAR ANTES', '2 AÑOS', { dx: 130, dy: 60, color: HC.teal, d: 0.4 });
  co(t, K.puertas, K.maestra, wpos(S.arena.userData.yC[3]).add(v3(0, 0.75, 0)), 'MÁS PUERTAS', 'OPOSICIONES A · MÁSTER', { dx: -120, dy: -120, color: HC.amber, d: 0.4 });
  if (V.bar.visible) co(t, K.selectividad, K.medio, wpos(V.bar), 'SIN SELECTIVIDAD', 'ENTRAS CON LA NOTA DEL FP', { dx: 130, dy: -150, color: HC.teal, d: 0.4 });
  if (V.ects.visible) co(t, K.medio, K.equipo, wpos(V.ects), 'MEDIO CURSO CONVALIDADO', 'RD 1618/2011 · MÍNIMO 30 ECTS', { dx: -100, dy: -150, color: HC.teal, d: 0.4 });
  // ---- 15: tu turno
  const ck = ckk(t, K.defiendelo, END - 1.3, 0.4) * ckf(t, END - 1.3);
  if (ck > 0) { hg.save(); hg.globalAlpha = ck; const y = 1440 + 8 * Math.sin(t * 6); glowStroke(HC.white, 3, 14); hg.fillStyle = 'rgba(0,0,0,.55)'; rr(hg, 300, y - 50, 480, 100, 50); hg.fill(); hg.stroke(); noGlow();
    hg.fillStyle = HC.white; hfont(34); hg.letterSpacing = '5px'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText('COMENTA ↓', 540, y + 2); hg.restore(); }
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
  let fl = 0; for (const [t0, k] of [[K.exige, 0.08], [K.punto8, 0.07], [K.punto11, 0.07], [K.las, 0.08], [K.nunca, 0.03]]) if (t > t0) fl += k * Math.exp(-(t - t0) / 0.07);
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
// portada: los dos podios, el de la carrera más alto, con el trofeo y la interrogación (sin HUD)
window.renderCover = function () {
  const t = Number(window.COVER_T || 9.6); frame(t);
  cam.fov = 32; cam.updateProjectionMatrix(); cam.position.set(1.15, 1.35, -1.2); cam.up.set(0, 1, 0); cam.lookAt(0.05, 0.95, -7); cam.updateMatrixWorld(); rigFollow(v3(0.05, 0.95, -7));
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
    casi: atL(1, 'casi'), cinco: atL(1, 'cinco'), diez: atL(1, 'diez'), ofertas: atL(1, 'ofertas'), piden: atL(1, 'piden'), fp1: atL(1, '=fp'), la1: atL(1, '=la'), carrera1: atL(1, 'carrera'), solo1: atL(1, 'solo'), dos1: atL(1, '=dos'),
    y2: atL(2, '=y'), aun: atL(2, 'aun'), hay2: atL(2, '=hay'), ingenieros: atL(2, 'ingenieros'), dicen2: atL(2, 'dicen'), uno: atL(2, 'uno'), fp2: atL(2, '=fp'), nunca: atL(2, 'nunca'), estara: atL(2, 'estara'), nivel: atL(2, 'nivel'),
    tienen: atL(3, 'tienen'), final: atL(3, 'final'), digo: atL(3, 'digo'), bando: atL(3, 'bando'), gustar: atL(3, 'gustar'),
    los4: atL(4, '=los'), fp4: atL(4, '=fp'), dicen4: atL(4, 'dicen'), dos4: atL(4, '=dos'), practicas: atL(4, 'practicas'), empresa: atL(4, 'empresa'), trabajar: atL(4, 'trabajar'), vosotros: atL(4, 'vosotros'), cuatro: atL(4, 'cuatro'), teoria: atL(4, 'teoria'),
    y5: atL(5, '=y'), carrera5: atL(5, 'carrera'), responden: atL(5, 'responden'), sabeis: atL(5, 'sabeis'), herramientas: atL(5, 'herramientas'), entendeis: atL(5, 'entendeis'), debajo: atL(5, 'debajo'),
    vamos: atL(6, 'vamos'), datos: atL(6, 'datos'),
    programar: atL(7, 'programar'), ley: atL(7, 'ley'), exige: atL(7, 'exige'), titulo: atL(7, 'titulo'), ingenieria: atL(7, 'ingenieria'), informatica7: atL(7, 'informatica'), regulada: atL(7, 'regulada'), industrial: atL(7, 'industrial'), teleco: atL(7, 'teleco'), si7: atL(7, '=si'),
    punto8: atL(8, 'punto'),
    pero9: atL(9, 'pero'), oposiciones: atL(9, 'oposiciones'), grupo9: atL(9, 'grupo'), exigen: atL(9, 'exigen'), con9: atL(9, '=con'), fp9: atL(9, '=fp'), mucho: atL(9, 'mucho'), b9: atL(9, '=b'),
    y10: atL(10, '=y'), master: atL(10, 'master'), universitario: atL(10, 'universitario'),
    punto11: atL(11, 'punto'),
    entonces: atL(12, 'entonces'), quien: atL(12, 'quien'),
    antes: atL(13, 'antes'), fp13: atL(13, '=fp'), tener: atL(13, 'tener'), puertas: atL(13, 'puertas'), abiertas: atL(13, 'abiertas'), carrera13: atL(13, 'carrera'),
    maestra: atL(14, 'maestra'), las: atL(14, '=las'), primero: atL(14, 'primero'), luego: atL(14, 'luego'), carrera14: atL(14, 'carrera'), selectividad: atL(14, 'selectividad'), medio: atL(14, 'medio'), convalidado: atL(14, 'convalidado'),
    equipo: atL(15, 'equipo'), fp15: atL(15, '=fp'), equipo2: atL(15, 'equipo', 2), carrera15: atL(15, 'carrera'), defiendelo: atL(15, 'defiendelo'), comentarios: atL(15, 'comentarios'),
  };
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  buildCam(); buildHudPlan();
  buildRig(); buildFloor(); buildFlow();
  S.flow.push(flowCloud(6000, i => [7 + gauss(i + 3e4) * 6, Math.abs(gauss(i + 4e4)) * 1.6 + 0.05, -9 + gauss(i + 5e4) * 3.5], { size: 1.5, bright: 0.55, seed: 5 }));
  S.cards = buildCards(); S.arena = buildArena(); S.verdict = buildVerdict(S.arena); S.data = buildData(); S.gates = buildGates();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
