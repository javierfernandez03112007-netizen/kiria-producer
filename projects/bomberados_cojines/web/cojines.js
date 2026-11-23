// «Un coche encima de una pierna… y este cojín lo levanta» — cojines de alta presión (idea de Adrián, Notion «LUNES 23»);
// 30–40 s. De noche, en una carretera: el coche ha caído sobre la pierna de alguien. Un guante mete un cojín plano y el coche
// sube (12 bar, hasta 68 t, medio metro como mucho). La idea: dos cojines apilados NO levantan el doble: solo suben más alto
// y el bloque levanta lo del pequeño (40 t + 20 t = 20 t). El grande abajo, el pequeño centrado; cuñas mientras sube; la
// pregunta de Bomberados (¿empuja más, igual o menos al inflarse?). Todo depende solo de t. Motor de guia.js.
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






// ================================================================== de noche, en una carretera: un coche ha caído sobre la pierna de alguien
const world = new THREE.Group(); scene.add(world);
scene.fog.density = 0.012;
const RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D', WHITE2 = '#F4F6F8';
const LBLY = 560;                                                    // rótulos por debajo de los subtítulos (y ≈ 280–500)
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
const std = (c, r = 0.6, mt = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt });
const BZ = 0.62;                                                     // z de los cojines (bajo el estribo del lado cercano)
const XF = 0.95, XR = -0.85;                                         // x del cojín de delante y de la pila de atrás
const SB = 0.72, SS = 0.48, T0 = 0.025;                              // lado del cojín grande y del pequeño; grosor desinflado
const REST = 0.14;                                                   // altura de los bajos apoyados sobre la pierna
const NOM = 0.24;                                                    // altura normal de los bajos
const ARM = 1.48;                                                    // de la línea de las ruedas de enfrente a los cojines
const CTRL = V(1.95, 0, 2.3);                                        // el mando con los manómetros
let truck, beacons = [], blink = [], carP, car, victim, legT, bagF, bagR, bagS, ghostG, glove, polyM, blocks = [], hoses = {}, needles = [], patch, workL;

