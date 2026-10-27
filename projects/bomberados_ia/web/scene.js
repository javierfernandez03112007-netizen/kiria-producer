// «Bomberados IA» (vídeo para la marca): ¿un fuego de aceite en una sartén es de clase B? Verdadero o falso.
// La sartén en llamas (el fuego forma una V y una F), la hoja de respuestas con la 37 en rojo, buscar a mano entre
// manuales (páginas, índices, apuntes y la tarde que se va), el portátil con la IA de la app (cursor y tarjetas que salen
// de la pantalla) y la respuesta: la F vuelve a la sartén. Espacio negro con brasas, flujo óptico y suelo espejo.
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
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
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


// ---------------------------------------------------------------- luces fijas (mismo número siempre: no se recompilan sombreadores)
function buildRig() {
  const key = new THREE.SpotLight(0xfff1e4, 34, 14, 0.62, 0.75, 1.4); key.position.set(-1.7, 3.3, 2.1); key.target.position.set(0, 0.15, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.01; key.shadow.radius = 5; key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
  scene.add(key, key.target);
  const rimC = new THREE.PointLight(0x5fd8ff, 1.2, 9, 1.4); rimC.position.set(-2.3, 0.42, -1.9);
  const rimW = new THREE.PointLight(0xff8a55, 1.6, 9, 1.4); rimW.position.set(2.3, 0.48, -1.7);
  const fill = new THREE.PointLight(0xc4d4ff, 2.2, 10, 1.4); fill.position.set(0.6, 1.6, 3.2);
  // y tres más que se quedan en su sitio: el fuego de la sartén, el flexo y la pantalla del portátil (7 luces siempre)
  const fireL = new THREE.PointLight(0xff7a2a, 0, 3.5, 1.6); fireL.position.set(0, 0.3, 0);
  const lampL = new THREE.PointLight(0xffc27a, 0, 4.5, 1.5);
  const screenL = new THREE.PointLight(0xa8e6ff, 0, 2.2, 1.6);
  scene.add(rimC, rimW, fill, fireL, lampL, screenL); S.rig = { key, rimC, rimW, fill, fireL, lampL, screenL };
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
// ---------------------------------------------------------------- fuego: partículas que suben de la sartén; dos grupos forman la V y la F
// Cada partícula vive en bucle (edad 0→1): nace en el aceite, sube estrechándose y se enfría (blanco → naranja → rojo).
// Las de los grupos 1 (V) y 2 (F) pueden dejar la llama y colocarse en su letra (form 0→1), que se mueve y escala
// con L0 / L1 (centro y altura en metros). Estela = su propio movimiento + el de la cámara (posición ahora y hace dtp).
const FIRE_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 corner; attribute vec4 seed; attribute vec3 tgt; attribute float grp;
uniform mat4 VP, PVP; uniform vec2 res; uniform float ppu, time, dtp, size, lsize, bright;
uniform vec3 orig; uniform float rad, hgt, power;
uniform vec4 L0, L1, L0p, L1p; uniform vec2 form, heat;
varying float vA; varying float vS; varying float vT; varying float vLen; varying vec3 vC;
vec3 flameP(float T, float age) {
  // lenguas de fuego: cada partícula nace en el aceite y, al subir, se junta en una de 7 lenguas que ondean
  float lane = floor(seed.z * 7.0), la = lane / 7.0 * 6.2831853 + sin(T * 0.6 + lane * 1.3) * 0.5;
  float a = seed.y * 6.2831853, r = sqrt(seed.w) * rad;
  float tall = 0.3 + 0.95 * pow(fract(seed.x * 3.7 + lane * 0.37), 1.4);
  float h = pow(age, 0.72) * hgt * tall * power;
  vec2 base = vec2(cos(a), sin(a)) * r, tg = vec2(cos(la), sin(la)) * rad * (0.35 + 0.25 * fract(lane * 0.618));
  vec2 xz = mix(base, tg * (1.0 - 0.55 * age), smoothstep(0.08, 0.6, age));
  xz += vec2(sin(T * 5.1 + lane * 1.7 + age * 4.5), cos(T * 4.4 + lane * 2.3 + age * 3.8)) * 0.045 * age * power;
  xz += vec2(sin(T * 14.0 + seed.y * 21.0), cos(T * 12.0 + seed.w * 17.0)) * 0.008 * age;
  return orig + vec3(xz.x, h, xz.y);
}
vec3 letterP(float T, float age, vec4 L) {
  // la letra arde: cada partícula nace en el trazo y sube como una lengua corta que se enfría
  vec3 p = L.xyz + tgt * L.w;
  float lick = pow(age, 1.3) * (0.1 + 0.22 * seed.x) * L.w;
  p.y += lick;
  p.x += sin(T * 7.0 + seed.z * 40.0 + age * 5.0) * 0.03 * age * L.w;
  p.z += cos(T * 6.0 + seed.w * 40.0) * 0.02 * L.w;
  return p;
}
vec3 posAt(float T, vec4 LA, vec4 LB, out float age, out float f, out float ht, out float lw) {
  float r = grp < 0.5 ? 1.15 + seed.x * 0.9 : 1.7 + seed.x * 1.3;
  age = fract(T * r + seed.y * 7.31);
  vec3 p = flameP(T, age);
  f = 0.0; ht = 1.0; lw = 0.3;
  if (grp > 0.5) {
    vec4 L = grp < 1.5 ? LA : LB; float fm = grp < 1.5 ? form.x : form.y; ht = grp < 1.5 ? heat.x : heat.y; lw = L.w;
    f = clamp((fm - seed.w * 0.35) / 0.65, 0.0, 1.0); f = f * f * (3.0 - 2.0 * f);
    if (f > 0.0) { vec3 q = letterP(T, age, L); vec3 m = mix(p, q, f); m.y += sin(3.14159 * f) * 0.25 * max(L.w, 0.1); p = m; }
  }
  return p;
}
void main(){
  float ag, f, ht, lw, ag2, f2, ht2, lw2;
  vec3 P = posAt(time, L0, L1, ag, f, ht, lw);
  vec3 P2 = posAt(time - dtp, L0p, L1p, ag2, f2, ht2, lw2);
  if (ag2 > ag) P2 = P;
  vec4 a = VP * vec4(P, 1.), b = PVP * vec4(P2, 1.);
  float vis = mix(power, 1.0, f) * ht;
  if (a.w < 0.015 || b.w < 0.008 || vis < 0.003) { gl_Position = vec4(0.,0.,-2.,1.); vA = 0.; vS = 0.; vT = 0.; vLen = 0.; vC = vec3(0.); return; }
  vec2 pa = a.xy / a.w * res * 0.5, pb = b.xy / b.w * res * 0.5;
  vec2 d = pb - pa; float L = min(length(d), 520.0);
  vec2 dir = L > 0.01 ? normalize(d) : vec2(1., 0.); vec2 nr = vec2(-dir.y, dir.x);
  float wf = size * (0.55 + 0.8 * seed.x) * (0.45 + 0.9 * ag) * (1.0 - smoothstep(0.75, 1.0, ag) * 0.5);
  float wl = lsize * lw * (0.55 + 0.6 * seed.x) * (0.8 + 0.7 * ag);
  float sz = clamp(mix(wf, wl, f) * ppu / a.w, 1.0, 85.0);
  vec2 px = (corner.x > 0.5 ? pa - dir * sz : pa + dir * (L + sz)) + nr * corner.y * sz;
  gl_Position = vec4(px / (res * 0.5) * a.w, a.z, a.w);
  #include <logdepthbuf_vertex>
  vec3 c0 = vec3(1.0, 0.78, 0.38), c1 = vec3(1.0, 0.38, 0.06), c2 = vec3(0.55, 0.06, 0.01);
  vec3 cf = ag < 0.25 ? mix(c0, c1, ag / 0.25) : mix(c1, c2, (ag - 0.25) / 0.75);
  vec3 cl = ag < 0.3 ? mix(vec3(1.0, 0.82, 0.45), vec3(1.0, 0.45, 0.08), ag / 0.3) : mix(vec3(1.0, 0.45, 0.08), vec3(0.6, 0.07, 0.01), (ag - 0.3) / 0.7);
  vC = mix(cf, cl, f);
  float fade = (1.0 - smoothstep(0.35, 1.0, ag)) * smoothstep(0.0, 0.05, ag);
  vA = bright * vis * mix(fade, (1.0 - smoothstep(0.25, 1.0, ag)) * 1.5, f) * (0.45 + 0.55 * seed.z) * clamp((2.0 * sz) / (L * 0.5 + 2.0 * sz), 0.35, 1.0);
  vS = corner.x > 0.5 ? -1.0 : (L / sz + 1.0); vT = corner.y; vLen = L / sz;
}`;
const FIRE_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
varying float vA; varying float vS; varying float vT; varying float vLen; varying vec3 vC;
void main(){
  #include <logdepthbuf_fragment>
  float ds = max(0., max(-vS, vS - vLen)), dist = length(vec2(ds, vT));
  float a = smoothstep(1.0, 0.0, dist); a = a * a * vA * mix(1.0, 0.25, clamp(vS / max(vLen, 0.001), 0., 1.));
  if (a < 0.002) discard;
  gl_FragColor = vec4(vC * a, a);
}`;
// puntos dentro de una letra (canvas → muestreo), en unidades de altura 1, centrados
function glyphPoints(ch, n, sd) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.font = '900 236px Inter'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(ch, 128, 214);
  const d = g.getImageData(0, 0, 256, 256).data; let y0 = 256, y1 = 0;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (d[(y * 256 + x) * 4 + 3] > 128) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const hh = Math.max(1, y1 - y0), cy = (y0 + y1) / 2, out = new Float32Array(n * 3); let k = 0, i = 0;
  while (k < n && i < n * 400) { i++; const x = hash(i * 1.37 + sd) * 256, y = y0 + hash(i * 2.71 + sd * 3.1) * hh;
    if (d[(Math.floor(y) * 256 + Math.floor(x)) * 4 + 3] > 128) { out[k * 3] = (x - 128) / hh; out[k * 3 + 1] = (cy - y) / hh; out[k * 3 + 2] = (hash(i * 5.3 + sd) - 0.5) * 0.08; k++; } }
  return out;
}
function buildFire(o) {
  const n0 = o.n0, nl = o.nl, N = n0 + 2 * nl;
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
  g.setAttribute('corner', new THREE.Float32BufferAttribute([1, -1, 1, 1, 0, -1, 0, 1], 2));
  g.setIndex([0, 2, 1, 2, 3, 1]);
  const sd = new Float32Array(N * 4), tg = new Float32Array(N * 3), gr = new Float32Array(N);
  for (let i = 0; i < N * 4; i++) sd[i] = hash(i * 0.731 + 11.3);
  const pv = glyphPoints('V', nl, 1), pf = glyphPoints('F', nl, 2);
  for (let i = 0; i < nl; i++) { const a = n0 + i, b = n0 + nl + i; gr[a] = 1; gr[b] = 2; for (let c = 0; c < 3; c++) { tg[a * 3 + c] = pv[i * 3 + c]; tg[b * 3 + c] = pf[i * 3 + c]; } }
  g.setAttribute('seed', new THREE.InstancedBufferAttribute(sd, 4)); g.setAttribute('tgt', new THREE.InstancedBufferAttribute(tg, 3)); g.setAttribute('grp', new THREE.InstancedBufferAttribute(gr, 1));
  g.instanceCount = N;
  const m = new THREE.ShaderMaterial({ vertexShader: FIRE_VS, fragmentShader: FIRE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { VP: { value: new THREE.Matrix4() }, PVP: { value: new THREE.Matrix4() }, res: { value: new THREE.Vector2(W, H) }, ppu: { value: 1000 }, time: { value: 0 }, dtp: { value: 1 / 36 },
      size: { value: o.size }, lsize: { value: o.lsize }, bright: { value: o.bright }, orig: { value: o.orig.clone() }, rad: { value: o.rad }, hgt: { value: o.hgt }, power: { value: 1 },
      L0: { value: new THREE.Vector4(0, 0, 0, 0.3) }, L1: { value: new THREE.Vector4(0, 0, 0, 0.3) }, L0p: { value: new THREE.Vector4(0, 0, 0, 0.3) }, L1p: { value: new THREE.Vector4(0, 0, 0, 0.3) }, form: { value: new THREE.Vector2(0, 0) }, heat: { value: new THREE.Vector2(1, 1) } } });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.layers.set(1); mesh.renderOrder = 3; scene.add(mesh);
  return { mesh, u: m.uniforms };
}
function fireUpdate(F, t, VP, PVP) {
  const u = F.u; u.VP.value.copy(VP); u.PVP.value.copy(PVP); u.time.value = t;
  u.ppu.value = H * 0.5 / Math.tan(cam.fov * Math.PI / 360);
}
// ---------------------------------------------------------------- «Bomberados IA»: piezas
const GOLD = 0xf2b233, EMB = 0xff7a2f, RED = 0xe0453a, TEA = 0x2fc7b6;
const CGold = new THREE.Color(2.0, 1.25, 0.3), CRed = new THREE.Color(1.9, 0.25, 0.2), CTe = new THREE.Color(0.25, 1.6, 1.45);
const plasticS = (c, r = 0.28) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.05 });
const metalS = (c, r = 0.25) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 1 });
const SANS = '"Inter", "SpaceMono", sans-serif';
const PZ = v3(0, 0, 0);            // la sartén (y la respuesta)
const DZ = v3(8, 0, -14);          // la mesa de estudio
const DY = 0.742;                  // altura del tablero de la mesa
function signPlane(txt, { w = 1, h = 0.25, col = '#EEF2F6', bg = null, size = 0.62, font = SANS, weight = 900, ls = 0 } = {}) {
  const tw = 1024, th = Math.round(1024 * h / w);
  const tex = canvasTex(tw, th, (g, W2, H2) => { if (bg) { g.fillStyle = bg; rr(g, 4, 4, W2 - 8, H2 - 8, H2 * 0.18); g.fill(); }
    let px = Math.round(H2 * size); g.letterSpacing = ls + 'px'; g.font = `${weight} ${px}px ${font}`; const mw = g.measureText(txt).width; if (mw > W2 * 0.92) { px = Math.floor(px * W2 * 0.92 / mw); g.font = `${weight} ${px}px ${font}`; }
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W2 / 2, H2 / 2 + H2 * 0.04); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 6; return m;
}
function helmet(col) {
  const g = new THREE.Group(), m = plasticS(col, 0.22);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.scale.set(1, 0.95, 1.12); dome.castShadow = true; g.add(dome);
  const prof = []; for (let i = 0; i <= 10; i++) { const u = i / 10; prof.push(new THREE.Vector2(0.128 + u * 0.075, -0.004 - u * u * 0.02)); }
  const brim = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, side: THREE.DoubleSide })); brim.scale.set(1, 1, 1.18); brim.castShadow = true; g.add(brim);
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.011, 8, 40, Math.PI), m); ridge.rotation.y = Math.PI / 2; ridge.scale.set(1, 0.95, 1.12); g.add(ridge);
  const badge = rbox(0.06, 0.07, 0.012, metalS(0xd9dde3, 0.4), 0.012); badge.position.set(0, 0.075, 0.138); badge.rotation.x = -0.45; g.add(badge);
  return g;
}
const stdTex = (map, r = 0.6, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: r, ...o });

