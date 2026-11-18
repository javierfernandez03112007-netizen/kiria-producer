// «La ciudad de los seguidores», episodio 2 (19-11-2026): Kiria World ya es un pueblo y cada seguidor hace algo: pasea, conduce, trabaja…
// La cámara va de sitio en sitio (peluquería, supermercado, banco, panadería, bomberos, taxis, colegio, lago) y acaba en el trono: hacen falta leyes.
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
import { triTable, MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { W, H, clamp, prog, lerp, eo, eio, ss, loadTopo, ringSegments, ll, fatLines, arcPoints } from './lib.js';

// ---------------------------------------------------------------- render, resplandor y acabado
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
const PR = window.PR || 1; renderer.setPixelRatio(PR); renderer.setSize(W, H); document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.localClippingEnabled = true;
const rtA = new THREE.WebGLRenderTarget(W * PR, H * PR, { type: THREE.HalfFloatType, samples: 4 });
rtA.depthTexture = new THREE.DepthTexture(W * PR, H * PR); rtA.depthTexture.type = THREE.FloatType;
const BLW = Math.round(W * PR / 4), BLH = Math.round(H * PR / 4);
const rtB = [0, 1].map(() => new THREE.WebGLRenderTarget(BLW, BLH, { type: THREE.HalfFloatType }));
const rtC = [0, 1].map(() => new THREE.WebGLRenderTarget(Math.round(BLW / 2), Math.round(BLH / 2), { type: THREE.HalfFloatType }));
// los chorros de motores y cohetes van aparte: a media resolución y sin multimuestreo, y se suman luego a la imagen y al resplandor
const rtF = new THREE.WebGLRenderTarget(Math.round(W * PR / 2), Math.round(H * PR / 2), { type: THREE.HalfFloatType });
const fxScene = new THREE.Scene();
const VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
// profundidad de campo (como un objetivo de cine): desenfoque por disco según la distancia a lo enfocado (de una sola pasada, «bokeh» de Gustafsson)
const rtD = new THREE.WebGLRenderTarget(W * PR, H * PR, { type: THREE.HalfFloatType });
const dofM = new THREE.ShaderMaterial({ uniforms: { tA: { value: null }, tD: { value: null }, focus: { value: 30 }, scale: { value: 0 }, logF: { value: 13 }, px: { value: new THREE.Vector2(1 / (W * PR), 1 / (H * PR)) }, maxR: { value: 18 * PR } },
  vertexShader: VS, depthTest: false,
  fragmentShader: `uniform sampler2D tA, tD; uniform float focus, scale, logF, maxR; uniform vec2 px; varying vec2 vUv;
    float lin(vec2 uv){ return exp2(texture2D(tD, uv).x * logF) - 1.0; }
    float bs(float z){ return clamp(abs(1.0 / focus - 1.0 / max(z, 0.01)) * scale, 0.0, 1.0) * maxR; }
    void main(){ float zc = lin(vUv), cs = bs(zc); vec3 col = texture2D(tA, vUv).rgb; float tot = 1.0;
      if (scale <= 0.0) { gl_FragColor = vec4(col, 1.0); return; }
      for (int i = 0; i < 56; i++) { float fi = float(i) + 0.5, r = sqrt(fi / 56.0) * maxR, a = fi * 2.39996323;
        vec2 tc = vUv + vec2(cos(a), sin(a)) * px * r; float z = lin(tc), ss = bs(z); if (z > zc) ss = min(ss, cs * 2.0);
        float m = smoothstep(r - 0.5, r + 0.5, ss); col += mix(col / tot, texture2D(tA, tc).rgb, m); tot += 1.0; }
      gl_FragColor = vec4(col / tot, 1.0); }` });
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
    fade: { value: 0 }, white: { value: 0 }, fillk: { value: 0 }, fillc: { value: new THREE.Vector3(0.6, 0.85, 0.95) }, vig: { value: 0.38 }, time: { value: 0 }, flash: { value: 0 }, bloom: { value: 0.75 }, ca: { value: 1 }, mbk: { value: 0.8 }, tint: { value: new THREE.Vector3(0, 0, 0) } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D tA, tB, tC, tF, tH; uniform vec2 m0, a0; uniform vec4 J; uniform vec3 tint; uniform float fade, white, vig, time, flash, bloom, ca, mbk, fillk; uniform vec3 fillc; varying vec2 vUv;
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
      a = mix(a, fillc, fillk);                                                                          // velo de color (entrar en el agua, el calor)
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
let HFONT = MONO, HW = [700, 400];
function hfont(px, bold = true) { hg.font = `${bold ? HW[0] : HW[1]} ${px}px ${HFONT}`; }
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
    hg.shadowColor = o.light ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,.9)'; hg.shadowBlur = o.light ? 0 : 8;
    const tx = T.x + (right ? 12 : -12);
    if (o.bg) { hg.save(); hg.shadowBlur = o.light ? 18 : 0; hg.shadowColor = 'rgba(60,40,30,.18)'; hg.fillStyle = o.light ? 'rgba(255,255,255,.93)' : 'rgba(0,0,0,.72)'; const bh = sub ? size + subSize * 1.7 + 14 : size * 1.55; rr(hg, (right ? tx : tx - tw) - 14, T.y - size * 0.78, tw + 28, bh, 10); hg.fill(); hg.restore(); }
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
  if (o.halo) { hg.save(); hg.shadowColor = 'rgba(255,255,255,1)'; hg.shadowBlur = o.halo; hg.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 2; i++) { if (o.scale) { hg.save(); hg.translate(x, y); hg.scale(o.scale, o.scale); hg.fillText(s, 0, 0); hg.restore(); } else hg.fillText(s, x, y); } hg.restore(); }
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
// ---------------------------------------------------------------- EL MUNDO (episodio 2): Kiria World ya es un pueblo. Cuadrícula vista en diagonal desde arriba.
// 1 unidad = 1 m. Las calles van a lo largo de X y de Z; la cámara mira en diagonal (desde +X,+Z), así que en pantalla:
//   U = (x − z)/√2 → derecha · V = −(x + z)/√2 → hacia el fondo (arriba en pantalla).
// Cada manzana (30 m) tiene 16 casas alrededor (una por cada 5 seguidores) y un patio en medio. En el centro, la plaza con el trono.
function fnOf(n) { try { return eval('typeof ' + n + " === 'function' ? " + n + ' : null'); } catch (e) { return null; } }
const NPOP = 6124;                                   // seguidores de Instagram de kiria.ai el 18-11-2026 (dato de Javi; Metricool daba 6.081 el 17-11)
const NNAMED = 5997;                                 // de los primeros 5.997 hay nombre (exportación del 17-11); los nuevos, sin etiqueta hasta la próxima
const PITCH = 42, BLOCK = 30, SQ = Math.SQRT1_2;
const REG = { u: 104, v: 272 }, REG2 = { u: 146, v: 314 };      // el campamento del episodio 1 y el pueblo de hoy
const toU = (x, z) => (x - z) * SQ, toV = (x, z) => -(x + z) * SQ, fromUV = (u, v) => [(u - v) * SQ, -(u + v) * SQ];
const seg = (t, a, b) => clamp((t - a) / (b - a));
const h2 = (a, b) => hash(a * 12.9898 + b * 78.233 + 0.37);
// manzanas con algo especial (las demás son de casas)
const SPECIAL = { '0,-1': 'super', '-1,0': 'banco', '1,0': 'lago', '0,1': 'tiendas', '1,1': 'bomberos', '2,1': 'cole', '-1,1': 'obra', '1,-1': 'mercado', '-1,-1': 'parque', '2,0': 'deporte' };
const KING = NPOP - 1;                               // el rey de hoy (su comentario fue el más votado del episodio 1): sentado en el trono
// los seguidores que nombra la voz (número de seguidor por orden de llegada; los nombres van en script.txt)
const VIP = { cliente: 50, peluquera: 3951, carro: 2672, cajera: 5215 };
function makeBlocks() { const out = [];
  for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) { if (!i && !j) continue; const x = i * PITCH, z = j * PITCH, u = toU(x, z), v = toV(x, z), au = Math.abs(u), av = Math.abs(v);
    if (au > REG2.u - 12 || av > REG2.v - 12) continue;
    out.push({ i, j, x, z, u, v, core: au <= REG.u - 12 && av <= REG.v - 12, m: Math.max(au / REG.u, av / REG.v), r: Math.hypot(u, v), kind: SPECIAL[i + ',' + j] || null, h: h2(i, j) }); }
  return out.sort((p, q) => p.m - q.m); }
// camino en bucle alrededor de (cx, cz): cuadrado de semilado r con las esquinas redondeadas (radio q); s = metros recorridos → [x, z, rumbo]
function loopAt(cx, cz, r, q, s, dir = 1) { const Ls = 2 * (r - q), La = Math.PI * q / 2, P = 4 * (Ls + La); let u = ((dir > 0 ? s : -s) % P + P) % P; const k = Math.floor(u / (Ls + La)); u -= k * (Ls + La);
  let lx, lz, hx, hz; if (u < Ls) { lx = -r + q + u; lz = -r; hx = 1; hz = 0; } else { const a = (u - Ls) / q; lx = r - q + q * Math.sin(a); lz = -r + q - q * Math.cos(a); hx = Math.cos(a); hz = Math.sin(a); }
  for (let i = 0; i < k; i++) { [lx, lz] = [-lz, lx]; [hx, hz] = [-hz, hx]; }
  if (dir < 0) { hx = -hx; hz = -hz; } return [cx + lx, cz + lz, Math.atan2(hx, hz)]; }
