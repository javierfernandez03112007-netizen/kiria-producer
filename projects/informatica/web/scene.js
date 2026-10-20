// «Ingeniería Informática desde dentro» — escenas 3D en color (estilo arcilla oscura + cuadrícula, acentos
// naranja/coral, maquetas isométricas con maniquíes). Cada escena se sincroniza con su palabra en tiempos.json.
// window.renderAt(t) dibuja el instante t.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
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
const BG = 0xdfe6f2;
const sky = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#9cc4ff'); gr.addColorStop(0.55, '#e4ecf7'); gr.addColorStop(1, '#fff1e2'); g.fillStyle = gr; g.fillRect(0, 0, 4, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
scene.background = sky; scene.fog = new THREE.Fog(BG, 35, 110);
const BLACK = new THREE.Color(0x000000);
const cam = new THREE.PerspectiveCamera(36, W / H, 0.001, 400);
const S = {}; window.S = S; window.cam = cam; window.RC = THREE.Raycaster; window.SCN = scene;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const env = (t, t0, t1, fi = 0.3, fo = 0.3) => (t < t0 || t > t1 ? 0 : Math.min(eo(prog(t, t0, fi)), 1 - prog(t, t1 - fo, fo)));
const hash = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (draw) draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { c, g }; return t; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// paleta (como la referencia)
const C = { orange: 0xff5a1f, coral: 0xff5470, blue: 0x2f6bff, grid: 0x7d93d6, floor: 0xc08a58, clay: 0x3f78ff, clayL: 0x9aa3b2, wood: 0xe0b07c, pale: 0x5c9dff, board: 0x1f5a40, wall: 0xf3eadc, white: 0xf2f2f2 };
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
function floorGrid(size, div, color = C.grid) { const g = new THREE.GridHelper(size, div, color, color); g.material.transparent = true; g.material.opacity = 0.4; return g; }
function lights(group, x = 0) {
  const k = new THREE.DirectionalLight(0xfff4e8, 3.6); k.position.set(x - 6, 12, 8); k.castShadow = true; k.shadow.mapSize.set(2048, 2048); k.shadow.bias = -0.0004; k.shadow.radius = 4;
  Object.assign(k.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 }); k.target.position.set(x, 0, 0); scene.add(k.target); group.add(k);
}

// ---------------------------------------------------------------- tiempos (palabras de la voz)
let WORDS = [], END = 67.6, ENV = [];
const norm = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
function at(word, k = 1) { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if ((exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + word); return 1e9; }
let K = {};

// ---------------------------------------------------------------- 0 · gancho y final: cuatro pupitres, tres caen por trampillas
function buildHook() {
  const Z = zone('hook', 0);
  Z.add(floorGrid(60, 60));
  const plat = rbox(4.2, 0.3, 2.2, clay(C.floor, 0.8), 0.05); plat.position.y = -0.15; Z.add(plat);
  S.hk = [-1.5, -0.5, 0.5, 1.5].map((x, i) => {
    const g = new THREE.Group(); g.position.set(x, 0, 0); Z.add(g);
    const dk = desk(); g.add(dk); const dl = makeDoll(i === 2 ? C.pale : C.wood); dl.position.set(0, 0, 0.3); dl.rotation.y = Math.PI; sit(dl); g.add(dl);
    const door = rbox(0.9, 0.06, 1.1, clay(0x2a2c31), 0.02); door.position.set(x, 0.01, 0.1); Z.add(door);
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), new THREE.MeshBasicMaterial({ color: 0x050506 })); hole.rotation.x = -Math.PI / 2; hole.position.set(x, 0.005, 0.1); Z.add(hole);
    return { g, door, hole, fall: i !== 2, x };
  });
  lights(Z, 0);
  Z.add(new THREE.HemisphereLight(0xbfd0ff, 0x2a1d16, 1.4));
}
function hookAt(t, final) {
  const O = zones.hook.position;
  S.hk.forEach((o, i) => {
    let f = 0;
    if (!final && o.fall) f = clamp((t + 0.3 - i * 0.05) / 0.9);     // ya están cayendo en el primer fotograma
    const hinge = Math.min(1, f * 3);
    o.door.visible = o.fall; o.hole.visible = o.fall && hinge > 0.02;
    o.door.position.set(o.x - 0.45 * (1 - Math.cos(hinge * Math.PI / 2)), -0.45 * Math.sin(hinge * Math.PI / 2), 0.1); o.door.rotation.z = -hinge * Math.PI / 2;
    o.g.position.y = -6 * f * f; o.g.rotation.z = f * (i % 2 ? 0.8 : -0.6); o.g.rotation.x = f * 0.5;
    o.g.visible = o.g.position.y > -4;
  });
  // cámara: picado que gira; en el final se acerca despacio para enlazar con el principio
  const r = final ? lerp(7.5, 6.4, eio(prog(t, K.tu, END - K.tu))) : 6.4 - 0.4 * t;
  cam.position.set(O.x, 4.6, r); cam.lookAt(O.x, -0.3, 0);
}

// ---------------------------------------------------------------- 1 · cien maniquíes: tres de cada cuatro desaparecen
function buildGridPeople() {
  const Z = zone('ppl', 100); Z.add(floorGrid(80, 80));
  S.ppl = [];
  for (let i = 0; i < 100; i++) { const d = makeDoll(i % 4 === 3 ? C.pale : C.wood, 0.8); d.position.set(((i % 10) - 4.5) * 0.55, 0, (Math.floor(i / 10) - 4.5) * 0.55); d.rotation.y = 0.4 + hash(i) * 0.3; Z.add(d); S.ppl.push(d); }
  S.pplLab = label('INGENIERÍA INFORMÁTICA', { size: 60, w: 2.6, pill: true }); S.pplLab.position.set(0, 0.05, 3.0); S.pplLab.rotation.x = -Math.PI / 2; Z.add(S.pplLab);
  lights(Z, 100); Z.add(new THREE.HemisphereLight(0xbfd0ff, 0x2a1d16, 1.4));
}
function pplAt(t) {
  const O = zones.ppl.position, t0 = K.abandono;
  S.ppl.forEach((d, i) => { const gone = i % 4 !== 3; const f = gone ? clamp((t - t0 - hash(i) * 1.2) / 0.5) : 0; d.position.y = -2.5 * f * f; d.scale.setScalar(0.8 * (1 - 0.6 * f)); d.visible = f < 0.98; d.rotation.z = f * 1.4 * (hash(i * 3) - 0.5); });
  const u = eio(prog(t, K.cifra - 0.3, K.y - K.cifra + 0.3));
  cam.position.set(O.x, lerp(7.8, 6.2, u), lerp(6.2, 7.6, u)); cam.lookAt(O.x, 0, 0.2);
  S.pplLab.material.opacity = env(t, K.ingenieria - 0.2, K.y, 0.3, 0.2);
}

// ---------------------------------------------------------------- 2 · caja sellada «¿?» (la respuesta, al final)
function buildBox() {
  const Z = zone('box', 200); Z.add(floorGrid(60, 60));
  const b = new THREE.Group(); Z.add(b); S.box = b;
  b.add(rbox(1.4, 1.4, 1.4, clay(0x2f6bff, 0.35), 0.14));
  const q = label('¿?', { size: 200, color: '#ffffff', w: 0.9 }); q.position.set(0, 0.05, 0.72); b.add(q);
  const band = rbox(1.46, 0.18, 1.46, clay(C.orange, 0.4), 0.04); b.add(band);
  const lock = rbox(0.3, 0.36, 0.12, clay(0xd9d9d9, 0.3), 0.04); lock.position.set(0, -0.1, 0.78); b.add(lock);
  lights(Z, 200); Z.add(new THREE.HemisphereLight(0xbfd0ff, 0x2a1d16, 1.5));
}
function boxAt(t) {
  const O = zones.box.position, t0 = ZT.find(z => z[0] === 'box')[1];
  const land = eo(prog(t, t0, 0.5)); S.box.position.set(0, 1.0 + 3 * (1 - land), 0);
  S.box.rotation.set(0.25 * Math.sin(t * 1.3), t * 0.9, 0.1 * Math.sin(t * 2));
  const s = 1 + 0.12 * Math.max(0, Math.sin((t - K.final) * 9)) * env(t, K.final, K.final + 0.6, 0.05, 0.3); S.box.scale.setScalar(s);
  const u = eio(prog(t, t0, 2.6)); cam.position.set(O.x, lerp(2.2, 3.0, u), lerp(8.0, 6.8, u)); cam.lookAt(O.x, 1.1, 0);
}

// ---------------------------------------------------------------- 3 · sobre el papel: cuatro años
function buildYears() {
  const Z = zone('yrs', 300); Z.add(floorGrid(60, 60));
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), clay(0xe9e6df, 0.9)); paper.rotation.x = -Math.PI / 2; paper.receiveShadow = true; Z.add(paper);
  S.yrs = [1, 2, 3, 4, 5, 6, 7].map(i => { const g = new THREE.Group(); Z.add(g); const b = rbox(0.62, 0.5, 0.62, clay(i <= 4 ? C.blue : C.coral, 0.5), 0.08); b.position.y = 0.25; g.add(b); const l = label(i + 'º', { size: 120, color: i <= 4 ? '#ffffff' : '#ffffff', w: 0.36 }); l.position.set(0, 0.25, 0.32); g.add(l); g.position.set(-1.2 + (i - 1) * 0.8, 0, 0); return g; });
  lights(Z, 300); Z.add(new THREE.HemisphereLight(0xffffff, 0x2a1d16, 1.4));
}
function yrsAt(t) {
  const O = zones.yrs.position, t0 = ZT.find(z => z[0] === 'yrs')[1];
  S.yrs.forEach((g, i) => { const k = i < 4 ? eo(prog(t, t0 + 0.15 + i * 0.18, 0.3)) : 0; g.scale.set(1, Math.max(0.001, k), 1); g.visible = k > 0.01; g.position.y = 0; });
  const u = eio(prog(t, t0, 2.2)); cam.position.set(O.x, lerp(4.2, 4.8, u), lerp(7.8, 7.0, u)); cam.lookAt(O.x, 0.2, 0);
}

