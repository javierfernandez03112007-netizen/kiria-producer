// «Salva a tu madre» — el puntal de estabilización, como un videojuego (idea de Adrián, Notion «SÁBADO 28», STABFAST, con
// publicidad de Bomberados; formato nuevo de Javi del 26 nov: personal y sentimental, tres opciones A/B/C, el vídeo elige
// la correcta y la explicación se hace mientras la salvas). De día, en una carretera: un coche tumbado de lado con tu madre
// dentro, colgada del cinturón; curiosos detrás del guardarraíl, la autobomba y la ambulancia. Dos bomberos (B y C) inclinan
// sus puntales contra los bajos, la cuchilla muerde la chapa a unos 60° del suelo, la cinta va al punto más bajo y el
// trinquete la tensa: el peso del coche aprieta el triángulo y deja de moverse. Al final, tu madre a salvo en la ambulancia.
// Capa de videojuego: misión, vida, tarjetas A/B/C, pasos 1/3–3/3 y «¡misión cumplida!». Todo depende solo de t.
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







// ------------------------------------------------------------------ el bombero y su ERA (coordenadas del bombero: mira hacia −Z, izquierda = −X)
const BC = V(0, 1.2, 0.29);                                  // centro de la botella (grifo abajo)
const VALVE = V(0, 0.895, 0.29), WHEEL = V(0.052, 0.895, 0.29), REDC = V(0, 0.835, 0.229);
const GAUGE = V(-0.155, 1.258, -0.226), WHISTLE = V(-0.155, 1.352, -0.212), LDVP = V(0, 1.545, -0.24), BGP = V(0.155, 1.285, -0.214);
// atalaje (cinta) de cada hombro: de la placa, por encima del hombro, al pecho (centro de la cinta, plano x = cte)
const STRAP_YZ = [[1.3, 0.2], [1.47, 0.196], [1.545, 0.13], [1.562, 0.02], [1.548, -0.08], [1.512, -0.137], [1.44, -0.173], [1.3, -0.183], [1.15, -0.183], [1.02, -0.18]];
const STRAP_T = 0.016;                                         // media cinta (grosor)
function offStrap(y, z, d) {         // punto de la cinta desplazado hacia fuera del cuerpo (lejos del eje del torso)
  const cy = cl(y, 1.0, 1.42), dy = y - cy, dz = z, L = Math.hypot(dy, dz) || 1;
  return [y + dy / L * d, z + dz / L * d];
}
function hosePts(s, end) {
  const pts = [[0.045 * s, 0.835, 0.229], [0.11 * s, 0.858, 0.222], [0.164 * s, 0.95, 0.214], [0.166 * s, 1.2, 0.212], [0.164 * s, 1.4, 0.214]];
  for (const [y, z] of STRAP_YZ.slice(1, 6)) { const [yy, zz] = offStrap(y, z, STRAP_T + 0.011); pts.push([0.155 * s, yy, zz]); }
  return pts.concat(end);
}
const ALTA_PTS = hosePts(-1, [[-0.155, 1.44, -0.206], [-0.155, 1.385, -0.21], [-0.155, 1.29, -0.214]]);
const MEDIA_PTS = hosePts(1, [[0.152, 1.462, -0.212], [0.125, 1.42, -0.232], [0.075, 1.43, -0.252], [0.04, 1.47, -0.256], [0.024, 1.505, -0.243]]);
const SHL = s => V(0.272 * s, 1.43, -0.008);                // hombro (s = −1 izquierdo, 1 derecho)
const AL1 = 0.3, AL2 = 0.285;
const REST_H = s => V(0.335 * s, 0.985, -0.17), REST_E = s => V(0.33 * s, 1.18, 0.07);
const FLOW_V = 'varying float vU; varying vec3 vN; void main(){ vU = uv.x; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FLOW_F = `uniform float uTime, uHead, uI, uRed, uRedHead; uniform vec3 uCol; varying float vU; varying vec3 vN;
void main(){
  float rim = 0.45 + 0.55 * pow(1.0 - abs(normalize(vN).z), 1.4);
  float s = fract(vU * 7.0 - uTime * 1.9);
  float dash = 0.5 + 0.5 * smoothstep(0.0, 0.3, s) * smoothstep(0.85, 0.45, s);
  float front = smoothstep(uHead + 0.003, uHead - 0.05, vU);
  float head = exp(-pow((vU - uHead) / 0.035, 2.0)) * step(0.002, uHead) * step(uHead, 0.998);
  vec3 c = uCol * (dash * front + 2.2 * head) * uI;
  float fr = smoothstep(uRedHead + 0.003, uRedHead - 0.06, vU) * uRed, rh = exp(-pow((vU - uRedHead) / 0.04, 2.0)) * uRed;
  c += vec3(2.6, 0.16, 0.07) * (fr * 0.9 + rh * 3.0);
  c *= rim;
  if (max(c.r, max(c.g, c.b)) < 0.004) discard;
  gl_FragColor = vec4(c, 1.0);
}`;
const XR_V = `varying vec3 vP; varying vec3 vN; varying float vWY;
void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 w = modelMatrix * vec4(position, 1.0); vWY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }`;
const XAIR_F = `uniform sampler2D uTex; uniform float uTime, uI, uScan, uPress, uRed; varying vec3 vP; varying vec3 vN; varying float vWY;
void main(){
  if (vWY < uScan) discard;
  float a = atan(vP.z, vP.x), y = vP.y;
  float n = texture2D(uTex, vec2(a * 0.32 + uTime * 0.09, y * 2.4 - uTime * 0.28)).r;
  float n2 = texture2D(uTex, vec2(a * 0.6 - uTime * 0.13, y * 4.8 + uTime * 0.11)).r;
  float sw = 0.4 + 0.8 * (n * 0.6 + n2 * 0.4);
  vec3 col = mix(vec3(0.2, 0.7, 1.7), vec3(1.9, 0.18, 0.08), uRed) * sw * (0.8 + 0.6 * uPress);
  float rim = pow(1.0 - abs(normalize(vN).z), 1.3);
  float line = exp(-pow((vWY - uScan) / 0.006, 2.0));
  gl_FragColor = vec4(col * uI * (0.3 + 0.95 * rim) + vec3(0.7, 1.5, 2.4) * line * 2.0, 1.0);
}`;
const XGLASS_F = `uniform float uI, uScan; uniform vec3 uCol; varying vec3 vP; varying vec3 vN; varying float vWY;
void main(){ if (vWY < uScan) discard; float f = pow(1.0 - abs(normalize(vN).z), 2.4); float line = exp(-pow((vWY - uScan) / 0.005, 2.0));
  gl_FragColor = vec4(uCol * (0.04 + 1.2 * f) * uI + vec3(0.8, 1.6, 2.6) * line * 2.5, 1.0); }`;
const LUNG_F = `uniform float uI; uniform vec3 uCol; varying vec3 vN;
void main(){ float f = pow(1.0 - abs(normalize(vN).z), 1.8); gl_FragColor = vec4(uCol * (0.12 + 1.3 * f) * uI, 1.0); }`;
const addSh = (u, vs, fs, o = {}) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false,
  depthTest: o.depthTest ?? true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });

function between(m, a, b) {               // cilindro de 1 m (eje Y) estirado de a a b
  const d = b.clone().sub(a), L = d.length();
  m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(1, Math.max(1e-4, L), 1);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.divideScalar(Math.max(1e-6, L)));
}
function ik2(S, W, hint, L1 = AL1, L2 = AL2) {   // codo de un brazo de dos tramos (hombro S, muñeca W, el codo hacia «hint»)
  const d = W.clone().sub(S); let len = d.length(); const dn = d.clone().divideScalar(len);
  len = Math.min(len, L1 + L2 - 1e-3);
  const a = (L1 * L1 - L2 * L2 + len * len) / (2 * len), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const hv = hint.clone().sub(S); hv.sub(dn.clone().multiplyScalar(hv.dot(dn))); hv.normalize();
  return { E: S.clone().add(dn.clone().multiplyScalar(a)).add(hv.multiplyScalar(h)), W: S.clone().add(dn.multiplyScalar(len)) };
}
function bottleTex() {
  return canvasTex(1024, 512, (x) => {
    x.fillStyle = '#E8B314'; x.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${rnd(i) < 0.5 ? '255,235,170' : '120,80,0'},0.05)`; x.fillRect(rnd(i * 3.3) * 1024, rnd(i * 7.1) * 512, 3, 2); }
    for (const X of [130, 642]) {                        // dos etiquetas pequeñas (una por cada lado)
      rrect(x, X, 190, 250, 150, 10); x.fillStyle = '#F4F1E8'; x.fill();
      x.fillStyle = '#B5121B'; x.fillRect(X, 285, 250, 42);
      x.fillStyle = '#1b1b1b'; x.font = '400 40px Bebas'; x.textAlign = 'center'; x.fillText('AIRE COMPRIMIDO', X + 125, 250);
      x.fillStyle = '#FFFFFF'; x.font = '400 36px Bebas'; x.fillText('300 BAR', X + 125, 318);
    }
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 0, 1024, 26); x.fillRect(0, 486, 1024, 26);
  }, { aniso: 4 });
}
function gaugeTex() {
  return canvasTex(256, 256, (x) => {
    x.fillStyle = '#ECEDE6'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill();
    const A = b => (-225 + b / 300 * 270) * Math.PI / 180;      // 0 bar abajo a la izquierda, 300 abajo a la derecha
    x.strokeStyle = '#D21E1E'; x.lineWidth = 16; x.beginPath(); x.arc(128, 128, 98, A(0), A(55)); x.stroke();
    x.strokeStyle = '#18A35A'; x.lineWidth = 16; x.beginPath(); x.arc(128, 128, 98, A(250), A(300)); x.stroke();
    for (let b = 0; b <= 300; b += 10) { const a = A(b), r0 = b % 50 ? 104 : 92; x.strokeStyle = '#111'; x.lineWidth = b % 50 ? 2 : 4;
      x.beginPath(); x.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); x.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116); x.stroke(); }
    x.fillStyle = '#111'; x.font = '400 34px Bebas'; x.textAlign = 'center';
    for (const b of [0, 100, 200, 300]) { const a = A(b); x.fillText(String(b), 128 + Math.cos(a) * 70, 140 + Math.sin(a) * 70); }
    x.font = '400 26px Bebas'; x.fillText('BAR', 128, 196);
  }, { aniso: 4 });
}
let FABRIC = null;
function fabricNormal() {            // arrugas y trama de la tela del traje (normal map de ruido)
  if (FABRIC) return FABRIC;
  const N = 256, h = new Float32Array(N * N);
  for (let o = 0, amp = 1, f = 3; o < 5; o++, amp *= 0.55, f *= 2) {
    const gr = []; for (let i = 0; i < f * f; i++) gr.push(rnd(i * 17.3 + o * 71.1));
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const fx = x / N * f, fy = y / N * f, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const s2 = v => v * v * (3 - 2 * v), G = (i, j) => gr[((j % f) * f + (i % f))];
      h[y * N + x] += mx(mx(G(ix, iy), G(ix + 1, iy), s2(tx)), mx(G(ix, iy + 1), G(ix + 1, iy + 1), s2(tx)), s2(ty)) * amp; }
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) h[y * N + x] += 0.035 * Math.sin(x * 1.6) * Math.sin(y * 1.6);   // trama
  FABRIC = canvasTex(N, N, (c) => { const im = c.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const H0 = k => h[((y + N) % N) * N + ((k + N) % N)], dx = (H0(x + 1) - H0(x - 1)) * 2.2, dy = (h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x]) * 2.2;
      const L = Math.hypot(dx, dy, 1), i = (y * N + x) * 4; im.data[i] = (0.5 - dx / L * 0.5) * 255; im.data[i + 1] = (0.5 - dy / L * 0.5) * 255; im.data[i + 2] = (0.5 + 0.5 / L) * 255; im.data[i + 3] = 255; }
    c.putImageData(im, 0, 0); }, { srgb: false });
  FABRIC.wrapS = FABRIC.wrapT = THREE.RepeatWrapping; FABRIC.repeat.set(3, 3);
  return FABRIC;
}
function makeHero(o = {}) {
  const G = new THREE.Group(), R = { G, parts: {}, mats: {} };
  const navy = std(0x181d29, 0.86), jacket = std(0x1e2533, 0.8), black = std(0x121315, 0.5), rubber = std(0x0b0b0c, 0.72);
  for (const m of [navy, jacket]) { m.normalMap = fabricNormal(); m.normalScale = new THREE.Vector2(0.9, 0.9); }
  const tape = new THREE.MeshStandardMaterial({ color: 0xe0d96f, roughness: 0.35, metalness: 0.15, emissive: 0x6b6624, emissiveIntensity: 1.0 });
  const tapeS = new THREE.MeshStandardMaterial({ color: 0xd0d4da, roughness: 0.22, metalness: 0.6, emissive: 0x3a3c42, emissiveIntensity: 1.0 });
  R.tape = [tape, tapeS]; R.legM = { navy, rubber, tape, tapeS };
  const helm = new THREE.MeshStandardMaterial({ color: o.helmet ?? 0xe8be2c, roughness: 0.2, metalness: 0.05 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe6e8ec, metalness: 1.0, roughness: 0.14 });
  const hi = (key, base) => { const m = base.clone(); m.emissive = new THREE.Color(o.hiCol ?? 0x2a9fd0); m.emissiveIntensity = 0; R.mats[key] = R.mats[key] || []; R.mats[key].push(m); return m; };
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, parent = G) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  // piernas y botas
  for (const s of [-1, 1]) {
    add(new RoundedBoxGeometry(0.135, 0.13, 0.31, 3, 0.045), rubber, 0.11 * s, 0.065, -0.035);
    add(new THREE.CapsuleGeometry(0.087, 0.58, 6, 16), navy, 0.11 * s, 0.53, 0.0);
    add(new THREE.CylinderGeometry(0.091, 0.091, 0.032, 22, 1, true), tapeS, 0.11 * s, 0.3, 0);
    add(new THREE.CylinderGeometry(0.091, 0.091, 0.032, 22, 1, true), tape, 0.11 * s, 0.35, 0);
  }
  add(new RoundedBoxGeometry(0.52, 0.22, 0.33, 3, 0.07), jacket, 0, 0.9, 0);                  // faldón del chaquetón
  R.torso = add(new RoundedBoxGeometry(0.5, 0.64, 0.31, 4, 0.11), jacket, 0, 1.22, 0);        // torso
  for (const [y, m] of [[0.94, tape], [0.985, tapeS], [1.37, tape]]) add(new RoundedBoxGeometry(0.515, 0.036, 0.325, 2, 0.016), m, 0, y, 0);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.1, 16, 12), jacket, 0.262 * s, 1.465, 0);       // hombros
  // cabeza: verdugo, capucha, casco, cubrenucas
  add(new THREE.CylinderGeometry(0.078, 0.095, 0.13, 18), rubber, 0, 1.57, 0);
  add(new THREE.SphereGeometry(0.128, 22, 16), rubber, 0, 1.67, 0.005);
  add(new THREE.SphereGeometry(0.158, 30, 18, 0, Math.PI * 2, 0, Math.PI / 2), helm, 0, 1.7, 0.012, 0, 0, 0, 1, 1.05, 1.13);
  add(new THREE.TorusGeometry(0.152, 0.011, 8, 40), helm, 0, 1.7, 0.012, Math.PI / 2, 0, 0, 1, 1.13, 1);
  const hband = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.3, metalness: 0.6, emissive: 0x2a2b2e, emissiveIntensity: 0.6 });
  add(new THREE.TorusGeometry(0.1552, 0.0042, 6, 48), hband, 0, 1.735, 0.012, Math.PI / 2, 0, 0, 1, 1.13, 1);
  add(new RoundedBoxGeometry(0.026, 0.026, 0.3, 2, 0.012), helm, 0, 1.868, 0.012);
  add(new THREE.CylinderGeometry(0.16, 0.175, 0.13, 22, 1, true, Math.PI * 0.18, Math.PI * 0.64), rubber, 0, 1.61, 0.03, 0, -Math.PI / 2, 0);
  if (o.noEra) {                       // sin ERA (rescate en tráfico): pantalla facial ahumada bajada y cinturón
    const shield = new THREE.MeshStandardMaterial({ color: 0x3a3018, roughness: 0.05, metalness: 0.7, transparent: true, opacity: 0.9 });
    add(new THREE.CylinderGeometry(0.175, 0.17, 0.2, 32, 1, true, Math.PI * 0.6, Math.PI * 0.8), shield, 0, 1.63, 0.0, 0.08, 0, 0);
    add(new THREE.TorusGeometry(0.176, 0.008, 6, 40, Math.PI * 0.8), helm, 0, 1.73, 0.0, Math.PI / 2, 0, Math.PI * 0.1 + Math.PI);
    add(new RoundedBoxGeometry(0.54, 0.065, 0.35, 2, 0.02), std(0x161719, 0.7), 0, 0.93, 0.0);
    add(new RoundedBoxGeometry(0.075, 0.05, 0.015, 2, 0.005), chrome, 0, 0.93, -0.18);
  } else {
    // máscara completa: cuerpo de goma, visor panorámico, boca y el pulmoautomático delante
    const maskM = hi('mascara', std(0x141518, 0.55)), visorM = hi('mascara', new THREE.MeshPhysicalMaterial({ color: 0x1a2028, roughness: 0.02, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.2 }));
    add(new THREE.SphereGeometry(0.1, 24, 16), maskM, 0, 1.615, -0.098, 0, 0, 0, 1.08, 1.27, 0.86);
    add(new THREE.CylinderGeometry(0.106, 0.106, 0.13, 32, 1, true, Math.PI * 0.62, Math.PI * 0.76), visorM, 0, 1.655, -0.085, 0, 0, 0, 1, 1, 0.98);
    add(new THREE.TorusGeometry(0.0335, 0.006, 8, 24), maskM, 0, 1.545, -0.2, 0, 0, 0);                 // racor de la boca
    add(new THREE.CylinderGeometry(0.033, 0.036, 0.03, 20), maskM, 0, 1.545, -0.188, Math.PI / 2, 0, 0);
    // pulmoautomático
    const ldvM = hi('pulmo', std(0x1d1f23, 0.45, 0.2)), ldvC = hi('pulmo', std(0x5a5f68, 0.5, 0.3));
    const ldv = new THREE.Group(); ldv.position.copy(LDVP); G.add(ldv);
    add(new THREE.CylinderGeometry(0.031, 0.033, 0.05, 24), ldvM, 0, 0, 0.012, Math.PI / 2, 0, 0, 1, 1, 1, ldv);
    add(new THREE.CylinderGeometry(0.028, 0.03, 0.014, 24), ldvC, 0, 0, -0.019, Math.PI / 2, 0, 0, 1, 1, 1, ldv);       // tapa (botón)
    add(new THREE.CylinderGeometry(0.009, 0.009, 0.03, 12), chrome, 0.016, -0.026, 0.008, 0, 0, 0.5, 1, 1, 1, ldv);     // entrada de la manguera
    R.ldv = ldv; R.parts.pulmo = LDVP;
    if (o.flow) { R.puffU = { uI: { value: 0 }, uCol: { value: new THREE.Color(0.4, 1.0, 2.2) } };
      const pm = addSh(R.puffU, 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', LUNG_F);
      R.puff = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), pm); R.puff.position.set(0, 1.56, -0.17); R.puff.scale.set(0.07, 0.05, 0.05); R.puff.renderOrder = 16; G.add(R.puff); }
    // espaldera (placa dorsal), atalajes y cinturón
    const espM = hi('espaldera', std(0x17181b, 0.45));
    add(new RoundedBoxGeometry(0.3, 0.72, 0.045, 3, 0.018), espM, 0, 1.16, 0.18);
    add(new RoundedBoxGeometry(0.36, 0.13, 0.06, 3, 0.025), espM, 0, 0.93, 0.19);
    const strapM = hi('espaldera', std(0x161719, 0.7));
    const strapCurve = new THREE.CatmullRomCurve3(STRAP_YZ.map(([y, z]) => V(0, y, z)), false, 'centripetal');
    for (const s of [-1, 1]) {
      const st = add(new THREE.TubeGeometry(strapCurve, 60, STRAP_T, 10, false), strapM, 0.155 * s, 0, 0, 0, 0, 0, 2.0, 1, 1);
      add(new RoundedBoxGeometry(0.05, 0.03, 0.012, 2, 0.004), chrome, 0.155 * s, 1.08, -0.2);
    }
    add(new RoundedBoxGeometry(0.54, 0.065, 0.35, 2, 0.02), strapM, 0, 0.93, 0.0);
    add(new RoundedBoxGeometry(0.075, 0.05, 0.015, 2, 0.005), chrome, 0, 0.93, -0.18);
    // la botella (perfil girado: cúpula arriba, cuello y grifo abajo)
    const prof = [[0.0, 0.265], [0.03, 0.262], [0.055, 0.252], [0.072, 0.236], [0.082, 0.215], [0.085, 0.19], [0.085, -0.19], [0.082, -0.215], [0.072, -0.236], [0.055, -0.252], [0.032, -0.262], [0.022, -0.27], [0.022, -0.3], [0, -0.3]].map(([r, y]) => new THREE.Vector2(r, y));
    const evenProf = (pp, n) => { const L = [0]; for (let i = 1; i < pp.length; i++) L.push(L[i - 1] + pp[i].distanceTo(pp[i - 1]));
      const out = []; for (let k = 0; k <= n; k++) { const d = L[L.length - 1] * k / n; let i = 1; while (i < L.length - 1 && L[i] < d) i++;
        const f = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); out.push(pp[i - 1].clone().lerp(pp[i], cl(f))); } return out; };
    const profE = evenProf(prof.slice().reverse(), 64);
    const bGeo = new THREE.LatheGeometry(profE, 48);
    R.scanUp = new THREE.Plane(V(0, -1, 0), 99);                     // pintura: se ve por debajo de la línea del escáner
    const paint = hi('botella', new THREE.MeshStandardMaterial({ map: bottleTex(), roughness: 0.3 }));
    if (o.xray) paint.clippingPlanes = [R.scanUp];
    R.bottle = add(bGeo, paint, BC.x, BC.y, BC.z, 0, Math.PI / 2, 0);
    const strapB = add(new THREE.TorusGeometry(0.087, 0.009, 6, 40), strapM, BC.x, BC.y + 0.1, BC.z, Math.PI / 2, 0, 0);
    if (o.xray) { strapB.material = strapM.clone(); strapB.material.clippingPlanes = [R.scanUp]; }
    if (o.xray) {
      R.xu = { uTex: { value: NOISE }, uTime: { value: 0 }, uI: { value: 1 }, uScan: { value: 99 }, uPress: { value: 1 }, uRed: { value: 0 } };
      R.gu = { uI: { value: 1 }, uScan: { value: 99 }, uCol: { value: new THREE.Color(0.55, 0.82, 1.0) } };
      const air = new THREE.Mesh(new THREE.LatheGeometry(profE.map(v => new THREE.Vector2(v.x * 0.86, v.y * 0.96)), 40), addSh(R.xu, XR_V, XAIR_F));
      air.position.copy(BC); air.renderOrder = 13; G.add(air);
      const shell = new THREE.Mesh(bGeo, addSh(R.gu, XR_V, XGLASS_F)); shell.position.copy(BC); shell.renderOrder = 14; G.add(shell);
      R.air = air; R.shell = shell;
    }
    R.parts.botella = BC.clone();
    // grifo: cuerpo, salida al reductor y volante (gira con la mano)
    const grifoM = hi('grifo', new THREE.MeshStandardMaterial({ color: 0xc9a868, metalness: 0.9, roughness: 0.3 }));
    add(new THREE.CylinderGeometry(0.024, 0.026, 0.055, 20), grifoM, VALVE.x, VALVE.y, VALVE.z);
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 12), grifoM, VALVE.x, VALVE.y - 0.02, VALVE.z - 0.035, Math.PI / 2 - 0.5, 0, 0);
    const wheel = new THREE.Group(); wheel.position.copy(WHEEL); G.add(wheel);
    const wheelM = hi('grifo', std(0x1a1b1e, 0.6));
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 10), grifoM, -0.012, 0, 0, 0, 0, Math.PI / 2, 1, 1, 1, wheel);
    add(new THREE.CylinderGeometry(0.029, 0.029, 0.018, 24), wheelM, 0.006, 0, 0, 0, 0, Math.PI / 2, 1, 1, 1, wheel);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; add(new THREE.SphereGeometry(0.007, 8, 6), wheelM, 0.006, Math.cos(a) * 0.029, Math.sin(a) * 0.029, 0, 0, 0, 1.2, 1, 1, wheel); }
    R.wheel = wheel; R.parts.grifo = WHEEL.clone().add(V(0.008, 0, 0));
    // manorreductor (en la placa, debajo del grifo)
    const redM = hi('reductor', new THREE.MeshStandardMaterial({ color: 0xd8dbe0, metalness: 1.0, roughness: 0.2 }));
    add(new THREE.CylinderGeometry(0.021, 0.021, 0.095, 20), redM, REDC.x, REDC.y, REDC.z, 0, 0, Math.PI / 2);
    add(new RoundedBoxGeometry(0.05, 0.04, 0.035, 2, 0.008), redM, REDC.x, REDC.y + 0.012, REDC.z - 0.004);
    add(new THREE.CylinderGeometry(0.011, 0.011, 0.07, 12), redM, 0, (REDC.y + VALVE.y) / 2 - 0.005, (REDC.z + VALVE.z) / 2 - 0.005, -0.9, 0, 0);
    R.parts.reductor = REDC.clone();
    // mangueras de alta y media presión (con la «luz» del aire por dentro)
    const hose = (pts, r, key) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, 'centripetal');
      const seg = Math.round(curve.getLength() * 160);
      const m = add(new THREE.TubeGeometry(curve, seg, r, 10, false), hi(key, std(0x0d0e10, 0.55)), 0, 0, 0);
      let fu = null;
      if (o.flow) {
        fu = { uTime: { value: 0 }, uHead: { value: 0 }, uI: { value: 0 }, uRed: { value: 0 }, uRedHead: { value: 0 }, uCol: { value: new THREE.Color(0.35, 0.8, 2.0) } };
        const f = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r * 1.35, 10, false), addSh(fu, FLOW_V, FLOW_F)); f.renderOrder = 9; G.add(f);
      }
      return { m, fu, curve, len: curve.getLength() };
    };
    R.alta = hose(ALTA_PTS, 0.0075, 'alta'); R.media = hose(MEDIA_PTS, 0.0105, 'media');
    R.parts.alta = R.alta.curve.getPointAt(0.42); R.parts.media = R.media.curve.getPointAt(0.84);
    // silbato (avisador acústico) y manómetro, al final de la de alta
    const silM = hi('silbato', new THREE.MeshStandardMaterial({ color: 0xe6e8ec, metalness: 1.0, roughness: 0.16 }));
    add(new THREE.CylinderGeometry(0.0095, 0.0095, 0.05, 14), silM, WHISTLE.x, WHISTLE.y, WHISTLE.z, 0.15, 0, 0);
    for (const dy of [-0.012, 0.0, 0.012]) add(new THREE.TorusGeometry(0.0097, 0.0016, 6, 16), black, WHISTLE.x, WHISTLE.y + dy, WHISTLE.z, Math.PI / 2 + 0.15, 0, 0);
    R.parts.silbato = WHISTLE.clone();
    const gauge = new THREE.Group(); gauge.position.copy(GAUGE); gauge.rotation.set(0.35, 0, 0); G.add(gauge);
    const gm = hi('manometro', std(0x17181b, 0.6));
    add(new THREE.CylinderGeometry(0.036, 0.038, 0.026, 28), gm, 0, 0, 0, Math.PI / 2, 0, 0, 1, 1, 1, gauge);
    add(new THREE.TorusGeometry(0.034, 0.005, 8, 28), gm, 0, 0, -0.013, 0, 0, 0, 1, 1, 1, gauge);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.03, 32), new THREE.MeshStandardMaterial({ map: gaugeTex(), roughness: 0.5, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0.0 }));
    face.position.z = -0.0135; face.rotation.y = Math.PI; gauge.add(face);
    const needle = new THREE.Group(); needle.position.z = -0.0142; needle.rotation.y = Math.PI; gauge.add(needle);
    const nd = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.026, 0.0008), new THREE.MeshBasicMaterial({ color: 0xd01818 })); nd.position.y = 0.01; needle.add(nd);
    needle.add(new THREE.Mesh(new THREE.CircleGeometry(0.003, 12), new THREE.MeshBasicMaterial({ color: 0x111111 })));
    needle.children[1].position.z = 0.0003;
    const gl = new THREE.Mesh(new THREE.CircleGeometry(0.031, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.12, clearcoat: 1 }));
    gl.position.z = -0.0152; gl.rotation.y = Math.PI; gauge.add(gl);
    R.gauge = gauge; R.needle = needle; R.face = face; R.parts.manometro = GAUGE.clone();
    // bodyguard (alarma personal: pantalla y luz)
    const bgM = hi('bodyguard', std(0x1a1c20, 0.5)), bgB = hi('bodyguard', std(0xd86a12, 0.55));
    const bg = new THREE.Group(); bg.position.copy(BGP); bg.rotation.set(0.05, 0, 0); G.add(bg);
    add(new RoundedBoxGeometry(0.058, 0.088, 0.028, 3, 0.009), bgM, 0, 0, 0, 0, 0, 0, 1, 1, 1, bg);
    add(new RoundedBoxGeometry(0.064, 0.02, 0.03, 2, 0.008), bgB, 0, 0.042, 0, 0, 0, 0, 1, 1, 1, bg);
    add(new RoundedBoxGeometry(0.064, 0.02, 0.03, 2, 0.008), bgB, 0, -0.042, 0, 0, 0, 0, 1, 1, 1, bg);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.024), new THREE.MeshBasicMaterial({ color: 0x5fd4a0 })); scr.position.set(0, 0.006, -0.0145); scr.rotation.y = Math.PI; bg.add(scr);
    scr.material.color.multiplyScalar(0.7);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 12, 8), new THREE.MeshBasicMaterial({ color: 0x20ff60 })); led.position.set(0.016, -0.022, -0.013); bg.add(led);
    R.bg = bg; R.led = led; R.scr = scr; R.parts.bodyguard = BGP.clone();

  }
  R.parts.mascara = V(0, 1.64, -0.19); R.parts.espaldera = V(0, 1.08, 0.205);
  // brazos (dos tramos que se colocan con ik2) y guantes
  R.arms = [];
  for (const s of [-1, 1]) {
    const up = add(new THREE.CylinderGeometry(0.068, 0.063, 1, 14), jacket, 0, 0, 0);
    const el = add(new THREE.SphereGeometry(0.064, 14, 10), jacket, 0, 0, 0);
    const fo = add(new THREE.CylinderGeometry(0.062, 0.057, 1, 14), jacket, 0, 0, 0);
    const band = add(new THREE.CylinderGeometry(0.0625, 0.0625, 0.03, 14, 1, true), tape, 0, 0, 0);
    const glove = new THREE.Group(); G.add(glove);
    const gmat = std(0x16171a, 0.82);
    add(new RoundedBoxGeometry(0.085, 0.1, 0.045, 2, 0.02), gmat, 0, -0.045, 0, 0, 0, 0, 1, 1, 1, glove);         // palma
    add(new RoundedBoxGeometry(0.08, 0.06, 0.05, 2, 0.022), gmat, 0, -0.105, 0.006, 0.5, 0, 0, 1, 1, 1, glove);   // dedos (cerrados)
    add(new THREE.CapsuleGeometry(0.014, 0.035, 4, 8), gmat, -0.046 * s, -0.05, -0.012, 0, 0, 0.5 * s, 1, 1, 1, glove);   // pulgar
    add(new THREE.CylinderGeometry(0.06, 0.064, 0.06, 14), gmat, 0, 0.02, 0, 0, 0, 0, 1, 1, 1, glove);         // puño del guante
    R.arms.push({ s, up, el, fo, band, glove });
  }
  R.pose = (handL, handR, elL, elR, rollR = 0) => {
    for (const A of R.arms) {
      const S = SHL(A.s), Wt = A.s < 0 ? handL : handR, Eh = A.s < 0 ? elL : elR;
      const { E, W } = ik2(S, Wt, Eh);
      between(A.up, S, E); A.el.position.copy(E); between(A.fo, E, W);
      const dir = W.clone().sub(E).normalize();
      A.band.position.copy(E).lerp(W, 0.86); A.band.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
      A.glove.position.copy(W); A.glove.quaternion.setFromUnitVectors(V(0, -1, 0), dir);
      A.glove.rotateY((A.s < 0 ? 0.0 : 0.0) + (A.s > 0 ? rollR : 0));
    }
  };
  R.pose(REST_H(-1), REST_H(1), REST_E(-1), REST_E(1));
  R.hiSet = (key, k) => { for (const m of R.mats[key] || []) m.emissiveIntensity = k; };
  return R;
}
function worldOf(R, p) { return R.G.localToWorld(p.clone()); }

