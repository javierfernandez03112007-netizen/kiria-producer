// «Ingeniería Mecánica desde dentro» — escenas 3D: objetos animados vivos y plastificados, fondo espacial apagado con
// suelo reflectante. Cada escena se sincroniza con su palabra en tiempos.json. window.renderAt(t) dibuja el instante t.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { W, H, clamp, prog, lerp, eo, eio, ss, fatLines } from './lib.js';

// ---------------------------------------------------------------- render y transición (barrido con desenfoque)
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const post = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, dir: { value: new THREE.Vector2(0, 0) }, fade: { value: 0 }, vig: { value: 0.22 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `uniform sampler2D tA; uniform vec2 dir; uniform float fade, vig; varying vec2 vUv;
    void main(){ vec3 a=vec3(0.); for(int i=0;i<12;i++){ float k=(float(i)/11.0-0.5); a+=texture2D(tA, vUv+dir*k).rgb; } a/=12.0;
      vec2 d=(vUv-.5)*vec2(0.5625,1.0); a*=1.0-vig*smoothstep(0.3,0.8,length(d)*1.6);
      a=mix(a, vec3(0.07,0.075,0.085), fade); a*=1.12; a=clamp((a*(2.51*a+0.03))/(a*(2.43*a+0.59)+0.14),0.,1.); a=pow(a, vec3(1.0/2.2)); float lu=dot(a,vec3(0.2126,0.7152,0.0722)); a=clamp(mix(vec3(lu),a,1.25),0.,1.); gl_FragColor=vec4(a,1.0);} `,
  depthTest: false,
});
const quadScene = new THREE.Scene(); quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const scene = new THREE.Scene();
const BG = 0x0b1020;
const sky = (() => { const hash = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }; const c = document.createElement('canvas'); c.width = 4096; c.height = 2048; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 2048); gr.addColorStop(0, '#05070f'); gr.addColorStop(0.5, '#0b1020'); gr.addColorStop(1, '#070912'); g.fillStyle = gr; g.fillRect(0, 0, 4096, 2048);
  for (let i = 0; i < 9; i++) { const x = hash(i * 31) * 4096, y = 500 + hash(i * 17) * 1000, r = 300 + hash(i * 7) * 600, rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, ['rgba(70,60,140,.22)', 'rgba(40,80,150,.2)', 'rgba(110,50,110,.16)'][i % 3]); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 2600; i++) { const b = hash(i * 1.7); g.fillStyle = `rgba(${200 + 55 * hash(i)},${210 + 45 * hash(i * 2)},255,${0.15 + b * b * 0.6})`; const sz = b > 0.97 ? 3 : b > 0.85 ? 2 : 1; g.fillRect(hash(i * 3.3) * 4096, hash(i * 5.1) * 2048, sz, sz); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; return t; })();
scene.background = sky; scene.fog = new THREE.Fog(BG, 28, 80);
const BLACK = new THREE.Color(0x000000);
const cam = new THREE.PerspectiveCamera(36, W / H, 0.001, 400);
const S = {}; window.S = S; window.cam = cam; window.RC = THREE.Raycaster; window.SCN = scene;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const env = (t, t0, t1, fi = 0.3, fo = 0.3) => (t < t0 || t > t1 ? 0 : Math.min(eo(prog(t, t0, fi)), 1 - prog(t, t1 - fo, fo)));
const hash = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (draw) draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { c, g }; return t; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// paleta (como la referencia)
const C = { orange: 0xff5a1f, coral: 0xff5470, blue: 0x2f6bff, grid: 0x34406a, floor: 0xc08a58, clay: 0x3f78ff, clayL: 0x9aa3b2, wood: 0xe0b07c, pale: 0x5c9dff, board: 0x1f5a40, wall: 0xf3eadc, white: 0xf2f2f2 };
const clay = (c = C.clay, r = 0.55) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.05 });
function rbox(w, h, d, m, r = 0.06) {   // caja de bordes redondeados (aspecto arcilla)
  // el bisel crece hacia fuera: se encoge el perfil para que la caja mida exactamente w × h × d
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
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / c.width), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.renderOrder = 9; return m;
}
const zones = {}; const ZT = [];   // [nombre, inicio]
function zone(name, x) { const g = new THREE.Group(); g.position.set(x, 0, 0); scene.add(g); zones[name] = g; return g; }

// ---------------------------------------------------------------- maniquí de madera articulado
function makeDoll(color = C.wood, s = 1) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.02 }), d = new THREE.Group(), J = {};
  const cap = (r, h) => new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 4, 10), m);
  const pivot = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  J.hip = pivot(d, 0, 0.5, 0);
  const pel = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), m); pel.scale.set(1.3, 0.8, 0.9); J.hip.add(pel);
  J.chest = pivot(J.hip, 0, 0.05, 0); const tor = cap(0.085, 0.22); tor.position.y = 0.17; tor.scale.set(1.25, 1, 0.8); J.chest.add(tor);
  J.neck = pivot(J.chest, 0, 0.36, 0); const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), m); head.scale.set(0.9, 1.1, 0.95); head.position.y = 0.08; J.neck.add(head);
  for (const sd of [-1, 1]) {
    const sh = pivot(J.chest, sd * 0.13, 0.31, 0); const ua = cap(0.032, 0.14); ua.position.y = -0.09; sh.add(ua);
    const el = pivot(sh, 0, -0.19, 0); const la = cap(0.028, 0.13); la.position.y = -0.085; el.add(la);
    const hp = pivot(J.hip, sd * 0.07, -0.03, 0); const ul = cap(0.042, 0.18); ul.position.y = -0.12; hp.add(ul);
    const kn = pivot(hp, 0, -0.25, 0); const ll = cap(0.036, 0.17); ll.position.y = -0.11; kn.add(ll);
    J[sd < 0 ? 'shL' : 'shR'] = sh; J[sd < 0 ? 'elL' : 'elR'] = el; J[sd < 0 ? 'hpL' : 'hpR'] = hp; J[sd < 0 ? 'knL' : 'knR'] = kn;
  }
  d.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  d.scale.setScalar(s); d.userData.J = J; return d;
}
function sit(d, k = 1) { const J = d.userData.J; J.hip.position.y = lerp(0.5, 0.36, k); J.hpL.rotation.x = J.hpR.rotation.x = -1.45 * k; J.knL.rotation.x = J.knR.rotation.x = 1.5 * k; J.shL.rotation.x = J.shR.rotation.x = -0.5 * k; J.elL.rotation.x = J.elR.rotation.x = -0.9 * k; }
const DM = { top: new THREE.MeshStandardMaterial({ color: 0xe6c39a, roughness: 0.55 }), leg: new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.3, metalness: 0.8 }),
  seats: [0xff6a2b, 0x2f9bff, 0x22c08a, 0xffc12e].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 })) };
let deskN = 0;
function desk() { const g = new THREE.Group(); const top = rbox(0.55, 0.035, 0.38, DM.top, 0.012); top.position.y = 0.42; g.add(top); for (const [x, z] of [[-0.24, -0.15], [0.24, -0.15], [-0.24, 0.15], [0.24, 0.15]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 8), DM.leg); l.position.set(x, 0.21, z); g.add(l); }
  const sm = DM.seats[deskN++ % 4], ch = rbox(0.24, 0.03, 0.22, sm, 0.01); ch.position.set(0, 0.26, 0.3); g.add(ch); const bk = rbox(0.24, 0.16, 0.025, sm, 0.01); bk.position.set(0, 0.36, 0.41); g.add(bk);
  for (const [x, z] of [[-0.1, 0.21], [0.1, 0.21], [-0.1, 0.39], [0.1, 0.39]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 6), DM.leg); l.position.set(x, 0.13, z); g.add(l); } return g; }
// teclado: textura de teclas (para el ordenador de la habitación y el portátil)
function keysTex(cols = 14, rows = 5, dark = '#1a1c20', key = '#41454d', fg = '#d4d8de') {
  return canvasTex(1400, 500, (g, w, h) => { g.fillStyle = dark; g.fillRect(0, 0, w, h); const kw = w / cols, kh = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { if (r === rows - 1 && c > 3 && c < 10) { if (c === 4) { g.fillStyle = key; rr(g, c * kw + 6, r * kh + 6, kw * 6 - 12, kh - 12, 10); g.fill(); } continue; } g.fillStyle = key; rr(g, c * kw + 6, r * kh + 6, kw - 12, kh - 12, 10); g.fill(); g.fillStyle = fg; g.font = '600 30px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('QWERTYUIOPASDFGHJKLÑZXCVBNM1234567890'[(r * cols + c) % 37], c * kw + kw / 2, r * kh + kh / 2); } });
}
// lámpara de pie (pantalla cálida que brilla + luz puntual) y planta en maceta
function lamp(Z, x, z, h = 1.5, power = 1.6) {
  const g = new THREE.Group(); g.position.set(x, 0, z); Z.add(g); const m = clay(0x2a2c31, 0.4);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.04, 20), m); base.position.y = 0.02; g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, h, 8), m); pole.position.y = h / 2; g.add(pole);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.24, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffb86a, emissiveIntensity: 1.4, side: THREE.DoubleSide })); shade.position.y = h; g.add(shade);
  const li = new THREE.PointLight(0xffb86a, power, 5, 1.4); li.position.y = h - 0.05; g.add(li); return g;
}
function plant(Z, x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); Z.add(g);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.24, 20), clay(0xb4643c, 0.7)); pot.position.y = 0.12; pot.castShadow = true; g.add(pot);
  const lm = clay(0x3f7a4a, 0.6);
  for (let i = 0; i < 9; i++) { const a = i * 2.4, tilt = 0.35 + hash(i) * 0.5; const lf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), lm); lf.scale.set(0.6, 2.6, 0.25); const piv = new THREE.Group(); piv.position.y = 0.22; piv.rotation.set(tilt * Math.cos(a), 0, tilt * Math.sin(a)); lf.position.y = 0.17; piv.add(lf); g.add(piv); lf.castShadow = true; }
  return g;
}
function floorGrid(size, div, color = C.grid) { const g = new THREE.GridHelper(size, div, color, color); g.material.transparent = true; g.material.opacity = 0.35; return g; }
function lights(group, x = 0) {
  const k = new THREE.DirectionalLight(0xfff4e8, 3.6); k.position.set(x - 6, 12, 8); k.castShadow = true; k.shadow.mapSize.set(2048, 2048); k.shadow.bias = -0.0004; k.shadow.radius = 4;
  Object.assign(k.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 }); k.target.position.set(x, 0, 0); scene.add(k.target); group.add(k);
}

// ---------------------------------------------------------------- decoración viva (informática y matemáticas) y fondo espacial apagado
const POSTERS = {
  pi: ['#ffcf3a', '#1b1b2f', g => { g.font = '900 300px Serif'; g.fillText('π', 300, 330); g.font = '700 46px Mono'; g.fillText('3.14159265…', 300, 520); }],
  euler: ['#2f6bff', '#ffffff', g => { g.font = 'italic 120px Serif'; g.fillText('e', 170, 360); g.font = 'italic 64px Serif'; g.fillText('iπ', 250, 290); g.font = 'italic 120px Serif'; g.fillText('+ 1 = 0', 410, 360); g.font = '700 40px Inter'; g.fillText('EULER', 300, 520); }],
  binary: ['#111827', '#3cff8f', g => { g.font = '700 44px Mono'; for (let r = 0; r < 9; r++) g.fillText(Array.from({ length: 8 }, (_, i) => (hash(r * 8 + i) < 0.5 ? '0' : '1')).join(' '), 300, 90 + r * 62); }],
  code: ['#ff5a1f', '#ffffff', g => { g.font = '900 170px Inter'; g.fillText('</>', 300, 300); g.font = '700 42px Mono'; g.fillText('hello, world', 300, 470); }],
  sigma: ['#22c08a', '#0f2a20', g => { g.font = '400 220px Serif'; g.fillText('Σ', 300, 300); g.font = 'italic 52px Serif'; g.fillText('n(n+1) / 2', 300, 480); }],
  emc: ['#8a5cff', '#ffffff', g => { g.font = 'italic 150px Serif'; g.fillText('E = mc²', 300, 330); g.font = '700 40px Inter'; g.fillText('FÍSICA', 300, 500); }],
  grad: ['#ff5470', '#ffffff', g => { g.font = 'italic 110px Serif'; g.fillText('∇·E = ρ/ε₀', 300, 330); }],
  bug: ['#ffc12e', '#1b1b2f', g => { g.font = '900 90px Inter'; g.fillText('NO', 300, 220); g.fillText('BUGS', 300, 320); g.font = '700 40px Mono'; g.fillText('git commit -m', 300, 470); }],
};
function poster(Z, kind, x, y, z, w = 0.7, ry = 0) {
  const [bg, fg, draw] = POSTERS[kind];
  const tex = canvasTex(600, 600 * 1.3, (g, W2, H2) => { g.fillStyle = bg; g.fillRect(0, 0, W2, H2); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.translate(0, 60); draw(g); });
  const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = ry; Z.add(p);
  const fr = rbox(w + 0.04, w * 1.3 + 0.04, 0.02, clay(0xf5f5f5, 0.4), 0.008); p.add(fr);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 1.3), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); m.position.z = 0.012; p.add(m); return p;
}
function books(Z, x, y, z, s = 1, n = 5) { const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); Z.add(g); let h = 0;
  for (let i = 0; i < n; i++) { const t = 0.035 + hash(i * 7) * 0.025, b = rbox(0.24 - hash(i) * 0.05, t, 0.17 - hash(i * 3) * 0.03, clay([0xff5a1f, 0x2f6bff, 0x22c08a, 0xffc12e, 0x8a5cff, 0xff5470][i % 6], 0.5), 0.006); b.position.y = h + t / 2; b.rotation.y = (hash(i * 5) - 0.5) * 0.4; g.add(b); h += t; } return g; }
