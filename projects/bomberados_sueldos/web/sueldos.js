// «¿Cuánto gana un bombero en Madrid y en Granada?» (Bomberados, dato de la oposición, 1 minuto, idea de Javi).
// Motor de projects/bomberados_presion/web/presion.js (luz, resplandor, desenfoque de movimiento, llamas, bombero,
// autobomba, edificios). Mundo propio: una calle de noche partida en dos ciudades (MADRID | GRANADA), dos bomberos
// idénticos, dos columnas de oro (sueldo base + destino iguales, complemento específico distinto), guardias y €/hora.
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
const world = new THREE.Group(); scene.add(world);
scene.background.set(0x04060b); scene.fog.color.set(0x04060b); scene.fog.density = 0.0065;
scene.environmentIntensity = 0.24;
cam.far = 400; cam.updateProjectionMatrix();
let ffM, ffG, trM, trG, fireEnd, fireLight, beacons = [], blocks = [], labM, labG, lineMat;
const CX = 3.3, CZ = -3.6, CW = 1.9;                     // columnas de oro: a ±CX, en z = CZ, de CW de lado
const SC = 1 / 3000;                                    // metros por euro
const BASE = 11884.58 + 7401.24;                        // sueldo + destino nivel 20 (tablas de 2024): igual en los dos
const EM = 27803.72, EM0 = 25276.02, EG = 25389.34;     // específico: Madrid (2024), Madrid antes de 2024, Granada
const COL = {};                                         // segmentos de las columnas

function goldTex(tint) {                                 // lingotes apilados (ranuras cada 0,5 m)
  const t = canvasTex(256, 256, (x) => {
    const g = x.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, tint[0]); g.addColorStop(0.5, tint[1]); g.addColorStop(1, tint[0]);
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 64) { x.fillStyle = 'rgba(60,35,0,0.55)'; x.fillRect(0, y, 256, 5); x.fillStyle = 'rgba(255,240,200,0.35)'; x.fillRect(0, y + 5, 256, 3); }
    for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(60,35,0,0.35)'; x.fillRect(i * 64 + 30, 0, 3, 256); }
  }, { aniso: 4 });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function segment(x, tint, emi) {                         // caja de altura 1 (se escala en y), con su textura repetida
  const tex = goldTex(tint);
  const mat = new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.85, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.15,
    emissive: new THREE.Color(emi), emissiveIntensity: 0.55, emissiveMap: tex });
  const m = new THREE.Mesh(new THREE.BoxGeometry(CW, 1, CW), mat); m.position.set(x, 0, CZ); m.castShadow = true; world.add(m);
  m.userData.tex = tex; m.visible = false; return m;
}
function setSeg(m, y0, h) {                              // segmento de y0 a y0 + h
  m.visible = h > 0.01; m.scale.y = Math.max(0.001, h); m.position.y = y0 + h / 2;
  m.userData.tex.repeat.set(1, Math.max(0.05, h * 0.5)); m.userData.tex.offset.y = 0;
}
function house(w, h, d, seed) {                          // casa blanca de Granada (cal), ventanas pequeñas y tejado de teja
  const tex = canvasTex(256, 256, (x) => {
    x.fillStyle = '#cfc8b8'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { const v = 170 + rnd(i * 3 + seed) * 50; x.fillStyle = `rgba(${v},${v - 6},${v - 18},0.25)`; x.fillRect(rnd(i + seed) * 256, rnd(i * 7 + seed) * 256, 3, 3); }
    const cols = 2 + Math.floor(rnd(seed) * 2), rows = Math.max(1, Math.round(h / 3.2));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const on = rnd(r * 13.1 + c * 5.7 + seed) < 0.45;
      const X = 30 + c * (196 / cols), Y = 256 - (r + 1) * (256 / rows) + 18;
      x.fillStyle = on ? '#ffbe6a' : '#2a2620'; x.fillRect(X, Y, 34, 44);
      x.fillStyle = '#5a3a24'; x.fillRect(X - 4, Y - 4, 42, 4);
    }
  });
  const emi = canvasTex(256, 256, (x) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
    const cols = 2 + Math.floor(rnd(seed) * 2), rows = Math.max(1, Math.round(h / 3.2));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (rnd(r * 13.1 + c * 5.7 + seed) < 0.45) { x.fillStyle = '#ffb060'; x.fillRect(30 + c * (196 / cols), 256 - (r + 1) * (256 / rows) + 18, 34, 44); }
  });
  const wall = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: emi, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.9 });
  const plain = new THREE.MeshStandardMaterial({ color: 0xbdb6a6, roughness: 0.9 });
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [wall, wall, plain, plain, wall, wall]); b.position.y = h / 2; g.add(b);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, w * 0.62, 1.4, 4, 1), new THREE.MeshStandardMaterial({ color: 0x7a3a22, roughness: 0.8 }));
  roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, d / w); roof.position.y = h + 0.7; g.add(roof);
  return g;
}
function groundLabel(text, col) {
  const t = canvasTex(1024, 256, (x) => { x.font = '400 200px Bebas'; x.textAlign = 'center'; x.fillStyle = col; x.fillText(text, 512, 205); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.4), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.material.color.setScalar(1.3); world.add(m); return m;
}
function block24() {                                     // guardia de 24 h: cubo rojo encendido con «24 H»
  const t = canvasTex(256, 256, (x) => { x.fillStyle = '#3a0705'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#ff5a3c'; x.lineWidth = 14; x.strokeRect(10, 10, 236, 236);
    x.font = '400 120px Bebas'; x.textAlign = 'center'; x.fillStyle = '#ffd9cf'; x.fillText('24 H', 128, 168); });
  const m = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.9, 0.9, 3, 0.08), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.5 }));
  m.castShadow = true; m.visible = false; world.add(m); return m;
}

