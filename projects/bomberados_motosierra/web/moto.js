// «La motosierra: la parte con la que nunca se corta» — idea de Adrián (Notion «MIÉRCOLES 18 MOTOSIERRA»); 30–40 s.
// De noche, tras el temporal: un árbol caído sobre un coche con alguien dentro, y tú con la motosierra. Una sola idea:
// la máquina te mueve según con qué parte de la espada cortes — con la de abajo tira de ti (tracción), con la de arriba te
// empuja (empuje) y con el cuarto superior de la punta REBOTA hacia tu cara; salta el freno de cadena y la para en seco.
// La motosierra es genérica (sin marca). Todo el estado depende solo de t. Motor de projects/bomberados_escala/web/escala.js.
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






// ================================================================== la motosierra: de noche, tras el temporal, un árbol caído sobre un coche
const world = new THREE.Group(); scene.add(world);
scene.fog.density = 0.012;
renderer.localClippingEnabled = true;
const RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D';
const COLS = ['#FF7A1A', '#2DD4BF', '#F0457A', '#8B7CF6'];
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
// el árbol: eje del tronco, de la raíz (al otro lado de la acera) a la copa (a este lado), apoyado en el techo del coche
const R0 = V(0, 1.75, -3.6), R1 = V(0, 0.35, 7.0), TDIR = R1.clone().sub(R0).normalize();
const axisY = z => R0.y + (z - R0.z) * (R1.y - R0.y) / (R1.z - R0.z), trR = z => 0.42 - 0.0342 * (z - R0.z), TP = z => V(0, axisY(z), z);
const ZA = 2.4, ZK = 1.85;                 // plano del corte y rama del rebote
const MS = 1.25;                           // la motosierra, un poco más grande de lo real (para que se vea)
const OPX = -0.75, X0 = OPX + 0.45;        // el que corta (mira hacia +X) y dónde lleva la máquina
const HL = V(-0.02 * MS, 0.19 * MS, 0), HR = V(-0.45 * MS, 0.06 * MS, 0);      // asa delantera (mano izquierda) y empuñadura trasera (derecha), respecto al origen de la máquina
let truck, beacons = [], saw, op, opR, opArmL, opArmR, opLegL, opLegR, co, car, blink = [], winM, trunkA, trunkB, crown, kerfT, kerfB, clipT, clipB, chips, chipM, limbK, keyL, XK = 0.3;
let zBot, zTop, zTip;