const loopLen = (r, q) => 4 * (2 * (r - q) + Math.PI * q / 2);
// ---------------------------------------------------------------- materiales realistas (madera, latón, mármol, piel, papel, tela) y piezas de museo (del vídeo de Derecho)
// para «Qué pasa cuando te crujes los dedos». Las estaciones están en un círculo de radio R_ST.
const R_ST = 8.0, R_CAM = 10.6;
const ANG = { D: 30, C: 78, K: 128, P: 178, B: 232 };       // estaciones: el nudillo (L3), la resonancia (L4), el debate y los 20 min (L5–L6), las manos de Unger (L7), las radiografías (L8)
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
  const g = new THREE.Group(); const base = rbox(w + 0.06, w + 0.06, 0.08, M.wood, 0.01); base.rotation.x = Math.PI / 2; base.position.y = 0.04; g.add(base);
  const glass = mesh(new THREE.BoxGeometry(w, h, w), M.glass, false); glass.position.y = 0.08 + h / 2; glass.renderOrder = 7; g.add(glass);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, w)), new THREE.LineBasicMaterial({ color: 0xcfa860 })); frame.position.copy(glass.position); g.add(frame);
  const cap = rbox(w + 0.04, w + 0.04, 0.03, M.wood, 0.008); cap.rotation.x = Math.PI / 2; cap.position.y = 0.08 + h + 0.015; g.add(cap);
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
// ---------------------------------------------------------------- el cielo y la luz: 'vice' (atardecer rosa de Vice City, sol bajo) y 'noche' (callejón, más oscuro).
// moodSet(nombre) pone uno; moodMix({vice: 0.3, noche: 0.7}) mezcla. Cielo de degradado (cúpula que sigue a la cámara) + reflejos (PMREM de ese cielo).
const _o = new THREE.Object3D();      // objeto de trabajo para las matrices de las instancias
const ASSET = '/projects/gta6_policia/web/assets/';
const ENV = { rot: 0, env: 1 };
const TEXL = new THREE.TextureLoader(), PENDING = [];
function tx(path, srgb = true, rep = null) { let ok; PENDING.push(new Promise(a => { ok = a; })); const t = TEXL.load(ASSET + path, () => ok(), undefined, () => { console.error('ERROR textura ' + path); ok(); });
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
function waitLoads() { return Promise.all(PENDING); }
const C3 = h => new THREE.Color(h);
// sky: cénit, horizonte, suelo (bajo el horizonte), sol (dirección, color, tamaño); fog: color y densidad (FogExp2, por unidad); key: sol/foco; fill; hemi: cielo, suelo, intensidad
const MOODS = {
  dia:    { zen: 0x7fb6ee, hor: 0xd8ecf6, gnd: 0x6fae5a, sunD: [-0.14, 0.75, 0.71], sunC: 0xffffff, sunS: 0.0, stars: 0.0, fogC: 0xcfe6d8, fogD: 0.00022,
            key: [0xfff3da, 2.7], keyD: [-0.3, 0.72, 0.62], fill: [0xcfe2ff, 0.45], hemi: [0xe8f3ff, 0x8fb070, 0.85], env: 0.6, exp: 1.0 },
  crisis: { zen: 0x8a94a0, hor: 0xc9ced4, gnd: 0x80887a, sunD: [-0.14, 0.75, 0.71], sunC: 0xffffff, sunS: 0.0, stars: 0.0, fogC: 0xb9bec2, fogD: 0.0005,
            key: [0xdfe4ea, 1.7], keyD: [-0.3, 0.72, 0.62], fill: [0xc8d0dc, 0.45], hemi: [0xdfe4ea, 0x8a8f88, 0.8], env: 0.45, exp: 1.0 },
};
const SKY_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vD; void main(){ vD = normalize(position); vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;
#include <logdepthbuf_vertex>
}`;
const SKY_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 zen, hor, gnd, sunD, sunC; uniform float sunS, stars; varying vec3 vD;
float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main(){
#include <logdepthbuf_fragment>
  vec3 d = normalize(vD); float y = d.y;
  vec3 c = y > 0. ? mix(hor, zen, pow(clamp(y, 0., 1.), 0.55)) : mix(hor, gnd, clamp(-y * 6., 0., 1.));
  float s = max(dot(d, normalize(sunD)), 0.);
  c += sunC * (pow(s, 6.) * 0.35 + pow(s, 60.) * 0.9 + smoothstep(0.9993, 0.9997, s) * 6.) * sunS;
  if (stars > 0. && y > 0.02) { vec3 q = floor(d * 420.); float r = h3(q); c += vec3(0.9, 0.95, 1.) * step(0.9965, r) * stars * (0.4 + 0.6 * h3(q + 3.1)) * smoothstep(0.02, 0.25, y); }
  gl_FragColor = vec4(c, 1.); }`;
function skyMat() { return new THREE.ShaderMaterial({ uniforms: { zen: { value: C3(0) }, hor: { value: C3(0) }, gnd: { value: C3(0) }, sunD: { value: new THREE.Vector3(0, 1, 0) }, sunC: { value: C3(0) }, sunS: { value: 0 }, stars: { value: 0 } },
  vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false }); }
function skyUniforms(u, M) { u.zen.value.set(M.zen); u.hor.value.set(M.hor); u.gnd.value.set(M.gnd); u.sunD.value.set(...M.sunD).normalize(); u.sunC.value.set(M.sunC); u.sunS.value = M.sunS; u.stars.value = M.stars; }
let PMREM = null; const ENVS = {};
async function loadEnv() {
  PMREM = new THREE.PMREMGenerator(renderer);
  // reflejos de cada ambiente: su cielo en una escena pequeña (+ una «sala» neutra muy suave para que el plástico tenga brillos)
  for (const k in MOODS) { const sc = new THREE.Scene(), m = skyMat(); skyUniforms(m.uniforms, MOODS[k]); const s = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), m); sc.add(s);
    { const room = new RoomEnvironment(); room.scale.setScalar(0.6); room.traverse(o => { if (o.material) { o.material = o.material.clone(); if (o.material.color) o.material.color.multiplyScalar(0.12); if (o.material.emissive) o.material.emissiveIntensity *= 0.12; } }); sc.add(room); }
    ENVS[k] = PMREM.fromScene(sc, 0.03).texture; }
  S.sky = new THREE.Mesh(new THREE.SphereGeometry(15000, 64, 32), skyMat()); S.sky.renderOrder = -10; S.sky.frustumCulled = false; scene.add(S.sky);
  scene.background = null; S.fog = new THREE.FogExp2(0x000000, 0); scene.fog = S.fog;
}
// la luz: un «sol» que da sombras (sigue a lo que mira la cámara), un relleno y una luz de cielo/suelo
function buildLights() {
  const key = new THREE.DirectionalLight(0xffffff, 2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 4; key.shadow.bias = -0.0003;
  scene.add(key, key.target); const fill = new THREE.DirectionalLight(0xffffff, 0.4); scene.add(fill, fill.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.4); scene.add(hemi); S.L = { key, fill, hemi, keyD: new THREE.Vector3(0, 1, 0), fillD: new THREE.Vector3(-0.95, 0.22, -0.1) };
  moodSet('dia');
}
// mezcla de ambientes: w = { museo: 0.2, brasil: 0.8 } (se normaliza). Los reflejos son los del que más pesa.
const _ca = new THREE.Color(), _cb = new THREE.Color();
function moodMix(w) {
  let tot = 0; for (const k in w) tot += w[k]; if (tot <= 0) return; const ks = Object.keys(w).filter(k => w[k] > 0);
  const col = f => { _ca.setRGB(0, 0, 0); for (const k of ks) { _cb.set(f(MOODS[k])); _ca.r += _cb.r * w[k] / tot; _ca.g += _cb.g * w[k] / tot; _ca.b += _cb.b * w[k] / tot; } return _ca; };
  const num = f => ks.reduce((s, k) => s + f(MOODS[k]) * w[k] / tot, 0);
  const vec = f => { const v = new THREE.Vector3(); for (const k of ks) v.addScaledVector(new THREE.Vector3(...f(MOODS[k])).normalize(), w[k] / tot); return v.normalize(); };
  const u = S.sky.material.uniforms; u.zen.value.copy(col(M => M.zen)); u.hor.value.copy(col(M => M.hor)); u.gnd.value.copy(col(M => M.gnd)); u.sunC.value.copy(col(M => M.sunC));
  u.sunD.value.copy(vec(M => M.sunD)); u.sunS.value = num(M => M.sunS); u.stars.value = num(M => M.stars);
  S.fog.color.copy(col(M => M.fogC)); S.fog.density = Math.exp(num(M => Math.log(M.fogD + 1e-7))) * (S.fogK ?? 1);
  const L = S.L; L.key.color.copy(col(M => M.key[0])); L.key.intensity = num(M => M.key[1]); L.keyD.copy(vec(M => M.keyD));
  L.fill.color.copy(col(M => M.fill[0])); L.fill.intensity = num(M => M.fill[1]);
  L.hemi.color.copy(col(M => M.hemi[0])); L.hemi.groundColor.copy(col(M => M.hemi[1])); L.hemi.intensity = num(M => M.hemi[2]);
  let best = ks[0]; for (const k of ks) if (w[k] > w[best]) best = k; S.mood = best;
  scene.environment = ENVS[best]; S.envI = num(M => M.env) * ENV.env; scene.environmentIntensity = S.envI;
  for (const m of ENVMATS) envMat(m);
}
function moodSet(k) { moodMix({ [k]: 1 }); }
// la sombra sigue a lo que mira la cámara (más fina cuanto más cerca: sirve de cerca y en planos de cientos de unidades)
function lightsAt(c, d) {
  const L = S.L, R = clamp(d * 0.75, 1.5, 900), sc = L.key.shadow.camera, far = 400 + 3 * R;
  S.sky.position.copy(cam.position);
  L.key.position.copy(c).addScaledVector(L.keyD, far * 0.5); L.key.target.position.copy(c);
  sc.left = sc.bottom = -R; sc.right = sc.top = R; sc.near = Math.max(0.1, far * 0.5 - 3 * R - 60); sc.far = far * 0.5 + 3 * R + 120; sc.updateProjectionMatrix(); L.key.shadow.normalBias = R * 0.004;
  L.fill.position.copy(c).addScaledVector(L.fillD, 300); L.fill.target.position.copy(c);
}
// materiales que llevan sus propios reflejos (con intensidad propia): se les cambia el mapa al cambiar de ambiente
const ENVMATS = new Set();
function envMat(m, k) { if (!m || !m.isMeshStandardMaterial || !scene.environment) return; if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity; if (k !== undefined) m.userData.envK = k; ENVMATS.add(m);
  if (m.envMap !== scene.environment) { m.envMap = scene.environment; m.needsUpdate = true; } m.envMapIntensity = m.userData.envFixed ?? m.userData.env0 * (m.userData.envK ?? 1) * (S.envI ?? 1); }
function envAll(root, k) { root.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) envMat(m, k); }); }
// ---------------------------------------------------------------- EL PUEBLO: suelo, carreteras con su raya, aceras, manzanas con 16 casas (una por cada 5 seguidores)
// y un patio en medio, árboles, la plaza, el trono gigante, la corona y el cartel con el nombre. Todo con instancias y sin texturas ajenas.
const CITY = {};
const stdM = (c, r = 0.85, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
const cM = stdM;
function inst(geo, mat, n, cast = true) { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.count = n; m.castShadow = cast; m.receiveShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); return m; }
const _IM = new THREE.Matrix4(), _IP = new THREE.Vector3(), _IQ = new THREE.Quaternion(), _IS = new THREE.Vector3(), _IE = new THREE.Euler(), _IC = new THREE.Color(), _IC2 = new THREE.Color(), _IE2 = new THREE.Vector3();
function setI(m, i, x, y, z, sx, sy, sz, ry = 0) { _IE.set(0, ry, 0); _IQ.setFromEuler(_IE); _IP.set(x, y, z); _IS.set(Math.max(1e-4, sx), Math.max(1e-4, sy), Math.max(1e-4, sz)); _IM.compose(_IP, _IQ, _IS); m.setMatrixAt(i, _IM); }
// lo mismo, pero escribiendo la matriz a mano (giro en Y + escala): para las miles de figuritas que se mueven
function setYS(arr, i, x, y, z, s, yaw) { const o = i * 16, c = Math.cos(yaw) * s, n = Math.sin(yaw) * s; arr[o] = c; arr[o + 1] = 0; arr[o + 2] = -n; arr[o + 3] = 0; arr[o + 4] = 0; arr[o + 5] = s; arr[o + 6] = 0; arr[o + 7] = 0; arr[o + 8] = n; arr[o + 9] = 0; arr[o + 10] = c; arr[o + 11] = 0; arr[o + 12] = x; arr[o + 13] = y; arr[o + 14] = z; arr[o + 15] = 1; }
const boxG = (w, h, d, y = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, y, 0); return g; };
function addBox(par, w, h, d, m, x, y, z, ry = 0) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.y = ry; b.castShadow = b.receiveShadow = true; par.add(b); return b; }
const popK = k => { k = clamp(k); return k <= 0 ? 0 : k >= 1 ? 1 : 1 + Math.sin(k * Math.PI * 1.15) * (1 - k) * 0.5 + (eo(k) - 1); };

function buildThrone() { const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.3, metalness: 0.9 }), red = stdM(0xb3202a, 0.75), stone = stdM(0xdcd6c8, 0.9);
  const s1 = cyl(13, 14, 0.9, stone, 44); s1.position.y = 0.45; const s2 = cyl(10.6, 11.6, 0.9, stone, 44); s2.position.y = 1.35; g.add(s1, s2); const y0 = 1.8;
  addBox(g, 9, 5, 8, gold, 0, y0 + 2.5, 0); addBox(g, 7.2, 1.0, 6.2, red, 0, y0 + 5.5, 0.5); addBox(g, 9, 15, 1.6, gold, 0, y0 + 12.5, -3.2); addBox(g, 6.6, 11, 0.4, red, 0, y0 + 11.5, -2.3);
  { const a = cyl(4.5, 4.5, 1.6, gold, 36); a.rotation.x = Math.PI / 2; a.position.set(0, y0 + 20, -3.2); g.add(a); const b = cyl(3.3, 3.3, 0.4, red, 30); b.rotation.x = Math.PI / 2; b.position.set(0, y0 + 20, -2.3); g.add(b); }
  for (const sx of [-1, 1]) { addBox(g, 1.5, 3, 7, gold, sx * 3.75, y0 + 6.5, 0.4); const f = sph(1.0, gold, 16, 12); f.position.set(sx * 3.75, y0 + 8.6, 3.5); f.castShadow = true; g.add(f); const f2 = sph(1.0, gold, 16, 12); f2.position.set(sx * 4.5, y0 + 20.8, -3.2); g.add(f2); }
  g.rotation.y = Math.PI / 4; g.scale.setScalar(1.3); g.userData.seatY = (y0 + 6) * 1.3; return g; }
function buildCrown() { const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xffd04a, roughness: 0.22, metalness: 0.95, side: THREE.DoubleSide, emissive: 0x6a4a00, emissiveIntensity: 0.5 });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.45, 1.7, 28, 1, true), gold); ring.castShadow = true; g.add(ring);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, c = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.9, 4), gold); c.position.set(Math.cos(a) * 2.7, 1.75, Math.sin(a) * 2.7); c.castShadow = true; g.add(c);
    const j = sph(0.36, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xd9263a : 0x2f7fe0, roughness: 0.15, metalness: 0.2, emissive: i % 2 ? 0x5a0a12 : 0x0a2a5a }), 10, 8); j.position.set(Math.cos(a) * 2.7, 2.85, Math.sin(a) * 2.7); g.add(j); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xffe08a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(16); g.add(halo); g.userData.halo = halo; return g; }