// ---------------------------------------------------------------- 4 · aula magna: profesor y ~100 alumnos (picado a ~70°)
function buildHall() {
  const Z = zone('hall', 400);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), clay(C.floor, 0.85)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; Z.add(fl);
  Z.add(floorGrid(80, 80)); const wall = rbox(14, 2.4, 0.2, clay(C.wall, 0.8), 0.04); wall.position.set(0, 1.2, -5.9); Z.add(wall);
  S.board = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.7), new THREE.MeshStandardMaterial({ map: boardTex('hall'), roughness: 0.9 })); S.board.position.set(0, 1.45, -5.78); Z.add(S.board);
  S.prof = makeDoll(C.pale, 1.15); S.prof.position.set(1.8, 0, -5.1); Z.add(S.prof);
  const dm = clay(C.clayL);
  for (let r = 0; r < 9; r++) for (let c = 0; c < 12; c++) {
    if (r * 12 + c >= 104) continue;
    const x = (c - 5.5) * 0.95 + (c >= 6 ? 0.6 : -0.6) * 0.5, z = -2.6 + r * 0.95;
    const d = desk(); d.position.set(x, 0, z); d.scale.setScalar(1.25); Z.add(d);
    const p = makeDoll(hash(r * 12 + c) < 0.25 ? C.pale : C.wood, 1.1); p.position.set(x, 0, z + 0.38); p.rotation.y = Math.PI; sit(p); p.userData.ph = hash(r * 7 + c); Z.add(p);
  }
  lamp(Z, -3.6, -5.3, 1.8, 2.2); lamp(Z, 3.6, -5.3, 1.8, 2.2); plant(Z, -6.2, -5.2, 1.5); plant(Z, 6.2, -5.2, 1.5); plant(Z, -6.3, 2.5, 1.3);
  S.hallLab = label('Universidad de Granada · auditoría', { size: 54, w: 3.6, pill: true }); Z.add(S.hallLab);
  lights(Z, 400); Z.add(new THREE.HemisphereLight(0xbfd0ff, 0x2a1d16, 1.3));
}
function boardTex(kind) {
  return canvasTex(1100, 340, (g, w, h) => { g.fillStyle = '#1f4a37'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6e5232'; g.lineWidth = 18; g.strokeRect(0, 0, w, h); });
}
function hallAt(t) {
  const O = zones.hall.position, t0 = ZT.find(z => z[0] === 'hall')[1];
  // profesor que escribe en la pizarra y se gira
  const J = S.prof.userData.J, wr = Math.sin(t * 7) * 0.25;
  J.shR.rotation.set(-2.3 + wr, 0, 0.2); J.elR.rotation.x = -0.4; J.neck.rotation.y = 0.3 * Math.sin(t * 0.8);
  S.prof.rotation.y = Math.PI + 0.4 * Math.sin(t * 0.6);
  // pizarra: «4 años» → «6–7»
  const g = S.board.material.map.userData.g; g.fillStyle = '#1f4a37'; g.fillRect(9, 9, 1082, 322);
  g.fillStyle = '#e8efe9'; g.font = '700 120px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const k = prog(t, K.seis - 0.1, 0.4);
  g.globalAlpha = 1 - 0.7 * k; g.fillText('4 años', 300, 170); g.globalAlpha = 1;
  if (k > 0) { g.strokeStyle = '#ff6b5e'; g.lineWidth = 10; g.beginPath(); g.moveTo(170, 175); g.lineTo(170 + 260 * k, 165); g.stroke(); g.fillStyle = '#ff6b5e'; g.font = '800 150px Inter'; g.globalAlpha = k; g.fillText('6–7', 780, 175); g.globalAlpha = 1; }
  S.board.material.map.needsUpdate = true;
  S.hallLab.position.set(O.x - 0.0, 2.8, -4.4); S.hallLab.material.opacity = env(t, K.auditoria - 0.1, K.porque, 0.3, 0.3); S.hallLab.lookAt(cam.position);
  // picado a ~70° que barre la sala
  const u = eio(prog(t, t0, K.porque - t0));
  const tilt = 70 * Math.PI / 180, dist = lerp(17.5, 15, u), az = 0;
  const target = v3(O.x, 0, lerp(-2.8, -3.6, u));
  cam.position.set(target.x + Math.sin(az) * Math.cos(tilt) * dist, Math.sin(tilt) * dist, target.z + Math.cos(az) * Math.cos(tilt) * dist); cam.lookAt(target);
}

// ---------------------------------------------------------------- 5 · «no es lo que parece»: la tarjeta de código se da la vuelta
function buildFlip() {
  const Z = zone('flip', 500); Z.add(floorGrid(60, 60));
  const card = new THREE.Group(); Z.add(card); S.card = card;
  card.add(rbox(2.2, 3.0, 0.16, clay(0x2b2e34), 0.12));
  const front = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.7), new THREE.MeshBasicMaterial({ map: canvasTex(600, 850, (g, w, h) => { g.fillStyle = '#121418'; rr(g, 0, 0, w, h, 40); g.fill(); g.fillStyle = '#ff5a1f'; g.font = '900 220px Inter'; g.textAlign = 'center'; g.fillText('</>', w / 2, 380); g.font = '700 46px Mono'; g.fillStyle = '#9aa3ad'; ['print("hola")', 'if x > 0:', '   x += 1'].forEach((s, i) => g.fillText(s, w / 2, 540 + i * 70)); }) }));
  front.position.z = 0.085; card.add(front);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.7), new THREE.MeshBasicMaterial({ map: canvasTex(600, 850, (g, w, h) => { g.fillStyle = '#121418'; rr(g, 0, 0, w, h, 40); g.fill(); g.fillStyle = '#ff6b5e'; g.font = '800 150px Inter'; g.textAlign = 'center'; ['∫ dx', 'Σ', '∇·E', 'lim'].forEach((s, i) => g.fillText(s, w / 2, 190 + i * 190)); }) }));
  back.position.z = -0.085; back.rotation.y = Math.PI; card.add(back);
  lights(Z, 500); Z.add(new THREE.HemisphereLight(0xffffff, 0x2a1d16, 1.4));
}
function flipAt(t) {
  const O = zones.flip.position, t0 = ZT.find(z => z[0] === 'flip')[1];
  const f = eio(prog(t, K.noes - 0.1, 0.6));
  S.card.position.set(0, 1.6 + 0.08 * Math.sin(t * 2), 0); S.card.rotation.set(0.1, -0.3 + f * Math.PI + 0.2 * Math.sin(t), 0.06 * Math.sin(t * 1.4));
  const u = eio(prog(t, t0, 2.8)); cam.position.set(O.x, 1.9 + 0.3 * u, lerp(8.4, 7.2, u)); cam.lookAt(O.x, 1.6, 0);
}

// ---------------------------------------------------------------- 6 · ordenador → mesa con café → ventana de noche con un maniquí programando
function buildRoom() {
  const Z = zone('room', 600);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), clay(C.floor, 0.85)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; Z.add(fl);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), clay(0x5a6fa8, 0.9)); wall.position.set(0, 3, -1.6); Z.add(wall);
  // ventana de noche
  const night = canvasTex(800, 600, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b0f2a'); gr.addColorStop(1, '#1b1d4a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + hash(i) * 0.6})`; g.fillRect(hash(i * 3) * w, hash(i * 7) * h * 0.6, 2, 2); } g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(620, 120, 48, 0, Math.PI * 2); g.fill(); g.fillStyle = '#0a0b14'; let x = 0; while (x < w) { const bw = 40 + hash(x) * 70, bh = 120 + hash(x * 2) * 200; g.fillRect(x, h - bh, bw, bh); for (let yy = h - bh + 10; yy < h - 8; yy += 18) for (let xx = x + 6; xx < x + bw - 6; xx += 14) if (hash(xx * yy) < 0.25) { g.fillStyle = '#ffd27a'; g.fillRect(xx, yy, 6, 8); g.fillStyle = '#0a0b14'; } x += bw + 6; } });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.9), new THREE.MeshBasicMaterial({ map: night })); win.position.set(0.9, 2.6, -1.58); Z.add(win);
  const fr = rbox(2.8, 2.1, 0.1, clay(0x3a3d44), 0.04); fr.position.set(0.9, 2.6, -1.65); Z.add(fr);
  const desk0 = rbox(2.4, 0.08, 1.0, clay(0x5a4031, 0.6), 0.03); desk0.position.set(0, 1.0, -0.6); Z.add(desk0);
  for (const x of [-1.1, 1.1]) { const l = rbox(0.08, 1.0, 0.9, clay(0x4a3328), 0.02); l.position.set(x, 0.5, -0.6); Z.add(l); }
  // monitor con código
  S.codeTex = canvasTex(1400, 860); const mon = new THREE.Group(); mon.position.set(-0.1, 1.04, -0.85); Z.add(mon);
  const frame = rbox(1.1, 0.7, 0.05, clay(0x1d1f23, 0.4), 0.03); frame.position.y = 0.55; mon.add(frame);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 0.62), new THREE.MeshBasicMaterial({ map: S.codeTex })); scr.position.set(0, 0.55, 0.03); mon.add(scr);
  const st = rbox(0.12, 0.2, 0.08, clay(0x1d1f23), 0.02); st.position.y = 0.12; mon.add(st);
  S.monPos = v3(600 - 0.1, 1.59, -0.82);
  const kb = rbox(0.62, 0.025, 0.2, clay(0x1d1f23, 0.4), 0.008); kb.position.set(-0.1, 1.055, -0.38); Z.add(kb);
  const kt = new THREE.Mesh(new THREE.PlaneGeometry(0.59, 0.18), new THREE.MeshStandardMaterial({ map: keysTex(), roughness: 0.6 })); kt.rotation.x = -Math.PI / 2; kt.position.set(-0.1, 1.069, -0.38); Z.add(kt);
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 10), clay(0x1d1f23, 0.4)); mouse.scale.set(0.75, 0.4, 1.1); mouse.position.set(0.3, 1.058, -0.36); Z.add(mouse);
  // botella de café con etiqueta
  const bot = new THREE.Group(); bot.position.set(0.55, 1.04, -0.45); Z.add(bot); S.cup = bot;
  const glass = clay(0x3a2416, 0.25);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 28), glass); body.position.y = 0.1; bot.add(body);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.06, 0.06, 28), glass); sh.position.y = 0.23; bot.add(sh);
  const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.04, 20), glass); nk.position.y = 0.28; bot.add(nk);
  const capB = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 20), clay(C.orange, 0.4)); capB.position.y = 0.315; bot.add(capB);
  const lt = canvasTex(512, 160, (g, w, h) => { g.fillStyle = '#f3ead8'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff5a1f'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14); g.fillStyle = '#2a1a10'; g.font = '900 92px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CAFÉ', w / 4, h / 2 + 4); g.fillText('CAFÉ', w * 3 / 4, h / 2 + 4); });
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0615, 0.0615, 0.1, 40, 1, true), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.6 })); lab.position.y = 0.1; lab.rotation.y = -0.9; bot.add(lab);
  bot.traverse(o => { if (o.isMesh) o.castShadow = true; });
  // maniquí sentado (más grande, bien apoyado en la silla) que lee código y bebe café
  S.coder = makeDoll(C.wood, 1.6); S.coder.position.set(0.05, -0.08, 0.38); sit(S.coder); Z.add(S.coder);
  const cm = clay(0x2a2c31, 0.5);
  const seat = rbox(0.62, 0.07, 0.56, cm, 0.025); seat.position.set(0.05, 0.345, 0.45); Z.add(seat);
  const back = rbox(0.6, 0.42, 0.07, cm, 0.03); back.position.set(0.05, 0.6, 0.76); back.rotation.x = -0.1; Z.add(back);
  for (const [x, z] of [[-0.22, 0.22], [0.32, 0.22], [-0.22, 0.68], [0.32, 0.68]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8), cm); l.position.set(x, 0.16, z); Z.add(l); }
  // flexo sobre la mesa (luz cálida) y una planta en la esquina
  const fm = clay(0x2a2c31, 0.4), flexo = new THREE.Group(); flexo.position.set(-0.85, 1.04, -0.75); Z.add(flexo);
  const fb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.03, 20), fm); fb.position.y = 0.015; flexo.add(fb);
  const a1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), fm); a1.position.set(0.05, 0.2, 0); a1.rotation.z = -0.25; flexo.add(a1);
  const a2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 8), fm); a2.position.set(0.2, 0.42, 0.05); a2.rotation.z = -1.1; flexo.add(a2);
  const hd = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.15, 20, 1, true), new THREE.MeshStandardMaterial({ color: C.orange, roughness: 0.4, side: THREE.DoubleSide })); hd.position.set(0.36, 0.42, 0.08); hd.rotation.z = 0.5; flexo.add(hd);
  const bl = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff1cf })); bl.position.set(0.38, 0.38, 0.08); flexo.add(bl);
  const fl2 = new THREE.PointLight(0xffb86a, 2.2, 3.2, 1.3); fl2.position.set(0.42, 0.3, 0.1); flexo.add(fl2);
  plant(Z, -1.7, -1.1, 1.6); lamp(Z, 2.4, -0.9, 1.7, 1.4);
  const lampL = new THREE.PointLight(0x9fb6ff, 0.5, 3, 1.6); lampL.position.set(-0.1, 1.9, 0.2); Z.add(lampL);
  Z.add(new THREE.HemisphereLight(0x6c7cff, 0x1a120d, 0.35)); lights(Z, 600);
}
const CODE = ['import math', 'from datos import notas, alumnos', '', 'def media(notas):', '    total = 0', '    for n in notas:', '        total += n', '    return total / len(notas)', '',
  'def desviacion(notas):', '    m = media(notas)', '    s = sum((n - m) ** 2 for n in notas)', '    return math.sqrt(s / len(notas))', '',
  'class Alumno:', '    def __init__(self, nombre, notas):', '        self.nombre = nombre', '        self.notas = notas', '    def aprobado(self):', '        return media(self.notas) >= 5', '',
  'while not aprobado:', '    estudiar()', '    cafe += 1', '', 'for a in alumnos:', '    if a.aprobado():', '        print(a.nombre, "aprobado")', '    else:', '        print(a.nombre, "repite")', '',
  'print(media([5, 6.5, 7]))', 'print(desviacion([5, 6.5, 7]))', 'if bug: debug()']
