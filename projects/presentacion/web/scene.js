// «Soy Kiria» v5 — vídeo por escenas. La IA del canal (un óvalo con una lente-globo) aparece solo en algunas:
// se presenta y lee datos, ve edificios de datos, una fábrica de datos conectada a ella, promesas tachadas,
// una cinta que forma montañas de cajas y se despide. window.renderAt(t) dibuja el instante t.
import * as THREE from 'three';
import { W, H, clamp, prog, lerp, eo, eio, ss, fatLines } from './lib.js';

let K = {}, END = 36, ENV = null;

// ---------------------------------------------------------------- render base
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); document.body.appendChild(renderer.domElement);
const rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const mixMat = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, blur: { value: 0 }, white: { value: 0 }, black: { value: 0 }, vig: { value: 0.4 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `uniform sampler2D tA; uniform float blur,white,black,vig; varying vec2 vUv;
    void main(){ vec2 c=vec2(.5); vec3 a=vec3(0.);
      for(int i=0;i<8;i++){ float s=1.0-blur*0.3*float(i)/7.0; a+=texture2D(tA,c+(vUv-c)*s).rgb; }
      vec3 col=a/8.0; float l=dot(col,vec3(0.2126,0.7152,0.0722)); col=vec3(l);
      vec2 d=(vUv-c)*vec2(0.5625,1.0); col*=1.0-vig*smoothstep(0.25,0.75,length(d)*1.6);
      col=mix(col,vec3(1.0),white); col=mix(col,vec3(0.0),black);
      col=pow(col,vec3(1.0/2.2)); gl_FragColor=vec4(col,1.0);}`,
  depthTest: false,
});
const quadScene = new THREE.Scene(); quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mixMat));
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000); scene.fog = new THREE.Fog(0x000000, 14, 34);
const cam = new THREE.PerspectiveCamera(38, W / H, 0.01, 200); window.cam = cam;
const S = {}; window.S = S;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const env = (t, t0, t1, fi = 0.4, fo = 0.4) => (t < t0 || t > t1 ? 0 : Math.min(eo(prog(t, t0, fi)), 1 - prog(t, t1 - fo, fo)));
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (draw) draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; t.userData = { c, g }; return t; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(5);

// ---------------------------------------------------------------- figura: óvalo + lente esférica que gira
const RX = 1.5, RY = 1.0;
const M = {};   // materiales que cambian con el modo (negro / blanco)
function ellipsePts(rx, ry, n = 200, z = 0) { const p = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; p.push(v3(Math.cos(a) * rx, Math.sin(a) * ry, z)); } return p; }
function tube(pts, r, mat) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 300, r, 10, true), mat); }
function buildFigure() {
  M.line = new THREE.MeshBasicMaterial({ color: 0xe6e6e6 });
  M.dim = new THREE.MeshBasicMaterial({ color: 0x8a8a8a });
  M.glass = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.94 });
  M.ball = new THREE.MeshStandardMaterial({ color: 0xe4e4e4, roughness: 0.3, metalness: 0.05 });
  M.blade = new THREE.MeshBasicMaterial({ color: 0x9a9a9a });
  M.outline = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
  const F = new THREE.Group(); scene.add(F); S.F = F;
  S.lid = new THREE.Group(); F.add(S.lid);
  const shape = new THREE.Shape(); shape.absellipse(0, 0, RX, RY, 0, Math.PI * 2);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(shape, 96), M.glass); glass.position.z = -0.3; S.lid.add(glass);
  S.lid.add(tube(ellipsePts(RX, RY), 0.035, M.line));
  S.lid.add(tube(ellipsePts(RX * 1.12, RY * 1.12), 0.008, M.dim));
  const ticks = new THREE.Group(); S.lid.add(ticks); S.ticks = ticks;
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * Math.PI * 2, long = i % 6 === 0;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.012, long ? 0.12 : 0.05, 0.01), new THREE.MeshBasicMaterial({ color: 0x8a8a8a }));
    m.userData = { i, long }; S.tickList = S.tickList || []; S.tickList.push(m);
    const rx = RX * 1.2, ry = RY * 1.2; m.position.set(Math.cos(a) * rx, Math.sin(a) * ry, 0);
    m.rotation.z = Math.atan2(Math.sin(a) * rx, Math.cos(a) * ry) - Math.PI / 2; ticks.add(m);
  }
  S.orbits = [0, 1].map(() => { const o = tube(ellipsePts(RX * 1.32, RY * 1.32, 200), 0.006, M.dim); F.add(o); return o; });
  // la lente es un globo: la abertura está en su superficie y gira hacia lo que mira
  const lens = new THREE.Group(); S.lid.add(lens); S.lens = lens;
  const eyeball = new THREE.Group(); lens.add(eyeball); S.eyeball = eyeball;
  eyeball.add(new THREE.Mesh(new THREE.SphereGeometry(0.56, 64, 48), M.ball));
  // casquetes sobre la superficie del globo (eje +z): abertura negra y anillo de lente con estrías
  const cap = (r, t0, t1, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 16, 0, Math.PI * 2, t0, t1 - t0), mat); m.rotation.x = Math.PI / 2; return m; };
  const irisTex = canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#2a2a2a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 96; i++) { g.fillStyle = i % 2 ? '#3c3c3c' : '#1c1c1c'; g.fillRect(i * w / 96, 0, w / 192, h); } g.fillStyle = '#6a6a6a'; g.fillRect(0, h - 6, w, 6); });
  S.iris = cap(0.562, 0.0, 0.62, new THREE.MeshBasicMaterial({ map: irisTex })); eyeball.add(S.iris);
  S.ap = cap(0.564, 0.0, 0.24, new THREE.MeshBasicMaterial({ color: 0x000000 })); eyeball.add(S.ap);
  S.blades = new THREE.Group(); eyeball.add(S.blades);
  S.ring = tube(ellipsePts(0.56 * Math.sin(0.64), 0.56 * Math.sin(0.64), 96, 0.56 * Math.cos(0.64)), 0.01, M.line); eyeball.add(S.ring);
  S.spec = new THREE.Mesh(new THREE.CircleGeometry(0.045, 24), new THREE.MeshBasicMaterial({ color: 0xffffff })); lens.add(S.spec);
  S.outline = tube(ellipsePts(0.575, 0.575, 120, 0.0), 0.012, M.outline); lens.add(S.outline);
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.7); rim.position.set(4, -2, -3); scene.add(rim);
  const P = []; for (let i = 0; i < 400; i++) P.push((rnd() - 0.5) * 30, rnd() * 18 - 4, -rnd() * 26 + 4);
  S.dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(P, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.3 }));
  scene.add(S.dust);
}


