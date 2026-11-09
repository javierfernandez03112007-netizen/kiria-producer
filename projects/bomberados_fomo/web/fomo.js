// «FOMO Bomberados» (idea de Adrián, «FOMO BOMBERADOS - MARTES 10»): no es un juego, es lo que te va a dar la plaza.
// Motor de projects/bomberados_guardia/web/guardia.js: un cuarto de estudio de noche que se convierte en una ARENA de concurso
// (ruleta gigante, neón), el mapa de España con duelos entre ciudades y el MÓVIL en primer plano con GRABACIONES REALES de la app
// (out/rec_1vs1, rec_ia, rec_sim, rec_grupo; 30 fps): ruleta, convocatorias, callejero, Profe IA, menú PRO y ranking.
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
// El cuarto de estudio (escritorio en el origen, el opositor sentado mirando a −Z) y, detrás de la pared del fondo, la
// ARENA: ruleta gigante en z = −3,2, suelo de neón y focos de colores. AR(t) = 0 cuarto apagado, 1 arena encendida.
const world = new THREE.Group(); scene.add(world);
cam.far = 200; cam.updateProjectionMatrix();
const C = (hex) => new THREE.Color(hex);
let hemi, lampL, fillL, WHEEL, WHEEL_FACE, POINTER, backWall, sideWall, wallMat, gridMat, gridMat2, rimBulbs = [], spots = [], PHONES = [], DUST;
const CR = {};
function put(geo, mat, x, y, z, parent = world) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
function yawTo(o, x, z) { o.rotation.y = Math.atan2(-(x - o.position.x), -(z - o.position.z)); return o; }

// ------------------------------------------------------------------ el opositor (sentado; cabeza que se inclina; móvil)
function makeCrew(o = {}) {
  const G = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: o.shirt ?? 0x2f5aa8, roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: o.pants ?? 0x27324a, roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: o.skin ?? 0xd6a582, roughness: 0.62 });
  const hairM = new THREE.MeshStandardMaterial({ color: o.hair ?? 0x2a1a10, roughness: 0.8 });
  const P = (geo, mat, x, y, z, parent = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const hipY = 0.5, legs = [], arms = [];
  for (const s of [-1, 1]) {
    const hp = new THREE.Group(); hp.position.set(0.1 * s, hipY, 0); G.add(hp); legs.push(hp);
    P(new THREE.CapsuleGeometry(0.083, 0.34, 6, 12), pants, 0, 0, -0.21, hp).rotation.x = Math.PI / 2;
    P(new THREE.CapsuleGeometry(0.075, 0.3, 6, 12), pants, 0, -0.24, -0.42, hp);
    P(new RoundedBoxGeometry(0.12, 0.1, 0.28, 2, 0.035), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 }), 0, -0.45, -0.48, hp);
  }
  P(new RoundedBoxGeometry(0.46, 0.6, 0.28, 4, 0.11), shirt, 0, hipY + 0.31, 0);
  P(new THREE.TorusGeometry(0.1, 0.035, 8, 20), shirt, 0, hipY + 0.6, 0.06).rotation.x = Math.PI / 2;
  const head = new THREE.Group(); head.position.set(0, hipY + 0.64, 0); G.add(head);
  P(new THREE.CylinderGeometry(0.055, 0.065, 0.09, 14), skin, 0, 0.0, 0, head);
  P(new THREE.SphereGeometry(0.11, 24, 18), skin, 0, 0.15, 0, head).scale.set(0.95, 1.08, 1);
  P(new THREE.SphereGeometry(0.117, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 0.17, 0.012, head);
  for (const s of [-1, 1]) P(new THREE.SphereGeometry(0.016, 8, 6), M.black, 0.04 * s, 0.165, -0.102, head);
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0.27 * s, hipY + 0.54, 0); G.add(p); arms.push(p);
    P(new THREE.CapsuleGeometry(0.062, 0.16, 6, 12), shirt, 0, -0.12, 0, p);
    const e = new THREE.Group(); e.position.set(0, -0.27, 0); p.add(e); p.userData.el = e;
    P(new THREE.CapsuleGeometry(0.052, 0.17, 6, 12), shirt, 0, -0.1, 0, e);
    P(new THREE.SphereGeometry(0.05, 12, 10), skin, 0, -0.26, 0, e);
  }
  const ph = new THREE.Group(); ph.position.set(0.0, hipY + 0.36, -0.3); ph.rotation.x = -0.95; G.add(ph);
  P(new RoundedBoxGeometry(0.078, 0.16, 0.01, 2, 0.006), M.black, 0, 0, 0, ph);
  const scrM = new THREE.MeshBasicMaterial({ color: 0x999999 });
  new THREE.TextureLoader().load('../out/rec_1vs1/r0060.jpg', tx => { tx.colorSpace = THREE.SRGBColorSpace; scrM.map = tx; scrM.needsUpdate = true; });
  P(new THREE.PlaneGeometry(0.07, 0.148), scrM, 0, 0, -0.0055, ph).rotation.y = Math.PI;
  G.userData = { arms, legs, head, phone: ph, hipY };
  return G;
}