function buildCity() {
  const g = new THREE.Group(), C = CITY; C.g = g; const BL = C.BL = makeBlocks();
  // ---- suelo: hierba, el asfalto del pueblo, la raya discontinua de cada calle y la plaza
  { const t = canvasTex(256, 256, (q, w, h) => { q.fillStyle = '#7cb657'; q.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { q.fillStyle = hash(i * 1.3) > 0.5 ? 'rgba(255,255,220,.07)' : 'rgba(20,60,10,.08)'; q.fillRect(hash(i * 2.1) * w, hash(i * 3.7) * h, 3, 3); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(260, 260); const gr = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), stdM(0xffffff, 0.95, { map: t })); gr.rotation.x = -Math.PI / 2; gr.receiveShadow = true; g.add(gr);
    const rot = new THREE.Group(); rot.rotation.y = Math.PI / 4; g.add(rot); const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * (REG2.u + 9), 2 * (REG2.v + 9)), stdM(0x666c74, 0.95)); m.rotation.x = -Math.PI / 2; m.position.y = 0.04; m.receiveShadow = true; rot.add(m);
    const pz = cyl(28.5, 28.5, 0.14, stdM(0xd9cdb2, 0.9), 56); pz.position.y = 0.1; pz.castShadow = false; g.add(pz);
    const inR = (x, z) => Math.abs(toU(x, z)) < REG2.u + 6 && Math.abs(toV(x, z)) < REG2.v + 6 && Math.hypot(x, z) > 30, ds = [];
    for (let i = -11; i <= 11; i++) for (let k = -80; k <= 80; k++) { const a = (i + 0.5) * PITCH, b = k * 5.2; if (inR(a, b)) ds.push([a, b, 0]); if (inR(b, a)) ds.push([b, a, Math.PI / 2]); }
    const dm = inst(boxG(0.22, 0.04, 2.2, 0.07), new THREE.MeshBasicMaterial({ color: 0xe9e9e4, toneMapped: false }), ds.length, false); ds.forEach((d, i) => setI(dm, i, d[0], 0, d[1], 1, 1, 1, d[2])); dm.receiveShadow = false; g.add(dm); }
  // ---- manzanas: acera y césped (las especiales van pavimentadas)
  C.walk = inst(boxG(BLOCK + 4, 0.3, BLOCK + 4, 0.15), stdM(0xffffff, 0.9), BL.length, false); C.lawn = inst(boxG(BLOCK, 0.5, BLOCK, 0.25), stdM(0xffffff, 0.95), BL.length, false); g.add(C.walk, C.lawn);
  const pav = { super: 0xbfc4c8, tiendas: 0xd8cdb8, bomberos: 0xc4c2bb, mercado: 0xd6c8a4, obra: 0xc9b98f, cole: 0x9ccf70, banco: 0x9fcf6a, lago: 0x8cc063, parque: 0x7fbf5c, deporte: 0xb9beb2 };
  BL.forEach((b, i) => { setI(C.walk, i, b.x, 0, b.z, 1, 1, 1); setI(C.lawn, i, b.x, 0, b.z, 1, 1, 1); C.walk.setColorAt(i, _IC.set(0xd4d4cf)); C.lawn.setColorAt(i, _IC.set(b.kind ? pav[b.kind] : [0x8cc063, 0x93c468, 0x86bb5f][Math.floor(b.h * 3)])); });
  // ---- hogares: 16 parcelas por manzana (el borde de una cuadrícula de 5 × 5); dentro queda el patio. La casa n es de los seguidores 5n … 5n+4.
  const G16 = []; for (let a = -2; a <= 2; a++) for (let c = -2; c <= 2; c++) if (Math.max(Math.abs(a), Math.abs(c)) === 2) G16.push([a * 5.6, c * 5.6]);
  C.homes = []; const res = C.res = BL.filter(b => !b.kind); res.forEach(b => G16.forEach((o, k) => C.homes.push({ b, x: b.x + o[0], z: b.z + o[1], ox: Math.abs(o[0]) > Math.abs(o[1]) || (Math.abs(o[0]) === Math.abs(o[1]) && k % 2) ? Math.sign(o[0]) : 0, oz: 0 })));
  for (const h of C.homes) if (!h.ox) h.oz = Math.sign(h.z - h.b.z) || 1;
  C.NH = Math.ceil(NPOP / 5); if (C.homes.length < C.NH) console.error('ERROR faltan parcelas: ' + C.homes.length + ' < ' + C.NH);
  { const n = C.NH, rg = new THREE.ConeGeometry(3.55, 2.3, 4, 1); rg.rotateY(Math.PI / 4); rg.translate(0, 0.5 + 3.0 + 1.15, 0);
    const walls = inst(boxG(4.5, 3.0, 4.5, 0.5 + 1.5), stdM(0xffffff, 0.9), n), roofs = inst(rg, stdM(0xffffff, 0.85), n), doors = inst(boxG(0.9, 1.7, 0.12, 0.5 + 0.85), stdM(0x6b4a2e, 0.8), n, false); g.add(walls, roofs, doors);
    const wc = [0xf6ecd9, 0xf7dcae, 0xe9e3d3, 0xdfeaf2, 0xf2d6c8], rc = [0xc8553d, 0xb4472f, 0x7a5c8a, 0x3f7fb0, 0xd98b3a, 0x4f9a6a];
    for (let i = 0; i < n; i++) { const q = C.homes[i], s = 0.92 + h2(i * 1.3, 7.7) * 0.16; setI(walls, i, q.x, 0, q.z, s, s, s); setI(roofs, i, q.x, 0, q.z, s, s, s); setI(doors, i, q.x + q.ox * 2.26 * s, 0, q.z + q.oz * 2.26 * s, 1, 1, 1, q.ox ? Math.PI / 2 : 0);
      walls.setColorAt(i, _IC.set(wc[Math.floor(h2(i * 2.9, 1.1) * wc.length)])); roofs.setColorAt(i, _IC.set(rc[Math.floor(h2(q.b.i * 3 + q.b.j, Math.floor(i / 6)) * rc.length)])); }
    walls.instanceColor.needsUpdate = roofs.instanceColor.needsUpdate = true; }
  // ---- patios: un árbol y dos bancos por manzana de casas; y el bosque de alrededor
  { const pts = []; res.forEach(b => { pts.push([b.x + (b.h - 0.5) * 3, b.z + (h2(b.j, b.i) - 0.5) * 3, 0.75], [b.x - 6.6, b.z - 6.4, 0.5], [b.x + 6.4, b.z + 6.6, 0.55]); for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push([b.x + sx * 14.15, b.z + sz * 14.15, 0.42 + h2(b.i + sx, b.j + sz) * 0.14]); });
    for (let i = 0, n0 = pts.length; i < 2600 && pts.length < n0 + 1150; i++) { const u = (hash(i * 1.7) - 0.5) * 1000, v = (hash(i * 2.9) - 0.5) * 1600; if (Math.abs(u) < REG2.u + 16 && Math.abs(v) < REG2.v + 16) continue; pts.push([...fromUV(u, v), 0.8 + hash(i * 5.1) * 0.9]); }
    const fg = new THREE.ConeGeometry(2.6, 6.5, 7); fg.translate(0, 5, 0); const tf = inst(fg, stdM(0xffffff, 0.9), pts.length), kg = new THREE.CylinderGeometry(0.45, 0.6, 2.2, 6); kg.translate(0, 1.1, 0); const tk = inst(kg, stdM(0x7a5a3a, 0.9), pts.length, false); g.add(tf, tk);
    pts.forEach((p, i) => { setI(tf, i, p[0], 0.4, p[1], p[2], p[2], p[2], hash(i) * 6); setI(tk, i, p[0], 0.4, p[1], p[2], p[2], p[2]); tf.setColorAt(i, _IC.set([0x3f8a4b, 0x4f9a52, 0x357a45, 0x5aa457][i % 4])); }); tf.instanceColor.needsUpdate = true;
    C.benches = []; res.forEach(b => { C.benches.push([b.x - 4.5, b.z + 6.3, 0], [b.x + 6.3, b.z - 4.5, Math.PI / 2]); }); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + 0.3; C.benches.push([Math.cos(a) * 26.6, Math.sin(a) * 26.6, Math.atan2(Math.cos(a), Math.sin(a))]); }
    const bm = inst(boxG(2.2, 0.16, 0.6, 0.5), stdM(0x9a6a3c, 0.8), C.benches.length), bb = inst(boxG(2.2, 0.5, 0.1, 0.82), stdM(0x9a6a3c, 0.8), C.benches.length, false); g.add(bm, bb);
    C.benches.forEach((q, i) => { const y = Math.hypot(q[0], q[1]) < 29 ? 0.16 : 0.5; setI(bm, i, q[0], y - 0.05, q[1], 1, 1, 1, q[2]); setI(bb, i, q[0] + Math.sin(q[2]) * 0.3, y - 0.05, q[1] + Math.cos(q[2]) * 0.3, 1, 1, 1, q[2]); }); }
  // ---- el trono (gigante), la corona del rey y el cartel con el nombre del pueblo (delante de la plaza)
  C.throne = buildThrone(); g.add(C.throne); C.crown = buildCrown(); g.add(C.crown);
  { const s = new THREE.Group(), t = canvasTex(1024, 256, (q, w, h) => { q.fillStyle = '#1f7a4d'; q.fillRect(0, 0, w, h); q.strokeStyle = '#ffffff'; q.lineWidth = 12; q.strokeRect(16, 16, w - 32, h - 32); q.fillStyle = '#ffffff'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.font = '900 150px Inter, sans-serif'; q.fillText('KIRIA WORLD', w / 2, h / 2 + 8); });
    const p = new THREE.Mesh(new THREE.BoxGeometry(22, 5.5, 0.4), [0, 0, 0, 0, 1, 0].map(k => k ? new THREE.MeshBasicMaterial({ map: t, toneMapped: false }) : stdM(0x18603c, 0.8))); p.position.y = 8.2; p.castShadow = true; s.add(p); for (const x of [-8, 8]) addBox(s, 0.5, 5.6, 0.5, stdM(0x7a8088, 0.6), x, 2.8, -0.1);
    const [x, z] = fromUV(0, -37.5); s.position.set(x, 0, z); s.rotation.y = Math.PI / 4; g.add(s); C.sign = s; }
  return g;
}
// lo que se mueve del decorado: la corona (sobre la cabeza del rey; al final se levanta) y el cartel (aparece al decir el nombre)
function cityAt(t, o) {
  const C = CITY, c = o.crown, s = popK(c.k); C.crown.visible = c.k > 0.01; C.crown.scale.setScalar(Math.max(0.001, s) * c.s); C.crown.position.set(c.x, c.y, c.z); C.crown.rotation.set(0.12 * Math.sin(t * 2.1) * c.wob, t * 1.2, 0.12 * Math.cos(t * 1.7) * c.wob); C.crown.userData.halo.material.opacity = 0.5 * clamp(c.k);
  const k = popK(o.sign ?? 1); C.sign.visible = k > 0.01; C.sign.scale.set(k, k, k);
}
// ---------------------------------------------------------------- LOS HABITANTES: una figurita por seguidor (NPOP) y CADA UNA HACE ALGO. La persona i es el seguidor i por
// orden de llegada y vive en la casa floor(i / 5) (los primeros, más cerca del trono). Qué hace cada uno:
//   · un oficio o un sitio concreto (ROLES, de 22_sites.js): peluquera, cajera, guardias, bomberos, la profesora y su clase…
//   · pasea por la acera de su manzana (algunos, con su perro) · va en coche dando la vuelta a la manzana o espera aparcado
//   · charla en un corrillo del patio de su manzana o de la plaza · está sentado en un banco · está en la puerta de su casa
// Cuando la cámara se acerca, levantan la mano y saludan (los que trabajan siguen a lo suyo: tijeras, caja, manguera…).
// (Los nombres NO están aquí ni en el repositorio: los pone el montaje, en local, con las posiciones que da window.labelsAt.)
const PEOPLE = {}, JOBS = {};
const PPM0 = 70;                                      // píxeles por metro a partir de los que alguien «está cerca» (saluda y lleva su nombre)
function buildPeople() {
  const P = PEOPLE, N = P.N = NPOP, C = CITY, S0 = P.s = new Array(N).fill(null), used = new Set(Object.values(VIP)); used.add(KING);
  let seq = 0; const pick = () => { for (;;) { const i = (313 + seq++ * 977) % NNAMED; if (!used.has(i)) return i; } };
  for (const r of ROLES) { const i = r.king ? KING : r.vip ? VIP[r.vip] : pick(); used.add(i); S0[i] = r; r.i = i; JOBS[i] = r.job; if (r.k === 'P') { r.len = Math.hypot(r.x2 - r.x, r.z2 - r.z); r.ph = r.ph || 0; } }
  // ---- los demás: según su casa y un sorteo fijo
  const GC = [[-4.3, -4.3], [4.3, -4.3], [-4.3, 4.3], [4.3, 4.3], [0.4, -1.2]], seat = {}, mus = fromUV(-17, -15.5); let pb = 0;
  const benchOf = {}; C.benches.forEach((q, k) => { const key = Math.hypot(q[0], q[1]) < 29 ? 'plaza' : Math.round(q[0] / PITCH) + ',' + Math.round(q[1] / PITCH); (benchOf[key] = benchOf[key] || []).push(q); });
  const sit = (key) => { const L = benchOf[key] || [], n = seat[key] || 0; if (n >= L.length * 2) return null; seat[key] = n + 1; const q = L[n >> 1], sd = (n & 1) ? 0.55 : -0.55; return { k: 'T', x: q[0] + Math.cos(q[2]) * sd, z: q[1] - Math.sin(q[2]) * sd, y: (key === 'plaza' ? 0.16 : 0.5) + 0.2, yaw: q[2] + Math.PI, sc: 1 }; };
  for (let i = 0; i < N; i++) { if (S0[i]) continue; const h = C.homes[Math.min(C.NH - 1, Math.floor(i / 5))], b = h.b, u = hash(i * 0.731 + 0.17), v = hash(i * 1.913 + 0.4), w = hash(i * 3.377 + 0.9), key = b.i + ',' + b.j; let s;
    if (u < 0.39) s = { k: 'L', b, r: 15.75 + (v > 0.5 ? 0.75 : 0), q: 1.0, s0: w * 130, spd: 1.0 + v * 0.5, dir: w > 0.5 ? 1 : -1, y: 0.3 };
    else if (u < 0.44) s = { k: 'L', b, r: 16.1, q: 1.0, s0: w * 130, spd: 0.8 + v * 0.3, dir: v > 0.5 ? 1 : -1, y: 0.3, dog: 1 };
    else if (u < 0.505) { if (v < 0.55) s = { k: 'L', b, r: 19.9, q: 2.6, s0: w * 160, spd: 4.5 + v * 5, dir: 1, y: 0.06, car: 1 }; else { const p = loopAt(b.x, b.z, 17.95, 1.5, w * 140); s = { k: 'V', x: p[0], z: p[1], yaw: p[2], vy: 2.6, car: 1 }; } }
    else if (u < 0.71) { s = (v < 0.2 && sit(key)) || (() => { const g = GC[Math.floor(w * 5)], a = v * Math.PI * 2, rr2 = 1.15 + (i % 3) * 0.12; return { k: 'S', x: b.x + g[0] + Math.cos(a) * rr2, z: b.z + g[1] + Math.sin(a) * rr2, y: 0.5, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), free: 1 }; })(); }
    else if (u < 0.76) { s = (v < 0.12 && sit('plaza')) || (() => { for (let k = 0; k < 6; k++) { const g = Math.floor(hash(i * 5.1 + k) * 66), ga = (g % 22) / 22 * Math.PI * 2 + (Math.floor(g / 22) % 2) * 0.14, gr = [21.0, 23.8, 26.5][Math.floor(g / 22)], gx = Math.cos(ga) * gr, gz = Math.sin(ga) * gr; if (Math.hypot(gx - mus[0], gz - mus[1]) < 7) continue; const a = v * Math.PI * 2 + k;
          return { k: 'S', x: gx + Math.cos(a) * 1.2, z: gz + Math.sin(a) * 1.2, y: 0.17, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), free: 1 }; } return { k: 'S', x: 21.5 * Math.cos(v * 6.28), z: 21.5 * Math.sin(v * 6.28), y: 0.17, yaw: 0, free: 1 }; })(); }
    else { const lat = (v - 0.5) * 3.4; s = { k: 'S', x: h.x + h.ox * 3.05 + (h.ox ? 0 : lat), z: h.z + h.oz * 3.05 + (h.oz ? 0 : lat), y: 0.5, yaw: Math.atan2(h.ox, h.oz), free: 1 }; }
    s.sc = s.sc || 0.9 + hash(i * 2.11) * 0.22; s.i = i; S0[i] = s; }
  for (const s of S0) { s.ph = s.ph ?? hash(s.i * 1.37) * 6.283; if (s.k === 'L') s.P = loopLen(s.r, s.q); }
  // ---- las figuritas (cuerpo, cabeza y pelo o casco)
  const bg = new THREE.CylinderGeometry(0.46, 0.64, 1.55, 7); bg.translate(0, 0.78, 0); const hg2 = new THREE.IcosahedronGeometry(0.56, 1); hg2.translate(0, 2.06, 0);
  const cg = new THREE.SphereGeometry(0.61, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5); cg.translate(0, 2.1, -0.06);
  const shirt = [0xe2483d, 0x2f6fd0, 0xf0a020, 0x2f9e5a, 0x8a5cd0, 0xf4f1ea, 0xff6fb5, 0x22c0b0, 0x34466e, 0xe0d040, 0xff7a2a, 0x7a5c3a], skin = P.skinC = [0xf0c8a0, 0xe6b48c, 0xd9a27c, 0xc68a62, 0x9a6a48, 0x6e4a32], hair = [0x1c1410, 0x3a2618, 0x5a3a22, 0x8a5a2a, 0xd9b45a, 0x2c2c30, 0xb0492a];
  P.m = [inst(bg, stdM(0xffffff, 0.75), N), inst(hg2, stdM(0xffffff, 0.7), N), inst(cg, stdM(0xffffff, 0.85), N, false)]; P.m[1].instanceMatrix = P.m[0].instanceMatrix; P.m[2].instanceMatrix = P.m[0].instanceMatrix;
  P.cx = new Float32Array(N); P.cy = new Float32Array(N); P.cz = new Float32Array(N); P.yw = new Float32Array(N); P.skin = new Uint8Array(N); P.mod = [];
  for (let i = 0; i < N; i++) { const s = S0[i]; P.skin[i] = Math.floor(hash(i * 7.1) * skin.length); P.m[0].setColorAt(i, _IC.set(s.cape ? 0xf4f1ea : s.shirt ?? shirt[Math.floor(hash(i * 5.7) * shirt.length)])); P.m[1].setColorAt(i, _IC.set(skin[P.skin[i]])); P.m[2].setColorAt(i, _IC.set(s.hat ?? hair[Math.floor(hash(i * 9.3) * hair.length)])); }
  const grp = new THREE.Group(); for (const m of P.m) { m.instanceColor.needsUpdate = true; grp.add(m); }
  // ---- el brazo (saludar, tijeras, manguera…): solo para los que están cerca de la cámara
  { const ag = mergeGeometries([new THREE.CylinderGeometry(0.13, 0.15, 1.05, 6).translate(0, 0.52, 0), new THREE.SphereGeometry(0.24, 8, 6).translate(0, 1.12, 0)]); P.NA = 420; P.arms = inst(ag, stdM(0xffffff, 0.7), P.NA); P.arms.count = P.NA;
    for (let i = 0; i < P.NA; i++) { setI(P.arms, i, 0, -50, 0, 0, 0, 0); P.arms.setColorAt(i, _IC.set(skin[0])); } P.arms.instanceColor.needsUpdate = true; grp.add(P.arms); }
  // ---- perros (van delante de su dueño)
  { const L = P.dogs = S0.filter(s => s.dog), dg = mergeGeometries([new THREE.BoxGeometry(0.34, 0.4, 0.9).translate(0, 0.5, 0), new THREE.BoxGeometry(0.32, 0.32, 0.36).translate(0, 0.78, 0.52), new THREE.BoxGeometry(0.1, 0.34, 0.1).translate(0, 0.86, -0.46)]);
    P.dogM = inst(dg, stdM(0xffffff, 0.85), L.length); const dc = [0x8a5a2a, 0xf4f1ea, 0x2c2c30, 0xd9b45a, 0xb98a5a, 0x6b4a2e]; L.forEach((s, k) => P.dogM.setColorAt(k, _IC.set(dc[Math.floor(hash(s.i * 4.3) * dc.length)]))); if (L.length) P.dogM.instanceColor.needsUpdate = true; grp.add(P.dogM); }
  // ---- coches (los que dan la vuelta a su manzana y los aparcados con alguien esperando dentro)
  { const L = P.cars = S0.filter(s => s.car), wg = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) wg.push(new THREE.CylinderGeometry(0.4, 0.4, 0.28, 10).rotateZ(Math.PI / 2).translate(sx * 0.92, 0.4, sz * 1.35));
    P.carB = inst(boxG(1.85, 0.85, 4.2, 0.87), stdM(0xffffff, 0.45), L.length); P.carC = inst(new THREE.BoxGeometry(1.66, 0.7, 2.1).translate(0, 1.64, -0.2), stdM(0x263442, 0.25, { metalness: 0.3 }), L.length, false); P.carW = inst(mergeGeometries(wg), stdM(0x1c2026, 0.6), L.length, false);
    P.carC.instanceMatrix = P.carB.instanceMatrix; P.carW.instanceMatrix = P.carB.instanceMatrix; const cc = [0xd9342b, 0x2f6fd0, 0xf4f1ea, 0x26282e, 0xc9ced6, 0x2f9e5a, 0xf0a020, 0x8a5cd0, 0x9fd0f2];
    L.forEach((s, k) => { P.carB.setColorAt(k, _IC.set(cc[Math.floor(hash(s.i * 6.1) * cc.length)])); if (s.k === 'V') setYS(P.carB.instanceMatrix.array, k, s.x, 0.04, s.z, 1, s.yaw); }); if (L.length) P.carB.instanceColor.needsUpdate = true; grp.add(P.carB, P.carC, P.carW); }
  // ---- carros de la compra, sacas del banco, cañas de pescar y patos del lago
  { const L = PROPS.cart, cg2 = mergeGeometries([new THREE.BoxGeometry(0.62, 0.5, 0.95).translate(0, 0.78, 0), new THREE.BoxGeometry(0.05, 0.5, 0.05).translate(0.28, 0.3, 0.42), new THREE.BoxGeometry(0.05, 0.5, 0.05).translate(-0.28, 0.3, 0.42), new THREE.BoxGeometry(0.05, 0.5, 0.05).translate(0.28, 0.3, -0.42), new THREE.BoxGeometry(0.05, 0.5, 0.05).translate(-0.28, 0.3, -0.42), new THREE.BoxGeometry(0.62, 0.06, 0.06).translate(0, 1.18, -0.56)]);
    P.cartM = inst(cg2, stdM(0xc9ced6, 0.4, { metalness: 0.6 }), L.length); P.goodM = inst(new THREE.BoxGeometry(0.52, 0.5, 0.82).translate(0, 1.2, 0), stdM(0xffffff, 0.7), L.length); const gc = [0xe2483d, 0xf0a020, 0x2f9e5a, 0xf2d03a, 0x2f6fd0];
    L.forEach((c, k) => { P.goodM.setColorAt(k, _IC.set(gc[k % 5])); if (!c.role) { setI(P.cartM, k, c.x, 0.6, c.z, 1, 1, 1, c.yaw); setI(P.goodM, k, c.x, 0.6, c.z, c.full ? 1 : 0, c.full, c.full ? 1 : 0, c.yaw); } }); if (L.length) P.goodM.instanceColor.needsUpdate = true; grp.add(P.cartM, P.goodM);
    P.sackM = inst(new THREE.SphereGeometry(0.36, 10, 8), stdM(0xd9c79a, 0.9), PROPS.sack.length + 5); for (let k = 0; k < 5; k++) setI(P.sackM, PROPS.sack.length + k, PROPS.van.position.x + 3.7 + (k % 2) * 0.35, 0.75 + (k > 2 ? 0.5 : 0), PROPS.van.position.z - 0.5 + (k % 3) * 0.5, 1, 0.85, 1); grp.add(P.sackM);
    for (const r of PROPS.rod) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 3.4, 5).rotateX(Math.PI / 2).translate(0, 0, 1.7), stdM(0x3a2a1a, 0.6)); m.rotation.order = 'YXZ'; m.rotation.set(-0.55, r.yaw, 0); m.position.set(r.x + Math.sin(r.yaw) * 0.6, 1.9, r.z + Math.cos(r.yaw) * 0.6); m.castShadow = true; grp.add(m); }
    P.duckM = inst(mergeGeometries([new THREE.SphereGeometry(0.34, 8, 6).scale(0.8, 0.6, 1.2).translate(0, 0.16, 0), new THREE.SphereGeometry(0.17, 8, 6).translate(0, 0.42, 0.34)]), stdM(0xf7f3e6, 0.7), 8); grp.add(P.duckM); }
  P.ball = sph(0.3, stdM(0xffffff, 0.5), 10, 8); P.ball.castShadow = true; grp.add(P.ball); P.pball = PROPS.padel.map(() => { const m = sph(0.14, stdM(0xd8f23a, 0.5), 8, 6); grp.add(m); return m; });
  P.kingS = S0[KING];
  return grp;
}
// dónde está y hacia dónde mira la persona i en el instante t → rellena P.cx, P.cy, P.cz, P.yw; devuelve su escala (0 = no se ve: va en un vehículo)
function personAt(s, t, cheer) { const P = PEOPLE, i = s.i; let x = s.x, z = s.z, y = s.y, yaw = s.yaw, sc = s.sc;
  if (s.k === 'L') { const p = loopAt(s.b.x, s.b.z, s.r, s.q, s.s0 + s.spd * t, s.dir); x = p[0]; z = p[1]; yaw = p[2]; if (s.car) { sc = 0; y = 2.6; } else y += 0.1 * Math.abs(Math.sin(t * (2.6 + s.spd * 1.6) + s.ph)); }
  else if (s.k === 'P') { const u0 = (t * s.spd / s.len + s.ph) % 2, u = u0 < 1 ? u0 : 2 - u0, e = clamp((u - 0.06) / 0.88); x = lerp(s.x, s.x2, e); z = lerp(s.z, s.z2, e); s.out = u0 < 1; yaw = Math.atan2((s.x2 - s.x) * (s.out ? 1 : -1), (s.z2 - s.z) * (s.out ? 1 : -1)); if (s.faceX) yaw = Math.atan2(s.faceX, 0); y += 0.08 * Math.abs(Math.sin(t * 5 + s.ph)); }
  else if (s.k === 'C') { const a = s.a0 + s.w * t; x = s.x + Math.cos(a) * s.r; z = s.z + Math.sin(a) * s.r; yaw = s.face === 'in' ? Math.atan2(-Math.cos(a), -Math.sin(a)) : Math.atan2(-Math.sin(a), Math.cos(a)); y += 0.1 * Math.abs(Math.sin(t * 6 + s.ph)); }
  else if (s.k === 'T') { y -= 0.55; yaw += 0.12 * Math.sin(t * 0.8 + s.ph); }
  else if (s.k === 'V') { sc = 0; y = s.vy; }
  else { y += 0.05 * (1 + Math.sin(t * 2.2 + s.ph)) + cheer * 1.1 * Math.abs(Math.sin(t * 6.6 + s.ph)); yaw += 0.18 * Math.sin(t * 0.9 + s.ph * 2); }
  P.cx[i] = x; P.cy[i] = y; P.cz[i] = z; P.yw[i] = yaw; return sc; }
