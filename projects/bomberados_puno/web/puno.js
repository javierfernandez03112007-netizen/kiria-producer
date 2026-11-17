// «El puño: así se sube por una cuerda» — pieza 1 de 5 de la serie «un vídeo por pieza» (Javi, 17 nov; 30–45 s).
// Una sola idea: cómo sube un bombero por una cuerda con un aparato que cabe en la mano. La leva mordiendo la cuerda
// (enorme), el bombero colgado sobre el vacío, el puño que corre hacia arriba y muerde hacia abajo, el pedal (la pierna
// que pisa tiene rodilla), el paso entero, y el dato de examen abajo, en el suelo: el pedal se mide del suelo al croll y,
// de pie, el brazo queda a 90°. Cierre: «¿Y el croll? ¿Sabes dónde se pone?».
// Mundo, aparatos y bombero de projects/bomberados_bloqueadores_guia/web/guia.js (motor de bomberados_escala/web/escala.js).
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






// ================================================================== el barranco de noche y los cinco bloqueadores
const world = new THREE.Group(); scene.add(world);
scene.fog.density = 0.011;
const BLUE2 = '#3FB6FF', RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D';
const COLS = ['#FF7A1A', '#2DD4BF', '#F0457A', '#8B7CF6'];
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
const EDGE = 3.45, DEPTH = 30;                                   // borde del barranco (z) y profundidad (m)
const HEAD = V(0, 2.55, 4.05), PR = 0.09, RZ = HEAD.z + PR;      // cabeza del trípode (polea) y cuerda de carga
const CLX = 2.6, RX = -2.6, CZ = EDGE + 0.6;                     // cuerda fija del que sube (x) y cuerda del que baja; z de las dos
const P1 = V(-0.13, 0.42, -3.0), PRAD = 0.13, ZB = -2.45;        // polea del anclaje (en el camión) y z del Basic (antirretorno)
const G0 = 0.55, G1 = -0.25;                                     // recorrido del Rescucender por la cuerda de carga (z)
const DS = 2.0;                                                  // los aparatos, al doble de su tamaño real (para que se vean)
const YOU = V(-1.95, 0, -3.45);                                   // el que tira del polipasto
const HZ = EDGE + 0.65, BETA = 0.42;                             // el que baja: z de la cadera y cuánto se echa atrás
const CB0 = -10.0, CYC = 1.5, STEP = 0.42;                         // el que sube: altura inicial de los pies, ciclo y avance por ciclo
const BZ = 0.40, PY0 = 1.95, LP = 1.28, GY = -30;                                     // el que sube: separación del cuerpo a la cuerda y altura del puño sobre los pies
const RP0 = -1.4, RPV = 0.4;                                    // el que baja: altura inicial de la cadera y velocidad
let tripod, basic, puno, croll, resc, shunt, ocho, ghostP, stretcher, bridle = [], loadSegs = [], ropeU, p2, link, you, you2, truck, beacons = [];
let leg, clone, cloneArmL, cloneArmR, cPuno, cCroll, cPedal, cLoop, gdL;
let climber, clArmR, clArmL, pedal, pedalLoop, clRope = [], clRopeU, harnM = [], rap, rapFF, rapArmR, rapArmL, rapRope = [], rapRopeU, lampL, clL, rapL, lanyard = [], blink = [];

function addLegs(ff) {
  ff.updateMatrixWorld(true);
  const legs = [-1, 1].map(s => { const L = new THREE.Group(); L.position.set(0.11 * s, 0.85, 0); ff.add(L); return L; });
  ff.updateMatrixWorld(true);
  for (const m of [...ff.children]) if (m.isMesh && m.position.y < 0.8 && Math.abs(Math.abs(m.position.x) - 0.11) < 0.01) legs[m.position.x > 0 ? 1 : 0].attach(m);
  ff.userData.legs = legs; return ff;
}
function face(o, dir) { o.rotation.y = Math.atan2(-dir.x, -dir.z); }      // el bombero mira hacia −Z

