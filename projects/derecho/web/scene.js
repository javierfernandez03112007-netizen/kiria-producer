// «Derecho por dentro»: un mazo gigante sobre cien estudiantes, el campo de los que empiezan la carrera, los códigos y la balanza, y un
// círculo de estaciones (una por asignatura) con objetos realistas: madera, latón, mármol, piel, papel y tela. Al final, el máster y el
// examen, la oposición y la toga. window.renderAt(t) dibuja el instante t (60 fps).
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
// ---------------------------------------------------------------- «Derecho por dentro»: materiales realistas (madera, latón, mármol, piel, papel, tela)
// y las piezas de cada estación. Escala: las figuritas de los estudiantes miden ≈ 0,05; las estaciones están en un círculo de radio R_ST.
const R_ST = 8.0, R_CAM = 10.6;
const ANG = { B: 28, CI: 58, PE: 88, AD: 118, ME: 148, PR: 178, IN: 208, SA: 243, AB: 278, JU: 313, TO: 343 };
const D2 = Math.PI / 180;
const stP = (a, r = R_ST, y = 0) => v3(r * Math.sin(a * D2), y, r * Math.cos(a * D2));
const stT = a => v3(Math.cos(a * D2), 0, -Math.sin(a * D2));      // tangente (derecha mirando hacia el centro desde fuera)
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
  M.cloth = new THREE.MeshPhysicalMaterial({ color: 0x0b0c10, roughness: 0.82, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x5a6070) });
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
function gavel(s = 1) {      // mazo de juez: cabeza torneada con aros de latón y mango
  const g = new THREE.Group(), head = new THREE.Group();
  const hp = [[0, -0.25], [0.07, -0.25], [0.085, -0.235], [0.085, -0.2], [0.075, -0.19], [0.078, -0.07], [0.09, -0.05], [0.09, 0.05], [0.078, 0.07], [0.075, 0.19], [0.085, 0.2], [0.085, 0.235], [0.07, 0.25], [0, 0.25]];
  const h = lathe(hp, 40, M.wood); h.rotation.z = Math.PI / 2; head.add(h);
  for (const x of [-0.13, 0.13]) { const b = cyl(0.0805, 0.0805, 0.03, M.brass, 40); b.rotation.z = Math.PI / 2; b.position.x = x; head.add(b); }
  const hd = lathe([[0, 0], [0.024, 0], [0.026, 0.05], [0.02, 0.32], [0.026, 0.38], [0.03, 0.42], [0.024, 0.45], [0, 0.46]], 24, M.wood); hd.position.y = 0.06; head.add(hd);
  g.add(head); g.userData.head = head; g.scale.setScalar(s); return g;
}
function soundBlock(s = 1) { const g = new THREE.Group(); const a = cyl(0.2, 0.21, 0.06, M.wood, 48); a.position.y = 0.03; g.add(a); const r = cyl(0.205, 0.205, 0.012, M.brass, 48); r.position.y = 0.055; g.add(r); g.scale.setScalar(s); return g; }
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
function book(w, h, d, color, title, sub = '') {
  const g = new THREE.Group(), lm = M.leather(color);
  const cover = rbox(w, h, d, lm, 0.012); g.add(cover);
  const pg = mesh(new THREE.BoxGeometry(w * 0.94, h * 0.95, d * 0.8), M.pages); pg.position.x = w * 0.03; g.add(pg);
  if (title) { const p = plateText(w * 0.8, h * 0.5, [[title, 0.13, 0.36], [sub, 0.08, 0.62]], { border: true }); p.position.set(0, 0, d / 2 + 0.001); g.add(p);
    const sp = plateText(h * 0.86, d * 0.8, [[title, 0.5, 0.5]]); sp.rotation.set(0, -Math.PI / 2, Math.PI / 2); sp.position.set(-w / 2 - 0.001, 0, 0); g.add(sp); }
  return g;
}
function openBook(w, h, color, pageDraw) {      // libro abierto: dos páginas curvadas sobre las tapas
  const g = new THREE.Group(), lm = M.leather(color);
  const cov = rbox(w * 2.06, 0.02, h * 1.04, lm, 0.008); cov.rotation.x = 0; g.add(cov);
  const tex = paperTex(pageDraw, 1024, 700);
  for (const sd of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(w, h, 24, 1); const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + w / 2; const u = x / w; p.setZ(i, Math.sin(u * Math.PI) * 0.06 * w + (1 - u) * 0.03 * w); p.setX(i, sd * x); uv.setX(i, sd < 0 ? 0.5 - uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5); }
    geo.computeVertexNormals();
    const pm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide });
    const page = mesh(geo, pm); page.rotation.x = -Math.PI / 2; page.position.y = 0.02; g.add(page);
    const blk = mesh(new THREE.BoxGeometry(w * 0.98, 0.03, h * 0.98), M.pages); blk.position.set(sd * w * 0.5, 0.012, 0); g.add(blk);
  }
  g.userData.tex = tex; return g;
}
function toga(h = 0.32, puñetas = true) {       // toga negra (tela con brillo de raso) con puñetas blancas en las mangas
  const g = new THREE.Group();
  const body = lathe([[0, 0], [0.098 * h / 0.32, 0], [0.1 * h / 0.32, 0.01], [0.085 * h / 0.32, h * 0.3], [0.075 * h / 0.32, h * 0.6], [0.07 * h / 0.32, h * 0.86], [0.05 * h / 0.32, h * 0.95], [0.03 * h / 0.32, h], [0, h]], 40, M.cloth);
  g.add(body);
  for (const sd of [-1, 1]) {
    const sl = cyl(0.022 * h / 0.32, 0.034 * h / 0.32, h * 0.42, M.cloth, 20); sl.position.set(sd * 0.085 * h / 0.32, h * 0.62, 0.01); sl.rotation.z = sd * 0.25; g.add(sl);
    if (puñetas) { const p = new THREE.Mesh(new THREE.TorusGeometry(0.032 * h / 0.32, 0.0055 * h / 0.32, 8, 24), M.lace); p.position.set(sd * 0.112 * h / 0.32, h * 0.43, 0.01); p.rotation.set(Math.PI / 2, 0, sd * 0.25); g.add(p); }
  }
  const col = new THREE.Mesh(new THREE.TorusGeometry(0.032 * h / 0.32, 0.008 * h / 0.32, 8, 24), M.lace); col.rotation.x = Math.PI / 2; col.position.y = h * 0.93; g.add(col);
  return g;
}
function figurine(m = M.ceramic, s = 1) {     // figurita de cerámica (maniquí) de ≈ 0,16 × s de alto
  const d = makeDoll(m); d.scale.setScalar(0.16 * s); d.userData.s0 = 0.16 * s; return d;
}
function column(hgt = 1, r = 0.07, m = M.marble) {
  const g = new THREE.Group();
  const base = lathe([[0, 0], [r * 1.45, 0], [r * 1.45, r * 0.25], [r * 1.25, r * 0.4], [r * 1.25, r * 0.55], [r * 1.08, r * 0.7], [0, r * 0.7]], 40, m); g.add(base);
  const sg = new THREE.CylinderGeometry(r * 0.92, r, hgt, 48, 6); const p = sg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), rr2 = Math.hypot(x, z), k = 1 - 0.045 * Math.pow(Math.abs(Math.cos(a * 10)), 0.6); if (rr2 > 1e-4) { p.setX(i, x * k); p.setZ(i, z * k); } }
  sg.computeVertexNormals(); const sh = mesh(sg, m); sh.position.y = r * 0.7 + hgt / 2; g.add(sh);
  const ech = lathe([[0, 0], [r * 0.95, 0], [r * 1.3, r * 0.35], [r * 1.35, r * 0.45], [0, r * 0.45]], 40, m); ech.position.y = r * 0.7 + hgt; g.add(ech);
  const ab = rbox(r * 2.9, r * 2.9, r * 0.32, m, r * 0.05); ab.rotation.x = Math.PI / 2; ab.position.y = r * 0.7 + hgt + r * 0.6; g.add(ab);
  g.userData.h = r * 0.7 + hgt + r * 0.76; return g;
}
function scales(s = 1) {        // balanza de la justicia de latón: el brazo (beam) gira, los platillos cuelgan siempre verticales
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.22, 0], [0.22, 0.03], [0.16, 0.06], [0.06, 0.09], [0.035, 0.12], [0, 0.12]], 48, M.brass));
  const post = lathe([[0, 0], [0.03, 0], [0.022, 0.1], [0.02, 0.9], [0.03, 0.94], [0.035, 1.0], [0, 1.0]], 24, M.brass); post.position.y = 0.1; g.add(post);
  const top = sph(0.04, M.gold); top.position.y = 1.14; g.add(top);
  const beam = new THREE.Group(); beam.position.y = 1.06; g.add(beam);
  const bm = cyl(0.016, 0.016, 0.9, M.brass, 16); bm.rotation.z = Math.PI / 2; beam.add(bm);
  const pans = [];
  for (const sd of [-1, 1]) {
    const end = sph(0.026, M.brass); end.position.x = sd * 0.45; beam.add(end);
    const hang = new THREE.Group(); hang.position.x = sd * 0.45; beam.add(hang);
    for (let k = 0; k < 3; k++) { const a = k * 2.094, c = bar(v3(0, 0, 0), v3(Math.cos(a) * 0.12, -0.42, Math.sin(a) * 0.12), 0.0035, M.brass, 6); hang.add(c); }
    const pan = lathe([[0, -0.44], [0.13, -0.42], [0.15, -0.395], [0.152, -0.39], [0.135, -0.405], [0, -0.425]], 48, M.brass); hang.add(pan);
    pans.push(hang);
  }
  g.userData = { beam, pans }; g.scale.setScalar(s); return g;
}
function scalesTilt(sc, a) { const U = sc.userData; U.beam.rotation.z = a; for (const p of U.pans) p.rotation.z = -a; }
function pen() { const g = new THREE.Group(); const b = lathe([[0, 0], [0.006, 0.004], [0.008, 0.03], [0.009, 0.14], [0.007, 0.16], [0, 0.165]], 20, M.black); g.add(b); const r = cyl(0.0092, 0.0092, 0.01, M.gold, 20); r.position.y = 0.1; g.add(r); const nib = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.025, 12), M.gold); nib.rotation.x = Math.PI; nib.position.y = -0.01; g.add(nib); return g; }
function key(s = 1) { const g = new THREE.Group(); const bow = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 10, 28), M.brass); g.add(bow); const sh = cyl(0.006, 0.006, 0.14, M.brass, 12); sh.rotation.z = Math.PI / 2; sh.position.x = 0.1; g.add(sh); for (const x of [0.15, 0.165]) { const b = mesh(new THREE.BoxGeometry(0.008, 0.03, 0.008), M.brass); b.position.set(x, -0.016, 0); g.add(b); } g.scale.setScalar(s); return g; }
function handcuffs() {
  const g = new THREE.Group();
  for (const sd of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 12, 40, Math.PI * 1.75), M.steel); r.rotation.x = Math.PI / 2; r.position.x = sd * 0.085; r.rotation.z = sd > 0 ? 0.4 : 3.5; r.castShadow = true; g.add(r);
    const bx2 = rbox(0.03, 0.016, 0.022, M.steel, 0.004); bx2.position.set(sd * 0.03, 0, 0); g.add(bx2);
  }
  for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0025, 6, 14), M.steel); l.position.set(-0.012 + k * 0.012, 0, 0); l.rotation.y = k % 2 ? Math.PI / 2 : 0; g.add(l); }
  return g;
}
function hourglass(s = 1) {
  const g = new THREE.Group();
  for (const y of [0, 0.32]) { const d = cyl(0.11, 0.11, 0.025, M.wood, 32); d.position.y = y; g.add(d); }
  for (let k = 0; k < 3; k++) { const a = k * 2.094, p = cyl(0.009, 0.009, 0.3, M.brass, 10); p.position.set(Math.cos(a) * 0.09, 0.16, Math.sin(a) * 0.09); g.add(p); }
  const gl = lathe([[0.001, 0.012], [0.07, 0.02], [0.075, 0.07], [0.04, 0.13], [0.008, 0.16], [0.04, 0.19], [0.075, 0.25], [0.07, 0.3], [0.001, 0.308]], 32, M.glass); g.add(gl);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 24), M.sand); top.rotation.x = Math.PI; top.position.y = 0.215; g.add(top);
  const bot = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.07, 24), M.sand); bot.position.y = 0.05; g.add(bot);
  const stream = cyl(0.002, 0.002, 0.13, M.sand, 6); stream.position.y = 0.1; g.add(stream);
  g.userData = { top, bot, stream }; g.scale.setScalar(s); return g;
}
function magnifier(s = 1) { const g = new THREE.Group(); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.009, 12, 48), M.brass); g.add(rim); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.088, 40), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide })); g.add(lens); const hd = cyl(0.012, 0.015, 0.16, M.wood, 16); hd.position.y = -0.17; g.add(hd); g.scale.setScalar(s); return g; }
function fingerprintTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(160,255,240,.95)'; g.lineWidth = 3.2; g.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const r = 14 + i * 8.6; g.beginPath(); for (let a = 0; a <= 6.3; a += 0.05) { const wob = Math.sin(a * 3 + i * 0.7) * 3 + Math.sin(a * 7 + i) * 1.5, rx = r * 0.78 + wob, ry = r + wob; const x = w / 2 + Math.cos(a) * rx, y = h / 2 + Math.sin(a) * ry * (a > 3.3 && a < 6.1 ? 1 : 0.86); if (hash(i * 7 + Math.floor(a * 3)) < 0.06) { g.moveTo(x, y); continue; } a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  });
}
function marker(n) { const g = new THREE.Group(); const t = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#f2c218'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = '900 84px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), w / 2, h / 2 + 4); });
  for (const sd of [-1, 1]) { const p = mesh(new THREE.PlaneGeometry(0.07, 0.07), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, side: THREE.DoubleSide })); p.position.set(0, 0.032, sd * 0.018); p.rotation.x = sd * 0.48; g.add(p); } return g; }
