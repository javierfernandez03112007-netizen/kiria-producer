// «GTA 6: el dinero»: un paseo marítimo de día con torres de billetes que salen de la arena (la altura es el dinero) frente a la bobina de la película más
// taquillera, la torre de cristal de GTA 6 que se llena al final, el contador de días de GTA 5, las copias frente a Brasil, el rascacielos y el precio.
// window.renderAt(t) dibuja el instante t (60 fps).
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
const R_ST = 11.0, R_CAM = 13.6;
const ANG = { CO: 30, PI: 78, BA: 126, CU: 174, PA: 222, DE: 300 };
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
  M.cloth = new THREE.MeshPhysicalMaterial({ color: 0x08090c, roughness: 0.78, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0x2c2f37) });
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
// ---------------------------------------------------------------- el paseo marítimo de día (maqueta low-poly de colores vivos): hoteles art déco de colores pastel con toldos y
// terrazas, la avenida con coches, el paseo con palmeras y farolas, la playa con casetas de socorrista, sombrillas y gente, y el mar turquesa.
// Escala: 1 unidad = 10 m (una persona mide 0,175). La avenida va a lo largo de z; el mar queda a +x.
const BV = { HX: -3.2, R0: -2.6, R1: -0.6, P1: 0.9, SEA: 10.6, Z0: 18, Z1: -50 };
const BW = 0.28, FH = 0.3, GH = 0.42;                 // ancho de un hueco de ventana, alto de un piso, alto del bajo comercial
const GAPS = [-8.6, -27.5];                     // calles que cruzan hacia el interior
const flatM = (c, r = 0.85, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0, flatShading: true, ...o });
const PER = (f) => Math.round(f * END) / END;          // frecuencias con un número entero de ciclos en todo el vídeo (bucle perfecto)
const cyc = (t, f, ph = 0) => Math.sin(6.2832 * PER(f) * t + ph);
const _m4b = new THREE.Object3D();
// ---------- cielo, nubes y luz del sol
function buildDay() {
  const g = new THREE.SphereGeometry(320, 48, 24), p = g.attributes.position, col = [];
  const top = new THREE.Color(0x1f6fd8), hor = new THREE.Color(0xa9dcff), bot = new THREE.Color(0xd0ecff);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 320, c = y > 0 ? hor.clone().lerp(top, Math.pow(Math.min(1, y * 1.6), 0.7)) : bot; col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  S.sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); S.sky.frustumCulled = false; S.sky.renderOrder = -10; scene.add(S.sky);
  scene.background = new THREE.Color(0xa9dcff); scene.fog = new THREE.Fog(0xbfe4ff, 30, 140);
  S.cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, emissive: 0xd2e2f2, emissiveIntensity: 0.5, fog: false });
  S.clouds = [];
  for (let i = 0; i < 30; i++) { const c = new THREE.Group(), n = 4 + Math.floor(hash(i * 2.3) * 4);
    for (let k = 0; k < n; k++) { const r = 0.6 + hash(i * 3 + k) * 0.8, b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), S.cloudM); b.position.set((k - n / 2) * 0.7 + (hash(i + k * 7) - 0.5) * 0.4, (hash(i * 5 + k) - 0.3) * 0.4, (hash(i * 9 + k) - 0.5) * 0.7); b.scale.y = 0.7; c.add(b); }
    const a = hash(i * 7.7) * 6.283, d = 18 + hash(i * 4.1) * 50; c.position.set(4 + Math.cos(a) * d, 10 + hash(i * 6.6) * 7, -10 + Math.sin(a) * d); c.scale.setScalar(1.1 + hash(i * 8.8) * 1.4); c.rotation.y = hash(i) * 3; scene.add(c); S.clouds.push(c); }
  const R = S.rig; R.key.castShadow = false; R.key.intensity = 0; R.a.intensity = R.b.intensity = R.f.intensity = 0;
  R.sun.color.set(0xfff1de); R.sun.intensity = 4.6; R.sun.castShadow = true; R.sun.shadow.mapSize.set(2048, 2048); R.sun.shadow.bias = -0.0005; R.sun.shadow.normalBias = 0.012; R.sun.shadow.radius = 2;
  R.sun.shadow.camera.near = 0.5; R.sun.shadow.camera.far = 110; R.hemi.color.set(0xcde6ff); R.hemi.groundColor.set(0xb8a07a); R.hemi.intensity = 1.85;
}
const SUN_D = new THREE.Vector3(0.32, 0.8, 0.5).normalize();      // sol alto, detrás de la cámara (que mira casi siempre hacia −z y el mar)
function sunAt(c, size) { const R = S.rig.sun; R.position.copy(c).addScaledVector(SUN_D, 50); R.target.position.copy(c); R.target.updateMatrixWorld();
  const sc = R.shadow.camera; sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.updateProjectionMatrix(); }
// ---------- texturas
const DECO = [['#f7b9c9', '#ffffff', '#3fb8b0'], ['#a9e4cf', '#ffffff', '#f06f8f'], ['#c8b8ec', '#fffaf0', '#ffb347'], ['#a7d7f2', '#ffffff', '#f2c230'], ['#f8e08e', '#ffffff', '#2f9fb8'],
  ['#ffc6a0', '#fffaf2', '#3a9e8c'], ['#f5f1e8', '#9fdcd2', '#e85a8a'], ['#b8ecd9', '#fff5e8', '#7a5cc8'], ['#ffd6e4', '#ffffff', '#1f9fd0'], ['#e4f1b0', '#ffffff', '#ee6b4a']];
