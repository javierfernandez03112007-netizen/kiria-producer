// «¿Qué te salva ANTES del golpe?» — seguridad activa y pasiva del vehículo (Bomberados, Pregunta del día cinematográfica;
// pregunta de Adrián, examen del Ayto. de Marbella 2023). Con las reglas de Javi (10 nov): gancho que alarma (¡FRENA!: un coche
// accidentado en tu carril bajo la lluvia), cuenta de 5 s, «¡Tiempo!» con la trampa (la B, «pasiva») y un DRON que no para con
// planos abiertos. Tu coche frena a cámara lenta (la lluvia casi quieta) y se para justo al decir «luces» (seguridad ACTIVA, con
// «rayos X» de frenos/ABS, ESP, neumáticos, dirección, suspensión y luces); el accidentado, en «rayos X», repite el golpe
// (seguridad PASIVA: cinturón, airbags, reposacabezas, deformación programada y habitáculo); llega la autobomba y un bombero con
// la cizalla junto al airbag de cortina que no ha saltado. Motor de projects/bomberados_mangueras/web/mangueras.js.
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





// ================================================================== el mundo: autovía de noche bajo la lluvia
const world = new THREE.Group(); scene.add(world);
const V0 = 25;                                   // 90 km/h
const LX = 1.75;                                 // tu carril (centro); se circula hacia −z
const CR = { x: 1.25, z: -8.0, th: 140 * Math.PI / 180 };     // coche accidentado: cruzado, el morro (destrozado) hacia la mediana
const STOP_Z = -2.65;                            // centro de tu coche parado: el morro a ≈ 1 m del otro
const TRUCK_X = -1.85, TRUCK_Z = 9.5;
const R = z => z - STOP_Z;                       // z absoluta → relativa a tu coche (claves de cámara)
const BLUE2 = '#3FB6FF', RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D';