function rubik(Z, x, y, z, s = 0.06) { const g = new THREE.Group(); g.position.set(x, y + s * 1.5, z); g.rotation.y = 0.5; Z.add(g); const cols = [0xff3b30, 0x2f6bff, 0x22c08a, 0xffc12e, 0xffffff, 0xff7a1f];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const c = rbox(s * 0.95, s * 0.95, s * 0.95, clay(cols[Math.floor(hash(i * 9 + j * 3 + k + 13) * 6)], 0.35), s * 0.15); c.position.set(i * s, j * s, k * s); g.add(c); } return g; }
function clock(Z, x, y, z, r = 0.22, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; Z.add(g);
  const f = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 40), clay(0xff5a1f, 0.4)); f.rotation.x = Math.PI / 2; g.add(f);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.85, 40), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (q, w, h) => { q.fillStyle = '#fff'; q.fillRect(0, 0, w, h); q.fillStyle = '#222'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; q.fillRect(128 + Math.sin(a) * 100 - 4, 128 - Math.cos(a) * 100 - 10, 8, 20); } q.strokeStyle = '#222'; q.lineWidth = 10; q.beginPath(); q.moveTo(128, 128); q.lineTo(128, 50); q.moveTo(128, 128); q.lineTo(185, 150); q.stroke(); }) }));
  face.position.z = 0.021; g.add(face); return g; }
function sticky(Z, x, y, z, txt, col = '#ffe14d', ry = 0, rz = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.09), new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.font = '700 30px Mono'; g.textAlign = 'center'; g.fillText(txt, 64, 76); }) }));
  m.position.set(x, y, z); m.rotation.set(0, ry, rz); Z.add(m); return m; }
// símbolos flotando en el espacio (apagados), detrás de cada escena
const FLOAT = [];
function floaters(Z, n = 14, R = 9, y0 = 1.5) {
  const syms = ['π', 'Σ', '∫', '{ }', '</>', '0101', '√x', '∞', 'λ', 'f(x)', 'dx', '∂', '≠', '01'];
  for (let i = 0; i < n; i++) { const l = label(syms[i % syms.length], { size: 120, color: '#7d8bb8', w: 0.9, weight: 700 }); l.material.opacity = 0.35; l.material.fog = false;
    const a = hash(i * 13 + Z.position.x) * Math.PI * 2, r = R * (0.7 + hash(i * 7) * 0.6); l.position.set(Math.cos(a) * r * 1.2, y0 + (hash(i * 3) - 0.3) * 6, -6 - hash(i * 5) * 10); Z.add(l); FLOAT.push({ l, ph: hash(i) * 6, y: l.position.y }); } }

// ---------------------------------------------------------------- tiempos (palabras de la voz)
let WORDS = [], END = 67.6, ENV = [];
const norm = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
function at(word, k = 1) { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if ((exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + word); return 1e9; }
let K = {};

// ---------------------------------------------------------------- materiales y piezas comunes (plástico plastificado, metal)
const plastic = (c, r = 0.22) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.25, sheenColor: 0xffffff });
const metal = (c = 0xd8dde6, r = 0.18) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 1 });
const PL = { blue: 0x46b4ff, green: 0x19e37c, orange: 0xff6a2b, red: 0xff3b4e, yellow: 0xffc12e, violet: 0x8a5cff, white: 0xf4f6fa, teal: 0x22c0b0 };
function dollP(color = PL.blue, s = 1) {      // maniquí articulado de plástico brillante
  const d = makeDoll(color, s); const m = plastic(color, 0.2); d.traverse(o => { if (o.isMesh) o.material = m; }); return d;
}
function arrow(len, color, r = 0.05) {         // flecha gruesa (fuerzas, vectores) a lo largo de +y
  const g = new THREE.Group(), m = plastic(color, 0.25);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len - r * 4, 16), m); sh.position.y = (len - r * 4) / 2; g.add(sh);
  const hd = new THREE.Mesh(new THREE.ConeGeometry(r * 2.4, r * 4.5, 20), m); hd.position.y = len - r * 2.2; g.add(hd);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
function gearGeo(teeth, r, depth, hole = 0.25) {
  const s = new THREE.Shape(), h = r * 0.16, n = teeth * 4;
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, k = i % 4, rr2 = k === 1 || k === 2 ? r + h : r; const x = Math.cos(a) * rr2, y = Math.sin(a) * rr2; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const p = new THREE.Path(); p.absarc(0, 0, r * hole, 0, Math.PI * 2, true); s.holes.push(p);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: r * 0.02, bevelThickness: r * 0.02, bevelSegments: 2, curveSegments: 6 }); g.translate(0, 0, -depth / 2); return g;
}
function carModel(color = PL.red) {            // coche de juguete: piezas separadas para poder desmontarlo
  const g = new THREE.Group(), P = {};
  P.body = rbox(1.9, 0.42, 0.86, plastic(color, 0.15), 0.14); P.body.position.y = 0.36; g.add(P.body);
  P.cabin = rbox(1.0, 0.36, 0.76, plastic(color, 0.15), 0.14); P.cabin.position.set(-0.1, 0.72, 0); g.add(P.cabin);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0c1420, roughness: 0.05, metalness: 0.3, clearcoat: 1 });
  P.win = rbox(0.86, 0.26, 0.78, glass, 0.1); P.win.position.set(-0.1, 0.74, 0); g.add(P.win);
  P.wheels = [];
  for (const [x, z] of [[-0.62, 0.43], [0.62, 0.43], [-0.62, -0.43], [0.62, -0.43]]) {
    const w = new THREE.Group(); w.position.set(x, 0.2, z); g.add(w);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.065, 14, 28), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.7 })); w.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 24), metal()); rim.rotation.x = Math.PI / 2; w.add(rim);
    P.wheels.push(w);
  }
  P.lights = [];
  for (const z of [0.25, -0.25]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 0.4 })); l.position.set(0.95, 0.4, z); l.scale.set(0.4, 1, 1); g.add(l); P.lights.push(l); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData.P = P; return g;
}
// suelo espacial reflectante (como en el vídeo del bucle): reflector + capa oscura + sombras + rejilla
function mirrorFloor(Z, size = 40, dim = 0.82, tint = 0x6f7c99) {
  const refl = new Reflector(new THREE.PlaneGeometry(size, size), { textureWidth: 1024, textureHeight: 1024, color: tint }); refl.rotation.x = -Math.PI / 2; Z.add(refl);
  const d = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color: 0x050812, transparent: true, opacity: dim })); d.rotation.x = -Math.PI / 2; d.position.y = 0.002; Z.add(d);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShadowMaterial({ opacity: 0.5 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.004; sh.receiveShadow = true; Z.add(sh);
  const gr = floorGrid(size, size); gr.position.y = 0.006; Z.add(gr); return refl;
}
function studio(Z, x, power = 1) {               // foco con sombras + contraluces de color
  const key = new THREE.SpotLight(0xffffff, 220 * power, 40, 0.6, 0.6, 1.6); key.position.set(-3, 10, 7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.radius = 5;
  key.target.position.set(0, 0.8, 0); Z.add(key); Z.add(key.target);
  const a = new THREE.PointLight(0x37c6ff, 30 * power, 16, 1.6); a.position.set(-5, 3, -3); Z.add(a);
  const b = new THREE.PointLight(0xa45cff, 26 * power, 16, 1.6); b.position.set(5, 3.5, -3); Z.add(b);
  const f = new THREE.PointLight(0xbfdcff, 14 * power, 20, 1.5); f.position.set(0, 4, 9); Z.add(f);
}
function cota(len, txt, color = '#ffffff') {    // línea de cota con flechas y medida
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color, transparent: true });
  const ln = new THREE.Mesh(new THREE.BoxGeometry(len, 0.012, 0.012), m); g.add(ln);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 10), m); c.rotation.z = s * Math.PI / 2; c.position.x = -s * (len / 2 - 0.04); c.rotation.z = s > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(c);
    const tk = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.012), m); tk.position.x = s * len / 2; g.add(tk); }
  const l = label(txt, { size: 60, w: 0.45, color }); l.position.y = 0.09; g.add(l); g.userData.m = m; g.userData.l = l; return g;
}
const setOp = (g, a) => g.traverse(o => { if (o.material) { o.material.transparent = true; o.material.opacity = a; } });

