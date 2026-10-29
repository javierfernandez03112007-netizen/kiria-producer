// «Ingeniería Civil»: un arquitecto puede proyectar un puente; un ingeniero de Caminos no puede proyectar tu casa.
// Un plano gigante en el vacío del que salen (como un libro desplegable) el puente y la casa; la ley y el mazo del Supremo;
// el «?» de celosía; el duelo Caminos–Arquitectura; lo que se estudia (suelos y la torre de Pisa, el puente con el tren,
// la presa) y el mapa de la alta velocidad; el polideportivo, el libro de la ley con sus edificios, el cartel partido y,
// por la ventana de la casa, alguien que duerme. Aristas blancas sobre negro, flujo óptico y HUD técnico.
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
    void main(){ vec3 c = vec3(0.); for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) c += texture2D(tA, vUv + vec2(float(i), float(j)) * px).rgb; c = c / 9.0;
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
scene.background = new THREE.Color(0x000000); scene.fog = new THREE.FogExp2(0x000000, 0.055);
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
let WORDS = [], END = 61.6, VENV = [];
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
  const key = new THREE.SpotLight(0xfff4ea, 30, 16, 0.6, 0.75, 1.3); key.position.set(-1.7, 3.3, 2.1); key.target.position.set(0, 0.15, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.01; key.shadow.radius = 4; key.shadow.camera.near = 0.5; key.shadow.camera.far = 14;
  scene.add(key, key.target);
  const rimC = new THREE.PointLight(0x7fe6ff, 1.0, 9, 1.4), rimW = new THREE.PointLight(0xffb070, 1.2, 9, 1.4), fill = new THREE.PointLight(0xc8d6ff, 1.8, 11, 1.4);
  // y la luz cálida de dentro de la casa (solo cuando la cámara entra)
  const houseL = new THREE.PointLight(0xffc98a, 0, 1.2, 1.6);
  scene.add(rimC, rimW, fill, houseL); S.rig = { key, rimC, rimW, fill, houseL };
}
// materiales de la maqueta: caras oscuras y aristas blancas (estilo plano técnico)
const DARK = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.82, metalness: 0.05 });
const DARK2 = new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.8, metalness: 0.05 });
const PAPER = new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.9 });
const TEAL = 0x62e3d4, AMBER = 0xffb547, RED = 0xff5247, EDGE = 0xe6ecf2;
function solid(geo, m = DARK, ew = 1.5, ec = EDGE) { const s = new THREE.Mesh(geo, m); s.castShadow = true; s.receiveShadow = true; edges(s, ec, ew, 28, 1); return s; }
function bx(w, h, d, m, ew, ec) { return solid(new THREE.BoxGeometry(w, h, d), m, ew, ec); }
function wpos(o, out = new THREE.Vector3()) { o.updateWorldMatrix(true, false); return out.setFromMatrixPosition(o.matrixWorld); }
// segmentos sueltos (líneas gruesas) que se pueden mover cada fotograma: setSeg(i, a, b)
function segSet(n, color, width = 2, opacity = 1) {
  const g = new LineSegmentsGeometry(), arr = new Float32Array(n * 6); g.setPositions(arr);
  const l = new LineSegments2(g, lineMat(color, width, opacity)); l.frustumCulled = false; l.renderOrder = 4;
  l.userData = { arr, n, set(i, a, b) { arr.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); }, flush() { const ib = g.attributes.instanceStart.data; ib.array.set(arr); ib.needsUpdate = true; } };   // en el mismo búfer (sin crear otro cada fotograma)
  return l;
}
// polilínea que se dibuja poco a poco (k 0→1): instanceCount de sus segmentos
function drawLine(pts, color, width = 2, opacity = 1) { const l = polyline(pts, lineMat(color, width, opacity)); l.userData.nseg = pts.length - 1; l.frustumCulled = false; return l; }
function drawK(l, k) { const n = l.userData.nseg, m = Math.floor(n * clamp(k)); l.geometry.instanceCount = m; l.visible = m > 0; }
// texto plano (cartel) sobre un plano 3D
function textPlane(w, h, draw, px = 512) { const t = canvasTex(px, Math.round(px * h / w), draw); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); m.renderOrder = 5; return m; }
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
  // todo el pasillo por el que vuela la cámara (del plano a la presa, el mapa y el libro, y vuelta): polvo con estelas
  S.flow = [
    flowCloud(16000, i => [-4 + hash(i * 3.1) * 30, 0.04 + Math.pow(hash(i * 5.7), 1.6) * 3.2, 4 - hash(i * 8.3) * 27], { size: 1.8, bright: 0.8, farF: 0.03, seed: 2 }),
    flowCloud(5000, i => [gauss(i) * 2.6, 0.03 + Math.abs(gauss(i + 9e3)) * 0.9, gauss(i + 2e4) * 1.8], { size: 1.3, bright: 0.5, seed: 1, nearF: 0.05, farF: 0.08 }),        // motas sobre el plano
    flowCloud(2600, i => { const th = hash(i * 1.9) * 6.283, ph = Math.acos(hash(i * 4.4) * 1.6 - 0.6), r = 55 + hash(i * 6.1) * 45; return [10 + r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), -9 + r * Math.sin(ph) * Math.sin(th)]; },
      { size: 1.3, bright: 0.9, farF: 0.002, nearF: 1, drift: 0, seed: 3 }),                                                                                        // estrellas lejanas
    flowCloud(1400, i => [1.55 + (hash(i * 2.3) - 0.5) * 0.5, 0.02 + hash(i * 4.1) * 0.32, 0.25 + (hash(i * 6.7) - 0.5) * 0.4], { size: 1.0, bright: 0.55, nearF: 0.01, farF: 2.5, drift: 0.003, seed: 4, col: 0xffe3c0 }),   // polvo de la habitación (casa)
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
  const d = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshBasicMaterial({ color: 0x000000 })); d.rotation.x = -Math.PI / 2; d.position.set(10, -0.002, -9); scene.add(d);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: 0.6 })); sh.rotation.x = -Math.PI / 2; sh.position.set(10, 0.0004, -9); sh.receiveShadow = true; scene.add(sh);
  S.gridM = new THREE.ShaderMaterial({ vertexShader: GRID_VS, fragmentShader: GRID_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { op: { value: 1 }, camP: { value: new THREE.Vector3() } } });
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), S.gridM); gr.rotation.x = -Math.PI / 2; gr.position.set(10, 0.0008, -9); gr.layers.set(1); scene.add(gr);
  S.floor = { d, sh, gr };
}
// ---------------------------------------------------------------- zonas (metros): A plano (puente, casa, ley, mazo, «?»), B duelo, C suelo + Pisa + puente con tren,
// D presa → mapa de España (E: polideportivo y casa sobre el mapa), F el libro de la ley con sus edificios
const ZA = v3(0, 0, 0), BRX = v3(-1.0, 0, -0.2), HSX = v3(1.55, 0, 0.35);
const ZB = v3(6, 0, -4.5), ZC = v3(11.5, 0, -9), ZD = v3(17.6, 0, -13.4), ZF = v3(21.4, 0, -17.6);
const QPOS = v3(-0.25, 0.55, -1.45);