// ---------------------------------------------------------------- escenas (tiempos de cambio)
const T = { a1: 6.25, b: 10.0, c: 19.6, d: 24.2, e: 27.7, f: 32.5 };
function zoneAt(t) {
  if (t < T.a1) return 'eye'; if (t < T.b) return 'inst'; if (t < T.c) return 'fact';
  if (t < T.d) return 'prom'; if (t < T.e) return 'eye'; if (t < T.f) return 'belt'; return 'eye';
}
const ZO = { inst: v3(-200, 0, 0), fact: v3(200, 0, 0), prom: v3(0, 0, -300), belt: v3(400, 0, 0) };

// ---------------------------------------------------------------- folio de DATOS (no el guion)
const PW = 3.6, PL = 3.6 * 4000 / 1100, CW = 1100, CH = 4000;
const PAPER_Y = 0, Z_READ = 0.95;
let ROWS = [];   // filas que el ojo lee: { y, h, x0, x1, read: [a, b] }
function buildPaper() {
  const tex = canvasTex(CW, CH, (g, w, h) => {
    g.fillStyle = '#fbfbfa'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,.05)'; g.lineWidth = 2; for (let x = 0; x < w; x += 50) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 50) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const T1 = (txt, x, y, size = 40, weight = 700, color = '#111', align = 'left') => { g.font = `${weight} ${size}px Inter`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(txt, x, y); return g.measureText(txt).width; };
    const row = (y, label, val, bar, read) => {
      g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(90, y - 62, w - 180, 84);
      T1(label, 120, y, 48, 600, '#333'); T1(val, w - 120, y, 58, 800, '#000', 'right');
      g.fillStyle = '#111'; g.fillRect(470, y - 34, bar, 22);
      ROWS.push({ y: y - 62, h: 84, x0: 110, x1: w - 110, read });
    };
    T1('DATOS · ECONOMÍA', 100, 230, 34, 700, '#777');
    T1('Euríbor a 12 meses', 100, 330, 70, 800);
    T1('Fuente: Banco de España', 100, 390, 36, 600, '#777');
    row(520, 'sep 2025', '2,172 %', 2.172 * 90, [K.leo + 0.05, K.leo + 0.75]);
    row(630, 'ago 2026', '2,954 %', 2.954 * 90, [K.leo + 0.8, K.leo + 1.4]);
    row(740, 'sep 2026', '3,247 %', 3.247 * 90, [K.leo + 1.45, K.noticias + 0.3]);
    T1('Tipo de depósito del BCE', 100, 900, 56, 800);
    row(1010, 'desde 16/09/2026', '2,50 %', 2.5 * 90, [K.noticias + 0.35, K.economia + 0.55]);
    // segunda parte (se lee más tarde): gráfico de barras de los tres datos y notas
    T1('Comparativa', 100, 1250, 64, 800);
    const bars = [['sep 25', 2.172], ['ago 26', 2.954], ['sep 26', 3.247], ['BCE', 2.5]];
    bars.forEach(([lb, v], i) => { const x = 160 + i * 220, hh = v * 160; g.fillStyle = i === 2 ? '#000' : '#9a9a9a'; g.fillRect(x, 1880 - hh, 120, hh); T1(lb, x + 60, 1940, 36, 700, '#444', 'center'); T1(v.toFixed(3).replace(/0+$/, '').replace('.', ',') + ' %', x + 60, 1860 - hh, 36, 800, '#111', 'center'); });
    ROWS.push({ y: 1300, h: 600, x0: 140, x1: 1000, read: [K.solo + 0.4, K.solo + 1.6], chart: true });
    T1('Euríbor: +1,075 puntos en un año', 100, 2080, 50, 800);
    ROWS.push({ y: 2030, h: 70, x0: 100, x1: 900, read: [K.solo + 1.65, K.pasando + 0.6] });
    T1('Fuentes: Banco de España · BCE', 100, 2160, 36, 600, '#777');
    g.fillStyle = '#9a9a9a'; g.font = '600 30px Inter'; g.textAlign = 'left'; g.fillText('kiria.ai', 100, 140);
  });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(PW, PL), new THREE.MeshBasicMaterial({ map: tex, color: 0xcfcfcf }));
  paper.rotation.x = -Math.PI / 2; scene.add(paper); S.paper = paper;
  ROWS.forEach(R => { const hl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false })); hl.position.z = 0.003; paper.add(hl); R.hl = hl; });
}
const cx2l = x => (x / CW - 0.5) * PW, cy2l = y => (0.5 - y / CH) * PL;
function paperV(t) {   // la fila que se lee queda bajo el ojo
  const ks = []; ROWS.forEach(R => { const v = (R.y + Math.min(R.h, 120) * 0.5) / CH; ks.push([R.read[0], v], [R.read[1], v + 0.003]); });
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) { const [ta, va] = ks[i], [tb, vb] = ks[i + 1]; if (t <= tb) { const u = (t - ta) / Math.max(1e-6, tb - ta); return lerp(va, vb, i % 2 === 0 ? u : ss(u)); } }
  return ks[ks.length - 1][1];
}
function rowPoint(R, x, t, yfrac = 0.5) { const v = paperV(t); const z = Z_READ - (v - 0.5) * PL + (R.y + R.h * yfrac) / CH * PL - PL / 2; return v3(cx2l(x), PAPER_Y + 0.01, z); }

