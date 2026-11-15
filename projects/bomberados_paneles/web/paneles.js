// «¿Qué lleva esta cisterna?» — el panel naranja (idea de Adrián, «LUNES 16 EXAMEN PANELES NARANJA») con el MENSAJE
// (bomberados/MENSAJE.md) y el plan del 15 nov: una cisterna volcada de noche en la autovía, tú a lo lejos con el viento a
// favor; el dron vuela hasta el panel y el número de ABAJO (el nº ONU) dice qué lleva… y cómo atacas: 1203 gasolina (espuma
// encima), 1978 propano (puede reventar: cañón de agua desde lejos), 1830 ácido sulfúrico (traje de protección química).
// Tres rondas con cuenta de 3 s y la trampa al final: 1202 (uno menos que la gasolina), con las letras A/B/C/D.
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






// ================================================================== la autovía de noche y la cisterna volcada
const world = new THREE.Group(); scene.add(world);
scene.fog.density = 0.012;
const BLUE2 = '#3FB6FF', RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D';
const COLS = ['#FF7A1A', '#2DD4BF', '#F0457A', '#8B7CF6'];
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
const TR = 1.1, TL = 9.0;                                   // radio y largo del tanque
const TK = { x: 2.0, z: -1.4, yaw: -0.25 };                 // la cisterna tumbada (centro del tanque, en el suelo)
const CAB = { x: -6.4, z: 0.9, yaw: 0.42 };                 // la cabeza tractora, de pie y cruzada (el morro hacia ti)
const PUD = V(0.4, 0, 1.75);                                // el charco (sale de la válvula de abajo)
const YOU0 = V(-30, 0, 3.4), YOU1 = V(-6.6, 0, 5.1);        // tú: lejos (lees el panel) y luego junto al charco
const MON = V(-15, 0, 6.3);                                 // el cañón de agua (sin nadie) para el propano
const PANELS = [['33', '1203'], ['23', '1978'], ['80', '1830'], ['30', '1202']];
const TANKC = [[0xc4c9d0, 0.72, 0.34], [0xeeeef0, 0.08, 0.42], [0x34373c, 0.55, 0.4], [0xc4c9d0, 0.72, 0.34]];   // color, metal, rugosidad por ronda
let trailer, tankM, cab, panelTex, panelMs = [], hazM, hazL, headL, truck, beacons = [], spot, you, nozzle, hoseM2 = null, hoseKey = '', hoseMat;
let puddle, pudU, foam, foamU, foamJet, fumes, fireP, fireL, heatU, monitor, monJet, monSteam, chem, ringM, ring, drip, leakP, dist50;
let ffMats = [], chemMats = [], clipFF, clipCH, monHose = null;

function addLegs(ff) {
  ff.updateMatrixWorld(true);
  const legs = [-1, 1].map(s => { const L = new THREE.Group(); L.position.set(0.11 * s, 0.85, 0); ff.add(L); return L; });
  ff.updateMatrixWorld(true);
  for (const m of [...ff.children]) if (m.isMesh && m.position.y < 0.8 && Math.abs(Math.abs(m.position.x) - 0.11) < 0.01) legs[m.position.x > 0 ? 1 : 0].attach(m);
  ff.userData.legs = legs; return ff;
}
function face(o, dir) { o.rotation.y = Math.atan2(-dir.x, -dir.z); }      // el bombero mira hacia −Z