// ---------------------------------------------------------------- el plano (hoja gigante con rejilla, cotas y cajetín)
const SHW = 7, SHH = 4.2, SPX = 2048 / SHW;
function buildSheet() {
  const sx = x => (x + SHW / 2) * SPX, sz = z => (z + SHH / 2) * SPX;
  const tex = canvasTex(2048, Math.round(SHH * SPX), (g, w, h) => {
    g.fillStyle = '#0b1016'; g.fillRect(0, 0, w, h);
    for (let x = 0; x <= w; x += SPX / 20) { g.fillStyle = Math.round(x / (SPX / 20)) % 5 ? 'rgba(160,190,220,.07)' : 'rgba(160,190,220,.16)'; g.fillRect(x, 0, 1.2, h); }
    for (let y = 0; y <= h; y += SPX / 20) { g.fillStyle = Math.round(y / (SPX / 20)) % 5 ? 'rgba(160,190,220,.07)' : 'rgba(160,190,220,.16)'; g.fillRect(0, y, w, 1.2); }
    g.strokeStyle = 'rgba(230,236,242,.55)'; g.lineWidth = 3; g.strokeRect(24, 24, w - 48, h - 48); g.lineWidth = 1.5; g.strokeRect(36, 36, w - 72, h - 72);
    // cajetín
    const cx = w - 560, cy = h - 230; g.strokeRect(cx, cy, 524, 194); g.beginPath(); g.moveTo(cx, cy + 70); g.lineTo(cx + 524, cy + 70); g.moveTo(cx, cy + 132); g.lineTo(cx + 524, cy + 132); g.moveTo(cx + 300, cy + 70); g.lineTo(cx + 300, cy + 194); g.stroke();
    g.fillStyle = 'rgba(230,236,242,.75)'; g.font = '700 34px SpaceMono, monospace'; g.fillText('PROYECTO Nº 01', cx + 22, cy + 48);
    g.font = '400 24px SpaceMono, monospace'; g.fillText('PUENTE · VIVIENDA', cx + 22, cy + 110); g.fillText('E 1:100', cx + 322, cy + 110); g.fillText('FIRMA: ______', cx + 22, cy + 172); g.fillText('HOJA 1/1', cx + 322, cy + 172);
    // cotas del puente y de la casa (dibujo tenue)
    g.strokeStyle = 'rgba(230,236,242,.35)'; g.lineWidth = 2; g.setLineDash([14, 10]);
    g.beginPath(); g.moveTo(sx(BRX.x - 1), sz(BRX.z + 0.55)); g.lineTo(sx(BRX.x + 1), sz(BRX.z + 0.55)); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(230,236,242,.32)'; g.font = '400 19px SpaceMono, monospace'; g.textAlign = 'center'; g.fillText('L = 40,00 m', sx(BRX.x), sz(BRX.z + 0.55) - 14);
    g.strokeRect(sx(HSX.x - 0.3), sz(HSX.z - 0.25), 0.6 * SPX, 0.5 * SPX); g.fillText('VIVIENDA', sx(HSX.x), sz(HSX.z + 0.38));
    g.textAlign = 'left'; g.fillText('ALZADO', sx(BRX.x - 1.05), sz(BRX.z - 0.5));
    for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(230,236,242,.22)'; g.fillRect(70, 80 + i * 34, 220 + (i * 53) % 170, 3); }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(SHW, SHH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55 }));
  m.rotation.x = -Math.PI / 2; m.position.set(ZA.x, 0.003, ZA.z); m.receiveShadow = true; scene.add(m);
  return m;
}

// ---------------------------------------------------------------- el puente de arco (sale del plano como un libro desplegable)
const ARC_R = 1.7225, ARC_C = -1.4025, ARC_P0 = Math.asin(1 / ARC_R);           // arco circular: cuerda 2 m, flecha 0,32 m
const arcXY = s => [ARC_R * Math.sin(s), ARC_C + ARC_R * Math.cos(s)];
function buildBridge() {
  const G = new THREE.Group(); G.position.copy(BRX); scene.add(G);
  // arco (dovelas) en un grupo que gira desde el papel (bisagra en y = 0)
  const arch = new THREE.Group(); G.add(arch);
  const NS = 18;
  for (let i = 0; i < NS; i++) {
    const s0 = -ARC_P0 + (2 * ARC_P0) * i / NS, s1 = -ARC_P0 + (2 * ARC_P0) * (i + 1) / NS, [x0, y0] = arcXY(s0), [x1, y1] = arcXY(s1);
    const L = Math.hypot(x1 - x0, y1 - y0) * 1.01, b = bx(L, 0.04, 0.18, DARK, 1.4); b.position.set((x0 + x1) / 2, (y0 + y1) / 2 + 0.02, 0); b.rotation.z = Math.atan2(y1 - y0, x1 - x0); arch.add(b);
  }
  // tablero, montantes y estribos: crecen desde el papel
  const deck = new THREE.Group(); G.add(deck);
  const dk = bx(2.36, 0.04, 0.26, DARK2, 1.6); dk.position.y = 0.36; deck.add(dk);
  for (const x of [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75]) { const ya = arcXY(Math.asin(x / ARC_R))[1] + 0.04, h = 0.34 - ya; if (h < 0.02) continue; const p = bx(0.026, h, 0.14, DARK, 1.2); p.position.set(x, ya + h / 2, 0); deck.add(p); }
  const rails = segSet(2 + 2 * 25, EDGE, 1.4, 0.9); deck.add(rails);
  let k = 0; for (const z of [-0.12, 0.12]) { rails.userData.set(k++, v3(-1.18, 0.43, z), v3(1.18, 0.43, z)); for (let i = 0; i < 25; i++) { const x = -1.15 + i * 2.3 / 24; rails.userData.set(k++, v3(x, 0.38, z), v3(x, 0.43, z)); } } rails.userData.flush();
  const ab = []; for (const sx of [-1, 1]) { const a = bx(0.18, 0.38, 0.32, DARK2, 1.5); a.position.set(sx * 1.22, 0.19, 0); G.add(a); ab.push(a); }
  // la línea del arco en el papel (la dibuja el compás)
  const pts = []; for (let i = 0; i <= 90; i++) { const s = -ARC_P0 + 2 * ARC_P0 * i / 90, [x, y] = arcXY(s); pts.push(v3(BRX.x + x, 0.006, BRX.z - y)); }
  const line = drawLine(pts, 0xffffff, 3.6, 1); scene.add(line);
  return { G, arch, deck, ab, line, dk };
}
// el compás gigante (dos patas, cabeza y mango)
function buildCompass() {
  const G = new THREE.Group(); scene.add(G);
  const M = new THREE.MeshStandardMaterial({ color: 0xb9c2cc, roughness: 0.35, metalness: 0.8 });
  const legA = new THREE.Group(), legB = new THREE.Group(); G.add(legA, legB);
  const LG = 1.3;
  for (const L of [legA, legB]) { const c = cyl(0.016, 0.011, LG, M, 12); c.position.y = -LG / 2; L.add(c); const tip = cyl(0.0, 0.011, 0.06, M, 8); tip.position.y = -LG - 0.03; L.add(tip); }
  const head = cyl(0.045, 0.045, 0.06, M, 20); head.rotation.x = Math.PI / 2; G.add(head);
  const grip = cyl(0.016, 0.016, 0.16, M, 12); grip.position.y = 0.11; G.add(grip);
  const lead = sph(0.016, basicGlow(0xffffff, 3.2)); legB.add(lead); lead.position.y = -LG - 0.055;
  return { G, legA, legB, LG };
}
// ---------------------------------------------------------------- la casa (con ventana de verdad y habitación dentro)
function buildHouse(withRoom) {
  const G = new THREE.Group(), P = new THREE.Group(); G.add(P);            // P: bisagra en la arista trasera (para desplegarla)
  const w = 0.46, d = 0.38, h = 0.27, wt = 0.012, wx = 0.08, wy = 0.15, ww = 0.12, wh = 0.095;
  const B = new THREE.Group(); B.position.z = d / 2; P.add(B); P.position.z = -d / 2;
  const fz = d / 2 - wt / 2, M = DARK2;
  const wall = (W_, H_, x, y) => { const b = bx(W_, H_, wt, M, 1.4); b.position.set(x, y, fz); B.add(b); };
  // fachada con el hueco de la ventana
  wall(w / 2 + wx - ww / 2, h, -w / 2 + (w / 2 + wx - ww / 2) / 2, h / 2);
  wall(w / 2 - wx - ww / 2, h, w / 2 - (w / 2 - wx - ww / 2) / 2, h / 2);
  wall(ww, wy - wh / 2, wx, (wy - wh / 2) / 2); wall(ww, h - wy - wh / 2, wx, (h + wy + wh / 2) / 2);
  for (const [W_, D_, x, z] of [[w, wt, 0, -d / 2 + wt / 2], [wt, d, -w / 2 + wt / 2, 0], [wt, d, w / 2 - wt / 2, 0]]) { const b = bx(W_, h, D_, M, 1.4); b.position.set(x, h / 2, z); B.add(b); }
  // tejado a dos aguas
  const rs = new THREE.Shape(); rs.moveTo(-w / 2 - 0.03, 0); rs.lineTo(w / 2 + 0.03, 0); rs.lineTo(0, 0.17); rs.closePath();
  const rg = new THREE.ExtrudeGeometry(rs, { depth: d + 0.06, bevelEnabled: false }); rg.translate(0, 0, -(d + 0.06) / 2);
  const roof = solid(rg, DARK, 1.5); roof.position.y = h; B.add(roof);
  const door = bx(0.075, 0.13, 0.006, DARK, 1.2); door.position.set(-0.12, 0.065, d / 2 + 0.002); B.add(door);
  // marco y cruz de la ventana
  const fr = segSet(6, EDGE, 1.8, 1); B.add(fr);
  const zf = d / 2 + 0.003, X0 = wx - ww / 2, X1 = wx + ww / 2, Y0 = wy - wh / 2, Y1 = wy + wh / 2;
  [[X0, Y0, X1, Y0], [X1, Y0, X1, Y1], [X1, Y1, X0, Y1], [X0, Y1, X0, Y0], [wx, Y0, wx, Y1], [X0, wy, X1, wy]].forEach((q, i) => fr.userData.set(i, v3(q[0], q[1], zf), v3(q[2], q[3], zf))); fr.userData.flush();
  const R = { G, P, B, win: v3(wx, wy, d / 2), w, d, h };
  if (withRoom) {
    const room = new THREE.Mesh(new THREE.BoxGeometry(w - 2 * wt - 0.002, h - 0.002, d - 2 * wt - 0.002), new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 1, side: THREE.BackSide }));
    room.position.set(0, h / 2, 0); room.receiveShadow = true; B.add(room);
    const WOOD = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.8 }), SHEET = new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.95 }), BLANK = new THREE.MeshStandardMaterial({ color: 0x5f6f86, roughness: 0.95 });
    const bed = new THREE.Group(); bed.position.set(0.06, 0, -0.07); B.add(bed);
    const frame = rbox(0.24, 0.13, 0.04, WOOD, 0.006); frame.rotation.x = -Math.PI / 2; frame.position.y = 0.03; bed.add(frame);
    const mat_ = rbox(0.23, 0.12, 0.022, SHEET, 0.008); mat_.rotation.x = -Math.PI / 2; mat_.position.y = 0.06; bed.add(mat_);
    const head = rbox(0.01, 0.14, 0.09, WOOD, 0.004); head.position.set(-0.122, 0.07, 0); head.rotation.y = Math.PI / 2; head.rotation.y = 0; head.scale.set(1, 1, 1); bed.add(head);
    const pillow = rbox(0.05, 0.08, 0.016, SHEET, 0.007); pillow.rotation.x = -Math.PI / 2; pillow.position.set(-0.088, 0.078, 0); bed.add(pillow);
    const blanket = new THREE.Group(); blanket.position.set(0.035, 0.072, 0); bed.add(blanket);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), BLANK); bl.scale.set(0.085, 0.022, 0.058); bl.castShadow = true; blanket.add(bl);
    const SKIN = new THREE.MeshStandardMaterial({ color: 0xc9a58a, roughness: 0.7 }), HAIR = new THREE.MeshStandardMaterial({ color: 0x2a211c, roughness: 0.8 });
    const hd = sph(0.019, SKIN, 20, 14); hd.position.set(-0.078, 0.098, 0.004); bed.add(hd);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.0208, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), HAIR); hair.position.copy(hd.position); hair.rotation.z = Math.PI / 2 + 0.55; bed.add(hair);
    const LID = new THREE.MeshBasicMaterial({ color: 0x3a2a22 });
    for (const z of [-0.0068, 0.0068]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.0055, 0.0008, 0.0016), LID); e.position.set(hd.position.x + 0.006, hd.position.y + 0.0182, hd.position.z + z); e.rotation.z = -0.35; bed.add(e); }
    const nose = sph(0.0032, SKIN, 10, 8); nose.position.set(hd.position.x + 0.011, hd.position.y + 0.0175, hd.position.z); bed.add(nose);
    const ns = rbox(0.04, 0.04, 0.05, WOOD, 0.004); ns.rotation.x = -Math.PI / 2; ns.position.set(-0.17, 0.025, -0.11); B.add(ns);
    const lamp = sph(0.012, basicGlow(0xffc070, 2.2)); lamp.position.set(-0.17, 0.075, -0.11); B.add(lamp);
    const shade = cyl(0.012, 0.02, 0.022, new THREE.MeshStandardMaterial({ color: 0xf0e2c8, emissive: 0xffb860, emissiveIntensity: 0.9, side: THREE.DoubleSide }), 16); shade.position.copy(lamp.position).add(v3(0, 0.01, 0)); B.add(shade);
    const pic = textPlane(0.07, 0.05, (g, w_, h_) => { g.fillStyle = '#20252c'; g.fillRect(0, 0, w_, h_); g.strokeStyle = '#d8d0c0'; g.lineWidth = 10; g.strokeRect(5, 5, w_ - 10, h_ - 10); g.strokeStyle = '#8fa3b8'; g.lineWidth = 6; g.beginPath(); g.moveTo(30, h_ - 40); g.quadraticCurveTo(w_ / 2, 30, w_ - 30, h_ - 40); g.stroke(); }, 256);
    pic.position.set(0.06, 0.19, -d / 2 + wt + 0.002); B.add(pic);
    R.blanket = blanket; R.head = hd; R.lamp = lamp; R.bedW = () => bed.localToWorld(v3(-0.07, 0.11, 0));
  }
  return R;
}
// ---------------------------------------------------------------- el libro de la ley (cerrado o abierto: tapa con bisagra en el lomo)
function buildBook(s = 1) {
  const G = new THREE.Group(); G.scale.setScalar(s);
  const w = 0.42, d = 0.58, t = 0.014, pg = 0.05;
  const coverTex = canvasTex(420, 580, (g, W_, H_) => { g.fillStyle = '#1a1f27'; g.fillRect(0, 0, W_, H_); g.strokeStyle = '#d8c48a'; g.lineWidth = 6; g.strokeRect(22, 22, W_ - 44, H_ - 44); g.lineWidth = 2; g.strokeRect(34, 34, W_ - 68, H_ - 68);
    g.fillStyle = '#e8d9a8'; g.textAlign = 'center'; g.font = '700 62px Inter'; g.fillText('LEY', W_ / 2, 190); g.font = '900 64px Inter'; g.fillText('38/1999', W_ / 2, 262);
    g.font = '500 25px Inter'; g.fillText('DE ORDENACIÓN', W_ / 2, 350); g.fillText('DE LA EDIFICACIÓN', W_ / 2, 384); g.font = '500 20px SpaceMono'; g.fillText('5 DE NOVIEMBRE', W_ / 2, 500); });
  const CM = new THREE.MeshStandardMaterial({ color: 0x1a1f27, roughness: 0.6 }), PM = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.95 });
  const back = bx(w, t, d, CM, 1.4); back.position.set(w / 2, t / 2, 0); G.add(back);
  const pagesR = bx(w - 0.02, pg, d - 0.03, PM, 1.0); pagesR.position.set(w / 2, t + pg / 2, 0); G.add(pagesR);
  // página derecha (se ve con el libro abierto): artículo 10
  const pageTex = canvasTex(420, 560, (g, W_, H_) => { g.fillStyle = '#e4ded0'; g.fillRect(0, 0, W_, H_); g.fillStyle = '#2b2f36'; g.font = '700 26px Inter'; g.fillText('Artículo 10', 36, 64); g.font = '500 17px Inter';
    const L = ['El proyectista.', '', '2.a) Cuando el proyecto tenga por', 'objeto edificios de uso administrativo,', 'sanitario, religioso, residencial en', 'todas sus formas, docente y cultural,', 'la titulación académica y profesional', 'habilitante será la de', '', '']; L.forEach((s_, i) => g.fillText(s_, 36, 110 + i * 30));
    g.font = '900 34px Inter'; g.fillText('ARQUITECTO.', 36, 110 + 8 * 30 + 6); for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(43,47,54,.35)'; g.fillRect(36, 420 + i * 22, 300 + (i * 37) % 50, 7); } });
  const page = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.03, d - 0.04), new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.95 })); page.rotation.x = -Math.PI / 2; page.position.set(w / 2, t + pg + 0.0015, 0); page.receiveShadow = true; G.add(page);
  // mitad izquierda (tapa + páginas) construida abierta, en x < 0; gira sobre el lomo con la bisagra a media altura de las páginas:
  // con rotation.z = -π queda cerrada encima (la tapa arriba, con su portada mirando hacia arriba)
  const yp = t + pg / 2, hinge = new THREE.Group(); hinge.position.y = yp; G.add(hinge);
  const cv = bx(w, t, d, CM, 1.4); cv.position.set(-w / 2, t / 2 - yp, 0); hinge.add(cv);
  const pagesL = bx(w - 0.02, pg, d - 0.03, PM, 1.0); pagesL.position.set(-w / 2, 0, 0); hinge.add(pagesL);
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.03, d - 0.04), new THREE.MeshStandardMaterial({ color: 0xe4ded0, roughness: 0.95 })); lp.rotation.x = -Math.PI / 2; lp.position.set(-w / 2, pg / 2 + 0.0015, 0); hinge.add(lp);
  const ct = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.01, d - 0.01), new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: coverTex, emissiveIntensity: 0.25 }));
  ct.rotation.x = Math.PI / 2; ct.rotation.z = Math.PI; ct.position.set(-w / 2, -yp - 0.0015, 0); hinge.add(ct);
  const spine = bx(t * 1.2, pg + 2 * t, d, CM, 1.2); spine.position.set(-t * 0.4, (pg + 2 * t) / 2, 0); G.add(spine);
  hinge.userData.pagesL = pagesL; hinge.userData.lp = lp;
  return { G, hinge, page, w, d, top: t + pg + t };
}
// ---------------------------------------------------------------- el mazo del Supremo y su base
function buildGavel() {
  const G = new THREE.Group(); scene.add(G);
  const WD = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.55, metalness: 0.05 }), GD = new THREE.MeshStandardMaterial({ color: 0xc9a85a, roughness: 0.35, metalness: 0.7 });
  const base = cyl(0.11, 0.12, 0.035, WD, 32); base.position.y = 0.0175; G.add(base); edges(base, EDGE, 1, 40, 0.5);
  const arm = new THREE.Group(); arm.position.set(0.36, 0.083, 0); G.add(arm);            // pivote: el extremo del mango
  const handle = cyl(0.011, 0.014, 0.32, WD, 14); handle.rotation.z = Math.PI / 2; handle.position.x = -0.16; arm.add(handle);
  const head = cyl(0.048, 0.048, 0.17, WD, 24); head.rotation.x = Math.PI / 2; head.position.x = -0.36; arm.add(head);
  for (const z of [-0.07, 0.07]) { const r = cyl(0.05, 0.05, 0.014, GD, 24); r.rotation.x = Math.PI / 2; r.position.set(-0.36, 0, z); arm.add(r); }
  return { G, arm, base };
}
// ---------------------------------------------------------------- «?» de celosía (dos cordones + montantes y diagonales); las barras vuelan desde el puente
function buildQ() {
  const C = [];      // línea media en el plano (u, v), unidades ≈ m
  for (let i = 0; i <= 26; i++) { const a = Math.PI * 1.0 - i / 26 * Math.PI * 1.45; C.push([0.25 * Math.cos(a), 0.62 + 0.25 * Math.sin(a)]); }
  const [ex, ey] = C[C.length - 1]; for (let i = 1; i <= 6; i++) { const u = i / 6; C.push([lerp(ex, 0, u), lerp(ey, 0.22, u)]); }
  const N = C.length, off = 0.04, top = [], bot = [];
  for (let i = 0; i < N; i++) { const a = C[Math.max(0, i - 1)], b = C[Math.min(N - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1, nx = -ty / L, ny = tx / L;
    top.push(v3(C[i][0] + nx * off, C[i][1] + ny * off, 0)); bot.push(v3(C[i][0] - nx * off, C[i][1] - ny * off, 0)); }
  const S_ = [];
  for (let i = 0; i < N - 1; i++) { S_.push([top[i], top[i + 1]], [bot[i], bot[i + 1]], [top[i], bot[i]], [i % 2 ? top[i] : bot[i], i % 2 ? bot[i + 1] : top[i + 1]]); }
  S_.push([top[N - 1], bot[N - 1]]);
  // el punto: un cubito de celosía
  const c = v3(0, 0.02, 0), h = 0.05; const q = [[-h, -h], [h, -h], [h, h], [-h, h]];
  for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4]; S_.push([v3(c.x + a[0], c.y + a[1], -h), v3(c.x + b[0], c.y + b[1], -h)], [v3(c.x + a[0], c.y + a[1], h), v3(c.x + b[0], c.y + b[1], h)], [v3(c.x + a[0], c.y + a[1], -h), v3(c.x + a[0], c.y + a[1], h)]); }
  const segs = segSet(S_.length, EDGE, 2.6, 1); scene.add(segs);
  // de dónde sale cada barra: un punto del puente
  const from = S_.map((s, i) => { const u = hash(i * 3.7), x = BRX.x - 1.1 + u * 2.2, y = 0.05 + hash(i * 1.9) * 0.4; return [v3(x, y, BRX.z + (hash(i * 5.3) - 0.5) * 0.25), v3(x + (hash(i * 2.2) - 0.5) * 0.2, y + 0.06, BRX.z + 0.05)]; });
  return { segs, S: S_, from, n: S_.length, dotFrom: S_.length - 12 };
}
// ---------------------------------------------------------------- el duelo: fachada que dibuja un lápiz (Arquitectura) y viga con su ley de momentos (Caminos)
function buildDuel() {
  const G = new THREE.Group(); G.position.copy(ZB); scene.add(G);
  // fachada (Arquitectura): polilíneas en orden de dibujo; el lápiz sigue la punta
  const F = new THREE.Group(); G.add(F);                                   // abajo: Arquitectura (en el suelo)
  const fw = 0.66, fh = 0.52, polys = [];
  polys.push([[-fw / 2, 0], [-fw / 2, fh], [0, fh + 0.2], [fw / 2, fh], [fw / 2, 0], [-fw / 2, 0]]);
  const winR = [];
  for (const r of [0, 1]) for (const c of [-1, 0, 1]) { if (r === 0 && c === 0) continue; const x = c * 0.2, y = 0.12 + r * 0.22, a = 0.06, b = 0.07; polys.push([[x - a, y], [x + a, y], [x + a, y + b * 1.3], [x - a, y + b * 1.3], [x - a, y]]); winR.push([x, y + b * 0.65, a * 2, b * 1.3]); }
  polys.push([[-0.05, 0], [-0.05, 0.17], [0.05, 0.17], [0.05, 0]]);
  polys.push([[-0.07, fh + 0.07], [0.07, fh + 0.07], [0.07, fh + 0.12], [-0.07, fh + 0.12], [-0.07, fh + 0.07]]);
  const pts = []; polys.forEach(p => { for (let i = 0; i + 1 < p.length; i++) pts.push([p[i], p[i + 1]]); });
  const fl = segSet(pts.length, TEAL, 2.4, 1); F.add(fl); pts.forEach((s, i) => fl.userData.set(i, v3(s[0][0], s[0][1], 0), v3(s[1][0], s[1][1], 0))); fl.userData.flush();
  // ventanas que se encienden (y una silueta en cada una)
  const lit = winR.map(([x, y, w, h], i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.9), new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0, toneMapped: false, depthWrite: false })); m.position.set(x, y, -0.002); F.add(m); return m; });
  const people = winR.map(([x, y, w, h], i) => { const p = textPlane(w * 0.8, h * 0.85, (g, W_, H_) => { g.fillStyle = 'rgba(25,20,16,.9)'; g.beginPath(); g.arc(W_ * 0.5, H_ * 0.38, H_ * 0.16, 0, 7); g.fill(); g.beginPath(); g.ellipse(W_ * 0.5, H_ * 0.95, W_ * 0.3, H_ * 0.38, 0, Math.PI, 0); g.fill(); }, 128); p.position.set(x + (i % 2 ? 0.015 : -0.012), y - 0.004, 0.001); p.material.opacity = 0; F.add(p); return p; });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), new THREE.MeshBasicMaterial({ color: 0x0b1416, transparent: true, opacity: 0.85, depthWrite: false })); back.position.set(0, fh / 2, -0.004); F.add(back);
  const pencil = new THREE.Group(); G.add(pencil);
  const PEN = new THREE.MeshStandardMaterial({ color: 0x2e8f86, roughness: 0.5 }), WOODM = new THREE.MeshStandardMaterial({ color: 0xd8b78a, roughness: 0.7 });
  const body = cyl(0.013, 0.013, 0.24, PEN, 6); body.position.y = 0.15; pencil.add(body);
  const cone = cyl(0.013, 0.002, 0.035, WOODM, 6); cone.position.y = 0.0175 + 0.0; pencil.add(cone); cone.position.y = 0.017;
  // viga (Caminos): apoyos, carga repartida, flecha y ley de momentos rayada
  const V = new THREE.Group(); V.position.set(0, 1.18, 0); G.add(V);              // arriba: Caminos (flotando): pantalla partida en vertical
  const beam = bx(0.86, 0.05, 0.08, DARK2, 1.6, AMBER); V.add(beam);
  for (const sx of [-1, 1]) { const s = solid(new THREE.ConeGeometry(0.045, 0.07, 3), DARK, 1.4, AMBER); s.position.set(sx * 0.4, -0.06, 0); V.add(s); }
  const pier = bx(0.9, 0.012, 0.12, DARK, 1.0); pier.position.y = -0.1; V.add(pier);
  const loads = segSet(11 * 3 + 1, AMBER, 2, 1); V.add(loads); { let k = 0; for (let i = 0; i <= 10; i++) { const x = -0.4 + i * 0.08; loads.userData.set(k++, v3(x, 0.17, 0), v3(x, 0.035, 0)); loads.userData.set(k++, v3(x, 0.035, 0), v3(x - 0.012, 0.055, 0)); loads.userData.set(k++, v3(x, 0.035, 0), v3(x + 0.012, 0.055, 0)); } loads.userData.set(k++, v3(-0.4, 0.17, 0), v3(0.4, 0.17, 0)); loads.userData.flush(); }
  const mpts = []; for (let i = 0; i <= 40; i++) { const x = -0.4 + i * 0.02; mpts.push(v3(x, -0.17 - 0.16 * (1 - (x / 0.4) ** 2), 0)); }
  const mline = drawLine(mpts, AMBER, 2.4, 1); V.add(mline);
  const hatch = segSet(19, AMBER, 1.2, 0.6); V.add(hatch); for (let i = 0; i < 19; i++) { const x = -0.36 + i * 0.04; hatch.userData.set(i, v3(x, -0.17, 0), v3(x, -0.17 - 0.16 * (1 - (x / 0.4) ** 2), 0)); } hatch.userData.flush();
  const axis = segSet(1, AMBER, 1.4, 0.8); V.add(axis); axis.userData.set(0, v3(-0.42, -0.17, 0), v3(0.42, -0.17, 0)); axis.userData.flush();
  const defl = drawLine(Array.from({ length: 31 }, (_, i) => { const x = -0.4 + i * 0.8 / 30; return v3(x, -0.03 - 0.03 * (1 - (x / 0.4) ** 2), 0.05); }), 0xffffff, 1.6, 0.8); V.add(defl);
  const formula = textPlane(0.42, 0.09, (g, W_, H_) => { g.fillStyle = '#FFB547'; g.font = '700 74px SpaceMono'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('M = qL²/8', W_ / 2, H_ / 2); }, 512);
  formula.position.set(0, 0.3, 0); V.add(formula);
  return { G, F, fl, nseg: pts.length, segs: pts, lit, people, pencil, V, beam, mline, hatch, axis, loads, defl, formula };
}
// ---------------------------------------------------------------- C: el terreno cortado (estratos) y la torre de Pisa
function hatchTex(kind) {
  return canvasTex(256, 256, (g, w, h) => { g.fillStyle = ['#2a2620', '#3a3128', '#1f2328', '#30302e'][kind]; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(230,236,242,.4)'; g.fillStyle = 'rgba(230,236,242,.45)'; g.lineWidth = 2;
    if (kind === 0) for (let i = 0; i < 160; i++) { g.beginPath(); g.arc(hash(i * 3.1) * w, hash(i * 7.7) * h, 1.6 + hash(i) * 1.5, 0, 7); g.fill(); }
    if (kind === 1) for (let y = 12; y < h; y += 22) for (let x = (y / 22 % 2) * 16; x < w; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18, y); g.stroke(); }
    if (kind === 2) for (let i = -h; i < w; i += 28) { g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); g.beginPath(); g.moveTo(i + h, h); g.lineTo(i, 0); g.stroke(); }
    if (kind === 3) for (let i = 0; i < 40; i++) { const x = hash(i * 2.3) * w, y = hash(i * 5.9) * h, r = 6 + hash(i * 1.1) * 10; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + i; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7); } g.closePath(); g.stroke(); }
  });
}
function buildSoil() {
  const G = new THREE.Group(); G.position.copy(ZC); scene.add(G);
  const W_ = 2.6, D_ = 1.3, layers = [[0.22, 0], [0.34, 1], [0.3, 3], [0.4, 2]]; let y = 0; const L = [];
  for (const [h, k] of layers) { const t = hatchTex(k); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W_ / 0.35, h / 0.35);
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.18 });
    const b = solid(new THREE.BoxGeometry(W_, h, D_), m, 1.6); b.position.set(0, y - h / 2, 0); G.add(b); L.push(b); y -= h; }
  // bulbo de presiones bajo la cimentación (elipses que se dibujan)
  const bulbs = [0.1, 0.18, 0.27, 0.38].map((r, i) => { const pts = []; for (let k = 0; k <= 60; k++) { const a = k / 60 * Math.PI * 2; pts.push(v3(Math.sin(a) * r * 0.75, -r * (1 - Math.cos(a)) * 0.9, D_ / 2 + 0.004)); } const l = drawLine(pts, 0xffffff, 1.8, 0.8 - i * 0.12); G.add(l); return l; });
  // la torre (8 cuerpos con arquerías) sobre una bisagra en el borde de la base (se inclina y cae hacia +x)
  const piv = new THREE.Group(); piv.position.set(0.11, 0, 0); G.add(piv);
  const T = new THREE.Group(); T.position.set(-0.11, 0, 0); piv.add(T);
  const TM = new THREE.MeshStandardMaterial({ color: 0xcfc8bb, roughness: 0.75 });
  let yy = 0; for (let i = 0; i < 8; i++) { const h = i === 0 ? 0.14 : i === 7 ? 0.09 : 0.1, r = i === 7 ? 0.075 : 0.105; const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), TM); c.castShadow = true; c.position.y = yy + h / 2; edges(c, 0x0d1014, 1.2, 15, 0.9); T.add(c);
    const ring = cyl(r + 0.012, r + 0.012, 0.012, TM, 24); ring.position.y = yy + h; T.add(ring); edges(ring, 0x0d1014, 1, 30, 0.7); yy += h + 0.012; }
  const settle = new THREE.Group(); G.add(settle);
  return { G, L, bulbs, piv, T, H: yy, layers };
}
// ---------------------------------------------------------------- C: el puente viga en el que se convierte la torre, con el tren y el viento
function buildDeckBridge() {
  const G = new THREE.Group(); G.position.copy(ZC); scene.add(G);
  const deck = bx(1, 0.07, 0.24, DARK2, 1.6); deck.position.y = 0.38; G.add(deck);          // escala x = largo
  const piers = [-0.95, 0.4, 1.75].map(x => { const p = bx(0.08, 0.36, 0.14, DARK, 1.4); p.position.set(x, 0.18, 0); G.add(p); return p; });
  const train = new THREE.Group(); G.add(train);
  const TRM = new THREE.MeshStandardMaterial({ color: 0xd9dee5, roughness: 0.4, metalness: 0.3 });
  for (let i = 0; i < 4; i++) { const c = new THREE.Group(); c.position.x = -i * 0.25; train.add(c);
    const b = rbox(0.23, 0.07, 0.085, TRM, 0.02); b.rotation.x = -Math.PI / 2; b.rotation.x = 0; b.position.y = 0.04; c.add(b); edges(b, 0x0d1014, 1.0, 30, 0.6);
    const win_ = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.016), new THREE.MeshBasicMaterial({ color: 0xbfefff, toneMapped: false })); win_.position.set(0, 0.05, 0.0435); c.add(win_);
    if (i === 0) { const nose = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 10, 0, Math.PI), TRM); nose.rotation.y = Math.PI / 2; nose.scale.set(1, 0.85, 1.6); nose.position.set(0.115, 0.04, 0); c.add(nose); } }
  const wind = segSet(14 * 3, 0xbfefff, 2, 0.9); G.add(wind);
  const tag = textPlane(0.3, 0.07, (g, W_, H_) => { g.fillStyle = '#EEF2F6'; g.font = '700 60px SpaceMono'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('δ ≤ L/1000', W_ / 2, H_ / 2); }, 512);
  tag.position.set(0.4, 0.12, 0.13); G.add(tag);
  return { G, deck, piers, train, wind, tag };
}
// ---------------------------------------------------------------- D: el río (partículas que corren y se frenan en la presa) y la presa de bóveda
const WATER_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 corner; attribute vec4 seed;
uniform mat4 VP, PVP; uniform vec2 res; uniform float time, dtp, x0, x1, xd, stop, lvl, size, bright, halfW, zc;
varying float vA; varying float vS; varying float vT; varying float vLen;
vec3 wp(float T){
  float L = x1 - x0, sp = 0.55 + 0.5 * seed.x;
  float x = x0 + mod(T * sp + seed.y * L, L);
  float z = (seed.z - 0.5) * 2.0 * halfW * (0.9 - 0.25 * seed.w), y = 0.012 + seed.w * 0.02 + sin(T * 3.0 + seed.x * 30.0) * 0.004;
  // con la presa arriba: lo que llega se amontona detrás y el nivel sube
  float xs = xd - 0.03 - seed.w * 0.9 * (0.25 + 0.75 * stop);
  if (stop > 0.0 && x > xs) { x = mix(x, xs, stop); y += lvl * (0.4 + 0.6 * seed.x); }
  return vec3(x, y, z + zc);
}
void main(){
  vec3 P = wp(time), P2 = wp(time - dtp); if (P2.x > P.x + 0.2) P2 = P;
  vec4 a = VP * vec4(P, 1.), b = PVP * vec4(P2, 1.);
  if (a.w < 0.01 || b.w < 0.005) { gl_Position = vec4(0.,0.,-2.,1.); vA = 0.; return; }
  vec2 pa = a.xy / a.w * res * 0.5, pb = b.xy / b.w * res * 0.5, d = pb - pa; float L = min(length(d), 300.0);
  vec2 dir = L > 0.01 ? normalize(d) : vec2(1., 0.), nr = vec2(-dir.y, dir.x);
  float sz = clamp(size * (0.6 + 0.8 * seed.x) / a.w * res.y * 0.5, 1.0, 9.0);
  vec2 px = (corner.x > 0.5 ? pa - dir * sz : pa + dir * (L + sz)) + nr * corner.y * sz;
  gl_Position = vec4(px / (res * 0.5) * a.w, a.z, a.w);
  #include <logdepthbuf_vertex>
  vA = bright * (0.4 + 0.6 * seed.z) * clamp((2.0 * sz) / (L * 0.5 + 2.0 * sz), 0.25, 1.0) * smoothstep(x0, x0 + 0.15, P.x);
  vS = corner.x > 0.5 ? -1.0 : (L / sz + 1.0); vT = corner.y; vLen = L / sz;
}`;
function buildRiver() {
  const G = new THREE.Group(); scene.add(G);
  const N = 5000, g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3)); g.setAttribute('corner', new THREE.Float32BufferAttribute([1, -1, 1, 1, 0, -1, 0, 1], 2)); g.setIndex([0, 2, 1, 2, 3, 1]);
  const sd = new Float32Array(N * 4); for (let i = 0; i < N * 4; i++) sd[i] = hash(i * 0.917 + 5.1); g.setAttribute('seed', new THREE.InstancedBufferAttribute(sd, 4)); g.instanceCount = N;
  const RX0 = ZD.x - 2.2, RXD = ZD.x - 0.6;
  const m = new THREE.ShaderMaterial({ vertexShader: WATER_VS, fragmentShader: FLOW_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { VP: { value: new THREE.Matrix4() }, PVP: { value: new THREE.Matrix4() }, res: { value: new THREE.Vector2(W, H) }, time: { value: 0 }, dtp: { value: 1 / 36 }, x0: { value: RX0 }, x1: { value: RXD + 0.6 }, xd: { value: RXD - 0.12 },
      stop: { value: 0 }, lvl: { value: 0 }, zc: { value: ZD.z + 0.25 }, size: { value: 0.006 }, bright: { value: 1.1 }, halfW: { value: 0.2 }, col: { value: new THREE.Color(0xbfe6ff) } } });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.layers.set(1); G.add(mesh);
  // orillas
  const banks = [-1, 1].map(s => { const b = bx(2.4, 0.07, 0.1, DARK2, 1.4); b.position.set((RX0 + RXD) / 2 + 0.25, 0.035, ZD.z + 0.25 + s * 0.26); G.add(b); return b; });
  // la presa: bóveda (arco en planta, convexa hacia el agua)
  const dam = new THREE.Group(); dam.position.set(RXD, 0, ZD.z + 0.25); G.add(dam);
  const NS = 10, Rp = 0.42, A0 = 0.75;
  for (let i = 0; i < NS; i++) { const a0 = -A0 + 2 * A0 * i / NS, a1 = -A0 + 2 * A0 * (i + 1) / NS, am = (a0 + a1) / 2, L = 2 * Rp * Math.sin((a1 - a0) / 2) * 1.02;
    const b = bx(0.05, 0.3, L, DARK2, 1.5); b.position.set(-(Rp * Math.cos(am) - Rp * Math.cos(A0)), 0.15, Rp * Math.sin(am)); b.rotation.y = am; dam.add(b); }
  const crest = drawLine(Array.from({ length: 31 }, (_, i) => { const a = -A0 + 2 * A0 * i / 30; return v3(-(Rp * Math.cos(a) - Rp * Math.cos(A0)), 0.305, Rp * Math.sin(a)); }), EDGE, 2.2, 1); dam.add(crest);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ color: 0x9fd2ff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(RXD - 0.8, 0.02, ZD.z + 0.25); G.add(pool);
  return { G, mesh, u: m.uniforms, banks, dam, pool, crest, RXD };
}
// ---------------------------------------------------------------- D/E: el mapa de España (contorno, carreteras y alta velocidad) y lo que sale de él
const MK = 0.25, MCOS = Math.cos(40.4 * Math.PI / 180);
const mp = (lon, lat, y = 0.006) => v3(ZD.x + (lon + 3.70) * MK * MCOS, y, ZD.z - (lat - 40.42) * MK);
const CITY = { mad: [-3.70, 40.42], bcn: [2.17, 41.39], zar: [-0.88, 41.65], lle: [0.62, 41.62], tgn: [1.25, 41.12], gir: [2.82, 41.98], fig: [2.96, 42.27], fr: [2.98, 42.45], gua: [-3.17, 40.63],
  sev: [-5.98, 37.39], cor: [-4.78, 37.89], cre: [-3.93, 38.99], put: [-4.11, 38.69], mal: [-4.42, 36.72], ant: [-4.56, 37.02], gra: [-3.60, 37.18], cad: [-6.29, 36.53],
  val: [-0.38, 39.47], cue: [-2.13, 40.07], alb: [-1.86, 38.99], ali: [-0.49, 38.35], mur: [-1.13, 37.99], cas: [-0.04, 39.99],
  vll: [-4.72, 41.65], seg: [-4.12, 40.95], leo: [-5.57, 42.60], ovi: [-5.85, 43.36], pal: [-4.53, 42.01], bur: [-3.70, 42.34], zam: [-5.75, 41.50], our: [-7.86, 42.34], stg: [-8.54, 42.88], cor2: [-8.41, 43.36], vig: [-8.72, 42.24],
  tol: [-4.02, 39.86], bad: [-6.97, 38.88], pla: [-6.09, 40.03], mer: [-6.34, 38.92], hue: [-0.41, 42.14], bil: [-2.93, 43.26], vit: [-2.67, 42.85], sts: [-1.98, 43.32], pam: [-1.64, 42.81], san: [-3.80, 43.46], hue2: [-6.95, 37.26], gij: [-5.66, 43.54], lco: [-8.41, 43.36] };
const HSR = [['mad', 'cre', 'put', 'cor', 'sev', 'cad'], ['cor', 'ant', 'mal'], ['ant', 'gra'], ['mad', 'gua', 'zar', 'lle', 'tgn', 'bcn', 'gir', 'fig', 'fr'], ['zar', 'hue'], ['mad', 'cue', 'val', 'cas'], ['cue', 'alb', 'ali'], ['ali', 'mur'],
  ['mad', 'seg', 'vll', 'pal', 'leo', 'ovi'], ['vll', 'bur'], ['vll', 'zam', 'our', 'stg', 'cor2'], ['stg', 'vig'], ['mad', 'tol'], ['pla', 'mer', 'bad']];
const ROADS = [['mad', 'bur', 'vit', 'bil'], ['mad', 'zar', 'bcn'], ['mad', 'val'], ['mad', 'alb', 'mur'], ['mad', 'cor', 'sev', 'hue2'], ['mad', 'bad'], ['mad', 'vll', 'leo', 'ovi', 'gij'], ['mad', 'tol'], ['bcn', 'tgn', 'cas', 'val', 'ali', 'mur', 'gra', 'mal', 'cad'],
  ['sts', 'bil', 'san', 'gij', 'lco'], ['lco', 'stg', 'vig'], ['vll', 'zam'], ['sev', 'mer', 'pla', 'sal'], ['zar', 'pam', 'sts'], ['bur', 'leo'], ['our', 'leo']];
CITY.sal = [-5.66, 40.96];
async function buildMap() {
  const C = await loadTopoLocal('../../../engine/geo/countries-50m.json');
  const segsOf = (filter, bbox) => { const out = []; for (const c of C) { if (!filter(c.name)) continue; for (const r of c.rings) { let ok = false; for (const [lo, la] of r) if (lo > bbox[0] && lo < bbox[2] && la > bbox[1] && la < bbox[3]) { ok = true; break; } if (!ok) continue; for (let i = 0; i + 1 < r.length; i++) out.push(mp(r[i][0], r[i][1]), mp(r[i + 1][0], r[i + 1][1])); } } return out; };
  const es = segsOf(n => n === 'Spain', [-10, 35.5, 5, 44.5]), nb = segsOf(n => ['Portugal', 'France', 'Andorra', 'Morocco'].includes(n), [-10.5, 35, 4.5, 44.5]).filter(p => true);
  const mk = (arr, col, w, op) => { const n = arr.length / 2, s = segSet(n, col, w, op); for (let i = 0; i < n; i++) s.userData.set(i, arr[2 * i], arr[2 * i + 1]); s.userData.flush(); s.userData.total = n; scene.add(s); return s; };
  // los bordes del vecino se recortan a la caja del mapa
  const nbc = []; for (let i = 0; i < nb.length; i += 2) { const a = nb[i], b = nb[i + 1]; if (Math.abs(a.x - ZD.x) < 1.6 && Math.abs(b.x - ZD.x) < 1.6 && Math.abs(a.z - ZD.z) < 1.15 && Math.abs(b.z - ZD.z) < 1.15) nbc.push(a, b); }
  const coast = mk(es, EDGE, 2.2, 1), nbr = mk(nbc, 0x6d7682, 1.4, 0.7);
  const route = (list, y) => { const out = []; for (const r of list) for (let i = 0; i + 1 < r.length; i++) { const a = CITY[r[i]], b = CITY[r[i + 1]]; if (!a || !b) continue; const n = 8; for (let k = 0; k < n; k++) { const u0 = k / n, u1 = (k + 1) / n; out.push(mp(lerp(a[0], b[0], u0), lerp(a[1], b[1], u0), y), mp(lerp(a[0], b[0], u1), lerp(a[1], b[1], u1), y)); } } return out; };
  // orden de dibujo: desde Madrid hacia fuera (por distancia del segmento a Madrid)
  const byDist = arr => { const m = mp(...CITY.mad), pairs = []; for (let i = 0; i < arr.length; i += 2) pairs.push([arr[i], arr[i + 1]]); pairs.sort((p, q) => p[0].distanceTo(m) - q[0].distanceTo(m)); return pairs.flat(); };
  const roads = mk(byDist(route(ROADS, 0.007)), 0x9aa1ab, 1.6, 0.75), hsr = mk(byDist(route(HSR, 0.009)), AMBER, 3.2, 1);
  const dots = segSet(Object.keys(CITY).length * 2, 0xffffff, 3, 1); scene.add(dots); { let k = 0; for (const key in CITY) { const p = mp(...CITY[key], 0.01), r = 0.012; dots.userData.set(k++, p.clone().add(v3(-r, 0, 0)), p.clone().add(v3(r, 0, 0))); dots.userData.set(k++, p.clone().add(v3(0, 0, -r)), p.clone().add(v3(0, 0, r))); } dots.userData.flush(); }
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), new THREE.MeshBasicMaterial({ color: 0x0a0f15, transparent: true, opacity: 0, depthWrite: false })); sea.rotation.x = -Math.PI / 2; sea.position.set(ZD.x - 0.15, 0.004, ZD.z + 0.05); scene.add(sea);
  return { coast, nbr, roads, hsr, dots, sea };
}
async function loadTopoLocal(url) {
  const d = await (await fetch(url)).json(); const [sx, sy] = d.transform.scale, [tx, ty] = d.transform.translate;
  const arcs = d.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
  const ring = idx => { const pts = []; for (const i of idx) { const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse(); pts.push(...(pts.length ? a.slice(1) : a)); } return pts; };
  return d.objects.countries.geometries.map(g => { const polys = g.type === 'MultiPolygon' ? g.arcs : g.type === 'Polygon' ? [g.arcs] : []; return { name: (g.properties || {}).name || '', rings: polys.flatMap(p => p.map(ring)) }; });
}
// polideportivo (nave con cubierta en bóveda de cañón)
function buildSports() {
  const G = new THREE.Group(); scene.add(G);
  const B = new THREE.Group(); G.add(B);
  const base = bx(0.34, 0.1, 0.22, DARK2, 1.5, AMBER); base.position.y = 0.05; B.add(base);
  const vg = new THREE.CylinderGeometry(0.11, 0.11, 0.34, 24, 1, true, 0, Math.PI); vg.rotateZ(Math.PI / 2); vg.rotateX(Math.PI / 2);
  const vault = solid(vg, new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.8, side: THREE.DoubleSide }), 1.4, AMBER); vault.position.y = 0.1; vault.scale.set(1, 0.55, 1); B.add(vault);
  const door = bx(0.08, 0.06, 0.004, DARK, 1.2, AMBER); door.position.set(0, 0.03, 0.112); B.add(door);
  return { G, B };
}
// ---------------------------------------------------------------- F: iconos que saltan del libro y se convierten en edificios (vivienda, colegio, hospital, iglesia)
function buildIcon(kind) {
  const G = new THREE.Group(), M = DARK2, ec = TEAL;
  if (kind === 0) { const b = bx(0.14, 0.03, 0.08, M, 1.4, ec); b.position.y = 0.03; G.add(b); const p = bx(0.035, 0.02, 0.06, M, 1.2, ec); p.position.set(-0.045, 0.055, 0); G.add(p); const hb = bx(0.01, 0.07, 0.08, M, 1.2, ec); hb.position.set(-0.07, 0.035, 0); G.add(hb); }
  if (kind === 1) { const t = bx(0.12, 0.01, 0.07, M, 1.4, ec); t.position.y = 0.07; G.add(t); for (const [x, z] of [[-0.05, -0.028], [0.05, -0.028], [-0.05, 0.028], [0.05, 0.028]]) { const l = bx(0.008, 0.065, 0.008, M, 1, ec); l.position.set(x, 0.033, z); G.add(l); } const bk = bx(0.05, 0.012, 0.035, M, 1.2, ec); bk.position.set(0.02, 0.081, 0); G.add(bk); }
  if (kind === 2) { const v = bx(0.035, 0.12, 0.03, M, 1.4, ec); v.position.y = 0.075; G.add(v); const h = bx(0.11, 0.035, 0.03, M, 1.4, ec); h.position.y = 0.085; G.add(h); }
  if (kind === 3) { const s = bx(0.14, 0.012, 0.045, M, 1.4, ec); s.position.y = 0.04; G.add(s); const bk = bx(0.14, 0.05, 0.01, M, 1.2, ec); bk.position.set(0, 0.065, -0.02); G.add(bk); for (const x of [-0.06, 0.06]) { const l = bx(0.01, 0.04, 0.04, M, 1, ec); l.position.set(x, 0.02, 0); G.add(l); } }
  return G;
}
function buildBuilding(kind) {
  const G = new THREE.Group(), M = DARK2, ec = EDGE;
  const winGrid = (w, h, z, rows, cols, y0) => { const s = segSet(rows * cols * 4, ec, 1.1, 0.8); let k = 0; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = -w / 2 + (c + 0.5) * w / cols, y = y0 + r * h / rows, a = w / cols * 0.22, b = h / rows * 0.28; [[x - a, y - b, x + a, y - b], [x + a, y - b, x + a, y + b], [x + a, y + b, x - a, y + b], [x - a, y + b, x - a, y - b]].forEach(q => s.userData.set(k++, v3(q[0], q[1], z), v3(q[2], q[3], z))); } s.userData.flush(); return s; };
  if (kind === 0) { const H_ = buildHouse(false); H_.G.scale.setScalar(0.62); G.add(H_.G); }
  if (kind === 1) { const b = bx(0.42, 0.22, 0.2, M, 1.5, ec); b.position.y = 0.11; G.add(b); G.add(winGrid(0.38, 0.2, 0.101, 2, 6, 0.06)); const c = bx(0.12, 0.08, 0.2, M, 1.4, ec); c.position.set(0, 0.26, 0); G.add(c);
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.025, 24), new THREE.MeshBasicMaterial({ color: 0xeef2f6, toneMapped: false })); clock.position.set(0, 0.26, 0.102); G.add(clock); }
  if (kind === 2) { const b = bx(0.3, 0.32, 0.2, M, 1.5, ec); b.position.y = 0.16; G.add(b); G.add(winGrid(0.26, 0.24, 0.101, 3, 4, 0.05));
    const cr = new THREE.Group(); cr.position.set(0, 0.36, 0); G.add(cr); const CM = new THREE.MeshBasicMaterial({ color: 0xff6a5c, toneMapped: false }); const v = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.08, 0.012), CM), h = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.012), CM); cr.add(v, h); }
  if (kind === 3) { const n = bx(0.18, 0.16, 0.3, M, 1.5, ec); n.position.set(0.05, 0.08, 0); G.add(n);
    const rs = new THREE.Shape(); rs.moveTo(-0.1, 0); rs.lineTo(0.1, 0); rs.lineTo(0, 0.09); rs.closePath(); const rg = new THREE.ExtrudeGeometry(rs, { depth: 0.3, bevelEnabled: false }); rg.translate(0, 0, -0.15); const r = solid(rg, M, 1.4, ec); r.position.set(0.05, 0.16, 0); G.add(r);
    const tw = bx(0.09, 0.34, 0.09, M, 1.5, ec); tw.position.set(-0.1, 0.17, 0.1); G.add(tw); const sp = solid(new THREE.ConeGeometry(0.068, 0.14, 4), M, 1.4, ec); sp.position.set(-0.1, 0.41, 0.1); sp.rotation.y = Math.PI / 4; G.add(sp);
    const rose = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.028, 20), new THREE.MeshBasicMaterial({ color: 0xeef2f6, toneMapped: false, side: THREE.DoubleSide })); rose.position.set(0.05, 0.11, 0.151); G.add(rose); }
  return G;
}
// ---------------------------------------------------------------- el cartel «PUENTES: SOLO CAMINOS» (se parte en dos)
function buildSign() {
  const G = new THREE.Group(); scene.add(G);
  const post = bx(0.03, 0.42, 0.03, DARK2, 1.3); post.position.y = 0.21; G.add(post);
  const tex = canvasTex(1024, 380, (g, w, h) => { g.fillStyle = '#16120a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#FFB547'; g.lineWidth = 14; g.strokeRect(16, 16, w - 32, h - 32);
    g.fillStyle = '#FFB547'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 104px Inter'; g.fillText('PUENTES:', w / 2, 125); g.font = '900 112px Inter'; g.fillText('SOLO CAMINOS', w / 2, 262); });
  const halves = [0, 1].map(i => { const geo = new THREE.PlaneGeometry(0.3, 0.22); const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * 0.5 + i * 0.5); uv.needsUpdate = true;
    const p = new THREE.Group(); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.8, roughness: 0.6, side: THREE.DoubleSide })); m.castShadow = true;
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.012), DARK); bk.position.z = -0.008; p.add(m, bk); m.position.x = 0; bk.position.x = 0; p.position.set(i ? 0.15 : -0.15, 0.5, 0.02); G.add(p); return p; });
  return { G, halves, post };
}
// fórmulas que flotan alrededor de la casa (y se deshacen)
const FORMULAS = ['M = qL²/8', 'σ = M·y / I', 'δ = 5qL⁴/384EI', 'N = A·fyd', 'τ = V·Q / I·b', 'Ed ≤ Rd', 'qadm = qh / F'];
function buildFormulas() {
  return FORMULAS.map((f, i) => { const p = textPlane(0.36, 0.07, (g, W_, H_) => { g.fillStyle = '#9AA1AB'; g.font = '700 58px SpaceMono'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(f, W_ / 2, H_ / 2); }, 512);
    const a = i / FORMULAS.length * Math.PI * 2; p.position.set(HSX.x + Math.cos(a) * 0.5, 0.18 + (i % 3) * 0.12, HSX.z + Math.sin(a) * 0.32 + 0.05); p.userData.a = a; scene.add(p); return p; });
}
// ---------------------------------------------------------------- el sello rojo gigante que aplasta la casa (y el «NO» que deja en el papel)
function buildStamp() {
  const G = new THREE.Group(); scene.add(G);
  const RM = new THREE.MeshStandardMaterial({ color: 0xc8322a, roughness: 0.45, emissive: 0x3a0806, emissiveIntensity: 0.6 }), HM = new THREE.MeshStandardMaterial({ color: 0x2a1c16, roughness: 0.5 });
  const pad = rbox(0.62, 0.46, 0.07, RM, 0.03); pad.rotation.x = -Math.PI / 2; pad.position.y = 0.035; G.add(pad);
  const neck = cyl(0.05, 0.07, 0.16, HM, 20); neck.position.y = 0.15; G.add(neck);
  const knob = sph(0.1, HM, 24, 16); knob.position.y = 0.29; knob.scale.set(1, 0.8, 1); G.add(knob);
  const decal = textPlane(0.62, 0.46, (g, w, h) => { g.strokeStyle = 'rgba(255,82,71,.95)'; g.lineWidth = 26; g.strokeRect(30, 30, w - 60, h - 60); g.fillStyle = 'rgba(255,82,71,.95)'; g.font = '900 250px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NO', w / 2, h / 2 + 12);
    g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + hash(i) * 0.7})`; g.fillRect(hash(i * 3.3) * w, hash(i * 7.1) * h, 2 + hash(i * 1.3) * 7, 2 + hash(i * 2.9) * 5); } }, 512);
  decal.rotation.x = -Math.PI / 2; decal.rotation.z = -0.12; decal.position.set(HSX.x, 0.02, HSX.z + 0.02); decal.material.opacity = 0; scene.add(decal);
  return { G, decal };
}
// ---------------------------------------------------------------- escenario: cada pieza según el tiempo (todo sale de K, los tiempos de la voz)
const LOOP_D = 0.62;                                   // últimos segundos: el plano vuelve a como empieza (bucle)
const loopT = t => (t > END - LOOP_D ? t - END : t);
const ARC_CEN = () => v3(BRX.x, 0, BRX.z + (-ARC_C));  // centro del arco dibujado en el papel
const SIGN_P = v3(-0.35, 0, 0.75), GAV2_P = v3(-0.35, 0, 0.75);
function arcPaper(k) { const s = -ARC_P0 + 2 * ARC_P0 * k, [x, y] = arcXY(s); return v3(BRX.x + x, 0.006, BRX.z - y); }
function setUp(o, k) { o.visible = k > 0.002; }
function popE(t, t0, d = 0.45) { return Math.max(0, pop(t, t0, d)); }
const shake = [];                                     // golpes: [t, fuerza]