// ---------------------------------------------------------------- mirada del ojo
const CAMP = v3(0, 3.4, 9);
let GK = [];
function buildGazeKeys() {
  const k = [], add = (t, fn, d = 0.38) => k.push([t, fn, d]), at = p => () => p.clone();
  add(-1, at(CAMP));
  ROWS.forEach(R => add(R.read[0], t => { const u = clamp((t - R.read[0]) / (R.read[1] - R.read[0])); if (R.chart) { const yf = 0.3 + 0.5 * Math.sin(u * Math.PI * 3) ** 2; return rowPoint(R, lerp(R.x0, R.x1, u), t, yf); } return rowPoint(R, lerp(R.x0, R.x1, 0.75 * u + 0.25 * ss(u)), t); }));
  add(K.economia + 0.6, at(CAMP));
  add(T.d - 0.1, at(CAMP)); add(K.pasando + 0.65, at(CAMP));
  return k.sort((a, b) => a[0] - b[0]);
}
function rawGaze(t) {
  let i = 0; while (i < GK.length - 1 && GK[i + 1][0] <= t) i++;
  if (i === 0) return GK[0][1](t);
  const [t0, fn, d] = GK[i];
  return GK[i - 1][1](t).lerp(fn(t), eio(clamp((t - t0) / d)));
}
function gazeEye(t) {
  const p = v3(0, 0, 0); let ws = 0;
  for (let k = -4; k <= 4; k++) { const w = 1 - Math.abs(k) / 5; p.addScaledVector(rawGaze(t + k * 0.035), w); ws += w; }
  p.multiplyScalar(1 / ws); p.x += 0.02 * Math.sin(t * 2.3); p.y += 0.015 * Math.sin(t * 1.7 + 1);
  return p;
}

// ---------------------------------------------------------------- figura: posición, mirada y gestos
const FIG = v3(0, 2.35, -0.35);
function figureAt(t, base, scale, g) {
  const F = S.F;
  F.position.copy(base).add(v3(0, 0.05 * scale * Math.sin(t * 1.2), 0));
  F.scale.setScalar(0.72 * scale * (1 + 0.012 * Math.sin(t * 1.9)));
  const toG = g.clone().sub(F.position);
  const pitch = clamp(Math.atan2(-toG.y, Math.max(0.3, toG.z)) * 0.62, -0.5, 0.72);
  const yaw = clamp(Math.atan2(toG.x, Math.max(0.3, toG.z)) * 0.35, -0.3, 0.3);
  const nod = t > T.f + 0.15 && t < T.f + 0.8 ? 0.16 * Math.sin((t - T.f - 0.15) * Math.PI * 2 * 2.4) * (1 - (t - T.f - 0.15) / 0.65) : 0;
  F.rotation.set(pitch + nod, yaw, 0);
  F.updateMatrixWorld(true);
  const local = S.lid.worldToLocal(g.clone()).sub(S.lens.position).normalize();
  const maxA = 0.55, ang = Math.acos(clamp(local.z, -1, 1));
  if (ang > maxA) { const xy = v3(local.x, local.y, 0).normalize(); local.set(xy.x * Math.sin(maxA), xy.y * Math.sin(maxA), Math.cos(maxA)); }
  S.eyeball.quaternion.setFromUnitVectors(v3(0, 0, 1), local);
  S.lens.position.set(local.x * 0.3, local.y * 0.24, 0.05);
  S.spec.position.set(-0.13, 0.15, 0.6);
  const blinks = [2.35, K.noticias + 0.9, T.d + 1.2, K.sigueme - 0.4];
  let bl = 0; for (const b of blinks) { const x = t - b; if (x > 0 && x < 0.3) bl = Math.max(bl, x < 0.09 ? x / 0.09 : 1 - (x - 0.09) / 0.21); }
  const open = eo(prog(t, 0.15, 0.7)) * (1 - eio(prog(t, END - 0.75, 0.6)));
  S.lid.scale.set(1, Math.max(0.02, open * (1 - 0.94 * ss(bl))), 1);
  const lv = ENV ? ENV[Math.min(ENV.length - 1, Math.max(0, Math.round(t * 30)))] : 0.3;
  const sc = 1.05 + 0.35 * lv; S.ap.scale.set(sc, 1, sc);
  S.iris.rotation.y = t * 0.25; S.ticks.rotation.z = t * 0.1;
  S.orbits[0].rotation.set(1.2 + t * 0.35, 0.3, 0); S.orbits[1].rotation.set(0.4, 1.0 + t * 0.28, 0.2);
  // reloj de un minuto (en la fábrica, al decir «te lo explico en un minuto»)
  const fill = 72 * eio(prog(t, K.explico + 0.05, K.fuentes - K.explico)), clockA = env(t, K.explico, T.c, 0.2, 0.3);
  S.tickList.forEach(m => {
    const j = ((18 - m.userData.i) % 72 + 72) % 72, lit = clockA > 0 && j < fill;
    m.material.color.setHex(lit ? 0xffffff : (m.userData.long ? 0xd0d0d0 : 0x6a6a6a)); m.scale.set(lit ? 2.2 : 1, lit ? 1.7 : 1, 1);
  });
}

