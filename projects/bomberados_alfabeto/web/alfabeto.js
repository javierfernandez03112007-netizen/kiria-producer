// «¿Por qué los bomberos dicen "Bravo" y "Delta"?» — el alfabeto de radio (idea de Javi, 13 nov). Con el MENSAJE
// (bomberados/MENSAJE.md) y el plan del 13 nov: la teoría la explica una situación real. Edificio de noche con fuego en el
// tercero y alguien atrapado en el 3.º B; el mando habla por la radio; entre sirenas «be» y «de» suenan igual y la linterna del
// equipo aparece en la ventana del 3.º D (la equivocada); con «Bravo» va a la B. Luego la tabla A–Z (como la pizarra que mandó
// Javi) mientras se encienden las ventanas, el reto de la Q (queso, Quijote o Quebec) con cuenta y «escribe tu nombre».
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






// ================================================================== el mundo: calle de noche, edificio con fuego en el tercero, autobomba y el mando con la radio
const world = new THREE.Group(); scene.add(world);
const FLOORS = 7, FH = 3, BW = 16, BD = 12;
const BLUE2 = '#3FB6FF', RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D';
const COLS = ['#FF7A1A', '#2DD4BF', '#F0457A'];
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
const WINX = i => (95 + 164 * i) / 64 - 8, WINY = k => FH * k + 1.52;           // centro de cada ventana de la fachada
const WB = V(WINX(1), WINY(3), 0.1), WD = V(WINX(5), WINY(3), 0.1);              // 3.º B (la persona) y 3.º D (la equivocada)
const CHIEF = V(9.0, 0, 12.2);                                                  // el mando, a la derecha de la autobomba
const ALFA = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL', 'INDIA', 'JULIETT', 'KILO', 'LIMA', 'MIKE',
  'NOVEMBER', 'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO', 'SIERRA', 'TANGO', 'UNIFORM', 'VICTOR', 'WHISKEY', 'X-RAY', 'YANKEE', 'ZULU'];
const LETWIN = [];                                                                // la ventana de cada letra (sin la planta del fuego)
for (const k of [6, 5, 4, 2, 1]) for (let i = 0; i < 6; i++) if (LETWIN.length < 26) LETWIN.push([k, i]);
let bld, winU = {}, person, arm, phoneL, truck, beacons = [], chief, radioLed, fire3, fireL, torchL, portalL, smokeA, smokeB, team = [];