function buildWorld() {
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#16171a'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 18 + rnd(i) * 26; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(60, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: asph, color: 0x8a8a8a, roughness: 0.42, metalness: 0.15 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
  world.add(new THREE.HemisphereLight(0x6f8ab8, 0x15100c, 0.55));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.5); moon.position.set(20, 60, 40); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -25, right: 25, top: 30, bottom: -10, near: 1, far: 140 }); moon.shadow.bias = -0.0005; world.add(moon);
  // la raya que parte la calle en dos ciudades
  lineMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false }); lineMat.color.setRGB(2.4, 1.7, 0.6);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 260), lineMat); line.rotation.x = -Math.PI / 2; line.position.set(0, 0.012, -100); world.add(line);
  // MADRID (izquierda): torres altas a lo largo de la calle y más atrás
  for (let i = 0; i < 9; i++) {
    const h = 34 + rnd(i * 3.7) * 46, w = 10 + rnd(i * 1.3) * 5;
    const b = building(w, h, 10, Math.round(w / 2), Math.round(h / 3.2), 31 + i, null); b.position.set(-11 - w / 2, h / 2, -6 - i * 14); b.rotation.y = Math.PI / 2; world.add(b);
  }
  for (let i = 0; i < 7; i++) {
    const h = 55 + rnd(i * 5.1) * 60;
    const b = building(12, h, 12, 6, Math.round(h / 3.4), 61 + i, null); b.position.set(-34 - rnd(i) * 30, h / 2, -20 - i * 22); world.add(b);
  }
  // GRANADA (derecha): casas blancas bajas y, al fondo, la colina con la fortaleza
  for (let i = 0; i < 16; i++) {
    const h = 6.5 + rnd(i * 2.9) * 5.5, w = 6 + rnd(i * 4.1) * 3;
    const hs = house(w, h, 8, 100 + i); hs.position.set(10 + w / 2 + rnd(i * 7) * 1.5, 0, -2 - i * 7.5); hs.rotation.y = -Math.PI / 2; world.add(hs);
  }
  for (let i = 0; i < 14; i++) {
    const h = 6 + rnd(i * 6.1) * 5;
    const hs = house(7, h, 7, 200 + i); hs.position.set(22 + rnd(i * 2.2) * 30, 0, -10 - i * 9); world.add(hs);
  }
  const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1d2318, roughness: 1 }));
  hill.scale.set(70, 26, 34); hill.position.set(40, 0, -150); world.add(hill);
  const fortM = new THREE.MeshStandardMaterial({ color: 0x8a4a2e, roughness: 0.85, emissive: 0x6a2c12, emissiveIntensity: 0.55 });
  const fort = new THREE.Group(); fort.position.set(36, 24, -146); world.add(fort);
  const wallF = new THREE.Mesh(new THREE.BoxGeometry(56, 6, 4), fortM); wallF.position.y = 3; fort.add(wallF);
  for (const [x, h, w] of [[-26, 13, 5], [-14, 9, 4], [-3, 16, 6], [9, 10, 4], [20, 12, 5], [27, 8, 3]]) { const tw = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), fortM); tw.position.set(x, h / 2, 0); fort.add(tw); }
  // farolas a los dos lados
  for (const [x, z] of [[-9.5, 2], [9.5, 2], [-9.5, -18], [9.5, -18]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 12), M.steel); pole.position.set(x, 3, z); world.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffc98a })); lamp.material.color.setScalar(3); lamp.position.set(x, 6.05, z); world.add(lamp);
    const l = new THREE.PointLight(0xffb070, 55, 0, 2); l.position.set(x, 5.9, z); world.add(l);
  }
  // el mismo fuego para los dos: un edificio en llamas al fondo de la calle, sobre la raya
  const bF = building(12, 22, 10, 6, 7, 777, (r, c) => (r === 3 || r === 4) && c >= 2 && c <= 3); bF.position.set(0, 11, -72); world.add(bF);
  fireEnd = fireSet(world, V(0, 9.8, -66.9), tongues(8, 41, (i, r) => [-2.2 + i * 0.62 + (r(1) - 0.5) * 0.2, 9.8 + r(2) * 2.6, -66.9, 0.9 + 0.5 * r(3), 2.4 + 1.6 * r(4)]),
    { seed: 41, extent: [2.4, 1.4, 0.4], smokeN: 34, smokeSize: 2.4, smokeY: 6, emberN: 60, bright: 1.5 });
  fireLight = new THREE.PointLight(0xff6a1a, 420, 0, 2); fireLight.position.set(0, 12, -63); world.add(fireLight);
  // dos autobombas iguales, una a cada lado, y dos bomberos idénticos espalda con espalda sobre la raya
  trM = makeTruck(); trM.position.set(-6.3, 0, -9); trM.rotation.y = -Math.PI / 2; world.add(trM);
  trG = makeTruck(); trG.position.set(6.3, 0, -9); trG.rotation.y = -Math.PI / 2; world.add(trG);
  beacons = [...trM.userData.lbar, ...trG.userData.lbar];
  ffM = makeFirefighter(); ffM.position.set(-0.36, 0, 0.4); ffM.rotation.y = Math.PI + 0.75; world.add(ffM);
  ffG = makeFirefighter(); ffG.position.set(0.36, 0, 0.4); ffG.rotation.y = Math.PI - 0.75; world.add(ffG);
  labM = groundLabel('MADRID', '#ffd27a'); labM.position.set(-3.6, 0.02, -6.5); labM.scale.setScalar(0.72);
  labG = groundLabel('GRANADA', '#ffd27a'); labG.position.set(3.6, 0.02, -6.5); labG.scale.setScalar(0.72);
  // columnas de oro: abajo sueldo + destino (iguales), encima el complemento específico
  COL.bM = segment(-CX, ['#b88a2a', '#e8c46a'], 0x3a2806); COL.bG = segment(CX, ['#b88a2a', '#e8c46a'], 0x3a2806);
  COL.eM = segment(-CX, ['#d9921c', '#ffd25a'], 0x6a3c04); COL.eG = segment(CX, ['#d9921c', '#ffd25a'], 0x6a3c04);
  { const l = new THREE.PointLight(0xffd59a, 150, 0, 2); l.position.set(0, 9, CZ + 7); world.add(l); }
  // cinco guardias de 24 h que caen en el lado de Granada
  for (let i = 0; i < 5; i++) blocks.push(block24());
}