// ---------------------------------------------------------------- la sartén en el fogón
function buildPan() {
  const G = new THREE.Group(); G.position.copy(PZ); scene.add(G);
  const iron = plasticS(0x1b1c1f, 0.55);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.009, 8, 56), iron); ring.rotation.x = Math.PI / 2; ring.position.y = 0.03; ring.castShadow = true; G.add(ring);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; const b = rbox(0.12, 0.014, 0.016, iron, 0.005); b.position.set(Math.cos(a) * 0.115, 0.034, -Math.sin(a) * 0.115); b.rotation.y = a; G.add(b); }
  const burner = cyl(0.05, 0.056, 0.02, metalS(0x3a3c40, 0.4), 32); burner.position.y = 0.01; G.add(burner);
  const gas = new THREE.Mesh(new THREE.TorusGeometry(0.054, 0.006, 6, 40), basicGlow(new THREE.Color(0.25, 0.55, 2.4))); gas.rotation.x = Math.PI / 2; gas.position.y = 0.024; G.add(gas);
  const prof = [[0, 0], [0.112, 0], [0.126, 0.004], [0.141, 0.03], [0.153, 0.055], [0.157, 0.059], [0.149, 0.059], [0.136, 0.033], [0.119, 0.009], [0, 0.009]].map(([x, y]) => new THREE.Vector2(x, y));
  const pan = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), new THREE.MeshStandardMaterial({ color: 0x26272b, roughness: 0.36, metalness: 0.75, side: THREE.DoubleSide }));
  pan.position.y = 0.04; pan.castShadow = true; pan.receiveShadow = true; G.add(pan);
  const handle = rbox(0.21, 0.026, 0.032, plasticS(0x111214, 0.45), 0.012); handle.position.set(0.255, 0.098, 0); handle.rotation.z = 0.16; G.add(handle);
  const rivet = rbox(0.04, 0.03, 0.036, metalS(0x6a6d72, 0.3), 0.01); rivet.position.set(0.158, 0.085, 0); rivet.rotation.z = 0.16; G.add(rivet);
  const oilT = canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(128, 128, 4, 128, 128, 128); r.addColorStop(0, '#fff2b0'); r.addColorStop(0.45, '#ffb238'); r.addColorStop(0.85, '#e0560f'); r.addColorStop(1, '#8a2405'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  const oil = new THREE.Mesh(new THREE.CircleGeometry(0.13, 56), new THREE.MeshBasicMaterial({ map: oilT, color: new THREE.Color(1.6, 1.25, 1.0), toneMapped: false }));
  oil.rotation.x = -Math.PI / 2; oil.position.y = 0.052; G.add(oil);
  return { G, oil, gas };
}

