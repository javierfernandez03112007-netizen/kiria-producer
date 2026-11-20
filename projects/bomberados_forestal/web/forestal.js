// «Este incendio tiene cabeza, cola… ¡y dedos!» — las partes de un incendio forestal (idea de Adrián, Notion «DOMINGO 22»);
// 30–40 s. Un dron sobre un monte de pinos. El incendio entero (con forma de bicho) se rebobina hasta una chispa y vuelve a
// crecer: cada parte aparece cuando se forma (origen, cabeza, flancos, cola, perímetro, dedo, bolsa, isla y foco secundario).
// El fuego es un mapa de «llegada» (en qué momento F llega a cada punto: elipse que empuja el viento + un dedo + una isla +
// un foco); el suelo, los pinos y las llamas se pintan según F. Cierre: ¿por dónde empiezas a apagarlo? (A, B, C o D) y el
// monte que se vuelve la hoja de apuntes. Todo depende solo de t. Motor de guia.js.
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






// ================================================================== un monte de pinos desde un dron; el incendio crece con F (el «tiempo del fuego»)
const world = new THREE.Group(); scene.add(world);
const RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D', PINK2 = '#FF5FA2', VIOL2 = '#B79BFF', WHITE2 = '#F4F6F8', INK = '#1B2850';
cam.near = 0.5; cam.far = 3200; cam.updateProjectionMatrix();
renderer.shadowMap.type = THREE.PCFShadowMap;                    // más barata que la suave (aquí no se nota)
const HORIZ = new THREE.Color(0.62, 0.55, 0.48);
scene.background = HORIZ.clone();
scene.fog = new THREE.Fog(HORIZ.clone(), 300, 1500);
scene.environmentIntensity = 0.3;
const SUN_DIR = V(0.55, 0.65, 0.52).normalize();
const LBLY = 560;                                                 // los rótulos, por debajo de los subtítulos (y ≈ 280–500)

// relieve suave (m)
const hgt = (x, z) => 1.6 * Math.sin(x * 0.017 + 1.3) * Math.cos(z * 0.013 - 0.4) + 0.9 * Math.sin((x - z) * 0.023 + 0.7) + 0.35 * Math.sin(x * 0.061) * Math.sin(z * 0.053);
const G3 = (x, z, dy = 0) => V(x, hgt(x, z) + dy, z);

// ruido de valor: el borde no es una elipse perfecta
function vn(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, h = (a, b) => rnd(a * 157.31 + b * 113.97 + 0.5), s = v => v * v * (3 - 2 * v);
  return mx(mx(h(ix, iy), h(ix + 1, iy), s(fx)), mx(h(ix, iy + 1), h(ix + 1, iy + 1), s(fx)), s(fy)) * 2 - 1;
}
const fbm = (x, y) => 0.6 * vn(x, y) + 0.3 * vn(x * 2.1 + 5.2, y * 2.1 - 1.3) + 0.1 * vn(x * 4.3 - 2.7, y * 4.3 + 7.1);

// ------------------------------------------------------------------ el incendio: F en el que el fuego llega a cada punto (viento hacia −z)
const O = V(0, 0, 40);                                            // origen
const SPH = 85, SPB = 8, SPF = 22;                                   // m por unidad de F: cabeza, cola, flancos
const KC = (SPH - SPB) / 2, KA = (SPH + SPB) / 2, KB = SPF;            // elipse: centro, semieje largo, semieje corto
const DPHI = -50 * Math.PI / 180, DF = 0.6;                       // el dedo nace en el flanco izquierdo de delante, en F ≈ 0,6
const DC1 = [-26, -12], DC2 = [-32, -46], DSPD = 270, DLAT = 7, DW0 = 6.2, DW1 = 3.0;   // curva del dedo, velocidad, lo que engorda, ancho
const ISL = V(8, 0, -6), ISR = 6.5;                               // la isla
const SP = V(14, 0, -60), FS = 0.9;                               // el foco secundario y cuándo prende
const SKC = 50, SKA = 110, SKB = 95;
const DUR = 0.15;                                                 // cuánto F arde cada punto
function tEll(u, w, kc, ka, kb) {                                 // F mínimo con (u + kc·F)²/ka² + w²/kb² ≤ F²  (u: hacia la cola)
  const A = 1 - kc * kc / (ka * ka), B = -2 * u * kc / (ka * ka), C = -(u * u / (ka * ka) + w * w / (kb * kb));
  return (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A);
}
const nz = (x, z) => 1 + 0.12 * fbm(x / 22 + 3.1, z / 22 - 1.7) + 0.035 * fbm(x / 5 - 2.2, z / 5 + 4.4);
const P0 = V(O.x + KB * DF * Math.sin(DPHI), 0, O.z - KC * DF - KA * DF * Math.cos(DPHI));
const baseT = (x, z) => tEll(z - O.z, x - O.x, KC, KA, KB) * nz(x, z);
const FD0 = baseT(P0.x, P0.z);
// el eje del dedo: una curva que primero se abre hacia fuera y luego sigue al viento
const DAX = [], DCUM = [0];
for (let i = 0; i <= 40; i++) { const u = i / 40, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
  DAX.push([P0.x * (a + b + c) + b * DC1[0] + c * DC2[0], P0.z * (a + b + c) + b * DC1[1] + c * DC2[1]]); }