function drawCode(tex, t, lines, speed = 14, color = '#e8e8e8', accent = '#ff5a1f', size = 30) {
  const g = tex.userData.g, w = tex.userData.c.width, h = tex.userData.c.height;
  g.fillStyle = '#0f1115'; g.fillRect(0, 0, w, h); g.font = `700 ${size}px Mono`; g.textAlign = 'left'; g.textBaseline = 'top';
  const n = Math.floor(t * speed), lh = size * 1.35, rows = Math.floor((h - 30) / lh); let k = 0, cur = 0;
  lines.forEach((ln, i) => { if (n >= k) cur = i; k += ln.length + 2; }); k = 0;
  const off = Math.max(0, cur - rows + 2);                 // desplaza hacia arriba cuando la pantalla se llena
  lines.forEach((ln, i0) => { const show = clamp(n - k, 0, ln.length); k += ln.length + 2; const i = i0 - off; if (i < 0 || i >= rows) return; g.fillStyle = '#4d5560'; g.fillText(String(i0 + 1).padStart(2, ' '), 14, 20 + i * lh); const kw = /^(\s*)(def|for|while|if|return|print|int|mov|add)\b/.exec(ln); g.fillStyle = kw ? accent : color; g.fillText(ln.slice(0, show), 70, 20 + i * size * 1.35); if (show > 0 && show < ln.length) { g.fillStyle = '#fff'; g.fillRect(70 + g.measureText(ln.slice(0, show)).width + 2, 20 + i * size * 1.35, size * 0.5, size); } });
  tex.needsUpdate = true;
}
function roomAt(t) {
  const O = zones.room.position, t0 = ZT.find(z => z[0] === 'room')[1];
  drawCode(S.codeTex, t - t0 + 1.2, CODE, 75, '#e8e8e8', '#ff7a3d', 27);
  // maniquí: mira la pantalla y bebe a sorbos
  const J = S.coder.userData.J, sip = env(t, K.noche - 0.6, K.noche + 0.9, 0.35, 0.35);
  J.shR.rotation.set(lerp(-0.5, -1.9, sip), 0, -0.2 * sip); J.elR.rotation.x = lerp(-0.9, -1.8, sip); J.neck.rotation.x = 0.15 - 0.25 * sip;
  S.coder.rotation.y = Math.PI;
  if (sip > 0.05) { const hand = new THREE.Vector3(); J.elR.children[0].getWorldPosition(hand); S.cup.position.lerp(hand.sub(O).add(v3(0, -0.1, 0)), Math.min(1, sip * 1.4)); S.cup.rotation.x = 0.9 * sip; } else { S.cup.position.set(0.55, 1.04, -0.45); S.cup.rotation.x = 0; }
  // tres planos encadenados: pantalla → mesa con café → habitación con ventana de noche
  const k1 = eio(prog(t, K.cafe - 0.2, 0.55)), k2 = eio(prog(t, K.codigo - 0.1, 0.8));
  const p0 = v3(O.x - 0.1, 1.86, 1.75), l0 = v3(O.x - 0.1, 1.58, -0.85);
  const p1 = v3(O.x + 0.45, 1.5, 0.28), l1 = v3(O.x + 0.45, 1.12, -0.5);
  const p2 = v3(O.x + 0.25, 2.1, 4.4), l2 = v3(O.x + 0.25, 1.35, -0.3);
  const p = p0.clone().lerp(p1, k1).lerp(p2, k2), l = l0.clone().lerp(l1, k1).lerp(l2, k2);
  cam.position.copy(p); cam.lookAt(l);
}

// ---------------------------------------------------------------- 7 · clase de física (maqueta isométrica)
function buildClass() {
  const Z = zone('cls', 700);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(7, 5.5), clay(C.floor, 0.85)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; Z.add(fl);
  Z.add(floorGrid(60, 60));
  for (const [x, z, w, d] of [[0, -2.75, 7, 0.15], [-3.5, 0, 0.15, 5.5]]) { const wl = rbox(w, 1.2, d, clay(C.wall, 0.8), 0.03); wl.position.set(x, 0.6, z); Z.add(wl); }
  S.board2 = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.0), new THREE.MeshStandardMaterial({ map: canvasTex(1000, 300), roughness: 0.9 })); S.board2.position.set(0.2, 0.75, -2.66); Z.add(S.board2);
  S.prof2 = makeDoll(C.pale, 1.1); S.prof2.position.set(1.6, 0, -2.2); Z.add(S.prof2);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = (c - 1.5) * 1.3, z = -0.6 + r * 1.2; const d = desk(); d.position.set(x, 0, z); Z.add(d); const p = makeDoll(hash(r * 4 + c) < 0.3 ? C.pale : C.wood); p.position.set(x, 0, z + 0.3); p.rotation.y = Math.PI; sit(p); Z.add(p); }
  lamp(Z, -3.05, -2.3, 1.4, 1.8); plant(Z, 3.0, -2.3, 1.2); plant(Z, -3.05, 2.3, 1.1);
  lights(Z, 700); Z.add(new THREE.HemisphereLight(0xbfd0ff, 0x2a1d16, 1.4));
}
function clsAt(t) {
  const O = zones.cls.position, t0 = ZT.find(z => z[0] === 'cls')[1];
  const g = S.board2.material.map.userData.g; g.fillStyle = '#1f4a37'; g.fillRect(0, 0, 1000, 300); g.strokeStyle = '#6e5232'; g.lineWidth = 16; g.strokeRect(0, 0, 1000, 300);
  const k = prog(t, K.fisica - 0.3, 0.6); g.fillStyle = '#e8efe9'; g.font = '800 130px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const txt = 'FÍSICA'; g.fillText(txt.slice(0, Math.ceil(txt.length * k)), 500, 150);
  g.font = '600 50px Inter'; g.fillStyle = '#b8d0c2'; if (t > K.fisica + 0.2) g.fillText('F = q·E      F = G·m₁m₂ / r²', 500, 255);
  S.board2.material.map.needsUpdate = true;
  const J = S.prof2.userData.J; J.shR.rotation.set(-2.2 + Math.sin(t * 8) * 0.2 * k, 0, 0.2); J.elR.rotation.x = -0.3; S.prof2.rotation.y = Math.PI + 0.3;
  const u = eio(prog(t, t0, K.campos - t0));
  const a = 0, r = lerp(9, 6.4, u), pz = lerp(0.5, -1.0, eio(prog(t, K.fisica - 0.6, 1.0)));
  cam.position.set(O.x + Math.sin(a) * r, lerp(6.5, 4.2, u), pz + Math.cos(a) * r); cam.lookAt(O.x, 0.4, lerp(0, -1.6, eio(prog(t, K.fisica - 0.6, 1.0))));
}

