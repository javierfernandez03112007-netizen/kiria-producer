// Reel «Cobertura y satélites» — motor 3D monocromo con interfaces de móvil. window.renderAt(t) dibuja el instante t.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { W, H, clamp, prog, lerp, eo, eio, ss, loglerp, ll, loadTopo, ringSegments, basicLines, fatLines, polySegments,
  textSprite, makeSatellite, makeHouse, mat, glowMat, box } from './lib.js';

// ---------------------------------------------------------------- tiempos (voz ajustada a 59,4 s)
const K = {
  sobre: 3.36, quin: 5.47, movil: 7.3, bajar: 11.54, tu: 12.42, cable: 13.96, ondas: 15.3, antena: 16.29, cada: 17.43,
  burbuja: 19.42, ciudad: 19.98, solapan: 21.61, desde: 22.12, fibra: 24.15, internet: 24.75, ms: 25.35, pero: 26.12,
  conecta: 27.53, ondas2: 28.29, rocas: 29.89, poner: 30.29, caro: 32.46, durante: 32.9, clasicos: 34.99, km36: 36.56,
  senal: 38.29, nota: 39.91, nuevos: 40.41, bajo: 41.66, cada2: 42.25, burb2: 43.62, mueve: 45.08, hoy: 45.78,
  sos: 47.98, satelite: 49.05, aunque: 49.74, cerca: 51.18, proxima: 51.57, mira: 53.63, donde: 54.57, like: 57.6,
};
const END = 60.0;
const GRANADA = [-3.6, 37.18];
const LEO = 1 + 500 / 6371, GEO = 1 + 35786 / 6371;

