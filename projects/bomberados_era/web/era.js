// «Tu botella va a 300 bares» — las 10 piezas del equipo de respiración autónomo (ERA), idea de Adrián (Notion «MIÉRCOLES
// 25», con publicidad de Bomberados); 30–40 s. De día, en una calle de verdad (Javi, 25 nov: «vida real»): un edificio en
// llamas, el cordón con curiosos (uno graba con el móvil, otro señala, una vecina en el balcón), la autobomba con otro bombero
// en la bomba y, delante de la puerta, un bombero con su ERA y su compañero. El dron SIGUE AL AIRE: la botella en rayos X (300 bar), el golpe rojo que reventaría los pulmones (y se
// rebobina), el grifo que abre su mano, el manorreductor (300 → 7 bar), la de alta al manómetro y al silbato (⏩ hasta la
// reserva), la de media al pulmoautomático (entra aire solo al inspirar), la máscara, la espaldera y, dentro del humo, un
// bombero en el suelo con el bodyguard pitando hasta que una linterna le encuentra. Al final, las diez a la vez.
// Todo depende solo de t. Motor de guia.js.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ------------------------------------------------------------------ utilidades
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mx = (a, b, k) => a + (b - a) * k;
const sm = (a, b, x) => { const k = cl((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const pr = (t, t0, d) => cl((t - t0) / d);
const e3 = x => { x = cl(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const e5 = x => { x = cl(x); return x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2; };
const eO = x => 1 - Math.pow(1 - cl(x), 3);
const bk = x => { x = cl(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const rnd = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PRX = window.PR || 1;
const W2 = 1080, H2 = 1920, RW = Math.round(W2 * PRX), RH = Math.round(H2 * PRX);

// tiempo deformado (cámara lenta / congelado): keys = [[t, ritmo], ...]; tau(t) = base + ∫ ritmo dt (ritmo interpolado)
function warp(keys, base = 0) {
  return t => {
    let tau = base, pT = keys[0][0], pR = keys[0][1];
    if (t <= pT) return base + (t - pT) * pR;
    for (let i = 1; i < keys.length; i++) {
      const [kt, kr] = keys[i];
      if (t <= kt) { const f = (t - pT) / (kt - pT), r = mx(pR, kr, f); return tau + (t - pT) * (pR + r) / 2; }
      tau += (kt - pT) * (pR + kr) / 2; pT = kt; pR = kr;
    }
    return tau + (t - pT) * pR;
  };
}

// ------------------------------------------------------------------ renderer, cámara, posproceso
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(PRX); renderer.setSize(W2, H2);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.zIndex = 1; document.body.appendChild(renderer.domElement);
cv.style.zIndex = 2;                                    // capa 2D de scene.js, encima

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070a);
scene.fog = new THREE.FogExp2(0x05070a, 0.016);
const cam = new THREE.PerspectiveCamera(30, W2 / H2, 0.02, 120);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.26;

const VQ = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadGeo = new THREE.PlaneGeometry(2, 2);
function quad(mat) { const s = new THREE.Scene(); s.add(new THREE.Mesh(quadGeo, mat)); return s; }
const copyMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null } }, vertexShader: VQ, depthTest: false, depthWrite: false,
  fragmentShader: 'uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tSrc, vUv); }' });
const copyScene = quad(copyMat);
function blit(r, src, dst) { copyMat.uniforms.tSrc.value = src; r.setRenderTarget(dst); r.render(copyScene, quadCam); }

// escena en MSAA ×2 (con su profundidad); el posproceso en objetivos normales
const rtMS = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: 2 });
rtMS.depthTexture = new THREE.DepthTexture(RW, RH); rtMS.depthTexture.type = THREE.UnsignedIntType;
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType }));
composer.renderToScreen = false;
const PASS = (render, swap) => ({ enabled: true, needsSwap: swap, clear: false, renderToScreen: false, setSize() {}, dispose() {}, render });
composer.addPass(PASS((r, w, rb) => { r.setRenderTarget(rtMS); r.clear(); r.render(scene, cam); blit(r, rtMS.texture, rb); }, false));
// profundidad de campo: desenfoque a ½ y ¼ de resolución y mezcla según la distancia al plano de enfoque
const HT = () => ({ type: THREE.HalfFloatType });
const h1 = new THREE.WebGLRenderTarget(RW / 2, RH / 2, HT()), h2 = new THREE.WebGLRenderTarget(RW / 2, RH / 2, HT());
const q1 = new THREE.WebGLRenderTarget(RW / 4, RH / 4, HT()), q2 = new THREE.WebGLRenderTarget(RW / 4, RH / 4, HT());
const blurMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VQ, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
  void main(){ vec4 c = texture2D(tSrc, vUv) * 0.2270;
    c += (texture2D(tSrc, vUv + uDir * 1.3846) + texture2D(tSrc, vUv - uDir * 1.3846)) * 0.3162;
    c += (texture2D(tSrc, vUv + uDir * 3.2308) + texture2D(tSrc, vUv - uDir * 3.2308)) * 0.0703;
    gl_FragColor = c; }` });
const blurScene = quad(blurMat);
function blur(r, src, tmp, w, h, s) {
  blurMat.uniforms.tSrc.value = src.texture; blurMat.uniforms.uDir.value.set(s / w, 0); r.setRenderTarget(tmp); r.render(blurScene, quadCam);
  blurMat.uniforms.tSrc.value = tmp.texture; blurMat.uniforms.uDir.value.set(0, s / h); r.setRenderTarget(src); r.render(blurScene, quadCam);
}
const dofMat = new THREE.ShaderMaterial({ uniforms: { tSharp: { value: null }, tB1: { value: h1.texture }, tB2: { value: q1.texture }, tDepth: { value: rtMS.depthTexture },
  uFocus: { value: 1 }, uAp: { value: 0 }, uNear: { value: 0.02 }, uFar: { value: 120 } }, vertexShader: VQ, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D tSharp, tB1, tB2, tDepth; uniform float uFocus, uAp, uNear, uFar; varying vec2 vUv;
  void main(){
    float d = texture2D(tDepth, vUv).r;
    float z = uNear * uFar / (uFar - d * (uFar - uNear));
    float coc = clamp(uAp * abs(z - uFocus) / max(z, 0.01), 0.0, 1.0);
    vec4 s = texture2D(tSharp, vUv), b1 = texture2D(tB1, vUv), b2 = texture2D(tB2, vUv);
    gl_FragColor = coc < 0.45 ? mix(s, b1, coc / 0.45) : mix(b1, b2, (coc - 0.45) / 0.55);
  }` });
const dofScene = quad(dofMat);
const dof = PASS((r, w, rb) => {
  blit(r, rb.texture, h1); blur(r, h1, h2, RW / 2, RH / 2, 1.0);
  blit(r, h1.texture, q1); blur(r, q1, q2, RW / 4, RH / 4, 1.6);
  dofMat.uniforms.tSharp.value = rb.texture; r.setRenderTarget(w); r.render(dofScene, quadCam);
}, true);
composer.addPass(dof);
const bloom = new UnrealBloomPass(new THREE.Vector2(W2 / 2, H2 / 2), 0.42, 0.35, 1.15);
composer.addPass(bloom);

const accRT = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uW: { value: 1 } }, vertexShader: VQ,
  fragmentShader: 'uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb * uW, 1.0); }',
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthTest: false, depthWrite: false });
const accScene = quad(accMat);
const finMat = new THREE.ShaderMaterial({
  uniforms: { tSrc: { value: null }, uTime: { value: 0 }, uExp: { value: 1 }, uVig: { value: 1 }, uGrain: { value: 0.03 }, uCA: { value: 0.002 },
    uDim: { value: 1 }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: VQ, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D tSrc; uniform float uTime, uExp, uVig, uGrain, uCA, uDim, uFlash; uniform vec3 uFlashCol; varying vec2 vUv;
  vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
  void main(){
    vec2 d = vUv - 0.5; vec2 o = d * uCA;
    vec3 c = vec3(texture2D(tSrc, vUv - o).r, texture2D(tSrc, vUv).g, texture2D(tSrc, vUv + o).b) * uExp;
    c = aces(c);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(c * vec3(0.92, 1.0, 1.07), c * vec3(1.05, 1.0, 0.93), smoothstep(0.15, 0.75, l));   // sombras frías, luces cálidas
    c *= mix(1.0, smoothstep(1.08, 0.3, length(d * vec2(0.92, 1.0))), uVig);
    c = mix(c, uFlashCol, uFlash);
    c *= uDim;
    c = srgb(clamp(c, 0.0, 1.0));
    c += (h(vUv * vec2(1080.0, 1920.0) + fract(uTime * 7.31)) - 0.5) * uGrain;
    gl_FragColor = vec4(c, 1.0);
  }` });
const finScene = quad(finMat);

// ------------------------------------------------------------------ texturas de lienzo
function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); if (o.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = o.aniso || 1; return t;
}
function rrect(x, X, Y, w, h, r) { x.beginPath(); x.roundRect(X, Y, w, h, r); }
function fitText(x, s, maxW, px, fam, w = 400) { let p = px; x.font = `${w} ${p}px ${fam}`; while (x.measureText(s).width > maxW && p > 10) { p -= 4; x.font = `${w} ${p}px ${fam}`; } return p; }
function flameIcon(x, cx, cy, s) {      // llama de pictograma
  x.save(); x.translate(cx, cy); x.scale(s, s);
  x.beginPath(); x.moveTo(0, -60); x.bezierCurveTo(30, -25, 48, 0, 30, 40); x.bezierCurveTo(18, 62, -18, 62, -30, 40);
  x.bezierCurveTo(-46, 8, -20, -8, -10, -30); x.bezierCurveTo(-4, -10, 4, -8, 0, -60); x.fillStyle = '#d62a1e'; x.fill();
  x.beginPath(); x.moveTo(2, -18); x.bezierCurveTo(18, 4, 22, 22, 12, 40); x.bezierCurveTo(4, 52, -14, 50, -18, 36);
  x.bezierCurveTo(-24, 18, -6, 10, 2, -18); x.fillStyle = '#f7a21b'; x.fill(); x.restore();
}
function noiseTex() {                // ruido fractal que se repite (llamas, humo, polvo)
  const N = 256, a = new Float32Array(N * N);
  for (let o = 0, amp = 1, f = 4; o < 5; o++, amp *= 0.5, f *= 2) {
    const gr = []; for (let i = 0; i < f * f; i++) gr.push(rnd(i * 13.7 + o * 101.3));
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const fx = x / N * f, fy = y / N * f, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const s = v => v * v * (3 - 2 * v), G = (i, j) => gr[((j % f) * f + (i % f))];
      a[y * N + x] += mx(mx(G(ix, iy), G(ix + 1, iy), s(tx)), mx(G(ix, iy + 1), G(ix + 1, iy + 1), s(tx)), s(ty)) * amp;
    }
  }
  const t = canvasTex(N, N, (x) => { const im = x.createImageData(N, N); for (let i = 0; i < N * N; i++) { const v = Math.round(cl((a[i] / 1.9 - 0.5) * 1.6 + 0.5) * 255); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } x.putImageData(im, 0, 0); }, { srgb: false });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const NODOF = [];
function titleMesh(lines, wM, opts = {}) {   // rótulo 3D (lienzo): lines = [[texto, px, familia, color], ...]
  const Wc = 1400, Hc = opts.h || 600;
  const tex = canvasTex(Wc, Hc, (x) => {
    if (opts.plate) { rrect(x, 20, 10, Wc - 40, Hc - 20, Hc * 0.18); x.fillStyle = 'rgba(8,8,10,0.62)'; x.fill(); }
    x.textAlign = 'center'; let y = opts.y0 || 0;
    for (const [s, px, fam, col] of lines) {
      y += px * 0.92; fitText(x, s, Wc - 60, px, fam, fam === 'Inter' ? 800 : 400);
      if (col === 'fire') { const gg = x.createLinearGradient(0, y - px * 0.8, 0, y); gg.addColorStop(0, '#fff3b0'); gg.addColorStop(0.55, '#ffb52e'); gg.addColorStop(1, '#ff5a1f'); x.fillStyle = gg; }
      else x.fillStyle = col;
      x.shadowColor = 'rgba(0,0,0,0.7)'; x.shadowBlur = 26; x.fillText(s, Wc / 2, y); x.shadowBlur = 0; y += px * 0.18;
    }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wM, wM * Hc / Wc), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: true, alphaTest: 0.02, fog: false }));
  m.material.color.setScalar(opts.hdr || 1.25); m.renderOrder = 30; m.visible = false; return m;
}

// ------------------------------------------------------------------ llamas: láminas que miran a la cámara (eje vertical) con ruido que sube
let NOISE;
const FLAMES = [];
const FV = `attribute vec3 aOff; attribute vec2 aSize; attribute float aSeed;
uniform vec3 uCam; uniform float uInt, uSX, uSH;
varying vec2 vUv; varying float vSeed;
void main(){
  vec4 wc = modelMatrix * vec4(aOff.x * uSX, aOff.y, aOff.z, 1.0);
  vec3 d = vec3(uCam.x - wc.x, 0.0, uCam.z - wc.z); d = length(d) > 1e-4 ? normalize(d) : vec3(0.0, 0.0, 1.0);
  vec3 rg = vec3(d.z, 0.0, -d.x);
  float h = aSize.y * uSH * (0.12 + 0.88 * uInt);
  vec3 p = wc.xyz + rg * position.x * aSize.x * mix(1.0, uSX, 0.75) * (0.55 + 0.45 * uInt) + vec3(0.0, (position.y + 0.5) * h, 0.0);
  vUv = position.xy + 0.5; vSeed = aSeed;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const FFR = `uniform sampler2D uTex; uniform float uTime, uInt, uBright;
varying vec2 vUv; varying float vSeed;
void main(){
  float t = uTime * (0.85 + 0.3 * vSeed);
  vec2 uv = vUv;
  float n1 = texture2D(uTex, vec2(uv.x * 0.8 + vSeed * 3.1, uv.y * 0.55 - t * 1.0)).r;
  float n2 = texture2D(uTex, vec2(uv.x * 1.7 + vSeed * 7.7, uv.y * 1.2 - t * 1.8)).r;
  float n3 = texture2D(uTex, vec2(uv.x * 3.3 - vSeed * 1.3, uv.y * 2.6 - t * 3.0)).r;
  float n = n1 * 0.55 + n2 * 0.3 + n3 * 0.15;
  float y = uv.y;
  float x = uv.x - 0.5 + (n1 - 0.5) * 0.42 * y + sin(t * 2.1 + vSeed * 6.0) * 0.05 * y;
  float w = mix(0.46, 0.05, pow(y, 0.8));
  float e = abs(x) / w;
  float shape = 1.0 - smoothstep(0.45, 1.0, e + (n - 0.5) * 0.85);
  float top = 1.0 - smoothstep(0.3, 1.0, y + (n - 0.5) * 0.75);
  float f = clamp(shape * top * smoothstep(0.0, 0.08, y), 0.0, 1.0) * smoothstep(0.0, 0.3, uInt);
  if (f < 0.01) discard;
  float heat = f * (1.0 - 0.55 * y) * (1.0 - 0.45 * clamp(e, 0.0, 1.0));
  vec3 col = mix(vec3(0.42, 0.035, 0.008), vec3(1.0, 0.3, 0.035), smoothstep(0.03, 0.3, heat));
  col = mix(col, vec3(1.0, 0.62, 0.2), smoothstep(0.32, 0.68, heat));
  col = mix(col, vec3(1.0, 0.88, 0.62), smoothstep(0.75, 0.98, heat));
  gl_FragColor = vec4(col * f * uBright, f);
}`;
class Flames {
  constructor(list, o = {}) {        // list: [[x, y, z, ancho, alto], ...] (coordenadas del grupo)
    const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.getAttribute('position'));
    const off = new Float32Array(list.length * 3), sz = new Float32Array(list.length * 2), sd = new Float32Array(list.length);
    list.forEach((f, i) => { off.set([f[0], f[1], f[2]], i * 3); sz.set([f[3], f[4]], i * 2); sd[i] = rnd(i * 3.7 + (o.seed || 0)); });
    g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3)); g.setAttribute('aSize', new THREE.InstancedBufferAttribute(sz, 2));
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(sd, 1)); g.instanceCount = list.length;
    this.u = { uTex: { value: NOISE }, uTime: { value: 0 }, uInt: { value: 1 }, uBright: { value: o.bright || 1.6 }, uCam: { value: new THREE.Vector3() }, uSX: { value: 1 }, uSH: { value: 1 } };
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: FV, fragmentShader: FFR, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 12; FLAMES.push(this);
  }
}
function tongues(n, seed, fn) { const L = []; for (let i = 0; i < n; i++) L.push(fn(i, a => rnd(i * 9.31 + seed * 3.3 + a * 1.77))); return L; }

