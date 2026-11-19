// «Coche volcado: ¿cuál es la más estable?» — idea de Adrián (Notion «VIERNES 20. ¿Sabes cómo estabilizamos un vehículo?»);
// 30–40 s. De noche, tres accidentes en la misma carretera: A sobre sus ruedas (cuñas y calzos, 3–4 apoyos), B de lado
// (puntales con cuchilla y cinta) y C boca abajo (cuñas entre el capó y el suelo). Regla: se estabiliza tal como se
// encuentra (el fantasma que lo pone derecho: NO). Cierre: ¿cuál es la más estable? Todo depende solo de t.
// Motor de projects/bomberados_escala/web/escala.js.
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






// ================================================================== tres accidentes en la misma carretera, de noche: un coche en cada posición
const world = new THREE.Group(); scene.add(world);
scene.fog.density = 0.012;
const RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D';
const COLS = ['#FF7A1A', '#2DD4BF', '#F0457A', '#8B7CF6'];
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
const PA = V(-9.5, 0, -2.4), PB = V(0, 0, 0), PC = V(9.5, 0, 2.4);         // A: sobre sus ruedas · B: de lado · C: boca abajo
const CH = 1.46;                                                              // altura del coche
let truck, beacons = [], carA, carB, carC, pivA, pivB, pivC, ghost, ghostM, blink = [], winM;
let chocks = [], blocks = [], struts = [], wedgesC = [], strapM;

function between(m, a, b) {
  const d = b.clone().sub(a), L = Math.max(1e-4, d.length());
  m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
}
function face(o, dir) { o.rotation.y = Math.atan2(-dir.x, -dir.z); }
// el coche (origen en el suelo, en el centro; +X hacia delante, +Z a su izquierda)
function makeCar(col, o = {}) {
  const G = new THREE.Group(), ud = { wheels: [] };
  const body = o.mat || new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.4 });
  const glass = o.mat || new THREE.MeshStandardMaterial({ color: 0x0b0e13, roughness: 0.12, metalness: 0.5 });
  const dark = o.mat || new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.9 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, p = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = !o.mat; m.receiveShadow = !o.mat; p.add(m); return m; };
  add(new RoundedBoxGeometry(4.2, 0.62, 1.8, 4, 0.16), body, 0, 0.56, 0);
  add(new RoundedBoxGeometry(2.3, 0.6, 1.62, 3, 0.14), glass, -0.25, 1.15, 0);
  add(new RoundedBoxGeometry(1.75, 0.07, 1.6, 2, 0.03), body, -0.3, 1.43, 0);
  for (const s of [-1, 1]) for (const x of [0.78, -0.3, -1.32]) add(new THREE.BoxGeometry(0.1, 0.55, 0.06), body, x + (x > 0 ? -0.05 : 0), 1.15, s * 0.79, 0, 0, x > 0 ? -0.45 : x < -1 ? 0.35 : 0);
  add(new THREE.BoxGeometry(4.24, 0.12, 1.84), dark, 0, 0.3, 0);                    // bajos
  if (!o.mat) {                                                                    // tubo de escape, depósito y ejes (se ven cuando está volcado)
    add(new THREE.CylinderGeometry(0.045, 0.045, 3.4, 10), M.steel, -0.3, 0.215, -0.45, 0, 0, Math.PI / 2);
    add(new RoundedBoxGeometry(0.9, 0.12, 0.7, 2, 0.04), M.black, -0.6, 0.2, 0.2);
    for (const x of [1.35, -1.35]) add(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 10), M.steel, x, 0.34, 0, Math.PI / 2, 0, 0);
  }
  if (!o.mat) {
    add(new THREE.BoxGeometry(0.05, 0.12, 1.3), GLOW(0xfff0d0, 0.5), 2.11, 0.66, 0);
    add(new THREE.BoxGeometry(0.05, 0.1, 1.4), GLOW(0xd01818, 0.6), -2.11, 0.7, 0);
    for (const [x, z] of [[2.06, 0.84], [2.06, -0.84], [-2.06, 0.84], [-2.06, -0.84]]) { const b = add(new THREE.BoxGeometry(0.14, 0.12, 0.2), GLOW(0xff8a1a, 1), x, 0.68, z); blink.push(b.material); }
  }
  for (const [x, z] of [[1.35, 0.86], [-1.35, 0.86], [1.35, -0.86], [-1.35, -0.86]]) {
    const w = new THREE.Group(); w.position.set(x, 0.34, z); G.add(w); ud.wheels.push(w);
    add(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 22), o.mat || M.rubber, 0, 0, 0, Math.PI / 2, 0, 0, w);
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 6), o.mat || M.steel, 0, 0, 0, Math.PI / 2, 0, 0, w);
  }
  G.userData = ud; return G;
}
// cuña (prisma triangular de polietileno amarillo): origen en el suelo, el filo hacia +X
let wedgeGeo, stepGeo, polyM;
function makeWedge(len = 0.42, h = 0.14, w = 0.2) {
  const s = new THREE.Shape(); s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(-len / 2, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1 }); g.translate(0, 0, -w / 2);
  const m = new THREE.Mesh(g, polyM); m.castShadow = true; return m;
}
function makeStep(h = 0.24) {      // bloque escalonado (tres peldaños), puesto invertido: la parte alta, hacia el coche
  const G = new THREE.Group(), st = h / 3;
  [[0.62, 0], [0.42, st], [0.22, 2 * st]].forEach(([L, y]) => { const b = new THREE.Mesh(new RoundedBoxGeometry(0.3, st, L, 1, 0.01), polyM); b.position.set(0, y + st / 2, -(0.62 - L) / 2); b.castShadow = true; G.add(b); });
  return G;
}
// puntal: placa en el suelo, tubo exterior naranja, tubo interior que sale, cabeza con cuña y cuchilla
function makeStrut() {
  const orange = new THREE.MeshStandardMaterial({ color: 0xe8661a, roughness: 0.45, metalness: 0.3, emissive: 0xe8661a, emissiveIntensity: 0.08 });
  const S = { o: new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 14), orange), i: new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1, 12), M.chrome),
    plate: new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.04, 0.34, 1, 0.01), M.black), head: new THREE.Group(), strap: new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.006), strapM),
    ratchet: new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.08, 0.1, 1, 0.02), M.steel), mat: orange };
  const plateW = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.12), M.steel); plateW.position.y = 0.02; S.head.add(plateW);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.1), new THREE.MeshStandardMaterial({ color: 0xd8dde4, metalness: 0.9, roughness: 0.2, emissive: 0xffc83d, emissiveIntensity: 0 })); blade.position.y = 0.09; S.head.add(blade); S.blade = blade;
  for (const k in S) if (S[k].isObject3D) { S[k].castShadow = true; world.add(S[k]); }
  return S;
}
function winTex(person) {
  return canvasTex(256, 128, (x) => {
    const gr = x.createLinearGradient(0, 0, 256, 128); gr.addColorStop(0, '#ffd9a0'); gr.addColorStop(1, '#e79a4a'); x.fillStyle = gr; x.fillRect(0, 0, 256, 128);
    if (!person) return;
    x.fillStyle = 'rgba(20,12,6,0.88)'; x.beginPath(); x.ellipse(80, 128, 50, 62, 0, 0, 7); x.fill(); x.beginPath(); x.arc(80, 54, 28, 0, 7); x.fill();
    x.save(); x.translate(178, 70); x.rotate(-0.2); x.beginPath(); x.ellipse(0, 8, 21, 25, 0, 0, 7); x.fill();
    for (let i = 0; i < 4; i++) { x.save(); x.rotate(-0.5 + i * 0.3); x.fillRect(-6, -52, 12, 44); x.beginPath(); x.arc(0, -52, 6, 0, 7); x.fill(); x.restore(); }
    x.save(); x.rotate(1.25); x.fillRect(-6, -40, 12, 34); x.restore(); x.restore();
  });
}