// ------------------------------------------------------------------ tiempos y cámara
let T = {}, KEYS = null;
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  T.antes = T.subio - 0.75;                              // la columna de Madrid baja a lo de antes de 2024…
  KEYS = camKeys();
}
function camKeys() {
  const K = [
    [0, [1.0, 1.0, 7.6, 0, 3.4, -20, 42]],
    [T.fuego, [-0.8, 1.15, 8.2, 0, 3.6, -22, 42]],
    [T.oposicion, [-2.2, 1.9, 9.6, 0, 3.8, -22, 44]],
    [T.cobran, [-0.8, 3.0, 10.5, 0, 2.8, -10, 42]],
    [T.cuanto, [0, 6.5, 17, 0, 4.5, -22, 44]],
    [T.granada0 + 0.3, [0.6, 8.0, 20, 0, 5.5, -26, 44]],
    [T.base - 0.2, [0, 5.0, 17, 0, 4.0, -4, 42]],
    [T.espana, [0, 6.5, 20, 0, 5.2, -4, 42]],
    [T.complemento, [1.2, 8.5, 19, 0, 7.5, -4, 40]],
    [T.madrid1, [-3.8, 10.5, 13.5, -CX, 9.5, CZ, 40]],
    [T.e27 + 1.4, [-3.2, 12.0, 13.0, -CX, 11.5, CZ, 40]],
    [T.granada1, [3.8, 10.5, 13.5, CX, 9.5, CZ, 40]],
    [T.e25 + 1.4, [3.2, 11.5, 13.0, CX, 11.0, CZ, 40]],
    [T.total, [0, 9.5, 27, 0, 8.0, -4, 44]],
    [T.granada2, [0, 10.0, 28.5, 0, 8.0, -4, 44]],
    [T.horas, [2.4, 4.2, 14.5, 2.0, 2.6, -1, 42]],
    [T.cinco, [4.6, 3.4, 10.5, 3.6, 1.0, 0.4, 42]],
    [T.porhora, [0, 6.0, 19, 0, 5.0, -4, 42]],
    [T.ypq, [-1.5, 9.0, 22, 0, 8.0, -4, 42]],
    [T.antes, [-4.0, 11.5, 15.5, -CX, 10.5, CZ, 40]],
    [T.anio, [-3.6, 13.0, 15.0, -CX, 12.0, CZ, 40]],
    [T.justo, [0, 8.0, 25, 0, 7.0, -6, 44]],
    [T.compartir + 0.6, [0, 18, 40, 0, 10, -20, 46]],
    [T.end, [0, 26, 52, 0, 12, -30, 48]],
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
  const dr = 0.06 * Math.sin(t * 0.7);                   // el dron nunca está quieto
  return pose(V(v[0] + dr, v[1] + 0.04 * Math.sin(t * 1.1), v[2]), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t
function hBase(t) { return BASE * SC * e3(pr(t, T.base - 0.1, 0.9)); }
function eMadrid(t) {                                    // específico de Madrid: sube en «Madrid: 27.800», baja a lo de antes de 2024 y vuelve a subir con «subió»
  let v = EM * e3(pr(t, T.madrid1 - 0.05, 1.3));
  if (t > T.antes - 0.05) v = mx(EM, EM0, e3(pr(t, T.antes - 0.05, 0.45)));
  if (t > T.subio - 0.05) v = mx(EM0, EM, bk(pr(t, T.subio - 0.05, 0.7)));
  return v;
}
function eGranada(t) { return EG * e3(pr(t, T.granada1 - 0.05, 1.3)); }
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => f.u.uCam.value.copy(cam.position));
  fireEnd.F.u.uTime.value = t; fireEnd.s.u.uTime.value = t; fireEnd.e.u.uTime.value = t;
  fireLight.intensity = 240 + 70 * Math.sin(t * 13) * Math.sin(t * 3.7) + 160 * Math.exp(-Math.pow((t - T.fuego - 0.1) / 0.25, 2));
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j % 2 ? 0.4 : 1)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  trM.userData.pl.intensity = trG.userData.pl.intensity = 6 + 40 * on;
  lineMat.color.setRGB(2.4, 1.7, 0.6).multiplyScalar(1 + 1.2 * Math.exp(-Math.pow((t - T.cobran - 0.1) / 0.3, 2)));
  const pm = 1 + 0.6 * Math.exp(-Math.pow((t - T.madrid0 - 0.1) / 0.25, 2)), pg = 1 + 0.6 * Math.exp(-Math.pow((t - T.granada0 - 0.1) / 0.25, 2));
  labM.material.color.setScalar(1.3 * pm); labG.material.color.setScalar(1.3 * pg);
  // columnas
  const hb = hBase(t);
  setSeg(COL.bM, 0, hb); setSeg(COL.bG, 0, hb);
  setSeg(COL.eM, hb, eMadrid(t) * SC); setSeg(COL.eG, hb, eGranada(t) * SC);
  const glowE = 0.55 + 0.9 * Math.exp(-Math.pow((t - T.especifico - 0.15) / 0.3, 2));
  COL.eM.material.emissiveIntensity = glowE + 0.9 * Math.exp(-Math.pow((t - T.subio - 0.4) / 0.35, 2)); COL.eG.material.emissiveIntensity = glowE;
  // las cinco guardias de Granada caen una detrás de otra
  blocks.forEach((b, i) => {
    const t0 = T.cinco - 0.1 + i * 0.14, k = pr(t, t0, 0.45);
    b.visible = t > t0 && t < T.fin + 0.2;
    const y = 0.45 + 7 * Math.pow(1 - k, 2) - 0.12 * Math.sin(Math.min(1, k) * Math.PI) * (k >= 1 ? 0 : 1);
    b.position.set(1.45 + i * 1.02, k >= 1 ? 0.45 : y, 1.6 - (i % 2) * 0.35); b.rotation.y = 0.25 + (1 - k) * 2 + i * 0.05;
  });
  [ffM, ffG].forEach((f, i) => { f.position.y = 0.004 * Math.sin(t * 2.1 + i); });
  if (airU) { airU.uTime.value = t; airU.uLevel.value = 1; airU.uI.value = 0.9; }
}