// ------------------------------------------------------------------ partículas (sin estado: posición = f(semilla, tiempo)): humo, chispas, polvo
const PV = `attribute vec4 aSeed;
uniform float uTime, uLife, uRise, uAcc, uSize, uGrow, uTurb, uKill0, uKill1, uOn0, uOn1, uConv, uStretch, uJet, uDisc, uRot, uV0, uDrag, uGrav, uSpreadA, uSpreadB, uSX;
uniform vec3 uOrigin, uExtent, uDir; uniform float uFloor;
varying vec2 vUv; varying float vAge; varying float vA; varying float vSeed;
vec3 h3(float n){ return fract(sin(vec3(n, n + 1.37, n + 2.71) * vec3(127.1, 311.7, 74.7)) * 43758.5453); }
void main(){
  float life = uLife * (0.65 + 0.7 * aSeed.w);
  float tt = uTime - aSeed.x * life;
  float k = floor(tt / life);
  float age = tt - k * life;
  float born = uTime - age;
  float a01 = age / life;
  vec3 r = h3(aSeed.y * 53.1 + k * 7.13 + aSeed.z * 3.7);
  vec3 p; float size;
  if (uJet > 0.5) {
    float d = uV0 / uDrag * (1.0 - exp(-uDrag * age));
    vec3 sd = normalize(cross(uDir, vec3(0.0, 1.0, 0.0)) + vec3(1e-4));
    vec3 u2 = normalize(cross(sd, uDir));
    vec2 q = (r.xy - 0.5) * 2.0; q *= sqrt(r.z + 0.05);
    p = uOrigin + uDir * d + (sd * q.x + u2 * q.y) * (uSpreadA * d + uSpreadB * age);
    p.y += -uGrav * age * age + uRise * age * age;
    float under = max(0.0, uFloor - p.y);
    p.y += under * (1.0 + 0.3 * r.z); p.xz += normalize(vec2(q.x, q.y) + vec2(1e-3)) * under * 1.4;
    size = uSize * (0.2 + uGrow * d + 0.45 * age) * (0.6 + 0.8 * r.z);
  } else {
    vec3 o = (r - 0.5) * 2.0;
    if (uDisc > 0.5) { float an = r.x * 6.2831, rr = sqrt(r.z); o = vec3(cos(an) * rr, o.y, sin(an) * rr); }
    o.x *= uSX;
    p = uOrigin + o * uExtent;
    p.y += uRise * age + uAcc * age * age;
    p.xz = mix(p.xz, uOrigin.xz, clamp(a01 * uConv, 0.0, 0.9));
    float ph = r.x * 6.2831 + aSeed.z * 12.0;
    p.x += uTurb * (sin(age * 5.1 + ph + uTime * 1.7) + 0.5 * sin(age * 11.3 + ph * 1.7)) * a01;
    p.z += uTurb * (cos(age * 4.3 + ph + uTime * 1.3) + 0.5 * cos(age * 9.7 + ph * 2.1)) * a01;
    size = uSize * (0.55 + 0.9 * r.z) * mix(1.0, uGrow, a01);
  }
  float a = smoothstep(0.0, 0.08, a01) * (1.0 - smoothstep(0.5, 1.0, a01));
  a *= 1.0 - smoothstep(uKill0, uKill1, born);
  a *= smoothstep(uOn0, uOn0 + 0.05, born) * (1.0 - smoothstep(uOn1 - 0.05, uOn1, born));
  vA = a; vAge = a01; vSeed = aSeed.y;
  vUv = position.xy + 0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float ang = (aSeed.z - 0.5) * uRot + uTime * 0.25 * (aSeed.w - 0.5) * uRot;
  vec2 c = position.xy;
  c = vec2(c.x * cos(ang) - c.y * sin(ang), c.x * sin(ang) + c.y * cos(ang));
  c.y *= uStretch;
  mv.xy += c * size;
  gl_Position = projectionMatrix * mv;
}`;
const PF = `uniform sampler2D uTex; uniform vec3 uC0, uC1, uC2, uC3; uniform float uOpacity, uTime, uEdge;
varying vec2 vUv; varying float vAge; varying float vA; varying float vSeed;
void main(){
  float n = texture2D(uTex, vUv * 0.6 + vec2(vSeed * 7.0, vSeed * 3.0 - uTime * 0.1)).r;
  float d = length(vUv - 0.5) * 2.0;
  float m = smoothstep(1.0, 0.0, d + (n - 0.5) * uEdge);
  m *= m;
  vec3 col = vAge < 0.33 ? mix(uC0, uC1, vAge / 0.33) : (vAge < 0.66 ? mix(uC1, uC2, (vAge - 0.33) / 0.33) : mix(uC2, uC3, (vAge - 0.66) / 0.34));
  float a = m * vA * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(col * a, a);
}`;
class Parts {
  constructor(n, o) {
    const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.getAttribute('position'));
    const s = new Float32Array(n * 4), sd = o.seed || 1;
    for (let i = 0; i < n; i++) { s[i * 4] = rnd(i * 4.13 + sd); s[i * 4 + 1] = rnd(i * 7.31 + sd * 1.7); s[i * 4 + 2] = rnd(i * 1.97 + sd * 3.1); s[i * 4 + 3] = rnd(i * 5.71 + sd * 0.3); }
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(s, 4)); g.instanceCount = n;
    const C = c => new THREE.Vector3(...c);
    this.u = {
      uTime: { value: 0 }, uLife: { value: o.life || 1 }, uRise: { value: o.rise ?? 1 }, uAcc: { value: o.acc || 0 }, uSize: { value: o.size || 0.2 },
      uGrow: { value: o.grow ?? 1 }, uTurb: { value: o.turb || 0 }, uKill0: { value: 1e9 }, uKill1: { value: 1e9 + 1 }, uOn0: { value: -1e9 }, uOn1: { value: 1e9 },
      uConv: { value: o.conv || 0 }, uStretch: { value: o.stretch || 1 }, uJet: { value: o.jet ? 1 : 0 }, uDisc: { value: o.disc ? 1 : 0 }, uRot: { value: o.rot ?? 6.28 },
      uV0: { value: o.v0 || 6 }, uDrag: { value: o.drag || 2 }, uGrav: { value: o.grav || 0 }, uSpreadA: { value: o.spreadA || 0.15 }, uSpreadB: { value: o.spreadB || 0.2 },
      uSX: { value: 1 }, uFloor: { value: o.floor ?? -1e9 }, uOrigin: { value: V(0, 0, 0) }, uExtent: { value: o.extent ? C(o.extent) : V(0.1, 0.1, 0.1) }, uDir: { value: V(1, 0, 0) },
      uTex: { value: NOISE }, uC0: { value: C(o.c[0]) }, uC1: { value: C(o.c[1]) }, uC2: { value: C(o.c[2]) }, uC3: { value: C(o.c[3]) },
      uOpacity: { value: o.opacity ?? 1 }, uEdge: { value: o.edge ?? 0.9 },
    };
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: PV, fragmentShader: PF, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: o.add ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = o.order || 10;
  }
  at(x, y, z) { this.u.uOrigin.value.set(x, y, z); return this; }
}
const SMOKE_C = [[0.07, 0.065, 0.06], [0.05, 0.048, 0.046], [0.04, 0.04, 0.042], [0.035, 0.035, 0.038]];
const EMBER_C = [[6, 3, 0.9], [4.5, 1.6, 0.35], [2.2, 0.55, 0.1], [0.4, 0.08, 0.02]];
const POWDER_C = [[0.92, 0.89, 0.78], [0.8, 0.77, 0.67], [0.68, 0.66, 0.59], [0.58, 0.57, 0.53]];
function fireSet(group, at, flames, o) {   // llamas + humo + chispas
  const F = new Flames(flames, { seed: o.seed, bright: o.bright });
  const s = new Parts(o.smokeN, { life: 3.2, rise: 0.7, acc: 0.05, size: o.smokeSize, grow: 1.9, turb: 0.3, conv: 0.15, rot: 6.28, opacity: 0.55, c: SMOKE_C, seed: o.seed + 9, extent: o.extent, disc: o.disc, order: 11 });
  const e = new Parts(o.emberN, { life: 2.2, rise: 0.8, acc: 0.3, size: o.emberSize || 0.012, grow: 0.6, turb: 0.4, rot: 0, edge: 0.2, add: true, c: EMBER_C, seed: o.seed + 17, extent: o.extent, disc: o.disc, order: 13 });
  s.at(at.x, at.y + (o.smokeY || 0.9), at.z); e.at(at.x, at.y + 0.2, at.z);
  group.add(F.mesh, s.mesh, e.mesh);
  return { F, s, e };
}

// ------------------------------------------------------------------ materiales
const M = {};
function mats() {
  M.paint = new THREE.MeshPhysicalMaterial({ color: 0xb0121a, roughness: 0.3, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.08 });
  M.chrome = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 1.0, roughness: 0.16 });
  M.black = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.42 });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.72 });
  M.yellow = new THREE.MeshStandardMaterial({ color: 0xf2c218, roughness: 0.4 });
  M.steel = new THREE.MeshStandardMaterial({ color: 0x5a5e66, metalness: 0.85, roughness: 0.45 });
}




// ------------------------------------------------------------------ autobomba, edificio, manguera (de acoplamiento.js)
const HOSE_R = 0.07;
function boxTex(w, h, draw) { const t = canvasTex(w, h, draw, { aniso: 4 }); return t; }
function makeTruck() {
  const g = new THREE.Group();                         // eje local: +X hacia delante, +Z a la derecha; ruedas en y = 0
  const red = M.paint, dark = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.35, 2.1), dark); frame.position.set(-0.2, 0.75, 0); g.add(frame);
  const wheelG = new THREE.CylinderGeometry(0.52, 0.52, 0.38, 32), rimG = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 24);
  for (const x of [2.55, -1.6, -2.85]) for (const z of [-1.05, 1.05]) {
    const w = new THREE.Mesh(wheelG, M.rubber); w.rotation.x = Math.PI / 2; w.position.set(x, 0.52, z); g.add(w);
    const r = new THREE.Mesh(rimG, M.chrome); r.rotation.x = Math.PI / 2; r.position.set(x, 0.52, z); g.add(r);
  }
  const cab = new THREE.Mesh(new RoundedBoxGeometry(1.75, 2.15, 2.5, 4, 0.18), red); cab.position.set(3.15, 1.95, 0); cab.castShadow = true; g.add(cab);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a0f16, roughness: 0.05, metalness: 0.6, clearcoat: 1 });
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.9), glass); ws.rotation.y = Math.PI / 2; ws.position.set(4.035, 2.45, 0); g.add(ws);
  for (const z of [-1.255, 1.255]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), glass); sw.position.set(3.2, 2.45, z); if (z < 0) sw.rotation.y = Math.PI; g.add(sw); }
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 2.5), M.chrome); bumper.position.set(4.05, 0.85, 0); g.add(bumper);
  for (const z of [-0.85, 0.85]) { const hl = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20), new THREE.MeshBasicMaterial({ color: 0xffffff })); hl.material.color.setScalar(2.2); hl.rotation.y = Math.PI / 2; hl.position.set(4.04, 1.25, z); g.add(hl); }
  // caja con persianas de aluminio, banda reflectante y «BOMBEROS»
  const side = boxTex(1600, 512, (x) => {
    x.fillStyle = '#a90f17'; x.fillRect(0, 0, 1600, 512);
    for (let i = 0; i < 3; i++) {            // persianas
      const X = 40 + i * 520; x.fillStyle = '#b9bec6'; x.fillRect(X, 40, 480, 330);
      for (let y = 46; y < 370; y += 14) { x.fillStyle = 'rgba(70,75,85,0.55)'; x.fillRect(X, y, 480, 3); }
      x.fillStyle = '#8b9099'; x.fillRect(X + 200, 330, 80, 22);
    }
    for (let i = 0; i < 40; i++) { x.fillStyle = i % 2 ? '#f2c21a' : '#d61f26'; x.beginPath(); x.moveTo(i * 44, 470); x.lineTo(i * 44 + 30, 400); x.lineTo(i * 44 + 52, 400); x.lineTo(i * 44 + 22, 470); x.fill(); }
    x.fillStyle = '#f2c21a'; x.fillRect(0, 392, 1600, 8); x.fillRect(0, 470, 1600, 8);
  });
  const sideMat = new THREE.MeshPhysicalMaterial({ map: side, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(6.0, 2.1, 2.5, 3, 0.08), [red, red, red, red, sideMat, sideMat]);
  body.position.set(-0.85, 2.0, 0); body.castShadow = true; g.add(body);
  const word = boxTex(1024, 160, (x) => { x.fillStyle = '#ffffff'; x.font = '400 140px Bebas'; x.textAlign = 'center'; x.fillText('BOMBEROS', 512, 132); });
  for (const z of [-1.26, 1.26]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.25), new THREE.MeshBasicMaterial({ map: word, transparent: true })); w.position.set(3.15, 1.35, z * 1.0); if (z < 0) w.rotation.y = Math.PI; g.add(w); }
  // escalera en el techo
  for (const z of [-0.45, 0.45]) { const r = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.08, 0.08), M.chrome); r.position.set(-0.9, 3.2, z); g.add(r); }
  for (let i = 0; i < 14; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.9), M.chrome); r.position.set(-3.5 + i * 0.4, 3.2, 0); g.add(r); }
  // puente de luces azules (parpadean)
  const lbar = [];
  for (const z of [-0.8, 0.8]) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.35, 0.16, 0.7, 2, 0.05), new THREE.MeshBasicMaterial({ color: 0x2a6bff }));
    m.position.set(3.4, 3.1, z * 0.75); g.add(m); lbar.push(m);
  }
  const pl = new THREE.PointLight(0x2f6bff, 0, 0, 2); pl.position.set(3.4, 3.6, 0); g.add(pl);
  // cuadro de la bomba (atrás) con manómetros
  const panel = boxTex(512, 512, (x) => {
    x.fillStyle = '#9aa0a8'; x.fillRect(0, 0, 512, 512);
    for (const [cx, cy, r] of [[90, 90, 42], [200, 90, 42], [310, 90, 42], [420, 90, 42], [140, 230, 34], [256, 230, 34], [372, 230, 34]]) {
      x.fillStyle = '#f4f4f0'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.lineWidth = 7; x.strokeStyle = '#2b2d33'; x.stroke();
      x.strokeStyle = '#d33'; x.lineWidth = 4; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + r * 0.7, cy - r * 0.4); x.stroke();
    }
    for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#d61f26' : '#2b6cd6'; x.fillRect(60 + i * 70, 330, 40, 120); x.fillStyle = '#c9ccd2'; x.fillRect(66 + i * 70, 300, 28, 30); }
  });
  const pp = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.6), new THREE.MeshStandardMaterial({ map: panel, roughness: 0.5, metalness: 0.4 }));
  pp.rotation.y = -Math.PI / 2; pp.position.set(-3.86, 1.85, 0); g.add(pp);
  // racores (salidas a los lados)
  const rac = new THREE.CylinderGeometry(0.09, 0.09, 0.22, 20);
  for (const [x, z] of [[-3.3, -1.3], [-3.3, 1.3], [1.8, -1.3], [1.8, 1.3]]) { const r = new THREE.Mesh(rac, M.chrome); r.rotation.x = Math.PI / 2; r.position.set(x, 0.95, z); g.add(r); }
  g.userData = { lbar, pl };
  return g;
}
function windowsTex(cols, rows, lit, mark) {   // fachada con ventanas (algunas encendidas)
  return canvasTex(cols * 64, rows * 64, (x) => {
    x.fillStyle = '#1a1c22'; x.fillRect(0, 0, cols * 64, rows * 64);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const on = rnd(r * 31.7 + c * 7.3 + lit) < 0.33;
      x.fillStyle = on ? `rgba(255,${190 + Math.round(rnd(r + c) * 40)},120,0.9)` : '#0b0d12';
      x.fillRect(c * 64 + 12, (rows - 1 - r) * 64 + 14, 40, 36);
      if (mark && mark(r, c)) { x.fillStyle = '#ff8a2a'; x.fillRect(c * 64 + 12, (rows - 1 - r) * 64 + 14, 40, 36); }
    }
  }, { aniso: 4 });
}
function building(w, h, d, cols, rows, seed, mark) {
  const tex = windowsTex(cols, rows, seed, mark);
  const em = windowsTex(cols, rows, seed, mark);
  const front = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.8 });
  const plain = new THREE.MeshStandardMaterial({ color: 0x1b1d23, roughness: 0.85 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [plain, plain, plain, plain, front, plain]);
  m.position.y = h / 2; return m;
}
function hoseMesh(pts, r = HOSE_R, color = 0xe9e3d3) {   // manguera + capa de «agua que corre» (luz que avanza por dentro)
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const geo = new THREE.TubeGeometry(curve, Math.max(40, Math.round(curve.getLength() * 8)), r, 12, false);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.65 })); mesh.castShadow = true;
  const fu = { uTime: { value: 0 }, uSpeed: { value: 1 }, uDash: { value: curve.getLength() / 1.1 }, uHead: { value: 0 }, uI: { value: 0 } };
  const flow = new THREE.Mesh(new THREE.TubeGeometry(curve, geo.parameters.tubularSegments, r * 1.3, 12, false), new THREE.ShaderMaterial({
    uniforms: fu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime, uSpeed, uDash, uHead, uI; varying float vU;
      void main(){ float s = fract(vU * uDash - uTime * uSpeed); float a = 0.3 + 0.7 * smoothstep(0.0, 0.2, s) * smoothstep(0.75, 0.35, s);
        a *= smoothstep(uHead, uHead - 0.015, vU) * uI * 0.75; if (a < 0.01) discard; gl_FragColor = vec4(vec3(0.26, 0.66, 1.5) * a, a); }` }));
  flow.renderOrder = 8;
  const idx = geo.index.count;
  return { mesh, flow, fu, idx, curve, len: curve.getLength(), grow(k) { const n = Math.max(0, Math.floor(idx * cl(k) / 6) * 6); geo.setDrawRange(0, n); mesh.visible = n > 0; } };
}
function waterJet(n, o) {
  return new Parts(n, { jet: true, life: o.life || 1.6, v0: o.v0, drag: o.drag || 0.35, size: o.size || 0.08, grow: o.grow ?? 0.25, spreadA: o.spreadA || 0.05,
    spreadB: o.spreadB || 0.08, grav: o.grav ?? 4.9, opacity: o.opacity || 0.55, edge: 1.0, seed: o.seed, order: 14,
    c: [[1.3, 1.5, 1.8], [1.0, 1.2, 1.5], [0.7, 0.85, 1.05], [0.5, 0.6, 0.75]], floor: 0.02 });
}

// ------------------------------------------------------------------ el bombero (de botella.js)
let bottle, airU, glassU, reg;
const BOT = { r: 0.085, len: 0.36 }, BOT_C = V(0, 1.2, 0.27), MAXB = 230, RESB = 60;
const AIR_V = `varying vec3 vP; varying vec3 vN;
void main(){ vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const AIR_F = `uniform sampler2D uTex; uniform float uTime, uLevel, uRes, uResA, uI, uRed, uHalf, uUse;
varying vec3 vP; varying vec3 vN;
void main(){
  float y = (vP.y + uHalf) / (2.0 * uHalf);
  if (y > uLevel) discard;
  float a = atan(vP.z, vP.x);
  float n = texture2D(uTex, vec2(a * 0.32 + uTime * 0.07, y * 1.3 - uTime * 0.22)).r;
  float n2 = texture2D(uTex, vec2(a * 0.6 - uTime * 0.11, y * 2.6 + uTime * 0.09)).r;
  float sw = 0.45 + 0.75 * (n * 0.6 + n2 * 0.4);
  float top = smoothstep(uLevel + 0.001, uLevel - 0.05, y);
  vec3 blue = vec3(0.22, 0.72, 1.6) * sw;
  vec3 red = vec3(1.7, 0.16, 0.07) * sw;
  float inRes = 1.0 - smoothstep(uRes - 0.004, uRes + 0.004, y);
  vec3 col = mix(blue * (1.0 + 0.9 * uUse * (1.0 - inRes)), red, inRes * uResA);
  col = mix(col, red, uRed);
  col += vec3(2.2, 0.6, 0.35) * smoothstep(0.014, 0.0, abs(y - uRes)) * uResA;
  float rim = pow(1.0 - abs(normalize(vN).z), 1.4);
  gl_FragColor = vec4(col * uI * (0.35 + 0.9 * rim) * top, 1.0);
}`;
const GLASS_F = `uniform float uI; uniform vec3 uCol; varying vec3 vP; varying vec3 vN;
void main(){ float f = pow(1.0 - abs(normalize(vN).z), 2.6); gl_FragColor = vec4(uCol * (0.05 + 1.25 * f) * uI, 1.0); }`;
const addMat = (u, fs) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: AIR_V, fragmentShader: fs, transparent: true, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });

function makeFirefighter() {
  const G = new THREE.Group();
  const navy = new THREE.MeshStandardMaterial({ color: 0x1a2130, roughness: 0.84 });
  const jacket = new THREE.MeshStandardMaterial({ color: 0x232c3e, roughness: 0.78 });
  const tape = new THREE.MeshStandardMaterial({ color: 0xe0d96f, roughness: 0.35, metalness: 0.15, emissive: 0x6b6624, emissiveIntensity: 1.0 });
  const tapeS = new THREE.MeshStandardMaterial({ color: 0xd0d4da, roughness: 0.22, metalness: 0.6, emissive: 0x3a3c42, emissiveIntensity: 1.0 });
  const helm = new THREE.MeshPhysicalMaterial({ color: 0xe8be2c, roughness: 0.22, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, parent = G) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m;
  };
  for (const s of [-1, 1]) {
    add(new RoundedBoxGeometry(0.135, 0.13, 0.31, 3, 0.045), M.black, 0.11 * s, 0.065, -0.035);
    add(new THREE.CapsuleGeometry(0.087, 0.58, 6, 16), navy, 0.11 * s, 0.53, 0.0);
    add(new THREE.CylinderGeometry(0.091, 0.091, 0.032, 22, 1, true), tapeS, 0.11 * s, 0.3, 0);
    add(new THREE.CylinderGeometry(0.091, 0.091, 0.032, 22, 1, true), tape, 0.11 * s, 0.35, 0);
  }
  add(new RoundedBoxGeometry(0.52, 0.22, 0.33, 3, 0.07), jacket, 0, 0.9, 0);              // faldón del chaquetón
  add(new RoundedBoxGeometry(0.5, 0.64, 0.31, 4, 0.11), jacket, 0, 1.22, 0);              // torso
  for (const [y, m] of [[0.94, tape], [0.985, tapeS], [1.37, tape]]) add(new RoundedBoxGeometry(0.515, 0.036, 0.325, 2, 0.016), m, 0, y, 0);
  for (const s of [-1, 1]) {
    add(new THREE.SphereGeometry(0.1, 16, 12), jacket, 0.26 * s, 1.47, 0);                 // hombro
    add(new THREE.CapsuleGeometry(0.069, 0.25, 6, 12), jacket, 0.3 * s, 1.3, -0.02, 0.22, 0, 0.13 * s);
    add(new THREE.CapsuleGeometry(0.063, 0.23, 6, 12), jacket, 0.33 * s, 1.04, -0.13, 0.95, 0, 0.05 * s);
    add(new THREE.CylinderGeometry(0.067, 0.067, 0.03, 16, 1, true), tape, 0.335 * s, 0.99, -0.17, 0.95, 0, 0.05 * s);
    add(new THREE.SphereGeometry(0.062, 14, 10), M.black, 0.34 * s, 0.95, -0.25);        // guante
  }
  add(new THREE.CylinderGeometry(0.078, 0.095, 0.13, 18), M.rubber, 0, 1.57, 0);           // cuello (verdugo)
  add(new THREE.SphereGeometry(0.128, 22, 16), M.rubber, 0, 1.67, 0.005);                  // capucha
  add(new THREE.SphereGeometry(0.158, 30, 18, 0, Math.PI * 2, 0, Math.PI / 2), helm, 0, 1.7, 0.012, 0, 0, 0, 1, 1.05, 1.13);   // casco
  add(new THREE.TorusGeometry(0.152, 0.011, 8, 40), helm, 0, 1.7, 0.012, Math.PI / 2, 0, 0, 1, 1.13, 1);
  add(new RoundedBoxGeometry(0.032, 0.05, 0.32, 2, 0.012), helm, 0, 1.86, 0.012);           // cresta
  add(new THREE.CylinderGeometry(0.16, 0.175, 0.13, 22, 1, true, Math.PI * 0.18, Math.PI * 0.64), M.rubber, 0, 1.61, 0.03, 0, -Math.PI / 2, 0);   // cubrenucas
  add(new THREE.SphereGeometry(0.1, 20, 14), M.rubber, 0, 1.62, -0.1, 0, 0, 0, 1.06, 1.25, 0.82);   // máscara
  add(new THREE.SphereGeometry(0.093, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0x0a0c10, roughness: 0.04, metalness: 0.3, clearcoat: 1 }), 0, 1.655, -0.135, 0, 0, 0, 1.0, 1.05, 0.6);
  reg = add(new THREE.CylinderGeometry(0.036, 0.042, 0.075, 18), M.black, 0, 1.55, -0.195, Math.PI / 2, 0, 0);   // regulador
  add(new THREE.TorusGeometry(0.04, 0.007, 8, 20), M.chrome, 0, 1.55, -0.23);
  // espaldera, atalajes, cinturón
  add(new RoundedBoxGeometry(0.31, 0.64, 0.05, 3, 0.02), M.black, 0, 1.2, 0.175);
  for (const s of [-1, 1]) {
    add(new RoundedBoxGeometry(0.065, 0.06, 0.4, 2, 0.02), M.black, 0.16 * s, 1.5, 0.0);   // por encima del hombro
    add(new RoundedBoxGeometry(0.065, 0.5, 0.03, 2, 0.012), M.black, 0.15 * s, 1.27, -0.165);   // por delante
  }
  add(new RoundedBoxGeometry(0.54, 0.065, 0.35, 2, 0.02), M.black, 0, 0.93, 0.0);
  // la botella (de «cristal»: se ve el aire de dentro)
  bottle = new THREE.Group(); bottle.position.copy(BOT_C); G.add(bottle);
  glassU = { uI: { value: 1 }, uCol: { value: new THREE.Color(0.55, 0.82, 1.0) } };
  const shell = new THREE.Mesh(new THREE.CapsuleGeometry(BOT.r, BOT.len, 10, 40), addMat(glassU, GLASS_F)); shell.renderOrder = 14; bottle.add(shell);
  const back = new THREE.Mesh(new THREE.CapsuleGeometry(BOT.r * 0.995, BOT.len, 10, 40), new THREE.MeshStandardMaterial({ color: 0x0e1218, roughness: 0.3, metalness: 0.4, side: THREE.BackSide }));
  bottle.add(back);
  airU = { uTex: { value: NOISE }, uTime: { value: 0 }, uLevel: { value: 1 }, uRes: { value: RESB / MAXB }, uResA: { value: 0 }, uI: { value: 1 }, uRed: { value: 0 },
    uHalf: { value: BOT.len / 2 + BOT.r * 0.86 }, uUse: { value: 0 } };
  const air = new THREE.Mesh(new THREE.CapsuleGeometry(BOT.r * 0.86, BOT.len, 10, 40), addMat(airU, AIR_F)); air.renderOrder = 13; bottle.add(air);
  const hb = -(BOT.len / 2 + BOT.r);
  add(new THREE.CylinderGeometry(0.03, 0.034, 0.06, 18), M.chrome, 0, hb - 0.02, 0, 0, 0, 0, 1, 1, 1, bottle);   // grifo
  add(new THREE.TorusGeometry(0.032, 0.008, 8, 20), M.black, 0, hb - 0.05, 0.0, Math.PI / 2, 0, 0, 1, 1, 1, bottle);
  for (const y of [0.16, -0.16]) add(new THREE.TorusGeometry(BOT.r + 0.004, 0.006, 6, 40), M.black, 0, y, 0, Math.PI / 2, 0, 0, 1, 1, 1, bottle);   // abrazaderas
  // latiguillo del manómetro: del grifo, por la cintura, al hombro izquierdo (por delante)
  const hp = [V(0, 0.9, 0.27), V(-0.18, 0.92, 0.2), V(-0.27, 1.05, 0.05), V(-0.24, 1.3, -0.12), V(-0.2, 1.38, -0.19)];
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 40, 0.011, 8), M.rubber, 0, 0, 0);
  add(new THREE.CylinderGeometry(0.035, 0.035, 0.022, 20), M.chrome, -0.2, 1.39, -0.205, Math.PI / 2, 0, 0);
  return G;
}






