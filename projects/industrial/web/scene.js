// «Ingeniería Industrial» — fábrica de juguete plastificada sobre un suelo espejo: el birrete que se vuelve casco, la nota de
// corte, la navaja suiza de ingenierías y una línea de producción con una estación por asignatura; una pieza dorada lleva la
// cámara de una a otra. Al final se ve la fábrica entera y el casco encaja. Pensado para 60 fps.
// window.renderAt(t) dibuja el instante t. window.PR = 2 → render real a 2160x3840 (4K vertical).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { W, H, clamp, prog, lerp, eo, eio, ss } from './lib.js';

// ---------------------------------------------------------------- render, resplandor y acabado
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
const PR = window.PR || 1; renderer.setPixelRatio(PR); renderer.setSize(W, H); document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const rtA = new THREE.WebGLRenderTarget(W * PR, H * PR, { type: THREE.HalfFloatType, samples: 4 });
const BW = Math.round(W * PR / 4), BH = Math.round(H * PR / 4);
const rtB = [0, 1].map(() => new THREE.WebGLRenderTarget(BW, BH, { type: THREE.HalfFloatType }));
const rtC = [0, 1].map(() => new THREE.WebGLRenderTarget(Math.round(BW / 2), Math.round(BH / 2), { type: THREE.HalfFloatType }));
const VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
const brightM = new THREE.ShaderMaterial({ uniforms: { tA: { value: null }, px: { value: new THREE.Vector2(1.5 / (W * PR), 1.5 / (H * PR)) } }, vertexShader: VS, depthTest: false,
  fragmentShader: `uniform sampler2D tA; uniform vec2 px; varying vec2 vUv;
    void main(){ vec3 c = vec3(0.); for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) c += texture2D(tA, vUv + vec2(float(i), float(j)) * px).rgb; c /= 9.0;
      float l = max(c.r, max(c.g, c.b)), k = clamp((l - 1.9) / 2.0, 0., 1.); gl_FragColor = vec4(c * k * k, 1.); }` });
const blurM = new THREE.ShaderMaterial({ uniforms: { tA: { value: null }, d: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false,
  fragmentShader: `uniform sampler2D tA; uniform vec2 d; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tA, vUv).rgb * 0.227027;
      c += (texture2D(tA, vUv + d * 1.384615).rgb + texture2D(tA, vUv - d * 1.384615).rgb) * 0.316216;
      c += (texture2D(tA, vUv + d * 3.230769).rgb + texture2D(tA, vUv - d * 3.230769).rgb) * 0.070270;
      gl_FragColor = vec4(c, 1.); }` });
const post = new THREE.ShaderMaterial({        // desenfoque de movimiento, resplandor, aberración cromática, ACES, gradación cálida, viñeta, grano, fundido a blanco
  uniforms: { tA: { value: null }, tB: { value: null }, tC: { value: null }, dir: { value: new THREE.Vector2(0, 0) }, fade: { value: 0 }, white: { value: 0 }, vig: { value: 0.34 },
    time: { value: 0 }, flash: { value: 0 }, bloom: { value: 0.55 }, ca: { value: 1 }, night: { value: 0 } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D tA, tB, tC; uniform vec2 dir; uniform float fade, white, vig, time, flash, bloom, ca, night; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec2 c = vUv - .5; vec2 cc = c * 0.003 * ca; vec3 a = vec3(0.), b = vec3(0.);
      for(int i=0;i<20;i++){ float k=(float(i)/19.0-0.5); vec2 u=vUv+dir*k; a.r+=texture2D(tA, u+cc).r; a.g+=texture2D(tA, u).g; a.b+=texture2D(tA, u-cc).b; } a/=20.0;
      for(int i=0;i<6;i++){ float k=(float(i)/5.0-0.5); vec2 u=vUv+dir*k; b += texture2D(tB, u).rgb * 0.7 + texture2D(tC, u).rgb; } b /= 6.0;
      a += b * bloom;
      a = mix(a, vec3(0.0), fade); a += flash;
      a *= 1.06; a = clamp((a*(2.51*a+0.03))/(a*(2.43*a+0.59)+0.14),0.,1.); a = pow(a, vec3(1.0/2.2));
      float lu = dot(a, vec3(0.2126,0.7152,0.0722));
      a += vec3(-0.012, 0.010, 0.032) * (1.0 - lu) * (1.0 - lu) + vec3(0.035, 0.012, -0.022) * lu * lu;   // sombras frías, luces cálidas
      a = mix(a, a * vec3(0.62, 0.78, 1.25), night * 0.8);
      a = mix(vec3(lu), a, 1.2); a = mix(a, a*a*(3.0-2.0*a), 0.22);
      vec2 d = c*vec2(0.5625,1.0); a *= 1.0 - vig*smoothstep(0.22,0.85,length(d)*1.6);
      a += (h(vUv*vec2(1080.,1920.) + fract(time*7.13)*91.7) - 0.5) * 0.022;
      a = mix(a, vec3(1.0), white);
      gl_FragColor = vec4(clamp(a,0.,1.), 1.0); }`,
  depthTest: false,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post), quadScene = new THREE.Scene(); quadScene.add(quad);
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const hash0 = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const scene = new THREE.Scene();
const BG = 0x090d1a;
const bgTex = (() => { const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, '#04060c'); gr.addColorStop(0.5, '#0b1124'); gr.addColorStop(1, '#06080f'); g.fillStyle = gr; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 12; i++) { const x = hash0(i * 31) * 2048, y = 300 + hash0(i * 17) * 500, r = 160 + hash0(i * 7) * 320, rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, ['rgba(60,80,170,.20)', 'rgba(150,70,40,.14)', 'rgba(90,50,140,.16)'][i % 3]); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 700; i++) { const b = hash0(i * 1.7); g.fillStyle = `rgba(210,220,255,${0.08 + b * b * 0.35})`; g.fillRect(hash0(i * 3.3) * 2048, hash0(i * 5.1) * 1024, b > 0.93 ? 2 : 1, b > 0.93 ? 2 : 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; return t; })();
scene.background = bgTex; scene.fog = new THREE.Fog(BG, 30, 95);
const cam = new THREE.PerspectiveCamera(34, W / H, 0.01, 400); cam.layers.enable(1);
const S = {}; window.S = S; window.cam = cam; window.SCN = scene;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const env = (t, t0, t1, fi = 0.3, fo = 0.3) => (t < t0 || t > t1 ? 0 : Math.min(eo(prog(t, t0, fi)), 1 - prog(t, t1 - fo, fo)));
const hash = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (draw) draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { c, g }; return t; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function rbox(w, h, d, m, r = 0.06) {   // caja de bordes redondeados que mide exactamente w × h × d
  const rz = Math.min(r, d * 0.45), b = Math.min(r * 0.9, rz, w * 0.45, h * 0.45);
  w -= 2 * b; h -= 2 * b; r = Math.max(0.0001, Math.min(r - b, w * 0.5, h * 0.5));
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.0005, d - 2 * rz), bevelEnabled: true, bevelSize: b, bevelThickness: rz, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -Math.max(0.0005, d - 2 * rz) / 2); const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
}
function label(txt, { size = 80, color = '#ffffff', w = 1.6, weight = 800, pill = false, font = 'Inter', bg = 'rgba(20,22,26,.82)' } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = `${weight} ${size}px ${font}`;
  const tw = g.measureText(txt).width; c.width = Math.ceil(tw + size * (pill ? 1.4 : 0.6)); c.height = Math.ceil(size * (pill ? 1.9 : 1.4));
  g.font = `${weight} ${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (pill) { g.fillStyle = bg; rr(g, 2, 2, c.width - 4, c.height - 4, c.height / 2 - 2); g.fill(); }
  g.fillStyle = color; g.fillText(txt, c.width / 2, c.height / 2 + size * 0.04);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / c.width), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 9; m.layers.set(1); return m;
}
const zones = {};
function zone(name, x) { const g = new THREE.Group(); g.position.set(x, 0, 0); scene.add(g); zones[name] = g; return g; }

// ---------------------------------------------------------------- tiempos (palabras de la voz)
let WORDS = [], END = 70.4;
const norm = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
function at(word, k = 1) { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if ((exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + word); return 1e9; }
let K = {};

// ---------------------------------------------------------------- materiales comunes
const plastic = (c, r = 0.22) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06 });
const metal = (c = 0xd8dde6, r = 0.18) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 1 });
const glowM = (c, i = 2.5) => new THREE.MeshStandardMaterial({ color: 0x050505, emissive: c, emissiveIntensity: i, roughness: 0.5 });
// el color de cada instancia también brilla un poco (bacterias, iones, cristales)
function instGlow(m, k = 0.35) { m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance += vColor.rgb * ${k.toFixed(3)};\n#endif`); }; m.customProgramCacheKey = () => 'ig' + k; return m; }

// ---------------------------------------------------------------- utilidades de cámara y animación
// cámara por fotogramas clave: [[t, [x,y,z] posición, [x,y,z] mira, fov?], …]. Interpolación cúbica monótona
// (Fritsch–Carlson) con los tiempos reales: suave y sin pasarse nunca de largo.
function mono(t, T, Y) {
  const n = T.length; if (t <= T[0]) return Y[0]; if (t >= T[n - 1]) return Y[n - 1];
  let i = 0; while (t > T[i + 1]) i++;
  const d = k => (Y[k + 1] - Y[k]) / (T[k + 1] - T[k]), hh = k => T[k + 1] - T[k];
  const m = k => { if (k <= 0 || k >= n - 1) return 0; const a = d(k - 1), b = d(k); if (a * b <= 0) return 0; const h0 = hh(k - 1), h1 = hh(k); return 3 * (h0 + h1) / ((2 * h1 + h0) / a + (h1 + 2 * h0) / b); };
  const h = hh(i), u = (t - T[i]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * Y[i] + (u3 - 2 * u2 + u) * h * m(i) + (-2 * u3 + 3 * u2) * Y[i + 1] + (u3 - u2) * h * m(i + 1);
}
function camKeys(t, KS, o = null) {        // o: grupo en cuyas coordenadas están las claves (null = mundo)
  const T = KS.map(k => k[0]), comp = (j, c) => mono(t, T, KS.map(k => k[j][c]));
  const p = v3(comp(1, 0), comp(1, 1), comp(1, 2)), l = v3(comp(2, 0), comp(2, 1), comp(2, 2));
  if (o) { o.updateMatrixWorld(); p.applyMatrix4(o.matrixWorld); l.applyMatrix4(o.matrixWorld); }
  return { p, l, f: mono(t, T, KS.map(k => k[3] || 34)) };
}
const keyed = (t, KS) => mono(t, KS.map(k => k[0]), KS.map(k => k[1]));     // valor escalar por claves
const sm5 = x => x * x * x * (x * (x * 6 - 15) + 10);
const pop = (t, t0, d = 0.35) => { const u = clamp((t - t0) / d); if (u <= 0) return 0; if (u >= 1) return 1; return 1 + Math.sin(u * Math.PI * 1.15) * (1 - u) * 0.55 + (eo(u) - 1); }   // aparece con rebote
const pops = (t, t0, d = 0.35) => Math.max(0.0001, pop(t, t0, d));
function sparks(Z, n = 80, color = 0xffe08a, size = 0.045) { const p = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)), new THREE.PointsMaterial({ color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: starTex0() })); Z.add(p); p.userData.n = n; p.frustumCulled = false; return p; }
function burst(p, c, t, t0, spread = 1, life = 0.6, loop = true, grav = 3) {
  const a = p.geometry.attributes.position.array, n = p.userData.n;
  for (let i = 0; i < n; i++) { let tt = (t - t0) + hash(i) * life * (loop ? 1 : 0.15); tt = loop ? tt % life : Math.max(0, tt); const th = hash(i * 3) * Math.PI * 2, ph = (hash(i * 7) - 0.3) * 1.6, v = (1.2 + hash(i * 11) * 2.2) * spread;
    a[i * 3] = c.x + Math.cos(th) * Math.cos(ph) * v * tt; a[i * 3 + 1] = c.y + Math.sin(ph) * v * tt - grav * tt * tt; a[i * 3 + 2] = c.z + Math.sin(th) * Math.cos(ph) * v * tt; }
  p.geometry.attributes.position.needsUpdate = true;
}
function lookLab(l, k, pos) { l.visible = k > 0.01; l.material.opacity = Math.min(1, k); if (pos) l.position.copy(pos); l.quaternion.copy(cam.quaternion); if (l.parent) { const q = new THREE.Quaternion(); l.parent.getWorldQuaternion(q); l.quaternion.premultiply(q.invert()); } }
function pill(txt, color = '#ffffff', bg = 'rgba(16,20,30,.88)', w = 1.4, size = 70) { return label(txt, { size, w, pill: true, color, bg }); }
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler();
let _starT = null;
function starTex0() { return _starT || (_starT = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); })); }
const discTex = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 62); r.addColorStop(0, 'rgba(255,255,255,.55)'); r.addColorStop(0.75, 'rgba(255,255,255,.3)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); });
const setOp = (g, a) => g.traverse(o => { if (o.material && !o.userData.keepOp) { o.material.transparent = a < 0.999; o.material.opacity = a; o.material.depthWrite = a > 0.5; } });
const show = (o, k) => { o.visible = k > 0.002; if (o.visible) o.scale.setScalar(Math.max(0.0001, k) * (o.userData.s0 || 1)); };

// ---------------------------------------------------------------- paleta y materiales
const PL = { yellow: 0xf2b415, orange: 0xff6a2b, red: 0xff3b4e, blue: 0x3d8bff, sky: 0x46b4ff, green: 0x19d98a, teal: 0x22c0b0, violet: 0x8a5cff, pink: 0xff6fb5, white: 0xf3f5f9, navy: 0x1b2a4a, dark: 0x1a1d24, steel: 0xc9ced6 };
const MAT = {};
function mats() {
  for (const k in PL) MAT[k] = plastic(PL[k], 0.2);
  MAT.steel = metal(0xd2d7df, 0.22); MAT.dsteel = metal(0x7c8592, 0.35); MAT.gold = metal(0xffc861, 0.2); MAT.copper = metal(0xe08a52, 0.25);
  MAT.rubber = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.7 });
  MAT.glass = new THREE.MeshPhysicalMaterial({ color: 0xbfe4ff, roughness: 0.04, metalness: 0, transmission: 0, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
}

// ---------------------------------------------------------------- piezas comunes
function bar(a, b, r, m, seg = 8) { const d = b.clone().sub(a), L = d.length(); const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), m); c.position.copy(a).add(b).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize()); c.castShadow = true; return c; }
function tube(pts, r, m, seg, closed = false) { const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), seg || pts.length * 6, r, 10, closed), m); t.castShadow = true; return t; }
function cyl(rt, rb, h, m, seg = 32) { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); c.castShadow = true; c.receiveShadow = true; return c; }
function sph(r, m, ws = 24, hs = 16) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), m); s.castShadow = true; return s; }
function gearGeo(teeth, r, depth, hole = 0.25) {
  const s = new THREE.Shape(), h = r * 0.16, n = teeth * 4;
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, k = i % 4, rr2 = k === 1 || k === 2 ? r + h : r; const x = Math.cos(a) * rr2, y = Math.sin(a) * rr2; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const p = new THREE.Path(); p.absarc(0, 0, r * hole, 0, Math.PI * 2, true); s.holes.push(p);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: r * 0.02, bevelThickness: r * 0.02, bevelSegments: 2, curveSegments: 6 }); g.translate(0, 0, -depth / 2); return g;
}
function gear(teeth, r, depth, m) { const g = new THREE.Mesh(gearGeo(teeth, r, depth), m); g.castShadow = true; return g; }
function arrow(len, m, r = 0.05) {         // flecha gruesa a lo largo de +y
  const g = new THREE.Group();
  const sh = cyl(r, r, len - r * 4, m, 16); sh.position.y = (len - r * 4) / 2; g.add(sh);
  const hd = new THREE.Mesh(new THREE.ConeGeometry(r * 2.4, r * 4.5, 20), m); hd.position.y = len - r * 2.2; hd.castShadow = true; g.add(hd); return g;
}
function cota(len, txt, color = '#ffffff', lw = 0.45) {    // línea de cota con flechas y medida
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false });
  const ln = new THREE.Mesh(new THREE.BoxGeometry(len, 0.012, 0.012), m); g.add(ln);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 10), m); c.position.x = -s * (len / 2 - 0.04); c.rotation.z = s > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(c);
    const tk = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.012), m); tk.position.x = s * len / 2; g.add(tk); }
  if (txt) { const l = label(txt, { size: 60, w: lw, color }); l.position.y = 0.1; g.add(l); g.userData.l = l; }
  g.userData.m = m; return g;
}
// rótulo de neón: placa oscura + letras que brillan (on 0..1)
function neon(txt, color = '#7fe6ff', w = 2.4) {
  const g = new THREE.Group();
  const l = label(txt, { size: 110, w, color: '#ffffff', weight: 900 }); l.layers.set(0); g.add(l);
  const glow = label(txt, { size: 110, w: w * 1.02, color, weight: 900 }); glow.layers.set(0); glow.position.z = -0.01; glow.scale.set(1.04, 1.25, 1); g.add(glow);
  const plate = rbox(w * 1.08, w * 0.24, 0.06, new THREE.MeshStandardMaterial({ color: 0x0c0f16, roughness: 0.4, metalness: 0.3 }), 0.03); plate.position.z = -0.05; g.add(plate);
  g.userData = { l, glow, col: new THREE.Color(color) };
  return g;
}
function neonOn(n, k, t = 0) {     // k: 0 apagado, 1 encendido (con parpadeo de arranque)
  const fl = k > 0 && k < 1 ? (Math.sin(t * 90) > 0.2 ? 1 : 0.35) : 1, e = (0.18 + 2.6 * k) * fl;
  n.userData.l.material.color.setRGB(0.25 + e * 0.75, 0.25 + e * 0.75, 0.25 + e * 0.75);
  n.userData.glow.material.color.copy(n.userData.col).multiplyScalar(0.12 + 1.6 * k * fl); n.userData.glow.material.opacity = 0.25 + 0.75 * k;
}
// textura de icono dibujado en lienzo (para caras de bloques, pantallas, etiquetas)
function iconTex(draw, w = 512, h = 512, bg = null) { return canvasTex(w, h, (g, W2, H2) => { if (bg) { g.fillStyle = bg; rr(g, 8, 8, W2 - 16, H2 - 16, 48); g.fill(); } draw(g, W2, H2); }); }
function facePlane(tex, w, h) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.35, metalness: 0 })); return m; }