// ------------------------------------------------------------------ DE DÍA (Javi, 25 nov: «vida real»): cielo, sol, calle, árboles, coches, cordón y curiosos
const SUN_DIR = V(0.42, 0.62, 0.66).normalize();
const HAZE = new THREE.Color(0.66, 0.66, 0.66);
let sun, sky, people = [], trees = [], hazards = [], F3 = null;
function dayFacade(cols, rows, seed, base, fire) {      // fachada de día: revoco, ventanas con reflejo del cielo, balcones pintados
  const T0 = (map) => canvasTex(cols * 96, rows * 128, (x) => {
    x.fillStyle = map === 'em' ? '#000' : base; x.fillRect(0, 0, cols * 96, rows * 128);
    for (let i = 0; i < (map === 'em' ? 0 : cols * rows * 30); i++) { const v = rnd(i * 1.3 + seed); x.fillStyle = `rgba(${v < 0.5 ? '0,0,0' : '255,255,255'},0.035)`; x.fillRect(rnd(i * 2.9 + seed) * cols * 96, rnd(i * 5.1 + seed) * rows * 128, 4, 3); }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const X = c * 96 + 22, Y = (rows - 1 - r) * 128 + 24, onFire = fire && fire(r, c);
      if (map === 'em') { x.fillStyle = onFire ? '#ff7a22' : '#000'; x.fillRect(X, Y, 52, 82); continue; }
      x.fillStyle = 'rgba(255,255,255,0.75)'; x.fillRect(X - 5, Y - 5, 62, 92);             // marco
      const gr = x.createLinearGradient(0, Y, 0, Y + 82); gr.addColorStop(0, onFire ? '#ff9a3a' : '#8fa3b8'); gr.addColorStop(1, onFire ? '#c83a10' : '#2f3a46'); x.fillStyle = gr; x.fillRect(X, Y, 52, 82);
      x.fillStyle = 'rgba(30,30,30,0.6)'; x.fillRect(X + 24, Y, 4, 82);
      if (!onFire && rnd(r * 7.1 + c * 3.3 + seed) < 0.45) { x.fillStyle = rnd(r + c * 9 + seed) < 0.5 ? '#d9cfae' : '#b8c6c2'; x.fillRect(X, Y, 52, 30); }   // persiana medio bajada
      if (r > 0) { x.fillStyle = 'rgba(40,40,44,0.85)'; x.fillRect(X - 12, Y + 82, 76, 6); for (let k = 0; k < 9; k++) x.fillRect(X - 10 + k * 9, Y + 58, 2, 24); x.fillRect(X - 12, Y + 56, 76, 3); }
      if (onFire) { const sg = x.createLinearGradient(0, Y - 60, 0, Y); sg.addColorStop(0, 'rgba(20,16,14,0)'); sg.addColorStop(1, 'rgba(20,16,14,0.85)'); x.fillStyle = sg; x.fillRect(X - 14, Y - 60, 80, 60); }   // hollín
    }
  }, { aniso: 8, srgb: map !== 'em' });
  return new THREE.MeshStandardMaterial({ map: T0('map'), emissiveMap: T0('em'), emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.85 });
}
function dayBuilding(w, h, d, cols, rows, seed, base, fire) {
  const front = dayFacade(cols, rows, seed, base, fire), plain = std(new THREE.Color(base).multiplyScalar(0.8).getHex(), 0.9);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [plain, plain, plain, plain, front, plain]); m.castShadow = m.receiveShadow = true; return m;
}
function makeCar(col) {
  const G = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.45 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.06, metalness: 0.6 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = m.receiveShadow = true; G.add(m); return m; };
  add(new RoundedBoxGeometry(4.1, 0.6, 1.76, 4, 0.16), body, 0, 0.58, 0);
  add(new RoundedBoxGeometry(2.1, 0.55, 1.6, 4, 0.18), glass, -0.25, 1.1, 0);
  add(new RoundedBoxGeometry(1.95, 0.08, 1.52, 2, 0.04), body, -0.3, 1.39, 0);
  add(new THREE.BoxGeometry(4.14, 0.12, 1.8), std(0x0d0d0f, 0.9), 0, 0.31, 0);
  for (const [x, z] of [[1.3, 0.82], [-1.3, 0.82], [1.3, -0.82], [-1.3, -0.82]]) { add(new THREE.CylinderGeometry(0.33, 0.33, 0.23, 22), M.rubber, x, 0.33, z, Math.PI / 2, 0, 0); add(new THREE.CylinderGeometry(0.19, 0.19, 0.24, 6), M.steel, x, 0.33, z, Math.PI / 2, 0, 0); }
  const hz = []; for (const [x, z] of [[2.04, 0.75], [2.04, -0.75], [-2.04, 0.75], [-2.04, -0.75]]) { const b = add(new THREE.BoxGeometry(0.06, 0.1, 0.18), new THREE.MeshBasicMaterial({ color: 0x3a2200 }), x, 0.68, z); hz.push(b.material); }
  G.userData.hz = hz; return G;
}
function makeTree(h, seed) {
  const G = new THREE.Group(), bark = std(0x4a3a2a, 0.95), leaf = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.24 + 0.04 * rnd(seed), 0.42, 0.22 + 0.06 * rnd(seed * 3)), roughness: 0.95, flatShading: true });
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, h * 0.55, 8), bark); tr.position.y = h * 0.275; tr.castShadow = true; G.add(tr);
  const crown = new THREE.Group(); crown.position.y = h * 0.55; G.add(crown);
  for (let k = 0; k < 6; k++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + rnd(seed * 7 + k) * 0.6, 1), leaf);
    f.position.set((rnd(seed * 11 + k) - 0.5) * 1.6, 0.4 + rnd(seed * 13 + k) * 1.3, (rnd(seed * 17 + k) - 0.5) * 1.6); f.castShadow = true; crown.add(f); }
  G.userData.crown = crown; G.userData.seed = seed; return G;
}
// una persona de calle (ropa variada) con su gesto: 'movil', 'señala', 'boca', 'brazos', 'bolsillos'
function makePerson(o) {
  const G = new THREE.Group(), R = { G, o };
  const skin = std(o.skin ?? 0xc89a7a, 0.6), top = std(o.top, 0.85), legs = std(o.legs ?? 0x2b3346, 0.85), hair = std(o.hair ?? 0x2a1d14, 0.9), shoe = std(o.shoe ?? 0x1c1c1e, 0.6);
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, p = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; };
  const k = o.h ?? 1;                                                       // estatura relativa
  for (const s of [-1, 1]) { add(new RoundedBoxGeometry(0.11, 0.08, 0.26, 2, 0.03), shoe, 0.1 * s, 0.04, -0.03); add(new THREE.CapsuleGeometry(0.068, 0.62 * k, 5, 12), legs, 0.1 * s, 0.47 * k, 0); }
  add(new RoundedBoxGeometry(0.42, 0.6 * k, 0.24, 4, 0.1), top, 0, 1.1 * k, 0);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.075, 12, 10), top, 0.21 * s, 1.36 * k, 0);
  add(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 10), skin, 0, 1.43 * k, 0);
  const head = new THREE.Group(); head.position.set(0, 1.55 * k, 0); G.add(head);
  add(new THREE.SphereGeometry(0.1, 18, 14), skin, 0, 0, 0, 0, 0, 0, 0.92, 1.1, 1, head);
  add(new THREE.SphereGeometry(0.104, 18, 14, 0, Math.PI * 2, 0, o.long ? 2.2 : 1.55), hair, 0, 0.012, 0.01, -0.15, 0, 0, 0.95, 1.08, 1.04, head);
  if (o.cap) add(new THREE.CylinderGeometry(0.105, 0.105, 0.06, 18), std(o.cap, 0.7), 0, 0.075, 0, 0, 0, 0, 1, 1, 1, head), add(new THREE.BoxGeometry(0.12, 0.012, 0.09), std(o.cap, 0.7), 0, 0.05, -0.12, 0, 0, 0, 1, 1, 1, head);
  R.head = head;
  const SH = s => V(0.22 * s, 1.34 * k, 0), L1 = 0.27 * k, L2 = 0.25 * k;
  R.arms = [-1, 1].map(s => ({ s, up: add(new THREE.CylinderGeometry(0.052, 0.048, 1, 10), top, 0, 0, 0), fo: add(new THREE.CylinderGeometry(0.045, 0.04, 1, 10), o.sleeve ?? top, 0, 0, 0),
    el: add(new THREE.SphereGeometry(0.05, 10, 8), top, 0, 0, 0), hand: add(new THREE.SphereGeometry(0.045, 10, 8), skin, 0, 0, 0) }));
  if (o.gesto === 'movil') { R.phone = add(new RoundedBoxGeometry(0.075, 0.15, 0.012, 2, 0.006), std(0x111214, 0.3, 0.4), 0, 0, 0); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.064, 0.13), GLOW(0xbfd8ff, 1.3)); scr.position.z = 0.0065; R.phone.add(scr); }
  const rest = s => [V(0.26 * s, 0.82 * k, 0.02), V(0.3 * s, 1.1 * k, 0.1)];
  R.pose = (t) => {
    const ph = t * (0.5 + 0.3 * rnd(o.seed)) + o.seed * 7;
    R.head.rotation.set(0.05 * Math.sin(ph * 0.7), (o.look ?? 0) + 0.22 * Math.sin(ph * 0.45), 0);
    for (const A of R.arms) {
      let [W, E] = rest(A.s);
      if (o.gesto === 'movil' && A.s > 0) { W = V(0.1, 1.52 * k, -0.34); E = V(0.26, 1.28 * k, -0.12); }
      if (o.gesto === 'señala' && A.s > 0) { W = V(0.22 + 0.03 * Math.sin(ph), 1.5 * k + 0.03 * Math.sin(ph * 1.3), -0.5); E = V(0.3, 1.38 * k, -0.25); }
      if (o.gesto === 'boca' && A.s < 0) { W = V(-0.03, 1.5 * k, -0.15); E = V(-0.25, 1.22 * k, -0.12); }
      if (o.gesto === 'brazos') { W = V(0.08 * -A.s, 1.13 * k, -0.17); E = V(0.26 * A.s, 1.08 * k, -0.05); }
      if (o.gesto === 'bolsillos') { W = V(0.2 * A.s, 0.86 * k, -0.07); E = V(0.33 * A.s, 1.06 * k, 0.06); }
      const S = SH(A.s), r = ik2(S, W, E, L1, L2);
      between(A.up, S, r.E); A.el.position.copy(r.E); between(A.fo, r.E, r.W); A.hand.position.copy(r.W);
      if (R.phone && A.s > 0) { R.phone.position.copy(r.W).add(V(-0.01, 0.06, -0.02)); R.phone.rotation.set(0.15, Math.PI, 0); }
    }
  };
  R.pose(0);
  return R;
}
function cordon(pts) {                    // cinta de balizamiento (rojo y blanco) entre postes
  const tex = canvasTex(256, 32, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#d8241c' : '#f4f2ec'; x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32 + 32, 0); x.lineTo(i * 32 + 16, 32); x.lineTo(i * 32 - 16, 32); x.fill(); } }, { aniso: 4 });
  tex.wrapS = THREE.RepeatWrapping;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.0, 8), std(0xd8d8d8, 0.4, 0.5)); post.position.set(p.x, p.y + 0.5, p.z); post.castShadow = true; world.add(post);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 14), std(0x222222, 0.8)); base.position.set(p.x, p.y + 0.025, p.z); world.add(base);
    if (i === 0) continue;
    const a = pts[i - 1].clone().add(V(0, 0.98, 0)), b = p.clone().add(V(0, 0.98, 0)), mid = a.clone().lerp(b, 0.5).add(V(0, -0.06, 0));
    const c = new THREE.QuadraticBezierCurve3(a, mid, b), L = a.distanceTo(b);
    const geo = new THREE.TubeGeometry(c, 16, 0.035, 2, false); const t2 = tex.clone(); t2.needsUpdate = true; t2.repeat.set(L * 3, 1);
    const tape = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t2, roughness: 0.6, side: THREE.DoubleSide })); tape.scale.set(1, 1, 1); world.add(tape);
  }
}
// ================================================================== de día, una carretera: el coche tumbado de lado con TU MADRE dentro y los dos puntales
const world = new THREE.Group(); scene.add(world);
const RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D', WHITE2 = '#F4F6F8', BLUE2 = '#62B0FF', PINK2 = '#FF5C8A';
const LBLY = 690;
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
const std = (c, r = 0.6, mt = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt });
const ALPHA = 0, TA = 0;                                          // carretera llana
const hY = x => 0;
const SW = 0.89;                                                  // media anchura del coche
const HINGE = V(0.62, 0, -SW), DOORL = 1.1;
const CAR_T = V(0, 0.905, 0.2);                                   // el coche tumbado sobre su lado derecho: los bajos miran a −Z, el techo a +Z
let car, carR, carPiv, collar, mom, A, B, C, F, truck, amb, beacons = [], ambLights = [], hz = [], sunL;
let struts = [], ghostCar, ghostM, gStruts = [], gStrutM, momOut, medic, ambDoors = [];
const SX = [0.75, -0.72];                                         // los dos puntales (x en el coche): delante, junto al pilar A, y detrás
const HEAD_L = (x) => V(x, 0.25, -0.62);                          // donde muerde la cabeza: los bajos, junto al estribo de arriba (coordenadas del coche)
const ANCH_L = (x) => V(x, 0.2, 0.8);                             // el punto más bajo: el estribo de abajo, pegado al suelo
const FOOT = (x) => V(x, 0, -0.38);                               // el pie del puntal en el suelo (mundo)
function carW(x, y, z) { return car.localToWorld(V(x, y, z)); }
function onGround(obj, wx, wz, dy = 0) { obj.position.set(wx, -dy, wz); }