// quién está cerca de la cámara (y en pantalla): [i, x de pantalla, y de pantalla (encima de la cabeza), píxeles por metro]. Con la cámara ya colocada.
function nearPeople() { const e = vpOf().elements, P = PEOPLE, out = [], f = (H / 2) / Math.tan(cam.fov * Math.PI / 360);
  for (let i = 0; i < P.N; i++) { const s = P.s[i], x = P.cx[i], z = P.cz[i], y = P.cy[i] + (s.k === 'V' || s.car ? 0 : 2.95 * s.sc), cw = e[3] * x + e[7] * y + e[11] * z + e[15]; if (cw <= 1) continue; const ppm = f / cw; if (ppm < PPM0) continue;
    const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / cw + 1) / 2 * W, sy = (1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / cw) / 2 * H; if (sx < -160 || sx > W + 160 || sy < -60 || sy > H + 260) continue;
    out.push([i, sx, sy, ppm]); }
  return out; }
function peopleAt(t, o = {}) {
  const P = PEOPLE, a = P.m[0].instanceMatrix.array, cheer = clamp(o.cheer ?? 0), S0 = P.s;
  for (let i = 0; i < P.N; i++) { const s = S0[i], sc = personAt(s, t, cheer); setYS(a, i, P.cx[i], P.cy[i], P.cz[i], sc, P.yw[i]); }
  // los de cerca: saludan (o siguen con su oficio) y los que están parados se giran hacia la cámara
  const near = P.near = nearPeople(); let n = 0;
  for (const [i, , , ppm] of near) { const s = S0[i]; if (s.k === 'V' || s.car) continue; const k = sm5(clamp((ppm - PPM0) / 14)), x = P.cx[i], z = P.cz[i], y = P.cy[i], sc = s.sc; let yaw = P.yw[i];
    if (s.free) { let dy = Math.atan2(cam.position.x - x, cam.position.z - z) - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += dy * k; setYS(a, i, x, y, z, sc, yaw); }
    if (n < P.NA && k > 0.01) { const side = hash(i * 4.9) > 0.5 ? 1 : -1, rx = Math.cos(yaw) * side, rz = -Math.sin(yaw) * side, fx = Math.sin(yaw), fz = Math.cos(yaw), up = popK(k), kind = s.arm || 'wave', ph = t * 9.5 + s.ph * 3;
      if (kind === 'wave') { const ang = 0.42 + 0.4 * Math.sin(ph); _IE2.set(rx * Math.sin(ang), Math.cos(ang), rz * Math.sin(ang)); }
      else if (kind === 'cut') { const w = 0.22 * Math.sin(ph * 1.6); _IE2.set(fx * 0.8 + rx * w, 0.55 + 0.12 * Math.cos(ph * 1.6), fz * 0.8 + rz * w); }
      else _IE2.set(fx * 0.92 + rx * 0.1, 0.3 + 0.04 * Math.sin(ph * 0.4), fz * 0.92 + rz * 0.1);
      _IP.set(x + rx * 0.5 * sc, y + 1.2 * sc, z + rz * 0.5 * sc); _IQ.setFromUnitVectors(_IS.set(0, 1, 0), _IE2.normalize()); _IS.set(sc * up, sc * up, sc * up); _IM.compose(_IP, _IQ, _IS); P.arms.setMatrixAt(n, _IM); P.arms.setColorAt(n, _IC.set(P.skinC[P.skin[i]])); n++; } }
  for (let j = n; j < (P.armN || 0); j++) { _IP.set(0, -50, 0); _IS.set(1e-4, 1e-4, 1e-4); _IM.compose(_IP, _IQ.identity(), _IS); P.arms.setMatrixAt(j, _IM); } P.armN = n;
  P.m[0].instanceMatrix.needsUpdate = P.arms.instanceMatrix.needsUpdate = P.arms.instanceColor.needsUpdate = true;
  // perros, coches, carros, sacas y patos
  P.dogs.forEach((s, k) => { const p = loopAt(s.b.x, s.b.z, s.r + 0.45, s.q, s.s0 + s.spd * t + 1.5, s.dir); setYS(P.dogM.instanceMatrix.array, k, p[0], 0.3 + 0.06 * Math.abs(Math.sin(t * 9 + s.ph)), p[1], 1, p[2]); }); P.dogM.instanceMatrix.needsUpdate = true;
  P.cars.forEach((s, k) => { if (s.k === 'L') setYS(P.carB.instanceMatrix.array, k, P.cx[s.i], 0.04, P.cz[s.i], 1, P.yw[s.i]); }); P.carB.instanceMatrix.needsUpdate = true;
  PROPS.cart.forEach((c, k) => { if (!c.role) return; const i = c.role.i, yw = P.yw[i], x = P.cx[i] + Math.sin(yw) * 1.0, z = P.cz[i] + Math.cos(yw) * 1.0; setI(P.cartM, k, x, 0.6, z, 1, 1, 1, yw); setI(P.goodM, k, x, 0.6, z, 1, c.full, 1, yw); }); P.cartM.instanceMatrix.needsUpdate = P.goodM.instanceMatrix.needsUpdate = true;
  PROPS.sack.forEach((c, k) => { const i = c.role.i, yw = P.yw[i], on = c.role.out ? 1 : 0; setI(P.sackM, k, P.cx[i] + Math.sin(yw) * 0.6, P.cy[i] + 1.25, P.cz[i] + Math.cos(yw) * 0.6, on, on * 0.85, on); }); P.sackM.instanceMatrix.needsUpdate = true;
  { const c = PROPS.ball.c; P.ball.position.set(c[0] + 10.5 * Math.sin(t * 0.83 + 0.4), 0.85 + 0.9 * Math.abs(Math.sin(t * 3.1)), c[1] + 5.2 * Math.sin(t * 1.37 + 1)); PROPS.padel.forEach((c2, k) => P.pball[k].position.set(c2[0] + 4.3 * Math.sin(t * 2.6 + k * 1.7), 1.3 + 1.2 * Math.abs(Math.cos(t * 2.6 + k * 1.7)), c2[1] + 1.6 * Math.sin(t * 1.9 + k))); PROPS.jet.scale.setScalar(1 + 0.15 * Math.sin(t * 7)); }
  for (let k = 0; k < 8; k++) { const a2 = k * 0.9 + t * (0.16 + (k % 3) * 0.05) * (k % 2 ? 1 : -1), r = 2.5 + (k % 4) * 1.9; setYS(P.duckM.instanceMatrix.array, k, PROPS.pond[0] + Math.cos(a2) * r, 0.58, PROPS.pond[1] + Math.sin(a2) * r, 1, Math.atan2(-Math.sin(a2), Math.cos(a2)) + (k % 2 ? 0 : Math.PI)); } P.duckM.instanceMatrix.needsUpdate = true;
}
// para el montaje (en local): { p: personas con nombre [i, x, y, px/m × 10], h: casas con sus 5 nombres [n, x, y, px/m × 10] }
window.labelsAt = function (t) {
  frame(t); const r = v => Math.round(v), p = PEOPLE.near.map(q => [q[0], r(q[1]), r(q[2]), r(q[3] * 10)]), h = [], e = vpOf().elements, f = (H / 2) / Math.tan(cam.fov * Math.PI / 360);
  for (let n = 0; n < CITY.NH; n++) { const q = CITY.homes[n], x = q.x, y = 6.4, z = q.z, cw = e[3] * x + e[7] * y + e[11] * z + e[15]; if (cw <= 1) continue; const ppm = f / cw; if (ppm < 80) continue;
    const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / cw + 1) / 2 * W, sy = (1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / cw) / 2 * H; if (sx < -200 || sx > W + 200 || sy < -40 || sy > H + 300) continue; h.push([n, r(sx), r(sy), r(ppm * 10)]); }
  return { p, h };
};
window.JOBS = JOBS; window.VIPS = Object.values(VIP); window.KINGI = KING;
// ---------------------------------------------------------------- LOS SITIOS DONDE PASAN COSAS y sus oficios. Cada sitio se construye (abierto por arriba, para verlo
// por dentro desde la cámara) y deja en ROLES los puestos que ocupan seguidores: { x, z, yaw, job, k, … }.
//   k: 'S' quieto · 'T' sentado · 'P' va y viene entre (x, z) y (x2, z2) · 'C' da vueltas alrededor de (x, z) con radio r · 'V' dentro de un vehículo
//   arm: 'cut' (tijeras / pasar productos), 'wave' (saluda, dirige, limpia), 'hold' (brazo al frente: caña, manguera, bandeja)
const ROLES = [], SITES = [], PROPS = { cart: [], sack: [], rod: [], veh: [] };
const R = o => { ROLES.push({ k: 'S', yaw: 0, sc: 1, y: 0.5, ...o }); return ROLES[ROLES.length - 1]; };
const FY = Math.PI / 2;
function site(name, label, x, z, h = 7) { SITES.push({ name, label, p: new THREE.Vector3(x, h, z) }); }
// local abierto por arriba: suelo y paredes altas solo al fondo (−x y −z), que es lo que no tapa la vista
function shopShell(g, x, z, w, d, floor, wall, hgt = 3) { addBox(g, w, 0.12, d, stdM(floor, 0.8), x, 0.56, z).castShadow = false; const m = stdM(wall, 0.85);
  addBox(g, w, hgt, 0.3, m, x, 0.5 + hgt / 2, z - d / 2); addBox(g, 0.3, hgt, d, m, x - w / 2, 0.5 + hgt / 2, z); addBox(g, w, 0.5, 0.25, m, x, 0.75, z + d / 2); addBox(g, 0.25, 0.5, d, m, x + w / 2, 0.75, z); }
