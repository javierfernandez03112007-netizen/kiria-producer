// «Cada minuto cuenta» (Bomberados, idea de Adrián: «LUNES 9 AUTOBUS»): el opositor que estudia esperando el autobús.
// Motor de projects/bomberados_guardia/web/guardia.js (luz y cielo según la hora, ciudad, dotación «de calle»), parada de
// autobús con panel de minutos, tráfico, el autobús que llega, y el MÓVIL en primer plano: grabaciones REALES de la app
// (menú «Bomberados PRO» y partida 1 vs 1: out/rec_menu, out/rec_1vs1, 30 fps) y la recreación de flashcards y reto diario.
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
// Una calle a lo largo de X (calzada z ∈ [−6, 6]), la parada en la acera sur (z ≈ 7,6) y el autobús por el carril bus (z ≈ 4,35).
const world = new THREE.Group(); scene.add(world);
cam.far = 900; cam.updateProjectionMatrix();
const C = (hex) => new THREE.Color(hex);
let hemi, sun, sky, moon, BUS;
const facades = [], lamps = [], GR = {}, CR = {}, CARS = [];
const LINE = () => new THREE.MeshBasicMaterial({ color: 0xd2d2ca });
function put(geo, mat, x, y, z, parent = world) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
function yawTo(o, x, z) { o.rotation.y = Math.atan2(-(x - o.position.x), -(z - o.position.z)); return o; }   // personas: el frente mira a −Z

// ------------------------------------------------------------------ edificios, farolas, árboles y coches (de guardia.js)
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

// ------------------------------------------------------------------ cielo: estrellas, luna y cúpula con degradado (de guardia.js)
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

// ------------------------------------------------------------------ luz según la hora (de guardia.js)
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

// ------------------------------------------------------------------ el opositor (de «calle», con mochila) — de guardia.js, con cabeza que se inclina y móvil
let crewWord = null;
function makeCrew(o = {}) {
  const G = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: o.shirt ?? 0x1d2944, roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: o.pants ?? 0x161b26, roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: o.skin ?? 0xd0a07c, roughness: 0.62 });
  const hairM = new THREE.MeshStandardMaterial({ color: o.hair ?? 0x2b1e15, roughness: 0.8 });
  const P = (geo, mat, x, y, z, parent = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const hipY = 0.9, legs = [], arms = [];
  for (const s of [-1, 1]) {
    const hp = new THREE.Group(); hp.position.set(0.1 * s, hipY, 0); G.add(hp); legs.push(hp);
    P(new THREE.CapsuleGeometry(0.083, 0.66, 6, 12), pants, 0, -0.42, 0, hp);
    P(new RoundedBoxGeometry(0.12, 0.1, 0.28, 2, 0.035), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 }), 0, -0.85, -0.04, hp);   // zapatillas
  }
  P(new RoundedBoxGeometry(0.46, 0.6, 0.28, 4, 0.11), shirt, 0, hipY + 0.31, 0);                 // sudadera
  P(new THREE.TorusGeometry(0.1, 0.035, 8, 20), shirt, 0, hipY + 0.6, 0.06).rotation.x = Math.PI / 2;   // capucha caída
  const head = new THREE.Group(); head.position.set(0, hipY + 0.64, 0); G.add(head);
  P(new THREE.CylinderGeometry(0.055, 0.065, 0.09, 14), skin, 0, 0.0, 0, head);
  P(new THREE.SphereGeometry(0.11, 24, 18), skin, 0, 0.15, 0, head).scale.set(0.95, 1.08, 1);
  P(new THREE.SphereGeometry(0.117, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 0.17, 0.012, head);
  for (const s of [-1, 1]) P(new THREE.SphereGeometry(0.016, 8, 6), M.black, 0.04 * s, 0.165, -0.102, head);
  for (const s of [-1, 1]) P(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.4 }), 0.115 * s, 0.13, 0.0, head);   // cascos de música
  P(new THREE.TorusGeometry(0.12, 0.012, 6, 24, Math.PI), M.black, 0, 0.17, 0, head).rotation.y = Math.PI / 2;
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0.27 * s, hipY + 0.54, 0); G.add(p); arms.push(p);
    P(new THREE.CapsuleGeometry(0.062, 0.16, 6, 12), shirt, 0, -0.12, 0, p);
    const e = new THREE.Group(); e.position.set(0, -0.27, 0); p.add(e); p.userData.el = e;
    P(new THREE.CapsuleGeometry(0.052, 0.17, 6, 12), shirt, 0, -0.1, 0, e);
    P(new THREE.SphereGeometry(0.05, 12, 10), skin, 0, -0.26, 0, e);
  }
  // reloj en la muñeca izquierda
  P(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), M.black, 0, -0.2, -0.05, arms[0].userData.el).rotation.x = Math.PI / 2;
  P(new RoundedBoxGeometry(0.34, 0.44, 0.17, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.8 }), 0, hipY + 0.32, 0.22);   // mochila
  if (!crewWord) crewWord = canvasTex(512, 96, (x) => { x.font = '400 84px Bebas'; x.textAlign = 'center'; x.fillStyle = '#ff8a2a'; x.fillText('OPOSITOR', 256, 80); });
  // el móvil delante del pecho (se ve cuando lo usa)
  const ph = new THREE.Group(); ph.position.set(0.0, hipY + 0.36, -0.3); ph.rotation.x = -0.95; G.add(ph);
  P(new RoundedBoxGeometry(0.078, 0.16, 0.01, 2, 0.006), M.black, 0, 0, 0, ph);
  const sm_ = new THREE.MeshBasicMaterial({ color: 0x888888 }); new THREE.TextureLoader().load('../out/rec_menu/r0050.jpg', tx => { tx.colorSpace = THREE.SRGBColorSpace; sm_.map = tx; sm_.needsUpdate = true; });
  const scr = P(new THREE.PlaneGeometry(0.07, 0.148), sm_, 0, 0, -0.0055, ph); scr.rotation.y = Math.PI;
  G.userData = { arms, legs, head, phone: ph, screen: scr, hipY };
  return G;
}
function crewAt(x, z, lx, lz, o, parent = world) { const c = makeCrew(o); c.position.set(x, 0, z); yawTo(c, lx, lz); parent.add(c); return c; }

