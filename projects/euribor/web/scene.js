// Reel «Euríbor» — motor 3D monocromo con figuras de ingeniería. window.renderAt(t) dibuja el instante t.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { W, H, clamp, prog, lerp, eo, eio, ss, textSprite, mat, glowMat, withEdges, box } from './lib.js';

// ---------------------------------------------------------------- tiempos (voz alineada, con pausas alargadas)
const K = {
  hook: 0.10, eur: 4.51, tres: 5.9, year: 9.59, month: 12.35, ago: 13.5, sep: 14.8, decimas: 15.71,
  indice: 17.32, ligada: 18.3, hipo: 19.0, cuota: 20.11, sube2: 21.23, ejemplo: 22.76, c150: 23.61, anos: 25.0,
  e88: 26.28, mil: 29.75, revision: 31.43, bce: 33.43, sept: 34.11, deposito: 37.22, d25: 38.2,
  compromete: 40.81, revisar: 43.5, compara: 46.65, fija: 49.74, comenta: 51.98, like: 53.53, end: 55.41,
};
const END = 60.0, ENTRY = 4.4, EXIT = 54.6;

// ---------------------------------------------------------------- render base (igual que Ormuz)
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); document.body.appendChild(renderer.domElement);
const rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const mixMat = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, tB: { value: null }, mixAB: { value: 0 }, blur: { value: 0 }, white: { value: 0 }, black: { value: 0 }, vig: { value: 0.4 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `uniform sampler2D tA,tB; uniform float mixAB,blur,white,black,vig; varying vec2 vUv;
    void main(){ vec2 c=vec2(.5); vec3 a=vec3(0.), b=vec3(0.);
      for(int i=0;i<6;i++){ float s=1.0-blur*0.25*float(i)/5.0; vec2 uv=c+(vUv-c)*s; a+=texture2D(tA,uv).rgb; b+=texture2D(tB,uv).rgb; }
      vec3 col=mix(a,b,mixAB)/6.0; float l=dot(col,vec3(0.2126,0.7152,0.0722)); col=vec3(l);
      vec2 d=(vUv-c)*vec2(0.5625,1.0); col*=1.0-vig*smoothstep(0.25,0.75,length(d)*1.6);
      col=mix(col,vec3(1.0),white); col=mix(col,vec3(0.0),black); gl_FragColor=vec4(col,1.0);}`,
  depthTest: false,
});
const quadScene = new THREE.Scene(); quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mixMat));
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const composer = new EffectComposer(renderer);
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.4, 0.9);
composer.addPass(new TexturePass(rtC.texture)); composer.addPass(bloom); composer.addPass(new OutputPass());

// ---------------------------------------------------------------- utilidades
const S = {};
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const ghostMat = (c = 0xffffff, o = 0.035) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
const sphereMat = (c = 0xffffff, r = 0.3) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.0 });
function line(pts, color = 0xffffff, opacity = 0.8, dashed = false) {
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = dashed ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 0.18, gapSize: 0.12 })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const l = new THREE.Line(g, m); if (dashed) l.computeLineDistances();
  return l;
}
function label(str, o) { o = { ...o, height: o.height * (o.height < 0.45 ? 1.9 : 1.15) }; const s = textSprite(str, o); s.userData.base = s.scale.clone(); return s; }
function show(sp, a, k = 1) {
  sp.visible = a > 0.003; sp.material.opacity = a;
  sp.scale.copy(sp.userData.base).multiplyScalar(k);
}
const pop = (t, t0) => 0.75 + 0.25 * eo(prog(t, t0, 0.35));
// cota técnica entre a y b con marcas en los extremos y flechas
function cota(a, b, color = 0xffffff, tick = 0.18) {
  const g = new THREE.Group();
  g.add(line([a, b], color, 0.9));
  const dir = b.clone().sub(a).normalize();
  const n = Math.abs(dir.y) > 0.9 ? v3(1, 0, 0) : v3(0, 1, 0);
  for (const p of [a, b]) g.add(line([p.clone().addScaledVector(n, -tick), p.clone().addScaledVector(n, tick)], color, 0.9));
  for (const [p, s] of [[a, 1], [b, -1]]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 10), new THREE.MeshBasicMaterial({ color }));
    c.position.copy(p).addScaledVector(dir, 0.1 * s); c.quaternion.setFromUnitVectors(v3(0, 1, 0), dir.clone().multiplyScalar(-s)); g.add(c);
  }
  return g;
}
function setOpacity(obj, a) {
  obj.traverse(o => { if (o.material) { o.material.transparent = true; if (o.userData.op === undefined) o.userData.op = o.material.opacity; o.material.opacity = o.userData.op * a; } });
  obj.visible = a > 0.003;
}

// ---------------------------------------------------------------- despacho con la casa holográfica
const office = new THREE.Scene(); office.background = new THREE.Color(0x07090c); office.fog = new THREE.Fog(0x07090c, 9, 24);
const officeCam = new THREE.PerspectiveCamera(42, W / H, 0.002, 80);

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