// ---------------------------------------------------------------- 0 · gancho: diez maniquíes sobre taburetes en el agua, caen tres
const HK = { fall: [1, 3, 7], dirs: [[0.15, 1], [0.35, 1], [-0.2, -1]], t0: [-0.25, 0.1, 0.45] };
function buildHook() {
  const Z = zone('hook', 0);
  // agua: reflector semitransparente (se ve lo que se hunde) + capa con ondas que brilla con el entorno
  // agua: superficie brillante con ondas (refleja la luz del entorno) y fondo azul profundo
  const nrm = canvasTex(512, 512, (g, w, h) => { const id = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = Math.sin(x * 0.07 + Math.sin(y * 0.05) * 2) * 0.5 + Math.sin(y * 0.09 + x * 0.02) * 0.5, b = Math.cos(y * 0.06 + Math.sin(x * 0.04) * 2) * 0.5; const i = (y * w + x) * 4; id.data[i] = 128 + a * 40; id.data[i + 1] = 128 + b * 40; id.data[i + 2] = 255; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); });
  nrm.colorSpace = THREE.NoColorSpace; nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping; nrm.repeat.set(34, 34); S.waterN = nrm;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshPhysicalMaterial({ color: 0x0d4f73, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.55, normalMap: nrm, normalScale: new THREE.Vector2(0.35, 0.35), clearcoat: 1 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.003; water.renderOrder = 3; Z.add(water);
  const deep = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: 0x06304a })); deep.rotation.x = -Math.PI / 2; deep.position.y = -0.55; Z.add(deep);
  // taburetes y maniquíes (dos filas de cinco)
  S.hk = [];
  const seatM = plastic(PL.orange, 0.2), legM = metal(0xc9ced6, 0.2);
  for (let i = 0; i < 10; i++) {
    const row = i < 5 ? 0 : 1, x = ((i % 5) - 2) * 0.52 + (row ? 0.26 : 0), z = row ? -0.85 : 0.45;
    const st = new THREE.Group(); st.position.set(x, 0, z); Z.add(st);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.06, 32), seatM); seat.position.y = 0.6; seat.castShadow = true; st.add(seat);
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2, l = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 2.2, 10), legM); l.position.set(Math.cos(a) * 0.12, -0.45, Math.sin(a) * 0.12); l.rotation.set(Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08); st.add(l); }
    const com = new THREE.Group(); Z.add(com); const d = dollP(i === 6 ? PL.green : PL.blue, 1.0); d.position.y = -0.55; com.add(d);
    S.hk.push({ x, z, com, d, st, fi: HK.fall.indexOf(i) });
  }
  // salpicaduras: gotas (puntos) y ondas (anillos)
  S.splash = HK.fall.map(() => { const n = 120, p = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)), new THREE.PointsMaterial({ color: 0xe6f6ff, size: 0.035, transparent: true, depthWrite: false })); Z.add(p);
    const rings = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.position.y = 0.01; r.renderOrder = 4; Z.add(r); return r; });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.3, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xcfefff, transparent: true, opacity: 0, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })); Z.add(crown);
    return { p, n, rings, crown }; });
  studio(Z, 0, 1.1); floaters(Z);
}
// caída de un maniquí: balanceo sobre el taburete → vuelco sobre los pies → caída libre girando → entra al agua y se hunde
function fallState(o, tau) {
  const [dx, dz] = HK.dirs[o.fi], n = Math.hypot(dx, dz), ux = dx / n, uz = dz / n;
  const feet = v3(o.x, 0.63, o.z), R = 0.55, G = 9.8;
  const thB = tt => { if (tt < 0.5) return 0.08 * Math.sin(tt * 14) * (tt / 0.5) + 0.35 * eio(tt / 0.5); const q = clamp((tt - 0.5) / 0.32); return 0.35 + 1.0 * q * q; };
  const posB = (tt, th) => v3(feet.x + ux * Math.sin(th) * R, feet.y + Math.cos(th) * R, feet.z + uz * Math.sin(th) * R);
  const T1 = 0.82;
  if (tau <= T1) { const th = thB(Math.max(0, tau)); return { pos: posB(tau, th), th, ph: tau < 0.5 ? 0 : 1, ux, uz }; }
  const dt = 1 / 240, th1 = thB(T1), p1 = posB(T1, th1), p0 = posB(T1 - dt, thB(T1 - dt)), v = p1.clone().sub(p0).divideScalar(dt), w = (th1 - thB(T1 - dt)) / dt;
  v.x += ux * 0.6; v.z += uz * 0.6; v.y += 0.4;
  const ballistic = tt => v3(p1.x + v.x * tt, p1.y + v.y * tt - 0.5 * G * tt * tt, p1.z + v.z * tt);
  let hit = null; for (let tt = 0; tt < 2; tt += 1 / 240) { if (ballistic(tt).y < 0.28) { hit = tt; break; } }
  const tt = tau - T1;
  if (tt < hit) return { pos: ballistic(tt), th: th1 + w * 0.8 * tt, ph: 2, ux, uz };
  const ph = ballistic(hit), sub = tt - hit, vy = v.y - G * hit, sink = (-vy * 0.18) * (1 - Math.exp(-sub * 3)) + sub * 0.05;
  return { pos: v3(ph.x + v.x * 0.15 * (1 - Math.exp(-sub * 4)), ph.y - sink, ph.z + v.z * 0.15 * (1 - Math.exp(-sub * 4))), th: th1 + w * 0.8 * hit + 0.6 * (1 - Math.exp(-sub * 3)), ph: 3, ux, uz, hitT: T1 + hit, hitP: ph, sub };
}
function hookAt(t, final) {
  const O = zones.hook.position;
  S.waterN.offset.set(t * 0.02, t * 0.013);
  S.hk.forEach((o, i) => {
    const J = o.d.userData.J, base = Math.sin(t * 1.3 + i) * 0.015;
    // los que se quedan: equilibrio sutil (brazos sueltos y pequeño vaivén)
    if (final || o.fi < 0) {
      o.com.position.set(o.x, 0.63 + 0.55, o.z); o.com.rotation.set(base, 0, base * 0.6);
      J.shL.rotation.set(0.05, 0, -0.12 - 0.04 * Math.sin(t * 2 + i)); J.shR.rotation.set(0.05, 0, 0.12 + 0.04 * Math.sin(t * 2.2 + i)); J.elL.rotation.x = J.elR.rotation.x = -0.15;
      J.chest.rotation.set(0, 0, 0); J.neck.rotation.set(0, 0, 0); J.hpL.rotation.set(0, 0, 0); J.hpR.rotation.set(0, 0, 0); J.knL.rotation.x = J.knR.rotation.x = 0; o.com.visible = true; return;
    }
    const tau = t - HK.t0[o.fi], s = fallState(o, tau), ax = v3(s.uz, 0, -s.ux);
    o.com.position.copy(s.pos); o.com.quaternion.setFromAxisAngle(ax, s.th);
    const k = clamp(tau / 0.5);
    if (s.ph === 0) {   // brazos en molinillo para recuperar el equilibrio, el torso compensa
      const wv = Math.sin(tau * 16);
      J.shL.rotation.set(-0.6 * wv * k, 0, -(1.3 + 0.5 * Math.sin(tau * 18)) * k); J.shR.rotation.set(0.6 * wv * k, 0, (1.3 + 0.5 * Math.sin(tau * 18 + 1)) * k);
      J.elL.rotation.x = J.elR.rotation.x = -0.4 * k; J.chest.rotation.set(-0.35 * s.th, 0, 0.1 * wv * k); J.neck.rotation.set(-0.3 * s.th, 0, 0);
      J.hpL.rotation.x = 0.15 * k * wv; J.hpR.rotation.x = -0.15 * k * wv; J.knL.rotation.x = J.knR.rotation.x = 0.15 * k;
    } else if (s.ph === 1) {   // pierde pie: brazos al frente, rodillas flexionadas
      J.shL.rotation.set(-2.3, 0, -0.6); J.shR.rotation.set(-2.1, 0, 0.6); J.elL.rotation.x = J.elR.rotation.x = -0.5; J.chest.rotation.set(0.25, 0, 0); J.neck.rotation.set(-0.4, 0, 0);
      J.hpL.rotation.x = -0.6; J.hpR.rotation.x = 0.1; J.knL.rotation.x = 0.9; J.knR.rotation.x = 0.4;
    } else {                    // en el aire: brazos agitándose, piernas pataleando; bajo el agua se relajan
      const fl = s.ph === 2 ? 1 : Math.exp(-(s.sub || 0) * 2.5);
      J.shL.rotation.set(-2.7 + 0.5 * Math.sin(t * 24) * fl, 0, -0.9 * fl); J.shR.rotation.set(-2.5 + 0.5 * Math.sin(t * 22 + 2) * fl, 0, 0.9 * fl);
      J.elL.rotation.x = -0.6 - 0.4 * Math.sin(t * 20) * fl; J.elR.rotation.x = -0.6 - 0.4 * Math.sin(t * 19 + 1) * fl;
      J.hpL.rotation.x = -0.7 + 0.5 * Math.sin(t * 18) * fl; J.hpR.rotation.x = -0.2 + 0.5 * Math.sin(t * 18 + 3) * fl; J.knL.rotation.x = 1.0; J.knR.rotation.x = 0.6 + 0.3 * Math.sin(t * 16) * fl;
      J.chest.rotation.set(0.35, 0, 0); J.neck.rotation.set(-0.5, 0, 0);
    }
    // salpicadura
    const sp = S.splash[o.fi];
    if (s.ph === 3) {
      const q = s.sub, arr = sp.p.geometry.attributes.position.array;
      for (let k2 = 0; k2 < sp.n; k2++) { const a = hash(k2 + o.fi * 99) * Math.PI * 2, sp0 = 0.9 + hash(k2 * 3) * 1.8, up = 1.6 + hash(k2 * 7) * 2.6;
        arr[k2 * 3] = s.hitP.x + Math.cos(a) * sp0 * q * 0.7; arr[k2 * 3 + 1] = Math.max(-0.05, up * q - 4.9 * q * q); arr[k2 * 3 + 2] = s.hitP.z + Math.sin(a) * sp0 * q * 0.7; }
      sp.p.geometry.attributes.position.needsUpdate = true; sp.p.material.opacity = 0.95 * Math.max(0, 1 - q / 0.9);
      sp.rings.forEach((r, k2) => { const qq = q - k2 * 0.18; r.visible = qq > 0; if (qq > 0) { r.position.set(s.hitP.x, 0.012, s.hitP.z); r.scale.setScalar(0.25 + qq * 1.3); r.material.opacity = 0.55 * Math.max(0, 1 - qq / 1.6); } });
      sp.crown.visible = q < 0.5; sp.crown.position.set(s.hitP.x, 0.12 + q * 0.3, s.hitP.z); sp.crown.scale.set(1 + q * 2.2, 0.4 + q * 2, 1 + q * 2.2); sp.crown.material.opacity = 0.5 * (1 - q / 0.5);
    } else { sp.p.material.opacity = 0; sp.rings.forEach(r => (r.visible = false)); sp.crown.visible = false; }
  });
  if (final) S.splash.forEach(sp => { sp.p.material.opacity = 0; sp.rings.forEach(r => (r.visible = false)); sp.crown.visible = false; });
  const u = final ? eio(prog(t, K.tu, END - K.tu)) : eio(clamp((t + 0.2) / 3.4));
  cam.position.set(O.x + 0.13, lerp(2.9, 2.5, u), lerp(6.9, 6.1, u)); cam.lookAt(O.x + 0.13, 0.75, -0.2);
}

// ---------------------------------------------------------------- 1 · manómetro: 31,25 % en un solo año
function buildGauge() {
  const Z = zone('gauge', 100); mirrorFloor(Z); floaters(Z);
  const g = new THREE.Group(); g.position.set(0, 1.9, 0); Z.add(g); S.gauge = g;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.3, 64), metal(0xd9dde4, 0.15)); body.rotation.x = Math.PI / 2; g.add(body);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.07, 16, 64), metal(0xffc12e, 0.2)); bezel.position.z = 0.15; g.add(bezel);
  const face = canvasTex(1024, 1024, (q, w, h) => { q.fillStyle = '#f7f8fb'; q.beginPath(); q.arc(512, 512, 500, 0, 7); q.fill();
    q.strokeStyle = '#ff3b4e'; q.lineWidth = 46; q.beginPath(); q.arc(512, 512, 410, (135 + 270 * 0.7) * Math.PI / 180, (135 + 270) * Math.PI / 180); q.stroke();
    q.fillStyle = '#1b1d24'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.font = '700 54px Inter';
    for (let k = 0; k <= 50; k++) { const a = (135 + 270 * k / 50) * Math.PI / 180, big = k % 5 === 0; q.save(); q.translate(512 + Math.cos(a) * 440, 512 + Math.sin(a) * 440); q.rotate(a + Math.PI / 2); q.fillRect(-(big ? 5 : 2), 0, big ? 10 : 4, big ? 54 : 28); q.restore(); if (big) q.fillText(String(k * 2), 512 + Math.cos(a) * 345, 512 + Math.sin(a) * 345); }
    q.font = '800 46px Inter'; q.fillStyle = '#6b7280'; q.fillText('ABANDONO %', 512, 700); });
  const fm = new THREE.Mesh(new THREE.CircleGeometry(1.02, 64), new THREE.MeshStandardMaterial({ map: face, roughness: 0.4 })); fm.position.z = 0.152; g.add(fm);
  const gl = new THREE.Mesh(new THREE.CircleGeometry(1.05, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.12, clearcoat: 1 })); gl.position.z = 0.2; g.add(gl);
  S.needle = new THREE.Group(); S.needle.position.z = 0.17; g.add(S.needle);
  const nd = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.88, 0.02), plastic(PL.red, 0.2)); nd.position.y = 0.36; S.needle.add(nd);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 24), metal(0x2a2c31, 0.3)); cap.rotation.x = Math.PI / 2; S.needle.add(cap);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.9, 24), metal(0xd38b4a, 0.25)); pipe.position.y = 0.75; Z.add(pipe);
  const pipeH = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6, 24), metal(0xd38b4a, 0.25)); pipeH.rotation.z = Math.PI / 2; pipeH.position.set(0, 0.2, -0.3); Z.add(pipeH);
  S.gTxt = canvasTex(1000, 260); S.gLab = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.62), new THREE.MeshBasicMaterial({ map: S.gTxt, transparent: true, depthWrite: false })); S.gLab.position.set(0, 3.55, 0.3); Z.add(S.gLab);
  studio(Z, 100);
}
function gaugeAt(t) {
  const O = zones.gauge.position, t0 = ZT.find(z => z[0] === 'gauge')[1];
  const k = prog(t, K.treinta - 0.1, K.ciento - K.treinta + 0.4), val = 31.25 * (k < 1 ? eio(k) : 1) + (k >= 1 ? 1.2 * Math.exp(-(t - K.ciento - 0.3) * 5) * Math.sin((t - K.ciento) * 22) : 0) + 0.15 * Math.sin(t * 40) * (k > 0 && k < 1 ? 1 : 0);
  S.needle.rotation.z = -((135 + 270 * val / 100) * Math.PI / 180) + Math.PI / 2 + Math.PI;
  const g = S.gTxt.userData.g; g.clearRect(0, 0, 1000, 260); g.fillStyle = 'rgba(20,22,26,.85)'; rr(g, 40, 20, 920, 220, 110); g.fill();
  g.fillStyle = '#ffffff'; g.font = '900 150px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`${Math.min(31.25, Math.max(0, val)).toFixed(2).replace('.', ',')} %`, 500, 138); S.gTxt.needsUpdate = true;
  S.gLab.material.opacity = env(t, K.treinta - 0.2, 99, 0.25, 0.1);
  const u = eio(prog(t, t0, 4.5)); cam.position.set(O.x, lerp(2.3, 2.5, u), lerp(7.6, 6.4, u)); cam.lookAt(O.x, 2.3, 0);
}