for (let i = 1; i < DAX.length; i++) DCUM.push(DCUM[i - 1] + Math.hypot(DAX[i][0] - DAX[i - 1][0], DAX[i][1] - DAX[i - 1][1]));
const DLEN = DCUM[DCUM.length - 1];
const DBOX = [Math.min(...DAX.map(p => p[0])) - 24, Math.max(...DAX.map(p => p[0])) + 24, Math.min(...DAX.map(p => p[1])) - 24, Math.max(...DAX.map(p => p[1])) + 24];
function fingerT(x, z) {
  if (x < DBOX[0] || x > DBOX[1] || z < DBOX[2] || z > DBOX[3]) return 9;
  let bl = 1e9, bs = 0;
  for (let i = 0; i < DAX.length - 1; i++) {
    const ax = DAX[i][0], az = DAX[i][1], dx = DAX[i + 1][0] - ax, dz = DAX[i + 1][1] - az, ll = dx * dx + dz * dz;
    const u = cl(((x - ax) * dx + (z - az) * dz) / ll), px = ax + dx * u, pz = az + dz * u, d = Math.hypot(x - px, z - pz);
    if (d < bl) { bl = d; bs = DCUM[i] + u * Math.sqrt(ll); }
  }
  const wv = mx(DW0, DW1, bs / DLEN) * (1 + 0.18 * fbm(bs / 7 + 1.1, 3.3)), ex = Math.max(0, bl - wv);
  if (ex > 14) return 9;
  return FD0 + bs / DSPD + ex / DLAT;
}
function dedoAt(s) {        // punto del eje a s metros del arranque
  s = cl(s, 0, DLEN); let i = 0; while (i < DCUM.length - 2 && DCUM[i + 1] < s) i++;
  const k = (s - DCUM[i]) / Math.max(DCUM[i + 1] - DCUM[i], 1e-6); return V(mx(DAX[i][0], DAX[i + 1][0], k), 0, mx(DAX[i][1], DAX[i + 1][1], k));
}
function inIsland(x, z) {
  const dx = x - ISL.x, dz = z - ISL.z, th = Math.atan2(dz, dx);
  return Math.hypot(dx, dz) < ISR * (1 + 0.15 * Math.sin(3 * th + 1) + 0.1 * Math.sin(5 * th - 0.4));
}
const spotT = (x, z) => FS + tEll(z - SP.z, x - SP.x, SKC, SKA, SKB) * (1 + 0.1 * fbm(x / 6 + 9.1, z / 6 - 3.3));
const mainT = (x, z) => inIsland(x, z) ? 9 : Math.min(baseT(x, z), fingerT(x, z));
const CLR = 10;                                                    // el claro donde empieza (sin pinos)
const arrivalAt = (x, z) => Math.min(mainT(x, z), spotT(x, z));
function intensityAt(x, z) {                                       // 1 = cabeza, ≈ 0,33 = flancos, 0 = cola
  const tb = baseT(x, z), tf = fingerT(x, z), ts = spotT(x, z);
  if (ts < Math.min(tb, tf)) { const f = ts - FS, s = f > 1e-3 ? (z - SP.z + SKC * f) / (SKA * f) : 0; return 0.35 + 0.45 * Math.pow(cl((1 - s) / 2), 1.5); }
  if (tf < tb) return 0.8;
  const f = tEll(z - O.z, x - O.x, KC, KA, KB), s = f > 1e-3 ? (z - O.z + KC * f) / (KA * f) : 0;
  return Math.pow(cl((1 - s) / 2), 1.6);
}
// puntos del borde en F (marchando desde dentro hasta que el fuego aún no ha llegado)
function march(x0, z0, dx, dz, F, maxL = 160, T = mainT) {
  let last = null;
  for (let s = 0; s < maxL; s += 0.4) { const x = x0 + dx * s, z = z0 + dz * s; if (T(x, z) > F) return last || V(x, 0, z); last = V(x, 0, z); }
  return last;
}
const headAt = F => march(O.x, O.z, 0, -1, F);
const tailAt = F => march(O.x, O.z - 2, 0, 1, F);
const flankAt = (F, sd) => { const zc = O.z - KC * Math.max(F, 0.02); return march(O.x, zc, sd, 0, F); };
const fingerTipAt = F => dedoAt((F - FD0) * DSPD);

// ------------------------------------------------------------------ el mapa de llegada (textura): R = F de llegada, G = intensidad, A = isla
const MAP = { x0: -130, z0: -170, S: 260, N: 512 };
let arrTex, GROUND;
function buildArrival() {
  const N = MAP.N, d = new Uint16Array(N * N * 4), h = THREE.DataUtils.toHalfFloat;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = MAP.x0 + (i + 0.5) / N * MAP.S, z = MAP.z0 + (j + 0.5) / N * MAP.S;
    const a = Math.min(arrivalAt(x, z), 9), o = (j * N + i) * 4;
    d[o] = h(a); d[o + 1] = h(a < 8 ? intensityAt(x, z) : 0); d[o + 2] = h(0); d[o + 3] = h(inIsland(x, z) ? 1 : 0);
  }
  arrTex = new THREE.DataTexture(d, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
  arrTex.minFilter = arrTex.magFilter = THREE.LinearFilter; arrTex.wrapS = arrTex.wrapT = THREE.ClampToEdgeWrapping; arrTex.needsUpdate = true;
}

// ------------------------------------------------------------------ el suelo: monte, frente que arde, ceniza y, al final, la hoja de apuntes
const GU = { uF: { value: 0 }, uArr: { value: null }, uMap: { value: new THREE.Vector4(MAP.x0, MAP.z0, MAP.S, 0) }, uNoise: { value: null }, uTime: { value: 0 },
  uPaper: { value: 0 }, uDur: { value: DUR }, uGlow: { value: 1 } };
function buildGround() {
  const G = new THREE.PlaneGeometry(2600, 2600, 260, 260); G.rotateX(-Math.PI / 2);
  const p = G.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, hgt(p.getX(i), p.getZ(i)));
  G.computeVertexNormals();
  GU.uArr.value = arrTex; GU.uNoise.value = NOISE;
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, GU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWP; uniform float uF, uTime, uPaper, uDur, uGlow; uniform sampler2D uArr, uNoise; uniform vec4 uMap;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec2 auv = (vWP.xz - uMap.xy) / uMap.z;
  vec4 A = texture2D(uArr, clamp(auv, 0.0, 1.0));            // fuera del mapa, el borde (sin saltos)
  float n1 = texture2D(uNoise, vWP.xz * 0.011).r, n2 = texture2D(uNoise, vWP.xz * 0.067 + 0.3).r, n3 = texture2D(uNoise, vWP.xz * 0.29 + 0.7).r;
  float k = (uF - A.r) / uDur;
  float fw = max(fwidth(A.r) / uDur, 1e-3);
  float burnt = smoothstep(-fw, fw, k);
  vec3 floorC = mix(vec3(0.050, 0.068, 0.030), vec3(0.105, 0.098, 0.052), smoothstep(0.3, 0.75, n1)) * mix(0.7, 1.2, n2);
  floorC = mix(floorC, vec3(0.20, 0.17, 0.085) * mix(0.8, 1.15, n3), 1.0 - smoothstep(7.5, 12.0, length(vWP.xz - vec2(0.0, 40.0))));
  vec3 ashC = mix(vec3(0.016, 0.015, 0.014), vec3(0.07, 0.066, 0.062), smoothstep(0.45, 0.85, n2 * 0.6 + n3 * 0.4));
  vec3 gc = mix(floorC, ashC, burnt);
  float fire = burnt * (1.0 - smoothstep(0.7, 1.0, k));
  float flick = 0.7 + 0.6 * texture2D(uNoise, vWP.xz * 0.08 + vec2(uTime * 0.31, -uTime * 0.23)).r;
  float edge = exp(-max(k, 0.0) * 5.0);
  vec3 fireEm = mix(vec3(1.1, 0.18, 0.025), vec3(3.4, 1.25, 0.28), edge) * (0.35 + 1.0 * A.g) * flick * fire;
  float ember = smoothstep(0.6, 0.9, n3) * step(1.0, k) * (1.0 - smoothstep(1.0, 2.6, k));
  fireEm += vec3(2.4, 0.5, 0.06) * ember * (0.55 + 0.45 * sin(uTime * 3.0 + n2 * 20.0));
  fireEm *= uGlow * (1.0 - uPaper);
  vec3 paperE = vec3(0.0);
  if (uPaper > 0.001) {
    vec2 gcell = vWP.xz / 5.0; vec2 gd = abs(fract(gcell + 0.5) - 0.5) / max(fwidth(gcell), vec2(1e-4));
    float gline = 1.0 - smoothstep(0.4, 1.4, min(gd.x, gd.y));
    vec3 pc = mix(vec3(0.95, 0.935, 0.885), vec3(0.42, 0.58, 0.86), gline * 0.42);
    pc = mix(pc, vec3(1.0, 0.74, 0.5), burnt * 0.8);
    pc = mix(pc, vec3(0.98, 0.42, 0.2), fire * 0.55);
    float cd = abs(uF - A.r) / max(fwidth(A.r), 1e-4);
    pc = mix(pc, vec3(0.08, 0.11, 0.24), 1.0 - smoothstep(0.9, 2.4, cd));
    paperE = pc * 1.28 * uPaper;
    gc *= 1.0 - uPaper;
  }
  diffuseColor.rgb = gc;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += fireEm + paperE;');
  };
  const ground = new THREE.Mesh(G, m); ground.receiveShadow = true; ground.renderOrder = 5; world.add(ground); GROUND = ground;   // después de los pinos: no se pinta lo que tapan
  return ground;
}