function buildOffice() {
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const wood = canvasTex(1024, 512, (g, w, h) => { g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 220; i++) { const y = rnd() * h; g.strokeStyle = `rgba(20,20,20,${0.2 + rnd() * 0.3})`; g.lineWidth = 1 + rnd() * 3; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 40) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 4); g.stroke(); } });
  const city = canvasTex(2048, 800, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0b0b0b'); sky.addColorStop(0.75, '#2a2a2a'); sky.addColorStop(1, '#5a5a5a'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    for (let layer = 0; layer < 2; layer++) { let x = 0; while (x < w) { const bw = 40 + rnd() * 110, bh = (layer ? 120 : 200) + rnd() * (layer ? 220 : 330); g.fillStyle = layer ? '#0c0c0c' : '#171717'; g.fillRect(x, h - bh, bw, bh); for (let wy = h - bh + 12; wy < h - 6; wy += 14) for (let wx = x + 6; wx < x + bw - 6; wx += 11) if (rnd() < 0.3) { g.fillStyle = 'rgba(230,230,230,.8)'; g.fillRect(wx, wy, 5, 6); } x += bw + (layer ? 4 : 12); } }
  });
  const screen = canvasTex(1024, 640, (g, w, h) => {
    g.fillStyle = '#050505'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.12)';
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const cx = w / 2, cy = h / 2; for (let r = 50; r <= 170; r += 40) { g.strokeStyle = `rgba(255,255,255,${0.8 - r / 260})`; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, 130); rg.addColorStop(0, 'rgba(255,255,255,.75)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h);
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x232323, roughness: 0.6 })); floor.rotation.x = -Math.PI / 2; office.add(floor);
  const wallM = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wallM); back.position.set(0, 5, -6); office.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wallM); left.position.set(-9, 5, 0); left.rotation.y = Math.PI / 2; office.add(left);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.6), new THREE.MeshBasicMaterial({ map: city })); win.position.set(1.2, 2.9, -5.98); office.add(win);
  const mull = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 });
  [-3.3, -0.3, 2.7, 5.7].forEach(x => office.add(box(0.08, 3.7, 0.1, mull, x, 2.9, -5.93)));
  [1.07, 4.73].forEach(y => office.add(box(9.1, 0.08, 0.1, mull, 1.2, y, -5.93)));
  const top = box(4.4, 0.1, 2.2, new THREE.MeshStandardMaterial({ map: wood, roughness: 0.35 }), 0, 1.0, 0); office.add(top);
  const leg = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.3, metalness: 0.8 });
  [[-2, -0.9], [2, -0.9], [-2, 0.9], [2, 0.9]].forEach(([x, z]) => office.add(box(0.07, 0.95, 0.07, leg, x, 0.475, z)));
  office.add(box(1.7, 0.035, 1.06, new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.25, metalness: 0.7 }), 0, 1.068, 0.1));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshBasicMaterial({ map: screen })); scr.rotation.x = -Math.PI / 2; scr.position.set(0, 1.087, 0.1); office.add(scr);
  office.add(box(0.55, 0.01, 0.75, new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.9 }), -1.45, 1.056, 0.35));
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.2, 20), new THREE.MeshStandardMaterial({ color: 0xd8d8d8 })); cup.position.set(1.55, 1.15, 0.55); office.add(cup);
  office.add(box(0.9, 0.12, 0.85, new THREE.MeshStandardMaterial({ color: 0x1a1a1a }), 0, 0.62, -1.75));
  office.add(box(0.9, 1.1, 0.1, new THREE.MeshStandardMaterial({ color: 0x1a1a1a }), 0, 1.25, -2.15));
  office.add(new THREE.HemisphereLight(0x8a8a8a, 0x141414, 0.45));
  const lamp = new THREE.PointLight(0xffffff, 6, 7, 1.5); lamp.position.set(-1.6, 2.6, -0.7); office.add(lamp);
  const hl = new THREE.PointLight(0xffffff, 3, 4, 1.8); hl.position.set(0, 1.7, 0.1); office.add(hl);
  // casa holográfica despiezada en plantas
  const holo = new THREE.Group(); holo.position.set(0, 1.11, 0.1); office.add(holo); S.holo = holo;
  const edgeM = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const fillM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const part = (geo) => { const g = new THREE.Group(); g.add(new THREE.Mesh(geo, fillM)); g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeM)); return g; };
  S.floors = [];
  const f0 = part(new THREE.BoxGeometry(0.56, 0.22, 0.44)); f0.userData.y = 0.11;
  const f1 = part(new THREE.BoxGeometry(0.56, 0.2, 0.44)); f1.userData.y = 0.32;
  const r0 = part(new THREE.CylinderGeometry(0.24, 0.4, 0.12, 4, 1)); r0.rotation.y = Math.PI / 4; r0.scale.set(1, 1, 0.8); r0.userData.y = 0.48;
  const r1 = part(new THREE.CylinderGeometry(0.02, 0.24, 0.14, 4, 1)); r1.rotation.y = Math.PI / 4; r1.scale.set(1, 1, 0.8); r1.userData.y = 0.61;
  [f0, f1, r0, r1].forEach((p, i) => { holo.add(p); S.floors.push(p); p.userData.i = i; });
  // puerta y ventanas dibujadas en la fachada (+z)
  const fz = 0.221;
  const door = line([v3(-0.05, 0, fz), v3(-0.05, 0.14, fz), v3(0.05, 0.14, fz), v3(0.05, 0, fz)], 0xffffff, 1); f0.add(door); door.position.y = -0.11;
  for (const x of [-0.18, 0.18]) { const w = line([v3(x - 0.05, 0.05, fz), v3(x + 0.05, 0.05, fz), v3(x + 0.05, 0.13, fz), v3(x - 0.05, 0.13, fz), v3(x - 0.05, 0.05, fz)], 0xffffff, 0.8); w.position.y = -0.11; f0.add(w); }
  for (const x of [-0.18, 0, 0.18]) { const w = line([v3(x - 0.05, 0.04, fz), v3(x + 0.05, 0.04, fz), v3(x + 0.05, 0.13, fz), v3(x - 0.05, 0.13, fz), v3(x - 0.05, 0.04, fz)], 0xffffff, 0.8); w.position.y = -0.1; f1.add(w); }
  S.doorLocal = v3(0, 0.07, fz);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.36, 1.0, 48, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying float vY; void main(){ vY=uv.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    uniforms: { k: { value: 1 } }, fragmentShader: 'uniform float k; varying float vY; void main(){ gl_FragColor=vec4(vec3(1.),(1.-vY)*.16*k); }' }));
  beam.position.y = 0.5; holo.add(beam); S.holoBeam = beam; S.fillM = fillM;
  const P = []; for (let i = 0; i < 220; i++) { const a = (i * 2.399) % (Math.PI * 2), r = Math.sqrt((i * 0.618) % 1) * 0.45; P.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
  S.parts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(P, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.012, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  holo.add(S.parts);
}

function holoAt(tau) {
  const near = prog(tau, 2.5, 0.8);
  S.holoBeam.visible = near < 1; S.holoBeam.material.uniforms.k.value = 1 - near;
  S.parts.material.opacity = 0.8 * (1 - near);
  S.fillM.opacity = 0.07 * (1 - prog(tau, 3.1, 0.4));
  const sep = 0.035 + 0.035 * (0.5 + 0.5 * Math.sin(tau * 2.2));   // las plantas se separan y se juntan
  S.floors.forEach(f => (f.position.y = f.userData.y + f.userData.i * sep));
  S.holo.rotation.y = (tau - 3.9) * 0.55;                          // en τ = 3,9 la puerta mira a cámara
  const pa = S.parts.geometry.attributes.position.array;
  for (let i = 0; i < pa.length / 3; i++) pa[i * 3 + 1] = ((i * 0.37 % 1) * 1.2 + tau * (0.15 + (i % 7) * 0.03)) % 1.2;
  S.parts.geometry.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------- laboratorio (negro) y sala blanca
const lab = new THREE.Scene(); lab.background = new THREE.Color(0x000000); lab.fog = new THREE.Fog(0x000000, 20, 55);
const labCam = new THREE.PerspectiveCamera(44, W / H, 0.01, 200);
const labCam2 = new THREE.PerspectiveCamera(44, W / H, 0.01, 200);
const white = new THREE.Scene(); white.background = new THREE.Color(0xffffff); white.fog = new THREE.Fog(0xffffff, 20, 55);
const whiteCam = new THREE.PerspectiveCamera(44, W / H, 0.01, 200);

const SP = 26;   // separación entre estaciones
const C = i => v3(i * SP, 0, 0);
// estaciones: centro, tiempos y encuadre (desfase de cámara y punto al que mira)
const ST = [
  { name: 'giro', t0: 4.4, t1: 9.3, off: v3(-2.5, 2.2, 12), look: v3(0, 1.0, 0) },
  { name: 'columnas', t0: 9.3, t1: 12.1, off: v3(-1.2, 3.0, 14.5), look: v3(0, 1.4, 0) },
  { name: 'regla', t0: 12.1, t1: 17.0, off: v3(-3.2, 2.8, 11), look: v3(0, 2.6, 0) },
  { name: 'newton', t0: 17.0, t1: 19.9, off: v3(-1.0, 2.0, 16.5), look: v3(0, 1.3, 0) },
  { name: 'piramide', t0: 19.9, t1: 22.4, off: v3(-3.5, 3.8, 11.5), look: v3(0, 1.4, 0) },
  { name: 'embudo', t0: 22.4, t1: 29.4, off: v3(-1.6, 2.4, 13.5), look: v3(0.5, 1.8, 0) },
  { name: 'pista', t0: 29.4, t1: 33.0, off: v3(-2, 5.5, 11), look: v3(0, 0.6, 0) },
  { name: 'piston', t0: 33.0, t1: 40.4, off: v3(-2.5, 2.6, 11), look: v3(0, 2.4, 0) },
  { name: 'pendulo', t0: 40.4, t1: 43.3, off: v3(-2.2, 1.6, 11), look: v3(0, 1.4, 0) },
  { name: 'rieles', t0: 49.4, t1: 60, off: v3(-0.8, 2.2, 15.5), look: v3(0.9, 1.3, 0) },
];
const WT = [
  { name: 'calendario', t0: 43.3, t1: 46.5, off: v3(-3, 7, 9.5), look: v3(0, 0, 0) },
  { name: 'balanza', t0: 46.5, t1: 49.4, off: v3(-1.2, 2.4, 14.5), look: v3(0, 1.6, 0) },
];
ST.forEach((s, i) => (s.c = C(i)));
WT.forEach((s, i) => (s.c = C(i)));

function buildLab() {
  for (const [sc, dark] of [[lab, true], [white, false]]) {
    sc.add(new THREE.AmbientLight(0xffffff, dark ? 0.05 : 0.55));
    const key = new THREE.DirectionalLight(0xffffff, dark ? 2.8 : 1.6); key.position.set(-7, 10, 7); sc.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, dark ? 0.6 : 0.4); rim.position.set(8, 3, -8); sc.add(rim);
    const grid = new THREE.GridHelper(400, 200, dark ? 0x2a2a2a : 0xbdbdbd, dark ? 0x141414 : 0xe2e2e2); grid.position.set(100, -2.2, 0); sc.add(grid);
  }
  const T = {}; S.T = T;
  const L = (sc, key, str, o, p) => { const s = label(str, o); s.position.copy(p); sc.add(s); T[key] = s; s.visible = false; return s; };
  const mono = (sz, h) => ({ size: sz, weight: 700, font: 'Mono', height: h, spacing: 0.2 });

  // 0 · giroscopio
  { const c = ST[0].c, g = new THREE.Group(); g.position.copy(c).add(v3(0, 1, 0)); lab.add(g); S.giro = g;
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.0, 64, 48), sphereMat()));
    S.rings = [1.6, 2.0, 2.4].map((r, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.02 + 0.01 * i, 8, 160), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35 })); g.add(m); return m; });
    S.ringCota = cota(v3(0, 0, 0), v3(3.0, 0, 0)); S.ringCota.position.copy(c).add(v3(0, -0.9, 0.2)); lab.add(S.ringCota);
    L(lab, 'eurTag', 'EURÍBOR · 12 MESES', mono(70, 0.32), c.clone().add(v3(0, 4.3, 0)));
    L(lab, 'eurVal', '3,247 %', { size: 160, height: 1.25 }, c.clone().add(v3(0, 3.5, 0)));
    L(lab, 'eurSep', 'SEPTIEMBRE 2026 · BANCO DE ESPAÑA', mono(56, 0.24), c.clone().add(v3(1.5, -1.35, 0.2))); }

  // 1 · columnas despiezadas 2025 / 2026
  { const c = ST[1].c; S.cols = [];
    const slab = (x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 1.5), ghostMat()); withEdges(m, 0xffffff, 0.9); m.position.set(c.x + x, y, c.z); lab.add(m); return m; };
    for (let i = 0; i < 9; i++) S.cols.push({ m: slab(-1.6, -1.9 + i * 0.27), base: true });
    for (let i = 0; i < 13; i++) S.cols.push({ m: slab(1.6, -1.9 + i * 0.27), extra: i >= 9, i, y: -1.9 + i * 0.27 });
    S.colCota = cota(v3(0, -1.9 + 9 * 0.27, 0), v3(0, -1.9 + 13 * 0.27, 0)); S.colCota.position.set(c.x + 2.75, 0, c.z); lab.add(S.colCota);
    L(lab, 'c25', '2025\n2,172 %', { size: 90, weight: 800, height: 0.75 }, c.clone().add(v3(-1.6, -2.75, 1)));
    L(lab, 'c26', '2026\n3,247 %', { size: 90, weight: 800, height: 0.75 }, c.clone().add(v3(1.6, -2.75, 1)));
    L(lab, 'cMas', '+1,075\npuntos', { size: 110, height: 0.95 }, c.clone().add(v3(1.6, 3.2, 0.5))); }

  // 2 · regla graduada
  { const c = ST[2].c, Y = v => -1.5 + (v - 2.8) * 10;
    lab.add(box(0.08, 6.6, 0.08, sphereMat(0xbbbbbb), c.x - 1.2, Y(3.1), c.z));
    for (let v = 2.8; v <= 3.401; v += 0.02) { const big = Math.abs(v * 10 - Math.round(v * 10)) < 0.001; lab.add(line([v3(c.x - 1.2, Y(v), 0), v3(c.x - 1.2 + (big ? 0.5 : 0.22), Y(v), 0)], 0xffffff, big ? 0.9 : 0.45));
      if (big) { const s = label(v.toFixed(1).replace('.', ','), { size: 60, weight: 700, font: 'Mono', height: 0.26, color: '#9a9a9a' }); s.position.set(c.x - 1.9, Y(v), 0); lab.add(s); } }
    const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.6, 0.14, 1.6)), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.1, gapSize: 0.08, transparent: true, opacity: 0.6 }));
    ghost.computeLineDistances(); ghost.position.set(c.x + 0.4, Y(2.954), 0); lab.add(ghost);
    const sl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 1.6), ghostMat(0xffffff, 0.08)); withEdges(sl, 0xffffff, 1.0); sl.position.set(c.x + 0.4, Y(2.954), 0); lab.add(sl); S.rSlab = sl; S.rY = Y;
    S.rCota = cota(v3(0, Y(2.954), 0), v3(0, Y(3.247), 0)); S.rCota.position.set(c.x + 1.65, 0, 0); lab.add(S.rCota);
    L(lab, 'rAgo', 'AGO · 2,954 %', mono(64, 0.3), v3(c.x + 0.4, Y(2.954) - 0.42, 0.9));
    L(lab, 'rSep', 'SEP · 3,247 %', mono(64, 0.3), v3(c.x + 0.4, Y(3.247) + 0.45, 0.9));
    L(lab, 'rMas', '+0,293', { size: 130, height: 0.8 }, v3(c.x + 1.6, Y(3.1) + 2.7, 0.3)); }

  // 3 · péndulo de Newton
  { const c = ST[3].c, g = new THREE.Group(); g.position.copy(c); lab.add(g);
    const frame = sphereMat(0x9a9a9a, 0.4);
    for (const z of [-0.6, 0.6]) { g.add(box(5.2, 0.06, 0.06, frame, 0, 3.2, z)); for (const x of [-2.6, 2.6]) g.add(box(0.06, 5.0, 0.06, frame, x, 0.7, z)); }
    S.balls = [];
    for (let i = 0; i < 5; i++) {
      const piv = new THREE.Group(); piv.position.set(-1.8 + i * 0.9, 3.2, 0); g.add(piv);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.44, 48, 36), sphereMat()); b.position.y = -2.4; piv.add(b);
      piv.add(line([v3(0, 0, -0.6), v3(0, -2.4, 0)], 0xffffff, 0.5)); piv.add(line([v3(0, 0, 0.6), v3(0, -2.4, 0)], 0xffffff, 0.5));
      S.balls.push(piv);
    }
    L(lab, 'nEur', 'EURÍBOR', mono(66, 0.3), c.clone().add(v3(-2.2, -0.35, 0.8)));
    L(lab, 'nHip', 'TU HIPOTECA', mono(66, 0.3), c.clone().add(v3(2.2, -0.35, 0.8))); }

  // 4 · pirámide despiezada (cuota)
  { const c = ST[4].c; S.pyr = [];
    for (let i = 0; i < 5; i++) {
      const rb = 2.3 * (1 - i / 5), rt = 2.3 * (1 - (i + 1) / 5);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, 0.62, 4, 1), ghostMat()); m.rotation.y = Math.PI / 4; withEdges(m, 0xffffff, 0.95);
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), glowMat()); m.add(node);
      m.position.copy(c); lab.add(m); S.pyr.push(m);
    }
    S.pyrNew = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 0.62, 4, 1), ghostMat(0xffffff, 0.06)); S.pyrNew.rotation.y = Math.PI / 4; withEdges(S.pyrNew, 0xffffff, 1.0); lab.add(S.pyrNew);
    S.pyrNew.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), glowMat()));
    S.pyrAxis = line([v3(0, 0, 0), v3(0, 1, 0)], 0xffffff, 0.5, true); lab.add(S.pyrAxis);
    L(lab, 'pCuota', 'TU CUOTA ▲', { size: 120, height: 0.85 }, c.clone().add(v3(0, 4.6, 0))); }

  // 5 · embudo y raíl con esferas
  { const c = ST[5].c;
    const fun = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.CylinderGeometry(1.1, 0.3, 1.4, 24, 3, true)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
    fun.position.copy(c).add(v3(-1.6, 3.5, 0)); lab.add(fun);
    S.railA = c.clone().add(v3(-1.6, 1.3, 0)); S.railB = c.clone().add(v3(2.6, -0.5, 0));
    for (const z of [-0.18, 0.18]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, S.railA.distanceTo(S.railB), 8), sphereMat(0xaaaaaa, 0.4));
      r.position.copy(S.railA.clone().add(S.railB).multiplyScalar(0.5)).add(v3(0, 0, z)); r.quaternion.setFromUnitVectors(v3(0, 1, 0), S.railB.clone().sub(S.railA).normalize()); lab.add(r); }
    lab.add(box(0.08, 0.6, 0.6, sphereMat(0x888888), S.railB.x + 0.3, S.railB.y + 0.1, 0));
    S.coins = []; for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.26, 40, 30), sphereMat()); lab.add(b); S.coins.push(b); }
    L(lab, 'e88', '+88 €/mes', { size: 150, height: 1.0 }, c.clone().add(v3(0.6, 5.3, 0)));
    L(lab, 'eEj', 'EJEMPLO\n150.000 € · 25 AÑOS · DIF. 1 %', mono(52, 0.3), c.clone().add(v3(0.4, -1.5, 0.6))); }

  // 6 · pista circular de 12 esferas y pila
  { const c = ST[6].c;
    const track = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.03, 8, 160), sphereMat(0x999999, 0.4)); track.rotation.x = Math.PI / 2; track.position.copy(c).add(v3(0, 1.6, 0)); lab.add(track);
    S.track12 = []; for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 24), sphereMat()); lab.add(b); S.track12.push(b); }
    const pile = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pile.push(v3((i - 1) * 0.46, 0, (j - 1) * 0.46));
    for (const [i, j] of [[0, 0], [1, 0], [0, 1]]) pile.push(v3((i - 0.5) * 0.46, 0.38, (j - 0.5) * 0.46));
    S.pile = pile.map(p => p.add(c.clone().add(v3(0, -1.55, 0))));
    L(lab, 'm1000', '+1.000 €/año', { size: 150, height: 1.0 }, c.clone().add(v3(0, 4.4, 0)));
    L(lab, 'm12', '12 REVISIONES DE CUOTA', mono(56, 0.25), c.clone().add(v3(0, 3.6, 0))); }

  // 7 · pistón en cilindro graduado (BCE)
  { const c = ST[7].c, Y = v => -1.2 + (v - 2.0) * 7;
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 5.4, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
    glass.position.copy(c).add(v3(0, 1.5, 0)); lab.add(glass);
    for (const y of [-1.2, 4.2]) { const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; pts.push(v3(c.x + Math.cos(a), y, Math.sin(a))); } lab.add(line(pts, 0xffffff, 0.6)); }
    for (let v = 2.0; v <= 2.751; v += 0.05) { const big = Math.round(v * 100) % 25 === 0; lab.add(line([v3(c.x + 1.02, Y(v), 0.2), v3(c.x + 1.02 + (big ? 0.45 : 0.2), Y(v), 0.2)], 0xffffff, big ? 0.9 : 0.4));
      if (big) { const s = label(v.toFixed(2).replace('.', ','), { size: 56, weight: 700, font: 'Mono', height: 0.25, color: '#a0a0a0' }); s.position.set(c.x + 1.95, Y(v), 0.2); lab.add(s); } }
    S.piston = new THREE.Group(); S.piston.position.copy(c); lab.add(S.piston);
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.96, 0.22, 64), sphereMat(0xeeeeee, 0.35)); withEdges(disk, 0xffffff, 0.6); S.piston.add(disk);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 24), sphereMat(0x888888, 0.35)); rod.position.y = -2.1; S.piston.add(rod);
    S.pY = Y;
    L(lab, 'bTag', 'BCE · TIPO DE DEPÓSITO', mono(64, 0.3), c.clone().add(v3(0, 5.25, 0)));
    L(lab, 'bVal', '2,50 %', { size: 160, height: 1.2 }, c.clone().add(v3(0, 4.55, 0.3)));
    L(lab, 'bAnt', 'ANTES · 2,25 %', mono(54, 0.24), c.clone().add(v3(-1.9, Y(2.25), 0.6))); }

  // 8 · péndulo indeciso con tres trayectorias
  { const c = ST[8].c;
    S.pend = new THREE.Group(); S.pend.position.copy(c).add(v3(0, 4.0, 0)); lab.add(S.pend);
    S.pend.add(line([v3(0, 0, 0), v3(0, -2.6, 0)], 0xffffff, 0.8));
    S.bob = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 36), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.1, roughness: 0.3 }));
    S.bob.position.y = -2.6; S.pend.add(S.bob);
    for (const dx of [-1, 0, 1]) { const pts = []; for (let k = 0; k <= 30; k++) { const u = k / 30; pts.push(v3(c.x + dx * 2.6 * u * u, 1.0 - u * 3.4, -u * 4)); } lab.add(line(pts, 0xffffff, 0.6, true)); } }

  // 9 · dos raíles: recto (fija) y ondulado (variable)
  { const c = ST[9].c; S.rail1 = []; S.rail2 = [];
    for (let k = 0; k <= 80; k++) { const u = k / 80; S.rail1.push(v3(c.x - 1.6 + u * 5, 2.2 - u * 0.6, 0)); S.rail2.push(v3(c.x - 1.6 + u * 5, 0.2 - u * 0.6 + 0.55 * Math.sin(u * Math.PI * 5) * u, 0)); }
    lab.add(line(S.rail1, 0xffffff, 0.85)); lab.add(line(S.rail2, 0xffffff, 0.85));
    lab.add(line([S.rail1[0], S.rail2[0]], 0xffffff, 0.35, true));
    S.r1 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 40, 30), sphereMat()); lab.add(S.r1);
    S.r2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 40, 30), sphereMat()); lab.add(S.r2);
    L(lab, 'fFija', 'FIJA', mono(80, 0.38), c.clone().add(v3(3.6, 2.15, 0.4)));
    L(lab, 'fVar', 'VARIABLE', mono(80, 0.38), c.clone().add(v3(3.4, -0.85, 0.4)));
    L(lab, 'fQ', '¿Fija o variable?', { size: 120, height: 0.85 }, c.clone().add(v3(0.9, 4.3, 0))); }

  // sala blanca · calendario despiezado y balanza
  { const c = WT[0].c; S.tiles = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7 })); withEdges(m, 0x000000, 0.7); m.position.set(c.x + (i - 2.5) * 1.05, 0, c.z + (j - 2) * 1.05); white.add(m); S.tiles.push({ m, i, j }); }
    S.lens = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 12, 64), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 })); S.lens.rotation.x = Math.PI / 2; white.add(S.lens);
    L(white, 'cRev', 'TU PRÓXIMA REVISIÓN', { size: 90, weight: 800, color: '#111111', height: 0.62, font: 'Inter' }, c.clone().add(v3(0, 3.2, -1)));
    const c2 = WT[1].c;
    white.add(new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.6, 3), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 })).translateX(c2.x).translateY(0.0));
    S.beam = new THREE.Group(); S.beam.position.copy(c2).add(v3(0, 1.4, 0)); white.add(S.beam);
    S.beam.add(box(5.2, 0.08, 0.08, new THREE.MeshStandardMaterial({ color: 0x222222 })));
    S.weight = new THREE.Mesh(new THREE.SphereGeometry(0.32, 48, 36), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.25 })); S.weight.position.copy(S.beam.position); white.add(S.weight);
    S.pans = [];
    for (const s of [-1, 1]) { const pan = new THREE.Group(); white.add(pan); S.pans.push({ pan, s });
      pan.add(line([v3(-0.5, 0, 0), v3(0, 1.4, 0), v3(0.5, 0, 0)], 0x111111, 0.7));
      pan.add(box(1.3, 0.05, 1.3, new THREE.MeshStandardMaterial({ color: 0x333333 }), 0, 0, 0));
      for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.8), ghostMat(0x000000, 0.03)); withEdges(m, 0x000000, 0.95); m.position.y = 0.12 + k * 0.22; pan.add(m); } }
    L(white, 'cCmp', 'COMPARA', { size: 110, weight: 900, color: '#111111', height: 0.75 }, c2.clone().add(v3(0, 4.3, 0))); }
}