// ================================================================== de noche, delante de un edificio en llamas: dos bomberos con su ERA
const world = new THREE.Group(); scene.add(world);
scene.fog.density = 0.022;
renderer.localClippingEnabled = true;
const RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D', WHITE2 = '#F4F6F8', BLUE2 = '#62B0FF';
const LBLY = 690;
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
const std = (c, r = 0.6, mt = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt });
const FZ = -5.5, DOORW = 1.3, DOORH = 2.25;            // fachada (z) y puerta (centrada en x = 0)
const HPOS = V(0, 0, 0), PPOS = V(-1.0, 0, -2.6);       // el bombero (mira a la puerta, −Z) y su compañero (le mira a él)
let ribU, H, P, D, truck, beacons = [], fireLights = [], doorL, roomL, bgL, beam, beamL, flood, lungs, lungU, scanUp, scanDn, smokeRoom = [], outFires = [];

// ------------------------------------------------------------------ el bombero y su ERA (coordenadas del bombero: mira hacia −Z, izquierda = −X)
const BC = V(0, 1.2, 0.29);                                  // centro de la botella (grifo abajo)
const VALVE = V(0, 0.895, 0.29), WHEEL = V(0.052, 0.895, 0.29), REDC = V(0, 0.835, 0.229);
const GAUGE = V(-0.155, 1.258, -0.226), WHISTLE = V(-0.155, 1.352, -0.212), LDVP = V(0, 1.545, -0.24), BGP = V(0.155, 1.285, -0.214);
// atalaje (cinta) de cada hombro: de la placa, por encima del hombro, al pecho (centro de la cinta, plano x = cte)
const STRAP_YZ = [[1.3, 0.2], [1.47, 0.196], [1.545, 0.13], [1.562, 0.02], [1.548, -0.08], [1.512, -0.137], [1.44, -0.173], [1.3, -0.183], [1.15, -0.183], [1.02, -0.18]];
const STRAP_T = 0.016;                                         // media cinta (grosor)
function offStrap(y, z, d) {         // punto de la cinta desplazado hacia fuera del cuerpo (lejos del eje del torso)
  const cy = cl(y, 1.0, 1.42), dy = y - cy, dz = z, L = Math.hypot(dy, dz) || 1;
  return [y + dy / L * d, z + dz / L * d];
}
function hosePts(s, end) {
  const pts = [[0.045 * s, 0.835, 0.229], [0.11 * s, 0.858, 0.222], [0.164 * s, 0.95, 0.214], [0.166 * s, 1.2, 0.212], [0.164 * s, 1.4, 0.214]];
  for (const [y, z] of STRAP_YZ.slice(1, 6)) { const [yy, zz] = offStrap(y, z, STRAP_T + 0.011); pts.push([0.155 * s, yy, zz]); }
  return pts.concat(end);
}
const ALTA_PTS = hosePts(-1, [[-0.155, 1.44, -0.206], [-0.155, 1.385, -0.21], [-0.155, 1.29, -0.214]]);
const MEDIA_PTS = hosePts(1, [[0.152, 1.462, -0.212], [0.125, 1.42, -0.232], [0.075, 1.43, -0.252], [0.04, 1.47, -0.256], [0.024, 1.505, -0.243]]);
const SHL = s => V(0.272 * s, 1.43, -0.008);                // hombro (s = −1 izquierdo, 1 derecho)
const AL1 = 0.3, AL2 = 0.285;
const REST_H = s => V(0.335 * s, 0.985, -0.17), REST_E = s => V(0.33 * s, 1.18, 0.07);
const FLOW_V = 'varying float vU; varying vec3 vN; void main(){ vU = uv.x; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FLOW_F = `uniform float uTime, uHead, uI, uRed, uRedHead; uniform vec3 uCol; varying float vU; varying vec3 vN;
void main(){
  float rim = 0.45 + 0.55 * pow(1.0 - abs(normalize(vN).z), 1.4);
  float s = fract(vU * 7.0 - uTime * 1.9);
  float dash = 0.5 + 0.5 * smoothstep(0.0, 0.3, s) * smoothstep(0.85, 0.45, s);
  float front = smoothstep(uHead + 0.003, uHead - 0.05, vU);
  float head = exp(-pow((vU - uHead) / 0.035, 2.0)) * step(0.002, uHead) * step(uHead, 0.998);
  vec3 c = uCol * (dash * front + 2.2 * head) * uI;
  float fr = smoothstep(uRedHead + 0.003, uRedHead - 0.06, vU) * uRed, rh = exp(-pow((vU - uRedHead) / 0.04, 2.0)) * uRed;
  c += vec3(2.6, 0.16, 0.07) * (fr * 0.9 + rh * 3.0);
  c *= rim;
  if (max(c.r, max(c.g, c.b)) < 0.004) discard;
  gl_FragColor = vec4(c, 1.0);
}`;
const XR_V = `varying vec3 vP; varying vec3 vN; varying float vWY;
void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 w = modelMatrix * vec4(position, 1.0); vWY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }`;
const XAIR_F = `uniform sampler2D uTex; uniform float uTime, uI, uScan, uPress, uRed; varying vec3 vP; varying vec3 vN; varying float vWY;
void main(){
  if (vWY < uScan) discard;
  float a = atan(vP.z, vP.x), y = vP.y;
  float n = texture2D(uTex, vec2(a * 0.32 + uTime * 0.09, y * 2.4 - uTime * 0.28)).r;
  float n2 = texture2D(uTex, vec2(a * 0.6 - uTime * 0.13, y * 4.8 + uTime * 0.11)).r;
  float sw = 0.4 + 0.8 * (n * 0.6 + n2 * 0.4);
  vec3 col = mix(vec3(0.2, 0.7, 1.7), vec3(1.9, 0.18, 0.08), uRed) * sw * (0.8 + 0.6 * uPress);
  float rim = pow(1.0 - abs(normalize(vN).z), 1.3);
  float line = exp(-pow((vWY - uScan) / 0.006, 2.0));
  gl_FragColor = vec4(col * uI * (0.3 + 0.95 * rim) + vec3(0.7, 1.5, 2.4) * line * 2.0, 1.0);
}`;
const XGLASS_F = `uniform float uI, uScan; uniform vec3 uCol; varying vec3 vP; varying vec3 vN; varying float vWY;
void main(){ if (vWY < uScan) discard; float f = pow(1.0 - abs(normalize(vN).z), 2.4); float line = exp(-pow((vWY - uScan) / 0.005, 2.0));
  gl_FragColor = vec4(uCol * (0.04 + 1.2 * f) * uI + vec3(0.8, 1.6, 2.6) * line * 2.5, 1.0); }`;
const LUNG_F = `uniform float uI; uniform vec3 uCol; varying vec3 vN;
void main(){ float f = pow(1.0 - abs(normalize(vN).z), 1.8); gl_FragColor = vec4(uCol * (0.12 + 1.3 * f) * uI, 1.0); }`;
const addSh = (u, vs, fs, o = {}) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false,
  depthTest: o.depthTest ?? true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });

function between(m, a, b) {               // cilindro de 1 m (eje Y) estirado de a a b
  const d = b.clone().sub(a), L = d.length();
  m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(1, Math.max(1e-4, L), 1);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.divideScalar(Math.max(1e-6, L)));
}
function ik2(S, W, hint, L1 = AL1, L2 = AL2) {   // codo de un brazo de dos tramos (hombro S, muñeca W, el codo hacia «hint»)
  const d = W.clone().sub(S); let len = d.length(); const dn = d.clone().divideScalar(len);
  len = Math.min(len, L1 + L2 - 1e-3);
  const a = (L1 * L1 - L2 * L2 + len * len) / (2 * len), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const hv = hint.clone().sub(S); hv.sub(dn.clone().multiplyScalar(hv.dot(dn))); hv.normalize();
  return { E: S.clone().add(dn.clone().multiplyScalar(a)).add(hv.multiplyScalar(h)), W: S.clone().add(dn.multiplyScalar(len)) };
}
function bottleTex() {
  return canvasTex(1024, 512, (x) => {
    x.fillStyle = '#E8B314'; x.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${rnd(i) < 0.5 ? '255,235,170' : '120,80,0'},0.05)`; x.fillRect(rnd(i * 3.3) * 1024, rnd(i * 7.1) * 512, 3, 2); }
    for (const X of [130, 642]) {                        // dos etiquetas pequeñas (una por cada lado)
      rrect(x, X, 190, 250, 150, 10); x.fillStyle = '#F4F1E8'; x.fill();
      x.fillStyle = '#B5121B'; x.fillRect(X, 285, 250, 42);
      x.fillStyle = '#1b1b1b'; x.font = '400 40px Bebas'; x.textAlign = 'center'; x.fillText('AIRE COMPRIMIDO', X + 125, 250);
      x.fillStyle = '#FFFFFF'; x.font = '400 36px Bebas'; x.fillText('300 BAR', X + 125, 318);
    }
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 0, 1024, 26); x.fillRect(0, 486, 1024, 26);
  }, { aniso: 4 });
}
function gaugeTex() {
  return canvasTex(256, 256, (x) => {
    x.fillStyle = '#ECEDE6'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill();
    const A = b => (-225 + b / 300 * 270) * Math.PI / 180;      // 0 bar abajo a la izquierda, 300 abajo a la derecha
    x.strokeStyle = '#D21E1E'; x.lineWidth = 16; x.beginPath(); x.arc(128, 128, 98, A(0), A(55)); x.stroke();
    x.strokeStyle = '#18A35A'; x.lineWidth = 16; x.beginPath(); x.arc(128, 128, 98, A(250), A(300)); x.stroke();
    for (let b = 0; b <= 300; b += 10) { const a = A(b), r0 = b % 50 ? 104 : 92; x.strokeStyle = '#111'; x.lineWidth = b % 50 ? 2 : 4;
      x.beginPath(); x.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); x.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116); x.stroke(); }
    x.fillStyle = '#111'; x.font = '400 34px Bebas'; x.textAlign = 'center';
    for (const b of [0, 100, 200, 300]) { const a = A(b); x.fillText(String(b), 128 + Math.cos(a) * 70, 140 + Math.sin(a) * 70); }
    x.font = '400 26px Bebas'; x.fillText('BAR', 128, 196);
  }, { aniso: 4 });
}
let FABRIC = null;
function fabricNormal() {            // arrugas y trama de la tela del traje (normal map de ruido)
  if (FABRIC) return FABRIC;
  const N = 256, h = new Float32Array(N * N);
  for (let o = 0, amp = 1, f = 3; o < 5; o++, amp *= 0.55, f *= 2) {
    const gr = []; for (let i = 0; i < f * f; i++) gr.push(rnd(i * 17.3 + o * 71.1));
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const fx = x / N * f, fy = y / N * f, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const s2 = v => v * v * (3 - 2 * v), G = (i, j) => gr[((j % f) * f + (i % f))];
      h[y * N + x] += mx(mx(G(ix, iy), G(ix + 1, iy), s2(tx)), mx(G(ix, iy + 1), G(ix + 1, iy + 1), s2(tx)), s2(ty)) * amp; }
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) h[y * N + x] += 0.035 * Math.sin(x * 1.6) * Math.sin(y * 1.6);   // trama
  FABRIC = canvasTex(N, N, (c) => { const im = c.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const H0 = k => h[((y + N) % N) * N + ((k + N) % N)], dx = (H0(x + 1) - H0(x - 1)) * 2.2, dy = (h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x]) * 2.2;
      const L = Math.hypot(dx, dy, 1), i = (y * N + x) * 4; im.data[i] = (0.5 - dx / L * 0.5) * 255; im.data[i + 1] = (0.5 - dy / L * 0.5) * 255; im.data[i + 2] = (0.5 + 0.5 / L) * 255; im.data[i + 3] = 255; }
    c.putImageData(im, 0, 0); }, { srgb: false });
  FABRIC.wrapS = FABRIC.wrapT = THREE.RepeatWrapping; FABRIC.repeat.set(3, 3);
  return FABRIC;
}
function makeHero(o = {}) {
  const G = new THREE.Group(), R = { G, parts: {}, mats: {} };
  const navy = std(0x181d29, 0.86), jacket = std(0x1e2533, 0.8), black = std(0x121315, 0.5), rubber = std(0x0b0b0c, 0.72);
  for (const m of [navy, jacket]) { m.normalMap = fabricNormal(); m.normalScale = new THREE.Vector2(0.9, 0.9); }
  const tape = new THREE.MeshStandardMaterial({ color: 0xe0d96f, roughness: 0.35, metalness: 0.15, emissive: 0x6b6624, emissiveIntensity: 1.0 });
  const tapeS = new THREE.MeshStandardMaterial({ color: 0xd0d4da, roughness: 0.22, metalness: 0.6, emissive: 0x3a3c42, emissiveIntensity: 1.0 });
  R.tape = [tape, tapeS]; R.legM = { navy, rubber, tape, tapeS };
  const helm = new THREE.MeshPhysicalMaterial({ color: o.helmet ?? 0xe8be2c, roughness: 0.22, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe6e8ec, metalness: 1.0, roughness: 0.14 });
  const hi = (key, base) => { const m = base.clone(); m.emissive = new THREE.Color(o.hiCol ?? 0x2a9fd0); m.emissiveIntensity = 0; R.mats[key] = R.mats[key] || []; R.mats[key].push(m); return m; };
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, parent = G) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  // piernas y botas
  for (const s of [-1, 1]) {
    add(new RoundedBoxGeometry(0.135, 0.13, 0.31, 3, 0.045), rubber, 0.11 * s, 0.065, -0.035);
    add(new THREE.CapsuleGeometry(0.087, 0.58, 6, 16), navy, 0.11 * s, 0.53, 0.0);
    add(new THREE.CylinderGeometry(0.091, 0.091, 0.032, 22, 1, true), tapeS, 0.11 * s, 0.3, 0);
    add(new THREE.CylinderGeometry(0.091, 0.091, 0.032, 22, 1, true), tape, 0.11 * s, 0.35, 0);
  }
  add(new RoundedBoxGeometry(0.52, 0.22, 0.33, 3, 0.07), jacket, 0, 0.9, 0);                  // faldón del chaquetón
  R.torso = add(new RoundedBoxGeometry(0.5, 0.64, 0.31, 4, 0.11), jacket, 0, 1.22, 0);        // torso
  for (const [y, m] of [[0.94, tape], [0.985, tapeS], [1.37, tape]]) add(new RoundedBoxGeometry(0.515, 0.036, 0.325, 2, 0.016), m, 0, y, 0);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.1, 16, 12), jacket, 0.262 * s, 1.465, 0);       // hombros
  // cabeza: verdugo, capucha, casco, cubrenucas
  add(new THREE.CylinderGeometry(0.078, 0.095, 0.13, 18), rubber, 0, 1.57, 0);
  add(new THREE.SphereGeometry(0.128, 22, 16), rubber, 0, 1.67, 0.005);
  add(new THREE.SphereGeometry(0.158, 30, 18, 0, Math.PI * 2, 0, Math.PI / 2), helm, 0, 1.7, 0.012, 0, 0, 0, 1, 1.05, 1.13);
  add(new THREE.TorusGeometry(0.152, 0.011, 8, 40), helm, 0, 1.7, 0.012, Math.PI / 2, 0, 0, 1, 1.13, 1);
  const hband = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.3, metalness: 0.6, emissive: 0x2a2b2e, emissiveIntensity: 0.6 });
  add(new THREE.TorusGeometry(0.1552, 0.0042, 6, 48), hband, 0, 1.735, 0.012, Math.PI / 2, 0, 0, 1, 1.13, 1);
  add(new RoundedBoxGeometry(0.026, 0.026, 0.3, 2, 0.012), helm, 0, 1.868, 0.012);
  add(new THREE.CylinderGeometry(0.16, 0.175, 0.13, 22, 1, true, Math.PI * 0.18, Math.PI * 0.64), rubber, 0, 1.61, 0.03, 0, -Math.PI / 2, 0);
  // máscara completa: cuerpo de goma, visor panorámico, boca y el pulmoautomático delante
  const maskM = hi('mascara', std(0x141518, 0.55)), visorM = hi('mascara', new THREE.MeshPhysicalMaterial({ color: 0x1a2028, roughness: 0.02, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.2 }));
  add(new THREE.SphereGeometry(0.1, 24, 16), maskM, 0, 1.615, -0.098, 0, 0, 0, 1.08, 1.27, 0.86);
  add(new THREE.CylinderGeometry(0.106, 0.106, 0.13, 32, 1, true, Math.PI * 0.62, Math.PI * 0.76), visorM, 0, 1.655, -0.085, 0, 0, 0, 1, 1, 0.98);
  add(new THREE.TorusGeometry(0.0335, 0.006, 8, 24), maskM, 0, 1.545, -0.2, 0, 0, 0);                 // racor de la boca
  add(new THREE.CylinderGeometry(0.033, 0.036, 0.03, 20), maskM, 0, 1.545, -0.188, Math.PI / 2, 0, 0);
  // pulmoautomático
  const ldvM = hi('pulmo', std(0x1d1f23, 0.45, 0.2)), ldvC = hi('pulmo', std(0x5a5f68, 0.5, 0.3));
  const ldv = new THREE.Group(); ldv.position.copy(LDVP); G.add(ldv);
  add(new THREE.CylinderGeometry(0.031, 0.033, 0.05, 24), ldvM, 0, 0, 0.012, Math.PI / 2, 0, 0, 1, 1, 1, ldv);
  add(new THREE.CylinderGeometry(0.028, 0.03, 0.014, 24), ldvC, 0, 0, -0.019, Math.PI / 2, 0, 0, 1, 1, 1, ldv);       // tapa (botón)
  add(new THREE.CylinderGeometry(0.009, 0.009, 0.03, 12), chrome, 0.016, -0.026, 0.008, 0, 0, 0.5, 1, 1, 1, ldv);     // entrada de la manguera
  R.ldv = ldv; R.parts.pulmo = LDVP;
  if (o.flow) { R.puffU = { uI: { value: 0 }, uCol: { value: new THREE.Color(0.4, 1.0, 2.2) } };
    const pm = addSh(R.puffU, 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', LUNG_F);
    R.puff = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), pm); R.puff.position.set(0, 1.56, -0.17); R.puff.scale.set(0.07, 0.05, 0.05); R.puff.renderOrder = 16; G.add(R.puff); }
  // espaldera (placa dorsal), atalajes y cinturón
  const espM = hi('espaldera', std(0x17181b, 0.45));
  add(new RoundedBoxGeometry(0.3, 0.72, 0.045, 3, 0.018), espM, 0, 1.16, 0.18);
  add(new RoundedBoxGeometry(0.36, 0.13, 0.06, 3, 0.025), espM, 0, 0.93, 0.19);
  const strapM = hi('espaldera', std(0x161719, 0.7));
  const strapCurve = new THREE.CatmullRomCurve3(STRAP_YZ.map(([y, z]) => V(0, y, z)), false, 'centripetal');
  for (const s of [-1, 1]) {
    const st = add(new THREE.TubeGeometry(strapCurve, 60, STRAP_T, 10, false), strapM, 0.155 * s, 0, 0, 0, 0, 0, 2.0, 1, 1);
    add(new RoundedBoxGeometry(0.05, 0.03, 0.012, 2, 0.004), chrome, 0.155 * s, 1.08, -0.2);
  }
  add(new RoundedBoxGeometry(0.54, 0.065, 0.35, 2, 0.02), strapM, 0, 0.93, 0.0);
  add(new RoundedBoxGeometry(0.075, 0.05, 0.015, 2, 0.005), chrome, 0, 0.93, -0.18);
  // la botella (perfil girado: cúpula arriba, cuello y grifo abajo)
  const prof = [[0.0, 0.265], [0.03, 0.262], [0.055, 0.252], [0.072, 0.236], [0.082, 0.215], [0.085, 0.19], [0.085, -0.19], [0.082, -0.215], [0.072, -0.236], [0.055, -0.252], [0.032, -0.262], [0.022, -0.27], [0.022, -0.3], [0, -0.3]].map(([r, y]) => new THREE.Vector2(r, y));
  const evenProf = (pp, n) => { const L = [0]; for (let i = 1; i < pp.length; i++) L.push(L[i - 1] + pp[i].distanceTo(pp[i - 1]));
    const out = []; for (let k = 0; k <= n; k++) { const d = L[L.length - 1] * k / n; let i = 1; while (i < L.length - 1 && L[i] < d) i++;
      const f = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); out.push(pp[i - 1].clone().lerp(pp[i], cl(f))); } return out; };
  const profE = evenProf(prof.slice().reverse(), 64);
  const bGeo = new THREE.LatheGeometry(profE, 48);
  R.scanUp = new THREE.Plane(V(0, -1, 0), 99);                     // pintura: se ve por debajo de la línea del escáner
  const paint = hi('botella', new THREE.MeshPhysicalMaterial({ map: bottleTex(), roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.15 }));
  if (o.xray) paint.clippingPlanes = [R.scanUp];
  R.bottle = add(bGeo, paint, BC.x, BC.y, BC.z, 0, Math.PI / 2, 0);
  const strapB = add(new THREE.TorusGeometry(0.087, 0.009, 6, 40), strapM, BC.x, BC.y + 0.1, BC.z, Math.PI / 2, 0, 0);
  if (o.xray) { strapB.material = strapM.clone(); strapB.material.clippingPlanes = [R.scanUp]; }
  if (o.xray) {
    R.xu = { uTex: { value: NOISE }, uTime: { value: 0 }, uI: { value: 1 }, uScan: { value: 99 }, uPress: { value: 1 }, uRed: { value: 0 } };
    R.gu = { uI: { value: 1 }, uScan: { value: 99 }, uCol: { value: new THREE.Color(0.55, 0.82, 1.0) } };
    const air = new THREE.Mesh(new THREE.LatheGeometry(profE.map(v => new THREE.Vector2(v.x * 0.86, v.y * 0.96)), 40), addSh(R.xu, XR_V, XAIR_F));
    air.position.copy(BC); air.renderOrder = 13; G.add(air);
    const shell = new THREE.Mesh(bGeo, addSh(R.gu, XR_V, XGLASS_F)); shell.position.copy(BC); shell.renderOrder = 14; G.add(shell);
    R.air = air; R.shell = shell;
  }
  R.parts.botella = BC.clone();
  // grifo: cuerpo, salida al reductor y volante (gira con la mano)
  const grifoM = hi('grifo', new THREE.MeshStandardMaterial({ color: 0xc9a868, metalness: 0.9, roughness: 0.3 }));
  add(new THREE.CylinderGeometry(0.024, 0.026, 0.055, 20), grifoM, VALVE.x, VALVE.y, VALVE.z);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 12), grifoM, VALVE.x, VALVE.y - 0.02, VALVE.z - 0.035, Math.PI / 2 - 0.5, 0, 0);
  const wheel = new THREE.Group(); wheel.position.copy(WHEEL); G.add(wheel);
  const wheelM = hi('grifo', std(0x1a1b1e, 0.6));
  add(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 10), grifoM, -0.012, 0, 0, 0, 0, Math.PI / 2, 1, 1, 1, wheel);
  add(new THREE.CylinderGeometry(0.029, 0.029, 0.018, 24), wheelM, 0.006, 0, 0, 0, 0, Math.PI / 2, 1, 1, 1, wheel);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; add(new THREE.SphereGeometry(0.007, 8, 6), wheelM, 0.006, Math.cos(a) * 0.029, Math.sin(a) * 0.029, 0, 0, 0, 1.2, 1, 1, wheel); }
  R.wheel = wheel; R.parts.grifo = WHEEL.clone().add(V(0.008, 0, 0));
  // manorreductor (en la placa, debajo del grifo)
  const redM = hi('reductor', new THREE.MeshStandardMaterial({ color: 0xd8dbe0, metalness: 1.0, roughness: 0.2 }));
  add(new THREE.CylinderGeometry(0.021, 0.021, 0.095, 20), redM, REDC.x, REDC.y, REDC.z, 0, 0, Math.PI / 2);
  add(new RoundedBoxGeometry(0.05, 0.04, 0.035, 2, 0.008), redM, REDC.x, REDC.y + 0.012, REDC.z - 0.004);
  add(new THREE.CylinderGeometry(0.011, 0.011, 0.07, 12), redM, 0, (REDC.y + VALVE.y) / 2 - 0.005, (REDC.z + VALVE.z) / 2 - 0.005, -0.9, 0, 0);
  R.parts.reductor = REDC.clone();
  // mangueras de alta y media presión (con la «luz» del aire por dentro)
  const hose = (pts, r, key) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, 'centripetal');
    const seg = Math.round(curve.getLength() * 160);
    const m = add(new THREE.TubeGeometry(curve, seg, r, 10, false), hi(key, std(0x0d0e10, 0.55)), 0, 0, 0);
    let fu = null;
    if (o.flow) {
      fu = { uTime: { value: 0 }, uHead: { value: 0 }, uI: { value: 0 }, uRed: { value: 0 }, uRedHead: { value: 0 }, uCol: { value: new THREE.Color(0.35, 0.8, 2.0) } };
      const f = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r * 1.35, 10, false), addSh(fu, FLOW_V, FLOW_F)); f.renderOrder = 9; G.add(f);
    }
    return { m, fu, curve, len: curve.getLength() };
  };
  R.alta = hose(ALTA_PTS, 0.0075, 'alta'); R.media = hose(MEDIA_PTS, 0.0105, 'media');
  R.parts.alta = R.alta.curve.getPointAt(0.42); R.parts.media = R.media.curve.getPointAt(0.84);
  // silbato (avisador acústico) y manómetro, al final de la de alta
  const silM = hi('silbato', new THREE.MeshStandardMaterial({ color: 0xe6e8ec, metalness: 1.0, roughness: 0.16 }));
  add(new THREE.CylinderGeometry(0.0095, 0.0095, 0.05, 14), silM, WHISTLE.x, WHISTLE.y, WHISTLE.z, 0.15, 0, 0);
  for (const dy of [-0.012, 0.0, 0.012]) add(new THREE.TorusGeometry(0.0097, 0.0016, 6, 16), black, WHISTLE.x, WHISTLE.y + dy, WHISTLE.z, Math.PI / 2 + 0.15, 0, 0);
  R.parts.silbato = WHISTLE.clone();
  const gauge = new THREE.Group(); gauge.position.copy(GAUGE); gauge.rotation.set(0.35, 0, 0); G.add(gauge);
  const gm = hi('manometro', std(0x17181b, 0.6));
  add(new THREE.CylinderGeometry(0.036, 0.038, 0.026, 28), gm, 0, 0, 0, Math.PI / 2, 0, 0, 1, 1, 1, gauge);
  add(new THREE.TorusGeometry(0.034, 0.005, 8, 28), gm, 0, 0, -0.013, 0, 0, 0, 1, 1, 1, gauge);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.03, 32), new THREE.MeshStandardMaterial({ map: gaugeTex(), roughness: 0.5, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0.0 }));
  face.position.z = -0.0135; face.rotation.y = Math.PI; gauge.add(face);
  const needle = new THREE.Group(); needle.position.z = -0.0142; needle.rotation.y = Math.PI; gauge.add(needle);
  const nd = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.026, 0.0008), new THREE.MeshBasicMaterial({ color: 0xd01818 })); nd.position.y = 0.01; needle.add(nd);
  needle.add(new THREE.Mesh(new THREE.CircleGeometry(0.003, 12), new THREE.MeshBasicMaterial({ color: 0x111111 })));
  needle.children[1].position.z = 0.0003;
  const gl = new THREE.Mesh(new THREE.CircleGeometry(0.031, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.12, clearcoat: 1 }));
  gl.position.z = -0.0152; gl.rotation.y = Math.PI; gauge.add(gl);
  R.gauge = gauge; R.needle = needle; R.face = face; R.parts.manometro = GAUGE.clone();
  // bodyguard (alarma personal: pantalla y luz)
  const bgM = hi('bodyguard', std(0x1a1c20, 0.5)), bgB = hi('bodyguard', std(0xd86a12, 0.55));
  const bg = new THREE.Group(); bg.position.copy(BGP); bg.rotation.set(0.05, 0, 0); G.add(bg);
  add(new RoundedBoxGeometry(0.058, 0.088, 0.028, 3, 0.009), bgM, 0, 0, 0, 0, 0, 0, 1, 1, 1, bg);
  add(new RoundedBoxGeometry(0.064, 0.02, 0.03, 2, 0.008), bgB, 0, 0.042, 0, 0, 0, 0, 1, 1, 1, bg);
  add(new RoundedBoxGeometry(0.064, 0.02, 0.03, 2, 0.008), bgB, 0, -0.042, 0, 0, 0, 0, 1, 1, 1, bg);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.024), new THREE.MeshBasicMaterial({ color: 0x5fd4a0 })); scr.position.set(0, 0.006, -0.0145); scr.rotation.y = Math.PI; bg.add(scr);
  scr.material.color.multiplyScalar(0.7);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 12, 8), new THREE.MeshBasicMaterial({ color: 0x20ff60 })); led.position.set(0.016, -0.022, -0.013); bg.add(led);
  R.bg = bg; R.led = led; R.scr = scr; R.parts.bodyguard = BGP.clone();
  R.parts.mascara = V(0, 1.64, -0.19); R.parts.espaldera = V(0, 1.08, 0.205);
  // brazos (dos tramos que se colocan con ik2) y guantes
  R.arms = [];
  for (const s of [-1, 1]) {
    const up = add(new THREE.CylinderGeometry(0.068, 0.063, 1, 14), jacket, 0, 0, 0);
    const el = add(new THREE.SphereGeometry(0.064, 14, 10), jacket, 0, 0, 0);
    const fo = add(new THREE.CylinderGeometry(0.062, 0.057, 1, 14), jacket, 0, 0, 0);
    const band = add(new THREE.CylinderGeometry(0.0625, 0.0625, 0.03, 14, 1, true), tape, 0, 0, 0);
    const glove = new THREE.Group(); G.add(glove);
    const gmat = std(0x16171a, 0.82);
    add(new RoundedBoxGeometry(0.085, 0.1, 0.045, 2, 0.02), gmat, 0, -0.045, 0, 0, 0, 0, 1, 1, 1, glove);         // palma
    add(new RoundedBoxGeometry(0.08, 0.06, 0.05, 2, 0.022), gmat, 0, -0.105, 0.006, 0.5, 0, 0, 1, 1, 1, glove);   // dedos (cerrados)
    add(new THREE.CapsuleGeometry(0.014, 0.035, 4, 8), gmat, -0.046 * s, -0.05, -0.012, 0, 0, 0.5 * s, 1, 1, 1, glove);   // pulgar
    add(new THREE.CylinderGeometry(0.06, 0.064, 0.06, 14), gmat, 0, 0.02, 0, 0, 0, 0, 1, 1, 1, glove);         // puño del guante
    R.arms.push({ s, up, el, fo, band, glove });
  }
  R.pose = (handL, handR, elL, elR, rollR = 0) => {
    for (const A of R.arms) {
      const S = SHL(A.s), Wt = A.s < 0 ? handL : handR, Eh = A.s < 0 ? elL : elR;
      const { E, W } = ik2(S, Wt, Eh);
      between(A.up, S, E); A.el.position.copy(E); between(A.fo, E, W);
      const dir = W.clone().sub(E).normalize();
      A.band.position.copy(E).lerp(W, 0.86); A.band.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
      A.glove.position.copy(W); A.glove.quaternion.setFromUnitVectors(V(0, -1, 0), dir);
      A.glove.rotateY((A.s < 0 ? 0.0 : 0.0) + (A.s > 0 ? rollR : 0));
    }
  };
  R.pose(REST_H(-1), REST_H(1), REST_E(-1), REST_E(1));
  R.hiSet = (key, k) => { for (const m of R.mats[key] || []) m.emissiveIntensity = k; };
  return R;
}
function worldOf(R, p) { return R.G.localToWorld(p.clone()); }