function addLegs(ff) {
  ff.updateMatrixWorld(true);
  const legs = [-1, 1].map(s => { const L = new THREE.Group(); L.position.set(0.11 * s, 0.85, 0); ff.add(L); return L; });
  ff.updateMatrixWorld(true);
  for (const m of [...ff.children]) if (m.isMesh && m.position.y < 0.8 && Math.abs(Math.abs(m.position.x) - 0.11) < 0.01) legs[m.position.x > 0 ? 1 : 0].attach(m);
  ff.userData.legs = legs; return ff;
}
function face(o, dir) { o.rotation.y = Math.atan2(-dir.x, -dir.z); }      // el bombero mira hacia −Z
function between(m, a, b) {             // barra de 1 m (eje Y) estirada de a a b
  const d = b.clone().sub(a), L = Math.max(1e-4, d.length());
  m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
}
// brazos y piernas articulados (hombro → codo → mano; cadera → rodilla → tobillo)
function stripArm(ff, side) { for (const m of ff.children) if (m.isMesh && m.position.x * side > 0.285 && m.position.y < 1.42) m.visible = false; }
function mkArm() {
  const jm = new THREE.MeshStandardMaterial({ color: 0x232c3e, roughness: 0.78 });
  const A = { u: new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.064, 1, 12), jm), f: new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.056, 1, 12), jm),
    e: new THREE.Mesh(new THREE.SphereGeometry(0.067, 12, 10), jm), g: new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 10), M.black) };
  for (const k in A) { A[k].castShadow = true; world.add(A[k]); }
  return A;
}
function armTo(A, S, Tg, hint, L1 = 0.33, L2 = 0.33) {
  const d = Tg.clone().sub(S), dn = d.clone().normalize(), D = Math.min(d.length(), L1 + L2 - 0.004);
  const hand = S.clone().addScaledVector(dn, D);
  const a = (L1 * L1 - L2 * L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const n = hint.clone().addScaledVector(dn, -hint.dot(dn)); if (n.lengthSq() < 1e-6) n.set(1, 0, 0); n.normalize();
  const E = S.clone().addScaledVector(dn, a).addScaledVector(n, h);
  between(A.u, S, E); between(A.f, E, hand); A.e.position.copy(E); A.g.position.copy(hand);
}
function mkLeg() {
  const navy = new THREE.MeshStandardMaterial({ color: 0x1a2130, roughness: 0.84 });
  const tape = new THREE.MeshStandardMaterial({ color: 0xe0d96f, roughness: 0.35, metalness: 0.15, emissive: 0x6b6624, emissiveIntensity: 1.0 });
  const L = { u: new THREE.Mesh(new THREE.CylinderGeometry(0.094, 0.088, 1, 14), navy), f: new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.08, 1, 14), navy),
    e: new THREE.Mesh(new THREE.SphereGeometry(0.091, 14, 10), navy), h: new THREE.Mesh(new THREE.SphereGeometry(0.096, 14, 10), navy), g: new THREE.Mesh(new RoundedBoxGeometry(0.31, 0.13, 0.135, 3, 0.045), M.black),
    b: new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.083, 0.05, 14, 1, true), tape) };
  for (const k in L) { L[k].castShadow = true; world.add(L[k]); }
  return L;
}
function legTo(L, hip, ankle, hint, L1 = 0.38, L2 = 0.36) {
  const d = ankle.clone().sub(hip), dn = d.clone().normalize(), D = Math.min(d.length(), L1 + L2 - 0.004);
  const end = hip.clone().addScaledVector(dn, D);
  const a = (L1 * L1 - L2 * L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const n = hint.clone().addScaledVector(dn, -hint.dot(dn)); if (n.lengthSq() < 1e-6) n.set(1, 0, 0); n.normalize();
  const K = hip.clone().addScaledVector(dn, a).addScaledVector(n, h);
  between(L.u, hip, K); between(L.f, K, end); L.e.position.copy(K); L.h.position.copy(hip); L.g.position.copy(end).add(V(0.035, -0.075, 0));
  L.b.position.copy(K).lerp(end, 0.62); L.b.quaternion.copy(L.f.quaternion);
}

// ------------------------------------------------------------------ la motosierra (origen: donde nace la espada; +X hacia la punta, +Y arriba)
const BAR0 = 0.085, BAR1 = 0.508, BH = 0.0425, CH = 0.0478, SPX = 0.03;      // espada (inicio, centro de la punta, media altura), contorno de la cadena y piñón
const LP = 2 * (BAR1 - SPX) + 2 * Math.PI * CH;                             // longitud del contorno de la cadena
function chainAt(s) {              // punto y tangente del contorno (por arriba va hacia la punta; por abajo vuelve)
  s = ((s % LP) + LP) % LP; const a = BAR1 - SPX, c = Math.PI * CH;
  if (s < a) return [SPX + s, CH, 1, 0];
  if (s < a + c) { const q = Math.PI / 2 - (s - a) / CH; return [BAR1 + CH * Math.cos(q), CH * Math.sin(q), Math.sin(q), -Math.cos(q)]; }
  if (s < 2 * a + c) return [BAR1 - (s - a - c), -CH, -1, 0];
  const q = -Math.PI / 2 - (s - 2 * a - c) / CH; return [SPX + CH * Math.cos(q), CH * Math.sin(q), Math.sin(q), -Math.cos(q)];
}
function makeSaw() {
  const G = new THREE.Group(), ud = {};
  const org = new THREE.MeshStandardMaterial({ color: 0xe8500a, roughness: 0.45, metalness: 0.05, emissive: 0xe8500a, emissiveIntensity: 0.05 });
  const gry = new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.55 });
  const lite = new THREE.MeshStandardMaterial({ color: 0xb4bac3, roughness: 0.42, metalness: 0.55 });
  const barM = new THREE.MeshStandardMaterial({ color: 0x7d858f, roughness: 0.42, metalness: 0.45 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m; };
  // cuerpo (motor), tapa del cilindro, escape, arranque
  add(new RoundedBoxGeometry(0.36, 0.19, 0.2, 4, 0.045), org, -0.08, 0.0, 0);
  add(new RoundedBoxGeometry(0.2, 0.075, 0.16, 3, 0.03), org, -0.1, 0.115, 0);
  add(new RoundedBoxGeometry(0.075, 0.085, 0.11, 2, 0.02), lite, 0.065, 0.055, -0.04);
  add(new THREE.CylinderGeometry(0.082, 0.082, 0.03, 26), gry, -0.1, 0.005, 0.105, Math.PI / 2, 0, 0);
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 22), lite, -0.1, 0.005, 0.124, Math.PI / 2, 0, 0);
  add(new RoundedBoxGeometry(0.075, 0.03, 0.045, 2, 0.01), M.black, -0.16, 0.165, 0.045);                    // tirador del arranque
  for (const x of [-0.2, -0.02]) add(new THREE.CylinderGeometry(0.028, 0.028, 0.025, 16), M.black, x, 0.055 - (x + 0.2) * 0.3, -0.105, Math.PI / 2, 0, 0);      // tapones de los depósitos
  // empuñadura trasera (lazo con el acelerador)
  { const o = new THREE.Shape(); o.moveTo(-0.24, 0.095); o.lineTo(-0.44, 0.095); o.quadraticCurveTo(-0.475, 0.095, -0.475, 0.06); o.lineTo(-0.465, -0.06); o.quadraticCurveTo(-0.46, -0.09, -0.43, -0.09); o.lineTo(-0.24, -0.095); o.closePath();
    const h = new THREE.Path(); h.moveTo(-0.27, 0.04); h.lineTo(-0.27, -0.055); h.lineTo(-0.425, -0.05); h.lineTo(-0.435, 0.04); h.closePath(); o.holes.push(h);
    const m = add(new THREE.ExtrudeGeometry(o, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 }), org, 0, 0, -0.025);
    add(new RoundedBoxGeometry(0.06, 0.018, 0.02, 1, 0.005), M.black, -0.34, 0.032, 0); }
  // asa delantera: tubo que rodea el cuerpo
  { const c = new THREE.CatmullRomCurve3([V(-0.02, -0.085, 0.118), V(-0.02, 0.06, 0.128), V(-0.02, 0.165, 0.09), V(-0.02, 0.2, 0.0), V(-0.02, 0.17, -0.09), V(-0.02, 0.06, -0.125), V(-0.02, -0.03, -0.118)]);
    add(new THREE.TubeGeometry(c, 40, 0.0145, 10), gry, 0, 0, 0); }
  // protector de la mano = palanca del freno de cadena (pivota: hacia delante, frena)
  ud.guard = new THREE.Group(); ud.guard.position.set(0.045, 0.095, 0); G.add(ud.guard);
  ud.guardM = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.5, emissive: 0xffc83d, emissiveIntensity: 0 });
  add(new RoundedBoxGeometry(0.024, 0.19, 0.19, 3, 0.012), ud.guardM, 0, 0.115, 0, 0, 0, 0, ud.guard);
  add(new RoundedBoxGeometry(0.05, 0.03, 0.15, 2, 0.01), ud.guardM, 0.012, 0.21, 0, 0, 0, 0, ud.guard);
  // espada, garra de tope y tapa del piñón
  { const o = new THREE.Shape(); o.moveTo(BAR0, -BH); o.lineTo(BAR1, -BH); o.absarc(BAR1, 0, BH, -Math.PI / 2, Math.PI / 2, false); o.lineTo(BAR0, BH); o.closePath();
    ud.bar = add(new THREE.ExtrudeGeometry(o, { depth: 0.007, bevelEnabled: false, curveSegments: 20 }), barM, 0, 0, -0.0035);
    add(new THREE.BoxGeometry(0.3, 0.012, 0.0085), gry, 0.3, 0, 0);
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.009, 14), gry, BAR1, 0, 0, Math.PI / 2, 0, 0); }
  for (let i = 0; i < 4; i++) add(new THREE.ConeGeometry(0.011, 0.04, 8), lite, 0.118, -0.062 + i * 0.03, 0.022, 0, 0, -Math.PI / 2);
  add(new RoundedBoxGeometry(0.15, 0.13, 0.03, 2, 0.012), org, 0.03, -0.01, 0.03);
  // la cadena: eslabones que recorren el contorno; uno de cada dos lleva diente de corte
  const N = 56, linkM = new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.5, metalness: 0.5 }), cutM = new THREE.MeshStandardMaterial({ color: 0x9aa2ad, roughness: 0.35, metalness: 0.6 });
  ud.links = new THREE.InstancedMesh(new THREE.BoxGeometry(LP / N * 0.94, 0.0115, 0.0095), linkM, N); ud.cuts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0125, 0.0095, 0.011), cutM, N / 2);
  ud.links.castShadow = true; ud.links.frustumCulled = false; ud.cuts.frustumCulled = false; G.add(ud.links, ud.cuts);
  const dm = new THREE.Object3D();
  ud.setChain = ph => {
    for (let i = 0; i < N; i++) {
      const [x, y, tx, ty] = chainAt(i / N * LP + ph), a = Math.atan2(ty, tx);
      dm.position.set(x, y, 0); dm.rotation.set(0, 0, a); dm.scale.setScalar(1); dm.updateMatrix(); ud.links.setMatrixAt(i, dm.matrix);
      if (i % 2 === 0) { dm.position.set(x + ty * -0.0095, y + tx * 0.0095, 0); dm.updateMatrix(); ud.cuts.setMatrixAt(i / 2, dm.matrix); }
    }
    ud.links.instanceMatrix.needsUpdate = true; ud.cuts.instanceMatrix.needsUpdate = true;
  };
  // las tres zonas de la espada (se encienden): parte de abajo, parte de arriba y cuarto superior de la punta
  const zone = (geo, col, x, y) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, fog: false })); m.position.set(x, y, 0); m.renderOrder = 6; G.add(m); return m; };
  zBot = zone(new RoundedBoxGeometry(BAR1 - 0.13, 0.022, 0.03, 2, 0.008), 0x3ef08a, (BAR1 + 0.13) / 2, -CH - 0.004);
  zTop = zone(new RoundedBoxGeometry(BAR1 - 0.13, 0.022, 0.03, 2, 0.008), 0xff8a3d, (BAR1 + 0.13) / 2, CH + 0.004);
  zTip = zone(new THREE.TorusGeometry(CH + 0.004, 0.012, 8, 18, Math.PI / 2), 0xff3b2e, BAR1, 0);
  ud.org = org; G.userData = ud; G.scale.setScalar(MS);
  return G;
}