const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
const XR_V = `varying vec3 vN; varying vec3 vV; varying vec3 vO;
void main(){ vO = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;
const XR_F = `uniform float uI, uXmin; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; varying vec3 vO;
void main(){ if (vO.x < uXmin) discard; float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0); gl_FragColor = vec4(uCol * (0.012 + 0.9 * f) * uI, 1.0); }`;
function xrMat(u) { return new THREE.ShaderMaterial({ uniforms: u, vertexShader: XR_V, fragmentShader: XR_F, transparent: true, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }); }
function rodBetween(a, b, r, mat, parent) {
  const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); parent.add(m); return m;
}
function capBetween(a, b, r, mat, parent) {
  const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, d.length()), 6, 12), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.castShadow = true; parent.add(m); return m;
}

// ------------------------------------------------------------------ el coche (perfil extruido, ruedas que giran y viran, interior y «rayos X»)
function bodyShape() {                    // perfil lateral de la carrocería hasta la línea de cintura (x adelante, y arriba)
  const s = new THREE.Shape();
  s.moveTo(-2.18, 0.30); s.lineTo(-1.80, 0.30);
  s.absarc(-1.36, 0.33, 0.44, Math.PI, 0, true);
  s.lineTo(0.92, 0.30);
  s.absarc(1.36, 0.33, 0.44, Math.PI, 0, true);
  s.lineTo(2.18, 0.30);
  s.bezierCurveTo(2.26, 0.36, 2.27, 0.58, 2.22, 0.68);
  s.lineTo(2.02, 0.82); s.lineTo(1.12, 0.98); s.lineTo(-1.80, 1.0);
  s.bezierCurveTo(-2.12, 0.98, -2.22, 0.9, -2.24, 0.78);
  s.lineTo(-2.25, 0.45); s.closePath();
  return s;
}
function cabinShape() {
  const s = new THREE.Shape();
  s.moveTo(1.10, 0.97); s.bezierCurveTo(0.8, 1.18, 0.55, 1.36, 0.3, 1.41);
  s.lineTo(-0.85, 1.42); s.bezierCurveTo(-1.25, 1.38, -1.55, 1.2, -1.82, 0.99); s.closePath();
  return s;
}
function extrude(shape, depth, bev) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: depth - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.8, bevelSegments: 3, curveSegments: 20 });
  geo.translate(0, 0, -(depth - 2 * bev) / 2); geo.computeVertexNormals(); return geo;
}
function taper(geo, cab) {             // menos «caja»: cabina que se estrecha arriba, hombros redondos y morro/cola más estrechos
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let k = cab ? 1 - 0.16 * cl((y - 0.97) / 0.45) : 1 - 0.05 * sm(0.78, 1.02, y) - 0.04 * sm(0.45, 0.3, y);
    k *= 1 - 0.07 * sm(1.55, 2.3, x) - 0.05 * sm(-1.6, -2.3, x);
    p.setZ(i, z * k);
  }
  geo.computeVertexNormals(); return geo;
}
function makeCar(o) {
  const C = new THREE.Group();                         // eje local: +X adelante, +Z a la derecha; suelo en y = 0
  const body = new THREE.Group(); C.add(body);        // carrocería (cabecea); las ruedas, fuera
  const paint = new THREE.MeshPhysicalMaterial({ color: o.color, roughness: 0.3, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, envMapIntensity: 0.45 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a0f15, roughness: 0.04, metalness: 0.55, clearcoat: 1, transparent: true, opacity: 0.86 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.55, transparent: true });
  const xu = { uI: { value: 0 }, uXmin: { value: -99 }, uCol: { value: new THREE.Color(o.xcol ?? 0x7fd8ff) } };
  const X = [];
  const part = (geo, mat, parent = body) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; parent.add(m);
    const tw = new THREE.Mesh(geo, xrMat(xu)); tw.renderOrder = 16; tw.visible = false; m.add(tw); X.push(m); return m; };
  const lowG = taper(extrude(bodyShape(), 1.82, 0.09), false);
  const low = part(lowG, paint);
  part(taper(extrude(cabinShape(), 1.68, 0.06), true), glass);
  part(new RoundedBoxGeometry(1.24, 0.05, 1.42, 2, 0.02), paint).position.set(-0.27, 1.435, 0);
  for (const s of [-1, 1]) {
    for (const [a, b] of [[V(1.10, 0.98, s * 0.8), V(0.31, 1.41, s * 0.71)], [V(-0.22, 0.99, s * 0.83), V(-0.22, 1.42, s * 0.71)], [V(-1.80, 1.0, s * 0.79), V(-0.86, 1.42, s * 0.71)]]) {
      const d = b.clone().sub(a), m = part(new THREE.BoxGeometry(0.075, d.length(), 0.05), paint);
      m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    }
  }
  // luces
  const L = { head: [], tail: [], ind: [], brake: null };
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.11, 0.4, 2, 0.03), GLOW(0xfff2dc, 3.0)); h.position.set(2.265, 0.7, s * 0.56); h.rotation.z = -0.5; body.add(h); L.head.push(h);
    const tl = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.11, 0.42, 2, 0.03), GLOW(0xff1a10, 0.5)); tl.position.set(-2.285, 0.84, s * 0.56); body.add(tl); L.tail.push(tl);
    for (const [x, y] of [[2.27, 0.56], [-2.3, 0.62]]) { const ind = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.14), GLOW(0xff8a10, 0.12)); ind.position.set(x, y, s * 0.74); body.add(ind); L.ind.push(ind); }
    const mi = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.11, 0.2, 2, 0.03), paint); mi.position.set(0.92, 1.04, s * 0.99); body.add(mi);
  }
  L.brake = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.42), GLOW(0xff1a10, 0.15)); L.brake.position.set(-1.69, 1.07, 0); body.add(L.brake);
  const plate = new THREE.MeshStandardMaterial({ color: 0xe8e8e0, roughness: 0.5 });
  for (const x of [2.335, -2.335]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.52), plate); p.position.set(x, 0.44, 0); body.add(p); }
  const gr = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.9), trim); gr.position.set(2.31, 0.58, 0); body.add(gr);
  // interior: salpicadero, asientos con reposacabezas, conductor con cinturón, airbags
  const seatM = new THREE.MeshStandardMaterial({ color: 0x1d1f25, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc89878, roughness: 0.6 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.85 });
  const I = { heads: [] };
  const dash = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.26, 1.5, 2, 0.06), seatM); dash.position.set(0.84, 0.9, 0); body.add(dash);
  for (const z of [-0.4, 0.4]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.12, 0.5, 2, 0.04), seatM); b.position.set(-0.12, 0.56, z); body.add(b);
    const bk = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.62, 0.5, 2, 0.04), seatM); bk.position.set(-0.46, 0.9, z); bk.rotation.z = 0.2; body.add(bk);
    const hr = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.18, 0.28, 2, 0.04), new THREE.MeshStandardMaterial({ color: 0x1d1f25, roughness: 0.8, emissive: 0x000000 }));
    hr.position.set(-0.58, 1.29, z); body.add(hr); I.heads.push(hr);
  }
  const drv = new THREE.Group(); drv.position.set(0, 0, -0.4); body.add(drv); I.drv = drv;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.3, 6, 12), cloth); torso.position.set(-0.25, 0.92, 0); torso.rotation.z = 0.2; drv.add(torso);
  I.head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 14), skin); I.head.position.set(-0.33, 1.25, 0); drv.add(I.head);
  for (const s of [-1, 1]) {
    capBetween(V(-0.14, 0.64, s * 0.1), V(0.28, 0.66, s * 0.1), 0.07, cloth, drv);
    capBetween(V(0.3, 0.64, s * 0.1), V(0.42, 0.3, s * 0.1), 0.055, cloth, drv);
    capBetween(V(-0.2, 1.1, s * 0.17), V(0.1, 0.96, s * 0.19), 0.05, cloth, drv);
    capBetween(V(0.1, 0.96, s * 0.19), V(0.42, 1.0, s * 0.13), 0.042, skin, drv);
  }
  const swg = new THREE.Group(); swg.position.set(0.5, 0.99, -0.4); swg.rotation.z = 0.35; body.add(swg);
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 10, 36), seatM); sw.rotation.y = Math.PI / 2; swg.add(sw); I.sw = swg;
  I.beltM = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6, emissive: 0x000000 });
  const belt = (pts) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.017, 6), I.beltM); body.add(m); return m; };
  belt([V(-0.3, 1.3, -0.7), V(-0.12, 1.12, -0.55), V(-0.06, 0.92, -0.4), V(-0.08, 0.72, -0.24), V(-0.12, 0.62, -0.15)]);
  belt([V(-0.12, 0.62, -0.15), V(-0.02, 0.68, -0.4), V(-0.16, 0.6, -0.66)]);
  const bagM = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.7, emissive: 0x000000 });
  I.bagD = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 16), bagM); I.bagD.position.set(0.24, 1.02, -0.4); body.add(I.bagD);
  I.bagP = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), bagM); I.bagP.position.set(0.46, 1.06, 0.4); body.add(I.bagP);
  I.bagM = bagM;
  I.curtM = new THREE.MeshStandardMaterial({ color: 0x5a1410, roughness: 0.6, emissive: 0x000000 });
  I.curtain = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 1.95, 6, 12), I.curtM); I.curtain.rotation.z = Math.PI / 2; I.curtain.position.set(-0.32, 1.36, -0.66); body.add(I.curtain);
  // mecánica (se ve con los «rayos X»): motor, unidad ABS/ESP con sus tubos, cremallera de dirección y muelles
  const mech = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, metalness: 0.6 });
  const eng = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.42, 0.7, 2, 0.05), mech); eng.position.set(1.6, 0.62, 0.12); body.add(eng);
  I.unitM = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.4, metalness: 0.7, emissive: 0x000000 });
  const unit = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.16, 0.24, 2, 0.03), I.unitM); unit.position.set(1.62, 0.78, -0.5); body.add(unit); I.unit = unit;
  I.lineM = new THREE.MeshStandardMaterial({ color: 0x40444c, roughness: 0.5, emissive: 0x000000 });
  for (const [x, z] of [[1.36, -0.66], [1.36, 0.66], [-1.36, -0.66], [-1.36, 0.66]]) {
    const pts = [V(1.62, 0.74, -0.5), V(mx(1.62, x, 0.5), 0.42, mx(-0.5, z, 0.5) + (x < 0 ? 0 : 0)), V(x, 0.36, z)];
    body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 6), I.lineM));
  }
  I.rackM = new THREE.MeshStandardMaterial({ color: 0x4a4e56, roughness: 0.45, metalness: 0.7, emissive: 0x000000 });
  rodBetween(V(1.22, 0.4, -0.56), V(1.22, 0.4, 0.56), 0.035, I.rackM, C);
  for (const s of [-1, 1]) rodBetween(V(1.22, 0.4, s * 0.56), V(1.26, 0.36, s * 0.72), 0.018, I.rackM, C);
  I.springM = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.35, metalness: 0.8, emissive: 0x000000 });
  const helix = new THREE.Curve(); helix.getPoint = (u, tgt = new THREE.Vector3()) => tgt.set(Math.cos(u * Math.PI * 2 * 5) * 0.07, u, Math.sin(u * Math.PI * 2 * 5) * 0.07);
  const springG = new THREE.TubeGeometry(helix, 160, 0.011, 6);
  I.springs = [];
  for (const [x, z] of [[1.36, -0.6], [1.36, 0.6], [-1.36, -0.6], [-1.36, 0.6]]) {
    const sp = new THREE.Mesh(springG, I.springM); sp.position.set(x, 0.46, z); sp.scale.set(1, 0.42, 1); C.add(sp); I.springs.push(sp);
  }
  // ruedas: neumático, llanta de 5 radios, disco de freno (se pone al rojo) y pinza
  const W = [];
  const tireG = new THREE.CylinderGeometry(0.33, 0.33, 0.23, 40, 1, true); tireG.rotateX(Math.PI / 2);
  const sideG = new THREE.RingGeometry(0.212, 0.33, 40);
  const barrel = new THREE.CylinderGeometry(0.215, 0.215, 0.232, 28, 1, true); barrel.rotateX(Math.PI / 2);
  const discG = new THREE.CylinderGeometry(0.17, 0.17, 0.022, 32); discG.rotateX(Math.PI / 2);
  const alloy = new THREE.MeshStandardMaterial({ color: 0x9a9ea5, metalness: 0.9, roughness: 0.28 });
  const discM = new THREE.MeshStandardMaterial({ color: 0x5a5d63, metalness: 0.8, roughness: 0.35, emissive: 0xff3a08, emissiveIntensity: 0 });
  const tireM = new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.7, emissive: 0x1c6cff, emissiveIntensity: 0 });
  const calM = new THREE.MeshStandardMaterial({ color: 0xc8231b, roughness: 0.4, emissive: 0x000000 });
  for (const [x, z] of [[1.36, -0.8], [1.36, 0.8], [-1.36, -0.8], [-1.36, 0.8]]) {
    const s = Math.sign(z);
    const piv = new THREE.Group(); piv.position.set(x, 0.33, z); C.add(piv);
    const steer = new THREE.Group(); piv.add(steer);
    const spin = new THREE.Group(); steer.add(spin);
    const tire = new THREE.Mesh(tireG, tireM); tire.castShadow = true; spin.add(tire);
    for (const k of [-1, 1]) { const sd = new THREE.Mesh(sideG, tireM); sd.position.z = k * 0.115; sd.rotation.y = k > 0 ? 0 : Math.PI; spin.add(sd); }
    spin.add(new THREE.Mesh(barrel, M.black));
    const back = new THREE.Mesh(new THREE.CircleGeometry(0.215, 28), M.black); back.position.z = -s * 0.04; back.rotation.y = s > 0 ? 0 : Math.PI; spin.add(back);
    const disc = new THREE.Mesh(discG, discM); disc.position.z = s * 0.05; spin.add(disc);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), alloy); hub.rotation.x = Math.PI / 2; hub.position.z = s * 0.112; spin.add(hub);
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2, sp = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.032, 0.018), alloy);
      sp.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, s * 0.11); sp.rotation.z = a; spin.add(sp);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.014, 6, 32), alloy); ring.position.z = s * 0.112; spin.add(ring);
    const cal = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.07, 0.06, 2, 0.015), calM); cal.position.set(-0.07, 0.12, s * 0.07); cal.rotation.z = 0.5; steer.add(cal);
    W.push({ piv, steer, spin, front: x > 0, s });
  }
  C.userData = { body, L, I, W, X, xu, paint, glass, trim, lowG, low, discM, tireM, calM };
  return C;
}
function setXray(car, k) {          // la carrocería se vuelve de cristal y se ven las piezas de dentro
  const u = car.userData; u.xu.uI.value = k * 0.42;
  u.X.forEach(m => { m.children[0].visible = k > 0.01; });
  u.paint.opacity = 1 - 0.9 * k; u.paint.depthWrite = k < 0.5;
  u.glass.opacity = 0.86 * (1 - 0.85 * k); u.trim.opacity = 1 - 0.9 * k;
}

// la carrocería del accidentado: el morro arrugado (deformación programada); k = 0 intacto … 1 aplastado
function crushData(geo) {
  const p = geo.attributes.position, base = Float32Array.from(p.array), crushed = Float32Array.from(p.array);
  for (let i = 0; i < p.count; i++) {
    const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
    if (x <= 0.75) continue;
    const u = (x - 0.75) / 1.55, left = cl(-z / 0.9);
    crushed[i * 3] = 0.75 + (x - 0.75) * (0.5 - 0.16 * left) + 0.05 * Math.sin(y * 31 + z * 17) * u;
    crushed[i * 3 + 1] = y + u * (0.07 * Math.sin(z * 9 + x * 13) + (y > 0.7 ? 0.11 : 0.02));
    crushed[i * 3 + 2] = z * (1 - 0.05 * u) + 0.05 * u * Math.sin(x * 23 + y * 11);
  }
  return { p, base, crushed, k: -1 };
}
function setCrush(cd, geo, k) {
  if (Math.abs(cd.k - k) < 1e-4) return; cd.k = k;
  for (let i = 0; i < cd.base.length; i++) cd.p.array[i] = cd.base[i] + (cd.crushed[i] - cd.base[i]) * k;
  cd.p.needsUpdate = true; geo.computeVertexNormals();
}

// ------------------------------------------------------------------ lluvia (gotas como trazos; congeladas en la cámara lenta)
const RAIN_V = `attribute vec4 aSeed;
uniform float uTau, uSpeed, uLen, uW; uniform vec3 uBoxC, uBox, uHP, uHD; uniform float uHI;
varying float vA; varying vec2 vUv;
void main(){
  vec3 bmin = uBoxC - uBox * 0.5, p;
  p.x = bmin.x + mod(aSeed.x * 997.0 - bmin.x, uBox.x);
  p.z = bmin.z + mod(aSeed.z * 991.0 - bmin.z, uBox.z);
  p.y = bmin.y + mod(aSeed.y * 983.0 - uTau * uSpeed * (0.85 + 0.3 * aSeed.w) - bmin.y, uBox.y);
  vec4 c0 = viewMatrix * vec4(p, 1.0), c1 = viewMatrix * vec4(p + vec3(0.0, uLen, 0.0), 1.0);
  vec3 d = c1.xyz - c0.xyz; vec3 side = normalize(vec3(d.y, -d.x, 0.0) + vec3(1e-5, 0.0, 0.0));     // así el trazo queda de cara (si no, se descarta)
  vec3 q = mix(c0.xyz, c1.xyz, position.y + 0.5) + side * position.x * uW;
  gl_Position = projectionMatrix * vec4(q, 1.0);
  vec3 lp = p - uHP; float dl = length(lp); float cone = smoothstep(0.82, 0.97, dot(lp / max(dl, 1e-3), uHD));
  vA = (0.1 + uHI * cone * 1.1 / (1.0 + 0.02 * dl * dl)) * (1.0 - smoothstep(6.0, 42.0, -c0.z)) * smoothstep(0.4, 1.6, -c0.z) * step(0.0, p.y);
  vUv = position.xy + 0.5;
}`;
const RAIN_F = `uniform float uI; varying float vA; varying vec2 vUv;
void main(){ float a = vA * uI * (1.0 - abs(vUv.x - 0.5) * 2.0) * smoothstep(0.0, 0.5, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y)); if (a < 0.002) discard; gl_FragColor = vec4(vec3(0.62, 0.74, 0.95) * a, a); }`;
function makeRain(n) {
  const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
  g.index = base.index; g.setAttribute('position', base.getAttribute('position'));
  const s = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) s[i] = rnd(i * 1.37 + 11.1);
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(s, 4)); g.instanceCount = n;
  const u = { uTau: { value: 0 }, uSpeed: { value: 9 }, uLen: { value: 0.3 }, uW: { value: 0.009 }, uBoxC: { value: V(0, 0, 0) }, uBox: { value: V(16, 14, 24) },
    uHP: { value: V(0, 0, 0) }, uHD: { value: V(0, 0, -1) }, uHI: { value: 1 }, uI: { value: 1 } };
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: u, vertexShader: RAIN_V, fragmentShader: RAIN_F, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
  m.frustumCulled = false; m.renderOrder = 18; return { m, u };
}

// haz de los faros (cono aditivo, se ve con la lluvia)
const BEAM_V = `varying float vD; varying vec3 vN; varying vec3 vV;
void main(){ vD = position.x; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;
const BEAM_F = `uniform float uI, uLen; varying float vD; varying vec3 vN; varying vec3 vV;
void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 1.5); float a = uI * f * (1.0 - smoothstep(0.0, uLen, vD)) * smoothstep(0.0, 0.6, vD); if (a < 0.002) discard; gl_FragColor = vec4(vec3(1.0, 0.95, 0.85) * a, a); }`;
function makeBeam(len, rad) {
  const geo = new THREE.ConeGeometry(rad, len, 32, 1, true); geo.rotateZ(Math.PI / 2); geo.translate(len / 2, 0, 0);
  const u = { uI: { value: 0.05 }, uLen: { value: len } };
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: BEAM_V, fragmentShader: BEAM_F, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
  m.renderOrder = 17; m.frustumCulled = false; return { m, u };
}
// reflejo de una luz en el asfalto mojado: una estela que va de la luz hacia la cámara
const REF_F = `uniform vec3 uCol; uniform float uI; varying vec2 vUv;
void main(){ float a = uI * pow(1.0 - vUv.y, 1.6) * (1.0 - smoothstep(0.0, 0.5, abs(vUv.x - 0.5))) * smoothstep(0.0, 0.08, vUv.y); if (a < 0.002) discard; gl_FragColor = vec4(uCol * a, a); }`;
const REFL = [];
function addRefl(get, col, w, len) {
  const u = { uCol: { value: new THREE.Color(col) }, uI: { value: 0 } };
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, 0.5);
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: 'varying vec2 vUv; void main(){ vUv = vec2(uv.x, 1.0 - uv.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: REF_F, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
  m.renderOrder = 9; m.frustumCulled = false; world.add(m); REFL.push({ m, u, get, w, len }); return u;
}
const _wp = new THREE.Vector3();
function updRefl() {
  for (const r of REFL) {
    const [p, i] = r.get(); if (!p || i <= 0.001) { r.m.visible = false; continue; }
    const dx = cam.position.x - p.x, dz = cam.position.z - p.z, a = Math.atan2(dx, dz);
    const elev = Math.atan2(cam.position.y, Math.hypot(dx, dz)), graze = 1 - sm(0.22, 0.6, elev);
    if (graze <= 0.01) { r.m.visible = false; continue; }
    r.m.visible = true; r.u.uI.value = i * graze;
    r.m.position.set(p.x, 0.012, p.z); r.m.rotation.set(0, a, 0);
    const dist = Math.hypot(dx, dz);
    r.m.scale.set(r.w, 1, Math.min(r.len, dist * 0.5) * (0.6 + 0.4 * cl(p.y / 1.2)));
  }
}