// ---------------------------------------------------------------- render base
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); document.body.appendChild(renderer.domElement);
const rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const mixMat = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, tB: { value: null }, mixAB: { value: 0 }, blur: { value: 0 }, white: { value: 0 }, black: { value: 0 }, vig: { value: 0.4 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `uniform sampler2D tA,tB; uniform float mixAB,blur,white,black,vig; varying vec2 vUv;
    void main(){ vec2 c=vec2(.5); vec3 a=vec3(0.), b=vec3(0.);
      for(int i=0;i<8;i++){ float s=1.0-blur*0.3*float(i)/7.0; vec2 uv=c+(vUv-c)*s; a+=texture2D(tA,uv).rgb; b+=texture2D(tB,uv).rgb; }
      vec3 col=mix(a,b,mixAB)/8.0; float l=dot(col,vec3(0.2126,0.7152,0.0722)); col=vec3(l);
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
const S = {}; window.S = S;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
function line(pts, color = 0xffffff, opacity = 0.8, dashed = false, dash = 0.18) {
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = dashed ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: dash, gapSize: dash * 0.7 })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const l = new THREE.Line(g, m); if (dashed) l.computeLineDistances();
  return l;
}
function circle(r, n = 128, color = 0xffffff, opacity = 0.8, dashed = false, dash = 0.18) {
  const pts = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; pts.push(v3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
  return line(pts, color, opacity, dashed, dash);
}
function label(str, o) { const s = textSprite(str, o); s.userData.base = s.scale.clone(); s.visible = false; return s; }
function show(sp, a, k = 1) {
  sp.visible = a > 0.003; sp.material.opacity = a;
  sp.scale.copy(sp.userData.base).multiplyScalar(k);
}
const pop = (t, t0) => 0.75 + 0.25 * eo(prog(t, t0, 0.35));
const env = (t, t0, t1, fi = 0.35, fo = 0.35) => (t < t0 || t > t1 ? 0 : Math.min(eo(prog(t, t0, fi)), 1 - prog(t, t1 - fo, fo)));
// cota técnica entre a y b (marcas y flechas); s = tamaño de las marcas
function cota(a, b, color = 0xffffff, s = 1) {
  const g = new THREE.Group();
  g.add(line([a, b], color, 0.9));
  const dir = b.clone().sub(a).normalize();
  const n = Math.abs(dir.y) > 0.9 ? v3(1, 0, 0) : v3(0, 1, 0);
  for (const p of [a, b]) g.add(line([p.clone().addScaledVector(n, -0.18 * s), p.clone().addScaledVector(n, 0.18 * s)], color, 0.9));
  for (const [p, k] of [[a, 1], [b, -1]]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.06 * s, 0.2 * s, 10), new THREE.MeshBasicMaterial({ color, transparent: true }));
    c.position.copy(p).addScaledVector(dir, 0.1 * s * k); c.quaternion.setFromUnitVectors(v3(0, 1, 0), dir.clone().multiplyScalar(-k)); g.add(c);
  }
  return g;
}
// coloca un sprite fijo en pantalla: x, y en [-1, 1], h = alto relativo a la pantalla
function hudPlace(sp, cam, x, y, h) {
  cam.updateMatrixWorld();
  const tn = Math.tan(cam.fov * Math.PI / 360), d = 0.05;
  const p = v3(x * tn * cam.aspect * d, y * tn * d, -d).applyMatrix4(cam.matrixWorld);
  sp.position.copy(p); sp.userData.base = sp.userData.base0 || (sp.userData.base0 = sp.scale.clone());
  const hh = 2 * tn * d * h; sp.userData.base = v3(hh * sp.userData.aspect, hh, 1);
}
function setOpacity(obj, a) {
  obj.traverse(o => { if (o.material) { o.material.transparent = true; if (o.userData.op === undefined) o.userData.op = o.material.opacity; o.material.opacity = o.userData.op * a; } });
  obj.visible = a > 0.003;
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; if (draw) draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { c }; return t; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// cámara mirando a un punto con un vector «arriba»
function aim(cam, p, l, up = v3(0, 1, 0)) { cam.position.copy(p); cam.up.copy(up); cam.lookAt(l); }
// recorrido de cámara por fotogramas clave [t, pos, mira] con curvas Catmull-Rom (sin paradas en cada clave)
function camPath(keys) {
  const P = new THREE.CatmullRomCurve3(keys.map(k => k[1]), false, 'centripetal');
  const L = new THREE.CatmullRomCurve3(keys.map(k => k[2]), false, 'centripetal');
  const n = keys.length - 1;
  return t => {
    let i = 0; while (i < n - 1 && t >= keys[i + 1][0]) i++;
    const u = clamp((t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]));
    const s = (i + u) / n;
    const ua = keys[i][3] || v3(0, 1, 0), ub = keys[i + 1][3] || v3(0, 1, 0);
    return { p: P.getPoint(s), l: L.getPoint(s), up: ua.clone().lerp(ub, ss(u)).normalize() };
  };
}
const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11);

// ---------------------------------------------------------------- móvil con pantalla dibujada en canvas
const SW = 640, SH = 1354;
function makePhone(tex, body = 0x101010) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new RoundedBoxGeometry(0.75, 1.52, 0.085, 5, 0.09), new THREE.MeshStandardMaterial({ color: body, roughness: 0.35, metalness: 0.6 }));
  g.add(b);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.69, 1.46), new THREE.MeshBasicMaterial({ map: tex, color: 0xe6e6e6, transparent: true }));
  scr.position.z = 0.0435; g.add(scr);
  const cam = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.26, 0.03, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.3, metalness: 0.7 }));
  cam.position.set(-0.19, 0.5, -0.05); g.add(cam);
  for (const [x, y] of [[-0.24, 0.55], [-0.14, 0.45]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 20), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 })); l.rotation.x = Math.PI / 2; l.position.set(x, y, -0.07); g.add(l); }
  g.userData.scr = scr;
  return g;
}

function bars(g, x, y, n, k = 1, a = 1) {
  for (let i = 0; i < 4; i++) { g.fillStyle = i < n ? `rgba(255,255,255,${a})` : 'rgba(255,255,255,.25)'; rr(g, x + i * 15 * k, y - (10 + i * 6) * k, 10 * k, (10 + i * 6) * k, 2.5 * k); g.fill(); }
}
function statusBar(g, n, tag) {
  g.fillStyle = '#fff'; g.font = '600 34px Inter'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText('10:24', 52, 70);
  bars(g, SW - 196, 68, n);
  g.font = '700 26px Inter'; g.textAlign = 'right'; g.fillText(tag, SW - 98, 66);
  g.strokeStyle = '#fff'; g.lineWidth = 2.5; rr(g, SW - 88, 46, 46, 24, 7); g.stroke(); g.fillStyle = '#fff'; rr(g, SW - 84, 50, 32, 16, 4); g.fill();
}
function bgGrad(g, a = '#1b1b1b', b = '#050505') { const gr = g.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, SW, SH); }
function satIcon(g, x, y, s, rot = -0.6) {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 3 * s;
  rr(g, -9 * s, -9 * s, 18 * s, 18 * s, 3 * s); g.fill();
  for (const k of [-1, 1]) { g.strokeRect(k > 0 ? 13 * s : -37 * s, -7 * s, 24 * s, 14 * s); g.beginPath(); g.moveTo(k * 9 * s, 0); g.lineTo(k * 13 * s, 0); g.stroke(); }
  g.restore();
}

// modos de pantalla: lock, radio, monte, sos
function drawScreen(tex, mode, tl, opt = {}) {
  const c = tex.userData.c, g = c.getContext('2d');
  g.save(); g.clearRect(0, 0, SW, SH); rr(g, 0, 0, SW, SH, 70); g.clip();
  g.textBaseline = 'alphabetic';
  if (mode === 'lock') {
    bgGrad(g, '#262626', '#030303');
    for (let i = 0; i < 70; i++) { const x = (i * 97.3) % SW, y = (i * 211.7) % (SH * 0.6); g.fillStyle = `rgba(255,255,255,${0.15 + (i % 5) * 0.08})`; g.fillRect(x, y, 2, 2); }
    statusBar(g, 4, '5G');
    g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = '600 34px Inter'; g.fillText('sábado, 18 de octubre', SW / 2, 230);
    g.font = '800 190px Inter'; g.fillText('10:24', SW / 2, 420);
    // notificación
    const ny = 900 + 60 * (1 - eo(clamp(tl / 0.5))); const na = clamp(tl / 0.4);
    g.globalAlpha = na; g.fillStyle = 'rgba(70,70,70,.72)'; rr(g, 34, ny, SW - 68, 170, 40); g.fill();
    g.fillStyle = '#fff'; rr(g, 62, ny + 36, 98, 98, 24); g.fill();
    g.fillStyle = '#000'; g.font = '900 64px Inter'; g.fillText('k', 111, ny + 108);
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = '700 32px Inter'; g.fillText('kiria.ai', 184, ny + 68);
    g.font = '500 30px Inter'; g.fillStyle = '#e6e6e6'; g.fillText('Satélites sobre ti ahora mismo', 184, ny + 112);
    g.font = '500 26px Inter'; g.fillStyle = '#aaa'; g.textAlign = 'right'; g.fillText('ahora', SW - 64, ny + 66);
    satIcon(g, SW - 110, ny + 140, 0.8);
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,255,255,.85)'; rr(g, SW / 2 - 110, SH - 42, 220, 10, 5); g.fill();
  } else if (mode === 'radio') {
    bgGrad(g, '#202020', '#060606');
    statusBar(g, 4, '5G');
    const cx = SW / 2, cy = 560;
    for (let k = 0; k < 4; k++) {
      const f = ((tl * 0.9 + k / 4) % 1);
      g.strokeStyle = `rgba(255,255,255,${(1 - f) * 0.9})`; g.lineWidth = 10;
      g.beginPath(); g.arc(cx, cy, 60 + f * 230, -Math.PI * 0.8, -Math.PI * 0.2); g.stroke();
    }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, 34, 0, Math.PI * 2); g.fill();
    g.textAlign = 'center'; g.font = '800 58px Inter'; g.fillText('Conectado', cx, 760);
    g.font = '500 34px Inter'; g.fillStyle = '#bbb'; g.fillText('Antena más cercana', cx, 816);
    g.fillStyle = 'rgba(255,255,255,.1)'; rr(g, 60, 900, SW - 120, 150, 36); g.fill();
    g.fillStyle = '#fff'; g.font = '600 32px Inter'; g.textAlign = 'left'; g.fillText('Ondas de radio', 100, 965);
    g.font = '500 28px Inter'; g.fillStyle = '#aaa'; g.fillText('sin cables entre tú y la antena', 100, 1010);
    bars(g, SW - 170, 1000, 4, 2.2);
  } else if (mode === 'monte') {
    const lost = opt.lost || 0;   // 0..1 la señal cae
    bgGrad(g, '#1e1e1e', '#040404');
    const n = Math.max(0, Math.round(4 * (1 - lost)));
    statusBar(g, n, n ? '4G' : '');
    // mapa topográfico
    g.save(); g.translate(SW / 2, 560);
    for (let k = 1; k < 9; k++) { g.strokeStyle = `rgba(255,255,255,${0.1 + k * 0.02})`; g.lineWidth = 3; g.beginPath(); for (let a = 0; a <= 64; a++) { const an = a / 64 * Math.PI * 2; const r = k * 32 * (1 + 0.18 * Math.sin(an * 3 + k) + 0.08 * Math.cos(an * 5)); a ? g.lineTo(Math.cos(an) * r * 1.2, Math.sin(an) * r) : g.moveTo(Math.cos(an) * r * 1.2, Math.sin(an) * r); } g.closePath(); g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(70, 60, 16, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 4; g.beginPath(); g.arc(70, 60, 30 + 16 * Math.sin(tl * 5), 0, Math.PI * 2); g.stroke();
    g.restore();
    g.textAlign = 'center';
    if (lost > 0.75) {
      const a = clamp((lost - 0.75) / 0.25);
      g.globalAlpha = a; g.fillStyle = 'rgba(255,255,255,.12)'; rr(g, 50, 900, SW - 100, 230, 40); g.fill();
      bars(g, SW / 2 - 50, 1000, 0, 2.6);
      g.strokeStyle = '#fff'; g.lineWidth = 9; g.beginPath(); g.moveTo(SW / 2 - 60, 935); g.lineTo(SW / 2 + 60, 1010); g.stroke();
      g.fillStyle = '#fff'; g.font = '800 54px Inter'; g.fillText('Sin servicio', SW / 2, 1085); g.globalAlpha = 1;
    } else {
      g.fillStyle = '#fff'; g.font = '700 44px Inter'; g.fillText('Sierra · 2.100 m', SW / 2, 960);
      g.font = '500 30px Inter'; g.fillStyle = '#aaa'; g.fillText('EJEMPLO', SW / 2, 1010);
    }
  } else if (mode === 'sos') {
    bgGrad(g, '#232323', '#050505');
    statusBar(g, 0, 'SOS');
    satIcon(g, SW - 240, 58, 0.55);
    g.textAlign = 'center'; g.fillStyle = '#fff';
    g.font = '800 54px Inter'; g.fillText('SOS vía satélite', SW / 2, 200);
    const step = opt.step || 0;   // 0 apunta, 1 conectado, 2 enviando, 3 enviado
    const cx = SW / 2, cy = 560, R = 210;
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 4;
    for (const r of [R, R * 0.66, R * 0.33]) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    const sa = opt.satAng || 0, sr = (opt.satR === undefined ? 0.8 : opt.satR) * R;
    const sx = cx + Math.cos(sa) * sr, sy = cy + Math.sin(sa) * sr;
    satIcon(g, sx, sy, 1.3, sa);
    if (step >= 1) { g.strokeStyle = '#fff'; g.lineWidth = 6; g.setLineDash([14, 12]); g.beginPath(); g.moveTo(cx, cy); g.lineTo(sx, sy); g.stroke(); g.setLineDash([]); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, 18, 0, Math.PI * 2); g.fill();
    if (step === 0) { // flecha guía
      const ang = Math.atan2(sy - cy, sx - cx);
      g.save(); g.translate(cx, cy); g.rotate(ang); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(130, 0); g.lineTo(80, -30); g.lineTo(80, 30); g.closePath(); g.fill(); g.restore();
    }
    const msg = ['Apunta el móvil al satélite', 'Conectado al satélite', 'Enviando mensaje…', 'Mensaje enviado'][step];
    g.font = '700 42px Inter'; g.fillText(msg, cx, 870);
    g.fillStyle = 'rgba(255,255,255,.12)'; rr(g, 60, 940, SW - 120, 200, 36); g.fill();
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = '600 30px Inter'; g.fillText('Emergencia · necesito ayuda', 100, 1000);
    g.font = '500 26px Inter'; g.fillStyle = '#aaa'; g.fillText('Ubicación: 37,05° N · 3,31° O (EJEMPLO)', 100, 1045);
    const pr = step >= 3 ? 1 : step === 2 ? (opt.pr || 0) : 0;
    g.fillStyle = 'rgba(255,255,255,.2)'; rr(g, 100, 1080, SW - 200, 14, 7); g.fill();
    g.fillStyle = '#fff'; rr(g, 100, 1080, (SW - 200) * pr, 14, 7); g.fill();
    if (step >= 3) { g.strokeStyle = '#fff'; g.lineWidth = 10; g.beginPath(); g.moveTo(cx - 40, 1210); g.lineTo(cx - 8, 1242); g.lineTo(cx + 50, 1180); g.stroke(); }
  }
  g.restore();
  tex.needsUpdate = true;
}

// ---------------------------------------------------------------- A · habitación (gancho y bucle)
const room = new THREE.Scene(); room.background = new THREE.Color(0x030303); room.fog = new THREE.Fog(0x030303, 2.5, 7);
const roomCam = new THREE.PerspectiveCamera(40, W / H, 0.005, 30);
function buildRoom() {
  const shell = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 5), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1, side: THREE.BackSide }));
  shell.position.y = 1.3; room.add(shell);
  const wood = canvasTex(1024, 512, (g, w, h) => { g.fillStyle = '#262626'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const y = rnd() * h; g.strokeStyle = `rgba(10,10,10,${0.2 + rnd() * 0.3})`; g.lineWidth = 1 + rnd() * 3; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 40) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 4); g.stroke(); } });
  room.add(box(1.6, 0.04, 0.9, new THREE.MeshStandardMaterial({ map: wood, roughness: 0.85 }), 0, 0.75, 0));
  const legM = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.3, metalness: 0.8 });
  [[-0.75, -0.4], [0.75, -0.4], [-0.75, 0.4], [0.75, 0.4]].forEach(([x, z]) => room.add(box(0.04, 0.73, 0.04, legM, x, 0.365, z)));
  S.lockTex = canvasTex(SW, SH);
  const ph = makePhone(S.lockTex); ph.scale.setScalar(0.1); ph.rotation.set(-Math.PI / 2, 0, 0.22); ph.position.set(0.05, 0.775, 0.05); room.add(ph); S.roomPhone = ph;
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.1, 24), new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.4 })); cup.position.set(-0.32, 0.82, -0.14); room.add(cup);
  room.add(box(0.21, 0.015, 0.29, new THREE.MeshStandardMaterial({ color: 0xbdbdbd, roughness: 0.9 }), 0.38, 0.778, -0.1));
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.14, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, side: THREE.DoubleSide }));
  lampShade.position.set(0, 2.2, 0); room.add(lampShade);
  room.add(line([v3(0, 2.27, 0), v3(0, 2.6, 0)], 0x666666, 1));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), glowMat(0x9a9a9a)); bulb.position.set(0, 2.17, 0); room.add(bulb);
  room.add(new THREE.HemisphereLight(0x777777, 0x111111, 0.25));
  const glow = new THREE.PointLight(0xffffff, 0.35, 1.2, 1.6); glow.position.set(0.05, 1.0, 0.05); room.add(glow);
  const lamp = new THREE.PointLight(0xffffff, 1.4, 4, 1.4); lamp.position.set(0, 2.05, 0); room.add(lamp);
  // ventana con luz de luna
  room.add(box(1.4, 1.0, 0.02, new THREE.MeshBasicMaterial({ color: 0x1f1f1f }), -0.6, 1.6, -2.48));
}
// recorrido del gancho: u = 0 pantalla en primer plano, u = 1 pegado al techo mirando arriba
function roomPose(u) {
  const ph = S.roomPhone; ph.updateMatrixWorld();
  const o = ph.localToWorld(v3(0, 0, 0)), pu = ph.localToWorld(v3(0, 1, 0)).sub(o).normalize();
  const scr = ph.localToWorld(v3(0.02, 0.12, 0.05));
  const k = eio(u);
  const p = ph.position.clone().add(v3(0, 0.245, 0)).lerp(scr.clone().add(v3(0, 0.003, 0)), k);
  const up = pu.clone().applyAxisAngle(v3(0, 1, 0), -0.7 * k);
  aim(roomCam, p, p.clone().add(v3(0, -1, 0)).lerp(scr, 0).setY(p.y - 1), up);
}

// ---------------------------------------------------------------- B · espacio
const space = new THREE.Scene(); space.background = new THREE.Color(0x000000);
const spaceCam = new THREE.PerspectiveCamera(40, W / H, 0.00002, 400); window.spaceCam = spaceCam;
const G = ll(...GRANADA).normalize();
const EAST = v3(0, 1, 0).cross(G).normalize(), NORTH = G.clone().cross(EAST).normalize();
const N_PL = 44, N_PER = 56;
function buildSpace(c50) {
  space.add(new THREE.AmbientLight(0xffffff, 0.3));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-4, 3, 6); space.add(sun);
  const ocean = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.-max(dot(vN,vV),0.),3.); gl_FragColor=vec4(vec3(0.006)+vec3(0.2)*f,1.); }',
  }));
  space.add(ocean);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.05, 96, 64), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f=pow(max(dot(vN,vV),0.),5.); gl_FragColor=vec4(vec3(0.3)*f,f); }',
  }));
  space.add(halo); S.halo = halo;
  space.add(basicLines(ringSegments(c50, 1.0006), 0xffffff, 0.5));
  S.spainLine = fatLines(ringSegments(c50, 1.0009, n => n === 'Spain'), 0xffffff, 2.2, 0.9); space.add(S.spainLine);
  const gr = [];
  for (let lo = -180; lo < 180; lo += 15) for (let la = -80; la < 80; la += 2) { const a = ll(lo, la, 1.0004), b = ll(lo, la + 2, 1.0004); gr.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  for (let la = -75; la <= 75; la += 15) for (let lo = -180; lo < 180; lo += 2) { const a = ll(lo, la, 1.0004), b = ll(lo + 2, la, 1.0004); gr.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  space.add(basicLines(new Float32Array(gr), 0xffffff, 0.07));
  // luces de ciudades (aprox.) y Granada
  const cities = [[-3.7, 40.42], [2.17, 41.39], [-0.38, 39.47], [-5.98, 37.39], [-2.93, 43.26], [-4.42, 36.72], [-0.88, 41.65], [-9.14, 38.72], [-8.61, 41.15], [-1.13, 37.99], [-8.4, 43.37], [-4.78, 37.89], [-5.66, 40.97], [-4.72, 41.65], [2.35, 48.86], [-0.58, 44.84], [5.37, 43.3], [-7.6, 33.57], [3.06, 36.75], [12.5, 41.9], [9.19, 45.46], [-6.84, 34.02]];
  const cp = []; for (const c of cities) { for (let k = 0; k < 14; k++) { const p = ll(c[0] + (rnd() - 0.5) * 0.5, c[1] + (rnd() - 0.5) * 0.4, 1.0012); cp.push(p.x, p.y, p.z); } }
  space.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.9 })));
  const gsp = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,255,255,.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  gsp.position.copy(G.clone().multiplyScalar(1.0015)); gsp.scale.setScalar(0.012); space.add(gsp); S.gGlow = gsp;
  // estrellas
  const st = []; for (let i = 0; i < 5000; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(150 + rnd() * 100); st.push(v.x, v.y, v.z); }
  space.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(st, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0.75 })));
  // constelación en órbita baja (planos inclinados 53°)
  const cn = new Float32Array(N_PL * N_PER * 3);
  S.const = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(cn, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 2.6, sizeAttenuation: false, transparent: true, opacity: 0.95 }));
  space.add(S.const); S.const.frustumCulled = false;
  // trenes de satélites sobre Granada (lo que se ve al mirar al cielo)
  S.trains = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(10 * 30 * 3), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 4.6, sizeAttenuation: false, transparent: true, opacity: 1 }));
  S.trains.frustumCulled = false; space.add(S.trains);
  // satélites protagonistas (gancho): pasan muy cerca de la cámara
  S.heroes = [];
  for (let i = 0; i < 5; i++) { const s = makeSatellite(); s.scale.setScalar(0.0011 + 0.0003 * (i % 2)); space.add(s); S.heroes.push(s); }
  // satélites de órbita baja con su burbuja (cono) de cobertura
  S.leo = [];
  const coneMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { k: { value: 1 } },
    vertexShader: 'varying float vY; void main(){ vY=uv.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float k; varying float vY; void main(){ gl_FragColor=vec4(vec3(1.), (0.02+0.1*vY*vY)*k); }' });
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group(); space.add(g);
    const s = makeSatellite(); s.scale.setScalar(0.0022); g.add(s);
    const h = LEO - 1, R = 0.055;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(R, h, 64, 1, true), coneMat()); cone.position.y = -h / 2; g.add(cone);
    const foot = circle(R, 96, 0xffffff, 0.95); foot.position.y = -h + 0.0005; g.add(foot);
    const foot2 = circle(R * 0.6, 96, 0xffffff, 0.35, true, 0.004); foot2.position.y = -h + 0.0005; g.add(foot2);
    S.leo.push({ g, s, cone });
  }
  // haz a un móvil (gancho)
  S.beam = fatLines(new Float32Array([0, 0, 0, 0, 1, 0]), 0xffffff, 3, 0.95); S.beam.frustumCulled = false; space.add(S.beam);
  S.pingTex = canvasTex(SW, SH);
  S.miniPhone = makePhone(S.pingTex); S.miniPhone.scale.setScalar(0.009); space.add(S.miniPhone);
  S.ring = circle(1, 96, 0xffffff, 0.9); space.add(S.ring);
  // cota de 500 km y etiquetas
  S.cota500 = cota(v3(0, 1, 0), v3(0, LEO, 0), 0xffffff, 0.03); space.add(S.cota500);
  S.t500 = label('≈ 500 km', { size: 110, weight: 800, height: 0.07 }); space.add(S.t500);
  // órbita geoestacionaria
  const A = ll(GRANADA[0], 0).normalize(); S.A = A;
  const geoRing = []; for (let i = 0; i <= 256; i++) { const a = i / 256 * Math.PI * 2; geoRing.push(v3(Math.cos(a) * GEO, 0, Math.sin(a) * GEO)); }
  S.geoRing = line(geoRing, 0xffffff, 0.5, true, 0.12); space.add(S.geoRing);
  S.geo = makeSatellite(); S.geo.scale.setScalar(0.3); S.geo.position.copy(A.clone().multiplyScalar(GEO)); S.geo.lookAt(0, 0, 0); space.add(S.geo);
  const side = A.clone().cross(v3(0, 1, 0)).normalize();
  S.geoSide = side;
  S.cota36 = cota(A.clone().multiplyScalar(1.02).addScaledVector(side, 1.4), A.clone().multiplyScalar(GEO - 0.05).addScaledVector(side, 1.4), 0xffffff, 1.2); space.add(S.cota36);
  S.t36 = label('≈ 36.000 km', { size: 110, weight: 800, height: 0.5 }); S.t36.position.copy(A.clone().multiplyScalar(4.4).addScaledVector(side, -1.8)); space.add(S.t36);
  S.tRT = label('ida y vuelta ≈ 0,5 s', { size: 90, weight: 700, height: 0.36, font: 'Mono' }); space.add(S.tRT);
  S.pulse = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 14), glowMat()); space.add(S.pulse);
  S.pulseTrail = line([v3(0, 0, 0), v3(0, 1, 0)], 0xffffff, 0.6, true, 0.1); S.pulseTrail.frustumCulled = false; space.add(S.pulseTrail);
  S.t70 = label('más de 60 veces más cerca', { size: 100, weight: 800, height: 0.05 }); space.add(S.t70);
  // cohete
  S.rocketS = makeRocket(); S.rocketS.scale.setScalar(0.0009); space.add(S.rocketS);
  S.plumeS = makePlume(0.0009); space.add(S.plumeS.pts);
}

function updateTrains(time) {
  const a = S.trains.geometry.attributes.position.array; let k = 0;
  for (let tr = 0; tr < 10; tr++) {
    const an = tr * 0.63 + 0.2, d = EAST.clone().multiplyScalar(Math.cos(an)).addScaledVector(NORTH, Math.sin(an));
    const n = G.clone().cross(d).normalize();
    const off = (tr - 4.5) * 0.005;
    for (let j = 0; j < 30; j++) {
      const s = ((j * 0.0028 + time * (0.006 + 0.0015 * (tr % 3)) + tr * 0.037) % 0.16) - 0.08;
      const p = G.clone().addScaledVector(NORTH, 0.012).addScaledVector(d, s).addScaledVector(n, off).normalize().multiplyScalar(LEO + 0.002 * (tr % 4));
      a[k++] = p.x; a[k++] = p.y; a[k++] = p.z;
    }
  }
  S.trains.geometry.attributes.position.needsUpdate = true;
}
function updateConstellation(time) {
  updateTrains(time);
  const a = S.const.geometry.attributes.position.array;
  const inc = 53 * Math.PI / 180, ci = Math.cos(inc), si = Math.sin(inc);
  let k = 0;
  for (let p = 0; p < N_PL; p++) {
    const raan = p / N_PL * Math.PI * 2, cr = Math.cos(raan), sr = Math.sin(raan);
    for (let j = 0; j < N_PER; j++) {
      const u = j / N_PER * Math.PI * 2 + p * 0.37 + time * 0.05;
      const x = Math.cos(u) * LEO, y0 = Math.sin(u) * LEO;
      const y = y0 * ci, z = y0 * si;           // inclinación (eje x)
      a[k++] = x * cr + z * sr; a[k++] = y; a[k++] = -x * sr + z * cr;   // giro del nodo (eje y)
    }
  }
  S.const.geometry.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------- cohete
function makeRocket() {
  const g = new THREE.Group();
  const fill = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
  const edge = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const part = (geo, y) => { const m = new THREE.Mesh(geo, fill); m.position.y = y; m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), edge)); g.add(m); return m; };
  part(new THREE.CylinderGeometry(1, 1, 14, 24, 4), 7);
  part(new THREE.CylinderGeometry(1.0, 1.0, 4, 24, 1), 16);
  part(new THREE.ConeGeometry(1.0, 3.6, 24, 2), 19.8);
  part(new THREE.CylinderGeometry(0.75, 1.0, 1.2, 24, 1), -0.6);
  for (let i = 0; i < 4; i++) { const f = part(new THREE.BoxGeometry(0.12, 3, 1.6), 1.5); f.rotation.y = i * Math.PI / 2; f.position.x = Math.cos(i * Math.PI / 2) * 1.5; f.position.z = -Math.sin(i * Math.PI / 2) * 1.5; f.rotation.y = i * Math.PI / 2 + Math.PI / 2; }
  for (const y of [3, 9, 14]) { const r = circle(1.01, 48, 0xffffff, 0.5); r.position.y = y; g.add(r); }
  return g;
}
function makePlume(scale, n = 700) {
  const pos = new Float32Array(n * 3);
  const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 5, sizeAttenuation: false, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  pts.frustumCulled = false;
  return { pts, n, scale };
}
// partículas de escape: base del cohete en «base», hacia abajo «down» (unitario), dispersión con «spread»
function updatePlume(pl, base, down, t, len = 30, spread = 0.35, ground = null) {
  const a = pl.pts.geometry.attributes.position.array;
  const s = pl.scale;
  const e1 = Math.abs(down.y) < 0.9 ? v3(0, 1, 0).cross(down).normalize() : v3(1, 0, 0).cross(down).normalize();
  const e2 = down.clone().cross(e1).normalize();
  for (let i = 0; i < pl.n; i++) {
    const life = 0.9, ph = (i * 0.618) % 1;
    const age = ((t / life + ph) % 1);
    const r = Math.sqrt((i * 0.377) % 1), an = i * 2.399;
    const d = age * len * s;
    let off = spread * d * r + 0.6 * s * r;
    let p = base.clone().addScaledVector(down, d).addScaledVector(e1, Math.cos(an) * off).addScaledVector(e2, Math.sin(an) * off);
    if (ground !== null && p.y < ground) { const over = ground - p.y; p.y = ground + over * 0.15; p.addScaledVector(e1, Math.cos(an) * over * 1.6).addScaledVector(e2, Math.sin(an) * over * 1.6); }
    a[i * 3] = p.x; a[i * 3 + 1] = p.y; a[i * 3 + 2] = p.z;
  }
  pl.pts.geometry.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------- C · suelo blanco: móvil, antena, burbujas, ciudad y fibra
const ground = new THREE.Scene(); ground.background = new THREE.Color(0xffffff); ground.fog = new THREE.Fog(0xffffff, 90, 260);
const groundCam = new THREE.PerspectiveCamera(42, W / H, 0.05, 600);
const ANT = v3(16, 0, -10);
const DC = v3(78, 0, -104);
function makeTower(h = 10, color = 0x111111) {
  const g = new THREE.Group(); const P = [];
  const w0 = 1.3, w1 = 0.35; const corners = (y) => { const w = lerp(w0, w1, y / h); return [v3(-w, y, -w), v3(w, y, -w), v3(w, y, w), v3(-w, y, w)]; };
  const levels = 8;
  for (let l = 0; l < levels; l++) {
    const a = corners(l * h / levels), b = corners((l + 1) * h / levels);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; P.push(a[i], b[i], b[i], b[j], a[i], b[j], a[j], b[i]); }
  }
  const geo = new THREE.BufferGeometry().setFromPoints(P);
  g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })));
  for (let i = 0; i < 3; i++) {
    const pn = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.6, 0.12), new THREE.MeshLambertMaterial({ color: 0xf4f4f4 }));
    const an = i * Math.PI * 2 / 3; pn.position.set(Math.cos(an) * 0.6, h - 0.6, Math.sin(an) * 0.6); pn.rotation.y = -an + Math.PI / 2;
    pn.add(new THREE.LineSegments(new THREE.EdgesGeometry(pn.geometry), new THREE.LineBasicMaterial({ color }))); g.add(pn);
  }
  g.add(line([v3(0, h, 0), v3(0, h + 1.6, 0)], color, 1));
  return g;
}
function makeDome(R, color = 0x111111) {
  const g = new THREE.Group();
  for (let k = 1; k <= 5; k++) { const a = k / 6 * Math.PI / 2; const c = circle(R * Math.cos(a), 96, color, 0.55); c.position.y = R * Math.sin(a); g.add(c); }
  const base = circle(R, 128, color, 0.95); base.position.y = 0.05; g.add(base);
  for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2; const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; pts.push(v3(Math.cos(an) * Math.cos(a) * R, Math.sin(a) * R, Math.sin(an) * Math.cos(a) * R)); } g.add(line(pts, color, 0.4)); }
  const fill = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide }));
  g.add(fill);
  return g;
}
function buildGround() {
  ground.add(new THREE.HemisphereLight(0xffffff, 0xbdbdbd, 1.25));
  const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(-30, 60, 40); ground.add(dl);
  const grid = new THREE.GridHelper(800, 200, 0xd2d2d2, 0xe9e9e9); grid.position.set(40, 0.01, -60); ground.add(grid);
  // móvil protagonista
  S.radioTex = canvasTex(SW, SH);
  const ph = makePhone(S.radioTex, 0x0d0d0d); ph.scale.setScalar(2); ph.position.set(0, 2.1, 0); ph.rotation.y = 0.35; ground.add(ph); S.gPhone = ph;
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(0,0,0,.35)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.02, 0); sh.scale.set(1, 0.6, 1); ground.add(sh);
  // cable que se corta
  const c0 = v3(0, 0.6, 0), plug = v3(0.05, 0.62, 0.1);
  S.cableA = line(new THREE.CatmullRomCurve3([v3(0.0, 0.58, 0.03), v3(0.1, 0.25, 0.4), v3(0.6, 0.03, 1.4), v3(1.6, 0.03, 2.0)]).getPoints(40), 0x111111, 1); ground.add(S.cableA);
  S.cableB = line(new THREE.CatmullRomCurve3([v3(1.9, 0.03, 2.15), v3(3.0, 0.03, 2.5), v3(4.2, 0.03, 2.4)]).getPoints(30), 0x111111, 1); ground.add(S.cableB);
  S.cross = label('✕', { size: 160, weight: 900, color: '#111111', height: 0.8 }); S.cross.position.set(1.75, 0.6, 2.1); ground.add(S.cross);
  void c0; void plug;
  // antena principal
  const tw = makeTower(10); tw.position.copy(ANT); ground.add(tw); S.tower = tw;
  S.tAnt = label('ANTENA', { size: 90, weight: 800, color: '#111111', height: 1.7, spacing: 0.12 }); S.tAnt.position.copy(ANT).add(v3(0, 13.2, 0)); ground.add(S.tAnt);
  // ondas de radio: anillos que viajan del móvil a la antena
  S.waves = [];
  for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 96), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true })); ground.add(r); S.waves.push(r); }
  // burbuja principal y ciudad
  S.dome = makeDome(14); S.dome.position.copy(ANT); ground.add(S.dome);
  S.city = new THREE.Group(); ground.add(S.city);
  const bm = new THREE.MeshBasicMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const em = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.7 });
  S.antennas = [v3(-28, 0, -40), v3(8, 0, -58), v3(44, 0, -36), v3(52, 0, -78), v3(-6, 0, -92), v3(30, 0, -110), v3(-40, 0, -78), v3(70, 0, -10)];
  const avoid = [ANT, ...S.antennas, DC];
  const nearFiber = (x, z) => (Math.abs(x - 16) < 7 && z < -4 && z > -66) || (Math.abs(z + 60) < 7 && x > 10 && x < 34) || (Math.abs(x - 28) < 7 && z < -54 && z > -110) || (Math.abs(z + 104) < 7 && x > 22 && x < 80);
  for (let i = 0; i < 170; i++) {
    const x = -80 + rnd() * 190, z = -150 + rnd() * 160;
    if (Math.hypot(x, z) < 14) continue;
    if (avoid.some(a => Math.hypot(a.x - x, a.z - z) < 8) || Math.hypot(DC.x - x, DC.z - z) < 20 || nearFiber(x, z)) continue;
    const w = 3 + rnd() * 4, d = 3 + rnd() * 4, h = 1.5 + Math.pow(rnd(), 2.5) * 11;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bm); b.position.set(x, h / 2, z);
    b.add(new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry), em)); S.city.add(b);
  }
  S.domes = S.antennas.map((p, i) => { const t = makeTower(7.5); t.position.copy(p); ground.add(t); const d = makeDome(14 + (i % 3) * 3); d.position.copy(p); ground.add(d); return { t, d }; });
  // fibra hasta internet
  const fp = [ANT.clone().add(v3(0, 0.1, 0)), v3(16, 0.1, -60), v3(28, 0.1, -60), v3(28, 0.1, -104), DC.clone().add(v3(-6, 0.1, 0))];
  const fpts = []; for (let i = 0; i + 1 < fp.length; i++) for (let k = 0; k < 40; k++) fpts.push(fp[i].clone().lerp(fp[i + 1], k / 40)); fpts.push(fp[fp.length - 1]);
  S.fiberPts = fpts;
  S.fiber = fatLines(polySegments(fpts), 0x111111, 5, 1); ground.add(S.fiber);
  S.pulses = []; for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshBasicMaterial({ color: 0x000000 })); ground.add(m); S.pulses.push(m); }
  const dc = new THREE.Mesh(new THREE.BoxGeometry(12, 9, 8), new THREE.MeshBasicMaterial({ color: 0x0a0a0a })); dc.position.copy(DC).add(v3(0, 4.5, 0)); ground.add(dc); S.dc = dc;
  dc.add(new THREE.LineSegments(new THREE.EdgesGeometry(dc.geometry), new THREE.LineBasicMaterial({ color: 0x555555 })));
  for (let i = 0; i < 5; i++) dc.add(box(10, 0.12, 0.05, new THREE.MeshBasicMaterial({ color: 0x3a3a3a }), 0, -3 + i * 1.6, 4.03));
  S.tNet = label('INTERNET', { size: 90, weight: 900, color: '#111111', height: 3.2, spacing: 0.1 }); S.tNet.position.copy(DC).add(v3(0, 12.5, 0)); ground.add(S.tNet);
  S.tFib = label('FIBRA', { size: 90, weight: 800, color: '#111111', height: 2.4, spacing: 0.14 }); S.tFib.position.set(22, 4, -60); ground.add(S.tFib);
}
const groundPath = camPath([
  [12.35, v3(1.3, 2.5, 5.8), v3(0.05, 2.1, 0)],
  [13.6, v3(-1.0, 2.1, 8.2), v3(0.4, 1.4, 0.6)],
  [15.0, v3(1.0, 3.0, 12.5), v3(4.5, 2.6, -2)],
  [16.4, v3(4, 5.0, 19), v3(10, 5, -6)],
  [17.8, v3(5, 9, 30), v3(14, 5, -9)],
  [19.4, v3(2, 20, 44), v3(16, 3, -12)],
  [21.0, v3(-14, 50, 50), v3(18, 0, -44)],
  [22.6, v3(-8, 58, 40), v3(24, 0, -56)],
  [24.0, v3(18, 46, 6), v3(44, 0, -84)],
  [25.3, v3(56, 22, -64), v3(76, 5, -100)],
  [26.3, v3(77.2, 4.6, -99.6), v3(78, 4.6, -104)],
]);

// ---------------------------------------------------------------- D · montaña nocturna
const mount = new THREE.Scene(); mount.background = new THREE.Color(0x000000); mount.fog = new THREE.Fog(0x000000, 160, 620);
const mountCam = new THREE.PerspectiveCamera(42, W / H, 0.02, 3000);
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi; const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf); return lerp(lerp(hash(xi, zi), hash(xi + 1, zi), u), lerp(hash(xi, zi + 1), hash(xi + 1, zi + 1), u), v); }
function fbm(x, z) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 5; i++) { s += a * (1 - Math.abs(vnoise(x * f, z * f) * 2 - 1)); a *= 0.5; f *= 2.03; } return s; }
function terrainH(x, z) {
  const ridge = 92 * Math.exp(-((x + 60) ** 2) / (2 * 38 ** 2)) * (0.72 + 0.28 * Math.cos(z * 0.011)) * Math.exp(-(z * z) / (2 * 150 ** 2));
  const peak = 45 * Math.exp(-(((x + 64) ** 2 + (z + 10) ** 2) / (2 * 26 ** 2)));
  const back = 80 * Math.exp(-((x - 170) ** 2) / (2 * 45 ** 2)) * (0.6 + 0.4 * Math.sin(z * 0.013 + 1)) + 90 * Math.exp(-((z + 260) ** 2) / (2 * 70 ** 2));
  const base = ridge + peak + back;
  const n = fbm(x * 0.011 + 3, z * 0.011) * 36 - 14;
  return Math.max(0, base + n * (0.35 + 0.65 * clamp(base / 60)));
}
const PH = v3(22, 0, 8); // sitio del móvil (valle tras la cresta)
const TOWN = v3(-185, 0, 10);
const PAD = v3(120, 0, -70);
function buildMount() {
  const N = 180, SZ = 900;
  const geo = new THREE.PlaneGeometry(SZ, SZ, N, N); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, terrainH(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x030303, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  mount.add(fill);
  const P = []; const st = SZ / N;
  for (let j = 0; j <= N; j += 1) for (let i = 0; i < N; i++) {
    const x0 = -SZ / 2 + i * st, x1 = x0 + st, z = -SZ / 2 + j * st;
    P.push(x0, terrainH(x0, z) + 0.05, z, x1, terrainH(x1, z) + 0.05, z);
    const x = -SZ / 2 + j * st, z0 = -SZ / 2 + i * st, z1 = z0 + st;
    P.push(x, terrainH(x, z0) + 0.05, z0, x, terrainH(x, z1) + 0.05, z1);
  }
  const wl = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(P, 3)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 }));
  mount.add(wl);
  // curvas de nivel brillantes cada 20 m
  const C = [];
  for (let lv = 20; lv < 200; lv += 20) {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = -SZ / 2 + i * st, z = -SZ / 2 + j * st;
      const h00 = terrainH(x, z) - lv, h10 = terrainH(x + st, z) - lv, h01 = terrainH(x, z + st) - lv, h11 = terrainH(x + st, z + st) - lv;
      const e = []; const cut = (a, b, pa, pb) => { if ((a > 0) !== (b > 0)) { const f = a / (a - b); e.push([pa[0] + (pb[0] - pa[0]) * f, pa[1] + (pb[1] - pa[1]) * f]); } };
      cut(h00, h10, [x, z], [x + st, z]); cut(h10, h11, [x + st, z], [x + st, z + st]); cut(h11, h01, [x + st, z + st], [x, z + st]); cut(h01, h00, [x, z + st], [x, z]);
      if (e.length >= 2) C.push(e[0][0], lv + 0.15, e[0][1], e[1][0], lv + 0.15, e[1][1]);
    }
  }
  mount.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(C, 3)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })));
  // estrellas y satélites en el cielo
  const sp = []; for (let i = 0; i < 4000; i++) { const v = new THREE.Vector3().randomDirection(); v.y = Math.abs(v.y) * 0.95 + 0.02; v.normalize().multiplyScalar(1800); sp.push(v.x, v.y, v.z); }
  mount.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false })));
  S.skySats = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 3), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 3.2, sizeAttenuation: false, transparent: true, fog: false }));
  S.skySats.frustumCulled = false; mount.add(S.skySats);
  mount.add(new THREE.HemisphereLight(0x9a9a9a, 0x050505, 0.5));
  const moon = new THREE.DirectionalLight(0xffffff, 1.2); moon.position.set(-60, 100, 80); mount.add(moon);
  // pueblo con antena (al otro lado de la cresta)
  TOWN.y = terrainH(TOWN.x, TOWN.z);
  const tt = makeTower(18, 0xffffff); tt.position.copy(TOWN); mount.add(tt); S.townTower = tt;
  for (let i = 0; i < 9; i++) { const h = makeHouse(6, 4.5, 6, i); h.scale.setScalar(0.9); const x = TOWN.x - 25 + (i % 3) * 14 + rnd() * 4, z = TOWN.z - 20 + Math.floor(i / 3) * 16; h.position.set(x, terrainH(x, z), z); h.rotation.y = rnd() * 6; mount.add(h); }
  S.mWaves = [];
  for (let i = 0; i < 6; i++) { const r = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(240 * 6), 3)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true })); r.frustumCulled = false; mount.add(r); S.mWaves.push(r); }
  // casas dispersas y antena «fantasma»
  S.farm = [];
  for (const [x, z] of [[46, -40], [88, 30], [60, 62], [104, -16]]) { const h = makeHouse(6, 4.5, 6, Math.round(x)); h.userData.s = 1.8; h.position.set(x, terrainH(x, z), z); h.rotation.y = x * 0.1; mount.add(h); S.farm.push(h); }
  const gx = 72, gz = 10; const gt = makeTower(16, 0xffffff); gt.position.set(gx, terrainH(gx, gz), gz); mount.add(gt); S.ghost = gt;
  gt.traverse(o => { if (o.isLineSegments || o.isLine) { o.material = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.6, gapSize: 0.5, transparent: true, opacity: 0.9 }); o.computeLineDistances(); } });
  S.tCaro = label('€ € €', { size: 120, weight: 900, height: 9 }); S.tCaro.position.set(gx, terrainH(gx, gz) + 24, gz); mount.add(S.tCaro);
  S.tRoca = label('ROCA', { size: 90, weight: 800, height: 22, spacing: 0.2, color: '#d0d0d0' }); S.tRoca.position.set(-60, 150, 40); mount.add(S.tRoca);
  S.tSin = label('SIN SEÑAL', { size: 90, weight: 800, height: 24, spacing: 0.12 }); mount.add(S.tSin);
  S.marker = new THREE.Group(); mount.add(S.marker);
  S.marker.add(circle(7, 64, 0xffffff, 0.9)); const mk2 = circle(13, 64, 0xffffff, 0.6, true, 1.6); S.marker.add(mk2); S.mk2 = mk2;
  // móvil en una roca
  PH.y = terrainH(PH.x, PH.z);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 1, flatShading: true }));
  rock.scale.set(1.3, 0.6, 1); rock.position.copy(PH).add(v3(0, 0.3, 0)); mount.add(rock);
  rock.add(new THREE.LineSegments(new THREE.EdgesGeometry(rock.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })));
  S.monteTex = canvasTex(SW, SH);
  const ph = makePhone(S.monteTex, 0x151515); ph.scale.setScalar(0.9); mount.add(ph); S.mPhone = ph;
  S.phGlow = new THREE.PointLight(0xffffff, 3, 6, 1.6); mount.add(S.phGlow);
  // satélite en el cielo para el SOS
  S.skySat = makeSatellite(); S.skySat.scale.setScalar(2.2); mount.add(S.skySat);
  S.sosBeam = line([v3(0, 0, 0), v3(0, 1, 0)], 0xffffff, 0.9, true, 1.2); S.sosBeam.frustumCulled = false; mount.add(S.sosBeam);
  // plataforma y cohete
  PAD.y = terrainH(PAD.x, PAD.z);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 1.5, 32), new THREE.MeshStandardMaterial({ color: 0x151515 })); pad.position.copy(PAD).add(v3(0, 0.75, 0)); mount.add(pad);
  pad.add(new THREE.LineSegments(new THREE.EdgesGeometry(pad.geometry, 30), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })));
  const twr = makeTower(30, 0xffffff); twr.position.copy(PAD).add(v3(-7, 0, 0)); mount.add(twr);
  S.rocketM = makeRocket(); S.rocketM.scale.setScalar(1.2); mount.add(S.rocketM);
  S.plumeM = makePlume(1.2, 900); mount.add(S.plumeM.pts);
  S.padLight = new THREE.PointLight(0xffffff, 0, 120, 1.2); S.padLight.position.copy(PAD).add(v3(0, 6, 0)); mount.add(S.padLight);
}
// frente de onda sobre el terreno: solo se dibuja donde la antena «ve» el suelo (la roca hace sombra)
function waveRing(w, R, z) {
  const src = TOWN.clone().add(v3(0, 19, 0));
  const a = w.geometry.attributes.position.array; let k = 0;
  const N = 240; let prev = null;
  for (let i = 0; i <= N; i++) {
    const an = -0.15 + i / N * (Math.PI + 0.3), x = src.x + Math.cos(an) * R, y = src.y + Math.sin(an) * R;
    if (y < terrainH(x, z) + 0.5) { prev = null; continue; }
    let vis = true;
    for (let s = 1; s < 28; s++) { const f = s / 28; const px = lerp(src.x, x, f), pz = lerp(src.z, z, f), py = lerp(src.y, y, f); if (terrainH(px, pz) > py + 0.5) { vis = false; break; } }
    const cur = vis ? [x, y, z] : null;
    if (cur && prev && k < a.length) { a[k++] = prev[0]; a[k++] = prev[1]; a[k++] = prev[2]; a[k++] = cur[0]; a[k++] = cur[1]; a[k++] = cur[2]; }
    prev = cur;
  }
  w.geometry.setDrawRange(0, k / 3); w.geometry.attributes.position.needsUpdate = true;
}
function phonePoseMount(t) {
  // en el SOS el móvil se inclina hacia el cielo
  const tilt = lerp(-0.25, -1.0, ss(prog(t, 46.6, 1.2)));
  const vib = (t > K.conecta + 0.05 && t < K.conecta + 0.75) ? Math.sin(t * 160) * 0.03 : 0;
  S.mPhone.position.copy(PH).add(v3(0 + vib, 1.65, 0));
  S.mPhone.rotation.set(tilt, 0.9, vib * 3, 'YXZ');
  S.phGlow.position.copy(S.mPhone.position).add(v3(0.8, 0.6, 0.6));
}
function skySatPos(t) { return PH.clone().add(v3(-120 + (t - 46) * 9, 260, -60 + (t - 46) * 4)); }

// ---------------------------------------------------------------- secciones
function hook(t) {   // 0 – 1,45 habitación
  drawScreen(S.lockTex, 'lock', t + 0.6);
  roomPose(prog(t, 0.35, 1.05));
  const out = { scene: room, cam: roomCam, bloom: 0.35, black: ss(prog(t, 1.12, 0.3)), blur: 0.25 * ss(prog(t, 0.8, 0.6)) };
  return out;
}
function roomEnd(t) {   // 58,95 – 60: el gancho al revés hasta el primer fotograma
  const u = clamp((END - t) / (END - 58.95));
  drawScreen(S.lockTex, 'lock', 0.6 + 0.0 * u);
  roomPose(prog(u * 1.45, 0.35, 1.05));
  return { scene: room, cam: roomCam, bloom: 0.35, black: ss(prog(u * 1.45, 1.12, 0.3)), blur: 0.25 * ss(prog(u * 1.45, 0.8, 0.6)) };
}

function resetSpace() {
  S.leo.forEach(o => (o.g.visible = false)); S.beam.visible = false; S.miniPhone.visible = false; S.ring.visible = false;
  setOpacity(S.cota500, 0); S.t500.visible = false; S.t36.visible = false; S.tRT.visible = false; S.t70.visible = false;
  setOpacity(S.cota36, 0); S.geoRing.visible = false; S.geo.visible = false; S.pulse.visible = false; S.pulseTrail.visible = false;
  S.rocketS.visible = false; S.plumeS.pts.visible = false; S.heroes.forEach(h => (h.visible = false)); S.gGlow.scale.setScalar(0.012); S.gGlow.visible = true;
}
// mirar desde Granada hacia el cielo y elevarse; luego girar hacia la Tierra y alejarse (gancho y «mira al cielo»)
function skyRise(t, t0) {
  const tau = t - t0;
  S.gGlow.visible = false;
  const rise = eio(prog(tau, 0, 3.3));
  const r = lerp(1.0006, 1.05, rise);
  const P = G.clone().multiplyScalar(r).addScaledVector(NORTH, -0.004 * rise);
  // al principio mira al cenit algo inclinado hacia el norte; después se voltea hacia la Tierra
  const look0 = P.clone().add(G.clone().multiplyScalar(1).addScaledVector(NORTH, 0.22));
  const flip = ss(prog(tau, 2.9, 2.2));
  const m0 = new THREE.Matrix4().lookAt(P, look0, NORTH.clone().negate()), q0 = new THREE.Quaternion().setFromRotationMatrix(m0);
  const fk = eio(prog(tau, 2.95, 2.5));
  const far = G.clone().multiplyScalar(lerp(1.05, 2.55, fk)).addScaledVector(NORTH, -0.35 * fk);
  const pos = P.clone().lerp(far, fk);
  const m1 = new THREE.Matrix4().lookAt(pos, G.clone().multiplyScalar(0.8).addScaledVector(NORTH, 0.42), NORTH), q1 = new THREE.Quaternion().setFromRotationMatrix(m1);
  spaceCam.position.copy(pos); spaceCam.quaternion.copy(q0).slerp(q1, flip);
}
function spaceHook(t) {   // 1,45 – 12,35
  resetSpace(); updateConstellation(t);
  skyRise(t, 1.45);
  // satélites que cruzan por encima
  const passes = [[2.4, 0.016, 0.05], [2.95, 0.011, -0.08], [3.45, 0.008, 0.02], [3.95, 0.013, -0.04], [4.5, 0.02, 0.07]];
  const fwd = v3(0, 0, -1).applyQuaternion(spaceCam.quaternion), rgt = v3(1, 0, 0).applyQuaternion(spaceCam.quaternion), upv = v3(0, 1, 0).applyQuaternion(spaceCam.quaternion);
  passes.forEach(([tp, dist, dy], i) => {
    const h = S.heroes[i]; const lat = (t - tp) * dist * 1.4 * (i % 2 ? -1 : 1);
    h.visible = Math.abs(t - tp) < 1.0 && t < 5.6;
    h.position.copy(spaceCam.position).addScaledVector(fwd, dist).addScaledVector(rgt, lat).addScaledVector(upv, dy * dist * 3);
    h.lookAt(0, 0, 0); h.rotateZ(i * 0.8);
  });
  // cota de 500 km en el borde y haz a un móvil
  if (t > 4.8) {
    spaceCam.updateMatrixWorld();
    const right = v3().setFromMatrixColumn(spaceCam.matrixWorld, 1);
    const base = G.clone();
    const camDir = spaceCam.position.clone().normalize(), D = spaceCam.position.length();
    const perp = right.clone().addScaledVector(camDir, -right.dot(camDir)).normalize();
    const limb = camDir.clone().multiplyScalar(1 / D).addScaledVector(perp, Math.sqrt(1 - 1 / (D * D))).normalize();
    const a = prog(t, 6.1, 0.5) * (1 - prog(t, 10.2, 0.4));
    S.cota500.position.set(0, 0, 0); S.cota500.quaternion.setFromUnitVectors(v3(0, 1, 0), limb); setOpacity(S.cota500, a);
    S.t500.position.copy(limb.clone().multiplyScalar(LEO + 0.09)); show(S.t500, a, pop(t, 6.1));
    void base;
  }
  if (t > K.movil) {
    const a = prog(t, K.movil, 0.4) * (1 - prog(t, 10.6, 0.4));
    const sat = S.leo[0]; sat.g.visible = a > 0.01; sat.cone.material.uniforms.k.value = 0;
    sat.g.children.forEach((c, i) => { if (i > 1) c.visible = false; }); sat.s.scale.setScalar(0.005);
    const sp = G.clone().addScaledVector(EAST, 0.16 - (t - K.movil) * 0.008).addScaledVector(NORTH, 0.14).normalize().multiplyScalar(LEO);
    sat.g.position.copy(sp); sat.g.quaternion.setFromUnitVectors(v3(0, 1, 0), sp.clone().normalize());
    const gp = G.clone().multiplyScalar(1.001);
    const u = eo(prog(t, K.movil, 0.6));
    const e = sp.clone().lerp(gp, u); S.beam.visible = true; S.beam.geometry.setPositions([sp.x, sp.y, sp.z, e.x, e.y, e.z]); S.beam.material.opacity = 0.95 * a;
    S.miniPhone.visible = true; S.miniPhone.position.copy(G.clone().multiplyScalar(1.0035)); S.miniPhone.lookAt(spaceCam.position); S.miniPhone.up.copy(G);
    drawScreen(S.pingTex, 'radio', t);
    S.ring.visible = u > 0.95; S.ring.position.copy(gp); S.ring.quaternion.setFromUnitVectors(v3(0, 1, 0), G); S.ring.scale.setScalar(0.004 + 0.012 * ((t * 1.2) % 1)); S.ring.material.opacity = (1 - (t * 1.2) % 1) * a;
  }
  const out = { scene: space, cam: spaceCam, bloom: 0.7, black: 1 - ss(prog(t, 1.45, 0.35)) };
  // caída hacia Granada (la luz blanca de la ciudad)
  if (t > 9.6) {
    const u = eio(prog(t, 9.6, 2.75));
    const startP = G.clone().multiplyScalar(2.55).addScaledVector(NORTH, -0.35);
    const r = loglerp(1.55, 0.0012, u);
    const pos = G.clone().multiplyScalar(1 + r).addScaledVector(NORTH, -0.35 * r / 1.55);
    spaceCam.position.copy(startP.lerp(pos, ss(prog(t, 9.6, 0.6))));
    const tgt = G.clone().multiplyScalar(lerp(0.55, 1.0, ss(prog(t, 9.6, 1.2)))).addScaledVector(NORTH, 0.1 * (1 - ss(prog(t, 9.6, 1.2))));
    spaceCam.up.copy(NORTH); spaceCam.lookAt(tgt);
    S.gGlow.scale.setScalar(lerp(0.012, 0.0009, u));
    out.white = ss(prog(t, 11.95, 0.4));
    out.blur = 0.25 * Math.sin(Math.PI * prog(t, 10.6, 1.7));
  }
  return out;
}

function groundSec(t) {   // 12,35 – 26,3
  const P = groundPath(t);
  aim(groundCam, P.p, P.l, P.up);
  const bob = Math.sin(t * 1.6) * 0.08;
  S.gPhone.position.y = 2.1 + bob; S.gPhone.rotation.y = 0.35 + 0.1 * Math.sin(t * 0.7);
  drawScreen(S.radioTex, 'radio', t);
  // cable
  const cut = prog(t, K.cable, 0.5);
  setOpacity(S.cableA, 1 - prog(t, 14.6, 0.5)); setOpacity(S.cableB, 1 - prog(t, 14.6, 0.5));
  S.cableA.position.x = -0.25 * eo(cut); S.cableB.position.x = 0.25 * eo(cut);
  show(S.cross, env(t, K.cable, 15.2, 0.2, 0.3), pop(t, K.cable));
  // ondas hacia la antena
  const from = S.gPhone.position.clone().add(v3(0, 0.6, 0)), to = ANT.clone().add(v3(0, 9.4, 0));
  const dir = to.clone().sub(from).normalize();
  const wa = env(t, 14.9, 19.6, 0.4, 0.6);
  S.waves.forEach((w, i) => {
    const f = ((t - 14.9) * 0.55 + i / S.waves.length) % 1;
    w.visible = wa > 0.01 && t > 14.9; w.position.copy(from).lerp(to, f); w.quaternion.setFromUnitVectors(v3(0, 0, 1), dir);
    w.scale.setScalar(0.35 + 1.6 * f); w.material.opacity = wa * Math.sin(Math.PI * f);
  });
  show(S.tAnt, env(t, K.antena - 0.1, 19.3, 0.3, 0.4), pop(t, K.antena - 0.1));
  // burbuja
  const dg = eo(prog(t, K.cada + 0.2, 1.6));
  S.dome.visible = dg > 0.01; S.dome.scale.set(dg, dg * (0.85 + 0.15 * dg), dg);
  // ciudad: burbujas que aparecen y se solapan
  const cityA = prog(t, 19.6, 1.0);
  S.city.visible = cityA > 0.01; S.city.scale.y = Math.max(0.001, eo(cityA));
  S.domes.forEach((o, i) => {
    const t0 = 20.6 + i * 0.22; const k = eo(prog(t, t0, 0.9));
    o.t.visible = t > t0 - 0.4; o.t.scale.y = Math.max(0.001, eo(prog(t, t0 - 0.4, 0.4)));
    o.d.visible = k > 0.01; o.d.scale.set(k, k, k);
  });
  // fibra y pulsos
  const fa = prog(t, K.desde, 1.6);
  const n = S.fiberPts.length - 1;
  S.fiber.visible = fa > 0; S.fiber.geometry.instanceCount = Math.max(0, Math.floor(n * eio(fa)));
  S.pulses.forEach((m, i) => {
    const f = ((((t - K.desde - 0.6) * 1.25 + i / S.pulses.length) % 1) + 1) % 1;
    m.visible = t > K.desde + 0.6 && f < fa; const k = f * n, j = Math.min(n - 1, Math.floor(k));
    m.position.copy(S.fiberPts[j]).lerp(S.fiberPts[j + 1], k - j).add(v3(0, 0.6, 0));
  });
  show(S.tFib, env(t, K.fibra - 0.1, 25.5, 0.3, 0.3), pop(t, K.fibra - 0.1));
  show(S.tNet, env(t, K.internet - 0.1, 26.0, 0.3, 0.3), pop(t, K.internet - 0.1));
  return { scene: ground, cam: groundCam, bloom: 0, white: 1 - ss(prog(t, 12.35, 0.35)), black: ss(prog(t, 25.95, 0.3)), vig: 0.12 };
}

function resetMount() {
  S.mWaves.forEach(w => (w.visible = false)); S.tCaro.visible = false; S.tRoca.visible = false; S.tSin.visible = false; S.marker.visible = false;
  S.ghost.visible = false; S.sosBeam.visible = false; S.skySat.visible = false; S.plumeM.pts.visible = false; S.padLight.intensity = 0;
}
let mountPath = null;
const mountKeys = () => camPath([
  [26.3, PH.clone().add(v3(4.6, 2.5, 2.6)), PH.clone().add(v3(0, 1.85, 0))],
  [27.6, PH.clone().add(v3(3.5, 2.2, 2.0)), PH.clone().add(v3(0, 1.85, 0))],
  [28.5, v3(-60, 200, 560), v3(-78, 52, 8)],
  [29.8, v3(-82, 205, 585), v3(-81, 50, 8)],
  [31.3, v3(-70, 200, 570), v3(-74, 48, 8)],
  [32.3, v3(160, 95, 50), v3(95, 12, -25)],
  [32.8, v3(178, 72, 18), v3(118, 25, -60)],
]);
function mountSec(t) {   // 26,3 – 34,2
  resetMount();
  const lost = prog(t, K.conecta - 0.3, 0.8);
  drawScreen(S.monteTex, 'monte', t, { lost });
  phonePoseMount(t);
  const out = { scene: mount, cam: mountCam, bloom: 0.55, black: 1 - ss(prog(t, 26.3, 0.4)) };
  if (t < 32.8) { const P = mountPath(t); aim(mountCam, P.p, P.l, P.up); }
  out.blur = 0.35 * Math.sin(Math.PI * prog(t, 27.75, 0.8));
  // ondas del pueblo bloqueadas por la cresta
  const wa = env(t, 28.4, 32.9, 0.5, 0.5);
  S.mWaves.forEach((w, i) => {
    const f = ((t - 28.4) * 0.3 + i / S.mWaves.length) % 1;
    w.visible = wa > 0.01 && t > 28.4; if (!w.visible) return;
    waveRing(w, 8 + f * 300, i % 2 ? TOWN.z + 14 : TOWN.z); w.material.opacity = wa * (1 - f * 0.7) * (i % 2 ? 0.45 : 1);
  });
  show(S.tRoca, env(t, K.rocas - 0.1, 32.6, 0.3, 0.4), pop(t, K.rocas));
  S.marker.visible = t > 28.6; S.marker.position.copy(PH).add(v3(0, 1.2, 0)); setOpacity(S.marker, env(t, 28.6, 32.8, 0.4, 0.4));
  S.mk2.scale.setScalar(1 + 0.5 * ((t * 1.3) % 1));
  S.tSin.position.copy(PH).add(v3(0, 30, 0)); show(S.tSin, env(t, 28.8, 32.8, 0.3, 0.4), pop(t, 28.8));
  S.farm.forEach((h, i) => { h.visible = t > K.poner + i * 0.2; h.scale.setScalar(1.8 * Math.max(0.001, eo(prog(t, K.poner + i * 0.2, 0.4)))); });
  S.ghost.visible = t > 31.3; setOpacity(S.ghost, env(t, 31.3, 33.4, 0.4, 0.4));
  show(S.tCaro, env(t, K.caro - 0.15, 33.2, 0.25, 0.3), pop(t, K.caro - 0.15));
  // cohete
  const ign = K.durante, lift = Math.max(0, t - (ign + 0.35));
  const y = 0.9 * lift * lift * 6;
  S.rocketM.position.copy(PAD).add(v3(0, 1.5 + y, 0));
  S.plumeM.pts.visible = t > ign; S.padLight.intensity = t > ign ? 40 * (0.7 + 0.3 * Math.sin(t * 40)) : 0;
  updatePlume(S.plumeM, S.rocketM.position.clone().add(v3(0, -1.5, 0)), v3(0, -1, 0), t, 20 + 10 * Math.min(1, lift), 0.35, PAD.y + 1.5);
  if (t >= 32.8) {
    const k = eio(prog(t, 32.8, 1.4));
    const P = mountPath(32.8);
    const camP = P.p.clone().lerp(S.rocketM.position.clone().add(v3(70, -10, 110)), k);
    const tgt = P.l.clone().lerp(S.rocketM.position.clone().add(v3(0, 18, 0)), ss(prog(t, 32.8, 0.8)));
    aim(mountCam, camP, tgt);
    out.blur = 0.3 * ss(prog(t, 33.7, 0.5));
  }
  return out;
}

function spaceMid(t) {   // 34,0 – 46,0
  resetSpace(); updateConstellation(t); S.gGlow.visible = false;
  const out = { scene: space, cam: spaceCam, bloom: 0.7 };
  const A = S.A, side = S.geoSide;
  // cohete que sube sobre la curvatura de la Tierra
  if (t < 35.6) {
    const tau = t - 33.6;
    const rp = G.clone().multiplyScalar(1.015 + 0.012 * tau + 0.004 * tau * tau).addScaledVector(EAST, 0.004 * tau);
    const dir = G.clone().add(EAST.clone().multiplyScalar(0.25)).normalize();
    S.rocketS.visible = true; S.rocketS.position.copy(rp); S.rocketS.quaternion.setFromUnitVectors(v3(0, 1, 0), dir);
    S.plumeS.pts.visible = true; updatePlume(S.plumeS, rp.clone().addScaledVector(dir, -0.0015), dir.clone().negate(), t, 34, 0.3);
    const cp = rp.clone().addScaledVector(G, 0.006).addScaledVector(NORTH, -0.075).addScaledVector(EAST, 0.025);
    aim(spaceCam, cp, rp.clone().addScaledVector(G, -0.012), G);
  }
  // vista de la órbita geoestacionaria
  const geoA = env(t, 35.0, 41.4, 0.5, 0.6);
  S.geoRing.visible = geoA > 0.01; S.geoRing.material.opacity = 0.5 * geoA;
  S.geo.visible = geoA > 0.01; S.geo.rotation.z = t * 0.1;
  if (t >= 35.6 && t < 40.4) {
    const u = eio(prog(t, 35.6, 1.4));
    const mid = A.clone().multiplyScalar(3.3);
    const camFar = mid.clone().addScaledVector(side.clone().cross(A).normalize(), -16 - 0.4 * (t - 35.6)).addScaledVector(side, -2.0);
    const prev = G.clone().multiplyScalar(1.12).addScaledVector(NORTH, -0.3);
    spaceCam.position.copy(prev.lerp(camFar, u));
    spaceCam.up.copy(A); spaceCam.lookAt(G.clone().lerp(mid, u));
    setOpacity(S.cota36, prog(t, 36.0, 0.5) * (1 - prog(t, 40.3, 0.3)));
    show(S.t36, env(t, K.km36 - 0.15, 40.5, 0.3, 0.3), pop(t, K.km36 - 0.15));
    // pulso de ida y vuelta (lento)
    const pu = prog(t, K.senal, 1.6);
    if (t > K.senal && pu < 1) {
      const gp = G.clone().multiplyScalar(1.01), sp = S.geo.position.clone();
      const p = pu < 0.5 ? gp.clone().lerp(sp, pu * 2) : sp.clone().lerp(gp, (pu - 0.5) * 2);
      S.pulse.visible = true; S.pulse.position.copy(p);
      S.pulseTrail.visible = true; S.pulseTrail.geometry.setFromPoints([gp, sp]); S.pulseTrail.computeLineDistances(); S.pulseTrail.material.opacity = 0.6;
    }
    S.tRT.position.copy(A.clone().multiplyScalar(2.6).addScaledVector(side, -1.8));
    show(S.tRT, env(t, 39.0, 40.5, 0.3, 0.3), pop(t, 39.0));
  }
  // órbita baja: satélites con su burbuja de cobertura
  if (t >= 40.4) {
    const u = eio(prog(t, 40.4, 1.6));
    const mid = A.clone().multiplyScalar(3.3);
    const camFar = mid.clone().addScaledVector(side.clone().cross(A).normalize(), -16 - 0.4 * 4.8).addScaledVector(side, -2.0);
    const lowP = G.clone().multiplyScalar(1.55).addScaledVector(NORTH, -0.42).addScaledVector(EAST, 0.12);
    const followK = ss(prog(t, 42.2, 1.6));
    // satélites en tren sobre una órbita que cruza España de noreste a suroeste
    const axis = G.clone().cross(EAST.clone().multiplyScalar(-0.8).add(NORTH.clone().multiplyScalar(-0.6)).normalize()).normalize();
    const leoA = prog(t, 41.0, 0.6);
    let lead = null;
    S.leo.forEach((o, i) => {
      const ang = (t - 45.08) * 0.03 + (i - 2) * 0.13;
      const p = G.clone().applyAxisAngle(axis, ang).multiplyScalar(LEO);
      o.g.visible = leoA > 0.01; o.g.children.forEach(c => (c.visible = true));
      o.g.position.copy(p); o.g.quaternion.setFromUnitVectors(v3(0, 1, 0), p.clone().normalize());
      o.cone.material.uniforms.k.value = eo(prog(t, K.cada2 + i * 0.15, 0.6));
      o.g.children.slice(2).forEach(c => (c.visible = t > K.cada2 + i * 0.15));
      o.s.rotation.y = 0.6; o.s.scale.setScalar(0.0022);
      if (i === 2) lead = p;
    });
    const followP = lead.clone().multiplyScalar(1.16).addScaledVector(NORTH, -0.2).addScaledVector(EAST, 0.1);
    let pos = camFar.lerp(lowP, u).lerp(followP, followK);
    let tgt = mid.clone().lerp(G.clone().multiplyScalar(1.0), u).lerp(lead.clone().multiplyScalar(0.99), followK);
    // al final baja por el cono hasta el suelo
    const dive = eio(prog(t, 45.3, 0.7));
    if (dive > 0) { pos = pos.lerp(G.clone().multiplyScalar(1.004), dive); tgt = tgt.lerp(G.clone(), dive); }
    spaceCam.position.copy(pos); spaceCam.up.copy(A.clone().lerp(NORTH, u)).normalize(); spaceCam.lookAt(tgt);
    // cota de 500 km en el borde
    spaceCam.updateMatrixWorld();
    const right = v3().setFromMatrixColumn(spaceCam.matrixWorld, 1);
    const camDir = spaceCam.position.clone().normalize(), D = spaceCam.position.length();
    const perp = right.clone().addScaledVector(camDir, -right.dot(camDir)).normalize();
    const limb = camDir.clone().multiplyScalar(1 / D).addScaledVector(perp, Math.sqrt(1 - 1 / (D * D))).normalize();
    const ca = env(t, 41.1, 43.0, 0.4, 0.4);
    S.cota500.quaternion.setFromUnitVectors(v3(0, 1, 0), limb); setOpacity(S.cota500, ca);
    S.t500.visible = false;
    hudPlace(S.t70, spaceCam, 0, 0.62, 0.05); show(S.t70, env(t, K.bajo - 0.1, 43.2, 0.3, 0.4), pop(t, K.bajo - 0.1));
    out.blur = 0.25 * Math.sin(Math.PI * prog(t, 40.5, 1.2)) + 0.3 * ss(prog(t, 45.5, 0.5));
    out.white = 0;
  }
  // transición desde la montaña
  if (t < 34.4) { out.blur = 0.3 * (1 - ss(prog(t, 34.0, 0.4))); }
  return out;
}

function mountSos(t) {   // 46,0 – 54,0
  resetMount();
  const sp = skySatPos(t);
  S.skySat.visible = true; S.skySat.position.copy(sp); S.skySat.lookAt(PH); S.skySat.rotateZ(0.5);
  const step = t < K.satelite ? 0 : t < K.aunque ? 1 : t < 50.9 ? 2 : 3;
  const ph = S.mPhone;
  phonePoseMount(t);
  // ángulo del satélite en la pantalla: se acerca al centro cuando se apunta bien
  const aimK = ss(prog(t, 46.6, 2.2));
  drawScreen(S.monteTex, 'sos', t, { step, satAng: -2.2 + 0.4 * Math.sin(t * 0.6), satR: lerp(0.95, 0.42, aimK), pr: prog(t, K.aunque, 1.15) });
  if (step >= 1) { S.sosBeam.visible = true; const top = ph.position.clone().add(v3(0, 0.6, 0)); S.sosBeam.geometry.setFromPoints([top, top.clone().lerp(sp, eo(prog(t, K.satelite, 0.6)))]); S.sosBeam.computeLineDistances(); S.sosBeam.material.opacity = 0.9; }
  // cámara: primer plano del móvil; al final mira al cielo y sube
  const P0 = ph.position.clone().add(v3(2.5, 1.25, 1.65)), L0 = ph.position.clone().add(v3(-0.15, 0.12, 0));
  const up = ss(prog(t, K.proxima + 0.3, 2.2));
  const L1 = ph.position.clone().add(v3(-60, 240, -40));
  const P1 = ph.position.clone().add(v3(4, 3, 4)).lerp(ph.position.clone().add(v3(-10, 60, -6)), ss(prog(t, 52.6, 1.4)));
  aim(mountCam, P0.lerp(P1, up), L0.lerp(L1, up));
  // satélites cruzando el cielo
  const a = S.skySats.geometry.attributes.position.array;
  for (let i = 0; i < 60; i++) {
    const ang = (i * 0.7) % (Math.PI * 2), el = 0.35 + (i * 0.137) % 0.6;
    const d = v3(Math.cos(ang + t * (0.01 + (i % 5) * 0.004)) * Math.cos(el), Math.sin(el), Math.sin(ang + t * (0.01 + (i % 5) * 0.004)) * Math.cos(el)).multiplyScalar(1500);
    a[i * 3] = PH.x + d.x; a[i * 3 + 1] = PH.y + d.y; a[i * 3 + 2] = PH.z + d.z;
  }
  S.skySats.geometry.attributes.position.needsUpdate = true;
  const out = { scene: mount, cam: mountCam, bloom: 0.6 };
  if (t < 46.4) out.blur = 0.3 * (1 - ss(prog(t, 46.0, 0.4)));
  out.blur = (out.blur || 0) + 0.3 * ss(prog(t, 53.4, 0.5));
  return out;
}

function spaceEnd(t) {   // 54,0 – 58,95
  resetSpace(); updateConstellation(t);
  skyRise(t, 51.8);   // misma subida que el gancho, desde Granada hacia la órbita
  const out = { scene: space, cam: spaceCam, bloom: 0.7 };
  if (t < 54.4) out.blur = 0.3 * (1 - ss(prog(t, 54.0, 0.4)));
  // vuelta a casa: caída hacia Granada y negro (el tejado)
  const u = eio(prog(t, 57.55, 1.4));
  if (u > 0) {
    const from = spaceCam.position.clone(), q = spaceCam.quaternion.clone();
    const r = loglerp(Math.max(0.05, from.length() - 1), 0.0006, u);
    const pos = from.clone().normalize().lerp(G, ss(prog(t, 57.55, 0.8))).normalize().multiplyScalar(1 + r);
    spaceCam.position.copy(pos); spaceCam.up.copy(NORTH); spaceCam.lookAt(G);
    const q2 = spaceCam.quaternion.clone(); spaceCam.quaternion.copy(q).slerp(q2, ss(prog(t, 57.55, 0.6)));
    out.blur = 0.3 * ss(prog(t, 58.2, 0.6));
    out.black = ss(prog(t, 58.62, 0.33));
  }
  return out;
}

function frameState(t) {
  if (t < 1.45) return hook(t);
  if (t < 12.35) return spaceHook(t);
  if (t < 26.3) return groundSec(t);
  if (t < 34.0) {
    const o = mountSec(t);
    if (t > 33.6) { const s = spaceMid(t); o.sceneB = s.scene; o.camB = s.cam; o.mixB = ss(prog(t, 33.6, 0.4)); }
    return o;
  }
  if (t < 46.0) {
    const o = spaceMid(t);
    if (t > 45.6) { const s = mountSos(46.0); o.sceneB = s.scene; o.camB = mountCam; o.mixB = ss(prog(t, 45.6, 0.4)); }
    return o;
  }
  if (t < 54.0) {
    const o = mountSos(t);
    if (t > 53.6) { spaceEnd(54.0); o.sceneB = space; o.camB = spaceCam; o.mixB = ss(prog(t, 53.6, 0.4)); }
    return o;
  }
  if (t < 58.95) return spaceEnd(t);
  return roomEnd(t);
}

// portada: Tierra con la constelación y satélites con burbujas
window.renderCover = function () {
  spaceMid(44.2);
  for (const k of ['t500', 't70']) S[k].visible = false; setOpacity(S.cota500, 0);
  renderer.setRenderTarget(rtA); renderer.render(space, spaceCam);
  mixMat.uniforms.tA.value = rtA.texture; mixMat.uniforms.tB.value = rtA.texture; mixMat.uniforms.mixAB.value = 0; mixMat.uniforms.blur.value = 0;
  mixMat.uniforms.white.value = 0; mixMat.uniforms.black.value = 0; mixMat.uniforms.vig.value = 0.45;
  renderer.setRenderTarget(rtC); renderer.render(quadScene, quadCam);
  bloom.strength = 0.8; bloom.enabled = true; renderer.setRenderTarget(null); composer.render();
  return true;
};

window.renderAt = function (t) {
  const st = frameState(t);
  S.halo.visible = spaceCam.position.length() > 1.1; S.halo.material.opacity = 1;
  const useB = st.sceneB && st.mixB > 0;
  if (useB) { renderer.setRenderTarget(rtB); renderer.render(st.sceneB, st.camB); }
  renderer.setRenderTarget(rtA); renderer.render(st.scene, st.cam);
  mixMat.uniforms.tA.value = rtA.texture; mixMat.uniforms.tB.value = useB ? rtB.texture : rtA.texture;
  mixMat.uniforms.mixAB.value = useB ? st.mixB : 0; mixMat.uniforms.blur.value = st.blur || 0;
  mixMat.uniforms.white.value = clamp(st.white || 0); mixMat.uniforms.black.value = clamp(st.black || 0);
  mixMat.uniforms.vig.value = st.vig !== undefined ? st.vig : 0.4;
  renderer.setRenderTarget(rtC); renderer.render(quadScene, quadCam);
  bloom.strength = st.bloom || 0; bloom.enabled = (st.bloom || 0) > 0;
  renderer.setRenderTarget(null); composer.render();
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '800' }),
    new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-SemiBold.otf)`, { weight: '600' }),
    new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' }), new FontFace('Mono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const c50 = await loadTopo('../../../engine/geo/countries-50m.json');
  buildRoom(); buildSpace(c50); buildGround(); buildMount(); mountPath = mountKeys();
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