// ------------------------------------------------------------------ el coche aplastado (con alguien dentro) y el árbol
function makeCar() {
  const G = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x2a55b0, roughness: 0.36, metalness: 0.35 }), glass = new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.15, metalness: 0.5 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; G.add(m); return m; };
  add(new RoundedBoxGeometry(4.2, 0.62, 1.8, 4, 0.16), body, 0, 0.56, 0);
  // cabina hundida por el tronco: dos mitades que caen hacia el centro
  add(new RoundedBoxGeometry(1.15, 0.5, 1.62, 3, 0.12), glass, -0.82, 1.0, 0, 0, 0, -0.2);
  add(new RoundedBoxGeometry(1.0, 0.46, 1.62, 3, 0.12), glass, 0.52, 0.98, 0, 0, 0, 0.24);
  add(new RoundedBoxGeometry(1.2, 0.06, 1.66, 2, 0.02), body, -0.85, 1.235, 0, 0, 0, -0.2);
  add(new RoundedBoxGeometry(1.02, 0.06, 1.66, 2, 0.02), body, 0.56, 1.2, 0, 0, 0, 0.24);
  for (const [x, z] of [[1.35, 0.86], [-1.35, 0.86], [1.35, -0.86], [-1.35, -0.86]]) { add(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20), M.rubber, x, 0.34, z, Math.PI / 2, 0, 0); add(new THREE.CylinderGeometry(0.19, 0.19, 0.25, 14), M.steel, x, 0.34, z, Math.PI / 2, 0, 0); }
  add(new THREE.BoxGeometry(0.05, 0.13, 1.3), GLOW(0xfff0d0, 0.25), 2.11, 0.62, 0);
  add(new THREE.BoxGeometry(0.05, 0.1, 1.4), GLOW(0xd01818, 0.5), -2.11, 0.68, 0);
  for (const [x, z] of [[2.06, 0.82], [2.06, -0.82], [-2.06, 0.82], [-2.06, -0.82]]) { const b = add(new THREE.BoxGeometry(0.14, 0.13, 0.22), GLOW(0xff8a1a, 1), x, 0.64, z); blink.push(b.material); }
  // la ventanilla de este lado, con luz dentro, y la mano en el cristal
  const wt = canvasTex(256, 128, (x) => {
    const gr = x.createLinearGradient(0, 0, 256, 128); gr.addColorStop(0, '#ffd9a0'); gr.addColorStop(1, '#e79a4a'); x.fillStyle = gr; x.fillRect(0, 0, 256, 128);
    x.fillStyle = 'rgba(20,12,6,0.88)'; x.beginPath(); x.ellipse(70, 120, 46, 64, 0, 0, 7); x.fill(); x.beginPath(); x.arc(70, 46, 28, 0, 7); x.fill();           // silueta
    x.save(); x.translate(176, 76); x.rotate(-0.25); x.beginPath(); x.ellipse(0, 8, 21, 25, 0, 0, 7); x.fill();
    for (let i = 0; i < 4; i++) { x.save(); x.rotate(-0.5 + i * 0.3); x.fillRect(-6, -52, 12, 44); x.beginPath(); x.arc(0, -52, 6, 0, 7); x.fill(); x.restore(); }
    x.save(); x.rotate(1.25); x.fillRect(-6, -40, 12, 34); x.restore(); x.restore();
  });
  winM = new THREE.MeshBasicMaterial({ map: wt, fog: false });
  const w = add(new THREE.PlaneGeometry(0.86, 0.33), winM, 0.5, 0.99, 0.816, 0, 0, 0.24); w.castShadow = false;
  return G;
}
function buildTree() {
  const barkT = canvasTex(256, 512, (x) => { x.fillStyle = '#241a12'; x.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 420; i++) { const v = 18 + rnd(i) * 30; x.fillStyle = `rgba(${v * 1.25},${v * 0.9},${v * 0.6},0.55)`; x.fillRect(rnd(i * 3.7) * 256, rnd(i * 1.9) * 512, 2 + rnd(i * 5.1) * 6, 20 + rnd(i * 2.3) * 110); }
    for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(12,8,5,0.6)'; x.fillRect(rnd(i * 9.7) * 256, rnd(i * 4.1) * 512, 2, 30 + rnd(i * 7.3) * 150); } }, { aniso: 4 });
  barkT.wrapS = barkT.wrapT = THREE.RepeatWrapping; barkT.repeat.set(3, 4);
  const bark = new THREE.MeshStandardMaterial({ map: barkT, color: 0xb9ab9a, roughness: 0.95 });
  const ringT = canvasTex(256, 256, (x) => { x.fillStyle = '#d9b27a'; x.fillRect(0, 0, 256, 256); for (let i = 1; i < 13; i++) { x.strokeStyle = `rgba(120,80,40,${0.25 + 0.2 * (i % 2)})`; x.lineWidth = 2 + (i % 3); x.beginPath(); x.arc(128 + i, 128 - i * 0.6, i * 9.4, 0, 7); x.stroke(); } });
  const wood = new THREE.MeshStandardMaterial({ map: ringT, roughness: 0.8, emissive: 0xd9b27a, emissiveIntensity: 0.1 });
  const seg = (z0, z1) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(trR(z1), trR(z0), 1, 26), [bark, wood, wood]); between(m, TP(z0), TP(z1)); m.castShadow = true; m.receiveShadow = true; return m; };
  trunkA = seg(R0.z, ZA); world.add(trunkA);
  crown = new THREE.Group(); world.add(crown);                       // la parte de la copa (cae al terminar el corte): pivota en su extremo del suelo
  crown.position.copy(TP(R1.z));
  const cAdd = o => { o.updateMatrixWorld(true); crown.updateMatrixWorld(true); crown.attach(o); return o; };
  trunkB = seg(ZA, R1.z); world.add(trunkB); cAdd(trunkB);
  // cepellón arrancado (al otro lado de la acera) y el hoyo
  const soil = new THREE.MeshStandardMaterial({ color: 0x2c2117, roughness: 1 });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.3, 0.42, 22), soil); between(plate, R0.clone().addScaledVector(TDIR, -0.38), R0.clone().addScaledVector(TDIR, 0.04)); plate.scale.y = 1; plate.castShadow = true; world.add(plate);
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 0.9 + rnd(i) * 0.5, 7), bark); r.position.copy(R0).addScaledVector(TDIR, -0.5).add(V(Math.cos(a) * 0.8, Math.sin(a) * 0.8, -0.1)); r.rotation.set(1.2 + rnd(i * 3) * 0.5, 0, a + 1.57); world.add(r); }
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.35, 26), new THREE.MeshStandardMaterial({ color: 0x120d08, roughness: 1 })); hole.rotation.x = -Math.PI / 2; hole.scale.set(1, 0.75, 1); hole.position.set(0.1, 0.135, -4.75); world.add(hole);
  // ramas y hojas de la copa (más allá del corte, a este lado de la calle)
  const leafM = [0x1f3a1c, 0x27482a, 0x18301a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
  for (let i = 0; i < 13; i++) {
    const z = 4.5 + rnd(i * 2.3) * 2.4, a = rnd(i * 7.1) * 6.283, len = 1.4 + rnd(i * 3.9) * 2.0, r0 = 0.05 + rnd(i * 5.3) * 0.05;
    const d = V(-0.15 - Math.abs(Math.cos(a)) * 0.75, 0.25 + Math.abs(Math.sin(a)) * 0.7, 0.55 + rnd(i * 4.7) * 0.5).normalize(), A = TP(z), B = A.clone().addScaledVector(d, len);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r0 * 0.45, r0, 1, 8), bark); between(b, A, B); b.castShadow = true; world.add(b); cAdd(b);
    for (let k = 0; k < 3; k++) { const q = A.clone().lerp(B, 0.55 + k * 0.22).add(V((rnd(i * 11 + k) - 0.5) * 0.7, (rnd(i * 13 + k) - 0.3) * 0.6, (rnd(i * 17 + k) - 0.5) * 0.7)); if (q.z < 5.6) q.z = 5.6 + rnd(i + k) * 0.6; q.x = Math.min(q.x, 0.45);
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 + rnd(i * 19 + k) * 0.5, 0), leafM[(i + k) % 3]); f.position.copy(q); f.position.y = Math.max(0.3, q.y); f.rotation.set(rnd(i + k), rnd(i * 2 + k), 0); f.castShadow = true; world.add(f); cAdd(f); }
  }
  // la rama que no ves: nace del tronco junto al corte y se echa hacia ti (la punta la tocará con su cuarto superior)
  const kA = V(0.95, 0.0, ZK), kB = V(0.1, 2.3, ZK);
  limbK = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.068, 1, 12), [bark, wood, wood]); between(limbK, kA, kB); limbK.castShadow = true; world.add(limbK);
  limbK.userData = { a: kA, b: kB, r: 0.06 };
  for (let k = 0; k < 3; k++) { const p = kA.clone().lerp(kB, 0.5 + 0.2 * k), tw = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.02, 1, 6), bark); between(tw, p, p.clone().add(V(0.25 - 0.1 * k, 0.3 + 0.1 * k, (k - 1) * 0.3))); world.add(tw); }
  // el corte: una ranura oscura que crece (disco recortado por un plano) por arriba y por abajo
  clipT = new THREE.Plane(V(0, 1, 0), -9); clipB = new THREE.Plane(V(0, -1, 0), -9);
  const km = p => new THREE.MeshBasicMaterial({ color: 0x0d0805, clippingPlanes: [p], fog: false });
  kerfT = new THREE.Mesh(new THREE.CylinderGeometry(trR(ZA) + 0.005, trR(ZA) + 0.005, 1, 28), km(clipT)); between(kerfT, TP(ZA - 0.011), TP(ZA + 0.011)); world.add(kerfT);
  kerfB = new THREE.Mesh(new THREE.CylinderGeometry(trR(ZA) + 0.005, trR(ZA) + 0.005, 1, 28), km(clipB)); between(kerfB, TP(ZA - 0.011), TP(ZA + 0.011)); world.add(kerfB);
  // virutas
  chipM = new THREE.MeshBasicMaterial({ color: 0xe6c690, fog: false });
  chips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.016, 0.006, 0.012), chipM, 150); chips.frustumCulled = false; world.add(chips);
}

