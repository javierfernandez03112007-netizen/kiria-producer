// «¿Informática o Teleco?» — dos equipos (Informática azul, Teleco naranja) en el espacio con suelo reflectante,
// objetos plastificados y acabado cinematográfico. Cada escena se sincroniza con su palabra en tiempos.json.
// window.renderAt(t) dibuja el instante t. window.PR = 2 → render real a 2160x3840 (4K vertical).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { W, H, clamp, prog, lerp, eo, eio, ss, fatLines } from './lib.js';

// ---------------------------------------------------------------- render y transición (barrido con desenfoque)
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
const PR = window.PR || 1; renderer.setPixelRatio(PR); renderer.setSize(W, H); document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const rtA = new THREE.WebGLRenderTarget(W * PR, H * PR, { type: THREE.HalfFloatType, samples: 4 });
const post = new THREE.ShaderMaterial({        // acabado cinematográfico: aberración cromática, ACES, gradación teal/naranja, grano
  uniforms: { tA: { value: null }, dir: { value: new THREE.Vector2(0, 0) }, fade: { value: 0 }, vig: { value: 0.3 }, time: { value: 0 }, flash: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `uniform sampler2D tA; uniform vec2 dir; uniform float fade, vig, time, flash; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec2 c = vUv - .5; vec2 ca = c * 0.0035; vec3 a = vec3(0.);
      for(int i=0;i<12;i++){ float k=(float(i)/11.0-0.5); vec2 u=vUv+dir*k; a.r+=texture2D(tA, u+ca).r; a.g+=texture2D(tA, u).g; a.b+=texture2D(tA, u-ca).b; } a/=12.0;
      a = mix(a, vec3(0.07,0.075,0.085), fade); a += flash;
      a *= 1.1; a = clamp((a*(2.51*a+0.03))/(a*(2.43*a+0.59)+0.14),0.,1.); a = pow(a, vec3(1.0/2.2));
      float lu = dot(a, vec3(0.2126,0.7152,0.0722));
      a += vec3(-0.012, 0.012, 0.035) * (1.0 - lu) * (1.0 - lu) + vec3(0.035, 0.012, -0.025) * lu * lu;   // sombras frías, luces cálidas
      a = mix(vec3(lu), a, 1.22); a = mix(a, a*a*(3.0-2.0*a), 0.25);                                       // saturación y curva en S
      vec2 d = c*vec2(0.5625,1.0); a *= 1.0 - vig*smoothstep(0.25,0.85,length(d)*1.6);
      a += (h(vUv*vec2(1080.,1920.) + fract(time*7.13)*91.7) - 0.5) * 0.035;                                // grano de película
      gl_FragColor = vec4(clamp(a,0.,1.), 1.0); }`,
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
const plastic = (c, r = 0.22) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06 });
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
function carModel(color = 0x1f6bff) {          // deportivo de motor central (silueta de coche real, sin logotipos)
  const g = new THREE.Group(), P = {}, L = 0.45, HW = (1.66 / 2 + 0.14) * L;    // escala: 4,4 m de largo → ~2 unidades; HW = media anchura
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.03 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.5, metalness: 0.2 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1220, roughness: 0.03, metalness: 0.4, clearcoat: 1 });
  const side = (pts, depth, mat, bevel = 0.08) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x * L, y * L) : s.moveTo(x * L, y * L)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: depth * L, bevelEnabled: true, bevelSize: bevel * L, bevelThickness: bevel * L, bevelSegments: 5, curveSegments: 12 }); geo.translate(0, 0, -depth * L / 2); const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
  // carrocería hasta la línea de cintura: morro bajo, capó inclinado, zaga alta
  P.body = side([[2.2, 0.3], [2.22, 0.46], [2.0, 0.55], [1.0, 0.72], [0.4, 0.8], [-0.9, 0.82], [-1.7, 0.86], [-2.2, 0.88], [-2.25, 0.6], [-2.15, 0.3], [-1.75, 0.22], [1.8, 0.22]], 1.66, paint, 0.14); g.add(P.body);
  // habitáculo: parabrisas muy tumbado, techo corto y luneta que cae hacia el motor
  P.cabin = side([[1.05, 0.72], [0.25, 1.12], [-0.55, 1.13], [-1.55, 0.88], [-1.0, 0.8], [0.4, 0.78]], 1.22, glass, 0.08); g.add(P.cabin);
  P.win = side([[0.3, 1.1], [-0.5, 1.12], [-0.6, 1.08], [0.2, 1.06]], 1.18, paint, 0.03); P.win.position.y = 0.035; g.add(P.win);
  // tomas de aire laterales, faros finos, pilotos, retrovisores y difusor
  for (const s of [-1, 1]) {
    const intake = side([[-0.35, 0.42], [-1.0, 0.68], [-1.15, 0.45]], 0.05, dark, 0.02); intake.position.z = s * (HW + 0.006); g.add(intake);
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.55 * L, 0.06 * L, 0.32 * L), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: 0.6 })); hl.position.set(1.95 * L, 0.56 * L, s * 0.55 * L); hl.rotation.set(0, s * 0.35, -0.25); g.add(hl); (P.lights = P.lights || []).push(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06 * L, 0.08 * L, 0.6 * L), new THREE.MeshStandardMaterial({ color: 0xff2030, emissive: 0xff2030, emissiveIntensity: 0.8 })); tl.position.set(-2.27 * L, 0.78 * L, s * 0.45 * L); g.add(tl);
    const mir = rbox(0.22 * L, 0.12 * L, 0.18 * L, paint, 0.03); mir.position.set(0.75 * L, 0.88 * L, s * 0.95 * L); g.add(mir);
    const arch = (x) => { const a = new THREE.Mesh(new THREE.CircleGeometry(0.47 * L, 40), dark); a.position.set(x * L, 0.38 * L, s * (HW + 0.004)); a.rotation.y = s > 0 ? 0 : Math.PI; g.add(a); };
    arch(1.38); arch(-1.4);
  }
  const grille = side([[2.18, 0.28], [2.2, 0.42], [2.05, 0.4], [2.05, 0.3]], 1.3, dark, 0.02); grille.position.x = 0.012; g.add(grille);
  P.wheels = [];
  for (const [x, z] of [[1.38, 1], [-1.4, 1], [1.38, -1], [-1.4, -1]]) {
    const w = new THREE.Group(); w.position.set(x * L, 0.38 * L, z * (HW - 0.02)); g.add(w);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38 * L, 0.38 * L, 0.3 * L, 40), new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.75 })); tire.rotation.x = Math.PI / 2; w.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * L, 0.3 * L, 0.31 * L, 10), new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.3, metalness: 0.9 })); rim.rotation.x = Math.PI / 2; w.add(rim);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * L, 0.07 * L, 0.32 * L, 16), metal(0xd9dde4)); cap.rotation.x = Math.PI / 2; w.add(cap);
    P.wheels.push(w);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData.P = P; g.userData.paint = paint; return g;
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