// ------------------------------------------------------------------ el panel naranja (lienzo: los números ruedan como una tragaperras)
const PW = 512, PH = 384;
const PCV = document.createElement('canvas'); PCV.width = PW; PCV.height = PH;
const PX = PCV.getContext('2d');
function digitsRow(x, s, cx, cy, px, from, k, spin, tt, seed, halfH) {
  // s: cifras finales; from: cifras de antes (rueda k 0→1, cada cifra con su retraso); spin: rodando sin parar
  x.font = `400 ${px}px Bebas`; x.textAlign = 'center'; x.fillStyle = '#121212';
  const n = s.length, w = px * 0.5, x0 = cx - (n - 1) * w / 2;
  for (let i = 0; i < n; i++) {
    const X = x0 + i * w;
    if (spin > 0.001) {                                   // tragaperras: cifras que pasan hacia arriba
      const sp = tt * (11 + i * 1.7) + seed * 3.1 + i * 0.37, f = sp % 1, d0 = Math.floor(rnd(Math.floor(sp) * 1.3 + i + seed) * 10);
      const d1 = Math.floor(rnd(Math.floor(sp + 1) * 1.3 + i + seed) * 10);
      x.globalAlpha = 0.85; x.fillText(String(d0), X, cy - f * halfH + px * 0.36); x.fillText(String(d1), X, cy + (1 - f) * halfH + px * 0.36); x.globalAlpha = 1;
      continue;
    }
    const ki = e3(cl((k - i * 0.12) / 0.64));
    const a = from ? from[i] : null;
    if (a !== null && a !== undefined && ki < 1 && a !== s[i]) {
      x.fillText(a, X, cy - ki * halfH + px * 0.36);
      x.fillText(s[i], X, cy + (1 - ki) * halfH + px * 0.36);
    } else x.fillText(s[i], X, cy + px * 0.36);
  }
}
function drawPanel(x, W, H, st, tt) {
  // st: { top, bot, fromTop, fromBot, k, spin, glowTop, glowBot }
  x.save(); x.clearRect(0, 0, W, H);
  x.fillStyle = '#F07A1C'; x.fillRect(0, 0, W, H);
  const gr = x.createLinearGradient(0, 0, W, H); gr.addColorStop(0, 'rgba(255,255,255,0.14)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)');
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(60,30,10,${0.03 + rnd(i * 3.3) * 0.05})`; x.fillRect(rnd(i * 1.7) * W, rnd(i * 2.9) * H, 4 + rnd(i) * 30, 2 + rnd(i * 5.1) * 6); }   // suciedad
  const b = W * 0.042;
  const halfH = H / 2 - b * 1.5;
  for (const [k, gl] of [[0, st.glowTop || 0], [1, st.glowBot || 0]]) {
    if (gl > 0.01) { x.fillStyle = `rgba(255,236,170,${0.55 * gl})`; x.fillRect(b, k ? H / 2 + b * 0.45 : b, W - 2 * b, halfH + b * 0.1); }
  }
  for (const [k, s, from, seed] of [[0, st.top, st.fromTop, 1], [1, st.bot, st.fromBot, 2]]) {
    const y0 = k ? H / 2 + b * 0.45 : b, cy = y0 + halfH / 2;
    x.save(); x.beginPath(); x.rect(b, y0, W - 2 * b, halfH); x.clip();
    digitsRow(x, s, W / 2, cy, H * 0.43, from, st.k ?? 1, k ? st.spin || 0 : st.spinTop || 0, tt, seed, halfH);
    x.restore();
  }
  x.strokeStyle = '#121212'; x.lineWidth = b; x.strokeRect(b / 2, b / 2, W - b, H - b);
  x.fillStyle = '#121212'; x.fillRect(0, H / 2 - b * 0.45, W, b * 0.9);
  x.restore();
}

// ------------------------------------------------------------------ la cisterna (tumbada: el tanque a lo largo de X, los bajos y las ruedas hacia +Z)
function makeTrailer() {
  const G = new THREE.Group();
  tankM = new THREE.MeshStandardMaterial({ color: TANKC[0][0], metalness: TANKC[0][1], roughness: TANKC[0][2], envMapIntensity: 1.3 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, p = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; };
  add(new THREE.CylinderGeometry(TR, TR, TL, 64, 1, true), tankM, 0, TR, 0, 0, 0, Math.PI / 2);
  for (const s of [-1, 1]) { const c = add(new THREE.SphereGeometry(TR, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), tankM, s * TL / 2, TR, 0, 0, 0, -s * Math.PI / 2); c.scale.set(1, 0.3, 1); }
  for (const xb of [-3.4, -1.7, 0, 1.7, 3.4]) add(new THREE.TorusGeometry(TR + 0.012, 0.04, 8, 72), M.steel, xb, TR, 0, 0, Math.PI / 2, 0);
  // arriba (ahora hacia −Z): bocas de carga y pasarela
  for (const xb of [-2.6, 0, 2.6]) { add(new THREE.CylinderGeometry(0.3, 0.32, 0.18, 24), M.steel, xb, TR, -TR - 0.06, Math.PI / 2, 0, 0); add(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20), M.chrome, xb, TR, -TR - 0.17, Math.PI / 2, 0, 0); }
  add(new THREE.BoxGeometry(TL * 0.82, 0.5, 0.05), M.steel, 0, TR, -TR - 0.22);
  // bajos (ahora hacia +Z): largueros, ejes, ruedas, patas, parachoques
  for (const yb of [TR - 0.48, TR + 0.48]) add(new THREE.BoxGeometry(TL + 0.4, 0.2, 0.3), M.black, 0.2, yb, TR + 0.22);
  for (const xa of [2.0, 3.1, 4.2]) {
    add(new THREE.CylinderGeometry(0.07, 0.07, 2.0, 12), M.steel, xa, TR, TR + 0.72);
    for (const yw of [TR - 0.95, TR + 0.95]) {
      add(new THREE.CylinderGeometry(0.52, 0.52, 0.36, 30), M.rubber, xa, yw, TR + 0.72);
      add(new THREE.CylinderGeometry(0.3, 0.3, 0.38, 24), M.steel, xa, yw, TR + 0.72);
    }
  }
  for (const yb of [TR - 0.55, TR + 0.55]) add(new THREE.BoxGeometry(0.16, 0.16, 0.9), M.steel, -2.6, yb, TR + 0.6);       // patas de apoyo
  add(new THREE.BoxGeometry(0.14, 2.3, 0.2), M.black, TL / 2 + 0.3, TR, TR + 0.55);                                   // parachoques trasero
  for (const yb of [TR - 1.0, TR + 1.0]) add(new THREE.BoxGeometry(0.06, 0.22, 0.12), GLOW(0xff2010, 1.6), TL / 2 + 0.38, yb, TR + 0.55);
  // la válvula de descarga (por donde sale el líquido)
  add(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 16), M.steel, -0.9, 0.42, TR * 0.55 + 0.25, Math.PI / 2, 0, 0);
  // panel trasero (tumbado con la cisterna)
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.55, emissive: 0xffffff, emissiveMap: panelTex, emissiveIntensity: 0.08 }));
  pm.position.set(TL / 2 + 0.38, TR, TR + 0.55 + 0.01); pm.rotation.set(0, Math.PI / 2, Math.PI / 2); G.add(pm); panelMs.push(pm.material);
  return G;
}
function makeCab() {        // origen: en el suelo bajo el eje delantero; el morro mira a −X
  const G = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xd8d9dc, roughness: 0.42, metalness: 0.1 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; G.add(m); return m; };
  add(new THREE.BoxGeometry(5.6, 0.32, 1.0), M.black, 2.2, 0.82, 0);                                                      // chasis
  add(new RoundedBoxGeometry(2.2, 2.55, 2.45, 4, 0.16), white, 0.45, 2.25, 0);                                            // cabina
  add(new RoundedBoxGeometry(1.7, 0.5, 2.3, 3, 0.12), white, 0.85, 3.7, 0);                                               // techo alto
  add(new THREE.PlaneGeometry(2.1, 1.05), new THREE.MeshStandardMaterial({ color: 0x0a0e13, roughness: 0.22, metalness: 0.45 }), -0.66, 2.85, 0, 0, -Math.PI / 2, 0);   // parabrisas
  for (const s of [-1, 1]) add(new THREE.PlaneGeometry(1.0, 0.8), new THREE.MeshStandardMaterial({ color: 0x0a0e13, roughness: 0.22, metalness: 0.45 }), 0.2, 2.85, s * 1.235, 0, s > 0 ? 0 : Math.PI, 0);
  add(new THREE.BoxGeometry(0.08, 0.95, 1.7), M.black, -0.67, 1.62, 0);                                                    // rejilla
  for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.02, 0.04, 1.6), M.steel, -0.715, 1.25 + i * 0.15, 0);
  add(new THREE.BoxGeometry(0.28, 0.42, 2.45), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.6 }), -0.78, 0.78, 0);   // parachoques
  headL = [];
  for (const s of [-1, 1]) {
    headL.push(add(new THREE.BoxGeometry(0.06, 0.16, 0.36), GLOW(0xfff4e0, 1.7), -0.93, 0.95, s * 0.9));
    add(new THREE.CylinderGeometry(0.52, 0.52, 0.34, 30), M.rubber, 0, 0.52, s * 1.05, Math.PI / 2, 0, 0);
    for (const xa of [3.1, 4.3]) add(new THREE.CylinderGeometry(0.52, 0.52, 0.34, 30), M.rubber, xa, 0.52, s * 1.05, Math.PI / 2, 0, 0);
    add(new THREE.BoxGeometry(0.12, 0.42, 0.06), M.black, -0.3, 2.55, s * 1.42);                                          // retrovisor
  }
  hazM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.45, 0.05), fog: false });
  for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.07, 0.1, 0.18), hazM, -0.93, 0.95, s * 1.15); add(new THREE.BoxGeometry(0.12, 0.08, 0.06), hazM, -0.3, 2.3, s * 1.45); }
  add(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 30), M.steel, 3.8, 1.02, 0);                                          // quinta rueda
  // el panel delantero (el que lees)
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.55, emissive: 0xffffff, emissiveMap: panelTex, emissiveIntensity: 0.1 }));
  pm.position.set(-0.935, 1.17, 0); pm.rotation.y = -Math.PI / 2; G.add(pm); panelMs.push(pm.material);
  const pb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.44), M.black); pb.position.set(-0.92, 1.17, 0); G.add(pb);
  return G;
}

// ------------------------------------------------------------------ el traje de protección química (sale de abajo arriba sobre el bombero)
function makeChem() {
  const G = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: 0xc3d22e, roughness: 0.5 });
  const suitD = new THREE.MeshStandardMaterial({ color: 0x8f9e1f, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c241a, roughness: 0.6 });
  const visor = new THREE.MeshStandardMaterial({ color: 0x0c1418, roughness: 0.12, metalness: 0.5 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; G.add(m); return m; };
  for (const s of [-1, 1]) {
    add(new RoundedBoxGeometry(0.16, 0.22, 0.34, 3, 0.05), dark, 0.12 * s, 0.11, -0.03);                  // botas
    add(new THREE.CapsuleGeometry(0.11, 0.52, 6, 16), suit, 0.12 * s, 0.56, 0.0);                          // perneras anchas
    add(new THREE.SphereGeometry(0.115, 16, 12), suit, 0.3 * s, 1.5, 0.02);                                 // hombro
    add(new THREE.CapsuleGeometry(0.085, 0.26, 6, 12), suit, 0.33 * s, 1.31, -0.02, 0.22, 0, 0.13 * s);
    add(new THREE.CapsuleGeometry(0.08, 0.24, 6, 12), suit, 0.36 * s, 1.04, -0.13, 0.95, 0, 0.05 * s);
    add(new THREE.SphereGeometry(0.07, 14, 10), dark, 0.37 * s, 0.95, -0.26);                               // guantes
  }
  add(new RoundedBoxGeometry(0.62, 0.86, 0.42, 4, 0.16), suit, 0, 1.2, 0.0);                                // cuerpo (holgado)
  add(new RoundedBoxGeometry(0.46, 0.64, 0.26, 4, 0.12), suit, 0, 1.24, 0.24);                               // joroba: el equipo de aire va dentro
  add(new RoundedBoxGeometry(0.64, 0.06, 0.44, 2, 0.02), suitD, 0, 0.86, 0.0);                               // cintura
  add(new THREE.BoxGeometry(0.035, 0.7, 0.02), suitD, 0.05, 1.2, -0.215);                                    // cremallera
  add(new THREE.SphereGeometry(0.25, 28, 20), suit, 0, 1.74, 0.01, 0, 0, 0, 1, 1.12, 1);                     // capucha
  add(new THREE.SphereGeometry(0.252, 28, 20, Math.PI * 0.62, Math.PI * 0.76, Math.PI * 0.2, Math.PI * 0.42), visor, 0, 1.74, 0.01, 0, 0, 0, 1, 1.12, 1);   // visor
  return G;
}

// ------------------------------------------------------------------ el charco (gasolina con irisaciones o ácido que burbujea) y la espuma
const PUD_V = `varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const PUD_F = `uniform sampler2D uTex; uniform float uTime, uR, uKind, uA, uHaz; uniform vec3 uC;
varying vec3 vW; varying vec2 vUv;
vec3 pal(float t){ return 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + t)); }
void main(){
  vec2 p = vW.xz - uC.xz; float r = length(p), an = atan(p.y, p.x);
  float n = texture2D(uTex, vec2(an * 0.32 + 0.11, 0.37)).r, n2 = texture2D(uTex, p * 0.35 + vec2(uTime * 0.01, 0.0)).r;
  float edge = uR * (0.72 + 0.5 * n);
  float m = smoothstep(edge, edge - 0.18, r);
  if (m < 0.01) discard;
  vec3 V = normalize(cameraPosition - vW);
  float fres = pow(1.0 - max(V.y, 0.0), 3.0);
  vec3 col = vec3(0.012, 0.012, 0.014) + vec3(0.1, 0.11, 0.13) * fres;
  // reflejos de los intermitentes (naranja) y del foco (blanco)
  col += vec3(1.6, 0.7, 0.12) * uHaz * smoothstep(0.55, 0.95, fres) * (0.5 + 0.5 * n2);
  if (uKind < 0.5) col += pal(n2 * 1.6 + r * 0.35 + uTime * 0.03) * 0.035 * (0.3 + fres) * smoothstep(0.3, 0.8, n2);                   // gasolina: irisaciones
  else {                                                                                                        // ácido: amarillento y burbujas
    col = mix(col, vec3(0.09, 0.1, 0.02), 0.6);
    float b = texture2D(uTex, p * 2.2 + vec2(0.0, uTime * 0.6)).r;
    col += vec3(0.55, 0.6, 0.25) * smoothstep(0.78, 0.86, b) * 0.6;
  }
  float a = m * uA * 0.92;
  gl_FragColor = vec4(col * a, a);
}`;
const FOAM_F = `uniform sampler2D uTex; uniform float uTime, uR, uA; uniform vec3 uC, uFrom;
varying vec3 vW; varying vec2 vUv;
void main(){
  vec2 p = vW.xz - uC.xz;
  float n = texture2D(uTex, p * 0.9 + vec2(0.13, uTime * 0.02)).r, n2 = texture2D(uTex, p * 3.1).r;
  float d = length(vW.xz - uFrom.xz);                      // crece desde donde cae el chorro
  float m = smoothstep(uR, uR - 0.35, d + (n - 0.5) * 0.8);
  float inP = smoothstep(2.9, 2.4, length(p));            // no se sale del charco (más o menos)
  m *= inP;
  if (m < 0.01) discard;
  float b = texture2D(uTex, p * 7.3 + vec2(0.31, 0.0)).r;                     // burbujas
  vec3 col = vec3(0.93, 0.95, 0.97) * (0.8 + 0.2 * n2) * (1.0 - 0.28 * smoothstep(0.58, 0.72, b)) * (0.8 + 0.2 * smoothstep(0.0, 0.5, m));
  float a = m * uA;
  gl_FragColor = vec4(col * a * 0.95, a);
}`;
const HEAT_F = `uniform sampler2D uTex; uniform float uTime, uI; uniform vec3 uP;
varying vec3 vW; varying vec2 vUv;
void main(){
  vec3 d = vW - uP; float f = exp(-dot(d, d) / 7.5);
  float n = texture2D(uTex, vW.xy * 0.6 + vec2(uTime * 0.05, -uTime * 0.12)).r;
  float a = uI * f * (0.55 + 0.45 * n);
  if (a < 0.004) discard;
  vec3 col = mix(vec3(1.2, 0.08, 0.02), vec3(2.6, 0.9, 0.2), smoothstep(0.35, 0.95, f));
  gl_FragColor = vec4(col * a, a);
}`;
function shaderMesh(geo, u, fs, o = {}) {
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: PUD_V, fragmentShader: fs, transparent: true, depthWrite: false,
    blending: o.add ? THREE.AdditiveBlending : THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, side: o.side || THREE.FrontSide, fog: false }));
  m.renderOrder = o.order || 6; return m;
}

