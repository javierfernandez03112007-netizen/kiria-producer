// «¿Serie o paralelo?» — acoplamiento de autobombas (Bomberados, vídeo medio, 3D cinematográfico con planos ABIERTOS).
// Motor copiado de projects/bomberados_extintor/web/extintor.js (luz, profundidad de campo, resplandor, desenfoque de
// movimiento, llamas en láminas, partículas sin estado) + mundo propio: calle de noche, dos autobombas, mangueras con el
// agua corriendo dentro, edificio con fuego arriba, nave en llamas y torre con el piso 20. Todo es función de t.
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


// ================================================================== MUNDO: calle de noche, edificio, nave, torre, dos autobombas
const world = new THREE.Group(); scene.add(world);
scene.background.set(0x04060a); scene.fog.color.set(0x04060a); scene.fog.density = 0.018;
scene.environmentIntensity = 0.22;
let trucks = [], beacons = [], hoses = {}, jetTop, jetMon, fireTop, fireWh, topLight, whLight, tower;
const HOSE_R = 0.06;

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

function buildWorld() {
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#16171a'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 18 + rnd(i) * 26; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(30, 30);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ map: asph, color: 0x8a8a8a, roughness: 0.42, metalness: 0.15 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
  const lines = canvasTex(64, 512, (x) => { x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, 64, 512); x.fillStyle = 'rgba(235,235,225,0.75)'; x.fillRect(22, 0, 20, 300); });
  lines.wrapT = THREE.RepeatWrapping; lines.repeat.set(1, 12);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 70), new THREE.MeshStandardMaterial({ map: lines, transparent: true, roughness: 0.6 }));
  road.rotation.x = -Math.PI / 2; road.position.set(6.2, 0.01, -5); world.add(road);
  world.add(new THREE.HemisphereLight(0x6f8ab8, 0x15100c, 0.6));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.5); moon.position.set(-20, 30, 15); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 90 }); moon.shadow.bias = -0.0005; world.add(moon);
  for (const [x, z] of [[-9, 7], [9, 7], [-9, -26], [14, -2]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 12), M.steel); pole.position.set(x, 3, z); world.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffc98a })); lamp.material.color.setScalar(3); lamp.position.set(x, 6.05, z); world.add(lamp);
    const l = new THREE.PointLight(0xffb070, 40, 0, 2); l.position.set(x, 5.9, z); world.add(l);
  }
  // edificio de 8 plantas con fuego en la última (destino del «en serie»)
  const bA = building(8, 15, 6, 5, 5, 3, (r, c) => r === 4 && c === 3); bA.position.x = -4.5; bA.position.z = -11; world.add(bA);
  fireTop = fireSet(world, V(-2.9, 12.3, -7.8), tongues(6, 13, (i, r) => [-3.7 + i * 0.32 + (r(1) - 0.5) * 0.15, 12.1, -7.85, 0.6 + 0.3 * r(3), 1.5 + 1.1 * r(4)]),
    { seed: 13, extent: [0.9, 0.1, 0.3], smokeN: 22, smokeSize: 1.0, smokeY: 2.4, emberN: 40, bright: 1.25 });
  topLight = new THREE.PointLight(0xff6a1a, 30, 0, 2); topLight.position.set(-2.9, 13.2, -6.6); world.add(topLight);
  // nave en llamas (destino del «en paralelo»)
  const wh = new THREE.Mesh(new THREE.BoxGeometry(9, 5.5, 7), new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.9 })); wh.position.set(7.2, 2.75, -13); world.add(wh);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.2), new THREE.MeshBasicMaterial({ color: 0x1a0700 })); door.position.set(7.2, 2.1, -9.48); world.add(door);
  fireWh = fireSet(world, V(7.2, 0.05, -9.7), [
    ...tongues(12, 31, (i, r) => [4.5 + i * 0.5 + (r(1) - 0.5) * 0.25, 0.05, -9.6 + (r(2) - 0.5) * 0.4, 1.0 + 0.5 * r(3), 2.8 + 2.4 * r(4)]),
    ...tongues(7, 37, (i, r) => [3.7 + i * 1.15 + (r(1) - 0.5) * 0.4, 5.5, -13 + (r(2) - 0.5) * 3.5, 1.3 + 0.6 * r(3), 2.4 + 1.8 * r(4)]),
  ], { seed: 31, extent: [3.4, 0.2, 1.0], smokeN: 36, smokeSize: 2.0, smokeY: 6.0, emberN: 80, bright: 1.15 });
  whLight = new THREE.PointLight(0xff5a14, 140, 0, 2); whLight.position.set(7.2, 4, -7.2); world.add(whLight);
  // torre del «piso 20» al fondo (22 plantas de 3 m)
  tower = building(14, 66, 14, 7, 22, 9, (r) => r === 19); tower.position.x = -1; tower.position.z = -60; world.add(tower);
  const band = new THREE.Mesh(new THREE.BoxGeometry(14.3, 3.0, 14.3), new THREE.MeshBasicMaterial({ color: 0x48d6ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  band.position.set(-1, 58.5, -60); world.add(band); tower.userData.band = band;
  // las dos autobombas, una al lado de la otra, mirando a los edificios
  for (const x of [-2.2, 2.2]) { const tk = makeTruck(); tk.position.set(x, 0, 0); tk.rotation.y = Math.PI / 2; world.add(tk); tk.updateMatrixWorld(true); trucks.push(tk); }
  const A = (lx, ly, lz) => trucks[0].localToWorld(V(lx, ly, lz)), B = (lx, ly, lz) => trucks[1].localToWorld(V(lx, ly, lz));
  // EN SERIE: A → B (detrás) y B → fachada hasta la última planta
  hoses.s1 = hoseMesh([A(-3.3, 0.95, 1.42), A(-3.6, 0.06, 2.3), V(0, 0.06, 5.0), B(-3.6, 0.06, -2.3), B(-3.3, 0.95, -1.42)]);
  hoses.s2 = hoseMesh([B(1.8, 0.95, -1.42), V(0.4, 0.06, -3.4), V(-0.9, 0.06, -6.0), V(-1.75, 0.06, -7.6), V(-1.95, 0.4, -7.86), V(-2.0, 5, -7.88),
    V(-2.0, 10, -7.88), V(-2.0, 11.6, -7.88), V(-2.25, 12.45, -7.55)], HOSE_R, 0xe9e3d3);
  // EN PARALELO: A y B → pieza en Y → una sola línea → cañón hacia la nave
  hoses.p1 = hoseMesh([A(1.8, 0.95, 1.42), V(-0.75, 0.06, -3.5), V(-0.3, 0.08, -5.0), V(-0.06, 0.12, -5.35)]);
  hoses.p2 = hoseMesh([B(1.8, 0.95, -1.42), V(0.75, 0.06, -3.5), V(0.3, 0.08, -5.0), V(0.06, 0.12, -5.35)]);
  hoses.pt = hoseMesh([V(0, 0.12, -5.6), V(0.5, 0.07, -6.3), V(1.3, 0.07, -6.8), V(2.15, 0.3, -6.95)], HOSE_R * 1.45, 0xd8d2c2);
  for (const h of Object.values(hoses)) { world.add(h.mesh, h.flow); h.grow(0); }
  const ypc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.5, 20), M.chrome); ypc.rotation.x = Math.PI / 2; ypc.position.set(0, 0.14, -5.45); world.add(ypc); hoses.y = ypc;
  const mon = new THREE.Group(); mon.position.set(2.4, 0, -7.0);
  const mb = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.4, 20), M.steel); mb.position.y = 0.2; mon.add(mb);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.1, 16), M.chrome); barrel.position.set(0.25, 0.75, -0.3);
  const aim = V(6.8, 2.6, -10.2).sub(V(2.4, 0.9, -7.0)).normalize(); barrel.quaternion.setFromUnitVectors(V(0, 1, 0), aim); mon.add(barrel); world.add(mon); hoses.mon = mon;
  jetMon = waterJet(520, { v0: 9.5, drag: 0.4, size: 0.12, grow: 0.22, spreadA: 0.05, spreadB: 0.12, opacity: 0.55, seed: 71, life: 1.4 });
  jetMon.at(2.75, 1.2, -7.3); jetMon.u.uDir.value.copy(V(6.6, 4.4, -10.0).sub(V(2.75, 1.2, -7.3)).normalize()); world.add(jetMon.mesh);
  jetTop = waterJet(260, { v0: 7, drag: 0.6, size: 0.07, grow: 0.25, spreadA: 0.06, spreadB: 0.08, opacity: 0.55, seed: 73, life: 1.0, grav: 4.9 });
  jetTop.at(-2.35, 12.55, -7.4); jetTop.u.uDir.value.copy(V(-3.1, 12.8, -8.6).sub(V(-2.35, 12.55, -7.4)).normalize()); world.add(jetTop.mesh);
  // pequeñas lanzas/racores visibles donde llega la manguera
  const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 16), M.chrome); lance.position.set(-2.32, 12.5, -7.45);
  lance.quaternion.setFromUnitVectors(V(0, 1, 0), V(-0.45, 0.1, -0.88).normalize()); world.add(lance); hoses.lance = lance;
}