// ---------------------------------------------------------------- colores de equipo y piezas
const BLUE = 0x2f8bff, ORANGE = 0xff6a1f, CB = '#2f8bff', CO = '#ff6a1f';
function rope(Z) { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(-1, 1, 0), v3(1, 1, 0)]), 40, 0.03, 8), plastic(0xe9d8b4, 0.6)); Z.add(m); return m; }
function setRope(m, a, b, sag, t, buzz) {
  const pts = []; for (let i = 0; i <= 30; i++) { const q = i / 30; pts.push(a.clone().lerp(b, q).add(v3(0, -sag * Math.sin(Math.PI * q) + buzz * 0.02 * Math.sin(q * 40 + t * 60) * Math.sin(Math.PI * q), 0))); }
  m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.03, 8);
}
function pull(d, dir, t, k = 1) {   // pose de tirar de la cuerda: inclinado hacia atrás, brazos al frente, piernas abiertas
  const J = d.userData.J, w = Math.sin(t * 7) * 0.05;
  d.rotation.z = dir * (0.32 + w) * k; J.shL.rotation.set(-1.45 * k, 0, 0); J.shR.rotation.set(-1.45 * k, 0, 0); J.elL.rotation.x = J.elR.rotation.x = -0.25 * k;
  J.hpL.rotation.set(-0.5 * k, 0, 0); J.hpR.rotation.set(0.35 * k, 0, 0); J.knL.rotation.x = 0.55 * k; J.knR.rotation.x = 0.15 * k; J.chest.rotation.set(0.1 * k, 0, 0); J.neck.rotation.set(-0.1 * k, 0, 0);
}
function sparks(Z, n = 80, color = 0xffe08a) { const p = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)), new THREE.PointsMaterial({ color, size: 0.045, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); Z.add(p); p.userData.n = n; return p; }
function burst(p, c, t, t0, spread = 1, life = 0.6) {
  const a = p.geometry.attributes.position.array, n = p.userData.n;
  for (let i = 0; i < n; i++) { const tt = ((t - t0) + hash(i) * life) % life, th = hash(i * 3) * Math.PI * 2, ph = (hash(i * 7) - 0.3) * 1.6, v = (1.2 + hash(i * 11) * 2.2) * spread;
    a[i * 3] = c.x + Math.cos(th) * Math.cos(ph) * v * tt; a[i * 3 + 1] = c.y + Math.sin(ph) * v * tt - 3 * tt * tt; a[i * 3 + 2] = c.z + Math.sin(th) * Math.cos(ph) * v * tt; }
  p.geometry.attributes.position.needsUpdate = true;
}
function pill(txt, color = '#ffffff', bg = 'rgba(20,22,26,.86)', w = 2.2) { return label(txt, { size: 70, w, pill: true, color, bg }); }
function platform(Z, x, color, w = 2.4, d = 2.0) {
  const p = rbox(w, 0.22, d, plastic(color, 0.25), 0.08); p.position.set(x, 0.11, 0); Z.add(p);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.03, d + 0.02), new THREE.MeshBasicMaterial({ color })); rim.position.set(x, 0.005, 0); Z.add(rim); return p;
}
// iconos 3D (objetos de las salidas)
function icon(kind, color) {
  const g = new THREE.Group(), m = plastic(color, 0.22), dark = plastic(0x15171c, 0.3), wm = plastic(0xf4f6fa, 0.3);
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
  if (kind === 'pad') { g.add(rbox(0.9, 0.22, 0.5, m, 0.1)); for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.15, 0.17, 0.2, 24), m, s * 0.42, -0.08, 0.05); add(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 16), dark, -0.25, 0.12, 0.1, 0); for (let k = 0; k < 4; k++) add(new THREE.SphereGeometry(0.04, 12, 8), plastic([0xff3b4e, 0x19e37c, 0xffc12e, 0x46b4ff][k]), 0.25 + [0, 0.08, 0, -0.08][k], 0.13, 0.08 + [-0.08, 0, 0.08, 0][k]); }
  if (kind === 'phone') { g.add(rbox(0.42, 0.82, 0.05, dark, 0.06)); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.37, 0.74), new THREE.MeshBasicMaterial({ map: canvasTex(256, 512, (q, w, h) => { q.fillStyle = '#0d1117'; q.fillRect(0, 0, w, h); q.fillStyle = CB; rr(q, 20, 30, w - 40, 70, 18); q.fill(); for (let i = 0; i < 4; i++) { q.fillStyle = '#23262c'; rr(q, 20, 130 + i * 90, w - 40, 70, 14); q.fill(); q.fillStyle = ['#ff6a1f', '#19e37c', '#ffc12e', '#8a5cff'][i]; q.beginPath(); q.arc(55, 165 + i * 90, 18, 0, 7); q.fill(); } }) })); s.position.z = 0.028; g.add(s); }
  if (kind === 'web') { g.add(rbox(0.9, 0.62, 0.04, wm, 0.03)); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.5), new THREE.MeshBasicMaterial({ map: canvasTex(420, 250, (q, w, h) => { q.fillStyle = '#ffffff'; q.fillRect(0, 0, w, h); q.fillStyle = '#e6e9ef'; q.fillRect(0, 0, w, 30); [['#ff5f57', 14], ['#febc2e', 32], ['#28c840', 50]].forEach(([c, x]) => { q.fillStyle = c; q.beginPath(); q.arc(x, 15, 6, 0, 7); q.fill(); }); q.fillStyle = CB; q.fillRect(20, 50, 200, 26); q.fillStyle = '#c9ced6'; for (let i = 0; i < 4; i++) q.fillRect(20, 96 + i * 30, 380 - i * 50, 14); }) })); s.position.set(0, -0.02, 0.022); g.add(s); }
  if (kind === 'brain') { for (let i = 0; i < 14; i++) add(new THREE.SphereGeometry(0.14 + hash(i) * 0.06, 16, 12), m, (hash(i * 3) - 0.5) * 0.55, (hash(i * 5) - 0.5) * 0.35, (hash(i * 7) - 0.5) * 0.35); const n = []; for (let i = 0; i < 10; i++) n.push(add(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), (hash(i * 13) - 0.5) * 0.7, (hash(i * 17) - 0.5) * 0.45, 0.26)); }
  if (kind === 'code') { g.add(rbox(0.9, 0.62, 0.04, dark, 0.03)); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.56), new THREE.MeshBasicMaterial({ map: canvasTex(420, 280, (q, w, h) => { q.fillStyle = '#0d1117'; q.fillRect(0, 0, w, h); q.font = '700 22px Mono'; ['int main() {', '  auto app = crear();', '  app.run();', '  return 0;', '}'].forEach((l, i) => { q.fillStyle = i === 0 || i === 3 ? '#c586ff' : '#e6edf3'; q.fillText(l, 16, 40 + i * 44); }); }) })); s.position.z = 0.022; g.add(s); }
  if (kind === 'chart') { g.add(rbox(1.0, 0.04, 0.5, wm, 0.02)); [0.25, 0.45, 0.35, 0.7, 0.55].forEach((hh, i) => { const b = rbox(0.14, hh, 0.14, m, 0.03); b.position.set(-0.36 + i * 0.18, hh / 2 + 0.02, 0); g.add(b); }); }
  if (kind === 'server') { g.add(rbox(0.6, 0.95, 0.5, dark, 0.04)); for (let i = 0; i < 5; i++) { const sl = rbox(0.54, 0.13, 0.02, plastic(0x2a2d34), 0.01); sl.position.set(0, -0.36 + i * 0.18, 0.26); g.add(sl); add(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x19e37c : 0x46b4ff }), 0.2, -0.36 + i * 0.18, 0.28); } }
  if (kind === 'tower') { const lm = metal(0xc9ced6, 0.3); for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) add(new THREE.CylinderGeometry(0.015, 0.03, 1.6, 6), lm, x * 0.5, 0.8, z * 0.5, z * 0.15, 0, -x * 0.15); for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(0.22 - k * 0.025, 0.012, 0.012), lm, 0, 0.2 + k * 0.25, 0); for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.06, 0.28, 0.04), wm, 0.12 * Math.cos(k * 2.1), 1.4, 0.12 * Math.sin(k * 2.1)); add(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3b4e }), 0, 1.65, 0); }
  if (kind === 'fiber') { for (let k = 0; k < 5; k++) { const pts = []; for (let i = 0; i <= 40; i++) { const q = i / 40; pts.push(v3(-0.7 + q * 1.4, 0.1 * Math.sin(q * 6 + k) + (k - 2) * 0.03, (k - 2) * 0.03)); } add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.018, 6), new THREE.MeshStandardMaterial({ color: 0x9fe6ff, emissive: 0x46d0ff, emissiveIntensity: 1.6, roughness: 0.2 })); } add(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 16), metal(0xd9dde4), -0.72, 0, 0, 0, 0, Math.PI / 2); }
  if (kind === 'sat') { g.add(rbox(0.3, 0.3, 0.3, metal(0xd9b45a, 0.25), 0.03)); for (const s of [-1, 1]) { const pn = rbox(0.6, 0.02, 0.28, plastic(0x1f3f8a, 0.2), 0.01); pn.position.x = s * 0.48; g.add(pn); } add(new THREE.ConeGeometry(0.12, 0.12, 20, 1, true), wm, 0, 0.2, 0, Math.PI, 0, 0); }
  if (kind === 'dish') { add(new THREE.SphereGeometry(0.42, 32, 16, 0, Math.PI * 2, 0, 0.9), wm, 0, 0.55, 0, -0.9, 0, 0).material.side = THREE.DoubleSide; add(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), metal(), 0, 0.62, 0.2, -0.9, 0, 0); add(new THREE.CylinderGeometry(0.05, 0.08, 0.55, 12), metal(0x9aa0aa), 0, 0.27, 0); }
  if (kind === 'chip') { g.add(rbox(0.9, 0.05, 0.7, plastic(0x1f6b45, 0.4), 0.02)); const c = rbox(0.34, 0.06, 0.34, dark, 0.02); c.position.y = 0.05; g.add(c); for (let i = 0; i < 6; i++) { const tr = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.008, 0.012), metal(0xe0b45a)); tr.position.set(0.3, 0.03, -0.25 + i * 0.1); g.add(tr); } }
  if (kind === 'plane') { add(new THREE.CapsuleGeometry(0.08, 0.8, 6, 12), wm, 0, 0, 0, 0, 0, Math.PI / 2); const wg = rbox(0.28, 0.02, 1.1, wm, 0.01); g.add(wg); const tl = rbox(0.14, 0.2, 0.02, plastic(color), 0.01); tl.position.set(-0.42, 0.12, 0); g.add(tl); }
  if (kind === 'lock') { const b = rbox(0.6, 0.5, 0.25, m, 0.06); g.add(b); add(new THREE.TorusGeometry(0.2, 0.05, 12, 32, Math.PI), metal(0xd9dde4, 0.15), 0, 0.25, 0); add(new THREE.CylinderGeometry(0.05, 0.05, 0.27, 16), dark, 0, 0, 0, Math.PI / 2, 0, 0); }
  if (kind === 'globe') { const e = add(new THREE.SphereGeometry(0.45, 40, 30), new THREE.MeshStandardMaterial({ color: 0x1a4fae, roughness: 0.4 })); e.material.map = canvasTex(512, 256, (q, w, h) => { q.fillStyle = '#1a4fae'; q.fillRect(0, 0, w, h); q.fillStyle = '#2fb36f'; for (let i = 0; i < 40; i++) { q.beginPath(); q.ellipse(hash(i) * w, 40 + hash(i * 3) * (h - 80), 10 + hash(i * 5) * 40, 6 + hash(i * 7) * 22, 0, 0, 7); q.fill(); } }); e.material.color.set(0xffffff);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; add(new THREE.TorusGeometry(0.47 + k * 0.004, 0.006, 6, 60, Math.PI * 0.6), new THREE.MeshBasicMaterial({ color: 0x9fe6ff }), 0, 0, 0, a, a * 0.7, 0); } }
  if (kind === 'wave') { const pts = []; for (let i = 0; i <= 80; i++) { const q = i / 80; pts.push(v3(-0.6 + q * 1.2, 0.18 * Math.sin(q * Math.PI * 4), 0)); } add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.03, 8), plastic(color)); }
  return g;
}
function iconLabel(g, txt, color, y = -0.62) { const l = pill(txt, '#ffffff', color === BLUE ? 'rgba(20,70,160,.9)' : 'rgba(170,70,20,.9)', Math.min(1.25, 0.12 * txt.length + 0.35)); l.position.set(0, y, 0.3); g.add(l); return l; }