// ------------------------------------------------------------------ la autovía
let me, crash, crashCD, truck, beacons = [], ffs = [], rain, sprays = [], steam, beams = [], spots = [], hazL, myHazL, cutter, cageU, zoneTw, roadMat;
function buildWorld() {
  world.add(new THREE.HemisphereLight(0x2a3a58, 0x060504, 0.42));
  const moon = new THREE.DirectionalLight(0x8fa6d8, 0.22); moon.position.set(-18, 40, 10); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -16, right: 16, top: 22, bottom: -22, near: 1, far: 120 }); moon.shadow.bias = -0.0005; moon.target.position.set(1, 0, -4);
  world.add(moon, moon.target);
  // asfalto mojado (charcos más lisos), marcas viales, arcenes, biondas y la mediana
  const col = canvasTex(1024, 1024, (x) => { x.fillStyle = '#17181b'; x.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 42000; i++) { const v = 16 + rnd(i) * 26; x.fillStyle = `rgba(${v},${v},${v + 2},0.55)`; x.fillRect(rnd(i * 3.1) * 1024, rnd(i * 5.3) * 1024, 2, 2); } }, { aniso: 8 });
  col.wrapS = col.wrapT = THREE.RepeatWrapping; col.repeat.set(4, 130);
  const rough = canvasTex(512, 512, (x) => { x.fillStyle = '#909090'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 70; i++) { const r = 18 + rnd(i * 7.7) * 70, gx = rnd(i * 3.3) * 512, gy = rnd(i * 9.1) * 512, gg = x.createRadialGradient(gx, gy, 0, gx, gy, r);
      gg.addColorStop(0, 'rgba(70,70,70,0.7)'); gg.addColorStop(1, 'rgba(70,70,70,0)'); x.fillStyle = gg; x.beginPath(); x.ellipse(gx, gy, r, r * 0.6, rnd(i) * 3, 0, 7); x.fill(); } }, { srgb: false, aniso: 8 });
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping; rough.repeat.set(3, 70);
  roadMat = new THREE.MeshStandardMaterial({ map: col, roughnessMap: rough, roughness: 0.62, metalness: 0.2, color: 0x9a9a9a, envMapIntensity: 2.2 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(13.6, 440), roadMat); road.rotation.x = -Math.PI / 2; road.position.set(0.8, 0, -60); road.receiveShadow = true; world.add(road);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, 440), new THREE.MeshStandardMaterial({ color: 0x0a0d09, roughness: 0.95 }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(0, -0.03, -60); world.add(grass);
  const paintM = new THREE.MeshStandardMaterial({ color: 0xd9d9d2, roughness: 0.35, emissive: 0x161616 });
  const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.01, 4.5), paintM, 34);
  for (let i = 0; i < 34; i++) { _m.makeTranslation(0, 0.006, 70 - i * 13); dash.setMatrixAt(i, _m); } world.add(dash);
  for (const x of [3.55, -3.55]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, 440), paintM); l.position.set(x, 0.006, -60); world.add(l); }
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.85, roughness: 0.35 });
  const postG = new THREE.BoxGeometry(0.1, 0.75, 0.1);
  for (const [x, two] of [[6.35, false], [-4.75, true]]) {
    const posts = new THREE.InstancedMesh(postG, M.steel, 110);
    for (let i = 0; i < 110; i++) { _m.makeTranslation(x, 0.375, 80 - i * 2.2); posts.setMatrixAt(i, _m); } world.add(posts);
    for (const s of two ? [-1, 1] : [-1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 440), steel); b.position.set(x + s * 0.08, 0.6, -60); world.add(b); }
    const refl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.07, 0.07), GLOW(x > 0 ? 0xffb030 : 0xffffff, 0.9), 30);
    for (let i = 0; i < 30; i++) { _m.makeTranslation(x - 0.1 * Math.sign(x), 0.62, 80 - i * 8.8); refl.setMatrixAt(i, _m); } world.add(refl);
  }
  // farolas lejanas (sodio) y luces de la ciudad al fondo
  for (const z of [-62, -108, -150]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 10, 10), M.steel); pole.position.set(-4.75, 5, z); world.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.08), M.steel); arm.position.set(-3.7, 10, z); world.add(arm);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), GLOW(0xffa040, 4)); lamp.position.set(-2.7, 9.9, z); world.add(lamp);
  }
  // tu coche (blanco) y el accidentado (gris, cruzado, con el morro destrozado)
  me = makeCar({ color: 0xe6e8ea, xcol: 0x9fe8ff }); me.rotation.y = Math.PI / 2; world.add(me);
  crash = makeCar({ color: 0x55606c, xcol: 0xffa05a }); crash.position.set(CR.x, 0, CR.z); crash.rotation.y = CR.th; world.add(crash);
  crashCD = crushData(crash.userData.lowG); setCrush(crashCD, crash.userData.lowG, 1);
  const cu = crash.userData;
  zoneTw = new THREE.Mesh(cu.lowG, xrMat({ uI: { value: 0 }, uXmin: { value: 0.72 }, uCol: { value: new THREE.Color(1.8, 0.45, 0.08) } })); zoneTw.renderOrder = 17; cu.low.add(zoneTw);
  // luna rajada del accidentado
  const crack = canvasTex(512, 512, (x) => { x.strokeStyle = 'rgba(230,240,255,0.85)'; x.lineCap = 'round';
    const cx = 170, cy = 260;
    for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2 + rnd(i) * 0.2; let px = cx, py = cy; x.lineWidth = 2.2; x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 7; k++) { px += Math.cos(a + (rnd(i * 7 + k) - 0.5) * 0.6) * 38; py += Math.sin(a + (rnd(i * 3 + k) - 0.5) * 0.6) * 38; x.lineTo(px, py); } x.stroke(); }
    for (let r = 30; r < 200; r += 34 + rnd(r) * 20) { x.lineWidth = 1.4; x.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, rr2 = r * (0.85 + 0.3 * rnd(i + r)); x.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } x.stroke(); } });
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 1.42), new THREE.MeshBasicMaterial({ map: crack, transparent: true, depthWrite: false }));
  ws.position.set(0.72, 1.2, 0); ws.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(-0.87, 0.49, 0).normalize(), V(0, 0, 1), V(0.49, 0.87, 0).normalize()));
  ws.position.addScaledVector(V(0.49, 0.87, 0).normalize(), 0.012); cu.body.add(ws);
  cu.I.bagD.scale.set(0.75, 1, 1); cu.I.bagP.scale.set(0.8, 1, 1);
  // la jaula del habitáculo (verde, aparece con «habitáculo»)
  cageU = { uI: { value: 0 }, uXmin: { value: -99 }, uCol: { value: new THREE.Color(0.4, 2.2, 0.9) } };
  const cageM = xrMat(cageU); cageM.fragmentShader = 'uniform float uI; uniform vec3 uCol; void main(){ gl_FragColor = vec4(uCol * uI, 1.0); }';
  const cg = new THREE.Group(); cu.body.add(cg); cg.visible = false; cu.cage = cg;
  for (const s of [-1, 1]) {
    const z1 = s * 0.84, z2 = s * 0.7;
    for (const [a, b] of [[V(1.1, 0.42, z1), V(-1.8, 0.42, z1)], [V(1.1, 0.42, z1), V(1.1, 0.98, z1)], [V(1.1, 0.98, z1), V(0.31, 1.42, z2)], [V(0.31, 1.42, z2), V(-0.86, 1.42, z2)],
      [V(-0.86, 1.42, z2), V(-1.8, 1.0, z1)], [V(-1.8, 1.0, z1), V(-1.8, 0.42, z1)], [V(-0.22, 0.42, z1), V(-0.22, 1.42, z2)], [V(1.1, 0.98, z1), V(-1.8, 1.0, z1)]]) rodBetween(a, b, 0.026, cageM, cg);
  }
  for (const [a, b] of [[V(0.31, 1.42, -0.7), V(0.31, 1.42, 0.7)], [V(-0.86, 1.42, -0.7), V(-0.86, 1.42, 0.7)], [V(-0.22, 0.42, -0.84), V(-0.22, 0.42, 0.84)], [V(1.1, 0.42, -0.84), V(1.1, 0.42, 0.84)], [V(-1.8, 0.42, -0.84), V(-1.8, 0.42, 0.84)]]) rodBetween(a, b, 0.026, cageM, cg);
  // restos en el asfalto y vapor del motor
  const shardM = new THREE.MeshStandardMaterial({ color: 0xcfe6ff, metalness: 0.9, roughness: 0.05 }), bitM = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6 });
  for (let i = 0; i < 60; i++) {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.05 + rnd(i) * 0.06, 0.05 + rnd(i * 2) * 0.05), i % 3 ? shardM : bitM);
    sh.rotation.set(-Math.PI / 2, 0, rnd(i * 7) * 3); sh.position.set(-1.6 + rnd(i * 1.3) * 2.6, 0.006, -9.6 + rnd(i * 3.7) * 2.8); world.add(sh);
  }
  steam = new Parts(46, { life: 2.8, rise: 0.55, acc: 0.06, size: 0.42, grow: 2.0, turb: 0.35, conv: 0.1, rot: 6.28, opacity: 0.32, c: [[0.75, 0.77, 0.8], [0.62, 0.64, 0.67], [0.5, 0.52, 0.55], [0.4, 0.41, 0.44]], seed: 13, extent: [0.35, 0.1, 0.35], order: 11 });
  const fw0 = V(Math.cos(CR.th), 0, -Math.sin(CR.th)); steam.at(CR.x + fw0.x * 1.45, 0.9, CR.z + fw0.z * 1.45); world.add(steam.mesh);
  hazL = new THREE.PointLight(0xff8a20, 0, 0, 2); hazL.position.set(CR.x, 1.4, CR.z); world.add(hazL);
  // faros de tu coche: dos focos + haces visibles con la lluvia
  for (const s of [-1, 1]) {
    const sp = new THREE.SpotLight(0xfff0dc, 0, 0, 0.36, 0.55, 2); sp.position.set(2.2, 0.72, s * 0.58); me.add(sp);
    sp.target.position.set(30, -0.6, s * 1.5); me.add(sp.target); spots.push(sp);
    const b = makeBeam(26, 4.6); b.m.position.set(2.22, 0.71, s * 0.58); b.m.rotation.z = -0.045; me.add(b.m); beams.push(b);
  }
  myHazL = new THREE.PointLight(0xff8a20, 0, 0, 2); myHazL.position.set(0, 1.3, 0); me.add(myHazL);
  // agua que levantan las ruedas
  me.userData.W.forEach((w, i) => { const j = waterJet(140, { v0: 4.5, seed: 61 + i * 7, life: 0.8, size: 0.035, grow: 0.5, spreadA: 0.3, spreadB: 0.22, grav: 4.9, opacity: 0.08 }); world.add(j.mesh); sprays.push(j); });
  // reflejos en el asfalto mojado
  const wpos = (obj, x, y, z) => obj.localToWorld(_wp.set(x, y, z)).clone();
  for (const s of [-1, 1]) {
    addRefl(() => [wpos(me, 2.2, 0.71, s * 0.58), me.userData.headI || 0], 0xfff0dc, 0.55, 10);
    addRefl(() => [wpos(me, -2.24, 0.86, s * 0.58), me.userData.tailI || 0], 0xff2a18, 0.35, 6);
    for (const x of [2.13, -2.2]) addRefl(() => [wpos(crash, x, 0.65, s * 0.84), crash.userData.hazI || 0], 0xff8a20, 0.3, 5);
  }
  rain = makeRain(6500); world.add(rain.m);
  // la autobomba (llega con las luces), los bomberos y la cizalla
  truck = makeTruck(); truck.rotation.y = Math.PI / 2; truck.position.set(TRUCK_X, 0, 120); world.add(truck);
  truck.traverse(o => { if (o.isMesh) o.castShadow = true; }); beacons = truck.userData.lbar;
  for (const s of [-1, 1]) addRefl(() => [truck.localToWorld(_wp.set(3.4, 3.1, s * 0.6)).clone(), truck.userData.bI || 0], 0x3a7bff, 0.6, 9);
  for (let i = 0; i < 3; i++) { const f = makeFirefighter(); f.visible = false; world.add(f); ffs.push(f); }
  cutter = new THREE.Group();
  const yel = new THREE.MeshStandardMaterial({ color: 0xf2b417, roughness: 0.4 });
  const cb = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.13, 0.42, 2, 0.03), yel); cutter.add(cb);
  for (const s of [-1, 1]) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.22), M.chrome); bl.position.set(s * 0.025, 0, -0.3); bl.rotation.y = s * 0.12; cutter.add(bl); }
  const hdl = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 16), M.black); hdl.position.set(0, 0.09, 0.12); cutter.add(hdl);
  cutter.visible = false; world.add(cutter);
  world.updateMatrixWorld(true);
}