// ---------------------------------------------------------------- la habitación: suelo, pared con ventana, mesa, silla, flexo, estantería, reloj
function woodTex(w, h, base, n, seed, alphaEdge = false) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { const y = hash(i * 3.3 + seed) * h, a = 0.05 + hash(i * 7.1 + seed) * 0.12; g.strokeStyle = `rgba(30,16,6,${a})`; g.lineWidth = 1 + hash(i * 1.9) * 3; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 6 + Math.sin(x * 0.037 + i * 2.3) * 2); g.stroke(); }
    if (alphaEdge) { const r = g.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.52); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = r; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; }
  });
}
function skyTex(night) {
  return canvasTex(512, 512, (g, w, h) => {
    const r = g.createLinearGradient(0, 0, 0, h);
    if (!night) { r.addColorStop(0, '#5a6fa8'); r.addColorStop(0.45, '#e58a5a'); r.addColorStop(0.75, '#ffc27a'); r.addColorStop(1, '#ffdca0'); }
    else { r.addColorStop(0, '#05070f'); r.addColorStop(0.6, '#0e1a33'); r.addColorStop(1, '#1d2d52'); }
    g.fillStyle = r; g.fillRect(0, 0, w, h);
    if (night) for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + hash(i) * 0.6})`; g.fillRect(hash(i * 3.1) * w, hash(i * 5.7) * h * 0.55, 2, 2); }
    // edificios a contraluz con ventanas encendidas
    for (let i = 0; i < 9; i++) { const bx = i * 60 - 10 + hash(i * 2.2) * 20, bw = 50 + hash(i * 4.4) * 30, bh = 90 + hash(i * 6.6) * 140;
      g.fillStyle = night ? '#060912' : '#3a2a3a'; g.fillRect(bx, h - bh, bw, bh);
      if (night) for (let k = 0; k < 18; k++) if (hash(i * 31 + k) > 0.45) { g.fillStyle = hash(k * 1.3 + i) > 0.5 ? '#ffcf7a' : '#fff1c9'; g.fillRect(bx + 6 + (k % 3) * 15, h - bh + 10 + Math.floor(k / 3) * 22, 7, 9); } }
  });
}
function buildRoom() {
  const R = new THREE.Group(); R.position.copy(DZ); scene.add(R);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.6), stdTex(woodTex(1024, 1024, '#5b3d27', 70, 1, true), 0.5, { transparent: true }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.003, 0.35); floor.receiveShadow = true; R.add(floor);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(0.9, 48), plasticS(0x3b2f3a, 0.95)); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.006, 0.45); rug.receiveShadow = true; R.add(rug);
  // pared con ventana (hueco de 0,9 × 1,0 m)
  const wallM = plasticS(0x2b313b, 0.92), wz = -0.75, wx0 = -0.4, wx1 = 0.5, wy0 = 0.98, wy1 = 1.98;
  const wpart = (x0, x1, y0, y1) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.08), wallM); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, wz); b.castShadow = true; b.receiveShadow = true; R.add(b); };
  wpart(-1.8, wx0, 0, 2.7); wpart(wx1, 1.8, 0, 2.7); wpart(wx0, wx1, 0, wy0); wpart(wx0, wx1, wy1, 2.7);
  const frM = plasticS(0xe9e6df, 0.5);
  for (const [w, h, x, y] of [[0.94, 0.05, 0.05, wy0], [0.94, 0.05, 0.05, wy1], [0.05, 1.04, wx0, 1.48], [0.05, 1.04, wx1, 1.48], [0.03, 1.0, 0.05, 1.48], [0.9, 0.03, 0.05, 1.48]]) { const f = rbox(w, h, 0.1, frM, 0.01); f.position.set(x, y, wz + 0.01); R.add(f); }
  const sill = rbox(1.05, 0.035, 0.18, frM, 0.01); sill.position.set(0.05, wy0 - 0.02, wz + 0.08); R.add(sill);
  const skyA = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), new THREE.MeshBasicMaterial({ map: skyTex(false), toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.25) }));
  const skyB = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), new THREE.MeshBasicMaterial({ map: skyTex(true), toneMapped: false, transparent: true, opacity: 0 }));
  skyA.position.set(0.05, 1.5, wz - 0.45); skyB.position.set(0.05, 1.5, wz - 0.44); R.add(skyA, skyB);
  // mesa
  const top = rbox(1.4, 0.035, 0.72, stdTex(woodTex(1024, 512, '#7a5236', 60, 2), 0.45), 0.012); top.position.set(0, DY - 0.018, 0); R.add(top);
  for (const [x, z] of [[-0.66, -0.31], [0.66, -0.31], [-0.66, 0.31], [0.66, 0.31]]) { const l = cyl(0.016, 0.016, DY - 0.035, plasticS(0x15161a, 0.4), 12); l.position.set(x, (DY - 0.035) / 2, z); R.add(l); }
  // silla
  const chM = plasticS(0x1f2329, 0.8);
  const seat = rbox(0.46, 0.06, 0.44, chM, 0.025); seat.position.set(0, 0.43, 0.6); R.add(seat);
  const back = rbox(0.44, 0.48, 0.05, chM, 0.03); back.position.set(0, 0.8, 0.83); back.rotation.x = -0.12; R.add(back);
  const col = cyl(0.025, 0.025, 0.36, metalS(0x2c2e33, 0.3), 16); col.position.set(0, 0.22, 0.6); R.add(col);
  for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283, leg = rbox(0.26, 0.025, 0.04, chM, 0.01); leg.position.set(Math.cos(a) * 0.12, 0.04, 0.6 + Math.sin(a) * 0.12); leg.rotation.y = -a; R.add(leg); }
  // flexo
  const lamp = new THREE.Group(); lamp.position.set(-0.56, DY, -0.24); R.add(lamp);
  const lm = plasticS(0x1c1d21, 0.35);
  const lb = cyl(0.075, 0.08, 0.022, lm, 32); lb.position.y = 0.011; lamp.add(lb);
  const a1 = cyl(0.009, 0.009, 0.36, metalS(0x8c939d, 0.3), 10); a1.position.set(0, 0.18, 0.04); a1.rotation.x = -0.22; lamp.add(a1);
  const a2 = cyl(0.009, 0.009, 0.3, metalS(0x8c939d, 0.3), 10); a2.position.set(0.06, 0.37, 0.16); a2.rotation.set(1.05, 0, -0.35); lamp.add(a2);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x1c1d21, roughness: 0.35, side: THREE.DoubleSide }));
  shade.position.set(0.13, 0.43, 0.29); shade.rotation.set(-0.5, 0, 0.55); shade.castShadow = true; lamp.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.18, 0.15), toneMapped: false })); bulb.position.set(0.15, 0.4, 0.31); lamp.add(bulb);
  // estantería con el casco (el sueño) y libros; reloj de pared; calendario con días tachados
  const shelf = rbox(0.7, 0.03, 0.2, stdTex(woodTex(512, 256, '#6a4a32', 30, 5), 0.5), 0.008); shelf.position.set(-1.0, 1.55, wz + 0.11); R.add(shelf);
  const hm = helmet(GOLD); hm.scale.setScalar(0.85); hm.position.set(-1.12, 1.6, wz + 0.12); hm.rotation.y = 0.5; R.add(hm);
  for (let i = 0; i < 4; i++) { const b = rbox(0.035, 0.2 + hash(i) * 0.05, 0.15, plasticS([0x8c2a24, 0x23476b, 0x6b5a2f, 0x2f6b5a][i], 0.6), 0.006); b.position.set(-0.85 + i * 0.045, 1.67, wz + 0.11); R.add(b); }
  const clock = new THREE.Group(); clock.position.set(0.95, 1.78, wz + 0.05); R.add(clock);
  const cf = new THREE.Mesh(new THREE.CircleGeometry(0.13, 48), stdTex(canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f2efe8'; g.beginPath(); g.arc(128, 128, 128, 0, 7); g.fill();
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.strokeStyle = '#1b1f27'; g.lineWidth = 6; g.beginPath(); g.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); g.lineTo(128 + Math.sin(a) * 118, 128 - Math.cos(a) * 118); g.stroke(); } }), 0.5));
  clock.add(cf); const crim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 10, 48), plasticS(0x15161a, 0.4)); clock.add(crim);
  const hh = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.004), plasticS(0x15161a, 0.4)); hh.geometry.translate(0, 0.03, 0); hh.position.z = 0.006; clock.add(hh);
  const mh = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.105, 0.004), plasticS(0x15161a, 0.4)); mh.geometry.translate(0, 0.045, 0); mh.position.z = 0.009; clock.add(mh);
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), stdTex(canvasTex(340, 420, (g, w, h) => { g.fillStyle = '#efece5'; g.fillRect(0, 0, w, h); g.fillStyle = '#c2453a'; g.fillRect(0, 0, w, 70);
    g.fillStyle = '#fff'; g.font = '900 34px Inter'; g.textAlign = 'center'; g.fillText('OPOSICIÓN', w / 2, 48);
    for (let i = 0; i < 35; i++) { const x = 20 + (i % 7) * 43, y = 95 + Math.floor(i / 7) * 62; g.strokeStyle = '#b9b4aa'; g.lineWidth = 2; g.strokeRect(x, y, 38, 54);
      if (i < 23) { g.strokeStyle = '#d0392b'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 6, y + 8); g.lineTo(x + 32, y + 46); g.moveTo(x + 32, y + 8); g.lineTo(x + 6, y + 46); g.stroke(); } } }), 0.8));
  cal.position.set(0.98, 1.3, wz + 0.045); R.add(cal);
  // pósits en la pared
  const pc = [0xffd84a, 0xff9c6b, 0x8fe3c9, 0xffd84a, 0xf7f3a0];
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.075), plasticS(pc[i], 0.8)); p.position.set(-0.62 + (i % 3) * 0.085, 1.15 + Math.floor(i / 3) * 0.1, wz + 0.042); p.rotation.z = (hash(i * 3.3) - 0.5) * 0.3; R.add(p); }
  const mug = new THREE.Group(); mug.position.set(0.52, DY, 0.02); R.add(mug);
  const mb = cyl(0.04, 0.036, 0.095, plasticS(0xe9e6df, 0.35), 32); mb.position.y = 0.048; mug.add(mb);
  const mh2 = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 20), plasticS(0xe9e6df, 0.35)); mh2.position.set(0.045, 0.05, 0); mug.add(mh2);
  const pen = cyl(0.0045, 0.0045, 0.14, plasticS(0x1d5fbf, 0.3), 10); pen.rotation.set(0, 0.6, Math.PI / 2); pen.position.set(0.34, DY + 0.005, 0.24); R.add(pen);
  return { R, skyA, skyB, bulb, clock: { hh, mh }, lamp };
}

// ---------------------------------------------------------------- el opositor: figura articulada «de animación», sentada
function makePerson() {
  const P = new THREE.Group(), J = {};
  const skin = plasticS(0xd09a7c, 0.55), hood = plasticS(0x2e3746, 0.88), jean = plasticS(0x394559, 0.8), hair = plasticS(0x22160e, 0.72), shoe = plasticS(0xeceae4, 0.55), dark = plasticS(0x15110d, 0.3);
  const cap = (r, h, m) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 8, 20), m); c.castShadow = true; c.receiveShadow = true; return c; };
  const sp = (r, m, ws = 24, hs = 16) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), m); s.castShadow = true; s.receiveShadow = true; return s; };
  const piv = (par, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); par.add(g); return g; };
  J.hips = piv(P, 0, 0.5, 0);
  const pelvis = sp(0.16, jean); pelvis.scale.set(1.05, 0.62, 0.85); J.hips.add(pelvis);
  J.spine = piv(J.hips, 0, 0.05, 0);
  const torso = cap(0.15, 0.25, hood); torso.position.y = 0.2; torso.scale.set(1.12, 1, 0.74); J.spine.add(torso);
  const belly = sp(0.14, hood); belly.scale.set(1.08, 0.75, 0.82); belly.position.set(0, 0.06, -0.01); J.spine.add(belly);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.032, 12, 32), hood); collar.rotation.x = Math.PI / 2; collar.position.set(0, 0.42, 0.005); J.spine.add(collar);
  const hoodB = sp(0.11, hood); hoodB.scale.set(1.15, 0.72, 0.55); hoodB.position.set(0, 0.42, 0.085); J.spine.add(hoodB);
  for (const sd of [-1, 1]) { const st = cyl(0.004, 0.004, 0.12, plasticS(0xd8d4cc, 0.6), 6); st.position.set(sd * 0.03, 0.36, -0.105); st.rotation.x = 0.15; J.spine.add(st); }
  J.neck = piv(J.spine, 0, 0.44, 0);
  const neck = cyl(0.042, 0.046, 0.1, skin, 16); neck.position.y = 0.03; J.neck.add(neck);
  J.head = piv(J.neck, 0, 0.07, 0);
  const head = sp(0.1, skin, 32, 24); head.scale.set(0.9, 1.1, 1.0); head.position.set(0, 0.1, -0.005); J.head.add(head);
  const jaw = sp(0.075, skin); jaw.scale.set(0.82, 0.62, 0.88); jaw.position.set(0, 0.045, -0.03); J.head.add(jaw);
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.107, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.56), hair); hairTop.scale.set(0.95, 1.06, 1.06); hairTop.position.set(0, 0.112, 0.008); hairTop.rotation.x = 0.32; hairTop.castShadow = true; J.head.add(hairTop);
  const hairBack = sp(0.1, hair); hairBack.scale.set(0.97, 0.9, 0.9); hairBack.position.set(0, 0.105, 0.022); J.head.add(hairBack);
  const fringe = cap(0.03, 0.1, hair); fringe.rotation.z = Math.PI / 2 + 0.25; fringe.position.set(-0.01, 0.185, -0.075); fringe.scale.set(1, 1, 0.7); J.head.add(fringe);
  for (const sd of [-1, 1]) {
    const ear = sp(0.022, skin, 12, 10); ear.scale.set(0.45, 1, 0.8); ear.position.set(sd * 0.091, 0.095, 0.0); J.head.add(ear);
    const eye = sp(0.0115, dark, 12, 10); eye.position.set(sd * 0.034, 0.112, -0.093); J.head.add(eye);
    const br = cap(0.0055, 0.028, hair); br.rotation.z = Math.PI / 2 - sd * 0.12; br.position.set(sd * 0.036, 0.138, -0.094); J.head.add(br);
  }
  const nose = cap(0.011, 0.018, skin); nose.rotation.x = 0.35; nose.position.set(0, 0.085, -0.103); J.head.add(nose);
  const lips = cap(0.005, 0.022, plasticS(0xa86a5a, 0.5)); lips.rotation.z = Math.PI / 2; lips.position.set(0, 0.048, -0.09); J.head.add(lips);
  for (const sd of [-1, 1]) {
    const sh = piv(J.spine, sd * 0.2, 0.37, 0); const ua = cap(0.05, 0.2, hood); ua.position.y = -0.13; sh.add(ua);
    const el = piv(sh, 0, -0.28, 0); const fa = cap(0.043, 0.17, hood); fa.position.y = -0.11; el.add(fa);
    const cuff = cyl(0.038, 0.038, 0.03, plasticS(0x252c38, 0.9), 16); cuff.position.y = -0.225; el.add(cuff);
    const wr = piv(el, 0, -0.25, 0);
    const palm = sp(0.04, skin, 20, 14); palm.scale.set(1.0, 1.15, 0.42); palm.position.y = -0.045; wr.add(palm);
    for (let f = 0; f < 4; f++) { const fg = cap(0.0085, 0.032 + (f === 1 || f === 2 ? 0.006 : 0), skin); fg.position.set((f - 1.5) * 0.017, -0.098, -0.006); fg.rotation.x = 0.45; wr.add(fg); }
    const th = cap(0.01, 0.03, skin); th.position.set(-sd * 0.04, -0.045, -0.012); th.rotation.z = -sd * 0.6; wr.add(th);
    const hp = piv(J.hips, sd * 0.095, -0.02, 0); const ul = cap(0.07, 0.3, jean); ul.position.y = -0.2; hp.add(ul);
    const kn = piv(hp, 0, -0.42, 0); const ll = cap(0.055, 0.32, jean); ll.position.y = -0.2; kn.add(ll);
    const an = piv(kn, 0, -0.43, 0); const sh2 = rbox(0.1, 0.08, 0.27, shoe, 0.035); sh2.position.set(0, -0.025, -0.06); an.add(sh2);
    const sole = rbox(0.104, 0.02, 0.274, plasticS(0x9a9a96, 0.7), 0.008); sole.position.set(0, -0.062, -0.06); an.add(sole);
    const k = sd < 0 ? 'L' : 'R'; J['sh' + k] = sh; J['el' + k] = el; J['wr' + k] = wr; J['hp' + k] = hp; J['kn' + k] = kn; J['an' + k] = an;
  }
  P.userData.J = J; return P;
}
// posturas (rotaciones x, y, z de cada articulación) y mezcla entre ellas
const POSE = {
  read: { spine: [-0.34, 0, 0], neck: [-0.2, 0, 0], head: [-0.32, 0, 0], shL: [0.95, 0, 0.16], elL: [1.0, 0, 0], wrL: [0.15, 0, 0], shR: [0.95, 0, -0.16], elR: [1.0, 0, 0], wrR: [0.15, 0, 0] },
  lookL: { spine: [-0.3, 0.25, 0], neck: [-0.1, 0.2, 0], head: [-0.2, 0.35, 0], shL: [1.05, 0, 0.1], elL: [0.9, 0, 0], wrL: [0.2, 0, 0], shR: [0.85, 0, -0.18], elR: [1.1, 0, 0], wrR: [0.15, 0, 0] },
  flip: { spine: [-0.36, 0.1, 0], neck: [-0.15, 0, 0], head: [-0.38, 0.05, 0], shL: [0.9, 0, 0.2], elL: [1.05, 0, 0], wrL: [0.15, 0, 0], shR: [1.12, 0.3, -0.05], elR: [0.75, 0, 0], wrR: [0.3, 0, 0] },
  slump: { spine: [-0.78, 0, 0.04], neck: [-0.3, 0, 0], head: [-0.25, 0.1, 0.3], shL: [1.42, 0, 0.5], elL: [1.85, 0, 0], wrL: [0, 0, 0], shR: [1.42, 0, -0.5], elR: [1.85, 0, 0], wrR: [0, 0, 0] },
  shock: { spine: [-0.05, 0, 0], neck: [0.1, 0, 0], head: [0.05, 0, 0], shL: [0.75, 0, 0.12], elL: [1.25, 0, 0], wrL: [0.2, 0, 0], shR: [0.75, 0, -0.12], elR: [1.25, 0, 0], wrR: [0.2, 0, 0] },
  up: { spine: [-0.12, 0, 0], neck: [0.0, 0, 0], head: [-0.05, 0, 0], shL: [0.6, 0, 0.12], elL: [1.15, 0, 0], wrL: [0.2, 0, 0], shR: [0.75, 0, -0.12], elR: [0.95, 0, 0], wrR: [0.2, 0, 0] },
  mouse: { spine: [-0.2, -0.05, 0], neck: [-0.02, 0, 0], head: [-0.1, 0, 0], shL: [0.6, 0, 0.14], elL: [1.2, 0, 0], wrL: [0.2, 0, 0], shR: [0.88, -0.1, -0.3], elR: [0.7, 0, 0], wrR: [0.35, 0, 0] },
};
const LEGS = { hpL: [1.57, 0.05, 0.06], hpR: [1.57, -0.05, -0.06], knL: [-1.5, 0, 0], knR: [-1.5, 0, 0], anL: [-0.05, 0, 0], anR: [-0.05, 0, 0] };
function applyPose(J, keys, t) {
  // keys: [[t, 'pose'], …] → mezcla suave entre las dos posturas vecinas
  let i = 0; while (i < keys.length - 1 && t > keys[i + 1][0]) i++;
  const A = POSE[keys[i][1]], B = POSE[keys[Math.min(i + 1, keys.length - 1)][1]];
  const t0 = keys[i][0], t1 = keys[Math.min(i + 1, keys.length - 1)][0], d = Math.min(0.45, Math.max(0.01, t1 - t0));
  const w = t1 > t0 ? sm5(clamp((t - (t1 - d)) / d)) : 0;
  for (const j in A) { const a = A[j], b = B[j] || a; J[j].rotation.set(lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w)); }
  for (const j in LEGS) J[j].rotation.set(...LEGS[j]);
}

// ---------------------------------------------------------------- manuales: la torre, el libro abierto con páginas que pasan, pestañas
function pageTex(kind, seed, mirror = false) {
  return canvasTex(512, 720, (g, w, h) => {
    if (mirror) { g.translate(w, 0); g.scale(-1, 1); }      // dorso: se ve desde el otro lado
    g.fillStyle = '#f1ece1'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b1f27'; g.textAlign = 'left';
    if (kind === 'index') {
      g.font = '900 44px Inter'; g.fillText('ÍNDICE', 44, 86);
      const T = ['Combustión', 'Clases de fuego', 'Agentes extintores', 'Extintores', 'Hidráulica', 'Rescate', 'Construcción', 'Legislación', 'Primeros auxilios', 'Callejero'];
      g.font = '500 25px Inter'; T.forEach((s, i) => { g.fillStyle = '#1b1f27'; g.fillText(`${i + 1}. ${s}`, 44, 150 + i * 52); g.fillStyle = '#8c857a'; g.textAlign = 'right'; g.fillText(String(12 + i * 37 + Math.floor(hash(i + seed) * 9)), w - 44, 150 + i * 52); g.textAlign = 'left';
        g.fillStyle = 'rgba(0,0,0,.12)'; for (let x = 44 + g.measureText(`${i + 1}. ${s}`).width + 12; x < w - 100; x += 10) g.fillRect(x, 146 + i * 52, 3, 3); });
    } else {
      g.font = '900 30px Inter'; g.fillText(kind === 'fire' ? 'TEMA 2 · COMBUSTIÓN' : 'TEMA ' + (3 + Math.floor(hash(seed) * 9)), 44, 76);
      g.fillStyle = '#8c857a'; for (let i = 0; i < 26; i++) { if (kind === 'fire' && i > 7 && i < 17) continue; g.fillRect(44, 110 + i * 22, 340 + hash(i + seed * 7) * 80, 7); }
      if (kind === 'fire') { g.strokeStyle = '#c2453a'; g.lineWidth = 6; g.beginPath(); g.moveTo(256, 300); g.lineTo(150, 470); g.lineTo(362, 470); g.closePath(); g.stroke();
        g.fillStyle = '#1b1f27'; g.font = '700 17px Inter'; g.textAlign = 'center'; g.fillText('COMBUSTIBLE', 256, 500); g.fillText('CALOR', 120, 290); g.fillText('OXÍGENO', 392, 290); }
    }
    g.fillStyle = '#8c857a'; g.font = '700 20px SpaceMono'; g.textAlign = 'center'; g.fillText(String(30 + Math.floor(hash(seed * 3.7) * 300)), w / 2, h - 30);
  });
}
function spineTex(txt, col) {
  return canvasTex(512, 96, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(14, 10, 4, h - 20); g.fillRect(w - 18, 10, 4, h - 20);
    g.fillStyle = '#f4efe3'; g.font = '900 34px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; let px = 34; while (g.measureText(txt).width > w - 70 && px > 14) { px--; g.font = `900 ${px}px Inter`; } g.fillText(txt, w / 2, h / 2 + 2); });
}
function buildBooks(R) {
  const edgeT = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#eae3d4'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(120,108,90,.35)'; for (let y = 2; y < h; y += 3) g.fillRect(0, y, w, 1); });
  const edgeM = stdTex(edgeT, 0.9);
  const tower = new THREE.Group(); tower.position.set(-0.47, DY, 0.06); R.add(tower);
  const BK = [['MANUAL DE INCENDIOS', '#8c2a24'], ['RESCATE', '#23476b'], ['HIDRÁULICA', '#2f6b5a'], ['CONSTRUCCIÓN', '#6b5a2f'], ['LEGISLACIÓN', '#4a3a6b'], ['TEMARIO GENERAL', '#2b2f36']];
  let y = 0; const books = [];
  BK.forEach(([t, c], i) => { const th = 0.04 + hash(i * 1.7) * 0.02, cm = plasticS(new THREE.Color(c), 0.65);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, th, 0.25), [edgeM, cm, cm, cm, stdTex(spineTex(t, c), 0.6), edgeM]);
    b.castShadow = true; b.receiveShadow = true; b.position.set((hash(i * 4.1) - 0.5) * 0.02, y + th / 2, 0); b.rotation.y = (hash(i * 2.9) - 0.5) * 0.12; tower.add(b); books.push({ b, y0: y + th / 2, x0: b.position.x }); y += th; });
  // pestañas de colores (temas) que asoman por el lateral
  const tabs = []; const tc = [0xff5a4e, 0xffd84a, 0x62e3d4, 0xffffff, 0xff9c3b];
  for (let i = 0; i < 5; i++) { const tb = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.006, 0.034), plasticS(tc[i], 0.45)); tb.position.set(0.1, books[1 + (i % 4)].y0 + 0.008, -0.08 + i * 0.04); tower.add(tb); tabs.push(tb); }
  // el libro abierto delante del opositor
  const ob = new THREE.Group(); ob.position.set(-0.17, DY, 0.15); ob.rotation.y = 0.1; R.add(ob);
  const cover = rbox(0.37, 0.006, 0.26, plasticS(0x8c2a24, 0.6), 0.004); cover.position.y = 0.003; ob.add(cover);
  const pgM = stdTex(pageTex('fire', 1), 0.85), pgM2 = stdTex(pageTex('text', 2), 0.85);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.016, 0.245), [edgeM, edgeM, s < 0 ? pgM2 : pgM, edgeM, edgeM, edgeM]); st.position.set(s * 0.089, 0.014, 0); st.rotation.z = -s * 0.03; st.castShadow = true; st.receiveShadow = true; ob.add(st); }
  const PK = [['text', 3], ['index', 4], ['text', 5], ['fire', 6], ['text', 7], ['text', 8]], PT = PK.map(([k, s]) => pageTex(k, s)), PB = PK.map(([k, s]) => pageTex(k === 'index' ? 'text' : k, s + 20, true));
  const pages = []; for (let k = 0; k < 8; k++) { const geo = new THREE.PlaneGeometry(0.17, 0.24, 16, 1); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: PT[k % PT.length], roughness: 0.85, side: THREE.FrontSide })); m.castShadow = true; m.position.y = 0.023; m.frustumCulled = false; ob.add(m);
    const b = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: PB[k % PB.length], roughness: 0.85, side: THREE.BackSide })); b.position.y = 0.023; b.frustumCulled = false; ob.add(b);
    pages.push({ m, b, base: Float32Array.from(geo.attributes.position.array) }); }
  return { tower, books, tabs, ob, pages };
}
// dobla una página: θ = 0 (sobre la pila derecha) … π (sobre la izquierda); la punta va con retraso (curvatura)
function bendPage(pg, th) {
  const pos = pg.m.geometry.attributes.position, b = pg.base, n = 16, du = 0.17 / n, cs = [], ys = [];
  let x = 0, y = 0; for (let i = 0; i <= n; i++) { cs.push(x); ys.push(y); const ph = th - 0.95 * Math.sin(th) * Math.pow(i / n, 1.2); x += Math.cos(ph) * du; y += Math.sin(ph) * du; }
  for (let v = 0; v < pos.count; v++) { const u = b[v * 3] + 0.085, i = Math.round(u / du); pos.setXYZ(v, cs[i], ys[i] + 0.0004 * i * Math.sin(th), b[v * 3 + 2]); }
  pos.needsUpdate = true; pg.m.geometry.computeVertexNormals();
}

// ---------------------------------------------------------------- hojas sueltas (apuntes) que salen volando en remolino
function buildSheets(R) {
  const tex = [canvasTex(256, 360, (g, w, h) => { g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9fb6d6'; g.lineWidth = 2; for (let y = 40; y < h; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.strokeStyle = '#e07a7a'; g.beginPath(); g.moveTo(34, 0); g.lineTo(34, h); g.stroke();
      g.strokeStyle = '#2a3a8a'; g.lineWidth = 2.5; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(44, 56 + i * 20); for (let x = 44; x < 200 + hash(i) * 40; x += 8) g.lineTo(x, 56 + i * 20 + Math.sin(x * 0.4 + i) * 3); g.stroke(); } }),
    canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffd84a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a3020'; g.lineWidth = 5; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(30, 60 + i * 44); for (let x = 30; x < 210; x += 10) g.lineTo(x, 60 + i * 44 + Math.sin(x * 0.3 + i) * 4); g.stroke(); } }),
    pageTex('text', 9), pageTex('fire', 10)];
  const dims = [[0.1, 0.14], [0.07, 0.07], [0.1, 0.14], [0.1, 0.14]], per = 34, sets = [];
  const backC = [0xeeeae0, 0xf2cf45, 0xeeeae0, 0xeeeae0];
  tex.forEach((t, k) => { const geo = new THREE.PlaneGeometry(...dims[k]);
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.FrontSide }), per);
    const mb = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: backC[k], roughness: 0.9, side: THREE.BackSide }), per);
    m.castShadow = true; m.frustumCulled = false; mb.frustumCulled = false; mb.instanceMatrix = m.instanceMatrix; R.add(m, mb); sets.push(m); m.userData.back = mb; });
  const P = []; for (let i = 0; i < 4 * per; i++) P.push({ a0: hash(i * 1.3) * 6.283, r1: 0.35 + hash(i * 2.1) * 0.75, h1: 0.25 + hash(i * 3.7) * 1.1, sp: 2.2 + hash(i * 4.9) * 2.4, d: hash(i * 5.3) * 0.5,
    tx: hash(i * 6.1) * 6.283, ty: hash(i * 7.7) * 6.283, fx: (hash(i * 8.3) - 0.5) * 2.6, fz: 0.2 + (hash(i * 9.1) - 0.3) * 1.8, fr: hash(i * 9.7) * 6.283 });
  return { sets, P, per };
}

// ---------------------------------------------------------------- hoja de respuestas (31-45, V/F) y la plantilla transparente encima
const SH_W = 0.21, SH_H = 0.297, ROW0 = 31, NROW = 15;
const ANS = []; for (let i = 0; i < NROW; i++) ANS.push(ROW0 + i === 37 ? -1 : (hash(i * 5.1) < 0.5 ? 0 : 1));
const rowY = i => 330 + i * 64;                 // y del renglón i en el lienzo de 600 × 848
const bubX = o => 330 + o * 120;                // x de la burbuja V (0) o F (1)
function answerTex() {
  return canvasTex(600, 848, (g, w, h) => {
    g.fillStyle = '#f3f0e9'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b1f27'; g.font = '900 34px Inter'; g.textAlign = 'left'; g.fillText('HOJA DE RESPUESTAS', 40, 74);
    g.font = '500 20px Inter'; g.fillStyle = '#5c636d'; g.fillText('EXAMEN TEÓRICO · VERDADERO / FALSO', 40, 110);
    g.fillStyle = '#c9c3b6'; g.fillRect(40, 132, w - 80, 3);
    g.font = '700 22px SpaceMono'; g.fillStyle = '#5c636d'; g.textAlign = 'center'; g.fillText('V', bubX(0), 290); g.fillText('F', bubX(1), 290);
    for (let i = 0; i < NROW; i++) { const y = rowY(i);
      g.fillStyle = '#1b1f27'; g.font = '700 26px SpaceMono'; g.textAlign = 'left'; g.fillText(String(ROW0 + i), 120, y + 9);
      for (let o = 0; o < 2; o++) { g.strokeStyle = '#7a7468'; g.lineWidth = 3; g.beginPath(); g.arc(bubX(o), y, 21, 0, 7); g.stroke();
        if (ANS[i] === o) { g.fillStyle = '#2a2d33'; g.beginPath(); g.arc(bubX(o) + (hash(i) - 0.5) * 3, y + (hash(i * 2) - 0.5) * 3, 16, 0, 7); g.fill(); } } }
    g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(100, rowY(6) - 30, 400, 60);
  });
}
function plantillaTex(prog) {         // marcas de la plantilla (✓ verde, ✗ rojo en la 37) hasta el renglón «prog»
  return (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(200,235,255,.10)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(160,210,255,.55)'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = 'rgba(120,180,230,.9)'; g.font = '700 22px SpaceMono'; g.textAlign = 'right'; g.fillText('PLANTILLA', w - 30, 60);
    for (let i = 0; i < NROW; i++) { if (i >= prog || ROW0 + i === 37) continue; const y = rowY(i);
      g.strokeStyle = '#1f9d55'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(470, y); g.lineTo(486, y + 16); g.lineTo(516, y - 16); g.stroke(); }
  };
}
function buildSheet(R) {
  const G = new THREE.Group(); G.position.set(0.17, DY + 0.0015, 0.17); G.rotation.y = -0.1; R.add(G);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(SH_W, SH_H), stdTex(answerTex(), 0.85)); paper.rotation.x = -Math.PI / 2; paper.receiveShadow = true; G.add(paper);
  const plt = canvasTex(600, 848, plantillaTex(0)), ov = new THREE.Group(); G.add(ov);
  const ovm = new THREE.Mesh(new THREE.PlaneGeometry(SH_W, SH_H), new THREE.MeshBasicMaterial({ map: plt, transparent: true, depthWrite: false })); ovm.rotation.x = -Math.PI / 2; ovm.position.y = 0.0012; ovm.renderOrder = 5; ov.add(ovm);
  // la V de la 37 (la que pone el opositor: la del fuego) y la ✗ roja
  const xy = (cx, cy) => v3((cx / 600 - 0.5) * SH_W, 0, (cy / 848 - 0.5) * SH_H);
  const vMark = new THREE.Mesh(new THREE.CircleGeometry(0.0075, 24), new THREE.MeshBasicMaterial({ color: 0x2a2d33 })); vMark.rotation.x = -Math.PI / 2; vMark.position.copy(xy(bubX(0), rowY(6))).add(v3(0, 0.0008, 0)); G.add(vMark);
  const xT = canvasTex(256, 256, (g, w, h) => { g.strokeStyle = '#ff3b30'; g.lineWidth = 30; g.lineCap = 'round'; g.beginPath(); g.moveTo(50, 50); g.lineTo(206, 206); g.moveTo(206, 50); g.lineTo(50, 206); g.stroke(); });
  const xMark = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), new THREE.MeshBasicMaterial({ map: xT, transparent: true, depthWrite: false, color: new THREE.Color(1.6, 1.0, 1.0), toneMapped: false })); xMark.rotation.x = -Math.PI / 2; xMark.position.copy(xy(500, rowY(6))).add(v3(0, 0.0025, 0)); xMark.renderOrder = 7; G.add(xMark);
  return { G, ov, plt, vMark, xMark, xy, bubV: () => G.localToWorld(xy(bubX(0), rowY(6))), row37: () => G.localToWorld(xy(330, rowY(6))) };
}

// ---------------------------------------------------------------- el portátil: tapa con bisagra, pantalla, ventana de la app, cursor, tarjetas de la IA
const AW = 0.118, AH = 0.182, APX = 900 / AW;     // ventana de la app en la pantalla (m) y píxeles por metro del lienzo
function buildLaptop(R) {
  const L = new THREE.Group(); L.position.set(0.05, DY, -0.12); R.add(L);
  const alu = new THREE.MeshStandardMaterial({ color: 0xa3a8ae, roughness: 0.32, metalness: 0.85 });
  const base = rbox(0.34, 0.016, 0.235, alu, 0.01); base.position.y = 0.008; L.add(base);
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.1), stdTex(canvasTex(512, 180, (g, w, h) => { g.fillStyle = '#1a1c20'; g.fillRect(0, 0, w, h); g.fillStyle = '#2c2f35';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) { rr(g, 6 + c * 36, 6 + r * 34, 30, 28, 4); g.fill(); } }), 0.6));
  kb.rotation.x = -Math.PI / 2; kb.position.set(0, 0.0165, -0.03); L.add(kb);
  const tp = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.06), plasticS(0x8e939a, 0.25)); tp.rotation.x = -Math.PI / 2; tp.position.set(0, 0.0166, 0.07); L.add(tp);
  const lid = new THREE.Group(); lid.position.set(0, 0.016, -0.1175); L.add(lid);
  const shell = rbox(0.34, 0.008, 0.235, alu, 0.008); shell.position.set(0, 0.004, 0.1175); lid.add(shell);
  const scr = new THREE.Group(); scr.position.set(0, -0.0006, 0.1175); scr.rotation.x = Math.PI / 2; lid.add(scr);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(0.332, 0.226), new THREE.MeshBasicMaterial({ color: 0x050607 })); scr.add(bezel);
  const desk = canvasTex(1024, 640, (g, w, h) => { const r = g.createLinearGradient(0, 0, w, h); r.addColorStop(0, '#141a26'); r.addColorStop(1, '#2a1b16'); g.fillStyle = r; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,140,60,${0.05 + hash(i) * 0.08})`; g.beginPath(); g.arc(hash(i * 3.3) * w, hash(i * 5.5) * h, 20 + hash(i * 7.7) * 90, 0, 7); g.fill(); } });
  const dispM = new THREE.MeshBasicMaterial({ map: desk, color: new THREE.Color(0, 0, 0), toneMapped: false });
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.195), dispM); disp.position.z = 0.0003; scr.add(disp);
  const appT = canvasTex(900, Math.round(AH * APX)); appT.anisotropy = 16;
  const appM = new THREE.MeshBasicMaterial({ map: appT, color: new THREE.Color(0, 0, 0), toneMapped: false, transparent: true });
  const app = new THREE.Mesh(new THREE.PlaneGeometry(AW, AH), appM); app.position.z = 0.0007; scr.add(app);
  // tarjetas de la IA (se separan de la pantalla) y cursor
  const cardDims = [[0.11, 0.032], [0.11, 0.042], [0.11, 0.058]], cardY = [0.036, -0.006, -0.06];
  const cards = cardDims.map((d, k) => { const t = canvasTex(Math.round(d[0] * APX), Math.round(d[1] * APX)); t.anisotropy = 16;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d[0], d[1]), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, color: new THREE.Color(1.12, 1.12, 1.12) }));
    const g = new THREE.Group(); g.position.set(0, cardY[k], 0.001); g.add(m); scr.add(g); g.visible = false; return { g, m, t, d, y: cardY[k], last: '' }; });
  const curT = canvasTex(64, 96, (g) => { g.fillStyle = '#ffffff'; g.strokeStyle = '#000000'; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath(); g.moveTo(6, 4); g.lineTo(6, 78); g.lineTo(24, 62); g.lineTo(36, 90); g.lineTo(48, 84); g.lineTo(36, 58); g.lineTo(58, 56); g.closePath(); g.stroke(); g.fill(); });
  const curGeo = new THREE.PlaneGeometry(0.0085, 0.0128); curGeo.translate(0.0085 / 2 - 0.0085 * 6 / 64, -0.0128 / 2 + 0.0128 * 4 / 96, 0);
  const cursor = new THREE.Mesh(curGeo, new THREE.MeshBasicMaterial({ map: curT, transparent: true, depthWrite: false, toneMapped: false })); cursor.position.z = 0.004; cursor.renderOrder = 8; scr.add(cursor);
  // la IA «pensando»: un orbe turquesa que sale de la pantalla con chispas alrededor
  const orb = new THREE.Group(); orb.position.set(0, 0.0, 0.03); scr.add(orb);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.012, 32, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.4, 2.2), toneMapped: false })); orb.add(core);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), new THREE.MeshBasicMaterial({ map: starTex0(), color: new THREE.Color(0.2, 1.3, 1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); orb.add(halo);
  const sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0016, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2.4, 2.2), toneMapped: false }), 40); sparks.frustumCulled = false; orb.add(sparks);
  orb.visible = false;
  const setOpen = a => { lid.rotation.x = -a * (Math.PI / 2 + 0.28); };
  setOpen(0);
  return { L, lid, scr, disp, dispM, app, appM, appT, cards, cursor, orb, core, halo, sparks, setOpen };
}

