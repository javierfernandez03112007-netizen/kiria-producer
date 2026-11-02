// «Gafas de esquí por dentro»: un esquiador congelado en plena curva, el sol, la luz que llega del cielo y rebota en la nieve,
// y unas gafas desmontadas capa a capa (espejo, lente, filtro polarizado, cámara de aire). window.renderAt(t) dibuja el instante t.
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
// máscara de la lente (lo que se ve a través de ella): se dibuja antes que la escena para que la nieve y el acabado sepan dónde está
const rtM = new THREE.WebGLRenderTarget(Math.round(W * PR / 4), Math.round(H * PR / 4)), maskScene = new THREE.Scene();
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
    fade: { value: 0 }, white: { value: 0 }, vig: { value: 0.38 }, lensK: { value: 0 }, lensCol: { value: new THREE.Vector3(1, 0.7, 0.4) }, tM: { value: rtM.texture }, lensW: { value: 1 }, lensCt: { value: 1.6 }, time: { value: 0 }, flash: { value: 0 }, bloom: { value: 0.75 }, ca: { value: 1 }, mbk: { value: 0.8 }, tint: { value: new THREE.Vector3(0, 0, 0) } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D tA, tB, tC, tF, tH, tM; uniform vec2 m0, a0; uniform vec4 J; uniform vec3 tint; uniform float fade, white, vig, time, flash, bloom, ca, mbk, lensK, lensCt, lensW; uniform vec3 lensCol; varying vec2 vUv;
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
      // la lente entra de izquierda a derecha (lensW = borde): dentro, su color y más contraste; en el borde, un brillo
      if (lensK > 0.001) { float mk = texture2D(tM, vUv).r, inL = mk * (1.0 - smoothstep(lensW - 0.025, lensW + 0.025, vUv.x));
        vec3 f = a * lensCol; float fm = dot(f, vec3(0.2126, 0.7152, 0.0722)); f = (f - 0.45) * lensCt + 0.45;
        a = mix(a, clamp(f, 0.0, 1.0), inL * lensK);
        a += vec3(1.0, 0.75, 0.45) * mk * lensK * exp(-abs(vUv.x - lensW) * 140.0) * step(lensW, 1.0) * 0.9; }
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
let WORDS = [], END = 61.2, VENV = [];
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
function drawK(l, k) { const n = l.userData.nseg, m = Math.floor(n * clamp(k)); l.geometry.instanceCount = m; l.visible = m > 0; l.userData.k = m > 0 ? clamp(k) : 0; }

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
const _vp = new THREE.Matrix4();
function flowUpdate(t, VP, PVP) {
  for (const m of S.flow) { const u = m.material.uniforms; u.VP.value.copy(VP); u.PVP.value.copy(PVP); u.time.value = t; }
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
// ---------------------------------------------------------------- el mundo: pista nevada, montañas, cielo con el sol y la nieve que brilla
const SUN_DIR = v3(-0.36, 0.5, -0.79).normalize();          // hacia el sol (alto, detrás y a la izquierda del esquiador)
const SOFT_DIR = v3(-0.3, 0.25, 0.92).normalize();           // luz del día nublado: baja, desde un lado (+z)
const SUN_D = 240, SUN_P = SUN_DIR.clone().multiplyScalar(SUN_D);
const W0 = {};                                              // piezas del mundo
let SNOW, SNOWF;
function n2(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, h = (a, b) => hash(a * 157.31 + b * 311.73 + 0.17);
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v);
}
function fbm(x, z, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * n2(x * f, z * f); f *= 2.03; a *= 0.5; } return s; }
// los baches (bañeras) de la bajada: siempre están, pero con luz plana casi no se ven
function mogul(x, z) { const m = Math.max(0, 1 - Math.abs(z + 1.5) / 9) * clamp((x - 5) / 4) * (1 - clamp((x - 60) / 10)); return m * 0.44 * (Math.sin(x * 0.92 + Math.sin(z * 0.5) * 0.9) * Math.sin(z * 0.85 + x * 0.21)); }
function groundH(x, z) {
  const d = Math.hypot(x + 10, z + 20), slope = -0.17 * x;
  const roll = (fbm(x * 0.05 + 3, z * 0.05 + 7) - 0.5) * 2.4;
  const mtn = Math.pow(Math.max(0, d - 70) / 130, 1.35) * 95 * (0.5 + 0.95 * fbm(x * 0.011 + 11, z * 0.011 + 5, 6));
  const near = Math.exp(-(x * x + z * z) / 140);
  return slope + lerp(roll, 0, near * 0.9) + mtn + mogul(x, z);
}
// luz plana: con el cielo cubierto la nieve se ilumina como si fuera lisa (la normal se aplana hacia la de la ladera: uFlat).
// A través de la lente naranja (máscara uMask, que entra de izquierda a derecha hasta uLensW) vuelve la normal real: vuelve el relieve
const RELIEF = { uFlat: { value: 0 }, uLensK: { value: 0 }, uLensW: { value: 1 }, uMask: { value: rtM.texture }, uRes: { value: new THREE.Vector2(W * PR, H * PR) } };
function reliefPatch(m) {
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, RELIEF);
    sh.fragmentShader = 'uniform float uFlat, uLensK, uLensW; uniform sampler2D uMask; uniform vec2 uRes;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      { vec2 sv = gl_FragCoord.xy / uRes; float inL = texture2D(uMask, sv).r * (1.0 - smoothstep(uLensW - 0.025, uLensW + 0.025, sv.x));
        vec3 upV = normalize((viewMatrix * vec4(0.168, 0.986, 0.0, 0.0)).xyz); normal = normalize(mix(normal, upV, uFlat * (1.0 - uLensK * inL))); }`); };
  m.customProgramCacheKey = () => 'relief';
}
function buildMats() {
  SNOW = new THREE.MeshStandardMaterial({ color: 0xf2f6fc, roughness: 0.82, metalness: 0, envMapIntensity: 0.6 }); reliefPatch(SNOW);
  SNOWF = new THREE.MeshStandardMaterial({ color: 0xf6f9ff, roughness: 0.9, metalness: 0 }); reliefPatch(SNOWF);
}
const SKY_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vD; void main(){ vD = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`;
const SKY_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 sunDir; uniform float over, space, dark; varying vec3 vD;
void main(){
  #include <logdepthbuf_fragment>
  vec3 d = normalize(vD); float h = clamp(d.y, -0.2, 1.0);
  vec3 zen = vec3(0.05, 0.22, 0.62), hor = vec3(0.62, 0.78, 0.95);
  vec3 c = mix(hor, zen, pow(max(h, 0.0), 0.55));
  c = mix(c, vec3(0.86, 0.9, 0.95), smoothstep(0.02, -0.12, d.y));
  float s = max(dot(d, sunDir), 0.0); c += vec3(1.0, 0.92, 0.75) * (pow(s, 380.0) * 6.0 + pow(s, 24.0) * 0.45 + pow(s, 5.0) * 0.12);
  vec3 ov = vec3(0.72, 0.75, 0.79) - vec3(0.06) * max(h, 0.0);      // cielo cubierto: gris plano
  c = mix(c, ov, over);
  vec3 sp = mix(vec3(0.0, 0.01, 0.04), vec3(0.03, 0.08, 0.2), smoothstep(-0.3, 0.6, d.y)) + vec3(1.0, 0.9, 0.7) * pow(s, 24.0) * 0.6;   // casi el espacio
  c = mix(c, sp, space); c *= 1.0 - dark;
  gl_FragColor = vec4(c, 1.0);
}`;
function buildWorld() {
  const Z = new THREE.Group(); scene.add(Z); W0.Z = Z;
  // cielo
  W0.sky = new THREE.Mesh(new THREE.SphereGeometry(330, 48, 24), new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false,
    uniforms: { sunDir: { value: SUN_DIR.clone() }, over: { value: 0 }, space: { value: 0 }, dark: { value: 0 } } }));
  W0.sky.renderOrder = -10; W0.sky.frustumCulled = false; Z.add(W0.sky);
  // terreno
  const N = 300, SZ = 520, g = new THREE.PlaneGeometry(SZ, SZ, N, N); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); P.setY(i, groundH(x, z)); }
  g.computeVertexNormals();
  W0.ground = new THREE.Mesh(g, SNOW); W0.ground.receiveShadow = true; Z.add(W0.ground);
  // detalle fino cerca del esquiador y de los baches (malla densa)
  const g2 = new THREE.PlaneGeometry(90, 40, 360, 160); g2.rotateX(-Math.PI / 2); g2.translate(28, 0.01, -1.5);
  const P2 = g2.attributes.position; for (let i = 0; i < P2.count; i++) { const x = P2.getX(i), z = P2.getZ(i); P2.setY(i, groundH(x, z) + 0.012 + (n2(x * 3.1, z * 3.1) - 0.5) * 0.03); }
  g2.computeVertexNormals(); W0.near = new THREE.Mesh(g2, SNOW); W0.near.receiveShadow = true; Z.add(W0.near);
  // el sol: disco brillante + halo
  const sunM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.82).multiplyScalar(9), toneMapped: false, fog: false });
  W0.sun = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48), sunM); W0.sun.position.copy(SUN_P); Z.add(W0.sun);
  W0.halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: starTex0(), color: new THREE.Color(1, 0.86, 0.62).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
  W0.halo.position.copy(SUN_P); W0.halo.scale.setScalar(70); Z.add(W0.halo);
  // la nieve que centellea (cristales que pillan el sol según desde dónde se miren)
  const n = 2600, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const r = 2 + Math.pow(hash(i * 1.7), 0.7) * 26, a = hash(i * 3.3) * Math.PI * 2, x = Math.cos(a) * r + 4, z = Math.sin(a) * r * 0.8; pos.set([x, groundH(x, z) + 0.03, z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const sd = new Float32Array(n); for (let i = 0; i < n; i++) sd[i] = hash(i * 9.1); sg.setAttribute('seed', new THREE.Float32BufferAttribute(sd, 1));
  W0.glint = new THREE.Points(sg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, k: { value: 1 }, sunDir: { value: SUN_DIR.clone() }, map: { value: starTex0() } },
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
attribute float seed; uniform float time, k; uniform vec3 sunDir; varying float vA;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
#include <logdepthbuf_vertex>
vec3 vd = normalize(cameraPosition - position); vec3 nrm = normalize(vec3(sin(seed * 91.0), 2.2, cos(seed * 57.0)));
float spec = pow(max(dot(reflect(-sunDir, nrm), vd), 0.0), 60.0); float tw = 0.5 + 0.5 * sin(time * (3.0 + seed * 6.0) + seed * 40.0);
vA = k * clamp(spec * 3.0 * tw + 0.04 * tw, 0.0, 1.4); gl_PointSize = clamp(260.0 / -mv.z, 1.5, 9.0) * (0.6 + seed); }`,
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D map; varying float vA; void main(){
#include <logdepthbuf_fragment>
vec4 c = texture2D(map, gl_PointCoord); if (vA * c.a < 0.01) discard; gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * vA * c.a * 2.0, vA * c.a); }` }));
  W0.glint.frustumCulled = false; Z.add(W0.glint);
  // pinos lejanos (conos oscuros) para dar escala
  const tm = new THREE.MeshStandardMaterial({ color: 0x2a3a36, roughness: 0.9 }), cone = new THREE.ConeGeometry(1, 3.2, 7); cone.translate(0, 1.6, 0);
  const trees = new THREE.InstancedMesh(cone, tm, 140); let ti = 0; const M = new THREE.Matrix4();
  for (let i = 0; ti < 140 && i < 3000; i++) { const x = (hash(i * 4.1) - 0.5) * 300, z = -55 - hash(i * 7.7) * 130; const s = 0.9 + hash(i * 2.3) * 1.5; M.compose(v3(x, groundH(x, z) - 0.2, z), new THREE.Quaternion(), v3(s * 0.8, s, s * 0.8)); trees.setMatrixAt(ti++, M); }
  trees.count = ti; trees.castShadow = true; Z.add(trees); W0.trees = trees;
  // balizas a los lados de la pista: con luz plana se siguen viendo; lo que desaparece es el relieve
  const pm = paint(0x1c1f24, 0.5, 0.3), pb = paint(0xd8262a, 0.4, 0.3); W0.poles = new THREE.Group(); Z.add(W0.poles);
  for (let i = 0; i < 16; i++) { const side = i % 2 ? 1 : -1, x = 8 + Math.floor(i / 2) * 6.2 + (side > 0 ? 3.1 : 0), z = -1.5 + side * 6.4, y = groundH(x, z) - 0.05;
    const a = cyl(0.028, 0.028, 1.55, pm, 8); a.position.set(x, y + 0.775, z); W0.poles.add(a);
    const b = cyl(0.031, 0.031, 0.38, pb, 8); b.position.set(x, y + 1.36, z); W0.poles.add(b); }
  scene.fog = new THREE.FogExp2(0xd6e4f4, 0.0017); W0.fogC = new THREE.Color(0xd6e4f4);
  // copos y polvo de nieve en el aire (dejan estela cuando la cámara se mueve)
  S.flow = [flowCloud(2600, i => { const r = 16 * Math.cbrt(hash(i * 1.13)), a = hash(i * 2.21) * Math.PI * 2; return [Math.cos(a) * r + 2.5, 0.2 + hash(i * 3.37) * 9, Math.sin(a) * r * 0.9]; }, { size: 1.1, bright: 0.16, col: 0xeef4ff, drift: 0.06, seed: 3 })];
}
function buildLights() {
  W0.hemi = new THREE.HemisphereLight(0xbfd8ff, 0xf3f6fb, 0.8); scene.add(W0.hemi);
  W0.sunL = new THREE.DirectionalLight(0xfff1dc, 3.0); W0.sunL.castShadow = true; W0.sunL.shadow.mapSize.set(2048, 2048);
  const sc = W0.sunL.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 120; W0.sunL.shadow.bias = -0.0004; W0.sunL.shadow.normalBias = 0.02;
  scene.add(W0.sunL); scene.add(W0.sunL.target);
  // día nublado: una luz lateral baja y suave (sin sombras) que modela los baches; fuera de la lente se aplana (uFlat)
  W0.soft = new THREE.DirectionalLight(0xfff3e6, 0); scene.add(W0.soft); scene.add(W0.soft.target);
  // luces de estudio para las gafas desmontadas
  W0.key = new THREE.SpotLight(0xffffff, 0, 6, 0.6, 0.6, 1.2); scene.add(W0.key); scene.add(W0.key.target);
  W0.rim = new THREE.PointLight(0x9fc2ff, 0, 3, 1.5); scene.add(W0.rim);
}
// estado del mundo en cada instante: sol, cielo cubierto (nublado), «espacio» (al subir al sol), oscuridad (estudio)
function worldAt(t, o) {
  const u = W0.sky.material.uniforms; u.over.value = o.over; u.space.value = o.space; u.dark.value = o.dark;
  const over = o.over, lit = (1 - over) * (1 - o.dark);
  W0.sunL.intensity = 2.3 * lit; W0.sunL.position.copy(o.focus).addScaledVector(SUN_DIR, 60); W0.sunL.target.position.copy(o.focus); W0.sunL.target.updateMatrixWorld();
  W0.hemi.intensity = lerp(0.58, 0.6, over) * (1 - o.dark * 0.92);
  W0.soft.intensity = 4.6 * over * (1 - o.dark); W0.soft.position.copy(o.focus).addScaledVector(SOFT_DIR, 50); W0.soft.target.position.copy(o.focus); W0.soft.target.updateMatrixWorld();
  RELIEF.uFlat.value = 0.9 * over * (1 - o.dark);
  W0.hemi.color.setRGB(lerp(0.75, 0.86, over), lerp(0.85, 0.88, over), lerp(1.0, 0.9, over));
  W0.sun.visible = W0.halo.visible = over < 0.95 && o.dark < 0.95;
  W0.sun.material.color.setRGB(1, 0.95, 0.82).multiplyScalar(9 * (1 - over) * (1 - o.dark));
  W0.halo.material.opacity = (1 - over) * (1 - o.dark); W0.halo.quaternion.copy(cam.quaternion); W0.sun.quaternion.copy(cam.quaternion);
  W0.glint.material.uniforms.time.value = t; W0.glint.material.uniforms.k.value = lit;
  scene.fog.density = lerp(0.0017, 0.024, over) * (1 - o.space * 0.9); scene.fog.color.copy(W0.fogC).lerp(new THREE.Color(0xc3c8ce), over).multiplyScalar(1 - o.dark);
  W0.ground.visible = W0.near.visible = W0.trees.visible = W0.poles.visible = o.dark < 0.999;
  scene.background.setRGB(0, 0, 0);
}
// ---------------------------------------------------------------- el esquiador, congelado en plena curva, con la nieve suspendida en el aire
const SK = {};
function skiGeo() {          // perfil de un esquí (largo en z, espátula levantada delante), extruido a lo ancho
  const s = new THREE.Shape(); s.moveTo(-0.8, 0.012); s.lineTo(0.62, 0.012); s.quadraticCurveTo(0.8, 0.014, 0.86, 0.075); s.lineTo(0.855, 0.087); s.quadraticCurveTo(0.78, 0.03, 0.62, 0.0); s.lineTo(-0.8, 0.0); s.quadraticCurveTo(-0.86, 0.004, -0.84, 0.03); s.lineTo(-0.82, 0.03); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.082, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -0.041); g.rotateY(-Math.PI / 2); return g;
}
function buildSkier() {
  const outer = new THREE.Group(), g = new THREE.Group(); outer.add(g); scene.add(outer); SK.outer = outer; SK.g = g;
  const jacket = paint(0xe9ecf0, 0.55, 0.3), pants = paint(0x2a2e36, 0.62, 0.15), white = paint(0xf3f5f8, 0.22, 1), glove = paint(0x15171c, 0.6, 0.1), skiM = paint(0x111318, 0.25, 1), skiTop = paint(0x9aa1ab, 0.3, 1);
  const d = makeDoll(jacket), J = d.userData.J; SK.J = J; g.add(d); d.scale.setScalar(1.66);
  for (const k of ['hpL', 'hpR', 'knL', 'knR']) J[k].traverse(o => { if (o.isMesh) o.material = pants; });
  J.hip.children.forEach(o => { if (o.isMesh) o.material = pants; });
  for (const k of ['hL', 'hR']) J[k].traverse(o => { if (o.isMesh) o.material = glove; });
  J.head.material = new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.8 });        // braga y cara tapada
  // casco y gafas
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.086, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.46), white); helmet.position.set(0, 0.1, -0.008); helmet.scale.set(1.0, 1.05, 1.08); helmet.castShadow = true; J.neck.add(helmet);
  const gog = buildGoggles(0.6, 'mini'); gog.position.set(0, 0.086, 0.084); J.neck.add(gog); SK.gog = gog;
  // pose: rodillas flexionadas, cadera atrás, tronco adelantado, brazos delante con los bastones
  const PO = Object.assign({ hy: 0.36, hx: -0.2, hz: 0.12, cx: 0.62, cz: -0.38, cy: -0.25, nx: -0.5, nz: 0.22, hpL: -1.18, knL: 1.5, hpR: -0.9, knR: 1.22, hpLz: 0.26, hpRz: 0.2, lean: -0.5, yaw: 0.2 }, window.POSE || {});
  SK.PO = PO;
  J.hip.position.y = PO.hy; J.hip.rotation.x = PO.hx; J.hip.rotation.z = PO.hz;
  J.chest.rotation.x = PO.cx; J.chest.rotation.z = PO.cz; J.chest.rotation.y = PO.cy; J.neck.rotation.x = PO.nx; J.neck.rotation.z = PO.nz;
  J.hpL.rotation.x = PO.hpL; J.knL.rotation.x = PO.knL; J.hpR.rotation.x = PO.hpR; J.knR.rotation.x = PO.knR;
  J.hpL.rotation.z = PO.hpLz; J.hpR.rotation.z = PO.hpRz;
  J.shL.rotation.x = -0.9; J.shL.rotation.z = -0.62; J.elL.rotation.x = -0.6; J.shR.rotation.x = -1.05; J.shR.rotation.z = 0.35; J.elR.rotation.x = -0.75;
  g.updateMatrixWorld(true);
  // con la inclinación (giro en z) la pierna de dentro de la curva se flexiona lo justo para que los dos esquís pisen la nieve
  const sl = Math.sin(PO.lean), cl = Math.cos(PO.lean), tilt = p => p.x * sl + p.y * cl;
  const feet = () => { g.updateMatrixWorld(true); return ['knL', 'knR'].map(k => { const f = J[k].localToWorld(v3(0, -0.24, 0)); g.worldToLocal(f); return f; }); };
  { const inn = PO.lean >= 0 ? 'L' : 'R', hp0 = J['hp' + inn].rotation.x, kn0 = J['kn' + inn].rotation.x; let a = 0.2, b = 2.6;
    for (let it = 0; it < 40; it++) { const m = (a + b) / 2; J['hp' + inn].rotation.x = hp0 * m; J['kn' + inn].rotation.x = Math.min(2.4, kn0 * m); const [fL, fR] = feet(); const dIn = inn === 'L' ? tilt(fL) - tilt(fR) : tilt(fR) - tilt(fL); if (dIn < 0) a = m; else b = m; } }
  // esquís bajo los pies, de canto
  const sg = skiGeo(); SK.skis = []; const FT = feet(); let hS = 0;
  for (const [i, k] of ['knL', 'knR'].entries()) {
    const foot = FT[i];
    const ski = new THREE.Mesh(sg, skiM); ski.position.set(foot.x, foot.y - 0.13, foot.z + 0.08); ski.castShadow = true; g.add(ski); hS += tilt(ski.position) / 2;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.004, 1.2), skiTop); top.position.set(0, 0.014, -0.02); ski.add(top);
    const boot = rbox(0.1, 0.14, 0.24, paint(0x2a2e36, 0.3, 1), 0.03); boot.position.set(0, 0.075, 0); ski.add(boot);
    SK.skis.push(ski);
  }
  // bastones
  for (const [k, sd] of [['hL', -1], ['hR', 1]]) {
    const hand = J[k].localToWorld(v3(0, 0, 0)); g.worldToLocal(hand);
    const tip = v3(hand.x + sd * 0.28, 0.0, hand.z - 0.55); tip.y = (hS - tip.x * sl) / cl;     // la punta del bastón en la nieve
    g.add(bar(hand, tip, 0.008, metal(0xc9ced6, 0.25), 8));
    const bk = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 6, 16), paint(0x111318, 0.4, 0.5)); bk.position.copy(tip).lerp(hand, 0.08); bk.rotation.x = Math.PI / 2; g.add(bk);
  }
  // inclinación hacia dentro de la curva y dirección de la bajada (+x)
  g.rotation.z = PO.lean; g.rotation.y = PO.yaw; outer.rotation.y = Math.PI / 2;
  outer.position.set(0, groundH(0, 0) - 0.02 - hS, 0); SK.hS = hS; SK.tilt = tilt;
  // la nieve que levantan los cantos: congelada en el aire (tiempo detenido)
  // sale del canto del esquí de fuera, hacia atrás y hacia arriba (hacia el sol: a contraluz la nieve brilla)
  const N = 5200, P = new Float32Array(N * 3), V = [], so = PO.lean >= 0 ? 1 : -1, skO = SK.skis[so > 0 ? 1 : 0].position;
  for (let i = 0; i < N; i++) {
    const s = hash(i * 1.37), u = hash(i * 2.11), w = hash(i * 3.97), along = (u - 0.6) * 1.1;
    const o = v3(skO.x + so * (0.05 + s * 0.06), 0, skO.z + along); o.y = (hS + 0.03 - o.x * sl) / cl;
    const vo = (-0.35 + w * 0.6) * so, vu = 1.6 + Math.pow(hash(i * 5.3), 0.8) * 3.4, vb = 1.0 + hash(i * 6.1) * 3.2;
    const vel = v3(vo * cl + vu * sl, -vo * sl + vu * cl, -vb + (hash(i * 7.9) - 0.5) * 0.8);   // fuera + arriba (del mundo) en el marco inclinado; atrás = −z
    V.push([o, vel, 0.12 + Math.pow(hash(i * 8.7), 1.2) * 0.85]);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  const sz = new Float32Array(N); for (let i = 0; i < N; i++) sz[i] = 0.5 + Math.pow(hash(i * 4.4), 3) * 2.6; geo.setAttribute('sz', new THREE.Float32BufferAttribute(sz, 1));
  SK.spray = new THREE.Points(geo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { map: { value: starTex0() }, k: { value: 1 }, sunDir: { value: SUN_DIR.clone() } },
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
attribute float sz; uniform float k; uniform vec3 sunDir; varying float vA, vG; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vec4 mv = viewMatrix * wp; gl_Position = projectionMatrix * mv;
#include <logdepthbuf_vertex>
vA = k; vG = 1.0 + 2.6 * pow(max(dot(normalize(wp.xyz - cameraPosition), sunDir), 0.0), 4.0); gl_PointSize = clamp(sz * 18.0 / -mv.z, 1.0, 11.0); }`,
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D map; varying float vA, vG; void main(){
#include <logdepthbuf_fragment>
float a = texture2D(map, gl_PointCoord).a * vA; if (a < 0.01) discard; gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * 1.15 * vG, a * 0.85); }` }));
  SK.spray.frustumCulled = false; SK.spray.userData.V = V; g.add(SK.spray);
}
// tiempo de la escena del esquiador: casi parado (cámara lenta extrema) para que la nieve flote
function skierAt(t, vis) {
  SK.outer.visible = vis > 0.001; if (!SK.outer.visible) return;
  const tau0 = 0.46 + (((t % END) + END) % END) * 0.0025, A = SK.spray.geometry.attributes.position.array, V = SK.spray.userData.V;
  const sl = Math.sin(SK.PO.lean), cl = Math.cos(SK.PO.lean), hS = SK.hS;
  for (let i = 0; i < V.length; i++) { const [o, v, life] = V[i], tt = Math.min(life, tau0 * (0.35 + hash(i) * 1.1)), x = o.x + v.x * tt - 4.9 * sl * tt * tt; let y = o.y + v.y * tt - 4.9 * cl * tt * tt; const h = x * sl + y * cl; if (h < hS) y += (hS - h) / cl;
    A[i * 3] = x; A[i * 3 + 1] = y; A[i * 3 + 2] = o.z + v.z * tt; }
  SK.spray.geometry.attributes.position.needsUpdate = true;
}
// ---------------------------------------------------------------- las gafas: montura, espuma, cinta y la lente por capas (espejo, lente con color y filtro UV,
// filtro polarizado, cámara de aire y lente interior antivaho). Medidas reales (≈ 19 × 10 cm) curvadas como una lente tórica.
const GW = 0.19, GH = 0.098, GRC = 0.125, GRV = 0.42;          // ancho, alto, radio de curvatura horizontal y vertical
function lensShape(off = 0) {                                   // silueta frontal con el hueco de la nariz (off: crece hacia fuera)
  const w = GW / 2 + off, h = GH / 2 + off, s = new THREE.Shape();
  s.moveTo(0, h * 0.98);
  s.bezierCurveTo(w * 0.55, h * 1.02, w * 0.98, h * 0.86, w, h * 0.22);
  s.bezierCurveTo(w * 1.01, -h * 0.35, w * 0.86, -h * 0.98, w * 0.5, -h * 0.98);
  s.bezierCurveTo(w * 0.3, -h * 0.98, w * 0.2, -h * 0.95, w * 0.14 - off * 0.3, -h * 0.62);
  s.bezierCurveTo(w * 0.09 - off * 0.3, -h * 0.28 + off, -w * 0.09 + off * 0.3, -h * 0.28 + off, -w * 0.14 + off * 0.3, -h * 0.62);
  s.bezierCurveTo(-w * 0.2, -h * 0.95, -w * 0.3, -h * 0.98, -w * 0.5, -h * 0.98);
  s.bezierCurveTo(-w * 0.86, -h * 0.98, -w * 1.01, -h * 0.35, -w, h * 0.22);
  s.bezierCurveTo(-w * 0.98, h * 0.86, -w * 0.55, h * 1.02, 0, h * 0.98);
  return s;
}
// curva una geometría plana (x, y; z = grosor hacia atrás) sobre la lente tórica: la cara mira hacia +z
function bendGeo(g, back = 0) {
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), R = GRC + z - back, a = x / GRC;
    P.setXYZ(i, Math.sin(a) * R, y, Math.cos(a) * R - GRC - (y * y) / (2 * GRV));
  }
  g.computeVertexNormals(); return g;
}
function lensGeo(back = 0, seg = 40) { const g = new THREE.ShapeGeometry(lensShape(0), seg); const P = g.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, 0); return bendGeo(g, back); }
// textura de la rejilla del filtro polarizado (líneas verticales finas)
let _polT = null;
function polTex() { return _polT || (_polT = canvasTex(512, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let x = 0; x < w; x += 6) { g.fillStyle = 'rgba(30,40,60,.85)'; g.fillRect(x, 0, 2, h); } })); }
function uvFromXY(g) { const P = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / GW + 0.5, P.getY(i) / GH + 0.5); }
// colores de lente: espejo (metal + iridiscencia) o tintada (transparente)
const LENS = {
  orangeMirror: { col: 0xff7410, metal: 0.82, op: 0.97, irid: 0.28 }, silver: { col: 0xc9d1dc, metal: 1, op: 0.97, irid: 0.35 },
  gray: { col: 0x3a3f46, metal: 0.2, op: 0.82, irid: 0 }, blueMirror: { col: 0x3d7dff, metal: 0.9, op: 0.95, irid: 0.8 },
  orange: { col: 0xff7a1a, metal: 0, op: 0.62, irid: 0 }, yellow: { col: 0xffd21a, metal: 0, op: 0.55, irid: 0 }, rose: { col: 0xff6f9a, metal: 0, op: 0.58, irid: 0 }, clear: { col: 0xdfe8f2, metal: 0, op: 0.25, irid: 0 },
};
function lensMat() { return new THREE.MeshPhysicalMaterial({ color: 0xff7410, metalness: 0.82, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.28, iridescenceIOR: 1.6, iridescenceThicknessRange: [300, 520], emissive: 0xff5a00, emissiveIntensity: 0.18, transparent: true, opacity: 0.97, envMapIntensity: 1.7, side: THREE.DoubleSide, depthWrite: false }); }
function setLens(m, a, b, k = 0) {     // mezcla de dos presets
  const A = LENS[a], B = LENS[b || a]; m.color.setHex(A.col).lerp(_c.setHex(B.col), k);
  m.metalness = lerp(A.metal, B.metal, k); m.opacity = lerp(A.op, B.op, k); m.iridescence = lerp(A.irid, B.irid, k); m.needsUpdate = false;
  if (m.emissive) { const ea = /orange/i.test(a) ? 0.18 : 0, eb = /orange/i.test(b || a) ? 0.18 : 0; m.emissive.copy(m.color); m.emissiveIntensity = lerp(ea, eb, k); }
}
function buildGoggles(scale = 1, mode = 'hero') {
  const g = new THREE.Group(), L = {}; g.userData.L = L;
  const frameM = paint(0x16181d, 0.45, 0.6), foamM = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.95 }), strapM = paint(0x15171c, 0.6, 0.2), stripeM = paint(0xff7a12, 0.45, 0.4);
  // montura: anillo (silueta un poco más grande con el hueco de la lente) extruido y curvado
  const ring = lensShape(0.0105); ring.holes.push(new THREE.Path(lensShape(-0.002).getPoints(80).reverse()));
  const fg = new THREE.ExtrudeGeometry(ring, { depth: 0.026, bevelEnabled: true, bevelSize: 0.0025, bevelThickness: 0.0025, bevelSegments: 2, curveSegments: 40 });
  fg.translate(0, 0, -0.026); bendGeo(fg, -0.0015); L.frame = new THREE.Mesh(fg, frameM); L.frame.castShadow = true; g.add(L.frame);
  // espuma (detrás de la montura)
  const foam = new THREE.ExtrudeGeometry(ring, { depth: 0.014, bevelEnabled: false, curveSegments: 40 }); foam.translate(0, 0, -0.04); bendGeo(foam, 0);
  L.foam = new THREE.Mesh(foam, foamM); g.add(L.foam);
  // rejillas de ventilación arriba
  L.vents = new THREE.Group(); g.add(L.vents);
  for (let i = -5; i <= 5; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.003, 0.012), strapM); const x = i * 0.015, a = x / GRC; v.position.set(Math.sin(a) * (GRC + 0.002), GH / 2 + 0.0085 - Math.abs(i) * 0.0006, Math.cos(a) * (GRC + 0.002) - GRC - 0.012); v.rotation.y = a; L.vents.add(v); }
  // cinta
  const strap = new THREE.Group(); g.add(strap); L.strap = strap;
  const ribbon = (side) => {
    const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24, a = (GW / 2 + 0.008) / GRC + u * 1.9; pts.push(v3(side * Math.sin(a) * (GRC + 0.02 + u * 0.03), 0, Math.cos(a) * (GRC + 0.02 + u * 0.03) - GRC - 0.02)); }
    const pos = [], idx = []; const w = 0.042;
    pts.forEach((p, i) => { pos.push(p.x, -w / 2, p.z, p.x, w / 2, p.z); if (i) { const b = (i - 1) * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); } });
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setIndex(idx); gg.computeVertexNormals();
    const m = new THREE.Mesh(gg, strapM.clone()); m.material.side = THREE.DoubleSide; strap.add(m);
    const st = new THREE.Mesh(gg.clone().scale(1.002, 0.25, 1.002), stripeM); st.material.side = THREE.DoubleSide; strap.add(st);
  };
  ribbon(1); ribbon(-1);
  // la lente por capas (de fuera hacia dentro): 0 espejo · 1 lente con color + filtro UV · 2 filtro polarizado · 3 lente interior antivaho
  const mk = (back, mat) => { const geo = lensGeo(back); uvFromXY(geo); const m = new THREE.Mesh(geo, mat); m.renderOrder = 6; return m; };
  L.mirror = mk(0.002, lensMat()); g.add(L.mirror);
  if (mode === 'hero') {
    L.tint = mk(0.006, new THREE.MeshPhysicalMaterial({ color: 0xff7a1a, metalness: 0, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1 })); g.add(L.tint);
    L.pol = mk(0.008, new THREE.MeshBasicMaterial({ map: polTex(), color: 0xffffff, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false })); g.add(L.pol);
    L.inner = mk(0.012, new THREE.MeshPhysicalMaterial({ color: 0xe9f2fb, metalness: 0, roughness: 0.03, clearcoat: 1, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.2 })); g.add(L.inner);
    // aristas de cada capa (estilo despiece técnico), invisibles hasta que se desmonta
    const BK = { mirror: 0.002, tint: 0.006, pol: 0.008, inner: 0.012 };
    for (const k in BK) { const R = GRC - BK[k]; const pts = lensShape(0).getPoints(90).map(p => { const a = p.x / GRC; return v3(Math.sin(a) * R, p.y, Math.cos(a) * R - GRC - (p.y * p.y) / (2 * GRV)); });
      const l = drawLine(pts, 0xe6ecf2, 1.6, 0); L[k].add(l); L[k].userData.edge = l; L[k].userData.back = BK[k]; }
    // vaho: gotitas en la cara interior de la lente interior
    const n = 420, dg = new THREE.SphereGeometry(1, 8, 6), dm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, transmission: 0, transparent: true, opacity: 0.65, clearcoat: 1 });
    const drops = new THREE.InstancedMesh(dg, dm, n); const M = new THREE.Matrix4(); let c = 0; const sh = lensShape(-0.006), pts2 = sh.getPoints(60);
    const inside = (x, y) => { let ins = false; for (let i = 0, j = pts2.length - 1; i < pts2.length; j = i++) { const a = pts2[i], b = pts2[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) ins = !ins; } return ins; };
    for (let i = 0; c < n && i < 6000; i++) { const x = (hash(i * 1.3) - 0.5) * GW, y = (hash(i * 2.7) - 0.5) * GH; if (!inside(x, y)) continue; const a = x / GRC, R = GRC - 0.0135, s = 0.0007 + hash(i * 5.1) * 0.0016;
      M.compose(v3(Math.sin(a) * R, y, Math.cos(a) * R - GRC - (y * y) / (2 * GRV)), new THREE.Quaternion(), v3(s, s, s * 0.5)); drops.setMatrixAt(c++, M); }
    drops.count = c; drops.userData.n = c; L.drops = drops; L.inner.add(drops);
  }
  g.scale.setScalar(scale); return g;
}
// ---------------------------------------------------------------- la luz: rayos del sol, el espectro (colores + ultravioleta), el rebote en la nieve,
// el ojo, las ondas (luz que vibra en todas direcciones / reflejo que vibra en horizontal) y la rejilla del filtro polarizado
const LI = {};
const SPEC = [0xff3b3b, 0xff8a1f, 0xffd31a, 0x3ddc5a, 0x22c6e8, 0x3d6dff, 0x8b4dff];      // rojo → violeta
const UVC = 0xb98cff;
// rayo: línea gruesa que se dibuja de A a B (drawK) con un pulso de luz que viaja por ella
function beam(pts, color, width = 3, dashed = false) {
  const m = lineMat(color, width, 1, dashed); if (dashed) { m.dashSize = 0.06; m.gapSize = 0.05; m.dashScale = 1; }
  const l = polyline(pts, m); l.userData.nseg = pts.length - 1; l.frustumCulled = false; l.userData.pts = pts; return l;
}
// pulsos: puntos de luz que viajan por los rayos ya dibujados (en el sentido de la luz)
const PULSES = [];
function pulseOn(l, color, n = 2, speed = 0.6) { for (let i = 0; i < n; i++) PULSES.push({ l, c: new THREE.Color(color).multiplyScalar(3.2), ph: i / n + hash(PULSES.length * 3.7) * 0.3, speed }); }
function buildPulses() { LI.pulse = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), Math.max(1, PULSES.length)); LI.pulse.frustumCulled = false; scene.add(LI.pulse); PULSES.forEach((p, i) => LI.pulse.setColorAt(i, p.c)); }
function pulsesAt(t) {
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(); let n = 0;
  for (const p of PULSES) { const l = p.l, k = l.userData.k || 0; if (!l.visible || k < 0.05) continue; let o = l; let vis = true; while (o) { if (!o.visible) { vis = false; break; } o = o.parent; } if (!vis) continue;
    const pts = l.userData.pts, u = ((t * p.speed + p.ph) % 1) * k, f = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), w = l.localToWorld(pts[i].clone().lerp(pts[i + 1], f - i));
    const d = w.distanceTo(cam.position), s = Math.max(0.012, d * 0.0075); M.compose(w, Q, v3(s, s, s)); LI.pulse.setMatrixAt(n, M); LI.pulse.setColorAt(n, p.c); n++; }
  LI.pulse.count = n; LI.pulse.instanceMatrix.needsUpdate = true; if (LI.pulse.instanceColor) LI.pulse.instanceColor.needsUpdate = true;
}
function segPts(a, b, n = 24) { const p = []; for (let i = 0; i <= n; i++) p.push(a.clone().lerp(b, i / n)); return p; }
function buildLight() {
  const Z = new THREE.Group(); scene.add(Z); LI.Z = Z;
  // 1) del cielo y del suelo: rayos del sol que bajan al esquiador y rayos que rebotan en la nieve hacia sus gafas
  const G = wpos(SK.gog);                                 // gafas del esquiador
  LI.sky = []; LI.ground = [];
  for (let i = 0; i < 5; i++) { const off = v3((i - 2) * 0.16, (hash(i * 3.1) - 0.5) * 0.2, (hash(i * 5.7) - 0.5) * 0.3); const a = G.clone().add(off).addScaledVector(SUN_DIR, 22), b = G.clone().add(off.clone().multiplyScalar(0.25));
    const l = beam(segPts(a, b, 40), 0xffb22e, 6); Z.add(l); LI.sky.push(l); pulseOn(l, 0xffd27a, 2, 0.5); }
  for (let i = 0; i < 5; i++) { const gp = v3(G.x + 1.3 + i * 0.32, 0, G.z - 0.3 + (i - 2) * 0.42); gp.y = groundH(gp.x, gp.z) + 0.02; const a = gp.clone().addScaledVector(SUN_DIR, 18);
    const l1 = beam(segPts(a, gp, 30), 0xffb22e, 5.5), l2 = beam(segPts(gp, G.clone().add(v3(0, -0.02, (i - 2) * 0.03)), 24), 0xff8a1f, 5.5); Z.add(l1, l2); LI.ground.push([l1, l2, gp]); pulseOn(l1, 0xffd27a, 1, 0.6); pulseOn(l2, 0xffa040, 1, 0.8); }
  // 2) el espectro: el rayo blanco del sol atraviesa un cristal de hielo y se abre en colores; la ultravioleta va aparte (no se ve: discontinua)
  const C = v3(-3.5, 9.5, -5.0); LI.prismC = C;
  const prism = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 6), new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, metalness: 0, roughness: 0.02, transmission: 0, transparent: true, opacity: 0.45, clearcoat: 1, envMapIntensity: 2, side: THREE.DoubleSide, depthWrite: false }));
  prism.position.copy(C); prism.rotation.set(0.4, 0.3, 1.2); edges(prism, 0xdff0ff, 1.8, 20, 0.9); Z.add(prism); LI.prism = prism;
  const inA = C.clone().addScaledVector(SUN_DIR, 60); LI.white = beam(segPts(inA, C, 40), 0xfff6e0, 8); Z.add(LI.white); pulseOn(LI.white, 0xffffff, 3, 0.4);
  LI.spec = []; const land = v3(2.6, 0, 1.2);
  const dirs = [];
  for (let i = 0; i < 8; i++) {           // 0..6 colores, 7 = ultravioleta (más desviada que el violeta)
    const f = i / 7, end = land.clone().add(v3(lerp(-2.6, 2.4, f), 0, lerp(1.6, -1.6, f))); end.y = groundH(end.x, end.z) + 0.03;
    const l = beam(segPts(C, end, 40), i < 7 ? SPEC[i] : UVC, i < 7 ? 5 : 4.5, i === 7); Z.add(l); LI.spec.push(l); dirs.push(end); pulseOn(l, i < 7 ? SPEC[i] : UVC, 1, 0.45);
  }
  LI.landPts = dirs;
  // rebote en la nieve: la ultravioleta vuelve hacia arriba (8 de cada 10 rayos discontinuos)
  LI.eye = buildEye(); LI.eye.position.set(3.4, 2.75, 2.0); LI.eye.lookAt(v3(3.9, 0, 2.6)); LI.eye.scale.setScalar(0.55); Z.add(LI.eye);
  LI.uvUp = [];
  for (let i = 0; i < 10; i++) { const gp = v3(2.9 + (i % 5) * 0.28, 0, 1.75 + Math.floor(i / 5) * 0.5); gp.y = groundH(gp.x, gp.z) + 0.03;
    const down = beam(segPts(gp.clone().addScaledVector(SUN_DIR, 9), gp, 24), UVC, 4.2, true), up = beam(segPts(gp, LI.eye.position.clone().add(v3((hash(i) - 0.5) * 0.12, (hash(i * 2) - 0.5) * 0.12, 0)), 24), UVC, 4.2, true);
    Z.add(down, up); LI.uvUp.push([down, up, i < 8]); pulseOn(down, UVC, 1, 0.7); if (i < 8) pulseOn(up, UVC, 1, 0.7); }
  // 3) ondas: la luz vibra en todas direcciones; el reflejo del hielo, en horizontal
  LI.waves = []; for (let i = 0; i < 6; i++) { const l = drawLine(segPts(v3(), v3(1, 0, 0), 140), i === 0 ? 0xfff0c8 : 0xffe2a8, 3.2, 1); Z.add(l); LI.waves.push(l); }
  // 4) haz de 100 «fotones» para la categoría 3 (pasan 18)
  LI.ph = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.8).multiplyScalar(3), toneMapped: false }), 100);
  LI.ph.frustumCulled = false; Z.add(LI.ph);
}
// ojo: esclerótica, iris, pupila y córnea (que se enrojece con la ultravioleta)
function buildEye() {
  const g = new THREE.Group();
  const irisT = canvasTex(256, 256, (c, w, h) => { const r = c.createRadialGradient(128, 128, 20, 128, 128, 128); r.addColorStop(0, '#0a0a0a'); r.addColorStop(0.28, '#0a0a0a'); r.addColorStop(0.3, '#2d6a8f'); r.addColorStop(0.75, '#5fa7c9'); r.addColorStop(0.95, '#1d3c55'); r.addColorStop(1, '#0d1a24'); c.fillStyle = r; c.fillRect(0, 0, w, h);
    c.globalAlpha = 0.35; for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2; c.strokeStyle = i % 2 ? '#9fd4ea' : '#16384f'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(128 + Math.cos(a) * 40, 128 + Math.sin(a) * 40); c.lineTo(128 + Math.cos(a) * 120, 128 + Math.sin(a) * 120); c.stroke(); } });
  const scl = new THREE.MeshPhysicalMaterial({ color: 0xf4efe9, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05 });
  g.add(sph(0.5, scl, 48, 32));
  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 24, 0, Math.PI * 2, 0, 0.55), new THREE.MeshStandardMaterial({ map: irisT, roughness: 0.4 })); iris.rotation.x = Math.PI / 2; iris.scale.setScalar(1.004); g.add(iris);
  const cornea = new THREE.Mesh(new THREE.SphereGeometry(0.26, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.25, clearcoat: 1, emissive: 0xff2a1a, emissiveIntensity: 0, depthWrite: false }));
  cornea.rotation.x = Math.PI / 2; cornea.position.z = 0.33; g.add(cornea); g.userData.cornea = cornea;
  const burn = new THREE.Mesh(new THREE.SphereGeometry(0.505, 48, 32), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); g.add(burn); g.userData.burn = burn;
  return g;
}
// onda: de A a B, vibrando en la dirección u, con amplitud amp y fase
function setWave(l, A, B, u, amp, ph, k = 1, cut = 1) {
  const n = 140, pos = [], d = B.clone().sub(A);
  for (let i = 0; i <= n; i++) { const f = i / n, a = (f <= cut ? amp : amp * Math.max(0, 1 - (f - cut) * 60)); const p = A.clone().addScaledVector(d, f).addScaledVector(u, Math.sin(f * 26 - ph) * a); pos.push(p.x, p.y, p.z); }
  l.geometry.setPositions(pos); drawK(l, k);
}
// ---------------------------------------------------------------- lo que pasa en cada instante: cielo, rayos, espectro, ojo, gafas desmontadas, ondas, vaho, fotones y colores
const HP = {};                     // gafas grandes (las del despiece) y las de espejo del duelo final
const EYE_P = v3(3.4, 2.75, 2.0), SNOW_HIT = v3(3.4, 0, 2.0);
const F10 = v3(1.9, 0.15, 1.3).normalize();
const P2G = v3(4.2, 1.3, -1.4), F2G = v3(1, -0.2, -0.05).normalize();      // gafas en la bajada nublada (posición y frente)
const qFacing = F => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(F, v3(0, 0, 0), v3(0, 1, 0)));
let Q_DOWN, Q_10;
let HG_P, HG_F, HG_Q;              // posición, frente (hacia la nieve) y orientación de las gafas grandes
const EXP = { mirror: 0.1, tint: 0.042, pol: -0.018, inner: -0.075, frame: -0.135 };    // despiece (en metros a tamaño real)
function buildProps() {
  HG_F = v3(0, -1, 0); HG_P = EYE_P.clone().addScaledVector(HG_F, 1.0);
  { const z = v3(0, -1, 0), x = v3(0.47, 0, -0.88).normalize(), y = z.clone().cross(x); Q_DOWN = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); }
  Q_10 = qFacing(F10);
  const hero = buildGoggles(4, 'hero'); hero.position.copy(HG_P); hero.quaternion.copy(Q_DOWN); scene.add(hero); HP.hero = hero; HG_Q = Q_DOWN.clone();
  HP.L = hero.userData.L; HP.L.frameG = new THREE.Group(); for (const o of [HP.L.frame, HP.L.foam, HP.L.strap, HP.L.vents]) { hero.remove(o); HP.L.frameG.add(o); } hero.add(HP.L.frameG);
  const duel = buildGoggles(4, 'mini'); scene.add(duel); HP.duel = duel; setLens(duel.userData.L.mirror.material, 'blueMirror');
  // rayos del despiece (en coordenadas de las gafas: entran por +z y van hacia el ojo, −z)
  HP.rays = []; const RZ0 = 0.3, RZ1 = -0.22;
  for (let i = 0; i < 12; i++) {
    const x = (hash(i * 3.3) - 0.5) * 0.12, y = (hash(i * 5.1) - 0.5) * 0.05, kind = i < 3 ? 'ref' : i < 6 ? 'uv' : i < 8 ? 'pol' : 'ok';
    const col = kind === 'uv' ? UVC : 0xffd98a, a = v3(x, y, RZ0), b = v3(x, y, RZ1);
    const l = beam(segPts(a, b, 60), col, kind === 'uv' ? 4.2 : 4.6, kind === 'uv'); hero.add(l); pulseOn(l, kind === 'uv' ? UVC : 0xffe6a8, 2, 0.55);
    let rb = null; if (kind === 'ref') { rb = beam(segPts(v3(x, y, EXP.mirror), v3(x + 0.09, y + 0.05, RZ0 + 0.08), 30), 0xffb24a, 4.2); hero.add(rb); pulseOn(rb, 0xffc070, 1, 0.7); }
    HP.rays.push({ l, rb, kind, x, y });
  }
  // marcadores de impacto (pequeños destellos donde se para la luz)
  HP.hits = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: starTex0(), color: new THREE.Color(1, 0.7, 1).multiplyScalar(2.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), 12);
  HP.hits.frustumCulled = false; scene.add(HP.hits);
  // silueta de la lente para la máscara (lo que se ve a través de ella)
  HP.mask = new THREE.Mesh(lensGeo(0.002), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, depthTest: false, depthWrite: false })); HP.mask.matrixAutoUpdate = false; maskScene.add(HP.mask);
}
// estado de la cámara de aire, colores, etc. según el tiempo
function heroPose(t) {     // despiece vertical bajo el ojo (mirando a la nieve) → de frente a la cámara (sol) → bajada nublada → de frente (duelo)
  const p = HG_P.clone(), q = Q_DOWN.clone();
  q.slerp(Q_10, eio(win(t, K.color10 - 0.3, 1.1)));
  const toSlope = win(t, K.dias11 - 0.6, 1.0);        // y se quedan en la pista para el duelo final
  if (toSlope > 0) { p.lerp(P2G, eio(toSlope)); q.slerp(qFacing(F2G), eio(toSlope)); }
  return { p, q };
}
function propsAt(t) {
  NOW = t;
  // ---- mundo: «espacio» al subir al sol, estudio oscuro en el despiece, nublado en el día de niebla
  const space = 0.55 * win(t, K.luz3 - 0.4, 1.2) * (1 - win(t, K.nieve4 - 0.3, 0.9));
  const dark = win(t, K.vamos5 - 0.1, 0.9) * (1 - win(t, K.color10 - 0.3, 1.0));
  const over = win(t, K.dias11 - 0.5, 1.3) * (1 - win(t, K.moda12, 1.4));
  worldAt(t, { space, dark, over, focus: t < K.color10 ? v3(0, 0, 0) : HG_P });
  skierAt(t, dark < 0.99 ? 1 : 0);
  // ---- L1: rayos del cielo y del suelo hacia las gafas del esquiador
  const sg = wpos(SK.gog);
  LI.sky.forEach((l, i) => { const k = win(t, K.cielo1 - 0.35 + i * 0.05, 0.55) * (1 - win(t, K.porque2 + 0.4, 0.5)); drawK(l, k); l.material.opacity = 1; });
  LI.ground.forEach(([l1, l2], i) => { const k = win(t, K.suelo1 - 0.45 + i * 0.05, 0.45), k2 = win(t, K.suelo1 - 0.05 + i * 0.05, 0.4), out = 1 - win(t, K.porque2 + 0.4, 0.5); drawK(l1, k * out); drawK(l2, k2 * out); });
  // ---- L2: la lente de las gafas del esquiador: naranja → espejo
  { const k = win(t, K.espejo2 - 0.15, 0.35) * (1 - win(t, K.final2, 0.6)); setLens(SK.gog.userData.L.mirror.material, 'orangeMirror', 'blueMirror', k); }
  // ---- L3: rayo blanco → cristal de hielo → colores; la ultravioleta aparte
  { const k0 = win(t, K.luz3 - 0.2, 0.7), out = 1 - win(t, K.ojos4 - 0.2, 0.6); drawK(LI.white, k0 * out); LI.prism.visible = k0 * out > 0.01; setOp(LI.prism, k0 * out);
    LI.spec.forEach((l, i) => { const k = i < 7 ? win(t, K.colores3 - 0.35 + i * 0.05, 0.6) : win(t, K.ultra3 - 0.25, 0.5); drawK(l, k * out); }); }
  // ---- L4: la nieve devuelve la ultravioleta (8 de cada 10 rayos) y llega al ojo, que se quema
  LI.uvUp.forEach(([d, u, back], i) => { const k = win(t, K.nieve4 - 0.3 + i * 0.03, 0.4), k2 = back ? win(t, K.devuelve4 - 0.1 + i * 0.04, 0.45) : 0, out = 1 - win(t, K.vamos5, 0.5); drawK(d, k * out); drawK(u, k2 * out); });
  { const k = win(t, K.nieve4 - 0.6, 0.6) * (1 - win(t, K.color10 - 0.6, 0.8)); LI.eye.visible = k > 0.01; show(LI.eye, Math.max(0.0001, k) * 0.55);
    const burn = win(t, K.quema4 - 0.1, 0.6) * (1 - win(t, K.vamos5 + 0.2, 0.6)); LI.eye.userData.burn.material.opacity = 0.32 * burn; LI.eye.userData.cornea.material.emissiveIntensity = 2.2 * burn; }
  // ---- L5–L9: las gafas grandes llegan, se desmontan y cada capa hace lo suyo con la luz
  const H = HP.hero, L = HP.L, pose = heroPose(t);
  const kin = win(t, K.vamos5 - 0.35, 0.8), kout = 1 - win(t, END - 1.4, 0.7);
  H.visible = kin * kout > 0.01; H.position.copy(pose.p).add(v3(-1.4, -0.5, 2.2).multiplyScalar(1 - eo(kin)));
  { const face = 1 - win(t, K.desmontar5 - 0.15, 0.8); H.quaternion.copy(pose.q); if (face > 0.001) H.quaternion.slerp(qFacing(v3(2.6, 0.6, 1.6).normalize()), eio(face)); H.rotateY((1 - eo(kin)) * 1.2); }   // llegan enseñando la lente naranja y giran hacia la nieve al desmontarse
  const ex = win(t, K.desmontar5 - 0.1, 1.0) * (1 - win(t, K.color10 - 0.2, 0.9));
  for (const k of ['mirror', 'tint', 'pol', 'inner']) L[k].position.z = EXP[k] * eio(ex);
  L.frameG.position.z = EXP.frame * eio(ex);
  for (const k of ['mirror', 'tint', 'pol', 'inner']) { const e = L[k].userData.edge; e.material.opacity = 0.9 * ex; e.visible = ex > 0.01; }
  // resaltar la capa de la que se habla
  const hl = { mirror: cw(t, K.fuera6, K.detras7), tint: cw(t, K.detras7, K.polar8), pol: cw(t, K.polar8, K.final9), inner: cw(t, K.final9, K.color10) };
  for (const k in hl) { const e = L[k].userData.edge; if (!e.visible) continue; e.material.color.setHex(hl[k] > 0.5 ? 0xffd27a : 0xe6ecf2); e.material.linewidth = 1.6 + 1.8 * hl[k]; }
  L.pol.material.opacity = 0.9 * Math.max(win(t, K.polar8 - 0.2, 0.5) * (1 - win(t, K.final9, 0.5)), 0.12 * ex);
  // color de la lente: naranja espejo → (sol) gris / plata → (niebla) naranja, amarillo, rosa → naranja
  { const m = L.mirror.material, tm = L.tint.material;
    let a = 'orangeMirror', b = 'orangeMirror', k = 0;
    if (t > K.gris10 - 0.2) { a = 'orangeMirror'; b = 'silver'; k = win(t, K.gris10 - 0.2, 0.4); }
    if (t > K.naranja11 - 0.2) { a = 'silver'; b = 'orange'; k = win(t, K.naranja11 - 0.2, 0.35); }
    if (t > K.amarillo11 - 0.15) { a = 'orange'; b = 'yellow'; k = win(t, K.amarillo11 - 0.15, 0.3); }
    if (t > K.rosa11 - 0.15) { a = 'yellow'; b = 'rose'; k = win(t, K.rosa11 - 0.15, 0.3); }
    if (t > K.frenan11 - 0.1) { a = 'rose'; b = 'orange'; k = win(t, K.frenan11 - 0.1, 0.4); }
    setLens(m, a, b, k);
    tm.color.copy(m.color); tm.opacity = 0.35 + 0.25 * (1 - m.metalness); }
  // rayos del despiece
  const kr = win(t, K.fuera6 - 0.3, 0.7) * (1 - win(t, K.color10 - 0.3, 0.5));
  let hi = 0; const M = new THREE.Matrix4(), hits = [];
  HP.rays.forEach((r, i) => {
    const front = 0.3, zm = EXP.mirror * eio(ex), zt = EXP.tint * eio(ex), zp = EXP.pol * eio(ex), stopZ = r.kind === 'ref' ? zm : r.kind === 'uv' ? zt : r.kind === 'pol' ? zp : -0.22;
    const stopAct = r.kind === 'ref' ? win(t, K.rebota6 - 0.1, 0.4) : r.kind === 'uv' ? win(t, K.frena7 - 0.1, 0.35) : r.kind === 'pol' ? win(t, K.deja8 - 0.15, 0.35) : 0;
    const zEnd = lerp(-0.22, stopZ, stopAct), frac = (front - zEnd) / (front + 0.22);
    drawK(r.l, kr * frac * (r.kind === 'uv' ? win(t, K.lente7 - 0.6, 0.6) + win(t, K.fuera6, 0.4) * 0.0 : 1) || 0);
    r.l.visible = kr > 0.01 && (r.kind !== 'uv' || t > K.lente7 - 0.6);
    if (r.rb) drawK(r.rb, kr * win(t, K.rebota6, 0.5));
    if (stopAct > 0.6 && kr > 0.1) hits.push([r.x, r.y, stopZ, r.kind]);
  });
  hits.forEach(([x, y, z, kind]) => { if (hi >= 12) return; const p = H.localToWorld(v3(x, y, z + 0.002)); const s = (kind === 'uv' ? 0.06 : 0.045) * (0.8 + 0.3 * Math.sin(t * 20 + x * 90)); M.compose(p, cam.quaternion, v3(s, s, s)); HP.hits.setMatrixAt(hi++, M); });
  HP.hits.count = hi; HP.hits.instanceMatrix.needsUpdate = true;
  // L8: ondas. Primero la luz vibra en todas direcciones; el reflejo del hielo, solo en horizontal; la rejilla vertical lo frena
  { const kw = win(t, K.reflejo8 - 0.4, 0.5) * (1 - win(t, K.final9 - 0.1, 0.4)), hor = win(t, K.horizontal8 - 0.2, 0.5), stop = win(t, K.deja8 - 0.1, 0.5);
    const A = H.localToWorld(v3(-0.025, 0.012, 0.3)), B = H.localToWorld(v3(-0.025, 0.012, -0.3)), X = v3(1, 0, 0).applyQuaternion(H.quaternion), Y = v3(0, 1, 0).applyQuaternion(H.quaternion);
    const zp = EXP.pol * eio(ex), cut = (0.3 - zp) / 0.6;
    LI.waves.forEach((l, i) => { const ang = i * Math.PI / 6 + t * 0.6 * (1 - hor), u = X.clone().multiplyScalar(Math.cos(ang)).addScaledVector(Y, Math.sin(ang));
      const keep = i === 0 ? 1 : 1 - hor, amp = 0.05 * (i === 0 ? 1 : 0.85), uu = i === 0 ? X.clone().multiplyScalar(Math.cos(ang * (1 - hor))).addScaledVector(Y, Math.sin(ang * (1 - hor))) : u;
      l.visible = kw * keep > 0.01; l.material.opacity = kw * keep; setWave(l, A, B, uu, amp, t * 9 + i, kw, i === 0 ? lerp(1, cut, stop) : 1); }); }
  // L9: vaho en la lente interior; la cámara de aire lo quita
  { const kd = win(t, K.segunda9 - 0.3, 0.5), gone = win(t, K.empane9 - 0.3, 0.8), D = L.drops, n = D.userData.n;
    D.visible = kd * (1 - gone) > 0.01; D.material.opacity = 0.7 * kd * (1 - gone); }
  // L10: 100 fotones contra la lente gris de categoría 3: pasan 18
  { const k = win(t, K.categoria10 - 0.3, 0.4) * (1 - win(t, K.dias11 - 0.2, 0.5)), ph = LI.ph; ph.visible = k > 0.01;
    if (ph.visible) { for (let i = 0; i < 100; i++) { const pass = i % 6 === 0 && i < 108; const x = ((i % 10) - 4.5) * 0.012, y = (Math.floor(i / 10) - 4.5) * 0.006;
        const ph0 = ((t * 0.7 + hash(i)) % 1), z = lerp(0.2, pass ? -0.3 : 0.004, ph0), fade = pass ? 1 : clamp((z - 0.0) / 0.04);
        const p = H.localToWorld(v3(x, y, z)), s = 0.0055 * k * (0.5 + 0.5 * fade) * (pass && z < 0 ? 1.4 : 1); M.compose(p, new THREE.Quaternion(), v3(s, s, s)); ph.setMatrixAt(i, M); }
      ph.instanceMatrix.needsUpdate = true; } }
  // L12: duelo naranja contra espejo
  { const k = win(t, K.tu12 - 0.3, 0.5) * (1 - win(t, END - 1.3, 0.6)), D = HP.duel; D.visible = k > 0.01; L.strap.visible = k > 0.01;
    if (D.visible) { const U = v3(0, 1, 0); D.position.copy(H.position).addScaledVector(U, 0.5 * eo(k)); D.quaternion.copy(H.quaternion); H.position.addScaledVector(U, -0.42 * eo(k)); D.rotateY(Math.sin(t * 0.8) * 0.12); D.scale.setScalar(4 * Math.max(0.0001, eo(k))); } }
  // cámara dentro de la montura (vista del esquiador): se quitan los cristales; el color lo pone el filtro de pantalla
  { const pov = win(t, K.dispersa11 - 0.5, 0.35) * (1 - win(t, K.moda12 - 0.35, 0.35)), pv = 1 - pov;
    L.mirror.material.opacity *= pv; L.tint.material.opacity *= pv; L.pol.material.opacity *= pv; L.inner.material.opacity = 0.22 * pv;
    for (const k of ['mirror', 'tint', 'pol', 'inner']) L[k].visible = pv > 0.01; }
  // vista a través de la lente naranja en la bajada nublada: vuelve el relieve
  { const kw = win(t, K.vuelves11 - 0.3, 0.6), k = (kw > 0 ? 1 : 0) * (1 - win(t, K.moda12 - 0.3, 0.5)), u = post.uniforms, w = lerp(-0.06, 1.06, kw);
    u.lensK.value = k; u.lensW.value = w; u.lensCol.value.set(1.0, 0.68, 0.38); u.lensCt.value = 1.75; RELIEF.uLensK.value = k; RELIEF.uLensW.value = w;
    H.updateMatrixWorld(true); HP.mask.matrix.copy(H.matrixWorld); HP.mask.visible = k > 0.001; }
}
// ---------------------------------------------------------------- cámara: esquiador congelado → sus gafas → el cristal de hielo y los colores → la nieve y el ojo →
// las gafas grandes desmontadas (espejo, lente, polarizado, cámara de aire) → sol (categoría 3) → bajada nublada a través de la lente → duelo → bucle
let CKS = [], CUTS = [];
const P0 = [2.05, 0.42, 3.55], L0 = [-0.25, 1.32, -0.6];
function buildCam() {
  const k = (t, p, l, f = 40) => [t, p.isVector3 ? [p.x, p.y, p.z] : p, l.isVector3 ? [l.x, l.y, l.z] : l, f];
  const SG = wpos(SK.gog), F = HG_F, UP = v3(0, 1, 0), R = F.clone().cross(UP).normalize(), H = HG_P;
  const at = (o, f = 0, r = 0, u = 0) => o.clone().addScaledVector(F, f).addScaledVector(R, r).addScaledVector(UP, u);
  const P2 = P2G, F2 = F2G, R2 = F2.clone().cross(UP).normalize();
  const at2 = (f = 0, r = 0, u = 0) => P2.clone().addScaledVector(F2, f).addScaledVector(R2, r).addScaledVector(UP, u);
  CKS = [[
    k(-1.0, [2.1, 0.44, 3.65], L0, 48), k(0.0, P0, L0, 48), k(K.cielo1, [1.75, 0.48, 3.55], [-0.45, 1.5, -0.7], 48), k(K.suelo1 + 0.25, [2.3, 0.55, 2.8], [0.2, 0.9, -0.5], 46),
    k(K.porque2 + 0.1, SG.clone().add(v3(1.05, 0.12, 0.85)), SG, 36), k(K.naranjas2, SG.clone().add(v3(0.42, 0.05, 0.3)), SG, 30), k(K.espejo2 + 0.25, SG.clone().add(v3(0.3, 0.03, 0.2)), SG, 27), k(K.final2 + 0.15, SG.clone().add(v3(0.27, 0.035, 0.18)), SG, 27),
    k(K.luz3 + 0.35, [4.6, 2.6, 5.4], [-0.6, 5.6, -2.2], 54), k(K.colores3, [6.8, 3.8, 6.1], [-0.6, 5.2, -2.0], 56), k(K.ultra3 + 0.3, [7.3, 4.1, 6.4], [-0.4, 4.9, -1.8], 56),
    k(K.nieve4 + 0.25, [6.0, 1.7, 5.2], [2.8, 0.5, 1.2], 46), k(K.n80, [5.6, 0.75, 4.9], [3.3, 1.7, 2.0], 50),
    k(K.quema4, EYE_P.clone().add(v3(1.25, -1.55, 1.05)), EYE_P, 40), k(K.ojos4 + 0.25, EYE_P.clone().add(v3(0.95, -1.25, 0.85)), EYE_P, 36),
    k(K.vamos5 + 0.15, H.clone().add(v3(2.6, 0.6, 1.6)), H.clone().add(v3(0, 0.3, 0)), 44), k(K.desmontar5 + 0.6, H.clone().add(v3(2.95, 0.55, 1.75)), H.clone().add(v3(0, 0.1, 0)), 46),
    k(K.fuera6 + 0.2, H.clone().add(v3(2.0, -0.08, 1.2)), H.clone().add(v3(0, -0.32, 0)), 40), k(K.rebota6 + 0.2, H.clone().add(v3(2.2, -0.12, 1.3)), H.clone().add(v3(0, -0.3, 0)), 41),
    k(K.detras7, H.clone().add(v3(1.95, 0.05, 1.15)), H.clone().add(v3(0, -0.16, 0)), 38), k(K.ultra7, H.clone().add(v3(1.9, 0.02, 1.12)), H.clone().add(v3(0, -0.16, 0)), 38),
    k(K.polar8, H.clone().add(v3(2.3, 0.4, 1.35)), H.clone().add(v3(0, 0.02, 0)), 42), k(K.horizontal8, H.clone().add(v3(2.0, 0.25, 1.2)), H.clone().add(v3(0, -0.02, 0)), 40), k(K.vertical8, H.clone().add(v3(1.55, 0.18, 0.95)), H.clone().add(v3(0, 0.06, 0)), 36), k(K.pasar8 + 0.2, H.clone().add(v3(1.6, 0.2, 0.98)), H.clone().add(v3(0, 0.06, 0)), 36),
    k(K.segunda9 + 0.1, H.clone().add(v3(1.95, 0.55, 1.15)), H.clone().add(v3(0, 0.24, 0)), 38), k(K.empane9 + 0.2, H.clone().add(v3(1.7, 0.5, 1.0)), H.clone().add(v3(0, 0.27, 0)), 36),
    k(K.color10 + 0.5, H.clone().addScaledVector(F10, 2.2).add(v3(0, 0.05, 0)), H, 40), k(K.categoria10, H.clone().addScaledVector(F10, 1.85), H, 38), k(K.luz10 + 0.2, H.clone().addScaledVector(F10, 1.75).add(v3(0.25, 0.1, -0.3)), H, 38),
    k(K.dias11, at2(1.6, 0.4, 0.25), P2, 42), k(K.rosa11 + 0.2, at2(1.2, -0.25, 0.15), P2, 40),
    k(K.azul11, at2(0.15, -1.4, 0.3), P2, 42), k(K.azul11 + 0.7, at2(-0.75, -0.8, 0.22), at2(0.5, 0, 0), 46), k(K.dispersa11, at2(-0.85, -0.05, 0.12), at2(8, 0, -0.7), 52),
    k(K.vuelves11, at2(-0.55, 0.0, 0.07), at2(10, 0, -0.9), 56), k(K.relieve11 + 0.3, at2(-0.46, 0.02, 0.06), at2(12, 0.2, -1.0), 55),
    k(K.color12 + 0.2, at2(-1.55, 0.2, 0.32), at2(0, 0, 0.02), 46), k(K.moda12 + 0.25, at2(0.2, 1.5, 0.35), P2, 44), k(K.decides12, at2(2.2, 0.15, 0.12), P2, 42), k(K.tu12 + 0.3, at2(2.75, 0.05, 0.14), at2(0, 0, 0.04), 44), k(K.espejo12 + 0.3, at2(2.7, -0.05, 0.12), at2(0, 0, 0.04), 44),
    k(END - 0.75, [2.4, 0.5, 3.9], [-0.2, 1.4, -0.55], 46), k(END, P0, L0, 48), k(END + 0.5, [2.02, 0.41, 3.5], L0, 48),
  ]];
  const ks = CKS[0]; for (let i = 1; i < ks.length; i++) if (ks[i][0] <= ks[i - 1][0] + 0.04) ks[i][0] = ks[i - 1][0] + 0.04;
}
function camAt(t) { return camKeys(t, CKS[0]); }
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return t; return t - dt; }
// destellos en los momentos clave
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[K.desmontar5 + 0.1, 0.05], [K.deja8, 0.04], [K.relieve11, 0.04]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt() { return 0; }
// ---------------------------------------------------------------- un instante de la escena
function stageAt(t, st) { NOW = t; propsAt(t); pulsesAt(t); }
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
  renderer.setRenderTarget(rtM); renderer.setClearColor(0x000000, 1); renderer.clear(); if (post.uniforms.lensK.value > 0.001) renderer.render(maskScene, cam);
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
  hudAt(t); drawFrame(t);
  return true;
};
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : 0.6; frame(t);
  if (window.COVER_CAM) { const C = window.COVER_CAM; cam.fov = C[6]; cam.updateProjectionMatrix(); cam.position.set(C[0], C[1], C[2]); cam.up.set(0, 1, 0); cam.lookAt(C[3], C[4], C[5]); cam.updateMatrixWorld(); }
  const VP = vpOf(); flowUpdate(t, VP, VP); fxUpdate(t, VP, VP);
  post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); post.uniforms.flash.value = 0; post.uniforms.white.value = 0;
  hudBegin(); drawFrame(t);
  return true;
};
// ---------------------------------------------------------------- HUD: cabecera con la pregunta pendiente (¿naranja o espejo?), cifras grandes y rótulos técnicos
function buildHudPlan() {}
const HO = '#FFB547', HB = '#8FB8FF', HV = '#C9A6FF';
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));        // ventana de un rótulo
const wpL = (o, x = 0, y = 0, z = 0) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  const tk = clamp((t + 0.6) / 0.7);
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('GAFAS DE ESQUÍ', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('LA LUZ, POR DENTRO', tk), 56, 182);
  hg.globalAlpha = tk; hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('LA NIEVE REFLEJA', 1024, 112);
  hfont(32); hg.fillStyle = HV; hg.fillText('≤ 80 % UV', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('FUENTE: OMS', 1024, 178);
  const mk = win(t, K.final2 - 0.1, 0.3) * (1 - win(t, END - 0.6, 0.4));
  if (mk > 0.01) {
    let txt = 'NARANJA O ESPEJO · ???', col = HC.red, blink = true;
    if (t > K.decides12 - 0.1) { txt = 'LA LUZ QUE DECIDES NO VER'; col = HO; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = mk; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath();
    hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
    hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
    hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y);
  }
  hg.restore();
}
// barra del espectro (7 colores + UV); «dim» apaga el azul y el violeta
function specBar(x, y, w, h, k, dim) {
  if (k <= 0.01) return;
  const cols = ['#ff3b3b', '#ff8a1f', '#ffd31a', '#3ddc5a', '#22c6e8', '#3d6dff', '#8b4dff'];
  hg.save(); hg.globalAlpha = k; const sw = w / 7;
  cols.forEach((c, i) => { hg.fillStyle = c; hg.globalAlpha = k * (i >= 4 ? 1 - 0.78 * dim : 1); hg.fillRect(x + i * sw * eo(k), y, sw * eo(k) - 3, h); });
  hg.globalAlpha = k; hfont(18, false); hg.letterSpacing = '3px'; hg.fillStyle = HC.grey; hg.textAlign = 'left'; hg.fillText('ROJO', x, y + h + 30); hg.textAlign = 'right'; hg.fillText('AZUL · VIOLETA', x + w, y + h + 30);
  if (dim > 0.01) { hg.globalAlpha = k * dim; hg.strokeStyle = HO; hg.lineWidth = 3; hg.setLineDash([10, 8]); hg.strokeRect(x + 4 * sw - 6, y - 10, 3 * sw + 8, h + 20); hg.setLineDash([]);
    hfont(22); hg.fillStyle = HO; hg.textAlign = 'center'; hg.fillText('MENOS AZUL', x + 5.5 * sw, y - 24); }
  hg.restore();
}
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1430, H = HP.hero, L = HP.L;
  // L1: dos veces (cielo y suelo)
  { const k = cw(t, K.cielo1 - 0.1, K.porque2 + 0.2); if (k > 0.01) bigText('1 · DESDE EL CIELO', W / 2, Y + 30, 46, HC.white, k, { dark: 22 }); }
  { const k = cw(t, K.suelo1 - 0.1, K.porque2 + 0.2); if (k > 0.01) bigText('2 · DESDE EL SUELO', W / 2, Y + 100, 46, HO, k, { glow: 14, dark: 22 }); }
  // L3: luz visible y ultravioleta
  lab(LI.spec[3].userData.pts[24], 'LUZ VISIBLE', 'TODOS LOS COLORES', cw(t, K.colores3 - 0.05, K.nieve4 - 0.1), { dx: 130, dy: -130 });
  lab(LI.spec[7].userData.pts[20], 'ULTRAVIOLETA', 'NO SE VE', cw(t, K.ultra3 - 0.1, K.nieve4 + 0.3), { dx: -120, dy: 110, color: HV });
  // L4: 80 %
  { const k = cw(t, K.n80 - 0.1, K.quema4 - 0.15); if (k > 0.01) { const n = Math.min(80, Math.max(1, Math.round(80 * eo(clamp((t - K.n80 + 0.1) / 0.6))))); bigText(n + ' %', W / 2, Y - 20, 140, HV, k, { glow: 26, type: false, dark: 34 });
    bigText('DE LA ULTRAVIOLETA REBOTA', W / 2, Y + 82, 32, HC.white, k, { dark: 22 }); bigText('NIEVE RECIÉN CAÍDA · FUENTE: OMS', W / 2, Y + 130, 20, HC.grey, k, { dark: 16 }); } }
  if (LI.eye.visible) lab(wpL(LI.eye, 0, 0, 0.5), 'CÓRNEA', 'SE QUEMA: CEGUERA DE LA NIEVE', cw(t, K.quema4 - 0.05, K.vamos5 - 0.1), { dx: -140, dy: -140, color: HC.red });
  // L6–L9: capas
  if (H.visible) {
    lab(wpL(L.mirror, -0.06, 0.03, 0), 'ESPEJO', 'CAPA FINÍSIMA: REBOTA LUZ', cw(t, K.espejo6 - 0.1, K.detras7 - 0.05), { dx: -120, dy: -150, color: HO });
    lab(wpL(L.tint, 0.05, 0.03, 0), 'LENTE', 'FRENA LA ULTRAVIOLETA', cw(t, K.lente7 - 0.1, K.polar8 - 0.05), { dx: 120, dy: -150, color: HV });
    lab(wpL(L.pol, -0.05, 0.035, 0), 'FILTRO POLARIZADO', 'REJILLA VERTICAL', cw(t, K.filtro8 - 0.1, K.final9 - 0.1), { dx: -110, dy: -170, color: HB });
    { const k = cw(t, K.reflejo8 - 0.05, K.filtro8b ?? K.final9); if (k > 0.01) { bigText('REFLEJO DEL HIELO', W / 2, Y + 20, 44, HC.white, k, { dark: 22 }); bigText('VIBRA EN HORIZONTAL  ⟷', W / 2, Y + 84, 38, HO, cw(t, K.horizontal8 - 0.1, K.final9 - 0.1), { glow: 14, dark: 22 }); } }
    { const k = cw(t, K.deja8 - 0.05, K.final9 - 0.05); if (k > 0.01) stamp('NO PASA', W / 2, Y + 170, k, HC.red, 84); }
    { const k = cw(t, K.aire9 - 0.15, K.color10 - 0.1); if (k > 0.01) { const a = wpL(L.tint, 0.0, -0.045, 0), b = wpL(L.inner, 0.0, -0.045, 0); dimV(proj(a), proj(b), 'AIRE', k, HB); } }
    lab(wpL(L.inner, 0.05, 0.03, 0), 'LENTE INTERIOR', 'NO SE EMPAÑA', cw(t, K.segunda9 - 0.05, K.color10 - 0.1), { dx: 120, dy: -150, color: HB });
  }
  // L10: categoría 3
  { const k = cw(t, K.categoria10 - 0.1, K.dias11 - 0.15); if (k > 0.01) { bigText('CATEGORÍA 3', W / 2, Y - 10, 92, HC.white, k, { dark: 30 }); bigText('PASA ENTRE EL 8 Y EL 18 % DE LA LUZ', W / 2, Y + 70, 30, HO, cw(t, K.dejan10 - 0.1, K.dias11 - 0.15), { glow: 12, dark: 20 }); bigText('PARA DÍAS DE SOL', W / 2, Y + 118, 22, HC.grey, k, { dark: 16 }); } }
  // L11: nublado → menos azul → relieve
  { const k = cw(t, K.nublados11 - 0.1, K.vuelves11 - 0.2); if (k > 0.01) { bigText('DÍA NUBLADO', W / 2, Y - 40, 60, HC.white, k, { dark: 26 }); specBar(W / 2 - 330, Y + 40, 660, 46, cw(t, K.frenan11 - 0.3, K.vuelves11 - 0.2), win(t, K.azul11 - 0.2, 0.5));
      bigText('EL AZUL ES LA LUZ QUE MÁS SE DISPERSA', W / 2, Y + 190, 26, HC.white, cw(t, K.dispersa11 - 0.3, K.vuelves11 - 0.2), { dark: 18 }); } }
  { const k = cw(t, K.relieve11 - 0.2, K.moda12 - 0.3); if (k > 0.01) bigText('RELIEVE', W / 2, Y + 60, 70, HO, k, { glow: 18, dark: 26 }); }
  // L12: duelo
  if (HP.duel.visible) { const k = cw(t, K.naranjas12 - 0.2, END - 0.7); lab(wpL(H, 0, -0.06, 0), 'NARANJA', null, k, { dx: 60, dy: 150, color: HO }); lab(wpL(HP.duel, 0, -0.06, 0), 'ESPEJO', null, cw(t, K.espejo12 - 0.2, END - 0.7), { dx: -60, dy: 150, color: HB }); }
}
// ---------------------------------------------------------------- arranque: letras, tiempos de la voz, el mundo, el esquiador, la luz, las gafas y la cámara
(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '700' }), new FontFace('SpaceMono', `url(${F}SpaceMono-Regular.ttf)`, { weight: '400' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '800' }), new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    nieve1: atL(1, 'nieve'), sol1: atL(1, '=sol'), dos1: atL(1, '=dos'), cielo1: atL(1, 'cielo'), suelo1: atL(1, 'suelo'),
    porque2: atL(2, '=por'), gafas2: atL(2, 'gafas'), naranjas2: atL(2, 'naranjas'), espejo2: atL(2, 'espejo'), final2: atL(2, 'final'),
    luz3: atL(3, '=luz'), colores3: atL(3, 'colores'), parte3: atL(3, 'parte'), ves3: atL(3, '=ves'), ultra3: atL(3, 'ultravioleta'),
    nieve4: atL(4, 'nieve'), devuelve4: atL(4, 'devuelve'), n80: atL(4, '=80'), quema4: atL(4, 'quema'), ojos4: atL(4, 'ojos'),
    vamos5: atL(5, 'vamos'), desmontar5: atL(5, 'desmontar'), gafas5: atL(5, 'gafas'),
    fuera6: atL(6, 'fuera'), espejo6: atL(6, 'espejo'), capa6: atL(6, 'capa'), rebota6: atL(6, 'rebota'), entrar6: atL(6, 'entrar'),
    detras7: atL(7, 'detras'), lente7: atL(7, 'lente'), frena7: atL(7, 'frena'), ultra7: atL(7, 'ultravioleta'),
    polar8: atL(8, 'polarizada'), filtro8: atL(8, 'filtro'), reflejo8: atL(8, 'reflejo'), hielo8: atL(8, 'hielo'), horizontal8: atL(8, 'horizontal'), filtro8b: atL(8, 'filtro', 2), rejilla8: atL(8, 'rejilla'), vertical8: atL(8, 'vertical'), deja8: atL(8, 'deja'), pasar8: atL(8, 'pasar'),
    final9: atL(9, 'final'), segunda9: atL(9, 'segunda'), aire9: atL(9, 'aire'), empane9: atL(9, 'empane'),
    color10: atL(10, 'color'), sol10: atL(10, '=sol'), gris10: atL(10, 'gris'), categoria10: atL(10, 'categoria'), dejan10: atL(10, 'dejan'), n18: atL(10, '=18'), luz10: atL(10, '=luz'),
    dias11: atL(11, 'dias'), nublados11: atL(11, 'nublados'), naranja11: atL(11, 'naranja'), amarillo11: atL(11, 'amarillo'), rosa11: atL(11, 'rosa'), frenan11: atL(11, 'frenan'), azul11: atL(11, 'azul'), dispersa11: atL(11, 'dispersa'), vuelves11: atL(11, 'vuelves'), relieve11: atL(11, 'relieve'),
    color12: atL(12, 'color'), moda12: atL(12, 'moda'), decides12: atL(12, 'decides'), tu12: atL(12, '=tu'), naranjas12: atL(12, 'naranjas'), espejo12: atL(12, 'espejo'),
  };
  mats(); buildMats(); buildWorld(); buildLights(); buildSkier(); buildLight(); buildProps(); buildPulses();
  { // reflejos: un cielo y una nieve sencillos para las lentes de espejo
    const es = new THREE.Scene(), sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), W0.sky.material.clone()); sky.material.uniforms.over.value = 0; sky.material.uniforms.space.value = 0; sky.material.uniforms.dark.value = 0; es.add(sky);
    const gnd = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: 0xe8eef6 })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -2; es.add(gnd);
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.02).texture; scene.environmentIntensity = 0.55;
  }
  post.uniforms.ca.value = 0.35; post.uniforms.vig.value = 0.36;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