// ------------------------------------------------------------------ tiempos: cámara lenta mientras tu coche frena (para justo en «luces»)
let T = {}, KEYS = null, TAU = t => t, TB = 0.3, TE = 4, ACC = 7;
function setupTimes() {
  T = { ...CUE, end: END };
  const L = window.LINES_;
  T.count0 = L[3].end + 0.05; T.count1 = T.count0 + 4.0;
  T.fin = T.compartir - 0.25;
  T.stop = T.luces + 0.2;
  T.tb = Math.min(T.frena + 0.22, T.coche - 0.15);        // empieza a frenar
  const t1 = T.coche, ramp = 0.9;
  let r = (T.tb + V0 / 7.0 - t1 - ramp / 2) / (T.stop - t1 - ramp / 2);
  r = cl(r, 0.05, 0.3);
  TAU = warp([[0, 1], [t1, 1], [t1 + ramp, r], [T.stop, r], [T.pasiva + 0.2, 1]]);
  TB = T.tb; TE = TAU(T.stop); ACC = V0 / (TE - TB);
  T.truck0 = T.pasiva + 0.6; T.truck1 = T.habitaculo + 0.4;          // la autobomba llega con las luces
  T.ff0 = T.activa2 - 0.2; T.ff1 = T.ojo - 0.15;                      // los bomberos van al coche
  KEYS = camKeys();
}
const DB = () => V0 * V0 / (2 * ACC);
function carZ(tau) { if (tau <= TB) return STOP_Z + DB() + V0 * (TB - tau); if (tau >= TE) return STOP_Z; const s = TE - tau; return STOP_Z + 0.5 * ACC * s * s; }
function carV(tau) { return tau <= TB ? V0 : tau >= TE ? 0 : ACC * (TE - tau); }