function buildWorld() {
  world.add(new THREE.HemisphereLight(0x3a4c76, 0x0a0705, 0.7));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.45); moon.position.set(-14, 30, 20); world.add(moon);
  polyM = new THREE.MeshStandardMaterial({ color: 0xf2c21a, roughness: 0.55, emissive: 0xf2c21a, emissiveIntensity: 0.12 });
  strapM = new THREE.MeshStandardMaterial({ color: 0xf2c21a, roughness: 0.6, emissive: 0xf2c21a, emissiveIntensity: 0.1 });
  // la carretera (a lo largo de X), el arcén, la bionda y el campo
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#17181b'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 16 + rnd(i) * 26; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(30, 4);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(140, 14), new THREE.MeshStandardMaterial({ map: asph, color: 0x6a6a6a, roughness: 0.42, metalness: 0.2 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 0); road.receiveShadow = true; world.add(road);
  const field = new THREE.Mesh(new THREE.PlaneGeometry(140, 80), new THREE.MeshStandardMaterial({ color: 0x1a2416, roughness: 1 })); field.rotation.x = -Math.PI / 2; field.position.set(0, -0.02, -40); field.receiveShadow = true; world.add(field);
  const field2 = field.clone(); field2.position.z = 47; world.add(field2);
  const lineM = new THREE.MeshStandardMaterial({ color: 0x9a9a90, roughness: 0.5, emissive: 0x0e0e0c });
  for (const z of [-6.3, 6.3]) { const l = new THREE.Mesh(new THREE.BoxGeometry(140, 0.012, 0.14), lineM); l.position.set(0, 0.008, z); world.add(l); }
  for (let i = 0; i < 18; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(4, 0.012, 0.14), lineM); d.position.set(-68 + i * 8, 0.008, 0.0); if (Math.abs(-68 + i * 8) > 2.5 && Math.abs(-68 + i * 8 - 9.5) > 2.5 && Math.abs(-68 + i * 8 + 9.5) > 2.5) world.add(d); }
  const steel = new THREE.MeshStandardMaterial({ color: 0x5b6068, metalness: 0.8, roughness: 0.4 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(140, 0.32, 0.07), steel); rail.position.set(0, 0.62, -7.3); world.add(rail);
  for (let x = -70; x <= 70; x += 2) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), steel); p.position.set(x, 0.375, -7.25); world.add(p); }
  const barkM = new THREE.MeshStandardMaterial({ color: 0x2c2117, roughness: 1 }), leafB = new THREE.MeshStandardMaterial({ color: 0x15241a, roughness: 1, flatShading: true });
  for (let i = 0; i < 16; i++) { const x = -60 + i * 8 + rnd(i) * 3, z = -12 - rnd(i * 3) * 10, t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 4, 8), barkM); t.position.set(x, 2, z); world.add(t);
    for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + rnd(i * 5 + k) * 0.8, 0), leafB); f.position.set(x + (rnd(i * 7 + k) - 0.5) * 2, 4.4 + rnd(i * 9 + k) * 1.4, z + (rnd(i * 11 + k) - 0.5) * 2); world.add(f); } }
  // los tres coches
  carA = makeCar(0x6f7883); pivA = new THREE.Group(); pivA.position.copy(PA); pivA.add(carA); world.add(pivA);
  carB = makeCar(0xb3241c); pivB = new THREE.Group(); pivB.position.set(PB.x, 0.9, PB.z); pivB.rotation.x = -Math.PI / 2; pivB.add(carB); world.add(pivB);
  carC = makeCar(0x2a55b0); pivC = new THREE.Group(); pivC.position.set(PC.x, CH, PC.z); pivC.rotation.x = Math.PI; pivC.add(carC); world.add(pivC);
  // en el coche de lado: la ventanilla de arriba con alguien dentro y una luz
  winM = new THREE.MeshBasicMaterial({ map: winTex(true), fog: false });
  const w = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.42), winM); w.position.set(-0.05, 1.12, 0.815); carB.add(w);
  const inL = new THREE.PointLight(0xffc890, 4, 5, 2); inL.position.set(0, 1.1, 0.3); carB.add(inL);
  // el coche fantasma (lo que NO se hace: ponerlo derecho)
  ghostM = new THREE.MeshBasicMaterial({ color: 0xff3b2e, transparent: true, opacity: 0, depthWrite: false, fog: false });
  ghost = new THREE.Group(); ghost.position.set(PB.x, 0.9, PB.z); const gc = makeCar(0, { mat: ghostM }); ghost.add(gc); world.add(ghost); ghost.visible = false;
  // A: cuñas en dos ruedas (las de este lado) y cuatro calzos bajo el chasis, junto a los pilares A y C
  for (const [x, dir] of [[1.35, 1], [-1.35, -1]]) { const c = makeWedge(); c.userData = { x: x + dir * 0.48, dir }; world.add(c); chocks.push(c); }
  for (const [x, s] of [[0.75, 1], [-1.15, 1], [0.75, -1], [-1.15, -1]]) { const b = makeStep(0.25); b.userData = { x, s }; world.add(b); blocks.push(b); }
  // B: cuatro puntales (dos por cada cara), con su cinta
  for (const [x, s] of [[0.85, 1], [-1.25, 1], [0.85, -1], [-1.25, -1]]) { const S = makeStrut(); S.x = x; S.s = s; struts.push(S); }
  // C: cuñas (sobre un bloque) entre el capó y el suelo, y entre el maletero y el suelo
  for (const [x, z] of [[1.55, 0.55], [1.55, -0.55], [-1.75, 0.55], [-1.75, -0.55]]) { const G = new THREE.Group(); const b = makeStep(0.4); b.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2; G.add(b); const c = makeWedge(0.42, 0.17, 0.24); c.position.y = 0.4; c.rotation.y = x > 0 ? Math.PI : 0; G.add(c); G.userData = { x, z }; world.add(G); wedgesC.push(G); }
  // la autobomba (al otro lado, mirando hacia el coche de lado), su foco y la torre de luz
  truck = makeTruck(); truck.rotation.y = Math.PI; truck.position.set(5.0, 0, -5.0); world.add(truck);
  truck.traverse(o => { if (o.isMesh) o.castShadow = true; }); beacons = truck.userData.lbar;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4, 10), steel); mast.position.set(-4.5, 2, 6.8); world.add(mast);
  const lh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.2), GLOW(0xfff4e0, 2.2)); lh.position.set(-4.45, 4.05, 6.7); lh.lookAt(0, 0.5, 0); world.add(lh);
  const work = new THREE.SpotLight(0xfff2e0, 160, 40, 0.75, 0.6, 1.3); work.position.set(-4.4, 4.0, 6.6); work.target.position.set(0, 0.6, 0);
  work.castShadow = true; work.shadow.mapSize.set(2048, 2048); work.shadow.bias = -0.0004; world.add(work, work.target);
  const work2 = new THREE.SpotLight(0xfff2e0, 110, 40, 0.6, 0.6, 1.3); work2.position.set(4.5, 4.5, 9.5); work2.target.position.set(PC.x - 1, 0.5, PC.z);
  work2.castShadow = true; work2.shadow.mapSize.set(1024, 1024); work2.shadow.bias = -0.0004; world.add(work2, work2.target);
  const work3 = new THREE.SpotLight(0xfff2e0, 70, 40, 0.6, 0.6, 1.3); work3.position.set(-14.5, 4.5, 4.5); work3.target.position.set(PA.x + 1, 0.4, PA.z);
  work3.castShadow = true; work3.shadow.mapSize.set(1024, 1024); work3.shadow.bias = -0.0004; world.add(work3, work3.target);
  // dos bomberos junto al coche de lado
  for (const [x, z, d] of [[-3.6, -3.6, V(1, 0, 0.6)], [3.4, -3.9, V(-1, 0, 0.7)]]) { const f = makeFirefighter(); f.position.set(x, 0, z); face(f, d); world.add(f); f.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
}