// ------------------------------------------------------------------ tu madre: sentada (coordenadas de un asiento que mira a +X), colgada del cinturón hacia +Z si «lean» > 0
function makeMom(lean = 0, blanket = false) {
  const P = new THREE.Group(), z0 = -0.42;
  const blouse = std(0x9c3b5e, 0.8), trousers = std(0x2f3c58, 0.85), skin = std(0xd7a487, 0.6), hair = std(0x6b4e3a, 0.9), shoe = std(0x1c1c1e, 0.6);
  const cap = (a, b, r, m) => { const k = new THREE.Mesh(new THREE.CapsuleGeometry(r, 1, 4, 10), m); const d = b.clone().sub(a), L = d.length(); k.position.copy(a).add(b).multiplyScalar(0.5); k.scale.set(1, Math.max(0.01, L / (1 + 2 * r)), 1); k.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); k.castShadow = true; P.add(k); return k; };
  const L = lean;                                                   // cuánto cuelga hacia +Z (el lado que ahora está abajo)
  const hip = V(-0.2, 0.68, z0 + 0.03 * L), chest = V(-0.1, 1.05, z0 + 0.13 * L);
  cap(hip, chest, 0.14, blouse);
  for (const s of [-1, 1]) { const z = z0 + 0.1 * s + 0.03 * L;
    cap(V(-0.12, 0.64, z), V(0.24, 0.66, z + 0.02 * L), 0.072, trousers); cap(V(0.26, 0.63, z + 0.02 * L), V(0.36, 0.42, z + 0.05 * L), 0.062, trousers);
    const sh = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.07, 0.09, 2, 0.03), shoe); sh.position.set(0.41, 0.4, z + 0.05 * L); P.add(sh); }
  // brazos: colgando hacia +Z (dentro del coche tumbado) o sujetando la manta
  for (const s of [-1, 1]) {
    const sh = chest.clone().add(V(0, -0.03, 0.18 * s)), el = blanket ? V(0.02, 0.86, z0 + 0.16 * s) : sh.clone().add(V(0.05, -0.1, 0.2 + 0.05 * s * (1 - L))),
      wr = blanket ? V(0.14, 0.95, z0 + 0.05 * s) : el.clone().add(V(0.08, -0.06, 0.2));
    cap(sh, el, 0.048, blouse); cap(el, wr, 0.042, blouse);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), skin); hd.position.copy(wr); P.add(hd);
  }
  const neckTop = chest.clone().add(V(0.03, 0.1, 0.06 * L));
  cap(chest.clone().add(V(0, 0.02, 0)), neckTop, 0.045, skin);
  const head = new THREE.Group(); head.position.copy(neckTop).add(V(0.01, 0.09, 0.05 * L)); head.rotation.set(0.35 * L, 0, -0.1 - 0.45 * L); P.add(head);
  const hm = new THREE.Mesh(new THREE.SphereGeometry(0.098, 18, 14), skin); hm.scale.set(1, 1.12, 0.92); head.add(hm);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.106, 18, 14, 0, Math.PI * 2, 0, 2.15), hair); hr.rotation.set(0, 0, 0.55); hr.position.set(-0.025, 0.01, 0); head.add(hr);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), hair); bun.position.set(-0.1, 0.06, 0); head.add(bun);
  P.userData.head = head;
  if (blanket) {                                                     // manta térmica dorada por los hombros
    const bm = new THREE.MeshStandardMaterial({ color: 0xd8a83a, metalness: 0.85, roughness: 0.32, side: THREE.DoubleSide, emissive: 0x3a2a08, emissiveIntensity: 0.4 });
    const bl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.62, 20, 1, true, -2.4, 4.8), bm); bl.position.set(-0.13, 0.82, z0); bl.rotation.set(0, -Math.PI / 2, 0.12); bl.castShadow = true; P.add(bl);
  }
  P.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return P;
}

