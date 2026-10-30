// «Ingeniería Aeroespacial» — mismo esquema que «Industrial»: el graduado con las alas de ingeniero que no le llegan hasta el
// final, y una estación por asignatura, todo sobre un mar de nubes al amanecer: el avión de pasajeros, el altímetro de la nota,
// la familia de «todo lo que vuela», el túnel del fuselaje, el túnel de viento, el ensayo del ala y la fibra de carbono, el
// turbofán en corte y la tobera del cohete, la Tierra con la órbita y el tráfico aéreo, y la formación final.
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
scene.background = new THREE.Color(0x05070d); scene.fog = new THREE.Fog(0x0b1224, 60, 260);
const cam = new THREE.PerspectiveCamera(34, W / H, 0.01, 2000); cam.layers.enable(1);
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
let WORDS = [], END = 68.4, VENV = [];
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
// ---------------------------------------------------------------- cielo: noche azul con estrellas (como «Industrial») que se abre en amanecer sobre el horizonte, y espacio negro
const SUN = new THREE.Vector3(-0.62, 0.1, -0.78).normalize();
const STAR_TEX = (() => { const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, '#04060c'); gr.addColorStop(0.5, '#0b1124'); gr.addColorStop(1, '#06080f'); g.fillStyle = gr; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 12; i++) { const x = hash(i * 31) * 2048, y = 200 + hash(i * 17) * 400, r = 160 + hash(i * 7) * 320, rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, ['rgba(60,80,170,.20)', 'rgba(150,70,40,.12)', 'rgba(90,50,140,.16)'][i % 3]); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 2200; i++) { const b = hash(i * 1.7); g.fillStyle = `rgba(215,225,255,${0.1 + b * b * 0.6})`; const s = b > 0.97 ? 2.2 : b > 0.85 ? 1.5 : 1; g.fillRect(hash(i * 3.3) * 2048, hash(i * 5.1) * 1024, s, s); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const SKY_VS = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; gl_Position.z = gl_Position.w * 0.99999; }`;
const SKY_FS = `uniform sampler2D tStars; uniform vec3 sunDir, camP; uniform float dawn, space, starK; varying vec3 vW;
void main(){
  vec3 d = normalize(vW - camP); float h = d.y;
  vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1., 1.)) / 3.14159265 + 0.5);
  vec3 night = texture2D(tStars, uv).rgb; night = pow(night, vec3(2.2)) * starK;
  vec3 zen = vec3(0.018, 0.045, 0.15), mid = vec3(0.09, 0.18, 0.42);
  vec2 dh = normalize(d.xz + 1e-5), sh = normalize(sunDir.xz + 1e-5); float az = max(dot(dh, sh), 0.);
  vec3 hor = mix(vec3(0.3, 0.28, 0.46), vec3(1.0, 0.5, 0.24), pow(az, 3.0));
  float sd = max(dot(d, sunDir), 0.);
  vec3 day = mix(hor, mid, smoothstep(-0.02, 0.24, h)); day = mix(day, zen, smoothstep(0.2, 0.8, h));
  day += vec3(1.0, 0.5, 0.2) * pow(sd, 8.0) * 0.8 * exp(-max(h, 0.) * 3.0) + vec3(1.0, 0.86, 0.62) * pow(sd, 900.0) * 6.5;
  day = mix(day, vec3(0.1, 0.09, 0.15), smoothstep(0.0, -0.35, h));
  day += night * smoothstep(0.25, 0.9, h) * 0.5;
  vec3 c = mix(night, day, dawn * (1. - space));
  gl_FragColor = vec4(c, 1.);
}`;
function buildSky() {
  const m = new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { tStars: { value: STAR_TEX }, sunDir: { value: SUN.clone() }, camP: { value: new THREE.Vector3() }, dawn: { value: 0 }, space: { value: 0 }, starK: { value: 1.4 } } });
  const s = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), m); s.renderOrder = -10; s.frustumCulled = false; scene.add(s); S.sky = s; return s;
}
// ---------------------------------------------------------------- mar de nubes: un suelo de nubes hasta el horizonte (ruido fbm iluminado por el sol bajo)
const CLOUD_Y = -6;
const CF_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`;
const CF_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 sunDir, camP, fogC; uniform float time, op, dawn; varying vec3 vW;
float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ns(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.; for (int i = 0; i < 6; i++){ s += a * ns(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float fb3(vec2 p){ float a = 0.5, s = 0.; for (int i = 0; i < 3; i++){ s += a * ns(p); p = p * 2.1 + vec2(4.3, 1.1); a *= 0.5; } return s; }
void main(){
  #include <logdepthbuf_fragment>
  vec2 p = vW.xz * 0.045 + vec2(time * 0.012, time * 0.004), sd = normalize(sunDir.xz + 1e-5);
  float dist = distance(vW, camP), near = 1. - smoothstep(8., 70., dist);
  // de cerca, rizos pequeños de nube (si no, el mar de nubes es una mancha lisa)
  float det = (fb3(vW.xz * 0.55 + time * 0.03) - 0.45) * 0.16 * near, det2 = (fb3((vW.xz + sd * 0.25) * 0.55 + time * 0.03) - 0.45) * 0.16 * near;
  float d = fbm(p) + det, d2 = fbm(p + sd * 0.05) + det2;
  float cov = smoothstep(0.36, 0.7, d);
  float lit = clamp(0.58 + (d - d2) * 6.5, 0., 1.35);
  vec3 sh = vec3(0.12, 0.15, 0.3), li = mix(vec3(0.5, 0.55, 0.72), vec3(1.05, 0.72, 0.56), dawn) * (0.75 + 0.35 * max(dot(normalize(vW.xz - camP.xz + 1e-4), normalize(sunDir.xz)), 0.));
  vec3 c = mix(sh * 0.6, mix(sh, li, lit), cov);
  float f = 1. - exp(-dist * 0.0028);
  c = mix(c, fogC, f);
  gl_FragColor = vec4(c, op);
}`;
function buildCloudFloor() {
  const m = new THREE.ShaderMaterial({ vertexShader: CF_VS, fragmentShader: CF_FS, transparent: true, depthWrite: true, fog: false,
    uniforms: { sunDir: { value: SUN.clone() }, camP: { value: new THREE.Vector3() }, fogC: { value: new THREE.Color(0.32, 0.3, 0.44) }, time: { value: 0 }, op: { value: 1 }, dawn: { value: 1 } } });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000, 1, 1), m); p.rotation.x = -Math.PI / 2; p.position.set(60, CLOUD_Y, 0); p.renderOrder = -5; scene.add(p); S.cfloor = p; return p;
}
// ---------------------------------------------------------------- nubes de verdad alrededor de la cámara: billboards con textura de cúmulo, luz del sol por arriba
const PUFF_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 corner; attribute vec4 ip; attribute vec4 iq;
uniform vec3 camR, camU, camP; uniform float op;
varying vec2 vUv; varying float vA; varying float vY; varying float vT;
void main(){
  vec3 c = ip.xyz; float sz = ip.w;
  vec3 P = c + (camR * corner.x * 1.6 + camU * corner.y) * sz;
  vUv = corner * 0.5 + 0.5; vY = corner.y; vT = iq.x;
  float d = distance(c, camP);
  vA = op * iq.y * smoothstep(sz * 0.6, sz * 2.2, d) * (1. - smoothstep(160., 260., d));
  vec4 mv = viewMatrix * vec4(P, 1.); gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
const PUFF_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D tPuff; uniform vec3 litC, shC; varying vec2 vUv; varying float vA; varying float vY; varying float vT;
void main(){
  #include <logdepthbuf_fragment>
  vec4 tx = texture2D(tPuff, vec2(vUv.x * 0.5 + (vT > 0.5 ? 0.5 : 0.), vUv.y));
  float a = tx.a * vA * smoothstep(-0.95, -0.3, vY); if (a < 0.004) discard;      // por abajo se deshace (no se ve el corte con el mar de nubes)
  vec3 c = mix(shC, litC, clamp(0.35 + vY * 0.55 + tx.r * 0.35, 0., 1.2));
  gl_FragColor = vec4(c, a);
}`;
const PUFF_TEX = canvasTex(512, 256, (g, w, h) => {
  for (let k = 0; k < 2; k++) { const ox = k * 256;
    for (let i = 0; i < 70; i++) { const a = hash(i * 3.1 + k * 50) * Math.PI * 2, rr2 = Math.pow(hash(i * 7.7 + k), 0.7) * 70, x = ox + 128 + Math.cos(a) * rr2 * 1.25, y = 140 + Math.sin(a) * rr2 * 0.55 - hash(i * 1.3) * 25, r = 26 + hash(i * 5.3 + k) * 44;
      const gr = g.createRadialGradient(x, y - r * 0.25, 0, x, y, r); const l = Math.round(200 + hash(i) * 55);
      gr.addColorStop(0, `rgba(${l},${l},${l},.95)`); gr.addColorStop(0.55, `rgba(${l - 25},${l - 25},${l - 25},.7)`); gr.addColorStop(1, 'rgba(120,120,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
});
function puffCloud(N, gen, o = {}) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
  g.setAttribute('corner', new THREE.Float32BufferAttribute([-1, -1, 1, -1, -1, 1, 1, 1], 2)); g.setIndex([0, 1, 2, 2, 1, 3]);
  const ip = new Float32Array(N * 4), iq = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { const q = gen(i); ip.set([q[0], q[1], q[2], q[3]], i * 4); iq.set([hash(i * 9.1 + (o.seed || 0)), q[4] ?? 1, 0, 0], i * 4); }
  g.setAttribute('ip', new THREE.InstancedBufferAttribute(ip, 4)); g.setAttribute('iq', new THREE.InstancedBufferAttribute(iq, 4)); g.instanceCount = N;
  const m = new THREE.ShaderMaterial({ vertexShader: PUFF_VS, fragmentShader: PUFF_FS, transparent: true, depthWrite: false,
    uniforms: { tPuff: { value: PUFF_TEX }, camR: { value: new THREE.Vector3(1, 0, 0) }, camU: { value: new THREE.Vector3(0, 1, 0) }, camP: { value: new THREE.Vector3() }, op: { value: 1 },
      litC: { value: new THREE.Color(o.lit || 0xfff0e2) }, shC: { value: new THREE.Color(o.sh || 0x6f7a99) } } });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 6; scene.add(mesh); return mesh;
}
// ---------------------------------------------------------------- flujo óptico: motas en el aire que dejan estelas según se mueve la cámara (como en «Civil»)
const FLOW_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 corner; attribute vec3 ipos; attribute float iseed;
uniform mat4 VP, PVP; uniform vec2 res; uniform float size, bright, time, nearF, farF, drift, keep;
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
  vA = bright * (0.3 + 0.7 * iseed) * fog * nf * clamp((2.0 * sz) / (L * 0.5 + 2.0 * sz), keep, 1.0);
  vS = corner.x > 0.5 ? -1.0 : (L / sz + 1.0); vT = corner.y; vLen = L / sz;
}`;
const FLOW_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 col; uniform float op; varying float vA; varying float vS; varying float vT; varying float vLen;
void main(){
  #include <logdepthbuf_fragment>
  float ds = max(0., max(-vS, vS - vLen)), dist = length(vec2(ds, vT));
  float a = smoothstep(1.0, 0.2, dist) * vA * op * mix(1.0, 0.2, clamp(vS / max(vLen, 0.001), 0., 1.));
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
      time: { value: 0 }, nearF: { value: o.nearF || 0.25 }, farF: { value: o.farF || 0.03 }, drift: { value: o.drift ?? 0.03 }, keep: { value: o.keep || 0.1 }, op: { value: 1 }, col: { value: new THREE.Color(o.col || 0xd8e2ee) } } });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.layers.set(1); mesh.renderOrder = 2; scene.add(mesh); return mesh;
}
const gauss = i => { const u = Math.max(1e-6, hash(i * 1.37)), v = hash(i * 2.91); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const PUFFS = [];
function buildWorld() {
  buildSky(); buildCloudFloor();
  // (sin capa de cúmulos sueltos: lavaban toda la imagen; el mar de nubes es el suelo fbm)
  S.puffs = puffCloud(1, () => [0, -999, 0, 0.01, 0], { seed: 3 }); S.puffs.visible = false;
  S.flow = [
    flowCloud(16000, i => [-15 + hash(i * 3.1) * 110, -5 + Math.pow(hash(i * 5.7), 1.2) * 20, -14 + hash(i * 8.3) * 30], { size: 1.6, bright: 0.75, farF: 0.025, seed: 2 }),
    flowCloud(6000, i => [gauss(i) * 3.5, 0.2 + Math.abs(gauss(i + 9e3)) * 2.5, gauss(i + 2e4) * 3.5], { size: 1.3, bright: 0.55, seed: 1, nearF: 0.05, farF: 0.06, col: 0xfff0d0 }),
  ];
}
function worldUpdate(t, VP, PVP, camP) {
  for (const m of S.flow) { const u = m.material.uniforms; u.VP.value.copy(VP); u.PVP.value.copy(PVP); u.time.value = t; }
  S.sky.position.copy(camP); S.sky.material.uniforms.camP.value.copy(camP);
  const cu = S.cfloor.material.uniforms; cu.camP.value.copy(camP); cu.time.value = t;
  cam.updateMatrixWorld();
  for (const P of PUFFS) { const pu = P.material.uniforms; pu.camP.value.copy(camP); pu.camR.value.setFromMatrixColumn(cam.matrixWorld, 0); pu.camU.value.setFromMatrixColumn(cam.matrixWorld, 1); }
}
// mapa de entorno (reflejos de los aviones): el cielo del amanecer con el mar de nubes abajo
function skyEnv() {
  const sc = new THREE.Scene(), m = S.sky.material.clone(); m.uniforms.camP.value = new THREE.Vector3(); m.uniforms.dawn.value = 1; m.uniforms.space.value = 0;
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), m));
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.42, 0.4, 0.52) })); fl.rotation.x = -Math.PI / 2; fl.position.y = -8; sc.add(fl);
  const pm = new THREE.PMREMGenerator(renderer); const e = pm.fromScene(sc, 0, 0.1, 1000).texture; pm.dispose(); return e;
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
// ---------------------------------------------------------------- perfiles NACA de 4 dígitos (contorno cerrado: borde de salida extradós → borde de ataque → borde de salida intradós)
function naca(m, p, tt, n = 20) {
  const up = [], lo = [];
  for (let i = 0; i <= n; i++) {
    const x = (1 - Math.cos(Math.PI * i / n)) / 2;
    const yt = 5 * tt * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    let yc = 0, dy = 0;
    if (m > 0) { if (x < p) { yc = m / (p * p) * (2 * p * x - x * x); dy = 2 * m / (p * p) * (p - x); } else { yc = m / ((1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x * x); dy = 2 * m / ((1 - p) ** 2) * (p - x); } }
    const th = Math.atan(dy);
    up.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]); lo.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]);
  }
  return [...up.slice().reverse(), ...lo.slice(1)];
}
// ala trapecial con flecha, diedro, torsión y perfil que adelgaza; envergadura a lo largo de +z (raíz en z = 0), borde de ataque de la raíz en x = 0
function wingGeo(o) {
  const nS = o.nS || 16, LR = naca(o.m ?? 0.02, o.p ?? 0.4, o.tcR, 20), LT = naca(o.m ?? 0.02, o.p ?? 0.4, o.tcT, 20), nL = LR.length;
  const pos = [], uv = [], idx = [];
  const sec = e => { const c = lerp(o.cr, o.ct, e), xLE = -e * o.span * Math.tan(o.sweep), y0 = e * o.span * Math.tan(o.dih), z = e * o.span, tw = -(o.twist || 0) * e;
    return LR.map((q, i) => { const ax = lerp(q[0], LT[i][0], e), ay = lerp(q[1], LT[i][1], e), xc = ax - 0.25, xr = xc * Math.cos(tw) - ay * Math.sin(tw) + 0.25, yr = xc * Math.sin(tw) + ay * Math.cos(tw);
      return [xLE - xr * c, y0 + yr * c, z]; }); };
  for (let j = 0; j <= nS; j++) { const e = j / nS; sec(e).forEach((p, i) => { pos.push(...p); uv.push(i / (nL - 1), e); }); }
  for (let j = 0; j < nS; j++) for (let i = 0; i < nL - 1; i++) { const a = j * nL + i, b = a + 1, c2 = a + nL, d = c2 + 1; idx.push(a, c2, b, b, c2, d); }
  const tip = sec(1), cx = tip.reduce((s, p) => s + p[0], 0) / nL, cy = tip.reduce((s, p) => s + p[1], 0) / nL, ci = pos.length / 3;
  pos.push(cx, cy, o.span); uv.push(0.5, 1);
  for (let i = 0; i < nL - 1; i++) idx.push(ci, nS * nL + i + 1, nS * nL + i);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  g.userData = o; return g;
}
// material de ala que se dobla (flexión ∝ η²) y enseña la tensión (azul → rojo en la raíz) — uniforms en m.userData.u
function flexMat(base, span) {
  const u = { uFlex: { value: 0 }, uSpan: { value: span }, uStress: { value: 0 } };
  base.onBeforeCompile = sh => { Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uFlex, uSpan; varying float vEta;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat eta = clamp(position.z / uSpan, 0., 1.); vEta = eta; transformed.y += uFlex * eta * eta * uSpan * 0.34;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uFlex, uStress; varying float vEta;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float sv = clamp((1.0 - vEta) * (0.35 + 0.65 * uFlex), 0., 1.);
        vec3 sc = sv < 0.33 ? mix(vec3(0.1, 0.35, 1.0), vec3(0.1, 0.95, 0.6), sv / 0.33) : sv < 0.66 ? mix(vec3(0.1, 0.95, 0.6), vec3(1.0, 0.85, 0.1), (sv - 0.33) / 0.33) : mix(vec3(1.0, 0.85, 0.1), vec3(1.0, 0.15, 0.08), (sv - 0.66) / 0.34);
        totalEmissiveRadiance += sc * uStress * 0.65; diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.45, uStress);`);
  };
  base.customProgramCacheKey = () => 'flex' + span.toFixed(3); base.userData.u = u; return base;
}
// fuselaje paramétrico: s 0 (morro, x = +0.5) → 1 (cola, x = −0.5); cola que sube por abajo; UV: u = s, v = ángulo desde arriba
function fuselageGeo(R, N = 110, M = 60) {
  const pos = [], uv = [], idx = [];
  const rad = s => s < 0.12 ? R * Math.pow(1 - Math.pow(1 - s / 0.12, 2.2), 0.5) : s < 0.66 ? R : R * Math.max(0.05, 1 - Math.pow((s - 0.66) / 0.34, 1.45) * 0.95);
  const yc = s => s > 0.66 ? (R - rad(s)) * 0.9 : s < 0.12 ? -(R - rad(s)) * 0.3 : 0;
  for (let j = 0; j <= N; j++) { const s = j / N, r = rad(s), y0 = yc(s);
    for (let i = 0; i <= M; i++) { const ph = i / M * Math.PI * 2; pos.push(0.5 - s, y0 + r * Math.cos(ph) * 1.03, r * Math.sin(ph)); uv.push(s, i / M); } }
  for (let j = 0; j < N; j++) for (let i = 0; i < M; i++) { const a = j * (M + 1) + i, b = a + 1, c = a + M + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  g.userData = { rad, yc }; return g;
}
// pintura del fuselaje: ventanillas, puertas, cabina, línea de color y panza gris (sin logotipos ni matrícula real)
const _livery = {};
function liveryTex(stripe = '#1f4fa8', stripe2 = '#e3a72f') {
  const key = stripe + stripe2; if (_livery[key]) return _livery[key];
  return _livery[key] = canvasTex(4096, 1024, (g, w, h) => {
    g.fillStyle = '#f4f6f8'; g.fillRect(0, 0, w, h);
    const belly = g.createLinearGradient(0, h * 0.32, 0, h * 0.5); belly.addColorStop(0, 'rgba(160,168,180,0)'); belly.addColorStop(1, 'rgba(160,168,180,.85)');
    g.fillStyle = belly; g.fillRect(0, h * 0.32, w, h * 0.36); const b2 = g.createLinearGradient(0, h * 0.5, 0, h * 0.68); b2.addColorStop(0, 'rgba(160,168,180,.85)'); b2.addColorStop(1, 'rgba(160,168,180,0)'); g.fillStyle = b2; g.fillRect(0, h * 0.5, w, h * 0.18);
    for (const v of [0.236, 0.764]) {        // línea de color bajo las ventanillas
      g.fillStyle = stripe; g.fillRect(w * 0.1, h * v - 9, w * 0.86, 18); g.fillStyle = stripe2; g.fillRect(w * 0.1, h * v + (v < 0.5 ? 13 : -17), w * 0.86, 4);
      for (let s = 0.155; s < 0.665; s += 0.0084) { if (Math.abs(s - 0.4) < 0.012 || Math.abs(s - 0.63) < 0.012) continue;      // ventanillas (salvo en las puertas)
        const x = s * w, y = h * (v < 0.5 ? 0.188 : 0.812); g.fillStyle = '#18202c'; rr(g, x - 7, y - 11, 14, 22, 6); g.fill(); g.fillStyle = 'rgba(150,190,230,.35)'; rr(g, x - 5, y - 9, 6, 9, 3); g.fill(); }
      for (const s of [0.142, 0.4, 0.63]) { g.strokeStyle = 'rgba(80,90,105,.9)'; g.lineWidth = 3; rr(g, s * w - 18, h * (v < 0.5 ? 0.16 : 0.78) - 4, 36, 70, 10); g.stroke(); }
      g.fillStyle = '#121822';                // cabina
      for (let k = 0; k < 3; k++) { const x0 = w * (0.034 + k * 0.011); g.beginPath(); const y = h * (v < 0.5 ? 0.14 : 0.86); g.moveTo(x0, y - 18); g.lineTo(x0 + w * 0.0095, y - 14); g.lineTo(x0 + w * 0.0095, y + 14); g.lineTo(x0, y + 18); g.closePath(); g.fill(); }
    }
    g.fillStyle = '#121822'; g.beginPath(); g.moveTo(w * 0.03, h * 0.03); g.lineTo(w * 0.055, h * 0.06); g.lineTo(w * 0.055, h * 0.94); g.lineTo(w * 0.03, h * 0.97); g.fill();   // parabrisas (por arriba)
  });
}
// góndola de turbofán (eje a lo largo de −x: entrada en x = 0); fan con álabes que giran y cono con espiral (se ve girar)
const SWIRL = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#16181d'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2f2f2'; g.lineWidth = 22; g.beginPath(); g.moveTo(0, h); g.bezierCurveTo(w * 0.3, h * 0.5, w * 0.6, h * 0.3, w, 0); g.stroke(); });
function nacelle(Ln, Rn, cowl, blades = 22) {
  const g = new THREE.Group();
  const prof = [[0.86, 0], [0.95, 0.012], [1.0, 0.06], [1.0, 0.45], [0.93, 0.78], [0.8, 1.0], [0.74, 0.985], [0.79, 0.32], [0.83, 0.03], [0.86, 0]].map(([r, y]) => [r * Rn, y * Ln]);
  const shell = lathe(prof, 64, cowl); shell.rotation.z = Math.PI / 2; g.add(shell);
  const inner = lathe([[0.79 * Rn, 0.06 * Ln], [0.78 * Rn, 0.9 * Ln]], 48, new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 0.6, metalness: 0.4, side: THREE.BackSide })); inner.rotation.z = Math.PI / 2; g.add(inner);
  const fan = new THREE.Group(); fan.position.x = -0.13 * Ln; g.add(fan);
  const bm = new THREE.MeshStandardMaterial({ color: 0x8c929c, roughness: 0.28, metalness: 1 });
  for (let i = 0; i < blades; i++) { const p = new THREE.Group(); p.rotation.x = i / blades * Math.PI * 2; fan.add(p);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.005 * Ln * 4, 0.6 * Rn, 0.2 * Rn), bm); b.position.y = 0.46 * Rn; b.rotation.y = 0.75; p.add(b); }
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.2 * Rn, 0.38 * Rn, 32), new THREE.MeshStandardMaterial({ map: SWIRL, roughness: 0.3, metalness: 0.6 })); sp.rotation.z = -Math.PI / 2; sp.position.x = 0.12 * Rn; fan.add(sp);
  const core = lathe([[0.55 * Rn, 0], [0.5 * Rn, 0.25 * Ln], [0.25 * Rn, 0.38 * Ln], [0.02 * Rn, 0.45 * Ln]], 40, metal(0x9aa0aa, 0.35)); core.rotation.z = Math.PI / 2; core.position.x = -0.95 * Ln; g.add(core);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData.fan = fan; return g;
}
// avión de pasajeros bimotor de fuselaje ancho (largo 1, morro en +x, ala derecha en +z). update(t, o): fans, luces, flexión
function makeJet(o = {}) {
  const J = new THREE.Group(), R = 0.046;
  const tex = liveryTex(o.stripe, o.stripe2);
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: tex, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });
  const fus = new THREE.Mesh(fuselageGeo(R), skin); fus.castShadow = true; fus.receiveShadow = true; J.add(fus);
  const wingM = flexMat(new THREE.MeshPhysicalMaterial({ color: 0xd2d6dc, roughness: 0.38, metalness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25 }), 0.44);
  const W0 = { cr: 0.19, ct: 0.042, span: 0.44, sweep: 0.56, dih: 0.1, tcR: 0.13, tcT: 0.1, twist: 0.06, nS: 20 };
  const wg = wingGeo(W0), wings = [];
  for (const s of [1, -1]) { const w = new THREE.Mesh(wg, wingM); w.position.set(0.08, -0.024, s * R * 0.8); w.scale.z = s; w.castShadow = true; w.receiveShadow = true; J.add(w); wings.push(w);
    // aleta de punta (sharklet)
    const wl = new THREE.Mesh(wingGeo({ cr: 0.042, ct: 0.016, span: 0.04, sweep: 0.75, dih: 1.25, tcR: 0.1, tcT: 0.08, m: 0, nS: 4 }), wingM); wl.position.set(-W0.span * Math.tan(W0.sweep), W0.span * Math.tan(W0.dih), W0.span); w.add(wl); }
  // estabilizadores
  const tailM = new THREE.MeshPhysicalMaterial({ color: 0xf2f4f6, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 });
  for (const s of [1, -1]) { const h = new THREE.Mesh(wingGeo({ cr: 0.1, ct: 0.038, span: 0.16, sweep: 0.62, dih: 0.12, tcR: 0.1, tcT: 0.09, m: 0, nS: 8 }), tailM); h.position.set(-0.36, 0.012, s * 0.012); h.scale.z = s; h.castShadow = true; J.add(h); }
  const fin = new THREE.Mesh(wingGeo({ cr: 0.17, ct: 0.065, span: 0.16, sweep: 0.68, dih: 0, tcR: 0.1, tcT: 0.09, m: 0, nS: 8 }), new THREE.MeshPhysicalMaterial({ color: o.tail || 0x1f4fa8, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 }));
  fin.rotation.x = -Math.PI / 2; fin.position.set(-0.31, 0.03, 0); fin.castShadow = true; J.add(fin);
  // motores bajo las alas (al 32 % de la semienvergadura), con pilón
  const cowl = new THREE.MeshPhysicalMaterial({ color: 0xeef1f4, roughness: 0.28, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1 });
  const fans = [];
  for (const s of [1, -1]) { const e = 0.32, zz = s * (R * 0.8 + e * W0.span), xLE = 0.08 - e * W0.span * Math.tan(W0.sweep), yW = -0.024 + e * W0.span * Math.tan(W0.dih);
    const n = nacelle(0.13, 0.028, cowl); n.position.set(xLE + 0.075, yW - 0.04, zz); J.add(n); fans.push(n.userData.fan);
    const py = rbox(0.09, 0.03, 0.008, cowl, 0.004); py.position.set(xLE + 0.01, yW - 0.016, zz); py.rotation.z = -0.15; J.add(py); }
  // luces: navegación (roja izquierda, verde derecha), estrobos blancos en las puntas y la cola, baliza roja arriba y abajo
  const L = {};
  const light = (c, r = 0.006) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); const h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: starTex0(), color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); h.userData.halo = true; m.add(h); return m; };
  const tip = s => v3(0.08 - W0.span * Math.tan(W0.sweep) - 0.01, -0.024 + W0.span * Math.tan(W0.dih) + 0.03, s * (R * 0.8 + W0.span));
  L.red = light(new THREE.Color(3, 0.1, 0.1)); L.red.position.copy(tip(-1)); J.add(L.red);
  L.green = light(new THREE.Color(0.1, 3, 0.4)); L.green.position.copy(tip(1)); J.add(L.green);
  L.strobes = [tip(-1).add(v3(-0.012, 0, 0)), tip(1).add(v3(-0.012, 0, 0)), v3(-0.5, 0.008, 0)].map(p => { const l = light(new THREE.Color(4, 4, 4.4), 0.005); l.position.copy(p); J.add(l); return l; });
  L.beacons = [v3(0.05, R * 1.04, 0), v3(0.0, -R * 1.04, 0)].map(p => { const l = light(new THREE.Color(3.5, 0.2, 0.1), 0.006); l.position.copy(p); J.add(l); return l; });
  L.land = [1, -1].map(s => { const l = light(new THREE.Color(3, 3, 2.6), 0.007); l.position.set(0.07, -0.03, s * 0.06); J.add(l); return l; });
  J.traverse(q => { if (q.isMesh && !q.material.userData?.halo) q.castShadow = true; });
  const exh = [1, -1].map(s => { const e = 0.32, xLE = 0.08 - e * W0.span * Math.tan(W0.sweep), yW = -0.024 + e * W0.span * Math.tan(W0.dih); return v3(xLE + 0.075 - 0.17, yW - 0.04, s * (R * 0.8 + e * W0.span)); });
  J.userData = { fans, wings, wingM, L, fus, R, W0, exh,
    update(t, k = {}) {
      const spin = (k.fan ?? 1) * t * 38; fans.forEach((f, i) => { f.rotation.x = spin + i; });
      wingM.userData.u.uFlex.value = k.flex ?? 0.08 + 0.02 * Math.sin(t * 2.3); wingM.userData.u.uStress.value = k.stress ?? 0;
      const st = (t % 1.25) < 0.06 || ((t % 1.25) > 0.14 && (t % 1.25) < 0.19), bc = (t % 1.0) < 0.12;
      const vis = (l, on, sz) => { l.visible = on; l.children[0].scale.setScalar(sz); l.children[0].quaternion.copy(cam.quaternion); if (l.parent) { l.parent.getWorldQuaternion(_q); l.children[0].quaternion.premultiply(_q.invert()); } };
      const hs = (k.halo ?? 0.07) * 0.6; vis(L.red, true, hs); vis(L.green, true, hs); L.strobes.forEach(l => vis(l, st, hs * 1.25)); L.beacons.forEach(l => vis(l, bc, hs * 1.1)); L.land.forEach(l => vis(l, !!k.land, hs * 1.6));
    } };
  return J;
}
// ---------------------------------------------------------------- avión de papel (folio blanco doblado), largo 1, morro en +x
function makePaperPlane() {
  const g = new THREE.Group();
  const P = { n: [0.5, 0, 0], tl: [-0.5, 0.035, -0.27], tr: [-0.5, 0.035, 0.27], c: [-0.5, 0, 0], k: [-0.5, -0.09, 0], kf: [0.1, -0.02, 0] };
  const tri = (a, b, c) => [...P[a], ...P[b], ...P[c]];
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([...tri('n', 'tl', 'c'), ...tri('n', 'c', 'tr'), ...tri('n', 'c', 'k'), ...tri('n', 'k', 'c')], 3)); geo.computeVertexNormals();
  const paper = new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.85, side: THREE.DoubleSide, emissive: 0x2a2826 });
  const m = new THREE.Mesh(geo, paper); m.castShadow = true; g.add(m);
  const crease = segSet(3, 0xb9b4aa, 1.4, 0.9); crease.userData.set(0, v3(...P.n), v3(...P.c)); crease.userData.set(1, v3(...P.n), v3(...P.k)); crease.userData.set(2, v3(...P.tl), v3(...P.tr)); crease.userData.flush(); g.add(crease);
  return g;
}
// ---------------------------------------------------------------- alas de ingeniero: insignia dorada (dos alas de plumas en relieve + medallón con texto)
function wingShape() {        // ala de piloto: borde superior que sube a la punta y plumas festoneadas por debajo
  const s = new THREE.Shape(); s.moveTo(0.0, 0.07);
  s.bezierCurveTo(0.3, 0.15, 0.65, 0.2, 1.0, 0.24);
  const F = [[1.0, 0.24, 0.9, 0.12], [0.9, 0.12, 0.78, 0.05], [0.78, 0.05, 0.64, -0.01], [0.64, -0.01, 0.5, -0.05], [0.5, -0.05, 0.36, -0.08], [0.36, -0.08, 0.2, -0.09]];
  for (const [x0, y0, x1, y1] of F) s.quadraticCurveTo(x0 - 0.01, y1 - 0.02, x1, y1);
  s.lineTo(0.0, -0.06); s.closePath(); return s;
}
const BADGE_TXT = (txt, col = '#3a2608') => canvasTex(512, 512, (g, w, h) => { g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 120px Inter'; g.fillText(txt, w / 2, h / 2 + 8); });
function makeBadge() {
  const g = new THREE.Group(), gold = new THREE.MeshPhysicalMaterial({ color: 0xffc35a, roughness: 0.22, metalness: 1, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  for (const s of [1, -1]) {
    const geo = new THREE.ExtrudeGeometry(wingShape(), { depth: 0.03, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 16 }); geo.translate(0.12, 0, -0.015);
    const w = new THREE.Mesh(geo, gold); w.scale.set(s, 1, 1); w.castShadow = true; g.add(w);
    // surcos entre plumas (relieve)
    for (const [x, y, a] of [[0.88, 0.13, 1.0], [0.76, 0.07, 1.05], [0.63, 0.02, 1.1], [0.5, -0.02, 1.15], [0.37, -0.045, 1.2]]) { const f = rbox(0.011, 0.11, 0.012, new THREE.MeshStandardMaterial({ color: 0x8a5a14, roughness: 0.5, metalness: 0.8 }), 0.004); f.position.set(s * (x + 0.12), y + 0.035, 0.026); f.rotation.z = s * (0.45 - a * 0.25); g.add(f); }
    const ln = rbox(0.62, 0.008, 0.01, new THREE.MeshStandardMaterial({ color: 0x8a5a14, roughness: 0.5, metalness: 0.8 }), 0.003); ln.position.set(s * 0.55, 0.11, 0.026); ln.rotation.z = s * 0.14; g.add(ln);
  }
  const disc = cyl(0.15, 0.15, 0.05, gold, 48); disc.rotation.x = Math.PI / 2; g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.016, 10, 48), gold); g.add(ring);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.135, 48), new THREE.MeshPhysicalMaterial({ color: 0x14203d, roughness: 0.3, metalness: 0.2, clearcoat: 1 })); face.position.z = 0.027; g.add(face);
  const mt = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25), new THREE.MeshBasicMaterial({ map: BADGE_TXT('?', '#ffc35a'), transparent: true, depthWrite: false, toneMapped: false })); mt.position.z = 0.029; g.add(mt);
  const plate = rbox(0.62, 0.075, 0.03, gold, 0.012); plate.position.set(0, -0.2, 0); g.add(plate);
  const pt = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.065), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 112, (q, w, h) => { q.fillStyle = '#3a2608'; q.font = '900 74px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('INGENIERO AERONÁUTICO', w / 2, h / 2 + 4); }), transparent: true, depthWrite: false })); pt.position.set(0, -0.2, 0.017); g.add(pt);
  g.userData = { mt, gold };
  return g;
}
// ---------------------------------------------------------------- helicóptero (largo ≈ 1): cabina de cristal, botalón, patines, rotor principal y de cola (con disco de giro)
function makeHeli() {
  const g = new THREE.Group(), body = paint(0x1e2d4f, 0.3), stripe = paint(0xe9edf2, 0.3);
  const cab = sph(0.17, body, 32, 24); cab.scale.set(1.45, 1, 0.95); cab.position.set(0.18, 0.02, 0); g.add(cab);
  const gl = new THREE.Mesh(new THREE.SphereGeometry(0.172, 32, 20, -0.9, 1.8, 0.35, 1.25), MAT.glass); gl.scale.set(1.45, 1, 0.95); gl.position.set(0.19, 0.03, 0); gl.rotation.z = -0.25; g.add(gl);
  const boom = cyl(0.03, 0.065, 0.6, body, 20); boom.rotation.z = Math.PI / 2; boom.position.set(-0.34, 0.06, 0); g.add(boom);
  const st = cyl(0.031, 0.066, 0.12, stripe, 20); st.rotation.z = Math.PI / 2; st.position.set(-0.2, 0.06, 0); g.add(st);
  const fin = new THREE.Mesh(wingGeo({ cr: 0.13, ct: 0.07, span: 0.14, sweep: 0.6, dih: 0, tcR: 0.12, tcT: 0.1, m: 0, nS: 4 }), body); fin.rotation.x = -Math.PI / 2; fin.position.set(-0.56, 0.06, 0); g.add(fin);
  const hst = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.2), body); hst.position.set(-0.5, 0.06, 0); g.add(hst);
  const mast = cyl(0.018, 0.022, 0.08, MAT.dsteel, 12); mast.position.set(0.14, 0.2, 0); g.add(mast);
  const rotor = new THREE.Group(); rotor.position.set(0.14, 0.245, 0); g.add(rotor);
  const bladeM = new THREE.MeshStandardMaterial({ color: 0x24272d, roughness: 0.5, metalness: 0.4 });
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.006, 0.045), bladeM); b.position.x = 0.31; const p = new THREE.Group(); p.rotation.y = i * Math.PI / 2; p.add(b); rotor.add(p); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.62, 48), new THREE.MeshBasicMaterial({ color: 0x9aa4b8, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })); disc.rotation.x = -Math.PI / 2; rotor.add(disc);
  const tr = new THREE.Group(); tr.position.set(-0.6, 0.13, 0.03); g.add(tr);
  for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.16, 0.02), bladeM); const p = new THREE.Group(); p.rotation.z = i * Math.PI / 2; p.add(b); tr.add(p); }
  for (const s of [1, -1]) { const sk = tube([v3(0.38, -0.2, s * 0.13), v3(0.3, -0.22, s * 0.13), v3(-0.1, -0.22, s * 0.13)], 0.012, MAT.dsteel, 12); g.add(sk);
    for (const x of [0.25, -0.02]) g.add(bar(v3(x, -0.21, s * 0.13), v3(x + 0.02, -0.1, s * 0.06), 0.009, MAT.dsteel)); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { rotor, tr, disc, update(t) { rotor.rotation.y = t * 28; tr.rotation.z = t * 70; } };
  return g;
}
// ---------------------------------------------------------------- dron cuadricóptero (ancho ≈ 0,6) con hélices que giran y luces
function makeDrone() {
  const g = new THREE.Group(), dk = paint(0x2a2e36, 0.35), props = [];
  const body = rbox(0.18, 0.07, 0.26, dk, 0.03); g.add(body);
  const top = rbox(0.12, 0.03, 0.18, paint(0x3c424e, 0.3), 0.012); top.position.y = 0.045; g.add(top);
  const pm = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.5, metalness: 0.2 });
  for (const [x, z] of [[0.18, 0.22], [-0.18, 0.22], [0.18, -0.22], [-0.18, -0.22]]) {
    g.add(bar(v3(0, 0, 0), v3(x, 0.01, z), 0.014, dk));
    const mo = cyl(0.028, 0.028, 0.04, MAT.dsteel, 20); mo.position.set(x, 0.03, z); g.add(mo);
    const p = new THREE.Group(); p.position.set(x, 0.055, z); g.add(p); props.push(p);
    for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.022), pm); b.rotation.y = i * Math.PI; b.position.x = i ? -0.1 : 0.1; p.add(b); }
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshBasicMaterial({ color: 0xaab4c8, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide })); d.rotation.x = -Math.PI / 2; p.add(d);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: x > 0 ? new THREE.Color(0.2, 2.5, 0.4) : new THREE.Color(2.5, 0.15, 0.1), toneMapped: false })); led.position.set(x, -0.005, z); g.add(led);
  }
  const gim = sph(0.04, MAT.black, 16, 12); gim.position.set(0.1, -0.05, 0); g.add(gim); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), MAT.glass); lens.position.set(0.14, -0.05, 0); lens.rotation.y = Math.PI / 2; g.add(lens);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { props, update(t) { props.forEach((p, i) => { p.rotation.y = t * 60 * (i % 2 ? 1 : -1); }); } };
  return g;
}
// ---------------------------------------------------------------- cohete de dos etapas (alto 1, a lo largo de +y): primera etapa con 9 toberas, interetapa, segunda etapa y cofia que se abre en dos
function makeRocket() {
  const g = new THREE.Group(), R = 0.038, white = paint(0xf3f4f6, 0.35, 0.5), black = paint(0x101114, 0.4, 0.5);
  const s1 = new THREE.Group(); g.add(s1);
  const t1 = cyl(R, R, 0.6, white, 40); t1.position.y = 0.32; s1.add(t1);
  const band = cyl(R * 1.004, R * 1.004, 0.035, black, 40); band.position.y = 0.58; s1.add(band);
  const skirt = cyl(R * 1.02, R * 1.06, 0.03, black, 40); skirt.position.y = 0.025; s1.add(skirt);
  const bell = (r, h) => lathe([[r * 0.35, 0], [r * 0.4, h * 0.3], [r * 0.7, h * 0.75], [r, h]].map(([a, b]) => [a, -b]), 24, new THREE.MeshStandardMaterial({ color: 0x2a2523, roughness: 0.45, metalness: 0.8, side: THREE.DoubleSide }));
  s1.add(Object.assign(bell(0.012, 0.03), {})); for (let i = 0; i < 8; i++) { const b = bell(0.0105, 0.026); b.position.set(Math.cos(i / 8 * 6.283) * 0.024, 0.008, Math.sin(i / 8 * 6.283) * 0.024); s1.add(b); }
  for (let i = 0; i < 4; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.004), MAT.dsteel); const a = i / 4 * Math.PI * 2 + Math.PI / 4; fin.position.set(Math.cos(a) * (R + 0.015), 0.55, Math.sin(a) * (R + 0.015)); fin.rotation.y = -a; s1.add(fin); }
  const up = new THREE.Group(); up.position.y = 0.62; g.add(up);
  const inter = cyl(R, R, 0.06, black, 40); inter.position.y = 0.03; up.add(inter);
  const t2 = cyl(R, R, 0.2, white, 40); t2.position.y = 0.16; up.add(t2);
  const mv = bell(0.022, 0.05); mv.position.y = 0.0; up.add(mv); mv.visible = false; up.userData.mv = mv;
  const fair = [], prof = [[R * 1.02, 0], [R * 1.08, 0.04], [R * 1.08, 0.1], [R * 0.85, 0.15], [R * 0.45, 0.19], [0.002, 0.205]];
  for (let k = 0; k < 2; k++) { const f = lathe(prof, 24, white, k * Math.PI, Math.PI); f.material = white; f.position.y = 0.26; const p = new THREE.Group(); p.add(f); up.add(p); fair.push(p); }
  const pay = new THREE.Group(); pay.position.y = 0.3; up.add(pay);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { s1, up, fair, pay, R };
  return g;
}
// ---------------------------------------------------------------- satélite: cuerpo con manta térmica dorada, paneles solares que se despliegan en acordeón, antena parabólica
const MLI = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c8952e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const x = hash(i * 1.3) * w, y = hash(i * 2.7) * h, l = 30 + hash(i * 3.1) * 90, a = hash(i * 4.3) * Math.PI; g.strokeStyle = `rgba(${hash(i) > 0.5 ? '255,226,150' : '120,80,20'},${0.25 + hash(i * 5.9) * 0.35})`; g.lineWidth = 1 + hash(i * 7.1) * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } });
const CELLS = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#0d1a3a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(190,200,220,.55)'; g.lineWidth = 2;
  for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  for (let x = 0; x < w; x += 32) for (let y = 0; y < h; y += 32) { const gr = g.createLinearGradient(x, y, x + 32, y + 32); gr.addColorStop(0, 'rgba(60,90,170,.5)'); gr.addColorStop(1, 'rgba(10,20,50,0)'); g.fillStyle = gr; g.fillRect(x + 2, y + 2, 28, 28); } });
