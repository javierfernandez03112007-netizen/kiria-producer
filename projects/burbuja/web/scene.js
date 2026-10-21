// «Ordenamiento burbuja» — arriba un monitor con el código C++ (línea activa, array y variables) y abajo barras
// de plástico brillante en el espacio que se comparan e intercambian al ritmo de timeline.json.
// window.renderAt(t) dibuja el instante t.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { W, H, clamp, prog, lerp, eo, eio } from './lib.js';

// ---------------------------------------------------------------- render: dos vistas (monitor arriba, barras abajo) + post
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const post = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, vig: { value: 0.28 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `uniform sampler2D tA; uniform float vig; varying vec2 vUv;
    void main(){ vec3 a=texture2D(tA, vUv).rgb; vec2 d=(vUv-.5)*vec2(0.5625,1.0); a*=1.0-vig*smoothstep(0.3,0.85,length(d)*1.6);
      a*=1.15; a=clamp((a*(2.51*a+0.03))/(a*(2.43*a+0.59)+0.14),0.,1.); a=pow(a, vec3(1.0/2.2));
      float lu=dot(a,vec3(0.2126,0.7152,0.0722)); a=clamp(mix(vec3(lu),a,1.2),0.,1.); gl_FragColor=vec4(a,1.0);} `,
  depthTest: false,
});
const quadScene = new THREE.Scene(); quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const hash = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const scene = new THREE.Scene();
scene.background = (() => { const c = document.createElement('canvas'); c.width = 4096; c.height = 2048; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 2048); gr.addColorStop(0, '#04060d'); gr.addColorStop(0.5, '#0a1022'); gr.addColorStop(1, '#05070e'); g.fillStyle = gr; g.fillRect(0, 0, 4096, 2048);
  for (let i = 0; i < 9; i++) { const x = hash(i * 31) * 4096, y = 500 + hash(i * 17) * 1000, r = 300 + hash(i * 7) * 600, rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, ['rgba(60,80,170,.22)', 'rgba(40,110,170,.2)', 'rgba(90,50,140,.16)'][i % 3]); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 3000; i++) { const b = hash(i * 1.7); g.fillStyle = `rgba(${210 + 45 * hash(i)},${220 + 35 * hash(i * 2)},255,${0.15 + b * b * 0.65})`; const s = b > 0.97 ? 3 : b > 0.85 ? 2 : 1; g.fillRect(hash(i * 3.3) * 4096, hash(i * 5.1) * 2048, s, s); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; return t; })();
const camTop = new THREE.PerspectiveCamera(36, W / (H / 2), 0.05, 400), camBot = new THREE.PerspectiveCamera(36, W / (H / 2), 0.05, 400);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
function canvasTex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { c, g: c.getContext('2d') }; return t; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function rbox(w, h, d, m, r = 0.06) {   // caja redondeada de medida exacta
  const rz = Math.min(r, d * 0.45), b = Math.min(r * 0.9, rz, w * 0.45, h * 0.45); w -= 2 * b; h -= 2 * b; r = Math.max(0.0001, Math.min(r - b, w * 0.5, h * 0.5));
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.0005, d - 2 * rz), bevelEnabled: true, bevelSize: b, bevelThickness: rz, bevelSegments: 4, curveSegments: 8 });
  g.translate(0, 0, -Math.max(0.0005, d - 2 * rz) / 2); const m2 = new THREE.Mesh(g, m); m2.castShadow = true; m2.receiveShadow = true; return m2;
}

// ---------------------------------------------------------------- datos
let TL, ARR, N, STEPS, END;
// cada línea: lista de [texto, clase]
const LINES = [
  [['void ', 'kw'], ['burbuja', 'fn'], ['(', 'p'], ['int', 'kw'], [' v[], ', 'p'], ['int', 'kw'], [' n) {', 'p']],
  [['  for ', 'kw'], ['(', 'p'], ['int', 'kw'], [' i = ', 'p'], ['0', 'num'], ['; i < n - ', 'p'], ['1', 'num'], ['; i++) {', 'p']],
  [['    for ', 'kw'], ['(', 'p'], ['int', 'kw'], [' j = ', 'p'], ['0', 'num'], ['; j < n - ', 'p'], ['1', 'num'], [' - i; j++) {', 'p']],
  [['      if ', 'kw'], ['(v[j] > v[j + ', 'p'], ['1', 'num'], [']) {', 'p']],
  [['        int', 'kw'], [' aux = v[j];', 'p']],
  [['        v[j] = v[j + ', 'p'], ['1', 'num'], ['];', 'p']],
  [['        v[j + ', 'p'], ['1', 'num'], ['] = aux;', 'p']],
  [['      }', 'p']],
  [['    }', 'p']],
  [['  }', 'p']],
  [['}', 'p']],
];
const COL = { kw: '#c586ff', fn: '#ffd866', num: '#ff9e64', p: '#e6edf3' };

