// «Has cortado la luz. ¿Ya puedes tocar el cable?» — las 5 reglas de oro en electricidad (idea de Adrián, Notion «SÁBADO 21»);
// 30–40 s. De noche, el cuadro eléctrico de una nave y un cable pelado en el suelo. Gancho en primera persona: el guante
// va hacia el cable, una mano fantasma vuelve a dar la luz y el arco te alcanza. Luego, las cinco reglas como cinco gestos
// sobre el mismo cuadro, en orden (cuchillas que se abren, candado y cartel, detector, pinzas a tierra unidas, conos y
// cinta), con cinco monedas de oro. Cierre: ¿qué le falta a la cuarta? Todo depende solo de t. Motor de escala.js.
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






// ================================================================== el cuadro eléctrico de una nave, de noche, y un cable dañado en el suelo
const world = new THREE.Group(); scene.add(world);
scene.fog.density = 0.014;
const RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D';
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
const PX = [-0.2, 0, 0.2];                                      // las tres fases (x)
const YJ = 2.02, YH = 1.48, ZB = 0.13, BL = 0.5;                 // mordazas fijas (arriba), bisagra de las cuchillas, z del aparato, largo de la cuchilla
const YT = 1.3;                                                  // bornes de salida (donde se verifica y se pone a tierra)
const DMG = V(1.75, 0.04, 1.6);                                   // el tramo pelado del cable, en el suelo
const STAKE = V(0.62, 0, 0.55);                                  // la pica de tierra
let truck, beacons = [], blades, padlock, sign, tester, testerLed, clamps = [], linkBar, earthCable, stake, cones = [], tapes = [], cableCurve, pulse3, sparks, arcLine, arcPts, pov, ghostHand, ghostM, ff, armR, doorG, dmgGlow;