const HOTEL = ['CORAL', 'BRISA', 'AURORA', 'MARINA', 'PALMA', 'ESTRELLA', 'OCÉANO', 'LUNA', 'SIRENA', 'ATLÁNTICO', 'PARAÍSO', 'TROPICAL', 'FLAMENCO', 'DELFÍN'];
function decoTex(st, v) {      // 3 huecos × 2 pisos: ventanas corridas con «cejas» blancas encima y una franja de color en el centro
  return canvasTex(384, 256, (g, w, h) => { const [wall, trim, acc] = DECO[st]; g.fillStyle = wall; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(0,0,0,${0.012 + hash(i * 3.3 + st) * 0.025})`; g.fillRect(hash(i * 1.7 + st + v) * w, hash(i * 2.9 + st) * h, 3, 3); }
    for (let f = 0; f < 2; f++) { const y0 = f * 128 + 34;
      for (let c = 0; c < 3; c++) { const x0 = c * 128 + 18, ww = 92, wh = 70, k = st * 7 + v * 13 + f * 3 + c;
        const gr = g.createLinearGradient(0, y0, 0, y0 + wh); gr.addColorStop(0, '#cfe9fb'); gr.addColorStop(0.5, '#6f9fc4'); gr.addColorStop(1, '#2f4a66'); g.fillStyle = gr; g.fillRect(x0, y0, ww, wh);
        g.fillStyle = trim; for (let q = 1; q < 3; q++) g.fillRect(x0 + q * ww / 3 - 2, y0, 4, wh);
        const bl = hash(k * 1.91) * 0.6; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x0, y0, ww, wh * bl * 0.5);
        g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x0 + 6, y0 + 8, 10, wh - 16); }
      g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, y0 - 8, w, 8); g.fillStyle = trim; g.fillRect(0, y0 - 14, w, 7);
      g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, y0 + 72, w, 4); }
    if (v % 2 === 0) { g.fillStyle = acc; g.fillRect(w / 2 - 10, 0, 20, h); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(w / 2 - 10, 0, 4, h); } });
}
const SHOPS = ['CAFÉ', 'HELADOS', 'SURF', 'BAR', 'GAFAS DE SOL', 'BAÑADORES', 'ZUMOS', 'PIZZA', 'TACOS', 'MARISCOS', 'BOUTIQUE', 'RECUERDOS'];
function shopTex(n, seed, wall) {     // el bajo: n locales con su rótulo, cristaleras y terraza
  return canvasTex(256 * n, 160, (g, w, h) => { g.fillStyle = wall; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(0, h - 10, w, 10);
    for (let i = 0; i < n; i++) { const k = Math.floor(hash(seed * 3.1 + i * 7.3) * SHOPS.length), x0 = i * 256 + 22, c = DECO[Math.floor(hash(seed + i * 5.1) * DECO.length)][2];
      g.fillStyle = '#ffffff'; g.fillRect(x0 - 6, 10, 224, 36); g.fillStyle = c; g.font = '900 28px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(SHOPS[k], x0 + 106, 29);
      const gr = g.createLinearGradient(0, 52, 0, h); gr.addColorStop(0, '#2c4258'); gr.addColorStop(1, '#16222e'); g.fillStyle = gr; g.fillRect(x0, 52, 212, h - 62);
      g.fillStyle = 'rgba(190,220,240,.28)'; g.fillRect(x0 + 8, 58, 80, h - 74); g.fillStyle = 'rgba(255,214,150,.35)'; g.fillRect(x0 + 120, 90, 70, 40); } });
}
function awningTex(c) { return canvasTex(128, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : c; g.fillRect(i * 16, 0, 16, h); } g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, h - 6, w, 6); }); }
function signTex(name, c) { return canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = c; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = c; g.font = '900 64px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; const L = [...name]; const step = Math.min(68, (h - 60) / L.length); L.forEach((ch, i) => g.fillText(ch, w / 2, 40 + step * (i + 0.5))); }); }
// ---------- edificios: hotel art déco (cuerpo pastel, cejas sobre las ventanas, corona escalonada con el rótulo vertical, toldo y terraza)
function hotel(x, z, wCols, floors, st, v, name) {
  const g = new THREE.Group(), wd = wCols * BW, hh = GH + floors * FH, dp = 1.4, [wall, trim, acc] = DECO[st];
  const body = new THREE.Mesh(new THREE.BoxGeometry(wd, hh, dp), flatM(wall, 0.9)); body.position.set(0, hh / 2, -dp / 2); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const ft = decoTex(st, v); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(wCols / 3, floors / 2);
  const fac = new THREE.Mesh(new THREE.PlaneGeometry(wd, floors * FH), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.85 })); fac.position.set(0, GH + floors * FH / 2, 0.003); fac.receiveShadow = true; g.add(fac);
  const nShop = wCols >= 6 ? 2 : 1, shop = new THREE.Mesh(new THREE.PlaneGeometry(wd, GH), new THREE.MeshStandardMaterial({ map: shopTex(nShop, x * 3.1 + z * 7.7, wall), roughness: 0.8 })); shop.position.set(0, GH / 2, 0.003); shop.receiveShadow = true; g.add(shop);
  // corona: dos escalones y el rótulo vertical con el nombre del hotel
  const c1 = new THREE.Mesh(new THREE.BoxGeometry(wd * 0.62, 0.16, 0.5), flatM(wall, 0.9)); c1.position.set(0, hh + 0.08, -0.3); c1.castShadow = true; g.add(c1);
  const c2 = new THREE.Mesh(new THREE.BoxGeometry(wd * 0.3, 0.14, 0.3), flatM(trim, 0.9)); c2.position.set(0, hh + 0.23, -0.25); c2.castShadow = true; g.add(c2);
  const cap0 = new THREE.Mesh(new THREE.BoxGeometry(wd + 0.04, 0.03, dp + 0.02), flatM(trim, 0.7)); cap0.position.set(0, hh + 0.012, -dp / 2); cap0.castShadow = true; g.add(cap0);
  if (name) { const sh = Math.min(0.9, floors * FH * 0.55), sg = new THREE.Mesh(new THREE.BoxGeometry(0.1, sh, 0.02), [flatM(trim), flatM(trim), flatM(trim), flatM(trim), new THREE.MeshStandardMaterial({ map: signTex(name, acc), roughness: 0.6 }), flatM(trim)]);
    sg.position.set(0, hh - sh / 2 + 0.2, 0.05); sg.castShadow = true; g.add(sg); }
  // franja vertical de color (aleta) en el centro
  if (v % 2 === 0) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, floors * FH, 0.04), flatM(acc, 0.8)); fin.position.set(0, GH + floors * FH / 2, 0.02); fin.castShadow = true; g.add(fin); }
  // toldo a rayas sobre el bajo
  const aw = new THREE.Mesh(new THREE.BoxGeometry(wd * 0.94, 0.008, 0.16), [flatM(acc), flatM(acc), new THREE.MeshStandardMaterial({ map: awningTex(acc), roughness: 0.8 }), flatM(acc), flatM(acc), flatM(acc)]);
  aw.position.set(0, GH - 0.03, 0.08); aw.rotation.x = 0.28; aw.castShadow = true; g.add(aw);
  g.position.set(x, 0, z); g.rotation.y = Math.PI / 2; scene.add(g);
  return { g, wd, hh, floors, wCols, st };
}
// ---------- palmeras (tronco curvo con anillos y nueve hojas que se mecen)
function frondTex() { return canvasTex(64, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#3d7a2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 6); g.stroke();
  for (let y = 10; y < h - 6; y += 7) { const L = (w / 2 - 2) * Math.sin(Math.PI * (h - y) / h * 0.95 + 0.1); g.strokeStyle = ['#4f9a36', '#5fae3e', '#3f8a2e'][y % 3]; g.lineWidth = 3.2;
    g.beginPath(); g.moveTo(w / 2, y + 6); g.lineTo(w / 2 - L, y - 4); g.moveTo(w / 2, y + 6); g.lineTo(w / 2 + L, y - 4); g.stroke(); } }); }
function trunkTex() { return canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#9b7a55'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 12) { g.fillStyle = 'rgba(60,40,22,.45)'; g.fillRect(0, y, w, 3); g.fillStyle = 'rgba(255,240,210,.18)'; g.fillRect(0, y + 4, w, 2); } }); }
function buildPalms(spots) {
  const NV = 3, trunks = [], tm = new THREE.MeshStandardMaterial({ map: trunkTex(), roughness: 0.9 });
  for (let v = 0; v < NV; v++) { const lean = 0.12 + v * 0.07, pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(v3(lean * u * u, u, 0)); }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.022, 7, false); const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const y = pa.getY(i), s = 1.25 - 0.35 * y; pa.setX(i, (pa.getX(i) - lean * y * y) * s + lean * y * y); pa.setZ(i, pa.getZ(i) * s); }
    geo.computeVertexNormals(); trunks.push({ geo, top: v3(lean, 1, 0), list: [] }); }
  spots.forEach((s, i) => trunks[i % NV].list.push(s));
  S.palmTr = trunks.map(T => { const m = new THREE.InstancedMesh(T.geo, tm, Math.max(1, T.list.length)); m.castShadow = true; m.receiveShadow = true;
    T.list.forEach((s, j) => { _m4b.position.set(s.x, 0, s.z); _m4b.rotation.set(0, s.ry, 0); _m4b.scale.setScalar(s.h); _m4b.updateMatrix(); m.setMatrixAt(j, _m4b.matrix); }); scene.add(m); return m; });
  // hojas: un plano doblado (cae hacia fuera) con la textura de la hoja
  const fg = new THREE.PlaneGeometry(0.11, 0.5, 1, 8).translate(0, 0.25, 0), fp = fg.attributes.position;
  for (let i = 0; i < fp.count; i++) { const y = fp.getY(i) / 0.5; fp.setZ(i, -0.2 * y * y); fp.setX(i, fp.getX(i) * (1 - 0.15 * y)); }
  fg.rotateX(-Math.PI / 2 + 0.25); fg.computeVertexNormals();
  const fm = new THREE.MeshStandardMaterial({ map: frondTex(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 });
  S.palms = []; trunks.forEach(T => T.list.forEach(s => { const top = T.top.clone().multiplyScalar(s.h).applyAxisAngle(v3(0, 1, 0), s.ry).add(v3(s.x, 0, s.z)); S.palms.push({ top, h: s.h, ph: hash(s.x * 3 + s.z) * 6.28 }); }));
  S.frond = new THREE.InstancedMesh(fg, fm, S.palms.length * 9); S.frond.castShadow = true; S.frond.frustumCulled = false; scene.add(S.frond);
  const nut = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.018, 0), flatM(0x6b4a22), S.palms.length * 3); S.palms.forEach((p, i) => { for (let k = 0; k < 3; k++) { _m4b.position.copy(p.top).add(v3(Math.cos(k * 2.1) * 0.025, -0.02, Math.sin(k * 2.1) * 0.025)); _m4b.rotation.set(0, 0, 0); _m4b.scale.setScalar(p.h); _m4b.updateMatrix(); nut.setMatrixAt(i * 3 + k, _m4b.matrix); } }); scene.add(nut);
  palmsAt(0);
}
const _qf = new THREE.Quaternion(), _ef = new THREE.Euler(), _vf = new THREE.Vector3(), _sf = new THREE.Vector3();
function palmsAt(t) {
  let n = 0;
  for (const p of S.palms) for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283 + p.ph, sway = 0.08 * cyc(t, 0.5, p.ph + k * 0.7) + 0.05 * cyc(t, 0.9, p.ph * 2 + k);
    _qf.setFromEuler(_ef.set(-0.15 - (k % 3) * 0.18 + sway, a, 0, 'YXZ')); _sf.setScalar(p.h * (0.85 + (k % 2) * 0.2)); _m4.compose(p.top, _qf, _sf); S.frond.setMatrixAt(n++, _m4); }
  S.frond.instanceMatrix.needsUpdate = true;
}
// ---------- el mar: degradado turquesa → azul y olas que se mueven (mapa de normales), con la espuma en la orilla
function waveNormalTex() { const N = 256; return canvasTex(N, N, (g, w, h) => { const im = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let dx = 0, dy = 0; for (let k = 1; k <= 4; k++) { const a = k * 1.7, fx = Math.round(2 + hash(k) * 3), fy = Math.round(1 + hash(k * 3) * 4), ph = hash(k * 7) * 6.28;
      const s = Math.cos(6.2832 * (fx * x / w + fy * y / h) + ph) / k; dx += s * fx; dy += s * fy; }
    const i = (y * w + x) * 4; im.data[i] = 128 + dx * 9; im.data[i + 1] = 128 + dy * 9; im.data[i + 2] = 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); }); }
function buildSea() {
  const g = new THREE.PlaneGeometry(260, 260, 60, 1); g.rotateX(-Math.PI / 2); g.translate(BV.SEA + 130, -0.03, -10);
  const p = g.attributes.position, col = [], near = new THREE.Color(0x3fd6c8), mid = new THREE.Color(0x1aa0d0), far = new THREE.Color(0x1660b0);
  for (let i = 0; i < p.count; i++) { const d = p.getX(i) - BV.SEA, c = d < 6 ? near.clone().lerp(mid, d / 6) : mid.clone().lerp(far, Math.min(1, (d - 6) / 40)); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const nt = waveNormalTex(); nt.colorSpace = THREE.NoColorSpace; nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(70, 70);
  S.seaM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.05, normalMap: nt, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.4 });
  const sea = new THREE.Mesh(g, S.seaM); sea.receiveShadow = true; scene.add(sea); S.sea = sea;
  // espuma de la orilla (dos franjas que suben y bajan)
  const ft = canvasTex(64, 512, (gg, w, h) => { gg.clearRect(0, 0, w, h); for (let i = 0; i < 900; i++) { gg.fillStyle = `rgba(255,255,255,${0.25 + hash(i) * 0.6})`; const y = hash(i * 3.3) * h, x = Math.pow(hash(i * 7.1), 1.8) * w * 0.9; gg.beginPath(); gg.arc(x, y, 1.5 + hash(i * 9) * 3, 0, 7); gg.fill(); }
    const gr = gg.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.25, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, w, h); });
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(1, 30);
  S.foam = [0, 1].map(i => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 120).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: ft.clone(), transparent: true, depthWrite: false, roughness: 0.6 }));
    m.material.map.needsUpdate = true; m.material.map.repeat.set(1, 30); m.material.map.offset.y = i * 0.37; m.position.set(BV.SEA + 0.3, -0.012 + i * 0.002, -14); m.renderOrder = 2; scene.add(m); return m; });
}
// ---------- casetas de socorrista, sombrillas, toallas y tumbonas
function lifeguard(x, z, c, ry) {
  const g = new THREE.Group(); const cab = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.13), flatM(c, 0.8)); cab.position.y = 0.17; cab.castShadow = true; g.add(cab);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.005), flatM(0x2f4a66, 0.3)); win.position.set(0, 0.185, 0.066); g.add(win);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.07, 4).rotateY(Math.PI / 4), flatM(0xffffff, 0.7)); roof.position.y = 0.26; roof.scale.set(1.05, 1, 0.85); roof.castShadow = true; g.add(roof);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.2), flatM(0xf4efe4)); deck.position.y = 0.11; deck.castShadow = true; g.add(deck);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.012), flatM(0xf4efe4)); l.position.set(a * 0.09, 0.055, b * 0.08); l.castShadow = true; g.add(l); }
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.2), flatM(0xf4efe4)); ramp.position.set(0, 0.055, 0.17); ramp.rotation.x = 0.55; ramp.castShadow = true; g.add(ramp);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.03), new THREE.MeshStandardMaterial({ color: 0xe53935, side: THREE.DoubleSide })); flag.position.set(0.035, 0.35, 0); g.add(flag);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 5), flatM(0xffffff)); pole.position.set(0, 0.32, 0); g.add(pole);
  g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); return g;
}
function buildBeachProps() {
  const UC = [0xff5a7a, 0xffb02e, 0x2ec4b6, 0x5a7cff, 0xf7f7f2, 0xff7b39, 0x9b5de5];
  const spots = []; for (let i = 0; i < 70; i++) { const x = 2.6 + hash(i * 2.7) * 6.6, z = 10 - hash(i * 5.3) * 52; if (Math.abs(z - (-1)) < 4.2 && x < 9.2) continue; if (Math.abs(z + 16.5) < 2.7 && x > 1.0) continue; if (Math.abs(z + 12.5) < 2.6 && x < 5.5) continue; if (Math.abs(z + 20.6) < 3.2 && x < 6.6) continue; if (z > 5 && x < 4.5) continue; spots.push([x, z, i]); }
  const canopyG = new THREE.ConeGeometry(0.11, 0.045, 8, 1, true).translate(0, 0.17, 0), poleG = new THREE.CylinderGeometry(0.003, 0.003, 0.17, 5).translate(0, 0.085, 0), towelG = new THREE.BoxGeometry(0.07, 0.003, 0.15);
  const can = new THREE.InstancedMesh(canopyG, flatM(0xffffff, 0.7, { side: THREE.DoubleSide }), spots.length), pol = new THREE.InstancedMesh(poleG, flatM(0xf2f2f2), spots.length), tow = new THREE.InstancedMesh(towelG, flatM(0xffffff), spots.length * 2);
  spots.forEach(([x, z, i], j) => { _m4b.position.set(x, 0, z); _m4b.rotation.set((hash(i) - 0.5) * 0.2, 0, (hash(i * 3) - 0.5) * 0.2); _m4b.scale.setScalar(1); _m4b.updateMatrix(); can.setMatrixAt(j, _m4b.matrix); pol.setMatrixAt(j, _m4b.matrix);
    can.setColorAt(j, new THREE.Color(UC[i % UC.length])); for (let k = 0; k < 2; k++) { _m4b.position.set(x + (k - 0.5) * 0.09, 0.002, z + 0.08); _m4b.rotation.set(0, (hash(i + k) - 0.5) * 0.5, 0); _m4b.updateMatrix(); tow.setMatrixAt(j * 2 + k, _m4b.matrix); tow.setColorAt(j * 2 + k, new THREE.Color(UC[(i + k + 2) % UC.length])); } });
  can.castShadow = pol.castShadow = true; tow.receiveShadow = true; scene.add(can, pol, tow);
  S.lifeguards = [[3.6, 9, 0xff8fb0], [9.3, -3.4, 0x7fd8c8], [8.7, -9.4, 0xffd166], [8.6, -31, 0xb39ddb], [6.4, -40, 0x80c4ff]].map(([x, z, c], i) => lifeguard(x, z, c, -Math.PI / 2 + (i % 2 ? 0.25 : -0.2)));
}
// ---------- coches por la avenida (van y vuelven en bucle: un número entero de vueltas en todo el vídeo)
function buildCars() {
  const CC = [0xff6f91, 0x5ad1c3, 0xfff1d6, 0xffc93c, 0x6c8cff, 0xf5f5f5, 0xff8a3d, 0x9be15d, 0xc77dff, 0x3ac0ff];
  const body = new THREE.BoxGeometry(0.085, 0.035, 0.2).translate(0, 0.03, 0), cabin = new THREE.BoxGeometry(0.075, 0.028, 0.09).translate(0, 0.061, -0.012), wheel = new THREE.CylinderGeometry(0.016, 0.016, 0.012, 10).rotateZ(Math.PI / 2);
  const N = 14; S.cars = [];
  for (let i = 0; i < N; i++) S.cars.push({ lane: i % 2, ph: hash(i * 3.7), col: CC[i % CC.length], n: 1 + (i % 3 === 0 ? 1 : 0) });
  const mb = new THREE.InstancedMesh(body, paint(0xffffff, 0.3), N), mc = new THREE.InstancedMesh(cabin, new THREE.MeshPhysicalMaterial({ color: 0x1d2a38, roughness: 0.08, metalness: 0.4, clearcoat: 1 }), N), mw = new THREE.InstancedMesh(wheel, flatM(0x15171c, 0.6), N * 4);
  S.cars.forEach((c, i) => mb.setColorAt(i, new THREE.Color(c.col))); mb.castShadow = mc.castShadow = mw.castShadow = true; mb.receiveShadow = true; scene.add(mb, mc, mw); S.carM = { mb, mc, mw };
}
function carsAt(t) {
  const L = BV.Z0 - BV.Z1, { mb, mc, mw } = S.carM;
  S.cars.forEach((c, i) => { const v = c.n * L / END, u = ((c.ph * L + v * t) % L + L) % L, dir = c.lane ? 1 : -1, z = c.lane ? BV.Z1 + u : BV.Z0 - u, x = c.lane ? -1.15 : -2.05;
    _m4b.position.set(x, 0.006, z); _m4b.rotation.set(0, c.lane ? 0 : Math.PI, 0); _m4b.scale.setScalar(1); _m4b.updateMatrix(); mb.setMatrixAt(i, _m4b.matrix); mc.setMatrixAt(i, _m4b.matrix);
    for (let k = 0; k < 4; k++) { const wx = (k % 2 ? 1 : -1) * 0.044, wz = (k < 2 ? 1 : -1) * 0.065; _m4.makeTranslation(wx, 0.016, wz).premultiply(_m4b.matrix); mw.setMatrixAt(i * 4 + k, _m4); } });
  mb.instanceMatrix.needsUpdate = mc.instanceMatrix.needsUpdate = mw.instanceMatrix.needsUpdate = true;
}
function buildCity() {
  // suelo: asfalto (avenida y fondo), acera de los hoteles, paseo marítimo con murete, arena y orilla mojada
  const asph = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#5f646c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const l = hash(i) > 0.5; g.fillStyle = l ? `rgba(255,255,255,${0.03 + hash(i * 3) * 0.05})` : `rgba(0,0,0,${0.04 + hash(i * 3) * 0.06})`; g.fillRect(hash(i * 7) * w, hash(i * 11) * h, 2, 2); } });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(60, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.position.set(-118 + BV.R1, -0.001, 0); ground.receiveShadow = true; scene.add(ground);
  const tiles = (base, line, sz = 256) => { const t = canvasTex(sz, sz, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); g.strokeStyle = line; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${hash(i) * 0.035})`; g.fillRect(hash(i * 5) * w, hash(i * 9) * h, 3, 3); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const L = BV.Z0 - BV.Z1, zc = (BV.Z0 + BV.Z1) / 2;
  { const t = tiles('#e9e1d4', 'rgba(0,0,0,.12)'); t.repeat.set(0.6 / 0.25, L / 0.25); const sw = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, L), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); sw.position.set(BV.HX + 0.3, 0.01, zc); sw.receiveShadow = true; scene.add(sw); }
  { const t = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f6efe6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f08fb0'; g.lineWidth = 10; for (let k = 0; k < 3; k++) { g.beginPath(); for (let y = 0; y <= h; y += 4) { const x = w * (0.2 + k * 0.3) + Math.sin(y / h * 6.283 * 2) * 18; y ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${hash(i) * 0.03})`; g.fillRect(hash(i * 5) * w, hash(i * 9) * h, 3, 3); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, L / 1.5); const pm = new THREE.Mesh(new THREE.BoxGeometry(BV.P1 - BV.R1, 0.022, L), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 })); pm.position.set((BV.P1 + BV.R1) / 2, 0.011, zc); pm.receiveShadow = true; scene.add(pm); }
  const curbM = flatM(0xd9d2c4); for (const x of [BV.R0, BV.R1]) { const cb = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.026, L), curbM); cb.position.set(x, 0.013, zc); cb.receiveShadow = true; scene.add(cb); }
  { const wm = flatM(0xffffff, 0.7), segs = []; for (let z = BV.Z0; z > BV.Z1; z -= 3.2) segs.push(z); S.wallSegs = segs;
    const w = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.07, 2.6).translate(0, 0.035, -1.3), wm, segs.length); segs.forEach((z, i) => { _m4b.position.set(BV.P1, 0, z - 0.3); _m4b.rotation.set(0, 0, 0); _m4b.scale.setScalar(1); _m4b.updateMatrix(); w.setMatrixAt(i, _m4b.matrix); }); w.castShadow = w.receiveShadow = true; scene.add(w); }
  { const sand = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#efd9a8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 14000; i++) { g.fillStyle = hash(i) > 0.5 ? `rgba(255,250,235,${0.08 + hash(i * 3) * 0.1})` : `rgba(150,110,60,${0.05 + hash(i * 3) * 0.08})`; g.fillRect(hash(i * 7) * w, hash(i * 11) * h, 2, 2); } });
    sand.wrapS = sand.wrapT = THREE.RepeatWrapping; sand.repeat.set(10, 60);
    const g = new THREE.PlaneGeometry(BV.SEA + 1.5 - BV.P1, 200, 24, 1); g.rotateX(-Math.PI / 2); g.translate((BV.SEA + 1.5 + BV.P1) / 2, 0, -15);
    const p = g.attributes.position, col = []; for (let i = 0; i < p.count; i++) { const x = p.getX(i), d = (x - BV.P1) / (BV.SEA - BV.P1); p.setY(i, 0.004 - Math.max(0, d - 0.55) * 0.07); const wet = clamp((x - (BV.SEA - 1.0)) / 0.8); const c = new THREE.Color(0xffffff).lerp(new THREE.Color(0xb5a48a), wet * 0.7); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const sm = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: sand, vertexColors: true, roughness: 0.95 })); sm.receiveShadow = true; scene.add(sm); }
  { const wm = flatM(0xf4f4f0, 0.6), dashes = [], zebra = []; for (let z = BV.Z0; z > BV.Z1; z -= 0.5) if (!GAPS.some(zc2 => Math.abs(z - zc2) < 0.5)) dashes.push(z);
    for (const z0 of GAPS) for (let x = BV.R0 + 0.12; x < BV.R1 - 0.05; x += 0.13) zebra.push([x, z0 + 0.45]);
    const da = new THREE.InstancedMesh(new THREE.BoxGeometry(0.025, 0.003, 0.22), wm, dashes.length); dashes.forEach((z, i) => { _m4b.position.set((BV.R0 + BV.R1) / 2, 0.0015, z); _m4b.rotation.set(0, 0, 0); _m4b.scale.setScalar(1); _m4b.updateMatrix(); da.setMatrixAt(i, _m4b.matrix); }); da.receiveShadow = true; scene.add(da);
    const ze = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.003, 0.34), wm, zebra.length); zebra.forEach(([x, z], i) => { _m4b.position.set(x, 0.0015, z); _m4b.updateMatrix(); ze.setMatrixAt(i, _m4b.matrix); }); ze.receiveShadow = true; scene.add(ze); }
  // hoteles: primera fila frente al mar (con las calles que cruzan), una segunda fila de torres detrás y el perfil de la ciudad al fondo
  const B = []; let seed = 5, zz = BV.Z0 - 0.5;
  while (zz > BV.Z1 + 1) { const cols = hash(seed * 1.7) < 0.5 ? 6 : 9, wd = cols * BW, fl = [5, 6, 7, 8, 9][Math.floor(hash(seed * 2.9) * 5)];
    const gap = GAPS.find(z0 => zz - wd < z0 + 0.5 && zz > z0 - 0.5); if (gap !== undefined) { zz = gap - 0.5; continue; }
    B.push(hotel(BV.HX, zz - wd / 2, cols, fl, Math.floor(hash(seed * 4.3) * DECO.length), seed % 3, HOTEL[seed % HOTEL.length])); zz -= wd + 0.02; seed++; }
  for (let z = BV.Z0 - 1; z > BV.Z1 + 2; z -= 2.9) { const fl = 12 + Math.floor(hash(z * 3) * 6) * 2; B.push(hotel(BV.HX - 2.6, z, 6, fl, Math.floor(hash(z * 7) * DECO.length), 1, null)); }
  for (let i = 0; i < 90; i++) { const x = -9 - hash(i * 3.3) * 40, z = 20 - hash(i * 5.5) * 85, h = 2 + hash(i * 1.1) * 7; const bx2 = new THREE.Mesh(new THREE.BoxGeometry(1 + hash(i) * 2.2, h, 1 + hash(i * 2) * 2.2), flatM(new THREE.Color(DECO[i % DECO.length][0]).getHex(), 0.9));
    bx2.position.set(x, h / 2, z); scene.add(bx2); }
  S.buildings = B;
  // cejas de verdad (losas finas sobre cada piso) y terrazas con mesas en la acera
  { const ed = []; for (const b of B) { b.g.updateMatrixWorld(true); for (let f = 1; f <= b.floors; f++) ed.push(new THREE.Matrix4().multiplyMatrices(b.g.matrixWorld, new THREE.Matrix4().makeTranslation(0, GH + f * FH - 0.035, 0.025))); }
    const eb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.012, 0.05), flatM(0xffffff, 0.7), ed.length);     // ancho de cada ceja = ancho del hotel
    let k = 0; for (const b of B) for (let f = 1; f <= b.floors; f++) { eb.setMatrixAt(k, ed[k].clone().multiply(new THREE.Matrix4().makeScale(b.wd * 0.98, 1, 1))); k++; }
    eb.castShadow = true; eb.receiveShadow = true; scene.add(eb);
    const tb = []; for (const b of B) if (Math.abs(b.g.position.x - BV.HX) < 0.01) for (let q = -1; q <= 1; q += 2) tb.push([BV.HX + 0.38, b.g.position.z + q * b.wd * 0.25]);
    const top = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.022, 0.022, 0.004, 10).translate(0, 0.045, 0), flatM(0xffffff), tb.length), leg = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.003, 0.003, 0.045, 5).translate(0, 0.0225, 0), flatM(0x30343c), tb.length);
    const umb = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.025, 8, 1, true).translate(0, 0.11, 0), flatM(0xffffff, 0.7, { side: THREE.DoubleSide }), tb.length), up = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.002, 0.002, 0.11, 4).translate(0, 0.055, 0), flatM(0xf0f0f0), tb.length);
    tb.forEach(([x, z], i) => { _m4b.position.set(x, 0.02, z); _m4b.rotation.set(0, 0, 0); _m4b.scale.setScalar(1); _m4b.updateMatrix(); top.setMatrixAt(i, _m4b.matrix); leg.setMatrixAt(i, _m4b.matrix); umb.setMatrixAt(i, _m4b.matrix); up.setMatrixAt(i, _m4b.matrix); umb.setColorAt(i, new THREE.Color([0xff7aa2, 0x3cc6b4, 0xffc247, 0x7a8cff][i % 4])); });
    top.castShadow = umb.castShadow = true; scene.add(top, leg, umb, up); }
  // palmeras (en el paseo y alguna en la arena) y farolas
  { const sp = []; for (let z = BV.Z0 - 0.4; z > BV.Z1; z -= 1.05) if (z < 2.4 || z > 10.6) sp.push({ x: 0.05 + (hash(z) - 0.5) * 0.12, z, ry: hash(z * 3.1) * 6.28, h: 0.95 + hash(z * 5.7) * 0.35 });
    for (let z = BV.Z0 - 0.9; z > BV.Z1; z -= 2.1) sp.push({ x: BV.R0 - 0.05 + (hash(z * 2) - 0.5) * 0.06, z, ry: hash(z * 9.1) * 6.28, h: 0.8 + hash(z * 2.7) * 0.25 });
    for (let i = 0; i < 16; i++) { const x = 1.4 + hash(i * 4.4) * 1.0, z = 12 - hash(i * 6.6) * 60; if (Math.abs(z + 1) < 4.5 || Math.abs(z + 11.5) < 3.7 || Math.abs(z + 16.5) < 2.6 || Math.abs(z + 20.6) < 3.4 || z > 3) continue; sp.push({ x, z, ry: hash(i) * 6.28, h: 1.0 + hash(i * 3) * 0.4 }); }
    buildPalms(sp);
    const lp = []; for (let z = BV.Z0 - 0.95; z > BV.Z1; z -= 2.1) lp.push([BV.R1 + 0.1, z]);
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.008, 0.5, 6).translate(0, 0.25, 0), flatM(0xf2f2f2, 0.5), lp.length), head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 10, 8), flatM(0xffffff, 0.3), lp.length);
    lp.forEach(([x, z], i) => { _m4b.position.set(x, 0, z); _m4b.rotation.set(0, 0, 0); _m4b.scale.setScalar(1); _m4b.updateMatrix(); pole.setMatrixAt(i, _m4b.matrix); _m4b.position.set(x, 0.51, z); _m4b.updateMatrix(); head.setMatrixAt(i, _m4b.matrix); });
    pole.castShadow = head.castShadow = true; scene.add(pole, head); }
  buildSea(); buildBeachProps(); buildCars(); buildCrowd(); buildMoney();
}
// ---------- la gente: piezas instanciadas (piernas, cuerpo, brazos, cabeza, pelo). Paseantes que van y vuelven por el paseo y la orilla (bucle perfecto),
// gente en la arena mirando las torres (levantan los brazos en los momentos fuertes) y la gente de la pirámide de Brasil (frase 4)
const SHIRT = [0x2f6fd0, 0xf2c230, 0xe85a8a, 0x2e9e5b, 0xf07c2a, 0x8e44ad, 0x1abc9c, 0x34495e, 0xd6262e, 0xf4f1ea, 0x5dade2, 0xb9770e, 0xff8fab, 0x7bdff2];
const PANTS = [0x2c3e64, 0x1b1f27, 0x3b4a6b, 0x6b5a45, 0x23262d, 0x4a5568, 0xe9e2d0, 0x3c6e71];
const SKIN = [0xf0c8a8, 0xe0b090, 0xc6906a, 0x9a6a48, 0x7a4e32, 0xf5d5bd], HAIR = [0x2a1d14, 0x3d2a1c, 0x14110f, 0x6b4a2a, 0xb08850, 0x8a8a8a, 0xd8c08a];
function buildCrowd() {
  const P = []; const add = o => P.push(Object.assign({ ph: hash(P.length * 1.37) * 6.283, f: 1.5 + hash(P.length * 2.71) * 0.5, A: 0, y: 0, k0: null, look: null }, o));
  for (let i = 0; i < 150; i++) { const x = BV.R1 + 0.15 + hash(i * 5.1) * 1.2, z = BV.Z0 - hash(i * 7.3) * (BV.Z0 - BV.Z1); add({ x, z, yaw: 0, A: 0.6 + hash(i * 1.9) * 1.8, grp: 0 }); }
  for (let i = 0; i < 70; i++) { const x = BV.HX + 0.15 + hash(i * 3.1) * 0.35, z = BV.Z0 - hash(i * 9.3) * (BV.Z0 - BV.Z1); if (GAPS.some(z0 => Math.abs(z - z0) < 0.5)) continue; add({ x, z, yaw: 0, A: 0.5 + hash(i * 2.9) * 1.2, grp: 0 }); }
  for (let i = 0; i < 90; i++) { const x = BV.SEA - 0.5 + hash(i * 2.3) * 0.6, z = 12 - hash(i * 4.9) * 60; add({ x, z, yaw: 0, A: 0.8 + hash(i * 3.3) * 2.2, grp: 0 }); }
  // la gente en la arena alrededor de las torres de la plaza y de las dos paradas (miran hacia arriba)
  for (const [cx, cz, r0, r1, n] of [[4.6, -1.0, 3.0, 5.2, 320], [2.6, -12.4, 1.5, 2.8, 100], [3.7, -20.6, 1.9, 3.1, 110], [7.4, -16.5, 1.6, 2.6, 70]]) for (let i = 0; i < n; i++) {
    const a = hash(i * 1.91 + cx) * 6.283, r = r0 + Math.sqrt(hash(i * 3.73 + cz)) * (r1 - r0), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.8;
    if (x < BV.P1 + 0.25 || x > BV.SEA - 0.3) continue; add({ x, z, yaw: Math.atan2(cx - x, cz - z) + (hash(i) - 0.5) * 0.6, grp: 1, cx, cz }); }
  S.people = P; S.nCrowd = P.length;
  // la pirámide de Brasil (frase 4): gente en gradas, de abajo arriba
  buildBrazilPeople(add);
  const N = P.length;
  const g = { leg: new THREE.BoxGeometry(0.021, 0.085, 0.024).translate(0, -0.0425, 0), torso: new THREE.BoxGeometry(0.052, 0.07, 0.03).translate(0, 0.035, 0), arm: new THREE.BoxGeometry(0.015, 0.066, 0.017).translate(0, -0.033, 0),
    head: new THREE.IcosahedronGeometry(0.0128, 1), hair: new THREE.SphereGeometry(0.0138, 8, 4, 0, 6.283, 0, 1.75) };
  const mk = geo => { const m = new THREE.InstancedMesh(geo, flatM(0xffffff, 0.75), N); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; };
  S.pp = { legL: mk(g.leg), legR: mk(g.leg), torso: mk(g.torso), armL: mk(g.arm), armR: mk(g.arm), head: mk(g.head), hair: mk(g.hair) };
  const c = new THREE.Color();
  P.forEach((p, i) => { const br = p.grp === 4, sh = br ? [0xf7d116, 0x1f9e4a, 0x2a5bd7, 0xf7d116, 0xffffff][i % 5] : SHIRT[Math.floor(hash(i * 4.4) * SHIRT.length)], pa = PANTS[Math.floor(hash(i * 5.5) * PANTS.length)], sk = SKIN[Math.floor(hash(i * 6.6) * SKIN.length)], hr = HAIR[Math.floor(hash(i * 7.7) * HAIR.length)];
    for (const k of ['legL', 'legR']) S.pp[k].setColorAt(i, c.set(pa)); for (const k of ['torso', 'armL', 'armR']) S.pp[k].setColorAt(i, c.set(sh)); S.pp.head.setColorAt(i, c.set(sk)); S.pp.hair.setColorAt(i, c.set(hr)); });
}
const _mA = new THREE.Matrix4(), _mB = new THREE.Matrix4(), _mC = new THREE.Matrix4(), _qc = new THREE.Quaternion(), _eu = new THREE.Euler(), _scl = new THREE.Vector3(1, 1, 1), _pp0 = new THREE.Vector3(), _zero = new THREE.Matrix4().makeScale(0, 0, 0);
function partM(base, x, y, z, rx, rz, out) { _mB.makeRotationFromEuler(_eu.set(rx, 0, rz)); _mB.setPosition(x, y, z); return out.multiplyMatrices(base, _mB); }
function cheerAt(p, i, t) {      // levantan los brazos: al reventar la torre de GTA 5, con el récord, con Brasil y cuando GTA 6 pasa a la película
  if (p.grp === 4) return t > K.brasil4 - 0.1 && t < K.y5 ? 1 : 0;
  if (p.grp !== 1 || hash(i * 3.1) > 0.45) return 0;
  if (p.cz > -5) return (t < 2.2 || (t > K.mas8 && t < END - 0.6)) ? 1 : 0;
  if (p.cz > -15) return t > K.guinness3 - 0.1 && t < K.lleva4 ? 1 : 0;
  return 0;
}
function crowdAt(t) {
  const P = S.people, pp = S.pp;
  for (let i = 0; i < P.length; i++) { const p = P[i]; const k = p.k0 ? p.k0(t) : 1;
    if (k <= 0.002) { for (const key in pp) pp[key].setMatrixAt(i, _zero); continue; }
    let x = p.x, z = p.z, yaw = p.yaw, sp = 1;
    if (p.A) { const w = 6.2832 / END, ph = w * t + p.ph; z = p.z + p.A * Math.sin(ph); const vz = p.A * w * Math.cos(ph); yaw = vz < 0 ? Math.PI : 0; sp = Math.min(1, Math.abs(vz) / 0.08); }
    const ph = 6.2832 * PER(p.f) * t + p.ph, walk = p.grp === 0, sw = Math.sin(ph) * (walk ? 0.45 * sp : 0.1), bob = Math.abs(Math.cos(ph)) * 0.004 * (walk ? sp : 0.4);
    _qc.setFromEuler(_eu.set(0, yaw + Math.sin(ph * 0.5) * 0.04, 0)); _pp0.set(x, p.y + 0.085 + bob + (walk ? 0.02 : 0.012), z); _scl.setScalar(k); _mA.compose(_pp0, _qc, _scl);
    pp.legL.setMatrixAt(i, partM(_mA, -0.012, 0, 0, sw, 0, _mC)); pp.legR.setMatrixAt(i, partM(_mA, 0.012, 0, 0, -sw, 0, _mC)); pp.torso.setMatrixAt(i, partM(_mA, 0, 0, 0, 0.03, 0, _mC));
    const ch = cheerAt(p, i, t);
    pp.armL.setMatrixAt(i, partM(_mA, -0.034, 0.064, 0, ch ? 3.2 + Math.sin(ph * 2) * 0.2 : -sw * 0.8, ch ? -0.2 : 0.08, _mC));
    pp.armR.setMatrixAt(i, partM(_mA, 0.034, 0.064, 0, ch ? 3.2 + Math.cos(ph * 2) * 0.2 : sw * 0.8, ch ? 0.2 : -0.08, _mC));
    pp.head.setMatrixAt(i, partM(_mA, 0, 0.083, 0, p.grp === 1 ? -0.35 : 0, 0, _mC)); pp.hair.setMatrixAt(i, partM(_mA, 0, 0.0865, -0.001, p.grp === 1 ? -0.55 : -0.2, 0, _mC)); }
  for (const key in pp) pp[key].instanceMatrix.needsUpdate = true;
}
function cityAt(t, st) {
  S.sky.position.copy(cam.position);
  crowdAt(t); _scl.set(1, 1, 1); palmsAt(t); carsAt(t);
  S.seaM.normalMap.offset.set(PER(0.02) * t, PER(0.035) * t);
  S.foam.forEach((m, i) => { const u = cyc(t, 0.16, i * 3.1); m.position.x = BV.SEA + 0.25 - 0.35 * u; m.material.opacity = 0.75 + 0.25 * u; m.material.map.offset.y = i * 0.37 + PER(0.01) * t; });
}
// ---------------------------------------------------------------- el dinero: torres de fajos de billetes que salen de la arena (la altura es el dinero: MS unidades por cada 1.000 M$),
// las bobinas de cine (la película más taquillera y la más cara), la torre de cristal de GTA 6 que se llena al final, el rascacielos, el contador de días con la medalla,
// la torre de cajas de juego frente a la pirámide de gente de Brasil, el calendario del 19 de noviembre y la etiqueta del precio. Billetes que vuelan.
const MS = 1.2;
const PZ = { g5: v3(2.3, 0, -0.9), reel: v3(4.6, 0, -1.5), g6: v3(6.9, 0, -0.5), cost: v3(7.4, 0, -16.5), sky: v3(7.5, 0, -15.55), reel2: v3(7.3, 0, -17.65), cal: v3(5.45, 0, 1.05) };
function canvasPlane(w, h, px, draw, opts = {}) {
  const t = canvasTex(px, Math.round(px * h / w), draw); const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: opts.r ?? 0.85, transparent: !!opts.tr, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }), opts.cs ?? false);
  m.userData.tex = t; return m;
}
const ST1 = { tw: v3(2.7, 0, -12.6), sign: v3(1.72, 0, -12.15) }, ST2 = { box: v3(3.0, 0, -20.4), pyr: v3(4.4, 0, -20.9) };
const HOOK_CAM = v3(0.6, 0.42, 8.2);
// ---------- texturas: billete (inventado: sin retrato ni diseño real), fajos de lado y desde arriba
function billDraw(g, x, y, w, h) {
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#e7efdc'); gr.addColorStop(1, '#c9d9bc'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.strokeStyle = '#2f6247'; g.lineWidth = Math.max(1, h * 0.04); g.strokeRect(x + h * 0.06, y + h * 0.06, w - h * 0.12, h - h * 0.12);
  g.fillStyle = 'rgba(47,98,71,.18)'; for (let i = 0; i < 6; i++) g.fillRect(x + w * 0.08, y + h * (0.3 + i * 0.08), w * 0.25, h * 0.02);
  g.beginPath(); g.ellipse(x + w * 0.62, y + h * 0.5, h * 0.3, h * 0.33, 0, 0, 7); g.fillStyle = 'rgba(47,98,71,.25)'; g.fill(); g.strokeStyle = 'rgba(47,98,71,.6)'; g.lineWidth = Math.max(1, h * 0.03); g.stroke();
  for (let r = 0.08; r < 0.3; r += 0.07) { g.beginPath(); g.ellipse(x + w * 0.62, y + h * 0.5, h * r, h * (r + 0.02), 0, 0, 7); g.stroke(); }
  g.fillStyle = '#2f6247'; g.font = `900 ${h * 0.24}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('100', x + w * 0.13, y + h * 0.2); g.fillText('100', x + w * 0.88, y + h * 0.8);
}
let BILL_T = null, SIDE_T = null, TOP_T = null;
function moneyTex() {
  BILL_T = canvasTex(256, 110, (g, w, h) => billDraw(g, 0, 0, w, h));
  SIDE_T = canvasTex(512, 512, (g, w, h) => { const cols = 6, rows = 16, bw = w / cols, bh = h / rows; g.fillStyle = '#26301f'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) { const x = c * bw + (r % 2 ? bw / 2 : 0) + 2, y = r * bh + 2, ww = bw - 4, hh = bh - 4, k = hash(r * 31 + c * 7);
      const base = `rgb(${190 + k * 22},${206 + k * 16},${176 + k * 18})`; g.fillStyle = base; g.fillRect(x, y, ww, hh);
      for (let yy = y + 2; yy < y + hh; yy += 2.2) { g.fillStyle = `rgba(40,70,48,${0.12 + hash(yy * 3 + c) * 0.16})`; g.fillRect(x, yy, ww, 0.8); }
      g.fillStyle = '#e2c770'; g.fillRect(x + ww * 0.42, y, ww * 0.16, hh); g.fillStyle = 'rgba(120,80,20,.35)'; g.fillRect(x + ww * 0.42, y, 1.5, hh); g.fillRect(x + ww * 0.58 - 1.5, y, 1.5, hh);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x, y, ww, 1.5); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y + hh - 1.5, ww, 1.5); } });
  TOP_T = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#26301f'; g.fillRect(0, 0, w, h); const cols = 4, rows = 8, bw = w / cols, bh = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = c * bw + 3, y = r * bh + 3; billDraw(g, x, y, bw - 6, bh - 6); g.fillStyle = '#e2c770'; g.fillRect(x + (bw - 6) * 0.42, y, (bw - 6) * 0.16, bh - 6); } });
  for (const t of [SIDE_T, TOP_T]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
}
// ---------- torre de fajos: setH(h) cambia la altura sin estirar la textura
function moneyTower(w, d = w) {
  const side = SIDE_T.clone(), sideZ = SIDE_T.clone(), top = TOP_T.clone(); for (const t of [side, sideZ, top]) { t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  const mS = new THREE.MeshStandardMaterial({ map: side, roughness: 0.72 }), mZ = new THREE.MeshStandardMaterial({ map: sideZ, roughness: 0.72 }), mT = new THREE.MeshStandardMaterial({ map: top, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), [mZ, mZ, mT, mT, mS, mS]); body.castShadow = true; body.receiveShadow = true;
  const g = new THREE.Group(); g.add(body); scene.add(g);
  const T = { g, body, w, d, h: -1, setH(h) { h = Math.max(0.0005, h); if (Math.abs(h - T.h) < 1e-5) return; T.h = h; body.scale.set(w, h, d); side.repeat.set(w / 0.96, h / 1.12); sideZ.repeat.set(d / 0.96, h / 1.12); top.repeat.set(w / 0.9, d / 0.9); } };
  T.setH(0.001); return T;
}
// ---------- rótulo flotante (placa oscura con dos líneas) que mira a la cámara
function tag3(l1, l2, c2 = '#FFC24A', w = 1.4, c1 = '#ffffff') {
  const h = w * 0.42, t = canvasTex(640, Math.round(640 * h / w), (g, W2, H2) => { g.clearRect(0, 0, W2, H2); g.fillStyle = 'rgba(12,16,24,.86)'; rr(g, 6, 6, W2 - 12, H2 - 12, H2 * 0.16); g.fill();
    g.fillStyle = c2; g.fillRect(6, H2 - 18, W2 - 12, 12);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = c1; g.font = `900 ${H2 * (l2 ? 0.34 : 0.48)}px Inter`; g.fillText(l1, W2 / 2, l2 ? H2 * 0.32 : H2 * 0.48, W2 * 0.9);
    if (l2) { g.fillStyle = c2; g.font = `900 ${H2 * 0.3}px Inter`; g.fillText(l2, W2 / 2, H2 * 0.68, W2 * 0.9); } });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  m.renderOrder = 8; scene.add(m); m.visible = false; return m;
}
function faceCam(o) { o.rotation.set(0, Math.atan2(cam.position.x - o.position.x, cam.position.z - o.position.z), 0); }
function showTag(o, pos, k) { o.visible = k > 0.01; if (!o.visible) return; o.position.copy(pos); faceCam(o); o.scale.setScalar(Math.max(0.0001, k)); }
// ---------- bobina de cine (aluminio con seis huecos, película enrollada y una tira que cae hasta la arena)
function filmTex() { return canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#1a1612'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) { g.fillStyle = '#e8e2d4'; g.fillRect(8, y + 4, 12, 8); g.fillRect(w - 20, y + 4, 12, 8); }
  for (let y = 0; y < h; y += 96) { const gr = g.createLinearGradient(0, y, 0, y + 88); gr.addColorStop(0, '#ff9a5a'); gr.addColorStop(0.5, '#e8508a'); gr.addColorStop(1, '#5a3cc0'); g.fillStyle = gr; g.fillRect(28, y + 6, w - 56, 84);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(w / 2, y + 40, 14, 0, 7); g.fill(); } }); }
function reel(R) {
  const g = new THREE.Group(), sh = new THREE.Shape(); sh.absarc(0, 0, R, 0, Math.PI * 2, false);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.26, h = new THREE.Path(); h.absarc(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55, R * 0.24, 0, Math.PI * 2, true); sh.holes.push(h); }
  const hub = new THREE.Path(); hub.absarc(0, 0, R * 0.07, 0, Math.PI * 2, true); sh.holes.push(hub);
  const fg = new THREE.ExtrudeGeometry(sh, { depth: R * 0.03, bevelEnabled: true, bevelThickness: R * 0.012, bevelSize: R * 0.012, bevelSegments: 2, curveSegments: 40 });
  const al = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, roughness: 0.28, metalness: 0.85 });
  for (const z of [-R * 0.16, R * 0.13]) { const f = new THREE.Mesh(fg, al); f.position.z = z; f.castShadow = true; f.receiveShadow = true; g.add(f); }
  const wound = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.82, R * 0.82, R * 0.27, 64, 1, false).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.45, metalness: 0.2 })); wound.castShadow = true; g.add(wound);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.16, R * 0.16, R * 0.36, 24).rotateX(Math.PI / 2), al); g.add(core);
  // la tira de película que baja desde el borde y se enrolla en la arena
  const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(v3(R * 0.82 + u * R * 0.5, -u * u * R * 0.95 + (1 - u) * R * 0.05, 0)); }
  for (let i = 1; i <= 12; i++) { const u = i / 12; pts.push(v3(R * 1.32 + u * R * 0.6, -R * 0.99, Math.sin(u * 3) * R * 0.25)); }
  const curve = new THREE.CatmullRomCurve3(pts), N = 120, pos = [], uv = [], idx = [], wdt = R * 0.12;
  for (let i = 0; i <= N; i++) { const u = i / N, p = curve.getPoint(u); pos.push(p.x, p.y, p.z - wdt, p.x, p.y, p.z + wdt); uv.push(0, u * 9, 1, u * 9); if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); sg.setIndex(idx); sg.computeVertexNormals();
  const ft = filmTex(); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; const strip = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: ft, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide })); strip.castShadow = true; g.add(strip);
  const out = new THREE.Group(); g.position.y = R; out.add(g); scene.add(out); return { g: out, R };
}
// ---------- rascacielos (maqueta de un superrascacielos inventado: planta en tres alas, retranqueos y aguja)
function skyscraper(H) {
  const g = new THREE.Group(), gm = new THREE.MeshPhysicalMaterial({ color: 0x9fc4e0, roughness: 0.12, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.05 }), fm = new THREE.MeshStandardMaterial({ color: 0xe9eef2, roughness: 0.4, metalness: 0.5 });
  const wing = (len, wd, h) => { const s = new THREE.Shape(); s.moveTo(-wd / 2, 0); s.lineTo(wd / 2, 0); s.lineTo(wd / 2, len - wd / 2); s.absarc(0, len - wd / 2, wd / 2, 0, Math.PI, false); s.lineTo(-wd / 2, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 10 }); geo.rotateX(-Math.PI / 2); return geo; };
  const segs = 9; let y = 0;
  for (let i = 0; i < segs; i++) { const h = H * 0.62 / segs, sc = 1 - i / segs * 0.82;
    for (let k = 0; k < 3; k++) { if (i > 0 && k === i % 3 && i > 5) continue; const len = H * 0.17 * sc * (k === (i % 3) ? 0.82 : 1), m = new THREE.Mesh(wing(len, H * 0.075 * (0.55 + 0.45 * sc), h), gm); m.position.y = y; m.rotation.y = k * 2.094; m.castShadow = true; g.add(m); }
    const band = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.05 * (0.5 + 0.5 * sc), H * 0.05 * (0.5 + 0.5 * sc), h * 0.06, 12), fm); band.position.y = y + h; g.add(band); y += h; }
  const core = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.012, H * 0.04, H * 0.18, 12), gm); core.position.y = y + H * 0.09; g.add(core);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.002, H * 0.012, H * 0.2, 8), fm); spire.position.y = y + H * 0.28; spire.castShadow = true; g.add(spire);
  scene.add(g); return g;
}
// ---------- calendario de taco (19 NOV) y etiqueta de precio
function calendarBlock() {
  const t = canvasTex(512, 600, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#e53935'; g.fillRect(0, 0, w, 150); g.fillStyle = '#ffffff'; g.font = '900 78px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NOVIEMBRE', w / 2, 80);
    g.fillStyle = '#16181d'; g.font = '900 330px Inter'; g.fillText('19', w / 2, 360); g.fillStyle = '#e53935'; g.font = '900 56px Inter'; g.fillText('JUEVES · 2026', w / 2, 540);
    g.fillStyle = '#9aa1ab'; for (let x = 40; x < w; x += 54) { g.beginPath(); g.arc(x, 18, 9, 0, 7); g.fill(); } });
  const side = flatM(0xf2efe8, 0.8), m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.17, 0.26).translate(0, 0.585, 0), [side, side, side, side, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), side]);
  m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
function priceTag() {
  const W2 = 1.0, H2 = 0.56, s = new THREE.Shape(); s.moveTo(-W2 / 2 + 0.16, H2 / 2); s.lineTo(W2 / 2 - 0.05, H2 / 2); s.quadraticCurveTo(W2 / 2, H2 / 2, W2 / 2, H2 / 2 - 0.05); s.lineTo(W2 / 2, -H2 / 2 + 0.05); s.quadraticCurveTo(W2 / 2, -H2 / 2, W2 / 2 - 0.05, -H2 / 2);
  s.lineTo(-W2 / 2 + 0.16, -H2 / 2); s.lineTo(-W2 / 2, 0); s.lineTo(-W2 / 2 + 0.16, H2 / 2); const hole = new THREE.Path(); hole.absarc(-W2 / 2 + 0.11, 0, 0.035, 0, 7, true); s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 }); geo.translate(0, 0, -0.01);
  const pos = geo.attributes.position, uv = []; for (let i = 0; i < pos.count; i++) uv.push((pos.getX(i) + W2 / 2) / W2, (pos.getY(i) + H2 / 2) / H2); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const mk = txt => canvasTex(1000, 560, (g, w, h) => { g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e53935'; g.lineWidth = 16; g.strokeRect(190, 26, w - 216, h - 52);
    g.fillStyle = '#e53935'; g.font = '900 210px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 590, 300, 740); });
  const tA = mk('79,99 €'), tB = mk('¿80 €?'); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tA, roughness: 0.55 })); m.castShadow = true;
  const g = new THREE.Group(); m.position.set(W2 / 2 - 0.11, -0.12, 0); m.rotation.z = -0.22; g.add(m);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 3, 5).translate(0, 1.5, 0), flatM(0x8a6a44)); str.position.set(0, -0.12, 0); g.add(str);
  scene.add(g); g.visible = false; return { g, m, tA, tB };
}
// ---------- la pirámide de Brasil: gradas con gente (se crean con el resto de la gente) y la bandera arriba
const BRZ = { tiers: 5, h: 2.13 / 5, w0: 1.5, w1: 0.34 };
function buildBrazilPeople(add) {
  const c = ST2.pyr;
  for (let k = 0; k < BRZ.tiers; k++) { const y = (k + 1) * BRZ.h, half = (BRZ.w0 - (BRZ.w0 - BRZ.w1) * (k + 1) / BRZ.tiers) / 2, n = Math.max(6, Math.round(half * 8 / 0.09));
    for (let i = 0; i < n; i++) { const u = i / n, side = Math.floor(u * 4), f = (u * 4) % 1, e = half - 0.035; let x, z;
      if (side === 0) { x = -e + f * 2 * e; z = e; } else if (side === 1) { x = e; z = e - f * 2 * e; } else if (side === 2) { x = e - f * 2 * e; z = -e; } else { x = -e; z = -e + f * 2 * e; }
      const t0 = k * 0.12 + hash(i * 3.3 + k) * 0.18;
      add({ x: c.x + x, z: c.z + z, y, yaw: Math.atan2(x, z), grp: 4, k0: t => pop(t, K.mas4b - 0.2 + t0, 0.3) * (1 - win(t, K.rockstar5 + 0.3, 0.3)) }); } }
}
// ---------- todo junto
function buildMoney() {
  moneyTex();
  S.g5 = moneyTower(1.05); S.g5.g.position.copy(PZ.g5);
  S.reel = reel(2.925 * MS / 2); S.reel.g.position.copy(PZ.reel); S.reel.g.rotation.y = Math.atan2(HOOK_CAM.x - PZ.reel.x, HOOK_CAM.z - PZ.reel.z) + 0.05;
  // la torre de cristal de GTA 6 (vacía hasta el final) con su interrogación y la línea de la película más taquillera
  { const G = new THREE.Group(); G.position.copy(PZ.g6); scene.add(G); S.g6G = G;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.4, 1.1).translate(0, 2.2, 0), new THREE.MeshPhysicalMaterial({ color: 0xcfeaff, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, clearcoat: 1, side: THREE.DoubleSide }));
    glass.renderOrder = 3; G.add(glass); edges(glass, 0xffffff, 2.2, 28, 0.9);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.3).translate(0, 0.04, 0), flatM(0xffffff, 0.5)); base.castShadow = true; base.receiveShadow = true; G.add(base);
    for (let k = 1; k <= 3; k++) { const tick = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.012, 1.12).translate(0, k * MS, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })); G.add(tick); }
    S.g6 = moneyTower(0.95); S.g6.g.position.set(PZ.g6.x, 0.08, PZ.g6.z);
    S.qm = canvasPlane(0.85, 1.06, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ffb547'; g.font = '900 560px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(255,170,60,.9)'; g.shadowBlur = 40; g.fillText('?', w / 2, h * 0.54); }, { tr: true });
    S.qm.material = new THREE.MeshBasicMaterial({ map: S.qm.userData.tex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }); S.qm.renderOrder = 6; scene.add(S.qm);
    // la línea de la película n.º 1 (a la altura de la bobina), de la bobina a la torre de GTA 6
    const top = 2.925 * MS, a = v3(PZ.reel.x, top, PZ.reel.z), b = v3(PZ.g6.x + 0.55, top, PZ.g6.z); S.topLine = polyline([a, b], lineMat(0xffc24a, 3, 0.95, true)); S.topLine.visible = false; scene.add(S.topLine); }
  // el coste (frases 5 y 6): torre de coste, rascacielos, sello «NO» y la bobina de la película más cara
  S.cost = moneyTower(0.8); S.cost.g.position.copy(PZ.cost);
  { const gt = SIDE_T.clone(); gt.needsUpdate = true; gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(0.84 / 0.96, 0.5 * MS / 1.12); S.bandT = gt; }
  S.band = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1, 0.84).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ map: S.bandT, color: 0xfff0c0, transparent: true, opacity: 0.42, depthWrite: false, roughness: 0.6 })); S.band.position.copy(PZ.cost); S.band.renderOrder = 4; scene.add(S.band); edges(S.band, 0xffc24a, 2, 28, 0.9);
  S.sky = S.sky; S.tower = skyscraper(1.5 * MS); S.tower.position.copy(PZ.sky);
  S.no = canvasPlane(0.9, 0.5, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.rotate(-0.12); g.strokeStyle = '#ff3b30'; g.lineWidth = 22; rr(g, -w / 2 + 20, -h / 2 + 20, w - 40, h - 40, 26); g.stroke();
    g.fillStyle = '#ff3b30'; g.font = '900 190px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NO', 0, 8); g.restore(); }, { tr: true });
  S.no.material = new THREE.MeshBasicMaterial({ map: S.no.userData.tex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }); S.no.renderOrder = 9; scene.add(S.no);
  S.reel2 = reel(0.659 * MS / 2); S.reel2.g.position.copy(PZ.reel2); S.reel2.g.rotation.y = 0.9;
  // la parada 1: el contador de días, la torre que sube y la medalla
  S.day = moneyTower(0.85); S.day.g.position.copy(ST1.tw);
  { const t = canvasTex(512, 256, () => {}); S.dayT = t; const side = flatM(0x23262d, 0.5); S.dayBoard = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.06), [side, side, side, side, new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), side]);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04).translate(0, -0.47, 0), flatM(0x2b2f36)); S.dayBoard.add(legs); S.dayBoard.position.set(ST1.sign.x, 0.72, ST1.sign.z); S.dayBoard.rotation.y = -0.65; S.dayBoard.castShadow = true; scene.add(S.dayBoard); }
  { const g = new THREE.Group(), disc = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 40).rotateX(Math.PI / 2), M.gold); disc.castShadow = true; g.add(disc);
    const face = canvasPlane(0.4, 0.4, 256, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = '#7a4f0a'; gg.font = '900 58px Inter'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText('RÉCORD', w / 2, h * 0.42); gg.font = '900 40px Inter'; gg.fillText('MUNDIAL', w / 2, h * 0.62); }, { tr: true });
    face.position.z = 0.03; g.add(face); const f2 = face.clone(); f2.rotation.y = Math.PI; f2.position.z = -0.03; g.add(f2);
    for (const s of [-1, 1]) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.01), new THREE.MeshStandardMaterial({ color: s < 0 ? 0xd62828 : 0x1d4ed8, roughness: 0.6 })); rib.position.set(s * 0.07, 0.36, -0.01); rib.rotation.z = s * 0.25; g.add(rib); }
    scene.add(g); S.medal = g; }
  // la parada 2: la torre de cajas de juego (copias) y la pirámide de Brasil con su bandera
  { const cover = canvasTex(256, 320, (g, w, h) => { g.fillStyle = '#0f1a2b'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 30, 0, h - 30); gr.addColorStop(0, '#ffb15c'); gr.addColorStop(0.55, '#ff5c8a'); gr.addColorStop(1, '#3b2a8f'); g.fillStyle = gr; g.fillRect(14, 40, w - 28, h - 54);
      g.fillStyle = '#ffe9b0'; g.beginPath(); g.arc(w / 2, h * 0.55, 42, 0, 7); g.fill(); g.fillStyle = '#1c1030'; for (let i = 0; i < 3; i++) { g.fillRect(40 + i * 70, h * 0.5, 6, h * 0.42); g.beginPath(); g.ellipse(43 + i * 70, h * 0.5, 34, 10, -0.3, 0, 7); g.fill(); }
      g.fillStyle = '#ffffff'; g.fillRect(14, 10, w - 28, 22); });
    const spine = canvasTex(256, 32, (g, w, h) => { g.fillStyle = '#f4f6f9'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f5fd6'; g.fillRect(0, 0, 34, h); g.fillStyle = '#ff5c8a'; g.fillRect(40, 9, w - 60, h - 18); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, h - 3, w, 3); });
    const spineM = new THREE.MeshStandardMaterial({ map: spine, roughness: 0.45 }), caseM = [spineM, spineM, new THREE.MeshStandardMaterial({ map: cover, roughness: 0.4 }), flatM(0x1b2232), spineM, spineM];
    const geo = new THREE.BoxGeometry(0.23, 0.028, 0.29); S.boxes = []; const nl = Math.round(2.3 / 0.03);
    S.boxIM = new THREE.InstancedMesh(geo, caseM, nl * 9); S.boxIM.castShadow = true; S.boxIM.receiveShadow = true; S.boxIM.frustumCulled = false; scene.add(S.boxIM);
    for (let l = 0; l < nl; l++) for (let c = 0; c < 9; c++) S.boxes.push({ l, x: ((c % 3) - 1) * 0.245 + (hash(l * 9 + c) - 0.5) * 0.02, z: (Math.floor(c / 3) - 1) * 0.305 + (hash(l * 7 + c) - 0.5) * 0.02, ry: (hash(l * 5 + c) - 0.5) * 0.08 }); }
  { const g = new THREE.Group(), stoneM = [flatM(0x1f9e4a, 0.8), flatM(0x2bb15a, 0.8)], edgeM = flatM(0xf7d116, 0.6);
    for (let k = 0; k < BRZ.tiers; k++) { const w = BRZ.w0 - (BRZ.w0 - BRZ.w1) * k / BRZ.tiers, b = new THREE.Mesh(new THREE.BoxGeometry(w, BRZ.h, w).translate(0, BRZ.h / 2 + k * BRZ.h, 0), stoneM[k % 2]); b.castShadow = true; b.receiveShadow = true; g.add(b);
      const e = new THREE.Mesh(new THREE.BoxGeometry(w + 0.012, 0.03, w + 0.012).translate(0, (k + 1) * BRZ.h - 0.015, 0), edgeM); g.add(e); }
    const flagT = canvasTex(300, 210, (gg, w, h) => { gg.fillStyle = '#1f9e4a'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#f7d116'; gg.beginPath(); gg.moveTo(w / 2, 18); gg.lineTo(w - 22, h / 2); gg.lineTo(w / 2, h - 18); gg.lineTo(22, h / 2); gg.closePath(); gg.fill();
      gg.fillStyle = '#2a4fbf'; gg.beginPath(); gg.arc(w / 2, h / 2, 52, 0, 7); gg.fill(); gg.strokeStyle = '#ffffff'; gg.lineWidth = 6; gg.beginPath(); gg.arc(w / 2, h / 2 + 70, 92, -2.2, -0.95); gg.stroke(); });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35, 12, 1), new THREE.MeshStandardMaterial({ map: flagT, side: THREE.DoubleSide, roughness: 0.7 })); flag.position.set(0.27, BRZ.tiers * BRZ.h + 0.42, 0); flag.castShadow = true; g.add(flag); S.flag = flag;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.62, 6).translate(0, 0.31, 0), flatM(0xe8e8e8)); pole.position.y = BRZ.tiers * BRZ.h; g.add(pole);
    g.position.copy(ST2.pyr); scene.add(g); S.pyr = g; }
  S.cal = calendarBlock(); S.cal.position.copy(PZ.cal); S.cal.scale.setScalar(0.68);
  S.tag = priceTag();
  // rótulos
  S.tags = { g5: tag3('GTA 5', 'MÁS DE 6.000 M$', '#7CF0A9', 1.25), reel: tag3('PELÍCULA N.º 1', '2.925 M$', '#FFC24A', 1.3), g6: tag3('GTA 6', 'SALE EL 19', '#FFB547', 0.95),
    day: tag3('GTA 5', '', '#7CF0A9', 1.2), boxes: tag3('COPIAS DE GTA 5', '230 M', '#7CF0A9', 0.95), brazil: tag3('HABITANTES DE BRASIL', '213 M', '#F7D116', 1.0),
    sky: tag3('EL EDIFICIO MÁS ALTO', '1.500 M$', '#8FE6FF', 1.05), cost: tag3('COSTE DE GTA 6', '1.000–1.500 M$', '#FFC24A', 1.0), reel2: tag3('LA PELÍCULA MÁS CARA', '659 M$', '#FF8A80', 1.0),
    g6b: tag3('GTA 6 · 1.ER AÑO', '3.200 M$', '#7CF0A9', 1.2), costQ: tag3('COSTE DE GTA 6', '¿?', '#FFB547', 1.0) };
  buildBills();
}
// ---------- billetes que vuelan: la explosión de GTA 5 (con la arena), la de GTA 6 al pasar a la película y la lluvia del final
function buildBills() {
  const N = 520; S.billN = N; S.bills = [];
  for (let i = 0; i < N; i++) S.bills.push({ a: hash(i * 1.37) * 6.283, v: 0.6 + hash(i * 2.91) * 1.6, up: 1.4 + hash(i * 4.13) * 3.2, h0: hash(i * 7.7), spin: 2 + hash(i * 5.5) * 6, ax: hash(i * 6.1), grp: i < 300 ? 0 : i < 420 ? 1 : 2 });
  const m = new THREE.MeshStandardMaterial({ map: BILL_T, side: THREE.DoubleSide, roughness: 0.7 });
  S.billIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 0.052), m, N); S.billIM.castShadow = true; S.billIM.frustumCulled = false; scene.add(S.billIM);
  S.sandIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 0), flatM(0xe2c48f, 0.95), 160); S.sandIM.castShadow = true; S.sandIM.frustumCulled = false; scene.add(S.sandIM);
}
// tiempo de la explosión inicial: corre normal y, en el último medio segundo, rebobina hasta el estado del primer fotograma (bucle)
const ERUPT0 = 0.12;          // en el primer fotograma la torre ya va por un tercio
const REW = 0.55;
function eruptT(t) { if (t > END - REW) return ERUPT0 + (END - t) / REW * 1.25; return t + ERUPT0; }
function billsAt(t) {
  const te = eruptT(t), top5 = S.g5.h, M2 = S.billIM;
  for (let i = 0; i < S.billN; i++) { const b = S.bills[i]; let p = null, sc = 1, tt = 0;
    if (b.grp === 0) { tt = te - b.h0 * 0.5; if (tt > 0 && tt < 6) { const r = b.v * (1 - Math.exp(-tt * 1.6)) * 1.6, y0 = top5 * (0.15 + b.h0 * 0.85);
        p = _p.set(PZ.g5.x + Math.cos(b.a) * (0.55 + r), Math.max(0.01, y0 + b.up * tt * Math.exp(-tt * 1.2) - 0.55 * tt), PZ.g5.z + Math.sin(b.a) * (0.55 + r)); sc = (1 - win(tt, 5.2, 0.6)) * (t > END - REW ? win(t, END - REW, 0.2) : 1); } }
    else if (b.grp === 1) { tt = t - (K.pelicula8 - 0.05) - b.h0 * 0.35; if (tt > 0 && t < END - 0.65) { const r = b.v * (1 - Math.exp(-tt * 1.4)) * 1.4, y0 = S.g6.h + 0.1;
        p = _p.set(PZ.g6.x + Math.cos(b.a) * (0.5 + r), Math.max(0.01, y0 + b.up * 0.6 * tt * Math.exp(-tt) - 0.32 * tt), PZ.g6.z + Math.sin(b.a) * (0.5 + r)); sc = 1 - win(t, END - 1.0, 0.35); } }
    else { tt = t - K.pagarias9 + b.h0 * 2.5; if (tt > 0 && t < END - 0.65) { const fall = 7 - 0.7 * tt; if (fall > 0.01) p = _p.set(3 + Math.cos(b.a) * 4.5 * b.ax + 1.5, fall, 0.5 + Math.sin(b.a) * 4.5 * b.ax); sc = 1 - win(t, END - 1.0, 0.35); } }
    if (!p || sc <= 0.01) { M2.setMatrixAt(i, _zero); continue; }
    const fl = p.y > 0.02 ? 1 : 0; _q.setFromEuler(_e.set(fl ? Math.sin(tt * b.spin) * 1.2 : -Math.PI / 2, b.a + tt * b.spin * 0.3 * fl, fl ? Math.cos(tt * b.spin * 0.7) * 0.8 : 0));
    _s.setScalar(sc * (b.grp === 2 ? 1.3 : 1)); _m4.compose(p, _q, _s); M2.setMatrixAt(i, _m4); }
  M2.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < 160; i++) { const a = hash(i * 3.9) * 6.283, v = 0.8 + hash(i * 1.3) * 2, up = 2 + hash(i * 2.2) * 3, tt = te - hash(i * 8.1) * 0.25;
    if (tt <= 0 || tt > 1.6) { S.sandIM.setMatrixAt(i, _zero); continue; }
    const y = 0.02 + up * tt - 4.5 * tt * tt; _p.set(PZ.g5.x + Math.cos(a) * (0.5 + v * tt), Math.max(0.01, y), PZ.g5.z + Math.sin(a) * (0.5 + v * tt)); _q.identity(); _s.setScalar((0.6 + hash(i) * 1.2) * (1 - win(tt, 1.1, 0.5)) * (t > END - REW ? win(t, END - REW, 0.2) : 1)); _m4.compose(_p, _q, _s); S.sandIM.setMatrixAt(i, _m4); }
  S.sandIM.instanceMatrix.needsUpdate = true;
}
function dayBoard(n, k) {
  const g = S.dayT.userData.g, w = 512, h = 256; g.clearRect(0, 0, w, h); g.fillStyle = '#16181d'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2a2e36'; g.fillRect(16, 16, w - 32, h - 32); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(16, h / 2 - 2, w - 32, 4);
  g.save(); g.translate(w / 2, h / 2); g.scale(1, Math.max(0.05, Math.abs(Math.cos(k * Math.PI)))); g.fillStyle = '#FFC24A'; g.font = '900 150px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DÍA ' + n, 0, 8); g.restore();
  S.dayT.needsUpdate = true;
}
const _vt = new THREE.Vector3();
function moneyAt(t) {
  // GTA 5: sale de la arena en el primer segundo (y rebobina al final)
  const te = eruptT(t), h5 = 6.0 * MS * (1 - Math.pow(1 - clamp(te / 1.05), 3)) * (1 + 0.04 * Math.sin(clamp(te / 1.05) * 9) * (1 - clamp(te / 1.05)));
  S.g5.setH(Math.max(0.002, h5)); S.g5.g.position.y = 0; S.g5.g.rotation.y = 0.04 * Math.sin(te * 20) * Math.exp(-te * 3);
  showTag(S.tags.g5, _vt.set(PZ.g5.x - 0.05, Math.min(h5 * 0.5, 2.3), PZ.g5.z + 0.62), Math.max(window.COVER_G5 ? 1 : 0, win(t, K.es2 - 0.15, 0.3) * (1 - win(t, K.el3 - 0.1, 0.3))));
  if (t < K.el3) showTag(S.tags.reel, _vt.set(PZ.reel.x - 0.75, 1.45, PZ.reel.z + 0.85), win(t, K.pelicula1 - 0.1, 0.3) * (1 - win(t, K.y2 + 0.4, 0.3)));
  else showTag(S.tags.reel, _vt.set(PZ.reel.x + 0.15, 2.925 * MS + 0.36, PZ.reel.z), win(t, K.pelicula8 - 0.1, 0.3) * (1 - win(t, K.pagarias9 - 0.2, 0.3)));
  // GTA 6: el calendario cae, la interrogación flota y, en la respuesta, se llena hasta los 3.200 M$ y pasa a la película
  { const k = win(t, K.diecinueve2 - 0.35, 0.35), land = clamp((t - K.diecinueve2 + 0.05) / 0.25), y = k < 1 ? 7 * (1 - k * k) : 0;
    S.cal.visible = t > K.diecinueve2 - 0.4 && t < K.gta3 + 0.6; S.cal.position.y = Math.max(0, y) + (land > 0 ? Math.abs(Math.sin(land * Math.PI * 2)) * 0.06 * (1 - land) : 0); S.cal.rotation.z = (1 - k) * 0.4; }
  const fill = keyed(t, [[0, 0], [K.tres8 - 0.15, 0], [K.millones8 + 0.15, 2.0 * MS], [K.ano8 + 0.1, 2.75 * MS], [K.pelicula8 - 0.05, 3.2 * MS]]);
  S.g6.setH(Math.max(0.002, fill)); S.g6.g.visible = fill > 0.003;
  { const k = win(t, K.gta2 - 0.1, 0.3) * (1 - win(t, K.tres8 - 0.2, 0.3)), q = S.qm; q.visible = k > 0.01; q.position.set(PZ.g6.x, 1.9 + 0.1 * Math.sin(t * 2.2), PZ.g6.z); faceCam(q); q.scale.setScalar(Math.max(0.0001, k * (1 + 0.12 * win(t, K.cuanto2, 0.15) * (1 - win(t, K.cuanto2 + 0.4, 0.3))))); }
  showTag(S.tags.g6, _vt.set(PZ.g6.x, 3.15, PZ.g6.z + 0.1), win(t, K.gta2 - 0.15, 0.3) * (1 - win(t, K.el3 - 0.1, 0.3)));
  showTag(S.tags.g6b, _vt.set(PZ.g6.x, fill + 0.42, PZ.g6.z + 0.3), win(t, K.ano8 - 0.15, 0.3) * (1 - win(t, K.pagarias9 - 0.2, 0.3)));
  S.topLine.visible = t > K.pelicula8 - 0.6 && t < K.mandaselo9; if (S.topLine.visible) S.topLine.material.opacity = 0.95 * win(t, K.pelicula8 - 0.6, 0.3);
  // el coste: el rascacielos sube, la torre del coste lo intenta y el sello dice NO; luego la franja de los analistas y la película más cara
  { const ks = win(t, K.costara5 - 0.1, 1.3) * (1 - win(t, K.y7 - 0.2, 0.4)); S.tower.visible = ks > 0.005; S.tower.scale.set(1, Math.max(0.001, ks), 1);
    const c = keyed(t, [[0, 0], [K.y5 + 0.2, 0], [K.rockstar5 + 0.2, 0.75 * MS], [K.costara5, 0.85 * MS], [K.alto5, 1.45 * MS], [K.mundo5 + 0.1, 1.5 * MS], [K.entre6 - 0.1, 1.5 * MS], [K.n1000b + 0.3, 1.0 * MS], [K.y7 - 0.25, 1.0 * MS], [K.y7 + 0.25, 0]]);
    S.cost.setH(Math.max(0.002, c)); S.cost.g.visible = c > 0.004;
    const kb = win(t, K.entre6 - 0.1, 0.3) * (1 - win(t, K.y7 - 0.3, 0.3)); S.band.visible = kb > 0.01; S.band.position.set(PZ.cost.x, 1.0 * MS, PZ.cost.z); S.band.scale.set(1, 0.5 * MS * Math.max(0.001, kb), 1);
    const kn = pop(t, K.mundo5 - 0.1, 0.3) * (1 - win(t, K.entre6 - 0.2, 0.3)); S.no.visible = kn > 0.01; S.no.position.set(PZ.cost.x - 0.1, 1.5 * MS + 0.12, PZ.cost.z - 0.2); faceCam(S.no); S.no.scale.setScalar(Math.max(0.0001, kn * (1 + 0.6 * (1 - win(t, K.mundo5 - 0.1, 0.18)))));
    const kr = pop(t, K.cualquier6 - 0.2, 0.35) * (1 - win(t, K.y7 - 0.2, 0.3)); S.reel2.g.visible = kr > 0.01; S.reel2.g.scale.setScalar(Math.max(0.0001, kr));
    showTag(S.tags.sky, _vt.set(PZ.sky.x - 0.1, 1.5 * MS * ks + 0.36, PZ.sky.z - 0.1), win(t, K.edificio5 + 0.1, 0.3) * (1 - win(t, K.entre6 - 0.1, 0.3)));
    showTag(S.tags.cost, _vt.set(PZ.cost.x - 0.05, 1.5 * MS + 0.42, PZ.cost.z + 0.1), win(t, K.entre6 - 0.1, 0.3) * (1 - win(t, K.y7 - 0.3, 0.3)));
    showTag(S.tags.costQ, _vt.set(PZ.cost.x - 0.05, c + 0.38, PZ.cost.z + 0.1), win(t, K.y5 + 0.4, 0.3) * (1 - win(t, K.mundo5 - 0.3, 0.25)));
    showTag(S.tags.reel2, _vt.set(PZ.reel2.x, 0.659 * MS + 0.34, PZ.reel2.z + 0.1), win(t, K.cualquier6 - 0.05, 0.3) * (1 - win(t, K.y7 - 0.25, 0.3))); }
  // parada 1: el contador de días y la torre que sube a 800 M$ y a 1.000 M$; la medalla del récord
  { const h = keyed(t, [[0, 0], [K.el3, 0], [K.n800 + 0.2, 0.8 * MS], [K.dolares3 + 0.3, 0.8 * MS], [K.n1000 - 0.1, 0.8 * MS], [K.n1000 + 0.35, 1.0 * MS]]) * (1 - win(t, K.copias4, 0.4) * 0);
    S.day.setH(Math.max(0.002, h)); S.day.g.visible = h > 0.003 && t < K.y5 + 1.5;
    const n = t < K.en3 ? 1 : t < K.n3 + 0.25 ? 2 : 3, fk = t < K.en3 ? clamp((t - K.en3 + 0.2) / 0.2) : t < K.n3 + 0.25 ? clamp((t - K.n3 - 0.05) / 0.2) : 0;
    dayBoard(n, fk); S.dayBoard.visible = t > K.el3 - 0.5 && t < K.y5 + 1.5; S.dayBoard.scale.setScalar(Math.max(0.0001, pop(t, K.el3 - 0.25, 0.35)));
    const km = pop(t, K.record3 - 0.1, 0.4); S.medal.visible = km > 0.01 && t < K.y5 + 1.5; S.medal.position.set(ST1.tw.x, h + 0.55 + 0.04 * Math.sin(t * 3), ST1.tw.z + 0.1); S.medal.rotation.y = Math.atan2(cam.position.x - ST1.tw.x, cam.position.z - ST1.tw.z) + 0.3 * Math.sin(t * 2); S.medal.scale.setScalar(Math.max(0.0001, km));
    showTag(S.tags.day, _vt.set(ST1.tw.x, Math.max(0.35, h * 0.5), ST1.tw.z + 0.6), 0); }
  // parada 2: las cajas caen capa a capa (230 M) y la pirámide de gente de Brasil (213 M) sube con la bandera
  { const t0 = K.n230 - 0.3, per = 0.016; let n = 0;
    for (const b of S.boxes) { const tl = t0 + b.l * per + hash(b.l * 3 + b.x) * 0.03, k = clamp((t - tl) / 0.12), vis = t > tl && t < K.y5 + 1.5;
      if (!vis) { S.boxIM.setMatrixAt(n++, _zero); continue; } _p.set(ST2.box.x + b.x, 0.014 + b.l * 0.03 + (1 - k * k) * 0.22, ST2.box.z + b.z); _q.setFromEuler(_e.set(0, b.ry + (1 - k) * 0.3, 0)); _s.setScalar(1); _m4.compose(_p, _q, _s); S.boxIM.setMatrixAt(n++, _m4); }
    S.boxIM.instanceMatrix.needsUpdate = true;
    const kp = win(t, K.mas4b - 0.3, 0.6); S.pyr.visible = kp > 0.005 && t < K.y5 + 1.5; S.pyr.scale.set(1, Math.max(0.001, kp), 1);
    const fp = S.flag.geometry.attributes.position; if (!S.flag.userData.x0) S.flag.userData.x0 = Float32Array.from(fp.array);
    for (let i = 0; i < fp.count; i++) { const x0 = S.flag.userData.x0[i * 3], u = (x0 + 0.25) / 0.5; fp.setZ(i, Math.sin(u * 5 - t * 7) * 0.035 * u); } fp.needsUpdate = true;
    showTag(S.tags.boxes, _vt.set(ST2.box.x + 0.1, 1.15, ST2.box.z + 0.55), win(t, K.copias4 - 0.15, 0.3) * (1 - win(t, K.y5, 0.3)));
    showTag(S.tags.brazil, _vt.set(ST2.pyr.x + 0.35, 2.13 * kp * 0.42, ST2.pyr.z + 0.95), win(t, K.brasil4 - 0.15, 0.3) * (1 - win(t, K.y5, 0.3))); }
  // la etiqueta del precio: baja balanceándose delante de la cámara (frase 7) y vuelve con «¿80 €?» (frase 9)
  { const kA = win(t, K.costara7 - 0.35, 0.45) * (1 - win(t, K.euros7 + 0.25, 0.3)), kB = win(t, K.pagarias9 - 0.3, 0.4) * (1 - win(t, K.mandaselo9 + 0.1, 0.35)), k = Math.max(kA, kB);
    const T = S.tag; T.g.visible = k > 0.005; if (T.g.visible) { const B = kB > kA, st = camAt(t), fw = _vt.subVectors(st.l, st.p).normalize(), rt = v3(-fw.z, 0, fw.x).normalize(), base = st.p.clone().addScaledVector(fw, 3.1).addScaledVector(rt, -0.3);
      T.m.material.map = B ? T.tB : T.tA; T.g.position.set(base.x, base.y + 0.22 + (1 - k) * 2.4, base.z); T.g.rotation.set(0, Math.atan2(-fw.x, -fw.z), 0.22 * Math.sin((t - (B ? K.pagarias9 : K.costara7)) * 3.1) * Math.exp(-Math.max(0, t - (B ? K.pagarias9 : K.costara7)) * 0.6)); } }
  billsAt(t);
}
// ---------------------------------------------------------------- cámara: siempre en movimiento. Desde el paseo, la torre de GTA 5 revienta la arena junto a la bobina gigante →
// barrido a la torre de cristal de GTA 6 (calendario e interrogación) → vuelo por el paseo hasta el contador de días (800 → 1.000 M$, la medalla) → la torre de
// cajas frente a la pirámide de Brasil → giro y vuelo por la orilla hasta el coste (el rascacielos, el «NO», la película más cara) → la etiqueta del precio →
// GTA 6 se llena y pasa a la película n.º 1 (grúa) → vuelta por encima de la plaza hasta el primer plano (bucle)
let CKS = [], CUTS = [];
const H0 = [0.6, 0.42, 8.2], L0 = [3.6, 2.75, -1.1], H1 = [0.65, 0.44, 7.85], L1 = [3.62, 2.78, -1.1], Hm = [0.63, 0.5, 8.75], Lm = [3.58, 2.72, -1.1];
function buildCam() {
  const A = [
    [-0.4, Hm, Lm, 48], [0.0, H0, L0, 48], [0.5, H1, L1, 48], [K.videojuego1 + 0.3, [0.8, 0.52, 7.3], [3.7, 2.95, -1.1], 47],
    [K.gta2, [0.9, 0.62, 9.2], [3.3, 3.0, -1.0], 47], [K.y2, [2.3, 1.2, 9.6], [5.3, 2.3, -0.6], 46],
    [K.sale2, [3.6, 1.55, 8.6], [6.5, 2.3, -0.4], 44], [K.cuanto2, [4.6, 1.5, 6.4], [6.85, 2.15, -0.5], 42], [K.final2 + 0.25, [4.9, 1.45, 5.7], [6.9, 2.05, -0.5], 42],
    [K.el3 + 0.3, [2.4, 1.0, 3.4], [1.3, 0.85, -6.0], 48], [K.el3 + 0.62, [0.72, 0.6, -0.8], [1.8, 0.7, -9.0], 48], [K.gta3 + 0.05, [0.95, 0.68, -3.2], [2.3, 0.75, -12.0], 48],
    [K.n800, [3.9, 0.92, -7.9], [2.3, 0.85, -12.4], 46], [K.en3, [4.05, 0.9, -8.15], [2.3, 0.88, -12.4], 46], [K.n1000, [4.12, 0.92, -8.3], [2.32, 0.98, -12.45], 46],
    [K.record3, [4.2, 1.05, -8.45], [2.4, 1.22, -12.5], 46], [K.lleva4 - 0.1, [4.25, 1.1, -8.55], [2.42, 1.28, -12.5], 46],
    [K.n230, [3.82, 1.35, -13.6], [3.85, 1.0, -20.6], 46], [K.copias4, [3.82, 1.42, -13.8], [3.88, 1.1, -20.65], 46], [K.brasil4, [3.82, 1.48, -14.0], [3.9, 1.18, -20.7], 46],
    [K.y5, [3.65, 1.5, -14.3], [4.4, 1.2, -20.4], 46], [K.y5 + 0.65, [1.6, 1.4, -16.0], [7.4, 1.0, -17.2], 47],
    [K.rockstar5, [1.15, 1.3, -16.35], [7.4, 1.0, -16.45], 46], [K.negar5, [1.05, 1.25, -16.38], [7.4, 1.05, -16.4], 45], [K.edificio5, [1.0, 1.3, -16.3], [7.4, 1.15, -16.25], 45],
    [K.mundo5, [1.0, 1.38, -16.3], [7.4, 1.25, -16.2], 45], [K.entre6, [1.05, 1.32, -16.45], [7.4, 1.15, -16.4], 45],
    [K.cualquier6, [1.25, 1.05, -16.7], [7.4, 0.85, -16.8], 45], [K.y7 - 0.1, [1.35, 1.05, -16.6], [7.4, 0.85, -16.8], 45],
    [K.ti7 + 0.25, [2.5, 1.25, -15.7], [7.0, 1.5, -8.0], 46], [K.euros7 + 0.2, [3.3, 1.3, -14.4], [6.5, 1.8, -4.0], 46],
    [K.respuesta8 + 0.15, [8.8, 1.7, -12.6], [6.0, 2.2, -1.0], 46], [K.segun8, [11.9, 1.9, -11.4], [5.8, 2.3, -1.0], 46], [K.tres8, [12.4, 2.0, -10.6], [5.8, 2.4, -1.0], 46],
    [K.ano8, [12.2, 2.3, -10.2], [5.8, 2.7, -1.0], 46], [K.pelicula8, [12.1, 3.0, -10.0], [5.8, 3.2, -1.0], 46], [K.historia8 + 0.3, [12.0, 3.8, -9.8], [5.7, 3.4, -1.0], 46],
    [K.pagarias9 + 0.3, [12.4, 3.4, -4.5], [5.2, 2.9, -1.0], 47], [K.videojuego9, [11.2, 2.8, 4.0], [4.6, 2.7, -1.0], 48],
    [K.mandaselo9, [7.4, 2.0, 9.4], [4.0, 2.7, -1.1], 48], [END - 1.2, [2.2, 0.9, 10.2], [3.7, 2.7, -1.1], 48], [END - 0.4, Hm, Lm, 48],
    [END, H0, L0, 48], [END + 0.5, H1, L1, 48],
  ];
  CKS = [A];
  { const st = camKeys(K.diecinueve2 + 0.4, A); S.cal.rotation.y = Math.atan2(st.p.x - PZ.cal.x, st.p.z - PZ.cal.z); }
  { const st = camKeys(K.n800, A); S.dayBoard.rotation.y = Math.atan2(st.p.x - ST1.sign.x, st.p.z - ST1.sign.z); }
}
function camAt(t) {
  const st = camKeys(t, CKS[0]);
  const te = eruptT(t), sh = 0.012 * Math.exp(-Math.max(0, te - ERUPT0) * 3.5) * (te < 1.6 ? 1 : 0);      // la arena tiembla cuando sale la torre
  st.p.x += Math.sin(t * 41) * sh + 0.004 * Math.sin(t * 1.3); st.p.y += Math.sin(t * 33 + 1) * sh + 0.003 * Math.sin(t * 1.7 + 2);
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[K.n1000 + 0.3, 0.03], [K.record3, 0.04], [K.brasil4, 0.03], [K.mundo5 - 0.05, 0.04], [K.euros7, 0.03], [K.pelicula8, 0.05]])
    if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t; cityAt(t, st); moneyAt(t);
  const c = st.l, d = st.p.distanceTo(c); sunAt(v3(c.x, 0, c.z).lerp(st.p, 0.25), clamp(d * 0.8 + 2.4, 3.5, 13));
}
// ---------------------------------------------------------------- HUD: cabecera (GTA 6 · el dinero · sale el 19 NOV) con la pregunta pendiente (¿cuánto va a ganar?) y titulares en placas
function buildHudPlan() {}
const HG = '#FFC24A', HD = '#8FE6FF', HR = '#FF5247', HV = '#7CF0A9';
function hdr(t) {
  hg.save(); const gr = hg.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, 'rgba(6,10,18,.5)'); gr.addColorStop(1, 'rgba(6,10,18,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, W, 300);
  hg.textBaseline = 'alphabetic'; hg.shadowColor = 'rgba(0,0,0,.6)'; hg.shadowBlur = 10;
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = '#ffffff'; hg.textAlign = 'left'; hg.fillText('GTA 6', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = '#E3E8EE'; hg.fillText('EL DINERO · LO QUE NADIE TE CUENTA', 56, 182);
  hg.fillStyle = 'rgba(255,255,255,.45)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = '#E3E8EE'; hg.fillText('SALE EL', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('19 NOV', 1024, 148);
  hfont(17, false); hg.fillStyle = '#E3E8EE'; hg.fillText('PS5 · XBOX SERIES', 1024, 178);
  const mk = win(t, K.ganar2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = '¿CUÁNTO VA A GANAR? · ???', col = HR, blink = true;
    if (t > K.tres8 + 0.2) { txt = '3.200 M$ EL 1.ER AÑO (ANALISTAS) ✓'; col = HC.green; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = mk; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.shadowBlur = 0; hg.fillStyle = 'rgba(8,10,14,.6)'; hg.fillRect(x0, y - 22, w, 32);
    hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath();
    hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
    hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
    hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y);
  }
  hg.restore();
}
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function cap(txt, y, size, col, k, o = {}) {
  if (k <= 0.01) return; hg.save(); hg.letterSpacing = (o.ls ?? Math.round(size * 0.12)) + 'px'; hfont(size); const tw = hg.measureText(txt).width, pw = tw + size * 1.1, ph = size * 1.55, x = o.x ?? W / 2;
  const e = eo(clamp(k * 1.4)); hg.globalAlpha = clamp(k * 3) * 0.78; hg.fillStyle = o.bg || 'rgba(10,12,18,1)'; rr(hg, x - pw / 2 * e, y - ph / 2, pw * e, ph, ph * 0.22); hg.fill();
  if (o.bar) { hg.globalAlpha = clamp(k * 3); hg.fillStyle = o.bar; hg.fillRect(x - pw / 2 * e, y - ph / 2, 8, ph); } hg.restore();
  bigText(txt, x, y + 2, size, col, k, { glow: o.glow, type: o.type, ls: o.ls ?? Math.round(size * 0.12) });
}
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1440;
  // 1
  { cap('NINGUNA PELÍCULA', Y - 45, 52, '#ffffff', cw(t, K.pelicula1 - 0.1, K.es2 - 0.1)); cap('HA GANADO TANTO', Y + 45, 60, HG, cw(t, K.ganado1 - 0.05, K.es2 - 0.1), { glow: 10, bar: HG }); }
  // 2
  { cap('GTA 5', Y, 86, HV, cw(t, K.gta2 - 0.1, K.y2 - 0.05), { glow: 12, type: false, bar: HV });
    cap('19 DE NOVIEMBRE', Y - 45, 44, '#ffffff', cw(t, K.diecinueve2 - 0.1, K.cuanto2 - 0.1)); cap('SALE GTA 6', Y + 45, 64, HG, cw(t, K.sale2 - 0.05, K.cuanto2 - 0.1), { glow: 10, type: false, bar: HG });
    cap('¿CUÁNTO VA A GANAR?', Y, 58, HG, cw(t, K.cuanto2 - 0.05, K.el3 - 0.1), { glow: 10, bar: HG }); cap('TE LO DIGO AL FINAL ↓', Y + 100, 32, '#ffffff', cw(t, K.digo2 - 0.05, K.el3 - 0.1)); }
  // 3
  { const n1 = lerp(0, 800, eo(clamp((t - K.n800 + 0.15) / 0.7))), n2 = lerp(800, 1000, eo(clamp((t - K.n1000 + 0.1) / 0.5)));
    cap('EL PRIMER DÍA', Y - 60, 40, '#ffffff', cw(t, K.primer3 - 0.1, K.en3 - 0.1)); cap(fmt(n1) + ' M$', Y + 30, 82, HV, cw(t, K.n800 - 0.1, K.en3 - 0.1), { glow: 12, type: false, bar: HV });
    cap('EN 3 DÍAS', Y - 60, 40, '#ffffff', cw(t, K.en3 - 0.05, K.lleva4 - 0.1)); cap(fmt(t < K.n1000 - 0.1 ? 800 : n2) + ' M$', Y + 30, 82, HV, cw(t, K.n1000 - 0.15, K.lleva4 - 0.1), { glow: 12, type: false, bar: HV });
    cap('RÉCORD GUINNESS', Y + 130, 38, HG, cw(t, K.record3 - 0.05, K.lleva4 - 0.1), { bar: HG }); }
  // 4
  { const n = lerp(0, 230, eo(clamp((t - K.n230 + 0.1) / 0.9)));
    cap('+' + fmt(n) + ' MILLONES', Y - 40, 66, HV, cw(t, K.n230 - 0.1, K.y5 - 0.1), { glow: 10, type: false, bar: HV }); cap('DE COPIAS', Y + 50, 40, '#ffffff', cw(t, K.copias4 - 0.1, K.y5 - 0.1));
    cap('MÁS QUE HABITANTES TIENE BRASIL', Y + 135, 34, HG, cw(t, K.mas4b - 0.05, K.y5 - 0.1), { bar: HG }); }
  // 5
  { cap('¿Y GTA 6?', Y, 76, HG, cw(t, K.y5 - 0.05, K.rockstar5 - 0.05), { glow: 12, type: false, bar: HG });
    cap('ROCKSTAR NIEGA QUE COSTARA', Y - 50, 40, '#ffffff', cw(t, K.negar5 - 0.1, K.los6 - 0.1)); cap('MÁS QUE EL BURJ KHALIFA', Y + 40, 54, HR, cw(t, K.edificio5 - 0.1, K.los6 - 0.1), { glow: 10, bar: HR }); }
  // 6
  { cap('LOS ANALISTAS CALCULAN', Y - 60, 38, HC.grey, cw(t, K.los6 - 0.05, K.y7 - 0.1)); cap('1.000–1.500 M$', Y + 25, 76, HG, cw(t, K.n1000b - 0.1, K.y7 - 0.1), { glow: 12, type: false, bar: HG });
    cap('MÁS QUE CUALQUIER PELÍCULA', Y + 125, 38, '#ffffff', cw(t, K.mas6 - 0.05, K.y7 - 0.1)); }
  // 7
  { cap('Y A TI TE COSTARÁ', Y - 45, 44, '#ffffff', cw(t, K.y7 - 0.05, K.respuesta8 - 0.1)); cap('79,99 €', Y + 50, 84, HR, cw(t, K.n80 - 0.15, K.respuesta8 - 0.1), { glow: 12, type: false, bar: HR }); }
  // 8
  { const n = lerp(0, 3200, eio(clamp((t - K.tres8 + 0.1) / 2.4)));
    cap('LA RESPUESTA', Y - 60, 40, '#ffffff', cw(t, K.respuesta8 - 0.05, K.tres8 - 0.1)); cap('SEGÚN LOS ANALISTAS', Y - 60, 34, HC.grey, cw(t, K.segun8 - 0.05, K.pagarias9 - 0.1));
    cap(fmt(n) + ' M$', Y + 30, 92, HV, cw(t, K.tres8 - 0.1, K.pagarias9 - 0.1), { glow: 14, type: false, bar: HV });
    cap('SOLO EL PRIMER AÑO', Y + 135, 40, HG, cw(t, K.solo8 - 0.05, K.mas8 - 0.05), { bar: HG }); cap('MÁS QUE LA PELÍCULA N.º 1', Y + 135, 40, HG, cw(t, K.mas8 - 0.05, K.pagarias9 - 0.1), { bar: HG }); }
  // 9
  { cap('¿PAGARÍAS 80 €', Y - 45, 66, '#ffffff', cw(t, K.pagarias9 - 0.05, K.mandaselo9 - 0.05), { type: false, bar: '#ffffff' }); cap('POR UN VIDEOJUEGO?', Y + 50, 56, HG, cw(t, K.videojuego9 - 0.15, K.mandaselo9 - 0.05), { glow: 10, type: false, bar: HG });
    cap('MÁNDASELO A QUIEN DICE QUE', Y - 30, 40, '#ffffff', cw(t, K.mandaselo9 - 0.05, END - 0.6)); cap('JUGAR ES TIRAR EL DINERO', Y + 55, 50, HG, cw(t, K.jugar9 - 0.1, END - 0.6), { bar: HG }); }
}
// ---------------------------------------------------------------- un fotograma (renderAt), portada y arranque: tipos de letra, tiempos de la voz y escena
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
  const t = window.COVER_T ? Number(window.COVER_T) : 1.2; frame(t);
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
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    pelicula1: atL(1, 'pelicula'), historia1: atL(1, 'historia'), ganado1: atL(1, 'ganado'), dinero1: atL(1, 'dinero'), videojuego1: atL(1, 'videojuego'),
    es2: atL(2, '=es'), gta2: atL(2, 'gta'), y2: atL(2, '=y'), diecinueve2: atL(2, '=19'), noviembre2: atL(2, 'noviembre'), sale2: atL(2, 'sale'), gta6_2: atL(2, 'gta', 2), cuanto2: atL(2, 'cuanto'), ganar2: atL(2, 'ganar'), digo2: atL(2, 'digo'), final2: atL(2, 'final'),
    el3: atL(3, '=el'), primer3: atL(3, 'primer'), dia3: atL(3, 'dia'), gta3: atL(3, 'gta'), n800: atL(3, '=800'), dolares3: atL(3, 'dolares'), en3: atL(3, '=en'), n3: atL(3, '=3'), n1000: atL(3, '=1000'), record3: atL(3, 'record'), guinness3: atL(3, 'guinness'),
    lleva4: atL(4, 'lleva'), n230: atL(4, '=230'), copias4: atL(4, 'copias'), mas4b: atL(4, '=mas', 2), habitantes4: atL(4, 'habitantes'), brasil4: atL(4, 'brasil'),
    y5: atL(5, '=y'), rockstar5: atL(5, 'rockstar'), negar5: atL(5, 'negar'), costara5: atL(5, 'costara'), edificio5: atL(5, 'edificio'), alto5: atL(5, 'alto'), mundo5: atL(5, 'mundo'),
    los6: atL(6, '=los'), analistas6: atL(6, 'analistas'), entre6: atL(6, 'entre'), n1000b: atL(6, '=1000'), n1500: atL(6, '=1500'), mas6: atL(6, '=mas'), cualquier6: atL(6, 'cualquier'), pelicula6: atL(6, 'pelicula'),
    y7: atL(7, '=y'), ti7: atL(7, '=ti'), costara7: atL(7, 'costara'), n80: atL(7, '=80'), euros7: atL(7, 'euros'),
    respuesta8: atL(8, 'respuesta'), segun8: atL(8, 'segun'), tres8: atL(8, '=3200'), millones8: atL(8, 'millones'), solo8: atL(8, 'solo'), ano8: atL(8, 'ano'), mas8: atL(8, '=mas'), pelicula8: atL(8, 'pelicula'), taquillera8: atL(8, 'taquillera'), historia8: atL(8, 'historia'),
    pagarias9: atL(9, 'pagarias'), n80b: atL(9, '=80'), videojuego9: atL(9, 'videojuego'), mandaselo9: atL(9, 'mandaselo'), jugar9: atL(9, 'jugar'), dinero9: atL(9, 'dinero'),
  };
  mats(); buildMats(); buildRig(); S.flow = [];
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35; }
  buildDay(); buildCity();
  post.uniforms.ca.value = 0.35; post.uniforms.vig.value = 0.2;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
