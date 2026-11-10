// «¿Qué manguera pierde más presión?» — pérdida de carga en mangueras de 25, 45 y 70 mm (Bomberados, Pregunta del día
// cinematográfica; pregunta de Adrián, examen del Ayto. de Pontevedra 2022). Motor de projects/bomberados_presion/web/presion.js
// (luz, resplandor, desenfoque de movimiento, llamas, partículas, autobomba, manguera con agua que corre, bombero, manómetros)
// y mundo propio: plaza mojada de noche, la autobomba y tres líneas (25, 45 y 70 mm) desde el mismo colector hasta tres
// lanzas frente a un edificio en llamas; y el «laboratorio» (rayos X): la manguera por dentro, el agua que corre y roza
// contra la pared, la barra de presión que baja metro a metro y los dos tubos (70 y 25 mm) con la misma agua.
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



// ================================================================== MUNDO: plaza de noche, autobomba y tres líneas
const world = new THREE.Group(); scene.add(world);
const LABX = 400;                                        // el «laboratorio» (rayos X), lejos de la plaza
const lab = new THREE.Group(); lab.position.set(LABX, 0, 0); scene.add(lab);
scene.background.set(0x04060b); scene.fog.color.set(0x04060b); scene.fog.density = 0.011;
scene.environmentIntensity = 0.22;
const LANES = [-2.6, 0, 2.6];                            // A · 25 mm (izquierda), B · 45 mm, C · 70 mm (derecha)
const DMM = [25, 45, 70];
const HRAD = DMM.map(d => d / 1000);                     // radio ×2 para que se vea (25 mm → 0,025 m); las proporciones, reales
const OUTX = [-0.75, 0, 0.75];
const ZFF = -25.9;                                       // bomberos con las lanzas
const GY = 2.75, GZ = -25.3;                             // manómetros «?» encima de cada lanza
let truck, beacons = [], hoses = [], gauges = [], needles = [], ffs = [], fire1, fire2, fireL1, fireL2;
const COLS = ['#FF7A1A', '#2DD4BF', '#F0457A', '#8B7CF6'];

// manómetros (de presion.js): esfera 0–16 bar, aguja que «duda»
const PMAX = 16, G_D = 1.15;
const angP = v => Math.PI * 0.75 + Math.PI * 1.5 * v / PMAX;
function gaugeFaceP() {
  return canvasTex(1024, 1024, (x) => {
    const c = 512, R = 488;
    const bg = x.createRadialGradient(c, c - 120, 40, c, c, R); bg.addColorStop(0, '#fbf8f1'); bg.addColorStop(1, '#d6d0c3');
    x.beginPath(); x.arc(c, c, R, 0, 7); x.fillStyle = bg; x.fill();
    for (let v = 0; v <= PMAX; v += 0.5) {
      const a = angP(v), big = v % 2 === 0, mid = v % 1 === 0, r1 = R - 30, r2 = R - (big ? 120 : mid ? 84 : 62);
      x.beginPath(); x.moveTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); x.lineTo(c + Math.cos(a) * r2, c + Math.sin(a) * r2);
      x.lineWidth = big ? 13 : mid ? 7 : 4; x.strokeStyle = '#121418'; x.stroke();
    }
    x.fillStyle = '#121418'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '400 112px Bebas';
    for (let v = 0; v <= PMAX; v += 2) { const a = angP(v); x.fillText(String(v), c + Math.cos(a) * (R - 192), c + Math.sin(a) * (R - 192)); }
    x.font = '400 120px Bebas'; x.fillText('BAR', c, c + 210);
  }, { aniso: 4 });
}
function makeGaugeP(pos, sc = 1) {
  const G = new THREE.Group(); G.position.copy(pos);
  const face = new THREE.Mesh(new THREE.CircleGeometry(G_D / 2, 64), new THREE.MeshBasicMaterial({ map: gaugeFaceP(), transparent: true, fog: false }));
  face.material.color.setScalar(1.05); face.renderOrder = 21; G.add(face);
  const bez = new THREE.Mesh(new THREE.TorusGeometry(G_D / 2 + 0.02, 0.045, 16, 72), M.chrome); bez.renderOrder = 21; G.add(bez);
  const backp = new THREE.Mesh(new THREE.CylinderGeometry(G_D / 2 + 0.04, G_D / 2 + 0.04, 0.1, 64), M.black); backp.rotation.x = Math.PI / 2; backp.position.z = -0.06; G.add(backp);
  const ng = new THREE.PlaneGeometry(G_D * 0.46, G_D * 0.035); ng.translate(G_D * 0.17, 0, 0);
  const n = new THREE.Mesh(ng, new THREE.MeshBasicMaterial({ color: 0xff3a1a, fog: false, side: THREE.DoubleSide })); n.material.color.setRGB(3.4, 0.55, 0.18);
  n.position.z = 0.012; n.renderOrder = 23; G.add(n);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(G_D * 0.045, 24), new THREE.MeshBasicMaterial({ color: 0x15171b, fog: false })); cap.position.z = 0.016; cap.renderOrder = 24; G.add(cap);
  G.scale.setScalar(0.001); G.userData.sc = sc; world.add(G); return [G, n];
}