// ---------------------------------------------------------------- 0 · duelo: tira y afloja entre Informática y Teleco (gancho y final)
function buildDuel() {
  const Z = zone('duel', 0); mirrorFloor(Z); floaters(Z);
  platform(Z, -1.3, BLUE, 1.7, 1.6); platform(Z, 1.3, ORANGE, 1.7, 1.6);
  S.team = [];
  for (let i = 0; i < 2; i++) for (const s of [-1, 1]) { const d = dollP(s < 0 ? BLUE : ORANGE, 1.05); d.position.set(s * (0.75 + i * 0.55), 0.22, 0); d.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; Z.add(d); S.team.push({ d, s, i }); }
  S.rope = rope(Z); S.knot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), plastic(0xff3b4e)); Z.add(S.knot);
  S.sp = sparks(Z, 120); S.sp2 = sparks(Z, 60, 0x9fe6ff);
  S.teamL = [pill('INFORMÁTICA', '#ffffff', 'rgba(20,70,160,.9)', 1.45), pill('TELECO', '#ffffff', 'rgba(170,70,20,.9)', 1.0)]; S.teamL[0].position.set(-1.3, 0.02, 1.1); S.teamL[1].position.set(1.3, 0.02, 1.1); S.teamL.forEach(l => { l.rotation.x = -Math.PI / 2 + 0.35; Z.add(l); });
  // pullas: «solo programar» y «solo cables y antenas»
  S.jibe1 = new THREE.Group(); Z.add(S.jibe1); { const c = icon('code', BLUE); c.scale.setScalar(0.9); S.jibe1.add(c); const l = pill('«solo programar»', '#ffffff', 'rgba(170,70,20,.92)', 1.9); l.position.set(0, 0.5, 0.05); S.jibe1.add(l); }
  S.jibe2 = new THREE.Group(); Z.add(S.jibe2); { const a = icon('tower', ORANGE); a.scale.setScalar(0.5); a.position.set(0.3, -0.45, 0); S.jibe2.add(a); for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 30; i++) { const q = i / 30; pts.push(v3(-0.6 + q * 0.8, -0.3 + 0.15 * Math.sin(q * 9 + k * 2), 0.1 * Math.cos(q * 7 + k))); } S.jibe2.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 50, 0.02, 6), plastic([0xff3b4e, 0x19e37c, 0xffc12e][k]))); }
    const l = pill('«solo cables y antenas»', '#ffffff', 'rgba(20,70,160,.92)', 2.3); l.position.set(0, 0.5, 0.05); S.jibe2.add(l); }
  S.cross = [label('✕', { size: 220, color: '#ff3b4e', w: 0.8 }), label('✕', { size: 220, color: '#ff3b4e', w: 0.8 })]; S.cross.forEach(c => Z.add(c));
  studio(Z, 0, 1.1);
}
function duelAt(t, final) {
  const O = zones.duel.position;
  const tension = final ? 1 : clamp(0.35 + 0.65 * prog(t, K.tension - 0.2, 0.4)), sway = 0.12 * Math.sin(t * 1.7) + 0.05 * Math.sin(t * 5.3) * tension;
  S.team.forEach(o => { pull(o.d, o.s, t + o.i, 0.6 + 0.4 * tension); o.d.position.x = o.s * (0.75 + o.i * 0.55) + sway; o.d.position.y = 0.22; });
  const a = v3(-0.88 + sway, 1.0, 0.0), b = v3(0.88 + sway, 1.0, 0.0);
  setRope(S.rope, v3(-1.75 + sway, 1.0, 0), v3(1.75 + sway, 1.0, 0), 0.08 * (1 - tension) + 0.01, t, tension); S.knot.position.set(sway, 0.99, 0);
  burst(S.sp, v3(sway, 1.0, 0), t, 0, 0.5 + tension, 0.5); S.sp.material.opacity = 0.25 + 0.75 * tension;
  burst(S.sp2, v3(sway, 1.0, 0), t * 1.3, 0.2, 0.4 + 0.6 * tension, 0.4); S.sp2.material.opacity = 0.5 * tension;
  const j1 = final ? 0 : env(t, K.solo1 - 0.25, K.ninguno + 0.6, 0.3, 0.35), j2 = final ? 0 : env(t, K.solo2 - 0.3, K.ninguno + 0.6, 0.3, 0.35), x = final ? 0 : eo(prog(t, K.razon - 0.15, 0.3));
  S.jibe1.position.set(0.25, 3.45 + 0.05 * Math.sin(t * 2), 0.4); S.jibe1.scale.setScalar(Math.max(0.001, j1) * (1 - 0.4 * x)); S.jibe1.rotation.z = -0.08 + 0.3 * x;
  S.jibe2.position.set(-0.25, 2.3 + 0.05 * Math.sin(t * 2 + 1), 0.4); S.jibe2.scale.setScalar(Math.max(0.001, j2) * (1 - 0.4 * x)); S.jibe2.rotation.z = 0.08 - 0.3 * x;
  S.cross.forEach((c, i) => { c.visible = x > 0.01; c.position.copy(i ? S.jibe2.position : S.jibe1.position).add(v3(0, 0, 0.3)); c.scale.setScalar(x * (1 + 0.3 * Math.sin(t * 20) * (1 - x))); c.material.opacity = x; });
  S.teamL.forEach(l => (l.material.opacity = final ? env(t, K.equipo - 0.3, 99, 0.3, 0.1) : env(t, K.tension - 0.1, K.los - 0.1, 0.3, 0.3)));
  // cámara: abre pegada a la cuerda (chispas) y se aleja para descubrir a los dos equipos
  const u = final ? 1 : eio(clamp((t + 0.15) / 2.1)), hand = 0.03 * Math.sin(t * 1.9) + 0.02 * Math.sin(t * 3.7);
  const zz = final ? lerp(13.6, 13.0, eio(prog(t, K.cuentame, END - K.cuentame))) : lerp(2.3, 13.6, u) - 0.4 * prog(t, 4, 8);
  cam.position.set(O.x + hand + 0.6 * (1 - u), lerp(1.15, 2.5, u) + hand, zz); cam.lookAt(O.x + 0.4 * (1 - u), lerp(1.0, 1.9, u), 0);
}