// ------------------------------------------------------------------ calle, fachada con la puerta, edificio en llamas, el cuarto de dentro
function buildWorld() {
  mats();
  NOISE = NOISE || noiseTex();
  buildDay();
  // fachada de la planta baja (con el hueco de la puerta) y el edificio encima
  const plaster = canvasTex(512, 256, (x) => { x.fillStyle = '#b3a386'; x.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 4000; i++) { const v = 150 + rnd(i) * 50; x.fillStyle = `rgba(${v},${v - 6},${v - 16},0.3)`; x.fillRect(rnd(i * 2.3) * 512, rnd(i * 4.9) * 256, 3, 3); }
    const sg = x.createLinearGradient(0, 0, 0, 256); sg.addColorStop(0, 'rgba(20,16,12,0.8)'); sg.addColorStop(0.5, 'rgba(20,16,12,0.12)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = sg; x.fillRect(0, 0, 512, 256); }, { aniso: 4 });
  const wallM = new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.9 });
  const fw = (x0, x1, y0, y1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.35), wallM); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, FZ - 0.175); m.castShadow = m.receiveShadow = true; world.add(m); return m; };
  fw(-9, -DOORW / 2, 0, 3.2); fw(DOORW / 2, 9, 0, 3.2); fw(-DOORW / 2, DOORW / 2, DOORH, 3.2);
  const frameM = std(0x1c1a18, 0.7);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, DOORH, 0.42), frameM); f.position.set(s * (DOORW / 2 + 0.03), DOORH / 2, FZ - 0.17); world.add(f); }
  const lint = new THREE.Mesh(new THREE.BoxGeometry(DOORW + 0.14, 0.09, 0.42), frameM); lint.position.set(0, DOORH + 0.04, FZ - 0.17); world.add(lint);
  // escaparate de la planta baja, con resplandor de fuego dentro
  const shopM = new THREE.MeshStandardMaterial({ color: 0x1c2026, emissive: 0xff6a1a, emissiveIntensity: 0.0, roughness: 0.08, metalness: 0.5 });
  const shop = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), shopM); shop.position.set(-3.6, 1.45, FZ + 0.005); world.add(shop); outFires.push({ mat: shopM, k: 0.28 });
  const shop2 = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), shopM.clone()); shop2.position.set(3.6, 1.45, FZ + 0.005); world.add(shop2); outFires.push({ mat: shop2.material, k: 0.12 });
  // fuego por las ventanas de la 1.ª y 2.ª planta (encima de la puerta) y humo que sube
  const winX = c => -9 + (c + 0.5) * 2;                    // centro de la columna c (9 columnas en 18 m)
  const fires = [[winX(3), 3.2 + 0.55], [winX(4), 3.2 + 0.55], [winX(5), 3.2 + 0.55], [winX(4), 3.2 + 3.55], [winX(5), 3.2 + 3.55]];
  fires.forEach(([x, y], i) => {
    const fl = tongues(7, i * 3 + 1, (j, r) => [x + (r(1) - 0.5) * 1.0, y + 0.1 + r(2) * 0.2, FZ + 0.2 + r(3) * 0.3, 0.6 + r(4) * 0.5, 1.6 + r(5) * 1.4]);
    const fs = fireSet(world, V(x, y, FZ + 0.15), fl, { seed: 11 + i * 7, smokeN: 44, smokeSize: 2.1, emberN: 30, extent: [0.7, 0.3, 0.3], smokeY: 1.9, bright: 2.0 });
    fs.s.u.uLife.value = 6.0; fs.s.u.uRise.value = 1.5; fs.s.u.uOpacity.value = 0.78;
    const L = new THREE.PointLight(0xff7a26, 0, 0, 2); L.position.set(x, y + 0.8, FZ + 1.2); world.add(L); fireLights.push({ L, base: 9, seed: i });
  });
  // humo que sale por arriba de la puerta y resplandor de dentro
  const ds = new Parts(34, { life: 3.4, rise: 0.55, acc: 0.12, size: 0.9, grow: 2.2, turb: 0.25, conv: 0.0, opacity: 0.55, c: SMOKE_C, seed: 77, extent: [0.5, 0.12, 0.1], order: 11 });
  ds.at(0, DOORH - 0.1, FZ + 0.15); world.add(ds.mesh);
  doorL = new THREE.PointLight(0xff8a3a, 0, 0, 2); doorL.position.set(0, 1.3, FZ - 1.2); world.add(doorL);
  // la autobomba, detrás, con sus luces azules
  truck = makeTruck(); truck.position.set(-4.2, 0, 4.4); truck.rotation.y = Math.PI; world.add(truck);
  truck.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
  beacons = truck.userData.lbar; truck.userData.pl.distance = 0; truck.userData.pl.decay = 2;
  bgL = new THREE.PointLight(0x2f6bff, 0, 0, 2); bgL.position.set(-3.5, 3.4, 3.0); world.add(bgL);
  // el cuarto de dentro: suelo, paredes, techo, fuego al fondo y humo
  const roomM = std(0x2b2723, 0.95), floorM = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.96, metalness: 0.0 });
  const rb = (w, h, d, x, y, z, m = roomM) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.receiveShadow = true; world.add(b); return b; };
  rb(6.6, 0.1, 7, 0, -0.05, FZ - 3.85, floorM); rb(6.6, 0.1, 7, 0, 3.05, FZ - 3.85); rb(0.1, 3.1, 7, -3.3, 1.5, FZ - 3.85); rb(0.1, 3.1, 7, 3.3, 1.5, FZ - 3.85); rb(6.6, 3.1, 0.1, 0, 1.5, FZ - 7.35);
  const fin = tongues(9, 41, (j, r) => [-2.2 + j * 0.55 + (r(1) - 0.5) * 0.3, 0.05, FZ - 6.7 + (r(2) - 0.5) * 0.4, 0.55 + r(3) * 0.4, 1.1 + r(4) * 0.9]);
  fireSet(world, V(0, 0, FZ - 6.7), fin, { seed: 53, smokeN: 0, smokeSize: 1, emberN: 30, extent: [2.4, 0.2, 0.3], bright: 1.7 });
  roomL = new THREE.PointLight(0xff7024, 0, 0, 2); roomL.position.set(0, 1.2, FZ - 6.0); world.add(roomL);
  const sk = new Parts(70, { life: 6, rise: 0.06, acc: 0, size: 1.6, grow: 1.5, turb: 0.6, conv: 0, opacity: 0.42, c: [[0.16, 0.13, 0.11], [0.12, 0.1, 0.09], [0.1, 0.085, 0.075], [0.08, 0.07, 0.065]], seed: 91, extent: [2.9, 0.75, 3.0], order: 11 });
  sk.at(0, 2.05, FZ - 3.6); world.add(sk.mesh); smokeRoom.push(sk);
  const sk2 = new Parts(30, { life: 6, rise: 0.04, acc: 0, size: 1.1, grow: 1.4, turb: 0.5, conv: 0, opacity: 0.22, c: [[0.16, 0.13, 0.11], [0.12, 0.1, 0.09], [0.1, 0.085, 0.075], [0.08, 0.07, 0.065]], seed: 97, extent: [2.9, 0.5, 3.0], order: 11 });
  sk2.at(0, 0.8, FZ - 3.8); world.add(sk2.mesh); smokeRoom.push(sk2);
  const thr = new THREE.Mesh(new THREE.BoxGeometry(DOORW + 0.1, 0.14, 0.4), std(0x8d8a83, 0.9)); thr.position.set(0, 0.07, FZ - 0.17); thr.receiveShadow = true; world.add(thr);
  const atk = hoseMesh([V(-0.9, 0.95, 3.02), V(-0.86, 0.3, 2.7), V(-0.6, 0.035, 2.2), V(0.55, 0.035, 1.25), V(0.95, 0.035, -0.9), V(0.88, 0.035, -2.9), V(0.82, 0.175, -3.42), V(0.62, 0.175, -4.6), V(0.38, 0.175, -5.5), V(0.22, 0.035, -6.2), V(-0.15, 0.035, -6.75)], 0.034, 0xd9d2bf);
  atk.mesh.receiveShadow = true; world.add(atk.mesh);
  F3 = makeHero({ helmet: 0xe6e8ea }); F3.G.position.set(0.18, 0, 4.4); F3.G.rotation.y = Math.PI / 2; world.add(F3.G);
  F3.pose(V(-0.16, 1.22, -0.46), V(0.14, 1.28, -0.46), V(-0.33, 1.05, -0.12), V(0.33, 1.08, -0.12));
  // los bomberos: el protagonista (con rayos X y el aire), su compañero y el que está en el suelo, dentro
  H = makeHero({ xray: true, flow: true }); H.G.position.copy(HPOS); world.add(H.G);
  P = makeHero({ helmet: 0xe6e8ea }); P.G.position.copy(PPOS); P.G.rotation.y = Math.atan2(-0.36, -0.93); world.add(P.G);
  P.pose(V(-0.33, 0.99, -0.19), V(0.3, 1.0, -0.2), REST_E(-1), REST_E(1));
  D = makeHero({ helmet: 0xe8be2c }); world.add(D.G);
  layDown(D);
  // linterna del que le encuentra (desde la puerta)
  beamL = new THREE.SpotLight(0xf2f6ff, 0, 0, 0.2, 0.5, 2); beamL.position.set(0.35, 1.35, FZ - 0.25); world.add(beamL, beamL.target);
  beam = new THREE.Mesh(new THREE.ConeGeometry(0.42, 3.2, 32, 1, true), new THREE.ShaderMaterial({ uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uI; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float k = smoothstep(-1.6, 1.6, vY); float e = pow(abs(dot(normalize(vN), normalize(vV))), 1.5); gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * uI * k * e * 0.5, 1.0); }' }));
  beam.renderOrder = 15; world.add(beam);
  // los pulmones (rayos X, en rojo) dentro del protagonista
  lungU = { uI: { value: 0 }, uCol: { value: new THREE.Color(2.2, 0.22, 0.12) } };
  lungs = new THREE.Group(); H.G.add(lungs);
  const lm = addSh(lungU, 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', LUNG_F, { depthTest: false });
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), lm); l.position.set(0.07 * s, 1.3, -0.01); l.scale.set(0.058, 0.125, 0.065); l.rotation.z = 0.12 * s; l.renderOrder = 40; lungs.add(l); }
  ribU = { uI: { value: 0 }, uCol: { value: new THREE.Color(0.75, 0.85, 0.95) } };
  const rm = addSh(ribU, 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', LUNG_F, { depthTest: false });
  for (let i = 0; i < 7; i++) { const y = 1.43 - i * 0.042, rx = 0.13 + 0.02 * Math.sin(i / 6 * Math.PI), r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 6, 40), rm);
    r.position.set(0, y, -0.005); r.rotation.x = Math.PI / 2 + 0.25; r.scale.set(rx, 0.12, 1); r.renderOrder = 39; lungs.add(r); }
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8), rm); between(spine, V(0, 1.47, 0.09), V(0, 1.12, 0.1)); spine.renderOrder = 39; lungs.add(spine);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 1, 10), lm); between(tr, V(0, 1.53, -0.03), V(0, 1.4, -0.02)); tr.renderOrder = 40; lungs.add(tr);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 1, 8), lm); between(b, V(0, 1.405, -0.02), V(0.06 * s, 1.34, -0.01)); b.renderOrder = 40; lungs.add(b); }
  lungs.visible = false;
}
function layDown(R) {                // tumbado boca arriba dentro del humo: la espalda sobre la botella, piernas y brazos en el suelo
  const G = R.G;
  G.rotation.order = 'YXZ'; G.rotation.set(Math.PI / 2 - 0.06, 0.55, 0);
  G.position.set(-0.45, 0, FZ - 3.25);
  for (let i = 0; i < 8; i++) G.children[i].visible = false;          // las piernas de pie (se rehacen en el suelo)
  G.updateMatrixWorld(true);
  let minY = 9; const vv = V();
  G.traverse(o => { if (!o.isMesh || !o.visible || !o.geometry.attributes.position) return; let vis = true; for (let p = o.parent; p; p = p.parent) if (!p.visible) vis = false; if (!vis) return;
    const pa = o.geometry.attributes.position; for (let i = 0; i < pa.count; i += 3) { vv.fromBufferAttribute(pa, i); o.localToWorld(vv); minY = Math.min(minY, vv.y); } });
  G.position.y += 0.004 - minY; G.updateMatrixWorld(true);
  const toW = p => G.localToWorld(p.clone());
  const dir = toW(V(0, 0, 0)).sub(toW(V(0, 1, 0))); dir.y = 0; dir.normalize();          // hacia los pies (en el suelo)
  const perp = V(-dir.z, 0, dir.x);                                                       // a un lado
  const L = R.legM, add = (geo, m) => { const x = new THREE.Mesh(geo, m); x.castShadow = x.receiveShadow = true; world.add(x); return x; };
  for (const s of [-1, 1]) {
    const hip = toW(V(0.11 * s, 0.86, 0));
    const side = (perp.dot(toW(V(1, 0, 0)).sub(toW(V(0, 0, 0)))) > 0 ? 1 : -1) * s;     // el lado de esta pierna, en el suelo
    const knee = hip.clone().add(dir.clone().multiplyScalar(Math.sqrt(Math.max(0.02, 0.42 * 0.42 - Math.pow(hip.y - 0.12, 2))))).add(perp.clone().multiplyScalar(0.035 * side)); knee.y = 0.12;
    const ank = knee.clone().add(dir.clone().multiplyScalar(0.4)).add(perp.clone().multiplyScalar(0.05 * side)); ank.y = 0.09;
    const th = add(new THREE.CylinderGeometry(0.088, 0.085, 1, 16), L.navy); between(th, hip, knee);
    add(new THREE.SphereGeometry(0.086, 14, 10), L.navy).position.copy(knee);
    const sh = add(new THREE.CylinderGeometry(0.084, 0.08, 1, 16), L.navy); between(sh, knee, ank);
    for (const [k, m] of [[0.45, L.tapeS], [0.62, L.tape]]) { const b = add(new THREE.CylinderGeometry(0.086, 0.086, 0.032, 16, 1, true), m); b.position.copy(knee).lerp(ank, k); b.quaternion.copy(sh.quaternion); }
    const boot = add(new RoundedBoxGeometry(0.135, 0.31, 0.13, 3, 0.045), L.rubber);    // de punta hacia arriba
    boot.position.copy(ank).add(V(0, 0.1, 0)).add(dir.clone().multiplyScalar(0.05));
    boot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(perp, V(0, 1, 0), dir.clone().negate()));
    boot.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(dir, 0.95 * side)); boot.position.add(perp.clone().multiplyScalar(0.07 * side)).add(V(0, -0.035, 0));   // los pies caídos hacia fuera
  }
  // brazos apoyados en el suelo, a los lados
  const hipC = toW(V(0, 0.95, 0));
  const hand = s => { const sideV = toW(V(s, 0, 0)).sub(toW(V(0, 0, 0))); sideV.y = 0; sideV.normalize(); const w = hipC.clone().add(sideV.multiplyScalar(0.3)).add(dir.clone().multiplyScalar(0.06)); w.y = 0.07; return G.worldToLocal(w); };
  const elbow = s => { const sh = toW(SHL(s)), sideV = toW(V(s, 0, 0)).sub(toW(V(0, 0, 0))); sideV.y = 0; sideV.normalize(); const e = sh.clone().add(sideV.multiplyScalar(0.42)).add(dir.clone().multiplyScalar(0.25)); e.y = 0.16; return G.worldToLocal(e); };
  R.pose(hand(-1), hand(1), elbow(-1), elbow(1));
}

