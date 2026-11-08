// «Un día de bombero: 24 horas de guardia» (Bomberados, idea de Adrián para el lunes 9).
// Motor de projects/bomberados_presion/web/presion.js (luz, resplandor, desenfoque de movimiento, llamas, bombero,
// autobomba, edificios, manguera, chorro). Vídeo por PLANOS (cortes secos) con un reloj de 24 h que corre y una luz que
// cambia con la hora: parque, relevo, revisión, desayuno, prácticas, reconocimiento, vivienda, accidente, vuelta al
// parque, contenedor, madrugada y relevo.
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
  const fu = { uTime: { value: 0 }, uSpeed: { value: 1 }, uDash: { value: curve.getLength() / 0.55 }, uHead: { value: 0 }, uI: { value: 0 } };
  const flow = new THREE.Mesh(new THREE.TubeGeometry(curve, geo.parameters.tubularSegments, r * 2.1, 12, false), new THREE.ShaderMaterial({
    uniforms: fu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime, uSpeed, uDash, uHead, uI; varying float vU;
      void main(){ float s = fract(vU * uDash - uTime * uSpeed); float a = smoothstep(0.0, 0.12, s) * smoothstep(0.62, 0.3, s);
        a *= smoothstep(uHead, uHead - 0.015, vU) * uI; if (a < 0.01) discard; gl_FragColor = vec4(vec3(0.35, 0.78, 1.7) * a, a); }` }));
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


// ================================================================== MUNDO
// Un solo mundo con cuatro sitios: el parque (origen), la calle de la vivienda (z = CITY_Z), el cruce del accidente
// (z = ACC_Z) y la calle del contenedor (z = CONT_Z). Cada plano enseña lo suyo (grupos que se encienden por plano).
const world = new THREE.Group(); scene.add(world);
cam.far = 900; cam.updateProjectionMatrix();
const C = (hex) => new THREE.Color(hex);
let hemi, sun, sky, moon;
const facades = [], lamps = [], AIRS = [], GR = {}, TR = {}, FF = {}, CR = {}, J = {}, FIRE = {};
const CITY_Z = 140, ACC_Z = 280, CONT_Z = -160;
const LINE = () => new THREE.MeshBasicMaterial({ color: 0xd2d2ca });
function put(geo, mat, x, y, z, parent = world) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
function yawTo(o, x, z) { o.rotation.y = Math.atan2(-(x - o.position.x), -(z - o.position.z)); return o; }   // personas: el frente mira a −Z
function group(name, parent = world) { const g = new THREE.Group(); parent.add(g); GR[name] = g; return g; }

// ------------------------------------------------------------------ edificios de ciudad (de día: fachada clara; de noche: ventanas encendidas)
const WALLS = ['#dccfb8', '#c9906c', '#e8e3d8', '#bba98c', '#d8b68c', '#aab1b8', '#c8a37e', '#e2d2b0', '#b9775a'];
function facadeTex(cols, rows, seed, mark) {
  const W = cols * 64, H = rows * 64, wall = WALLS[Math.floor(rnd(seed * 1.7 + 0.3) * WALLS.length)];
  const map = canvasTex(W, H, (x) => {
    x.fillStyle = wall; x.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H / 60; i++) { x.fillStyle = `rgba(0,0,0,${0.025 + rnd(i * 1.3 + seed) * 0.05})`; x.fillRect(rnd(i * 2.1 + seed) * W, rnd(i * 3.7 + seed) * H, 2, 2); }
    for (let r = 0; r < rows; r++) {
      const Y = (rows - 1 - r) * 64;
      x.fillStyle = 'rgba(0,0,0,0.10)'; x.fillRect(0, Y + 60, W, 4);
      for (let c = 0; c < cols; c++) {
        const X = c * 64;
        if (r === 0 && c % 3 === 1) { x.fillStyle = '#3a2c22'; x.fillRect(X + 16, Y + 10, 32, 54); continue; }          // portal
        if (r === 0) { x.fillStyle = '#30353b'; x.fillRect(X + 6, Y + 12, 52, 52); x.fillStyle = 'rgba(255,255,255,0.09)'; for (let k = 0; k < 8; k++) x.fillRect(X + 6, Y + 14 + k * 6, 52, 2); continue; }   // persiana de local
        x.fillStyle = '#f2eee6'; x.fillRect(X + 11, Y + 10, 42, 42);
        x.fillStyle = '#2a3542'; x.fillRect(X + 14, Y + 13, 36, 36);
        x.fillStyle = 'rgba(170,200,230,0.32)'; x.fillRect(X + 14, Y + 13, 36, 11);
        x.fillStyle = '#f2eee6'; x.fillRect(X + 31, Y + 13, 2, 36);
        if (rnd(r * 5.1 + c * 2.3 + seed) < 0.4) { x.fillStyle = '#4c5058'; x.fillRect(X + 6, Y + 50, 52, 5); x.fillRect(X + 6, Y + 39, 52, 2); for (let k = 0; k < 7; k++) x.fillRect(X + 7 + k * 8, Y + 40, 2, 11); }   // balcón
      }
    }
  }, { aniso: 4 });
  const em = canvasTex(W, H, (x) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++) {
      const Y = (rows - 1 - r) * 64, X = c * 64;
      if (mark) { if (mark(r, c)) { x.fillStyle = '#ff7a1a'; x.fillRect(X + 14, Y + 13, 36, 36); } continue; }
      if (rnd(r * 31.7 + c * 7.3 + seed) < 0.4) { x.fillStyle = `rgb(255,${175 + Math.round(rnd(r + c * 3 + seed) * 55)},${95 + Math.round(rnd(r * 2 + c + seed) * 40)})`; x.fillRect(X + 14, Y + 13, 36, 36); }
    }
  }, { aniso: 4 });
  return { map, em, wall };
}
function cityBld(w, h, d, x, z, seed, rot = 0, mark = null) {
  const cols = Math.max(2, Math.round(w / 2.4)), rows = Math.max(3, Math.round(h / 3.0));
  const { map, em, wall } = facadeTex(cols, rows, seed, mark);
  const front = new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: mark ? 1.7 : 0, roughness: 0.85 });
  const side = new THREE.MeshStandardMaterial({ color: new THREE.Color(wall).multiplyScalar(0.78), roughness: 0.92 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x4e4a45, roughness: 0.95 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roof, side, front, side]);
  m.position.set(x, h / 2, z); m.rotation.y = rot; m.castShadow = m.receiveShadow = true; world.add(m);
  if (!mark) facades.push(front);
  const cor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3), side); cor.position.set(x, h + 0.17, z); cor.rotation.y = rot; world.add(cor);
  return m;
}
function lamp(x, z, light = false, parent = world) {
  put(new THREE.CylinderGeometry(0.07, 0.1, 6, 12), M.steel, x, 3, z, parent);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffc98a })); bulb.position.set(x, 6.0, z); parent.add(bulb);
  let l = null; if (light) { l = new THREE.PointLight(0xffb070, 0, 0, 2); l.position.set(x, 5.75, z); parent.add(l); }
  lamps.push({ l, bulb, inten: 45, kind: 'street' });
}
const TRUNK = () => new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 });
let LEAF, LEAF2;
function tree(x, z, s = 1, parent = world) {
  put(new THREE.CylinderGeometry(0.12 * s, 0.17 * s, 2.4 * s, 10), TRUNK(), x, 1.2 * s, z, parent);
  put(new THREE.IcosahedronGeometry(1.35 * s, 1), LEAF, x, 3.1 * s, z, parent).scale.set(1, 1.15, 1);
  put(new THREE.IcosahedronGeometry(0.95 * s, 1), LEAF2, x + 0.5 * s, 3.85 * s, z - 0.3 * s, parent);
}
function hydrant(x, z, parent = world) {
  const red = new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.45 });
  put(new THREE.CylinderGeometry(0.14, 0.17, 0.75, 18), red, x, 0.5, z, parent);
  put(new THREE.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), red, x, 0.87, z, parent);
  for (const s of [-1, 1]) put(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12), M.chrome, x + 0.16 * s, 0.62, z, parent).rotation.z = Math.PI / 2;
  put(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 12), M.yellow, x, 1.0, z, parent);
}
function cone(x, z, parent = world) {
  const o = new THREE.MeshStandardMaterial({ color: 0xff5a1a, roughness: 0.5 });
  put(new THREE.BoxGeometry(0.42, 0.04, 0.42), o, x, 0.02, z, parent);
  put(new THREE.ConeGeometry(0.16, 0.62, 16), o, x, 0.33, z, parent);
  put(new THREE.CylinderGeometry(0.1, 0.118, 0.1, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x444444 }), x, 0.31, z, parent);
}
function makeCar(col, parent = world) {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x101820, roughness: 0.05, metalness: 0.5, clearcoat: 1 });
  put(new RoundedBoxGeometry(4.2, 0.72, 1.8, 3, 0.18), paint, 0, 0.66, 0, g);
  const cabG = new THREE.BoxGeometry(2.3, 0.62, 1.6), p = cabG.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * 0.72 - 0.1); p.setZ(i, p.getZ(i) * 0.9); }
  cabG.computeVertexNormals();
  put(cabG, glass, -0.25, 1.32, 0, g);
  put(new RoundedBoxGeometry(1.62, 0.07, 1.42, 2, 0.03), paint, -0.36, 1.65, 0, g);
  for (const x of [1.35, -1.35]) for (const z of [-0.82, 0.82]) {
    put(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 24), M.rubber, x, 0.36, z, g).rotation.x = Math.PI / 2;
    put(new THREE.CylinderGeometry(0.2, 0.2, 0.27, 16), M.chrome, x, 0.36, z, g).rotation.x = Math.PI / 2;
  }
  for (const z of [-0.6, 0.6]) { put(new THREE.BoxGeometry(0.05, 0.14, 0.34), new THREE.MeshBasicMaterial({ color: 0xffffff }), 2.1, 0.8, z, g); put(new THREE.BoxGeometry(0.05, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0xc01010 }), -2.1, 0.82, z, g); }
  parent.add(g); return g;
}
function labelPlane(text, w, h, px, bg, fg) {
  const t = canvasTex(1024, Math.round(1024 * h / w), (x) => { x.fillStyle = bg; x.fillRect(0, 0, 1024, 1024); x.font = `400 ${px}px Bebas`; x.textAlign = 'center'; x.fillStyle = fg; x.fillText(text, 512, Math.round(1024 * h / w) * 0.72); });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.6 }));
}
function truckAt(x, z, dx, dz, parent = world) {
  const t = makeTruck(); t.position.set(x, 0, z); t.rotation.y = Math.atan2(-dz, dx);
  t.traverse(o => { if (o.isMesh) { o.castShadow = true; } }); parent.add(t); t.userData.home = t.position.clone(); return t;
}
function ffAt(x, z, lx, lz, parent = world) { const f = makeFirefighter(); f.position.set(x, 0, z); yawTo(f, lx, lz); parent.add(f); AIRS.push(airU); return f; }
function lanceFor(f, up = 0.25, parent = world) {     // lanza en las manos de un bombero
  const fw = V(-Math.sin(f.rotation.y), 0, -Math.cos(f.rotation.y));
  const base = f.position.clone().add(V(0, 1.0, 0)).addScaledVector(fw, 0.3);
  const dir = fw.clone().add(V(0, up, 0)).normalize();
  const tip = base.clone().addScaledVector(dir, 0.6);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.065, 0.62, 16), M.chrome);
  m.position.copy(base).add(tip).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), dir); parent.add(m);
  return { base, tip, dir };
}

// ------------------------------------------------------------------ la dotación «de calle» (sin equipo: desayuno, estudio, cena, gimnasio, a casa)
let crewWord = null;
function makeCrew(o = {}) {
  const G = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: o.shirt ?? 0x1d2944, roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: o.pants ?? 0x161b26, roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: o.skin ?? 0xd0a07c, roughness: 0.62 });
  const hairM = new THREE.MeshStandardMaterial({ color: o.hair ?? 0x2b1e15, roughness: 0.8 });
  const P = (geo, mat, x, y, z, parent = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const sit = !!o.sit, hipY = sit ? 0.5 : 0.9;
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const hp = new THREE.Group(); hp.position.set(0.1 * s, hipY, 0); G.add(hp); legs.push(hp);
    if (sit) {
      P(new THREE.CapsuleGeometry(0.083, 0.34, 6, 12), pants, 0, 0, -0.21, hp).rotation.x = Math.PI / 2;
      P(new THREE.CapsuleGeometry(0.075, 0.3, 6, 12), pants, 0, -0.24, -0.42, hp);
      P(new RoundedBoxGeometry(0.11, 0.09, 0.26, 2, 0.035), M.black, 0, -0.45, -0.47, hp);
    } else {
      P(new THREE.CapsuleGeometry(0.083, 0.66, 6, 12), pants, 0, -0.42, 0, hp);
      P(new RoundedBoxGeometry(0.11, 0.09, 0.26, 2, 0.035), M.black, 0, -0.855, -0.04, hp);
    }
  }
  P(new RoundedBoxGeometry(0.44, 0.58, 0.26, 4, 0.1), shirt, 0, hipY + 0.3, 0);
  if (!crewWord) crewWord = canvasTex(512, 96, (x) => { x.font = '400 84px Bebas'; x.textAlign = 'center'; x.fillStyle = '#f2f2f2'; x.fillText('BOMBEROS', 256, 80); });
  P(new THREE.PlaneGeometry(0.34, 0.064), new THREE.MeshBasicMaterial({ map: crewWord, transparent: true }), 0, hipY + 0.45, 0.132);
  P(new THREE.CylinderGeometry(0.055, 0.065, 0.09, 14), skin, 0, hipY + 0.64, 0);
  P(new THREE.SphereGeometry(0.11, 24, 18), skin, 0, hipY + 0.79, 0).scale.set(0.95, 1.08, 1);
  if (o.cap) {
    P(new THREE.SphereGeometry(0.118, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), shirt, 0, hipY + 0.82, 0);
    P(new THREE.CylinderGeometry(0.085, 0.085, 0.012, 20), shirt, 0, hipY + 0.83, -0.1).scale.set(1.1, 1, 0.75);
  } else P(new THREE.SphereGeometry(0.117, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, hipY + 0.81, 0.012);
  for (const s of [-1, 1]) P(new THREE.SphereGeometry(0.016, 8, 6), M.black, 0.04 * s, hipY + 0.805, -0.102);
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0.26 * s, hipY + 0.53, 0); G.add(p); arms.push(p);
    P(new THREE.CapsuleGeometry(0.06, 0.16, 6, 12), shirt, 0, -0.12, 0, p);
    const e = new THREE.Group(); e.position.set(0, -0.27, 0); p.add(e); p.userData.el = e;      // codo
    P(new THREE.CapsuleGeometry(0.048, 0.18, 6, 12), skin, 0, -0.12, 0, e);
    P(new THREE.SphereGeometry(0.052, 12, 10), skin, 0, -0.27, 0, e);
  }
  if (o.bag) P(new RoundedBoxGeometry(0.32, 0.42, 0.16, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.8 }), 0, hipY + 0.3, 0.2);
  G.userData = { arms, legs, hipY };
  return G;
}
function crewAt(x, z, lx, lz, o, parent = world) { const c = makeCrew(o); c.position.set(x, 0, z); yawTo(c, lx, lz); parent.add(c); return c; }
function chair(x, z, lx, lz, parent) {
  const c = new THREE.Group(); c.position.set(x, 0, z); yawTo(c, lx, lz); parent.add(c);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.5, metalness: 0.3 });
  put(new THREE.BoxGeometry(0.44, 0.05, 0.44), mat, 0, 0.45, 0.02, c);
  put(new THREE.BoxGeometry(0.44, 0.4, 0.04), mat, 0, 0.7, 0.23, c);
  for (const [a, b] of [[-0.19, -0.17], [0.19, -0.17], [-0.19, 0.21], [0.19, 0.21]]) put(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 8), M.steel, a, 0.225, b, c);
  return c;
}
function gearSet(x, z, parent) {           // equipo colgado (mirando a −X): chaquetón, casco y botas
  const jacket = new THREE.MeshStandardMaterial({ color: 0x232c3e, roughness: 0.8 });
  const tape = new THREE.MeshStandardMaterial({ color: 0xe0d96f, roughness: 0.35, emissive: 0x6b6624, emissiveIntensity: 0.8 });
  put(new RoundedBoxGeometry(0.16, 0.74, 0.54, 3, 0.07), jacket, x, 1.35, z, parent);
  for (const y of [1.1, 1.52]) put(new THREE.BoxGeometry(0.17, 0.045, 0.55), tape, x, y, z, parent);
  put(new THREE.SphereGeometry(0.16, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xe8be2c, roughness: 0.25, clearcoat: 1 }), x - 0.05, 1.86, z, parent).scale.set(1.1, 1.05, 1.0);
  put(new THREE.BoxGeometry(0.1, 0.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x1a2130, roughness: 0.84 }), x - 0.02, 0.64, z, parent);
  for (const s of [-1, 1]) put(new RoundedBoxGeometry(0.28, 0.34, 0.12, 2, 0.04), M.black, x - 0.08, 0.17, z + 0.08 * s, parent);
}

// ------------------------------------------------------------------ cielo: estrellas y luna (siguen a la cámara)
function makeSky() {
  sky = new THREE.Group(); scene.add(sky);
  const n = 1500, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = rnd(i * 1.13) * Math.PI * 2, e = Math.asin(0.03 + 0.97 * rnd(i * 2.37)), r = 600; p[i * 3] = Math.cos(a) * Math.cos(e) * r; p[i * 3 + 1] = Math.sin(e) * r; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  sky.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.0, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  sky.add(sky.stars);
  const glow = canvasTex(256, 256, (x) => { const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.17, 'rgba(255,248,230,0.95)'); gr.addColorStop(0.2, 'rgba(190,205,255,0.3)'); gr.addColorStop(1, 'rgba(120,150,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); });
  moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  moon.scale.set(70, 70, 1); moon.position.copy(V(-0.42, 0.24, -0.88).normalize().multiplyScalar(560)); sky.add(moon);
  const du = { uTop: { value: C(0x4a82c4) }, uHor: { value: C(0xb4d0ea) }, uSun: { value: V(0, 1, 0) }, uSunCol: { value: C(0xffd09a) }, uSunA: { value: 0 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(760, 48, 24), new THREE.ShaderMaterial({ uniforms: du, side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uTop, uHor, uSun, uSunCol; uniform float uSunA; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 c = mix(uHor, uTop, pow(smoothstep(-0.02, 0.55, h), 0.75));
        c = mix(c, uHor * 0.7, smoothstep(0.0, -0.25, h));
        float s = max(dot(d, normalize(uSun)), 0.0);
        c += uSunCol * (pow(s, 900.0) * 6.0 + pow(s, 14.0) * 0.45 + pow(s, 3.0) * 0.12) * uSunA;
        gl_FragColor = vec4(c, 1.0); }` }));
  dome.renderOrder = -10; dome.frustumCulled = false; sky.add(dome); sky.dome = du;
}

