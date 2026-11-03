// «¿Qué significa 21A-113B?» — Pregunta del día CINEMATOGRÁFICA (Bomberados, 4 nov).
// three.js (luz de estudio, pintura con barniz, profundidad de campo, resplandor, desenfoque de movimiento por
// subfotogramas, cámara lenta con rampas de velocidad) + la capa 2D de scene.js para cuenta atrás, rótulos y venta.
// Todo es función del tiempo t (cada fotograma se puede renderizar suelto, en cualquier orden y en cualquier máquina).
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
const LW = 1108;   // ancho del lienzo de la etiqueta (alto 1920): 0,156 m × 0,27 m
function labelTex(rating, kg, S) {
  return canvasTex(LW * S, 1920 * S, (x) => {
    x.scale(S, S); const W = LW, Hh = 1920;
    const g0 = x.createLinearGradient(0, 0, 0, Hh); g0.addColorStop(0, '#efebe3'); g0.addColorStop(1, '#e2ddd1');
    x.fillStyle = g0; x.fillRect(0, 0, W, Hh);
    x.fillStyle = '#c3161c'; x.fillRect(0, 0, W, 250);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '400 200px Bebas'; x.fillText('EXTINTOR', W / 2, 205);
    x.fillStyle = '#16181c'; x.font = '400 128px Bebas'; x.fillText('DE POLVO ABC · ' + kg, W / 2, 405);
    x.font = '700 40px Inter'; x.fillStyle = '#4a4d55'; x.fillText('EFICACIA', W / 2, 482);
    rrect(x, 60, 505, W - 120, 300, 34); x.fillStyle = '#121418'; x.fill();
    x.fillStyle = '#fff'; fitText(x, rating, W - 200, 250, 'Impact'); x.fillText(rating, W / 2, 745);
    const icons = [['A', 'SÓLIDOS'], ['B', 'LÍQUIDOS'], ['C', 'GASES']];
    icons.forEach(([L, cap], i) => {
      const cx = 200 + i * 354, cy = 1035, s = 300;
      rrect(x, cx - s / 2, cy - s / 2, s, s, 22); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 12; x.strokeStyle = '#16181c'; x.stroke();
      x.fillStyle = '#16181c'; x.font = '400 110px Impact'; x.textAlign = 'left'; x.fillText(L, cx - s / 2 + 20, cy - s / 2 + 112);
      x.textAlign = 'center';
      if (L === 'A') { x.save(); x.translate(cx + 20, cy + 90); for (const a of [-0.35, 0.35]) { x.save(); x.rotate(a); rrect(x, -88, -15, 176, 30, 13); x.fillStyle = '#7a4a22'; x.fill(); x.restore(); } x.restore(); flameIcon(x, cx + 22, cy + 16, 1.05); }
      else if (L === 'B') { rrect(x, cx - 6, cy - 36, 86, 112, 10); x.fillStyle = '#3a3d44'; x.fill(); x.fillStyle = '#16181c'; x.fillRect(cx + 50, cy - 54, 24, 18); x.beginPath(); x.ellipse(cx - 8, cy + 104, 110, 20, 0, 0, 7); x.fillStyle = '#3a3d44'; x.fill(); flameIcon(x, cx - 50, cy + 38, 0.9); }
      else { rrect(x, cx - 12, cy - 46, 94, 150, 38); x.fillStyle = '#3a3d44'; x.fill(); x.fillRect(cx + 22, cy - 68, 26, 24); flameIcon(x, cx - 64, cy + 38, 0.9); }
      x.fillStyle = '#16181c'; x.font = '800 38px Inter'; x.fillText(cap, cx, cy + s / 2 + 48);
    });
    x.fillStyle = '#16181c'; x.font = '400 92px Bebas'; x.textAlign = 'left'; x.fillText('MODO DE EMPLEO', 80, 1400);
    ['Quita la anilla', 'Apunta a la base del fuego', 'Aprieta la palanca'].forEach((s, i) => {
      const y = 1490 + i * 108;
      x.beginPath(); x.arc(116, y - 20, 36, 0, 7); x.fillStyle = '#c3161c'; x.fill();
      x.fillStyle = '#fff'; x.font = '400 56px Impact'; x.textAlign = 'center'; x.fillText(String(i + 1), 116, y);
      x.fillStyle = '#16181c'; x.font = '700 54px Inter'; x.textAlign = 'left'; x.fillText(s, 176, y);
    });
    x.fillStyle = '#5b5f68'; x.font = '600 34px Inter'; x.textAlign = 'center'; x.fillText('UNE-EN 3-7 · Uso: −20 °C / +60 °C', W / 2, 1855);
  }, { aniso: S > 1 ? 4 : 2 });
}
function glowTex(rating) {           // el código, solo, para que se encienda
  return canvasTex(LW, 1920, (x) => {
    x.textAlign = 'center'; fitText(x, rating, LW - 200, 250, 'Impact');
    x.shadowColor = '#ffb347'; x.shadowBlur = 36; x.fillStyle = '#ffcf73'; x.fillText(rating, LW / 2, 745);
    x.shadowBlur = 0; x.fillStyle = '#fff1d0'; x.fillText(rating, LW / 2, 745);
  });
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

// ------------------------------------------------------------------ el extintor (6 kg, polvo ABC); base en y = 0, etiqueta hacia +Z
const ER = 0.08, CODE_Y = 0.10 + (1 - 655 / 1920) * 0.27, LABEL_TH = Math.PI * 0.62;
function makeExtinguisher(rating, kg, opts = {}) {
  const grp = new THREE.Group();
  const P = [];
  P.push(new THREE.Vector2(0.0001, 0.012), new THREE.Vector2(ER * 0.9, 0.012), new THREE.Vector2(ER * 0.985, 0.022), new THREE.Vector2(ER, 0.04), new THREE.Vector2(ER, 0.44));
  for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI / 2; P.push(new THREE.Vector2(0.03 + (ER - 0.03) * Math.cos(a), 0.44 + 0.085 * Math.sin(a))); }
  P.push(new THREE.Vector2(0.027, 0.53), new THREE.Vector2(0.027, 0.548), new THREE.Vector2(0.0001, 0.548));
  const body = new THREE.Mesh(new THREE.LatheGeometry(P, 96), M.paint); body.castShadow = true; grp.add(body);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(ER * 1.015, ER * 1.015, 0.034, 64), M.black); foot.position.y = 0.017; foot.castShadow = true; grp.add(foot);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(ER + 0.0007, ER + 0.0007, 0.27, 96, 1, true, -LABEL_TH / 2, LABEL_TH),
    new THREE.MeshPhysicalMaterial({ map: labelTex(rating, kg, opts.small ? 0.5 : 2), roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.2 }));
  label.position.y = 0.235; grp.add(label);
  let glow = null;
  if (!opts.small) {
    glow = new THREE.Mesh(new THREE.CylinderGeometry(ER + 0.0012, ER + 0.0012, 0.27, 96, 1, true, -LABEL_TH / 2, LABEL_TH),
      new THREE.MeshBasicMaterial({ map: glowTex(rating), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 }));
    glow.material.color.setScalar(0.85); glow.position.y = 0.235; glow.renderOrder = 5; grp.add(glow);
  }
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.022, 48), M.chrome); collar.position.y = 0.558; grp.add(collar);
  const valve = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.055, 0.046, 4, 0.008), M.chrome); valve.position.y = 0.595; valve.castShadow = true; grp.add(valve);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.04, 24), M.chrome); spout.rotation.z = Math.PI / 2; spout.position.set(0.038, 0.588, 0); grp.add(spout);
  const dial = canvasTex(256, 256, (x) => {
    x.fillStyle = '#f4f4f0'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill();
    x.lineWidth = 26; x.strokeStyle = '#d33'; x.beginPath(); x.arc(128, 140, 84, Math.PI * 1.1, Math.PI * 1.35); x.stroke();
    x.strokeStyle = '#2bb24c'; x.beginPath(); x.arc(128, 140, 84, Math.PI * 1.38, Math.PI * 1.62); x.stroke();
    x.strokeStyle = '#d33'; x.beginPath(); x.arc(128, 140, 84, Math.PI * 1.65, Math.PI * 1.9); x.stroke();
    x.strokeStyle = '#111'; x.lineWidth = 7; x.beginPath(); x.moveTo(128, 140); x.lineTo(128 + 70 * Math.cos(Math.PI * 1.52), 140 + 70 * Math.sin(Math.PI * 1.52)); x.stroke();
    x.fillStyle = '#111'; x.beginPath(); x.arc(128, 140, 12, 0, 7); x.fill(); x.font = '700 30px Inter'; x.textAlign = 'center'; x.fillText('bar', 128, 210);
  });
  const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.01, 40), [M.chrome, new THREE.MeshStandardMaterial({ map: dial, roughness: 0.25 }), M.chrome]);
  gauge.rotation.x = Math.PI / 2; gauge.position.set(0, 0.6, 0.028); grp.add(gauge);
  const handle = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.012, 0.026, 2, 0.005), M.black); handle.position.set(-0.07, 0.585, 0); grp.add(handle);
  const lever = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.012, 0.026, 2, 0.005), M.black); lever.position.set(-0.066, 0.632, 0); lever.rotation.z = -0.22; grp.add(lever);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.0028, 12, 40), M.yellow); ring.position.set(-0.012, 0.61, 0.03); grp.add(ring);
  const hp = opts.aim ? [V(0.058, 0.588, 0), V(0.12, 0.56, 0.03), V(0.19, 0.46, 0.1), opts.aim.clone().multiplyScalar(0.5).add(V(0.1, 0.3, 0.12)), opts.aim]
    : [V(0.058, 0.588, 0), V(0.1, 0.55, 0.01), V(0.098, 0.4, 0.03), V(0.092, 0.2, 0.035), V(0.09, 0.08, 0.03)];
  const curve = new THREE.CatmullRomCurve3(hp);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.0085, 14, false), M.rubber); hose.castShadow = true; grp.add(hose);
  const end = curve.getPoint(1), dir = curve.getTangent(1).normalize();
  const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.014, 0.05, 24), M.black);
  noz.position.copy(end).addScaledVector(dir, 0.022); noz.quaternion.setFromUnitVectors(V(0, 1, 0), dir); grp.add(noz);
  grp.userData = { glow, nozzle: end.clone().addScaledVector(dir, 0.05), nozzleDir: dir };
  return grp;
}

