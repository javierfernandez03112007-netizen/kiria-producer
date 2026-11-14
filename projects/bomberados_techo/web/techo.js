// «¿Por qué el bombero echa el agua al techo?» — idea de Javi (14 nov): «no lo hace mal, es una técnica». Con el MENSAJE
// (bomberados/MENSAJE.md): un salón ardiendo visto por dentro (casa de muñecas), el bombero agachado en la puerta dando golpes
// cortos de agua pulverizada al techo, donde se junta el humo (gas sin quemar) que brilla; la versión «si apuntara al sofá»
// (el humo prende de golpe: combustión súbita) y vuelta atrás; el humo se enfría (gris); el reto con cuenta (¿por qué a
// golpes?) → 1 L de agua = 1.700 L de vapor; a chorro, el vapor baja hasta el suelo y quema.
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






// ================================================================== el salón (casa de muñecas: sin la pared de delante ni la de la izquierda)
const world = new THREE.Group(); scene.add(world);
const ROOM_W = 3.8, ROOM_L = 5.6, ROOM_H = 2.7;                 // x −1.9…1.9 · z −5.6…0 · y 0…2.7
const BLUE2 = '#3FB6FF', RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D';
const COLS = ['#FF7A1A', '#2DD4BF', '#F0457A'];
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
const FF = V(0.95, 0, -1.15);                                      // el bombero, agachado junto a la puerta
let ff, nozzle, fireS, fireRoom, fireL, fireL2, smokeU, steamU, layer, steamBox, pulses = [], jetS, steamP, bottle1L, cube, cubeM, hoseM, ceilP;

function addLegs(ff) {
  ff.updateMatrixWorld(true);
  const legs = [-1, 1].map(s => { const L = new THREE.Group(); L.position.set(0.11 * s, 0.85, 0); ff.add(L); return L; });
  ff.updateMatrixWorld(true);
  for (const m of [...ff.children]) if (m.isMesh && m.position.y < 0.8 && Math.abs(Math.abs(m.position.x) - 0.11) < 0.01) legs[m.position.x > 0 ? 1 : 0].attach(m);
  ff.userData.legs = legs; return ff;
}
function face(o, dir) { o.rotation.y = Math.atan2(-dir.x, -dir.z); }

// la capa de humo del techo: gas sin quemar que brilla con el fuego de abajo, que prende (combustión súbita) o se enfría
const LAYER_V = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const LAYER_F = `uniform sampler2D uTex; uniform float uTime, uHot, uIgn, uCool, uSteam, uA; uniform vec3 uFire;
varying vec3 vW;
void main(){
  float n = texture2D(uTex, vW.xz * 0.16 + vec2(uTime * 0.035, -uTime * 0.02) + vW.y * 0.05).r;
  float n2 = texture2D(uTex, vW.xz * 0.42 - vec2(uTime * 0.06, uTime * 0.045) + vW.y * 0.1).r;
  float d = 0.6 + 0.4 * (0.6 * n + 0.4 * n2);
  vec2 df = vW.xz - uFire.xz; float near = exp(-dot(df, df) / 5.0);          // brilla más encima del fuego
  vec3 col = vec3(0.03, 0.027, 0.024) * d;                                   // humo negro y espeso
  col += vec3(1.5, 0.45, 0.1) * uHot * d * (0.12 + 0.88 * near) * (0.35 + 0.65 * n2);
  col += vec3(1.8, 0.6, 0.12) * uIgn * smoothstep(0.3, 0.75, n * 0.7 + n2 * 0.6);
  col = mix(col, vec3(0.2, 0.21, 0.23) * d, uCool);
  col = mix(col, vec3(0.85, 0.87, 0.9) * (0.75 + 0.25 * n), uSteam);
  float a = clamp((0.92 * d + 0.08 * uIgn) * uA, 0.0, 0.98);
  a *= mix(1.0, 0.3 + 0.7 * smoothstep(0.0, 2.7, vW.y), uSteam);              // el vapor, más denso arriba: se ve al bombero dentro
  gl_FragColor = vec4(col * a, a);
}`;
function layerBox(u) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W - 0.02, 1, ROOM_L - 0.02), new THREE.ShaderMaterial({ uniforms: u, vertexShader: LAYER_V, fragmentShader: LAYER_F,
    transparent: true, depthWrite: false, side: THREE.FrontSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }));
  m.renderOrder = 13; world.add(m); return m;
}
function setLayer(m, h) { const th = Math.max(0.02, ROOM_H - h); m.scale.y = th; m.position.set(0, h + th / 2, -ROOM_L / 2); }

