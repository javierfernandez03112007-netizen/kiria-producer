// «Soy Kiria» v2 — la IA del canal: un óvalo con una lente-globo que lee un folio apoyado debajo.
// La mirada se mueve de forma natural (giro suave, seguimiento de cada frase) y el vídeo alterna fondo negro
// con líneas blancas y fondo blanco con líneas negras. window.renderAt(t) dibuja el instante t.
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

// ---------------------------------------------------------------- el folio
const PW = 3.6, PL = 3.6 * 4000 / 1100, CW = 1100, CH = 4000;   // tamaño en el mundo y en el lienzo
const PAPER_Y = 0, Z_READ = 0.95;               // el folio pasa por debajo; la frase leída queda en z = Z_READ
let LINES = [];
function lineDefs() {
  // [texto, estilo, lectura (ini, fin), efecto]  —  estilos: k (antetítulo), h1, h2, b (cuerpo)
  return [
    ['LECTURA DE HOY · ECONOMÍA', 'k', null],
    ['Informes, datos y noticias', 'h1', [K.leo + 0.05, K.noticias + 0.55]],
    ['de economía', 'h1', [K.noticias + 0.6, K.noticias + 1.35]],
    ['', 'gap'],
    ['Banco Central Europeo', 'h2', [K.bce - 0.45, K.bce + 0.75]],
    ['Tipo de depósito: 2,50 %', 'b', [K.bce + 0.8, K.bde - 0.25]],
    ['Banco de España', 'h2', [K.bde - 0.2, K.bde + 0.35]],
    ['Euríbor 12 meses: 3,247 %', 'b', [K.bde + 0.38, K.ine - 0.05]],
    ['INE · precios de consumo', 'h2', [K.ine, K.ine + 0.75]],
    ['', 'gap'],
    ['¿Qué te afecta?', 'h1', null],
    ['→ Tu hipoteca', 'b', null],
    ['→ Tus ahorros', 'b', null],
    ['→ Lo que pagas en el súper', 'b', null],
    ['', 'gap'],
    ['Explicado en 1 minuto', 'h1', null, { circle: '1 minuto', at: K.minuto }],
    ['Con datos y fuentes', 'b', null, { circle: 'fuentes', at: K.fuentes }],
    ['', 'gap'],
    ['Humo', 'h2', null, { strike: K.humo + 0.25 }],
    ['«Hazte rico rápido»', 'b', null, { strike: K.rico + 0.1 }],
    ['«Compra esto ya»', 'b', null, { strike: K.comprar }],
    ['', 'gap'],
    ['Lo que necesitas', 'h1', [K.solo + 0.35, K.solo + 1.1]],
    ['para entender lo que pasa.', 'h1', [K.solo + 1.15, K.pasando + 0.45]],
    ['', 'gap'], ['', 'gap'],
  ];
}
const STYLE = { k: [40, 700, '#6a6a6a', 110], h1: [82, 800, '#0a0a0a', 150], h2: [70, 800, '#111', 132], b: [62, 600, '#2a2a2a', 120], gap: [0, 0, '', 90] };
function buildPaper() {
  const defs = lineDefs();
  const tex = canvasTex(CW, CH, (g, w, h) => {
    g.fillStyle = '#fbfbfa'; g.fillRect(0, 0, w, h);
    // líneas de cuaderno muy suaves y margen
    g.strokeStyle = 'rgba(0,0,0,.06)'; g.lineWidth = 2; for (let y = 60; y < h; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(110, 0); g.lineTo(110, h); g.stroke();
    let y = 300;
    LINES = defs.map(([text, st, read, fx]) => {
      const [size, weight, color, lh] = STYLE[st];
      const L = { text, st, read, fx: fx || {}, y, h: size };
      if (text) {
        let sz = size; g.font = `${weight} ${sz}px Inter`;
        while (g.measureText(text).width > w - 240 && sz > 30) { sz -= 2; g.font = `${weight} ${sz}px Inter`; }
        g.fillStyle = color; g.textBaseline = 'alphabetic'; g.fillText(text, 150, y + sz * 0.8);
        L.x0 = 150; L.x1 = 150 + g.measureText(text).width; L.h = sz;
        if (L.fx.circle) { const i = text.indexOf(L.fx.circle); L.cx0 = 150 + g.measureText(text.slice(0, i)).width; L.cx1 = L.cx0 + g.measureText(L.fx.circle).width; }
      }
      y += lh;
      return L;
    });
    g.fillStyle = '#9a9a9a'; g.font = '600 30px Inter'; g.fillText('kiria.ai', 150, 140);
  });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(PW, PL), new THREE.MeshBasicMaterial({ map: tex, color: 0xd0d0d0 }));
  paper.rotation.x = -Math.PI / 2; scene.add(paper); S.paper = paper;
  S.paperEdge = new THREE.LineSegments(new THREE.EdgesGeometry(paper.geometry), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })); paper.add(S.paperEdge);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(PW + 1.2, PL + 1.2), new THREE.MeshBasicMaterial({ map: canvasTex(128, 256, (g, w, h) => { g.filter = 'blur(10px)'; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(22, 22, w - 44, h - 44); }), transparent: true, depthWrite: false, opacity: 0 }));
  shadow.position.set(0.12, -0.12, -0.01); paper.add(shadow); S.shadow = shadow;
  // marcas sobre el papel: subrayados (siguen a la mirada), tachados y círculos
  LINES.forEach(L => {
    if (!L.text) return;
    if (L.read) { const hl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false })); hl.position.z = 0.003; paper.add(hl); L.hl = hl; }
    if (L.fx.strike) { const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x0a0a0a })); s.position.z = 0.004; paper.add(s); L.sk = s; }
    if (L.fx.circle) { const c = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ellipsePts(1, 1, 120)), new THREE.LineBasicMaterial({ color: 0x0a0a0a })); c.position.z = 0.004; paper.add(c); L.ci = c; L.ciPts = ellipsePts(1, 1, 120); }
  });
}
// coordenadas del lienzo → locales del plano del folio
const cx2l = x => (x / CW - 0.5) * PW, cy2l = y => (0.5 - y / CH) * PL;