// ---------------------------------------------------------------- 1 · fama de duras: 3 de cada 4 caen (Informática) · depósito al 68 % (Teleco)
function buildFame() {
  const Z = zone('fame', 100); mirrorFloor(Z); floaters(Z);
  const pl = rbox(3.0, 0.24, 1.4, plastic(BLUE, 0.25), 0.06); pl.position.set(-3, 0.82, 0); Z.add(pl);
  for (const x of [-4.3, -1.7]) { const l = rbox(0.14, 0.82, 0.14, metal(0x3a3f48), 0.03); l.position.set(x, 0.41, 0); Z.add(l); }
  S.f4 = [-1.05, -0.35, 0.35, 1.05].map((x, i) => { const d = dollP(i === 2 ? PL.green : PL.blue, 1.0); d.position.set(-3 + x, 0.94, 0); Z.add(d);
    const door = rbox(0.62, 0.05, 0.9, plastic(0x2a2c31), 0.02); door.position.set(-3 + x, 0.955, 0); Z.add(door);
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.9), new THREE.MeshBasicMaterial({ color: 0x050506 })); hole.rotation.x = -Math.PI / 2; hole.position.set(-3 + x, 0.947, 0); Z.add(hole); return { d, door, hole, x: -3 + x, fall: i !== 2 }; });
  const l1 = pill('INFORMÁTICA', '#ffffff', 'rgba(20,70,160,.9)', 1.7); l1.position.set(-3, 2.55, 0); Z.add(l1);
  // depósito naranja al 68 %
  const TW = 1.5, TH = 2.6, TD = 0.9; S.fTH = TH;
  const tk = new THREE.Group(); tk.position.set(3, 0.1, 0); Z.add(tk); S.ftank = tk;
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.07, clearcoat: 1, depthWrite: false });
  const box = new THREE.Mesh(new THREE.BoxGeometry(TW, TH, TD), glass); box.position.y = TH / 2; box.renderOrder = 5; tk.add(box);
  const ed = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(TW, TH, TD)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); ed.position.y = TH / 2; tk.add(ed);
  const base = rbox(TW + 0.3, 0.12, TD + 0.3, metal(0x3a3f48), 0.04); base.position.y = -0.04; tk.add(base);
  const sc = canvasTex(256, 1536, (g, w, h) => { g.fillStyle = '#ffffff'; g.font = '700 54px Inter'; g.textAlign = 'right'; g.textBaseline = 'middle'; for (let k = 0; k <= 100; k += 5) { const y = h - 20 - k / 100 * (h - 40); g.fillRect(w - (k % 25 ? 40 : 80), y - 3, k % 25 ? 40 : 80, 6); if (k % 25 === 0) g.fillText(k + '%', w - 95, y); } });
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.45, TH), new THREE.MeshBasicMaterial({ map: sc, transparent: true, depthWrite: false })); sm.position.set(-TW / 2 - 0.25, TH / 2, TD / 2); tk.add(sm);
  S.fw = new THREE.Mesh(new THREE.BoxGeometry(TW - 0.04, 1, TD - 0.04), new THREE.MeshPhysicalMaterial({ color: ORANGE, roughness: 0.05, transparent: true, opacity: 0.75, clearcoat: 1, depthWrite: false })); S.fw.renderOrder = 4; tk.add(S.fw);
  const l2 = pill('TELECO · ZARAGOZA', '#ffffff', 'rgba(170,70,20,.9)', 2.1); l2.position.set(3, 3.15, 0); Z.add(l2);
  S.fTxt = canvasTex(1000, 260); S.fLab = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.5), new THREE.MeshBasicMaterial({ map: S.fTxt, transparent: true, depthWrite: false })); S.fLab.position.set(3, 3.7, 0.2); Z.add(S.fLab);
  studio(Z, 100);
}
function fameAt(t) {
  const O = zones.fame.position;
  S.f4.forEach((o, i) => { let f = 0; if (o.fall) f = clamp((t - K.tres + 0.1 - i * 0.12) / 0.8);
    const hinge = Math.min(1, f * 3); o.door.visible = o.fall; o.hole.visible = o.fall && hinge > 0.02;
    o.door.position.set(o.x - 0.31 * (1 - Math.cos(hinge * Math.PI / 2)), 0.955 - 0.31 * Math.sin(hinge * Math.PI / 2), 0); o.door.rotation.z = -hinge * Math.PI / 2;
    o.d.position.y = 0.94 - 5 * f * f; o.d.rotation.set(f * 0.6, 0, f * (i % 2 ? 0.8 : -0.6)); o.d.visible = o.d.position.y > -2;
    const J = o.d.userData.J, k = f > 0 ? 1 : 0; J.shL.rotation.set(-2.6 * k, 0, -0.5 * k); J.shR.rotation.set(-2.4 * k, 0, 0.5 * k); });
  const k = prog(t, K.sesenta - 0.15, K.ciento - K.sesenta + 0.45), val = 68 * (k < 1 ? eio(k) : 1), h = Math.max(0.01, val / 100 * S.fTH);
  S.fw.scale.y = h; S.fw.position.y = h / 2;
  const g = S.fTxt.userData.g; g.clearRect(0, 0, 1000, 260); g.fillStyle = 'rgba(20,22,26,.85)'; rr(g, 60, 20, 880, 220, 110); g.fill(); g.fillStyle = '#ffffff'; g.font = '900 150px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`${Math.round(val)} %`, 500, 138); S.fTxt.needsUpdate = true;
  S.fLab.material.opacity = env(t, K.sesenta - 0.2, 99, 0.25, 0.1);
  const mv = eio(prog(t, K.zaragoza - 0.5, 0.8)), x = lerp(-3, 3, mv), hand = 0.03 * Math.sin(t * 2.1);
  cam.position.set(O.x + x + hand, 2.2 + hand, 7.6); cam.lookAt(O.x + x, 1.65, 0);
}