function facadeTex(seed) {        // una planta: 6 ventanas (algunas encendidas), alféizares y juntas
  return canvasTex(1024, 192, (x) => {
    x.fillStyle = '#34363d'; x.fillRect(0, 0, 1024, 192);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(0,0,0,${0.05 + rnd(seed + i) * 0.08})`; x.fillRect(rnd(i * 7 + seed) * 1024, rnd(i * 3 + seed) * 192, 60, 4); }
    for (let i = 0; i < 6; i++) {
      const X = 40 + i * 164, on = rnd(seed * 7.1 + i * 3.3) < 0.25;
      x.fillStyle = on ? '#ffcf8a' : '#0b0e14'; x.fillRect(X, 40, 110, 110);
      x.strokeStyle = '#9a9da4'; x.lineWidth = 6; x.strokeRect(X, 40, 110, 110);
      x.fillStyle = '#a3a6ad'; x.fillRect(X - 8, 150, 126, 10);
    }
    x.fillStyle = '#23252b'; x.fillRect(0, 186, 1024, 6);
  }, { aniso: 4 });
}
const WIN_F = `uniform float uI; uniform vec3 uCol; varying vec2 vUv;
void main(){ vec2 d = abs(vUv - 0.5); float e = max(d.x, d.y); float a = uI * (0.55 + 0.45 * smoothstep(0.5, 0.0, length(vUv - 0.5))) * (1.0 - smoothstep(0.46, 0.5, e));
  gl_FragColor = vec4(uCol * a, a); }`;
function addLegs(ff) {              // las piernas, en pivotes en la cadera (para andar)
  ff.updateMatrixWorld(true);
  const legs = [-1, 1].map(s => { const L = new THREE.Group(); L.position.set(0.11 * s, 0.85, 0); ff.add(L); return L; });
  ff.updateMatrixWorld(true);
  for (const m of [...ff.children]) if (m.isMesh && m.position.y < 0.8 && Math.abs(Math.abs(m.position.x) - 0.11) < 0.01) legs[m.position.x > 0 ? 1 : 0].attach(m);
  ff.userData.legs = legs; return ff;
}
function walkPose(ff, ph, k) { const L = ff.userData.legs, s = Math.sin(ph) * 0.42 * k; L[0].rotation.x = s; L[1].rotation.x = -s; }
function face(o, dir) { o.rotation.y = Math.atan2(-dir.x, -dir.z); }      // el bombero mira hacia −Z

function buildWorld() {
  world.add(new THREE.HemisphereLight(0x33476e, 0x0b0806, 0.5));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.3); moon.position.set(-20, 50, 40); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 30, bottom: -10, near: 1, far: 140 }); moon.shadow.bias = -0.0005; world.add(moon);
  // calle: asfalto, aceras, edificios vecinos y farolas
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#16171a'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 16 + rnd(i) * 26; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(40, 40);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ map: asph, color: 0x8a8a8a, roughness: 0.5, metalness: 0.15 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
  const walk = new THREE.MeshStandardMaterial({ color: 0x55565a, roughness: 0.9 });
  const sw = new THREE.Mesh(new THREE.BoxGeometry(120, 0.15, 3.2), walk); sw.position.set(0, 0.075, 1.6); sw.receiveShadow = true; world.add(sw);
  const sw2 = new THREE.Mesh(new THREE.BoxGeometry(120, 0.15, 3.2), walk); sw2.position.set(0, 0.075, 18.6); world.add(sw2);
  for (let i = 0; i < 12; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.01, 0.15), new THREE.MeshStandardMaterial({ color: 0xcfcfc8, roughness: 0.4 })); d.position.set(-50 + i * 9, 0.01, 10.2); world.add(d); }
  for (const [x, h, w] of [[-17.5, 24, 18], [17.5, 18, 18], [-34, 30, 14], [33, 27, 14]]) { const b = building(w, h, 12, 6, Math.round(h / 3), 11 + x, null); b.position.set(x, 0, -6); world.add(b); }
  for (const [x, h, w] of [[-12, 15, 16], [8, 21, 18], [26, 12, 14]]) { const b = building(w, h, 10, 6, Math.round(h / 3), 31 + x, null); b.position.set(x, 0, 44); b.rotation.y = Math.PI; world.add(b); }
  for (const x of [-11, 13]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 12), M.steel); pole.position.set(x, 3, 3.0); world.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), GLOW(0xffc98a, 2.2)); lamp.position.set(x, 5.9, 3.8); world.add(lamp);
    const l = new THREE.PointLight(0xffb070, 40, 0, 2); l.position.set(x, 5.6, 3.8); world.add(l);
  }
  // el edificio: 7 plantas, con una capa de luz por ventana (la linterna del equipo y el alfabeto)
  bld = new THREE.Group(); world.add(bld);
  const sideM = new THREE.MeshStandardMaterial({ color: 0x2c2e34, roughness: 0.85 });
  const winGeo = new THREE.PlaneGeometry(1.72, 1.72);
  for (let k = 0; k < FLOORS; k++) {
    const tex = facadeTex(5 + k * 3), front = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.8 });
    const f = new THREE.Mesh(new THREE.BoxGeometry(BW, FH, BD), [sideM, sideM, sideM, sideM, front, sideM]);
    f.position.set(0, FH * k + FH / 2, -BD / 2); f.castShadow = true; f.receiveShadow = true; bld.add(f);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.3, 0.12, 0.35), new THREE.MeshStandardMaterial({ color: 0x5c5f66, roughness: 0.7 })); slab.position.set(0, FH * (k + 1) - 0.06, 0.12); bld.add(slab);
    for (let i = 0; i < 6; i++) {
      const u = { uI: { value: 0 }, uCol: { value: new THREE.Color(0.3, 1.6, 2.2) } };
      const m = new THREE.Mesh(winGeo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: WIN_F, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
      m.position.set(WINX(i), WINY(k) - 0.02, 0.03); m.renderOrder = 12; bld.add(m); winU[k + '_' + i] = u;
    }
  }
  const par = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.4, 0.9, BD + 0.4), sideM); par.position.set(0, FH * FLOORS + 0.45, -BD / 2); bld.add(par);
  // el portal (por donde entra el equipo)
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.6), new THREE.MeshStandardMaterial({ color: 0x1a140c, emissive: 0x3a2a14, emissiveIntensity: 1.0, roughness: 0.9 }));
  portal.position.set(0.0, 1.3, 0.02); bld.add(portal);
  portalL = new THREE.PointLight(0xffb066, 6, 0, 2); portalL.position.set(0, 2.2, 1.2); world.add(portalL);
  // la persona atrapada en el 3.º B, con la linterna del móvil
  person = new THREE.Group(); person.position.set(WB.x, 0, 0.12); bld.add(person);
  const shirt = new THREE.MeshStandardMaterial({ color: 0x9a3b3b, roughness: 0.8 }), skin = new THREE.MeshStandardMaterial({ color: 0xd0a07c, roughness: 0.6 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 6, 12), shirt); torso.position.set(0, WB.y - 0.35, 0); person.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 14), skin); head.position.set(0, WB.y + 0.2, 0.02); person.add(head);
  arm = new THREE.Group(); arm.position.set(0.24, WB.y, 0.05); person.add(arm);
  const a1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.5, 6, 10), shirt); a1.position.set(0, 0.3, 0); arm.add(a1);
  const ph = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), GLOW(0xffffff, 6)); ph.position.set(0, 0.62, 0.05); arm.add(ph);
  phoneL = new THREE.PointLight(0xdfe8ff, 6, 0, 2); phoneL.position.set(0, 0.65, 0.3); arm.add(phoneL);
  // fuego en el 3.º (la ventana de al lado) y el humo
  fire3 = fireSet(world, V(WINX(0), WINY(3) - 0.5, 0.3), tongues(7, 21, (i, r) => [WINX(0) - 0.9 + i * 0.3 + (r(1) - 0.5) * 0.1, WINY(3) - 0.6, 0.25, 0.6 + 0.3 * r(3), 1.6 + 1.1 * r(4)]),
    { seed: 21, extent: [0.9, 0.1, 0.2], smokeN: 30, smokeSize: 1.3, smokeY: 2.2, emberN: 50, bright: 1.4 });
  fireL = new THREE.PointLight(0xff6a1a, 60, 0, 2); fireL.position.set(WINX(0), WINY(3) + 0.2, 1.6); world.add(fireL);
  const SMK = [[0.11, 0.105, 0.1], [0.085, 0.082, 0.08], [0.065, 0.065, 0.068], [0.05, 0.05, 0.055]];
  smokeA = new Parts(80, { life: 7, rise: 2.2, acc: 0.05, size: 3.0, grow: 2.2, turb: 0.8, conv: 0.0, rot: 6.28, opacity: 0.6, c: SMK, seed: 33, extent: [3.5, 0.6, 1.2], order: 11 });
  smokeA.at(WINX(0) + 1.0, WINY(3) + 2.0, 1.6); world.add(smokeA.mesh);
  smokeB = new Parts(60, { life: 6, rise: 1.4, acc: 0.03, size: 3.2, grow: 2.0, turb: 0.7, conv: 0.0, rot: 6.28, opacity: 0.5, c: SMK, seed: 47, extent: [4.5, 2.0, 1.0], order: 11 });
  smokeB.at(WINX(0) + 2.0, WINY(5) + 1.0, 1.8); world.add(smokeB.mesh);
  // la linterna del equipo dentro del piso (se ve por la ventana: primero en la D, luego en la B)
  torchL = new THREE.PointLight(0xfff0d0, 0, 0, 2); world.add(torchL);
  // la autobomba (con los rotativos) y el mando con la radio
  truck = makeTruck(); truck.rotation.y = -Math.PI / 2; truck.position.set(3.73, 0, 10.5); world.add(truck);
  truck.traverse(o => { if (o.isMesh) o.castShadow = true; }); beacons = truck.userData.lbar;
  chief = makeFirefighter(); chief.position.copy(CHIEF); face(chief, V(-0.73, 0, -0.68).normalize()); world.add(chief);
  chief.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const radio = new THREE.Group(); radio.position.set(0.17, 1.52, -0.2); chief.add(radio);
  const rb = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.17, 0.04, 2, 0.012), M.black); radio.add(rb);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.11, 8), M.black); ant.position.set(0.02, 0.13, 0); radio.add(ant);
  radioLed = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), GLOW(0xff2a1a, 1)); radioLed.position.set(-0.02, 0.07, -0.022); radio.add(radioLed);
  // el equipo de dos que entra por el portal
  for (const [x, z] of [[2.2, 8.0], [3.1, 8.9]]) { const f = addLegs(makeFirefighter()); f.position.set(x, 0, z); f.userData.p0 = V(x, 0, z); world.add(f); f.traverse(o => { if (o.isMesh) o.castShadow = true; }); team.push(f); }
}

// ------------------------------------------------------------------ tiempos y cámara (un dron que no para)
let T = {}, KEYS = null;
function setupTimes() {
  T = { ...CUE, end: END };
  const L = window.LINES_;
  T.count0 = L[7].end + 0.05; T.count1 = T.count0 + 4.0;
  T.fin = T.compartir - 0.25;
  T.in0 = T.postureo - 0.2; T.in1 = T.tercero + 0.3;                      // el equipo entra por el portal
  T.d0 = T.puerta - 0.1; T.d1 = T.poreso + 0.2;                           // la linterna en la D (la equivocada)
  T.b0 = T.bravo5 + 0.3;                                                   // y en la B (la buena)
  T.let0 = T.cada + 0.1; T.let1 = Math.max(T.zulu6 + 0.25, T.let0 + 2.4); // el alfabeto, ventana a ventana
  KEYS = camKeys();
}
function camKeys() {
  const K = [
    [0, [-0.9, 10.7, 8.0, -4.4, 9.5, 0, 40]],                           // pegado al 3.º B: la persona con la linterna del móvil y el fuego al lado
    [T.bombero1, [1.5, 9.5, 11.5, -3.5, 8.0, 1.0, 42]],
    [T.bravo1, [13.5, 3.2, 16.4, 4.6, 4.4, 6.8, 44]],                   // el mando de espaldas, con la radio
    [T.radio, [14.5, 6.0, 25, 1.0, 7.5, 0, 44]],                        // abre: el edificio, la autobomba y el mando
    [T.atrapado, [-1.5, 10.9, 9.0, -4.6, 9.4, 0, 40]],                  // la ventana del 3.º B (la persona y el fuego al lado)
    [T.b2 + 0.3, [-0.8, 10.6, 8.2, -4.2, 9.4, 0, 40]],
    [T.sirenas + 0.2, [13.0, 3.0, 15.6, 4.6, 4.4, 6.8, 42]],            // vuelve al mando: la radio con ruido
    [T.de3 + 0.3, [12.6, 2.9, 15.2, 4.6, 4.4, 6.8, 42]],
    [T.puerta + 0.2, [6.5, 10.8, 10.5, 6.3, 9.45, 0, 40]],              // la linterna, en la ventana equivocada (3.º D)
    [T.minutos + 0.3, [7.2, 11.2, 11.5, 6.0, 9.45, 0, 40]],
    [T.bravo5 + 0.1, [0.5, 10.8, 12.5, -1.5, 9.45, 0, 40]],             // barre la fachada hasta la B
    [T.imposibles, [-1.2, 10.9, 9.4, -4.2, 9.4, 0, 40]],                // ¡localizado!
    [T.cada + 0.3, [0, 12, 34, 0, 11, 0, 44]],                           // la fachada entera: el alfabeto en las ventanas
    [T.pilotos, [-3, 12.5, 33, 0, 11, 0, 44]],
    [T.count0, [-14, 14, 28, 0, 9, 0, 44]],                              // órbita durante la cuenta
    [T.count0 + 2.0, [0, 18, 34, 0, 9, 0, 44]],
    [T.count1, [14, 14, 28, 0, 9, 0, 44]],
    [T.tiempo + 0.3, [11, 9, 26, 1, 8, 0, 44]],
    [T.ahora, [13.5, 3.2, 16.4, 4.6, 4.4, 6.8, 44]],                    // el mando con la radio otra vez
    [T.fin, [12, 16, 34, 0, 9, 0, 44]],
    [T.end, [14, 22, 42, 0, 10, 0, 44]],
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
  const sh = Math.exp(-Math.pow((t - T.tiempo - 0.05) / 0.12, 2)) * 0.14;
  return pose(V(v[0] + sh * Math.sin(t * 91), v[1] + sh * Math.cos(t * 77), v[2]), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
const talking = t => [[T.bravo1 - 0.3, T.radio + 0.2], [T.sirenas - 0.2, T.igual + 0.4], [T.bravo5 - 0.2, T.imposibles - 0.1]].some(([a, b]) => t > a && t < b);
function letT(i) { return T.let0 + i * (T.let1 - T.let0) / 25; }
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => f.u.uCam.value.copy(cam.position));
  for (const s of [fire3.F, fire3.s, fire3.e]) s.u.uTime.value = t;
  fireL.intensity = 55 + 18 * Math.sin(t * 15) * Math.sin(t * 4.3);
  smokeA.u.uTime.value = t; smokeB.u.uTime.value = t;
  arm.rotation.z = -0.25 + 0.45 * Math.sin(t * 6.5); phoneL.intensity = 6 * (0.7 + 0.3 * Math.sin(t * 13));
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = 8 + 60 * on;
  radioLed.material.color.setRGB(talking(t) ? 3.5 : 0.25, talking(t) ? 0.25 : 0.03, 0.02);
  // el equipo entra por el portal
  team.forEach((f, j) => {
    const k = e3(pr(t, T.in0 + 0.25 * j, T.in1 - T.in0)), dst = V(0.35 - 0.6 * j, 0, -1.2);
    f.position.copy(f.userData.p0).lerp(dst, k); face(f, dst.clone().sub(f.userData.p0).normalize());
    walkPose(f, t * 8 + j, k > 0 && k < 1 ? 1 : 0); f.visible = k < 0.999;
  });
  // las ventanas: la linterna del equipo (D y luego B) y el alfabeto
  for (const key in winU) winU[key].uI.value = 0;
  const dOn = sm(T.d0, T.d0 + 0.3, t) * (1 - sm(T.d1, T.d1 + 0.3, t)), bOn = sm(T.b0, T.b0 + 0.3, t) * (1 - sm(T.cada - 0.3, T.cada, t));
  const fl = 0.75 + 0.25 * Math.sin(t * 23) * Math.sin(t * 7);
  const wd = winU['3_5'], wb = winU['3_1'];
  if (dOn > 0) { wd.uI.value = 0.9 * dOn * fl; wd.uCol.value.setRGB(1.6, 1.35, 0.95); }
  if (bOn > 0) { wb.uI.value = 0.9 * bOn * fl; wb.uCol.value.setRGB(1.6, 1.35, 0.95); }
  const tp = dOn >= bOn ? WD : WB; torchL.position.set(tp.x, tp.y, 0.9); torchL.intensity = 10 * Math.max(dOn, bOn) * fl;
  LETWIN.forEach(([k, i], n) => {
    const a = sm(letT(n) - 0.05, letT(n) + 0.1, t) * (1 - sm(T.aver - 0.3, T.aver + 0.2, t));
    if (a <= 0) return;
    const u = winU[k + '_' + i]; u.uI.value = a * (0.35 + 0.9 * pulse(t, letT(n) + 0.08, 0.15)); u.uCol.value.setRGB(0.3, 1.6, 2.2);
  });
}

// ------------------------------------------------------------------ capa 2D
function proj(v) { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * W2, y: (-p.y * 0.5 + 0.5) * H2, ok: p.z < 1 }; }
function chip(x, y, text, col, a, s = 1, icon = null, px = 56, clampY = true) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a); g.translate(cl(x, 200, W2 - 200), clampY ? cl(y, 470, H2 - 230) : y); g.scale(s, s);
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
function pill(x, y, text, col, a, px = 40) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a); g.font = `400 ${px}px Bebas`; const w = g.measureText(text).width + 50, h = px * 1.45;
  rr(x - w / 2, y - h / 2, w, h, h / 2); g.fillStyle = 'rgba(8,10,14,0.86)'; g.fill(); g.strokeStyle = col; g.lineWidth = 3; g.stroke();
  txt(text, x, y + px * 0.35, px, col, 400, 'center', 'Bebas'); g.restore();
}
// ondas de radio que salen de la antena mientras se habla
function waves(t, p, a) {
  if (a <= 0.01 || !p.ok) return;
  g.save(); g.globalAlpha = cl(a);
  for (let k = 0; k < 3; k++) {
    const u = ((t * 1.6 + k / 3) % 1), r = 30 + 150 * u;
    g.beginPath(); g.arc(p.x, p.y, r, -Math.PI * 0.85, -Math.PI * 0.15); g.strokeStyle = `rgba(72,214,255,${(0.9 * (1 - u)).toFixed(3)})`; g.lineWidth = 6; g.stroke();
  }
  g.restore();
}
// el panel de la radio: lo que se dice, con su onda; con ruido, la letra salta entre B y D
function radioPanel(t) {
  const a1 = sm(T.bravo1 - 0.25, T.bravo1, t) * (1 - sm(T.radio + 0.3, T.radio + 0.6, t));
  const a3 = sm(T.sirenas - 0.2, T.sirenas + 0.1, t) * (1 - sm(T.minutos + 0.2, T.minutos + 0.5, t));
  const a5 = sm(T.poreso - 0.1, T.poreso + 0.15, t) * (1 - sm(T.cada - 0.3, T.cada, t));
  const a = Math.max(a1, a3, a5);
  if (a <= 0.005) return;
  const y = 1490, noisy = a3 > 0.5 && t < T.puerta;
  g.save(); g.globalAlpha = cl(a);
  rr(70, y - 95, 940, 190, 40); g.fillStyle = 'rgba(8,10,14,0.88)'; g.fill(); g.strokeStyle = noisy ? ORANGE2 : a5 > 0.5 ? GREEN2 : CYAN2; g.lineWidth = 4; g.stroke();
  // icono de radio
  rr(110, y - 60, 46, 104, 10); g.fillStyle = '#20242c'; g.fill(); g.fillStyle = talking(t) ? RED2 : '#3a2020'; g.beginPath(); g.arc(133, y - 40, 7, 0, 7); g.fill();
  g.fillStyle = '#2c313a'; g.fillRect(146, y - 92, 6, 36);
  // la onda (barras); con ruido, más caótica
  for (let i = 0; i < 26; i++) {
    const x = 190 + i * 11, n = Math.abs(Math.sin(i * 1.7 + t * 18) * Math.sin(i * 0.6 - t * 9));
    const h = talking(t) ? 10 + 60 * n * (noisy ? 0.6 + 0.8 * rnd(i + Math.floor(t * 30)) : 1) : 6;
    g.fillStyle = noisy ? `rgba(255,138,61,0.9)` : a5 > 0.5 ? 'rgba(62,240,138,0.9)' : 'rgba(72,214,255,0.9)'; g.fillRect(x, y - h / 2, 6, h);
  }
  // el texto que llega
  let s = 'TERCERO…';
  if (a1 > 0.5) s = t > T.delta1 - 0.05 ? '«BRAVO»  ·  «DELTA»' : '«BRAVO»';
  if (a3 > 0.5) {
    const flip = Math.floor(t * 7) % 2 === 0;
    s = t < T.be3 - 0.1 ? 'TERCERO… ¿?' : `TERCERO ${flip ? 'BE' : 'DE'}`;
    if (t > T.puerta - 0.1) s = 'TERCERO DE';
  }
  if (a5 > 0.5) s = t > T.delta5 - 0.05 ? '«BRAVO» ≠ «DELTA»' : 'TERCERO BRAVO';
  const gl = noisy && t > T.be3 - 0.1 ? (rnd(Math.floor(t * 24)) - 0.5) * 14 : 0;
  g.font = '400 70px Bebas'; const px = Math.min(70, 70 * 560 / g.measureText(s).width);
  txt(s, 760 + gl, y + px * 0.36, px, noisy ? '#FFD2B0' : '#F4F6F8', 400, 'center', 'Bebas');
  if (noisy) { g.globalAlpha = cl(a) * 0.25; for (let k = 0; k < 40; k++) { g.fillStyle = '#ffffff'; g.fillRect(470 + rnd(k + Math.floor(t * 30)) * 520, y - 70 + rnd(k * 3.3 + Math.floor(t * 30)) * 140, 3 + 30 * rnd(k * 7.1), 2); } }
  g.restore();
}
// el plano del tercero: rellano con las puertas A, B, C y D; el equipo va a la D (mal) y luego a la B (bien)
function planCard(t) {
  const a = sm(T.puerta - 0.25, T.puerta + 0.05, t) * (1 - sm(T.cada - 0.35, T.cada - 0.05, t));
  if (a <= 0.005) return;
  const y0 = 960, x0 = 120, w = 840, h = 330;
  g.save(); g.globalAlpha = cl(a); g.translate(0, (1 - bk(cl(a))) * 40);
  rr(x0 - 20, y0 - 20, w + 40, h + 40, 32); g.fillStyle = 'rgba(14,52,98,0.93)'; g.fill(); g.strokeStyle = '#cfe4ff'; g.lineWidth = 3; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 1; for (let i = x0; i < x0 + w; i += 24) { g.beginPath(); g.moveTo(i, y0); g.lineTo(i, y0 + h); g.stroke(); }
  txt('PLANTA 3.ª', x0 + 20, y0 + 44, 40, '#e8f1ff', 400, 'left', 'Bebas');
  // rellano y escalera
  const cy = y0 + 190; g.strokeStyle = '#e8f1ff'; g.lineWidth = 3; g.strokeRect(x0 + 20, cy - 40, w - 40, 80);
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(x0 + 30 + i * 12, cy - 38); g.lineTo(x0 + 30 + i * 12, cy + 38); g.stroke(); }
  txt('ESCALERA', x0 + 64, cy + 74, 26, '#cfe4ff', 400, 'center', 'Bebas');
  // las cuatro puertas (A y B arriba, C y D abajo)
  const doors = { A: [x0 + 250, cy - 40, -1], B: [x0 + 480, cy - 40, -1], C: [x0 + 480, cy + 40, 1], D: [x0 + 710, cy + 40, 1] };
  const gotD = sm(T.d0 + 0.4, T.d0 + 0.8, t) * (1 - sm(T.d1, T.d1 + 0.3, t)), gotB = sm(T.b0 + 0.3, T.b0 + 0.7, t);
  for (const [L, [x, y, s]] of Object.entries(doors)) {
    const bad = L === 'D' && gotD > 0.5, good = L === 'B' && gotB > 0.5;
    g.fillStyle = bad ? 'rgba(255,75,62,0.35)' : good ? 'rgba(62,240,138,0.35)' : 'rgba(207,228,255,0.12)';
    g.fillRect(x - 80, s < 0 ? y - 110 : y, 160, 110); g.strokeStyle = bad ? RED2 : good ? GREEN2 : '#e8f1ff'; g.lineWidth = 3; g.strokeRect(x - 80, s < 0 ? y - 110 : y, 160, 110);
    g.fillStyle = '#0e3462'; g.fillRect(x - 26, y - 3, 52, 6);
    txt(L, x, (s < 0 ? y - 44 : y + 72), 60, bad ? RED2 : good ? GREEN2 : '#e8f1ff', 400, 'center', 'Bebas');
  }
  // la persona, en la B (pulsa)
  const pb = doors.B, pk = 0.6 + 0.4 * Math.sin(t * 8);
  g.beginPath(); g.arc(pb[0] + 50, pb[1] - 78, 14 + 4 * pk, 0, 7); g.fillStyle = gotB > 0.5 ? GREEN2 : RED2; g.fill();
  // el equipo: de la escalera a la D (mal) y, con «Bravo», a la B
  const st = [x0 + 120, cy], pD = [doors.D[0], cy + 20], pB = [doors.B[0], cy - 20];
  const kD = e3(pr(t, T.d0, 0.7)), kB = e3(pr(t, T.b0 - 0.2, 0.8));
  let tx = mx(st[0], pD[0], kD), ty = mx(st[1], pD[1], kD);
  if (t > T.b0 - 0.2) { tx = mx(pD[0], pB[0], kB); ty = mx(pD[1], pB[1], kB); }
  for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(tx - 18 + 36 * j, ty, 13, 0, 7); g.fillStyle = GOLD2; g.fill(); g.strokeStyle = '#1a1a1a'; g.lineWidth = 2; g.stroke(); }
  // el reloj que corre mientras están en la puerta equivocada
  const ck = gotD * (1 - sm(T.b0, T.b0 + 0.3, t));
  if (ck > 0.01) { g.globalAlpha = cl(a) * ck; const lost = Math.floor(20 + 160 * pr(t, T.d0 + 0.8, 2.6)); txt(`+${Math.floor(lost / 60)}:${String(lost % 60).padStart(2, '0')}`, x0 + w - 30, y0 + 44, 48, RED2, 400, 'right', 'Bebas'); }
  g.restore();
}
// la tabla del alfabeto (como la pizarra): A–M y N–Z, cada letra cuando se enciende su ventana
function alphaBoard(t) {
  const a = sm(T.cada - 0.2, T.cada + 0.1, t) * (1 - sm(T.aver - 0.3, T.aver, t));
  if (a <= 0.005) return;
  const y0 = 640, rowH = 62, cw = 460;
  g.save(); g.globalAlpha = cl(a);
  rr(50, y0 - 40, 980, 13 * rowH + 60, 36); g.fillStyle = 'rgba(8,10,14,0.82)'; g.fill(); g.strokeStyle = 'rgba(72,214,255,0.6)'; g.lineWidth = 3; g.stroke();
  ALFA.forEach((wd, n) => {
    const k = sm(letT(n) - 0.05, letT(n) + 0.1, t); if (k <= 0) return;
    const col = n < 13 ? 0 : 1, row = n % 13, x = 90 + col * (cw + 20), y = y0 + 12 + row * rowH;
    const hl = pulse(t, letT(n) + 0.08, 0.15), L = String.fromCharCode(65 + n);
    g.save(); g.globalAlpha = cl(a) * k; g.translate(x, y); g.scale(1 + 0.15 * hl, 1 + 0.15 * hl);
    txt(L, 20, 18, 52, n === 1 || n === 3 ? GOLD2 : CYAN2, 400, 'center', 'Bebas');
    txt('→', 70, 16, 40, 'rgba(255,255,255,0.5)', 400, 'center', 'Bebas');
    txt(wd, 110, 18, 50, '#F4F6F8', 400, 'left', 'Bebas');
    if (wd === 'ECHO') { g.font = '400 50px Bebas'; txt('«ECO»', 110 + g.measureText(wd).width + 16, 18, 40, 'rgba(255,255,255,0.6)', 400, 'left', 'Bebas'); }   // como se pronuncia (la pizarra de Javi)
    g.restore();
  });
  g.restore();
  stamp('📌 GUÁRDALO', 1560, GOLD2, sm(T.pilotos - 0.3, T.pilotos, t) * (1 - sm(T.aver - 0.3, T.aver, t)), 96, -0.04);
}
const OPTS = [['A', 'QUESO'], ['B', 'QUIJOTE'], ['C', 'QUEBEC']];
function cards(t) {                    // la Q: 3 tarjetas; tras «¡Tiempo!», queso y Quijote tachadas y Quebec en verde
  const tIn = [T.oA, T.oB, T.oC];
  OPTS.forEach(([L, s], i) => {
    const k = bk(pr(t, tIn[i] - 0.2, 0.4)) * (1 - sm(T.ahora - 0.3, T.ahora, t));
    if (k <= 0.005) return;
    const bad = i < 2 && t > T.tiempo + 0.05, good = i === 2 && t > T.quebec9 - 0.05;
    const cx = 188 + i * 352, cy = 726;
    const shake = bad ? 10 * Math.sin(t * 80) * pulse(t, T.tiempo + 0.2, 0.2) : 0;
    const pl = !bad && t > T.count0 && t < T.tiempo ? 1 + 0.04 * Math.max(0, Math.sin((t - T.count0) * 7 - i * 1.3)) : 1;
    const pop = good ? 1 + 0.12 * pulse(t, T.quebec9 + 0.1, 0.15) : 1;
    g.save(); g.globalAlpha = cl(k * 1.3); g.translate(cx + shake, cy + (1 - cl(k)) * 80); g.scale(pl * pop, pl * pop);
    const col = bad ? RED2 : good ? GREEN2 : COLS[i];
    rr(-164, -58, 328, 116, 36); g.fillStyle = bad ? 'rgba(58,8,8,0.94)' : good ? 'rgba(8,46,22,0.94)' : 'rgba(9,12,17,0.9)'; g.fill();
    g.lineWidth = bad || good ? 7 : 3; g.strokeStyle = bad || good ? col : 'rgba(255,255,255,0.3)'; g.stroke();
    g.beginPath(); g.arc(-112, 0, 36, 0, 7); g.fillStyle = col; g.fill();
    txt(bad ? '✗' : good ? '✓' : L, -112, 19, 54, '#0b0d10', 400, 'center', 'Bebas');
    txt(s, 42, 19, 56, '#F2F5F8', 400, 'center', 'Bebas');
    if (bad) { g.strokeStyle = RED2; g.lineWidth = 7; g.beginPath(); g.moveTo(-60, 3); g.lineTo(144, 3); g.stroke(); }
    g.restore();
  });
}
function flag(x, y, kind, a) {          // banderas sencillas: inglés (Reino Unido), francés y español
  if (a <= 0.01) return;
  const w = 150, h = 96;
  g.save(); g.globalAlpha = cl(a); g.translate(x, y); g.scale(0.7 + 0.3 * bk(cl(a)), 0.7 + 0.3 * bk(cl(a)));
  rr(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 10); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill();
  g.save(); rr(-w / 2, -h / 2, w, h, 6); g.clip();
  if (kind === 'fr') { [['#0055A4', 0], ['#FFFFFF', 1], ['#EF4135', 2]].forEach(([c, i]) => { g.fillStyle = c; g.fillRect(-w / 2 + i * w / 3, -h / 2, w / 3 + 1, h); }); }
  else if (kind === 'es') { g.fillStyle = '#AA151B'; g.fillRect(-w / 2, -h / 2, w, h); g.fillStyle = '#F1BF00'; g.fillRect(-w / 2, -h / 4, w, h / 2); }
  else {
    g.fillStyle = '#012169'; g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 18; g.beginPath(); g.moveTo(-w / 2, -h / 2); g.lineTo(w / 2, h / 2); g.moveTo(w / 2, -h / 2); g.lineTo(-w / 2, h / 2); g.stroke();
    g.strokeStyle = '#C8102E'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#FFFFFF'; g.fillRect(-w / 2, -14, w, 28); g.fillRect(-14, -h / 2, 28, h);
    g.fillStyle = '#C8102E'; g.fillRect(-w / 2, -8, w, 16); g.fillRect(-8, -h / 2, 16, h);
  }
  g.restore(); g.restore();
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  // la radio del mando: ondas cuando se habla
  chief.updateMatrixWorld(true);
  const pr2 = proj(chief.localToWorld(V(0.19, 1.66, -0.2)));
  waves(t, pr2, talking(t) ? sm(0, 0.2, t) : 0);
  // «3.º B» sobre la ventana de la persona y «3.º D» sobre la equivocada
  const pb = proj(V(WB.x, WB.y + 1.45, 0.3)), pd = proj(V(WD.x, WD.y + 1.45, 0.3));
  chip(pb.x, pb.y, '3.º B', RED2, pb.ok ? Math.max(sm(T.tercero - 0.1, T.tercero + 0.2, t) * (1 - sm(T.sirenas - 0.3, T.sirenas, t)), sm(T.bravo5 + 0.2, T.bravo5 + 0.5, t) * (1 - sm(T.cada - 0.3, T.cada, t))) : 0, 1.0, 'warn', 58);
  chip(pd.x, pd.y, '3.º D', RED2, pd.ok ? sm(T.d0, T.d0 + 0.3, t) * (1 - sm(T.d1, T.d1 + 0.3, t)) : 0, 1.0, 'x', 58);
  chip(pb.x, pb.y + 230, '¡LOCALIZADO!', GREEN2, pb.ok ? sm(T.imposibles - 0.1, T.imposibles + 0.2, t) * (1 - sm(T.cada - 0.3, T.cada, t)) : 0, 1.0, 'ok', 56);
  radioPanel(t);
  planCard(t);
  stamp('PUERTA EQUIVOCADA', 1130, RED2, sm(T.equivocada - 0.1, T.equivocada + 0.2, t) * (1 - sm(T.minutos + 0.4, T.minutos + 0.7, t)), 96, -0.04);
  alphaBoard(t);
  // el reto: la Q, la cuenta 1 → 5 y «¡TIEMPO!»
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
  // Quebec: igual en inglés, francés y español
  const fa = 1 - sm(T.ahora - 0.3, T.ahora, t);
  flag(290, 1000, 'en', sm(T.ingles - 0.1, T.ingles + 0.2, t) * fa);
  flag(540, 1000, 'fr', sm(T.frances - 0.1, T.frances + 0.2, t) * fa);
  flag(790, 1000, 'es', sm(T.espanol - 0.1, T.espanol + 0.2, t) * fa);
  pill(540, 1130, 'QUEBEC = QUEBEC = QUEBEC', GREEN2, sm(T.espanol + 0.1, T.espanol + 0.4, t) * fa, 46);
  // tu nombre como un bombero
  const na = sm(T.ahora - 0.1, T.ahora + 0.2, t) * (1 - sm(T.fin - 0.3, T.fin + 0.05, t));
  if (na > 0) {
    g.save(); g.globalAlpha = na; g.translate(540, 900); g.scale(0.85 + 0.15 * bk(cl(na)), 0.85 + 0.15 * bk(cl(na)));
    rr(-450, -120, 900, 240, 40); g.fillStyle = 'rgba(8,10,14,0.88)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 4; g.stroke();
    txt('ANA', 0, -38, 76, GOLD2, 400, 'center', 'Bebas');
    const parts = ['ALFA', 'NOVEMBER', 'ALFA'];
    parts.forEach((p, i) => { const k = sm(T.ahora + 0.4 + i * 0.35, T.ahora + 0.6 + i * 0.35, t); g.save(); g.globalAlpha = na * k; txt(p, -290 + i * 290, 72, 64, '#F4F6F8', 400, 'center', 'Bebas'); g.restore(); });
    g.restore();
    const b = 1 + 0.05 * Math.max(0, Math.sin((t - T.nombre) * 6));
    g.save(); g.globalAlpha = na * sm(T.nombre - 0.15, T.nombre + 0.15, t); g.translate(540, 1560); g.scale(b, b); rr(-400, -56, 800, 112, 56); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('💬  ESCRIBE TU NOMBRE', 0, 20, 58, '#F2F5F8', 400, 'center', 'Bebas'); g.restore();
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
  const fl1 = Math.exp(-Math.pow((t - T.tiempo - 0.03) / 0.07, 2)) * 0.35, fl2 = Math.exp(-Math.pow((t - T.imposibles - 0.05) / 0.08, 2)) * 0.18;
  finMat.uniforms.uFlash.value = Math.max(fl1, fl2);
  if (fl1 >= fl2) finMat.uniforms.uFlashCol.value.setRGB(1, 0.35, 0.3); else finMat.uniforms.uFlashCol.value.setRGB(0.55, 1.0, 0.7);
  finMat.uniforms.uDim.value = (t >= T.fin ? mx(1, 0.5, sm(T.compartir - 0.2, T.compartir + 0.3, t)) : 1) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  await overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 2.5);

(async () => {
  try {
    while (!_r2d) await new Promise(r => setTimeout(r, 30));
    await document.fonts.ready;
    NOISE = noiseTex(); mats();
    setupTimes(); buildWorld();
    world.updateMatrixWorld(true);
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'alfabeto: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