// ---------------------------------------------------------------- utilidades de las escenas
S.fat = [];
function edges(geo, color = 0xffffff, width = 1.6, x = 0, y = 0, z = 0) {
  const l = fatLines(new THREE.EdgesGeometry(geo, 25).attributes.position.array, color, width, 1); l.frustumCulled = false; S.fat.push(l);
  l.position.set(x, y, z); return l;
}
function label(txt, { size = 80, color = '#ffffff', w = 1.6, weight = 800, box = false, dark = false } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = `${weight} ${size}px Inter`;
  const tw = g.measureText(txt).width; c.width = Math.ceil(tw + size * 1.2); c.height = Math.ceil(size * 1.9);
  g.font = `${weight} ${size}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (box) { g.fillStyle = dark ? '#0b0b0b' : 'rgba(0,0,0,0)'; rr(g, 4, 4, c.width - 8, c.height - 8, size * 0.45); g.fill(); g.strokeStyle = color; g.lineWidth = 5; g.stroke(); }
  g.fillStyle = color; g.fillText(txt, c.width / 2, c.height / 2 + size * 0.05);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / c.width), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.renderOrder = 8; return m;
}
const zones = {};
function zoneGroup(name) { const g = new THREE.Group(); g.position.copy(ZO[name] || v3(0, 0, 0)); scene.add(g); zones[name] = g; return g; }

// ---------------------------------------------------------------- B · edificios de datos (sin ojo)
function buildInst() {
  const Z = zoneGroup('inst');
  const winTex = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, w, h); for (let k = 0; k < 9; k++) { g.fillStyle = hash(k * 1.3) < 0.6 ? '#d8d8d8' : '#3a3a3a'; g.fillRect(14 + k * 27, 18, 16, 26); } });
  const winMat = new THREE.MeshBasicMaterial({ map: winTex }), darkMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
  Z.add(Object.assign(new THREE.GridHelper(80, 80, 0x2a2a2a, 0x1a1a1a), {}));
  S.inst = [['BANCO CENTRAL EUROPEO', -1.55, 3.2, K.bce - 0.6], ['BANCO DE ESPAÑA', 0, 2.6, K.bde - 0.35], ['INE', 1.55, 2.1, K.ine - 0.3]].map(([name, x, h, t0]) => {
    const b = new THREE.Group(); b.position.set(x, 0, 0); Z.add(b);
    const fl = Math.round(h / 0.32);
    for (let i = 0; i < fl; i++) {
      const w = 1.1 - (i % 3 === 2 ? 0.06 : 0), geo = new THREE.BoxGeometry(w, 0.26, w * 0.8);
      const fill = new THREE.Mesh(geo, [winMat, winMat, darkMat, darkMat, winMat, winMat]); fill.position.set(0, 0.15 + i * 0.32, 0); b.add(fill);
      b.add(edges(geo, 0xe6e6e6, 1.4, 0, 0.15 + i * 0.32, 0));
    }
    const lab = label(name, { size: 64, w: name.length > 10 ? 1.7 : 0.75 }); lab.position.set(x, h + 0.55, 0.3); Z.add(lab);
    const N = 160, pos = new Float32Array(N * 3);
    const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 2.6, sizeAttenuation: false, transparent: true }));
    pts.frustumCulled = false; Z.add(pts);
    return { b, lab, pts, x, h, t0, fl };
  });
  S.beamCol = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 9, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  S.beamCol.position.set(1.55, 6.6, 0); Z.add(S.beamCol);
}
function instAt(t) {
  S.inst.forEach(o => {
    const r = eo(prog(t, o.t0, 0.7));
    o.b.visible = r > 0.01; o.b.scale.set(1, Math.max(0.01, r), 1);
    o.lab.visible = r > 0.3; o.lab.material.opacity = clamp((r - 0.3) / 0.5);
    const a = o.pts.geometry.attributes.position.array;
    for (let i = 0; i < a.length / 3; i++) { const u = ((t - o.t0) * (0.35 + (i % 5) * 0.05) + i * 0.618) % 1; a[i * 3] = o.x + Math.sin(i * 7.3) * 0.5 * (1 - u * 0.6); a[i * 3 + 1] = o.h * r + u * 6; a[i * 3 + 2] = Math.cos(i * 3.1) * 0.4 * (1 - u * 0.6); }
    o.pts.geometry.attributes.position.needsUpdate = true; o.pts.material.opacity = r * 0.9; o.pts.visible = r > 0.05;
  });
  S.beamCol.material.opacity = 0.9 * eio(prog(t, T.b - 0.75, 0.5));
  const O = ZO.inst, u = eio(prog(t, T.a1, T.b - T.a1 - 0.6));
  const cx = lerp(lerp(-1.55, 0, eio(prog(t, K.bde - 0.6, 0.7))), 1.55, eio(prog(t, K.ine - 0.5, 0.6)));
  let p = v3(O.x + cx * 0.85, 2.3 + 0.3 * u, 8.6 - 1.0 * u), l = v3(O.x + cx, 1.9, 0);
  const up = eio(prog(t, T.b - 0.7, 0.7));
  p.lerp(v3(O.x + 1.55, 5.0, 1.4), up); l.lerp(v3(O.x + 1.55, 7.5, 0), up);
  cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l);
}

// ---------------------------------------------------------------- C · fábrica de datos conectada al ojo
const FEYE = () => v3(ZO.fact.x, 6.6, -5.5);
function buildFact() {
  const Z = zoneGroup('fact');
  Z.add(new THREE.GridHelper(160, 160, 0x333333, 0x1e1e1e));
  // estanterías de datos: miles de cajitas en pasillos
  const box = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const pos = [];
  for (let r = -7; r <= 7; r++) for (let zz = -70; zz <= 6; zz += 0.42) for (let lv = 0; lv < 6; lv++) { if (Math.abs(r) === 0 && zz > -14) continue; pos.push(v3(r * 1.05 + (r > 0 ? 0.35 : r < 0 ? -0.35 : 0), 0.12 + lv * 0.24, zz)); }
  const inst = new THREE.InstancedMesh(box, mat, pos.length); const m4 = new THREE.Matrix4(), col = new THREE.Color();
  pos.forEach((p, i) => { m4.makeTranslation(p.x, p.y, p.z); inst.setMatrixAt(i, m4); const b = hash(i) < 0.07 ? 0.95 : 0.12 + 0.18 * hash(i * 3.1); col.setRGB(b, b, b); inst.setColorAt(i, col); });
  Z.add(inst); S.factPos = pos; S.factInst = inst;
  // líneas finísimas de cajas al ojo + pulsos que suben
  const eyeL = FEYE().sub(ZO.fact), N = 900, lp = new Float32Array(N * 6); S.links = [];
  for (let i = 0; i < N; i++) { const p = pos[Math.floor(hash(i * 13.7) * pos.length)]; S.links.push(p); lp.set([p.x, p.y + 0.08, p.z, eyeL.x, eyeL.y - 0.3, eyeL.z], i * 6); }
  S.linkLines = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(lp, 3)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.09, depthWrite: false }));
  S.linkLines.frustumCulled = false; Z.add(S.linkLines);
  S.pulses = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, transparent: true }));
  S.pulses.frustumCulled = false; Z.add(S.pulses);
  // zonas que se iluminan: hipoteca, ahorros, súper
  S.topics = [['HIPOTECA', v3(-1.75, 0, -4), K.hipoteca], ['AHORROS', v3(1.75, 0, -8), K.ahorros], ['SÚPER', v3(-1.75, 0, -13), K.super]].map(([name, c, t0]) => {
    const near = []; pos.forEach((p, i) => { if (Math.hypot(p.x - c.x, p.z - c.z) < 1.4) near.push(i); });
    const lab = label(name, { size: 70, w: 1.9, box: true, dark: true }); lab.position.set(c.x * 0.55, 2.8, c.z); Z.add(lab);
    const ll = []; near.slice(0, 120).forEach(i => { const p = pos[i]; ll.push(p.x, p.y + 0.08, p.z, eyeL.x, eyeL.y - 0.3, eyeL.z); });
    const lines = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(ll, 3)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    lines.frustumCulled = false; Z.add(lines);
    return { name, c, t0, near, lab, lines };
  });
  S.fuentes = label('FUENTES · BCE · BANCO DE ESPAÑA · INE', { size: 56, w: 3.0, box: true, dark: true }); S.fuentes.position.set(eyeL.x, eyeL.y - 1.5, eyeL.z + 1); Z.add(S.fuentes);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.4));
}
function hash(x) { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function factAt(t) {
  const O = ZO.fact, eyeW = FEYE();
  // pulsos que suben por las líneas hacia el ojo
  const a = S.pulses.geometry.attributes.position.array, el = eyeW.clone().sub(O);
  const speed = 0.35 + 0.5 * eio(prog(t, K.explico, 1.5));
  S.links.forEach((p, i) => { const u = ((t - T.b) * speed * (0.6 + hash(i) * 0.8) + hash(i * 2.3)) % 1; a[i * 3] = lerp(p.x, el.x, u); a[i * 3 + 1] = lerp(p.y + 0.08, el.y - 0.3, u); a[i * 3 + 2] = lerp(p.z, el.z, u); });
  S.pulses.geometry.attributes.position.needsUpdate = true;
  const grow = eo(prog(t, T.b + 0.2, 1.6));
  S.linkLines.material.opacity = 0.085 * grow + 0.05 * env(t, K.explico, T.c, 0.6, 0.3); S.pulses.material.opacity = grow;
  // zonas iluminadas
  const col = new THREE.Color();
  S.topics.forEach(z => {
    const a2 = env(t, z.t0 - 0.2, K.explico + 0.6, 0.3, 0.6);
    z.lab.visible = a2 > 0.01; z.lab.material.opacity = a2; z.lab.lookAt(cam.position); z.lab.position.y = 2.4 + 0.5 * eo(prog(t, z.t0 - 0.2, 0.5));
    z.lines.material.opacity = 0.45 * a2;
    z.near.forEach(i => { const base = hash(i) < 0.07 ? 0.95 : 0.12 + 0.18 * hash(i * 3.1); const b = lerp(base, 0.95, a2 * (0.6 + 0.4 * Math.sin(t * 6 + i))); col.setRGB(b, b, b); S.factInst.setColorAt(i, col); });
  });
  S.factInst.instanceColor.needsUpdate = true;
  const fa = env(t, K.fuentes - 0.3, T.c + 0.2, 0.35, 0.2); S.fuentes.visible = fa > 0.01; S.fuentes.material.opacity = fa; S.fuentes.lookAt(cam.position);
  // cámara: entra por un pasillo mirando al ojo pequeño de arriba y va subiendo
  const u = eio(prog(t, T.b, T.c - T.b - 0.5));
  let p = v3(O.x + lerp(0.2, 2.2, u), lerp(0.9, 3.8, u), lerp(7.5, 1.0, u)), l = eyeW.clone().lerp(v3(O.x, 1.2, -8), 0.45 * (1 - u));
  const sway = 0.5 * Math.sin((t - T.b) * 0.35); p.x += sway;
  const dive = eio(prog(t, T.c - 0.55, 0.55)); p.lerp(eyeW.clone().add(v3(0, 0, 0.35)), dive); l.lerp(eyeW, dive);
  cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l);
  // el ojo pequeño mira cada zona al iluminarse; si no, mira hacia la fábrica
  let g = v3(O.x, 0.5, 2);
  const keys = [[T.b, v3(O.x, 0.3, 3)], [K.busco + 0.4, v3(O.x - 4, 0.5, -1)], [K.busco + 1.1, v3(O.x + 4, 0.5, -2)], ...S.topics.map(z => [z.t0 - 0.15, v3(O.x + z.c.x, 0.6, z.c.z)]), [K.explico - 0.2, cam.position.clone()], [K.fuentes - 0.2, eyeW.clone().add(v3(0, -1.5, 1))]];
  for (let i = 0; i < keys.length; i++) { if (t >= keys[i][0]) { const prev = i ? keys[i - 1][1] : keys[0][1]; g = prev.clone().lerp(keys[i][1], eio(clamp((t - keys[i][0]) / 0.4))); } }
  figureAt(t, eyeW, 0.42, g);
}

// ---------------------------------------------------------------- D · promesas tachadas (fondo blanco, sin ojo)
function buildProm() {
  const Z = zoneGroup('prom');
  S.cards = [['Humo', K.humo, 3.0], ['«Hazte rico rápido»', K.rico, 1.85], ['«Compra esto ya»', K.comprar, 0.7]].map(([txt, t0, y]) => {
    const g = new THREE.Group(); g.position.set(0, y, 0); Z.add(g);
    const card = label(txt, { size: 90, color: '#111111', w: 2.7, box: true }); g.add(card);
    const x1 = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true })); x1.rotation.z = 0.25; x1.position.z = 0.02; g.add(x1);
    const x2 = x1.clone(); x2.material = x1.material.clone(); x2.rotation.z = -0.25; g.add(x2);
    return { g, card, x1, x2, t0, y };
  });
  const puff = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,.8)'); r.addColorStop(0.5, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  S.smokeMat = new THREE.SpriteMaterial({ map: puff, color: 0x333333, transparent: true, opacity: 0.4, depthWrite: false });
  S.puffs = []; for (let i = 0; i < 30; i++) { const sp = new THREE.Sprite(S.smokeMat); Z.add(sp); S.puffs.push(sp); }
}
function promAt(t) {
  const O = ZO.prom;
  S.cards.forEach((c, i) => {
    const appear = eo(prog(t, T.c + 0.15 + i * 0.15, 0.4)), hit = c.t0 + (i ? 0.05 : 0.3);
    const k = eo(prog(t, hit, 0.22));
    c.x1.scale.x = Math.max(0.001, k); c.x2.scale.x = Math.max(0.001, eo(prog(t, hit + 0.12, 0.22)));
    c.x1.visible = k > 0.001; c.x2.visible = t > hit + 0.12;
    const fall = i === 2 ? 0 : eio(prog(t, hit + 0.6, 0.8));
    c.g.position.set(0.25 * Math.sin(i * 2.1) * fall, c.y - 3.5 * fall * fall, 0); c.g.rotation.z = 0.5 * fall * (i ? 1 : -1);
    c.g.scale.setScalar(0.7 + 0.3 * appear);
    c.card.material.opacity = appear * (1 - fall); c.x1.material.opacity = 1 - fall; c.x2.material.opacity = 1 - fall;
  });
  // humo alrededor de «Humo» que se disipa
  const sa = env(t, T.c, K.humo + 1.4, 0.3, 0.5), clear = eio(prog(t, K.humo + 0.35, 1.0));
  S.puffs.forEach((sp, i) => { const a = i * 2.399, r = 0.4 + ((i * 0.618) % 1) * 1.2, out = 1 + 2 * clear; sp.position.set(Math.cos(a + t * 0.3) * r * out, 3.0 + Math.sin(a * 1.7) * 0.45 * out, 0.3 + Math.sin(a) * 0.3); sp.scale.setScalar(1.2 + 0.6 * ((i * 0.29) % 1)); sp.visible = sa > 0.01; });
  S.smokeMat.opacity = 0.45 * sa * (1 - clear);
  // cámara frontal que se acerca despacio; al final entra en la ✕ negra
  let p = v3(O.x, 1.9, O.z + 7.2 - 0.6 * eio(prog(t, T.c, 3))), l = v3(O.x, 1.9, O.z);
  const dive = eio(prog(t, T.d - 0.5, 0.5)); p.lerp(v3(O.x, 0.7, O.z + 0.25), dive); l.lerp(v3(O.x, 0.7, O.z), dive);
  cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l);
}

// ---------------------------------------------------------------- F · cinta horizontal arriba y montañas de cajas (sin ojo)
const NB = 90, DROPS = [-2.4, -0.2, 2.0];
function buildBelt() {
  const Z = zoneGroup('belt');
  Z.add(new THREE.GridHelper(120, 120, 0x2e2e2e, 0x1b1b1b));
  const L = 11, beltY = 4.6;
  Z.add(edges(new THREE.BoxGeometry(L, 0.08, 0.5), 0xdedede, 1.6, 0, beltY, 0));
  const bandTex = canvasTex(1024, 64, (g, w, h) => { g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 24) { g.fillStyle = '#5c5c5c'; g.fillRect(x, 0, 5, h); } });
  bandTex.wrapS = THREE.RepeatWrapping; bandTex.repeat.set(L * 3, 1); S.bandTex = bandTex;
  const band = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.46), new THREE.MeshBasicMaterial({ map: bandTex })); band.rotation.x = -Math.PI / 2; band.position.set(0, beltY + 0.045, 0); Z.add(band);
  for (let x = -L / 2 + 0.6; x < L / 2; x += 1.3) Z.add(edges(new THREE.BoxGeometry(0.05, 4.6, 0.05), 0x9a9a9a, 1.2, x, beltY / 2, -0.3));
  DROPS.forEach(x => Z.add(edges(new THREE.CylinderGeometry(0.22, 0.12, 0.3, 12, 1, true), 0xdedede, 1.4, x, beltY - 0.2, 0)));
  // cajitas de información
  const labels = ['PDF', '€', '%', 'IPC', 'BCE', 'INE', 'DATOS'];
  const texs = labels.map(Lb => canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#cfcfcf'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = '#ddd'; g.font = `800 ${Lb.length > 3 ? 30 : 52}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(Lb, w / 2, h / 2 + 3); }));
  const mats = texs.map(tx => new THREE.MeshBasicMaterial({ map: tx, color: 0xbdbdbd }));
  S.bx = []; for (let i = 0; i < NB; i++) { const s0 = 0.17 + 0.05 * hash(i * 1.7); const m = new THREE.Mesh(new THREE.BoxGeometry(s0, s0, s0), mats[i % mats.length]); Z.add(m); S.bx.push({ m, s: s0, d: i % 3 }); }
  S.slots = DROPS.map((x, d) => mound(v3(x, 0, 0.1), Math.ceil(NB / 3), 0.16));
  // montañas ya hechas al fondo
  const bg = new THREE.BoxGeometry(0.2, 0.2, 0.2), bgMat = new THREE.MeshBasicMaterial({ color: 0x6a6a6a });
  const mounds = [[-6, -6, 260], [-1.5, -9, 380], [4.5, -7, 300], [8, -14, 520], [-9, -16, 480], [1.5, -20, 640], [11, -4, 180], [-11, -3, 160]];
  const tot = mounds.reduce((s, m) => s + m[2], 0); const bgi = new THREE.InstancedMesh(bg, bgMat, tot); const m4 = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion();
  let k = 0; mounds.forEach(([x, z, n]) => mound(v3(x, 0, z), n, 0.19).forEach(p => { e.set(hash(k) * 3, hash(k * 2) * 3, hash(k * 3) * 3); q.setFromEuler(e); m4.compose(p, q, v3(1, 1, 1)); bgi.setMatrixAt(k, m4); const b = 0.3 + 0.5 * hash(k * 5); bgi.setColorAt(k, new THREE.Color(b, b, b)); k++; }));
  Z.add(bgi);
}
function mound(c, n, s) {   // montaña cónica: capas que se estrechan
  const out = []; let layer = 0;
  while (out.length < n) { const r = Math.max(0.0, Math.sqrt(n) * s * 0.55 - layer * s * 0.7); const per = Math.max(1, Math.floor((2 * Math.PI * r) / (s * 1.05)) || 1); for (let k = 0; k < per && out.length < n; k++) { const a = k / per * Math.PI * 2 + layer * 0.6; out.push(v3(c.x + Math.cos(a) * r * (0.6 + 0.4 * hash(out.length)), c.y + s * 0.5 + layer * s * 0.82, c.z + Math.sin(a) * r * 0.7)); } if (r <= 0) layer += 1; layer += 1; }
  return out;
}
function boxAt(i, t) {
  const b = S.bx[i], t0 = T.e - 0.6 + i * 0.05, ride = 1.0 + 0.6 * b.d, fall = 0.55;
  const x0 = -5.5, xd = DROPS[b.d], y = 4.6 + 0.045 + b.s / 2;
  if (t < t0) return null;
  const u = (t - t0) / ride;
  if (u < 1) return { p: v3(lerp(x0, xd, u), y, 0), r: v3(0, 0, 0) };
  const f = clamp((t - t0 - ride) / fall), slot = S.slots[b.d][Math.floor(i / 3)] || S.slots[b.d][0];
  const p = v3(xd, y, 0).lerp(slot, f); p.y = lerp(y, slot.y, f * f);
  const sp = (1 - (1 - f) ** 2) * (2 + (i % 3)); return { p, r: v3(sp * 0.6, sp, sp * 0.3) };
}
function beltAt(t) {
  const O = ZO.belt;
  S.bandTex.offset.x = -t * 1.2;
  S.bx.forEach((b, i) => { const q = boxAt(i, t); b.m.visible = !!q; if (!q) return; b.m.position.copy(q.p); b.m.rotation.set(q.r.x, q.r.y, q.r.z); });
  // plano alejado con un ligero desplazamiento; al final se acerca a una caja oscura
  const u = eio(prog(t, T.e, T.f - T.e));
  let p = v3(O.x + lerp(-1.2, 1.0, u), 2.8, lerp(13.5, 12.0, u)), l = v3(O.x + lerp(-0.6, 0.4, u), 2.3, 0);
  const near = S.bx[3].m.position.clone().add(O);
  const dive = eio(prog(t, T.f - 0.5, 0.5)); p.lerp(near.clone().add(v3(0, 0, 0.3)), dive); l.lerp(near, dive);
  cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l);
}