// ------------------------------------------------------------------ el puntal de estabilización (genérico): tubo de aluminio telescópico, pie con púas y cuña, cabeza con cuchilla, trinquete y cinta
let strapM, alu, chromeM;
function makeHookJ(mat) {
  const pts = [V(0, 0.07, 0), V(0, 0.0, 0), V(0, -0.03, 0), V(0.012, -0.052, 0), V(0.04, -0.06, 0), V(0.062, -0.045, 0), V(0.066, -0.018, 0)];
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.009, 8), mat); m.castShadow = true; return m;
}
function makeStrut2() {
  const S = {};
  S.o = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 1, 16), alu);           // tubo de fuera
  S.i = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 1, 14), chromeM);       // tubo de dentro (sale)
  S.pin = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 8), std(0xd8241c, 0.5)); // pasador
  // el pie: placa con púas que gira, y la cuña de seguridad detrás
  S.foot = new THREE.Group();
  const pl = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.035, 0.22, 2, 0.01), std(0x1a1b1e, 0.7, 0.3)); pl.position.y = 0.018; S.foot.add(pl);
  for (const [x, z] of [[-0.07, -0.08], [0.07, -0.08], [-0.07, 0.08], [0.07, 0.08]]) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 6), alu); sp.position.set(x, 0.0, z); sp.rotation.x = Math.PI; S.foot.add(sp); }
  const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12), alu); knuckle.position.y = 0.05; knuckle.rotation.z = Math.PI / 2; S.foot.add(knuckle);
  const ws = new THREE.Shape(); ws.moveTo(-0.11, 0); ws.lineTo(0.11, 0); ws.lineTo(-0.11, 0.07); ws.closePath();
  const wg = new THREE.ExtrudeGeometry(ws, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 1 }); wg.translate(0, 0, -0.065);
  S.wedge = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: 0xf2c21a, roughness: 0.55, emissive: 0xf2c21a, emissiveIntensity: 0.06 }));
  // la cabeza: placa con dientes (la cuchilla que muerde la chapa) y su cuña metálica
  S.head = new THREE.Group();
  const hp = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.03, 0.12, 2, 0.008), std(0x2b2d31, 0.5, 0.6)); S.head.add(hp);
  S.teeth = new THREE.MeshStandardMaterial({ color: 0xd8dde4, metalness: 0.9, roughness: 0.25, emissive: 0xffc83d, emissiveIntensity: 0 });
  for (let k = 0; k < 5; k++) { const tt = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 4), S.teeth); tt.position.set(-0.06 + k * 0.03, 0.035, 0); S.head.add(tt); }
  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.07, 12), alu); yoke.position.y = -0.04; S.head.add(yoke);
  // el trinquete (en el tubo) y su palanca, la cinta y el gancho
  S.rat = new THREE.Group();
  const rb = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.13, 0.1, 2, 0.02), std(0x16171a, 0.5, 0.4)); S.rat.add(rb);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 14), alu); drum.rotation.z = Math.PI / 2; drum.position.set(0, -0.02, 0.06); S.rat.add(drum);
  S.lever = new THREE.Group(); S.lever.position.set(0, -0.02, 0.06); S.rat.add(S.lever);
  const lv = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.2, 0.028, 2, 0.01), std(0xe8661a, 0.45, 0.3)); lv.position.set(0, 0.1, 0.04); S.lever.add(lv);
  S.strap = []; for (let k = 0; k < 10; k++) { const sg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1, 0.005), strapM); sg.castShadow = true; S.strap.push(sg); world.add(sg); }
  S.hook = makeHookJ(chromeM);
  for (const k of ['o', 'i', 'pin', 'foot', 'wedge', 'head', 'rat', 'hook']) { S[k].traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); world.add(S[k]); }
  return S;
}