function buildWorld() {
  // suelo mojado (brilla con las farolas y los rotativos)
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#141518'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 16 + rnd(i) * 26; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(40, 40);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ map: asph, color: 0x8a8a8a, roughness: 0.3, metalness: 0.25 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
  // charcos (más brillo)
  world.add(new THREE.HemisphereLight(0x6f8ab8, 0x15100c, 0.5));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.42); moon.position.set(25, 60, 30); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 30, bottom: -40, near: 1, far: 160 }); moon.shadow.bias = -0.0005; world.add(moon);
  for (const [x, z] of [[-7, -8], [7, -16], [-7, 6], [7, 8], [-7, -22]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 12), M.steel); pole.position.set(x, 3, z); world.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.07), M.steel); arm.position.set(x - Math.sign(x) * 0.5, 5.95, z); world.add(arm);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffc98a })); lamp.material.color.setScalar(2.2); lamp.position.set(x - Math.sign(x) * 1.0, 5.85, z); world.add(lamp);
    const l = new THREE.PointLight(0xffb070, 42, 0, 2); l.position.set(x - Math.sign(x) * 1.0, 5.6, z); world.add(l);
  }
  // el edificio en llamas al fondo (fachada en z = −30) y los de alrededor de la plaza
  const bF = building(20, 15, 10, 10, 5, 7, (r, c) => (r === 0 && (c === 3 || c === 4)) || (r === 1 && c === 6)); bF.position.set(0, 0, -35); world.add(bF);
  for (const [x, h, z, w] of [[-17, 18, -24, 12], [17, 22, -22, 12], [-17, 14, -6, 12], [17, 16, -4, 12], [-17, 20, 12, 12], [17, 12, 14, 12], [0, 24, 26, 26], [-30, 30, -40, 14], [28, 26, -44, 14]]) {
    const b = building(w, h, 10, 6, Math.round(h / 3), 11 + x + z, null); b.position.set(x, 0, z);
    b.rotation.y = x < -10 ? Math.PI / 2 : x > 10 ? -Math.PI / 2 : z > 0 ? Math.PI : 0; world.add(b);
  }
  fire1 = fireSet(world, V(-3.5, 0.25, -29.85), tongues(7, 31, (i, r) => [-3.5 - 1.3 + i * 0.42 + (r(1) - 0.5) * 0.15, 0.25, -29.75, 0.7 + 0.4 * r(3), 1.9 + 1.4 * r(4)]),
    { seed: 31, extent: [1.3, 0.1, 0.3], smokeN: 34, smokeSize: 1.4, smokeY: 3.0, emberN: 50, bright: 1.35 });
  fire2 = fireSet(world, V(4.0, 3.3, -29.85), tongues(5, 41, (i, r) => [4.0 - 0.8 + i * 0.4 + (r(1) - 0.5) * 0.12, 3.3, -29.75, 0.55 + 0.3 * r(3), 1.4 + 1.0 * r(4)]),
    { seed: 41, extent: [0.8, 0.1, 0.25], smokeN: 26, smokeSize: 1.2, smokeY: 2.6, emberN: 34, bright: 1.3 });
  fireL1 = new THREE.PointLight(0xff6a1a, 70, 0, 2); fireL1.position.set(-3.5, 1.8, -28.2); world.add(fireL1);
  fireL2 = new THREE.PointLight(0xff6a1a, 45, 0, 2); fireL2.position.set(4.0, 4.6, -28.4); world.add(fireL2);
  // la autobomba: de culo a la plaza; el cuadro de la bomba y el colector con las tres salidas, en z ≈ 0
  truck = makeTruck(); truck.position.set(0, 0, 4.0); truck.rotation.y = -Math.PI / 2; world.add(truck); truck.updateMatrixWorld(true);
  beacons = truck.userData.lbar;
  const col = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 0.16), M.steel); col.position.set(0, 0.9, 0.05); world.add(col);
  OUTX.forEach((x, i) => {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(HRAD[i] * 1.6 + 0.02, HRAD[i] * 1.6 + 0.02, 0.22, 24), M.chrome); r.rotation.x = Math.PI / 2; r.position.set(x, 0.9, -0.08); world.add(r);
    const v = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 20), new THREE.MeshStandardMaterial({ color: 0xd61f26, roughness: 0.4 })); v.position.set(x, 1.08, 0.0); world.add(v);   // volante de la válvula
  });
  // las tres líneas: del colector al suelo, por la plaza (con alguna curva) y hasta la lanza de cada bombero
  LANES.forEach((x, i) => {
    const r = HRAD[i], ox = OUTX[i], w = k => (rnd(i * 17.3 + k * 3.1) - 0.5) * 0.5;
    const pts = [V(ox, 0.9, -0.2), V(ox, 0.55, -0.6), V(mx(ox, x, 0.55), r + 0.01, -1.6), V(x, r, -3.4), V(x + w(1), r, -8), V(x + w(2), r, -12.5), V(x + w(3), r, -17),
      V(x + w(4) * 0.5, r, -21.5), V(x + 0.38, r, -24.4), V(x + 0.4, 0.45, -25.4), V(x + 0.25, 0.95, -25.95), V(x + 0.06, 1.0, -26.2)];
    const h = hoseMesh(pts, r, i === 0 ? 0xb3232a : 0xe9e3d3);
    world.add(h.mesh, h.flow); h.grow(1); hoses.push(h);
    // el bombero con la lanza (esperando: la lanza aún cerrada)
    const ff = makeFirefighter(); ff.position.set(x, 0, ZFF); world.add(ff); ffs.push(ff);
    const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.7, 18), M.chrome);
    lance.position.set(x + 0.03, 1.02, -26.55); lance.quaternion.setFromUnitVectors(V(0, 1, 0), V(0, 0.08, -1).normalize()); world.add(lance);
    const [gg, nn] = makeGaugeP(V(x, GY, GZ), 1.15); gauges.push(gg); needles.push(nn);
  });
}