// ---------------------------------------------------------------- monitor (arriba)
const MON = new THREE.Group(); MON.position.set(100, 0, 0); scene.add(MON);
const screenTex = canvasTex(1600, 1000);
{
  const bez = rbox(3.6, 2.36, 0.12, new THREE.MeshPhysicalMaterial({ color: 0x15171c, roughness: 0.35, metalness: 0.4, clearcoat: 0.6 }), 0.07); MON.add(bez);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.44, 2.15), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })); scr.position.z = 0.062; MON.add(scr);
  const neck = rbox(0.3, 1.4, 0.1, new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.3, metalness: 0.9 }), 0.04); neck.position.set(0, -1.6, -0.12); MON.add(neck);
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), new THREE.MeshBasicMaterial({ color: 0x3cff9a })); led.position.set(1.62, -1.11, 0.062); MON.add(led);
}
function drawScreen(t, st) {
  const g = screenTex.userData.g, w = 1600, h = 1000;
  g.fillStyle = '#0d1117'; g.fillRect(0, 0, w, h);
  // barra de título y pestaña
  g.fillStyle = '#161b22'; g.fillRect(0, 0, w, 64); [['#ff5f57', 32], ['#febc2e', 62], ['#28c840', 92]].forEach(([c, x]) => { g.fillStyle = c; g.beginPath(); g.arc(x, 32, 10, 0, 7); g.fill(); });
  g.fillStyle = '#0d1117'; rr(g, 130, 12, 260, 52, 10); g.fill(); g.fillStyle = '#e6edf3'; g.font = '700 26px Mono'; g.textBaseline = 'middle'; g.fillText('burbuja.cpp', 160, 40);
  g.fillStyle = '#58a6ff'; g.fillRect(130, 60, 260, 4);
  // código (se escribe rápido en la intro)
  const lh = 50, x0 = 96, y0 = 108, typed = Math.floor(clamp((t - 0.2) / 1.6) * 400);
  let budget = typed;
  const act = st.line, actA = st.lineA;
  if (act >= 0) { g.fillStyle = `rgba(46,230,140,${0.16 * actA})`; g.fillRect(0, y0 + act * lh - lh / 2, w, lh); g.fillStyle = `rgba(46,230,140,${actA})`; g.fillRect(0, y0 + act * lh - lh / 2, 8, lh); }
  g.font = '700 33px Mono'; g.textBaseline = 'middle';
  LINES.forEach((ln, i) => {
    g.fillStyle = i === act ? '#2ee68c' : '#4d5566'; g.textAlign = 'right'; g.fillText(String(i + 1), 62, y0 + i * lh); g.textAlign = 'left';
    let x = x0;
    for (const [s, c] of ln) { if (budget <= 0) break; const part = s.slice(0, budget); budget -= s.length; g.fillStyle = COL[c]; g.fillText(part, x, y0 + i * lh); x += g.measureText(s).width; }
  });
  // variables
  g.font = '700 30px Mono';
  const vx = 1010; g.fillStyle = '#161b22'; rr(g, vx, 120, 540, 150, 18); g.fill();
  g.fillStyle = '#8b949e'; g.fillText('variables', vx + 26, 152);
  g.fillStyle = '#e6edf3'; g.fillText(`i = ${st.i < 0 ? '-' : st.i}`, vx + 26, 210); g.fillText(`j = ${st.j < 0 ? '-' : st.j}`, vx + 220, 210); g.fillText(`n = ${N}`, vx + 400, 210);
  // array con las celdas animadas
  const cw = 132, cx0 = (w - cw * N) / 2, cy = 735, arrA = clamp((t - 1.2) / 0.5);
  g.globalAlpha = arrA;
  g.fillStyle = '#8b949e'; g.font = '700 28px Mono'; g.textAlign = 'left'; g.fillText('int v[10] =', cx0, cy - 80);
  st.cells.forEach(c => {
    const x = cx0 + c.x * cw, sel = c.sel, srt = c.sorted;
    g.fillStyle = sel > 0 ? `rgba(30,200,110,${0.25 + 0.55 * sel})` : srt ? 'rgba(88,166,255,.22)' : '#161b22'; rr(g, x + 6, cy - 46 - c.lift * 22, cw - 12, 92, 14); g.fill();
    g.strokeStyle = sel > 0 ? '#2ee68c' : srt ? '#58a6ff' : '#30363d'; g.lineWidth = sel > 0 ? 5 : 3; rr(g, x + 6, cy - 46 - c.lift * 22, cw - 12, 92, 14); g.stroke();
    g.fillStyle = sel > 0 ? '#eafff3' : '#e6edf3'; g.font = '700 46px Mono'; g.textAlign = 'center'; g.fillText(String(c.v), x + cw / 2, cy + 2 - c.lift * 22);
  });
  g.font = '700 24px Mono'; g.fillStyle = '#6e7681'; for (let k = 0; k < N; k++) g.fillText(`[${k}]`, cx0 + k * cw + cw / 2, cy + 76);
  // estado
  g.textAlign = 'center'; g.font = '700 34px Mono'; g.fillStyle = st.msgCol; g.fillText(st.msg, w / 2, 920);
  g.globalAlpha = 1; g.textAlign = 'left';
  screenTex.needsUpdate = true;
}

