// «Si sueltas la cuerda, ¿qué hace la camilla?» — los bloqueadores (idea de Adrián, «MARTES 17 EXPLICAR LOS BLOQUEADORES
// EN 30 SEGUNDOS») con el MENSAJE (bomberados/MENSAJE.md) y el plan del 15 nov: nada de lista de aparatos, un rescate de
// noche en un barranco: tú subes la camilla con una cuerda por la polea de un trípode; ¿y si se te escapa? La pregunta con
// cuenta de 5 s (cae / baja despacio / se queda quieta), el «¿y si no lo llevara?» (cae y se rebobina) y el bloqueador con
// rayos X: una leva con dientes que deja correr la cuerda hacia arriba y la muerde hacia abajo. Con el mismo truco, otro
// bombero sube por una cuerda fija con el puño y el croll. Motor de projects/bomberados_escala/web/escala.js.
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






// ================================================================== el barranco de noche: la carretera arriba, la pared y el fondo
const world = new THREE.Group(); scene.add(world);
scene.fog.density = 0.014;
const BLUE2 = '#3FB6FF', RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D';
const COLS = ['#FF7A1A', '#2DD4BF', '#F0457A', '#8B7CF6'];
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
const EDGE = 3.45, DEPTH = 18;                                   // borde del barranco (z) y profundidad (m)
const HEAD = V(0, 2.55, 4.05), PR = 0.09;                        // cabeza del trípode (polea) y radio de la polea
const RZ = HEAD.z + PR;                                          // la cuerda baja por delante de la polea
const DEV = V(0, 2.18, RZ);                                      // el bloqueador (antirretorno), justo debajo de la polea
const YOU = V(0, 0, -2.7);                                       // tú, tirando
const CLX = 4.3, CLZ = EDGE + 0.32;                              // la cuerda fija por la que sube el otro bombero
let tripod, pulley, device, cam_, camTeeth = [], xrU, frameM, frameXM, stretcher, patient, bridle = [], ropeSegs = [], ropeU, you, you2, climber;
let ghost, ghostM, croll, puno, pedal, clRope, clRopeU, beacons = [], truck, spot, lamp, lampL;

function addLegs(ff) {
  ff.updateMatrixWorld(true);
  const legs = [-1, 1].map(s => { const L = new THREE.Group(); L.position.set(0.11 * s, 0.85, 0); ff.add(L); return L; });
  ff.updateMatrixWorld(true);
  for (const m of [...ff.children]) if (m.isMesh && m.position.y < 0.8 && Math.abs(Math.abs(m.position.x) - 0.11) < 0.01) legs[m.position.x > 0 ? 1 : 0].attach(m);
  ff.userData.legs = legs; return ff;
}
function face(o, dir) { o.rotation.y = Math.atan2(-dir.x, -dir.z); }      // el bombero mira hacia −Z

// ------------------------------------------------------------------ la cuerda (trenzado que avanza: se ve correr)
const ROPE_V = `attribute float aS; varying float vS; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vS = aS; vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const ROPE_F = `uniform float uS, uI; uniform vec3 uCol, uCol2; varying float vS; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  float s = vS + uS;
  float br = fract(s * 36.0 + vUv.x * 2.0);                      // trenzado en espiral
  float br2 = fract(s * 36.0 - vUv.x * 2.0);
  float m = smoothstep(0.0, 0.18, br) * smoothstep(1.0, 0.7, br) * 0.5 + smoothstep(0.0, 0.18, br2) * smoothstep(1.0, 0.7, br2) * 0.5;
  float fleck = step(0.86, fract(sin(floor(s * 72.0) * 12.9 + floor(vUv.x * 8.0) * 78.2) * 43758.5));
  vec3 col = mix(uCol * 0.55, uCol, m);
  col = mix(col, uCol2, fleck * 0.8);
  vec3 L = normalize(vec3(-0.4, 0.8, 0.5)); float d = 0.35 + 0.65 * max(dot(normalize(vN), L), 0.0);
  vec3 V = normalize(cameraPosition - vW); float rim = pow(1.0 - abs(dot(normalize(vN), V)), 2.0);
  gl_FragColor = vec4(col * d * uI + uCol * rim * 0.35, 1.0);
}`;
function ropeSeg(u) {                       // un tramo recto de cuerda (cilindro de 1 m que se estira); aS = metros a lo largo
  const geo = new THREE.CylinderGeometry(0.018, 0.018, 1, 10, 1, true);
  const pos = geo.attributes.position, aS = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) aS[i] = pos.getY(i) + 0.5;
  geo.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
  const uu = { uS: u.uS, uI: u.uI, uCol: u.uCol, uCol2: u.uCol2, uS0: { value: 0 }, uL: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ uniforms: uu, vertexShader: ROPE_V.replace('vS = aS;', 'vS = uS0 + aS * uL;').replace('attribute float aS;', 'attribute float aS; uniform float uS0, uL;'), fragmentShader: ROPE_F });
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.userData.u = uu; world.add(m); return m;
}
function placeSeg(m, a, b, s0) {
  const d = b.clone().sub(a), L = Math.max(1e-4, d.length());
  m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  m.userData.u.uS0.value = s0; m.userData.u.uL.value = L; return L;
}

// ------------------------------------------------------------------ el bloqueador (leva con dientes; con rayos X se ve por dentro)
const XR_V = `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const XR_F = `uniform float uI; uniform vec3 uCol; varying vec3 vN; varying vec3 vV;
void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2); float a = (0.08 + 0.92 * f) * uI; if (a < 0.003) discard; gl_FragColor = vec4(uCol * a, a); }`;
function makeDevice() {                    // a lo largo de Y (la cuerda vertical pasa por su canal, en x = 0, z = 0)
  const G = new THREE.Group();
  frameM = new THREE.MeshStandardMaterial({ color: 0xd6a21c, metalness: 0.55, roughness: 0.38 });
  xrU = { uI: { value: 0 }, uCol: { value: new THREE.Color(0.35, 0.85, 1.6) } };
  frameXM = new THREE.ShaderMaterial({ uniforms: xrU, vertexShader: XR_V, fragmentShader: XR_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const shape = new THREE.Shape();             // perfil del cuerpo (placa con el canal y el ojo de abajo)
  shape.moveTo(-0.035, -0.11); shape.lineTo(0.035, -0.11); shape.quadraticCurveTo(0.06, -0.11, 0.06, -0.07); shape.lineTo(0.06, 0.08);
  shape.quadraticCurveTo(0.06, 0.12, 0.02, 0.12); shape.lineTo(-0.035, 0.12); shape.quadraticCurveTo(-0.06, 0.12, -0.06, 0.08); shape.lineTo(-0.06, -0.07);
  shape.quadraticCurveTo(-0.06, -0.11, -0.035, -0.11);
  const eye = new THREE.Path(); eye.absarc(0, -0.075, 0.018, 0, Math.PI * 2, true); shape.holes.push(eye);
  const plateG = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 });
  const back = new THREE.Mesh(plateG, frameM); back.position.z = -0.034; G.add(back);
  const backX = new THREE.Mesh(plateG, frameXM); backX.position.z = -0.034; backX.renderOrder = 21; G.add(backX);
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.2, 0.06), frameM); side.position.set(-0.056, 0.01, -0.005); G.add(side);
  const sideX = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.2, 0.06), frameXM); sideX.position.copy(side.position); sideX.renderOrder = 21; G.add(sideX);
  // la leva: gira en un eje (x) por encima del canal; sus dientes miran a la cuerda
  cam_ = new THREE.Group(); cam_.position.set(0, 0.035, 0.05); G.add(cam_);
  const camM = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.85, roughness: 0.3, emissive: 0xff5a14, emissiveIntensity: 0 });
  const sh = new THREE.Shape();                  // perfil (x = z del aparato, y = y), con el pivote en el origen; la cuerda está en z = −0,05
  sh.moveTo(0.022, 0.018); sh.lineTo(0.027, -0.012); sh.lineTo(0.02, -0.042); sh.lineTo(0.004, -0.064); sh.lineTo(-0.018, -0.071); sh.lineTo(-0.029, -0.064);
  for (let k = 0; k < 7; k++) { const y = -0.058 + k * 0.0072; sh.lineTo(-0.037, y + 0.0026); sh.lineTo(-0.03, y + 0.0062); }   // dientes (hacia la cuerda y un poco hacia arriba)
  sh.lineTo(-0.026, -0.006); sh.lineTo(-0.012, 0.016); sh.lineTo(0.008, 0.025); sh.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.007, 0, Math.PI * 2, true); sh.holes.push(hole);
  const cg = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }); cg.rotateY(-Math.PI / 2); cg.translate(0.015, 0, 0);
  const camBody = new THREE.Mesh(cg, camM); cam_.add(camBody);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 12), M.chrome); pin.rotation.z = Math.PI / 2; cam_.add(pin);
  cam_.userData.m = camM;
  return G;
}