// ------------------------------------------------------------------ el parque de bomberos (en el origen, cocheras mirando a +Z)
const BAY = [-8.35, 0, 8.35], TABLE = V(8.35, 0, -6.2);
function buildStation() {
  const conc = new THREE.MeshStandardMaterial({ color: 0x8e8c87, roughness: 0.9 });
  const wall = new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 0.9 });
  const red = new THREE.MeshStandardMaterial({ color: 0xa41c22, roughness: 0.55 });
  const floorIn = new THREE.MeshStandardMaterial({ color: 0x6f7378, roughness: 0.32, metalness: 0.05 });
  const grass = new THREE.MeshStandardMaterial({ color: 0x55703a, roughness: 1 });
  const walk = new THREE.MeshStandardMaterial({ color: 0xa9a59c, roughness: 0.9 });
  put(new THREE.BoxGeometry(34, 0.04, 22), conc, 0, 0.02, 10);
  const yel = new THREE.MeshStandardMaterial({ color: 0xe8c020, roughness: 0.7 });      // líneas amarillas de salida de cada cochera
  for (const x of BAY) for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.16, 0.012, 18.5), yel, x + 2.7 * s, 0.045, 9.3);
  for (let i = 0; i < 30; i++) put(new THREE.BoxGeometry(0.24, 0.012, 2.4), yel, -14.2 + i * 0.98, 0.045, 19.6).rotation.y = 0.65;
  put(new THREE.BoxGeometry(220, 0.14, 3), walk, 0, 0.07, 22.5);
  put(new THREE.BoxGeometry(220, 0.14, 3), walk, 0, 0.07, 33.5);
  for (let i = 0; i < 44; i++) put(new THREE.BoxGeometry(2.4, 0.012, 0.15), LINE(), -108 + i * 5, 0.012, 28);
  for (const x of [-30, 30]) put(new THREE.BoxGeometry(26, 0.06, 36), grass, x, 0.03, 3);
  for (const [x, z] of [[-20, 16], [-26, 9], [-22, 1], [21, 16], [27, 7], [-30, -8], [30, -14], [-19, -13], [24, -2]]) tree(x, z, 1 + rnd(x * 0.7 + z) * 0.35);
  for (let i = 0; i < 12; i++) { cityBld(10, 13 + rnd(i * 3.1) * 15, 10, -60 + i * 11, -42, 100 + i); cityBld(10, 11 + rnd(i * 5.9) * 13, 10, -60 + i * 11, 44, 130 + i, Math.PI); }
  lamp(-15, 21.2, true); lamp(15, 21.2, true); lamp(-45, 21.2); lamp(45, 21.2);
  // el edificio
  put(new THREE.BoxGeometry(26, 0.06, 14), floorIn, 0, 0.03, -7);
  put(new THREE.BoxGeometry(26, 4.2, 14.4), wall, 0, 7.1, -7);
  put(new THREE.BoxGeometry(26.4, 0.45, 14.8), red, 0, 9.4, -7);
  put(new THREE.BoxGeometry(26, 5, 0.4), wall, 0, 2.5, -14);
  for (const x of [-12.6, -4.1, 4.1, 12.6]) put(new THREE.BoxGeometry(1.2, 5, 14.4), wall, x, 2.5, -7);
  for (const x of BAY) { put(new THREE.BoxGeometry(7.2, 0.45, 0.5), M.steel, x, 4.8, 0.1); put(new THREE.BoxGeometry(7.2, 0.1, 0.6), M.black, x, 5.0, 0.15); }
  put(new THREE.BoxGeometry(26.2, 0.5, 0.6), red, 0, 5.3, 0.1);
  const sign = labelPlane('BOMBEROS', 10, 1.4, 220, '#a41c22', '#ffffff'); sign.position.set(0, 7.35, 0.21); world.add(sign);
  for (let i = 0; i < 8; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshStandardMaterial({ color: 0x2a3540, emissive: 0xffc070, emissiveIntensity: 0, roughness: 0.15, metalness: 0.3 })); w.position.set(i < 4 ? -11.6 + i * 1.95 : 5.75 + (i - 4) * 1.95, 8.45, 0.21); world.add(w); facades.push(w.material); }
  for (const x of BAY) { const tb = put(new THREE.BoxGeometry(0.2, 0.06, 3.2), new THREE.MeshBasicMaterial({ color: 0xffffff }), x, 4.95, -5.5); const l = new THREE.PointLight(0xeef2ff, 0, 0, 2); l.position.set(x, 4.5, -4.5); world.add(l); lamps.push({ l, bulb: tb, inten: 22, kind: 'bay' }); }
  // torre de prácticas
  const tw = new THREE.MeshStandardMaterial({ color: 0xc2ab8c, roughness: 0.92 }), hole = new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.9 });
  put(new THREE.BoxGeometry(5, 16, 5), tw, 17.4, 8, -8);
  put(new THREE.BoxGeometry(5.4, 0.5, 5.4), red, 17.4, 16.2, -8);
  for (let r = 0; r < 5; r++) for (const [dx, dz, ry] of [[0, 2.52, 0], [-2.52, 0, -Math.PI / 2]]) put(new THREE.PlaneGeometry(1.3, 1.6), hole, 17.4 + dx, 2.4 + r * 3, -8 + dz).rotation.y = ry;
  // autobombas en las cocheras 1 y 2
  TR.t1 = truckAt(BAY[0], -6.5, 0, 1); TR.t2 = truckAt(BAY[1], -6.5, 0, 1);
  // equipo colgado junto a la autobomba 2 (cochera 2, pared de la derecha)
  put(new THREE.BoxGeometry(0.06, 0.06, 6.6), M.steel, 3.42, 1.78, -5.6);
  for (let i = 0; i < 5; i++) gearSet(3.3, -2.9 - i * 1.25, world);
  // mangueras enrolladas delante de la cochera 1
  const hoseM = new THREE.MeshStandardMaterial({ color: 0xe9e3d3, roughness: 0.7 });
  for (const [x, z, n] of [[-7.4, 2.0, 3], [-6.4, 2.6, 2], [-8.4, 2.7, 1]]) for (let k = 0; k < n; k++) { const r = put(new THREE.TorusGeometry(0.3, 0.075, 12, 32), hoseM, x, 0.08 + k * 0.15, z); r.rotation.x = Math.PI / 2; put(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 16), M.chrome, x + 0.36, 0.08 + k * 0.15, z).rotation.z = Math.PI / 2; }
  // cochera 3: la mesa (desayuno, estudio, cena) y el gimnasio al fondo
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.6 });
  put(new THREE.BoxGeometry(2.4, 0.05, 1.1), wood, TABLE.x, 0.76, TABLE.z);
  for (const [a, b] of [[-1.1, -0.48], [1.1, -0.48], [-1.1, 0.48], [1.1, 0.48]]) put(new THREE.CylinderGeometry(0.03, 0.03, 0.74, 10), M.steel, TABLE.x + a, 0.37, TABLE.z + b);
  const roomL = new THREE.PointLight(0xffe6c2, 0, 0, 2); roomL.position.set(TABLE.x, 3.0, TABLE.z); world.add(roomL); lamps.push({ l: roomL, inten: 16, kind: 'room' });
  put(new THREE.CylinderGeometry(0.35, 0.45, 0.25, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.5, side: THREE.DoubleSide }), TABLE.x, 3.2, TABLE.z);
  const mesa = group('mesa');
  CR.mesa = [];
  const SEATS = [[-0.7, 0.97], [0.7, 0.97], [-0.7, -0.97], [0.7, -0.97]];
  const LOOK = [{ skin: 0xd0a07c, hair: 0x2b1e15 }, { skin: 0xe2b896, cap: true }, { skin: 0x9a6a48, hair: 0x15100c }, { skin: 0xc79474, hair: 0x6b4a2a, shirt: 0x6e1f22 }];
  SEATS.forEach(([a, b], i) => { const x = TABLE.x + a, z = TABLE.z + b; chair(x, z, x, TABLE.z, mesa); CR.mesa.push(crewAt(x, z, x, TABLE.z, { sit: true, ...LOOK[i] }, mesa)); });
  // desayuno: tazas, cafetera, tostadas, zumo
  const des = group('des'), cena = group('cena'), est = group('est');
  SEATS.forEach(([a, b], i) => {
    const x = TABLE.x + a * 0.95, z = TABLE.z + b * 0.33;
    put(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 16), new THREE.MeshStandardMaterial({ color: [0xffffff, 0xd94a2a, 0x2a6ad9, 0xe0b020][i], roughness: 0.35 }), x + 0.12, 0.84, z, des);
    put(new THREE.CylinderGeometry(0.11, 0.09, 0.015, 24), new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.3 }), x - 0.1, 0.795, z, des);
    put(new THREE.BoxGeometry(0.11, 0.015, 0.09), new THREE.MeshStandardMaterial({ color: 0xc89048, roughness: 0.8 }), x - 0.1, 0.81, z, des);
    put(new THREE.CylinderGeometry(0.15, 0.12, 0.02, 24), new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.3 }), x, 0.795, z, cena);
    put(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 16), new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.6 }), x + 0.2, 0.85, z - 0.06 * Math.sign(b), cena);
  });
  put(new THREE.CylinderGeometry(0.075, 0.09, 0.24, 20), new THREE.MeshStandardMaterial({ color: 0x23262b, metalness: 0.6, roughness: 0.3 }), TABLE.x - 0.2, 0.9, TABLE.z, des);
  put(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 18), new THREE.MeshPhysicalMaterial({ color: 0xffa020, roughness: 0.2, transparent: true, opacity: 0.85 }), TABLE.x + 0.25, 0.88, TABLE.z + 0.05, des);
  put(new THREE.CylinderGeometry(0.22, 0.2, 0.02, 28), new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.3 }), TABLE.x, 0.795, TABLE.z, cena);
  put(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0xe8b84a, roughness: 0.7 }), TABLE.x, 0.835, TABLE.z, cena);   // tortilla
  put(new THREE.CapsuleGeometry(0.06, 0.4, 6, 12), new THREE.MeshStandardMaterial({ color: 0xc8904a, roughness: 0.8 }), TABLE.x - 0.55, 0.84, TABLE.z + 0.05, cena).rotation.z = Math.PI / 2;
  put(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 16), new THREE.MeshPhysicalMaterial({ color: 0x8fc8ff, roughness: 0.05, transparent: true, opacity: 0.7 }), TABLE.x + 0.5, 0.93, TABLE.z, cena);
  // estudio: temario, libros abiertos, flexo
  const page = canvasTex(512, 340, (x) => {
    x.fillStyle = '#f6f3ea'; x.fillRect(0, 0, 512, 340); x.fillStyle = '#d9d4c6'; x.fillRect(254, 0, 4, 340);
    x.fillStyle = '#a41c22'; x.font = '400 30px Bebas'; x.fillText('TEMA 12 · HIDRÁULICA', 22, 40);
    for (let i = 0; i < 13; i++) { x.fillStyle = '#7c7c80'; x.fillRect(22, 62 + i * 20, 200 - rnd(i) * 60, 5); x.fillRect(278, 30 + i * 22, 210 - rnd(i * 3) * 70, 5); }
    x.fillStyle = 'rgba(255,230,40,0.55)'; x.fillRect(18, 118, 190, 14); x.fillRect(274, 140, 170, 14);
  });
  [[0, 0], [3, 0]].forEach(([i]) => { const [a, b] = SEATS[i]; const pg = put(new THREE.PlaneGeometry(0.46, 0.3), new THREE.MeshStandardMaterial({ map: page, color: 0xcfcac0, roughness: 0.85 }), TABLE.x + a * 0.95, 0.79, TABLE.z + b * 0.25, est); pg.rotation.set(-Math.PI / 2, 0, b > 0 ? 0 : Math.PI); });
  for (let k = 0; k < 4; k++) put(new THREE.BoxGeometry(0.3, 0.06, 0.22), new THREE.MeshStandardMaterial({ color: [0x2a4a8a, 0x8a2a2a, 0x2a7a4a, 0xd0c090][k], roughness: 0.6 }), TABLE.x + 0.15, 0.815 + k * 0.062, TABLE.z - 0.05, est).rotation.y = (rnd(k) - 0.5) * 0.3;
  { const hl = put(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0xffe020, roughness: 0.4 }), TABLE.x - 0.48, 0.805, TABLE.z + 0.2, est); hl.rotation.set(0, 0.7, Math.PI / 2); }
  put(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 20), M.black, TABLE.x + 0.75, 0.79, TABLE.z - 0.1, est);
  put(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 8), M.black, TABLE.x + 0.75, 1.0, TABLE.z - 0.1, est);
  put(new THREE.ConeGeometry(0.1, 0.12, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x1f2a44, roughness: 0.5, side: THREE.DoubleSide }), TABLE.x + 0.62, 1.2, TABLE.z - 0.1, est).rotation.z = 0.9;
  const deskL = new THREE.PointLight(0xffd29a, 0, 0, 2); deskL.position.set(TABLE.x + 0.55, 1.12, TABLE.z - 0.1); world.add(deskL); lamps.push({ l: deskL, inten: 1.6, kind: 'desk' });
  // gimnasio
  const gym = group('gym');
  put(new THREE.BoxGeometry(4.2, 0.03, 3.2), new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.95 }), TABLE.x, 0.075, -11.7, gym);
  for (const x of [-1.05, 1.05]) put(new THREE.BoxGeometry(0.08, 2.3, 0.08), M.black, TABLE.x + x, 1.15, -12.6, gym);
  put(new THREE.BoxGeometry(2.2, 0.06, 0.06), M.steel, TABLE.x, 2.25, -12.6, gym);
  for (let k = 0; k < 4; k++) put(new THREE.CylinderGeometry(0.22 - k * 0.03, 0.22 - k * 0.03, 0.05, 24), M.black, TABLE.x + 1.7, 0.1 + k * 0.055, -12.2, gym);
  put(new THREE.BoxGeometry(0.4, 0.42, 1.2), new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6 }), TABLE.x - 1.7, 0.25, -11.6, gym);
  CR.gym = crewAt(TABLE.x, -11.4, TABLE.x, 0, { skin: 0xc28a66, hair: 0x1a120c, shirt: 0x2b2f38 }, gym);
  const bar = new THREE.Group(); CR.gym.add(bar); CR.gym.userData.bar = bar;
  put(new THREE.CylinderGeometry(0.018, 0.018, 1.7, 12), M.chrome, 0, 0, 0, bar).rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) put(new THREE.CylinderGeometry(0.22 - k * 0.04, 0.22 - k * 0.04, 0.05, 28), new THREE.MeshStandardMaterial({ color: k ? 0xb81c22 : 0x1b4fb0, roughness: 0.5 }), s * (0.62 + k * 0.055), 0, 0, bar).rotation.z = Math.PI / 2;
  // relevo: tres que salen (izquierda) y tres que entran (derecha)
  const rel = group('relevo');
  FF.relevo = [];
  for (let i = 0; i < 6; i++) {
    const out = i < 3, z = 5.8 + (i % 3) * 1.2, x = out ? -1.7 : 1.7;
    const f = ffAt(x, z, out ? 10 : -10, z + (i % 3 - 1) * 0.6, rel);
    f.userData.rel = [f.position.x, f.position.z, f.rotation.y]; f.userData.line = [-3.75 + i * 1.5, 9.2, Math.PI];
    FF.relevo.push(f);
  }
  // revisión: el bombero junto a la autobomba 1 (de espaldas a la cámara del plano de la botella)
  const rev = group('rev');
  FF.rev = ffAt(-6.0, -5.6, -9, -5.6, rev); FF.revAir = AIRS[AIRS.length - 1];
  // prácticas en la torre: lanza + segundo bombero + manguera
  const pr_ = group('pract');
  FF.p1 = ffAt(15.0, 3.6, 17.4, -5.5, pr_); FF.p2 = ffAt(14.1, 4.7, 17.0, -5.5, pr_);
  const L1 = lanceFor(FF.p1, 0.42, pr_);
  J.pract = waterJet(520, { v0: 12.5, drag: 0.25, size: 0.1, grow: 0.3, spreadA: 0.04, spreadB: 0.08, opacity: 0.6, seed: 81, life: 1.4 });
  J.pract.at(L1.tip.x, L1.tip.y, L1.tip.z); J.pract.u.uDir.value.copy(L1.dir); pr_.add(J.pract.mesh);
  pr_.add(hoseMesh([L1.base, V(14.4, 0.95, 4.35), V(13.7, 0.08, 5.6), V(11.5, 0.08, 6.6), V(9.0, 0.08, 4.2), V(8.4, 0.08, 0.8)]).mesh);
  // limpiar el material: lavar la autobomba 1
  const limp = group('limp');
  FF.limp = ffAt(-5.5, -1.3, -7.3, -3.95, limp);
  const L2 = lanceFor(FF.limp, -0.32, limp);
  J.limp = waterJet(380, { v0: 6.5, drag: 0.6, size: 0.07, grow: 0.25, spreadA: 0.08, spreadB: 0.16, opacity: 0.5, seed: 33, life: 0.7 });
  J.limp.at(L2.tip.x, L2.tip.y, L2.tip.z); J.limp.u.uDir.value.copy(L2.dir); limp.add(J.limp.mesh);
  limp.add(hoseMesh([L2.base, V(-5.2, 0.5, -0.6), V(-4.9, 0.08, 0.6), V(-3.6, 0.08, 3.0), V(-1.0, 0.08, 4.0)]).mesh);
  // gancho («time-lapse»): tres bomberos que cambian de sitio según la hora
  const tl = group('tl');
  FF.tl = [0, 1, 2].map(i => ffAt(0, 30 + i, 0, 0, tl));
  // a casa: uno de la guardia saliente, con la mochila
  const wk = group('walker');
  CR.walker = crewAt(1.2, 2.0, 2.4, 9.5, { bag: true, skin: 0xd8aa86, hair: 0x3a2a1c, shirt: 0x39414f, pants: 0x2b3a55 }, wk);
}