function bridgeAt(tb) {
  const B = S.bridge, C = S.comp;
  // el compás dibuja el arco y se va
  const kd = clamp((tb + 0.45) / 1.25), up = win(tb, 0.82, 0.7);
  C.G.visible = tb < 1.75 && tb > -2;
  if (C.G.visible) {
    const Cc = ARC_CEN(), P = arcPaper(kd), M = Cc.clone().lerp(P, 0.5), R = Cc.distanceTo(P), hh = Math.sqrt(Math.max(0.01, C.LG * C.LG - R * R / 4));
    C.G.position.set(M.x, hh + 0.06 + up * 2.6, M.z - up * 0.6); C.G.rotation.set(0, Math.atan2(-(P.z - Cc.z), P.x - Cc.x), -up * 0.6);
    const a = Math.asin(clamp(R / (2 * C.LG), 0, 0.99)); C.legA.rotation.z = -a; C.legB.rotation.z = a;
  }
  drawK(B.line, kd); B.line.material.opacity = 1 - 0.6 * win(tb, 1.6, 0.6);
  // el arco se levanta del papel (como un libro desplegable), luego los estribos y el tablero
  const ka = popE(tb, 0.5, 0.75); B.arch.rotation.x = -Math.PI / 2 * (1 - ka); B.arch.visible = tb > 0.47;
  const kb = popE(tb, 1.0, 0.45); for (const a of B.ab) { a.scale.y = Math.max(0.001, kb); a.position.y = 0.19 * kb; a.visible = kb > 0.002; }
  const kk = popE(tb, (K.puente1 || 1.77) - 0.3, 0.5); B.deck.scale.y = Math.max(0.001, kk); B.deck.visible = kk > 0.002;
}
function houseAt(t, tb) {
  const Hh = S.house, st = S.stamp;
  // se despliega con «ingeniero de Caminos», un sello rojo gigante la aplasta en «no», y vuelve a levantarse cuando la ley «mira» quién duerme dentro
  const kup = popE(tb, K.ingeniero - 0.1, 0.5);
  Hh.P.rotation.x = -Math.PI / 2 * (1 - kup);
  const tHit = K.no1 + 0.02, sq = t < K.ley11 ? win(t, tHit - 0.06, 0.07) : 1 - popE(t, K.ley11 + 0.1, 0.55);
  Hh.B.scale.set(1 + 0.25 * sq, Math.max(0.05, 1 - 0.95 * sq), 1 + 0.15 * sq);
  if (t > END - LOOP_D) Hh.B.scale.set(1, 1, 1);
  // el sello: baja, golpea y sube; deja «NO» impreso en el papel
  const kd = win(t, tHit - 0.32, 0.3), ku = win(t, tHit + 0.35, 0.5);
  st.G.visible = t > tHit - 0.45 && t < tHit + 1.0;
  st.G.position.set(HSX.x, lerp(1.6, 0.04, kd) + ku * 1.8, HSX.z + ku * 0.4); st.G.rotation.set(0.1 * (1 - kd) - 0.25 * ku, 0.2, 0.05 * (1 - kd));
  const kn = t > tHit ? 1 - win(t, K.ley11, 0.5) : 0; st.decal.material.opacity = kn * 0.92; st.decal.visible = kn > 0.01 && tb > 0;
}
function bookAt(t) {
  const b = S.book; b.G.visible = t > K.dicen - 0.2 && t < K.caminos4; S.gavel.G.visible = t > K.tribunal - 0.25 && t < K.caminos4;
  if (!b.G.visible) return;
  const k = clamp((t - (K.dicen - 0.15)) / (K.ley2 - K.dicen + 0.15)), y = 1.7 * (1 - k * k), land = t > K.ley2 ? Math.exp(-(t - K.ley2) * 9) * Math.sin((t - K.ley2) * 40) * 0.012 : 0;
  b.G.position.set(0.5, Math.max(0, y) + Math.abs(land), -1.05); b.G.rotation.set(0.5 * (1 - k), 0.35 + 0.6 * (1 - k), 0.3 * (1 - k));
  b.hinge.rotation.z = -Math.PI;
  const g = S.gavel;
  const kp = popE(t, K.tribunal - 0.2, 0.4); g.G.scale.setScalar(Math.max(0.001, kp)); g.G.position.set(1.35, 0, -1.15); g.G.rotation.y = -0.5;
  const ts = K.supremo2 + 0.08; g.arm.rotation.z = t < ts ? -0.95 * win(t, K.tribunal, 0.3) : -0.95 * (1 - win(t, ts - 0.12, 0.12)) - 0.12 * Math.exp(-(t - ts) * 10) * Math.abs(Math.sin((t - ts) * 30));
}
function qAt(t) {
  const Q = S.q, on = t > K.porque3 - 0.25 && t < K.caminos4 + 0.4; Q.segs.visible = on; if (!on) return;
  const sc = 1.25, rot = 0.22 * Math.sin(t * 0.9) - 0.15, ca = Math.cos(rot), sa = Math.sin(rot), out = win(t, K.caminos4 - 0.15, 0.4);
  const W_ = p => v3(QPOS.x + (p.x * ca + p.z * sa) * sc, QPOS.y + p.y * sc + out * 1.2, QPOS.z + (-p.x * sa + p.z * ca) * sc);
  const dotT = K.final3 - 0.05;
  for (let i = 0; i < Q.n; i++) {
    const isDot = i >= Q.dotFrom, t0 = isDot ? dotT : K.porque3 - 0.2 + (i / Q.dotFrom) * 0.55, k = sm5(clamp((t - t0) / (isDot ? 0.3 : 0.42)));
    const [a, b] = Q.S[i], [fa, fb] = Q.from[i], A = W_(a), B_ = W_(b);
    const lift = Math.sin(Math.PI * k) * 0.25;
    const pa = fa.clone().lerp(A, k), pb = fb.clone().lerp(B_, k); pa.y += lift; pb.y += lift;
    if (isDot && t > dotT + 0.3) { const bo = Math.exp(-(t - dotT - 0.3) * 7) * Math.abs(Math.sin((t - dotT - 0.3) * 18)) * 0.08; pa.y += bo; pb.y += bo; }
    if (k <= 0) { pa.copy(fa); pb.copy(fa); }
    Q.segs.userData.set(i, pa, pb);
  }
  Q.segs.userData.flush();
  Q.segs.material.opacity = 1; Q.segs.material.linewidth = 2.6 + 2.5 * Math.exp(-Math.max(0, t - K.nadie) * 5) * (t > K.nadie ? 1 : 0);
}
function duelAt(t) {
  const D_ = S.duel, on = t > K.caminos4 - 1.2 && t < K.esto + 0.6; D_.G.visible = on; if (!on) return;
  // la fachada se dibuja con «dibujáis»
  const kf = clamp((t - (K.vosotros4 - 0.1)) / (K.nosotros4 - K.vosotros4 + 0.1)), n = D_.nseg, m = Math.floor(n * kf);
  D_.fl.geometry.instanceCount = Math.max(0, m); D_.fl.visible = m > 0;
  const seg = D_.segs[Math.min(n - 1, m)], u = n * kf - m, tip = seg ? v3(lerp(seg[0][0], seg[1][0], u), lerp(seg[0][1], seg[1][1], u), 0) : v3(0, 0, 0);
  const pk = env(t, K.vosotros4 - 0.25, K.nosotros4 + 0.3, 0.25, 0.3); D_.pencil.visible = pk > 0.01;
  D_.pencil.position.set(D_.F.position.x + tip.x, tip.y + (1 - pk) * 0.3, 0.03); D_.pencil.rotation.set(0.35, 0, -0.45);
  // «que no se caiga»: la fachada se tambalea (y Arquitectura responde: se endereza)
  const tw = K.no4 - 0.05; let ang = 0;
  if (t > tw && t < K.arquitectos5 + 0.3) ang = -0.3 * Math.sin((t - tw) * 9.5) * Math.exp(-(t - tw) * 1.4);
  ang *= 1 - win(t, K.arquitectos5 - 0.1, 0.4);
  D_.F.rotation.z = ang; D_.F.position.x = Math.sin(ang) * 0.1;
  // la viga: la carga cae, la ley de momentos se dibuja, la flecha aparece
  const kl = popE(t, K.caminos4 + 0.15, 0.35); D_.loads.visible = kl > 0.01; D_.loads.position.y = (1 - Math.min(1, kl)) * 0.25; D_.loads.material.opacity = clamp(kl);
  drawK(D_.mline, clamp((t - K.hacemos4) / 0.5)); D_.hatch.visible = t > K.hacemos4 + 0.35; D_.hatch.material.opacity = 0.6 * win(t, K.hacemos4 + 0.35, 0.3); D_.axis.visible = t > K.hacemos4;
  drawK(D_.defl, clamp((t - K.que4) / 0.4));
  const kfo = popE(t, K.calculais - 0.1, 0.4); D_.formula.visible = kfo > 0.01; D_.formula.scale.setScalar(Math.max(0.001, kfo)); D_.formula.material.opacity = clamp(kfo) * (0.75 + 0.25 * Math.sin(t * 12));
  // «vivir dentro»: se encienden las ventanas y aparece gente
  D_.lit.forEach((p, i) => { p.material.opacity = 0.85 * win(t, K.vivir - 0.05 + i * 0.07, 0.2); });
  D_.people.forEach((p, i) => { p.material.opacity = win(t, K.dentro5 - 0.05 + i * 0.06, 0.2); });
}
function soilAt(t) {
  const Sl = S.soil, on = t > K.por6 - 0.2 && t < K.trenes; Sl.G.visible = on; if (!on) return;
  Sl.bulbs.forEach((b, i) => { drawK(b, clamp((t - K.suelos - i * 0.1) / 0.45)); });
  // se inclina («inclina») y se cae («estructuras») convirtiéndose en el tablero del puente
  const lean = -0.13 * popE(t, K.inclina - 0.05, 0.6), fall = clamp((t - (K.estructuras - 0.12)) / 0.42), fe = fall * fall;
  Sl.piv.rotation.z = lean + (-Math.PI / 2 - lean) * fe; Sl.piv.position.y = -0.012 * win(t, K.inclina, 0.5);
  Sl.T.visible = fall < 1;
}
function deckAt(t) {
  const Dk = S.deck, tf = K.estructuras + 0.3, on = t > tf - 0.02 && t < K.presas + 0.9; Dk.G.visible = on; if (!on) return;
  const kg = popE(t, tf, 0.5), kgc = clamp(kg);
  // de la torre tumbada (0,11 → 1,06; y ≈ 0,11) al tablero (−1,0 → 1,8; y = 0,38)
  const x0 = lerp(0.11, -1.0, kgc), x1 = lerp(0.11 + S.soil.H, 1.8, kgc), y = lerp(0.105, 0.38, kg);
  Dk.deck.scale.x = Math.max(0.01, x1 - x0); Dk.deck.position.set((x0 + x1) / 2, y, 0); Dk.deck.scale.y = lerp(3.0, 1, kgc); Dk.deck.scale.z = lerp(0.9, 1, kgc);
  Dk.piers.forEach((p, i) => { const k = popE(t, tf + 0.15 + i * 0.07, 0.4); p.scale.y = Math.max(0.001, k); p.position.y = 0.18 * k; p.visible = k > 0.002; });
  // el tren cruza; el viento empuja (flechas) y el tablero se mueve un poco
  const ktr = clamp((t - (K.trenes - 0.45)) / 1.6); Dk.train.visible = ktr > 0 && ktr < 1; Dk.train.position.set(lerp(-1.6, 2.6, ktr), 0.38 + 0.035, 0);
  const kw = env(t, K.viento - 0.05, K.presas + 0.4, 0.15, 0.3); Dk.wind.visible = kw > 0.01; Dk.wind.material.opacity = 0.9 * kw;
  for (let i = 0; i < 14; i++) { const ph = ((t * 1.6 + hash(i * 3.3)) % 1), x = -0.9 + (i / 13) * 2.6, y0 = 0.3 + hash(i * 1.7) * 0.25, z = lerp(-1.0, -0.16, ph), L = 0.18;
    const a = v3(x, y0, z - L), b = v3(x, y0, z); Dk.wind.userData.set(i * 3, a, b); Dk.wind.userData.set(i * 3 + 1, b, v3(x - 0.02, y0, z - 0.03)); Dk.wind.userData.set(i * 3 + 2, b, v3(x + 0.02, y0, z - 0.03)); }
  Dk.wind.userData.flush();
  Dk.G.rotation.x = 0.025 * kw * Math.sin(t * 7); Dk.tag.visible = false;
}
function riverAt(t, VP, PVP) {
  const R = S.river, on = t > K.viento - 0.4 && t < K.vias + 0.6; R.G.visible = on; if (!on) return;
  const u = R.u; u.VP.value.copy(VP); u.PVP.value.copy(PVP); u.time.value = t;
  const kd = popE(t, K.presas - 0.05, 0.45), flat = win(t, K.carreteras - 0.25, 0.4);
  R.dam.scale.y = Math.max(0.01, kd * (1 - flat)); R.dam.visible = kd > 0.002;
  u.stop.value = win(t, K.frenan - 0.1, 0.6); u.lvl.value = 0.05 * win(t, K.frenan, 0.8); u.bright.value = 1.1 * (1 - flat);
  R.pool.material.opacity = 0.12 * win(t, K.frenan, 0.6) * (1 - flat); R.pool.position.y = 0.02 + 0.05 * win(t, K.frenan, 0.8);
  for (const b of R.banks) { b.scale.y = Math.max(0.01, 1 - flat); b.visible = flat < 0.97; }
}
function mapAt(t) {
  const M = S.map, on = t > K.rios && t < K.porque9 + 0.6; for (const o of [M.coast, M.nbr, M.roads, M.hsr, M.dots]) o.visible = on; M.sea.visible = on; if (!on) return;
  const kc = clamp((t - (K.carreteras - 0.2)) / 0.75); M.coast.geometry.instanceCount = Math.floor(M.coast.userData.total * kc);
  M.nbr.material.opacity = 0.6 * win(t, K.carreteras, 0.5); M.sea.material.opacity = 0.9 * win(t, K.carreteras - 0.2, 0.5);
  M.roads.geometry.instanceCount = Math.floor(M.roads.userData.total * clamp((t - K.carreteras) / 0.7));
  M.hsr.geometry.instanceCount = Math.floor(M.hsr.userData.total * clamp((t - (K.vias - 0.05)) / 0.85));
  const pulse = env(t, K.alta - 0.05, K.mundo + 0.5, 0.1, 0.3) * (0.5 + 0.5 * Math.sin((t - K.alta) * 18));
  M.hsr.material.linewidth = 3.2 + 2.8 * pulse; M.dots.material.opacity = win(t, K.espana - 0.1, 0.3);
  const dim = 1 - 0.45 * win(t, K.supremo8, 0.6); M.coast.material.opacity = dim; M.roads.material.opacity = 0.75 * dim; M.hsr.material.opacity = dim;
}
function sportsAt(t) {
  const Sp = S.sports, H2 = S.house2, on = t > K.aun && t < K.porque9 + 0.6; Sp.G.visible = H2.G.visible = on; if (!on) return;
  const ks = popE(t, K.polideportivo - 0.05, 0.5); Sp.B.scale.set(1, Math.max(0.001, ks), 1); Sp.G.visible = ks > 0.002;
  const kh = popE(t, K.tu8 - 0.1, 0.45); H2.P.rotation.x = -Math.PI / 2 * (1 - clamp(kh)); H2.B.scale.y = Math.max(0.001, kh); H2.G.visible = kh > 0.002;
  const sq = win(t, K.no8 - 0.04, 0.08); H2.B.scale.y *= 1 - 0.0 * sq;
}
function lawAt(t) {
  const b = S.book2, on = t > K.porque9 - 0.3 && t < K.puente10 - 0.4; b.G.visible = on; S.icons.forEach(i => i.visible = false); S.blds.forEach(i => i.visible = false); S.sig.visible = false; if (!on) return;
  const ko = sm5(clamp((t - (K.ley9 - 0.15)) / 0.55)); b.hinge.rotation.z = -Math.PI * (1 - ko) + 0.04 * Math.sin(Math.PI * ko);
  b.hinge.userData.pagesL.visible = ko > 0.5;
  const verbs = [K.vive, K.estudia, K.cura, K.reza];
  verbs.forEach((tv, i) => {
    const ic = S.icons[i], bd = S.blds[i], slot = S.slots[i], P0 = S.iconFrom[i];
    const ki = popE(t, tv - 0.08, 0.35), km = sm5(clamp((t - (tv + 0.32)) / 0.3));
    ic.visible = ki > 0.002 && km < 1; const p = P0.clone().lerp(slot, km); p.y += 0.12 * ki + Math.sin(Math.PI * km) * 0.25; ic.position.copy(p); ic.scale.setScalar(Math.max(0.001, 3.0 * ki * (1 - km))); ic.rotation.y = (1 - clamp(ki)) * 2 + t * 0.6 * (1 - km);
    const kb = popE(t, tv + 0.5, 0.45); bd.visible = kb > 0.002; bd.position.copy(slot); bd.scale.set(1.25, 1.25 * Math.max(0.001, kb), 1.25);
  });
  drawK(S.sig, clamp((t - (K.firma - 0.05)) / 0.55)); S.sig.visible = t > K.firma - 0.05;
}
function signAt(t) {
  const Sg = S.sign, on = t > K.colegio - 0.3 && t < K.dormir; Sg.G.visible = on; S.gavel2.G.visible = false; if (!on) return;
  const ks = popE(t, K.colegio - 0.1, 0.45); Sg.G.position.copy(SIGN_P); Sg.G.scale.set(1, Math.max(0.001, ks), 1); Sg.G.rotation.y = 0.25;
  const glow = env(t, K.exclusiva - 0.05, K.dijo, 0.1, 0.2) * (0.6 + 0.4 * Math.sin(t * 20));
  // el mazo del Supremo baja sobre el cartel y lo parte en dos
  const g = S.gavel2, ts = K.dijo + 0.04, kp = popE(t, K.supremo10 - 0.15, 0.35);
  g.G.visible = t > K.supremo10 - 0.2 && t < K.no10 + 0.8; g.G.position.copy(SIGN_P).add(v3(0.0, 0.66 - 0.083, 0)); g.G.rotation.y = 0.25; g.G.scale.setScalar(Math.max(0.001, kp) * 1.0);
  g.base.visible = false;
  g.arm.rotation.z = t < ts ? -1.1 * win(t, K.supremo10, 0.25) : -1.1 * (1 - win(t, ts - 0.1, 0.1)) - 0.25 * win(t, ts + 0.15, 0.4);
  const tb = ts, kb = clamp((t - tb) / 0.6);
  Sg.halves.forEach((h, i) => { const s = i ? 1 : -1, fall = t > tb ? (t - tb) : 0;
    h.position.set(s * (0.15 + 0.35 * kb), Math.max(0.03, 0.5 - 2.6 * fall * fall), 0.02 + 0.1 * kb); h.rotation.set(-0.3 * kb, 0, s * (-0.9 * kb - (fall > 0.35 ? 0.6 : 0)));
    h.children[0].material.emissiveIntensity = 0.8 + 1.4 * glow; });
  Sg.post.scale.y = 1; const sink = win(t, K.mira11b, 0.5); Sg.G.position.y = -0.6 * sink;
}
function formulasAt(t) {
  const on = t > K.ley11 - 0.2 && t < K.dormir; S.formulas.forEach((p, i) => {
    p.visible = on; if (!on) return;
    const ka = popE(t, K.ley11 - 0.1 + i * 0.06, 0.35), kd = win(t, K.mejor - 0.05 + i * 0.03, 0.45), a = Math.PI * (1.02 + 0.96 * i / (S.formulas.length - 1)) + 0.12 * Math.sin(t * 0.8 + i);
    p.position.set(HSX.x + Math.cos(a) * 0.6, 0.3 + (i % 3) * 0.1 + kd * 0.25, HSX.z + Math.sin(a) * 0.36 - 0.02);
    p.lookAt(cam.position); p.scale.setScalar(Math.max(0.001, clamp(ka) * (1 - kd * 0.7)));
    p.material.opacity = clamp(ka) * (1 - kd) * (t > K.calcula && t < K.mejor ? 0.8 + 0.2 * Math.sin(t * 25 + i) : 0.85);
  });
}
function roomAt(t) {
  const H_ = S.house; if (!H_.blanket) return;
  H_.blanket.scale.y = 1 + 0.12 * Math.sin(t * 2.6); H_.blanket.position.y = 0.072 + 0.002 * Math.sin(t * 2.6);
}
function stageAt(t, VP, PVP) {
  const tb = loopT(t);
  bridgeAt(tb); houseAt(t, tb); bookAt(t); qAt(t); duelAt(t); soilAt(t); deckAt(t); riverAt(t, VP, PVP); mapAt(t); sportsAt(t); lawAt(t); signAt(t); formulasAt(t); roomAt(t);
}
// ---------------------------------------------------------------- cámara: el plano (A) → el duelo (B) → bajo tierra y la torre (C) → presa y mapa (D, E) → el libro (F) → vuelta al plano: el cartel y la casa
let CK = [], CK_OPEN = [];
const add = (a, b) => [a.x + b[0], a.y + b[1], a.z + b[2]];
function buildCam() {
  const HW = HSX.clone().add(S.house.win), RXD = S.river.RXD, RZ = ZD.z + 0.25;
  const MAD = mp(...CITY.mad, 0), sl = i => S.slots[i];
  // primer segundo: a ras del papel, con la punta del compás dibujando el arco y la pata gigante subiendo
  CK_OPEN = [
    [-1.0, [-1.3, 0.5, -1.45], [-1.85, 0.1, -0.35], 32, 0.02],
    [0.0, [-0.75, 0.55, -1.55], [-1.3, 0.1, -0.49], 32, 0.03],
    [0.55, [0.1, 0.6, -0.95], [-0.6, 0.15, -0.35], 33, 0.01],
  ];
  CK = [
    ...CK_OPEN,
    [1.05, [0.6, 0.45, 0.55], [-1.3, 0.2, -0.35], 34, 0.0],                                      // el arco se levanta del papel
    [K.puente1 + 0.15, [0.35, 0.55, 0.9], [-1.2, 0.25, -0.3], 36, -0.02],                     // el tablero sube
    [K.ingeniero + 0.12, [1.05, 0.42, 1.45], [1.45, 0.2, 0.3], 33, 0.02],                         // golpe de cámara a la casa
    [K.caminos1 + 0.4, [1.7, 0.62, 1.55], [1.55, 0.22, 0.3], 34],
    [K.no1 + 0.05, [1.82, 0.8, 1.62], [1.55, 0.18, 0.32], 36],                                    // el sello la aplasta
    [K.tu1 + 0.05, [1.72, 1.05, 1.38], [1.55, 0.02, 0.36], 34],
    [K.dicen + 0.15, [1.35, 0.85, 0.65], [0.75, 0.3, -0.95], 34],                                 // cae el libro de la ley
    [K.ley2 + 0.25, [1.25, 0.62, -0.05], [0.65, 0.08, -1.05], 32],
    [K.tribunal + 0.1, [1.85, 0.5, -0.45], [1.3, 0.18, -1.15], 32],                             // el mazo
    [K.supremo2 + 0.25, [1.72, 0.4, -0.62], [1.32, 0.14, -1.15], 32, 0.02],
    [K.porque3 + 0.25, [0.75, 0.75, 1.65], [-0.45, 0.6, -0.95], 34],                              // las barras vuelan del puente al «?»
    [K.digo, [0.55, 1.1, 2.3], [-0.25, 1.05, -1.45], 32],
    [K.nadie + 0.15, [0.25, 1.05, 1.2], [-0.25, 1.0, -1.45], 32, -0.03],
    // vuelo al duelo (pantalla partida en vertical: arriba Caminos, abajo Arquitectura)
    [K.caminos4 + 0.15, [6.1, 1.42, -2.95], [6.0, 1.12, -4.5], 33, 0.03],
    [K.vosotros4 - 0.05, [6.1, 1.25, -3.05], [6.0, 1.12, -4.5], 32],
    [K.dibujais + 0.1, [5.95, 0.45, -3.0], [6.0, 0.36, -4.5], 32, -0.02],
    [K.nosotros4 + 0.1, [6.05, 0.9, -1.8], [6.0, 0.86, -4.5], 33],
    [K.caiga + 0.3, [6.0, 0.88, -1.55], [6.0, 0.85, -4.5], 33],
    [K.arquitectos5 + 0.1, [5.92, 0.42, -2.85], [6.0, 0.37, -4.5], 32, 0.02],
    [K.calculais + 0.1, [6.12, 1.35, -3.05], [6.0, 1.3, -4.5], 32],
    [K.nosotros5 + 0.1, [6.0, 0.9, -1.75], [6.0, 0.85, -4.5], 33],
    [K.vivir + 0.1, [5.98, 0.48, -2.95], [6.0, 0.42, -4.5], 32],
    [K.dentro5 + 0.45, [6.0, 0.45, -2.85], [6.0, 0.4, -4.5], 32],
    // «por dentro»: picado bajo tierra, el corte del terreno
    [K.dentro6 + 0.35, [9.6, -0.1, -6.2], [11.3, -0.35, -9.0], 36, 0.06],
    [K.esto + 0.2, [11.3, -0.32, -6.5], [11.5, -0.42, -9.0], 35],
    [K.suelos + 0.45, [11.65, -0.4, -6.4], [11.5, -0.5, -9.0], 36],
    [K.inclina + 0.1, [12.0, 0.15, -6.55], [11.65, 0.32, -9.0], 33],
    [K.pisa + 0.2, [11.95, 0.32, -6.7], [11.75, 0.42, -9.0], 33, -0.02],
    [K.estructuras + 0.15, [11.95, 0.4, -7.6], [11.9, 0.3, -9.0], 34],
    [K.estructuras + 0.6, [11.5, 0.62, -6.8], [12.2, 0.32, -9.0], 34],
    [K.trenes + 0.05, [13.25, 0.52, -7.75], [12.2, 0.42, -9.0], 32, 0.03],
    [K.viento + 0.2, [13.6, 0.95, -6.8], [12.3, 0.4, -9.0], 33],
    // la presa
    [K.presas + 0.1, [16.05, 0.52, -12.15], [RXD - 0.15, 0.12, RZ], 33],
    [K.frenan + 0.25, [16.25, 0.42, -12.35], [RXD - 0.2, 0.1, RZ], 33],
    [K.rios + 0.2, [16.35, 0.75, -12.15], [RXD - 0.1, 0.05, RZ - 0.1], 36],
    // el mapa (se abre el plano con un zoom: fov amplio)
    [K.carreteras + 0.25, [17.7, 2.4, -11.1], [17.75, 0.0, -13.25], 44],
    [K.espana + 0.1, [17.72, 3.3, -10.7], [17.75, 0.0, -13.28], 48],
    [K.mundo + 0.1, [17.78, 3.45, -10.6], [17.75, 0.0, -13.3], 48, 0.01],
    // Madrid: el polideportivo y la casa
    [K.supremo8 + 0.2, [17.7, 0.95, -12.3], [MAD.x, 0.05, MAD.z], 38],
    [K.polideportivo + 0.2, [MAD.x - 0.04, 0.75, MAD.z + 1.4], [MAD.x, 0.08, MAD.z + 0.05], 50],
    [K.tu8 + 0.15, [MAD.x + 0.03, 0.72, MAD.z + 1.38], [MAD.x + 0.01, 0.08, MAD.z + 0.05], 50],
    [K.no8 + 0.2, [MAD.x + 0.02, 0.76, MAD.z + 1.42], [MAD.x + 0.01, 0.08, MAD.z + 0.05], 50],
    // el libro de la ley y sus edificios
    [K.ley9 + 0.15, [22.1, 1.05, -16.2], [21.7, 0.1, -17.55], 34, 0.03],
    [K.dice9 + 0.1, [21.95, 0.7, -16.75], [21.75, 0.1, -17.55], 32],
    [K.edificio9 + 0.05, [21.6, 1.25, -15.7], [21.4, 0.3, -18.0], 40],
    [K.vive + 0.35, [sl(0).x + 0.12, 1.15, -17.2], [sl(0).x, 0.25, sl(0).z], 36],
    [K.estudia + 0.35, [sl(1).x + 0.1, 1.15, -17.2], [sl(1).x, 0.25, sl(1).z], 36],
    [K.cura + 0.35, [sl(2).x + 0.08, 1.17, -17.2], [sl(2).x, 0.27, sl(2).z], 36],
    [K.reza + 0.35, [sl(3).x + 0.05, 1.2, -17.2], [sl(3).x, 0.28, sl(3).z], 36],
    [K.firma + 0.3, [21.4, 1.25, -16.2], [21.4, 0.22, -18.3], 46],
    [K.arquitecto9 + 0.2, [21.35, 1.35, -16.0], [21.4, 0.22, -18.3], 46],
    // vuelta al plano: el puente (no es un edificio), el cartel y el mazo
    [K.puente10 + 0.1, [-0.35, 0.3, 1.25], [-1.0, 0.2, -0.2], 36, -0.04],
    [K.edificio10 + 0.3, [-0.5, 0.45, 1.05], [-1.0, 0.25, -0.2], 34],
    [K.colegio + 0.1, [0.55, 0.62, 2.6], [-0.38, 0.45, 0.72], 33],
    [K.exclusiva + 0.2, [0.45, 0.62, 2.45], [-0.36, 0.48, 0.74], 32],
    [K.dijo + 0.15, [0.42, 0.68, 2.35], [-0.35, 0.5, 0.75], 33, 0.02],
    [K.no10 + 0.2, [0.45, 0.6, 2.45], [-0.35, 0.3, 0.75], 34],
    // la casa: fórmulas alrededor, la ventana y quien duerme dentro
    [K.ley11 + 0.3, [2.3, 0.62, 1.85], [1.55, 0.2, 0.38], 34],
    [K.mejor + 0.2, [2.0, 0.5, 1.6], [1.58, 0.18, 0.4], 33],
    [K.mira11b + 0.2, [1.7, 0.22, 1.0], [HW.x - 0.01, HW.y, 0.35], 33],
    [K.dormir - 0.12, [HW.x, HW.y + 0.008, HW.z + 0.12], [HW.x - 0.02, HW.y - 0.01, 0.3], 36],
    [K.dormir + 0.12, [HW.x + 0.02, HW.y + 0.035, HW.z - 0.035], [1.56, 0.07, 0.3], 52],
    [K.dentro11 + 0.3, [HW.x + 0.03, HW.y + 0.035, HW.z - 0.05], [1.555, 0.075, 0.295], 52],
    [K.caminos12 + 0.1, [HW.x + 0.03, HW.y + 0.035, HW.z - 0.055], [1.555, 0.078, 0.295], 52],
    [K.arquitectura12 + 0.25, [HW.x, HW.y + 0.01, HW.z + 0.1], [1.56, 0.12, 0.3], 36],      // salimos por la ventana
    [K.mandaselo + 0.2, [3.0, 0.95, 0.85], [0.2, 0.15, 0.0], 38],
    [END - LOOP_D, [3.6, 1.35, 1.0], [0.0, 0.15, -0.1], 38],
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ' (' + CK[i][0].toFixed(2) + ')');
}
function blendCam(A, B, w) { return { p: A.p.clone().lerp(B.p, w), l: A.l.clone().lerp(B.l, w), f: lerp(A.f, B.f, w), roll: lerp(A.roll, B.roll, w) }; }
function camAt(t) {
  let c = camKeys(t, CK);
  const we = win(t, END - LOOP_D, LOOP_D - 0.04); if (we > 0) c = blendCam(c, camKeys(t - END, CK_OPEN), we);   // golpe de vuelta al principio (bucle)
  let sh = 0; for (const [t0, a] of [[K.no1 + 0.02, 0.012], [K.ley2, 0.006], [K.supremo2 + 0.08, 0.008], [K.caiga, 0.004], [K.estructuras + 0.3, 0.008], [K.dijo + 0.04, 0.01], [K.no8, 0.004]]) if (t > t0) sh += a * Math.exp(-(t - t0) * 9);
  if (sh > 1e-4) { const k = c.p.distanceTo(c.l); c.p.x += sh * k * Math.sin(t * 97); c.p.y += sh * k * Math.cos(t * 83); }
  return c;
}
function rigFollow(l, t, camP) {
  const R = S.rig;
  R.key.position.set(l.x - 1.6, Math.max(l.y, 0) + 3.0, l.z + 2.2); R.key.target.position.set(l.x, Math.max(-1, l.y - 0.4), l.z); R.key.intensity = 18; R.key.target.updateMatrixWorld();
  R.rimC.position.set(l.x - 2.2, l.y + 0.6, l.z - 1.8); R.rimW.position.set(l.x + 2.2, l.y + 0.7, l.z - 1.6); R.fill.position.set(l.x + 0.6, l.y + 1.4, l.z + 3.0);
  // dentro de la casa: la lámpara de la mesilla
  const inside = S.house.lamp ? clamp(1 - (camP.distanceTo(wpos(S.house.lamp)) - 0.25) / 0.6) : 0;
  if (S.house.lamp) wpos(S.house.lamp, R.houseL.position); R.houseL.intensity = 0.55 * inside;
}
// ---------------------------------------------------------------- HUD: cabecera, etiquetas, marcador Caminos–Arquitectura, rótulos y fuentes
const ckk = (t, t0, t1, d = 0.6) => (t < t0 || t > t1 + 0.3 ? 0 : clamp((t - t0) / d));
const ckf = (t, t1) => 1 - win(t, t1, 0.28);
function co(t, t0, t1, anchor, txt, sub, o = {}) { const k = ckk(t, t0, t1, o.d || 0.5); if (k > 0) callout(anchor, txt, sub, k, { ...o, fade: ckf(t, t1) }); }
const CA = '#FFB547', AR = '#62E3D4';
let SECT = [];
function buildHudPlan() {
  SECT = [[-9, 'LA PARADOJA'], [K.dicen, 'LEY Y SUPREMO'], [K.caminos4, 'EL DUELO'], [K.por6, 'POR DENTRO'], [K.carreteras, 'LA OBRA PÚBLICA'], [K.aun, 'EL POLIDEPORTIVO'], [K.porque9, 'LA LEY DE 1999'], [K.puente10, 'EL PUENTE'], [K.ley11, 'LA RESPUESTA']];
}
function sectAt(t) { let s = SECT[0][1]; for (const [t0, x] of SECT) if (t >= t0 - 0.05) s = x; return s; }
function headerC(t, sub) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '8px'; hfont(42); hg.textAlign = 'left'; hg.fillStyle = HC.white; hg.fillText('INGENIERÍA CIVIL', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(sub, 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 198, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '4px'; hfont(24); hg.fillStyle = CA; hg.fillText('CAMINOS', 1024, 122);
  hfont(18, false); hg.fillStyle = HC.grey; hg.fillText('VS', 1024, 152); hfont(24); hg.fillStyle = AR; hg.fillText('ARQUITECTURA', 1024, 182);
  hg.restore();
}
function plate2(txt, x, y, size, col, k, o = {}) { if (k <= 0.002) return; hg.save(); hg.globalAlpha = clamp(k * 2.5) * (o.a ?? 1); hfont(size); hg.letterSpacing = Math.round(size * 0.12) + 'px';
  const s = typed(txt, o.type === false ? 1 : clamp(k * 1.6)), w = hg.measureText(txt).width + size * 1.1, h = size * 1.6, sc = 1 + 0.25 * (1 - eo(clamp(k / 0.3)));
  hg.translate(x, y); hg.scale(sc, sc); hg.fillStyle = 'rgba(0,0,0,.62)'; rr(hg, -w / 2, -h / 2, w, h, h * 0.22); hg.fill(); glowStroke(col, 2.5, 14); hg.stroke(); noGlow();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; if (o.glow) { hg.shadowColor = col; hg.shadowBlur = o.glow; } hg.fillText(s, size * 0.06, 2); hg.restore(); }
function pill(txt, t, t0, t1, y = 1540, col = HC.white, size = 21) { const k = ckk(t, t0, t1, 0.4) * ckf(t, t1); if (k <= 0) return; hg.save(); hg.globalAlpha = k; hfont(size, false); hg.letterSpacing = '3px';
  const w = hg.measureText(txt).width + 60; hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, 540 - w / 2, y - size * 1.33, w, size * 2.66, size * 1.33); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 1.5; hg.stroke();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(typed(txt, k * 1.5), 540, y + 1); hg.restore(); }