// ------------------------------------------------------------------ la ruleta (iconos dibujados, no los de la app)
const SEGS = [['#d8303a', 'fuego'], ['#e8802a', 'casco'], ['#c95066', 'hidrante'], ['#6a5ad8', 'camion'], ['#b04a5a', 'cruz'], ['#5a4a4a', 'libro'], ['#e04050', 'rayo'], ['#d9a400', 'plaza']];
const PLAZA_I = 7;
const PLAZA_ROT = ((Math.PI / 2 + ((PLAZA_I + 0.5) / 8) * Math.PI * 2) % (2 * Math.PI));   // «TU PLAZA» queda derecho cuando la ruleta la deja arriba
function icon(x, kind, cx, cy, s) {
  x.save(); x.translate(cx, cy); x.scale(s, s); x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineWidth = 7; x.lineJoin = 'round'; x.lineCap = 'round';
  if (kind === 'fuego') { x.beginPath(); x.moveTo(0, -48); x.bezierCurveTo(34, -10, 30, 20, 0, 44); x.bezierCurveTo(-30, 20, -34, -6, -8, -26); x.bezierCurveTo(-6, -8, 4, -10, 0, -48); x.fill(); }
  if (kind === 'casco') { x.beginPath(); x.arc(0, 10, 38, Math.PI, 0); x.fill(); x.fillRect(-50, 8, 100, 10); x.fillRect(-5, -34, 10, 30); }
  if (kind === 'hidrante') { x.fillRect(-16, -34, 32, 70); x.beginPath(); x.arc(0, -34, 18, Math.PI, 0); x.fill(); x.fillRect(-32, -6, 64, 12); x.fillRect(-24, 36, 48, 8); }
  if (kind === 'camion') { x.fillRect(-46, -14, 60, 34); x.fillRect(14, -4, 30, 24); x.beginPath(); x.arc(-26, 26, 9, 0, 7); x.arc(26, 26, 9, 0, 7); x.fill(); x.fillRect(-46, -24, 56, 5); }
  if (kind === 'cruz') { x.fillRect(-12, -38, 24, 76); x.fillRect(-38, -12, 76, 24); }
  if (kind === 'libro') { x.beginPath(); x.moveTo(0, -24); x.lineTo(-44, -34); x.lineTo(-44, 30); x.lineTo(0, 40); x.lineTo(44, 30); x.lineTo(44, -34); x.closePath(); x.fill(); x.strokeStyle = '#5a4a4a'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, -24); x.lineTo(0, 40); x.stroke(); }
  if (kind === 'rayo') { x.beginPath(); x.moveTo(10, -48); x.lineTo(-24, 6); x.lineTo(-2, 6); x.lineTo(-12, 48); x.lineTo(26, -10); x.lineTo(4, -10); x.closePath(); x.fill(); }
  if (kind === 'plaza') { x.rotate(PLAZA_ROT); x.font = '400 58px Bebas'; x.textAlign = 'center'; x.fillText('TU', 0, -6); x.fillText('PLAZA', 0, 46); x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 9 : 22; x.lineTo(Math.cos(a) * r, -64 + Math.sin(a) * r); } x.closePath(); x.fill(); }
  x.restore();
}
function wheelTex() {
  return canvasTex(1024, 1024, (x) => {
    const n = SEGS.length, R = 500;
    x.translate(512, 512);
    SEGS.forEach(([col, kind], i) => {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R, a0, a1); x.closePath(); x.fillStyle = col; x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 6; x.stroke();
      const am = (a0 + a1) / 2; icon(x, kind, Math.cos(am) * 330, Math.sin(am) * 330, 1.25);
    });
    x.beginPath(); x.arc(0, 0, 110, 0, 7); x.fillStyle = '#f4f2ee'; x.fill();
    x.font = '400 150px Bebas'; x.textAlign = 'center'; x.fillStyle = '#d8303a'; x.fillText('B', 0, 54);
  }, { aniso: 8 });
}
// ángulo (en el plano de la ruleta) del centro de la casilla i; en el lienzo el ángulo crece en sentido horario visto de frente
const segAngle = i => -((i + 0.5) / SEGS.length) * Math.PI * 2;