// ------------------------------------------------------------------ la calle de la vivienda (reconocimiento y fuego)
function buildCity() {
  const Z = CITY_Z, walk = new THREE.MeshStandardMaterial({ color: 0xa9a59c, roughness: 0.9 });
  put(new THREE.BoxGeometry(280, 0.14, 2.6), walk, -30, 0.07, Z - 4.7);
  put(new THREE.BoxGeometry(280, 0.14, 2.6), walk, -30, 0.07, Z + 4.7);
  for (let i = 0; i < 54; i++) put(new THREE.BoxGeometry(2.6, 0.012, 0.15), LINE(), -168 + i * 5.2, 0.012, Z);
  for (let k = 0; k < 7; k++) put(new THREE.BoxGeometry(0.5, 0.012, 6.4), LINE(), -31 + k * 0.9, 0.013, Z);
  for (let i = 0; i < 24; i++) {
    const x = -150 + i * 11;
    if (i === 20) cityBld(10, 18, 10, x, Z - 11, 777, 0, (r, c) => (r === 2 && (c === 1 || c === 2)) || (r === 3 && c === 2));
    else cityBld(10, 12 + rnd(i * 2.3) * 16, 10, x, Z - 11, 300 + i);
    cityBld(10, 10 + rnd(i * 4.1) * 14, 10, x, Z + 11, 340 + i, Math.PI);
  }
  cityBld(14, 26, 10, -162, Z, 399, Math.PI / 2);
  for (let k = 0; k < 12; k++) { const x = -140 + k * 22; tree(x, Z - 4.4, 0.9); tree(x + 11, Z + 4.4, 0.9); lamp(x + 11, Z - 4.9); lamp(x, Z + 4.9); }
  for (const x of [-12, 40]) hydrant(x, Z - 4.1);
  FIRE.ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 48), new THREE.MeshBasicMaterial({ color: 0x48d6ff, transparent: true, opacity: 0, depthWrite: false }));
  FIRE.ring.rotation.x = -Math.PI / 2; FIRE.ring.position.set(-12, 0.16, Z - 4.1); world.add(FIRE.ring);
  [[-62, 0xd8d8d0, 1], [-41, 0x2a5ad0, -1], [-18, 0x3c3c40, 1], [9, 0xa01818, 1], [27, 0xd8d8d0, -1], [52, 0x2f6a3a, 1]].forEach(([x, col, d]) => { const c = makeCar(col); c.position.set(x, 0, Z + 2.3); c.rotation.y = d > 0 ? 0 : Math.PI; });
  TR.recon = truckAt(14, Z - 1.9, -1, 0);
  // el fuego en el segundo piso del edificio de x = 70
  const fx = 70, fz = Z - 6 + 0.12;
  FIRE.house = fireSet(world, V(fx, 7.1, fz), tongues(9, 91, (i, r) => { const w = i < 4 ? fx - 1.25 : i < 8 ? fx + 1.25 : fx + 1.25; const y = i < 8 ? 6.95 : 9.95; return [w - 0.6 + (i % 4) * 0.4 + (r(1) - 0.5) * 0.2, y + r(2) * 0.3, fz + r(5) * 0.15, 0.7 + 0.35 * r(3), 1.9 + 1.3 * r(4)]; }),
    { seed: 91, extent: [2.6, 0.6, 0.3], smokeN: 46, smokeSize: 2.6, smokeY: 3.2, emberN: 60, bright: 1.6 });
  FIRE.houseL = new THREE.PointLight(0xff6a1a, 0, 0, 2); FIRE.houseL.position.set(fx, 8.2, Z - 2.4); world.add(FIRE.houseL);
  TR.casa = truckAt(60.5, Z - 2.0, 1, 0);
  const cs = group('casaFF');
  FF.c1 = ffAt(68.4, Z - 2.7, 69.3, Z - 6, cs); FF.c2 = ffAt(67.0, Z - 1.9, 69.0, Z - 6, cs);
  const L = lanceFor(FF.c1, 1.25, cs);
  J.casa = waterJet(640, { v0: 13.5, drag: 0.3, size: 0.13, grow: 0.35, spreadA: 0.04, spreadB: 0.09, opacity: 0.72, seed: 57, life: 1.3 });
  J.casa.at(L.tip.x, L.tip.y, L.tip.z); J.casa.u.uDir.value.copy(L.dir); cs.add(J.casa.mesh);
  cs.add(hoseMesh([L.base, V(67.3, 0.95, Z - 2.2), V(66.6, 0.08, Z - 1.2), V(65.2, 0.08, Z - 0.6), V(63.6, 0.9, Z - 0.75)]).mesh);
}