// ------------------------------------------------------------------ tiempos y cámara (un dron que va de un coche a otro)
let T = {}, KEYS = null, KH = null;
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  T.blk = [T.calzos + 0.25, T.chasis + 0.25, T.tres - 0.05, T.apoyos + 0.45];        // cuándo encaja cada calzo (se cuentan 1, 2, 3… y 4)
  T.s0 = T.puntales - 0.15; T.s1 = T.cuchilla + 0.15;                                  // los puntales se levantan y se alargan hasta tocar
  T.bite = T.muerde + 0.05;                                                            // la cuchilla muerde la chapa
  KEYS = camKeys(); KH = KEYS.map(k => [k[0], k[2]]);
}
const rockB = t => 1 - sm(T.puntales + 0.2, T.bite + 0.1, t);                         // el coche de lado se balancea hasta que lo sujetan
const bounceA = t => 1 - sm(T.blk[0] - 0.2, T.blk[2], t);
const ANCH = { w: () => V(0, 0, 0), A: () => PA.clone(), B: () => PB.clone(), C: () => PC.clone() };
function camKeys() {
  const K = [
    [0, 'B', [4.6, 3.6, 2.2, 0.3, 1.2, -0.6, 44]],                  // el coche de lado, de frente: el morro, el parabrisas, las ruedas girando
    [T.dentro + 0.3, 'B', [1.6, 3.9, 1.0, 0.0, 1.75, -0.5, 40]],     // alguien dentro (la ventanilla de arriba)
    [T.mover + 0.1, 'B', [5.6, 3.6, 4.0, 0.0, 1.0, -0.6, 46]],       // no se puede mover: se balancea
    [T.milimetro + 0.6, 'B', [5.8, 3.7, 4.2, 0.0, 1.0, -0.6, 46]],
    [T.derecho + 0.2, 'B', [5.4, 3.6, 7.4, 0.0, 1.2, -0.5, 48]],     // el fantasma que lo pone derecho: NO
    [T.encuentras + 0.2, 'B', [5.2, 3.4, 7.2, 0.0, 1.1, -0.5, 48]],
    [T.ruedas + 0.3, 'A', [3.4, 2.4, 5.0, 0, 0.5, 0.5, 46]],         // A: sobre sus ruedas
    [T.ruedas2 + 0.2, 'A', [3.0, 1.2, 3.6, 1.0, 0.3, 0.8, 42]],      // las cuñas en las ruedas
    [T.chasis + 0.3, 'A', [1.9, 0.9, 3.4, -0.2, 0.25, 0.6, 42]],     // los calzos bajo el chasis
    [T.apoyos + 0.5, 'A', [3.4, 3.6, 4.6, -0.1, 0.2, 0.0, 46]],      // 1, 2, 3… y 4 apoyos
    [T.lado + 0.4, 'B', [3.8, 2.9, 5.6, 0.0, 1.0, 0.0, 46]],         // B: de lado, los puntales
    [T.cuchilla + 0.2, 'B', [2.4, 2.4, 2.4, 0.85, 1.5, -0.2, 40]],   // la cuchilla
    [T.chapa + 0.2, 'B', [2.6, 2.5, 2.7, 0.6, 1.4, -0.2, 40]],
    [T.boca + 0.3, 'C', [4.4, 2.3, 4.8, 0.6, 0.6, 0.0, 46]],         // C: boca abajo
    [T.capo + 0.2, 'C', [4.4, 1.3, 3.7, 1.3, 0.45, 0.4, 44]],        // las cuñas entre el capó y el suelo
    [T.suelo + 0.4, 'C', [4.6, 1.4, 3.9, 1.3, 0.45, 0.4, 44]],
    [T.tres6 + 0.2, 'w', [24, 26, 5, 0, 0, 0, 44]],                  // los tres, desde arriba (A arriba, B en medio, C abajo)
    [T.comenta + 0.3, 'w', [25, 27, 5.5, 0, 0, 0, 44]],
    [T.compartir + 0.6, 'w', [27, 30, 7, 0, 0, 0, 46]],
    [T.end, 'w', [28, 32, 8, 0, 0, 0, 46]],
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
  g.save(); g.globalAlpha = cl(a); g.translate(cl(x, 200, W2 - 200), cl(y, 790, H2 - 300)); g.scale(s, s);
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
  const lx = o.at ? o.at[0] : cl(q.x + dx, 200, W2 - 200), ly = o.at ? o.at[1] : cl(q.y + dy, 790, H2 - 300);
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
  const n = KEYS.length; let i = 0; while (i < n - 2 && t > KEYS[i + 1][0]) i++;
  const v = hermite(KH, t);
  let A;
  if (KEYS[i][1] === KEYS[i + 1][1]) A = ANCH[KEYS[i][1]](t);
  else { const u = cl((t - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0])), s = u * u * u * (u * (u * 6 - 15) + 10); A = ANCH[KEYS[i][1]](t).lerp(ANCH[KEYS[i + 1][1]](t), s); }
  const sh = Math.exp(-Math.pow((t - T.bite - 0.05) / 0.12, 2)) * 0.025;
  return pose(V(v[0] + A.x + sh * Math.sin(t * 91), v[1] + A.y + sh * Math.cos(t * 77), v[2] + A.z), V(v[3] + A.x, v[4] + A.y, v[5] + A.z), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t (todo depende solo de t)
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
const _q = new THREE.Quaternion();
function strutState(S, t) {
  const d = S.s > 0 ? 0 : 0.3, base = V(PB.x + S.x, 0.02, PB.z + (S.s > 0 ? 1.4 : -2.95)), contact = V(PB.x + S.x, 1.62, PB.z + (S.s > 0 ? -0.2 : -1.38));
  const ku = e3(pr(t, T.s0 + d, 0.8)), ke = e3(pr(t, T.s0 + d + 0.55, Math.max(0.3, T.s1 - T.s0 - 0.55))), L = contact.distanceTo(base);
  const d1 = contact.clone().sub(base).normalize(), d0 = V(0, 0.04, S.s > 0 ? -1 : 1).normalize(), dir = d0.clone().lerp(d1, ku).normalize();
  const reach = 1.25 + (L - 1.25 - 0.1) * ke, tip = base.clone().addScaledVector(dir, reach);
  return { base, contact, dir, tip, on: t > T.s0 + d - 0.12, pop: bk(pr(t, T.s0 + d - 0.12, 0.3)), d };
}
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => { f.u.uCam.value.copy(cam.position); f.u.uTime.value = t; });
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = 8 + 70 * on;
  const bl = (t % 0.9) < 0.45 ? 2.6 : 0.12; blink.forEach(m => m.color.setRGB(bl, 0.5 * bl, 0.06 * bl));
  winM.color.setScalar(0.85 + 0.1 * Math.sin(t * 3.1));
  // B: de lado, se balancea (las ruedas aún giran) hasta que los puntales lo sujetan
  const rb = rockB(t);
  pivB.rotation.x = -Math.PI / 2 + 0.05 * rb * Math.sin(t * 3.1); pivB.position.y = 0.9 + 0.02 * rb * Math.sin(t * 4.7 + 1); pivB.position.z = PB.z + 0.03 * rb * Math.sin(t * 2.3);
  const spin = 7 * (1 - Math.exp(-t / 5));
  carB.userData.wheels.forEach((w, i) => { w.rotation.z = -spin * (1 + 0.1 * i); });
  carC.userData.wheels.forEach((w, i) => { w.rotation.z = -0.6 * spin * (1 + 0.15 * i); });
  // el fantasma: lo que NO se hace (ponerlo derecho)
  const ga = sm(T.nunca - 0.25, T.nunca, t) * (1 - sm(T.estabiliza - 0.1, T.estabiliza + 0.3, t));
  ghost.visible = ga > 0.01;
  if (ghost.visible) { const th = -Math.PI / 2 + (Math.PI / 2 - 0.3) * e3(pr(t, T.nunca - 0.1, T.derecho + 0.35 - T.nunca + 0.1)); ghost.rotation.x = th; ghost.position.y = 0.9 * Math.abs(Math.sin(th)); ghostM.opacity = 0.42 * ga * (0.8 + 0.2 * Math.sin(t * 9)); }
  // A: sobre sus ruedas (bota en la suspensión hasta que entran los calzos)
  pivA.position.y = 0.018 * bounceA(t) * Math.sin(t * 6.3);
  chocks.forEach((c, i) => { const k = e3(pr(t, T.cunas3 - 0.15 + 0.35 * i, 0.45)); c.visible = k > 0.001; c.position.set(PA.x + c.userData.x, 0, PA.z + 0.86 + (1 - k) * 1.3); c.rotation.y = c.userData.dir > 0 ? Math.PI : 0; });
  blocks.forEach((b, i) => { const k = e3(pr(t, T.blk[i] - 0.45, 0.45)), s = b.userData.s; b.visible = k > 0.001; b.position.set(PA.x + b.userData.x, 0, PA.z + s * (0.72 + (1 - k) * 1.5)); b.rotation.y = s > 0 ? 0 : Math.PI; });
  // B: los puntales se levantan, se alargan, la cuchilla muerde la chapa y la cinta tensa
  struts.forEach(S => {
    const st = strutState(S, t);
    for (const k of ['o', 'i', 'plate', 'head']) S[k].visible = st.on;
    S.strap.visible = S.ratchet.visible = false;
    if (!st.on) return;
    const s = Math.max(0.001, cl(st.pop));
    between(S.o, st.base, st.base.clone().addScaledVector(st.dir, 1.25 * s)); between(S.i, st.base.clone().addScaledVector(st.dir, 1.1 * s), st.tip);
    S.plate.position.copy(st.base); S.head.position.copy(st.tip); S.head.quaternion.setFromUnitVectors(V(0, 1, 0), st.dir);
    S.blade.material.emissiveIntensity = 1.6 * pulse(t, T.bite + 0.05 + st.d * 0.3, 0.15);
    S.mat.emissiveIntensity = 0.08 + 0.5 * pulse(t, T.puntales + 0.4, 0.4);
    const ks = sm(T.bite + st.d * 0.3, T.bite + st.d * 0.3 + 0.35, t);
    if (ks > 0.01) {
      const anchor = V(PB.x + S.x, 0.12, PB.z + (S.s > 0 ? -0.15 : -1.44)), a0 = st.base.clone().add(V(0, 0.06, 0));
      S.strap.visible = S.ratchet.visible = true; const e = a0.clone().lerp(anchor, ks); between(S.strap, a0, e); S.ratchet.position.copy(a0.clone().lerp(e, 0.35)).add(V(0, 0.03, 0));
    }
  });
  // C: boca abajo; las cuñas entran entre el capó y el suelo
  pivC.rotation.z = 0.02 * (1 - sm(T.cunas5, T.capo + 0.3, t)) * Math.sin(t * 2.7);
  wedgesC.forEach((G, i) => { const k = e3(pr(t, T.cunas5 - 0.15 + 0.25 * i, 0.5)), x = G.userData.x; G.visible = k > 0.001; G.position.set(PC.x + x + Math.sign(x) * (1 - k) * 1.5, 0, PC.z + G.userData.z); });
}