// desplazamiento del folio: la frase que se lee queda bajo el ojo; entre frases el folio se desliza con suavidad
function readKeys() {
  const ks = [];
  LINES.forEach(L => { if (L.read) { const v = (L.y + L.h * 0.5) / CH; ks.push([L.read[0], v], [L.read[1], v + 0.004]); } });
  return ks;
}
let KEYS = [];
function paperV(t) {
  if (t <= KEYS[0][0]) return KEYS[0][1] - 0.02 * (KEYS[0][0] - t) * 0.5;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [ta, va] = KEYS[i], [tb, vb] = KEYS[i + 1];
    if (t <= tb) { const u = (t - ta) / Math.max(1e-6, tb - ta); return lerp(va, vb, i % 2 === 0 ? u : ss(u)); }
  }
  const [tl, vl] = KEYS[KEYS.length - 1]; return vl + 0.035 * (t - tl);
}
function placePaper(t) {
  const v = paperV(t);
  // el punto v del folio queda en z = Z_READ (el folio se aleja de cámara al avanzar la lectura)
  S.paper.position.set(0, PAPER_Y, Z_READ - (v - 0.5) * PL);
}
function linePoint(L, x, t) {   // punto del mundo sobre la frase L en la x del lienzo
  const v = paperV(t);
  const z = Z_READ - (v - 0.5) * PL + (L.y + L.h * 0.55) / CH * PL - PL / 2;
  return v3(cx2l(x), PAPER_Y + 0.01, z);
}

// ---------------------------------------------------------------- mirada (sin estado: se calcula para cualquier t)
const FIG = v3(0, 2.35, -0.35);
function camPos(t) { return cam.position.clone(); }
const CAMP = v3(0, 3.4, 9);   // mirar a cámara (aprox.)
let GK = [];
function buildGazeKeys() {
  const k = [], add = (t, fn, d = 0.38) => k.push([t, fn, d]), at = p => () => p.clone();
  add(-1, at(CAMP));
  LINES.filter(L => L.read).forEach(L => add(L.read[0], t => { const u = clamp((t - L.read[0]) / (L.read[1] - L.read[0])); return linePoint(L, lerp(L.x0, L.x1, 0.75 * u + 0.25 * ss(u)), t); }));
  // red de datos: mira cada nodo al encenderse
  nodeDefs().forEach(([kk, , , p, t0]) => add(t0 + 0.05, at(p), 0.4));
  add(K.explico - 0.3, at(CAMP));
  add(K.fuentes - 0.3, at(v3(0, 0.25, 2.7)));
  add(K.humo - 0.25, at(v3(0, 1.75, 1.6))); add(K.humo + 1.0, at(CAMP));
  add(K.pasando + 0.6, at(CAMP));
  add(K.interesa - 0.4, at(BELT_B.clone()), 0.45); add(K.interesa + 1.2, t => pileTop(t), 0.5); add(K.quedate - 0.2, at(CAMP));
  return k.sort((a, b) => a[0] - b[0]);
}
function rawGaze(t) {
  let i = 0; while (i < GK.length - 1 && GK[i + 1][0] <= t) i++;
  if (i === 0) return GK[0][1](t);
  const [t0, fn, d] = GK[i];
  return GK[i - 1][1](t).lerp(fn(t), eio(clamp((t - t0) / d)));
}
function gaze(t) {   // media ponderada en ±0,12 s: aceleraciones y frenadas naturales
  const p = v3(0, 0, 0); let wsum = 0;
  for (let k = -4; k <= 4; k++) { const w = 1 - Math.abs(k) / 5; p.addScaledVector(rawGaze(t + k * 0.035), w); wsum += w; }
  p.multiplyScalar(1 / wsum);
  // pequeña deriva (micro-movimientos), muy sutil
  p.x += 0.02 * Math.sin(t * 2.3) + 0.01 * Math.sin(t * 5.1); p.y += 0.015 * Math.sin(t * 1.7 + 1);
  return p;
}