function vehicle(g, x, z, yaw, o = {}) {           // coche / taxi / furgón / camión: caja + cabina + ruedas; el frente es +z local
  const v = new THREE.Group(), L = o.L || 4.3, Wd = o.W || 1.9, hb = o.hb || 1.0, body = stdM(o.color ?? 0xd9342b, 0.5), dark = stdM(0x1c2026, 0.5);
  addBox(v, Wd, hb, L, body, 0, 0.45 + hb / 2, 0); addBox(v, Wd * 0.9, o.hc ?? 0.75, L * (o.cab ?? 0.5), o.box ? body : stdM(0x263442, 0.25, { metalness: 0.3 }), 0, 0.45 + hb + (o.hc ?? 0.75) / 2, o.cz ?? -L * 0.05);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = cyl(0.42, 0.42, 0.3, dark, 12); w.rotation.z = Math.PI / 2; w.position.set(sx * Wd / 2, 0.42, sz * L * 0.32); v.add(w); }
  if (o.top) addBox(v, o.top[0], o.top[1], o.top[2], stdM(o.top[3], 0.5), 0, 0.45 + hb + (o.hc ?? 0.75) + o.top[1] / 2, o.top[4] ?? 0);
  v.position.set(x, 0.04, z); v.rotation.y = yaw; g.add(v); return v; }