// ------------------------------------------------------------------ escenarios
const studio = new THREE.Group(), lab = new THREE.Group(); scene.add(studio, lab);
const LAB = V(0, 0, -60); lab.position.copy(LAB);
const LP = (x, y, z) => V(x, y, z).add(LAB);
const HERO_POS = V(0, 0.36, 0), HERO_ROT = 0.38, FIRE0 = V(0.2, 0, 0.36);
let hero, heroFire, heroPowder, ring15, ringTxt, cards = [], dust, fireLight, cone;
let crib, cribBase = [], nozzleProp, cribFire, jet, tape, tapeTex, cribLights = [], title21, cap21;
let trayFire, trayLight, gauge, water, hept, title113, capL, title113B, rateExt, rateFire, rateLight, rateTitles = [];

function buildStudio() {
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.88, metalness: 0.0, envMapIntensity: 0.08 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; studio.add(floor);
  const ref = new THREE.Object3D(); ref.position.copy(HERO_POS); ref.rotation.set(0, HERO_ROT, -0.05); ref.updateMatrixWorld(true);
  hero = makeExtinguisher('21A-113B', '6 KG', { aim: ref.worldToLocal(V(FIRE0.x + 0.06, 0.3, FIRE0.z - 0.02)) });
  hero.position.copy(HERO_POS); hero.rotation.set(0, HERO_ROT, -0.05); studio.add(hero); hero.updateMatrixWorld(true);
  // pila pequeña ardiendo en el suelo, que el chorro está apagando
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.032, 0.032), new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.9 }));
    s.position.set(FIRE0.x, 0.018 + Math.floor(i / 3) * 0.032, FIRE0.z + ((i % 3) - 1) * 0.08); s.rotation.y = Math.floor(i / 3) % 2 ? Math.PI / 2 : 0; s.castShadow = true; studio.add(s);
  }
  heroFire = fireSet(studio, FIRE0, tongues(5, 3, (i, r) => [FIRE0.x + (r(1) - 0.5) * 0.2, 0.04, FIRE0.z + (r(2) - 0.5) * 0.2, 0.14 + 0.06 * r(3), 0.26 + 0.18 * r(4)]),
    { seed: 3, extent: [0.13, 0.03, 0.13], smokeN: 10, smokeSize: 0.16, smokeY: 0.35, emberN: 26, bright: 1.05 });
  heroPowder = new Parts(300, { jet: true, life: 1.6, v0: 2.2, drag: 3.2, size: 0.11, grow: 1.3, spreadA: 0.35, spreadB: 0.1, grav: 0.0, rise: 0.03, opacity: 0.5, edge: 0.7, c: POWDER_C, seed: 21, order: 14, floor: 0.03 });
  const nz = hero.localToWorld(hero.userData.nozzle.clone()), tgt = V(FIRE0.x + 0.02, 0.04, FIRE0.z + 0.05);
  heroPowder.at(nz.x, nz.y, nz.z); heroPowder.u.uDir.value.copy(tgt.clone().sub(nz).normalize()); studio.add(heroPowder.mesh);
  const key = new THREE.SpotLight(0xffe3c8, 30, 0, 0.42, 0.75, 2); key.position.set(-1.5, 3.3, 2.1); key.target.position.set(0.1, 0.45, 0.1);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; studio.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x6aa4ff, 1.0); rim.position.set(2.2, 2.0, -2.6); studio.add(rim);
  const rim2 = new THREE.DirectionalLight(0xff8a4a, 0.45); rim2.position.set(-2.5, 0.8, -1.5); studio.add(rim2);
  fireLight = new THREE.PointLight(0xff7a2a, 1.6, 0, 2); fireLight.position.set(FIRE0.x, 0.3, FIRE0.z); studio.add(fireLight);
  cone = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 1.1, 4.0, 48, 1, true), new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0.05 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uA; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float e = pow(abs(dot(vN, vV)), 1.6); gl_FragColor = vec4(vec3(1.0, 0.86, 0.68) * uA * e * smoothstep(0.0, 0.6, vY) * (0.35 + 0.65 * vY), 1.0); }' }));
  const kd = key.target.position.clone().sub(key.position);
  cone.position.copy(key.position).addScaledVector(kd.clone().normalize(), 2.0); cone.quaternion.setFromUnitVectors(V(0, 1, 0), kd.clone().normalize().negate());
  cone.renderOrder = 4; NODOF.push(cone); studio.add(cone);
  ring15 = new THREE.Mesh(new THREE.RingGeometry(0.985, 1.0, 128), new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  ring15.material.color.setRGB(0.5, 1.8, 2.4); ring15.rotation.x = -Math.PI / 2; ring15.position.set(HERO_POS.x, 0.004, HERO_POS.z); ring15.renderOrder = 6; studio.add(ring15);
  ringTxt = titleMesh([['A MENOS DE 15 METROS', 190, 'Bebas', '#c8f4ff']], 0.62, { h: 260, hdr: 1.4 }); studio.add(ringTxt);
  const dg = new THREE.BufferGeometry(), dn = 220, dp = new Float32Array(dn * 3);
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dot = canvasTex(64, 64, (x) => { const gg = x.createRadialGradient(32, 32, 0, 32, 32, 32); gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gg; x.fillRect(0, 0, 64, 64); });
  dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffe2b8, map: dot, size: 0.004, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  dust.frustumCulled = false; dust.userData.n = dn; studio.add(dust);
  const OPTS = [['A', '2,1 m de madera y 113 L en llamas', '#2DD4BF'], ['B', '21 kg de polvo y 113 bar de presión', '#FF7A1A'],
    ['C', 'Apaga 21 m² y 113 m² de fuego', '#F0457A'], ['D', 'Fabricado en 2021, lote 113B', '#8B7CF6']];
  OPTS.forEach(([L, s, col], i) => {
    const mk = ok => canvasTex(1150, 250, (x) => {
      rrect(x, 6, 6, 1138, 238, 46); x.fillStyle = ok ? 'rgba(10,40,26,0.92)' : 'rgba(9,12,17,0.84)'; x.fill();
      x.lineWidth = ok ? 10 : 4; x.strokeStyle = ok ? '#3ef08a' : 'rgba(255,255,255,0.24)'; x.stroke();
      x.beginPath(); x.arc(125, 125, 74, 0, 7); x.fillStyle = ok ? '#3ef08a' : col; x.fill();
      x.fillStyle = '#0b0d10'; x.font = '400 104px Bebas'; x.textAlign = 'center'; x.fillText(ok ? '✓' : L, 125, 162);
      x.fillStyle = '#F2F5F8'; x.textAlign = 'left'; const px = fitText(x, s, 880, 64, 'Inter', 800); x.fillText(s, 225, 125 + px * 0.36);
    }, { aniso: 2 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.238, 0.238 * 250 / 1150), new THREE.MeshBasicMaterial({ map: mk(false), transparent: true, depthWrite: true, alphaTest: 0.02, fog: false }));
    m.renderOrder = 20; m.userData = { tN: m.material.map, tOk: i === 0 ? mk(true) : null }; NODOF.push(m); studio.add(m); cards.push(m);
  });
}