// ------------------------------------------------------------------ marcas en el suelo (la distancia)
const STRIP_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const STRIP_F = `uniform float uI, uTime, uLen, uGrow; uniform vec3 uCol; varying vec2 vUv;
void main(){
  if (vUv.x > uGrow) discard;
  float edge = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
  float s = fract(vUv.x * uLen / 1.6 - uTime * 0.8);
  float a = (0.25 + 0.75 * step(0.45, s)) * edge * uI;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uCol * a, a);
}`;
function strip(p0, p1, w, col, y = 0.03) {
  const d = p1.clone().sub(p0), len = d.length();
  const geo = new THREE.PlaneGeometry(len, w); geo.rotateX(-Math.PI / 2);
  const u = { uI: { value: 0 }, uTime: { value: 0 }, uLen: { value: len }, uGrow: { value: 1 }, uCol: { value: new THREE.Color(col).multiplyScalar(1.6) } };
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: STRIP_V, fragmentShader: STRIP_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  m.position.copy(p0).add(p1).multiplyScalar(0.5); m.position.y = y; m.rotation.y = -Math.atan2(d.z, d.x); m.renderOrder = 9; world.add(m);
  return u;
}

function buildWorld() {
  world.add(new THREE.HemisphereLight(0x2c3d62, 0x0a0705, 0.45));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.24); moon.position.set(-30, 50, 25); world.add(moon);
  // autovía (como en el reto): asfalto, marcas, bionda, mediana, árboles y farolas
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#16171a'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 16 + rnd(i) * 26; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(70, 70);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ map: asph, color: 0x5c5c5c, roughness: 0.55, metalness: 0.12 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
  const verge = new THREE.Mesh(new THREE.PlaneGeometry(320, 80), new THREE.MeshStandardMaterial({ color: 0x14160f, roughness: 1 })); verge.rotation.x = -Math.PI / 2; verge.position.set(0, 0.01, 46.5); verge.receiveShadow = true; world.add(verge);
  const lineM = new THREE.MeshStandardMaterial({ color: 0xd9d9d0, roughness: 0.4, emissive: 0x1c1c1a });
  for (const z of [3.2, -5.35]) { const l = new THREE.Mesh(new THREE.BoxGeometry(260, 0.012, 0.15), lineM); l.position.set(0, 0.008, z); l.receiveShadow = true; world.add(l); }
  for (let i = 0; i < 30; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.012, 0.15), lineM); d.position.set(-130 + i * 9, 0.008, -1.1); d.receiveShadow = true; world.add(d); }
  const steel = new THREE.MeshStandardMaterial({ color: 0x8c9198, metalness: 0.8, roughness: 0.35 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(200, 0.32, 0.07), steel); rail.position.set(0, 0.62, 7.0); rail.castShadow = true; world.add(rail);
  for (let i = 0; i < 100; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), steel); p.position.set(-100 + i * 2, 0.375, 7.08); world.add(p); }
  const conc = new THREE.MeshStandardMaterial({ color: 0x6d6e70, roughness: 0.9 });
  const med = new THREE.Mesh(new THREE.BoxGeometry(200, 0.85, 0.55), conc); med.position.set(0, 0.425, -6.15); med.castShadow = true; med.receiveShadow = true; world.add(med);
  const treeM = new THREE.MeshStandardMaterial({ color: 0x0c140c, roughness: 1 });
  for (let i = 0; i < 46; i++) {
    const x = -110 + i * 4.8 + rnd(i * 3.3) * 3, z = 11 + rnd(i * 7.1) * 16, h = 3.5 + rnd(i * 1.9) * 4;
    const tr = new THREE.Mesh(new THREE.ConeGeometry(1.1 + rnd(i) * 0.8, h, 7), treeM); tr.position.set(x, h / 2, z); world.add(tr);
  }
  for (const x of [-62, -22, 3, 22, 62]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 10, 10), steel); pole.position.set(x, 5, -6.15); world.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.0), steel); arm.position.set(x, 9.9, -5.2); world.add(arm);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.3), GLOW(0xffb070, 2.4)); lamp.position.set(x, 9.82, -4.3); world.add(lamp);
    const l = new THREE.PointLight(0xffa860, 70, 0, 2); l.position.set(x, 9.5, -4.3); world.add(l);
  }
  // el panel (lienzo compartido por los dos paneles 3D)
  panelTex = new THREE.CanvasTexture(PCV); panelTex.colorSpace = THREE.SRGBColorSpace; panelTex.anisotropy = 8;
  drawPanel(PX, PW, PH, { top: PANELS[0][0], bot: PANELS[0][1] }, 0); panelTex.needsUpdate = true;
  // la cisterna tumbada y la cabeza tractora cruzada
  trailer = makeTrailer(); trailer.position.set(TK.x, 0, TK.z); trailer.rotation.y = TK.yaw; world.add(trailer);
  cab = makeCab(); cab.position.set(CAB.x, 0, CAB.z); cab.rotation.y = CAB.yaw; world.add(cab);
  hazL = new THREE.PointLight(0xff8a1a, 0, 0, 2); hazL.position.copy(cab.localToWorld(V(0.2, 3.3, 1.9))); world.add(hazL);
  const hs = new THREE.SpotLight(0xfff0d8, 30, 40, 0.42, 0.7, 1.6); hs.position.copy(cab.localToWorld(V(-1.0, 0.95, 0))); hs.target.position.copy(cab.localToWorld(V(-12, 0, 0))); world.add(hs, hs.target);
  // el charco, la espuma, el goteo de la válvula y los vapores del ácido
  pudU = { uTex: { value: NOISE }, uTime: { value: 0 }, uR: { value: 2.4 }, uKind: { value: 0 }, uA: { value: 1 }, uHaz: { value: 0 }, uC: { value: PUD.clone() } };
  puddle = shaderMesh(new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2), pudU, PUD_F, { order: 5 }); puddle.position.set(PUD.x, 0.015, PUD.z); world.add(puddle);
  foamU = { uTex: { value: NOISE }, uTime: { value: 0 }, uR: { value: 0 }, uA: { value: 1 }, uC: { value: PUD.clone() }, uFrom: { value: V(PUD.x - 1.4, 0, PUD.z + 0.9) } };
  foam = shaderMesh(new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2), foamU, FOAM_F, { order: 7 }); foam.position.set(PUD.x, 0.06, PUD.z); world.add(foam);
  trailer.updateMatrixWorld(true);
  const valve = trailer.localToWorld(V(-0.9, 0.42, TR * 0.55 + 0.5));
  drip = waterJet(260, { v0: 0.9, drag: 0.6, life: 0.7, size: 0.035, spreadA: 0.25, spreadB: 0.25, grav: 4.9, seed: 61, opacity: 0.35 }); drip.at(valve.x, valve.y, valve.z); drip.u.uDir.value.set(0, -0.3, 1).normalize(); world.add(drip.mesh);
  fumes = new Parts(70, { life: 3.4, rise: 0.55, acc: 0.05, size: 0.9, grow: 2.2, turb: 0.5, rot: 6.28, opacity: 0, c: [[0.75, 0.78, 0.55], [0.6, 0.62, 0.45], [0.45, 0.47, 0.36], [0.3, 0.31, 0.25]], seed: 71, extent: [2.0, 0.05, 1.6], order: 11 });
  fumes.at(PUD.x, 0.25, PUD.z); world.add(fumes.mesh);
  // propano: fuego junto al tanque y el tanque que se pone al rojo
  const fp = trailer.localToWorld(V(-2.9, 0.15, TR + 0.95));
  fireP = fireSet(world, fp, tongues(12, 5, (i, r) => [-1.3 + i * 0.24 + (r(1) - 0.5) * 0.12, 0.15, (r(2) - 0.5) * 0.9, 0.85 + 0.45 * r(3), 2.2 + 1.6 * r(4)]),
    { seed: 5, extent: [1.4, 0.1, 0.6], smokeN: 40, smokeSize: 1.3, smokeY: 2.8, emberN: 80, bright: 1.5 });
  fireL = new THREE.PointLight(0xff6a1a, 0, 0, 2); fireL.position.set(fp.x, 1.6, fp.z + 0.6); world.add(fireL);
  heatU = { uTex: { value: NOISE }, uTime: { value: 0 }, uI: { value: 0 }, uP: { value: trailer.localToWorld(V(-2.6, TR, TR * 0.7)) } };
  const heat = shaderMesh(new THREE.CylinderGeometry(TR + 0.03, TR + 0.03, TL * 0.98, 64, 1, true), heatU, HEAT_F, { add: true, order: 8 });
  heat.rotation.z = Math.PI / 2; heat.position.set(0, TR, 0); trailer.add(heat);
  // el cañón de agua (sin nadie) y su chorro en arco
  monitor = new THREE.Group(); monitor.position.copy(MON); world.add(monitor);
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8), M.steel); leg.position.set(Math.cos(a) * 0.32, 0.42, Math.sin(a) * 0.32); leg.rotation.set(Math.sin(a) * 0.62, 0, -Math.cos(a) * 0.62); monitor.add(leg); }
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0xb01c14, roughness: 0.4 })); body.position.y = 0.95; monitor.add(body);
  const aim = V(2.4, 1.1, -1.3).sub(MON); aim.y = 0; const yaw = Math.atan2(aim.x, aim.z);
  const nz = new THREE.Group(); nz.position.y = 1.2; nz.rotation.set(0, yaw, 0); monitor.add(nz);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.8, 16), M.chrome); barrel.rotation.x = Math.PI / 2 - 0.593; barrel.position.set(0, 0.16, 0.34); nz.add(barrel);
  monJet = waterJet(3600, { v0: 16.5, drag: 0.22, life: 4.2, size: 0.13, spreadA: 0.025, spreadB: 0.035, grav: 4.9, seed: 13, opacity: 0.85 }); world.add(monJet.mesh);
  monitor.updateMatrixWorld(true);
  const tip = barrel.localToWorld(V(0, 0.42, 0)), dir = barrel.localToWorld(V(0, 1, 0)).sub(barrel.localToWorld(V(0, 0, 0))).normalize();
  monJet.at(tip.x, tip.y, tip.z); monJet.u.uDir.value.copy(dir);
  monSteam = new Parts(80, { life: 2.4, rise: 1.6, acc: 0.1, size: 1.0, grow: 2.4, turb: 0.6, rot: 6.28, opacity: 0, c: [[0.6, 0.62, 0.66], [0.48, 0.5, 0.53], [0.35, 0.36, 0.38], [0.22, 0.22, 0.24]], seed: 43, extent: [1.6, 0.3, 0.8], order: 11 });
  monSteam.at(1.2, 1.9, -0.7); world.add(monSteam.mesh);
  // la autobomba (rotativos y foco sobre la cisterna)
  truck = makeTruck(); truck.position.set(-36, 0, -2.4); world.add(truck);
  truck.traverse(o => { if (o.isMesh) o.castShadow = true; }); beacons = truck.userData.lbar;
  spot = new THREE.SpotLight(0xfff0d8, 160, 80, 0.2, 0.6, 1.4); spot.position.set(-31.9, 1.3, -2.4); spot.target.position.set(-2, 1.0, 0);
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0004; world.add(spot, spot.target);
  // tú (con la lanza de espuma y su manguera) y el traje químico
  you = makeFirefighter(); you.position.copy(YOU0); face(you, V(CAB.x - YOU0.x, 0, CAB.z - YOU0.z).normalize()); world.add(you);
  you.traverse(o => { if (o.isMesh) o.castShadow = true; });
  nozzle = new THREE.Group(); nozzle.position.set(0.02, 1.0, -0.38); you.add(nozzle);
  const nzl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.55, 16), M.chrome); nzl.rotation.x = Math.PI / 2; nozzle.add(nzl);
  const hd = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.14, 0.06, 2, 0.02), M.black); hd.position.set(0, -0.08, 0.06); nozzle.add(hd);
  hoseMat = new THREE.MeshStandardMaterial({ color: 0xe9e3d3, roughness: 0.65 });
  foamJet = new Parts(1400, { jet: true, life: 0.9, v0: 9.5, drag: 1.3, size: 0.09, grow: 0.9, spreadA: 0.06, spreadB: 0.08, grav: 3.6, opacity: 0.8, edge: 1.0, seed: 17, order: 14,
    c: [[1.25, 1.27, 1.3], [1.05, 1.07, 1.1], [0.85, 0.87, 0.9], [0.65, 0.66, 0.68]], floor: 0.05 });
  world.add(foamJet.mesh);
  chem = makeChem(); chem.position.copy(YOU1); world.add(chem);
  clipFF = new THREE.Plane(V(0, 1, 0), 0); clipCH = new THREE.Plane(V(0, -1, 0), 0);
  renderer.localClippingEnabled = true;
  you.traverse(o => { if (o.isMesh && o.material && !o.material.isShaderMaterial) { o.material = o.material.clone(); o.material.clippingPlanes = [clipFF]; ffMats.push(o.material); } });
  chem.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.clippingPlanes = [clipCH]; chemMats.push(o.material); } });
  ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(GREEN2).multiplyScalar(2.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.022, 8, 64), ringM); ring.rotation.x = Math.PI / 2; ring.renderOrder = 16; world.add(ring);
  // la distancia (de ti a la cisterna)
  dist50 = strip(V(YOU0.x + 1.2, 0, YOU0.z - 0.4), V(CAB.x - 2.2, 0, CAB.z + 1.0), 0.5, GOLD2, 0.035);
}
function hoseUpdate() {              // la manguera: del racor de la autobomba, por el suelo, a tus manos (se rehace si te mueves)
  const key = you.position.x.toFixed(3) + ',' + you.position.z.toFixed(3) + ',' + you.rotation.y.toFixed(3);
  if (key === hoseKey) return; hoseKey = key;
  you.updateMatrixWorld(true); truck.updateMatrixWorld(true);
  const out = truck.localToWorld(V(1.8, 0.95, 1.3)), hand = you.localToWorld(V(0.02, 0.97, -0.18)), back = you.localToWorld(V(0.1, 0.07, 0.55));
  const pts = [out, out.clone().add(V(0.15, -0.55, 0.35)), V(out.x + 0.5, 0.07, out.z + 1.0)];
  const n = 6; for (let i = 1; i <= n; i++) { const k = i / (n + 1); pts.push(V(mx(out.x + 0.5, back.x, k), 0.07, mx(out.z + 1.0, back.z, k) + 0.9 * Math.sin(Math.PI * k))); }
  pts.push(back, you.localToWorld(V(0.06, 0.5, 0.25)), hand);
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const geo = new THREE.TubeGeometry(curve, 320, HOSE_R, 10, false);
  if (!hoseM2) { hoseM2 = new THREE.Mesh(geo, hoseMat); hoseM2.castShadow = false; world.add(hoseM2); }
  else { hoseM2.geometry.dispose(); hoseM2.geometry = geo; }
}