// ------------------------------------------------------------------ el mundo: carretera llana con guardarraíl, campo, árboles, autobomba, ambulancia (al final, tu madre a salvo), curiosos
function buildWorld() {
  mats(); M.paint = new THREE.MeshStandardMaterial({ color: 0xb0121a, roughness: 0.28, metalness: 0.05 });
  NOISE = NOISE || noiseTex();
  alu = new THREE.MeshStandardMaterial({ color: 0xaab2bd, metalness: 0.75, roughness: 0.38 });
  chromeM = new THREE.MeshStandardMaterial({ color: 0xe6e8ec, metalness: 1.0, roughness: 0.16 });
  strapM = new THREE.MeshStandardMaterial({ color: 0xf07a1a, roughness: 0.6, emissive: 0xf07a1a, emissiveIntensity: 0.08 });
  const SUN2 = V(-0.32, 0.7, -0.64).normalize();
  scene.background = HAZE.clone(); scene.fog = new THREE.FogExp2(HAZE.clone(), 0.0075); scene.environmentIntensity = 0.45;
  cam.far = 300; cam.updateProjectionMatrix();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(250, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: SUN2 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vD; uniform vec3 uSun; void main(){ float h = clamp(vD.y, 0.0, 1.0);
      vec3 c = mix(vec3(0.76, 0.76, 0.74), vec3(0.34, 0.52, 0.76), pow(h, 0.5)); float s = max(dot(vD, uSun), 0.0);
      c += vec3(1.0, 0.86, 0.62) * (pow(s, 300.0) * 6.0 + pow(s, 8.0) * 0.25); gl_FragColor = vec4(c, 1.0); }` }));
  sky.renderOrder = -1; sky.frustumCulled = false; world.add(sky);
  world.add(new THREE.HemisphereLight(0xb4c6dc, 0x5a5040, 1.15));
  sunL = new THREE.DirectionalLight(0xfff0dc, 2.7); sunL.position.copy(SUN2).multiplyScalar(60).add(V(2, 0, 1)); sunL.target.position.set(2, 0, 1);
  sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
  Object.assign(sunL.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 20, far: 110 }); sunL.shadow.camera.updateProjectionMatrix();
  sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.03; world.add(sunL, sunL.target);
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // el campo (hierba seca) y la carretera con sus líneas
  const flat = (geo, mat, y = 0) => { geo.rotateX(-Math.PI / 2); const m = new THREE.Mesh(geo, mat); m.position.y = y; m.receiveShadow = true; world.add(m); return m; };
  const grass = canvasTex(512, 512, (x) => { x.fillStyle = '#7d7a45'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 22000; i++) { const g2 = 90 + rnd(i) * 70; x.fillStyle = `rgba(${g2 + 20},${g2 + 12},${g2 - 40},0.5)`; x.fillRect(rnd(i * 3.7) * 512, rnd(i * 6.1) * 512, 2, 4); } }, { aniso: 8 });
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(60, 40);
  flat(new THREE.PlaneGeometry(240, 160), new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 }), -0.02);
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#4c4e52'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 16000; i++) { const v = 55 + rnd(i) * 45; x.fillStyle = `rgba(${v},${v},${v + 2},0.5)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); }
    x.fillStyle = 'rgba(20,20,22,0.35)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse(rnd(i * 9) * 512, rnd(i * 13) * 512, 30 + rnd(i) * 50, 8, rnd(i * 3), 0, 7); x.fill(); } }, { aniso: 8 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(30, 2);
  flat(new THREE.PlaneGeometry(240, 7.6), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.88 }), 0.0);
  const line = std(0xe6e6de, 0.6);
  for (let x = -80; x < 80; x += 6) { const l = flat(new THREE.PlaneGeometry(3, 0.12), line, 0.006); l.position.x = x; }
  for (const z of [-3.6, 3.6]) { const l = flat(new THREE.PlaneGeometry(240, 0.12), line, 0.006); l.position.z = z; }
  // marcas de frenada hasta el coche
  const skid = std(0x1d1e20, 0.95);
  for (const dz of [-0.5, 0.5]) { const s = flat(new THREE.PlaneGeometry(9, 0.16), skid, 0.004); s.position.set(-7.5, 0.004, 1.6 + dz * 1.4); s.rotation.y = 0.12; }
  // guardarraíl (doble onda) a la derecha
  const railM = new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.8, roughness: 0.35 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(240, 0.3, 0.06), railM); rail.position.set(0, 0.62, 4.3); rail.castShadow = true; world.add(rail);
  for (let x = -60; x <= 60; x += 2) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.12), std(0x8a8f96, 0.5, 0.6)); p.position.set(x, 0.38, 4.38); p.castShadow = true; world.add(p); }
  // árboles y colinas a lo lejos
  for (let i = 0; i < 16; i++) { const x = -40 + i * 5.3 + rnd(i) * 2, z = 9 + rnd(i * 3) * 9, t = makeTree(5.5 + rnd(i * 5) * 2.5, i + 30); onGround(t, x, z); world.add(t); trees.push(t); }
  for (let i = 0; i < 12; i++) { const x = -36 + i * 6.4 + rnd(i * 7) * 2, z = -9 - rnd(i * 9) * 8, t = makeTree(5 + rnd(i * 11) * 2.5, i + 60); onGround(t, x, z); world.add(t); trees.push(t); }
  const hillM = new THREE.MeshStandardMaterial({ color: 0x6f7a55, roughness: 1, flatShading: true });
  for (let i = 0; i < 7; i++) { const h = new THREE.Mesh(new THREE.IcosahedronGeometry(30 + rnd(i) * 25, 1), hillM); h.scale.set(1.6, 0.35, 1); h.position.set(-120 + i * 45, -4, i % 2 ? 110 : -120); world.add(h); }
  // el coche tumbado: gira sobre la arista de abajo (lado derecho con los bajos); dentro, tu madre colgada del cinturón
  carR = makeRescueCar(0x4a86c5); car = carR.G; carR.patient.visible = false;
  carPiv = new THREE.Group(); carPiv.position.set(0, 0.015, 0.2); world.add(carPiv);
  car.position.set(0, 0, -SW); carPiv.add(car); carPiv.rotation.x = Math.PI / 2; carPiv.updateMatrixWorld(true);
  // los bajos (se ven con el coche tumbado): escape con silenciador, ejes, depósito, túnel y brazos
  const ub = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.rotation.set(rx, ry, rz); k.castShadow = k.receiveShadow = true; car.add(k); return k; };
  const rust = std(0x8a7d70, 0.55, 0.5), dk = std(0x2e3034, 0.8, 0.25);
  ub(new THREE.CylinderGeometry(0.035, 0.035, 3.3, 10), rust, -0.1, 0.19, 0.28, 0, 0, Math.PI / 2);
  ub(new RoundedBoxGeometry(0.55, 0.14, 0.26, 2, 0.05), rust, -1.55, 0.19, 0.33);
  ub(new RoundedBoxGeometry(0.75, 0.12, 0.62, 2, 0.04), dk, -0.75, 0.18, 0.22);
  ub(new THREE.BoxGeometry(2.6, 0.1, 0.24), dk, 0.35, 0.2, 0.0);
  for (const x of [1.3, -1.3]) { ub(new THREE.CylinderGeometry(0.04, 0.04, 1.42, 10), std(0x3a3b3e, 0.6, 0.6), x, 0.32, 0, Math.PI / 2, 0, 0);
    for (const s of [-1, 1]) ub(new THREE.BoxGeometry(0.42, 0.05, 0.08), dk, x - 0.2 * Math.sign(x), 0.22, 0.45 * s, 0, 0.5 * s * Math.sign(x), 0); }
  mom = makeMom(1, false); car.add(mom);
  // el cinturón que la sujeta (banda y cintura)
  const beltM = std(0x2a2b2f, 0.8);
  const belt = (a, b) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.012), beltM); between(m, a, b); m.castShadow = true; car.add(m); return m; };
  belt(V(-0.52, 1.3, -0.8), V(-0.06, 1.0, -0.36)); belt(V(-0.06, 1.0, -0.36), V(-0.14, 0.66, -0.12)); belt(V(-0.16, 0.66, -0.72), V(-0.14, 0.66, -0.12));
  car.updateMatrixWorld(true);
  // el coche fantasma (las opciones que NO son): A, se mueve al sacarla; B, ponerlo derecho
  ghostM = new THREE.MeshBasicMaterial({ color: 0xff3b2e, transparent: true, opacity: 0, depthWrite: false, fog: false });
  ghostCar = new THREE.Group(); world.add(ghostCar); ghostCar.position.copy(carPiv.position);
  const gc = makeCar(0); gc.traverse(o => { if (o.isMesh) { o.material = ghostM; o.castShadow = false; o.receiveShadow = false; } }); gc.position.set(0, 0, -SW); ghostCar.add(gc); ghostCar.visible = false;
  // los dos puntales y sus fantasmas (la opción C)
  for (const x of SX) { const S = makeStrut2(); S.x = x; struts.push(S); }
  gStrutM = new THREE.MeshBasicMaterial({ color: 0x3ef08a, transparent: true, opacity: 0, depthWrite: false, fog: false });
  for (const x of SX) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 12), gStrutM); m.visible = false; world.add(m); gStruts.push(m); }
  // la autobomba (de culata, detrás del coche) y la ambulancia (con la culata hacia el coche y las puertas abiertas)
  truck = makeTruck(); truck.position.set(-10.5, 0, 1.4); truck.rotation.y = Math.PI; world.add(truck); truck.updateMatrixWorld(true); beacons = truck.userData.lbar;
  truck.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  amb = new THREE.Group(); amb.position.set(10.6, 0, 1.1); world.add(amb);
  const white = std(0xf2f2ee, 0.4, 0.1), add2 = (geo, m, x, y, z, p = amb) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = k.receiveShadow = true; p.add(k); return k; };
  add2(new RoundedBoxGeometry(3.6, 2.2, 2.1, 3, 0.1), white, -0.6, 1.5, 0); add2(new RoundedBoxGeometry(1.5, 1.6, 2.05, 3, 0.12), white, 1.9, 1.2, 0);
  add2(new THREE.BoxGeometry(5.0, 0.12, 2.12), new THREE.MeshStandardMaterial({ color: 0xd8241c, roughness: 0.5 }), 0.2, 1.05, 0);
  add2(new THREE.BoxGeometry(5.0, 0.1, 2.13), new THREE.MeshStandardMaterial({ color: 0xf2c21a, roughness: 0.5 }), 0.2, 0.88, 0);
  add2(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.05, metalness: 0.6 }), 2.66, 1.55, 0).rotation.y = Math.PI / 2;
  for (const [x, z] of [[1.8, 0.95], [1.8, -0.95], [-1.6, 0.95], [-1.6, -0.95]]) { const w = add2(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 22), M.rubber, x, 0.36, z); w.rotation.x = Math.PI / 2; }
  for (const z of [-0.6, 0.6]) { const b = add2(new RoundedBoxGeometry(0.3, 0.14, 0.5, 2, 0.04), new THREE.MeshBasicMaterial({ color: 0x2a6bff }), 1.5, 2.66, z); ambLights.push(b.material); }
  const ambL = new THREE.PointLight(0x2f6bff, 0, 0, 2); ambL.position.set(1.5, 3.2, 0); amb.add(ambL); amb.userData.pl = ambL;
  // la culata abierta: hueco oscuro, suelo, estribo y las dos puertas abiertas
  add2(new THREE.BoxGeometry(0.04, 1.6, 1.7), std(0x1c1e22, 0.9), -2.41, 1.55, 0);
  add2(new THREE.BoxGeometry(0.3, 0.06, 1.75), std(0xbfc3c8, 0.5, 0.4), -2.5, 0.74, 0);
  add2(new THREE.BoxGeometry(0.22, 0.05, 1.2), std(0x2b2d31, 0.6, 0.5), -2.55, 0.42, 0);
  for (const s of [-1, 1]) { const h = new THREE.Group(); h.position.set(-2.42, 0, s * 1.02); h.rotation.y = s * 1.75; amb.add(h); ambDoors.push(h);
    add2(new THREE.BoxGeometry(0.05, 1.7, 0.98), white, 0, 1.55, -s * 0.5, h); add2(new THREE.BoxGeometry(0.06, 0.1, 0.98), new THREE.MeshStandardMaterial({ color: 0xd8241c, roughness: 0.5 }), 0, 1.05, -s * 0.5, h); }
  // tu madre, ya fuera: sentada en la culata, con la manta térmica; a su lado, el sanitario
  momOut = makeMom(0, true); momOut.position.set(8.0, 0.28, 1.1 - 0.42); momOut.rotation.y = Math.PI; momOut.visible = false; world.add(momOut);
  medic = makePerson({ top: 0x2f7d4a, legs: 0x2b3346, gesto: 'brazos', seed: 11, hair: 0x2a1d14 }); onGround(medic.G, 7.55, 0.2); medic.G.rotation.y = Math.atan2(-(8.0 - 7.55), -(1.1 - 0.2)); medic.G.visible = false; world.add(medic.G); people.push(medic);
  // otro bombero, en la bomba de la autobomba
  F = makeHero({ noEra: true, helmet: 0xe6e8ea }); world.add(F.G);
  const pump = truck.localToWorld(V(-3.86, 0, 0)); onGround(F.G, pump.x + 0.62, pump.z); F.G.rotation.y = Math.PI / 2;
  F.pose(V(-0.16, 1.22, -0.46), V(0.14, 1.28, -0.46), V(-0.33, 1.05, -0.12), V(0.33, 1.08, -0.12));
  // curiosos detrás del guardarraíl (en el campo) y en el arcén de enfrente, lejos, con un coche parado
  const P0 = [
    { x: -2.6, z: 5.25, top: 0xc0392b, legs: 0x2b3346, gesto: 'movil', seed: 1 }, { x: -1.7, z: 5.55, top: 0x3d5a80, legs: 0x1f1f22, gesto: 'brazos', seed: 2, hair: 0x111111, h: 1.04 },
    { x: -0.7, z: 5.3, top: 0xe7e2d6, legs: 0x4a5b78, gesto: 'señala', seed: 3, hair: 0x6b4a2a, h: 0.97 }, { x: 1.9, z: 5.5, top: 0x4f6b3a, legs: 0x2b3346, gesto: 'boca', seed: 4, long: true, hair: 0xa07a4a, h: 0.95 },
    { x: 2.9, z: 5.3, top: 0xe0a32b, legs: 0x23262e, gesto: 'movil', seed: 5, long: true, hair: 0x2b1b10, h: 0.95 }, { x: 3.9, z: 5.6, top: 0x6c6f75, legs: 0x1b1d22, gesto: 'bolsillos', seed: 6, cap: 0x222222 },
    { x: -5.2, z: -5.0, top: 0x1f3d5a, legs: 0x4a4038, gesto: 'movil', seed: 7, cap: 0xa83226 }, { x: -6.1, z: -5.3, top: 0x8a4b2f, legs: 0x2b3346, gesto: 'señala', seed: 8 },
  ];
  for (const q of P0) { const p = makePerson(q); onGround(p.G, q.x, q.z); const to = V(0 - q.x, 0, 0.9 - q.z); p.G.rotation.y = Math.atan2(-to.x, -to.z); world.add(p.G); people.push(p); }
  const stopped = makeCar(0xb8b8b4); stopped.position.set(17, 0, -1.9); stopped.rotation.y = Math.PI; world.add(stopped); hazards.push(...stopped.userData.hz);
  // los tres bomberos: A (de rodillas delante del parabrisas, le habla), B y C (de rodillas, cada uno con su puntal)
  A = makeHero({ noEra: true }); world.add(A.G); onGround(A.G, 0.35, 2.95); A.G.rotation.y = 0.05;
  B = makeHero({ noEra: true, helmet: 0xe6e8ea }); kneel(B, 0.37, false); world.add(B.G); onGround(B.G, SX[0] - 0.43, -0.12, 0.37); B.G.rotation.y = Math.atan2(-0.95, -0.32);
  C = makeHero({ noEra: true }); kneel(C, 0.37, true); world.add(C.G); onGround(C.G, SX[1] + 0.43, -0.12, 0.37); C.G.rotation.y = Math.atan2(0.95, -0.32);
}