function makeSat() {
  const g = new THREE.Group(), mli = new THREE.MeshStandardMaterial({ map: MLI, roughness: 0.35, metalness: 0.85, color: 0xffffff });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), mli); body.castShadow = true; g.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.02, 0.31), metal(0xd8dce2, 0.3)); top.position.y = 0.17; g.add(top);
  const dish = lathe([[0.001, 0], [0.06, 0.008], [0.12, 0.03], [0.15, 0.05]], 40, new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide })); dish.position.set(0, 0.2, 0); dish.rotation.x = 0.4; g.add(dish);
  g.add(bar(v3(0, 0.18, 0), v3(0, 0.27, 0.04), 0.006, MAT.steel));
  const pm = new THREE.MeshStandardMaterial({ map: CELLS, roughness: 0.25, metalness: 0.6, side: THREE.DoubleSide }), wings = [];
  for (const s of [1, -1]) {
    const arm = bar(v3(s * 0.15, 0, 0), v3(s * 0.26, 0, 0), 0.008, MAT.steel); g.add(arm);
    const root = new THREE.Group(); root.position.set(s * 0.26, 0, 0); g.add(root); const panels = [];
    let parent = root;
    for (let k = 0; k < 3; k++) { const hinge = new THREE.Group(); hinge.position.x = k === 0 ? 0 : s * 0.36; parent.add(hinge);
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.006, 0.26), pm); p.position.x = s * 0.18; p.castShadow = true; hinge.add(p); panels.push(hinge); parent = hinge; }
    wings.push({ root, panels, s });
  }
  for (const [x, z] of [[0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13]]) { const n = cyl(0.004, 0.012, 0.02, MAT.dsteel, 10); n.position.set(x, -0.17, z); g.add(n); }
  g.userData = { wings, deploy(k) { wings.forEach(w => { const s = w.s; w.panels.forEach((h, i) => { const kk = clamp(k * 1.4 - i * 0.2); h.rotation.y = 0; h.rotation.z = i === 0 ? s * (1 - kk) * 1.45 : (i % 2 ? -1 : 1) * s * (1 - kk) * 2.9; }); }); } };
  g.userData.deploy(1);
  return g;
}
// ---------------------------------------------------------------- 0 · el graduado (sobre una plataforma flotando sobre las nubes): birrete → avión de papel → avión → alas que no llegan;
// «¿qué te falta?»; y la respuesta (el máster) al final. Zona local como en «Industrial»: el graduado mira hacia +x local (= +z del mundo).
const GRADP = v3(0, 0, 0);
function buildGrad() {
  const Z = new THREE.Group(); Z.position.copy(GRADP); Z.rotation.y = -Math.PI / 2; scene.add(Z); S.gradZ = Z;
  const ped = cyl(0.95, 1.0, 0.22, plastic(0x161a24, 0.3), 64); ped.position.y = 0.11; Z.add(ped); S.ped = ped;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.975, 0.018, 8, 96), glowM(0x47d6ff, 3)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.1; ped.add(rim);
  const under = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.6, 64, 1, true), plastic(0x10131b, 0.4)); under.rotation.x = Math.PI; under.position.y = -0.3; Z.add(under);
  // graduado: maniquí blanco con toga azul marino y estola amarilla (como en «Industrial»)
  const body = plastic(0xf1f3f7, 0.18), d = makeDoll(body); d.scale.setScalar(1.6); d.position.y = 0.22; d.rotation.y = Math.PI / 2; Z.add(d); S.grad = d;
  const gown = new THREE.Mesh(new THREE.LatheGeometry([v3(0.001, 0.88, 0), v3(0.1, 0.875, 0), v3(0.155, 0.84, 0), v3(0.17, 0.7, 0), v3(0.19, 0.4, 0), v3(0.23, 0.1, 0), v3(0.245, 0.04, 0), v3(0.001, 0.04, 0)].reverse().map(p => new THREE.Vector2(p.x, p.y)), 48), plastic(PL.navy, 0.24));
  gown.castShadow = true; d.add(gown);
  for (const s of [-1, 1]) { const st = rbox(0.05, 0.36, 0.012, plastic(PL.yellow, 0.2), 0.01); st.position.set(s * 0.055, 0.68, 0.135); st.rotation.x = 0.12; d.add(st); }
  const J = d.userData.J;
  for (const sd of ['shL', 'shR', 'elL', 'elR']) J[sd].children.forEach(o => { if (o.isMesh) o.material = plastic(PL.navy, 0.24); });
  S.dip = diploma(); S.dip.scale.setScalar(0.9); J.hR.add(S.dip); S.dip.position.set(0, -0.02, 0.02);
  S.bir = birrete(); S.bir.scale.setScalar(0.34); Z.add(S.bir);
  S.paper = makePaperPlane(); S.paper.scale.setScalar(0.42); scene.add(S.paper);
  S.badge = makeBadge(); S.badge.scale.setScalar(0.3); Z.add(S.badge);
  S.flashS = sparks(Z, 90, 0xfff0b0, 0.07);
  S.conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.05, 0.03), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.4, metalness: 0.3 }), 240);
  S.conf.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(240 * 3), 3); S.conf.frustumCulled = false; Z.add(S.conf);
  for (let i = 0; i < 240; i++) S.conf.setColorAt(i, _c.set([PL.yellow, PL.pink, PL.sky, PL.green, PL.orange, 0xffffff][i % 6]));
  S.bar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 8, 64), new THREE.MeshBasicMaterial({ color: 0xff3b4e, transparent: true, toneMapped: false })); Z.add(S.bar);
  S.barX = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (q, w, h) => { q.strokeStyle = '#ff4d5e'; q.lineWidth = 46; q.lineCap = 'round'; q.beginPath(); q.moveTo(50, 50); q.lineTo(206, 206); q.moveTo(206, 50); q.lineTo(50, 206); q.stroke(); }), transparent: true, depthWrite: false, toneMapped: false })); S.barX.renderOrder = 9; Z.add(S.barX);
  S.q = qmark(new THREE.MeshPhysicalMaterial({ color: 0xffc21a, emissive: 0xff9a00, emissiveIntensity: 0.55, roughness: 0.2, clearcoat: 1 })); S.q.scale.setScalar(0.5); Z.add(S.q);
  S.mblock = rbox(0.62, 0.2, 0.2, plastic(PL.yellow, 0.18), 0.05); Z.add(S.mblock);
  const mf = facePlane(canvasTex(512, 160, (q, w, h) => { q.fillStyle = '#10131a'; q.font = '900 104px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('MÁSTER', w / 2, h / 2 + 6); }), 0.56, 0.175); mf.position.z = 0.101; S.mblock.add(mf);
  const mb = mf.clone(); mb.position.z = -0.101; mb.rotation.y = Math.PI; S.mblock.add(mb);
  S.badgeMaster = BADGE_TXT('MÁSTER', '#ffc35a'); S.badgeQ = S.badge.userData.mt.material.map;
  S.wave = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false })); S.wave.rotation.x = -Math.PI / 2; S.wave.position.y = 0.03; Z.add(S.wave);
  // sello «profesión regulada»
  const seal = new THREE.Group(); Z.add(seal); S.seal = seal;
  const sd2 = cyl(0.42, 0.42, 0.08, MAT.gold, 48); sd2.rotation.x = Math.PI / 2; seal.add(sd2);
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, tk = rbox(0.07, 0.07, 0.07, MAT.gold, 0.02); tk.position.set(Math.cos(a) * 0.43, Math.sin(a) * 0.43, 0); tk.rotation.z = a + Math.PI / 4; seal.add(tk); }
  const sf = facePlane(canvasTex(512, 512, (q, w, h) => { q.fillStyle = '#8a5a12'; q.beginPath(); q.arc(256, 256, 214, 0, 7); q.lineWidth = 14; q.strokeStyle = '#8a5a12'; q.stroke();
    q.font = '900 170px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('★', 256, 250); }), 0.8, 0.8); sf.position.z = 0.045; seal.add(sf);
  for (const s of [-1, 1]) { const rb = rbox(0.14, 0.5, 0.02, plastic(PL.red, 0.25), 0.01); rb.position.set(s * 0.14, -0.5, -0.02); rb.rotation.z = s * 0.25; seal.add(rb); }
  S.sealL = pill('PROFESIÓN REGULADA', '#ffd76a', 'rgba(16,20,30,.9)', 1.25, 64); Z.add(S.sealL);
  // candado y llave (grado + máster = la llave que habilita)
  const lock = new THREE.Group(); Z.add(lock); S.lock = lock;
  const lb = rbox(0.56, 0.5, 0.22, plastic(0x2a2f3a, 0.25), 0.07); lock.add(lb);
  const kh = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), new THREE.MeshBasicMaterial({ color: 0x050608 })); kh.position.set(0, 0.03, 0.111); lock.add(kh);
  const kh2 = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.1), kh.material); kh2.position.set(0, -0.04, 0.111); lock.add(kh2);
  S.shackle = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 14, 40, Math.PI), MAT.steel); S.shackle.position.y = 0.25; lock.add(S.shackle);
  for (const s of [-1, 1]) { const leg = cyl(0.045, 0.045, 0.12, MAT.steel, 16); leg.position.set(s * 0.17, -0.06, 0); S.shackle.add(leg); }
  S.keyG = new THREE.Group(); Z.add(S.keyG);
  const halfK = (txt, col, w) => { const b = rbox(w, 0.16, 0.12, plastic(col, 0.2), 0.04); const f = facePlane(canvasTex(512, 140, (q, ww, hh) => { q.fillStyle = '#ffffff'; q.font = '900 92px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(txt, ww / 2, hh / 2 + 4); }), w * 0.92, 0.135); f.position.z = 0.061; b.add(f); return b; };
  S.kGrado = halfK('GRADO', PL.blue, 0.5); S.keyG.add(S.kGrado);
  S.kMaster = halfK('MÁSTER', PL.yellow, 0.5); S.keyG.add(S.kMaster);
  S.kBit = new THREE.Group(); S.keyG.add(S.kBit);
  const shaft = cyl(0.03, 0.03, 0.34, MAT.gold, 16); shaft.rotation.z = Math.PI / 2; shaft.position.x = 0.17; S.kBit.add(shaft);
  for (const x of [0.22, 0.3]) { const tooth = rbox(0.04, 0.09, 0.04, MAT.gold, 0.01); tooth.position.set(x, -0.05, 0); S.kBit.add(tooth); }
  S.tecL = pill2('CON EL GRADO', 'INGENIERO TÉCNICO AERONÁUTICO', '#9fd0ff', 1.0); Z.add(S.tecL);
  S.ingL = pill2('CON EL MÁSTER HABILITANTE', 'INGENIERO AERONÁUTICO', '#ffd76a', 0.86); Z.add(S.ingL);
  S.years = []; for (let i = 0; i < 6; i++) { const c = rbox(0.3, 0.3, 0.3, plastic(i < 4 ? PL.blue : PL.yellow, 0.18), 0.06); Z.add(c); S.years.push(c);
    const f = facePlane(canvasTex(256, 256, (q, w, h) => { q.fillStyle = '#ffffff'; q.font = '900 150px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(String(i + 1), w / 2, h / 2 + 8); }), 0.24, 0.24); f.position.z = 0.151; c.add(f);
    const f2 = f.clone(); f2.rotation.y = Math.PI / 2; f2.position.set(0.151, 0, 0); c.add(f2); }
  S.yGr = pill('GRADO · 4 AÑOS', '#9fd0ff', 'rgba(16,20,30,.9)', 1.0, 62); Z.add(S.yGr);
  S.yMa = pill('MÁSTER · 2', '#ffd76a', 'rgba(16,20,30,.9)', 0.8, 62); Z.add(S.yMa);
  S.ySix = pill('6 AÑOS', '#ffffff', 'rgba(255,170,30,.92)', 0.8, 74); Z.add(S.ySix);
  const bm = new THREE.Shape(); bm.moveTo(-0.22, 0.34); bm.lineTo(0.22, 0.34); bm.lineTo(0.22, -0.34); bm.lineTo(0, -0.17); bm.lineTo(-0.22, -0.34); bm.closePath();
  S.bmark = new THREE.Mesh(new THREE.ExtrudeGeometry(bm, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 4 }), plastic(PL.yellow, 0.18)); S.bmark.geometry.center(); S.bmark.castShadow = true; Z.add(S.bmark);
  const bub = new THREE.Shape(); { const w = 0.8, h = 0.5, r = 0.18; bub.moveTo(-w / 2 + r, -h / 2); bub.lineTo(-0.05, -h / 2); bub.lineTo(-0.2, -h / 2 - 0.18); bub.lineTo(-0.2, -h / 2); bub.lineTo(-w / 2 + r, -h / 2);
    bub.quadraticCurveTo(-w / 2, -h / 2, -w / 2, -h / 2 + r); bub.lineTo(-w / 2, h / 2 - r); bub.quadraticCurveTo(-w / 2, h / 2, -w / 2 + r, h / 2); bub.lineTo(w / 2 - r, h / 2); bub.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - r); bub.lineTo(w / 2, -h / 2 + r); bub.quadraticCurveTo(w / 2, -h / 2, w / 2 - r, -h / 2); bub.lineTo(-0.05, -h / 2); }
  S.bubble = new THREE.Mesh(new THREE.ExtrudeGeometry(bub, { depth: 0.06, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 4 }), plastic(0xffffff, 0.2)); S.bubble.castShadow = true; Z.add(S.bubble);
  S.dots = [0, 1, 2].map(i => { const s = sph(0.05, plastic(PL.blue, 0.2)); s.position.set(-0.2 + i * 0.2, 0, 0.1); S.bubble.add(s); return s; });
  // el avión del gancho: nace del avión de papel y se va (y luego se convierte en las alas)
  S.hookJet = makeJet(); S.hookJet.scale.setScalar(2.4); scene.add(S.hookJet);
}
const ZL = (x, y, z) => S.gradZ.localToWorld(v3(x, y, z));      // local de la zona → mundo
const CHEST = v3(0.27, 1.5, 0), HOVER = v3(0.64, 1.6, 0);        // alas puestas (sobre el pecho) y flotando a un palmo delante
const BIR0 = v3(0, 3.3, 0);
// oscilaciones «de bucle»: frecuencia redondeada para que en t = END estén igual que en t = 0 (el último fotograma enlaza con el primero)
const lfreq = f => 2 * Math.PI * Math.max(1, Math.round(f * END / (2 * Math.PI))) / END, lsin = (t, f) => Math.sin(t * lfreq(f));
function birSpin(t) { return t * lfreq(2.6); }
// trayectoria del avión de papel → avión de verdad (mundo): sale del birrete, cruza delante de la cámara y se aleja sobre las nubes
function hookPath(t) {
  const T = [K.aero0 - 0.2, K.aero0 + 0.28, K.aero0 + 0.62, K.acabas + 0.15, K.acabas + 0.75], P = [ZL(0, 3.3, 0), v3(1.3, 3.46, -0.55), v3(4.0, 3.72, -2.9), v3(9.2, 4.3, -10.2), v3(12, 4.8, -18)];
  const x = mono(t, T, P.map(p => p.x)), y = mono(t, T, P.map(p => p.y)), z = mono(t, T, P.map(p => p.z));
  return v3(x, y, z);
}
function gradAt(t) {
  const Z = S.gradZ, J = S.grad.userData.J, tEnd = END, tToss = K.te2 + 0.12;
  const tLand = K.master1 + 0.42, up = env(t, -1, K.y1 + 0.2, 0.01, 0.5), cheer = env(t, tLand, K.regulada + 0.3, 0.12, 0.5), toss = env(t, K.guardalo + 0.1, tEnd + 1, 0.4, 0.01), look = env(t, K.para14 - 0.3, K.si3 + 0.2, 0.4, 0.4);
  J.shR.rotation.z = lerp(0.18, 2.75, Math.max(up, cheer)); J.elR.rotation.z = 0.25 * Math.max(up, cheer);
  J.shL.rotation.z = -lerp(0.18, 2.6, Math.max(up * 0.85, cheer));
  J.shL.rotation.x = -1.0 * toss * (t < tToss + 0.25 ? 1 : 1 - clamp((t - tToss - 0.25) / 0.4)) - (t > tToss && t < tToss + 0.3 ? 1.2 * Math.sin((t - tToss) / 0.3 * Math.PI) : 0);
  J.elL.rotation.x = -0.9 * toss;
  J.neck.rotation.z = 0.12 * up - 0.18 * env(t, K.y1, K.al1, 0.3, 0.3) + 0.55 * look;
  S.grad.updateMatrixWorld(true); const handL = new THREE.Vector3(); J.hL.getWorldPosition(handL); Z.worldToLocal(handL);
  // ---- birrete → avión de papel (gancho) y birrete lanzado al final (bucle)
  const morph = clamp((t - (K.aero0 - 0.15)) / 0.4), endFly = t > K.guardalo + 0.2;
  let bk = 0;
  if (t < K.aero0 + 0.3) { bk = 1 - sm5(clamp((morph - 0.2) / 0.45)); const sq = Math.sin(clamp(morph / 0.5) * Math.PI) * 0.45;
    S.bir.position.copy(BIR0).add(v3(0, 0.05 * lsin(t, 3), 0)); S.bir.rotation.set(0.35 + 0.15 * lsin(t, 2.2), birSpin(t), 0.2 * lsin(t, 1.7)); S.bir.scale.set(0.34 * (1 + sq) * bk, 0.34 * (1 - sq * 1.2) * bk + 0.0001, 0.34 * (1 + sq) * bk);
  } else if (endFly) {
    const u = clamp((t - tToss) / (tEnd - tToss)), e = sm5(u), hand = handL.clone().add(v3(0.05, 0.06, 0));
    bk = clamp((t - K.guardalo - 0.2) / 0.25);
    const p = hand.clone().lerp(BIR0.clone().add(v3(0, 0.05 * lsin(t, 3), 0)), e); p.y += 0.5 * Math.sin(Math.PI * e) * (1 - e);
    S.bir.position.copy(t < tToss ? hand.clone().add(v3(0, 0.03 * Math.sin(t * 4), 0)) : p);
    const spinEnd = birSpin(t) - (1 - e) * 6.0;
    S.bir.rotation.set(t < tToss ? 0.2 : lerp(0.2, 0.35 + 0.15 * lsin(t, 2.2), e), t < tToss ? 0.4 : spinEnd + (1 - e) * 6.0, t < tToss ? 0 : 0.2 * lsin(t, 1.7) * e);
    S.bir.scale.setScalar(0.34 * Math.max(0.001, bk));
  }
  S.bir.visible = bk > 0.003;
  // ---- avión de papel → avión de verdad → alas
  const pk = sm5(clamp((morph - 0.25) / 0.4)), tJet = K.aero0 + 0.42, jk = clamp((t - tJet) / 0.3);
  const hp = hookPath(t), hd = hookPath(t + 0.02).sub(hookPath(t - 0.02)).normalize();
  S.paper.visible = pk > 0.01 && jk < 1; if (S.paper.visible) { S.paper.position.copy(hp); S.paper.quaternion.setFromUnitVectors(v3(1, 0, 0), hd); S.paper.rotateX(0.5 * Math.sin(t * 6)); S.paper.scale.setScalar(0.42 * pk * (1 - jk) + 0.0001); }
  const jv = jk > 0.001 && t < K.acabas + 0.35; S.hookJet.visible = jv;
  if (jv) { S.hookJet.position.copy(hp); S.hookJet.quaternion.setFromUnitVectors(v3(1, 0, 0), hd); S.hookJet.rotateX(-0.45 * Math.sin(clamp((t - tJet) / 1.2) * Math.PI)); S.hookJet.scale.setScalar(2.4 * Math.max(0.0001, eo(jk))); S.hookJet.userData.update(t, { halo: 0.06 }); }
  // ---- alas: vuelan desde el avión, bajan hacia el pecho… y se quedan a un palmo (barrera); con el máster, encajan
  const tIn = K.acabas + 0.25, bb = pop(t, tIn, 0.45);
  let bp = HOVER.clone(), bs = bb, brx = 0, brz = 0;
  if (t < K.y1 + 0.3) { const u = sm5(clamp((t - tIn) / (K.y1 + 0.3 - tIn))); bp = Z.worldToLocal(hookPath(K.acabas + 0.3)).lerp(HOVER.clone().add(v3(0, 0.6, 0)), u); }
  else { const u = clamp((t - (K.y1 + 0.3)) / (K.no1 + 0.08 - (K.y1 + 0.3))); bp = HOVER.clone().add(v3(0, 0.6, 0)).lerp(HOVER, sm5(u));
    const b1 = Math.max(0, t - (K.no1 + 0.08)), b2 = Math.max(0, t - (K.aero1 + 0.02));
    bp.y += 0.12 * Math.exp(-b1 * 7) * Math.abs(Math.sin(b1 * 16)) * (b1 > 0 ? 1 : 0) + 0.08 * Math.exp(-b2 * 7) * Math.abs(Math.sin(b2 * 16)) * (b2 > 0 ? 1 : 0);
    brz = 0.08 * Math.sin(t * 5.2) * Math.exp(-Math.max(0, t - K.no1) * 0.6) + 0.025 * Math.sin(t * 2.3); brx = 0.04 * Math.sin(t * 3.7); }
  if (t > tLand - 0.22) { const u = clamp((t - (tLand - 0.22)) / 0.22); bp = bp.clone().lerp(CHEST, u * u); brz *= 1 - u; brx *= 1 - u; if (t > tLand) { const q = t - tLand; bs = 1 + 0.12 * Math.exp(-q * 9) * Math.sin(q * 30); } }
  if (t > tLand) { bp = CHEST.clone(); brx = 0; brz = 0; }
  S.badge.position.copy(bp); S.badge.rotation.set(brx, Math.PI / 2 + (t < tIn + 0.4 ? (1 - clamp((t - tIn) / 0.4)) * 6.0 : 0), brz); S.badge.scale.setScalar(0.3 * Math.max(0.0001, bs));
  S.badge.visible = t > tIn;
  S.badge.userData.mt.material.map = t > K.master1 + 0.3 ? S.badgeMaster : S.badgeQ;
  // chispas: nace el avión, y cuando encajan las alas
  if (t > tJet - 0.05 && t < tJet + 0.8) { S.flashS.visible = true; burst(S.flashS, Z.worldToLocal(hookPath(tJet)), t, tJet, 0.9, 0.7, false, 1.2); S.flashS.material.opacity = clamp(1 - (t - tJet) / 0.7); }
  else if (t > tLand - 0.05 && t < tLand + 0.9) { S.flashS.visible = true; burst(S.flashS, CHEST.clone().add(v3(0.1, 0.05, 0)), t, tLand, 1.0, 0.8, false, 2.5); S.flashS.material.opacity = clamp(1 - (t - tLand) / 0.8); }
  else S.flashS.visible = false;
  // ---- barrera: anillo rojo y ✕ al chocar
  const hit = Math.max(Math.exp(-Math.max(0, t - K.no1 - 0.08) * 5) * (t > K.no1 + 0.08 ? 1 : 0), Math.exp(-Math.max(0, t - K.aero1) * 5) * (t > K.aero1 ? 1 : 0)) * (t < tLand - 0.3 ? 1 : 0);
  S.bar.visible = hit > 0.02; S.bar.position.copy(HOVER).add(v3(-0.12, 0, 0)); S.bar.rotation.set(0, 0, Math.PI / 2); S.bar.scale.setScalar(0.9 + (1 - hit) * 0.6); S.bar.material.opacity = hit; S.bar.material.color.setRGB(2.4, 0.35, 0.45);
  lookLab(S.barX, hit * 1.2, HOVER.clone().add(v3(-0.05, -0.28, 0.0))); S.barX.scale.setScalar(0.8 + 0.4 * hit);
  // ---- interrogación en el hueco; el bloque «MÁSTER» sale de ella y entra en las alas
  const gap = CHEST.clone().lerp(HOVER, 0.5).add(v3(0.06, -0.06, 0));
  const qk = pop(t, K.que1, 0.4) * (1 - clamp((t - K.master1 - 0.02) / 0.12));
  S.q.visible = qk > 0.01; S.q.position.copy(gap); S.q.rotation.y = 0.3 * Math.sin(t * 1.4) + Math.PI / 2 + 0.45; S.q.scale.setScalar(Math.max(0.0001, qk * 0.5));
  const mk = pop(t, K.master1, 0.3) * (1 - clamp((t - (K.master1 + 0.38)) / 0.08)), mu = sm5(clamp((t - (K.master1 + 0.22)) / 0.18));
  S.mblock.visible = mk > 0.01; S.mblock.scale.setScalar(Math.max(0.001, mk) * 0.45); S.mblock.position.copy(gap.clone().lerp(HOVER, mu)); S.mblock.rotation.set(0, Math.PI / 2 + 0.2 * (1 - mu), 0);
  // ---- confeti (gancho, aterrizaje y final)
  const cA = env(t, -1, K.al1 + 0.6, 0.01, 0.6), cB = env(t, tLand, K.regulada + 0.8, 0.05, 0.6), cC = env(t, K.cuentame - 0.3, tEnd - 0.35, 0.4, 0.5);
  const ck = Math.max(cA * 0.0, cB, cC); S.conf.visible = ck > 0.01;
  if (S.conf.visible) for (let i = 0; i < 240; i++) {
    const base = i < 120 ? 0 : tLand, life = 3.2, tt = ((t - base) + hash(i) * life) % life, x = (hash(i * 3) - 0.5) * 3.2, z = (hash(i * 5) - 0.5) * 3.2;
    _p.set(x + 0.2 * Math.sin(tt * 2 + i), 4.4 - tt * 1.25, z + 0.2 * Math.cos(tt * 1.7 + i));
    _e.set(tt * 4 + i, tt * 3 + i * 0.7, tt * 2); _q.setFromEuler(_e); _s.setScalar(ck * (0.7 + hash(i * 7) * 0.8)); _m4.compose(_p, _q, _s); S.conf.setMatrixAt(i, _m4);
  }
  S.conf.instanceMatrix.needsUpdate = true;
  const wv = clamp((t - tLand) / 0.9); S.wave.visible = t > tLand && wv < 1; S.wave.scale.setScalar(1 + wv * 3.5); S.wave.material.opacity = (1 - wv) * 0.9; S.wave.material.color.setRGB(1.4, 2.2, 2.6);
  // ---- sello, candado y llave, títulos, años, marcapáginas y bocadillo
  const sk = pop(t, K.profesion, 0.32) * (1 - clamp((t - (K.grado - 0.25)) / 0.3));
  show(S.seal, sk * 0.42); S.seal.position.set(0.8, 2.5 + 0.7 * (1 - eo(clamp((t - K.profesion) / 0.2))), 0.0); S.seal.rotation.set(0, Math.PI / 2 - 0.3, 0);
  lookLab(S.sealL, env(t, K.regulada, K.grado - 0.15, 0.2, 0.3), v3(0.95, 2.13, 0.0)); S.sealL.scale.setScalar(0.62);
  const lk = pop(t, K.grado - 0.1, 0.32) * (1 - clamp((t - (K.en13 - 0.1)) / 0.3));
  show(S.lock, lk * 0.5); S.lock.position.set(1.0, 1.1, -0.2); S.lock.rotation.set(0, Math.PI / 2 - 0.3, 0);
  const open = sm5(clamp((t - K.habilitante - 0.12) / 0.25)); S.shackle.position.y = 0.25 + 0.14 * open; S.shackle.rotation.y = 1.2 * open;
  const g1 = pop(t, K.grado, 0.3), m1 = pop(t, K.master2, 0.3), join = sm5(clamp((t - (K.master2 + 0.15)) / 0.25)), ins = sm5(clamp((t - (K.habilitante - 0.25)) / 0.3));
  S.keyG.visible = g1 > 0.01 && t < K.en13 + 0.1; S.keyG.rotation.order = 'YXZ'; S.keyG.scale.setScalar(0.45); S.keyG.position.set(1.0, 1.1, lerp(0.5, 0.3, ins)); S.keyG.rotation.set(Math.PI / 2 * clamp((t - K.habilitante) / 0.18), Math.PI / 2, 0);
  S.kGrado.scale.setScalar(Math.max(0.001, g1)); S.kGrado.position.set(lerp(-0.42, -0.26, join), 0, 0);
  S.kMaster.scale.setScalar(Math.max(0.001, m1)); S.kMaster.position.set(lerp(0.42, 0.26, join), lerp(0.25, 0, join), 0);
  S.kBit.visible = join > 0.5; S.kBit.position.x = 0.5; S.kBit.scale.setScalar(Math.max(0.001, clamp((join - 0.5) * 2)));
  lookLab(S.tecL, env(t, K.grado + 0.25, K.para13 - 0.05, 0.25, 0.25), v3(1.15, 0.66, 0.0)); S.tecL.scale.setScalar(0.62);
  lookLab(S.ingL, env(t, K.ingeniero13b - 0.1, K.en13 - 0.1, 0.25, 0.25), v3(1.15, 0.66, 0.0)); S.ingL.scale.setScalar(0.62);
  const yr = [K.y4, K.y4 + 0.09, K.y4 + 0.18, K.y4 + 0.27, K.dos - 0.04, K.dos + 0.06], six = sm5(clamp((t - K.seis) / 0.45));
  S.years.forEach((c, i) => { const k = pop(t, yr[i], 0.3) * (t < K.si3 ? 1 : 1 - clamp((t - K.si3) / 0.3));
    const row = v3(1.18, 0.31 + i * 0.125, 0.5 - i * 0.2), ring = v3(Math.cos(i / 6 * Math.PI * 2 + t * 0.6) * 1.15, 0.35 + 0.08 * Math.sin(t * 2 + i), Math.sin(i / 6 * Math.PI * 2 + t * 0.6) * 1.15);
    c.visible = k > 0.01; c.scale.setScalar(Math.max(0.001, k) * lerp(0.55, 0.62, six)); c.position.copy(row.lerp(ring, six)); c.position.y += Math.sin(Math.PI * six) * 0.5; c.rotation.set(0, Math.PI / 2 - 0.3 + six * (i / 6 * Math.PI * 2), 0); });
  lookLab(S.yGr, env(t, K.y4 + 0.2, K.seis - 0.05, 0.2, 0.2), v3(1.25, 0.78, 0.05)); S.yGr.scale.setScalar(0.62);
  lookLab(S.yMa, env(t, K.dos + 0.1, K.seis - 0.05, 0.2, 0.2), v3(1.25, 1.2, -0.45)); S.yMa.scale.setScalar(0.62);
  lookLab(S.ySix, env(t, K.seis + 0.25, K.para14 + 0.4, 0.2, 0.3), v3(1.05, 1.18, 0.28)); S.ySix.scale.setScalar(0.85 + 0.15 * pop(t, K.seis + 0.25, 0.3));
  const bmk = pop(t, K.guardalo, 0.35) * (1 - clamp((t - K.te2) / 0.3));
  show(S.bmark, bmk * 0.42); S.bmark.position.set(0.9, 1.95 + 0.5 * (1 - clamp((t - K.guardalo) / 0.25)), -0.2); S.bmark.rotation.set(0, Math.PI / 2 - 0.3, 0.12 * Math.sin(t * 3));
  const bbk = pop(t, K.cuentame, 0.35) * (1 - clamp((t - K.te2 - 0.25) / 0.3));
  show(S.bubble, bbk * 0.5); S.bubble.position.set(0.8, 2.42, 0.32); S.bubble.rotation.set(0, Math.PI / 2 - 0.3, 0);
  S.dots.forEach((s, i) => { s.position.y = 0.05 * Math.max(0, Math.sin(t * 9 - i * 0.9)); });
}
// ---------------------------------------------------------------- 1 · la nota: el avión sale del mar de nubes y sube a su velocidad de verdad (la cámara va con él);
// a su lado vuela un altímetro holográfico (cinta de 0 a 14, 1 m por punto) que se queda en 12,484
const TAPE_Y = CLOUD_Y + 0.5, CL_Z = -2.2, CL_T0 = 6.9, CL_X0 = 2.0, CL_VX = 6.2;    // ≈ 2 largos por segundo, como un avión de verdad
function buildClimb() {
  const G = new THREE.Group(); scene.add(G); S.tower = G;
  const holo = c => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.6), transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false });
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.035, 14.6, 0.01), holo(0x8fdcff)); spine.position.y = 7.2; G.add(spine);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 14.6), new THREE.MeshBasicMaterial({ color: 0x0a2a44, transparent: true, opacity: 0.28, depthWrite: false })); glass.position.set(0.3, 7.2, -0.01); G.add(glass);
  for (let v = 0; v <= 14; v += 0.25) { const major = Math.abs(v - Math.round(v)) < 0.01, half = !major && Math.abs(v * 2 - Math.round(v * 2)) < 0.01;
    const tk = new THREE.Mesh(new THREE.BoxGeometry(major ? 0.34 : half ? 0.2 : 0.1, major ? 0.022 : 0.012, 0.01), holo(0xd8f2ff)); tk.position.set((major ? 0.34 : half ? 0.2 : 0.1) / 2, v, 0); G.add(tk);
    if (major) { const l = label(String(v), { size: 90, w: 0.36, color: '#dff4ff', weight: 800, font: 'SpaceMono' }); l.position.set(0.62, v, 0); l.material.opacity = 0.95; G.add(l); } }
  S.mark = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.0, 0.5), toneMapped: false })); S.mark.position.set(0.1, 12.484, 0.01); G.add(S.mark);
  S.top14 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 10, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 2.2, 3.0), transparent: true, toneMapped: false })); S.top14.position.set(0, 14, 0.01); G.add(S.top14);
  S.climbJet = makeJet({ stripe: '#c8102e', stripe2: '#f2b233', tail: 0xc8102e }); S.climbJet.scale.setScalar(2.8); scene.add(S.climbJet);
  S.climbTrail = [0, 1].map(i => buildJet({ n: 1300, len: 9, rad: 0.03, spread: 0.3, speed: 0.55, size: 1.25, bright: 0.5, kind: 2, seed: 20 + i, turb: 0.25 }));
  // nubes justo donde el avión rompe el mar de nubes (sale de ellas)
  S.climbPuffs = puffCloud(26, i => { const a = hash(i * 1.7) * Math.PI * 2, r = 0.4 + hash(i * 2.3) * 1.9; return [6.75 + Math.cos(a) * r * 1.3, CLOUD_Y + 0.15 + hash(i * 2.9) * 0.5, CL_Z + Math.sin(a) * r, 0.75 + hash(i * 4.1) * 0.85, 0.9]; }, { seed: 7, lit: 0xffe6d2, sh: 0x5d6a92 }); PUFFS.push(S.climbPuffs);
}
function climbY(t) { return keyed(t, [[CL_T0, CLOUD_Y - 2.4], [K.politecnica - 0.25, CLOUD_Y + 0.6], [K.un3 + 0.15, TAPE_Y + 8.9], [K.nota + 1.05, TAPE_Y + 12.484], [K.asi4 + 1.5, TAPE_Y + 12.484]]) + 0.05 * Math.sin(t * 0.8) * win(t, K.nota + 1.05, 1); }
function climbPos(t) { return v3(CL_X0 + CL_VX * (t - CL_T0), climbY(t), CL_Z); }
const NOTA = t => t > K.nota + 1.05 ? 12.484 : clamp(climbY(t) - TAPE_Y, 0, 12.484);      // lo que marca el altímetro (se queda en la nota)
const climbLook = t => { const p = climbPos(t); p.y = Math.max(p.y, CLOUD_Y + 0.9); return p; };   // antes de salir de las nubes, se mira al sitio por donde va a salir
function jetPose(J, p, d, bank = 0) { J.position.copy(p); _m4.lookAt(v3(0, 0, 0), d.clone().negate(), v3(0, 1, 0)); J.quaternion.setFromRotationMatrix(_m4); J.rotateY(-Math.PI / 2); J.rotateX(bank); }
function climbAt(t) {
  const on = t > CL_T0 && t < K.asi4 + 0.6; S.climbJet.visible = on; const tk = env(t, K.politecnica - 0.5, K.crees + 0.9, 0.4, 0.4); S.tower.visible = tk > 0.01;
  S.climbPuffs.visible = t > CL_T0 && t < K.crees;
  if (!on) { S.climbTrail.forEach(J => { J.u.power.value = 0; }); return; }
  const p = climbPos(t), d = climbPos(t + 0.03).sub(climbPos(t - 0.03)).normalize();
  jetPose(S.climbJet, p, d, 0.06 * Math.sin(t * 0.9));
  S.climbJet.userData.update(t, { flex: 0.14 + 0.03 * Math.sin(t * 3.1), land: t < K.politecnica + 0.8, halo: 0.07 });
  S.climbJet.updateWorldMatrix(true, false);
  S.climbTrail.forEach((J, i) => { const e = S.climbJet.localToWorld(S.climbJet.userData.exh[i].clone()); jetAt(J, e, d.clone().negate(), win(t, K.politecnica + 0.3, 0.6)); });
  // la cinta vuela al lado del avión (por delante, hacia la cámara): se mueve con él en horizontal, no en vertical → los números bajan al subir
  S.tower.position.set(p.x + 0.95, TAPE_Y, CL_Z + 1.05); S.tower.scale.set(1, 1, 1); S.tower.children.forEach(c => { if (c.material) c.material.opacity = (c.userData.op0 ?? (c.userData.op0 = c.material.opacity)) * tk; });
  const mk = pop(t, K.nota + 0.1, 0.4); S.mark.scale.set(Math.max(0.001, mk), 1, 1);
  const k14 = pop(t, K.sobre, 0.3); S.top14.visible = k14 > 0.01; S.top14.scale.setScalar(Math.max(0.001, k14) * (1 + 0.15 * Math.sin(t * 8))); S.top14.material.opacity = clamp(k14) * tk;
}
// ---------------------------------------------------------------- 2 · «todo lo que vuela»: alrededor del avión llegan volando un helicóptero (desde atrás), un dron (desde abajo),
// un cohete que despega entre las nubes y un satélite que cruza alto; todos van con el avión (la cámara también), el mundo pasa por debajo
function buildFamily() {
  S.heli = makeHeli(); S.heli.scale.setScalar(1.3); scene.add(S.heli);
  S.drone = makeDrone(); S.drone.scale.setScalar(1.6); scene.add(S.drone);
  S.rocket = makeRocket(); S.rocket.scale.setScalar(5); scene.add(S.rocket);
  S.rocketJet = buildJet({ n: 2600, len: 6.5, rad: 0.14, spread: 1.6, speed: 1.6, size: 1.2, bright: 1.3, seed: 3 });
  S.sat = makeSat(); S.sat.scale.setScalar(1.5); scene.add(S.sat);
}
// sitio de cada uno respecto al avión (x adelante, y arriba, z hacia la cámara) y por dónde entra
const FAM = { heli: v3(-0.7, 2.25, 1.1), heli0: v3(-7.5, 3.4, 2.0), drone: v3(0.45, -0.75, 3.4), drone0: v3(3.6, -4.2, 4.2), sat: v3(0.5, 4.7, -4.5), sat0: v3(-6.5, 8.5, -7) };
const ROCKET = { x: 0, z: -19, t0: 0 };
function rocketLift(t, t0) { const u = Math.max(0, t - t0); return 2.6 * u * u + 1.2 * u; }
function famSlot(t, t0, d, a, b) { const u = clamp((t - t0) / d), e = 1 - Math.pow(1 - u, 3); return { p: a.clone().lerp(b, e), v: b.clone().sub(a).multiplyScalar(3 * Math.pow(1 - u, 2) / d), u }; }
function familyAt(t) {
  const on = t > K.va4 - 0.4 && t < K.asi4 + 0.6; S.heli.visible = S.drone.visible = S.sat.visible = on;
  const tr = K.lo4 - 0.55, ron = t > tr && t < K.asi4 + 0.7; S.rocket.visible = ron;
  const J = climbPos(t);
  if (on) {
    // helicóptero: llega desde atrás más rápido que el avión y frena (morro arriba al frenar), luego vuela a su lado
    const h = famSlot(t, K.va4 - 0.35, 0.9, FAM.heli0, FAM.heli); S.heli.position.copy(J).add(h.p).add(v3(0.06 * Math.sin(t * 1.3), 0.05 * Math.sin(t * 1.7), 0));
    S.heli.rotation.set(0.04 * Math.sin(t * 1.1), 0.05 * Math.sin(t * 0.6), 0.22 * clamp(h.v.length() / 9) - 0.12); S.heli.userData.update(t);
    // dron: sube desde abajo a la derecha, se inclina hacia donde va y se endereza
    const dr = famSlot(t, K.todo4 - 0.3, 0.75, FAM.drone0, FAM.drone); S.drone.position.copy(J).add(dr.p).add(v3(0.04 * Math.sin(t * 2.1), 0.04 * Math.sin(t * 3.3), 0.03 * Math.cos(t * 1.7)));
    S.drone.rotation.set(-0.05 * dr.v.z, -0.4, -0.06 * dr.v.x - 0.12); S.drone.userData.update(t);
    // satélite: cruza alto y despliega los paneles
    const sa = famSlot(t, K.vuela4 - 0.35, 1.0, FAM.sat0, FAM.sat); S.sat.position.copy(J).add(sa.p); S.sat.rotation.set(0.35, 0.6 + t * 0.2, 0.25); S.sat.userData.deploy(clamp((t - K.vuela4 + 0.1) / 0.7));
  }
  // cohete: despega desde debajo de las nubes, lejos (no va con el avión: se queda atrás en la imagen)
  if (ron) { const x0 = climbPos(t).x + 2.4, y = CLOUD_Y - 3.0 + rocketLift(t, tr); S.rocket.position.set(x0, y, ROCKET.z); S.rocket.rotation.set(0, 0, -0.03 * Math.max(0, t - tr));
    S.rocket.updateWorldMatrix(true, false); const noz = S.rocket.localToWorld(v3(0, 0, 0)), dn = S.rocket.localToWorld(v3(0, -1, 0)).sub(noz).normalize(); jetAt(S.rocketJet, noz, dn, clamp((t - tr) / 0.2)); }
  else S.rocketJet.u.power.value = 0;
}
// ---------------------------------------------------------------- 3 · por dentro: el fuselaje en construcción (cuadernas, larguerillos, ventanillas con luz) y los bloques de la base
const TUN = v3(30, 4, 0), TUNR = 1.15, TUNL = 14;
function buildTunnel() {
  const G = new THREE.Group(); G.position.copy(TUN); scene.add(G); S.tunnel = G;
  const al = new THREE.MeshStandardMaterial({ color: 0x9aa3ae, roughness: 0.38, metalness: 0.9 }), prim = new THREE.MeshStandardMaterial({ color: 0x5f8a5a, roughness: 0.5, metalness: 0.5 });
  for (let i = 0; i <= 22; i++) { const x = -TUNL / 2 + i * TUNL / 22, f = new THREE.Mesh(new THREE.TorusGeometry(TUNR - 0.04, 0.045, 6, 64), i % 3 ? al : prim); f.rotation.y = Math.PI / 2; f.position.x = x; f.scale.set(1, 1.04, 1); G.add(f);
    const fb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 2 * TUNR * 0.93), al); fb.position.set(x, -0.42, 0); G.add(fb); }
  for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2, s = new THREE.Mesh(new THREE.BoxGeometry(TUNL, 0.03, 0.03), al); s.position.set(0, Math.cos(a) * (TUNR - 0.07) * 1.04, Math.sin(a) * (TUNR - 0.07)); s.rotation.x = a; G.add(s); }
  for (let k = 0; k < 6; k++) { const rail = new THREE.Mesh(new THREE.BoxGeometry(TUNL, 0.02, 0.05), al); rail.position.set(0, -0.37, -0.75 + k * 0.3); G.add(rail); }
  // piel interior con las ventanillas encendidas (la luz del amanecer entra por ellas)
  const skinT = canvasTex(2048, 512, (g, w, h) => { g.fillStyle = '#3a4048'; g.fillRect(0, 0, w, h);
    for (let x = 30; x < w; x += 46) for (const y of [h * 0.31, h * 0.69]) { const gr = g.createLinearGradient(0, y - 22, 0, y + 22); gr.addColorStop(0, '#fff2d8'); gr.addColorStop(1, '#ffb27a'); g.fillStyle = gr; rr(g, x - 10, y - 20, 20, 40, 9); g.fill(); } });
  const skin = new THREE.Mesh(new THREE.CylinderGeometry(TUNR, TUNR, TUNL, 64, 1, true), new THREE.MeshStandardMaterial({ map: skinT, emissiveMap: skinT, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.6, metalness: 0.4, side: THREE.BackSide }));
  skin.rotation.z = Math.PI / 2; skin.scale.set(1, 1, 1.04); G.add(skin);
  // bloques (como en «Industrial»): ∫ cálculo, matriz álgebra, manzana física, molécula química, avión en tres vistas dibujo técnico
  const face = (draw, bg) => canvasTex(512, 512, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; draw(g, w, h); });
  const tex = [
    face((g, w, h) => { g.font = '700 300px serif'; g.fillText('∫', w * 0.42, h * 0.5); g.font = '700 110px Inter'; g.fillText('dx', w * 0.7, h * 0.62); }, '#2f7cf0'),
    face((g, w, h) => { g.font = '700 70px SpaceMono'; ['[ 2 0 1 ]', '[ 1 3 0 ]', '[ 0 1 4 ]'].forEach((s, i) => g.fillText(s, w / 2, h * (0.33 + i * 0.17))); }, '#7d55f0'),
    face((g, w, h) => { g.beginPath(); g.arc(w * 0.42, h * 0.45, 80, 0, 7); g.fill(); g.fillRect(w * 0.41, h * 0.22, 16, 50); g.font = '700 70px Inter'; g.fillText('F = m·a', w / 2, h * 0.8); g.lineWidth = 14; g.beginPath(); g.moveTo(w * 0.72, h * 0.25); g.lineTo(w * 0.72, h * 0.6); g.stroke(); g.beginPath(); g.moveTo(w * 0.66, h * 0.52); g.lineTo(w * 0.72, h * 0.62); g.lineTo(w * 0.78, h * 0.52); g.stroke(); }, '#18b878'),
    face((g, w, h) => { g.lineWidth = 12; const P = [[0.5, 0.3], [0.3, 0.6], [0.7, 0.6], [0.5, 0.8]]; g.beginPath(); g.moveTo(w * P[0][0], h * P[0][1]); g.lineTo(w * P[1][0], h * P[1][1]); g.moveTo(w * P[0][0], h * P[0][1]); g.lineTo(w * P[2][0], h * P[2][1]); g.moveTo(w * P[1][0], h * P[1][1]); g.lineTo(w * P[3][0], h * P[3][1]); g.stroke(); P.forEach(([x, y]) => { g.beginPath(); g.arc(w * x, h * y, 38, 0, 7); g.fill(); }); g.font = '700 60px Inter'; g.fillText('H₂O + CO₂', w / 2, h * 0.14); }, '#f07a2a'),
    face((g, w, h) => { g.lineWidth = 6; g.strokeStyle = '#1b2a4a'; g.fillStyle = '#1b2a4a'; g.strokeRect(30, 30, w - 60, h - 60); g.beginPath(); g.moveTo(w * 0.15, h * 0.3); g.lineTo(w * 0.85, h * 0.3); g.moveTo(w * 0.5, h * 0.2); g.lineTo(w * 0.42, h * 0.3); g.lineTo(w * 0.2, h * 0.36); g.moveTo(w * 0.5, h * 0.2); g.lineTo(w * 0.58, h * 0.3); g.lineTo(w * 0.8, h * 0.36); g.stroke();
      g.beginPath(); g.moveTo(w * 0.5, h * 0.48); g.lineTo(w * 0.5, h * 0.9); g.moveTo(w * 0.22, h * 0.66); g.lineTo(w * 0.78, h * 0.66); g.moveTo(w * 0.38, h * 0.85); g.lineTo(w * 0.62, h * 0.85); g.stroke(); g.font = '700 40px SpaceMono'; g.fillText('A-A', w * 0.82, h * 0.88); }, '#f1f3f6'),
  ];
  S.blocks = tex.map((tx, i) => { const b = rbox(0.42, 0.42, 0.42, plastic([0x2f7cf0, 0x7d55f0, 0x18b878, 0xf07a2a, 0xe8ebf0][i], 0.18), 0.07); const m = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.3 });
    for (const [x, y, z, ry, rx] of [[0, 0, 0.212, 0, 0], [0.212, 0, 0, Math.PI / 2, 0], [-0.212, 0, 0, -Math.PI / 2, 0], [0, 0, -0.212, Math.PI, 0]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), m); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); b.add(p); }
    G.add(b); return b; });
}
// la cámara recorre el fuselaje de −x a +x a ≈ 2,5 m/s; cada bloque sale (sube del suelo) unos 2 m por delante de ella al oír su palabra
const TUN_X0 = -6.4, TUN_V = 2.75;
const tunCamX = t => TUN_X0 + TUN_V * (t - (K.asi4 + 0.25));
function tunnelAt(t) {
  const on = t > K.asi4 + 0.2 && t < K.aerod + 0.5; S.tunnel.visible = on; if (!on) return;
  const ws = [K.calculo, K.algebra, K.fisica, K.quimica, K.dibujo];
  S.blocks.forEach((b, i) => { const t0 = ws[i] - 0.12, k = pop(t, t0, 0.42), x = tunCamX(t0) + 2.7, sd = i % 2 ? 1 : -1;
    b.visible = k > 0.01; b.scale.setScalar(Math.max(0.001, k) * 0.86); b.position.set(x, lerp(-0.6, -0.08, eo(clamp((t - t0) / 0.35))) + 0.03 * Math.sin(t * 2 + i), sd * 0.24);
    b.rotation.set(0.1 * Math.sin(t * 1.3 + i), -Math.PI / 2 + sd * 0.55 + 0.25 * Math.sin(t * 0.8 + i), 0.06 * Math.sin(t * 1.1 + i)); });
}
// ---------------------------------------------------------------- 4 · túnel de viento: perfil de Joukowski con flujo potencial de verdad (líneas de corriente, más rápido por arriba) y mapa de presiones
const AER = v3(44, 3.6, 0), AFC = 1.3;      // centro y cuerda (m)
function joukowski() {     // círculo ζ (centro c, radio R) → perfil z = ζ + 1/ζ; flujo a 7° con circulación de Kutta
  const cx = -0.09, cy = 0.09, R = Math.hypot(1 - cx, cy), al = 7 * Math.PI / 180, beta = Math.asin(cy / R), Gam = 4 * Math.PI * R * Math.sin(al + beta);
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const csqrt = a => { const r = Math.hypot(a[0], a[1]), th = Math.atan2(a[1], a[0]) / 2; return [Math.sqrt(r) * Math.cos(th), Math.sqrt(r) * Math.sin(th)]; };
  const zeta = z => { const s = csqrt([z[0] * z[0] - z[1] * z[1] - 4, 2 * z[0] * z[1]]); const a = [(z[0] + s[0]) / 2, (z[1] + s[1]) / 2], b = [(z[0] - s[0]) / 2, (z[1] - s[1]) / 2]; return Math.hypot(a[0] - cx, a[1] - cy) >= Math.hypot(b[0] - cx, b[1] - cy) ? a : b; };
  const vel = z => { const zt = zeta(z), q = [zt[0] - cx, zt[1] - cy], e1 = [Math.cos(al), -Math.sin(al)], e2 = [Math.cos(al), Math.sin(al)];
    const q2 = cmul(q, q); let dw = [e1[0], e1[1]]; const t2 = cdiv([R * R * e2[0], R * R * e2[1]], q2); dw = [dw[0] - t2[0], dw[1] - t2[1]];
    const t3 = cdiv([0, Gam / (2 * Math.PI)], q); dw = [dw[0] + t3[0], dw[1] + t3[1]];
    const dz = [1 - cdiv([1, 0], cmul(zt, zt))[0], -cdiv([1, 0], cmul(zt, zt))[1]], v = cdiv(dw, dz); return [v[0], -v[1]]; };
  const shape = []; for (let i = 0; i <= 120; i++) { const th = i / 120 * Math.PI * 2, zt = [cx + R * Math.cos(th), cy + R * Math.sin(th)], d = zt[0] * zt[0] + zt[1] * zt[1]; shape.push([zt[0] + zt[0] / d, zt[1] - zt[1] / d]); }
  let xmin = 1e9, xmax = -1e9; shape.forEach(p => { xmin = Math.min(xmin, p[0]); xmax = Math.max(xmax, p[0]); });
  return { vel, shape, xmin, xmax, chord: xmax - xmin, mid: (xmin + xmax) / 2 };
}
function buildAero() {
  const G = new THREE.Group(); G.position.copy(AER); scene.add(G); S.aero = G;
  const JK = joukowski(), k = AFC / JK.chord, toL = p => [(p[0] - JK.mid) * k, p[1] * k];
  // el perfil extruido (ala del túnel)
  const sh = new THREE.Shape(); JK.shape.forEach((p, i) => { const q = toL(p); i ? sh.lineTo(q[0], q[1]) : sh.moveTo(q[0], q[1]); });
  const ag = new THREE.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: false, curveSegments: 4 }); ag.translate(0, 0, -0.6);
  const af = new THREE.Mesh(ag, new THREE.MeshPhysicalMaterial({ color: 0xd9dde3, roughness: 0.22, metalness: 0.85, clearcoat: 0.5 })); af.castShadow = true; G.add(af);
  // sección de ensayo: suelo y techo, pared del fondo (con el mapa de presiones), cristal delante, aristas de metal y el peine que suelta el humo
  const frm = metal(0x3a4250, 0.4), slab = new THREE.MeshStandardMaterial({ color: 0x1a1f28, roughness: 0.55, metalness: 0.4 });
  for (const y of [-1.0, 1.0]) { const b = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.45), slab); b.position.set(0, y, 0); b.receiveShadow = true; G.add(b); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.94), new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.7 })); back.position.z = -0.68; G.add(back);
  for (const y of [-0.96, 0.96]) for (const z of [-0.7, 0.7]) { const b = new THREE.Mesh(new THREE.BoxGeometry(3.62, 0.05, 0.05), frm); b.position.set(0, y, z); G.add(b); }
  for (const x of [-1.8, 1.8]) for (const z of [-0.7, 0.7]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.97, 0.05), frm); b.position.set(x, 0, z); G.add(b); }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.94), new THREE.MeshPhysicalMaterial({ color: 0xcfe2ff, transparent: true, opacity: 0.07, roughness: 0.04, metalness: 0, clearcoat: 1, depthWrite: false })); glass.position.z = 0.7; glass.renderOrder = 8; G.add(glass);
  const rake = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.7, 0.06), frm); rake.position.set(-1.72, 0.0, 0.62); G.add(rake);
  // mapa de presiones (Cp = 1 − (V/U)²) en la pared del fondo: azul = baja presión (arriba), rojo = alta (abajo)
  const PW = 3.5, PH = 1.85, NX = 280, NY = 148;
  const cp = canvasTex(NX, NY, (g, w, h) => { const img = g.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const X = (i / w - 0.5) * PW / k + JK.mid, Y = (0.5 - j / h) * PH / k; let r = 40, gg = 50, b = 80, a = 255;
      const zz = [X, Y]; const zt = (() => { try { return 1; } catch (e) { return 0; } })();
      const v = JK.vel(zz), V2 = v[0] * v[0] + v[1] * v[1], c = clamp(1 - V2, -2.2, 1);
      const u = c < 0 ? -c / 2.2 : 0, p = c > 0 ? c : 0; r = Math.round(30 + 225 * p + 20 * u); gg = Math.round(40 + 120 * u * (1 - u) * 2 + 60 * p * (1 - p)); b = Math.round(60 + 195 * u); img.data.set([r, gg, b, a], (j * w + i) * 4); }
    g.putImageData(img, 0, 0); });
  cp.colorSpace = THREE.SRGBColorSpace;
  S.cpM = new THREE.MeshBasicMaterial({ map: cp, transparent: true, opacity: 0, toneMapped: true }); const cpl = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), S.cpM); cpl.position.z = -0.66; G.add(cpl);
  // líneas de corriente integradas (RK2) desde la izquierda; cada una guarda su tiempo de recorrido (las partículas van más rápido donde el flujo es más rápido)
  const lines = [];
  for (let s = 0; s < 30; s++) { const y0 = -0.82 + s * 1.64 / 29; let z = [(-1.8 / k) + JK.mid, y0 / k]; const pts = [], ts = [0]; let T = 0;
    for (let n = 0; n < 900; n++) { const q = toL(z); pts.push(v3(q[0], q[1], 0.62)); if (q[0] > 1.8) break;
      const v = JK.vel(z), sp = Math.hypot(v[0], v[1]) || 1e-6, dt = Math.min(0.012 / sp, 0.04); const zm = [z[0] + v[0] * dt * 0.5, z[1] + v[1] * dt * 0.5], vm = JK.vel(zm); z = [z[0] + vm[0] * dt, z[1] + vm[1] * dt]; T += dt; ts.push(T); }
    ts.length = pts.length; T = ts[ts.length - 1]; lines.push({ pts, ts, T }); }      // (una línea que no llega a salir se queda con lo recorrido)
  S.stream = { lines, n: 34 }; S.streamSeg = segSet(lines.length * 34, 0xf2f8ff, 2.6, 0.95); G.add(S.streamSeg);
  S.streamFull = lines.map(L => { const l = drawLine(L.pts.filter((_, i) => i % 3 === 0 || i === L.pts.length - 1), 0xbcd6f0, 1.4, 0); G.add(l); return l; });      // la línea entera, tenue (el «camino» del humo)
  lines.forEach(L => { const nz = cyl(0.012, 0.012, 0.08, frm, 8); nz.rotation.z = Math.PI / 2; nz.position.set(-1.68, L.pts[0].y, 0.62); G.add(nz); });
  // el avión de pasajeros encima del túnel, con su peso y su sustentación
  S.aeroJet = makeJet({ stripe: '#0f7b6c', stripe2: '#f2b233', tail: 0x0f7b6c }); S.aeroJet.scale.setScalar(2.6); S.aeroJet.rotation.y = Math.PI - 0.55; G.add(S.aeroJet);    // morro hacia −x: el viento del túnel le viene de frente
  S.wArrow = arrow3(1, plastic(0xff4b5c, 0.25), 0.04); S.wArrow.rotation.x = Math.PI; G.add(S.wArrow);
  S.lArrow = [1, -1].map(s => { const a = arrow3(1, plastic(0x38c8ff, 0.25), 0.035); G.add(a); return a; });
}
function aeroAt(t) {
  const on = t > K.aerod - 0.4 && t < K.estructuras + 0.5; S.aero.visible = on; if (!on) return;
  const fk = clamp((t - (K.aerod - 0.2)) / 0.5); S.cpM.opacity = 0.9 * win(t, K.aerod + 0.25, 0.5);
  const st = S.stream, seg = S.streamSeg.userData; let k = 0;
  st.lines.forEach((L, li) => { for (let j = 0; j < st.n; j++) {
    const tau = ((t * 0.55 + j / st.n * L.T + hash(li * 7.3) * L.T) % L.T), tau2 = Math.max(0, tau - 0.085);
    const at = tt => { let i = 1; while (i < L.ts.length - 1 && L.ts[i] < tt) i++; const f = (tt - L.ts[i - 1]) / Math.max(1e-9, L.ts[i] - L.ts[i - 1]); return L.pts[i - 1].clone().lerp(L.pts[i], clamp(f)); };
    const a = at(tau2), b = at(tau); if (fk < 1 && a.x > -1.8 + 3.6 * fk) { a.copy(b); } seg.set(k++, a, b); } });
  seg.flush(); S.streamSeg.material.opacity = 0.95 * fk; S.streamFull.forEach(l => { l.material.opacity = 0.2 * fk; drawK(l, fk); });
  // el avión entra volando desde la derecha (de frente al viento), frena y se queda encima del túnel balanceándose en el aire
  const ja = K.avion6 - 0.45, ju = clamp((t - ja) / 0.75), je = 1 - Math.pow(1 - ju, 3); S.aeroJet.visible = t > ja;
  S.aeroJet.position.set(lerp(4.6, 0.25, je), 1.9 + 0.05 * Math.sin(t * 1.3) + 0.35 * (1 - je), -0.75); S.aeroJet.rotation.set(0.08 * Math.sin(t * 0.9) + 0.25 * (1 - je), Math.PI - 0.55, 0.03 * Math.sin(t * 1.4));
  S.aeroJet.userData.update(t, { flex: 0.1 + 0.15 * win(t, K.sostiene, 0.5), halo: 0.07 });
  const wk = win(t, K.toneladas - 0.1, 0.45), lk = win(t, K.sostiene - 0.05, 0.5); S.aeroJet.updateWorldMatrix(true, false);
  const cg = S.aeroJet.position.clone().add(v3(0, -0.04, 0)), wing = s => S.aeroJet.localToWorld(v3(-0.1, 0.0, s * 0.25)).sub(S.aero.position);
  S.wArrow.visible = wk > 0.01; S.wArrow.position.copy(cg); S.wArrow.userData.setLen(1.25 * wk);
  S.lArrow.forEach((a, i) => { a.visible = lk > 0.01; a.position.copy(wing(i ? -1 : 1)); a.userData.setLen(0.95 * lk * (1 + 0.04 * Math.sin(t * 7 + i))); });
}
// ---------------------------------------------------------------- 5 · ensayo del ala: se dobla (colores de tensión) sin romperse; zoom a la piel: fibra de carbono por capas
const WNG = v3(55, 2.2, 0), WSPAN = 5.2, WSW = 0.52, WDH = 0.06;
const wChord = e => lerp(2.1, 0.5, e);
// punto del extradós a la fracción e de la envergadura y c de la cuerda (local del banco: envergadura en +x, cuerda hacia +z), con la flexión fl
const wTop = (e, c, fl) => v3(e * WSPAN, e * WSPAN * Math.tan(WDH) + 0.075 * wChord(e) + fl * e * e * WSPAN * 0.34, e * WSPAN * Math.tan(WSW) + c * wChord(e));
const WEAVE = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#0b0c0e'; g.fillRect(0, 0, w, h); const n = 16, s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const over = ((i + j) % 4) < 2, x = i * s, y = j * s, gr = over ? g.createLinearGradient(x, y, x + s, y) : g.createLinearGradient(x, y, x, y + s);
    gr.addColorStop(0, '#1a1c20'); gr.addColorStop(0.5, over ? '#4a4f58' : '#3a3e46'); gr.addColorStop(1, '#16181b'); g.fillStyle = gr; g.fillRect(x + 1, y + 1, s - 2, s - 2); } });