function between(m, a, b) {
  const d = b.clone().sub(a), L = Math.max(1e-4, d.length());
  m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
}
function face(o, dir) { o.rotation.y = Math.atan2(-dir.x, -dir.z); }
function stripArm(f, side) { for (const m of f.children) if (m.isMesh && m.position.x * side > 0.285 && m.position.y < 1.42) m.visible = false; }
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
function panelTex(base, band, seed) {
  const t = canvasTex(512, 256, (x) => {
    x.fillStyle = base; x.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 64; i++) { const g = x.createLinearGradient(i * 8, 0, i * 8 + 8, 0); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.5, 'rgba(0,0,0,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0.08)'); x.fillStyle = g; x.fillRect(i * 8, 0, 8, 256); }
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(0,0,0,${0.04 + rnd(i * 3 + seed) * 0.08})`; x.fillRect(rnd(i * 7 + seed) * 512, rnd(i * 5 + seed) * 256, 2 + rnd(i) * 30, 1 + rnd(i * 2) * 6); }
    if (band) { x.fillStyle = band; x.fillRect(0, 24, 512, 18); }
  }, { aniso: 4 });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function signTex() {
  return canvasTex(256, 320, (x) => {
    x.fillStyle = '#f2f2ee'; x.fillRect(0, 0, 256, 320); x.fillStyle = '#c8211a'; x.fillRect(0, 0, 256, 92); x.fillRect(0, 300, 256, 20);
    x.fillStyle = '#fff'; x.font = 'bold 54px Arial'; x.textAlign = 'center'; x.fillText('PELIGRO', 128, 66);
    x.fillStyle = '#111'; x.font = 'bold 44px Arial'; x.fillText('NO', 128, 160); x.fillText('CONECTAR', 128, 210);
    x.font = '28px Arial'; x.fillText('TRABAJANDO', 128, 262);
    x.beginPath(); x.arc(128, 18, 9, 0, 7); x.fillStyle = '#888'; x.fill();
  });
}

function buildWorld() {
  world.add(new THREE.HemisphereLight(0x3a4c76, 0x0a0705, 0.7));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.4); moon.position.set(-12, 26, 18); world.add(moon);
  // suelo de hormigón y la pared de la nave (chapa)
  const conc = canvasTex(512, 512, (x) => { x.fillStyle = '#3a3a3c'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 9000; i++) { const v = 40 + rnd(i) * 40; x.fillStyle = `rgba(${v},${v},${v},0.5)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); }
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 512); x.stroke(); x.beginPath(); x.moveTo(0, i * 128); x.lineTo(512, i * 128); x.stroke(); } }, { aniso: 4 });
  conc.wrapS = conc.wrapT = THREE.RepeatWrapping; conc.repeat.set(16, 16);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: conc, color: 0x8a8a8a, roughness: 0.75 }));
  ground.rotation.x = -Math.PI / 2; ground.position.z = 20; ground.receiveShadow = true; world.add(ground);
  const tex = panelTex('#6f767f', '#1f5fbf', 5); tex.repeat.set(10, 2);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.35 })); wall.position.set(0, 4, -0.02); wall.receiveShadow = true; world.add(wall);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.8 })); plinth.position.set(0, 0.25, 0.03); world.add(plinth);
  // el humo que sale por una ventana alta (hay incendio dentro)
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), new THREE.MeshBasicMaterial({ color: 0xff7a2a })); win.position.set(-4.2, 5.4, 0.01); world.add(win);
  const sm = new Parts(30, { life: 4, rise: 0.8, acc: 0.05, size: 1.4, grow: 1.6, turb: 0.3, conv: 0.1, rot: 6.28, opacity: 0.5, c: SMOKE_C, seed: 7, extent: [0.9, 0.2, 0.2] });
  sm.at(-4.2, 5.9, 0.4); world.add(sm.mesh); world.userData.smoke = sm;
  const wl = new THREE.PointLight(0xff6a1a, 25, 0, 2); wl.position.set(-4.2, 5.2, 1.2); world.add(wl);
  // el cuadro: caja con la puerta abierta, placa de fondo
  const grey = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.45, metalness: 0.5 }), back = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.7 });
  const box = new THREE.Group(); world.add(box);
  const bx = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; box.add(b); return b; };
  bx(0.9, 1.5, 0.02, 0, 1.65, 0.01, back);
  bx(0.03, 1.5, 0.3, -0.45, 1.65, 0.15, grey); bx(0.03, 1.5, 0.3, 0.45, 1.65, 0.15, grey); bx(0.93, 0.03, 0.3, 0, 2.4, 0.15, grey); bx(0.93, 0.03, 0.3, 0, 0.9, 0.15, grey);
  doorG = new THREE.Group(); doorG.position.set(-0.46, 1.65, 0.3); world.add(doorG);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.025), grey); door.position.set(0.45, 0, 0); door.castShadow = true; doorG.add(door);
  const warn = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.2), new THREE.MeshBasicMaterial({ map: canvasTex(128, 116, (x) => { x.fillStyle = '#f2c21a'; x.beginPath(); x.moveTo(64, 4); x.lineTo(124, 112); x.lineTo(4, 112); x.closePath(); x.fill(); x.strokeStyle = '#111'; x.lineWidth = 7; x.stroke(); x.fillStyle = '#111'; x.beginPath(); x.moveTo(70, 30); x.lineTo(50, 74); x.lineTo(66, 74); x.lineTo(56, 102); x.lineTo(82, 58); x.lineTo(66, 58); x.closePath(); x.fill(); }) }));
  warn.position.set(0.45, 0.3, -0.014); warn.rotation.y = Math.PI; doorG.add(warn);
  doorG.rotation.y = -1.9;
  const inL = new THREE.PointLight(0xfff0dc, 3.5, 4, 2); inL.position.set(0.4, 2.1, 0.9); world.add(inL);
  // el seccionador: mordazas de cobre arriba, bisagras abajo, tres cuchillas y la palanca (gira sobre la bisagra)
  const copper = new THREE.MeshStandardMaterial({ color: 0xc8743c, roughness: 0.35, metalness: 0.85 }), ins = new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.6 });
  for (const x of PX) {
    bx(0.07, 0.08, 0.06, x, YJ + 0.02, ZB - 0.03, ins); bx(0.012, 0.09, 0.05, x - 0.022, YJ, ZB, copper); bx(0.012, 0.09, 0.05, x + 0.022, YJ, ZB, copper);
    bx(0.07, 0.08, 0.06, x, YH - 0.02, ZB - 0.03, ins); bx(0.05, 0.05, 0.05, x, YH, ZB, copper);
    bx(0.05, 0.06, 0.05, x, YT, ZB, copper);                          // borne de salida
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 10), M.chrome); bolt.rotation.x = Math.PI / 2; bolt.position.set(x, YT, ZB + 0.035); box.add(bolt);
  }
  blades = new THREE.Group(); blades.position.set(0, YH, ZB); world.add(blades);
  for (const x of PX) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, BL, 0.012), copper); b.position.set(x, BL / 2, 0); b.castShadow = true; blades.add(b); }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.56, 10), ins); rod.rotation.z = Math.PI / 2; rod.position.set(0, BL * 0.82, 0.03); blades.add(rod);
  const gripM = new THREE.MeshStandardMaterial({ color: 0xc8211a, roughness: 0.45, emissive: 0xc8211a, emissiveIntensity: 0.15 });
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 10), ins); arm.rotation.x = Math.PI / 2; arm.position.set(0.3, BL * 0.82, 0.12); blades.add(arm);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.16, 14), gripM); grip.rotation.z = Math.PI / 2; grip.position.set(0.36, BL * 0.82, 0.23); blades.add(grip);
  const hasp = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 8, 16), M.chrome); hasp.position.set(0.3, BL * 0.82, 0.2); hasp.rotation.y = Math.PI / 2; blades.add(hasp);
  blades.userData.gripM = gripM;
  // cables: las tres fases entran por arriba; la manguera sale por abajo hasta el tramo pelado del suelo
  const phM = [0x6b3a1e, 0x16171a, 0x8a8f96].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
  PX.forEach((x, i) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 10), phM[i]); between(t, V(x, YJ + 0.06, ZB - 0.03), V(x * 0.6, 4.2, ZB - 0.03)); world.add(t);
    const o = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1, 10), phM[i]); between(o, V(x, YT - 0.03, ZB - 0.02), V(x * 0.4, 0.95, ZB - 0.02)); world.add(o); });
  cableCurve = new THREE.CatmullRomCurve3([V(0, 0.95, 0.1), V(0.05, 0.4, 0.2), V(0.2, 0.05, 0.42), V(0.9, 0.04, 1.0), DMG.clone(), V(2.6, 0.04, 2.0), V(3.8, 0.04, 2.2)]);
  const cab = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 160, 0.032, 12), new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.55 })); cab.castShadow = true; world.add(cab);
  // el tramo pelado: cobre a la vista y hilos sueltos
  for (let i = 0; i < 9; i++) { const p = DMG.clone().add(V((rnd(i) - 0.5) * 0.12, 0.03 + rnd(i * 2) * 0.03, (rnd(i * 3) - 0.5) * 0.12)), q = p.clone().add(V((rnd(i * 5) - 0.5) * 0.22, 0.05 + rnd(i * 7) * 0.1, (rnd(i * 9) - 0.5) * 0.22)); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 5), copper); between(s, p, q); world.add(s); }
  const bare = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.22, 12), copper); bare.position.copy(DMG).add(V(0, 0.01, 0)); bare.rotation.z = Math.PI / 2; bare.rotation.y = -0.62; world.add(bare);
  dmgGlow = new THREE.PointLight(0x7fd8ff, 0, 3, 2); dmgGlow.position.copy(DMG).add(V(0, 0.25, 0)); world.add(dmgGlow);
  sparks = new Parts(60, { life: 0.6, rise: 0, acc: 0, size: 0.03, grow: 0.3, turb: 0.2, rot: 0, edge: 0.2, add: true, c: [[3, 6, 8], [2, 4, 6], [1.2, 2.2, 3.5], [0.2, 0.4, 0.8]], seed: 3, extent: [0.06, 0.02, 0.06], jet: true, v0: 2.6, drag: 3, grav: 2.4, spreadA: 0.9, spreadB: 0.3 });
  sparks.at(DMG.x, DMG.y + 0.05, DMG.z); sparks.u.uDir.value.set(0, 1, 0); world.add(sparks.mesh);
  // el pulso de corriente que corre por el cable y el arco hasta el guante
  pulse3 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), GLOW(0x8fe0ff, 3)); pulse3.visible = false; world.add(pulse3);
  arcPts = new Float32Array(16 * 3); const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.BufferAttribute(arcPts, 3));
  arcLine = new THREE.Line(ag, new THREE.LineBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); arcLine.frustumCulled = false; world.add(arcLine);
  // el guante en primera persona (gancho) y la mano fantasma que sube la palanca
  const gl = new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.7 }), sl = new THREE.MeshStandardMaterial({ color: 0x232c3e, roughness: 0.8 });
  pov = new THREE.Group(); world.add(pov);
  const fa = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.7, 14), sl); fa.rotation.x = Math.PI / 2; fa.position.z = 0.42; pov.add(fa);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.04, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xe0d96f, emissive: 0x6b6624 })); cuff.rotation.x = Math.PI / 2; cuff.position.z = 0.2; pov.add(cuff);
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.05, 0.13, 2, 0.02), gl); palm.position.z = 0.05; pov.add(palm);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.07, 4, 8), gl); f.rotation.x = Math.PI / 2 + 0.25; f.position.set(-0.04 + i * 0.027, -0.012, -0.06); pov.add(f); }
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.05, 4, 8), gl); th.rotation.set(Math.PI / 2, 0, 0.8); th.position.set(0.07, -0.005, 0.0); pov.add(th);
  pov.traverse(o => { if (o.isMesh) o.castShadow = true; });
  ghostM = new THREE.MeshBasicMaterial({ color: 0xff3b2e, transparent: true, opacity: 0, depthWrite: false, fog: false });
  ghostHand = new THREE.Group(); world.add(ghostHand);
  const gp = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.13, 0.06, 2, 0.025), ghostM); ghostHand.add(gp);
  const gfa = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.5, 12), ghostM); gfa.position.y = -0.3; ghostHand.add(gfa);
  // el candado y el cartel
  padlock = new THREE.Group(); world.add(padlock);
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.065, 0.03, 2, 0.01), new THREE.MeshStandardMaterial({ color: 0xc8211a, roughness: 0.4, metalness: 0.2 })); body.position.y = -0.04; padlock.add(body);
  const shk = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 8, 18, Math.PI), M.chrome); shk.position.y = -0.005; padlock.add(shk); padlock.userData.shk = shk;
  sign = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.112), new THREE.MeshStandardMaterial({ map: signTex(), color: 0xbdbdb8, roughness: 0.7, side: THREE.DoubleSide })); world.add(sign);
  // el detector de tensión (amarillo, con su luz)
  tester = new THREE.Group(); world.add(tester);
  const tb = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.2, 0.04, 2, 0.015), new THREE.MeshStandardMaterial({ color: 0xc9971a, roughness: 0.65 })); tb.position.y = 0.1; tester.add(tb);
  const tp = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.12, 8), M.chrome); tp.position.y = -0.06; tester.add(tp);
  testerLed = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), GLOW(0x3ef08a, 0.2)); testerLed.position.set(0, 0.17, 0.022); tester.add(testerLed);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.03), GLOW(0x10241a, 1)); scr.position.set(0, 0.12, 0.021); tester.add(scr);
  // las pinzas de puesta a tierra, la barra que las une (cortocircuito) y el cable a la pica
  const clM = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.5 }), gyTex = canvasTex(64, 64, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#e8c51a' : '#2f9a3a'; x.fillRect(0, i * 8, 64, 8); } });
  gyTex.wrapS = gyTex.wrapT = THREE.RepeatWrapping; gyTex.repeat.set(1, 6);
  const gyM = new THREE.MeshStandardMaterial({ map: gyTex, color: 0x9a9a9a, roughness: 0.6, emissive: 0x2f9a3a, emissiveIntensity: 0.05 });
  for (let i = 0; i < 3; i++) { const C = new THREE.Group(); const j = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.05, 0.08, 2, 0.01), clM); C.add(j); const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 8), M.chrome); sc.position.z = 0.08; sc.rotation.x = Math.PI / 2; C.add(sc); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 8), M.chrome); h.rotation.z = Math.PI / 2; h.position.z = 0.13; C.add(h); world.add(C); clamps.push(C); }
  linkBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 10), gyM); world.add(linkBar);
  earthCable = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 10), gyM); world.add(earthCable);
  stake = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 1, 10), copper); world.add(stake);
  // los conos y la cinta
  const coneM = new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.5, emissive: 0xff6a1a, emissiveIntensity: 0.12 }), whiteM = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.15 });
  for (const [x, z] of [[-1.35, 0.45], [-1.3, 2.55], [2.75, 2.6], [2.85, 0.45]]) { const C = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.62, 18), coneM); c.position.y = 0.33; C.add(c); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.125, 0.09, 18, 1, true), whiteM); b.position.y = 0.36; C.add(b); const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), M.black); base.position.y = 0.02; C.add(base); C.position.set(x, 0, z); C.traverse(o => { if (o.isMesh) o.castShadow = true; }); world.add(C); cones.push(C); }
  const tapeT = canvasTex(256, 16, (x) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#f2f2f2' : '#d4201a'; x.fillRect(i * 16, 0, 16, 16); } }); tapeT.wrapS = THREE.RepeatWrapping;
  for (let i = 0; i < 3; i++) { const tt = tapeT.clone(); tt.needsUpdate = true; const t = new THREE.Mesh(new THREE.BoxGeometry(0.006, 1, 0.11), new THREE.MeshStandardMaterial({ map: tt, roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.08, emissiveMap: tt })); world.add(t); tapes.push(t); }
  // la autobomba al fondo (luces) y el foco de trabajo
  truck = makeTruck(); truck.rotation.y = Math.PI * 0.85; truck.position.set(7.5, 0, 9); world.add(truck);
  truck.traverse(o => { if (o.isMesh) o.castShadow = true; }); beacons = truck.userData.lbar;
  const work = new THREE.SpotLight(0xfff2e0, 120, 30, 0.6, 0.6, 1.3); work.position.set(4.5, 4.2, 6.5); work.target.position.set(0.6, 1.0, 0.5);
  work.castShadow = true; work.shadow.mapSize.set(2048, 2048); work.shadow.bias = -0.0004; world.add(work, work.target);
  // el bombero, delante del cuadro (brazo derecho articulado)
  ff = makeFirefighter(); bottle.visible = true; stripArm(ff, 1); ff.position.set(-0.62, 0, 0.82); face(ff, V(0.55, 0, -1)); world.add(ff); ff.traverse(o => { if (o.isMesh) o.castShadow = true; });
  armR = mkArm();
}