// ---------------------------------------------------------------- A/E/G · el ojo (cámara)
const BASE = { p: v3(0, 3.7, 8.6), l: v3(0, 1.75, 0) };
function eyeCam(t) {
  let p = BASE.p.clone(), l = BASE.l.clone();
  p.applyAxisAngle(v3(0, 1, 0), 0.1 * Math.sin(t * 0.21));
  const lensW = S.ap.getWorldPosition(v3(0, 0, 0)), lensP = FIG.clone().add(v3(0, 0, 0.7));
  const close = lensP.clone().add(v3(0, 0.05, 1.6));
  // inicio pegado a la lente
  const k0 = eio(prog(t, 0.9, 2.0)); p = close.clone().lerp(p, k0); l = FIG.clone().lerp(l, k0);
  // salida de la lente al volver a esta escena
  for (const ts of [T.d, T.f]) { const u = eio(prog(t, ts, 1.0)); if (t >= ts && u < 1) { const dir = p.clone().sub(lensW).normalize(); p = lensW.clone().addScaledVector(dir, 1.2).lerp(p, u); l = lensW.clone().lerp(l, u); } }
  // entrada en la abertura negra al salir de esta escena
  for (const te of [T.a1, T.e]) { const d = eio(prog(t, te - 0.55, 0.55)); if (d > 0 && t < te) { const dir = p.clone().sub(lensW).normalize(); p = p.clone().lerp(lensW.clone().addScaledVector(dir, 0.06), d); l = l.clone().lerp(lensW, d); } }
  const k1 = eio(prog(t, END - 2.2, 2.0)); p.lerp(close, k1); l.lerp(FIG, k1);
  cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l);
}
function eyeAt(t) {
  // antes de entrar en la lente, mira a cámara
  let g = gazeEye(t);
  for (const te of [T.a1, T.e]) { const k = eio(prog(t, te - 0.95, 0.4)); if (t < te && k > 0) g = g.lerp(CAMP, k); }
  figureAt(t, FIG, 1, g);
  eyeCam(t);
  // folio solo mientras lee
  const pa = Math.max(env(t, 2.7, T.a1 - 0.6, 0.6, 0.4), env(t, T.d + 0.1, T.e - 0.6, 0.5, 0.4));
  S.paper.visible = pa > 0.01; S.paper.material.transparent = pa < 0.999; S.paper.material.opacity = pa; S.paper.position.y = PAPER_Y - 1.4 * (1 - pa);
  const v = paperV(t); S.paper.position.x = 0; S.paper.position.z = Z_READ - (v - 0.5) * PL;
  ROWS.forEach(R => {
    const [a, b] = R.read, u = clamp((t - a) / (b - a)), x1 = lerp(R.x0, R.x1, R.chart ? u : 0.75 * u + 0.25 * ss(u));
    const w = Math.max(0.0001, cx2l(x1) - cx2l(R.x0)), hh = (R.chart ? 0.08 * CH / PL : R.h) / CH * PL;
    R.hl.visible = t > a && !R.chart; R.hl.scale.set(w, hh, 1); R.hl.position.set(cx2l(R.x0) + w / 2, cy2l(R.y + R.h / 2), 0.003);
  });
  // botón «Seguir»
  const fa = eo(prog(t, K.sigueme - 0.2, 0.35)) * (1 - prog(t, END - 0.9, 0.4));
  S.follow.visible = t > K.sigueme - 0.2 && t > T.f; S.follow.material.opacity = fa;
  const tap = prog(t, K.sigueme + 0.6, 0.25);
  S.follow.position.set(0, 0.85, 1.4); S.follow.scale.setScalar(0.85 * (0.6 + 0.25 * eo(prog(t, K.sigueme - 0.2, 0.35))) * (1 - 0.08 * Math.sin(Math.PI * tap)));
  S.follow.lookAt(cam.position);
}