// ---------------------------------------------------------------- modo y cámara
// negro → (se acerca al folio blanco) → blanco → (se acerca a la abertura negra) → negro
function modeAt(t) { return t >= NET_END && t < 24.05 ? 'white' : 'black'; }
function applyMode(mode) {
  const white = mode === 'white';
  scene.background.setHex(white ? 0xffffff : 0x000000); scene.fog.color.setHex(white ? 0xffffff : 0x000000);
  M.line.color.setHex(white ? 0x111111 : 0xe6e6e6); M.dim.color.setHex(white ? 0x6a6a6a : 0x8a8a8a);
  M.glass.color.setHex(white ? 0xf2f2f2 : 0x050505);
  M.blade.color.setHex(white ? 0x7a7a7a : 0x9a9a9a); M.outline.opacity = white ? 1 : 0;
  S.paper.material.color.setHex(white ? 0xffffff : 0xcfcfcf);
  S.paperEdge.material.opacity = white ? 0.35 : 0; S.shadow.material.opacity = white ? 0.8 : 0;
  S.dust.material.color.setHex(white ? 0x000000 : 0xffffff); S.dust.material.opacity = white ? 0.15 : 0.3;
}
const BASE = { p: v3(0, 3.7, 8.6), l: v3(0, 1.75, 0) };
function cameraAt(t) {
  let p = BASE.p.clone(), l = BASE.l.clone();
  const drift = 0.12 * Math.sin(t * 0.21);
  p.applyAxisAngle(v3(0, 1, 0), drift);
  // inicio: muy pegado a la lente, se aleja al decir «Soy Kiria»
  const lensP = FIG.clone().add(v3(0, 0, 0.7));
  const k0 = eio(prog(t, 0.9, 2.0));
  p = lensP.clone().add(v3(0, 0.05, 1.6)).lerp(p, k0); l = FIG.clone().lerp(l, k0);
  // acercamiento lento en «explicado en un minuto» y giro en «sin humo»
  const push = 0.0 * eio(prog(t, K.explico - 0.6, 2.4));
  p.lerp(v3(0, 2.9, 6.6), 0.5 * push);
  const orb = 0.32 * Math.sin(Math.PI * prog(t, K.humo - 0.5, K.comprar - K.humo + 0.7));
  p.sub(l).applyAxisAngle(v3(0, 1, 0), orb).add(l);
  // caída al folio blanco (paso a blanco)
  const netOrb = 0.24 * Math.sin(Math.PI * prog(t, K.busco - 0.6, NET_END - K.busco - 0.4)) * Math.sin(Math.PI * 0.5 * prog(t, K.busco - 0.6, 2));
  p.sub(l).applyAxisAngle(v3(0, 1, 0), netOrb).add(l);
  const d1 = eio(prog(t, NET_END - 0.65, 0.65)), u1 = eio(prog(t, NET_END, 0.9));
  if (t > NET_END - 0.7 && t < NET_END + 1.0) {
    const fp = v3(0, 0.25, 2.7);
    if (t < NET_END) { p = p.clone().lerp(fp.clone().add(v3(0, 0, 0.12)), d1); l = l.clone().lerp(fp, d1); }
    else { p = fp.clone().add(v3(0, 0.6, 2.2)).lerp(p, u1); l = fp.clone().lerp(l, u1); }
  }
  // entrada en la abertura negra de la lente (paso a negro) y salida
  const lensW = S.ap.getWorldPosition(v3(0, 0, 0));
  const d2 = eio(prog(t, 23.5, 0.6)), u2 = eio(prog(t, 24.05, 1.1));
  if (t > 23.45 && t < 25.3) {
    const dir = p.clone().sub(lensW).normalize();
    if (t < 24.05) { p = p.clone().lerp(lensW.clone().addScaledVector(dir, 0.06), d2); l = l.clone().lerp(lensW, d2); }
    else { p = lensW.clone().addScaledVector(dir, 1.4).lerp(p, u2); l = lensW.clone().lerp(l, u2); }
  }
  // final: se acerca otra vez a la lente (bucle)
  const k1 = eio(prog(t, END - 2.2, 2.0));
  p.lerp(lensP.clone().add(v3(0, 0.05, 1.6)), k1); l.lerp(FIG, k1);
  cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l);
}