// ---------------------------------------------------------------- barras (abajo)
const BARS = new THREE.Group(); scene.add(BARS);
const GAP = 0.86, BW = 0.62, BD = 0.62, UNIT = 0.36;
const blueM = () => new THREE.MeshPhysicalMaterial({ color: 0x46b4ff, roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.3, sheenColor: 0xbfe8ff, emissive: 0x0a3a66, emissiveIntensity: 0.12 });
const GREEN = new THREE.Color(0x19e37c), BLUE = new THREE.Color(0x46b4ff), GEM = new THREE.Color(0x0b6a3a), BEM = new THREE.Color(0x0a3a66);
let bars = [];
function numTex(v) { const t = canvasTex(256, 256), g = t.userData.g; g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, 256, 256); g.fillStyle = '#ffffff'; g.font = '800 150px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; g.fillText(String(v), 128, 138); t.needsUpdate = true; return t; }
function buildBars() {
  // suelo reflectante oscuro + sombras
  const refl = new Reflector(new THREE.PlaneGeometry(40, 40), { textureWidth: 1024, textureHeight: 1024, color: 0x6f7c99 }); refl.rotation.x = -Math.PI / 2; BARS.add(refl);
  const dim = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0x050812, transparent: true, opacity: 0.88 })); dim.rotation.x = -Math.PI / 2; dim.position.y = 0.002; BARS.add(dim);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.55 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.004; sh.receiveShadow = true; BARS.add(sh);
  const grid = new THREE.GridHelper(40, 40, 0x24345e, 0x24345e); grid.material.transparent = true; grid.material.opacity = 0.35; grid.position.y = 0.006; BARS.add(grid);
  ARR.forEach(v => {
    const g = new THREE.Group(); BARS.add(g); const m = blueM(); const h = v * UNIT;
    const b = rbox(BW, h, BD, m, 0.09); b.position.y = h / 2; g.add(b);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: numTex(v), transparent: true, depthWrite: false })); lab.position.set(0, 0.32, BD / 2 + 0.005); g.add(lab);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 48), new THREE.MeshBasicMaterial({ color: 0x2ee68c, transparent: true, opacity: 0, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; g.add(ring);
    bars.push({ v, g, b, m, ring, h });
  });
  const key = new THREE.SpotLight(0xffffff, 170, 40, 0.55, 0.6, 1.6); key.position.set(-3, 11, 7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.radius = 5; BARS.add(key); BARS.add(key.target);
  const rimL = new THREE.PointLight(0x37c6ff, 40, 16, 1.6); rimL.position.set(-6, 3, -3); BARS.add(rimL);
  const rimR = new THREE.PointLight(0xa45cff, 34, 16, 1.6); rimR.position.set(6, 3.5, -3); BARS.add(rimR);
  const fill = new THREE.PointLight(0xbfdcff, 18, 20, 1.5); fill.position.set(0, 4, 9); BARS.add(fill);
  S.selLight = new THREE.PointLight(0x2ee68c, 0, 4, 1.6); BARS.add(S.selLight);
  // polvo/partículas al chocar
  S.spark = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(60 * 3), 3)), new THREE.PointsMaterial({ color: 0xbff3ff, size: 0.05, transparent: true, opacity: 0, depthWrite: false })); BARS.add(S.spark);
}
const S = {};
const xOf = k => (k - (N - 1) / 2) * GAP;