// ---------------------------------------------------------------- animación de estaciones
function animLab(t) {
  const T = S.T;
  for (const k in T) T[k].visible = false;
  // giroscopio
  S.rings[0].rotation.set(t * 0.9, t * 0.4, 0); S.rings[1].rotation.set(0.6, t * -0.7, t * 0.5); S.rings[2].rotation.set(Math.PI / 2 + 0.3 * Math.sin(t), 0, t * 0.6);
  const open = eo(prog(t, K.tres, 1.0));
  S.rings[2].scale.setScalar(1 + 0.25 * open);
  setOpacity(S.ringCota, open);
  show(T.eurTag, prog(t, K.eur - 0.2, 0.4)); show(T.eurVal, prog(t, K.tres, 0.35), pop(t, K.tres)); show(T.eurSep, prog(t, K.tres + 0.6, 0.4));
  // columnas
  for (const s of S.cols) if (s.extra) { const a = eo(prog(t, K.year + 0.2 + (s.i - 9) * 0.22, 0.6)); s.m.position.y = s.y + (1 - a) * 4; s.m.position.x = ST[1].c.x + 1.6 + (1 - a) * 2.5; s.m.visible = a > 0; }
  setOpacity(S.colCota, prog(t, K.year + 1.2, 0.4));
  show(T.c25, prog(t, 9.4, 0.4)); show(T.c26, prog(t, 9.6, 0.4)); show(T.cMas, prog(t, K.year + 1.2, 0.35), pop(t, K.year + 1.2));
  // regla
  const ry = eio(prog(t, K.sep - 0.2, 1.0));
  S.rSlab.position.y = S.rY(2.954 + 0.293 * ry);
  setOpacity(S.rCota, prog(t, K.decimas - 0.3, 0.4));
  show(T.rAgo, prog(t, K.ago - 0.3, 0.4)); show(T.rSep, prog(t, K.sep + 0.5, 0.4)); show(T.rMas, prog(t, K.decimas - 0.2, 0.35), pop(t, K.decimas - 0.2));
  // Newton
  const pull = eio(prog(t, 17.4, 0.55)), fall = prog(t, 17.95, 0.33);
  let aL = -0.7 * pull; if (t >= 17.95) aL = -0.7 * Math.cos(fall * Math.PI / 2);
  if (t >= 18.28) aL = 0;
  let aR = 0; if (t >= 18.28) { const u = t - 18.28; aR = 0.75 * Math.sin(Math.min(u, 0.9) / 0.9 * Math.PI / 2) * (u > 0.9 ? Math.cos((u - 0.9) * 2.2) * Math.exp(-(u - 0.9) * 0.6) : 1); }
  S.balls.forEach((b, i) => (b.rotation.z = i === 0 ? aL : i === 4 ? aR : 0));
  show(T.nEur, prog(t, 17.3, 0.4)); show(T.nHip, prog(t, K.hipo - 0.3, 0.4), pop(t, K.hipo - 0.3));
  // pirámide
  const sep = 0.08 + 0.35 * eo(prog(t, 20.1, 0.7)), add = eio(prog(t, K.sube2 - 0.1, 0.6));
  const c4 = ST[4].c;
  S.pyrNew.position.set(c4.x, -1.5 + 0.0, 0); S.pyrNew.visible = add > 0; S.pyrNew.position.x = c4.x - (1 - add) * 5;
  S.pyr.forEach((m, i) => (m.position.y = -1.5 + (i + add) * (0.62 + sep)));
  S.pyrAxis.position.set(c4.x, -1.8, 0); S.pyrAxis.scale.set(1, (5 + add) * (0.62 + sep) + 0.6, 1);
  show(T.pCuota, prog(t, K.sube2, 0.35), pop(t, K.sube2));
  // embudo y raíl
  const rd = S.railB.clone().sub(S.railA);
  S.coins.forEach((b, i) => {
    const t0 = 22.9 + i * 0.55, u = t - t0;
    if (u < 0) { b.visible = false; return; } b.visible = true;
    const stop = 1 - i * 0.12;               // posición de parada en el raíl (se van apilando hacia atrás)
    if (u < 0.55) { const k = u / 0.55; b.position.copy(ST[5].c).add(v3(-1.6, 4.3 - 3.0 * k * k, 0)); }
    else { const k = Math.min(1, (u - 0.55) / 1.3); const f = k * k * stop; b.position.copy(S.railA).addScaledVector(rd, f).add(v3(0, 0.3, 0));
      if (k >= 1) b.position.addScaledVector(rd, -0.004 * Math.sin((t - t0 - 1.85) * 12) * Math.exp(-(t - t0 - 1.85) * 3)); }
    b.rotation.z = -u * 4;
  });
  show(T.e88, prog(t, K.e88, 0.35), pop(t, K.e88)); show(T.eEj, prog(t, K.c150 - 0.3, 0.4));
  // pista circular
  const c6 = ST[6].c;
  S.track12.forEach((b, i) => {
    const a = i / 12 * Math.PI * 2 + t * 0.9, tdrop = K.mil + 0.25 + i * 0.16;
    const onTrack = v3(c6.x + Math.cos(a) * 2.4, 1.85, Math.sin(a) * 2.4);
    if (t < tdrop) b.position.copy(onTrack);
    else { const k = eio(prog(t, tdrop, 0.6)); b.position.copy(onTrack).lerp(S.pile[i], k); b.position.y += Math.sin(k * Math.PI) * 0.8; }
  });
  show(T.m1000, prog(t, K.mil, 0.35), pop(t, K.mil)); show(T.m12, prog(t, K.mil + 0.5, 0.4));
  // pistón
  const pv = 2.0 + 0.25 * eo(prog(t, 33.4, 1.2)) + 0.25 * eio(prog(t, K.d25 - 0.6, 1.0));
  S.piston.position.y = S.pY(pv);
  show(T.bTag, prog(t, K.bce, 0.4)); show(T.bVal, prog(t, K.d25, 0.35), pop(t, K.d25)); show(T.bAnt, prog(t, 34.4, 0.4) * (1 - prog(t, K.d25, 0.5)));
  // péndulo
  S.pend.rotation.z = 0.55 * Math.sin((t - 40.4) * 2.4) * (1 - 0.6 * prog(t, 42.4, 0.6));
  S.bob.material.emissiveIntensity = 0.1 + 2.5 * ss(prog(t, 42.7, 0.5));
  // raíles
  const u1 = eio(prog(t, 50.1, 2.6)), u2 = eio(prog(t, 50.1, 2.6));
  const at = (pts, u) => { const f = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)); return pts[i].clone().lerp(pts[i + 1], f - i).add(v3(0, 0.3, 0)); };
  S.r1.position.copy(at(S.rail1, u1)); S.r2.position.copy(at(S.rail2, u2));
  show(T.fFija, prog(t, 50.3, 0.4)); show(T.fVar, prog(t, 50.7, 0.4)); show(T.fQ, prog(t, K.fija, 0.35), pop(t, K.fija));
}