// ------------------------------------------------------------------ capa 2D
function proj(v) { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * W2, y: (-p.y * 0.5 + 0.5) * H2, ok: p.z < 1 }; }
const BLUE2 = '#3FB6FF', RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF';
const eur = v => Math.round(v).toLocaleString('es-ES').replace(/,/g, '.');   // 27.804
function chip(x, y, text, col, a, s = 1, icon = null, px = 56) {
  if (a <= 0.005) return;
  g.save(); g.font = `400 ${px}px Bebas`; const tw = g.measureText(text).width, w = tw + (icon ? 100 : 60), h = px * 1.45;
  const hw = Math.min(W2 / 2 - 10, w * s / 2 + 24);
  g.globalAlpha = a; g.translate(cl(x, hw, W2 - hw), cl(y, 470, H2 - 230)); g.scale(s, s);
  rr(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  const cx = -w / 2 + 46;
  if (icon === 'e') { g.beginPath(); g.arc(cx, 0, 21, 0, 7); g.strokeStyle = col; g.lineWidth = 4; g.stroke(); txt('€', cx, 12, 34, col, 400, 'center', 'Bebas'); }
  else if (icon === 'c') { g.beginPath(); g.arc(cx, 0, 21, 0, 7); g.strokeStyle = col; g.lineWidth = 4; g.stroke(); g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, -13); g.moveTo(cx, 0); g.lineTo(cx + 10, 5); g.stroke(); }
  else if (icon === 'h') { g.beginPath(); g.moveTo(cx, -24); g.lineTo(cx, 24); g.moveTo(cx - 12, -12); g.lineTo(cx, -24); g.lineTo(cx + 12, -12); g.strokeStyle = col; g.lineWidth = 5; g.stroke(); }
  txt(text, icon ? 24 : 0, px * 0.36, px, '#F4F6F8', 400, 'center', 'Bebas');
  g.restore();
}
function stamp(text, x, y, col, a, px = 170, rot = -0.06) {
  if (a <= 0.005) return;
  const k = bk(cl(a * 1.4));
  g.save(); g.globalAlpha = cl(a * 1.6); g.translate(x, y); g.rotate(rot); g.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
  g.font = `400 ${px}px Bebas`; const w = g.measureText(text).width + 80;
  rr(-w / 2, -px * 0.62, w, px * 1.06, 26); g.fillStyle = 'rgba(8,8,10,0.55)'; g.fill(); g.strokeStyle = col; g.lineWidth = 10; g.stroke();
  g.shadowColor = col; g.shadowBlur = 40; txt(text, 0, px * 0.33, px, col, 400, 'center', 'Bebas'); g.shadowBlur = 0;
  g.restore();
}
function payslip(x, y, a, glow) {                        // nómina que cae y se enciende
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a * 1.3); g.translate(x, y - (1 - eO(a)) * 120); g.rotate(-0.08 + 0.05 * Math.sin(a * 3));
  if (glow > 0) { g.shadowColor = GOLD2; g.shadowBlur = 50 * glow; }
  rr(-120, -150, 240, 300, 18); g.fillStyle = '#f4efe2'; g.fill(); g.shadowBlur = 0;
  txt('NÓMINA', 0, -96, 52, '#2a2a30', 400, 'center', 'Bebas');
  for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(40,40,48,0.25)'; g.fillRect(-90, -60 + i * 34, 120 - (i % 2) * 40, 10); g.fillRect(50, -60 + i * 34, 40, 10); }
  txt('€ ?', 0, 128, 58, glow > 0 ? '#c88a10' : '#6a6a74', 400, 'center', 'Bebas');
  g.restore();
}
function choice(t) {                                     // «¿Madrid o Granada?»: dos botones gigantes
  const a = sm(T.justo - 0.15, T.justo + 0.2, t) * (1 - sm(T.fin - 0.3, T.fin + 0.05, t));
  if (a <= 0.005) return;
  const pm = Math.exp(-Math.pow((t - T.madrid3 - 0.12) / 0.2, 2)), pg = Math.exp(-Math.pow((t - T.granada3 - 0.12) / 0.2, 2));
  for (const [i, s, p] of [[0, 'MADRID', pm], [1, 'GRANADA', pg]]) {
    const k = bk(pr(t, T.justo - 0.1 + i * 0.12, 0.45)), cx = 290 + i * 500, cy = 1180;
    g.save(); g.globalAlpha = a * cl(k * 1.3); g.translate(cx + (i ? 1 : -1) * (1 - cl(k)) * 500, cy); const sc = 1 + 0.12 * p; g.scale(sc, sc);
    rr(-225, -95, 450, 190, 95); g.fillStyle = 'rgba(9,12,17,0.9)'; g.fill(); g.lineWidth = 6 + 6 * p; g.strokeStyle = GOLD2; g.stroke();
    txt(s, 0, 36, 110, '#F2F5F8', 400, 'center', 'Bebas'); g.restore();
  }
  g.save(); g.globalAlpha = a; txt('O', 540, 1218, 80, GOLD2, 400, 'center', 'Bebas'); g.restore();
  const ce = sm(T.escribe - 0.1, T.escribe + 0.2, t) * (1 - sm(T.fin - 0.3, T.fin + 0.05, t));
  if (ce > 0) { g.save(); g.globalAlpha = ce; g.translate(540, 1480); rr(-330, -54, 660, 108, 54); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 3; g.stroke();
    txt('💬  ESCRÍBELO EN COMENTARIOS', 0, 19, 52, '#F2F5F8', 400, 'center', 'Bebas'); g.restore(); }
  stamp('¿TE PARECE JUSTO?', 540, 900, GOLD2, sm(T.justo - 0.15, T.justo + 0.15, t) * (1 - sm(T.fin - 0.3, T.fin, t)), 120, -0.03);
}
function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const cityA = (1 - sm(T.base - 0.4, T.base, t));
  const pM = 1 + 0.25 * Math.exp(-Math.pow((t - T.madrid0 - 0.1) / 0.2, 2)), pG = 1 + 0.25 * Math.exp(-Math.pow((t - T.granada0 - 0.1) / 0.2, 2));
  chip(230, 560, '◀ MADRID', GOLD2, cityA * sm(0.05, 0.35, t), pM, null, 64); chip(850, 560, 'GRANADA ▶', GOLD2, cityA * sm(0.05, 0.35, t), pG, null, 64);
  // 1. nóminas: «pero no cobran lo mismo»
  const ns = sm(T.cobran - 0.2, T.cobran + 0.35, t) * (1 - sm(T.cuanto + 0.6, T.cuanto + 1.0, t));
  payslip(300, 760, ns, 0); payslip(780, 760, ns, 1);
  stamp('NO COBRAN LO MISMO', 540, 1180, GOLD2, sm(T.mismo3 - 0.25, T.mismo3, t) * (1 - sm(T.cuanto - 0.2, T.cuanto + 0.1, t)), 100, -0.04);
  // 2. «¿Cuánto en Madrid… y en Granada?»
  const q1 = sm(T.madrid0 - 0.2, T.madrid0 + 0.1, t) * (1 - sm(T.igual - 0.3, T.igual, t)), q2 = sm(T.granada0 - 0.2, T.granada0 + 0.1, t) * (1 - sm(T.igual - 0.3, T.igual, t));
  chip(300, 900, 'MADRID: ¿ € ?', GOLD2, q1, 1.15, 'e', 62); chip(780, 900, 'GRANADA: ¿ € ?', GOLD2, q2, 1.15, 'e', 62);
  // 3. sueldo base: el Estado, igual
  const tM = proj(V(-CX, hBase(t) + 0.2, CZ)), tG = proj(V(CX, hBase(t) + 0.2, CZ));
  stamp('ESTADO', 540, 560, CYAN2, sm(T.estado - 0.1, T.estado + 0.2, t) * (1 - sm(T.novecientos - 0.3, T.novecientos, t)), 150, -0.05);
  const bA = sm(T.base, T.base + 0.4, t) * (1 - sm(T.diferencia - 0.3, T.diferencia, t));
  chip(tM.x, tM.y - 60, 'SUELDO BASE', CYAN2, bA, 1.0, null, 50); chip(tG.x, tG.y - 60, 'SUELDO BASE', CYAN2, bA, 1.0, null, 50);
  stamp('=', 540, (tM.y + tG.y) / 2 - 60, CYAN2, bA * sm(T.igual - 0.1, T.igual + 0.2, t), 140, 0);
  chip(540, 1500, '900 €/MES (2026)', CYAN2, sm(T.novecientos - 0.1, T.novecientos + 0.2, t) * (1 - sm(T.diferencia - 0.3, T.diferencia, t)), 1.35, 'e', 64);
  chip(540, 1660, 'IGUAL EN TODA ESPAÑA', CYAN2, sm(T.espana - 0.15, T.espana + 0.15, t) * (1 - sm(T.diferencia - 0.3, T.diferencia, t)), 1.05, null, 54);
  // 4-5. complemento específico
  const topM = proj(V(-CX, hBase(t) + eMadrid(t) * SC + 0.4, CZ)), topG = proj(V(CX, hBase(t) + eGranada(t) * SC + 0.4, CZ));
  stamp('COMPLEMENTO ESPECÍFICO', 540, 1540, GOLD2, sm(T.especifico - 0.15, T.especifico + 0.15, t) * (1 - sm(T.madrid1 - 0.3, T.madrid1, t)), 86, -0.03);
  chip(540, 1720, 'LO PONE CADA AYUNTAMIENTO', GOLD2, sm(T.ayuntamiento - 0.2, T.ayuntamiento + 0.1, t) * (1 - sm(T.madrid1 - 0.3, T.madrid1, t)), 1.0, null, 50);
  const aM = sm(T.madrid1 - 0.1, T.madrid1 + 0.2, t) * (1 - sm(T.total - 0.3, T.total, t)), aG = sm(T.granada1 - 0.1, T.granada1 + 0.2, t) * (1 - sm(T.total - 0.3, T.total, t));
  chip(275, Math.min(topM.y, topG.y) - 60, `MADRID ${eur(Math.min(EM, eMadrid(t)))} €`, GOLD2, aM, 1.0, 'e', 54);
  chip(805, Math.min(topM.y, topG.y) - 60, `GRANADA ${eur(eGranada(t))} €`, GOLD2, aG, 1.0, 'e', 54);
  chip(540, Math.min(topM.y, topG.y) + 20, 'AL AÑO', 'rgba(255,255,255,0.45)', Math.max(aM, aG), 0.8, null, 44);
  // 6. el total
  const aT1 = sm(T.t47 - 0.15, T.t47 + 0.2, t) * (1 - sm(T.parece + 1.0, T.parece + 1.4, t)), aT2 = sm(T.t44 - 0.15, T.t44 + 0.2, t) * (1 - sm(T.parece + 1.0, T.parece + 1.4, t));
  chip(275, Math.min(topM.y, topG.y) - 60, '≈ 47.100 €', GOLD2, aT1, 1.2, 'e', 62); chip(805, Math.min(topM.y, topG.y) - 60, '≈ 44.700 €', GOLD2, aT2, 1.2, 'e', 62);
  chip(540, 1700, 'BRUTOS · IMPORTES DE 2024 · SIN ANTIGÜEDAD', 'rgba(255,255,255,0.45)', sm(T.brutos - 0.2, T.brutos + 0.1, t) * (1 - sm(T.parece + 1.0, T.parece + 1.4, t)), 0.8, null, 44);
  chip(540, 1480, 'DIFERENCIA: ≈ 2.400 €/AÑO', RED2, sm(T.parece - 0.15, T.parece + 0.2, t) * (1 - sm(T.horas - 0.3, T.horas, t)), 1.1, null, 56);
  // 7. las horas
  const aH = sm(T.horas - 0.15, T.horas + 0.15, t) * (1 - sm(T.porhora - 0.3, T.porhora, t));
  chip(300, 720, 'MADRID: 1.508 H/AÑO', CYAN2, aH, 1.05, 'c', 54); chip(780, 720, 'GRANADA: 1.626 H/AÑO', RED2, aH * sm(T.trabajan - 0.2, T.trabajan + 0.1, t), 1.05, 'c', 54);
  stamp('+118 H ≈ 5 GUARDIAS', 540, 1540, RED2, sm(T.guardias - 0.1, T.guardias + 0.2, t) * (1 - sm(T.porhora - 0.3, T.porhora, t)), 104, -0.04);
  // 8. por hora
  const a31 = sm(T.h31 - 0.1, T.h31 + 0.2, t) * (1 - sm(T.ypq - 0.3, T.ypq, t)), a27 = sm(T.h27 - 0.1, T.h27 + 0.2, t) * (1 - sm(T.ypq - 0.3, T.ypq, t));
  stamp('31 €/H', 290, 1180, GOLD2, a31, 150, -0.05); stamp('27 €/H', 790, 1180, RED2, a27, 150, 0.04);
  chip(290, 1360, 'MADRID', GOLD2, a31, 0.9, null, 50); chip(790, 1360, 'GRANADA', RED2, a27, 0.9, null, 50);
  // 9. por qué: cada ayuntamiento, su presupuesto y su negociación; Madrid +10 % en 2024
  const w9 = t < T.subio - 0.9 ? 1 : 0;
  chip(540, 1440, 'COMPLEMENTOS = CADA AYUNTAMIENTO', GOLD2, sm(T.paga - 0.3, T.paga, t) * (1 - sm(T.antes - 0.3, T.antes, t)), 1.0, null, 52);
  chip(540, 1580, '+ SU PRESUPUESTO', GOLD2, sm(T.presupuesto - 0.2, T.presupuesto + 0.1, t) * (1 - sm(T.antes - 0.3, T.antes, t)), 1.0, 'e', 52);
  chip(540, 1720, '+ LO QUE NEGOCIAN SUS BOMBEROS', GOLD2, sm(T.negocia - 0.2, T.negocia + 0.1, t) * (1 - sm(T.antes - 0.3, T.antes, t)), 1.0, null, 52);
  const topM2 = proj(V(-CX, hBase(t) + eMadrid(t) * SC + 0.4, CZ));
  chip(topM2.x, topM2.y + 70, 'ANTES DE 2024: 25.276 €', 'rgba(255,255,255,0.6)', sm(T.antes - 0.1, T.antes + 0.15, t) * (1 - sm(T.justo - 0.4, T.justo - 0.1, t)), 0.95, null, 48);
  stamp('+10 % (2024)', 540, 1500, GOLD2, sm(T.diez - 0.1, T.diez + 0.2, t) * (1 - sm(T.justo - 0.4, T.justo - 0.1, t)), 140, -0.05);
  // 10. ¿Madrid o Granada?
  choice(t);
  share(t);
  closing(t);
  // un punto casi invisible: si la capa solo se borra, Chrome no la vuelve a presentar (rótulos del fotograma anterior)
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
  finMat.uniforms.uFlash.value = Math.exp(-Math.pow((t - T.cobran - 0.03) / 0.08, 2)) * 0.25; finMat.uniforms.uFlashCol.value.setRGB(1, 0.8, 0.4);
  finMat.uniforms.uDim.value = (t >= T.fin ? mx(1, 0.5, sm(T.compartir - 0.2, T.compartir + 0.3, t)) : 1) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 30.0);

(async () => {
  try {
    while (!_r2d) await new Promise(r => setTimeout(r, 30));
    await document.fonts.ready;
    NOISE = noiseTex(); mats();
    setupTimes(); buildWorld();
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'sueldos: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