// ---------------------------------------------------------------- 2 · balanza: «¿merece la pena?» (vuelve antes de la respuesta)
function buildScale() {
  const Z = zone('scale', 200); mirrorFloor(Z); floaters(Z);
  const brass = metal(0xe3b34c, 0.2);
  const base = rbox(1.2, 0.16, 0.8, plastic(0x22252c, 0.3), 0.06); base.position.y = 0.08; Z.add(base);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 24), brass); col.position.y = 1.2; Z.add(col);
  S.beam = new THREE.Group(); S.beam.position.y = 2.3; Z.add(S.beam);
  const bm = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.1), brass); S.beam.add(bm);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), brass); S.beam.add(knob);
  S.pans = [-1, 1].map(s => { const p = new THREE.Group(); p.position.x = s * 1.3; S.beam.add(p);
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2, ch = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.0, 6), brass); ch.position.set(Math.cos(a) * 0.2, -0.5, Math.sin(a) * 0.2); ch.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2); p.add(ch); }
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.32, 0.08, 40), brass); pan.position.y = -1.0; p.add(pan); return p; });
  const q = rbox(0.5, 0.5, 0.5, plastic(PL.blue, 0.2), 0.08); q.position.y = -0.7; S.pans[0].add(q); const ql = label('?', { size: 200, w: 0.32 }); ql.position.set(0, -0.7, 0.26); S.pans[0].add(ql);
  const gr = new THREE.Mesh(gearGeo(12, 0.22, 0.12), plastic(PL.orange, 0.2)); gr.position.y = -0.68; gr.rotation.x = 0; S.pans[1].add(gr); S.panGear = gr;
  studio(Z, 200);
}
function scaleAt(t, second) {
  const O = zones.scale.position, t0 = ZT.find(z => z[0] === (second ? 'scale2' : 'scale'))[1];
  const key = second ? K.pena2 : K.pena, kick = Math.exp(-Math.max(0, t - key) * 2.2) * (t > key ? 1 : 0);
  const a = 0.22 * Math.sin((t - t0) * 2.6) * Math.exp(-(t - t0) * 0.5) + 0.12 * Math.sin((t - key) * 7) * kick;
  S.beam.rotation.z = a; S.pans.forEach(p => (p.rotation.z = -a)); S.panGear.rotation.z = t * 1.5;
  const u = eio(prog(t, t0, 3)); cam.position.set(O.x, lerp(2.0, 2.2, u), lerp(7.4, 6.2, u)); cam.lookAt(O.x, 1.7, 0);
}

// ---------------------------------------------------------------- 3 · motor de cuatro cilindros (con tapa de cristal): «no va solo de motores»
function buildEngine() {
  const Z = zone('engine', 300); mirrorFloor(Z); floaters(Z);
  const e = new THREE.Group(); e.position.y = 1.1; Z.add(e); S.eng = e;
  const blk = rbox(2.6, 1.2, 1.1, new THREE.MeshPhysicalMaterial({ color: 0xff3b4e, roughness: 0.25, transparent: true, opacity: 0.35, clearcoat: 1, depthWrite: false }), 0.08); e.add(blk);
  const head = rbox(2.7, 0.3, 1.15, plastic(PL.red, 0.2), 0.06); head.position.y = 0.8; e.add(head);
  const cover = rbox(2.4, 0.18, 0.8, metal(0xd9dde4, 0.15), 0.08); cover.position.y = 1.03; e.add(cover);
  const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.8, 16), metal(0xb8bcc4, 0.2)); crank.rotation.z = Math.PI / 2; crank.position.y = -0.45; e.add(crank); S.crank = crank;
  S.pist = [-0.9, -0.3, 0.3, 0.9].map((x, i) => { const p = new THREE.Group(); p.position.x = x; e.add(p);
    const head2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 32), metal(0xe6e9ef, 0.12)); p.add(head2);
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.05), metal(0x9aa0aa, 0.25)); rod.position.y = -0.35; p.add(rod); return { p, i }; });
  const plugs = [-0.9, -0.3, 0.3, 0.9].map(x => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 12), plastic(PL.yellow)); s.position.set(x, 1.2, 0); e.add(s); return s; });
  S.flashes = [-0.9, -0.3, 0.3, 0.9].map(x => { const f = new THREE.PointLight(0xffa040, 0, 2, 2); f.position.set(x, 0.55, 0.3); e.add(f); return f; });
  studio(Z, 300);
}
function engineAt(t) {
  const O = zones.engine.position, t0 = ZT.find(z => z[0] === 'engine')[1];
  const rpm = lerp(3, 14, eio(prog(t, K.motores - 0.4, 0.6)));
  const ph = (t - t0) * rpm;
  S.pist.forEach(({ p, i }) => { const a = ph + [0, Math.PI, Math.PI, 0][i]; p.position.y = 0.15 + 0.22 * Math.cos(a); S.flashes[i].intensity = Math.max(0, Math.cos(a)) > 0.97 ? 6 : 0; });
  S.crank.rotation.x = ph; S.eng.rotation.y = 0.0 + 0.04 * Math.sin(t * 0.7);
  const u = eio(prog(t, t0, 2.4)); cam.position.set(O.x, lerp(2.3, 2.6, u), lerp(10.2, 9.0, u)); cam.lookAt(O.x, 1.45, 0);
}

// ---------------------------------------------------------------- 4 · taller: banco, llave inglesa y un coche que se desmonta con cotas
function buildTaller() {
  const Z = zone('taller', 400); mirrorFloor(Z, 40, 0.86); floaters(Z);
  const top = rbox(4.4, 0.12, 1.3, plastic(0xe0a46a, 0.45), 0.03); top.position.set(0, 0.9, -0.4); Z.add(top);
  for (const x of [-2, 2]) for (const z of [-0.95, 0.15]) { const l = rbox(0.1, 0.9, 0.1, metal(0x3a3f48, 0.3), 0.02); l.position.set(x, 0.45, z - 0.4 + 0.4); Z.add(l); }
  const board = rbox(4.4, 2.0, 0.06, plastic(0xf3eadc, 0.6), 0.02); board.position.set(0, 2.1, -1.1); Z.add(board);
  const toolsC = [PL.red, PL.blue, PL.yellow, PL.green, PL.orange, PL.violet];
  for (let i = 0; i < 9; i++) { const tl = rbox(0.08, 0.5 + hash(i) * 0.4, 0.04, plastic(toolsC[i % 6]), 0.02); tl.position.set(-1.9 + i * 0.47, 2.2 + (hash(i * 3) - 0.5) * 0.3, -1.05); tl.rotation.z = (hash(i * 5) - 0.5) * 0.3; Z.add(tl); }
  // llave inglesa
  const wr = new THREE.Group(); Z.add(wr); S.wrench = wr; const wm = metal(0xe6e9ef, 0.12);
  const hd = rbox(0.5, 0.36, 0.08, wm, 0.06); hd.position.y = 0.95; wr.add(hd); const jaw = rbox(0.18, 0.28, 0.08, new THREE.MeshBasicMaterial({ color: 0x0b1020 }), 0.03); jaw.position.set(0.08, 1.06, 0.001); wr.add(jaw);
  const hdl = rbox(0.16, 1.0, 0.07, wm, 0.06); hdl.position.y = 0.3; wr.add(hdl); const grip = rbox(0.19, 0.5, 0.09, plastic(PL.red), 0.06); grip.position.y = 0.1; wr.add(grip);
  wr.traverse(o => { if (o.isMesh) o.castShadow = true; });
  // coche y cotas
  S.car = carModel(PL.red); S.car.position.set(0, 0.96, -0.3); Z.add(S.car);
  S.cotas = [cota(1.9, '1900'), cota(0.86, '860'), cota(0.75, '750')]; S.cotas.forEach(c => Z.add(c));
  studio(Z, 400);
}
function tallerAt(t) {
  const O = zones.taller.position, t0 = ZT.find(z => z[0] === 'taller')[1];
  const wk = eo(prog(t, K.llave - 0.15, 0.5));
  S.wrench.position.set(-1.35, 0.96 + 0.6 * wk + 0.05 * Math.sin(t * 2), 0.2); S.wrench.rotation.set(0, (t - K.llave) * 1.5 * wk, -0.4 + 0.4 * wk); S.wrench.scale.setScalar(0.3 + 0.7 * wk); S.wrench.visible = wk > 0.01;
  const ck = eo(prog(t, K.coche - 0.15, 0.4)), ex = eio(prog(t, K.desmontado - 0.05, 0.6)), P = S.car.userData.P;
  S.car.visible = ck > 0.01; S.car.scale.setScalar(0.4 + 0.6 * ck); S.car.position.set(0.55, 0.96, -0.3); S.car.rotation.y = -0.35 + 0.2 * Math.sin(t * 0.6);
  P.cabin.position.set(-0.1, 0.72 + 0.65 * ex, 0); P.win.position.set(-0.1, 0.74 + 0.95 * ex, 0); P.body.position.y = 0.36 + 0.25 * ex;
  P.wheels.forEach((w, i) => { const [x, z] = [[-0.62, 0.43], [0.62, 0.43], [-0.62, -0.43], [0.62, -0.43]][i]; w.position.set(x * (1 + 0.6 * ex), 0.2 - 0.05 * ex, z * (1 + 1.2 * ex)); w.rotation.y = ex * 1.2; });
  const ca = eo(prog(t, K.desmontado + 0.25, 0.4));
  S.cotas[0].position.set(O.x * 0 + 0.55, 1.95 + 0.6, 0.6); S.cotas[1].position.set(1.9, 1.3, 0.6); S.cotas[1].rotation.z = Math.PI / 2; S.cotas[2].position.set(-0.8, 1.9, 0.6); S.cotas[2].rotation.z = Math.PI / 2;
  S.cotas.forEach(c => { c.visible = ca > 0.01; setOp(c, ca); c.userData.l.lookAt(cam.position); });
  const u = eio(prog(t, t0, 3.6)); cam.position.set(O.x, lerp(2.8, 2.5, u), lerp(9.6, 8.6, u)); cam.lookAt(O.x, 1.5, 0);
}

// ---------------------------------------------------------------- 5 · clase: «y llegarás. Pero antes, matemáticas»
function buildMclass() {
  const Z = zone('mcls', 500);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(7, 5.5), clay(C.floor, 0.85)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; Z.add(fl);
  mirrorFloor(Z); fl.position.y = 0.01;
  for (const [x, z, w, d] of [[0, -2.75, 7, 0.15], [-3.5, 0, 0.15, 5.5]]) { const wl = rbox(w, 1.4, d, clay(C.wall, 0.8), 0.03); wl.position.set(x, 0.7, z); Z.add(wl); }
  S.mBoardTex = canvasTex(1200, 360); S.mBoard = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.08), new THREE.MeshStandardMaterial({ map: S.mBoardTex, roughness: 0.9 })); S.mBoard.position.set(0.2, 0.85, -2.66); Z.add(S.mBoard);
  S.mProf = dollP(PL.orange, 1.1); S.mProf.position.set(1.75, 0.01, -2.2); Z.add(S.mProf);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = (c - 1.5) * 1.3, z = -0.6 + r * 1.2; const d = desk(); d.position.set(x, 0.01, z); Z.add(d); const p = dollP(hash(r * 4 + c) < 0.3 ? PL.green : PL.blue); p.position.set(x, 0.01, z + 0.3); p.rotation.y = Math.PI; sit(p); Z.add(p); }
  lamp(Z, -3.05, -2.3, 1.4, 1.8); plant(Z, 3.0, -2.3, 1.2); poster(Z, 'pi', -2.6, 0.8, -2.66, 0.5); poster(Z, 'sigma', 2.65, 0.8, -2.66, 0.5); clock(Z, -1.75, 1.15, -2.66, 0.12); floaters(Z);
  lights(Z, 500); Z.add(new THREE.HemisphereLight(0xbfd0ff, 0x2a1d16, 1.2));
}
function mclsAt(t) {
  const O = zones.mcls.position, t0 = ZT.find(z => z[0] === 'mcls')[1], g = S.mBoardTex.userData.g;
  g.fillStyle = '#1f5a40'; g.fillRect(0, 0, 1200, 360); g.strokeStyle = '#b8763a'; g.lineWidth = 18; g.strokeRect(0, 0, 1200, 360);
  const er = prog(t, K.pero - 0.1, 0.35);
  if (er < 1) { g.globalAlpha = 1 - er; g.strokeStyle = '#eef3ef'; g.lineWidth = 7; g.beginPath(); g.moveTo(420, 230); g.lineTo(470, 160); g.lineTo(700, 160); g.lineTo(780, 230); g.lineTo(820, 230); g.lineTo(820, 270); g.lineTo(380, 270); g.lineTo(380, 230); g.closePath(); g.stroke(); for (const x of [470, 730]) { g.beginPath(); g.arc(x, 275, 32, 0, 7); g.stroke(); } g.globalAlpha = 1; }
  const k = prog(t, K.matematicas - 0.35, 0.6); g.fillStyle = '#eef3ef'; g.font = '800 130px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; const tx = 'MATEMÁTICAS'; g.fillText(tx.slice(0, Math.ceil(tx.length * k)), 600, 185);
  S.mBoardTex.needsUpdate = true;
  const J = S.mProf.userData.J; J.shR.rotation.set(-2.2 + Math.sin(t * 8) * 0.2 * k, 0, 0.2); J.elR.rotation.x = -0.3; S.mProf.rotation.y = Math.PI + 0.3;
  const u = eio(prog(t, t0, 2.7)); cam.position.set(O.x, lerp(6.2, 4.0, u), lerp(9, 6.2, u) - 0.6); cam.lookAt(O.x, 0.5, lerp(0, -1.4, u));
}