// ------------------------------------------------------------------ la camilla (nido naranja) con el herido envuelto en la manta
function makeStretcher() {
  const G = new THREE.Group();          // centro en el origen; larga en X
  const shellM = new THREE.MeshStandardMaterial({ color: 0xe8561a, roughness: 0.45 });
  const shell = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.22, 0.62, 4, 0.08), shellM); shell.castShadow = true; G.add(shell);
  const inner = new THREE.Mesh(new RoundedBoxGeometry(1.95, 0.1, 0.5, 3, 0.04), new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.7 })); inner.position.y = 0.08; G.add(inner);
  for (const s of [-1, 1]) for (const x of [-0.85, -0.3, 0.3, 0.85]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12), M.black); h.position.set(x, 0.05, s * 0.32); h.rotation.y = Math.PI / 2; G.add(h); }
  // el herido: manta térmica dorada, casco blanco, cinchas negras
  const blanket = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.2, 0.46, 4, 0.08), new THREE.MeshStandardMaterial({ color: 0xa88c40, metalness: 0.4, roughness: 0.55 }));
  blanket.position.set(-0.1, 0.18, 0); G.add(blanket);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 14), new THREE.MeshStandardMaterial({ color: 0xc58f6a, roughness: 0.6 })); head.position.set(0.8, 0.2, 0); G.add(head);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35 })); helm.position.set(0.82, 0.22, 0); helm.rotation.z = -Math.PI / 2; G.add(helm);
  for (const x of [-0.6, 0.0, 0.5]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.66), M.black); st.position.set(x, 0.17, 0); G.add(st); }
  return G;
}

// ------------------------------------------------------------------ el puño y el croll (a lo largo de la cuerda)
function makeAscender(col, handle) {
  const G = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.2, emissive: col, emissiveIntensity: 0.35 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.05, handle ? 0.2 : 0.11, 0.035, 2, 0.01), m); G.add(body);
  G.scale.setScalar(2.0);
  if (handle) { const h = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.13, 0.03, 2, 0.012), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6 })); h.position.set(0, -0.03, 0.045); G.add(h); }
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 12), M.chrome); cam.rotation.z = Math.PI / 2; cam.position.set(0, handle ? 0.06 : 0.02, -0.022); G.add(cam);
  return G;
}