// ------------------------------------------------------------------ capa 2D
function arrow2(x0, y0, x1, y1, col, a, w = 9) {
  if (a <= 0.01) return;
  const ang = Math.atan2(y1 - y0, x1 - x0);
  g.save(); g.globalAlpha = cl(a); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  for (const [x, y, an] of [[x1, y1, ang], [x0, y0, ang + Math.PI]]) { g.save(); g.translate(x, y); g.rotate(an); g.beginPath(); g.moveTo(8, 0); g.lineTo(-22, -16); g.lineTo(-22, 16); g.closePath(); g.fill(); g.restore(); }
  g.restore();
}
const SEC = { A: ['A', COLS[0], 'SOBRE SUS RUEDAS'], B: ['B', COLS[1], 'DE LADO'], C: ['C', COLS[2], 'BOCA ABAJO'] };
function header(L, a) {
  if (a <= 0.005) return;
  const [ch, col, txtS] = SEC[L];
  g.save(); g.globalAlpha = cl(a); g.translate(540, 600); const k = 0.8 + 0.2 * bk(cl(a * 1.3)); g.scale(k, k);
  g.font = '400 64px Bebas'; const w = g.measureText(txtS).width + 170;
  rr(-w / 2, -58, w, 116, 36); g.fillStyle = 'rgba(8,10,14,0.88)'; g.fill(); g.strokeStyle = col; g.lineWidth = 5; g.stroke();
  g.beginPath(); g.arc(-w / 2 + 62, 0, 40, 0, 7); g.fillStyle = col; g.fill(); txt(ch, -w / 2 + 62, 21, 60, '#0b0d10', 400, 'center', 'Bebas');
  txt(txtS, -w / 2 + 120, 23, 64, '#F4F6F8', 400, 'left', 'Bebas');
  g.restore();
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const win = (t0, t1) => sm(t0 - 0.12, t0 + 0.08, t) * (1 - sm(t1 - 0.2, t1, t));
  // alguien dentro
  carB.updateMatrixWorld(true);
  tag(carB.localToWorld(V(-0.05, 1.12, 0.85)), 'ALGUIEN DENTRO', RED2, win(T.dentro - 0.05, T.mover - 0.1), 0, 0, { px: 54, at: [560, 1380] });
  // no se puede mover: arriba-abajo, a los lados y balanceo
  const ma = win(T.mover - 0.15, T.nunca - 0.15);
  if (ma > 0.01) {
    const c = proj(V(PB.x, 1.0, PB.z - 0.6)), wv = 10 * Math.sin(t * 7);
    arrow2(c.x - 300, c.y - 120 + wv, c.x - 300, c.y + 120 + wv, RED2, ma);
    arrow2(c.x - 140 + wv, c.y + 330, c.x + 140 + wv, c.y + 330, RED2, ma * sm(T.mover + 0.15, T.mover + 0.35, t));
    g.save(); g.globalAlpha = ma * sm(T.mover + 0.3, T.mover + 0.5, t); g.strokeStyle = RED2; g.lineWidth = 9; g.lineCap = 'round';
    const r = 190, a0 = -Math.PI * 0.78 + 0.08 * Math.sin(t * 5), a1 = -Math.PI * 0.22 + 0.08 * Math.sin(t * 5);
    g.beginPath(); g.arc(c.x, c.y + 40, r, a0, a1); g.stroke();
    for (const an of [a0, a1]) { const x = c.x + r * Math.cos(an), y = c.y + 40 + r * Math.sin(an), dir = an + (an === a1 ? Math.PI / 2 : -Math.PI / 2); g.save(); g.translate(x, y); g.rotate(dir); g.fillStyle = RED2; g.beginPath(); g.moveTo(8, 0); g.lineTo(-22, -16); g.lineTo(-22, 16); g.closePath(); g.fill(); g.restore(); }
    g.restore();
    label(540, 1520, 'NI UN MILÍMETRO', RED2, ma * sm(T.milimetro - 0.1, T.milimetro + 0.1, t), { px: 64, icon: 'warn' });
  }
  // nunca lo pones derecho: se estabiliza tal como lo encuentras
  stamp('¡NUNCA DERECHO!', 1480, RED2, Math.exp(-Math.pow((t - T.derecho - 0.35) / 0.6, 4)), 120, -0.04);
  label(540, 1500, 'TAL COMO LO ENCUENTRAS', GREEN2, win(T.estabiliza, T.ruedas - 0.15), { px: 62, icon: 'ok', s: 1 + 0.12 * pulse(t, T.estabiliza + 0.15, 0.2) });
  // las tres posiciones
  header('A', win(T.ruedas - 0.1, T.lado - 0.15));
  header('B', win(T.lado - 0.1, T.boca - 0.15));
  header('C', win(T.boca - 0.1, T.ahora - 0.1));
  // A: cuñas y calzos; los apoyos se cuentan
  tag(chocks[0].position.clone().add(V(-0.1, 0.1, 0)), 'CUÑAS', GOLD2, win(T.cunas3, T.calzos - 0.1) * (chocks[0].visible ? 1 : 0), 0, 0, { px: 56, at: [760, 1450] });
  tag(blocks[0].position.clone().add(V(0, 0.15, 0.15)), 'CALZOS', GOLD2, win(T.calzos, T.minimo - 0.1) * (blocks[0].visible ? 1 : 0), 0, 0, { px: 56, sub: 'bajo el chasis', at: [300, 1450] });
  const n = T.blk.filter(x => t >= x).length, ca = win(T.blk[0], T.lado - 0.15);
  if (ca > 0.01 && n > 0) {
    const k = 1 + 0.25 * pulse(t, T.blk[n - 1] + 0.1, 0.16);
    label(540, 1560, n >= 4 ? 'APOYOS: 4 (MEJOR)' : n === 3 ? 'APOYOS: 3 (MÍNIMO)' : `APOYOS: ${n}`, n >= 3 ? GREEN2 : GOLD2, ca, { px: 66, s: k });
  }
  // B: puntales y cuchilla
  const s0 = strutState(struts[0], t);
  tag(s0.base.clone().lerp(s0.tip, 0.45), 'PUNTALES', ORANGE2, win(T.puntales, T.cuchilla - 0.05) * (s0.on ? 1 : 0), 0, 0, { px: 58, at: [300, 1460] });
  tag(s0.tip.clone(), 'CUCHILLA', GOLD2, win(T.cuchilla, T.boca - 0.2), 0, 0, { px: 58, sub: 'muerde la chapa', at: [760, 1390] });
  label(540, 1560, 'YA NO SE MUEVE', GREEN2, win(T.bite + 0.25, T.boca - 0.2), { px: 58, icon: 'ok' });
  // C: cuñas entre el capó y el suelo
  tag(wedgesC[0].position.clone().add(V(0, 0.45, 0.1)), 'CUÑAS', GOLD2, win(T.cunas5, T.ahora - 0.2) * (wedgesC[0].visible ? 1 : 0), 0, 0, { px: 56, at: [300, 1440] });
  pivC.updateMatrixWorld(true);
  tag(V(PC.x + 1.6, 0.6, PC.z + 0.85), 'CAPÓ', '#F4F6F8', win(T.capo - 0.05, T.ahora - 0.2), 0, 0, { px: 50, at: [800, 1000] });
  tag(V(PC.x + 1.9, 0.02, PC.z + 0.9), 'SUELO', '#F4F6F8', win(T.suelo - 0.05, T.ahora - 0.2), 0, 0, { px: 50, at: [800, 1560] });
  // ¿cuál es la más estable?
  const out = 1 - sm(T.compartir - 0.4, T.compartir - 0.1, t);
  [['A', PA, 1.9], ['B', PB, 2.3], ['C', PC, 2.1]].forEach(([L, p, h], i) => {
    const k = bk(pr(t, [T.oA, T.oB, T.oC][i] - 0.25, 0.35)) * out; if (k <= 0.005) return;
    const q = proj(V(p.x, h, p.z)); if (!q.ok) return;
    const kk = 1 + 0.25 * pulse(t, [T.oA, T.oB, T.oC][i] + 0.1, 0.16);
    g.save(); g.globalAlpha = cl(k); g.translate(q.x, q.y - 40); g.scale(k * kk, k * kk);
    g.font = '400 50px Bebas'; const W = g.measureText(SEC[L][2]).width + 150;
    rr(-W / 2, -50, W, 100, 50); g.fillStyle = 'rgba(8,10,14,0.88)'; g.fill(); g.strokeStyle = SEC[L][1]; g.lineWidth = 4; g.stroke();
    g.beginPath(); g.arc(-W / 2 + 50, 0, 46, 0, 7); g.fillStyle = SEC[L][1]; g.fill(); txt(L, -W / 2 + 50, 24, 70, '#0b0d10', 400, 'center', 'Bebas');
    txt(SEC[L][2], -W / 2 + 112, 18, 50, '#F4F6F8', 400, 'left', 'Bebas'); g.restore();
  });
  const qa = sm(T.ahora - 0.1, T.ahora + 0.2, t) * out;
  if (qa > 0.005) {
    g.save(); g.globalAlpha = qa; g.translate(540, 1170);
    rr(-450, -84, 900, 168, 36); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('¿CUÁL ES LA', 0, -10, 60, '#F4F6F8', 400, 'center', 'Bebas');
    const k = 1 + 0.2 * pulse(t, T.estable + 0.1, 0.18); g.save(); g.translate(0, 52); g.scale(k, k); txt('MÁS ESTABLE?', 0, 20, 76, GOLD2, 400, 'center', 'Bebas'); g.restore();
    g.restore();
  }
  [].forEach(([L, s, t0], i) => {
    const kk = bk(pr(t, t0 - 0.2, 0.4)) * out; if (kk <= 0.005) return;
    const cy = 1170 + i * 128, side = i % 2 ? 1 : -1, pl = 1 + 0.02 * Math.max(0, Math.sin((t - T.comenta) * 6 - i * 1.3)) * sm(T.comenta, T.comenta + 0.3, t);
    g.save(); g.globalAlpha = cl(kk * 1.3); g.translate(540 + side * (1 - cl(kk)) * 600, cy); g.scale(pl, pl);
    rr(-420, -54, 840, 108, 34); g.fillStyle = 'rgba(9,12,17,0.93)'; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.3)'; g.stroke();
    g.beginPath(); g.arc(-360, 0, 36, 0, 7); g.fillStyle = SEC[L][1]; g.fill(); txt(L, -360, 19, 52, '#0b0d10', 400, 'center', 'Bebas');
    txt(s, -295, 22, 60, '#F2F5F8', 400, 'left', 'Bebas');
    g.restore();
  });
  const ce = sm(T.comenta - 0.15, T.comenta + 0.15, t) * out;
  if (ce > 0) { const b = 1 + 0.05 * Math.max(0, Math.sin((t - T.comenta) * 6)); g.save(); g.globalAlpha = ce; g.translate(540, 1640); g.scale(b, b); rr(-320, -54, 640, 108, 54); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke(); txt('💬  COMENTA TU LETRA', 0, 20, 56, '#F2F5F8', 400, 'center', 'Bebas'); g.restore(); }
  share(t);
  closing(t);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.01)'; g.fillRect(0, 0, 2, 2);
}

// ------------------------------------------------------------------ fotograma
window.renderAt = async t => {
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
  finMat.uniforms.uFlash.value = Math.exp(-Math.pow((t - T.bite - 0.05) / 0.08, 2)) * 0.12; finMat.uniforms.uFlashCol.value.setRGB(1, 0.85, 0.4);
  finMat.uniforms.uDim.value = mx(1, 0.72, sm(T.ahora - 0.1, T.ahora + 0.3, t) * (1 - sm(T.compartir - 0.3, T.compartir, t))) * mx(1, 0.75, sm(T.compartir - 0.2, T.compartir + 0.3, t)) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
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
    NOISE = noiseTex(); mats();
    buildWorld();
    world.updateMatrixWorld(true);
    setupTimes();
    update(0);
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'estab: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
