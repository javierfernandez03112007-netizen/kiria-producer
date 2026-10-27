// «Sonido e Imagen»: un ojo hecho de cubos que estalla (el 99 % borrado), el pique Teleco / Sonido e Imagen, la carrera por dentro,
// el veredicto («Teleco con apellido») y dos trucos de la compresión (el color a ¼ y el sonido tapado).
// Espacio 3D negro con flujo óptico y suelo espejo.
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
// ---------------------------------------------------------------- «Sonido e Imagen»: piezas
// bandos: TELECO ámbar, SONIDO E IMAGEN turquesa, FP magenta
const AMB = 0xf0a332, TEA = 0x2fc7b6, MAG = 0xe0569a;
const CAm = new THREE.Color(1.9, 1.05, 0.25), CTe = new THREE.Color(0.25, 1.6, 1.45), CMg = new THREE.Color(1.8, 0.35, 0.95);
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
// tubo que se dibuja poco a poco (uA: 0 → 1 a lo largo del tubo)
function growTube(curve, r, mat, seg = 160, rs = 10) {
  const U = { uA: { value: 0 } };
  mat.onBeforeCompile = sh => { sh.uniforms.uA = U.uA;
    sh.vertexShader = 'varying float vU;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vU = uv.x;');
    sh.fragmentShader = 'uniform float uA; varying float vU;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n if (vU > uA) discard;'); };
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, rs, false), mat); m.castShadow = true; m.userData.U = U; return m;
}
// brillo propio proporcional al color (para que la imagen de vóxeles se lea como una pantalla)
function selfLit(mat, k) { mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ${k.toFixed(3)};`); }; return mat; }

// ---------------------------------------------------------------- el ojo: imagen 9:16 hecha de 54 × 96 vóxeles
const EYE_NX = 54, EYE_NY = 96, VOX = 0.02, EYE_C = v3(0, 1.62, 0);
const EW = 540, EH = 960;                       // lienzo de dibujo (10 px por vóxel)
const LID_P = [[-40, 520], [270, 120], [580, 470]], LOW_P = [[-40, 520], [270, 880], [580, 470]];   // párpados (cuadráticas)
function quadY(P, x) { // y de la cuadrática P en la abscisa x (búsqueda por bisección; x(s) es creciente)
  let a = 0, b = 1; for (let i = 0; i < 22; i++) { const s = (a + b) / 2, xs = (1 - s) * (1 - s) * P[0][0] + 2 * (1 - s) * s * P[1][0] + s * s * P[2][0]; if (xs < x) a = s; else b = s; }
  const s = (a + b) / 2; return (1 - s) * (1 - s) * P[0][1] + 2 * (1 - s) * s * P[1][1] + s * s * P[2][1];
}
function drawSkin(g) {
  const sk = g.createLinearGradient(0, 0, 0, EH); sk.addColorStop(0, '#1d1411'); sk.addColorStop(0.3, '#6b4636'); sk.addColorStop(0.5, '#8a5c47'); sk.addColorStop(0.72, '#6b4636'); sk.addColorStop(1, '#1d1411');
  g.fillStyle = sk; g.fillRect(0, 0, EW, EH);
  // pliegue del párpado y ceja
  g.strokeStyle = 'rgba(30,18,14,.75)'; g.lineWidth = 16; g.beginPath(); g.moveTo(-20, 420); g.quadraticCurveTo(270, 20, 560, 380); g.stroke();
  g.strokeStyle = 'rgba(24,16,12,.9)'; g.lineWidth = 38; g.beginPath(); g.moveTo(10, 150); g.quadraticCurveTo(250, 30, 540, 120); g.stroke();
}
function drawEye(g) {
  drawSkin(g);
  g.save(); g.beginPath(); g.moveTo(...LID_P[0]); g.quadraticCurveTo(...LID_P[1], ...LID_P[2]); g.quadraticCurveTo(...LOW_P[1], ...LOW_P[0]); g.closePath(); g.clip();
  const sc = g.createRadialGradient(270, 500, 40, 270, 500, 340); sc.addColorStop(0, '#f6f1ec'); sc.addColorStop(0.7, '#e0d2c8'); sc.addColorStop(1, '#a88f84');
  g.fillStyle = sc; g.fillRect(0, 0, EW, EH);
  g.strokeStyle = 'rgba(190,60,60,.35)'; g.lineWidth = 2;
  for (let i = 0; i < 26; i++) { const sx = hash(i * 3.3) < 0.5 ? -10 : 550, sy = 420 + hash(i * 5.1) * 160; g.beginPath(); g.moveTo(sx, sy); let x = sx, y = sy; for (let k = 0; k < 6; k++) { x += (sx < 0 ? 1 : -1) * (14 + hash(i * 7 + k) * 18); y += (hash(i * 11 + k) - 0.5) * 22; g.lineTo(x, y); } g.stroke(); }
  // iris: oro alrededor de la pupila, turquesa por fuera (los dos colores del vídeo)
  const cx = 270, cy = 495, R = 212;
  const ir = g.createRadialGradient(cx, cy, 60, cx, cy, R); ir.addColorStop(0, '#ffcf6a'); ir.addColorStop(0.28, '#f0a332'); ir.addColorStop(0.42, '#b9853a'); ir.addColorStop(0.55, '#2fc7b6'); ir.addColorStop(0.85, '#167f78'); ir.addColorStop(1, '#0a3534');
  g.fillStyle = ir; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  for (let i = 0; i < 1100; i++) { const a = hash(i * 1.7) * 6.2832, r0 = R * (0.3 + hash(i * 2.9) * 0.15), r1 = R * (0.6 + hash(i * 4.3) * 0.38);
    g.strokeStyle = hash(i * 6.1) < 0.5 ? `rgba(180,255,240,${0.12 + hash(i) * 0.2})` : `rgba(255,214,140,${0.1 + hash(i * 9) * 0.2})`; g.lineWidth = 1 + hash(i * 8.8) * 2;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a + 0.05) * r1, cy + Math.sin(a + 0.05) * r1); g.stroke(); }
  for (let i = 0; i < 40; i++) { const a = hash(i * 13.1) * 6.2832, r = R * (0.45 + hash(i * 17.3) * 0.4); g.fillStyle = 'rgba(5,30,30,.45)'; g.beginPath(); g.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 9, 4, a, 0, 7); g.fill(); }
  g.lineWidth = 22; g.strokeStyle = 'rgba(4,22,24,.85)'; g.beginPath(); g.arc(cx, cy, R - 6, 0, 7); g.stroke();
  g.fillStyle = '#020203'; g.beginPath(); g.arc(cx, cy, 80, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.95)'; rr(g, cx - 120, cy - 128, 78, 56, 18); g.fill(); g.beginPath(); g.arc(cx + 70, cy + 64, 13, 0, 7); g.fill();
  // sombra del párpado superior sobre el ojo
  const sh = g.createLinearGradient(0, 120, 0, 420); sh.addColorStop(0, 'rgba(0,0,0,.75)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(0, 0, EW, 420);
  g.restore();
  // pestañas
  g.strokeStyle = '#0b0807'; g.lineCap = 'round';
  for (let i = 0; i < 46; i++) { const x = 10 + i * 11.6, y = quadY(LID_P, x); g.lineWidth = 5; g.beginPath(); g.moveTo(x, y + 4); g.quadraticCurveTo(x - 6, y - 26, x - 16 + i * 0.25, y - 44 - 10 * Math.sin(i / 46 * Math.PI)); g.stroke(); }
  g.lineWidth = 10; g.beginPath(); g.moveTo(...LID_P[0]); g.quadraticCurveTo(...LID_P[1], ...LID_P[2]); g.stroke();
}
function sampleGrid(draw) {
  const c = document.createElement('canvas'); c.width = EW; c.height = EH; const g = c.getContext('2d'); draw(g);
  const d = g.getImageData(0, 0, EW, EH).data, out = new Float32Array(EYE_NX * EYE_NY * 3);
  for (let iy = 0; iy < EYE_NY; iy++) for (let ix = 0; ix < EYE_NX; ix++) { let r = 0, gg = 0, b = 0, n = 0;
    for (let y = iy * 10 + 2; y < iy * 10 + 9; y += 2) for (let x = ix * 10 + 2; x < ix * 10 + 9; x += 2) { const k = (y * EW + x) * 4; r += d[k]; gg += d[k + 1]; b += d[k + 2]; n++; }
    const i = iy * EYE_NX + ix; out[i * 3] = r / n / 255; out[i * 3 + 1] = gg / n / 255; out[i * 3 + 2] = b / n / 255; }
  return out;   // sRGB 0-1
}
function buildEye() {
  const G = new THREE.Group(); G.position.copy(EYE_C); scene.add(G);
  const N = EYE_NX * EYE_NY, open = sampleGrid(drawEye), skin = sampleGrid(drawSkin);
  const geo = new THREE.BoxGeometry(VOX * 0.93, VOX * 0.93, VOX * 0.93);
  const mk = (n, k, sz = 1) => { const m = new THREE.InstancedMesh(sz === 1 ? geo : new THREE.BoxGeometry(VOX * 0.93 * sz, VOX * 0.93 * sz, VOX * 0.93), selfLit(new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0 }), k), n);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); m.frustumCulled = false; m.castShadow = true; G.add(m); return m; };
  const vox = mk(N, 0.62);
  const base = [], seed = [];
  for (let i = 0; i < N; i++) { const ix = i % EYE_NX, iy = Math.floor(i / EYE_NX); base.push(v3((ix - (EYE_NX - 1) / 2) * VOX, ((EYE_NY - 1) / 2 - iy) * VOX, 0));
    const a = hash(i * 3.17) * 6.2832, e = hash(i * 7.73);
    seed.push({ keep: hash(i * 1.913 + 0.37) < 0.01, dir: v3(Math.cos(a) * (0.6 + e), Math.sin(a) * (0.6 + e) * 0.8 + 0.3, 1.2 + hash(i * 9.1) * 3.2), spin: v3(hash(i * 2.1) * 9, hash(i * 4.2) * 9, hash(i * 5.3) * 9), d: hash(i * 6.4) * 0.12 }); }
  const lin = (src) => { const out = new Float32Array(src.length); const c = new THREE.Color(); for (let i = 0; i < src.length; i += 3) { c.setRGB(src[i], src[i + 1], src[i + 2], THREE.SRGBColorSpace); out[i] = c.r; out[i + 1] = c.g; out[i + 2] = c.b; } return out; };
  // capa de luz (gris, todo el detalle) y capa de color (la mitad de resolución en cada eje: 27 × 48, ¼ de muestras)
  const lumS = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const l = 0.2126 * open[i * 3] + 0.7152 * open[i * 3 + 1] + 0.0722 * open[i * 3 + 2]; lumS[i * 3] = lumS[i * 3 + 1] = lumS[i * 3 + 2] = l; }
  const CX = EYE_NX / 2, CY = EYE_NY / 2, chrS = new Float32Array(CX * CY * 3), cbase = [];
  for (let j = 0; j < CY; j++) for (let i = 0; i < CX; i++) { let r = 0, g2 = 0, b = 0; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const k = ((j * 2 + dy) * EYE_NX + i * 2 + dx) * 3; r += open[k]; g2 += open[k + 1]; b += open[k + 2]; }
    r /= 4; g2 /= 4; b /= 4; const l = Math.max(0.05, 0.2126 * r + 0.7152 * g2 + 0.0722 * b), s = 0.55 / l, q = (j * CX + i) * 3;
    chrS[q] = Math.min(1, r * s); chrS[q + 1] = Math.min(1, g2 * s); chrS[q + 2] = Math.min(1, b * s); cbase.push(v3((i * 2 + 0.5 - (EYE_NX - 1) / 2) * VOX, ((EYE_NY - 1) / 2 - j * 2 - 0.5) * VOX, 0)); }
  const luma = mk(N, 0.62), chroma = mk(CX * CY, 0.7, 2);
  const L = { open: lin(open), skin: lin(skin), luma: lin(lumS), chroma: lin(chrS) };
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) { m4.makeTranslation(base[i].x, base[i].y, 0); luma.setMatrixAt(i, m4); luma.instanceColor.setXYZ(i, L.luma[i * 3], L.luma[i * 3 + 1], L.luma[i * 3 + 2]); }
  for (let i = 0; i < CX * CY; i++) { m4.makeTranslation(cbase[i].x, cbase[i].y, 0); chroma.setMatrixAt(i, m4); chroma.instanceColor.setXYZ(i, L.chroma[i * 3], L.chroma[i * 3 + 1], L.chroma[i * 3 + 2]); }
  luma.instanceMatrix.needsUpdate = chroma.instanceMatrix.needsUpdate = true; luma.instanceColor.needsUpdate = chroma.instanceColor.needsUpdate = true;
  // párpado: para cada columna, la y (en vóxeles) del borde superior abierto y del inferior
  const lidTop = [], lidBot = []; for (let ix = 0; ix < EYE_NX; ix++) { const x = ix * 10 + 5; lidTop.push(quadY(LID_P, x) / 10); lidBot.push(quadY(LOW_P, x) / 10); }
  // flechas de movimiento (vectores) sobre los vóxeles que cambian al parpadear (sin uso: la frase se quitó de la voz)
  const arrows = new THREE.InstancedMesh(new THREE.ConeGeometry(0.008, 0.03, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6), toneMapped: false }), 160);
  arrows.frustumCulled = false; arrows.count = 0; G.add(arrows);
  // marco fino alrededor de la imagen
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(EYE_NX * VOX + 0.04, EYE_NY * VOX + 0.04), new THREE.MeshBasicMaterial({ color: 0x0b0d10 })); fr.position.z = -0.016; G.add(fr);
  const fe = edges(new THREE.Mesh(new THREE.BoxGeometry(EYE_NX * VOX + 0.04, EYE_NY * VOX + 0.04, 0.001)), 0xdfe6ee, 1.4, 1, 0.5); fr.add(fe);
  return { G, vox, luma, chroma, base, cbase, seed, L, lidTop, lidBot, arrows, fr };
}

// ---------------------------------------------------------------- emblemas de los bandos
function podium(col, name, r = 0.3) {
  const g = new THREE.Group();
  const body = cyl(r, r * 1.06, 1, plasticS(0x15181d, 0.5), 48); g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.99, 0.008, 8, 64), basicGlow(col, 1.4)); rim.rotation.x = Math.PI / 2; g.add(rim);
  const lab = signPlane(name, { w: r * 1.5, h: r * 0.34, col: '#' + new THREE.Color(col).getHexString() }); g.add(lab);
  g.userData = { body, rim, lab, r }; return g;
}
function setPodiumH(p, h) { const { body, rim, lab, r } = p.userData; body.scale.y = h; body.position.y = h / 2; rim.position.y = h + 0.002; lab.position.set(0, h * 0.5, r * 1.04); }
function tower(col) {
  const g = new THREE.Group(), m = plasticS(col, 0.3);
  const mast = cyl(0.02, 0.03, 1.0, m, 16); mast.position.y = 0.5; g.add(mast);
  for (let k = 0; k < 4; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.006, 6, 20), m); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2 + k * 0.2; g.add(ring); }
  const panels = [];
  for (let k = 0; k < 3; k++) { const p = rbox(0.07, 0.26, 0.03, plasticS(0xe9edf2, 0.35), 0.012); const a = k * 2.094 + 0.5; p.position.set(Math.sin(a) * 0.075, 0.9, Math.cos(a) * 0.075); p.rotation.y = a; g.add(p); panels.push(p); }
  const prof = []; for (let i = 0; i <= 14; i++) { const u = i / 14 * 0.11; prof.push(new THREE.Vector2(u, u * u * 4)); }
  const dish = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), new THREE.MeshStandardMaterial({ color: 0xcfd5dc, roughness: 0.3, side: THREE.DoubleSide }));
  const dg = new THREE.Group(); dg.position.set(0.075, 0.62, 0.04); dg.rotation.set(0.35, 0.65, 0); g.add(dg);
  dish.rotation.x = Math.PI / 2; dg.add(dish); edges(dish, 0x9aa1ab, 1.1, 40, 0.6);
  const feed = cyl(0.004, 0.004, 0.1, m, 6); feed.rotation.x = Math.PI / 2; feed.position.set(0, 0, 0.06); dg.add(feed);
  const beacon = sph(0.022, glowM(0xff3b30, 3)); beacon.position.y = 1.04; g.add(beacon);
  // ondas que salen de la antena
  const waves = []; for (let k = 0; k < 3; k++) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.006, 6, 48), basicGlow(col, 1.6)); w.position.y = 0.9; w.rotation.x = Math.PI / 2; g.add(w); waves.push(w); }
  g.userData = { beacon, waves, dish }; return g;
}
function speaker(col) {
  const g = new THREE.Group();
  const box = rbox(0.34, 0.5, 0.28, plasticS(0x15181d, 0.55), 0.03); box.position.y = 0.25; g.add(box);
  const prof = []; for (let i = 0; i <= 12; i++) { const u = i / 12; prof.push(new THREE.Vector2(0.02 + u * 0.115, -0.045 * (1 - u) * (1 - u))); }
  const cone = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), plasticS(col, 0.35)); cone.rotation.x = Math.PI / 2; cone.position.set(0, 0.19, 0.143); g.add(cone);
  const sur = new THREE.Mesh(new THREE.TorusGeometry(0.137, 0.012, 8, 48), plasticS(0x0c0e11, 0.6)); sur.position.set(0, 0.19, 0.143); g.add(sur);
  const cap = sph(0.034, plasticS(0x0c0e11, 0.3)); cap.scale.z = 0.45; cap.position.set(0, 0.19, 0.1); g.add(cap);
  const tw = sph(0.03, metalS(0xd9dde3, 0.2)); tw.scale.z = 0.5; tw.position.set(0, 0.41, 0.142); g.add(tw);
  const twr = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.006, 6, 32), basicGlow(col, 1.3)); twr.position.set(0, 0.41, 0.143); g.add(twr);
  // anillos de sonido delante del cono
  const rings = []; for (let k = 0; k < 3; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.005, 6, 48), basicGlow(col, 1.6)); r.position.set(0, 0.19, 0.16); g.add(r); rings.push(r); }
  g.userData = { cone, cap, rings }; return g;
}
function lens(col) {
  const g = new THREE.Group(), dark = plasticS(0x111317, 0.45);
  const b1 = cyl(0.1, 0.1, 0.07, dark, 40); b1.rotation.x = Math.PI / 2; g.add(b1);
  for (let k = 0; k < 6; k++) { const rg = cyl(0.104, 0.104, 0.006, plasticS(0x22262c, 0.6), 40); rg.rotation.x = Math.PI / 2; rg.position.z = -0.03 + k * 0.012; g.add(rg); }
  const b2 = cyl(0.115, 0.108, 0.05, dark, 40); b2.rotation.x = Math.PI / 2; b2.position.z = 0.06; g.add(b2);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.006, 8, 48), basicGlow(col, 1.8)); ring.position.z = 0.086; g.add(ring);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.1, 40, 16, 0, Math.PI * 2, 0, 0.55), new THREE.MeshStandardMaterial({ color: 0x050b12, roughness: 0.04, metalness: 0.9, emissive: col, emissiveIntensity: 0.18 }));
  glass.rotation.x = Math.PI / 2; glass.position.z = 0.04; g.add(glass);
  const back = cyl(0.07, 0.08, 0.05, dark, 32); back.rotation.x = Math.PI / 2; back.position.z = -0.06; g.add(back);
  return g;
}
function plug(col) {
  const g = new THREE.Group();
  const body = cyl(0.026, 0.03, 0.12, plasticS(col, 0.3), 24); body.rotation.x = Math.PI / 2; g.add(body);
  const sl = cyl(0.016, 0.016, 0.03, metalS(0xd0d4da), 20); sl.rotation.x = Math.PI / 2; sl.position.z = 0.072; g.add(sl);
  const tip = cyl(0.008, 0.008, 0.08, metalS(0xe6e9ee, 0.15), 16); tip.rotation.x = Math.PI / 2; tip.position.z = 0.12; g.add(tip);
  const nub = sph(0.01, metalS(0xe6e9ee, 0.15)); nub.position.z = 0.16; g.add(nub);
  return g;
}
function coil(col) {   // rollo de cable
  const g = new THREE.Group(), m = plasticS(col, 0.35);
  for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.15 - k * 0.006, 0.014, 10, 56), m); t.rotation.x = Math.PI / 2; t.position.y = 0.016 + k * 0.026; t.castShadow = true; g.add(t); }
  return g;
}
function bar(col, label, name) {
  const g = new THREE.Group();
  const b = rbox(0.2, 1, 0.2, plasticS(col, 0.22), 0.03); g.add(b);
  const top = signPlane(label, { w: 0.42, h: 0.14, col: '#EEF2F6' }); g.add(top);
  const nm = signPlane(name, { w: 0.5, h: 0.08, col: '#' + new THREE.Color(col).getHexString() }); nm.position.set(0, 0.06, 0.13); g.add(nm);
  g.userData = { b, top, nm }; return g;
}
function setBarH(B, h) { const { b, top } = B.userData; b.scale.y = Math.max(1e-3, h); b.position.y = h / 2; top.position.set(0, h + 0.1, 0); }
// tele con una serie (o sin señal)
function seriesTex() {
  return canvasTex(512, 296, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#120a2e'); sky.addColorStop(0.6, '#5a2a6e'); sky.addColorStop(1, '#f08a4b'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,240,210,.95)'; g.beginPath(); g.arc(380, 92, 34, 0, 7); g.fill();
    for (let i = 0; i < 18; i++) { const bw = 22 + hash(i * 3.1) * 30, bh = 60 + hash(i * 5.3) * 120, x = i * 30 - 10; g.fillStyle = '#0a0612'; g.fillRect(x, h - bh, bw, bh);
      for (let k = 0; k < 10; k++) if (hash(i * 7 + k) > 0.55) { g.fillStyle = 'rgba(255,200,120,.85)'; g.fillRect(x + 4 + (k % 3) * 7, h - bh + 8 + Math.floor(k / 3) * 14, 4, 6); } }
    g.fillStyle = '#0a0612'; g.beginPath(); g.arc(150, h - 40, 16, 0, 7); g.fill(); g.fillRect(138, h - 26, 24, 40); g.beginPath(); g.arc(196, h - 44, 18, 0, 7); g.fill(); g.fillRect(182, h - 28, 28, 40);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, h - 22, w, 22); g.fillStyle = '#ff4e42'; g.fillRect(12, h - 13, w * 0.42, 5); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(12 + w * 0.42, h - 13, w * 0.52, 5);
    g.fillStyle = '#EEF2F6'; g.font = '700 20px SpaceMono'; g.fillText('T1 · EP 4', 14, 30);
  });
}
function noiseTex() { const t = canvasTex(256, 148, (g, w, h) => { const d = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { const v = Math.floor(hash(i * 0.731) * 255); d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; } g.putImageData(d, 0, 0); });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function tv() {
  const g = new THREE.Group();
  const frame = rbox(0.66, 0.4, 0.03, plasticS(0x0e1014, 0.4), 0.014); frame.position.y = 0.2; g.add(frame);
  const sT = seriesTex(), nT = noiseTex();
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), new THREE.MeshBasicMaterial({ map: sT, toneMapped: false })); scr.position.set(0, 0.2, 0.0155); g.add(scr);
  const off = signPlane('SIN SEÑAL', { w: 0.4, h: 0.07, col: '#EEF2F6', bg: 'rgba(0,0,0,.75)', size: 0.5, font: '"SpaceMono"', weight: 700, ls: 6 }); off.position.set(0, 0.2, 0.018); off.visible = false; g.add(off);
  const neck = cyl(0.012, 0.012, 0.14, plasticS(0x0e1014), 12); neck.position.y = -0.06; g.add(neck);
  const foot = rbox(0.24, 0.012, 0.12, plasticS(0x0e1014), 0.006); foot.position.y = -0.13; g.add(foot);
  g.userData = { scr, sT, nT, off }; return g;
}

// ---------------------------------------------------------------- zona del duelo
const DZ = v3(0, 0, -9);
const DPOS = { tel: v3(-0.62, 0, 0), si: v3(0.62, 0, 0) };
function buildDuel() {
  const Z = new THREE.Group(); Z.position.copy(DZ); scene.add(Z);
  const pT = podium(AMB, 'TELECO'), pS = podium(TEA, 'SONIDO E IMAGEN');
  pT.position.copy(DPOS.tel); pS.position.copy(DPOS.si); Z.add(pT, pS);
  setPodiumH(pT, 0.3); setPodiumH(pS, 0.3);
  const tw = tower(AMB); tw.position.set(DPOS.tel.x, 0.3, 0); tw.scale.setScalar(0.95); Z.add(tw);
  const sp = speaker(TEA); sp.position.set(DPOS.si.x, 0.3, 0); sp.rotation.y = -0.25; Z.add(sp);
  const ln = lens(TEA); ln.position.set(DPOS.si.x, 1.05, 0.05); Z.add(ln);
  // barras de notas de corte (UPM 2025-26) detrás de cada bando: 0,16 m por punto
  const bT = bar(AMB, '9,408', 'TELECO'), bS = bar(TEA, '8,066', 'SONIDO E IMAGEN');
  bT.position.set(-0.36, 0, -1.6); bS.position.set(0.36, 0, -1.6); Z.add(bT, bS);
  // tele: «sin nosotros no veríais ni una serie»
  const T = tv(); T.position.set(1.3, 0.62, 0.35); T.rotation.y = -0.55; Z.add(T);
  // público: cuánta gente pide cada carrera (ilustrativo)
  const mkCrowd = (n, col, cx) => { const m = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.026, 0.06, 3, 8), plasticS(col, 0.4), n); m.frustumCulled = false; m.castShadow = true; Z.add(m);
    const P = []; for (let i = 0; i < n; i++) { const a = hash(i * 3.7 + cx) * 6.283, r = Math.sqrt(hash(i * 5.9 + cx)) * 0.42; P.push(v3(cx + Math.cos(a) * r, 0.056, 0.85 + Math.sin(a) * r * 0.7)); } m.userData.P = P; return m; };
  const crT = mkCrowd(420, AMB, -0.6), crS = mkCrowd(300, TEA, 0.6);
  // títulos: dos diplomas que se funden en uno
  const dipTex = (head, col) => canvasTex(640, 420, (g, w, h) => { g.fillStyle = '#F2EEE6'; rr(g, 0, 0, w, h, 26); g.fill(); g.strokeStyle = col; g.lineWidth = 14; rr(g, 18, 18, w - 36, h - 36, 18); g.stroke();
    g.fillStyle = '#1B1F27'; g.textAlign = 'center'; g.font = '700 30px SpaceMono'; g.letterSpacing = '4px'; g.fillText(head, w / 2, 100);
    g.font = '900 40px Inter'; g.letterSpacing = '0px'; g.fillText('INGENIERO TÉCNICO', w / 2, 200); g.fillText('DE TELECOMUNICACIÓN', w / 2, 252);
    g.fillStyle = col; g.beginPath(); g.arc(w / 2, 340, 34, 0, 7); g.fill(); });
  const dip = (head, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2625), new THREE.MeshStandardMaterial({ map: dipTex(head, col), roughness: 0.6, side: THREE.DoubleSide })); m.castShadow = true; Z.add(m); return m; };
  const dT = dip('GRADO EN TELECO', '#F0A332'), dS = dip('GRADO EN SONIDO E IMAGEN', '#2FC7B6');
  // puerta del máster
  const door = new THREE.Group(); door.position.set(0, 0, -1.9); Z.add(door);
  const pm = plasticS(0xe9edf2, 0.35); const p1 = rbox(0.08, 1.3, 0.08, pm, 0.02), p2 = p1.clone(), lt = rbox(0.9, 0.1, 0.1, pm, 0.02);
  p1.position.set(-0.42, 0.65, 0); p2.position.set(0.42, 0.65, 0); lt.position.set(0, 1.33, 0); door.add(p1, p2, lt);
  const dl = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 1.25), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.35, 1.25), transparent: true, opacity: 0, toneMapped: false, depthWrite: false })); dl.position.set(0, 0.63, 0); door.add(dl);
  const dlab = signPlane('MÁSTER', { w: 0.6, h: 0.13, col: '#EEF2F6' }); dlab.position.set(0, 1.5, 0); door.add(dlab);
  // TELECO + apellido
  const sign = new THREE.Group(); sign.position.set(0, 1.55, -0.35); Z.add(sign);
  const sTel = signPlane('TELECO', { w: 1.3, h: 0.32, col: '#EEF2F6' }); sign.add(sTel);
  const plate = rbox(1.0, 0.16, 0.04, plasticS(TEA, 0.25), 0.03); plate.position.set(0, -0.27, 0); sign.add(plate);
  const pTxt = signPlane('SONIDO E IMAGEN', { w: 0.92, h: 0.13, col: '#04110F' }); pTxt.position.set(0, -0.27, 0.022); sign.add(pTxt);
  Z.userData = { pT, pS, tw, sp, ln, bT, bS, T, crT, crS, dT, dS, door, dl, sign, sTel, plate, pTxt };
  return Z;
}

// ---------------------------------------------------------------- por dentro: señales, sala, micro y altavoz, emisión a miles de pantallas
const IZ = v3(9, 0, -16);
function buildInside() {
  const Z = new THREE.Group(); Z.position.copy(IZ); scene.add(Z);
  // señal: onda continua → muestras → números
  const wpts = []; for (let i = 0; i <= 160; i++) { const u = i / 160, x = -0.9 + u * 1.8; wpts.push(v3(x, 1.45 + 0.28 * Math.sin(u * 13) * (0.6 + 0.4 * Math.sin(u * 3.1)), 0)); }
  const wave = growTube(new THREE.CatmullRomCurve3(wpts), 0.008, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.2, 2.0), toneMapped: false }), 320, 6); Z.add(wave);
  const NS = 36, samp = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 1, 0.03), plasticS(0xe9edf2, 0.3), NS); samp.frustumCulled = false; samp.castShadow = true; Z.add(samp);
  const sv = []; for (let i = 0; i < NS; i++) { const u = (i + 0.5) / NS; sv.push({ x: -0.9 + u * 1.8, v: 0.28 * Math.sin(u * 13) * (0.6 + 0.4 * Math.sin(u * 3.1)) }); }
  const digits = []; for (let k = 0; k < 6; k++) { const s = signPlane(['0110 1001', '1011 0010', '0001 1110', '1100 0101', '0111 0011', '1010 1100'][k], { w: 0.62, h: 0.1, col: '#62E3D4', font: '"SpaceMono"', weight: 700, ls: 4 }); Z.add(s); digits.push(s); }
  // sala con paneles acústicos, micro y altavoz
  const R = new THREE.Group(); R.position.set(2.6, 0, -0.4); Z.add(R);
  const wm = plasticS(0x1a1d22, 0.8);
  const back = rbox(1.6, 1.2, 0.05, wm, 0.01); back.position.set(0, 0.6, -0.6); const side = rbox(0.05, 1.2, 1.2, wm, 0.01); side.position.set(-0.8, 0.6, 0); R.add(back, side);
  const foam = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.07, 4), plasticS(0x2b3038, 0.9), 200); foam.frustumCulled = false; foam.castShadow = true; R.add(foam);
  { let n = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let j = 0; j < 9; j++) for (let i = 0; i < 14; i++) { e.set(Math.PI / 2, 0, Math.PI / 4); q.setFromEuler(e); m4.compose(v3(-0.72 + i * 0.11, 0.12 + j * 0.12, -0.55), q, v3(1, 1, 1)); foam.setMatrixAt(n++, m4); }
    for (let j = 0; j < 9; j++) for (let i = 0; i < 8 && n < 200; i++) { e.set(0, 0, -Math.PI / 2); q.setFromEuler(e); m4.compose(v3(-0.75, 0.12 + j * 0.12, -0.45 + i * 0.12), q, v3(1, 1, 1)); foam.setMatrixAt(n++, m4); }
    foam.count = n; foam.instanceMatrix.needsUpdate = true; }
  const mic = new THREE.Group(); mic.position.set(-0.25, 0, 0.1); R.add(mic);
  const stand = cyl(0.008, 0.008, 1.0, metalS(0x8c939d), 10); stand.position.y = 0.5; const mbase = cyl(0.1, 0.11, 0.02, metalS(0x3a3f47), 24); mbase.position.y = 0.01;
  const body = cyl(0.03, 0.022, 0.14, metalS(0x2a2e35, 0.3), 24); body.position.y = 1.07; body.rotation.z = 0.25;
  const grille = sph(0.045, new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.35, metalness: 0.9, wireframe: true })); grille.position.set(-0.025, 1.17, 0);
  const gcore = sph(0.038, metalS(0x30343b, 0.4)); gcore.position.copy(grille.position);
  mic.add(stand, mbase, body, grille, gcore);
  const spk = speaker(TEA); spk.position.set(0.45, 0, -0.1); spk.rotation.y = -0.6; spk.scale.setScalar(1.1); R.add(spk);
  // emisión: antena alta y un campo de pantallas que se encienden cuando llega la onda
  const B = new THREE.Group(); B.position.set(5.6, 0, -1.2); Z.add(B);
  const ant = tower(0xe9edf2); ant.scale.setScalar(1.8); B.add(ant);
  const NSC = 2400, scr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.09, 0.008), selfLit(new THREE.MeshStandardMaterial({ roughness: 0.4 }), 1.2), NSC);
  scr.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NSC * 3), 3); scr.frustumCulled = false; B.add(scr);
  const sP = []; { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let n = 0;
    for (let i = 0; i < NSC; i++) { const a = hash(i * 2.3) * 6.283, r = 0.7 + Math.sqrt(hash(i * 4.1)) * 7.5, P = v3(Math.cos(a) * r, 0.06 + hash(i * 6.7) * 0.06, Math.sin(a) * r);
      q.setFromEuler(new THREE.Euler(-0.15, -a - Math.PI / 2, 0)); m4.compose(P, q, v3(1, 1, 1)); scr.setMatrixAt(n++, m4); sP.push({ P, r }); }
    scr.instanceMatrix.needsUpdate = true; }
  const bR = []; for (let k = 0; k < 3; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 96), basicGlow(0x9fe9ff, 1.4)); r.rotation.x = Math.PI / 2; r.position.y = 0.06; B.add(r); bR.push(r); }
  Z.userData = { wave, samp, sv, digits, R, foam, mic, spk, B, ant, scr, sP, bR };
  return Z;
}

// ---------------------------------------------------------------- el truco del sonido: espectro y curva de enmascaramiento
function buildSpectrum() {
  const Z = new THREE.Group(); Z.position.set(0, 0, 0.75); scene.add(Z);
  const N = 26, bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.026, 1, 0.026), plasticS(0xe9edf2, 0.28), N);
  bars.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); bars.frustumCulled = false; bars.castShadow = true; Z.add(bars);
  const H0 = []; for (let i = 0; i < N; i++) H0.push(0.07 + 0.12 * hash(i * 3.9) + 0.06 * Math.sin(i * 0.7) ** 2);
  const LOUD = 12, WEAK = 14; H0[LOUD] = 0.6; H0[WEAK] = 0.13;
  // curva de enmascaramiento: tienda alrededor del sonido fuerte
  const sh = new THREE.Shape(); sh.moveTo(-0.12, 0); sh.lineTo(0, 1.0); sh.lineTo(0.22, 0); sh.closePath();
  const tent = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.85, 0.25), transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  Z.add(tent); const tl = polyline([v3(-0.12, 0, 0), v3(0, 1.0, 0), v3(0.22, 0, 0)], lineMat(0xffb547, 2.4, 1)); tent.add(tl);
  const shards = new THREE.InstancedMesh(new THREE.BoxGeometry(0.014, 0.014, 0.014), plasticS(TEA, 0.3), 40); shards.frustumCulled = false; Z.add(shards);
  Z.userData = { bars, H0, LOUD, WEAK, N, tent, shards };
  return Z;
}
// ---------------------------------------------------------------- estado de la escena en cada instante (todo es función de t)
const wpos = (o, v = new THREE.Vector3()) => o.getWorldPosition(v);
const popS = (t, t0, d = 0.35) => Math.max(1e-4, pop(t, t0, d));
function loopT(t) { return t > END - 1.25 ? t - END : t; }      // al final, el principio otra vez (bucle)
const wink = (t, t0, d) => { const u = (t - t0) / d; return u > 0 && u < 1 ? Math.pow(Math.sin(Math.PI * u), 0.7) : 0; };
function blinkAt(t) {   // 0 abierto → 1 cerrado: guiño en «engañando»
  return wink(t, K.enganando + 0.12, 0.34);
}
const _ec = new THREE.Color(), _m = new THREE.Matrix4(), _qq = new THREE.Quaternion(), _ee = new THREE.Euler(), _pp = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
function eyeAt(t) {
  const E = S.eye, tt = loopT(t), inLoop = t > END - 1.25;
  const vis = tt < K.borra + 0.9 || t > K.truco14 - 1.4; E.G.visible = vis; if (!vis) return;
  const burst = inLoop ? 0 : sm5(clamp((tt - K.borrado + 0.02) / 0.5)) * (1 - sm5(clamp((tt - K.notado + 0.05) / 0.45)));
  const gl = inLoop ? 0 : env(tt, -0.1, K.mas1 + 0.1, 0.05, 0.25);      // filas que tiemblan al principio (imagen «sospechosa»)
  const b = blinkAt(tt), bp = blinkAt(tt - 0.06);
  const mv = 0;
  const dimS = env(t, K.sonido16 - 0.35, K.ahora + 0.2, 0.4, 0.5);        // detrás del espectro, más oscuro
  const split = t > K.luz - 0.15 && t < K.sonido16 ? sm5(clamp((t - K.luz + 0.15) / 0.6)) * (1 - sm5(clamp((t - K.menos - 0.35) / 0.5))) : 0;
  const N = EYE_NX * EYE_NY, open = E.L.open, skin = E.L.skin; let na = 0;
  E.vox.visible = split < 0.001; E.luma.visible = split >= 0.001; E.chroma.visible = split > 0.12;
  const target = split >= 0.001 ? E.luma : E.vox;
  for (let i = 0; i < N; i++) {
    const ix = i % EYE_NX, iy = Math.floor(i / EYE_NX), yc = iy + 0.5, top = E.lidTop[ix], bot = E.lidBot[ix];
    const ye = top + b * (bot - top), yp = top + bp * (bot - top);
    let r = open[i * 3], g = open[i * 3 + 1], bl = open[i * 3 + 2];
    if (b > 0.001 && yc > top && yc < ye) { r = skin[i * 3]; g = skin[i * 3 + 1]; bl = skin[i * 3 + 2]; }
    if (b > 0.02 && Math.abs(yc - ye) < 0.9) { r *= 0.12; g *= 0.1; bl *= 0.1; }          // pestañas en el borde que baja
    const moving = (b > 0.001 || bp > 0.001) && yc > top - 0.5 && ((yc > Math.min(ye, yp) - 0.6 && yc < Math.max(ye, yp) + 0.6) && Math.abs(ye - yp) > 0.05);
    let k = 1;
    if (mv > 0) { k = moving ? 1 + 0.9 * mv : 1 - 0.9 * mv; if (moving && na < 160 && ix % 3 === 1) {
        const P = E.base[i]; _ee.set(0, 0, ye > yp ? Math.PI : 0); _qq.setFromEuler(_ee); _m.compose(_pp.set(P.x, P.y, 0.03), _qq, _one.setScalar(mv)); E.arrows.setMatrixAt(na++, _m); _one.set(1, 1, 1); } }
    if (dimS > 0) k *= 1 - 0.62 * dimS;
    if (split >= 0.001) { const l = E.L.luma, s = clamp(split * 3); r = lerp(r, l[i * 3], s); g = lerp(g, l[i * 3 + 1], s); bl = lerp(bl, l[i * 3 + 2], s); }
    target.instanceColor.setXYZ(i, r * k, g * k, bl * k);
    const P = E.base[i], sd = E.seed[i];
    let x = P.x, y = P.y, z = 0;
    if (gl > 0) { const hr = hash(iy * 7.7 + Math.floor(tt * 14) * 1.3); if (hr > 0.82) x += (hash(iy * 3.1 + Math.floor(tt * 14)) - 0.5) * 0.09 * gl; }
    if (burst > 0 && !sd.keep) { const u = clamp(burst * 1.15 - sd.d); x += sd.dir.x * u * 1.2; y += sd.dir.y * u * 1.2; z += sd.dir.z * u * 1.4;
      _ee.set(sd.spin.x * u, sd.spin.y * u, sd.spin.z * u); _qq.setFromEuler(_ee); } else _qq.identity();
    _m.compose(_pp.set(x, y, z), _qq, _one); target.setMatrixAt(i, _m);
  }
  E.arrows.count = na; E.arrows.instanceMatrix.needsUpdate = true;
  target.instanceMatrix.needsUpdate = true; target.instanceColor.needsUpdate = true;
  E.luma.position.set(-0.12 * split, 0, 0.36 * split); E.chroma.position.set(0.12 * split, 0, -0.36 * split);
  E.fr.visible = burst < 0.5 && split < 0.05;
}
// ---------------------------------------------------------------- el duelo y el veredicto
function duelAt(t) {
  const Z = S.duel, U = Z.userData;
  const vis = (t > K.borra - 0.8 && t < K.asi + 0.7) || (t > K.entonces - 1.3 && t < K.truco14 + 0.6); Z.visible = vis; if (!vis) return;
  // emblemas vivos
  U.tw.userData.waves.forEach((w, k) => { const u = (t * 0.7 + k / 3) % 1; w.scale.setScalar(0.25 + u * 2.4); w.material.opacity = (1 - u) * 0.8; });
  U.tw.userData.beacon.material.emissiveIntensity = Math.sin(t * 5) > 0.55 ? 4 : 0.6;
  const vo = voice(t); U.sp.userData.cone.position.z = 0.143 + 0.01 * vo * Math.sin(t * 38); U.sp.userData.cap.position.z = 0.1 + 0.01 * vo * Math.sin(t * 38);
  U.sp.userData.rings.forEach((r, k) => { const u = (t * 1.1 + k / 3) % 1; r.scale.setScalar(1 + u * 1.6); r.position.z = 0.16 + u * 0.35; r.material.opacity = (1 - u) * 0.75 * (0.4 + vo); });
  U.ln.rotation.y = Math.sin(t * 0.8) * 0.35 - 0.2; U.ln.position.y = 1.02 + 0.03 * Math.sin(t * 2.1);
  // quién está hablando: el aro de su podio brilla más
  const hiS = env(t, K.borra, K.teleco2, 0.2, 0.3) + env(t, K.sonido6 - 0.1, K.asi, 0.2, 0.3), hiT = env(t, K.teleco2 - 0.05, K.municion + 0.3, 0.2, 0.3);
  U.pS.userData.rim.material.color.copy(CTe).multiplyScalar(0.6 + 1.6 * clamp(hiS)); U.pT.userData.rim.material.color.copy(CAm).multiplyScalar(0.6 + 1.6 * hiT);
  // barras de notas de corte (0,16 m por punto)
  // suben al decir cada nombre; se esconden mientras hablan FP y la tele, y vuelven para el veredicto
  const bv = (t > K.municion - 0.3 && t < K.responde + 0.6) || (t > K.entonces - 0.4 && t < K.dos12 + 0.2); U.bT.visible = U.bS.visible = bv;
  if (bv) { const fo = t < K.entonces - 0.4 ? 1 - sm5(clamp((t - K.sonido6 + 0.1) / 0.5)) : sm5(clamp((t - K.entonces + 0.4) / 0.6)) * (1 - sm5(clamp((t - K.dos12 + 0.2) / 0.4)));
    const gT = t < K.entonces - 0.4 ? sm5(clamp((t - K.politecnica) / Math.max(0.5, K.cuatro4 - K.politecnica + 0.2))) : 1, gS = t < K.entonces - 0.4 ? sm5(clamp((t - K.sonido4 + 0.1) / Math.max(0.5, K.ocho - K.sonido4 + 0.2))) : 1;
    setBarH(U.bT, 9.408 * 0.16 * gT * fo); setBarH(U.bS, 8.066 * 0.16 * gS * fo);
    const crowdShot = t > K.nota - 0.1;   // en el plano del público las cifras quedarían bajo la cabecera
    U.bT.userData.top.visible = t > K.nueve && fo > 0.3 && !crowdShot; U.bS.userData.top.visible = t > K.ocho - 0.05 && fo > 0.3 && !crowdShot; }
  // la tele: una serie… y sin Sonido e Imagen, sin señal
  const tvk = env(t, K.responde - 0.4, K.asi + 0.3, 0.35, 0.3); U.T.visible = tvk > 0.01; U.T.scale.setScalar(Math.max(1e-3, tvk));
  const off = t > K.veriais; U.T.userData.scr.material.map = off ? U.T.userData.nT : U.T.userData.sT; U.T.userData.off.visible = off;
  if (off) U.T.userData.nT.offset.set(hash(Math.floor(t * 60) * 1.7), hash(Math.floor(t * 60) * 2.9));
  // el público que pide cada carrera (nota de corte = cuánta gente la quiere)
  for (const [m, t0] of [[U.crT, K.gente - 0.1], [U.crS, K.gente + 0.15]]) { const cv = t > t0 && t < K.dos12 + 0.4; m.visible = cv; if (!cv) continue;
    const fo = 1 - sm5(clamp((t - K.dos12) / 0.4)); m.userData.P.forEach((P, i) => { const s = sm5(clamp((t - t0 - hash(i * 1.1) * 0.6) / 0.25)) * fo; _m.compose(_pp.set(P.x, P.y + 0.03 * Math.abs(Math.sin(t * 6 + i)), P.z), _qq.identity(), _one.setScalar(Math.max(1e-3, s))); m.setMatrixAt(i, _m); });
    _one.set(1, 1, 1); m.instanceMatrix.needsUpdate = true; }
  // títulos: llegan de cada podio, se funden en uno y entran por la puerta del máster
  const dv = t > K.dos12 - 0.1 && t < K.facil13 + 0.2; U.dT.visible = U.dS.visible = dv;
  if (dv) { const m1 = sm5(clamp((t - K.dos12) / Math.max(0.5, K.profesion - K.dos12))), m2 = sm5(clamp((t - K.master + 0.1) / 0.8));
    const C = v3(0, 1.15, 0.35), Dr = v3(0, 0.75, -1.9);
    U.dT.position.copy(v3(-0.62, 0.95, 0.25).lerp(C, m1)).lerp(Dr, m2); U.dS.position.copy(v3(0.62, 0.95, 0.25).lerp(C, m1)).lerp(Dr, m2);
    U.dT.rotation.set(0, (1 - m1) * 0.6 + m2 * 0.0, (1 - m1) * 0.2); U.dS.rotation.set(0, -(1 - m1) * 0.6, -(1 - m1) * 0.2);
    U.dS.visible = m1 < 0.98; const s = popS(t, K.dos12 - 0.1, 0.4) * (1 - 0.6 * m2); U.dT.scale.setScalar(s); U.dS.scale.setScalar(s); U.dT.position.z += 0.002; }
  U.door.visible = t > K.master - 0.45 && t < K.teleco13b - 0.1; U.door.scale.setScalar(popS(t, K.master - 0.45, 0.45)); U.dl.material.opacity = 0.85 * sm5(clamp((t - K.master + 0.1) / 0.4));
  // TELECO + el apellido
  const sv = t > K.teleco13b - 0.15; U.sign.visible = sv && t < K.truco14 + 0.6;
  if (sv) { U.sTel.scale.setScalar(popS(t, K.teleco13b - 0.1, 0.4)); const pk = sm5(clamp((t - K.apellido + 0.25) / 0.35)); U.plate.position.x = U.pTxt.position.x = (1 - pk) * 2.2; U.plate.visible = U.pTxt.visible = pk > 0.001; }
}
// ---------------------------------------------------------------- por dentro
function insideAt(t) {
  const Z = S.inside, U = Z.userData; const vis = t > K.asi - 1.0 && t < K.entonces + 0.5; Z.visible = vis; if (!vis) return;
  U.wave.userData.U.uA.value = eo(clamp((t - K.serie) / Math.max(0.9, K.senales - K.serie + 0.2)));
  const sg = sm5(clamp((t - K.convierten + 0.1) / 0.6));
  U.sv.forEach((s, i) => { const g = sm5(clamp(sg * 1.6 - i / U.sv.length * 0.6)), h = Math.abs(s.v) * g + 1e-3; _m.compose(_pp.set(s.x, 1.45 + Math.sign(s.v) * h / 2, 0), _qq.identity(), _one.set(1, h, 1)); U.samp.setMatrixAt(i, _m); });
  _one.set(1, 1, 1); U.samp.instanceMatrix.needsUpdate = true; U.samp.visible = sg > 0.01;
  U.digits.forEach((d, k) => { const u = clamp((t - K.numeros + 0.1 - k * 0.07) / 0.9); d.visible = u > 0; d.position.set(-0.75 + (k % 3) * 0.75, 1.75 + Math.floor(k / 3) * 0.16 + u * 0.35, 0.05 + k * 0.01); d.material.opacity = sm5(u) * (1 - 0.3 * Math.max(0, u - 0.8)); });
  // sala: el altavoz suena con la voz y el micro capta
  const vo = voice(t), on = env(t, K.altavoces - 0.2, K.video9 + 0.3, 0.2, 0.3) + 0.25;
  U.spk.userData.cone.position.z = 0.143 + 0.014 * vo * on * Math.sin(t * 40);
  U.spk.userData.rings.forEach((r, k) => { const u = (t * 1.2 + k / 3) % 1; r.scale.setScalar(1 + u * 2.4); r.position.z = 0.16 + u * 0.7; r.material.opacity = (1 - u) * 0.8 * clamp(on); });
  // emisión: anillos que salen de la antena y pantallas que se encienden al llegarles
  const t0 = K.llega - 0.15;
  U.bR.forEach((r, k) => { const rad = Math.max(0.01, (t - t0 - k * 0.32) * 4.2); r.visible = t > t0 + k * 0.32 && rad < 9; r.scale.setScalar(rad); r.material.opacity = 0.9 * clamp(1 - rad / 9); });
  const front = (t - t0) * 4.2; U.scr.visible = t > K.video9 - 0.6;
  U.sP.forEach((s, i) => { const d = front - s.r, lit = d > 0 ? 1 : 0, fl = d > 0 ? Math.exp(-d * 1.5) : 0, k = hash(i * 5.3);
    const base = lit ? 0.55 + 0.25 * Math.sin(t * 3 + i) : 0.03; _ec.setRGB(k < 0.5 ? 0.25 : 0.9, k < 0.5 ? 0.95 : 0.9, k < 0.5 ? 0.9 : 0.95).multiplyScalar(base + 1.8 * fl);
    U.scr.setColorAt(i, _ec); });
  U.scr.instanceColor.needsUpdate = true;
  U.ant.userData.waves.forEach((w, k) => { const u = (t * 0.9 + k / 3) % 1; w.scale.setScalar(0.25 + u * 2.6); w.material.opacity = (1 - u) * 0.8; });
  U.ant.userData.beacon.material.emissiveIntensity = Math.sin(t * 5) > 0.55 ? 4 : 0.6;
}
// ---------------------------------------------------------------- el truco del sonido
function spectrumAt(t) {
  const Z = S.spec, U = Z.userData; const vis = t > K.sonido16 - 0.8 && t < END - 0.9; Z.visible = vis; if (!vis) return;
  const a = sm5(clamp((t - K.sonido16 + 0.6) / 0.6)) * (1 - sm5(clamp((t - K.ahora - 0.2) / 0.5)));
  const lg = 0.35 + 0.65 * sm5(clamp((t - K.fuerte + 0.1) / 0.4)), gone = t > K.tira;
  for (let i = 0; i < U.N; i++) { let h = U.H0[i] * (1 + 0.12 * Math.sin(t * 7 + i * 1.7)); if (i === U.LOUD) h = U.H0[i] * lg; if (i === U.WEAK && gone) h = 0; h = Math.max(1e-3, h * a);
    _m.compose(_pp.set((i - (U.N - 1) / 2) * 0.034, h / 2, 0), _qq.identity(), _one.set(1, h, 1)); U.bars.setMatrixAt(i, _m);
    _ec.copy(i === U.LOUD ? CAm : i === U.WEAK ? CTe : _ec.setRGB(0.75, 0.78, 0.82)); if (i === U.LOUD || i === U.WEAK) _ec.multiplyScalar(0.55); U.bars.setColorAt(i, _ec); }
  _one.set(1, 1, 1); U.bars.instanceMatrix.needsUpdate = true; U.bars.instanceColor.needsUpdate = true;
  const tk = sm5(clamp((t - K.tapa + 0.05) / 0.45)); U.tent.visible = tk > 0.01; U.tent.position.set((U.LOUD - (U.N - 1) / 2) * 0.034, 0, 0.03); U.tent.scale.set(0.8, Math.max(1e-3, U.H0[U.LOUD] * lg * a * tk * 1.05), 1);
  const u = t - K.tira; U.shards.visible = u > 0 && u < 1.4;
  if (U.shards.visible) { const x0 = (U.WEAK - (U.N - 1) / 2) * 0.034; for (let i = 0; i < 40; i++) { const an = hash(i * 3.3) * 6.283, sp = 0.5 + hash(i * 5.1) * 1.4;
      _ee.set(u * 9 + i, u * 7, 0); _qq.setFromEuler(_ee); _m.compose(_pp.set(x0 + Math.cos(an) * sp * u * 0.5, 0.1 + hash(i * 2.2) * 0.12 + Math.abs(Math.sin(an)) * sp * u * 0.6 - 1.4 * u * u, Math.sin(an) * sp * u * 0.4), _qq, _one.setScalar(Math.max(1e-3, 1 - u / 1.4))); U.shards.setMatrixAt(i, _m); }
    _one.set(1, 1, 1); U.shards.instanceMatrix.needsUpdate = true; }
}
function stageAt(t) { eyeAt(t); duelAt(t); insideAt(t); spectrumAt(t); }
// ---------------------------------------------------------------- cámara: el ojo (0,1.62,0), el duelo (0,0,-9) y «por dentro» (9,0,-16), lejos para que los vuelos dejen estelas
let CK = [], CK_OPEN = [];
const EYE_L = [0, 1.62, 0];
function buildCam() {
  // primer segundo: tan cerca de la pupila que solo se ven cubos; luego se descubre el ojo
  CK_OPEN = [
    [-1.5, [-0.1, 1.705, 0.7], [-0.11, 1.7, 0], 32, 0.02],
    [0.0, [-0.105, 1.702, 0.45], [-0.11, 1.7, 0], 32, 0.04],
    [0.7, [-0.08, 1.69, 0.85], [-0.09, 1.68, 0], 32, 0.02],
  ];
  CK = [
    ...CK_OPEN,
    [K.noventa, [0.08, 1.61, 2.2], EYE_L, 32, 0.01],
    [K.borrado - 0.05, [0.12, 1.62, 3.3], EYE_L, 32],
    [K.notado, [0.05, 1.62, 3.55], EYE_L, 32, -0.01],
    // al duelo: primero Sonido e Imagen, luego Teleco
    [K.borra + 0.2, [1.85, 1.45, -6.4], [0.62, 0.8, -9], 32, -0.03],
    [K.sonido2 + 0.4, [1.45, 1.3, -6.8], [0.62, 0.85, -9], 32],
    [K.teleco2 + 0.05, [-1.55, 1.5, -6.7], [-0.62, 0.9, -9], 32, 0.02],
    [K.facil2 + 0.3, [-1.3, 1.55, -6.9], [-0.62, 0.95, -9], 32],
    // ¿tienen razón? plano general de los tres bandos
    // munición: notas de corte
    [K.municion, [0, 1.65, -4.9], [0, 1.0, -10.4], 32],
    [K.teleco4, [-0.5, 1.5, -5.9], [-0.2, 0.95, -10.6], 32, 0.02],
    [K.nueve + 0.4, [-0.45, 1.7, -5.9], [-0.18, 1.3, -10.6], 32],
    [K.sonido4, [0.5, 1.5, -5.9], [0.2, 0.95, -10.6], 32, -0.02],
    [K.ocho + 0.15, [0.08, 1.7, -4.7], [0, 1.3, -10.6], 32],
    [K.ocho + 0.7, [0.04, 1.72, -4.5], [0, 1.3, -10.6], 32],
    // la tele: sin nosotros, ni una serie
    [K.responde, [2.0, 1.05, -7.2], [1.3, 0.82, -8.65], 32],
    [K.serie + 0.35, [1.85, 1.0, -7.4], [1.3, 0.82, -8.65], 32],
    // así es por dentro: señales → sala → emisión
    [K.asi + 0.25, [9.0, 1.6, -13.3], [9, 1.5, -16], 32, 0.03],
    [K.numeros + 0.35, [9.1, 1.75, -13.5], [9, 1.62, -16], 32],
    [K.acustica + 0.05, [12.0, 1.25, -13.6], [11.45, 0.75, -16.4], 32],
    [K.altavoces + 0.3, [12.45, 1.1, -14.0], [11.8, 0.65, -16.45], 32],
    [K.video9 + 0.05, [15.7, 1.05, -14.6], [14.6, 0.95, -17.2], 32],
    [K.millones, [15.6, 6.5, -11.0], [14.6, 0.0, -17.6], 36],
    [K.vez + 0.35, [15.2, 8.0, -10.2], [14.6, 0.0, -17.8], 38],
    // veredicto: vuelta al duelo
    [K.entonces + 0.25, [0, 1.9, -3.4], [0, 1.0, -9.6], 32],
    [K.facil10 + 0.3, [0.05, 1.85, -3.6], [0, 1.0, -9.6], 32],
    [K.nota + 0.05, [0, 2.5, -3.9], [0, 0.5, -8.7], 36],
    [K.dificil + 0.25, [0, 2.65, -3.6], [0, 0.45, -8.6], 36],
    [K.dos12 + 0.05, [0, 1.5, -5.4], [0, 1.0, -9.0], 32],
    [K.profesion, [0, 1.4, -6.2], [0, 1.1, -8.8], 32],
    [K.master + 0.1, [0.15, 1.35, -6.6], [0, 0.85, -10.5], 32],
    [K.facil13, [0, 1.55, -4.6], [0, 1.4, -9.35], 32],
    [K.apellido + 0.5, [0, 1.5, -4.75], [0, 1.38, -9.35], 32],
    // el truco: vuelta al ojo
    [K.truco14 + 0.3, [0.6, 1.66, 3.2], EYE_L, 32, 0.02],
    [K.luz, [2.35, 1.9, 2.45], EYE_L, 32],
    [K.menos + 0.3, [2.15, 1.8, 2.65], EYE_L, 32],
    [K.sonido16 + 0.05, [0.0, 0.62, 3.6], [0, 0.42, 0.75], 32],
    [K.tira + 0.4, [0.05, 0.6, 3.4], [0.05, 0.4, 0.75], 32],
    // vuelve a verlo: el ojo entero y otra vez hacia la pupila
    [K.ahora + 0.1, [0, 1.62, 3.45], EYE_L, 32],
    [K.leo, [0.02, 1.61, 2.7], [0.01, 1.6, 0], 32],
  ];
}
function blendCam(A, B, w) { return { p: A.p.clone().lerp(B.p, w), l: A.l.clone().lerp(B.l, w), f: lerp(A.f, B.f, w), roll: lerp(A.roll, B.roll, w) }; }
function camAt(t) {
  let c = camKeys(t, CK);
  const we = win(t, END - 1.25, 0.95); if (we > 0) c = blendCam(c, camKeys(t - END, CK_OPEN), we);
  let sh = 0; for (const [t0, a] of [[K.borrado, 0.012], [K.veriais, 0.006], [K.no13, 0.01], [K.apellido, 0.008], [K.tira, 0.008]]) if (t > t0) sh += a * Math.exp(-(t - t0) * 8);
  if (sh > 1e-4) { c.p.x += sh * Math.sin(t * 97); c.p.y += sh * Math.cos(t * 83); }
  return c;
}
// las luces acompañan a lo que se mira (siempre las mismas 4)
function rigFollow(l) { const R = S.rig; R.key.position.set(l.x - 1.7, Math.max(l.y, 0.6) + 3.0, l.z + 2.1); R.key.target.position.set(l.x, Math.max(0, l.y - 0.6), l.z); R.key.target.updateMatrixWorld();
  R.rimC.position.set(l.x - 2.3, 0.6, l.z - 1.9); R.rimW.position.set(l.x + 2.3, 0.7, l.z - 1.7); R.fill.position.set(l.x + 0.6, l.y + 1.4, l.z + 3.2); }
// ---------------------------------------------------------------- HUD: cabecera con los dos bucles abiertos (veredicto y truco), datos y pique entre bandos
const ckk = (t, t0, t1, d = 0.6) => (t < t0 || t > t1 + 0.3 ? 0 : clamp((t - t0) / d));
const ckf = (t, t1) => 1 - win(t, t1, 0.28);
const HMAG = '#FF7AB8';
function co(t, t0, t1, anchor, txt, sub, o = {}) { const k = ckk(t, t0, t1, o.d || 0.6); if (k > 0) callout(anchor, txt, sub, k, { ...o, fade: ckf(t, t1) }); }
let SECT = [];
function buildHudPlan() {
  SECT = [[-9, 'EL VÍDEO QUE ESTÁS VIENDO'], [K.borra, 'EL PIQUE'], [K.municion, 'LA MUNICIÓN'], [K.sonido6, 'LA RESPUESTA'], [K.asi, 'POR DENTRO'],
    [K.entonces, 'VEREDICTO'], [K.truco14, 'EL TRUCO'], [K.ahora, 'TU TURNO']];
}
function sectAt(t) { let s = SECT[0][1]; for (const [t0, x] of SECT) if (t >= t0 - 0.05) s = x; return s; }
function loopBox(t, txt, col, k, y, blink, x1 = 1024) {
  hg.save(); hfont(19); hg.letterSpacing = '3px'; const w0 = hg.measureText(txt).width + 34; hg.restore();
  if (k <= 0.01) return x1 - w0; const on = !blink || Math.sin(t * 9) > -0.3;
  hg.save(); hg.globalAlpha = clamp(k); hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right'; hg.textBaseline = 'alphabetic';
  const w = hg.measureText(txt).width + 34, x0 = x1 - w;
  hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath(); hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
  hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke(); hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y);
  hg.restore(); return x0;
}
function headerSI(t, sub) {
  hg.save(); hg.textBaseline = 'alphabetic'; const tk = 1;   // ya escrita: el último fotograma enlaza con el primero
  hg.letterSpacing = '8px'; hfont(44); hg.textAlign = 'left'; hg.fillStyle = HC.teal; hg.fillText(typed('SONIDO E IMAGEN', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(sub, 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 198, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px'; hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('CONTRA', 1024, 108);
  hfont(40); hg.letterSpacing = '6px'; hg.fillStyle = HC.amber; hg.fillText(typed('TELECO', tk), 1024, 158);
  hg.restore();
  // bucles abiertos: el veredicto y el truco (se cierran al final)
  let x0 = 1024;
  if (t >= K.apellido + 0.1) x0 = loopBox(t, 'VEREDICTO · CON APELLIDO ✓', HC.white, clamp((t - K.apellido - 0.1) / 0.3), 240, false);
  else if (t >= K.facil2 + 0.4) x0 = loopBox(t, 'VEREDICTO · ???', HC.white, clamp((t - K.facil2 - 0.4) / 0.2), 240, true);
  if (t >= K.tira + 0.2) loopBox(t, 'TRUCO · ✓', HC.white, clamp((t - K.tira - 0.2) / 0.3), 240, false, x0 - 18);
  else if (t >= K.notado + 0.4) loopBox(t, 'TRUCO · ???', HC.white, clamp((t - K.notado - 0.4) / 0.2), 240, true, x0 - 18);
}
function pill(txt, t, t0, t1, y = 1500, col = HC.white) { const k = ckk(t, t0, t1, 0.4) * ckf(t, t1); if (k <= 0) return; hg.save(); hg.globalAlpha = k; hfont(21, false); hg.letterSpacing = '3px';
  const w = hg.measureText(txt).width + 60; hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, 540 - w / 2, y - 28, w, 56, 28); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 1.5; hg.stroke();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(typed(txt, k * 1.5), 540, y + 1); hg.restore(); }
function bigPill(txt, t, t0, t1, y, col) { const k = ckk(t, t0, t1, 0.4) * ckf(t, t1); if (k <= 0) return; hg.save(); hg.globalAlpha = k; const yy = y + 7 * Math.sin(t * 6);
  hfont(32); hg.letterSpacing = '4px'; const w = hg.measureText(txt).width + 80; glowStroke(col, 3, 14); hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, 540 - w / 2, yy - 46, w, 92, 46); hg.fill(); hg.stroke(); noGlow();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(txt, 540, yy + 2); hg.restore(); }
function hudAt(t) {
  hudBegin();
  const D = S.duel.userData, I = S.inside.userData, E = S.eye, P = S.spec.userData, tt = loopT(t);
  headerSI(t, sectAt(t));
  // ---- 1-2: el 99 % borrado
  const ck = ckk(tt, K.mas1 - 0.05, K.notado + 0.35, 0.2) * ckf(tt, K.notado + 0.35);
  if (ck > 0) { const n = Math.round(99 * sm5(clamp((tt - K.mas1) / Math.max(0.4, K.ciento - K.mas1 + 0.2)))), pb = tt > K.borrado ? Math.exp(-(tt - K.borrado) * 5) : 0;
    bigText(n + ' %', 540, 1300, Math.round(170 * (1 + 0.25 * pb)), HC.red, ck, { type: false, glow: 30 + 30 * pb, ls: 8 });
    bigText('DEL VÍDEO, BORRADO', 540, 1420, 40, HC.white, ck * clamp((tt - K.video1 + 0.1) / 0.3), { ls: 8 }); }
  stamp('¿LA TELECO FÁCIL?', 540, 1380, ckk(t, K.facil2 - 0.05, K.municion + 0.2, 0.35) * ckf(t, K.municion + 0.2), HC.amber, 58);
  // ---- 4: la munición
  pill('UPM · NOTAS DE CORTE 2025-26', t, K.politecnica, K.sonido6 - 0.1, 1540);
  // ---- 4: la respuesta de Sonido e Imagen
  if (D.T.visible) co(t, K.sin6 - 0.05, K.asi, wpos(D.T).add(v3(0, 0.38, 0)), '«SIN NOSOTROS, NI UNA SERIE»', 'RESPONDE SONIDO E IMAGEN', { dx: -120, dy: -170, color: HC.teal, d: 0.45 });
  // ---- 7-9: por dentro
  co(t, K.senales, K.convierten + 0.2, v3(IZ.x - 0.35, 1.7, IZ.z), 'SEÑAL', 'CONTINUA', { dx: 120, dy: -170, color: HC.teal, d: 0.35 });
  co(t, K.convierten + 0.15, K.numeros + 0.3, v3(IZ.x + 0.35, 1.45 + 0.2, IZ.z), 'MUESTRAS', null, { dx: 110, dy: 170, color: HC.white, d: 0.35 });
  co(t, K.numeros, K.acustica, v3(IZ.x + 0.75, 2.15, IZ.z), 'NÚMEROS', '0 Y 1', { dx: 90, dy: -150, color: HC.teal, d: 0.35 });
  co(t, K.salas - 0.1, K.video9, wpos(I.R).add(v3(-0.3, 0.9, -0.5)), 'SALA', 'PANELES ACÚSTICOS', { dx: -100, dy: -150, color: HC.white, d: 0.35 });
  co(t, K.microfonos - 0.05, K.video9, wpos(I.mic).add(v3(-0.03, 1.17, 0)), 'MICRÓFONO', null, { dx: -110, dy: 140, color: HC.white, d: 0.35 });
  co(t, K.altavoces - 0.05, K.video9 + 0.2, wpos(I.spk).add(v3(0, 0.4, 0.1)), 'ALTAVOZ', null, { dx: 110, dy: -160, color: HC.teal, d: 0.35 });
  co(t, K.millones - 0.1, K.entonces, wpos(I.B).add(v3(-1.5, 0.1, 2.5)), 'MILLONES DE PANTALLAS', 'A LA VEZ', { dx: 60, dy: -260, color: HC.white, d: 0.4, size: 27 });
  // ---- 10-13: veredicto
  stamp('¿FÁCIL?', 540, 1380, ckk(t, K.facil10 - 0.05, K.nota, 0.35) * ckf(t, K.nota), HC.amber, 80);
  pill('NOTA DE CORTE = LA DEL ÚLTIMO QUE ENTRA', t, K.nota, K.dos12 - 0.1, 1540);
  if (D.crT.visible) co(t, K.gente, K.pide + 0.5, v3(DZ.x - 0.6, 0.12, DZ.z + 0.85), 'CUÁNTA GENTE LA PIDE', null, { dx: 60, dy: -260, color: HC.white, d: 0.4 });
  stamp('DIFICULTAD ✕', 540, 1380, ckk(t, K.dificil - 0.05, K.dos12, 0.35) * ckf(t, K.dos12), HC.red, 62);
  if (D.dT.visible) co(t, K.profesion - 0.1, K.master - 0.15, wpos(D.dT).add(v3(0, 0.16, 0)), 'LA MISMA PROFESIÓN', 'INGENIERO TÉCNICO DE TELECOMUNICACIÓN', { dx: 90, dy: -190, color: HC.white, d: 0.4 });
  if (D.door.visible) co(t, K.master - 0.05, K.facil13, wpos(D.door).add(v3(0.42, 1.3, 0)), 'EL MISMO MÁSTER', 'INGENIERO DE TELECOMUNICACIÓN', { dx: 100, dy: -150, color: HC.white, d: 0.4 });
  pill('ÓRDENES CIN/352/2009 Y CIN/355/2009', t, K.dos12, K.facil13, 1540);
  stamp('FÁCIL ✕', 540, 1380, ckk(t, K.no13 - 0.05, K.teleco13b + 0.3, 0.3) * ckf(t, K.teleco13b + 0.3), HC.red, 90);
  // ---- 14-16: el truco
  if (E.luma.visible) co(t, K.luz - 0.05, K.menos + 0.3, wpos(E.luma).add(v3(-0.3, 0.55, 0)), 'LUZ', 'TODO EL DETALLE', { dx: -100, dy: -170, color: HC.white, d: 0.4 });
  if (E.chroma.visible) co(t, K.color14b - 0.05, K.menos + 0.3, wpos(E.chroma).add(v3(0.42, -0.5, 0)), 'COLOR', '¼ DE LOS PUNTOS', { dx: 110, dy: 170, color: HC.amber, d: 0.4 });
  if (S.spec.visible) { const bx = i => S.spec.position.x + (i - (P.N - 1) / 2) * 0.034;
    co(t, K.fuerte - 0.05, K.ahora, v3(bx(P.LOUD), P.H0[P.LOUD] + 0.02, S.spec.position.z), 'FUERTE', null, { dx: -110, dy: -120, color: HC.amber, d: 0.35 });
    co(t, K.flojo - 0.05, K.tira + 0.1, v3(bx(P.WEAK), P.H0[P.WEAK] + 0.02, S.spec.position.z), 'FLOJO', 'TAPADO', { dx: 110, dy: -260, color: HC.teal, d: 0.35 });
    if (t > K.tira) { const p = proj(v3(bx(P.WEAK), 0.12, S.spec.position.z)); stamp('✕', p.x, p.y, ckk(t, K.tira, K.ahora + 0.2, 0.25) * ckf(t, K.ahora + 0.2), HC.red, 80); } }
  // ---- 17: tu turno
  bigPill('COMENTA ↓', t, K.teleco17 - 0.1, END - 1.3, 1380, HC.white);
  pill('MÁNDASELO A ALGUIEN DE TELECO →', t, K.mandaselo - 0.1, END - 1.3, 1520, HC.amber);
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
  let fl = 0; for (const [t0, k] of [[K.borrado, 0.1], [K.no13, 0.07], [K.apellido, 0.07], [K.tira, 0.05]]) if (t > t0) fl += k * Math.exp(-(t - t0) / 0.07);
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
// portada: el ojo estallando en cubos (sin HUD)
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : K.borrado - 0.15; frame(t);
  // el ojo entero en el centro y los bordes estallando en cubos hacia la cámara
  { const E = S.eye, r0 = window.COVER_R0 || 0.36, m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    E.base.forEach((P, i) => { const sd = E.seed[i], d = Math.hypot(P.x, (P.y + 0.04) * 0.85), u = clamp((d - r0) / 0.55);
      if (u > 0) { const k = u * u * (window.COVER_K || 1.1); e.set(sd.spin.x * k * 0.3, sd.spin.y * k * 0.3, sd.spin.z * k * 0.3); q.setFromEuler(e); p.set(P.x * (1 + k * 0.9) + sd.dir.x * k * 0.25, P.y * (1 + k * 0.5) + sd.dir.y * k * 0.25, sd.dir.z * k * 0.55); }
      else { q.identity(); p.copy(P); }
      m.compose(p, q, one); E.vox.setMatrixAt(i, m); });
    E.vox.instanceMatrix.needsUpdate = true; E.fr.visible = false; }
  const C = window.COVER_CAM || [0.35, 1.5, 3.4, 0, 1.55, 0, 34];
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
    te1: atL(1, '=te'), enganando: atL(1, 'enganando'), mas1: atL(1, '=mas'), noventa: atL(1, 'noventa'), ciento: atL(1, 'ciento'), video1: atL(1, 'video'), borrado: atL(1, 'borrado'),
    y2: atL(2, '=y'), notado: atL(2, 'notado'), borra: atL(2, 'borra'), ingenieria2: atL(2, 'ingenieria'), sonido2: atL(2, 'sonido'), carrera2: atL(2, 'carrera'), teleco2: atL(2, 'teleco'), llaman: atL(2, 'llaman'), facil2: atL(2, 'facil'),
    municion: atL(3, 'municion'), politecnica: atL(3, 'politecnica'), teleco4: atL(3, 'teleco'), nueve: atL(3, 'nueve'), cuatro4: atL(3, 'cuatro'), sonido4: atL(3, 'sonido'), ocho: atL(3, 'ocho'),
    sonido6: atL(4, 'sonido'), responde: atL(4, 'responde'), sin6: atL(4, '=sin'), veriais: atL(4, 'veriais'), serie: atL(4, 'serie'),
    asi: atL(5, 'asi'), dentro: atL(5, 'dentro'), senales: atL(5, 'senales'), matematicas: atL(5, 'matematicas'), convierten: atL(5, 'convierten'), numeros: atL(5, 'numeros'),
    acustica: atL(6, '=acustica'), electro: atL(6, 'electroacustica'), salas: atL(6, 'salas'), microfonos: atL(6, 'microfonos'), altavoces: atL(6, 'altavoces'),
    video9: atL(7, 'video'), llega: atL(7, 'llega'), millones: atL(7, 'millones'), pantallas: atL(7, 'pantallas'), vez: atL(7, 'vez'),
    entonces: atL(8, 'entonces'), facil10: atL(8, 'facil'),
    nota: atL(9, 'nota'), mide: atL(9, 'mide'), gente: atL(9, 'gente'), pide: atL(9, 'pide'), dificil: atL(9, 'dificil'),
    dos12: atL(10, '=dos'), misma: atL(10, 'misma'), profesion: atL(10, 'profesion'), ingeniero: atL(10, 'ingeniero'), master: atL(10, 'master'),
    teleco13: atL(11, 'teleco'), facil13: atL(11, 'facil'), no13: atL(11, '=no'), teleco13b: atL(11, 'teleco', 2), apellido: atL(11, 'apellido'),
    truco14: atL(12, 'truco'), ojo: atL(12, 'ojo'), luz: atL(12, 'luz'), color14: atL(12, 'color'), color14b: atL(12, 'color', 2), cuatro14: atL(12, 'cuatro'), menos: atL(12, 'menos'),
    sonido16: atL(13, 'sonido'), fuerte: atL(13, 'fuerte'), tapa: atL(13, 'tapa'), flojo: atL(13, 'flojo'), flojo2: atL(13, 'flojo', 2), tira: atL(13, 'tira'),
    ahora: atL(14, 'ahora'), vuelve: atL(14, 'vuelve'), notas: atL(14, 'notas'), teleco17: atL(14, 'teleco'), leo: atL(14, 'leo'), mandaselo: atL(14, 'mandaselo'),
  };
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  buildCam(); buildHudPlan();
  buildRig(); buildFloor(); buildFlow();
  S.flow.push(flowCloud(5000, i => [gauss(i + 3e4) * 2.6, Math.abs(gauss(i + 4e4)) * 1.5 + 0.05, -9 + gauss(i + 5e4) * 2.4], { size: 1.5, bright: 0.55, seed: 5 }));
  S.flow.push(flowCloud(6000, i => [12 + gauss(i + 6e4) * 4.5, Math.abs(gauss(i + 7e4)) * 1.6 + 0.05, -16 + gauss(i + 8e4) * 3], { size: 1.5, bright: 0.55, seed: 6 }));
  S.eye = buildEye(); S.duel = buildDuel(); S.inside = buildInside(); S.spec = buildSpectrum();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