// ------------------------------------------------------------------ el coche accidentado (con la puerta del conductor que se abre y el herido dentro)
function makeRescueCar(col) {
  const G = new THREE.Group(), R = { G };
  const paint = new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.5 });
  const dark = std(0x111214, 0.85), trim = std(0x26282c, 0.7), seatM = std(0x2b2e34, 0.9), chrome = new THREE.MeshStandardMaterial({ color: 0xd8dbe0, metalness: 1, roughness: 0.2 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0x1b2632, roughness: 0.04, metalness: 0.5, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, p = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; };
  const bar = (a, b, r, mat, p = G) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), mat); between(m, a, b); m.castShadow = true; p.add(m); return m; };
  // carrocería baja: delante, detrás, el lado del acompañante, el estribo del conductor y el suelo
  add(new RoundedBoxGeometry(1.5, 0.62, 1.78, 4, 0.14), paint, 1.36, 0.61, 0);
  add(new RoundedBoxGeometry(1.62, 0.62, 1.78, 4, 0.14), paint, -1.29, 0.61, 0);
  add(new THREE.BoxGeometry(1.12, 0.62, 0.06), paint, 0.07, 0.61, SW - 0.03);
  add(new THREE.BoxGeometry(1.12, 0.14, 0.12), paint, 0.07, 0.37, -SW + 0.06);
  add(new THREE.BoxGeometry(1.12, 0.06, 1.7), dark, 0.07, 0.33, 0);
  add(new THREE.BoxGeometry(4.24, 0.12, 1.82), std(0x3b3d41, 0.85, 0.15), 0, 0.3, 0);
  // el capó, un poco levantado por el golpe, y la esquina delantera derecha abollada
  add(new THREE.BoxGeometry(1.25, 0.05, 1.62), paint, 1.42, 0.95, -0.02, 0.0, 0, -0.07);
  add(new RoundedBoxGeometry(0.4, 0.5, 0.5, 2, 0.1), std(0x22242a, 0.8), 2.0, 0.6, 0.66, 0, 0.5, 0.1);
  // techo, montantes, cristales
  add(new RoundedBoxGeometry(1.75, 0.07, 1.6, 2, 0.03), paint, -0.27, 1.415, 0);
  for (const s of [-1, 1]) {
    bar(V(0.62, 0.92, s * 0.8), V(0.3, 1.39, s * 0.78), 0.05, paint);
    bar(V(-0.48, 0.92, s * 0.83), V(-0.5, 1.39, s * 0.8), 0.06, paint);
    bar(V(-1.28, 0.92, s * 0.83), V(-1.0, 1.39, s * 0.8), 0.085, paint);
    bar(V(0.3, 1.39, s * 0.78), V(-1.0, 1.39, s * 0.8), 0.04, paint);
  }
  const quad = (pts) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); const m = new THREE.Mesh(g, glassM); m.renderOrder = 5; G.add(m); return m; };
  quad([[0.64, 0.93, 0.78], [0.64, 0.93, -0.78], [0.31, 1.385, -0.77], [0.31, 1.385, 0.77]]);           // parabrisas
  quad([[-1.3, 0.93, 0.8], [-1.3, 0.93, -0.8], [-1.02, 1.385, -0.78], [-1.02, 1.385, 0.78]]);          // luna trasera
  quad([[0.6, 0.93, 0.835], [-0.46, 0.93, 0.835], [-0.48, 1.38, 0.81], [0.31, 1.38, 0.8]]);            // ventanilla del acompañante
  for (const s of [-1, 1]) quad([[-0.52, 0.93, s * 0.835], [-1.26, 0.93, s * 0.835], [-1.0, 1.38, s * 0.81], [-0.52, 1.38, s * 0.81]]);
  // dentro: salpicadero, volante, asientos
  add(new THREE.BoxGeometry(0.36, 0.24, 1.6), trim, 0.55, 0.97, 0);
  const wheelS = add(new THREE.TorusGeometry(0.17, 0.02, 8, 28), dark, 0.3, 1.04, -0.4, 0, Math.PI / 2, 0); wheelS.rotation.set(0, Math.PI / 2, 0); wheelS.rotateX(-0.45);
  bar(V(0.3, 1.04, -0.4), V(0.45, 0.95, -0.4), 0.025, dark);
  for (const z of [-0.42, 0.42]) {
    add(new RoundedBoxGeometry(0.5, 0.13, 0.5, 2, 0.05), seatM, -0.13, 0.5, z);
    add(new RoundedBoxGeometry(0.12, 0.62, 0.5, 2, 0.05), seatM, -0.43, 0.85, z, 0, 0, 0.2);
    add(new RoundedBoxGeometry(0.1, 0.16, 0.26, 2, 0.04), seatM, -0.5, 1.22, z, 0, 0, 0.2);
  }
  add(new RoundedBoxGeometry(0.45, 0.13, 1.5, 2, 0.05), seatM, -1.0, 0.5, 0);
  // ruedas
  const rimM = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.9, roughness: 0.3 });
  for (const [x, z] of [[1.3, 0.75], [-1.3, 0.75], [1.3, -0.75], [-1.3, -0.75]]) {
    const w = new THREE.Group(); w.position.set(x, 0.32, z); G.add(w);
    add(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 28), M.rubber, 0, 0, 0, Math.PI / 2, 0, 0, w);
    add(new THREE.CylinderGeometry(0.21, 0.21, 0.225, 24), rimM, 0, 0, 0, Math.PI / 2, 0, 0, w);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.3; const sp = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.19, 0.02), rimM); sp.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, Math.sign(z) * 0.118); sp.rotation.z = a - Math.PI / 2; sp.castShadow = true; w.add(sp); }
  }
  // luces: faros, pilotos e intermitentes (los de emergencia parpadean)
  for (const z of [-0.6, 0.6]) { add(new THREE.BoxGeometry(0.04, 0.1, 0.3), GLOW(0xfff4dd, 0.9), 2.12, 0.74, z); add(new THREE.BoxGeometry(0.04, 0.1, 0.3), GLOW(0x9a1010, 1.0), -2.11, 0.76, z); }
  for (const [x, z] of [[2.1, 0.84], [2.1, -0.84], [-2.1, 0.84], [-2.1, -0.84]]) { const b = add(new THREE.BoxGeometry(0.12, 0.08, 0.14), new THREE.MeshBasicMaterial({ color: 0x3a2200 }), x, 0.72, z); hz.push(b.material); }
  // la puerta del conductor: gira sobre la bisagra (delante); sin cristal (lo quitaron)
  const door = new THREE.Group(); door.position.copy(HINGE); G.add(door);
  add(new RoundedBoxGeometry(1.1, 0.62, 0.055, 3, 0.02), paint, -0.55, 0.61, -0.03, 0, 0, 0, door);
  add(new THREE.BoxGeometry(1.03, 0.55, 0.02), trim, -0.55, 0.62, 0.006, 0, 0, 0, door);
  add(new THREE.BoxGeometry(0.81, 0.034, 0.034), paint, -0.675, 1.37, -0.02, 0, 0, 0, door);
  add(new THREE.BoxGeometry(0.034, 0.45, 0.034), paint, -1.085, 1.145, -0.02, 0, 0, 0, door);
  bar(V(-0.02, 0.92, -0.02), V(-0.27, 1.37, -0.02), 0.018, paint, door);
  add(new THREE.BoxGeometry(0.16, 0.03, 0.025), chrome, -0.86, 0.83, -0.07, 0, 0, 0, door);
  add(new THREE.BoxGeometry(0.06, 0.05, 0.012), GLOW(0xb01010, 0.8), -1.06, 0.45, 0.02, 0, 0, 0, door);
  R.door = door;
  // el herido, sentado (por encima del asiento y con la cabeza por debajo del techo), con la cabeza caída
  const P = new THREE.Group(); G.add(P); R.patient = P;
  const jacket = std(0x5a6b7a, 0.85), jeans = std(0x2f3c58, 0.85), skin = std(0xc89070, 0.6), hair = std(0x2b1d12, 0.9);
  const cap = (a, b, r, m) => { const k = new THREE.Mesh(new THREE.CapsuleGeometry(r, 1, 4, 10), m); const d = b.clone().sub(a), L = d.length(); k.position.copy(a).add(b).multiplyScalar(0.5); k.scale.set(1, Math.max(0.01, (L) / (1 + 2 * r)), 1); k.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); k.castShadow = true; P.add(k); return k; };
  cap(V(-0.2, 0.68, -0.42), V(-0.1, 1.06, -0.42), 0.15, jacket);
  for (const z of [-0.32, -0.52]) { cap(V(-0.12, 0.64, z), V(0.24, 0.66, z), 0.075, jeans); cap(V(0.26, 0.63, z), V(0.36, 0.42, z), 0.065, jeans); const sh = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.08, 0.1, 2, 0.03), std(0x1c1c1e, 0.6)); sh.position.set(0.42, 0.4, z); P.add(sh); }
  for (const z of [-0.23, -0.61]) { cap(V(-0.1, 1.02, z), V(0.02, 0.82, z), 0.05, jacket); cap(V(0.04, 0.8, z), V(0.2, 0.72, z), 0.045, jacket); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), skin); hd.position.set(0.24, 0.71, z); P.add(hd); }
  const neck = cap(V(-0.07, 1.08, -0.42), V(-0.03, 1.15, -0.42), 0.045, skin);
  const head = new THREE.Group(); head.position.set(-0.01, 1.2, -0.42); head.rotation.set(0.25, 0, -0.42); P.add(head);
  const hm = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 14), skin); hm.scale.set(1, 1.12, 0.92); head.add(hm);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.104, 18, 14, 0, Math.PI * 2, 0, 1.6), hair); hr.rotation.set(0, 0, 0.35); hr.position.set(-0.02, 0.012, 0); head.add(hr);
  R.head = head;
  collar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.085, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.7, side: THREE.DoubleSide }));
  collar.position.set(-0.05, 1.12, -0.42); collar.rotation.z = -0.15; collar.visible = false; P.add(collar);
  const cs = new THREE.Mesh(new THREE.CylinderGeometry(0.081, 0.081, 0.02, 18, 1, true), std(0xe2721a, 0.6)); cs.position.y = -0.03; collar.add(cs);
  G.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return R;
}

// ------------------------------------------------------------------ bomberos de rodillas (piernas articuladas en el suelo)
function kneel(R, dy = 0.37, rightDown = true) {
  const G = R.G;
  for (let i = 0; i < 8; i++) G.children[i].visible = false;
  const L = { navy: std(0x181d29, 0.86), boot: std(0x0b0b0c, 0.72), tape: new THREE.MeshStandardMaterial({ color: 0xe0d96f, roughness: 0.35, metalness: 0.15, emissive: 0x6b6624, emissiveIntensity: 1.0 }) };
  L.navy.normalMap = fabricNormal(); L.navy.normalScale = new THREE.Vector2(0.9, 0.9);
  const mk = (geo, m) => { const x = new THREE.Mesh(geo, m); x.castShadow = x.receiveShadow = true; G.add(x); return x; };
  const fy = dy;                                                  // el suelo, en coordenadas del bombero (bajado dy)
  for (const s of [-1, 1]) {
    const down = (s > 0) === rightDown, hip = V(0.11 * s, 0.86, 0);
    let knee, ank, foot;
    if (down) { knee = V(0.11 * s, fy + 0.085, -0.13); ank = V(0.11 * s, fy + 0.07, 0.27); foot = V(0.11 * s, fy + 0.05, 0.36); }
    else { knee = V(0.11 * s, 0.84, -0.42); ank = V(0.11 * s, fy + 0.11, -0.45); foot = V(0.11 * s, fy + 0.065, -0.52); }
    between(mk(new THREE.CylinderGeometry(0.088, 0.085, 1, 14), L.navy), hip, knee);
    mk(new THREE.SphereGeometry(0.087, 14, 10), L.navy).position.copy(knee);
    between(mk(new THREE.CylinderGeometry(0.084, 0.08, 1, 14), L.navy), knee, ank);
    const tb = mk(new THREE.CylinderGeometry(0.086, 0.086, 0.03, 14, 1, true), L.tape); tb.position.copy(knee).lerp(ank, 0.55); tb.quaternion.setFromUnitVectors(V(0, 1, 0), ank.clone().sub(knee).normalize());
    const bt = mk(new RoundedBoxGeometry(0.13, 0.13, 0.3, 3, 0.045), L.boot);
    if (down) { bt.position.set(0.11 * s, fy + 0.065, 0.36); bt.rotation.x = 1.25; } else { bt.position.set(0.11 * s, fy + 0.065, -0.5); }
  }
  G.userData.dy = dy;
}

function sagCurve(a, b, sag, n) { const P = []; for (let i = 0; i <= n; i++) { const k = i / n, p = a.clone().lerp(b, k); p.y -= sag * 4 * k * (1 - k); P.push(p); } return P; }