function buildWorld() {
  world.add(new THREE.HemisphereLight(0x33466e, 0x0a0705, 0.8));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.5); moon.position.set(-12, 30, 18); world.add(moon);
  // la calle mojada, la acera del otro lado y el césped del que se ha arrancado el árbol
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#17181b'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 16 + rnd(i) * 26; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(26, 10);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 44), new THREE.MeshStandardMaterial({ map: asph, color: 0x6a6a6a, roughness: 0.38, metalness: 0.25 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 4); road.receiveShadow = true; world.add(road);
  const lineM = new THREE.MeshStandardMaterial({ color: 0x8e8e86, roughness: 0.5, emissive: 0x0c0c0b });
  for (let i = 0; i < 12; i++) { if (i === 5 || i === 6) continue; const d = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.012, 0.14), lineM); d.position.set(-44 + i * 8, 0.008, 3.6); world.add(d); }
  const curb = new THREE.Mesh(new THREE.BoxGeometry(120, 0.14, 16), new THREE.MeshStandardMaterial({ color: 0x2a2c2f, roughness: 0.9 })); curb.position.set(0, 0.07, -11.2); curb.receiveShadow = true; world.add(curb);
  const grass = new THREE.Mesh(new THREE.BoxGeometry(120, 0.02, 3.4), new THREE.MeshStandardMaterial({ color: 0x15240f, roughness: 1 })); grass.position.set(0, 0.145, -4.9); grass.receiveShadow = true; world.add(grass);
  // fondo: tapia, árboles en pie y farolas
  const wallM = new THREE.MeshStandardMaterial({ color: 0x33302c, roughness: 0.95 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(120, 2.4, 0.3), wallM); wall.position.set(0, 1.3, -8.2); wall.receiveShadow = true; world.add(wall);
  const barkM = new THREE.MeshStandardMaterial({ color: 0x2c2117, roughness: 1 }), leafB = new THREE.MeshStandardMaterial({ color: 0x14241a, roughness: 1, flatShading: true });
  for (const x of [-11, -5.5, 6, 12.5, 19]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 5, 10), barkM); t.position.set(x, 2.6, -5.2); t.castShadow = true; world.add(t);
    for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 + rnd(x + k) * 0.8, 0), leafB); f.position.set(x + (rnd(x * 3 + k) - 0.5) * 2.4, 5.2 + rnd(x * 7 + k) * 1.8, -5.2 + (rnd(x * 5 + k) - 0.5) * 2); world.add(f); }
  }
  const steel = new THREE.MeshStandardMaterial({ color: 0x4a4f57, metalness: 0.8, roughness: 0.4 });
  for (const x of [-8.5, 1.9, 11]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.6, 10), steel); p.position.set(x, 2.8, -3.5); world.add(p);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.26), GLOW(0xffd9a0, 2.0)); h.position.set(x, 5.55, -3.0); world.add(h);
    const l = new THREE.SpotLight(0xffd9a0, 150, 24, 0.8, 0.7, 1.5); l.position.set(x, 5.5, -3.0); l.target.position.set(x * 0.7, 0, -0.6); world.add(l, l.target);
  }
  // hojas por el suelo
  const lm = new THREE.MeshStandardMaterial({ color: 0x2c4a22, roughness: 1, side: THREE.DoubleSide });
  const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.05), lm, 260), dm = new THREE.Object3D();
  for (let i = 0; i < 260; i++) { dm.position.set((rnd(i * 3.3) - 0.5) * 9, 0.012 + rnd(i) * 0.004, -2.5 + rnd(i * 5.1) * 11); dm.rotation.set(-Math.PI / 2 + (rnd(i * 2) - 0.5) * 0.4, 0, rnd(i * 7) * 6.283); dm.updateMatrix(); leaves.setMatrixAt(i, dm.matrix); }
  world.add(leaves);
  // la autobomba (detrás del que corta), sus faros y el foco de trabajo (de este lado: ilumina la máquina de cara a la cámara)
  truck = makeTruck(); truck.position.set(-10.2, 0, -0.9); world.add(truck);
  truck.traverse(o => { if (o.isMesh) o.castShadow = true; }); beacons = truck.userData.lbar;
  const head = new THREE.SpotLight(0xfff0d8, 30, 30, 0.42, 0.7, 1.4); head.position.set(-6.0, 1.3, -0.9); head.target.position.set(1.5, 0.6, 0.8);
  head.castShadow = true; head.shadow.mapSize.set(2048, 2048); head.shadow.bias = -0.0004; world.add(head, head.target);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.8, 10), steel); mast.position.set(-2.7, 1.9, 6.3); world.add(mast);
  const lh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.2), GLOW(0xfff4e0, 2.2)); lh.position.set(-2.65, 3.85, 6.2); lh.lookAt(0, 1, 2); world.add(lh);
  keyL = new THREE.SpotLight(0xfff2e0, 70, 30, 0.6, 0.6, 1.3); keyL.position.set(-2.5, 3.9, 6.1); keyL.target.position.set(0.1, 1.0, ZA - 0.5);
  keyL.castShadow = true; keyL.shadow.mapSize.set(2048, 2048); keyL.shadow.bias = -0.0004; world.add(keyL, keyL.target);
  const fill = new THREE.PointLight(0xa8bce0, 12, 0, 2); fill.position.set(1.4, 2.5, 4.8); world.add(fill);
  // el coche y el árbol
  car = makeCar(); world.add(car);
  const inL = new THREE.PointLight(0xffc890, 3.5, 6, 2); inL.position.set(0.5, 1.0, 1.25); world.add(inL);
  buildTree();
  // el compañero, junto a la ventanilla
  co = makeFirefighter(); bottle.visible = false; co.position.set(2.85, 0, 0.45); face(co, V(-1, 0, -0.1)); world.add(co); co.traverse(o => { if (o.isMesh) o.castShadow = true; });
  // tú: el que lleva la motosierra (brazos y piernas articulados)
  opR = new THREE.Group(); world.add(opR);
  op = makeFirefighter(); bottle.visible = false; addLegs(op); stripArm(op, 1); stripArm(op, -1); face(op, V(1, 0, 0)); opR.add(op);
  op.userData.legs.forEach(l => { l.visible = false; });
  for (const ff of [op, co]) ff.traverse(o => { if (o.isMesh) { o.castShadow = true; if (o.material === M.chrome) o.visible = false; } });
  opArmL = mkArm(); opArmR = mkArm(); opLegL = mkLeg(); opLegR = mkLeg();
  saw = makeSaw(); world.add(saw);
  // dónde toca la punta: se acerca a la rama hasta que el cuarto superior de la punta la roza
  { const u = limbK.userData, d = u.b.clone().sub(u.a).normalize(), rn = CH * MS;
    for (XK = -0.9; XK < 0.4; XK += 0.002) { const c = V(XK + BAR1 * MS, YK, ZK), w = c.clone().sub(u.a), dist = w.sub(d.clone().multiplyScalar(w.dot(d))).length(); if (dist <= u.r + rn) break; } }
}

