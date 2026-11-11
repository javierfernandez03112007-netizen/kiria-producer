// «¿Cuántas aciertas?» — 6 preguntas de bombero, 3 segundos cada una (Bomberados; idea de Adrián, Notion «PASAPALABRA JUEVES 12»,
// con estética propia: no copia la de ningún programa de la tele). Con las reglas de Javi del 10 nov: gancho de alarma (suena la
// alarma del parque, luces rojas, puertas que suben), cuenta 3-2-1 en cada pregunta, un DRON continuo (spline de Hermite) que va
// de un objeto a otro y cierre «¿Cuántas has acertado de seis? Comenta tu número». Motor de projects/bomberados_presion.
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



// ================================================================== MUNDO: el parque de bomberos de noche
const world = new THREE.Group(); scene.add(world);
scene.background.set(0x04060b); scene.fog.color.set(0x04060b); scene.fog.density = 0.012;
scene.environmentIntensity = 0.22;
function put(geo, mat, x, y, z, parent = world) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
const BAY = [-8.35, 0, 8.35];
// los seis objetos (uno por respuesta), delante del parque; el dron va de uno a otro
const PROP = [V(-5.6, 0, 6.0), V(5.6, 0, 6.5), V(-5.2, 0, 12.5), V(5.2, 0, 12.5), V(0, 0, 9.0), V(0, 0, 16.5)];
const QCOL = ['#FF7A1A', '#2DD4BF', '#F0457A', '#3FB6FF', '#FFC83D', '#8B7CF6'];
let doors = [], alarmL = [], alarmM = [], trucks = [], props = [], rings = [], tetraFire, epiFF;