function source(txt, t, t0, t1) { const k = ckk(t, t0, t1, 0.3) * ckf(t, t1); if (k <= 0) return; hg.save(); hg.globalAlpha = k * 0.85; hfont(17, false); hg.letterSpacing = '2px'; hg.fillStyle = HC.grey; hg.textAlign = 'left'; hg.fillText(txt, 56, 1800); hg.restore(); }
// marcador CAMINOS a – b ARQUITECTURA (con «?» al final)
function scoreboard(t, a, b, k, y = 1600, pulseA = 0, pulseB = 0, q = false) {
  if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k * 2);
  const w = 960, h = 118, x = 540 - w / 2, yy = y + (1 - eo(clamp(k))) * 60;
  hg.fillStyle = 'rgba(0,0,0,.66)'; rr(hg, x, yy - h / 2, w, h, 20); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 2; hg.stroke();
  hg.textBaseline = 'middle'; hg.letterSpacing = '4px';
  hfont(30); hg.textAlign = 'left'; hg.fillStyle = CA; hg.fillText('CAMINOS', x + 34, yy + 2); hg.textAlign = 'right'; hg.fillStyle = AR; hg.fillText('ARQUITECTURA', x + w - 34, yy + 2);
  hg.textAlign = 'center'; hg.letterSpacing = '0px';
  const sa = 1 + 0.5 * pulseA, sb = 1 + 0.5 * pulseB;
  hg.save(); hg.translate(540 - 62, yy + 4); hg.scale(sa, sa); hfont(62); hg.fillStyle = CA; if (pulseA > 0.01) { hg.shadowColor = CA; hg.shadowBlur = 30 * pulseA; } hg.fillText(q ? '?' : String(a), 0, 0); hg.restore();
  hfont(44, false); hg.fillStyle = HC.grey; hg.fillText('–', 540, yy + 2);
  hg.save(); hg.translate(540 + 62, yy + 4); hg.scale(sb, sb); hfont(62); hg.fillStyle = AR; if (pulseB > 0.01) { hg.shadowColor = AR; hg.shadowBlur = 30 * pulseB; } hg.fillText(q ? '?' : String(b), 0, 0); hg.restore();
  hg.restore();
}
function commentIcon(x, y, s, k) { if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(x, y); const sc = 0.6 + 0.4 * eo(clamp(k / 0.4)); hg.scale(sc, sc);
  glowStroke(HC.white, 5, 12); hg.fillStyle = 'rgba(0,0,0,.5)'; rr(hg, -s, -s * 0.7, s * 2, s * 1.3, s * 0.35); hg.fill(); hg.stroke();
  hg.beginPath(); hg.moveTo(-s * 0.45, s * 0.6); hg.lineTo(-s * 0.6, s * 1.05); hg.lineTo(-s * 0.05, s * 0.6); hg.stroke(); noGlow();
  for (let i = 0; i < 3; i++) { hg.fillStyle = HC.white; hg.beginPath(); hg.arc(-s * 0.5 + i * s * 0.5, -s * 0.05, s * 0.13, 0, 7); hg.fill(); } hg.restore(); }