// ------------------------------------------------------------------ tiempos y cámara (un dron que no para)
let T = {}, KEYS = null, PANEL_W = null, PANEL_N = null;
function setupTimes() {
  T = { ...CUE, end: END };
  const L = window.LINES_;
  T.c = [L[1].end + 0.05, L[3].end + 0.05, L[5].end + 0.05];        // las tres cuentas de 3 s
  T.volcada = 0.1; T.lleva1 = 0.35;                                   // la voz empieza en «Antes de acercarte»: el gancho es la imagen
  T.r = [T.gasolina, T.propano, T.acido];                            // la respuesta de cada ronda
  T.f = [T.n1 - 0.2, T.n2 - 0.2, T.n3 - 0.2, T.n4 - 0.15];           // el panel cambia de números
  T.mv = [T.c[0] + 1.5, T.c[1] + 1.5, T.c[2] + 1.5];                 // tú cambias de sitio (la cámara está en el panel)
  T.fin = T.compartir - 0.25;
  KEYS = camKeys();
}
function orbit(phi, r = 1.45, dy = 0.08, ty = -0.24) {             // alrededor del panel delantero (phi en grados, 0 = de frente)
  const a = phi * Math.PI / 180, tg = V(PANEL_N.z, 0, -PANEL_N.x);
  const p = PANEL_W.clone().addScaledVector(PANEL_N, r * Math.cos(a)).addScaledVector(tg, r * Math.sin(a)); p.y += dy;
  const q = PANEL_W.clone(); q.y += ty;
  return [p.x, p.y, p.z, q.x, q.y, q.z];
}
function camKeys() {
  const C3 = V(-10.8, 1.6, 6.4);                                     // la cámara frente a ti en la ronda del ácido
  const K = [
    [0, [-14, 8, 4.2, 2, 0.4, -0.6, 42]],                              // la cabeza tractora con los intermitentes y la cisterna tumbada detrás
    [0.45, [-15.2, 7.7, 4.6, 1.2, 0.5, -0.5, 42]],
    [T.lejos + 0.25, [-39, 3.3, 5.2, -15, 0.5, 1.8, 30]],              // el dron vuelve hacia ti: la cisterna, lejos
    [T.panel, [-37.8, 3.15, 5.0, -14, 0.6, 1.6, 30]],
    [T.abajo, [...orbit(0, 1.6), 34]],                                // y vuela hasta el panel
    [T.n1, [...orbit(4, 1.5), 34]],
    [T.c[0] + 1.5, [...orbit(-8), 34]],
    [T.c[0] + 3.0, [...orbit(-14, 1.55), 34]],
    [T.gasolina + 0.45, [-9.6, 6.2, 10.6, -1.0, 0.1, 2.0, 44]],        // la gasolina: el charco y tú con la espuma
    [T.n2 - 0.1, [-7.4, 4.6, 9.6, 0.0, 0.1, 1.9, 42]],
    [T.n2 + 0.5, [...orbit(10, 1.6), 34]],
    [T.c[1] + 1.5, [...orbit(2), 34]],
    [T.c[1] + 3.0, [...orbit(-10, 1.55), 34]],
    [T.propano + 0.4, [-15, 3.8, 10.8, -1.5, 1.2, -0.3, 42]],          // el propano: el fuego calienta la cisterna
    [T.reventar, [-24, 7.6, 14.5, -1.0, 1.2, -0.8, 40]],               // ¡puede reventar!: el dron se aleja
    [T.enfria + 0.15, [-23, 6.0, 11.5, -4, 1.6, -0.6, 38]],           // el cañón la enfría desde lejos (el arco de agua cae sobre la cisterna)
    [T.n3 - 0.1, [-22, 5.7, 11.0, -4, 1.6, -0.6, 38]],
    [T.n3 + 0.5, [...orbit(-10, 1.6), 34]],
    [T.c[2] + 1.5, [...orbit(2), 34]],
    [T.c[2] + 3.0, [...orbit(12, 1.55), 34]],
    [T.acido + 0.45, [C3.x - 0.6, 1.9, C3.z + 0.6, -5.2, 0.9, 4.2, 42]],   // el ácido humea detrás de ti
    [T.traje - 0.2, [C3.x, C3.y, C3.z, -6.4, 1.1, 4.95, 38]],
    [T.quimico + 0.5, [C3.x + 0.5, 1.55, C3.z - 0.15, -6.5, 1.1, 4.95, 36]],
    [T.trampa + 0.3, [-12.5, 6.2, 12.5, -3.5, 0.6, 0.8, 42]],          // la trampa: los dos paneles en grande
    [T.quelleva, [-14, 8.5, 14.5, -4, 0.6, 0.6, 44]],                  // las cuatro letras
    [T.fin, [-18, 11, 18, -3, 0.6, 0, 44]],
    [T.end, [-22, 14, 22, -3, 0.6, 0, 46]],
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
  const sh = Math.exp(-Math.pow((t - T.reventar - 0.05) / 0.16, 2)) * 0.12;
  return pose(V(v[0] + sh * Math.sin(t * 91), v[1] + sh * Math.cos(t * 77), v[2]), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
function roundAt(t) { let k = -1; for (let i = 0; i < 4; i++) if (t >= T.f[i]) k = i; return k; }
function panelState(t) {
  const k = roundAt(t), spin = t >= T.abajo - 0.1 && t < T.f[0];
  const glowBot = Math.max(sm(T.abajo - 0.1, T.abajo + 0.2, t) * (1 - sm(T.n1 + 0.6, T.n1 + 1.0, t)), ...[T.n2, T.n3, T.n4].map(x => 0.8 * pulse(t, x + 0.3, 0.45)));
  if (spin) return { top: PANELS[0][0], bot: PANELS[0][1], spin: 1, spinTop: 1, glowBot };
  if (k < 0) return { top: PANELS[0][0], bot: PANELS[0][1], glowBot };
  const from = k === 0 ? ['58', '7745'] : PANELS[k - 1];
  return { top: PANELS[k][0], bot: PANELS[k][1], fromTop: from[0], fromBot: from[1], k: pr(t, T.f[k], 0.55), glowBot };
}
function youAt(t) {                   // dónde estás tú y si ya llevas el traje químico
  const near = (t >= T.mv[0] && t < T.mv[1]) || t >= T.mv[2];
  return near ? YOU1 : YOU0;
}
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => { f.u.uCam.value.copy(cam.position); f.u.uTime.value = t; });
  const k = roundAt(t);
  // el panel (los dos: delante y detrás)
  drawPanel(PX, PW, PH, panelState(t), t); panelTex.needsUpdate = true;
  // intermitentes de la cabeza tractora y rotativos de la autobomba
  const hz = ((t * 1.25) % 1) < 0.5 ? 1 : 0;
  hazM.color.setRGB(0.25 + 2.6 * hz, 0.1 + 1.1 * hz, 0.02 + 0.1 * hz); hazL.intensity = 9 * hz; pudU.uHaz.value = 0.25 + 0.75 * hz;
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = 8 + 70 * on;
  // la cisterna cambia de color con cada número (plata, blanca, gris oscuro, plata)
  const kk = Math.max(0, k), a0 = TANKC[Math.max(0, kk - 1)], a1 = TANKC[kk], u = k <= 0 ? 1 : sm(T.f[kk], T.f[kk] + 0.5, t);
  const c0 = new THREE.Color(a0[0]), c1 = new THREE.Color(a1[0]);
  tankM.color.copy(c0.lerp(c1, u)); tankM.metalness = mx(a0[1], a1[1], u); tankM.roughness = mx(a0[2], a1[2], u);
  // el charco: gasolina (rondas 1 y 4), nada (propano), ácido
  pudU.uTime.value = t; pudU.uKind.value = k === 2 ? 1 : 0;
  pudU.uA.value = (k === 1 ? 1 - sm(T.f[1], T.f[1] + 0.3, t) : k === 2 ? sm(T.f[2], T.f[2] + 0.4, t) : 1);
  pudU.uR.value = 2.3 + 0.25 * sm(0, 3, t);
  drip.u.uTime.value = t; drip.u.uOpacity.value = k === 1 ? 0 : 0.35;
  // la espuma: tapa el charco de gasolina
  foamU.uTime.value = t; foamU.uR.value = mx(0, 5.2, e3(pr(t, T.tapa - 0.25, 1.9))); foamU.uA.value = k === 0 ? 1 : 1 - sm(T.f[1] - 0.05, T.f[1] + 0.25, t);
  foam.visible = foamU.uR.value > 0.01 && foamU.uA.value > 0.01;
  // el propano: fuego al lado, la cisterna al rojo… y el cañón que la enfría desde lejos
  const fOn = sm(T.propano - 0.25, T.propano + 0.25, t) * (1 - sm(T.f[2] - 0.6, T.f[2] - 0.1, t));
  for (const F of [fireP]) { F.s.u.uTime.value = t; F.e.u.uTime.value = t; F.F.u.uInt.value = fOn; F.s.u.uOpacity.value = 0.55 * fOn; F.e.u.uOpacity.value = fOn; }
  fireP.F.mesh.visible = fireP.s.mesh.visible = fireP.e.mesh.visible = fOn > 0.005;
  fireL.intensity = (110 + 40 * Math.sin(t * 17) * Math.sin(t * 4.7)) * fOn;
  const cool = sm(T.enfria + 0.7, T.enfria + 2.4, t);
  heatU.uTime.value = t; heatU.uI.value = 1.1 * sm(T.fuego - 0.1, T.reventar + 0.1, t) * (1 - 0.85 * cool) * fOn * (0.9 + 0.1 * Math.sin(t * 13));
  monitor.visible = k === 1 || (k === 2 && t < T.f[2] + 0.3); if (monHose) monHose.visible = monitor.visible;
  monJet.u.uTime.value = t; monJet.u.uOn0.value = T.reventar + 0.1; monJet.u.uOn1.value = T.f[2] - 0.4;
  monSteam.u.uTime.value = t; monSteam.u.uOpacity.value = 0.42 * sm(T.enfria + 0.6, T.enfria + 1.1, t) * (1 - sm(T.f[2] - 0.8, T.f[2] - 0.3, t));
  // el ácido: humea
  fumes.u.uTime.value = t; fumes.u.uOpacity.value = 0.38 * (k === 2 ? sm(T.f[2] + 0.2, T.acido + 0.3, t) : 0);
  // tú: lejos con la lanza, junto al charco con la espuma… y el traje químico
  const yp = youAt(t);
  you.position.copy(yp);
  if (yp === YOU0) face(you, V(CAB.x - YOU0.x, 0, CAB.z - YOU0.z).normalize());
  else if (k >= 2) face(you, V(-4.2, 0, 1.3).normalize());          // en la ronda del ácido te pones el traje mirando a cámara
  else face(you, V(foamU.uFrom.value.x - YOU1.x, 0, foamU.uFrom.value.z - YOU1.z).normalize());
  chem.rotation.y = you.rotation.y;
  const hT = k >= 2 ? mx(-0.05, 2.15, e3(pr(t, T.traje - 0.25, 1.15))) : -0.05;
  clipFF.constant = -hT; clipCH.constant = hT;
  chem.visible = hT > -0.04; you.visible = hT < 2.1; bottle.visible = hT < 1.0;
  ring.position.set(YOU1.x, Math.max(0.02, hT), YOU1.z); ringM.opacity = (hT > -0.04 && hT < 2.1) ? 0.95 : 0; ring.scale.setScalar(hT > 1.5 ? mx(1, 0.6, (hT - 1.5) / 0.6) : 1);
  hoseUpdate(); hoseM2.visible = you.visible && hT < 0.5;
  // la espuma sale de tu lanza hacia el charco
  you.updateMatrixWorld(true);
  const pitch = yp === YOU1 ? 0.12 : 0.05; nozzle.rotation.x = pitch; nozzle.updateMatrixWorld(true);
  const tip = nozzle.localToWorld(V(0, 0, -0.3)), aim = foamU.uFrom.value.clone().sub(tip); aim.y += 1.6; aim.normalize();
  foamJet.at(tip.x, tip.y, tip.z); foamJet.u.uDir.value.copy(aim); foamJet.u.uTime.value = t;
  foamJet.u.uOn0.value = T.gasolina + 0.25; foamJet.u.uOn1.value = T.f[1] - 0.45;
  // la distancia
  dist50.uTime.value = t; dist50.uI.value = sm(T.lejos - 0.2, T.lejos + 0.3, t) * (1 - sm(T.panel - 0.2, T.panel + 0.3, t)); dist50.uGrow.value = e3(pr(t, T.lejos - 0.2, 0.9));
}

// ------------------------------------------------------------------ capa 2D: rótulos, tarjetas, cuentas
function proj(v) { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * W2, y: (-p.y * 0.5 + 0.5) * H2, ok: p.z < 1 }; }
function chip(x, y, text, col, a, s = 1, icon = null, px = 56) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a); g.translate(cl(x, 200, W2 - 200), cl(y, 560, H2 - 260)); g.scale(s, s);
  g.font = `400 ${px}px Bebas`; const tw = g.measureText(text).width, w = tw + (icon ? 100 : 60), h = px * 1.45;
  rr(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  const cx = -w / 2 + 46;
  if (icon === 'ok') { g.beginPath(); g.moveTo(cx - 16, 0); g.lineTo(cx - 4, 13); g.lineTo(cx + 18, -14); g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round'; g.stroke(); }
  else if (icon === 'warn') { g.beginPath(); g.moveTo(cx, -20); g.lineTo(cx + 21, 17); g.lineTo(cx - 21, 17); g.closePath(); g.fillStyle = col; g.fill(); txt('!', cx, 13, 30, '#0b0d10', 400, 'center', 'Bebas'); }
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
function pill(x, y, text, col, a, px = 40) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a); g.font = `400 ${px}px Bebas`; const w = g.measureText(text).width + 44, h = px * 1.4;
  rr(x - w / 2, y - h / 2, w, h, h / 2); g.fillStyle = 'rgba(8,10,14,0.86)'; g.fill(); g.strokeStyle = col; g.lineWidth = 3; g.stroke();
  txt(text, x, y + px * 0.35, px, col, 400, 'center', 'Bebas'); g.restore();
}
const OPTS = [[['A', 'GASÓLEO'], ['B', 'GASOLINA'], ['C', 'PROPANO']],
  [['A', 'BUTANO'], ['B', 'PROPANO'], ['C', 'METANO']],
  [['A', 'ÁCIDO CLORHÍDRICO'], ['B', 'ÁCIDO SULFHÍDRICO'], ['C', 'ÁCIDO SULFÚRICO']]];