// ---------------------------------------------------------------- 2 · por dentro se parecen: dos siluetas de cristal con el mismo chip dentro
function buildInside() {
  const Z = zone('inside', 200); mirrorFloor(Z); floaters(Z);
  S.ghosts = [-1, 1].map(s => { const d = makeDoll(s < 0 ? BLUE : ORANGE, 2.6); const m = new THREE.MeshPhysicalMaterial({ color: s < 0 ? BLUE : ORANGE, roughness: 0.1, transparent: true, opacity: 0.32, clearcoat: 1, depthWrite: false }); d.traverse(o => { if (o.isMesh) { o.material = m; o.castShadow = false; } }); d.position.set(s * 0.75, 0, 0); d.rotation.y = s * -0.35; Z.add(d);
    const chip = icon('chip', 0); chip.scale.setScalar(0.55); chip.rotation.x = Math.PI / 2; chip.position.set(s * 0.75, 1.75, 0.05); Z.add(chip);
    const gr = new THREE.Mesh(gearGeo(12, 0.16, 0.06), metal(0xe0b45a, 0.2)); gr.position.set(s * 0.75, 2.25, 0.05); Z.add(gr);
    const glow = new THREE.PointLight(0x9fe6ff, 0, 2.5, 1.6); glow.position.set(s * 0.75, 1.9, 0.6); Z.add(glow); return { d, chip, gr, glow, m, s }; });
  studio(Z, 200, 0.8);
}
function insideAt(t) {
  const O = zones.inside.position, t0 = ZT.find(z => z[0] === 'inside')[1];
  const xr = eo(prog(t, K.dentro - 0.15, 0.5)), pulse = Math.max(0, Math.sin((t - K.admiten) * 9)) * prog(t, K.admiten - 0.1, 0.2);
  S.ghosts.forEach(o => { o.m.opacity = lerp(0.9, 0.25, xr); o.chip.visible = xr > 0.05; o.chip.scale.setScalar(0.55 * xr); o.gr.visible = xr > 0.05; o.gr.rotation.z = t * 2 * o.s; o.glow.intensity = 2 * xr + 5 * pulse; o.d.rotation.y = o.s * -0.35 * (1 - 0.6 * xr); });
  const u = eio(prog(t, t0, 2.8)); cam.position.set(O.x + 0.05 * Math.sin(t * 2), lerp(2.2, 2.0, u), lerp(9.6, 8.4, u)); cam.lookAt(O.x, 1.85, 0);
}

// ---------------------------------------------------------------- 3 · la base común: las asignaturas compartidas llegan de los dos lados y forman una torre
const TILES = ['MATEMÁTICAS', 'ÁLGEBRA', 'CÁLCULO', 'ESTADÍSTICA', 'PROGRAMACIÓN', 'ALGORITMOS', 'ARQUITECTURA DE ORDENADORES', 'SISTEMAS DIGITALES', 'SISTEMAS OPERATIVOS', 'REDES'];
function buildBase() {
  const Z = zone('base', 300); mirrorFloor(Z); floaters(Z);
  platform(Z, -2.2, BLUE, 1.4, 1.4); platform(Z, 2.2, ORANGE, 1.4, 1.4);
  S.tiles = TILES.map((n, i) => { const g = new THREE.Group(); Z.add(g);
    const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, clearcoat: 1, map: canvasTex(512, 64, (q, w, h) => { const gr = q.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, CB); gr.addColorStop(1, CO); q.fillStyle = gr; q.fillRect(0, 0, w, h); }) });
    const b = rbox(2.3, 0.3, 0.9, m, 0.08); g.add(b); const l = label(n, { size: 64, w: Math.min(2.1, 0.11 * n.length + 0.3), color: '#ffffff' }); l.position.z = 0.46; g.add(l); return { g, i }; });
  S.baseLab = pill('BASE COMÚN', '#ffffff', 'rgba(20,22,26,.9)', 1.6); Z.add(S.baseLab);
  S.tsp = sparks(Z, 60, 0xffffff); studio(Z, 300);
}
function baseAt(t) {
  const O = zones.base.position, t0 = ZT.find(z => z[0] === 'base')[1];
  const keys = [K.matematicas, K.algebra, K.calculo, K.estadistica, K.programacion, K.algoritmos, K.arquitectura, K.digitales - 0.3, K.operativos - 0.3, K.redes];
  let top = 0.22, lastLand = -9;
  S.tiles.forEach(({ g, i }) => { const k = keys[i], p = clamp((t - k + 0.05) / 0.4), side = i % 2 ? 1 : -1, y = 0.37 + i * 0.32;
    g.visible = t > k - 0.1; const e = p < 1 ? eio(p) : 1, bounce = p >= 1 ? 0.06 * Math.exp(-(t - k - 0.35) * 9) * Math.sin((t - k) * 30) : 0;
    g.position.set(lerp(side * 2.2, 0, e), lerp(y + 1.2, y, e) + 0.5 * Math.sin(Math.PI * e) + bounce, 0); g.rotation.set(0, (1 - e) * side * 0.9, (1 - e) * side * 0.4);
    if (t > k - 0.1) top = y + 0.15; if (p >= 1) lastLand = Math.max(lastLand, k + 0.35); });
  burst(S.tsp, v3(0, top - 0.15, 0.3), t, lastLand, 0.8, 0.5); S.tsp.material.opacity = Math.max(0, 1 - (t - lastLand) / 0.5);
  S.baseLab.position.set(0, top + 0.45, 0.4); S.baseLab.material.opacity = prog(t, K.matematicas + 0.4, 0.4);
  const cy = Math.max(1.4, top * 0.6 + 0.8); cam.position.set(O.x + 0.15 * Math.sin(t * 0.6), cy + 0.6, 8.6 + Math.max(0, top - 2) * 0.9); cam.lookAt(O.x, cy, 0);
}

// ---------------------------------------------------------------- 4 · puente: uno cruza al otro lado (y el puente se rompe: «la rivalidad empieza al salir»)
function buildBridge() {
  const Z = zone('bridge', 400); mirrorFloor(Z); floaters(Z);
  platform(Z, -1.55, BLUE, 1.3, 1.5); platform(Z, 1.55, ORANGE, 1.3, 1.5);
  S.planks = []; for (let i = 0; i < 8; i++) { const p = rbox(0.21, 0.06, 0.8, plastic(0xe0a46a, 0.45), 0.02); p.position.set(-0.79 + i * 0.226, 0.2, 0); Z.add(p); S.planks.push({ p, x: -0.79 + i * 0.226 }); }
  S.walker = dollP(BLUE, 1.0); Z.add(S.walker); S.wMat = S.walker.children.length ? null : null;
  S.walkM = []; S.walker.traverse(o => { if (o.isMesh) S.walkM.push(o.material); });
  S.glowGap = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.6), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0 })); S.glowGap.rotation.x = -Math.PI / 2; S.glowGap.position.y = 0.23; Z.add(S.glowGap);
  S.bsp = sparks(Z, 140); studio(Z, 400);
}
function bridgeAt(t) {
  const O = zones.bridge.position, t0 = ZT.find(z => z[0] === 'bridge')[1];
  const w = clamp((t - K.quien + 0.2) / (K.otra - K.quien + 0.6)), x = lerp(-1.7, 1.7, ss(w));
  S.walker.position.set(x, 0.22 + 0.03 * Math.abs(Math.sin(w * 28)), 0); S.walker.rotation.y = Math.PI / 2;
  const J = S.walker.userData.J, ph = w * 28 * (w < 1 ? 1 : 0); J.hpL.rotation.x = 0.5 * Math.sin(ph); J.hpR.rotation.x = -0.5 * Math.sin(ph); J.knL.rotation.x = 0.4 * Math.max(0, -Math.sin(ph)); J.knR.rotation.x = 0.4 * Math.max(0, Math.sin(ph)); J.shL.rotation.x = -0.45 * Math.sin(ph); J.shR.rotation.x = 0.45 * Math.sin(ph);
  const c = new THREE.Color(BLUE).lerp(new THREE.Color(ORANGE), ss(clamp((w - 0.35) / 0.4))); S.walkM.forEach(m => m.color.copy(c));
  const br = prog(t, K.rivalidad - 0.15, 1.2);
  S.planks.forEach((o, i) => { const h = hash(i + 3); if (br > 0) { const tt = br * 1.2; o.p.position.set(o.x + (h - 0.5) * 0.4 * tt, 0.2 - 4.9 * tt * tt * (0.5 + h * 0.6), (hash(i * 5) - 0.5) * tt); o.p.rotation.set(tt * 3 * (h - 0.5), 0, tt * 4 * (hash(i * 7) - 0.5)); } else { o.p.position.set(o.x, 0.2, 0); o.p.rotation.set(0, 0, 0); } });
  S.glowGap.material.opacity = br > 0 ? 0.8 * (1 - br) : 0; burst(S.bsp, v3(0, 0.25, 0), t, K.rivalidad - 0.15, 1.3, 0.7); S.bsp.material.opacity = br > 0 ? 1 - br : 0;
  const u = eio(prog(t, t0, 3)), shake = br > 0 && br < 0.3 ? 0.05 * Math.sin(t * 60) : 0;
  cam.position.set(O.x + shake, lerp(2.5, 2.2, u) + shake, lerp(9.6, 8.8, u)); cam.lookAt(O.x, 0.9, 0);
}