function figureAt(t) {
  const F = S.F;
  F.position.copy(FIG).add(v3(0, 0.05 * Math.sin(t * 1.2), 0));
  F.scale.setScalar(0.72 * (1 + 0.012 * Math.sin(t * 1.9)));
  const g = gaze(t);
  // el cuerpo se inclina un poco hacia lo que lee; la lente-globo gira el resto
  const toG = g.clone().sub(F.position);
  const pitch = clamp(Math.atan2(-toG.y, Math.max(0.3, toG.z)) * 0.62, -0.1, 0.72);
  const yaw = clamp(Math.atan2(toG.x, Math.max(0.3, toG.z)) * 0.35, -0.3, 0.3);
  // gestos: niega («rico», «comprar»), asiente («quédate») y ladea con curiosidad al buscar
  const shake = [K.rico + 0.05, K.comprar + 0.02].reduce((s, a) => s + (t > a && t < a + 0.75 ? 0.2 * Math.sin((t - a) * Math.PI * 2 * 2.6) * (1 - (t - a) / 0.75) : 0), 0);
  const nod = t > K.quedate + 0.05 && t < K.quedate + 0.7 ? 0.16 * Math.sin((t - K.quedate - 0.05) * Math.PI * 2 * 2.4) * (1 - (t - K.quedate - 0.05) / 0.65) : 0;
  const tilt = 0.14 * Math.sin((t - K.busco) * 2.2) * env(t, K.busco - 0.2, K.hipoteca, 0.4, 0.4);
  F.rotation.set(pitch + nod, yaw + shake, tilt);
  F.updateMatrixWorld(true);
  const local = S.lid.worldToLocal(g.clone()).sub(S.lens.position).normalize();
  const maxA = 0.55, ang = Math.acos(clamp(local.z, -1, 1));
  if (ang > maxA) { const xy = v3(local.x, local.y, 0).normalize(); local.set(xy.x * Math.sin(maxA), xy.y * Math.sin(maxA), Math.cos(maxA)); }
  S.eyeball.quaternion.setFromUnitVectors(v3(0, 0, 1), local);
  S.lens.position.set(local.x * 0.3, local.y * 0.24, 0.05);
  S.spec.position.set(-0.13, 0.15, 0.6);
  // parpadeo: se cierra en vertical (rápido al cerrar, más lento al abrir)
  const blinks = [2.35, K.bce - 0.9, K.busco + 0.9, K.explico - 0.95, K.solo + 0.05 + 0.5, K.interesa - 0.3, K.quedate + 0.45];
  let bl = 0; for (const b of blinks) { const x = t - b; if (x > 0 && x < 0.3) bl = Math.max(bl, x < 0.09 ? x / 0.09 : 1 - (x - 0.09) / 0.21); }
  const open = eo(prog(t, 0.15, 0.7)) * (1 - eio(prog(t, END - 0.75, 0.6)));
  S.lid.scale.set(1, Math.max(0.02, open * (1 - 0.94 * ss(bl))), 1);
  // voz: el diafragma respira con el nivel de la voz
  const lv = ENV ? ENV[Math.min(ENV.length - 1, Math.max(0, Math.round(t * 30)))] : 0.3;
  const sc = 1.05 + 0.35 * lv; S.ap.scale.set(sc, 1, sc);   // la abertura se dilata con la voz
  S.iris.rotation.y = t * 0.25;
  S.ticks.rotation.z = t * 0.1;
  // reloj de un minuto: las marcas se encienden en sentido horario desde arriba
  const white = modeAt(t) === 'white';
  const fill = 72 * eio(prog(t, K.explico + 0.05, K.fuentes - K.explico)), clockA = env(t, K.explico, K.humo - 0.1, 0.2, 0.5);
  S.tickList.forEach(m => {
    const j = ((18 - m.userData.i) % 72 + 72) % 72, lit = clockA > 0 && j < fill;
    m.material.color.setHex(lit ? (white ? 0x000000 : 0xffffff) : (m.userData.long ? (white ? 0x222222 : 0xd0d0d0) : (white ? 0x8a8a8a : 0x6a6a6a)));
    m.scale.set(lit ? 2.2 : 1, lit ? 1.7 : 1, 1);
  });
  S.orbits[0].rotation.set(1.2 + t * 0.35, 0.3, 0); S.orbits[1].rotation.set(0.4, 1.0 + t * 0.28, 0.2);
}