WEAVE.wrapS = WEAVE.wrapT = THREE.RepeatWrapping;
function buildWing() {
  const G = new THREE.Group(); G.position.copy(WNG); scene.add(G); S.wingRig = G;
  const wall = rbox(1.2, 4.2, 3.8, new THREE.MeshStandardMaterial({ color: 0x5b5f66, roughness: 0.85 }), 0.05); wall.position.set(-0.65, 0.4, 1.1); G.add(wall);
  for (let i = 0; i < 6; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4.2, 0.12), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xf2c230 : 0x16181c, roughness: 0.6 })); st.position.set(-0.03, 0.4, 2.35 + i * 0.12); G.add(st); }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.75, metalness: 0.2 })); deck.position.set(3, -1.7, 1.2); deck.receiveShadow = true; G.add(deck);
  const wm = flexMat(new THREE.MeshPhysicalMaterial({ color: 0xc9ced6, roughness: 0.4, metalness: 0.35, clearcoat: 0.6 }), WSPAN);
  S.bigWing = new THREE.Mesh(wingGeo({ cr: 2.1, ct: 0.5, span: WSPAN, sweep: WSW, dih: WDH, tcR: 0.13, tcT: 0.1, twist: 0.05, nS: 30 }), wm); S.bigWing.rotation.y = Math.PI / 2; S.bigWing.castShadow = true; S.bigWing.receiveShadow = true; G.add(S.bigWing); S.bigWingM = wm;
  // 4 actuadores hidráulicos desde el suelo que empujan el ala hacia arriba (encima no hay nada: la punta se ve subir)
  const rodM = metal(0x8d96a2, 0.35), cylM = plastic(0xffc21a, 0.3);
  S.jacks = [0.35, 0.55, 0.75, 0.92].map(e => { const base = cyl(0.12, 0.14, 0.12, MAT.dsteel, 20); G.add(base); const c = cyl(0.075, 0.075, 1.0, cylM, 20); G.add(c); const r = cyl(0.035, 0.035, 1, rodM, 12); G.add(r);
    const pad = rbox(0.34, 0.05, 0.3, MAT.rubber, 0.02); G.add(pad); return { e, r, c, pad, base }; });
  // muestra de fibra de carbono: 4 capas (0°, 45°, 90°, −45°) que salen de la piel del ala y se separan
  S.plies = [0, 45, 90, -45].map((ang, i) => { const t2 = WEAVE.clone(); t2.needsUpdate = true; t2.wrapS = t2.wrapT = THREE.RepeatWrapping; t2.repeat.set(2, 2); t2.rotation = ang * Math.PI / 180; t2.center.set(0.5, 0.5);
    const m = new THREE.MeshPhysicalMaterial({ map: t2, color: 0xffffff, roughness: 0.32, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.012, 0.6), m); p.castShadow = true; G.add(p); return p; });
}
function wingAt(t) {
  const on = t > K.estructuras - 0.4 && t < K.propulsion + 0.5; S.wingRig.visible = on; if (!on) return;
  const fl = 0.82 * win(t, K.alas - 0.05, 0.9) * (1 + 0.03 * Math.sin(t * 6) * win(t, K.sin7, 0.2)), u = S.bigWingM.userData.u;
  u.uFlex.value = fl; u.uStress.value = win(t, K.alas + 0.1, 0.4) * (1 - win(t, K.fibra - 0.2, 0.4));
  S.jacks.forEach(J => { const p = wTop(J.e, 0.45, fl).add(v3(0, -0.16 * wChord(J.e), 0)), fy = -1.64; J.base.position.set(p.x, fy + 0.06, p.z); J.c.position.set(p.x, fy + 0.62, p.z); J.r.position.set(p.x, (p.y + fy + 1.0) / 2, p.z); J.r.scale.y = Math.max(0.01, p.y - (fy + 1.0)); J.pad.position.copy(p).add(v3(0, -0.03, 0)); });
  const pk = win(t, K.fibra - 0.12, 0.5), pk2 = win(t, K.carbono - 0.1, 0.6), base = wTop(0.25, 0.42, fl);
  S.plies.forEach((p, i) => { p.visible = pk > 0.01; p.position.copy(base).add(v3(0, 0.02 + i * (0.014 + 0.15 * pk2) + 0.06 * pk, 0)); p.rotation.set(0.04, -0.12 + (i - 1.5) * 0.09 * pk2, 0.07); p.scale.setScalar(Math.max(0.001, pk)); });
}
// ---------------------------------------------------------------- 6 · propulsión: turbofán que se abre en corte (fan, compresor, cámara de combustión, turbina) y tobera de cohete encendida
const ENG = v3(68, 2.4, 0), RKE = v3(75, 3.2, -0.6);
function ring(nb, r0, r1, chord, m, twist = 0.6) {
  const geo = new THREE.BoxGeometry(0.014, r1 - r0, chord), im = new THREE.InstancedMesh(geo, m, nb);
  for (let i = 0; i < nb; i++) { const a = i / nb * Math.PI * 2; _q.setFromEuler(_e.set(a, 0, 0)); _q2.setFromEuler(_e.set(0, twist, 0)); _q.multiply(_q2);
    _p.set(0, Math.cos(a) * (r0 + r1) / 2, Math.sin(a) * (r0 + r1) / 2); _m4.compose(_p, _q, _s.set(1, 1, 1)); im.setMatrixAt(i, _m4); }
  im.castShadow = true; return im;
}
function buildEngine() {
  const G = new THREE.Group(); G.position.copy(ENG); G.rotation.y = -0.35; scene.add(G); S.engine = G;
  const E = new THREE.Group(); E.scale.setScalar(0.95); G.add(E);
  const ti = new THREE.MeshStandardMaterial({ color: 0xa7adb6, roughness: 0.25, metalness: 1 }), hot = new THREE.MeshStandardMaterial({ color: 0x8a6a5a, roughness: 0.35, metalness: 1, emissive: 0xff5a1a, emissiveIntensity: 0 });
  const cowlM = new THREE.MeshPhysicalMaterial({ color: 0xeef1f4, roughness: 0.28, metalness: 0.1, clearcoat: 1, side: THREE.DoubleSide });
  const prof = [[0.94, 0.25], [1.03, 0.2], [1.08, 0.05], [1.1, -0.4], [1.06, -1.2], [0.96, -1.65], [0.9, -1.62], [0.95, -0.4], [0.97, 0.15], [0.94, 0.25]].map(([r, x]) => [r, -x]);
  const hinged = (mesh, y) => { const h = new THREE.Group(); h.position.set(0, y, 0); mesh.position.set(0, -y, 0); h.add(mesh); E.add(h); return h; };
  S.cowl = [0, 1].map(k => { const c = lathe(prof, 48, cowlM, -Math.PI / 2 + k * Math.PI, Math.PI); c.rotation.z = Math.PI / 2; return hinged(c, 1.12); });   // mitad 0 = la de la cámara (+z)
  S.fanR = new THREE.Group(); E.add(S.fanR); S.lowR = new THREE.Group(); E.add(S.lowR); S.highR = new THREE.Group(); E.add(S.highR);
  const fan = ring(24, 0.16, 0.95, 0.32, ti, 0.75); S.fanR.add(fan);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 40), new THREE.MeshStandardMaterial({ map: SWIRL, roughness: 0.3, metalness: 0.6 })); sp.rotation.z = -Math.PI / 2; sp.position.x = 0.22; S.fanR.add(sp);
  for (let s = 0; s < 3; s++) { const r = ring(40, 0.2, 0.52 - s * 0.03, 0.08, ti, 0.5); r.position.x = -0.32 - s * 0.12; S.lowR.add(r); }
  for (let s = 0; s < 8; s++) { const r = ring(48, 0.18, 0.34 - s * 0.012, 0.05, ti, 0.45); r.position.x = -0.78 - s * 0.075; S.highR.add(r); }
  S.comb = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.07, 16, 48), new THREE.MeshStandardMaterial({ color: 0x3a2a22, emissive: 0xff6a1a, emissiveIntensity: 0, roughness: 0.4, metalness: 0.6 })); S.comb.rotation.y = Math.PI / 2; S.comb.position.x = -1.48; E.add(S.comb);
  for (let s = 0; s < 2; s++) { const r = ring(44, 0.2, 0.37, 0.06, hot, 0.5); r.position.x = -1.65 - s * 0.09; S.highR.add(r); }
  for (let s = 0; s < 5; s++) { const r = ring(56, 0.24, 0.42 + s * 0.03, 0.07, ti, 0.55); r.position.x = -1.9 - s * 0.11; S.lowR.add(r); }
  S.hotM = hot;
  const core = [[0.55, -0.25], [0.4, -0.75], [0.37, -1.4], [0.42, -1.7], [0.52, -2.4], [0.45, -2.75]].map(([r, x]) => [r, -x]);
  S.coreC = [0, 1].map(k => { const c = lathe(core, 40, new THREE.MeshStandardMaterial({ color: 0x5a616b, roughness: 0.45, metalness: 0.9, side: THREE.DoubleSide }), -Math.PI / 2 + k * Math.PI, Math.PI); c.rotation.z = Math.PI / 2; return hinged(c, 0.56); });
  const plug = lathe([[0.2, 2.3], [0.17, 2.7], [0.02, 3.0]].map(([r, x]) => [r, x]), 32, metal(0x7a808a, 0.35)); plug.rotation.z = Math.PI / 2; E.add(plug);
  S.engJet = buildJet({ n: 1400, len: 3.5, rad: 0.3, spread: 0.7, speed: 2.6, size: 0.6, bright: 0.45, kind: 1, seed: 5, turb: 0.6 });
  // motor cohete en el banco de pruebas, disparando hacia abajo (entre las nubes)
  const R2 = new THREE.Group(); R2.position.copy(RKE); scene.add(R2); S.rke = R2;
  const tubes = canvasTex(512, 64, (g, w, h) => { for (let x = 0; x < w; x += 8) { const gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, '#3a2014'); gr.addColorStop(0.5, '#c27a4a'); gr.addColorStop(1, '#3a2014'); g.fillStyle = gr; g.fillRect(x, 0, 8, h); } });
  tubes.wrapS = THREE.RepeatWrapping; tubes.repeat.set(2, 1);
  const bellProf = []; for (let i = 0; i <= 24; i++) { const u = i / 24; bellProf.push([0.22 + 0.68 * Math.pow(u, 0.62), -0.45 - u * 1.6]); }
  S.bellM = new THREE.MeshStandardMaterial({ map: tubes, roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide, emissive: 0xff4a10, emissiveIntensity: 0 });
  const bell = lathe([[0.3, 0.1], [0.32, -0.25], [0.22, -0.45], ...bellProf], 48, S.bellM); R2.add(bell);
  const dome = sph(0.32, metal(0x8a8f98, 0.3), 24, 12); dome.scale.y = 0.6; dome.position.y = 0.1; R2.add(dome);
  const tp = cyl(0.14, 0.14, 0.5, metal(0x6a707a, 0.35), 24); tp.position.set(0.45, 0.2, 0.1); R2.add(tp);
  R2.add(tube([v3(0.45, -0.05, 0.1), v3(0.4, -0.3, 0.2), v3(0.12, -0.35, 0.3)], 0.045, MAT.steel, 16)); R2.add(tube([v3(0.45, 0.45, 0.1), v3(0.2, 0.55, 0), v3(0, 0.4, 0)], 0.05, MAT.steel, 16));
  const frame = metal(0x2b2f36, 0.5); for (const [x, z] of [[0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]]) R2.add(bar(v3(x * 0.4, 0.4, z * 0.4), v3(x * 1.4, 1.6, z * 1.4), 0.04, frame));
  S.rkeJet = buildJet({ n: 3000, len: 8, rad: 0.62, spread: 1.6, speed: 1.3, size: 1.1, bright: 1.25, seed: 9 });
  S.shock = shockDiamonds(7); R2.add(S.shock);
}
function engineAt(t) {
  const on = t > K.propulsion - 0.5 && t < K.mecanica + 0.3; S.engine.visible = on; S.rke.visible = on;
  if (!on) { S.engJet.u.power.value = 0; S.rkeJet.u.power.value = 0; return; }
  const spool = win(t, K.propulsion - 0.4, 0.8);
  S.fanR.rotation.x = spool * t * 26; S.lowR.rotation.x = spool * t * 26; S.highR.rotation.x = spool * t * 55;
  const cut = win(t, K.motores - 0.12, 0.6), cut2 = win(t, K.motores + 0.12, 0.55); S.cowl[0].rotation.x = -1.95 * cut; S.coreC[0].rotation.x = -2.1 * cut2;
  S.comb.material.emissiveIntensity = 3.2 * win(t, K.reaccion - 0.1, 0.4) * (0.85 + 0.15 * Math.sin(t * 31)); S.hotM.emissiveIntensity = 1.2 * win(t, K.reaccion, 0.5);
  const ex = S.engine.localToWorld(v3(-2.9, 0, 0)), dx = S.engine.localToWorld(v3(-3.9, 0, 0)).sub(ex).normalize(); jetAt(S.engJet, ex, dx, win(t, K.reaccion, 0.4) * (t < K.cohetes + 0.6 ? 1 : 0));
  const fire = win(t, K.cohetes - 0.25, 0.25), noz = S.rke.localToWorld(v3(0, -2.05, 0));
  jetAt(S.rkeJet, noz, v3(0, -1, 0), fire * (0.9 + 0.1 * Math.sin(t * 40))); S.bellM.emissiveIntensity = 0.8 * fire;
  S.shock.children.forEach(m => { const i = m.userData.i; m.visible = fire > 0.05; m.position.set(0, -2.3 - i * 0.62, 0); m.scale.set(0.5 - i * 0.04, 0.42, 1).multiplyScalar(fire * (0.9 + 0.12 * Math.sin(t * 50 + i))); m.quaternion.copy(cam.quaternion); });
}
// ---------------------------------------------------------------- 7 · la Tierra (continentes del mapa real, nubes, atmósfera, luces de ciudades de noche), el cohete que pone el satélite en órbita y el tráfico aéreo
const EC = v3(220, 0, 0), ER = 4.0, ORB = 4.9, ESUN = new THREE.Vector3(-0.25, 0.35, 0.9).normalize(), ESUN_N = new THREE.Vector3(0.78, 0.12, -0.62).normalize();   // de día, y anocheciendo sobre Europa
async function loadTopoLocal(url) {
  const d = await (await fetch(url)).json(); const [sx, sy] = d.transform.scale, [tx, ty] = d.transform.translate;
  const arcs = d.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
  const ring = idx => { const pts = []; for (const i of idx) { const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse(); pts.push(...(pts.length ? a.slice(1) : a)); } return pts; };
  return d.objects.countries.geometries.map(g => { const polys = g.type === 'MultiPolygon' ? g.arcs : g.type === 'Polygon' ? [g.arcs] : []; return { name: (g.properties || {}).name || '', rings: polys.flatMap(p => p.map(ring)) }; });
}
const llv = (lon, lat, r = ER) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return v3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)); };
const EARTH_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vN; varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`;
const EARTH_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D tDay, tNight, tClouds; uniform vec3 sunDir, camP; uniform float night, cloudsK, time; varying vec3 vN; varying vec2 vUv; varying vec3 vW;
void main(){
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vN), V = normalize(camP - vW); float d = dot(N, sunDir);
  vec4 day = texture2D(tDay, vUv); vec3 col = pow(day.rgb, vec3(2.2));
  float lit = smoothstep(-0.12, 0.25, d);
  vec3 H = normalize(sunDir + V); float sp = pow(max(dot(N, H), 0.), 60.) * (1. - day.a) * 0.9;
  vec3 c = col * (0.03 + 1.25 * max(d, 0.)) + vec3(1.0, 0.92, 0.8) * sp * lit;
  vec2 cu = vUv + vec2(time * 0.002, 0.); float cl = texture2D(tClouds, cu).r * cloudsK;
  c = mix(c, vec3(1.0) * (0.04 + 1.2 * max(d, 0.)), cl * 0.85);
  vec3 nl = pow(texture2D(tNight, vUv).rgb, vec3(2.2)) * 3.0 * night * (1. - smoothstep(-0.2, 0.06, d)) * (1. - cl * 0.7);
  float fr = pow(1. - max(dot(N, V), 0.), 3.0);
  c += vec3(0.25, 0.5, 1.0) * fr * (0.15 + 1.2 * lit) + nl;
  gl_FragColor = vec4(c, 1.);
}`;
const ATM_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 sunDir, camP; varying vec3 vN; varying vec2 vUv; varying vec3 vW;
void main(){
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vN), V = normalize(camP - vW); float f = pow(1. - abs(dot(N, V)), 5.0), l = smoothstep(-0.3, 0.4, dot(N, sunDir));
  gl_FragColor = vec4(vec3(0.3, 0.6, 1.2) * f * (0.1 + 1.6 * l), f * l);
}`;
async function buildEarth() {
  const C = await loadTopoLocal('../../../engine/geo/countries-50m.json');
  const Wt = 2048, Ht = 1024, X = lo => (lo + 180) / 360 * Wt, Y = la => (90 - la) / 180 * Ht;
  const land = document.createElement('canvas'); land.width = Wt; land.height = Ht; const lg = land.getContext('2d'); lg.fillStyle = '#000'; lg.fillRect(0, 0, Wt, Ht); lg.fillStyle = '#fff';
  for (const c of C) for (const r of c.rings) { lg.beginPath(); let px = null; r.forEach(([lo, la], i) => { const x = X(lo), y = Y(la); if (i === 0 || (px !== null && Math.abs(x - px) > Wt / 2)) lg.moveTo(x, y); else lg.lineTo(x, y); px = x; }); lg.closePath(); lg.fill(); }
  const mask = lg.getImageData(0, 0, Wt, Ht).data, isLand = (x, y) => mask[((Math.floor(y) * Wt) + Math.floor(x)) * 4] > 128;
  // ruido suave (sin cuadros) para el color de la tierra
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), hh = (a, b) => hash(a * 0.317 + b * 1.731);
    return lerp(lerp(hh(xi, yi), hh(xi + 1, yi), sx), lerp(hh(xi, yi + 1), hh(xi + 1, yi + 1), sx), sy); };
  const day = canvasTex(Wt, Ht, (g, w, h) => { const oc = g.createLinearGradient(0, 0, 0, h); oc.addColorStop(0, '#0c2238'); oc.addColorStop(0.5, '#0f3a5e'); oc.addColorStop(1, '#0c2238'); g.fillStyle = oc; g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0; y < h; y++) { const la = 90 - y / h * 180, al = Math.abs(la);
      for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (!isLand(x, y)) { d[i + 3] = 0; continue; }
        const n = vn(x / 22, y / 22) * 0.22 + vn(x / 6, y / 6) * 0.1;
        let c = al < 12 ? [38, 82, 34] : al < 32 ? [150, 128, 84] : al < 55 ? [70, 98, 52] : al < 66 ? [88, 96, 74] : [228, 234, 240];
        if (al > 18 && al < 32 && n > 0.2) c = [96, 108, 60]; if (al >= 32 && al < 45 && n > 0.24) c = [128, 116, 80];
        d[i] = c[0] * (0.85 + n); d[i + 1] = c[1] * (0.85 + n); d[i + 2] = c[2] * (0.85 + n); d[i + 3] = 255; } }
    for (let y = 0; y < h; y++) { const la = 90 - y / h * 180; if (Math.abs(la) > 78) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 236; d[i + 3] = 255; } }
    g.putImageData(img, 0, 0); });
  day.colorSpace = THREE.NoColorSpace;
  // luces de noche: puntos en tierra, más densos en Europa, Norteamérica, India y Asia oriental
  const nightT = canvasTex(Wt, Ht, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const boxes = [[-10, 36, 30, 60, 1.0], [-125, 25, -70, 50, 0.8], [68, 8, 90, 30, 0.9], [100, 20, 142, 42, 0.9], [-60, -35, -35, -5, 0.4], [-100, 15, -80, 25, 0.5]];
    for (let i = 0; i < 60000; i++) { let lo = hash(i * 1.37) * 360 - 180, la = Math.asin(hash(i * 2.11) * 2 - 1) * 180 / Math.PI * 0.85, wgt = 0.07;
      for (const [a, b, c2, d2, k] of boxes) if (lo > a && lo < c2 && la > b && la < d2) wgt = k; if (hash(i * 3.7) > wgt) continue;
      const x = X(lo), y = Y(la); if (!isLand(x, y)) continue; const s = hash(i * 5.3); g.fillStyle = `rgba(255,${190 + s * 40},${120 + s * 50},${0.25 + s * 0.6})`; g.fillRect(x, y, s > 0.9 ? 2 : 1, s > 0.9 ? 2 : 1); } });
  // nubes: muchas manchas pequeñas y alargadas en las bandas de verdad (ecuador y latitudes medias), en grupos
  const clouds = canvasTex(2048, 1024, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let c = 0; c < 420; c++) { const la0 = (hash(c * 4.1) < 0.3 ? (hash(c * 1.1) - 0.5) * 18 : (hash(c * 2.3) < 0.5 ? 1 : -1) * (35 + hash(c * 3.3) * 28)), x0 = hash(c * 5.7) * w, y0 = (90 - la0) / 180 * h;
      for (let i = 0; i < 16; i++) { const x = x0 + (hash(c * 31 + i) - 0.5) * 90, y = y0 + (hash(c * 17 + i * 3) - 0.5) * 30, r = 3 + hash(c * 7 + i * 5) * 11;
        g.save(); g.translate(x, y); g.scale(2.2, 1); const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); g.restore(); } } });
  clouds.colorSpace = THREE.NoColorSpace; clouds.wrapS = THREE.RepeatWrapping;
  const G = new THREE.Group(); G.position.copy(EC); scene.add(G); S.earth = G;
  const eu = { tDay: { value: day }, tNight: { value: nightT }, tClouds: { value: clouds }, sunDir: { value: ESUN.clone() }, camP: { value: new THREE.Vector3() }, night: { value: 1 }, cloudsK: { value: 1 }, time: { value: 0 } };
  const ball = new THREE.Mesh(new THREE.SphereGeometry(ER, 128, 64), new THREE.ShaderMaterial({ vertexShader: EARTH_VS, fragmentShader: EARTH_FS, uniforms: eu })); ball.rotation.y = -Math.PI / 2; G.add(ball); S.earthU = eu; S.ball = ball;
  const atm = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.035, 96, 48), new THREE.ShaderMaterial({ vertexShader: EARTH_VS, fragmentShader: ATM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { sunDir: eu.sunDir, camP: eu.camP } })); G.add(atm);
  // tráfico aéreo: ~1800 aviones en rutas entre aeropuertos (círculo máximo), luces que avanzan
  const AP = [[-3.56, 40.49], [2.08, 41.3], [-0.12, 51.47], [2.55, 49.0], [8.56, 50.03], [4.76, 52.31], [11.79, 48.35], [12.25, 41.8], [-9.13, 38.77], [23.94, 37.94], [28.81, 40.98], [37.41, 55.97], [-73.78, 40.64], [-87.9, 41.98], [-118.4, 33.94], [-80.29, 25.8], [-43.25, -22.81], [-58.54, -34.82], [-99.07, 19.43], [55.36, 25.25], [51.61, 25.27], [72.87, 19.09], [77.1, 28.56], [103.99, 1.36], [113.91, 22.31], [121.8, 31.14], [116.6, 40.08], [139.78, 35.55], [151.18, -33.95], [28.24, -26.13], [31.4, 30.12], [-6.27, 53.42], [10.74, 59.98], [18.92, 59.65], [-79.63, 43.68], [-122.38, 37.62], [-15.45, 28.06], [-5.9, 35.73], [3.21, 6.58], [-17.08, 14.74]];
  const routes = []; for (let i = 0; i < 260; i++) { const a = AP[Math.floor(hash(i * 3.1) * AP.length)], b = AP[Math.floor(hash(i * 7.3 + 1) * AP.length)]; if (a === b) continue; routes.push([a, b]); }
  const NP = 1800, pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NP * 3), 3));
  S.planes = new THREE.Points(pg, new THREE.PointsMaterial({ map: starTex0(), color: new THREE.Color(1.6, 1.4, 1.0), size: 0.045, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false }));
  S.planes.frustumCulled = false; G.add(S.planes); S.planeData = Array.from({ length: NP }, (_, i) => ({ r: routes[i % routes.length], ph: hash(i * 1.9), sp: 0.015 + hash(i * 2.7) * 0.02 }));
  const rl = []; routes.forEach(([a, b]) => { const A = llv(a[0], a[1], 1).normalize(), B = llv(b[0], b[1], 1).normalize(); for (let k = 0; k < 24; k++) { const p = A.clone().lerp(B, k / 24).normalize().multiplyScalar(ER * 1.012), q = A.clone().lerp(B, (k + 1) / 24).normalize().multiplyScalar(ER * 1.012); rl.push(p.x, p.y, p.z, q.x, q.y, q.z); } });
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rl, 3)); S.routes = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x5fb8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); G.add(S.routes);
  // costas y fronteras de Europa y el norte de África (nítidas al acercarse a Madrid); España en ámbar
  const segs = [], segsES = [];
  for (const c of C) for (const r of c.rings) { if (!r.some(([lo, la]) => lo > -25 && lo < 42 && la > 24 && la < 64)) continue; let prev = null;
    for (const q of r) { if (prev && Math.hypot(q[0] - prev[0], q[1] - prev[1]) < 0.12) continue; if (prev) (c.name === 'Spain' ? segsES : segs).push(llv(prev[0], prev[1], ER * 1.0015), llv(q[0], q[1], ER * 1.0015)); prev = q; } }
  const mkS = (arr, col, w) => { const n = arr.length / 2, l = segSet(n, col, w, 0); for (let i = 0; i < n; i++) l.userData.set(i, arr[2 * i], arr[2 * i + 1]); l.userData.flush(); G.add(l); return l; };
  S.coast = mkS(segs, 0x9fb4cc, 1.3); S.coastES = mkS(segsES, 0xffb547, 2.4);
  // llegadas a Madrid: aviones en fila hacia la pista, con su anillo de separación
  S.mad = llv(-3.56, 40.49); S.madN = S.mad.clone().normalize();
  S.approach = Array.from({ length: 7 }, (_, i) => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 2.6), toneMapped: false })); G.add(p);
    const rgm = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.034, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.4, 0.9), transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); p.add(rgm); return { p, rgm }; });
  S.runway = [0, 1].map(k => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.008), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.2, 1.6), side: THREE.DoubleSide, toneMapped: false })); G.add(m); return m; });
  // el cohete pequeño (escala de la Tierra), el satélite, la órbita y las flechas
  S.orbRocket = makeRocket(); S.orbRocket.scale.setScalar(0.22); G.add(S.orbRocket);
  S.orbJet = buildJet({ n: 1600, len: 0.4, rad: 0.012, spread: 0.07, speed: 2.4, size: 1.1, bright: 1.2, seed: 11 });
  S.orbSat = makeSat(); S.orbSat.scale.setScalar(0.12); G.add(S.orbSat);
  const op = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; op.push(v3(Math.cos(a) * ORB, Math.sin(a) * ORB, 0)); }
  S.orbLine = drawLine(op, 0x9fe8ff, 2.2, 0.9); G.add(S.orbLine);
  const tr = []; for (let i = 0; i <= 80; i++) tr.push(v3(0, 0, 0)); S.trail = drawLine(tr, 0xffd29a, 2.6, 0.9); G.add(S.trail);
  S.gArrow = arrow3(1, plastic(0xff4b5c, 0.25), 0.03); G.add(S.gArrow); S.vArrow = arrow3(1, plastic(0x38e08a, 0.25), 0.03); G.add(S.vArrow);
  const fall = []; for (let i = 0; i <= 40; i++) fall.push(v3(0, 0, 0)); S.fall = drawLine(fall, 0xffffff, 1.8, 0.7); S.fall.material.dashed = true; S.fall.material.dashSize = 0.06; S.fall.material.gapSize = 0.05; G.add(S.fall);
}
// trayectoria de lanzamiento en el plano XY de la órbita (ángulo θ desde +y): sube vertical y gira hasta ir horizontal a la altura de la órbita
const TH0 = 0.1;
function launch(t) {
  const t0 = K.mecanica - 0.6, u = clamp((t - t0) / (K.satelite - t0 + 0.25));
  const r = lerp(ER, ORB, sm5(clamp(u * 1.05))), th = TH0 - Math.pow(u, 1.8) * 0.85;
  return { p: v3(Math.sin(th) * r, Math.cos(th) * r, 0), th, r, u };
}
const OMEGA = 0.55;      // velocidad angular del satélite en órbita (rad/s, de película)
function satPos(t) { const t1 = K.satelite + 0.25, L = launch(t1); const th = L.th - OMEGA * Math.max(0, t - t1); return { p: v3(Math.sin(th) * ORB, Math.cos(th) * ORB, 0), th }; }
function orbitAt(t) {
  const on = t > K.mecanica - 0.6 && t < K.de11 + 0.1; S.earth.visible = on; if (!on) { S.orbJet.u.power.value = 0; return; }
  S.earthU.time.value = t; S.earthU.camP.value.copy(cam.position); S.earthU.sunDir.value.copy(ESUN).lerp(ESUN_N, win(t, K.navegacion - 0.45, 1.3)).normalize();
  S.earth.rotation.y = 0.0;
  // cohete: sube y gira; a los 1,4 s se separa la primera etapa; con «satélite» se abre la cofia
  const L = launch(t), dirv = launch(t + 0.02).p.sub(launch(t - 0.02).p).normalize(), tS = K.satelite - 0.1;
  const R = S.orbRocket; R.visible = t < K.orbita + 0.6; R.position.copy(L.p); R.quaternion.setFromUnitVectors(v3(0, 1, 0), dirv.lengthSq() > 0 ? dirv : v3(0, 1, 0));
  const sep = t > K.como9 + 0.25, fs = Math.max(0, t - (K.como9 + 0.25));
  R.userData.s1.visible = !sep || fs < 1.2; if (sep) { R.userData.s1.position.set(0.03 * fs, -0.25 * fs - 0.5 * fs * fs, 0); R.userData.s1.rotation.z = 1.4 * fs; }
  const fo = Math.max(0, t - tS); R.userData.fair.forEach((f, i) => { f.position.set((i ? -1 : 1) * 0.12 * fo, 0.05 * fo, 0); f.rotation.z = (i ? 1 : -1) * 1.2 * fo; f.visible = fo < 1.0; });
  const noz = R.localToWorld(v3(0, sep ? 0.62 : 0, 0)), dn = R.localToWorld(v3(0, sep ? -0.4 : -1, 0)).sub(noz).normalize();
  jetAt(S.orbJet, noz, dn, (t < tS + 0.05 ? 1 : 0) * clamp((t - (K.mecanica - 0.6)) / 0.2));
  S.orbJet.u.len.value = sep ? 0.25 : 0.4; S.orbJet.u.rad.value = sep ? 0.008 : 0.012;
  // estela del ascenso
  const tr = []; for (let i = 0; i <= 80; i++) { const tt = lerp(K.mecanica - 0.6, Math.min(t, K.satelite + 0.25), i / 80); tr.push(launch(tt).p); }
  S.trail.geometry.setPositions(tr.flatMap(p => [p.x, p.y, p.z])); S.trail.material.opacity = 0.9 * (1 - win(t, K.porque9, 0.6)); S.trail.visible = t > K.mecanica - 0.4;
  // satélite: sale de la cofia y sigue en órbita; despliega los paneles con «órbita»
  const sv = t > tS; S.orbSat.visible = sv; const sp = sv ? satPos(t) : null;
  if (sv) { const p = t < K.satelite + 0.25 ? R.localToWorld(v3(0, 0.95, 0)).sub(S.earth.position) : sp.p; S.orbSat.position.copy(p); S.orbSat.rotation.set(0, t * 0.4, -sp.th); S.orbSat.userData.deploy(win(t, K.orbita - 0.05, 0.7)); }
  drawK(S.orbLine, win(t, K.orbita - 0.1, 0.9)); S.orbLine.material.opacity = 0.9 * (1 - win(t, K.navegacion + 0.4, 0.8));
  // flechas: gravedad hacia el centro, velocidad tangente; y la caída que nunca llega
  const ak = win(t, K.porque9 - 0.05, 0.35), fk = win(t, K.cae - 0.1, 0.45), hide = 1 - win(t, K.y10 - 0.1, 0.4);
  if (sv && ak > 0.01 && hide > 0.01) { const p = sp.p, nIn = p.clone().normalize().negate(), tg = v3(Math.cos(sp.th), -Math.sin(sp.th), 0).negate();
    S.gArrow.visible = true; S.gArrow.position.copy(p); S.gArrow.quaternion.setFromUnitVectors(v3(0, 1, 0), nIn); S.gArrow.userData.setLen(0.8 * ak * hide);
    S.vArrow.visible = true; S.vArrow.position.copy(p); S.vArrow.quaternion.setFromUnitVectors(v3(0, 1, 0), tg.normalize()); S.vArrow.userData.setLen(1.1 * ak * hide);
    const pts = []; for (let i = 0; i <= 40; i++) { const s = i / 40, th = sp.th - s * 1.2; pts.push(v3(Math.sin(th) * (ORB - s * s * 0.35), Math.cos(th) * (ORB - s * s * 0.35), 0)); }
    S.fall.geometry.setPositions(pts.flatMap(q => [q.x, q.y, q.z])); S.fall.computeLineDistances(); S.fall.visible = fk > 0.01; S.fall.material.opacity = 0.8 * fk * hide; }
  else { S.gArrow.visible = S.vArrow.visible = S.fall.visible = false; }
  // tráfico: luces moviéndose por sus rutas; con «aeropuertos», las llegadas a Madrid
  const tk = win(t, K.navegacion - 0.2, 0.6); S.planes.visible = tk > 0.01; S.routes.material.opacity = 0.18 * tk * (1 - 0.6 * win(t, K.aeropuertos, 0.6));
  if (S.planes.visible) { const a = S.planes.geometry.attributes.position.array;
    S.planeData.forEach((d, i) => { const A = llv(d.r[0][0], d.r[0][1], 1).normalize(), B = llv(d.r[1][0], d.r[1][1], 1).normalize(), u = (d.ph + t * d.sp) % 1, p = A.lerp(B, u).normalize().multiplyScalar(ER * 1.014); a.set([p.x, p.y, p.z], i * 3); });
    S.planes.geometry.attributes.position.needsUpdate = true; S.planes.material.size = 0.045 * (1 - 0.55 * win(t, K.aeropuertos, 0.8)); S.planes.material.opacity = tk; }
  const ak2 = win(t, K.aeropuertos - 0.1, 0.5), sk = win(t, K.sin10 - 0.1, 0.35), east = v3(0, 1, 0).cross(S.madN).normalize(), north = S.madN.clone().cross(east).normalize();
  S.runway.forEach((m, k) => { m.visible = ak2 > 0.01; m.position.copy(S.mad).addScaledVector(S.madN, 0.002).addScaledVector(east, (k ? -1 : 1) * 0.012); m.lookAt(S.mad.clone().addScaledVector(S.madN, 1).add(S.earth.position)); m.material.opacity = ak2; m.rotateZ(Math.PI / 2 - 0.1); });
  S.coast.material.opacity = 0.5 * win(t, K.aeropuertos - 0.3, 0.6); S.coastES.material.opacity = 0.95 * win(t, K.aeropuertos - 0.2, 0.6); S.coast.visible = S.coastES.visible = ak2 > 0.01 || t > K.aeropuertos - 0.3;
  S.approach.forEach((A, i) => { const s = ((t * 0.08 + i / 7) % 1), d = 0.03 + (1 - s) * 0.42, h = 0.004 + (1 - s) * 0.05;
    A.p.visible = ak2 > 0.01; A.p.position.copy(S.mad).addScaledVector(north, -d).addScaledVector(S.madN, h); A.rgm.visible = sk > 0.01; A.rgm.scale.setScalar(Math.max(0.001, sk)); A.rgm.material.opacity = sk; A.rgm.lookAt(cam.position); });
}
// ---------------------------------------------------------------- 8 · «de aquí sale quien diseña aviones, motores, cohetes y satélites… y quien hace que todo eso vuele seguro»:
// de vuelta sobre las nubes, volando hacia el amanecer (−x) a la velocidad de la formación; cada cosa llega al oírla y al final van todos juntos
// hacia el graduado. Y en «6 años para entender todo lo que vuela», todo pasa por encima de él.
const FM_V = 6.2, FM_X0 = 40.5, FM_Y = 3.4;                 // la formación va a 6,2 m/s hacia −x y llega encima del graduado al acabar la frase
const fmC = t => v3(FM_X0 - FM_V * (t - K.de11), FM_Y, 0);   // punto de referencia de la formación (la cámara va con él)
// huecos de cada uno en la formación (respecto a fmC; −x es hacia delante) y desde dónde llegan
const FMS = { lead: v3(-1.7, 0, -0.5), wing: v3(0.9, 0.5, -2.7), wing0: v3(9.5, 2.2, 5.5), heli: v3(1.8, -0.75, 1.6), heli0: v3(-3.5, 4.5, 7), drone: v3(0.3, 1.1, 2.3), drone0: v3(5, -3.5, 5) };
function buildFormation() {
  S.fJet = makeJet({ stripe: '#0f7b6c', stripe2: '#f2b233', tail: 0x0f7b6c }); S.fJet.scale.setScalar(2.6); scene.add(S.fJet);
  S.fTrail = [0, 1, 2, 3].map(i => buildJet({ n: 1200, len: 10, rad: 0.03, spread: 0.32, speed: 0.5, size: 1.25, bright: 0.45, kind: 2, seed: 30 + i, turb: 0.25 }));
  S.fRocketJet = buildJet({ n: 2400, len: 14, rad: 0.3, spread: 3.2, speed: 1.3, size: 1.3, bright: 1.25, seed: 13 });
  S.fRocket = makeRocket(); S.fRocket.scale.setScalar(9); scene.add(S.fRocket);
}
function slotPos(t, t0, d, a, b) { const u = clamp((t - t0) / d), e = 1 - Math.pow(1 - u, 3); return { p: a.clone().lerp(b, e), u, v: b.clone().sub(a).multiplyScalar(3 * Math.pow(1 - u, 2) / d) }; }
function trailsFor(J, trails, t, power) { J.updateWorldMatrix(true, false); const d = v3(1, 0, 0).applyQuaternion(J.quaternion).negate(); trails.forEach((T, i) => jetAt(T, J.localToWorld(J.userData.exh[i].clone()), d, power)); }
function formationAt(t) {
  const on = t > K.de11 - 0.05 && t < K.falta12 + 0.8;
  S.fJet.visible = on;
  if (!on) { S.fTrail.forEach(T => { T.u.power.value = 0; }); }
  if (on) {
    const C = fmC(t), fwd = v3(-1, 0, 0);
    // líder (verde azulado): ya está ahí al salir de la nube
    jetPose(S.fJet, C.clone().add(FMS.lead).add(v3(0, 0.05 * Math.sin(t * 1.1), 0.04 * Math.sin(t * 0.7))), fwd, 0.04 * Math.sin(t * 0.8));
    S.fJet.userData.update(t, { flex: 0.12 + 0.03 * Math.sin(t * 2.7), halo: 0.07 }); trailsFor(S.fJet, S.fTrail.slice(0, 2), t, 1);
    // «aviones»: el segundo avión (azul) llega por detrás de la cámara, pasa a su lado y se pone en su sitio
    const w = slotPos(t, K.aviones11 - 0.45, 1.1, FMS.wing0, FMS.wing); S.hookJet.visible = true; S.hookJet.scale.setScalar(2.4);
    jetPose(S.hookJet, C.clone().add(w.p), fwd.clone().add(w.v.clone().multiplyScalar(-0.02 / FM_V)).normalize(), -0.35 * (1 - w.u) + 0.04 * Math.sin(t * 0.9));
    S.hookJet.userData.update(t, { flex: 0.12, halo: 0.07 }); trailsFor(S.hookJet, S.fTrail.slice(2, 4), t, win(t, K.aviones11, 0.4));
    // «vuele seguro»: el helicóptero y el dron se unen
    const hk = t > K.y11 - 0.5, h = slotPos(t, K.y11 - 0.5, 1.2, FMS.heli0, FMS.heli);
    if (hk) { S.heli.visible = true; S.heli.position.copy(C).add(h.p); S.heli.rotation.set(0.03 * Math.sin(t * 1.3), Math.PI + 0.04 * Math.sin(t * 0.5), 0.18 * (1 - h.u) - 0.1); S.heli.userData.update(t); }
    const dk = t > K.y11 - 0.2, dr = slotPos(t, K.y11 - 0.2, 1.0, FMS.drone0, FMS.drone);
    if (dk) { S.drone.visible = true; S.drone.scale.setScalar(1.25); S.drone.position.copy(C).add(dr.p).add(v3(0, 0.03 * Math.sin(t * 3.1), 0)); S.drone.rotation.set(0.05 * Math.sin(t * 2), Math.PI - 0.3, 0.1 + 0.05 * Math.sin(t * 1.6)); S.drone.userData.update(t); }
    // «satélites»: cruza alto por encima
    const sk = t > K.satelites11 - 0.8 && t < K.y11 + 1.2;
    if (sk) { S.sat.visible = true; const u = t - (K.satelites11 - 0.8); S.sat.position.copy(C).add(v3(6.5 - 4.2 * u, 6.2 + 0.2 * u, -3.0)); S.sat.rotation.set(0.4, 0.5 + 0.2 * t, 0.3); S.sat.userData.deploy(1); }
  }
  // «cohetes»: un cohete grande despega del mar de nubes, lejos, delante (hacia el amanecer)
  const tr = K.cohetes11 - 1.45, ron = t > tr && t < K.y11 + 1.5; S.fRocket.visible = ron;
  if (ron) { const x0 = fmC(K.cohetes11).x - 30, y = CLOUD_Y - 9 + 2.2 * Math.pow(t - tr, 2) * 2.2 + 4 * (t - tr); S.fRocket.position.set(x0, y, -46); S.fRocket.rotation.set(0, 0, 0.05 * (t - tr));
    S.fRocket.updateWorldMatrix(true, false); const noz = S.fRocket.localToWorld(v3(0, 0, 0)), dn = S.fRocket.localToWorld(v3(0, -1, 0)).sub(noz).normalize(); jetAt(S.fRocketJet, noz, dn, clamp((t - tr) / 0.25)); }
  else S.fRocketJet.u.power.value = 0;
  flyoverAt(t);
}
// ---------------------------------------------------------------- «6 años para entender todo lo que vuela»: el graduado mira arriba y le pasan por encima un avión, un helicóptero,
// un cohete (lejos, detrás) y un satélite
function flyoverAt(t) {
  const t0 = K.seis - 0.2, on = t > t0 && t < K.si3 + 0.8; if (!on) return;
  const u = t - t0;
  S.climbJet.visible = true; S.climbJet.scale.setScalar(2.8); const jp = v3(9 - 7.5 * u, 6.2 + 0.25 * u, -3.5); jetPose(S.climbJet, jp, v3(-1, 0.03, 0).normalize(), 0.12);
  S.climbJet.userData.update(t, { flex: 0.12, halo: 0.08 }); trailsFor(S.climbJet, S.climbTrail, t, 1);
  if (t > K.para14 - 0.3) { S.heli.visible = true; const v = t - (K.para14 - 0.3); S.heli.position.set(-6 + 3.4 * v, 4.4 + 0.15 * Math.sin(t), -1.8); S.heli.rotation.set(0, 0, -0.12); S.heli.scale.setScalar(1.3); S.heli.userData.update(t); }
  if (t > K.todo14 - 0.6) { const v = t - (K.todo14 - 0.6); S.fRocket.visible = true; S.fRocket.position.set(-14, CLOUD_Y - 9 + 4.8 * v * v + 4 * v, -42); S.fRocket.rotation.set(0, 0, 0.03 * v);
    S.fRocket.updateWorldMatrix(true, false); const noz = S.fRocket.localToWorld(v3(0, 0, 0)), dn = S.fRocket.localToWorld(v3(0, -1, 0)).sub(noz).normalize(); jetAt(S.fRocketJet, noz, dn, clamp(v / 0.25)); }
  if (t > K.vuela14 - 0.5) { S.sat.visible = true; const v = t - (K.vuela14 - 0.5); S.sat.position.set(5 - 2.6 * v, 9.5, -6); S.sat.rotation.set(0.4, 0.4 + 0.3 * t, 0.2); S.sat.userData.deploy(1); }
}
// ---------------------------------------------------------------- el escenario en cada instante: estaciones, mundo (amanecer o espacio), luces y transiciones
// Los tres saltos de lugar se hacen como pide REGLAS.md, acercándose a algo blanco hasta que llena la pantalla: la piel del avión
// («así es por dentro»), el chorro del cohete («mecánica orbital») y una nube de la Tierra («de aquí sale…», que sale de un cúmulo).
let CUT1 = 0, CUT2 = 0, CUT3 = 0;
function setCuts() { CUT1 = K.asi4 + 0.27; CUT2 = K.mecanica - 0.03; CUT3 = K.de11 - 0.03; }
const inSpace = t => t >= CUT2 && t < CUT3;
function whiteAt(t) {
  const w = (c, a, b) => (t < c ? win(t, c - a, a) : 1 - win(t, c, b));
  return Math.max(w(CUT1, 0.16, 0.2), w(CUT2, 0.2, 0.26), w(CUT3, 0.2, 0.28));
}
// destellos de golpe (cuando algo encaja o choca)
function flashAt(t) {
  let f = 0; const tLand = K.master1 + 0.42;
  for (const [t0, k] of [[K.no1 + 0.08, 0.1], [K.aero1 + 0.02, 0.07], [K.nota + 0.1, 0.05], [K.sobre, 0.04], [tLand, 0.12], [K.habilitante + 0.12, 0.06], [K.seis + 0.05, 0.06]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.07);
  return f;
}
const _sunD = new THREE.Vector3();
function stageAt(t, st) {
  NOW = t;
  const sp = inSpace(t);
  S.sky.material.uniforms.dawn.value = 1; S.sky.material.uniforms.space.value = sp ? 1 : 0; S.sky.material.uniforms.starK.value = sp ? 2.2 : 1.4;
  S.cfloor.visible = !sp; S.puffs.visible = !sp;
  for (const J of FXS) J.u.floorY.value = sp ? -1e9 : CLOUD_Y;
  gradAt(t); climbAt(t); familyAt(t); tunnelAt(t); aeroAt(t); wingAt(t); engineAt(t); orbitAt(t); formationAt(t);
  if (sp) for (const P of PUFFS) P.visible = false;
  // luces: siempre alrededor de lo que mira la cámara, con la principal del lado de la cámara; el sol bajo del amanecer como contraluz
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 6, 0.35, 2.6);
  const pw = sp ? 0.15 : t > CUT1 && t < K.aerod - 0.2 ? 1.25 : 0.9;
  rigAt(c, yaw, k, pw);
  const R = S.rig; _sunD.copy(sp ? S.earthU.sunDir.value : SUN);
  R.sun.position.copy(c).addScaledVector(_sunD, 40); R.sun.target.position.copy(c); R.sun.target.updateMatrixWorld();
  R.sun.intensity = sp ? 3.2 : 2.3; R.sun.color.set(sp ? 0xffffff : 0xffc89a); R.hemi.intensity = sp ? 0.0 : 0.45;
  scene.environmentIntensity = sp ? 0.18 : 1.0;
}
// ---------------------------------------------------------------- cámara: tramos (claves fijas, claves que siguen a algo que vuela, o claves fijas mirando a algo que vuela)
// que se funden entre sí; tres cortes (en blanco). El último fotograma es el primero (bucle).
let SEGS = [], CUTS = [];
const absSeg = KS => t => camKeys(t, KS);
const trackSeg = (base, KS) => t => { const b = base(t), c = camKeys(t, KS); c.p.add(b); c.l.add(b); return c; };
const lookSeg = (KS, target, off) => t => { const c = camKeys(t, KS); c.l = target(t).add(off); return c; };
const rocketW = t => launch(t).p.add(EC);
function buildCam() {
  setCuts();
  const N = llv(-3.56, 40.49).normalize(), east = v3(0, 1, 0).cross(N).normalize(), north = N.clone().cross(east).normalize(), M = EC.clone().addScaledVector(N, ER);
  const at = (b, ...o) => { const p = b.clone(); for (let i = 0; i < o.length; i += 2) p.addScaledVector(o[i], o[i + 1]); return [p.x, p.y, p.z]; };
  // primer fotograma (y el último): el birrete a contraluz, con el sol del amanecer justo detrás
  const T0 = [1.3, 3.08, 1.78], L0 = [0.0, 3.36, 0.0], TA = [1.42, 3.06, 1.95];
  // 0 · gancho (birrete → avión de papel que pasa rozando la cámara → avión) y el graduado con las alas que no llegan
  const HOOK = [
    [-1.0, TA, L0, 32], [0.0, T0, L0, 32], [0.5, [1.22, 3.1, 1.7], [0.1, 3.38, 0.0], 31],
    [0.95, [1.35, 3.15, 1.9], [1.35, 3.46, -0.55], 32], [1.3, [1.7, 3.3, 2.3], [4.0, 3.72, -2.9], 32, -0.04], [1.75, [2.2, 3.5, 2.9], [8.0, 4.15, -8.6], 31, -0.03],
    [2.15, [2.4, 3.5, 3.4], [10.0, 4.5, -13.0], 30], [2.55, [1.3, 2.7, 4.4], [3.0, 2.5, -3.0], 33], [3.0, [-1.6, 1.88, 3.25], [-0.1, 1.62, 0.3], 33],
    [K.no1 + 0.05, [-1.72, 1.76, 2.95], [-0.05, 1.56, 0.4], 32], [K.aero1 + 0.05, [-1.66, 1.72, 2.78], [-0.03, 1.55, 0.42], 32], [K.al1, [-1.52, 1.68, 2.52], [-0.02, 1.53, 0.45], 31],
    [K.que1 + 0.1, [-1.32, 1.62, 2.18], [-0.02, 1.51, 0.45], 30], [6.25, [-1.42, 1.7, 2.32], [-0.05, 1.5, 0.4], 31], [7.0, [0.6, 0.4, 5.4], [4.0, -3.0, -1.5], 34],
  ];
  // 1 · la subida: cámara al lado del avión (claves fijas), mirando siempre al avión y a la cinta
  const CLIMB = [
    [6.6, [1.7, 0.2, 5.4], 34], [7.3, [2.7, -3.9, 7.8], 32], [7.9, [4.2, -4.1, 8.6], 32], [8.6, [7.6, -2.6, 9.2], 32], [9.4, [12.2, 0.7, 9.6], 32],
    [10.4, [18.6, 4.4, 9.8], 32], [11.4, [24.6, 6.6, 9.6], 33], [12.4, [30.8, 7.3, 9.2], 33], [13.1, [35.2, 7.4, 8.6], 33],
  ].map(([t, p, f]) => [t, p, [0, 0, 0], f]);
  // 2 · crucero y «todo lo que vuela» (siguiendo al avión) y el picado hacia su piel
  const CRUISE = [
    [12.9, [-5.0, 0.6, 8.6], [0.6, 0.1, 0.4], 33], [13.55, [2.3, 0.45, 3.5], [-0.4, 0.05, 0.0], 34], [14.35, [2.6, 0.3, 3.2], [-0.5, 0.0, 0.0], 34],
    [15.0, [-0.2, 1.5, 10.2], [0.1, 1.55, -1.5], 38], [16.45, [-0.35, 1.7, 10.8], [0.15, 1.75, -2.0], 38], [16.78, [0.15, 0.55, 2.8], [0.05, 0.05, 0.0], 40], [CUT1 + 0.01, [0.05, 0.08, 0.3], [0.0, 0.0, -0.5], 52],
  ];
  // 3 · dentro del fuselaje (de −x a +x), túnel de viento, ensayo del ala, turbofán, tobera… y al chorro
  const tun = t => TUN.x + tunCamX(t);
  const INSIDE = [
    ...[CUT1, 17.6, 18.4, 19.2, 20.0, 20.8, 21.5].map((t, i) => [t, [tun(t), 4.28, 0.0], [tun(t) + 3.2, 4.0, 0.0], 48, 0.12 * Math.sin(i * 1.3)]),
    [21.85, [tun(21.85), 4.15, 0.05], [tun(21.85) + 3.0, 3.9, 0.2], 46], [22.25, [41.2, 4.0, 2.6], [44.0, 3.7, 0.0], 38],
    [22.75, [44.15, 3.75, 4.5], [44.05, 3.65, 0.0], 34], [23.1, [44.1, 3.8, 4.4], [44.05, 3.68, 0.0], 34], [23.65, [44.35, 4.7, 6.6], [44.1, 4.75, -0.4], 34],
    [24.5, [44.45, 4.8, 7.1], [44.12, 4.7, -0.4], 34], [25.5, [44.6, 4.85, 7.3], [44.15, 4.75, -0.4], 34],
    [26.0, [50.8, 4.4, 5.0], [55.5, 2.6, 2.0], 36], [26.55, [55.4, 3.3, 0.9], [60.0, 2.4, 3.8], 40], [K.alas, [55.4, 3.3, 0.9], [60.0, 2.45, 3.8], 40],
    [K.sin7 + 0.1, [55.3, 3.25, 0.7], [60.0, 2.95, 3.7], 40], [K.fibra - 0.2, [55.5, 3.4, 0.6], [58.0, 2.6, 2.4], 40], [K.fibra + 0.35, [56.1, 3.35, 0.75], [56.3, 2.55, 1.5], 38],
    [K.propulsion - 0.15, [56.15, 3.4, 0.7], [56.35, 2.7, 1.5], 38], [K.propulsion + 0.05, [60.5, 3.5, 4.4], [64.5, 2.6, 1.0], 36],
    [K.propulsion + 0.45, [70.6, 3.0, 4.4], [67.6, 2.4, 0.2], 34], [K.motores + 0.3, [69.8, 3.4, 4.9], [67.0, 2.45, 0.0], 34], [K.reaccion + 0.3, [68.6, 3.1, 4.7], [66.6, 2.3, -0.2], 34],
    [K.cohetes + 0.15, [73.2, 3.6, 6.2], [75.0, 1.6, -0.6], 34], [K.cohetes + 0.75, [75.6, 1.9, 4.2], [75.0, 0.8, -0.6], 36], [CUT2 - 0.01, [75.12, 0.35, 0.85], [75.0, -1.2, -0.6], 52],
  ];
  // 7 · la Tierra: el cohete de cerca, la órbita (vista de lado: elipse alta que cabe en vertical), Europa de noche y las llegadas a Madrid
  const RCAM = [[CUT2, [0.55, -0.1, 0.9], [0.0, -0.05, 0.0], 40], [34.3, [0.6, 0.12, 1.3], [0.0, 0.0, 0.0], 38], [35.05, [0.35, 0.3, 1.4], [0.0, 0.05, 0.0], 36], [35.7, [0.25, 0.55, 1.9], [-0.1, 0.12, 0.0], 36]];
  const ORBIT = [
    [35.9, [226.0, 5.5, 4.2], [220.6, 4.2, 0.0], 36], [36.6, [237.6, 3.1, 10.6], [220.0, 0.4, 0.0], 36], [K.y10 - 0.1, [236.8, 3.6, 11.6], [220.0, 0.5, 0.0], 36],
    [K.navegacion + 0.6, at(EC, N, 12.5, east, 0.6), at(EC, N, 2.6), 34], [K.aeropuertos + 0.1, at(EC, N, 9.0, east, 0.3), at(EC, N, 3.2), 34],
    [K.miles10, at(M, N, 2.4, north, -0.15), at(M, north, -0.2), 34], [K.sin10 + 0.1, at(M, N, 2.1, north, -0.1), at(M, north, -0.18), 34],
    [CUT3 - 0.01, at(M, N, 0.45, north, -0.1), at(M, north, -0.15), 46],
  ];
  // 8 · la formación (siguiendo al punto de la formación, que va hacia −x)
  const FORM = [
    [CUT3, [3.2, 0.55, 3.9], [-1.6, 0.1, -0.5], 34], [K.aviones11 - 0.35, [3.4, 0.7, 4.3], [5.0, 1.3, 0.6], 34], [K.aviones11, [3.0, 0.75, 4.0], [2.6, 0.85, -1.0], 34], [K.aviones11 + 0.3, [2.6, 0.75, 3.6], [1.2, 0.6, -2.0], 34],
    [K.motores11 - 0.25, [-1.2, 0.2, 1.4], [-1.7, -0.12, 0.0], 38], [K.motores11 + 0.15, [-2.3, -0.06, 0.32], [-1.86, -0.13, -0.04], 42], [K.motores11 + 0.42, [-2.34, -0.05, 0.34], [-1.86, -0.13, -0.04], 42],
    [K.cohetes11 + 0.2, [1.6, 1.3, 4.0], [-14, 2.5, -24], 34], [K.satelites11 - 0.15, [2.0, 0.9, 4.4], [-6, 4.5, -14], 36], [K.satelites11 + 0.3, [2.6, 0.6, 4.6], [3.0, 5.6, -3.0], 36],
    [K.y11 + 0.2, [4.6, 2.3, 6.5], [-0.4, 0.3, 0.0], 36], [K.seguro11 - 0.2, [5.2, 2.9, 7.2], [-0.8, 0.0, 0.2], 36],
  ];
  // 9 · de vuelta al graduado: el máster, profesión regulada, la llave, los años, «6 años» con todo pasando por encima, y el birrete al aire (bucle)
  const tEnd = END;
  const GRAD2 = [
    [48.55, [-2.2, 2.6, 4.4], [0.0, 1.8, 0.3], 34], [K.ingeniero12 - 0.1, [-1.7, 1.8, 3.0], [-0.02, 1.56, 0.42], 32], [K.el12, [-1.4, 1.65, 2.3], [-0.02, 1.52, 0.45], 30],
    [K.master1 + 0.15, [-1.3, 1.62, 2.15], [-0.02, 1.52, 0.45], 30], [K.master1 + 0.65, [-1.5, 1.7, 2.6], [0.0, 1.5, 0.35], 32],
    [K.profesion + 0.1, [-0.9, 2.2, 3.6], [0.0, 2.0, 0.6], 34], [K.grado + 0.1, [-0.8, 1.6, 3.7], [0.0, 1.35, 0.8], 34], [K.tecnico, [-0.7, 1.45, 3.8], [0.0, 1.05, 0.9], 34],
    [K.ingeniero13b, [-0.7, 1.45, 3.8], [0.0, 1.05, 0.9], 34], [K.master2 + 0.1, [-0.75, 1.4, 3.3], [-0.1, 1.1, 0.95], 33], [K.habilitante + 0.3, [-0.7, 1.35, 3.0], [0.0, 1.1, 1.0], 32],
    [K.en13 + 0.1, [-0.5, 1.15, 3.7], [0.0, 0.7, 1.0], 34], [K.dos + 0.2, [-0.4, 1.1, 3.9], [0.0, 0.65, 1.0], 34],
    [K.seis + 0.05, [-0.7, 0.75, 3.6], [0.0, 1.6, 0.0], 38], [K.para14 + 0.1, [-0.55, 0.5, 3.3], [0.0, 2.6, -0.8], 42], [K.vuela14 + 0.2, [-0.4, 0.55, 3.2], [0.0, 2.9, -1.2], 42],
    [K.si3 + 0.3, [-1.1, 1.9, 3.5], [0.0, 1.65, 0.6], 34], [K.guardalo + 0.3, [-0.9, 1.95, 3.3], [0.1, 1.7, 0.7], 34], [K.cuentame + 0.2, [-0.6, 2.15, 3.4], [-0.1, 2.05, 0.6], 34],
    [K.te2 + 0.15, [0.3, 2.3, 3.0], [0.0, 2.3, 0.3], 34], [tEnd - 1.0, TA, L0, 32], [tEnd, T0, L0, 32],
  ];
  SEGS = [
    { t: -9, bl: 0, f: absSeg(HOOK) },
    { t: 6.6, bl: 0.9, f: lookSeg(CLIMB, climbLook, v3(0.3, 0.35, 0.4)) },
    { t: 12.95, bl: 0.6, f: trackSeg(climbPos, CRUISE) },
    { t: CUT1, bl: 0, f: absSeg(INSIDE) },
    { t: CUT2, bl: 0, f: trackSeg(rocketW, RCAM) },
    { t: 35.85, bl: 0.7, f: absSeg(ORBIT) },
    { t: CUT3, bl: 0, f: trackSeg(fmC, FORM) },
    { t: 48.35, bl: 0.7, f: absSeg(GRAD2) },
  ];
  CUTS = SEGS.filter(s => s.bl === 0 && s.t > -1).map(s => s.t);
}
function camAt(t) {
  let i = 0; while (i + 1 < SEGS.length && t >= SEGS[i + 1].t) i++;
  const A = SEGS[i], nx = SEGS[i + 1];
  const mix = (a, b, w) => ({ p: a.p.lerp(b.p, w), l: a.l.lerp(b.l, w), f: lerp(a.f, b.f, w), roll: lerp(a.roll, b.roll, w) });
  if (nx && nx.bl > 0 && t > nx.t - nx.bl / 2) return mix(A.f(t), nx.f(t), sm5((t - (nx.t - nx.bl / 2)) / nx.bl));
  if (A.bl > 0 && i > 0 && t < A.t + A.bl / 2) return mix(SEGS[i - 1].f(t), A.f(t), sm5((t - (A.t - A.bl / 2)) / A.bl));
  return A.f(t);
}
// instante «anterior» para el desenfoque de movimiento: no cruza un corte
function prevT(t, dt) { let c = -1e9; for (const x of CUTS) if (x <= t && x > c) c = x; return Math.max(t - dt, c); }
// ---------------------------------------------------------------- rótulos técnicos (HUD 2D encima del 3D): pocos, con línea guía, y solo con datos que tienen fuente (FUENTES.md)
function buildHudPlan() {}
const wp = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
function hudAt(t) {
  hudBegin();
  // la nota de corte: lectura del altímetro (sube con el avión y se queda en 12,484)
  const nk = env(t, K.politecnica - 0.2, K.crees + 0.35, 0.3, 0.35);
  if (nk > 0.01) {
    const v = NOTA(t), txt = v.toFixed(3).replace('.', ','), y = 1395;
    hg.save(); hg.globalAlpha = nk; hg.textAlign = 'center'; hg.textBaseline = 'middle';
    hg.fillStyle = 'rgba(0,0,0,.5)'; rr(hg, 300, y - 120, 480, 230, 18); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 1.5; hg.stroke();
    hg.letterSpacing = '5px'; hfont(22, false); hg.fillStyle = HC.grey; hg.fillText('NOTA DE CORTE · UPM 2025', 540, y - 80);
    const done = t > K.nota + 1.0; hg.letterSpacing = '4px'; hfont(96); hg.shadowColor = done ? HC.amber : 'transparent'; hg.shadowBlur = done ? 22 : 0;
    hg.fillStyle = done ? '#FFC85A' : HC.white; hg.fillText(txt, 520, y + 5); hg.shadowBlur = 0;
    hfont(34, false); hg.fillStyle = HC.grey; hg.textAlign = 'left'; hg.fillText('/ 14', 690, y + 20);
    hg.restore();
  }
  // túnel de viento: dónde baja y dónde sube la presión; peso y sustentación
  if (S.aero.visible) {
    const A = AER, kp = env(t, K.aerod + 0.55, K.avion6 - 0.1, 0.35, 0.3);
    callout(A.clone().add(v3(-0.15, 0.22, 0.62)), 'BAJA PRESIÓN', 'el aire va más rápido', kp, { color: '#7FC4FF', dx: -120, dy: -150, size: 27, bg: true });
    callout(A.clone().add(v3(0.1, -0.16, 0.62)), 'ALTA PRESIÓN', null, kp, { color: '#FF7A6E', dx: 120, dy: 170, size: 27, bg: true });
    const jw = S.aeroJet.visible ? wp(S.aero, S.aeroJet.position.x, S.aeroJet.position.y - 1.2, S.aeroJet.position.z) : null;
    if (jw) callout(jw, 'PESO', 'cientos de toneladas', env(t, K.toneladas + 0.15, K.estructuras - 0.1, 0.3, 0.25), { color: '#FF7A6E', dx: 130, dy: 60, size: 28, bg: true });
    if (jw) callout(jw.clone().add(v3(0, 2.1, 0)), 'SUSTENTACIÓN', 'empuja hacia arriba', env(t, K.sostiene + 0.2, K.estructuras - 0.1, 0.3, 0.25), { color: '#7FC4FF', dx: -130, dy: -80, size: 28, bg: true });
  }
  // ensayo del ala: la estructura se certifica a 1,5 veces la carga máxima prevista (CS-25.303 / 25.305)
  if (S.wingRig.visible) {
    const tip = WNG.clone().add(wTop(0.97, 0.3, S.bigWingM.userData.u.uFlex.value));
    callout(tip, 'ENSAYO: 150 % DE LA CARGA LÍMITE', 'y no se rompe', env(t, K.alas + 0.45, K.fibra - 0.25, 0.35, 0.25), { color: HC.amber, dx: -150, dy: -140, size: 25, bg: true });
    const pl = WNG.clone().add(wTop(0.25, 0.42, S.bigWingM.userData.u.uFlex.value)).add(v3(0, 0.3, 0));
    callout(pl, 'FIBRA DE CARBONO', 'capas a 0°, 45°, 90° y −45°', env(t, K.carbono + 0.05, K.propulsion - 0.05, 0.3, 0.2), { color: HC.white, dx: 120, dy: -170, size: 27, bg: true });
  }
  // turbofán en corte y motor cohete
  if (S.engine.visible) {
    const E = S.engine, k0 = K.motores + 0.45, k1 = K.cohetes - 0.05, s = 0.95;
    callout(wp(E, 0.05 * s, 0.62 * s, 0.45 * s), 'FAN', null, env(t, k0, k1, 0.3, 0.25), { dx: 90, dy: -150, size: 27, bg: true });
    callout(wp(E, -0.95 * s, 0.32 * s, 0.25 * s), 'COMPRESOR', null, env(t, k0 + 0.15, k1, 0.3, 0.25), { dx: -90, dy: -190, size: 27, bg: true });
    callout(wp(E, -1.48 * s, 0.27 * s, 0.15 * s), 'CÁMARA DE COMBUSTIÓN', null, env(t, K.reaccion - 0.05, k1, 0.3, 0.25), { color: '#FFB06A', dx: -60, dy: 210, size: 26, bg: true });
    callout(wp(E, -2.05 * s, 0.38 * s, 0.25 * s), 'TURBINA', null, env(t, K.reaccion + 0.15, k1, 0.3, 0.25), { dx: 80, dy: 160, size: 27, bg: true });
    callout(wp(S.rke, 0.45, 0.2, 0.15), 'MOTOR COHETE', 'combustible + oxidante', env(t, K.cohetes + 0.3, K.mecanica - 0.35, 0.3, 0.2), { dx: -120, dy: -150, size: 27, bg: true });
  }
  // órbita: la gravedad tira hacia la Tierra; la velocidad lateral hace que «caiga» sin llegar nunca
  if (S.earth.visible && S.gArrow.visible) {
    const p = wp(S.gArrow, 0, 0.75, 0), q = wp(S.vArrow, 0, 1.05, 0), k = env(t, K.porque9 + 0.15, K.y10 - 0.05, 0.3, 0.25);
    callout(p, 'GRAVEDAD', null, k, { color: '#FF7A6E', dx: -110, dy: 110, size: 28, bg: true });
    callout(q, 'VELOCIDAD', '≈ 28.000 km/h', k, { color: '#7CF0A9', dx: 110, dy: -120, size: 28, bg: true });
  }
  // llegadas a Madrid: separación entre aviones
  if (S.earth.visible && S.approach[3].p.visible) {
    callout(wp(S.approach[3].p, 0, 0, 0), 'SEPARACIÓN MÍNIMA', 'entre cada avión', env(t, K.sin10 - 0.05, CUT3 - 0.15, 0.3, 0.15), { color: '#7CF0A9', dx: 120, dy: -120, size: 27, bg: true });
  }
}
// ---------------------------------------------------------------- un fotograma
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3();
function frame(t) {
  placeCam(camAt(prevT(t, 1 / 60))); const prevVP = vpOf();
  placeCam(camAt(prevT(t, 1 / 36))); const PVP = vpOf();
  const st = camAt(t); placeCam(st); const VP = vpOf();
  stageAt(t, st); worldUpdate(t, VP, PVP, st.p); fxUpdate(t, VP, PVP);
  const d = Math.max(0.05, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _rt.setFromMatrixColumn(cam.matrixWorld, 0); _up.setFromMatrixColumn(cam.matrixWorld, 1);
  const P0 = cam.position.clone().addScaledVector(_fw, d), Px = P0.clone().addScaledVector(_rt, d * 0.4), Py = P0.clone().addScaledVector(_up, d * 0.4);
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
  if (window.camOverride) { window.camOverride(cam, v3); post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); const VP = vpOf(); worldUpdate(t, VP, VP, cam.position); fxUpdate(t, VP, VP); }
  if (window.dbgHide) window.dbgHide();
  hudAt(t); drawFrame(t);
  return true;
};
// portada: el avión saliendo de las nubes junto al altímetro en 12,484 (sin HUD)
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : K.nota + 1.2; frame(t);
  if (window.COVER_CAM) { const C = window.COVER_CAM; cam.fov = C[6]; cam.updateProjectionMatrix(); cam.position.set(C[0], C[1], C[2]); cam.up.set(0, 1, 0); cam.lookAt(C[3], C[4], C[5]); cam.updateMatrixWorld(); }
  if (window.camOverride) window.camOverride(cam, v3);
  const VP = vpOf(); worldUpdate(t, VP, VP, cam.position); fxUpdate(t, VP, VP);
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
    aero0: atL(1, 'aeroespacial'), acabas: atL(1, 'acabas'), y1: atL(1, '=y'), no1: atL(1, '=no'), aero1: atL(1, 'aeronautico'),
    al1: atL(2, '=al'), que1: atL(2, '=que'),
    y3: atL(3, '=y'), politecnica: atL(3, 'politecnica'), un3: atL(3, '=un'), nota: atL(3, '12484'), sobre: atL(3, 'sobre'), y2025: atL(3, '2025'),
    crees: atL(4, 'crees'), aviones4: atL(4, 'aviones'), va4: atL(4, '=va', 2), todo4: atL(4, 'todo'), lo4: atL(4, '=lo'), vuela4: atL(4, 'vuela'), asi4: atL(4, 'asi'),
    base5: atL(5, 'base'), calculo: atL(5, 'calculo'), algebra: atL(5, 'algebra'), fisica: atL(5, 'fisica'), quimica: atL(5, 'quimica'), dibujo: atL(5, 'dibujo'),
    aerod: atL(6, 'aerodinamica'), avion6: atL(6, '=avion'), toneladas: atL(6, 'toneladas'), sostiene: atL(6, 'sostiene'),
    estructuras: atL(7, 'estructuras'), alas: atL(7, 'alas'), sin7: atL(7, '=sin'), fibra: atL(7, 'fibra'), carbono: atL(7, 'carbono'),
    propulsion: atL(8, 'propulsion'), motores: atL(8, 'motores'), reaccion: atL(8, 'reaccion'), cohetes: atL(8, 'cohetes'),
    mecanica: atL(9, 'mecanica'), como9: atL(9, 'como'), satelite: atL(9, 'satelite'), orbita: atL(9, 'orbita'), porque9: atL(9, '=por'), cae: atL(9, 'cae'),
    y10: atL(10, '=y'), navegacion: atL(10, 'navegacion'), aeropuertos: atL(10, 'aeropuertos'), miles10: atL(10, 'miles'), sin10: atL(10, '=sin'),
    de11: atL(11, '=de'), aviones11: atL(11, 'aviones'), motores11: atL(11, 'motores'), cohetes11: atL(11, 'cohetes'), satelites11: atL(11, 'satelites'), y11: atL(11, '=y'), vuele11: atL(11, 'vuele'), seguro11: atL(11, 'seguro'),
    y12: atL(12, '=y'), falta12: atL(12, 'falta'), ingeniero12: atL(12, 'ingeniero'), el12: atL(12, '=el'), master1: atL(12, 'master'),
    profesion: atL(13, 'profesion'), regulada: atL(13, 'regulada'), grado: atL(13, 'grado'), tecnico: atL(13, 'tecnico'), para13: atL(13, '=para'), ingeniero13b: atL(13, 'ingeniero', 2),
    master2: atL(13, 'master'), habilitante: atL(13, 'habilitante'), en13: atL(13, '=en', 1), y4: atL(13, '=4'), dos: atL(13, '=2'),
    seis: atL(14, '=6'), para14: atL(14, '=para'), todo14: atL(14, 'todo'), vuela14: atL(14, 'vuela'),
    si3: atL(15, '=si'), guardalo: atL(15, 'guardalo'), cuentame: atL(15, 'cuentame'), te2: atL(15, '=te'),
  };
  mats(); buildRig(); buildWorld(); scene.environment = skyEnv(); scene.environmentIntensity = 1.0;
  buildGrad(); buildClimb(); buildFamily(); buildTunnel(); buildAero(); buildWing(); buildEngine(); await buildEarth(); buildFormation();
  post.uniforms.ca.value = 0.45;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