// ---------------------------------------------------------------- la respuesta: gota de aceite, «B» de líquido (letra 3D) y la placa de la marca
function buildAnswer(font) {
  const G = new THREE.Group(); G.position.copy(PZ); scene.add(G);
  const oilM = new THREE.MeshPhysicalMaterial({ color: 0xffa21f, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, emissive: 0x2a1000, sheen: 0 });
  const dp = []; for (let i = 0; i <= 32; i++) { const a = Math.PI * (1 - i / 32); dp.push(new THREE.Vector2(Math.max(1e-4, 0.048 * Math.sin(a) * Math.pow(Math.sin(a / 2), 1.3)), Math.cos(a) * 0.065)); }   // gota: de abajo (redonda) a la punta
  const drop = new THREE.Mesh(new THREE.LatheGeometry(dp, 48), oilM); drop.castShadow = true; G.add(drop); drop.visible = false;
  const tg = new TextGeometry('B', { font, size: 0.2, depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.007, bevelSegments: 4, curveSegments: 10 }); tg.center();
  const bL = new THREE.Mesh(tg, oilM); bL.castShadow = true; G.add(bL); bL.visible = false;
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 12, 8), oilM, 36); drops.frustumCulled = false; G.add(drops); drops.visible = false;
  // la placa dorada con el nombre (como en la miniatura)
  const plate = new THREE.Group(); plate.position.set(0, 0.8, 0.05); G.add(plate);
  const pb = rbox(0.8, 0.205, 0.045, new THREE.MeshStandardMaterial({ color: 0xe8a530, roughness: 0.28, metalness: 0.65 }), 0.03); plate.add(pb);
  const pt = canvasTex(1600, 410, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, '#ffd65c'); r.addColorStop(1, '#e88c1e'); g.fillStyle = r; rr(g, 0, 0, w, h, 60); g.fill();
    g.fillStyle = 'rgba(255,240,190,.35)'; rr(g, 12, 10, w - 24, 46, 23); g.fill();
    g.fillStyle = '#160f05'; g.textAlign = 'center'; g.textBaseline = 'middle'; let px = 300; g.font = `${px}px Impact, "Inter"`; while (g.measureText('BOMBERADOS').width > w - 120) { px -= 4; g.font = `${px}px Impact, "Inter"`; } g.fillText('BOMBERADOS', w / 2, h / 2 + 12); });
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(0.775, 0.199), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.3, metalness: 0.25, emissive: 0xffffff, emissiveMap: pt, emissiveIntensity: 0.32 })); pf.position.z = 0.0232; plate.add(pf);
  const sub = signPlane('LA APP PARA OPOSITORES A BOMBERO', { w: 0.74, h: 0.05, col: '#FFC24A', font: '"SpaceMono"', weight: 700, ls: 4 }); sub.position.set(0, -0.15, 0.03); plate.add(sub);
  plate.visible = false;
  return { G, drop, bL, drops, plate, oilM };
}
// ---------------------------------------------------------------- la app en la pantalla (recreación): lista de fallos, la pregunta 37, el botón de la IA
// Lienzo de 900 × 1388 px para una ventana de 0,118 × 0,182 m. Las tarjetas de la IA van aparte (se separan de la pantalla).
const UI = { bg: '#0d1015', panel: '#161b23', line: 'rgba(238,242,246,.12)', white: '#eef2f6', grey: '#8f98a3', gold: '#f2b233', red: '#ff5a4e', teal: '#47dcc8', green: '#5fd38d' };
function uiText(g, s, x, y, px, col, w = 900, al = 'left', fam = 'Inter') { g.font = `${w} ${px}px ${fam}`; g.fillStyle = col; g.textAlign = al; g.fillText(s, x, y); }
function uiWrap(g, s, x, y, maxW, lh, px, col, w = 700) { g.font = `${w} ${px}px Inter`; g.fillStyle = col; g.textAlign = 'left'; const ws = s.split(' '); let line = '', yy = y;
  for (const wd of ws) { const tst = line ? line + ' ' + wd : wd; if (g.measureText(tst).width > maxW && line) { g.fillText(line, x, yy); line = wd; yy += lh; } else line = tst; } if (line) g.fillText(line, x, yy); return yy; }
function bookIcon(g, x, y, s, col) { g.save(); g.strokeStyle = col; g.lineWidth = s * 0.09; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x, y + s * 0.15); g.quadraticCurveTo(x + s * 0.25, y, x + s * 0.5, y + s * 0.15); g.quadraticCurveTo(x + s * 0.75, y, x + s, y + s * 0.15);
  g.lineTo(x + s, y + s * 0.85); g.quadraticCurveTo(x + s * 0.75, y + s * 0.7, x + s * 0.5, y + s * 0.85); g.quadraticCurveTo(x + s * 0.25, y + s * 0.7, x, y + s * 0.85); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(x + s * 0.5, y + s * 0.15); g.lineTo(x + s * 0.5, y + s * 0.85); g.stroke(); g.restore(); }
function bulbIcon(g, x, y, s, col) { g.save(); g.strokeStyle = col; g.lineWidth = s * 0.09; g.beginPath(); g.arc(x + s / 2, y + s * 0.38, s * 0.3, Math.PI * 0.8, Math.PI * 2.2); g.lineTo(x + s * 0.62, y + s * 0.78); g.lineTo(x + s * 0.38, y + s * 0.78); g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(x + s * 0.38, y + s * 0.92); g.lineTo(x + s * 0.62, y + s * 0.92); g.stroke(); g.restore(); }
function cmpIcon(g, x, y, s, col) { g.save(); g.strokeStyle = col; g.lineWidth = s * 0.09; g.lineCap = 'round'; for (const [yy, d] of [[0.32, 1], [0.68, -1]]) { g.beginPath(); g.moveTo(x + s * 0.1, y + s * yy); g.lineTo(x + s * 0.9, y + s * yy);
  const tip = d > 0 ? x + s * 0.9 : x + s * 0.1; g.moveTo(tip - d * s * 0.18, y + s * (yy - 0.14)); g.lineTo(tip, y + s * yy); g.lineTo(tip - d * s * 0.18, y + s * (yy + 0.14)); g.stroke(); } g.restore(); }