function buildLab() {
  const conc = canvasTex(512, 512, (x) => { x.fillStyle = '#2a2b2d'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 9000; i++) { const v = 30 + rnd(i) * 40; x.fillStyle = `rgba(${v},${v},${v + 2},0.5)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } });
  conc.wrapS = conc.wrapT = THREE.RepeatWrapping; conc.repeat.set(14, 14);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: conc, color: 0x9a9a9a, roughness: 0.8, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; lab.add(floor);
  lab.add(new THREE.HemisphereLight(0x8fa3c0, 0x1a1410, 0.22));
  const top = new THREE.DirectionalLight(0xc8d8ff, 0.3); top.position.set(-3, 6, 4); lab.add(top);
  // pila de madera del ensayo 21A: listones de 39 mm; capas transversales de 21 listones de 500 mm → 2,1 m de largo
  for (const [x, z] of [[-1.07, -0.27], [1.07, -0.27], [-1.07, 0.27], [1.07, 0.27]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.04), M.steel); l.position.set(x, 0.125, z); lab.add(l); }
  for (const z of [-0.27, 0.27]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.03, 0.04), M.steel); b.position.set(0, 0.235, z); lab.add(b); }
  const wood = canvasTex(512, 64, (x) => { x.fillStyle = '#c99a62'; x.fillRect(0, 0, 512, 64); for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(110,70,35,${0.15 + rnd(i) * 0.3})`; x.lineWidth = 1 + rnd(i * 2) * 2; x.beginPath(); const y = rnd(i * 3) * 64; x.moveTo(0, y); x.bezierCurveTo(170, y + 6 * (rnd(i * 5) - 0.5), 340, y - 6 * (rnd(i * 7) - 0.5), 512, y); x.stroke(); } });
  const sticks = [];
  for (let L = 0; L < 14; L++) {
    const y = 0.25 + 0.0195 + L * 0.039;
    if (L % 2 === 0) for (let j = 0; j < 21; j++) sticks.push([-1.05 + (j + 0.5) * 0.1, y, 0, 0.039, 0.039, 0.5]);
    else for (let j = 0; j < 5; j++) sticks.push([0, y, -0.2 + j * 0.1, 2.1, 0.039, 0.039]);
  }
  crib = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.85 }), sticks.length);
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  sticks.forEach((s, i) => { m4.compose(V(s[0], s[1], s[2]), new THREE.Quaternion(), V(s[3], s[4], s[5])); crib.setMatrixAt(i, m4); const k = 0.8 + 0.35 * rnd(i * 9.1); cribBase.push([k, s[0], s[1]]); crib.setColorAt(i, c.setRGB(k, k, k)); });
  crib.castShadow = true; crib.receiveShadow = true; lab.add(crib);
  const CR = V(0, 0.3, 0);
  cribFire = fireSet(lab, CR, [
    ...tongues(16, 41, (i, r) => [-1.0 + i * 0.133 + (r(1) - 0.5) * 0.06, 0.32, -0.06 + (r(2) - 0.5) * 0.06, 0.34 + 0.12 * r(3), 1.05 + 0.75 * r(4)]),
    ...tongues(12, 47, (i, r) => [-0.92 + i * 0.167 + (r(1) - 0.5) * 0.08, 0.36, 0.12 + (r(2) - 0.5) * 0.06, 0.28 + 0.1 * r(3), 0.8 + 0.5 * r(4)]),
  ], { seed: 41, extent: [1.0, 0.1, 0.2], smokeN: 26, smokeSize: 0.5, smokeY: 1.4, emberN: 60, bright: 1.15 });
  for (const x of [-0.75, 0, 0.75]) { const l = new THREE.PointLight(0xff7024, 4, 0, 2); l.position.set(x, 1.15, 0.25); cribLights.push(l); lab.add(l); }
  // boquilla que entra por la izquierda y el chorro de polvo
  nozzleProp = new THREE.Group();
  const hc = new THREE.CatmullRomCurve3([V(-1.7, 1.35, 1.7), V(-1.15, 1.02, 1.42), V(-0.8, 0.86, 1.18), V(-0.58, 0.79, 0.98)]);
  nozzleProp.add(new THREE.Mesh(new THREE.TubeGeometry(hc, 40, 0.014, 12), M.rubber));
  const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.024, 0.09, 24), M.black);
  const nd = hc.getTangent(1).normalize(); nz.position.copy(hc.getPoint(1)).addScaledVector(nd, 0.04); nz.quaternion.setFromUnitVectors(V(0, 1, 0), nd); nozzleProp.add(nz);
  nozzleProp.userData = { tip: hc.getPoint(1).addScaledVector(nd, 0.09) };
  lab.add(nozzleProp);
  jet = new Parts(360, { jet: true, life: 1.9, v0: 5.2, drag: 1.9, size: 0.14, grow: 0.95, spreadA: 0.3, spreadB: 0.2, rise: 0.05, opacity: 0.55, edge: 0.7, c: POWDER_C, seed: 61, order: 14, floor: 0.04 });
  lab.add(jet.mesh);
  tapeTex = canvasTex(4200, 128, (x) => {
    x.fillStyle = '#f2c21a'; x.fillRect(0, 0, 4200, 128); x.fillStyle = '#16181c';
    for (let mm = 0; mm <= 2100; mm += 10) { const X = mm * 2, l = mm % 100 === 0 ? 64 : mm % 50 === 0 ? 44 : 24; x.fillRect(X - 2, 0, 4, l); }
    x.font = '700 46px Inter'; x.textAlign = 'center';
    for (let m = 100; m < 2100; m += 100) x.fillText((m / 1000).toFixed(1).replace('.', ','), m * 2, 112);
  }, { aniso: 2 });
  tape = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1 * 128 / 4200), new THREE.MeshStandardMaterial({ map: tapeTex, roughness: 0.4 }));
  tape.geometry.translate(1.05, 0, 0); tape.rotation.x = -Math.PI / 2 + 0.35; tape.position.set(-1.05, 0.27, 0.36); lab.add(tape);
  title21 = titleMesh([['21A', 330, 'Impact', 'fire']], 1.15, { h: 400 }); lab.add(title21);
  cap21 = titleMesh([['= 2,10 m DE MADERA', 120, 'Bebas', '#ffffff']], 0.95, { h: 180, hdr: 1.1 }); lab.add(cap21);
  // bandeja del ensayo 113B: 113 litros (2/3 heptano + 1/3 agua)
  const TR = V(4.3, 0, -0.5);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.065, 1.065, 0.2, 96, 1, true), new THREE.MeshStandardMaterial({ color: 0x3d4148, metalness: 0.8, roughness: 0.5, side: THREE.DoubleSide }));
  wall.position.set(TR.x, 0.1, TR.z); lab.add(wall);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.065, 0.012, 8, 96), M.steel); lip.rotation.x = Math.PI / 2; lip.position.set(TR.x, 0.2, TR.z); lab.add(lip);
  const liq = new THREE.Mesh(new THREE.CircleGeometry(1.06, 96), new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 0.06, metalness: 0.2 }));
  liq.rotation.x = -Math.PI / 2; liq.position.set(TR.x, 0.12, TR.z); lab.add(liq);
  trayFire = fireSet(lab, V(TR.x, 0.12, TR.z), tongues(16, 77, (i, r) => { const a = i / 16 * 6.283 + r(1) * 0.3, d = 0.25 + 0.65 * Math.sqrt(r(2)); return [TR.x + Math.cos(a) * d, 0.12, TR.z + Math.sin(a) * d, 0.42 + 0.22 * r(3), 1.2 + 1.2 * r(4) * (1.15 - 0.5 * d)]; }),
    { seed: 77, disc: true, extent: [0.95, 0.05, 0.95], smokeN: 30, smokeSize: 0.75, smokeY: 2.3, emberN: 60, bright: 0.85 });
  trayLight = new THREE.PointLight(0xff6a20, 9, 0, 2); trayLight.position.set(TR.x, 1.4, TR.z + 0.6); lab.add(trayLight);
  // probeta a escala real con 113 litros: radio 0,18 m y 1,11 m de alto (⅓ agua abajo, ⅔ heptano arriba)
  gauge = new THREE.Group(); gauge.position.set(2.98, 0, 1.6);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 1.16, 64, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.16, side: THREE.DoubleSide, clearcoat: 1, depthWrite: false }));
  glass.position.y = 0.58; gauge.add(glass);
  water = new THREE.Mesh(new THREE.CylinderGeometry(0.178, 0.178, 1, 64), new THREE.MeshStandardMaterial({ color: 0x2a6fd0, roughness: 0.15, emissive: 0x0a2a60, emissiveIntensity: 0.7 }));
  hept = new THREE.Mesh(new THREE.CylinderGeometry(0.178, 0.178, 1, 64), new THREE.MeshStandardMaterial({ color: 0xe0a02c, roughness: 0.12, emissive: 0x5a3200, emissiveIntensity: 0.8 }));
  gauge.add(water, hept); lab.add(gauge);
  title113 = titleMesh([['113 L', 250, 'Impact', 'fire'], ['⅔ HEPTANO + ⅓ AGUA', 112, 'Bebas', '#ffffff']], 0.62, { h: 470, plate: true, y0: 30 }); lab.add(title113);
  capL = titleMesh([[' ', 10, 'Bebas', '#ffffff']], 0.1, { h: 20 }); lab.add(capL);
  title113B = titleMesh([['113B', 330, 'Impact', 'fire']], 1.25, { h: 400 }); lab.add(title113B);
  // más número → más fuego: un extintor delante de un fuego que crece
  rateExt = makeExtinguisher('21A-113B', '6 KG', { small: true }); rateExt.position.set(-7, 0, 0.7); rateExt.rotation.y = 0.25; lab.add(rateExt);
  const RF = V(-7, 0.02, -1.3);
  rateFire = fireSet(lab, RF, tongues(14, 91, (i, r) => { const x = -0.95 + i * 0.146 + (r(1) - 0.5) * 0.1; return [x, 0.0, (r(2) - 0.5) * 0.4, 0.34 + 0.18 * r(3), (0.55 + 0.85 * r(4)) * (1.1 - 0.55 * Math.abs(x) / 0.95)]; }),
    { seed: 91, extent: [0.95, 0.05, 0.3], smokeN: 24, smokeSize: 0.6, smokeY: 1.5, emberN: 50, bright: 0.95 });
  rateFire.F.mesh.position.set(RF.x, RF.y, RF.z);
  rateLight = new THREE.PointLight(0xff6a20, 5, 0, 2); rateLight.position.set(-7, 1.0, -0.6); lab.add(rateLight);
  for (const r of ['8A-34B', '13A-89B', '21A-113B', '34A-183B', '43A-233B']) { const m = titleMesh([[r, 260, 'Impact', 'fire']], 1.1, { h: 330 }); rateTitles.push(m); lab.add(m); }
}