// ------------------------------------------------------------------ tiempos
let T = {}, KEYS = null;
function setupTimes() {
  T = { ...CUE, end: END };
  const L = window.LINES_;
  T.l2e = L[1].end; T.l4e = L[3].end; T.l6e = L[5].end; T.l7s = L[6].start; T.l8s = L[7].start;
  T.sOn = T.serie - 0.1; T.sOff = T.paralelo - 0.35; T.pOn = T.paralelo - 0.05;
  T.fin = T.compartir - 0.25;
  KEYS = camKeys();
}
function camKeys() {        // planos ABIERTOS de dron: camiones abajo, mangueras y destino arriba; nada cortado
  const K = [
    [0, [-4, 26, 27, 0, 1, -5, 40]],
    [T.todo, [-3, 24, 25, 0, 1, -5, 40]],
    [T.conectes, [-2, 22.5, 23.5, 0, 1.5, -5, 40]],
    [T.serie + 0.1, [-3, 19, 25, -1.8, 5, -5, 40]],
    [T.otra + 0.4, [-4, 17.5, 22, -2.0, 6.5, -6, 40]],
    [T.dieciseis, [-5, 18, 18, -2.2, 9, -7, 40]],
    [T.alto + 0.3, [-5.5, 19.5, 15, -2.4, 11, -7.5, 40]],
    [T.paralelo + 0.3, [3.2, 19, 25, 1.0, 1.5, -5, 40]],
    [T.linea, [4.2, 17.5, 22.5, 1.8, 1.5, -6, 40]],
    [T.dosmil, [6, 15, 18, 3.0, 2, -7.5, 40]],
    [T.l6e, [6.8, 14, 15.5, 3.6, 2.5, -8.5, 40]],
    [T.trampa, [0, 28, 28, 0, 0, -5, 40]],
    [T.l8s + 0.2, [1, 8, 26, -1, 24, -55, 38]],
    [T.comenta, [1.5, 7, 24, -1, 46, -58, 38]],
    [T.fin + 0.3, [-4, 26, 27, 0, 1, -5, 40]],
    [T.end, [-2, 24, 25, 0, 1.2, -5, 40]],
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
function camAt(t) { const v = hermite(KEYS, t); return pose(V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), v[6]); }

// ------------------------------------------------------------------ estado de la escena en t
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => f.u.uCam.value.copy(cam.position));
  // luces de emergencia: destellos azules alternos
  trucks.forEach((tk, i) => {
    const ph = (t * 2.6 + i * 0.5) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
    tk.userData.lbar.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === (i % 2) ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
    tk.userData.pl.intensity = 6 + 40 * on;
  });
  // fuegos (arden todo el vídeo; el de arriba baja cuando llega el agua en serie, la nave cuando llega en paralelo)
  const kTop = 1 - 0.55 * sm(T.alto - 0.6, T.alto + 1.2, t), kWh = 1 - 0.35 * sm(T.doble - 0.4, T.doble + 1.4, t);
  fireTop.F.u.uTime.value = t; fireTop.F.u.uInt.value = kTop; fireTop.s.u.uTime.value = t; fireTop.e.u.uTime.value = t;
  fireWh.F.u.uTime.value = t + 9; fireWh.F.u.uInt.value = kWh; fireWh.s.u.uTime.value = t + 9; fireWh.e.u.uTime.value = t + 9;
  topLight.intensity = (24 + 10 * Math.sin(t * 17) * Math.sin(t * 5.3)) * kTop;
  whLight.intensity = (130 + 40 * Math.sin(t * 13) * Math.sin(t * 4.1)) * kWh;
  // mangueras: crecen, el agua avanza por dentro y luego corre
  const sGrow = sm(T.sOn, T.sOn + 0.9, t) * (1 - sm(T.sOff, T.sOff + 0.5, t));
  hoses.s1.grow(sGrow); hoses.s2.grow(sm(T.sOn + 0.3, T.sOn + 1.6, t) * (1 - sm(T.sOff, T.sOff + 0.5, t)));
  const pGrow = sm(T.pOn, T.pOn + 0.8, t);
  hoses.p1.grow(pGrow); hoses.p2.grow(pGrow); hoses.pt.grow(sm(T.pOn + 0.4, T.pOn + 1.2, t));
  hoses.y.visible = pGrow > 0.6; hoses.mon.visible = t > T.pOn + 0.6; hoses.lance.visible = t > T.sOn + 1.4 && t < T.sOff + 0.4;
  const flow = (h, t0, speed, I, off) => { h.fu.uTime.value = t; h.fu.uSpeed.value = speed; h.fu.uHead.value = sm(t0, t0 + 0.9, t) * 1.02; h.fu.uI.value = I * (1 - sm(off, off + 0.3, t)); };
  flow(hoses.s1, T.bomba1, 1.6, 1.0, T.sOff); flow(hoses.s2, T.otra, 1.6 * 2.2, 1.0, T.sOff);
  flow(hoses.p1, T.vez, 1.6, 1.0, 1e9); flow(hoses.p2, T.vez, 1.6, 1.0, 1e9); flow(hoses.pt, T.linea, 1.6 * 1.6, 1.6, 1e9);
  // chorros
  jetTop.u.uTime.value = t; jetTop.u.uOn0.value = T.otra + 0.8; jetTop.u.uOn1.value = T.sOff + 0.2; jetTop.mesh.visible = t > T.otra + 0.7 && t < T.sOff + 1.6;
  jetMon.u.uTime.value = t; jetMon.u.uOn0.value = T.linea + 0.7; jetMon.u.uOn1.value = 1e9; jetMon.mesh.visible = t > T.linea + 0.6;
  const thick = 1 + 0.9 * sm(T.dosmil - 0.2, T.dosmil + 0.5, t);
  jetMon.u.uSize.value = 0.12 * thick; jetMon.u.uSpreadB.value = 0.12 * thick;
  // torre: el piso 20 se enciende
  tower.userData.band.material.opacity = 0.55 * sm(T.veinte - 0.2, T.veinte + 0.3, t) * (0.8 + 0.2 * Math.sin(t * 6)) * (1 - sm(T.fin, T.fin + 0.4, t));
}