// ------------------------------------------------------------------ tiempos y cámara
let T = {}, KEYS = null, KH = null;
const OPEN = 1.25;
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  T.g0 = T.alguien + 0.1; T.g1 = T.vuelve + 0.35;                 // la mano fantasma vuelve a dar la luz
  T.zap = T.mata - 0.02;                                          // el arco hasta el guante
  T.o0 = T.abres - 0.1; T.o1 = T.abres + 0.55;                    // regla 1: abre
  T.tt = [0, 1, 2].map(i => T.compruebas + 0.05 + i * Math.max(0.35, (T.tension + 0.4 - T.compruebas) / 3));   // regla 3: toca cada borne
  T.cl = [0, 1, 2].map(i => T.cuatro - 0.05 + i * 0.32);        // regla 4: cada pinza
  KEYS = camKeys(); KH = KEYS.map(k => [k[0], k[2]]);
}
function bladeAngle(t) {           // 0 = cerrado (hay luz); OPEN = abierto (corte visible)
  let a = OPEN;
  a = mx(a, 0, e3(pr(t, T.g0, T.g1 - T.g0)));
  a = mx(a, OPEN, e3(pr(t, T.o0, T.o1 - T.o0)));
  return a;
}
const live = t => (bladeAngle(t) < 0.3 && t > T.g1 - 0.05) ? 1 : 0;
const ANCH = { w: () => V(0, 0, 0) };
function camKeys() {
  const D = DMG;
  const K = [
    [0, 'w', [D.x + 0.85, 1.25, D.z + 1.75, D.x - 0.05, 0.05, D.z, 40]],             // el guante hacia el cable pelado
    [T.no1 + 0.2, 'w', [D.x + 0.75, 1.1, D.z + 1.55, D.x - 0.05, 0.05, D.z, 40]],
    [T.g0 + 0.25, 'w', [0.95, 1.9, 1.5, 0.08, 1.68, 0.1, 40]],                   // alguien la vuelve a dar
    [T.g1 + 0.1, 'w', [0.9, 1.88, 1.45, 0.08, 1.68, 0.1, 40]],
    [T.zap - 0.05, 'w', [D.x + 0.8, 1.15, D.z + 1.6, D.x - 0.05, 0.05, D.z, 40]],  // te mata
    [T.zap + 0.5, 'w', [D.x + 0.85, 1.2, D.z + 1.7, D.x - 0.05, 0.05, D.z, 40]],
    [T.reglas + 0.3, 'w', [2.3, 2.3, 4.4, 0.4, 1.25, 0.3, 46]],                  // cinco reglas de oro, en orden
    [T.uno + 0.1, 'w', [1.35, 1.95, 2.2, 0.08, 1.62, 0.2, 40]],                  // 1: abres…
    [T.corte + 0.1, 'w', [0.8, 1.85, 1.25, 0.0, 1.78, 0.18, 38]],                // …y que se vea el corte
    [T.bloqueas + 0.2, 'w', [0.95, 1.65, 1.35, 0.25, 1.55, 0.35, 38]],           // 2: candado y cartel
    [T.nadie + 0.4, 'w', [1.0, 1.68, 1.4, 0.25, 1.55, 0.35, 38]],
    [T.compruebas + 0.1, 'w', [0.7, 1.45, 1.1, 0.0, 1.3, 0.15, 38]],             // 3: sin tensión
    [T.tension + 0.3, 'w', [0.72, 1.48, 1.12, 0.0, 1.3, 0.15, 38]],
    [T.cuatro + 0.2, 'w', [1.1, 1.4, 1.75, 0.25, 1.0, 0.25, 42]],               // 4: a tierra… y algo más
    [T.olvidan + 0.3, 'w', [1.15, 1.45, 1.85, 0.25, 1.0, 0.25, 42]],
    [T.senalizas + 0.2, 'w', [0.75, 4.2, 8.4, 0.75, 1.75, 1.0, 50]],            // 5: la zona delimitada
    [T.zona + 0.4, 'w', [0.75, 4.4, 8.7, 0.75, 1.75, 1.0, 50]],
    [T.comenta + 0.3, 'w', [0.8, 4.6, 9.1, 0.75, 1.8, 1.0, 50]],
    [T.compartir + 0.6, 'w', [0.9, 6.0, 10.8, 0.75, 1.0, 1.2, 50]],
    [T.end, 'w', [0.9, 6.4, 11.6, 0.75, 1.2, 1.2, 50]],
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
  const v = hermite(KH, t);
  const sh = Math.exp(-Math.pow((t - T.zap - 0.05) / 0.12, 2)) * 0.03 + Math.exp(-Math.pow((t - T.o1) / 0.1, 2)) * 0.01;
  return pose(V(v[0] + sh * Math.sin(t * 91), v[1] + sh * Math.cos(t * 77), v[2]), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t (todo depende solo de t)
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
const terminal = i => V(PX[i], YT, ZB + 0.06);
function handTarget(t) {           // dónde va la mano derecha del bombero
  const rest = ff.localToWorld(V(0.34, 0.98, -0.08));
  blades.updateMatrixWorld(true);
  const grip = blades.localToWorld(V(0.36, BL * 0.82, 0.23)), hasp = blades.localToWorld(V(0.3, BL * 0.82, 0.2));
  const w = (a, b) => sm(a - 0.3, a, t) * (1 - sm(b, b + 0.35, t));
  let h = rest.clone(), k;
  if ((k = w(T.uno - 0.15, T.o1 + 0.2)) > 0) h.lerp(grip, k);
  if ((k = w(T.bloqueas - 0.2, T.nadie)) > 0) h.lerp(hasp.clone().add(V(0.02, -0.05, 0.06)), k);
  if ((k = w(T.tt[0] - 0.1, T.tt[2] + 0.5)) > 0) h.lerp(testerPos(t).add(V(0.0, 0.14, 0.03)), k);
  if ((k = w(T.cl[0] - 0.15, T.cl[2] + 0.55)) > 0) { const i = Math.min(2, Math.max(0, Math.floor((t - T.cl[0] + 0.1) / 0.32))); h.lerp(terminal(i).add(V(0.0, -0.02, 0.17)), k); }
  if ((k = w(T.tierra - 0.1, T.algo + 0.2)) > 0) h.lerp(STAKE.clone().add(V(0.0, 0.32, 0.08)), k * 0.85);
  return h;
}
function testerPos(t) {            // la punta del detector va de un borne a otro
  let i = 0; for (let k = 0; k < 3; k++) if (t >= T.tt[k] - 0.15) i = k;
  const tip = terminal(i).add(V(0, 0, 0.012)), prev = terminal(Math.max(0, i - 1)).add(V(0, 0, 0.012));
  const u = e3(pr(t, T.tt[i] - 0.15, 0.15));
  const p = prev.lerp(tip, u); p.z += 0.05 * Math.sin(Math.PI * u);
  return p.add(V(0, 0.12, 0));
}
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => { f.u.uCam.value.copy(cam.position); f.u.uTime.value = t; });
  world.userData.smoke.u.uTime.value = t;
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = 8 + 70 * on;
  // el seccionador
  const ang = bladeAngle(t); blades.rotation.x = ang;
  blades.userData.gripM.emissiveIntensity = 0.15 + 0.8 * pulse(t, T.abres + 0.1, 0.3);
  // la corriente: un pulso que corre por el cable; chispas en el tramo pelado mientras hay luz; el arco al guante
  const pk = pr(t, T.g1 - 0.05, T.zap - T.g1 + 0.05);
  pulse3.visible = pk > 0 && pk < 1; if (pulse3.visible) pulse3.position.copy(cableCurve.getPointAt(Math.min(1, pk * 0.62 + 0.0)));
  const lv = live(t), fl = lv * (0.5 + 0.5 * Math.sin(t * 37) * Math.sin(t * 13));
  sparks.mesh.visible = lv > 0; sparks.u.uTime.value = t; dmgGlow.intensity = 4 * fl + 10 * pulse(t, T.zap + 0.05, 0.12);
  const za = pulse(t, T.zap + 0.05, 0.14);
  arcLine.material.opacity = Math.min(1, za * 1.6);
  if (za > 0.01) {
    const a = DMG.clone().add(V(0, 0.05, 0)), b = pov.position.clone();
    for (let i = 0; i < 16; i++) { const u = i / 15, p = a.clone().lerp(b, u), j = Math.sin(Math.PI * u) * 0.06; p.add(V(Math.sin(t * 97 + i * 3.1) * j, Math.cos(t * 71 + i * 2.3) * j, Math.sin(t * 53 + i * 1.7) * j)); arcPts.set([p.x, p.y, p.z], i * 3); }
    arcLine.geometry.attributes.position.needsUpdate = true;
  }
  // el guante (primera persona): se acerca al cable… se para… y sale despedido con el arco
  const pa = sm(-0.2, 0.25, t) * (1 - sm(T.reglas - 0.4, T.reglas, t));
  pov.visible = pa > 0.01;
  if (pov.visible) {
    const reach = e3(pr(t, 0, T.no1 + 0.1)), back = 0.35 * sm(T.no1, T.no1 + 0.3, t), jerk = 0.6 * e3(pr(t, T.zap, 0.25));
    const p = DMG.clone().add(V(0.62, 0.36, -0.22)).lerp(DMG.clone().add(V(0.11, 0.13, 0.0)), reach * (1 - back) * (1 - jerk));
    p.y -= 0.35 * (1 - pa);
    pov.position.copy(p); pov.lookAt(p.clone().multiplyScalar(2).sub(DMG.clone().add(V(0, 0.05, 0))));
  }
  // la mano fantasma que sube la palanca
  const ga = sm(T.g0 - 0.25, T.g0, t) * (1 - sm(T.g1 + 0.2, T.g1 + 0.6, t));
  ghostHand.visible = ga > 0.01; ghostM.opacity = 0.45 * ga * (0.8 + 0.2 * Math.sin(t * 11));
  if (ghostHand.visible) { blades.updateMatrixWorld(true); ghostHand.position.copy(blades.localToWorld(V(0.36, BL * 0.82, 0.23))).add(V(0.02, -0.06, 0.05)); }
  // el candado y el cartel
  blades.updateMatrixWorld(true);
  const hasp = blades.localToWorld(V(0.3, BL * 0.82, 0.2)), pkk = bk(pr(t, T.candado - 0.2, 0.35));
  padlock.visible = pkk > 0.01; padlock.position.copy(hasp).add(V(0, 0, 0.02)); padlock.scale.setScalar(Math.max(0.001, pkk));
  padlock.userData.shk.position.y = -0.005 + 0.02 * (1 - sm(T.candado + 0.15, T.candado + 0.3, t));
  const tk = bk(pr(t, T.cartel - 0.15, 0.4)); sign.visible = tk > 0.01;
  blades.updateMatrixWorld(true); sign.position.copy(blades.localToWorld(V(0.46, BL * 0.82, 0.23))).add(V(0.02, -0.11, 0.0)); sign.scale.setScalar(Math.max(0.001, tk)); sign.rotation.set(-0.1, 0.25 + 0.06 * Math.sin(t * 2.3), 0.05 * Math.sin(t * 3.1));
  // el detector: toca cada borne; no pita (luz verde)
  const ta = sm(T.tt[0] - 0.45, T.tt[0] - 0.15, t) * (1 - sm(T.tt[2] + 0.5, T.tt[2] + 0.8, t));
  tester.visible = ta > 0.01;
  if (tester.visible) { tester.position.copy(testerPos(t)); tester.rotation.set(-0.35, 0.3, 0); testerLed.material.color.setRGB(0.15, 1.4 * (0.6 + 0.4 * Math.abs(Math.sin(t * 6))), 0.35); }
  // las pinzas a tierra, la barra que las une (cortocircuito) y la pica
  clamps.forEach((C, i) => { const k = e3(pr(t, T.cl[i] - 0.2, 0.3)); C.visible = k > 0.01; C.position.copy(terminal(i)).add(V(0, -0.02, 0.05 + (1 - k) * 0.35)); C.rotation.set(0, 0, 0); });
  const lk = sm(T.cl[2] + 0.1, T.cl[2] + 0.35, t);
  linkBar.visible = lk > 0.01; if (linkBar.visible) between(linkBar, terminal(0).add(V(0, -0.075, 0.18)), terminal(0).add(V(0, -0.075, 0.18)).lerp(terminal(2).add(V(0, -0.075, 0.18)), lk));
  const sk = e3(pr(t, T.tierra - 0.35, 0.4));
  stake.visible = sk > 0.01; if (stake.visible) between(stake, STAKE.clone().add(V(0, -0.2 * sk, 0)), STAKE.clone().add(V(0, 0.42 - 0.2 * sk + (1 - sk) * 0.5, 0)));
  const ek = sm(T.tierra - 0.05, T.tierra + 0.3, t);
  earthCable.visible = ek > 0.01; if (earthCable.visible) { const a = terminal(1).add(V(0, -0.075, 0.18)), b = STAKE.clone().add(V(0, 0.2, 0)); between(earthCable, a, a.clone().lerp(b, ek)); }
  for (const m of [linkBar, earthCable]) m.material.emissiveIntensity = 0.05 + 0.35 * pulse(t, T.algo + 0.3, 0.35);
  // los conos y la cinta
  cones.forEach((C, i) => { const k = bk(pr(t, T.cinco7 + 0.05 + 0.13 * i, 0.32)); C.visible = k > 0.01; C.scale.setScalar(Math.max(0.001, k)); });
  [[0, 1], [1, 2], [2, 3]].forEach(([a, b], i) => {
    const k = e3(pr(t, T.senalizas + 0.1 + 0.2 * i, 0.4)), A = cones[a].position.clone().add(V(0, 0.62, 0)), B = cones[b].position.clone().add(V(0, 0.62, 0));
    tapes[i].visible = k > 0.01; if (tapes[i].visible) { const e = A.clone().lerp(B, k); between(tapes[i], A, e); tapes[i].material.map.repeat.set(1, 1); tapes[i].material.map.repeat.y = A.distanceTo(e) * 3; }
  });
  // el bombero: el brazo derecho hace cada regla
  ff.updateMatrixWorld(true);
  armTo(armR, ff.localToWorld(V(0.3, 1.45, 0)), handTarget(t), V(0.6, -0.6, 0.6));
}

// ------------------------------------------------------------------ capa 2D: las cinco monedas, rótulos y la pregunta
const COIN = [['ABRIR', 'abres'], ['BLOQUEAR', 'bloqueas'], ['VERIFICAR', 'compruebas'], ['A TIERRA', 'tierra'], ['DELIMITAR', 'senalizas']];
function coins(t) {
  const a = sm(T.cinco - 0.1, T.cinco + 0.15, t) * (1 - sm(T.compartir - 0.4, T.compartir - 0.1, t));
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = a;
  COIN.forEach(([verb, key], i) => {
    const x = 140 + i * 200, y = 600, pop = bk(pr(t, T.cinco + 0.08 * i, 0.3)); if (pop <= 0) return;
    const f = sm(T[key] - 0.08, T[key] + 0.12, t), kick = 1 + 0.3 * pulse(t, T[key] + 0.12, 0.16);
    g.save(); g.translate(x, y); g.scale(pop * kick, pop * kick);
    g.beginPath(); g.arc(0, 0, 56, 0, 7); g.fillStyle = f > 0.5 ? '#E8A916' : 'rgba(8,10,14,0.86)'; g.fill();
    g.lineWidth = 6; g.strokeStyle = f > 0.5 ? '#FFE08A' : 'rgba(255,200,61,0.55)'; g.stroke();
    if (f > 0.5) { g.shadowColor = GOLD2; g.shadowBlur = 30; }
    txt(String(i + 1), 0, 30, 84, f > 0.5 ? '#3a2600' : 'rgba(255,200,61,0.75)', 400, 'center', 'Bebas'); g.shadowBlur = 0;
    g.restore();
    if (f > 0.02) {
      g.save(); g.globalAlpha = a * f; txt(verb, x, y + 102, verb.length > 8 ? 32 : 36, '#F4F6F8', 400, 'center', 'Bebas');
      if (i === 3) { const q = 1 + 0.25 * Math.max(0, Math.sin((t - T.algo) * 7)) * sm(T.algo - 0.1, T.algo + 0.1, t); g.save(); g.translate(x + 62, y - 40); g.scale(q, q); g.beginPath(); g.arc(0, 0, 26, 0, 7); g.fillStyle = RED2; g.fill(); txt('?', 0, 14, 40, '#fff', 400, 'center', 'Bebas'); g.restore(); }
      g.restore();
    }
  });
  const oa = sm(T.orden - 0.1, T.orden + 0.15, t) * (1 - sm(T.uno + 0.6, T.uno + 0.9, t));
  if (oa > 0.01) { g.save(); g.globalAlpha = a * oa; g.strokeStyle = GOLD2; g.fillStyle = GOLD2; g.lineWidth = 6; const k = e3(pr(t, T.orden - 0.1, 0.6)); g.beginPath(); g.moveTo(90, 735); g.lineTo(90 + 880 * k, 735); g.stroke(); g.beginPath(); g.moveTo(90 + 880 * k + 10, 735); g.lineTo(90 + 880 * k - 18, 721); g.lineTo(90 + 880 * k - 18, 749); g.closePath(); g.fill(); txt('EN ORDEN', 540, 785, 40, GOLD2, 400, 'center', 'Bebas'); g.restore(); }
  g.restore();
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const win = (t0, t1) => sm(t0 - 0.12, t0 + 0.08, t) * (1 - sm(t1 - 0.2, t1, t));
  // el gancho
  stamp('¡NO!', 1300, RED2, Math.exp(-Math.pow((t - T.no1 - 0.45) / 0.5, 4)), 200, -0.05);
  label(540, 1480, 'ALGUIEN LA VUELVE A DAR', RED2, win(T.alguien, T.zap - 0.1), { px: 56, icon: 'warn' });
  stamp('TE MATA', 1300, RED2, Math.exp(-Math.pow((t - T.zap - 0.5) / 0.55, 4)), 170, -0.05);
  coins(t);
  // 1: el corte que se ve
  blades.updateMatrixWorld(true);
  const tipW = blades.localToWorld(V(0, BL, 0)), jawW = V(0, YJ - 0.04, ZB);
  const ca = win(T.vea, T.dos - 0.1);
  if (ca > 0.01) {
    const p0 = proj(jawW), p1 = proj(tipW);
    g.save(); g.globalAlpha = ca; g.strokeStyle = GREEN2; g.lineWidth = 6; g.setLineDash([14, 10]); g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke(); g.setLineDash([]); g.restore();
    label(560, 1450, 'CORTE VISIBLE', GREEN2, ca, { px: 62, icon: 'ok', s: 1 + 0.12 * pulse(t, T.vea + 0.15, 0.2) });
  }
  // 2: candado y cartel
  tag(padlock.position.clone(), 'CANDADO', GOLD2, win(T.candado, T.nadie + 0.5) * (padlock.visible ? 1 : 0), 0, 0, { px: 52, at: [300, 1390] });
  tag(sign.position.clone().add(V(0, -0.05, 0)), 'CARTEL', '#F4F6F8', win(T.cartel, T.nadie + 0.5) * (sign.visible ? 1 : 0), 0, 0, { px: 52, sub: '«no conectar»', at: [790, 1480] });
  // 3: sin tensión
  label(540, 1480, '0 V · SIN TENSIÓN', GREEN2, win(T.tension - 0.1, T.cuatro - 0.1), { px: 60, icon: 'ok', s: 1 + 0.12 * pulse(t, T.tension + 0.1, 0.2) });
  // 4: a tierra… y algo más
  tag(STAKE.clone().add(V(0, 0.15, 0)), 'A TIERRA', GREEN2, win(T.tierra, T.cinco7 - 0.1) * (stake.visible ? 1 : 0), 0, 0, { px: 56, at: [800, 1480] });
  tag(terminal(1).add(V(0.1, -0.075, 0.18)), '¿Y…?', RED2, win(T.algo, T.cinco7 - 0.1) * (linkBar.visible ? 1 : 0), 0, 0, { px: 66, at: [300, 1300] });
  // 5: la zona
  label(540, 1500, 'ZONA DELIMITADA', ORANGE2, win(T.delimitas, T.falta - 0.1), { px: 60, icon: 'ok' });
  // la pregunta
  const out = 1 - sm(T.compartir - 0.4, T.compartir - 0.1, t), qa = sm(T.falta - 0.1, T.falta + 0.15, t) * out;
  if (qa > 0.005) {
    g.save(); g.globalAlpha = qa; g.translate(540, 1080);
    rr(-460, -150, 920, 300, 40); g.fillStyle = 'rgba(8,10,14,0.92)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('¿QUÉ LE FALTA A LA 4.ª?', 0, -62, 64, '#F4F6F8', 400, 'center', 'Bebas');
    g.font = '400 82px Bebas'; const s1 = '«A TIERRA Y ', w1 = g.measureText(s1).width, bw = 230, x0 = -(w1 + bw + 30) / 2;
    txt(s1, x0, 62, 82, GOLD2, 400, 'left', 'Bebas');
    const k = 1 + 0.06 * Math.sin(t * 6); g.save(); g.translate(x0 + w1 + bw / 2, 36); g.scale(k, k); rr(-bw / 2, -44, bw, 88, 16); g.setLineDash([12, 9]); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke(); g.setLineDash([]); txt('?', 0, 26, 76, RED2, 400, 'center', 'Bebas'); g.restore();
    txt('»', x0 + w1 + bw + 12, 62, 82, GOLD2, 400, 'left', 'Bebas');
    g.restore();
  }
  const ce = sm(T.comenta - 0.15, T.comenta + 0.15, t) * out;
  if (ce > 0) { const b = 1 + 0.05 * Math.max(0, Math.sin((t - T.comenta) * 6)); g.save(); g.globalAlpha = ce; g.translate(540, 1320); g.scale(b, b); rr(-250, -54, 500, 108, 54); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke(); txt('💬  COMENTA', 0, 20, 58, '#F2F5F8', 400, 'center', 'Bebas'); g.restore(); }
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
  const fz = Math.exp(-Math.pow((t - T.zap - 0.05) / 0.09, 2)) * 0.3, fg = Math.exp(-Math.pow((t - T.g1) / 0.08, 2)) * 0.12;
  finMat.uniforms.uFlash.value = Math.max(fz, fg); finMat.uniforms.uFlashCol.value.setRGB(fz > fg ? 1 : 0.6, fz > fg ? 0.25 : 0.85, fz > fg ? 0.2 : 1);
  finMat.uniforms.uDim.value = mx(1, 0.72, sm(T.falta - 0.1, T.falta + 0.3, t) * (1 - sm(T.compartir - 0.3, T.compartir, t))) * mx(1, 0.75, sm(T.compartir - 0.2, T.compartir + 0.3, t)) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  await overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 2.6);

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
  } catch (e) { window.failed = 'oro: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