// ---------------------------------------------------------------- 5 · Informática crea · 6 · Teleco conecta (objetos que aparecen al nombrarlos)
const CREA = [['pad', 'videojuegos'], ['phone', 'aplicaciones'], ['web', 'webs'], ['brain', 'inteligencia'], ['code', 'software'], ['chart', 'datos'], ['server', 'sistemas']];
const CREA_TXT = ['VIDEOJUEGOS', 'APPS', 'WEBS', 'INTELIGENCIA ARTIFICIAL', 'SOFTWARE', 'DATOS', 'SISTEMAS'];
const CONE = [['tower', 'redes'], ['fiber', 'fibra'], ['sat', 'satelites'], ['dish', 'antenas'], ['chip', 'electronica'], ['plane', 'aeronauticas']];
const CONE_TXT = ['REDES 5G · 6G', 'FIBRA ÓPTICA', 'SATÉLITES', 'ANTENAS', 'ELECTRÓNICA', 'AERONÁUTICA'];
function ring(n, r, y, i) { const a = Math.PI / 2 - (i / n) * Math.PI * 2; return v3(Math.cos(a) * 1.22, y + 0.15 + Math.sin(a) * 1.55, 0); }
function buildTeam(name, x, color, list, txts) {
  const Z = zone(name, x); mirrorFloor(Z); floaters(Z);
  platform(Z, 0, color, 1.6, 1.6); const d = dollP(color, 1.25); d.position.y = 0.22; Z.add(d);
  const items = list.map(([k], i) => { const g = icon(k, color); g.scale.setScalar(0.7); Z.add(g); iconLabel(g, txts[i], color); return g; });
  const title = pill(name === 'crea' ? 'INFORMÁTICA CREA' : 'TELECO CONECTA', '#ffffff', color === BLUE ? 'rgba(20,70,160,.92)' : 'rgba(170,70,20,.92)', 2.6); title.position.set(0, 5.05, 0); Z.add(title);
  const waves = name === 'conecta' ? [0, 1, 2, 3].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 80), new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true })); Z.add(r); return r; }) : [];
  studio(Z, x); return { Z, d, items, title, waves };
}
function teamAt(T, t, keys, isCon) {
  const O = T.Z.position, t0 = ZT.find(z => z[0] === (isCon ? 'conecta' : 'crea'))[1], n = T.items.length;
  T.items.forEach((g, i) => { const k = keys[i], p = eo(prog(t, k - 0.12, 0.35)), target = ring(n, 1.85, 2.15, i);
    g.visible = p > 0.01; g.position.copy(v3(0, 1.4, 0).lerp(target, p)); g.position.y += 0.06 * Math.sin(t * 2 + i); g.scale.setScalar(0.7 * p * (1 + 0.25 * Math.sin(Math.PI * clamp((t - k) / 0.35)))); g.rotation.y = 0.35 * Math.sin(t * 0.8 + i) + (1 - p) * 3; });
  T.title.material.opacity = prog(t, t0 + 0.6, 0.3); T.title.scale.setScalar(1 + 0.2 * Math.max(0, 1 - (t - t0 - 0.6) / 0.3) * (t > t0 + 0.6 ? 1 : 0));
  const J = T.d.userData.J; J.shR.rotation.set(-2.0 - 0.3 * Math.sin(t * 3), 0, 0.3); J.shL.rotation.set(-0.3, 0, -0.2); T.d.rotation.y = 0.3 * Math.sin(t * 0.7);
  T.waves.forEach((r, k) => { const q = ((t - t0) * 0.6 + k / 4) % 1, on = prog(t, K.redes2 - 0.1, 0.3); r.position.copy(T.items[0].position).add(v3(0, 0.55, 0)); r.scale.setScalar(0.2 + q * 1.3); r.material.opacity = on * 0.7 * (1 - q); r.rotation.x = Math.PI / 2; });
  if (isCon) { const sat = T.items[2]; if (sat.visible) { const a = (t - K.satelites) * 1.2; sat.position.add(v3(0.25 * Math.cos(a), 0.15 * Math.sin(a), 0)); } }
  const u = eio(prog(t, t0, 4.5)); cam.position.set(O.x + 0.15 * Math.sin(t * 0.4), lerp(2.6, 2.5, u), lerp(10.6, 10.0, u)); cam.lookAt(O.x, 2.25, 0);
}

// ---------------------------------------------------------------- 7 · ciberseguridad: las dos mitades del candado se juntan
function buildCyber() {
  const Z = zone('cyber', 800); mirrorFloor(Z); floaters(Z);
  S.halves = [-1, 1].map(s => { const g = new THREE.Group(); Z.add(g); const b = rbox(0.6, 1.1, 0.5, plastic(s < 0 ? BLUE : ORANGE, 0.2), 0.08); b.position.x = s * 0.3; g.add(b); return g; });
  S.shackle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 16, 48, Math.PI), metal(0xe6e9ef, 0.1)); Z.add(S.shackle);
  S.key = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.52, 20), plastic(0x15171c)); S.key.rotation.x = Math.PI / 2; Z.add(S.key);
  S.cLab = pill('CIBERSEGURIDAD', '#ffffff', 'rgba(20,22,26,.9)', 2.0); Z.add(S.cLab); S.csp = sparks(Z, 160, 0xffffff);
  studio(Z, 800);
}
function cyberAt(t) {
  const O = zones.cyber.position, t0 = ZT.find(z => z[0] === 'cyber')[1], k = eio(prog(t, K.encuentran - 0.45, 0.45));
  S.halves.forEach((g, i) => { const s = i ? 1 : -1; g.position.set(s * lerp(2.0, 0, k), 1.5, 0); g.rotation.y = s * (1 - k) * 0.6; });
  S.shackle.position.set(0, 2.05 + 0.4 * (1 - k), 0); S.shackle.material.color.set(k > 0.98 ? 0xffffff : 0xb8bcc4); S.key.position.set(0, 1.45, 0.26); S.key.visible = k > 0.98;
  burst(S.csp, v3(0, 1.6, 0.3), t, K.encuentran, 1.6, 0.8); S.csp.material.opacity = t > K.encuentran ? Math.max(0, 1 - (t - K.encuentran) / 0.8) : 0;
  S.cLab.position.set(0, 3.0, 0.3); S.cLab.material.opacity = prog(t, K.ciber - 0.1, 0.3);
  post.uniforms.flash.value = t > K.encuentran ? 0.12 * Math.max(0, 1 - (t - K.encuentran) / 0.2) : 0;
  const u = eio(prog(t, t0, 1.8)); cam.position.set(O.x, lerp(2.2, 2.0, u), lerp(7.2, 5.6, u)); cam.lookAt(O.x, 1.8, 0);
}