// ------------------------------------------------------------------ tiempos
let T = {}, TW = {}, LABKEYS = null;
function setupTimes() {
  const L = window.LINES_;
  T = { ...CUE, l3: L[2].end, l4: L[3].start, end: END };
  T.count0 = T.l3 + 0.05; T.count1 = T.l4 - 0.05;
  T.w1 = T.leerlo - 0.1; T.macro = T.w1 + 0.5;
  T.out = Math.max(T.codigo + 0.55, T.macro + 1.3); T.cardsIn = T.out + 0.3;
  T.lab = T.esla + 0.62; T.w2 = T.bandeja - 0.3; T.w3 = T.cuanto - 0.25; T.fin = T.compartir - 0.2;
  TW.hero = warp([[0, 0], [T.nadie - 0.1, 0], [T.nadie + 0.5, 0.22], [T.out, 0.22], [T.out + 0.6, 1]], 0.55);
  TW.crib = warp([[T.lab, 1], [T.apago - 0.35, 1], [T.apago - 0.1, 0.28], [T.apago + 0.75, 0.28], [T.apago + 1.05, 1]], 40);
  T.hitCrib = TW.crib(T.apago + 0.05);
  LABKEYS = labKeys();
}

// ------------------------------------------------------------------ cámara
const _m = new THREE.Matrix4();
function pose(p, tgt, fov, focus, ap) { _m.lookAt(p, tgt, V(0, 1, 0)); return { p: p.clone(), q: new THREE.Quaternion().setFromRotationMatrix(_m), fov, focus: focus ?? p.distanceTo(tgt), ap: ap ?? 0 }; }
function blend(a, b, k) { return { p: a.p.clone().lerp(b.p, k), q: a.q.clone().slerp(b.q, k), fov: mx(a.fov, b.fov, k), focus: mx(a.focus, b.focus, k), ap: mx(a.ap, b.ap, k) }; }
function heroPt(x, y, z) { return hero.localToWorld(V(x, y, z)); }
const C0 = V(0.1, 0.46, 0.18);
function camHook(t) {
  const k = e3(pr(t, 0, T.w1 + 0.15)), az = mx(-0.55, 0.5, k), r = mx(2.35, 2.0, k), y = mx(0.95, 0.62, k);
  return pose(V(C0.x + Math.sin(az) * r, y, C0.z + Math.cos(az) * r), V(C0.x + 0.02, mx(0.46, 0.5, k), C0.z), 30, null, 1.3);
}
function camMacro(t) {
  const k = e3(pr(t, T.macro, T.out + 0.25 - T.macro)), kc = e3(pr(t, T.macro, T.codigo + 0.1 - T.macro)), a = mx(-0.36, 0.04, kc) + 0.06 * k, d = mx(0.2, 0.45, kc) + 0.03 * k;
  const p = heroPt(Math.sin(a) * (ER + d), CODE_Y + 0.003, Math.cos(a) * (ER + d));
  const q = heroPt(Math.sin(a) * ER * 0.3, CODE_Y, Math.cos(a) * ER * 0.3);
  return pose(p, q, 26, d + 0.004, 7);
}
const CARD_Y = HERO_POS.y + 0.43, CARD_Z = 0.6;
function camCards(t) {
  const k = e3(pr(t, T.out, T.esla - T.out)), p = V(mx(0.12, 0.04, k), mx(0.6, 0.58, k), mx(1.56, 1.38, k));
  return pose(p, V(0.02, 0.555, 0), 30, p.z - CARD_Z, 2.2);
}
function camThrough(t) {
  const a = V(0.02, CARD_Y, CARD_Z), k = e5(pr(t, T.esla + 0.18, T.lab - T.esla - 0.18));
  return blend(camCards(T.esla + 0.18), pose(V(a.x, a.y, a.z + 0.04), V(a.x, a.y, a.z - 1), 30, 0.04, 0.5), k);
}
function hermite(keys, t) {       // keys: [[t, [valores...]], ...] → valores en t (C1, sin pasarse: tangentes de Fritsch–Carlson)
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0][1].slice();
  if (t >= keys[n - 1][0]) return keys[n - 1][1].slice();
  let i = 0; while (i < n - 2 && t > keys[i + 1][0]) i++;
  const D = keys[0][1].length, out = [];
  const slope = (j, c) => (keys[j + 1][1][c] - keys[j][1][c]) / (keys[j + 1][0] - keys[j][0]);
  const tang = (j, c) => {
    if (j === 0 || j === n - 1) return 0;
    const a = slope(j - 1, c), b = slope(j, c);
    if (a * b <= 0) return 0;
    const m = (a + b) / 2, lim = 3 * Math.min(Math.abs(a), Math.abs(b));
    return Math.sign(m) * Math.min(Math.abs(m), lim);
  };
  const t0 = keys[i][0], h = keys[i + 1][0] - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
  for (let c = 0; c < D; c++) {
    const v0 = keys[i][1][c], v1 = keys[i + 1][1][c];
    out.push((2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * tang(i, c) + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * tang(i + 1, c));
  }
  return out;
}
function labKeys() {
  const K = [
    [T.lab, [-2.4, 2.6, 3.4, 0, 0.8, 0, 32]],
    [T.apago - 0.3, [-1.7, 1.5, 2.75, 0.0, 0.7, 0, 32]],
    [T.apago + 0.9, [-1.15, 0.85, 2.0, 0.15, 0.6, 0, 32]],
    [T.dos - 0.1, [-0.6, 0.66, 1.55, -0.2, 0.46, 0, 32]],
    [T.a21 - 0.25, [0.7, 0.7, 1.5, 0.9, 0.5, 0, 32]],
    [T.a21 + 0.35, [0.35, 1.05, 2.75, 0.25, 0.78, 0, 33]],
    [T.w2, [0.25, 1.15, 3.05, 0.2, 0.82, 0, 34]],
    [T.w2 + 0.42, [1.45, 1.75, 4.4, 3.85, 0.95, -0.3, 34]],
    [T.w3, [2.05, 1.5, 4.7, 3.95, 1.05, -0.2, 34]],
    [T.w3 + 0.42, [-7.15, 0.95, 3.3, -7.0, 0.75, -0.3, 34]],
    [T.fin, [-7.05, 1.15, 4.4, -7.0, 0.95, -0.5, 34]],
  ];
  for (let i = 1; i < K.length; i++) K[i][0] = Math.max(K[i][0], K[i - 1][0] + 0.2);
  return K;
}
const LABP = (v) => pose(V(v[0], v[1], v[2]).add(LAB), V(v[3], v[4], v[5]).add(LAB), v[6], null, 0);
function camEnd(t) {
  const k = pr(t, T.fin, T.end - T.fin), az = mx(0.55, -0.1, e3(k)), r = mx(1.85, 1.6, k);
  return pose(V(Math.sin(az) * r, 0.7, Math.cos(az) * r), V(0.05, 0.6, 0), 30, null, 1.4);
}
function camAt(t) {
  if (t < T.w1) return camHook(t);
  if (t < T.macro) return blend(camHook(T.w1), camMacro(T.macro), e5(pr(t, T.w1, T.macro - T.w1)));
  if (t < T.out + 0.25) return camMacro(t);
  if (t < T.out + 1.05) return blend(camMacro(T.out + 0.25), camCards(T.out + 1.05), e3(pr(t, T.out + 0.25, 0.8)));
  if (t < T.esla + 0.18) return camCards(t);
  if (t < T.lab) return camThrough(t);
  if (t < T.fin) return LABP(hermite(LABKEYS, t));
  return camEnd(t);
}