// ---------------------------------------------------------------- 6 · cálculo infinitesimal en plano azul: derivada (tangente) e integral (rodajas)
function buildCalc() {
  const Z = zone('calc', 600); mirrorFloor(Z); floaters(Z);
  const fr = rbox(4.6, 3.4, 0.12, metal(0xd9dde4, 0.2), 0.06); fr.position.set(0, 2.1, -0.07); Z.add(fr);
  S.calcTex = canvasTex(1400, 1030); const bd = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.24), new THREE.MeshBasicMaterial({ map: S.calcTex, toneMapped: false })); bd.position.set(0, 2.1, 0); Z.add(bd);
  for (const x of [-1.8, 1.8]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 10), metal(0x3a3f48)); l.position.set(x, 0.2, -0.05); Z.add(l); }
  studio(Z, 600, 0.6);
}
function calcAt(t) {
  const O = zones.calc.position, t0 = ZT.find(z => z[0] === 'calc')[1], g = S.calcTex.userData.g, w = 1400, h = 1030;
  g.fillStyle = '#0d47a1'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2;
  for (let x = 0; x < w; x += 50) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 50) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  const X0 = 140, Y0 = 860, SX = 1120, SY = 560, f = q => 0.25 + 0.55 * Math.sin(q * Math.PI * 0.9) * (0.6 + q * 0.5) * 0.9, P = q => [X0 + q * SX, Y0 - f(q) * SY];
  g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.moveTo(X0, Y0); g.lineTo(X0 + SX + 40, Y0); g.moveTo(X0, Y0); g.lineTo(X0, 180); g.stroke();
  const ck = prog(t, t0, 0.8); g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.beginPath(); for (let i = 0; i <= 200 * ck; i++) { const [x, y] = P(i / 200); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  // integral: rodajas cada vez más finas
  const ik = prog(t, K.integrales - 0.1, 1.6);
  if (ik > 0) { const n = [4, 8, 16, 32, 96][Math.min(4, Math.floor(ik * 5))]; g.globalAlpha = 0.75 * Math.min(1, ik * 4); g.fillStyle = '#ffc12e'; g.strokeStyle = '#0d47a1'; g.lineWidth = n > 40 ? 0 : 3;
    for (let i = 0; i < n; i++) { const q = (i + 0.5) / n, [x, y] = P(i / n); const yy = Y0 - f(q) * SY; g.fillRect(x, yy, SX / n, Y0 - yy); if (n <= 40) g.strokeRect(x, yy, SX / n, Y0 - yy); } g.globalAlpha = 1;
    g.fillStyle = '#ffffff'; g.font = '700 60px Serif'; g.fillText(`n = ${n}`, 1050, 140); }
  // derivada: tangente que se desliza
  const dk = env(t, K.derivadas - 0.1, K.integrales - 0.05, 0.25, 0.25);
  if (dk > 0) { const q = 0.08 + ((t - K.derivadas) * 0.32) % 0.84, [x, y] = P(q), e = 0.002, sl = (P(q + e)[1] - P(q - e)[1]) / (P(q + e)[0] - P(q - e)[0]); g.globalAlpha = dk;
    g.strokeStyle = '#ff6a2b'; g.lineWidth = 7; g.beginPath(); g.moveTo(x - 260, y - sl * 260); g.lineTo(x + 260, y + sl * 260); g.stroke(); g.fillStyle = '#ff6a2b'; g.beginPath(); g.arc(x, y, 16, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.font = 'italic 64px Serif'; g.fillText(`f '(x) = ${(-sl * SX / SY).toFixed(2)}`, 760, 140); g.globalAlpha = 1; }
  g.fillStyle = '#ffffff'; g.font = '800 54px Inter'; g.fillText('CÁLCULO INFINITESIMAL', 70, 80); g.font = 'italic 60px Serif'; if (ik > 0.6) g.fillText('∫ f(x) dx', 160, 960);
  S.calcTex.needsUpdate = true;
  const u = eio(prog(t, t0, 5.5)); cam.position.set(O.x, 2.1, lerp(12.8, 12.0, u)); cam.lookAt(O.x, 2.1, 0);
}

// ---------------------------------------------------------------- 7 · álgebra lineal: vectores de fuerza sobre una pieza, una matriz los gira
function buildAlg() {
  const Z = zone('alg', 700); mirrorFloor(Z); floaters(Z);
  const part = new THREE.Group(); part.position.y = 1.7; Z.add(part); S.part = part;
  const pm = plastic(PL.white, 0.25);
  const a = rbox(1.6, 0.25, 0.8, pm, 0.06); part.add(a); const b = rbox(0.25, 1.2, 0.8, pm, 0.06); b.position.set(-0.68, 0.48, 0); part.add(b);
  for (const x of [0.3, 0.6]) { const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.27, 24), new THREE.MeshBasicMaterial({ color: 0x0b1020 })); hl.position.set(x, 0, 0); part.add(hl); }
  S.vecs = [[PL.red, 1.1], [PL.green, 0.9], [PL.blue, 1.0]].map(([c, l], i) => { const ar = arrow(l, c, 0.045); ar.position.set([0.45, -0.68, 0.0][i], [0.15, 1.1, 0.15][i], [0, 0, 0.42][i]); part.add(ar); return ar; });
  S.matTex = canvasTex(700, 300); S.matB = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.82), new THREE.MeshBasicMaterial({ map: S.matTex, transparent: true, depthWrite: false })); S.matB.position.set(0, 3.55, 0.3); Z.add(S.matB);
  studio(Z, 700);
}
function algAt(t) {
  const O = zones.alg.position, t0 = ZT.find(z => z[0] === 'alg')[1];
  const vk = eo(prog(t, K.vectores - 0.1, 0.45)), mk = eio(prog(t, K.matrices, 0.7)), sk = eio(prog(t, K.mover - 0.1, 1.4));
  S.vecs.forEach((v, i) => { v.scale.setScalar(Math.max(0.001, vk)); v.rotation.set([0, 0, Math.PI / 2][i] + mk * [0.6, -0.5, 0.4][i], 0, [0.3, -0.2, 0][i] + mk * [-0.8, 0.7, 0.5][i]); });
  S.part.rotation.set(0.25 + sk * 0.5, -0.4 + (t - t0) * 0.15 + sk * Math.PI * 0.9, sk * 0.3);
  const g = S.matTex.userData.g; g.clearRect(0, 0, 700, 300); g.fillStyle = 'rgba(20,22,26,.85)'; rr(g, 0, 0, 700, 300, 40); g.fill();
  const m = mk > 0.5 ? [['cos', '−sen', '0'], ['sen', 'cos', '0'], ['0', '0', '1']] : [['1', '0', '0'], ['0', '1', '0'], ['0', '0', '1']];
  g.font = '700 60px Mono'; g.textAlign = 'center'; g.textBaseline = 'middle'; m.forEach((row, i) => row.forEach((v, j) => { g.fillStyle = mk > 0.5 && i < 2 && j < 2 ? '#19e37c' : '#f0f0f0'; g.fillText(v, 180 + j * 170, 65 + i * 85); }));
  g.strokeStyle = '#f0f0f0'; g.lineWidth = 8; g.beginPath(); g.moveTo(90, 25); g.lineTo(60, 25); g.lineTo(60, 275); g.lineTo(90, 275); g.moveTo(610, 25); g.lineTo(640, 25); g.lineTo(640, 275); g.lineTo(610, 275); g.stroke();
  S.matTex.needsUpdate = true; S.matB.material.opacity = env(t, K.matrices - 0.15, 99, 0.25, 0.1);
  const u = eio(prog(t, t0, 4)); cam.position.set(O.x, lerp(2.3, 2.5, u), lerp(7.8, 6.8, u)); cam.lookAt(O.x, 2.1, 0);
}

// ---------------------------------------------------------------- 8 · física: fuerzas (bloque empujado), ondas (muelle) y electromagnetismo (bobina)
function buildFis() {
  const Z = zone('fis', 800); mirrorFloor(Z); floaters(Z);
  // fuerzas
  S.blk = rbox(0.8, 0.8, 0.8, plastic(PL.orange), 0.08); S.blk.position.set(-3.2, 0.4, 0); Z.add(S.blk);
  S.fArrow = arrow(1.2, PL.red, 0.06); S.fArrow.rotation.z = -Math.PI / 2; Z.add(S.fArrow);
  // ondas: muelle
  S.springPts = 160; S.spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(0, 0, 0), v3(1, 0, 0)]), 8, 0.03, 8), plastic(PL.blue)); Z.add(S.spring);
  // electromagnetismo: bobina + imán + líneas de campo
  const coil = new THREE.Group(); coil.position.set(3.2, 1.1, 0); Z.add(coil); S.coil = coil;
  const pts = []; for (let i = 0; i <= 400; i++) { const a = i / 400 * Math.PI * 2 * 9; pts.push(v3(-0.7 + i / 400 * 1.4, Math.cos(a) * 0.35, Math.sin(a) * 0.35)); }
  coil.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 900, 0.03, 8), metal(0xd38b4a, 0.2)));
  const mg = new THREE.Group(); coil.add(mg); S.magnet = mg; const n1 = rbox(0.6, 0.22, 0.22, plastic(PL.red), 0.04); n1.position.x = 0.3; mg.add(n1); const s1 = rbox(0.6, 0.22, 0.22, plastic(PL.blue), 0.04); s1.position.x = -0.3; mg.add(s1);
  S.fieldL = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, p2 = []; for (let k = 0; k <= 60; k++) { const q = k / 60 * Math.PI; p2.push(v3(-Math.cos(q) * 1.3, Math.sin(q) * (0.5 + 0.35 * (i % 2)) * Math.cos(a), Math.sin(q) * (0.5 + 0.35 * (i % 2)) * Math.sin(a))); }
    const l = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p2), 60, 0.012, 6), new THREE.MeshBasicMaterial({ color: 0xff5470, transparent: true })); coil.add(l); S.fieldL.push(l); }
  S.lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffc860, emissiveIntensity: 0 })); S.lamp.position.set(3.2, 1.95, 0); Z.add(S.lamp);
  studio(Z, 800);
}
function fisAt(t) {
  const O = zones.fis.position, t0 = ZT.find(z => z[0] === 'fis')[1];
  const fk = eo(prog(t, K.fuerzas - 0.05, 0.3)), push = Math.max(0, t - K.fuerzas);
  S.blk.position.x = -3.2 + 0.5 * push * push; S.fArrow.position.set(S.blk.position.x - 1.6, 0.45, 0.3); S.fArrow.scale.setScalar(Math.max(0.001, fk));
  const wk = prog(t, K.ondas - 0.1, 0.3), pts = []; for (let i = 0; i <= S.springPts; i++) { const q = i / S.springPts, a = q * Math.PI * 2 * 14; const amp = wk * 0.35 * Math.sin(q * 6 * Math.PI - (t - K.ondas) * 9) * Math.exp(-q * 0.4); pts.push(v3(-1 + q * 2, 1.1 + amp + Math.cos(a) * 0.12, Math.sin(a) * 0.12)); }
  S.spring.geometry.dispose(); S.spring.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.022, 6);
  const ek = prog(t, K.electromagnetismo - 0.1, 0.5); S.magnet.position.x = 0.5 * Math.sin((t - K.electromagnetismo) * 6) * ek; S.fieldL.forEach((l, i) => (l.material.opacity = ek * (0.6 + 0.4 * Math.sin(t * 6 + i)))); S.lamp.material.emissiveIntensity = ek * (2 + 1.5 * Math.abs(Math.cos((t - K.electromagnetismo) * 6)));
  const cx = t < K.ondas - 0.15 ? -3.6 : t < K.electromagnetismo - 0.15 ? 0 : 3.0, sm = eio(prog(t, t < K.ondas - 0.15 ? t0 : t < K.electromagnetismo - 0.15 ? K.ondas - 0.15 : K.electromagnetismo - 0.15, 0.35));
  S.fisX = S.fisX ?? -2.6; const from = t < K.ondas - 0.15 ? -3.6 : t < K.electromagnetismo - 0.15 ? -3.6 : 0; const x = lerp(from, cx, sm);
  cam.position.set(O.x + x, 1.6, 5.6); cam.lookAt(O.x + x, 1.05, 0);
}