// ------------------------------------------------------------------ DE DÍA (Javi, 25 nov: «vida real»): cielo, sol, calle, árboles, coches, cordón y curiosos
const SUN_DIR = V(0.42, 0.62, 0.66).normalize();
const HAZE = new THREE.Color(0.66, 0.66, 0.66);
let sun, sky, people = [], trees = [], hazards = [], F3 = null;
function dayFacade(cols, rows, seed, base, fire) {      // fachada de día: revoco, ventanas con reflejo del cielo, balcones pintados
  const T0 = (map) => canvasTex(cols * 96, rows * 128, (x) => {
    x.fillStyle = map === 'em' ? '#000' : base; x.fillRect(0, 0, cols * 96, rows * 128);
    for (let i = 0; i < (map === 'em' ? 0 : cols * rows * 30); i++) { const v = rnd(i * 1.3 + seed); x.fillStyle = `rgba(${v < 0.5 ? '0,0,0' : '255,255,255'},0.035)`; x.fillRect(rnd(i * 2.9 + seed) * cols * 96, rnd(i * 5.1 + seed) * rows * 128, 4, 3); }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const X = c * 96 + 22, Y = (rows - 1 - r) * 128 + 24, onFire = fire && fire(r, c);
      if (map === 'em') { x.fillStyle = onFire ? '#ff7a22' : '#000'; x.fillRect(X, Y, 52, 82); continue; }
      x.fillStyle = 'rgba(255,255,255,0.75)'; x.fillRect(X - 5, Y - 5, 62, 92);             // marco
      const gr = x.createLinearGradient(0, Y, 0, Y + 82); gr.addColorStop(0, onFire ? '#ff9a3a' : '#8fa3b8'); gr.addColorStop(1, onFire ? '#c83a10' : '#2f3a46'); x.fillStyle = gr; x.fillRect(X, Y, 52, 82);
      x.fillStyle = 'rgba(30,30,30,0.6)'; x.fillRect(X + 24, Y, 4, 82);
      if (!onFire && rnd(r * 7.1 + c * 3.3 + seed) < 0.45) { x.fillStyle = rnd(r + c * 9 + seed) < 0.5 ? '#d9cfae' : '#b8c6c2'; x.fillRect(X, Y, 52, 30); }   // persiana medio bajada
      if (r > 0) { x.fillStyle = 'rgba(40,40,44,0.85)'; x.fillRect(X - 12, Y + 82, 76, 6); for (let k = 0; k < 9; k++) x.fillRect(X - 10 + k * 9, Y + 58, 2, 24); x.fillRect(X - 12, Y + 56, 76, 3); }
      if (onFire) { const sg = x.createLinearGradient(0, Y - 60, 0, Y); sg.addColorStop(0, 'rgba(20,16,14,0)'); sg.addColorStop(1, 'rgba(20,16,14,0.85)'); x.fillStyle = sg; x.fillRect(X - 14, Y - 60, 80, 60); }   // hollín
    }
  }, { aniso: 8, srgb: map !== 'em' });
  return new THREE.MeshStandardMaterial({ map: T0('map'), emissiveMap: T0('em'), emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.85 });
}
function dayBuilding(w, h, d, cols, rows, seed, base, fire) {
  const front = dayFacade(cols, rows, seed, base, fire), plain = std(new THREE.Color(base).multiplyScalar(0.8).getHex(), 0.9);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [plain, plain, plain, plain, front, plain]); m.castShadow = m.receiveShadow = true; return m;
}
function makeCar(col) {
  const G = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.32, metalness: 0.45, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x1a2430, roughness: 0.05, metalness: 0.6, clearcoat: 1 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = m.receiveShadow = true; G.add(m); return m; };
  add(new RoundedBoxGeometry(4.1, 0.6, 1.76, 4, 0.16), body, 0, 0.58, 0);
  add(new RoundedBoxGeometry(2.1, 0.55, 1.6, 4, 0.18), glass, -0.25, 1.1, 0);
  add(new RoundedBoxGeometry(1.95, 0.08, 1.52, 2, 0.04), body, -0.3, 1.39, 0);
  add(new THREE.BoxGeometry(4.14, 0.12, 1.8), std(0x0d0d0f, 0.9), 0, 0.31, 0);
  for (const [x, z] of [[1.3, 0.82], [-1.3, 0.82], [1.3, -0.82], [-1.3, -0.82]]) { add(new THREE.CylinderGeometry(0.33, 0.33, 0.23, 22), M.rubber, x, 0.33, z, Math.PI / 2, 0, 0); add(new THREE.CylinderGeometry(0.19, 0.19, 0.24, 6), M.steel, x, 0.33, z, Math.PI / 2, 0, 0); }
  const hz = []; for (const [x, z] of [[2.04, 0.75], [2.04, -0.75], [-2.04, 0.75], [-2.04, -0.75]]) { const b = add(new THREE.BoxGeometry(0.06, 0.1, 0.18), new THREE.MeshBasicMaterial({ color: 0x3a2200 }), x, 0.68, z); hz.push(b.material); }
  G.userData.hz = hz; return G;
}
function makeTree(h, seed) {
  const G = new THREE.Group(), bark = std(0x4a3a2a, 0.95), leaf = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.24 + 0.04 * rnd(seed), 0.42, 0.22 + 0.06 * rnd(seed * 3)), roughness: 0.95, flatShading: true });
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, h * 0.55, 8), bark); tr.position.y = h * 0.275; tr.castShadow = true; G.add(tr);
  const crown = new THREE.Group(); crown.position.y = h * 0.55; G.add(crown);
  for (let k = 0; k < 6; k++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + rnd(seed * 7 + k) * 0.6, 1), leaf);
    f.position.set((rnd(seed * 11 + k) - 0.5) * 1.6, 0.4 + rnd(seed * 13 + k) * 1.3, (rnd(seed * 17 + k) - 0.5) * 1.6); f.castShadow = true; crown.add(f); }
  G.userData.crown = crown; G.userData.seed = seed; return G;
}
// una persona de calle (ropa variada) con su gesto: 'movil', 'señala', 'boca', 'brazos', 'bolsillos'
function makePerson(o) {
  const G = new THREE.Group(), R = { G, o };
  const skin = std(o.skin ?? 0xc89a7a, 0.6), top = std(o.top, 0.85), legs = std(o.legs ?? 0x2b3346, 0.85), hair = std(o.hair ?? 0x2a1d14, 0.9), shoe = std(o.shoe ?? 0x1c1c1e, 0.6);
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, p = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; };
  const k = o.h ?? 1;                                                       // estatura relativa
  for (const s of [-1, 1]) { add(new RoundedBoxGeometry(0.11, 0.08, 0.26, 2, 0.03), shoe, 0.1 * s, 0.04, -0.03); add(new THREE.CapsuleGeometry(0.068, 0.62 * k, 5, 12), legs, 0.1 * s, 0.47 * k, 0); }
  add(new RoundedBoxGeometry(0.42, 0.6 * k, 0.24, 4, 0.1), top, 0, 1.1 * k, 0);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.075, 12, 10), top, 0.21 * s, 1.36 * k, 0);
  add(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 10), skin, 0, 1.43 * k, 0);
  const head = new THREE.Group(); head.position.set(0, 1.55 * k, 0); G.add(head);
  add(new THREE.SphereGeometry(0.1, 18, 14), skin, 0, 0, 0, 0, 0, 0, 0.92, 1.1, 1, head);
  add(new THREE.SphereGeometry(0.104, 18, 14, 0, Math.PI * 2, 0, o.long ? 2.2 : 1.55), hair, 0, 0.012, 0.01, -0.15, 0, 0, 0.95, 1.08, 1.04, head);
  if (o.cap) add(new THREE.CylinderGeometry(0.105, 0.105, 0.06, 18), std(o.cap, 0.7), 0, 0.075, 0, 0, 0, 0, 1, 1, 1, head), add(new THREE.BoxGeometry(0.12, 0.012, 0.09), std(o.cap, 0.7), 0, 0.05, -0.12, 0, 0, 0, 1, 1, 1, head);
  R.head = head;
  const SH = s => V(0.22 * s, 1.34 * k, 0), L1 = 0.27 * k, L2 = 0.25 * k;
  R.arms = [-1, 1].map(s => ({ s, up: add(new THREE.CylinderGeometry(0.052, 0.048, 1, 10), top, 0, 0, 0), fo: add(new THREE.CylinderGeometry(0.045, 0.04, 1, 10), o.sleeve ?? top, 0, 0, 0),
    el: add(new THREE.SphereGeometry(0.05, 10, 8), top, 0, 0, 0), hand: add(new THREE.SphereGeometry(0.045, 10, 8), skin, 0, 0, 0) }));
  if (o.gesto === 'movil') { R.phone = add(new RoundedBoxGeometry(0.075, 0.15, 0.012, 2, 0.006), std(0x111214, 0.3, 0.4), 0, 0, 0); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.064, 0.13), GLOW(0xbfd8ff, 1.3)); scr.position.z = 0.0065; R.phone.add(scr); }
  const rest = s => [V(0.26 * s, 0.82 * k, 0.02), V(0.3 * s, 1.1 * k, 0.1)];
  R.pose = (t) => {
    const ph = t * (0.5 + 0.3 * rnd(o.seed)) + o.seed * 7;
    R.head.rotation.set(0.05 * Math.sin(ph * 0.7), (o.look ?? 0) + 0.22 * Math.sin(ph * 0.45), 0);
    for (const A of R.arms) {
      let [W, E] = rest(A.s);
      if (o.gesto === 'movil' && A.s > 0) { W = V(0.1, 1.52 * k, -0.34); E = V(0.26, 1.28 * k, -0.12); }
      if (o.gesto === 'señala' && A.s > 0) { W = V(0.22 + 0.03 * Math.sin(ph), 1.5 * k + 0.03 * Math.sin(ph * 1.3), -0.5); E = V(0.3, 1.38 * k, -0.25); }
      if (o.gesto === 'boca' && A.s < 0) { W = V(-0.03, 1.5 * k, -0.15); E = V(-0.25, 1.22 * k, -0.12); }
      if (o.gesto === 'brazos') { W = V(0.08 * -A.s, 1.13 * k, -0.17); E = V(0.26 * A.s, 1.08 * k, -0.05); }
      if (o.gesto === 'bolsillos') { W = V(0.2 * A.s, 0.86 * k, -0.07); E = V(0.33 * A.s, 1.06 * k, 0.06); }
      const S = SH(A.s), r = ik2(S, W, E, L1, L2);
      between(A.up, S, r.E); A.el.position.copy(r.E); between(A.fo, r.E, r.W); A.hand.position.copy(r.W);
      if (R.phone && A.s > 0) { R.phone.position.copy(r.W).add(V(-0.01, 0.06, -0.02)); R.phone.rotation.set(0.15, Math.PI, 0); }
    }
  };
  R.pose(0);
  return R;
}
function cordon(pts) {                    // cinta de balizamiento (rojo y blanco) entre postes
  const tex = canvasTex(256, 32, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#d8241c' : '#f4f2ec'; x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32 + 32, 0); x.lineTo(i * 32 + 16, 32); x.lineTo(i * 32 - 16, 32); x.fill(); } }, { aniso: 4 });
  tex.wrapS = THREE.RepeatWrapping;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.0, 8), std(0xd8d8d8, 0.4, 0.5)); post.position.set(p.x, p.y + 0.5, p.z); post.castShadow = true; world.add(post);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 14), std(0x222222, 0.8)); base.position.set(p.x, p.y + 0.025, p.z); world.add(base);
    if (i === 0) continue;
    const a = pts[i - 1].clone().add(V(0, 0.98, 0)), b = p.clone().add(V(0, 0.98, 0)), mid = a.clone().lerp(b, 0.5).add(V(0, -0.06, 0));
    const c = new THREE.QuadraticBezierCurve3(a, mid, b), L = a.distanceTo(b);
    const geo = new THREE.TubeGeometry(c, 16, 0.035, 2, false); const t2 = tex.clone(); t2.needsUpdate = true; t2.repeat.set(L * 3, 1);
    const tape = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t2, roughness: 0.6, side: THREE.DoubleSide })); tape.scale.set(1, 1, 1); world.add(tape);
  }
}
function buildDay() {
  // cielo, sol y calima
  scene.background = HAZE.clone(); scene.fog = new THREE.FogExp2(HAZE.clone(), 0.009); scene.environmentIntensity = 0.45;
  sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: SUN_DIR } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vD; uniform vec3 uSun;
    void main(){ float h = clamp(vD.y, 0.0, 1.0);
      vec3 c = mix(vec3(0.74, 0.74, 0.72), vec3(0.36, 0.52, 0.74), pow(h, 0.5));
      float s = max(dot(vD, uSun), 0.0); c += vec3(1.0, 0.86, 0.62) * (pow(s, 300.0) * 6.0 + pow(s, 8.0) * 0.25);
      gl_FragColor = vec4(c, 1.0); }` }));
  sky.renderOrder = -1; sky.frustumCulled = false; world.add(sky);
  world.add(new THREE.HemisphereLight(0xb4c6dc, 0x5a4c3c, 1.15));
  sun = new THREE.DirectionalLight(0xfff0dc, 2.7); sun.position.copy(SUN_DIR).multiplyScalar(60); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 20, far: 110 }); sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; world.add(sun, sun.target);
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // calle: asfalto seco, línea discontinua, aceras y bordillos a los dos lados
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#4b4d51'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 16000; i++) { const v = 55 + rnd(i) * 45; x.fillStyle = `rgba(${v},${v},${v + 2},0.5)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); }
    for (let i = 0; i < 30; i++) { x.strokeStyle = 'rgba(25,25,27,0.5)'; x.lineWidth = 1.5; x.beginPath(); let px = rnd(i * 7) * 512, py = rnd(i * 9) * 512; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (rnd(i * 31 + k) - 0.5) * 60; py += (rnd(i * 37 + k) - 0.5) * 60; x.lineTo(px, py); } x.stroke(); } }, { aniso: 8 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(16, 3);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(90, 10.5), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.88, metalness: 0.0 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 1.95); road.receiveShadow = true; world.add(road);
  for (let x = -40; x < 40; x += 4.5) { const l = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.13), std(0xd8d8d0, 0.6)); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.006, 1.95); world.add(l); }
  const tiles = canvasTex(256, 256, (x) => { x.fillStyle = '#8d8a83'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#6e6b65'; x.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
    for (let i = 0; i < 3000; i++) { const v = 120 + rnd(i) * 40; x.fillStyle = `rgba(${v},${v - 3},${v - 8},0.35)`; x.fillRect(rnd(i * 2.7) * 256, rnd(i * 6.1) * 256, 2, 2); } }, { aniso: 8 });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  const walkM = new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.9 });
  const walk = (z0, z1) => { const t2 = tiles.clone(); t2.needsUpdate = true; t2.repeat.set(40, (z1 - z0) * 0.5); const m = new THREE.Mesh(new THREE.BoxGeometry(90, 0.14, z1 - z0), new THREE.MeshStandardMaterial({ map: t2, roughness: 0.9 })); m.position.set(0, 0.07, (z0 + z1) / 2); m.receiveShadow = true; world.add(m);
    const c = new THREE.Mesh(new THREE.BoxGeometry(90, 0.15, 0.16), std(0xb9b6ae, 0.7)); c.position.set(0, 0.075, z0 > 0 ? z0 : z1); c.receiveShadow = true; world.add(c); };
  walk(FZ, FZ + 2.2); walk(7.2, 10.6);
  // edificios: el que arde (con la puerta), los de los lados y los de enfrente (donde están los curiosos)
  const fireWin = (r, c) => (r === 0 && (c === 3 || c === 4 || c === 5)) || (r === 1 && (c === 4 || c === 5));
  const up = dayBuilding(18, 12, 10, 9, 4, 7, '#d9c7a4', fireWin); up.position.set(0, 3.2 + 6, FZ - 5); world.add(up);
  const nb = [[-15.5, 15, 13, 6, 5, '#c98f6a'], [15.5, 15, 16, 6, 6, '#e2d8c6'], [-1, 30, 26, 14, 9, '#bfb2a0']];
  for (const [x, w, h, cols, rows, col] of nb) { const b = dayBuilding(w, h, 10, cols, rows, x * 3, col); b.position.set(x, h / 2, FZ - 5 - (w > 20 ? 12 : 0)); world.add(b); }
  const opp = [[-12, 14, 14, 6, 5, '#e6dcc8'], [1.5, 13, 16, 6, 6, '#d7b48c'], [14, 12, 13, 5, 5, '#c9d0cf']];
  for (const [x, w, h, cols, rows, col] of opp) { const b = dayBuilding(w, h, 10, cols, rows, x * 5 + 3, col); b.position.set(x, h / 2, 10.6 + 5); b.rotation.y = Math.PI; world.add(b); }
  // la vecina que se asoma al balcón de enfrente
  const balc = new THREE.Group(); balc.position.set(0.6, 4.25, 10.6); world.add(balc);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.8), std(0xb7aa95, 0.85)); slab.position.set(0, 0, -0.4); slab.castShadow = slab.receiveShadow = true; balc.add(slab);
  const railM = std(0x2a2b2e, 0.5, 0.6);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.04), railM); rail.position.set(0, 1.0, -0.78); balc.add(rail);
  for (let i = 0; i < 15; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.94, 0.02), railM); b.position.set(-0.75 + i * 0.107, 0.53, -0.78); balc.add(b); }
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, 0.8), railM); b.position.set(0.78 * s, 0.53, -0.4); balc.add(b); }
  const nei = makePerson({ top: 0x7a3b5c, legs: 0x333344, hair: 0x5b3a22, long: true, gesto: 'boca', seed: 21, look: 0 }); nei.G.position.set(0.6, 4.31, 10.6 - 0.38); nei.G.rotation.y = 0.08; world.add(nei.G); people.push(nei);
  // árboles de las aceras y coches aparcados
  for (const [x, z, h, s] of [[-7, 8.6, 6.0, 1], [-2.6, 9.0, 6.4, 2], [4.6, 8.8, 5.8, 3], [9.5, 8.7, 6.2, 4], [-6.5, -4.0, 5.6, 5], [6.8, -4.1, 6.0, 6]]) { const t = makeTree(h, s); t.position.set(x, 0.14, z); world.add(t); trees.push(t); }
  for (const [x, z, ry, col] of [[-10.5, 6.25, 0, 0x2b4a7a], [7.2, 6.25, Math.PI, 0xb8b8b4], [5.6, -2.36, Math.PI, 0x7a1f22]]) { const c = makeCar(col); c.position.set(x, 0, z); c.rotation.y = ry; world.add(c); if (x > 7) hazards.push(...c.userData.hz); }
  // cordón al otro lado de la calle y en la esquina del edificio, con curiosos detrás
  cordon([V(-3.5, 0.14, 7.35), V(-0.5, 0.14, 7.35), V(2.5, 0.14, 7.35), V(5.5, 0.14, 7.35)]);
  cordon([V(-2.9, 0.14, FZ + 0.1), V(-2.9, 0.14, FZ + 2.1)]);
  const P0 = [
    { x: -1.6, z: 7.95, top: 0xc0392b, legs: 0x2b3346, gesto: 'movil', seed: 1, look: 0.1 }, { x: -0.8, z: 8.25, top: 0x3d5a80, legs: 0x1f1f22, gesto: 'brazos', seed: 2, hair: 0x111111, h: 1.04 },
    { x: 0.25, z: 7.9, top: 0xe7e2d6, legs: 0x4a5b78, gesto: 'señala', seed: 3, look: -0.1, hair: 0x6b4a2a, h: 0.97 }, { x: 1.2, z: 8.3, top: 0x4f6b3a, legs: 0x2b3346, gesto: 'bolsillos', seed: 4, cap: 0x222222 },
    { x: 2.15, z: 7.95, top: 0xe0a32b, legs: 0x23262e, gesto: 'movil', seed: 5, long: true, hair: 0x2b1b10, h: 0.95 }, { x: 3.2, z: 8.2, top: 0x6c6f75, legs: 0x1b1d22, gesto: 'boca', seed: 6, long: true, hair: 0xa07a4a, h: 0.94 },
    { x: 4.3, z: 8.0, top: 0x1f3d5a, legs: 0x4a4038, gesto: 'brazos', seed: 7, cap: 0xa83226 },
    { x: -3.6, z: FZ + 0.9, top: 0x8a4b2f, legs: 0x2b3346, gesto: 'movil', seed: 8, look: -0.4 }, { x: -4.4, z: FZ + 1.5, top: 0xd8d4cc, legs: 0x31353c, gesto: 'señala', seed: 9, look: -0.5, long: true, h: 0.95 },
    { x: -5.2, z: FZ + 0.8, top: 0x2e6b6b, legs: 0x1f1f22, gesto: 'bolsillos', seed: 10, look: -0.6, h: 1.03 },
  ];
  for (const q of P0) { const p = makePerson(q); p.G.position.set(q.x, 0.14, q.z); p.G.rotation.y = q.z > 0 ? Math.atan2(q.x, 13.5) : -Math.PI / 2 + 0.3; world.add(p.G); people.push(p); }
}