// ---------------------------------------------------------------- estado en el instante t
function stepAt(t) { let s = null; for (const q of STEPS) { if (t >= q.t0) s = q; else break; } return s; }
function frame(t) {
  const s = stepAt(t), u = s ? clamp((t - s.t0) / (s.t1 - s.t0)) : 0;
  const order = s ? s.arr : ARR, sortedN = s ? s.sorted : 0;
  const st = { line: -1, lineA: 1, i: -1, j: -1, cells: [], msg: '', msgCol: '#8b949e' };
  // posiciones de las barras (por valor) y celdas
  const pos = {}; order.forEach((v, k) => { pos[v] = { x: k, z: 0, y: 0, sel: 0, lift: 0, sq: 1, flash: 0 }; });
  const sortedIdx = k => k >= N - sortedN;
  if (!s) { st.msg = 'ordenamiento burbuja'; st.msgCol = '#58a6ff'; }
  else {
    st.i = s.i; st.j = s.j;
    if (s.kind === 'outer') { st.line = 1; st.lineA = eo(u * 3); st.j = -1; st.msg = `pasada ${s.i + 1}: la mayor sube al final`; st.msgCol = '#58a6ff'; }
    if (s.kind === 'compare' || s.kind === 'swap') {
      const a = order[s.j], b = order[s.j + 1];
      pos[a].sel = pos[b].sel = 1;
      if (s.kind === 'compare') {
        st.line = u < 0.3 ? 2 : 3; st.lineA = 1;
        const hop = Math.sin(Math.PI * clamp(u / 0.45)) * 0.22; pos[a].y = pos[b].y = hop; pos[a].lift = pos[b].lift = hop / 0.22;
        if (u < 0.12) pos[a].sel = pos[b].sel = eo(u / 0.12);
        st.msg = s.swap ? `v[${s.j}] = ${a}  >  v[${s.j + 1}] = ${b}   →  intercambiar` : `v[${s.j}] = ${a}  ≤  v[${s.j + 1}] = ${b}   →  seguir`; st.msgCol = s.swap ? '#ff7b72' : '#8b949e';
      } else {
        st.line = 4 + Math.min(2, Math.floor(u * 3)); st.lineA = 1;
        const k = eio(clamp(u / 0.78)), land = clamp((u - 0.78) / 0.22);
        pos[a].x = s.j + k; pos[b].x = s.j + 1 - k;
        pos[a].z = 0.95 * Math.sin(Math.PI * k); pos[b].z = -0.95 * Math.sin(Math.PI * k);
        pos[a].y = pos[b].y = 0.35 * Math.sin(Math.PI * k);
        const sq = land > 0 ? 1 - 0.12 * Math.sin(Math.PI * land) * (1 - land) : 1; pos[a].sq = pos[b].sq = sq;
        pos[a].lift = pos[b].lift = Math.sin(Math.PI * k);
        st.msg = ['int aux = v[j];', 'v[j] = v[j + 1];', 'v[j + 1] = aux;'][Math.min(2, Math.floor(u * 3))]; st.msgCol = '#2ee68c';
      }
    }
    if (s.kind === 'placed') { st.line = 2; st.lineA = 1 - u * 0.5; const v = order[s.j]; pos[v].flash = Math.sin(Math.PI * u); pos[v].y = 0.25 * Math.sin(Math.PI * clamp(u / 0.6)); st.msg = `${v} ya está en su sitio`; st.msgCol = '#58a6ff'; st.j = -1; }
    if (s.kind === 'done') { st.line = 10; st.lineA = 1; st.msg = '¡array ordenado!'; st.msgCol = '#2ee68c'; st.i = st.j = -1;
      order.forEach((v, k) => { const w = clamp((t - s.t0 - 0.15 - k * 0.09) / 0.35); pos[v].y = 0.4 * Math.sin(Math.PI * w); pos[v].sel = clamp((t - s.t0 - 0.15 - k * 0.09) / 0.2); pos[v].lift = Math.sin(Math.PI * w); }); }
  }
  // intro: caen desde arriba y rebotan
  const drop = k => { const t0 = 0.25 + k * 0.12, p = clamp((t - t0) / 0.42); const fall = (1 - p * p) * 7; const bounce = p >= 1 ? 0.18 * Math.exp(-(t - t0 - 0.42) * 9) * Math.abs(Math.sin((t - t0 - 0.42) * 16)) : 0; return fall + bounce; };
  order.forEach((v, k) => {
    const p = pos[v], B = bars.find(q => q.v === v);
    B.g.position.set(xOf(p.x), p.y + drop(k), p.z);
    B.b.scale.set(1 + (1 - p.sq) * 0.5, p.sq, 1 + (1 - p.sq) * 0.5); B.b.position.y = B.h * p.sq / 2;
    const sel = p.sel, srt = sortedIdx(k) && !(s && s.kind === 'done');
    B.m.color.copy(BLUE).lerp(GREEN, sel); B.m.emissive.copy(BEM).lerp(GEM, sel); B.m.emissiveIntensity = 0.12 + 0.3 * sel + (srt ? 0.3 : 0) + 1.2 * p.flash;
    B.ring.material.opacity = Math.max(0.85 * sel, p.flash); B.ring.material.color.set(p.flash > sel ? 0x58c8ff : 0x2ee68c); B.ring.scale.setScalar(1 + 0.25 * p.flash);
    st.cells.push({ v, x: p.x, sel, sorted: srt, lift: p.lift });
  });
  // luz verde sobre las barras seleccionadas
  if (s && (s.kind === 'compare' || s.kind === 'swap')) { S.selLight.intensity = 9; S.selLight.position.set(xOf(s.j + 0.5), 2.5, 1.4); } else S.selLight.intensity = 0;
  // chispas al aterrizar el intercambio
  const sp = S.spark.geometry.attributes.position.array;
  if (s && s.kind === 'swap' && u > 0.76) { const q = clamp((u - 0.76) / 0.24); for (let k = 0; k < 60; k++) { const a = hash(k) * 6.28, r = 0.2 + q * (0.5 + hash(k * 3)), side = k % 2 ? s.j : s.j + 1; sp[k * 3] = xOf(side) + Math.cos(a) * r; sp[k * 3 + 1] = 0.05 + q * 0.6 * hash(k * 7) * (1 - q); sp[k * 3 + 2] = Math.sin(a) * r * 0.6; } S.spark.material.opacity = 0.9 * (1 - q); S.spark.geometry.attributes.position.needsUpdate = true; } else S.spark.material.opacity = 0;
  drawScreen(t, st);
  // cámaras
  const intro = eio(clamp(t / 2.2)), fx = s && s.j >= 0 ? xOf(s.j + 0.5) * 0.18 : 0;
  S.fx = lerp(S.fx ?? 0, fx, 1);
  camBot.position.set(fx + 0.15 * Math.sin(t * 0.5), lerp(5.2, 4.0, intro) + 0.06 * Math.sin(t * 0.7), lerp(15.5, 12.9, intro)); camBot.lookAt(fx * 0.7, 1.15, 0);
  camTop.position.set(100 + 0.12 * Math.sin(t * 0.35), 0.05 + 0.04 * Math.sin(t * 0.5), lerp(5.6, 4.95, intro)); camTop.lookAt(100, 0.02, 0);
}

window.renderAt = function (t) {
  frame(t);
  // el reflector restaura el render target al terminar: la vista se fija en el propio rtA para que no se pierda
  rtA.scissorTest = true;
  rtA.viewport.set(0, H / 2, W, H / 2); rtA.scissor.set(0, H / 2, W, H / 2); renderer.setRenderTarget(rtA); renderer.render(scene, camTop);
  rtA.viewport.set(0, 0, W, H / 2); rtA.scissor.set(0, 0, W, H / 2); renderer.setRenderTarget(rtA); renderer.render(scene, camBot);
  rtA.scissorTest = false; rtA.viewport.set(0, 0, W, H); rtA.scissor.set(0, 0, W, H);
  post.uniforms.tA.value = rtA.texture; renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  for (const f of [new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '800' }), new FontFace('Mono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' })]) { await f.load(); document.fonts.add(f); }
  TL = await (await fetch('../timeline.json')).json(); ARR = TL.arr; N = ARR.length; STEPS = TL.steps; END = TL.end;
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; }
  buildBars();
  window.END = END; window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