function sendIcon(x, y, s, k) { if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(x + (1 - eo(clamp(k))) * -40, y); hg.rotate(-0.35); const sc = 0.6 + 0.4 * eo(clamp(k / 0.4)); hg.scale(sc, sc);
  glowStroke(HC.white, 5, 12); hg.fillStyle = 'rgba(0,0,0,.5)'; hg.beginPath(); hg.moveTo(-s, -s * 0.15); hg.lineTo(s, -s * 0.8); hg.lineTo(s * 0.35, s * 0.85); hg.lineTo(-s * 0.05, s * 0.2); hg.closePath(); hg.fill(); hg.stroke();
  hg.beginPath(); hg.moveTo(-s * 0.05, s * 0.2); hg.lineTo(s, -s * 0.8); hg.stroke(); noGlow(); hg.restore(); }
// podio de la alta velocidad
function podium(t, k) { if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k * 2);
  const base = 1690, bw = 230, gap = 30, xs = [540 - bw - gap / 2, 540 + gap / 2], hs = [220, 150], cols = ['rgba(238,242,246,.55)', CA], labs = [['1.º', 'CHINA'], ['2.º', 'ESPAÑA']];
  for (let i = 0; i < 2; i++) { const kk = eo(clamp((k - i * 0.15) / 0.6)), h = hs[i] * kk; hg.fillStyle = 'rgba(0,0,0,.6)'; hg.fillRect(xs[i], base - h, bw, h);
    hg.strokeStyle = cols[i]; hg.lineWidth = 3; if (i === 1) { hg.shadowColor = CA; hg.shadowBlur = 18; } hg.strokeRect(xs[i], base - h, bw, h); hg.shadowBlur = 0;
    hg.fillStyle = cols[i]; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(46); hg.letterSpacing = '2px'; if (kk > 0.4) { hg.fillText(labs[i][0], xs[i] + bw / 2, base - h + 46); hfont(30); hg.letterSpacing = '4px'; hg.fillText(labs[i][1], xs[i] + bw / 2, base - h + 96); } }
  hg.restore(); }