// ------------------------------------------------------------------ estado de la escena en el instante t
const _c = new THREE.Color();
function faceCam(m, p) { const w = m.getWorldPosition(V(0, 0, 0)); m.lookAt(p.x, w.y + (p.y - w.y) * 0.25, p.z); }
function showTitle(m, a, pos, s = 1) { m.visible = a > 0.001; if (!m.visible) return; m.position.copy(pos).sub(m.parent.position); m.updateMatrixWorld(); faceCam(m, cam.position); m.material.opacity = cl(a); m.scale.setScalar(s); }
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = P.ap > 0.01; dofMat.uniforms.uFocus.value = P.focus; dofMat.uniforms.uAp.value = P.ap;
  FLAMES.forEach(f => f.u.uCam.value.copy(cam.position));
  const inStudio = t < T.lab || t >= T.fin;
  studio.visible = inStudio; lab.visible = !inStudio;
  scene.fog.density = inStudio ? 0.11 : 0.03;
  if (inStudio) {
    const th = TW.hero(t);
    heroFire.F.u.uTime.value = th + 5; heroFire.s.u.uTime.value = th + 5; heroFire.e.u.uTime.value = th + 5;
    heroPowder.u.uTime.value = th; heroPowder.u.uOn0.value = 0.0; heroPowder.u.uOn1.value = 1.3; heroPowder.mesh.visible = t < T.fin;
    fireLight.intensity = 1.5 + 0.45 * Math.sin(th * 23) * Math.sin(th * 7.3 + 1);
    hero.userData.glow.material.opacity = 0.6 * sm(T.codigo - 0.15, T.codigo + 0.25, t) * (1 - sm(T.out + 0.4, T.out + 1.2, t)) * (0.85 + 0.15 * Math.sin(t * 9));
    const rk = pr(t, T.metros - 0.25, 1.7), rr = mx(0.3, 7.5, eO(rk));
    ring15.visible = rk > 0 && rk < 1 && t < T.w1 + 0.1; ring15.scale.setScalar(rr); ring15.material.opacity = 1 - rk;
    ringTxt.visible = false;
    const pos = dust.geometry.attributes.position.array;
    for (let i = 0; i < dust.userData.n; i++) {
      pos[i * 3] = -1.0 + 2.2 * rnd(i * 1.3) + 0.05 * Math.sin(t * 0.3 + i);
      pos[i * 3 + 1] = (0.05 + 1.5 * rnd(i * 2.7) + t * 0.015 * (0.5 + rnd(i))) % 1.6;
      pos[i * 3 + 2] = -0.8 + 2.0 * rnd(i * 4.1) + 0.05 * Math.cos(t * 0.27 + i * 1.7);
    }
    dust.geometry.attributes.position.needsUpdate = true;
    cards.forEach((m, i) => {
      const k = bk(pr(t, T.cardsIn + i * 0.11, 0.55));
      const tick = t > T.count0 && t < T.count1 ? Math.pow(1 - ((t - T.count0) % 1), 6) * 0.02 : 0;
      m.position.set(0.02 + (1 - k) * 0.5, CARD_Y - i * 0.066 + 0.003 * Math.sin(t * 1.7 + i), CARD_Z); m.rotation.set(0, -(1 - k) * 0.9 + 0.035 * Math.sin(t * 0.9 + i), 0);
      m.scale.setScalar(1 + tick);
      const right = i === 0, kr = pr(t, T.esla, 0.25);
      m.material.map = right && kr > 0 ? m.userData.tOk : m.userData.tN;
      let a = cl(k * 1.4);
      if (!right) { const f = pr(t, T.esla + 0.05, 0.35); a *= 1 - f; m.position.y -= 0.04 * eO(f) * (i % 2 ? 1 : -0.6); m.position.x += 0.07 * eO(f) * (i % 2 ? 1 : -1); }
      else m.material.color.setScalar(1 + 2.0 * sm(T.esla + 0.25, T.lab, t) + 0.5 * kr * (1 - kr) * 4);
      m.material.opacity = a; m.visible = t > T.cardsIn - 0.05 && t < T.lab && a > 0.002;
    });
  } else {
    const tc = TW.crib(t), hit = T.hitCrib;
    const ci = 1 - sm(hit, hit + 0.75, tc);
    cribFire.F.u.uTime.value = tc; cribFire.F.u.uInt.value = ci;
    cribFire.s.u.uTime.value = tc; cribFire.e.u.uTime.value = tc;
    cribFire.e.u.uKill0.value = hit; cribFire.e.u.uKill1.value = hit + 0.4;
    cribFire.s.u.uC0.value.set(...(tc > hit + 0.3 ? [0.3, 0.29, 0.28] : SMOKE_C[0])); cribFire.s.u.uC1.value.set(...(tc > hit + 0.3 ? [0.24, 0.235, 0.23] : SMOKE_C[1]));
    cribLights.forEach((l, i) => { l.intensity = (3.6 + 1.4 * Math.sin(tc * (17 + i * 3)) * Math.sin(tc * 5.1 + i)) * mx(0.03, 1, ci); });
    const coat = sm(hit - 0.1, hit + 0.8, tc);
    cribBase.forEach(([k, x, y], i) => {
      const ch = cl(0.35 + 0.25 * (y - 0.25) / 0.55 + 0.1 * rnd(i * 3.3)), base = k * (1 - 0.72 * ch);
      const cc = coat * cl(1.15 - Math.abs(x + 0.15) * 0.4);
      crib.setColorAt(i, _c.setRGB(mx(base, 1.0, cc), mx(base * 0.93, 0.96, cc), mx(base * 0.85, 0.84, cc)));
    });
    crib.instanceColor.needsUpdate = true;
    const nIn = eO(pr(t, T.apago - 0.55, 0.35));
    nozzleProp.position.set(-0.7 * (1 - nIn), 0.2 * (1 - nIn), 0.5 * (1 - nIn)); nozzleProp.visible = t < T.pila + 0.6;
    const tip = nozzleProp.userData.tip.clone().add(nozzleProp.position);
    jet.at(tip.x, tip.y, tip.z); jet.u.uDir.value.copy(V(0.25, 0.5, 0.0).sub(tip).normalize());
    jet.u.uTime.value = tc; jet.u.uOn0.value = hit - 0.32; jet.u.uOn1.value = hit + 1.1; jet.mesh.visible = t > T.apago - 0.6;
    const tk = e3(pr(t, T.dos - 0.15, Math.max(0.6, T.diez - T.dos + 0.25)));
    tape.visible = tk > 0; tape.scale.x = Math.max(0.001, tk); tapeTex.repeat.x = Math.max(0.001, tk);
    const a21 = pr(t, T.a21 - 0.08, 0.45);
    showTitle(title21, eO(a21), LP(0.25, 1.12 + 0.06 * eO(a21), 0.3), mx(0.7, 1, bk(a21)));
    showTitle(cap21, eO(pr(t, T.a21 + 0.12, 0.4)), LP(0.25, 0.95, 0.35));
    trayFire.F.u.uTime.value = t + 60; trayFire.s.u.uTime.value = t + 60; trayFire.e.u.uTime.value = t + 60;
    trayLight.intensity = 8.5 + 2.5 * Math.sin(t * 19) * Math.sin(t * 6.1);
    const gk = pr(t, T.litros - 0.2, 0.9), wk = e3(cl(gk / 0.4)), hk = e3(cl((gk - 0.35) / 0.65)), HW = 0.37, HH = 0.74;
    water.scale.y = Math.max(0.001, HW * wk); water.position.y = 0.02 + water.scale.y / 2; water.visible = wk > 0;
    hept.scale.y = Math.max(0.001, HH * hk); hept.position.y = 0.02 + HW * wk + hept.scale.y / 2; hept.visible = hk > 0;
    const tl = pr(t, T.litros + 0.25, 0.4);
    showTitle(title113, eO(tl), LP(3.08, 1.45 + 0.04 * eO(tl), 1.62));
    const tb = pr(t, T.b113 - 0.08, 0.45);
    showTitle(title113B, eO(tb), LP(3.95, 2.05 + 0.1 * eO(tb), -0.1), mx(0.7, 1, bk(tb)));
    const steps = [T.cuanto - 0.1, T.cuanto + 0.35, (T.numero ?? T.cuanto + 0.8) - 0.05, T.fuego - 0.2, T.fuego + 0.25];
    let si = 0; for (let i = 0; i < steps.length; i++) if (t >= steps[i]) si = i;
    const NUM = [8, 13, 21, 34, 43], since = t - steps[si];
    const grow = mx(si ? NUM[si - 1] : NUM[0], NUM[si], eO(cl(since / 0.3))) / 21;
    rateFire.F.u.uTime.value = t + 80; rateFire.F.u.uSX.value = grow; rateFire.F.u.uSH.value = 0.75 + 0.4 * grow;
    rateFire.s.u.uTime.value = t + 80; rateFire.e.u.uTime.value = t + 80; rateFire.s.u.uSX.value = grow; rateFire.e.u.uSX.value = grow;
    rateLight.intensity = 3 * grow + 1.2 * Math.sin(t * 21);
    rateTitles.forEach((m, i) => {
      const on = i === si && t > T.cuanto - 0.15;
      showTitle(m, on ? cl(since / 0.12) : 0, LP(-7.0, 1.72, 0.55), mx(0.8, 1, bk(cl(since / 0.25))) * (0.85 + 0.15 * i / 4));
    });
  }
}