function animWhite(t) {
  const T = S.T;
  const lift = eo(prog(t, 44.2, 0.6));
  S.tiles.forEach(o => { const hi = o.i === 3 && o.j === 1; o.m.position.y = hi ? 0.9 * lift : 0; o.m.material.color.setHex(hi && lift > 0.5 ? 0x222222 : 0xf2f2f2); });
  const c = WT[0].c, u = eio(prog(t, 43.6, 1.8));
  S.lens.position.set(c.x + lerp(-2.6, (3 - 2.5) * 1.05, u), 1.0 + 0.9 * lift, c.z + lerp(1.8, (1 - 2) * 1.05, u));
  show(T.cRev, prog(t, 43.9, 0.4));
  const ang = 0.22 * Math.exp(-(t - 46.6) * 1.1) * Math.cos((t - 46.6) * 4.0) * (t > 46.6 ? 1 : 0) + (t <= 46.6 ? 0.22 : 0);
  S.beam.rotation.z = ang;
  S.pans.forEach(({ pan, s }) => { const p = v3(s * 2.4, 0, 0).applyAxisAngle(v3(0, 0, 1), ang).add(S.beam.position); pan.position.set(p.x, p.y - 1.4, p.z); });
  show(T.cCmp, prog(t, K.compara, 0.35) * (1 - prog(t, 48.6, 0.3)), pop(t, K.compara));
}