function between(m, a, b) {
  const d = b.clone().sub(a), L = Math.max(1e-4, d.length());
  m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
}
// el coche (origen en el suelo, en el centro; +X hacia delante, +Z a su izquierda: el lado de la pierna)
function makeCar(col) {
  const G = new THREE.Group(), ud = { wheels: [] };
  const body = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0b0e13, roughness: 0.12, metalness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.9 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, p = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; };
  add(new RoundedBoxGeometry(4.2, 0.62, 1.8, 4, 0.16), body, 0, 0.56, 0);
  add(new RoundedBoxGeometry(2.3, 0.6, 1.62, 3, 0.14), glass, -0.25, 1.15, 0);
  add(new RoundedBoxGeometry(1.75, 0.07, 1.6, 2, 0.03), body, -0.3, 1.43, 0);
  for (const s of [-1, 1]) for (const x of [0.78, -0.3, -1.32]) add(new THREE.BoxGeometry(0.1, 0.55, 0.06), body, x + (x > 0 ? -0.05 : 0), 1.15, s * 0.79, 0, 0, x > 0 ? -0.45 : x < -1 ? 0.35 : 0);
  add(new THREE.BoxGeometry(4.24, 0.12, 1.84), dark, 0, 0.3, 0);
  add(new THREE.BoxGeometry(0.05, 0.12, 1.3), GLOW(0xfff0d0, 0.5), 2.11, 0.66, 0);
  add(new THREE.BoxGeometry(0.05, 0.1, 1.4), GLOW(0xd01818, 0.6), -2.11, 0.7, 0);
  for (const [x, z] of [[2.06, 0.84], [2.06, -0.84], [-2.06, 0.84], [-2.06, -0.84]]) { const b = add(new THREE.BoxGeometry(0.14, 0.12, 0.2), GLOW(0xff8a1a, 1), x, 0.68, z); blink.push(b.material); }
  for (const [x, z] of [[1.35, 0.86], [-1.35, 0.86], [1.35, -0.86], [-1.35, -0.86]]) {
    const w = new THREE.Group(); w.position.set(x, 0.34, z); G.add(w); ud.wheels.push(w);
    add(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 22), M.rubber, 0, 0, 0, Math.PI / 2, 0, 0, w);
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 6), M.steel, 0, 0, 0, Math.PI / 2, 0, 0, w);
  }
  G.userData = ud; return G;
}
// cuña y bloque escalonado de polietileno amarillo (como en la estabilización)
function makeWedge(len = 0.42, h = 0.14, w = 0.2) {
  const s = new THREE.Shape(); s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(-len / 2, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1 }); g.translate(0, 0, -w / 2);
  const m = new THREE.Mesh(g, polyM); m.castShadow = true; return m;
}
function makeStep(h = 0.24) {
  const G = new THREE.Group(), st = h / 3;
  [[0.62, 0], [0.42, st], [0.22, 2 * st]].forEach(([L, y]) => { const b = new THREE.Mesh(new RoundedBoxGeometry(0.3, st, L, 1, 0.01), polyM); b.position.set(0, y + st / 2, -(0.62 - L) / 2); b.castShadow = true; G.add(b); });
  return G;
}
// el cojín: base plana + cara de arriba que se abomba (f = (1−|u|⁴)(1−|v|⁴)); rótulo amarillo pintado
function bagTex(txt) {
  return canvasTex(512, 512, (x) => {
    x.fillStyle = '#121315'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3000; i++) { const v = 22 + rnd(i * 1.7) * 14; x.fillStyle = `rgba(${v},${v},${v},0.5)`; x.fillRect(rnd(i * 3.3) * 512, rnd(i * 7.9) * 512, 2, 2); }
    x.strokeStyle = '#9C7A00'; x.lineWidth = 22; x.strokeRect(30, 30, 452, 452);
    x.fillStyle = '#A88400'; x.font = '400 170px Bebas'; x.textAlign = 'center'; x.fillText(txt, 256, 300);
    x.font = '400 54px Bebas'; x.fillText('MÁX 12 BAR', 256, 395);
  }, { aniso: 4 });
}
function makeBag(size, txt, hoseCol) {
  const G = new THREE.Group(), N = 26;
  const rub = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.75 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(size, T0, size, 2, 0.008), rub); base.position.y = T0 / 2; base.castShadow = base.receiveShadow = true; G.add(base);
  const top = new THREE.PlaneGeometry(size * 0.985, size * 0.985, N, N); top.rotateX(-Math.PI / 2);
  const topM = new THREE.Mesh(top, new THREE.MeshStandardMaterial({ map: bagTex(txt), roughness: 0.7 })); topM.castShadow = topM.receiveShadow = true; G.add(topM);
  const nip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 10), M.steel); nip.rotation.z = Math.PI / 2; nip.position.set(size / 2 + 0.03, T0 / 2, size * 0.3); G.add(nip);
  G.userData = { size, top, H: -1, nip: V(size / 2 + 0.07, T0 / 2, size * 0.3), hoseCol };
  setBag(G, 0);
  return G;
}
function setBag(G, H) {                // H: cuánto sube el centro de la cara de arriba sobre el grosor plano
  const ud = G.userData; if (Math.abs(ud.H - H) < 1e-4) return; ud.H = H;
  const p = ud.top.attributes.position, s = ud.size * 0.985 / 2;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / s, v = p.getZ(i) / s; p.setY(i, T0 + 0.002 + H * (1 - Math.pow(Math.abs(u), 4)) * (1 - Math.pow(Math.abs(v), 4))); }
  p.needsUpdate = true; ud.top.computeVertexNormals();
}
const bagTop = G => T0 + 0.002 + Math.max(0, G.userData.H);
// el herido: tumbado, la cabeza lejos del coche y la pierna derecha bajo el estribo
function makeVictim() {
  const G = new THREE.Group(), jacket = std(0x7a1d22, 0.75), jeans = std(0x27344d, 0.85), skin = std(0xc48a66, 0.55), shoe = std(0x141414, 0.6), hair = std(0x24160d, 0.9);
  const cap = (r, l, m) => { const x = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), m); x.castShadow = true; x.receiveShadow = true; return x; };
  const torso = cap(0.17, 0.42, jacket); torso.rotation.x = Math.PI / 2; torso.scale.set(1.15, 1, 0.75); torso.position.set(0.05, 0.13, 1.62); G.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 14), skin); head.position.set(0.05, 0.11, 2.08); head.castShadow = true; G.add(head);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14, 0, Math.PI * 2, 0, 1.4), hair); hr.position.copy(head.position); hr.rotation.x = Math.PI / 2 + 0.3; G.add(hr);
  for (const s of [-1, 1]) { const a = cap(0.05, 0.42, jacket); a.rotation.set(Math.PI / 2, 0, s * 0.25); a.position.set(0.05 + s * 0.27, 0.07, 1.55); G.add(a);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), skin); h.position.set(0.05 + s * 0.33, 0.05, 1.3); G.add(h); }
  legT = new THREE.Group(); legT.position.set(0.1, 0.07, 1.33); G.add(legT);         // la pierna atrapada (cadera → bajo el coche)
  const l1 = cap(0.068, 0.72, jeans); l1.rotation.x = Math.PI / 2; l1.position.set(0, 0, -0.42); legT.add(l1);
  const f1 = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.12, 0.2, 2, 0.03), shoe); f1.position.set(0, 0.03, -0.86); legT.add(f1);
  const l2 = cap(0.068, 0.72, jeans); l2.rotation.set(Math.PI / 2, 0, 0); l2.rotation.y = 0.55; l2.position.set(-0.22, 0.0, 1.06); G.add(l2);
  const f2 = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.12, 0.2, 2, 0.03), shoe); f2.position.set(-0.47, 0.04, 0.72); f2.rotation.y = 0.55; G.add(f2);
  return G;
}
// el guante que mete el cojín
function makeGlove() {
  const G = new THREE.Group(), gm = std(0x15161a, 0.8), band = new THREE.MeshStandardMaterial({ color: 0xd9d34a, roughness: 0.4, emissive: 0x777a20, emissiveIntensity: 0.25 });
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.05, 0.12, 2, 0.02), gm); G.add(palm);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.06, 4, 8), gm); f.rotation.x = Math.PI / 2; f.position.set(-0.04 + i * 0.027, -0.004, -0.09); G.add(f); }
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.05, 4, 8), gm); th.rotation.set(Math.PI / 2, 0.8, 0); th.position.set(0.065, 0, -0.03); G.add(th);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.14, 14), gm); cuff.rotation.x = Math.PI / 2; cuff.position.z = 0.12; G.add(cuff);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.067, 0.03, 14), band); b.rotation.x = Math.PI / 2; b.position.z = 0.15; G.add(b);
  const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.5, 14), std(0x2a3346, 0.8)); sl.rotation.x = Math.PI / 2; sl.position.z = 0.43; G.add(sl);
  G.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return G;
}
function dialTex() {
  return canvasTex(256, 256, (x) => {
    x.fillStyle = '#9a9890'; x.beginPath(); x.arc(128, 128, 120, 0, 7); x.fill(); x.lineWidth = 10; x.strokeStyle = '#222'; x.stroke();
    for (let i = 0; i <= 16; i++) { const a = (-225 + i * 270 / 16) * Math.PI / 180, r0 = i % 4 === 0 ? 82 : 94; x.strokeStyle = i > 12 ? '#c8261c' : '#222'; x.lineWidth = i % 4 === 0 ? 6 : 3; x.beginPath(); x.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); x.lineTo(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108); x.stroke();
      if (i % 4 === 0) { x.fillStyle = '#222'; x.font = '700 30px Inter'; x.textAlign = 'center'; x.fillText(String(i), 128 + Math.cos(a) * 62, 138 + Math.sin(a) * 62); } }
    x.fillStyle = '#222'; x.font = '700 26px Inter'; x.textAlign = 'center'; x.fillText('BAR', 128, 196);
  }, { aniso: 4 });
}
function hoseMeshFor(key, pts, col) {
  if (hoses[key]) { hoses[key].geometry.dispose(); world.remove(hoses[key]); }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.013, 8, false), hoses[key + 'M'] || (hoses[key + 'M'] = std(new THREE.Color(col).multiplyScalar(0.6), 0.7)));
  m.castShadow = true; world.add(m); hoses[key] = m; return m;
}
function buildWorld() {
  mats();
  world.add(new THREE.HemisphereLight(0x3a4c76, 0x0a0705, 0.7));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.45); moon.position.set(-14, 30, 20); world.add(moon);
  polyM = new THREE.MeshStandardMaterial({ color: 0xf2c21a, roughness: 0.55, emissive: 0xf2c21a, emissiveIntensity: 0.12 });
  // carretera, rayas, bionda, campo y árboles
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#17181b'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 16 + rnd(i) * 26; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(30, 4);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(140, 14), new THREE.MeshStandardMaterial({ map: asph, color: 0x6a6a6a, roughness: 0.42, metalness: 0.2 }));
  road.rotation.x = -Math.PI / 2; road.receiveShadow = true; world.add(road);
  const field = new THREE.Mesh(new THREE.PlaneGeometry(140, 80), new THREE.MeshStandardMaterial({ color: 0x1a2416, roughness: 1 })); field.rotation.x = -Math.PI / 2; field.position.set(0, -0.02, -47); field.receiveShadow = true; world.add(field);
  const field2 = field.clone(); field2.position.z = 47; world.add(field2);
  const lineM = new THREE.MeshStandardMaterial({ color: 0x9a9a90, roughness: 0.5, emissive: 0x0e0e0c });
  for (const z of [-6.3, 6.3]) { const l = new THREE.Mesh(new THREE.BoxGeometry(140, 0.012, 0.14), lineM); l.position.set(0, 0.008, z); world.add(l); }
  for (let i = 0; i < 18; i++) { const x = -68 + i * 8; if (Math.abs(x) > 3) { const d = new THREE.Mesh(new THREE.BoxGeometry(4, 0.012, 0.14), lineM); d.position.set(x, 0.008, -3.2); world.add(d); } }
  const steel = new THREE.MeshStandardMaterial({ color: 0x5b6068, metalness: 0.8, roughness: 0.4 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(140, 0.32, 0.07), steel); rail.position.set(0, 0.62, -7.3); world.add(rail);
  for (let x = -70; x <= 70; x += 2) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), steel); p.position.set(x, 0.375, -7.25); world.add(p); }
  const barkM = std(0x2c2117, 1), leafB = new THREE.MeshStandardMaterial({ color: 0x15241a, roughness: 1, flatShading: true });
  for (let i = 0; i < 16; i++) { const x = -60 + i * 8 + rnd(i) * 3, z = -12 - rnd(i * 3) * 10, t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 4, 8), barkM); t.position.set(x, 2, z); world.add(t);
    for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + rnd(i * 5 + k) * 0.8, 0), leafB); f.position.set(x + (rnd(i * 7 + k) - 0.5) * 2, 4.4 + rnd(i * 9 + k) * 1.4, z + (rnd(i * 11 + k) - 0.5) * 2); world.add(f); } }
  // el coche, que gira sobre la línea de las ruedas de enfrente
  carP = new THREE.Group(); carP.position.set(0, 0, -0.86); world.add(carP);
  car = makeCar(0x2a4f78); car.position.z = 0.86; carP.add(car);
  victim = makeVictim(); world.add(victim);
  // los cojines: delante (40 t), y la pila de atrás (40 t + 20 t)
  bagF = makeBag(SB, '40 T', 0xf2c21a); world.add(bagF);
  bagR = makeBag(SB, '40 T', 0xd8261c); world.add(bagR);
  bagS = makeBag(SS, '20 T', 0x2f7ff0); world.add(bagS);
  // lo que NO se hace: el pequeño abajo y el grande encima (fantasma rojo)
  const gm = new THREE.MeshBasicMaterial({ color: 0xff3b2e, transparent: true, opacity: 0.55, depthWrite: false, fog: false });
  ghostG = new THREE.Group(); ghostG.position.set(-2.25, 0, 2.45);
  const g1 = new THREE.Mesh(new RoundedBoxGeometry(SS, 0.12, SS, 2, 0.04), gm); g1.position.y = 0.06; ghostG.add(g1);
  const g2 = new THREE.Mesh(new RoundedBoxGeometry(SB, 0.12, SB, 2, 0.04), gm); g2.position.set(0.1, 0.19, 0); g2.rotation.z = -0.22; ghostG.add(g2);
  ghostG.visible = false; world.add(ghostG);
  // el mando con dos manómetros y la botella de aire
  const ctl = new THREE.Group(); ctl.position.copy(CTRL); ctl.rotation.y = -0.5; world.add(ctl);
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.14, 0.26, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0x9c7a0e, roughness: 0.6 })); box.position.y = 0.07; box.castShadow = true; ctl.add(box);
  const dt = dialTex();
  for (const x of [-0.1, 0.1]) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.075, 32), new THREE.MeshStandardMaterial({ map: dt, roughness: 0.3 })); d.rotation.x = -Math.PI / 2 + 0.35; d.position.set(x, 0.15, 0.0); ctl.add(d);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.077, 0.008, 8, 32), M.chrome); rim.rotation.copy(d.rotation); rim.position.copy(d.position); ctl.add(rim);
    const nd = new THREE.Group(); nd.position.copy(d.position); nd.rotation.copy(d.rotation); nd.translateZ(0.004); ctl.add(nd);
    const piv = new THREE.Group(); nd.add(piv);
    const nm = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.06, 0.004), GLOW(0xc8261c, 1)); nm.position.y = 0.025; piv.add(nm); needles.push(piv);
    const lev = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.09), M.black); lev.position.set(x, 0.15, 0.12); ctl.add(lev);
  }
  const bot = new THREE.Group(); bot.position.set(CTRL.x + 0.55, 0.09, CTRL.z - 0.35); bot.rotation.set(0, 0.4, Math.PI / 2); world.add(bot);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.62, 20), std(0x30343a, 0.4, 0.5)); cyl.castShadow = true; bot.add(cyl);
  const sh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x30343a, 0.4, 0.5)); sh.position.y = 0.31; bot.add(sh);
  const vlv = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 10), M.chrome); vlv.position.y = 0.42; bot.add(vlv);
  const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 20), GLOW(0xe8e8e8, 0.35)); hb.position.y = 0.2; bot.add(hb);
  hoseMeshFor('air', [V(CTRL.x + 0.32, 0.03, CTRL.z - 0.2), V(CTRL.x + 0.4, 0.02, CTRL.z - 0.35), V(CTRL.x + 0.55, 0.09, CTRL.z - 0.08)], 0x111111);
  // bloques y cuñas para calzar (delante y detrás de los cojines)
  for (const x of [1.75, -1.75, 0.45]) { const G = new THREE.Group(); const b1 = makeStep(0.22); b1.rotation.y = Math.PI; G.add(b1); const b2 = makeStep(0.22); b2.rotation.y = Math.PI; b2.position.y = 0.22; G.add(b2); const w = makeWedge(0.42, 0.12, 0.22); w.rotation.y = Math.PI / 2; w.position.y = 0.44; G.add(w); G.userData = { x }; G.visible = false; world.add(G); blocks.push(G); }
  // la mancha de contacto del cojín de arriba (se encoge al hincharse)
  patch = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x48d6ff, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
  patch.rotation.x = -Math.PI / 2; patch.visible = false; world.add(patch);
  glove = makeGlove(); world.add(glove);
  // la autobomba al fondo, el foco de trabajo
  truck = makeTruck(); truck.rotation.y = Math.PI * 0.85; truck.position.set(-6.5, 0, -4.2); world.add(truck);
  truck.traverse(o => { if (o.isMesh) o.castShadow = true; }); beacons = truck.userData.lbar;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4, 10), steel); mast.position.set(4.6, 2, 5.4); world.add(mast);
  const lh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.2), GLOW(0xfff4e0, 2.2)); lh.position.set(4.55, 4.05, 5.3); lh.lookAt(0, 0.5, 0); world.add(lh);
  workL = new THREE.SpotLight(0xfff2e0, 75, 40, 0.7, 0.6, 1.3); workL.position.set(4.5, 4.0, 5.2); workL.target.position.set(-0.3, 0.3, 0.8);
  workL.castShadow = true; workL.shadow.mapSize.set(2048, 2048); workL.shadow.bias = -0.0004; world.add(workL, workL.target);
  const fill = new THREE.PointLight(0xffd6a8, 3, 6, 2); fill.position.set(-0.2, 0.9, 2.6); world.add(fill);
  // un bombero junto al coche
  const f = makeFirefighter(); f.position.set(2.9, 0, -1.7); f.rotation.y = -2.2; world.add(f); f.traverse(o => { if (o.isMesh) o.castShadow = true; });
}