// ------------------------------------------------------------------ capa 2D: rótulos, cuenta atrás y venta
function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0);
  g.clearRect(0, 0, W2, H2);
  const rk = pr(t, T.metros - 0.25, 1.7);
  if (rk > 0 && rk < 0.8 && t < T.w1 + 0.1) {          // «15 m» sobre el anillo que se abre
    const rr2 = mx(0.3, 7.5, eO(rk)), dir = cam.position.clone().sub(HERO_POS).setY(0).normalize();
    const pp = V(HERO_POS.x + dir.x * Math.min(rr2, 1.1), 0.0, HERO_POS.z + dir.z * Math.min(rr2, 1.1)).project(cam);
    const a = sm(0, 0.12, rk) * (1 - sm(0.55, 0.8, rk));
    if (pp.z < 1) {
      g.save(); g.globalAlpha = a; g.translate(cl((pp.x * 0.5 + 0.5) * W2, 220, W2 - 220), cl((-pp.y * 0.5 + 0.5) * H2 - 40, 500, 1700));
      rr(-200, -52, 400, 104, 52); g.fillStyle = 'rgba(6,16,22,0.78)'; g.fill(); g.strokeStyle = 'rgba(120,230,255,0.9)'; g.lineWidth = 4; g.stroke();
      txt('A MENOS DE 15 m', 0, 20, 58, '#C8F4FF', 400, 'center', 'Bebas'); g.restore();
    }
  }
  const fa = sm(T.metros - 0.1, T.metros + 0.3, t) * (1 - sm(T.w1, T.w1 + 0.25, t));
  if (fa > 0) { g.globalAlpha = fa; txt('Código Técnico de la Edificación · DB SI 4', 540, 1800, 30, 'rgba(225,235,245,0.85)', 600, 'center', 'Inter'); g.globalAlpha = 1; }
  const ca = sm(T.comenta - 0.1, T.comenta + 0.25, t) * (1 - sm(T.count1 - 0.1, T.count1 + 0.15, t));
  if (ca > 0) {
    g.save(); g.globalAlpha = ca; g.translate(540, 1560);
    rr(-250, -50, 500, 100, 50); g.fillStyle = 'rgba(8,10,14,0.72)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3; g.stroke();
    txt('💬  COMENTA TU LETRA', 0, 18, 50, '#F2F5F8', 400, 'center', 'Bebas'); g.restore();
  }
  if (t > T.count0 && t < T.count1) {
    const k = (t - T.count0) / (T.count1 - T.count0), n = 3 - Math.floor(k * 3), f = (k * 3) % 1;
    g.save(); g.translate(540, 1730);
    g.beginPath(); g.arc(0, 0, 78, 0, 7); g.fillStyle = 'rgba(8,10,14,0.75)'; g.fill();
    g.beginPath(); g.arc(0, 0, 78, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k)); g.strokeStyle = '#FF7A1A'; g.lineWidth = 9; g.lineCap = 'round'; g.stroke();
    const s = 1 + 0.35 * Math.pow(1 - f, 5);
    g.scale(s, s); txt(String(n), 0, 34, 104, '#FFFFFF', 400, 'center', 'Bebas'); g.restore();
  }
  const lower = (a, l2) => {
    if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.fillStyle = '#FF7A1A'; g.fillRect(70, 1688, 6, 92);
    txt('ENSAYO DE EFICACIA', 96, 1726, 46, '#FFFFFF', 400, 'left', 'Bebas');
    txt(l2, 96, 1770, 30, 'rgba(225,235,245,0.85)', 600, 'left', 'Inter'); g.restore();
  };
  lower(sm(T.lab + 0.15, T.lab + 0.5, t) * (1 - sm(T.dos - 0.35, T.dos - 0.1, t)), 'Norma UNE-EN 3-7 · fuego tipo 21A');
  lower(sm(T.w2 + 0.45, T.w2 + 0.8, t) * (1 - sm(T.w3 - 0.1, T.w3 + 0.1, t)), 'Norma UNE-EN 3-7 · fuego tipo 113B');
  if (!(t < T.lab || t >= T.fin)) {      // lectura de la cinta métrica, pegada a su punta
    const tk = e3(pr(t, T.dos - 0.15, Math.max(0.6, T.diez - T.dos + 0.25)));
    const ta = sm(T.dos - 0.15, T.dos, t) * (1 - sm(T.a21 + 0.2, T.a21 + 0.5, t));
    if (tk > 0 && ta > 0) {
      const tip = LP(-1.05 + 2.1 * tk, 0.3, 0.42).project(cam);
      if (tip.z < 1) {
        const sx = (tip.x * 0.5 + 0.5) * W2, sy = (-tip.y * 0.5 + 0.5) * H2 - 70;
        g.save(); g.globalAlpha = ta; g.translate(cl(sx, 150, W2 - 150), cl(sy, 420, H2 - 200));
        rr(-120, -46, 240, 92, 18); g.fillStyle = 'rgba(12,12,14,0.85)'; g.fill(); g.strokeStyle = '#F2C21A'; g.lineWidth = 4; g.stroke();
        txt((2.1 * tk).toFixed(2).replace('.', ',') + ' m', 0, 22, 62, '#F2C21A', 400, 'center', 'Bebas'); g.restore();
      }
    }
  }
  share(t);
  closing(t);
}