// ------------------------------------------------------------------ tiempos y cámara (un dron que no para y sigue al aire)
let T = {}, KEYS = null, KH = null, COUNT = [];
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  T.scan1 = 0.85;                                                    // el escáner deja la botella en rayos X
  T.r0 = T.llegaran - 0.05; T.r1 = T.boca + 0.05;                    // el golpe rojo sube hasta la boca
  T.l0 = T.reventarian - 0.35; T.l1 = T.pulmones + 0.15;             // los pulmones se hinchan… y revientan
  T.rw0 = Math.max(T.pulmones + 0.45, T.poreso - 0.55); T.rw1 = T.poreso - 0.02;   // se rebobina
  T.h0 = T.abrir - 0.45; T.h1 = T.grifo - 0.05; T.h2 = T.manorreductor - 0.05; T.h3 = T.baja - 0.2;   // la mano: llega, agarra, gira, se va
  T.o0 = T.grifo; T.o1 = T.manorreductor + 0.1;                      // el aire sale de la botella al reductor
  T.a0 = T.manguera - 0.05; T.a1 = T.manom - 0.05;                   // llena la de alta
  T.tl0 = T.silbato + 0.15; T.tl1 = T.pita - 0.04;                   // ⏩: la aguja baja hasta la reserva
  T.rv0 = Math.max(T.pita + 1.0, T.media - 0.45); T.rv1 = T.media - 0.12;   // ⏪ vuelve a 300
  T.m0 = T.media - 0.05; T.m1 = T.pulmo - 0.02;                       // llena la de media
  T.ex0 = T.solo - 0.05; T.ex1 = T.inspiras - 0.15;                   // espira: no entra aire
  T.in0 = T.inspiras - 0.1; T.in1 = T.mascara - 0.05;                 // inspira: entra aire
  T.sc0 = T.todo - 0.1; T.sc1 = T.espaldera - 0.05;                   // la botella vuelve a ser de verdad
  T.al0 = T.pita2 - 0.05; T.al1 = T.cuantas - 0.1;                    // la alarma del bodyguard
  T.b0 = T.encuentren - 0.25; T.b1 = T.encuentren + 0.3;              // la linterna le encuentra
  T.sum = T.cuantas + 0.45;                                           // el resumen: las diez a la vez
  COUNT = [T.botella, T.grifo, T.manorreductor, T.manguera, T.manom, T.silbato, T.pulmo, T.mascara, T.espaldera, T.bodyguard];
  KEYS = camKeys(); KH = KEYS;
}
function camKeys() {
  const K = [
    [0, [1.55, 2.45, 10.2, 0.1, 1.45, -1.0, 40]],                    // desde detrás de los curiosos: la calle, el bombero y el edificio ardiendo
    [T.trescientos, [1.25, 2.1, 5.6, 0.0, 1.4, -0.3, 38]],           // baja por encima de ellos…
    [T.bares + 0.3, [0.95, 1.1, 2.6, 0.0, 1.3, 0.05, 36]],           // se acerca a la botella (300 bar)
    [T.boca - 0.15, [1.55, 1.8, 1.35, 0.0, 1.42, -0.1, 34]],         // por encima del hombro derecho: el golpe rojo sube a la cara
    [T.boca + 0.5, [1.75, 1.6, -0.3, 0.0, 1.4, -0.1, 34]],           // por la derecha (rodeándole)
    [T.reventarian + 0.15, [1.2, 1.52, -1.95, 0.0, 1.32, -0.05, 34]], // de frente (derecha): los pulmones en rayos X
    [T.pulmones + 0.45, [1.25, 1.5, -2.0, 0.0, 1.32, -0.05, 34]],
    [T.abrir - 0.05, [1.3, 0.95, 1.95, 0.02, 1.02, 0.2, 34]],        // por la derecha hasta detrás, abajo: la mano abre el grifo
    [T.siete + 0.2, [1.1, 0.98, 1.75, 0.02, 0.98, 0.22, 33]],
    [T.alta, [-1.35, 1.3, 1.75, -0.12, 1.28, 0.12, 34]],             // la de alta sube por la izquierda
    [T.manom - 0.1, [-1.75, 1.55, -0.55, -0.12, 1.32, -0.15, 33]],   // por el hombro, al pecho
    [T.silbato, [-1.3, 1.5, -1.45, -0.12, 1.3, -0.18, 31]],
    [T.reserva + 0.5, [-1.2, 1.5, -1.42, -0.12, 1.3, -0.18, 31]],
    [T.pulmo, [-0.3, 1.6, -1.95, 0.0, 1.46, -0.15, 32]],             // de frente: la de media, el pulmoautomático
    [T.inspiras, [-0.22, 1.63, -1.72, 0.0, 1.52, -0.18, 31]],
    [T.mascara + 0.1, [-0.18, 1.66, -1.58, 0.0, 1.56, -0.18, 31]],
    [T.todo + 0.25, [1.6, 1.85, -0.7, 0.0, 1.35, 0.0, 36]],          // por la derecha…
    [T.espaldera, [1.55, 2.2, 2.35, 0.0, 1.15, 0.1, 37]],            // …hasta detrás: la espaldera
    [T.espaldera + 0.5, [1.42, 2.25, 2.2, 0.0, 1.15, 0.1, 37]],
    [T.bodyguard - 0.1, [0.3, 2.55, -1.4, 0.15, 1.2, -5.5, 44]],     // vuela por encima, hacia la puerta
    [T.pita2 + 0.25, [0.1, 1.85, -5.25, 0.15, 0.4, -7.85, 44]],       // entra en el humo
    [T.quieto, [0.95, 2.05, -6.45, 0.05, 0.32, -8.0, 38]],           // en el suelo, el bodyguard pitando
    [T.encuentren + 0.3, [0.88, 1.98, -6.42, 0.05, 0.32, -8.0, 38]],
    [T.cuantas + 0.05, [0.1, 2.1, -3.3, 0.2, 0.9, -6.8, 44]],         // sale hacia atrás…
    [T.cuantas + 0.4, [0.45, 2.75, -0.6, 0.0, 1.2, -2.5, 40]],       // …por encima de ellos…
    [T.sum + 0.3, [0.55, 2.0, 2.6, -0.45, 1.2, -1.3, 34]],           // …hasta el resumen: las diez
    [T.compartir + 0.6, [0.7, 2.25, 3.05, -0.45, 1.22, -1.3, 36]],
    [T.end, [1.05, 3.0, 4.4, -0.4, 1.4, -1.3, 40]],
  ];
  for (let i = 1; i < K.length; i++) K[i][0] = Math.max(K[i][0], K[i - 1][0] + 0.25);
  return K;
}