// ---------------------------------------------------------------- 9 · dos puentes de celosía: uno aguanta y el otro se cae
function truss(len, h, m) {
  const g = new THREE.Group(), bars = [], n = 6, dx = len / n;
  const add = (a, b) => { const d = b.clone().sub(a), L = d.length(), bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, L, 8), m.clone()); bar.position.copy(a).add(b).multiplyScalar(0.5); bar.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize()); bar.castShadow = true; g.add(bar); bars.push({ bar, mid: bar.position.clone(), q: bar.quaternion.clone() }); };
  for (const z of [-0.35, 0.35]) for (let i = 0; i < n; i++) { const x0 = -len / 2 + i * dx, x1 = x0 + dx; add(v3(x0, 0, z), v3(x1, 0, z)); add(v3(x0, h, z), v3(x1, h, z)); add(v3(x0, 0, z), v3(x0, h, z)); add(i % 2 ? v3(x0, h, z) : v3(x0, 0, z), i % 2 ? v3(x1, 0, z) : v3(x1, h, z)); if (i === n - 1) add(v3(x1, 0, z), v3(x1, h, z)); }
  for (let i = 0; i <= n; i++) add(v3(-len / 2 + i * dx, 0, -0.35), v3(-len / 2 + i * dx, 0, 0.35));
  const deck = rbox(len, 0.06, 0.8, plastic(0x2a2c31, 0.4), 0.02); deck.position.y = -0.03; g.add(deck); g.userData = { bars, deck }; return g;
}
function buildBridge() {
  const Z = zone('bridge', 900); mirrorFloor(Z); floaters(Z);
  S.br = [-1.35, 1.35].map((x, i) => { const g = truss(2.2, 0.5, plastic(i ? PL.orange : PL.green, 0.3)); g.position.set(x, 1.0, 0); Z.add(g);
    for (const s of [-1, 1]) { const p = rbox(0.3, 1.0, 1.0, plastic(0xc9ced6, 0.4), 0.04); p.position.set(x + s * 1.2, 0.5, 0); Z.add(p); }
    const load = rbox(0.4, 0.3, 0.5, plastic(PL.yellow), 0.05); Z.add(load); return { g, x, load }; });
  studio(Z, 900);
}
function bridgeAt(t) {
  const O = zones.bridge.position, t0 = ZT.find(z => z[0] === 'bridge')[1];
  S.br.forEach((b, i) => {
    const lk = eio(prog(t, K.puente - 0.1, 0.9)); b.load.position.set(b.x - 0.8 + 0.8 * lk, 1.18 + 0.03 * Math.sin(t * 10), 0);
    const ck = i === 1 ? prog(t, K.cae - 0.35, 1.2) : 0;
    b.g.userData.bars.forEach((o, k) => { const h = hash(k + 7); if (ck > 0) { const tt = ck * 1.2; o.bar.position.set(o.mid.x + (h - 0.5) * tt, o.mid.y - 4.9 * tt * tt * (0.6 + h * 0.6), o.mid.z + (hash(k * 3) - 0.5) * tt); o.bar.rotation.set(tt * 4 * (h - 0.5), 0, tt * 5 * (hash(k * 5) - 0.5)); o.bar.material.color.set(0xff3b4e); } else { o.bar.position.copy(o.mid); o.bar.quaternion.copy(o.q); } });
    const dk = b.g.userData.deck; if (ck > 0) { dk.rotation.z = -ck * 1.2; dk.position.y = -0.03 - 3 * ck * ck; b.load.position.y = 1.18 - 5 * ck * ck; b.load.rotation.z = -ck * 2; } else { dk.rotation.z = 0; dk.position.y = -0.03; b.load.rotation.z = 0; }
    if (i === 0 && t > K.aguanta) b.g.position.y = 1.0 - 0.02 * Math.exp(-(t - K.aguanta) * 4) * Math.sin((t - K.aguanta) * 30); else b.g.position.y = 1.0;
  });
  const u = eio(prog(t, t0, 3)); cam.position.set(O.x, lerp(2.6, 2.2, u), lerp(12.4, 11.2, u)); cam.lookAt(O.x, 0.9, 0);
}

// ---------------------------------------------------------------- 10 · química: red cristalina de un metal que se oxida
function buildQuim() {
  const Z = zone('quim', 1000); mirrorFloor(Z); floaters(Z);
  const lat = new THREE.Group(); lat.position.y = 1.9; Z.add(lat); S.lat = lat; S.atoms = [];
  const n = 3, sp = 0.62;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) { const m = new THREE.MeshPhysicalMaterial({ color: 0xd8dde6, roughness: 0.12, metalness: 1, clearcoat: 0.5 }); const a = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 24), m); a.position.set((i - 1) * sp, (j - 1) * sp, (k - 1) * sp); a.castShadow = true; lat.add(a); S.atoms.push(a); }
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) { const m = new THREE.MeshPhysicalMaterial({ color: 0xd8dde6, roughness: 0.12, metalness: 1 }); const a = new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 20), m); a.position.set((i - 0.5) * sp, (j - 0.5) * sp, (k - 0.5) * sp); lat.add(a); S.atoms.push(a); }
  const bm = new THREE.MeshStandardMaterial({ color: 0x9aa3b2, metalness: 0.6, roughness: 0.3 });
  S.atoms.slice(0, 27).forEach(a => S.atoms.slice(0, 27).forEach(b => { const d = a.position.distanceTo(b.position); if (d > 0.01 && d < sp + 0.01 && a.id < b.id) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, d, 8), bm); c.position.copy(a.position).add(b.position).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(v3(0, 1, 0), b.position.clone().sub(a.position).normalize()); lat.add(c); } }));
  S.oxy = S.atoms.slice(0, 14).map((a, i) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), plastic(PL.red, 0.25)); o.position.copy(a.position).add(v3(0.16, 0.16, 0.16)); o.scale.setScalar(0.001); lat.add(o); return o; });
  S.qLab = label('Fe', { size: 120, w: 0.5, color: '#ffffff' }); S.qLab.position.set(1.4, 3.1, 0.4); Z.add(S.qLab);
  studio(Z, 1000);
}
function quimAt(t) {
  const O = zones.quim.position, t0 = ZT.find(z => z[0] === 'quim')[1];
  S.lat.rotation.set(0.5, (t - t0) * 0.6, 0.15);
  const mk = eo(prog(t, K.metal - 0.1, 0.4)); S.lat.scale.setScalar(0.85 + 0.15 * mk);
  const ox = prog(t, K.oxida - 0.1, 0.9), rust = new THREE.Color(0xc4501e), steel = new THREE.Color(0xd8dde6);
  S.atoms.forEach((a, i) => { const q = clamp(ox * 1.6 - hash(i) * 0.6); a.material.color.copy(steel).lerp(rust, q); a.material.metalness = 1 - 0.85 * q; a.material.roughness = 0.12 + 0.6 * q; });
  S.oxy.forEach((o, i) => o.scale.setScalar(Math.max(0.001, clamp(ox * 1.6 - hash(i + 3) * 0.6))));
  S.qLab.material.opacity = env(t, K.metal - 0.1, 99, 0.25, 0.1); S.qLab.lookAt(cam.position);
  const u = eio(prog(t, t0, 3.4)); cam.position.set(O.x, lerp(2.2, 2.3, u), lerp(7.0, 5.6, u)); cam.lookAt(O.x, 1.95, 0);
}

// ---------------------------------------------------------------- 11 · expresión gráfica: vistas y cotas a lápiz → la pieza sale en CAD
const VIEWS = [   // líneas de las tres vistas de una pieza en L con taladro (coordenadas del papel 0..1000 × 0..1300)
  ...[[120, 220, 420, 220], [420, 220, 420, 300], [420, 300, 220, 300], [220, 300, 220, 520], [220, 520, 120, 520], [120, 520, 120, 220]],
  ...[[560, 220, 860, 220], [860, 220, 860, 520], [860, 520, 560, 520], [560, 520, 560, 220], [560, 300, 860, 300]],
  ...[[120, 680, 420, 680], [420, 680, 420, 980], [420, 980, 120, 980], [120, 980, 120, 680], [220, 680, 220, 980]],
];
function buildDraw() {
  const Z = zone('draw', 1100); mirrorFloor(Z); floaters(Z);
  const tbl = rbox(3.2, 0.1, 2.3, plastic(0xe0a46a, 0.45), 0.03); tbl.position.set(0, 0.95, 0); tbl.rotation.x = -0.18; Z.add(tbl);
  for (const x of [-1.4, 1.4]) { const l = rbox(0.08, 0.95, 0.08, metal(0x3a3f48), 0.02); l.position.set(x, 0.47, 0); Z.add(l); }
  S.paperTex = canvasTex(1000, 1300); S.paper = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.86 * 0.72), new THREE.MeshStandardMaterial({ map: S.paperTex, roughness: 0.85 })); S.paper.rotation.x = -Math.PI / 2 - 0.18; S.paper.position.set(0, 1.01, 0); Z.add(S.paper);
  S.pencil = new THREE.Group(); Z.add(S.pencil); const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 6), plastic(PL.yellow)); pb.position.y = 0.32; S.pencil.add(pb); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 6), plastic(0x2a2c31)); tip.rotation.x = Math.PI; tip.position.y = 0.0; S.pencil.add(tip); S.pencil.rotation.z = -0.4;
  // pieza CAD (en L con taladro)
  const cad = new THREE.Group(); Z.add(cad); S.cad = cad; const cm = plastic(PL.blue, 0.2);
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.9, 0); s.lineTo(0.9, 0.24); s.lineTo(0.3, 0.24); s.lineTo(0.3, 0.9); s.lineTo(0, 0.9); s.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }); geo.translate(-0.45, -0.45, -0.3);
  const pm = new THREE.Mesh(geo, cm); pm.castShadow = true; cad.add(pm);
  S.cadEdges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true })); cad.add(S.cadEdges);
  S.axes = new THREE.Group(); cad.add(S.axes); [[PL.red, [0, 0, -Math.PI / 2]], [PL.green, [0, 0, 0]], [PL.blue, [Math.PI / 2, 0, 0]]].forEach(([c, r]) => { const a = arrow(0.5, c, 0.018); a.rotation.set(...r); S.axes.add(a); }); S.axes.position.set(-0.45, -0.45, 0.3);
  studio(Z, 1100);
}
function drawAt(t) {
  const O = zones.draw.position, t0 = ZT.find(z => z[0] === 'draw')[1], g = S.paperTex.userData.g;
  g.fillStyle = '#f7f6f1'; g.fillRect(0, 0, 1000, 1300); g.strokeStyle = 'rgba(40,80,160,.12)'; g.lineWidth = 1; for (let x = 0; x < 1000; x += 25) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1300); g.stroke(); } for (let y = 0; y < 1300; y += 25) { g.beginPath(); g.moveTo(0, y); g.lineTo(1000, y); g.stroke(); }
  g.strokeStyle = '#1b1d24'; g.lineWidth = 6; g.strokeRect(30, 30, 940, 1240); g.strokeRect(560, 1120, 410, 150); g.fillStyle = '#1b1d24'; g.font = '700 38px Inter'; g.fillText('PIEZA EN L · 1:2', 590, 1190); g.font = '600 30px Inter'; g.fillText('Expresión gráfica', 590, 1240);
  const dk = prog(t, K.dibujo - 0.1, K.vistas - K.dibujo + 0.6), nl = VIEWS.length * dk; let tip = null;
  g.strokeStyle = '#1b1d24'; g.lineWidth = 7; g.lineCap = 'round';
  VIEWS.forEach(([x0, y0, x1, y1], i) => { const q = clamp(nl - i); if (q <= 0) return; const x = x0 + (x1 - x0) * q, y = y0 + (y1 - y0) * q; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke(); if (q < 1) tip = [x, y]; });
  if (dk > 0.4) { g.setLineDash([22, 12]); g.lineWidth = 4; g.beginPath(); g.moveTo(320, 680); g.lineTo(320, 980); g.moveTo(560, 400); g.lineTo(860, 400); g.stroke(); g.setLineDash([]); }
  const ck = prog(t, K.cotas - 0.1, 0.6);
  if (ck > 0) { g.globalAlpha = ck; g.strokeStyle = '#d03030'; g.fillStyle = '#d03030'; g.lineWidth = 4; g.font = '700 40px Inter'; g.textAlign = 'center';
    [[120, 170, 420, 170, '90'], [80, 220, 80, 520, '90', 1], [560, 170, 860, 170, '60'], [120, 1030, 420, 1030, '90']].forEach(([x0, y0, x1, y1, txt, vert]) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); for (const [x, y, s] of [[x0, y0, 1], [x1, y1, -1]]) { g.beginPath(); if (vert) { g.moveTo(x, y); g.lineTo(x - 10, y + s * 22); g.lineTo(x + 10, y + s * 22); } else { g.moveTo(x, y); g.lineTo(x + s * 22, y - 10); g.lineTo(x + s * 22, y + 10); } g.fill(); }
      if (vert) { g.save(); g.translate(x0 - 18, (y0 + y1) / 2); g.rotate(-Math.PI / 2); g.fillText(txt, 0, 0); g.restore(); } else g.fillText(txt, (x0 + x1) / 2, y0 - 14); });
    g.textAlign = 'left'; g.globalAlpha = 1; }
  S.paperTex.needsUpdate = true;
  // lápiz siguiendo la línea que se dibuja
  if (tip && t < K.despues) { const px = (tip[0] / 1000 - 0.5) * 2.2, pz = (tip[1] / 1300 - 0.5) * 2.86 * 0.72; S.pencil.visible = true; S.pencil.position.set(px, 1.01 + Math.sin(0.18) * -pz + 0.01, pz * Math.cos(0.18)); } else S.pencil.visible = false;
  // la pieza sale del papel en CAD
  const ek = eio(prog(t, K.despues - 0.05, 0.9)), cadk = prog(t, K.cad - 0.2, 0.4);
  S.cad.visible = ek > 0.01; S.cad.position.set(0, 1.05 + 1.1 * ek, 0.1); S.cad.scale.set(1, Math.max(0.01, ek), 1); S.cad.rotation.set(0.35, -0.7 + (t - K.despues) * 0.8, 0);
  S.cadEdges.material.opacity = 0.3 + 0.7 * cadk; S.axes.visible = cadk > 0.05; S.axes.scale.setScalar(Math.max(0.001, cadk));
  const u = eio(prog(t, t0, 3)), up = eio(prog(t, K.despues - 0.2, 0.9));
  cam.position.set(O.x, lerp(lerp(6.6, 5.8, u), 3.2, up), lerp(lerp(3.9, 3.3, u), 5.2, up)); cam.lookAt(O.x, lerp(0.95, 1.6, up), lerp(0, 0.1, up));
}