// ------------------------------------------------------------------ tiempos, la máquina y la cámara
const YK = 1.5;                            // altura de la máquina cuando la punta toca la rama
let T = {}, KEYS = null, KH = null, SK = null, PH = null;
const kf = (keys, t) => {                  // interpolación suave entre claves [t, ...valores]
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const a = keys[i - 1], b = keys[i], u = sm(0, 1, (t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => mx(v, b[j + 1], u)); }
  return keys[keys.length - 1].slice(1);
};
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  T.c0 = T.cortas + 0.5; T.c1 = T.arriba - 0.75;                 // corte por arriba (con la parte de abajo de la espada)
  T.u0 = T.arriba + 0.1; T.u1 = T.punta - 1.0;                   // corte por abajo (con la parte de arriba)
  T.k0 = T.rebote - 0.07; T.k1 = T.k0 + 0.16;                    // la punta toca… y salta
  T.drop = T.antes + 0.45;                                       // la copa cae al suelo (corte terminado)
  const yTop = axisY(ZA) + trR(ZA), yBot = axisY(ZA) - trR(ZA), bh = BH * MS;
  T.yTop = yTop; T.yBot = yBot;
  // claves de la máquina: [t, x del origen, y, z, cabeceo, agachado]
  SK = [
    [0, X0, 1.33, ZA, -0.10, 0], [T.tu - 0.15, X0, 1.33, ZA, -0.10, 0], [T.motosierra + 0.1, X0 + 0.03, 1.47, ZA, 0.16, 0],
    [T.cortar + 0.2, X0 + 0.03, 1.47, ZA, 0.16, 0], [T.cadena + 0.1, X0, yTop + bh + 0.2, ZA, 0, 0], [T.cortas - 0.1, X0, yTop + bh + 0.2, ZA, 0, 0],
    [T.c0, X0, yTop + bh, ZA, 0, 0], [T.tira - 0.05, X0, yTop + bh - 0.11, ZA, 0, 0], [T.tira + 0.22, X0 + 0.1, yTop + bh - 0.15, ZA, -0.03, 0], [T.c1, X0 + 0.1, yTop + bh - 0.26, ZA, -0.03, 0],
    [T.c1 + 0.28, -0.98, 1.0, ZA, 0, 0.3], [T.c1 + 0.55, -0.98, yBot - bh - 0.04, ZA, 0, 1], [T.u0 + 0.15, X0, yBot - bh, ZA, 0, 1],
    [T.empuja - 0.05, X0, yBot - bh + 0.07, ZA, 0, 1], [T.empuja + 0.2, X0 - 0.11, yBot - bh + 0.1, ZA, 0.03, 1], [T.u1, X0 - 0.11, yBot - bh + 0.16, ZA, 0.03, 1],
    [T.u1 + 0.3, -0.98, yBot - bh, ZA, 0, 0.8], [T.u1 + 0.62, -0.9, YK, ZK + 0.2, 0, 0], [T.punta - 0.1, XK - 0.09, YK, ZK, 0, 0], [T.k0, XK, YK, ZK, 0, 0],
  ];
  // fase de la cadena: integral de su velocidad (ralentí, acelerón, a fondo… y parada en seco al saltar el freno)
  const vk = [[0, 0.1], [T.motosierra - 0.2, 0.1], [T.motosierra + 0.15, 0.62], [T.cadena, 0.5], [T.cortas, 0.5], [T.c0, 0.68], [T.k0 + 0.02, 0.68], [T.k0 + 0.13, 0], [END + 1, 0]];
  PH = new Float32Array(Math.ceil((END + 1) * 240) + 2); let acc = 0;
  for (let i = 0; i < PH.length; i++) { PH[i] = acc; acc += kf(vk, i / 240)[0] / 240; }
  T.vk = vk;
  KEYS = camKeys(); KH = KEYS.map(k => [k[0], k[2]]);
}
const chainV = t => kf(T.vk, t)[0];
const phase = t => { const i = cl(t * 240, 0, PH.length - 2), k = Math.floor(i); return mx(PH[k], PH[k + 1], i - k); };
const brake = t => sm(T.k0 + 0.04, T.k0 + 0.1, t);                         // el protector salta hacia delante: freno puesto
function sawPose(t) {              // origen (x, y, z), cabeceo y cuánto se agacha el que corta
  if (t <= T.k0) { const [x, y, z, th, cr] = kf(SK, t); return { x, y, z, th, cr }; }
  // el rebote: gira sobre el asa delantera, que se viene hacia el pecho
  const k = pr(t, T.k0, T.k1 - T.k0), e = 1 - Math.pow(1 - k, 3), u = t - T.k1;
  const back = sm(T.antes - 0.7, T.antes + 0.3, t);                       // después, la baja despacio
  const th = (1.42 * e + (u > 0 ? 0.07 * Math.exp(-u / 0.22) * Math.sin(u * 19) : 0)) * (1 - back) - 0.1 * back;
  const h0 = V(XK + HL.x, YK + HL.y, 0), h1 = V(-0.5, 1.47, 0), h2 = V(X0 + HL.x, 1.3 + HL.y, 0);
  const H = h0.clone().lerp(h1, e).lerp(h2, back), c = Math.cos(th), s = Math.sin(th);
  return { x: H.x - (HL.x * c - HL.y * s), y: H.y - (HL.x * s + HL.y * c), z: ZK, th, cr: 0 };
}
const cutT = t => sm(T.c0, T.c0 + 0.15, t) * (1 - sm(T.c1 - 0.05, T.c1 + 0.1, t));          // está cortando por arriba
const cutB = t => sm(T.u0 + 0.15, T.u0 + 0.3, t) * (1 - sm(T.u1 - 0.05, T.u1 + 0.1, t));    // está cortando por abajo
const dropK = t => { const u = t - T.drop; return u <= 0 ? 0 : Math.min(1, u * u * 14) + (u > 0.27 ? 0.035 * Math.exp(-(u - 0.27) / 0.12) * Math.sin((u - 0.27) * 26) : 0); };
const ANCH = { w: () => V(0, 0, 0), sw: t => { const p = sawPose(Math.min(t, T.k0)); return V(p.x, p.y, p.z); } };
function camKeys() {
  const K = [
    [0, 'w', [4.9, 2.9, 6.1, -0.55, 1.2, 0.6, 48]],                              // el árbol sobre el coche, entero
    [T.coche + 0.5, 'w', [4.3, 2.4, 5.5, -0.45, 1.15, 0.6, 48]],
    [T.dentro + 0.25, 'w', [1.95, 1.3, 2.75, 0.5, 1.0, 0.82, 38]],               // hay alguien dentro: la mano en el cristal
    [T.tu - 0.1, 'w', [1.8, 1.32, 2.8, 0.48, 1.0, 0.82, 38]],
    [T.motosierra + 0.3, 'w', [0.25, 1.62, ZA + 2.15, -0.1, 1.5, ZA, 40]],       // tú llevas la motosierra
    [T.parte1 + 0.2, 'w', [0.25, 1.62, ZA + 1.95, 0.12, 1.52, ZA, 40]],          // la espada: ¿con qué parte nunca?
    [T.cortar + 0.3, 'w', [0.25, 1.62, ZA + 1.9, 0.12, 1.52, ZA, 40]],
    [T.cadena + 0.25, 'sw', [0.4, 0.14, 1.75, 0.37, 0.02, 0, 40]],               // la cadena corre siempre igual
    [T.sentido + 0.5, 'sw', [0.4, 0.14, 1.7, 0.37, 0.02, 0, 40]],
    [T.abajo - 0.1, 'sw', [0.55, 0.42, 2.25, 0.3, -0.06, 0, 42]],                // corta por arriba (parte de abajo de la espada)
    [T.delante + 0.35, 'sw', [0.6, 0.4, 2.2, 0.3, -0.06, 0, 42]],
    [T.arriba + 0.2, 'w', [1.15, 0.72, ZA + 1.75, 0.02, 0.8, ZA, 42]],           // corta por abajo (parte de arriba)
    [T.atras + 0.4, 'w', [1.1, 0.72, ZA + 1.7, 0.02, 0.8, ZA, 42]],
    [T.punta - 0.15, 'w', [0.12, YK + 0.08, ZK + 1.3, XK + 0.52, YK + 0.03, ZK, 38]],      // ¿y con la punta?
    [T.k0 - 0.02, 'w', [0.14, YK + 0.08, ZK + 1.25, XK + 0.52, YK + 0.03, ZK, 38]],
    [T.k1 + 0.3, 'w', [0.75, 1.72, ZK + 2.45, -0.4, 1.62, ZK, 42]],              // ¡rebote!: salta hacia tu cara
    [T.espada + 0.2, 'w', [0.7, 1.74, ZK + 2.35, -0.4, 1.64, ZK, 42]],
    [T.salta + 0.25, 'w', [0.9, 1.82, ZK + 1.5, -0.5, 1.72, ZK - 0.08, 42]],     // la espada, delante de la cara
    [T.cara + 0.45, 'w', [0.85, 1.82, ZK + 1.45, -0.5, 1.72, ZK - 0.08, 42]],
    [T.freno + 0.1, 'w', [0.2, 1.78, ZK + 1.7, -0.42, 1.62, ZK, 40]],            // el freno de cadena
    [T.seco + 0.4, 'w', [0.15, 1.8, ZK + 1.6, -0.4, 1.66, ZK, 40]],
    [T.antes + 0.5, 'w', [4.6, 2.5, 5.6, -0.3, 1.9, 0.4, 46]],                   // la pregunta: se abre
    [T.comenta + 0.5, 'w', [5.0, 2.7, 6.0, -0.3, 2.0, 0.4, 46]],
    [T.compartir + 0.6, 'w', [5.6, 3.2, 6.8, -0.3, 2.2, 0.3, 46]],
    [T.end, 'w', [6.0, 3.6, 7.4, -0.3, 2.4, 0.3, 46]],
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

// ------------------------------------------------------------------ utilidades de la capa 2D
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

function subframes(t) {
  const a = camAt(t - 1 / 240), b = camAt(t + 1 / 240);
  const ang2 = a.q.angleTo(b.q), mv = a.p.distanceTo(b.p) / Math.max(0.5, (a.focus + b.focus) / 2);
  return Math.max(1, Math.min(4, Math.ceil((ang2 + mv) * H2 / (a.fov * Math.PI / 180) / 22)));
}

function camAt(t) {
  const n = KEYS.length; let i = 0; while (i < n - 2 && t > KEYS[i + 1][0]) i++;
  const v = hermite(KH, t);
  let A;
  if (KEYS[i][1] === KEYS[i + 1][1]) A = ANCH[KEYS[i][1]](t);
  else { const u = cl((t - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0])), s = u * u * u * (u * (u * 6 - 15) + 10); A = ANCH[KEYS[i][1]](t).lerp(ANCH[KEYS[i + 1][1]](t), s); }
  const sh = Math.exp(-Math.pow((t - T.k0 - 0.1) / 0.14, 2)) * 0.035 + 0.006 * Math.max(cutT(t), cutB(t)) + Math.exp(-Math.pow((t - T.drop - 0.3) / 0.12, 2)) * 0.03;
  return pose(V(v[0] + A.x + sh * Math.sin(t * 91), v[1] + A.y + sh * Math.cos(t * 77), v[2] + A.z), V(v[3] + A.x, v[4] + A.y, v[5] + A.z), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t (todo depende solo de t)
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
const env = (t, t0, hold = 1.3) => sm(t0 - 0.2, t0 + 0.05, t) * (1 - sm(t0 + hold, t0 + hold + 0.5, t));
const _o = new THREE.Object3D();
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => { f.u.uCam.value.copy(cam.position); f.u.uTime.value = t; });
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = 8 + 70 * on;
  const bl = (t % 0.9) < 0.45 ? 2.6 : 0.12; blink.forEach(m => m.color.setRGB(bl, 0.5 * bl, 0.06 * bl));
  const shim = 0.75 + 0.25 * Math.sin(t * 9);
  // ---------- la máquina
  const S = sawPose(t), cT = cutT(t), cB = cutB(t), v = chainV(t), vib = 0.0025 * (0.3 + v) * Math.sin(t * 173);
  saw.position.set(S.x, S.y + vib, S.z); saw.rotation.set(0, 0, S.th);
  saw.userData.setChain(phase(t) / MS);
  saw.userData.guard.rotation.z = mx(0.2, -0.5, brake(t));
  saw.userData.guardM.emissiveIntensity = 0.3 * env(t, T.freno, 1.6) * shim;
  // las zonas: abajo (verde), arriba (naranja), el cuarto superior de la punta (rojo)
  const q0 = sm(T.parte1 - 0.1, T.parte1 + 0.2, t) * (1 - sm(T.cadena - 0.2, T.cadena + 0.1, t)) * (0.55 + 0.25 * Math.sin(t * 7));
  zBot.material.opacity = Math.max(q0, 0.85 * sm(T.abajo - 0.25, T.abajo, t) * (1 - sm(T.arriba - 0.9, T.arriba - 0.6, t)));
  zTop.material.opacity = Math.max(q0, 0.85 * sm(T.arriba - 0.15, T.arriba + 0.1, t) * (1 - sm(T.punta - 1.0, T.punta - 0.7, t)));
  zTip.material.opacity = Math.max(q0, (0.7 + 0.3 * Math.sin(t * 16)) * sm(T.punta - 0.2, T.punta, t) * (1 - sm(T.salva - 0.3, T.salva, t)), 0.8 * sm(T.seco + 0.3, T.seco + 0.5, t) * (1 - sm(T.antes + 0.1, T.antes + 0.5, t)));
  // ---------- el corte: la ranura crece por donde va la espada; virutas hacia donde las lanza la cadena
  const bh = BH * MS, cutY = Math.min(T.yTop + 0.02, kf(SK, Math.min(Math.max(t, T.c0), T.c1))[1] - bh), cutU = Math.max(T.yBot - 0.02, kf(SK, Math.min(Math.max(t, T.u0 + 0.15), T.u1))[1] + bh);
  clipT.constant = -(t < T.c0 ? 9 : cutY); clipB.constant = (t < T.u0 + 0.15 ? -9 : cutU);
  const drop = dropK(t);
  crown.rotation.x = -0.158 * drop;
  kerfT.visible = kerfB.visible = drop < 0.02;
  const cc = Math.max(cT, cB), dir = cT >= cB ? -1 : 1;
  for (let i = 0; i < 150; i++) {
    const u = (t * 2.6 + rnd(i * 3.7)) % 1, tau = u * 0.42, a = rnd(i * 5.1), b = rnd(i * 9.3);
    if (cc < 0.05 || rnd(i * 2.9 + Math.floor(t * 2.6 + rnd(i * 3.7))) > cc) { _o.position.set(0, -50, 0); _o.scale.setScalar(0.001); }
    else {
      const ex = dir < 0 ? -trR(ZA) * 0.6 : trR(ZA) * 0.7, ey = dir < 0 ? S.y - bh : S.y + bh;
      _o.position.set(ex + dir * (1.6 + 1.4 * a) * tau, ey + (0.5 + 1.6 * b - (dir < 0 ? 0.6 : 0)) * tau - 4.9 * tau * tau, ZA + (rnd(i * 7.7) - 0.5) * 0.9 * tau);
      _o.rotation.set(a * 9 + tau * 30, b * 9, tau * 22); _o.scale.setScalar(0.7 + 1.1 * rnd(i * 1.3));
    }
    _o.updateMatrix(); chips.setMatrixAt(i, _o.matrix);
  }
  chips.instanceMatrix.needsUpdate = true;
  // ---------- tú: el cuerpo sigue a la máquina; se agacha para cortar por abajo; con el rebote se echa atrás
  const kick = pr(t, T.k0, 0.2) * (1 - sm(T.antes - 0.7, T.antes + 0.3, t)), bx = OPX + (Math.min(S.x, X0 + 0.1) - X0) * (S.x < X0 ? 0.92 : 0.5) - 0.07 * kick, bz = S.z - 0.12;
  const lean = 0.1 + 0.2 * S.cr - 0.16 * kick, sink = 0.27 * S.cr;
  opR.position.set(bx, -sink, bz); opR.rotation.z = -lean; opR.updateMatrixWorld(true);
  saw.updateMatrixWorld(true);
  const hl = saw.localToWorld(V(-0.02, 0.2, -0.035)), hr = saw.localToWorld(V(-0.35, 0.055, 0.0));
  armTo(opArmL, op.localToWorld(V(-0.3, 1.45, 0)), hl, V(-0.2, -0.6, -0.8));        // la izquierda, en el asa delantera
  armTo(opArmR, op.localToWorld(V(0.3, 1.45, 0)), hr, V(-0.6, -0.5, 0.6));          // la derecha, en la empuñadura trasera
  legTo(opLegL, op.localToWorld(V(-0.11, 0.85, 0)), V(bx + 0.24, 0.14, bz - 0.13), V(1, 0.25, 0));
  legTo(opLegR, op.localToWorld(V(0.11, 0.85, 0)), V(bx - 0.2, 0.14, bz + 0.13), V(1, 0.25, 0));
  // el compañero, pendiente del de dentro
  co.rotation.z = 0.02 * Math.sin(t * 1.3);
  winM.color.setScalar((0.8 + 0.12 * Math.sin(t * 3.1)) * mx(1, 0.32, sm(T.tu - 0.2, T.tu + 0.5, t)));
}

// ------------------------------------------------------------------ capa 2D: flechas de la cadena, rótulos, la pregunta y la venta
function chainArrows(t, a) {            // flechas que recorren el contorno de la cadena (por fuera)
  if (a <= 0.01) return;
  g.save(); g.fillStyle = CYAN2; g.strokeStyle = 'rgba(8,10,14,0.85)'; g.lineWidth = 3;
  const n = 11;
  for (let i = 0; i < n; i++) {
    const s = ((i / n + t * 0.16) % 1) * LP, [x, y, tx, ty] = chainAt(s);
    if (x < 0.14) continue;
    const off = 0.046, p = proj(saw.localToWorld(V(x + ty * -off, y + tx * off, 0))), p2 = proj(saw.localToWorld(V(x + ty * -off + tx * 0.02, y + tx * off + ty * 0.02, 0)));
    const ang = Math.atan2(p2.y - p.y, p2.x - p.x);
    g.save(); g.globalAlpha = a * cl((x - 0.14) / 0.06); g.translate(p.x, p.y); g.rotate(ang); g.scale(1.9, 1.9); g.beginPath(); g.moveTo(17, 0); g.lineTo(-11, -13); g.lineTo(-4, 0); g.lineTo(-11, 13); g.closePath(); g.stroke(); g.fill(); g.restore();
  }
  g.restore();
}
function bigArrow(x0, y0, x1, y1, col, a, w = 26) {
  if (a <= 0.01) return;
  const ang = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
  g.save(); g.globalAlpha = cl(a); g.translate(x0, y0); g.rotate(ang); g.fillStyle = col; g.strokeStyle = 'rgba(8,10,14,0.9)'; g.lineWidth = 5; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(0, -w / 2); g.lineTo(L - w * 1.6, -w / 2); g.lineTo(L - w * 1.6, -w * 1.15); g.lineTo(L, 0); g.lineTo(L - w * 1.6, w * 1.15); g.lineTo(L - w * 1.6, w / 2); g.lineTo(0, w / 2); g.closePath(); g.stroke(); g.fill();
  g.restore();
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const S = sawPose(t), L = (x, y) => saw.localToWorld(V(x, y, 0));
  // hay alguien dentro
  tag(V(0.5, 1.0, 0.83), 'HAY ALGUIEN DENTRO', RED2, sm(T.dentro - 0.15, T.dentro + 0.1, t) * (1 - sm(T.tu - 0.2, T.tu + 0.1, t)), 0, 0, { px: 54, at: [600, 1420] });
  // una parte con la que nunca debes cortar: tres «?»
  const qa = sm(T.parte1 - 0.1, T.parte1 + 0.15, t) * (1 - sm(T.cadena - 0.25, T.cadena, t));
  if (qa > 0.01) {
    [[0.3, -CH - 0.03, 0, 150], [0.2, CH + 0.03, -40, -150], [BAR1 + CH * 0.7, CH * 0.7, 20, -165]].forEach(([x, y, dx, dy], i) => {
      const p = proj(L(x, y)), k = bk(pr(t, T.parte1 + 0.12 * i, 0.3)), b = 1 + 0.14 * Math.sin(t * 7 + i * 2);
      if (k <= 0) return;
      g.save(); g.globalAlpha = qa; g.strokeStyle = GOLD2; g.lineWidth = 4; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + dx * 0.7, p.y + dy * 0.7); g.stroke();
      g.translate(p.x + dx, p.y + dy); g.scale(k * b, k * b); g.beginPath(); g.arc(0, 0, 50, 0, 7); g.fillStyle = 'rgba(8,10,14,0.88)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke(); txt('?', 0, 26, 76, GOLD2, 400, 'center', 'Bebas'); g.restore();
    });
    label(540, 1560, '¿CON QUÉ PARTE NUNCA?', GOLD2, qa * sm(T.nunca - 0.15, T.nunca + 0.1, t), { px: 58 });
  }
  // la cadena corre siempre en el mismo sentido
  const ca = sm(T.cadena - 0.05, T.cadena + 0.25, t) * (1 - sm(T.cortas + 0.2, T.cortas + 0.6, t));
  chainArrows(t, ca);
  label(540, 1500, 'LA CADENA GIRA SIEMPRE ASÍ', CYAN2, ca * sm(T.corre, T.corre + 0.2, t), { px: 52 });
  // con la parte de abajo → tira de ti hacia delante
  const a1 = sm(T.abajo - 0.15, T.abajo + 0.1, t) * (1 - sm(T.arriba - 0.85, T.arriba - 0.6, t));
  tag(L(0.33, -CH - 0.02), 'PARTE DE ABAJO', GREEN2, a1 * (1 - sm(T.tira - 0.15, T.tira + 0.05, t)), 0, 0, { px: 52, at: [600, 1500] });
  const k1 = sm(T.tira - 0.05, T.tira + 0.2, t) * a1;
  if (k1 > 0.01) { const p = proj(L(-0.05, 0.3)), e = e3(pr(t, T.tira - 0.05, 0.4)); bigArrow(p.x, p.y - 110, p.x + 330 * e, p.y - 110, GREEN2, k1, 34); }
  label(540, 1500, 'TIRA DE TI', GREEN2, k1, { px: 76, sub: 'tracción: hacia delante', s: 1 + 0.12 * pulse(t, T.tira + 0.15, 0.2) });
  // con la de arriba → te empuja hacia atrás
  const a2 = sm(T.arriba - 0.1, T.arriba + 0.15, t) * (1 - sm(T.punta - 0.95, T.punta - 0.7, t));
  tag(L(0.33, CH + 0.02), 'PARTE DE ARRIBA', ORANGE2, a2 * (1 - sm(T.empuja - 0.15, T.empuja + 0.05, t)), 0, 0, { px: 52, at: [600, 1500] });
  const k2 = sm(T.empuja - 0.05, T.empuja + 0.2, t) * a2;
  if (k2 > 0.01) { const p = proj(L(0.3, 0.0)), e = e3(pr(t, T.empuja - 0.05, 0.4)); bigArrow(p.x + 60, p.y + 190, p.x + 60 - 330 * e, p.y + 190, ORANGE2, k2, 34); }
  label(540, 1500, 'TE EMPUJA', ORANGE2, k2, { px: 76, sub: 'empuje: hacia ti', s: 1 + 0.12 * pulse(t, T.empuja + 0.15, 0.2) });
  // ¿y con la punta? ¡rebote!
  const a3 = sm(T.punta - 0.15, T.punta + 0.05, t) * (1 - sm(T.k0 - 0.02, T.k0 + 0.06, t));
  tag(L(BAR1 + CH * 0.72, CH * 0.72), '¿LA PUNTA?', RED2, a3, 0, 0, { px: 62, at: [330, 1330] });
  stamp('¡REBOTE!', 1420, RED2, Math.exp(-Math.pow((t - T.rebote - 0.5) / 0.62, 4)), 190, -0.05);
  label(540, 1585, 'CUARTO SUPERIOR DE LA PUNTA', '#F4F6F8', sm(T.rebote + 0.2, T.rebote + 0.4, t) * (1 - sm(T.salta - 0.2, T.salta + 0.05, t)), { px: 44 });
  label(540, 1500, 'SALTA HACIA TU CARA', RED2, sm(T.salta - 0.05, T.salta + 0.15, t) * (1 - sm(T.salva - 0.25, T.salva - 0.05, t)), { px: 60, icon: 'warn' });
  // te salva el freno, que para la cadena en seco
  const fa = sm(T.freno - 0.15, T.freno + 0.1, t) * (1 - sm(T.antes - 0.3, T.antes - 0.05, t));
  tag(saw.userData.guard.localToWorld(V(0, 0.15, 0.05)), 'FRENO DE CADENA', GOLD2, fa, 0, 0, { px: 56, sub: 'el protector salta hacia delante', at: [560, 1330] });
  label(540, 1520, 'CADENA PARADA', GREEN2, fa * sm(T.para + 0.2, T.para + 0.4, t), { px: 60, icon: 'ok', s: 1 + 0.12 * pulse(t, T.para + 0.45, 0.2) });
  // antes de arrancarla: ¿el freno puesto o quitado?
  const out = 1 - sm(T.compartir - 0.4, T.compartir - 0.1, t), qc = sm(T.antes - 0.1, T.antes + 0.2, t) * out;
  if (qc > 0.005) {
    g.save(); g.globalAlpha = qc; g.translate(540, 1040 + (1 - e3(pr(t, T.antes - 0.1, 0.4))) * 120);
    rr(-470, -92, 940, 184, 34); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('ANTES DE ARRANCARLA,', 0, -14, 62, '#F4F6F8', 400, 'center', 'Bebas'); txt('¿EL FRENO DE CADENA…?', 0, 56, 62, GOLD2, 400, 'center', 'Bebas');
    g.restore();
  }
  [['A', 'PUESTO', T.puesto], ['B', 'QUITADO', T.quitado]].forEach(([Lt, s, t0], i) => {
    const kk = bk(pr(t, t0 - 0.2, 0.4)) * out; if (kk <= 0.005) return;
    const cy = 1250 + i * 136, side = i ? 1 : -1, pl = 1 + 0.025 * Math.max(0, Math.sin((t - T.comenta) * 6 - i * 1.5)) * sm(T.comenta, T.comenta + 0.3, t);
    g.save(); g.globalAlpha = cl(kk * 1.3); g.translate(540 + side * (1 - cl(kk)) * 600, cy); g.scale(pl, pl);
    rr(-400, -58, 800, 116, 36); g.fillStyle = 'rgba(9,12,17,0.93)'; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.3)'; g.stroke();
    g.beginPath(); g.arc(-330, 0, 38, 0, 7); g.fillStyle = COLS[i]; g.fill(); txt(Lt, -330, 20, 54, '#0b0d10', 400, 'center', 'Bebas');
    txt(s, -250, 24, 68, '#F2F5F8', 400, 'left', 'Bebas');
    g.restore();
  });
  const ce = sm(T.comenta - 0.15, T.comenta + 0.15, t) * out;
  if (ce > 0) { const b = 1 + 0.05 * Math.max(0, Math.sin((t - T.comenta) * 6)); g.save(); g.globalAlpha = ce; g.translate(540, 1545); g.scale(b, b); rr(-290, -52, 580, 104, 52); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke(); txt('💬  COMÉNTALO', 0, 19, 56, '#F2F5F8', 400, 'center', 'Bebas'); g.restore(); }
  share(t);
  closing(t);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.01)'; g.fillRect(0, 0, 2, 2);
}

// ------------------------------------------------------------------ fotograma
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
  finMat.uniforms.uFlash.value = Math.exp(-Math.pow((t - T.k0 - 0.06) / 0.08, 2)) * 0.22; finMat.uniforms.uFlashCol.value.setRGB(1, 0.35, 0.25);
  finMat.uniforms.uDim.value = mx(1, 0.62, sm(T.antes - 0.1, T.antes + 0.4, t)) * mx(1, 0.75, sm(T.compartir - 0.2, T.compartir + 0.3, t)) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  await overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 4.5);

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
  } catch (e) { window.failed = 'moto: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