// ------------------------------------------------------------------ los pinos (instanciados): verdes → ardiendo → negros; al final se encogen (apuntes)
const TU = { uPaperT: { value: 0 } };
let NT = 0, TX, TZ, TA, TI, TD, TR, TPK, TIS;
function icoIdx() {             // icosaedro indexado (12 vértices)
  const t = (1 + Math.sqrt(5)) / 2, v = [-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1];
  const f = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
  const g = new THREE.BufferGeometry(), p = new Float32Array(v.length);
  for (let i = 0; i < 12; i++) { const L = Math.hypot(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]); p[i * 3] = v[i * 3] / L; p[i * 3 + 1] = v[i * 3 + 1] / L; p[i * 3 + 2] = v[i * 3 + 2] / L; }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setIndex(f); return g;
}
function pineGeo() {
  const parts = [];
  const add = (g, col) => { const c = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < c.length; i += 3) c.set(col, i); parts.push([g, c]); };
  const tr = new THREE.CylinderGeometry(0.14, 0.32, 5.4, 4, 1, true); tr.translate(0, 2.7, 0); add(tr, [0.2, 0.14, 0.09]);
  const c1 = icoIdx(); c1.scale(2.9, 1.5, 2.9); c1.translate(0, 5.9, 0); add(c1, [0.072, 0.142, 0.052]);
  const c2 = icoIdx(); c2.scale(1.9, 1.15, 1.9); c2.translate(0.6, 7.0, -0.4); add(c2, [0.088, 0.168, 0.06]);
  let n = 0, m = 0; for (const [g] of parts) { n += g.attributes.position.count; m += g.index.count; }
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), idx = new Uint16Array(m); let o = 0, oi = 0;
  for (const [g, c] of parts) { pos.set(g.attributes.position.array, o * 3); col.set(c, o * 3); const ix = g.index.array; for (let k = 0; k < ix.length; k++) idx[oi + k] = ix[k] + o; o += g.attributes.position.count; oi += ix.length; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  return g;
}
const TREE_V = (s) => s.replace('#include <common>', '#include <common>\nattribute vec4 aB; varying vec4 vB; uniform float uPaperT;')
  .replace('#include <begin_vertex>', `#include <begin_vertex>
  vB = aB;
  float crown = step(4.4, position.y);
  transformed.xz *= mix(1.0, 0.36, aB.y * crown);
  if (crown > 0.5) transformed.y = mix(transformed.y, 4.4 + (transformed.y - 4.4) * 0.7, aB.y);
  float pk = clamp(uPaperT * 1.7 - aB.z * 0.7, 0.0, 1.0);
  transformed *= 1.0 - pk * pk * (3.0 - 2.0 * pk);`);
let CHUNKS = [];
function buildTrees() {
  const L = [], SPC = 3.55;
  for (let z = -235; z < 125; z += SPC) for (let x = -160; x < 160; x += SPC) {
    const i = L.length, jx = x + (rnd(i * 1.91 + 3.3) - 0.5) * SPC * 0.85, jz = z + (rnd(i * 2.73 + 7.1) - 0.5) * SPC * 0.85;
    if (fbm(jx / 26 + 11.3, jz / 26 - 4.1) < -0.42 && !inIsland(jx, jz)) continue;     // claros
    if (Math.hypot(jx - O.x, jz - O.z) < CLR * (0.85 + 0.3 * rnd(i * 1.3))) continue;      // el claro del origen
    L.push([jx, jz]);
  }
  NT = L.length;
  TX = new Float32Array(NT); TZ = new Float32Array(NT); TA = new Float32Array(NT); TI = new Float32Array(NT); TD = new Float32Array(NT); TR = new Float32Array(NT);
  TPK = new Uint8Array(NT); TIS = new Uint8Array(NT);
  const geo = pineGeo();
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  m.onBeforeCompile = sh => {
    sh.uniforms.uPaperT = TU.uPaperT;
    sh.vertexShader = TREE_V(sh.vertexShader);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vB;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02, 0.018, 0.017), vB.y);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += vec3(2.6, 0.72, 0.1) * vB.x + vec3(0.09, 0.55, 0.2) * vB.w;`);
  };
  const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  dm.onBeforeCompile = sh => { sh.uniforms.uPaperT = TU.uPaperT; sh.vertexShader = TREE_V(sh.vertexShader); };
  for (let i = 0; i < NT; i++) {
    const [x, z] = L[i];
    TX[i] = x; TZ[i] = z; TR[i] = rnd(i * 5.17 + 0.3); TA[i] = arrivalAt(x, z); TI[i] = TA[i] < 8 ? intensityAt(x, z) : 0; TD[i] = DUR * (0.75 + 0.5 * rnd(i * 7.7 + 2.2));
    TIS[i] = inIsland(x, z) ? 1 : 0;
  }
  // por trozos de 40 × 40 m
  const CW = 40, NX = Math.ceil(320 / CW), byC = new Map();
  for (let i = 0; i < NT; i++) { const k = Math.floor((TX[i] + 160) / CW) + NX * Math.floor((TZ[i] + 235) / CW); if (!byC.has(k)) byC.set(k, []); byC.get(k).push(i); }
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = V(1, 1, 1), C = new THREE.Color();
  for (const ids of byC.values()) {
    const g = new THREE.BufferGeometry(); g.setIndex(geo.index); g.setAttribute('position', geo.attributes.position); g.setAttribute('normal', geo.attributes.normal); g.setAttribute('color', geo.attributes.color);
    const ab = new Float32Array(ids.length * 4), at = new THREE.InstancedBufferAttribute(ab, 4); at.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aB', at);
    const im = new THREE.InstancedMesh(g, m, ids.length); im.customDepthMaterial = dm;
    ids.forEach((i, j) => {
      const sc = 0.78 + 0.5 * rnd(i * 3.31 + 1.7);
      Q.setFromAxisAngle(V(0, 1, 0), TR[i] * 6.283); S.set(sc * (0.9 + 0.2 * rnd(i * 9.1)), sc, sc * (0.9 + 0.2 * rnd(i * 4.4)));
      M4.compose(V(TX[i], hgt(TX[i], TZ[i]) - 0.15, TZ[i]), Q, S); im.setMatrixAt(j, M4);
      const v = 0.8 + 0.38 * rnd(i * 6.6 + 0.9); C.setRGB(v * (0.95 + 0.14 * rnd(i * 2.2)), v, v * (0.88 + 0.16 * rnd(i * 8.8))); im.setColorAt(j, C);
      ab[j * 4 + 2] = rnd(i * 4.9 + 6.1);
    });
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = true; im.computeBoundingSphere(); im.boundingSphere.radius += 10;
    world.add(im); CHUNKS.push({ ids: Int32Array.from(ids), ab, at, im });
  }
  // la bolsa: los pinos sin quemar en F = 0,82 que quedan dentro de la envolvente de lo quemado (sin la isla ni el foco)
  const FP = 0.82, pts = [];
  for (let i = 0; i < NT; i++) if (mainT(TX[i], TZ[i]) <= FP) pts.push([TX[i], TZ[i]]);
  const hull = convexHull(pts);
  for (let i = 0; i < NT; i++) if (!TIS[i] && TA[i] > FP && inPoly(hull, TX[i], TZ[i]) && TZ[i] < 20 && TX[i] < -8) TPK[i] = 1;
}
function convexHull(P) {
  P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function inPoly(h, x, z) { let s = 0; for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length], c = (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]); if (c < 0) return false; } return true; }

// ------------------------------------------------------------------ llamas: una por pino (alto según la parte del incendio) que se inclinan con el viento
const FU = { uTex: { value: null }, uTime: { value: 0 }, uCam: { value: V(0, 0, 0) }, uBright: { value: 1.15 }, uGlobal: { value: 1 }, uWind: { value: V(0, 0, -1) } };
const FFV = `attribute vec3 aOff; attribute vec2 aSize; attribute float aSeed; attribute float aInt;
uniform vec3 uCam, uWind; uniform float uGlobal;
varying vec2 vUv; varying float vSeed; varying float vInt;
void main(){
  float k = aInt * uGlobal;
  vec3 wc = aOff;
  vec3 d = vec3(uCam.x - wc.x, 0.0, uCam.z - wc.z); d = length(d) > 1e-4 ? normalize(d) : vec3(0.0, 0.0, 1.0);
  vec3 rg = vec3(d.z, 0.0, -d.x);
  float h = aSize.y * (0.3 + 0.7 * k), y = position.y + 0.5;
  vec3 p = wc + rg * position.x * aSize.x * (0.55 + 0.45 * k) + vec3(0.0, y * h, 0.0) + uWind * pow(y, 1.6) * h * 0.38;
  if (k < 0.01) p = wc;
  vUv = position.xy + 0.5; vSeed = aSeed; vInt = k;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const FFF = FFR.replace('uniform float uTime, uInt, uBright;', 'uniform float uTime, uBright;\nvarying float vInt;').replace(/uInt/g, 'vInt');
let flames, aInt, attrInt;
function buildFlames() {
  FU.uTex.value = NOISE;
  const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
  g.index = base.index; g.setAttribute('position', base.getAttribute('position'));
  const off = new Float32Array(NT * 3), sz = new Float32Array(NT * 2), sd = new Float32Array(NT); aInt = new Float32Array(NT);
  for (let i = 0; i < NT; i++) {
    const I = TI[i], crown = I > 0.5, H = mx(1.7, 10.5, Math.pow(I, 1.3)) * (0.75 + 0.5 * rnd(i * 3.9 + 1.1));
    off.set([TX[i], hgt(TX[i], TZ[i]) + (crown ? 3.6 : 0.3), TZ[i]], i * 3); sz.set([0.36 * H + 1.6, H], i * 2); sd[i] = rnd(i * 3.7 + 0.4);
  }
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3)); g.setAttribute('aSize', new THREE.InstancedBufferAttribute(sz, 2));
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(sd, 1));
  attrInt = new THREE.InstancedBufferAttribute(aInt, 1); attrInt.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aInt', attrInt);
  g.instanceCount = NT;
  flames = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: FU, vertexShader: FFV, fragmentShader: FFF, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
  flames.frustumCulled = false; flames.renderOrder = 12; world.add(flames);
}