// ------------------------------------------------------------------ el accidente (por la tarde)
function buildAccident() {
  const Z = ACC_Z, walk = new THREE.MeshStandardMaterial({ color: 0xa9a59c, roughness: 0.9 });
  put(new THREE.BoxGeometry(160, 0.14, 2.8), walk, 0, 0.07, Z - 9.7); put(new THREE.BoxGeometry(160, 0.14, 2.8), walk, 0, 0.07, Z + 9.7);
  for (let i = 0; i < 30; i++) put(new THREE.BoxGeometry(2.6, 0.012, 0.15), LINE(), -75 + i * 5.2, 0.012, Z);
  for (let i = 0; i < 12; i++) { const x = -60 + i * 11; cityBld(10, 10 + rnd(i * 3.3) * 12, 10, x, Z - 16, 500 + i); cityBld(10, 9 + rnd(i * 5.7) * 11, 10, x, Z + 16, 540 + i, Math.PI); }
  for (let k = 0; k < 6; k++) { tree(-50 + k * 22, Z - 9.4, 0.9); tree(-39 + k * 22, Z + 9.4, 0.9); }
  const c1 = makeCar(0x2a5ad0); c1.position.set(-1.1, 0, Z + 0.2); c1.rotation.y = 0.22;
  const c2 = makeCar(0xd8d8d0); c2.position.set(2.15, 0, Z + 2.5); c2.rotation.y = -Math.PI / 2 + 0.45; c2.rotation.z = 0.02;
  TR.acc = truckAt(-11.5, Z - 1.6, 1, 0);
  const a = group('accFF');
  FF.a1 = ffAt(0.7, Z + 1.75, -0.2, Z + 0.6, a); FF.a2 = ffAt(-2.6, Z + 1.9, -1.6, Z + 0.7, a); FF.a3 = ffAt(-5.4, Z + 2.6, 0, Z + 1, a);
  for (const [x, z] of [[4.2, Z + 4.6], [5.8, Z + 2.2], [6.6, Z - 0.6], [-6.5, Z + 4.4], [-8.2, Z + 3.0]]) cone(x, z);
  const tri = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.3, 3), new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0x551008, side: THREE.DoubleSide })); tri.position.set(9.5, 0.33, Z + 1.0); tri.rotation.set(0, -Math.PI / 2, Math.PI / 2); world.add(tri);
  for (let i = 0; i < 50; i++) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0xcfe6ff, metalness: 0.9, roughness: 0.05 })); sh.rotation.set(-Math.PI / 2, 0, rnd(i * 7) * 3); sh.position.set(0.9 + (rnd(i) - 0.5) * 2.6, 0.03, Z + 1.4 + (rnd(i * 3) - 0.5) * 2.2); world.add(sh); }
  FIRE.steam = new Parts(40, { life: 2.6, rise: 0.5, acc: 0.05, size: 0.5, grow: 1.6, turb: 0.3, conv: 0.1, rot: 6.28, opacity: 0.28, c: [[0.85, 0.86, 0.88], [0.75, 0.76, 0.78], [0.65, 0.66, 0.68], [0.55, 0.56, 0.58]], seed: 13, extent: [0.5, 0.1, 0.4], order: 11 });
  FIRE.steam.at(0.75, 1.0, Z + 0.65); world.add(FIRE.steam.mesh);
}

