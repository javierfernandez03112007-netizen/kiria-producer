// «¿Cuánto aire te queda?» — autonomía de la botella del ERA (Bomberados, Pregunta del día cinematográfica, pregunta de Adrián).
// Motor copiado de projects/bomberados_acoplamiento/web/acoplamiento.js (luz, profundidad de campo, resplandor, desenfoque de
// movimiento, llamas en láminas, partículas sin estado) + mundo propio: nave en llamas de noche, bombero con el equipo de
// respiración (botella de «cristal» con el aire como luz azul), manómetro gigante, tarjetas A–D, cuenta 1→5, cubo de 1.190 L.
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
scene.background = new THREE.Color(0x040506);
scene.fog = new THREE.FogExp2(0x040506, 0.05);
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



// ================================================================== MUNDO: nave en llamas de noche y el bombero con su ERA
const world = new THREE.Group(); scene.add(world);
scene.background.set(0x05060a); scene.fog.color.set(0x05060a); scene.fog.density = 0.028;
scene.environmentIntensity = 0.24;
let exitG, ff, bottle, airU, glassU, gaugeG, needle, arcUse, arcRes, cards = [], fireIn, fireLight, rimLight, beacon, exitSign, exitLight,
  cube, cubeU, cubeEdges, cubeGlow, puffs, stream, smokeDoor, reg;
const BOT = { r: 0.085, len: 0.36 };                   // botella de 7 L (≈ 0,53 m de alto)
const BOT_C = V(0, 1.2, 0.27);                          // centro de la botella (el bombero mira a −z)
const GAUGE_C = V(0.52, 1.98, 0.3), GAUGE_D = 0.5;      // manómetro gigante, encima del hombro derecho
const CUBE_C = V(0.98, 0.53, -0.5), CUBE_S = 1.06;     // 1.190 L = 1,19 m³ → cubo de 1,06 m
const CARD_W = 0.88, CARD_H = 0.3, CARD_COLS = [-0.47, 0.47], CARD_ROWS = [2.72, 2.36], CARD_Z = 0.25;   // 2 × 2 encima del casco
const MAXB = 230, RESB = 60;                            // bar de la botella y de la reserva
const ang = v => Math.PI * 0.75 + Math.PI * 1.5 * v / 300;   // ángulo (lienzo, horario) del valor v en la esfera 0–300 bar

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