function zzz(P, t, k) { if (k <= 0.01 || !P || !P.ok) return; hg.save(); for (let i = 0; i < 3; i++) { const ph = ((t * 0.7 + i / 3) % 1); hg.globalAlpha = k * Math.sin(Math.PI * ph); hfont(40 + i * 10); hg.fillStyle = HC.white; hg.textAlign = 'center';
  hg.fillText('z', P.x + 60 + ph * 90 + i * 12, P.y - 80 - ph * 200); } hg.restore(); }
function hudAt(t) {
  hudBegin();
  const tt = loopT(t);
  if (t < END - 0.3) headerC(t, sectAt(t)); else headerC(t, SECT[0][1]);
  // ---- 1: la paradoja
  co(tt, K.arquitecto + 0.25, K.ingeniero - 0.1, v3(BRX.x + 0.2, 0.36, BRX.z), 'ARQUITECTO', '✓ PUEDE PROYECTARLO', { dx: -60, dy: -330, color: AR, subCol: AR, d: 0.4, bg: true, size: 34 });
  co(t, K.ingeniero + 0.1, K.no1 - 0.15, HSX.clone().add(v3(0, 0.3, 0)), 'INGENIERO DE CAMINOS', null, { dx: -120, dy: -300, color: CA, d: 0.35, bg: true, size: 32 });
  plate2('✗ TU CASA, NO', 540, 1560, 64, HC.red, ckk(t, K.tu1 - 0.1, K.dicen + 0.1, 0.25) * ckf(t, K.dicen + 0.1), { glow: 22, type: false });
  // ---- 2: la ley y el Supremo
  if (S.book.G.visible) co(t, K.ley2 - 0.05, K.porque3 - 0.15, v3(0.7, 0.07, -1.05), 'LEY 38/1999', 'ORDENACIÓN DE LA EDIFICACIÓN', { dx: -140, dy: 300, color: HC.white, d: 0.35, bg: true, size: 34 });
  if (S.gavel.G.visible) co(t, K.tribunal, K.porque3 - 0.15, v3(1.2, 0.14, -1.12), 'TRIBUNAL SUPREMO', null, { dx: 80, dy: -280, color: HC.white, d: 0.35, bg: true, size: 32 });
  // ---- 3: la pregunta, sin respuesta
  pill('LA RESPUESTA, AL FINAL', t, K.final3, K.caminos4 - 0.2, 1580, HC.white, 24);
  // ---- 4-5: el duelo (pantalla partida: arriba Caminos, abajo Arquitectura)
  const kd = ckk(t, K.caminos4 + 0.1, K.esto - 0.1, 0.4) * ckf(t, K.esto - 0.1);
  if (kd > 0) { const P = proj(v3(ZB.x, 0.86, ZB.z)); if (P.ok && P.y > 300 && P.y < 1700) { hg.save(); hg.globalAlpha = kd; hg.strokeStyle = 'rgba(238,242,246,.45)'; hg.lineWidth = 2; hg.setLineDash([16, 12]); hg.beginPath(); hg.moveTo(40, P.y); hg.lineTo(1040, P.y); hg.stroke(); hg.setLineDash([]);
    hfont(26); hg.letterSpacing = '5px'; hg.textAlign = 'left'; hg.textBaseline = 'bottom'; hg.fillStyle = CA; hg.fillText('▲ CAMINOS', 56, P.y - 14); hg.textBaseline = 'top'; hg.fillStyle = AR; hg.fillText('▼ ARQUITECTURA', 56, P.y + 14); hg.restore(); } }
  const sA = t > K.caiga + 0.12 ? 1 : 0, sB = t > K.dentro5 + 0.15 ? 1 : 0;
  scoreboard(t, sA, sB, kd, 1640, Math.exp(-Math.max(0, t - K.caiga - 0.12) * 5) * sA, Math.exp(-Math.max(0, t - K.dentro5 - 0.15) * 5) * sB);
  // ---- 6: lo que estudia uno de Caminos
  if (S.soil.G.visible) { const L = S.soil.layers; let y = 0; const names = ['ARENA', 'ARCILLA', 'GRAVAS', 'ROCA'];
    L.forEach(([h], i) => { co(t, K.suelos + i * 0.12, K.inclina - 0.15, v3(ZC.x - 0.12, y - h / 2, ZC.z + 0.66), names[i], null, { dx: -90, dy: 0, len: 30, color: HC.white, d: 0.3, bg: true, size: 26 }); y -= h; });
    co(t, K.inclina + 0.15, K.estructuras - 0.15, v3(ZC.x + 0.1, -0.3, ZC.z + 0.66), 'SUELO BLANDO', 'ASIENTO → SE INCLINA', { dx: 110, dy: 180, color: CA, d: 0.35, bg: true, size: 28 }); }
  plate2('SUELOS', 540, 1560, 58, HC.white, ckk(t, K.suelos - 0.05, K.estructuras - 0.12, 0.2) * ckf(t, K.estructuras - 0.12), { type: false });
  plate2('ESTRUCTURAS', 540, 1560, 58, HC.white, ckk(t, K.estructuras - 0.05, K.presas - 0.12, 0.2) * ckf(t, K.presas - 0.12), { type: false });
  if (S.deck.G.visible) { co(t, K.trenes, K.viento - 0.1, v3(ZC.x + 0.4, 0.5, ZC.z), 'TREN', null, { dx: -80, dy: -240, color: HC.white, d: 0.25, bg: true, size: 28 });
    co(t, K.viento, K.presas - 0.1, v3(ZC.x + 0.9, 0.45, ZC.z - 0.4), 'VIENTO', null, { dx: 60, dy: -260, color: '#BFEFFF', d: 0.25, bg: true, size: 28 }); }
  plate2('AGUA', 540, 1560, 58, '#BFEFFF', ckk(t, K.presas - 0.05, K.carreteras - 0.15, 0.2) * ckf(t, K.carreteras - 0.15), { type: false });
  // ---- 7: la red
  pill('RED DE ALTA VELOCIDAD · ESQUEMA', t, K.vias + 0.1, K.aun - 0.1, 1430, CA, 20);
  podium(t, ckk(t, K.segunda - 0.05, K.aun - 0.1, 0.6) * ckf(t, K.aun - 0.1));
  source('ATLAS DE ALTA VELOCIDAD DE LA UIC · DATOS DE 2025', t, K.segunda, K.aun - 0.1);
  // ---- 8: el polideportivo sí, tu casa no
  pill('TRIBUNAL SUPREMO · 2012', t, K.supremo8 - 0.05, K.polideportivo - 0.1, 1580, HC.white, 24);
  if (S.sports.G.visible) co(t, K.polideportivo + 0.1, K.porque9 - 0.1, S.sports.G.position.clone().add(v3(0, 0.16, 0)), 'POLIDEPORTIVO', '✓ CAMINOS', { dx: -70, dy: -280, color: CA, subCol: CA, d: 0.35, bg: true, size: 30 });
  if (S.house2.G.visible && t > K.no8 - 0.02) { const P = proj(S.house2.G.position.clone().add(v3(0, 0.18, 0))); if (P.ok) stamp('NO', P.x, P.y, ckk(t, K.no8 - 0.02, K.porque9, 0.3) * ckf(t, K.porque9), HC.red, 110); }
  source('STS 19-01-2012 (PABELLÓN POLIDEPORTIVO) · LEY 38/1999, ART. 10', t, K.polideportivo, K.porque9 - 0.1);
  // ---- 9: la ley de 1999
  pill('LEY 38/1999 · ARTÍCULO 10', t, K.y1999 - 0.05, K.edificio9 - 0.1, 1580, HC.white, 24);
  const names = ['VIVIENDA', 'COLEGIO', 'HOSPITAL', 'IGLESIA'], verbs = [K.vive, K.estudia, K.cura, K.reza];
  if (S.book2.G.visible) verbs.forEach((tv, i) => { const P = S.slots[i].clone().add(v3(0, 0.62, 0)); const A = proj(P);
    if (A.ok) { const k = ckk(t, tv + 0.45, K.puente10 - 0.5, 0.25) * ckf(t, K.puente10 - 0.5); if (k > 0) { hg.save(); hg.globalAlpha = k; hfont(24); hg.letterSpacing = '3px'; hg.textAlign = 'center'; hg.fillStyle = HC.white; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 8; hg.fillText(names[i], A.x, A.y); hg.restore(); }
      const ks = ckk(t, K.firma + i * 0.1, K.puente10 - 0.5, 0.3) * ckf(t, K.puente10 - 0.5); if (ks > 0) stamp('✓', A.x, A.y + 70, ks, AR, 44); } });
  plate2('LO FIRMA UN ARQUITECTO', 540, 1560, 44, AR, ckk(t, K.firma - 0.05, K.puente10 - 0.5, 0.25) * ckf(t, K.puente10 - 0.5), { type: false, glow: 14 });
  source('LEY 38/1999 DE ORDENACIÓN DE LA EDIFICACIÓN, ARTS. 2.1.A Y 10.2.A', t, K.y1999, K.puente10 - 0.5);
  // ---- 10: el puente no es un edificio; el cartel; el Supremo
  plate2('PUENTE ≠ EDIFICIO', 540, 1560, 54, HC.white, ckk(t, K.edificio10 - 0.05, K.colegio - 0.1, 0.25) * ckf(t, K.colegio - 0.1), { type: false });
  plate2('EN EXCLUSIVA', 540, 1560, 54, CA, ckk(t, K.exclusiva - 0.05, K.supremo10 - 0.05, 0.2) * ckf(t, K.supremo10 - 0.05), { type: false, glow: 16 });
  pill('TRIBUNAL SUPREMO · 2012 · NO', t, K.supremo10 - 0.05, K.ley11 - 0.1, 1580, HC.red, 24);
  source('STS 20-02-2012, REC. 2208/2010 (PROYECTO DE UN PUENTE)', t, K.colegio, K.ley11 - 0.1);
  // ---- 11: quién duerme dentro
  if (S.house.head) { const P = proj(wpos(S.house.head)); zzz(P, t, ckk(t, K.dormir + 0.15, END - 1.6, 0.4) * ckf(t, K.arquitectura12)); }
  // ---- 12: el marcador final y el cierre
  const kq = ckk(t, K.caminos12 - 0.05, END - 0.5, 0.35) * ckf(t, END - 0.5);
  scoreboard(t, 0, 0, kq, 1600, 0, 0, true);
  commentIcon(380, 1450, 42, ckk(t, K.mandaselo - 0.1, END - 0.5, 0.3) * ckf(t, END - 0.5)); sendIcon(700, 1450, 42, ckk(t, K.mandaselo + 0.05, END - 0.5, 0.3) * ckf(t, END - 0.5));
}
// ---------------------------------------------------------------- un fotograma
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3();
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
function frame(t) {
  placeCam(camAt(t - 1 / 60)); const prevVP = vpOf();
  placeCam(camAt(t - 1 / 36)); const PVP = vpOf();
  const st = camAt(t); placeCam(st); const VP = vpOf();
  stageAt(t, VP, PVP); rigFollow(st.l, t, st.p);
  flowUpdate(t, VP, PVP); S.gridM.uniforms.camP.value.copy(cam.position);
  const d = Math.max(0.05, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _rt.setFromMatrixColumn(cam.matrixWorld, 0); _up.setFromMatrixColumn(cam.matrixWorld, 1);
  const P0 = cam.position.clone().addScaledVector(_fw, d), Px = P0.clone().addScaledVector(_rt, d * 0.4), Py = P0.clone().addScaledVector(_up, d * 0.4);
  const a = [P0, Px, Py].map(p => p.clone().applyMatrix4(VP)), b = [P0, Px, Py].map(p => p.clone().applyMatrix4(prevVP));
  const m = a.map((q, i) => [q.x - b[i].x, q.y - b[i].y]), dx = [a[1].x - a[0].x, a[1].y - a[0].y], dy = [a[2].x - a[0].x, a[2].y - a[0].y];
  const det = dx[0] * dy[1] - dy[0] * dx[1] || 1e-6, N = [[m[1][0] - m[0][0], m[2][0] - m[0][0]], [m[1][1] - m[0][1], m[2][1] - m[0][1]]];
  const inv = [[dy[1] / det, -dy[0] / det], [-dx[1] / det, dx[0] / det]];
  const J = [N[0][0] * inv[0][0] + N[0][1] * inv[1][0], N[0][0] * inv[0][1] + N[0][1] * inv[1][1], N[1][0] * inv[0][0] + N[1][1] * inv[1][0], N[1][0] * inv[0][1] + N[1][1] * inv[1][1]];
  post.uniforms.m0.value.set(m[0][0], m[0][1]); post.uniforms.a0.value.set(a[0].x, a[0].y); post.uniforms.J.value.set(...J);
  let fl = 0; for (const [t0, k] of [[K.no1 + 0.02, 0.09], [K.supremo2 + 0.08, 0.06], [K.estructuras + 0.3, 0.05], [K.dijo + 0.04, 0.1], [K.no8, 0.05], [K.polideportivo, 0.04]]) if (t > t0) fl += k * Math.exp(-(t - t0) / 0.07);
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
// portada: el puente desplegado sobre el plano y la casa con el «NO» (sin HUD)
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : K.tu1 + 0.3; frame(t);
  const C = window.COVER_CAM || [0.9, 0.95, 2.6, 0.3, 0.2, -0.1, 32];
  cam.fov = C[6]; cam.updateProjectionMatrix(); cam.position.set(C[0], C[1], C[2]); cam.up.set(0, 1, 0); cam.lookAt(C[3], C[4], C[5]); cam.updateMatrixWorld(); rigFollow(v3(C[3], C[4], C[5]), t, cam.position);
  if (window.camOverride) window.camOverride(cam, v3);
  const VP = vpOf(); flowUpdate(t, VP, VP); stageAt(t, VP, VP);
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
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    arquitecto: atL(1, 'arquitecto'), puede1: atL(1, 'puede'), proyectar1: atL(1, 'proyectar'), puente1: atL(1, 'puente'), ingeniero: atL(1, 'ingeniero'), caminos1: atL(1, 'caminos'), no1: atL(1, '=no'), tu1: atL(1, '=tu'), casa1: atL(1, 'casa'),
    dicen: atL(2, 'dicen'), ley2: atL(2, 'ley'), tribunal: atL(2, 'tribunal'), supremo2: atL(2, 'supremo'),
    porque3: atL(3, 'por'), final3: atL(3, 'final'), digo: atL(3, 'digo'), gustar: atL(3, 'gustar'), nadie: atL(3, 'nadie'),
    caminos4: atL(4, 'caminos'), vosotros4: atL(4, 'vosotros'), dibujais: atL(4, 'dibujais'), nosotros4: atL(4, 'nosotros'), hacemos4: atL(4, 'hacemos'), que4: atL(4, '=que'), no4: atL(4, '=no'), caiga: atL(4, 'caiga'),
    arquitectos5: atL(5, 'arquitectos'), vosotros5: atL(5, 'vosotros'), calculais: atL(5, 'calculais'), nosotros5: atL(5, 'nosotros'), vivir: atL(5, 'vivir'), dentro5: atL(5, 'dentro'),
    por6: atL(6, '=por'), dentro6: atL(6, 'dentro'), esto: atL(6, 'esto'), suelos: atL(6, 'suelos'), inclina: atL(6, 'inclina'), torre: atL(6, 'torre'), pisa: atL(6, 'pisa'), estructuras: atL(6, 'estructuras'), trenes: atL(6, 'trenes'), viento: atL(6, 'viento'), presas: atL(6, 'presas'), frenan: atL(6, 'frenan'), rios: atL(6, 'rios'),
    carreteras: atL(7, 'carreteras'), vias: atL(7, 'vias'), espana: atL(7, 'espana'), segunda: atL(7, 'segunda'), alta: atL(7, 'alta'), mundo: atL(7, 'mundo'),
    aun: atL(8, 'aun'), supremo8: atL(8, 'supremo'), polideportivo: atL(8, 'polideportivo'), tu8: atL(8, '=tu'), no8: atL(8, '=no'),
    porque9: atL(9, 'porque'), ley9: atL(9, 'ley'), y1999: atL(9, '1999'), dice9: atL(9, 'dice'), edificio9: atL(9, 'edificio'), vive: atL(9, 'vive'), estudia: atL(9, 'estudia'), cura: atL(9, 'cura'), reza: atL(9, 'reza'), firma: atL(9, 'firma'), arquitecto9: atL(9, 'arquitecto'),
    puente10: atL(10, 'puente'), edificio10: atL(10, 'edificio'), colegio: atL(10, 'colegio'), exclusiva: atL(10, 'exclusiva'), supremo10: atL(10, 'supremo'), dijo: atL(10, 'dijo'), no10: atL(10, '=no', 2),
    ley11: atL(11, 'ley'), calcula: atL(11, 'calcula'), mejor: atL(11, 'mejor'), mira11b: atL(11, 'mira', 2), dormir: atL(11, 'dormir'), dentro11: atL(11, 'dentro'),
    caminos12: atL(12, 'caminos'), arquitectura12: atL(12, 'arquitectura'), mandaselo: atL(12, 'mandaselo'),
  };
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45; }
  buildRig(); buildFloor(); buildFlow();
  S.sheet = buildSheet(); S.bridge = buildBridge(); S.comp = buildCompass();
  S.house = buildHouse(true); S.house.G.position.copy(HSX); scene.add(S.house.G); S.stamp = buildStamp();
  S.book = buildBook(1); scene.add(S.book.G); S.gavel = buildGavel(); S.gavel2 = buildGavel();
  S.q = buildQ(); S.duel = buildDuel(); S.soil = buildSoil(); S.deck = buildDeckBridge(); S.river = buildRiver(); S.map = await buildMap();
  const MAD = mp(...CITY.mad, 0);
  S.sports = buildSports(); S.sports.G.position.copy(MAD).add(v3(-0.19, 0, 0.06));
  S.house2 = buildHouse(false); S.house2.G.position.copy(MAD).add(v3(0.2, 0, 0.06)); S.house2.G.scale.setScalar(0.75); scene.add(S.house2.G);
  S.book2 = buildBook(2.2); S.book2.G.position.copy(ZF); scene.add(S.book2.G);
  S.slots = [-0.45, -0.15, 0.15, 0.45].map((x, i) => v3(ZF.x + x, 0, ZF.z - (i === 0 || i === 3 ? 0.86 : 1.0)));
  S.iconFrom = [-0.6, -0.22, 0.22, 0.6].map(x => v3(ZF.x + x, 0.15, ZF.z + 0.12));
  S.icons = [0, 1, 2, 3].map(k => { const g = buildIcon(k); scene.add(g); return g; });
  S.blds = [0, 1, 2, 3].map(k => { const g = buildBuilding(k); scene.add(g); return g; });
  S.sig = drawLine(Array.from({ length: 60 }, (_, i) => { const u = i / 59; return v3(ZF.x + 0.28 + u * 0.42, 0.146, ZF.z + 0.42 - Math.sin(u * 19) * 0.03 * (1 - u * 0.5) - u * 0.04); }), TEAL, 2.6, 1); scene.add(S.sig);
  S.sign = buildSign(); S.formulas = buildFormulas();
  post.uniforms.ca.value = 0.35;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