const RIGHT = [1, 1, 2];
const OPT4 = [['A', 'GASOLINA'], ['B', 'GASÓLEO'], ['C', 'QUEROSENO'], ['D', 'BUTANO']];
function card(y, L, text, col, a, state, dx = 0) {     // state: 0 normal, 1 bien (verde), 2 mal (tachada)
  if (a <= 0.005) return;
  const w = 820, h = 98, x0 = 540 - w / 2 + dx;
  g.save(); g.globalAlpha = cl(a);
  rr(x0, y - h / 2, w, h, 26); g.fillStyle = state === 1 ? 'rgba(10,46,26,0.92)' : state === 2 ? 'rgba(40,10,10,0.82)' : 'rgba(10,12,16,0.88)'; g.fill();
  g.strokeStyle = state === 1 ? GREEN2 : state === 2 ? 'rgba(255,75,62,0.75)' : 'rgba(255,255,255,0.22)'; g.lineWidth = state === 1 ? 6 : 3; g.stroke();
  g.beginPath(); g.arc(x0 + 58, y, 30, 0, 7); g.fillStyle = state === 1 ? GREEN2 : state === 2 ? RED2 : col; g.fill();
  txt(L, x0 + 58, y + 14, 42, '#0b0d10', 400, 'center', 'Bebas');
  txt(text, x0 + 110, y + 18, 54, state === 2 ? 'rgba(244,246,248,0.55)' : '#F4F6F8', 400, 'left', 'Bebas');
  if (state === 2) { g.beginPath(); g.moveTo(x0 + 104, y + 2); g.lineTo(x0 + w - 30, y + 2); g.strokeStyle = 'rgba(255,75,62,0.9)'; g.lineWidth = 5; g.stroke(); }
  g.restore();
}
function rounds(t) {
  const n = [T.n1, T.n2, T.n3];
  for (let k = 0; k < 3; k++) {
    const t0 = n[k] + 0.1, rv = T.r[k], out = 1 - sm(rv + 0.85, rv + 1.25, t);
    if (t < t0 - 0.1 || out <= 0) continue;
    OPTS[k].forEach(([L, s], i) => {
      const a = sm(t0 + i * 0.12, t0 + i * 0.12 + 0.25, t) * out, dx = (1 - e3(pr(t, t0 + i * 0.12, 0.3))) * 120;
      const st = t >= rv - 0.02 ? (i === RIGHT[k] ? 1 : 2) : 0;
      const pop = st === 1 ? 1 + 0.06 * pulse(t, rv + 0.15, 0.18) : 1;
      g.save(); g.translate(540, 1010 + i * 112); g.scale(pop, pop); g.translate(-540, -(1010 + i * 112));
      card(1010 + i * 112, L, s, COLS[i], a, st, dx); g.restore();
    });
    // cuenta 3-2-1
    const c0 = T.c[k];
    if (t > c0 - 0.02 && t < rv + 0.25) {
      const e = t - c0, nn = Math.max(1, 3 - Math.floor(Math.max(0, e))), f = Math.max(0, e) % 1, kk = cl(e / 3.0), o2 = 1 - sm(rv - 0.05, rv + 0.2, t);
      g.save(); g.globalAlpha = o2 * sm(c0 - 0.05, c0 + 0.1, t); g.translate(540, 1420);
      g.beginPath(); g.arc(0, 0, 76, 0, 7); g.fillStyle = 'rgba(8,10,14,0.8)'; g.fill();
      g.beginPath(); g.arc(0, 0, 76, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - kk)); g.strokeStyle = nn === 1 ? RED2 : '#FF7A1A'; g.lineWidth = 10; g.lineCap = 'round'; g.stroke();
      const s = 1 + 0.4 * Math.pow(1 - f, 5); g.scale(s, s);
      txt(String(nn), 0, 36, 108, nn === 1 ? '#FF6B5E' : '#FFFFFF', 400, 'center', 'Bebas'); g.restore();
    }
  }
}
function panel2D(cx, cy, w, top, bot, a, hi = null) {   // un panel dibujado en la capa 2D (hi: qué cifras resaltar)
  if (a <= 0.005) return;
  const h = w * 0.75;
  g.save(); g.globalAlpha = cl(a); g.translate(cx - w / 2, cy - h / 2);
  g.shadowColor = 'rgba(255,140,40,0.55)'; g.shadowBlur = 40; g.fillStyle = '#F07A1C'; g.fillRect(0, 0, w, h); g.shadowBlur = 0;
  const sc = w / PW; g.scale(sc, sc); drawPanel(g, PW, PH, { top, bot }, 0); g.restore();
  if (hi) {
    g.save(); g.globalAlpha = cl(a);
    const px = h * 0.43, dw = px * 0.5;
    for (const [row, idx] of hi) {
      const s = row ? bot : top, n = s.length, x0 = cx - (n - 1) * dw / 2 + idx * dw, y = cy + (row ? 1 : -1) * h * 0.23;
      rr(x0 - dw * 0.55, y - px * 0.42, dw * 1.1, px * 0.84, 10); g.strokeStyle = GOLD2; g.lineWidth = 6; g.shadowColor = GOLD2; g.shadowBlur = 18; g.stroke(); g.shadowBlur = 0;
    }
    g.restore();
  }
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  // gancho: la cisterna volcada… ¿qué lleva?
  const pt = proj(trailer.localToWorld(V(0, TR, -TR - 0.4)));
  chip(pt.x, pt.y - 120, 'CISTERNA VOLCADA', RED2, pt.ok ? sm(-0.2, 0.0, t) * (1 - sm(T.lejos - 0.55, T.lejos - 0.25, t)) : 0, 1, 'warn', 56);
  pill(540, 1180, '¿QUÉ LLEVA?', GOLD2, sm(-0.2, 0.0, t) * (1 - sm(T.lejos - 0.45, T.lejos - 0.15, t)), 64);
  // lejos y con el viento a favor
  const pm = proj(V((YOU0.x + CAB.x) / 2, 0.3, (YOU0.z + CAB.z) / 2 + 0.6));
  chip(pm.x, pm.y, 'DESDE LEJOS', GOLD2, pm.ok ? sm(T.lejos - 0.1, T.lejos + 0.2, t) * (1 - sm(T.panel - 0.3, T.panel, t)) : 0, 1, null, 56);
  const py = proj(you.position.clone().add(V(0, 2.4, 0)));
  chip(py.x, py.y, 'TÚ · VIENTO A FAVOR', GOLD2, py.ok && t < T.mv[0] ? sm(T.lejos + 0.2, T.lejos + 0.5, t) * (1 - sm(T.panel - 0.3, T.panel, t)) : 0, 0.9, null, 46);
  // el panel: arriba el peligro, abajo QUÉ LLEVA (nº ONU)
  const pT = proj(PANEL_W.clone().add(V(0, 0.075, 0))), pB = proj(PANEL_W.clone().add(V(0, -0.075, 0)));
  chip(540, 640, 'PANEL NARANJA', ORANGE2, sm(T.panel - 0.1, T.panel + 0.2, t) * (1 - sm(T.abajo - 0.2, T.abajo, t)), 1, null, 60);
  const la = sm(T.abajo - 0.1, T.abajo + 0.2, t) * (1 - sm(T.n1 + 0.4, T.n1 + 0.8, t));
  if (pT.ok && la > 0) {
    chip(pT.x - 300, pT.y - 40, 'PELIGRO', 'rgba(255,255,255,0.6)', la * 0.8, 0.85, null, 44);
    chip(pB.x - 300, pB.y + 60, 'QUÉ LLEVA · Nº ONU', GOLD2, la, 1.05 + 0.08 * pulse(t, T.abajo + 0.2, 0.25), null, 50);
  }
  // las tres rondas
  rounds(t);
  const pp = proj(V(PUD.x, 0.4, PUD.z));
  chip(pp.x, pp.y - 140, 'ARDE CON UNA CHISPA', RED2, pp.ok ? sm(T.chispa - 0.1, T.chispa + 0.2, t) * (1 - sm(T.espuma - 0.4, T.espuma - 0.1, t)) : 0, 1, 'warn', 54);
  chip(pp.x, pp.y - 140, 'ESPUMA ENCIMA', GREEN2, pp.ok ? sm(T.espuma - 0.1, T.espuma + 0.2, t) * (1 - sm(T.n2 - 0.6, T.n2 - 0.3, t)) : 0, 1, 'ok', 54);
  stamp('¡PUEDE REVENTAR!', 760, RED2, sm(T.reventar - 0.1, T.reventar + 0.15, t) * (1 - sm(T.enfria - 0.2, T.enfria + 0.1, t)), 140, -0.05);
  const pmn = proj(MON.clone().add(V(0, 2.2, 0)));
  chip(pmn.x, pmn.y, 'ENFRIAR DESDE LEJOS', GREEN2, pmn.ok ? sm(T.enfria, T.enfria + 0.3, t) * (1 - sm(T.n3 - 0.6, T.n3 - 0.3, t)) : 0, 1, 'ok', 54);
  chip(pp.x, pp.y - 160, 'QUEMA LA PIEL', RED2, pp.ok ? sm(T.piel - 0.1, T.piel + 0.2, t) * (1 - sm(T.traje - 0.3, T.traje, t)) : 0, 1, 'warn', 54);
  const pc = proj(YOU1.clone().add(V(0, 2.35, 0)));
  chip(pc.x, pc.y, 'TRAJE DE PROTECCIÓN QUÍMICA', GREEN2, pc.ok ? sm(T.quimico - 0.1, T.quimico + 0.2, t) * (1 - sm(T.trampa - 0.4, T.trampa - 0.1, t)) : 0, 1, 'ok', 50);
  // la trampa: 1202 junto al 1203
  const ta = sm(T.n4 - 0.1, T.n4 + 0.25, t) * (1 - sm(T.quelleva - 0.2, T.quelleva + 0.2, t));
  if (ta > 0) {
    const sl = e3(pr(t, T.uno - 0.2, 0.5));
    panel2D(mx(540, 290, sl), 720, 420, '33', '1203', ta * sl, null);
    g.save(); g.globalAlpha = ta * sl; txt('GASOLINA', 290, 965, 60, '#F4F6F8', 400, 'center', 'Bebas'); g.restore();
    panel2D(mx(540, 790, sl), 720, mx(560, 420, sl), '30', '1202', ta, sl > 0.5 ? [[1, 3], [0, 1]] : null);
    g.save(); g.globalAlpha = ta * sl; txt('¿?', 790, 975, 76, GOLD2, 400, 'center', 'Bebas'); g.restore();
    g.save(); g.globalAlpha = ta * sl * pulse(t, T.gasolina2 + 0.2, 0.5); txt('−1', 540, 745, 110, GOLD2, 400, 'center', 'Bebas'); g.restore();
  }
  // las cuatro letras y «comenta tu letra»
  const fa = 1 - sm(T.fin - 0.3, T.fin + 0.05, t);
  OPT4.forEach(([L, s], i) => {
    const t0 = [T.oA, T.oB, T.oC, T.oD][i] - 0.05, a = sm(t0, t0 + 0.2, t) * fa, dx = (1 - e3(pr(t, t0, 0.3))) * 120;
    card(980 + i * 110, L, s, COLS[i], a, 0, dx);
  });
  const ce = sm(T.comenta - 0.15, T.comenta + 0.15, t) * fa;
  if (ce > 0) {
    const b = 1 + 0.05 * Math.max(0, Math.sin((t - T.comenta) * 6));
    g.save(); g.globalAlpha = ce; g.translate(540, 1460); g.scale(b, b); rr(-330, -56, 660, 112, 56); g.fillStyle = 'rgba(8,10,14,0.86)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('💬  COMENTA TU LETRA', 0, 20, 58, '#F2F5F8', 400, 'center', 'Bebas'); g.restore();
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
  const fl = Math.max(...[T.gasolina, T.propano, T.acido].map(x => Math.exp(-Math.pow((t - x - 0.03) / 0.07, 2)) * 0.16), Math.exp(-Math.pow((t - T.reventar - 0.03) / 0.08, 2)) * 0.22);
  finMat.uniforms.uFlash.value = fl; finMat.uniforms.uFlashCol.value.setRGB(1, 0.6, 0.3);
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
    PANEL_W = cab.localToWorld(V(-0.935, 1.17, 0)); PANEL_N = V(-Math.cos(CAB.yaw), 0, Math.sin(CAB.yaw));
    setupTimes();
    const mh = hoseMesh([truck.localToWorld(V(1.8, 0.95, 1.3)), V(-33.5, 0.07, 1.4), V(-26, 0.07, 5.0), V(-19, 0.07, 6.3), MON.clone().add(V(-0.45, 0.07, 0.1)), MON.clone().add(V(0, 0.9, 0))]);
    mh.mesh.castShadow = false; world.add(mh.mesh); monHose = mh.mesh;
    hoseUpdate();
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'paneles: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