// ------------------------------------------------------------------ el autobús urbano (+X hacia delante, puertas a la derecha = +Z)
function makeBus() {
  const g = new THREE.Group();
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf1f1ec, roughness: 0.35, clearcoat: 0.6 });
  const red = new THREE.MeshPhysicalMaterial({ color: 0xc8202a, roughness: 0.4, clearcoat: 0.6 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0c1218, roughness: 0.05, metalness: 0.5, clearcoat: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.6 });
  put(new RoundedBoxGeometry(12, 2.8, 2.55, 4, 0.2), white, 0, 1.78, 0, g);
  put(new THREE.BoxGeometry(12.04, 0.34, 2.58), red, 0, 0.66, 0, g);
  put(new THREE.BoxGeometry(12.04, 0.08, 2.58), red, 0, 1.42, 0, g);
  for (const s of [-1, 1]) put(new THREE.BoxGeometry(10.6, 1.1, 0.03), glass, -0.4, 2.2, s * 1.28, g);
  put(new THREE.BoxGeometry(0.03, 1.75, 2.35), glass, 6.0, 2.05, 0, g);
  put(new THREE.BoxGeometry(0.03, 0.34, 1.9), dark, 6.01, 3.0, 0, g);
  const led = canvasTex(512, 96, (x) => { x.fillStyle = '#0b0b0b'; x.fillRect(0, 0, 512, 96); x.font = '400 78px Bebas'; x.fillStyle = '#ffb21e'; x.fillText('7', 24, 78); x.fillText('CENTRO', 120, 78); });
  const ledM = new THREE.MeshBasicMaterial({ map: led }); ledM.color.setScalar(1.6);
  const lf = put(new THREE.PlaneGeometry(1.86, 0.32), ledM, 6.03, 3.0, 0, g); lf.rotation.y = Math.PI / 2;
  // puertas (delantera en x = +4,6; central en x = −0,6): dos hojas de cristal que se abren hacia fuera
  const doors = [];
  for (const dx of [4.6, -0.6]) {
    put(new THREE.BoxGeometry(1.3, 2.3, 0.04), dark, dx, 1.55, 1.27, g);
    for (const s of [-1, 1]) { const d = put(new THREE.BoxGeometry(0.62, 2.18, 0.05), glass, dx + s * 0.32, 1.55, 1.3, g); doors.push({ m: d, x0: dx + s * 0.32, s }); }
  }
  for (const x of [3.9, -3.3]) for (const z of [-1.1, 1.1]) {
    put(new THREE.CylinderGeometry(0.5, 0.5, 0.34, 28), M.rubber, x, 0.5, z, g).rotation.x = Math.PI / 2;
    put(new THREE.CylinderGeometry(0.3, 0.3, 0.36, 20), M.chrome, x, 0.5, z, g).rotation.x = Math.PI / 2;
  }
  for (const z of [-0.9, 0.9]) { const hl = put(new THREE.BoxGeometry(0.05, 0.2, 0.42), new THREE.MeshBasicMaterial({ color: 0xffffff }), 6.02, 0.95, z, g); hl.material.color.setScalar(2.0); }
  const side = canvasTex(1024, 128, (x) => { x.fillStyle = '#c8202a'; x.fillRect(0, 0, 1024, 128); x.font = '400 92px Bebas'; x.fillStyle = '#ffffff'; x.fillText('AUTOBUSES URBANOS · LÍNEA 7', 30, 100); });
  for (const s of [-1, 1]) { const p = put(new THREE.PlaneGeometry(6.0, 0.36), new THREE.MeshBasicMaterial({ map: side }), -2.4, 1.0, s * 1.3, g); if (s < 0) p.rotation.y = Math.PI; }
  world.add(g);
  g.userData.doors = doors;
  return g;
}