// ---------------------------------------------------------------- maniquí articulado (plástico brillante)
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
// casco de obra amarillo (radio de la cúpula 0,5)
function hardHat(col = PL.yellow) {
  const g = new THREE.Group(), m = plastic(col, 0.16);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.scale.set(1, 0.86, 1.12); g.add(dome);
  const ridge = rbox(0.13, 0.1, 1.0, m, 0.05); ridge.position.y = 0.4; g.add(ridge);
  for (const s of [-1, 1]) { const r2 = rbox(0.07, 0.07, 0.86, m, 0.03); r2.position.set(s * 0.2, 0.36, 0); r2.rotation.z = -s * 0.42; g.add(r2); }
  // ala: anillo (abierto por dentro, para poder ver el interior oscuro del casco)
  const bp = [[0.47, -0.012], [0.63, -0.022], [0.645, 0.0], [0.63, 0.022], [0.49, 0.03], [0.47, 0.01]].map(([x, y]) => new THREE.Vector2(x, y)); bp.push(bp[0].clone());
  const brim = new THREE.Mesh(new THREE.LatheGeometry(bp, 72), m); brim.scale.set(1, 1, 1.18); brim.position.set(0, 0.0, 0.06); brim.castShadow = true; g.add(brim);
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.47, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x07080c, roughness: 0.9, side: THREE.BackSide })); inner.scale.set(1, 0.8, 1.1); g.add(inner);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.025, 8, 48), new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.6 })); band.rotation.x = Math.PI / 2; band.position.y = 0.06; band.scale.set(1, 1.1, 1); g.add(band);
  // pegatina delantera (vacía hasta la respuesta)
  const st = facePlane(canvasTex(512, 160, (q, w, h) => { q.fillStyle = '#10131a'; rr(q, 6, 6, w - 12, h - 12, 40); q.fill(); q.fillStyle = '#ffffff'; q.font = '900 92px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('MÁSTER', w / 2, h / 2 + 4); }), 0.42, 0.13);
  st.position.set(0, 0.2, 0.52); st.rotation.x = -0.32; st.visible = false; g.add(st);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData = { m, sticker: st, inner }; return g;
}
// birrete de graduación (tablero 1 × 1)
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
// interrogación 3D (tubo + punto), alto ≈ 0,6
function qmark(m) {
  const g = new THREE.Group(), pts = [];
  for (let i = 0; i <= 18; i++) { const a = lerp(Math.PI * 0.92, -Math.PI * 0.42, i / 18); pts.push(v3(Math.cos(a) * 0.15, 0.2 + Math.sin(a) * 0.15, 0)); }
  pts.push(v3(0.02, -0.02, 0), v3(0, -0.08, 0)); g.add(tube(pts, 0.042, m, 60));
  const dot = sph(0.05, m); dot.position.y = -0.21; g.add(dot); return g;
}
// robot industrial de 6 ejes (naranja): J.base(gira y), J.sh (hombro, gira z), J.el (codo), J.wr (muñeca), J.tool
function robotArm(col = PL.orange, s = 1) {
  const g = new THREE.Group(), m = plastic(col, 0.22), dk = plastic(0x22252c, 0.35), J = {};
  const base = cyl(0.32, 0.38, 0.18, dk, 40); base.position.y = 0.09; g.add(base);
  J.base = new THREE.Group(); J.base.position.y = 0.18; g.add(J.base);
  const turret = cyl(0.24, 0.28, 0.26, m, 40); turret.position.y = 0.13; J.base.add(turret);
  J.sh = new THREE.Group(); J.sh.position.y = 0.32; J.base.add(J.sh);
  const shj = cyl(0.13, 0.13, 0.34, dk, 32); shj.rotation.x = Math.PI / 2; J.sh.add(shj);
  const up = rbox(0.18, 0.95, 0.2, m, 0.07); up.position.y = 0.47; J.sh.add(up);
  J.el = new THREE.Group(); J.el.position.y = 0.95; J.sh.add(J.el);
  const elj = cyl(0.11, 0.11, 0.3, dk, 32); elj.rotation.x = Math.PI / 2; J.el.add(elj);
  const fo = rbox(0.15, 0.75, 0.16, m, 0.06); fo.position.y = 0.37; J.el.add(fo);
  J.wr = new THREE.Group(); J.wr.position.y = 0.76; J.el.add(J.wr);
  const wrj = cyl(0.075, 0.075, 0.2, dk, 24); wrj.rotation.x = Math.PI / 2; J.wr.add(wrj);
  J.tool = new THREE.Group(); J.tool.position.y = 0.08; J.wr.add(J.tool);
  const fl = cyl(0.07, 0.07, 0.08, MAT.steel, 24); fl.position.y = 0.04; J.tool.add(fl);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(s); g.userData.J = J; return g;
}
function pose(arm, b, s, e, w) { const J = arm.userData.J; J.base.rotation.y = b; J.sh.rotation.z = s; J.el.rotation.z = e; J.wr.rotation.z = w; }
// pinza de dos dedos para el robot
function gripper() { const g = new THREE.Group(), m = MAT.dsteel; const pal = rbox(0.2, 0.05, 0.1, m, 0.02); pal.position.y = 0.11; g.add(pal);
  const f = [-1, 1].map(s => { const fi = rbox(0.035, 0.16, 0.08, m, 0.015); fi.position.set(s * 0.08, 0.2, 0); g.add(fi); return fi; }); g.userData.f = f; return g; }
function grip(gr, k) { gr.userData.f.forEach((f, i) => { f.position.x = (i ? 1 : -1) * lerp(0.085, 0.045, k); }); }
// coche (silueta de deportivo, sin logotipos) — de Eléctrica
function carModel(color = 0x1f6bff) {
  const g = new THREE.Group(), P = {}, L = 0.45, HW = (1.66 / 2 + 0.14) * L;
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.03 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.5, metalness: 0.2 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1220, roughness: 0.03, metalness: 0.4, clearcoat: 1 });
  const side = (pts, depth, mat, bevel = 0.08) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x * L, y * L) : s.moveTo(x * L, y * L)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: depth * L, bevelEnabled: true, bevelSize: bevel * L, bevelThickness: bevel * L, bevelSegments: 5, curveSegments: 12 }); geo.translate(0, 0, -depth * L / 2); const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
  P.body = side([[2.2, 0.3], [2.22, 0.46], [2.0, 0.55], [1.0, 0.72], [0.4, 0.8], [-0.9, 0.82], [-1.7, 0.86], [-2.2, 0.88], [-2.25, 0.6], [-2.15, 0.3], [-1.75, 0.22], [1.8, 0.22]], 1.66, paint, 0.14); g.add(P.body);
  P.cabin = side([[1.05, 0.72], [0.25, 1.12], [-0.55, 1.13], [-1.55, 0.88], [-1.0, 0.8], [0.4, 0.78]], 1.22, glass, 0.08); g.add(P.cabin);
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.55 * L, 0.06 * L, 0.32 * L), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: 1.6 })); hl.position.set(1.95 * L, 0.56 * L, s * 0.55 * L); hl.rotation.set(0, s * 0.35, -0.25); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06 * L, 0.08 * L, 0.6 * L), new THREE.MeshStandardMaterial({ color: 0xff2030, emissive: 0xff2030, emissiveIntensity: 1.2 })); tl.position.set(-2.27 * L, 0.78 * L, s * 0.45 * L); g.add(tl);
    const arch = (x) => { const a = new THREE.Mesh(new THREE.CircleGeometry(0.47 * L, 40), dark); a.position.set(x * L, 0.38 * L, s * (HW + 0.004)); a.rotation.y = s > 0 ? 0 : Math.PI; g.add(a); };
    arch(1.38); arch(-1.4);
  }
  P.wheels = [];
  for (const [x, z] of [[1.38, 1], [-1.4, 1], [1.38, -1], [-1.4, -1]]) {
    const w = new THREE.Group(); w.position.set(x * L, 0.38 * L, z * (HW - 0.02)); g.add(w);
    const tire = cyl(0.38 * L, 0.38 * L, 0.3 * L, MAT.rubber, 40); tire.rotation.x = Math.PI / 2; w.add(tire);
    const rim = cyl(0.3 * L, 0.3 * L, 0.31 * L, metal(0x2a2c31, 0.3), 10); rim.rotation.x = Math.PI / 2; w.add(rim);
    P.wheels.push(w);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData.P = P; g.userData.paint = paint; return g;
}
// suelo espejo continuo (reflector + capa oscura + sombras + rejilla)
function buildFloor() {
  const W2 = 520, D2 = 90, cx = 170, cz = -10;
  const refl = new Reflector(new THREE.PlaneGeometry(W2, D2), { textureWidth: 540 * PR, textureHeight: 960 * PR, color: 0x6f7c99 }); refl.rotation.x = -Math.PI / 2; refl.position.set(cx, 0, cz); scene.add(refl);
  const d = new THREE.Mesh(new THREE.PlaneGeometry(W2, D2), new THREE.MeshBasicMaterial({ color: 0x050812, transparent: true, opacity: 0.8 })); d.rotation.x = -Math.PI / 2; d.position.set(cx, 0.002, cz); scene.add(d);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(W2, D2), new THREE.ShadowMaterial({ opacity: 0.55 })); sh.rotation.x = -Math.PI / 2; sh.position.set(cx, 0.004, cz); sh.receiveShadow = true; scene.add(sh);
  const pts = []; for (let z = cz - D2 / 2; z <= cz + D2 / 2; z += 2) pts.push(cx - W2 / 2, 0, z, cx + W2 / 2, 0, z); for (let x = cx - W2 / 2; x <= cx + W2 / 2; x += 2) pts.push(x, 0, cz - D2 / 2, x, 0, cz + D2 / 2);
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  S.gridM = new THREE.LineBasicMaterial({ color: 0x4a5a8c, transparent: true, opacity: 0.22 }); const gr = new THREE.LineSegments(gg, S.gridM); gr.position.y = 0.006; scene.add(gr);
}
// luces que acompañan a la acción (siempre las mismas: no cambia el número de luces y no se recompilan los sombreadores)
function buildRig() {
  const key = new THREE.SpotLight(0xfff3e6, 260, 60, 0.55, 0.65, 1.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.radius = 4; key.shadow.camera.near = 1; key.shadow.camera.far = 60;
  scene.add(key); scene.add(key.target);
  const a = new THREE.PointLight(0x37c6ff, 40, 22, 1.6), b = new THREE.PointLight(0xff7a3a, 34, 22, 1.6), f = new THREE.PointLight(0xbfdcff, 16, 26, 1.5);
  scene.add(a, b, f); S.rig = { key, a, b, f };
}
// coloca las luces alrededor de un foco: c = centro (mundo), yaw = hacia dónde mira la escena (radianes), k = tamaño, pw = potencia
function rigAt(c, yaw = 0, k = 1, pw = 1, angle = 0.55) {
  const R = S.rig, rot = (x, z) => v3(c.x + x * Math.cos(yaw) + z * Math.sin(yaw), 0, c.z - x * Math.sin(yaw) + z * Math.cos(yaw));
  const kp = rot(-3 * k, 6 * k); R.key.position.set(kp.x, c.y + 9 * k, kp.z); R.key.target.position.copy(c); R.key.intensity = 150 * pw * k * k; R.key.distance = 60 * k; R.key.angle = angle;
  const ap = rot(-5 * k, -3 * k); R.a.position.set(ap.x, c.y + 3 * k, ap.z); R.a.intensity = 30 * pw * k * k; R.a.distance = 22 * k;
  const bp = rot(5 * k, -3 * k); R.b.position.set(bp.x, c.y + 3.5 * k, bp.z); R.b.intensity = 26 * pw * k * k; R.b.distance = 22 * k;
  const fp = rot(0, 9 * k); R.f.position.set(fp.x, c.y + 4 * k, fp.z); R.f.intensity = 16 * pw * k * k; R.f.distance = 26 * k;
}
function lerpRig(A, B, e) {        // A, B: [c, yaw, k, pw, angle]
  const c = A[0].clone().lerp(B[0], e);
  rigAt(c, lerp(A[1], B[1], e), lerp(A[2], B[2], e), lerp(A[3], B[3], e), lerp(A[4] || 0.55, B[4] || 0.55, e));
}

// ---------------------------------------------------------------- 0 · el graduado: birrete → casco que no llega (gancho), «¿qué te falta?», y la respuesta (el máster) al final
// Zona «grad»: al final de la línea, girada 180°: en coordenadas locales el graduado mira hacia +x (= hacia la línea, -x del mundo).
const GX = 72;
function buildGrad() {
  const Z = zone('grad', GX); Z.rotation.y = Math.PI;
  const ped = cyl(0.95, 1.0, 0.22, plastic(0x161a24, 0.3), 64); ped.position.y = 0.11; Z.add(ped); S.ped = ped;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.975, 0.018, 8, 96), glowM(0x47d6ff, 3)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.205; ped.add(rim); rim.position.y = 0.1;
  // graduado: maniquí blanco con toga azul marino y estola amarilla
  const body = plastic(0xf1f3f7, 0.18), d = makeDoll(body); d.scale.setScalar(1.6); d.position.y = 0.22; d.rotation.y = Math.PI / 2; Z.add(d); S.grad = d;
  const gown = new THREE.Mesh(new THREE.LatheGeometry([v3(0.001, 0.88, 0), v3(0.1, 0.875, 0), v3(0.155, 0.84, 0), v3(0.17, 0.7, 0), v3(0.19, 0.4, 0), v3(0.23, 0.1, 0), v3(0.245, 0.04, 0), v3(0.001, 0.04, 0)].reverse().map(p => new THREE.Vector2(p.x, p.y)), 48), plastic(PL.navy, 0.24));
  gown.castShadow = true; d.add(gown);
  for (const s of [-1, 1]) { const st = rbox(0.05, 0.36, 0.012, plastic(PL.yellow, 0.2), 0.01); st.position.set(s * 0.055, 0.68, 0.135); st.rotation.x = 0.12; d.add(st); }
  const J = d.userData.J;
  for (const sd of ['shL', 'shR', 'elL', 'elR']) J[sd].children.forEach(o => { if (o.isMesh) o.material = plastic(PL.navy, 0.24); });   // mangas de la toga
  S.dip = diploma(); S.dip.scale.setScalar(0.9); J.hR.add(S.dip); S.dip.position.set(0, -0.02, 0.02);
  // birrete (gancho y final) y casco
  S.bir = birrete(); S.bir.scale.setScalar(0.34); Z.add(S.bir);
  S.hat = hardHat(); S.hat.scale.setScalar(0.3); Z.add(S.hat);
  S.flashS = sparks(Z, 90, 0xfff0b0, 0.07);
  S.conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.05, 0.03), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.4, metalness: 0.3 }), 240);
  S.conf.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(240 * 3), 3); S.conf.frustumCulled = false; Z.add(S.conf);
  for (let i = 0; i < 240; i++) S.conf.setColorAt(i, _c.set([PL.yellow, PL.pink, PL.sky, PL.green, PL.orange, 0xffffff][i % 6]));
  // barrera invisible: anillo rojo que se enciende cuando el casco choca
  S.bar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 8, 64), new THREE.MeshBasicMaterial({ color: 0xff3b4e, transparent: true, toneMapped: false })); S.bar.rotation.x = Math.PI / 2; Z.add(S.bar);
  S.barX = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (q, w, h) => { q.strokeStyle = '#ff4d5e'; q.lineWidth = 46; q.lineCap = 'round'; q.beginPath(); q.moveTo(50, 50); q.lineTo(206, 206); q.moveTo(206, 50); q.lineTo(50, 206); q.stroke(); }), transparent: true, depthWrite: false, toneMapped: false })); S.barX.renderOrder = 9; Z.add(S.barX);
  S.q = qmark(new THREE.MeshPhysicalMaterial({ color: 0xffc21a, emissive: 0xff9a00, emissiveIntensity: 0.55, roughness: 0.2, clearcoat: 1 })); S.q.scale.setScalar(0.42); Z.add(S.q);
  // bloque «MÁSTER» (sale de la interrogación y entra en el casco)
  S.mblock = rbox(0.62, 0.2, 0.2, plastic(PL.yellow, 0.18), 0.05); Z.add(S.mblock);
  const mf = facePlane(canvasTex(512, 160, (q, w, h) => { q.fillStyle = '#10131a'; q.font = '900 104px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('MÁSTER', w / 2, h / 2 + 6); }), 0.56, 0.175); mf.position.z = 0.101; S.mblock.add(mf);
  const mb = mf.clone(); mb.position.z = -0.101; mb.rotation.y = Math.PI; S.mblock.add(mb);
  S.wave = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false })); S.wave.rotation.x = -Math.PI / 2; S.wave.position.y = 0.03; Z.add(S.wave);
  // sello «profesión regulada»
  const seal = new THREE.Group(); Z.add(seal); S.seal = seal;
  const sd2 = cyl(0.42, 0.42, 0.08, MAT.gold, 48); sd2.rotation.x = Math.PI / 2; seal.add(sd2);
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, tk = rbox(0.07, 0.07, 0.07, MAT.gold, 0.02); tk.position.set(Math.cos(a) * 0.43, Math.sin(a) * 0.43, 0); tk.rotation.z = a + Math.PI / 4; seal.add(tk); }
  const sf = facePlane(canvasTex(512, 512, (q, w, h) => { q.fillStyle = '#8a5a12'; q.beginPath(); q.arc(256, 256, 214, 0, 7); q.lineWidth = 14; q.strokeStyle = '#8a5a12'; q.stroke();
    q.font = '900 170px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('★', 256, 250); }), 0.8, 0.8); sf.position.z = 0.045; seal.add(sf);
  for (const s of [-1, 1]) { const rb = rbox(0.14, 0.5, 0.02, plastic(PL.red, 0.25), 0.01); rb.position.set(s * 0.14, -0.5, -0.02); rb.rotation.z = s * 0.25; seal.add(rb); }
  S.sealL = pill('PROFESIÓN REGULADA', '#ffd76a', 'rgba(16,20,30,.9)', 1.25, 64); Z.add(S.sealL);
  // candado y llave (grado + máster = llave que habilita)
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
  // años: 4 (grado) + 2 (máster)
  S.years = []; for (let i = 0; i < 6; i++) { const c = rbox(0.3, 0.3, 0.3, plastic(i < 4 ? PL.blue : PL.yellow, 0.18), 0.06); Z.add(c); S.years.push(c);
    const f = facePlane(canvasTex(256, 256, (q, w, h) => { q.fillStyle = '#ffffff'; q.font = '900 150px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(String(i + 1), w / 2, h / 2 + 8); }), 0.24, 0.24); f.position.z = 0.151; c.add(f);
    const f2 = f.clone(); f2.rotation.y = Math.PI / 2; f2.position.set(0.151, 0, 0); c.add(f2); }
  S.yGr = pill('GRADO · 4 AÑOS', '#9fd0ff', 'rgba(16,20,30,.9)', 1.0, 62); Z.add(S.yGr);
  S.yMa = pill('MÁSTER · 2', '#ffd76a', 'rgba(16,20,30,.9)', 0.8, 62); Z.add(S.yMa);
  S.ySix = pill('6 AÑOS', '#ffffff', 'rgba(255,170,30,.92)', 0.8, 74); Z.add(S.ySix);
  // marcapáginas («guárdalo») y bocadillo
  const bm = new THREE.Shape(); bm.moveTo(-0.22, 0.34); bm.lineTo(0.22, 0.34); bm.lineTo(0.22, -0.34); bm.lineTo(0, -0.17); bm.lineTo(-0.22, -0.34); bm.closePath();
  S.bmark = new THREE.Mesh(new THREE.ExtrudeGeometry(bm, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 4 }), plastic(PL.yellow, 0.18)); S.bmark.geometry.center(); S.bmark.castShadow = true; Z.add(S.bmark);
  const bub = new THREE.Shape(); { const w = 0.8, h = 0.5, r = 0.18; bub.moveTo(-w / 2 + r, -h / 2); bub.lineTo(-0.05, -h / 2); bub.lineTo(-0.2, -h / 2 - 0.18); bub.lineTo(-0.2, -h / 2); bub.lineTo(-w / 2 + r, -h / 2);
    bub.quadraticCurveTo(-w / 2, -h / 2, -w / 2, -h / 2 + r); bub.lineTo(-w / 2, h / 2 - r); bub.quadraticCurveTo(-w / 2, h / 2, -w / 2 + r, h / 2); bub.lineTo(w / 2 - r, h / 2); bub.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - r); bub.lineTo(w / 2, -h / 2 + r); bub.quadraticCurveTo(w / 2, -h / 2, w / 2 - r, -h / 2); bub.lineTo(-0.05, -h / 2); }
  S.bubble = new THREE.Mesh(new THREE.ExtrudeGeometry(bub, { depth: 0.06, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 4 }), plastic(0xffffff, 0.2)); S.bubble.castShadow = true; Z.add(S.bubble);
  S.dots = [0, 1, 2].map(i => { const s = sph(0.05, plastic(PL.blue, 0.2)); s.position.set(-0.2 + i * 0.2, 0, 0.1); S.bubble.add(s); return s; });
  S.gradZ = Z;
}
const HEAD_Y = () => 0.22 + 1.6 * 1.07;        // altura de la coronilla del graduado (local)
const HAT_Y = 0.22 + 1.6 * 1.0;                 // el casco puesto: el ala a la altura de la frente
const BIR0 = v3(0, 3.3, 0), CAM0 = [v3(1.8, 3.2, 0.5), v3(0, 3.26, 0.04), 34];    // primer (y último) fotograma: el birrete girando en el aire
function birSpin(t) { return t * 2.6; }
function gradAt(t) {
  const Z = S.gradZ, J = S.grad.userData.J, H0 = v3(0, HAT_Y, 0);
  const tEnd = END, tToss = K.te2 + 0.12;
  // ---- graduado: brazos (lanza el birrete, levanta el diploma, dirige la fábrica)
  const tLand = K.master1 + 0.42, up = env(t, -1, K.y1 + 0.2, 0.01, 0.5), dir = env(t, K.dirigiendo - 0.3, K.falta2 + 0.2, 0.4, 0.5), cheer = env(t, tLand, K.regulada + 0.3, 0.12, 0.5), toss = env(t, K.guardalo + 0.1, tEnd + 1, 0.4, 0.01);
  J.shR.rotation.z = lerp(0.18, 2.75, Math.max(up, cheer)); J.shR.rotation.x = -1.35 * dir;
  J.elR.rotation.z = 0.25 * Math.max(up, cheer);
  J.shL.rotation.z = -lerp(0.18, 2.6, Math.max(up * 0.85, cheer));
  J.shL.rotation.x = -1.0 * toss * (t < tToss + 0.25 ? 1 : 1 - clamp((t - tToss - 0.25) / 0.4)) - (t > tToss && t < tToss + 0.3 ? 1.2 * Math.sin((t - tToss) / 0.3 * Math.PI) : 0);
  J.elL.rotation.x = -0.9 * toss;
  J.neck.rotation.z = 0.12 * up - 0.18 * env(t, K.y1, K.al1, 0.3, 0.3);
  S.grad.updateMatrixWorld(true); const handL = new THREE.Vector3(); J.hL.getWorldPosition(handL); Z.worldToLocal(handL);
  // ---- birrete: vuela al principio (se transforma en casco) y vuelve a volar al final (bucle)
  const morph = clamp((t - (K.industrial1 - 0.12)) / 0.42), endFly = t > K.guardalo + 0.2;
  let bk = 0;
  if (t < K.industrial1 + 0.4) {
    bk = 1 - sm5(clamp((morph - 0.35) / 0.4));
    const sq = Math.sin(clamp(morph / 0.5) * Math.PI) * 0.45;
    S.bir.position.copy(BIR0).add(v3(0, 0.05 * Math.sin(t * 3), 0));
    S.bir.rotation.set(0.35 + 0.15 * Math.sin(t * 2.2), birSpin(t), 0.2 * Math.sin(t * 1.7));
    S.bir.scale.set(0.34 * (1 + sq), 0.34 * (1 - sq * 1.2), 0.34 * (1 + sq));
  } else if (endFly) {
    // en la mano izquierda y lanzado: termina exactamente como empezó el vídeo
    const u = clamp((t - tToss) / (tEnd - tToss)), e = sm5(u), hand = handL.clone().add(v3(0.05, 0.06, 0));
    bk = clamp((t - K.guardalo - 0.2) / 0.25);
    const p = hand.clone().lerp(BIR0, e); p.y += 0.5 * Math.sin(Math.PI * e) * (1 - e);
    S.bir.position.copy(t < tToss ? hand.clone().add(v3(0, 0.03 * Math.sin(t * 4), 0)) : p);
    const spinEnd = birSpin(tEnd) - (tEnd - t) * 2.6 - (1 - e) * 6.0;
    S.bir.rotation.set(t < tToss ? 0.2 : lerp(0.2, 0.35 + 0.15 * Math.sin(t * 2.2), e), t < tToss ? 0.4 : spinEnd + (1 - e) * 6.0, t < tToss ? 0 : 0.2 * Math.sin(t * 1.7) * e);
    S.bir.scale.setScalar(0.34 * Math.max(0.001, bk));
  }
  S.bir.visible = bk > 0.003;
  // ---- casco: nace del birrete, baja y se queda flotando (barrera), luego encaja con el máster
  const hk = sm5(clamp((morph - 0.3) / 0.45)), born = pop(t, K.industrial1 + 0.02, 0.45);
  const hover = H0.clone().add(v3(0, 0.36, 0));
  let hp = BIR0.clone(), hs = born, hrx = 0, hrz = 0;
  if (t > K.y1 - 0.1) {
    const u = clamp((t - (K.y1 - 0.1)) / (K.no1 + 0.08 - (K.y1 - 0.1)));
    hp = BIR0.clone().lerp(hover, sm5(u));
    const b1 = Math.max(0, t - (K.no1 + 0.08)), b2 = Math.max(0, t - (K.industrial2 + 0.02));
    hp.y += 0.12 * Math.exp(-b1 * 7) * Math.abs(Math.sin(b1 * 16)) * (b1 > 0 ? 1 : 0) + 0.08 * Math.exp(-b2 * 7) * Math.abs(Math.sin(b2 * 16)) * (b2 > 0 ? 1 : 0);
    hrz = 0.08 * Math.sin(t * 5.2) * Math.exp(-Math.max(0, t - K.no1) * 0.6) + 0.025 * Math.sin(t * 2.3); hrx = 0.04 * Math.sin(t * 3.7);
  }
  if (t > tLand - 0.22) {      // encaja: baja del todo y aplasta un poco
    const u = clamp((t - (tLand - 0.22)) / 0.22);
    hp = hp.clone().lerp(H0.clone().add(v3(0, -0.005, 0)), u * u);
    hrz *= 1 - u; hrx *= 1 - u;
    if (t > tLand) { const q = t - tLand; hs = 1 + 0.12 * Math.exp(-q * 9) * Math.sin(q * 30); }
  }
  if (t > tLand) { hp = H0.clone(); hrx = 0; hrz = 0; }
  S.hat.position.copy(hp); S.hat.rotation.set(hrx, t < K.y1 - 0.1 ? birSpin(t) * 0.6 : 0, hrz);
  S.hat.scale.set(0.3 * hs * (t > tLand && t < tLand + 0.3 ? 1 + 0.06 * Math.exp(-(t - tLand) * 9) : 1), 0.3 * hs * (t > tLand && t < tLand + 0.3 ? 1 - 0.1 * Math.exp(-(t - tLand) * 9) : 1), 0.3 * hs);
  S.hat.visible = hs > 0.003 && hk > 0.001 || t > K.industrial1 + 0.1;
  S.hat.userData.sticker.visible = t > K.master1 + 0.3;
  // chispas de la transformación y del aterrizaje
  if (t > K.industrial1 - 0.1 && t < K.industrial1 + 0.9) { S.flashS.visible = true; burst(S.flashS, BIR0, t, K.industrial1 + 0.08, 0.9, 0.7, false, 1.2); S.flashS.material.opacity = clamp(1 - (t - K.industrial1 - 0.08) / 0.7); }
  else if (t > tLand - 0.05 && t < tLand + 0.9) { S.flashS.visible = true; burst(S.flashS, H0.clone().add(v3(0, 0.15, 0)), t, tLand, 1.0, 0.8, false, 2.5); S.flashS.material.opacity = clamp(1 - (t - tLand) / 0.8); }
  else S.flashS.visible = false;
  // ---- barrera: anillo rojo y ✕ al chocar
  const hit = Math.max(Math.exp(-Math.max(0, t - K.no1 - 0.08) * 5) * (t > K.no1 + 0.08 ? 1 : 0), Math.exp(-Math.max(0, t - K.industrial2) * 5) * (t > K.industrial2 ? 1 : 0)) * (t < tLand - 0.3 ? 1 : 0);
  S.bar.visible = hit > 0.02; S.bar.position.copy(hover).add(v3(0, -0.05, 0)); S.bar.scale.setScalar(0.75 + (1 - hit) * 0.6); S.bar.material.opacity = hit; S.bar.material.color.setRGB(2.4, 0.35, 0.45);
  lookLab(S.barX, hit * 1.2, hover.clone().add(v3(0.0, -0.2, 0.0))); S.barX.scale.setScalar(0.8 + 0.4 * hit);
  // ---- interrogación en el hueco (desde «qué» hasta que se convierte en el bloque del máster)
  const gap = H0.clone().lerp(hover, 0.55).add(v3(0, 0.02, 0));
  const qk = pop(t, K.que1, 0.4) * (1 - clamp((t - K.master1 - 0.02) / 0.12));
  show(S.q, qk * 0.42); S.q.position.copy(gap); S.q.rotation.y = 0.3 * Math.sin(t * 1.4) + Math.PI / 2 - 0.25; S.q.scale.setScalar(Math.max(0.0001, qk * 0.38));
  // ---- el máster: bloque que nace de la interrogación y sube al casco
  const mk = pop(t, K.master1, 0.3) * (1 - clamp((t - (K.master1 + 0.38)) / 0.08));
  const mu = sm5(clamp((t - (K.master1 + 0.22)) / 0.18));
  S.mblock.visible = mk > 0.01; S.mblock.scale.setScalar(Math.max(0.001, mk) * 0.55); S.mblock.position.copy(gap.clone().lerp(hover.clone().add(v3(0, 0.05, 0)), mu)); S.mblock.rotation.set(0, Math.PI / 2 + 0.2 * (1 - mu), 0);
  // ---- confeti (gancho) y celebración (aterrizaje)
  const cA = env(t, -1, K.al1 + 0.6, 0.01, 0.6), cB = env(t, tLand, K.regulada + 0.8, 0.05, 0.6), cC = env(t, K.cuentame - 0.3, tEnd + 1, 0.4, 0.01);
  const ck = Math.max(cA, cB, cC); S.conf.visible = ck > 0.01;
  if (S.conf.visible) for (let i = 0; i < 240; i++) {
    const base = i < 120 ? 0 : tLand, life = 3.2, tt = ((t - base) + hash(i) * life) % life, x = (hash(i * 3) - 0.5) * 3.2, z = (hash(i * 5) - 0.5) * 3.2;
    _p.set(x + 0.2 * Math.sin(tt * 2 + i), 4.4 - tt * 1.25, z + 0.2 * Math.cos(tt * 1.7 + i));
    _e.set(tt * 4 + i, tt * 3 + i * 0.7, tt * 2); _q.setFromEuler(_e); _s.setScalar(ck * (0.7 + hash(i * 7) * 0.8)); _m4.compose(_p, _q, _s); S.conf.setMatrixAt(i, _m4);
  }
  S.conf.instanceMatrix.needsUpdate = true;
  // ---- onda en el suelo al encajar
  const wv = clamp((t - tLand) / 0.9); S.wave.visible = t > tLand && wv < 1; S.wave.scale.setScalar(1 + wv * 3.5); S.wave.material.opacity = (1 - wv) * 0.9; S.wave.material.color.setRGB(1.4, 2.2, 2.6);
  S.dip.visible = t < K.dirigiendo || t > tLand;
  // ---- sello, candado y llave, años, marcapáginas, bocadillo
  const sk = pop(t, K.profesion, 0.32) * (1 - clamp((t - (K.en3 - 0.2)) / 0.3));
  show(S.seal, sk * 0.42); S.seal.position.set(0.95, 1.2 + 0.6 * (1 - clamp((t - K.profesion) / 0.2)), 0.62); S.seal.rotation.set(0, Math.PI / 2 - 0.35, 0);
  lookLab(S.sealL, env(t, K.regulada, K.en3 - 0.1, 0.2, 0.3), v3(0.95, 0.78, 0.62)); S.sealL.scale.setScalar(0.85);
  const lk = pop(t, K.ejercerla, 0.32) * (1 - clamp((t - (K.en3 - 0.1)) / 0.3));
  show(S.lock, lk * 0.62); S.lock.position.set(0.85, 1.3, -0.95); S.lock.rotation.set(0, 0.35, 0);
  const open = sm5(clamp((t - K.habilitante - 0.12) / 0.25)); S.shackle.position.y = 0.25 + 0.14 * open; S.shackle.rotation.y = 1.2 * open;
  const g1 = pop(t, K.grado, 0.3), m1 = pop(t, K.master2, 0.3), join = sm5(clamp((t - (K.master2 + 0.15)) / 0.25)), ins = sm5(clamp((t - (K.habilitante - 0.25)) / 0.3));
  S.keyG.visible = g1 > 0.01 && t < K.en3 + 0.1; S.keyG.rotation.order = 'YXZ'; S.keyG.position.set(0.85 + 0.12 * ins, 1.3 - 0.02, lerp(0.15, -0.95 + 0.62, ins)); S.keyG.rotation.set(Math.PI / 2 * clamp((t - K.habilitante) / 0.18), Math.PI / 2 + 0.35, 0);
  S.kGrado.scale.setScalar(Math.max(0.001, g1)); S.kGrado.position.set(lerp(-0.42, -0.26, join), 0, 0);
  S.kMaster.scale.setScalar(Math.max(0.001, m1)); S.kMaster.position.set(lerp(0.42, 0.26, join), lerp(0.25, 0, join), 0);
  S.kBit.visible = join > 0.5; S.kBit.position.x = 0.5; S.kBit.scale.setScalar(Math.max(0.001, clamp((join - 0.5) * 2)));
  const yr = [K.y4, K.y4 + 0.09, K.y4 + 0.18, K.y4 + 0.27, K.dos - 0.04, K.dos + 0.06];
  const six = sm5(clamp((t - K.seis) / 0.45));
  S.years.forEach((c, i) => { const k = pop(t, yr[i], 0.3) * (t < K.guardalo ? 1 : 1 - clamp((t - K.guardalo) / 0.3));
    const a = lerp(-0.92, 0.92, i / 5), row = v3(1.2, 0.36, a);
    const ring = v3(Math.cos(i / 6 * Math.PI * 2) * 1.12, 0.15, Math.sin(i / 6 * Math.PI * 2) * 1.12);
    c.visible = k > 0.01; c.scale.setScalar(Math.max(0.001, k)); c.position.copy(row.lerp(ring, six)); c.position.y += Math.sin(Math.PI * six) * 0.5; c.rotation.set(0, Math.PI / 2 + six * (i / 6 * Math.PI * 2), 0); });
  lookLab(S.yGr, env(t, K.y4 + 0.2, K.seis - 0.05, 0.2, 0.2), v3(1.25, 0.76, 0.35)); S.yGr.scale.setScalar(0.7);
  lookLab(S.yMa, env(t, K.dos + 0.1, K.seis - 0.05, 0.2, 0.2), v3(1.25, 0.76, -0.75)); S.yMa.scale.setScalar(0.7);
  lookLab(S.ySix, env(t, K.seis + 0.25, K.si3 - 0.1, 0.2, 0.3), v3(0.9, 0.62, 0.0)); S.ySix.scale.setScalar(0.85 + 0.15 * pop(t, K.seis + 0.25, 0.3));
  S.ped.position.y = 0.11 + 0.0 * six;
  const bmk = pop(t, K.guardalo, 0.35) * (1 - clamp((t - K.te2) / 0.3));
  show(S.bmark, bmk * 0.62); S.bmark.position.set(0.9, 1.95 + 0.5 * (1 - clamp((t - K.guardalo) / 0.25)), -0.62); S.bmark.rotation.set(0, Math.PI / 2 - 0.3, 0.12 * Math.sin(t * 3));
  const bbk = pop(t, K.cuentame, 0.35) * (1 - clamp((t - K.te2 - 0.25) / 0.3));
  show(S.bubble, bbk * 0.62); S.bubble.position.set(0.8, 2.4, 0.5); S.bubble.rotation.set(0, Math.PI / 2 + 0.25, 0);
  S.dots.forEach((s, i) => { s.position.y = 0.05 * Math.max(0, Math.sin(t * 9 - i * 0.9)); });
  // ---- cámara
  return camKeys(t, gradKeys(t), Z);
}
function gradKeys(t) {
  if (t < 30) {
    const ga = H0g(), hov = ga.clone().add(v3(0, 0.36, 0));
    return [
      [0, CAM0[0].toArray(), CAM0[1].toArray(), CAM0[2]],
      [K.industrial1 + 0.35, [1.6, 3.2, 0.45], [0, 3.26, 0.02], 34],
      [K.acabas + 0.5, [4.2, 2.45, 1.35], [0, 2.1, 0], 34],
      [K.y1 + 0.2, [4.7, 2.3, 1.45], [0, 2.0, 0], 34],
      [K.no1 + 0.3, [3.9, 2.25, 1.15], [0, 2.0, 0], 34],
      [K.al1, [3.0, 2.2, 0.9], [0, 2.05, 0], 34],
      [K.que1 + 0.15, [1.9, hov.y - 0.08, 0.5], [0, hov.y - 0.12, 0], 34],
      [K.y2, [1.6, hov.y - 0.08, 0.42], [0, hov.y - 0.12, 0], 34],
    ];
  }
  const hov = H0g().clone().add(v3(0, 0.36, 0));
  return [
    [K.y_q, [-12, 6.0, -2.6], [22, 0.8, 0.3], 40],            // (lo empalma la vista de la fábrica entera, con el graduado de espaldas)
    [K.falta2 + 0.1, [-4.5, 3.6, -4.2], [0, 1.9, 0], 36],
    [K.industrial3 + 0.15, [2.5, 2.4, -1.25], [0, hov.y - 0.1, 0], 34],
    [K.master1 + 0.5, [2.6, 2.3, -1.1], [0, 2.05, 0], 34],
    [K.profesion + 0.2, [4.3, 1.95, -0.7], [0.4, 1.4, 0.15], 34],
    [K.ejercerla + 0.25, [4.2, 1.85, -0.9], [0.4, 1.35, -0.4], 34],
    [K.habilitante + 0.3, [3.6, 1.6, -1.1], [0.7, 1.25, -0.75], 34],
    [K.y4 - 0.1, [5.3, 1.7, -0.2], [0.8, 1.0, 0.0], 36],
    [K.dos + 0.3, [5.4, 1.75, -0.1], [0.8, 1.0, 0.0], 36],
    [K.seis + 0.5, [-3.2, 3.0, -4.6], [1.0, 1.4, 0.0], 36],
    [K.fabrica3, [-6.5, 4.4, -1.6], [14, 0.9, 0.3], 40],
    [K.si3 + 0.25, [4.4, 2.3, -1.6], [0.4, 1.75, -0.1], 34],
    [K.guardalo + 0.3, [3.6, 2.25, -1.3], [0.4, 1.85, -0.2], 34],
    [K.te2, [3.0, 2.45, -0.6], [0.2, 2.15, 0.0], 34],
    [END - 0.6, [2.4, 3.05, 0.6], [0.02, 3.25, 0.04], 34],
    [END, CAM0[0].toArray(), CAM0[1].toArray(), CAM0[2]],
  ];
}
function H0g() { return v3(0, HAT_Y, 0); }

// ---------------------------------------------------------------- 1 · la nota de corte: columna de 0 a 14 altísima, la Politécnica, el robot que suelda «13,525» y la más alta
const NX = 84, NZ = -40;
const COLH = 6.3;          // altura de la columna (14 puntos)
function buildNota() {
  const Z = zone('nota', NX); Z.position.z = NZ;
  const base = rbox(1.6, 0.3, 1.6, plastic(0x161a24, 0.3), 0.08); base.position.y = 0.15; Z.add(base);
  const glass = cyl(0.42, 0.42, COLH, MAT.glass, 48); glass.position.y = 0.3 + COLH / 2; Z.add(glass); glass.castShadow = false;
  const cap = cyl(0.5, 0.5, 0.14, plastic(0x161a24, 0.3), 48); cap.position.y = 0.3 + COLH + 0.07; Z.add(cap);
  S.liq = cyl(0.36, 0.36, 1, new THREE.MeshStandardMaterial({ color: 0x3a1a00, emissive: 0xff8a1f, emissiveIntensity: 1.8, roughness: 0.3 }), 48); Z.add(S.liq); S.liq.castShadow = false;
  S.liqTop = new THREE.Mesh(new THREE.CircleGeometry(0.36, 48), new THREE.MeshBasicMaterial({ color: 0xffd27a, toneMapped: false })); S.liqTop.rotation.x = -Math.PI / 2; Z.add(S.liqTop);
  // marcas de 0 a 14
  for (let i = 0; i <= 14; i++) { const y = 0.3 + i / 14 * COLH, big = i % 7 === 0;
    const tk = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.34 : 0.18, 0.025, 0.025), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, toneMapped: false })); tk.position.set(-0.6 - (big ? 0.08 : 0), y, 0.0); Z.add(tk);
    if (big || i === 13) { const l = label(String(i), { size: 90, w: big ? 0.42 : 0.3, color: i === 14 ? '#ffd76a' : '#cfe6ff', weight: 900 }); l.position.set(-1.05, y, 0); l.layers.set(0); Z.add(l); if (i === 14) S.l14 = l; } }
  // maniquí pequeño al pie, mirando hacia arriba
  const mm = makeDoll(plastic(PL.sky, 0.2)); mm.scale.setScalar(0.9); mm.position.set(1.05, 0, 1.0); mm.rotation.y = -0.6; Z.add(mm); S.nDoll = mm;
  mm.userData.J.neck.rotation.x = -0.55;
  // fachada de universidad genérica (columnas y frontón) a la derecha, detrás
  const U = new THREE.Group(); U.position.set(3.4, 0, -2.6); Z.add(U); S.uni = U;
  const um = plastic(0xeef1f6, 0.25);
  const steps = rbox(4.2, 0.3, 1.6, um, 0.05); steps.position.y = 0.15; U.add(steps);
  const plat = rbox(3.8, 0.2, 1.3, um, 0.05); plat.position.y = 0.4; U.add(plat);
  for (let i = 0; i < 6; i++) { const c = cyl(0.13, 0.15, 2.0, um, 24); c.position.set(-1.6 + i * 0.64, 1.5, 0.35); U.add(c); }
  const arch = rbox(4.0, 0.3, 1.2, um, 0.05); arch.position.y = 2.65; U.add(arch);
  const ped = new THREE.Shape(); ped.moveTo(-2.1, 0); ped.lineTo(2.1, 0); ped.lineTo(0, 0.9); ped.closePath();
  const pg = new THREE.Mesh(new THREE.ExtrudeGeometry(ped, { depth: 1.0, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }), um); pg.position.set(0, 2.8, -0.5); pg.castShadow = true; U.add(pg);
  const wall = rbox(3.6, 2.0, 0.2, plastic(0x9fb2cf, 0.4), 0.03); wall.position.set(0, 1.5, -0.35); U.add(wall);
  U.traverse(o => { if (o.isMesh) o.castShadow = true; });
  S.uniL = pill('POLITÉCNICA DE MADRID', '#ffffff', 'rgba(16,20,30,.9)', 2.2, 70); Z.add(S.uniL);
  // robot que suelda la nota en el aire
  S.wArm = robotArm(PL.orange, 1.1); S.wArm.position.set(1.7, 0, -0.4); Z.add(S.wArm);
  const torch = cyl(0.03, 0.05, 0.3, MAT.dsteel, 16); torch.position.y = 0.2; S.wArm.userData.J.tool.add(torch);
  S.tip = new THREE.Object3D(); S.tip.position.y = 0.36; S.wArm.userData.J.tool.add(S.tip);
  S.weldS = sparks(Z, 140, 0xffc46a, 0.06); S.weldL = sph(0.05, glowM(0xfff2c8, 12)); Z.add(S.weldL);
  // la nota soldada: se escribe de izquierda a derecha y se enfría de blanco a dorado
  S.notaT = canvasTex(1024, 300); S.notaM = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.557), new THREE.MeshBasicMaterial({ map: S.notaT, transparent: true, toneMapped: false, depthWrite: false })); Z.add(S.notaM);
  S.notaM.position.set(0, 0.3 + COLH + 0.75, 0.25);
  // otras columnas (más bajas, sin nombre): es la más alta
  S.others = [];
  for (let i = 0; i < 6; i++) { const h = [0.62, 0.78, 0.55, 0.85, 0.7, 0.9][i] * COLH, x = (i < 3 ? -1 : 1) * (1.6 + (i % 3) * 1.2);
    const g = new THREE.Group(); g.position.set(x, 0, -1.6 - (i % 3) * 0.5); Z.add(g);
    const c = cyl(0.3, 0.3, h, plastic(0x3a4256, 0.3), 32); c.position.y = h / 2; g.add(c); g.userData.h = h; S.others.push(g); }
  S.crown = new THREE.Group(); Z.add(S.crown);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, sp = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 12), MAT.gold); sp.position.set(Math.cos(a) * 0.38, 0.15, Math.sin(a) * 0.38); S.crown.add(sp); }
  const cr = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 10, 40), MAT.gold); cr.rotation.x = Math.PI / 2; S.crown.add(cr);
  S.topL = pill('LA MÁS ALTA · 2025', '#ffd76a', 'rgba(16,20,30,.92)', 1.9, 74); Z.add(S.topL);
  S.notaZ = Z;
}
function drawNota(rev, cool) {      // rev: 0..1 lo escrito; cool: 0 blanco incandescente → 1 dorado
  const g = S.notaT.userData.g, w = 1024, h = 300; g.clearRect(0, 0, w, h);
  g.font = '900 250px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const txt = '13,525', tw = g.measureText(txt).width, x0 = w / 2 - tw / 2;
  g.save(); g.beginPath(); g.rect(0, 0, x0 + tw * rev, h); g.clip();
  const c1 = [255, 250, 230], c2 = [255, 196, 70], c = c1.map((v, i) => Math.round(lerp(v, c2[i], cool)));
  g.shadowColor = `rgba(255,${Math.round(lerp(220, 140, cool))},60,${lerp(1, 0.6, cool)})`; g.shadowBlur = lerp(60, 26, cool);
  g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.fillText(txt, w / 2, h / 2 + 10); g.restore();
  S.notaT.needsUpdate = true;
}
function notaAt(t) {
  const Z = S.notaZ;
  // nivel del líquido: sube con la frase hasta 13,525 / 14 al decir «sobre 14»
  const lv = keyed(t, [[K.y2, 0.02], [K.dificil, 0.05], [K.trece, 0.3], [K.sobre, 0.36], [K.catorce + 0.35, 13.525 / 14], [K.y_end_nota, 13.525 / 14]]);
  const h = Math.max(0.02, lv * COLH); S.liq.scale.set(1, h, 1); S.liq.position.y = 0.3 + h / 2; S.liqTop.position.y = 0.3 + h + 0.001;
  S.liq.material.emissiveIntensity = 1.6 + 1.2 * env(t, K.catorce, K.catorce + 0.8, 0.1, 0.6);
  neonLab(S.l14, 1 + 1.6 * env(t, K.catorce - 0.05, K.catorce + 0.7, 0.08, 0.5));
  // universidad
  const uk = pop(t, K.politecnica - 0.05, 0.45); show(S.uni, uk); S.uni.position.y = -0.4 * (1 - clamp(uk));
  lookLab(S.uniL, env(t, K.politecnica, K.pidio + 0.2, 0.15, 0.3), v3(3.4, 3.95, -2.0)); S.uniL.scale.setScalar(0.95);
  // robot soldador: escribe 13,525 en el aire de izquierda a derecha
  const rev = clamp((t - K.trece) / Math.max(0.5, K.sobre - K.trece - 0.05)), cool = clamp((t - K.sobre) / 0.8);
  const wk = env(t, K.trece - 0.35, K.sobre + 0.25, 0.3, 0.3);
  pose(S.wArm, 1.2 + 0.0, lerp(0.35, -0.55, wk), lerp(0.9, 1.25, wk), lerp(0.3, 0.9, wk));
  S.wArm.userData.J.base.rotation.y = lerp(0.6, 1.95 - 0.55 * rev, wk);
  if (t > K.trece - 0.05) drawNota(rev, cool); else drawNota(0, 0);
  S.notaM.visible = t > K.trece - 0.05; S.notaM.position.set(0, 0.3 + COLH + 0.75, 0.25);
  S.notaM.quaternion.copy(cam.quaternion);
  const tip = new THREE.Vector3(); S.tip.getWorldPosition(tip); Z.worldToLocal(tip);
  const wp = v3(lerp(-0.8, 0.8, rev), 0.3 + COLH + 0.75, 0.3);
  const weld = t > K.trece && t < K.sobre - 0.02;
  S.weldL.visible = weld; S.weldL.position.copy(wp); S.weldL.scale.setScalar(0.8 + 0.4 * Math.sin(t * 60));
  S.weldS.visible = weld || (t > K.sobre && t < K.sobre + 0.5); if (S.weldS.visible) burst(S.weldS, wp, t, 0, 0.9, 0.45, true, 4);
  S.weldS.material.opacity = weld ? 1 : clamp(1 - (t - K.sobre) / 0.5);
  // otras columnas y corona: la más alta
  const ok = sm5(clamp((t - (K.nota - 0.2)) / 0.6));
  S.others.forEach((g, i) => { const k = clamp(ok * 1.4 - i * 0.07); g.visible = k > 0.01; g.scale.set(1, Math.max(0.001, k), 1); });
  const ck = pop(t, K.alta, 0.4); show(S.crown, ck); S.crown.position.y = 0.3 + COLH + 0.2 + 0.3 * (1 - clamp(ck)); S.crown.rotation.y = t * 0.8;
  lookLab(S.topL, env(t, K.universidad, K.y_end_nota + 0.5, 0.2, 0.3), v3(0, 0.3 + COLH + 1.55, 0.3)); S.topL.scale.setScalar(0.9);
  // maniquí: mira arriba y se encoge de hombros con «dificilísimo»
  const J = S.nDoll.userData.J; J.neck.rotation.x = -0.55 - 0.2 * env(t, K.dificil, K.en1 + 0.5, 0.2, 0.4);
  J.shL.rotation.z = -0.2 - 0.5 * env(t, K.dificil, K.en1 + 0.4, 0.2, 0.3); J.shR.rotation.z = 0.2 + 0.5 * env(t, K.dificil, K.en1 + 0.4, 0.2, 0.3);
  return camKeys(t, [
    [K.y2 - 0.45, [2.2, 0.6, 3.8], [0.4, 1.2, 0], 36],
    [K.entrar, [2.0, 0.55, 3.6], [0.2, 1.8, 0], 36],
    [K.dificil + 0.45, [1.7, 0.6, 3.9], [0.0, 4.5, 0], 38],
    [K.politecnica + 0.25, [2.2, 2.7, 9.8], [1.5, 2.6, -1.1], 36],
    [K.trece, [0.3, 7.0, 6.4], [0.0, 7.2, 0.2], 34],
    [K.sobre - 0.1, [0.45, 6.9, 6.2], [0.05, 7.1, 0.2], 34],
    [K.catorce + 0.3, [0.7, 5.9, 7.0], [0.0, 6.3, 0.0], 36],
    [K.nota, [0.6, 4.8, 10.8], [0.0, 4.2, -0.6], 36],
    [K.y_end_nota, [0.5, 4.7, 12.6], [0.0, 4.0, -0.8], 36],
  ], Z);
}
function neonLab(l, k) { if (l) l.material.color.setRGB(k, k, k); }