function sparkIcon(g, x, y, s, col) { g.save(); g.fillStyle = col; g.beginPath(); const cx = x + s / 2, cy = y + s / 2; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * 0.16 : s * 0.5; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); g.restore(); }
// cursor en coordenadas del lienzo de la app (px) → coordenadas de la pantalla (m)
const appXY = (px, py) => [(px / 900 - 0.5) * AW, (0.5 - py / (AH * APX)) * AH];
// estado de la app en el instante t
function drawApp(g, t) {
  const w = 900, h = Math.round(AH * APX);
  g.fillStyle = UI.bg; g.fillRect(0, 0, w, h);
  // cabecera
  g.fillStyle = '#11151c'; g.fillRect(0, 0, w, 120); g.fillStyle = UI.line; g.fillRect(0, 120, w, 2);
  g.letterSpacing = '2px'; uiText(g, 'BOMBERADOS', 44, 78, 46, UI.gold, 900); g.letterSpacing = '0px';
  g.fillStyle = 'rgba(71,220,200,.16)'; rr(g, w - 170, 38, 126, 50, 25); g.fill(); sparkIcon(g, w - 156, 47, 32, UI.teal); uiText(g, 'IA', w - 110, 76, 30, UI.teal, 900);
  const splash = clamp((t - (K.bomberados5 - 0.55)) / 0.35) * (1 - clamp((t - (K.tocas - 0.45)) / 0.25));
  const tq = K.fallado + 0.12, tai = K.inteligencia + 0.1;
  if (t < tq) {          // lista del simulacro con los aciertos y la 37 fallada
    uiText(g, 'SIMULACRO 3 · REVISIÓN', 44, 196, 30, UI.grey, 700); uiText(g, '28 / 30', w - 44, 196, 30, UI.white, 900, 'right');
    const rows = [[35, 1], [36, 1], [37, 0], [38, 1], [39, 1], [40, 1], [41, 1]];
    rows.forEach(([q, ok], i) => { const y = 250 + i * 128, hot = q === 37, hov = hot && t > K.tocas + 0.15, pr = hot && t > K.fallado - 0.05;
      g.fillStyle = pr ? 'rgba(255,90,78,.22)' : hov ? 'rgba(255,90,78,.12)' : UI.panel; rr(g, 34, y, w - 68, 108, 20); g.fill();
      if (hot) { g.strokeStyle = UI.red; g.lineWidth = hov ? 4 : 2; rr(g, 34, y, w - 68, 108, 20); g.stroke(); }
      uiText(g, 'Pregunta ' + q, 70, y + 66, 38, UI.white, 700); uiText(g, 'V / F', w - 250, y + 66, 28, UI.grey, 700);
      if (ok) { g.strokeStyle = UI.green; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(w - 130, y + 52); g.lineTo(w - 112, y + 72); g.lineTo(w - 78, y + 36); g.stroke(); }
      else { g.strokeStyle = UI.red; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(w - 128, y + 34); g.lineTo(w - 82, y + 78); g.moveTo(w - 82, y + 34); g.lineTo(w - 128, y + 78); g.stroke(); } });
  } else if (t < tai + 0.3) {     // la pregunta 37 y el botón «Pregúntale a la IA»
    const k = eo(clamp((t - tq) / 0.25));
    g.globalAlpha = k; g.fillStyle = UI.panel; rr(g, 34, 160, w - 68, 560, 26); g.fill(); g.strokeStyle = 'rgba(255,90,78,.6)'; g.lineWidth = 3; rr(g, 34, 160, w - 68, 560, 26); g.stroke();
    uiText(g, 'PREGUNTA 37 · VERDADERO O FALSO', 72, 232, 30, UI.grey, 700);
    uiWrap(g, 'Un fuego de aceite en una sartén es de clase B.', 72, 326, w - 150, 74, 56, UI.white, 900);
    uiText(g, 'TU RESPUESTA:', 72, 560, 32, UI.grey, 700); g.fillStyle = 'rgba(255,90,78,.2)'; rr(g, 340, 516, 150, 64, 14); g.fill(); uiText(g, 'V  ✗', 360, 563, 38, UI.red, 900);
    uiText(g, 'FALLADA', w - 72, 563, 30, UI.red, 900, 'right');
    const by = 780, press = t > K.inteligencia - 0.04, hov = t > K.inteligencia - 0.45;
    g.fillStyle = press ? '#5ff0dc' : hov ? '#47dcc8' : '#2fb8a6'; rr(g, 34, by, w - 68, 140, 70); g.fill();
    sparkIcon(g, 150, by + 44, 52, '#06201d'); uiText(g, 'PREGÚNTALE A LA IA', 230, by + 88, 44, '#06201d', 900);
    g.globalAlpha = 1;
  } else {                // la IA responde: la pregunta queda arriba en pequeño (las tarjetas van en 3D)
    g.fillStyle = UI.panel; rr(g, 34, 150, w - 68, 150, 22); g.fill();
    uiText(g, 'PREGUNTA 37', 64, 205, 26, UI.grey, 700); uiText(g, 'Fuego de aceite en sartén → ¿clase B?', 64, 262, 34, UI.white, 700);
    const th = t < K.manual6 - 0.25;
    if (th) { for (let i = 0; i < 3; i++) { const on = 0.35 + 0.65 * Math.max(0, Math.sin(t * 9 - i * 1.1)); g.fillStyle = `rgba(71,220,200,${on})`; g.beginPath(); g.arc(w / 2 - 50 + i * 50, 700, 14, 0, 7); g.fill(); }
      uiText(g, 'La IA está buscando…', w / 2, 790, 32, UI.teal, 700, 'center'); }
  }
  // portada de la app al abrir el portátil
  if (splash > 0.01) { g.globalAlpha = splash; g.fillStyle = UI.bg; g.fillRect(0, 122, w, h - 122);
    g.letterSpacing = '4px'; uiText(g, 'BOMBERADOS', w / 2, 640, 96, UI.gold, 900, 'center'); g.letterSpacing = '3px'; uiText(g, 'LA APP PARA OPOSITORES A BOMBERO', w / 2, 720, 26, UI.white, 700, 'center', 'SpaceMono'); g.letterSpacing = '0px';
    g.globalAlpha = 1; }
  // clics: onda en el sitio del cursor
  for (const [tc, x, y] of [[K.fallado, 450, 250 + 2 * 128 + 54], [K.inteligencia, 450, 850]]) { const u = (t - tc) / 0.45; if (u > 0 && u < 1) { g.strokeStyle = `rgba(255,255,255,${0.8 * (1 - u)})`; g.lineWidth = 6; g.beginPath(); g.arc(x, y, 20 + u * 90, 0, 7); g.stroke(); } }
  g.fillStyle = 'rgba(143,152,163,.75)'; g.letterSpacing = '3px'; uiText(g, 'RECREACIÓN · EJEMPLO', w / 2, h - 30, 22, 'rgba(143,152,163,.75)', 700, 'center', 'SpaceMono'); g.letterSpacing = '0px';
}
// tarjetas de la IA: k = cuánto texto se ve (tecleo); rev = 0…1, la letra oculta pasa a «F» (después de «Falso.»)
function drawCard(i, g, w, h, k, t, rev) {
  g.clearRect(0, 0, w, h); g.fillStyle = '#121821'; rr(g, 2, 2, w - 4, h - 4, 26); g.fill();
  g.strokeStyle = i === 2 ? 'rgba(242,178,51,.55)' : 'rgba(71,220,200,.55)'; g.lineWidth = 3; rr(g, 2, 2, w - 4, h - 4, 26); g.stroke();
  const hid = (x, y, s) => { if (rev > 0.01) { g.save(); g.shadowColor = '#ffb030'; g.shadowBlur = 30 * rev; uiText(g, 'F', x, y, s, `rgba(255,190,70,${rev})`, 900); g.restore(); }
    if (rev < 0.99) { g.globalAlpha = 1 - rev; g.fillStyle = UI.gold; rr(g, x - 4, y - s * 0.78, s * 0.72, s * 0.86, 8); g.fill(); g.globalAlpha = 1; } };
  if (i === 0) {
    bookIcon(g, 34, 34, 54, UI.teal); g.letterSpacing = '3px'; uiText(g, 'DÓNDE ESTÁ', 110, 72, 26, UI.teal, 900, 'left', 'SpaceMono'); g.letterSpacing = '0px';
    g.fillStyle = 'rgba(143,152,163,.25)'; rr(g, w - 170, 34, 136, 40, 10); g.fill(); uiText(g, 'EJEMPLO', w - 102, 62, 20, UI.grey, 700, 'center', 'SpaceMono');
    if (k > 0.05) uiText(g, typed('Manual de Incendios', k * 2), 34, 150, 48, UI.white, 900);
    if (k > 0.4) { uiText(g, 'Tema 2  ·', 34, 218, 44, UI.grey, 700); const hl = clamp((t - K.pagina6 + 0.05) / 0.2);
      if (hl > 0) { g.fillStyle = `rgba(242,178,51,${0.25 * hl})`; rr(g, 232, 176, 230, 58, 12); g.fill(); } uiText(g, 'Pág. 34', 246, 218, 44, UI.gold, 900); }
  } else if (i === 1) {
    bulbIcon(g, 34, 30, 56, UI.teal); g.letterSpacing = '3px'; uiText(g, 'DEFINICIÓN', 110, 72, 26, UI.teal, 900, 'left', 'SpaceMono'); g.letterSpacing = '0px';
    if (k > 0.02) { uiText(g, 'Clase', 34, 160, 46, UI.white, 900); hid(178, 160, 46);
      const s = 'fuegos de aceites y grasas en aparatos de cocina.'; g.font = '700 40px Inter';
      uiText(g, ':', 214, 160, 46, UI.white, 900); const ty = typed(s, k * 1.2); uiWrap(g, ty, 240, 160, w - 280, 56, 40, UI.white, 700); }
  } else {
    cmpIcon(g, 34, 30, 54, UI.gold); g.letterSpacing = '3px'; uiText(g, 'PREGUNTAS PARECIDAS', 110, 70, 26, UI.gold, 900, 'left', 'SpaceMono'); g.letterSpacing = '0px';
    const R = [['Fuego de gasolina', 'B', K.compara + 0.3], ['Fuego de butano', 'C', K.compara + 0.75], ['Aceite en una sartén', '?', K.parecidas + 0.05]];
    R.forEach(([q, c, t0], j) => { const a = eo(clamp((t - t0) / 0.3)); if (a <= 0) return; const y = 110 + j * 98, trap = j === 2;
      g.globalAlpha = a; g.fillStyle = trap ? 'rgba(242,178,51,.1)' : 'rgba(238,242,246,.05)'; rr(g, 24, y, w - 48, 84, 16); g.fill();
      const sh = trap ? Math.sin(t * 40) * 6 * clamp(1 - Math.abs(t - K.trampa8 - 0.2) / 0.3) : 0;
      uiText(g, q, 50 + (1 - a) * 40, y + 56, 38, UI.white, 700);
      g.fillStyle = trap ? 'rgba(242,178,51,.22)' : 'rgba(71,220,200,.18)'; rr(g, w - 250 + sh, y + 14, 200, 56, 14); g.fill();
      uiText(g, 'CLASE', w - 230 + sh, y + 54, 30, trap ? UI.gold : UI.teal, 900);
      if (trap) { if (rev < 0.99) { const pu = 0.6 + 0.4 * Math.sin(t * 8); g.globalAlpha = a * (1 - rev); uiText(g, '?', w - 106 + sh, y + 56, 42, `rgba(255,${Math.round(150 * pu)},70,1)`, 900); g.globalAlpha = a; }
        if (rev > 0.01) { g.save(); g.shadowColor = '#ffb030'; g.shadowBlur = 30 * rev; uiText(g, 'F', w - 108, y + 56, 42, `rgba(255,190,70,${rev})`, 900); g.restore(); } }
      else uiText(g, c, w - 106, y + 56, 42, UI.white, 900);
      g.globalAlpha = 1; });
  }
}
// punto del «?» de la tarjeta 3 (de ahí sale la F de fuego), en coordenadas de la pantalla
const QMARK_LOCAL = () => { const w = Math.round(0.11 * APX), h = Math.round(0.058 * APX); return v3(((w - 94) / w - 0.5) * 0.11, -0.06 + (0.5 - 347 / h) * 0.058, 0.006); };
// ---------------------------------------------------------------- estado de la escena en cada instante (todo es función de t)
const wpos = (o, v = new THREE.Vector3()) => o.getWorldPosition(v);
const popS = (t, t0, d = 0.35) => Math.max(1e-4, pop(t, t0, d));
const bump = (t, t0, d) => { const u = (t - t0) / d; return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u); };
function loopT(t) { return t > END - 0.72 ? t - END : t; }      // al final, el principio otra vez (bucle)
const _m = new THREE.Matrix4(), _qq = new THREE.Quaternion(), _one = new THREE.Vector3(1, 1, 1), _ee = new THREE.Euler();
const LV = v3(-0.13, 0.66, 0), LF = v3(0.13, 0.66, 0), LFC = v3(0, 0.68, 0), LH = 0.22, LHC = 0.26;   // la V y la F sobre la sartén
let ANCH = null;
function anchors() {          // puntos del mundo que usan los vuelos y la cámara (tapa del portátil abierta)
  if (ANCH) return ANCH;
  S.room.R.updateMatrixWorld(true); const op = S.lap.lid.rotation.x;
  const bub = S.sheet.bubV(), sheetC = S.sheet.G.localToWorld(v3(0, 0, 0)), row37 = S.sheet.row37();
  S.lap.setOpen(1); S.room.R.updateMatrixWorld(true);
  const Mo = S.lap.scr.matrixWorld.clone(), at = (x, y, z) => v3(x, y, z).applyMatrix4(Mo);     // la pantalla con la tapa abierta (copia fija)
  const sc = at(0, 0, 0), sn = at(0, 0, 1).sub(sc).normalize(), su = at(0, 1, 0).sub(sc).normalize(), sr = at(1, 0, 0).sub(sc).normalize();
  const q = at(...QMARK_LOCAL().toArray());
  S.lap.lid.rotation.x = op; S.room.R.updateMatrixWorld(true);
  const row37b = S.sheet.G.localToWorld(S.sheet.xy(415, rowY(6)));
  ANCH = { bub, sheetC, row37, row37b, sc, sn, su, sr, q, at };
  return ANCH;
}
const TV0 = () => K.trampa1 + 0.5, TV1 = () => TV0() + 0.85;          // la V vuela de la sartén a la hoja
const TF0 = () => K.falso9 - 0.05, TF1 = () => K.falso9 + 0.85;       // la F vuela de la pantalla a la sartén
function bez3(a, b, c, d, u) { const v = 1 - u; return a.clone().multiplyScalar(v * v * v).addScaledVector(b, 3 * u * v * v).addScaledVector(c, 3 * u * u * v).addScaledVector(d, u * u * u); }
// la V sube, cruza el aire y entra en la mesa por la derecha (sin pasar por la cabeza del opositor)
function vPath(t) { const A = anchors(), u = eio(clamp((t - TV0()) / (TV1() - TV0())));
  return { p: bez3(LV, LV.clone().add(v3(1.6, 1.3, -1.2)), A.bub.clone().add(v3(1.25, 0.75, 0.25)), A.bub.clone().add(v3(0, 0.01, 0)), u), h: lerp(LH, 0.026, Math.pow(u, 0.7)), u }; }
// la F sale de la pantalla y sube por encima del portátil (0,3 s); luego cruza el aire y cae sobre la sartén
const TF_OUT = 0.3;
const fQ1 = () => { const A = anchors(); return A.q.clone().addScaledVector(A.sn, 0.12).add(v3(0, 0.32, 0)); };
function fPath(t) {
  const A = anchors(), Q1 = fQ1(), u1 = clamp((t - TF0()) / TF_OUT);
  if (t < TF0() + TF_OUT) return { p: A.q.clone().lerp(Q1, eo(u1)), h: lerp(0.006, 0.1, sm5(u1)), u: 0 };
  const u = eio(clamp((t - TF0() - TF_OUT) / (TF1() - TF0() - TF_OUT)));
  return { p: bez3(Q1, Q1.clone().add(v3(0, 0.6, 0)).addScaledVector(A.sn, 0.5), LFC.clone().add(v3(0.4, 1.6, 2.0)), LFC, u), h: lerp(0.1, LHC, sm5(clamp(u / 0.5))), u };
}
const flare = (t, t0, k) => (t > t0 ? Math.exp(-(t - t0) * k) : 0);