function labelTex(text, w, h, px, bg, fg, font = 'Bebas') {
  return canvasTex(w, h, (x) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.textAlign = 'center'; x.textBaseline = 'middle'; fitText(x, text, w - 40, px, font); x.fillStyle = fg; x.fillText(text, w / 2, h / 2 + px * 0.04); }, { aniso: 4 });
}
function buildStation() {
  const conc = new THREE.MeshStandardMaterial({ color: 0x55534f, roughness: 0.38, metalness: 0.25 });
  const wall = new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 0.9 });
  const red = new THREE.MeshStandardMaterial({ color: 0xa41c22, roughness: 0.55 });
  const floorIn = new THREE.MeshStandardMaterial({ color: 0x5f6368, roughness: 0.35 });
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#141518'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 16 + rnd(i) * 26; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(40, 40);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ map: asph, color: 0x8a8a8a, roughness: 0.32, metalness: 0.22 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
  put(new THREE.BoxGeometry(34, 0.04, 24), conc, 0, 0.02, 11);                         // explanada de salida
  const yel = new THREE.MeshStandardMaterial({ color: 0xe8c020, roughness: 0.7, emissive: 0x3a3008, emissiveIntensity: 0.6 });
  for (const x of BAY) for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.16, 0.012, 20), yel, x + 2.7 * s, 0.045, 10.5);
  world.add(new THREE.HemisphereLight(0x6f8ab8, 0x15100c, 0.4));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.4); moon.position.set(25, 60, 40); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 160 }); moon.shadow.bias = -0.0005; world.add(moon);
  // el edificio (cocheras mirando a +Z) con su rótulo
  put(new THREE.BoxGeometry(26, 0.06, 14), floorIn, 0, 0.03, -7);
  put(new THREE.BoxGeometry(26, 4.2, 14.4), wall, 0, 7.1, -7);
  put(new THREE.BoxGeometry(26.4, 0.45, 14.8), red, 0, 9.4, -7);
  put(new THREE.BoxGeometry(26, 5, 0.4), wall, 0, 2.5, -14);
  for (const x of [-12.6, -4.1, 4.1, 12.6]) put(new THREE.BoxGeometry(1.2, 5, 14.4), wall, x, 2.5, -7);
  put(new THREE.BoxGeometry(26.2, 0.5, 0.6), red, 0, 5.3, 0.1);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.4), new THREE.MeshStandardMaterial({ map: labelTex('BOMBEROS', 1024, 144, 120, '#a41c22', '#ffffff'), emissiveMap: labelTex('BOMBEROS', 1024, 144, 120, '#300406', '#ffffff'), emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.5 }));
  sign.position.set(0, 7.35, 0.21); world.add(sign);
  for (let i = 0; i < 8; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshStandardMaterial({ color: 0x2a3540, emissive: 0xffc070, emissiveIntensity: rnd(i * 3.3) < 0.6 ? 0.9 : 0.1, roughness: 0.15, metalness: 0.3 })); w.position.set(i < 4 ? -11.6 + i * 1.95 : 5.75 + (i - 4) * 1.95, 8.45, 0.21); world.add(w); }
  // cocheras: luz dentro, autobomba y puerta enrollable (sube con la alarma)
  const doorTex = canvasTex(512, 512, (x) => { x.fillStyle = '#b8bec6'; x.fillRect(0, 0, 512, 512); for (let y = 0; y < 512; y += 18) { x.fillStyle = 'rgba(60,66,76,0.55)'; x.fillRect(0, y, 512, 4); } x.fillStyle = '#8e949c'; x.fillRect(200, 470, 112, 26); }, { aniso: 4 });
  BAY.forEach((x, i) => {
    put(new THREE.BoxGeometry(7.2, 0.45, 0.5), M.steel, x, 4.8, 0.1);
    const l = new THREE.PointLight(0xeef2ff, 18, 0, 2); l.position.set(x, 4.4, -4.5); world.add(l);
    put(new THREE.BoxGeometry(0.2, 0.06, 3.2), new THREE.MeshBasicMaterial({ color: 0xffffff }), x, 4.95, -5.5);
    const t = makeTruck(); t.position.set(x, 0, -7.2); t.rotation.y = -Math.PI / 2; world.add(t); trucks.push(t);
    const d = new THREE.Mesh(new THREE.PlaneGeometry(6.9, 4.6), new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.5, metalness: 0.4 }));
    d.position.set(x, 2.3, 0.05); world.add(d); doors.push(d);
    // luz de alarma roja encima de cada cochera
    const m = put(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff2a1a }), x, 5.85, 0.45); alarmM.push(m);
    const al = new THREE.PointLight(0xff2a1a, 0, 0, 2); al.position.set(x, 5.6, 1.6); world.add(al); alarmL.push(al);
  });
  // torre de prácticas y ciudad alrededor
  const tw = new THREE.MeshStandardMaterial({ color: 0xc2ab8c, roughness: 0.92 }), hole = new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.9 });
  put(new THREE.BoxGeometry(5, 16, 5), tw, 17.4, 8, -8); put(new THREE.BoxGeometry(5.4, 0.5, 5.4), red, 17.4, 16.2, -8);
  for (let r = 0; r < 5; r++) put(new THREE.PlaneGeometry(1.3, 1.6), hole, 17.4, 2.4 + r * 3, -5.48);
  for (let i = 0; i < 10; i++) { const b = building(11, 12 + rnd(i * 3.1) * 16, 10, 6, 6, 40 + i, null); b.position.set(-55 + i * 12, 0, -30); world.add(b); }
  for (let i = 0; i < 8; i++) { const b = building(11, 10 + rnd(i * 5.9) * 14, 10, 6, 5, 70 + i, null); b.position.set(-48 + i * 13, 0, 46); b.rotation.y = Math.PI; world.add(b); }
  for (const [x, z] of [[-15, 21], [15, 21], [-15, 4], [15, 4]]) {
    put(new THREE.CylinderGeometry(0.07, 0.1, 6, 12), M.steel, x, 3, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffc98a })); bulb.material.color.setScalar(2.2); bulb.position.set(x, 6.0, z); world.add(bulb);
    const l = new THREE.PointLight(0xffb070, 40, 0, 2); l.position.set(x, 5.75, z); world.add(l);
  }
}