function buildSites() {
  const g = new THREE.Group(), wood = stdM(0xb98a5a, 0.8), white = stdM(0xf4f1ea, 0.8), steel = stdM(0xc9ced6, 0.4, { metalness: 0.6 }), dark = stdM(0x2a2d34, 0.6);
  // ================= EL REY, en el trono (figurita normal en un trono gigante)
  R({ x: 0.5, z: 0.5, y: CITY.throne.userData.seatY + 0.35, yaw: Math.PI / 4, job: 'rey', k: 'T', sc: 1.25, shirt: 0x7a2fb0, king: 1 }); site('trono', null, 0, 0, 30);
  // ================= MANZANA DE TIENDAS (0, 1): peluquería, panadería y bar con terraza
  { const bx = 0, bz = 42;
    // peluquería
    shopShell(g, bx - 8.5, bz - 9.5, 11, 9, 0xe9d9c6, 0xf2b8c6); site('peluqueria', 'PELUQUERÍA', bx - 8.5, bz - 9.5);
    addBox(g, 7, 1.6, 0.1, stdM(0xbfe3f2, 0.15, { metalness: 0.5 }), bx - 9, 2.3, bz - 13.8);
    for (const [i, cx] of [[0, -11.2], [1, -7.2]]) { addBox(g, 0.95, 0.55, 0.95, stdM(0xc8322c, 0.6), bx + cx, 1.0, bz - 11.6); addBox(g, 0.95, 0.9, 0.16, stdM(0xc8322c, 0.6), bx + cx, 1.6, bz - 11.1); addBox(g, 0.2, 0.5, 0.2, steel, bx + cx, 0.72, bz - 11.6);
      R({ x: bx + cx, z: bz - 11.65, y: 0.95, yaw: Math.PI, job: 'cliente', k: 'T', vip: i ? null : 'cliente', cape: 1 }); R({ x: bx + cx + 1.05, z: bz - 11.2, yaw: -1.9, job: i ? 'peluquero' : 'peluquera', arm: 'cut', shirt: 0x26282e, vip: i ? null : 'peluquera' }); }
    addBox(g, 0.6, 0.5, 3.2, wood, bx - 13.4, 0.85, bz - 7.6); for (const dz of [-8.6, -7.6, -6.6]) R({ x: bx - 13.3, z: bz + dz, y: 0.7, yaw: FY, job: 'esperando turno', k: 'T' });
    R({ x: bx - 9.5, z: bz - 7.2, x2: bx - 5, z2: bz - 7.4, spd: 0.7, k: 'P', job: 'barre el suelo', arm: 'hold' });
    { const p = cyl(0.22, 0.22, 2.4, stdM(0xffffff, 0.4, { map: canvasTex(32, 64, (q, w, h) => { for (let i = 0; i < 8; i++) { q.fillStyle = ['#d9342b', '#ffffff', '#2f6fd0', '#ffffff'][i % 4]; q.fillRect(0, i * 8, w, 8); } }) }), 12); p.position.set(bx - 2.8, 1.75, bz - 5.2); g.add(p); }
    // panadería
    shopShell(g, bx + 8.5, bz - 9.5, 11, 9, 0xf2e3c2, 0xe8b25a); site('panaderia', 'PANADERÍA', bx + 8.5, bz - 9.5);
    addBox(g, 8, 1.1, 1.1, wood, bx + 8.5, 1.1, bz - 9.6); for (let i = 0; i < 9; i++) addBox(g, 0.6, 0.22, 0.28, stdM(0xd9903a, 0.7), bx + 5.2 + i * 0.82, 1.78, bz - 9.6 + (i % 2 ? 0.2 : -0.2), 0.4);
    addBox(g, 9, 2.2, 0.6, wood, bx + 8.5, 1.65, bz - 13.5); for (let i = 0; i < 12; i++) addBox(g, 0.55, 0.3, 0.3, stdM([0xd9903a, 0xc87a2a, 0xe6b25a][i % 3], 0.7), bx + 4.6 + (i % 6) * 1.5, 1.4 + Math.floor(i / 6) * 0.9, bz - 13.1); addBox(g, 1.8, 2.0, 1.6, dark, bx + 13, 1.5, bz - 12.6);
    R({ x: bx + 6.8, z: bz - 11.2, job: 'panadero', shirt: 0xf4f1ea, hat: 0xffffff, arm: 'hold' }); R({ x: bx + 10.6, z: bz - 11.2, job: 'panadera', shirt: 0xf4f1ea, hat: 0xffffff, arm: 'cut' });
    for (let i = 0; i < 7; i++) R({ x: bx + 8.3 + (i % 2) * 0.25, z: bz - 8.0 + i * 1.15, yaw: Math.PI, job: i ? 'en la cola del pan' : 'compra el pan' });
    // bar con terraza
    addBox(g, 6, 3.2, 5, stdM(0xc8704a, 0.8), bx - 11, 2.1, bz + 5.5); addBox(g, 6.6, 0.3, 5.6, stdM(0x8a3f2a, 0.8), bx - 11, 3.85, bz + 5.5); addBox(g, 3, 1.1, 0.8, wood, bx - 7.4, 1.05, bz + 5.5); site('bar', 'BAR', bx + 1, bz + 8);
    R({ x: bx - 8.6, z: bz + 5.5, yaw: FY, job: 'camarera', shirt: 0x26282e, arm: 'cut' });
    const um = [0xe2483d, 0x2f9e5a, 0x2f6fd0, 0xf0a020, 0xe2483d, 0x2f6fd0, 0x2f9e5a]; [[-3, 4.5], [2, 4.5], [7, 4.5], [12, 5.5], [-3, 10.5], [2, 10.5], [7, 10.5]].forEach(([tx, tz], i) => { const t = cyl(0.75, 0.75, 0.08, white, 18); t.position.set(bx + tx, 1.3, bz + tz); g.add(t); const p = cyl(0.06, 0.06, 2.6, steel, 6); p.position.set(bx + tx, 1.8, bz + tz); g.add(p);
      const u = new THREE.Mesh(new THREE.ConeGeometry(2.0, 0.8, 8), stdM(um[i], 0.8)); u.position.set(bx + tx, 3.4, bz + tz); u.castShadow = true; g.add(u);
      const n = 2 + (i % 2); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + i; R({ x: bx + tx + Math.cos(a) * 1.35, z: bz + tz + Math.sin(a) * 1.35, y: 0.42, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), job: 'tomando algo', k: 'T' }); } });
    R({ x: bx - 6, z: bz + 7.5, x2: bx + 10, z2: bz + 7.6, spd: 1.3, k: 'P', job: 'camarero', shirt: 0x26282e, arm: 'hold' }); }
  // ================= SUPERMERCADO (0, −1): estanterías, dos cajas, carros y la cola
  { const bx = 0, bz = -42; shopShell(g, bx, bz, 27, 24, 0xe6e9ec, 0x4fa36a, 3.6); site('super', 'SUPERMERCADO', bx, bz + 2, 8);
    const pc = [0xe2483d, 0xf0a020, 0x2f6fd0, 0x2f9e5a, 0xf2d03a, 0x8a5cd0]; for (const [k, sx] of [[0, -11.6], [1, -7.2], [2, 7.2], [3, 11.6]]) { addBox(g, 1.3, 1.9, 13, white, bx + sx, 1.55, bz - 4.5); for (let i = 0; i < 9; i++) addBox(g, 1.34, 0.42, 1.25, stdM(pc[(i + k) % 6], 0.6), bx + sx, 1.0 + (i % 3) * 0.6, bz - 10 + Math.floor(i / 3) * 4.3 + (i % 3) * 0.7); }
    addBox(g, 9, 1.9, 1.3, white, bx, 1.55, bz - 11.2); for (let i = 0; i < 6; i++) addBox(g, 1.3, 0.45, 1.34, stdM(pc[i], 0.6), bx - 3.7 + i * 1.5, 1.2 + (i % 2) * 0.6, bz - 11.2);
    for (const [k, cx] of [[0, -3.6], [1, 2.4]]) { addBox(g, 1.0, 0.95, 3.4, stdM(0x3a4048, 0.5), bx + cx, 1.05, bz + 8); addBox(g, 0.8, 0.06, 2.4, stdM(0x16181c, 0.4), bx + cx, 1.56, bz + 7.7); addBox(g, 0.5, 0.5, 0.5, stdM(0xf4f1ea, 0.5), bx + cx - 0.2, 1.8, bz + 9.2);
      R({ x: bx + cx - 1.05, z: bz + 8.2, yaw: FY, job: 'cajera', shirt: 0x2f9e5a, arm: 'cut', vip: k ? null : 'cajera' });
      const n = k ? 7 : 12; for (let i = 0; i < n; i++) { const z = bz + 7.6 - i * 1.5; R({ x: bx + cx + 1.15 + (hash(i * 3.1 + k) - 0.5) * 0.25, z, yaw: 0, job: i ? 'en la cola de la caja' : 'pagando' }); if (i % 2 === 0 && i) PROPS.cart.push({ x: bx + cx + 1.15, z: z + 0.85, yaw: 0, full: 0.5 + hash(i) * 0.5 }); } }
    { const r = R({ x: bx - 9.4, z: bz - 9.5, x2: bx - 9.4, z2: bz + 1.5, spd: 0.8, k: 'P', job: 'llenando el carro', vip: 'carro' }); PROPS.cart.push({ role: r, full: 1.35 }); }
    { const r = R({ x: bx + 9.4, z: bz + 1, x2: bx + 9.4, z2: bz - 9, spd: 0.7, k: 'P', job: 'de compras' }); PROPS.cart.push({ role: r, full: 0.6 }); }
    R({ x: bx + 5.9, z: bz - 6, yaw: FY, job: 'reponedor', shirt: 0x2f9e5a, arm: 'cut' }); R({ x: bx - 1.5, z: bz - 9.6, yaw: Math.PI, job: 'mirando la fruta' }); R({ x: bx + 2.6, z: bz - 9.6, yaw: Math.PI, job: 'eligiendo yogures' });
    for (let i = 0; i < 6; i++) PROPS.cart.push({ x: bx - 12.3 + (i % 2) * 0.75, z: bz + 6.5 + Math.floor(i / 2) * 1.0, yaw: 0, full: 0 }); }
  // ================= BANCO (−1, 0): el edificio, el furgón blindado y los guardias que sacan el dinero
  { const bx = -42, bz = 0, b = new THREE.Group(), stone = stdM(0xece6d6, 0.8), dk = stdM(0xcfc7b2, 0.85), gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.3, metalness: 0.9 });
    addBox(b, 24, 1.4, 19, dk, 0, 1.2, 0); addBox(b, 20, 9, 12, stone, 0, 6.4, -2.5); for (let i = 0; i < 6; i++) { const c = cyl(0.95, 0.95, 9, stone, 14); c.position.set(-9 + i * 3.6, 6.4, 6); b.add(c); } addBox(b, 22, 1.2, 17, dk, 0, 11.5, 0); addBox(b, 2.6, 4.2, 0.3, stdM(0x3a2a1a, 0.6), 0, 4.0, 3.6);
    { const s = new THREE.Shape(); s.moveTo(-11.5, 0); s.lineTo(11.5, 0); s.lineTo(0, 5); s.lineTo(-11.5, 0); const p = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 16, bevelEnabled: false }), stone); p.position.set(0, 12.1, -8); p.castShadow = p.receiveShadow = true; b.add(p); const c = cyl(1.7, 1.7, 0.5, gold, 24); c.rotation.x = Math.PI / 2; c.position.set(0, 13.9, 8.2); b.add(c); }
    b.position.set(bx - 3, 0.5, bz - 3); b.rotation.y = Math.PI / 4; b.scale.setScalar(0.82); g.add(b); site('banco', 'BANCO', bx + 6, bz + 6, 9);
    const van = vehicle(g, bx + 2, bz + 17.9, -FY, { L: 6.2, W: 2.3, hb: 1.9, hc: 0.9, cab: 0.26, cz: 2.2, color: 0x3a4a5e, box: 0 }); addBox(van, 2.32, 0.5, 6.22, stdM(0xf2c14e, 0.5), 0, 1.5, 0); PROPS.van = van;
    const door = [bx + 3.6, bz + 3.6], rear = [bx + 5.9, bz + 16.3]; for (const ph of [0, 0.5]) { const r = R({ x: door[0], z: door[1], x2: rear[0], z2: rear[1], spd: 1.7, ph, k: 'P', job: 'guardia de seguridad', shirt: 0x1c2740, hat: 0x101216, arm: 'hold' }); PROPS.sack.push({ role: r }); }
    R({ x: bx + 8.6, z: bz + 14.2, yaw: 0.7, job: 'guardia de seguridad', shirt: 0x1c2740, hat: 0x101216 }); R({ x: bx + 0.2, z: bz + 17.9, job: 'conduce el furgón', k: 'V', vy: 3.6 });
    for (let i = 0; i < 4; i++) R({ x: bx + 9.5 + i * 1.2, z: bz - 6 + i * 1.2, yaw: -Math.PI * 0.75, job: i ? 'en la cola del cajero' : 'sacando dinero' }); addBox(g, 1.0, 2.0, 0.6, stdM(0x2f6fd0, 0.5), bx + 8.5, 1.5, bz - 7, Math.PI / 4); }
  // ================= BOMBEROS (1, 1) y la parada de taxis de al lado
  { const bx = 42, bz = 42, red = stdM(0xc23a2e, 0.7); addBox(g, 18, 6, 10, red, bx - 4, 3.5, bz - 8); addBox(g, 18.6, 0.4, 10.6, white, bx - 4, 6.7, bz - 8); addBox(g, 3.4, 10, 3.4, red, bx + 8.5, 5.5, bz - 9.5); for (let i = 0; i < 3; i++) addBox(g, 4.4, 4.4, 0.2, dark, bx - 9.5 + i * 5.5, 2.7, bz - 2.95); site('bomberos', 'BOMBEROS', bx - 2, bz + 2, 9);
    const tr = vehicle(g, bx - 1, bz + 6.5, FY, { L: 8.6, W: 2.5, hb: 1.9, hc: 0.9, cab: 0.26, cz: 3.1, color: 0xd9241b }); addBox(tr, 0.5, 0.3, 7.5, steel, 0, 2.95, -0.8); addBox(tr, 1.5, 0.12, 6.8, white, 0, 2.6, -0.8);
    for (const [dx, a] of [[-3.2, 'wave'], [0.2, 'wave'], [3.4, 'hold']]) R({ x: bx - 1 + dx, z: bz + 8.6, yaw: Math.PI, job: a === 'hold' ? 'bombero (manguera)' : 'bombera (lava el camión)', shirt: 0x1c2740, hat: 0xf2d03a, arm: a });
    R({ x: bx - 9.5, z: bz - 1.6, job: 'bombero de guardia', shirt: 0x1c2740, hat: 0xf2d03a }); R({ x: bx + 6.5, z: bz + 3.5, x2: bx + 10.5, z2: bz + 10, spd: 1.2, k: 'P', job: 'bombero (entrenando)', shirt: 0x1c2740, hat: 0xf2d03a });
    for (let i = 0; i < 3; i++) { const z = bz - 6 + i * 6.2, x = bx + 17.9; vehicle(g, x, z, 0, { color: 0xf2c21a, top: [0.9, 0.3, 0.4, 0x16181c] }); R({ x, z, job: 'taxista', k: 'V', vy: 2.7 }); } R({ x: bx + 16.2, z: bz + 3.4, y: 0.3, yaw: 2.4, job: 'taxista (esperando)', shirt: 0xf4f1ea }); site('taxis', 'TAXIS', bx + 17.9, bz, 5); }
  // ================= COLEGIO (2, 1): el edificio, el patio y la profesora con su clase
  { const bx = 84, bz = 42, cream = stdM(0xf6e9c8, 0.85); addBox(g, 24, 7, 9, cream, bx, 4, bz - 9.5); addBox(g, 25, 0.5, 10, stdM(0xb4472f, 0.8), bx, 7.75, bz - 9.5); for (let i = 0; i < 7; i++) addBox(g, 1.8, 1.8, 0.12, stdM(0x9fd0f2, 0.2), bx - 9.6 + i * 3.2, 4.6, bz - 4.95); addBox(g, 2.4, 3.2, 0.14, stdM(0x6b4a2e, 0.7), bx, 2.1, bz - 4.95);
    for (const [x, z, w, d] of [[0, 14.5, 29, 0.2], [14.5, 5, 0.2, 19], [-14.5, 5, 0.2, 19]]) addBox(g, w, 1.1, d, stdM(0x5a8f4a, 0.7), bx + x, 1.05, bz + z); site('cole', 'COLEGIO', bx, bz + 4, 9);
    R({ x: bx - 5, z: bz + 5, yaw: 0.6, job: 'profesora', shirt: 0xe07a3a, arm: 'wave' }); for (let i = 0; i < 10; i++) R({ x: bx - 5, z: bz + 5, r: 3.3, a0: i / 10 * Math.PI * 2, w: 0.35, k: 'C', sc: 0.62, job: 'en clase, en el patio', face: 'in' });
    for (let i = 0; i < 7; i++) R({ x: bx + 6.5, z: bz + 7, r: 2.6 + (i % 2) * 0.9, a0: i / 7 * Math.PI * 2, w: 1.5, k: 'C', sc: 0.6, job: 'jugando al pilla-pilla', face: 'run' }); R({ x: bx - 12, z: bz - 2, job: 'conserje', shirt: 0x6b7280 }); }
  // ================= LAGO (1, 0): pescadores, patos y gente en la hierba
  { const bx = 42, bz = 0; const bed = new THREE.Mesh(new THREE.CircleGeometry(11.8, 40), stdM(0x9a7a4e, 0.95)); bed.rotation.x = -Math.PI / 2; bed.position.set(bx, 0.53, bz); bed.receiveShadow = true; g.add(bed);
    const w = new THREE.Mesh(new THREE.CircleGeometry(11.2, 40), new THREE.MeshPhysicalMaterial({ color: 0x3f9fe0, roughness: 0.08, metalness: 0.1, clearcoat: 1 })); w.rotation.x = -Math.PI / 2; w.position.set(bx, 0.57, bz); g.add(w); site('lago', 'LAGO', bx, bz, 5);
    for (const a of [0.55, 1.05, 2.3]) { const x = bx + Math.cos(a) * 12.3, z = bz + Math.sin(a) * 12.3, yaw = Math.atan2(-Math.cos(a), -Math.sin(a)); R({ x, z, yaw, job: 'pescando', arm: 'hold', hat: 0xd9c27a }); PROPS.rod.push({ x, z, yaw }); }
    for (let i = 0; i < 6; i++) { const a = -2.2 + i * 0.5; R({ x: bx + Math.cos(a) * 13.4, z: bz + Math.sin(a) * 13.4, y: 0.42, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), job: 'de pícnic', k: 'T' }); } PROPS.pond = [bx, bz]; }
  // ================= OBRA (−1, 1): un edificio a medio hacer, la grúa y la cuadrilla
  { const bx = -42, bz = 42, con = stdM(0xbfbfb8, 0.9), yel = stdM(0xf2c21a, 0.6); for (let a = 0; a < 3; a++) for (let c = 0; c < 2; c++) addBox(g, 0.7, 7.4, 0.7, con, bx - 7 + a * 6, 4.2, bz - 8 + c * 7); addBox(g, 13.6, 0.4, 8, con, bx - 1, 4.1, bz - 4.5); addBox(g, 7, 0.4, 8, con, bx - 4.3, 7.7, bz - 4.5);
    addBox(g, 1.3, 24, 1.3, yel, bx + 9, 12.5, bz - 9); addBox(g, 20, 0.9, 0.9, yel, bx + 2, 24, bz - 9); addBox(g, 0.12, 9, 0.12, dark, bx - 4, 19.3, bz - 9); addBox(g, 1.6, 1.0, 1.6, con, bx - 4, 14.5, bz - 9);
    { const s = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.4, 14), stdM(0xd9b56a, 0.95)); s.position.set(bx + 7, 1.7, bz + 8); s.castShadow = true; g.add(s); const m = cyl(0.9, 0.7, 1.4, stdM(0xe07a2a, 0.6), 12); m.rotation.z = 0.5; m.position.set(bx + 1, 1.5, bz + 9); g.add(m); for (let i = 0; i < 10; i++) addBox(g, 0.9, 0.45, 0.45, stdM(0xb4472f, 0.8), bx - 9 + (i % 5) * 0.95, 0.75 + Math.floor(i / 5) * 0.46, bz + 6); } site('obra', 'OBRA', bx, bz, 10);
    const wk = { shirt: 0xf07a1a, hat: 0xf2d03a }; R({ x: bx - 8, z: bz + 7.2, x2: bx - 2, z2: bz + 0.5, spd: 1.2, k: 'P', job: 'albañil', arm: 'hold', ...wk }); R({ x: bx + 5.5, z: bz + 6.5, x2: bx + 1, z2: bz + 1, spd: 1.0, ph: 0.4, k: 'P', job: 'albañil', arm: 'hold', ...wk });
    R({ x: bx + 0.2, z: bz + 10.2, yaw: Math.PI, job: 'en la hormigonera', arm: 'cut', ...wk }); R({ x: bx - 1, z: bz - 4.5, y: 4.3, job: 'encofrador', arm: 'cut', ...wk }); R({ x: bx + 3, z: bz - 3.5, y: 4.3, yaw: 2, job: 'ferrallista', ...wk }); R({ x: bx + 10.5, z: bz + 2, yaw: -FY, job: 'jefa de obra', shirt: 0xf07a1a, hat: 0xffffff, arm: 'wave' }); }
  // ================= MERCADO (1, −1): seis puestos con su vendedor y sus clientes
  { const bx = 42, bz = -42, cols = [['#d9342b', '#ffffff'], ['#2f9e5a', '#ffffff'], ['#2f6fd0', '#ffffff'], ['#f0a020', '#ffffff']], st = ['frutera', 'pescadero', 'quesera', 'florista', 'carnicero', 'verdulera']; let n = 0; site('mercado', 'MERCADO', bx, bz, 7);
    for (const x of [-9, 0, 9]) for (const z of [-7, 7]) { const c = cols[n % 4], t = canvasTex(64, 64, (q, w, h) => { for (let i = 0; i < 8; i++) { q.fillStyle = c[i % 2]; q.fillRect(i * 8, 0, 8, h); } });
      addBox(g, 6, 1.3, 3.0, wood, bx + x, 1.15, bz + z); const aw = addBox(g, 7.2, 0.3, 4.6, stdM(0xffffff, 0.8, { map: t }), bx + x, 4.4, bz + z - 0.4); aw.rotation.x = 0.2; for (const px of [-3.2, 3.2]) addBox(g, 0.25, 3.8, 0.25, wood, bx + x + px, 2.4, bz + z - 2.2);
      for (let k = 0; k < 6; k++) { const f = sph(0.45, stdM([0xf08a1c, 0xd9342b, 0x7fbf3a, 0xf2d03a][(k + n) % 4], 0.6), 8, 6); f.position.set(bx + x - 2.2 + (k % 3) * 2.2, 2.05, bz + z - 0.5 + Math.floor(k / 3) * 1.0); g.add(f); }
      R({ x: bx + x, z: bz + z - 2.5, job: st[n], shirt: 0xf4f1ea, arm: 'cut' }); for (let k = 0; k < 2 + (n % 2); k++) R({ x: bx + x - 1.6 + k * 1.6, z: bz + z + 2.5 + (k % 2) * 0.5, yaw: Math.PI, job: 'comprando en el mercado' }); n++; } }
  // ================= PARQUE (−1, −1): fuente, caminos, columpios, gente corriendo, perros, clase de yoga y el carrito de los helados
  { const bx = -42, bz = -42, path = stdM(0xe3d6b4, 0.95), stone = stdM(0xd8d2c4, 0.9), tree = (x, z, s2 = 1) => { const f = new THREE.Mesh(new THREE.ConeGeometry(2.6 * s2, 6.5 * s2, 7), stdM([0x3f8a4b, 0x4f9a52, 0x357a45][Math.floor(hash(x * 3.1 + z) * 3)], 0.9)); f.position.set(x, 0.5 + 5 * s2, z); f.castShadow = true; g.add(f); const t = cyl(0.45 * s2, 0.6 * s2, 2.2 * s2, stdM(0x7a5a3a, 0.9), 6); t.position.set(x, 0.5 + 1.1 * s2, z); g.add(t); };
    site('parque', 'PARQUE', bx, bz, 8); addBox(g, 29, 0.06, 2.2, path, bx, 0.53, bz).castShadow = false; addBox(g, 2.2, 0.06, 29, path, bx, 0.53, bz).castShadow = false; { const r = cyl(5.4, 5.4, 0.07, path, 36); r.position.set(bx, 0.535, bz); r.castShadow = false; g.add(r); }
    { const b = cyl(3.1, 3.3, 0.7, stone, 28); b.position.set(bx, 0.9, bz); g.add(b); const w = cyl(2.8, 2.8, 0.1, new THREE.MeshPhysicalMaterial({ color: 0x4fb0ea, roughness: 0.08, clearcoat: 1 }), 28); w.position.set(bx, 1.23, bz); g.add(w); const c = cyl(0.35, 0.5, 2.2, stone, 12); c.position.set(bx, 2.1, bz); g.add(c); const j = sph(0.7, stdM(0xcfeaff, 0.2), 12, 10); j.position.set(bx, 3.5, bz); g.add(j); PROPS.jet = j; }
    for (const [x, z, s2] of [[-13, -13, 0.8], [-7, -13.2, 0.6], [6, -13, 0.7], [13, -12.5, 0.85], [-13.2, -6, 0.6], [-13, 6, 0.7], [13.2, -4, 0.6], [-12.8, 13, 0.75], [-4, 13.2, 0.55], [13, 13, 0.6], [-8.5, -8, 0.55], [8.5, -8.5, 0.5]]) tree(bx + x, bz + z, s2);
    // columpios, tobogán y arenero
    addBox(g, 5.5, 0.16, 5.5, stdM(0xe8d6a0, 0.95), bx + 8.5, 0.58, bz + 8.5); for (const sx of [-1.6, 1.6]) addBox(g, 0.16, 2.6, 0.16, stdM(0xd9342b, 0.6), bx + 3.6 + sx, 1.8, bz + 11.4); addBox(g, 3.5, 0.16, 0.16, stdM(0xd9342b, 0.6), bx + 3.6, 3.1, bz + 11.4);
    { const sl = addBox(g, 0.9, 0.12, 3.4, stdM(0x2f6fd0, 0.5), bx + 12.2, 1.45, bz + 4.2); sl.rotation.x = 0.5; addBox(g, 0.9, 2.2, 0.2, stdM(0xf0a020, 0.6), bx + 12.2, 1.6, bz + 2.6); }
    for (let i = 0; i < 4; i++) R({ x: bx + 8.5, z: bz + 8.5, r: 1.2 + (i % 2) * 0.8, a0: i * 1.6, w: 0.5 + i * 0.12, k: 'C', sc: 0.6, job: 'jugando en el arenero', face: 'run' }); for (const sx of [-0.8, 0.8]) R({ x: bx + 3.6 + sx, z: bz + 11.4, y: 1.0, sc: 0.62, k: 'T', job: 'en el columpio' });
    R({ x: bx + 12.2, z: bz + 5.6, sc: 0.6, job: 'en el tobogán' }); for (let i = 0; i < 3; i++) R({ x: bx + 5.2 + i * 1.3, z: bz + 13.6, yaw: Math.PI, job: 'vigilando a los niños' });
    // corredores (dan la vuelta al parque), paseos con perro, yoga, helados y gente en la hierba
    for (let i = 0; i < 9; i++) R({ k: 'L', b: { x: bx, z: bz }, r: 12.2 + (i % 2) * 0.9, q: 3, s0: i * 11.3, spd: 2.5 + (i % 3) * 0.45, dir: i % 4 ? 1 : -1, y: 0.5, job: 'corriendo por el parque' });
    for (let i = 0; i < 4; i++) R({ k: 'L', b: { x: bx, z: bz }, r: 9.6, q: 3, s0: i * 19, spd: 0.9, dir: -1, y: 0.5, dog: 1, job: 'paseando al perro' });
    R({ x: bx - 8.5, z: bz + 3.6, yaw: FY, job: 'profe de yoga', arm: 'wave', shirt: 0x8a5cd0 }); for (let i = 0; i < 6; i++) R({ x: bx - 6.2 + (i % 2) * 1.9, z: bz + 2.2 + Math.floor(i / 2) * 1.5, yaw: -FY, job: 'en clase de yoga', arm: 'wave' });
    addBox(g, 1.8, 1.1, 1.0, white, bx + 6.5, 1.1, bz - 5.6); { const u = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.6, 8), stdM(0xff6fb5, 0.8)); u.position.set(bx + 6.5, 2.9, bz - 5.6); u.castShadow = true; g.add(u); }
    R({ x: bx + 6.5, z: bz - 6.8, job: 'heladero', shirt: 0xf4f1ea, hat: 0xff6fb5, arm: 'hold' }); for (let i = 0; i < 4; i++) R({ x: bx + 6.4 + (i % 2) * 0.2, z: bz - 4.2 + i * 1.1, yaw: Math.PI, sc: i % 2 ? 0.62 : 1, job: 'en la cola de los helados' });
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.4; R({ x: bx - 6 + Math.cos(a) * 2.2 - (i > 3 ? 1 : 0), z: bz - 8 + Math.sin(a) * 1.6 - (i > 3 ? 0.5 : 0), y: 0.42, yaw: a + 2, k: 'T', job: 'tumbado en la hierba' }); } }
  // ================= POLIDEPORTIVO (2, 0): campo de fútbol 7 y dos pistas de pádel
  { const bx = 84, bz = 0; site('deporte', 'POLIDEPORTIVO', bx, bz, 7);
    const ft = canvasTex(512, 280, (q, w, h) => { for (let i = 0; i < 8; i++) { q.fillStyle = i % 2 ? '#3f9a4a' : '#47a853'; q.fillRect(i * w / 8, 0, w / 8, h); } q.strokeStyle = '#ffffff'; q.lineWidth = 5; q.strokeRect(12, 12, w - 24, h - 24); q.beginPath(); q.moveTo(w / 2, 12); q.lineTo(w / 2, h - 12); q.stroke(); q.beginPath(); q.arc(w / 2, h / 2, 42, 0, 7); q.stroke(); q.strokeRect(12, h / 2 - 70, 70, 140); q.strokeRect(w - 82, h / 2 - 70, 70, 140); });
    { const p = new THREE.Mesh(new THREE.PlaneGeometry(26, 14.2), stdM(0xffffff, 0.9, { map: ft })); p.rotation.x = -Math.PI / 2; p.position.set(bx, 0.53, bz - 7.2); p.receiveShadow = true; g.add(p); for (const sx of [-1, 1]) { addBox(g, 0.12, 2.0, 0.12, white, bx + sx * 12.9, 1.5, bz - 9.2); addBox(g, 0.12, 2.0, 0.12, white, bx + sx * 12.9, 1.5, bz - 5.2); addBox(g, 0.12, 0.12, 4.1, white, bx + sx * 12.9, 2.5, bz - 7.2); } }
    const tm = [0xd9342b, 0x2f6fd0]; for (let i = 0; i < 12; i++) { const t2 = i % 2, col = Math.floor(i / 2) % 3, row = Math.floor(i / 6); R({ x: bx + (t2 ? 1 : -1) * (2.4 + col * 3.2) + (row ? 1.4 : -0.6), z: bz - 10.6 + row * 6.4 + (col % 2) * 1.3, r: 1.1 + (i % 3) * 0.6, a0: i * 1.3, w: (0.7 + (i % 4) * 0.22) * (i % 2 ? 1 : -1), k: 'C', job: 'jugando al fútbol', shirt: tm[t2], face: 'run' }); }
    for (const sx of [-1, 1]) R({ x: bx + sx * 11.8, z: bz - 7.2, x2: bx + sx * 11.8, z2: bz - 5.8, spd: 0.9, k: 'P', job: sx < 0 ? 'portero' : 'portera', shirt: sx < 0 ? 0xf2d03a : 0x2f9e5a }); R({ x: bx, z: bz - 1.4, x2: bx + 5, z2: bz - 1.2, spd: 1.6, k: 'P', job: 'árbitro', shirt: 0x16181c });
    for (let i = 0; i < 6; i++) R({ x: bx - 9 + i * 2.1, z: bz + 0.9, yaw: Math.PI, job: 'viendo el partido' }); PROPS.ball = { c: [bx, bz - 7.2] };
    const glass = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.1, transparent: true, opacity: 0.28, depthWrite: false }), pt = canvasTex(256, 140, (q, w, h) => { q.fillStyle = '#2f6fd0'; q.fillRect(0, 0, w, h); q.strokeStyle = '#ffffff'; q.lineWidth = 4; q.strokeRect(6, 6, w - 12, h - 12); q.beginPath(); q.moveTo(w * 0.27, 6); q.lineTo(w * 0.27, h - 6); q.moveTo(w * 0.73, 6); q.lineTo(w * 0.73, h - 6); q.moveTo(w * 0.27, h / 2); q.lineTo(w * 0.73, h / 2); q.stroke(); });
    PROPS.padel = []; for (const cx of [-7.3, 7.3]) { const x0 = bx + cx, z0 = bz + 9; const p = new THREE.Mesh(new THREE.PlaneGeometry(12, 6.6), stdM(0xffffff, 0.8, { map: pt })); p.rotation.x = -Math.PI / 2; p.position.set(x0, 0.535, z0); p.receiveShadow = true; g.add(p);
      for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 6.6), glass); w.position.set(x0 + sx * 6, 1.8, z0); g.add(w); } { const w = new THREE.Mesh(new THREE.BoxGeometry(12, 2.6, 0.1), glass); w.position.set(x0, 1.8, z0 - 3.3); g.add(w); } addBox(g, 0.06, 0.85, 6.6, white, x0, 0.95, z0); PROPS.padel.push([x0, z0]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) R({ x: x0 + sx * 3.4, z: z0 + sz * 1.5 - 0.6, x2: x0 + sx * 3.4, z2: z0 + sz * 1.5 + 0.6, spd: 1.1, ph: hash(cx + sx * 2 + sz), k: 'P', job: 'jugando al pádel', arm: 'cut', faceX: -sx }); } }
  // ================= EN LA CALLE: policías dirigiendo el tráfico y un músico con su público en la plaza
  for (const [x, z] of [[21, -21], [-21, 21], [-21, -21]]) R({ x, z, y: 0.06, yaw: Math.PI / 4, job: 'policía (dirige el tráfico)', shirt: 0x2f55b8, hat: 0x16233f, arm: 'wave' });
  { const [x, z] = fromUV(-17, -15.5); R({ x, z, y: 0.16, yaw: Math.PI / 4, job: 'tocando la guitarra', arm: 'cut', shirt: 0x16181c }); addBox(g, 0.5, 0.9, 0.3, wood, x + 0.5, 1.0, z + 0.5, 0.6);
    for (let i = 0; i < 11; i++) { const a = Math.PI / 4 + (i - 5) * 0.27, rr2 = 3.4 + (i % 2) * 1.1; R({ x: x + Math.sin(a) * rr2, z: z + Math.cos(a) * rr2, y: 0.16, yaw: a + Math.PI, job: 'escuchando al músico' }); } site('musico', null, x, z, 4); }
  SITES.push({ name: 'plaza', label: null, p: new THREE.Vector3(0, 3, 0) });
  return g;
}
// ---------------------------------------------------------------- la escena y su guion (episodio 2), guiado por la voz (K = inicio de cada palabra):
// 1 «ya tiene nombre: Kiria World… su primer rey… cómo quitarle la corona»: el pueblo desde arriba, el cartel, el rey en el trono
// 2 «ya somos 6.124… cada uno tiene su vida»: una manzana de casas: gente paseando, perros, coches, corrillos, las casas con sus 5 nombres
// 3 la peluquería · 4 el supermercado (el carro lleno, la caja y su cola) · 5 el banco (los guardias sacan el dinero al furgón)
// 6 panaderos, bomberos, taxistas, la profesora, el pescador del lago
// 7–8 «una ciudad de verdad necesita leyes…»: el tablón de leyes vacío, el comentario con más «me gusta», la corona se levanta: nuevo rey
// 9 «mándaselo…»: la cámara vuelve arriba (enlaza con el primer fotograma)
let TL = {};
async function buildScene() {
  TL = { name: K['kiria_1'], king: K['rey_1'], crown: K['corona_1'], pop: K['somos_2'], life: K['vida_2'], pelu: K['peluqueria_3'], hugo: K['hugo_3'], sofia: K['sofia_3'], sup: K['supermercado_4'], carro: K['oscar_4'], caja: K['alanna_4'],
    banco: K['banco_5'], furgon: K['furgon_5'], pan: K['panaderos_6'], bomb: K['bomberos_6'], taxi: K['taxistas_6'], profe: K['profesora_6'], pesca: K['pescador_6'], ley: K['leyes_7'], escribe: K['escribe_7'], gusta: K['gusta_8'],
    cumple: K['cumplira_8'], nuevo: K['nuevo_8'], send: K['mandaselo_9'] };
  S.city = buildCity(); scene.add(S.city); S.sites = buildSites(); scene.add(S.sites); S.people = buildPeople(); scene.add(S.people);
  const ks = PEOPLE.kingS; S.kingHead = ks.y - 0.55 + 2.95 * ks.sc; S.anc = { king: v3(ks.x, S.kingHead + 3.4, ks.z), throne: v3(0, 31, 0) };
  envAll(scene);
}
function stageAt(t, st) {
  NOW = t; const ks = PEOPLE.kingS, lift = sm5(seg(t, TL.nuevo - 0.25, TL.nuevo + 0.7)) * (1 - sm5(seg(t, END - 1.0, END - 0.35))), wob = win(t, TL.crown - 0.2, 0.3) * (1 - win(t, TL.crown + 1.3, 0.4));
  cityAt(t, { crown: { k: 1, s: lerp(0.42, 1.05, lift), x: ks.x, z: ks.z, y: S.kingHead + 0.25 + lift * 11 + 0.35 * wob * Math.abs(Math.sin(t * 7)) + 0.4 * lift * Math.sin(t * 2.4), wob: 0.3 + wob * 1.6 + lift },
    sign: 1 + 0.22 * Math.sin(clamp((t - TL.name) / 0.5) * Math.PI) });
  peopleAt(t, { cheer: 0.55 * win(t, TL.name + 0.1, 0.3) * (1 - win(t, TL.king + 0.8, 0.6)) });
  S.lift = lift; scene.updateMatrixWorld(true); const c = st.l; lightsAt(c, st.p.distanceTo(c));
}
// ---------------------------------------------------------------- LA CÁMARA: un solo plano desde arriba, en diagonal, que va de sitio en sitio. Claves:
// [t, x, z (punto del suelo al que mira, en metros del mundo), altura a la que mira, distancia, elevación°, giro°]. La distancia se interpola en logaritmo.
let CK = [];
function buildCam() {
  const C0 = [0, 0, 6, 1400, 41, 0], sp = n => { const p = SITES.find(s => s.name === n).p; return [p.x, p.z]; }, k = (t, xz, ...r) => [t, xz[0], xz[1], ...r], B = (i, j, dx = 0, dz = 0) => [i * PITCH + dx, j * PITCH + dz];
  CK = [[0, ...C0], k(TL.name + 0.5, fromUV(0, -14), 6, 620, 40, 0),                                                                    // el pueblo y su cartel
    k(TL.king + 0.9, [0.5, 0.5], 12, 150, 27, 0), k(TL.crown + 0.5, [0.5, 0.5], 13.2, 78, 22, 5),                                          // el rey y su corona
    k(TL.pop + 0.9, B(0, 2, 14, 2), 3, 150, 39, 0), k(TL.life - 0.5, B(0, 2, 15, -4), 1.5, 52, 38, -3), k(TL.pelu - 0.3, B(0, 2, 13, -10), 1.5, 46, 38, -4),   // una manzana de casas: cada uno a lo suyo
    k(TL.pelu + 0.75, [-9.0, 31.4], 1.6, 46, 38, 0), k(TL.sofia + 0.9, [-9.6, 31.0], 1.6, 38, 37, 3),                                       // la peluquería
    k(TL.carro + 0.35, [-8.6, -44.5], 1.6, 44, 38, 0), k(TL.caja - 0.25, [-7.8, -42], 1.6, 42, 38, 2), k(TL.caja + 0.55, [-4.0, -35.4], 1.6, 44, 38, 0), k(TL.banco - 0.3, [-3.4, -36.2], 1.6, 41, 38, -2),   // el carro lleno · la caja y su cola
    k(TL.banco + 0.8, [-40, 7], 1.6, 82, 38, 0), k(TL.furgon + 0.6, [-37.5, 13], 1.6, 52, 37, 3),                                       // el banco: los guardias y el furgón
    k(TL.pan + 0.14, [8.3, 33.6], 1.6, 48, 38, 0), k(TL.bomb - 0.3, [8.8, 34.2], 1.6, 46, 38, 1), k(TL.bomb + 0.14, [40.5, 49], 1.6, 58, 38, 0), k(TL.taxi - 0.3, [41.5, 49.2], 1.6, 56, 38, 1),
    k(TL.taxi + 0.14, [59, 43], 1.6, 52, 38, 0), k(TL.profe - 0.3, [59.4, 43.8], 1.6, 50, 38, 1),      // panaderos, bomberos, taxistas…
    k(TL.profe + 0.14, [80.5, 47.5], 1.6, 50, 38, 0), k(TL.pesca - 0.3, [80, 48], 1.6, 48, 38, 1), k(TL.pesca + 0.14, [47.5, 7.5], 1.6, 62, 38, 0), k(TL.ley - 0.75, [46, 7], 1.6, 56, 38, -2),   // …la profesora y el pescador
    k(TL.ley + 0.9, [0.5, 2], 14, 250, 27, 0), k(TL.gusta + 0.4, [0.5, 1], 14.5, 235, 26, 4), k(TL.nuevo - 0.4, [0.5, 0.5], 15, 215, 25, -3), k(TL.nuevo + 1.2, [0.5, 0.5], 17, 205, 24, 0),   // las leyes y el nuevo rey
    k(END - 2.0, [72, -2], 3, 150, 38, 0), [END, ...C0]];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0] + ' → ' + CK[i][0]);
}
function camAt(t) {
  t = clamp(t, 0, END); if (t >= END - 1e-6) t = 0;
  const T = CK.map(k => k[0]), c = j => mono(t, T, CK.map(k => k[j])), d = Math.exp(mono(t, T, CK.map(k => Math.log(k[4])))), el = c(5) * Math.PI / 180, az = Math.PI / 4 + c(6) * Math.PI / 180, x = c(1), z = c(2), l = v3(x, c(3), z);
  return { p: v3(x + d * Math.cos(el) * Math.sin(az), l.y + d * Math.sin(el), z + d * Math.cos(el) * Math.cos(az)), l, f: 20, roll: 0 };
}
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l); return { focus: f, scale: (f > 400 ? 0.55 : 0.3) * f }; }
// ---------------------------------------------------------------- RÓTULOS (como la interfaz de un juego): barra de arriba (el nombre del pueblo, habitantes y rey),
// el cartel de cada sitio cuando la cámara pasa cerca, el nombre del rey sobre el trono, el tablón de leyes y el comentario con más «me gusta».
// (Los nombres de los seguidores no se dibujan aquí: los pone el montaje. El del rey sí: lo dice la voz.)
const KING_AT = '@iannyanezz_';
function buildHudPlan() {}
const HF = (px, w = 800) => { hg.font = `${w} ${px}px Inter, sans-serif`; };
function hpill(x, y, txt, k, o = {}) {            // cartel con punta, centrado en x, con la punta en y
  if (k <= 0.01) return; const px = o.px || 34, s = popK(k); hg.save(); hg.translate(x, y); hg.scale(s, s); hg.globalAlpha = clamp(k * 2) * (o.a ?? 1); HF(px, 900); hg.letterSpacing = '2px'; const w = hg.measureText(txt).width + px * 1.3 + (o.crown ? px * 1.2 : 0), h = px * 1.75;
  hg.shadowColor = 'rgba(0,0,0,.35)'; hg.shadowBlur = 14 * PR; hg.shadowOffsetY = 4 * PR; hg.fillStyle = o.bg || '#ffffff'; rr(hg, -w / 2, -h - 16, w, h, h / 2); hg.fill(); hg.beginPath(); hg.moveTo(-12, -17); hg.lineTo(12, -17); hg.lineTo(0, 0); hg.closePath(); hg.fill();
  hg.shadowColor = 'transparent'; if (o.crown) crownIcon(-w / 2 + px * 1.05, -16 - h / 2, px * 0.5, o.fg || '#1c2430'); hg.fillStyle = o.fg || '#1c2430'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(txt, 1 + (o.crown ? px * 0.6 : 0), -16 - h / 2 + px * 0.04); hg.restore(); }