// cámara de una estación con un ligero arco; entre estaciones vuela de una a otra
function poseAt(list, cam, t) {
  let i = list.findIndex(s => t >= s.t0 && t < s.t1); if (i < 0) i = t < list[0].t0 ? 0 : list.length - 1;
  const st = list[i];
  const pose = (s, tt) => { const u = clamp((tt - s.t0) / (s.t1 - s.t0)); const a = lerp(-0.18, 0.18, u); const off = s.off.clone().applyAxisAngle(v3(0, 1, 0), a).multiplyScalar(lerp(1.06, 0.94, u)); return { p: s.c.clone().add(off), l: s.c.clone().add(s.look) }; };
  let P = pose(st, t);
  if (i > 0 && list[i - 1].t1 >= st.t0 - 0.01) {
    const k = eio(prog(t, st.t0, 0.8));
    if (k < 1) { const Q = pose(list[i - 1], list[i - 1].t1); P = { p: Q.p.lerp(P.p, k), l: Q.l.lerp(P.l, k) }; }
  }
  cam.position.copy(P.p); cam.up.set(0, 1, 0); cam.lookAt(P.l);
  return P;
}

// ---------------------------------------------------------------- secciones
function entry(tau) {
  holoAt(tau);
  const out = { scene: office, cam: officeCam, bloom: 0.6 };
  const door = S.holo.localToWorld(S.doorLocal.clone());
  // plano general → acercamiento a la casa → la cámara entra por la puerta
  let pos, tgt;
  if (tau < 1.8) { const u = eio(tau / 1.8); const ang = lerp(-0.45, -0.1, u), rad = lerp(5.6, 3.2, u); pos = v3(Math.sin(ang) * rad, lerp(2.6, 2.0, u), 0.1 + Math.cos(ang) * rad); tgt = v3(0, lerp(1.6, 1.35, u), 0.1); }
  else {
    const u = eio(prog(tau, 1.8, 2.3));
    const p0 = v3(Math.sin(-0.1) * 3.2, 2.0, 0.1 + Math.cos(-0.1) * 3.2);
    const p1 = door.clone().add(v3(0, 0.12, 0.9)), p2 = door.clone().add(v3(0, 0, -0.05));
    pos = u < 0.7 ? p0.lerp(p1, eio(u / 0.7)) : p1.lerp(p2, eio((u - 0.7) / 0.3));
    tgt = v3(0, 1.35, 0.1).lerp(door, eio(Math.min(1, u * 1.3)));
  }
  officeCam.position.copy(pos); officeCam.lookAt(tgt);
  if (tau >= 3.75) {   // dentro de la casa: el laboratorio
    animLab(ST[0].t0); poseAt(ST, labCam2, ST[0].t0);
    out.sceneB = lab; out.camB = labCam2; out.mixB = ss(prog(tau, 3.75, 0.55)); out.blur = Math.sin(Math.PI * prog(tau, 3.75, 0.55)) * 0.12;
  }
  return out;
}