// ------------------------------------------------------------------ los aparatos: un mismo dibujo (perfiles en metros, la cuerda en x = 0) para el 3D y para los iconos
const arcP = (cx, cy, r, a0, a1, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
const rrP = (x0, y0, x1, y1, r, n = 4) => [...arcP(x1 - r, y0 + r, r, -Math.PI / 2, 0, n), ...arcP(x1 - r, y1 - r, r, 0, Math.PI / 2, n), ...arcP(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, n), ...arcP(x0 + r, y0 + r, r, Math.PI, 1.5 * Math.PI, n)];
const circP = (cx, cy, r, n = 24) => arcP(cx, cy, r, 0, 2 * Math.PI, n).slice(0, -1);
const YEL = '#F2C21A', GOLDD = '#E0A91C', SILV = '#BFC5CD', BLK = '#1B1D21', DARK = '#3A3D42', REDD = '#D8261C', STEEL = '#7F8EA3', LEVG = '#C9CED6', LEVS = '#A9B0B9';
// leva con dientes (pivote en el origen; los dientes miran a −x, hacia la cuerda)
const CAMP = (() => {
  const k = 0.62, p = [[0.022, 0.018], [0.027, -0.012], [0.02, -0.042], [0.004, -0.064], [-0.018, -0.071], [-0.029, -0.064]];
  for (let i = 0; i < 7; i++) { const y = -0.058 + i * 0.0072; p.push([-0.037, y + 0.0026], [-0.03, y + 0.0062]); }
  p.push([-0.026, -0.006], [-0.012, 0.016], [0.008, 0.025]);
  return p.map(([x, y]) => [x * k, y * k]);
})();
const headParts = col => [          // la «cabeza» que comparten el puño y el Basic: placa, labio del canal y agujero de arriba
  { p: rrP(-0.016, 0.018, 0.046, 0.100, 0.008), holes: [[0.034, 0.089, 0.0055]], c: col, d: 0.006, z: -0.014 },
  { p: rrP(-0.016, 0.028, -0.0095, 0.100, 0.002), c: col, d: 0.028, z: -0.014 },
];
const DEVS = {
  puno: { parts: headParts(YEL),
    handle: [
      { p: rrP(-0.006, -0.112, 0.070, 0.030, 0.014), holes: [{ p: rrP(0.010, -0.086, 0.046, 0.012, 0.010) }, [0.028, -0.0995, 0.0055]], c: YEL, d: 0.006, z: -0.014 },
      { p: rrP(0.043, -0.082, 0.075, 0.008, 0.010), c: BLK, d: 0.024, z: -0.023 }],
    cam: { pivot: [0.029, 0.066], c: BLK } },
  croll: { parts: [
      { p: [[-0.016, -0.036], [-0.012, -0.040], [0.034, -0.040], [0.046, -0.028], [0.046, 0.026], [0.030, 0.048], [-0.012, 0.048], [-0.016, 0.044]], holes: [[0.033, -0.026, 0.0065]], c: GOLDD, d: 0.006, z: -0.014 },
      { p: rrP(-0.016, -0.030, -0.0095, 0.046, 0.002), c: GOLDD, d: 0.028, z: -0.014 },
      { p: rrP(0.004, 0.042, 0.030, 0.074, 0.008), holes: [{ p: rrP(0.011, 0.053, 0.023, 0.066, 0.004) }], c: GOLDD, d: 0.005, z: -0.012 }],
    cam: { pivot: [0.029, 0.024], c: BLK } },
  basic: { parts: [...headParts(SILV), { p: circP(0.015, 0.004, 0.024), holes: [[0.015, 0.002, 0.0125]], c: SILV, d: 0.006, z: -0.014 }],
    cam: { pivot: [0.029, 0.066], c: BLK } },
  resc: { parts: [
      { p: [[-0.018, -0.040], [-0.014, -0.044], [0.032, -0.044], [0.036, -0.040], [0.036, 0.040], [0.032, 0.044], ...arcP(0.012, 0.014, 0.030, Math.PI / 2, Math.PI, 8)], c: YEL, d: 0.006, z: -0.016 },
      { p: rrP(-0.018, -0.044, -0.0095, 0.018, 0.002), c: YEL, d: 0.030, z: -0.016 },
      { p: [...arcP(0.012, 0.014, 0.030, Math.PI / 2, Math.PI, 8), ...arcP(0.012, 0.014, 0.0215, Math.PI, Math.PI / 2, 8)], c: YEL, d: 0.030, z: -0.016 },
      { p: circP(0.022, 0.033, 0.0055, 14), c: REDD, d: 0.008, z: -0.010 }],
    slide: [                        // la leva RANURADA (sin dientes): bloque gris con ranuras, y el brazo con su anilla
      { p: rrP(0.0085, -0.024, 0.034, 0.022, 0.005), c: LEVG, d: 0.014, z: -0.002 },
      ...[0, 1, 2, 3, 4].map(i => ({ p: rrP(0.0085, -0.0195 + i * 0.0085, 0.022, -0.016 + i * 0.0085, 0.0006, 1), c: DARK, d: 0.0012, z: 0.0118 })),
      { p: rrP(0.032, -0.012, 0.050, 0.004, 0.002), c: BLK, d: 0.007, z: 0.001 },
      { p: circP(0.064, -0.004, 0.019), holes: [[0.064, -0.004, 0.011]], c: BLK, d: 0.007, z: 0.001 }] },
  shunt: { parts: [
      { p: rrP(-0.016, -0.038, 0.016, 0.040, 0.005), c: SILV, d: 0.005, z: -0.016 },
      { p: rrP(-0.016, -0.030, -0.0095, 0.040, 0.002), c: SILV, d: 0.030, z: -0.016 },
      { p: rrP(0.0095, -0.030, 0.016, 0.040, 0.002), c: SILV, d: 0.030, z: -0.016 },
      { p: [[-0.016, 0.040], [-0.016, 0.056], [-0.008, 0.070], [0.008, 0.078], [0.026, 0.076], [0.040, 0.066], [0.046, 0.052], [0.036, 0.050], [0.028, 0.060], [0.012, 0.063], [0.016, 0.040]], c: SILV, d: 0.030, z: -0.016 },
      { p: circP(0.004, -0.044, 0.011, 6), c: BLK, d: 0.012, z: -0.004 }],
    lever: { pivot: [0.004, -0.044], parts: [
      { p: [[-0.006, -0.008], [0.046, 0.014], [0.042, 0.026], [-0.010, 0.008]], c: LEVS, d: 0.008, z: 0.0 },
      { p: circP(0.056, 0.024, 0.016), holes: [[0.056, 0.024, 0.009]], c: LEVS, d: 0.008, z: 0.0 }] } },
  ocho: { parts: [
      { p: circP(0, 0.030, 0.034), holes: [[0, 0.030, 0.022]], c: STEEL, d: 0.008, z: -0.004 },
      { p: circP(0, -0.020, 0.020), holes: [[0, -0.020, 0.010]], c: STEEL, d: 0.008, z: -0.004 }] },
};
const isDark = c => c === BLK || c === DARK;
const C3D = { [SILV]: '#8d95a0', [LEVS]: '#7b838d', [LEVG]: '#989fa8', [STEEL]: '#6f7f96' };      // en 3D, los plateados van más oscuros (con la luz salían blancos)
function shapeOf(pt) {
  const s = new THREE.Shape(pt.p.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of pt.holes || []) {
    const q = new THREE.Path();
    if (Array.isArray(h)) q.absarc(h[0], h[1], h[2], 0, Math.PI * 2, true); else q.setFromPoints(h.p.map(([x, y]) => new THREE.Vector2(x, y)));
    s.holes.push(q);
  }
  return s;
}
function partsGroup(parts, mats) {
  const G = new THREE.Group();
  for (const pt of parts) {
    const geo = new THREE.ExtrudeGeometry(shapeOf(pt), { depth: pt.d, bevelEnabled: pt.d > 0.003, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1, curveSegments: 10 });
    let m = mats.get(pt.c);
    if (!m) {
      const gray = C3D[pt.c], dark = isDark(pt.c), b = dark ? 0.03 : gray ? 0.05 : 0.16, gn = dark ? 0.3 : gray ? 0.55 : 1.0;
      m = new THREE.MeshStandardMaterial({ color: gray || pt.c, metalness: dark ? 0.2 : gray ? 0.35 : 0.5, roughness: dark ? 0.55 : 0.45, emissive: gray || pt.c, emissiveIntensity: b });
      m.userData = { b, gn }; mats.set(pt.c, m);
    }
    const mesh = new THREE.Mesh(geo, m); mesh.position.z = pt.z; mesh.castShadow = true; G.add(mesh);
  }
  return G;
}
function makeDev(name, s = DS) {
  const D = DEVS[name], mats = new Map(), G = new THREE.Group(), ud = { mats, name };
  G.add(partsGroup(D.parts, mats));
  if (D.handle) { ud.handle = new THREE.Group(); ud.handle.position.y = 0.030; const h = partsGroup(D.handle, mats); h.position.y = -0.030; ud.handle.add(h); G.add(ud.handle); }
  if (D.cam) {
    const c = new THREE.Group(); c.position.set(D.cam.pivot[0], D.cam.pivot[1], 0);
    c.add(partsGroup([{ p: CAMP, c: D.cam.c, d: 0.012, z: -0.002 }], mats));
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.032, 10), M.chrome); pin.rotation.x = Math.PI / 2; pin.position.z = 0.002; c.add(pin);
    G.add(c); ud.cam = c;
  }
  if (D.slide) { ud.slide = partsGroup(D.slide, mats); G.add(ud.slide); }
  if (D.lever) { const l = new THREE.Group(); l.position.set(D.lever.pivot[0], D.lever.pivot[1], 0); l.add(partsGroup(D.lever.parts, mats)); G.add(l); ud.lever = l; }
  G.userData = ud; G.scale.setScalar(s);
  return G;
}
function devGlow(G, k) { for (const m of G.userData.mats.values()) m.emissiveIntensity = m.userData.b + k * m.userData.gn; }
function devGrip(G, k) {            // k = 1: muerde la cuerda; k = 0: abierto (la cuerda corre)
  const u = G.userData;
  if (u.cam) u.cam.rotation.z = 0.32 * (1 - k);
  if (u.slide) u.slide.position.x = 0.0045 * (1 - k);
  if (u.lever) u.lever.rotation.z = 0.38 * (1 - k);
}
// icono 2D de un aparato (mismo dibujo), centrado en (cx, cy) dentro de un cuadrado de lado s
function iconParts(name) {
  const D = DEVS[name], L = [];
  const add = (ps, dx = 0, dy = 0) => ps.forEach(pt => L.push({ p: pt.p.map(([x, y]) => [x + dx, y + dy]), holes: (pt.holes || []).map(h => Array.isArray(h) ? [h[0] + dx, h[1] + dy, h[2]] : { p: h.p.map(([x, y]) => [x + dx, y + dy]) }), c: pt.c }));
  if (D.handle) add(D.handle);
  add(D.parts);
  if (D.cam) add([{ p: CAMP, c: D.cam.c }], D.cam.pivot[0], D.cam.pivot[1]);
  if (D.slide) add(D.slide);
  if (D.lever) add(D.lever.parts, D.lever.pivot[0], D.lever.pivot[1]);
  return L;
}
const ICONS = {};
function drawIcon(name, cx, cy, s, a = 1, flip = false) {
  const L = ICONS[name] || (ICONS[name] = (() => {
    const P = iconParts(name); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const pt of P) for (const [x, y] of pt.p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { P, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, ext: Math.max(x1 - x0, y1 - y0) };
  })());
  const k = s / L.ext;
  g.save(); g.globalAlpha *= a; g.translate(cx, cy); g.scale(k, (flip ? 1 : -1) * k); g.translate(-L.cx, -L.cy);
  // la cuerda, detrás
  g.beginPath(); g.moveTo(0, L.cy - L.ext * 0.62); g.lineTo(0, L.cy + L.ext * 0.62); g.strokeStyle = '#E8642A'; g.lineWidth = 0.011; g.lineCap = 'round'; g.stroke();
  for (const pt of L.P) {
    g.beginPath();
    pt.p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
    for (const h of pt.holes) { if (Array.isArray(h)) { g.moveTo(h[0] + h[2], h[1]); g.arc(h[0], h[1], h[2], 0, Math.PI * 2, true); } else { h.p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); } }
    g.fillStyle = pt.c; g.fill('evenodd'); g.strokeStyle = 'rgba(10,10,12,0.55)'; g.lineWidth = 0.0012; g.stroke();
  }
  g.restore();
}