function buildRoom() {
  const wood = canvasTex(512, 512, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = `hsl(28, 32%, ${17 + rnd(i) * 7}%)`; x.fillRect(0, i * 64, 512, 64); x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(0, i * 64, 512, 2); } for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(0,0,0,${rnd(k) * 0.08})`; x.fillRect(rnd(k * 2.3) * 512, rnd(k * 4.1) * 512, 30 + rnd(k) * 60, 1); } }, { aniso: 4 });
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(8, 8);
  const floor = put(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55, metalness: 0.05 }), 0, 0, 0); floor.rotation.x = -Math.PI / 2;
  wallMat = new THREE.MeshStandardMaterial({ color: 0x2c313c, roughness: 0.9, transparent: true });
  backWall = put(new THREE.PlaneGeometry(10, 4.6), wallMat, 0, 2.3, -1.3); backWall.castShadow = false;
  sideWall = put(new THREE.PlaneGeometry(6, 4.6), wallMat, -2.6, 2.3, 1.0); sideWall.rotation.y = Math.PI / 2; sideWall.castShadow = false;
  // ventana con la ciudad de noche
  const city = canvasTex(512, 420, (x) => { x.fillStyle = '#0b1020'; x.fillRect(0, 0, 512, 420); for (let i = 0; i < 18; i++) { const w = 20 + rnd(i) * 40, h = 80 + rnd(i * 3) * 220, X = rnd(i * 7) * 512; x.fillStyle = '#121a2c'; x.fillRect(X, 420 - h, w, h); for (let k = 0; k < 30; k++) if (rnd(i * 31 + k) < 0.35) { x.fillStyle = 'rgba(255,200,120,0.85)'; x.fillRect(X + 3 + (k % 3) * (w / 3), 420 - h + 6 + Math.floor(k / 3) * 14, 4, 6); } } });
  const win = put(new THREE.PlaneGeometry(1.3, 1.05), new THREE.MeshBasicMaterial({ map: city, transparent: true }), -1.35, 2.0, -1.29); win.castShadow = false; win.userData.fade = true;
  const frm = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.6, transparent: true });
  for (const [w, h, x, y] of [[1.42, 0.06, -1.35, 2.55], [1.42, 0.06, -1.35, 1.45], [0.06, 1.12, -2.04, 2.0], [0.06, 1.12, -0.66, 2.0], [0.04, 1.05, -1.35, 2.0]]) { const f = put(new THREE.BoxGeometry(w, h, 0.04), frm, x, y, -1.27); f.userData.fade = true; }
  // estantería con libros
  const shelfM = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.7, transparent: true });
  for (const y of [1.55, 2.05]) { const s = put(new THREE.BoxGeometry(1.2, 0.04, 0.25), shelfM, 1.25, y, -1.17); s.userData.fade = true;
    for (let k = 0; k < 9; k++) { const b = put(new THREE.BoxGeometry(0.07 + rnd(k + y) * 0.04, 0.24 + rnd(k * 3 + y) * 0.1, 0.18), new THREE.MeshStandardMaterial({ color: [0x8a2a2a, 0x2a4a8a, 0x2a7a4a, 0xd0c090, 0x6a3a7a][k % 5], roughness: 0.7, transparent: true }), 0.75 + k * 0.11, y + 0.14, -1.17); b.userData.fade = true; } }
  // escritorio, libros, apuntes, flexo
  const deskM = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.55 });
  put(new THREE.BoxGeometry(1.5, 0.05, 0.75), deskM, 0, 0.76, -0.4);
  for (const [a, b] of [[-0.7, -0.75], [0.7, -0.75], [-0.7, -0.05], [0.7, -0.05]]) put(new THREE.BoxGeometry(0.04, 0.74, 0.04), M.steel, a, 0.37, b);
  for (let k = 0; k < 6; k++) put(new THREE.BoxGeometry(0.3, 0.06, 0.22), new THREE.MeshStandardMaterial({ color: [0x2a4a8a, 0x8a2a2a, 0x2a7a4a, 0xd0c090, 0x6a3a7a, 0x8a6a2a][k], roughness: 0.6 }), 0.5, 0.815 + k * 0.062, -0.55).rotation.y = (rnd(k) - 0.5) * 0.25;
  for (let k = 0; k < 3; k++) put(new THREE.BoxGeometry(0.26, 0.05, 0.32), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.8 }), -0.42, 0.81 + k * 0.05, -0.62).rotation.y = 0.1 * k;
  const page = canvasTex(512, 340, (x) => { x.fillStyle = '#f6f3ea'; x.fillRect(0, 0, 512, 340); x.fillStyle = '#d9d4c6'; x.fillRect(254, 0, 4, 340); for (let i = 0; i < 13; i++) { x.fillStyle = '#7c7c80'; x.fillRect(22, 40 + i * 22, 200 - rnd(i) * 60, 5); x.fillRect(278, 40 + i * 22, 210 - rnd(i * 3) * 70, 5); } x.fillStyle = 'rgba(255,230,40,0.55)'; x.fillRect(18, 100, 190, 14); });
  put(new THREE.PlaneGeometry(0.46, 0.3), new THREE.MeshStandardMaterial({ map: page, color: 0xcfcac0, roughness: 0.85 }), 0.0, 0.79, -0.27).rotation.x = -Math.PI / 2;
  put(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0xd94a2a, roughness: 0.35 }), 0.3, 0.84, -0.2);
  put(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 20), M.black, -0.6, 0.79, -0.62);
  put(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), M.black, -0.6, 1.03, -0.62);
  const shade = put(new THREE.ConeGeometry(0.11, 0.13, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x1f2a44, roughness: 0.5, side: THREE.DoubleSide }), -0.48, 1.25, -0.55); shade.rotation.z = 0.9;
  lampL = new THREE.PointLight(0xffc98a, 2.2, 0, 2); lampL.position.set(-0.4, 1.18, -0.5); world.add(lampL);
  // silla y el opositor
  const chairM = new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.5, metalness: 0.3 });
  put(new THREE.BoxGeometry(0.46, 0.05, 0.46), chairM, 0, 0.45, 0.44); put(new THREE.BoxGeometry(0.46, 0.5, 0.05), chairM, 0, 0.74, 0.66);
  for (const [a, b] of [[-0.2, 0.24], [0.2, 0.24], [-0.2, 0.64], [0.2, 0.64]]) put(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 8), M.steel, a, 0.225, b);
  CR.op = makeCrew(); CR.op.position.set(0, 0, 0.42); yawTo(CR.op, 0, -1); world.add(CR.op);
}
function buildArena() {
  WHEEL = new THREE.Group(); WHEEL.position.set(0, 2.35, -3.3); world.add(WHEEL);
  WHEEL_FACE = new THREE.Mesh(new THREE.CircleGeometry(1.9, 128), new THREE.MeshStandardMaterial({ map: wheelTex(), roughness: 0.35, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.25 }));
  WHEEL_FACE.material.emissiveMap = WHEEL_FACE.material.map; WHEEL.add(WHEEL_FACE);
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a400, metalness: 0.9, roughness: 0.25 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.96, 0.09, 16, 120), gold); WHEEL.add(rim);
  for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2, b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a0 })); b.position.set(Math.cos(a) * 1.96, Math.sin(a) * 1.96, 0.09); WHEEL.add(b); rimBulbs.push(b); }
  const back = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.12, 64), new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.6, roughness: 0.4 })); back.rotation.x = Math.PI / 2; back.position.z = -0.08; WHEEL.add(back);
  // soporte y aguja (fija)
  const stand = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.7, roughness: 0.35 });
  put(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 16), stand, 0, 1.2, -3.42);
  put(new THREE.CylinderGeometry(0.9, 1.0, 0.12, 40), stand, 0, 0.06, -3.42);
  POINTER = new THREE.Group(); POINTER.position.set(0, 2.35 + 2.08, -3.18); world.add(POINTER);
  const pg = new THREE.ConeGeometry(0.17, 0.42, 3); const pm = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ color: 0xf4f2ee, emissive: 0xff4b3e, emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.3 })); pm.rotation.z = Math.PI; POINTER.add(pm);
  // suelo de neón (rejilla) y anillo bajo la ruleta
  gridMat = new THREE.LineBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0 });
  gridMat2 = new THREE.LineBasicMaterial({ color: 0x48d6ff, transparent: true, opacity: 0 });
  const pts = [], pts2 = [];
  for (let i = -12; i <= 12; i++) { pts.push(V(i * 0.8, 0.012, -10), V(i * 0.8, 0.012, 6)); }
  for (let j = -12; j <= 7; j++) { pts2.push(V(-9.6, 0.012, j * 0.8), V(9.6, 0.012, j * 0.8)); }
  world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
  world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts2), gridMat2));
  // focos de colores
  for (const [col, x, z] of [[0xff3d7f, -4, 1], [0x48d6ff, 4, 1], [0xff7a1a, 0, 3]]) { const s = new THREE.SpotLight(col, 0, 0, 0.5, 0.6, 1.5); s.position.set(x, 5.5, z); s.target.position.set(0, 1.5, -3.2); world.add(s); world.add(s.target); spots.push(s); }
  fillL = new THREE.PointLight(0x7a5aff, 0, 0, 2); fillL.position.set(0, 3.5, 1.5); world.add(fillL);
  // los móviles de otros opositores (flotan en la oscuridad y se van encendiendo)
  const scr = canvasTex(128, 256, (x) => { x.fillStyle = '#0d0e11'; x.fillRect(0, 0, 128, 256); x.fillStyle = '#ff7a1a'; x.fillRect(10, 18, 70, 8); for (let k = 0; k < 4; k++) { x.fillStyle = k === 1 ? 'rgba(62,240,138,0.85)' : 'rgba(255,255,255,0.18)'; x.fillRect(12, 130 + k * 28, 104, 20); } x.beginPath(); x.arc(64, 82, 32, 0, 7); x.fillStyle = '#d8303a'; x.fill(); });
  for (let i = 0; i < 46; i++) {
    const g = new THREE.Group(), side = i % 2 ? 1 : -1;
    g.position.set(side * (0.45 + rnd(i * 5.7) * 1.05), 1.25 + rnd(i * 1.9) * 1.75, -1.15 + rnd(i * 3.3) * 2.6);
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.36, 0.016, 2, 0.014), M.black); g.add(body);
    const sm_ = new THREE.MeshBasicMaterial({ map: scr, transparent: true, opacity: 0 }); sm_.color.setScalar(1.6); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.165, 0.34), sm_); sc.position.z = 0.009; g.add(sc);
    g.lookAt(0, 1.4, 3.5); g.rotation.z += (rnd(i * 2.1) - 0.5) * 0.4; g.visible = false; world.add(g); PHONES.push({ g, m: sm_, t: rnd(i * 7.7) });
  }
  DUST = new Parts(180, { life: 6, rise: 0.12, acc: 0, size: 0.03, grow: 0.2, turb: 0.25, rot: 0, edge: 0.5, add: true, c: [[2.2, 1.4, 0.6], [1.6, 0.9, 0.4], [1.0, 0.6, 0.3], [0.4, 0.2, 0.1]], seed: 41, extent: [5, 2.2, 4], order: 13 });
  DUST.at(0, 1.6, -1.5); world.add(DUST.mesh);
}
function buildWorld() {
  scene.background = new THREE.Color(0x05060a); scene.fog = new THREE.FogExp2(0x05060a, 0.035);
  hemi = new THREE.HemisphereLight(0x8090b0, 0x201810, 0.35); world.add(hemi);
  const key = new THREE.DirectionalLight(0xbfd0ff, 0.25); key.position.set(3, 6, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); world.add(key);
  buildRoom(); buildArena();
}

// ------------------------------------------------------------------ planos
let T = {}, SH = [];
function shot(t0, a, b, tag, o = {}) { SH.push({ t0, a, b, tag, ...o }); }
const PHONE_TAGS = ['ruleta', 'conv', 'profeia', 'herr'];
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  SH = [];
  shot(0, [1.7, 1.35, 1.6, 0, 0.95, -0.45, 42], [1.3, 1.7, 3.6, 0, 1.9, -2.2, 52], 'hook');
  shot(T.giras - 0.1, [-1.6, 1.4, 2.6, 0, 1.9, -2.6, 50], [-0.9, 1.55, 3.0, 0, 1.9, -2.6, 50], 'ruleta');
  shot(T.solo - 0.1, [0, 7.5, 3.0, 0, 0, -1.2, 50], [0, 8.5, 2.2, 0, 0, -1.5, 50], 'modos');
  shot(T.preguntas - 0.1, [2.2, 1.5, 2.4, 0, 1.8, -2.6, 50], [1.6, 1.6, 2.9, 0, 1.8, -2.6, 50], 'conv');
  shot(T.fallas - 0.1, [-2.0, 1.8, 2.2, 0, 1.6, -2.4, 50], [-1.4, 1.9, 2.8, 0, 1.6, -2.4, 50], 'profeia');
  shot(T.flashcards - 0.1, [1.8, 2.0, 2.6, 0, 1.9, -2.6, 50], [1.1, 2.1, 3.1, 0, 1.9, -2.6, 50], 'herr');
  shot(T.mientras - 0.1, [0.55, 1.45, 1.15, 0, 0.92, -0.45, 40], [0.2, 2.4, 4.6, 0, 1.3, -0.6, 50], 'fomo');
  shot(T.nojuego - 0.1, [0, 2.2, 2.4, 0, 2.4, -3.3, 48], [0, 2.35, 0.9, 0, 2.4, -3.3, 46], 'lema');
  shot(T.retarias - 0.1, [0, 2.0, 5.2, 0, 1.9, -2.5, 50], [0, 2.6, 6.2, 0, 1.9, -2.5, 52], 'coment');
  shot(T.compartir - 0.3, [0, 2.6, 6.2, 0, 1.9, -2.5, 52], [0, 3.4, 7.4, 0, 2.0, -2.5, 54], 'fin');
}
function curShot(t) { let s = SH[0]; for (const x of SH) if (t >= x.t0) s = x; return s; }
function shotEnd(s) { const i = SH.indexOf(s); return i + 1 < SH.length ? SH[i + 1].t0 : T.end; }
const _m = new THREE.Matrix4();
function pose(p, tgt, fov) { _m.lookAt(p, tgt, V(0, 1, 0)); return { p: p.clone(), q: new THREE.Quaternion().setFromRotationMatrix(_m), fov, focus: p.distanceTo(tgt), ap: 0, tgt }; }
function camAt(t) {
  const s = curShot(t), k = pr(t, s.t0, shotEnd(s) - s.t0), u = e3(k) * 0.8 + k * 0.2;
  const v = s.a.map((a, i) => mx(a, s.b[i], u));
  return pose(V(v[0], v[1] + 0.02 * Math.sin(t * 1.3), v[2]), V(v[3], v[4], v[5]), v[6]);
}
// arena: 0 cuarto apagado, 1 arena encendida (con un «chispazo» en el primer segundo)
function AR(t) {
  const s = curShot(t).tag;
  if (s === 'hook') { const glitch = (t > 0.55 && t < 0.63) || (t > 0.72 && t < 0.78) ? 0.75 : 0; return Math.max(glitch, sm(T.asi - 0.2, T.asi + 0.25, t)); }
  if (s === 'fomo') return 1 - sm(T.mientras - 0.1, T.mientras + 0.15, t);
  if (s === 'lema') return sm(T.nojuego - 0.15, T.nojuego + 0.2, t);
  return 1;
}
// giro de la ruleta: libre y, en el lema, frena hasta dejar «TU PLAZA» bajo la aguja (arriba)
const W0 = 2.1;
function wheelAngle(t) {
  const t0 = T.nojuego - 0.1, t1 = T.plaza + 0.1;
  if (t < t0) return W0 * t;
  const a0 = W0 * t0, D = t1 - t0, target = Math.PI / 2 - segAngle(PLAZA_I);
  let delta = ((target - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  while (delta < W0 * D / 3 - Math.PI) delta += 2 * Math.PI;
  return a0 + delta * eO(pr(t, t0, D));
}
function update(t) {
  const P = camAt(t), s = curShot(t), tag = s.tag, ar = AR(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => f.u.uCam.value.copy(cam.position));
  // cuarto ↔ arena
  wallMat.opacity = 1 - ar; backWall.visible = sideWall.visible = ar < 0.995;
  world.traverse(o => { if (o.userData.fade && o.material) { o.material.opacity = 1 - ar; o.visible = ar < 0.995; } });
  const rise = tag === 'hook' ? bk(sm(T.asi - 0.2, T.asi + 0.45, t)) : ar;
  WHEEL.position.y = mx(-2.4, 2.35, rise); POINTER.visible = rise > 0.9; POINTER.position.y = WHEEL.position.y + 2.08;
  WHEEL.rotation.z = wheelAngle(t);
  WHEEL_FACE.material.emissiveIntensity = 0.05 + 0.13 * ar;
  rimBulbs.forEach((b, i) => { const on = ((i + Math.floor(t * 10)) % 4 === 0) ? 1 : 0.35; b.material.color.setRGB(1, 0.85, 0.55).multiplyScalar((0.3 + 2.6 * on) * ar + 0.2); });
  gridMat.opacity = 0.55 * ar; gridMat2.opacity = 0.35 * ar;
  spots.forEach((sp, i) => { sp.intensity = 60 * ar; sp.target.position.x = Math.sin(t * 0.8 + i * 2.1) * 2.5; });
  fillL.intensity = 2.5 * ar;
  hemi.intensity = mx(0.28, 0.5, ar); hemi.color.copy(C(0x8090b0)).lerp(C(0x9070ff), 0.5 * ar);
  lampL.intensity = 2.4;
  finMat.uniforms.uExp.value = mx(1.05, 0.9, ar);
  scene.fog.density = mx(0.035, 0.02, ar);
  // el opositor: estudia (cabeza abajo) o juega con el móvil
  const op = CR.op, A = op.userData.arms, H = op.userData.head;
  const phoneOn = !['hook', 'fomo'].includes(tag) || (tag === 'hook' && t > T.asi + 0.2);
  op.userData.phone.visible = phoneOn;
  if (phoneOn) { for (const [j, a] of A.entries()) { a.rotation.set(0.62, 0, 0.18 * (j ? -1 : 1)); a.userData.el.rotation.set(1.18, 0, 0); } H.rotation.set(-0.42, 0, 0); }
  else { for (const [j, a] of A.entries()) { const k = Math.max(0, Math.sin(t * 1.4 + j * 2)); a.rotation.set(0.45, 0, 0.1 * (j ? 1 : -1)); a.userData.el.rotation.set(1.2 + 0.3 * k * (j ? 1 : 0.2), 0, 0); } H.rotation.set(-0.55 + 0.05 * Math.sin(t * 0.7), 0.05 * Math.sin(t * 0.5), 0); }
  // los móviles de otros opositores (solo en el FOMO)
  PHONES.forEach((p, i) => { p.g.visible = tag === 'fomo'; p.m.opacity = tag === 'fomo' ? sm(T.otros2 - 0.4 + p.t * 1.1, T.otros2 - 0.25 + p.t * 1.1, t) : 0; p.g.position.y += 0; });
  DUST.u.uTime.value = t; DUST.mesh.visible = ar > 0.05;
}

// ------------------------------------------------------------------ capa 2D: el móvil con las grabaciones reales, el mapa de España y los rótulos
const GOLD2 = '#FFC83D', RED2 = '#FF4B3E', CYAN2 = '#48D6FF', GREEN2 = '#3EF08A', WHITE = '#F4F6F8', ORANGE = '#FF7A1A', PINK = '#FF3D7F';
function chip(x, y, text, col, a, s = 1, px = 56) {
  if (a <= 0.005) return;
  g.save(); g.font = `400 ${px}px Bebas`; const tw = g.measureText(text).width, w = tw + 60, hh = px * 1.45;
  const hw = Math.min(W2 / 2 - 10, w * s / 2 + 24);
  g.globalAlpha = a; g.translate(cl(x, hw, W2 - hw), cl(y, 470, H2 - 150)); g.scale(s, s);
  rr(-w / 2, -hh / 2, w, hh, hh / 2); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  txt(text, 0, px * 0.36, px, WHITE, 400, 'center', 'Bebas'); g.restore();
}
function bigText(lines, y, a, k = 1) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = a; g.translate(540, y); g.scale(k, k); g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 40;
  lines.forEach(([s, px, col], i) => txt(s, 0, i * px * 0.98, px, col, 400, 'center', 'Bebas')); g.restore();
}
function loadImg(src) { const im = new Image(); im.src = src; return im.decode().then(() => im); }
const REC = {};
const RECN = { rec_1vs1: 486, rec_ia: 816, rec_sim: 246, rec_grupo: 285 };
function recFrame(dir, i) {
  i = Math.max(1, Math.min(RECN[dir], Math.round(i)));
  REC[dir] = REC[dir] || new Map();
  if (!REC[dir].has(i)) REC[dir].set(i, loadImg(`../out/${dir}/r${String(i).padStart(4, '0')}.jpg`).catch(() => null));
  return REC[dir].get(i);
}
const PH = { x: 245, y: 440, w: 590, h: 1170, r: 72, bz: 16 }, PHS = 1.12, PHC = [540, 1025];
const SCR = { x: PH.x + PH.bz, y: PH.y + PH.bz, w: PH.w - 2 * PH.bz, h: PH.h - 2 * PH.bz };
function phoneIn(t) {
  const up1 = sm(T.giras - 0.1, T.giras + 0.25, t) * (1 - sm(T.solo - 0.35, T.solo - 0.05, t));
  const up2 = sm(T.preguntas - 0.1, T.preguntas + 0.25, t) * (1 - sm(T.mientras - 0.35, T.mientras - 0.05, t));
  return Math.max(up1, up2);
}
// qué enseña el móvil en cada momento: [carpeta, fotograma, recorte {x, y, w, h} en fracciones, zoom]
function phoneContent(t) {
  const s = curShot(t), d = shotEnd(s) - s.t0, u = pr(t, s.t0, d);
  if (s.tag === 'ruleta') return { dir: 'rec_1vs1', i: 30 * mx(1.0, 7.4, pr(t, s.t0 + 0.1, d * 0.9)) + 1 };
  if (s.tag === 'conv') {
    if (t < T.callejero - 0.15) return { dir: 'rec_sim', i: 30 * mx(0.2, 7.5, pr(t, s.t0, T.callejero - 0.15 - s.t0)) + 1, web: true };
    const k = pr(t, T.callejero - 0.15, shotEnd(s) - (T.callejero - 0.15));
    return k < 0.45 ? { dir: 'rec_grupo', i: 256, grupo: true } : { dir: 'rec_grupo', i: mx(16, 140, (k - 0.45) / 0.55), grupo: true };
  }
  if (s.tag === 'profeia') return { dir: 'rec_ia', i: 30 * mx(4.2, 26.8, pr(t, s.t0 + 0.05, d * 0.95)) + 1 };
  if (s.tag === 'herr') {
    if (t < T.ranking - 0.15) return { dir: 'rec_ia', i: 30 * mx(0.4, 1.62, pr(t, s.t0, T.ranking - 0.15 - s.t0)) + 1, menu: true };
    return { dir: 'rec_ia', i: 10, rank: pr(t, T.ranking - 0.15, 0.45) };
  }
  return null;
}
function drawShell(yOff) {
  g.save(); g.translate(0, yOff); g.shadowColor = 'rgba(0,0,0,0.65)'; g.shadowBlur = 60; g.shadowOffsetY = 20;
  rr(PH.x, PH.y, PH.w, PH.h, PH.r); g.fillStyle = '#0a0a0c'; g.fill(); g.restore();
}
function drawShellTop(yOff) {
  g.save(); g.translate(0, yOff);
  rr(PH.x, PH.y, PH.w, PH.h, PH.r); g.lineWidth = 5; g.strokeStyle = '#3a3d44'; g.stroke();
  rr(PH.x + 3, PH.y + 3, PH.w - 6, PH.h - 6, PH.r - 3); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.12)'; g.stroke();
  rr(540 - 70, PH.y + 26, 140, 34, 17); g.fillStyle = '#000'; g.fill(); g.restore();
}
async function drawPhone(t) {
  const a = phoneIn(t); if (a <= 0.001) return;
  const c = phoneContent(t) || phoneContent(Math.min(t, T.mientras - 0.4));
  const yOff = (1 - e3(a)) * 1500;
  g.save(); g.translate(PHC[0], PHC[1]); g.scale(PHS, PHS); g.translate(-PHC[0], -PHC[1]);
  drawShell(yOff);
  g.save(); g.translate(0, yOff); rr(SCR.x, SCR.y, SCR.w, SCR.h, PH.r - PH.bz); g.clip();
  g.fillStyle = '#0d0e11'; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
  const img = c ? await recFrame(c.dir, c.i) : null;
  if (img) {
    const sc = SCR.w / img.width, h = img.height * sc;
    if (c.web) {                                       // simulacro (web): ancho completo y ampliado en las convocatorias
      const z = 1.5, w2 = SCR.w * z, h2 = img.height * (w2 / img.width);
      g.drawImage(img, SCR.x - (w2 - SCR.w) * 0.12, SCR.y + 200, w2, h2);
      txt('SIMULACRO DE EXAMEN', SCR.x + 34, SCR.y + 150, 44, WHITE, 400, 'left', 'Bebas');
    } else if (c.rank !== undefined) {                 // perfil: zoom a NACIONAL #71 · HUESCA #3
      const z = 1 + 0.9 * e3(c.rank), cx = 0.5, cy = 0.525;
      const w2 = SCR.w * z, h2 = h * z, x0 = SCR.x + SCR.w / 2 - cx * w2, y0 = SCR.y + SCR.h / 2 - cy * h2;
      g.drawImage(img, x0, y0, w2, h2);
      const k = sm(0.6, 1, c.rank); if (k > 0) { g.save(); g.globalAlpha = k; rr(x0 + 0.115 * w2, y0 + 0.497 * h2, 0.77 * w2, 0.058 * h2, 18); g.lineWidth = 6; g.strokeStyle = ORANGE; g.stroke(); g.restore(); }
    } else {
      const top = (c.dir === 'rec_1vs1' || c.dir === 'rec_grupo') ? SCR.y - 60 : SCR.y + (SCR.h - h) / 2;
      g.drawImage(img, SCR.x, top, SCR.w, h);
      if (c.dir === 'rec_1vs1' || c.dir === 'rec_grupo') { g.fillStyle = '#0d0e11'; g.fillRect(SCR.x, SCR.y, SCR.w, 56); }
      if (c.dir === 'rec_1vs1') { const ny = top + 0.212 * h; rr(SCR.x + 110, ny - 22, 240, 40, 10); g.fillStyle = '#121316'; g.fill(); txt('RIVAL', SCR.x + 124, ny + 8, 28, 'rgba(255,255,255,0.8)', 400, 'left', 'Bebas'); }
      if (c.grupo && c.i === 256) {                    // tapar el logotipo del grupo y las fotos de los miembros
        rr(SCR.x + 0.03 * SCR.w, top + 0.155 * h, 0.18 * SCR.w, 0.09 * h, 16); g.fillStyle = '#1b1d22'; g.fill();
        txt('🚒', SCR.x + 0.12 * SCR.w, top + 0.215 * h, 54, WHITE, 400, 'center', 'sans-serif');
        rr(SCR.x + 0.56 * SCR.w, top + 0.152 * h, 0.24 * SCR.w, 0.045 * h, 12); g.fillStyle = '#16181c'; g.fill();
        const k = sm(T.callejero - 0.05, T.callejero + 0.25, t); if (k > 0) { g.save(); g.globalAlpha = k; rr(SCR.x + 0.375 * SCR.w, top + 0.268 * h, 0.2 * SCR.w, 0.032 * h, 14); g.lineWidth = 5; g.strokeStyle = ORANGE; g.stroke(); g.restore(); }
      }
      if (c.menu) { const k = sm(T.simulacros - 0.1, T.simulacros + 0.2, t), k0 = sm(T.flashcards - 0.05, T.flashcards + 0.2, t);
        if (k0 > 0) { g.save(); g.globalAlpha = k0; rr(SCR.x + SCR.w * 0.085, top + h * 0.395, SCR.w * 0.43, h * 0.15, 18); g.lineWidth = 5; g.strokeStyle = ORANGE; g.stroke(); g.restore(); }
        if (k > 0) { g.save(); g.globalAlpha = k; rr(SCR.x + SCR.w * 0.52, top + h * 0.395, SCR.w * 0.43, h * 0.15, 18); g.lineWidth = 5; g.strokeStyle = ORANGE; g.stroke(); g.restore(); } }
    }
  }
  g.restore();
  drawShellTop(yOff);
  g.restore();
}
// ---- el mapa de España (contorno simplificado; lon/lat) con puntos y duelos
const SPAIN = [[-8.87,41.87],[-8.15,42.07],[-7.70,41.88],[-7.20,41.88],[-6.55,41.95],[-6.20,41.58],[-6.85,41.00],[-6.80,40.35],[-7.00,39.70],[-7.50,39.65],[-7.30,39.45],[-7.00,39.10],[-7.20,38.75],[-7.30,38.45],[-7.00,38.20],[-7.50,37.55],[-7.40,37.18],
  [-6.95,37.20],[-6.40,36.80],[-6.30,36.53],[-6.03,36.18],[-5.60,36.01],[-5.35,36.15],[-4.90,36.48],[-4.42,36.72],[-3.75,36.73],[-2.95,36.73],[-2.45,36.83],[-2.19,36.72],[-1.90,37.10],[-1.65,37.40],[-0.98,37.58],[-0.72,37.62],[-0.80,37.85],[-0.50,38.34],[0.21,38.73],[-0.10,38.95],[-0.33,39.47],[-0.05,39.98],[0.35,40.40],[0.87,40.70],[1.25,41.12],[2.17,41.38],[2.80,41.70],[3.20,41.90],[3.32,42.32],[3.15,42.43],
  [2.70,42.40],[1.95,42.45],[1.45,42.60],[0.70,42.85],[0.00,42.70],[-0.75,42.85],[-1.40,43.05],[-1.79,43.37],[-2.00,43.32],[-2.70,43.42],[-2.93,43.37],[-3.80,43.47],[-4.50,43.40],[-5.65,43.55],[-5.85,43.66],[-6.55,43.56],[-7.05,43.55],[-7.69,43.78],[-8.25,43.55],[-8.40,43.37],[-8.95,43.25],[-9.27,42.90],[-9.00,42.55],[-8.85,42.25]];
const ISLES = [[[2.35,39.55],[2.65,39.95],[3.15,39.95],[3.48,39.70],[3.20,39.30],[2.75,39.40]], [[3.80,39.95],[4.30,39.85],[4.20,40.05],[3.85,40.05]], [[1.20,38.95],[1.45,38.90],[1.60,39.05],[1.35,39.12]]];
const CITIES = [['MADRID',-3.70,40.42],['BARCELONA',2.17,41.39],['VALENCIA',-0.38,39.47],['SEVILLA',-5.98,37.39],['MÁLAGA',-4.42,36.72],['BILBAO',-2.93,43.26],['ZARAGOZA',-0.89,41.65],['A CORUÑA',-8.41,43.36],['MURCIA',-1.13,37.99],['VALLADOLID',-4.72,41.65],['GRANADA',-3.60,37.18],['ALBACETE',-1.86,38.99],['HUESCA',-0.41,42.14],['CIUDAD REAL',-3.93,38.99],['OVIEDO',-5.85,43.36],['BADAJOZ',-6.97,38.88],['ALICANTE',-0.48,38.35],['CÓRDOBA',-4.78,37.89],['SALAMANCA',-5.66,40.97],['PAMPLONA',-1.64,42.81],['TOLEDO',-4.03,39.86],['CÁCERES',-6.37,39.47],['LEÓN',-5.57,42.60],['LOGROÑO',-2.45,42.47],['SANTANDER',-3.80,43.46],['PALMA',2.65,39.57],['JAÉN',-3.79,37.77],['ALMERÍA',-2.46,36.84],['TARRAGONA',1.25,41.12],['GIRONA',2.82,41.98],['LLEIDA',0.62,41.62],['CASTELLÓN',-0.05,39.99],['CUENCA',-2.13,40.07],['BURGOS',-3.70,42.34],['HUELVA',-6.95,37.26],['CÁDIZ',-6.29,36.53],['LUGO',-7.56,43.01],['VIGO',-8.72,42.24],['VITORIA',-2.67,42.85],['SAN SEBASTIÁN',-1.98,43.32]];
const DUELS = [[0, 3], [1, 2], [5, 4], [7, 8], [12, 13], [9, 10], [6, 16], [14, 17], [19, 20], [25, 11]];
const MAPK = 88, MAPC = [540, 1130];
const proj = (lon, lat) => [MAPC[0] + (lon + 2.9) * MAPK * Math.cos(40 * Math.PI / 180), MAPC[1] - (lat - 40.0) * MAPK];
function drawMap(t, a) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = a;
  const path = (pts) => { g.beginPath(); pts.forEach(([lo, la], i) => { const [x, y] = proj(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
  path(SPAIN); g.fillStyle = 'rgba(20,24,34,0.92)'; g.fill(); g.lineWidth = 5; g.strokeStyle = CYAN2; g.shadowColor = CYAN2; g.shadowBlur = 24; g.stroke(); g.shadowBlur = 0;
  ISLES.forEach(p => { path(p); g.fill(); g.lineWidth = 3; g.stroke(); });
  // rejilla dentro del mapa
  g.save(); path(SPAIN); g.clip(); g.strokeStyle = 'rgba(72,214,255,0.08)'; g.lineWidth = 2; for (let x = 0; x < 1080; x += 36) { g.beginPath(); g.moveTo(x, 600); g.lineTo(x, 1600); g.stroke(); } for (let y = 600; y < 1600; y += 36) { g.beginPath(); g.moveTo(0, y); g.lineTo(1080, y); g.stroke(); } g.restore();
  // puntos que se encienden (opositores conectados)
  const t0 = T.directo - 0.3;
  CITIES.forEach(([n, lo, la], i) => {
    const k = sm(t0 + i * 0.03, t0 + i * 0.03 + 0.2, t); if (k <= 0) return;
    const [x, y] = proj(lo, la), ph = (t * 1.5 + i * 0.37) % 1;
    g.beginPath(); g.arc(x, y, 6 + 20 * ph, 0, 7); g.strokeStyle = `rgba(255,122,26,${(1 - ph) * 0.6 * k})`; g.lineWidth = 3; g.stroke();
    g.beginPath(); g.arc(x, y, 7 * k, 0, 7); g.fillStyle = ORANGE; g.shadowColor = ORANGE; g.shadowBlur = 16; g.fill(); g.shadowBlur = 0;
  });
  // duelos entre ciudades (arcos que se dibujan)
  DUELS.forEach(([i, j], n) => {
    const k = cl((t - (T.directo + 0.15 + n * 0.09)) / 0.4); if (k <= 0) return;
    const [x1, y1] = proj(CITIES[i][1], CITIES[i][2]), [x2, y2] = proj(CITIES[j][1], CITIES[j][2]);
    const mx_ = (x1 + x2) / 2, my_ = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.3;
    g.beginPath(); for (let s2 = 0; s2 <= 24 * k; s2++) { const u = s2 / 24, x = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx_ + u * u * x2, y = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my_ + u * u * y2; s2 ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.strokeStyle = n % 2 ? PINK : GOLD2; g.lineWidth = 4; g.shadowColor = g.strokeStyle; g.shadowBlur = 14; g.stroke(); g.shadowBlur = 0;
    if (k >= 1) { const pop = 1 + 0.35 * Math.exp(-Math.pow((t - (T.directo + 0.55 + n * 0.09)) / 0.1, 2)); g.save(); g.translate(mx_, my_ + Math.hypot(x2 - x1, y2 - y1) * 0.15); g.scale(pop, pop); rr(-34, -20, 68, 40, 20); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill(); g.strokeStyle = g.fillStyle; txt('VS', 0, 12, 34, WHITE, 400, 'center', 'Bebas'); g.restore(); }
  });
  g.restore();
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const s = curShot(t), tag = s.tag;
  // gancho
  const hk = sm(T.asi - 0.1, T.asi + 0.2, t) * (1 - sm(T.giras - 0.3, T.giras - 0.1, t));
  bigText([['¿Y SI PREPARAR TU OPOSICIÓN', 92, WHITE], ['FUERA ASÍ?', 170, GOLD2]], 1380, hk, 0.8 + 0.2 * bk(cl(hk * 1.2)));
  await drawPhone(t);
  if (tag === 'ruleta') { chip(540, 1765, 'RULETA DEL TEMARIO', ORANGE, sm(T.giras, T.giras + 0.25, t), 0.95, 52); chip(540, 1765, 'TÚ CONTRA OTROS OPOSITORES', PINK, 0, 0.95, 52); }
  // modos + mapa
  if (tag === 'modos') {
    [['SOLO', T.solo, CYAN2], ['1 VS 1', T.uno1, ORANGE], ['EN DIRECTO', T.directo, RED2]].forEach(([w, tt, col], i) => chip(220 + i * 320, 560, w, col, sm(tt - 0.1, tt + 0.15, t), 1.0 + 0.25 * Math.exp(-Math.pow((t - tt - 0.05) / 0.1, 2)), 58));
    drawMap(t, sm(T.directo - 0.35, T.directo - 0.05, t));
    chip(540, 1700, 'OPOSITORES DE TODA ESPAÑA', GOLD2, sm(T.espana - 0.2, T.espana + 0.1, t), 1.0, 54);
  }
  if (tag === 'conv') { chip(540, 1765, t < T.callejero - 0.15 ? 'CONVOCATORIAS REALES' : 'CALLEJERO DE TU ZONA', t < T.callejero - 0.15 ? ORANGE : CYAN2, sm(T.convocatorias - 0.15, T.convocatorias + 0.1, t), 0.95, 52); }
  if (tag === 'profeia') { chip(540, 1765, t < T.manual - 0.1 ? 'PROFE IA' : 'TE DICE EL MANUAL Y LA PÁGINA', CYAN2, sm(T.profe - 0.15, T.profe + 0.1, t), 0.95, 52); }
  if (tag === 'herr') { chip(540, 1765, t < T.ranking - 0.15 ? (t < T.simulacros - 0.1 ? 'FLASHCARDS' : 'SIMULACROS DE EXAMEN') : 'RANKING NACIONAL Y PROVINCIAL', GOLD2, sm(T.flashcards - 0.1, T.flashcards + 0.15, t), 0.95, 52); }
  // FOMO
  if (tag === 'fomo') {
    bigText([['MIENTRAS TÚ', 110, WHITE], ['ESTUDIAS SOLO…', 110, WHITE]], 1300, sm(T.mientras, T.mientras + 0.25, t) * (1 - sm(T.otros2 - 0.25, T.otros2 - 0.05, t)));
    bigText([['…OTROS YA ESTÁN', 104, WHITE], ['ENTRENANDO ASÍ', 128, GOLD2]], 1300, sm(T.otros2 - 0.05, T.otros2 + 0.2, t));
  }
  // lema
  if (tag === 'lema') {
    bigText([['NO ES UN JUEGO.', 120, WHITE]], 1250, sm(T.nojuego - 0.05, T.nojuego + 0.2, t));
    bigText([['ES LO QUE TE VA', 100, WHITE], ['A DAR LA PLAZA', 138, GOLD2]], 1420, sm(T.dar - 0.4, T.dar - 0.1, t), 1 + 0.12 * Math.exp(-Math.pow((t - T.plaza - 0.1) / 0.12, 2)));
  }
  const tv = sm(T.retarias - 0.1, T.retarias + 0.2, t) * (1 - sm(T.fin - 0.3, T.fin, t));
  if (tv > 0) { chip(540, 1250, '¿A QUIÉN RETARÍAS PRIMERO?', GOLD2, tv, 1.1, 66); chip(540, 1420, 'ESCRÍBELO EN COMENTARIOS', WHITE, tv * sm(T.escribelo - 0.1, T.escribelo + 0.2, t), 1.0, 56); }
  share(t);
  closing(t);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.01)'; g.fillRect(0, 0, 2, 2);
}

// ------------------------------------------------------------------ fotograma
function subframes(t) {
  const s = curShot(t);
  if (Math.abs(t - s.t0) < 1 / 50) return 1;
  const a = camAt(Math.max(s.t0, t - 1 / 240)), b = camAt(t + 1 / 240);
  const ang2 = a.q.angleTo(b.q), mv = a.p.distanceTo(b.p) / Math.max(0.5, (a.focus + b.focus) / 2);
  return Math.max(1, Math.min(4, Math.ceil((ang2 + mv) * H2 / (a.fov * Math.PI / 180) / 22)));
}
window.renderAt = async t => {
  const N = window.FAST ? 1 : subframes(t);
  const s0 = curShot(t);
  renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < N; k++) {
    let tk = N === 1 ? t : t + (k / (N - 1) - 0.5) / 120;
    if (curShot(tk) !== s0) tk = Math.max(s0.t0, Math.min(tk, shotEnd(s0) - 1e-4));
    update(tk);
    composer.render();
    accMat.uniforms.tSrc.value = composer.readBuffer.texture; accMat.uniforms.uW.value = 1 / N;
    renderer.setRenderTarget(accRT); renderer.autoClear = false; renderer.render(accScene, quadCam); renderer.autoClear = true;
  }
  if (N > 1) update(t);
  finMat.uniforms.tSrc.value = accRT.texture; finMat.uniforms.uTime.value = t;
  const glitch = (t > 0.55 && t < 0.63) || (t > 0.72 && t < 0.78) ? 1 : 0;
  finMat.uniforms.uFlash.value = Math.max(Math.exp(-Math.pow((t - T.asi - 0.02) / 0.07, 2)) * 0.35, 0.18 * glitch, Math.exp(-Math.pow((t - T.plaza - 0.05) / 0.08, 2)) * 0.3);
  finMat.uniforms.uFlashCol.value.setRGB(1, 0.7, 0.35);
  const ph = Math.max(phoneIn(t), curShot(t).tag === 'modos' ? 0.8 : 0);
  finMat.uniforms.uDim.value = mx(1, 0.45, ph) * (t >= T.fin ? mx(1, 0.5, sm(T.compartir - 0.2, T.compartir + 0.3, t)) : 1) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.004 * glitch + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  await overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 3.0);

(async () => {
  try {
    while (!_r2d) await new Promise(r => setTimeout(r, 30));
    await document.fonts.ready;
    NOISE = noiseTex(); mats();
    setupTimes(); buildWorld();
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'fomo: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