function rubberStamp(word, col = "#b8121b") {     // sello de caucho con mango de madera
  const g = new THREE.Group(); const hd = lathe([[0, 0.05], [0.03, 0.05], [0.022, 0.09], [0.026, 0.13], [0.04, 0.16], [0.03, 0.19], [0, 0.195]], 24, M.wood); g.add(hd);
  const b = rbox(0.12, 0.05, 0.08, M.woodL, 0.006); b.rotation.x = Math.PI / 2; b.position.y = 0.03; g.add(b);
  const rub = mesh(new THREE.BoxGeometry(0.115, 0.008, 0.075), new THREE.MeshStandardMaterial({ color: 0x3a0d0f, roughness: 0.8 })); rub.position.y = 0.002; g.add(rub); g.userData.word = word; g.userData.col = col; return g;
}
function building(s = 1, m = M.stone) {        // fachada neoclásica genérica (escalinata, seis columnas, frontón)
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const st = mesh(new THREE.BoxGeometry(1.5 - i * 0.06, 0.04, 0.7 - i * 0.06), m); st.position.y = 0.02 + i * 0.04; g.add(st); }
  const core = mesh(new THREE.BoxGeometry(1.3, 0.56, 0.4), m); core.position.set(0, 0.12 + 0.28, -0.1); g.add(core);
  for (let i = 0; i < 6; i++) { const c = column(0.46, 0.03, m); c.position.set(-0.6 + i * 0.24, 0.12, 0.18); g.add(c); }
  const arch = mesh(new THREE.BoxGeometry(1.42, 0.07, 0.56), m); arch.position.set(0, 0.12 + 0.6 + 0.035, -0.02); g.add(arch);
  const tri = new THREE.Shape(); tri.moveTo(-0.72, 0); tri.lineTo(0.72, 0); tri.lineTo(0, 0.22); tri.closePath();
  const ped = mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.5, bevelEnabled: false }), m); ped.position.set(0, 0.12 + 0.67, -0.27); g.add(ped);
  g.scale.setScalar(s); return g;
}
function tower(w, h, d, seed) { const t = canvasTex(128, 256, (g, W2, H2) => { g.fillStyle = '#0b1220'; g.fillRect(0, 0, W2, H2); for (let y = 6; y < H2; y += 12) for (let x = 6; x < W2; x += 14) { g.fillStyle = hash(x * 0.3 + y * 1.7 + seed) > 0.55 ? 'rgba(255,214,150,.95)' : 'rgba(70,110,160,.35)'; g.fillRect(x, y, 9, 7); } });
  const m = new THREE.MeshPhysicalMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.12, metalness: 0.4, clearcoat: 1 }); const b = mesh(new THREE.BoxGeometry(w, h, d), m); b.position.y = h / 2; const top = mesh(new THREE.BoxGeometry(w * 1.02, 0.015, d * 1.02), M.dsteel); top.position.y = h; return grp(b, top); }
function cardboardBox() { const g = new THREE.Group(), m = M.card, s = 0.2, hh = 0.13;
  const bot = mesh(new THREE.BoxGeometry(s, 0.006, s * 0.7), m); g.add(bot);
  for (const [x, z, w, d] of [[0, s * 0.35, s, 0.006], [0, -s * 0.35, s, 0.006], [s / 2, 0, 0.006, s * 0.7], [-s / 2, 0, 0.006, s * 0.7]]) { const p = mesh(new THREE.BoxGeometry(w, hh, d), m); p.position.set(x, hh / 2, z); g.add(p); }
  const pot = cyl(0.03, 0.022, 0.05, plastic(0xb5532f, 0.6), 20); pot.position.set(-0.05, hh + 0.01, 0); g.add(pot);
  for (let k = 0; k < 6; k++) { const lf = sph(0.025, plastic(0x2f7a3a, 0.5), 10, 8); lf.scale.set(0.6, 1.4, 0.3); lf.position.set(-0.05 + Math.cos(k) * 0.02, hh + 0.06 + hash(k) * 0.03, Math.sin(k) * 0.02); lf.rotation.z = (k - 3) * 0.3; g.add(lf); }
  const mug = cyl(0.024, 0.022, 0.05, M.ceramic, 20); mug.position.set(0.05, hh + 0.0, 0.01); g.add(mug);
  return g; }
function coin(r = 0.03) { const c = cyl(r, r, r * 0.22, M.gold, 32); return c; }
function chair(back = 0.3, m = M.wood) { const g = new THREE.Group(); const seat = mesh(new THREE.BoxGeometry(0.14, 0.02, 0.14), m); seat.position.y = 0.12; g.add(seat);
  const bk = mesh(new THREE.BoxGeometry(0.14, back, 0.02), M.leather(0x2b1a12)); bk.position.set(0, 0.13 + back / 2, -0.065); g.add(bk);
  for (const [x, z] of [[-0.06, -0.06], [0.06, -0.06], [-0.06, 0.06], [0.06, 0.06]]) { const l = cyl(0.007, 0.007, 0.12, m, 8); l.position.set(x, 0.06, z); g.add(l); } return g; }
function star5(r = 0.05, m = M.gold) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.42 : r; const x = Math.cos(a) * rr2, y = Math.sin(a) * rr2; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: r * 0.25, bevelEnabled: true, bevelSize: r * 0.06, bevelThickness: r * 0.06, bevelSegments: 2 }); g.center(); return mesh(g, m); }
function medal() { const g = new THREE.Group(); const d = cyl(0.05, 0.05, 0.01, M.gold, 40); d.rotation.x = Math.PI / 2; g.add(d); const r = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.005, 8, 40), M.brass); g.add(r);
  const rib = mesh(new THREE.BoxGeometry(0.035, 0.09, 0.003), plastic(0x8e1418, 0.5)); rib.position.y = 0.09; g.add(rib); const st = star5(0.025); st.position.z = 0.008; g.add(st); return g; }
