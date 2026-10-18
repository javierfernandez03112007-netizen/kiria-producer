// Vídeo de presentación de Kiria (la IA del canal): una figura ovalada que «mira» documentos y datos.
// window.renderAt(t) dibuja el instante t. Los tiempos K se ajustan a la voz (tiempos.json).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { W, H, clamp, prog, lerp, eo, eio, ss } from './lib.js';

// ---------------------------------------------------------------- tiempos (provisionales hasta tener la voz)
let K = {
  hola: 0.2, soy: 1.0, persona: 2.0, ia: 3.2, leo: 5.0, bce: 7.6, bde: 8.6, ine: 9.6, busco: 11.0, hipoteca: 12.6,
  ahorros: 13.5, super: 14.4, explico: 15.6, minuto: 16.8, fuentes: 18.0, humo: 19.6, rico: 20.6, comprar: 21.8,
  solo: 23.2, pasando: 25.0, interesa: 26.2, tiempo: 28.0, quedate: 29.0, sigueme: 30.0, leopor: 31.0, end: 33.0,
};
let END = 34.0;
let ENV = null;   // nivel de la voz por fotograma (0-1) para que la figura «hable»

// ---------------------------------------------------------------- render base
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); document.body.appendChild(renderer.domElement);
const rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const mixMat = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, blur: { value: 0 }, white: { value: 0 }, black: { value: 0 }, vig: { value: 0.45 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `uniform sampler2D tA; uniform float blur,white,black,vig; varying vec2 vUv;
    void main(){ vec2 c=vec2(.5); vec3 a=vec3(0.);
      for(int i=0;i<8;i++){ float s=1.0-blur*0.3*float(i)/7.0; a+=texture2D(tA,c+(vUv-c)*s).rgb; }
      vec3 col=a/8.0; float l=dot(col,vec3(0.2126,0.7152,0.0722)); col=vec3(l);
      vec2 d=(vUv-c)*vec2(0.5625,1.0); col*=1.0-vig*smoothstep(0.25,0.75,length(d)*1.6);
      col=mix(col,vec3(1.0),white); col=mix(col,vec3(0.0),black); gl_FragColor=vec4(col,1.0);}`,
  depthTest: false,
});
const quadScene = new THREE.Scene(); quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mixMat));
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const composer = new EffectComposer(renderer);
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.45, 0.9);
composer.addPass(new TexturePass(rtC.texture)); composer.addPass(bloom); composer.addPass(new OutputPass());

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000); scene.fog = new THREE.Fog(0x000000, 14, 40);
const cam = new THREE.PerspectiveCamera(38, W / H, 0.05, 200);
const S = {}; window.S = S;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const env = (t, t0, t1, fi = 0.4, fo = 0.4) => (t < t0 || t > t1 ? 0 : Math.min(eo(prog(t, t0, fi)), 1 - prog(t, t1 - fo, fo)));
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (draw) draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { c, g }; return t; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(5);
function setOpacity(obj, a) {
  obj.traverse(o => { if (o.material) { o.material.transparent = true; if (o.userData.op === undefined) o.userData.op = o.material.opacity; o.material.opacity = o.userData.op * a; } });
  obj.visible = a > 0.003;
}