// ---------------------------------------------------------------- 8 · si lo tuyo es…: los gustos vuelan a su lado; las redes, en medio (más cerca de Teleco)
function buildChoose() {
  const Z = zone('choose', 900); mirrorFloor(Z); floaters(Z);
  S.pads = [platform(Z, -1.15, BLUE, 1.3, 1.4), platform(Z, 1.15, ORANGE, 1.3, 1.4)];
  S.pLabs = [pill('INFORMÁTICA', '#ffffff', 'rgba(20,70,160,.92)', 1.25), pill('TELECO', '#ffffff', 'rgba(170,70,20,.92)', 0.9)]; S.pLabs[0].position.set(-1.15, 0.6, 0.85); S.pLabs[1].position.set(1.15, 0.6, 0.85); S.pLabs.forEach(l => Z.add(l));
  S.beams = [-1.15, 1.15].map((x, i) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 6, 32, 1, true), new THREE.MeshBasicMaterial({ color: i ? ORANGE : BLUE, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); b.position.set(x, 3.1, 0); Z.add(b); return b; });
  S.likes = [['code', -1], ['pad', -1], ['brain', -1], ['dish', 1], ['sat', 1], ['chip', 1], ['wave', 1]].map(([k, s], i) => { const g = icon(k, s < 0 ? BLUE : ORANGE); g.scale.setScalar(0.55); Z.add(g); return { g, s, i }; });
  S.net = icon('globe', ORANGE); S.net.scale.setScalar(0.9); Z.add(S.net); S.netLab = pill('REDES E INTERNET', '#ffffff', 'rgba(20,22,26,.9)', 1.9); Z.add(S.netLab);
  studio(Z, 900);
}
function chooseAt(t) {
  const O = zones.choose.position, t0 = ZT.find(z => z[0] === 'choose')[1];
  const keys = [K.programar, K.videojuegos2, K.inteligencia2, K.antenas2, K.satelites2, K.electronica2, K.ondas];
  const slots = { '-1': [v3(-1.5, 0.55, 0.2), v3(-1.15, 0.55, -0.3), v3(-0.8, 0.55, 0.2)], '1': [v3(0.8, 0.55, 0.25), v3(1.15, 0.6, -0.3), v3(1.5, 0.55, 0.2), v3(1.15, 0.55, 0.5)] };
  let cnt = { '-1': 0, '1': 0 };
  S.likes.forEach(o => { const k = keys[o.i], p = prog(t, k - 0.05, 0.55), slot = slots[o.s][cnt[o.s]++]; o.g.visible = p > 0;
    const e = eio(p), from = v3(0, 2.9, 0.4); o.g.position.copy(from.clone().lerp(slot, e)); o.g.position.y += 1.0 * Math.sin(Math.PI * e); o.g.rotation.set(0, (1 - e) * 4, 0); o.g.scale.setScalar(0.55 * (0.4 + 0.6 * eo(clamp(p * 2)))); });
  const gi = env(t, K.esInfo - 0.1, 99, 0.25, 0.1), gt = env(t, K.esTeleco - 0.1, 99, 0.25, 0.1);
  S.beams[0].material.opacity = 0.07 * gi * (0.8 + 0.2 * Math.sin(t * 6)); S.beams[1].material.opacity = 0.07 * Math.max(gt, 0.5 * env(t, K.valen - 0.1, K.casa + 0.2, 0.2, 0.2)) * (0.8 + 0.2 * Math.sin(t * 6 + 1));
  if (t > K.valen - 0.1 && t < K.aunque) S.beams[0].material.opacity = Math.max(S.beams[0].material.opacity, 0.05);
  const np = eo(prog(t, K.redes3 - 0.1, 0.4)), toT = eio(prog(t, K.juega - 0.1, 0.6));
  S.net.visible = np > 0.01; S.net.position.set(lerp(0, 1.15, toT), lerp(3.4, 2.15, np) - 0.6 * toT + 0.05 * Math.sin(t * 2), 0.2); S.net.scale.setScalar(0.9 * np * (1 - 0.25 * toT)); S.net.rotation.y = t * 0.6;
  S.netLab.position.copy(S.net.position).add(v3(0, 0.75, 0.2)); S.netLab.material.opacity = np * (1 - toT);
  const u = eio(prog(t, t0, 5)); cam.position.set(O.x + 0.15 * Math.sin(t * 0.5), lerp(2.6, 2.4, u), lerp(11.4, 10.8, u)); cam.lookAt(O.x, 1.75, 0);
}

// ---------------------------------------------------------------- 9 · una frase: Informática hace que las cosas funcionen (botón, engranajes, ✓)
function buildWork() {
  const Z = zone('work', 1000); mirrorFloor(Z); floaters(Z);
  S.phrase = pill('LA DIFERENCIA, EN UNA FRASE', '#ffffff', 'rgba(20,22,26,.9)', 3.0); S.phrase.position.set(0, 3.6, 0); Z.add(S.phrase);
  const base = rbox(1.6, 0.3, 1.2, plastic(0x22252c, 0.3), 0.06); base.position.y = 0.15; Z.add(base);
  S.btn = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.25, 40), plastic(BLUE, 0.2)); S.btn.position.y = 0.42; Z.add(S.btn);
  const bl = label('RUN', { size: 120, w: 0.55, color: '#ffffff' }); bl.rotation.x = -Math.PI / 2; bl.position.y = 0.56; S.btnL = bl; Z.add(bl);
  S.wg = [[-0.9, 2.0, 0.55, 14, BLUE], [0.15, 1.75, 0.4, 10, 0x46b4ff], [0.95, 2.25, 0.5, 12, BLUE]].map(([x, y, r, n, c], i) => { const m = new THREE.Mesh(gearGeo(n, r, 0.14), plastic(c, 0.2)); m.position.set(x, y, -0.3); Z.add(m); return { m, n, i }; });
  S.check = label('✓', { size: 260, color: '#19e37c', w: 1.0 }); S.check.position.set(0, 3.2, 0.2); Z.add(S.check);
  studio(Z, 1000);
}
function workAt(t) {
  const O = zones.work.position, t0 = ZT.find(z => z[0] === 'work')[1];
  S.phrase.material.opacity = env(t, K.diferencia - 0.1, K.informatica4 - 0.05, 0.3, 0.25);
  const press = env(t, K.hace1 - 0.1, K.hace1 + 0.35, 0.1, 0.2); S.btn.position.y = 0.42 - 0.1 * press; S.btnL.position.y = 0.56 - 0.1 * press;
  const go = t > K.hace1 + 0.1, spd = go ? 2.2 * eio(prog(t, K.hace1 + 0.1, 0.6)) : 0;
  S.wg.forEach(o => { o.m.rotation.z = (t - K.hace1) * spd * (o.i % 2 ? -1 : 1) * 14 / o.n; o.m.visible = t > K.informatica4 - 0.2; o.m.scale.setScalar(eo(prog(t, K.informatica4 - 0.2 + o.i * 0.1, 0.35))); });
  const ck = eo(prog(t, K.funcionen - 0.1, 0.35)); S.check.visible = ck > 0.01; S.check.scale.setScalar(ck * (1 + 0.2 * Math.sin(Math.PI * clamp((t - K.funcionen) / 0.35)))); S.check.position.set(0, 3.25, 0.2);
  const u = eio(prog(t, t0, 3.5)); cam.position.set(O.x, lerp(2.6, 2.4, u), lerp(9.4, 8.8, u)); cam.lookAt(O.x, 1.85, 0);
}