// ------------------------------------------------------------------ el contenedor (de noche)
function buildContainer() {
  const Z = CONT_Z, walk = new THREE.MeshStandardMaterial({ color: 0xa9a59c, roughness: 0.9 });
  put(new THREE.BoxGeometry(120, 0.14, 2.8), walk, 0, 0.07, Z - 5.6); put(new THREE.BoxGeometry(120, 0.14, 2.8), walk, 0, 0.07, Z + 7.2);
  for (let i = 0; i < 10; i++) { const x = -50 + i * 11; cityBld(10, 12 + rnd(i * 7.7) * 14, 10, x, Z - 12, 600 + i); cityBld(10, 11 + rnd(i * 2.9) * 12, 10, x, Z + 13.6, 640 + i, Math.PI); }
  for (const [x, col] of [[0, 0x2f5a2a], [2.3, 0x2050a0], [4.6, 0xd0b020]]) put(new RoundedBoxGeometry(1.9, 1.35, 1.2, 3, 0.08), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }), x, 0.72, Z - 3.6);
  FIRE.cont = fireSet(world, V(0, 1.4, Z - 3.6), tongues(6, 71, (i, r) => [-0.75 + i * 0.3 + (r(1) - 0.5) * 0.1, 1.4, Z - 3.6 + (r(2) - 0.5) * 0.5, 0.6 + 0.3 * r(3), 1.6 + 1.1 * r(4)]),
    { seed: 71, extent: [0.8, 0.2, 0.5], smokeN: 30, smokeSize: 1.7, smokeY: 2.4, emberN: 50, bright: 1.5 });
  FIRE.contL = new THREE.PointLight(0xff6a1a, 0, 0, 2); FIRE.contL.position.set(0, 3, Z - 2.0); world.add(FIRE.contL);
  TR.cont = truckAt(-11, Z + 1.0, 1, 0);
  const k = group('contFF');
  FF.k1 = ffAt(-3.0, Z + 0.3, 0, Z - 3.6, k);
  const L = lanceFor(FF.k1, 0.1, k);
  J.cont = waterJet(460, { v0: 9.5, drag: 0.35, size: 0.09, grow: 0.3, spreadA: 0.05, spreadB: 0.1, opacity: 0.6, seed: 23, life: 1.0 });
  J.cont.at(L.tip.x, L.tip.y, L.tip.z); J.cont.u.uDir.value.copy(L.dir); k.add(J.cont.mesh);
  k.add(hoseMesh([L.base, V(-3.6, 0.6, Z + 0.9), V(-4.6, 0.08, Z + 1.6), V(-6.2, 0.08, Z + 2.6), V(-7.6, 0.9, Z + 2.4)]).mesh);
  lamp(-8, Z - 5.9, true); lamp(9, Z - 5.9, true); lamp(26, Z - 5.9);
}