// ---------------------------------------------------------------- 12 · estadística (tablero de Galton → campana) y métodos numéricos (Newton)
function buildStat() {
  const Z = zone('stat', 1200); mirrorFloor(Z); floaters(Z);
  const back = rbox(2.6, 3.6, 0.1, plastic(0x1b2333, 0.4), 0.05); back.position.set(0, 1.9, -0.12); Z.add(back);
  const pinM = metal(0xe6e9ef, 0.12); S.rows = 10;
  for (let r = 0; r < S.rows; r++) for (let c = 0; c <= r; c++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 10), pinM); p.rotation.x = Math.PI / 2; p.position.set((c - r / 2) * 0.2, 3.3 - r * 0.17, 0); Z.add(p); }
  for (let k = 0; k <= 12; k++) { const w = rbox(0.02, 1.0, 0.12, pinM, 0.005); w.position.set((k - 6) * 0.2 + 0.0, 0.7, 0); Z.add(w); }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.6), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.08, clearcoat: 1 })); glass.position.set(0, 1.9, 0.08); Z.add(glass);
  S.nBalls = 140; S.balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 14, 10), plastic(PL.yellow, 0.2), S.nBalls); S.balls.castShadow = true; Z.add(S.balls);
  S.paths = Array.from({ length: S.nBalls }, (_, i) => { let x = 0; const steps = []; for (let r = 0; r < S.rows; r++) { x += hash(i * 31 + r * 7) < 0.5 ? -0.5 : 0.5; steps.push(x); } return steps; });
  S.bell = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 41 }, (_, k) => { const x = (k - 20) / 20 * 1.2; return v3(x, 0.22 + 1.05 * Math.exp(-(x * x) / (2 * 0.32 * 0.32)), 0.1); })), 120, 0.015, 8), new THREE.MeshBasicMaterial({ color: 0x19e37c, transparent: true })); Z.add(S.bell);
  // panel de Newton a la derecha
  S.newTex = canvasTex(1000, 1000); const nw = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: S.newTex, toneMapped: false })); nw.position.set(3.6, 1.9, 0); Z.add(nw);
  const nf = rbox(2.75, 2.75, 0.1, metal(0xd9dde4, 0.2), 0.05); nf.position.set(3.6, 1.9, -0.06); Z.add(nf);
  studio(Z, 1200);
}
function statAt(t) {
  const O = zones.stat.position, t0 = ZT.find(z => z[0] === 'stat')[1], dm = new THREE.Matrix4(), bins = {};
  for (let i = 0; i < S.nBalls; i++) {
    const st = t0 + 0.1 + i * 0.016, q = (t - st) / 0.06;   // cada fila tarda 0,06 s
    const path = S.paths[i]; let x = 0, y = 3.5;
    if (q < 0) { dm.makeScale(0.0001, 0.0001, 0.0001); S.balls.setMatrixAt(i, dm); continue; }
    if (q < S.rows) { const r = Math.floor(q), f = q - r, x0 = r ? path[r - 1] : 0, x1 = path[r]; x = lerp(x0, x1, f) * 0.2; y = 3.4 - (r + f) * 0.17 + 0.05 * Math.sin(f * Math.PI); }
    else { const bx = path[S.rows - 1], key = bx; bins[key] = (bins[key] || 0) + 1; x = bx * 0.2; y = 0.24 + (bins[key] - 1) * 0.09; }
    dm.makeTranslation(x, y, 0.02); S.balls.setMatrixAt(i, dm);
  }
  S.balls.instanceMatrix.needsUpdate = true; S.bell.material.opacity = prog(t, t0 + 1.8, 0.5);
  // Newton: tangentes que convergen a la raíz
  const g = S.newTex.userData.g, w = 1000, h = 1000; g.fillStyle = '#0d1117'; g.fillRect(0, 0, w, h);
  const fx = x => x * x - 2, X = x => 100 + (x - 0) * 380, Y = y => 760 - y * 150;
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 3; g.beginPath(); g.moveTo(60, Y(0)); g.lineTo(960, Y(0)); g.moveTo(X(0), 60); g.lineTo(X(0), 960); g.stroke();
  g.strokeStyle = '#46b4ff'; g.lineWidth = 7; g.beginPath(); for (let i = 0; i <= 200; i++) { const x = i / 200 * 2.3; i ? g.lineTo(X(x), Y(fx(x))) : g.moveTo(X(x), Y(fx(x))); } g.stroke();
  const nk = prog(t, K.cuando - 0.1, K.aproxima - K.cuando + 0.3); let x = 2.2; const its = Math.floor(nk * 4.99);
  g.lineWidth = 4;
  for (let k = 0; k < its; k++) { const y = fx(x), x2 = x - y / (2 * x); g.strokeStyle = '#ff6a2b'; g.beginPath(); g.moveTo(X(x), Y(y)); g.lineTo(X(x2), Y(0)); g.stroke(); g.setLineDash([10, 10]); g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(X(x2), Y(0)); g.lineTo(X(x2), Y(fx(x2))); g.stroke(); g.setLineDash([]); g.fillStyle = '#ff6a2b'; g.beginPath(); g.arc(X(x2), Y(0), 12, 0, 7); g.fill(); x = x2; }
  g.fillStyle = '#ffffff'; g.font = '800 46px Inter'; g.fillText('MÉTODO DE NEWTON', 60, 90); g.font = '700 56px Mono'; g.fillStyle = '#19e37c'; if (its > 0) g.fillText(`x ≈ ${x.toFixed(4).replace('.', ',')}`, 520, 900);
  S.newTex.needsUpdate = true;
  const mv = eio(prog(t, K.cuando - 0.4, 0.7)); cam.position.set(O.x + 3.6 * mv, 1.95, 6.8); cam.lookAt(O.x + 3.6 * mv, 1.9, 0);
}

// ---------------------------------------------------------------- 13 · informática: código que calcula tensiones en una pieza (colores de elementos finitos)
function buildInfo() {
  const Z = zone('info', 1300); mirrorFloor(Z); floaters(Z);
  const mon = rbox(2.4, 1.5, 0.1, plastic(0x15171c, 0.3), 0.05); mon.position.set(-0.9, 2.7, -0.4); Z.add(mon);
  S.codeTex2 = canvasTex(1200, 740); const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.28, 1.4), new THREE.MeshBasicMaterial({ map: S.codeTex2, toneMapped: false })); scr.position.set(-0.9, 2.7, -0.345); Z.add(scr);
  const nk = rbox(0.2, 1.9, 0.08, metal(0x3a3f48), 0.03); nk.position.set(-0.9, 1.0, -0.5); Z.add(nk);
  // pieza (soporte con agujero) con malla y colores por tensión
  const s = new THREE.Shape(); s.moveTo(-1, -0.25); s.lineTo(1, -0.25); s.lineTo(1, 0.25); s.lineTo(-0.2, 0.25); s.quadraticCurveTo(-0.6, 0.25, -0.6, 0.7); s.lineTo(-1, 0.7); s.lineTo(-1, -0.25);
  const hole = new THREE.Path(); hole.absarc(0.55, 0, 0.12, 0, Math.PI * 2, true); s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false, curveSegments: 24, steps: 1 }); geo.translate(0, 0, -0.15);
  const tess = geo.toNonIndexed(); const n = tess.attributes.position.count, col = new Float32Array(n * 3); tess.setAttribute('color', new THREE.BufferAttribute(col, 3)); S.feGeo = tess;
  S.fe = new THREE.Mesh(tess, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, clearcoat: 1 })); S.fe.position.set(0.9, 1.2, 0.6); S.fe.castShadow = true; Z.add(S.fe);
  S.feW = new THREE.LineSegments(new THREE.WireframeGeometry(tess), new THREE.LineBasicMaterial({ color: 0x0b1020, transparent: true, opacity: 0.35 })); S.fe.add(S.feW);
  studio(Z, 1300);
}
const FECODE = ['import numpy as np', 'from fem import Malla, resolver', '', 'malla = Malla("soporte.stl", h=2e-3)', 'E, nu = 210e9, 0.3   # acero', 'K = malla.rigidez(E, nu)', 'F = malla.carga(nodo=12, N=-1500)', '', 'u = resolver(K, F)', 'sigma = malla.tension(u)', 'print(sigma.max() / 1e6, "MPa")'];
function infoAt(t) {
  const O = zones.info.position, t0 = ZT.find(z => z[0] === 'info')[1], g = S.codeTex2.userData.g;
  g.fillStyle = '#0d1117'; g.fillRect(0, 0, 1200, 740); g.font = '700 36px Mono'; g.textBaseline = 'top';
  const n = Math.floor(Math.max(0, t - K.programar + 0.3) * 60); let k = 0;
  FECODE.forEach((ln, i) => { const show = clamp(n - k, 0, ln.length); k += ln.length + 2; g.fillStyle = '#4d5566'; g.fillText(String(i + 1).padStart(2, ' '), 14, 24 + i * 62); g.fillStyle = /^(import|from|print)/.test(ln) ? '#c586ff' : ln.includes('#') ? '#9aa3ad' : '#e6edf3'; g.fillText(ln.slice(0, show), 90, 24 + i * 62); });
  S.codeTex2.needsUpdate = true;
  const ck = eio(prog(t, K.calculos - 0.3, 0.8)), pos = S.feGeo.attributes.position, col = S.feGeo.attributes.color, c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); let s2 = clamp(0.15 + 0.7 * Math.exp(-((x + 0.45) ** 2 + (y - 0.2) ** 2) * 6) + 0.6 * Math.exp(-((x - 0.55) ** 2 + y * y) * 30) * 0.8 + (1 - (x + 1) / 2) * 0.2);
    const q = clamp(ck * 1.4 - (x + 1) / 2 * 0.4); c.setHSL(0.66 - 0.66 * s2, 0.95, 0.52); const gray = new THREE.Color(0xc9ced6); gray.lerp(c, q); col.setXYZ(i, gray.r, gray.g, gray.b); }
  col.needsUpdate = true; S.fe.rotation.set(0.3, -0.5 + (t - t0) * 0.35, 0);
  const u = eio(prog(t, t0, 3.8)); cam.position.set(O.x, lerp(2.4, 2.3, u), lerp(9.6, 8.6, u)); cam.lookAt(O.x, 1.9, 0);
}