// ------------------------------------------------------------------ tiempos y cámara (un dron que no para)
let T = {}, KEYS = null, KH = null, HF = null, HR = null, HS = null;
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  T.sl0 = T.cojin - 0.55; T.sl1 = T.cojin + 0.6;                       // el guante mete el cojín de delante
  T.r0 = T.pones - 0.35; T.r1 = T.pones + 0.4;                         // el grande de atrás entra
  T.s0 = T.dos - 0.05; T.s1 = T.dos + 0.55;                            // y el pequeño, encima
  T.b0 = T.calzas - 0.15;                                              // los bloques
  // cuánto se hincha cada cojín (m)
  HF = [[0, [0]], [T.levanta1 - 0.15, [0]], [T.levanta1 + 0.9, [0.15]], [T.toneladas + 0.4, [0.2]], [T.sube3 - 0.1, [0.2]], [T.mucho + 0.25, [0.43]], [T.end, [0.43]]];
  HR = [[0, [0]], [T.no - 0.05, [0]], [T.pequeno + 0.3, [0.3]], [T.end, [0.3]]];
  HS = [[0, [0]], [T.no + 0.15, [0]], [T.pequeno + 0.4, [0.26]], [T.infla - 0.05, [0.26]], [T.letC + 0.3, [0.34]], [T.end, [0.34]]];
  for (const K of [HF, HR, HS]) for (let i = 1; i < K.length; i++) K[i][0] = Math.max(K[i][0], K[i - 1][0] + 0.05);
  KEYS = camKeys(); KH = KEYS;
}
function camKeys() {
  const K = [
    [0, [0.95, 0.55, 2.35, 0.1, 0.16, 0.8, 42]],                    // el coche encima de la pierna
    [T.pierna + 0.3, [0.75, 0.6, 2.25, 0.2, 0.16, 0.8, 42]],
    [T.cojin, [1.45, 0.75, 2.65, 0.75, 0.13, 0.85, 42]],             // el guante mete el cojín
    [T.levanta1 + 0.6, [1.85, 0.95, 3.0, 0.6, 0.35, 0.6, 42]],      // y el coche sube
    [T.doce, [2.65, 0.85, 3.4, 1.9, 0.15, 2.3, 40]],                 // el manómetro: 12 bar
    [T.sesenta, [2.9, 1.8, 5.1, 0.4, 0.45, 0.5, 42]],                // hasta 68 t
    [T.sube3, [1.75, 0.62, 2.7, 0.95, 0.3, 0.8, 42]],                // sube poco: medio metro
    [T.mucho + 0.4, [1.6, 0.66, 2.6, 0.95, 0.3, 0.8, 42]],
    [T.pones, [-0.3, 0.82, 2.65, -0.8, 0.25, 0.7, 42]],             // ¿y si pones dos?
    [T.doble + 0.3, [-0.15, 0.88, 2.75, -0.8, 0.3, 0.7, 42]],
    [T.no, [-1.65, 0.95, 2.95, -0.8, 0.45, 0.6, 42]],               // ¡no! solo sube más alto
    [T.pequeno + 0.3, [-1.45, 1.05, 3.05, -0.8, 0.5, 0.6, 42]],
    [T.grande, [-0.9, 1.45, 4.45, -1.6, 0.35, 1.5, 42]],             // el grande abajo (y el fantasma al revés)
    [T.encima6 + 0.5, [-1.0, 1.5, 4.55, -1.5, 0.35, 1.4, 42]],
    [T.sube7, [1.9, 1.55, 4.3, 0.0, 0.35, 0.85, 42]],                // calzas con cuñas; le sacan la pierna
    [T.cunas + 0.6, [2.1, 1.65, 4.5, 0.0, 0.35, 0.85, 42]],
    [T.infla, [-0.5, 1.55, 2.05, -0.82, 0.55, 0.65, 40]],           // la pregunta: el cojín de arriba
    [T.letC + 0.4, [-0.42, 1.6, 2.1, -0.82, 0.55, 0.65, 40]],
    [T.compartir + 0.6, [2.6, 3.3, 6.6, 0, 0.5, 0, 44]],
    [T.end, [3.1, 3.9, 7.5, 0, 0.5, 0, 44]],
  ];
  // alejar el dron: cada plano se aleja de su objetivo (los cercanos, más)
  for (const k of K) { const v = k[1], d = Math.hypot(v[0] - v[3], v[1] - v[4], v[2] - v[5]), f = d < 3.2 ? 2.35 : d < 4.8 ? 1.7 : 1.25;
    for (let c = 0; c < 3; c++) v[c] = v[c + 3] + (v[c] - v[c + 3]) * f; }
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
  const v = hermite(KH, t);
  return pose(V(v[0] + 0.03 * Math.sin(t * 0.7), v[1] + 0.02 * Math.sin(t * 0.53 + 1), v[2] + 0.02 * Math.sin(t * 0.41 + 2)), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t (todo depende solo de t)
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
const HV = (K, t) => Math.max(0, hermite(K, t)[0]);
const HOSE_KEYS = {};
function hoseTo(key, a, mids, col) {
  const k = [a, ...mids].map(p => p.x.toFixed(3) + ',' + p.y.toFixed(3) + ',' + p.z.toFixed(3)).join('|');
  if (HOSE_KEYS[key] === k) return; HOSE_KEYS[key] = k;
  hoseMeshFor(key, [a, ...mids], col);
}
let SK = 0, SK2 = 0, RT = 0, Ucar = REST;
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = 8 + 70 * on;
  const hz = (t * 1.5) % 1 < 0.5 ? 1 : 0.15; blink.forEach(m => m.color.setRGB(1.0 * hz, 0.54 * hz, 0.1 * hz));
  // el cojín de delante: entra empujado por el guante y se hincha
  SK = e3(pr(t, T.sl0, T.sl1 - T.sl0));
  bagF.position.set(XF, 0, mx(2.3, BZ, SK)); setBag(bagF, HV(HF, t));
  const gout = e3(pr(t, T.sl1, 0.55));
  glove.visible = t > T.sl0 - 0.5 && t < T.sl1 + 0.6;
  glove.position.set(XF - 0.08, 0.05 + 0.25 * gout, bagF.position.z + SB / 2 + 0.06 + 0.9 * gout - 0.25 * (1 - e3(pr(t, T.sl0 - 0.5, 0.5))) * 0);
  // la pila de atrás: el grande y, encima, el pequeño
  const rk = e3(pr(t, T.r0, T.r1 - T.r0)); bagR.visible = t > T.r0 - 0.05; bagR.position.set(XR, 0, mx(2.4, BZ, rk)); setBag(bagR, HV(HR, t));
  RT = bagTop(bagR);
  SK2 = e3(pr(t, T.s0, T.s1 - T.s0)); bagS.visible = t > T.s0 - 0.05;
  bagS.position.set(XR, RT + 0.12 * (1 - SK2), mx(2.4, BZ, SK2)); setBag(bagS, HV(HS, t));
  // el coche: se apoya en lo más alto que tenga debajo y gira sobre las ruedas de enfrente
  let U = REST;
  if (SK > 0.98) U = Math.max(U, bagTop(bagF));
  if (SK2 > 0.98 && rk > 0.98) U = Math.max(U, RT + bagTop(bagS));
  Ucar = U; carP.rotation.x = -Math.asin(cl((U - NOM) / ARM, -0.5, 0.5));
  // le sacan la pierna; los bloques y las cuñas
  victim.position.z = 0.7 * e3(pr(t, T.sube7 + 0.15, 1.1));
  blocks.forEach((b, i) => { const k = e3(pr(t, T.b0 + i * 0.22, 0.6)); b.visible = k > 0.001; b.position.set(b.userData.x, 0, mx(2.8, 0.74, k)); });
  ghostG.visible = t > T.grande - 0.25 && t < T.sube7;
  // los manómetros
  [12 * sm(T.levanta1 - 0.25, T.doce + 0.2, t), 12 * sm(T.no - 0.1, T.alto + 0.2, t)].forEach((p, i) => { const a = (-225 + (p + 0.15 * Math.sin(t * 13 + i)) * 270 / 16) * Math.PI / 180; needles[i].rotation.z = -a - Math.PI / 2; });
  // las mangueras (siguen a los cojines)
  const nF = bagF.position.clone().add(bagF.userData.nip);
  hoseTo('f', nF, [V(nF.x + 0.25, 0.02, nF.z + 0.35), V(1.6, 0.02, 1.7), V(CTRL.x - 0.18, 0.05, CTRL.z - 0.05)], 0xf2c21a);
  if (bagR.visible) { const nR = bagR.position.clone().add(bagR.userData.nip); hoseTo('r', nR, [V(nR.x + 0.1, 0.02, nR.z + 0.4), V(-0.55, 0.02, 3.3), V(0.9, 0.02, 3.35), V(CTRL.x - 0.12, 0.05, CTRL.z + 0.05)], 0xd8261c); }
  if (bagS.visible) { const nS = bagS.position.clone().add(bagS.userData.nip); hoseTo('s', nS, [V(nS.x + 0.12, Math.max(0.02, nS.y * 0.5), nS.z + 0.35), V(-0.45, 0.02, 3.4), V(1.0, 0.02, 3.45), V(CTRL.x - 0.08, 0.05, CTRL.z + 0.08)], 0x2f7ff0); }
  // la mancha de contacto del cojín de arriba
  patch.visible = t > T.infla - 0.15 && t < T.compartir - 0.2 && SK2 > 0.98;
  const r = SS / 2 * cl(1 - HV(HS, t) / 0.45, 0.08, 1);
  patch.position.set(XR, RT + bagTop(bagS) + 0.004, BZ); patch.scale.set(r, r, 1);
  patch.material.opacity = 0.55 * sm(T.infla - 0.15, T.infla + 0.2, t) * (1 - sm(T.compartir - 0.5, T.compartir - 0.2, t));
}

// ------------------------------------------------------------------ la capa 2D
function arrowUp(P, len, col, a, txt) {
  if (a <= 0.005) return; const q = proj(P); if (!q.ok) return;
  g.save(); g.globalAlpha = cl(a); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 10; g.lineCap = 'round';
  const y1 = q.y - len; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x, y1 + 18); g.stroke();
  g.beginPath(); g.moveTo(q.x, y1); g.lineTo(q.x - 22, y1 + 30); g.lineTo(q.x + 22, y1 + 30); g.closePath(); g.fill();
  g.restore();
  if (txt) label(q.x + 120, y1 + 20, txt, col, a, { px: 54 });
}
function card(lines, y, col, a, w = 900) {
  if (a <= 0.005) return;
  const h = 30 + lines.reduce((s, l) => s + l[1] * 1.15, 0);
  g.save(); g.globalAlpha = cl(a); g.translate(540, y);
  rr(-w / 2, -h / 2, w, h, 30); g.fillStyle = 'rgba(8,10,14,0.92)'; g.fill(); g.strokeStyle = col; g.lineWidth = 5; g.stroke();
  let yy = -h / 2 + 15;
  for (const [txt0, px, c] of lines) { yy += px * 1.15; txt(txt0, 0, yy - px * 0.28, px, c || '#F4F6F8', 400, 'center', 'Bebas'); }
  g.restore();
}
function ruler(a) {
  if (a <= 0.005) return;
  const bx = XF + SB / 2 + 0.14, bz = BZ + 0.18, p0 = proj(V(bx, 0, bz)), p5 = proj(V(bx, 0.5, bz));
  if (!p0.ok || !p5.ok) return;
  g.save(); g.globalAlpha = cl(a); g.strokeStyle = '#F2C21A'; g.lineWidth = 6; g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p5.x, p5.y); g.stroke();
  for (let i = 0; i <= 5; i++) { const q = proj(V(bx, i * 0.1, bz)); g.lineWidth = 4; g.beginPath(); g.moveTo(q.x - (i % 5 === 0 ? 22 : 12), q.y); g.lineTo(q.x + (i % 5 === 0 ? 22 : 12), q.y); g.stroke(); }
  const qt = proj(V(bx, bagTop(bagF), bz)); g.fillStyle = GREEN2; g.beginPath(); g.moveTo(qt.x - 30, qt.y); g.lineTo(qt.x - 48, qt.y - 12); g.lineTo(qt.x - 48, qt.y + 12); g.closePath(); g.fill();
  g.restore();
  label(p5.x + 110, p5.y, '≈ 50 CM MÁX', '#F2C21A', a, { px: 50 });
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const win = (t0, t1) => sm(t0 - 0.12, t0 + 0.08, t) * (1 - sm(t1 - 0.2, t1, t));
  const pop = t0 => 1 + 0.16 * pulse(t, t0 + 0.12, 0.18);
  // el gancho: la pierna atrapada
  const la = win(T.pierna - 0.1, T.cojin);
  if (la > 0.01) { const q = proj(V(0.1, 0.12, 0.86)); if (q.ok) { g.save(); g.globalAlpha = la * (0.6 + 0.4 * Math.sin(t * 9)); g.strokeStyle = RED2; g.lineWidth = 7; g.beginPath(); g.arc(q.x, q.y, 70 + 10 * Math.sin(t * 9), 0, 7); g.stroke(); g.restore(); } }
  tag(V(0.1, 0.14, 0.95), 'PIERNA ATRAPADA', RED2, la, 60, 260, { px: 58, icon: 'warn', s: pop(T.pierna) });
  tag(bagF.position.clone().add(V(0.15, 0.03, SB / 2)), '2,5 CM', GOLD2, win(T.libreta - 0.05, T.levanta1 + 0.3), -40, 240, { px: 60, sub: 'COMO UNA LIBRETA', s: pop(T.libreta) });
  arrowUp(V(XF + 0.2, 0.62, 0.95), 170, GREEN2, win(T.levanta1, T.aire), 'SUBE');
  // 12 bar · hasta 68 t
  tag(CTRL.clone().add(V(-0.05, 0.16, 0.05)), '12 BAR', CYAN2, win(T.doce - 0.05, T.sesenta - 0.1), 60, 230, { px: 62, s: pop(T.doce) });
  card([['HASTA 68 T', 110, GOLD2], ['SEGÚN EL MODELO', 40, 'rgba(226,232,240,0.85)']], 1330, GOLD2, win(T.sesenta - 0.05, T.sube3 - 0.1) * (1 + 0 * pop(T.toneladas)), 620);
  // sube poco: medio metro
  ruler(win(T.sube3 - 0.1, T.pones - 0.1));
  // ¿y si pones dos?
  tag(bagR.position.clone().add(V(-0.2, 0.05, SB / 2)), '40 T', RED2, win(T.pones + 0.1, T.grande - 0.1) * (bagR.visible ? 1 : 0), -140, 170, { px: 62 });
  tag(bagS.position.clone().add(V(0.1, 0.06, SS / 2)), '20 T', CYAN2, win(T.dos + 0.2, T.grande - 0.1) * (bagS.visible ? 1 : 0), 170, 120, { px: 62 });
  card([['40 T + 20 T = ¿60 T?', 92, '#F4F6F8']], 640, GOLD2, win(T.doble - 0.1, T.no + 0.15), 760);
  stamp('¡NO!', 1300, RED2, Math.exp(-Math.pow((t - T.no - 0.4) / 0.45, 4)), 210, -0.05);
  arrowUp(V(XR - 0.45, 0.72, 0.9), 190, GREEN2, win(T.alto - 0.1, T.grande - 0.1), 'MÁS ALTO');
  const ca = win(T.levante - 0.1, T.grande - 0.05);
  if (ca > 0.01) {
    card([['LEVANTA', 50, 'rgba(226,232,240,0.85)'], ['20 T', 130, GREEN2]], 660, GREEN2, ca, 520);
    g.save(); g.globalAlpha = ca; txt('60 T', 870, 690, 64, 'rgba(255,255,255,0.55)', 400, 'center', 'Bebas'); g.strokeStyle = RED2; g.lineWidth = 8; g.beginPath(); g.moveTo(815, 700); g.lineTo(925, 650); g.stroke(); g.restore();
    const q = proj(bagS.position.clone().add(V(0, RT * 0 + 0.06, 0))); if (q.ok) { g.save(); g.globalAlpha = ca * (0.5 + 0.5 * Math.sin(t * 8)); g.strokeStyle = GREEN2; g.lineWidth = 6; g.beginPath(); g.ellipse(q.x, q.y, 150, 70, 0, 0, 7); g.stroke(); g.restore(); }
  }
  // el grande abajo, el pequeño centrado encima (y al revés, no)
  const ga = win(T.grande - 0.1, T.sube7);
  tag(ghostG.position.clone().add(V(0, 0.32, 0)), '✗  AL REVÉS', RED2, ga, -60, -160, { px: 56 });
  tag(V(XR, RT + 0.05, BZ + SB / 2), 'GRANDE ABAJO', GREEN2, ga, 120, 200, { px: 56, icon: 'ok', s: pop(T.grande) });
  tag(V(XR, RT + bagTop(bagS), BZ + SS / 2 - 0.05), 'PEQUEÑO CENTRADO', GREEN2, win(T.centrado - 0.1, T.sube7), 140, -150, { px: 52, icon: 'ok', s: pop(T.centrado) });
  // según sube, calzas con cuñas; la pierna, libre
  tag(V(blocks[0].userData.x, 0.5, 0.95), 'CUÑAS', GOLD2, win(T.cunas - 0.1, T.infla - 0.1) * (blocks[0].visible ? 1 : 0), 80, 170, { px: 60, s: pop(T.cunas) });
  tag(V(0.1, 0.12, 0.95 + victim.position.z), 'PIERNA LIBRE', GREEN2, win(T.cunas + 0.35, T.infla - 0.1), -150, 220, { px: 56, icon: 'ok' });
  // la pregunta de Bomberados
  const qa = sm(T.infla - 0.15, T.infla + 0.15, t) * (1 - sm(T.compartir - 0.4, T.compartir - 0.1, t));
  if (qa > 0.005) {
    g.save(); g.globalAlpha = qa; g.translate(540, 650);
    rr(-480, -95, 960, 190, 32); g.fillStyle = 'rgba(8,10,14,0.93)'; g.fill(); g.strokeStyle = ORANGE2; g.lineWidth = 5; g.stroke();
    g.letterSpacing = '4px'; txt('PREGUNTA · BOMBERADOS', 0, -42, 34, ORANGE2, 400, 'center', 'Bebas'); g.letterSpacing = '0px';
    txt('CUANTO MÁS SE INFLA, ¿EMPUJA…?', 0, 42, 66, '#F4F6F8', 400, 'center', 'Bebas');
    g.restore();
    tag(patch.position.clone(), 'CONTACTO', CYAN2, qa * sm(T.empuja - 0.1, T.empuja + 0.2, t), 170, 120, { px: 50 });
    const opts = [['A', 'MÁS', T.letA, '#FF7A1A'], ['B', 'IGUAL', T.letB, '#2DD4BF'], ['C', 'MENOS', T.letC, '#F0457A']];
    opts.forEach(([L, s, t0, c], i) => {
      const k = sm(t0 - 0.12, t0 + 0.12, t) * qa; if (k < 0.01) return;
      const x = 210 + i * 330, y = 1470, b = 0.7 + 0.3 * bk(cl((t - t0 + 0.12) / 0.35));
      g.save(); g.globalAlpha = k; g.translate(x, y); g.scale(b, b); rr(-145, -62, 290, 124, 30); g.fillStyle = 'rgba(8,10,14,0.92)'; g.fill(); g.strokeStyle = c; g.lineWidth = 5; g.stroke();
      g.beginPath(); g.arc(-88, 0, 38, 0, 7); g.fillStyle = c; g.fill(); txt(L, -88, 17, 50, '#0b0d10', 400, 'center', 'Bebas'); txt(s, 28, 20, 56, '#F4F6F8', 400, 'center', 'Bebas'); g.restore();
    });
    const ce = sm(T.letC + 0.15, T.letC + 0.45, t) * qa;
    if (ce > 0) { const b = 1 + 0.05 * Math.max(0, Math.sin((t - T.letC) * 6)); g.save(); g.globalAlpha = ce; g.translate(540, 1610); g.scale(b, b); rr(-270, -46, 540, 92, 46); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke(); txt('💬  COMENTA TU LETRA', 0, 18, 50, '#F2F5F8', 400, 'center', 'Bebas'); g.restore(); }
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
  finMat.uniforms.uFlash.value = pulse(t, T.no + 0.05, 0.09) * 0.14; finMat.uniforms.uFlashCol.value.setRGB(1, 0.3, 0.25);
  finMat.uniforms.uDim.value = mx(1, 0.86, sm(T.infla - 0.1, T.infla + 0.3, t) * (1 - sm(T.compartir - 0.3, T.compartir, t))) * mx(1, 0.75, sm(T.compartir - 0.2, T.compartir + 0.3, t)) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  await overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 3.0);

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
  } catch (e) { window.failed = 'cojines: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