function vitrine(w = 0.36, h = 0.7) {      // vitrina de cristal con peana de madera y cerradura
  const g = new THREE.Group(); const base = rbox(w + 0.06, 0.08, w + 0.06, M.wood, 0.01); base.rotation.x = Math.PI / 2; base.position.y = 0.04; g.add(base);
  const glass = mesh(new THREE.BoxGeometry(w, h, w), M.glass, false); glass.position.y = 0.08 + h / 2; glass.renderOrder = 7; g.add(glass);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, w)), new THREE.LineBasicMaterial({ color: 0xcfa860 })); frame.position.copy(glass.position); g.add(frame);
  const cap = rbox(w + 0.04, 0.03, w + 0.04, M.wood, 0.008); cap.rotation.x = Math.PI / 2; cap.position.y = 0.08 + h + 0.015; g.add(cap);
  const lock = rbox(0.05, 0.065, 0.02, M.brass, 0.006); lock.position.set(0, 0.08 + h * 0.45, w / 2 + 0.012); g.add(lock);
  const led = sph(0.008, M.redLed); led.position.set(0, 0.08 + h * 0.45 + 0.018, w / 2 + 0.024); g.add(led);
  const hole = cyl(0.006, 0.006, 0.01, M.black, 12); hole.rotation.x = Math.PI / 2; hole.position.set(0, 0.08 + h * 0.45 - 0.008, w / 2 + 0.023); g.add(hole);
  g.userData = { glass, led, lock, h }; return g;
}
function courtroom(s = 1) {      // sala de vistas en miniatura: estrado elevado, mesas de las partes, banquillo de testigos
  const g = new THREE.Group();
  const floor = mesh(new THREE.BoxGeometry(1.5, 0.02, 1.1), M.woodL); floor.position.y = 0.01; g.add(floor);
  const dais = mesh(new THREE.BoxGeometry(1.1, 0.12, 0.3), M.wood); dais.position.set(0, 0.08, -0.38); g.add(dais);
  const bench = mesh(new THREE.BoxGeometry(1.0, 0.2, 0.08), M.wood); bench.position.set(0, 0.24, -0.28); g.add(bench);
  for (let i = 0; i < 5; i++) { const pnl = mesh(new THREE.BoxGeometry(0.16, 0.13, 0.005), M.woodL); pnl.position.set(-0.4 + i * 0.2, 0.24, -0.239); g.add(pnl); }
  for (let i = -1; i <= 1; i++) { const c = chair(0.26); c.position.set(i * 0.3, 0.14, -0.44); c.scale.setScalar(0.9); g.add(c); }
  for (const sd of [-1, 1]) { const tb = mesh(new THREE.BoxGeometry(0.4, 0.02, 0.18), M.wood); tb.position.set(sd * 0.36, 0.13, 0.18); g.add(tb); for (const x of [-0.18, 0.18]) { const l = mesh(new THREE.BoxGeometry(0.02, 0.12, 0.16), M.wood); l.position.set(sd * 0.36 + x, 0.06, 0.18); g.add(l); }
    for (const x of [-0.1, 0.1]) { const c = chair(0.16); c.position.set(sd * 0.36 + x, 0, 0.32); c.rotation.y = Math.PI; c.scale.setScalar(0.85); g.add(c); } }
  const wit = mesh(new THREE.BoxGeometry(0.18, 0.16, 0.16), M.wood); wit.position.set(0.62, 0.08, -0.12); g.add(wit);
  const gv = gavel(0.18); gv.position.set(0.18, 0.37, -0.29); gv.rotation.y = 0.5; g.add(gv); g.userData.gavel = gv;
  g.scale.setScalar(s); return g;
}
// figuritas de los estudiantes: cuerpo + cabeza fundidos en una geometría (para instanciar miles)
function studentGeo(lo = false) {
  const body = new THREE.CylinderGeometry(lo ? 0.009 : 0.0095, lo ? 0.014 : 0.0145, 0.034, lo ? 6 : 14); body.translate(0, 0.017, 0);
  const sh = new THREE.SphereGeometry(lo ? 0.011 : 0.0115, lo ? 6 : 14, lo ? 4 : 8, 0, Math.PI * 2, 0, Math.PI / 2); sh.translate(0, 0.034, 0);
  const head = new THREE.SphereGeometry(lo ? 0.0075 : 0.008, lo ? 6 : 16, lo ? 4 : 12); head.translate(0, 0.052, 0);
  const parts = [body, sh, head].map(g => g.index ? g.toNonIndexed() : g); parts.forEach(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
  return mergeGeometries(parts);
}
function capGeo() { const b = new THREE.BoxGeometry(0.022, 0.003, 0.022); b.translate(0, 0.062, 0); const c = new THREE.CylinderGeometry(0.008, 0.009, 0.006, 10); c.translate(0, 0.0585, 0); return mergeGeometries([b.toNonIndexed(), c.toNonIndexed()].map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; })); }
// ---------------------------------------------------------------- el centro: el mazo y los 100 estudiantes (L1), la vitrina con la toga (L2),
// el campo de los que empiezan la carrera (L3) y los códigos que acaban en la balanza (L4).
const SP = 0.06;                                   // separación entre figuritas (la rejilla de 100 forma parte del campo)
const GOLD3 = [23, 56, 81];                        // los tres que llegan (posiciones en la rejilla 10×10)
const FN = 163, GRID0 = 77;                        // campo de 163×163 (= 26.569 ≈ más de veintiséis mil); la rejilla son las casillas 77…86
const GB = { c0: 85, c1: 108, r0: 43, r1: 66 };    // bloque dorado de 24×24 = 576 (≈ menos de seiscientas plazas)
const gridPos = i => v3(((i % 10) - 4.5) * SP, 0, (Math.floor(i / 10) - 4.5) * SP);
const T_HIT = 0.3;
const _o = new THREE.Object3D(), _up = v3(0, 1, 0), _ax = new THREE.Vector3(), _col = new THREE.Color();
const C_CER = new THREE.Color(0xe6e1d8), C_GREY = new THREE.Color(0x3d3c3f), C_GOLD = new THREE.Color(0xffc24a), C_DIM = new THREE.Color(0x2a2a2e);
function buildCenter() {
  const Z = new THREE.Group(); scene.add(Z); S.ctr = Z;
  // rejilla de 100 (figuritas detalladas) + birretes
  const gm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  S.grid = new THREE.InstancedMesh(studentGeo(false), gm, 100); S.grid.castShadow = true; S.grid.receiveShadow = true; S.grid.frustumCulled = false;
  for (let i = 0; i < 100; i++) S.grid.setColorAt(i, C_CER); Z.add(S.grid);
  S.caps = new THREE.InstancedMesh(capGeo(), new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.5 }), 100); S.caps.castShadow = true; S.caps.frustumCulled = false; Z.add(S.caps);
  S.gold3 = GOLD3.map(i => { const g = new THREE.Group(); const f = mesh(studentGeo(false), M.gold); g.add(f); const tg = toga(0.05, false); tg.position.y = 0.004; tg.visible = false; g.add(tg); g.userData.toga = tg;
    const lc = lightCone(0.05, 0.9, 0.22, 0xffd58a); g.add(lc); g.userData.cone = lc; g.position.copy(gridPos(i)); Z.add(g); return g; });
  // el mazo gigante y el anillo de la onda
  S.gav = gavel(0.95); Z.add(S.gav);
  S.shock = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  S.shock.rotation.x = -Math.PI / 2; S.shock.position.y = 0.004; Z.add(S.shock);
  S.dust = sparks(Z, 220, 0xffe0b0, 0.03);
  // vitrina con la toga y el diploma
  S.vit = vitrine(0.34, 0.66); S.vit.position.set(0, 0, -0.72); Z.add(S.vit);
  const stand = grp(at(cyl(0.006, 0.006, 0.5, M.brass, 10), 0, 0.33, 0), at(cyl(0.004, 0.004, 0.2, M.brass, 8), 0, 0.57, 0, 0, 0, Math.PI / 2), at(cyl(0.05, 0.05, 0.01, M.brass, 24), 0, 0.085, 0));
  const tg = toga(0.46, true); tg.position.y = 0.11; S.vit.add(stand, tg); S.vit.userData.toga = tg;
  S.dip = new THREE.Group(); Z.add(S.dip);
  const roll = cyl(0.014, 0.014, 0.3, M.paper, 20); roll.rotation.z = Math.PI / 2; S.dip.add(roll);
  const dpt = canvasTex(1024, 360, (g, w, h) => { g.fillStyle = '#f1ead8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b08a3e'; g.lineWidth = 8; g.strokeRect(18, 18, w - 36, h - 36); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '700 46px Inter'; g.fillText('TÍTULO UNIVERSITARIO OFICIAL DE', w / 2, 110); g.font = '900 104px Inter'; g.fillText('GRADO EN DERECHO', w / 2, 225); g.font = '500 34px Inter'; g.fillText('240 créditos ECTS', w / 2, 300); });
  S.dipP = mesh(new THREE.PlaneGeometry(0.3, 0.105), new THREE.MeshStandardMaterial({ map: dpt, roughness: 0.8, side: THREE.DoubleSide }), false); S.dipP.position.y = -0.06; S.dip.add(S.dipP);
  const rib = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.004, 8, 20), plastic(0x8e1418, 0.3)); rib.rotation.y = Math.PI / 2; S.dip.add(rib); S.dip.userData.rib = rib;
  // el campo (figuritas sencillas, miles) y su resplandor dorado
  const idx = []; for (let r = 0; r < FN; r++) for (let c = 0; c < FN; c++) if (!(c >= GRID0 && c < GRID0 + 10 && r >= GRID0 && r < GRID0 + 10)) idx.push([c, r]);
  S.field = new THREE.InstancedMesh(studentGeo(true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), idx.length); S.field.frustumCulled = false; S.field.receiveShadow = true;
  S.field.userData.cells = idx; for (let i = 0; i < idx.length; i++) S.field.setColorAt(i, C_CER); Z.add(S.field);
  const gx = ((GB.c0 + GB.c1) / 2 - 81.5) * SP, gz = ((GB.r0 + GB.r1) / 2 - 81.5) * SP, gw = (GB.c1 - GB.c0 + 1) * SP;
  S.gglow = new THREE.Mesh(new THREE.PlaneGeometry(gw * 1.08, gw * 1.08), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7); r.addColorStop(0, 'rgba(255,200,90,.9)'); r.addColorStop(0.6, 'rgba(255,180,60,.35)'); r.addColorStop(1, 'rgba(255,170,50,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  S.gglow.rotation.x = -Math.PI / 2; S.gglow.position.set(gx, 0.003, gz); Z.add(S.gglow); S.gcenter = v3(gx, 0, gz);
  // los códigos, la balanza y el libro abierto
  const BK = [[0x6e1414, 'CÓDIGO CIVIL'], [0x173d2a, 'CÓDIGO PENAL'], [0x1b2a4a, 'CONSTITUCIÓN'], [0x4a2a14, 'ENJUICIAMIENTO'], [0x2a1a2e, 'C. DE COMERCIO'], [0x14361f, 'E. TRABAJADORES']];
  S.books = BK.map(([c, n], k) => { const b = book(0.2, 0.28, 0.05, c, n, 'BOE'); b.userData.k = k; Z.add(b); return b; });
  S.flip = []; for (let k = 0; k < 9; k++) { const p = mesh(new THREE.PlaneGeometry(0.19, 0.27), new THREE.MeshStandardMaterial({ map: paperTex((g, w, h) => textLines(g, 40, 60, w - 80, 26, 22, 'rgba(40,36,30,.5)', k)), roughness: 0.85, side: THREE.DoubleSide }), false); p.geometry.translate(0.095, 0, 0); const pv = new THREE.Group(); pv.add(p); Z.add(pv); S.flip.push(pv); }
  S.sc = scales(0.95); S.sc.position.set(0, 0, -0.25); Z.add(S.sc);
  S.ob = openBook(0.34, 0.46, 0x6e1414, (g, w, h) => { g.fillStyle = '#2b2218'; g.textAlign = 'left'; g.font = '800 30px Inter'; g.fillText('TÍTULO PRELIMINAR', 70, 80); g.fillText('Artículo 1', w / 2 + 60, 80); textLines(g, 70, 120, w / 2 - 130, 22, 24, 'rgba(40,36,30,.5)', 3); textLines(g, w / 2 + 60, 120, w / 2 - 130, 22, 24, 'rgba(40,36,30,.5)', 7); });
  const lect = mesh(new THREE.BoxGeometry(0.5, 0.36, 0.34), M.wood); lect.position.y = 0.18; S.lect = grp(lect); S.lect.add(S.ob); S.ob.position.set(0, 0.37, 0); S.ob.rotation.x = 0.32;
  S.lect.position.set(0, 0, 0.55); Z.add(S.lect);
  S.ctrCone = lightCone(1.6, 5, 0.05); Z.add(S.ctrCone);
}
function fallState(i, t) {       // ángulo de caída (0 = de pie) de la figurita i de la rejilla
  const P = gridPos(i), dist = Math.hypot(P.x, P.z), dl = T_HIT + dist / 2.8 + hash(i * 3.7) * 0.05;
  let u = clamp((t - dl) / 0.26), th = Math.PI / 2 * 0.94 * u * u;
  if (u >= 1) th -= 0.1 * Math.sin(Math.PI * clamp((t - dl - 0.26) / 0.22)) * Math.exp(-(t - dl - 0.26) * 6);
  const up = clamp((t - (K.y2 + 0.05 + hash(i * 5.1) * 0.45)) / 0.32); th *= 1 - eio(up);
  return { th, slide: 0.025 * clamp(u) * (1 - eio(up)), lie: clamp(u) * (1 - eio(up)) };
}
function centerAt(t, st) {
  const Z = S.ctr, vis = t < K.dentro4 + 0.9 || t > K.si16 - 1.5; Z.visible = vis; if (!vis) return;
  // ---- el mazo: baja acelerando, golpea (onda, polvo, temblor), rebota y se va; al final vuelve a bajar hasta la pose del principio
  const yRest = 0.0, yTop = 0.62;
  let gy = yTop * (1 - clamp(t / T_HIT) * clamp(t / T_HIT)) + yRest * 0;
  if (t > T_HIT) { const u = t - T_HIT; gy = 0.05 * Math.abs(Math.sin(u * 14)) * Math.exp(-u * 9); }
  gy += eio(clamp((t - 1.25) / 0.9)) * 2.8;                                 // se levanta y sale
  if (t > K.si16) gy = 2.8 - (2.8 - yTop) * eio(clamp((t - (END - 2.2)) / 2.2)) - 0; // vuelve desde arriba hasta la pose inicial
  S.gav.position.set(0.0, 0.08 + gy, 0.02); S.gav.rotation.set(0, 0.35, 0); S.gav.visible = gy < 2.7;
  const ush = t - T_HIT; S.shock.visible = ush > 0 && ush < 0.9; if (S.shock.visible) { const e = eo(clamp(ush / 0.85)); S.shock.scale.setScalar(0.1 + e * 1.9); S.shock.material.opacity = 0.85 * (1 - e); }
  S.dust.visible = ush > 0 && ush < 1.6; if (S.dust.visible) { burst(S.dust, v3(0, 0.02, 0), t, T_HIT, 0.45, 1.5, false, 0.7); S.dust.material.opacity = 1 - clamp(ush / 1.6); }
  // ---- la rejilla: caen 97 (se apagan en gris), quedan 3 dorados (con toga a partir de «jueces»); con «Y ninguno…» todos de pie y con birrete
  const fieldSink = win(t, K.crees4 - 0.1, 0.7) * (1 - win(t, K.si16 + 0.3, 0.8));
  const capK = pop(t, K.carrera2 - 0.05, 0.4) * (1 - win(t, K.crees4 - 0.1, 0.4));
  for (let i = 0; i < 100; i++) {
    const P = gridPos(i), f = fallState(i, t), isG = GOLD3.includes(i) && t > T_HIT && t < K.y2 + 0.1;
    let th = GOLD3.includes(i) ? 0 : f.th, lie = GOLD3.includes(i) ? 0 : f.lie;
    const d = Math.hypot(P.x, P.z) > 1e-4 ? v3(P.x, 0, P.z).normalize() : v3(1, 0, 0); _ax.set(d.z, 0, -d.x);
    _o.position.copy(P).addScaledVector(d, f.slide); _o.position.y = 0.011 * Math.sin(th) - fieldSink * 0.09; _o.quaternion.setFromAxisAngle(_ax, th);
    const sc = isG ? 0.0001 : 1; _o.scale.setScalar(sc); _o.updateMatrix(); S.grid.setMatrixAt(i, _o.matrix);
    _col.copy(C_CER).lerp(C_GREY, lie); if (t > K.plazas3 && t < K.dentro4 + 1) _col.lerp(C_DIM, win(t, K.menos3, 0.5)); S.grid.setColorAt(i, _col);
    _o.scale.setScalar(Math.max(0.0001, capK) * (isG ? 0 : 1)); _o.updateMatrix(); S.caps.setMatrixAt(i, _o.matrix);
  }
  S.grid.instanceMatrix.needsUpdate = true; S.grid.instanceColor.needsUpdate = true; S.caps.instanceMatrix.needsUpdate = true; S.caps.visible = capK > 0.002;
  const gk = t > T_HIT + 0.05 && t < K.y2 + 0.1;
  S.gold3.forEach((g, n) => { g.visible = gk; if (!gk) return; const k = pop(t, K.tres1 - 0.05 + n * 0.08, 0.4); g.scale.setScalar(1 + 0.25 * k);
    g.userData.cone.material.uniforms.op.value = 0.22 * k * (1 - win(t, K.y2 - 0.2, 0.3)); const tk = pop(t, K.jueces1 + n * 0.1, 0.35); g.userData.toga.visible = tk > 0.01; g.userData.toga.scale.setScalar(Math.max(0.001, tk)); });
  // ---- la vitrina (L2): sube del suelo, se cierra con luz roja; el diploma se desenrolla con «carrera»
  const vk = win(t, K.y2 - 0.1, 0.5) * (1 - win(t, K.cada3 - 0.2, 0.5));
  S.vit.visible = vk > 0.01; S.vit.position.y = -0.85 * (1 - vk);
  if (S.vit.visible) { const led = S.vit.userData.led; const on = t > K.ninguno2 ? 1 : 0; led.material.emissiveIntensity = 3 * on * (0.6 + 0.4 * Math.sin(t * 9)); }
  const dk = win(t, K.carrera2 - 0.25, 0.35) * (1 - win(t, K.cada3 - 0.3, 0.3));
  S.dip.visible = dk > 0.01; if (S.dip.visible) { S.dip.position.set(0, 0.2 + 0.03 * Math.sin(t * 2), 0.12); S.dip.rotation.set(-0.15, 0, 0); const uk = eo(clamp((t - K.carrera2) / 0.45)); S.dipP.scale.set(Math.max(0.001, uk), 1, 1); S.dipP.visible = uk > 0.01; S.dip.userData.rib.visible = uk < 0.1; S.dip.scale.setScalar(dk); }
  // ---- el campo (L3): aparece en ola desde la rejilla; con «Plazas…» se enciende el bloque dorado y el resto se apaga
  const fv = t > K.cada3 - 0.2 && t < K.realidad4; S.field.visible = fv;
  if (fv) {
    const cells = S.field.userData.cells, t0 = K.cada3 - 0.1, gOn = win(t, K.plazas3 - 0.05, 0.4), dim = win(t, K.menos3 - 0.1, 0.6);
    for (let i = 0; i < cells.length; i++) {
      const [c, r] = cells[i], x = (c - 81.5) * SP, z = (r - 81.5) * SP, dist = Math.hypot(x, z), k = pop(t, t0 + dist / 3.6 + hash(i * 0.37) * 0.12, 0.3);
      _o.position.set(x, -fieldSink * 0.09, z); _o.quaternion.identity(); _o.scale.setScalar(Math.max(0.0001, k)); _o.updateMatrix(); S.field.setMatrixAt(i, _o.matrix);
      const inG = c >= GB.c0 && c <= GB.c1 && r >= GB.r0 && r <= GB.r1;
      _col.copy(C_CER); if (inG) _col.lerp(C_GOLD, gOn); else _col.lerp(C_DIM, dim * 0.85); S.field.setColorAt(i, _col);
    }
    S.field.instanceMatrix.needsUpdate = true; S.field.instanceColor.needsUpdate = true;
  }
  S.gglow.visible = fv; S.gglow.material.opacity = 0.75 * win(t, K.plazas3, 0.5) * (1 - fieldSink);
  // ---- los códigos (L4): suben apilados; con «memorizar» las hojas pasan solas; con «En realidad» vuelan a la balanza y gana un lado
  const bk = win(t, K.crees4 - 0.15, 0.5), fly = win(t, K.realidad4 - 0.05, 0.55), tilt = (eio(clamp((t - K.ganar4 + 0.05) / 0.45)) * 0.24 + 0.03 * Math.sin(clamp((t - K.ganar4 - 0.4) / 0.6) * Math.PI * 2) * Math.exp(-Math.max(0, t - K.ganar4 - 0.4) * 3)) * (t > K.ganar4 - 0.1 ? 1 : 0);
  const scK = win(t, K.realidad4 - 0.3, 0.5); S.sc.visible = scK > 0.01 && t < K.dentro4 + 0.9; S.sc.position.y = -1.3 * (1 - scK); scalesTilt(S.sc, tilt);
  const pans = S.sc.userData.pans.map(p => { p.updateWorldMatrix(true, false); return p.localToWorld(v3(0, -0.42, 0)); });
  S.books.forEach((b, k) => {
    b.visible = bk > 0.01 && t < K.dentro4 + 0.9; if (!b.visible) return;
    const A = v3(0, 0.025 + k * 0.052 - 0.4 * (1 - bk), 0.05), side = k % 2, lvl = Math.floor(k / 2), Bp = pans[side].clone().add(v3(0, 0.02 + lvl * 0.034, 0));
    const f = clamp((fly - k * 0.06) / 0.7), e = eio(f); b.position.lerpVectors(A, Bp, e); b.position.y += Math.sin(e * Math.PI) * 0.25;
    b.rotation.set(-Math.PI / 2, 0, (k - 2.5) * 0.12 * (1 - e) + e * (side ? 0.2 : -0.2) + Math.sin(e * Math.PI) * 1.2 * (side ? 1 : -1)); b.scale.setScalar(1 - 0.38 * e);
  });
  const fk = win(t, K.memorizar4 - 0.1, 0.2) * (1 - win(t, K.realidad4 - 0.1, 0.15));
  S.flip.forEach((p, k) => { p.visible = fk > 0.01; if (!p.visible) return; const top = v3(-0.095, 0.025 + 6 * 0.052 + 0.004, 0.05); const ph = ((t * 3.2 + k / 9) % 1); p.position.copy(top); p.rotation.set(-Math.PI / 2 + 0, 0, 0); p.rotateY(-Math.PI * eio(ph)); p.children[0].material.opacity = 1; });
  const lk = win(t, K.ellas4 - 0.2, 0.5); S.lect.visible = lk > 0.01 && t < K.dentro4 + 0.9; S.lect.position.y = -0.8 * (1 - lk);
  S.ctrCone.material.uniforms.op.value = 0.05 * (t < K.dentro4 + 0.5 ? 1 : 0);
}
// ---------------------------------------------------------------- estaciones (una por frase, de la L5 a la L15) en el círculo de radio R_ST.
// Cada una es un pedestal de madera con canto de latón y su haz de luz; su +z local mira hacia fuera (hacia la cámara).
const ST = {};
function station(name, a, r = 0.95) {
  const Z = new THREE.Group(); Z.position.copy(stP(a)); Z.rotation.y = a * D2; scene.add(Z);
  const pl = plinth(r, 0.55); Z.add(pl); const lc = lightCone(r * 1.15, 4.6, 0.055); Z.add(lc);
  const top = new THREE.Group(); top.position.y = 0.55; Z.add(top);
  ST[name] = { Z, top, a, cone: lc }; return ST[name];
}
const TOP = 0.55;
function canvasPlane(w, h, px, draw, opts = {}) {        // plano con lienzo que se puede redibujar (firma, burbujas del test…)
  const t = canvasTex(px, Math.round(px * h / w), draw); const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: opts.r ?? 0.85, transparent: !!opts.tr, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }), opts.cs ?? false);
  m.userData.tex = t; return m;
}
function buildStations() {
  // ---------- L5 la base: columna romana, Constitución y la pirámide normativa
  { const s = station('B', ANG.B, 1.0);
    s.col = column(0.62, 0.065); s.col.position.set(-0.42, 0, 0.0); s.top.add(s.col);
    s.con = book(0.24, 0.32, 0.06, 0x5c1010, 'CONSTITUCIÓN', 'ESPAÑOLA · 1978'); s.con.position.set(0, 0.16, 0.1); s.con.rotation.y = 0.0; s.top.add(s.con);
    s.pyr = [0, 1, 2].map(k => { const rb = 0.2 - k * 0.055, rt = rb - 0.045, h = 0.075; const m = mesh(new THREE.CylinderGeometry(rt, rb, h, 4, 1), k === 2 ? M.marble : M.stone); m.rotation.y = Math.PI / 4; const g = grp(m); const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xcfa860 })); e.rotation.y = Math.PI / 4; g.add(e); g.position.set(0.44, h / 2 + k * h, 0.02); s.top.add(g); return g; });
  }
  // ---------- L6 Civil: contrato con pluma (firma que se dibuja), testamento lacrado y llave, familia, letra pequeña con lupa
  { const s = station('CI', ANG.CI, 1.0);
    s.sig = []; for (let i = 0; i <= 60; i++) { const u = i / 60; s.sig.push([330 + u * 330 + Math.sin(u * 22) * 18, 560 - Math.sin(u * 9) * 26 - Math.cos(u * 31) * 10 * (1 - u)]); }
    
    s.drawC = (g, w, h, k) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '900 52px Inter'; g.fillText('CONTRATO', w / 2, 80); g.font = '600 22px Inter'; g.fillText('DE ARRENDAMIENTO DE VIVIENDA · EJEMPLO', w / 2, 116);
      textLines(g, 60, 150, w - 120, 14, 22, 'rgba(40,36,30,.55)', 2); g.font = '400 9px Inter'; g.fillStyle = 'rgba(40,36,30,.7)'; for (let i = 0; i < 12; i++) g.fillText('La parte arrendataria renuncia expresamente a… cláusula adicional ' + (i + 7) + '.ª, penalización y prórroga tácita, salvo pacto en contrario…', w / 2, 830 + i * 12);
      g.strokeStyle = 'rgba(40,36,30,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(320, 600); g.lineTo(690, 600); g.stroke(); g.font = '500 18px Inter'; g.fillStyle = 'rgba(40,36,30,.7)'; g.fillText('Firma', 505, 625);
      if (k > 0) { g.strokeStyle = '#13235c'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); const n = Math.floor(s.sig.length * k); for (let i = 0; i < n; i++) i ? g.lineTo(s.sig[i][0], s.sig[i][1]) : g.moveTo(s.sig[i][0], s.sig[i][1]); g.stroke(); } };
    s.paper = canvasPlane(0.3, 0.41, 768, (g, w, h) => s.drawC(g, w, h, 0));
    s.paper.rotation.x = -Math.PI / 2; s.paper.position.set(-0.12, 0.004, 0.12); s.paper.rotation.z = 0.12; s.top.add(s.paper); s.sigK = -1;
    s.pen = pen(); s.top.add(s.pen);
    s.env = grp(mesh(new THREE.BoxGeometry(0.24, 0.012, 0.15), M.paper), at(cyl(0.028, 0.028, 0.012, M.wax, 24), 0, 0.012, 0)); const lab = plateText(0.18, 0.05, [['TESTAMENTO', 0.6, 0.5]], { fg: '#2b2218', metal: 0 }); lab.rotation.x = -Math.PI / 2; lab.position.set(0, 0.0065, -0.045); s.env.add(lab);
    s.env.position.set(0.3, 0.006, -0.1); s.env.rotation.y = -0.3; s.top.add(s.env); s.key = key(1.1); s.key.rotation.x = -Math.PI / 2; s.key.position.set(0.24, 0.01, 0.08); s.top.add(s.key);
    s.fam = [figurine(M.ceramic, 1.0), figurine(M.ceramic, 0.95), figurine(M.ceramic, 0.6)]; s.fam.forEach((f, i) => { f.position.set(-0.05 + i * 0.12 - 0.3, 0, -0.4 + (i === 2 ? 0.06 : 0)); s.top.add(f); });
    const J = s.fam[2].userData.J; J.shL.rotation.z = -0.5; s.fam[0].userData.J.shR.rotation.z = 0.35; s.fam[1].userData.J.shL.rotation.z = -0.35;
    s.mag = magnifier(0.9); s.top.add(s.mag);
  }
  // ---------- L7 Penal: esposas, huella en un cristal, marcadores de pruebas, reloj de arena y lupa
  { const s = station('PE', ANG.PE, 1.0);
    s.cuffs = handcuffs(); s.cuffs.position.set(-0.32, 0.01, 0.22); s.cuffs.rotation.y = 0.4; s.top.add(s.cuffs);
    const fpm = new THREE.MeshBasicMaterial({ map: fingerprintTex(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    s.pane = grp(mesh(new THREE.BoxGeometry(0.34, 0.26, 0.008), M.glass, false), at(new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), fpm), 0.04, 0.0, 0.006)); s.fp = fpm;
    s.pane.position.set(0.05, 0.16, -0.12); s.top.add(s.pane); const ft = grp(mesh(new THREE.BoxGeometry(0.36, 0.03, 0.06), M.dsteel)); ft.position.set(0.05, 0.015, -0.12); s.top.add(ft);
    s.mk = [1, 2, 3].map((n, i) => { const m = marker(n); m.position.set(-0.15 + i * 0.16, 0, 0.3 - (i % 2) * 0.08); s.top.add(m); return m; });
    s.hg = hourglass(0.95); s.hg.position.set(0.42, 0, 0.1); s.top.add(s.hg);
    s.mag = magnifier(1.0); s.top.add(s.mag);
  }
  // ---------- L8 Administrativo: el edificio de la Administración, un ciudadano con su recurso y el sello de registro
  { const s = station('AD', ANG.AD, 1.05);
    s.bld = building(0.6); s.bld.position.set(0, 0, -0.25); s.top.add(s.bld);
    s.cit = figurine(M.ceramic, 0.75); s.cit.position.set(-0.1, 0, 0.32); s.cit.rotation.y = Math.PI; s.top.add(s.cit); s.cit.userData.J.shR.rotation.x = -0.9;
    s.doc = canvasPlane(0.06, 0.08, 128, (g, w, h) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.font = '900 20px Inter'; g.textAlign = 'center'; g.fillText('RECURSO', w / 2, 30); textLines(g, 14, 48, w - 28, 6, 12, 'rgba(40,36,30,.5)', 4); });
    s.doc.position.set(0, -0.03, 0.02); s.cit.userData.J.hR.add(s.doc); s.doc.scale.setScalar(1 / (0.16 * 0.75)); s.doc.rotation.y = Math.PI;
    s.forms = new THREE.Group(); for (let i = 0; i < 9; i++) { const f = mesh(new THREE.BoxGeometry(0.2, 0.006, 0.27), M.paper); f.position.set((hash(i) - 0.5) * 0.01, 0.003 + i * 0.006, (hash(i * 3) - 0.5) * 0.01); f.rotation.y = (hash(i * 7) - 0.5) * 0.08; s.forms.add(f); }
    s.forms.position.set(0.36, 0, 0.2); s.top.add(s.forms);
    s.mark = canvasPlane(0.16, 0.08, 256, (g, w, h) => { g.strokeStyle = '#b8121b'; g.lineWidth = 7; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#b8121b'; g.font = '900 44px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('REGISTRO', w / 2, h / 2 + 2); }, { tr: true });
    s.mark.rotation.x = -Math.PI / 2; s.mark.position.set(0.36, 0.058, 0.2); s.top.add(s.mark);
    s.stp = rubberStamp('REGISTRO'); s.stp.position.set(0.36, 0.3, 0.2); s.top.add(s.stp);
  }
  // ---------- L9 Mercantil y Laboral: torres de oficinas, la caja del despido y la nómina con monedas
  { const s = station('ME', ANG.ME, 1.0);
    s.tw = [[0.12, 0.62, 0.12, 1], [0.1, 0.44, 0.1, 2], [0.14, 0.34, 0.12, 3]].map(([w, h, d, sd], i) => { const t = tower(w, h, d, sd); t.position.set(-0.46 + i * 0.15, 0, -0.25 + (i % 2) * 0.1); s.top.add(t); return t; });
    s.box = cardboardBox(); s.box.position.set(0.05, 0, 0.12); s.box.rotation.y = 0.3; s.top.add(s.box);
    s.nom = canvasPlane(0.24, 0.32, 512, (g, w, h) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'left'; g.font = '900 44px Inter'; g.fillText('NÓMINA', 30, 64); g.font = '600 18px Inter'; g.fillText('RECIBO INDIVIDUAL DE SALARIOS · EJEMPLO', 30, 94);
      const rows = [['DEVENGOS', ''], ['Salario base', '••••'], ['Complementos', '•••'], ['DEDUCCIONES', ''], ['Seguridad Social', '•••'], ['IRPF', '•••'], ['LÍQUIDO A PERCIBIR', '•••• €']]; rows.forEach(([a, b], i) => { g.font = (a === a.toUpperCase() ? '800 ' : '500 ') + '22px Inter'; g.fillText(a, 30, 160 + i * 52); g.textAlign = 'right'; g.fillText(b, w - 30, 160 + i * 52); g.textAlign = 'left'; g.fillStyle = 'rgba(40,36,30,.25)'; g.fillRect(30, 172 + i * 52, w - 60, 2); g.fillStyle = '#2b2218'; }); });
    s.nom.rotation.x = -Math.PI / 2 + 0.0; s.nom.position.set(0.4, 0.004, 0.18); s.nom.rotation.z = -0.15; s.top.add(s.nom);
    s.coins = []; for (let i = 0; i < 7; i++) { const c = coin(0.028); c.position.set(0.42 + (hash(i) - 0.5) * 0.006, 0.004 + i * 0.0065, -0.08); s.top.add(c); s.coins.push(c); }
  }
  // ---------- L10 Procesal: la sala de vistas; la demanda viaja hasta el estrado y vuelve convertida en sentencia
  { const s = station('PR', ANG.PR, 1.05);
    s.court = courtroom(0.72); s.court.position.set(0, 0, -0.02); s.top.add(s.court);
    const docT = (title) => (g, w, h) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '900 30px Inter'; g.fillText(title, w / 2, 44); textLines(g, 20, 70, w - 40, 8, 16, 'rgba(40,36,30,.5)', title.length); };
    s.dem = canvasPlane(0.12, 0.16, 256, docT('DEMANDA')); s.sen = canvasPlane(0.12, 0.16, 256, docT('SENTENCIA')); s.top.add(s.dem, s.sen);
  }
  // ---------- L11 Internacional y Europeo: el globo con las fronteras reales, España en dorado, las doce estrellas y arcos que salen
  { const s = station('IN', ANG.IN, 1.0);
    const G = new THREE.Group(); G.position.set(0, 0.42, 0); s.top.add(G); s.globe = G;
    const sp2 = sph(0.3, M.ocean, 64, 48); G.add(sp2);
    if (S.countries) { const lines = fatLines(ringSegments(S.countries, 0.302), 0xd8dde6, 1.1, 0.75); G.add(lines); const es = fatLines(ringSegments(S.countries, 0.304, n => n === 'Spain'), 0xffc24a, 3.2, 1); G.add(es); s.es = es; }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.006, 8, 96, Math.PI * 1.2), M.brass); ring.rotation.set(0, 0, Math.PI * 0.4); G.add(ring);
    const stem = grp(at(cyl(0.012, 0.016, 0.12, M.brass, 16), 0, 0.06, 0), at(cyl(0.09, 0.11, 0.025, M.wood, 32), 0, 0.012, 0)); s.top.add(stem);
    s.stars = new THREE.Group(); s.stars.position.set(0, 0.42, 0); for (let i = 0; i < 12; i++) { const st2 = star5(0.03); const a = i * Math.PI / 6; st2.position.set(Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0); s.stars.add(st2); } s.top.add(s.stars);
    const es0 = [-3.7, 40.4]; s.arcs = [[2.35, 48.86], [-74, 40.7], [139.7, 35.7], [-58.4, -34.6], [28, -26], [37.6, 55.75], [-99, 19.4]].map((d, i) => { const pts = arcPoints(es0, d, 0.35, 80).map(p => p.multiplyScalar(0.305)); const l = drawLine(pts, i % 2 ? 0xffc24a : 0xffe6b0, 2.4, 0.95); G.add(l); return l; });
    G.rotation.set(0.25, 0, 0);
  }
  // ---------- L12 salidas: abogado, juez, fiscal y notario (figuritas con su atributo); y el título solo no basta
  { const s = station('SA', ANG.SA, 1.1);
    const mk = (x, withToga, extra) => { const g = new THREE.Group(); const d = figurine(M.ceramic, 1.25); g.add(d); if (withToga) { const tg = toga(0.2, withToga === 'p'); tg.position.y = 0.0; g.add(tg); } if (extra) g.add(extra); g.position.set(x, 0, 0); s.top.add(g); return g; };
    const brief = grp(rbox(0.09, 0.065, 0.025, M.leather(0x3b2414), 0.008), at(new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.003, 6, 16, Math.PI), M.brass), 0, 0.034, 0)); brief.position.set(0.055, 0.04, 0.03);
    const gv = gavel(0.16); gv.position.set(0.06, 0.1, 0.04); gv.rotation.z = -0.6;
    const fold = grp(rbox(0.07, 0.09, 0.01, M.leather(0x1b2a4a), 0.004)); fold.position.set(0.05, 0.1, 0.04); fold.rotation.z = 0.3;
    const nst = rubberStamp('NOTARÍA'); nst.scale.setScalar(0.5); nst.position.set(0.07, 0, 0.06);
    s.figs = [mk(-0.42, 't', brief), mk(-0.14, 'p', gv), mk(0.14, 't', fold), mk(0.42, null, nst)];
    s.figs[3].children[0].traverse(o => { if (o.isMesh) o.material = M.ceramicD; });
    s.dip = grp(); const dpt = canvasTex(1024, 360, (g, w, h) => { g.fillStyle = '#f1ead8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b08a3e'; g.lineWidth = 8; g.strokeRect(18, 18, w - 36, h - 36); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '900 104px Inter'; g.fillText('GRADO EN DERECHO', w / 2, 200); });
    const dp = mesh(new THREE.PlaneGeometry(0.28, 0.1), new THREE.MeshStandardMaterial({ map: dpt, roughness: 0.8, side: THREE.DoubleSide }), false); s.dip.add(dp); s.dip.position.set(0, 0.24, 0.42); s.top.add(s.dip);
  }
  // ---------- L13 para ser abogado: escalera con el máster, las prácticas, el examen estatal y la colegiación; arriba, la toga
  { const s = station('AB', ANG.AB, 1.1);
    s.steps = [0, 1, 2, 3].map(k => { const st2 = mesh(new THREE.BoxGeometry(0.7, 0.07 * (k + 1), 0.17), M.wood); st2.position.set(0, 0.035 * (k + 1), 0.3 - k * 0.17); s.top.add(st2); const e = new THREE.Mesh(new THREE.BoxGeometry(0.702, 0.006, 0.172), M.brass); e.position.set(0, 0.07 * (k + 1), 0.3 - k * 0.17); s.top.add(e); return st2; });
    const it = [book(0.09, 0.12, 0.025, 0x1b2a4a, 'MÁSTER', 'DE ACCESO'), grp(rbox(0.11, 0.08, 0.03, M.leather(0x3b2414), 0.01), at(new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 16, Math.PI), M.brass), 0, 0.042, 0)),
      canvasPlane(0.1, 0.13, 256, (g, w, h) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '900 26px Inter'; g.fillText('EXAMEN', w / 2, 36); g.fillText('ESTATAL', w / 2, 64); textLines(g, 24, 86, w - 48, 9, 14, 'rgba(40,36,30,.45)', 9); g.save(); g.translate(w / 2, h * 0.72); g.rotate(-0.2); g.strokeStyle = '#1d8a3a'; g.lineWidth = 6; g.strokeRect(-80, -30, 160, 60); g.fillStyle = '#1d8a3a'; g.font = '900 44px Inter'; g.fillText('APTO', 0, 15); g.restore(); }, { cs: true }),
      medal()];
    s.items = it.map((o, k) => { o.position.set(0.22, 0.07 * (k + 1) + 0.065, 0.3 - k * 0.17); if (k === 1) o.position.y -= 0.02; s.top.add(o); return o; });
    s.fig = figurine(M.ceramic, 1.1); s.top.add(s.fig);
    s.tg = toga(0.18, false); s.top.add(s.tg);
  }
  // ---------- L14 para ser juez: el test, el tribunal (dos orales) y la Escuela Judicial en Barcelona
  { const s = station('JU', ANG.JU, 1.15);
        s.drawT = (g, w, h, k) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '900 34px Inter'; g.fillText('PRIMER EJERCICIO · TEST', w / 2, 52);
      for (let q = 0; q < 12; q++) { const y = 110 + q * 48; g.font = '700 22px Inter'; g.textAlign = 'right'; g.fillText(String(q + 1), 70, y + 8); for (let o = 0; o < 4; o++) { const x = 120 + o * 92; g.strokeStyle = '#2b2218'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 15, 0, 7); g.stroke(); g.font = '700 16px Inter'; g.textAlign = 'center'; g.fillText('ABCD'[o], x, y + 6);
        if (q < Math.floor(12 * k) && o === Math.floor(hash(q * 5.3) * 4)) { g.fillStyle = '#13235c'; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); g.fillStyle = '#2b2218'; } } } };
    s.test = canvasPlane(0.2, 0.27, 512, (g, w, h) => s.drawT(g, w, h, 0), { cs: true }); s.test.position.set(-0.46, 0.17, 0.2); s.test.rotation.set(-0.5, 0.35, 0); s.top.add(s.test); s.testK = -1;
    s.table = grp(at(mesh(new THREE.BoxGeometry(0.66, 0.02, 0.17), M.wood), 0, 0.09, 0), at(mesh(new THREE.BoxGeometry(0.64, 0.002, 0.15), M.felt), 0, 0.101, 0), at(mesh(new THREE.BoxGeometry(0.64, 0.08, 0.01), M.wood), 0, 0.045, 0.075)); s.table.position.set(0.12, 0, -0.32); s.top.add(s.table);
    for (const x of [-0.18, 0.18]) { const l = mesh(new THREE.BoxGeometry(0.02, 0.08, 0.14), M.wood); l.position.set(x, 0.04, 0); s.table.add(l); }
    s.tgv = gavel(0.13); s.tgv.position.set(0.0, 0.112, 0.03); s.tgv.rotation.y = 0.8; s.table.add(s.tgv);
    s.chairs = [0, 1, 2, 3, 4].map(i => { const c = chair(0.2); c.scale.setScalar(0.55); c.position.set(-0.12 + i * 0.12, 0, -0.47); s.top.add(c); return c; });
    s.trib = [0, 1, 2, 3, 4].map(i => { const g = new THREE.Group(); const f = figurine(M.ceramic, 0.9); g.add(f); const tg = toga(0.145, true); g.add(tg); g.position.set(-0.12 + i * 0.12, 0, -0.43); s.top.add(g); return g; });
    s.cand = grp(at(figurine(M.ceramic, 0.9), 0, 0, 0.05), at(mesh(new THREE.BoxGeometry(0.11, 0.1, 0.06), M.wood), 0, 0.05, -0.03), at(mesh(new THREE.BoxGeometry(0.13, 0.012, 0.08), M.wood), 0, 0.104, -0.035, 0, 0.25)); s.cand.position.set(0.12, 0, 0.1); s.cand.rotation.y = Math.PI; s.top.add(s.cand);
    s.bld = building(0.32, M.marble); s.bld.position.set(0.5, 0, 0.18); s.bld.rotation.y = -0.5; s.top.add(s.bld);
    s.pin = grp(at(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 20), plastic(0xd62d2d, 0.25)), 0, 0.035, 0, 0, Math.PI), at(sph(0.028, plastic(0xd62d2d, 0.2)), 0, 0.08, 0)); s.pin.position.set(0.5, 0.33, 0.18); s.top.add(s.pin);
  }
  // ---------- L15 la respuesta: cuatro años de carrera… y la toga, después
  { const s = station('TO', ANG.TO, 1.0);
    s.fig = figurine(M.ceramic, 1.6); s.fig.position.set(0.05, 0, 0); s.top.add(s.fig);
    s.years = [0, 1, 2, 3].map(k => { const b = book(0.16, 0.22, 0.04, [0x6e1414, 0x173d2a, 0x1b2a4a, 0x4a2a14][k], '', ''); b.rotation.x = -Math.PI / 2; b.position.set(-0.22, 0.02 + k * 0.042, 0.1); b.rotation.z = (hash(k) - 0.5) * 0.3; s.top.add(b); return b; });
    s.tg = toga(0.27, true); s.top.add(s.tg);
    s.sp = sparks(s.top, 140, 0xffd58a, 0.025);
    s.dip = diploma(); s.dip.scale.setScalar(0.6); s.dip.position.set(0.3, 0.03, 0.18); s.dip.rotation.y = 0.4; s.top.add(s.dip);
  }
}
function stationsAt(t) {
  const vis = (s, a, b) => { s.Z.visible = t > a && t < b; return s.Z.visible; };
  // L5
  { const s = ST.B; if (vis(s, K.asi4 - 0.5, K.civil6 + 1.6)) {
    show(s.col, pop(t, K.derecho5 - 0.12, 0.45)); s.col.rotation.y = 0.4 * (1 - eo(clamp((t - K.derecho5) / 0.8)));
    const ck = pop(t, K.constitucional5 - 0.12, 0.45); show(s.con, ck); s.con.rotation.y = -0.6 * (1 - eo(clamp((t - K.constitucional5) / 0.7)));
    s.pyr.forEach((p, k) => { const kk = pop(t, K.teoria5 - 0.15 + k * 0.12, 0.35); p.visible = kk > 0.002; p.scale.set(kk, kk, kk); p.position.y = 0.0375 + k * 0.075 + 0.25 * (1 - clamp(kk)); });
  } }
  // L6
  { const s = ST.CI; if (vis(s, K.base5, K.penal7 + 1.0)) {
    const pk = pop(t, K.contratos6 - 0.15, 0.4); show(s.paper, pk);
    const sk = clamp((t - K.contratos6 - 0.1) / 0.75); if (Math.abs(sk - s.sigK) > 0.004) { const T = s.paper.userData.tex; s.drawC(T.userData.g, T.userData.c.width, T.userData.c.height, sk); T.needsUpdate = true; s.sigK = sk; }
    const pi = s.sig[Math.min(s.sig.length - 1, Math.floor(sk * (s.sig.length - 1)))], u = pi[0] / 768, v = pi[1] / 1050;
    const pp = v3((u - 0.5) * 0.3, 0, (v - 0.5) * 0.41).applyAxisAngle(_up, 0.12).add(v3(-0.12, 0.004, 0.12));
    s.pen.visible = pk > 0.05 && t < K.todo6 + 0.3; s.pen.position.copy(pp); s.pen.position.y += 0.012 + (sk > 0 && sk < 1 ? 0 : 0.04); s.pen.rotation.set(0.5, 0.3, -0.35);
    show(s.env, pop(t, K.herencias6 - 0.12, 0.4)); show(s.key, pop(t, K.herencias6 + 0.05, 0.4)); s.key.rotation.z = 2 * (1 - eo(clamp((t - K.herencias6) / 0.6)));
    s.fam.forEach((f, i) => show(f, pop(t, K.familia6 - 0.12 + i * 0.09, 0.4)));
    const mk = win(t, K.todo6 - 0.15, 0.45); s.mag.visible = mk > 0.01; s.mag.position.set(-0.12 + 0.02 * Math.sin(t * 3), 0.07 + 0.1 * (1 - mk), 0.25 - 0.02 * mk); s.mag.rotation.set(-Math.PI / 2 + 0.25, 0, 0.6); s.mag.scale.setScalar(0.9 * mk);
  } }
  // L7
  { const s = ST.PE; if (vis(s, K.civil6 + 0.5, K.admin8 + 1.0)) {
    show(s.cuffs, pop(t, K.penal7 - 0.15, 0.45)); s.cuffs.rotation.y = 0.4 + 1.2 * (1 - eo(clamp((t - K.penal7) / 0.6)));
    show(s.pane, pop(t, K.delito7 - 0.3, 0.4)); s.fp.opacity = 0.95 * win(t, K.delito7 - 0.05, 0.35) * (0.85 + 0.15 * Math.sin(t * 7));
    s.mk.forEach((m, i) => show(m, pop(t, K.delito7 + 0.05 + i * 0.1, 0.35)));
    show(s.hg, pop(t, K.pena7 - 0.15, 0.4)); { const u = clamp((t - K.pena7) / 3), U = s.hg.userData; U.top.scale.setScalar(Math.max(0.05, 1 - u * 0.7)); U.bot.scale.setScalar(0.3 + u * 0.7); U.stream.visible = t > K.pena7; }
    const mk = win(t, K.prueba7 - 0.35, 0.4); s.mag.visible = mk > 0.01; s.mag.position.set(0.09 - 0.25 * (1 - mk), 0.17, 0.0); s.mag.rotation.set(0, 0, 0.35); s.mag.scale.setScalar(Math.max(0.001, mk));
  } }
  // L8
  { const s = ST.AD; if (vis(s, K.penal7 + 0.5, K.mercantil9 + 1.0)) {
    const bk = win(t, K.admin8 - 0.25, 0.6); s.bld.visible = bk > 0.01; s.bld.position.y = -0.6 * (1 - bk); s.bld.scale.setScalar(0.6 * (0.6 + 0.4 * bk) * (1 + 0.12 * win(t, K.administracion8 - 0.1, 0.5)));
    show(s.cit, pop(t, K.ciudadano8 - 0.15, 0.4) * (0.75 / 0.75)); s.cit.scale.setScalar(Math.max(0.0001, pop(t, K.ciudadano8 - 0.15, 0.4)) * 0.16 * 0.75);
    show(s.forms, pop(t, K.admin8 + 0.1, 0.4));
    const sd = t - (K.defiende8 - 0.05), down = sd > 0 ? (sd < 0.12 ? sd / 0.12 : sd < 0.3 ? 1 : Math.max(0, 1 - (sd - 0.3) / 0.25)) : 0;
    s.stp.visible = t > K.admin8 + 0.1; s.stp.position.y = 0.3 - 0.245 * eio(down); s.mark.visible = sd > 0.12; s.mark.material.opacity = 1;
  } }
  // L9
  { const s = ST.ME; if (vis(s, K.admin8 + 0.5, K.procesal10 + 1.0)) {
    s.tw.forEach((w, i) => { const k = win(t, K.empresas9 - 0.4 + i * 0.08, 0.45); w.visible = k > 0.01; w.scale.set(1, Math.max(0.001, k), 1); });
    const bk = pop(t, K.despidos9 - 0.12, 0.4); show(s.box, bk); s.box.position.x = 0.05 + 0.12 * eio(clamp((t - K.despidos9 - 0.2) / 0.8));
    show(s.nom, pop(t, K.nominas9 - 0.2, 0.4)); s.coins.forEach((c, i) => { const k = clamp((t - K.nominas9 - 0.05 - i * 0.05) / 0.18); c.visible = k > 0; c.position.y = 0.004 + i * 0.0065 + 0.15 * (1 - eo(k)); });
  } }
  // L10
  { const s = ST.PR; if (vis(s, K.mercantil9 + 0.5, K.internacional11 + 1.0)) {
    show(s.court, pop(t, K.procesal10 - 0.15, 0.45) * 0.72);
    const f = clamp((t - K.demanda10) / 0.75), A = v3(-0.26, 0.12, 0.13), B = v3(0, 0.36, -0.2), C2 = v3(0.0, 0.3, 0.22);
    const P = f < 1 ? A.clone().lerp(B, eio(f)).add(v3(0, Math.sin(f * Math.PI) * 0.15, 0)) : B.clone().lerp(C2, eio(clamp((t - K.sentencia10) / 0.4)));
    s.dem.visible = t > K.demanda10 - 0.2 && t < K.sentencia10; s.sen.visible = t >= K.sentencia10; for (const d of [s.dem, s.sen]) { d.position.copy(P); d.rotation.set(-0.4 + f * 0.4, Math.sin(f * 6) * 0.2, 0); d.scale.setScalar(Math.max(0.001, pop(t, K.demanda10 - 0.2, 0.3)) * (t > K.sentencia10 ? 1 + 0.4 * eo(clamp((t - K.sentencia10) / 0.4)) : 1)); }
    const gv = s.court.userData.gavel, gs = t - K.sentencia10 + 0.08; gv.rotation.z = gs > 0 && gs < 0.35 ? -0.9 * Math.sin(Math.min(1, gs / 0.12) * Math.PI / 2) * (gs < 0.12 ? 1 : 1 - (gs - 0.12) / 0.23) : 0;
  } }
  // L11
  { const s = ST.IN; if (vis(s, K.procesal10 + 0.5, K.abogados12 + 1.0)) {
    const gk = pop(t, K.internacional11 - 0.2, 0.5); show(s.globe, gk); s.globe.rotation.y = -1.9 + t * 0.35;
    s.stars.visible = t > K.europeo11 - 0.2; s.stars.children.forEach((st2, i) => { const k = pop(t, K.europeo11 - 0.1 + i * 0.03, 0.3); st2.scale.setScalar(Math.max(0.001, k)); }); s.stars.rotation.z = t * 0.4;
    s.arcs.forEach((l, i) => drawK(l, clamp((t - K.leyes11 - i * 0.12) / 0.6)));
  } }
  // L12
  { const s = ST.SA; if (vis(s, K.internacional11 + 0.5, K.falta13 + 1.0)) {
    const wk = [K.abogados12, K.jueces12, K.fiscales12, K.notarios12];
    s.figs.forEach((f, i) => { const k = pop(t, wk[i] - 0.15, 0.4); f.visible = k > 0.002; f.scale.setScalar(Math.max(0.0001, k)); setOp(f, 1 - 0.65 * win(t, K.ninguno12, 0.4)); });
    const dk = pop(t, K.pero12 - 0.05, 0.4); show(s.dip, dk); s.dip.rotation.set(-0.15, 0.1 * Math.sin(t * 2), 0);
  } }
  // L13
  { const s = ST.AB; if (vis(s, K.carrera12 - 0.6, K.juez14 + 1.0)) {
    const wk = [K.master13, K.practicas13, K.examen13, K.colegiarte13];
    s.items.forEach((o, k) => show(o, pop(t, wk[k] - 0.15, 0.4)));
    let lvl = 0; wk.forEach((w, k) => { lvl += eio(clamp((t - w + 0.25) / 0.35)); });
    const z = 0.38 - lvl * 0.17, y = lvl > 0 ? 0.07 * Math.ceil(lvl - 0.001) : 0, hop = Math.sin((lvl % 1) * Math.PI) * 0.06;
    s.fig.position.set(-0.12, (lvl > 0 ? 0.07 * Math.min(4, Math.floor(lvl + 0.5)) : 0) + hop, z); s.fig.visible = t > K.falta13 - 0.3; const J = s.fig.userData.J; J.hpL.rotation.x = Math.sin(lvl * Math.PI * 2) * 0.5; J.hpR.rotation.x = -Math.sin(lvl * Math.PI * 2) * 0.5;
    const tk = clamp((t - K.colegiarte13 - 0.25) / 0.5); s.tg.visible = tk > 0; s.tg.position.copy(s.fig.position).add(v3(0, 0.45 * (1 - eo(tk)), 0)); s.tg.scale.setScalar(1.1);
  } }
  // L14
  { const s = ST.JU; if (vis(s, K.colegiarte13 - 0.5, K.cuatro15 + 1.0)) {
    show(s.test, pop(t, K.oposicion14 - 0.1, 0.4)); const tk = clamp((t - K.test14 + 0.1) / 0.9); if (Math.abs(tk - s.testK) > 0.01) { const T = s.test.userData.tex; s.drawT(T.userData.g, T.userData.c.width, T.userData.c.height, tk); T.needsUpdate = true; s.testK = tk; }
    const tk2 = win(t, K.juez14 - 0.35, 0.45); s.table.visible = tk2 > 0.01; s.table.position.y = -0.2 * (1 - tk2); s.chairs.forEach(c => { c.visible = tk2 > 0.01; c.position.y = -0.2 * (1 - tk2); });
    s.trib.forEach((g, i) => show(g, pop(t, K.orales14 - 0.2 + i * 0.07, 0.4)));
    show(s.cand, pop(t, K.tribunal14 - 0.2, 0.4));
    show(s.bld, pop(t, K.escuela14 - 0.15, 0.45) * 0.32); show(s.pin, pop(t, K.barcelona14 - 0.1, 0.4)); s.pin.position.y = 0.33 + 0.02 * Math.sin(t * 5);
  } }
  // L15
  { const s = ST.TO; if (vis(s, K.barcelona14 - 0.6, K.dime16 + 0.5)) {
    show(s.fig, pop(t, K.cuatro15 - 0.4, 0.4) * 1); s.fig.scale.setScalar(Math.max(0.0001, pop(t, K.cuatro15 - 0.4, 0.4)) * 0.16 * 1.6);
    s.years.forEach((b, k) => { const kk = clamp((t - K.cuatro15 - 0.05 - k * 0.14) / 0.2); b.visible = kk > 0; b.position.y = 0.02 + k * 0.042 + 0.3 * (1 - eo(kk)); b.position.x = -0.22; });
    const tk = clamp((t - K.toga15 + 0.1) / 0.55); s.tg.visible = tk > 0; s.tg.position.set(0.05, 0.6 * (1 - eo(tk)), 0); s.tg.rotation.y = 1.5 * (1 - eo(tk));
    s.sp.visible = t > K.toga15 + 0.3 && t < K.toga15 + 2.3; if (s.sp.visible) burst(s.sp, v3(0.05, 0.25, 0), t, K.toga15 + 0.3, 0.35, 1.4, false, 0.25);
    show(s.dip, pop(t, K.anos15, 0.4) * 0.6);
  } }
  for (const k in ST) { const s = ST[k]; if (s.Z.visible) s.cone.material.uniforms.op.value = 0.055; }
}
// ---------------------------------------------------------------- cámara: entre las figuritas bajo el mazo → el campo desde la grúa → los códigos y la
// balanza → se zambulle en la página del libro abierto (blanco) → vuela por fuera del círculo de estaciones → vuelve al centro (bucle).
let CKS = [], CUTS = [];
const stCam = (a, dist, h, dx = 0) => { const p = stP(a, dist, h).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const stLook = (a, y, dx = 0, r = R_ST) => { const p = stP(a, r, y).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const T0 = [0.52, 0.15, 1.02], L0 = [0, 0.34, 0], TA = [0.58, 0.19, 1.16], LA = [0, 0.32, 0];
function buildCam() {
  const { B, CI, PE, AD, ME, PR, IN, SA, AB, JU, TO } = ANG;
  const g56 = gridPos(56), gc = S.gcenter;
  const cut = Math.round((K.dentro4 + 0.5) * 60) / 60; CUTS = [cut];
  const A1 = [
    [-1.0, TA, LA, 44], [0.0, T0, L0, 44], [T_HIT, [0.47, 0.14, 0.92], [0, 0.24, 0], 43],
    [K.tres1, [0.5, 0.36, 0.95], [0, 0.03, 0], 38], [K.cien1, [0.62, 0.55, 1.0], [0, 0, 0], 37], [K.derecho1, [-0.15, 0.32, 0.78], [0, 0.03, 0], 35],
    [K.jueces1, [g56.x + 0.13, 0.11, g56.z + 0.26], [g56.x, 0.04, g56.z], 33], [K.fiscales1 + 0.3, [g56.x + 0.17, 0.15, g56.z + 0.32], [g56.x - 0.02, 0.045, g56.z - 0.02], 33],
    [K.y2 + 0.1, [0.0, 0.27, 0.68], [0, 0.24, -0.6], 37], [K.carrera2, [0.06, 0.31, 1.2], [0, 0.2, 0.0], 38], [K.final2, [0.0, 0.33, 0.3], [0, 0.36, -0.6], 34], [K.falta2 + 0.05, [0.0, 0.39, -0.16], [0, 0.38, -0.55], 32],
    [K.cada3 + 0.1, [0.0, 0.6, 0.4], [0, 0.06, -0.5], 37], [K.veintiseis3, [1.0, 2.2, 3.0], [0, 0, -0.8], 40], [K.estudiantes3, [1.8, 4.6, 4.6], [0.2, 0, -1.2], 42],
    [K.plazas3, [2.2, 7.6, 5.6], [0.4, 0, -1.4], 42], [K.menos3, [1.6, 9.0, 5.0], [0.5, 0, -1.5], 40], [K.seiscientas3 + 0.6, [1.35, 9.5, 4.7], [0.5, 0, -1.5], 40],
    [K.crees4 + 0.35, [0.6, 0.95, 1.6], [0, 0.25, 0], 35], [K.memorizar4, [0.26, 0.56, 0.74], [0, 0.33, 0.05], 34], [K.realidad4 + 0.1, [0.0, 0.92, 2.95], [0, 0.55, -0.25], 38],
    [K.ganar4, [-0.42, 0.82, 2.65], [0, 0.58, -0.25], 38], [K.ellas4, [0.0, 0.84, 1.9], [0, 0.45, 0.42], 36], [K.asi4, [0.05, 0.64, 1.0], [0.1, 0.4, 0.52], 34],
    [cut - 0.0005, [0.17, 0.47, 0.62], [0.17, 0.4, 0.55], 32],
  ];
  const hold = (t, a, d, h, dx, ly, ldx, lr = R_ST, f = 34) => [t, stCam(a, d, h, dx), stLook(a, ly, ldx, lr), f];
  const A2 = [
    [cut, stCam(B, 9.35, 1.0, -0.32), stLook(B, 0.9, -0.34), 34], [K.romano5, stCam(B, 9.45, 1.02, -0.38), stLook(B, 0.92, -0.42), 34], [K.constitucional5, stCam(B, 9.7, 1.0, 0.0), stLook(B, 0.76, 0.0), 34],
    [K.teoria5 + 0.2, stCam(B, 9.85, 1.05, 0.3), stLook(B, 0.7, 0.4), 35], hold(K.civil6 - 0.25, B, 9.9, 1.07, 0.34, 0.71, 0.43, R_ST, 35),
    [K.civil6 + 0.15, stCam(CI, 10.2, 1.4), stLook(CI, 0.6), 35], [K.contratos6 + 0.1, stCam(CI, 9.4, 1.25, -0.1), stLook(CI, 0.56, -0.12, R_ST + 0.12), 34], [K.herencias6 + 0.1, stCam(CI, 9.5, 1.15, 0.2), stLook(CI, 0.58, 0.27, R_ST - 0.05), 34],
    [K.familia6 + 0.1, stCam(CI, 9.6, 0.95, -0.2), stLook(CI, 0.68, -0.3, R_ST - 0.4), 34], [K.todo6 + 0.1, stCam(CI, 8.9, 0.95, -0.12), stLook(CI, 0.56, -0.12, R_ST + 0.22), 32], [K.leer6 + 0.15, stCam(CI, 8.95, 0.92, -0.08), stLook(CI, 0.56, -0.11, R_ST + 0.22), 32],
    [K.penal7 + 0.15, stCam(PE, 9.9, 1.2, -0.2), stLook(PE, 0.6, -0.25, R_ST + 0.15), 34], [K.delito7, stCam(PE, 9.4, 0.85, 0.05), stLook(PE, 0.7, 0.05, R_ST - 0.12), 34], [K.pena7 + 0.1, stCam(PE, 9.45, 0.9, 0.35), stLook(PE, 0.7, 0.42, R_ST + 0.1), 34],
    [K.prueba7 + 0.1, stCam(PE, 9.0, 0.78, 0.08), stLook(PE, 0.72, 0.09, R_ST - 0.12), 32], hold(K.admin8 - 0.2, PE, 9.05, 0.8, 0.11, 0.72, 0.09, R_ST - 0.12, 32),
    [K.admin8 + 0.2, stCam(AD, 10.0, 0.9, 0), stLook(AD, 0.85, 0, R_ST - 0.25), 36], [K.defiende8 + 0.1, stCam(AD, 9.5, 0.95, 0.3), stLook(AD, 0.62, 0.36, R_ST + 0.2), 34],
    [K.ciudadano8 + 0.1, stCam(AD, 9.15, 0.66, -0.12), stLook(AD, 0.72, -0.08, R_ST + 0.1), 34], [K.administracion8 + 0.2, stCam(AD, 9.1, 0.6, -0.05), stLook(AD, 1.0, 0, R_ST - 0.3), 36], hold(K.mercantil9 - 0.12, AD, 9.12, 0.58, -0.03, 1.02, 0, R_ST - 0.3, 36),
    [K.mercantil9 + 0.2, stCam(ME, 10.0, 1.2, -0.25), stLook(ME, 0.8, -0.3, R_ST - 0.15), 35], [K.empresas9, stCam(ME, 9.6, 1.0, -0.3), stLook(ME, 0.85, -0.31, R_ST - 0.2), 34],
    [K.despidos9 + 0.1, stCam(ME, 9.5, 1.0, 0.1), stLook(ME, 0.65, 0.1, R_ST + 0.12), 34], [K.nominas9 + 0.1, stCam(ME, 9.45, 1.15, 0.38), stLook(ME, 0.57, 0.4, R_ST + 0.1), 34], hold(K.procesal10 - 0.08, ME, 9.4, 1.12, 0.41, 0.57, 0.4, R_ST + 0.1),
    [K.procesal10 + 0.25, stCam(PR, 10.1, 1.5, 0), stLook(PR, 0.6, 0, R_ST - 0.05), 35], [K.juicio10, stCam(PR, 9.4, 1.0, -0.15), stLook(PR, 0.7, 0, R_ST - 0.1), 34],
    [K.demanda10 + 0.1, stCam(PR, 9.3, 0.9, -0.2), stLook(PR, 0.75, -0.12, R_ST + 0.05), 34], [K.sentencia10 + 0.2, stCam(PR, 9.2, 0.95, 0.05), stLook(PR, 0.83, 0, R_ST - 0.1), 33], hold(K.internacional11 - 0.3, PR, 9.25, 0.97, 0.08, 0.83, 0.02, R_ST - 0.1, 33),
    [K.internacional11 + 0.2, stCam(IN, 9.8, 1.0, 0), stLook(IN, 0.97), 34], [K.europeo11 + 0.1, stCam(IN, 9.6, 1.05, 0.2), stLook(IN, 0.97), 35], [K.espana11, stCam(IN, 9.35, 1.1, -0.15), stLook(IN, 0.97), 34], hold(K.abogados12 - 0.4, IN, 9.3, 1.1, -0.18, 0.97, 0, R_ST, 34),
    [K.abogados12, stCam(SA, 9.4, 0.85, -0.42), stLook(SA, 0.68, -0.42), 33], [K.jueces12, stCam(SA, 9.4, 0.85, -0.14), stLook(SA, 0.68, -0.14), 33], [K.fiscales12, stCam(SA, 9.4, 0.85, 0.14), stLook(SA, 0.68, 0.14), 33],
    [K.notarios12, stCam(SA, 9.45, 0.85, 0.42), stLook(SA, 0.68, 0.42), 33], [K.pero12 + 0.1, stCam(SA, 10.3, 1.0, 0), stLook(SA, 0.72, 0, R_ST + 0.2), 36], [K.carrera12, stCam(SA, 10.15, 0.95, 0), stLook(SA, 0.78, 0, R_ST + 0.3), 36], hold(K.falta13 - 0.3, SA, 10.15, 0.96, 0.02, 0.78, 0, R_ST + 0.3, 36),
    [K.falta13 + 0.1, stCam(AB, 10.1, 1.2, -0.1), stLook(AB, 0.75, 0), 35], [K.master13 + 0.1, stCam(AB, 9.5, 0.95, 0.15), stLook(AB, 0.72, 0.12, R_ST + 0.3), 34], [K.practicas13 + 0.1, stCam(AB, 9.45, 1.0, 0.15), stLook(AB, 0.79, 0.12, R_ST + 0.13), 34],
    [K.examen13 + 0.1, stCam(AB, 9.45, 1.05, 0.12), stLook(AB, 0.86, 0.12, R_ST - 0.04), 34], [K.colegiarte13 + 0.2, stCam(AB, 9.75, 1.15, 0.02), stLook(AB, 0.9, 0.0, R_ST - 0.2), 35], hold(K.juez14 - 0.5, AB, 9.78, 1.16, 0.0, 0.9, -0.02, R_ST - 0.2, 35),
    [K.juez14 + 0.15, stCam(JU, 10.2, 1.25, 0), stLook(JU, 0.72, 0, R_ST - 0.15), 35], [K.test14, stCam(JU, 9.3, 1.0, -0.42), stLook(JU, 0.72, -0.46, R_ST + 0.2), 33], [K.orales14, stCam(JU, 9.5, 0.95, 0.12), stLook(JU, 0.68, 0.12, R_ST - 0.35), 34],
    [K.tribunal14 + 0.1, stCam(JU, 9.3, 0.82, 0.14), stLook(JU, 0.66, 0.12, R_ST - 0.42), 34], [K.escuela14, stCam(JU, 9.45, 1.0, 0.5), stLook(JU, 0.75, 0.5, R_ST + 0.18), 34], [K.barcelona14 + 0.1, stCam(JU, 9.55, 1.05, 0.48), stLook(JU, 0.86, 0.5, R_ST + 0.18), 34], hold(K.cuatro15 - 0.25, JU, 9.6, 1.06, 0.47, 0.87, 0.5, R_ST + 0.18),
    [K.cuatro15 + 0.1, stCam(TO, 9.7, 0.95, -0.1), stLook(TO, 0.72, -0.09), 36], [K.toga15, stCam(TO, 9.3, 0.9, 0.03), stLook(TO, 0.8, 0.03), 34], [K.despues15 + 0.3, stCam(TO, 9.4, 0.95, 0.04), stLook(TO, 0.82, 0.05), 34],
    [K.si16 + 0.3, stCam(TO, 9.9, 1.35, 0), stLook(TO, 0.62), 36], [K.guardalo16, [1.4, 1.6, 4.0], [0, 0.15, 0], 38], [K.dime16, [0.75, 0.55, 1.75], [0, 0.18, 0], 40],
    [END - 1.0, TA, LA, 44], [END, T0, L0, 44], [END + T_HIT, [0.47, 0.14, 0.92], [0, 0.24, 0], 43],
  ];
  CKS = [A1, A2];
}
function camAt(t) {
  const st = camKeys(t, t < CUTS[0] ? CKS[0] : CKS[1]);
  const u = t - T_HIT; if (u > 0 && u < 0.45) { const a = 0.012 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; st.l.y += Math.sin(u * 83 + 2) * a * 0.6; }
  return st;
}
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return t; return t - dt; }
// ---------------------------------------------------------------- destellos y blanco (la zambullida en la página)
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[T_HIT, 0.16], [K.tres1, 0.05], [K.jueces1, 0.04], [K.ninguno2, 0.05], [K.plazas3, 0.06], [K.ganar4 + 0.3, 0.06], [K.romano5, 0.04], [K.delito7, 0.05], [K.defiende8 + 0.07, 0.07],
    [K.sentencia10, 0.08], [K.europeo11, 0.05], [K.ninguno12, 0.06], [K.colegiarte13 + 0.3, 0.06], [K.barcelona14, 0.05], [K.toga15 + 0.4, 0.12]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { const c = CUTS[0]; return t < c ? eio(clamp((t - (c - 0.3)) / 0.3)) : 1 - eo(clamp((t - c - 0.05) / 0.4)); }
// ---------------------------------------------------------------- un instante de la escena
function stageAt(t, st) {
  NOW = t; centerAt(t, st); stationsAt(t);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.2, 1.2);
  rigAt(c, yaw, k, 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0.0; R.hemi.intensity = 0.12;
}
// ---------------------------------------------------------------- HUD: cabecera con el «mensaje pendiente» (qué te falta), cifras grandes y rótulos con línea guía
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A';
function hdr(t) {
  const a = 1 - 0.85 * whiteAt(t); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic';
  const tk = clamp((t + 0.6) / 0.7);
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('DERECHO', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('EL GRADO, POR DENTRO', tk), 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('GRADO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('240 ECTS', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('4 AÑOS', 1024, 178);
  const mk = win(t, K.final2, 0.3) * (1 - win(t, K.si16 + 0.5, 0.4));
  if (mk > 0.01) {
    let txt = 'LO QUE TE FALTA · ???', col = HC.red, blink = true;
    if (t > K.master13) { txt = 'ABOGADO · MÁSTER + EXAMEN'; col = HC.green; blink = false; }
    if (t > K.oposicion14) { txt = 'JUEZ · OPOSICIÓN + ESCUELA'; col = HC.green; blink = false; }
    if (t > K.toga15) { txt = 'MÁSTER · EXAMEN · OPOSICIÓN'; col = HG; blink = false; }
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
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));        // ventana de un rótulo
function lab(o, x, y, z, txt, sub, k, opt) { if (k <= 0.01 || !o.visible) return; callout(wpo(o, x, y, z), txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1430;
  // L1: 3 de cada 100 · jueces o fiscales
  { const k = cw(t, K.tres1, K.y2 - 0.2); if (k > 0.01) { bigText('3 / 100', W / 2, Y, 120, HG, k, { glow: 26, type: false, dark: 30 }); bigText('PODRÁN SER JUEZ O FISCAL', W / 2, Y + 96, 30, HC.white, cw(t, K.podran1, K.y2 - 0.2), { dark: 20 }); } }
  // L2: la abogacía, cerrada · ¿qué te falta?
  if (S.vit.visible) { const L = S.vit.userData.lock; lab(L, 0, 0, 0.01, 'ABOGACÍA', 'CERRADA CON EL GRADO', cw(t, K.ninguno2 + 0.1, K.final2 - 0.1), { dx: 150, dy: -90, color: HC.red });
    const q = cw(t, K.falta2, K.cada3); if (q > 0.01) { const P = proj(wpo(L, 0, 0.02, 0.02)); if (P.ok) bigText('?', P.x, P.y - 150, 150, HC.red, q, { glow: 30, type: false }); } }
  // L3: +26.000 que empiezan · < 600 plazas
  { const k = cw(t, K.veintiseis3 - 0.1, K.crees4 - 0.3); if (k > 0.01) { const n = Math.round(26000 * eo(clamp((t - K.veintiseis3 + 0.1) / 0.9)) / 100) * 100; bigText('+' + n.toLocaleString('es-ES'), W / 2, Y - 40, 110, HC.white, k, { type: false, dark: 34 });
      bigText('EMPIEZAN DERECHO CADA AÑO', W / 2, Y + 50, 28, HC.white, k, { dark: 24 }); }
    const g = cw(t, K.plazas3, K.crees4 - 0.3); if (g > 0.01) { callout(S.gcenter.clone().add(v3(0, 0.05, 0)), 'PLAZAS DE JUEZ Y FISCAL', 'POR OPOSICIÓN', g, { dx: -120, dy: -200, size: 26, bg: true, color: HG });
      bigText('< 600', W / 2, Y + 150, 96, HG, cw(t, K.menos3, K.crees4 - 0.3), { glow: 18, type: false, dark: 34 }); } }
  // L4: memorizar ✗ → argumentar ✓
  { const k = cw(t, K.memorizar4 - 0.05, K.asi4); if (k > 0.01) { bigText('MEMORIZAR', W / 2, Y, 64, HC.white, k, { a: 1 - 0.55 * win(t, K.realidad4, 0.3), dark: 24 });
      const s = win(t, K.realidad4 - 0.05, 0.3); if (s > 0.01) { hg.save(); hg.strokeStyle = HC.red; hg.lineWidth = 7; hg.shadowColor = HC.red; hg.shadowBlur = 14; hg.beginPath(); hg.moveTo(W / 2 - 230, Y); hg.lineTo(W / 2 - 230 + 460 * eo(s), Y); hg.stroke(); hg.restore(); }
      bigText('ARGUMENTAR', W / 2, Y + 100, 72, HG, cw(t, K.ganar4 - 0.1, K.asi4), { glow: 20, dark: 26 }); } }
  // L5–L15: rótulos de cada estación
  const B = ST.B; if (B.Z.visible) { lab(B.col, 0, B.col.userData.h * 0.75, 0, 'DERECHO ROMANO', null, cw(t, K.derecho5 + 0.15, K.constitucional5 - 0.05), { dx: -110, dy: -120 });
    B.pyr.forEach((p, i) => lab(p, 0.06, 0, 0.06, ['REGLAMENTOS', 'LEYES', 'CONSTITUCIÓN'][i], null, cw(t, K.teoria5 + 0.15 + i * 0.12, K.civil6 - 0.1), { dx: 120, dy: -50 - i * 70, color: i === 2 ? HG : HC.white })); }
  const CI = ST.CI; if (CI.Z.visible) { lab(CI.paper, 0, 0.1, 0, 'CONTRATOS', null, cw(t, K.contratos6, K.herencias6 - 0.05), { dx: -110, dy: -130 }); lab(CI.env, 0, 0.02, 0, 'HERENCIAS', null, cw(t, K.herencias6 + 0.1, K.familia6 - 0.05), { dx: 110, dy: -150 });
    lab(CI.fam[1], 0, 1.1, 0, 'FAMILIA', null, cw(t, K.familia6 + 0.1, K.todo6 - 0.05), { dx: 110, dy: -110 }); lab(CI.mag, 0, 0, 0, 'LETRA PEQUEÑA', 'LO QUE FIRMAS SIN LEER', cw(t, K.todo6 + 0.2, K.penal7 - 0.1), { dx: 100, dy: -170, color: HG }); }
  const PE = ST.PE; if (PE.Z.visible) { lab(PE.pane, 0.04, 0.05, 0, 'DELITO', null, cw(t, K.delito7, K.pena7 - 0.05), { dx: -120, dy: -150, color: HC.teal }); lab(PE.hg, 0, 0.32, 0, 'PENA', null, cw(t, K.pena7 + 0.05, K.prueba7 - 0.05), { dx: 100, dy: -120 });
    lab(PE.mag, 0, 0, 0, 'PRUEBA', null, cw(t, K.prueba7 + 0.05, K.admin8 - 0.1), { dx: -120, dy: -160, color: HC.teal }); }
  const AD = ST.AD; if (AD.Z.visible) { lab(AD.bld, 0, 0.95, 0, 'ADMINISTRACIÓN', null, cw(t, K.admin8 + 0.3, K.defiende8 - 0.05), { dx: 110, dy: -130 }); lab(AD.cit, 0, 1.1, 0, 'CIUDADANO', null, cw(t, K.ciudadano8 + 0.1, K.mercantil9 - 0.1), { dx: -110, dy: -140, color: HG }); }
  const ME = ST.ME; if (ME.Z.visible) { lab(ME.tw[0], 0, 0.62, 0, 'EMPRESAS', null, cw(t, K.empresas9, K.despidos9 - 0.05), { dx: 120, dy: -110 }); lab(ME.box, 0, 0.18, 0, 'DESPIDOS', null, cw(t, K.despidos9 + 0.1, K.nominas9 - 0.05), { dx: -110, dy: -140, color: HC.red });
    lab(ME.nom, 0, 0.1, 0, 'NÓMINAS', null, cw(t, K.nominas9 + 0.1, K.procesal10 - 0.1), { dx: -100, dy: -150, color: HC.green }); }
  const PR = ST.PR; if (PR.Z.visible) { const k = cw(t, K.demanda10 - 0.1, K.internacional11 - 0.1); if (k > 0.01) { const u = clamp((t - K.demanda10) / (K.sentencia10 - K.demanda10)); hg.save(); hg.globalAlpha = k; const x0 = 200, x1 = 880, y = 1500; hg.strokeStyle = 'rgba(238,242,246,.35)'; hg.lineWidth = 3; hg.beginPath(); hg.moveTo(x0, y); hg.lineTo(x1, y); hg.stroke();
      hg.strokeStyle = HG; hg.lineWidth = 5; hg.shadowColor = HG; hg.shadowBlur = 12; hg.beginPath(); hg.moveTo(x0, y); hg.lineTo(x0 + (x1 - x0) * eo(u), y); hg.stroke(); hg.shadowBlur = 0; hfont(26); hg.letterSpacing = '3px'; hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('DEMANDA', x0, y - 26); hg.textAlign = 'right'; hg.fillStyle = u >= 1 ? HG : HC.grey; hg.fillText('SENTENCIA', x1, y - 26);
      for (const [x, on] of [[x0, true], [x1, u >= 1]]) { hg.fillStyle = on ? HG : '#444'; hg.beginPath(); hg.arc(x, y, 9, 0, 7); hg.fill(); } hg.restore(); }
    lab(PR.court, 0, 0.3, -0.3, 'JUICIO', null, cw(t, K.juicio10, K.demanda10 - 0.05), { dx: 110, dy: -140 }); }
  const IN = ST.IN; if (IN.Z.visible) { const g = IN.globe; lab(g, ll(-3.7, 40.4, 0.305).x, ll(-3.7, 40.4, 0.305).y, ll(-3.7, 40.4, 0.305).z, 'ESPAÑA', null, cw(t, K.internacional11 + 0.2, K.abogados12 - 0.2), { dx: -120, dy: -120, color: HG });
    lab(IN.stars, 0.46, 0, 0, 'UNIÓN EUROPEA', null, cw(t, K.europeo11 + 0.1, K.abogados12 - 0.2), { dx: 100, dy: -90 }); const k = cw(t, K.leyes11 + 0.2, K.abogados12 - 0.2); if (k > 0.01) bigText('MÁS ALLÁ DE ESPAÑA', W / 2, Y + 60, 44, HC.white, k, { dark: 24 }); }
  const SA = ST.SA; if (SA.Z.visible) { const wk = [K.abogados12, K.jueces12, K.fiscales12, K.notarios12], nm = ['ABOGADO', 'JUEZ', 'FISCAL', 'NOTARIO'];
    SA.figs.forEach((f, i) => lab(f, 0, 0.21, 0, nm[i], null, cw(t, wk[i] + 0.05, K.pero12), { dx: i < 2 ? -70 : 70, dy: -120 - (i % 2) * 70, size: 24 }));
    const s = cw(t, K.ninguno12, K.falta13 - 0.1); if (s > 0.01) stamp('NO BASTA', W / 2, 1330, s, HC.red, 92); }
  const AB = ST.AB; if (AB.Z.visible) { const wk = [K.master13, K.practicas13, K.examen13, K.colegiarte13], nm = ['MÁSTER DE ACCESO', 'PRÁCTICAS', 'EXAMEN ESTATAL', 'COLEGIACIÓN'];
    AB.items.forEach((o, i) => lab(o, 0, 0.05, 0, nm[i], i === 0 ? '≈ 1 AÑO Y MEDIO' : null, cw(t, wk[i] + 0.05, K.juez14 - 0.1), { dx: 100, dy: -90 - i * 30, color: i === 3 ? HG : HC.white, size: 24 })); }
  const JU = ST.JU; if (JU.Z.visible) { lab(JU.test, 0, 0.1, 0, '1 TEST', null, cw(t, K.test14 + 0.05, K.escuela14 - 0.1), { dx: 100, dy: -150 }); lab(JU.trib[2], 0, 0.24, 0, '2 ORALES', 'ANTE UN TRIBUNAL', cw(t, K.orales14, K.escuela14 - 0.1), { dx: -110, dy: -140, color: HG });
    lab(JU.pin, 0, 0.1, 0, 'ESCUELA JUDICIAL', 'BARCELONA', cw(t, K.escuela14 + 0.1, K.cuatro15 - 0.1), { dx: -120, dy: -130, color: HG }); }
  const TO = ST.TO; if (TO.Z.visible) { const k = cw(t, K.cuatro15, K.si16); if (k > 0.01) { bigText('4 AÑOS', W / 2, Y, 100, HC.white, k, { glow: 16, type: false, dark: 28 }); bigText('…Y LA TOGA, DESPUÉS', W / 2, Y + 92, 40, HG, cw(t, K.toga15 - 0.05, K.si16), { glow: 16, dark: 24 }); } }
  // L16: guárdalo · ¿abogado o juez?
  { const g = cw(t, K.guardalo16 - 0.05, K.dime16); if (g > 0.01) { const s = eo(clamp((t - K.guardalo16 + 0.05) / 0.3)); hg.save(); hg.globalAlpha = g; hg.translate(W / 2, Y); hg.scale(s, s); hg.fillStyle = HG; hg.shadowColor = HG; hg.shadowBlur = 24; hg.beginPath(); hg.moveTo(-50, -80); hg.lineTo(50, -80); hg.lineTo(50, 80); hg.lineTo(0, 45); hg.lineTo(-50, 80); hg.closePath(); hg.fill(); hg.restore(); }
    const d = cw(t, K.abogado16 - 0.15, END - 0.6); if (d > 0.01) { bigText('¿ABOGADO', W / 2 - 10, Y - 20, 74, HC.white, d, { glow: 14, type: false, dark: 26 }); bigText('O JUEZ?', W / 2, Y + 70, 74, HG, cw(t, K.juez16 - 0.1, END - 0.6), { glow: 18, type: false, dark: 26 }); } }
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
  S.countries = await loadTopo('../../../engine/geo/countries-110m.json');
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    menos1: atL(1, 'menos'), tres1: atL(1, '=3'), cien1: atL(1, '=100'), estudiantes1: atL(1, 'estudiantes'), derecho1: atL(1, 'derecho'), podran1: atL(1, 'podran'), jueces1: atL(1, 'jueces'), fiscales1: atL(1, 'fiscales'),
    y2: atL(2, '=y'), ninguno2: atL(2, 'ninguno'), abogado2: atL(2, 'abogado'), carrera2: atL(2, 'carrera'), final2: atL(2, 'final'), falta2: atL(2, 'falta'),
    cada3: atL(3, 'cada'), veintiseis3: atL(3, 'veintiseis'), estudiantes3: atL(3, 'estudiantes'), plazas3: atL(3, 'plazas'), oposicion3: atL(3, 'oposicion'), menos3: atL(3, 'menos'), seiscientas3: atL(3, 'seiscientas'),
    crees4: atL(4, 'crees'), memorizar4: atL(4, 'memorizar'), realidad4: atL(4, 'realidad'), ganar4: atL(4, 'ganar'), ellas4: atL(4, 'ellas'), asi4: atL(4, 'asi'), dentro4: atL(4, 'dentro'),
    base5: atL(5, 'base'), derecho5: atL(5, 'derecho'), romano5: atL(5, 'romano'), constitucional5: atL(5, 'constitucional'), teoria5: atL(5, 'teoria'),
    civil6: atL(6, 'civil'), contratos6: atL(6, 'contratos'), herencias6: atL(6, 'herencias'), familia6: atL(6, 'familia'), todo6: atL(6, 'todo'), leer6: atL(6, 'leer'),
    penal7: atL(7, 'penal'), delito7: atL(7, 'delito'), pena7: atL(7, '=pena'), prueba7: atL(7, 'prueba'),
    admin8: atL(8, 'administrativo'), defiende8: atL(8, 'defiende'), ciudadano8: atL(8, 'ciudadano'), administracion8: atL(8, 'administracion'),
    mercantil9: atL(9, 'mercantil'), empresas9: atL(9, 'empresas'), despidos9: atL(9, 'despidos'), nominas9: atL(9, 'nominas'),
    procesal10: atL(10, 'procesal'), juicio10: atL(10, 'juicio'), demanda10: atL(10, 'demanda'), sentencia10: atL(10, 'sentencia'),
    internacional11: atL(11, 'internacional'), europeo11: atL(11, 'europeo'), leyes11: atL(11, 'leyes'), espana11: atL(11, 'espana'),
    abogados12: atL(12, 'abogados'), jueces12: atL(12, 'jueces'), fiscales12: atL(12, 'fiscales'), notarios12: atL(12, 'notarios'), pero12: atL(12, 'pero'), ninguno12: atL(12, 'ninguno'), carrera12: atL(12, 'carrera'),
    falta13: atL(13, 'falta'), master13: atL(13, 'master'), practicas13: atL(13, 'practicas'), examen13: atL(13, 'examen'), colegiarte13: atL(13, 'colegiarte'),
    juez14: atL(14, 'juez'), oposicion14: atL(14, 'oposicion'), test14: atL(14, 'test'), dos14: atL(14, '=dos'), orales14: atL(14, 'orales'), tribunal14: atL(14, 'tribunal'), apruebas14: atL(14, 'apruebas'), escuela14: atL(14, 'escuela'), barcelona14: atL(14, 'barcelona'),
    cuatro15: atL(15, 'cuatro'), anos15: atL(15, 'anos'), toga15: atL(15, 'toga'), despues15: atL(15, 'despues'),
    si16: atL(16, '=si'), guardalo16: atL(16, 'guardalo'), dime16: atL(16, 'dime'), abogado16: atL(16, 'abogado'), juez16: atL(16, 'juez'),
  };
  mats(); buildMats(); buildRig(); buildFloor(); buildFlow();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  scene.fog = new THREE.FogExp2(0x000000, 0.035);
  buildCenter(); buildStations();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