// ------------------------------------------------------------------ tiempos y cámara (un dron que no para, siempre por espacio libre)
let T = {}, KEYS = null, KH = null;
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  T.rise0 = T.puntales - 0.25; T.rise1 = T.contra + 0.1;                // los puntales se inclinan hacia el coche…
  T.ext0 = T.contra - 0.05; T.ext1 = T.coche2 + 0.25;                   // …se alargan…
  T.bite = T.coche2 + 0.3;                                               // …y la cabeza muerde la chapa
  T.crank0 = T.tensas - 0.05; T.crank1 = T.trinquete + 0.45;             // el trinquete: la cinta se tensa
  T.still = T.mueve;                                                     // ya no se mueve
  T.out = T.ahora + 0.35;                                                // (fuera: en la ambulancia)
  KEYS = camKeys(); KH = KEYS;
}
function camKeys() {
  const k = (t, p, q, fov) => [t, [...p, ...q, fov]];
  const K = [
    k(0, [5.2, 9.0, -5.2], [0.0, 0.6, 0.9], 44),                         // desde arriba: la carretera, el coche tumbado, los curiosos
    k(T.madre + 0.6, [5.8, 2.3, 2.0], [0.3, 1.1, 1.35], 34),             // bajando hacia el parabrisas
    k(T.tumbado + 0.3, [4.0, 1.28, 1.13], [-0.06, 1.1, 1.42], 28),       // tu madre, de frente por el parabrisas (a ras del capó)
    k(T.caer, [3.8, 1.25, 1.12], [-0.06, 1.1, 1.42], 27),
    k(T.haces, [5.4, 4.3, -3.0], [-0.1, 0.45, 0.4], 40),                 // las opciones (el coche arriba, las tarjetas abajo)
    k(T.c + 0.3, [5.6, 4.5, -3.6], [-0.1, 0.45, 0.35], 40),
    k(T.lac + 0.45, [4.4, 2.2, -3.6], [0.75, 0.75, 0.0], 36),            // ¡la C!: el puntal de delante, con B detrás
    k(T.contra, [4.1, 1.9, -3.5], [0.75, 0.8, 0.0], 35),
    k(T.sesenta + 0.2, [3.8, 1.3, -3.1], [0.75, 0.65, 0.0], 34),          // 60° con el suelo
    k(T.cinta, [3.6, 1.05, -3.0], [0.75, 0.45, 0.05], 34),               // la cinta, al punto más bajo
    k(T.trinquete + 0.4, [3.5, 1.1, -2.9], [0.8, 0.5, 0.0], 34),         // el trinquete
    k(T.peso + 0.2, [5.6, 2.3, -5.0], [0.0, 0.8, 0.0], 38),              // el triángulo y el peso del coche
    k(T.mueve + 0.2, [5.2, 2.4, -5.3], [0.0, 0.8, 0.0], 38),
    k(T.sacais - 0.3, [4.6, 1.9, 1.1], [8.0, 1.0, 1.1], 34),             // ¡la sacáis!: en la ambulancia, a salvo
    k(T.sacais + 0.9, [4.8, 1.8, 1.1], [8.0, 1.0, 1.1], 32),
    k(T.elegido, [4.5, 6.5, -6.5], [3.6, 0.8, 0.8], 42),                 // abierto: ¿tú qué habrías elegido?
    k(T.compartir + 0.6, [2.5, 7.2, -9.0], [2.5, 0.9, 0.8], 42),
    k(T.end, [0.5, 8.2, -11.5], [2.0, 1.0, 0.8], 44),
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
  g.save(); g.globalAlpha = cl(a); g.translate(cl(x, 200, W2 - 200), cl(y, LBLY, H2 - 300)); g.scale(s, s);
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
  const lx = o.at ? o.at[0] : cl(q.x + dx, 200, W2 - 200), ly = o.at ? o.at[1] : cl(q.y + dy, LBLY, H2 - 300);
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
  const v = hermite(KH, t), s = Math.min(1, Math.hypot(v[0] - v[3], v[1] - v[4], v[2] - v[5]) / 2);
  const sh = 0.007 * pulse(t, T.caer + 0.1, 0.14) + 0.003 * pulse(t, T.bite, 0.08);
  return pose(V(v[0] + 0.015 * s * Math.sin(t * 0.7) + sh * Math.sin(t * 90), v[1] + 0.012 * s * Math.sin(t * 0.53 + 1) + sh * Math.sin(t * 70), v[2]), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t (todo depende solo de t)
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const D2R = Math.PI / 180;
let TIMED = [];
function rockAng(t) {                    // el coche tumbado se balancea… hasta que los puntales lo sujetan
  let a = 1.1 + 2.2 * pulse(t, T.caer + 0.12, 0.22);
  a *= mx(1, 0.35, sm(T.bite - 0.1, T.bite + 0.25, t));
  a *= mx(1, 0.45, sm(T.crank0, T.crank1, t));
  a *= 1 - sm(T.still - 0.35, T.still + 0.05, t);
  return a * D2R * Math.sin(t * 2.4 + 0.5 * Math.sin(t * 1.3));
}
function toLocal(R, w) { R.G.updateMatrixWorld(true); return R.G.worldToLocal(w.clone()); }
const _mb = new THREE.Matrix4();
function strutState(S, j, t) {
  const F = FOOT(S.x), H = car.localToWorld(HEAD_L(S.x)), full = H.clone().sub(F), Lf = full.length(), dF = full.clone().normalize();
  const kr = e3(pr(t, T.rise0 + 0.15 * j, T.rise1 - T.rise0)), ke = e3(pr(t, T.ext0 + 0.15 * j, T.ext1 - T.ext0));
  const dir = V(0, 1, 0).lerp(dF, kr).normalize(), L = mx(1.45, Lf, ke);
  return { F, H, dir, L, Lf, side: j === 0 ? 1 : -1, bit: t > T.bite + 0.15 * j };   // el trinquete, por fuera (hacia la cámara); su bombero, por dentro
}
function crankK(t) { return pr(t, T.crank0, T.crank1 - T.crank0); }
function update(t) {
  const P0 = camAt(t);
  cam.position.copy(P0.p); cam.quaternion.copy(P0.q); cam.fov = P0.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = true; dofMat.uniforms.uFocus.value = P0.focus; dofMat.uniforms.uAp.value = mx(0.2, 0.05, sm(1.2, 4.5, P0.focus));
  for (const u of TIMED) u.uTime.value = t;
  // luces: autobomba, ambulancia, intermitentes de emergencia
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = 2 + 24 * on;
  const ph2 = (t * 2.2 + 0.3) % 1, on2 = ph2 < 0.15 || (ph2 > 0.5 && ph2 < 0.65) ? 1 : 0;
  ambLights.forEach(m => m.color.setRGB(0.3 + 1.2 * on2, 0.6 + 2.0 * on2, 2.0 + 3.0 * on2)); amb.userData.pl.intensity = 1 + 16 * on2;
  const hzOn = (t * 1.6) % 1 < 0.5; for (const m of hz.concat(hazards)) m.color.setRGB(hzOn ? 2.2 : 0.25, hzOn ? 1.2 : 0.14, 0.0);
  for (const q of people) q.pose(t);
  for (const tr of trees) { const c = tr.userData.crown, sd = tr.userData.seed; c.rotation.z = 0.025 * Math.sin(t * 1.3 + sd) + 0.012 * Math.sin(t * 3.1 + sd * 2); c.rotation.x = 0.018 * Math.sin(t * 1.1 + sd * 1.7); }
  // el coche tumbado: se balancea sobre la arista de abajo; tu madre dentro hasta que la sacan
  carPiv.rotation.x = Math.PI / 2 + rockAng(t); carPiv.updateMatrixWorld(true);
  mom.visible = t < T.out; momOut.visible = medic.G.visible = t >= T.out;
  // las opciones que NO son: A, el coche se mueve al sacarla (se te viene encima); B, lo pones derecho
  const gA = sm(T.a - 0.1, T.a + 0.1, t) * (1 - sm(T.b - 0.3, T.b - 0.1, t)), gB = sm(T.b - 0.1, T.b + 0.1, t) * (1 - sm(T.c - 0.3, T.c - 0.1, t));
  ghostCar.visible = gA + gB > 0.01 && window.COVER_T === undefined;
  if (ghostCar.visible) {
    const th = gA > 0.01 ? Math.PI / 2 - 0.42 * e3(pr(t, T.sacas - 0.25, 0.55)) : Math.PI / 2 - (Math.PI / 2) * e3(pr(t, T.pones - 0.15, T.derecho + 0.45 - T.pones));
    ghostCar.rotation.x = th; ghostM.opacity = 0.4 * Math.max(gA, gB) * (0.85 + 0.15 * Math.sin(t * 9));
  }
  // la C: los dos puntales fantasma, en su sitio
  const gC = sm(T.c - 0.1, T.c + 0.1, t) * (1 - sm(T.lac + 0.05, T.lac + 0.35, t));
  gStruts.forEach((m, j) => { m.visible = gC > 0.01 && window.COVER_T === undefined; if (m.visible) { const F = FOOT(SX[j]), H = car.localToWorld(HEAD_L(SX[j])); between(m, F, H); } });
  gStrutM.opacity = 0.55 * gC * (0.8 + 0.2 * Math.sin(t * 8));
  // los puntales: de pie en manos de B y C → se inclinan → se alargan → la cuchilla muerde → el trinquete tensa la cinta
  const ck = crankK(t);
  struts.forEach((S, j) => {
    const st = strutState(S, j, t), F = st.F, d = st.dir;
    S.foot.position.copy(F); S.wedge.position.copy(F).add(V(0, 0, -0.2)); S.wedge.rotation.y = Math.PI / 2;
    between(S.o, F.clone().addScaledVector(d, 0.05), F.clone().addScaledVector(d, 1.0));
    between(S.i, F.clone().addScaledVector(d, 0.9), F.clone().addScaledVector(d, st.L - 0.03));
    S.pin.position.copy(F).addScaledVector(d, 0.97).add(V(0.0, 0, 0)); S.pin.quaternion.setFromUnitVectors(V(0, 1, 0), V(1, 0, 0));
    S.head.position.copy(F).addScaledVector(d, st.L - 0.02); S.head.quaternion.setFromUnitVectors(V(0, 1, 0), d);
    S.teeth.emissiveIntensity = 1.8 * pulse(t, T.bite + 0.15 * j + 0.05, 0.14);
    // el trinquete, en el tubo, mirando hacia su bombero
    const zA = V(st.side, 0, 0), yA = d.clone(), xA = yA.clone().cross(zA).normalize();
    _mb.makeBasis(xA, yA, zA); S.rat.quaternion.setFromRotationMatrix(_mb);
    S.rat.position.copy(F).addScaledVector(d, 0.62).addScaledVector(zA, 0.055);
    const strokes = 4, st0 = ck > 0 && ck < 1 ? Math.abs(Math.sin(ck * Math.PI * strokes)) : 0;
    S.lever.rotation.x = -0.15 - 0.85 * st0;
    S.rat.updateMatrixWorld(true);
    // la cinta: del tambor del trinquete al gancho, en el punto más bajo (floja hasta que se tensa)
    const anc = car.localToWorld(ANCH_L(S.x)), p0 = S.rat.localToWorld(V(0, -0.02, 0.06)), up = p0.clone().sub(anc).normalize();
    S.hook.position.copy(anc); S.hook.quaternion.setFromUnitVectors(V(0, 1, 0), up);
    const tight = e3(Math.min(1, ck * 1.08)), sag = 0.24 * (1 - tight) * (1 - 0.15 * st0);
    const pts = sagCurve(p0, anc.clone().addScaledVector(up, 0.06), sag, S.strap.length).map(p => { if (p.y < 0.012) p.y = 0.012; return p; });
    for (let k = 0; k < S.strap.length; k++) between(S.strap[k], pts[k], pts[k + 1]);
    S.state = st;
  });
  // B y C: las manos en su puntal (y una en la palanca del trinquete mientras tensan)
  [[B, struts[0]], [C, struts[1]]].forEach(([R, S]) => {
    const st = S.state, d = st.dir, F = st.F, off = V(-st.side * 0.05, 0, 0);
    const hi = F.clone().addScaledVector(d, 0.95).add(off), lo = F.clone().addScaledVector(d, 0.7).add(off);
    const lev = S.lever.localToWorld(V(0, 0.19, 0.045));
    const cr = sm(T.crank0 - 0.25, T.crank0, t) * (1 - sm(T.crank1 + 0.05, T.crank1 + 0.35, t));
    const near = R === B ? 'L' : 'R';                             // la mano que va a la palanca (rodea el tubo)
    let hL = toLocal(R, near === 'L' ? lerpV(lo, lev, cr) : hi), hR = toLocal(R, near === 'R' ? lerpV(lo, lev, cr) : hi);
    const rel = sm(T.out - 0.2, T.out + 0.4, t);
    if (rel > 0) { hL = lerpV(hL, V(-0.335, 0.985, -0.17), rel); hR = lerpV(hR, V(0.335, 0.985, -0.17), rel); }
    R.pose(hL, hR, V(-0.4, 1.05, 0.05), V(0.4, 1.05, 0.05));
  });
  // A, de pie en la esquina de delante, junto al parabrisas: las manos abiertas hacia ella («tranquila, mamá»)
  const cw = 0.03 * Math.sin(t * 2.1);
  A.pose(V(-0.17, 1.3 + cw, -0.36), V(0.19, 1.33 - cw, -0.36), V(-0.36, 1.1, -0.08), V(0.36, 1.12, -0.08));
}

// ------------------------------------------------------------------ la capa 2D: el videojuego (misión, vida, tarjetas A/B/C, pasos) y los rótulos sobre la escena
function arrow2(a, b, col, alpha, w = 8) {
  if (alpha <= 0.01) return; const p = proj(a), q = proj(b); if (!p.ok || !q.ok) return;
  g.save(); g.globalAlpha = cl(alpha); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 10;
  g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke();
  const an = Math.atan2(q.y - p.y, q.x - p.x); g.beginPath(); g.moveTo(q.x + Math.cos(an) * 10, q.y + Math.sin(an) * 10);
  g.lineTo(q.x - Math.cos(an - 0.5) * 34, q.y - Math.sin(an - 0.5) * 34); g.lineTo(q.x - Math.cos(an + 0.5) * 34, q.y - Math.sin(an + 0.5) * 34); g.closePath(); g.fill(); g.restore();
}
function ring(P, col, a, t0, t, r0 = 30) {
  if (a <= 0.01) return; const q = proj(P); if (!q.ok) return;
  g.save(); g.globalAlpha = cl(a); g.strokeStyle = col; g.lineWidth = 5; g.shadowColor = col; g.shadowBlur = 16;
  g.beginPath(); g.arc(q.x, q.y, r0 * (1 + 0.5 * Math.exp(-Math.pow((t - t0 - 0.15) / 0.18, 2))), 0, 7); g.stroke(); g.restore();
}
function heart(x, y, s, col) {
  g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(0, 12); g.bezierCurveTo(-26, -6, -14, -30, 0, -16); g.bezierCurveTo(14, -30, 26, -6, 0, 12); g.closePath();
  g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 18; g.fill(); g.restore();
}
const LETC = { A: '#2DD4BF', B: '#FF8A3D', C: '#F0457A' };
function card(y, L, text, a, st) {      // st: 0 normal, 1 cursor encima, 2 correcta, 3 descartada
  if (a <= 0.01) return;
  const s = 0.8 + 0.2 * bk(cl(a)), w = 880, h = 128;
  g.save(); g.globalAlpha = cl(a) * (st === 3 ? 0.45 : 1); g.translate(540, y); g.scale(s, s);
  rr(-w / 2, -h / 2, w, h, 30); g.fillStyle = st === 2 ? 'rgba(14,60,36,0.94)' : 'rgba(8,10,14,0.9)'; g.fill();
  g.lineWidth = st === 1 || st === 2 ? 7 : 4; g.strokeStyle = st === 2 ? GREEN2 : st === 1 ? GOLD2 : st === 3 ? RED2 : 'rgba(255,255,255,0.35)';
  if (st === 1 || st === 2) { g.shadowColor = g.strokeStyle; g.shadowBlur = 26; } g.stroke(); g.shadowBlur = 0;
  g.beginPath(); g.arc(-w / 2 + 70, 0, 44, 0, 7); g.fillStyle = LETC[L]; g.fill();
  txt(L, -w / 2 + 70, 22, 64, '#0A0C10', 400, 'center', 'Bebas');
  txt(text, -w / 2 + 140, 24, 66, '#F4F6F8', 400, 'left', 'Bebas');
  if (st === 2) txt('✓', w / 2 - 60, 26, 72, GREEN2, 800, 'center');
  if (st === 3) { txt('✗', w / 2 - 60, 26, 72, RED2, 800, 'center'); g.strokeStyle = RED2; g.lineWidth = 6; g.beginPath(); g.moveTo(-w / 2 + 130, 2); g.lineTo(w / 2 - 110, 2); g.stroke(); }
  if (st === 1) txt('▶', -w / 2 - 34, 22, 56, GOLD2, 800, 'center');
  g.restore();
}
function lifeK(t) {                      // la vida de tu madre: baja mientras el coche se mueve, para cuando ya no se mueve y se llena al sacarla
  return 1 - 0.55 * sm(0.2, T.still, t) + 0.55 * e3(pr(t, T.sacais - 0.05, 0.6));
}
function hud(t) {
  const a = sm(0.05, 0.3, t) * (1 - sm(T.compartir - 0.4, T.compartir - 0.1, t));
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = a;
  const s = mx(0.7, 1, bk(pr(t, 0.05, 0.4)));
  g.save(); g.translate(540, 148); g.scale(s, s);
  rr(-410, -44, 820, 88, 26); g.fillStyle = 'rgba(8,10,14,0.86)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 4; g.stroke();
  txt('🎮  MISIÓN: SALVA A TU MADRE', 0, 20, 58, '#FFD65C', 400, 'center', 'Bebas');
  g.restore();
  // la barra de vida
  const lk = lifeK(t), safe = t > T.still, full = t > T.sacais;
  const beat = 1 + 0.18 * Math.pow(Math.max(0, Math.sin(t * Math.PI * (safe ? 1.4 : 2.4))), 8);
  rr(130, 196, 820, 52, 26); g.fillStyle = 'rgba(8,10,14,0.8)'; g.fill();
  heart(178, 224, 1.05 * beat, safe ? '#3EF08A' : '#FF3B4E');
  txt('MAMÁ', 226, 237, 38, '#F4F6F8', 400, 'left', 'Bebas');
  rr(320, 208, 600, 28, 14); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fill();
  const col = safe ? GREEN2 : lk < 0.62 ? RED2 : ORANGE2;
  rr(320, 208, 600 * lk, 28, 14); g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 14; g.fill(); g.shadowBlur = 0;
  if (!safe && lk < 0.7) { g.globalAlpha = a * 0.5 * (0.5 + 0.5 * Math.sin(t * 12)); rr(320, 208, 600 * lk, 28, 14); g.fillStyle = '#ffffff'; g.fill(); }
  g.restore();
}
function step(t) {
  const S = [[T.primero - 0.1, T.cinta - 0.15, 'PASO 1/3 · QUE NO SE MUEVA'], [T.cinta - 0.15, T.peso - 0.15, 'PASO 2/3 · LA CINTA, TENSA'], [T.peso - 0.15, T.ahora - 0.05, 'PASO 3/3 · EL TRIÁNGULO']];
  for (const [t0, t1, s] of S) {
    const a = sm(t0, t0 + 0.2, t) * (1 - sm(t1 - 0.15, t1, t)); if (a <= 0.01) continue;
    g.save(); g.globalAlpha = a; g.translate(540, 1580); const k = 0.85 + 0.15 * bk(pr(t, t0, 0.35)); g.scale(k, k);
    g.font = '400 54px Bebas'; const w = g.measureText(s).width + 80;
    rr(-w / 2, -42, w, 84, 42); g.fillStyle = 'rgba(8,10,14,0.88)'; g.fill(); g.strokeStyle = CYAN2; g.lineWidth = 4; g.stroke();
    txt(s, 0, 19, 54, '#E8F8FF', 400, 'center', 'Bebas'); g.restore();
  }
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const win = (t0, t1) => sm(t0 - 0.12, t0 + 0.08, t) * (1 - sm(t1 - 0.2, t1, t));
  const pop = t0 => 1 + 0.16 * pulse(t, t0 + 0.12, 0.18);
  // tu madre, dentro, y el coche que se puede caer
  const mh = mom.userData.head.getWorldPosition(V());
  if (window.COVER_T === undefined) tag(mh, 'MAMÁ', PINK2, win(T.madre - 0.05, T.haces - 0.1), 0, 0, { px: 62, at: [300, 980], s: pop(T.madre) });
  const ca = window.COVER_T === undefined ? win(T.caer - 0.15, T.haces - 0.05) : 0;
  if (ca > 0.01) { const r = rockAng(t) > 0 ? 1 : -1, top = car.localToWorld(V(-0.3, 0.9, -0.9));
    arrow2(top, top.clone().add(V(0, 0, -0.55 * r)), RED2, ca, 9);
    label(540, 1440, '¡SE PUEDE CAER!', RED2, ca, { px: 76, icon: 'warn', s: pop(T.caer) }); }
  // las tres opciones (tarjetas de juego) y el cursor
  const cA = T.a - 0.12, cB = T.b - 0.12, cC = T.c - 0.12, sel = T.lac - 0.05, hide = T.primero - 0.05;
  const cur = t < cB ? 'A' : t < cC ? 'B' : 'C', chosen = t >= sel;
  const ap = (t0) => sm(t0, t0 + 0.18, t) * (1 - sm(hide, hide + 0.3, t));
  if (window.COVER_T !== undefined) {           // portada: las tres opciones, sin cursor (no se destripa la respuesta)
    card(1110, 'A', 'LA SACAS YA', 1, 0); card(1265, 'B', 'LO PONES DERECHO', 1, 0); card(1420, 'C', 'LO SUJETAS TAL COMO ESTÁ', 1, 0);
    g.setTransform(1, 0, 0, 1, 0, 0); return;
  }
  card(1110, 'A', 'LA SACAS YA', ap(cA), chosen ? 3 : cur === 'A' ? 1 : 0);
  card(1265, 'B', 'LO PONES DERECHO', ap(cB), chosen ? 3 : cur === 'B' ? 1 : 0);
  card(1420, 'C', 'LO SUJETAS TAL COMO ESTÁ', ap(cC), chosen ? 2 : cur === 'C' && t > cC ? 1 : 0);
  const ok = win(sel, T.primero + 0.25);
  if (ok > 0.01) stamp('¡CORRECTA!', 860, GREEN2, ok, 130, -0.05);
  // paso 1: el ángulo (60° con el suelo) en el puntal de delante
  const S0 = struts[0].state;
  const aa = win(T.sesenta - 0.1, T.cinta - 0.1);
  if (aa > 0.01 && S0) {
    const F = S0.F, R0 = 0.42, pts = [];
    for (let k = 0; k <= 24; k++) { const an = (k / 24) * Math.atan2(S0.dir.y, S0.dir.z); pts.push(proj(F.clone().add(V(0, Math.sin(an) * R0, Math.cos(an) * R0)))); }
    g.save(); g.globalAlpha = aa; g.strokeStyle = GOLD2; g.lineWidth = 7; g.shadowColor = GOLD2; g.shadowBlur = 14;
    g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke();
    const g0 = proj(F), g1 = proj(F.clone().add(V(0, 0, 0.75))); g.lineWidth = 5; g.setLineDash([16, 12]); g.beginPath(); g.moveTo(g0.x, g0.y); g.lineTo(g1.x, g1.y); g.stroke(); g.setLineDash([]); g.restore();
    const mid = pts[12]; label(mid.x + 150, mid.y - 40, '60°', GOLD2, aa, { px: 92, s: pop(T.sesenta) });
  }
  // paso 2: la cinta al punto más bajo y el trinquete
  const anc0 = car.localToWorld(ANCH_L(SX[0]));
  ring(anc0, CYAN2, win(T.punto - 0.1, T.tensas), T.punto, t, 32);
  tag(anc0, 'PUNTO MÁS BAJO', CYAN2, win(T.punto - 0.1, T.tensas), 0, 0, { px: 56, at: [330, 1420], s: pop(T.punto) });
  const rp = struts[0].rat.getWorldPosition(V());
  tag(rp, 'TRINQUETE', ORANGE2, win(T.trinquete - 0.08, T.peso - 0.15), 0, 0, { px: 58, at: [760, 1100], s: pop(T.trinquete) });
  label(540, 1430, 'TENSA', GREEN2, win(T.trinquete + 0.35, T.peso - 0.15), { px: 72, icon: 'ok', s: pop(T.trinquete + 0.35) });
  // paso 3: el peso del coche aprieta el triángulo (puntal, cinta y coche)
  const pa = win(T.peso - 0.1, T.ahora - 0.05);
  if (pa > 0.01) { const cg = car.localToWorld(V(-0.1, 0.75, -0.1)); arrow2(cg, cg.clone().add(V(0, -0.0, -0.75)), ORANGE2, pa, 10);
    const pq = proj(cg.clone().add(V(0, 0, -0.75))); if (pq.ok) label(pq.x - 40, pq.y + 80, 'PESO', ORANGE2, pa, { px: 60, s: pop(T.peso) }); }
  const ta = win(T.triangulo - 0.15, T.ahora - 0.05);
  if (ta > 0.01) struts.forEach(S => { const st = S.state; if (!st) return; const a = proj(st.F), b = proj(st.F.clone().addScaledVector(st.dir, st.L)), c = proj(car.localToWorld(ANCH_L(S.x)));
    g.save(); g.globalAlpha = ta; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.closePath(); g.fillStyle = 'rgba(255,200,61,0.16)'; g.fill();
    g.strokeStyle = GOLD2; g.lineWidth = 6; g.shadowColor = GOLD2; g.shadowBlur = 18; g.stroke(); g.restore(); });
  label(540, 820, 'TRIÁNGULO', GOLD2, win(T.triangulo - 0.08, T.mueve - 0.15), { px: 84, s: pop(T.triangulo) });
  label(540, 1430, 'QUIETO', GREEN2, win(T.mueve - 0.1, T.ahora - 0.05), { px: 80, icon: 'ok', s: pop(T.mueve) });
  // ¡misión cumplida!: tu madre, a salvo en la ambulancia
  const mo = momOut.userData.head.getWorldPosition(V());
  tag(mo, 'MAMÁ · A SALVO', GREEN2, win(T.sacais - 0.1, T.elegido - 0.1), 0, 0, { px: 60, icon: 'ok', at: [330, 1350], s: pop(T.sacais) });
  const wa = win(T.sacais - 0.05, T.elegido - 0.15);
  if (wa > 0.01) {
    stamp('¡MISIÓN CUMPLIDA!', 800, GOLD2, wa, 124, -0.04);
    g.save(); for (let i = 0; i < 26; i++) { const an = rnd(i * 3.1) * Math.PI * 2, sp = 260 + rnd(i * 7.7) * 380, k = pr(t, T.sacais, 1.1), r = sp * e3(k);
      g.globalAlpha = wa * (1 - k) ; g.fillStyle = i % 3 ? GOLD2 : WHITE2; const x = 540 + Math.cos(an) * r, y = 800 + Math.sin(an) * r * 0.8;
      g.beginPath(); for (let q = 0; q < 10; q++) { const rr2 = q % 2 ? 6 : 15, aq = q * Math.PI / 5 + t * 3; g.lineTo(x + Math.cos(aq) * rr2, y + Math.sin(aq) * rr2); } g.closePath(); g.fill(); }
    g.restore();
  }
  // ¿tú qué habrías elegido? (A, B o C) y comenta tu letra
  const qa = sm(T.elegido - 0.15, T.elegido + 0.15, t) * (1 - sm(T.compartir - 0.4, T.compartir - 0.1, t));
  if (qa > 0.005) {
    g.save(); g.globalAlpha = qa; g.translate(540, 760);
    rr(-430, -66, 860, 132, 32); g.fillStyle = 'rgba(8,10,14,0.92)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('¿TÚ QUÉ HABRÍAS ELEGIDO?', 0, 26, 78, '#F4F6F8', 400, 'center', 'Bebas'); g.restore();
    ['A', 'B', 'C'].forEach((L, i) => { const ai = qa * sm(T.elegido + 0.1 * i, T.elegido + 0.1 * i + 0.2, t); if (ai <= 0.01) return;
      g.save(); g.globalAlpha = ai; g.translate(300 + 240 * i, 1460); const k = 0.7 + 0.3 * bk(cl((t - T.elegido - 0.1 * i) / 0.35)); g.scale(k, k);
      g.beginPath(); g.arc(0, 0, 78, 0, 7); g.fillStyle = 'rgba(8,10,14,0.92)'; g.fill(); g.lineWidth = 7; g.strokeStyle = LETC[L]; g.shadowColor = LETC[L]; g.shadowBlur = 20; g.stroke(); g.shadowBlur = 0;
      txt(L, 0, 32, 96, LETC[L], 400, 'center', 'Bebas'); g.restore(); });
    const ce = sm(T.comenta - 0.1, T.comenta + 0.2, t) * qa;
    if (ce > 0) { g.save(); g.globalAlpha = ce; g.translate(540, 1640); rr(-300, -46, 600, 92, 46); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke(); txt('💬  COMENTA TU LETRA', 0, 19, 54, '#F2F5F8', 400, 'center', 'Bebas'); g.restore(); }
  }
  hud(t); step(t);
  share(t);
  closing(t);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.01)'; g.fillRect(0, 0, 2, 2);
}

// ------------------------------------------------------------------ fotograma
window.renderAt = async t => {
  const N = window.FAST ? 1 : Math.min(2, subframes(t));
  renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < N; k++) {
    update(N === 1 ? t : t + (k / (N - 1) - 0.5) / 120);
    composer.render();
    accMat.uniforms.tSrc.value = composer.readBuffer.texture; accMat.uniforms.uW.value = 1 / N;
    renderer.setRenderTarget(accRT); renderer.autoClear = false; renderer.render(accScene, quadCam); renderer.autoClear = true;
  }
  if (N > 1) update(t);
  finMat.uniforms.tSrc.value = accRT.texture; finMat.uniforms.uTime.value = t;
  const fr = pulse(t, T.caer + 0.05, 0.08) * 0.26, fg = pulse(t, T.lac + 0.02, 0.09) * 0.22, fw = pulse(t, T.sacais + 0.02, 0.1) * 0.25;
  const fm = Math.max(fr, fg, fw);
  finMat.uniforms.uFlash.value = fm;
  if (fm === fr) finMat.uniforms.uFlashCol.value.setRGB(0.9, 0.08, 0.04); else if (fm === fg) finMat.uniforms.uFlashCol.value.setRGB(0.2, 0.95, 0.5); else finMat.uniforms.uFlashCol.value.setRGB(1.0, 0.82, 0.3);
  finMat.uniforms.uDim.value = mx(1, 0.86, sm(T.elegido - 0.1, T.elegido + 0.3, t) * (1 - sm(T.compartir - 0.3, T.compartir, t))) * mx(1, 0.72, sm(T.compartir - 0.2, T.compartir + 0.3, t)) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 1 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  await overlay(t);
};
window.__cam = t => { const P0 = camAt(t); return [P0.p.x, P0.p.y, P0.p.z].map(v => +v.toFixed(2)).concat([+P0.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 1.4);

(async () => {
  try {
    while (!_r2d) await new Promise(r => setTimeout(r, 30));
    await document.fonts.ready;
    NOISE = noiseTex();
    buildWorld();
    world.updateMatrixWorld(true);
    scene.traverse(o => { const u = o.material && o.material.uniforms; if (u && u.uTime && !TIMED.includes(u)) TIMED.push(u); });
    setupTimes();
    update(0);
    renderer.compile(scene, cam);
    window.DBG = { scene, renderer, dof, finMat, A, B, C, car, carR, world, cam, THREE, update, struts, mom };
    window.READY3D = true;
  } catch (e) { window.failed = 'puntal: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