// ---------------------------------------------------------------- fotograma
const BG = { eye: 0x000000, inst: 0x000000, fact: 0x111111, prom: 0xffffff, belt: 0x0d0d0d };
function frame(t) {
  const z = zoneAt(t);
  scene.background.setHex(BG[z]); scene.fog.color.setHex(BG[z]);
  scene.fog.near = z === 'fact' ? 10 : z === 'belt' ? 14 : 14; scene.fog.far = z === 'fact' ? 70 : z === 'belt' ? 45 : 34;
  for (const k in zones) zones[k].visible = k === z;
  S.paper.visible = false; S.follow.visible = false;
  S.F.visible = z === 'eye' || z === 'fact';
  S.dust.visible = z === 'eye';
  if (z === 'eye') eyeAt(t);
  else if (z === 'inst') instAt(t);
  else if (z === 'fact') factAt(t);
  else if (z === 'prom') promAt(t);
  else beltAt(t);
  const fade = (t1, d = 0.25) => ss(prog(t, t1 - d, d)) * (1 - ss(prog(t, t1, d + 0.1)));
  return {
    white: Math.max(fade(T.b), fade(T.c)),
    black: Math.max(1 - ss(prog(t, 0, 0.3)), fade(T.a1), fade(T.d), fade(T.e), fade(T.f), ss(prog(t, END - 0.3, 0.3))),
    vig: z === 'prom' ? 0.06 : 0.4,
  };
}

function followCard() {
  const t = canvasTex(900, 300, (g, w, h) => { g.fillStyle = '#fff'; rr(g, 6, 6, w - 12, h - 12, 140); g.fill(); g.fillStyle = '#000'; g.font = '900 110px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Seguir', w / 2, h / 2 + 6); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.8), new THREE.MeshBasicMaterial({ map: t, color: 0xd0d0d0, transparent: true, depthWrite: false })); m.visible = false; return m;
}

window.renderAt = function (t) {
  const st = frame(t);
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  mixMat.uniforms.tA.value = rtA.texture; mixMat.uniforms.blur.value = st.blur || 0;
  mixMat.uniforms.white.value = clamp(st.white || 0); mixMat.uniforms.black.value = clamp(st.black || 0); mixMat.uniforms.vig.value = st.vig;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '800' }),
    new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-SemiBold.otf)`, { weight: '600' }),
    new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const j = await (await fetch('../tiempos_k.json')).json(); K = j.K; END = j.END;
  K.economia = K.economia || 5.4;
  ENV = await (await fetch('../env.json')).json();
  buildFigure(); buildPaper(); GK = buildGazeKeys();
  buildInst(); buildFact(); buildProm(); buildBelt();
  S.follow = followCard(); scene.add(S.follow);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