function buildWorld() {
  world.add(new THREE.HemisphereLight(0x2c3d62, 0x0a0705, 0.55));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.3); moon.position.set(-20, 40, 30); world.add(moon);
  // la carretera (arriba) y la bionda rota donde está el trípode
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#16171a'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 16 + rnd(i) * 26; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(30, 6);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(140, EDGE + 30), new THREE.MeshStandardMaterial({ map: asph, color: 0x5c5c5c, roughness: 0.6, metalness: 0.1 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, EDGE - (EDGE + 30) / 2); road.receiveShadow = true; world.add(road);
  const lineM = new THREE.MeshStandardMaterial({ color: 0xd9d9d0, roughness: 0.4, emissive: 0x1c1c1a });
  const l1 = new THREE.Mesh(new THREE.BoxGeometry(140, 0.012, 0.15), lineM); l1.position.set(0, 0.008, 1.2); world.add(l1);
  for (let i = 0; i < 16; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.012, 0.15), lineM); d.position.set(-70 + i * 9, 0.008, -2.4); world.add(d); }
  const steel = new THREE.MeshStandardMaterial({ color: 0x8c9198, metalness: 0.8, roughness: 0.35 });
  for (const [x0, x1] of [[-60, -2.6], [2.6, 60]]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.32, 0.07), steel); rail.position.set((x0 + x1) / 2, 0.62, EDGE - 0.35); rail.castShadow = true; world.add(rail);
    for (let x = x0; x <= x1; x += 2) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), steel); p.position.set(x, 0.375, EDGE - 0.3); world.add(p); }
  }
  const bent = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.32, 0.07), steel); bent.position.set(-3.6, 0.45, EDGE + 0.5); bent.rotation.set(0.4, 0.5, 0.3); world.add(bent);   // tramo de bionda arrancado
  // la pared del barranco: roca con relieve (no toca la cuerda ni la camilla)
  const rockT = canvasTex(512, 512, (x) => { x.fillStyle = '#3a3530'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const v = 30 + rnd(i) * 50; x.fillStyle = `rgba(${v},${v * 0.92},${v * 0.85},0.55)`; x.fillRect(rnd(i * 3.7) * 512, rnd(i * 1.3) * 512, 6 + rnd(i * 2.1) * 40, 2 + rnd(i * 4.4) * 10); }
    for (let i = 0; i < 90; i++) { x.strokeStyle = 'rgba(10,8,6,0.55)'; x.lineWidth = 1 + rnd(i) * 3; x.beginPath(); const sx = rnd(i * 9.1) * 512, sy = rnd(i * 7.7) * 512; x.moveTo(sx, sy); x.lineTo(sx + (rnd(i * 3.3) - 0.5) * 120, sy + rnd(i * 5.5) * 90); x.stroke(); } }, { aniso: 4 });
  rockT.wrapS = rockT.wrapT = THREE.RepeatWrapping; rockT.repeat.set(10, 3);
  const wallG = new THREE.PlaneGeometry(140, DEPTH + 1, 280, 40);
  const wp = wallG.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const x = wp.getX(i), y = wp.getY(i);
    const n = Math.sin(x * 0.9 + Math.sin(y * 0.7) * 2) * 0.18 + Math.sin(x * 2.3 + y * 1.7) * 0.08 + Math.sin(y * 0.35 + x * 0.2) * 0.25;
    const keep = Math.min(1, Math.abs(x) / 1.4);                    // detrás de la cuerda, la pared es lisa y algo más atrás
    wp.setZ(i, (n - 0.35) * (0.35 + 0.65 * keep) - (1 - keep) * 0.25);
  }
  wallG.computeVertexNormals();
  const wall = new THREE.Mesh(wallG, new THREE.MeshStandardMaterial({ map: rockT, color: 0x8a8076, roughness: 0.95 }));
  wall.position.set(0, -(DEPTH + 1) / 2 + 0.5, EDGE - 0.05); wall.receiveShadow = true; world.add(wall);
  // el fondo: rocas, matorrales y el coche que se salió de la carretera
  const floorT = canvasTex(256, 256, (x) => { x.fillStyle = '#211d18'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 3000; i++) { const v = 20 + rnd(i) * 30; x.fillStyle = `rgba(${v},${v * 0.9},${v * 0.75},0.6)`; x.fillRect(rnd(i * 3.1) * 256, rnd(i * 5.3) * 256, 3, 3); } }, { aniso: 4 });
  floorT.wrapS = floorT.wrapT = THREE.RepeatWrapping; floorT.repeat.set(30, 12);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 60), new THREE.MeshStandardMaterial({ map: floorT, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -DEPTH, EDGE + 30); floor.receiveShadow = true; world.add(floor);
  const rockM = new THREE.MeshStandardMaterial({ color: 0x4a443c, roughness: 0.95 }), bushM = new THREE.MeshStandardMaterial({ color: 0x141c10, roughness: 1 });
  for (let i = 0; i < 70; i++) {
    const x = (rnd(i * 3.3) - 0.5) * 60, z = EDGE + 0.8 + rnd(i * 5.1) * 22, s = 0.3 + rnd(i * 7.7) * 1.4;
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM); r.position.set(x, -DEPTH + s * 0.4, z); r.rotation.set(rnd(i), rnd(i * 2), rnd(i * 3)); r.castShadow = true; r.receiveShadow = true; world.add(r);
    if (i % 2) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.5 + rnd(i * 9) * 0.6, 0.9 + rnd(i * 4) * 0.8, 6), bushM); b.position.set(x + 1.3, -DEPTH + 0.45, z + 0.8); world.add(b); }
  }
  const car = new THREE.Group();
  const carM = new THREE.MeshStandardMaterial({ color: 0x2b3f63, roughness: 0.5, metalness: 0.3 });
  const cb = new THREE.Mesh(new RoundedBoxGeometry(4.2, 0.8, 1.8, 3, 0.15), carM); cb.position.y = 0.55; car.add(cb);
  const ct = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.6, 1.6, 3, 0.15), carM); ct.position.set(-0.2, 1.15, 0); car.add(ct);
  for (const [x, z] of [[1.3, 0.85], [-1.3, 0.85], [1.3, -0.85], [-1.3, -0.85]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(x, 0.34, z); car.add(w); }
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 1.3), GLOW(0xfff0d0, 1.6)); hl.position.set(2.12, 0.6, 0); car.add(hl);
  car.position.set(-3.5, -DEPTH + 0.1, EDGE + 6.5); car.rotation.set(0.12, 0.7, 0.35); car.traverse(o => { if (o.isMesh) o.castShadow = true; }); world.add(car);
  const carL = new THREE.SpotLight(0xfff0d0, 25, 25, 0.5, 0.6, 1.5); carL.position.copy(car.localToWorld(V(2.3, 0.6, 0))); carL.target.position.copy(car.localToWorld(V(9, -0.5, 0))); world.add(carL, carL.target);
  // la autobomba en la carretera (rotativos) y la torre de luz que alumbra la pared
  truck = makeTruck(); truck.position.set(-10, 0, -1.2); world.add(truck);
  truck.traverse(o => { if (o.isMesh) o.castShadow = true; }); beacons = truck.userData.lbar;
  lamp = new THREE.Group(); lamp.position.set(-2.6, 0, EDGE - 1.1); world.add(lamp);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.6, 10), steel); mast.position.y = 1.8; lamp.add(mast);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.2), GLOW(0xfff4e0, 2.2)); head.position.set(0, 3.6, 0.15); head.rotation.x = 0.6; lamp.add(head);
  lampL = new THREE.SpotLight(0xfff2e0, 80, 60, 0.42, 0.55, 1.4); lampL.position.set(-2.6, 3.6, EDGE - 0.9); lampL.target.position.set(0.3, -6.5, EDGE + 0.9);
  lampL.castShadow = true; lampL.shadow.mapSize.set(2048, 2048); lampL.shadow.bias = -0.0004; world.add(lampL, lampL.target);
  const fill = new THREE.PointLight(0x8fb0ff, 18, 0, 2); fill.position.set(3.5, -8, EDGE + 6); world.add(fill);
  const work = new THREE.PointLight(0xfff0dc, 22, 0, 2); work.position.set(-1.6, 3.0, -1.4); world.add(work);   // luz de trabajo sobre ti
  const fill2 = new THREE.PointLight(0xa8bce0, 55, 0, 2); fill2.position.set(1.5, -3.5, EDGE + 9); world.add(fill2);   // la pared se ve
  // el trípode de rescate: la cabeza por fuera del borde, la polea y el bloqueador
  tripod = new THREE.Group(); world.add(tripod);
  const alu = new THREE.MeshStandardMaterial({ color: 0xb9c0c8, metalness: 0.85, roughness: 0.3 });
  for (const f of [V(-1.15, 0, EDGE - 0.25), V(1.15, 0, EDGE - 0.25), V(0, 0, 1.55)]) {
    const d = HEAD.clone().sub(f), L = d.length();
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, L, 12), alu); leg.position.copy(f).addScaledVector(d, 0.5); leg.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); leg.castShadow = true; tripod.add(leg);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.06, 14), M.black); foot.position.copy(f).add(V(0, 0.03, 0)); tripod.add(foot);
  }
  const hp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16), alu); hp.position.copy(HEAD).add(V(0, 0.16, 0)); tripod.add(hp);
  pulley = new THREE.Group(); pulley.position.copy(HEAD); tripod.add(pulley);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR, 0.035, 28), new THREE.MeshStandardMaterial({ color: 0xc23a1c, roughness: 0.4, metalness: 0.3 })); wheel.rotation.z = Math.PI / 2; pulley.add(wheel);
  for (const s of [-1, 1]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.26, 0.22), alu); sp.position.set(s * 0.03, 0.04, 0); pulley.add(sp); }
  device = makeDevice(); device.position.copy(DEV); tripod.add(device);
  const redir = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20), new THREE.MeshStandardMaterial({ color: 0xc23a1c, roughness: 0.4 })); redir.rotation.z = Math.PI / 2; redir.position.set(0, 0.32, 1.7); tripod.add(redir);
  // la cuerda: cola en el suelo → tus manos → polea de abajo → polea de arriba → bloqueador → camilla
  ropeU = { uS: { value: 0 }, uI: { value: 1 }, uCol: { value: new THREE.Color(0.95, 0.32, 0.08) }, uCol2: { value: new THREE.Color(0.05, 0.05, 0.06) } };
  for (let i = 0; i < 7; i++) ropeSegs.push(ropeSeg(ropeU));
  // la camilla y su araña (4 cintas al anillo)
  stretcher = makeStretcher(); world.add(stretcher);
  const webM = new THREE.MeshStandardMaterial({ color: 0x1f2633, roughness: 0.7 });
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), webM); world.add(b); bridle.push(b); }
  ghostM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.18, 0.1), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  ghost = makeStretcher(); ghost.traverse(o => { if (o.isMesh) { o.material = ghostM; o.castShadow = false; o.renderOrder = 16; } }); world.add(ghost);
  // tú, tirando de la cuerda; y otro bombero en el borde
  you = addLegs(makeFirefighter()); you.position.copy(YOU); face(you, V(0, 0, 1)); world.add(you); you.traverse(o => { if (o.isMesh) o.castShadow = true; });
  you2 = makeFirefighter(); you2.position.set(-1.9, 0, EDGE - 0.9); face(you2, V(0.3, 0, 1)); world.add(you2); you2.traverse(o => { if (o.isMesh) o.castShadow = true; });
  // la cuerda fija y el bombero que sube con puño y croll
  clRopeU = { uS: { value: 0 }, uI: { value: 1 }, uCol: { value: new THREE.Color(0.95, 0.85, 0.2) }, uCol2: { value: new THREE.Color(0.1, 0.25, 0.7) } };
  clRope = [ropeSeg(clRopeU), ropeSeg(clRopeU)];
  placeSeg(clRope[0], V(CLX, 0.25, EDGE - 1.2), V(CLX, 0.05, CLZ - 0.05), 0);
  placeSeg(clRope[1], V(CLX, 0.05, CLZ - 0.05), V(CLX, -DEPTH + 0.05, CLZ), 1.5);
  climber = addLegs(makeFirefighter()); face(climber, V(0, 0, -1)); world.add(climber); climber.traverse(o => { if (o.isMesh) o.castShadow = true; });
  bottle.visible = false;                                         // en cuerda no lleva el equipo de aire
  croll = makeAscender(0xf2b81a, false); world.add(croll);
  puno = makeAscender(0xf2c21a, true); world.add(puno);
  pedal = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6 })); world.add(pedal);
}