// ------------------------------------------------------------------ humo, pavesas, el cielo, la luz, la chincheta del origen y la pavesa que salta
const SMOKE_D = [[0.6, 0.44, 0.32], [0.44, 0.41, 0.39], [0.38, 0.38, 0.39], [0.34, 0.35, 0.37]];
let smokes = [], embers, sky, sun, fireL, pin, spark, ember3;
function smokeEm(seed, n, ext, size, op) {
  const s = new Parts(n, { life: 6.5, rise: 6, acc: 0.5, size, grow: 3.0, turb: 2.5, conv: 0, rot: 6.28, opacity: op, c: SMOKE_D, seed, extent: ext, order: 11, edge: 0.9 });
  s.mesh.rotation.x = -0.62; world.add(s.mesh); smokes.push(s); return s;
}
function buildWorld() {
  mats();
  buildArrival();
  buildGround();
  buildTrees();
  buildFlames();
  // cielo con calima de humo
  sky = new THREE.Mesh(new THREE.SphereGeometry(2900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: SUN_DIR }, uPaper: GU.uPaper },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vD; uniform vec3 uSun; uniform float uPaper;
    void main(){ float h = clamp(vD.y, 0.0, 1.0);
      vec3 c = mix(vec3(0.62, 0.55, 0.48), vec3(0.30, 0.37, 0.47), pow(h, 0.55));
      float s = max(dot(vD, uSun), 0.0); c += vec3(1.0, 0.7, 0.38) * (pow(s, 90.0) * 4.0 + pow(s, 5.0) * 0.22);
      c = mix(c, vec3(1.25, 1.23, 1.17), uPaper);
      gl_FragColor = vec4(c, 1.0); }` }));
  sky.renderOrder = -1; sky.frustumCulled = false; world.add(sky);
  world.add(new THREE.HemisphereLight(0xa3b3c6, 0x3b2f22, 0.9));
  sun = new THREE.DirectionalLight(0xffd3a2, 2.5); sun.position.copy(SUN_DIR).multiplyScalar(320).add(V(-8, 0, -12)); sun.target.position.set(-8, 0, -12);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 40, far: 800 }); sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.06;
  world.add(sun, sun.target);
  fireL = new THREE.PointLight(0xff7424, 0, 140, 1.4); world.add(fireL);
  // humo: cabeza, flancos, dedo y foco
  smokeEm(31, 40, [14, 3, 6], 9, 0.3);       // 0 cabeza
  smokeEm(47, 18, [6, 2, 9], 6, 0.22);        // 1 flanco izquierdo
  smokeEm(53, 18, [6, 2, 9], 6, 0.22);        // 2 flanco derecho
  smokeEm(61, 20, [6, 2, 10], 6, 0.26);       // 3 dedo
  smokeEm(71, 16, [5, 2, 5], 5, 0.26);        // 4 foco
  embers = new Parts(110, { life: 2.6, rise: 7, acc: 1.2, size: 0.32, grow: 0.6, turb: 2.2, rot: 0, edge: 0.2, add: true, c: EMBER_C, seed: 83, extent: [16, 4, 6], order: 13 });
  embers.mesh.rotation.x = -0.55; world.add(embers.mesh);
  // la chincheta del origen
  pin = new THREE.Group();
  const pm = new THREE.MeshStandardMaterial({ color: 0xf2f4f7, roughness: 0.4 }), hm = new THREE.MeshStandardMaterial({ color: 0xe8352a, roughness: 0.35, emissive: 0xe8352a, emissiveIntensity: 0.6 });
  const needle = new THREE.Mesh(new THREE.ConeGeometry(0.28, 4.2, 10), pm); needle.rotation.x = Math.PI; needle.position.y = 2.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 14), hm); head.position.y = 4.9;
  pin.add(needle, head); pin.position.copy(G3(O.x, O.z)); pin.visible = false; world.add(pin);
  // la chispa del origen y la pavesa que salta
  spark = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), GLOW(0xffb050, 9)); spark.visible = false; world.add(spark);
  ember3 = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), GLOW(0xff9a3a, 10)); ember3.visible = false; world.add(ember3);
}
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };

// ------------------------------------------------------------------ el borde (perímetro): contorno de la llegada = F en una rejilla
const PG = { x0: -60, z0: -70, nx: 141, nz: 171, s: 0.75 };
let PGA = null;
function buildPG() {
  PGA = new Float32Array(PG.nx * PG.nz);
  for (let j = 0; j < PG.nz; j++) for (let i = 0; i < PG.nx; i++) PGA[j * PG.nx + i] = mainT(PG.x0 + i * PG.s, PG.z0 + j * PG.s);
}
const MS = { 1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: [[3, 2], [0, 1]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]], 9: [[0, 2]], 10: [[0, 3], [1, 2]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]] };
function contourAt(F) {
  const { x0, z0, nx, nz, s } = PG, segs = [], val = (i, j) => PGA[j * nx + i] - F;
  const P = (i, j, i2, j2) => { const a = val(i, j), b = val(i2, j2), k = a / (a - b); return [x0 + (i + (i2 - i) * k) * s, z0 + (j + (j2 - j) * k) * s]; };
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const c = (val(i, j) < 0 ? 1 : 0) | (val(i + 1, j) < 0 ? 2 : 0) | (val(i + 1, j + 1) < 0 ? 4 : 0) | (val(i, j + 1) < 0 ? 8 : 0);
    if (c === 0 || c === 15) continue;
    const e = [P(i, j, i + 1, j), P(i + 1, j, i + 1, j + 1), P(i, j + 1, i + 1, j + 1), P(i, j, i, j + 1)];
    for (const [a, b] of MS[c]) segs.push([e[a], e[b]]);
  }
  const key = p => Math.round(p[0] * 200) + ',' + Math.round(p[1] * 200), at = new Map();
  segs.forEach((sg, i) => { for (const p of sg) { const k = key(p); if (!at.has(k)) at.set(k, []); at.get(k).push(i); } });
  const used = new Uint8Array(segs.length); let best = [];
  for (let i0 = 0; i0 < segs.length; i0++) {
    if (used[i0]) continue;
    used[i0] = 1; const line = [segs[i0][0], segs[i0][1]];
    for (let dir = 0; dir < 2; dir++) {
      for (;;) {
        const end = dir === 0 ? line[line.length - 1] : line[0], c = at.get(key(end)) || [];
        let nxt = -1; for (const j of c) if (!used[j]) { nxt = j; break; }
        if (nxt < 0) break;
        used[nxt] = 1; const sg = segs[nxt], other = key(sg[0]) === key(end) ? sg[1] : sg[0];
        if (dir === 0) line.push(other); else line.unshift(other);
      }
    }
    if (line.length > best.length) best = line;
  }
  // empezar por la cola (el punto más atrás)
  let bi = 0; best.forEach((p, i) => { if (p[1] > best[bi][1]) bi = i; });
  return best.slice(bi).concat(best.slice(0, bi + 1));
}

// ------------------------------------------------------------------ tiempos: el «tiempo del fuego» F(t) y la cámara (un dron que no para)
let T = {}, KEYS = null, KH = null, FK = null;
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  T.rw0 = T.cae - 0.05; T.rw1 = T.nace - 0.12;                     // rebobinado hasta el origen
  T.jump0 = T.pavesa + 0.05; T.jump1 = Math.max(T.fuera + 0.12, T.jump0 + 0.8);   // la pavesa vuela por encima del borde
  FK = [
    [0, [0.985]], [T.rw0, [1.0]], [T.rw1, [0.0]],
    [T.origen + 0.35, [0.03]], [T.viento, [0.055]],
    [T.caliente + 0.3, [0.33]], [T.flancos + 0.45, [0.42]], [T.despacio + 0.4, [0.5]],
    [T.perimetro + 0.6, [0.555]], [T.lengua - 0.1, [Math.max(0.56, FD0 - 0.005)]], [T.dedo + 0.45, [FD0 + 0.2]],
    [T.bolsa + 0.4, [0.82]], [T.isla + 0.4, [0.86]], [T.jump0, [0.875]], [T.jump1, [FS + 0.004]],
    [T.secundario + 0.35, [0.95]], [T.empiezas, [0.97]], [T.apuntes, [1.0]], [T.end, [1.03]],
  ];
  for (let i = 1; i < FK.length; i++) FK[i][0] = Math.max(FK[i][0], FK[i - 1][0] + 0.12);
  KEYS = camKeys(); KH = KEYS;
}
const fireT = t => hermite(FK, t)[0];
function camKeys() {
  const K = [
    [0, [-6, 222, 86, -8, 0, -12, 42]],                           // el incendio entero, como un bicho: cabeza, cola y dedos
    [T.dedos + 0.5, [-10, 212, 78, -8, 0, -12, 42]],
    [T.rw1, [4, 42, 76, 0, 0, 40, 40]],                           // rebobinado hasta la chispa
    [T.origen + 0.35, [6, 32, 64, 0, 0, 40, 38]],                 // nace aquí: el origen (en un claro)
    [T.viento + 0.3, [8, 52, 84, 0, 0, 30, 40]],                  // el viento lo empuja
    [T.cabeza + 0.25, [30, 62, 56, 0, 0, 16, 40]],                // la cabeza
    [T.caliente + 0.5, [32, 64, 48, 0, 0, 10, 40]],
    [T.flancos + 0.2, [0, 74, 88, 0, 0, 22, 40]],                 // los dos flancos
    [T.cola + 0.15, [-6, 34, 74, 0, 0, 42, 40]],                  // la cola, detrás
    [T.despacio + 0.4, [-8, 36, 76, 0, 0, 42, 40]],
    [T.perimetro + 0.3, [0, 125, 78, 0, 0, 16, 40]],              // el borde entero
    [T.lengua + 0.2, [-14, 150, 58, -14, 0, -14, 42]],            // la lengua que se estira
    [T.dedo + 0.4, [-16, 155, 48, -16, 0, -18, 42]],              // el dedo
    [T.bolsa + 0.35, [-22, 120, 30, -18, 0, -22, 42]],            // la bolsa
    [T.isla + 0.3, [16, 72, 32, 8, 0, -6, 40]],                   // la isla
    [T.pavesa + 0.3, [22, 100, 18, 8, 0, -44, 42]],               // la pavesa salta…
    [T.secundario + 0.4, [20, 95, 0, 8, 0, -50, 42]],             // …y prende fuera
    [T.letA - 0.2, [-9, 280, 30, -9, 0, -12, 42]],                // A, B, C o D
    [T.apuntes + 0.65, [-9, 286, 26, -9, 0, -13, 42]],            // los apuntes (casi cenital)
    [T.compartir + 0.6, [-9, 300, 22, -9, 0, -13, 43]],
    [T.end, [-9, 310, 20, -9, 0, -13, 43]],
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
  const v = hermite(KH, t);
  const dx = 0.9 * Math.sin(t * 0.61) + 0.4 * Math.sin(t * 1.37), dy = 0.6 * Math.sin(t * 0.47 + 1.1), dz = 0.7 * Math.sin(t * 0.53 + 2.0);
  return pose(V(v[0] + dx, v[1] + dy, v[2] + dz), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t (todo depende solo de t)
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
const SOP = [0.34, 0.26, 0.26, 0.3, 0.3];
let FNOW = 0, PAPER = 0, JH = null, PKI = [];
function pocketAt(F) {
  let sx = 0, sz = 0, n = 0;
  for (const i of PKI) if (TA[i] > F + 0.01) { sx += TX[i]; sz += TZ[i]; n++; }
  return n ? V(sx / n, 0, sz / n) : V(-24, 0, -30);
}
function emberPos(t) {
  const u = cl((t - T.jump0) / (T.jump1 - T.jump0)), A = JH, B = SP;
  return V(mx(A.x, B.x, u), mx(hgt(A.x, A.z) + 9, hgt(B.x, B.z) + 0.6, u) + 34 * 4 * u * (1 - u), mx(A.z, B.z, u));
}
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  const F = fireT(t); FNOW = F;
  if (window.DBG) { const D = window.DBG; smokes.forEach(q => q.mesh.visible = !D.smoke); embers.mesh.visible = !D.smoke; flames.visible = !D.flames; CHUNKS.forEach(c => c.im.visible = !D.trees); GROUND.visible = !D.ground; sky.visible = !D.sky; bloom.enabled = !D.bloom; }
  const pap = sm(T.apuntes - 0.1, T.apuntes + 0.7, t); PAPER = pap;
  GU.uF.value = F; GU.uTime.value = t; GU.uPaper.value = pap; TU.uPaperT.value = pap;
  bloom.strength = mx(0.42, 0.0, pap);
  FU.uTime.value = t; FU.uCam.value.copy(cam.position); FU.uGlobal.value = 1 - pap;
  // pinos: verdes → ardiendo → negros; la bolsa y la isla se iluminan cuando se nombran
  const hb = sm(T.hueco - 0.1, T.bolsa, t) * (1 - sm(T.dentro - 0.15, T.dentro + 0.2, t)) * (0.7 + 0.3 * Math.sin(t * 7));
  const hi = sm(T.dentro - 0.05, T.isla, t) * (1 - sm(T.pavesa - 0.15, T.pavesa + 0.2, t)) * (0.7 + 0.3 * Math.sin(t * 7));
  for (const ch of CHUNKS) {
    const ids = ch.ids, ab = ch.ab;
    for (let j = 0; j < ids.length; j++) {
      const i = ids[j], k = (F - TA[i]) / TD[i];
      const glow = k > 0 && k < 1 ? sm(0, 0.12, k) * (1 - sm(0.45, 1, k)) : 0;
      ab[j * 4] = glow * (0.45 + 0.75 * TI[i]);
      ab[j * 4 + 1] = sm(0.12, 0.85, k);
      ab[j * 4 + 3] = TPK[i] && k < 0 ? hb : (TIS[i] ? hi : 0);
      aInt[i] = glow;
    }
    ch.at.needsUpdate = true;
  }
  attrInt.needsUpdate = true;
  // humo y pavesas: siguen a la cabeza, los flancos, el dedo y el foco
  const size = sm(0.03, 0.3, F) * (1 - pap), H = headAt(F), L = flankAt(F, -1), R = flankAt(F, 1);
  smokes[0].mesh.position.copy(G3(H.x, H.z + 5, 4)); smokes[0].u.uOpacity.value = SOP[0] * size;
  smokes[1].mesh.position.copy(G3(L.x + 3, L.z, 2)); smokes[1].u.uOpacity.value = SOP[1] * size;
  smokes[2].mesh.position.copy(G3(R.x - 3, R.z, 2)); smokes[2].u.uOpacity.value = SOP[2] * size;
  const tip = fingerTipAt(F) || P0, fm = P0.clone().lerp(tip, 0.6);
  smokes[3].mesh.position.copy(G3(fm.x, fm.z, 2)); smokes[3].u.uOpacity.value = SOP[3] * sm(FD0, FD0 + 0.06, F) * (1 - sm(FD0 + 0.3, FD0 + 0.5, F)) * (1 - pap);
  smokes[4].mesh.position.copy(G3(SP.x, SP.z, 2)); smokes[4].u.uOpacity.value = SOP[4] * sm(FS, FS + 0.03, F) * (1 - pap);
  smokes.forEach(s => { s.u.uTime.value = t; });
  embers.mesh.position.copy(G3(H.x, H.z + 3, 6)); embers.u.uTime.value = t; embers.u.uOpacity.value = sm(0.12, 0.3, F) * (1 - pap);
  fireL.position.copy(G3(H.x, H.z + 6, 12)); fireL.intensity = 260 * sm(0.03, 0.35, F) * (1 - pap);
  // la chincheta del origen, la chispa y la pavesa
  const pa = bk(pr(t, T.origen - 0.12, 0.45)) * (1 - sm(T.empiezas - 0.4, T.empiezas, t));
  pin.visible = pa > 0.01; pin.scale.setScalar(Math.max(0.01, pa));
  const sp = pulse(t, T.nace + 0.1, 0.35) + 0.6 * pulse(t, T.origen, 0.3);
  spark.visible = sp > 0.02 && t < T.viento; spark.position.copy(G3(O.x, O.z, 0.7)); spark.scale.setScalar(0.4 + 2.4 * sp * (0.8 + 0.2 * Math.sin(t * 40)));
  ember3.visible = t > T.jump0 - 0.02 && t < T.jump1 + 0.05;
  if (ember3.visible) { ember3.position.copy(emberPos(t)); ember3.scale.setScalar(1 + 0.25 * Math.sin(t * 31)); }
}

// ------------------------------------------------------------------ la capa 2D: rótulos sobre el incendio, la pregunta y los apuntes
function arrow2(a, b, col, w = 7, head = 22) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x - Math.cos(ang) * head * 0.6, b.y - Math.sin(ang) * head * 0.6); g.stroke();
  g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x - Math.cos(ang - 0.45) * head, b.y - Math.sin(ang - 0.45) * head); g.lineTo(b.x - Math.cos(ang + 0.45) * head, b.y - Math.sin(ang + 0.45) * head); g.closePath(); g.fill();
}
function polyline(pts3, k, col, a, w = 7, dash = null) {   // k: cuánto se ha dibujado (0..1)
  if (a <= 0.005 || pts3.length < 2) return null;
  const q = pts3.map(p => proj(p)); let L = 0; const seg = [];
  for (let i = 1; i < q.length; i++) { const d = Math.hypot(q[i].x - q[i - 1].x, q[i].y - q[i - 1].y); seg.push(d); L += d; }
  const goal = L * cl(k); let acc = 0, end = q[0];
  g.save(); g.globalAlpha = cl(a); g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round';
  if (dash) { g.setLineDash(dash[0]); g.lineDashOffset = dash[1]; }
  g.shadowColor = col; g.shadowBlur = 18;
  g.beginPath(); g.moveTo(q[0].x, q[0].y);
  for (let i = 1; i < q.length; i++) {
    if (acc + seg[i - 1] >= goal) { const f = (goal - acc) / Math.max(seg[i - 1], 1e-3); end = { x: mx(q[i - 1].x, q[i].x, f), y: mx(q[i - 1].y, q[i].y, f) }; g.lineTo(end.x, end.y); break; }
    acc += seg[i - 1]; g.lineTo(q[i].x, q[i].y); end = q[i];
  }
  g.stroke(); g.setLineDash([]); g.shadowBlur = 0;
  g.restore();
  return end;
}
function ring3(c, r, n = 40) { const L = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; L.push(G3(c.x + Math.cos(a) * r, c.z + Math.sin(a) * r, 1.2)); } return L; }
function badge(P, L, col, a, s = 1) {
  if (a <= 0.005) return; const q = proj(P); if (!q.ok) return;
  const k = 0.6 + 0.4 * bk(cl(a * 1.3));
  g.save(); g.globalAlpha = cl(a * 1.4); g.translate(cl(q.x, 90, W2 - 90), cl(q.y, LBLY, H2 - 300)); g.scale(k * s, k * s);
  g.beginPath(); g.arc(0, 0, 58, 0, 7); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill(); g.lineWidth = 8; g.strokeStyle = col; g.stroke();
  txt(L, 0, 25, 74, '#F4F6F8', 400, 'center', 'Bebas');
  g.restore();
}
function rewindIcon(a) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a); g.translate(540, 1555); g.fillStyle = '#F4F6F8'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 14;
  for (const ox of [-34, 6]) { g.beginPath(); g.moveTo(ox + 28, -26); g.lineTo(ox - 8, 0); g.lineTo(ox + 28, 26); g.closePath(); g.fill(); }
  g.restore();
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const win = (t0, t1) => sm(t0 - 0.12, t0 + 0.08, t) * (1 - sm(t1 - 0.2, t1, t));
  const F = FNOW, pop = (t0) => 1 + 0.16 * pulse(t, t0 + 0.12, 0.18);
  // el gancho: cabeza, cola… ¡y dedos!
  const ga = 1 - sm(T.rw0 + 0.15, T.rw0 + 0.45, t);
  if (ga > 0.01 && t < T.rw1) {
    const H = headAt(F), C = tailAt(F), D = fingerTipAt(F) || P0;
    tag(G3(H.x, H.z, 7), 'CABEZA', RED2, win(T.cabeza1, 99) * ga, 40, -60, { px: 66, s: pop(T.cabeza1) });
    tag(G3(C.x, C.z, 1), 'COLA', GOLD2, win(T.cola1, 99) * ga, 90, 70, { px: 66, s: pop(T.cola1) });
    tag(G3(D.x, D.z, 2), 'DEDOS', PINK2, win(T.dedos, 99) * ga, -40, -50, { px: 66, s: pop(T.dedos) });
  }
  stamp('SIEMPRE CAE EN EL EXAMEN', 1250, GOLD2, Math.exp(-Math.pow((t - (T.examen + 0.3)) / 0.62, 4)), 92, -0.04);
  rewindIcon(sm(T.rw0, T.rw0 + 0.2, t) * (1 - sm(T.rw1 - 0.25, T.rw1, t)));
  // nace aquí: el origen
  tag(G3(O.x, O.z, 6.2), 'ORIGEN', WHITE2, win(T.origen - 0.05, T.empuja + 0.2), 120, 110, { px: 62, s: pop(T.origen) });
  // el viento lo empuja
  const va = win(T.viento - 0.05, T.cabeza - 0.05);
  if (va > 0.01) {
    const zc = O.z - KC * F, ph = (t * 1.6) % 1;
    g.save(); g.globalAlpha = va;
    for (const x of [-14, 0, 14]) {
      const z0 = zc + 22 - ph * 6, a = proj(G3(x, z0, 16)), b = proj(G3(x, z0 - 20, 16));
      if (a.ok && b.ok) arrow2(a, b, 'rgba(235,242,250,0.95)', 7, 26);
    }
    g.restore();
    const lb = proj(G3(14, zc + 22, 16)); label(lb.x + 120, lb.y, 'VIENTO', '#E8EEF5', va, { px: 50, icon: 'up' });
  }
  // la cabeza: lo más caliente
  const H = headAt(F);
  tag(G3(H.x, H.z, 8), 'CABEZA', RED2, win(T.cabeza - 0.05, T.lados), 60, -80, { px: 64, s: pop(T.cabeza), sub: t > T.caliente - 0.1 ? 'LO MÁS CALIENTE' : null });
  // los flancos (paralelos al avance)
  const fa = win(T.flancos - 0.1, T.detras);
  if (fa > 0.01) {
    for (const sd of [-1, 1]) {
      const Fp = flankAt(F, sd), a = proj(G3(Fp.x + sd * 2, Fp.z + 9, 3)), b = proj(G3(Fp.x + sd * 2, Fp.z - 9, 3));
      g.save(); g.globalAlpha = fa; if (a.ok && b.ok) arrow2(a, b, ORANGE2, 8, 28); g.restore();
      tag(G3(Fp.x, Fp.z, 2), 'FLANCO', ORANGE2, fa, sd * 150, 40, { px: 58, s: pop(T.flancos) });
    }
  }
  // detrás, la cola: arde despacio
  const C = tailAt(F);
  tag(G3(C.x, C.z, 1.5), 'COLA', GOLD2, win(T.cola - 0.05, T.borde), -110, 120, { px: 64, s: pop(T.cola), sub: t > T.despacio - 0.1 ? 'ARDE DESPACIO' : null });
  // su borde: el perímetro
  const pe = win(T.borde - 0.1, T.lengua + 0.25), pf = win(T.salta - 0.05, T.foco + 0.5) * 0.85;
  if (pe > 0.01 || pf > 0.01) {
    const cont = contourAt(F).map(p => G3(p[0], p[1], 1.0));
    const k = pe > 0.01 ? e3(pr(t, T.borde - 0.05, Math.max(0.7, T.perimetro + 0.35 - T.borde))) : 1;
    const end = polyline(cont, k, CYAN2, Math.max(pe, pf), 8);
    if (end && pe > 0.01 && k < 1) { g.save(); g.globalAlpha = pe; g.beginPath(); g.arc(end.x, end.y, 12, 0, 7); g.fillStyle = '#FFFFFF'; g.shadowColor = CYAN2; g.shadowBlur = 24; g.fill(); g.restore(); }
    if (pe > 0.01 && cont.length > 8) { const q = cont[Math.floor(cont.length * 0.62)]; tag(q, 'PERÍMETRO', CYAN2, win(T.perimetro - 0.05, T.lengua + 0.25), -150, -40, { px: 60, s: pop(T.perimetro) }); }
  }
  // una lengua que se estira: un dedo
  const tip = fingerTipAt(F) || P0;
  const la = win(T.lengua - 0.05, T.dedo + 0.3) * sm(FD0 + 0.01, FD0 + 0.04, F);
  if (la > 0.01) { const tq = dedoAt((F - FD0) * DSPD + 5), a = proj(G3(P0.x, P0.z, 3)), b = proj(G3(tq.x, tq.z, 3)); g.save(); g.globalAlpha = la * 0.9; if (a.ok && b.ok) arrow2(a, b, PINK2, 7, 26); g.restore(); }
  tag(G3(tip.x, tip.z, 2), 'DEDO', PINK2, win(T.dedo - 0.08, T.hueco), -70, -90, { px: 64, s: pop(T.dedo) });
  // y el hueco sin quemar: una bolsa
  const PK = pocketAt(F);
  tag(G3(PK.x, PK.z, 6), 'BOLSA', GREEN2, win(T.bolsa - 0.08, T.dentro), -60, -120, { px: 64, s: pop(T.bolsa), sub: 'SIN QUEMAR' });
  // dentro, lo que no arde: una isla
  const ia = win(T.dentro - 0.05, T.pavesa);
  polyline(ring3(ISL, ISR * 1.35), 1, GREEN2, ia * 0.9, 6, [[16, 12], -t * 40]);
  tag(G3(ISL.x, ISL.z, 7), 'ISLA', GREEN2, win(T.isla - 0.08, T.pavesa), 110, -110, { px: 64, s: pop(T.isla) });
  // la pavesa salta fuera: foco secundario
  const ja = win(T.jump0 - 0.05, T.foco + 0.6);
  if (ja > 0.01 && JH) {
    const path = []; for (let i = 0; i <= 30; i++) path.push(emberPos(T.jump0 + (T.jump1 - T.jump0) * i / 30));
    polyline(path, cl((t - T.jump0) / (T.jump1 - T.jump0)), '#FFB14A', ja, 6, [[14, 12], -t * 60]);
  }
  const sr = 3 + 9 * sm(FS, FS + 0.12, F);
  polyline(ring3(SP, sr + 2.5), 1, VIOL2, win(T.foco - 0.08, T.empiezas) * 0.9, 6, [[16, 12], -t * 40]);
  tag(G3(SP.x, SP.z, 4), 'FOCO SECUNDARIO', VIOL2, win(T.foco - 0.08, T.empiezas), -40, 110, { px: 60, s: pop(T.foco) });
  // ¿por dónde empiezas a apagarlo? A, B, C o D
  const qa = sm(T.empiezas - 0.15, T.empiezas + 0.15, t) * (1 - sm(T.apuntes - 0.25, T.apuntes, t));
  if (qa > 0.005) {
    g.save(); g.globalAlpha = qa; g.translate(540, 588);
    rr(-480, -50, 960, 100, 30); g.fillStyle = 'rgba(8,10,14,0.92)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('¿POR DÓNDE EMPIEZAS A APAGARLO?', 0, 20, 58, '#F4F6F8', 400, 'center', 'Bebas');
    g.restore();
    const ce = sm(T.letD + 0.1, T.letD + 0.4, t) * qa;
    if (ce > 0) { const b = 1 + 0.05 * Math.max(0, Math.sin((t - T.letD) * 6)); g.save(); g.globalAlpha = ce; g.translate(540, 1592); g.scale(b, b); rr(-270, -46, 540, 92, 46); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke(); txt('💬  COMENTA TU LETRA', 0, 18, 50, '#F2F5F8', 400, 'center', 'Bebas'); g.restore(); }
    const R = flankAt(F, 1);
    badge(G3(H.x, H.z, 9), 'A', RED2, qa * sm(T.letA - 0.1, T.letA + 0.1, t), pop(T.letA));
    badge(G3(R.x, R.z, 3), 'B', ORANGE2, qa * sm(T.letB - 0.1, T.letB + 0.1, t), pop(T.letB));
    badge(G3(C.x, C.z - 7, 2), 'C', GOLD2, qa * sm(T.letC - 0.1, T.letC + 0.1, t), pop(T.letC));
    badge(G3(PK.x, PK.z, 5), 'D', GREEN2, qa * sm(T.letD - 0.1, T.letD + 0.1, t), pop(T.letD));
  }
  // está en los apuntes: el monte se vuelve la hoja con el dibujo y sus nueve partes
  const ap = sm(T.apuntes + 0.25, T.apuntes + 0.6, t) * (1 - sm(T.fin - 0.25, T.fin, t));
  if (ap > 0.005) {
    g.save(); g.globalAlpha = ap;
    txt('APUNTES', 64, 588, 70, INK, 400, 'left', 'Bebas');
    g.globalAlpha = ap * 0.85; txt('ÉLITE BOMBEROS', 66, 624, 32, INK, 400, 'left', 'Bebas');
    g.fillStyle = INK; g.globalAlpha = ap * 0.6; g.fillRect(64, 638, 250, 4);
    g.restore();
    const R = flankAt(F, 1), L = flankAt(F, -1), cont = contourAt(F);
    let cq = [R.x + 2, R.z + 22]; for (const q of cont) if (q[1] > 14 && q[1] < 34 && q[0] > cq[0]) cq = q;      // un punto del borde, abajo a la derecha
    const items = [[G3(H.x, H.z, 2), 'CABEZA', RED2, 150, -40], [G3(C.x, C.z, 1), 'COLA', GOLD2, 150, 60], [G3(O.x, O.z, 1), 'ORIGEN', WHITE2, -170, 90],
      [G3(L.x, L.z, 1), 'FLANCO', ORANGE2, -150, 20], [G3(R.x, R.z, 1), 'FLANCO', ORANGE2, 150, 40], [G3(cq[0], cq[1], 1), 'PERÍMETRO', CYAN2, 150, 90],
      [G3(tip.x, tip.z, 1), 'DEDO', PINK2, 170, -10], [G3(PK.x, PK.z, 1), 'BOLSA', GREEN2, -150, -10], [G3(ISL.x, ISL.z, 1), 'ISLA', GREEN2, 160, -30],
      [G3(SP.x, SP.z, 1), 'FOCO SECUNDARIO', VIOL2, 60, -80]];
    items.forEach(([p, s, c, dx, dy], i) => tag(p, s, c, ap * sm(T.apuntes + 0.3 + i * 0.05, T.apuntes + 0.5 + i * 0.05, t), dx, dy, { px: 46 }));
  }
  share(t);
  closing(t);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.01)'; g.fillRect(0, 0, 2, 2);
}

// ------------------------------------------------------------------ fotograma
window.renderAt = async t => {
  const N = window.FAST ? 1 : (t > T.rw0 && t < T.rw1 + 0.2 ? Math.min(2, subframes(t)) : 1);   // estela solo en el rebobinado
  renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < N; k++) {
    update(N === 1 ? t : t + (k / (N - 1) - 0.5) / 120);
    composer.render();
    accMat.uniforms.tSrc.value = composer.readBuffer.texture; accMat.uniforms.uW.value = 1 / N;
    renderer.setRenderTarget(accRT); renderer.autoClear = false; renderer.render(accScene, quadCam); renderer.autoClear = true;
  }
  if (N > 1) update(t);
  finMat.uniforms.tSrc.value = accRT.texture; finMat.uniforms.uTime.value = t;
  finMat.uniforms.uFlash.value = pulse(t, T.nace + 0.08, 0.09) * 0.16; finMat.uniforms.uFlashCol.value.setRGB(1, 0.75, 0.45);
  finMat.uniforms.uVig.value = 1 - 0.7 * PAPER;
  finMat.uniforms.uDim.value = mx(1, 0.86, sm(T.empiezas - 0.1, T.empiezas + 0.3, t) * (1 - sm(T.apuntes - 0.2, T.apuntes + 0.2, t))) * mx(1, 0.75, sm(T.compartir - 0.2, T.compartir + 0.3, t)) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.002 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  await overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 2.0);

(async () => {
  try {
    while (!_r2d) await new Promise(r => setTimeout(r, 30));
    await document.fonts.ready;
    NOISE = noiseTex();
    buildWorld(); buildPG();
    for (let i = 0; i < NT; i++) if (TPK[i]) PKI.push(i);
    world.updateMatrixWorld(true);
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;    // los pinos no se mueven: la sombra se calcula una vez
    setupTimes();
    JH = headAt(fireT(T.jump0));
    update(0);
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'forestal: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