function hermite(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0][1].slice();
  if (t >= keys[n - 1][0]) return keys[n - 1][1].slice();
  let i = 0; while (i < n - 2 && t > keys[i + 1][0]) i++;
  const D = keys[0][1].length, out = [];
  const slope = (j, c) => (keys[j + 1][1][c] - keys[j][1][c]) / (keys[j + 1][0] - keys[j][0]);
  const tang = (j, c) => { if (j === 0 || j === n - 1) return 0; const a = slope(j - 1, c), b = slope(j, c); if (a * b <= 0) return 0; const m = (a + b) / 2, lim = 3 * Math.min(Math.abs(a), Math.abs(b)); return Math.sign(m) * Math.min(Math.abs(m), lim); };
  const t0 = keys[i][0], h = keys[i + 1][0] - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
  for (let c = 0; c < D; c++) { const v0 = keys[i][1][c], v1 = keys[i + 1][1][c]; out.push((2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * tang(i, c) + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * tang(i + 1, c)); }
  return out;
}
const _m = new THREE.Matrix4();
function pose(p, tgt, fov) { _m.lookAt(p, tgt, V(0, 1, 0)); return { p: p.clone(), q: new THREE.Quaternion().setFromRotationMatrix(_m), fov, focus: p.distanceTo(tgt), ap: 0 }; }