// ------------------------------------------------------------------ tiempos y cámara (un dron que no para)
let T = {}, KEYS = null, PULLS = [];
const YR0 = -5.0, DY = 0.22;                       // altura inicial del anillo de la camilla y lo que sube cada tirón
function setupTimes() {
  T = { ...CUE, end: END };
  const L = window.LINES_;
  T.count0 = L[3].end + 0.05; T.count1 = T.count0 + 4.0;
  T.fin = T.compartir - 0.25;
  T.g0 = T.tiempo + 0.08; T.g1 = T.g0 + 0.75; T.rw1 = T.g1 + 0.45;   // «¿y si no lo llevara?»: cae (fantasma) y se rebobina
  // los tirones (inicio): al subirlo, «cada tirón», la cuerda que corre en los rayos X, «tiras» y otro al final
  PULLS = [T.tirando - 0.1, T.tiron - 0.05, T.palmo - 0.15, T.arriba - 0.15, T.tiras - 0.1, T.nobaja + 0.45, T.colgarias - 0.2];
  T.esc0 = T.escapa - 0.05;                         // se te escapa: manos abiertas (la camilla da un tirón de 3 cm y se queda)
  KEYS = camKeys();
}
function camKeys() {
  const K = [
    [0, [2.6, -7.2, 7.6, 0, -5.7, RZ, 40]],                            // la camilla colgando sobre el vacío (desde un poco más abajo)
    [T.barranco, [4.2, -9.6, 10.6, 0, -4.6, 3.6, 44]],                // el vacío debajo y la cuerda hacia la luz
    [T.subes, [5.6, 7.4, 9.6, 0, -1.6, 1.0, 46]],                     // alto: tú arriba tirando, el trípode y la camilla
    [T.palmo + 0.2, [4.6, 6.0, 8.2, 0, -2.0, 1.4, 44]],
    [T.escapa - 0.25, [2.1, 1.35, -1.9, 0, 1.0, -2.45, 40]],           // tus manos: ¡se te escapa!
    [T.escapa + 0.35, [2.7, 2.1, 1.6, 0.4, -1.0, 3.6, 42]],            // por encima del borde (no atraviesa el suelo)
    [T.escapa + 0.75, [3.1, 0.4, 5.0, 0, -3.6, RZ, 42]],
    [T.sueltas + 0.3, [3.4, -3.6, 8.6, 0, -4.9, RZ, 40]],             // la camilla, parada: la pregunta
    [T.count0, [-3.2, -4.0, 8.6, 0, -5.0, RZ, 40]],                   // la cuenta: alrededor de la camilla
    [T.count0 + 2.0, [-4.6, -5.6, 6.6, 0, -5.0, RZ, 40]],
    [T.count1, [-2.0, -6.8, 8.8, 0, -5.4, RZ, 42]],
    [T.tiempo + 0.25, [5.0, -8.8, 13.5, 0, -7.4, RZ, 46]],             // ¿y si no lo llevara?: cae…
    [T.rw1 + 0.1, [4.0, -6.2, 11.0, 0, -5.2, RZ, 44]],
    [T.bloqueador + 0.1, [0.95, 2.45, 5.1, 0, 2.3, RZ, 34]],           // …se queda quieta: por el bloqueador (la polea y el aparato)
    [T.leva, [0.44, 2.19, RZ + 0.02, 0, 2.18, RZ, 30]],                 // rayos X, de lado: la leva con dientes y la cuerda
    [T.muerde + 0.4, [0.4, 2.18, RZ + 0.015, 0, 2.18, RZ, 30]],
    [T.poreso + 0.2, [5.8, 6.4, 8.6, 0, -1.6, 1.2, 46]],              // tiras, descansas… y no baja
    [T.nobaja + 0.3, [4.8, 5.4, 7.6, 0, -1.6, 1.2, 44]],
    [T.truco + 0.2, [CLX + 2.7, climbBody(T.truco + 0.2) + 1.35, CLZ + 0.4, CLX, climbBody(T.truco + 0.2) + 1.2, CLZ + 0.2, 40]],   // el otro bombero sube (de perfil: puño y croll)
    [T.pecho + 0.3, [CLX + 2.4, climbBody(T.pecho + 0.3) + 1.4, CLZ + 0.4, CLX, climbBody(T.pecho + 0.3) + 1.25, CLZ + 0.2, 38]],
    [T.colgarias + 0.2, [9.0, 3.0, 16.0, 0.5, -6.0, 4.0, 48]],        // todo el rescate
    [T.fin, [11, 6, 20, 0.5, -5.5, 4, 48]],
    [T.end, [13, 9, 24, 0.5, -5.0, 4, 50]],
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
  const sh = Math.exp(-Math.pow((t - T.tiempo - 0.05) / 0.12, 2)) * 0.1 + Math.exp(-Math.pow((t - T.esc0 - 0.1) / 0.14, 2)) * 0.06;
  return pose(V(v[0] + sh * Math.sin(t * 91), v[1] + sh * Math.cos(t * 77), v[2]), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
function pulled(t) {                     // metros de cuerda recogidos hasta t (cada tirón: 0,6 s)
  let s = 0; for (const p of PULLS) s += DY * e3(pr(t, p, 0.6)); return s;
}
function pullingNow(t) { return PULLS.some(p => t > p && t < p + 0.6); }
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => { f.u.uCam.value.copy(cam.position); f.u.uTime.value = t; });
  // rotativos de la autobomba
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = 8 + 70 * on;
  // la cuerda recogida y la camilla (con el tirón de 3 cm cuando se te escapa)
  const s = pulled(t), slip = 0.03 * e3(pr(t, T.esc0, 0.12)) - 0.03 * e3(pr(t, T.esc0 + 0.6, 0.3));
  const bob = 0.012 * Math.sin(t * 2.1);
  const yR = YR0 + s - slip + bob;
  ropeU.uS.value = s - slip;
  const R = V(0, yR, RZ);
  stretcher.position.set(0, yR - 1.05, RZ); stretcher.rotation.set(0.03 * Math.sin(t * 0.9), 0.06 * Math.sin(t * 0.37), 0.04 * Math.sin(t * 1.3));
  stretcher.updateMatrixWorld(true);
  const corners = [V(-0.78, 0.12, -0.3), V(-0.78, 0.12, 0.3), V(0.78, 0.12, -0.3), V(0.78, 0.12, 0.3)];
  corners.forEach((c, i) => { const a = R.clone(), b = stretcher.localToWorld(c.clone()), d = b.clone().sub(a), L = d.length();
    bridle[i].position.copy(a).addScaledVector(d, 0.5); bridle[i].scale.set(1, L, 1); bridle[i].quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); });
  // el fantasma: «¿y si no lo llevara?» cae y se rebobina
  const gOn = t > T.g0 - 0.02 && t < T.rw1 + 0.15;
  ghost.visible = gOn;
  if (gOn) {
    const fall = t < T.g1 ? (t - T.g0) : (T.g1 - T.g0) * (1 - e3(pr(t, T.g1, T.rw1 - T.g1)));
    ghost.position.set(0, yR - 1.05 - 4.9 * fall * fall, RZ); ghost.rotation.set(0, 0, 0.25 * fall);
    ghostM.opacity = 0.75 * sm(T.g0 - 0.02, T.g0 + 0.06, t) * (1 - sm(T.rw1 - 0.05, T.rw1 + 0.15, t));
  }
  // la cuerda por sus tramos
  you.updateMatrixWorld(true);
  const hand = V(0, 1.0, YOU.z + 0.4 - 0.12 * pullLean(t));
  const pts = [V(0.35, 0.03, -6.4), V(0.05, 0.03, YOU.z - 0.25), hand, V(0, 0.39, 1.72), V(0, HEAD.y, HEAD.z - PR), V(0, HEAD.y + PR, HEAD.z), V(0, HEAD.y, RZ), R];
  const segPts = [[pts[0], pts[1]], [pts[1], pts[2]], [pts[2], pts[3]], [pts[3], pts[4]], [pts[4], pts[5]], [pts[5], pts[6]]];
  let acc = 0;
  segPts.forEach(([a, b], i) => { acc += placeSeg(ropeSegs[i], a, b, acc); });
  placeSeg(ropeSegs[6], pts[6], pts[7], acc);
  // tú: te echas atrás en cada tirón; al escaparse, abres las manos
  you.rotation.x = -0.18 * pullLean(t); you.position.z = YOU.z - 0.15 * pullLean(t);
  // el bloqueador: la leva se abre cuando la cuerda sube y muerde cuando tira hacia abajo
  const open = pullingNow(t) ? 1 : 0;
  const bite = pulse(t, T.muerde + 0.05, 0.25) + pulse(t, T.esc0 + 0.1, 0.2) + pulse(t, T.tiempo + 0.9, 0.25);
  cam_.rotation.x = -0.34 * pullLean(t) + 0.03 * Math.min(1, bite);
  cam_.userData.m.emissiveIntensity = 2.6 * Math.min(1, bite) * xrU.uI.value + 0.15;
  const xr = sm(T.leva - 0.35, T.leva + 0.05, t) * (1 - sm(T.poreso - 0.2, T.poreso + 0.15, t));
  xrU.uI.value = xr; frameM.transparent = xr > 0.01; frameM.opacity = 1 - 0.85 * xr; frameM.depthWrite = xr < 0.5;
  // el bombero que sube con puño y croll (como un gusano: se pone de pie en el pedal, el croll sube; se sienta; sube el puño)
  const cyc = 1.25, k = Math.max(0, (t - T.truco + 0.4) / cyc), n = Math.floor(k), f = k - n;
  const stand = f < 0.45 ? e3(f / 0.45) : 1, punoUp = f < 0.5 ? 0 : e3((f - 0.5) / 0.45);
  const climbing = t > T.truco - 0.4;
  const body = climbBody(t);
  climber.position.set(CLX, body, CLZ + 0.28);
  const L2 = climber.userData.legs; L2[0].rotation.x = -0.9 + 0.8 * stand; L2[1].rotation.x = -0.5 + 0.4 * stand;
  croll.position.set(CLX, body + 1.18, CLZ); croll.rotation.set(0, 0, 0);
  const py = body + 1.55 + (climbing ? 0.34 * (punoUp - stand) + 0.34 : 0.34);
  puno.position.set(CLX, py, CLZ);
  const foot = V(CLX + 0.11, body + 0.12, CLZ + 0.2);
  const pd = puno.position.clone().sub(foot), pl = pd.length(); pedal.position.copy(foot).addScaledVector(pd, 0.5); pedal.scale.set(1, pl, 1); pedal.quaternion.setFromUnitVectors(V(0, 1, 0), pd.normalize());
  clRopeU.uS.value = 0;
}
function climbBody(t) {             // altura de los pies del que sube (como un gusano: 0,34 m por ciclo de 1,25 s)
  const k = Math.max(0, (t - T.truco + 0.4) / 1.25), n = Math.floor(k), f = k - n;
  return -10.2 + (t > T.truco - 0.4 ? 0.34 * (n + (f < 0.45 ? e3(f / 0.45) : 1)) : 0);
}
function pullLean(t) { let v = 0; for (const p of PULLS) v = Math.max(v, Math.sin(Math.PI * cl((t - p) / 0.6))); return v; }