// ---------------------------------------------------------------- 8 · física: campos eléctricos, gravedad y circuitos
function buildPhys() {
  const Z = zone('phys', 800); Z.add(floorGrid(80, 80));
  // dipolo: cargas + y − con líneas de campo
  const qp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), clay(C.coral, 0.35)), qn = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), clay(C.blue, 0.35));
  qp.position.set(-1.2, 1.6, 0); qn.position.set(1.2, 1.6, 0); Z.add(qp, qn);
  const sp = label('+', { size: 180, w: 0.3 }), sn = label('−', { size: 180, w: 0.3 }); sp.position.set(-1.2, 1.6, 0.3); sn.position.set(1.2, 1.6, 0.3); Z.add(sp, sn);
  S.field = [];
  for (let i = 0; i < 14; i++) {
    const a0 = (i / 14) * Math.PI * 2, pts = []; let p = v3(-1.2 + Math.cos(a0) * 0.3, 1.6 + Math.sin(a0) * 0.3, 0);
    for (let s = 0; s < 260; s++) { const r1 = p.clone().sub(v3(-1.2, 1.6, 0)), r2 = p.clone().sub(v3(1.2, 1.6, 0)); const E = r1.clone().multiplyScalar(1 / r1.length() ** 3).sub(r2.clone().multiplyScalar(1 / r2.length() ** 3)); p = p.clone().addScaledVector(E.normalize(), 0.03); pts.push(p.clone()); if (r2.length() < 0.3 || p.distanceTo(v3(0, 1.6, 0)) > 3.6) break; }
    const pos = []; for (let k = 0; k + 1 < pts.length; k++) pos.push(pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z);
    const l = fatLines(new Float32Array(pos), i % 2 ? C.orange : 0xff2e63, 2.6, 0.95); Z.add(l); S.field.push({ l, n: pos.length / 6 });
  }
  S.charges = [qp, qn, sp, sn];
  // pozo gravitatorio: malla que se hunde bajo una masa
  const gg = new THREE.PlaneGeometry(6, 6, 40, 40); gg.rotateX(-Math.PI / 2); S.wellGeo = gg; S.wellBase = gg.attributes.position.array.slice();
  S.well = new THREE.LineSegments(new THREE.WireframeGeometry(gg), new THREE.LineBasicMaterial({ color: C.blue, transparent: true, opacity: 0.8 })); S.well.position.set(0, -0.2, -9); Z.add(S.well);
  S.mass = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 24), new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.12, metalness: 1 })); Z.add(S.mass);
  // circuito: pila, bombilla y dos cables (uno conduce, otro no)
  const circ = new THREE.Group(); circ.position.set(0, 0, 9); Z.add(circ); S.circ = circ;
  const bat = rbox(0.5, 0.9, 0.5, clay(C.orange, 0.4), 0.08); bat.position.set(-1.6, 0.45, 0); circ.add(bat);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffc860, emissiveIntensity: 0 })); bulb.position.set(1.6, 0.6, 0); circ.add(bulb); S.bulb = bulb;
  const wire = (pts, c) => { const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.035, 8), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0 })); circ.add(tube); return tube; };
  S.w1 = wire([v3(-1.6, 0.9, 0), v3(-0.6, 1.4, 0), v3(0.6, 1.4, 0), v3(1.6, 0.9, 0)], 0xffa25f);
  S.w2 = wire([v3(-1.6, 0.05, 0.3), v3(-0.4, 0.05, 0.6), v3(0.4, 0.05, 0.6), v3(1.6, 0.3, 0.3)], 0x6a6e78);
  S.w1Curve = new THREE.CatmullRomCurve3([v3(-1.6, 0.9, 0), v3(-0.6, 1.4, 0), v3(0.6, 1.4, 0), v3(1.6, 0.9, 0)]);
  S.elec = [0, 1, 2, 3, 4, 5].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe14d })); circ.add(m); return m; });
  S.noX = label('✕', { size: 200, color: '#ff6b5e', w: 0.45 }); S.noX.position.set(0, 0.35, 0.65); circ.add(S.noX);
  lights(Z, 800); Z.add(new THREE.HemisphereLight(0xbfd0ff, 0x2a1d16, 1.4));
}
function physAt(t) {
  const O = zones.phys.position, t0 = ZT.find(z => z[0] === 'phys')[1];
  S.field.forEach((f, i) => { f.l.geometry.instanceCount = Math.floor(f.n * eio(prog(t, t0 + i * 0.03, 0.9))); });
  // la masa cae y hunde la malla
  const drop = eo(prog(t, K.circuitos - 0.4, 0.5)), a = S.wellGeo.attributes.position.array;
  for (let i = 0; i < a.length; i += 3) { const x = S.wellBase[i], z = S.wellBase[i + 2]; a[i + 1] = -1.6 * drop / (1 + (x * x + z * z) * 0.8); }
  S.well.geometry.dispose(); S.well.geometry = new THREE.WireframeGeometry(S.wellGeo);
  S.mass.position.set(0, lerp(3.2, -0.2 + 0.45 - 1.6 * 0.95, drop), -9);
  const on = t > K.conduce - 0.1; S.bulb.material.emissiveIntensity = on ? 2.5 + 0.5 * Math.sin(t * 20) : 0; S.w1.material.emissiveIntensity = on ? 0.8 : 0;
  S.elec.forEach((e, i) => { e.visible = on; const u = ((t * 0.8 + i / 6) % 1); e.position.copy(S.w1Curve.getPoint(u)); });
  S.noX.visible = t > K.otro - 0.05; S.noX.scale.setScalar(eo(prog(t, K.otro - 0.05, 0.25)));
  // cámara: dipolo → pozo → circuito
  const k1 = eio(prog(t, K.circuitos - 0.5, 0.7)), k2 = eio(prog(t, K.cable - 0.5, 0.6));
  const p = v3(O.x, 2.4, 8.2).lerp(v3(O.x, 5.5, -3.0), k1).lerp(v3(O.x, 2.6, 15.5), k2);
  const l = v3(O.x, 1.6, 0).lerp(v3(O.x, -0.8, -9), k1).lerp(v3(O.x, 0.6, 9), k2);
  cam.position.copy(p); cam.lookAt(l);
}

