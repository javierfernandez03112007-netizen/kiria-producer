// «¿Sabes qué es esto?» — el percutor rompecristales (idea de Adrián, Notion «MARTES 24», con publicidad de Élite);
// 30–40 s. De noche, un coche accidentado con el conductor dentro. Primer plano de una herramienta de llavero (genérica);
// revienta la ventanilla (templada) y se rebobina; por dentro, el muelle que suelta la punta; sin lámina, los trocitos le
// caen al herido; con lámina adhesiva, se agrieta pero sale de una pieza. Cierre: ¿funciona en el parabrisas? (sí/no) y la
// placa de ÉLITE BOMBEROS. Todo depende solo de t. Motor de guia.js.
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






// ================================================================== de noche, junto a un coche accidentado con el conductor dentro
const world = new THREE.Group(); scene.add(world);
scene.fog.density = 0.012;
const RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D', WHITE2 = '#F4F6F8';
const LBLY = 560;
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
const std = (c, r = 0.6, mt = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt });
// la ventanilla delantera del lado cercano (+Z) y el punto donde se golpea (esquina de abajo, delante)
const WX0 = -0.22, WX1 = 0.66, WY0 = 0.9, WY1 = 1.37, WZ = 0.815;
const IMP = V(0.5, 0.99, WZ);
const NX = 26, NY = 15;
let truck, beacons = [], blink = [], car, panelG, pane, tiles, tileInfo = [], film, tool, toolBody, spring, pin, ring, glove, occ, glassM, workL, crackPts = [];