// ------------------------------------------------------------------ capa 2D: rótulos, tarjetas, cuenta
function proj(v) { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * W2, y: (-p.y * 0.5 + 0.5) * H2, ok: p.z < 1 }; }
function chip(x, y, text, col, a, s = 1, icon = null, px = 56) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a); g.translate(cl(x, 200, W2 - 200), cl(y, 560, H2 - 260)); g.scale(s, s);
  g.font = `400 ${px}px Bebas`; const tw = g.measureText(text).width, w = tw + (icon ? 100 : 60), h = px * 1.45;
  rr(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  const cx = -w / 2 + 46;
  if (icon === 'ok') { g.beginPath(); g.moveTo(cx - 16, 0); g.lineTo(cx - 4, 13); g.lineTo(cx + 18, -14); g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round'; g.stroke(); }
  else if (icon === 'warn') { g.beginPath(); g.moveTo(cx, -20); g.lineTo(cx + 21, 17); g.lineTo(cx - 21, 17); g.closePath(); g.fillStyle = col; g.fill(); txt('!', cx, 13, 30, '#0b0d10', 400, 'center', 'Bebas'); }
  else if (icon === 'up' || icon === 'down') { g.beginPath(); const d = icon === 'up' ? 1 : -1; g.moveTo(cx, 18 * d); g.lineTo(cx, -16 * d); g.moveTo(cx - 13, -4 * d); g.lineTo(cx, -18 * d); g.lineTo(cx + 13, -4 * d); g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
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
const OPTS = [['A', 'CAE'], ['B', 'BAJA DESPACIO'], ['C', 'SE QUEDA QUIETA']];
function cards(t) {                     // 3 tarjetas en columna; tras «¡Tiempo!», A y B tachadas y C en verde
  const tIn = [T.cae, T.despacio, T.quieta1];
  OPTS.forEach(([L, s], i) => {
    const k = bk(pr(t, tIn[i] - 0.2, 0.4)) * (1 - sm(T.bloqueador - 0.35, T.bloqueador + 0.05, t));
    if (k <= 0.005) return;
    const bad = i !== 2 && t > T.tiempo + 0.05 + (i === 0 ? 0.6 : 0.15), good = i === 2 && t > T.quieta2 - 0.05;
    const cy = 650 + i * 122, side = i % 2 ? 1 : -1;
    const shake = bad ? 10 * Math.sin(t * 80) * pulse(t, T.tiempo + 0.2 + (i === 0 ? 0.6 : 0), 0.2) : 0;
    const pl = !bad && t > T.count0 && t < T.tiempo ? 1 + 0.025 * Math.max(0, Math.sin((t - T.count0) * 7 - i * 1.3)) : 1;
    const pop = good ? 1 + 0.08 * pulse(t, T.quieta2 + 0.1, 0.15) : 1;
    g.save(); g.globalAlpha = cl(k * 1.3); g.translate(540 + side * (1 - cl(k)) * 600 + shake, cy); g.scale(pl * pop, pl * pop);
    const col = bad ? RED2 : good ? GREEN2 : COLS[i];
    rr(-450, -50, 900, 100, 34); g.fillStyle = bad ? 'rgba(58,8,8,0.94)' : good ? 'rgba(8,46,22,0.94)' : 'rgba(9,12,17,0.9)'; g.fill();
    g.lineWidth = bad || good ? 6 : 3; g.strokeStyle = bad || good ? col : 'rgba(255,255,255,0.3)'; g.stroke();
    g.beginPath(); g.arc(-395, 0, 34, 0, 7); g.fillStyle = col; g.fill();
    txt(bad ? '✗' : good ? '✓' : L, -395, 18, 50, '#0b0d10', 400, 'center', 'Bebas');
    txt(s, 30, 19, 54, '#F2F5F8', 400, 'center', 'Bebas');
    if (bad) { g.strokeStyle = RED2; g.lineWidth = 6; g.beginPath(); g.moveTo(-320, 3); g.lineTo(380, 3); g.stroke(); }
    g.restore();
  });
}
function rewind(t) {                    // vuelve atrás: barrido y «⏪»
  const a = sm(T.g1, T.g1 + 0.08, t) * (1 - sm(T.rw1, T.rw1 + 0.15, t));
  if (a <= 0.01) return;
  g.save(); g.globalAlpha = a * 0.5;
  for (let k = 0; k < 24; k++) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, (k * 83 + t * 900) % H2, W2, 3); }
  g.globalAlpha = a; txt('⏪', 540, 1050, 160, '#F4F6F8', 400, 'center', 'sans-serif');
  g.restore();
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  // el herido y tú
  const ps = proj(stretcher.position.clone().add(V(0, 0.5, 0)));
  chip(ps.x, ps.y - 120, 'HERIDO', RED2, ps.ok ? sm(T.herido - 0.1, T.herido + 0.2, t) * (1 - sm(T.subes - 0.3, T.subes, t)) : 0, 1, 'warn', 56);
  const py = proj(you.position.clone().add(V(0, 2.3, 0)));
  chip(py.x, py.y, 'TÚ', GOLD2, py.ok ? sm(T.subes - 0.1, T.subes + 0.2, t) * (1 - sm(T.escapa - 0.5, T.escapa - 0.2, t)) : 0, 1, null, 56);
  for (const p of [PULLS[1], PULLS[2]]) {
    const a = pulse(t, p + 0.55, 0.35); if (a < 0.02) continue;
    const q = proj(stretcher.position.clone().add(V(0.9, 0.4, 0)));
    if (q.ok) chip(q.x + 150, q.y - 40 - 80 * cl((t - p - 0.3) / 0.6), '+1 PALMO', GOLD2, a, 1, 'up', 52);
  }
  // la pregunta: tarjetas, cuenta 1 → 5 y «¡Tiempo!»
  cards(t);
  const ck = sm(T.tienes - 0.1, T.tienes + 0.2, t) * (1 - sm(T.count1 - 0.05, T.count1 + 0.2, t));
  if (ck > 0) { g.save(); g.globalAlpha = ck; g.translate(540, 1555); rr(-260, -50, 520, 100, 50); g.fillStyle = 'rgba(8,10,14,0.74)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.26)'; g.lineWidth = 3; g.stroke(); txt('💬  COMENTA TU LETRA', 0, 18, 50, '#F2F5F8', 400, 'center', 'Bebas'); g.restore(); }
  if (t > T.count0 - 0.02 && t < T.tiempo + 0.25) {
    const e = t - T.count0, n = Math.min(5, 1 + Math.floor(Math.max(0, e))), f = Math.max(0, e) % 1, k = cl(e / 4.0), out = 1 - sm(T.tiempo, T.tiempo + 0.25, t);
    g.save(); g.globalAlpha = out; g.translate(540, 1735);
    g.beginPath(); g.arc(0, 0, 84, 0, 7); g.fillStyle = 'rgba(8,10,14,0.78)'; g.fill();
    g.beginPath(); g.arc(0, 0, 84, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.strokeStyle = n >= 5 ? RED2 : '#FF7A1A'; g.lineWidth = 10; g.lineCap = 'round'; g.stroke();
    const s = 1 + 0.4 * Math.pow(1 - (n >= 5 ? Math.min(1, (e - 4) * 3) : f), 5); g.scale(s, s);
    txt(String(n), 0, 38, 116, n >= 5 ? '#FF6B5E' : '#FFFFFF', 400, 'center', 'Bebas'); g.restore();
  }
  stamp('¡TIEMPO!', 1080, RED2, Math.exp(-Math.pow((t - T.tiempo - 0.35) / 0.32, 4)), 180);
  const pg = proj(ghost.position.clone().add(V(0, 0.5, 0)));
  chip(pg.x + 200, pg.y + 260, 'SIN BLOQUEADOR', RED2, pg.ok && ghost.visible ? ghostM.opacity * 1.2 : 0, 0.95, 'warn', 50);
  rewind(t);
  // el bloqueador y sus rayos X
  const pd = proj(DEV.clone().add(V(0, 0.16, 0)));
  chip(pd.x, pd.y - 60, 'BLOQUEADOR', GOLD2, pd.ok ? sm(T.bloqueador - 0.1, T.bloqueador + 0.2, t) * (1 - sm(T.leva - 0.3, T.leva, t)) : 0, 1.05, null, 62);
  chip(540, 640, 'LEVA CON DIENTES', ORANGE2, sm(T.dientes - 0.1, T.dientes + 0.2, t) * (1 - sm(T.arriba - 0.3, T.arriba, t)), 1, null, 60);
  chip(540, 640, 'LA CUERDA CORRE', GREEN2, sm(T.arriba - 0.1, T.arriba + 0.2, t) * (1 - sm(T.abajo - 0.3, T.abajo, t)), 1, 'up', 60);
  chip(540, 640, '¡LA MUERDE!', RED2, sm(T.muerde - 0.1, T.muerde + 0.15, t) * (1 - sm(T.poreso - 0.3, T.poreso, t)), 1 + 0.12 * pulse(t, T.muerde + 0.15, 0.2), 'down', 66);
  // tiras, descansas… y no baja
  chip(py.x, py.y, 'TIRAS', GOLD2, py.ok ? sm(T.tiras - 0.1, T.tiras + 0.2, t) * (1 - sm(T.descansas - 0.3, T.descansas, t)) : 0, 1, 'up', 54);
  chip(py.x, py.y, 'DESCANSAS', 'rgba(255,255,255,0.7)', py.ok ? sm(T.descansas - 0.1, T.descansas + 0.2, t) * (1 - sm(T.nobaja - 0.2, T.nobaja, t)) : 0, 1, null, 54);
  chip(ps.x, ps.y - 120, 'NO BAJA', GREEN2, ps.ok ? sm(T.nobaja - 0.1, T.nobaja + 0.2, t) * (1 - sm(T.truco - 0.3, T.truco, t)) : 0, 1.05, 'ok', 58);
  // el puño y el croll
  const pp = proj(puno.position.clone()), pc = proj(croll.position.clone());
  chip(pp.x - 230, pp.y - 30, 'PUÑO', GOLD2, pp.ok ? sm(T.puno - 0.1, T.puno + 0.2, t) * (1 - sm(T.colgarias - 0.3, T.colgarias, t)) : 0, 1, null, 56);
  chip(pc.x - 230, pc.y + 60, 'CROLL', GOLD2, pc.ok ? sm(T.croll - 0.1, T.croll + 0.2, t) * (1 - sm(T.colgarias - 0.3, T.colgarias, t)) : 0, 1, null, 56);
  // final: dímelo en comentarios
  const ce = sm(T.comentarios - 0.15, T.comentarios + 0.15, t) * (1 - sm(T.fin - 0.3, T.fin + 0.05, t));
  if (ce > 0) {
    const b = 1 + 0.05 * Math.max(0, Math.sin((t - T.comentarios) * 6));
    g.save(); g.globalAlpha = ce; g.translate(540, 1560); g.scale(b, b); rr(-400, -56, 800, 112, 56); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('💬  DÍMELO EN COMENTARIOS', 0, 20, 56, '#F2F5F8', 400, 'center', 'Bebas'); g.restore();
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
  const fl1 = Math.exp(-Math.pow((t - T.tiempo - 0.03) / 0.07, 2)) * 0.3, fl2 = Math.exp(-Math.pow((t - T.muerde - 0.05) / 0.07, 2)) * 0.18;
  finMat.uniforms.uFlash.value = Math.max(fl1, fl2); finMat.uniforms.uFlashCol.value.setRGB(1, 0.4, 0.3);
  finMat.uniforms.uDim.value = (t >= T.fin ? mx(1, 0.45, sm(T.compartir - 0.2, T.compartir + 0.3, t)) : 1) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  await overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 1.0);

(async () => {
  try {
    while (!_r2d) await new Promise(r => setTimeout(r, 30));
    await document.fonts.ready;
    NOISE = noiseTex(); mats();
    buildWorld();
    world.updateMatrixWorld(true);
    setupTimes();
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'bloqueadores: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