// ------------------------------------------------------------------ los seis objetos de las respuestas
function glowRing(p, col) {      // aro de luz en el suelo donde va a salir el objeto
  const m = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.32, 64), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.06, p.z); world.add(m); return m;
}
function buildProps() {
  // 1 · la Constitución: libro gigante de pie
  {
    const g = new THREE.Group(); g.position.copy(PROP[0]);
    const cover = canvasTex(512, 720, (x) => {
      x.fillStyle = '#7a1418'; x.fillRect(0, 0, 512, 720); x.strokeStyle = '#d9b45a'; x.lineWidth = 10; x.strokeRect(26, 26, 460, 668);
      x.fillStyle = '#e8c870'; x.textAlign = 'center'; x.font = '400 78px Bebas'; x.fillText('CONSTITUCIÓN', 256, 300); x.fillText('ESPAÑOLA', 256, 380);
      x.font = '400 54px Bebas'; x.fillText('1978', 256, 470);
    }, { aniso: 4 });
    const pages = new THREE.MeshStandardMaterial({ color: 0xf2ecdc, roughness: 0.8 }), coverM = new THREE.MeshStandardMaterial({ map: cover, roughness: 0.55, emissive: 0x2a0606, emissiveIntensity: 0.6 });
    const book = new THREE.Mesh(new RoundedBoxGeometry(1.9, 2.7, 0.42, 2, 0.05), [pages, pages, pages, pages, coverM, coverM]); book.position.y = 1.4; book.castShadow = true; g.add(book);
    world.add(g); props.push(g);
  }
  // 2 · el 112 de neón
  {
    const g = new THREE.Group(); g.position.copy(PROP[1]);
    const tex = canvasTex(1024, 512, (x) => { x.clearRect(0, 0, 1024, 512); x.textAlign = 'center'; x.font = '400 400px Bebas'; x.shadowColor = '#2DD4BF'; x.shadowBlur = 40; x.fillStyle = '#c8fff6'; x.fillText('112', 512, 410); });
    const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
    neon.position.y = 1.65; neon.material.color.setScalar(1.6); g.add(neon); g.userData.neon = neon;
    put(new THREE.BoxGeometry(2.8, 0.25, 0.5), M.black, 0, 0.85, 0, g);
    put(new THREE.BoxGeometry(0.12, 0.85, 0.12), M.steel, -1.0, 0.42, 0, g); put(new THREE.BoxGeometry(0.12, 0.85, 0.12), M.steel, 1.0, 0.42, 0, g);
    world.add(g); props.push(g);
  }
  // 3 · el tetraedro del fuego (4 caras de color) con un fuego encima
  {
    const g = new THREE.Group(); g.position.copy(PROP[2]);
    const geo = new THREE.TetrahedronGeometry(1.25, 0).toNonIndexed(); const cols = [[1.0, 0.45, 0.1], [0.25, 0.75, 1.0], [1.0, 0.85, 0.2], [0.95, 0.25, 0.45]];
    const ca = new Float32Array(geo.attributes.position.count * 3); for (let f = 0; f < 4; f++) for (let k = 0; k < 3; k++) ca.set(cols[f], (f * 3 + k) * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(ca, 3));
    const tet = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: 0x401006, emissiveIntensity: 0.6, flatShading: true }));
    tet.position.y = 1.55; tet.castShadow = true; g.add(tet); g.userData.tet = tet;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.TetrahedronGeometry(1.26, 0)), new THREE.LineBasicMaterial({ color: 0xffe2b0 })); edges.position.y = 1.55; g.add(edges); g.userData.edges = edges;
    world.add(g); props.push(g);
    tetraFire = fireSet(world, V(PROP[2].x, 2.55, PROP[2].z), tongues(4, 77, (i, r) => [PROP[2].x - 0.3 + i * 0.2, 2.55, PROP[2].z, 0.35 + 0.15 * r(3), 0.8 + 0.5 * r(4)]),
      { seed: 77, extent: [0.25, 0.05, 0.2], smokeN: 10, smokeSize: 0.6, smokeY: 1.2, emberN: 18, bright: 1.25 });
  }
  // 4 · la molécula de agua (O rojo, dos H blancos a 104,5°)
  {
    const g = new THREE.Group(); g.position.copy(PROP[3]);
    const mol = new THREE.Group(); mol.position.y = 1.6; g.add(mol); g.userData.mol = mol;
    const O = new THREE.MeshPhysicalMaterial({ color: 0xd8262c, roughness: 0.25, clearcoat: 1, emissive: 0x300404, emissiveIntensity: 0.6 });
    const H = new THREE.MeshPhysicalMaterial({ color: 0xf2f4f8, roughness: 0.25, clearcoat: 1, emissive: 0x202428, emissiveIntensity: 0.5 });
    put(new THREE.SphereGeometry(0.62, 40, 28), O, 0, 0, 0, mol);
    const a = (104.5 / 2) * Math.PI / 180;
    for (const s of [-1, 1]) {
      const d = V(Math.sin(a) * s, -Math.cos(a), 0), hp = d.clone().multiplyScalar(1.05);
      put(new THREE.SphereGeometry(0.38, 32, 22), H, hp.x, hp.y, hp.z, mol);
      const b = put(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 16), M.chrome, d.x * 0.5, d.y * 0.5, 0, mol); b.quaternion.setFromUnitVectors(V(0, 1, 0), d);
    }
    world.add(g); props.push(g);
  }
  // 5 · el EPI: un bombero con todo el equipo sobre un pedestal
  {
    const g = new THREE.Group(); g.position.copy(PROP[4]);
    put(new THREE.CylinderGeometry(0.9, 1.0, 0.3, 40), M.black, 0, 0.15, 0, g);
    epiFF = makeFirefighter(); epiFF.position.y = 0.3; epiFF.rotation.y = Math.PI; epiFF.scale.setScalar(1.25); g.add(epiFF);
    const spot = new THREE.SpotLight(0xffffff, 0, 9, 0.5, 0.5, 1.5); spot.position.set(0, 6, 2.5); spot.target.position.set(0, 1, 0); g.add(spot, spot.target); g.userData.spot = spot;
    world.add(g); props.push(g);
  }
  // 6 · la ley: una hoja del BOE gigante (el sello se estampa en la capa 2D)
  {
    const g = new THREE.Group(); g.position.copy(PROP[5]);
    const boe = canvasTex(600, 820, (x) => {
      x.fillStyle = '#fbfaf5'; x.fillRect(0, 0, 600, 820); x.fillStyle = '#1b1b1b'; x.textAlign = 'center';
      x.font = '700 36px Inter'; x.fillText('BOLETÍN OFICIAL DEL ESTADO', 300, 70); x.fillRect(40, 92, 520, 4);
      x.font = '800 40px Inter'; x.fillText('LEY 31/1995', 300, 170); x.font = '600 26px Inter'; x.fillText('de 8 de noviembre, de Prevención', 300, 220); x.fillText('de Riesgos Laborales', 300, 255);
      for (let i = 0; i < 18; i++) { x.fillStyle = '#9a9a9a'; x.fillRect(50, 310 + i * 26, 500 - rnd(i * 1.9) * 160, 8); }
    }, { aniso: 4 });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.0), new THREE.MeshStandardMaterial({ map: boe, roughness: 0.8, emissive: 0xffffff, emissiveMap: boe, emissiveIntensity: 0.18, side: THREE.DoubleSide }));
    sheet.position.y = 1.65; sheet.castShadow = true; g.add(sheet);
    put(new THREE.BoxGeometry(2.4, 0.12, 0.6), M.black, 0, 0.06, 0, g);
    world.add(g); props.push(g);
  }
  props.forEach((p, i) => { p.scale.setScalar(0.001); p.visible = false; rings.push(glowRing(PROP[i], new THREE.Color(QCOL[i]))); });
}
function buildWorld() { buildStation(); buildProps(); }