// ---- fuego y letras
function letters(t) {
  const inLoop = t > END - 0.72, tt = loopT(t);
  let fv = win(tt, K.verdadero - 0.1, 0.5), hv = 1, Lv = LV.clone(), lv = LH;
  let ff = win(tt, K.falso1 - 0.1, 0.5), hf = 1, Lf = LF.clone(), lf = LH;
  if (!inLoop) {
    if (t > TV0()) { const P = vPath(t); Lv = P.p; lv = P.h; hv = 1 - win(t, TV1() - 0.04, 0.3); }
    if (t > TV1() + 0.3) { hv = 0; fv = 0; }
    hf = 1 - win(t, TV0() + 0.25, 0.4);
    if (t > TF0() - 0.1) { ff = 1; hf = win(t, TF0() - 0.1, 0.12) * (1 + 0.6 * flare(t, K.f10, 3)); const P = fPath(t); Lf = P.p; lf = P.h; }
    if (t > K.tu - 0.25) { const k = win(t, K.tu - 0.25, 0.6); Lf = LFC.clone().lerp(LF, k); lf = lerp(LHC, LH, k); hv = 1; fv = win(t, K.v11 - 0.3, 0.55); Lv = LV.clone(); lv = LH; }
    if (t > K.bomberados12 - 0.12) { const k = 1 - win(t, K.bomberados12 - 0.12, 0.45); fv *= k; ff *= k; }
  }
  return { fv, hv, Lv, lv, ff, hf, Lf, lf };
}
const _L0p = new THREE.Vector4(), _L1p = new THREE.Vector4();
function fireAt(t) {
  const u = S.fire.u, tt = loopT(t), A = letters(t), B = letters(t - 1 / 36);
  let pw = 1 - 0.22 * win(tt, K.falso1 + 0.3, 0.6);
  if (t < END - 0.72) pw += 0.22 * win(t, TV0(), 0.4) + 0.5 * flare(t, K.f10, 3) + 0.7 * flare(t, K.bomberados12, 2.2) - 0.15 * win(t, K.tu, 0.5) * (1 - win(t, K.bomberados12 - 0.1, 0.3));
  u.power.value = pw;
  u.L0.value.set(A.Lv.x, A.Lv.y, A.Lv.z, A.lv); u.L1.value.set(A.Lf.x, A.Lf.y, A.Lf.z, A.lf);
  u.L0p.value.set(B.Lv.x, B.Lv.y, B.Lv.z, B.lv); u.L1p.value.set(B.Lf.x, B.Lf.y, B.Lf.z, B.lf);
  u.form.value.set(A.fv, A.ff); u.heat.value.set(A.hv, A.hf);
  S.firePow = pw;
  const P = S.pan; P.oil.material.color.setScalar(1.25 + 0.3 * Math.sin(t * 17) * Math.sin(t * 7.3) + 0.4 * flare(t, K.f10, 3));
}

// ---- la habitación: la tarde que se va, el flexo y el reloj
function roomAt(t) {
  const R = S.room, vis = t > TV0() + 0.1 && t < TF1() + 0.2; R.R.visible = vis; S.pan.G.visible = !(t > TV1() + 0.2 && t < TF0() - 0.1);
  S.gridM.uniforms.op.value = 1 - win(t, TV0() + 0.2, 0.4) * (1 - win(t, TF0() + 0.4, 0.4));
  if (!vis) return;
  const night = win(t, K.va - 0.15, 0.9); S.night = night;
  R.skyA.material.color.setScalar(1.25 - 0.75 * night); R.skyB.material.opacity = night;
  const lt = K.tarde - 0.02, lamp = t < lt ? 0 : (t < lt + 0.3 ? (Math.sin((t - lt) * 75) > -0.3 ? 1 : 0.25) : 1);
  R.bulb.material.color.setRGB(0.2 + 2.9 * lamp, 0.18 + 2.4 * lamp, 0.15 + 1.7 * lamp); S.lampOn = lamp;
  const hrs = 17 + 5 / 60 + (4 + 45 / 60) * sm5(clamp((t - K.va + 0.35) / 1.0)) + Math.max(0, t - 7) / 1800;
  R.clock.hh.rotation.z = -(hrs % 12) / 12 * 6.2832; R.clock.mh.rotation.z = -(hrs % 1) * 6.2832; S.hrs = hrs;
}
// ---- el opositor
const PKEYS = () => [[0, 'read'], [K.rojo - 0.1, 'read'], [K.rojo + 0.15, 'shock'], [K.toca + 0.2, 'read'], [K.manual3 - 0.2, 'read'], [K.manual3 + 0.1, 'lookL'], [K.pagina3 - 0.3, 'lookL'], [K.pagina3 + 0.1, 'read'],
  [K.hojas - 0.25, 'read'], [K.hojas, 'flip'], [K.manual4 - 0.1, 'flip'], [K.manual4 + 0.1, 'lookL'], [K.va - 0.2, 'lookL'], [K.va + 0.1, 'slump'], [K.ahora - 0.05, 'slump'], [K.ahora + 0.3, 'up'], [K.bomberados5 + 0.2, 'up'], [K.tocas - 0.2, 'mouse']];