// ---------------------------------------------------------------- la figura: óvalo con lente
const RX = 1.5, RY = 1.0;
function ellipsePts(rx, ry, n = 200, z = 0) { const p = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; p.push(v3(Math.cos(a) * rx, Math.sin(a) * ry, z)); } return p; }
function tube(pts, r, mat) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 300, r, 10, true), mat); }
function buildFigure() {
  const F = new THREE.Group(); scene.add(F); S.F = F;
  const glow = new THREE.MeshBasicMaterial({ color: 0xe0e0e0 });
  const dim = new THREE.MeshBasicMaterial({ color: 0x8a8a8a, transparent: true, opacity: 0.9 });
  S.lid = new THREE.Group(); F.add(S.lid);                       // lo que «parpadea» (escala en y)
  // fondo de cristal oscuro
  const shape = new THREE.Shape(); shape.absellipse(0, 0, RX, RY, 0, Math.PI * 2);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(shape, 96), new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.92 }));
  glass.position.z = -0.25; S.lid.add(glass);
  S.ring = tube(ellipsePts(RX, RY), 0.035, glow); S.lid.add(S.ring);
  S.ring2 = tube(ellipsePts(RX * 1.12, RY * 1.12), 0.008, dim); S.lid.add(S.ring2);
  // marcas de medida alrededor (giran)
  const ticks = new THREE.Group(); S.lid.add(ticks); S.ticks = ticks;
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * Math.PI * 2, long = i % 6 === 0;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.012, long ? 0.12 : 0.05, 0.01), long ? glow : dim);
    const rx = RX * 1.2, ry = RY * 1.2; m.position.set(Math.cos(a) * rx, Math.sin(a) * ry, 0);
    m.rotation.z = Math.atan2(Math.sin(a) * rx, Math.cos(a) * ry) - Math.PI / 2; ticks.add(m);
  }
  // anillos en 3D (giroscopio) alrededor del óvalo
  S.orbits = [0, 1].map(i => { const o = tube(ellipsePts(RX * 1.32, RY * 1.32, 200), 0.006, dim); F.add(o); return o; });
  // lente: esfera iluminada + abertura negra + láminas de diafragma
  const lens = new THREE.Group(); S.lid.add(lens); S.lens = lens;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.56, 64, 48), new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.28, metalness: 0.1 }));
  lens.add(ball); S.ball = ball;
  const ap = new THREE.Mesh(new THREE.CircleGeometry(0.25, 64), new THREE.MeshBasicMaterial({ color: 0x000000 })); ap.position.z = 0.565; lens.add(ap); S.ap = ap;
  S.blades = new THREE.Group(); S.blades.position.z = 0.567; lens.add(S.blades);
  for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.2), new THREE.MeshBasicMaterial({ color: 0x9a9a9a })); const a = i / 8 * Math.PI * 2; b.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0); b.rotation.z = a + 0.6; S.blades.add(b); }
  S.spec = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), glow); S.spec.position.set(-0.12, 0.13, 0.57); lens.add(S.spec);
  S.voice = tube(ellipsePts(0.32, 0.32, 96, 0.566), 0.01, glow); lens.add(S.voice);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8); rim.position.set(4, -2, -3); scene.add(rim);
  // haz de lectura: abanico de líneas desde la lente al documento
  S.beam = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 6), 3)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
  S.beam.frustumCulled = false; scene.add(S.beam);
  // polvo
  const P = []; for (let i = 0; i < 500; i++) P.push((rnd() - 0.5) * 30, (rnd() - 0.5) * 40, -rnd() * 30 + 4);
  S.dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(P, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.35 }));
  scene.add(S.dust);
}