function buildWorld() {
  LEAF = new THREE.MeshStandardMaterial({ color: 0x4d7a3a, roughness: 0.9, flatShading: true });
  LEAF2 = new THREE.MeshStandardMaterial({ color: 0x5d8a42, roughness: 0.9, flatShading: true });
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#1b1c20'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 22 + rnd(i) * 28; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(160, 160);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ map: asph, color: 0xa4a4a4, roughness: 0.75, metalness: 0.05 }));
  ground.rotation.x = -Math.PI / 2; ground.position.z = 60; ground.receiveShadow = true; world.add(ground);
  hemi = new THREE.HemisphereLight(0x9ab8e0, 0x2a2018, 0.6); world.add(hemi);
  sun = new THREE.DirectionalLight(0xfff2dd, 1.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 320 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  world.add(sun); world.add(sun.target);
  makeSky();
  buildStation(); buildCity(); buildAccident(); buildContainer();
}

// ------------------------------------------------------------------ planos (cortes secos), reloj y luz según la hora
let T = {}, SH = [];
function shot(t0, a, b, h0, h1, tag, o = {}) { SH.push({ t0, a, b, h0, h1, tag, ...o }); }
const reconX = (s, t) => mx(16, -14, pr(t, s.t0, shotEnd(s) - s.t0));
const walkP = (s, t) => { const u = pr(t, s.t0 - 0.2, shotEnd(s) - s.t0 + 0.6); return V(mx(1.2, 2.5, u), 0, mx(2.0, 9.0, u)); };
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  SH = [];
  shot(0, [3.0, 0.7, 15.5, 1.5, 5.6, -5, 66], [2.6, 0.8, 13.0, 1.5, 5.3, -5, 62], 8.0, 32.0, 'hook');
  shot(T.l2 - 0.15, [-9.2, 1.45, 15.5, -0.2, 1.5, 7.1, 40], [-6.8, 1.55, 13.8, 0, 1.4, 7.2, 40], 8.0, 8.05, 'relevo');
  shot(T.revision - 0.1, [-4.95, 1.95, 2.6, -7.4, 1.45, -6.5, 44], [-5.0, 1.75, 1.3, -7.5, 1.35, -7.2, 44], 8.25, 8.3, 'rev');
  shot(T.mangueras - 0.12, [-5.2, 1.1, 4.7, -7.3, 0.25, 1.9, 40], [-5.6, 0.95, 4.1, -7.3, 0.25, 1.9, 38], 8.32, 8.35, 'mang');
  shot(T.aire - 0.3, [-4.95, 1.42, -4.7, -5.75, 1.2, -5.6, 38], [-5.0, 1.32, -4.95, -5.75, 1.2, -5.6, 33], 8.38, 8.4, 'bot');
  shot(T.desayuno - 0.1, [11.0, 2.55, -2.5, 8.35, 0.8, -6.2, 40], [10.6, 2.3, -3.0, 8.35, 0.8, -6.2, 40], 9.0, 9.1, 'desayuno');
  shot(T.entrenar - 0.45, [14.4, 1.7, 10.6, 16.4, 2.8, -2.0, 48], [14.6, 1.8, 9.8, 16.4, 2.9, -2.0, 48], 10.3, 10.5, 'pract');
  shot(T.mediodia - 0.1, [9, 2.6, 2.6, -6, 1.6, 0.4, 44], [8, 2.4, 2.6, -6, 1.6, 0.6, 44], 12.0, 12.3, 'recon', { fol: (s, t) => V(reconX(s, t), 0, CITY_Z - 1.9) });
  shot(T.salida - 0.08, [5.4, 1.0, 9.6, 0, 1.8, -0.5, 46], [5.0, 1.0, 10.2, 0, 1.9, 1.5, 48], 13.75, 13.77, 'salida');
  shot(T.incendio - 0.1, [64.0, 1.6, CITY_Z + 5.5, 68.9, 5.2, CITY_Z - 4.5, 62], [64.3, 1.55, CITY_Z + 5.2, 68.9, 5.4, CITY_Z - 4.5, 60], 13.85, 13.95, 'casa');
  shot(T.tarde - 0.1, [9.5, 3.0, ACC_Z + 9.6, -1.2, 0.8, ACC_Z + 0.9, 40], [8.3, 2.6, ACC_Z + 8.6, -1.2, 0.8, ACC_Z + 0.9, 40], 17.3, 17.4, 'acc');
  shot(T.vuelta - 0.1, [-9, 0.9, 15, -1, 4.5, -2, 54], [-8, 1.0, 13.5, -1, 4.3, -2, 52], 19.45, 19.5, 'vuelta');
  shot(T.limpiar - 0.1, [-2.6, 1.9, 5.2, -6.4, 1.0, -2.4, 44], [-2.9, 1.8, 4.6, -6.4, 1.0, -2.4, 44], 19.6, 19.7, 'limpiar');
  shot(T.entrenar2 - 0.1, [9.7, 1.55, -8.0, 8.35, 1.45, -11.4, 42], [9.5, 1.5, -8.5, 8.35, 1.45, -11.4, 42], 20.1, 20.2, 'pesas');
  shot(T.estudiar - 0.12, [7.744, 1.818, -5.466, 7.72, 0.79, -5.98, 42], [7.74, 1.76, -5.5, 7.72, 0.79, -5.98, 41], 20.6, 20.7, 'estudiar');
  shot(T.cenar - 0.1, [5.7, 2.45, -2.9, 8.4, 0.8, -6.3, 40], [6.0, 2.25, -3.4, 8.4, 0.8, -6.3, 40], 21.3, 21.4, 'cenar');
  shot(T.once - 0.1, [4.5, 2.0, CONT_Z + 10.5, -1.2, 1.2, CONT_Z - 2.0, 46], [3.8, 1.8, CONT_Z + 9.4, -1.2, 1.2, CONT_Z - 2.0, 46], 23.0, 23.1, 'cont');
  shot(T.madrugada - 0.1, [11, 1.0, 26, 1, 6.5, -4, 56], [9, 1.1, 22, 1, 6.2, -4, 54], 3.5, 3.6, 'noche');
  shot(T.camiones2 - 0.2, [2.3, 1.55, 1.2, 2.2, 1.25, -5.6, 44], [2.4, 1.45, 0.4, 2.2, 1.2, -5.8, 42], 3.6, 3.65, 'listos');
  shot(T.ocho2 - 0.1, [9.2, 1.45, 15.2, 0.2, 1.5, 7.1, 40], [6.9, 1.55, 13.6, 0, 1.4, 7.2, 40], 8.0, 8.02, 'relevo2');
  shot(T.veinti2 - 0.1, [0.7, 1.55, -3.4, 0, 1.2, 4, 46], [0.8, 1.6, -3.6, 0, 1.25, 4, 46], 8.05, 8.12, 'casa2', { fol: (s, t) => walkP(s, t) });
  shot(T.ser - 0.1, [0, 2.2, 27, 0, 3.5, 4, 46], [0, 12, 42, 0, 3.0, 0, 46], 8.15, 8.2, 'ser');
  shot(T.compartir - 0.3, [0, 12, 42, 0, 3.0, 0, 46], [0, 18, 54, 0, 3.0, -2, 46], 8.2, 8.25, 'fin');
}
function curShot(t) { let s = SH[0]; for (const x of SH) if (t >= x.t0) s = x; return s; }
function shotEnd(s) { const i = SH.indexOf(s); return i + 1 < SH.length ? SH[i + 1].t0 : T.end; }
const _m = new THREE.Matrix4();
function pose(p, tgt, fov) { _m.lookAt(p, tgt, V(0, 1, 0)); return { p: p.clone(), q: new THREE.Quaternion().setFromRotationMatrix(_m), fov, focus: p.distanceTo(tgt), ap: 0, tgt }; }
function camAt(t) {
  const s = curShot(t), k = pr(t, s.t0, shotEnd(s) - s.t0), u = e3(k) * 0.8 + k * 0.2;
  const v = s.a.map((a, i) => mx(a, s.b[i], u));
  const off = s.fol ? s.fol(s, t) : V(0, 0, 0);
  return pose(V(v[0], v[1] + 0.025 * Math.sin(t * 1.3), v[2]).add(off), V(v[3], v[4], v[5]).add(off), v[6]);
}
function hourAt(t) { const s = curShot(t), u = pr(t, s.t0, shotEnd(s) - s.t0); return mx(s.h0, s.h1, u); }
const hmod = h => ((h % 24) + 24) % 24;
const SKYN = C(0x070c1a), SKYD = C(0x8db3db), SKYG = C(0xe6a468), SKYT = C(0x34446e);
function sunState(h) {
  h = hmod(h);
  const alt = (h > 7.3 && h < 19.0) ? Math.sin(Math.PI * (h - 7.3) / 11.7) : 0;
  const light = sm(6.6, 7.8, h) * (1 - sm(18.7, 19.9, h));
  const day = light * (0.5 + 0.5 * cl(alt * 2.2));
  const gold = light * cl(1.25 - alt * 1.6);
  return { h, alt, light, day, gold, az: Math.PI * cl((h - 7.3) / 11.7) };
}
function setLight(S, center) {
  const tw = cl(S.light * 3) * (1 - S.day);
  const top = C(0x03060f).lerp(C(0x1c2a52), tw).lerp(C(0x4a82c4), S.day).lerp(C(0x6a88bc), S.gold * 0.4);
  const hor = C(0x0c1430).lerp(C(0x9a6070), tw).lerp(C(0xb4d0ea), S.day).lerp(C(0xf0b07a), S.gold * 0.7);
  sky.dome.uTop.value.copy(top); sky.dome.uHor.value.copy(hor);
  scene.background.copy(hor); scene.fog.color.copy(hor);
  scene.fog.density = mx(0.008, 0.0026, S.day);
  hemi.intensity = 0.2 + 0.78 * S.day; hemi.color.copy(C(0x9ab8e0)).lerp(C(0xffc890), S.gold * 0.5);
  const sd = S.alt > 0 ? V(Math.cos(S.az), 0.05 + 1.15 * S.alt, 0.75 * Math.sin(S.az) + 0.2).normalize() : V(-0.4, 0.8, 0.45).normalize();
  sun.position.copy(center).addScaledVector(sd, 140); sun.target.position.copy(center); sun.target.updateMatrixWorld();
  sky.dome.uSun.value.copy(sd); sky.dome.uSunA.value = S.alt > 0 ? (0.25 + 0.9 * S.gold) * S.light : 0;
  sun.intensity = S.alt > 0 ? (0.15 + 2.2 * cl(S.alt * 2.4)) * S.light : 0.25;
  sun.color.copy(S.alt > 0 ? C(0xfff2dd).lerp(C(0xff9a50), S.gold * 0.7) : C(0x9bb4ff));
  finMat.uniforms.uExp.value = mx(1.3, 0.74, S.day);
  scene.environmentIntensity = 0.12 + 0.42 * S.day;
  const n = cl(1 - S.light * 1.6); sky.stars.material.opacity = n; moon.material.opacity = n;
  return 1 - S.light;
}
const EMS = { t1: ['rev'], t2: ['salida'], casa: ['casa'], acc: ['acc'], cont: ['cont'], recon: [] };
const VIS = { relevo: ['relevo', 'relevo2', 'ser', 'fin'], rev: ['rev', 'mang', 'bot'], mesa: ['desayuno', 'cenar', 'estudiar'], des: ['desayuno'], cena: ['cenar'], est: ['estudiar'],
  gym: ['pesas'], pract: ['pract'], limp: ['limpiar'], walker: ['casa2'], tl: ['hook'], casaFF: ['casa'], accFF: ['acc'], contFF: ['cont'] };