let _pk = null;
function personAt(t) {
  if (!S.room.R.visible) return;
  const J = S.person.userData.J; _pk = _pk || PKEYS(); applyPose(J, _pk, t);
  // pasando hojas: el brazo derecho va y viene sobre el libro
  const fl = win(t, K.hojas - 0.1, 0.25) * (1 - win(t, K.apuntes + 0.2, 0.3));
  if (fl > 0) { J.shR.rotation.y += fl * 0.32 * Math.sin(t * 12); J.elR.rotation.x += fl * 0.18 * Math.sin(t * 12 + 1); J.head.rotation.y += fl * 0.08 * Math.sin(t * 12 - 0.6); }
  // respira; con el ratón, la mano acompaña al cursor
  J.spine.rotation.x += 0.012 * Math.sin(t * 2.1); J.head.rotation.x += 0.02 * Math.sin(t * 1.3);
  const ms = win(t, K.tocas - 0.2, 0.3); if (ms > 0) { J.shR.rotation.y += ms * 0.05 * Math.sin(t * 3); J.wrR.rotation.x += ms * 0.15 * (bump(t, K.fallado - 0.05, 0.15) + bump(t, K.inteligencia - 0.05, 0.15)); }
}
// ---- manuales: la torre (se buscan), pestañas, el libro abierto (páginas que pasan a toda velocidad)
function booksAt(t) {
  if (!S.room.R.visible) return;
  const B = S.books;
  B.books.forEach((b, i) => { const dx = 0.075 * bump(t, K.manual3 - 0.05 + i * 0.1, 0.42) + 0.05 * bump(t, K.manual4 - 0.05 + (5 - i) * 0.03, 0.3) + 0.05 * bump(t, K.manual4b - 0.05 + i * 0.03, 0.3);
    b.b.position.x = b.x0 + dx; b.b.position.y = b.y0 + 0.03 * (bump(t, K.manual4 - 0.05 + (5 - i) * 0.03, 0.3) + bump(t, K.manual4b - 0.05 + i * 0.03, 0.3)); });
  B.tabs.forEach((tb, i) => { const s = popS(t, K.tema - 0.08 + i * 0.07, 0.35); tb.scale.set(s, 1, 1); tb.visible = t > K.tema - 0.1 + i * 0.07; });
  const T0 = K.hojas - 0.12, T1 = K.apuntes + 0.25, iv = 0.085, D = 0.3, cyc = B.pages.length * iv;
  B.pages.forEach((pg, k) => { let th = 0; const base = T0 + k * iv;
    if (t > base) { const n = Math.min(Math.floor((t - base) / cyc), Math.floor((T1 - base) / cyc)); if (n >= 0) { const tau = t - (base + n * cyc); th = tau < D ? Math.PI * sm5(tau / D) : Math.PI; } }
    if (pg.th !== th) { bendPage(pg, th); pg.th = th; } pg.m.position.y = pg.b.position.y = 0.023 + 0.0006 * k; });
}
// ---- apuntes en remolino que acaban por el suelo
function sheetsAt(t) {
  const Sh = S.sheets, t0 = K.apuntes - 0.12, tf = K.va - 0.1, vis = S.room.R.visible && t > t0;
  Sh.sets.forEach(m => { m.visible = m.userData.back.visible = vis; }); if (!vis) return;
  const C = v3(-0.17, DY + 0.03, 0.15);
  Sh.sets.forEach((m, k) => { for (let j = 0; j < Sh.per; j++) { const i = k * Sh.per + j, p = Sh.P[i], a = t - (t0 + p.d * 0.45);
      if (a <= 0) { _m.makeScale(1e-4, 1e-4, 1e-4); m.setMatrixAt(j, _m); continue; }
      const ang = p.a0 + p.sp * a, r = p.r1 * Math.min(1, a * 1.7), y = C.y + p.h1 * Math.min(1, a * 1.15) + 0.06 * Math.sin(a * 3 + p.tx);
      const P = v3(C.x + Math.cos(ang) * r, y, C.z + Math.sin(ang) * r * 0.85);
      let ex = p.tx + a * 3.1, ey = p.ty + a * 2.3, ez = a * 1.7;
      const f = sm5(clamp((t - tf - p.d * 0.35) / 0.65));
      if (f > 0) { P.lerp(v3(p.fx, 0.007 + i * 0.00012, p.fz), f); ex = lerp(ex % 6.283, -Math.PI / 2, f); ey = lerp(ey % 6.283, 0, f); ez = lerp(ez % 6.283, p.fr, f); }
      _ee.set(ex, ey, ez); _m.compose(P, _qq.setFromEuler(_ee), _one); m.setMatrixAt(j, _m); }
    m.instanceMatrix.needsUpdate = true; });
}
// ---- la hoja de respuestas: la V aterriza en la 37, entra la plantilla, ✓ … ✗
let _plt = -1;
function sheetAt(t) {
  if (!S.room.R.visible) return;
  const Sh = S.sheet, land = TV1();
  Sh.vMark.visible = t > land - 0.06; Sh.vMark.scale.setScalar(popS(t, land - 0.06, 0.3));
  const sl = eo(clamp((t - land - 0.02) / 0.42)); Sh.ov.position.set(0.3 * (1 - sl), 0.0004, -0.03 * (1 - sl)); Sh.ov.visible = sl > 0.001;
  let rows = 0; for (let i = 0; i < NROW; i++) { const ti = i < 6 ? land + 0.45 + i * Math.max(0.06, (K.treinta - land - 0.55) / 6) : K.treinta + 0.3 + (i - 7) * 0.05; if (t > ti) rows = i + 1; }
  if (rows !== _plt) { plantillaTex(rows)(Sh.plt.userData.g, 600, 848); Sh.plt.needsUpdate = true; _plt = rows; }
  Sh.xMark.visible = t > K.treinta - 0.03; const xs = 1 + 0.9 * (1 - eo(clamp((t - K.treinta + 0.03) / 0.2)));
  Sh.xMark.scale.setScalar(Sh.xMark.visible ? xs : 1e-4); Sh.xMark.material.color.setScalar(1.3 + 1.6 * flare(t, K.rojo, 3) + 0.4 * flare(t, K.treinta, 5));
}
// ---- el portátil: se abre, la app, el cursor, la IA pensando y sus tarjetas
const CUR = () => [[K.tocas - 0.45, 760, 1240], [K.fallado - 0.12, 450, 560], [K.fallado + 0.15, 452, 562], [K.inteligencia - 0.12, 450, 850], [K.inteligencia + 0.1, 452, 852], [K.inteligencia + 0.7, 790, 1235]];
let _cur = null;
const CARD_T = () => [K.manual6 - 0.22, K.define - 0.12, K.compara - 0.12];
function laptopAt(t) {
  if (!S.room.R.visible) { S.screenOn = 0; return; }
  const Lp = S.lap; Lp.setOpen(eio(clamp((t - K.ahora + 0.05) / 0.6)));
  const on = win(t, K.ahora + 0.32, 0.35); S.screenOn = on;
  Lp.dispM.color.setScalar(on * 0.85); Lp.appM.color.setScalar(on * 1.15); Lp.app.visible = on > 0.01;
  if (on > 0.01) { drawApp(Lp.appT.userData.g, t); Lp.appT.needsUpdate = true; }
  _cur = _cur || CUR(); const cv = t > K.tocas - 0.5 && t < TF0(); Lp.cursor.visible = cv;
  if (cv) { const T = _cur.map(k => k[0]); const px = mono(t, T, _cur.map(k => k[1])), py = mono(t, T, _cur.map(k => k[2])); const [x, y] = appXY(px, py);
    Lp.cursor.position.set(x, y, 0.004); Lp.cursor.scale.setScalar(1 - 0.18 * (bump(t, K.fallado - 0.06, 0.16) + bump(t, K.inteligencia - 0.06, 0.16))); }
  // orbe de la IA
  const t0 = K.inteligencia + 0.08, t1 = K.manual6 - 0.15, ov = t > t0 && t < t1 + 0.25; Lp.orb.visible = ov;
  if (ov) { const s = popS(t, t0, 0.45) * (1 - sm5(clamp((t - t1) / 0.22))); Lp.orb.scale.setScalar(Math.max(1e-3, s)); Lp.orb.position.set(0.012 * Math.sin(t * 2.2), -0.004 + 0.006 * Math.sin(t * 3.1), 0.034);
    Lp.halo.material.opacity = 0.8 + 0.2 * Math.sin(t * 9); Lp.halo.lookAt(cam.position);
    for (let i = 0; i < 40; i++) { const a = t * (2.5 + hash(i) * 2) + i * 0.7, r = 0.017 + 0.012 * hash(i * 2.3) + 0.004 * Math.sin(t * 5 + i), el = (hash(i * 3.7) - 0.5) * 1.6;
      _m.makeTranslation(Math.cos(a) * r * Math.cos(el), Math.sin(el) * r, Math.sin(a) * r * Math.cos(el)); Lp.sparks.setMatrixAt(i, _m); } Lp.sparks.instanceMatrix.needsUpdate = true; }
  // tarjetas: salen de la pantalla, la que se nombra se acerca a la cámara
  const CT = CARD_T(), rev = win(t, K.falso9 - 0.02, 0.22), dur = [1.0, 1.1, 0.8];
  Lp.cards.forEach((c, i) => { const ta = CT[i], vis = t > ta && t < TF1() + 0.2; c.g.visible = vis; if (!vis) return;
    const k = clamp((t - ta) / dur[i]); drawCard(i, c.t.userData.g, c.t.image.width, c.t.image.height, k, t, rev); c.t.needsUpdate = true;
    const focus = i === 2 ? win(t, ta, 0.3) : win(t, ta, 0.3) * (1 - win(t, CT[i + 1] - 0.05, 0.3));
    const s = popS(t, ta, 0.45); c.g.scale.setScalar(s); c.g.position.set(0, c.y, 0.002 + 0.011 * focus + 0.03 * (1 - eo(clamp((t - ta) / 0.45))));
    c.g.rotation.set(0.05 * Math.sin(t * 1.3 + i) * focus, 0.06 * Math.sin(t * 0.9 + i * 2) * focus, 0);
    const dim = i < 2 ? win(t, CT[i + 1], 0.35) * (i === 1 ? 1 - rev : 1) : 0; c.m.material.opacity = 1 - 0.68 * dim; });   // las ya leídas se apagan
}
// ---- la respuesta: gota de aceite → «B» de líquido; la F se aviva; la placa de la marca sale del fuego
const DP = v3(-0.46, 0.5, 0.02);
function answerAt(t) {
  const A = S.ans, td0 = K.aceite10 - 0.1, tB = K.b10 - 0.08;
  A.drop.visible = t > td0 && t < tB + 0.2;
  if (A.drop.visible) { const fall = eo(clamp((t - td0) / 0.45)), sq = 1 - sm5(clamp((t - tB) / 0.16)), w0 = t > td0 + 0.45 ? Math.exp(-(t - td0 - 0.45) * 4) : 0, wob = 1 + 0.1 * Math.sin((t - td0) * 18) * w0;
    A.drop.position.set(DP.x, lerp(1.15, DP.y, fall) + 0.01 * Math.sin(t * 6), DP.z); A.drop.scale.set(1.9 * sq / wob, 1.9 * sq * wob, 1.9 * sq / wob); A.drop.rotation.y = t * 0.7; }
  A.bL.visible = t > tB && t < K.tu + 0.7;
  if (A.bL.visible) { const k = popS(t, tB, 0.45) * (1 - sm5(clamp((t - K.tu - 0.1) / 0.45))); A.bL.scale.setScalar(Math.max(1e-3, k)); A.bL.position.set(DP.x, DP.y + 0.015, DP.z); A.bL.rotation.set(0, 0.3 * Math.sin(t * 0.9) - 0.15, 0);
    const dim = win(t, K.pero + 0.1, 0.5); A.oilM.color.setRGB(lerp(1, 0.4, dim), lerp(0.636, 0.38, dim), lerp(0.12, 0.36, dim)); A.oilM.emissive.setRGB(lerp(0.16, 0.0, dim), lerp(0.06, 0.0, dim), 0); }
  A.drops.visible = t > tB && t < tB + 0.9;
  if (A.drops.visible) { const a = t - tB; for (let i = 0; i < 36; i++) { const th = hash(i * 1.7) * 6.283, v = 0.5 + hash(i * 2.9) * 0.6, up = 0.6 + hash(i * 4.3) * 0.8, s = Math.max(1e-3, 1 - a / 0.9);
      _m.compose(v3(DP.x + Math.cos(th) * v * a, DP.y + up * a - 2.2 * a * a, DP.z + Math.sin(th) * v * a), _qq.identity(), _one.set(s, s, s)); A.drops.setMatrixAt(i, _m); } _one.set(1, 1, 1); A.drops.instanceMatrix.needsUpdate = true; }
  const tp = K.bomberados12 - 0.1; A.plate.visible = t > tp;
  if (A.plate.visible) { const k = popS(t, tp, 0.55), r = eo(clamp((t - tp) / 0.6)); A.plate.scale.setScalar(0.72 * k); A.plate.position.set(0, lerp(0.3, 0.8, r) + 0.006 * Math.sin(t * 2), 0.05); A.plate.rotation.set(0.04 * Math.sin(t * 1.1), 0.08 * Math.sin(t * 0.8), 0.035 * (1 - r)); }
}
function stageAt(t) { fireAt(t); roomAt(t); personAt(t); booksAt(t); sheetsAt(t); sheetAt(t); laptopAt(t); answerAt(t); }
// ---------------------------------------------------------------- cámara: sartén (0,·,0) → la V vuela a la mesa (8,·,-14) → manuales → portátil → la F vuelve a la sartén
let CK = [], CK_OPEN = [];
const D = (x, y, z) => v3(DZ.x + x, y, DZ.z + z);
function follow(path, t0, t1, back = 1.0, up = 0.16, side = 0.08, us = [0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88]) {        // claves que siguen a una letra en vuelo
  return us.map(u => { const t = t0 + u * (t1 - t0), P = path(t).p, dir = path(t + 0.02).p.sub(path(t - 0.02).p).normalize(), sd = v3(-dir.z, 0, dir.x).normalize();
    return [t, P.clone().addScaledVector(dir, -back).add(v3(0, up, 0)).addScaledVector(sd, side).toArray(), P.clone().addScaledVector(dir, 0.3).toArray(), 34, 0.04 * (u - 0.5)]; });
}
function buildCam() {
  const A = anchors(), at = (x, y, z) => A.at(x, y, z).toArray(), arr = v => v.toArray();
  // primer segundo: dentro de las llamas, pegados al aceite ardiendo
  CK_OPEN = [
    [-1.5, [0.07, 0.2, 0.86], [0, 0.22, 0], 30, 0.02],
    [0.0, [0.05, 0.2, 0.74], [0, 0.23, 0], 30, 0.03],
    [0.85, [0.02, 0.3, 1.15], [0, 0.3, 0], 32, 0.0],
  ];
  CK = [
    ...CK_OPEN,
    [K.clase, [0.0, 0.42, 1.75], [0, 0.4, 0], 32],
    [K.verdadero + 0.15, [-0.04, 0.56, 2.2], [0, 0.52, 0], 32, -0.01],
    [K.piensalo, [0.0, 0.6, 2.15], [0, 0.56, 0], 32],
    [TV0(), [0.03, 0.62, 1.95], [0, 0.58, 0], 32, 0.01],
    // la V vuela hasta la hoja de respuestas (la cámara va detrás de ella)
    ...follow(vPath, TV0(), TV1()),
    [TV1() + 0.05, arr(A.sheetC.clone().add(v3(0.0, 0.52, 0.07))), arr(A.sheetC.clone().add(v3(0, 0, -0.01))), 32],
    [K.treinta - 0.1, arr(A.row37b.clone().add(v3(0.0, 0.32, 0.035))), arr(A.row37b), 32],
    [K.rojo + 0.2, arr(A.row37b.clone().add(v3(0.01, 0.29, 0.03))), arr(A.row37b), 32],
    // buscarla a mano: la mesa, la torre de manuales, las pestañas, el libro abierto
    [K.toca + 0.25, arr(D(1.55, 1.72, 1.75)), arr(D(-0.05, 0.82, 0.05)), 36],
    [K.manual3 + 0.1, arr(D(-0.78, 1.06, 0.58)), arr(D(-0.47, 0.84, 0.06)), 32],
    [K.tema + 0.1, arr(D(-0.16, 1.06, 0.22)), arr(D(-0.42, 0.82, 0.0)), 32],
    [K.pagina3 + 0.1, arr(D(-0.5, 1.02, 0.48)), arr(D(-0.18, 0.77, 0.14)), 32],
    [K.hojas + 0.1, arr(D(-0.5, 0.93, 0.3)), arr(D(-0.17, 0.765, 0.13)), 33],
    [K.indices + 0.15, arr(D(-0.42, 0.89, 0.22)), arr(D(-0.17, 0.76, 0.13)), 33],
    [K.apuntes + 0.35, arr(D(0.55, 1.25, 0.8)), arr(D(-0.12, 0.95, 0.05)), 34, 0.03],
    [K.manual4 + 0.05, arr(D(-0.62, 1.28, 0.85)), arr(D(-0.25, 0.92, 0.0)), 34, -0.02],
    [K.manual4b + 0.05, arr(D(-0.95, 1.18, 0.3)), arr(D(-0.35, 0.9, -0.1)), 34],
    [K.va + 0.1, arr(D(1.15, 1.45, 1.6)), arr(D(0.05, 1.05, -0.3)), 36],
    [K.tarde + 0.35, arr(D(1.05, 1.42, 1.5)), arr(D(0.05, 1.05, -0.3)), 36],
    // con Bomberados: por encima del hombro, y dentro de la pantalla
    [K.ahora + 0.2, arr(D(0.33, 1.3, 1.0)), arr(A.sc), 32],
    [K.bomberados5, arr(A.sc.clone().addScaledVector(A.sn, 0.68).add(v3(0, 0.03, 0))), arr(A.sc), 32],
    // (la app un poco más abajo en el encuadre: arriba van los subtítulos)
    [K.tocas - 0.15, at(0, 0.028, 0.43), at(0, 0.028, 0), 32],
    [K.fallado, at(0.0, 0.032, 0.4), at(0, 0.030, 0), 32],
    [K.inteligencia + 0.1, at(0.035, 0.018, 0.42), at(0, 0.023, 0.01), 32],
    [K.artificial + 0.6, at(-0.04, 0.028, 0.4), at(0, 0.028, 0.02), 32],
    [K.manual6 + 0.1, at(0.0, 0.064, 0.42), at(0, 0.064, 0.008), 32],
    [K.pagina6 + 0.3, at(0.008, 0.060, 0.4), at(0.003, 0.062, 0.008), 32],
    [K.define + 0.1, at(-0.006, 0.022, 0.42), at(0, 0.022, 0.008), 32],
    [K.rodeos + 0.4, at(0.006, 0.018, 0.41), at(0, 0.020, 0.008), 32],
    [K.compara + 0.1, at(0.0, -0.024, 0.44), at(0, -0.028, 0.008), 32],
    [K.trampa8 + 0.05, at(0.0, -0.040, 0.4), at(0.0, -0.040, 0.006), 32],
    [TF0(), at(0.0, -0.042, 0.36), at(0.012, -0.044, 0.006), 32],
    // «Falso.»: la F sale de la pantalla y la seguimos hasta la sartén
    ...[0.5, 1.0].map(k => { const t = TF0() + k * TF_OUT, P = fPath(t).p; return [t, P.clone().addScaledVector(A.sn, 0.42).addScaledVector(A.sr, 0.1 + 0.06 * k).add(v3(0, 0.12 - 0.07 * k, 0)).toArray(), P.toArray(), 32, 0.02 * k]; }),
    (() => { const t0 = TF0() + TF_OUT, t = t0 + 0.15 * (TF1() - t0), P = fPath(t).p; return [t, P.clone().addScaledVector(A.sn, 0.55).addScaledVector(A.sr, 0.18).add(v3(0, -0.05, 0)).toArray(), P.toArray(), 32, 0.03]; })(),
    ...follow(fPath, TF0() + TF_OUT, TF1(), 1.0, 0.14, -0.1, [0.38, 0.56, 0.72, 0.88]),
    [TF1() + 0.05, [0.3, 0.62, 1.95], [0.0, 0.58, 0], 32],
    [K.liquido, [-0.32, 0.6, 1.3], [-0.44, 0.52, 0], 32],
    [K.b10 + 0.1, [-0.4, 0.56, 1.2], [-0.45, 0.51, 0], 32],
    [K.pero + 0.25, [-0.15, 0.62, 1.7], [-0.2, 0.52, 0], 32],
    [K.cocina + 0.1, [0.05, 0.58, 1.65], [0.0, 0.5, 0], 32],
    [K.propia, [0.03, 0.66, 1.5], [0.0, 0.66, 0], 32],
    [K.f10 + 0.25, [0.0, 0.67, 1.38], [0.0, 0.67, 0], 32],
    [K.tu + 0.2, [0.0, 0.64, 2.3], [0, 0.6, 0], 32],
    [K.comentarios + 0.2, [0.1, 0.65, 2.2], [0.0, 0.61, 0], 32, -0.01],
    [K.bomberados12 + 0.25, [0, 0.78, 2.45], [0, 0.74, 0], 32],
    [K.examen12, [0, 0.77, 2.55], [0, 0.74, 0], 32],
    [END - 0.75, [0, 0.76, 2.6], [0, 0.74, 0], 32],
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ' (' + CK[i][0].toFixed(2) + ')');
}
function blendCam(A, B, w) { return { p: A.p.clone().lerp(B.p, w), l: A.l.clone().lerp(B.l, w), f: lerp(A.f, B.f, w), roll: lerp(A.roll, B.roll, w) }; }
function camAt(t) {
  let c = camKeys(t, CK);
  const we = win(t, END - 0.72, 0.62); if (we > 0) c = blendCam(c, camKeys(t - END, CK_OPEN), we);   // golpe de vuelta a las llamas (bucle)
  let sh = 0; for (const [t0, a] of [[K.treinta, 0.006], [K.rojo, 0.003], [K.falso9, 0.01], [K.f10, 0.008], [K.bomberados12, 0.01]]) if (t > t0) sh += a * Math.exp(-(t - t0) * 8);
  if (sh > 1e-4) { const k = c.p.distanceTo(c.l); c.p.x += sh * k * Math.sin(t * 97); c.p.y += sh * k * Math.cos(t * 83); }
  return c;
}
// luces: en la sartén, de estudio y siguiendo a lo que se mira; en la habitación, el sol por la ventana (que se va) y la noche
const _dzc = v3(DZ.x, 0.9, DZ.z);
function rigFollow(l, t) {
  const R = S.rig, wr = clamp(1 - (l.distanceTo(_dzc) - 2.2) / 1.5), night = S.night || 0;
  if (wr < 0.5) {
    R.key.position.set(l.x - 1.7, Math.max(l.y, 0.6) + 3.0, l.z + 2.1); R.key.target.position.set(l.x, Math.max(0, l.y - 0.6), l.z); R.key.intensity = 16;
    R.rimC.position.set(l.x - 2.3, 0.6, l.z - 1.9); R.rimC.intensity = 1.0; R.rimW.position.set(l.x + 2.3, 0.7, l.z - 1.7); R.rimW.intensity = 1.4;
    R.fill.position.set(l.x + 0.6, l.y + 1.4, l.z + 3.2); R.fill.intensity = 1.6;
  } else {
    R.key.position.set(DZ.x + 0.35, 2.7, DZ.z - 2.7); R.key.target.position.set(DZ.x - 0.1, DY, DZ.z + 0.25); R.key.intensity = 46 * (1 - night) + 4;
    R.rimC.position.set(DZ.x + 0.05, 1.5, DZ.z - 0.55); R.rimC.intensity = 0.4 + 1.6 * night;
    R.rimW.position.set(DZ.x + 0.9, 1.25, DZ.z + 0.7); R.rimW.intensity = 0.7;
    R.fill.position.set(DZ.x + 0.5, 1.7, DZ.z + 1.9); R.fill.intensity = 1.3 - 0.5 * night;
  }
  R.key.target.updateMatrixWorld();
  R.fireL.position.set(PZ.x, 0.3, PZ.z); R.fireL.intensity = wr < 0.5 ? 4.5 * (S.firePow || 1) * (0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 9)) : 0;
  wpos(S.room.bulb, R.lampL.position); R.lampL.intensity = wr > 0.5 ? 3.2 * (S.lampOn || 0) : 0;
  const A = anchors(); R.screenL.position.copy(A.sc).addScaledVector(A.sn, 0.25); R.screenL.intensity = 1.2 * (S.screenOn || 0);
}
// ---------------------------------------------------------------- HUD: cabecera (tema + marca), la pregunta, cuenta atrás, etiquetas y cierre
const ckk = (t, t0, t1, d = 0.6) => (t < t0 || t > t1 + 0.3 ? 0 : clamp((t - t0) / d));
const ckf = (t, t1) => 1 - win(t, t1, 0.28);
function co(t, t0, t1, anchor, txt, sub, o = {}) { const k = ckk(t, t0, t1, o.d || 0.6); if (k > 0) callout(anchor, txt, sub, k, { ...o, fade: ckf(t, t1) }); }
let SECT = [];
function buildHudPlan() {
  SECT = [[-9, 'LA PREGUNTA'], [K.sale, 'LA PLANTILLA'], [K.toca, 'BUSCARLA A MANO'], [K.ahora, 'CON BOMBERADOS'], [K.falso9, 'LA RESPUESTA'], [K.bomberados12, 'PRUÉBALA']];
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
// rótulo con fondo oscuro (legible sobre el fuego)
function plate2(txt, x, y, size, col, k, o = {}) { if (k <= 0.002) return; hg.save(); hg.globalAlpha = clamp(k * 2.5) * (o.a ?? 1); hfont(size); hg.letterSpacing = Math.round(size * 0.12) + 'px';
  const s = typed(txt, o.type === false ? 1 : clamp(k * 1.6)), w = hg.measureText(txt).width + size * 1.1, h = size * 1.6, sc = 1 + 0.25 * (1 - eo(clamp(k / 0.3)));
  hg.translate(x, y); hg.scale(sc, sc); hg.fillStyle = 'rgba(0,0,0,.62)'; rr(hg, -w / 2, -h / 2, w, h, h * 0.22); hg.fill(); glowStroke(col, 2.5, 14); hg.stroke(); noGlow();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; if (o.glow) { hg.shadowColor = col; hg.shadowBlur = o.glow; } hg.fillText(s, size * 0.06, 2); hg.restore(); }
// cuenta atrás 3·2·1 (piénsalo)
function countdown(t, t0, t1, x, y) { const k = ckk(t, t0, t1, 0.25) * ckf(t, t1); if (k <= 0) return; const u = clamp((t - t0) / (t1 - t0)), n = Math.max(1, 3 - Math.floor(u * 3));
  hg.save(); hg.globalAlpha = k; hg.fillStyle = 'rgba(0,0,0,.55)'; hg.beginPath(); hg.arc(x, y, 92, 0, 7); hg.fill();
  hg.strokeStyle = 'rgba(238,242,246,.18)'; hg.lineWidth = 10; hg.beginPath(); hg.arc(x, y, 78, 0, 7); hg.stroke();
  glowStroke('#FF7A2F', 10, 20); hg.beginPath(); hg.arc(x, y, 78, -Math.PI / 2, -Math.PI / 2 + 6.2832 * (1 - u)); hg.stroke(); noGlow();
  const p = (u * 3) % 1, sc = 1 + 0.35 * (1 - eo(clamp(p / 0.25)));
  hg.translate(x, y); hg.scale(sc, sc); hfont(84); hg.fillStyle = HC.white; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(String(n), 3, 6); hg.restore(); }
// bocadillo de comentario
function commentIcon(x, y, s, k) { if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(x, y); const sc = 0.6 + 0.4 * eo(clamp(k / 0.4)); hg.scale(sc, sc);
  glowStroke(HC.white, 5, 12); hg.fillStyle = 'rgba(0,0,0,.5)'; rr(hg, -s, -s * 0.7, s * 2, s * 1.3, s * 0.35); hg.fill(); hg.stroke();
  hg.beginPath(); hg.moveTo(-s * 0.45, s * 0.6); hg.lineTo(-s * 0.6, s * 1.05); hg.lineTo(-s * 0.05, s * 0.6); hg.stroke(); noGlow();
  for (let i = 0; i < 3; i++) { hg.fillStyle = HC.white; hg.beginPath(); hg.arc(-s * 0.5 + i * s * 0.5, -s * 0.05, s * 0.13, 0, 7); hg.fill(); } hg.restore(); }
function hudAt(t) {
  hudBegin();
  const tt = loopT(t);
  headerB(t, sectAt(t));
  // ---- 1: la pregunta
  plate2('¿CLASE B?', 540, 600, 56, '#F2B233', ckk(tt, K.clase - 0.05, K.verdadero - 0.1, 0.3) * ckf(tt, K.verdadero - 0.1), { glow: 16 });
  const kv = ckk(tt, K.verdadero, TV0() - 0.2, 0.35) * ckf(tt, TV0() - 0.2), kf = ckk(tt, K.falso1, TV0() - 0.2, 0.35) * ckf(tt, TV0() - 0.2);
  if (kv > 0 || kf > 0) { const pv = proj(LV.clone().add(v3(0, -0.21, 0))), pf = proj(LF.clone().add(v3(0, -0.21, 0)));
    plate2('VERDADERO', pv.x, pv.y + 40, 30, HC.white, kv); plate2('FALSO', pf.x, pf.y + 40, 30, HC.white, kf); }
  countdown(tt, K.piensalo, K.trampa1 - 0.08, 540, 1560);
  plate2('¡TRAMPA!', 540, 1560, 60, HC.red, ckk(tt, K.trampa1 - 0.05, TV0() + 0.1, 0.25) * ckf(tt, TV0() + 0.1), { glow: 20 });
  // ---- 2: la plantilla
  if (S.room.R.visible) {
    co(t, TV1() + 0.1, K.treinta - 0.15, S.sheet.bubV(), 'TU RESPUESTA: V', null, { dx: -120, dy: -260, color: HC.white, d: 0.35, bg: true });
    plate2('✗ FALLADA', 540, 1560, 64, HC.red, ckk(t, K.treinta, K.toca - 0.1, 0.22) * ckf(t, K.toca - 0.1), { glow: 22, type: false });
    // ---- 3-4: buscarla a mano
    co(t, K.manual3 - 0.05, K.tema - 0.1, D(-0.47, 0.9, 0.12), '¿MANUAL?', null, { dx: 120, dy: -230, color: '#F2B233', d: 0.3, bg: true, size: 40 });
    co(t, K.tema - 0.05, K.pagina3 - 0.05, D(-0.37, 0.82, 0.0), '¿TEMA?', null, { dx: 140, dy: -210, color: '#F2B233', d: 0.3, bg: true, size: 40 });
    co(t, K.pagina3 - 0.05, K.hojas - 0.05, D(-0.17, 0.77, 0.15), '¿PÁGINA?', null, { dx: 130, dy: -230, color: '#F2B233', d: 0.3, bg: true, size: 40 });
    const kp = ckk(t, K.hojas - 0.05, K.apuntes + 0.1, 0.25) * ckf(t, K.apuntes + 0.1);
    if (kp > 0) plate2('PÁG. ' + String(12 + Math.floor(clamp((t - K.hojas) / (K.apuntes - K.hojas)) * 371)).padStart(3, '0'), 540, 1560, 54, HC.white, kp, { type: false });
    const kc = ckk(t, K.va - 0.25, K.ahora - 0.1, 0.25) * ckf(t, K.ahora - 0.1);
    if (kc > 0) { const h = S.hrs || 17.08, hh = Math.floor(h), mm = Math.floor((h - hh) * 60); plate2(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, 540, 1560, 70, '#F2B233', kc, { type: false, glow: 18 }); }
    // ---- 5-8: la app (recreación)
    const kr = ckk(t, K.ahora + 0.3, TF0(), 0.3) * ckf(t, TF0());
    if (kr > 0) { hg.save(); hg.globalAlpha = kr * 0.8; hfont(18, false); hg.letterSpacing = '3px'; hg.fillStyle = HC.grey; hg.textAlign = 'left'; hg.fillText('RECREACIÓN DE LA APP · EJEMPLO', 56, 1790); hg.restore(); }
  }
  // ---- 9: ¡falso!
  plate2('FALSO', 540, 1500, 120, '#FFB547', ckk(t, K.falso9 - 0.03, K.falso9 + 1.0, 0.2) * ckf(t, K.falso9 + 1.0), { glow: 34, type: false });
  // ---- 10: el aceite es un líquido (B)… pero el de cocina tiene clase propia: la F
  if (S.ans.drop.visible || S.ans.bL.visible) {
    co(t, K.liquido - 0.05, K.b10 - 0.1, DP.clone().add(v3(0.04, 0.05, 0)), 'LÍQUIDO', null, { dx: 90, dy: -230, color: '#FFB547', d: 0.3, bg: true, size: 38 });
    co(t, K.b10 + 0.05, K.pero + 0.12, DP.clone().add(v3(0.06, 0.08, 0)), 'LÍQUIDOS → CLASE B', null, { dx: 80, dy: -250, color: HC.white, d: 0.3, bg: true, size: 34 });
  }
  co(t, K.cocina - 0.05, K.f10 - 0.15, v3(0.06, 0.12, 0.05), 'ACEITE DE COCINA', null, { dx: 110, dy: 260, color: '#FFB547', d: 0.3, bg: true, size: 34 });
  plate2('CLASE F', 540, 1520, 100, '#FFB547', ckk(t, K.f10 - 0.05, K.v11 - 0.25, 0.25) * ckf(t, K.v11 - 0.25), { glow: 30, type: false });
  pill('NORMA UNE-EN 2 · CLASIFICACIÓN DE LOS FUEGOS', t, K.propia, K.v11 - 0.25, 1660, HC.white);
  // ---- 11: ¿tú qué habías puesto?
  const kq = ckk(t, K.v11 + 0.05, K.bomberados12 - 0.2, 0.3) * ckf(t, K.bomberados12 - 0.2);
  plate2('¿V o F?', 540, 1530, 96, HC.white, kq, { glow: 20, type: false }); commentIcon(840, 1430, 46, ckk(t, K.comentarios - 0.1, K.bomberados12 - 0.2, 0.3) * ckf(t, K.bomberados12 - 0.2));
  // ---- 12-13: cierre
  const kt = ckk(t, K.falla - 0.05, END - 0.75, 0.3) * ckf(t, END - 0.75);
  if (kt > 0) { const gr = hg.createLinearGradient(0, 1230, 0, 1490); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.3, `rgba(0,0,0,${0.6 * kt})`); gr.addColorStop(0.7, `rgba(0,0,0,${0.6 * kt})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); hg.fillStyle = gr; hg.fillRect(0, 1230, W, 260);
    bigText('FALLA EN CASA,', 540, 1320, 58, HC.white, kt, { ls: 6, glow: 10 }); bigText('NO EN EL EXAMEN', 540, 1400, 58, '#F2B233', ckk(t, K.casa + 0.2, END - 0.75, 0.3) * ckf(t, END - 0.75), { ls: 6, glow: 14 }); }
  bigPill('PRUEBA GRATIS · 5 DÍAS', t, K.pruebala - 0.1, END - 0.75, 1560, '#F2B233');
}
// ---------------------------------------------------------------- un fotograma
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3();
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
function frame(t) {
  placeCam(camAt(t - 1 / 60)); const prevVP = vpOf();
  placeCam(camAt(t - 1 / 36)); const PVP = vpOf();
  const st = camAt(t); placeCam(st); const VP = vpOf();
  stageAt(t); rigFollow(st.l, t);
  flowUpdate(t, VP, PVP); fireUpdate(S.fire, t, VP, PVP); S.gridM.uniforms.camP.value.copy(cam.position);
  const d = Math.max(0.05, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _rt.setFromMatrixColumn(cam.matrixWorld, 0); _up.setFromMatrixColumn(cam.matrixWorld, 1);
  const P0 = cam.position.clone().addScaledVector(_fw, d), Px = P0.clone().addScaledVector(_rt, d * 0.4), Py = P0.clone().addScaledVector(_up, d * 0.4);
  const a = [P0, Px, Py].map(p => p.clone().applyMatrix4(VP)), b = [P0, Px, Py].map(p => p.clone().applyMatrix4(prevVP));
  const m = a.map((q, i) => [q.x - b[i].x, q.y - b[i].y]), dx = [a[1].x - a[0].x, a[1].y - a[0].y], dy = [a[2].x - a[0].x, a[2].y - a[0].y];
  const det = dx[0] * dy[1] - dy[0] * dx[1] || 1e-6, N = [[m[1][0] - m[0][0], m[2][0] - m[0][0]], [m[1][1] - m[0][1], m[2][1] - m[0][1]]];
  const inv = [[dy[1] / det, -dy[0] / det], [-dx[1] / det, dx[0] / det]];
  const J = [N[0][0] * inv[0][0] + N[0][1] * inv[1][0], N[0][0] * inv[0][1] + N[0][1] * inv[1][1], N[1][0] * inv[0][0] + N[1][1] * inv[1][0], N[1][0] * inv[0][1] + N[1][1] * inv[1][1]];
  post.uniforms.m0.value.set(m[0][0], m[0][1]); post.uniforms.a0.value.set(a[0].x, a[0].y); post.uniforms.J.value.set(...J);
  let fl = 0; for (const [t0, k] of [[K.treinta, 0.07], [K.bomberados5, 0.06], [K.falso9, 0.12], [K.f10, 0.08], [K.bomberados12, 0.1]]) if (t > t0) fl += k * Math.exp(-(t - t0) / 0.07);
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
// portada: la sartén en llamas con la V y la F formadas (sin HUD)
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : K.piensalo + 0.3; frame(t);
  const C = window.COVER_CAM || [0.0, 0.58, 2.05, 0, 0.5, 0, 32];
  cam.fov = C[6]; cam.updateProjectionMatrix(); cam.position.set(C[0], C[1], C[2]); cam.up.set(0, 1, 0); cam.lookAt(C[3], C[4], C[5]); cam.updateMatrixWorld(); rigFollow(v3(C[3], C[4], C[5]), t);
  if (window.camOverride) window.camOverride(cam, v3);
  const VP = vpOf(); fireUpdate(S.fire, t, VP, VP); flowUpdate(t, VP, VP);
  post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); post.uniforms.flash.value = 0;
  drawFrame(t); hudBegin();
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '700' }), new FontFace('SpaceMono', `url(${F}SpaceMono-Regular.ttf)`, { weight: '400' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  try { const im = new FontFace('Impact', `url(${F}impact.ttf)`); await im.load(); document.fonts.add(im); } catch (e) { console.log('sin Impact: la placa usa Inter'); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  const font = new FontLoader().parse(await (await fetch('./node_modules/three/examples/fonts/helvetiker_bold.typeface.json')).json());
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    fuego: atL(1, 'fuego'), aceite: atL(1, 'aceite'), sarten: atL(1, 'sarten'), clase: atL(1, 'clase'), b1: atL(1, '=b'), verdadero: atL(1, 'verdadero'), falso1: atL(1, 'falso'), piensalo: atL(1, 'piensalo'), trampa1: atL(1, 'trampa'),
    sale: atL(2, 'sale'), plantilla: atL(2, 'plantilla'), examen2: atL(2, 'examen'), treinta: atL(2, 'treinta'), rojo: atL(2, 'rojo'),
    toca: atL(3, 'toca'), buscarla: atL(3, 'buscarla'), manual3: atL(3, 'manual'), tema: atL(3, 'tema'), pagina3: atL(3, 'pagina'),
    pasas: atL(4, 'pasas'), hojas: atL(4, 'hojas'), indices: atL(4, 'indices'), apuntes: atL(4, 'apuntes'), manual4: atL(4, 'manual'), manual4b: atL(4, 'manual', 2), va: atL(4, '=va'), tarde: atL(4, 'tarde'),
    ahora: atL(5, 'ahora'), mira: atL(5, 'mira'), bomberados5: atL(5, 'bomberados'),
    tocas: atL(6, 'tocas'), pregunta6: atL(6, 'pregunta'), fallado: atL(6, 'fallado'), inteligencia: atL(6, 'inteligencia'), artificial: atL(6, 'artificial'), manual6: atL(6, 'manual'), pagina6: atL(6, 'pagina'),
    define: atL(7, 'define'), rodeos: atL(7, 'rodeos'),
    compara: atL(8, 'compara'), parecidas: atL(8, 'parecidas'), vuelvas: atL(8, 'vuelvas'), caer: atL(8, 'caer'), trampa8: atL(8, 'trampa'),
    falso9: atL(9, 'falso'),
    aceite10: atL(10, 'aceite'), liquido: atL(10, 'liquido'), liquidos: atL(10, 'liquidos'), b10: atL(10, '=b'), pero: atL(10, 'pero'), cocina: atL(10, 'cocina'), propia: atL(10, 'propia'), f10: atL(10, '=f'),
    tu: atL(11, '=tu'), puesto: atL(11, 'puesto'), v11: atL(11, '=v'), f11: atL(11, '=f'), comentarios: atL(11, 'comentarios'),
    bomberados12: atL(12, 'bomberados'), falla: atL(12, 'falla'), casa: atL(12, 'casa'), examen12: atL(12, 'examen'),
    pruebala: atL(13, 'pruebala'), gratis: atL(13, 'gratis'), cinco: atL(13, 'cinco'), dias: atL(13, 'dias'),
  };
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45; }
  buildRig(); buildFloor(); buildFlow();
  S.pan = buildPan();
  S.fire = buildFire({ n0: 2600, nl: 3000, size: 0.022, lsize: 0.065, bright: 1.15, orig: v3(PZ.x, 0.055, PZ.z), rad: 0.11, hgt: 0.5 });
  S.room = buildRoom(); S.person = makePerson(); S.person.position.set(0, 0, 0.6); S.room.R.add(S.person);
  S.books = buildBooks(S.room.R); S.sheets = buildSheets(S.room.R); S.sheet = buildSheet(S.room.R); S.lap = buildLaptop(S.room.R);
  S.ans = buildAnswer(font);
  // brasas de la sartén, brasas del pasillo entre la sartén y la mesa (estelas en los vuelos), polvo de la habitación y motas delante de la pantalla
  S.flow.push(flowCloud(6000, i => [PZ.x + gauss(i) * 0.55, 0.06, PZ.z + gauss(i + 7e4) * 0.55], { size: 2.6, bright: 1.9, seed: 21, col: 0xffa060, rise: 0.38, riseH: 1.7, drift: 0.05, farF: 0.03, keep: 0.5 }));
  S.flow.push(flowCloud(16000, i => [-1.5 + hash(i * 1.31 + 7) * 11.5, 0.05 + hash(i * 4.4) * 0.3, -12.3 + hash(i * 2.17 + 3) * 14], { size: 2.6, bright: 1.35, seed: 22, col: 0xffa868, rise: 0.12, riseH: 2.6, drift: 0.05, farF: 0.03, keep: 0.5 }));
  S.flow.push(flowCloud(2600, i => [DZ.x + (hash(i * 3.1) - 0.5) * 2.4, 0.2 + hash(i * 5.3) * 1.8, DZ.z - 0.6 + hash(i * 7.9) * 2.0], { size: 1.3, bright: 0.45, seed: 23, col: 0xffe2b8, drift: 0.012, farF: 0.05, keep: 0.3 }));
  S.room.R.updateMatrixWorld(true); S.lap.setOpen(1); S.room.R.updateMatrixWorld(true);
  const SC = S.lap.scr.localToWorld(v3(0, 0, 0)), SN = S.lap.scr.localToWorld(v3(0, 0, 1)).sub(SC).normalize();
  S.flow.push(flowCloud(1600, i => [SC.x + (hash(i * 2.3) - 0.5) * 0.5, SC.y + (hash(i * 4.1) - 0.5) * 0.32, SC.z + 0.04 + hash(i * 6.7) * 0.5], { size: 1.0, bright: 0.55, seed: 24, col: 0xbfefff, nearF: 0.02, farF: 0.6, drift: 0.004, keep: 0.4 }));
  S.lap.setOpen(0); S.room.R.updateMatrixWorld(true);
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