// ------------------------------------------------------------------ la calle y la parada
const STOP = V(0, 0, 7.6), WHO = V(0.95, 0, 6.75), BUS_Z = 4.35, BUS_STOP_X = WHO.x - 4.6;
let ledTex, ledCv, ledLast = '';
function drawLed(a, b) {
  const s = a + '|' + b; if (s === ledLast) return; ledLast = s;
  const x = ledCv.getContext('2d'); x.fillStyle = '#080808'; x.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 1024; i += 8) for (let j = 0; j < 256; j += 8) { x.fillStyle = 'rgba(255,170,30,0.06)'; x.fillRect(i + 2, j + 2, 4, 4); }
  x.fillStyle = '#ffb21e'; x.shadowColor = '#ff9a10'; x.shadowBlur = 18;
  x.font = '400 110px Bebas'; x.textAlign = 'left'; x.fillText(a, 40, 112);
  x.font = '400 150px Bebas'; x.textAlign = 'right'; x.fillText(b, 990, 220);
  ledTex.needsUpdate = true;
}
function buildStreet() {
  const walk = new THREE.MeshStandardMaterial({ color: 0xb3ada2, roughness: 0.9 });
  put(new THREE.BoxGeometry(300, 0.15, 5), walk, 0, 0.075, 8.5); put(new THREE.BoxGeometry(300, 0.15, 5), walk, 0, 0.075, -8.5);
  put(new THREE.BoxGeometry(300, 0.16, 0.22), new THREE.MeshStandardMaterial({ color: 0x8c8880, roughness: 0.8 }), 0, 0.08, 6.0);
  for (let i = 0; i < 60; i++) put(new THREE.BoxGeometry(2.6, 0.012, 0.15), LINE(), -150 + i * 5.2, 0.012, 0);
  for (let i = 0; i < 60; i++) { put(new THREE.BoxGeometry(2.6, 0.012, 0.12), LINE(), -150 + i * 5.2, 0.012, 3.0); put(new THREE.BoxGeometry(2.6, 0.012, 0.12), LINE(), -150 + i * 5.2, 0.012, -3.0); }
  // carril bus con su rótulo
  put(new THREE.BoxGeometry(300, 0.011, 0.25), new THREE.MeshBasicMaterial({ color: 0xe8e8e0 }), 0, 0.013, 3.2);
  const busTxt = canvasTex(512, 160, (x) => { x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, 512, 160); x.font = '400 150px Bebas'; x.textAlign = 'center'; x.fillStyle = '#ecece4'; x.fillText('BUS', 256, 140); });
  for (const bx of [-30, 18]) { const p = put(new THREE.PlaneGeometry(3.4, 1.05), new THREE.MeshBasicMaterial({ map: busTxt, transparent: true }), bx, 0.016, 4.5); p.rotation.set(-Math.PI / 2, 0, Math.PI / 2); }
  for (let i = 0; i < 26; i++) { const x = -140 + i * 11; cityBld(10, 13 + rnd(i * 2.3) * 15, 10, x, -16, 200 + i); cityBld(10, 11 + rnd(i * 4.1) * 13, 10, x, 16, 240 + i, Math.PI); }
  for (let k = 0; k < 13; k++) { const x = -132 + k * 22; tree(x, -7.6, 0.95); if (Math.abs(x + 11) > 6) tree(x + 11, 9.4, 0.95); lamp(x + 11, -6.6); if (Math.abs(x) > 5) lamp(x, 6.6); }
  // la marquesina
  const frame = new THREE.MeshStandardMaterial({ color: 0x2b2f36, metalness: 0.6, roughness: 0.4 });
  const glassP = new THREE.MeshPhysicalMaterial({ color: 0xbfd6e6, roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.22, metalness: 0.1 });
  const S = STOP;
  put(new THREE.BoxGeometry(4.4, 0.12, 1.9), frame, S.x, 2.62, S.z - 0.05);
  for (const x of [-2.1, 2.1]) put(new THREE.BoxGeometry(0.09, 2.6, 0.09), frame, S.x + x, 1.3, S.z + 0.75);
  for (const x of [-2.1, 2.1]) put(new THREE.BoxGeometry(0.09, 2.6, 0.09), frame, S.x + x, 1.3, S.z - 0.6);
  const back = put(new THREE.BoxGeometry(4.2, 2.2, 0.03), glassP, S.x, 1.35, S.z + 0.75); back.castShadow = false;
  const sideP = put(new THREE.BoxGeometry(0.03, 2.2, 1.3), glassP, S.x + 2.1, 1.35, S.z + 0.08); sideP.castShadow = false;
  put(new THREE.BoxGeometry(2.4, 0.06, 0.42), new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.6 }), S.x - 0.6, 0.52, S.z + 0.45);
  for (const x of [-1.6, 0.4]) put(new THREE.BoxGeometry(0.06, 0.5, 0.36), frame, S.x + x, 0.27, S.z + 0.45);
  // el anuncio de Bomberados (iluminado) en el lado izquierdo de la marquesina, mirando a la calle
  const ad = canvasTex(512, 900, (x) => {
    const gr = x.createLinearGradient(0, 0, 0, 900); gr.addColorStop(0, '#120806'); gr.addColorStop(1, '#2a0d06'); x.fillStyle = gr; x.fillRect(0, 0, 512, 900);
    for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,${120 + rnd(i) * 80},30,${0.15 + rnd(i * 3) * 0.3})`; x.beginPath(); x.arc(rnd(i * 7) * 512, 900 - rnd(i * 5) * 420, 2 + rnd(i * 9) * 5, 0, 7); x.fill(); }
    x.textAlign = 'center'; x.font = '400 120px Bebas'; x.fillStyle = '#FFC83D'; x.fillText('BOMBERADOS', 256, 360);
    x.font = '400 54px Bebas'; x.fillStyle = '#ffffff'; x.fillText('FALLA EN CASA,', 256, 470); x.fillText('NO EN EL EXAMEN', 256, 530);
    x.fillStyle = '#FF7A1A'; x.fillRect(96, 640, 320, 6);
  });
  const adM = new THREE.MeshStandardMaterial({ map: ad, emissiveMap: ad, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.3 });
  const adP = put(new THREE.PlaneGeometry(1.1, 1.95), adM, S.x - 1.45, 1.35, S.z + 0.72); adP.rotation.y = Math.PI;
  // panel de minutos colgado del techo
  ledCv = document.createElement('canvas'); ledCv.width = 1024; ledCv.height = 256;
  ledTex = new THREE.CanvasTexture(ledCv); ledTex.colorSpace = THREE.SRGBColorSpace; ledTex.anisotropy = 4;
  put(new THREE.BoxGeometry(1.5, 0.42, 0.1), M.black, S.x + 0.6, 2.32, S.z - 0.82);
  const lm = new THREE.MeshBasicMaterial({ map: ledTex }); lm.color.setScalar(1.7);
  const lp = put(new THREE.PlaneGeometry(1.4, 0.35), lm, S.x + 0.6, 2.32, S.z - 0.875); lp.rotation.y = Math.PI;
  drawLed('LÍNEA 7 · CENTRO', '12 MIN');
  // poste con la señal de la parada
  put(new THREE.CylinderGeometry(0.04, 0.04, 3.0, 10), frame, S.x + 3.0, 1.5, S.z - 1.0);
  const sg = canvasTex(256, 256, (x) => { x.fillStyle = '#1f5fbf'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#fff'; x.font = '400 150px Bebas'; x.textAlign = 'center'; x.fillText('BUS', 128, 175); });
  const sgp = put(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshStandardMaterial({ map: sg, roughness: 0.5 }), S.x + 3.0, 2.85, S.z - 1.03); sgp.rotation.y = Math.PI;
  // el opositor y el autobús
  CR.op = crewAt(WHO.x, WHO.z, WHO.x - 0.4, WHO.z - 5, { skin: 0xd6a582, hair: 0x2a1a10, shirt: 0x2f5aa8, pants: 0x27324a });
  BUS = makeBus(); BUS.position.set(-90, 0, BUS_Z);
  // tráfico: coches en los cuatro carriles
  const cols = [0xd8d8d0, 0x2a5ad0, 0x3c3c40, 0xa01818, 0x2f6a3a, 0xe0b020, 0x6a6f78, 0xf2f2ee];
  for (let i = 0; i < 20; i++) {
    const lane = [-4.4, -1.6, 1.6, 4.4][i % 4], dir = lane < 0 ? -1 : 1;
    const c = makeCar(cols[i % cols.length]); c.rotation.y = dir > 0 ? 0 : Math.PI;
    CARS.push({ c, lane, dir, x0: -150 + rnd(i * 3.7) * 300, v: 9 + rnd(i * 5.1) * 4 });
  }
}

function buildWorld() {
  LEAF = new THREE.MeshStandardMaterial({ color: 0x4d7a3a, roughness: 0.9, flatShading: true });
  LEAF2 = new THREE.MeshStandardMaterial({ color: 0x5d8a42, roughness: 0.9, flatShading: true });
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#1b1c20'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 22 + rnd(i) * 28; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(160, 160);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ map: asph, color: 0xa4a4a4, roughness: 0.75, metalness: 0.05 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
  hemi = new THREE.HemisphereLight(0x9ab8e0, 0x2a2018, 0.6); world.add(hemi);
  sun = new THREE.DirectionalLight(0xfff2dd, 1.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 320 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  world.add(sun); world.add(sun.target);
  makeSky();
  buildStreet();
}

// ------------------------------------------------------------------ planos
let T = {}, SH = [];
function shot(t0, a, b, tag, o = {}) { SH.push({ t0, a, b, tag, ...o }); }
const PHONE_TAGS = ['menu', 'flash1', 'flash2', 'reto', 'duelo'];
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  SH = [];
  shot(0, [0.6, 2.25, 2.4, 0.6, 2.32, 6.72, 36], [2.2, 1.5, 0.4, 0.7, 1.35, 6.8, 46], 'hook');
  shot(T.l2 - 0.1, [2.6, 1.5, 4.2, 0.9, 1.25, 6.7, 42], [2.3, 1.45, 4.5, 0.9, 1.25, 6.7, 40], 'saca');
  shot(T.abres - 0.15, [-2.6, 1.5, 3.2, 0.9, 1.35, 6.8, 46], [-1.9, 1.6, 3.6, 0.9, 1.35, 6.8, 46], 'menu');
  shot(T.cuantos - 0.1, [-1.9, 1.6, 3.6, 0.9, 1.35, 6.8, 46], [-1.2, 1.7, 4.0, 0.9, 1.35, 6.8, 46], 'flash1');
  shot(T.tetraedro - 0.1, [-1.2, 1.7, 4.0, 0.9, 1.35, 6.8, 46], [-0.5, 1.75, 4.3, 0.9, 1.35, 6.8, 46], 'flash2');
  shot(T.l6 - 0.1, [-0.7, 1.95, 4.3, 0.45, 2.2, 7.0, 40], [-0.4, 1.9, 4.75, 0.5, 2.2, 7.0, 38], 'espera');
  shot(T.reto - 0.25, [3.4, 1.5, 3.4, 0.9, 1.35, 6.8, 46], [2.8, 1.55, 3.8, 0.9, 1.35, 6.8, 46], 'reto');
  shot(T.l7 - 0.1, [2.8, 1.55, 3.8, 0.9, 1.35, 6.8, 46], [2.0, 1.6, 4.1, 0.9, 1.35, 6.8, 46], 'duelo');
  shot(T.llega - 0.1, [-10.5, 1.5, 9.4, 0.6, 1.6, 5.2, 44], [-9.5, 1.55, 9.2, 0.6, 1.6, 5.2, 44], 'bus');
  shot(T.l9 - 0.1, [7.0, 2.0, -7.6, -1.5, 1.9, 5.0, 46], [5.5, 2.6, -8.0, -0.5, 2.0, 5.5, 48], 'sube');
  shot(T.esperas - 0.1, [0.6, 1.5, 1.4, 0.3, 1.8, 7.2, 46], [0.6, 1.6, 2.2, 0.3, 1.9, 7.2, 44], 'vacia');
  shot(T.compartir - 0.3, [0.6, 1.6, 2.2, 0.3, 1.9, 7.2, 44], [0.6, 3.2, -1.0, 0.3, 1.9, 7.2, 46], 'fin');
}
function curShot(t) { let s = SH[0]; for (const x of SH) if (t >= x.t0) s = x; return s; }
function shotEnd(s) { const i = SH.indexOf(s); return i + 1 < SH.length ? SH[i + 1].t0 : T.end; }
const _m = new THREE.Matrix4();
function pose(p, tgt, fov) { _m.lookAt(p, tgt, V(0, 1, 0)); return { p: p.clone(), q: new THREE.Quaternion().setFromRotationMatrix(_m), fov, focus: p.distanceTo(tgt), ap: 0, tgt }; }
function camAt(t) {
  const s = curShot(t), k = pr(t, s.t0, shotEnd(s) - s.t0), u = s.tag === 'hook' ? e5(k) : e3(k) * 0.8 + k * 0.2;
  const v = s.a.map((a, i) => mx(a, s.b[i], u));
  return pose(V(v[0], v[1] + 0.02 * Math.sin(t * 1.3), v[2]), V(v[3], v[4], v[5]), v[6]);
}
// el autobús: llega (frena), abre, espera, cierra y se va
function busX(t) {
  const a = T.llega - 0.3, stop = a + 1.7, go = T.l9 + 1.45;
  if (t < a) return -90;
  if (t < stop) { const u = pr(t, a, stop - a); return mx(-48, BUS_STOP_X, 1 - Math.pow(1 - u, 2.4)); }
  if (t < go) return BUS_STOP_X;
  const u = t - go; return BUS_STOP_X + 1.6 * u * u + 0.5 * u;
}
function doorsOpen(t) { const stop = T.llega - 0.3 + 1.7; return sm(stop + 0.05, stop + 0.45, t) * (1 - sm(T.l9 + 0.85, T.l9 + 1.25, t)); }
function minutesAt(t) {          // lo que pone el panel
  if (t < T.abres) return '12 MIN';
  if (t < T.l6) return t < T.cuantos ? '11 MIN' : t < T.tetraedro ? '10 MIN' : '9 MIN';
  if (t < T.l7) return t < T.reto ? '5 MIN' : '4 MIN';
  if (t < T.llega - 0.3) return '2 MIN';
  if (t < T.l9 + 1.6) return 'LLEGANDO';
  return '14 MIN';
}
const hourAt = t => 8.45 + 0.35 * t / Math.max(1, T.end);
const HOOKC = [[0.35, 1, 4.4], [0.8, -1, 1.6], [1.25, 1, 1.6], [1.7, -1, 4.4], [2.3, 1, 4.4], [2.75, -1, 1.6], [3.3, 1, 1.6], [3.8, -1, 4.4]];   // [instante en x = 0, sentido, carril]
function update(t) {
  const P = camAt(t), s = curShot(t), tag = s.tag;
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => f.u.uCam.value.copy(cam.position));
  sky.position.copy(cam.position);
  const night = setLight(sunState(hourAt(t)), V(0, 0, 4));
  facades.forEach(m => { m.emissiveIntensity = 1.2 * night; });
  for (const L of lamps) { if (L.l) L.l.intensity = L.inten * night; if (L.bulb) L.bulb.material.color.setScalar(0.6 + 2.4 * night); }
  drawLed('LÍNEA 7 · CENTRO', minutesAt(t));
  // tráfico: en el gancho, a toda velocidad (el tiempo «se escapa»); luego, normal; el carril bus queda libre al llegar el autobús
  const fast = tag === 'hook' ? 4.2 : 1;
  CARS.forEach((k, i) => {
    let x = k.x0 + k.dir * k.v * t * fast; x = ((x + 150) % 300 + 300) % 300 - 150;
    if (tag === 'hook' && i < HOOKC.length) x = HOOKC[i][1] * 46 * (t - HOOKC[i][0]);
    k.c.position.set(x, 0, tag === 'hook' && i < HOOKC.length ? HOOKC[i][2] : k.lane);
    k.c.rotation.y = (tag === 'hook' && i < HOOKC.length ? HOOKC[i][1] : k.dir) > 0 ? 0 : Math.PI;
    k.c.visible = (!(k.lane > 4 && t > T.llega - 1.5) && tag !== 'sube') || (tag === 'hook' && i < HOOKC.length);
  });
  // el opositor: reloj (gancho) → móvil → guarda el móvil y sube al autobús
  const op = CR.op, A = op.userData.arms, H = op.userData.head;
  const phoneOn = !['hook', 'bus', 'sube', 'vacia', 'fin'].includes(tag) || (tag === 'bus' && t < T.llega + 0.4);
  op.userData.phone.visible = phoneOn;
  if (tag === 'hook') {
    const w = sm(1.0, 1.4, t) * (1 - sm(3.0, 3.4, t));       // mira el reloj
    A[0].rotation.set(mx(0.05, 1.05, w), 0, mx(-0.08, 0.35, w)); A[0].userData.el.rotation.set(mx(0.1, 1.55, w), 0, 0);
    A[1].rotation.set(0.05, 0, 0.08); A[1].userData.el.rotation.set(0.1, 0, 0);
    H.rotation.set(mx(0, -0.45, w), mx(0.85, 0.15, w), 0);          // mira hacia donde viene el autobús; luego, al reloj
  } else if (phoneOn) {
    for (const [j, a] of A.entries()) { a.rotation.set(0.62, 0, 0.18 * (j ? -1 : 1)); a.userData.el.rotation.set(1.18, 0, 0); }
    H.rotation.set(-0.42, 0, 0);
  } else {
    for (const [j, a] of A.entries()) { a.rotation.set(0.04, 0, 0.08 * (j ? 1 : -1)); a.userData.el.rotation.set(0.15, 0, 0); }
    H.rotation.set(0, tag === 'bus' ? -0.5 : 0, 0);
  }
  // sube al autobús
  const board = sm(T.l9 + 0.05, T.l9 + 0.75, t);
  op.position.set(mx(WHO.x, WHO.x, board), 0, mx(WHO.z, BUS_Z + 1.0, board));
  yawTo(op, tag === 'bus' || tag === 'sube' ? WHO.x - 1.5 : WHO.x - 0.4, tag === 'bus' || tag === 'sube' ? WHO.z - 1.2 : WHO.z - 5);
  op.visible = t < T.l9 + 0.8;
  if (board > 0 && board < 1) { const ph = t * 2 * Math.PI * 1.8; op.userData.legs.forEach((l, j) => { l.rotation.x = 0.4 * Math.sin(ph + j * Math.PI); }); } else op.userData.legs.forEach(l => { l.rotation.x = 0; });
  // autobús y puertas
  BUS.position.x = busX(t);
  const d = doorsOpen(t);
  BUS.userData.doors.forEach(o => { o.m.position.x = o.x0 + o.s * 0.5 * d; o.m.position.z = 1.3 + 0.12 * d; });
}

// ------------------------------------------------------------------ capa 2D: el móvil (grabaciones reales y recreación) y los rótulos
const GOLD2 = '#FFC83D', RED2 = '#FF4B3E', CYAN2 = '#48D6FF', GREEN2 = '#3EF08A', WHITE = '#F4F6F8', ORANGE = '#FF7A1A', AMBER = '#FFB21E';
function chip(x, y, text, col, a, s = 1, px = 56) {
  if (a <= 0.005) return;
  g.save(); g.font = `400 ${px}px Bebas`; const tw = g.measureText(text).width, w = tw + 60, hh = px * 1.45;
  const hw = Math.min(W2 / 2 - 10, w * s / 2 + 24);
  g.globalAlpha = a; g.translate(cl(x, hw, W2 - hw), cl(y, 470, H2 - 230)); g.scale(s, s);
  rr(-w / 2, -hh / 2, w, hh, hh / 2); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  txt(text, 0, px * 0.36, px, WHITE, 400, 'center', 'Bebas'); g.restore();
}
function loadImg(src) { const im = new Image(); im.src = src; return im.decode().then(() => im); }
const REC = { menu: new Map(), duelo: new Map() };
function recFrame(kind, i) {
  const dir = kind === 'menu' ? 'rec_menu' : 'rec_1vs1', n = kind === 'menu' ? 126 : 486;
  i = Math.max(1, Math.min(n, i));
  if (!REC[kind].has(i)) REC[kind].set(i, loadImg(`../out/${dir}/r${String(i).padStart(4, '0')}.jpg`).catch(() => null));
  return REC[kind].get(i);
}
const PH = { x: 245, y: 440, w: 590, h: 1170, r: 72, bz: 16 }, PHS = 1.15, PHC = [540, 1025];   // el móvil se dibuja ×1,15 alrededor de PHC
const SCR = { x: PH.x + PH.bz, y: PH.y + PH.bz, w: PH.w - 2 * PH.bz, h: PH.h - 2 * PH.bz };
function phoneIn(t) {                 // 0 → 1: el móvil sube a primer plano
  const up1 = sm(T.abres - 0.15, T.abres + 0.2, t) * (1 - sm(T.l6 - 0.35, T.l6 - 0.05, t));
  const up2 = sm(T.reto - 0.25, T.reto + 0.1, t) * (1 - sm(T.llega - 0.35, T.llega - 0.05, t));
  return Math.max(up1, up2);
}
// tiempo dentro de cada grabación (segundos de la grabación)
function recTime(kind, t) {
  if (kind === 'menu') { const s = SH.find(x => x.tag === 'menu'); const d = shotEnd(s) - s.t0; return mx(0.3, 1.6, pr(t, s.t0 + 0.1, d * 0.55)); }   // inicio → menú PRO (y se queda en el menú)
  const s = SH.find(x => x.tag === 'duelo'), d = shotEnd(s) - s.t0;
  const u = pr(t, s.t0, d);                         // ruleta (1,0–7,0 s) y pregunta con la cuenta atrás (7,2–10,5 s)
  return u < 0.55 ? mx(1.0, 7.0, u / 0.55) : mx(7.2, 10.5, (u - 0.55) / 0.45);
}
function drawShell(a, yOff) {
  g.save(); g.globalAlpha = a; g.translate(0, yOff);
  g.shadowColor = 'rgba(0,0,0,0.65)'; g.shadowBlur = 60; g.shadowOffsetY = 20;
  rr(PH.x, PH.y, PH.w, PH.h, PH.r); g.fillStyle = '#0a0a0c'; g.fill(); g.restore();
}
function drawShellTop(a, yOff) {
  g.save(); g.globalAlpha = a; g.translate(0, yOff);
  rr(PH.x, PH.y, PH.w, PH.h, PH.r); g.lineWidth = 5; g.strokeStyle = '#3a3d44'; g.stroke();
  rr(PH.x + 3, PH.y + 3, PH.w - 6, PH.h - 6, PH.r - 3); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.12)'; g.stroke();
  rr(540 - 70, PH.y + 26, 140, 34, 17); g.fillStyle = '#000'; g.fill();          // isla de la cámara
  g.restore();
}
function clipScreen(yOff) { g.save(); g.translate(0, yOff); rr(SCR.x, SCR.y, SCR.w, SCR.h, PH.r - PH.bz); g.clip(); }
function appHeader(y0) {                                   // cabecera de la app (como en la grabación real)
  g.fillStyle = '#0d0e11'; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
  for (let i = 0; i < 40; i++) for (let j = 0; j < 80; j++) { g.fillStyle = 'rgba(255,255,255,0.025)'; g.fillRect(SCR.x + 8 + i * 14, SCR.y + 8 + j * 14, 2, 2); }
  g.save(); g.font = '400 54px Bebas'; g.fillStyle = WHITE; g.textAlign = 'left'; g.letterSpacing = '8px'; g.fillText('BOMBERADOS', SCR.x + 34, y0); g.restore();
  txt('by ÉliteBomberos', SCR.x + 34, y0 + 30, 22, 'rgba(255,255,255,0.6)', 400, 'left', 'sans-serif');
}
function card(x, y, w, h, fill = '#16181c', stroke = 'rgba(255,255,255,0.12)') { rr(x, y, w, h, 26); g.fillStyle = fill; g.fill(); g.lineWidth = 2; g.strokeStyle = stroke; g.stroke(); }
function wrapText(s, x, y, maxW, px, col, lh = 1.18, font = 'Bebas') {
  g.save(); g.font = `400 ${px}px ${font}`; g.fillStyle = col; g.textAlign = 'center';
  const words = s.split(' '), lines = []; let cur = '';
  for (const w of words) { const t2 = cur ? cur + ' ' + w : w; if (g.measureText(t2).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t2; }
  lines.push(cur);
  lines.forEach((l, i) => g.fillText(l, x, y + (i - (lines.length - 1) / 2) * px * lh));
  g.restore();
}
function flashcard(t, t0, tFlip, q, ansDraw, idx) {         // tarjeta que gira
  const cx = 540, cy = SCR.y + 600, w = 470, h = 640;
  const k = pr(t, tFlip - 0.12, 0.32), sx = Math.abs(Math.cos(Math.PI * k)), back = k > 0.5;
  txt('FLASHCARDS', SCR.x + 34, SCR.y + 180, 46, WHITE, 400, 'left', 'Bebas');
  txt('REPASO INTELIGENTE', SCR.x + 34, SCR.y + 214, 24, ORANGE, 400, 'left', 'sans-serif');
  txt(`${idx} / 20`, SCR.x + SCR.w - 34, SCR.y + 180, 40, 'rgba(255,255,255,0.7)', 400, 'right', 'Bebas');
  rr(SCR.x + 34, SCR.y + 238, SCR.w - 68, 10, 5); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill();
  rr(SCR.x + 34, SCR.y + 238, (SCR.w - 68) * idx / 20, 10, 5); g.fillStyle = ORANGE; g.fill();
  const pop = 1 + 0.06 * Math.exp(-Math.pow((t - t0 - 0.15) / 0.12, 2));
  g.save(); g.translate(cx, cy); g.scale(Math.max(0.02, sx) * pop, pop);
  card(-w / 2, -h / 2, w, h, back ? '#1b130d' : '#16181c', back ? ORANGE : 'rgba(255,255,255,0.14)');
  if (!back) { txt('PREGUNTA', 0, -h / 2 + 70, 30, ORANGE, 400, 'center', 'sans-serif'); wrapText(q, 0, -20, w - 80, 74, WHITE); txt('TOCA PARA GIRAR', 0, h / 2 - 50, 26, 'rgba(255,255,255,0.45)', 400, 'center', 'sans-serif'); }
  else { txt('RESPUESTA', 0, -h / 2 + 70, 30, ORANGE, 400, 'center', 'sans-serif'); ansDraw(); }
  g.restore();
  // botones (repaso espaciado)
  const ba = sm(tFlip + 0.25, tFlip + 0.45, t);
  if (ba > 0) { g.save(); g.globalAlpha = ba;
    card(SCR.x + 40, SCR.y + 960, 240, 92, 'rgba(255,255,255,0.05)'); txt('REPASAR', SCR.x + 160, SCR.y + 1020, 40, 'rgba(255,255,255,0.75)', 400, 'center', 'Bebas');
    card(SCR.x + SCR.w - 280, SCR.y + 960, 240, 92, 'rgba(62,240,138,0.14)', GREEN2); txt('✓ LO SABÍA', SCR.x + SCR.w - 160, SCR.y + 1020, 40, GREEN2, 400, 'center', 'Bebas');
    g.restore(); }
}
function retoScreen(t) {
  const s = SH.find(x => x.tag === 'reto'), t0 = s.t0 + 0.2, d = shotEnd(s) - s.t0;
  const prog = cl((t - t0) / (d * 0.62)), n = Math.floor(prog * 10 + 1e-6), done = sm(t0 + d * 0.66, t0 + d * 0.78, t);
  txt('RETO DIARIO', SCR.x + 34, SCR.y + 180, 52, WHITE, 400, 'left', 'Bebas');
  txt('10 PREGUNTAS · HOY', SCR.x + 34, SCR.y + 214, 24, ORANGE, 400, 'left', 'sans-serif');
  // diez casillas
  for (let i = 0; i < 10; i++) { const x = SCR.x + 50 + i * 46, ok = i < n; rr(x, SCR.y + 260, 34, 34, 9); g.fillStyle = ok ? 'rgba(62,240,138,0.9)' : 'rgba(255,255,255,0.08)'; g.fill(); }
  // pregunta que cambia rápido
  const Q = ['¿Qué significa ERA?', '¿Cuántos artículos tiene la Constitución?', 'Clase de fuego de un metal', '¿Qué es una BIE?', 'Elementos del tetraedro del fuego',
    'Significado de PAS', '¿Qué gas pesa más que el aire: GLP o gas natural?', 'Partes de una autobomba', 'Tipos de lanza', '¿Qué es la RCP?'];
  if (done < 0.99) {
    g.save(); g.globalAlpha = 1 - done;
    card(SCR.x + 40, SCR.y + 340, SCR.w - 80, 300);
    txt(`PREGUNTA ${Math.min(10, n + 1)} / 10`, 540, SCR.y + 400, 28, ORANGE, 400, 'center', 'sans-serif');
    wrapText(Q[Math.min(9, n)], 540, SCR.y + 510, SCR.w - 150, 60, WHITE);
    for (let k = 0; k < 4; k++) { const y = SCR.y + 670 + k * 92, hit = (Math.floor((t - t0) * 7) % 4) === k; card(SCR.x + 40, y, SCR.w - 80, 76, hit ? 'rgba(62,240,138,0.16)' : '#15171b', hit ? GREEN2 : 'rgba(255,255,255,0.1)');
      txt('ABCD'[k], SCR.x + 80, y + 50, 36, ORANGE, 400, 'center', 'Bebas'); rr(SCR.x + 120, y + 30, 240 + 90 * rnd(k + n * 4), 14, 7); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fill(); }
    g.restore();
  }
  // puntos que suben
  const pts = Math.round(1000 * Math.min(1, prog) / 10) * 10;
  txt(`+${pts.toLocaleString('es-ES')} PTS`, SCR.x + SCR.w - 34, SCR.y + 180, 44, GOLD2, 400, 'right', 'Bebas');
  if (done > 0) {
    g.save(); g.globalAlpha = done; const k = bk(pr(t, t0 + d * 0.66, 0.35));
    g.translate(540, SCR.y + 640); g.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
    g.beginPath(); g.arc(0, -120, 110, 0, 7); g.fillStyle = 'rgba(62,240,138,0.18)'; g.fill(); g.lineWidth = 8; g.strokeStyle = GREEN2; g.stroke();
    g.beginPath(); g.moveTo(-48, -120); g.lineTo(-12, -82); g.lineTo(56, -160); g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
    txt('¡RETO COMPLETADO!', 0, 80, 76, WHITE, 400, 'center', 'Bebas');
    txt('+1.000 PTS · RACHA +1', 0, 150, 44, GOLD2, 400, 'center', 'Bebas');
    g.restore();
    for (let i = 0; i < 40; i++) { const a = rnd(i) * 6.28, v = 300 + rnd(i * 3) * 400, tt = cl(t - (t0 + d * 0.66)), x = 540 + Math.cos(a) * v * tt, y = SCR.y + 520 + Math.sin(a) * v * tt + 600 * tt * tt;
      g.fillStyle = [GOLD2, ORANGE, GREEN2, CYAN2][i % 4]; g.globalAlpha = cl(1 - tt * 1.1); g.fillRect(x, y, 10, 16); }
    g.globalAlpha = 1;
  }
}
async function drawPhone(t) {
  const a = phoneIn(t); if (a <= 0.001) return;
  const yOff = (1 - e3(a)) * 1500, s = curShot(t), tag = PHONE_TAGS.includes(s.tag) ? s.tag : (t < T.l6 ? 'flash2' : 'duelo');
  let img = null;
  if (tag === 'menu') img = await recFrame('menu', Math.round(recTime('menu', t) * 30) + 1);
  if (tag === 'duelo') img = await recFrame('duelo', Math.round(recTime('duelo', t) * 30) + 1);
  g.save(); g.translate(PHC[0], PHC[1]); g.scale(PHS, PHS); g.translate(-PHC[0], -PHC[1]);
  drawShell(1, yOff);
  clipScreen(yOff);
  if (img) {
    const sc = SCR.w / img.width, h = img.height * sc, top = tag === 'duelo' ? SCR.y - 70 : SCR.y + (SCR.h - h) / 2;
    g.drawImage(img, SCR.x, top, SCR.w, h);
    if (tag === 'duelo') {                                        // tapar la barra de estado y el nombre del rival
      g.fillStyle = '#0d0e11'; g.fillRect(SCR.x, SCR.y, SCR.w, 70);
      const rt = recTime('duelo', t);
      if (rt < 7.1) { const ny = top + 268 * sc / (SCR.w / 603); rr(SCR.x + 125, top + (1065 - 874) * 1.5 * sc - 26, 230, 42, 10); g.fillStyle = '#121316'; g.fill(); txt('RIVAL', SCR.x + 140, top + (1065 - 874) * 1.5 * sc + 4, 30, 'rgba(255,255,255,0.8)', 400, 'left', 'Bebas'); }
    }
    if (tag === 'menu') {                                         // toque en «Flashcards» (casilla de arriba a la izquierda del menú PRO)
      const s2 = SH.find(x => x.tag === 'menu'), tt = t - (s2.t0 + (shotEnd(s2) - s2.t0) * 0.7);
      if (tt > 0) { const fx = SCR.x + SCR.w * 0.30, fy = top + h * 0.468, k = cl(tt / 0.45);
        rr(SCR.x + SCR.w * 0.085, top + h * 0.395, SCR.w * 0.43, h * 0.15, 18); g.lineWidth = 5; g.strokeStyle = `rgba(255,122,26,${0.9 * sm(0, 0.12, tt)})`; g.stroke();
        g.beginPath(); g.arc(fx, fy, 30 + 150 * k, 0, 7); g.fillStyle = `rgba(255,122,26,${0.45 * (1 - k)})`; g.fill();
        g.beginPath(); g.arc(fx, fy, 26, 0, 7); g.fillStyle = `rgba(255,255,255,${0.8 * (1 - sm(0.3, 0.6, tt))})`; g.fill(); }
    }
  } else {
    appHeader(SCR.y + 110);
    if (tag === 'flash1') flashcard(t, curShot(t).t0, T.ciento, '¿Cuántos artículos tiene la Constitución?', () => {
      txt('169', 0, 70, 260, ORANGE, 400, 'center', 'Bebas'); txt('ARTÍCULOS', 0, 150, 64, WHITE, 400, 'center', 'Bebas'); txt('Constitución Española de 1978', 0, 230, 26, 'rgba(255,255,255,0.6)', 400, 'center', 'sans-serif'); }, 7);
    if (tag === 'flash2') flashcard(t, curShot(t).t0, T.combustible, '¿Qué forma el tetraedro del fuego?', () => {
      [['COMBUSTIBLE', T.combustible], ['COMBURENTE', T.comburente], ['CALOR', T.calor], ['REACCIÓN EN CADENA', T.reaccion]].forEach(([w, tt], i) => {
        const k = sm(tt - 0.12, tt + 0.08, t); g.save(); g.globalAlpha = k; g.translate(0, -150 + i * 110 + (1 - k) * 20);
        rr(-200, -42, 400, 84, 20); g.fillStyle = 'rgba(255,122,26,0.14)'; g.fill(); g.lineWidth = 3; g.strokeStyle = ORANGE; g.stroke();
        txt(w, 0, 18, 50, WHITE, 400, 'center', 'Bebas'); g.restore(); }); }, 8);
    if (tag === 'reto') retoScreen(t);
  }
  g.restore();
  drawShellTop(1, yOff);
  g.restore();
  // panel de la parada en pequeño (lo que falta para el autobús)
  chip(540, 1765, `🚌  LÍNEA 7 · ${minutesAt(t)}`, AMBER, a, 0.85, 48);
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const s = curShot(t), tag = s.tag;
  // gancho: «CADA MINUTO CUENTA»
  const cm = sm(T.minutos - 0.1, T.minutos + 0.2, t) * (1 - sm(T.abres - 0.3, T.abres - 0.1, t));
  if (cm > 0) { g.save(); g.globalAlpha = cm; g.translate(540, 1420); const k = bk(cl(cm * 1.3)); g.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k); g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 40;
    txt('CADA MINUTO', 0, 0, 150, WHITE, 400, 'center', 'Bebas'); txt('CUENTA', 0, 150, 170, GOLD2, 400, 'center', 'Bebas'); g.restore(); }
  await drawPhone(t);
  // espera: «EL AUTOBÚS NO LLEGA»
  if (tag === 'espera') chip(540, 1500, 'EL AUTOBÚS NO LLEGA…', AMBER, sm(s.t0 + 0.05, s.t0 + 0.3, t), 1.1, 62);
  // llega el autobús: lo que has hecho
  if (tag === 'bus' || tag === 'sube') [['✓ FLASHCARDS', T.estudiado - 0.25], ['✓ RETO DIARIO', T.estudiado - 0.05], ['✓ 1 VS 1', T.estudiado + 0.15]].forEach(([w, tt], i) =>
    chip(540, 1240 + i * 120, w, GREEN2, sm(tt - 0.1, tt + 0.15, t) * (1 - sm(T.l9 + 0.6, T.l9 + 0.9, t)), 1.0 + 0.2 * Math.exp(-Math.pow((t - tt - 0.05) / 0.1, 2)), 56));
  // cierre: «no necesitas más tiempo…»
  const nm = sm(T.l9 + 0.6, T.l9 + 0.9, t) * (1 - sm(T.esperas - 0.3, T.esperas - 0.05, t));
  if (nm > 0) { g.save(); g.globalAlpha = nm; g.translate(540, 1300); g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 40;
    txt('CADA MINUTO', 0, 0, 130, WHITE, 400, 'center', 'Bebas'); txt('CUENTA', 0, 140, 150, GOLD2, 400, 'center', 'Bebas'); g.restore(); }
  const tv = sm(T.esperas - 0.1, T.esperas + 0.2, t) * (1 - sm(T.fin - 0.3, T.fin, t));
  if (tv > 0) { chip(540, 1250, '¿CUÁNTO ESPERAS TÚ AL DÍA?', GOLD2, tv, 1.1, 66); chip(540, 1420, 'ESCRÍBELO EN COMENTARIOS', WHITE, tv * sm(T.escribelo - 0.1, T.escribelo + 0.2, t), 1.0, 56); }
  share(t);
  closing(t);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.01)'; g.fillRect(0, 0, 2, 2);
}

// ------------------------------------------------------------------ fotograma
function subframes(t) {
  const s = curShot(t);
  if (Math.abs(t - s.t0) < 1 / 50) return 1;
  if (s.tag === 'hook') return 3;                                   // los coches dejan estela
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
  finMat.uniforms.uFlash.value = 0;
  const ph = phoneIn(t);
  finMat.uniforms.uDim.value = mx(1, 0.5, ph) * (t >= T.fin ? mx(1, 0.5, sm(T.compartir - 0.2, T.compartir + 0.3, t)) : 1) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  await overlay(t);
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
  } catch (e) { window.failed = 'autobus: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