// ---------------------------------------------------------------- 9 · cálculo: pizarra verde llena de límites imposibles
const LIMS = ['lim  sen x / x = 1', 'x→0', 'lim (1 + 1/n)ⁿ = e', 'n→∞', 'lim (xˣ − 1)/(x·ln x)', 'x→0⁺', 'lim √(x²+x) − x = ½', 'x→∞', 'lim (tg x − sen x)/x³', 'x→0', 'lim n·(e^(1/n) − 1)', 'n→∞', 'lim (1 − cos x)/x²', 'x→0', 'lim ln(1+x)^(1/x)', 'x→0', 'lim Σ 1/(n+k)', 'n→∞', 'lim x^(1/ln x)', 'x→∞', 'lim (aˣ − bˣ)/x', 'x→0', 'lim ∛(n³+n²) − n', 'n→∞'];
function buildCalc() {
  const Z = zone('calc', 900); Z.add(floorGrid(60, 60));
  const fr = rbox(6.4, 4.2, 0.12, clay(0x6e5232, 0.7), 0.05); fr.position.set(0, 2.4, -0.07); Z.add(fr);
  S.calcTex = canvasTex(1600, 1040); S.calcBoard = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 3.96), new THREE.MeshStandardMaterial({ map: S.calcTex, roughness: 0.95 })); S.calcBoard.position.set(0, 2.4, 0.0); Z.add(S.calcBoard);
  lights(Z, 900); Z.add(new THREE.HemisphereLight(0xffffff, 0x2a1d16, 1.5));
}
function chalk(g, txt, x, y, size, k = 1, color = '#eef3ef') { g.save(); g.translate(x, y); g.rotate(-0.02 + 0.04 * hash(x + y)); g.font = `600 ${size}px Inter`; g.fillStyle = color; g.globalAlpha = 0.92; g.fillText(txt.slice(0, Math.ceil(txt.length * k)), 0, 0); g.restore(); }
// límite imposible escrito con tiza (fracción de fracciones, raíces e integrales)
const MON = {
  A: [{ sqrt: 'aΛ²(x − 1) + bΛ(x − 1) + c' }, ' − ', { sqrt: 'c + Λ(x − 1)' }],
  B: ['R', { big: '(' }, { int: 1 }, { frac: ['R(t)', '1 + t²'] }, 'dt', { big: ')' }, ' + R', { big: '(' }, { int: 1 }, { frac: ['1 + t²', 'sgn(t)'] }, 'dt', { big: ')' }, ' + 1 − x'],
  C: [{ sqrt: 'bΛ(x − 1) − aΛ²(x − 1) + d' }, ' − ', { sqrt: 'd + Λ(x − 1)' }],
  E: ['R', { big: '(' }, { int: 1 }, { frac: ['rect(t)', '1 + t²'] }, 'dt', { big: ')' }, ' + R', { big: '(' }, { int: 1 }, { frac: ['1 + t²', 'Λ(t) − 1'] }, 'dt', { big: ')' }, ' + 1 − x'],
};
function mrow(g, items, x, y, sz, draw) {
  const F = s => `italic ${s}px Serif`, x0 = x;
  for (const it of items) {
    if (typeof it === 'string') { g.font = F(sz); if (draw) g.fillText(it, x, y); x += g.measureText(it).width; }
    else if (it.sqrt) { g.font = F(sz); const w = g.measureText(it.sqrt).width; if (draw) { g.beginPath(); g.moveTo(x, y - 0.32 * sz); g.lineTo(x + 0.12 * sz, y - 0.4 * sz); g.lineTo(x + 0.25 * sz, y + 0.08 * sz); g.lineTo(x + 0.42 * sz, y - 0.86 * sz); g.lineTo(x + 0.5 * sz + w, y - 0.86 * sz); g.stroke(); g.fillText(it.sqrt, x + 0.48 * sz, y); } x += 0.55 * sz + w; }
    else if (it.frac) { const fs = sz * 0.72; g.font = F(fs); const wn = g.measureText(it.frac[0]).width, wd = g.measureText(it.frac[1]).width, w = Math.max(wn, wd) + 0.3 * fs, yb = y - 0.3 * sz;
      if (draw) { g.fillText(it.frac[0], x + (w - wn) / 2, yb - 0.2 * fs); g.fillText(it.frac[1], x + (w - wd) / 2, yb + 0.85 * fs); g.beginPath(); g.moveTo(x, yb); g.lineTo(x + w, yb); g.stroke(); } x += w + 0.1 * sz; }
    else if (it.int) { if (draw) { g.font = `${sz * 1.7}px Serif`; g.fillText('∫', x, y + 0.3 * sz); g.font = F(sz * 0.45); g.fillText('−x', x + 0.45 * sz, y - 0.95 * sz); g.fillText('x²', x - 0.05 * sz, y + 0.75 * sz); } x += 0.75 * sz; }
    else if (it.big) { if (draw) { g.save(); g.translate(x, y - 0.3 * sz); g.scale(1, 2.0); g.font = `${sz}px Serif`; g.fillText(it.big, 0, 0.33 * sz); g.restore(); } x += 0.4 * sz; }
  }
  return x - x0;
}
function drawMonster(g, X, Y, maxW, k, color) {
  g.save(); g.fillStyle = color; g.strokeStyle = color; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  const w1 = Math.max(...['A', 'B', 'C', 'E'].map(r => mrow(g, MON[r], 0, 0, 1, false))), sz = Math.min(52, maxW / w1), W = w1 * sz; S.monW = W;
  g.lineWidth = Math.max(3, sz * 0.07); g.lineCap = 'round';
  g.beginPath(); g.rect(X - 260, 0, 260 + (W + 40) * k, 2000); g.clip();          // se va escribiendo de izquierda a derecha
  const lim = Y + 0.15 * sz; g.font = `${sz * 1.1}px Serif`; g.fillText('lim', X - 1.95 * sz, lim); g.font = `italic ${sz * 0.5}px Serif`; g.fillText('x → −1⁺', X - 2.15 * sz, lim + 0.75 * sz);
  const b1 = Y - 2.25 * sz, b2 = Y + 1.45 * sz, row = (r, y) => { const w = mrow(g, MON[r], 0, 0, sz, false); mrow(g, MON[r], X + (W - w) / 2, y, sz, true); };
  row('A', b1 - 0.35 * sz); row('B', b1 + 1.3 * sz); row('C', Y + 0.95 * sz); row('E', b2 + 1.3 * sz);
  for (const [y, w] of [[b1, W * 0.96], [Y, W + 0.3 * sz], [b2, W * 0.96]]) { g.beginPath(); g.moveTo(X + (W - w) / 2, y); g.lineTo(X + (W + w) / 2, y); g.stroke(); }
  g.restore();
}
function calcAt(t) {
  const O = zones.calc.position, t0 = ZT.find(z => z[0] === 'calc')[1], g = S.calcTex.userData.g;
  g.fillStyle = '#1f4a37'; g.fillRect(0, 0, 1600, 1040); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.015 + 0.02 * hash(i)})`; g.fillRect(hash(i * 3) * 1600, hash(i * 5) * 1040, 200, 60); }
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  // límites que se escriben cada vez más rápido (y más pequeños) hasta llenar la pizarra
  drawMonster(g, 330, 250, 1060, eio(prog(t, t0 + 0.1, K.limites + 0.5 - t0)), '#eef3ef');
  const lt = t - (K.limites + 0.2);
  if (lt > 0) { let x = 200, y = 520, size = 74, n = 0; for (let i = 0; i < 60; i++) { const tw = Math.pow(0.82, i) * 0.55 + 0.04, s0 = i === 0 ? 0 : (1 - Math.pow(0.82, i)) / (1 - 0.82) * 0.55 * 0.82 + i * 0.04; const k = clamp((lt - s0) / tw); if (k <= 0) break; const L = LIMS[(2 * i) % LIMS.length], sub = LIMS[(2 * i + 1) % LIMS.length]; const sz = Math.max(30, size - i * 2.2); chalk(g, L, x, y, sz, k); chalk(g, sub, x + sz * 0.3, y + sz * 0.55, sz * 0.5, k, '#cfe2d6'); g.font = `600 ${sz}px Inter`; x += g.measureText(L).width + 70; if (x > 1250) { x = 200 + 100 * hash(i); y += sz * 1.6; } if (y > 1000) { y = 120 + 60 * hash(i); x = 90 + 300 * hash(i * 2); } n++; } }
  // derivada (tangente que se desliza) e integral (área que se rellena), en el centro
  const dA = env(t, K.derivadas - 0.1, 99, 0.25, 0.1), iA = env(t, K.integrales - 0.1, 99, 0.25, 0.1);
  if (dA > 0) { g.save(); g.translate(0, 190); g.globalAlpha = dA; g.fillStyle = 'rgba(15,40,30,.85)'; g.fillRect(380, 300, 840, 520); g.strokeStyle = '#eef3ef'; g.lineWidth = 6; g.beginPath(); for (let i = 0; i <= 100; i++) { const x = 420 + i * 7.6, yv = 700 - 260 * Math.sin(i / 100 * Math.PI * 0.9) * (0.5 + i / 200); i ? g.lineTo(x, yv) : g.moveTo(x, yv); } g.stroke();
    if (iA > 0) { g.globalAlpha = 0.55 * iA; g.fillStyle = '#ff6b5e'; g.beginPath(); g.moveTo(420, 760); const m = Math.floor(100 * eo(prog(t, K.integrales, 0.8))); for (let i = 0; i <= m; i++) { const x = 420 + i * 7.6, yv = 700 - 260 * Math.sin(i / 100 * Math.PI * 0.9) * (0.5 + i / 200); g.lineTo(x, yv); } g.lineTo(420 + m * 7.6, 760); g.fill(); g.globalAlpha = dA; }
    const u = (t - K.derivadas) * 0.35 % 1, i0 = u * 100, x0 = 420 + i0 * 7.6, f = q => 700 - 260 * Math.sin(q / 100 * Math.PI * 0.9) * (0.5 + q / 200), y0 = f(i0), sl = (f(i0 + 0.5) - f(i0 - 0.5)) / 7.6;
    g.strokeStyle = '#ff5a1f'; g.lineWidth = 7; g.beginPath(); g.moveTo(x0 - 220, y0 - sl * 220); g.lineTo(x0 + 220, y0 + sl * 220); g.stroke(); g.fillStyle = '#ff5a1f'; g.beginPath(); g.arc(x0, y0, 12, 0, 7); g.fill();
    chalk(g, "f '(x)", 440, 380, 70, 1, '#ffd2b8'); if (iA > 0) chalk(g, '∫ f(x) dx', 900, 380, 70, 1, '#ffb3aa'); g.restore(); }
  S.calcTex.needsUpdate = true;
  const u = eio(prog(t, t0, ZT.find(z => z[0] === 'alg')[1] - t0)), push = eio(prog(t, K.limites, 1.6));
  // primero la cámara sigue la tiza de cerca mientras escribe el límite imposible; luego se aleja y la pizarra se llena
  const wk = eio(prog(t, t0 + 0.1, K.limites + 0.5 - t0)), head = ((330 + (S.monW || 1000) * wk) / 1600 - 0.5) * 6.1;
  const near = v3(O.x + clamp(head - 0.6, -1.4, 1.6), 3.35, 5.2), far = v3(O.x, 2.4, 12.8 - 0.3 * u), back = eio(prog(t, K.limites + 0.35, 0.8));
  const cp = near.clone().lerp(far, back); cam.position.copy(cp); cam.lookAt(cp.x, cp.y, 0);
}

// ---------------------------------------------------------------- 10 · álgebra: figuras que giran, se estiran y se aplastan
function buildAlg() {
  const Z = zone('alg', 1000);
  // figuras de alambre (referencia del usuario): se presentan de una en una y giran sobre su eje
  const lm = new THREE.LineBasicMaterial({ color: 0x5aa0ff, transparent: true, opacity: 0.95 });
  const segs = (L, pts, closed = false) => { for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; L.push(a[0], a[1], a[2], b[0], b[1], b[2]); } };
  const surf = (L, fn, nu, nv, su = 48, sv = 48, cu = false, cv = false) => {
    for (let i = 0; i <= nu - (cu ? 1 : 0); i++) { const pts = []; for (let k = 0; k <= sv; k++) pts.push(fn(i / nu, k / sv)); segs(L, pts); }
    for (let j = 0; j <= nv - (cv ? 1 : 0); j++) { const pts = []; for (let k = 0; k <= su; k++) pts.push(fn(k / su, j / nv)); segs(L, pts); }
  };
  const rev = (r, y) => (u, v) => { const a = u * Math.PI * 2; return [Math.cos(a) * r(v), y(v), Math.sin(a) * r(v)]; };
  const star = (n, r1, r2, y = 0, rot = 0, s = 1) => Array.from({ length: n * 2 }, (_, i) => { const a = rot + i * Math.PI / n, r = (i % 2 ? r2 : r1) * s; return [Math.cos(a) * r, y, Math.sin(a) * r]; });
  const B = [];
  // 1 · malla deformada
  B.push(L => surf(L, (u, v) => { const x = (u - 0.5) * 1.5, y = (v - 0.5) * 2.2; return [x + 0.18 * Math.sin(v * Math.PI * 1.5), y, 0.45 * Math.exp(-((x + 0.15) ** 2 * 5 + (y - 0.1) ** 2 * 1.4)) - 0.2 * Math.cos(v * 3)]; }, 14, 20));
  // 2 · prisma de estrella con punta
  B.push(L => { const lo = star(5, 0.95, 0.45, -0.45), hi = star(5, 0.95, 0.45, 0.15); segs(L, lo, true); segs(L, hi, true); lo.forEach((p, i) => { segs(L, [p, hi[i]]); segs(L, [hi[i], [0, 0.95, 0]]); }); for (let k = 1; k < 3; k++) segs(L, star(5, 0.95, 0.45, -0.45 + k * 0.2), true); });
  // 3 · huevo / bala
  B.push(L => surf(L, rev(v => 0.62 * Math.sqrt(Math.max(0, 1 - (v * 1.4 - 0.4) ** 2)), v => (v * 1.4 - 0.4) * 1.1), 14, 10, 48, 48, true));
  // 4 · chevron de cuadrados apilados
  B.push(L => { for (let i = 0; i <= 26; i++) { const s = i / 26, x = (s - 0.5) * 2.0, y = 0.55 - Math.abs(x) * 0.9, nx = Math.sign(x || 1) * 0.9, n = Math.hypot(nx, 1), px = nx / n * 0.22, py = 1 / n * 0.22; segs(L, [[x - px, y - py, -0.22], [x + px, y + py, -0.22], [x + px, y + py, 0.22], [x - px, y - py, 0.22]], true); } });
  // 5 · estrella retorcida (contornos apilados que giran)
  B.push(L => { for (let i = 0; i < 18; i++) { const pts = star(6, 1.0, 0.5, 0, i * 0.06, 1 - i * 0.02).map(p => [p[0], p[2], (i - 9) * 0.035]); segs(L, pts, true); } });
  // 6 · toro grande
  B.push(L => surf(L, (u, v) => { const a = u * Math.PI * 2, b = v * Math.PI * 2, R = 0.85, r = 0.32; return [(R + r * Math.cos(b)) * Math.cos(a), r * Math.sin(b), (R + r * Math.cos(b)) * Math.sin(a)]; }, 28, 14, 64, 32, true, true));
  // 7 · toro hinchado con pico en el centro
  B.push(L => { surf(L, (u, v) => { const a = u * Math.PI * 2, b = v * Math.PI * 2, R = 0.62, r = 0.42; return [(R + r * Math.cos(b)) * Math.cos(a), 0.55 * r * Math.sin(b), (R + r * Math.cos(b)) * Math.sin(a)]; }, 24, 12, 64, 32, true, true); surf(L, rev(v => 0.2 * (1 - v), v => 0.05 + v * 0.22), 8, 2, 24, 4, true); });
  // 8 · cuenco
  B.push(L => { surf(L, rev(v => 0.3 + 0.48 * Math.sin(Math.PI * (0.12 + 0.7 * v)), v => v * 0.9 - 0.45), 20, 9, 64, 32, true); surf(L, rev(v => 0.42 - 0.08 * v, v => 0.45 - v * 0.25), 20, 2, 64, 8, true); });
  S.figs = B.map(build => { const L = []; build(L); const tilt = new THREE.Group(); tilt.position.y = 1.95; Z.add(tilt); const spin = new THREE.Group(); tilt.add(spin);
    spin.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(L, 3)), lm)); return { tilt, spin }; });
  S.matTex = canvasTex(700, 300); S.matBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.77), new THREE.MeshBasicMaterial({ map: S.matTex, transparent: true })); Z.add(S.matBoard);
}
function algAt(t) {
  const O = zones.alg.position, t0 = ZT.find(z => z[0] === 'alg')[1];
  const rot = eio(prog(t, K.giran - 0.1, 0.5)), str = eio(prog(t, K.estiran - 0.05, 0.4)), sq = prog(t, K.aplastan - 0.05, 0.35);
  const sqE = sq < 1 ? eo(sq) : 1, bounce = sq >= 1 ? 1 + 0.15 * Math.exp(-(t - K.aplastan - 0.3) * 6) * Math.cos((t - K.aplastan) * 25) : 1;
  // una figura cada vez: entra por la derecha, gira sobre su eje (inclinado, como la Tierra) y sale por la izquierda
  const T = [t0, K.algebra + 0.4, K.matrices, (K.matrices + K.giran) / 2, K.giran, K.estiran, (K.estiran + K.aplastan) / 2, K.aplastan, 1e9];
  S.figs.forEach((f, i) => {
    const a = T[i], b = T[i + 1], inn = i === 0 ? 1 : eo(prog(t, a - 0.1, 0.24)), out = eio(prog(t, b - 0.1, 0.22));
    f.tilt.visible = t > a - 0.1 && t < b + 0.12; if (!f.tilt.visible) return;
    f.tilt.position.x = 3.2 * (1 - inn) - 3.2 * out; f.tilt.rotation.z = 0.41;
    const s = 1.22 * (0.6 + 0.4 * inn) * (1 - 0.4 * out); f.tilt.scale.setScalar(s);
    f.spin.rotation.set(i === 4 ? 0 : 0.25, (t - a) * 2.4, i === 4 ? (t - a) * 5 * rot : 0);
    if (i === 5) f.spin.scale.set(1 + 0.8 * str, 1, 1);
    if (i === 7) { f.tilt.rotation.z = 0.41 * (1 - sqE); f.spin.scale.set(1 + 0.3 * sqE, Math.max(0.03, 1 - 0.97 * sqE) * bounce, 1 + 0.3 * sqE); }
  });
  const g = S.matTex.userData.g; g.clearRect(0, 0, 700, 300); g.fillStyle = 'rgba(20,22,26,.85)'; rr(g, 0, 0, 700, 300, 40); g.fill();
  const m = sq > 0.5 ? [['1', '0', '0'], ['0', '0', '0'], ['0', '0', '1']] : str > 0.5 ? [['1.8', '0', '0'], ['0', '1', '0'], ['0', '0', '1']] : rot > 0.5 ? [['cos', '−sen', '0'], ['sen', 'cos', '0'], ['0', '0', '1']] : [['1', '0', '0'], ['0', '1', '0'], ['0', '0', '1']];
  g.font = '700 60px Mono'; g.textAlign = 'center'; g.textBaseline = 'middle';
  m.forEach((row, i) => row.forEach((v, j) => { g.fillStyle = (sq > 0.5 && i === 1 && j === 1) || (str > 0.5 && i === 0 && j === 0) ? '#ff5a1f' : '#f0f0f0'; g.fillText(v, 180 + j * 170, 65 + i * 85); }));
  g.strokeStyle = '#f0f0f0'; g.lineWidth = 8; g.beginPath(); g.moveTo(90, 25); g.lineTo(60, 25); g.lineTo(60, 275); g.lineTo(90, 275); g.moveTo(610, 25); g.lineTo(640, 25); g.lineTo(640, 275); g.lineTo(610, 275); g.stroke();
  S.matTex.needsUpdate = true;
  S.matBoard.position.set(0, 0.25, 0.3); S.matBoard.material.opacity = env(t, K.matrices - 0.1, 99, 0.3, 0.1);
  const u = eio(prog(t, t0, 4)); cam.position.set(O.x, 2.0, lerp(7.6, 7.0, u)); cam.lookAt(O.x, 2.0, 0);
}

// ---------------------------------------------------------------- 11 · programación: variables, bucles, funciones
function buildProg() {
  const Z = zone('prog', 1100); Z.add(floorGrid(60, 60));
  const mon = rbox(3.4, 2.2, 0.14, clay(0x1d1f23, 0.4), 0.08); mon.position.set(0, 2.2, -1.2); Z.add(mon);
  { const nk = rbox(0.3, 1.2, 0.12, clay(0x1d1f23, 0.4), 0.04); nk.position.set(0, 0.6, -1.32); Z.add(nk); const ft = rbox(1.2, 0.06, 0.7, clay(0x1d1f23, 0.4), 0.03); ft.position.set(0, 0.03, -1.3); Z.add(ft); }
  S.progTex = canvasTex(1100, 700); const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), new THREE.MeshBasicMaterial({ map: S.progTex })); scr.position.set(0, 2.2, -1.12); Z.add(scr);
  // variable: cajita con su valor
  S.varBox = new THREE.Group(); Z.add(S.varBox); const vb = rbox(0.8, 0.8, 0.8, clay(C.orange, 0.4), 0.1); S.varBox.add(vb); S.varLab = label('x = 3', { size: 90, w: 0.75, font: 'Mono', weight: 700 }); S.varLab.position.z = 0.42; S.varBox.add(S.varLab);
  // bucle: anillo con una bola que da vueltas
  S.loop = new THREE.Group(); Z.add(S.loop); S.loop.add(new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 12, 80), clay(C.blue, 0.4)));
  S.loopBall = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), clay(C.coral, 0.3)); S.loop.add(S.loopBall);
  // función: máquina con entrada y salida
  S.fn = new THREE.Group(); Z.add(S.fn); S.fn.add(rbox(1.0, 0.7, 0.7, clay(0x22c08a, 0.4), 0.1)); const fl = label('f(x)', { size: 90, w: 0.6, font: 'Mono', weight: 700 }); fl.position.z = 0.37; S.fn.add(fl);
  S.fnIn = rbox(0.25, 0.25, 0.25, clay(C.orange), 0.05); S.fnOut = rbox(0.25, 0.25, 0.25, clay(C.coral), 0.05); Z.add(S.fnIn, S.fnOut);
  lights(Z, 1100); Z.add(new THREE.HemisphereLight(0xbfd0ff, 0x2a1d16, 1.5));
}
const PCODE = ['x = 3', 'notas = [5, 6.5, 7]', '', 'for n in notas:', '    print(n)', '', 'def doble(a):', '    return 2 * a', '', 'doble(x)   # 6'];
function progAt(t) {
  const O = zones.prog.position, t0 = ZT.find(z => z[0] === 'prog')[1];
  drawCode(S.progTex, (t - t0) * 1.6, PCODE, 14, '#e8e8e8', '#ff5a1f', 46);
  const va = eo(prog(t, K.variables - 0.1, 0.35)), la = eo(prog(t, K.bucles - 0.1, 0.35)), fa = eo(prog(t, K.funciones - 0.1, 0.35));
  S.varBox.position.set(O.x - 1.25, 0.6 + 0.08 * Math.sin(t * 3), 0.6); S.varBox.scale.setScalar(Math.max(0.001, va)); S.varBox.rotation.y = 0.4 * Math.sin(t);
  S.loop.position.set(O.x, 0.75, 0.9); S.loop.scale.setScalar(Math.max(0.001, la)); S.loop.rotation.x = 0.3; const a = (t - K.bucles) * 6; S.loopBall.position.set(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0);
  S.fn.position.set(O.x + 1.25, 0.6, 0.6); S.fn.scale.setScalar(Math.max(0.001, fa));
  const u = ((t - K.funciones) * 0.9) % 1; S.fnIn.visible = S.fnOut.visible = fa > 0.5;
  S.fnIn.position.set(O.x + 1.25 - 1.0 + Math.min(u, 0.5) * 2 * 0.6, 0.6, 0.6); S.fnOut.position.set(O.x + 1.25 + 0.4 + Math.max(0, u - 0.5) * 2 * 0.7, 0.6, 0.6); S.fnIn.visible = u < 0.5 && fa > 0.5; S.fnOut.visible = u >= 0.5 && fa > 0.5;
  const k = eio(prog(t, t0, K.ensamblador - t0)); cam.position.set(O.x, lerp(2.6, 2.1, k), lerp(8.4, 7.4, k)); cam.lookAt(O.x, 1.6, 0);
}

// ---------------------------------------------------------------- 12 · ensamblador: cascada de código y registros
const ASM = ['push   %rbp', 'mov    %rsp, %rbp', 'sub    $16, %rsp', 'movl   %edi, -4(%rbp)', 'mov    %rdi, %rax', 'add    $1, %rax', 'and    $0xff, %eax', 'cmp    $0, %edi', 'jle    .L2', 'imul   %esi, %edi', 'lea    (%rdi,%rsi,4), %rax', 'xor    %eax, %eax', 'shl    $2, %rax', 'test   %rax, %rax', 'jne    .L3', 'call   printf', 'mov    -4(%rbp), %eax', 'pop    %rbp', 'ret', '.L2:', 'mov    $0, %eax', 'jmp    .L4', 'or     %ecx, %edx', 'inc    %rcx', 'syscall'];
const REGS = ['%rax', '%rbx', '%rcx', '%rdx', '%rsi', '%rdi', '%rsp', '%rbp'];
function buildAsm() {
  const Z = zone('asm', 1200); Z.add(floorGrid(60, 60));
  const mon = rbox(3.0, 3.8, 0.16, clay(0x1d1f23, 0.4), 0.1); mon.position.set(-0.6, 2.4, -0.6); Z.add(mon);
  { const nk = rbox(0.3, 0.6, 0.12, clay(0x1d1f23, 0.4), 0.04); nk.position.set(-0.6, 0.3, -0.72); Z.add(nk); const ft = rbox(1.2, 0.06, 0.7, clay(0x1d1f23, 0.4), 0.03); ft.position.set(-0.6, 0.03, -0.7); Z.add(ft); }
  S.asmTex = canvasTex(800, 1040); const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.6), new THREE.MeshBasicMaterial({ map: S.asmTex })); scr.position.set(-0.6, 2.4, -0.51); Z.add(scr);
  // procesador con registros
  S.cpu = new THREE.Group(); S.cpu.position.set(1.7, 1.0, 0.8); Z.add(S.cpu);
  S.cpu.add(rbox(1.5, 0.18, 1.5, clay(0x2a2c31, 0.35), 0.04));
  for (let i = 0; i < 12; i++) for (const s of [-1, 1]) { const p1 = rbox(0.05, 0.04, 0.2, clay(0xc9c9c9, 0.3), 0.01); p1.position.set(-0.66 + i * 0.12, -0.05, s * 0.82); S.cpu.add(p1); const p2 = p1.clone(); p2.rotation.y = Math.PI / 2; p2.position.set(s * 0.82, -0.05, -0.66 + i * 0.12); S.cpu.add(p2); }
  S.regs = REGS.map((r, i) => { const b = rbox(0.6, 0.12, 0.26, new THREE.MeshStandardMaterial({ color: 0x3a3d44, emissive: C.orange, emissiveIntensity: 0, roughness: 0.4 }), 0.03); b.position.set(-0.34 + (i % 2) * 0.68, 0.16, -0.5 + Math.floor(i / 2) * 0.33); S.cpu.add(b); const l = label(r, { size: 70, w: 0.42, font: 'Mono', weight: 700 }); l.rotation.x = -Math.PI / 2; l.position.set(b.position.x, 0.23, b.position.z); S.cpu.add(l); return b; });
  lights(Z, 1200); Z.add(new THREE.HemisphereLight(0xbfd0ff, 0x2a1d16, 1.4));
}
function asmAt(t) {
  const O = zones.asm.position, t0 = ZT.find(z => z[0] === 'asm')[1], g = S.asmTex.userData.g;
  g.fillStyle = '#0c0e12'; g.fillRect(0, 0, 800, 1040);
  const speed = 6 + 10 * eio(prog(t, K.procesador, 2.5)), off = (t - t0) * speed;
  g.font = '700 40px Mono'; g.textAlign = 'left'; g.textBaseline = 'top';
  for (let i = -1; i < 22; i++) { const n = Math.floor(off) + i, y = (i - (off % 1)) * 50 + 20, ln = ASM[((n % ASM.length) + ASM.length) % ASM.length]; const hl = (n % 7) === 3; if (hl) { g.fillStyle = 'rgba(255,90,31,.18)'; g.fillRect(0, y - 6, 800, 50); } const [op, ...rest] = ln.split(/\s+/); g.fillStyle = ln.endsWith(':') ? '#9fb6d6' : '#ff8a5c'; g.fillText(op, 40, y); g.fillStyle = '#e6e6e6'; g.fillText(rest.join(' ').replace(/(%\w+)/g, '$1'), 230, y); }
  const grd = g.createLinearGradient(0, 0, 0, 1040); grd.addColorStop(0, 'rgba(12,14,18,1)'); grd.addColorStop(0.12, 'rgba(12,14,18,0)'); grd.addColorStop(0.88, 'rgba(12,14,18,0)'); grd.addColorStop(1, 'rgba(12,14,18,1)'); g.fillStyle = grd; g.fillRect(0, 0, 800, 1040);
  S.asmTex.needsUpdate = true;
  const rr0 = t > K.registro - 0.1;
  S.regs.forEach((b, i) => { const pulse = rr0 ? Math.max(0, Math.sin((t - K.registro) * 10 - i * 0.9)) : Math.max(0, Math.sin(t * 6 + i)) * 0.3; b.material.emissiveIntensity = 1.6 * pulse; });
  S.cpu.rotation.y = 0;
  const k = eio(prog(t, K.procesador - 0.4, 1.2)), k2 = eio(prog(t, K.registro - 0.4, 0.8));
  const p = v3(O.x - 0.6, 2.5, 7.6).lerp(v3(O.x + 0.4, 2.9, 6.4), k).lerp(v3(O.x + 1.7, 3.9, 3.4), k2), l = v3(O.x - 0.6, 2.4, 0).lerp(v3(O.x + 0.4, 1.8, 0), k).lerp(v3(O.x + 1.7, 1.0, 0.8), k2);
  cam.position.copy(p); cam.lookAt(l);
}

// ---------------------------------------------------------------- 13–14 · las piezas encajan (y «¿merece la pena?»)
const PIECES = ['FÍSICA', 'CÁLCULO', 'ÁLGEBRA', 'PROGRAMACIÓN', 'ENSAMBLADOR', 'REDES'];
function buildPuzzle() {
  const Z = zone('puz', 1300); Z.add(floorGrid(60, 60));
  const cols = [C.orange, C.coral, C.blue, 0x22c08a, 0xffc12e, 0x8a5cff];
  S.pcs = PIECES.map((name, i) => { const g = new THREE.Group(); Z.add(g); const b = rbox(1.0, 0.5, 1.0, clay(cols[i], 0.45), 0.07); g.add(b); const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 20), clay(cols[i], 0.45)); nub.position.y = 0.3; g.add(nub); const l = label(name, { size: 64, w: 0.9 }); l.position.set(0, 0, 0.51); g.add(l);
    const tgt = v3(((i % 3) - 1) * 1.02, 0.25 + Math.floor(i / 3) * 0.52, 0); const start = v3(Math.cos(i * 1.7) * 2.6, 1.2 + hash(i) * 2.2, Math.sin(i * 1.7) * 2.0); return { g, tgt, start, i }; });
  S.pcCode = label('</>', { size: 160, color: '#ff5a1f', w: 0.8 }); Z.add(S.pcCode);
  lights(Z, 1300); Z.add(new THREE.HemisphereLight(0xbfd0ff, 0x2a1d16, 1.5));
}
function puzAt(t) {
  const O = zones.puz.position, t0 = ZT.find(z => z[0] === 'puz')[1];
  const snap = K.encajan - 0.15;
  S.pcs.forEach(p => { const k = eo(prog(t, snap + p.i * 0.08, 0.45)); const wob = (1 - k); p.g.position.copy(p.start.clone().lerp(p.tgt, k)).add(v3(0.12 * Math.sin(t * 2 + p.i) * wob, 0.15 * Math.sin(t * 1.5 + p.i) * wob, 0)); p.g.rotation.set(wob * Math.sin(t + p.i) * 0.6, wob * (t * 0.6 + p.i), wob * 0.3); const pop = t > snap + p.i * 0.08 + 0.45 ? 1 + 0.08 * Math.exp(-(t - snap - p.i * 0.08 - 0.45) * 8) : 1; p.g.scale.setScalar(pop); });
  // «si solo buscas programar, igual no»: el símbolo de código se apaga
  const ca = env(t, K.programar - 0.4, K.pero2 + 0.2, 0.3, 0.3), dim = prog(t, K.igual, 0.4);
  S.pcCode.visible = ca > 0.01; S.pcCode.material.opacity = ca * (1 - 0.75 * dim); S.pcCode.position.set(O.x, 2.0 + 0.1 * Math.sin(t * 2), 0.3); S.pcCode.scale.setScalar(1 - 0.35 * dim); S.pcCode.lookAt(cam.position);
  const u = eio(prog(t, t0, 4)); cam.position.set(O.x, lerp(2.8, 3.2, u), lerp(9.6, 8.6, u)); cam.lookAt(O.x, 1.0, 0);
}

// ---------------------------------------------------------------- 15 · del electrón a la aplicación (zoom continuo)
function buildZoom() {
  const Z = zone('zoom', 1400);
  // portátil (escala 1) con app en pantalla
  const lap = new THREE.Group(); Z.add(lap);
  const base = rbox(3.2, 0.12, 2.2, new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.3, metalness: 0.75, transparent: true }), 0.06); lap.add(base); S.lapBase = base;
  const lid = new THREE.Group(); lid.position.set(0, 0.06, -1.1); lid.rotation.x = -0.25; lap.add(lid); { const lb = rbox(3.2, 2.1, 0.08, clay(C.clayL, 0.4), 0.06); lb.position.set(0, 1.05, 0); lid.add(lb); }
  const app = canvasTex(900, 600, (g, w, h) => { g.fillStyle = '#121418'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff5a1f'; rr(g, 40, 40, 300, 60, 30); g.fill(); g.fillStyle = '#fff'; g.font = '800 34px Inter'; g.fillText('mi app', 80, 82); for (let i = 0; i < 3; i++) { g.fillStyle = '#23262c'; rr(g, 40, 140 + i * 140, w - 80, 110, 24); g.fill(); g.fillStyle = ['#ff6b5e', '#3a3cff', '#9fb6d6'][i]; g.beginPath(); g.arc(110, 195 + i * 140, 32, 0, 7); g.fill(); g.fillStyle = '#d0d0d0'; rr(g, 170, 170 + i * 140, 400, 22, 11); g.fill(); g.fillStyle = '#6a6e78'; rr(g, 170, 208 + i * 140, 260, 18, 9); g.fill(); } });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.95), new THREE.MeshBasicMaterial({ map: app })); scr.position.set(0, 1.05, 0.045); lid.add(scr);
  // teclado y panel táctil (se desvanecen al «abrir» el portátil con el zoom)
  S.lapKeys = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.0), new THREE.MeshStandardMaterial({ map: keysTex(), roughness: 0.6, transparent: true }));
  S.lapKeys.rotation.x = -Math.PI / 2; S.lapKeys.position.set(0, 0.062, -0.35); S.lapKeys.renderOrder = 5; lap.add(S.lapKeys);
  S.lapPad = rbox(1.0, 0.004, 0.6, new THREE.MeshStandardMaterial({ color: 0x4a4e55, roughness: 0.35, transparent: true }), 0.002); S.lapPad.position.set(0, 0.061, 0.62); S.lapPad.renderOrder = 5; lap.add(S.lapPad);
  // placa base (inspirada en una real: zócalo con ventilador, ranuras de RAM, PCI y AGP, chips QFP, condensadores, pila, conectores)
  const board = new THREE.Group(); board.position.set(0, -0.01, 0.2); board.scale.setScalar(0.12); lap.add(board);
  board.add(rbox(4, 0.1, 3, clay(0x1f5a3a, 0.6), 0.04));
  const pcb = canvasTex(2000, 1500, (g, w, h) => { g.fillStyle = '#1f5a3a'; g.fillRect(0, 0, w, h); g.lineCap = 'round';
    for (let i = 0; i < 420; i++) { g.strokeStyle = hash(i * 13) < 0.7 ? 'rgba(120,190,120,.55)' : 'rgba(217,164,65,.8)'; g.lineWidth = 2 + hash(i) * 3; g.beginPath(); let x = hash(i * 3) * w, y = hash(i * 5) * h; g.moveTo(x, y); for (let k = 0; k < 3; k++) { if ((i + k) % 2) x += (hash(i * 7 + k) - 0.5) * 300; else y += (hash(i * 11 + k) - 0.5) * 240; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 260; i++) { g.fillStyle = '#d6dcd2'; g.globalAlpha = 0.7; g.fillRect(hash(i * 17) * w, hash(i * 19) * h, 14 + hash(i) * 26, 3); g.fillRect(hash(i * 17) * w, hash(i * 19) * h + 10, 3, 10); }
    g.globalAlpha = 1; g.font = '700 26px Inter'; g.fillStyle = '#e6ece2'; ['CPU', 'DIMM1', 'DIMM2', 'DIMM3', 'DIMM4', 'AGP', 'PCI1', 'PCI2', 'PCI3', 'IDE1', 'IDE2', 'BAT', 'ATX', 'J12', 'R105', 'C73'].forEach((s, i) => g.fillText(s, hash(i * 23) * (w - 120), 40 + hash(i * 29) * (h - 60)));
    for (const [x, y] of [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40], [w / 2, 60]]) { g.fillStyle = '#c9b27a'; g.beginPath(); g.arc(x, y, 22, 0, 7); g.fill(); g.fillStyle = '#0d1a12'; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); } });
  const pcbM = new THREE.Mesh(new THREE.PlaneGeometry(3.95, 2.95), new THREE.MeshStandardMaterial({ map: pcb, roughness: 0.45 })); pcbM.rotation.x = -Math.PI / 2; pcbM.position.y = 0.051; board.add(pcbM);
  const put = (m, x, y, z) => { m.position.set(x, 0.05 + y, z); board.add(m); return m; };
  const slot = (len, col, x, z, along = 'z') => { const g = new THREE.Group(); const b = rbox(along === 'z' ? 0.09 : len, 0.1, along === 'z' ? len : 0.09, clay(col, 0.5), 0.015); g.add(b); const gr = new THREE.Mesh(new THREE.BoxGeometry(along === 'z' ? 0.02 : len * 0.94, 0.01, along === 'z' ? len * 0.94 : 0.02), clay(0x111111)); gr.position.y = 0.05; g.add(gr); for (const s of [-1, 1]) { const c = rbox(0.11, 0.14, 0.05, clay(col, 0.5), 0.01); if (along === 'z') c.position.set(0, 0.02, s * len / 2); else { c.rotation.y = Math.PI / 2; c.position.set(s * len / 2, 0.02, 0); } g.add(c); } return put(g, x, 0.05, z); };
  const qfp = (s, x, z, txt) => { const g = new THREE.Group(); g.add(rbox(s, 0.06, s, clay(0x15161a, 0.35), 0.01)); const pm = clay(0xc9ccd2, 0.3); for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(s * 0.86, 0.012, 0.06), pm); p.position.set(0, -0.02, s / 2 + 0.03); const r = new THREE.Group(); r.rotation.y = k * Math.PI / 2; r.add(p); g.add(r); }
    if (txt) { const l = label(txt, { size: 40, w: s * 0.7, color: '#9aa0a8', weight: 600 }); l.rotation.x = -Math.PI / 2; l.position.y = 0.032; g.add(l); } return put(g, x, 0.03, z); };
  // ventilador del procesador
  { const g = new THREE.Group(); const hs = rbox(0.85, 0.22, 0.85, clay(0x8a8e95, 0.35), 0.02); hs.position.y = 0.11; g.add(hs); const fr = rbox(0.78, 0.14, 0.78, clay(0x141518, 0.5), 0.05); fr.position.y = 0.29; g.add(fr);
    S.fan = new THREE.Group(); S.fan.position.y = 0.37; g.add(S.fan); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 28), new THREE.MeshStandardMaterial({ color: 0x3d8fd8, roughness: 0.5 })); S.fan.add(hub);
    for (let k = 0; k < 7; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, 0.1), clay(0x1d1e22, 0.5)); bl.position.set(Math.cos(k / 7 * Math.PI * 2) * 0.24, 0, Math.sin(k / 7 * Math.PI * 2) * 0.24); bl.rotation.set(0.4, -k / 7 * Math.PI * 2, 0); S.fan.add(bl); }
    const cw = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.37, 40), clay(0x0a0a0c)); cw.rotation.x = -Math.PI / 2; cw.position.y = 0.365; g.add(cw); put(g, -1.4, 0, -0.95); }
  // RAM (blancas), AGP (marrón) y PCI (crema)
  [-1.22, -1.09, -0.96, -0.83].forEach(x => slot(1.7, 0xefe8d8, x, 0.45));
  slot(1.6, 0x6b3a22, -0.66, 0.5);
  [-1.32, -1.12, -0.92].forEach(z => slot(1.5, 0xe8d9b5, 1.05, z, 'x'));
  // chips
  qfp(0.55, 1.05, 0.05, 'NEC'); qfp(0.42, 0.95, 0.75, 'KOREA'); qfp(0.32, 1.65, 0.45); qfp(0.28, -0.05, -1.1);
  // pila de botón
  { const g = new THREE.Group(); const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 32), clay(0x2a2c31, 0.4)); g.add(hb); const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 32), new THREE.MeshStandardMaterial({ color: 0x3b8fe0, roughness: 0.35 })); cell.position.y = 0.03; g.add(cell); put(g, 0.45, 0.02, 1.15); }
  // conectores IDE (negros) y de alimentación ATX (blanco)
  for (const z of [1.05, 1.3]) { const c = rbox(0.9, 0.12, 0.17, clay(0x141518, 0.5), 0.01); put(c, -0.05, 0.06, z); const pins = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.08), new THREE.MeshBasicMaterial({ map: canvasTex(400, 40, (g, w, h) => { g.fillStyle = '#0c0d10'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9b27a'; for (let i = 0; i < 20; i++) for (let j = 0; j < 2; j++) g.fillRect(8 + i * 19.5, 8 + j * 16, 6, 6); }) })); pins.rotation.x = -Math.PI / 2; put(pins, -0.05, 0.121, z); }
  { const c = rbox(0.62, 0.15, 0.22, clay(0xf2efe8, 0.5), 0.01); put(c, 1.45, 0.075, 1.25); const holes = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.17), new THREE.MeshBasicMaterial({ map: canvasTex(320, 100, (g, w, h) => { g.fillStyle = '#f2efe8'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a3226'; for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) g.fillRect(10 + i * 31, 14 + j * 44, 22, 28); }) })); holes.rotation.x = -Math.PI / 2; put(holes, 1.45, 0.151, 1.25); }
  // condensadores electrolíticos
  const capM = clay(0xb8bcc4, 0.3), capT = clay(0x8c3a2e, 0.5);
  [[-0.85, -1.35], [-0.75, -0.55], [-1.85, -0.3], [-1.85, 0.0], [-1.6, 0.25], [-0.45, -0.6], [-0.4, 0.7], [-0.45, 1.3], [0.55, -0.55], [0.6, 0.55], [1.55, -0.65], [1.85, -0.2], [1.85, 0.95], [0.9, 1.3], [-1.85, 1.3], [-1.6, 1.3], [0.1, 0.75], [-0.5, -1.35]].forEach(([x, z], i) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.17, 16), capM); put(c, x, 0.085, z); const top = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), capT); top.rotation.x = -Math.PI / 2; put(top, x, 0.171, z); });
  // componentes SMD pequeños
  for (let i = 0; i < 70; i++) { const x = (hash(i * 31) - 0.5) * 3.7, z = (hash(i * 37) - 0.5) * 2.7; if (Math.hypot(x, z) < 0.65) continue; if (x < -0.55 && z > -0.45) continue; if (x > 0.25 && z < -0.8) continue; const c = rbox(0.1 + hash(i) * 0.08, 0.03, 0.06, clay(i % 3 ? 0x15161a : 0x6b5a3a, 0.4), 0.005); put(c, x, 0.015, z); }
  // puertos traseros
  for (let k = 0; k < 4; k++) { const p = rbox(0.22, 0.2, 0.3, clay(0xb8bcc4, 0.3), 0.02); put(p, 1.85, 0.1, -0.05 + k * 0.3); }
  // chip (escala 0.01) en el centro de la placa
  const chip = new THREE.Group(); chip.position.set(0, 0.15, 0); board.add(chip); chip.add(rbox(1.0, 0.12, 1.0, clay(0x2a2c31, 0.3), 0.03));
  const die = canvasTex(2048, 2048, (g, w, h) => { g.fillStyle = '#1c2b52'; g.fillRect(0, 0, w, h);
    for (let bx = 0; bx < 8; bx++) for (let by = 0; by < 8; by++) { const x0 = bx * 256, y0 = by * 256; g.fillStyle = ['#2a3f78', '#3a2e5e', '#24456a'][(bx + by) % 3]; g.fillRect(x0 + 8, y0 + 8, 240, 240);
      for (let i = 0; i < 40; i++) { const q = bx * 97 + by * 31 + i; g.fillStyle = hash(q) < 0.5 ? '#e0b45a' : (hash(q * 2) < 0.5 ? '#ff7a45' : '#9fb6d6'); g.fillRect(x0 + 16 + hash(q * 3) * 220, y0 + 16 + hash(q * 5) * 220, 4 + hash(q * 7) * 40, 3 + (i % 3)); } }
    g.strokeStyle = '#e0b45a'; g.lineWidth = 6; for (let k = 0; k <= 8; k++) { g.beginPath(); g.moveTo(k * 256, 0); g.lineTo(k * 256, h); g.moveTo(0, k * 256); g.lineTo(w, k * 256); g.stroke(); } });
  const dieM = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: die })); dieM.rotation.x = -Math.PI / 2; dieM.position.y = 0.065; chip.add(dieM);
  // transistor (escala 0.001) y electrón
  const tr = new THREE.Group(); tr.position.set(0.02, 0.07, 0.01); tr.scale.setScalar(0.02); chip.add(tr);
  tr.add(rbox(1, 0.3, 0.6, clay(C.orange, 0.4), 0.05)); const gate = rbox(0.3, 0.4, 0.6, clay(C.blue, 0.4), 0.05); gate.position.y = 0.3; tr.add(gate);
  S.electron = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); tr.add(S.electron);
  S.eGlow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: C.orange, transparent: true, opacity: 0.4 })); tr.add(S.eGlow);
  S.tr = tr; S.zLabels = [['electrón', 0.002], ['transistor', 0.02], ['chip', 0.15], ['placa', 1.0], ['aplicación', 6]].map(([n, s]) => { const l = label(n, { size: 70, w: 1, pill: true }); Z.add(l); l.userData.s = s; return l; });
  lights(Z, 1400); Z.add(new THREE.HemisphereLight(0xbfd0ff, 0x2a1d16, 1.6)); Z.add(floorGrid(80, 80));
}
function zoomAt(t) {
  const O = zones.zoom.position, t0 = ZT.find(z => z[0] === 'zoom')[1];
  S.fan.rotation.y = t * 9;
  const a = (t - t0) * 7; S.electron.position.set(Math.cos(a) * 0.45, 0.2, Math.sin(a) * 0.3); S.eGlow.position.copy(S.electron.position);
  const tw = S.tr.getWorldPosition(v3(0, 0, 0));
  // distancia logarítmica: del electrón (muy cerca) al portátil completo
  const k = eio(prog(t, K.electron - 0.25, K.aplicacion - K.electron + 0.9));
  const d = Math.exp(lerp(Math.log(0.0025), Math.log(9), k));
  const tgt = tw.clone().lerp(v3(O.x, 0.9, -0.3), eio(clamp((k - 0.55) / 0.45)));
  cam.position.copy(tgt).add(v3(0, 0.62, 0.78).normalize().multiplyScalar(d)); cam.lookAt(tgt);
  const ko = clamp((d - 1.0) / 1.4); S.lapKeys.material.opacity = ko; S.lapPad.material.opacity = ko; S.lapKeys.visible = S.lapPad.visible = ko > 0.01; S.lapBase.material.opacity = ko; S.lapBase.visible = ko > 0.01; S.lapBase.material.depthWrite = ko > 0.99;
  S.zLabels.forEach((l, i) => { const s = l.userData.s; const a2 = Math.max(0, 1 - Math.abs(Math.log(d / (s * 2.5))) / 0.9) * prog(t, K.electron - 0.2, 0.3); l.visible = a2 > 0.02; l.material.opacity = a2; l.scale.setScalar(s * 0.32); l.position.copy(tgt).add(v3(0, s * 0.55, 0)); l.lookAt(cam.position); });
}

// ---------------------------------------------------------------- reparto de escenas y fotograma
const RUN = { hook: t => hookAt(t, false), ppl: pplAt, box: boxAt, yrs: yrsAt, hall: hallAt, flip: flipAt, room: roomAt, cls: clsAt, phys: physAt, calc: calcAt, alg: algAt, prog: progAt, asm: asmAt, puz: puzAt, zoom: zoomAt, end: t => hookAt(t, true) };
function zoneAt(t) { let z = ZT[0]; for (const q of ZT) if (t >= q[1]) z = q; return z; }
function frame(t) {
  const [name, t0] = zoneAt(t), zname = name === 'end' ? 'hook' : name;
  for (const k in zones) zones[k].visible = k === zname;
  scene.background = zname === 'alg' ? BLACK : sky; scene.fog.color.set(zname === 'alg' ? 0x000000 : BG); scene.environmentIntensity = zname === 'alg' ? 0 : zname === 'room' ? 0.3 : 0.55;
  RUN[name](t);
  // barrido con desenfoque en cada cambio de escena (fluidez, sin cortes secos)
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
    abandono: at('abandono'), cifra: at('cifra'), ingenieria: at('ingenieria'), y: at('=y', 1), final: at('final'), sobre: at('sobre'), auditoria: at('auditoria'),
    seis: at('seis'), porque: at('porque'), noes: at('parece'), imaginas: at('imaginas'), cafe: at('cafe'), codigo: at('codigo'), noche: at('noche'),
    si: at('=si', 1), fisica: at('fisica'), campos: at('campos'), circuitos: at('circuitos'), cable: at('cable'), conduce: at('conduce'), otro: at('=otro'),
    despues: at('despues'), limites: at('limites'), derivadas: at('derivadas'), integrales: at('integrales'), algebra: at('algebra'), matrices: at('matrices'),
    giran: at('giran'), estiran: at('estiran'), aplastan: at('aplastan'), programacion: at('programacion'), variables: at('variables'), bucles: at('bucles'),
    funciones: at('funciones'), ensamblador: at('ensamblador'), procesador: at('procesador'), registro: at('registro'), cada: at('=cada', 2), encajan: at('encajan'),
    entonces: at('entonces'), programar: at('programar'), igual: at('igual'), pero2: at('=pero', 3), electron: at('electron'), aplicacion: at('aplicacion'),
    muchisimo: at('muchisimo'), tu: at('=tu', 1),
  };
  K.y = at('=y', 1);
  ZT.push(['hook', -1], ['ppl', at('=es') - 0.1], ['box', at('=y', 1) - 0.1], ['yrs', K.sobre - 0.1], ['hall', at('=pero', 1) - 0.1], ['flip', K.porque - 0.1],
    ['room', K.imaginas - 0.1], ['cls', at('=si', 2) - 0.25], ['phys', K.campos - 0.1], ['calc', K.despues - 0.1], ['alg', K.algebra - 0.1], ['prog', K.programacion - 0.1],
    ['asm', at('=y', 6) - 0.1], ['puz', K.cada - 0.1], ['zoom', K.pero2 - 0.1], ['end', at('=tu', 1) - 0.1]);
  ZT.sort((a, b) => a[1] - b[1]);
  ENV = await (await fetch('../env.json')).json();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; }
  buildHook(); buildGridPeople(); buildBox(); buildYears(); buildHall(); buildFlip(); buildRoom(); buildClass(); buildPhys(); buildCalc(); buildAlg(); buildProg(); buildAsm(); buildPuzzle(); buildZoom();
  window.ZT = ZT; window.K = K;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