function frameState(t) {
  if (t < ENTRY) return entry(t);
  if (t >= EXIT) return entry((END - t) * ENTRY / (END - EXIT));
  if (t >= 43.3 && t < 49.4) {   // sala blanca
    animWhite(t); poseAt(WT, whiteCam, t);
    const out = { scene: white, cam: whiteCam, bloom: 0, white: 1 - ss(prog(t, 43.3, 0.3)) };
    const dive = ss(prog(t, 48.75, 0.65));
    if (dive > 0) { whiteCam.position.lerp(S.weight.position.clone().add(v3(0, 0, 0.36)), Math.pow(dive, 1.2)); whiteCam.lookAt(S.weight.position); }
    out.black = ss(prog(t, 49.22, 0.16));
    return out;
  }
  animLab(t);
  poseAt(ST, labCam, t);
  const out = { scene: lab, cam: labCam, bloom: 0.6 };
  if (t >= 40.4 && t < 43.3) {   // entrada en la esfera blanca del péndulo
    const dive = ss(prog(t, 42.6, 0.7));
    if (dive > 0) { const b = S.bob.getWorldPosition(new THREE.Vector3()); labCam.position.lerp(b.clone().add(v3(0, 0, 0.56)), Math.pow(dive, 1.2)); labCam.lookAt(b); }
    out.white = ss(prog(t, 43.12, 0.16));
  }
  if (t >= 49.4) out.black = 1 - ss(prog(t, 49.4, 0.3));
  if (t > 54.3) { animLab(ST[0].t0); }
  if (t > 54.25) { poseAt(ST, labCam2, ST[0].t0); out.sceneB = lab; out.camB = labCam2; out.mixB = ss(prog(t, 54.25, 0.35)); }
  return out;
}