// ================================================================== LABORATORIO: la manguera por dentro (rayos X)
const LMAX = 26;                                          // largo máximo del tubo (m); las partículas viven en [0, LMAX)
const SHELL_V = `uniform float uL, uR; varying vec3 vN; varying vec3 vV; varying float vX;
void main(){ vec3 p = vec3(position.x * uL, position.y * uR, position.z * uR); vX = p.x;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * vec3(0.0, normal.y, normal.z)); gl_Position = projectionMatrix * mv; }`;
const SHELL_F = `uniform float uI, uRing, uHot; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; varying float vX;
void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float ring = smoothstep(0.035, 0.0, abs(fract(vX + 0.5) - 0.5)) * uRing;
  vec3 c = uCol * (0.01 + 0.55 * pow(f, 1.5)) + vec3(0.45, 1.1, 1.8) * ring * 0.35 + vec3(1.8, 0.55, 0.15) * uHot * f * 0.5;
  gl_FragColor = vec4(c * uI, 1.0); }`;
const WAT_V = `attribute vec4 aSeed; uniform float uL, uR, uD, uSize, uStreak, uN, uWall, uTime;
varying vec2 vUv; varying float vA; varying float vEdge; varying float vFl;
void main(){
  float r = uWall > 0.5 ? 0.985 : sqrt(aSeed.y) * 0.93;
  float th = aSeed.z * 6.2831853;
  float prof = uWall > 0.5 ? 0.35 : 0.5 + 0.5 * (1.0 - pow(r, 6.0));     // en el centro corre más que junto a la pared
  float x = mod(aSeed.x * ${'26.0'} + uD * prof, ${'26.0'});
  float vis = step(aSeed.w, uN) * step(x, uL);
  vec3 p = vec3(x, uR * r * cos(th), uR * r * sin(th));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 dv = (modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz;
  vec2 d2 = normalize(dv.xy + vec2(1e-5, 0.0)); vec2 n2 = vec2(-d2.y, d2.x);
  float len = uSize + uStreak * prof * length(dv.xy) / max(length(dv), 1e-4);
  mv.xy += d2 * position.x * len + n2 * position.y * uSize;
  vUv = position.xy + 0.5;
  vA = vis * smoothstep(0.0, 0.5, x) * smoothstep(uL, uL - 0.5, x); vEdge = r;
  vFl = fract(aSeed.y * 13.7 + uTime * (1.6 + 2.6 * aSeed.z));
  gl_Position = projectionMatrix * mv;
}`;
const WAT_F = `uniform vec3 uCol; uniform float uI, uRub, uTime, uWall; varying vec2 vUv; varying float vA; varying float vEdge; varying float vFl;
void main(){
  vec2 q = (vUv - 0.5) * vec2(2.0, 2.0); float d = length(q);
  float a = smoothstep(1.0, 0.15, d) * vA * uI;
  if (a < 0.004) discard;
  vec3 c = mix(uCol, vec3(1.7, 0.75, 0.3), smoothstep(0.8, 0.93, vEdge) * uRub * 0.55);
  gl_FragColor = vec4(c * a, a);
}`;
const SPK_F = `uniform float uI, uTime; varying vec2 vUv; varying float vA; varying float vEdge; varying float vFl;
void main(){ vec2 q = (vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, length(q)) * vA * uI * smoothstep(0.0, 0.04, vFl) * smoothstep(0.5, 0.12, vFl); if (a < 0.004) discard; gl_FragColor = vec4(vec3(3.0, 1.25, 0.35) * a, a); }`;
function instQuads(n, seed) {
  const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
  g.index = base.index; g.setAttribute('position', base.getAttribute('position'));
  const s = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { s[i * 4] = rnd(i * 4.13 + seed); s[i * 4 + 1] = rnd(i * 7.31 + seed * 1.7); s[i * 4 + 2] = rnd(i * 1.97 + seed * 3.1); s[i * 4 + 3] = rnd(i * 5.71 + seed * 0.3); }
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(s, 4)); g.instanceCount = n; return g;
}
function makeLabTube(seed) {
  const G = new THREE.Group();
  const shellGeo = new THREE.CylinderGeometry(1, 1, 1, 72, 1, true); shellGeo.rotateZ(Math.PI / 2); shellGeo.translate(0.5, 0, 0);   // eje X, de 0 a 1
  const su = { uL: { value: 12 }, uR: { value: 0.9 }, uI: { value: 1 }, uRing: { value: 0 }, uHot: { value: 0 }, uCol: { value: new THREE.Color(0.35, 0.75, 1.25) } };
  const shell = new THREE.Mesh(shellGeo, new THREE.ShaderMaterial({ uniforms: su, vertexShader: SHELL_V, fragmentShader: SHELL_F, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
  shell.frustumCulled = false; shell.renderOrder = 6; G.add(shell);
  const wu = { uL: su.uL, uR: su.uR, uD: { value: 0 }, uSize: { value: 0.06 }, uStreak: { value: 0.2 }, uN: { value: 1 }, uWall: { value: 0 }, uI: { value: 1 }, uRub: { value: 0 }, uTime: { value: 0 },
    uCol: { value: new THREE.Vector3(0.32, 0.85, 1.9) } };
  const water = new THREE.Mesh(instQuads(1700, seed), new THREE.ShaderMaterial({ uniforms: wu, vertexShader: WAT_V, fragmentShader: WAT_F, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
  water.frustumCulled = false; water.renderOrder = 8; G.add(water);
  const ku = { uL: su.uL, uR: su.uR, uD: { value: 0 }, uSize: { value: 0.06 }, uStreak: { value: 0.0 }, uN: { value: 1 }, uWall: { value: 1 }, uI: { value: 0 }, uTime: { value: 0 } };
  const sparks = new THREE.Mesh(instQuads(420, seed + 50), new THREE.ShaderMaterial({ uniforms: ku, vertexShader: WAT_V, fragmentShader: SPK_F, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
  sparks.frustumCulled = false; sparks.renderOrder = 9; G.add(sparks);
  // tapas de luz en los extremos (entrada y salida del agua)
  const capM = new THREE.MeshBasicMaterial({ color: 0x3fb6ff, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const cap = new THREE.Mesh(new THREE.RingGeometry(0.96, 1.0, 64), capM); cap.rotation.y = Math.PI / 2; G.add(cap);
  lab.add(G);
  return { G, su, wu, ku, cap };
}
// la barra de presión: una columna por metro bajo el tubo principal (baja metro a metro)
let tubeA, tubeW, bars, title, labGrid;
const NB = LMAX, _o = new THREE.Object3D(), _c = new THREE.Color();
function buildLab() {
  tubeA = makeLabTube(3); tubeW = makeLabTube(9); tubeW.G.visible = false;
  const bg = new RoundedBoxGeometry(0.7, 1, 0.42, 2, 0.05); bg.translate(0, 0.5, 0);
  bars = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ color: 0xffffff }), NB);
  bars.frustumCulled = false; bars.renderOrder = 7; lab.add(bars);
  for (let i = 0; i < NB; i++) bars.setColorAt(i, _c.setRGB(0, 0, 0));
  title = titleMesh([['PÉRDIDA DE CARGA', 200, 'Bebas', 'fire']], 3.6, { h: 300 }); lab.add(title);
  labGrid = new THREE.GridHelper(120, 120, 0x123049, 0x0b1a28); labGrid.position.y = -3.35; lab.add(labGrid);
  const lp = new THREE.PointLight(0x3fb6ff, 30, 0, 2); lp.position.set(0, 4, 6); lab.add(lp);
}

// ------------------------------------------------------------------ tiempos y planos (cortes secos entre planos)
let T = {}, SH = [];
function shot(t0, a, b, o = {}) { SH.push({ t0, a, b, ...o }); }
function setupTimes() {
  T = { ...CUE, end: END };
  const L = window.LINES_;
  T.l1e = L[1].end; T.l5e = L[5].end;
  T.fin = T.compartir - 0.25;
  T.lab0 = T.dentro - 0.18; T.side = T.metro - 0.35; T.back = T.entonces - 0.15;
  SH = [];
  // 1a · gancho: pegados al colector de la autobomba; las tres mangueras salen disparadas hacia la cámara
  shot(0, [1.2, 1.0, -1.8, -0.1, 0.9, 0.4, 50], [3.2, 3.1, -7.4, -0.3, 0.6, -1.2, 44], { ease: 'out' });
  // 1b · «¿Cuál pierde más presión?»: dron sobre las tres líneas hasta las lanzas (manómetros «?»)
  shot(T.cual - 0.1, [4.5, 9.5, -10, 0.6, 1.6, -24.5, 40], [5.2, 6.4, -14.5, 0.6, 1.8, -25, 40]);
  // 2 · a ras de suelo, detrás del colector: las tres líneas en abanico hacia el fuego (25 · 45 · 70)
  shot(T.v25 - 0.12, [0.0, 1.05, -1.2, 0, 0.45, -24, 38], [0.0, 1.6, -5.0, 0, 0.6, -25, 38]);
  // 3 · rayos X: el tubo por dentro, desde la entrada del agua
  shot(T.lab0, [-2.2, 1.0, 3.6, 5, -0.1, -0.4, 46], [0.4, 0.9, 3.4, 7, -0.1, -0.4, 46], { lab: true });
  // 3b · el tubo y las columnas de presión, una por metro
  shot(T.side, [-3.2, 2.2, 6.8, 5.5, -1.5, -0.5, 44], [-3.6, 2.6, 7.6, 6.0, -1.6, -0.5, 44], { lab: true });
  // 4 · «pérdida de carga»: se aleja mientras el tubo se alarga
  shot(T.perdida - 0.15, [-3.6, 2.8, 7.8, 6.0, -1.2, -0.5, 44], [-5.4, 4.0, 11.0, 8.0, -1.4, -0.5, 44], { lab: true, lin: true });
  // 5 · «si la estrechas»: el tubo se estrecha; luego, los dos tubos (70 arriba, 25 abajo)
  shot(T.estrechas - 0.15, [-2.8, 1.3, 7.2, 5.0, 0.0, -0.3, 44], [-3.4, 1.0, 9.2, 5.5, 0.0, -0.3, 44], { lab: true });
  // 6 · vuelta a la plaza: el dron sube y se aleja sobre las tres líneas; letras quietas
  shot(T.back, [7.5, 5.2, -10, 0, 1.0, -24, 42], [9.5, 12, 1.0, 0, 0.6, -19, 42]);
  // 7 · venta: más arriba
  shot(T.fin, [9.5, 12, 1.0, 0, 0.6, -19, 42], [12, 26, 13, 0, 0, -14, 44], { lin: true });
}
function curShot(t) { let i = 0; while (i < SH.length - 1 && t >= SH[i + 1].t0) i++; return i; }
function shotEnd(i) { return i < SH.length - 1 ? SH[i + 1].t0 : T.end + 1; }
const _m = new THREE.Matrix4();
function pose(p, tgt, fov) { _m.lookAt(p, tgt, V(0, 1, 0)); return { p: p.clone(), q: new THREE.Quaternion().setFromRotationMatrix(_m), fov, focus: p.distanceTo(tgt), ap: 0 }; }
function camAt(t) {
  const i = curShot(t), s = SH[i], t1 = shotEnd(i);
  const k0 = cl((t - s.t0) / Math.max(0.1, t1 - s.t0));
  const k = s.lin ? k0 : s.ease === 'io' ? e3(k0) * 0.75 + k0 * 0.25 : s.ease === 'out' ? 1 - Math.pow(1 - k0, 2.2) : mx(k0, 0.5 - 0.5 * Math.cos(Math.PI * k0), 0.6);
  const v = s.a.map((x, j) => mx(x, s.b[j], k));
  const off = s.lab ? LABX : 0;
  const sh = Math.exp(-Math.pow((t - T.ocho - 0.05) / 0.12, 2)) * 0.06 * (s.lab ? 1 : 0);
  return pose(V(v[0] + off + sh * Math.sin(t * 91), v[1] + sh * Math.cos(t * 77), v[2]), V(v[3] + off, v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t
function integ(t, t0, f) { let s = 0; const dt = 1 / 120; for (let u = t0; u < t; u += dt) s += f(Math.min(t, u + dt / 2)) * Math.min(dt, t - u); return s; }
function labState(t) {
  // radio del tubo principal (A), largo, caudal; en S5 se estrecha de «70» a «25»
  const R0 = 0.9, R25 = 0.9 * 25 / 70;
  const narrow = e3(pr(t, T.estrechas + 0.05, 1.1));
  const pulse = Math.sin(Math.PI * cl((t - T.ancha + 0.05) / 0.9)) * (t > T.ancha - 0.05 && t < T.ancha + 0.85 ? 1 : 0);
  const R = mx(R0, R25, narrow) * (1 + 0.38 * pulse);
  const L = mx(12, 19, e3(pr(t, T.larga - 0.05, 0.8))) * (1 - narrow) + 12 * narrow;
  const flow = 1 + 0.75 * e3(pr(t, T.pasa - 0.25, 0.6)) * (1 - sm(T.ancha - 0.3, T.ancha + 0.1, t));
  return { R, L, flow, narrow, R0, R25 };
}
const VB = 2.3;                                           // velocidad del agua «de base» (m/s, visual)
function speedA(t) { const s = labState(t); return VB * s.flow * Math.pow(s.R0 / Math.max(0.2, s.R), 2) * (1 - 0.0 * s.narrow); }
function updateWorld(t) {
  FLAMES.forEach(f => f.u.uCam.value.copy(cam.position));
  for (const f of [fire1, fire2]) { f.F.u.uTime.value = t; f.s.u.uTime.value = t; f.e.u.uTime.value = t; }
  fireL1.intensity = 62 + 22 * Math.sin(t * 15) * Math.sin(t * 4.3); fireL2.intensity = 40 + 14 * Math.sin(t * 13 + 1) * Math.sin(t * 3.7);
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = 6 + 40 * on;
  // las mangueras salen disparadas (0,1–0,9 s) y el agua las llena; luego corre (la misma velocidad de luz en las tres)
  hoses.forEach((h, i) => {
    h.grow(eO(pr(t, 0.06 + i * 0.07, 0.62)));
    h.fu.uTime.value = t; h.fu.uSpeed.value = 1.6;
    h.fu.uHead.value = e3(pr(t, 0.55 + i * 0.05, 1.35));
    const tl = [T.v25, T.v45, T.v70][i];
    h.fu.uI.value = 1.0 + 0.5 * Math.exp(-Math.pow((t - T.agua - 0.1) / 0.3, 2)) + 1.1 * Math.exp(-Math.pow((t - tl - 0.15) / 0.28, 2));
  });
  // manómetros «?» encima de las lanzas: al preguntar (gancho) y al volver a la plaza
  const gIn = bk(pr(t, T.cual - 0.05, 0.5)) * (1 - sm(T.v25 - 0.35, T.v25 - 0.1, t));
  gauges.forEach((gg, i) => { gg.scale.setScalar(Math.max(0.001, gIn * gg.userData.sc)); gg.visible = gIn > 0.01; gg.quaternion.copy(cam.quaternion); });
  needles.forEach((n, i) => { n.rotation.z = -angP(5 + 3.2 * Math.sin((t - T.cual) * (2.1 + 0.4 * i) - 1.57 + i * 1.9)); });
  ffs.forEach((f, i) => { f.position.y = 0.004 * Math.sin(t * 2.1 + i); });
}
function updateLab(t) {
  const s = labState(t);
  const t0 = T.lab0;
  // tubo A (el principal): en S5 pasa a ser el de 25 mm (abajo); el W (70 mm) aparece arriba
  const two = e3(pr(t, T.v25b - 0.35, 0.7));
  tubeA.su.uR.value = s.R; tubeA.su.uL.value = s.L;
  tubeA.G.position.set(0, mx(0, -1.15, two), 0);
  tubeA.wu.uD.value = integ(t, t0, speedA);
  tubeA.wu.uStreak.value = 0.05 + 0.032 * speedA(t);
  tubeA.wu.uSize.value = mx(0.045, 0.032, s.narrow); tubeA.wu.uI.value = 0.62; tubeA.wu.uTime.value = t;
  tubeA.wu.uN.value = mx(0.55, 1.0, cl((s.flow - 1) / 0.75)) * mx(1, 0.75, s.narrow);
  tubeA.wu.uRub.value = sm(T.rozando - 0.2, T.rozando + 0.4, t);
  tubeA.ku.uD.value = tubeA.wu.uD.value; tubeA.ku.uTime.value = t;
  const vA = speedA(t) / VB;
  tubeA.ku.uI.value = sm(T.rozando - 0.25, T.rozando + 0.3, t) * cl(0.25 + 0.35 * vA, 0, 2.2) * (0.6 + 0.4 * Math.sin(t * 23));
  tubeA.ku.uN.value = cl(0.25 + 0.12 * vA, 0, 1);
  tubeA.su.uRing.value = sm(T.metro - 0.5, T.metro - 0.1, t) * (1 - sm(T.perdida + 0.5, T.perdida + 1.0, t)) + 0.15;
  tubeA.su.uHot.value = tubeA.ku.uI.value * 0.35;
  tubeA.su.uI.value = 1;
  // columnas de presión: salen una por metro con «en cada metro…»; con más largo, más columnas; con más agua, bajan más deprisa
  const show = (t - T.metro + 0.15) / 1.6 * 12, drop = 0.064 * s.flow;
  const barI = sm(T.metro - 0.3, T.metro, t) * (1 - sm(T.ancha - 0.4, T.ancha - 0.05, t));
  for (let i = 0; i < NB; i++) {
    const vis = cl(show - i) * (i + 0.5 < s.L ? 1 : 0) * barI;
    const h = Math.max(0.06, 1 - (i + 0.5) * drop) * 1.5;
    _o.position.set(i + 0.5, -s.R - 2.4, 0); _o.scale.set(1, Math.max(0.001, h * eO(vis)), 1); _o.updateMatrix();
    bars.setMatrixAt(i, _o.matrix);
    const k = cl(h / 1.5);
    bars.setColorAt(i, _c.setRGB(mx(0.62, 0.035, k), mx(0.06, 0.2, k), mx(0.02, 0.62, k)).multiplyScalar(vis));
  }
  bars.instanceMatrix.needsUpdate = true; bars.instanceColor.needsUpdate = true;
  // título 3D
  const ti = bk(pr(t, T.perdida - 0.1, 0.5)) * (1 - sm(T.depende + 0.2, T.depende + 0.5, t));
  title.visible = ti > 0.01; title.scale.setScalar(Math.max(0.001, ti)); title.quaternion.copy(cam.quaternion);
  title.position.copy(cam.position).add(V(0, 0, -9).applyQuaternion(cam.quaternion)).add(V(0, 2.1, 0).applyQuaternion(cam.quaternion)).sub(lab.position);
  // tubo W (70 mm, arriba) con su propia agua, a la velocidad «de base»
  tubeW.G.visible = two > 0.01;
  tubeW.su.uR.value = 0.9; tubeW.su.uL.value = 12; tubeW.su.uI.value = two; tubeW.su.uRing.value = 0.15;
  tubeW.G.position.set(0, mx(2.4, 1.35, two), 0);
  tubeW.wu.uD.value = VB * (t - T.v25b); tubeW.wu.uStreak.value = 0.05 + 0.032 * VB; tubeW.wu.uI.value = two * 0.62; tubeW.wu.uN.value = 0.85; tubeW.wu.uSize.value = 0.045;
  tubeW.ku.uD.value = tubeW.wu.uD.value; tubeW.ku.uI.value = two * 0.32 * (0.6 + 0.4 * Math.sin(t * 19)); tubeW.ku.uN.value = 0.37; tubeW.ku.uTime.value = t;
  // tapas de luz
  for (const tb of [tubeA, tubeW]) { tb.cap.scale.setScalar(tb.su.uR.value); tb.cap.material.opacity = 0.22 * tb.su.uI.value; }
}
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  const inLab = !!SH[curShot(t)].lab;
  world.visible = !inLab; lab.visible = inLab;
  scene.fog.density = inLab ? 0.018 : 0.011;
  if (inLab) updateLab(t); else updateWorld(t);
}

// ------------------------------------------------------------------ capa 2D
function proj(v) { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * W2, y: (-p.y * 0.5 + 0.5) * H2, ok: p.z < 1 }; }
const BLUE2 = '#3FB6FF', RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D';
function chip(x, y, text, col, a, s = 1, icon = null, px = 56) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a); g.translate(cl(x, 200, W2 - 200), cl(y, 470, H2 - 230)); g.scale(s, s);
  g.font = `400 ${px}px Bebas`; const tw = g.measureText(text).width, w = tw + (icon ? 100 : 60), h = px * 1.45;
  rr(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  const cx = -w / 2 + 46;
  if (icon === 'o') { g.beginPath(); g.arc(cx, 0, 20, 0, 7); g.strokeStyle = col; g.lineWidth = 6; g.stroke(); }
  else if (icon === 'r') { g.beginPath(); g.moveTo(cx - 22, 0); g.lineTo(cx + 22, 0); g.moveTo(cx - 22, -12); g.lineTo(cx - 22, 12); g.moveTo(cx + 22, -12); g.lineTo(cx + 22, 12); g.strokeStyle = col; g.lineWidth = 5; g.stroke(); }
  else if (icon === 'w') { for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(cx - 22, -12 + k * 12); g.bezierCurveTo(cx - 8, -20 + k * 12, cx + 6, -4 + k * 12, cx + 22, -12 + k * 12); g.strokeStyle = col; g.lineWidth = 4; g.stroke(); } }
  else if (icon === 'z') { g.beginPath(); g.moveTo(cx - 20, 8); for (let k = 0; k < 5; k++) g.lineTo(cx - 20 + (k + 0.5) * 8, k % 2 ? 8 : -8); g.strokeStyle = col; g.lineWidth = 4; g.stroke(); }
  else if (icon === 'p') { g.beginPath(); g.arc(cx, 0, 22, 0, 7); g.strokeStyle = col; g.lineWidth = 4; g.stroke(); g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx + 14, -10); g.stroke(); }
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
const OPTS = [['A', '25 mm'], ['B', '45 mm'], ['C', '70 mm'], ['D', 'LAS TRES IGUAL']];
function cards(t) {               // 2 × 2 tarjetas: al nombrar las opciones y al final (quietas, «comenta tu letra»); sin dar la respuesta
  const first = (i) => bk(pr(t, T.tres2 - 0.45 + i * 0.08, 0.45)) * (1 - sm(T.lab0 - 0.35, T.lab0 - 0.05, t));
  const second = (i) => bk(pr(t, T.cual2 - 0.3 + i * 0.07, 0.4)) * (1 - sm(T.fin - 0.3, T.fin + 0.05, t));
  OPTS.forEach(([L, s], i) => {
    const k = Math.max(first(i), second(i));
    if (k <= 0.005) return;
    const cx = 290 + (i % 2) * 500, cy = 640 + (i >> 1) * 170, side = i % 2 ? 1 : -1;
    const pulse = t > T.comenta - 0.1 && t < T.fin ? 1 + 0.03 * Math.max(0, Math.sin((t - T.comenta) * 6 - i * 1.3)) : 1;
    g.save(); g.globalAlpha = cl(k * 1.3); g.translate(cx + side * (1 - cl(k)) * 600, cy); g.scale(pulse, pulse);
    rr(-230, -66, 460, 132, 40); g.fillStyle = 'rgba(9,12,17,0.88)'; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.3)'; g.stroke();
    g.beginPath(); g.arc(-160, 0, 44, 0, 7); g.fillStyle = COLS[i]; g.fill();
    txt(L, -160, 22, 64, '#0b0d10', 400, 'center', 'Bebas');
    g.font = '400 96px Bebas'; let px = 96; while (g.measureText(s).width > 300 && px > 40) { px -= 4; g.font = `400 ${px}px Bebas`; }
    txt(s, 40, px * 0.33, px, '#F2F5F8', 400, 'center', 'Bebas');
    g.restore();
  });
}
function hoseTag(x, y, i, a) {    // etiqueta de cada línea: su sección a escala (círculo) y los milímetros
  if (a <= 0.005) return;
  const k = bk(cl(a));
  g.save(); g.globalAlpha = cl(a * 1.4); g.translate(cl(x, 170, W2 - 170), cl(y, 520, H2 - 260)); g.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
  const rad = DMM[i] * 0.62;
  rr(-150, -rad - 76, 300, rad * 2 + 150, 34); g.fillStyle = 'rgba(8,10,14,0.82)'; g.fill(); g.strokeStyle = COLS[i]; g.lineWidth = 4; g.stroke();
  g.beginPath(); g.arc(0, -16, rad, 0, 7); g.fillStyle = 'rgba(63,182,255,0.25)'; g.fill(); g.strokeStyle = '#EAF6FF'; g.lineWidth = 6; g.stroke();
  txt(`${DMM[i]} mm`, 0, rad + 46, 64, '#F4F6F8', 400, 'center', 'Bebas');
  g.beginPath(); g.arc(-112, -rad - 40, 26, 0, 7); g.fillStyle = COLS[i]; g.fill(); txt('ABC'[i], -112, -rad - 28, 36, '#0b0d10', 400, 'center', 'Bebas');
  g.restore();
}
function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const si = curShot(t), inLab = !!SH[si].lab;
  if (!inLab) {
    // gancho: misma bomba, mismo caudal; manómetros «?»
    const pump = proj(V(0, 1.85, 0.1)), outl = proj(V(0, 0.9, -0.3));
    chip(pump.x, pump.y - 150, 'LA MISMA BOMBA', BLUE2, sm(T.bomba - 0.15, T.bomba + 0.1, t) * (1 - sm(T.cual - 0.3, T.cual, t)), 1.05, 'p', 58);
    chip(outl.x, outl.y + 110, 'MISMO CAUDAL', CYAN2, sm(T.agua - 0.15, T.agua + 0.1, t) * (1 - sm(T.cual - 0.1, T.cual + 0.2, t)), 1.05, 'w', 58);
    const gIn = sm(T.cual + 0.05, T.cual + 0.3, t) * (1 - sm(T.v25 - 0.35, T.v25 - 0.1, t));
    if (gIn > 0.01 && si === 1) LANES.forEach((x, i) => {
      const p = proj(V(x + 0.5, GY + 0.5, GZ)); if (!p.ok) return;
      const b = 1 + 0.12 * Math.max(0, Math.sin((t - T.cual) * 5 + i));
      g.save(); g.globalAlpha = gIn; g.translate(p.x, p.y); g.scale(b, b); g.beginPath(); g.arc(0, 0, 34, 0, 7); g.fillStyle = GOLD2; g.fill();
      txt('?', 0, 18, 56, '#14100a', 400, 'center', 'Bebas'); g.restore();
    });
    // sello del examen (dato de Adrián: CONFIRMAR)
    const ex = Math.max(sm(T.cual - 0.25, T.cual + 0.05, t) * (1 - sm(T.v25 - 0.35, T.v25 - 0.1, t)), sm(T.back + 0.2, T.back + 0.5, t) * (1 - sm(T.fin - 0.3, T.fin, t)));
    if (ex > 0) { g.save(); g.globalAlpha = ex; g.translate(540, 520); rr(-400, -42, 800, 84, 42); g.fillStyle = 'rgba(8,10,14,0.8)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 3; g.stroke();
      txt('EXAMEN · AYTO. DE PONTEVEDRA 2022', 0, 16, 46, GOLD2, 400, 'center', 'Bebas'); g.restore(); }
    // las tres líneas con su sección a escala (plano a ras de suelo)
    if (si === 2) LANES.forEach((x, i) => {
      const tc = [T.v25, T.v45, T.v70][i], a = sm(tc - 0.15, tc + 0.15, t) * (1 - sm(T.lab0 - 0.4, T.lab0 - 0.1, t));
      if (a <= 0.005) return;
      const tx = 210 + i * 330, ty = 1430, p = proj(V(x + (i - 1) * 0.15, HRAD[i], -9));
      g.save(); g.globalAlpha = a * 0.8; g.strokeStyle = COLS[i]; g.lineWidth = 3; g.setLineDash([10, 8]);
      g.beginPath(); g.moveTo(tx, ty - DMM[i] * 0.62 - 80); g.lineTo(p.x, p.y); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(p.x, p.y, 9, 0, 7); g.fillStyle = COLS[i]; g.fill(); g.restore();
      hoseTag(tx, ty, i, a);
    });
  } else {
    // dentro de la manguera
    chip(540, 1500, 'EL AGUA ROZA CON LA PARED', ORANGE2, sm(T.rozando - 0.15, T.rozando + 0.15, t) * (1 - sm(T.side - 0.25, T.side, t)), 1.05, 'z', 56);
    const bp = proj(V(LABX + 4.0, -3.5, 0));
    chip(bp.x + 60, bp.y + 90, 'CADA METRO: − PRESIÓN', CYAN2, sm(T.metro - 0.1, T.metro + 0.2, t) * (1 - sm(T.perdida - 0.3, T.perdida, t)), 1.05, 'p', 56);
    // de qué depende: largo, caudal, ancho
    const row = [['LONGITUD', 'r', T.larga], ['CAUDAL', 'w', T.pasa], ['DIÁMETRO', 'o', T.ancha]];
    row.forEach(([s, ic, tc], j) => {
      const a = sm(tc - 0.15, tc + 0.1, t) * (1 - sm(T.estrechas - 0.3, T.estrechas, t));
      const hot = Math.exp(-Math.pow((t - tc - 0.25) / 0.45, 2));
      chip(200 + j * 340, 1530, s, [CYAN2, BLUE2, GOLD2][j], a, 0.92 + 0.22 * hot, ic, 54);
    });
    // los dos tubos: 70 arriba, 25 abajo, y cuánto más rápido va el agua en el de 25
    const two = sm(T.v25b - 0.3, T.v25b + 0.2, t);
    if (two > 0.01) {
      const pw = proj(V(LABX - 0.2, 1.35 + 0.9 + 0.25, 0)), pn = proj(V(LABX - 0.2, -1.15 + 0.33 + 0.25, 0));
      chip(pw.x + 120, pw.y - 40, '70 mm', COLS[2], two, 1.0, 'o', 58);
      chip(pn.x + 120, pn.y - 40, '25 mm', COLS[0], two, 1.0, 'o', 58);
      const sp = sm(T.ocho - 0.1, T.ocho + 0.2, t);
      const qw = proj(V(LABX + 6, 1.35 + 0.9, 0)), qn = proj(V(LABX + 6, -1.15 - 0.33, 0));
      chip(qw.x, qw.y - 90, 'VELOCIDAD ×1', CYAN2, sp, 1.0, 'w', 52);
      chip(qn.x, qn.y + 110, 'VELOCIDAD ×7,8', ORANGE2, sp, 1.0 + 0.2 * Math.exp(-Math.pow((t - T.ocho - 0.2) / 0.25, 2)), 'w', 52);
      chip(540, 1640, 'A IGUAL CAUDAL · (70 / 25)² ≈ 7,8', GOLD2, sm(T.v25b + 0.1, T.v25b + 0.4, t), 0.95, null, 50);
    }
    stamp('×7,8', 1000, ORANGE2, Math.exp(-Math.pow((t - T.ocho - 0.45) / 0.55, 4)), 230, -0.05);
  }
  // tarjetas y «comenta tu letra»
  cards(t);
  const ce = sm(T.comenta - 0.12, T.comenta + 0.15, t) * (1 - sm(T.fin - 0.3, T.fin + 0.05, t));
  if (ce > 0) {
    const b = 1 + 0.05 * Math.max(0, Math.sin((t - T.comenta) * 6));
    g.save(); g.globalAlpha = ce; g.translate(540, 1560); g.scale(b, b); rr(-330, -56, 660, 112, 56); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('💬  COMENTA TU LETRA', 0, 20, 58, '#F2F5F8', 400, 'center', 'Bebas'); g.restore();
  }
  share(t);
  closing(t);
  // un punto casi invisible: si la capa solo se borra, Chrome no la vuelve a presentar (ver presion.js)
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.01)'; g.fillRect(0, 0, 2, 2);
}

// ------------------------------------------------------------------ fotograma (los subfotogramas no mezclan planos)
function subframes(t) {
  const i = curShot(t), lo = SH[i].t0, hi = shotEnd(i) - 1e-4;
  const a = camAt(cl(t - 1 / 240, lo, hi)), b = camAt(cl(t + 1 / 240, lo, hi));
  const ang2 = a.q.angleTo(b.q), mv = a.p.distanceTo(b.p) / Math.max(0.5, (a.focus + b.focus) / 2);
  return Math.max(1, Math.min(4, Math.ceil((ang2 + mv) * H2 / (a.fov * Math.PI / 180) / 22)));
}
window.renderAt = t => {
  const N = window.FAST ? 1 : subframes(t);
  const i = curShot(t), lo = SH[i].t0, hi = shotEnd(i) - 1e-4;
  renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < N; k++) {
    update(N === 1 ? t : cl(t + (k / (N - 1) - 0.5) / 120, lo, hi));
    composer.render();
    accMat.uniforms.tSrc.value = composer.readBuffer.texture; accMat.uniforms.uW.value = 1 / N;
    renderer.setRenderTarget(accRT); renderer.autoClear = false; renderer.render(accScene, quadCam); renderer.autoClear = true;
  }
  if (N > 1) update(t);
  finMat.uniforms.tSrc.value = accRT.texture; finMat.uniforms.uTime.value = t;
  const fl1 = Math.exp(-Math.pow((t - T.lab0 - 0.02) / 0.08, 2)) * 0.55, fl2 = Math.exp(-Math.pow((t - T.back - 0.02) / 0.08, 2)) * 0.35, fl0 = Math.exp(-Math.pow((t - 0.05) / 0.08, 2)) * 0.3;
  finMat.uniforms.uFlash.value = Math.max(fl0, fl1, fl2); finMat.uniforms.uFlashCol.value.setRGB(0.55, 0.85, 1.0);
  finMat.uniforms.uExp.value = SH[i].lab ? 1.05 : 1.0;
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
    setupTimes(); buildWorld(); buildLab();
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'mangueras: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