const TLS = [       // [h0, h1, x, z, mira x, mira z]
  [[8.0, 9.6, -2.5, 4.0, 2, 4], [10.2, 11.0, -6.2, 3.4, -7.4, 2.0], [13.3, 15.5, 1.8, 3.0, 0, -2], [16.0, 18.4, 14.6, 3.8, 17.4, -5.5], [31.3, 32.1, -1.7, 6.0, 5, 6]],
  [[8.0, 9.6, -1.4, 5.0, 2, 4], [9.8, 12.2, 6.2, 2.0, 8.35, -6.2], [14.0, 17.0, -6.0, -1.0, -8, -4], [19.5, 21.0, 3.0, 2.0, 0, -5], [31.3, 32.1, 1.7, 6.0, -5, 6]],
  [[8.5, 10.0, -5.6, -0.6, -7, -3], [12.8, 14.5, 4.2, 6.0, 0, 0], [17.0, 19.0, -3.0, 8.0, 0, 20], [21.5, 22.8, 6.0, 1.0, 0, 0], [31.3, 32.1, -1.7, 7.2, 5, 7.2]],
];
function t1Hook(h) { return sm(16.2, 16.55, h) * (1 - sm(17.6, 17.95, h)); }
function t2Hook(h) {                       // la autobomba 2 sale y vuelve en el «time-lapse» del gancho
  const out = (a, b) => sm(a, a + 0.35, h) * (1 - sm(b, b + 0.35, h));
  return Math.max(out(9.2, 10.6), out(23.0, 24.6));
}
function update(t) {
  const P = camAt(t), s = curShot(t), h = hourAt(t), tag = s.tag;
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => f.u.uCam.value.copy(cam.position));
  sky.position.copy(cam.position);
  const night = setLight(sunState(h), P.tgt);
  facades.forEach(m => { m.emissiveIntensity = 1.2 * night; });
  for (const L of lamps) {
    let k = night;
    if (L.kind === 'bay') k = tag === 'noche' ? 0.25 : tag === 'listos' ? 0.55 : 0.35 + 0.65 * night;
    if (L.kind === 'room') k = ['desayuno', 'cenar', 'pesas'].includes(tag) ? 1 : tag === 'estudiar' ? 0.5 : 0.25;
    if (L.kind === 'desk') k = tag === 'estudiar' ? 0.8 : 0;
    if (L.l) L.l.intensity = L.inten * k;
    if (L.bulb) L.bulb.material.color.setScalar(L.kind === 'street' ? 0.6 + 2.4 * night : 1 + 1.5 * k);
  }
  for (const [name, tags] of Object.entries(VIS)) GR[name].visible = tags.includes(tag);
  // la mesa: los cuatro en desayuno y cena; dos estudiando
  CR.mesa.forEach((c, i) => { c.visible = tag !== 'estudiar' || i === 3; c.userData.arms.forEach((a, j) => { const k = Math.max(0, Math.sin(t * (1.3 + i * 0.27) + i * 2.1 + j * 1.7)); a.rotation.x = 0.45 + 0.25 * k * (j ? 1 : 0.3); a.userData.el.rotation.x = 1.2 + 0.45 * k * (j ? 1 : 0.3); a.rotation.z = 0.1 * (j ? 1 : -1); }); });
  // gimnasio: press por encima de la cabeza
  { const g2 = CR.gym.userData, a = 1.95 + 1.1 * (0.5 - 0.5 * Math.cos(t * 2 * Math.PI / 1.5));
    g2.arms.forEach((p, j) => { p.rotation.x = a; p.rotation.z = 0.3 * (j ? 1 : -1); });
    g2.bar.position.set(0, g2.hipY + 0.53 - 0.53 * Math.cos(0.3) * Math.cos(a), -0.53 * Math.cos(0.3) * Math.sin(a)); }
  // a casa: camina
  if (tag === 'casa2') { const w = CR.walker, p = walkP(s, t), ph = t * 2 * Math.PI * 0.95; w.position.copy(p); yawTo(w, p.x + 0.17, p.z + 1);
    w.userData.legs.forEach((l, j) => { l.rotation.x = 0.42 * Math.sin(ph + j * Math.PI); }); w.userData.arms.forEach((a, j) => { a.rotation.x = 0.35 * Math.sin(ph + (1 - j) * Math.PI); a.userData.el.rotation.x = 0.3; a.rotation.z = 0.08 * (j ? 1 : -1); });
    w.position.y = 0.025 * Math.abs(Math.sin(ph)); }
  // relevo o foto final delante del parque
  const line = tag === 'ser' || tag === 'fin';
  FF.relevo.forEach(f => { const [x, z, r] = line ? f.userData.line : f.userData.rel; f.position.set(x, 0, z); f.rotation.y = r; });
  // autobombas
  for (const k of ['t1', 't2']) { TR[k].position.copy(TR[k].userData.home); TR[k].visible = true; }
  let t2em = false;
  let t1em = false;
  if (tag === 'hook') { const o = t2Hook(h), o1 = t1Hook(h); TR.t2.position.z = -6.5 + 20 * o; t2em = o > 0.02 && o < 0.98; TR.t1.position.z = -6.5 + 20 * o1; t1em = o1 > 0.02 && o1 < 0.98; TR.t2.visible = o < 0.97; TR.t1.visible = o1 < 0.97;
    FF.tl.forEach((f, i) => { const e = TLS[i].find(q => h >= q[0] && h < q[1]); f.visible = !!e; if (e) { f.position.set(e[2], 0, e[3]); yawTo(f, e[4], e[5]); } }); }
  if (tag === 'salida') { const u = pr(t, s.t0 + 0.05, shotEnd(s) - s.t0); TR.t2.position.z = -6.5 + 15 * u * u; }
  if (tag === 'vuelta') { const u = pr(t, s.t0 - 0.3, shotEnd(s) - s.t0 + 0.2); TR.t2.position.z = mx(9.5, -6.5, 1 - Math.pow(1 - u, 2.2)); }
  if (line) { TR.t1.position.set(-4.3, 0, 3.0); TR.t2.position.set(4.3, 0, 3.0); }
  TR.recon.position.x = tag === 'recon' ? reconX(s, t) : 16;
  // rotativos
  const ph = (t * 2.6) % 1, flash = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  for (const [k, tr] of Object.entries(TR)) {
    const em = (EMS[k] || []).includes(tag) || (k === 't2' && t2em) || (k === 't1' && t1em) ? 1 : 0, on = em * flash;
    tr.userData.lbar.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j % 2 ? 0.4 : 1)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
    tr.userData.pl.intensity = em * (8 + 45 * on);
  }
  // fuegos, chorros, vapor
  for (const F of [FIRE.house, FIRE.cont]) { F.F.u.uTime.value = t; F.s.u.uTime.value = t; F.e.u.uTime.value = t; }
  FIRE.steam.u.uTime.value = t;
  FIRE.houseL.intensity = tag === 'casa' ? 150 + 45 * Math.sin(t * 13) + 25 * Math.sin(t * 29) : 0;
  FIRE.contL.intensity = tag === 'cont' ? 120 + 40 * Math.sin(t * 11) + 25 * Math.sin(t * 27) : 0;
  for (const k of Object.keys(J)) J[k].u.uTime.value = t;
  FIRE.ring.material.opacity = tag === 'recon' ? sm(T.ciudad - 0.25, T.ciudad + 0.05, t) * (0.55 + 0.45 * Math.sin(t * 9)) : 0;
  FIRE.ring.scale.setScalar(1 + 0.25 * ((t * 1.6) % 1));
  AIRS.forEach(u => { u.uTime.value = t; u.uLevel.value = 1; u.uI.value = 0.9; });
}