// ------------------------------------------------------------------ cámara: un dron que no para (z relativa a tu coche mientras se mueve)
function camKeys() {
  const K = [
    [0, [1.6, 2.3, 9.5, 1.75, 0.8, -40, 34]],                        // detrás de tu coche: al fondo, el accidentado con los warnings
    [T.carril, [0.9, 1.9, 7.5, 1.75, 0.8, -30, 36]],
    [T.lloviendo + 0.2, [4.8, 1.3, 3.2, 1.9, 0.6, -8, 40]],            // al lado: la rueda frenando, el agua que salta
    [T.como + 0.4, [4.8, 3.2, -1.0, 1.6, 1.2, -16, 40]],              // delante a la derecha: el accidentado, cada vez más cerca
    [T.optA, [1.75, 12.0, 6.5, 1.75, 0.0, -10, 40]],                    // alto, detrás: los dos coches
    [T.count0, [7.2, 3.4, -2.8, 1.75, 1.3, 0, 40]],                    // órbita alrededor de tu coche congelado
    [T.count0 + 2.0, [5.0, 4.2, -6.2, 1.75, 1.3, -0.4, 40]],
    [T.count1, [7.0, 3.6, 4.0, 1.75, 1.3, 0, 40]],
    [T.tiempo + 0.3, [5.0, 6.0, 8.5, 1.75, 0.5, -5.0, 40]],
    [T.activa, [5.6, 2.4, 4.2, 1.75, 0.7, -0.6, 42]],                  // activa: 3/4 trasero derecho
    [T.frenos, [5.4, 1.15, -0.1, 2.4, 0.45, -1.2, 40]],                // la rueda delantera (disco al rojo, ABS)
    [T.estabilidad, [2.8, 8.2, 1.4, 1.75, 0.3, -0.8, 42]],             // desde arriba: el control de estabilidad
    [T.neumaticos, [5.2, 1.0, 3.6, 2.5, 0.35, 1.2, 42]],               // la rueda trasera y el agua
    [T.direccion, [4.8, 1.6, -2.7, 2.2, 0.45, -1.4, 42]],              // las ruedas que viran
    [T.suspension, [6.4, 1.2, 0.3, 1.75, 0.6, -0.3, 42]],              // de perfil: el morro que cabecea, los muelles
    [T.stop, [4.4, 2.8, 7.8, 1.4, 0.7, R(-6.0), 42]],                  // los faros sobre el accidentado: parado a 1 m
    [T.pasiva + 0.15, [-1.9, 2.6, R(-2.8), 1.0, 0.8, R(-7.6), 42]],   // pasiva: al lado del conductor del accidentado
    [T.cinturon, [-2.4, 1.9, R(-4.9), 1.05, 0.95, R(-7.8), 38]],
    [T.airbags, [-2.6, 2.0, R(-6.0), 1.0, 0.95, R(-8.0), 38]],
    [T.carroceria, [-3.2, 2.4, R(-9.4), 0.6, 0.8, R(-8.8), 40]],       // el morro arrugado
    [T.habitaculo, [-3.6, 3.6, R(-7.0), 1.2, 0.9, R(-8.0), 42]],       // la jaula del habitáculo
    [T.activa2, [-1.8, 7.0, R(15.0), 1.0, 0.3, R(-5.5), 42]],         // desde detrás de la autobomba: los tres vehículos
    [T.dano + 0.2, [-1.6, 6.6, R(14.0), 1.0, 0.3, R(-5.8), 42]],
    [T.ojo, [-4.6, 2.2, R(-3.2), 0.8, 1.1, R(-7.0), 38]],           // el bombero con la cizalla junto al pilar
    [T.rescatas, [-4.9, 2.5, R(-3.8), 0.8, 1.1, R(-7.0), 38]],
    [T.escribe, [-1.5, 13.5, R(22.0), 1.0, 0, R(-4.0), 40]],          // sube: todo
    [T.fin, [-1.0, 17.0, R(25.0), 1.0, 0, R(-4.0), 40]],
    [T.end, [-0.5, 22.0, R(28.0), 1.0, 0, R(-4.0), 42]],
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
  const v = hermite(KEYS, t), cz = carZ(TAU(t));
  const sh = Math.exp(-Math.pow((t - T.frena - 0.08) / 0.12, 2)) * 0.12 + Math.exp(-Math.pow((t - T.tiempo - 0.05) / 0.12, 2)) * 0.16 + Math.exp(-Math.pow((t - T.deforma - 0.12) / 0.12, 2)) * 0.1;
  return pose(V(v[0] + sh * Math.sin(t * 91), v[1] + sh * Math.cos(t * 77), v[2] + cz), V(v[3], v[4], v[5] + cz), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
function update(t) {
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  const tau = TAU(t), v = carV(tau), braking = tau > TB - 0.02 && tau < TE + 0.3;
  const mu = me.userData, cu = crash.userData;
  // tu coche: posición, ruedas, cabeceo (y el rebote al pararse), coleo corregido por el ESP, dirección
  const z = carZ(tau);
  const esp = Math.sin(cl((t - T.control + 0.25) / 1.6) * Math.PI) * (t > T.control - 0.25 && t < T.control + 1.35 ? 1 : 0);
  const wet = Math.sin(cl((t - T.lloviendo + 0.3) / 1.2) * Math.PI) * (t > T.lloviendo - 0.3 && t < T.lloviendo + 0.9 ? 1 : 0);
  me.position.set(LX + 0.06 * esp, 0, z); me.rotation.y = Math.PI / 2 + 0.07 * esp * Math.sin((t - T.control) * 4.2) + 0.035 * wet;
  const stopT = t - T.stop, reb = stopT > 0 ? 0.012 * Math.exp(-stopT * 3.5) * Math.cos(stopT * 13) : 0;
  const dive = braking ? -0.03 * cl(v / 6 + 0.25) : 0;
  mu.body.rotation.z = (tau > TB ? dive : 0) + reb;
  mu.body.position.y = (tau > TB && tau < TE ? -0.02 : 0) + reb * 0.5;
  me.updateMatrixWorld(true);
  const dist = (carZ(0) - z);
  const abs = tau > TB && tau < TE ? 0.5 + 0.5 * Math.sign(Math.sin(tau * 2 * Math.PI * 7)) : 1;
  mu.W.forEach((w, i) => {
    w.spin.rotation.z = -(dist / 0.33) + (tau > TB ? 0.15 * (1 - abs) : 0);
    w.steer.rotation.y = w.front ? 0.17 * Math.sin(cl((t - T.direccion + 0.15) / 1.0) * Math.PI) * (t > T.direccion - 0.15 && t < T.direccion + 0.85 ? 1 : 0) : 0;
    const j = sprays[i], wp = me.localToWorld(_wp.set(w.piv.position.x - 0.25, 0.05, w.piv.position.z + w.s * 0.1));
    j.at(wp.x, wp.y, wp.z); j.u.uDir.value.set(w.s * 0.35, 0.55, 1).normalize(); j.u.uTime.value = tau;
    j.u.uOpacity.value = (0.05 + 0.2 * pulse(t, T.neumaticos + 0.3, 0.6)) * cl(v / 8); j.u.uV0.value = 2 + 4 * cl(v / V0);
  });
  // frenos: discos al rojo (laten con el ABS), luces de freno, warnings tras parar
  const hot = braking ? (0.6 + 0.4 * abs) * cl(v / 5 + 0.4) : 0;
  mu.discM.emissiveIntensity = hot * (1.6 + 2.6 * pulse(t, T.frenos + 0.3, 0.7));
  const brakeOn = tau > TB - 0.02 ? 1 : 0;
  mu.L.tail.forEach(m => m.material.color.setRGB(0.5 + 3.4 * brakeOn, 0.05 + 0.25 * brakeOn, 0.03 + 0.15 * brakeOn));
  mu.L.brake.material.color.setRGB(0.15 + 3.2 * brakeOn, 0.02 + 0.2 * brakeOn, 0.02 + 0.1 * brakeOn);
  mu.tailI = 0.12 + 0.3 * brakeOn;
  const myHaz = t > T.pasiva ? ((t * 1.4) % 1 < 0.5 ? 1 : 0) : 0;
  mu.L.ind.forEach(m => m.material.color.setRGB(0.12 + 3.2 * myHaz, 0.05 + 1.4 * myHaz, 0.0 + 0.1 * myHaz)); myHazL.intensity = 6 * myHaz;
  // faros: cruce; largas en «luces»
  const high = sm(T.luces - 0.15, T.luces + 0.1, t) * (1 - sm(T.stop + 0.3, T.pasiva + 0.3, t)), dimL = sm(T.stop + 0.3, T.pasiva + 0.4, t);
  const near = 0.18 + 0.82 * cl(((z - 2.25) + 5.88 - 1) / 12);       // a 1 m del otro coche, los faros no lo «queman»
  spots.forEach(s => { s.intensity = (900 + 700 * high) * (1 - 0.82 * dimL) * near; s.angle = 0.36 + 0.05 * high; });
  beams.forEach(b => { b.u.uI.value = (0.035 + 0.03 * high) * (1 - 0.6 * dimL); });
  mu.L.head.forEach(h => h.material.color.setRGB(3.0 + 1.6 * high - 1.4 * dimL, 2.9 + 1.5 * high - 1.4 * dimL, 2.7 + 1.4 * high - 1.3 * dimL));
  mu.headI = (0.6 + 0.6 * high) * (1 - 0.5 * dimL);
  // «rayos X» de tu coche en la explicación de la activa: discos, unidad ESP, neumáticos, dirección y muelles
  const xA = sm(T.activa - 0.15, T.activa + 0.3, t) * (1 - sm(T.luces - 0.45, T.luces - 0.05, t));
  setXray(me, xA * 0.85);
  mu.I.unitM.emissive.setRGB(0.1, 1.4, 0.6).multiplyScalar(xA * sm(T.control - 0.2, T.control + 0.1, t) * (1 - sm(T.neumaticos - 0.1, T.neumaticos + 0.2, t)));
  mu.I.lineM.emissive.copy(mu.I.unitM.emissive).multiplyScalar(0.6);
  mu.tireM.emissiveIntensity = 0.9 * xA * sm(T.neumaticos - 0.15, T.neumaticos + 0.1, t) * (1 - sm(T.direccion - 0.1, T.direccion + 0.2, t));
  mu.I.rackM.emissive.setRGB(0.1, 1.4, 0.6).multiplyScalar(xA * sm(T.direccion - 0.15, T.direccion + 0.1, t) * (1 - sm(T.suspension - 0.1, T.suspension + 0.2, t)));
  const spr = xA * sm(T.suspension - 0.15, T.suspension + 0.1, t);
  mu.I.springM.emissive.setRGB(0.1, 1.4, 0.6).multiplyScalar(spr);
  mu.I.springs.forEach((s, i) => { s.scale.y = 0.42 * (i < 2 ? 1 + (mu.body.rotation.z) * 5 : 1 - mu.body.rotation.z * 3); });
  // el accidentado: warnings, vapor, «rayos X» con la repetición del golpe (cinturón, airbags, reposacabezas, deformación, habitáculo)
  const haz = (tau * 1.4) % 1 < 0.5 ? 1 : 0;
  cu.L.ind.forEach(m => m.material.color.setRGB(0.15 + 3.6 * haz, 0.06 + 1.6 * haz, 0.01 + 0.1 * haz)); hazL.intensity = 14 * haz; cu.hazI = 0.9 * haz;
  cu.L.head.forEach((h, i) => h.material.color.setRGB(i ? 1.5 : 0.05, i ? 1.45 : 0.05, i ? 1.35 : 0.05));
  steam.u.uTime.value = tau;
  const xP = sm(T.pasiva - 0.2, T.pasiva + 0.3, t) * (1 - sm(T.activa2 - 0.3, T.activa2 + 0.2, t));
  const xB = sm(T.ojo - 0.3, T.ojo + 0.1, t) * (1 - sm(T.escribe - 0.4, T.escribe, t));
  const xC = Math.max(xP, 0.7 * xB);
  steam.u.uOpacity.value = 0.32 * (1 - 0.65 * xC);
  setXray(crash, xC * 0.88);
  const rewind = sm(T.pasiva - 0.1, T.pasiva + 0.45, t), recrush = e3(pr(t, T.deforma - 0.08, 0.45));
  setCrush(crashCD, cu.lowG, t < T.pasiva - 0.1 ? 1 : 1 - rewind + rewind * recrush);
  zoneTw.material.uniforms.uI.value = xP * sm(T.carroceria - 0.15, T.carroceria + 0.2, t) * (1 + 1.2 * pulse(t, T.deforma + 0.3, 0.4)) * (1 - sm(T.activa2 - 0.3, T.activa2, t));
  zoneTw.visible = zoneTw.material.uniforms.uI.value > 0.01;
  const bags = t < T.pasiva - 0.1 ? 1 : (1 - rewind) + rewind * bk(pr(t, T.airbags - 0.08, 0.35));
  cu.I.bagD.scale.set(0.75 * Math.max(0.001, bags), Math.max(0.001, bags), Math.max(0.001, bags)); cu.I.bagP.scale.set(0.8 * Math.max(0.001, bags), Math.max(0.001, bags), Math.max(0.001, bags));
  cu.I.bagD.visible = cu.I.bagP.visible = bags > 0.01;
  const gl = (k) => k * xP;
  cu.I.bagM.emissive.setRGB(0.5, 0.9, 1.4).multiplyScalar(gl(pulse(t, T.airbags + 0.3, 0.55)) * 0.8);
  const belt = gl(sm(T.cinturon - 0.15, T.cinturon + 0.1, t) * (1 - sm(T.airbags + 0.4, T.airbags + 0.8, t)));
  cu.I.beltM.emissive.setRGB(0.2, 1.6, 0.8).multiplyScalar(belt * 1.4);
  const pull = rewind * (pulse(t, T.cinturon + 0.25, 0.3) * 0.06 - pulse(t, T.reposa + 0.2, 0.25) * 0.03);
  cu.I.drv.position.x = -pull;
  const hd = gl(sm(T.reposa - 0.15, T.reposa + 0.1, t) * (1 - sm(T.carroceria - 0.2, T.carroceria + 0.1, t)));
  cu.I.heads.forEach(h => h.material.emissive.setRGB(0.2, 1.6, 0.8).multiplyScalar(hd * 1.3));
  cu.I.head.position.x = -0.33 - 0.06 * hd;
  const cage = gl(sm(T.habitaculo - 0.2, T.habitaculo + 0.15, t)) * (1 - sm(T.activa2 - 0.3, T.activa2, t));
  cageU.uI.value = cage * (1 + 0.6 * pulse(t, T.habitaculo + 0.3, 0.4)); cu.cage.visible = cage > 0.01;
  // el airbag de cortina que NO ha saltado (rojo, late) — «puede saltar mientras rescatas»
  const warn = xB * (0.6 + 0.4 * Math.max(0, Math.sin(t * 9)));
  cu.I.curtM.emissive.setRGB(2.4, 0.2, 0.1).multiplyScalar(warn * sm(T.airbag - 0.2, T.airbag + 0.1, t));
  // la autobomba llega (luces y sirena) y aparca detrás, en el carril izquierdo; los bomberos van al coche
  const tk = eO(pr(t, T.truck0, T.truck1 - T.truck0));
  truck.position.set(TRUCK_X, 0, mx(120, TRUCK_Z, tk)); truck.visible = t > T.truck0 - 0.1; truck.updateMatrixWorld(true);
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = truck.visible ? 10 + 70 * on : 0; truck.userData.bI = truck.visible ? 0.25 + 0.9 * on : 0;
  const fwd = V(Math.cos(CR.th), 0, -Math.sin(CR.th)), rgt = V(Math.sin(CR.th), 0, Math.cos(CR.th));
  const at = (lx, lz) => V(CR.x + fwd.x * lx + rgt.x * lz, 0, CR.z + fwd.z * lx + rgt.z * lz);
  const goal = [at(-0.25, -1.55), at(2.75, -0.55), V(-0.2, 0, 4.2)];
  ffs.forEach((f, i) => {
    const k = e3(pr(t, T.ff0 + i * 0.25, T.ff1 - T.ff0)), from = V(TRUCK_X + 1.4, 0, TRUCK_Z - 2.5 - i * 0.8);
    f.visible = t > T.ff0 - 0.05 && truck.visible;
    f.position.lerpVectors(from, goal[i], k); f.position.y = 0.05 * Math.abs(Math.sin(t * 11 + i)) * (k > 0 && k < 1 ? 1 : 0);
    const look = i < 2 ? V(CR.x, 0, CR.z) : V(LX, 0, STOP_Z);
    const dx = (k < 0.95 ? goal[i].x - from.x : look.x - f.position.x), dz = (k < 0.95 ? goal[i].z - from.z : look.z - f.position.z);
    f.rotation.y = Math.atan2(-dx, -dz);
  });
  const f0 = ffs[0], back = 0.35 * sm(T.saltar2 - 0.2, T.saltar2 + 0.3, t);
  if (f0.visible) {
    const dir = V(CR.x - f0.position.x, 0, CR.z - f0.position.z).normalize();
    f0.position.addScaledVector(dir, -back);
    cutter.visible = t > T.ojo - 0.4; cutter.position.copy(f0.position).addScaledVector(dir, 0.42).setY(1.05);
    cutter.rotation.y = Math.atan2(-dir.x, -dir.z);
  } else cutter.visible = false;
  // lluvia, haz de los faros y reflejos
  rain.u.uTau.value = tau; rain.u.uLen.value = 0.14 + 0.26 * cl((TAU(t + 0.01) - tau) / 0.01); rain.u.uI.value = 0.65;
  const fw = V(0, 0, -1).applyQuaternion(cam.quaternion);
  rain.u.uBoxC.value.copy(cam.position).addScaledVector(fw, 11);
  me.localToWorld(rain.u.uHP.value.set(2.2, 0.72, 0)); rain.u.uHD.value.set(-Math.sin(me.rotation.y - Math.PI / 2), -0.03, -Math.cos(me.rotation.y - Math.PI / 2)).normalize();
  rain.u.uHI.value = 1 + high;
  updRefl();
}

// ------------------------------------------------------------------ capa 2D
function proj(v) { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * W2, y: (-p.y * 0.5 + 0.5) * H2, ok: p.z < 1 }; }
function chip(x, y, text, col, a, s = 1, icon = null, px = 56) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a); g.translate(cl(x, 220, W2 - 220), cl(y, 470, H2 - 230)); g.scale(s, s);
  g.font = `400 ${px}px Bebas`; const tw = g.measureText(text).width, w = tw + (icon ? 100 : 60), h = px * 1.45;
  rr(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  const cx = -w / 2 + 46;
  if (icon === 'ok') { g.beginPath(); g.moveTo(cx - 16, 0); g.lineTo(cx - 4, 13); g.lineTo(cx + 18, -14); g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round'; g.stroke(); }
  else if (icon === 'warn') { g.beginPath(); g.moveTo(cx, -20); g.lineTo(cx + 21, 17); g.lineTo(cx - 21, 17); g.closePath(); g.fillStyle = col; g.fill(); txt('!', cx, 13, 30, '#0b0d10', 400, 'center', 'Bebas'); }
  else if (icon === 'o') { g.beginPath(); g.arc(cx, 0, 18, 0, 7); g.strokeStyle = col; g.lineWidth = 6; g.stroke(); }
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
function big(s1, col, a, y = 560, px = 132) {
  if (a <= 0.005) return; g.save(); g.globalAlpha = cl(a); const sc = 0.85 + 0.15 * bk(cl(a)); g.translate(540, y); g.scale(sc, sc);
  g.font = `400 ${px}px Bebas`; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,0.85)'; g.shadowBlur = 26; g.fillStyle = col; g.fillText(s1, 0, 40); g.shadowBlur = 0; g.restore();
}
function ringAt(p, col, a, r = 60) {
  if (a <= 0.005 || !p.ok) return;
  g.save(); g.globalAlpha = cl(a); g.translate(p.x, p.y);
  for (let k = 0; k < 2; k++) { g.beginPath(); g.arc(0, 0, r * (1 + 0.25 * k), 0, 7); g.strokeStyle = col; g.lineWidth = 6 - 3 * k; g.stroke(); }
  g.restore();
}
const OPTS = [['A', 'SEGURIDAD ACTIVA'], ['B', 'SEGURIDAD PASIVA DINÁMICA'], ['C', 'SEGURIDAD ACTIVA DINÁMICA']];
const LCOL = ['#FF7A1A', '#2DD4BF', '#F0457A'];
function cards(t) {               // 3 tarjetas: salen una a una al nombrarlas; B roja y tachada tras «¡Tiempo!»; vuelven al final (sin dar la respuesta)
  const tIn = [T.optA, T.optB, T.optC];
  OPTS.forEach(([L, s], i) => {
    const k = Math.max(bk(pr(t, tIn[i] - 0.2, 0.4)) * (1 - sm(T.activa - 0.35, T.activa - 0.05, t)), bk(pr(t, T.escribe - 0.25 + i * 0.07, 0.4)) * (1 - sm(T.fin - 0.3, T.fin + 0.05, t)));
    if (k <= 0.005) return;
    const bad = i === 1 && t > T.tiempo - 0.05;
    const cy = 610 + i * 135, side = i % 2 ? 1 : -1;
    const shake = bad ? 10 * Math.sin(t * 80) * Math.exp(-Math.pow((t - T.tiempo - 0.15) / 0.2, 2)) : 0;
    const pl = !bad && t > T.comenta - 0.1 && t < T.tiempo ? 1 + 0.03 * Math.max(0, Math.sin((t - T.comenta) * 7 - i * 1.3)) : 1;
    g.save(); g.globalAlpha = cl(k * 1.3) * (bad && t > T.escribe - 0.5 ? 0.55 : 1); g.translate(540 + side * (1 - cl(k)) * 700 + shake, cy); g.scale(pl, pl);
    rr(-450, -58, 900, 116, 40); g.fillStyle = bad ? 'rgba(58,8,8,0.94)' : 'rgba(9,12,17,0.88)'; g.fill(); g.lineWidth = bad ? 7 : 3; g.strokeStyle = bad ? RED2 : 'rgba(255,255,255,0.3)'; g.stroke();
    g.beginPath(); g.arc(-385, 0, 42, 0, 7); g.fillStyle = bad ? RED2 : LCOL[i]; g.fill();
    txt(bad ? '✗' : L, -385, 21, 62, '#0b0d10', 400, 'center', 'Bebas');
    g.font = '400 74px Bebas'; let px = 74; while (g.measureText(s).width > 720 && px > 40) { px -= 4; g.font = `400 ${px}px Bebas`; }
    txt(s, 30, px * 0.34, px, '#F2F5F8', 400, 'center', 'Bebas');
    if (bad) { const w = g.measureText(s).width; g.strokeStyle = RED2; g.lineWidth = 8; g.beginPath(); g.moveTo(30 - w / 2 - 10, 4); g.lineTo(30 + w / 2 + 10, 4); g.stroke(); }
    g.restore();
  });
}
const QTXT = '¿Cómo se conoce el conjunto de sistemas que aportan una mayor eficacia, estabilidad y seguridad a los ocupantes de un vehículo en marcha, evitando en lo posible que se produzca un impacto?';
function questionCard(t) {
  const a = sm(T.como - 0.15, T.como + 0.2, t) * (1 - sm(T.optA - 0.3, T.optA - 0.05, t));
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = a; g.translate(540, 1330 + (1 - bk(cl(a))) * 40);
  rr(-470, -170, 940, 340, 40); g.fillStyle = 'rgba(9,12,17,0.9)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 4; g.stroke();
  txt('PREGUNTA DE EXAMEN', 0, -112, 44, GOLD2, 400, 'center', 'Bebas');
  g.font = '600 40px Inter'; const words = QTXT.split(' '); const lines = []; let cur = '';
  for (const w of words) { const s = cur ? cur + ' ' + w : w; if (g.measureText(s).width > 860) { lines.push(cur); cur = w; } else cur = s; } lines.push(cur);
  const hiK = sm(T.evitan - 0.1, T.evitan + 0.15, t);
  lines.forEach((l, i) => {
    const y = -50 + i * 50, hi = /evitando|posible|produzca|impacto/.test(l) ? hiK : 0;
    txt(l, 0, y, 40, hi > 0.5 ? GOLD2 : '#EEF2F6', 600, 'center');
  });
  g.restore();
}
function dial(x, y, v, a) {       // velocímetro (km/h) mientras frena
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a); g.translate(x, y);
  g.beginPath(); g.arc(0, 0, 118, 0, 7); g.fillStyle = 'rgba(8,10,14,0.86)'; g.fill(); g.strokeStyle = '#E8EEF4'; g.lineWidth = 6; g.stroke();
  for (let k = 0; k <= 12; k++) { const an = Math.PI * 0.75 + Math.PI * 1.5 * k / 12; g.beginPath(); g.moveTo(Math.cos(an) * 96, Math.sin(an) * 96); g.lineTo(Math.cos(an) * (k % 2 ? 84 : 74), Math.sin(an) * (k % 2 ? 84 : 74)); g.strokeStyle = k > 9 ? RED2 : '#E8EEF4'; g.lineWidth = k % 2 ? 3 : 6; g.stroke(); }
  const an = Math.PI * 0.75 + Math.PI * 1.5 * v / 120;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(an) * 86, Math.sin(an) * 86); g.strokeStyle = '#FF5A3C'; g.lineWidth = 8; g.lineCap = 'round'; g.stroke();
  g.beginPath(); g.arc(0, 0, 12, 0, 7); g.fillStyle = '#FF5A3C'; g.fill();
  txt(String(Math.round(v)), 0, 64, 54, '#FFFFFF', 400, 'center', 'Bebas'); txt('KM/H', 0, 98, 26, '#C8D0D8', 400, 'center', 'Bebas');
  g.restore();
}
function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const tau = TAU(t), z = carZ(tau);
  // gancho: velocímetro que baja y la distancia al coche accidentado
  g.save(); g.translate(170, 650); g.scale(0.78, 0.78); dial(0, 0, carV(tau) * 3.6, sm(0.05, 0.3, t) * (1 - sm(T.como - 0.35, T.como - 0.1, t))); g.restore();
  const d = Math.max(1, (z - 2.25) - (-5.88)), cp = proj(V(CR.x, 2.1, CR.z));
  chip(cp.x, cp.y - 40, `${Math.round(d)} M`, RED2, sm(0.15, 0.4, t) * (1 - sm(T.como - 0.3, T.como - 0.05, t)) * (cp.ok ? 1 : 0), 1.0, 'warn', 60);
  // pregunta (texto del examen) y sello
  questionCard(t);
  const ex = sm(T.como - 0.25, T.como + 0.05, t) * (1 - sm(T.optA - 0.35, T.optA - 0.1, t));
  if (ex > 0) { g.save(); g.globalAlpha = ex; g.translate(540, 1105); rr(-380, -40, 760, 80, 40); g.fillStyle = 'rgba(8,10,14,0.8)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 3; g.stroke();
    txt('EXAMEN · AYTO. DE MARBELLA 2023', 0, 15, 44, GOLD2, 400, 'center', 'Bebas'); g.restore(); }
  // tarjetas, «comenta tu letra», cuenta 1 → 5 y «¡TIEMPO!»
  cards(t);
  const ca = sm(T.comenta - 0.1, T.comenta + 0.25, t) * (1 - sm(T.count1 - 0.05, T.count1 + 0.2, t));
  if (ca > 0) { g.save(); g.globalAlpha = ca; g.translate(540, 1555); rr(-260, -50, 520, 100, 50); g.fillStyle = 'rgba(8,10,14,0.74)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.26)'; g.lineWidth = 3; g.stroke(); txt('💬  COMENTA TU LETRA', 0, 18, 50, '#F2F5F8', 400, 'center', 'Bebas'); g.restore(); }
  if (t > T.count0 - 0.02 && t < T.tiempo + 0.25) {
    const e = t - T.count0, n = Math.min(5, 1 + Math.floor(Math.max(0, e))), f = Math.max(0, e) % 1, k = cl(e / 4.0), out = 1 - sm(T.tiempo, T.tiempo + 0.25, t);
    g.save(); g.globalAlpha = out; g.translate(540, 1735);
    g.beginPath(); g.arc(0, 0, 84, 0, 7); g.fillStyle = 'rgba(8,10,14,0.78)'; g.fill();
    g.beginPath(); g.arc(0, 0, 84, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.strokeStyle = n >= 5 ? RED2 : '#FF7A1A'; g.lineWidth = 10; g.lineCap = 'round'; g.stroke();
    const s = 1 + 0.4 * Math.pow(1 - (n >= 5 ? Math.min(1, (e - 4) * 3) : f), 5); g.scale(s, s);
    txt(String(n), 0, 38, 116, n >= 5 ? '#FF6B5E' : '#FFFFFF', 400, 'center', 'Bebas'); g.restore();
  }
  stamp('¡TIEMPO!', 1080, RED2, Math.exp(-Math.pow((t - T.tiempo - 0.35) / 0.32, 4)), 180);
  // seguridad ACTIVA: antes del golpe (cada pieza al nombrarla)
  const A = sm(T.activa - 0.1, T.activa + 0.2, t) * (1 - sm(T.luces + 0.5, T.luces + 0.8, t));
  if (A > 0.01) {
    big('SEGURIDAD ACTIVA', GREEN2, A, 560);
    chip(540, 680, 'ANTES DEL GOLPE · PARA NO CHOCAR', GREEN2, sm(T.antes - 0.1, T.antes + 0.15, t) * A, 0.92, 'ok', 50);
    const F = [['FRENOS + ABS', T.frenos], ['CONTROL DE ESTABILIDAD', T.control], ['NEUMÁTICOS', T.neumaticos], ['DIRECCIÓN', T.direccion], ['SUSPENSIÓN', T.suspension], ['LUCES', T.luces]];
    F.forEach(([s1, tc], j) => { const a = sm(tc - 0.12, tc + 0.12, t) * A, hot = pulse(t, tc + 0.25, 0.4); chip(300 + (j % 2) * 480, 1450 + Math.floor(j / 2) * 105, s1, GREEN2, a, 0.88 + 0.18 * hot, null, 48); });
    const fr = me.localToWorld(V(1.36, 0.33, 0.92)), rr2 = me.localToWorld(V(-1.36, 0.33, 0.92)), ctr = me.localToWorld(V(0, 1.6, 0)), hl = me.localToWorld(V(2.3, 0.7, 0.58));
    const absA = sm(T.abs - 0.15, T.abs + 0.1, t) * (1 - sm(T.control - 0.1, T.control + 0.1, t));
    const pf = proj(fr); if (absA > 0.01 && pf.ok) { const b = 1 + 0.2 * Math.max(0, Math.sin(t * 22)); g.save(); g.globalAlpha = absA; g.translate(pf.x, pf.y); g.scale(b, b); g.beginPath(); g.arc(0, 0, 70, 0, 7); g.strokeStyle = ORANGE2; g.lineWidth = 6; g.stroke(); g.restore(); chip(pf.x, pf.y - 120, 'ABS', ORANGE2, absA, 1, null, 58); }
    const espA = sm(T.control - 0.15, T.control + 0.1, t) * (1 - sm(T.neumaticos - 0.1, T.neumaticos + 0.1, t));
    const pc = proj(ctr); if (espA > 0.01 && pc.ok) { g.save(); g.globalAlpha = espA; g.translate(pc.x, pc.y); for (const s of [-1, 1]) { g.beginPath(); g.arc(0, 0, 150, s > 0 ? -0.9 : Math.PI - 0.9, s > 0 ? 0.4 : Math.PI + 0.4); g.strokeStyle = GREEN2; g.lineWidth = 9; g.lineCap = 'round'; g.stroke(); const an = s > 0 ? 0.4 : Math.PI + 0.4; const ex2 = Math.cos(an) * 150, ey2 = Math.sin(an) * 150; g.beginPath(); g.moveTo(ex2, ey2); g.lineTo(ex2 - 26 * Math.sin(an) - 14 * Math.cos(an), ey2 + 26 * Math.cos(an) - 14 * Math.sin(an)); g.lineTo(ex2 + 20 * Math.cos(an), ey2 + 20 * Math.sin(an)); g.closePath(); g.fillStyle = GREEN2; g.fill(); } g.restore(); chip(pc.x, Math.max(pc.y + 205, 900), 'ESP', GREEN2, espA, 1, null, 58); }
    ringAt(proj(rr2), CYAN2, sm(T.neumaticos - 0.12, T.neumaticos + 0.1, t) * (1 - sm(T.direccion - 0.1, T.direccion + 0.1, t)), 66);
    ringAt(proj(fr), GREEN2, sm(T.direccion - 0.12, T.direccion + 0.1, t) * (1 - sm(T.suspension - 0.1, T.suspension + 0.1, t)), 66);
    const ps = proj(me.localToWorld(V(1.36, 0.75, 0.6))); if (ps.ok) { const sa = sm(T.suspension - 0.12, T.suspension + 0.1, t) * (1 - sm(T.luces - 0.1, T.luces + 0.1, t)); if (sa > 0.01) { g.save(); g.globalAlpha = sa; g.translate(ps.x, ps.y); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, s * 40); g.lineTo(0, s * 95); g.strokeStyle = GREEN2; g.lineWidth = 8; g.stroke(); g.beginPath(); g.moveTo(-16, s * 80); g.lineTo(0, s * 100); g.lineTo(16, s * 80); g.stroke(); } g.restore(); } }
  }
  // parado a 1 m (sin choque)
  chip(540, 1080, '✓  SIN CHOQUE · PARADO A 1 M', GREEN2, sm(T.stop - 0.05, T.stop + 0.15, t) * (1 - sm(T.pasiva + 0.2, T.pasiva + 0.5, t)), 1.0, null, 58);
  // seguridad PASIVA: durante el golpe (repetición en «rayos X»)
  const Pz = sm(T.pasiva - 0.1, T.pasiva + 0.2, t) * (1 - sm(T.activa2 - 0.3, T.activa2, t));
  if (Pz > 0.01) {
    big('SEGURIDAD PASIVA', ORANGE2, Pz, 560);
    chip(540, 680, 'DURANTE EL GOLPE · MENOS DAÑO', ORANGE2, sm(T.durante - 0.1, T.durante + 0.15, t) * Pz, 0.92, 'o', 50);
    const F = [['CINTURÓN', T.cinturon], ['AIRBAGS', T.airbags], ['REPOSACABEZAS', T.reposa], ['DEFORMACIÓN PROGRAMADA', T.carroceria], ['HABITÁCULO RÍGIDO', T.habitaculo]];
    F.forEach(([s1, tc], j) => { const a = sm(tc - 0.12, tc + 0.12, t) * Pz, hot = pulse(t, tc + 0.25, 0.4); chip(j < 4 ? 300 + (j % 2) * 480 : 540, 1450 + Math.floor(j / 2) * 105, s1, ORANGE2, a, 0.88 + 0.18 * hot, null, 48); });
  }
  // resumen: una evita el choque, la otra reduce el daño
  const S = sm(T.activa2 - 0.15, T.activa2 + 0.15, t) * (1 - sm(T.ojo - 0.3, T.ojo, t));
  if (S > 0.01) {
    const pm = proj(V(LX, 2.0, STOP_Z)), pcx = proj(V(CR.x, 2.0, CR.z));
    chip(pm.x, pm.y + 30, 'ACTIVA: EVITA EL CHOQUE', GREEN2, S * sm(T.activa2 - 0.15, T.activa2 + 0.1, t), 1.0, 'ok', 54);
    chip(pcx.x, pcx.y - 30, 'PASIVA: REDUCE EL DAÑO', ORANGE2, S * sm(T.pasiva2 - 0.15, T.pasiva2 + 0.1, t), 1.0, 'o', 54);
  }
  // ojo, bombero: el airbag de cortina sin saltar
  const B = sm(T.airbag - 0.15, T.airbag + 0.15, t) * (1 - sm(T.escribe - 0.4, T.escribe - 0.1, t));
  if (B > 0.01) {
    const fwd = V(Math.cos(CR.th), 0, -Math.sin(CR.th)), rgt = V(Math.sin(CR.th), 0, Math.cos(CR.th));
    const cpw = V(CR.x + fwd.x * -0.3 + rgt.x * -0.72, 1.37, CR.z + fwd.z * -0.3 + rgt.z * -0.72), pp = proj(cpw);
    if (pp.ok) { const b = 1 + 0.18 * Math.max(0, Math.sin(t * 9)); g.save(); g.globalAlpha = B; g.translate(pp.x, pp.y); g.scale(b, b); g.beginPath(); g.ellipse(0, 0, 150, 60, 0, 0, 7); g.strokeStyle = RED2; g.lineWidth = 6; g.stroke(); g.restore(); }
    chip(pp.x, Math.max(pp.y + 120, 700), 'AIRBAG SIN SALTAR', RED2, B, 1.0, 'warn', 58);
  }
  stamp('¡PUEDE SALTAR!', 1180, RED2, sm(T.saltar2 - 0.15, T.saltar2 + 0.1, t) * (1 - sm(T.escribe - 0.4, T.escribe - 0.1, t)), 120, -0.05);
  big('¡OJO, BOMBERO!', RED2, sm(T.ojo - 0.1, T.ojo + 0.15, t) * (1 - sm(T.escribe - 0.4, T.escribe - 0.1, t)), 560, 120);
  // final: escribe tu letra en comentarios (sin dar la respuesta)
  const ce = sm(T.comentarios - 0.1, T.comentarios + 0.2, t) * (1 - sm(T.fin - 0.3, T.fin + 0.05, t));
  if (ce > 0) {
    const b = 1 + 0.05 * Math.max(0, Math.sin((t - T.comentarios) * 6));
    g.save(); g.globalAlpha = ce; g.translate(540, 1560); g.scale(b, b); rr(-390, -56, 780, 112, 56); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('💬  ESCRIBE TU LETRA EN COMENTARIOS', 0, 20, 54, '#F2F5F8', 400, 'center', 'Bebas'); g.restore();
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
  const fl0 = 0, fl1 = Math.exp(-Math.pow((t - T.tiempo - 0.03) / 0.07, 2)) * 0.35, fl2 = Math.exp(-Math.pow((t - T.deforma - 0.1) / 0.07, 2)) * 0.25;
  finMat.uniforms.uFlash.value = Math.max(fl0, fl1, fl2);
  if (Math.max(fl0, fl1) >= fl2) finMat.uniforms.uFlashCol.value.setRGB(1, 0.3, 0.25); else finMat.uniforms.uFlashCol.value.setRGB(1, 0.75, 0.45);
  finMat.uniforms.uDim.value = (t >= T.fin ? mx(1, 0.5, sm(T.compartir - 0.2, T.compartir + 0.3, t)) : 1) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  overlay(t);
};
window.__cam = t => { const P = camAt(t); return [P.p.x, P.p.y, P.p.z].map(v => +v.toFixed(2)).concat([+P.fov.toFixed(1)]); };
window.__T = () => T;
window.renderCover = () => window.renderAt(window.COVER_T ?? 1.0);

(async () => {
  try {
    while (!_r2d) await new Promise(r => setTimeout(r, 30));
    await document.fonts.ready;
    NOISE = noiseTex(); mats();
    setupTimes(); buildWorld();
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'seguridad: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