function buildWorld() {
  world.add(new THREE.HemisphereLight(0x4a5a7a, 0x120a06, 0.35));
  const key = new THREE.DirectionalLight(0x9db8ff, 0.18); key.position.set(-6, 8, 6); world.add(key);
  const wood = canvasTex(512, 512, (x) => { x.fillStyle = '#5a3c26'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#64432b' : '#4e3421'; x.fillRect(0, i * 32, 512, 30); }
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${0.05 + rnd(i) * 0.06})`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 30 + rnd(i) * 60, 1); } }, { aniso: 4 });
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(2, 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_L), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -ROOM_L / 2); floor.receiveShadow = true; world.add(floor);
  const paper = canvasTex(512, 512, (x) => { x.fillStyle = '#b9ad98'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 24; i++) { x.fillStyle = 'rgba(120,100,80,0.18)'; x.fillRect(i * 22, 0, 6, 512); } }, { aniso: 4 });
  paper.wrapS = paper.wrapT = THREE.RepeatWrapping; paper.repeat.set(3, 2);
  const wallM = new THREE.MeshStandardMaterial({ map: paper, roughness: 0.9 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), wallM); back.position.set(0, ROOM_H / 2, -ROOM_L); back.receiveShadow = true; world.add(back);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.0), new THREE.MeshStandardMaterial({ color: 0x0c1830, emissive: 0x0a1630, emissiveIntensity: 1, roughness: 0.2 })); win.position.set(0.9, 1.55, -ROOM_L + 0.01); world.add(win);
  // pared derecha con la puerta (z −1.6…−0.6, 2,1 m)
  const rightParts = [[-ROOM_L, -1.6], [-0.6, 0]];
  for (const [z0, z1] of rightParts) { const w = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, ROOM_H), wallM); w.rotation.y = -Math.PI / 2; w.position.set(ROOM_W / 2, ROOM_H / 2, (z0 + z1) / 2); w.receiveShadow = true; world.add(w); }
  const lint = new THREE.Mesh(new THREE.PlaneGeometry(1.0, ROOM_H - 2.1), wallM); lint.rotation.y = -Math.PI / 2; lint.position.set(ROOM_W / 2, 2.1 + (ROOM_H - 2.1) / 2, -1.1); world.add(lint);
  const corr = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.1), new THREE.MeshStandardMaterial({ color: 0x080808, emissive: 0x1a1008, emissiveIntensity: 1 })); corr.rotation.y = -Math.PI / 2; corr.position.set(ROOM_W / 2 + 0.6, 1.05, -1.1); world.add(corr);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_L), new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, ROOM_H, -ROOM_L / 2); world.add(ceil);
  // los cantos del corte (casa de muñecas)
  const edgeM = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.8 });
  for (const [w, h, d, x, y, z] of [[0.18, ROOM_H + 0.18, 0.18, -ROOM_W / 2 - 0.09, ROOM_H / 2, 0.09], [0.18, ROOM_H + 0.18, 0.18, ROOM_W / 2 + 0.09, ROOM_H / 2, 0.09],
    [ROOM_W + 0.36, 0.18, 0.18, 0, ROOM_H + 0.09, 0.09], [0.18, 0.18, ROOM_L + 0.18, -ROOM_W / 2 - 0.09, ROOM_H + 0.09, -ROOM_L / 2], [0.18, ROOM_H + 0.18, 0.18, -ROOM_W / 2 - 0.09, ROOM_H / 2, -ROOM_L - 0.09],
    [ROOM_W + 0.36, 0.12, ROOM_L + 0.18, 0, -0.06, -ROOM_L / 2]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), edgeM); b.position.set(x, y, z); world.add(b); }
  // muebles: sofá (ardiendo), mesa baja con alfombra, estantería y lámpara
  const sofaM = new THREE.MeshStandardMaterial({ color: 0x4a2a22, roughness: 0.9 }), cushM = new THREE.MeshStandardMaterial({ color: 0x5a3328, roughness: 0.95 });
  const sofa = new THREE.Group(); sofa.position.set(-0.55, 0, -5.05); world.add(sofa);
  const sb = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.05), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; sofa.add(b); };
  sb(2.1, 0.42, 0.9, 0, 0.21, 0, sofaM); sb(2.1, 0.55, 0.22, 0, 0.62, -0.34, sofaM); sb(0.22, 0.62, 0.9, -1.0, 0.31, 0, sofaM); sb(0.22, 0.62, 0.9, 1.0, 0.31, 0, sofaM);
  for (const x of [-0.45, 0.45]) sb(0.86, 0.16, 0.68, x, 0.5, 0.06, cushM);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), new THREE.MeshStandardMaterial({ color: 0x3a4a5a, roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(-0.5, 0.005, -3.6); world.add(rug);
  const tab = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.08, 0.55, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0x2c1e14, roughness: 0.5 })); tab.position.set(-0.5, 0.4, -3.6); tab.castShadow = true; world.add(tab);
  for (const [x, z] of [[-0.95, -3.85], [-0.05, -3.85], [-0.95, -3.35], [-0.05, -3.35]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 8), M.black); l.position.set(x, 0.18, z); world.add(l); }
  const shelf = new THREE.Mesh(new RoundedBoxGeometry(0.4, 1.9, 1.3, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.7 })); shelf.position.set(ROOM_W / 2 - 0.22, 0.95, -3.4); shelf.castShadow = true; world.add(shelf);
  for (let k = 0; k < 4; k++) for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26 + rnd(i + k * 9) * 0.1, 0.08), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rnd(i * 3 + k) , 0.4, 0.3), roughness: 0.8 }));
    b.position.set(ROOM_W / 2 - 0.36, 0.25 + k * 0.45, -3.95 + i * 0.12); world.add(b); }
  const lampP = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8), M.steel); lampP.position.set(1.1, 0.75, -5.2); world.add(lampP);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.25, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xd9cbb0, roughness: 0.9, side: THREE.DoubleSide })); shade.position.set(1.1, 1.55, -5.2); world.add(shade);
  // el fuego del sofá, la luz que parpadea, y el fuego de toda la habitación (solo en la combustión súbita)
  fireS = fireSet(world, V(-0.55, 0.55, -5.0), tongues(9, 5, (i, r) => [-1.45 + i * 0.22 + (r(1) - 0.5) * 0.1, 0.52, -5.0 + (r(2) - 0.5) * 0.4, 0.55 + 0.3 * r(3), 1.1 + 0.9 * r(4)]),
    { seed: 5, extent: [0.9, 0.1, 0.3], smokeN: 30, smokeSize: 0.7, smokeY: 1.2, emberN: 50, bright: 1.25 });
  fireRoom = new Flames(tongues(26, 13, (i, r) => [-1.7 + r(1) * 3.4, 0.02 + r(5) * 0.3, -5.4 + r(2) * 4.6, 0.7 + 0.5 * r(3), 1.6 + 1.1 * r(4)]), { seed: 13, bright: 0.95 });
  world.add(fireRoom.mesh);
  fireL = new THREE.PointLight(0xff6a1a, 25, 0, 2); fireL.position.set(-0.55, 1.2, -4.6); world.add(fireL);
  fireL2 = new THREE.PointLight(0xff5a10, 0, 0, 2); fireL2.position.set(0, 2.2, -2.8); world.add(fireL2);
  // la capa de humo (y la de vapor)
  smokeU = { uTex: { value: NOISE }, uTime: { value: 0 }, uHot: { value: 0.6 }, uIgn: { value: 0 }, uCool: { value: 0 }, uSteam: { value: 0 }, uA: { value: 1 }, uFire: { value: V(-0.55, 2, -4.9) } };
  layer = layerBox(smokeU);
  steamU = { uTex: { value: NOISE }, uTime: { value: 0 }, uHot: { value: 0 }, uIgn: { value: 0 }, uCool: { value: 0 }, uSteam: { value: 1 }, uA: { value: 0 }, uFire: { value: V(-0.55, 2, -4.9) } };
  steamBox = layerBox(steamU); steamBox.renderOrder = 14;
  ceilP = new Parts(60, { life: 6, rise: 0.05, acc: 0, size: 1.4, grow: 1.6, turb: 0.5, rot: 6.28, opacity: 0.5, c: [[0.09, 0.08, 0.07], [0.07, 0.065, 0.06], [0.06, 0.055, 0.05], [0.05, 0.05, 0.05]], seed: 61, extent: [1.8, 0.2, 2.6], order: 12 });
  ceilP.at(0, 2.35, -2.8); world.add(ceilP.mesh);
  // el bombero, agachado, con la lanza y su manguera que sale por la puerta
  ff = addLegs(makeFirefighter()); ff.position.copy(FF); face(ff, V(-0.42, 0, -1).normalize()); world.add(ff);
  ff.traverse(o => { if (o.isMesh) o.castShadow = true; });
  ff.position.y = -0.36; ff.userData.legs[1].rotation.x = -1.15; ff.userData.legs[0].rotation.x = 0.35;
  nozzle = new THREE.Group(); nozzle.position.set(0.02, 1.0, -0.36); ff.add(nozzle);
  const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.05, 0.42, 16), M.chrome); nz.rotation.x = Math.PI / 2; nozzle.add(nz);
  const hd = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.14, 0.06, 2, 0.02), M.black); hd.position.set(0, -0.08, 0.06); nozzle.add(hd);
  ff.updateMatrixWorld(true);
  const h0 = ff.localToWorld(V(0.05, 0.95, -0.15)), h1 = ff.localToWorld(V(0.15, 0.2, 0.45));
  hoseM = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([h0, h1, V(h1.x + 0.3, 0.07, h1.z + 0.1), V(1.5, 0.07, -1.0), V(ROOM_W / 2 + 0.2, 0.07, -1.1), V(ROOM_W / 2 + 1.6, 0.07, -1.2)], false, 'centripetal'), 160, HOSE_R, 10),
    new THREE.MeshStandardMaterial({ color: 0xe9e3d3, roughness: 0.65 })); hoseM.castShadow = true; world.add(hoseM);
  // golpes cortos de agua pulverizada (uno por ventana de tiempo) y el chorro
  for (let k = 0; k < 6; k++) { const j = waterJet(500, { v0: 7.5, drag: 1.2, life: 0.9, size: 0.06, spreadA: 0.28, spreadB: 0.12, grav: 1.2, seed: 70 + k, opacity: 0.75 }); world.add(j.mesh); pulses.push(j); }
  jetS = waterJet(1400, { v0: 11, drag: 0.6, life: 0.8, size: 0.06, spreadA: 0.03, spreadB: 0.04, grav: 2.0, seed: 90, opacity: 0.75 }); world.add(jetS.mesh);
  steamP = new Parts(120, { life: 3.0, rise: -0.45, acc: 0, size: 1.2, grow: 2.2, turb: 0.6, rot: 6.28, opacity: 0, c: [[0.95, 0.96, 1.0], [0.85, 0.87, 0.9], [0.75, 0.77, 0.8], [0.65, 0.66, 0.7]], seed: 93, extent: [1.6, 0.2, 2.2], order: 14 });
  steamP.at(-0.2, 2.4, -2.9); world.add(steamP.mesh);
  // 1 litro → 1.700 litros de vapor
  bottle1L = new THREE.Group(); bottle1L.position.set(0.15, 0, -2.05); world.add(bottle1L);
  const bg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.24, 20), new THREE.MeshPhysicalMaterial({ color: 0x8fd0ff, roughness: 0.1, transmission: 0.6, transparent: true, opacity: 0.8 })); bg.position.y = 0.12; bottle1L.add(bg);
  const bc = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0x2060c0 })); bc.position.y = 0.26; bottle1L.add(bc);
  cubeM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9aa6b4, emissiveIntensity: 0.5, transparent: true, opacity: 0.0, roughness: 1, depthWrite: false });
  cube = new THREE.Mesh(new RoundedBoxGeometry(1.19, 1.19, 1.19, 3, 0.08), cubeM); cube.position.set(-0.75, 0.6, -2.5); cube.renderOrder = 15; world.add(cube);
}

// ------------------------------------------------------------------ tiempos y cámara (un dron que no para)
let T = {}, KEYS = null;
function setupTimes() {
  T = { ...CUE, end: END };
  const L = window.LINES_;
  T.count0 = L[5].end + 0.05; T.count1 = T.count0 + 4.0;
  T.fin = T.compartir - 0.25;
  T.ign0 = T.golpe3 - 0.15; T.room0 = T.arde - 0.1; T.rew0 = T.poreso - 0.45; T.rew1 = T.poreso + 0.05;   // ¿y si apuntara al sofá?
  T.p = [0.15, 0.95, 1.75, T.golpes4, T.golpes4 + 0.55, T.golpes4 + 1.1];                               // golpes cortos al techo
  T.jet0 = T.chorro - 0.05; T.jet1 = T.quema + 0.6;
  KEYS = camKeys();
}
function camKeys() {
  const K = [
    [0, [1.65, 1.0, 0.75, -0.6, 2.0, -3.6, 50]],                          // detrás del bombero: el agua al techo y el sofá ardiendo
    [T.fuego1, [0.45, 1.1, 1.6, -0.5, 1.6, -4.0, 50]],
    [T.equivocado, [-0.7, 1.3, 1.9, 0.2, 2.1, -3.0, 48]],
    [T.arriba, [0.0, 1.5, 2.7, 0.0, 1.7, -3.0, 54]],                       // abierto: la capa de humo arriba
    [T.golpe3, [0.2, 1.2, 2.3, -0.2, 1.6, -3.5, 56]],                      // ¿y si apuntara al sofá? combustión súbita
    [T.habitacion, [-0.3, 1.25, 2.6, 0.0, 1.5, -3.2, 58]],
    [T.poreso, [1.35, 0.95, 0.85, -0.5, 2.0, -3.4, 50]],                   // rebobina: golpes cortos al techo
    [T.prenda, [0.9, 1.2, 1.5, -0.4, 2.1, -3.2, 50]],
    [T.count0, [-1.0, 1.6, 2.3, 0.0, 1.4, -3.0, 52]],                      // la cuenta
    [T.count0 + 2.0, [1.2, 1.7, 2.5, 0.0, 1.4, -3.0, 52]],
    [T.count1, [0.0, 2.0, 2.7, 0.0, 1.2, -3.0, 54]],
    [T.tiempo + 0.3, [0.5, 1.2, 1.5, -0.3, 0.8, -2.4, 50]],               // la botella de 1 L y el cubo de 1.700 L
    [T.vapor7, [0.2, 1.4, 1.8, -0.3, 0.9, -2.5, 52]],
    [T.chorro, [1.45, 1.0, 0.95, -0.5, 1.8, -3.3, 50]],                    // a chorro: el vapor baja
    [T.suelo, [0.2, 1.3, 2.5, 0.0, 1.0, -3.0, 54]],
    [T.habrias, [0.0, 1.6, 2.9, 0.0, 1.5, -3.0, 54]],
    [T.fin, [0.0, 1.9, 3.6, 0.0, 1.5, -3.0, 52]],
    [T.end, [0.0, 2.2, 4.6, 0.0, 1.5, -3.0, 50]],
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
  const sh = Math.exp(-Math.pow((t - T.tiempo - 0.05) / 0.12, 2)) * 0.06 + Math.exp(-Math.pow((t - T.room0 - 0.05) / 0.15, 2)) * 0.05;
  return pose(V(v[0] + sh * Math.sin(t * 91), v[1] + sh * Math.cos(t * 77), v[2]), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
const whatIf = t => sm(T.arriba + 0.6, T.arriba + 1.2, t) * (1 - sm(T.rew0, T.rew1, t));         // apunta al sofá (la versión mala)
function temp(t) {                       // la temperatura del humo (rótulo)
  let v = mx(380, 450, sm(0, T.arriba, t));
  v = mx(v, 600, sm(T.gas, T.seiscientos + 0.3, t));
  v = mx(v, 820, sm(T.ign0, T.room0 + 0.4, t) * (1 - sm(T.rew0, T.rew1, t)));
  v = mx(v, 230, sm(T.golpes4, T.prenda + 0.3, t));
  v = mx(v, 140, sm(T.jet0 + 0.4, T.suelo, t));
  return v;
}
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => { f.u.uCam.value.copy(cam.position); f.u.uTime.value = t; });
  for (const s of [fireS.s, fireS.e]) s.u.uTime.value = t;
  const wi = whatIf(t), ign = sm(T.ign0, T.ign0 + 0.6, t) * (1 - sm(T.rew0, T.rew1, t)), room = sm(T.room0, T.room0 + 0.5, t) * (1 - sm(T.rew0, T.rew1, t));
  const cool = sm(T.golpes4 + 0.2, T.prenda + 0.3, t);
  // el sofá arde (menos cuando lo enfría la versión mala; casi apagado al final con el agua)
  const sofaK = (1 - 0.45 * wi) * (1 - 0.4 * sm(T.jet0, T.jet1, t));
  fireS.F.u.uInt.value = Math.max(sofaK, room);
  fireRoom.u.uInt.value = room;
  fireL.intensity = (22 + 8 * Math.sin(t * 17) * Math.sin(t * 4.3)) * Math.max(sofaK, 0.4) + 30 * room;
  fireL2.intensity = 30 * ign + 25 * room;
  // la capa de humo: baja, brilla, prende o se enfría; el vapor (a chorro) baja hasta el suelo
  let h = mx(1.75, 1.35, sm(T.arriba, T.seiscientos, t)); h = mx(h, 1.85, cool); h = mx(h, 2.05, sm(T.jet0, T.jet0 + 1, t));
  setLayer(layer, h);
  smokeU.uTime.value = t; smokeU.uHot.value = 0.55 + 0.35 * sm(T.gas, T.seiscientos, t) * (1 - cool); smokeU.uIgn.value = Math.max(ign, room);
  smokeU.uCool.value = cool * (1 - 0.3 * pulse(t, T.golpes4 + 0.3, 0.3)); smokeU.uA.value = 1 - 0.5 * sm(T.jet0, T.jet0 + 1.2, t);
  const st = sm(T.jet0 + 0.2, T.suelo + 0.4, t) * (1 - sm(T.habrias - 0.3, T.habrias + 0.5, t));
  setLayer(steamBox, mx(ROOM_H - 0.02, 0.12, e3(pr(t, T.jet0 + 0.2, T.suelo + 0.4 - T.jet0 - 0.2))));
  steamU.uTime.value = t; steamU.uA.value = 0.62 * st;
  steamP.u.uTime.value = t; steamP.u.uOpacity.value = 0.32 * st;
  ceilP.u.uTime.value = t; ceilP.u.uOpacity.value = 0.45 * (1 - 0.6 * cool) * (1 - st);
  // la lanza: al techo (golpes), al sofá en la versión mala
  const pitch = mx(0.8, -0.2, wi);
  nozzle.rotation.x = pitch; nozzle.rotation.y = mx(0, 0.15, wi);
  nozzle.updateMatrixWorld(true);
  const tip = nozzle.localToWorld(V(0, 0, -0.24)), dir = nozzle.localToWorld(V(0, 0, -1)).sub(nozzle.localToWorld(V(0, 0, 0))).normalize();
  pulses.forEach((j, k) => { const t0 = T.p[k]; j.at(tip.x, tip.y, tip.z); j.u.uDir.value.copy(dir); j.u.uTime.value = t; j.u.uOn0.value = t0; j.u.uOn1.value = t0 + 0.28; });
  jetS.at(tip.x, tip.y, tip.z); jetS.u.uDir.value.copy(dir); jetS.u.uTime.value = t;
  const sofaJet = [T.arriba + 1.0, T.ign0 + 0.3], jets = [[sofaJet[0], sofaJet[1]], [T.jet0, T.jet1]];
  const cur = jets.find(([a, b]) => t > a - 1 && t < b + 1.5) || jets[1];
  jetS.u.uOn0.value = cur[0]; jetS.u.uOn1.value = cur[1];
  // 1 litro y 1.700 litros
  const bA = sm(T.litro - 0.2, T.litro + 0.1, t) * (1 - sm(T.chorro - 0.3, T.chorro, t));
  bottle1L.visible = bA > 0.01; bottle1L.scale.setScalar(0.3 + 0.7 * bk(cl(bA)));
  const cA = e3(pr(t, T.mil - 0.1, 0.9)) * (1 - sm(T.chorro - 0.3, T.chorro, t));
  cube.visible = cA > 0.01; cube.scale.setScalar(Math.max(0.01, cA)); cube.position.y = 0.6 * cA; cubeM.opacity = 0.55 * cl(cA * 1.5);
}

// ------------------------------------------------------------------ capa 2D
function proj(v) { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * W2, y: (-p.y * 0.5 + 0.5) * H2, ok: p.z < 1 }; }
function chip(x, y, text, col, a, s = 1, icon = null, px = 56) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a); g.translate(cl(x, 200, W2 - 200), cl(y, 470, H2 - 230)); g.scale(s, s);
  g.font = `400 ${px}px Bebas`; const tw = g.measureText(text).width, w = tw + (icon ? 100 : 60), h = px * 1.45;
  rr(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  const cx = -w / 2 + 46;
  if (icon === 'ok') { g.beginPath(); g.moveTo(cx - 16, 0); g.lineTo(cx - 4, 13); g.lineTo(cx + 18, -14); g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round'; g.stroke(); }
  else if (icon === 'warn') { g.beginPath(); g.moveTo(cx, -20); g.lineTo(cx + 21, 17); g.lineTo(cx - 21, 17); g.closePath(); g.fillStyle = col; g.fill(); txt('!', cx, 13, 30, '#0b0d10', 400, 'center', 'Bebas'); }
  else if (icon === 'x') { g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 13, -13); g.lineTo(cx + 13, 13); g.moveTo(cx + 13, -13); g.lineTo(cx - 13, 13); g.stroke(); }
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
function thermo(t) {                    // termómetro del humo, pegado a la capa
  const a = sm(0.3, 0.7, t) * (1 - sm(T.porque - 0.3, T.porque, t));
  if (a <= 0.01) return;
  const v = temp(t), hot = v >= 590, cold = v < 300;
  const col = hot ? RED2 : cold ? CYAN2 : ORANGE2;
  const p = proj(V(-0.4, 2.25, -3.0));
  chip(p.x, Math.max(560, p.y), `HUMO ${Math.round(v / 10) * 10} °C`, col, a, 1 + 0.12 * pulse(t, T.seiscientos + 0.2, 0.2), 'warn', 60);
}
const OPTS = [['A', 'PARA QUE LLEGUE MÁS LEJOS'], ['B', 'PARA NO COCERSE CON EL VAPOR'], ['C', 'PARA VER EL FUEGO']];
function cards(t) {                     // 3 tarjetas en columna; tras «¡Tiempo!», A y C tachadas y B en verde
  const tIn = [T.oA, T.oB, T.oC];
  OPTS.forEach(([L, s], i) => {
    const k = Math.max(bk(pr(t, tIn[i] - 0.2, 0.4)) * (1 - sm(T.litro - 0.3, T.litro, t)), bk(pr(t, T.habrias - 0.25 + i * 0.07, 0.4)) * (1 - sm(T.fin - 0.3, T.fin + 0.05, t)));
    if (k <= 0.005) return;
    const bad = i !== 1 && t > T.tiempo + 0.05, good = i === 1 && t > T.cocerse7 - 0.05;
    const cy = 650 + i * 122, side = i % 2 ? 1 : -1;
    const shake = bad ? 10 * Math.sin(t * 80) * pulse(t, T.tiempo + 0.2, 0.2) : 0;
    const pl = !bad && t > T.count0 && t < T.tiempo ? 1 + 0.025 * Math.max(0, Math.sin((t - T.count0) * 7 - i * 1.3)) : 1;
    const pop = good ? 1 + 0.08 * pulse(t, T.cocerse7 + 0.1, 0.15) : 1;
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
  const a = sm(T.rew0, T.rew0 + 0.1, t) * (1 - sm(T.rew1, T.rew1 + 0.2, t));
  if (a <= 0.01) return;
  g.save(); g.globalAlpha = a * 0.5;
  for (let k = 0; k < 24; k++) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, (k * 83 + t * 900) % H2, W2, 3); }
  g.globalAlpha = a; txt('⏪', 540, 1050, 160, '#F4F6F8', 400, 'center', 'sans-serif');
  g.restore();
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  // el bombero y su agua al techo
  const pf = proj(ff.localToWorld(V(0, 1.75, 0)));
  chip(pf.x, pf.y - 40, '¿ERROR?', RED2, pf.ok ? sm(T.equivocado - 0.1, T.equivocado + 0.15, t) * (1 - sm(T.tecnica - 0.15, T.tecnica, t)) : 0, 1, 'x', 58);
  chip(pf.x, pf.y - 40, 'TÉCNICA', GREEN2, pf.ok ? sm(T.tecnica - 0.05, T.tecnica + 0.2, t) * (1 - sm(T.arriba - 0.3, T.arriba, t)) : 0, 1.0 + 0.15 * pulse(t, T.tecnica + 0.15, 0.15), 'ok', 58);
  thermo(t);
  const pc = proj(V(0, 2.4, -3.2));
  chip(pc.x, Math.max(700, pc.y + 150), 'GAS SIN QUEMAR', ORANGE2, sm(T.gas - 0.1, T.gas + 0.2, t) * (1 - sm(T.golpe3 - 0.3, T.golpe3, t)), 1, null, 56);
  chip(540, 1500, '¿Y SI APUNTARA AL SOFÁ?', RED2, whatIf(t) * (1 - sm(T.ign0 - 0.2, T.ign0, t)), 1, 'warn', 58);
  stamp('COMBUSTIÓN SÚBITA', 1250, RED2, sm(T.room0, T.room0 + 0.25, t) * (1 - sm(T.rew0 - 0.1, T.rew0 + 0.1, t)), 120, -0.05);
  rewind(t);
  chip(540, 1500, 'GOLPES CORTOS AL TECHO', GREEN2, sm(T.golpes4 - 0.1, T.golpes4 + 0.2, t) * (1 - sm(T.porque - 0.3, T.porque, t)), 1, 'ok', 58);
  // el reto
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
  // 1 litro → 1.700 litros
  const pb = proj(bottle1L.localToWorld(V(0, 0.45, 0))), pq = proj(V(-0.75, 1.45, -2.5));
  chip(pb.x + 30, pb.y, '1 L DE AGUA', CYAN2, pb.ok ? sm(T.litro - 0.1, T.litro + 0.2, t) * (1 - sm(T.chorro - 0.3, T.chorro, t)) : 0, 1, null, 54);
  chip(pq.x, pq.y - 30, '1.700 L DE VAPOR', '#F4F6F8', pq.ok ? sm(T.mil + 0.2, T.mil + 0.5, t) * (1 - sm(T.chorro - 0.3, T.chorro, t)) : 0, 1 + 0.12 * pulse(t, T.mil + 0.45, 0.2), null, 62);
  // a chorro: el vapor baja y quema
  const hv = sm(T.quema - 0.15, T.quema + 0.25, t) * (1 - sm(T.habrias - 0.4, T.habrias + 0.1, t));   // el vapor quema: borde rojo de calor
  if (hv > 0) { const gr = g.createRadialGradient(540, 1000, 360, 540, 1000, 1150); gr.addColorStop(0, 'rgba(255,60,20,0)'); gr.addColorStop(1, `rgba(255,48,14,${0.48 * hv * (0.82 + 0.18 * Math.sin(t * 9))})`); g.save(); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1920); g.restore(); }
  chip(540, 1500, 'A CHORRO', RED2, sm(T.chorro - 0.1, T.chorro + 0.2, t) * (1 - sm(T.suelo - 0.2, T.suelo, t)), 1, 'warn', 58);
  chip(540, 1500, 'VAPOR A +100 °C: QUEMA', RED2, sm(T.quema - 0.15, T.quema + 0.15, t) * (1 - sm(T.habrias - 0.3, T.habrias, t)), 1.0 + 0.1 * pulse(t, T.quema + 0.15, 0.2), 'warn', 58);
  // final: confiésalo
  const ce = sm(T.confiesalo - 0.15, T.confiesalo + 0.15, t) * (1 - sm(T.fin - 0.3, T.fin + 0.05, t));
  if (ce > 0) {
    const b = 1 + 0.05 * Math.max(0, Math.sin((t - T.confiesalo) * 6));
    g.save(); g.globalAlpha = ce; g.translate(540, 1560); g.scale(b, b); rr(-400, -56, 800, 112, 56); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('💬  CONFIÉSALO EN COMENTARIOS', 0, 20, 56, '#F2F5F8', 400, 'center', 'Bebas'); g.restore();
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
  const fl1 = Math.exp(-Math.pow((t - T.tiempo - 0.03) / 0.07, 2)) * 0.35, fl2 = Math.exp(-Math.pow((t - T.room0 - 0.05) / 0.09, 2)) * 0.12, fl3 = Math.exp(-Math.pow((t - T.rew1) / 0.08, 2)) * 0.3;
  const fm = Math.max(fl1, fl2, fl3);
  finMat.uniforms.uFlash.value = fm;
  if (fm === fl3) finMat.uniforms.uFlashCol.value.setRGB(1, 1, 1); else if (fm === fl2) finMat.uniforms.uFlashCol.value.setRGB(1, 0.6, 0.3); else finMat.uniforms.uFlashCol.value.setRGB(1, 0.35, 0.3);
  finMat.uniforms.uDim.value = (t >= T.fin ? mx(1, 0.5, sm(T.compartir - 0.2, T.compartir + 0.3, t)) : 1) * (1 - sm(T.end - 0.3, T.end, t));
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
    setupTimes(); buildWorld();
    world.updateMatrixWorld(true);
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'techo: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