// ------------------------------------------------------------------ tiempos y cámara: un dron que no para (sin cortes)
let T = {}, KEYS = null;
function setupTimes() {
  T = { ...CUE, end: END };
  const L = window.LINES_;
  T.q = [1, 3, 5, 7, 9, 11].map(i => L[i].start); T.qe = [1, 3, 5, 7, 9, 11].map(i => L[i].end);
  T.a = [2, 4, 6, 8, 10, 12].map(i => L[i].start); T.ae = [2, 4, 6, 8, 10, 12].map(i => L[i].end);
  T.c0 = T.qe.map(e => e + 0.05);
  T.hookEnd = L[0].end; T.close = L[13].start;
  T.fin = T.compartir - 0.25;
  KEYS = camKeys();
}
function camKeys() {
  const P = PROP, look = (k, dx, h, dz, ty = 1.5) => [P[k].x + dx, h, P[k].z + dz, P[k].x, ty, P[k].z];
  const K = [
    [0, [2.4, 1.5, 30, 0, 3.2, 0, 46]],                              // desde la calle, rasante, hacia el parque con la alarma
    [T.hookEnd - 0.5, [0.8, 3.6, 17, 0, 2.6, 0, 44]],
    ...[0, 1, 2, 3, 4, 5].flatMap(i => {
      const nx = i < 5 ? T.q[i + 1] : T.close, sd = i % 2 ? -1 : 1, dz = i === 4 || i === 5 ? 8.8 : 8.7, hy = i >= 4 ? 3.8 : 3.6;
      return [[T.q[i] + (i ? 0.35 : 0), [...look(i, 3.2 * sd, hy, dz, 2.6), 42]],
              [T.a[i] + Math.min(0.5, (nx - T.a[i]) * 0.45), [...look(i, 1.3 * sd, hy - 0.3, dz - 0.4, 2.5), 42]]];
    }),
    [T.close, [0, 13, 38, 0, 2, 8, 42]],                             // sube: los seis objetos delante del parque
    [T.fin, [0, 17, 42, 0, 2, 6, 42]],
    [T.end, [0, 23, 48, 0, 3, 4, 44]],
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
  let sh = 0; T.a.forEach(a => { sh += Math.exp(-Math.pow((t - a - 0.05) / 0.1, 2)) * 0.05; });
  return pose(V(v[0] + sh * Math.sin(t * 91), v[1] + sh * Math.cos(t * 77), v[2]), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => f.u.uCam.value.copy(cam.position));
  // la alarma: luces rojas que parpadean deprisa en el gancho y luego laten despacio; las puertas suben
  const hook = 1 - sm(T.hookEnd - 0.3, T.hookEnd + 0.6, t);
  const fast = (Math.sin(t * 18) > 0 ? 1 : 0), slow = 0.5 + 0.5 * Math.sin(t * 3.2);
  const al = hook * fast + (1 - hook) * 0.15 * slow;
  alarmL.forEach((l, i) => { l.intensity = 90 * al; }); alarmM.forEach(m => m.material.color.setRGB(0.6 + 3.2 * al, 0.08 + 0.3 * al, 0.05));
  doors.forEach((d, i) => { const k = e3(pr(t, 0.35 + i * 0.12, 1.6)); d.position.y = 2.3 + 4.4 * k; d.scale.y = 1 - 0.85 * k; d.position.y -= 0; });
  trucks.forEach((tr, i) => {
    const ph = (t * 2.6 + i * 0.37) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
    tr.userData.lbar.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
    tr.userData.pl.intensity = 6 + 40 * on;
  });
  // objetos: el aro se enciende con la pregunta; el objeto sale con la respuesta (con un rebote) y se queda
  props.forEach((g, i) => {
    const ring = rings[i];
    const rIn = sm(T.q[i] - 0.2, T.q[i] + 0.3, t) * (1 - 0.6 * sm(T.a[i], T.a[i] + 0.6, t));
    ring.material.opacity = cl(rIn) * (0.55 + 0.45 * Math.sin(t * 8 + i)); ring.scale.setScalar(1 + 0.08 * Math.sin(t * 6 + i));
    const k = bk(pr(t, T.a[i] - 0.05, 0.55));
    g.visible = k > 0.001; g.scale.setScalar(Math.max(0.001, k));
    if (!g.visible) return;
    const tt = t - T.a[i];
    if (i === 0) g.rotation.y = 0.25 * Math.sin(tt * 0.8);
    if (i === 1) g.userData.neon.material.color.setScalar(1.2 + 0.6 * (Math.sin(tt * 30) > -0.6 ? 1 : 0.3) * Math.exp(-tt * 0.3) + 0.4);
    if (i === 2) { g.userData.tet.rotation.y = tt * 0.9; g.userData.edges.rotation.y = tt * 0.9; }
    if (i === 3) g.userData.mol.rotation.y = tt * 1.1;
    if (i === 4) { g.rotation.y = 0.3 * Math.sin(tt * 0.6); g.userData.spot.intensity = 60 * cl(tt * 3); }
  });
  for (const f of [tetraFire]) { f.F.u.uTime.value = t; f.s.u.uTime.value = t; f.e.u.uTime.value = t; f.F.u.uInt.value = sm(T.a[2] - 0.1, T.a[2] + 0.4, t); f.mesh = f.F.mesh; f.F.mesh.visible = f.s.mesh.visible = f.e.mesh.visible = t > T.a[2] - 0.15; }
  if (epiFF) epiFF.position.y = 0.3 + 0.004 * Math.sin(t * 2);
}

// ------------------------------------------------------------------ capa 2D
function proj(v) { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * W2, y: (-p.y * 0.5 + 0.5) * H2, ok: p.z < 1 }; }
const RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF';
function chip(x, y, text, col, a, s = 1, px = 56) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a); g.translate(cl(x, 200, W2 - 200), cl(y, 470, H2 - 230)); g.scale(s, s);
  g.font = `400 ${px}px Bebas`; const tw = g.measureText(text).width, w = tw + 60, h = px * 1.45;
  rr(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  txt(text, 0, px * 0.36, px, '#F4F6F8', 400, 'center', 'Bebas');
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
const QS = ['¿CUÁNTOS ARTÍCULOS TIENE LA CONSTITUCIÓN?', '¿EL TELÉFONO DE EMERGENCIAS?', '¿CUÁNTOS ELEMENTOS TIENE EL TETRAEDRO DEL FUEGO?',
  '¿LA FÓRMULA QUÍMICA DEL AGUA?', '¿QUÉ SIGNIFICA EPI?', '¿QUÉ LEY REGULA LA PREVENCIÓN DE RIESGOS LABORALES?'];
const AS = ['169', '112', '4', 'H₂O', 'EQUIPO DE PROTECCIÓN INDIVIDUAL', 'LEY 31/1995'];
function wrap(s, maxW, px) { g.font = `400 ${px}px Bebas`; const ws = s.split(' '), L = []; let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (g.measureText(n).width > maxW && cur) { L.push(cur); cur = w; } else cur = n; } if (cur) L.push(cur); return L; }
function panel(t) {               // la pregunta en grande, su cuenta 3-2-1 y la respuesta que estalla en verde
  for (let i = 0; i < 6; i++) {
    const a = sm(T.q[i] - 0.15, T.q[i] + 0.15, t) * (1 - sm((i < 5 ? T.q[i + 1] : T.close) - 0.35, (i < 5 ? T.q[i + 1] : T.close) - 0.05, t));
    if (a <= 0.005) continue;
    const ans = sm(T.a[i] - 0.08, T.a[i] + 0.12, t), pop = Math.exp(-Math.pow((t - T.a[i] - 0.12) / 0.16, 2));
    const k = bk(cl(a * 1.2));
    g.save(); g.globalAlpha = cl(a * 1.3); g.translate(540, 742); g.scale(0.85 + 0.15 * k + 0.05 * pop, 0.85 + 0.15 * k + 0.05 * pop);
    rr(-470, -160, 940, 320, 46); g.fillStyle = ans > 0.5 ? 'rgba(8,32,20,0.92)' : 'rgba(9,12,17,0.9)'; g.fill();
    g.lineWidth = 6; g.strokeStyle = ans > 0.5 ? GREEN2 : QCOL[i]; g.stroke();
    // etiqueta «PREGUNTA k/6» (o «LA DIFÍCIL»)
    const lab = i === 5 ? 'LA DIFÍCIL · 6/6' : `PREGUNTA ${i + 1}/6`;
    g.font = '400 44px Bebas'; const lw = g.measureText(lab).width + 50;
    rr(-lw / 2, -192, lw, 60, 30); g.fillStyle = i === 5 ? RED2 : QCOL[i]; g.fill(); txt(lab, 0, -147, 42, '#0b0d10', 400, 'center', 'Bebas');
    if (ans < 0.5) {
      const L = wrap(QS[i], 860, 84); const y0 = -((L.length - 1) * 88) / 2 + 30;
      L.forEach((s, j) => txt(s, 0, y0 + j * 88, 84, '#F4F6F8', 400, 'center', 'Bebas'));
    } else {
      const L = wrap(QS[i], 860, 40); txt(L.join(' ').slice(0, 70), 0, -96, 36, 'rgba(244,246,248,0.6)', 400, 'center', 'Bebas');
      const px = AS[i].length > 12 ? 92 : 190; const L2 = wrap(AS[i], 860, px); const y0 = -((L2.length - 1) * px * 0.95) / 2 + px * 0.42;
      g.shadowColor = GREEN2; g.shadowBlur = 36;
      L2.forEach((s, j) => txt(s, 0, y0 + j * px * 0.95 + 10, px, GREEN2, 400, 'center', 'Bebas'));
      g.shadowBlur = 0;
    }
    g.restore();
    // cuenta 3-2-1
    if (t > T.c0[i] - 0.02 && t < T.a[i] + 0.1) {
      const e = t - T.c0[i], n = Math.max(1, 3 - Math.floor(Math.max(0, e))), f = Math.max(0, e) % 1, kk = cl(e / 3.0), out = 1 - sm(T.a[i] - 0.1, T.a[i] + 0.1, t);
      g.save(); g.globalAlpha = out; g.translate(540, 1050);
      g.beginPath(); g.arc(0, 0, 84, 0, 7); g.fillStyle = 'rgba(8,10,14,0.82)'; g.fill();
      g.beginPath(); g.arc(0, 0, 84, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - kk)); g.strokeStyle = n === 1 ? RED2 : '#FF7A1A'; g.lineWidth = 11; g.lineCap = 'round'; g.stroke();
      const s = 1 + 0.4 * Math.pow(1 - f, 5); g.scale(s, s);
      txt(String(n), 0, 38, 116, n === 1 ? '#FF6B5E' : '#FFFFFF', 400, 'center', 'Bebas'); g.restore();
    }
    // chispas al responder
    if (t > T.a[i] - 0.05 && t < T.a[i] + 0.9) {
      const e = t - T.a[i] + 0.05;
      g.save(); g.globalAlpha = cl(1 - e / 0.9);
      for (let k2 = 0; k2 < 26; k2++) { const an = k2 / 26 * Math.PI * 2 + i, r = 200 + 520 * eO(e / 0.9) * (0.6 + 0.4 * rnd(k2 + i * 7)); g.beginPath(); g.arc(540 + Math.cos(an) * r, 742 + Math.sin(an) * r * 0.6, 6 + 6 * rnd(k2 * 3.1), 0, 7); g.fillStyle = k2 % 3 ? GREEN2 : GOLD2; g.fill(); }
      g.restore();
    }
  }
}
function slots(t) {               // marcador de las 6 preguntas (arriba): la que toca late; las respondidas, en verde
  const a = sm(T.hookEnd - 0.8, T.hookEnd - 0.4, t) * (1 - sm(T.close - 0.3, T.close, t));
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = a;
  for (let i = 0; i < 6; i++) {
    const x = 540 + (i - 2.5) * 118, y = 468, done = t > T.a[i] + 0.05, cur = t > T.q[i] - 0.2 && !done;
    const s = cur ? 1 + 0.1 * Math.max(0, Math.sin(t * 7)) : 1;
    g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.arc(0, 0, 42, 0, 7); g.fillStyle = done ? 'rgba(20,70,40,0.95)' : 'rgba(8,10,14,0.85)'; g.fill();
    g.lineWidth = 5; g.strokeStyle = done ? GREEN2 : cur ? QCOL[i] : 'rgba(255,255,255,0.35)'; g.stroke();
    txt(done ? '✓' : String(i + 1), 0, 18, 50, done ? GREEN2 : '#F4F6F8', 400, 'center', 'Bebas');
    g.restore();
  }
  g.restore();
}
function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  // gancho: «¡ALARMA!» y el reto
  stamp('¡ALARMA!', 760, RED2, sm(0.1, 0.35, t) * (1 - sm(1.7, 2.1, t)) * (0.75 + 0.25 * (Math.sin(t * 18) > 0 ? 1 : 0)), 190, -0.05);
  chip(540, 1460, '6 PREGUNTAS · 3 SEGUNDOS', GOLD2, sm(1.4, 1.7, t) * (1 - sm(T.hookEnd - 0.2, T.hookEnd + 0.2, t)), 1.15, 66);
  chip(540, 1580, '¿CUÁNTAS ACIERTAS?', '#FF7A1A', sm(CUE.aciertas - 0.2, CUE.aciertas + 0.1, t) * (1 - sm(T.hookEnd + 0.1, T.q[0] - 0.1, t)), 1.1, 62);
  slots(t);
  panel(t);
  // nombres del tetraedro y del EPI (en los objetos)
  if (t > T.a[2] + 0.3 && t < T.q[3]) {
    const P0 = PROP[2], a = sm(T.a[2] + 0.3, T.a[2] + 0.6, t) * (1 - sm(T.q[3] - 0.3, T.q[3], t));
    [['COMBUSTIBLE', -1.6, 2.6], ['COMBURENTE', 1.6, 2.6], ['CALOR', -1.6, 0.6], ['REACCIÓN EN CADENA', 1.6, 0.6]].forEach(([s, dx, dy], j) => {
      const p = proj(V(P0.x + dx, dy, P0.z)); chip(p.x, p.y, s, ['#FF7A1A', '#48D6FF', '#FFC83D', '#F0457A'][j], a * sm(T.a[2] + 0.3 + j * 0.15, T.a[2] + 0.5 + j * 0.15, t), 0.8, 50);
    });
  }
  if (t > T.a[4] + 0.3 && t < T.q[5]) {
    const P0 = PROP[4], a = sm(T.a[4] + 0.3, T.a[4] + 0.6, t) * (1 - sm(T.q[5] - 0.3, T.q[5], t));
    [['CASCO', 0.9, 2.55], ['ERA', -1.0, 1.9], ['CHAQUETÓN', 1.0, 1.6], ['GUANTES', -1.0, 1.1], ['BOTAS', 0.9, 0.4]].forEach(([s, dx, dy], j) => {
      const p = proj(V(P0.x + dx, dy, P0.z)); chip(p.x, p.y, s, GOLD2, a * sm(T.a[4] + 0.3 + j * 0.12, T.a[4] + 0.5 + j * 0.12, t), 0.8, 50);
    });
  }
  // el sello de la ley
  if (t > T.a[5] - 0.05 && t < T.close) {
    const P0 = PROP[5], p = proj(V(P0.x, 1.4, P0.z)), e = t - T.a[5];
    const k = e < 0.18 ? 2.2 - 1.2 * (e / 0.18) : 1;
    g.save(); g.globalAlpha = cl(e * 6) * (1 - sm(T.close - 0.3, T.close, t)); g.translate(p.x, p.y); g.rotate(-0.18); g.scale(k, k);
    rr(-220, -70, 440, 140, 18); g.lineWidth = 12; g.strokeStyle = RED2; g.stroke(); txt('LEY 31/1995', 0, 30, 92, RED2, 400, 'center', 'Bebas'); g.restore();
  }
  // final: notas y «comenta tu número»
  const fa = sm(T.close + 0.3, T.close + 0.7, t) * (1 - sm(T.fin - 0.3, T.fin + 0.05, t));
  if (fa > 0.01) {
    [['0–2', '¡TOCA ESTUDIAR!', RED2], ['3–4', '¡VAS POR BUEN CAMINO!', '#FF7A1A'], ['5–6', '¡NIVEL BOMBERO!', GREEN2]].forEach(([n, s, col], j) => {
      const k = bk(pr(t, T.close + 0.3 + j * 0.25, 0.4)); if (k <= 0.005) return;
      g.save(); g.globalAlpha = cl(fa * k * 1.2); g.translate(540 + (1 - cl(k)) * 600, 680 + j * 170);
      rr(-430, -66, 860, 132, 40); g.fillStyle = 'rgba(9,12,17,0.9)'; g.fill(); g.lineWidth = 4; g.strokeStyle = col; g.stroke();
      rr(-410, -46, 170, 92, 30); g.fillStyle = col; g.fill(); txt(n, -325, 30, 80, '#0b0d10', 400, 'center', 'Bebas');
      txt(s, 90, 32, 84, '#F2F5F8', 400, 'center', 'Bebas');
      g.restore();
    });
    const ce = sm(CUE.comenta - 0.12, CUE.comenta + 0.15, t);
    if (ce > 0) { const b = 1 + 0.05 * Math.max(0, Math.sin((t - CUE.comenta) * 6)); g.save(); g.globalAlpha = ce * fa; g.translate(540, 1300); g.scale(b, b); rr(-340, -56, 680, 112, 56); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke(); txt('💬  COMENTA TU NÚMERO', 0, 20, 58, '#F2F5F8', 400, 'center', 'Bebas'); g.restore(); }
  }
  share(t);
  closing(t);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.01)'; g.fillRect(0, 0, 2, 2);
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
  // alarma: el rojo inunda la imagen a golpes en el gancho; verde suave en cada acierto
  const hook = 1 - sm(T.hookEnd - 0.3, T.hookEnd + 0.4, t);
  const red = hook * (Math.sin(t * 18) > 0 ? 1 : 0) * 0.13;
  let green = 0; T.a.forEach(a => { green = Math.max(green, Math.exp(-Math.pow((t - a - 0.05) / 0.09, 2)) * 0.22); });
  if (green > red) { finMat.uniforms.uFlash.value = green; finMat.uniforms.uFlashCol.value.setRGB(0.4, 1.0, 0.6); }
  else { finMat.uniforms.uFlash.value = red; finMat.uniforms.uFlashCol.value.setRGB(1.0, 0.12, 0.08); }
  finMat.uniforms.uDim.value = (t >= T.fin ? mx(1, 0.5, sm(T.compartir - 0.2, T.compartir + 0.3, t)) : 1) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 6.0);

(async () => {
  try {
    while (!_r2d) await new Promise(r => setTimeout(r, 30));
    await document.fonts.ready;
    NOISE = noiseTex(); mats();
    setupTimes(); buildWorld();
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'quiz: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