function makeCar(col) {
  const G = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.4 });
  const dark = std(0x0c0d0f, 0.9);
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, p = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; };
  add(new RoundedBoxGeometry(4.2, 0.62, 1.8, 4, 0.16), body, 0, 0.56, 0);
  add(new RoundedBoxGeometry(1.75, 0.07, 1.6, 2, 0.03), body, -0.3, 1.43, 0);
  for (const s of [-1, 1]) for (const x of [0.78, -0.3, -1.32]) add(new THREE.BoxGeometry(0.1, 0.55, 0.06), body, x + (x > 0 ? -0.05 : 0), 1.15, s * 0.79, 0, 0, x > 0 ? -0.45 : x < -1 ? 0.35 : 0);
  add(new THREE.BoxGeometry(4.24, 0.12, 1.84), dark, 0, 0.3, 0);
  add(new THREE.BoxGeometry(0.05, 0.12, 1.3), GLOW(0xfff0d0, 0.5), 2.11, 0.66, 0);
  add(new THREE.BoxGeometry(0.05, 0.1, 1.4), GLOW(0xd01818, 0.6), -2.11, 0.7, 0);
  for (const [x, z] of [[2.06, 0.84], [2.06, -0.84], [-2.06, 0.84], [-2.06, -0.84]]) { const b = add(new THREE.BoxGeometry(0.14, 0.12, 0.2), GLOW(0xff8a1a, 1), x, 0.68, z); blink.push(b.material); }
  for (const [x, z] of [[1.35, 0.86], [-1.35, 0.86], [1.35, -0.86], [-1.35, -0.86]]) {
    const w = new THREE.Group(); w.position.set(x, 0.34, z); G.add(w);
    add(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 22), M.rubber, 0, 0, 0, Math.PI / 2, 0, 0, w);
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 6), M.steel, 0, 0, 0, Math.PI / 2, 0, 0, w);
  }
  // cristales (transparentes) y el interior
  glassM = new THREE.MeshStandardMaterial({ color: 0x1c2833, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  const quad = (pts) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); const m = new THREE.Mesh(g, glassM); m.renderOrder = 5; G.add(m); return m; };
  quad([[0.92, 0.88, 0.78], [0.92, 0.88, -0.78], [0.56, 1.42, -0.78], [0.56, 1.42, 0.78]]);          // parabrisas
  quad([[-1.5, 0.9, 0.78], [-1.5, 0.9, -0.78], [-1.18, 1.42, -0.78], [-1.18, 1.42, 0.78]]);         // luna trasera
  quad([[-1.25, 0.9, 0.81], [-0.38, 0.9, 0.81], [-0.38, 1.37, 0.81], [-1.25, 1.37, 0.81]]);         // atrás, lado cercano
  quad([[-1.25, 0.9, -0.81], [0.66, 0.9, -0.81], [0.66, 1.37, -0.81], [-1.25, 1.37, -0.81]]);       // lado lejano
  const inner = std(0x1b1d22, 0.95);
  add(new THREE.BoxGeometry(3.0, 0.05, 1.5), inner, -0.2, 0.86, 0);
  for (const z of [0.4, -0.4]) { add(new RoundedBoxGeometry(0.5, 0.12, 0.5, 2, 0.04), std(0x262a31, 0.9), -0.2, 0.92, z); add(new RoundedBoxGeometry(0.1, 0.62, 0.5, 2, 0.04), std(0x262a31, 0.9), -0.48, 1.2, z, 0, 0, -0.15); }
  add(new THREE.TorusGeometry(0.17, 0.02, 8, 24), std(0x111111, 0.6), 0.32, 1.1, 0.4, 0, Math.PI / 2 - 0.35, 0);
  add(new THREE.BoxGeometry(0.4, 0.25, 1.5), std(0x15171b, 0.9), 0.62, 0.98, 0);
  G.userData = {}; return G;
}
function makeOccupant() {          // el conductor, herido, con la cabeza caída
  const G = new THREE.Group(), jacket = std(0x4a2c26, 0.8), skin = std(0xc48a66, 0.55), hair = std(0x2a1b10, 0.9);
  const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3, 6, 12), jacket); t.position.set(-0.22, 1.12, 0.4); t.rotation.z = -0.15; G.add(t);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 14), skin); h.position.set(-0.13, 1.39, 0.47); G.add(h);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 14, 0, Math.PI * 2, 0, 1.5), hair); hr.position.copy(h.position); hr.rotation.set(-0.3, 0, 0.5); G.add(hr);
  for (const z of [0.25, 0.56]) { const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.3, 4, 10), jacket); a.position.set(0.05, 1.08, z); a.rotation.z = Math.PI / 2 - 0.3; G.add(a); }
  G.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return G;
}
// la herramienta de llavero (genérica): cuerpo amarillo, punta negra con muelle, ranura de cortacinturones y anilla
function makeTool() {
  const G = new THREE.Group();
  const yel = new THREE.MeshStandardMaterial({ color: 0xb9d12e, roughness: 0.45, transparent: true, opacity: 1 });
  toolBody = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.03, 0.024, 3, 0.008), yel); G.add(toolBody);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.016, 18), new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.6, transparent: true, opacity: 1 }));
  cap.rotation.z = Math.PI / 2; cap.position.x = 0.044; G.add(cap); G.userData.cap = cap;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.026), std(0x2a2c2f, 0.5, 0.6)); slot.position.set(-0.008, -0.01, 0); G.add(slot);
  ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0022, 8, 28), M.chrome); ring.position.set(-0.052, 0.004, 0); G.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.002, 8, 20), M.chrome); ring2.position.set(-0.04, 0.006, 0); ring2.rotation.y = Math.PI / 2; G.add(ring2);
  // por dentro (se ve en rayos X): muelle y percutor
  const pts = []; for (let i = 0; i <= 200; i++) { const a = i / 200 * Math.PI * 2 * 9; pts.push(V(i / 200, Math.cos(a) * 0.0065, Math.sin(a) * 0.0065)); }
  spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.0009, 6, false), new THREE.MeshStandardMaterial({ color: 0xd9dde3, metalness: 0.9, roughness: 0.25, emissive: 0x48d6ff, emissiveIntensity: 0 }));
  spring.position.x = -0.004; spring.scale.x = 0.03; G.add(spring);
  pin = new THREE.Group(); G.add(pin);
  const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.022, 12), M.chrome); pb.rotation.z = Math.PI / 2; pb.position.x = 0.037; pin.add(pb);
  const pt = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.008, 12), new THREE.MeshStandardMaterial({ color: 0xe8ecf2, metalness: 0.9, roughness: 0.2, emissive: 0xff8a3d, emissiveIntensity: 0 })); pt.rotation.z = -Math.PI / 2; pt.position.x = 0.052; pin.add(pt); G.userData.pt = pt;
  spring.visible = pin.visible = false;
  G.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return G;
}
function makeGlove() {
  const G = new THREE.Group(), gm = std(0x15161a, 0.8), band = new THREE.MeshStandardMaterial({ color: 0xd9d34a, roughness: 0.4, emissive: 0x777a20, emissiveIntensity: 0.25 });
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.045, 0.11, 2, 0.02), gm); G.add(palm);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.05, 4, 8), gm); f.rotation.z = Math.PI / 2; f.position.set(0.075, 0.012, -0.038 + i * 0.025); f.rotation.y = 0; G.add(f); }
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.12, 14), gm); cuff.rotation.z = Math.PI / 2; cuff.position.x = -0.1; G.add(cuff);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.062, 0.03, 14), band); b.rotation.z = Math.PI / 2; b.position.x = -0.13; G.add(b);
  const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.5, 14), std(0x2a3346, 0.8)); sl.rotation.z = Math.PI / 2; sl.position.x = -0.4; G.add(sl);
  G.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return G;
}
function buildWorld() {
  mats();
  world.add(new THREE.HemisphereLight(0x3a4c76, 0x0a0705, 0.7));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.45); moon.position.set(-14, 30, 20); world.add(moon);
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#17181b'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 16 + rnd(i) * 26; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(30, 4);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(140, 14), new THREE.MeshStandardMaterial({ map: asph, color: 0x6a6a6a, roughness: 0.42, metalness: 0.2 }));
  road.rotation.x = -Math.PI / 2; road.receiveShadow = true; world.add(road);
  const field = new THREE.Mesh(new THREE.PlaneGeometry(140, 80), std(0x1a2416, 1)); field.rotation.x = -Math.PI / 2; field.position.set(0, -0.02, -47); field.receiveShadow = true; world.add(field);
  const field2 = field.clone(); field2.position.z = 47; world.add(field2);
  const lineM = new THREE.MeshStandardMaterial({ color: 0x9a9a90, roughness: 0.5, emissive: 0x0e0e0c });
  for (const z of [-6.3, 6.3]) { const l = new THREE.Mesh(new THREE.BoxGeometry(140, 0.012, 0.14), lineM); l.position.set(0, 0.008, z); world.add(l); }
  const steel = new THREE.MeshStandardMaterial({ color: 0x5b6068, metalness: 0.8, roughness: 0.4 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(140, 0.32, 0.07), steel); rail.position.set(0, 0.62, -7.3); world.add(rail);
  for (let x = -70; x <= 70; x += 2) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), steel); p.position.set(x, 0.375, -7.25); world.add(p); }
  const barkM = std(0x2c2117, 1), leafB = new THREE.MeshStandardMaterial({ color: 0x15241a, roughness: 1, flatShading: true });
  for (let i = 0; i < 16; i++) { const x = -60 + i * 8 + rnd(i) * 3, z = -12 - rnd(i * 3) * 10, t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 4, 8), barkM); t.position.set(x, 2, z); world.add(t);
    for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + rnd(i * 5 + k) * 0.8, 0), leafB); f.position.set(x + (rnd(i * 7 + k) - 0.5) * 2, 4.4 + rnd(i * 9 + k) * 1.4, z + (rnd(i * 11 + k) - 0.5) * 2); world.add(f); } }
  car = makeCar(0x7a2a24); world.add(car);
  occ = makeOccupant(); world.add(occ);
  const inL = new THREE.PointLight(0xffc890, 2.2, 3, 2); inL.position.set(0.1, 1.3, 0.1); world.add(inL);
  // la ventanilla: cristal entero (pane) y los trocitos (tiles), dentro de un grupo que gira sobre el borde de abajo
  panelG = new THREE.Group(); panelG.position.set((WX0 + WX1) / 2, WY0, WZ); world.add(panelG);
  const W = WX1 - WX0, H = WY1 - WY0;
  pane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ color: 0x24323d, roughness: 0.04, metalness: 0.5, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
  pane.position.y = H / 2; pane.renderOrder = 6; panelG.add(pane);
  const tw = W / NX, th = H / NY;
  tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(tw * 0.97, th * 0.97, 0.004), new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.15, emissive: 0x1a2630, emissiveIntensity: 0.1, depthWrite: false }), NX * NY);
  tiles.renderOrder = 7; tiles.frustumCulled = false; panelG.add(tiles);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i, x = -W / 2 + (i + 0.5) * tw + (rnd(k * 1.3) - 0.5) * tw * 0.15, y = (j + 0.5) * th + (rnd(k * 2.7) - 0.5) * th * 0.15;
    const wx = panelG.position.x + x, wy = WY0 + y, d = Math.hypot(wx - IMP.x, wy - IMP.y);
    tileInfo.push({ x, y, d, rx: (rnd(k * 3.1) - 0.5) * 0.12, ry: (rnd(k * 4.7) - 0.5) * 0.12, vx: (rnd(k * 5.3) - 0.5) * 0.25, vz: -0.25 - rnd(k * 6.1) * 0.55, spin: (rnd(k * 7.7) - 0.5) * 14, del: rnd(k * 8.9) * 0.18 });
  }
  // la lámina adhesiva (se extiende de izquierda a derecha)
  film = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.04, H + 0.04), new THREE.MeshBasicMaterial({ color: 0x6fd3ff, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  film.renderOrder = 8; film.visible = false; panelG.add(film);
  // las grietas (puntos en el plano de la ventanilla, en coordenadas del grupo)
  for (let r = 0; r < 16; r++) { const a0 = r / 16 * Math.PI * 2 + rnd(r) * 0.3, L = []; let x = IMP.x - panelG.position.x, y = IMP.y - WY0, a = a0;
    for (let s = 0; s < 14; s++) { L.push([x, y]); a += (rnd(r * 31 + s) - 0.5) * 0.5; x += Math.cos(a) * 0.05; y += Math.sin(a) * 0.05; if (x < -W / 2 || x > W / 2 || y < 0 || y > H) break; } crackPts.push(L); }
  tool = makeTool(); world.add(tool);
  glove = makeGlove(); world.add(glove);
  // la autobomba al fondo y el foco de trabajo
  truck = makeTruck(); truck.rotation.y = Math.PI * 0.85; truck.position.set(-6.5, 0, -4.2); world.add(truck);
  truck.traverse(o => { if (o.isMesh) o.castShadow = true; }); beacons = truck.userData.lbar;
  workL = new THREE.SpotLight(0xfff2e0, 60, 40, 0.6, 0.6, 1.3); workL.position.set(3.5, 3.6, 5.2); workL.target.position.set(0.2, 1.0, 0.8);
  workL.castShadow = true; workL.shadow.mapSize.set(2048, 2048); workL.shadow.bias = -0.0004; world.add(workL, workL.target);
  const key = new THREE.PointLight(0xfff0dc, 2.5, 3, 2); key.position.set(0.9, 1.5, 1.7); world.add(key);
}

// ------------------------------------------------------------------ tiempos y cámara
let T = {}, KEYS = null, KH = null, TK = null;
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  T.tA = T.coche - 0.05; T.rA0 = T.percutor - 0.1; T.rA1 = T.rompe + 0.35;          // 1: revienta (gancho) y se rebobina
  T.tB = T.estalla - 0.1; T.fB = T.trocitos - 0.1; T.rB0 = T.primero - 0.35; T.rB1 = T.primero + 0.35;   // 2: sin lámina, cae sobre el herido
  T.tC = T.golpeas + 0.05; T.pC = T.pieza - 0.35;                                    // 3: con lámina, sale de una pieza
  const PH = [0.62, 1.08, 1.2], PT = [IMP.x, IMP.y, WZ + 0.056], PH2 = [0.72, 1.18, 1.15], PW = [1.08, 1.22, 0.36];
  const k = (t, p, ry, rz = 0, vis = 1) => [t, [...p, ry, rz, vis]];
  TK = [
    k(0, PH, Math.PI / 2 + 0.7, 0.15), k(T.llavero, [0.61, 1.09, 1.2], Math.PI / 2 + 0.35, 0.05), k(T.revienta + 0.15, [0.56, 1.03, 1.05], Math.PI / 2 + 0.1),
    k(T.coche - 0.08, PT, Math.PI / 2), k(T.coche + 0.25, [PT[0], PT[1], PT[2] + 0.05], Math.PI / 2), k(T.percutor, PH2, Math.PI / 2 + 0.6, 0.1),
    k(T.rompe + 0.5, PH2, Math.PI / 2 + 0.45, 0.05), k(T.aprietas - 0.25, [PT[0], PT[1], PT[2] + 0.004], Math.PI / 2), k(T.punto + 1.0, [PT[0], PT[1], PT[2] + 0.004], Math.PI / 2),
    k(T.estalla + 0.3, [PT[0] + 0.1, PT[1] + 0.05, PT[2] + 0.25], Math.PI / 2 + 0.3), k(T.dentro, [PT[0] + 0.5, PT[1] + 0.1, PT[2] + 0.7], Math.PI / 2 + 0.3, 0, 0),
    k(T.golpeas - 0.7, [PT[0] + 0.05, PT[1] + 0.03, PT[2] + 0.12], Math.PI / 2, 0, 1), k(T.golpeas - 0.02, [PT[0], PT[1], PT[2] + 0.004], Math.PI / 2, 0, 1),
    k(T.golpeas + 0.4, [PT[0] + 0.06, PT[1] + 0.02, PT[2] + 0.14], Math.PI / 2 + 0.2, 0, 1), k(T.pieza - 0.4, [PT[0] + 0.4, PT[1] + 0.1, PT[2] + 0.6], Math.PI / 2 + 0.3, 0, 0),
    k(T.parabrisas - 0.2, [PW[0] + 0.3, PW[1] + 0.05, PW[2] + 0.4], Math.PI, 0, 1), k(T.funciona, PW, Math.PI, 0, 1), k(T.end, PW, Math.PI, 0, 1),
  ];
  for (let i = 1; i < TK.length; i++) TK[i][0] = Math.max(TK[i][0], TK[i - 1][0] + 0.08);
  KEYS = camKeys(); KH = KEYS;
}
function camKeys() {
  const K = [
    [0, [0.95, 1.16, 1.34, 0.62, 1.07, 1.2, 36]],                    // ¿qué es esto?
    [T.llavero, [0.93, 1.2, 1.1, 0.61, 1.08, 1.2, 36]],
    [T.revienta + 0.3, [1.3, 1.25, 2.35, 0.3, 1.1, 0.8, 40]],          // revienta la ventanilla
    [T.coche + 0.3, [1.2, 1.22, 2.2, 0.25, 1.1, 0.8, 40]],
    [T.percutor, [1.08, 1.27, 1.32, 0.72, 1.17, 1.15, 36]],           // percutor rompecristales
    [T.rompe + 0.4, [1.06, 1.29, 1.22, 0.72, 1.17, 1.15, 36]],
    [T.aprietas, [0.82, 1.04, 0.95, 0.5, 0.99, 0.875, 34]],           // por dentro: muelle y punta
    [T.punto + 0.4, [0.81, 1.06, 0.99, 0.5, 0.99, 0.875, 34]],
    [T.templado, [1.05, 1.25, 2.15, 0.22, 1.12, 0.8, 40]],            // templado: estalla entero
    [T.trocitos, [0.95, 1.3, 2.05, 0.22, 1.12, 0.8, 40]],
    [T.dentro, [0.55, 1.3, 1.75, -0.1, 1.22, 0.45, 40]],             // dentro hay un herido (por la ventanilla)
    [T.herido + 0.5, [0.5, 1.32, 1.7, -0.1, 1.22, 0.45, 40]],
    [T.primero, [1.15, 1.26, 2.25, 0.22, 1.12, 0.8, 40]],             // primero, la lámina
    [T.adhesiva + 0.3, [0.95, 1.2, 1.95, 0.22, 1.12, 0.8, 40]],
    [T.golpeas, [1.0, 1.16, 2.0, 0.25, 1.1, 0.8, 40]],
    [T.pegados, [1.15, 1.3, 2.3, 0.22, 1.12, 0.85, 40]],              // se quedan pegados
    [T.pieza + 0.6, [1.7, 1.45, 2.9, 0.3, 1.0, 1.1, 42]],             // de una pieza
    [T.parabrisas, [2.45, 1.72, 1.65, 0.75, 1.15, 0.1, 42]],          // ¿y en el parabrisas?
    [T.no + 0.4, [2.55, 1.78, 1.75, 0.75, 1.15, 0.1, 42]],
    [T.compartir + 0.6, [3.6, 2.6, 4.6, 0, 0.9, 0, 44]],
    [T.end, [4.1, 3.0, 5.3, 0, 0.9, 0, 44]],
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
  return pose(V(v[0] + 0.02 * s * Math.sin(t * 0.7), v[1] + 0.015 * s * Math.sin(t * 0.53 + 1), v[2]), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t (todo depende solo de t)
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), E4 = new THREE.Euler(), S4 = V(1, 1, 1), P4 = V();
let SEQ = 0, FALL = 0, CRACK = 0, CRACKA = 0;
function fallState(t) {                 // qué hacen los trocitos: secuencia, caída (0..1) y grieta (0..1)
  if (t >= T.tA && t < T.rA1) { const p = e3(pr(t, T.tA + 0.08, 1.0)) * (1 - e3(pr(t, T.rA0, T.rA1 - T.rA0))); return [1, p, cl((t - T.tA) / 0.15), 1 - p]; }
  if (t >= T.tB && t < T.rB1) { const p = pr(t, T.fB, 1.6) * (1 - e3(pr(t, T.rB0, T.rB1 - T.rB0))); return [2, p, cl((t - T.tB) / 0.5), (1 - p) * (1 - sm(T.rB0, T.rB1, t))]; }
  if (t >= T.tC) return [3, 0, cl((t - T.tC) / 0.4), 1];
  return [0, 0, 0, 0];
}
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = 8 + 70 * on;
  const hz = (t * 1.5) % 1 < 0.5 ? 1 : 0.15; blink.forEach(m => m.color.setRGB(hz, 0.54 * hz, 0.1 * hz));
  // la herramienta (y el guante que la sujeta)
  const v = hermite(TK, t);
  tool.position.set(v[0], v[1], v[2]); tool.rotation.set(0, v[3], v[4]);
  tool.visible = glove.visible = v[5] > 0.5;
  tool.updateMatrixWorld(true);
  glove.position.copy(tool.localToWorld(V(-0.03, -0.04, 0.0))); glove.quaternion.copy(tool.quaternion);
  // rayos X: el muelle se carga y suelta la punta
  const xr = sm(T.aprietas - 0.25, T.aprietas + 0.15, t) * (1 - sm(T.punto + 0.6, T.templado - 0.2, t));
  toolBody.material.opacity = 1 - 0.78 * xr; tool.userData.cap.material.opacity = 1 - 0.7 * xr;
  spring.visible = pin.visible = xr > 0.01;
  const comp = sm(T.aprietas + 0.05, T.punta - 0.1, t) * (1 - sm(T.punta - 0.02, T.punta + 0.06, t));
  spring.scale.x = 0.03 * (1 - 0.45 * comp); spring.position.x = -0.004 + 0.0135 * comp * 0;
  pin.position.x = 0.012 * comp * -1 + 0.004 * Math.exp(-Math.pow((t - T.punta - 0.05) / 0.06, 2));
  spring.material.emissiveIntensity = 1.2 * comp; tool.userData.pt.material.emissiveIntensity = 2.5 * pulse(t, T.punta + 0.03, 0.12);
  // la ventanilla
  const [seq, fall, crack, ca] = fallState(t); SEQ = seq; FALL = fall; CRACK = crack; CRACKA = ca;
  pane.visible = seq === 0; tiles.visible = seq > 0;
  tiles.material.opacity = 0.15 + 0.4 * sm(0.02, 0.12, fall); tiles.material.emissiveIntensity = 0.1 + 0.9 * sm(0.02, 0.12, fall);
  if (seq > 0) {
    const D = seq === 2 ? 1.6 : 1.0;
    tileInfo.forEach((ti, k) => {
      const tau = Math.max(0, fall * D - ti.del - ti.d * 0.4);
      let x = ti.x + ti.vx * tau, y = ti.y - 2.9 * tau * tau, z = ti.vz * tau;
      const vis = y > -0.04 && (seq !== 2 || tau < 1.4);
      E4.set(ti.rx + ti.spin * tau * 0.6, ti.ry + ti.spin * tau, ti.spin * tau * 0.3); Q4.setFromEuler(E4);
      S4.setScalar(vis ? 1 : 0); P4.set(x, y, z); M4.compose(P4, Q4, S4); tiles.setMatrixAt(k, M4);
    });
    tiles.instanceMatrix.needsUpdate = true;
  }
  // la lámina y el cristal que sale entero
  const wipe = e3(pr(t, T.lamina - 0.05, T.adhesiva + 0.55 - T.lamina));
  film.visible = wipe > 0.001 && t > T.rB1 - 0.1;
  const W = WX1 - WX0, H = WY1 - WY0;
  film.scale.x = Math.max(0.001, wipe); film.position.set(-W / 2 + (W + 0.04) * wipe / 2 - 0.02 + 0.0, H / 2, 0.006);
  const pk = e3(pr(t, T.pC, 1.25));
  panelG.rotation.x = 0.55 * pk; panelG.position.set((WX0 + WX1) / 2 + 0.25 * pk, WY0 - 0.35 * pk * pk, WZ + 0.55 * pk);
}

// ------------------------------------------------------------------ la capa 2D
function drawCracks(prog, a) {
  if (a <= 0.01 || prog <= 0) return;
  panelG.updateMatrixWorld(true);
  g.save(); g.globalAlpha = cl(a); g.strokeStyle = 'rgba(235,245,255,0.95)'; g.lineWidth = 2.4; g.shadowColor = '#bfe8ff'; g.shadowBlur = 8;
  for (const L of crackPts) {
    const n = Math.max(1, Math.ceil(L.length * prog));
    g.beginPath();
    for (let i = 0; i < n; i++) { const q = proj(panelG.localToWorld(V(L[i][0], L[i][1], 0.006))); if (i === 0) g.moveTo(q.x, q.y); else g.lineTo(q.x, q.y); }
    g.stroke();
  }
  g.restore();
}
function chip(x, y, txt0, col, a, s = 1) {
  if (a <= 0.01) return;
  g.save(); g.globalAlpha = cl(a); g.translate(x, y); g.scale(s, s);
  rr(-140, -62, 280, 124, 30); g.fillStyle = 'rgba(8,10,14,0.92)'; g.fill(); g.strokeStyle = col; g.lineWidth = 6; g.stroke();
  txt(txt0, 0, 26, 76, '#F4F6F8', 400, 'center', 'Bebas'); g.restore();
}
function closingElite(t) {             // la placa de ÉLITE BOMBEROS (venta de la academia, como pide Adrián)
  const a = prog(t, CUE.marca - 0.1, 0.35);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const hg = g.createRadialGradient(540, 900, 50, 540, 900, 620);
  hg.addColorStop(0, 'rgba(255,122,47,0.45)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = hg; g.fillRect(0, 300, W2, 1200);
  const s = lerp(0.6, 1, back(prog(t, CUE.marca - 0.1, 0.55)));
  g.save(); g.translate(540, 880); g.scale(s, s);
  g.font = `400 132px Bebas`; const tw = g.measureText('ÉLITE BOMBEROS').width;
  const pw = tw + 100, ph = 200;
  rr(-pw / 2, -ph / 2, pw, ph, 32);
  const pg = g.createLinearGradient(0, -ph / 2, 0, ph / 2); pg.addColorStop(0, '#FFD65C'); pg.addColorStop(1, '#E88C1E');
  g.fillStyle = pg; g.shadowColor = 'rgba(255,122,47,0.9)'; g.shadowBlur = 60; g.fill(); g.shadowBlur = 0;
  rr(-pw / 2 + 8, -ph / 2 + 8, pw - 16, 22, 11); g.fillStyle = 'rgba(255,240,190,0.35)'; g.fill();
  txt('ÉLITE BOMBEROS', 0, 48, 132, '#160F05', 400, 'center', 'Bebas');
  g.restore();
  const la = eo(prog(t, CUE.marca + 0.6, 0.4));
  g.globalAlpha = a * la;
  txt('Prepárate de la mano de un bombero.', 540, 1080 + 20 * (1 - la), 50, WHITE, 800, 'center');
  const pa = prog(t, CUE.prueba, 0.45);
  if (pa > 0) {
    const ps = back(pa);
    g.globalAlpha = a * clamp(pa * 2);
    g.save(); g.translate(540, 1270); g.scale(ps, ps);
    rr(-430, -78, 860, 156, 78); g.fillStyle = EMBER; g.shadowColor = 'rgba(255,122,47,0.8)'; g.shadowBlur = 40; g.fill(); g.shadowBlur = 0;
    txt('SIN MATRÍCULA · SIN PERMANENCIA', 0, 26, 70, '#FFFFFF', 400, 'center', 'Bebas');
    g.restore();
    g.globalAlpha = a * prog(t, CUE.prueba + 0.5, 0.4);
    txt('elitebomberos.com · enlace en la bio', 540, 1420, 40, DIM, 600, 'center');
  }
  g.restore();
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const win = (t0, t1) => sm(t0 - 0.12, t0 + 0.08, t) * (1 - sm(t1 - 0.2, t1, t));
  const pop = t0 => 1 + 0.16 * pulse(t, t0 + 0.12, 0.18);
  // ¿qué es esto?
  label(540, 700, '¿QUÉ ES ESTO?', GOLD2, win(0, T.revienta + 0.1), { px: 96, s: pop(0.0) });
  if (ring) tag(ring.getWorldPosition(V()), 'LLAVERO', CYAN2, win(T.llavero - 0.05, T.revienta + 0.4), -160, 260, { px: 58, s: pop(T.llavero) });
  // las grietas
  drawCracks(CRACK, CRACKA * (SEQ === 3 ? 1 - sm(T.parabrisas - 0.4, T.parabrisas, t) : 1));
  // percutor rompecristales
  tag(tool.getWorldPosition(V()), 'PERCUTOR ROMPECRISTALES', GOLD2, win(T.percutor - 0.1, T.aprietas - 0.1) * (tool.visible ? 1 : 0), 0, 300, { px: 62, s: pop(T.percutor) });
  // muelle, punta, un solo punto
  tag(spring.getWorldPosition(V()), 'MUELLE', CYAN2, win(T.muelle - 0.1, T.punto + 0.7), -180, -260, { px: 58, s: pop(T.muelle) });
  tag(tool.localToWorld(V(0.055, 0, 0)), 'PUNTA', ORANGE2, win(T.punta - 0.1, T.punto + 0.7), 160, 260, { px: 58, s: pop(T.punta) });
  const pa = win(T.punto - 0.1, T.templado - 0.1);
  if (pa > 0.01) { const q = proj(IMP); if (q.ok) { g.save(); g.globalAlpha = pa; g.strokeStyle = ORANGE2; g.lineWidth = 6; g.beginPath(); g.arc(q.x, q.y, 34 + 8 * Math.sin(t * 8), 0, 7); g.stroke(); g.restore(); } }
  tag(IMP.clone(), 'UN SOLO PUNTO', ORANGE2, pa, -200, 280, { px: 58, s: pop(T.punto) });
  // templado; dentro hay un herido
  tag(V(0.25, 1.25, WZ), 'CRISTAL TEMPLADO', CYAN2, win(T.templado - 0.1, T.dentro - 0.1), -60, -320, { px: 60, s: pop(T.templado) });
  tag(V(-0.13, 1.42, 0.47), 'HERIDO', RED2, win(T.dentro - 0.05, T.primero - 0.1), -40, -260, { px: 64, icon: 'warn', s: pop(T.herido) });
  // la lámina; se quedan pegados; de una pieza
  tag(V(0.0, 1.2, WZ + 0.01), 'LÁMINA ADHESIVA', CYAN2, win(T.lamina - 0.1, T.pegados - 0.1) * (film.visible ? 1 : 0), -40, -330, { px: 60, s: pop(T.lamina) });
  tag(panelG.localToWorld(V(0, 0.25, 0.01)), 'SE QUEDAN PEGADOS', GREEN2, win(T.pegados - 0.1, T.pieza - 0.1), 0, -330, { px: 58, icon: 'ok', s: pop(T.pegados) });
  label(540, 1450, 'DE UNA PIEZA', GREEN2, win(T.pieza - 0.1, T.parabrisas - 0.1), { px: 76, icon: 'ok', s: pop(T.pieza) });
  // ¿y en el parabrisas?
  const qa = sm(T.parabrisas - 0.15, T.parabrisas + 0.15, t) * (1 - sm(T.compartir - 0.4, T.compartir - 0.1, t));
  if (qa > 0.005) {
    g.save(); g.globalAlpha = qa; g.translate(540, 650);
    rr(-470, -66, 940, 132, 32); g.fillStyle = 'rgba(8,10,14,0.92)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('¿FUNCIONA EN EL PARABRISAS?', 0, 26, 72, '#F4F6F8', 400, 'center', 'Bebas'); g.restore();
    tag(V(0.74, 1.15, 0.45), 'PARABRISAS', GOLD2, qa * sm(T.parabrisas, T.parabrisas + 0.3, t), -170, 230, { px: 54 });
    chip(360, 1470, 'SÍ', '#2DD4BF', qa * sm(T.si - 0.12, T.si + 0.1, t), 0.7 + 0.3 * bk(cl((t - T.si + 0.12) / 0.35)));
    chip(720, 1470, 'NO', '#F0457A', qa * sm(T.no - 0.12, T.no + 0.1, t), 0.7 + 0.3 * bk(cl((t - T.no + 0.12) / 0.35)));
    const ce = sm(T.no + 0.15, T.no + 0.45, t) * qa;
    if (ce > 0) { g.save(); g.globalAlpha = ce; g.translate(540, 1620); rr(-220, -44, 440, 88, 44); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke(); txt('💬  COMENTA', 0, 18, 52, '#F2F5F8', 400, 'center', 'Bebas'); g.restore(); }
  }
  share(t);
  closingElite(t);
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
  const f1 = pulse(t, T.tA + 0.03, 0.08), f2 = pulse(t, T.punta + 0.03, 0.06) * 0.5, f3 = pulse(t, T.tC, 0.07) * 0.7;
  finMat.uniforms.uFlash.value = Math.max(f1, f2, f3) * 0.22; finMat.uniforms.uFlashCol.value.setRGB(0.85, 0.95, 1);
  finMat.uniforms.uDim.value = mx(1, 0.88, sm(T.parabrisas - 0.1, T.parabrisas + 0.3, t) * (1 - sm(T.compartir - 0.3, T.compartir, t))) * mx(1, 0.72, sm(T.compartir - 0.2, T.compartir + 0.3, t)) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  await overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 1.4);

(async () => {
  try {
    while (!_r2d) await new Promise(r => setTimeout(r, 30));
    await document.fonts.ready;
    NOISE = noiseTex();
    buildWorld();
    world.updateMatrixWorld(true);
    setupTimes();
    update(0);
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'percutor: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