function heart(x, y, s, col) { hg.save(); hg.translate(x, y); hg.scale(s, s); hg.fillStyle = col; hg.beginPath(); hg.moveTo(0, 0.9); hg.bezierCurveTo(-1.6, -0.2, -0.9, -1.25, 0, -0.5); hg.bezierCurveTo(0.9, -1.25, 1.6, -0.2, 0, 0.9); hg.fill(); hg.restore(); }
function crownIcon(x, y, s, col) { hg.save(); hg.translate(x, y); hg.scale(s, s); hg.fillStyle = col; hg.beginPath(); hg.moveTo(-1, 0.6); hg.lineTo(-1.1, -0.6); hg.lineTo(-0.5, -0.05); hg.lineTo(0, -0.85); hg.lineTo(0.5, -0.05); hg.lineTo(1.1, -0.6); hg.lineTo(1, 0.6); hg.closePath(); hg.fill(); hg.restore(); }
const ppmOf = v => { const d = cam.position.distanceTo(v); return (H / 2) / Math.tan(cam.fov * Math.PI / 360) / d; };
function hudAt(t) {
  hudBegin(); const lift = S.lift || 0, TOP = 420;
  // ---- el cartel de cada sitio cuando se ve de cerca (pero no tanto como para tapar a la gente)
  for (const s of SITES) { if (!s.label) continue; const m = ppmOf(s.p), k = clamp((m - 29) / 6) * (1 - clamp((m - 150) / 30)); if (k <= 0.01) continue; const p = proj(s.p); if (!p.ok || p.x < -100 || p.x > W + 100 || p.y < TOP + 30 || p.y > H) continue; hpill(clamp(p.x, 190, W - 190), p.y, s.label, k * clamp((p.y - TOP - 30) / 60), { px: clamp(m * 0.5, 30, 46) }); }
  // ---- el rey: su nombre sobre el trono (mientras lleva la corona)
  { const p = proj(S.anc.king), m = ppmOf(S.anc.king), k = clamp((m - 13) / 5) * (1 - lift); if (p.ok && k > 0.01 && p.y > TOP) hpill(p.x, p.y, KING_AT, k, { px: clamp(m * 0.75, 34, 60), bg: '#ffd04a', fg: '#3a2a00', crown: 1 }); }
  // ---- barra de arriba: el nombre del pueblo, los habitantes y el rey
  { hg.save(); hg.shadowColor = 'rgba(0,0,0,.3)'; hg.shadowBlur = 16 * PR; hg.shadowOffsetY = 4 * PR; hg.fillStyle = 'rgba(18,24,34,.88)'; rr(hg, 46, 120, 988, 84, 42); hg.fill(); hg.shadowColor = 'transparent'; hg.textBaseline = 'middle'; hg.textAlign = 'left';
    HF(34, 900); hg.letterSpacing = '2px'; hg.fillStyle = '#7ce0a0'; hg.fillText('KIRIA WORLD', 80, 164); let x = 80 + hg.measureText('KIRIA WORLD').width + 26; hg.fillStyle = 'rgba(255,255,255,.25)'; hg.fillRect(x, 144, 2, 38); x += 22;
    hg.fillStyle = '#ffffff'; hg.beginPath(); hg.arc(x + 9, 152, 7.5, 0, 7); hg.fill(); hg.beginPath(); hg.arc(x + 9, 178, 14, Math.PI, 0); hg.fill(); HF(31, 900); hg.letterSpacing = '0px'; hg.fillText('6.124', x + 32, 165);
    const king = lift < 0.5, blink = 0.6 + 0.4 * Math.sin(t * 7); crownIcon(690, 162, 16, king ? '#ffd04a' : '#8a93a2'); HF(king ? 29 : 31, 900); hg.fillStyle = king ? '#ffd04a' : '#ff8a6a'; hg.globalAlpha = king ? 1 : blink; hg.fillText(king ? KING_AT : '¿TÚ?', 718, 165); hg.restore(); }
  // ---- 1 · «ya tiene nombre: Kiria World»: el nombre en grande
  { const k = seg(t, TL.name - 0.05, TL.name + 0.3) * (1 - win(t, TL.king - 0.15, 0.35)); if (k > 0.01) { const s = popK(k); hg.save(); hg.translate(W / 2, 760); hg.scale(s, s); hg.rotate(-0.03); hg.globalAlpha = clamp(k * 2); HF(150, 900); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '4px';
      hg.lineWidth = 26; hg.lineJoin = 'round'; hg.strokeStyle = 'rgba(12,40,24,.92)'; hg.strokeText('KIRIA', 0, -80); hg.strokeText('WORLD', 0, 70); hg.fillStyle = '#ffffff'; hg.fillText('KIRIA', 0, -80); hg.fillStyle = '#7ce0a0'; hg.fillText('WORLD', 0, 70); hg.restore(); } }
  // ---- 2 · «ya somos 6.124»
  { const k = seg(t, TL.pop + 0.15, TL.pop + 0.45) * (1 - win(t, K['y_2'] - 0.1, 0.35)); if (k > 0.01) { const s = popK(k); hg.save(); hg.translate(W / 2, 600); hg.scale(s, s); hg.globalAlpha = clamp(k * 2); HF(170, 900); hg.textAlign = 'center'; hg.textBaseline = 'middle';
      hg.lineWidth = 26; hg.lineJoin = 'round'; hg.strokeStyle = 'rgba(18,24,34,.92)'; hg.strokeText('6.124', 0, 0); hg.fillStyle = '#ffffff'; hg.fillText('6.124', 0, 0); HF(46, 900); hg.letterSpacing = '8px'; hg.lineWidth = 14; hg.strokeText('HABITANTES', 0, 118); hg.fillStyle = '#7ce0a0'; hg.fillText('HABITANTES', 0, 118); hg.restore(); } }
  // ---- 7 · el tablón de leyes (vacío) · 8 · el comentario con más «me gusta» · se cumple · nuevo rey
  { const k = seg(t, TL.ley - 0.05, TL.ley + 0.35) * (1 - win(t, TL.nuevo - 0.55, 0.35)); if (k > 0.01) { const s = popK(k), w = 880, h = 300, ok = seg(t, TL.cumple, TL.cumple + 0.3); hg.save(); hg.translate(W / 2, 640); hg.scale(s, s); hg.globalAlpha = clamp(k * 2);
      hg.shadowColor = 'rgba(0,0,0,.35)'; hg.shadowBlur = 22 * PR; hg.shadowOffsetY = 6 * PR; hg.fillStyle = '#f6efdc'; rr(hg, -w / 2, -h / 2, w, h, 26); hg.fill(); hg.shadowColor = 'transparent'; hg.fillStyle = '#7a4a22'; rr(hg, -w / 2, -h / 2, w, 84, 26); hg.fill(); hg.fillRect(-w / 2, -h / 2 + 50, w, 34);
      HF(40, 900); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '5px'; hg.fillStyle = '#fff3d6'; hg.fillText('LEYES DE KIRIA WORLD', 0, -h / 2 + 44);
      hg.textAlign = 'left'; hg.letterSpacing = '0px'; HF(52, 900); hg.fillStyle = '#3a2a1a'; hg.fillText('1.', -w / 2 + 50, 8); HF(44, 700); hg.fillStyle = ok > 0.01 ? '#1f7a4d' : '#9a8a70'; hg.fillText(ok > 0.01 ? typed('La ley más votada', ok * 1.2) : '____________________' + (Math.sin(t * 9) > 0 ? ' ▌' : ''), -w / 2 + 120, 10);
      HF(52, 900); hg.fillStyle = '#b9ab90'; hg.fillText('2.', -w / 2 + 50, 92); HF(44, 700); hg.fillText('____________________', -w / 2 + 120, 94);
      if (ok > 0.01) { const s2 = 1 + 0.6 * (1 - eo(clamp(ok * 1.4))); hg.translate(w / 2 - 190, 62); hg.scale(s2 * 0.9, s2 * 0.9); hg.rotate(-0.12); hg.globalAlpha = clamp(ok * 3); hg.strokeStyle = '#1f7a4d'; hg.lineWidth = 7; rr(hg, -125, -42, 250, 84, 12); hg.stroke(); HF(46, 900); hg.textAlign = 'center'; hg.letterSpacing = '3px'; hg.fillStyle = '#1f7a4d'; hg.fillText('SE CUMPLE', 0, 3); }
      hg.restore(); } }
  { const k = seg(t, TL.escribe, TL.escribe + 0.35) * (1 - win(t, TL.nuevo + 1.6, 0.4)); if (k > 0.01) { const s = popK(k), x0 = -430, w = 860, h = 190; hg.save(); hg.translate(W / 2, 1420); hg.scale(s, s); hg.globalAlpha = clamp(k * 2);
      hg.shadowColor = 'rgba(0,0,0,.35)'; hg.shadowBlur = 22 * PR; hg.shadowOffsetY = 6 * PR; hg.fillStyle = '#ffffff'; rr(hg, x0, -h / 2, w, h, 38); hg.fill(); hg.shadowColor = 'transparent';
      hg.fillStyle = '#d5dae2'; hg.beginPath(); hg.arc(x0 + 88, 0, 50, 0, 7); hg.fill(); hg.fillStyle = '#aab2be'; hg.beginPath(); hg.arc(x0 + 88, -14, 19, 0, 7); hg.fill(); hg.beginPath(); hg.arc(x0 + 88, 42, 34, Math.PI * 1.08, Math.PI * 1.92); hg.fill();
      HF(40, 900); hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.fillStyle = '#1c2430'; hg.fillText('@¿tú?', x0 + 164, -36); if (lift > 0.3) { crownIcon(x0 + 164 + hg.measureText('@¿tú?').width + 34, -40, 20, '#f0a020'); }
      HF(36, 500); hg.fillStyle = '#4a5360'; hg.fillText(typed('Mi ley para Kiria World es…', seg(t, TL.escribe + 0.25, TL.escribe + 1.1)), x0 + 164, 30);
      const lk = sm5(seg(t, TL.gusta - 0.4, TL.gusta + 0.9)), n = Math.round(1 + lk * 3118), hs = 30 * (1 + 0.25 * Math.max(0, Math.sin((t - TL.gusta) * 14)) * (lk > 0 && lk < 1 ? 1 : 0)); heart(x0 + w - 92, -22, hs, lk > 0.02 ? '#ff3b5c' : '#c9ced6');
      HF(30, 800); hg.textAlign = 'center'; hg.fillStyle = '#1c2430'; hg.fillText(n.toLocaleString('es-ES').replace(/,/g, '.'), x0 + w - 92, 46); hg.restore(); } }
  // la corona, ya sin dueño: «¿quién será el nuevo rey?»
  { const k = lift * (1 - win(t, END - 1.2, 0.3)); if (k > 0.5) { const p = proj(v3(CITY.crown.position.x, CITY.crown.position.y + 5.5, CITY.crown.position.z)); if (p.ok) hpill(p.x, p.y, 'NUEVO REY: ¿TÚ?', (k - 0.5) * 2, { px: 46, bg: '#ffd04a', fg: '#3a2a00', crown: 1 }); } }
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
  if (typeof fillAt === 'function') { const F = fillAt(t); post.uniforms.fillk.value = F.k; post.uniforms.fillc.value.set(F.c[0], F.c[1], F.c[2]); }
  { const D = typeof dofAt === 'function' ? dofAt(t, st) : null; dofM.uniforms.focus.value = D ? D.focus : d; dofM.uniforms.scale.value = D ? D.scale : 0; }
  return st;
}
function blurPass(src, dst, dx, dy) { quad.material = blurM; blurM.uniforms.tA.value = src.texture; blurM.uniforms.d.value.set(dx, dy); renderer.setRenderTarget(dst); renderer.render(quadScene, quadCam); }
let SRC = rtA;                                     // la imagen que sigue (con profundidad de campo si toca)
function drawFrame(t) {
  renderer.setRenderTarget(rtA); renderer.render(scene, cam); SRC = rtA;
  if (dofM.uniforms.scale.value > 0) { quad.material = dofM; dofM.uniforms.tA.value = rtA.texture; dofM.uniforms.tD.value = rtA.depthTexture; dofM.uniforms.logF.value = Math.log2(cam.far + 1);
    renderer.setRenderTarget(rtD); renderer.render(quadScene, quadCam); SRC = rtD; }
  renderer.setRenderTarget(rtF); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(fxScene, cam);
  quad.material = brightM; brightM.uniforms.tA.value = SRC.texture; brightM.uniforms.tF.value = rtF.texture; renderer.setRenderTarget(rtB[0]); renderer.render(quadScene, quadCam);
  blurPass(rtB[0], rtB[1], 1 / BLW, 0); blurPass(rtB[1], rtB[0], 0, 1 / BLH);
  blurPass(rtB[0], rtC[1], 2 / BLW, 0); blurPass(rtC[1], rtC[0], 0, 2 / BLH); blurPass(rtC[0], rtC[1], 3 / BLW, 0); blurPass(rtC[1], rtC[0], 0, 3 / BLH);
  hg.getImageData(0, 0, 1, 1); hudTex.needsUpdate = true; post.uniforms.tH.value = hudTex;
  quad.material = post; post.uniforms.tA.value = SRC.texture; post.uniforms.tF.value = rtF.texture; post.uniforms.tB.value = rtB[0].texture; post.uniforms.tC.value = rtC[0].texture; post.uniforms.time.value = t;
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
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  // una clave por palabra: K['brasil_1'], K['ondas_5'], K['200000_7'], K['tonga_11']… (inicio de la palabra − 0,03 s; la primera vez que sale en esa frase)
  K = {}; for (const w of WORDS) { const key = w.n + '_' + w.li; if (K[key] === undefined) K[key] = w.start - 0.03; }
  K.start = 0; { const K0 = K; K = new Proxy(K0, { get: (o, k) => { if (typeof k === 'string' && !(k in o)) console.error('ERROR sin clave K.' + k); return o[k]; } }); }

  mats(); buildMats(); S.flow = [];
  await loadEnv(); buildLights(); cam.near = 1; cam.far = 40000; cam.updateProjectionMatrix();
  await buildScene();
  await waitLoads();
  post.uniforms.ca.value = 0.12; post.uniforms.vig.value = 0.2; post.uniforms.bloom.value = 0.2;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s); window.glLost = () => renderer.getContext().isContextLost();
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