// ---------------------------------------------------------------- 10 · Teleco hace que lleguen: un paquete viaja por el planeta (rápido, seguro, a cualquier parte)
function buildArrive() {
  const Z = zone('arrive', 1100); mirrorFloor(Z, 40, 0.86); floaters(Z);
  const e = icon('globe', ORANGE); e.scale.setScalar(3.0); e.position.y = 2.0; Z.add(e); S.earth = e;
  S.phA = icon('phone', BLUE); S.phA.scale.setScalar(0.6); Z.add(S.phA); S.phB = icon('phone', ORANGE); S.phB.scale.setScalar(0.6); Z.add(S.phB);
  S.sat2 = icon('sat', ORANGE); S.sat2.scale.setScalar(0.45); Z.add(S.sat2);
  S.pkt = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd28a })); Z.add(S.pkt);
  S.pktL = new THREE.PointLight(0xffb060, 4, 2, 1.6); Z.add(S.pktL);
  S.trail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(0, 0, 0), v3(0, 0.1, 0)]), 8, 0.02, 6), new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.8 })); Z.add(S.trail);
  S.lock2 = icon('lock', ORANGE); S.lock2.scale.setScalar(0.25); Z.add(S.lock2);
  S.arcs = Array.from({ length: 9 }, (_, i) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(0, 0, 0), v3(0, 0.1, 0)]), 40, 0.012, 6), new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0 })); Z.add(m); return m; });
  studio(Z, 1100);
}
function sph(lat, lon, r) { return v3(r * Math.cos(lat) * Math.sin(lon), 2.0 + r * Math.sin(lat), r * Math.cos(lat) * Math.cos(lon)); }
function arcPts(a, b, lift, n = 40) { const pts = []; for (let i = 0; i <= n; i++) { const q = i / n, p = a.clone().lerp(b, q), c = v3(0, 2.0, 0); const d = p.clone().sub(c); d.setLength(d.length() + lift * Math.sin(Math.PI * q)); pts.push(c.clone().add(d)); } return pts; }
function arriveAt(t) {
  const O = zones.arrive.position, t0 = ZT.find(z => z[0] === 'arrive')[1];
  S.earth.rotation.y = (t - t0) * 0.12;
  const R = 1.4, A = sph(0.35, -0.9, R + 0.05), B = sph(0.25, 0.95, R + 0.05), Sat = sph(0.9, 0.0, R + 0.9);
  S.phA.position.copy(A).add(v3(-0.35, 0.1, 0.2)); S.phB.position.copy(B).add(v3(0.35, 0.1, 0.2)); S.sat2.position.copy(Sat); S.sat2.rotation.y = t;
  const route = [...arcPts(A, Sat, 0.2, 30), ...arcPts(Sat, B, 0.2, 30)], curve = new THREE.CatmullRomCurve3(route);
  const k = eio(prog(t, K.lleguen - 0.3, 0.9)), fast = prog(t, K.rapido - 0.1, 0.3);
  const q = k < 1 ? k : ((t - K.rapido) * 1.6) % 1; const p = curve.getPoint(clamp(q)); S.pkt.position.copy(p); S.pktL.position.copy(p); S.pkt.visible = t > K.lleguen - 0.3;
  const q0 = Math.max(0, q - 0.25 - 0.2 * fast); const pts = []; for (let i = 0; i <= 20; i++) pts.push(curve.getPoint(q0 + (q - q0) * i / 20)); S.trail.geometry.dispose(); S.trail.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.02 + 0.02 * fast, 6); S.trail.visible = S.pkt.visible && q > 0.02;
  const sk = eo(prog(t, K.seguro - 0.1, 0.3)); S.lock2.visible = sk > 0.01; S.lock2.position.copy(p).add(v3(0, 0.22, 0)); S.lock2.scale.setScalar(0.25 * sk);
  const ak = prog(t, K.cualquier - 0.15, 0.8);
  S.arcs.forEach((m, i) => { const a = sph(0.3, -0.9, R), b = sph(-0.6 + hash(i) * 1.4, -2.5 + hash(i * 3) * 5, R), pts2 = arcPts(a, b, 0.35 + hash(i * 5) * 0.3); const n = Math.max(2, Math.floor(pts2.length * clamp(ak * 1.5 - i * 0.06))); m.visible = ak > 0 && n > 2; if (m.visible) { m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2.slice(0, n)), 30, 0.012, 6); m.material.opacity = 0.85; } });
  const u = eio(prog(t, t0, 4)); cam.position.set(O.x + 0.2 * Math.sin(t * 0.5), lerp(2.8, 2.5, u), lerp(8.8, 8.0, u)); cam.lookAt(O.x, 2.05, 0);
}

// ---------------------------------------------------------------- reparto de tiempos y fotograma
let KC = [], KT = [];
const RUN = { duel: t => duelAt(t, false), fame: fameAt, inside: insideAt, base: baseAt, bridge: bridgeAt, crea: t => teamAt(S.crea, t, KC, false), conecta: t => teamAt(S.conecta, t, KT, true), cyber: cyberAt, choose: chooseAt, work: workAt, arrive: arriveAt, end: t => duelAt(t, true) };
const ZONE_OF = { end: 'duel' };
function zoneAt(t) { let z = ZT[0]; for (const q of ZT) if (t >= q[1]) z = q; return z; }
function frame(t) {
  const [name] = zoneAt(t), zname = ZONE_OF[name] || name;
  for (const k in zones) zones[k].visible = k === zname;
  FLOAT.forEach(f => { f.l.position.y = f.y + 0.25 * Math.sin(t * 0.6 + f.ph); f.l.rotation.z = 0.15 * Math.sin(t * 0.4 + f.ph); });
  post.uniforms.flash.value = 0;
  RUN[name](t);
  let blur = 0, dir = 1;
  ZT.forEach(([n, ts], i) => { if (i === 0) return; const x = (t - ts) / 0.18; if (Math.abs(x) < 1) { blur = Math.max(blur, 1 - Math.abs(x)); dir = i % 2 ? 1 : -1; } });
  return { dir: [0.07 * blur * dir, 0.015 * blur], fade: 0, vig: 0.3 };
}

window.renderAt = function (t) {
  const st = frame(t);
  if (window.camOverride) { window.camOverride(cam, v3); st.dir = [0, 0]; }
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  post.uniforms.tA.value = rtA.texture; post.uniforms.dir.value.set(st.dir[0], st.dir[1]); post.uniforms.fade.value = st.fade; post.uniforms.vig.value = st.vig; post.uniforms.time.value = t;
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
    tension: at('tension'), los: at('=los', 1), solo1: at('solo', 1), solo2: at('solo', 2), ninguno: at('ninguno'), razon: at('razon'),
    tres: at('=tres'), zaragoza: at('zaragoza'), sesenta: at('sesenta'), ciento: at('ciento'), dentro: at('dentro'), admiten: at('admiten'),
    matematicas: at('matematicas'), algebra: at('algebra'), calculo: at('calculo'), estadistica: at('estadistica'), programacion: at('programacion'), algoritmos: at('algoritmos'),
    arquitectura: at('arquitectura'), digitales: at('digitales'), operativos: at('operativos'), redes: at('redes', 1), quien: at('quien'), otra: at('otra'), rivalidad: at('rivalidad'),
    redes2: at('redes', 2), satelites: at('satelites', 1), ciber: at('ciberseguridad'), encuentran: at('encuentran'),
    programar: at('programar', 2), videojuegos2: at('videojuegos', 2), inteligencia2: at('inteligencia', 2), esInfo: at('informatica', 6) - 0.15,
    antenas2: at('antenas', 3), satelites2: at('satelites', 2), electronica2: at('electronica', 2), ondas: at('ondas'), esTeleco: at('teleco', 6) - 0.15,
    redes3: at('redes', 3), valen: at('valen'), aunque: at('aunque'), juega: at('juega'), casa: at('casa'),
    diferencia: at('diferencia'), informatica4: at('informatica', 7), hace1: at('hace', 2), funcionen: at('funcionen'),
    lleguen: at('lleguen'), rapido: at('rapido'), seguro: at('seguro'), cualquier: at('cualquier'), cuentame: at('cuentame'), equipo: at('equipo'),
  };
  KC = [at('videojuegos', 1), at('aplicaciones'), at('webs'), at('inteligencia', 1), at('software'), at('datos'), at('sistemas', 3)];
  KT = [at('redes', 2), at('fibra'), at('satelites', 1), at('antenas', 2), at('electronica', 1), at('comunicaciones')];
  ZT.push(['duel', -1], ['fame', at('tienen') - 0.45], ['inside', at('=pero', 1) - 0.1], ['base', at('matematicas') - 0.15], ['bridge', at('tanto') - 0.1],
    ['crea', at('informatica', 5) - 0.1], ['conecta', at('teleco', 5) - 0.1], ['cyber', at('ciberseguridad') - 0.35], ['choose', at('=si', 1) - 0.1],
    ['work', at('diferencia') - 0.25], ['arrive', at('teleco', 8) - 0.1], ['end', at('cuentame') - 0.1]);
  ZT.sort((a, b) => a[1] - b[1]);
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6; }
  buildDuel(); buildFame(); buildInside(); buildBase(); buildBridge();
  S.crea = buildTeam('crea', 500, BLUE, CREA, CREA_TXT); S.conecta = buildTeam('conecta', 600, ORANGE, CONE, CONE_TXT);
  buildCyber(); buildChoose(); buildWork(); buildArrive();
  window.ZT = ZT; window.K = K;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