// ---------------------------------------------------------------- 14 · cada asignatura es un engranaje: hasta que no giran juntos, la máquina no se mueve
const GEARS = [['MATEMÁTICAS', PL.blue, 16, 0.62], ['FÍSICA', PL.orange, 12, 0.48], ['QUÍMICA', PL.green, 14, 0.55], ['DIBUJO · CAD', PL.violet, 12, 0.48], ['ESTADÍSTICA', PL.yellow, 16, 0.62], ['INFORMÁTICA', PL.red, 12, 0.48]];
function buildGears() {
  const Z = zone('gears', 1400); mirrorFloor(Z); floaters(Z);
  // posiciones encadenadas: cada rueda toca a la anterior (radios + dientes)
  let p = v3(-1.3, 6.6, 0), prev = null; S.gears = [];
  GEARS.forEach(([name, c, teeth, r], i) => {
    if (prev) { const d = prev.r + r + r * 0.17 + prev.r * 0.17 - 0.06, a = [0, -0.85, -0.15, -1.2, -0.3, -1.05][i]; p = prev.pos.clone().add(v3(Math.cos(a) * d, Math.sin(a) * d, 0)); }
    const g = new THREE.Group(); Z.add(g); const m = new THREE.Mesh(gearGeo(teeth, r, 0.16), plastic(c, 0.2)); m.castShadow = true; g.add(m);
    const ax = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, 0.12, 20), metal()); ax.rotation.x = Math.PI / 2; g.add(ax);
    const l = label(name, { size: 64, w: r * 1.35, color: '#ffffff', pill: true }); l.position.set(0, -r * 0.42, 0.11); g.add(l);
    const o = { g, m, pos: p.clone(), r, teeth, ratio: prev ? -prev.ratio * prev.teeth / teeth : 1, from: v3((hash(i) - 0.5) * 8, 6 + hash(i * 3) * 3, -3) };
    S.gears.push(o); prev = o;
  });
  // biela y pistón movidos por la última rueda
  const last = S.gears[S.gears.length - 1]; S.crankPin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 12), metal()); S.crankPin.rotation.x = Math.PI / 2; Z.add(S.crankPin);
  S.rod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.06), metal(0xb8bcc4)); Z.add(S.rod);
  S.piston = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 32), metal(0xe6e9ef, 0.1)); Z.add(S.piston);
  S.cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.9, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); Z.add(S.cyl);
  S.pistonBase = last.pos.clone().add(v3(0, -1.55, 0));
  const xs = S.gears.flatMap(o => [o.pos.x - o.r * 1.2, o.pos.x + o.r * 1.2]), ys = [...S.gears.flatMap(o => [o.pos.y - o.r * 1.2, o.pos.y + o.r * 1.2]), last.pos.y - 2.1];
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, ws = Math.max(...xs) - Math.min(...xs), hs = Math.max(...ys) - Math.min(...ys);
  S.gCam = { cx, cy, d: Math.max(hs / 0.65, ws / 0.366) * 0.95 };
  studio(Z, 1400);
}
function gearsAt(t) {
  const O = zones.gears.position, t0 = ZT.find(z => z[0] === 'gears')[1];
  const arrive = i => (i < 5 ? K.engranaje - 0.5 + i * 0.32 : K.juntos - 0.15);
  const go = t > K.juntos + 0.1, spd = go ? lerp(1.2, 3.2, eio(prog(t, K.mueve - 0.2, 0.6))) * eio(prog(t, K.juntos + 0.1, 0.5)) : 0;
  S.gAng = (S.gAng ?? 0); const ang = go ? (t - K.juntos - 0.1) * spd : 0;
  S.gears.forEach((o, i) => { const k = eo(prog(t, arrive(i), 0.45)); o.g.position.copy(o.from).lerp(o.pos, k); o.g.visible = k > 0.001;
    o.g.rotation.z = ang * o.ratio + (1 - k) * 3 + (go ? 0 : 0.02 * Math.sin(t * 30) * (i === 4 ? 1 : 0)) + (i % 2 ? Math.PI / o.teeth : 0); o.g.children[2].position.set(Math.sin(o.g.rotation.z) * -o.r * 0.42, -Math.cos(o.g.rotation.z) * o.r * 0.42, 0.11); o.g.children[2].rotation.z = -o.g.rotation.z; });
  const last = S.gears[5], a = ang * last.ratio, cp = last.pos.clone().add(v3(Math.cos(a) * last.r * 0.6, Math.sin(a) * last.r * 0.6, 0.18));
  const py = cp.y - 1.2 + 0 * a; const pyF = last.pos.y - 1.5 + Math.sin(a) * last.r * 0.6 * 0.9;
  S.crankPin.position.copy(cp); S.piston.position.set(last.pos.x + 0, pyF, 0.18); S.cyl.position.set(last.pos.x, last.pos.y - 1.55, 0.18);
  const mid = cp.clone().add(S.piston.position).multiplyScalar(0.5), dir = cp.clone().sub(S.piston.position); S.rod.position.copy(mid); S.rod.scale.y = dir.length(); S.rod.quaternion.setFromUnitVectors(v3(0, 1, 0), dir.normalize());
  const vis = t > arrive(5) + 0.2; [S.crankPin, S.rod, S.piston, S.cyl].forEach(m => (m.visible = vis));
  const u = eio(prog(t, t0, 4.6)); const G2 = S.gCam; cam.position.set(O.x + G2.cx, G2.cy + 0.3, G2.d * lerp(1.08, 1.0, u)); cam.lookAt(O.x + G2.cx, G2.cy, 0);
}

// ---------------------------------------------------------------- 15 · «si solo te gustan los coches, igual no»
function buildCars() {
  const Z = zone('cars', 1500); mirrorFloor(Z, 40, 0.8); floaters(Z);
  const tt = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.1, 64), metal(0x2a2c31, 0.35)); tt.position.y = 0.05; Z.add(tt); S.turn = tt;
  S.car2 = carModel(PL.yellow); S.car2.scale.setScalar(1.25); S.car2.position.y = 0.1; Z.add(S.car2);
  studio(Z, 1500);
}
function carsAt(t) {
  const O = zones.cars.position, t0 = ZT.find(z => z[0] === 'cars')[1];
  S.car2.rotation.y = (t - t0) * 0.9; S.turn.rotation.y = S.car2.rotation.y;
  const gk = eio(prog(t, K.igual - 0.1, 0.5)), P = S.car2.userData.P, yel = new THREE.Color(PL.yellow), gr = new THREE.Color(0x6b7280);
  [P.body, P.cabin].forEach(m => m.material.color.copy(yel).lerp(gr, gk)); P.lights.forEach(l => (l.material.emissiveIntensity = 2 * (1 - gk)));
  const u = eio(prog(t, t0, 2.4)); cam.position.set(O.x, lerp(2.3, 2.0, u), lerp(8.2, 7.4, u)); cam.lookAt(O.x, 0.8, 0);
}

// ---------------------------------------------------------------- 16 · del tornillo al coche (zoom continuo)
function buildZoom() {
  const Z = zone('zoom', 1600); mirrorFloor(Z, 60, 0.8); floaters(Z, 16, 14);
  const car = carModel(PL.red); car.scale.setScalar(2.2); Z.add(car); S.zcar = car;
  car.traverse(o => { if (o.material && !o.userData.keep) { o.material = o.material.clone(); o.material.transparent = true; } });
  // motor dentro del capó
  const eng = new THREE.Group(); eng.position.set(0.55 * 2.2, 0.55 * 2.2, 0); eng.scale.setScalar(0.35); Z.add(eng); S.zeng = eng;
  eng.add(rbox(1.4, 0.9, 1.0, plastic(PL.red, 0.25), 0.06)); const hd2 = rbox(1.5, 0.22, 1.05, metal(0xd9dde4, 0.15), 0.06); hd2.position.y = 0.56; eng.add(hd2);
  // pistón con su tornillo
  const pis = new THREE.Group(); pis.position.set(0, 0.95, 0.56); pis.scale.setScalar(0.18); eng.add(pis); S.zpis = pis;
  const ph = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.6, 40), metal(0xe6e9ef, 0.1)); pis.add(ph); const rd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.14), metal(0x9aa0aa)); rd.position.y = -0.9; pis.add(rd);
  const scr = new THREE.Group(); scr.position.set(0, -1.5, 0.08); scr.rotation.x = Math.PI / 2; scr.scale.setScalar(0.14); pis.add(scr); S.zscr = scr;
  const sm = metal(0xc9ced6, 0.12); const shd = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 6), sm); shd.position.y = 0.2; scr.add(shd);
  const thr = []; for (let i = 0; i <= 400; i++) { const a = i / 400 * Math.PI * 2 * 10; thr.push(v3(Math.cos(a) * 0.32, -i / 400 * 2.0, Math.sin(a) * 0.32)); } scr.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(thr), 800, 0.06, 8), sm));
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.0, 24), sm); core.position.y = -1.0; scr.add(core);
  S.zLab = [['tornillo', 0.004], ['pistón', 0.02], ['motor', 0.12], ['coche', 1.6]].map(([n, s]) => { const l = label(n, { size: 70, w: 1, pill: true }); Z.add(l); l.userData.s = s; return l; });
  studio(Z, 1600, 1.2);
}
function zoomAt(t) {
  const O = zones.zoom.position, t0 = ZT.find(z => z[0] === 'zoom')[1];
  S.zscr.rotation.y = (t - t0) * 1.2;
  const tgtS = S.zscr.getWorldPosition(v3(0, 0, 0)), tgtC = v3(O.x, 1.0, 0);
  const k = eio(prog(t, K.tornillo - 0.4, K.si3 - K.tornillo + 0.6)), d = Math.exp(lerp(Math.log(0.04), Math.log(11), k));
  const tgt = tgtS.clone().lerp(tgtC, eio(clamp((k - 0.45) / 0.55)));
  const a = 0.6 + (t - t0) * 0.12; cam.position.copy(tgt).add(v3(Math.sin(a) * 0.35, 0.45, 0.82).normalize().multiplyScalar(d)); cam.lookAt(tgt);
  const ck = clamp((d - 1.5) / 2.5); S.zcar.traverse(o => { if (o.material && o.material.transparent !== undefined && o.isMesh) o.material.opacity = 0.15 + 0.85 * ck; });
  S.zcar.userData.P.lights.forEach(l => (l.material.emissiveIntensity = t > K.muchisimo ? 3 : 0.4));
  S.zLab.forEach(l => { const s = l.userData.s, a2 = Math.max(0, 1 - Math.abs(Math.log(d / (s * 6))) / 0.8) * prog(t, K.tornillo - 0.3, 0.3); l.visible = a2 > 0.02; l.material.opacity = a2; l.scale.setScalar(s * 1.1); l.position.copy(tgt).add(v3(0, s * 1.4, 0)); l.lookAt(cam.position); });
}

// ---------------------------------------------------------------- reparto de tiempos y fotograma
const RUN = { hook: t => hookAt(t, false), gauge: gaugeAt, scale: t => scaleAt(t, false), engine: engineAt, taller: tallerAt, mcls: mclsAt, calc: calcAt, alg: algAt, fis: fisAt, bridge: bridgeAt, quim: quimAt, draw: drawAt, stat: statAt, info: infoAt, gears: gearsAt, scale2: t => scaleAt(t, true), cars: carsAt, zoom: zoomAt, end: t => hookAt(t, true) };
const ZONE_OF = { end: 'hook', scale2: 'scale' };
function zoneAt(t) { let z = ZT[0]; for (const q of ZT) if (t >= q[1]) z = q; return z; }
function frame(t) {
  const [name] = zoneAt(t), zname = ZONE_OF[name] || name;
  for (const k in zones) zones[k].visible = k === zname;
  FLOAT.forEach(f => { f.l.position.y = f.y + 0.25 * Math.sin(t * 0.6 + f.ph); f.l.rotation.z = 0.15 * Math.sin(t * 0.4 + f.ph); });
  RUN[name](t);
  let blur = 0, dir = 1;
  ZT.forEach(([n, ts], i) => { if (i === 0) return; const x = (t - ts) / 0.16; if (Math.abs(x) < 1) { blur = Math.max(blur, 1 - Math.abs(x)); dir = i % 2 ? 1 : -1; } });
  return { dir: [0.06 * blur * dir, 0.015 * blur], fade: 0, vig: 0.22 };
}

window.renderAt = function (t) {
  const st = frame(t);
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  post.uniforms.tA.value = rtA.texture; post.uniforms.dir.value.set(st.dir[0], st.dir[1]); post.uniforms.fade.value = st.fade; post.uniforms.vig.value = st.vig;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '800' }),
    new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-SemiBold.otf)`, { weight: '600' }),
    new FontFace('Mono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }),
    new FontFace('Serif', `url(${F}LiberationSerif-Regular.ttf)`), new FontFace('Serif', `url(${F}LiberationSerif-Italic.ttf)`, { style: 'italic' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  WORDS = lines.flatMap(l => l.words.map(w => ({ ...w, n: norm(w.w) })));
  END = lines[lines.length - 1].end + 1.2;
  K = {
    treinta: at('treinta'), ciento: at('ciento'), pena: at('pena', 1), pena2: at('pena', 2), motores: at('motores'), llave: at('llave'), coche: at('coche'), desmontado: at('desmontado'),
    pero: at('=pero', 1), matematicas: at('matematicas'), derivadas: at('derivadas'), integrales: at('integrales'), vectores: at('vectores'), matrices: at('matrices'), mover: at('mover'),
    fuerzas: at('fuerzas', 2), ondas: at('ondas'), electromagnetismo: at('electromagnetismo'), puente: at('puente'), aguanta: at('aguanta'), cae: at('cae'), metal: at('metal'), oxida: at('oxida'),
    dibujo: at('dibujo'), vistas: at('vistas'), cotas: at('cotas'), despues: at('despues'), cad: at('cad'), cuando: at('cuando'), aproxima: at('aproxima'), programar: at('programar'),
    calculos: at('calculos'), engranaje: at('engranaje'), juntos: at('juntos'), mueve: at('mueve', 1), igual: at('igual'), tornillo: at('tornillo'), si3: at('=si', 4), muchisimo: at('muchisimo'), tu: at('=tu', 1),
  };
  ZT.push(['hook', -1], ['gauge', at('treinta') - 0.35], ['scale', at('=al', 1) - 0.25], ['engine', at('porque') - 0.1], ['taller', at('imaginas') - 0.25], ['mcls', at('llegaras') - 0.2],
    ['calc', at('calculo') - 0.1], ['alg', at('algebra') - 0.1], ['fis', at('fisica') - 0.1], ['bridge', at('puente') - 0.8], ['quim', at('quimica') - 0.1], ['draw', at('expresion') - 0.1],
    ['stat', at('estadistica') - 0.1], ['info', at('informatica') - 0.25], ['gears', at('=cada', 2) - 0.1], ['scale2', at('entonces') - 0.1], ['cars', at('=si', 2) - 0.1], ['zoom', at('=pero', 2) - 0.1], ['end', at('=tu', 1) - 0.1]);
  ZT.sort((a, b) => a[1] - b[1]);
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; }
  buildHook(); buildGauge(); buildScale(); buildEngine(); buildTaller(); buildMclass(); buildCalc(); buildAlg(); buildFis(); buildBridge(); buildQuim(); buildDraw(); buildStat(); buildInfo(); buildGears(); buildCars(); buildZoom();
  window.ZT = ZT; window.K = K;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