// ------------------------------------------------------------------ capa 2D: el reloj de 24 h y los rótulos
const GOLD2 = '#FFC83D', RED2 = '#FF4B3E', CYAN2 = '#48D6FF', GREEN2 = '#3EF08A', WHITE = '#F4F6F8';
function chip(x, y, text, col, a, s = 1, px = 56) {
  if (a <= 0.005) return;
  g.save(); g.font = `400 ${px}px Bebas`; const tw = g.measureText(text).width, w = tw + 60, hh = px * 1.45;
  const hw = Math.min(W2 / 2 - 10, w * s / 2 + 24);
  g.globalAlpha = a; g.translate(cl(x, hw, W2 - hw), cl(y, 470, H2 - 230)); g.scale(s, s);
  rr(-w / 2, -hh / 2, w, hh, hh / 2); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  txt(text, 0, px * 0.36, px, WHITE, 400, 'center', 'Bebas'); g.restore();
}
function clock(t) {                                       // reloj digital grande debajo de los subtítulos
  if (t > T.fin) return;
  const s = curShot(t), h = hourAt(t), pulse = 1 + 0.12 * Math.exp(-Math.pow((t - s.t0 - 0.08) / 0.12, 2)) * (s.tag === 'hook' ? 0 : 1);
  const a = sm(0.0, 0.15, t);
  const H = Math.floor(hmod(h)), Mi = Math.floor((hmod(h) - H) * 60);
  const str = `${String(H).padStart(2, '0')}:${String(Mi).padStart(2, '0')}`;
  g.save(); g.globalAlpha = a; g.translate(540, 560); g.scale(pulse, pulse);
  rr(-190, -70, 380, 140, 30); g.fillStyle = 'rgba(8,10,14,0.82)'; g.fill(); g.strokeStyle = s.tag === 'hook' ? RED2 : GOLD2; g.lineWidth = 5; g.stroke();
  txt(str, 0, 46, 132, WHITE, 400, 'center', 'Bebas'); g.restore();
  const prog = s.tag === 'hook' ? cl((h - 8) / 24) : ['relevo2', 'casa2', 'ser', 'fin'].includes(s.tag) ? 1 : cl(hmod(h - 8) / 24);
  g.save(); g.globalAlpha = a; g.translate(540, 660); rr(-300, -9, 600, 18, 9); g.fillStyle = 'rgba(8,10,14,0.7)'; g.fill();
  rr(-300, -9, 600 * prog, 18, 9); g.fillStyle = prog >= 0.999 ? GREEN2 : GOLD2; g.fill(); g.restore();
}
function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const s = curShot(t), tag = s.tag;
  // gancho: «24 H DE GUARDIA»
  const hk = sm(T.veinti0 - 0.2, T.veinti0 + 0.15, t) * (1 - sm(T.l2 - 0.3, T.l2 - 0.1, t));
  if (hk > 0) { g.save(); g.globalAlpha = hk; g.translate(540, 1000); const k = bk(cl(hk * 1.3)); g.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 40;
    txt('24 H', 0, 120, 360, GOLD2, 400, 'center', 'Bebas'); g.shadowBlur = 0; txt('SEGUIDAS DE GUARDIA', 0, 235, 92, WHITE, 400, 'center', 'Bebas'); g.restore(); }
  clock(t);
  // salidas de la guardia (contador) y guardia cumplida
  if (t > T.salida - 0.05 && t < T.ocho2 && tag !== 'estudiar') {
    const ts = [T.salida, T.accidente, T.arde], n = ts.filter(x => t >= x).length, last = ts[Math.max(0, n - 1)];
    chip(540, 748, `SALIDAS HOY: ${Math.max(1, n)}`, RED2, sm(T.salida - 0.05, T.salida + 0.15, t), 0.88 * (1 + 0.28 * Math.exp(-Math.pow((t - last - 0.1) / 0.12, 2))), 50);
  }
  chip(540, 748, 'GUARDIA CUMPLIDA: 24 H', GREEN2, sm(T.relevo2 - 0.2, T.relevo2 + 0.1, t) * (1 - sm(T.cuatro - 0.4, T.cuatro - 0.1, t)), 0.8, 50);
  chip(540, 1700, 'GUARDIA DE EJEMPLO', 'rgba(255,255,255,0.4)', tag === 'relevo' ? sm(T.l2, T.l2 + 0.3, t) : 0, 0.8, 42);
  // rótulo de cada plano
  const lab = { relevo: 'RELEVO', rev: 'REVISIÓN', mang: 'REVISIÓN', bot: 'REVISIÓN', desayuno: 'DESAYUNO', pract: 'PRÁCTICAS', recon: 'RECONOCIMIENTO', salida: '¡SALIDA!', casa: 'INCENDIO EN VIVIENDA',
    acc: 'ACCIDENTE DE TRÁFICO', vuelta: 'VUELTA AL PARQUE', limpiar: 'LIMPIAR EL MATERIAL', pesas: 'ENTRENAR', estudiar: 'ESTUDIAR', cenar: 'CENAR', cont: 'CONTENEDOR ARDIENDO',
    noche: 'MADRUGADA', listos: 'CAMIONES LISTOS', relevo2: 'RELEVO', casa2: 'A CASA' }[tag];
  if (lab) {
    const first = ['rev', 'mang', 'bot'].includes(tag) ? SH.find(x => x.tag === 'rev') : s;
    const k = sm(first.t0 + 0.05, first.t0 + 0.3, t) * (tag === 'casa2' ? 1 - sm(T.cuatro - 0.3, T.cuatro - 0.05, t) : 1);
    const col = ['salida', 'casa', 'acc', 'cont'].includes(tag) ? RED2 : GOLD2;
    chip(540, 1530, lab, col, k, 1.15 + 0.15 * Math.exp(-Math.pow((t - first.t0 - 0.15) / 0.12, 2)), 64);
  }
  // revisión: lista que se va marcando
  if (['rev', 'mang', 'bot'].includes(tag)) [['✓ CAMIONES', T.camiones], ['✓ MANGUERAS', T.mangueras], ['✓ BOTELLA: 300 BAR', T.botella]].forEach(([w, tt], i) =>
    chip(540, 1140 + i * 115, w, GREEN2, sm(tt - 0.15, tt + 0.1, t), 0.95 * (1 + 0.2 * Math.exp(-Math.pow((t - tt - 0.05) / 0.1, 2))), 50));
  if (tag === 'recon') chip(540, 1330, 'CALLES · HIDRANTES · ACCESOS', CYAN2, sm(T.ciudad - 0.3, T.ciudad, t), 0.95, 50);
  // a casa: 1 guardia + 4 o 5 días de descanso
  const cal = sm(T.cuatro - 0.2, T.cuatro + 0.1, t) * (1 - sm(T.ser - 0.3, T.ser, t));
  if (cal > 0) {
    g.save(); g.globalAlpha = cal; g.translate(540, 1330);
    ['24 H', 'LIBRE', 'LIBRE', 'LIBRE', 'LIBRE', '¿LIBRE?'].forEach((s2, i) => { const x = -425 + i * 170, k = bk(pr(t, T.cuatro - 0.1 + i * 0.08, 0.35));
      g.save(); g.translate(x, 0); g.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); rr(-75, -75, 150, 150, 22);
      g.fillStyle = i === 0 ? 'rgba(90,12,10,0.92)' : 'rgba(10,40,24,0.9)'; g.fill(); g.lineWidth = 5; g.strokeStyle = i === 0 ? RED2 : i === 5 ? 'rgba(62,240,138,0.5)' : GREEN2; g.stroke();
      txt(s2, 0, 18, i === 0 ? 62 : 46, WHITE, 400, 'center', 'Bebas'); g.restore(); });
    g.restore();
    chip(540, 1500, 'SEGÚN EL SERVICIO: 4 O 5 DÍAS DE DESCANSO', GOLD2, cal * sm(T.servicio - 0.2, T.servicio + 0.1, t), 0.9, 50);
  }
  const sv = sm(T.ser - 0.1, T.ser + 0.2, t) * (1 - sm(T.teves - 0.2, T.teves + 0.1, t));
  if (sv > 0) ['PREPARACIÓN', 'FORMACIÓN', 'COMPAÑERISMO'].forEach((w, i) => chip(540, 1150 + i * 150, w, GOLD2, sv * sm(T.ser + i * 0.25, T.ser + i * 0.25 + 0.2, t), 1.25, 70));
  const tv = sm(T.teves - 0.1, T.teves + 0.2, t) * (1 - sm(T.fin - 0.3, T.fin, t));
  if (tv > 0) { chip(540, 1200, '¿TE VES HACIENDO ESTA GUARDIA?', GOLD2, tv, 1.1, 66); chip(540, 1380, 'ESCRÍBELO EN COMENTARIOS', WHITE, tv * sm(T.escribelo - 0.1, T.escribelo + 0.2, t), 1.0, 56); }
  share(t);
  closing(t);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.01)'; g.fillRect(0, 0, 2, 2);   // que Chrome vuelva a presentar la capa
}

// ------------------------------------------------------------------ fotograma
function subframes(t) {
  const s = curShot(t);
  if (Math.abs(t - s.t0) < 1 / 50) return 1;               // en el corte, sin mezclar planos
  if (s.tag === 'hook') return 3;                           // «time-lapse»: la autobomba deja estela
  const a = camAt(Math.max(s.t0, t - 1 / 240)), b = camAt(t + 1 / 240);
  const ang2 = a.q.angleTo(b.q), mv = a.p.distanceTo(b.p) / Math.max(0.5, (a.focus + b.focus) / 2);
  return Math.max(1, Math.min(4, Math.ceil((ang2 + mv) * H2 / (a.fov * Math.PI / 180) / 22)));
}
window.renderAt = t => {
  const N = window.FAST ? 1 : subframes(t);
  const s0 = curShot(t);
  renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < N; k++) {
    let tk = N === 1 ? t : t + (k / (N - 1) - 0.5) / 120;
    if (curShot(tk) !== s0) tk = Math.max(s0.t0, Math.min(tk, shotEnd(s0) - 1e-4));   // nunca mezcla dos planos
    update(tk);
    composer.render();
    accMat.uniforms.tSrc.value = composer.readBuffer.texture; accMat.uniforms.uW.value = 1 / N;
    renderer.setRenderTarget(accRT); renderer.autoClear = false; renderer.render(accScene, quadCam); renderer.autoClear = true;
  }
  if (N > 1) update(t);
  finMat.uniforms.tSrc.value = accRT.texture; finMat.uniforms.uTime.value = t;
  finMat.uniforms.uFlash.value = Math.exp(-Math.pow((t - T.salida - 0.03) / 0.07, 2)) * 0.3; finMat.uniforms.uFlashCol.value.setRGB(1, 0.35, 0.3);
  finMat.uniforms.uDim.value = (t >= T.fin ? mx(1, 0.5, sm(T.compartir - 0.2, T.compartir + 0.3, t)) : 1) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 2.0);

(async () => {
  try {
    while (!_r2d) await new Promise(r => setTimeout(r, 30));
    await document.fonts.ready;
    NOISE = noiseTex(); mats();
    setupTimes(); buildWorld();
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'guardia: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