// ---------------------------------------------------------------- 2 · «crees que es una ingeniería más»: un engranaje solo… y el casco se abre como una navaja suiza con todas
const KX = 122, KZ = -40;
function buildKnife() {
  const Z = zone('knife', KX); Z.position.z = KZ;
  S.kGear = gear(10, 0.32, 0.14, MAT.gold); Z.add(S.kGear);
  S.kHat = hardHat(); S.kHat.scale.setScalar(1.5); Z.add(S.kHat);
  // herramientas que salen del ala como hojas de navaja: brazo + icono
  const icons = [
    () => { const g = new THREE.Group(); const gg = gear(9, 0.13, 0.07, plastic(PL.steel, 0.25)); g.add(gg); g.userData.spin = gg; return g; },                     // mecánica
    () => { const s = new THREE.Shape(); [[0.03, 0.2], [-0.1, -0.01], [0.0, -0.01], [-0.04, -0.2], [0.11, 0.04], [0.01, 0.04]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }), plastic(0xffd23f, 0.2)); m.geometry.center(); const g = new THREE.Group(); g.add(m); return g; },  // electricidad
    () => { const g = new THREE.Group(), gl = MAT.glass; const b = sph(0.11, plastic(PL.green, 0.15)); b.scale.set(1, 0.85, 1); g.add(b); const n = cyl(0.035, 0.04, 0.12, plastic(0xe9f6ff, 0.1), 16); n.position.y = 0.12; g.add(n); return g; },  // química
    () => { const g = new THREE.Group(); const c = rbox(0.2, 0.2, 0.05, plastic(0x1d2230, 0.3), 0.02); g.add(c); for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const p = rbox(0.03, 0.05, 0.02, MAT.gold, 0.005); p.position.set(-0.075 + i * 0.05, s * 0.12, 0); g.add(p); const q = p.clone(); q.rotation.z = Math.PI / 2; q.position.set(s * 0.12, -0.075 + i * 0.05, 0); g.add(q); }
      const core = rbox(0.08, 0.08, 0.06, glowM(0x37e0ff, 2.2), 0.01); g.add(core); return g; },                                                                     // electrónica
    () => { const g = new THREE.Group(); const p = rbox(0.06, 0.16, 0.06, plastic(PL.orange, 0.2), 0.02); p.position.y = -0.04; g.add(p); for (const s of [-1, 1]) { const f = rbox(0.03, 0.1, 0.05, MAT.dsteel, 0.01); f.position.set(s * 0.05, 0.07, 0); f.rotation.z = -s * 0.25; g.add(f); } return g; },  // automática
    () => { const g = new THREE.Group(); [0.08, 0.14, 0.2].forEach((h, i) => { const b = rbox(0.05, h, 0.05, plastic([PL.sky, PL.violet, PL.pink][i], 0.2), 0.012); b.position.set(-0.06 + i * 0.06, h / 2 - 0.1, 0); g.add(b); }); return g; },  // organización
  ];
  const names = ['MECÁNICA', 'ELECTRICIDAD', 'QUÍMICA', 'ELECTRÓNICA', 'AUTOMÁTICA', 'ORGANIZACIÓN'];
  S.tools = icons.map((mk, i) => {
    const piv = new THREE.Group(); Z.add(piv);
    const arm = rbox(0.09, 0.95, 0.06, plastic(0xd8dde6, 0.2), 0.03); arm.position.y = 0.48; piv.add(arm);
    const ic = mk(); ic.position.y = 1.12; ic.scale.setScalar(2.3); piv.add(ic);
    const lb = pill(names[i], '#ffffff', 'rgba(16,20,30,.9)', 0.78, 62); Z.add(lb);
    return { piv, ic, lb };
  });
  S.kRing = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.02, 8, 80), new THREE.MeshBasicMaterial({ color: 0x8fe6ff, transparent: true, toneMapped: false })); S.kRing.rotation.x = Math.PI / 2; Z.add(S.kRing);
  S.knifeZ = Z;
}
const KH = v3(0, 1.35, 0);     // centro del casco
function knifeAt(t) {
  const Z = S.knifeZ;
  // el engranaje solitario: llega (la pieza dorada) y gira solo; luego se mete en el casco
  const gin = sm5(clamp((t - (K.realidad - 0.1)) / 0.35));
  S.kGear.visible = t < K.realidad + 0.3; S.kGear.position.copy(v3(0, 1.3, 0.2).lerp(KH, gin)); S.kGear.rotation.set(0.2, 0.3 * Math.sin(t), -t * 2.2); S.kGear.scale.setScalar(Math.max(0.001, 1 - gin) * (1 + 0.25 * env(t, K.ingenieria2, K.mas + 0.4, 0.15, 0.3)));
  // el casco aparece al decir «en realidad» y se abre con «son todas a la vez»
  const hk = pop(t, K.realidad - 0.05, 0.45);
  show(S.kHat, hk * 1.5); S.kHat.position.copy(KH).add(v3(0, -0.25, 0)); S.kHat.rotation.set(0.25 * Math.sin(t * 0.7) * 0.3 + 0.15, 0.5 + 0.25 * Math.sin(t * 0.5), 0);
  const tilt = sm5(clamp((t - K.asi) / 0.5)); S.kHat.rotation.x = 0.15 - 1.75 * tilt;    // «así es por dentro»: se gira y enseña su interior oscuro
  const T0 = [K.son, K.son + 0.14, K.todas, K.todas + 0.14, K.vez - 0.12, K.vez];
  S.tools.forEach((o, i) => {
    const a = -0.88 + i * 0.352, k = sm5(clamp((t - T0[i]) / 0.32)), close = sm5(clamp((t - (K.asi - 0.1)) / 0.35));
    const ang = lerp(Math.PI * 0.98, a, k) * (1 - close) + Math.PI * 0.98 * close;
    o.piv.visible = k > 0.01 && close < 0.99; o.piv.position.copy(KH).add(v3(0, -0.15, 0.45)); o.piv.rotation.set(0, 0, -ang);
    o.ic.rotation.set(0, t * 1.2 + i, 0); if (o.ic.userData.spin) o.ic.userData.spin.rotation.z = t * 3;
    const tip = v3(0, 1.62, 0).applyAxisAngle(v3(0, 0, 1), -ang).add(o.piv.position);
    lookLab(o.lb, k * (1 - close) * env(t, T0[i] + 0.15, K.asi, 0.2, 0.2), tip.add(v3(0, 0.0, 0.3))); o.lb.scale.setScalar(0.85);
  });
  const rk = env(t, K.son, K.asi, 0.3, 0.3); S.kRing.visible = rk > 0.01; S.kRing.position.copy(KH).add(v3(0, -0.25, 0)); S.kRing.scale.setScalar(1 + 0.5 * rk + 0.05 * Math.sin(t * 6)); S.kRing.material.opacity = rk * 0.8; S.kRing.material.color.setRGB(1.2, 2.2, 2.6);
  // cámara: plano corto del engranaje → se abre → se mete en el casco (a negro)
  const inside = KH.clone().add(v3(0, -0.6, 0.0));
  return camKeys(t, [
    [K.crees - 0.45, [0.4, 1.45, 2.6], [0, 1.3, 0.2], 34],
    [K.mas, [0.3, 1.42, 2.1], [0, 1.3, 0.2], 34],
    [K.realidad + 0.25, [0.5, 1.9, 5.9], [0, 1.5, 0], 36],
    [K.vez + 0.2, [0.4, 2.35, 7.6], [0, 2.0, 0], 36],
    [K.asi + 0.25, [0.3, 1.45, 3.8], [0, 1.15, 0], 36],
    [K.dentro + 0.25, [0.05, 1.15, 1.7], [0, 1.1, 0], 40],
    [K.base0, [0.0, 1.12, 0.55], [0, 1.1, -0.2], 46],
  ], Z);
}