// ------------------------------------------------------------------ utilidades de la capa 2D
function proj(v) { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * W2, y: (-p.y * 0.5 + 0.5) * H2, ok: p.z < 1 }; }
function label(x, y, text, col, a, o = {}) {
  if (a <= 0.005) return;
  const px = o.px || 54, s = o.s || 1, sub = o.sub || null, icon = o.icon || null;
  g.save(); g.globalAlpha = cl(a); g.translate(cl(x, 200, W2 - 200), cl(y, LBLY, H2 - 300)); g.scale(s, s);
  g.font = `400 ${px}px Bebas`; let tw = g.measureText(text).width;
  if (sub) { g.font = `400 ${Math.round(px * 0.56)}px Bebas`; tw = Math.max(tw, g.measureText(sub).width); }
  const w = tw + (icon ? 104 : 60), h = px * 1.45 + (sub ? px * 0.62 : 0);
  rr(-w / 2, -h / 2, w, h, Math.min(h / 2, px * 0.72)); g.fillStyle = 'rgba(8,10,14,0.86)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  const cx = -w / 2 + 46, ty = sub ? -h / 2 + px * 1.02 : px * 0.36;
  if (icon === 'ok') { g.beginPath(); g.moveTo(cx - 16, 0); g.lineTo(cx - 4, 13); g.lineTo(cx + 18, -14); g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round'; g.stroke(); }
  else if (icon === 'warn') { g.beginPath(); g.moveTo(cx, -20); g.lineTo(cx + 21, 17); g.lineTo(cx - 21, 17); g.closePath(); g.fillStyle = col; g.fill(); txt('!', cx, 13, 30, '#0b0d10', 400, 'center', 'Bebas'); }
  else if (icon === 'up' || icon === 'down') { const d = icon === 'up' ? 1 : -1; g.beginPath(); g.moveTo(cx, 18 * d); g.lineTo(cx, -16 * d); g.moveTo(cx - 13, -4 * d); g.lineTo(cx, -18 * d); g.lineTo(cx + 13, -4 * d); g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
  txt(text, icon ? 24 : 0, ty, px, '#F4F6F8', 400, 'center', 'Bebas');
  if (sub) txt(sub, icon ? 24 : 0, ty + px * 0.66, Math.round(px * 0.56), 'rgba(226,232,240,0.82)', 400, 'center', 'Bebas');
  g.restore();
}
function tag(P, text, col, a, dx, dy, o = {}) {      // rótulo con su línea hasta el aparato
  if (a <= 0.005) return;
  const q = proj(P); if (!q.ok) return;
  const lx = o.at ? o.at[0] : cl(q.x + dx, 200, W2 - 200), ly = o.at ? o.at[1] : cl(q.y + dy, LBLY, H2 - 300);
  g.save(); g.globalAlpha = cl(a);
  g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(lx, ly); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  g.beginPath(); g.arc(q.x, q.y, 10, 0, 7); g.fillStyle = col; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(8,10,14,0.9)'; g.stroke();
  g.restore();
  label(lx, ly, text, col, a, o);
}
function stamp(text, y, col, a, px = 170, rot = -0.06) {
  if (a <= 0.005) return;
  const k = bk(cl(a * 1.4));
  g.save(); g.globalAlpha = cl(a * 1.6); g.translate(540, y); g.rotate(rot); g.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
  g.font = `400 ${px}px Bebas`; const w = g.measureText(text).width + 80;
  rr(-w / 2, -px * 0.62, w, px * 1.06, 26); g.fillStyle = 'rgba(8,8,10,0.6)'; g.fill(); g.strokeStyle = col; g.lineWidth = 10; g.stroke();
  g.shadowColor = col; g.shadowBlur = 40; txt(text, 0, px * 0.33, px, col, 400, 'center', 'Bebas'); g.shadowBlur = 0;
  g.restore();
}

function subframes(t) {
  const a = camAt(t - 1 / 240), b = camAt(t + 1 / 240);
  const ang2 = a.q.angleTo(b.q), mv = a.p.distanceTo(b.p) / Math.max(0.5, (a.focus + b.focus) / 2);
  return Math.max(1, Math.min(4, Math.ceil((ang2 + mv) * H2 / (a.fov * Math.PI / 180) / 22)));
}

function camAt(t) {
  const v = hermite(KH, t), s = Math.min(1, Math.hypot(v[0] - v[3], v[1] - v[4], v[2] - v[5]) / 2);
  const sh = 0.01 * pulse(t, T.pulmones + 0.06, 0.16) + 0.004 * pulse(t, T.boca, 0.1);
  return pose(V(v[0] + 0.015 * s * Math.sin(t * 0.7) + sh * Math.sin(t * 93), v[1] + 0.012 * s * Math.sin(t * 0.53 + 1) + sh * Math.sin(t * 71 + 1), v[2]), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t (todo depende solo de t)
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
const flick = (t, s) => 0.78 + 0.13 * Math.sin(t * 11.3 + s * 2.1) + 0.09 * Math.sin(t * 23.7 + s * 5.3) * Math.sin(t * 3.1 + s);
let TIMED = [], bgRed, curBar = 0;
const lerpV = (a, b, k) => a.clone().lerp(b, k);
function scanY(t) {               // línea del escáner: por encima, rayos X; por debajo, la botella pintada
  if (t < T.sc0) return mx(1.5, 0.85, e3(pr(t, 0.0, T.scan1)));
  return mx(0.85, 1.5, e3(pr(t, T.sc0, T.sc1 - T.sc0)));
}
function barAt(t) {
  let b = 0;
  if (t >= T.a1 - 0.05) b = 300 * cl(bk(pr(t, T.a1 - 0.05, 0.45)), 0, 1.04);
  if (t >= T.tl0) b = mx(300, 55, e3(pr(t, T.tl0, T.tl1 - T.tl0)));
  if (t >= T.rv0) b = mx(55, 300, e3(pr(t, T.rv0, T.rv1 - T.rv0)));
  return b;
}
function breath(t) {             // −1 espira … +1 inspira (en la máscara)
  if (t < T.ex0) return 0;
  if (t < T.ex1) return -Math.sin(Math.PI * pr(t, T.ex0, T.ex1 - T.ex0));
  if (t < T.in1 + 0.3) return Math.sin(Math.PI * pr(t, T.in0, T.in1 + 0.3 - T.in0));
  return 0.35 * Math.sin((t - T.in1) * 3.2) * (1 - sm(T.espaldera - 0.4, T.espaldera, t));
}
const hl = (t, t0, t1) => sm(t0 - 0.1, t0 + 0.1, t) * (1 - sm(t1 - 0.25, t1, t));
function update(t) {
  const P0 = camAt(t);
  cam.position.copy(P0.p); cam.quaternion.copy(P0.q); cam.fov = P0.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = true; dofMat.uniforms.uFocus.value = P0.focus; dofMat.uniforms.uAp.value = mx(0.26, 0.07, sm(0.9, 2.4, P0.focus));
  // dentro del humo: niebla espesa y cálida
  const ins = sm(FZ + 0.4, FZ - 0.5, cam.position.z);
  scene.fog.density = mx(0.012, 0.2, ins); scene.fog.color.setRGB(mx(HAZE.r, 0.075, ins), mx(HAZE.g, 0.05, ins), mx(HAZE.b, 0.035, ins));
  scene.background.copy(scene.fog.color); sky.visible = ins < 0.99;
  // la vida alrededor: curiosos que miran y señalan, árboles con viento, intermitentes de emergencia
  for (const q of people) q.pose(t);
  D.G.visible = t > T.todo;                                   // el del suelo aparece cuando la cámara va a entrar
  for (const tr of trees) { const c = tr.userData.crown, sd = tr.userData.seed; c.rotation.z = 0.025 * Math.sin(t * 1.3 + sd) + 0.012 * Math.sin(t * 3.1 + sd * 2); c.rotation.x = 0.018 * Math.sin(t * 1.1 + sd * 1.7); }
  const hzOn = (t * 1.6) % 1 < 0.5; for (const m of hazards) m.color.setRGB(hzOn ? 2.2 : 0.25, hzOn ? 1.2 : 0.14, 0.0);
  for (const u of TIMED) u.uTime.value = t;
  for (const f of FLAMES) f.u.uCam.value.copy(cam.position);
  // luces: autobomba (azul), fuego de las ventanas, puerta, cuarto
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = 2 + 30 * on; bgL.intensity = 1 + 14 * on;
  for (const F of fireLights) F.L.intensity = F.base * flick(t, F.seed);
  for (const o of outFires) o.mat.emissiveIntensity = o.k * flick(t, 7);
  doorL.intensity = 14 * flick(t, 3); roomL.intensity = 30 * flick(t, 5);
  // ---- el protagonista
  const ys = scanY(t);
  H.scanUp.constant = ys; H.xu.uScan.value = ys; H.gu.uScan.value = ys; H.xu.uTime.value = t;
  const redOn = sm(T.r0 - 0.05, T.r0 + 0.1, t) * (1 - sm(T.rw0, T.rw1, t));
  H.xu.uRed.value = 0.55 * redOn * (1 - sm(T.r0 + 0.3, T.r1, t)) + 0.0;
  const mf = H.media.fu, af = H.alta.fu;
  af.uTime.value = mf.uTime.value = t;
  mf.uRed.value = redOn; mf.uRedHead.value = cl(e3(pr(t, T.r0 + 0.2, T.r1 - T.r0 - 0.2)) * (1 - e3(pr(t, T.rw0, T.rw1 - T.rw0))));
  const flowOut = 1 - sm(T.sc0, T.sc1, t);
  af.uHead.value = e3(pr(t, T.a0, T.a1 - T.a0)); af.uI.value = sm(T.a0 - 0.05, T.a0 + 0.1, t) * flowOut;
  af.uCol.value.setRGB(0.55, 1.1, 2.4);
  const br = breath(t);
  mf.uHead.value = e3(pr(t, T.m0, T.m1 - T.m0)); mf.uI.value = sm(T.m0 - 0.05, T.m0 + 0.1, t) * flowOut * (1 + 0.8 * Math.max(0, br));
  mf.uCol.value.setRGB(0.25, 0.65, 1.7);
  // la mano derecha abre el grifo
  const reach = e3(pr(t, T.h0, T.h1 - T.h0)) * (1 - e3(pr(t, T.h2 + 0.08, T.h3 - T.h2)));
  const grip = V(WHEEL.x + 0.07, WHEEL.y + 0.05, WHEEL.z + 0.0), mid = V(0.43, 1.0, 0.14);
  const hand = reach < 0.5 ? lerpV(REST_H(1), mid, e3(reach * 2)) : lerpV(mid, grip, e3(reach * 2 - 1));
  const elb = lerpV(REST_E(1), V(0.52, 1.2, 0.3), reach);
  const turning = sm(T.h1, T.h1 + 0.1, t) * (1 - sm(T.h2 - 0.1, T.h2 + 0.05, t));
  H.pose(REST_H(-1), hand, REST_E(-1), elb, 0.35 * turning * Math.sin((t - T.h1) * 14));
  H.wheel.rotation.x = -2.6 * Math.PI * e3(pr(t, T.h1 + 0.02, T.h2 - T.h1 - 0.05));
  // manómetro, silbato, pulmoautomático, pecho que respira
  curBar = barAt(t);
  H.needle.rotation.z = -((-225 + curBar / 300 * 270) * Math.PI / 180) - Math.PI / 2;
  const whistle = sm(T.pita - 0.04, T.pita + 0.04, t) * (1 - sm(T.rv0 - 0.1, T.rv0 + 0.05, t));
  H.torso.scale.set(1, 1, 1 + 0.025 * br);
  // las piezas se encienden cuando se nombran
  const P1 = (k, t0, t1, b = 0.12) => H.hiSet(k, (b + 0.55 * pulse(t, t0 + 0.12, 0.22)) * hl(t, t0, t1));
  
  P1('grifo', T.grifo, T.siete + 0.6); P1('reductor', T.manorreductor, T.manguera);
  H.hiSet('silbato', (0.12 + 0.55 * pulse(t, T.silbato + 0.12, 0.22) + 0.9 * whistle * (0.6 + 0.4 * Math.sin(t * 40))) * hl(t, T.silbato, T.media));
  P1('manometro', T.manom, T.media); P1('pulmo', T.pulmo, T.mascara + 0.4);
  H.hiSet('pulmo', H.mats.pulmo[0].emissiveIntensity + 0.7 * Math.max(0, br) * sm(T.in0 - 0.2, T.in0, t));
  H.hiSet('mascara', 0); H.hiSet('espaldera', 0); H.hiSet('alta', 0); H.hiSet('media', 0); H.hiSet('botella', 0);
  H.mats.mascara[1].emissiveIntensity = 0.0 * Math.max(0, br) * sm(T.in0 - 0.2, T.in0, t) * (1 - sm(T.todo, T.espaldera, t));
  // los pulmones (rayos X): se hinchan, revientan y se rebobina
  const lOn = sm(T.l0, T.l0 + 0.2, t) * (1 - sm(T.rw0 + 0.1, T.rw1, t));
  lungs.visible = lOn > 0.01;
  const inf = e3(pr(t, T.reventarian - 0.05, T.pulmones - T.reventarian + 0.1)) * (1 - e3(pr(t, T.rw0, T.rw1 - T.rw0)));
  const jit = 0.03 * Math.sin(t * 47) * sm(T.reventarian + 0.3, T.pulmones, t);
  lungs.scale.set(1 + 0.32 * inf + jit, 1 + 0.14 * inf + jit, 1 + 0.32 * inf + jit);
  lungs.position.set(0, -1.29 * (0.14 * inf + jit), 0);
  lungU.uI.value = lOn * (0.3 + 0.35 * inf + 1.4 * pulse(t, T.pulmones + 0.05, 0.1)); ribU.uI.value = lOn * 0.14;
  const inh = Math.max(0, br) * sm(T.in0 - 0.2, T.in0, t) * (1 - sm(T.todo, T.espaldera, t)); H.puffU.uI.value = 0.9 * inh; H.puff.scale.set(0.05 + 0.03 * inh, 0.035 + 0.025 * inh, 0.04 + 0.02 * inh);
  // ---- el compañero: luz verde del bodyguard
  P.led.material.color.setRGB(0.1, ((t * 1.1) % 1 < 0.12 ? 2.2 : 0.25), 0.3);
  H.led.material.color.setRGB(0.1, ((t * 1.1 + 0.5) % 1 < 0.12 ? 2.2 : 0.25), 0.3);
  // ---- el del suelo: alarma (luz roja que parpadea) y la linterna que le encuentra
  const alarm = sm(T.bodyguard - 0.6, T.bodyguard - 0.3, t) * (1 - sm(T.al1 + 0.6, T.al1 + 1.0, t));
  const fl = (t * 4.2) % 1 < 0.45 ? 1 : 0.08;
  D.led.material.color.setRGB(0.4 + 5.5 * fl * alarm, 0.04, 0.03); D.scr.material.color.setRGB(0.6 + 1.6 * fl * alarm, 0.15, 0.12);
  bgRed.intensity = 2.6 * fl * alarm;
  D.hiSet('bodyguard', 0.6 * fl * alarm * hl(t, T.bodyguard, T.cuantas));
  const bk2 = sm(T.b0 - 0.1, T.b0 + 0.1, t) * (1 - sm(T.cuantas + 0.2, T.cuantas + 0.6, t));
  const tgt = lerpV(V(1.9, 0.3, FZ - 3.4), D.G.localToWorld(V(0, 1.25, -0.1)), e3(pr(t, T.b0, T.b1 - T.b0)));
  beamL.intensity = 9 * bk2; beamL.target.position.copy(tgt); beamL.target.updateMatrixWorld();
  beam.material.uniforms.uI.value = 0.45 * bk2;
  const bd = tgt.clone().sub(beamL.position), bl = bd.length();
  beam.position.copy(beamL.position).add(bd.clone().multiplyScalar(0.5)); beam.scale.set(1, bl / 3.2, 1);
  beam.quaternion.setFromUnitVectors(V(0, -1, 0), bd.normalize());
  const lit = bk2 * sm(T.b1 - 0.25, T.b1, t);
  D.tape[0].emissiveIntensity = 1 + 2.2 * lit; D.tape[1].emissiveIntensity = 1 + 1.8 * lit;
}

// ------------------------------------------------------------------ la capa 2D
const NAMES = ['BOTELLA', 'GRIFO', 'MANORREDUCTOR', 'MANGUERAS', 'MANÓMETRO', 'SILBATO', 'PULMOAUTOMÁTICO', 'MÁSCARA', 'ESPALDERA', 'BODYGUARD'];
function counter(t) {
  const a = sm(T.botella - 0.1, T.botella + 0.2, t) * (1 - sm(T.compartir - 0.35, T.compartir - 0.1, t));
  if (a <= 0.01) return;
  const n = COUNT.filter(x => t >= x).length, last = Math.max(...COUNT.filter(x => t >= x), -9);
  const pop = 1 + 0.12 * pulse(t, last + 0.12, 0.16);
  g.save(); g.globalAlpha = a; g.translate(540, 612); g.scale(pop, pop);
  rr(-250, -40, 500, 80, 40); g.fillStyle = 'rgba(8,10,14,0.86)'; g.fill(); g.strokeStyle = n === 10 ? GREEN2 : CYAN2; g.lineWidth = 4; g.stroke();
  txt('PIEZAS', -150, 17, 46, '#F4F6F8', 400, 'center', 'Bebas');
  for (let i = 0; i < 10; i++) { rr(-80 + i * 24, -14, 18, 28, 5); g.fillStyle = i < n ? (n === 10 ? GREEN2 : CYAN2) : 'rgba(255,255,255,0.14)'; g.fill(); }
  txt(`${n}/10`, 195, 18, 50, n === 10 ? GREEN2 : '#F4F6F8', 400, 'center', 'Bebas');
  g.restore();
}
function ring(P, col, a, t0, r0 = 30) {
  if (a <= 0.01) return; const q = proj(P); if (!q.ok) return;
  g.save(); g.globalAlpha = cl(a); g.strokeStyle = col; g.lineWidth = 5; g.shadowColor = col; g.shadowBlur = 16;
  const r = r0 * (1 + 0.5 * Math.exp(-Math.pow((T.now - t0 - 0.15) / 0.18, 2)));
  g.beginPath(); g.arc(q.x, q.y, r, 0, 7); g.stroke(); g.restore();
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2); T.now = t;
  const win = (t0, t1) => sm(t0 - 0.12, t0 + 0.08, t) * (1 - sm(t1 - 0.2, t1, t));
  const pop = t0 => 1 + 0.16 * pulse(t, t0 + 0.12, 0.18);
  const W = p => worldOf(H, p);
  const sumOn = sm(T.sum - 0.1, T.sum + 0.3, t);
  counter(t);
  ring(W(WHEEL), CYAN2, win(T.grifo - 0.05, T.manguera - 0.1), T.grifo, 26);
  ring(W(REDC), GOLD2, win(T.manorreductor - 0.05, T.manguera - 0.1), T.manorreductor, 26);
  ring(W(GAUGE), CYAN2, win(T.manom - 0.05, T.media - 0.1), T.manom, 30);
  ring(W(WHISTLE), GOLD2, win(T.silbato - 0.05, T.media - 0.1), T.silbato, 22);
  ring(W(LDVP), GOLD2, win(T.pulmo - 0.05, T.mascara - 0.1), T.pulmo, 30);
  ring(W(V(0.0, 1.64, -0.19)), CYAN2, win(T.mascara - 0.05, T.todo + 0.35), T.mascara, 62);
  ring(worldOf(D, BGP), RED2, win(T.bodyguard - 0.05, T.encuentren + 0.5), T.bodyguard, 30);
  // la botella: 300 bar
  tag(W(BC.clone().add(V(-0.05, 0.1, 0.07))), 'BOTELLA', CYAN2, win(T.botella - 0.05, T.llegaran + 0.1), 0, 0, { px: 62, at: [300, 1000], s: pop(T.botella) });
  label(720, 1330, '300 BAR', GOLD2, win(T.trescientos - 0.05, T.llegaran + 0.1), { px: 120, s: pop(T.trescientos) });
  // el golpe rojo en la boca y los pulmones
  tag(W(LDVP), '300 BAR EN LA BOCA', RED2, win(T.boca - 0.1, T.reventarian + 0.05), 0, 0, { px: 60, icon: 'warn', at: [540, 1380], s: pop(T.boca) });
  const xa = win(T.pulmones - 0.05, T.rw0 + 0.1);
  if (xa > 0.01) { const q = proj(W(V(0, 1.3, -0.01))); if (q.ok) { g.save(); g.globalAlpha = xa; g.translate(q.x, q.y); const s = 0.8 + 0.25 * bk(pr(t, T.pulmones - 0.05, 0.3)); g.scale(s, s);
    g.strokeStyle = RED2; g.lineWidth = 26; g.lineCap = 'round'; g.shadowColor = RED2; g.shadowBlur = 30; g.beginPath(); g.moveTo(-110, -110); g.lineTo(110, 110); g.moveTo(110, -110); g.lineTo(-110, 110); g.stroke(); g.restore(); } }
  label(540, 1460, 'PULMONES REVENTADOS', RED2, win(T.pulmones - 0.05, T.rw0 + 0.1), { px: 70, icon: 'warn', s: pop(T.pulmones) });
  const rwA = Math.max(win(T.rw0, T.rw1 + 0.05), win(T.rv0, T.rv1 + 0.05));
  if (rwA > 0.01) { g.save(); g.globalAlpha = rwA; g.translate(540, 760); rr(-90, -46, 180, 92, 46); g.fillStyle = 'rgba(8,10,14,0.85)'; g.fill(); g.strokeStyle = WHITE2; g.lineWidth = 4; g.stroke();
    g.fillStyle = WHITE2; for (const dx of [-26, 14]) { g.beginPath(); g.moveTo(dx + 20, -24); g.lineTo(dx + 20, 24); g.lineTo(dx - 16, 0); g.closePath(); g.fill(); } g.restore(); }
  // el grifo y el manorreductor: 300 → 7
  tag(W(WHEEL), 'GRIFO', CYAN2, win(T.grifo - 0.05, T.manguera - 0.1) * (1 - sumOn), 0, 0, { px: 62, at: [290, 960], s: pop(T.grifo) });
  tag(W(REDC), 'MANORREDUCTOR', GOLD2, win(T.manorreductor - 0.05, T.manguera - 0.1) * (1 - sumOn), 0, 0, { px: 60, sub: 'REDUCTOR DE PRESIÓN', at: [330, 1290], s: pop(T.manorreductor) });
  const ca = win(T.baja - 0.1, T.manguera - 0.1);
  if (ca > 0.01) { const k = e3(pr(t, T.baja, T.siete - T.baja + 0.1)), v = Math.round(mx(300, 7, k));
    label(760, 1500, `${v} BAR`, v < 20 ? GREEN2 : GOLD2, ca, { px: 110, s: 1 + 0.1 * pulse(t, T.siete + 0.12, 0.15) }); }
  // la de alta, el manómetro y el silbato
  tag(W(H.alta.curve.getPointAt(0.3)), 'MANGUERA DE ALTA', CYAN2, win(T.manguera - 0.05, T.manom - 0.1), 0, 0, { px: 60, sub: '300 BAR', at: [330, 1300], s: pop(T.manguera) });
  tag(W(GAUGE), 'MANÓMETRO', CYAN2, win(T.manom - 0.05, T.media - 0.1), 0, 0, { px: 62, sub: `${Math.round(Math.min(300, curBar))} BAR`, at: [760, 1290], s: pop(T.manom) });
  tag(W(WHISTLE), 'SILBATO', GOLD2, win(T.silbato - 0.05, T.media - 0.1), 0, 0, { px: 62, sub: 'AVISADOR ACÚSTICO', at: [760, 930], s: pop(T.silbato) });
  const tla = win(T.tl0, T.tl1 + 0.1);
  if (tla > 0.01) { g.save(); g.globalAlpha = tla; g.translate(540, 760); rr(-150, -46, 300, 92, 46); g.fillStyle = 'rgba(8,10,14,0.85)'; g.fill(); g.strokeStyle = WHITE2; g.lineWidth = 4; g.stroke();
    g.fillStyle = WHITE2; for (const dx of [-100, -64]) { g.beginPath(); g.moveTo(dx - 18, -22); g.lineTo(dx - 18, 22); g.lineTo(dx + 16, 0); g.closePath(); g.fill(); }
    txt('+25 MIN', 40, 18, 54, WHITE2, 400, 'center', 'Bebas'); g.restore(); }
  label(540, 1540, '¡RESERVA! SAL YA', RED2, win(T.pita - 0.05, T.rv0 + 0.1), { px: 72, icon: 'warn', s: pop(T.pita) });
  // la de media y el pulmoautomático
  tag(W(H.media.curve.getPointAt(0.86)), 'MANGUERA DE MEDIA', BLUE2, win(T.media - 0.05, T.solo - 0.05), 0, 0, { px: 60, sub: '7 BAR', at: [760, 1320], s: pop(T.media) });
  tag(W(LDVP), 'PULMOAUTOMÁTICO', GOLD2, win(T.pulmo - 0.05, T.mascara - 0.1), 0, 0, { px: 60, sub: 'REDUCTOR DE CAUDAL', at: [320, 1180], s: pop(T.pulmo) });
  const brv = breath(t);
  label(540, 1560, brv > 0 ? 'INSPIRAS: ENTRA AIRE' : 'ESPIRAS: NO ENTRA', brv > 0 ? GREEN2 : '#9AA4B2', win(T.solo, T.mascara - 0.05) * (Math.abs(brv) > 0.12 ? 1 : 0.35), { px: 62, icon: brv > 0 ? 'ok' : null });
  tag(W(V(0.05, 1.68, -0.19)), 'MÁSCARA', CYAN2, win(T.mascara - 0.05, T.todo + 0.35), 0, 0, { px: 64, at: [780, 880], s: pop(T.mascara) });
  // espaldera, bodyguard
  tag(W(V(-0.13, 1.0, 0.205)), 'ESPALDERA', GOLD2, win(T.espaldera - 0.05, T.espaldera + 0.85), 0, 0, { px: 62, sub: 'PLACA DORSAL', at: [760, 1350], s: pop(T.espaldera) });
  tag(worldOf(D, BGP), 'BODYGUARD', RED2, win(T.bodyguard - 0.05, T.encuentren + 0.5), 0, 0, { px: 64, sub: t > T.quieto - 0.1 ? 'QUIETO = ALARMA' : 'ALARMA PERSONAL', at: [740, 900], s: pop(T.bodyguard) });
  // el resumen: las diez a la vez
  if (sumOn > 0.01) {
    const out = 1 - sm(T.compartir - 0.35, T.compartir - 0.1, t);
    const L = [[W(V(-0.06, 1.33, 0.36)), 'BOTELLA'], [W(V(-0.13, 1.02, 0.205)), 'ESPALDERA'], [W(H.alta.curve.getPointAt(0.42)), 'MANGUERAS'], [W(WHEEL), 'GRIFO'], [W(REDC), 'MANORREDUCTOR']];
    const R = [[worldOf(P, V(0.04, 1.7, -0.19)), 'MÁSCARA'], [worldOf(P, LDVP), 'PULMOAUTOMÁTICO'], [worldOf(P, BGP), 'BODYGUARD'], [worldOf(P, WHISTLE), 'SILBATO'], [worldOf(P, GAUGE), 'MANÓMETRO']];
    const col = (list, x, cols) => { list.map(([p, n]) => ({ p, n, y: proj(p).y })).sort((a, b) => a.y - b.y).forEach((o, i) => {
      const t0 = T.sum + 0.07 * (cols ? i * 2 + 1 : i * 2);
      tag(o.p, o.n, cols ? GOLD2 : CYAN2, sm(t0 - 0.05, t0 + 0.15, t) * out, 0, 0, { px: 50, at: [x, 760 + i * 178], s: 1 + 0.12 * pulse(t, t0 + 0.1, 0.15) }); }); };
    col(R, 225, true); col(L, 852, false);
    const ce = sm(T.comentaN - 0.1, T.comentaN + 0.2, t) * out;
    if (ce > 0) { g.save(); g.globalAlpha = ce; g.translate(540, 1690); rr(-330, -48, 660, 96, 48); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke(); txt('💬  COMENTA TU NÚMERO', 0, 20, 56, '#F2F5F8', 400, 'center', 'Bebas'); g.restore(); }
  }
  share(t);
  closing(t);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.01)'; g.fillRect(0, 0, 2, 2);
}

// ------------------------------------------------------------------ fotograma
window.renderAt = async t => {
  const N = window.FAST ? 1 : Math.min(3, subframes(t));
  renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < N; k++) {
    update(N === 1 ? t : t + (k / (N - 1) - 0.5) / 120);
    composer.render();
    accMat.uniforms.tSrc.value = composer.readBuffer.texture; accMat.uniforms.uW.value = 1 / N;
    renderer.setRenderTarget(accRT); renderer.autoClear = false; renderer.render(accScene, quadCam); renderer.autoClear = true;
  }
  if (N > 1) update(t);
  finMat.uniforms.tSrc.value = accRT.texture; finMat.uniforms.uTime.value = t;
  const fr = Math.max(pulse(t, T.boca + 0.02, 0.07) * 0.35, pulse(t, T.pulmones + 0.05, 0.09) * 0.6);
  const fw = Math.max(pulse(t, T.grifo + 0.05, 0.07) * 0.18, pulse(t, T.rw1, 0.07) * 0.25, pulse(t, T.rv1, 0.06) * 0.2);
  if (fr > fw) { finMat.uniforms.uFlash.value = fr; finMat.uniforms.uFlashCol.value.setRGB(0.9, 0.05, 0.02); }
  else { finMat.uniforms.uFlash.value = fw; finMat.uniforms.uFlashCol.value.setRGB(0.85, 0.95, 1); }
  finMat.uniforms.uExp.value = 1.0;
  finMat.uniforms.uDim.value = mx(1, 0.72, sm(T.compartir - 0.2, T.compartir + 0.3, t)) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0) + 0.006 * pulse(t, T.pulmones + 0.05, 0.12);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  await overlay(t);
};
window.__cam = t => { const P0 = camAt(t); return [P0.p.x, P0.p.y, P0.p.z].map(v => +v.toFixed(2)).concat([+P0.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 1.4);

(async () => {
  try {
    while (!_r2d) await new Promise(r => setTimeout(r, 30));
    await document.fonts.ready;
    NOISE = noiseTex();
    buildWorld();
    world.updateMatrixWorld(true);
    bgRed = new THREE.PointLight(0xff1a10, 0, 2.6, 2); bgRed.position.copy(worldOf(D, BGP).add(V(0, 0.12, 0))); world.add(bgRed);
    scene.traverse(o => { const u = o.material && o.material.uniforms; if (u && u.uTime && !TIMED.includes(u)) TIMED.push(u); });
    setupTimes();
    update(0);
    renderer.compile(scene, cam);
    window.DBG = { scene, renderer, flood, dof, bloom, finMat, H, P, D, world, cam, THREE, update };
    window.READY3D = true;
  } catch (e) { window.failed = 'era: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