function marksAt(t) {
  LINES.forEach(L => {
    if (L.hl) {
      const [a, b] = L.read;
      const u = clamp((t - a) / (b - a)), uu = 0.75 * u + 0.25 * ss(u);
      const x1 = lerp(L.x0, L.x1, uu);
      const w = Math.max(0.0001, cx2l(x1 + 10) - cx2l(L.x0 - 10)), hh = L.h * 1.05 / CH * PL;
      L.hl.visible = t > a; L.hl.scale.set(w, hh, 1); L.hl.position.set(cx2l(L.x0 - 10) + w / 2, cy2l(L.y + L.h * 0.45), 0.003);
    }
    if (L.sk) { const k = eo(prog(t, L.fx.strike, 0.3)); const sw = Math.max(0.0001, (cx2l(L.x1 + 16) - cx2l(L.x0 - 16)) * k); L.sk.visible = k > 0; L.sk.scale.set(sw, 0.035, 1); L.sk.position.set(cx2l(L.x0 - 16) + sw / 2, cy2l(L.y + L.h * 0.42), 0.004); L.sk.rotation.z = -0.04; }
    if (L.ci) {
      const k = eo(prog(t, L.fx.at - 0.1, 0.45)); L.ci.visible = k > 0;
      const rx = (cx2l(L.cx1) - cx2l(L.cx0)) / 2 + 0.12, ry = L.h / CH * PL * 0.85;
      const n = Math.max(2, Math.round(121 * k)); L.ci.geometry.setDrawRange(0, n);
      L.ci.scale.set(rx, ry, 1); L.ci.position.set((cx2l(L.cx0) + cx2l(L.cx1)) / 2, cy2l(L.y + L.h * 0.42), 0.004); L.ci.rotation.z = 0.05;
    }
  });
}