// ------------------------------------------------------------------ capa 2D
function proj(v) { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * W2, y: (-p.y * 0.5 + 0.5) * H2, ok: p.z < 1 }; }
function chip(x, y, text, col, a, s = 1, icon = null, px = 54) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = a; g.translate(cl(x, 190, W2 - 190), cl(y, 470, H2 - 260)); g.scale(s, s);
  g.font = `400 ${px}px Bebas`; const tw = g.measureText(text).width, w = tw + (icon ? 96 : 56), h = px * 1.45;
  rr(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = 'rgba(8,10,14,0.82)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  if (icon === 'p') {               // manómetro
    const cx = -w / 2 + 44; g.beginPath(); g.arc(cx, 0, 22, 0, 7); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
    g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx + 14, -10); g.stroke();
  } else if (icon === 'q') {        // gota
    const cx = -w / 2 + 44; g.beginPath(); g.moveTo(cx, -24); g.bezierCurveTo(cx + 20, 0, cx + 16, 20, cx, 20); g.bezierCurveTo(cx - 16, 20, cx - 20, 0, cx, -24); g.fillStyle = col; g.fill();
  }
  txt(text, icon ? 24 : 0, px * 0.36, px, '#F4F6F8', 400, 'center', 'Bebas');
  g.restore();
}
function banner(text, sub, col, a, y = 560) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = a; g.translate(540, y);
  g.font = '400 108px Bebas'; const w = g.measureText(text).width + 90;
  rr(-w / 2, -70, w, 124, 30); g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 40; g.fill(); g.shadowBlur = 0;
  txt(text, 0, 34, 108, '#0b0d10', 400, 'center', 'Bebas');
  if (sub) txt(sub, 0, 112, 40, 'rgba(240,244,248,0.92)', 700, 'center', 'Inter');
  g.restore();
}
const ORANGE2 = '#FF8A1F', BLUE2 = '#3FB6FF';
function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  // 1-2) ¿el doble de todo? → presión ×2 o agua ×2
  const q = sm(T.todo - 0.4, T.todo, t) * (1 - sm(T.presion - 0.3, T.presion, t));
  if (q > 0) { g.save(); g.globalAlpha = q; g.translate(540, 1240); g.scale(1 + 0.15 * (1 - q), 1 + 0.15 * (1 - q)); txt('×2 ¿TODO?', 0, 60, 170, '#FFFFFF', 400, 'center', 'Bebas'); g.restore(); }
  const two = 1 - sm(T.serie - 0.3, T.serie, t);
  chip(300, 1300, 'PRESIÓN ×2', ORANGE2, sm(T.presion - 0.2, T.presion + 0.15, t) * two, 1.2, 'p', 60);
  chip(780, 1300, 'AGUA ×2', BLUE2, sm(T.agua - 0.2, T.agua + 0.15, t) * two, 1.2, 'q', 60);
  // 3-4) en serie
  const sA = sm(T.serie - 0.15, T.serie + 0.2, t) * (1 - sm(T.paralelo - 0.4, T.paralelo - 0.1, t));
  banner('EN SERIE', 'una bomba detrás de la otra', ORANGE2, sA);
  const pa = proj(trucks[0].localToWorld(V(-1, 4.3, 0))), pb = proj(trucks[1].localToWorld(V(-1, 4.3, 0)));
  if (sA > 0) {
    chip(pa.x, pa.y, T && t < T.ocho1 ? 'BOMBA 1' : '8 BAR', ORANGE2, sm(T.bomba1 - 0.1, T.bomba1 + 0.2, t) * sA, 1, t < T.ocho1 ? null : 'p');
    const k16 = sm(T.ocho2 - 0.1, T.dieciseis + 0.1, t), v = Math.round(8 + 8 * k16);
    chip(pb.x, pb.y, t < T.ocho2 - 0.1 ? 'BOMBA 2' : (k16 < 1 ? `8 + 8 = ${v} BAR` : '16 BAR'), ORANGE2, sm(T.otra - 0.1, T.otra + 0.2, t) * sA, 1 + 0.25 * Math.exp(-((t - T.dieciseis - 0.1) ** 2) / 0.02), t < T.ocho2 - 0.1 ? null : 'p');
    const cq = sm(T.caudal - 0.2, T.caudal + 0.2, t) * sA;
    const f1 = proj(hoses.s1.curve.getPoint(0.5)), f2 = proj(hoses.s2.curve.getPoint(0.62));
    chip(f1.x, f1.y + 70, '1.000 L/MIN', BLUE2, cq, 0.85, 'q'); chip(f2.x + 60, f2.y, '1.000 L/MIN', BLUE2, cq, 0.85, 'q');
    const ex = sm(T.ocho1, T.ocho1 + 0.3, t) * sA;
    if (ex > 0) { g.globalAlpha = ex; txt('Ejemplo · dos bombas iguales · sin contar pérdidas', 540, 1800, 30, 'rgba(225,235,245,0.8)', 600, 'center', 'Inter'); g.globalAlpha = 1; }
  }
  // 5-6) en paralelo
  const pA = sm(T.paralelo - 0.15, T.paralelo + 0.2, t) * (1 - sm(T.trampa - 0.35, T.trampa - 0.05, t));
  banner('EN PARALELO', 'las dos bombas a la vez', BLUE2, pA);
  if (pA > 0) {               // la suma de caudales en una sola línea, limpia (sin rótulos encima de los camiones)
    const e1 = sm(T.mil1 - 0.1, T.mil1 + 0.2, t), e2 = sm(T.mil2 - 0.1, T.mil2 + 0.2, t), e3 = sm(T.dosmil - 0.1, T.dosmil + 0.2, t);
    const pa2 = Math.max(e1, e2, e3) * pA;
    if (pa2 > 0) {
      g.save(); g.globalAlpha = pa2; g.translate(540, 1470);
      rr(-470, -82, 940, 164, 40); g.fillStyle = 'rgba(8,10,14,0.85)'; g.fill(); g.strokeStyle = BLUE2; g.lineWidth = 4; g.stroke();
      g.font = '400 86px Bebas';
      const parts = [['1.000', e1, '#F4F6F8'], [' + 1.000', e2, '#F4F6F8'], [' = 2.000 L/MIN', e3, BLUE2]];
      const tw = parts.reduce((a, [s2]) => a + g.measureText(s2).width, 0); let x = -tw / 2;
      for (const [s2, a, col] of parts) { const w = g.measureText(s2).width; if (a > 0) { g.globalAlpha = pa2 * a; txt(s2, x, 30, 86, col, 400, 'left', 'Bebas'); } x += w; }
      g.restore();
    }
    const pr8 = sm(T.l6e - 1.6, T.l6e - 1.2, t) * pA;
    chip(540, 1640, 'MISMA PRESIÓN: 8 BAR', ORANGE2, pr8, 1.05, 'p');
  }
  // 7) la trampa
  const tr = sm(T.trampa - 0.2, T.trampa + 0.2, t) * (1 - sm(T.l8s - 0.3, T.l8s, t));
  if (tr > 0) {
    g.save(); g.globalAlpha = tr; g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, W2, H2); g.restore();
    banner('⚠ TRAMPA DEL EXAMEN', null, '#FF5A4E', tr, 600);
    const card = (y, title, col, ok, bad, a) => {
      if (a <= 0) return;
      g.save(); g.globalAlpha = a * tr; g.translate(540 + 40 * (1 - a), y);
      rr(-430, -120, 860, 240, 34); g.fillStyle = 'rgba(10,12,16,0.92)'; g.fill(); g.strokeStyle = col; g.lineWidth = 5; g.stroke();
      txt(title, -390, -40, 74, col, 400, 'left', 'Bebas');
      txt('✔ ' + ok, -390, 30, 50, '#3EF08A', 800, 'left', 'Inter');
      txt('✘ ' + bad, -390, 90, 50, '#FF6B5E', 800, 'left', 'Inter');
      g.restore();
    };
    card(900, 'EN SERIE', ORANGE2, 'se suma la PRESIÓN', 'NO se suma el caudal', eO(pr(t, T.noserie - 0.15, 0.35)));
    card(1220, 'EN PARALELO', BLUE2, 'se suma el CAUDAL', 'NO se suma la presión', eO(pr(t, T.noparalelo - 0.15, 0.35)));
  }
  // 8) piso 20: ¿serie o paralelo?
  const p20 = sm(T.veinte - 0.25, T.veinte + 0.1, t) * (1 - sm(T.fin, T.fin + 0.3, t));
  if (p20 > 0) {
    const pf = proj(V(6.2, 58.5, -53));
    chip(pf.x + 120, pf.y, 'PISO 20', '#48D6FF', p20, 1.1, null, 64);
  }
  const btn = sm(T.l8s + 0.9, T.l8s + 1.3, t) * (1 - sm(T.fin, T.fin + 0.3, t));
  if (btn > 0) {
    const bub = sm(T.comenta - 0.1, T.comenta + 0.25, t);
    for (const [x, lab, col] of [[290, 'SERIE', ORANGE2], [790, 'PARALELO', BLUE2]]) {
      g.save(); g.globalAlpha = btn; g.translate(x, 1560); const s = 1 + 0.12 * bub; g.scale(s, s);
      rr(-210, -70, 420, 140, 70 - 40 * bub); g.fillStyle = col; g.fill();
      if (bub > 0) { g.beginPath(); g.moveTo(-60, 66); g.lineTo(-100, 66 + 50 * bub); g.lineTo(-10, 66); g.fill(); }
      txt(lab, 0, 30, 84, '#0b0d10', 400, 'center', 'Bebas'); g.restore();
    }
    if (bub > 0) { g.globalAlpha = bub * btn; txt('💬 COMENTA', 540, 1730, 50, '#F2F5F8', 400, 'center', 'Bebas'); g.globalAlpha = 1; }
  }
  share(t);
  closing(t);
}

// ------------------------------------------------------------------ fotograma
function subframes(t) {
  const a = camAt(t - 1 / 240), b = camAt(t + 1 / 240);
  const ang = a.q.angleTo(b.q), mv = a.p.distanceTo(b.p) / Math.max(0.5, (a.focus + b.focus) / 2);
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
  const dimTrap = 1 - 0.0 * sm(T.trampa - 0.2, T.trampa + 0.2, t);
  finMat.uniforms.uDim.value = dimTrap * (t >= T.fin ? mx(1, 0.5, sm(T.compartir - 0.2, T.compartir + 0.3, t)) : 1) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uFlash.value = 0; finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 5.0);

(async () => {
  try {
    while (!_r2d) await new Promise(r => setTimeout(r, 30));
    await document.fonts.ready;
    NOISE = noiseTex(); mats();
    setupTimes(); buildWorld();
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'acoplamiento: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