// portada: giroscopio sin textos, centrado y algo más cerca
window.renderCover = function () {
  animLab(7.2); for (const k in S.T) S.T[k].visible = false; setOpacity(S.ringCota, 0);
  const c = ST[0].c.clone().add(v3(0, 1, 0));
  labCam.position.copy(c.clone().add(v3(-2.2, 1.6, 9.5))); labCam.up.set(0, 1, 0); labCam.lookAt(c.clone().add(v3(0, -0.6, 0)));
  renderer.setRenderTarget(rtA); renderer.render(lab, labCam);
  mixMat.uniforms.tA.value = rtA.texture; mixMat.uniforms.tB.value = rtA.texture; mixMat.uniforms.mixAB.value = 0; mixMat.uniforms.blur.value = 0;
  mixMat.uniforms.white.value = 0; mixMat.uniforms.black.value = 0; mixMat.uniforms.vig.value = 0.5;
  renderer.setRenderTarget(rtC); renderer.render(quadScene, quadCam);
  bloom.strength = 0.7; bloom.enabled = true; renderer.setRenderTarget(null); composer.render();
  return true;
};

window.renderAt = function (t) {
  const st = frameState(t);
  renderer.setRenderTarget(rtA); renderer.render(st.scene, st.cam);
  const useB = st.sceneB && st.mixB > 0;
  if (useB) { renderer.setRenderTarget(rtB); renderer.render(st.sceneB, st.camB); }
  mixMat.uniforms.tA.value = rtA.texture; mixMat.uniforms.tB.value = useB ? rtB.texture : rtA.texture;
  mixMat.uniforms.mixAB.value = useB ? st.mixB : 0; mixMat.uniforms.blur.value = st.blur || 0;
  mixMat.uniforms.white.value = clamp(st.white || 0); mixMat.uniforms.black.value = clamp(st.black || 0);
  mixMat.uniforms.vig.value = st.scene === white ? 0.1 : 0.4;
  renderer.setRenderTarget(rtC); renderer.render(quadScene, quadCam);
  bloom.strength = st.bloom || 0; bloom.enabled = (st.bloom || 0) > 0;
  renderer.setRenderTarget(null); composer.render();
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '800' }),
    new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-SemiBold.otf)`, { weight: '600' }),
    new FontFace('Mono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  buildOffice(); buildLab();
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