// ------------------------------------------------------------------ fotograma
function subframes(t) {                      // subfotogramas para el desenfoque de movimiento (según lo que se mueve la cámara)
  const a = camAt(t - 1 / 240), b = camAt(t + 1 / 240);
  const ang = a.q.angleTo(b.q), mv = a.p.distanceTo(b.p) / Math.max(0.15, (a.focus + b.focus) / 2);
  return Math.max(1, Math.min(4, Math.ceil((ang + mv) * H2 / (a.fov * Math.PI / 180) / 22)));
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
  finMat.uniforms.uDim.value = (t >= T.fin ? mx(1, 0.45, sm(T.compartir - 0.2, T.compartir + 0.3, t)) : 1) * (1 - sm(T.end - 0.3, T.end, t)) * sm(0, 0.12, t);
  finMat.uniforms.uFlash.value = 0.8 * sm(T.lab - 0.18, T.lab, t) * (1 - sm(T.lab, T.lab + 0.3, t));
  finMat.uniforms.uFlashCol.value.setRGB(0.85, 1.0, 0.9);
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  overlay(t);
};
window.renderCover = () => window.renderAt(window.COVER_T ?? 6.0);
window.__X = { composer, renderer, scene, cam, get update() { return update; }, get T() { return T; }, subframes: t => subframes(t) };

(async () => {
  try {
    while (!_r2d) await new Promise(r => setTimeout(r, 30));
    await document.fonts.ready;
    NOISE = noiseTex(); mats();
    setupTimes(); buildStudio(); buildLab();
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'extintor: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