function gaugeFace() {
  return canvasTex(1024, 1024, (x) => {
    const c = 512, R = 488;
    const bg = x.createRadialGradient(c, c - 120, 40, c, c, R); bg.addColorStop(0, '#fbf8f1'); bg.addColorStop(1, '#d6d0c3');
    x.beginPath(); x.arc(c, c, R, 0, 7); x.fillStyle = bg; x.fill();
    x.lineWidth = 64; x.strokeStyle = '#d4251b'; x.beginPath(); x.arc(c, c, R - 74, ang(0), ang(RESB)); x.stroke();
    for (let v = 0; v <= 300; v += 10) {
      const a = ang(v), big = v % 50 === 0, r1 = R - 30, r2 = R - (big ? 120 : 76);
      x.beginPath(); x.moveTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); x.lineTo(c + Math.cos(a) * r2, c + Math.sin(a) * r2);
      x.lineWidth = big ? 13 : 6; x.strokeStyle = '#121418'; x.stroke();
    }
    x.fillStyle = '#121418'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '400 104px Bebas';
    for (let v = 0; v <= 300; v += 50) { const a = ang(v); x.fillText(String(v), c + Math.cos(a) * (R - 190), c + Math.sin(a) * (R - 190)); }
    x.font = '400 120px Bebas'; x.fillText('BAR', c, c + 200);
    x.font = '800 40px Inter'; x.fillStyle = '#d4251b'; x.fillText('RESERVA', c - 250, c + 395);
  }, { aniso: 4 });
}
function makeGauge() {
  const G = new THREE.Group(); G.position.copy(GAUGE_C);
  const face = new THREE.Mesh(new THREE.CircleGeometry(GAUGE_D / 2, 64), new THREE.MeshBasicMaterial({ map: gaugeFace(), transparent: true, fog: false }));
  face.material.color.setScalar(1.05); face.renderOrder = 21; G.add(face);
  const bez = new THREE.Mesh(new THREE.TorusGeometry(GAUGE_D / 2 + 0.012, 0.022, 16, 72), M.chrome); bez.renderOrder = 21; G.add(bez);
  const backp = new THREE.Mesh(new THREE.CylinderGeometry(GAUGE_D / 2 + 0.02, GAUGE_D / 2 + 0.02, 0.05, 64), M.black); backp.rotation.x = Math.PI / 2; backp.position.z = -0.03; G.add(backp);
  const ringM = (col) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  // tramo útil (60 → 230) que se ilumina en azul y tramo de reserva (0 → 60) en rojo; ángulos de three = −ángulo del lienzo
  const mk = (v0, v1, col) => { const m = new THREE.Mesh(new THREE.RingGeometry(GAUGE_D * 0.34, GAUGE_D * 0.47, 96, 1, -ang(v1), ang(v1) - ang(v0)), ringM(col)); m.position.z = 0.003; m.renderOrder = 22; G.add(m); return m; };
  arcUse = mk(RESB, MAXB, 0x2aa8ff); arcRes = mk(0, RESB, 0xff2a1a);
  arcUse.material.color.setRGB(0.5, 1.6, 3.0); arcRes.material.color.setRGB(3.0, 0.4, 0.2);
  const ng = new THREE.PlaneGeometry(GAUGE_D * 0.46, GAUGE_D * 0.035); ng.translate(GAUGE_D * 0.17, 0, 0);
  needle = new THREE.Mesh(ng, new THREE.MeshBasicMaterial({ color: 0xff3a1a, fog: false, side: THREE.DoubleSide })); needle.material.color.setRGB(3.4, 0.55, 0.18);
  needle.position.z = 0.006; needle.renderOrder = 23; G.add(needle);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(GAUGE_D * 0.045, 24), new THREE.MeshBasicMaterial({ color: 0x15171b, fog: false })); cap.position.z = 0.008; cap.renderOrder = 24; G.add(cap);
  const gl = new THREE.Mesh(new THREE.CircleGeometry(GAUGE_D / 2, 64), new THREE.MeshBasicMaterial({ color: 0x9fc8ff, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  gl.position.z = 0.01; gl.renderOrder = 25; G.add(gl);
  G.scale.setScalar(0.001); return G;
}
function cardTex(L, s, col, st) {          // st: 0 normal · 1 correcta · 2 trampa
  return canvasTex(1150, 391, (x) => {
    rrect(x, 8, 8, 1134, 375, 70); x.fillStyle = st === 1 ? 'rgba(10,44,28,0.95)' : st === 2 ? 'rgba(58,8,8,0.95)' : 'rgba(9,12,17,0.88)'; x.fill();
    x.lineWidth = st ? 14 : 6; x.strokeStyle = st === 1 ? '#3ef08a' : st === 2 ? '#ff4b3e' : 'rgba(255,255,255,0.3)'; x.stroke();
    x.beginPath(); x.arc(190, 195, 120, 0, 7); x.fillStyle = st === 1 ? '#3ef08a' : st === 2 ? '#ff4b3e' : col; x.fill();
    x.fillStyle = '#0b0d10'; x.font = '400 170px Bebas'; x.textAlign = 'center'; x.fillText(st === 1 ? '✓' : st === 2 ? '✗' : L, 190, 255);
    x.fillStyle = '#F2F5F8'; x.textAlign = 'left'; x.font = '400 250px Bebas'; x.fillText(s, 350, 285);
    if (st === 2) { x.font = '800 54px Inter'; x.fillStyle = '#ff8a80'; x.textAlign = 'right'; x.fillText('¡SIN AIRE!', 1105, 360); }
  }, { aniso: 4 });
}
function exitTex() {
  return canvasTex(640, 256, (x) => {
    rrect(x, 4, 4, 632, 248, 26); x.fillStyle = '#0f8f43'; x.fill();
    x.fillStyle = '#f4fff6'; x.font = '400 150px Bebas'; x.textAlign = 'left'; x.fillText('SALIDA', 220, 185);
    x.save(); x.translate(110, 128); x.beginPath(); x.moveTo(-70, 0); x.lineTo(-5, -62); x.lineTo(-5, -26); x.lineTo(70, -26); x.lineTo(70, 26); x.lineTo(-5, 26); x.lineTo(-5, 62); x.closePath(); x.fill(); x.restore();
  });
}

function buildWorld() {
  // suelo de hormigón mojado (refleja el fuego)
  const conc = canvasTex(512, 512, (x) => { x.fillStyle = '#1c1d20'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 9000; i++) { const v = 20 + rnd(i) * 30; x.fillStyle = `rgba(${v},${v},${v + 2},0.55)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(10,10,12,0.5)'; x.fillRect(0, i * 37, 512, 2); } }, { aniso: 4 });
  conc.wrapS = conc.wrapT = THREE.RepeatWrapping; conc.repeat.set(24, 24);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: conc, color: 0x8c8c8c, roughness: 0.32, metalness: 0.25 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
  world.add(new THREE.HemisphereLight(0x5c76a8, 0x120c08, 0.42));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.32); moon.position.set(-12, 20, 14); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 60 }); moon.shadow.bias = -0.0005; world.add(moon);
  // la nave: fachada con un portón abierto y el fuego dentro
  const wallM = new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.92 });
  for (const [x0, x1, y0, y1] of [[-9, -2.6, 0, 7.5], [2.6, 9, 0, 7.5], [-2.6, 2.6, 4.3, 7.5]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.4), wallM); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, -6.2); b.receiveShadow = true; world.add(b);
  }
  const inside = new THREE.Mesh(new THREE.BoxGeometry(17, 7.4, 7), new THREE.MeshStandardMaterial({ color: 0x3a1a0c, roughness: 0.95, side: THREE.BackSide })); inside.position.set(0, 3.7, -9.9); world.add(inside);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.25, 0.5), M.steel); lip.position.set(0, 4.25, -6.05); world.add(lip);
  fireIn = fireSet(world, V(0, 0.05, -9.2), [
    ...tongues(14, 41, (i, r) => [-2.4 + i * 0.36 + (r(1) - 0.5) * 0.2, 0.05, -8.0 - r(2) * 2.6, 0.9 + 0.5 * r(3), 2.4 + 2.2 * r(4)]),
    ...tongues(6, 47, (i, r) => [-2.0 + i * 0.8 + (r(1) - 0.5) * 0.3, 3.2, -7.0 - r(2) * 1.5, 1.0 + 0.4 * r(3), 1.4 + 1.0 * r(4)]),
  ], { seed: 41, extent: [2.6, 0.2, 1.4], smokeN: 30, smokeSize: 1.6, smokeY: 4.3, emberN: 90, bright: 1.25 });
  smokeDoor = new Parts(40, { life: 4.0, rise: 0.55, acc: 0.06, size: 1.3, grow: 2.2, turb: 0.35, conv: 0.0, rot: 6.28, opacity: 0.5, c: SMOKE_C, seed: 61, extent: [2.2, 0.15, 0.4], order: 11 });
  smokeDoor.at(0, 4.15, -5.9); smokeDoor.u.uSX.value = 1; world.add(smokeDoor.mesh);
  fireLight = new THREE.PointLight(0xff6418, 170, 0, 2); fireLight.position.set(0, 2.2, -7.2); world.add(fireLight);
  rimLight = new THREE.PointLight(0xff7a2a, 9, 0, 2); rimLight.position.set(0.4, 2.0, -2.2); world.add(rimLight);   // contraluz del fuego en el bombero
  beacon = new THREE.PointLight(0x2a6bff, 0, 0, 2); beacon.position.set(-5.5, 2.4, 6.5); world.add(beacon);
  // cartel de SALIDA (se enciende con «salir»)
  exitG = new THREE.Group(); world.add(exitG);         // aparece con «salir»
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.6, 12), M.steel); post.position.set(-1.05, 1.3, -1.0); exitG.add(post);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), M.steel); arm.position.set(-0.82, 2.6, -1.0); exitG.add(arm);
  exitSign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.32), new THREE.MeshBasicMaterial({ map: exitTex(), fog: false })); exitSign.position.set(-0.7, 2.4, -0.98);
  exitSign.rotation.y = 0.12; exitG.add(exitSign);
  exitLight = new THREE.PointLight(0x2cff7a, 0, 0, 2); exitLight.position.set(-0.7, 2.3, -0.7); world.add(exitLight);
  // el bombero, el manómetro gigante y las bocanadas
  ff = makeFirefighter(); world.add(ff);
  gaugeG = makeGauge(); world.add(gaugeG);
  puffs = new Parts(70, { life: 1.3, rise: 0.12, acc: 0.05, size: 0.07, grow: 3.2, turb: 0.06, rot: 6.28, opacity: 0.0, c: [[0.75, 0.8, 0.86], [0.6, 0.66, 0.72], [0.45, 0.5, 0.55], [0.3, 0.33, 0.36]], seed: 81, extent: [0.03, 0.03, 0.05], order: 15 });
  puffs.at(0, 1.53, -0.3); world.add(puffs.mesh);
  // tarjetas A–D
  const OPTS = [['A', '46 MIN', '#FF7A1A'], ['B', '40 MIN', '#2DD4BF'], ['C', '34 MIN', '#F0457A'], ['D', '30 MIN', '#8B7CF6']];
  OPTS.forEach(([L, s, col], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), new THREE.MeshBasicMaterial({ map: cardTex(L, s, col, 0), transparent: true, depthWrite: true, alphaTest: 0.02, fog: false }));
    m.renderOrder = 26; m.userData = { tN: m.material.map, tOk: i === 2 ? cardTex(L, s, col, 1) : null, tBad: i === 0 ? cardTex(L, s, col, 2) : null };
    m.visible = false; world.add(m); cards.push(m);
  });
  // el cubo de 1.190 L de aire
  cubeU = { uTex: { value: NOISE }, uTime: { value: 0 }, uLevel: { value: 0 }, uRes: { value: -1 }, uResA: { value: 0 }, uI: { value: 0 }, uRed: { value: 0 }, uHalf: { value: CUBE_S / 2 }, uUse: { value: 0.4 } };
  cube = new THREE.Mesh(new THREE.BoxGeometry(CUBE_S, CUBE_S, CUBE_S, 1, 8, 1), addMat(cubeU, AIR_F)); cube.position.copy(CUBE_C); cube.renderOrder = 16; world.add(cube);
  cubeEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE_S, CUBE_S, CUBE_S)), new THREE.LineBasicMaterial({ color: 0x6fd0ff, transparent: true, opacity: 0, fog: false }));
  cubeEdges.material.color.setRGB(1.0, 2.6, 4.0); cubeEdges.position.copy(CUBE_C); cubeEdges.renderOrder = 17; world.add(cubeEdges);
  cubeGlow = new THREE.Mesh(new THREE.PlaneGeometry(CUBE_S * 1.9, CUBE_S * 1.9), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (x) => { const gg = x.createRadialGradient(128, 128, 0, 128, 128, 128); gg.addColorStop(0, 'rgba(90,190,255,0.9)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gg; x.fillRect(0, 0, 256, 256); }), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  cubeGlow.rotation.x = -Math.PI / 2; cubeGlow.position.set(CUBE_C.x, 0.01, CUBE_C.z); world.add(cubeGlow);
  // chorro de aire de la botella al cubo
  stream = new Parts(260, { jet: true, v0: 3.2, drag: 1.1, size: 0.05, grow: 0.25, spreadA: 0.05, spreadB: 0.06, life: 0.9, opacity: 0.9, add: true, rot: 0, edge: 0.5,
    c: [[0.5, 1.4, 3.0], [0.35, 1.0, 2.4], [0.2, 0.6, 1.5], [0.05, 0.15, 0.4]], seed: 91, order: 18 });
  stream.at(0.06, 1.47, 0.3); stream.u.uDir.value.copy(V(CUBE_C.x, 1.0, CUBE_C.z).sub(V(0.06, 1.47, 0.3)).normalize()); world.add(stream.mesh);
}

// ------------------------------------------------------------------ tiempos
let T = {}, KEYS = null;
function setupTimes() {
  T = { ...CUE, end: END };
  const L = window.LINES_;
  T.l2e = L[2].end; T.l3e = L[3].end; T.l4s = L[4].start; T.l5e = L[5].end; T.l6e = L[6].end; T.l7e = L[7].end;
  T.count0 = T.l3e + 0.05; T.count1 = T.count0 + 4.0;      // 1 → 5 (el 5 llega a los 4 s: «un segundo menos»)
  T.cardsIn = T.l2e - 0.55; T.fin = T.compartir - 0.25;
  KEYS = camKeys();
}
function camKeys() {        // planos abiertos: el bombero entero, la botella y el fuego al fondo
  const K = [
    [0, [1.7, 1.6, 5.4, 0, 1.3, -1.2, 34]],
    [T.botella, [1.35, 1.55, 4.6, 0, 1.25, -0.6, 34]],
    [T.espalda + 0.2, [1.05, 1.5, 3.95, 0.05, 1.22, 0, 34]],
    [T.cuantos + 0.1, [1.6, 1.85, 4.25, 0.26, 1.6, 0.1, 36]],
    [T.d230 + 0.2, [1.5, 1.85, 4.05, 0.28, 1.64, 0.12, 36]],
    [T.siete, [1.2, 1.55, 3.7, 0.15, 1.36, 0.2, 36]],
    [T.reserva + 0.1, [1.35, 1.5, 3.65, 0.2, 1.3, 0.2, 36]],
    [T.gastas, [-1.85, 1.75, 2.95, 0.12, 1.55, -0.05, 36]],
    [T.l2e - 0.2, [-2.1, 1.85, 3.35, 0.15, 1.6, 0, 38]],
    [T.l2e + 0.45, [0, 1.95, 5.6, 0, 1.97, 0, 40]],
    [T.count1, [0, 1.95, 5.35, 0, 1.95, 0, 40]],
    [T.tiempo + 0.15, [0.1, 1.92, 5.45, 0, 1.92, 0, 40]],
    [T.cuarenta + 0.4, [1.0, 1.72, 4.0, 0.2, 1.5, 0.05, 36]],
    [T.dentro, [1.3, 1.66, 3.75, 0.24, 1.45, 0.1, 36]],
    [T.reserva2, [1.15, 1.56, 3.65, 0.15, 1.36, 0.15, 36]],
    [T.salir + 0.25, [1.0, 1.9, 4.65, -0.2, 1.95, -0.4, 38]],
    [T.d230b + 0.3, [1.3, 1.75, 4.6, 0.3, 1.45, 0.05, 38]],
    [T.mil, [0.85, 1.6, 6.2, 0.55, 1.0, -0.3, 40]],
    [T.entre, [0.8, 1.62, 6.1, 0.53, 1.02, -0.3, 40]],
    [T.t34, [0.75, 1.68, 6.0, 0.5, 1.08, -0.3, 40]],
    [T.esla - 0.15, [0, 1.95, 5.5, 0, 1.95, 0, 40]],
    [T.fin, [0, 1.98, 5.3, 0, 1.95, 0, 40]],
    [T.compartir + 0.6, [0, 3.6, 8.2, 0, 1.6, -2.5, 42]],
    [T.end, [0, 6.2, 10.6, 0, 1.6, -5, 44]],
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
function camAt(t) {
  const v = hermite(KEYS, t);
  const sh = Math.exp(-Math.pow((t - T.tiempo - 0.05) / 0.12, 2)) * 0.03 + (t > T.cuarenta && t < T.dentro + 0.3 ? 0.006 : 0);   // sacudida con «¡Tiempo!» y la alarma
  const p = V(v[0] + sh * Math.sin(t * 91), v[1] + sh * Math.cos(t * 77), v[2]);
  return pose(p, V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t
function pressure(t) {      // presión de la botella (bar) en t
  if (t < T.count0) return MAXB;
  if (t < T.tiempo) return MAXB - 22 * sm(T.count0, T.count1, t);                     // la cuenta: la aguja baja un poco
  if (t < T.reserva2 - 0.2) return mx(MAXB - 22, 0, e3(pr(t, T.cuarenta - 0.1, T.dentro - T.cuarenta + 0.25)));   // la trampa: hasta el 0
  return mx(0, MAXB, e3(pr(t, T.reserva2 - 0.2, 0.7)));                              // rebobinado
}
function breath(t) {        // 0..1 al espirar (bocanadas), en fase con la respiración del sonido (compose.py: sfx_track_botella)
  let t0 = 0, per = 3.0;
  if (t >= T.count0 && t < T.dentro) { t0 = T.count0; per = 1.55; }
  else if (t >= T.reserva2) t0 = T.reserva2;
  const ph = ((((t - t0) % per) + per) % per) / per;
  return sm(0.41, 0.47, ph) * (1 - sm(0.7, 0.8, ph));
}
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => f.u.uCam.value.copy(cam.position));
  // fuego y humo (todo el vídeo)
  fireIn.F.u.uTime.value = t; fireIn.s.u.uTime.value = t; fireIn.e.u.uTime.value = t; smokeDoor.u.uTime.value = t;
  fireLight.intensity = 150 + 45 * Math.sin(t * 13) * Math.sin(t * 4.1);
  rimLight.intensity = 8 + 3 * Math.sin(t * 17) * Math.sin(t * 5.3);
  const bph = (t * 2.4) % 1; beacon.intensity = (bph < 0.12 || (bph > 0.24 && bph < 0.36)) ? 26 : 2;
  // la botella: nivel = presión / 230; reserva en rojo desde «reserva»
  const p = pressure(t);
  airU.uTime.value = t; airU.uLevel.value = Math.max(0.0, p / MAXB);
  const resOn = sm(T.reserva - 0.05, T.reserva + 0.3, t) * (1 - sm(T.porminuto, T.porminuto + 0.4, t)) + sm(T.reserva2 + 0.1, T.reserva2 + 0.45, t) * (1 - sm(T.fin - 0.3, T.fin, t));
  airU.uResA.value = cl(resOn);
  const alarm = sm(T.sin - 0.4, T.sin, t) * (1 - sm(T.reserva2 - 0.25, T.reserva2, t));
  airU.uRed.value = alarm * (0.6 + 0.4 * Math.sin(t * 22));
  const toCube = sm(T.mil - 0.3, T.aire2 + 0.4, t) * (1 - sm(T.fin - 0.4, T.fin, t));          // el aire útil «sale» hacia el cubo
  airU.uUse.value = sm(T.d230b, T.ciento, t) * (1 - toCube);
  airU.uI.value = (1 - 0.9 * alarm * sm(T.dentro - 0.5, T.dentro, t)) * (1 - 0.75 * toCube) * (0.9 + 0.1 * Math.sin(t * 3));
  glassU.uI.value = 1 + 0.6 * breath(t);
  // manómetro gigante: sale del hombro con «¿cuántos minutos?»
  const gIn = bk(pr(t, T.cuantos - 0.05, 0.55)) * (1 - sm(T.fin - 0.4, T.fin, t));
  const gHide = sm(T.l2e - 0.3, T.l2e + 0.2, t) * (1 - sm(T.tiempo + 0.3, T.cuarenta, t)) + sm(T.por7 - 0.2, T.por7 + 0.3, t);   // se aparta para las tarjetas y para el cubo
  const gS = Math.max(0.001, gIn * (1 - cl(gHide)));
  gaugeG.scale.setScalar(gS); gaugeG.visible = gS > 0.01;
  gaugeG.position.lerpVectors(V(0.2, 1.4, -0.1), GAUGE_C, cl(gIn));
  gaugeG.quaternion.copy(cam.quaternion);
  const jitter = (t > T.cuarenta && t < T.dentro + 0.4) ? 1.5 * Math.sin(t * 60) : 0.6 * Math.sin(t * 7.3);
  needle.rotation.z = -ang(Math.max(0, p + jitter));
  arcRes.material.opacity = 0.9 * cl(resOn) * (0.7 + 0.3 * Math.sin(t * 6));
  const useOn = sm(T.d230b, T.ciento + 0.2, t) * (1 - sm(T.fin - 0.4, T.fin, t));
  arcUse.material.opacity = 0.85 * useOn;
  // bocanadas al espirar
  puffs.u.uTime.value = t; puffs.u.uOpacity.value = 0.42 * breath(t);
  // tarjetas: entran al acabar los datos; en la trampa la A se pone roja y salta; vuelven con «Es la C»
  cards.forEach((m, i) => {
    const kin = bk(pr(t, T.cardsIn + i * 0.1, 0.5)), kout = sm(T.tiempo + 0.9, T.tiempo + 1.4, t);
    const back = bk(pr(t, T.esla - 0.2 + i * 0.04, 0.4)), bout = sm(T.fin - 0.3, T.fin + 0.05, t);
    const first = kin * (1 - kout), second = back * (1 - bout);
    const k = Math.max(first, second);
    m.visible = k > 0.002;
    if (!m.visible) return;
    const tick = t > T.count0 && t < T.count1 ? Math.pow(1 - ((t - T.count0) % 1), 6) * 0.03 : 0;
    const bad = i === 0 && t > T.tiempo - 0.05 && t < T.esla - 0.5, ok = i === 2 && t > T.esla + 0.05;
    m.material.map = bad ? m.userData.tBad : ok ? m.userData.tOk : m.userData.tN;
    const side = i % 2 ? 1 : -1;
    m.position.set(CARD_COLS[i % 2] + side * (1 - k) * 1.4, CARD_ROWS[i >> 1] + 0.012 * Math.sin(t * 1.7 + i), CARD_Z);
    if (bad) { const s = Math.exp(-Math.pow((t - T.tiempo - 0.15) / 0.18, 2)); m.position.x += 0.03 * Math.sin(t * 80) * s; }
    m.quaternion.copy(cam.quaternion);
    let a = cl(k * 1.3);
    if (t > T.esla + 0.05 && !ok) a *= 1 - 0.65 * sm(T.esla + 0.05, T.esla + 0.35, t);
    m.material.opacity = a; m.material.transparent = true;
    const glow = ok ? 1 + 1.3 * sm(T.esla + 0.1, T.esla + 0.5, t) : bad ? 1.35 : 1;
    m.scale.setScalar((1 + tick) * (ok ? 1 + 0.08 * sm(T.esla + 0.05, T.esla + 0.35, t) : 1));
    m.material.color.setScalar(glow);
  });
  // cartel de salida
  const ex = sm(T.salir - 0.15, T.salir + 0.25, t) * (1 - sm(T.fin, T.fin + 0.4, t));
  exitSign.material.color.setScalar(0.3 + 1.9 * ex * (0.85 + 0.15 * Math.sin(t * 9)));
  const eg = bk(pr(t, T.salir - 0.35, 0.45)) * (1 - sm(T.ciento - 0.2, T.ciento + 0.25, t));
  exitG.visible = eg > 0.01; exitG.position.y = -2.8 * (1 - cl(eg));
  exitLight.intensity = 6 * ex;
  // cubo de aire: se llena con «mil ciento noventa litros», se vacía bocanada a bocanada hasta el «treinta y cuatro»
  const fill = e3(pr(t, T.mil - 0.25, Math.max(0.6, T.aire2 + 0.3 - T.mil)));
  const drain = sm(T.t35b, T.t34 + 0.05, t);
  const cubeOn = sm(T.mil - 0.45, T.mil - 0.1, t) * (1 - sm(T.esla - 0.45, T.esla - 0.1, t));
  cubeU.uTime.value = t; cubeU.uLevel.value = Math.max(0.0001, fill * (1 - drain * (1 - 0.06 * breath(t))));
  cubeU.uI.value = cubeOn * 1.1;
  cubeEdges.material.opacity = cubeOn; cubeEdges.visible = cubeOn > 0.01; cube.visible = cubeOn > 0.01;
  cubeGlow.material.opacity = 0.5 * cubeOn * (1 - 0.6 * drain);
  stream.u.uTime.value = t; stream.u.uOn0.value = T.mil - 0.3; stream.u.uOn1.value = T.aire2 + 0.3;
  stream.mesh.visible = t > T.mil - 0.35 && t < T.aire2 + 1.4;
}

// ------------------------------------------------------------------ capa 2D
function proj(v) { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * W2, y: (-p.y * 0.5 + 0.5) * H2, ok: p.z < 1 }; }
const BLUE2 = '#3FB6FF', RED2 = '#FF4B3E', GREEN2 = '#3EF08A', ORANGE2 = '#FF8A1F', GOLD2 = '#FFC83D';
function chip(x, y, text, col, a, s = 1, icon = null, px = 56) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = a; g.translate(cl(x, 200, W2 - 200), cl(y, 470, H2 - 230)); g.scale(s, s);
  g.font = `400 ${px}px Bebas`; const tw = g.measureText(text).width, w = tw + (icon ? 100 : 60), h = px * 1.45;
  rr(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  const cx = -w / 2 + 46;
  if (icon === 'p') { g.beginPath(); g.arc(cx, 0, 22, 0, 7); g.strokeStyle = col; g.lineWidth = 4; g.stroke(); g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx + 14, -10); g.stroke(); }
  else if (icon === 'l') { rr(cx - 17, -6, 34, 26, 5); g.fillStyle = col; g.fill(); g.beginPath(); g.arc(cx, -6, 11, Math.PI, 0); g.strokeStyle = col; g.lineWidth = 5; g.stroke(); }
  else if (icon === 'b') { rr(cx - 11, -22, 22, 44, 10); g.strokeStyle = col; g.lineWidth = 4; g.stroke(); g.fillStyle = col; g.fillRect(cx - 5, -29, 10, 7); }
  else if (icon === 'w') { for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx - 12 + k * 6, 0, 10 + k * 5, -0.7, 0.7); g.strokeStyle = col; g.lineWidth = 4; g.stroke(); } }
  else if (icon === 'c') { g.beginPath(); g.arc(cx, 0, 20, 0, 7); g.strokeStyle = col; g.lineWidth = 4; g.stroke(); g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, -13); g.moveTo(cx, 0); g.lineTo(cx + 10, 4); g.stroke(); }
  txt(text, icon ? 24 : 0, px * 0.36, px, '#F4F6F8', 400, 'center', 'Bebas');
  g.restore();
}
function stamp(text, y, col, a, px = 170, rot = -0.06) {
  if (a <= 0.005) return;
  const k = bk(cl(a * 1.4));
  g.save(); g.globalAlpha = cl(a * 1.6); g.translate(540, y); g.rotate(rot); g.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
  g.font = `400 ${px}px Bebas`; const w = g.measureText(text).width + 80;
  rr(-w / 2, -px * 0.62, w, px * 1.06, 26); g.fillStyle = 'rgba(8,8,10,0.55)'; g.fill(); g.strokeStyle = col; g.lineWidth = 10; g.stroke();
  g.shadowColor = col; g.shadowBlur = 40; txt(text, 0, px * 0.33, px, col, 400, 'center', 'Bebas'); g.shadowBlur = 0;
  g.restore();
}
const ESP = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  // alarma: viñeta roja que late
  const alarm = sm(T.sin - 0.4, T.sin, t) * (1 - sm(T.reserva2 - 0.25, T.reserva2, t));
  if (alarm > 0) {
    const vg = g.createRadialGradient(540, 960, 380, 540, 960, 1250);
    vg.addColorStop(0, 'rgba(255,30,20,0)'); vg.addColorStop(1, `rgba(255,30,20,${(0.5 * alarm * (0.65 + 0.35 * Math.sin(t * 22))).toFixed(3)})`);
    g.fillStyle = vg; g.fillRect(0, 0, W2, H2);
  }
  // datos: rótulos pegados a cada cosa
  const gp = proj(gaugeG.position), bp = proj(ff.localToWorld(BOT_C.clone())), rp = proj(ff.localToWorld(V(0, 1.53, -0.25)));
  const dOut = 1 - sm(T.l2e - 0.4, T.l2e - 0.05, t);
  chip(gp.x, gp.y - 240, '¿ ? MIN', GOLD2, sm(T.minutos - 0.15, T.minutos + 0.15, t) * (1 - sm(T.d230 - 0.2, T.d230, t)), 1.15, 'c', 64);
  chip(gp.x, gp.y + 200, `${Math.round(pressure(t))} BAR`, BLUE2, sm(T.bares - 0.25, T.bares, t) * dOut, 1.15, 'p', 64);
  chip(bp.x + 210, bp.y - 40, '7 LITROS', BLUE2, sm(T.litros - 0.2, T.litros + 0.05, t) * dOut, 1.05, 'b');
  chip(bp.x + 230, bp.y + 140, 'RESERVA: 60 BAR', RED2, sm(T.sesenta - 0.2, T.sesenta + 0.05, t) * dOut, 1.05, 'l');
  chip(rp.x + 40, rp.y - 190, '−35 L/MIN', '#CFE6FF', sm(T.t35 - 0.15, T.t35 + 0.15, t) * dOut, 1.1, 'w', 60);
  // comenta + cuenta 1 → 5 (empieza ya en 1)
  const ca = sm(T.comenta - 0.1, T.comenta + 0.25, t) * (1 - sm(T.count1 - 0.05, T.count1 + 0.2, t));
  if (ca > 0) {
    g.save(); g.globalAlpha = ca; g.translate(540, 1555);
    rr(-260, -50, 520, 100, 50); g.fillStyle = 'rgba(8,10,14,0.74)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.26)'; g.lineWidth = 3; g.stroke();
    txt('💬  COMENTA TU LETRA', 0, 18, 50, '#F2F5F8', 400, 'center', 'Bebas'); g.restore();
  }
  if (t > T.count0 - 0.02 && t < T.tiempo + 0.25) {
    const e = t - T.count0, n = Math.min(5, 1 + Math.floor(Math.max(0, e))), f = Math.max(0, e) % 1;
    const k = cl(e / 4.0), out = 1 - sm(T.tiempo, T.tiempo + 0.25, t);
    g.save(); g.globalAlpha = out; g.translate(540, 1735);
    g.beginPath(); g.arc(0, 0, 84, 0, 7); g.fillStyle = 'rgba(8,10,14,0.78)'; g.fill();
    g.beginPath(); g.arc(0, 0, 84, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.strokeStyle = n >= 5 ? RED2 : '#FF7A1A'; g.lineWidth = 10; g.lineCap = 'round'; g.stroke();
    const s = 1 + 0.4 * Math.pow(1 - (n >= 5 ? Math.min(1, (e - 4) * 3) : f), 5);
    g.scale(s, s); txt(String(n), 0, 38, 116, n >= 5 ? '#FF6B5E' : '#FFFFFF', 400, 'center', 'Bebas'); g.restore();
  }
  // ¡TIEMPO! y la trampa
  stamp('¡TIEMPO!', 1080, RED2, Math.exp(-Math.pow((t - T.tiempo - 0.35) / 0.32, 4)), 180);
  const tr = sm(T.cuarenta - 0.15, T.cuarenta + 0.15, t) * (1 - sm(T.reserva2 - 0.3, T.reserva2, t));
  if (tr > 0) {
    g.save(); g.globalAlpha = tr; g.translate(540, 1560);
    rr(-450, -96, 900, 192, 36); g.fillStyle = 'rgba(30,6,6,0.88)'; g.fill(); g.strokeStyle = RED2; g.lineWidth = 5; g.stroke();
    txt('46 MIN = 230 × 7 ÷ 35', 0, -8, 76, '#FFFFFF', 400, 'center', 'Bebas');
    txt('✘ te gastas también la reserva', 0, 58, 44, '#FF8A80', 800, 'center', 'Inter');
    g.restore();
  }
  chip(gp.x, gp.y + 200, '0 BAR', RED2, sm(T.sin - 0.1, T.sin + 0.2, t) * (1 - sm(T.reserva2 - 0.3, T.reserva2, t)), 1.2, 'p', 66);
  stamp('SIN AIRE', 980, RED2, sm(T.dentro - 0.2, T.dentro + 0.1, t) * (1 - sm(T.reserva2 - 0.35, T.reserva2 - 0.05, t)), 150, 0.05);
  // la reserva no se toca: es el aire para salir
  const rs = sm(T.toca - 0.25, T.toca + 0.05, t) * (1 - sm(T.d230b - 0.3, T.d230b, t));
  chip(bp.x + 200, bp.y + 150, 'RESERVA: NO SE TOCA', RED2, rs * (1 - sm(T.salir - 0.2, T.salir, t)), 1.05, 'l');
  chip(bp.x + 200, bp.y + 150, 'ES EL AIRE PARA SALIR', GREEN2, rs * sm(T.salir - 0.2, T.salir, t), 1.05, 'l');
  // la cuenta: 230 − 60 = 170 · 170 × 7 = 1.190 L · 1.190 ÷ 35 = 34 MIN
  const eq = sm(T.d230b - 0.2, T.d230b + 0.1, t) * (1 - sm(T.esla - 0.5, T.esla - 0.2, t));
  if (eq > 0) {
    g.save(); g.globalAlpha = eq; g.translate(540, 1555);
    rr(-480, -150, 960, 300, 40); g.fillStyle = 'rgba(8,10,14,0.86)'; g.fill(); g.strokeStyle = BLUE2; g.lineWidth = 4; g.stroke();
    const rows = [
      [[`230`, T.d230b], [` − 60`, T.menos], [` = 170 BAR`, T.ciento]],
      [[`170`, T.por7], [` × 7 L`, T.siete2], [` = 1.190 L`, T.mil]],
      [[`1.190`, T.entre], [` ÷ 35`, T.t35b], [` = 34 MIN`, T.t34]],
    ];
    g.font = '400 84px Bebas';
    rows.forEach((row, ri) => {
      const tw = row.reduce((a, [s2]) => a + g.measureText(s2).width, 0); let x = -tw / 2;
      for (const [s2, tc] of row) {
        const w = g.measureText(s2).width, a = sm(tc - 0.12, tc + 0.12, t);
        const last = s2.startsWith(' =');
        if (a > 0) { g.globalAlpha = eq * a; txt(s2, x, -62 + ri * 96, 84, last ? (ri === 2 ? GOLD2 : BLUE2) : '#F4F6F8', 400, 'left', 'Bebas'); }
        x += w;
      }
    });
    g.restore();
  }
  // el cubo: 1.190 L y el reloj hasta 34 min
  const cubeOn = sm(T.mil - 0.3, T.mil, t) * (1 - sm(T.fin - 0.3, T.fin, t)) * (1 - sm(T.esla - 0.55, T.esla - 0.3, t));
  if (cubeOn > 0) {
    const ct = proj(V(CUBE_C.x, CUBE_C.y + CUBE_S / 2 + 0.12, CUBE_C.z)), cs = proj(V(CUBE_C.x + CUBE_S / 2 + 0.06, CUBE_C.y, CUBE_C.z + CUBE_S / 2));
    const st34 = 1 - sm(T.t34 - 0.1, T.t34 + 0.15, t);
    chip(ct.x, ct.y - 30, '1.190 L DE AIRE', BLUE2, cubeOn * st34, 1.15, null, 62);
    g.globalAlpha = cubeOn * 0.85 * st34; txt('1,06 m', cl(cs.x + 70, 120, 980), cs.y + 10, 40, 'rgba(200,232,255,0.9)', 700, 'center', 'Inter'); g.globalAlpha = 1;
    const ck = sm(T.t35b, T.t34 + 0.05, t), clockA = sm(T.entre - 0.1, T.entre + 0.2, t) * cubeOn;
    const mins = 34 * ck, mm = Math.floor(mins), ss = Math.floor((mins - mm) * 60);
    chip(ct.x, ct.y - 160, `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, ck >= 1 ? GOLD2 : '#F4F6F8', clockA, 1.2 + 0.2 * Math.exp(-Math.pow((t - T.t34 - 0.1) / 0.12, 2)), 'c', 70);
  }
  stamp('34 MIN', 640, GOLD2, sm(T.t34 - 0.05, T.t34 + 0.2, t) * (1 - sm(T.esla - 0.5, T.esla - 0.25, t)), 200, -0.04);
  chip(540, 1600, '✓ ES LA C', GREEN2, sm(T.esla - 0.05, T.esla + 0.25, t) * (1 - sm(T.fin - 0.3, T.fin, t)), 1.3, null, 70);
  share(t);
  closing(t);
}

// ------------------------------------------------------------------ fotograma
function subframes(t) {
  const a = camAt(t - 1 / 240), b = camAt(t + 1 / 240);
  const ang2 = a.q.angleTo(b.q), mv = a.p.distanceTo(b.p) / Math.max(0.5, (a.focus + b.focus) / 2);
  return Math.max(1, Math.min(4, Math.ceil((ang2 + mv) * H2 / (a.fov * Math.PI / 180) / 22)));
}
window.renderAt = t => {
  const N = window.FAST ? 1 : subframes(t);
  renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < N; k++) {
    update(N === 1 ? t : t + (k / (N - 1) - 0.5) / 120);
    composer.render();
    accMat.uniforms.tSrc.value = composer.readBuffer.texture; accMat.uniforms.uW.value = 1 / N;
    renderer.setRenderTarget(accRT); renderer.autoClear = false; renderer.render(accScene, quadCam); renderer.autoClear = true;
  }
  if (N > 1) update(t);
  finMat.uniforms.tSrc.value = accRT.texture; finMat.uniforms.uTime.value = t;
  const fl = Math.exp(-Math.pow((t - T.tiempo - 0.03) / 0.07, 2)) * 0.35;      // golpe de luz con «¡Tiempo!»
  finMat.uniforms.uFlash.value = fl; finMat.uniforms.uFlashCol.value.setRGB(1, 0.35, 0.3);
  finMat.uniforms.uDim.value = (t >= T.fin ? mx(1, 0.5, sm(T.compartir - 0.2, T.compartir + 0.3, t)) : 1) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 9.0);

(async () => {
  try {
    while (!_r2d) await new Promise(r => setTimeout(r, 30));
    await document.fonts.ready;
    NOISE = noiseTex(); mats();
    setupTimes(); buildWorld();
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'botella: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