// ---------------------------------------------------------------- documentos y datos
function drawLines(g, x, y, w, n, gap = 26, a = 0.35) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(255,255,255,${a})`; rr(g, x, y + i * gap, w * (0.6 + 0.4 * ((i * 37 % 10) / 10)), 10, 5); g.fill(); } }
function docTex(kind, title, sub) {
  return canvasTex(600, 800, (g, w, h) => {
    g.fillStyle = '#0d0d0d'; rr(g, 0, 0, w, h, 26); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; rr(g, 2, 2, w - 4, h - 4, 26); g.stroke();
    g.fillStyle = '#fff'; g.font = '800 40px Inter'; g.textBaseline = 'top'; g.fillText(title, 40, 44);
    g.font = '600 26px Inter'; g.fillStyle = '#9a9a9a'; g.fillText(sub || '', 40, 96);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(40, 140, w - 80, 2);
    if (kind === 'report') { drawLines(g, 40, 170, w - 80, 7); g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 20; i++) { const x = 60 + i * 24, y = 600 - 110 * (0.4 + 0.3 * Math.sin(i * 0.5) + i * 0.02); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); drawLines(g, 40, 650, w - 80, 4); }
    if (kind === 'table') { for (let r = 0; r < 12; r++) for (let c = 0; c < 4; c++) { g.fillStyle = `rgba(255,255,255,${r === 0 ? 0.6 : 0.18 + (r + c) % 3 * 0.06})`; rr(g, 40 + c * 132, 170 + r * 46, 110, 14, 6); g.fill(); } }
    if (kind === 'bars') { for (let i = 0; i < 9; i++) { const bh = 80 + ((i * 53) % 9) * 38; g.fillStyle = i === 6 ? '#fff' : 'rgba(255,255,255,.35)'; g.fillRect(56 + i * 56, 640 - bh, 36, bh); } drawLines(g, 40, 680, w - 80, 3); }
    if (kind === 'news') { for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(255,255,255,.12)'; rr(g, 40, 170 + k * 200, w - 80, 170, 18); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; rr(g, 64, 196 + k * 200, 200, 18, 9); g.fill(); drawLines(g, 64, 236 + k * 200, w - 140, 3, 28, 0.3); } }
    if (kind === 'big') { g.fillStyle = '#fff'; g.font = '900 120px Inter'; g.fillText(sub, 40, 300); g.font = '600 30px Inter'; g.fillStyle = '#aaa'; g.fillText(title.includes('EURÍBOR') ? 'Banco de España · sept. 2026' : 'BCE · 10/09/2026', 40, 460); drawLines(g, 40, 540, w - 80, 6); }
  });
}
const DOCS = [
  ['report', 'BOLETÍN ECONÓMICO', 'Informe trimestral'], ['table', 'DATOS · SERIES', 'Tabla de indicadores'],
  ['big', 'EURÍBOR 12 MESES', '3,247 %'], ['news', 'NOTICIAS', 'Economía · hoy'], ['bars', 'IPC', 'Nota de prensa'],
  ['report', 'POLÍTICA MONETARIA', 'Decisión de tipos'], ['big', 'TIPO DE DEPÓSITO', '2,50 %'], ['table', 'BALANZA', 'Serie mensual'],
  ['news', 'MERCADOS', 'Resumen del día'], ['bars', 'EMPLEO', 'Encuesta trimestral'], ['report', 'INFORME ANUAL', 'Capítulo 2'],
  ['table', 'PRECIOS', 'Índices'],
];
function buildDocs() {
  S.docs = DOCS.map(([kind, title, sub], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.0), new THREE.MeshBasicMaterial({ map: docTex(kind, title, sub), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    scene.add(m);
    return { m, i, x: ((i * 0.618) % 1 - 0.5) * 9, y: ((i * 0.371) % 1 - 0.5) * 11, ph: i / DOCS.length, sp: 0.9 + (i % 3) * 0.15 };
  });
  // fuentes: tres etiquetas institucionales (texto, sin logotipos)
  S.src = ['BANCO CENTRAL EUROPEO', 'BANCO DE ESPAÑA', 'INE'].map(s => { const sp = chip(s); scene.add(sp); return sp; });
  // lo que te afecta
  S.topics = [['🏠', 'Tu hipoteca'], ['💶', 'Tus ahorros'], ['🛒', 'El súper']].map(([e, s]) => { const m = card(e, s); scene.add(m); return m; });
  // tarjeta de resumen «1 minuto»
  S.reel = reelCard(); scene.add(S.reel);
  // lo que NO hago
  S.nos = ['Humo', '«Hazte rico»', '«Compra esto»'].map(s => { const m = noCard(s); scene.add(m); return m; });
  S.follow = followCard(); scene.add(S.follow);
}
function chip(s) {
  const t = canvasTex(900, 140, (g, w, h) => { g.fillStyle = '#fff'; rr(g, 4, 4, w - 8, h - 8, 66); g.fill(); g.fillStyle = '#000'; g.font = '800 54px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, w / 2, h / 2 + 2); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.405), new THREE.MeshBasicMaterial({ map: t, color: 0xc8c8c8, transparent: true, depthWrite: false })); m.visible = false; return m;
}
function card(e, s) {
  const t = canvasTex(600, 600, (g, w, h) => {
    g.fillStyle = '#0e0e0e'; rr(g, 0, 0, w, h, 60); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 6; rr(g, 3, 3, w - 6, h - 6, 60); g.stroke();
    g.font = '200px "Noto Color Emoji"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.filter = 'grayscale(1)'; g.fillText(e, w / 2, 250); g.filter = 'none';
    g.fillStyle = '#fff'; g.font = '800 64px Inter'; g.fillText(s, w / 2, 480);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); m.visible = false; return m;
}
function reelCard() {
  const t = canvasTex(700, 1240);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 3.1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); m.visible = false; m.userData.tex = t; return m;
}
function drawReel(t, u) {   // u: segundos del minuto que van pasando
  const tex = S.reel.userData.tex, g = tex.userData.g, w = 700, h = 1240;
  g.clearRect(0, 0, w, h); g.fillStyle = '#0c0c0c'; rr(g, 0, 0, w, h, 70); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 6; rr(g, 3, 3, w - 6, h - 6, 70); g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 46px Inter'; g.fillText('Lo importante', w / 2, 110);
  // reloj de un minuto
  const cx = w / 2, cy = 420, R = 190;
  g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 22; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#fff'; g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(u / 60)); g.stroke();
  g.font = '900 120px Inter'; g.fillText('1:00', cx, cy - 10); g.font = '600 34px Inter'; g.fillStyle = '#aaa'; g.fillText('minuto', cx, cy + 70);
  drawLines(g, 80, 700, w - 160, 5, 34, 0.4);
  // chips de datos y fuentes
  g.fillStyle = '#fff'; rr(g, 80, 920, 250, 80, 40); g.fill(); g.fillStyle = '#000'; g.font = '800 34px Inter'; g.fillText('Datos', 205, 962);
  g.strokeStyle = '#fff'; g.lineWidth = 4; rr(g, 360, 920, 260, 80, 40); g.stroke(); g.fillStyle = '#fff'; g.fillText('Fuentes', 490, 962);
  g.fillStyle = '#777'; g.font = '600 28px Inter'; g.fillText('kiria.ai', w / 2, 1150);
  tex.needsUpdate = true;
}
function noCard(s) {
  const t = canvasTex(900, 220, (g, w, h) => { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 6; rr(g, 4, 4, w - 8, h - 8, 50); g.stroke(); g.fillStyle = '#cfcfcf'; g.font = '800 84px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, w / 2, h / 2 + 4); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.66), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); m.visible = false;
  const x = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.06), new THREE.MeshBasicMaterial({ color: 0xb0b0b0, transparent: true })); x.position.z = 0.01; m.add(x); m.userData.strike = x;
  return m;
}
function followCard() {
  const t = canvasTex(900, 300, (g, w, h) => { g.fillStyle = '#fff'; rr(g, 6, 6, w - 12, h - 12, 140); g.fill(); g.fillStyle = '#000'; g.font = '900 110px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Seguir', w / 2, h / 2 + 6); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.8), new THREE.MeshBasicMaterial({ map: t, color: 0xd0d0d0, transparent: true, depthWrite: false })); m.visible = false; return m;
}

// ---------------------------------------------------------------- animación
const FIG = v3(0, 1.25, 0);
function figureAt(t, target) {
  const F = S.F; F.position.copy(FIG).add(v3(0, 0.06 * Math.sin(t * 1.3), 0)); F.scale.setScalar(0.66);
  // gira un poco hacia lo que mira
  const d = target ? target.clone().sub(F.position) : v3(0, 0, 1);
  F.rotation.y = lerp(F.rotation.y, clamp(d.x * 0.08, -0.35, 0.35), 1); F.rotation.x = clamp(-d.y * 0.05, -0.25, 0.25);
  // la lente se desplaza dentro del óvalo
  const lx = clamp(d.x * 0.12, -0.55, 0.55), ly = clamp(d.y * 0.1, -0.28, 0.28);
  S.lens.position.set(lx, ly, 0.05);
  // parpadeo (cierra en vertical) cada ~4 s y al cambiar de bloque
  const bt = [2.3, K.leo - 0.45, K.busco - 0.35, K.explico - 0.35, K.humo - 0.3, K.solo - 0.35, K.interesa - 0.3];
  let blink = 0; for (const b of bt) blink = Math.max(blink, Math.sin(Math.PI * prog(t, b, 0.22)));
  // se abre al empezar y se cierra al final (bucle: cerrado → abierto)
  const open = eo(prog(t, 0.1, 0.6)) * (1 - eio(prog(t, END - 0.75, 0.6)));
  S.lid.scale.set(1, Math.max(0.02, open * (1 - 0.92 * blink)), 1);
  // voz: la abertura se abre y se cierra con el nivel de la voz
  const lv = ENV ? ENV[Math.min(ENV.length - 1, Math.round(t * 30))] : 0.4 + 0.4 * Math.sin(t * 9);
  S.ap.scale.setScalar(0.8 + 0.45 * lv); S.blades.rotation.z = t * 0.6 + lv * 0.8; S.blades.scale.setScalar(0.85 + 0.35 * lv);
  S.voice.scale.setScalar(1 + 0.35 * lv); S.voice.material.opacity = 0.4 + 0.6 * lv;
  S.ticks.rotation.z = t * 0.12;
  S.orbits[0].rotation.set(1.2 + t * 0.4, 0.3, 0); S.orbits[1].rotation.set(0.4, 1.0 + t * 0.33, 0.2);
  S.ball.rotation.y = t * 0.2;
}
function beamTo(points, a) {
  const arr = S.beam.geometry.attributes.position.array; const o = S.lens.getWorldPosition(v3(0, 0, 0)).add(v3(0, 0, 0.6));
  let k = 0;
  for (let i = 0; i < 24; i++) { const p = points[i % points.length]; arr[k++] = o.x; arr[k++] = o.y; arr[k++] = o.z; arr[k++] = p.x; arr[k++] = p.y; arr[k++] = p.z; }
  S.beam.geometry.attributes.position.needsUpdate = true; S.beam.material.opacity = 0.35 * a; S.beam.visible = a > 0.01;
}
function cornersOf(m) { const pts = []; const w = m.geometry.parameters.width / 2 * m.scale.x, h = m.geometry.parameters.height / 2 * m.scale.y; for (const [x, y] of [[-w, -h], [w, -h], [w, h], [-w, h]]) for (let k = 0; k < 6; k++) pts.push(m.localToWorld(v3(x * (1 - k * 0.15), y * (1 - k * 0.15), 0).divide(m.scale))); return pts; }

function frame(t) {
  // cámara: plano medio de la figura con deriva lenta; se acerca al presentarse y al final
  const push = 1 - 0.12 * eio(prog(t, K.hola, 1.6)) - 0.1 * eio(prog(t, K.sigueme - 0.5, 1.5));
  const ang = 0.04 * Math.sin(t * 0.18);
  cam.position.set(Math.sin(ang) * 11 * push, 1.4 + 0.3 * Math.sin(t * 0.21), Math.cos(ang) * 11 * push);
  cam.lookAt(0, 0.6, 0);
  let target = null, beamA = 0, beamPts = null;
  // documentos que pasan (corriente) mientras «lee»
  const flowA = env(t, K.leo - 0.6, K.busco + 0.4, 0.8, 0.8) + 0.6 * env(t, K.solo - 0.3, K.interesa + 1.5, 0.8, 0.8);
  let best = null;
  S.docs.forEach(d => {
    const f = ((t * 0.07 * d.sp + d.ph) % 1);
    const z = lerp(-26, 4, f);
    d.m.position.set(d.x * (1 + 0.3 * f), d.y * 0.6 + 0.9, z);
    d.m.rotation.set(0.15 * Math.sin(t * 0.3 + d.i), -d.x * 0.06, 0.05 * Math.sin(t * 0.4 + d.i));
    const a = flowA * clamp((z + 26) / 6) * clamp((4 - z) / 3);
    setOpacity(d.m, a);
    if (a > 0.5 && z > -10 && z < 2 && (!best || z > best.m.position.z)) best = d;
  });
  if (best && flowA > 0.3) { target = best.m.position.clone(); beamA = flowA; beamPts = cornersOf(best.m); }
  // fuentes
  S.src.forEach((c, i) => {
    const t0 = [K.bce, K.bde, K.ine][i], a = env(t, t0 - 0.1, K.busco - 0.1, 0.3, 0.4);
    c.visible = a > 0.01; c.material.opacity = a; c.position.set(0, -0.5 - i * 0.55, 1.2); c.scale.setScalar(0.8 + 0.2 * eo(prog(t, t0 - 0.1, 0.3)));
    if (a > 0.5 && t < [K.bde, K.ine, K.busco][i]) { target = c.position.clone(); beamA = a; beamPts = cornersOf(c); }
  });
  // lo que te afecta
  S.topics.forEach((c, i) => {
    const t0 = [K.hipoteca, K.ahorros, K.super][i], a = env(t, t0 - 0.2, K.explico + 0.3, 0.35, 0.4);
    const x = (i - 1) * 1.12; c.visible = a > 0.01; c.material.opacity = a;
    c.position.set(x, -1.1 + 0.06 * Math.sin(t * 2 + i), 1.4); c.scale.setScalar(0.68 * (0.6 + 0.4 * eo(prog(t, t0 - 0.2, 0.35))));
    if (a > 0.5 && t < [K.ahorros, K.super, K.explico][i]) { target = c.position.clone(); beamA = a; beamPts = cornersOf(c); }
  });
  // resumen en un minuto: los temas vuelan a una tarjeta
  const ra = env(t, K.explico, K.humo - 0.1, 0.5, 0.4);
  S.reel.visible = ra > 0.01; S.reel.material.opacity = ra;
  S.reel.position.set(0, -1.15, 1.6); S.reel.rotation.y = 0; S.reel.scale.setScalar(0.62 * (0.7 + 0.3 * eo(prog(t, K.explico, 0.5))));
  if (ra > 0.01) drawReel(t, 60 * eo(prog(t, K.minuto - 0.3, 1.4)));
  if (ra > 0.5) { target = S.reel.position.clone(); beamA = ra * 0.6; beamPts = cornersOf(S.reel); }
  // lo que no hace
  S.nos.forEach((c, i) => {
    const t0 = [K.humo, K.rico, K.comprar][i], a = env(t, t0 - 0.15, K.solo + 0.2, 0.3, 0.4);
    c.visible = a > 0.01; c.material.opacity = a * 0.9; c.position.set(0, -0.55 - i * 0.62, 1.3); c.scale.setScalar(0.8);
    const s = eo(prog(t, t0 + 0.25, 0.3)); c.userData.strike.scale.x = Math.max(0.001, s); c.userData.strike.material.opacity = a;
    c.userData.strike.rotation.z = -0.08;
  });
  // seguir
  const fa = env(t, K.sigueme - 0.1, END + 1, 0.35, 0.3);
  S.follow.visible = fa > 0.01; S.follow.material.opacity = fa; S.follow.position.set(0, -1.0, 0.4);
  const tap = prog(t, K.sigueme + 0.6, 0.25); S.follow.scale.setScalar((0.7 + 0.3 * eo(prog(t, K.sigueme - 0.1, 0.35))) * (1 - 0.08 * Math.sin(Math.PI * tap)));
  if (fa > 0.5 && t < K.leopor) target = S.follow.position.clone();
  figureAt(t, target || cam.position.clone());
  beamTo(beamPts || [S.F.position], beamA);
  const dp = S.dust.geometry.attributes.position.array; for (let i = 0; i < dp.length / 3; i++) dp[i * 3 + 2] = ((dp[i * 3 + 2] + 26 + 0.02) % 30) - 26;
  S.dust.geometry.attributes.position.needsUpdate = true;
  // entrada desde negro y bucle: al final la figura vuelve al primer plano (mismo encuadre)
  return { black: Math.max(1 - ss(prog(t, 0, 0.3)), ss(prog(t, END - 0.3, 0.3))) };
}

window.renderAt = function (t) {
  const st = frame(t);
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  mixMat.uniforms.tA.value = rtA.texture; mixMat.uniforms.blur.value = st.blur || 0;
  mixMat.uniforms.white.value = st.white || 0; mixMat.uniforms.black.value = clamp(st.black || 0);
  renderer.setRenderTarget(rtC); renderer.render(quadScene, quadCam);
  bloom.enabled = false; renderer.setRenderTarget(null); composer.render();   // el brillo se añade en Python (más rápido)
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '800' }),
    new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-SemiBold.otf)`, { weight: '600' }),
    new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' }), new FontFace('Mono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  try { const r = await fetch('../tiempos_k.json'); if (r.ok) { const j = await r.json(); K = { ...K, ...j.K }; END = j.END; } } catch (e) { /* sin voz aún */ }
  try { const r = await fetch('../env.json'); if (r.ok) ENV = await r.json(); } catch (e) { /* sin voz aún */ }
  buildFigure(); buildDocs();
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
