// «Ingeniería Eléctrica» — plano secuencia: la cámara sigue a la corriente de escena en escena (sin cortes), sobre un
// suelo espejo continuo; objetos plastificados, resplandor (bloom) y acabado cinematográfico. Pensado para 60 fps.
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
const post = new THREE.ShaderMaterial({        // acabado cinematográfico: desenfoque de movimiento, resplandor, aberración cromática, ACES, gradación teal/naranja, grano
  uniforms: { tA: { value: null }, tB: { value: null }, tC: { value: null }, dir: { value: new THREE.Vector2(0, 0) }, fade: { value: 0 }, vig: { value: 0.3 }, time: { value: 0 }, flash: { value: 0 }, bloom: { value: 0.5 } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D tA, tB, tC; uniform vec2 dir; uniform float fade, vig, time, flash, bloom; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec2 c = vUv - .5; vec2 ca = c * 0.0035; vec3 a = vec3(0.), b = vec3(0.);
      for(int i=0;i<20;i++){ float k=(float(i)/19.0-0.5); vec2 u=vUv+dir*k; a.r+=texture2D(tA, u+ca).r; a.g+=texture2D(tA, u).g; a.b+=texture2D(tA, u-ca).b; } a/=20.0;
      for(int i=0;i<6;i++){ float k=(float(i)/5.0-0.5); vec2 u=vUv+dir*k; b += texture2D(tB, u).rgb * 0.7 + texture2D(tC, u).rgb; } b /= 6.0;
      a += b * bloom;                                                                                       // resplandor: solo lo que de verdad brilla (HDR)
      a = mix(a, vec3(0.0), fade); a += flash;
      a *= 1.1; a = clamp((a*(2.51*a+0.03))/(a*(2.43*a+0.59)+0.14),0.,1.); a = pow(a, vec3(1.0/2.2));
      float lu = dot(a, vec3(0.2126,0.7152,0.0722));
      a += vec3(-0.012, 0.012, 0.035) * (1.0 - lu) * (1.0 - lu) + vec3(0.035, 0.012, -0.025) * lu * lu;   // sombras frías, luces cálidas
      a = mix(vec3(lu), a, 1.22); a = mix(a, a*a*(3.0-2.0*a), 0.25);                                       // saturación y curva en S
      vec2 d = c*vec2(0.5625,1.0); a *= 1.0 - vig*smoothstep(0.25,0.85,length(d)*1.6);
      a += (h(vUv*vec2(1080.,1920.) + fract(time*7.13)*91.7) - 0.5) * 0.026;                                // grano de película
      gl_FragColor = vec4(clamp(a,0.,1.), 1.0); }`,
  depthTest: false,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post), quadScene = new THREE.Scene(); quadScene.add(quad);
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
const cam = new THREE.PerspectiveCamera(36, W / H, 0.01, 400); cam.layers.enable(1);
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
  m.renderOrder = 9; m.layers.set(1); return m;
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



// ---------------------------------------------------------------- piezas comunes
const YEL = 0xffd23f, CYAN = 0x3ad4ff;
function pill(txt, color = '#ffffff', bg = 'rgba(20,22,26,.86)', w = 1.4, size = 70) { return label(txt, { size, w, pill: true, color, bg }); }
function sparks(Z, n = 80, color = 0xffe08a, size = 0.045) { const p = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)), new THREE.PointsMaterial({ color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); Z.add(p); p.userData.n = n; p.frustumCulled = false; return p; }
function burst(p, c, t, t0, spread = 1, life = 0.6, loop = true) {
  const a = p.geometry.attributes.position.array, n = p.userData.n;
  for (let i = 0; i < n; i++) { let tt = (t - t0) + hash(i) * life * (loop ? 1 : 0.15); tt = loop ? tt % life : Math.max(0, tt); const th = hash(i * 3) * Math.PI * 2, ph = (hash(i * 7) - 0.3) * 1.6, v = (1.2 + hash(i * 11) * 2.2) * spread;
    a[i * 3] = c.x + Math.cos(th) * Math.cos(ph) * v * tt; a[i * 3 + 1] = c.y + Math.sin(ph) * v * tt - 3 * tt * tt; a[i * 3 + 2] = c.z + Math.sin(th) * Math.cos(ph) * v * tt; }
  p.geometry.attributes.position.needsUpdate = true;
}
function bar(a, b, r, m, seg = 6) { const d = b.clone().sub(a), L = d.length(); const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), m); c.position.copy(a).add(b).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize()); return c; }
const glowM = (c, i = 2.5) => new THREE.MeshStandardMaterial({ color: 0x050505, emissive: c, emissiveIntensity: i, roughness: 0.5 });
function tube(pts, r, m, seg) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg || pts.length * 4, r, 8), m); }
function cat(a, b, sag, n = 24) { const pts = []; for (let i = 0; i <= n; i++) { const q = i / n, p = a.clone().lerp(b, q); p.y -= sag * 4 * q * (1 - q); pts.push(p); } return pts; }
function hardHat(d, color = 0xffffff) { const J = d.userData.J, m = plastic(color, 0.2); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.088, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.position.y = 0.11; J.neck.add(dome); const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.012, 24), m); brim.position.y = 0.11; J.neck.add(brim); }
function engineer(color = YEL, s = 1) { const d = dollP(color, s); hardHat(d); return d; }
// cámara por fotogramas clave: [[t, [x,y,z] posición, [x,y,z] mira, fov?], …] en coordenadas de la zona.
// Interpolación cúbica monótona (Fritsch–Carlson) con los tiempos reales: suave y sin pasarse nunca de largo.
function mono(t, T, Y) {
  const n = T.length; if (t <= T[0]) return Y[0]; if (t >= T[n - 1]) return Y[n - 1];
  let i = 0; while (t > T[i + 1]) i++;
  const d = k => (Y[k + 1] - Y[k]) / (T[k + 1] - T[k]), hh = k => T[k + 1] - T[k];
  const m = k => { if (k <= 0 || k >= n - 1) return 0; const a = d(k - 1), b = d(k); if (a * b <= 0) return 0; const h0 = hh(k - 1), h1 = hh(k); return 3 * (h0 + h1) / ((2 * h1 + h0) / a + (h1 + 2 * h0) / b); };
  const h = hh(i), u = (t - T[i]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * Y[i] + (u3 - 2 * u2 + u) * h * m(i) + (-2 * u3 + 3 * u2) * Y[i + 1] + (u3 - u2) * h * m(i + 1);
}
function camKeys(t, KS, ox) {
  const T = KS.map(k => k[0]), comp = (j, c) => mono(t, T, KS.map(k => k[j][c]));
  return { p: v3(comp(1, 0) + ox, comp(1, 1), comp(1, 2)), l: v3(comp(2, 0) + ox, comp(2, 1), comp(2, 2)), f: mono(t, T, KS.map(k => k[3] || 36)) };
}
// cámara que se para en cada cosa y se desplaza rápido (y suave) a la siguiente: P = [[t de llegada, x], …]
const sm5 = x => x * x * x * (x * (x * 6 - 15) + 10);
function holdMove(t, P, dur = 0.34) { let x = P[0][1]; for (let i = 1; i < P.length; i++) x += (P[i][1] - P[i - 1][1]) * sm5(clamp((t - (P[i][0] - dur)) / dur)); return x; }
// torre de alta tensión de celosía (crucetas a lo largo de z: la línea corre a lo largo de x; girada 90° corre a lo largo de z)
function pylon(h = 4, m = metal(0xc9ced6, 0.35)) {
  const g = new THREE.Group(), corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const at = y => { const w = lerp(0.5, 0.11, Math.min(1, y / (h * 0.8))); return corners.map(([x, z]) => v3(x * w, y, z * w)); };
  const lv = [0, h * 0.2, h * 0.4, h * 0.58, h * 0.72, h * 0.8, h];
  for (let k = 0; k < lv.length - 1; k++) { const A = at(lv[k]), B = at(lv[k + 1]); for (let c = 0; c < 4; c++) { g.add(bar(A[c], B[c], 0.02 * h / 4, m)); g.add(bar(A[c], B[(c + 1) % 4], 0.008 * h / 4, m)); g.add(bar(A[(c + 1) % 4], B[c], 0.008 * h / 4, m)); } }
  const arms = [], ins = plastic(0x2a5f8a, 0.3);
  for (const [y, w] of [[h * 0.72, 0.95], [h * 0.86, 0.72]]) { g.add(bar(v3(0, y, -w), v3(0, y, w), 0.026 * h / 4, m)); g.add(bar(v3(0, y, -w), v3(0, y + 0.22, -0.12), 0.01, m)); g.add(bar(v3(0, y, w), v3(0, y + 0.22, 0.12), 0.01, m));
    for (const z of [-w + 0.05, w - 0.05]) { const i2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 10), ins); i2.position.set(0, y - 0.11, z); g.add(i2); arms.push(v3(0, y - 0.22, z)); } }
  g.userData.arms = arms; return g;
}
// ventanas de edificio (4 × 8 por tesela, algunas apagadas) y pantalla de móvil
function windowTex(seed) { return canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) { const r = hash(seed * 31 + y * 7 + x * 13); if (r < 0.5) { g.fillStyle = r < 0.06 ? '#9fd8ff' : (r < 0.36 ? '#ffd29a' : '#ffe6c2'); g.fillRect(8 + x * 30, 10 + y * 31, 20, 18); } } }); }
function screenTex() { return canvasTex(256, 512, (q, w, h) => { q.fillStyle = '#0d1117'; q.fillRect(0, 0, w, h); q.fillStyle = '#ffd23f'; rr(q, 20, 30, w - 40, 70, 18); q.fill(); for (let i = 0; i < 4; i++) { q.fillStyle = '#23262c'; rr(q, 20, 130 + i * 90, w - 40, 70, 14); q.fill(); q.fillStyle = ['#3ad4ff', '#19e37c', '#ff6a2b', '#8a5cff'][i]; q.beginPath(); q.arc(55, 165 + i * 90, 18, 0, 7); q.fill(); q.fillStyle = '#c9ced6'; rr(q, 85, 155 + i * 90, 130, 12, 6); q.fill(); } }); }
function flick(t, i) { return Math.sin(t * 83 + i * 3.7) > -0.2 ? 1 : 0.12; }
function lookLab(l, k, pos) { l.visible = k > 0.01; l.material.opacity = k; l.position.copy(pos); l.lookAt(cam.position); }

// ---------------------------------------------------------------- 0 · ciudad de noche: «apaga la luz» (gancho) y vuelta a encender (final)
const CITY = { sw: v3(0, 0, 4.2), eng: v3(0.62, 0, 4.45) };
function buildCity() {
  const Z = zone('city', 0);
  const bases = Array.from({ length: 6 }, (_, k) => windowTex(k + 1)), top = new THREE.MeshStandardMaterial({ color: 0x0e1118, roughness: 0.7, metalness: 0.2 });
  S.blds = [];
  const addB = (x, z, w, h, d, tint = 0x141824, tex0 = null, base = 1.3) => {
    const tex = (tex0 || bases[Math.floor(hash(x * 7 + z * 3) * 6) % 6]).clone(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(Math.max(1, Math.round(w)), Math.max(1, Math.round(h / 2))); tex.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.5, metalness: 0.3, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: base });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [m, m, top, top, m, m]); b.position.set(x, h / 2, z); Z.add(b);
    S.blds.push({ m, base, dist: Math.hypot(x - CITY.sw.x, z - CITY.sw.z), i: S.blds.length }); return b;
  };
  for (let r = 0; r < 8; r++) for (let c = -7; c <= 7; c++) {
    const z = -3.8 - r * 2.4 + (hash(c * 3 + r) - 0.5) * 0.6, x = c * 1.6 + (hash(c + r * 9) - 0.5) * 0.5;
    if (r === 0 && Math.abs(x - 2.4) < 1.5) continue;      // hueco para el hospital
    const w = 0.9 + hash(c * 5 + r * 2) * 0.6, d = 0.9 + hash(c * 7 + r) * 0.6; let h = 1.0 + hash(c * 11 + r * 13) * (1.4 + r * 0.5); if (hash(c * 17 + r * 19) > 0.86) h += 2.5 + r * 0.4;
    addB(x, z, w, h, d);
  }
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) addB(s * (4.0 + hash(k + s) * 0.6), 3.4 - k * 2.0, 1.2, 1.4 + hash(k * 3 + s) * 2.2, 1.2);
  const hospTex = canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#dff1ff'; for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) g.fillRect(8 + x * 30, 10 + y * 31, 22, 16); });
  addB(2.4, -3.8, 1.6, 3.2, 1.3, 0x8a93a6, hospTex, 1.1); S.hospIdx = S.blds.length - 1;
  S.crossM = glowM(0xff2030, 4); for (const [w, h] of [[0.52, 0.15], [0.15, 0.52]]) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), S.crossM); o.position.set(2.4, 2.72, -3.12); Z.add(o); }
  // metro elevado (dos vagones)
  const beam = rbox(30, 0.14, 0.5, metal(0x3a3f48, 0.4), 0.03); beam.position.set(0, 1.45, -1.6); Z.add(beam);
  for (let x = -13.2; x <= 13.2; x += 2.2) { const p = rbox(0.14, 1.45, 0.14, metal(0x3a3f48, 0.4), 0.02); p.position.set(x, 0.72, -1.6); Z.add(p); }
  const winT = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff2d0'; for (let i = 0; i < 6; i++) g.fillRect(12 + i * 40, 16, 28, 26); });
  S.trainWin = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0xffffff, emissiveMap: winT, emissiveIntensity: 2.4 });
  S.train = new THREE.Group(); Z.add(S.train);
  for (let k = 0; k < 2; k++) { const x = k * 1.21; const car = rbox(1.15, 0.42, 0.46, plastic(0xe9edf4, 0.25), 0.12); car.position.set(x, 1.75, -1.6); S.train.add(car);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.2), S.trainWin); w.position.set(x, 1.79, -1.6 + 0.235); S.train.add(w);
    const st = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.05, 0.465), plastic(0x2f8bff, 0.3)); st.position.set(x, 1.6, -1.6); S.train.add(st); }
  // móvil gigante en la plaza
  S.phone = new THREE.Group(); S.phone.position.set(-1.9, 0, 2.0); S.phone.rotation.y = 0.12; Z.add(S.phone);
  const ped = rbox(0.5, 0.3, 0.3, metal(0x2a2d34, 0.3), 0.04); ped.position.y = 0.15; S.phone.add(ped);
  const body = rbox(0.62, 1.22, 0.07, plastic(0x111317, 0.2), 0.08); body.position.y = 0.92; S.phone.add(body);
  S.phoneScr = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0xffffff, emissiveMap: screenTex(), emissiveIntensity: 1.8 });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 1.14), S.phoneScr); scr.position.set(0, 0.92, 0.037); S.phone.add(scr);
  // farolas
  S.lamps = [];
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const x = s * 2.6, z = 5.6 - k * 2.2; const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.4, 8), metal(0x3a3f48)); pole.position.set(x, 0.7, z); Z.add(pole);
    const bm = glowM(0xffd9a0, 3); const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), bm); b.position.set(x, 1.42, z); Z.add(b); S.lamps.push({ m: bm, dist: Math.hypot(x - CITY.sw.x, z - CITY.sw.z), i: 300 + k + (s + 1) * 3 }); }
  S.lampL = [new THREE.PointLight(0xffc98a, 3, 6, 1.8), new THREE.PointLight(0xffc98a, 3, 6, 1.8)]; S.lampL[0].position.set(-2.6, 1.3, 3.4); S.lampL[1].position.set(2.6, 1.3, 3.4); S.lampL.forEach(l => Z.add(l));
  // interruptor gigante en medio de la plaza (con su propio foco: se ve aunque todo se apague)
  S.sw = new THREE.Group(); S.sw.position.copy(CITY.sw); Z.add(S.sw);
  const pst = rbox(0.12, 0.5, 0.12, metal(0x3a3f48), 0.03); pst.position.y = 0.25; S.sw.add(pst);
  const plate = rbox(0.78, 1.1, 0.08, plastic(0xf4f6fa, 0.18), 0.08); plate.position.y = 1.05; S.sw.add(plate);
  S.rocker = new THREE.Group(); S.rocker.position.set(0, 1.05, 0.05); S.sw.add(S.rocker);
  S.rocker.add(rbox(0.34, 0.6, 0.1, plastic(0xffffff, 0.15), 0.06));
  S.swLed = glowM(CYAN, 3); const led = new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), S.swLed); led.position.set(0, -0.2, 0.052); S.rocker.add(led);
  const swSpot = new THREE.SpotLight(0xdfe8ff, 26, 12, 0.42, 0.7, 1.5); swSpot.position.set(0.4, 4.2, 8.2); swSpot.target.position.set(0, 1.0, 4.2); Z.add(swSpot); Z.add(swSpot.target);
  // ingeniera/o: maniquí amarillo con casco y bombilla en la mano
  S.eng = engineer(YEL, 1.1); Z.add(S.eng);
  const bg = new THREE.Group(); bg.position.y = -0.2; S.eng.userData.J.elR.add(bg);
  S.bulbM = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff0b0, emissiveIntensity: 0, roughness: 0.2 }); const gb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 14), S.bulbM); gb.position.y = -0.07; bg.add(gb);
  const bb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), metal()); bg.add(bb);
  S.bulbL = new THREE.PointLight(0xfff0c0, 0, 4, 1.6); gb.add(S.bulbL);
  S.engSpot = new THREE.SpotLight(0xfff2d0, 0, 12, 0.32, 0.6, 1.5); S.engSpot.position.set(0.7, 5.5, 5.9); S.engSpot.target.position.set(0.55, 0.6, 4.45); Z.add(S.engSpot); Z.add(S.engSpot.target);
  S.engLab = pill('INGENIERÍA ELÉCTRICA', '#1b1d24', 'rgba(255,210,63,.95)', 1.2); Z.add(S.engLab);
  S.moon = new THREE.DirectionalLight(0x8090ff, 0.7); S.moon.position.set(-5, 8, 6); Z.add(S.moon);
  S.cityHemi = new THREE.HemisphereLight(0x5060a0, 0x0a0a10, 0.5); Z.add(S.cityHemi);
}
function cityLevel(t, dist, i, final) {
  if (!final) { const off = 0.18 + dist * 0.03 + hash(i) * 0.08; return t < off ? 1 : t < off + 0.1 ? flick(t, i) : 0; }
  const off = K.apaga2 + 0.05 + dist * 0.016 + hash(i) * 0.06, on = K.encender + 0.1 + dist * 0.026 + hash(i) * 0.12;
  if (t < off) return 1; if (t < off + 0.08) return flick(t, i); if (t < on) return 0; if (t < on + 0.1) return flick(t, i); return 1;
}
function cityAt(t, final) {
  const O = zones.city.position;
  let sum = 0;
  const hk = t < K.hospital + 0.15 ? 1 : t < K.hospital + 0.27 ? flick(t, 7) : 0;
  S.blds.forEach(b => { let L = cityLevel(t, b.dist, b.i, final); if (!final && b.i === S.hospIdx) L = hk; b.m.emissiveIntensity = b.base * L; sum += L; });
  S.crossM.emissiveIntensity = 4 * (final ? cityLevel(t, 8.2, S.hospIdx, true) : hk);
  S.lamps.forEach(l => (l.m.emissiveIntensity = 3 * cityLevel(t, l.dist, l.i, final)));
  const lampOn = cityLevel(t, 2.6, 301, final); S.lampL.forEach(l => (l.intensity = 3 * lampOn));
  // metro: entra iluminado y, al oír «metro», se apaga y frena hasta pararse en el centro
  const v = 3.2, tau = 0.3, xs = -0.2; let tx, tw;
  if (!final) { const ts = K.metro + 0.12; tx = t < ts ? xs - v * tau - v * (ts - t) : xs - v * tau * Math.exp(-(t - ts) / tau); tw = t < ts ? 1 : t < ts + 0.12 ? flick(t, 11) : 0; }
  else { tx = xs; tw = cityLevel(t, 6.0, 11, true); }
  S.train.position.x = tx; S.trainWin.emissiveIntensity = 2.4 * tw;
  S.phoneScr.emissiveIntensity = 1.8 * (final ? cityLevel(t, 4.3, 12, true) : (t < K.movil + 0.15 ? 1 : t < K.movil + 0.27 ? flick(t, 12) : 0));
  const amb = sum / S.blds.length; S.cityHemi.intensity = 0.3 + 0.4 * amb; S.moon.intensity = 0.5 + 0.3 * amb;
  // interruptor: se apaga al empezar; al final se apaga con la ciudad y lo vuelve a encender la ingeniera
  const offK = !final ? eo(prog(t, 0.05, 0.12)) : t < K.encender - 0.06 ? eo(prog(t, K.apaga2, 0.12)) : 1 - eo(prog(t, K.encender - 0.06, 0.12));
  S.rocker.rotation.x = lerp(-0.22, 0.22, offK); S.swLed.emissiveIntensity = 3 * (1 - offK) + 0.6;
  // ingeniera: aparece bajo un foco al oír «alguien»
  const J = S.eng.userData.J, ta = final ? K.alguien2 : K.alguien, k = eo(prog(t, ta - 0.1, 0.4));
  S.eng.visible = t > ta - 0.14; S.eng.position.copy(CITY.eng);
  S.bulbL.intensity = 3.5 * k; S.engSpot.intensity = 70 * eo(prog(t, ta - 0.14, 0.25));
  J.shR.rotation.set(lerp(-0.1, -2.95, k), 0, 0.15); J.elR.rotation.x = lerp(-0.2, -0.1, k);
  if (!final) {
    S.eng.rotation.y = -0.15 + 0.1 * Math.sin(t * 0.8); J.shL.rotation.set(0.05, 0, -0.15); J.elL.rotation.x = -0.2; S.bulbM.emissiveIntensity = 5 * k;
    lookLab(S.engLab, env(t, K.ingenieria - 0.1, 99, 0.25, 0.1), v3(0.25, 0.55, 5.0));
  } else {
    const press = env(t, K.encender - 0.32, K.encender + 0.45, 0.24, 0.3);
    S.eng.rotation.y = -0.2; J.shL.rotation.set(-0.3 * press, 0, -0.15 - 1.85 * press); J.elL.rotation.x = -0.25 * press; S.bulbM.emissiveIntensity = 5 * k * (1 - 0.5 * press);
    S.engLab.visible = false;
  }
  const keys = final ? [[K.porque - 0.4, [0, 2.1, 11.0], [0, 1.7, -4]], [K.apaga2 + 0.3, [0, 1.9, 10.2], [0, 1.6, -2]], [K.alguien2 + 0.25, [0.25, 1.25, 8.95], [0.25, 1.1, 4.3]], [K.encender + 0.1, [0.25, 1.25, 8.6], [0.25, 1.12, 4.3]],
    [K.encender + 0.8, [0.25, 1.4, 9.8], [0.25, 1.35, 1.5]], [K.cuentame + 0.4, [0.25, 1.3, 9.8], [0.25, 1.35, 0]], [END, [0.25, 1.25, 9.6], [0.25, 1.35, 0]]]
    : [[0, [0.1, 1.2, 8.8], [0.1, 1.35, 0]], [1.05, [0, 1.6, 10.0], [0, 1.6, -2]], [K.movil - 0.2, [-1.9, 1.0, 5.3], [-1.9, 0.9, 2.0]], [K.movil + 0.35, [-1.85, 1.0, 5.1], [-1.9, 0.9, 2.0]],
      [K.metro + 0.05, [0.4, 3.5, 7.4], [0.4, 1.75, -1.6]], [K.metro + 0.5, [0.45, 3.45, 7.2], [0.45, 1.75, -1.6]], [K.hospital, [2.4, 2.0, 4.9], [2.4, 1.85, -3.8]], [K.hospital + 0.6, [2.35, 2.0, 4.7], [2.4, 1.85, -3.8]],
      [K.alguien - 0.35, [0.25, 1.9, 10.4], [0.25, 1.5, 0]], [K.alguien + 0.3, [0.25, 1.25, 8.95], [0.25, 1.1, 4.3]], [K.alguien + 2.4, [0.25, 1.25, 8.6], [0.25, 1.1, 4.3]]];
  return camKeys(t, keys, O.x);
}

// ---------------------------------------------------------------- 1 · siete maniquíes sobre un cable de alta tensión: caen tres (3 de 7 ≈ 43 %)
const WR = { fall: [1, 4, 5], dt: [0, 0.16, 0.3], px: 2.5 };
function buildWire() {
  const Z = zone('wire', 30), lm = metal(0xc9ced6, 0.35);
  S.wpy = [-WR.px, WR.px].map(x => { const p = pylon(4.4, lm); p.position.set(x, 0, 0); Z.add(p); return p; });
  const cm = new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.35, metalness: 0.7 }), y1 = 4.4 * 0.86 - 0.22, y2 = 4.4 * 0.72 - 0.22, cond = [[y1, 0.67], [y1, -0.67], [y2, 0.9], [y2, -0.9]];
  S.wireY = x => y1 - 0.16 * (1 - (x / WR.px) ** 2);
  for (const [y, z] of cond) { Z.add(tube(cat(v3(-WR.px, y, z), v3(WR.px, y, z), 0.16, 30), 0.022, cm, 60)); for (const s of [-1, 1]) Z.add(tube(cat(v3(s * WR.px, y, z), v3(s * (WR.px + 6), y, z), 0.3, 30), 0.022, cm, 60)); }
  S.wd = []; for (let i = 0; i < 7; i++) { const d = dollP(i === 3 ? PL.green : PL.blue, 0.95); Z.add(d); S.wd.push({ d, x: (i - 3) * 0.42, fi: WR.fall.indexOf(i), i }); }
  S.wsp = WR.fall.map(() => sparks(Z, 70, 0xffe08a, 0.04));
  S.usal = pill('UNIVERSIDAD DE SALAMANCA', '#ffffff', 'rgba(20,22,26,.9)', 1.45); Z.add(S.usal);
  S.pTex = canvasTex(800, 380); S.pct = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7 * 380 / 800), new THREE.MeshBasicMaterial({ map: S.pTex, transparent: true, depthWrite: false })); S.pct.layers.set(1); S.pct.renderOrder = 9; Z.add(S.pct);
  studio(Z, 30, 1.0);
}
function wireAt(t) {
  const O = zones.wire.position;
  S.wd.forEach(o => { const J = o.d.userData.J, y0 = S.wireY(o.x) + 0.03;
    const wob = Math.sin(t * 2.2 + o.i * 1.3);
    let rot = 0, k = 0, fall = 0, fy = 0;
    if (o.fi >= 0) { const t0 = K.abandono + WR.dt[o.fi]; k = clamp((t - t0 + 0.35) / 0.35); fall = Math.max(0, t - t0); }
    const g = 9.8, land = Math.sqrt(2 * y0 / g);
    if (fall > 0) { const tt = Math.min(fall, land); fy = -0.5 * g * tt * tt; rot = Math.min(1, fall / land) * (o.i % 2 ? 1.5 : -1.4); }
    const lying = fall > land ? Math.exp(-(fall - land) * 6) * 0.08 * Math.abs(Math.sin((fall - land) * 18)) : 0;
    o.d.position.set(o.x + (fall > 0 ? (o.i % 2 ? 0.22 : -0.22) * Math.min(1, fall / land) : 0), Math.max(0, y0 + fy) + lying, 0.67);
    o.d.rotation.set(fall > 0 ? 0.3 * Math.min(1, fall / land) : 0, 0, (0.06 + 0.25 * k) * wob + rot);
    const wv = Math.sin(t * (6 + 10 * k) + o.i);
    J.shL.rotation.set(-0.4 * wv * k, 0, -1.35 - 0.3 * wv * (0.3 + k)); J.shR.rotation.set(0.4 * wv * k, 0, 1.35 + 0.3 * wv * (0.3 + k)); J.elL.rotation.x = J.elR.rotation.x = -0.2;
    J.hpL.rotation.set(fall > 0 ? -0.6 : 0, 0, 0); J.hpR.rotation.set(fall > 0 ? 0.4 : 0, 0, 0); J.knL.rotation.x = fall > 0 ? 0.8 : 0.05; J.knR.rotation.x = fall > 0 ? 0.3 : 0.05;
    if (o.fi >= 0) { const sp = S.wsp[o.fi], t0 = K.abandono + WR.dt[o.fi]; burst(sp, v3(o.x, y0, 0.67), t, t0, 0.8, 0.7, false); sp.material.opacity = t > t0 ? Math.max(0, 1 - (t - t0) / 0.7) : 0; }
  });
  lookLab(S.usal, env(t, K.universidad - 0.1, K.abandono - 0.25, 0.3, 0.3), v3(clamp(cam.position.x - O.x, -0.5, 0.5), 2.72, 0.8));
  const ck = prog(t, K.cuarenta - 0.1, K.ciento - K.cuarenta + 0.25), v = Math.round(43 * eio(ck)); const g2 = S.pTex.userData.g; g2.clearRect(0, 0, 800, 380); g2.fillStyle = 'rgba(20,22,26,.88)'; rr(g2, 40, 20, 720, 340, 60); g2.fill();
  g2.fillStyle = '#ffd23f'; g2.font = '900 170px Inter'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(`${v} %`, 400, 150); g2.fillStyle = '#ffffff'; g2.font = '700 44px Inter'; g2.fillText('abandono en alguna promoción', 400, 290); S.pTex.needsUpdate = true;
  S.pct.position.set(0, 2.15, 0.8); S.pct.material.opacity = env(t, K.cuarenta - 0.15, 99, 0.2, 0.1); S.pct.visible = S.pct.material.opacity > 0.01;
  return camKeys(t, [[K.wire0 - 0.4, [-0.35, 3.62, 5.6], [-0.35, 3.36, 0.67]], [K.indicadores, [0.35, 3.62, 5.4], [0.35, 3.36, 0.67]], [K.abandono - 0.4, [0, 3.35, 9.4], [0, 3.0, 0.67]],
    [K.ciento + 0.3, [0, 3.1, 10.0], [0, 2.65, 0.67]], [K.base0 + 0.4, [0, 3.1, 10.0], [0, 2.65, 0.67]]], O.x);
}

// ---------------------------------------------------------------- 2 · la base (cálculo, álgebra, física, expresión gráfica) y «lo tuyo»: la torre crece encima
function buildBase() {
  const Z = zone('base', 60);
  const names = ['CÁLCULO', 'ÁLGEBRA', 'FÍSICA', 'EXPRESIÓN GRÁFICA'];
  S.bb = names.map((n, i) => { const g = new THREE.Group(); Z.add(g); g.add(rbox(1.3, 0.62, 1.1, plastic([0x2f8bff, 0x22c08a, 0xff6a2b, 0x8a5cff][i], 0.22), 0.07)); const l = label(n, { size: 64, w: Math.min(1.15, 0.085 * n.length + 0.25) }); l.position.z = 0.56; g.add(l); return g; });
  S.bghost = names.map((n, i) => { const side = i % 2 ? 1 : -1, g = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.3, 0.62, 1.1)), new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0, depthWrite: false })); g.position.set(side * 0.67, 0.31 + Math.floor(i / 2) * 0.62, 0); Z.add(g); return g; });
  S.bfoot = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([v3(-1.5, 0.012, -0.75), v3(1.5, 0.012, -0.75), v3(1.5, 0.012, 0.75), v3(-1.5, 0.012, 0.75)]), new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0 })); Z.add(S.bfoot);
  S.bpy = pylon(3.4, metal(0xe6e9ef, 0.25)); Z.add(S.bpy);
  S.bcab = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, 0.03), glowM(YEL, 3)); Z.add(m); return m; });
  S.bsp = sparks(Z, 140, 0xffe08a, 0.05); studio(Z, 60);
}
function baseAt(t) {
  const O = zones.base.position, keys = [K.calculo, K.algebra, K.fisica, K.expresion];
  S.bb.forEach((g, i) => { const k = keys[i] - 0.1, p = clamp((t - k) / 0.42), e = p < 1 ? eio(p) : 1, side = i % 2 ? 1 : -1, tx = side * 0.67, ty = 0.31 + Math.floor(i / 2) * 0.62;
    const bounce = p >= 1 ? 0.05 * Math.exp(-(t - k - 0.42) * 9) * Math.sin((t - k) * 28) : 0;
    g.visible = t > k - 0.05; g.position.set(lerp(side * 2.6, tx, e), lerp(ty + 2.2, ty, e) + bounce, 0); g.rotation.set(0, (1 - e) * side * 1.2, (1 - e) * side * 0.5);
    S.bghost[i].material.opacity = env(t, K.base0 - 0.3, 99, 0.45, 0.1) * (0.95 - 0.8 * clamp(p * 1.6)) * (0.75 + 0.25 * Math.sin(t * 7 + i)); });
  S.bfoot.material.opacity = 0.8 * env(t, K.base0 - 0.3, 99, 0.45, 0.1);
  const gk = eio(prog(t, K.luego - 0.05, 0.9)); S.bpy.visible = gk > 0.01; S.bpy.position.set(0, 1.24, 0); S.bpy.scale.set(1, Math.max(0.01, gk), 1);
  const ck = eo(prog(t, K.tuyo - 0.1, 0.5)); S.bcab.forEach((c, i) => { const s = i ? 1 : -1, len = 3.0 * ck; c.visible = ck > 0.01; c.scale.x = Math.max(0.001, len); c.position.set(s * (0.0 + len / 2), 1.24 + 3.4 * 0.86 - 0.22, 0.5); });
  burst(S.bsp, v3(0, 1.24 + 3.4, 0), t, K.tuyo - 0.1, 1.2, 0.8, false); S.bsp.material.opacity = t > K.tuyo - 0.1 ? Math.max(0, 1 - (t - K.tuyo + 0.1) / 0.8) : 0;
  return camKeys(t, [[K.base0 - 0.4, [0, 1.05, 8.8], [0, 0.8, 0]], [K.expresion + 0.5, [0, 1.15, 8.6], [0, 0.85, 0]], [K.luego, [0, 1.7, 9.8], [0, 1.6, 0]], [K.tuyo + 0.3, [0, 2.5, 11.8], [0, 2.5, 0]], [K.circ0 + 0.4, [0, 2.5, 11.8], [0, 2.5, 0]]], O.x);
}

// ---------------------------------------------------------------- 3 · teoría de circuitos: placa en vertical, pila, resistencia y LED; electrones y V = I · R
function buildCircuit() {
  const Z = zone('circuit', 90);
  const pcb = canvasTex(700, 1000, (g, w, h) => { g.fillStyle = '#123d2a'; g.fillRect(0, 0, w, h); g.lineWidth = 3; for (let i = 0; i < 90; i++) { g.strokeStyle = 'rgba(120,200,140,.35)'; g.beginPath(); let x = hash(i * 3) * w, y = hash(i * 5) * h; g.moveTo(x, y); x += (hash(i * 7) - 0.5) * 260; g.lineTo(x, y); y += (hash(i * 9) - 0.5) * 260; g.lineTo(x, y); g.stroke(); g.fillStyle = 'rgba(210,175,90,.55)'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); } });
  const gm = plastic(0x123d2a), board = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 3.0), [gm, gm, new THREE.MeshStandardMaterial({ map: pcb, roughness: 0.5 }), gm, gm, gm]); board.position.y = 0.04; Z.add(board);
  const X = 0.72, Zz = 1.12, y = 0.15;
  S.loop = new THREE.CatmullRomCurve3([v3(-X, y, 0.3), v3(-X, y, Zz - 0.08), v3(-X + 0.08, y, Zz), v3(X - 0.08, y, Zz), v3(X, y, Zz - 0.08), v3(X, y, -Zz + 0.08), v3(X - 0.08, y, -Zz), v3(-X + 0.08, y, -Zz), v3(-X, y, -Zz + 0.08), v3(-X, y, -0.3)], false, 'catmullrom', 0.1);
  Z.add(new THREE.Mesh(new THREE.TubeGeometry(S.loop, 220, 0.028, 8), metal(0xd38b4a, 0.25)));
  const bat = new THREE.Group(); bat.position.set(-X, 0.2, 0); Z.add(bat); const bc = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.56, 32), plastic(0x2f8bff, 0.2)); bc.rotation.x = Math.PI / 2; bat.add(bc);
  const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.12, 32), metal(0xe0b45a, 0.2)); bt.rotation.x = Math.PI / 2; bt.position.z = -0.22; bat.add(bt);
  const res = new THREE.Group(); res.position.set(0, y, -Zz); Z.add(res); S.resM = new THREE.MeshStandardMaterial({ color: 0xe6c79a, roughness: 0.5, emissive: 0xff5a1f, emissiveIntensity: 0 });
  const rb = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.32, 8, 16), S.resM); rb.rotation.z = Math.PI / 2; res.add(rb);
  [0xff3b30, 0x8a5cff, 0x2a2c31, 0xe0b45a].forEach((c, i) => { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.03, 20), plastic(c)); band.rotation.z = Math.PI / 2; band.position.x = -0.12 + i * 0.08; res.add(band); });
  const led = new THREE.Group(); led.position.set(X, y, 0); Z.add(led); S.ledM = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffc020, emissiveIntensity: 0, roughness: 0.15, transparent: true, opacity: 0.92 });
  const ld = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), S.ledM); ld.position.y = 0.12; led.add(ld); const lc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 24), S.ledM); lc.position.y = 0.06; led.add(lc);
  S.ledL = new THREE.PointLight(0xffd060, 0, 3, 1.6); S.ledL.position.set(X, 0.5, 0); Z.add(S.ledL);
  // componentes de adorno dentro del circuito: un chip y dos condensadores
  const chip = rbox(0.46, 0.07, 0.32, plastic(0x15161a, 0.35), 0.015); chip.position.set(0, 0.115, 0.25); Z.add(chip);
  for (let k = 0; k < 7; k++) for (const s of [-1, 1]) { const pin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.06), metal(0xd9dde4, 0.2)); pin.position.set(-0.18 + k * 0.06, 0.09, 0.25 + s * 0.19); Z.add(pin); }
  for (const x of [-0.28, 0.28]) { const cp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 24), plastic(0x1f3f8f, 0.25)); cp.position.set(x, 0.19, -0.45); Z.add(cp); const ct = new THREE.Mesh(new THREE.CylinderGeometry(0.071, 0.071, 0.012, 24), metal(0xd9dde4, 0.2)); ct.position.set(x, 0.3, -0.45); Z.add(ct); }
  S.elec = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 10, 8), glowM(CYAN, 3.5), 44); Z.add(S.elec);
  S.vL = pill('V · tensión', '#1b1d24', 'rgba(58,212,255,.95)', 0.85); S.iL = pill('I · corriente', '#1b1d24', 'rgba(58,212,255,.95)', 0.95); S.rL = pill('R · resistencia', '#ffffff', 'rgba(255,90,31,.95)', 1.05); [S.vL, S.iL, S.rL].forEach(l => Z.add(l));
  S.ohm = label('V = I · R', { size: 150, w: 1.55, color: '#ffd23f', weight: 900, pill: true, bg: 'rgba(13,17,23,.9)' }); Z.add(S.ohm);
  studio(Z, 90, 0.9);
}
function circuitAt(t) {
  const O = zones.circuit.position;
  const on = prog(t, K.corriente - 0.1, 0.3), spd = 0.15 + 0.35 * prog(t, K.sola - 0.2, 0.5), dm = new THREE.Matrix4();
  for (let i = 0; i < 44; i++) { const u = ((i / 44) + (t - K.corriente) * spd) % 1; const p = S.loop.getPoint((u + 1) % 1); dm.makeScale(on, on, on); dm.setPosition(p.x, p.y + 0.01, p.z); S.elec.setMatrixAt(i, dm); }
  S.elec.instanceMatrix.needsUpdate = true;
  S.resM.emissiveIntensity = 2.2 * prog(t, K.resistencia - 0.1, 0.4) * (0.8 + 0.2 * Math.sin(t * 9));
  const lk = prog(t, K.sola - 0.15, 0.25); S.ledM.emissiveIntensity = 0.3 + 6 * lk; S.ledL.intensity = 4 * lk;
  lookLab(S.vL, env(t, K.tension - 0.1, K.ley + 0.1, 0.25, 0.25), v3(-0.68, 0.62, 0.0)); lookLab(S.iL, env(t, K.corriente - 0.1, K.ley + 0.1, 0.25, 0.25), v3(0.0, 0.42, 1.3)); lookLab(S.rL, env(t, K.resistencia - 0.1, K.ley + 0.1, 0.25, 0.25), v3(0.0, 0.52, -1.25));
  const ok = eo(prog(t, K.ley - 0.1, 0.35)); S.ohm.visible = ok > 0.01; S.ohm.position.set(0, 0.85 + 0.04 * Math.sin(t * 2), 0.3); S.ohm.scale.setScalar(Math.max(0.01, ok * (1 + 0.15 * Math.sin(Math.PI * clamp((t - K.ley) / 0.35))))); S.ohm.lookAt(cam.position);
  return camKeys(t, [[K.circ0 - 0.4, [0, 6.7, 4.0], [0, 0, -0.15]], [K.resistencia, [0, 6.3, 3.8], [0, 0, -0.15]], [K.ley, [0, 5.0, 4.7], [0, 0.45, 0]], [K.campos0 + 0.4, [0, 4.8, 4.6], [0, 0.5, 0]]], O.x);
}

// ---------------------------------------------------------------- 4 · campos y ondas: imán arriba con sus líneas de campo, onda en medio y motor abajo
function buildField() {
  const Z = zone('field', 120);
  S.mag = new THREE.Group(); S.mag.position.set(0, 2.75, 0); Z.add(S.mag);
  const n = rbox(0.5, 0.3, 0.3, plastic(0xff3b30, 0.2), 0.05); n.position.x = 0.25; S.mag.add(n); const s2 = rbox(0.5, 0.3, 0.3, plastic(0x2f8bff, 0.2), 0.05); s2.position.x = -0.25; S.mag.add(s2);
  const nl = label('N', { size: 140, w: 0.18 }); nl.position.set(0.25, 0, 0.16); S.mag.add(nl); const sl = label('S', { size: 140, w: 0.18 }); sl.position.set(-0.25, 0, 0.16); S.mag.add(sl);
  S.lines = [];
  for (let k = 0; k < 4; k++) for (let a = 0; a < 6; a++) { const L = 0.45 + k * 0.25, pts = []; for (let i = 0; i <= 40; i++) { const th = 0.2 + (Math.PI - 0.4) * i / 40, r = L * Math.sin(th) ** 2; pts.push(v3(Math.cos(th) * (0.5 + r * 1.1), Math.sin(th) * r, 0)); }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.01, 6); const m = new THREE.Mesh(geo, glowM(CYAN, 2.2)); m.rotation.x = a * Math.PI / 3; S.mag.add(m); S.lines.push(m); }
  S.wave = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(0, 0, 0), v3(1, 0, 0)]), 8, 0.02, 6), glowM(YEL, 2.6)); Z.add(S.wave);
  // motor de cara a cámara: carcasa de cristal, bobinas y ventilador en el eje
  S.mot = new THREE.Group(); S.mot.position.set(0, 0.62, 0.15); Z.add(S.mot);
  const hous = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.6, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); hous.rotation.x = Math.PI / 2; S.mot.add(hous);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, c = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.035, 10, 20), metal(0xd38b4a, 0.25)); c.position.set(Math.cos(a) * 0.27, Math.sin(a) * 0.27, 0); S.mot.add(c); }
  S.rotor = new THREE.Group(); S.mot.add(S.rotor); const rcore = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.55, 24), metal(0x8f969f, 0.3)); rcore.rotation.x = Math.PI / 2; S.rotor.add(rcore);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 12), metal()); shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.4; S.rotor.add(shaft);
  for (let k = 0; k < 3; k++) { const bl = rbox(0.42, 0.11, 0.02, plastic(YEL, 0.2), 0.03); bl.position.set(Math.cos(k * 2.094) * 0.24, Math.sin(k * 2.094) * 0.24, 0.62); bl.rotation.z = k * 2.094; S.rotor.add(bl); }
  const base = rbox(0.9, 0.12, 0.7, metal(0x3a3f48, 0.3), 0.03); base.position.set(0, 0.18, 0.15); Z.add(base);
  studio(Z, 120, 0.9);
}
function fieldAt(t) {
  const O = zones.field.position;
  const gk = prog(t, K.campos - 0.1, 0.6); S.lines.forEach((m, i) => { const c = m.geometry.index.count; m.geometry.setDrawRange(0, Math.floor(c * clamp(gk * 1.4 - Math.floor(i / 6) * 0.1))); });
  const wk = prog(t, K.ondas - 0.1, 0.3), pts = []; for (let i = 0; i <= 60; i++) { const q = i / 60; pts.push(v3(-1.1 + q * 2.2, 1.45 + 0.11 * Math.sin(q * 16 - (t - K.ondas) * 14) * wk * Math.sin(Math.PI * q), 0.35)); }
  S.wave.geometry.dispose(); S.wave.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.016, 6); S.wave.visible = wk > 0.01;
  const ik = eio(prog(t, K.iman - 0.15, 0.5)); S.mag.position.set(0, lerp(2.75, 2.5, ik), 0); S.mag.rotation.z = ik * (t - K.iman) * 2.5;
  const mk = prog(t, K.mover - 0.1, 0.6), spin = (t - K.mover) * (2 + 18 * prog(t, K.motor - 0.15, 0.6)); S.rotor.rotation.z = mk > 0 ? -spin * mk : 0;
  return camKeys(t, [[K.campos0 - 0.4, [0, 2.15, 8.0], [0, 2.0, 0]], [K.iman, [0, 2.0, 7.6], [0, 1.85, 0]], [K.maq0 + 0.4, [0, 1.9, 7.3], [0, 1.75, 0]]], O.x);
}

// ---------------------------------------------------------------- 5 · máquinas eléctricas: transformador, generador y motor (y por dentro)
function buildMachines() {
  const Z = zone('machines', 150), XS = [-2.2, 0, 2.2];
  const lam = canvasTex(64, 256, (g, w, h) => { for (let y = 0; y < h; y += 8) { g.fillStyle = y % 16 ? '#3a3f48' : '#2a2d34'; g.fillRect(0, y, w, 8); } });
  const coreM = new THREE.MeshStandardMaterial({ map: lam, roughness: 0.4, metalness: 0.6 }), cu = metal(0xd38b4a, 0.38);
  const helix = (r, h, turns) => { const pts = []; for (let i = 0; i <= turns * 24; i++) { const a = i / 24 * Math.PI * 2; pts.push(v3(Math.cos(a) * r, -h / 2 + h * i / (turns * 24), Math.sin(a) * r)); } return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 48, 0.018, 6), cu); };
  S.mach = [];
  // transformador: cuba con radiadores, tres pasatapas de porcelana y depósito de expansión; dentro, núcleo y bobinas
  { const g = new THREE.Group(); g.position.set(XS[0], 0, 0); Z.add(g);
    const shellM = new THREE.MeshPhysicalMaterial({ color: 0x7f8b84, roughness: 0.4, metalness: 0.45, clearcoat: 0.6, transparent: true, opacity: 1 });
    for (const [x, y, w, h] of [[-0.3, 0.6, 0.14, 0.8], [0.3, 0.6, 0.14, 0.8], [0, 0.27, 0.74, 0.14], [0, 0.93, 0.74, 0.14]]) { const b = rbox(w, h, 0.26, coreM, 0.02); b.position.set(x, y, 0); g.add(b); }
    for (const x of [-0.3, 0.3]) { const c = helix(0.15, 0.48, x < 0 ? 9 : 16); c.position.set(x, 0.6, 0); g.add(c); }
    const tank = rbox(0.9, 1.0, 0.6, shellM, 0.04); tank.position.y = 0.55; g.add(tank); const shell = [tank];
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.78, 0.42), shellM); f.position.set(s * (0.48 + k * 0.035), 0.52, 0); g.add(f); shell.push(f); }
    const cons = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 24), shellM); cons.rotation.z = Math.PI / 2; cons.position.set(0, 1.2, -0.2); g.add(cons); shell.push(cons);
    for (const x of [-0.28, 0, 0.28]) { const bu = new THREE.Group(); bu.position.set(x, 1.05, 0.1); g.add(bu); const por = plastic(0x9c5a3c, 0.25);
      for (let k = 0; k < 6; k++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.025, 20), por); d.position.y = 0.04 + k * 0.045; bu.add(d); }
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.32, 12), por); rod.position.y = 0.16; bu.add(rod); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 10), metal()); cap.position.y = 0.34; bu.add(cap); }
    S.mach.push({ g, shell, spin: null, top: 1.45 }); }
  // generador y motor: carcasa horizontal con tapas, caja de bornes y patas; dentro, estator con bobinas y rotor
  const rot = (len, r) => { const rg = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), metal(0x8f969f, 0.3)); c.rotation.z = Math.PI / 2; rg.add(c);
    for (let k = 0; k < 4; k++) { const w = new THREE.Mesh(new THREE.TorusGeometry(r * 0.75, 0.03, 8, 20), cu); w.rotation.y = Math.PI / 2; w.position.x = -len / 2 + len * (k + 0.5) / 4; rg.add(w); } const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len + 0.7, 12), metal()); sh.rotation.z = Math.PI / 2; rg.add(sh); return rg; };
  for (const [x, color, endC, len, R, fins] of [[XS[1], 0x2f8bff, 0x1d5fc4, 0.95, 0.42, 0], [XS[2], 0xff6a2b, 0xd94f12, 0.8, 0.34, 1]]) {
    const g = new THREE.Group(); g.position.set(x, 0, 0); Z.add(g); const inner = new THREE.Group(); inner.position.y = R + 0.2; g.add(inner);
    const hm = new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, transparent: true, opacity: 1 }), em = new THREE.MeshPhysicalMaterial({ color: endC, roughness: 0.3, clearcoat: 1, transparent: true, opacity: 1 });
    const hous = new THREE.Mesh(new THREE.CylinderGeometry(R, R, len, 40), hm); hous.rotation.z = Math.PI / 2; inner.add(hous); const shell = [hous];
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.86, R, 0.1, 40), em); e.rotation.z = -s * Math.PI / 2; e.position.x = s * (len / 2 + 0.05); inner.add(e); shell.push(e); }
    if (fins) for (let k = 0; k < 7; k++) { const f = new THREE.Mesh(new THREE.TorusGeometry(R + 0.01, 0.018, 6, 40), hm); f.rotation.y = Math.PI / 2; f.position.x = -len / 2 + 0.08 + k * (len - 0.16) / 6; inner.add(f); shell.push(f); }
    if (fins) { const fan = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.02, 0.16, 40), em); fan.rotation.z = Math.PI / 2; fan.position.x = -len / 2 - 0.16; inner.add(fan); shell.push(fan); }
    const tb = rbox(0.24, 0.14, 0.2, em, 0.03); tb.position.set(0.05, R + 0.06, 0); inner.add(tb); shell.push(tb);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, c = helix(0.07, len * 0.8, 6); c.rotation.z = Math.PI / 2; c.position.set(0, Math.cos(a) * (R - 0.09), Math.sin(a) * (R - 0.09)); inner.add(c); }
    const rg = rot(len * 0.9, R * 0.45); inner.add(rg);
    const foot = rbox(len * 0.9, 0.14, R * 1.6, metal(0x3a3f48, 0.3), 0.03); foot.position.y = -R - 0.06; inner.add(foot);
    S.mach.push({ g, shell, spin: rg, top: 2 * R + 0.4 });
  }
  S.machLab = ['TRANSFORMADOR', 'GENERADOR', 'MOTOR'].map((n, i) => { const l = pill(n, '#ffffff', 'rgba(20,22,26,.88)', 0.095 * n.length + 0.22); Z.add(l); return l; });
  studio(Z, 150, 1.0);
}
function machinesAt(t) {
  const O = zones.machines.position, XS = [-2.2, 0, 2.2], cues = [K.transformadores, K.generadores, K.motores], inside = eo(prog(t, K.pordentro - 0.1, 0.45));
  S.mach.forEach((m, i) => { const k = eo(prog(t, K.maq0 + 0.05 + i * 0.16, 0.4)), hl = Math.sin(Math.PI * clamp((t - cues[i] + 0.12) / 0.4)); m.g.visible = k > 0.01; m.g.scale.setScalar(Math.max(0.01, k * (1 + 0.14 * hl)));
    m.shell.forEach(s => { s.material.opacity = 1 - 0.78 * inside; s.material.depthWrite = inside < 0.5; }); if (m.spin) m.spin.rotation.x = (t - K.maq0) * (3 + 9 * inside);
    lookLab(S.machLab[i], env(t, cues[i] - 0.1, 99, 0.25, 0.1), v3(XS[i], 0.13, 0.75)); });
  const x = holdMove(t, [[K.maq0 - 0.4, -2.2], [K.generadores, 0], [K.motores, 2.2]], 0.36), zi = eio(prog(t, K.pordentro - 0.1, 0.5));
  const z = lerp(lerp(6.8, 5.1, eio(prog(t, K.maq0 - 0.2, K.transformadores - K.maq0 + 0.3))), 3.5, zi), y = lerp(1.12, 1.0, zi);
  return { p: v3(O.x + x, y, z), l: v3(O.x + x, lerp(0.8, 0.75, zi), 0) };
}

// ---------------------------------------------------------------- 6 · electrónica de potencia y control: el convertidor decide cuánta, cuándo y adónde (en vertical)
const BY = 2.15;
function buildControl() {
  const Z = zone('control', 180);
  const box = rbox(1.0, 1.3, 0.5, plastic(0x22252c, 0.3), 0.06); box.position.set(0, BY, 0); Z.add(box);
  for (let k = 0; k < 6; k++) { const f = rbox(0.02, 1.1, 0.4, metal(0x8f969f, 0.3), 0.005); f.position.set(-0.4 + k * 0.16, BY, -0.3); Z.add(f); }
  const post = rbox(0.14, BY - 0.65, 0.14, metal(0x3a3f48, 0.35), 0.02); post.position.set(0, (BY - 0.65) / 2, -0.1); Z.add(post);
  S.dTex = canvasTex(500, 650); const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.066), new THREE.MeshBasicMaterial({ map: S.dTex, toneMapped: false })); disp.position.set(0, BY, 0.255); Z.add(disp);
  S.inW = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(0, 0, 0), v3(1, 0, 0)]), 8, 0.02, 6), glowM(CYAN, 2.6)); Z.add(S.inW);
  // salidas: casa, fábrica y coche en el suelo, debajo del convertidor
  const house = new THREE.Group(); const hb = rbox(0.42, 0.3, 0.32, plastic(0xf4f6fa, 0.3), 0.03); hb.position.y = 0.15; house.add(hb); const roof = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.22, 4), plastic(0xff6a2b, 0.3)); roof.rotation.y = Math.PI / 4; roof.position.y = 0.41; house.add(roof);
  const fac = new THREE.Group(); const fb = rbox(0.5, 0.26, 0.32, plastic(0x8f969f, 0.3), 0.03); fb.position.y = 0.13; fac.add(fb); for (const x of [-0.15, 0.08]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.32, 12), plastic(0xff3b30, 0.3)); ch.position.set(x, 0.42, 0); fac.add(ch); }
  const car = carModel(0x1f6bff); car.scale.setScalar(0.3); car.rotation.y = -0.35;
  S.outs = [[house, -0.85, 0.62], [fac, 0, 0.64], [car, 0.85, 0.32]].map(([g, x, top], i) => { g.position.set(x, 0, 0.55); Z.add(g);
    const c = new THREE.CatmullRomCurve3([v3(-0.3 + i * 0.3, BY - 0.66, 0.1), v3(-0.3 + i * 0.3, BY - 1.0, 0.2), v3(x, top + 0.4, 0.5), v3(x, top, 0.55)]);
    Z.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.018, 6), metal(0x3a3f48, 0.3))); const p = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 10, 8), glowM(YEL, 3.5), 6); Z.add(p); return { g, c, p, s0: i === 2 ? 0.3 : 1 }; });
  studio(Z, 180, 0.9);
}
function controlAt(t) {
  const O = zones.control.position, pk = prog(t, K.potencia - 0.2, 0.4), dm = new THREE.Matrix4();
  const pts = []; for (let i = 0; i <= 60; i++) { const q = i / 60, ph = q * 12 - (t - K.ctrl0) * 10; pts.push(v3(-1.45 + q * 0.95, BY + 0.3 + 0.12 * Math.sin(ph), 0.1)); } S.inW.geometry.dispose(); S.inW.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.018, 6);
  const sel = prog(t, K.adonde - 0.1, 0.25), amt = eio(prog(t, K.cuanta - 0.1, 0.5));
  S.outs.forEach((o, i) => { const act = pk * (sel > 0 ? (i === 2 ? 1 : 1 - sel) : 1), sc = 0.6 + 0.8 * amt * (i === 2 || sel === 0 ? 1 : 0.5);
    for (let k = 0; k < 6; k++) { const u = ((k / 6) + (t - K.potencia) * (0.9 + 0.6 * amt)) % 1, p = o.c.getPoint((u + 1) % 1); dm.makeScale(act * sc, act * sc, act * sc); dm.setPosition(p.x, p.y, p.z); o.p.setMatrixAt(k, dm); } o.p.instanceMatrix.needsUpdate = true;
    const hl = i === 2 ? sel : 0; o.g.scale.setScalar(o.s0 * (1 + 0.15 * hl * Math.abs(Math.sin(t * 6)))); });
  // pantalla del convertidor
  const g = S.dTex.userData.g; g.fillStyle = '#0d1117'; g.fillRect(0, 0, 500, 650); g.fillStyle = '#ffd23f'; g.font = '900 46px Inter'; g.textAlign = 'center'; g.fillText('CONTROL', 250, 70);
  const ck = prog(t, K.control - 0.1, 0.3); g.globalAlpha = 0.35 + 0.65 * ck;
  g.font = '800 34px Inter'; g.textAlign = 'left'; g.fillStyle = '#ffffff'; g.fillText('CUÁNTA', 40, 150); g.fillStyle = '#23262c'; rr(g, 40, 170, 420, 50, 25); g.fill(); g.fillStyle = '#3ad4ff'; rr(g, 40, 170, Math.max(50, 420 * (0.25 + 0.65 * amt)), 50, 25); g.fill();
  const wk = prog(t, K.cuando - 0.1, 0.3); g.fillStyle = '#ffffff'; g.fillText('CUÁNDO', 40, 290); g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.arc(250, 370, 62, 0, 7); g.stroke(); const ang = -Math.PI / 2 + wk * (t - K.cuando) * 6; g.strokeStyle = '#ffd23f'; g.beginPath(); g.moveTo(250, 370); g.lineTo(250 + Math.cos(ang) * 50, 370 + Math.sin(ang) * 50); g.stroke();
  g.fillStyle = '#ffffff'; g.fillText('ADÓNDE', 40, 500); ['CASA', 'FÁBRICA', 'COCHE'].forEach((e, i) => { g.fillStyle = sel > 0.5 && i === 2 ? '#19e37c' : '#23262c'; rr(g, 40 + i * 145, 525, 125, 90, 18); g.fill(); g.fillStyle = sel > 0.5 && i === 2 ? '#0d1117' : '#ffffff'; g.font = '800 30px Inter'; g.textAlign = 'center'; g.fillText(e, 102 + i * 145, 580); g.textAlign = 'left'; g.font = '800 34px Inter'; });
  g.globalAlpha = 1; S.dTex.needsUpdate = true;
  return camKeys(t, [[K.ctrl0 - 0.4, [0, 1.75, 8.3], [0, 1.6, 0]], [K.decirle, [0, 1.85, 7.5], [0, 1.7, 0]], [K.cuanta, [0, BY, 3.75], [0, BY, 0]], [K.cuando + 0.15, [0, BY, 3.55], [0, BY, 0]],
    [K.adonde + 0.1, [0, 1.5, 7.9], [0, 1.35, 0]], [K.grid0 + 0.4, [0, 1.5, 8.1], [0, 1.35, 0]]], O.x);
}

// ---------------------------------------------------------------- 7 · sistemas eléctricos: la línea serpentea desde la central del fondo hasta tu enchufe (zoom a la central y la corriente viene hacia ti)
function buildGrid() {
  const Z = zone('grid', 210), conc = plastic(0xd9dde4, 0.6);
  const prof = []; for (let i = 0; i <= 24; i++) { const y = i / 24 * 4.0, r = 1.0 + 0.75 * Math.pow((y - 2.7) / 2.7, 2) * (y < 2.7 ? 1 : 0.35); prof.push(new THREE.Vector2(r, y)); }
  const tower = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), conc); tower.position.set(-1.25, 0, -15.0); tower.castShadow = true; Z.add(tower);
  const hall = rbox(2.2, 1.4, 1.6, plastic(0xe9e4da, 0.5), 0.06); hall.position.set(0.95, 0.7, -14.3); Z.add(hall);
  const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 5.0, 20), plastic(0xff3b30, 0.3)); chim.position.set(2.15, 2.5, -15.3); Z.add(chim);
  for (const y of [1.4, 2.8, 4.2]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.235 - y * 0.016, 0.235 - y * 0.016, 0.25, 20), plastic(0xf4f6fa, 0.3)); b.position.set(2.15, y, -15.3); Z.add(b); }
  S.steam = sparks(Z, 220, 0xdfe6f0, 0.3); S.steam.material.blending = THREE.NormalBlending; S.steam.material.opacity = 0.3;
  const xf = rbox(0.8, 0.8, 0.7, metal(0x8f969f, 0.35), 0.04); xf.position.set(0.3, 0.4, -12.0); Z.add(xf);
  const cm = new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.35, metalness: 0.7 }), PP = [[2.0, -8.6], [-1.3, -4.2]], H = 3.4, y1 = H * 0.86 - 0.22, y2 = H * 0.72 - 0.22;
  PP.forEach(([x, z]) => { const p = pylon(H, metal(0xc9ced6, 0.35)); p.rotation.y = Math.PI / 2; p.position.set(x, 0, z); Z.add(p); });
  const cond = [[y1, 0.67], [y1, -0.67], [y2, 0.9], [y2, -0.9]];
  for (const [y, dx] of cond) for (let k = 0; k < PP.length - 1; k++) Z.add(tube(cat(v3(PP[k][0] + dx, y, PP[k][1]), v3(PP[k + 1][0] + dx, y, PP[k + 1][1]), 0.18), 0.016, cm, 40));
  for (const [y, dx] of cond.slice(0, 3)) Z.add(tube([v3(0.3, 0.82, -12.0), v3(1.0 + dx * 0.5, 2.0, -10.6), v3(PP[0][0] + dx, y, PP[0][1])], 0.016, cm, 30));
  const sub = new THREE.Group(); sub.position.set(0.1, 0, 0.4); Z.add(sub); for (const x of [-0.3, 0.3]) { const b = rbox(0.42, 0.5, 0.42, metal(0x8f969f, 0.35), 0.03); b.position.set(x, 0.25, 0); sub.add(b); } const fr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.025, 0.6), metal(0xc9ced6)); fr.position.y = 1.0; sub.add(fr);
  for (const p of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 6), metal(0xc9ced6)); l.position.set(p[0], 0.5, p[1]); sub.add(l); }
  for (const dx of [0.67, -0.67]) Z.add(tube([v3(PP[1][0] + dx, y1, PP[1][1]), v3(-0.5 + dx * 0.6, 1.9, -1.8), v3(0.1 + dx * 0.4, 1.02, 0.4)], 0.016, cm, 30));
  const house = new THREE.Group(); house.position.set(1.3, 0, 3.0); Z.add(house); const hb = rbox(1.0, 0.8, 0.9, new THREE.MeshStandardMaterial({ color: 0xcdbfa6, roughness: 0.8 }), 0.04); hb.position.y = 0.4; house.add(hb);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.5, 4), plastic(0xff6a2b, 0.3)); roof.rotation.y = Math.PI / 4; roof.position.y = 1.05; house.add(roof);
  const door = rbox(0.22, 0.4, 0.02, plastic(0x6b4a2f, 0.5), 0.01); door.position.set(-0.25, 0.2, 0.46); house.add(door);
  Z.add(tube([v3(0.1, 1.02, 0.4), v3(0.8, 1.3, 1.6), v3(1.3, 0.95, 2.55)], 0.012, cm, 30));
  const sock = new THREE.Group(); sock.position.set(1.42, 0.42, 3.46); Z.add(sock); sock.add(rbox(0.26, 0.26, 0.03, plastic(0xe6e8ec, 0.3), 0.04)); for (const x of [-0.05, 0.05]) { const h = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), new THREE.MeshBasicMaterial({ color: 0x111111 })); h.position.set(x, 0, 0.017); sock.add(h); }
  S.sockGlow = new THREE.PointLight(0xffd060, 0, 1.6, 1.6); S.sockGlow.position.set(1.42, 0.45, 3.7); Z.add(S.sockGlow);
  const m1 = [(PP[0][0] + PP[1][0]) / 2 + 0.67, y1 - 0.18, (PP[0][1] + PP[1][1]) / 2];
  S.route = new THREE.CatmullRomCurve3([v3(0.95, 0.9, -13.5), v3(0.3, 0.85, -12.0), v3(1.0, 2.0, -10.6), v3(PP[0][0] + 0.67, y1, PP[0][1]), v3(...m1), v3(PP[1][0] + 0.67, y1, PP[1][1]), v3(-0.3, 1.9, -1.8), v3(0.37, 1.05, 0.4), v3(0.8, 1.3, 1.6), v3(1.3, 0.95, 2.6), v3(1.42, 0.45, 3.5)]);
  S.flow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 10, 8), glowM(YEL, 3.5), 30); Z.add(S.flow);
  S.pulse = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), glowM(0xfff2c0, 6)); Z.add(S.pulse); S.pulseL = new THREE.PointLight(0xffd060, 0, 4, 1.6); Z.add(S.pulseL);
  S.cenLab = pill('CENTRAL', '#ffffff', 'rgba(20,22,26,.9)', 1.3); Z.add(S.cenLab);
  S.encLab = pill('TU ENCHUFE', '#1b1d24', 'rgba(255,210,63,.95)', 0.27); Z.add(S.encLab);
  studio(Z, 210, 0.85); const far = new THREE.SpotLight(0xffffff, 300, 40, 0.5, 0.6, 1.4); far.position.set(3, 12, -7); far.target.position.set(0, 1, -14); Z.add(far); Z.add(far.target);
}
function gridAt(t) {
  const O = zones.grid.position, dm = new THREE.Matrix4();
  burst(S.steam, v3(-2.0, 4.0, -15.0), t * 0.22, 0, 0.35, 1.0, true);
  const fk = prog(t, K.viaja - 0.2, 0.4);
  for (let i = 0; i < 30; i++) { const u = ((i / 30) + (t - K.viaja) * 0.16) % 1, p = S.route.getPoint((u + 1) % 1); dm.makeScale(fk, fk, fk); dm.setPosition(p.x, p.y, p.z); S.flow.setMatrixAt(i, dm); } S.flow.instanceMatrix.needsUpdate = true;
  const pk = clamp((t - (K.central - 0.05)) / (K.enchufe - K.central + 0.05)), pe = pk * pk * (3 - 2 * pk);
  S.pulse.visible = t > K.central - 0.25 && pk < 1; const pp = S.route.getPoint(pe); S.pulse.position.copy(pp); S.pulseL.position.copy(pp); S.pulseL.intensity = S.pulse.visible ? 5 : 0;
  const arrive = prog(t, K.enchufe - 0.05, 0.3); S.sockGlow.intensity = 4 * arrive * (0.8 + 0.2 * Math.sin(t * 20));
  lookLab(S.cenLab, env(t, K.central - 0.15, K.central + 0.7, 0.15, 0.2), v3(0.35, 1.15, -11.3));
  lookLab(S.encLab, env(t, K.enchufe - 0.1, 99, 0.2, 0.1), v3(1.42, 0.63, 3.5));
  const keys = [[K.grid0 - 0.4, [0, 2.9, 9.4], [0, 1.6, -6.5], 36], [K.viaja, [0, 2.85, 9.0], [0, 1.7, -7], 36], [K.desde, [0, 2.8, 8.7], [0.3, 2.0, -12], 30], [K.central - 0.1, [0, 2.75, 8.4], [0.4, 2.2, -14.5], 22],
    [K.enchufe + 0.05, [1.42, 0.6, 4.95], [1.42, 0.45, 3.46], 36], [K.inst0 + 0.4, [1.42, 0.62, 5.05], [1.42, 0.45, 3.46], 36]];
  const c = camKeys(t, keys, O.x);
  if (t > K.central && t < K.enchufe) { const k = clamp((t - K.central) / (K.enchufe - K.central)); c.l.lerp(v3(O.x + pp.x, pp.y, pp.z), Math.sin(Math.PI * k) * 0.6); }
  return c;
}

// ---------------------------------------------------------------- 8 · instalaciones, renovables y coche eléctrico: casa de dos plantas en corte
function buildInstall() {
  const Z = zone('install', 240), wm = plastic(0xf3eadc, 0.6), slabM = plastic(0xc08a58, 0.5), HW = 1.9, HD = 1.3, FH = 1.15;
  for (const [y, m] of [[0.04, slabM], [FH, slabM]]) { const s = rbox(HW, 0.08, HD, m, 0.02); s.position.set(0, y, 0); Z.add(s); }
  const roof = rbox(HW + 0.1, 0.08, HD + 0.1, plastic(0x3a3f48, 0.4), 0.02); roof.position.set(0, 2 * FH, 0); Z.add(roof);
  const back = rbox(HW, 2 * FH, 0.08, wm, 0.02); back.position.set(0, FH, -HD / 2); Z.add(back);
  for (const s of [-1, 1]) { const w = rbox(0.08, 2 * FH, HD, wm, 0.02); w.position.set(s * HW / 2, FH, 0); Z.add(w); }
  const pv = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#10234e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7fa8e8'; g.lineWidth = 2; for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
  S.panels = []; for (let k = 0; k < 4; k++) { const m = new THREE.MeshPhysicalMaterial({ map: pv, roughness: 0.15, metalness: 0.3, clearcoat: 1, emissive: 0x3a6fd0, emissiveIntensity: 0 }); const p = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.62), m); p.position.set(-0.69 + k * 0.46, 2 * FH + 0.22, 0); p.rotation.x = 0.45; Z.add(p); S.panels.push(m); }
  // planta baja: sofá, tele; planta alta: cama, mesa con portátil
  const sofa = rbox(0.8, 0.32, 0.36, plastic(0x2f8bff, 0.4), 0.08); sofa.position.set(0.25, 0.25, 0.1); Z.add(sofa);
  S.tvM = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0xffffff, emissiveMap: screenTex(), emissiveIntensity: 0 }); const tv = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), S.tvM); tv.position.set(0.25, 0.7, -HD / 2 + 0.05); Z.add(tv);
  const bed = rbox(0.75, 0.2, 0.55, plastic(0xf4f6fa, 0.5), 0.05); bed.position.set(-0.45, FH + 0.14, -0.25); Z.add(bed); const blanket = rbox(0.5, 0.06, 0.56, plastic(0xff5470, 0.45), 0.03); blanket.position.set(-0.32, FH + 0.26, -0.25); Z.add(blanket);
  const desk = rbox(0.6, 0.04, 0.35, plastic(0xe0b07c, 0.5), 0.01); desk.position.set(0.5, FH + 0.42, -0.35); Z.add(desk); for (const x of [0.25, 0.75]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), metal()); l.position.set(x, FH + 0.22, -0.35); Z.add(l); }
  S.lapM = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0xffffff, emissiveMap: screenTex(), emissiveIntensity: 0 }); const lap = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), S.lapM); lap.position.set(0.5, FH + 0.55, -0.45); lap.rotation.x = -0.15; Z.add(lap);
  S.bulbs = [[0, FH - 0.12], [0, 2 * FH - 0.12]].map(([x, y]) => { const m = glowM(0xfff0c0, 0); const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), m); b.position.set(x, y, 0); Z.add(b); const L = new THREE.PointLight(0xffe0a0, 0, 2.6, 1.6); L.position.set(x, y - 0.05, 0.1); Z.add(L); return { m, L }; });
  // cuadro eléctrico y cables que se iluminan por la pared del fondo
  const panel = rbox(0.26, 0.36, 0.06, plastic(0xf4f6fa, 0.3), 0.02); panel.position.set(-0.7, 0.75, -HD / 2 + 0.07); Z.add(panel);
  const zb = -HD / 2 + 0.05;
  S.wires = [[v3(-0.7, 0.93, zb), v3(-0.7, FH - 0.08, zb), v3(0, FH - 0.08, zb)], [v3(-0.62, 0.62, zb), v3(-0.3, 0.62, zb), v3(0.0, 0.62, zb), v3(0.25, 0.62, zb)], [v3(-0.78, 0.93, zb), v3(-0.78, 2 * FH - 0.08, zb), v3(0, 2 * FH - 0.08, zb)], [v3(-0.78, FH + 0.3, zb), v3(0.2, FH + 0.3, zb), v3(0.5, FH + 0.45, zb)]]
    .map(p => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p, false, 'catmullrom', 0.05), 80, 0.012, 6), glowM(YEL, 2.8)); Z.add(m); return m; });
  // aerogenerador detrás
  const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 3.2, 16), plastic(0xf4f6fa, 0.3)); tw.position.set(1.0, 1.6, -2.8); Z.add(tw);
  S.rotorW = new THREE.Group(); S.rotorW.position.set(1.0, 3.2, -2.65); Z.add(S.rotorW); S.rotorW.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), plastic(0xf4f6fa)));
  for (let k = 0; k < 3; k++) { const b = rbox(0.09, 0.9, 0.03, plastic(0xf4f6fa, 0.3), 0.02); b.geometry.translate(0, 0.45, 0); b.rotation.z = k * 2.094; S.rotorW.add(b); }
  // coche eléctrico que llega y se pone a cargar
  S.car = carModel(0x1f6bff); S.car.scale.setScalar(0.65); Z.add(S.car);
  const chg = rbox(0.22, 0.75, 0.16, plastic(0xf4f6fa, 0.3), 0.04); chg.position.set(0.62, 0.375, 0.85); Z.add(chg); S.chgScr = glowM(0x19e37c, 0); const cs = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.1), S.chgScr); cs.position.set(0.62, 0.6, 0.932); Z.add(cs);
  S.cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(0.62, 0.45, 0.94), v3(0.6, 0.12, 1.08), v3(0.42, 0.18, 1.16), v3(0.32, 0.26, 1.2)]), 40, 0.018, 6), glowM(0x19e37c, 0)); Z.add(S.cable);
  S.chgLab = pill('CARGANDO', '#1b1d24', 'rgba(25,227,124,.95)', 0.62); Z.add(S.chgLab);
  studio(Z, 240, 1.0);
}
function installAt(t) {
  const O = zones.install.position, ik = prog(t, K.instalaciones - 0.1, 0.8);
  S.wires.forEach((m, i) => { const c = m.geometry.index.count; m.geometry.setDrawRange(0, Math.floor(c * clamp(ik * 1.5 - i * 0.15))); });
  const lit = prog(t, K.instalaciones + 0.45, 0.25); S.bulbs.forEach((b, i) => { const k = prog(t, K.instalaciones + 0.45 + i * 0.15, 0.2); b.m.emissiveIntensity = 5 * k; b.L.intensity = 2.5 * k; }); S.tvM.emissiveIntensity = 1.6 * lit; S.lapM.emissiveIntensity = 1.6 * prog(t, K.instalaciones + 0.7, 0.2);
  const rk = prog(t, K.energias - 0.1, 0.4); S.panels.forEach((m, i) => (m.emissiveIntensity = 0.9 * rk * (0.6 + 0.4 * Math.sin(t * 4 + i)))); S.rotorW.rotation.z = -(t - K.energias) * 3 * prog(t, K.renovables - 0.2, 0.5);
  const dk = eo(prog(t, K.coche - 0.5, 0.75)); S.car.visible = t > K.coche - 0.55; S.car.position.set(lerp(4.5, -0.05, dk), 0, 1.5); S.car.userData.P.wheels.forEach(w => (w.rotation.z = -(1 - dk) * 9));
  const ck = prog(t, K.coche + 0.25, 0.3); S.cable.visible = ck > 0.01; S.cable.material.emissiveIntensity = 2.5 * ck * (0.7 + 0.3 * Math.sin(t * 10)); S.chgScr.emissiveIntensity = 3 * ck; S.car.userData.P.lights.forEach(l => (l.material.emissiveIntensity = 0.6 + 2.5 * ck));
  lookLab(S.chgLab, env(t, K.coche + 0.25, 99, 0.25, 0.1), v3(-0.05, 0.62, 1.5));
  return camKeys(t, [[K.inst0 - 0.4, [0, 1.3, 7.1], [0, 1.15, 0]], [K.instalaciones + 0.8, [0, 1.35, 6.7], [0, 1.18, 0]], [K.renovables, [0.4, 2.0, 8.9], [0.4, 1.75, -0.6]], [K.coche + 0.2, [0, 0.9, 6.9], [0, 0.65, 1.0]], [K.sal0 + 0.4, [0, 0.9, 6.8], [0, 0.65, 1.0]]], O.x);
}

// ---------------------------------------------------------------- 9 · salidas: parques solares y eólicos, alta tensión, puntos de carga, edificios y fábricas
function buildCareers() {
  const Z = zone('careers', 270), pv = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#10234e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7fa8e8'; g.lineWidth = 2; for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
  S.cPan = new THREE.MeshPhysicalMaterial({ map: pv, roughness: 0.15, metalness: 0.3, clearcoat: 1, emissive: 0x3a6fd0, emissiveIntensity: 0 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = -7.2 + (c - 1.5) * 0.6, z = -0.6 + r * 0.55; const p = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.36), S.cPan); p.position.set(x, 0.35, z); p.rotation.x = -0.5; Z.add(p); const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), metal()); leg.position.set(x, 0.15, z); Z.add(leg); }
  S.turb = [[-4.75, -1.2], [-4.2, 0.0], [-3.65, -0.6]].map(([x, z]) => { const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 2.4, 14), plastic(0xf4f6fa, 0.3)); tw.position.set(x, 1.2, z); Z.add(tw); const r = new THREE.Group(); r.position.set(x, 2.4, z + 0.1); Z.add(r); r.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), plastic(0xf4f6fa)));
    for (let k = 0; k < 3; k++) { const b = rbox(0.07, 0.72, 0.025, plastic(0xf4f6fa, 0.3), 0.015); b.geometry.translate(0, 0.36, 0); b.rotation.z = k * 2.094; r.add(b); } return r; });
  const cm = new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.35, metalness: 0.7 });
  [-1.3, 0.1].forEach(x => { const p = pylon(2.8, metal(0xc9ced6, 0.35)); p.position.set(x, 0, 0); Z.add(p); });
  S.hv = []; for (const [y, z] of [[2.8 * 0.86 - 0.22, 0.67], [2.8 * 0.86 - 0.22, -0.67], [2.8 * 0.72 - 0.22, 0.9], [2.8 * 0.72 - 0.22, -0.9]]) { const pts = cat(v3(-3.0, y, z), v3(1.9, y, z), 0.25, 30); Z.add(tube(pts, 0.014, cm, 60)); S.hv.push(new THREE.CatmullRomCurve3(pts)); }
  S.hvFlow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 10, 8), glowM(YEL, 3.5), 24); Z.add(S.hvFlow);
  S.chg = [2.0, 2.8].map(x => { const c = rbox(0.2, 0.7, 0.15, plastic(0xf4f6fa, 0.3), 0.04); c.position.set(x, 0.35, -0.5); Z.add(c); const m = glowM(0x19e37c, 0); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.1), m); s.position.set(x, 0.55, -0.42); Z.add(s); return m; });
  const car = carModel(0xff3b30); car.position.set(2.4, 0, 0.35); Z.add(car);
  const ofc = new THREE.Mesh(new THREE.BoxGeometry(1.0, 3.0, 0.9), new THREE.MeshStandardMaterial({ color: 0x1b2333, roughness: 0.12, metalness: 0.8 })); ofc.position.set(5.0, 1.5, -0.3); Z.add(ofc);
  S.ofFl = Array.from({ length: 13 }, (_, k) => { const m = new THREE.MeshStandardMaterial({ color: 0x0a0d14, emissive: 0xcfe8ff, emissiveIntensity: 0, roughness: 0.3 }); const f = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.02), m); f.position.set(5.0, 0.2 + k * 0.215, 0.16); Z.add(f); return m; });
  S.fac = new THREE.MeshStandardMaterial({ color: 0x8f969f, roughness: 0.5, emissive: 0xffd9a0, emissiveIntensity: 0, emissiveMap: windowTex(9) }); const fb = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.85, 1.1), S.fac); fb.position.set(7.4, 0.425, -0.2); Z.add(fb);
  for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 3, 1, false, 0, Math.PI), plastic(0x3a3f48, 0.4)); s.rotation.set(Math.PI / 2, 0, Math.PI / 2); s.position.set(6.85 + k * 0.56, 0.85, -0.2); s.scale.set(0.62, 1, 0.5); Z.add(s); }
  for (const x of [6.8, 7.3]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2, 12), plastic(0xff3b30, 0.3)); ch.position.set(x, 1.3, -0.55); Z.add(ch); }
  S.cSteam = sparks(Z, 100, 0xdfe6f0, 0.1); S.cSteam.material.blending = THREE.NormalBlending; S.cSteam.material.opacity = 0;
  [[-6.3, 0.75], [-3.4, 0.7], [0.8, 0.6], [5.75, 0.5], [6.55, 0.75]].forEach(([x, z]) => { const d = engineer(YEL, 0.75); d.position.set(x, 0, z); d.rotation.y = -0.2; Z.add(d); });
  S.carLab = ['PARQUES SOLARES', 'EÓLICOS', 'ALTA TENSIÓN', 'PUNTOS DE CARGA', 'EDIFICIOS', 'FÁBRICAS'].map(n => { const l = pill(n, '#1b1d24', 'rgba(255,210,63,.95)', 0.1 * n.length + 0.25); Z.add(l); return l; });
  studio(Z, 270, 1.1); const k2 = new THREE.SpotLight(0xffffff, 160, 40, 0.6, 0.6, 1.6); k2.position.set(5, 10, 7); k2.target.position.set(5, 0.8, 0); Z.add(k2); Z.add(k2.target); const k3 = k2.clone(); k3.position.set(-6, 10, 7); k3.target.position.set(-6, 0.8, 0); Z.add(k3); Z.add(k3.target);
}
function careersAt(t) {
  const O = zones.careers.position, dm = new THREE.Matrix4();
  S.cPan.emissiveIntensity = 1.1 * prog(t, K.solares - 0.15, 0.3) * (0.7 + 0.3 * Math.sin(t * 5));
  S.turb.forEach((r, i) => (r.rotation.z = -(t - K.eolicos) * 3.2 * prog(t, K.eolicos - 0.2, 0.5) - i));
  const hk = prog(t, K.redes - 0.1, 0.3); let n = 0; S.hv.forEach((c, j) => { for (let i = 0; i < 6; i++) { const u = ((i / 6) + (t - K.redes) * 0.35 + j * 0.1) % 1, p = c.getPoint((u + 1) % 1); dm.makeScale(hk, hk, hk); dm.setPosition(p.x, p.y, p.z); S.hvFlow.setMatrixAt(n++, dm); } }); S.hvFlow.instanceMatrix.needsUpdate = true;
  S.chg.forEach((m, i) => (m.emissiveIntensity = 3 * prog(t, K.carga - 0.1 + i * 0.15, 0.25)));
  S.ofFl.forEach((m, k) => (m.emissiveIntensity = 2.0 * prog(t, K.instalacion2 + 0.25 + k * 0.07, 0.12)));
  S.fac.emissiveIntensity = 1.8 * prog(t, K.fabrica - 0.15, 0.3); burst(S.cSteam, v3(7.05, 1.9, -0.55), t * 0.3, 0, 0.2, 1, true); S.cSteam.material.opacity = 0.35 * prog(t, K.fabrica - 0.1, 0.4);
  const cues = [K.parques, K.eolicos, K.redes, K.puntos, K.edificio, K.fabrica], LX = [-7.2, -4.2, -0.6, 2.4, 5.0, 7.4], LY = [1.25, 3.45, 3.2, 1.3, 3.4, 2.15];
  S.carLab.forEach((l, i) => lookLab(l, env(t, cues[i] - 0.1, 99, 0.2, 0.1), v3(LX[i], 0.4, 1.3)));
  const x = holdMove(t, [[K.sal0 - 0.4, -7.2], [K.eolicos - 0.02, -4.2], [K.redes + 0.15, -0.6], [K.puntos + 0.05, 2.4], [K.instalacion2 + 0.3, 5.0], [K.fabrica - 0.02, 7.4]], 0.34);
  return { p: v3(O.x + x, 1.9, 7.6), l: v3(O.x + x, 1.45, 0) };
}

// ---------------------------------------------------------------- 10 · el enchufe: entra la clavija y todo se enciende
function buildPlug() {
  const Z = zone('plug', 300);
  const wall = rbox(4.0, 3.2, 0.2, new THREE.MeshStandardMaterial({ color: 0x1e2638, roughness: 0.92 }), 0.04); wall.position.set(0, 1.6, -0.1); Z.add(wall);
  const sock = new THREE.Group(); sock.position.set(0, 1.45, 0.0); Z.add(sock);
  sock.add(rbox(0.46, 0.46, 0.06, plastic(0xe6e8ec, 0.3), 0.06)); const rec = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 40, 1, true), plastic(0xd9dde4, 0.3)); rec.rotation.x = Math.PI / 2; rec.position.z = 0.01; sock.add(rec);
  const bot = new THREE.Mesh(new THREE.CircleGeometry(0.17, 40), plastic(0xeef0f3, 0.3)); bot.position.z = -0.012; sock.add(bot); for (const x of [-0.06, 0.06]) { const h = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), new THREE.MeshBasicMaterial({ color: 0x0a0a0a })); h.position.set(x, 0, -0.01); sock.add(h); }
  S.plug = new THREE.Group(); Z.add(S.plug);
  const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.26, 40), plastic(0xffffff, 0.2)); pb.rotation.x = Math.PI / 2; pb.position.z = 0.13; S.plug.add(pb);
  for (let k = 0; k < 6; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 6, 40), plastic(0xd9dde4, 0.3)); r.position.z = 0.16 + k * 0.025; S.plug.add(r); }
  for (const x of [-0.06, 0.06]) { const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 16), metal(0xe6e9ef, 0.1)); pin.rotation.x = Math.PI / 2; pin.position.set(x, 0, -0.08); S.plug.add(pin); }
  S.plugCable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(0, 0, 0.26), v3(0, -0.05, 0.6), v3(0.15, -0.5, 1.0), v3(0.5, -1.4, 1.2)]), 40, 0.03, 8), plastic(0xffffff, 0.3)); S.plug.add(S.plugCable);
  S.psp = sparks(Z, 90, 0xbff3ff, 0.035);
  const shelf = rbox(1.8, 0.06, 0.45, plastic(0xc08a58, 0.45), 0.02); shelf.position.set(0, 0.62, 0.25); Z.add(shelf);
  // aparatos: lámpara, portátil, móvil y ventilador
  S.app = {};
  { const g = new THREE.Group(); g.position.set(-0.68, 0.65, 0.25); Z.add(g); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8), metal(0x3a3f48)); st.position.y = 0.22; g.add(st); S.app.lampM = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc070, emissiveIntensity: 0, side: THREE.DoubleSide }); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 0.2, 24, 1, true), S.app.lampM); sh.position.y = 0.48; g.add(sh); S.app.lampL = new THREE.PointLight(0xffd090, 0, 3, 1.6); S.app.lampL.position.y = 0.42; g.add(S.app.lampL); }
  { const g = new THREE.Group(); g.position.set(-0.22, 0.66, 0.3); Z.add(g); g.add(rbox(0.42, 0.025, 0.3, metal(0xc9ced6, 0.25), 0.02)); const lid = rbox(0.42, 0.3, 0.02, metal(0xc9ced6, 0.25), 0.02); lid.position.set(0, 0.15, -0.15); lid.rotation.x = -0.2; g.add(lid); S.app.lapM = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0xffffff, emissiveMap: screenTex(), emissiveIntensity: 0 }); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.26), S.app.lapM); s.position.set(0, 0.15, -0.135); s.rotation.x = -0.2; g.add(s); }
  { const g = new THREE.Group(); g.position.set(0.24, 0.66, 0.3); Z.add(g); const p = rbox(0.16, 0.3, 0.02, plastic(0x111317, 0.2), 0.03); p.rotation.x = -1.1; p.position.y = 0.06; g.add(p); S.app.phM = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0xffffff, emissiveMap: screenTex(), emissiveIntensity: 0 }); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.27), S.app.phM); s.rotation.x = -1.1; s.position.set(0, 0.07, 0.008); g.add(s); }
  { const g = new THREE.Group(); g.position.set(0.68, 0.65, 0.25); Z.add(g); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.35, 10), plastic(0xf4f6fa, 0.3)); st.position.y = 0.17; g.add(st); S.app.fan = new THREE.Group(); S.app.fan.position.set(0, 0.42, 0.04); g.add(S.app.fan); S.app.fan.add(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 6, 40), metal(0xd9dde4)));
    for (let k = 0; k < 3; k++) { const b = rbox(0.14, 0.06, 0.01, plastic(0x3ad4ff, 0.2), 0.02); b.position.set(Math.cos(k * 2.094) * 0.08, Math.sin(k * 2.094) * 0.08, 0); b.rotation.z = k * 2.094; S.app.fan.add(b); } }
  studio(Z, 300, 0.7); const fill = new THREE.PointLight(0xfff0e0, 3, 5, 1.5); fill.position.set(0, 2.2, 2.5); Z.add(fill);
}
function plugAt(t) {
  const O = zones.plug.position, ins = eio(prog(t, K.enchufe2 - 0.55, 0.55));
  S.plug.position.set(lerp(0.35, 0, ins), 1.45 + lerp(-0.25, 0, ins), lerp(1.4, 0.07, ins)); S.plug.rotation.set(lerp(-0.4, 0, ins), lerp(0.5, 0, ins), 0);
  burst(S.psp, v3(0, 1.45, 0.1), t, K.enchufe2, 0.6, 0.5, false); S.psp.material.opacity = t > K.enchufe2 ? Math.max(0, 1 - (t - K.enchufe2) / 0.5) : 0;
  const on = i => prog(t, K.enchufe2 + 0.1 + i * 0.14, 0.15);
  S.app.lampM.emissiveIntensity = 3.5 * on(0); S.app.lampL.intensity = 2.5 * on(0); S.app.lapM.emissiveIntensity = 1.6 * on(1); S.app.phM.emissiveIntensity = 1.6 * on(2); S.app.fan.rotation.z = -(t - K.enchufe2) * 14 * on(3);
  return camKeys(t, [[K.plug0 - 0.4, [0.15, 1.5, 1.9], [0, 1.45, 0]], [K.enchufe2 - 0.6, [0.2, 1.45, 2.1], [0.02, 1.42, 0]], [K.enchufe2 + 0.05, [0.05, 1.45, 2.0], [0, 1.42, 0]], [K.carrera2, [0, 1.1, 6.1], [0, 1.0, 0]], [K.porque + 0.4, [0, 1.1, 6.2], [0, 1.0, 0]]], O.x);
}

// ---------------------------------------------------------------- suelo espejo continuo (uno solo para todo el recorrido) y chispa guía
function buildFloor() {
  const W2 = 420, D2 = 80, cx = 150, cz = -8;
  const refl = new Reflector(new THREE.PlaneGeometry(W2, D2), { textureWidth: 540 * PR, textureHeight: 960 * PR, color: 0x6f7c99 }); refl.rotation.x = -Math.PI / 2; refl.position.set(cx, 0, cz); scene.add(refl);
  const d = new THREE.Mesh(new THREE.PlaneGeometry(W2, D2), new THREE.MeshBasicMaterial({ color: 0x050812, transparent: true, opacity: 0.8 })); d.rotation.x = -Math.PI / 2; d.position.set(cx, 0.002, cz); scene.add(d);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(W2, D2), new THREE.ShadowMaterial({ opacity: 0.5 })); sh.rotation.x = -Math.PI / 2; sh.position.set(cx, 0.004, cz); sh.receiveShadow = true; scene.add(sh);
  const pts = []; for (let z = cz - D2 / 2; z <= cz + D2 / 2; z += 2) pts.push(cx - W2 / 2, 0, z, cx + W2 / 2, 0, z); for (let x = cx - W2 / 2; x <= cx + W2 / 2; x += 2) pts.push(x, 0, cz - D2 / 2, x, 0, cz + D2 / 2);
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  S.gridM = new THREE.LineBasicMaterial({ color: 0x4a5a8c, transparent: true, opacity: 0.2 }); const gr = new THREE.LineSegments(gg, S.gridM); gr.position.y = 0.006; scene.add(gr);
}
function buildFloaters() {                            // símbolos eléctricos apagados flotando al fondo de todo el recorrido (pasan de lado en los vuelos)
  const syms = ['Ω', 'V = I·R', 'P = V·I', '∿', 'kWh', 'Σ', '∫', '50 Hz', 'cos φ', '∇·B = 0', 'kV', 'Φ', 'A', '⏚'];
  const src = syms.map(s => { const l = label(s, { size: 120, color: '#7d8bb8', w: 0.5 + 0.12 * s.length, weight: 700 }); l.material.opacity = 0.2; l.material.fog = false; return l; });
  for (let i = 0; i < 150; i++) { const x = -20 + i * 2.3 + (hash(i * 3.1) - 0.5) * 1.4; if ((x > -14 && x < 14) || (x > 199 && x < 221)) continue;
    const L = src[i % syms.length], m = new THREE.Mesh(L.geometry, L.material); m.layers.set(1); m.renderOrder = 1; m.position.set(x, 1.4 + hash(i * 5.3) * 5, -7 - hash(i * 7.7) * 7); m.scale.setScalar(0.7 + hash(i * 2.2) * 0.6); scene.add(m); FLOAT.push({ l: m, ph: hash(i) * 6, y: m.position.y }); }
}
function buildLead() {
  S.lead = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), glowM(0xfff2c0, 8)); S.lead.frustumCulled = false; scene.add(S.lead);
  S.leadL = new THREE.PointLight(0xffd36a, 0, 9, 1.4); scene.add(S.leadL);
  S.trail = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), glowM(0xffd23f, 6), 48); S.trail.frustumCulled = false; scene.add(S.trail);
  S.hit = sparks(scene, 120, 0xffe9a8, 0.05);
  // bobina: anillos de cobre a lo largo del trayecto; la chispa pasa por dentro y cada anillo se enciende a su paso
  S.rings = new THREE.InstancedMesh(new THREE.TorusGeometry(0.42, 0.028, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffffff }), 24);
  S.rings.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(24 * 3), 3); S.rings.frustumCulled = false; S.rings.visible = false; scene.add(S.rings);
}

// ---------------------------------------------------------------- secuencia: qué zona manda en cada instante y cómo se pasa a la siguiente
let SEQ = [];
const D = 0.42;                                       // medio vuelo (s): el viaje entre escenas dura 2·D
const smoother = x => x * x * x * (x * (x * 6 - 15) + 10);
function segIdx(t) { let i = 0; SEQ.forEach((s, k) => { if (t >= s.t0) i = k; }); return i; }
// la chispa sale del protagonista de la escena que se va, vuela en arco y se clava en el de la siguiente; la cámara la persigue
function sparkAt(A, B, u) { const e = smoother(clamp(u / 0.84)); const p = A.l.clone().lerp(B.l, e); p.y += 0.45 * Math.sin(Math.PI * e); return p; }
function camState(t) {
  const i = segIdx(t), cur = SEQ[i], nxt = SEQ[i + 1];
  let A = null, B = null, ts = 0;
  if (i > 0 && cur.trans === 'fly' && t - cur.t0 < D) { A = SEQ[i - 1]; B = cur; ts = cur.t0; }
  else if (nxt && nxt.trans === 'fly' && nxt.t0 - t < D) { A = cur; B = nxt; ts = nxt.t0; }
  const envOf = z => (z === 'city' ? 0.18 : 0.55);
  if (!A) { const c = cur.fn(t); return { p: c.p, l: c.l, f: c.f || 36, roll: 0, vis: [cur.zone], fns: [cur.fn], envI: envOf(cur.zone), lead: null, fade: dipFade(t) }; }
  const ca = A.fn(t), cb = B.fn(t), u = clamp((t - (ts - D)) / (2 * D)), e = smoother(clamp((u - 0.06) / 0.94)), arc = Math.sin(Math.PI * e);
  const p = ca.p.clone().lerp(cb.p, e); p.y *= 1 - 0.38 * arc;                // a mitad de vuelo baja hacia el suelo: la rejilla pasa a toda velocidad
  const l = ca.l.clone().lerp(cb.l, e).lerp(sparkAt(ca, cb, u), 0.55 * Math.sin(Math.PI * u));
  return { p, l, f: lerp(ca.f || 36, cb.f || 36, e), arc, roll: 0.05 * arc, vis: [A.zone, B.zone], fns: [A.fn, B.fn], envI: lerp(envOf(A.zone), envOf(B.zone), e), lead: { A: ca, B: cb, u, ts }, fade: dipFade(t) };
}
function dipFade(t) { let f = 0; SEQ.forEach(s => { if (s.trans === 'dip') f = Math.max(f, 1 - clamp(Math.abs(t - s.t0) / 0.32)); }); return f * f * (3 - 2 * f); }

const _q = new THREE.Vector3(), _f = new THREE.Vector3();
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll); cam.updateMatrixWorld(); }
function frame(t) {
  // cámara del fotograma anterior (para el desenfoque de movimiento, como un obturador de 180°)
  placeCam(camState(t - 1 / 60)); const prevVP = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  post.uniforms.flash.value = 0;
  const st = camState(t); placeCam(st);
  st.fns.forEach(fn => fn(t));                         // segunda pasada con la cámara ya colocada: los rótulos miran a la cámara buena
  const visZ = new Set(st.vis); for (const k in zones) zones[k].visible = visZ.has(k);
  scene.environmentIntensity = st.envI; S.gridM.opacity = 0.2 + 0.4 * (st.arc || 0);
  FLOAT.forEach(f => { f.l.position.y = f.y + 0.25 * Math.sin(t * 0.6 + f.ph); f.l.rotation.z = 0.15 * Math.sin(t * 0.4 + f.ph); });
  // chispa guía, estela e impacto
  S.hit.visible = false;
  if (st.lead) {
    const { A, B, u } = st.lead, vis = clamp(Math.min(u / 0.06, (0.9 - u) / 0.06)), lp = sparkAt(A, B, u), sz = 0.012 * lp.distanceTo(cam.position);
    S.lead.visible = S.trail.visible = vis > 0.01; S.lead.position.copy(lp); S.lead.scale.setScalar(Math.max(0.001, sz * vis)); S.leadL.position.copy(lp); S.leadL.intensity = 30 * vis;
    const dm = new THREE.Matrix4();
    for (let k = 0; k < 48; k++) { const q = sparkAt(A, B, u - (k + 1) * 0.005), s = Math.max(0.001, sz * vis * 0.8 * (1 - k / 48)); dm.makeScale(s, s, s); dm.setPosition(q.x, q.y, q.z); S.trail.setMatrixAt(k, dm); }
    S.trail.instanceMatrix.needsUpdate = true;
    const qa = new THREE.Quaternion(), sc = new THREE.Vector3(), col = new THREE.Color();
    for (let k = 0; k < 24; k++) { const uk = 0.12 + k * 0.028, q = sparkAt(A, B, uk), dv = sparkAt(A, B, uk + 0.01).sub(q).normalize();
      const app = clamp(Math.min((u - uk + 0.12) / 0.06, (0.98 - u) / 0.08)), glow = Math.exp(-(((u - uk) / 0.025) ** 2));
      qa.setFromUnitVectors(v3(0, 0, 1), dv); sc.setScalar(Math.max(0.001, app)); dm.compose(q, qa, sc); S.rings.setMatrixAt(k, dm);
      S.rings.setColorAt(k, col.setRGB(0.55 + 3.2 * glow, 0.3 + 2.4 * glow, 0.12 + 0.9 * glow)); }
    S.rings.instanceMatrix.needsUpdate = true; S.rings.instanceColor.needsUpdate = true; S.rings.visible = true;
    const th = st.lead.ts - D + 2 * D * 0.84;          // momento del impacto en la escena nueva
    if (t > th) { S.hit.visible = true; burst(S.hit, B.l, t, th, 0.7, 0.45, false); S.hit.material.opacity = Math.max(0, 1 - (t - th) / 0.45); post.uniforms.flash.value = 0.006 * Math.exp(-(t - th) / 0.05); }
  } else { S.lead.visible = S.trail.visible = S.rings.visible = false; S.leadL.intensity = 0; }
  // desenfoque: cuánto se ha movido en pantalla un punto fijo a 6 m delante de la cámara
  cam.getWorldDirection(_f); _q.copy(cam.position).addScaledVector(_f, 6).applyMatrix4(prevVP);
  let dx = -_q.x * 0.25, dy = -_q.y * 0.25; const L = Math.hypot(dx, dy), MX = 0.12; if (L > MX) { dx *= MX / L; dy *= MX / L; }
  return { dir: [dx, dy], fade: st.fade, vig: 0.32 };
}

function blurPass(src, dst, dx, dy) { quad.material = blurM; blurM.uniforms.tA.value = src.texture; blurM.uniforms.d.value.set(dx, dy); renderer.setRenderTarget(dst); renderer.render(quadScene, quadCam); }
function drawFrame(st, t) {
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  // resplandor: lo que pasa del blanco → desenfoque gaussiano a 1/4 y a 1/8 de resolución
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
// portada: la ciudad a oscuras, el interruptor gigante y la ingeniera con la bombilla encendida (sin rótulo, con aire arriba para el título)
window.renderCover = function () {
  const t = 5.95, st = frame(t); S.engLab.visible = false;
  cam.fov = 36; cam.updateProjectionMatrix(); cam.position.set(0.3, 1.15, 10.4); cam.up.set(0, 1, 0); cam.lookAt(0.3, 1.75, 4.3); cam.updateMatrixWorld();
  st.dir = [0, 0]; st.fade = 0; drawFrame(st, t);
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
    hospital: at('hospital'), metro: at('metro'), movil: at('movil'), alguien: at('alguien', 1), ingenieria: at('ingenieria'),
    apaga2: at('apaga', 2), encender: at('encenderlo'), alguien2: at('alguien', 2), porque: at('porque'), cuentame: at('cuentame'),
    universidad: at('universidad'), indicadores: at('indicadores'), abandono: at('abandono'), cuarenta: at('cuarenta'), ciento: at('ciento'),
    calculo: at('calculo'), algebra: at('algebra'), fisica: at('fisica'), expresion: at('expresion'), luego: at('luego'), tuyo: at('tuyo'),
    tension: at('tension', 1), corriente: at('corriente'), resistencia: at('resistencia'), ley: at('=ley'), sola: at('sola'),
    campos: at('campos'), ondas: at('ondas'), iman: at('iman'), mover: at('mover'), motor: at('=motor'),
    transformadores: at('transformadores'), generadores: at('generadores'), motores: at('motores'), pordentro: at('dentro') - 0.2,
    potencia: at('potencia'), control: at('control'), decirle: at('decirle'), cuanta: at('cuanta'), cuando: at('cuando', 1), adonde: at('adonde'),
    viaja: at('viaja'), desde: at('desde'), central: at('central'), enchufe: at('enchufe', 1),
    instalaciones: at('instalaciones'), energias: at('energias'), renovables: at('renovables'), coche: at('coche'),
    parques: at('parques'), solares: at('solares'), eolicos: at('eolicos'), redes: at('redes'), puntos: at('puntos'), carga: at('carga'),
    instalacion2: at('=instalacion'), edificio: at('edificio'), fabrica: at('fabrica'), enchufe2: at('enchufe', 2), carrera2: at('carrera', 2),
    wire0: at('=y', 1), base0: at('empiezas'), circ0: at('teoria'), campos0: at('campos'), maq0: at('maquinas'), ctrl0: at('electronica'),
    grid0: at('sistemas') - 0.2, inst0: at('instalaciones'), sal0: at('aqui') - 0.18, plug0: at('=si', 1), END,
  };
  SEQ = [
    { name: 'city', zone: 'city', t0: -1, fn: t => cityAt(t, false) },
    { name: 'wire', zone: 'wire', t0: K.wire0, fn: wireAt, trans: 'fly' },
    { name: 'base', zone: 'base', t0: K.base0, fn: baseAt, trans: 'fly' },
    { name: 'circuit', zone: 'circuit', t0: K.circ0, fn: circuitAt, trans: 'fly' },
    { name: 'field', zone: 'field', t0: K.campos0, fn: fieldAt, trans: 'fly' },
    { name: 'machines', zone: 'machines', t0: K.maq0, fn: machinesAt, trans: 'fly' },
    { name: 'control', zone: 'control', t0: K.ctrl0 + 0.15, fn: controlAt, trans: 'fly' },
    { name: 'grid', zone: 'grid', t0: K.grid0, fn: gridAt, trans: 'fly' },
    { name: 'install', zone: 'install', t0: K.inst0, fn: installAt, trans: 'fly' },
    { name: 'careers', zone: 'careers', t0: K.sal0, fn: careersAt, trans: 'fly' },
    { name: 'plug', zone: 'plug', t0: K.plug0, fn: plugAt, trans: 'fly' },
    { name: 'end', zone: 'city', t0: K.porque, fn: t => cityAt(t, true), trans: 'dip' },
  ];
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; }
  buildFloor(); buildFloaters(); buildLead();
  buildCity(); buildWire(); buildBase(); buildCircuit(); buildField(); buildMachines(); buildControl(); buildGrid(); buildInstall(); buildCareers(); buildPlug();
  window.K = K; window.SEQ = SEQ;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