// ---------------------------------------------------------------- red de datos con cables y pulsos, humo, cinta con cajas
M.obj = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true });
S.fat = [];
function edges(geo, x = 0, y = 0, z = 0, ry = 0) {
  const l = fatLines(new THREE.EdgesGeometry(geo, 25).attributes.position.array, 0xffffff, 2.2, 1); l.frustumCulled = false; l.renderOrder = 5; S.fat.push(l);
  l.position.set(x, y, z); l.rotation.y = ry; return l;
}
// nodos: [clave, antetítulo, valor, posición, aparece]
function nodeDefs() {
  return [
    ['inf', 'FUENTE', 'Informes', v3(-1.05, 3.2, -0.9), K.busco - 0.05],
    ['not', 'FUENTE', 'Noticias', v3(1.05, 3.25, -0.9), K.busco + 0.35],
    ['eur', 'EURÍBOR 12 MESES', '3,247 %', v3(-1.05, 1.05, 0.55), K.busco + 0.75],
    ['dep', 'DEPÓSITO BCE', '2,50 %', v3(1.05, 1.1, 0.5), K.busco + 1.1],
    ['ipc', 'INE', 'IPC', v3(0.0, 0.5, 1.15), K.busco + 1.45],
    ['hip', 'TE AFECTA', 'Hipoteca', v3(-0.7, -0.4, 1.35), K.hipoteca - 0.2],
    ['aho', 'TE AFECTA', 'Ahorros', v3(0.75, -0.3, 1.35), K.ahorros - 0.2],
    ['sup', 'TE AFECTA', 'Súper', v3(0.0, -0.95, 1.95), K.super - 0.3],
    ['fue', 'CON', 'Fuentes', v3(0.0, 0.25, 2.7), K.fuentes - 0.35],
  ];
}
// cables: [de, a, aparece]   ('ojo' = la lente)
function cableDefs() {
  return [
    ['inf', 'eur', K.busco + 0.85], ['not', 'dep', K.busco + 1.2], ['inf', 'not', K.busco + 0.5], ['eur', 'dep', K.busco + 1.25],
    ['dep', 'ipc', K.busco + 1.55], ['eur', 'ipc', K.busco + 1.6],
    ['eur', 'hip', K.hipoteca - 0.1], ['dep', 'aho', K.ahorros - 0.1], ['ipc', 'sup', K.super - 0.2], ['eur', 'aho', K.ahorros + 0.3],
    ['hip', 'ojo', K.explico - 0.2], ['aho', 'ojo', K.explico], ['sup', 'ojo', K.explico + 0.2], ['inf', 'ojo', K.minuto], ['not', 'ojo', K.minuto + 0.1],
    ['hip', 'fue', K.fuentes - 0.2], ['aho', 'fue', K.fuentes - 0.1], ['sup', 'fue', K.fuentes],
  ];
}
const NET_END = 19.75;
function nodeTex(k, label, value, filled) {
  return canvasTex(640, 240, (g, w, h) => {
    g.fillStyle = filled ? '#f4f4f4' : '#0b0b0b'; rr(g, 6, 6, w - 12, h - 12, 34); g.fill();
    g.strokeStyle = filled ? '#ffffff' : '#e6e6e6'; g.lineWidth = 6; rr(g, 6, 6, w - 12, h - 12, 34); g.stroke();
    g.fillStyle = filled ? '#555' : '#8a8a8a'; g.font = '700 34px Inter'; g.textBaseline = 'top'; g.fillText(label, 40, 34);
    g.fillStyle = filled ? '#000' : '#fff'; g.font = '800 92px Inter'; g.fillText(value, 38, 86);
    g.fillStyle = filled ? '#000' : '#fff'; g.beginPath(); g.arc(w - 46, 46, 10, 0, Math.PI * 2); g.fill();
  });
}
function buildObjects() {
  S.nodes = {};
  nodeDefs().forEach(([k, label, value, p, t0]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.43), new THREE.MeshBasicMaterial({ map: nodeTex(k, label, value, k === 'fue'), color: k === 'fue' ? 0xffffff : 0xdedede, transparent: true, depthWrite: false }));
    m.renderOrder = 6; scene.add(m); S.nodes[k] = { m, p, t0 };
  });
  S.cables = cableDefs().map(([a, b, t0]) => {
    const pos = new Float32Array(61 * 3);
    const l = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.LineBasicMaterial({ color: 0x8a8a8a, transparent: true, opacity: 0.9 }));
    l.frustumCulled = false; scene.add(l);
    const pulses = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); scene.add(m); return m; });
    return { a, b, t0, l, pulses, pts: [] };
  });
  // humo
  const puff = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,.8)'); r.addColorStop(0.5, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  S.smokeMat = new THREE.SpriteMaterial({ map: puff, color: 0x666666, transparent: true, opacity: 0.4, depthWrite: false });
  S.puffs = []; for (let i = 0; i < 36; i++) { const sp = new THREE.Sprite(S.smokeMat); scene.add(sp); S.puffs.push(sp); }
  // cinta transportadora que baja desde arriba
  const belt = new THREE.Group(); scene.add(belt); S.belt = belt;
  const len = BELT_A.distanceTo(BELT_B);
  belt.add(edges(new THREE.BoxGeometry(len, 0.06, 0.62)));
  const bandTex = canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { g.fillStyle = '#5a5a5a'; g.fillRect(x, 0, 6, h); } });
  bandTex.wrapS = THREE.RepeatWrapping; bandTex.repeat.set(len * 2, 1); S.bandTex = bandTex;
  const band = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.58), new THREE.MeshBasicMaterial({ map: bandTex })); band.rotation.x = -Math.PI / 2; band.position.y = 0.035; belt.add(band);
  const dir = BELT_B.clone().sub(BELT_A); belt.position.copy(BELT_A).add(BELT_B).multiplyScalar(0.5);
  belt.quaternion.setFromUnitVectors(v3(1, 0, 0), dir.clone().normalize());
  // cajas de información
  const labels = ['PDF', '€', '%', 'IPC', 'DATOS', 'BCE', 'INE', '€', '%', 'PDF'];
  const texs = labels.map(L => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#151515'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8d8d8'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#eee'; g.font = `800 ${L.length > 3 ? 64 : 110}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(L, w / 2, h / 2 + 6); }));
  S.boxes = []; S.slots = pileSlots();
  for (let i = 0; i < NBOX; i++) {
    const s0 = 0.3 + 0.12 * ((i * 0.618) % 1);
    const m = new THREE.Mesh(new THREE.BoxGeometry(s0, s0, s0), new THREE.MeshBasicMaterial({ map: texs[i % texs.length], color: 0xd0d0d0 }));
    scene.add(m); S.boxes.push({ m, s: s0 });
  }
}
const BELT_A = v3(1.95, 2.9, 0.2), BELT_B = v3(1.0, 1.0, 1.15), NBOX = 34, PILE = v3(0.55, -0.3, 1.55);
function pileSlots() {   // montaña: anillos que se estrechan al subir
  const sl = []; const rings = [[11, 0.62, 0], [8, 0.42, 0.34], [6, 0.24, 0.66], [5, 0.1, 0.98], [3, 0.05, 1.28], [1, 0, 1.55]];
  rings.forEach(([n, r, y], ri) => { for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + ri * 0.7; sl.push(v3(PILE.x + Math.cos(a) * r, PILE.y + y, PILE.z + Math.sin(a) * r * 0.8)); } });
  return sl;
}
const BOX_T = i => K.interesa - 0.6 + i * 0.13;
function boxPose(i, t) {
  const t0 = BOX_T(i), ride = 0.9, fall = 0.45;
  if (t < t0) return null;
  const u = (t - t0) / ride;
  if (u < 1) { const p = BELT_A.clone().lerp(BELT_B, u); p.y += S.boxes[i].s / 2 + 0.06; return { p, ride: true }; }
  const f = clamp((t - t0 - ride) / fall), slot = S.slots[Math.min(i, S.slots.length - 1)].clone(); slot.y += S.boxes[i].s / 2;
  const start = BELT_B.clone(); start.y += S.boxes[i].s / 2 + 0.06;
  const p = start.clone().lerp(slot, f); p.y += Math.sin(Math.PI * f) * 0.25 - 0.0; p.x += (1 - f) * f * 0.6;
  const spin = (1 - (1 - f) ** 2) * (1.5 + (i % 3)) ;
  return { p, r: v3(spin * 0.7, spin * (i % 2 ? 1 : -1), spin * 0.4), landed: f >= 1 };
}
function nodeA(k, t) { const n = S.nodes[k]; return env(t, n.t0, NET_END, 0.35, 0.3); }
function cablePts(c) {
  const pa = c.a === 'ojo' ? FIG.clone() : S.nodes[c.a].p, pb = c.b === 'ojo' ? FIG.clone().add(v3(0, -0.35, 0.5)) : S.nodes[c.b].p;
  const pA = c.b === 'ojo' ? pa : pa, mid = pA.clone().lerp(pb, 0.5); mid.y -= 0.35 + 0.1 * pA.distanceTo(pb);
  return new THREE.QuadraticBezierCurve3(pA, mid, pb).getPoints(60);
}
function pileTop(t) { let n = 0; for (let i = 0; i < NBOX; i++) if (t > BOX_T(i) + 1.3) n = i + 1; const sl = S.slots[Math.min(n, S.slots.length - 1)]; return sl ? sl.clone() : PILE.clone(); }
function actionsAt(t) {
  const white = modeAt(t) === 'white';
  // red de datos
  Object.entries(S.nodes).forEach(([k, n]) => {
    const a = nodeA(k, t); n.m.visible = a > 0.01; n.m.material.opacity = a;
    n.m.position.copy(n.p).add(v3(0, 0.03 * Math.sin(t * 1.6 + n.p.x * 3), 0)); n.m.scale.setScalar(0.9 * (0.75 + 0.25 * eo(prog(t, n.t0, 0.35))));
    n.m.lookAt(cam.position);
  });
  S.cables.forEach(c => {
    const a = env(t, c.t0, NET_END, 0.05, 0.3);
    c.l.visible = a > 0.01; c.pulses.forEach(p => (p.visible = false));
    if (!c.l.visible) return;
    if (!c.pts.length) c.pts = cablePts(c);
    const arr = c.l.geometry.attributes.position.array; c.pts.forEach((q, i) => { arr[i * 3] = q.x; arr[i * 3 + 1] = q.y; arr[i * 3 + 2] = q.z; });
    c.l.geometry.attributes.position.needsUpdate = true;
    const draw = eio(prog(t, c.t0, 0.5)); c.l.geometry.setDrawRange(0, Math.max(2, Math.round(61 * draw)));
    c.l.material.opacity = 0.75 * a;
    if (draw >= 1) c.pulses.forEach((p, i) => { const u = ((t - c.t0) * 0.7 + i / 3) % 1; const k = u * 60, j = Math.min(59, Math.floor(k)); p.visible = true; p.position.copy(c.pts[j]).lerp(c.pts[j + 1], k - j); p.scale.setScalar(a * (0.8 + 0.6 * Math.sin(Math.PI * u))); });
  });
  // humo (parte blanca): se forma y el ojo lo disipa
  const sa = env(t, K.humo - 0.45, K.humo + 1.5, 0.4, 0.5);
  const clear = eio(prog(t, K.humo + 0.45, 1.0)), grow = 0.4 + 0.6 * eo(prog(t, K.humo - 0.45, 0.8));
  S.puffs.forEach((sp, i) => {
    sp.visible = sa > 0.01; if (!sp.visible) return;
    const a = i * 2.399, r = 0.15 + ((i * 0.618) % 1) * 0.75, h = (i * 0.37) % 1, out = 1 + 2.2 * clear;
    sp.position.set(Math.cos(a + t * 0.35) * r * grow * out, 1.7 + (h - 0.5) * 0.9 * grow + 0.06 * Math.sin(t * 1.3 + i) + clear * 0.7 * h, 1.7 + Math.sin(a) * 0.25 * grow);
    sp.scale.setScalar(1.5 * (0.55 + 0.4 * ((i * 0.29) % 1)) * grow * (1 + 0.5 * clear));
  });
  S.smokeMat.color.setHex(white ? 0x2a2a2a : 0xbbbbbb); S.smokeMat.opacity = 0.5 * sa * (1 - clear);
  // cinta y montaña de cajas
  const ba = env(t, K.interesa - 1.0, END - 1.2, 0.6, 0.5);
  S.belt.visible = ba > 0.01;
  if (S.belt.visible) {
    const drop = 1 - eo(prog(t, K.interesa - 1.0, 0.7));   // la cinta baja desde arriba
    S.belt.position.copy(BELT_A).add(BELT_B).multiplyScalar(0.5).add(v3(0.6 * drop, 3.5 * drop, 0));
    S.bandTex.offset.x = -t * 0.9;
    S.fat.forEach(l => l.material.color.setHex(0xd8d8d8));
  }
  S.boxes.forEach((b, i) => { const q = boxPose(i, t); b.m.visible = !!q && ba > 0.01; if (!q) return; b.m.position.copy(q.p); if (q.ride) b.m.quaternion.copy(S.belt.quaternion); else b.m.rotation.set(q.r.x, q.r.y, q.r.z); });
}