// ------------------------------------------------------------------ la cuerda (trenzado; la coordenada del dibujo es la longitud desde su extremo: se ve correr)
const ROPE_V = `attribute float aS; uniform float uS0, uL; varying float vS; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vS = uS0 + aS * uL; vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const ROPE_F = `uniform float uI; uniform vec3 uCol, uCol2; varying float vS; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  float n = 8.0, a = vS * 44.0 + vUv.x * n, b = vS * 44.0 - vUv.x * n;
  vec2 id = vec2(floor(a), floor(b)), f = vec2(fract(a), fract(b)) - 0.5;
  float top = mod(id.x + id.y, 2.0);                                   // qué mecha pasa por encima en este rombo
  float tr = mix(step(mod(id.y + 4.0, n), 0.5), step(mod(id.x, n), 0.5), top);     // mechas de otro color (una de cada familia)
  float bump = 1.0 - smoothstep(0.18, 0.62, length(f));
  vec3 col = mix(uCol, uCol2, tr * 0.9) * (0.5 + 0.5 * bump);
  vec3 L = normalize(vec3(-0.5, 0.75, 0.45)); float d = 0.45 + 0.55 * max(dot(normalize(vN), L), 0.0);
  vec3 Vd = normalize(cameraPosition - vW); float rim = pow(1.0 - abs(dot(normalize(vN), Vd)), 2.0);
  gl_FragColor = vec4(col * d * uI + uCol * rim * 0.22, 1.0);
}`;
function ropeSeg(u, r = 0.018) {      // un tramo recto de cuerda (cilindro de 1 m que se estira)
  const geo = new THREE.CylinderGeometry(r, r, 1, 16, 1, true);
  const pos = geo.attributes.position, aS = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) aS[i] = pos.getY(i) + 0.5;
  geo.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
  const uu = { uI: u.uI, uCol: u.uCol, uCol2: u.uCol2, uS0: { value: 0 }, uL: { value: 1 } };
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: uu, vertexShader: ROPE_V, fragmentShader: ROPE_F }));
  m.castShadow = true; m.frustumCulled = false; m.userData.u = uu; world.add(m); return m;
}
function placeSeg(m, a, b, s0) {
  const d = b.clone().sub(a), L = Math.max(1e-4, d.length());
  m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  m.userData.u.uS0.value = s0; m.userData.u.uL.value = L; return L;
}
function ropePath(segs, pts, s0 = 0) { let acc = s0; for (let i = 0; i < pts.length - 1; i++) acc += placeSeg(segs[i], pts[i], pts[i + 1], acc); return acc; }
const ropeUni = (c1, c2) => ({ uI: { value: 1 }, uCol: { value: new THREE.Color(...c1) }, uCol2: { value: new THREE.Color(...c2) } });
function between(m, a, b) {             // barra de 1 m (eje Y) estirada de a a b
  const d = b.clone().sub(a), L = Math.max(1e-4, d.length());
  m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
}

// ------------------------------------------------------------------ brazos articulados (hombro → codo → mano) para el que sube y el que baja
function stripArm(ff, side) { for (const m of ff.children) if (m.isMesh && m.position.x * side > 0.285 && m.position.y < 1.42) m.visible = false; }
function mkArm() {
  const jm = new THREE.MeshStandardMaterial({ color: 0x232c3e, roughness: 0.78 });
  const A = { u: new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.064, 1, 12), jm), f: new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.056, 1, 12), jm),
    e: new THREE.Mesh(new THREE.SphereGeometry(0.067, 12, 10), jm), g: new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 10), M.black) };
  for (const k in A) { A[k].castShadow = true; world.add(A[k]); }
  A.m = jm; return A;
}
function armTo(A, S, Tg, hint, L1 = 0.31, L2 = 0.31) {
  const d = Tg.clone().sub(S), dn = d.clone().normalize(), D = Math.min(d.length(), L1 + L2 - 0.004);
  const hand = S.clone().addScaledVector(dn, D);
  const a = (L1 * L1 - L2 * L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const n = hint.clone().addScaledVector(dn, -hint.dot(dn)); if (n.lengthSq() < 1e-6) n.set(1, 0, 0); n.normalize();
  const E = S.clone().addScaledVector(dn, a).addScaledVector(n, h);
  between(A.u, S, E); between(A.f, E, hand); A.e.position.copy(E); A.g.position.copy(hand);
}
function mkLeg() {
  const navy = new THREE.MeshStandardMaterial({ color: 0x1a2130, roughness: 0.84 });
  const L = { u: new THREE.Mesh(new THREE.CylinderGeometry(0.094, 0.088, 1, 14), navy), f: new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.08, 1, 14), navy),
    e: new THREE.Mesh(new THREE.SphereGeometry(0.091, 14, 10), navy), h: new THREE.Mesh(new THREE.SphereGeometry(0.096, 14, 10), navy), g: new THREE.Mesh(new RoundedBoxGeometry(0.135, 0.13, 0.31, 3, 0.045), M.black) };
  for (const k in L) { L[k].castShadow = true; world.add(L[k]); }
  return L;
}
function legTo(L, hip, ankle, hint, L1 = 0.38, L2 = 0.36) {      // cadera → rodilla → tobillo (y la bota)
  const d = ankle.clone().sub(hip), dn = d.clone().normalize(), D = Math.min(d.length(), L1 + L2 - 0.004);
  const end = hip.clone().addScaledVector(dn, D);
  const a = (L1 * L1 - L2 * L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const n = hint.clone().addScaledVector(dn, -hint.dot(dn)); if (n.lengthSq() < 1e-6) n.set(0, 0, -1); n.normalize();
  const K = hip.clone().addScaledVector(dn, a).addScaledVector(n, h);
  between(L.u, hip, K); between(L.f, K, end); L.e.position.copy(K); L.h.position.copy(hip); L.g.position.copy(end).add(V(0, -0.075, -0.035));
}
function rigCroll(ff) {              // el croll va unido al arnés: maillon a la anilla ventral y cinta al pecho
  const st = new THREE.MeshStandardMaterial({ color: 0xaab1ba, metalness: 0.8, roughness: 0.35 });
  const a = V(0, 1.088, 0.066 - BZ), b = V(0, 1.02, -0.2), ml = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 8, 22), st);
  ml.position.copy(a).lerp(b, 0.5); ml.rotation.order = 'YXZ'; ml.rotation.y = Math.PI / 2; ml.scale.set(1.75, 0.62, 1); ml.rotation.z = Math.atan2(b.y - a.y, -(b.z - a.z)); ml.castShadow = true; ff.add(ml);
  const sm_ = new THREE.MeshStandardMaterial({ color: 0xe8561a, roughness: 0.6, emissive: 0xe8561a, emissiveIntensity: 0.12 }); harnM.push(sm_);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.034, 1, 0.012), sm_); between(strap, V(0, 1.27, 0.034 - BZ), V(0, 1.385, -0.19)); strap.castShadow = true; ff.add(strap);
}
function addHarness(ff) {            // arnés integral (cintas naranjas): cintura, perneras, tirantes y punto de enganche
  const m = new THREE.MeshStandardMaterial({ color: 0xe8561a, roughness: 0.6, emissive: 0xe8561a, emissiveIntensity: 0.12 }); harnM.push(m);
  const add = (geo, x, y, z, rx = 0, ry = 0, rz = 0, parent = ff) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; parent.add(o); return o; };
  add(new RoundedBoxGeometry(0.56, 0.075, 0.37, 2, 0.02), 0, 0.93, 0);
  for (const s of [-1, 1]) {
    add(new THREE.TorusGeometry(0.1, 0.02, 8, 24), 0, -0.13, 0, Math.PI / 2, 0, 0, ff.userData.legs[s > 0 ? 1 : 0]);
    add(new THREE.BoxGeometry(0.05, 0.62, 0.02), 0.115 * s, 1.24, -0.165, 0, 0, -0.16 * s);       // tirantes por delante
    add(new THREE.BoxGeometry(0.05, 0.62, 0.02), 0.115 * s, 1.24, 0.165, 0, 0, -0.16 * s);        // y por detrás
    add(new THREE.BoxGeometry(0.05, 0.05, 0.36), 0.17 * s, 1.535, 0);
  }
  add(new RoundedBoxGeometry(0.565, 0.05, 0.375, 2, 0.02), 0, 1.37, 0);                          // cinta de pecho (arnés integral)
  add(new THREE.TorusGeometry(0.035, 0.009, 8, 18), 0, 1.02, -0.19);                             // anilla ventral
  return ff;
}

// ------------------------------------------------------------------ la camilla (nido naranja) con el herido envuelto en la manta
function makeStretcher() {
  const G = new THREE.Group();          // centro en el origen; larga en X
  const shellM = new THREE.MeshStandardMaterial({ color: 0xe8561a, roughness: 0.45 });
  const shell = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.22, 0.62, 4, 0.08), shellM); shell.castShadow = true; G.add(shell);
  const inner = new THREE.Mesh(new RoundedBoxGeometry(1.95, 0.1, 0.5, 3, 0.04), new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.7 })); inner.position.y = 0.08; G.add(inner);
  for (const s of [-1, 1]) for (const x of [-0.85, -0.3, 0.3, 0.85]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12), M.black); h.position.set(x, 0.05, s * 0.32); h.rotation.y = Math.PI / 2; G.add(h); }
  const blanket = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.2, 0.46, 4, 0.08), new THREE.MeshStandardMaterial({ color: 0xa88c40, metalness: 0.4, roughness: 0.55 }));
  blanket.position.set(-0.1, 0.18, 0); G.add(blanket);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 14), new THREE.MeshStandardMaterial({ color: 0xc58f6a, roughness: 0.6 })); head.position.set(0.8, 0.2, 0); G.add(head);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35 })); helm.position.set(0.82, 0.22, 0); helm.rotation.z = -Math.PI / 2; G.add(helm);
  for (const x of [-0.6, 0.0, 0.5]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.66), M.black); st.position.set(x, 0.17, 0); G.add(st); }
  return G;
}

function deviator(x) {                 // desviador en el borde: saca la cuerda 0,6 m de la pared
  const st = new THREE.MeshStandardMaterial({ color: 0x8c9198, metalness: 0.8, roughness: 0.35 });
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 8), st); between(b, V(x + 0.28 * s, 0.02, EDGE - 0.35), V(x, 0.25, CZ)); world.add(b); }
  const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 14), new THREE.MeshStandardMaterial({ color: 0xc23a1c, roughness: 0.4 })); r.rotation.z = Math.PI / 2; r.position.set(x, 0.25, CZ); world.add(r);
  const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 10), new THREE.MeshStandardMaterial({ color: 0xf2c21a, roughness: 0.5 })); stake.position.set(x, 0.35, EDGE - 0.45); world.add(stake);
}
function flatPulley(col = 0xc23a1c) {   // polea tumbada (eje vertical)
  const G = new THREE.Group();
  const w = new THREE.Mesh(new THREE.CylinderGeometry(PRAD - 0.012, PRAD - 0.012, 0.045, 28), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.3 })); G.add(w);
  for (const s of [-1, 1]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(PRAD + 0.03, PRAD + 0.03, 0.008, 28), new THREE.MeshStandardMaterial({ color: 0xb9c0c8, metalness: 0.85, roughness: 0.3 })); pl.position.y = s * 0.03; G.add(pl); }
  return G;
}
function buildWorld() {
  world.add(new THREE.HemisphereLight(0x33466e, 0x0a0705, 0.85));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.55); moon.position.set(-20, 40, 30); world.add(moon);
  // la carretera (arriba), con la bionda cortada donde está el trípode
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#16171a'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 16 + rnd(i) * 26; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(30, 6);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(140, EDGE + 30), new THREE.MeshStandardMaterial({ map: asph, color: 0x5c5c5c, roughness: 0.6, metalness: 0.1 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, EDGE - (EDGE + 30) / 2); road.receiveShadow = true; world.add(road);
  const lineM = new THREE.MeshStandardMaterial({ color: 0x8e8e86, roughness: 0.5, emissive: 0x0c0c0b });
  const l1 = new THREE.Mesh(new THREE.BoxGeometry(140, 0.012, 0.15), lineM); l1.position.set(0, 0.008, 2.6); world.add(l1);
  for (let i = 0; i < 16; i++) { if (i === 8) continue; const d = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.012, 0.15), lineM); d.position.set(-70 + i * 9, 0.008, -1.4); world.add(d); }
  const steel = new THREE.MeshStandardMaterial({ color: 0x626870, metalness: 0.8, roughness: 0.4 });
  for (const [x0, x1] of [[-15.4, -3.4], [3.4, 15.4]]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.32, 0.07), steel); rail.position.set((x0 + x1) / 2, 0.62, EDGE - 0.35); rail.castShadow = true; world.add(rail);
    for (let x = x0; x <= x1; x += 2) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), steel); p.position.set(x, 0.375, EDGE - 0.3); world.add(p); }
  }
  // la pared del barranco: roca con relieve; lisa detrás de las tres cuerdas
  const rockT = canvasTex(512, 512, (x) => { x.fillStyle = '#3a3530'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const v = 30 + rnd(i) * 50; x.fillStyle = `rgba(${v},${v * 0.92},${v * 0.85},0.55)`; x.fillRect(rnd(i * 3.7) * 512, rnd(i * 1.3) * 512, 6 + rnd(i * 2.1) * 40, 2 + rnd(i * 4.4) * 10); }
    for (let i = 0; i < 90; i++) { x.strokeStyle = 'rgba(10,8,6,0.55)'; x.lineWidth = 1 + rnd(i) * 3; x.beginPath(); const sx = rnd(i * 9.1) * 512, sy = rnd(i * 7.7) * 512; x.moveTo(sx, sy); x.lineTo(sx + (rnd(i * 3.3) - 0.5) * 120, sy + rnd(i * 5.5) * 90); x.stroke(); } }, { aniso: 4 });
  rockT.wrapS = rockT.wrapT = THREE.RepeatWrapping; rockT.repeat.set(10, 5);
  const wallG = new THREE.PlaneGeometry(140, DEPTH + 1, 280, 64);
  const wp = wallG.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const x = wp.getX(i), y = wp.getY(i);
    const n = Math.sin(x * 0.9 + Math.sin(y * 0.7) * 2) * 0.18 + Math.sin(x * 2.3 + y * 1.7) * 0.08 + Math.sin(y * 0.35 + x * 0.2) * 0.25;
    const keep = cl(Math.min(Math.abs(x), Math.abs(x - CLX), Math.abs(x - RX)) / 1.1);
    wp.setZ(i, mx(-0.10, n - 0.4, keep * keep * (3 - 2 * keep)));
  }
  wallG.computeVertexNormals();
  const wall = new THREE.Mesh(wallG, new THREE.MeshStandardMaterial({ map: rockT, color: 0x8a8076, roughness: 0.95 }));
  wall.position.set(0, -(DEPTH + 1) / 2 + 0.5, EDGE - 0.05); wall.receiveShadow = true; world.add(wall);
  // el fondo, muy abajo: suelo claro, piedras, niebla baja y el coche que se salió de la carretera (con las luces puestas)
  const floorT = canvasTex(512, 512, (x) => { x.fillStyle = '#6a5e50'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5200; i++) { const v = 60 + rnd(i) * 90; x.fillStyle = `rgba(${v},${v * 0.9},${v * 0.76},0.55)`; const q = 2 + rnd(i * 2.3) * 5; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, q, q); }
    for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(30,26,20,0.35)'; x.beginPath(); x.ellipse(rnd(i * 7.1) * 512, rnd(i * 4.7) * 512, 10 + rnd(i) * 30, 6 + rnd(i * 2) * 14, rnd(i * 3) * 3, 0, 7); x.fill(); } }, { aniso: 4 });
  floorT.wrapS = floorT.wrapT = THREE.RepeatWrapping; floorT.repeat.set(16, 7);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 60), new THREE.MeshStandardMaterial({ map: floorT, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -DEPTH, EDGE + 30); floor.receiveShadow = true; world.add(floor);
  const rockM = new THREE.MeshStandardMaterial({ color: 0x7a7166, roughness: 0.95 }), bushM = new THREE.MeshStandardMaterial({ color: 0x24331c, roughness: 1 });
  for (let i = 0; i < 110; i++) {
    const x = (rnd(i * 3.3) - 0.5) * 60, z = EDGE + 1.2 + rnd(i * 5.1) * 24, sc = 0.15 + rnd(i * 7.7) * 0.6;
    if (Math.hypot(x - CLX, z - CZ) < 2.6) continue;
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(sc, 0), rockM); r.position.set(x, -DEPTH + sc * 0.25, z); r.rotation.set(rnd(i), rnd(i * 2), rnd(i * 3)); r.scale.y = 0.6; world.add(r);
    if (i % 2) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.35 + rnd(i * 9) * 0.5, 7, 5), bushM); b.scale.y = 0.6; b.position.set(x + 1.3, -DEPTH + 0.2, z + 0.8); world.add(b); }
  }
  const mistT = canvasTex(512, 512, (x) => { for (let i = 0; i < 46; i++) { const cx = rnd(i * 3.7) * 512, cy = rnd(i * 9.1) * 512, r = 40 + rnd(i * 5.9) * 110, gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { x.setTransform(1, 0, 0, 1, ox, oy); x.fillRect(cx - r, cy - r, 2 * r, 2 * r); } } x.setTransform(1, 0, 0, 1, 0, 0); });
  mistT.wrapS = mistT.wrapT = THREE.RepeatWrapping;
  for (let i = 0; i < 6; i++) {
    const tx = mistT.clone(); tx.needsUpdate = true; tx.repeat.set(2.5, 1.2); tx.offset.set(rnd(i * 4.4), rnd(i * 8.8));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(150, 70), new THREE.MeshBasicMaterial({ map: tx, color: 0x22304d, transparent: true, opacity: 0.11, depthWrite: false, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, -DEPTH + 3.6 + i * 1.4, EDGE + 33); m.renderOrder = 2; world.add(m);
  }
  const car = new THREE.Group();
  const carM = new THREE.MeshStandardMaterial({ color: 0x3565b8, roughness: 0.45, metalness: 0.3 });
  const cb = new THREE.Mesh(new RoundedBoxGeometry(4.2, 0.8, 1.8, 3, 0.15), carM); cb.position.y = 0.55; car.add(cb);
  const ct = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.6, 1.6, 3, 0.15), new THREE.MeshStandardMaterial({ color: 0x1b2333, roughness: 0.3, metalness: 0.4 })); ct.position.set(-0.2, 1.15, 0); car.add(ct);
  const roof = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.08, 1.5, 2, 0.03), carM); roof.position.set(-0.2, 1.46, 0); car.add(roof);
  for (const [x, z] of [[1.3, 0.85], [-1.3, 0.85], [1.3, -0.85], [-1.3, -0.85]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18), M.rubber); w.rotation.x = Math.PI / 2; w.position.set(x, 0.34, z); car.add(w); }
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 1.4), GLOW(0xfff0d0, 2.4)); hl.position.set(2.12, 0.6, 0); car.add(hl);
  for (const [x, z] of [[2.05, 0.82], [2.05, -0.82], [-2.05, 0.82], [-2.05, -0.82]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.24), GLOW(0xff8a1a, 1)); b.position.set(x, 0.62, z); car.add(b); blink.push(b.material); }
  const fanT = canvasTex(256, 256, (x) => { const gr = x.createRadialGradient(128, 256, 4, 128, 256, 252); gr.addColorStop(0, 'rgba(255,240,205,0.95)'); gr.addColorStop(0.45, 'rgba(255,236,190,0.3)'); gr.addColorStop(1, 'rgba(255,236,190,0)');
    x.fillStyle = gr; x.beginPath(); x.moveTo(128, 256); x.lineTo(14, 0); x.lineTo(242, 0); x.closePath(); x.fill(); });
  const fan = new THREE.Mesh(new THREE.PlaneGeometry(8, 10), new THREE.MeshBasicMaterial({ map: fanT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.5 }));
  fan.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); fan.position.set(2.1 + 5, 0.04, 0); car.add(fan);
  car.position.set(CLX + 6.0, -DEPTH + 0.02, CZ + 8.0); car.rotation.set(0.03, 2.3, 0.05); car.updateMatrixWorld(true); world.add(car);
  const carL = new THREE.SpotLight(0xfff0d0, 90, 30, 0.5, 0.6, 1.4); carL.position.copy(car.localToWorld(V(2.3, 0.6, 0))); carL.target.position.copy(car.localToWorld(V(9, -0.5, 0))); world.add(carL, carL.target);
  const low = new THREE.PointLight(0x8fb0ff, 170, 0, 2); low.position.set(CLX + 2.5, -DEPTH + 9, CZ + 5.5); world.add(low);
  const carP = new THREE.PointLight(0xffe2b0, 60, 0, 2); carP.position.set(CLX + 5.4, -DEPTH + 2.8, CZ + 8.4); world.add(carP);
  const fill2 = new THREE.PointLight(0xa8bce0, 55, 0, 2); fill2.position.set(0.5, -3.5, EDGE + 9); world.add(fill2);
  // la autobomba (de frente al barranco: es el anclaje del polipasto), sus faros y la torre de luz
  truck = makeTruck(); truck.rotation.y = -Math.PI / 2; truck.position.set(0.13, 0, -7.6); world.add(truck);
  truck.traverse(o => { if (o.isMesh) o.castShadow = true; }); beacons = truck.userData.lbar;
  const head = new THREE.SpotLight(0xfff0d8, 60, 34, 0.52, 0.6, 1.4); head.position.set(0.13, 1.3, -3.3); head.target.position.set(0, 0.2, 2.2);
  head.castShadow = true; head.shadow.mapSize.set(2048, 2048); head.shadow.bias = -0.0004; world.add(head, head.target);
  const lamp = new THREE.Group(); lamp.position.set(-4.4, 0, EDGE - 0.9); world.add(lamp);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.6, 10), steel); mast.position.y = 1.8; lamp.add(mast);
  const lh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.2), GLOW(0xfff4e0, 2.2)); lh.position.set(0, 3.6, 0.15); lh.rotation.x = 0.6; lamp.add(lh);
  lampL = new THREE.SpotLight(0xfff2e0, 110, 60, 0.5, 0.55, 1.3); lampL.position.set(-4.4, 3.6, EDGE - 0.7); lampL.target.position.set(0.2, -6.0, EDGE + 0.9);
  lampL.castShadow = true; lampL.shadow.mapSize.set(2048, 2048); lampL.shadow.bias = -0.0004; world.add(lampL, lampL.target);
  const work = new THREE.PointLight(0xfff0dc, 3.2, 0, 2); work.position.set(1.2, 2.9, RZ + 1.4); world.add(work);      // luz de trabajo en la cabeza del trípode
  // el trípode: la cabeza por fuera del borde, la polea de arriba y la de reenvío
  tripod = new THREE.Group(); world.add(tripod);
  const alu = new THREE.MeshStandardMaterial({ color: 0x8b9199, metalness: 0.8, roughness: 0.45 });
  for (const f of [V(-1.15, 0, EDGE - 0.25), V(1.15, 0, EDGE - 0.25), V(0, 0, 1.55)]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1, 12), alu); between(leg, f, HEAD); leg.castShadow = true; tripod.add(leg);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.06, 14), M.black); foot.position.copy(f).add(V(0, 0.03, 0)); tripod.add(foot);
  }
  const hp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16), alu); hp.position.copy(HEAD).add(V(0, 0.16, 0)); tripod.add(hp);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR, 0.035, 28), new THREE.MeshStandardMaterial({ color: 0xc23a1c, roughness: 0.4, metalness: 0.3 })); wheel.rotation.z = Math.PI / 2; wheel.position.copy(HEAD); tripod.add(wheel);
  for (const s of [-1, 1]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.26, 0.22), alu); sp.position.copy(HEAD).add(V(s * 0.03, 0.04, 0)); tripod.add(sp); }
  const redir = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20), new THREE.MeshStandardMaterial({ color: 0xc23a1c, roughness: 0.4 })); redir.rotation.z = Math.PI / 2; redir.position.set(0, 0.32, 1.7); tripod.add(redir);
  // el polipasto en la carretera: en el anclaje (el camión), la polea y el Basic de antirretorno; en la cuerda de carga, el Rescucender, que tira de la polea móvil
  const flat = o => { o.rotation.order = 'YXZ'; o.rotation.set(-Math.PI / 2, Math.PI, 0); return o; };     // tumbado: su «arriba» mira al barranco (a la carga) y la cara, al cielo
  const p1 = flatPulley(); p1.position.copy(P1); world.add(p1);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.012), new THREE.MeshStandardMaterial({ color: 0xf2c21a, roughness: 0.6 })); between(strap, P1.clone().add(V(0, 0.03, -0.1)), V(P1.x, 0.85, -3.42)); world.add(strap);
  basic = flat(makeDev('basic', DS)); basic.position.set(0, P1.y, ZB); world.add(basic);
  for (const [a, b] of [[V(-0.03, P1.y, ZB + 0.008), V(0.1, P1.y + 0.05, -2.98)], [V(0.1, P1.y + 0.05, -2.98), V(0.06, 0.8, -3.42)]]) { const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8), M.black); between(sl, a, b); world.add(sl); }
  ghostP = flat(makeDev('puno', DS)); ghostP.visible = false; world.add(ghostP);
  p2 = flatPulley(0x2a6fd6); world.add(p2);
  resc = flat(makeDev('resc', DS)); world.add(resc);
  link = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 8), steel); world.add(link);
  ropeU = ropeUni([0.95, 0.32, 0.08], [0.05, 0.05, 0.06]);
  for (let i = 0; i < 17; i++) loadSegs.push(ropeSeg(ropeU));
  // la camilla y su araña (4 cintas al anillo)
  stretcher = makeStretcher(); world.add(stretcher);
  const webM = new THREE.MeshStandardMaterial({ color: 0x1f2633, roughness: 0.7 });
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), webM); world.add(b); bridle.push(b); }
  // el que tira del polipasto y el que vigila el borde
  you = addLegs(makeFirefighter()); you.position.copy(YOU); face(you, V(0, 0, 1)); world.add(you); you.traverse(o => { if (o.isMesh) o.castShadow = true; });
  you2 = makeFirefighter(); you2.position.set(1.75, 0, EDGE - 0.95); face(you2, V(-0.3, 0, 1)); world.add(you2); you2.traverse(o => { if (o.isMesh) o.castShadow = true; });
  // SUBIR: cuerda fija y el bombero con el puño (y su pedal) y el croll
  deviator(CLX); deviator(RX);
  clRopeU = ropeUni([0.14, 0.78, 0.34], [0.04, 0.2, 0.08]);
  clRope = [ropeSeg(clRopeU), ropeSeg(clRopeU)];
  ropePath(clRope, [V(CLX, 0.6, EDGE - 0.45), V(CLX, 0.3, CZ), V(CLX, -DEPTH + 0.05, CZ)]);
  climber = makeFirefighter(); bottle.visible = false; addLegs(climber); addHarness(climber); stripArm(climber, 1); stripArm(climber, -1);
  world.add(climber); climber.traverse(o => { if (o.isMesh) o.castShadow = true; });
  clArmR = mkArm(); clArmL = mkArm();
  croll = makeDev('croll'); croll.rotation.y = -Math.PI / 2; world.add(croll);
  puno = makeDev('puno'); puno.rotation.y = -Math.PI / 2; world.add(puno);
  rigCroll(climber);
  const lanM = new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.6, emissive: 0xc9ced6, emissiveIntensity: 0.1 });
  for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 1, 6), lanM); world.add(m); lanyard.push(m); }
  const pm = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6, emissive: 0xffc83d, emissiveIntensity: 0 });
  pedal = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 1, 6), pm); world.add(pedal);
  pedalLoop = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.013, 6, 20), pm); world.add(pedalLoop);
  clL = new THREE.PointLight(0xfff0dc, 6, 0, 2); world.add(clL);
  // la pierna que pisa el pedal (la de cerca), con rodilla
  climber.userData.legs[0].visible = false; leg = mkLeg();
  // abajo, en el suelo, el mismo bombero ANTES de subir: de pie, con el pie en el pedal — la medida del pedal (del suelo al croll) y el brazo a 90°
  clone = makeFirefighter(); bottle.visible = false; addLegs(clone); addHarness(clone); stripArm(clone, 1); stripArm(clone, -1); rigCroll(clone);
  clone.position.set(CLX, GY, CZ + BZ); world.add(clone); clone.traverse(o => { if (o.isMesh) o.castShadow = true; });
  cloneArmL = mkArm(); cloneArmR = mkArm();
  cCroll = makeDev('croll'); cCroll.rotation.y = -Math.PI / 2; cCroll.position.set(CLX, GY + 1.14, CZ); world.add(cCroll);
  cPuno = makeDev('puno'); cPuno.rotation.y = -Math.PI / 2; cPuno.position.set(CLX, GY + PY0 - STEP, CZ); world.add(cPuno);
  const pm2 = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6, emissive: 0xffc83d, emissiveIntensity: 0 });
  cPedal = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 1, 6), pm2); world.add(cPedal);
  cLoop = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.013, 6, 20), pm2); world.add(cLoop);
  clone.userData.legs[0].rotation.x = 0.2;
  {
    const hole = V(CLX - 0.012, GY + PY0 - STEP - 0.199, CZ + 0.056), foot = V(CLX - 0.11, GY + 0.0, CZ + BZ - 0.16);
    between(cPedal, hole, foot.clone().add(V(0, 0.1, 0.0))); cLoop.position.copy(foot).add(V(0, 0.07, 0.0)); cLoop.rotation.set(0, Math.PI / 2, 0);
    clone.updateMatrixWorld(true);
    armTo(cloneArmL, clone.localToWorld(V(-0.33, 1.45, 0)), V(CLX - 0.012, GY + PY0 - STEP - 0.074, CZ + 0.118), V(-0.2, -1, 0.5));
    armTo(cloneArmR, clone.localToWorld(V(0.27, 1.45, 0)), V(CLX + 0.015, GY + 0.965, CZ + 0.03), V(0.7, -0.2, 0.6), 0.335, 0.335);
  }
  gdL = new THREE.PointLight(0xfff0dc, 7, 0, 2); gdL.position.set(CLX - 1.7, GY + 2.5, CZ + 1.5); world.add(gdL);
  for (const ff of [climber, clone]) ff.traverse(o => { if (o.isMesh && o.material === M.chrome) o.visible = false; });      // el aro cromado del regulador deslumbraba
  // en este vídeo no salen ni la camilla ni el polipasto ni el que baja
  stretcher.visible = false; bridle.forEach(b => { b.visible = false; }); loadSegs.forEach(b => { b.visible = false; }); p2.visible = false; resc.visible = false; link.visible = false; basic.visible = false;
}

// ------------------------------------------------------------------ tiempos y cámara (un dron que no para; cada toma va «atada» a lo que sigue)
let T = {}, KEYS = null, KH = null, CK = [];
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  // el que sube: ciclos «de gusano» (k = ciclos hechos; en cada uno, de pie en el pedal [0–0,42] y sube el puño [0,5–0,9]).
  // Sube desde t = 0; luego, cada parte del paso va con su frase: «hacia arriba, corre» (sube el puño despacio), «pisas, te pones de pie», «subes el puño otro palmo»
  const a0 = Math.max(4.7, T.llama - 0.45), a1 = Math.max(a0 + 0.9, T.puno + 0.5), b0 = Math.max(a1 + 0.3, T.arriba - 0.15), b1 = Math.max(b0 + 1.5, T.corre + 1.3);
  const c0 = Math.max(b1 + 0.6, T.pisas + 0.1), c1 = Math.max(c0 + 1.0, T.pie + 0.15), d0 = Math.max(c1 + 0.5, T.subes - 0.1), d1 = Math.max(d0 + 1.0, T.palmo - 0.1), e0 = Math.max(d1 + 0.6, T.dato + 0.5);
  CK = [[0, 0], [4.5, 3], [a0, 3], [a1, 3.42], [b0, 3.5], [b1, 3.9], [b1 + 0.3, 4], [c0, 4], [c1, 4.42], [d0, 4.5], [d1, 4.9], [d1 + 0.3, 5], [e0, 5], [e0 + 8 * CYC, 13]];
  KEYS = camKeys(); KH = KEYS.map(k => [k[0], k[2]]);
}
function climbK(t) {
  if (t <= 0) return 0;
  for (let i = 1; i < CK.length; i++) if (t < CK[i][0]) { const [t0, k0] = CK[i - 1], [t1, k1] = CK[i]; return k0 + (k1 - k0) * (t - t0) / (t1 - t0); }
  return CK[CK.length - 1][1];
}
const kSm = t => { let v = 0; for (let i = 0; i < 9; i++) v += climbK(t + (i / 8 - 0.5) * 1.5); return v / 9; };
const cbs = t => CB0 + STEP * kSm(t);
const tug = t => { const u = t - T.muerde; return (0.035 * sm(T.abajo + 0.1, T.muerde, t) - (u > 0 ? 0.008 * Math.exp(-u / 0.14) * Math.sin(u * 34) : 0)) * (1 - sm(T.cuelga - 0.5, T.cuelga - 0.1, t)); };      // «hacia abajo»: tira del puño… baja un dedo y muerde
function climbState(t) {          // se pone de pie en el pedal (el croll sube por la cuerda), se sienta en el croll y sube el puño
  const k = climbK(t), n = Math.floor(k + 1e-9), f = k - n;
  const stand = f < 0.42 ? sm(0, 0.42, f) : 1, pu = f < 0.5 ? 0 : sm(0.5, 0.9, f);
  const cb = CB0 + STEP * (n + stand), py = PY0 + STEP * (pu - stand) - tug(t);
  const hole = V(CLX - 0.012, cb + py - 0.199, CZ + 0.056), sole = V(CLX - 0.11, hole.y - LP, CZ + 0.10);
  return { cb, py, f, stand, pu, hole, sole };
}
const ANCH = { w: () => V(0, 0, 0), cl: t => V(CLX, cbs(t), CZ), pu: t => { const C = climbState(t); return V(CLX, C.cb + C.py, CZ); }, cr: t => V(CLX, climbState(t).cb + 1.14, CZ),
  ft: t => { const C = climbState(t); return V(CLX, C.sole.y, CZ); }, gd: () => V(CLX, GY, CZ) };
function camKeys() {
  const K = [
    [0, 'pu', [-0.62, 0.18, 0.16, 0, 0.14, 0.05, 32]],                           // la leva mordiendo la cuerda, enorme
    [0.45, 'pu', [-0.68, 0.2, 0.18, 0, 0.14, 0.05, 32]],
    [T.mano - 0.15, 'pu', [-1.5, 0.06, 0.45, 0, -0.02, 0.15, 38]],               // «cabe en una mano»: el puño y la mano que lo agarra
    [T.mano + 0.5, 'pu', [-1.55, 0.08, 0.48, 0, -0.02, 0.16, 38]],
    [T.sube + 0.75, 'cl', [-1.6, 3.4, -0.25, 0.3, 1.5, 0.5, 50]],                // se abre: el bombero colgado…
    [T.entero + 0.7, 'cl', [-1.8, 4.8, -0.3, 0.7, 1.0, 0.8, 52]],                // …sobre el vacío
    [T.llama + 0.1, 'cl', [-1.9, 5.0, -0.3, 0.7, 1.0, 0.8, 52]],
    [T.puno + 0.3, 'pu', [-1.5, 0.06, 0.45, 0, -0.02, 0.15, 38]],                // se llama puño: de perfil, muy cerca
    [T.jumar + 0.45, 'pu', [-1.55, 0.06, 0.47, 0, -0.02, 0.15, 38]],
    [T.arriba + 0.25, 'cr', [-2.1, 0.74, 0.5, 0, 0.62, 0.17, 40]],                // hacia arriba, corre (el puño sube por la cuerda)
    [T.corre + 1.4, 'cr', [-2.0, 0.8, 0.5, 0, 0.68, 0.17, 40]],
    [T.abajo + 0.35, 'pu', [-1.3, 0.08, 0.4, 0, 0.02, 0.13, 38]],                // hacia abajo, la muerde: muy cerca
    [T.dedo + 0.3, 'pu', [-1.25, 0.08, 0.4, 0, 0.02, 0.13, 38]],
    [T.cuelga + 0.15, 'pu', [-2.0, -0.45, 0.7, 0, -0.5, 0.12, 44]],              // de él cuelga un pedal: baja siguiéndolo…
    [T.pedal + 0.5, 'ft', [-2.0, 0.3, 0.8, 0, 0.22, 0.12, 44]],                  // …hasta el pie
    [T.pisas + 0.35, 'cl', [-3.0, 1.25, 1.2, 0, 1.15, 0.2, 46]],                 // pisas, te pones de pie: el cuerpo entero, de perfil
    [T.pie + 0.3, 'cl', [-2.95, 1.3, 1.2, 0, 1.2, 0.2, 46]],
    [T.croll3 + 0.1, 'cr', [-1.55, 0.16, 0.5, 0, 0.1, 0.16, 38]],                // el croll te sujeta
    [T.sujeta + 0.5, 'cr', [-1.5, 0.16, 0.5, 0, 0.1, 0.16, 38]],
    [T.subes + 0.2, 'cr', [-2.5, 0.6, 1.0, 0, 0.5, 0.2, 44]],                    // y subes el puño otro palmo
    [T.palmo + 0.45, 'cl', [-4.3, 2.1, 3.3, 0, 1.5, 0.2, 46]],                   // sube (se ve entero)
    [T.examen + 0.45, 'gd', [-2.97, 1.15, 0.95, 0, 1.05, 0.25, 50]],             // dato de examen: abajo, en el suelo, antes de subir
    [T.croll4 + 0.3, 'gd', [-2.9, 1.15, 0.95, 0, 1.05, 0.25, 50]],
    [T.brazo + 0.15, 'gd', [-2.1, 1.42, 0.75, 0, 1.3, 0.27, 40]],                // el brazo, a 90°
    [T.grados + 0.55, 'gd', [-2.05, 1.42, 0.75, 0, 1.3, 0.27, 40]],
    [T.ycroll + 0.5, 'cr', [-1.6, 0.2, 0.6, 0, 0.12, 0.2, 40]],                  // ¿y el croll?
    [T.donde + 0.6, 'cr', [-1.55, 0.2, 0.6, 0, 0.12, 0.2, 40]],
    [T.comenta + 0.5, 'cl', [-3.8, 1.9, 2.8, 0, 1.35, 0.2, 46]],                 // coméntalo: el que sube, entero
    [T.siguiente + 0.4, 'cl', [-4.0, 2.0, 3.0, 0, 1.4, 0.2, 46]],
    [T.compartir + 0.6, 'cl', [-2.5, 3.2, 8.5, 0.6, 2.4, 0, 46]],                // venta: se aleja
    [T.end, 'cl', [-2.5, 3.8, 11, 0.6, 2.8, 0, 46]],
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
  const n = KEYS.length; let i = 0; while (i < n - 2 && t > KEYS[i + 1][0]) i++;
  const v = hermite(KH, t);
  // las tomas mezclan desplazamientos respecto a anclas distintas: entre dos claves, el ancla pasa suave de una a otra
  const worldAt = (k, tt) => { const a = ANCH[KEYS[k][1]](tt), o = KEYS[k][2]; return [o[0] + a.x, o[1] + a.y, o[2] + a.z, o[3] + a.x, o[4] + a.y, o[5] + a.z]; };
  let A;
  if (KEYS[i][1] === KEYS[i + 1][1]) A = ANCH[KEYS[i][1]](t);
  else { const u = cl((t - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0])), s = u * u * u * (u * (u * 6 - 15) + 10); A = ANCH[KEYS[i][1]](t).lerp(ANCH[KEYS[i + 1][1]](t), s); }
  const sh = Math.exp(-Math.pow((t - T.muerde - 0.04) / 0.1, 2)) * 0.014;
  return pose(V(v[0] + A.x + sh * Math.sin(t * 91), v[1] + A.y + sh * Math.cos(t * 77), v[2] + A.z), V(v[3] + A.x, v[4] + A.y, v[5] + A.z), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t (todo depende solo de t)
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
const env = (t, t0, hold = 1.3) => sm(t0 - 0.2, t0 + 0.05, t) * (1 - sm(t0 + hold, t0 + hold + 0.5, t));
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => { f.u.uCam.value.copy(cam.position); f.u.uTime.value = t; });
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = 8 + 70 * on;
  const shim = 0.75 + 0.25 * Math.sin(t * 9);
  // ---------- el que sube
  const C = climbState(t), cz = CZ + BZ;
  climber.position.set(CLX, C.cb, cz);
  climber.userData.legs[1].rotation.x = -0.14 + 0.05 * Math.sin(t * 1.9);
  croll.position.set(CLX, C.cb + 1.14, CZ); puno.position.set(CLX, C.cb + C.py, CZ);
  devGrip(croll, 1 - sm(0.02, 0.08, C.f) * (1 - sm(0.36, 0.42, C.f)));
  const hold = sm(T.abajo - 0.2, T.abajo + 0.1, t) * (1 - sm(T.muerde - 0.05, T.muerde + 0.02, t));       // antes de morder, la leva un poco abierta (se ve cerrarse)
  devGrip(puno, Math.min(1 - sm(0.5, 0.56, C.f) * (1 - sm(0.84, 0.9, C.f)), 1 - 0.5 * hold));
  devGlow(puno, Math.max(0.6 * env(t, T.puno, 1.3) * shim, 0.35 * (1 - sm(1.0, 1.8, t)), 0.9 * pulse(t, T.muerde + 0.06, 0.2)));
  devGlow(croll, Math.max(0.6 * env(t, T.croll3, 1.4) * shim, 0.6 * env(t, T.ycroll, 3.0) * shim));
  for (const m of harnM) m.emissiveIntensity = 0.12;
  climber.updateMatrixWorld(true);
  armTo(clArmL, climber.localToWorld(V(-0.33, 1.45, 0)), V(CLX - 0.012, C.cb + C.py - 0.074, CZ + 0.118), V(-0.3, -1, 0.4));        // la mano de cerca, en el mango del puño
  armTo(clArmR, climber.localToWorld(V(0.27, 1.45, 0)), V(CLX + 0.015, C.cb + 0.965, CZ + 0.03), V(0.7, -0.2, 0.6), 0.335, 0.335);  // la otra, en la cuerda, bajo el croll
  legTo(leg, climber.localToWorld(V(-0.11, 0.85, 0)), C.sole.clone().add(V(0, 0.14, 0.02)), V(0, 0.75, -0.65));                     // la pierna que pisa el pedal
  between(pedal, C.hole, C.sole.clone().add(V(0.0, 0.11, -0.02)));
  pedalLoop.position.copy(C.sole).add(V(0, 0.07, -0.02)); pedalLoop.rotation.set(0, Math.PI / 2, 0);
  pedal.material.emissiveIntensity = 1.2 * Math.max(env(t, T.pedal, 1.6), 0) * shim;
  const ring = V(CLX + 0.035, C.cb + 1.02, cz - 0.2), dd = ring.distanceTo(C.hole), sag = 0.5 * Math.sqrt(Math.max(0, 0.72 * 0.72 - dd * dd));
  const h2 = C.hole.clone().add(V(0.03, 0, 0));
  const lp = Array.from({ length: 6 }, (_, i) => { const u = i / 5, w = 4 * u * (1 - u); return h2.clone().lerp(ring, u).add(V(0.04 * w, -0.75 * sag * w, 0.55 * sag * w)); });
  for (let i = 0; i < 5; i++) between(lanyard[i], lp[i], lp[i + 1]);
  clL.position.set(CLX - 1.5, C.cb + 2.5, CZ + 1.3);
  const bl = (t % 0.9) < 0.45 ? 2.6 : 0.12; blink.forEach(m => m.color.setRGB(bl, 0.5 * bl, 0.06 * bl));
  // ---------- el de abajo (antes de subir): el pedal y el croll se iluminan con el dato de examen
  const ge = sm(T.mide - 0.2, T.mide + 0.1, t) * (1 - sm(T.grados + 0.6, T.grados + 0.9, t));
  cPedal.material.emissiveIntensity = 1.3 * ge * shim;
  devGlow(cCroll, 0.6 * sm(T.croll4 - 0.15, T.croll4 + 0.1, t) * (1 - sm(T.asi + 0.3, T.asi + 0.7, t)) * shim);
  devGlow(cPuno, 0.25 * ge);
  const ab = sm(T.brazo - 0.1, T.brazo + 0.2, t) * (1 - sm(T.grados + 0.6, T.grados + 0.9, t));
  cloneArmL.m.emissive.set(0xffc83d); cloneArmL.m.emissiveIntensity = 0.55 * ab * shim;
}

// ------------------------------------------------------------------ capa 2D: la fila de los cinco, rótulos con flecha, tarjetas y la ficha para guardar
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
function chev(q0, q1, dx, col, a, t, up) {          // flechitas que corren junto a la cuerda
  g.save(); g.strokeStyle = col; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 4; i++) { const u = ((t * 1.3 + i / 4) % 1), y = mx(q0.y, q1.y, u), x = q0.x + dx, s = up ? -1 : 1; g.globalAlpha = a * Math.sin(u * Math.PI); g.beginPath(); g.moveTo(x - 26, y - 20 * s); g.lineTo(x, y + 8 * s); g.lineTo(x + 26, y - 20 * s); g.stroke(); }
  g.restore();
}
function badge(t) {                     // la serie: una pieza por vídeo
  const a = sm(0.55, 0.85, t) * (1 - sm(T.compartir - 0.4, T.compartir - 0.1, t));
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = a; g.translate(540, 486);
  g.font = '400 34px Bebas'; const s1 = 'SERIE BLOQUEADORES  ·  PIEZA 1 DE 5', w = g.measureText(s1).width + 56;
  rr(-w / 2, -30, w, 60, 30); g.fillStyle = 'rgba(8,10,14,0.82)'; g.fill(); g.strokeStyle = 'rgba(255,200,61,0.75)'; g.lineWidth = 3; g.stroke();
  txt(s1, 0, 12, 34, GOLD2, 400, 'center', 'Bebas');
  g.restore();
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  badge(t);
  const C = climbState(t), pu = V(CLX, C.cb + C.py, CZ);
  // se llama puño (o jumar)
  tag(pu.clone().add(V(0, 0.1, 0.05)), 'PUÑO', GOLD2, sm(T.puno - 0.1, T.puno + 0.15, t) * (1 - sm(T.arriba - 0.3, T.arriba - 0.05, t)), 0, 0, { sub: 'también: «jumar»', px: 62, at: [800, 900] });
  // hacia arriba, corre… y hacia abajo, la muerde
  const run = sm(T.arriba - 0.1, T.arriba + 0.15, t) * (1 - sm(T.abajo - 0.35, T.abajo - 0.1, t));
  if (run > 0.01) chev(proj(pu.clone().add(V(0, -0.3, 0))), proj(pu.clone().add(V(0, 0.42, 0))), -95, GREEN2, run, t, true);
  label(770, 1500, 'HACIA ARRIBA, CORRE', GREEN2, run, { icon: 'up', px: 54 });
  const blk = sm(T.muerde - 0.06, T.muerde + 0.08, t) * (1 - sm(T.cuelga - 0.35, T.cuelga - 0.1, t));
  if (blk > 0.01) { const q = proj(pu.clone().add(V(0, 0.13, 0.05))), k = pr(t, T.muerde, 0.45); g.save(); g.globalAlpha = blk * (1 - k); g.strokeStyle = RED2; g.lineWidth = 10; g.beginPath(); g.arc(q.x, q.y, 60 + 160 * k, 0, 7); g.stroke(); g.restore(); }
  label(700, 1480, 'HACIA ABAJO, MUERDE', RED2, blk * (1 - sm(T.nobaja - 0.2, T.nobaja, t)), { icon: 'down', px: 56, s: 1 + 0.14 * pulse(t, T.muerde + 0.12, 0.2) });
  stamp('¡NO BAJA!', 1480, RED2, Math.exp(-Math.pow((t - T.nobaja - 0.55) / 0.6, 4)), 140, -0.04);
  // de él cuelga un pedal · el croll te sujeta
  tag(C.hole.clone().lerp(C.sole, 0.45), 'PEDAL', GOLD2, sm(T.pedal - 0.1, T.pedal + 0.15, t) * (1 - sm(T.pie + 0.3, T.pie + 0.6, t)), 0, 0, { sub: 'el pie pisa aquí', px: 58, at: [760, 1500] });
  tag(V(CLX, C.cb + 1.19, CZ + 0.04), 'CROLL', GOLD2, sm(T.croll3 - 0.1, T.croll3 + 0.15, t) * (1 - sm(T.subes - 0.25, T.subes, t)), 0, 0, { sub: 'el otro bloqueador: te sujeta', px: 58, at: [760, 870] });
  // dato de examen: del suelo al croll · el brazo, a 90°
  stamp('DATO DE EXAMEN', 1470, GOLD2, Math.exp(-Math.pow((t - T.dato - 0.45) / 0.5, 4)), 120, -0.03);
  const ra = sm(T.mide + 0.1, T.mide + 0.4, t) * (1 - sm(T.asi + 0.5, T.asi + 0.85, t));
  if (ra > 0.01) {
    const q0 = proj(V(CLX, GY + 0.02, CZ - 0.2)), q1 = proj(V(CLX, GY + 1.17, CZ - 0.2)), k = e3(pr(t, T.mide + 0.1, 0.6)), y1 = mx(q0.y, q1.y, k), x = q0.x - 40;
    g.save(); g.globalAlpha = ra; g.strokeStyle = GOLD2; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - 26, q0.y); g.lineTo(x + 26, q0.y); g.moveTo(x, q0.y); g.lineTo(x, y1); g.moveTo(x - 26, y1); g.lineTo(x + 26, y1); g.stroke();
    g.restore();
    label(x - 20, (q0.y + q1.y) / 2, 'DEL SUELO', GOLD2, ra * sm(T.suelo - 0.1, T.suelo + 0.1, t), { px: 48, sub: 'AL CROLL' });
    tag(V(CLX, GY + 1.19, CZ + 0.04), 'CROLL', '#F4F6F8', ra * sm(T.croll4 - 0.1, T.croll4 + 0.1, t), 0, 0, { px: 44, at: [820, 850] });
    tag(V(CLX - 0.02, GY + 0.1, CZ + 0.24), 'SUELO', '#F4F6F8', ra * sm(T.suelo - 0.1, T.suelo + 0.1, t), 0, 0, { px: 44, at: [830, 1480] });
  }
  const aa = sm(T.brazo - 0.1, T.brazo + 0.2, t) * (1 - sm(T.grados + 0.6, T.grados + 0.9, t));
  if (aa > 0.01) {
    const E = cloneArmL.e.position, S = cloneArmL.u.position.clone().multiplyScalar(2).sub(E), Hd = cloneArmL.g.position;
    const e = proj(E), a0 = Math.atan2(proj(S).y - e.y, proj(S).x - e.x), a1 = Math.atan2(proj(Hd).y - e.y, proj(Hd).x - e.x), k = e3(pr(t, T.brazo, 0.5));
    let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    g.save(); g.globalAlpha = aa; g.strokeStyle = GOLD2; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.arc(e.x, e.y, 96, a0, a0 + da * k, da < 0); g.stroke(); g.restore();
    const kk = 1 + 0.2 * pulse(t, T.noventa + 0.12, 0.2);
    label(e.x + 250, e.y + 150, '90°', GOLD2, aa * sm(T.noventa - 0.12, T.noventa + 0.08, t), { px: 96, s: kk, sub: 'el brazo, de pie' });
  }
  label(540, 1615, 'NORMAS UNE EN 567 · UNE EN 12841', 'rgba(255,255,255,0.5)', sm(T.asi, T.asi + 0.3, t) * (1 - sm(T.grados + 0.6, T.grados + 0.9, t)), { px: 34 });
  // ¿y el croll? ¿sabes dónde se pone?
  const qa = sm(T.ycroll - 0.1, T.ycroll + 0.15, t) * (1 - sm(T.compartir - 0.4, T.compartir - 0.1, t));
  if (qa > 0.01) {
    const q = proj(V(CLX, C.cb + 1.19, CZ + 0.04)), k = 1 + 0.12 * Math.sin((t - T.ycroll) * 6);
    g.save(); g.globalAlpha = qa * (1 - sm(T.comenta + 0.2, T.comenta + 0.6, t)); g.translate(q.x - 150, q.y - 20); g.scale(k, k); g.shadowColor = GOLD2; g.shadowBlur = 30; txt('?', 0, 60, 190, GOLD2, 400, 'center', 'Bebas'); g.restore();
    const ca = qa * sm(T.sabes - 0.1, T.sabes + 0.15, t);
    g.save(); g.globalAlpha = ca; g.translate(540, 1420);
    rr(-440, -84, 880, 168, 34); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('¿DÓNDE SE PONE EL CROLL?', 0, -8, 68, '#F4F6F8', 400, 'center', 'Bebas');
    const b = 1 + 0.05 * Math.max(0, Math.sin((t - T.comenta) * 6)) * sm(T.comenta, T.comenta + 0.2, t);
    g.save(); g.translate(0, 50); g.scale(b, b); txt('💬  COMÉNTALO', 0, 0, 46, GOLD2, 400, 'center', 'Bebas'); g.restore();
    g.restore();
    label(540, 1575, 'SIGUIENTE PIEZA: EL CROLL', CYAN2, qa * sm(T.enseno - 0.1, T.enseno + 0.15, t), { px: 44 });
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
  finMat.uniforms.uFlash.value = Math.exp(-Math.pow((t - T.muerde - 0.03) / 0.07, 2)) * 0.12; finMat.uniforms.uFlashCol.value.setRGB(1, 0.4, 0.3);
  finMat.uniforms.uDim.value = mx(1, 0.5, sm(T.compartir - 0.2, T.compartir + 0.3, t)) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  await overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 1.7);

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
  } catch (e) { window.failed = 'puno: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