// ---------------------------------------------------------------- 3 · la línea de producción: una estación por asignatura, compuesta en VERTICAL (formato 9:16)
// Todas miran hacia +z; la cámara las recorre. Encuadre de referencia: a 6,5 m se ven ~2,4 m de ancho y ~4,2 m de alto.
const SX = { base: 0, struct: 9, thermo: 18, elec: 27, auto: 36, mat: 45, biz: 54, careers: 63 };
function textPlane(lines, { size = 110, color = '#ffffff', weight = 900, w = 2, glow = null, blur = 0 } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = `${weight} ${size}px Inter`;
  const tw = Math.max(...lines.map(l => g.measureText(l).width)), pad = size * 0.5 + blur;
  c.width = Math.ceil(tw + 2 * pad); c.height = Math.ceil(lines.length * size * 1.12 + 2 * pad);
  g.font = `${weight} ${size}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (glow) { g.shadowColor = glow; g.shadowBlur = blur; }
  g.fillStyle = color; lines.forEach((l, i) => g.fillText(l, c.width / 2, pad + size * 0.56 + i * size * 1.12));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / c.width), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 8; return m;
}
function neon2(txt, color = '#7fe6ff', w = 2.0) {        // rótulo de neón (admite dos líneas con \n)
  const lines = txt.split('\n'), g = new THREE.Group();
  const glow = textPlane(lines, { color, w: w * 1.08, glow: color, blur: 40 }); glow.position.z = -0.01; g.add(glow);
  const l = textPlane(lines, { color: '#ffffff', w }); g.add(l);
  const hgt = w * l.geometry.parameters.height / l.geometry.parameters.width;
  const plate = rbox(w * 1.12, hgt * 1.0, 0.06, new THREE.MeshStandardMaterial({ color: 0x0c0f16, roughness: 0.4, metalness: 0.3 }), 0.03); plate.position.z = -0.05; g.add(plate);
  g.userData = { l, glow, col: new THREE.Color(color), h: hgt }; return g;
}
function station(name, sign, color = '#7fe6ff', w = 3.4, signW = 2.0, signY = 4.15) {
  const Z = zone(name, SX[name]);
  const pl = rbox(w, 0.15, 3.0, plastic(0x141823, 0.3), 0.06); pl.position.y = 0.075; Z.add(pl);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.025, 0.025), glowM(new THREE.Color(color).getHex(), 2.4)); strip.position.set(0, 0.13, 1.5); Z.add(strip);
  let n = null;
  if (sign) { n = neon2(sign, color, signW); n.position.set(0, signY, -1.25); Z.add(n);
    for (const s of [-1, 1]) { const p = cyl(0.035, 0.035, signY, MAT.dsteel, 12); p.position.set(s * signW * 0.52, signY / 2, -1.31); Z.add(p); } }
  return { Z, n, strip };
}
function iconFace(kind) {
  return iconTex((g, w, h) => {
    g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineWidth = 22; g.lineCap = 'round'; g.lineJoin = 'round'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (kind === 0) { g.font = '700 330px Serif'; g.fillText('∫', w / 2 - 40, h / 2 + 10); g.font = 'italic 700 120px Serif'; g.fillText('dx', w / 2 + 110, h / 2 + 60); }
    if (kind === 1) { g.lineWidth = 18; g.beginPath(); g.moveTo(130, 110); g.lineTo(95, 110); g.lineTo(95, 400); g.lineTo(130, 400); g.moveTo(382, 110); g.lineTo(417, 110); g.lineTo(417, 400); g.lineTo(382, 400); g.stroke();
      g.font = '800 70px Inter'; const M = [[2, 0, 1], [1, 3, 0], [0, 1, 4]]; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g.fillText(M[r][c], 170 + c * 86, 165 + r * 92); }
    if (kind === 2) { g.beginPath(); g.arc(225, 300, 105, 0, 7); g.fill(); g.beginPath(); g.moveTo(225, 195); g.quadraticCurveTo(240, 140, 275, 120); g.stroke();
      g.lineWidth = 16; g.beginPath(); g.moveTo(390, 120); g.lineTo(390, 330); g.stroke(); g.beginPath(); g.moveTo(350, 300); g.lineTo(390, 350); g.lineTo(430, 300); g.stroke();
      g.font = '800 64px Inter'; g.fillText('F = m·a', w / 2, 460); }
    if (kind === 3) { const cx = w / 2, cy = h / 2 - 10, R = 110; g.lineWidth = 18; g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      g.beginPath(); g.arc(cx, cy, 62, 0, 7); g.stroke(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; g.beginPath(); g.arc(cx + Math.cos(a) * R * 1.5, cy + Math.sin(a) * R * 1.5, 18, 0, 7); g.fill(); g.beginPath(); g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * R * 1.36, cy + Math.sin(a) * R * 1.36); g.stroke(); } }
    if (kind === 4) { g.lineWidth = 14; g.strokeRect(120, 150, 270, 200); g.beginPath(); g.arc(255, 250, 55, 0, 7); g.stroke();
      g.lineWidth = 8; g.beginPath(); g.moveTo(120, 410); g.lineTo(390, 410); g.moveTo(120, 395); g.lineTo(120, 425); g.moveTo(390, 395); g.lineTo(390, 425); g.moveTo(440, 150); g.lineTo(440, 350); g.moveTo(425, 150); g.lineTo(455, 150); g.moveTo(425, 350); g.lineTo(455, 350); g.stroke();
      g.font = '700 46px Inter'; g.fillText('120', 255, 455); g.save(); g.translate(480, 250); g.rotate(-Math.PI / 2); g.fillText('80', 0, 0); g.restore(); }
  });
}
// ---- 3.0 la base: cinco bloques que caen y se apilan en una torre (los cimientos) y la fábrica se posa encima
const BLKH = 0.58;
function buildBase() {
  const st = station('base', 'LA BASE', '#7fe6ff', 3.4, 1.5, 4.55); S.stBase = st;
  const cols = [PL.blue, PL.violet, PL.green, PL.orange, PL.teal], names = ['CÁLCULO', 'ÁLGEBRA', 'FÍSICA', 'QUÍMICA', 'DIBUJO TÉCNICO'];
  S.blocks = cols.map((c, i) => { const b = rbox(0.72, BLKH, 0.72, plastic(c, 0.2), 0.07); st.Z.add(b);
    const f = facePlane(iconFace(i), 0.5, 0.5); f.position.z = 0.361; b.add(f);
    const l = pill(names[i], '#ffffff', 'rgba(16,20,30,.9)', i === 4 ? 0.82 : 0.6, 60); st.Z.add(l); return { b, l }; });
  S.bDust = sparks(st.Z, 60, 0xcfe6ff, 0.05);
  const slab = new THREE.Group(); st.Z.add(slab); S.slab = slab;
  const sl = rbox(1.9, 0.09, 1.1, plastic(0xe9edf3, 0.3), 0.03); slab.add(sl);
  const fac = new THREE.Group(); fac.position.y = 0.045; slab.add(fac); S.fac = fac;
  const hall = rbox(1.1, 0.42, 0.7, plastic(0xf3f5f9, 0.25), 0.04); hall.position.set(-0.25, 0.21, 0); fac.add(hall);
  for (let i = 0; i < 3; i++) { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.366, 0); s.lineTo(0.366, 0.22); s.closePath(); const r = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: false }), plastic(PL.sky, 0.25)); r.castShadow = true; r.position.set(-0.8 + i * 0.366, 0.42, -0.35); fac.add(r); }
  const ch = cyl(0.07, 0.085, 0.75, plastic(PL.red, 0.25), 20); ch.position.set(0.48, 0.375, -0.12); fac.add(ch);
  const tank = cyl(0.15, 0.15, 0.32, plastic(PL.yellow, 0.2), 24); tank.position.set(0.72, 0.16, 0.18); fac.add(tank);
  for (let i = 0; i < 4; i++) { const wdw = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.1), glowM(0xffd88a, 1.6)); wdw.position.set(-0.6 + i * 0.24, 0.24, 0.351); fac.add(wdw); }
  S.smoke = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(40 * 3), 3)), new THREE.PointsMaterial({ color: 0xdfe7f5, size: 0.2, map: discTex, transparent: true, depthWrite: false, opacity: 0.5 })); S.smoke.frustumCulled = false; fac.add(S.smoke);
}
function baseAt(t) {
  const st = S.stBase; neonOn2(st.n, clamp((t - K.base1) / 0.25), t);
  const T = [K.calculo, K.algebra, K.fisica, K.quimica, K.dibujo];
  let last = -1;
  S.blocks.forEach((o, i) => {
    const u = clamp((t - (T[i] - 0.28)) / 0.28), y0 = 0.15 + BLKH / 2 + i * BLKH;
    const fall = u < 1 ? lerp(y0 + 2.6, y0, u * u) : y0 + 0.05 * Math.exp(-(t - T[i]) * 10) * Math.abs(Math.sin((t - T[i]) * 20));
    o.b.visible = u > 0; o.b.position.set(0, fall, 0); o.b.rotation.set(0, (1 - u) * 0.8 + 0.12 * Math.sin(i * 2.1), 0);
    const sq = t > T[i] ? 0.1 * Math.exp(-(t - T[i]) * 11) : 0; o.b.scale.set(1 + sq, 1 - sq, 1 + sq);
    lookLab(o.l, env(t, T[i] + 0.04, 99, 0.2, 0.2), v3(i % 2 ? -0.7 : 0.7, y0, 0.42)); o.l.scale.setScalar(0.55);
    if (t > T[i]) last = i;
  });
  if (last >= 0 && t - T[last] < 0.6) { S.bDust.visible = true; burst(S.bDust, v3(0, 0.15 + last * BLKH, 0.2), t, T[last], 0.45, 0.6, false, 0.4); S.bDust.material.opacity = 1 - (t - T[last]) / 0.6; } else S.bDust.visible = false;
  const sk = clamp((t - (K.tecnico - 0.05)) / 0.26), y1 = 0.15 + 5 * BLKH + 0.045;
  S.slab.visible = sk > 0; S.slab.position.set(0, sk < 1 ? lerp(y1 + 2.4, y1, sk * sk) : y1 + 0.03 * Math.exp(-(t - K.tecnico - 0.21) * 9) * Math.abs(Math.sin((t - K.tecnico) * 18)), 0);
  const fk = pop(t, K.tecnico + 0.2, 0.35); S.fac.visible = fk > 0.01; S.fac.scale.set(1, Math.max(0.001, fk), 1);
  const a = S.smoke.geometry.attributes.position.array; for (let i = 0; i < 40; i++) { const tt = (t * 0.6 + hash(i)) % 1; a[i * 3] = 0.48 + 0.12 * Math.sin(i + t); a[i * 3 + 1] = 0.8 + tt * 1.0; a[i * 3 + 2] = -0.12 + 0.08 * Math.cos(i * 2 + t); } S.smoke.geometry.attributes.position.needsUpdate = true; S.smoke.material.opacity = 0.45 * fk;
  return camKeys(t, [
    [K.base0 - 0.3, [0.5, 1.2, 5.6], [0.0, 1.0, 0], 36],
    [K.calculo + 0.15, [0.6, 1.0, 5.2], [0.05, 0.75, 0], 36],
    [K.fisica + 0.1, [0.7, 1.55, 5.6], [0.05, 1.3, 0], 36],
    [K.dibujo + 0.2, [0.8, 2.25, 6.0], [0.05, 1.95, 0], 36],
    [K.tecnico + 0.45, [0.9, 2.9, 6.9], [0.05, 2.35, 0], 36],
  ], st.Z);
}
// ---- 3.1 estructuras y máquinas: arriba la celosía, debajo los engranajes, en medio la viga que aguanta la carga y a la derecha la biela-manivela
function beamGeo(L = 1.7, nx = 50) {
  const s = new THREE.Shape(), hw = 0.12, hh = 0.14, tw = 0.026, tf = 0.032;
  s.moveTo(-hw, -hh); s.lineTo(hw, -hh); s.lineTo(hw, -hh + tf); s.lineTo(tw, -hh + tf); s.lineTo(tw, hh - tf); s.lineTo(hw, hh - tf); s.lineTo(hw, hh); s.lineTo(-hw, hh); s.lineTo(-hw, hh - tf); s.lineTo(-tw, hh - tf); s.lineTo(-tw, -hh + tf); s.lineTo(-hw, -hh + tf); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: L, steps: nx, bevelEnabled: false }); g.translate(0, 0, -L / 2); g.rotateY(Math.PI / 2);
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
  g.userData.base = g.attributes.position.array.slice(); g.userData.L = L; return g;
}
const BEAM_X = -0.35, BEAM_Y = 1.15, BEAM_Z = 0.35;
function buildStruct() {
  const st = station('struct', 'ESTRUCTURAS\nY MÁQUINAS', '#ffb15a', 3.4, 1.9, 4.6); S.stStruct = st; const Z = st.Z;
  S.truss = []; const m = MAT.steel, P = []; const x0 = -1.15, x1 = 1.15, n = 5, hgt = 0.5, yb = 2.75;
  for (let i = 0; i <= n; i++) P.push([v3(lerp(x0, x1, i / n), yb, -0.5), v3(lerp(x0, x1, (i + 0.5) / n), yb + hgt, -0.5)]);
  for (let i = 0; i < n; i++) { S.truss.push(bar(P[i][0], P[i + 1][0], 0.026, m), bar(P[i][0], P[i][1], 0.02, m), bar(P[i][1], P[i + 1][0], 0.02, m)); if (i < n - 1) S.truss.push(bar(P[i][1], P[i + 1][1], 0.026, m)); }
  S.truss.forEach(b => Z.add(b));
  S.tPosts = [x0, x1].map(x => { const p = cyl(0.06, 0.08, yb - 0.15, plastic(0x3a4256, 0.3), 16); p.position.set(x, (yb - 0.15) / 2 + 0.15, -0.5); Z.add(p); return p; });
  S.g1 = gear(14, 0.3, 0.12, plastic(PL.orange, 0.22)); S.g1.position.set(0.55, 2.05, -0.75); Z.add(S.g1);
  S.g2 = gear(9, 0.19, 0.12, plastic(PL.sky, 0.22)); S.g2.position.set(0.55 + 0.3 + 0.19 + 0.08, 2.05, -0.75); Z.add(S.g2);
  S.beamG = beamGeo(1.7); S.beam = new THREE.Mesh(S.beamG, new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.25, metalness: 0.35, clearcoat: 0.6 })); S.beam.castShadow = true; S.beam.position.set(BEAM_X, BEAM_Y, BEAM_Z); Z.add(S.beam);
  S.supports = [-1, 1].map(s => { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.17, BEAM_Y - 0.15 - 0.14, 3), plastic(0x3a4256, 0.3)); sp.position.set(BEAM_X + s * 0.78, 0.15 + (BEAM_Y - 0.29) / 2, BEAM_Z); sp.rotation.y = Math.PI / 6; sp.castShadow = true; Z.add(sp); return sp; });
  S.load = rbox(0.44, 0.36, 0.36, plastic(0x2b2f38, 0.35), 0.05); Z.add(S.load);
  const hz = facePlane(canvasTex(256, 64, (q, w, h) => { for (let i = -2; i < 12; i++) { q.fillStyle = i % 2 ? '#ffc21a' : '#111'; q.beginPath(); q.moveTo(i * 24, 0); q.lineTo(i * 24 + 24, 0); q.lineTo(i * 24 + 8, h); q.lineTo(i * 24 - 16, h); q.fill(); } }), 0.44, 0.08); hz.position.set(0, -0.1, 0.181); S.load.add(hz);
  S.fDown = arrow(0.5, plastic(PL.red, 0.25), 0.04); S.fDown.rotation.z = Math.PI; Z.add(S.fDown);
  S.fUp = [-1, 1].map(() => { const a = arrow(0.42, plastic(PL.green, 0.25), 0.035); Z.add(a); return a; });
  const M = new THREE.Group(); M.position.set(0.95, 0.62, 0.55); Z.add(M); S.mech = M;
  S.wheel = cyl(0.26, 0.26, 0.07, plastic(PL.yellow, 0.2), 40); S.wheel.rotation.x = Math.PI / 2; M.add(S.wheel);
  const hub = cyl(0.05, 0.05, 0.12, MAT.steel, 16); hub.rotation.x = Math.PI / 2; M.add(hub);
  S.pin = cyl(0.035, 0.035, 0.14, MAT.steel, 12); S.pin.rotation.x = Math.PI / 2; M.add(S.pin);
  S.rod = rbox(0.05, 0.7, 0.04, MAT.steel, 0.018); M.add(S.rod);
  S.piston = rbox(0.24, 0.18, 0.16, plastic(PL.sky, 0.2), 0.04); M.add(S.piston);
  const gd = rbox(0.34, 1.0, 0.04, plastic(0x2a2f3a, 0.3), 0.02); gd.position.set(0, 0.8, -0.1); M.add(gd);
}
function structAt(t) {
  const st = S.stStruct, Z = st.Z; neonOn2(st.n, clamp((t - K.estructuras) / 0.25), t);
  S.truss.forEach((b, i) => { const k = pop(t, K.estructuras + i * 0.022, 0.25); b.visible = k > 0.01; b.scale.set(1, Math.max(0.001, k), 1); });
  S.tPosts.forEach(p => { const k = pop(t, K.estructuras - 0.05, 0.3); p.visible = k > 0.01; p.scale.set(1, Math.max(0.001, k), 1); });
  const gk = pop(t, K.maquinas, 0.35); show(S.g1, gk); show(S.g2, gk);
  const run = clamp((t - K.maquinas) / 0.6), mv = clamp((t - K.mueve) / 0.5), sp = 1.4 * run + 2.4 * mv;
  const ang = (t - K.maquinas) * sp; S.g1.rotation.z = ang; S.g2.rotation.z = -ang * 0.3 / 0.19 + 0.2;
  const vk = pop(t, K.viga - 0.05, 0.35); show(S.beam, vk); S.supports.forEach(s => show(s, vk));
  const tl = K.aguanta + 0.05, lu = clamp((t - (tl - 0.26)) / 0.26);
  S.load.visible = lu > 0;
  let dmax = 0; if (t > tl) { const q = t - tl; dmax = 0.06 + 0.06 * Math.exp(-q * 5) * Math.cos(q * 22); }
  const g = S.beamG, a = g.attributes.position.array, b = g.userData.base, col = g.attributes.color.array, sup = 0.78;
  const tint = clamp(dmax * 14);
  for (let i = 0; i < a.length; i += 3) { const u = clamp(Math.abs(b[i]) / sup); const dfl = dmax * (1 - u * u) * (1 + 0.5 * (1 - u)) / 1.5;
    a[i + 1] = b[i + 1] - dfl; const s2 = (1 - u) * clamp(dmax / 0.08); _c.setHSL(0.6 - 0.6 * s2, 0.85, 0.55); col[i] = lerp(0.86, _c.r, tint); col[i + 1] = lerp(0.88, _c.g, tint); col[i + 2] = lerp(0.92, _c.b, tint); }
  g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.computeVertexNormals();
  const ly = BEAM_Y + 0.14 + 0.18;
  S.load.position.set(BEAM_X, (lu < 1 ? lerp(ly + 2.2, ly, lu * lu) : ly) - dmax, BEAM_Z);
  const fk = env(t, tl + 0.05, 99, 0.2, 0.3); S.fDown.visible = fk > 0.01; S.fDown.position.set(BEAM_X, ly + 0.75 - dmax + 0.12 * (1 - fk), BEAM_Z); S.fDown.scale.setScalar(Math.max(0.001, fk));
  S.fUp.forEach((ar, i) => { ar.visible = fk > 0.01; ar.position.set(BEAM_X + (i ? 1 : -1) * 0.78, 0.18, BEAM_Z + 0.42); ar.scale.setScalar(Math.max(0.001, fk)); });
  const mk = pop(t, K.como1 - 0.1, 0.35); show(S.mech, mk);
  const th = (t - K.como1) * 7 * clamp((t - K.mueve + 0.2) / 0.5), r = 0.19, px = Math.cos(th) * r, py = Math.sin(th) * r, Lr = 0.7;
  S.wheel.rotation.y = th; S.pin.position.set(px, py, 0.07);
  const sy = py + Math.sqrt(Lr * Lr - px * px); S.piston.position.set(0, sy + 0.09, 0.0);
  S.rod.position.set(px / 2, (py + sy) / 2, 0.05); S.rod.rotation.z = Math.atan2(px, sy - py);
  return camKeys(t, [
    [K.estructuras - 0.3, [0.4, 2.6, 6.8], [0.0, 2.55, -0.3], 36],
    [K.maquinas + 0.3, [0.5, 2.3, 6.6], [0.2, 2.15, -0.3], 36],
    [K.viga, [-0.1, 1.55, 4.2], [-0.3, 1.25, 0.35], 36],
    [K.aguanta + 0.5, [-0.15, 1.5, 3.9], [-0.32, 1.25, 0.35], 36],
    [K.mueve, [0.6, 1.4, 3.9], [0.9, 1.15, 0.5], 36],
    [K.mecanismo + 0.6, [0.85, 1.35, 3.4], [0.95, 1.12, 0.5], 36],
  ], Z);
}
// ---- 3.2 termodinámica y fluidos: motor de cilindro transparente (el calor empuja el pistón) y turbina Pelton
function buildThermo() {
  const st = station('thermo', 'TERMODINÁMICA\nY FLUIDOS', '#ff8a5a', 3.4, 2.0, 4.4); S.stThermo = st; const Z = st.Z;
  const E = new THREE.Group(); E.position.set(-0.72, 0.15, 0.15); Z.add(E); S.eng = E;
  const blk = rbox(0.8, 0.55, 0.6, plastic(0x2b303b, 0.3), 0.06); blk.position.y = 0.42; E.add(blk);
  S.cylG = cyl(0.25, 0.25, 1.0, MAT.glass, 40); S.cylG.position.y = 1.2; E.add(S.cylG); S.cylG.castShadow = false;
  const head = cyl(0.29, 0.29, 0.1, plastic(0x2b303b, 0.3), 40); head.position.y = 1.75; E.add(head);
  const plug = cyl(0.04, 0.04, 0.16, MAT.steel, 12); plug.position.y = 1.86; E.add(plug);
  S.pist = cyl(0.23, 0.23, 0.18, MAT.steel, 40); E.add(S.pist);
  S.prod = rbox(0.05, 0.62, 0.04, MAT.steel, 0.018); E.add(S.prod);
  S.fly = new THREE.Group(); S.fly.position.set(0, 0.42, 0.4); E.add(S.fly);
  const fw = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.055, 12, 48), MAT.steel); fw.castShadow = true; S.fly.add(fw);
  for (let i = 0; i < 5; i++) { const sp2 = rbox(0.045, 0.68, 0.035, MAT.steel, 0.01); sp2.rotation.z = i / 5 * Math.PI; S.fly.add(sp2); }
  S.fire = sph(0.2, new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending })); E.add(S.fire);
  S.fireCore = sph(0.1, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false, depthWrite: false })); E.add(S.fireCore);
  S.heat = sparks(E, 50, 0xff9a40, 0.06);
  const T = new THREE.Group(); T.position.set(0.72, 0.15, 0.3); Z.add(T); S.turb = T;
  const stand = rbox(0.24, 0.95, 0.24, plastic(0x2b303b, 0.3), 0.04); stand.position.set(0, 0.47, -0.25); T.add(stand);
  S.wheelT = new THREE.Group(); S.wheelT.position.set(0, 1.05, 0); T.add(S.wheelT);
  const disc = cyl(0.34, 0.34, 0.07, plastic(PL.sky, 0.2), 48); disc.rotation.x = Math.PI / 2; S.wheelT.add(disc);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, cup = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 10, 0, Math.PI), MAT.steel); cup.position.set(Math.cos(a) * 0.41, Math.sin(a) * 0.41, 0); cup.rotation.z = a + Math.PI / 2; cup.rotation.y = Math.PI / 2; cup.castShadow = true; S.wheelT.add(cup); }
  const noz = cyl(0.055, 0.09, 0.36, MAT.dsteel, 20); noz.rotation.z = Math.PI / 2; noz.position.set(0.62, 1.05 + 0.43, 0); T.add(noz);
  const pipe = tube([v3(0.8, 1.48, 0), v3(0.98, 1.48, 0), v3(1.05, 1.1, 0), v3(1.05, 0.15, 0)], 0.065, plastic(PL.blue, 0.25), 30); T.add(pipe);
  S.water = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0x5fc8ff, roughness: 0.05, clearcoat: 1, emissive: 0x062c4a, emissiveIntensity: 0.5 }), 80); S.water.frustumCulled = false; T.add(S.water);
  S.spray = sparks(T, 50, 0x9fdcff, 0.04);
}
function thermoAt(t) {
  const st = S.stThermo; neonOn2(st.n, clamp((t - K.termo) / 0.25), t);
  const heat = env(t, K.calor, 99, 0.25, 0.3), rpm = clamp((t - K.mueve2 + 0.1) / 0.5) * 9 + heat * 1.5;
  const th = (t - K.calor) * rpm, r = 0.16, Lr = 0.56;
  S.fly.rotation.z = -th;
  const px = Math.sin(th) * r, py = Math.cos(th) * r, sy = py + Math.sqrt(Lr * Lr - px * px);
  S.pist.position.set(0, 0.42 + sy + 0.12, 0.02); S.prod.position.set(px / 2, 0.42 + (py + sy) / 2, 0.1); S.prod.rotation.z = -Math.atan2(px, sy - py);
  const comb = Math.pow(0.5 + 0.5 * Math.cos(th), 3);
  S.fire.visible = S.fireCore.visible = heat > 0.01; S.fire.position.set(0, 1.58, 0.02); S.fireCore.position.copy(S.fire.position);
  S.fire.scale.setScalar(Math.max(0.001, heat * (0.55 + 0.6 * comb))); S.fire.material.color.setRGB(2.2 * heat, 0.9 * heat, 0.2 * heat);
  S.fireCore.scale.setScalar(Math.max(0.001, heat * (0.4 + 0.7 * comb))); S.fireCore.material.color.setRGB(3 * heat, 2.4 * heat, 1.2 * heat);
  S.heat.visible = heat > 0.01; if (S.heat.visible) { burst(S.heat, v3(0, 1.85, 0), t, 0, 0.22, 1.0, true, -0.5); S.heat.material.opacity = heat * 0.9; }
  const wk = clamp((t - K.agua) / 0.2), tk = clamp((t - K.turbina + 0.15) / 0.6);
  S.wheelT.rotation.z = -(t - K.turbina) * 9 * tk - 0.6 * wk * Math.max(0, t - K.agua);
  for (let i = 0; i < 80; i++) { const u = ((t * 2.6 + i / 80) % 1); const p = v3(lerp(0.46, 0.38, u), 1.48 - 0.02 * u, 0.025 * Math.sin(i * 7)); _s.setScalar(wk); _m4.compose(p, _q.identity(), _s); S.water.setMatrixAt(i, _m4); }
  S.water.instanceMatrix.needsUpdate = true; S.water.visible = wk > 0;
  S.spray.visible = wk > 0; if (wk > 0) { burst(S.spray, v3(0.36, 1.46, 0), t, 0, 0.3, 0.45, true, 3); S.spray.material.opacity = 0.8 * wk; }
  return camKeys(t, [
    [K.termo - 0.3, [0.2, 1.9, 6.4], [0.0, 1.3, 0], 36],
    [K.calor, [-0.5, 1.55, 3.8], [-0.7, 1.25, 0.15], 36],
    [K.motor + 0.3, [-0.55, 1.4, 3.6], [-0.72, 1.05, 0.15], 36],
    [K.agua, [0.5, 1.45, 3.7], [0.72, 1.2, 0.3], 36],
    [K.turbina + 0.4, [0.75, 1.35, 3.3], [0.75, 1.1, 0.3], 36],
  ], st.Z);
}
// ---- 3.3 electricidad y electrónica: placa DE PIE con pistas que se encienden, el chip en el centro y un motor delante
function buildElec() {
  const st = station('elec', 'ELECTRICIDAD\nY ELECTRÓNICA', '#5ff0b0', 3.4, 2.1, 4.5); S.stElec = st; const Z = st.Z;
  const B = new THREE.Group(); B.position.set(0, 2.0, -0.35); Z.add(B); S.board = B;
  const pcb = rbox(1.8, 2.3, 0.07, plastic(0x0f6b46, 0.35), 0.04); B.add(pcb);
  for (const s of [-1, 1]) { const leg = cyl(0.03, 0.03, 1.0, MAT.dsteel, 10); leg.position.set(s * 0.7, -1.6, -0.02); B.add(leg); }
  S.paths = [];
  const P = [[[-0.7, -0.95], [-0.7, -0.15], [-0.32, -0.15]], [[-0.7, 0.95], [-0.45, 0.95], [-0.45, 0.15], [-0.32, 0.15]], [[0.32, 0.15], [0.55, 0.15], [0.55, 0.9], [0.75, 0.9]], [[0.32, -0.15], [0.62, -0.15], [0.62, -0.95]], [[-0.15, -0.32], [-0.15, -0.75], [0.25, -0.75], [0.25, -1.05]], [[0.0, 0.32], [0.0, 0.7], [-0.25, 0.7], [-0.25, 1.05]]];
  for (const path of P) { const pts = path.map(([x, y]) => v3(x, y, 0.04)); for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], d = b.clone().sub(a); const tr = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(d.x) + 0.035, Math.abs(d.y) + 0.035, 0.01), MAT.copper); tr.position.copy(a).add(b).multiplyScalar(0.5); B.add(tr); }
    let L = 0; const seg = []; for (let i = 0; i < pts.length - 1; i++) { const l = pts[i].distanceTo(pts[i + 1]); seg.push([pts[i], pts[i + 1], L, l]); L += l; } S.paths.push({ seg, L }); }
  for (let i = 0; i < 6; i++) { const c = cyl(0.05, 0.05, 0.15, plastic([PL.sky, 0x222222, PL.yellow][i % 3], 0.3), 16); c.rotation.x = Math.PI / 2; c.position.set(0.35 + (i % 2) * 0.17, -0.55 - Math.floor(i / 2) * 0.16, 0.1); B.add(c); }
  for (let i = 0; i < 3; i++) { const rs = rbox(0.16, 0.05, 0.05, plastic(0xd9b98a, 0.4), 0.02); rs.position.set(-0.5, 0.45 + i * 0.12, 0.06); B.add(rs); }
  S.pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 12, 8), glowM(0x9ffff0, 3.2), 36); S.pulses.frustumCulled = false; B.add(S.pulses);
  S.chip = new THREE.Group(); B.add(S.chip);
  const cb = rbox(0.52, 0.52, 0.09, plastic(0x15181f, 0.3), 0.03); S.chip.add(cb);
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const p = rbox(0.035, 0.08, 0.025, MAT.steel, 0.006); p.position.set(-0.21 + i * 0.085, s * 0.29, -0.02); S.chip.add(p); const q = p.clone(); q.rotation.z = Math.PI / 2; q.position.set(s * 0.29, -0.21 + i * 0.085, -0.02); S.chip.add(q); }
  S.chipLed = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), new THREE.MeshBasicMaterial({ color: 0x37e0ff, toneMapped: false })); S.chipLed.position.set(0.17, 0.17, 0.047); S.chip.add(S.chipLed);
  const M = new THREE.Group(); M.position.set(0.55, 0.42, 0.75); M.rotation.y = -0.5; Z.add(M); S.emot = M;
  const body = cyl(0.24, 0.24, 0.6, plastic(PL.blue, 0.22), 40); body.rotation.z = Math.PI / 2; M.add(body);
  for (let i = 0; i < 8; i++) { const fin = cyl(0.265, 0.265, 0.018, MAT.dsteel, 40); fin.rotation.z = Math.PI / 2; fin.position.x = -0.24 + i * 0.068; M.add(fin); }
  const ft = rbox(0.5, 0.1, 0.34, plastic(0x2a2f3a, 0.3), 0.03); ft.position.y = -0.26; M.add(ft);
  S.shaft = new THREE.Group(); S.shaft.position.x = -0.36; M.add(S.shaft);
  const sh = cyl(0.035, 0.035, 0.16, MAT.steel, 12); sh.rotation.z = Math.PI / 2; S.shaft.add(sh);
  for (let i = 0; i < 3; i++) { const bl = rbox(0.025, 0.34, 0.1, plastic(PL.yellow, 0.2), 0.02); bl.position.set(-0.08, 0.16, 0); const piv = new THREE.Group(); piv.rotation.x = i / 3 * Math.PI * 2; piv.add(bl); bl.rotation.y = 0.5; S.shaft.add(piv); }
  S.coil = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.016, 8, 48), glowM(0xff8a3a, 3)); S.coil.rotation.y = Math.PI / 2; S.coil.position.x = 0.3; M.add(S.coil);
  S.wire = tube([v3(0.62, 0.95, -0.3), v3(0.85, 0.55, 0.0), v3(0.95, 0.3, 0.55), v3(0.82, 0.42, 0.75)], 0.022, plastic(PL.red, 0.3), 30); Z.add(S.wire);
}
function elecAt(t) {
  const st = S.stElec; neonOn2(st.n, clamp((t - K.electricidad) / 0.25), t);
  const ck = clamp((t - K.circuitos) / 0.3), chip = clamp((t - (K.chips - 0.25)) / 0.25), ctl = clamp((t - K.controlan) / 0.2);
  let n = 0;
  S.paths.forEach((p, pi) => { for (let k = 0; k < 6; k++) { const u = ((t * 0.9 + k / 6 + pi * 0.13) % 1) * p.L; const sg = p.seg.find(s => u >= s[2] && u <= s[2] + s[3]) || p.seg[p.seg.length - 1];
    const pos = sg[0].clone().lerp(sg[1], clamp((u - sg[2]) / sg[3])); pos.z = 0.06; _s.setScalar(ck * (pi < 4 || chip > 0.5 ? 1 : 0)); _m4.compose(pos, _q.identity(), _s); S.pulses.setMatrixAt(n++, _m4); } });
  S.pulses.instanceMatrix.needsUpdate = true; S.pulses.visible = ck > 0;
  S.chip.visible = chip > 0; S.chip.position.set(0, 0, 0.08 + (1 - chip * chip) * 1.4); S.chip.rotation.z = (1 - chip) * 0.8;
  S.chipLed.material.color.setRGB(0.3 + 2.6 * (chip >= 1 && Math.sin(t * 14) > 0 ? 1 : 0), 1.4 * (chip >= 1 ? 1 : 0.3), 1.6 * (chip >= 1 ? 1 : 0.3));
  const mk = pop(t, K.motores - 0.1, 0.35); show(S.emot, mk); S.wire.visible = mk > 0.5;
  const spd = 14 * clamp((t - K.motores) / 0.5) * (ctl > 0 ? (0.55 + 0.45 * (Math.sin((t - K.controlan) * 7) > 0 ? 1 : 0.2)) : 1);
  S.shaft.rotation.x = (t - K.motores) * spd; S.coil.material.emissiveIntensity = 0.5 + 3 * clamp((t - K.motores) / 0.4) * (0.7 + 0.3 * Math.sin(t * 20));
  return camKeys(t, [
    [K.electricidad - 0.3, [0.3, 2.3, 6.6], [0.0, 2.0, -0.3], 36],
    [K.circuitos + 0.2, [0.2, 2.15, 5.0], [0.0, 2.0, -0.35], 36],
    [K.motores + 0.2, [0.4, 0.95, 3.6], [0.5, 0.55, 0.7], 36],
    [K.chips, [0.15, 2.05, 3.4], [0.0, 2.0, -0.35], 36],
    [K.controlan + 0.5, [0.35, 1.7, 5.4], [0.1, 1.45, 0.0], 36],
  ], st.Z);
}
// ---- 3.4 automática: cinta que viene HACIA la cámara, dos brazos robóticos a los lados y el semáforo que pasa a verde
function buildAuto() {
  const st = station('auto', 'AUTOMÁTICA', '#a58bff', 3.4, 1.9, 3.9); S.stAuto = st; const Z = st.Z;
  const belt = rbox(0.8, 0.12, 4.0, MAT.rubber, 0.05); belt.position.set(0, 0.62, -0.3); Z.add(belt);
  S.beltT = canvasTex(64, 512, (q, w, h) => { q.fillStyle = '#16181d'; q.fillRect(0, 0, w, h); q.fillStyle = '#2b2f37'; for (let i = 0; i < 16; i++) q.fillRect(0, i * 32, w, 13); });
  S.beltT.wrapT = THREE.RepeatWrapping; S.beltT.repeat.set(1, 5);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 3.9), new THREE.MeshStandardMaterial({ map: S.beltT, roughness: 0.6 })); top.rotation.x = -Math.PI / 2; top.position.set(0, 0.685, -0.3); Z.add(top);
  for (const s of [-1, 1]) { const rl = rbox(0.06, 0.14, 4.1, plastic(PL.yellow, 0.25), 0.03); rl.position.set(s * 0.43, 0.66, -0.3); Z.add(rl); }
  for (let i = 0; i < 5; i++) { const lg = rbox(0.7, 0.5, 0.08, MAT.dsteel, 0.02); lg.position.set(0, 0.33, -2.1 + i * 0.9); Z.add(lg); }
  S.boxes = []; for (let i = 0; i < 6; i++) { const b = rbox(0.34, 0.28, 0.34, plastic(0xc8935a, 0.55), 0.03); Z.add(b); const tp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.35), plastic(0x8a6236, 0.5)); tp.position.y = 0.141; b.add(tp);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshBasicMaterial({ color: 0x5ff0b0, toneMapped: false })); lab.position.set(0, 0.0, 0.171); lab.visible = false; b.add(lab); b.userData.lab = lab; S.boxes.push(b); }
  S.arms = [[-0.95, -0.9], [0.95, 0.15]].map(([x, z], i) => { const a = robotArm(i ? PL.orange : PL.sky, 0.8); a.position.set(x, 0.15, z); Z.add(a); const gr = gripper(); a.userData.J.tool.add(gr); a.userData.gr = gr;
    const eye = sph(0.035, glowM(0x5ff0b0, 0.2)); eye.position.set(0, 0.2, 0.09); a.userData.J.wr.add(eye); a.userData.eye = eye; a.userData.side = i ? 1 : -1; return a; });
  const tower = new THREE.Group(); tower.position.set(-0.85, 0.15, -1.9); Z.add(tower); S.tower = tower;
  const pole = cyl(0.035, 0.035, 1.4, MAT.dsteel, 12); pole.position.y = 0.7; tower.add(pole);
  S.lamps = [0xff3b4e, 0xffc21a, 0x19d98a].map((c, i) => { const l = cyl(0.1, 0.1, 0.16, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c, emissiveIntensity: 0.2, roughness: 0.3 }), 24); l.position.y = 1.5 + i * 0.18; tower.add(l); return l; });
  S.autoL = pill('AUTO', '#5ff0b0', 'rgba(16,20,30,.92)', 0.46, 70); Z.add(S.autoL);
}
function autoAt(t) {
  const st = S.stAuto; neonOn2(st.n, clamp((t - K.automatica) / 0.25), t);
  const run = clamp((t - K.ensenar) / 0.6), travel = Math.max(0, (t - K.ensenar) * 0.85 - 0.25 * (1 - run));
  S.beltT.offset.y = travel * 5 / 3.9;
  S.boxes.forEach((b, i) => { const z = ((i * 0.75 + travel) % 4.5) - 2.3; b.position.set(0, 0.62 + 0.06 + 0.14, z); b.visible = z < 1.6; b.scale.setScalar(Math.max(0.001, clamp((1.6 - z) / 0.25))); b.userData.lab.visible = z > 0.2; });
  const wake = clamp((t - K.automatica) / 0.5);
  S.arms.forEach((a, i) => {
    const ph = (t - K.ensenar) * 3.4 + i * 1.7, dip = run * Math.pow(Math.max(0, Math.sin(ph)), 3);
    // el brazo se gira hacia la cinta (en el lado contrario a su base) y baja la pinza sobre las cajas
    pose(a, 0, lerp(0.9, lerp(-0.2, -0.55, dip), wake), lerp(-0.4, lerp(1.25, 1.55, dip), wake), lerp(0.2, 0.75 + 0.25 * dip, wake));
    a.userData.J.base.rotation.y = (a.userData.side < 0 ? 0 : Math.PI) + 0.15 * run * Math.sin(ph * 0.5);
    grip(a.userData.gr, dip); a.userData.eye.material.emissiveIntensity = 0.2 + 3.5 * wake;
  });
  const green = clamp((t - K.sola) / 0.15), y2 = env(t, K.ensenar, K.sola + 0.05, 0.1, 0.05);
  S.lamps[0].material.emissiveIntensity = 0.2 + 2.6 * (1 - wake) * (t > K.automatica - 0.4 ? 1 : 0); S.lamps[1].material.emissiveIntensity = 0.2 + 2.6 * y2 * (Math.sin(t * 12) > 0 ? 1 : 0.3); S.lamps[2].material.emissiveIntensity = 0.2 + 3.2 * green;
  lookLab(S.autoL, green, v3(-0.85, 2.38, -1.9)); S.autoL.scale.setScalar(0.7 + 0.3 * pop(t, K.sola, 0.3));
  return camKeys(t, [
    [K.automatica - 0.3, [0.5, 2.5, 5.4], [0.0, 1.1, -0.8], 36],
    [K.ensenar + 0.2, [0.35, 2.2, 4.6], [0.0, 0.95, -0.6], 36],
    [K.fabrica1 + 0.3, [-0.3, 2.0, 4.2], [0.0, 0.95, -0.4], 36],
    [K.sola + 0.4, [-0.45, 2.3, 4.4], [-0.3, 1.35, -1.0], 36],
  ], st.Z);
}
// ---- 3.5 materiales y fabricación: tocho de acero DE PIE → su red cristalina por dentro → la fresa lo convierte en engranaje
const BIL_Y = 0.98;
function buildMat() {
  const st = station('mat', 'MATERIALES\nY FABRICACIÓN', '#ffd75a', 3.4, 2.0, 4.4); S.stMat = st; const Z = st.Z;
  const tbl = rbox(1.5, 0.45, 1.1, plastic(0x2b303b, 0.3), 0.05); tbl.position.set(0, 0.375, 0); Z.add(tbl);
  const chuck = cyl(0.42, 0.44, 0.16, MAT.dsteel, 32); chuck.position.set(0, 0.68, 0); Z.add(chuck);
  for (let i = 0; i < 3; i++) { const j = rbox(0.1, 0.12, 0.16, MAT.steel, 0.02); const a = i / 3 * Math.PI * 2; j.position.set(Math.cos(a) * 0.36, 0.8, Math.sin(a) * 0.36); j.rotation.y = -a; Z.add(j); }
  S.billet = cyl(0.3, 0.3, 0.5, metal(0xcfd5de, 0.28), 48); S.billet.position.set(0, BIL_Y, 0); Z.add(S.billet);
  S.mgear = gear(16, 0.27, 0.4, metal(0xd8dde6, 0.22)); S.mgear.rotation.x = Math.PI / 2; S.mgear.position.set(0, BIL_Y, 0); Z.add(S.mgear);
  const col = rbox(0.3, 2.6, 0.3, plastic(PL.blue, 0.25), 0.05); col.position.set(0, 1.6, -0.75); Z.add(col);
  S.cutter = new THREE.Group(); Z.add(S.cutter);
  const head = rbox(0.42, 0.5, 0.5, plastic(PL.orange, 0.25), 0.06); head.position.set(0, 0.4, -0.25); S.cutter.add(head);
  const arm2 = rbox(0.2, 0.16, 0.6, plastic(PL.orange, 0.25), 0.04); arm2.position.set(0, 0.55, -0.55); S.cutter.add(arm2);
  S.mill = new THREE.Group(); S.cutter.add(S.mill);
  const ml = cyl(0.055, 0.055, 0.34, MAT.gold, 12); ml.position.y = 0.0; S.mill.add(ml);
  for (let i = 0; i < 4; i++) { const fl = rbox(0.025, 0.3, 0.12, MAT.gold, 0.01); fl.rotation.y = i / 4 * Math.PI; S.mill.add(fl); }
  S.chips = sparks(Z, 90, 0xd8e2f0, 0.045);
  const L = new THREE.Group(); Z.add(L); S.lat = L; const n = 4, a = 0.12;
  const at = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) { at.push(v3(i, j, k).subScalar((n - 1) / 2).multiplyScalar(a)); if (i < n - 1 && j < n - 1 && k < n - 1) at.push(v3(i + 0.5, j + 0.5, k + 0.5).subScalar((n - 1) / 2).multiplyScalar(a)); }
  S.atoms = new THREE.InstancedMesh(new THREE.SphereGeometry(0.026, 18, 12), instGlow(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.6, clearcoat: 1 }), 0.25), at.length);
  S.atoms.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(at.length * 3), 3);
  at.forEach((p, i) => { _m4.makeTranslation(p.x, p.y, p.z); S.atoms.setMatrixAt(i, _m4); S.atoms.setColorAt(i, _c.setHSL(0.58 + 0.06 * hash(i), 0.6, 0.62)); }); L.add(S.atoms); S.atP = at;
  const bonds = []; for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) { const d = at[i].distanceTo(at[j]); if (Math.abs(d - a * Math.sqrt(3) / 2) < 0.002) bonds.push([at[i], at[j]]); }
  const bm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.005, 0.005, 1, 6), glowM(0x7fd8ff, 1.0), bonds.length);
  bonds.forEach(([p, q], i) => { const d = q.clone().sub(p); _q.setFromUnitVectors(v3(0, 1, 0), d.clone().normalize()); _m4.compose(p.clone().add(q).multiplyScalar(0.5), _q, v3(1, d.length(), 1)); bm.setMatrixAt(i, _m4); }); L.add(bm);
  S.latL = pill('RED CRISTALINA DEL ACERO', '#cfe6ff', 'rgba(16,20,30,.9)', 0.36, 56); Z.add(S.latL);
}
function matAt(t) {
  const st = S.stMat; neonOn2(st.n, clamp((t - K.materiales) / 0.25), t);
  const cut = clamp((t - (K.produce - 0.3)) / 0.6), lat = env(t, K.de10 - 0.05, K.y_mat + 0.15, 0.55, 0.45);
  S.billet.rotation.y = t * 2;
  S.billet.visible = cut < 0.98; S.billet.scale.set(1 - 0.1 * cut, 1 - 0.2 * cut, 1 - 0.1 * cut);
  const gk = clamp((cut - 0.25) / 0.75); S.mgear.visible = gk > 0.01; S.mgear.scale.setScalar(Math.max(0.001, 0.9 + 0.1 * gk)); setOp(S.mgear, gk); S.mgear.rotation.z = t * 1.5;
  const ck = env(t, K.produce - 0.7, 99, 0.35, 0.3); S.cutter.visible = ck > 0.01;
  const orbit = cut * Math.PI * 2, inCut = cut > 0 && cut < 1 ? 1 : 0;
  S.cutter.position.set(0.36 * Math.sin(orbit) * inCut, BIL_Y + 0.62 + 1.0 * (1 - ck) - 0.15 * Math.sin(Math.PI * cut), 0.18 * (Math.cos(orbit) - 1) * inCut); S.mill.position.y = -0.1; S.mill.rotation.y = t * 40;
  S.chips.visible = inCut > 0; if (S.chips.visible) burst(S.chips, v3(S.cutter.position.x, BIL_Y + 0.25, S.cutter.position.z + 0.2), t, 0, 0.7, 0.4, true, 4);
  S.lat.visible = lat > 0.01; S.lat.position.set(0, BIL_Y, 0.31); S.lat.scale.setScalar(Math.max(0.001, lat)); S.lat.rotation.set(0.5, t * 0.35, 0.2);
  S.atP.forEach((p, i) => { _m4.makeTranslation(p.x + 0.004 * Math.sin(t * 30 + i), p.y + 0.004 * Math.cos(t * 27 + i * 1.3), p.z); S.atoms.setMatrixAt(i, _m4); }); S.atoms.instanceMatrix.needsUpdate = true;
  lookLab(S.latL, env(t, K.hecho, K.y_mat + 0.1, 0.2, 0.2), v3(0, BIL_Y + 0.24, 0.4)); S.latL.scale.setScalar(0.42);
  return camKeys(t, [
    [K.materiales - 0.3, [0.4, 2.4, 6.6], [0.0, 2.0, 0], 36],
    [K.fabricacion + 0.3, [0.3, 2.2, 6.0], [0.0, 1.8, 0], 36],
    [K.de10 + 0.15, [0.15, 1.25, 2.4], [0.0, BIL_Y, 0.15], 36],
    [K.hecho + 0.2, [0.06, BIL_Y + 0.06, 0.92], [0.0, BIL_Y, 0.31], 34],
    [K.objeto + 0.2, [0.1, BIL_Y + 0.07, 0.86], [0.0, BIL_Y + 0.01, 0.31], 34],
    [K.y_mat + 0.25, [0.3, 1.55, 2.6], [0.0, 1.15, 0.0], 36],
    [K.produce + 0.4, [0.45, 1.75, 3.2], [0.0, 1.2, 0.0], 36],
  ], st.Z);
}
// ---- 3.6 empresa: panel vertical con tres filas: costes (monedas), organización (organigrama) y proyectos (Gantt)
function buildBiz() {
  const st = station('biz', 'EMPRESA', '#ff7ad1', 3.4, 1.6, 4.55); S.stBiz = st; const Z = st.Z;
  const panel = rbox(2.3, 3.3, 0.08, new THREE.MeshPhysicalMaterial({ color: 0x0d1220, roughness: 0.15, metalness: 0.2, clearcoat: 1 }), 0.06); panel.position.set(0, 2.15, -0.6); Z.add(panel);
  for (const y of [1.6, 2.7]) { const dv = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.01, 0.01), new THREE.MeshBasicMaterial({ color: 0x34406a })); dv.position.set(0, y, -0.55); Z.add(dv); }
  const hdr = (txt, y) => { const l = textPlane([txt], { size: 80, color: '#cfe6ff', weight: 800, w: txt.length * 0.075 }); l.position.set(-0.95 + txt.length * 0.0375, y, -0.54); Z.add(l); return l; };
  S.bizH = [hdr('COSTES', 3.6), hdr('ORGANIZACIÓN', 2.5), hdr('PROYECTOS', 1.4)];
  const coinTex = canvasTex(256, 256, (q, w, h) => { q.fillStyle = '#ffcf55'; q.beginPath(); q.arc(128, 128, 120, 0, 7); q.fill(); q.strokeStyle = '#c98a14'; q.lineWidth = 12; q.beginPath(); q.arc(128, 128, 100, 0, 7); q.stroke(); q.fillStyle = '#a86a00'; q.font = '900 150px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('€', 128, 136); });
  S.coins = []; for (let s = 0; s < 4; s++) for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.045, 32), [MAT.gold, new THREE.MeshStandardMaterial({ map: coinTex, metalness: 0.6, roughness: 0.3 }), MAT.gold]); c.castShadow = true; Z.add(c); S.coins.push({ c, s, i }); }
  S.coinUp = arrow(0.5, plastic(PL.red, 0.25), 0.035); Z.add(S.coinUp);
  const nodes = [v3(0, 2.4, -0.45), v3(-0.55, 1.95, -0.45), v3(0, 1.95, -0.45), v3(0.55, 1.95, -0.45)].map(p => p.add(v3(0.25, 0, 0)));
  S.org = nodes.map((p, i) => { const g = new THREE.Group(); g.position.copy(p); Z.add(g); const d = cyl(0.13, 0.13, 0.05, plastic(i ? PL.sky : PL.violet, 0.2), 32); d.rotation.x = Math.PI / 2; g.add(d); const hd = sph(0.04, plastic(0xffffff, 0.2)); hd.position.set(0, 0.03, 0.05); g.add(hd); const bd = sph(0.055, plastic(0xffffff, 0.2)); bd.scale.set(1, 0.6, 0.6); bd.position.set(0, -0.045, 0.05); g.add(bd); return g; });
  S.orgL = [1, 2, 3].map(i => { const b = bar(nodes[0], nodes[i], 0.011, glowM(0xc8a8ff, 2)); Z.add(b); b.userData.a = nodes[0]; b.userData.b = nodes[i]; return b; });
  S.gantt = [[0.0, 0.55, PL.sky], [0.3, 0.6, PL.green], [0.65, 0.45, PL.orange], [0.95, 0.4, PL.pink]].map(([x, w, c], i) => { const b = rbox(w, 0.11, 0.05, plastic(c, 0.2), 0.025); Z.add(b); b.userData.x = x; b.userData.w = w; b.userData.y = 1.15 - i * 0.17; return b; });
  S.check = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (q, w, h) => { q.strokeStyle = '#5ff0b0'; q.lineWidth = 44; q.lineCap = 'round'; q.lineJoin = 'round'; q.beginPath(); q.moveTo(46, 136); q.lineTo(104, 196); q.lineTo(212, 62); q.stroke(); }), transparent: true, depthWrite: false, toneMapped: false })); Z.add(S.check);
}
function bizAt(t) {
  const st = S.stBiz; neonOn2(st.n, clamp((t - K.empresa) / 0.25), t);
  S.bizH.forEach((l, i) => { const k = env(t, [K.costes, K.organizacion, K.proyectos][i] - 0.05, 99, 0.2, 0.2); l.material.opacity = 0.3 + 0.7 * k; });
  const HS = [3, 5, 4, 6];
  S.coins.forEach(({ c, s, i }) => { const t0 = K.costes + s * 0.1 + i * 0.045, u = clamp((t - t0) / 0.16); c.visible = u > 0 && i < HS[s]; c.position.set(-0.55 + s * 0.3, 2.9 + i * 0.05 + (1 - u * u) * 0.7, -0.4); });
  const ak = pop(t, K.costes + 0.45, 0.3); S.coinUp.visible = ak > 0.01; S.coinUp.position.set(0.75, 2.95, -0.4); S.coinUp.scale.setScalar(Math.max(0.001, ak)); S.coinUp.rotation.z = -0.5;
  S.org.forEach((g, i) => { const k = pop(t, K.organizacion + (i ? 0.15 + i * 0.08 : 0), 0.3); show(g, k); g.rotation.y = 0.15 * Math.sin(t * 2 + i); });
  S.orgL.forEach((b, i) => { const k = clamp((t - (K.organizacion + 0.15 + i * 0.08)) / 0.2); b.visible = k > 0.01; const a = b.userData.a, q = a.clone().lerp(b.userData.b, Math.max(0.001, k)); b.position.copy(a).add(q).multiplyScalar(0.5); b.scale.set(1, Math.max(0.001, k), 1); });
  S.gantt.forEach((b, i) => { const k = eo(clamp((t - (K.proyectos + i * 0.1)) / 0.3)); b.visible = k > 0.01; b.scale.set(Math.max(0.001, k), 1, 1); b.position.set(-0.6 + b.userData.x + b.userData.w * k / 2, b.userData.y, -0.5); });
  const chk = pop(t, K.proyectos + 0.5, 0.3); S.check.visible = chk > 0.01; S.check.position.set(0.85, 0.75, -0.5); S.check.scale.setScalar(Math.max(0.001, chk)); S.check.material.color.setRGB(1.6, 1.6, 1.6);
  return camKeys(t, [
    [K.empresa - 0.4, [0.2, 2.6, 6.6], [0.0, 2.3, -0.6], 36],
    [K.costes + 0.2, [0.15, 3.1, 4.4], [0.05, 3.0, -0.5], 36],
    [K.organizacion + 0.3, [0.2, 2.25, 4.4], [0.15, 2.15, -0.5], 36],
    [K.proyectos + 0.3, [0.2, 1.2, 4.3], [0.1, 1.1, -0.5], 36],
    [K.proyectos + 0.9, [0.25, 1.35, 4.6], [0.1, 1.2, -0.5], 36],
  ], st.Z);
}
// ---- 3.7 salidas: coches, robots, centrales y cadenas de montaje (la cámara pasa por delante de cada una)
function buildCareers() {
  const st = station('careers', null, '#7fe6ff', 8.6); S.stCar = st; const Z = st.Z;
  S.car = carModel(0xff3b4e); S.car.position.set(-2.4, 0.15, 0.35); S.car.rotation.y = 0.75; Z.add(S.car);
  S.carW = new THREE.LineSegments(new THREE.EdgesGeometry(S.car.userData.P.body.geometry, 25), new THREE.LineBasicMaterial({ color: 0x7fe6ff, transparent: true, toneMapped: false })); S.carW.position.copy(S.car.position); S.carW.rotation.copy(S.car.rotation); Z.add(S.carW);
  S.carW2 = new THREE.LineSegments(new THREE.EdgesGeometry(S.car.userData.P.cabin.geometry, 25), S.carW.material); S.carW2.position.copy(S.car.position); S.carW2.rotation.copy(S.car.rotation); Z.add(S.carW2);
  S.hrob = robotArm(PL.sky, 1.0); S.hrob.position.set(-0.75, 0.15, 0.0); Z.add(S.hrob); const gr = gripper(); S.hrob.userData.J.tool.add(gr);
  const P = new THREE.Group(); P.position.set(1.0, 0.15, -0.3); Z.add(P); S.plant = P;
  const prof = []; for (let i = 0; i <= 12; i++) { const y = i / 12 * 1.7, r = 0.56 - 0.3 * Math.sin(Math.PI * Math.min(1, y / 1.4) * 0.75); prof.push(new THREE.Vector2(r, y)); }
  const tw = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), plastic(0xe6eaf0, 0.35)); tw.castShadow = true; P.add(tw);
  S.steam = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(60 * 3), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, map: discTex, transparent: true, depthWrite: false, opacity: 0.6 })); S.steam.frustumCulled = false; P.add(S.steam);
  S.rotors = [];
  for (const [x, z, h] of [[0.75, 0.55, 2.0], [-0.55, -0.6, 2.4]]) { const tw2 = cyl(0.035, 0.06, h, plastic(0xf3f5f9, 0.25), 16); tw2.position.set(x, h / 2, z); P.add(tw2); const rot = new THREE.Group(); rot.position.set(x, h, z + 0.07); P.add(rot);
    for (let i = 0; i < 3; i++) { const bl = rbox(0.05, 0.62, 0.02, plastic(0xf3f5f9, 0.25), 0.02); bl.position.y = 0.31; const pv = new THREE.Group(); pv.rotation.z = i / 3 * Math.PI * 2; pv.add(bl); rot.add(pv); } S.rotors.push(rot); }
  const A = new THREE.Group(); A.position.set(2.9, 0.15, 0.3); Z.add(A); S.line = A;
  const bl2 = rbox(2.0, 0.1, 0.56, MAT.rubber, 0.04); bl2.position.y = 0.45; A.add(bl2);
  for (let i = 0; i < 3; i++) { const lg = rbox(0.06, 0.4, 0.46, MAT.dsteel, 0.02); lg.position.set(-0.8 + i * 0.8, 0.2, 0); A.add(lg); }
  S.mini = []; for (let i = 0; i < 4; i++) { const c = carModel([PL.yellow, PL.sky, PL.green, PL.pink][i]); c.scale.setScalar(0.3); A.add(c); S.mini.push(c); }
  const arch = new THREE.Group(); A.add(arch); for (const s of [-1, 1]) { const p = cyl(0.035, 0.035, 0.95, plastic(PL.yellow, 0.25), 12); p.position.set(0.2, 0.5 + 0.43, s * 0.33); arch.add(p); } const tb = rbox(0.1, 0.1, 0.76, plastic(PL.yellow, 0.25), 0.03); tb.position.set(0.2, 1.4, 0); arch.add(tb);
  S.sparkA = sparks(A, 40, 0xffd27a, 0.04);
  S.carLabs = ['COCHES', 'ROBOTS', 'CENTRALES', 'CADENAS\nDE MONTAJE'].map(s => { const l = textPlane(s.split('\n'), { size: 70, color: '#ffffff', weight: 800, w: s.includes('\n') ? 0.62 : 0.55 }); l.material.opacity = 0; Z.add(l); return l; });
}
function careersAt(t) {
  const wire = env(t, K.sale - 0.05, K.coches + 0.25, 0.25, 0.25), solid = clamp((t - K.coches) / 0.3);
  S.carW.visible = S.carW2.visible = wire > 0.01 && solid < 1; S.carW.material.opacity = wire * (1 - solid); S.carW.material.color.setRGB(1.0, 2.2, 2.6);
  S.car.visible = solid > 0.01; S.car.userData.P.wheels.forEach(w => w.rotation.z = -t * 3 * solid); setOp(S.car, solid);
  const rk = pop(t, K.robots, 0.35); show(S.hrob, rk); const ph = t * 2.2;
  pose(S.hrob, 0.6 * Math.sin(ph * 0.5), -0.4 + 0.3 * Math.sin(ph), 1.1 + 0.3 * Math.sin(ph + 1), 0.6 + 0.3 * Math.sin(ph * 1.3));
  const pk = pop(t, K.centrales, 0.4); show(S.plant, pk);
  const a = S.steam.geometry.attributes.position.array; for (let i = 0; i < 60; i++) { const tt = (t * 0.35 + hash(i)) % 1; a[i * 3] = 0.22 * Math.sin(i * 1.7) * (0.3 + tt); a[i * 3 + 1] = 1.7 + tt * 1.5; a[i * 3 + 2] = 0.22 * Math.cos(i * 2.3) * (0.3 + tt); } S.steam.geometry.attributes.position.needsUpdate = true; S.steam.material.opacity = 0.55 * pk;
  S.rotors.forEach((r, i) => { r.rotation.z = -t * (1.6 + i * 0.4); });
  const lk = pop(t, K.cadenas, 0.4); show(S.line, lk);
  S.mini.forEach((c, i) => { const x = ((i * 0.5 + t * 0.35) % 2.0) - 1.0; c.position.set(x, 0.5, 0); c.visible = Math.abs(x) < 0.95; });
  S.sparkA.visible = lk > 0.5; if (S.sparkA.visible) burst(S.sparkA, v3(0.2, 1.3, 0), t, 0, 0.5, 0.4, true, 4);
  const LT = [K.coches, K.robots, K.centrales, K.cadenas], LP = [v3(-2.4, 1.35, 1.0), v3(-0.75, 2.5, 0.3), v3(1.0, 3.05, 0.3), v3(2.9, 1.9, 0.6)];
  S.carLabs.forEach((l, i) => { l.material.opacity = env(t, LT[i] + 0.05, 99, 0.2, 0.2); l.visible = l.material.opacity > 0.01; l.position.copy(LP[i]); l.quaternion.copy(cam.quaternion); });
  return camKeys(t, careerKeys(), S.stCar.Z);
}
function careerKeys() { return [
  [K.de12 - 0.3, [-2.2, 1.5, 4.9], [-2.4, 0.7, 0.3], 36],
  [K.coches + 0.3, [-2.3, 1.35, 4.3], [-2.4, 0.65, 0.3], 36],
  [K.robots + 0.2, [-0.75, 1.9, 4.8], [-0.75, 1.35, 0.0], 36],
  [K.centrales + 0.3, [0.95, 2.2, 6.0], [0.95, 1.6, -0.3], 36],
  [K.cadenas + 0.35, [2.75, 1.5, 4.4], [2.9, 0.95, 0.3], 36],
  [K.y3 - 0.1, [3.0, 1.65, 4.6], [2.9, 1.05, 0.3], 36],
]; }
// ---- 3.8 la fábrica entera: la cámara se aleja hacia atrás por encima de toda la línea y acaba detrás del graduado
function revealAt(t) {
  const c0 = camKeys(K.y3 - 0.1, careerKeys(), S.stCar.Z);
  return camKeys(t, [
    [K.y3 - 0.1, c0.p.toArray(), c0.l.toArray(), 36],
    [K.acaba + 0.2, [69, 3.4, 6.0], [62, 1.2, 0.4], 38],
    [K.dirigiendo + 0.35, [78, 5.6, 4.4], [56, 0.8, -0.2], 40],
    [K.fabrica2 + 0.2, [84, 6.0, 2.6], [50, 0.8, -0.3], 40],
    [K.y_q, [84, 6.0, 2.6], [50, 0.8, -0.3], 40],
  ]);
}
function buildHall() {
  const Z = zone('hall', 0); S.hallZ = Z; const pm = plastic(0x232838, 0.35), lm = glowM(0xffe2b0, 2.2);
  for (let i = -1; i <= 8; i++) { const x = i * 9 + 4.5;
    for (const z of [-2.6, 2.9]) { const p = rbox(0.28, 5.2, 0.28, pm, 0.04); p.position.set(x, 2.6, z); Z.add(p);
      const lamp = cyl(0.2, 0.28, 0.12, plastic(0x2b303b, 0.3), 24); lamp.position.set(x, 4.9, z + (z < 0 ? 0.45 : -0.45)); Z.add(lamp);
      const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), lm); bulb.rotation.x = Math.PI / 2; bulb.position.set(x, 4.83, z + (z < 0 ? 0.45 : -0.45)); Z.add(bulb);
      const st2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 3.6, 0.02), glowM(0x47d6ff, 1.4)); st2.position.set(x + 0.15, 1.9, z + (z < 0 ? 0.15 : -0.15)); Z.add(st2); }
    const tray = rbox(9, 0.08, 0.32, plastic(0x2b303b, 0.35), 0.02); tray.position.set(x + 4.5, 4.4, -2.6); Z.add(tray); }
}
function neonOn2(n, k, t = 0) {
  if (!n) return; const fl = k > 0 && k < 1 ? (Math.sin(t * 90) > 0.2 ? 1 : 0.35) : 1, e = (0.2 + 1.9 * k) * fl;
  n.userData.l.material.color.setRGB(0.3 + 0.7 * e, 0.3 + 0.7 * e, 0.3 + 0.7 * e);
  n.userData.glow.material.color.copy(n.userData.col).multiplyScalar(0.1 + 1.5 * k * fl); n.userData.glow.material.opacity = 0.2 + 0.8 * k;
}

// ---------------------------------------------------------------- la pieza dorada que lleva la cámara de una escena a otra
function buildLead() {
  S.lead = new THREE.Group(); scene.add(S.lead);
  const g = gear(8, 0.07, 0.04, new THREE.MeshStandardMaterial({ color: 0x3a2400, emissive: 0xffb43a, emissiveIntensity: 3.2, roughness: 0.3, metalness: 0.4 })); S.lead.add(g); S.leadG = g;
  const core = sph(0.03, glowM(0xfff2c0, 9)); S.lead.add(core);
  S.leadL = new THREE.PointLight(0xffc46a, 0, 8, 1.4); scene.add(S.leadL);
  S.trail = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), glowM(0xffc23a, 5), 90); S.trail.frustumCulled = false; scene.add(S.trail);
  S.hit = sparks(scene, 110, 0xffe2a0, 0.06);
}

// ---------------------------------------------------------------- secuencia: qué zona manda en cada instante y cómo se pasa a la siguiente
let SEQ = [];
const D = 0.4;                 // medio vuelo (s)
const smoother = sm5;
function segIdx(t) { let i = 0; SEQ.forEach((s, k) => { if (t >= s.t0) i = k; }); return i; }
function leadAt(A, B, u) { const e = smoother(clamp(u / 0.86)); const p = A.l.clone().lerp(B.l, e); p.y += 0.6 * Math.sin(Math.PI * e); return p; }
const STN = ['base', 'struct', 'thermo', 'elec', 'auto', 'mat', 'biz', 'careers'];
function rigOf(s, t) {
  if (s.zone === 'grad') {
    const wide = env(t, K.seis + 0.2, K.si3 + 0.2, 0.6, 0.6) + (t < 30 ? 0 : 0);
    const a = [v3(GX, 1.6, 0), -Math.PI / 2, 1, 1, 0.55], b = [v3(GX - 20, 0.8, 0), 0, 3.0, 1.0, 0.9];
    return wide > 0 ? [a[0].clone().lerp(b[0], wide), lerp(a[1], b[1], wide), lerp(a[2], b[2], wide), lerp(a[3], b[3], wide), lerp(a[4], b[4], wide)] : a;
  }
  if (s.zone === 'nota') return [v3(NX, 2.6, NZ), 0, 1.5, 1, 0.6];
  if (s.zone === 'knife') return [v3(KX, 1.3, KZ), 0, 0.9, 1, 0.55];
  if (s.zone === 'reveal') { const e = sm5(clamp((t - s.t0) / 1.6)); const a = [v3(SX.careers, 1, 0), 0, 1.2, 1, 0.6], b = [v3(GX - 20, 0.8, 0), 0, 3.0, 1.0, 0.9]; return [a[0].clone().lerp(b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e), lerp(a[3], b[3], e), lerp(a[4], b[4], e)]; }
  return [v3(SX[s.zone], 1.0, 0), 0, 1, 1, 0.55];
}
function camState(t) {
  const i = segIdx(t), cur = SEQ[i], nxt = SEQ[i + 1];
  let A = null, B = null, ts = 0;
  if (i > 0 && cur.trans === 'fly' && t - cur.t0 < D) { A = SEQ[i - 1]; B = cur; ts = cur.t0; }
  else if (nxt && nxt.trans === 'fly' && nxt.t0 - t < D) { A = cur; B = nxt; ts = nxt.t0; }
  if (!A) { const c = cur.fn(t); return { p: c.p, l: c.l, f: c.f || 34, roll: 0, vis: cur.all ? null : [cur.zone], fns: [cur.fn], rig: rigOf(cur, t), lead: null, fade: dipFade(t) }; }
  const ca = A.fn(t), cb = B.fn(t), u = clamp((t - (ts - D)) / (2 * D)), e = smoother(clamp((u - 0.06) / 0.94)), arc = Math.sin(Math.PI * e);
  const p = ca.p.clone().lerp(cb.p, e); p.y += 1.2 * arc;
  const l = ca.l.clone().lerp(cb.l, e).lerp(leadAt(ca, cb, u), 0.55 * Math.sin(Math.PI * u));
  const ra = rigOf(A, t), rb = rigOf(B, t);
  return { p, l, f: lerp(ca.f || 34, cb.f || 34, e), arc, roll: 0.06 * arc * (B.t0 > 20 ? -1 : 1), vis: [A.zone, B.zone], fns: [A.fn, B.fn], rig: [ra[0].clone().lerp(rb[0], e), lerp(ra[1], rb[1], e), lerp(ra[2], rb[2], e), lerp(ra[3], rb[3], e), lerp(ra[4], rb[4], e)], lead: { A: ca, B: cb, u, ts }, fade: dipFade(t) };
}
function dipFade(t) { let f = 0; SEQ.forEach(s => { if (s.trans === 'dip') f = Math.max(f, 1 - clamp(Math.abs(t - s.t0) / 0.3)); }); return f * f * (3 - 2 * f); }

const _fw = new THREE.Vector3(), _qq = new THREE.Vector3(), _frus = new THREE.Frustum(), _pm = new THREE.Matrix4(), _bs = new THREE.Sphere();
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
function frame(t) {
  placeCam(camState(t - 1 / 60)); const prevVP = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  post.uniforms.flash.value = 0;
  const st = camState(t); placeCam(st);
  st.fns.forEach(fn => fn(t));
  // cuando se ve la fábrica entera (y en la respuesta) se animan todas las estaciones; si no, solo las de la escena
  if (!st.vis) { [baseAt, structAt, thermoAt, elecAt, autoAt, matAt, bizAt, careersAt].forEach(fn => fn(t)); gradAt(t); placeCam(st); }
  _frus.setFromProjectionMatrix(_pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  for (const k in zones) {
    if (k === 'hall') { zones[k].visible = !st.vis || st.vis.some(z => STN.includes(z)); continue; }
    if (st.vis) zones[k].visible = st.vis.includes(k);
    else { if (k === 'nota' || k === 'knife') { zones[k].visible = false; continue; } _bs.center.set(zones[k].position.x, 1.5, zones[k].position.z); _bs.radius = k === 'careers' ? 7 : 5.5; zones[k].visible = _frus.intersectsSphere(_bs); }
  }
  // en la respuesta, las estaciones solo se encienden cuando se ve la fábrica (las otras veces, a oscuras detrás)
  rigAt(...st.rig);
  scene.environmentIntensity = 0.5; S.gridM.opacity = 0.2 + 0.35 * (st.arc || 0);
  // pieza dorada, estela e impacto
  S.hit.visible = false;
  if (st.lead) {
    const { A, B, u } = st.lead, vis = clamp(Math.min(u / 0.06, (0.92 - u) / 0.06)), lp = leadAt(A, B, u), sz = 0.9 + 0.6 * Math.sin(Math.PI * u);
    S.lead.visible = vis > 0.01; S.lead.position.copy(lp); S.lead.scale.setScalar(Math.max(0.001, sz * vis * Math.max(1, lp.distanceTo(cam.position) * 0.35))); S.lead.lookAt(cam.position); S.leadG.rotation.z = t * 9;
    S.leadL.position.copy(lp); S.leadL.intensity = 26 * vis;
    S.trail.visible = vis > 0.01;
    const dm = new THREE.Matrix4();
    for (let k = 0; k < 90; k++) { const q = leadAt(A, B, u - (k + 1) * 0.0028), s = Math.max(0.001, 0.03 * vis * (1 - k / 90) * Math.max(1, q.distanceTo(cam.position) * 0.3)); dm.makeScale(s, s, s); dm.setPosition(q.x, q.y, q.z); S.trail.setMatrixAt(k, dm); }
    S.trail.instanceMatrix.needsUpdate = true;
    const th = st.lead.ts - D + 2 * D * 0.86;
    if (t > th) { S.hit.visible = true; burst(S.hit, B.l, t, th, 0.7, 0.45, false, 2); S.hit.material.opacity = Math.max(0, 1 - (t - th) / 0.45); post.uniforms.flash.value = 0.01 * Math.exp(-(t - th) / 0.05); }
  } else { S.lead.visible = S.trail.visible = false; S.leadL.intensity = 0; }
  // desenfoque de movimiento: cuánto se ha movido en pantalla un punto a la distancia a la que se mira
  const dist = Math.min(12, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _qq.copy(cam.position).addScaledVector(_fw, dist).applyMatrix4(prevVP);
  let dx = -_qq.x * 0.25, dy = -_qq.y * 0.25; const L = Math.hypot(dx, dy), MX = 0.1; if (L > MX) { dx *= MX / L; dy *= MX / L; }
  return { dir: [dx, dy], fade: st.fade, vig: 0.32 };
}
function blurPass(src, dst, dx, dy) { quad.material = blurM; blurM.uniforms.tA.value = src.texture; blurM.uniforms.d.value.set(dx, dy); renderer.setRenderTarget(dst); renderer.render(quadScene, quadCam); }
function drawFrame(st, t) {
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  quad.material = brightM; brightM.uniforms.tA.value = rtA.texture; renderer.setRenderTarget(rtB[0]); renderer.render(quadScene, quadCam);
  blurPass(rtB[0], rtB[1], 1 / BW, 0); blurPass(rtB[1], rtB[0], 0, 1 / BH);
  blurPass(rtB[0], rtC[1], 2 / BW, 0); blurPass(rtC[1], rtC[0], 0, 2 / BH); blurPass(rtC[0], rtC[1], 3 / BW, 0); blurPass(rtC[1], rtC[0], 0, 3 / BH);
  quad.material = post; post.uniforms.tA.value = rtA.texture; post.uniforms.tB.value = rtB[0].texture; post.uniforms.tC.value = rtC[0].texture;
  post.uniforms.dir.value.set(st.dir[0], st.dir[1]); post.uniforms.fade.value = st.fade; post.uniforms.vig.value = st.vig; post.uniforms.time.value = t;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
}
window.renderAt = function (t) {
  const st = frame(t);
  if (window.camOverride) { window.camOverride(cam, v3); st.dir = [0, 0]; }
  drawFrame(st, t);
  return true;
};
// portada: el graduado, el casco flotando sin llegar y la interrogación brillando en el hueco
window.renderCover = function () {
  const t = Number(window.COVER_T || K.falta1 + 0.15), st = frame(t);
  const Z = S.gradZ; Z.updateMatrixWorld(); const P = v3(4.4, 1.55, -1.15).applyMatrix4(Z.matrixWorld), L = v3(0, 2.25, 0).applyMatrix4(Z.matrixWorld);
  cam.fov = 34; cam.updateProjectionMatrix(); cam.position.copy(P); cam.up.set(0, 1, 0); cam.lookAt(L); cam.updateMatrixWorld();
  st.dir = [0, 0]; st.fade = 0; drawFrame(st, t);
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '800' }),
    new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-SemiBold.otf)`, { weight: '600' }),
    new FontFace('Serif', `url(${F}LiberationSerif-Regular.ttf)`), new FontFace('Serif', `url(${F}LiberationSerif-Italic.ttf)`, { style: 'italic' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    industrial1: atL(1, 'industrial', 1), acabas: atL(1, 'acabas'), y1: atL(1, '=y'), no1: atL(1, '=no'), industrial2: atL(1, 'industrial', 2),
    al1: atL(2, '=al'), que1: atL(2, 'que'), falta1: atL(2, 'falta'),
    y2: atL(3, '=y'), entrar: atL(3, 'entrar'), dificil: atL(3, 'dificil'), en1: atL(3, '=en'), politecnica: atL(3, 'politecnica'), pidio: atL(3, 'pidio'), trece: atL(3, '13525'), sobre: atL(3, 'sobre'), catorce: atL(3, '=14'),
    nota: atL(3, 'nota'), alta: atL(3, 'alta'), universidad: atL(3, 'universidad'),
    crees: atL(4, 'crees'), ingenieria2: atL(4, 'ingenieria'), mas: atL(4, '=mas'), realidad: atL(4, 'realidad'), son: atL(4, '=son'), todas: atL(4, 'todas'), vez: atL(4, 'vez'), asi: atL(4, 'asi'), dentro: atL(4, 'dentro'),
    base0: atL(5, '=la'), base1: atL(5, 'base'), calculo: atL(5, 'calculo'), algebra: atL(5, 'algebra'), fisica: atL(5, 'fisica'), quimica: atL(5, 'quimica'), dibujo: atL(5, 'dibujo'), tecnico: atL(5, 'tecnico'),
    estructuras: atL(6, 'estructuras'), maquinas: atL(6, 'maquinas'), viga: atL(6, 'viga'), aguanta: atL(6, 'aguanta'), como1: atL(6, 'como'), mueve: atL(6, 'mueve'), mecanismo: atL(6, 'mecanismo'),
    termo: atL(7, 'termodinamica'), calor: atL(7, 'calor'), mueve2: atL(7, 'mueve'), motor: atL(7, '=motor'), agua: atL(7, 'agua'), turbina: atL(7, 'turbina'),
    electricidad: atL(8, 'electricidad'), circuitos: atL(8, 'circuitos'), motores: atL(8, 'motores'), chips: atL(8, 'chips'), controlan: atL(8, 'controlan'),
    automatica: atL(9, 'automatica'), ensenar: atL(9, 'ensenar'), fabrica1: atL(9, 'fabrica'), sola: atL(9, 'sola'),
    materiales: atL(10, 'materiales'), fabricacion: atL(10, 'fabricacion'), de10: atL(10, '=de'), hecho: atL(10, 'hecho'), objeto: atL(10, 'objeto'), y_mat: atL(10, '=y', 2), produce: atL(10, 'produce'),
    y_hasta: atL(11, '=y'), empresa: atL(11, 'empresa'), costes: atL(11, 'costes'), organizacion: atL(11, 'organizacion'), proyectos: atL(11, 'proyectos'),
    de12: atL(12, '=de'), sale: atL(12, 'sale'), disena: atL(12, 'disena'), coches: atL(12, 'coches'), robots: atL(12, 'robots'), centrales: atL(12, 'centrales'), cadenas: atL(12, 'cadenas'),
    y3: atL(12, '=y', 2), acaba: atL(12, 'acaba'), dirigiendo: atL(12, 'dirigiendo'), fabrica2: atL(12, 'fabrica'),
    y_q: atL(13, '=y'), falta2: atL(13, 'falta'), industrial3: atL(13, 'industrial'), master1: atL(13, 'master'),
    profesion: atL(14, 'profesion'), regulada: atL(14, 'regulada'), ejercerla: atL(14, 'ejercerla'), grado: atL(14, 'grado'), master2: atL(14, 'master'), habilitante: atL(14, 'habilitante'),
    en3: atL(14, '=en'), y4: atL(14, '=4'), dos: atL(14, '=2'),
    seis: atL(15, '=6'), fabrica3: atL(15, 'fabrica'),
    si3: atL(16, '=si'), guardalo: atL(16, 'guardalo'), cuentame: atL(16, 'cuentame'), te2: atL(16, '=te'),
  };
  K.y_end_nota = K.crees - 0.3; K.te2 = K.te2;
  SEQ = [
    { zone: 'grad', t0: -1, fn: gradAt },
    { zone: 'nota', t0: K.y2 + 0.02, fn: notaAt, trans: 'fly' },
    { zone: 'knife', t0: K.crees - 0.05, fn: knifeAt, trans: 'fly' },
    { zone: 'base', t0: K.base0, fn: baseAt, trans: 'dip' },
    { zone: 'struct', t0: K.estructuras - 0.12, fn: structAt, trans: 'fly' },
    { zone: 'thermo', t0: K.termo - 0.12, fn: thermoAt, trans: 'fly' },
    { zone: 'elec', t0: K.electricidad - 0.12, fn: elecAt, trans: 'fly' },
    { zone: 'auto', t0: K.automatica - 0.12, fn: autoAt, trans: 'fly' },
    { zone: 'mat', t0: K.materiales - 0.12, fn: matAt, trans: 'fly' },
    { zone: 'biz', t0: K.y_hasta - 0.05, fn: bizAt, trans: 'fly' },
    { zone: 'careers', t0: K.de12 - 0.05, fn: careersAt, trans: 'fly' },
    { zone: 'reveal', t0: K.y3 - 0.1, fn: revealAt, all: true },
    { zone: 'grad', t0: K.y_q, fn: gradAt, all: true },
  ];
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  mats(); buildFloor(); buildRig(); buildLead();
  buildGrad(); buildNota(); buildKnife();
  buildHall(); buildBase(); buildStruct(); buildThermo(); buildElec(); buildAuto(); buildMat(); buildBiz(); buildCareers();
  window.K = K; window.SEQ = SEQ;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