function frame(t) {
  const mode = modeAt(t); applyMode(mode);
  placePaper(t);
  // el folio desaparece al final
  const pa = Math.max(env(t, 2.6, K.ine + 1.15, 0.6, 0.7), env(t, K.solo - 0.2, K.pasando + 1.0, 0.6, 0.7));
  S.paper.visible = pa > 0.01; S.paper.material.transparent = pa < 0.999; S.paper.material.opacity = pa;
  S.paper.position.y = PAPER_Y - 1.4 * (1 - pa);
  figureAt(t);   // primero la figura: la cámara usa la posición actual de la lente
  cameraAt(t);
  marksAt(t);
  actionsAt(t);
  const dp = S.dust.geometry.attributes.position.array; for (let i = 0; i < dp.length / 3; i++) dp[i * 3 + 2] = ((dp[i * 3 + 2] + 22 + 0.012) % 26) - 22;
  S.dust.geometry.attributes.position.needsUpdate = true;
  S.follow.visible = t > K.sigueme - 0.2; const fa = eo(prog(t, K.sigueme - 0.2, 0.35)) * (1 - prog(t, END - 0.9, 0.4));
  S.follow.material.opacity = fa; const tap = prog(t, K.sigueme + 0.6, 0.25);
  S.follow.position.set(-0.45, 0.6, 1.7); S.follow.scale.setScalar(0.8 * (0.6 + 0.25 * eo(prog(t, K.sigueme - 0.2, 0.35))) * (1 - 0.08 * Math.sin(Math.PI * tap)));
  S.follow.lookAt(cam.position);
  return {
    white: ss(prog(t, NET_END - 0.3, 0.3)) * (1 - ss(prog(t, NET_END, 0.35))),
    black: Math.max(1 - ss(prog(t, 0, 0.3)), ss(prog(t, 23.85, 0.2)) * (1 - ss(prog(t, 24.05, 0.35))), ss(prog(t, END - 0.3, 0.3))),
    vig: mode === 'white' ? 0.08 : 0.4,
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
  ENV = await (await fetch('../env.json')).json();
  buildFigure(); buildPaper(); KEYS = readKeys(); buildObjects(); GK = buildGazeKeys();
  S.follow = followCard(); scene.add(S.follow);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
