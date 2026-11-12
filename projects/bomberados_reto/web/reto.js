// «Reta a otro opositor» — el 1 vs 1 de la app (idea de Adrián, «MIÉRCOLES 11 FOMO JUGADOR») hecho con el MENSAJE
// (bomberados/MENSAJE.md) y el plan del 11 nov: el duelo es el marco y la pregunta es de bomberos en acción. Un coche en
// llamas en la autovía, de noche; tú con la manguera y tu rival (holograma rojo) que ya ha contestado: ¿de frente, por
// detrás o en diagonal? El rival va de frente y, a cámara lenta, el amortiguador del parachoques sale disparado y le pasa
// rozando; la buena: por la esquina, a 45° (rayos X: los amortiguadores de delante y de detrás y sus zonas de disparo).
// Madrid: casi cinco por plaza (cuatro rivales). Al final, la grabación REAL del 1 vs 1 (out/rec_1vs1, preparar.sh).
// Motor de projects/bomberados_mangueras/web/mangueras.js (+ el coche de bomberados_seguridad).
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

// ================================================================== el mundo: autovía de noche, coche ardiendo, la autobomba, tú y el rival
const world = new THREE.Group(); scene.add(world);
const BLUE2 = '#3FB6FF', RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D';
const COLS = ['#FF7A1A', '#2DD4BF', '#F0457A'];
const CAR_F = 2.33, CAR_B = -2.27, CAR_W = 0.91;          // morro (+X), cola y medio ancho del coche
const CORNER = V(CAR_B, 0, -CAR_W);                         // esquina trasera izquierda: por donde entras tú (a 45°)
const DIAG = V(-Math.SQRT1_2, 0, -Math.SQRT1_2);           // la diagonal, hacia fuera
const YOU0 = V(-11.2, 0, -3.9), YOU1 = CORNER.clone().addScaledVector(DIAG, 5.6), YOU2 = CORNER.clone().addScaledVector(DIAG, 2.5);
const RIV0 = V(13.5, 0, 0), RIV1 = V(6.3, 0, 0), PA0 = V(10.5, 0, 0), PB0 = V(-10, 0, 0);
const STRUT0 = V(2.05, 0.47, -0.52);                        // amortiguador delantero izquierdo (el que sale disparado)
const SMK = [[0.11, 0.1, 0.095], [0.08, 0.077, 0.075], [0.06, 0.06, 0.063], [0.045, 0.045, 0.05]];
const STEAM_C = [[0.55, 0.57, 0.6], [0.42, 0.44, 0.47], [0.3, 0.31, 0.33], [0.2, 0.2, 0.22]];
let car, cu, struts = [], strutMF = [], strutMR = [], shot, trail, trailM, burst, flash, truck, beacons = [], fireE, fireC, fireL, fireL2, plume, steam;
let you, nozzle, hoseMesh2 = null, hoseKey = '', hoseMat, jet, youRing, rival, rivals = [], paths = [], zones = [], diags = [], arcM, refU, spot;

// ------------------------------------------------------------------ holograma (el rival): fresnel + líneas de barrido + fallos
const HOLO_V = `uniform float uTime, uGl; varying vec3 vN; varying vec3 vV; varying vec3 vW;
float hh(float n){ return fract(sin(n * 91.7) * 43758.5453); }
void main(){ vec4 w = modelMatrix * vec4(position, 1.0);
  float b = floor(w.y * 7.0 + uTime * 11.0); w.x += uGl * (hh(b + floor(uTime * 24.0)) - 0.5) * 0.35; w.z += uGl * (hh(b * 1.7 + floor(uTime * 24.0)) - 0.5) * 0.2;
  vW = w.xyz; vec4 mv = viewMatrix * w; vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;
const HOLO_F = `uniform float uI, uTime, uGl, uH; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; varying vec3 vW;
float hh(float n){ return fract(sin(n * 91.7) * 43758.5453); }
void main(){
  if (vW.y > uH) discard;
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float scan = 0.6 + 0.4 * smoothstep(0.25, 0.75, fract(vW.y * 16.0 - uTime * 1.6));
  float gl = uGl * step(0.55, hh(floor(vW.y * 7.0 + uTime * 11.0) + floor(uTime * 24.0)));
  float a = (0.07 + 0.9 * f) * scan * (1.0 - 0.75 * gl) + 2.5 * smoothstep(0.05, 0.0, abs(vW.y - uH));
  gl_FragColor = vec4(uCol * a * uI, 1.0);
}`;
function addLegs(ff) {              // las piernas, en pivotes en la cadera (para andar)
  ff.updateMatrixWorld(true);
  const legs = [-1, 1].map(s => { const L = new THREE.Group(); L.position.set(0.11 * s, 0.85, 0); ff.add(L); return L; });
  ff.updateMatrixWorld(true);
  for (const m of [...ff.children]) if (m.isMesh && m.position.y < 0.8 && Math.abs(Math.abs(m.position.x) - 0.11) < 0.01) legs[m.position.x > 0 ? 1 : 0].attach(m);
  ff.userData.legs = legs; return ff;
}
function walkPose(ff, ph, k) {      // ph: fase del paso; k: 0 quieto … 1 andando
  const L = ff.userData.legs, s = Math.sin(ph) * 0.42 * k;
  L[0].rotation.x = s; L[1].rotation.x = -s;
}
function face(o, dir) { o.rotation.y = Math.atan2(-dir.x, -dir.z); }      // el bombero mira hacia −Z
function makeHolo(col) {
  const f = addLegs(makeFirefighter());
  const u = { uI: { value: 0 }, uTime: { value: 0 }, uGl: { value: 0 }, uH: { value: 9 }, uCol: { value: new THREE.Color(col) } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: HOLO_V, fragmentShader: HOLO_F, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
  f.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; o.renderOrder = 15; } });
  const ringM = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.6, 48), ringM); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.renderOrder = 9; f.add(ring);
  f.userData.u = u; f.userData.ringM = ringM; f.visible = false; world.add(f);
  return f;
}
function holoSet(h, t, tau, a, gl, hFrac) {   // a: intensidad; gl: fallos; hFrac: 0…1 cuánto se ha materializado (de abajo arriba)
  const u = h.userData.u, s = h.scale.y;
  h.visible = a > 0.003;
  u.uI.value = a; u.uTime.value = tau; u.uGl.value = gl; u.uH.value = (hFrac >= 1 ? 9 : hFrac * 1.95) * s;
  h.userData.ringM.opacity = 0.9 * a;
}

// ------------------------------------------------------------------ marcas en el suelo: caminos, zonas de disparo y diagonales
const STRIP_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const STRIP_F = `uniform float uI, uTime, uLen, uMode, uGrow; uniform vec3 uCol; varying vec2 vUv;
void main(){
  if (vUv.x > uGrow) discard;
  float edge = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.86, vUv.y);
  float a;
  if (uMode < 0.5) {            // camino: flechas que avanzan hacia el coche
    float s = fract(vUv.x * uLen / 1.3 - uTime * 1.3 - abs(vUv.y - 0.5) * 0.9);
    a = (0.22 + 0.78 * smoothstep(0.0, 0.1, s) * smoothstep(0.5, 0.38, s)) * edge;
  } else if (uMode < 1.5) {     // zona de disparo: rayas que salen del coche
    float s = fract((vUv.x * uLen + vUv.y * 2.4) / 1.1 - uTime * 0.9);
    a = (0.18 + 0.55 * step(0.5, s)) * (0.55 + 0.45 * edge) * smoothstep(1.0, 0.7, vUv.x);
  } else {                      // línea segura
    a = edge * (0.7 + 0.3 * sin(vUv.x * uLen * 1.6 - uTime * 5.0));
  }
  a *= uI;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uCol * a, a);
}`;
function strip(p0, p1, w, col, mode, y = 0.03) {
  const d = p1.clone().sub(p0), len = d.length();
  const geo = new THREE.PlaneGeometry(len, w); geo.rotateX(-Math.PI / 2);
  const u = { uI: { value: 0 }, uTime: { value: 0 }, uLen: { value: len }, uMode: { value: mode }, uGrow: { value: 1 }, uCol: { value: new THREE.Color(col).multiplyScalar(1.6) } };
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: STRIP_V, fragmentShader: STRIP_F, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false }));
  m.position.copy(p0).add(p1).multiplyScalar(0.5); m.position.y = y; m.rotation.y = -Math.atan2(d.z, d.x); m.renderOrder = 9; world.add(m);
  return u;
}
function arrowHead(p, dir, s, col) {
  const sh = new THREE.Shape(); sh.moveTo(s, 0); sh.lineTo(-s * 0.6, s * 0.8); sh.lineTo(-s * 0.25, 0); sh.lineTo(-s * 0.6, -s * 0.8); sh.closePath();
  const geo = new THREE.ShapeGeometry(sh); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const m = new THREE.Mesh(geo, mat); m.position.set(p.x, 0.035, p.z); m.rotation.y = -Math.atan2(dir.z, dir.x); m.renderOrder = 9; world.add(m);
  return mat;
}

// ------------------------------------------------------------------ construir
function buildWorld() {
  world.add(new THREE.HemisphereLight(0x2c3d62, 0x0a0705, 0.42));
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.22); moon.position.set(-30, 50, -25); world.add(moon);
  // autovía: asfalto, marcas, arcén, bionda y mediana; árboles y farolas
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#16171a'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 12000; i++) { const v = 16 + rnd(i) * 26; x.fillStyle = `rgba(${v},${v},${v + 3},0.6)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 4 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(70, 70);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ map: asph, color: 0x5c5c5c, roughness: 0.55, metalness: 0.12 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
  const verge = new THREE.Mesh(new THREE.PlaneGeometry(320, 80), new THREE.MeshStandardMaterial({ color: 0x14160f, roughness: 1 })); verge.rotation.x = -Math.PI / 2; verge.position.set(0, 0.01, 45.5); verge.receiveShadow = true; world.add(verge);
  const lineM = new THREE.MeshStandardMaterial({ color: 0xd9d9d0, roughness: 0.4, emissive: 0x1c1c1a });
  for (const z of [1.85, -5.35]) { const l = new THREE.Mesh(new THREE.BoxGeometry(260, 0.012, 0.15), lineM); l.position.set(0, 0.008, z); l.receiveShadow = true; world.add(l); }
  for (let i = 0; i < 30; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.012, 0.15), lineM); d.position.set(-130 + i * 9, 0.008, -1.75); d.receiveShadow = true; world.add(d); }
  const steel = new THREE.MeshStandardMaterial({ color: 0x8c9198, metalness: 0.8, roughness: 0.35 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(200, 0.32, 0.07), steel); rail.position.set(0, 0.62, 5.0); rail.castShadow = true; world.add(rail);
  for (let i = 0; i < 100; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), steel); p.position.set(-100 + i * 2, 0.375, 5.08); world.add(p); }
  const conc = new THREE.MeshStandardMaterial({ color: 0x6d6e70, roughness: 0.9 });
  const med = new THREE.Mesh(new THREE.BoxGeometry(200, 0.85, 0.55), conc); med.position.set(0, 0.425, -6.15); med.castShadow = true; med.receiveShadow = true; world.add(med);
  const treeM = new THREE.MeshStandardMaterial({ color: 0x0c140c, roughness: 1 });
  for (let i = 0; i < 46; i++) {
    const x = -110 + i * 4.8 + rnd(i * 3.3) * 3, z = 9 + rnd(i * 7.1) * 16, h = 3.5 + rnd(i * 1.9) * 4;
    const tr = new THREE.Mesh(new THREE.ConeGeometry(1.1 + rnd(i) * 0.8, h, 7), treeM); tr.position.set(x, h / 2, z); world.add(tr);
  }
  for (const x of [-62, -22, 22, 62]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 10, 10), steel); pole.position.set(x, 5, -6.15); world.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.0), steel); arm.position.set(x, 9.9, -5.2); world.add(arm);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.3), GLOW(0xffb070, 2.4)); lamp.position.set(x, 9.82, -4.3); world.add(lamp);
    const l = new THREE.PointLight(0xffa860, 70, 0, 2); l.position.set(x, 9.5, -4.3); world.add(l);
  }
  // el coche: quemado, sin nadie dentro; los cuatro amortiguadores del parachoques (se ven con rayos X)
  car = makeCar({ color: 0x4a1610, xcol: 0xff8a5a }); world.add(car); cu = car.userData;
  cu.I.drv.visible = false; cu.I.bagD.visible = false; cu.I.bagP.visible = false; cu.I.curtain.visible = false;
  cu.paint.roughness = 0.72; cu.paint.clearcoat = 0; cu.paint.metalness = 0.2;            // pintura quemada, sin brillo
  cu.glass.roughness = 0.3; cu.glass.clearcoat = 0; cu.glass.metalness = 0.3; cu.glass.opacity = 0.5;   // cristal ahumado (pulido + el fuego pegado = valores infinitos)
  cu.L.head.forEach(h => h.material.color.setScalar(0.1)); cu.L.tail.forEach(h => h.material.color.setRGB(0.2, 0.02, 0.01));
  const mkStrut = (mb, mr) => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.3, 16), mb); b.rotation.z = Math.PI / 2; b.position.x = -0.08; g.add(b);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.24, 12), mr); r.rotation.z = Math.PI / 2; r.position.x = 0.16; g.add(r);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16), mr); c.rotation.z = Math.PI / 2; c.position.x = 0.28; g.add(c);
    return g;
  };
  const smat = () => [new THREE.MeshStandardMaterial({ color: 0xa8aeb6, metalness: 0.85, roughness: 0.28, emissive: 0xff2a0a, emissiveIntensity: 0 }),
    new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.3, emissive: 0xff2a0a, emissiveIntensity: 0 })];
  strutMF = smat(); strutMR = smat();
  for (const [x, s, m] of [[2.0, 1, strutMF], [-1.95, -1, strutMR]]) for (const z of [-0.52, 0.52]) {
    const g = mkStrut(m[0], m[1]); g.position.set(x, 0.47, z); g.scale.x = s; g.traverse(o => { if (o.isMesh) o.renderOrder = 17; }); cu.body.add(g); struts.push(g);
  }
  shot = mkStrut(...smat()); shot.visible = false; shot.scale.setScalar(1.5); world.add(shot);
  shot.traverse(o => { if (o.isMesh) o.material.emissiveIntensity = 3.0; });
  trailM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.42, 0.12).multiplyScalar(2.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  trail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.0, 1, 12, 1, true), trailM); trail.renderOrder = 14; world.add(trail);   // estela del amortiguador
  // fuego: motor y habitáculo, llamas por debajo, humo negro que sube y luz que parpadea
  fireE = fireSet(world, V(1.5, 0.95, 0), tongues(11, 3, (i, r) => [0.75 + i * 0.13 + (r(1) - 0.5) * 0.1, 0.92, (r(2) - 0.5) * 1.2, 0.75 + 0.4 * r(3), 2.0 + 1.5 * r(4)]),
    { seed: 3, extent: [0.8, 0.1, 0.6], smokeN: 40, smokeSize: 1.2, smokeY: 2.6, emberN: 90, bright: 1.55 });
  fireC = fireSet(world, V(-0.4, 1.25, 0), tongues(10, 7, (i, r) => [-1.5 + i * 0.24 + (r(1) - 0.5) * 0.1, 1.15, (r(2) - 0.5) * 1.0, 0.85 + 0.45 * r(3), 2.4 + 1.6 * r(4)]),
    { seed: 7, extent: [1.1, 0.1, 0.5], smokeN: 40, smokeSize: 1.3, smokeY: 2.8, emberN: 70, bright: 1.45 });
  fireL = new THREE.PointLight(0xff6a1a, 150, 0, 2); fireL.position.set(0.5, 1.9, 0); world.add(fireL);
  fireL2 = new THREE.PointLight(0xff5a10, 30, 0, 2); fireL2.position.set(0, 0.3, -1.2); world.add(fireL2);
  plume = new Parts(120, { life: 8, rise: 2.5, acc: 0.09, size: 2.6, grow: 2.8, turb: 1.1, conv: 0.0, rot: 6.28, opacity: 0.66, c: SMK, seed: 31, extent: [1.8, 0.5, 0.8], order: 11 });
  plume.at(0.2, 3.4, 0); world.add(plume.mesh);
  steam = new Parts(90, { life: 2.6, rise: 1.7, acc: 0.1, size: 1.0, grow: 2.4, turb: 0.6, rot: 6.28, opacity: 0, c: STEAM_C, seed: 41, extent: [1.2, 0.3, 0.8], order: 11 });
  steam.at(-1.2, 1.3, -0.5); world.add(steam.mesh);
  // el disparo: chispas y un fogonazo en el parachoques
  burst = new Parts(700, { jet: true, life: 0.9, v0: 9, drag: 2.2, size: 0.03, grow: 0.15, spreadA: 0.5, spreadB: 0.4, grav: 3, opacity: 1, add: true, c: EMBER_C, seed: 19, edge: 0.2, order: 13 });
  burst.at(STRUT0.x + 0.35, STRUT0.y, STRUT0.z); burst.u.uDir.value.set(1, 0.25, 0.1).normalize(); world.add(burst.mesh);
  flash = new Flames([[2.5, 0.35, -0.45, 1.3, 1.2], [2.6, 0.4, 0.0, 1.0, 0.9], [2.45, 0.35, 0.45, 0.9, 0.8]], { seed: 23, bright: 1.5 }); world.add(flash.mesh);
  // la autobomba, detrás (con los rotativos y los faros sobre el coche)
  truck = makeTruck(); truck.position.set(-19, 0, -0.9); world.add(truck);
  truck.traverse(o => { if (o.isMesh) o.castShadow = true; }); beacons = truck.userData.lbar;
  spot = new THREE.SpotLight(0xfff0d8, 45, 70, 0.22, 0.6, 1.6); spot.position.set(-14.9, 1.3, -0.9); spot.target.position.set(0, 0.6, 0);
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0004; world.add(spot, spot.target);
  // tú: el bombero con la lanza (y su manguera desde la autobomba)
  you = addLegs(makeFirefighter()); you.position.copy(YOU0); face(you, V(-YOU0.x, 0, -YOU0.z).normalize()); world.add(you);
  you.traverse(o => { if (o.isMesh) o.castShadow = true; });
  nozzle = new THREE.Group(); nozzle.position.set(0.02, 1.0, -0.38); you.add(nozzle);
  const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.05, 0.42, 16), M.chrome); nz.rotation.x = Math.PI / 2; nozzle.add(nz);
  const hd = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.14, 0.06, 2, 0.02), M.black); hd.position.set(0, -0.08, 0.06); nozzle.add(hd);
  const bale = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0xc8231b, roughness: 0.4 })); bale.position.set(0, 0.03, -0.05); nozzle.add(bale);
  hoseMat = new THREE.MeshStandardMaterial({ color: 0xe9e3d3, roughness: 0.65 });
  youRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD2).multiplyScalar(1.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  youRing.rotation.x = -Math.PI / 2; youRing.renderOrder = 9; world.add(youRing);
  jet = waterJet(1500, { v0: 10, drag: 1.4, life: 0.75, size: 0.06, spreadA: 0.04, spreadB: 0.06, grav: 2.2, seed: 9, opacity: 0.7 }); world.add(jet.mesh);
  // el rival (holograma rojo) y los otros tres de la oposición
  rival = makeHolo(0xff3a22);
  for (let i = 0; i < 4; i++) { const h = makeHolo(0xff3a22); h.scale.setScalar(2.1); rivals.push(h); }
  [[7.5, 3.4], [-7.5, -2.2], [7.5, -3.4], [-7.5, 2.2]].forEach(([x, z], i) => { const p = V(x, 0, z); rivals[i].position.copy(p); face(rivals[i], p.clone().negate().normalize()); });
  // los tres caminos (A de frente, B por detrás, C en diagonal)
  const pA0 = PA0.clone(), pA1 = V(CAR_F + 0.6, 0, 0), pB0 = PB0.clone(), pB1 = V(CAR_B - 0.6, 0, 0), pC0 = YOU1.clone(), pC1 = CORNER.clone().addScaledVector(DIAG, 0.6);
  for (const [a, b, i] of [[pA0, pA1, 0], [pB0, pB1, 1], [pC0, pC1, 2]]) {
    const u = strip(a, b, 0.8, COLS[i], 0); const d = b.clone().sub(a).normalize();
    paths.push({ u, head: arrowHead(b.clone().addScaledVector(d, 0.25), d, 0.75, COLS[i]), p0: a, p1: b });
  }
  // zonas de disparo (delante y detrás) y las cuatro diagonales seguras con el ángulo de 45°
  zones.push(strip(V(CAR_F + 0.05, 0, 0), V(CAR_F + 11.5, 0, 0), 2.7, '#FF2A14', 1, 0.034));
  zones.push(strip(V(CAR_B - 0.05, 0, 0), V(CAR_B - 11.5, 0, 0), 2.7, '#FF2A14', 1, 0.034));
  world.children.slice(-2).forEach(m => { m.renderOrder = 12; });                 // por encima del humo (se ven desde arriba)
  for (const [cx, sz] of [[CAR_B, -1], [CAR_B, 1], [CAR_F, -1], [CAR_F, 1]]) {
    const c0 = V(cx, 0, sz * CAR_W), d = V(Math.sign(cx) * Math.SQRT1_2, 0, sz * Math.SQRT1_2);
    diags.push(strip(c0.clone().addScaledVector(d, 0.15), c0.clone().addScaledVector(d, 8.5), 0.22, GREEN2, 2, 0.036));
  }
  refU = strip(CORNER.clone(), CORNER.clone().add(V(-3.4, 0, 0)), 0.07, '#FFFFFF', 2, 0.037);
  arcM = new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD2).multiplyScalar(2.0), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  const arc = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.7, 40, 1, Math.PI * 0.75, Math.PI * 0.25), arcM); arc.rotation.x = -Math.PI / 2; arc.position.set(CORNER.x, 0.038, CORNER.z); arc.renderOrder = 9; world.add(arc);
}
function hoseUpdate() {              // la manguera: del racor de la autobomba, por el suelo, a tus manos (se rehace si te mueves)
  const key = you.position.x.toFixed(3) + ',' + you.position.z.toFixed(3) + ',' + you.rotation.y.toFixed(3);
  if (key === hoseKey) return; hoseKey = key;
  you.updateMatrixWorld(true); truck.updateMatrixWorld(true);
  const out = truck.localToWorld(V(1.8, 0.95, -1.3)), hand = you.localToWorld(V(0.02, 0.97, -0.18)), back = you.localToWorld(V(0.1, 0.07, 0.55));
  const pts = [out, out.clone().add(V(0.15, -0.55, -0.35)), V(out.x + 0.5, 0.07, out.z - 1.0)];
  const n = 4; for (let i = 1; i <= n; i++) { const k = i / (n + 1); pts.push(V(mx(out.x + 0.5, back.x, k), 0.07, mx(out.z - 1.0, back.z, k) - 0.8 * Math.sin(Math.PI * k))); }
  pts.push(back, you.localToWorld(V(0.06, 0.5, 0.25)), hand);
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const geo = new THREE.TubeGeometry(curve, 220, HOSE_R, 10, false);
  if (!hoseMesh2) { hoseMesh2 = new THREE.Mesh(geo, hoseMat); hoseMesh2.castShadow = true; world.add(hoseMesh2); }
  else { hoseMesh2.geometry.dispose(); hoseMesh2.geometry = geo; }
}

// ------------------------------------------------------------------ tiempos y cámara (un dron que no para)
let T = {}, KEYS = null, TAU = t => t;
function setupTimes() {
  T = { ...CUE, end: END };
  const L = window.LINES_;
  T.count0 = L[2].end + 0.05; T.count1 = T.count0 + 4.0;
  T.fin = T.compartir - 0.25;
  T.l0 = T.disparado + 0.02;                                        // ¡pum!: sale el amortiguador (cámara lenta)
  TAU = warp([[0, 1], [T.l0 - 0.2, 1], [T.l0 + 0.02, 0.1], [T.l0 + 1.5, 0.1], [T.l0 + 1.9, 1]]);
  T.walk0 = T.rival4 - 0.1; T.walk1 = T.l0 - 0.1;                   // el rival avanza de frente
  T.go0 = T.esquina - 1.3; T.go1 = T.grados - 0.15;                  // tú: por la diagonal hasta la esquina
  KEYS = camKeys();
}
function camKeys() {
  const K = [
    [0, [8.2, 1.9, -6.8, 0.2, 1.4, 0, 38]],                          // el coche en llamas, de tres cuartos
    [T.llamas + 0.2, [2.0, 2.6, -9.6, -2.5, 1.3, -1.0, 40]],
    [T.rival1, [-16.0, 2.9, -7.2, -2.0, 0.9, -0.6, 40]],              // detrás de ti: tú, la manguera y el coche al frente
    [T.manguera, [-13.8, 1.55, -5.6, -2.0, 1.1, -0.5, 40]],
    [T.oA, [-15, 14, -2.4, 0.5, 0, -0.8, 42]],                       // alto, por detrás del coche: A arriba, B abajo, C en diagonal
    [T.oC, [-14, 15.5, -4.2, 0.5, 0, -0.9, 42]],
    [T.count0, [-3, 18, -15.5, 0.5, 0, -0.5, 42]],                   // órbita durante la cuenta
    [T.count0 + 2.0, [8, 17, -13, 0.5, 0, -0.5, 42]],
    [T.count1, [14, 15, -5, 0.5, 0, -0.3, 42]],
    [T.tiempo + 0.25, [19.5, 3.0, -0.9, 4.0, 0.9, -0.2, 40]],           // por delante, detrás del rival: aparece y va de frente
    [T.frente4, [16.5, 1.9, -0.8, 3.5, 0.9, -0.2, 40]],
    [T.amortiguador, [15.5, 1.6, -0.8, 2.6, 0.6, -0.3, 38]],          // el rival y, al fondo, el parachoques (rayos X)
    [T.l0, [11.5, 1.1, -1.3, 4.2, 0.6, -0.1, 40]],                    // ¡pum!
    [T.l0 + 1.5, [10.5, 1.05, -1.6, 4.8, 0.6, -0.15, 38]],            // a cámara lenta: el amortiguador vuela hacia el rival
    [T.punto, [2, 9, -10, 0.5, 0.5, -0.3, 42]],                       // sube…
    [T.delante, [-8, 26, -1.6, 7.5, 0, -0.3, 46]],                    // …desde arriba: la zona de delante
    [T.detras5, [-12, 30, -1.4, -1.0, 0, -0.3, 46]],                  // y la de detrás
    [T.esquina - 0.4, [-16, 24, -1.5, 0.8, 0, -0.3, 46]],             // tú, por la diagonal
    [T.cuarenta, [-15, 21, -3.0, -1.0, 0, -1.0, 44]],
    [T.grados + 0.3, [-10, 10, -8, -1.5, 0.5, -0.8, 42]],              // abres la lanza
    [T.madrid + 0.8, [-13, 12, -9, -0.5, 0.8, -0.6, 42]],
    [T.unrival, [-21, 17, -4, 1, 3.4, -0.3, 46]],                     // los cuatro rivales alrededor
    [T.cuatro + 0.6, [-22, 17.5, -3.2, 1, 3.4, -0.3, 46]],
    [T.habrias, [12, 16, -22, 0, 1, 0, 42]],
    [T.fin, [16, 22, -30, 0, 1, 0, 42]],
    [T.end, [18, 28, -36, 0, 1, 0, 44]],
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
  const sh = Math.exp(-Math.pow((t - T.tiempo - 0.05) / 0.12, 2)) * 0.14 + Math.exp(-Math.pow((t - T.l0 - 0.04) / 0.16, 2)) * 0.07;
  return pose(V(v[0] + sh * Math.sin(t * 91), v[1] + sh * Math.cos(t * 77), v[2]), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
function strutPos(t) {               // el amortiguador que sale disparado (en el tiempo deformado)
  const s = TAU(t) - TAU(T.l0);
  if (s < 0) return null;
  return { p: V(STRUT0.x + 0.2 + 24 * s, STRUT0.y + 1.6 * s - 4.9 * s * s, STRUT0.z + 1.3 * s), s };
}
function update(t) {
  const tau = TAU(t);
  const P = camAt(t);
  cam.position.copy(P.p); cam.quaternion.copy(P.q); cam.fov = P.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = false;
  FLAMES.forEach(f => { f.u.uCam.value.copy(cam.position); f.u.uTime.value = tau; });
  // el fuego: a tope hasta que tú abres la lanza; luego baja y sale vapor
  const water = sm(T.grados + 0.3, T.grados + 3.5, t);
  const fk = 1 - 0.55 * water;
  for (const F of [fireE, fireC]) { F.s.u.uTime.value = tau; F.e.u.uTime.value = tau; F.F.u.uInt.value = fk; F.s.u.uOpacity.value = 0.55; F.e.u.uOpacity.value = fk; }
  fireL.intensity = (130 + 45 * Math.sin(tau * 17) * Math.sin(tau * 4.7)) * (0.5 + 0.5 * fk);
  fireL2.intensity = (28 + 10 * Math.sin(tau * 23)) * fk;
  const top = sm(T.punto, T.delante, t) * (1 - sm(T.grados, T.madrid, t));       // vista desde arriba: menos humo encima de las zonas
  plume.u.uTime.value = tau; plume.u.uOpacity.value = 0.66 * (1 - 0.35 * water) * (1 - 0.6 * top);
  steam.u.uTime.value = tau; steam.u.uOpacity.value = 0.42 * water;
  // rotativos
  const ph = (tau * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = 8 + 70 * on;
  // rayos X: antes del disparo (los amortiguadores de delante, al rojo) y en la explicación (delante y detrás)
  const xr = Math.max(0.55 * sm(T.amortiguador - 0.2, T.amortiguador + 0.2, t) * (1 - sm(T.l0 + 1.9, T.l0 + 2.3, t)),
    0.8 * sm(T.delante - 0.3, T.delante + 0.1, t) * (1 - sm(T.esquina - 0.2, T.esquina + 0.3, t)));
  setXray(car, xr);
  const hotF = Math.max(sm(T.amortiguador - 0.1, T.l0, t) * (1 - sm(T.l0 + 2.0, T.l0 + 2.4, t)), sm(T.delante - 0.2, T.delante + 0.1, t) * (1 - sm(T.esquina - 0.2, T.esquina + 0.3, t)));
  const hotR = sm(T.detras5 - 0.2, T.detras5 + 0.1, t) * (1 - sm(T.esquina - 0.2, T.esquina + 0.3, t));
  const fl = 0.75 + 0.25 * Math.sin(t * 9);
  strutMF.forEach(m => { m.emissiveIntensity = 2.2 * hotF * fl; }); strutMR.forEach(m => { m.emissiveIntensity = 2.2 * hotR * fl; });
  // ¡pum!: el amortiguador delantero izquierdo sale disparado (con chispas y un fogonazo)
  const sp = strutPos(t);
  struts[0].visible = !sp;
  shot.visible = !!sp && sp.p.x < 40;
  if (sp) { shot.position.copy(sp.p); shot.rotation.set(0, sp.s * 9, sp.s * 26); }
  if (sp && sp.p.x < 40) {
    const tail = V(Math.max(STRUT0.x + 0.2, sp.p.x - 1.8), 0, 0); tail.y = STRUT0.y + (sp.p.y - STRUT0.y) * (tail.x - STRUT0.x - 0.2) / Math.max(1e-3, sp.p.x - STRUT0.x - 0.2); tail.z = STRUT0.z + (sp.p.z - STRUT0.z) * (tail.x - STRUT0.x - 0.2) / Math.max(1e-3, sp.p.x - STRUT0.x - 0.2);
    const d = sp.p.clone().sub(tail), L = d.length();
    trail.visible = L > 0.05; trail.position.copy(tail).addScaledVector(d, 0.5); trail.scale.set(1, L, 1); trail.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    trailM.opacity = 0.75 * (1 - sm(T.l0 + 1.6, T.l0 + 2.1, t));
  } else trail.visible = false;
  const tl0 = TAU(T.l0);
  burst.u.uTime.value = tau; burst.u.uOn0.value = tl0; burst.u.uOn1.value = tl0 + 0.12;
  flash.u.uInt.value = sp ? Math.exp(-sp.s / 0.03) : 0;
  // el rival: holograma que aparece en «¡Tiempo!», avanza de frente, el amortiguador le pasa rozando y se deshace
  const rIn = sm(T.tiempo + 0.1, T.tiempo + 0.6, t), rOut = sm(T.punto - 0.4, T.punto + 0.1, t);
  const wk = e3(pr(t, T.walk0, T.walk1 - T.walk0));
  const hit = sp ? sm(0.15, 0.2, sp.s) : 0;                          // ya le ha pasado al lado
  rival.position.set(mx(RIV0.x, RIV1.x, wk) + 0.7 * e3(pr(tau, TAU(T.l0) + 0.17, 0.25)), 0, 0); face(rival, V(-1, 0, 0));
  rival.rotation.z = -0.35 * hit * (1 - rOut);
  walkPose(rival, tau * 7.5, (t > T.walk0 && t < T.walk1) ? 1 : 0);
  holoSet(rival, t, tau, (0.9 + 0.1 * Math.sin(t * 30)) * rIn * (1 - rOut), 0.15 + 0.85 * hit, rIn < 1 ? rIn : 1);
  // los cuatro rivales (Madrid: casi cinco por plaza)
  rivals.forEach((h, i) => {
    const t0 = i === 0 ? T.unrival - 0.3 : T.cuatro - 0.25 + (i - 1) * 0.12;
    const a = sm(t0, t0 + 0.5, t) * (1 - sm(T.fin - 0.4, T.fin, t));
    walkPose(h, 0, 0); holoSet(h, t, tau, 0.85 * a, 0.1 + 0.6 * pulse(t, t0 + 0.2, 0.2), a < 1 ? a : 1);
  });
  // tú: con la lanza; por la diagonal hasta la esquina y abres
  const gk = e3(pr(t, T.go0, T.go1 - T.go0)), seg = pr(t, T.go0, T.go1 - T.go0);
  const p = seg < 0.35 ? YOU0.clone().lerp(YOU1, e3(seg / 0.35)) : YOU1.clone().lerp(YOU2, e3((seg - 0.35) / 0.65));
  you.position.copy(t < T.go0 ? YOU0 : p);
  const aim = V(-1.0, 0.9, -0.55).sub(you.position); aim.y = 0;
  face(you, aim.normalize());
  walkPose(you, tau * 8, t > T.go0 && t < T.go1 ? 1 : 0);
  you.position.y = (t > T.go0 && t < T.go1) ? 0.025 * Math.abs(Math.sin(tau * 8)) : 0;
  hoseUpdate();
  youRing.position.set(you.position.x, 0.03, you.position.z);
  youRing.material.opacity = 0.9 * Math.max(sm(0.4, 0.9, t) * (1 - sm(T.oA - 0.4, T.oA, t)), sm(T.esquina - 0.8, T.esquina - 0.3, t) * (1 - sm(T.madrid, T.madrid + 0.4, t)));
  nozzle.updateMatrixWorld(true);
  const tip = nozzle.localToWorld(V(0, 0, -0.24)), dir = nozzle.localToWorld(V(0, 0, -1)).sub(nozzle.localToWorld(V(0, 0, 0))).normalize();
  jet.at(tip.x, tip.y, tip.z); jet.u.uDir.value.copy(dir.add(V(0, 0.16, 0)).normalize());
  jet.u.uTime.value = tau; jet.u.uOn0.value = TAU(T.grados + 0.1); jet.u.uOn1.value = 1e9;
  // marcas en el suelo
  paths.forEach((P, i) => {
    const t0 = [T.oA, T.oB, T.oC][i];
    const inn = sm(t0 - 0.25, t0 + 0.1, t), grow = e3(pr(t, t0 - 0.25, 0.5));
    const live = t > T.count0 && t < T.tiempo ? 1 + 0.35 * Math.sin((t - T.count0) * 6 - i * 2) : 1;
    let a = inn * live * (1 - sm(T.punto - 0.2, T.punto + 0.2, t));
    if (i === 0 && t > T.tiempo) a = Math.max(a, 0.7 * (1 - sm(T.l0 + 1.6, T.punto + 0.2, t)));
    if (i !== 0 && t > T.tiempo) a *= 0.35;
    P.u.uI.value = 0.9 * a; P.u.uGrow.value = grow; P.u.uTime.value = t; P.head.opacity = 0.85 * a * sm(0.85, 1, grow);
  });
  const zA = [sm(T.delante - 0.2, T.delante + 0.3, t), sm(T.detras5 - 0.2, T.detras5 + 0.3, t)];
  zones.forEach((u, i) => { u.uI.value = zA[i] * (1 - sm(T.madrid - 0.2, T.madrid + 0.3, t)) * (1 + 0.6 * pulse(t, T.piezas + 0.2, 0.3)); u.uTime.value = t; u.uGrow.value = e3(pr(t, [T.delante, T.detras5][i] - 0.2, 0.6)); });
  const dA = sm(T.esquina - 0.3, T.esquina + 0.2, t) * (1 - sm(T.madrid + 0.5, T.cuatro, t));
  diags.forEach((u, i) => { u.uI.value = dA * (i === 0 ? 1.4 : 0.8); u.uTime.value = t; u.uGrow.value = e3(pr(t, T.esquina - 0.3 + i * 0.08, 0.6)); });
  const g45 = sm(T.cuarenta - 0.25, T.cuarenta + 0.1, t) * (1 - sm(T.madrid + 0.5, T.cuatro, t));
  refU.uI.value = 1.2 * g45; refU.uTime.value = t; refU.uGrow.value = e3(pr(t, T.cuarenta - 0.25, 0.4));
  arcM.opacity = g45;
}

// ------------------------------------------------------------------ capa 2D
function proj(v) { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * W2, y: (-p.y * 0.5 + 0.5) * H2, ok: p.z < 1 }; }
function chip(x, y, text, col, a, s = 1, icon = null, px = 56) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a); g.translate(cl(x, 180, W2 - 180), cl(y, 820, H2 - 230)); g.scale(s, s);
  g.font = `400 ${px}px Bebas`; const tw = g.measureText(text).width, w = tw + (icon ? 100 : 60), h = px * 1.45;
  rr(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  const cx = -w / 2 + 46;
  if (icon === 'ok') { g.beginPath(); g.moveTo(cx - 16, 0); g.lineTo(cx - 4, 13); g.lineTo(cx + 18, -14); g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round'; g.stroke(); }
  else if (icon === 'warn') { g.beginPath(); g.moveTo(cx, -20); g.lineTo(cx + 21, 17); g.lineTo(cx - 21, 17); g.closePath(); g.fillStyle = col; g.fill(); txt('!', cx, 13, 30, '#0b0d10', 400, 'center', 'Bebas'); }
  txt(text, icon ? 24 : 0, px * 0.36, px, '#F4F6F8', 400, 'center', 'Bebas');
  g.restore();
}
function letterDot(x, y, L, col, a, r = 34) {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a); g.translate(cl(x, 60, W2 - 60), cl(y, 820, H2 - 240));
  g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 24; g.fill(); g.shadowBlur = 0;
  txt(L, 0, r * 0.5, r * 1.45, '#0b0d10', 400, 'center', 'Bebas'); g.restore();
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
function pill(x, y, text, col, a, px = 36, fill = 'rgba(8,10,14,0.86)') {
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a); g.font = `400 ${px}px Bebas`; const w = g.measureText(text).width + 44, h = px * 1.4;
  rr(x - w / 2, y - h / 2, w, h, h / 2); g.fillStyle = fill; g.fill(); g.strokeStyle = col; g.lineWidth = 3; g.stroke();
  txt(text, x, y + px * 0.35, px, col, 400, 'center', 'Bebas'); g.restore();
}
function avatar(x, y, r, col) {
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = 'rgba(14,12,14,0.94)'; g.fill(); g.strokeStyle = col; g.lineWidth = Math.max(2, r * 0.1); g.stroke();
  g.save(); g.beginPath(); g.arc(x, y, r - 2, 0, 7); g.clip();
  g.beginPath(); g.arc(x, y - r * 0.2, r * 0.34, 0, 7); g.fillStyle = col; g.fill();
  g.beginPath(); g.ellipse(x, y + r * 0.62, r * 0.6, r * 0.44, 0, Math.PI, 0); g.fill(); g.restore();
}
const CATS = [['FUEGO', '#FF7A1A'], ['VEHÍCULOS', '#2DD4BF'], ['AUXILIOS', '#F0457A'], ['ELECTRICIDAD', '#FFC83D'], ['TRÁFICO', '#8B7CF6'], ['CONSTITUCIÓN', '#3FB6FF']];
function wheel(cx, cy, r, ang, a) {          // la ruleta del temario (6 casillas)
  g.save(); g.globalAlpha = a; g.translate(cx, cy);
  g.save(); g.rotate(ang);
  CATS.forEach(([, c], i) => { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, i * Math.PI / 3, (i + 1) * Math.PI / 3); g.closePath(); g.fillStyle = c; g.fill(); g.strokeStyle = 'rgba(8,10,14,0.9)'; g.lineWidth = 3; g.stroke(); });
  g.beginPath(); g.arc(0, 0, r * 0.28, 0, 7); g.fillStyle = '#0b0d10'; g.fill();
  g.restore();
  g.beginPath(); g.moveTo(0, -r + 10); g.lineTo(-11, -r - 12); g.lineTo(11, -r - 12); g.closePath(); g.fillStyle = '#F4F6F8'; g.fill();
  g.beginPath(); g.arc(0, 0, r, 0, 7); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3; g.stroke();
  g.restore();
}
function hud(t) {                     // el marcador del 1 vs 1 (arriba, debajo de los subtítulos)
  const a = 1 - sm(T.compartir - 0.45, T.compartir - 0.1, t);
  if (a <= 0.005) return;
  const y = 548;
  g.save(); g.globalAlpha = a;
  const inn = bk(pr(t, 0.0, 0.35));
  g.translate(540, y); g.scale(mx(0.85, 1, inn), mx(0.85, 1, inn)); g.translate(-540, -y);
  rr(36, y - 56, 1008, 112, 56); g.fillStyle = 'rgba(8,10,14,0.86)'; g.fill();
  const grd = g.createLinearGradient(36, 0, 1044, 0); grd.addColorStop(0, GOLD2); grd.addColorStop(0.5, 'rgba(255,255,255,0.22)'); grd.addColorStop(1, RED2);
  g.strokeStyle = grd; g.lineWidth = 4; g.stroke();
  // tú
  avatar(100, y, 40, GOLD2);
  txt('TÚ', 154, y + 17, 52, '#F4F6F8', 400, 'left', 'Bebas');
  const up = sm(T.punto - 0.02, T.punto + 0.08, t), pop = 1 + 0.7 * pulse(t, T.punto + 0.12, 0.16);
  g.save(); g.translate(318, y); g.scale(pop, pop); txt(up > 0.5 ? '1' : '0', 0, 31, 94, GOLD2, 400, 'center', 'Bebas'); g.restore();
  if (pulse(t, T.punto + 0.15, 0.3) > 0.02) { const k = pr(t, T.punto, 0.7); g.save(); g.globalAlpha = a * (1 - k); g.beginPath(); g.arc(318, y, 40 + 120 * eO(k), 0, 7); g.strokeStyle = GOLD2; g.lineWidth = 6; g.stroke(); g.restore(); }
  // el rival (o los cuatro)
  const four = sm(T.cuatro - 0.15, T.cuatro + 0.1, t);
  if (four < 0.5) { avatar(980, y, 40, RED2); txt('RIVAL', 926, y + 17, 52, '#F4F6F8', 400, 'right', 'Bebas'); }
  else { for (let i = 3; i >= 0; i--) avatar(1006 - i * 34, y, 22, RED2); txt('×4', 870, y + 17, 54, RED2, 400, 'right', 'Bebas'); }
  txt('0', 762, y + 31, 94, RED2, 400, 'center', 'Bebas');
  // centro: la ruleta gira y cae en VEHÍCULOS; luego «VS»
  const stop = 1.05, spin = eO(pr(t, 0, stop));
  const end = -Math.PI / 2 - 1.5 * Math.PI / 3;
  const wa = 1 - sm(stop + 0.35, stop + 0.6, t);
  if (wa > 0.01) wheel(540, y, 46 * (1 + 0.15 * pulse(t, stop, 0.12)), end - 8 * Math.PI * (1 - spin), wa);
  if (wa < 0.99) { g.save(); g.globalAlpha = a * (1 - wa); g.beginPath(); g.arc(540, y, 44, 0, 7); g.fillStyle = '#0b0d10'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3; g.stroke();
    txt('VS', 540, y + 20, 58, '#F4F6F8', 400, 'center', 'Bebas'); g.restore(); }
  g.restore();
  // debajo: la categoría y el estado de cada uno
  const cat = sm(stop - 0.05, stop + 0.15, t) * a;
  if (cat > 0) { const s = 1 + 0.25 * pulse(t, stop + 0.1, 0.12); g.save(); g.translate(540, y + 84); g.scale(s, s); pill(0, 0, '🚗 VEHÍCULOS', CATS[1][1], cat, 34); g.restore(); }
  const ya = sm(T.contestado - 0.25, T.contestado, t) * (1 - sm(T.tiempo - 0.1, T.tiempo, t));
  pill(856, y + 84, '✓ YA HA CONTESTADO', GREEN2, a * ya * (0.8 + 0.2 * Math.sin(t * 9)), 34);
  pill(856, y + 84, 'A · DE FRENTE', ORANGE2, a * sm(T.frente4 - 0.2, T.frente4, t) * (1 - sm(T.l0 + 0.6, T.l0 + 0.8, t)), 34);
  pill(856, y + 84, '✗ FALLO', RED2, a * sm(T.l0 + 0.7, T.l0 + 0.9, t) * (1 - sm(T.madrid - 0.3, T.madrid, t)), 34);
  pill(224, y + 84, '⏱ TU TURNO', '#F4F6F8', a * sm(0.6, 0.9, t) * (1 - sm(T.tiempo - 0.1, T.tiempo, t)) * (0.75 + 0.25 * Math.sin(t * 7)), 34);
  pill(224, y + 84, '✓ C · EN DIAGONAL', GREEN2, a * sm(T.punto - 0.05, T.punto + 0.15, t) * (1 - sm(T.madrid - 0.3, T.madrid, t)), 34);
}
const OPTS = [['A', 'DE FRENTE'], ['B', 'POR DETRÁS'], ['C', 'EN DIAGONAL']];
function cards(t) {                    // fila de 3 tarjetas: salen al nombrarlas; la A del rival, roja y tachada; al final A y B tachadas, C en verde
  const tIn = [T.oA, T.oB, T.oC];
  OPTS.forEach(([L, s], i) => {
    const k = Math.max(bk(pr(t, tIn[i] - 0.2, 0.4)) * (1 - sm(T.punto + 0.3, T.punto + 0.6, t)), bk(pr(t, T.habrias - 0.25 + i * 0.07, 0.4)) * (1 - sm(T.fin - 0.3, T.fin + 0.05, t)));
    if (k <= 0.005) return;
    const late = t > T.habrias - 0.3;
    const bad = (i === 0 && t > T.l0 + 0.6) || (late && i === 1);
    const chosen = i === 0 && t > T.frente4 - 0.2 && !bad;
    const good = i === 2 && t > T.punto - 0.05;
    const cx = 188 + i * 352, cy = 726;
    const shake = i === 0 ? 10 * Math.sin(t * 80) * pulse(t, T.l0 + 0.7, 0.2) : 0;
    const pl = !bad && t > T.comenta - 0.1 && t < T.tiempo ? 1 + 0.04 * Math.max(0, Math.sin((t - T.comenta) * 7 - i * 1.3)) : 1;
    const pop = good ? 1 + 0.12 * pulse(t, T.punto + 0.1, 0.15) : 1;
    g.save(); g.globalAlpha = cl(k * 1.3); g.translate(cx + shake, cy + (1 - cl(k)) * 80); g.scale(pl * pop, pl * pop);
    const col = bad ? RED2 : good ? GREEN2 : chosen ? ORANGE2 : COLS[i];
    rr(-164, -58, 328, 116, 36); g.fillStyle = bad ? 'rgba(58,8,8,0.94)' : good ? 'rgba(8,46,22,0.94)' : 'rgba(9,12,17,0.9)'; g.fill();
    g.lineWidth = bad || good || chosen ? 7 : 3; g.strokeStyle = bad || good || chosen ? col : 'rgba(255,255,255,0.3)'; g.stroke();
    g.beginPath(); g.arc(-112, 0, 36, 0, 7); g.fillStyle = col; g.fill();
    txt(bad ? '✗' : good ? '✓' : L, -112, 19, 54, '#0b0d10', 400, 'center', 'Bebas');
    g.font = '400 52px Bebas'; const px = Math.min(52, 52 * 200 / g.measureText(s).width);
    txt(s, 42, px * 0.36, px, '#F2F5F8', 400, 'center', 'Bebas');
    if (bad) { g.strokeStyle = RED2; g.lineWidth = 7; g.beginPath(); g.moveTo(-60, 3); g.lineTo(144, 3); g.stroke(); }
    g.restore();
  });
}
function madridCard(t) {               // «casi cinco por plaza»
  const a = sm(T.madrid - 0.2, T.madrid + 0.15, t) * (1 - sm(T.unrival - 0.35, T.unrival - 0.05, t));
  if (a <= 0.005) return;
  const k = bk(cl(a * 1.2));
  g.save(); g.globalAlpha = cl(a); g.translate(540, 1470); g.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k);
  rr(-430, -150, 860, 300, 40); g.fillStyle = 'rgba(8,10,14,0.88)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 4; g.stroke();
  txt('EXAMEN · COMUNIDAD DE MADRID 2025', 0, -88, 40, GOLD2, 400, 'center', 'Bebas');
  txt('1.285 PRESENTADOS · 267 PLAZAS', 0, -16, 62, '#F4F6F8', 400, 'center', 'Bebas');
  const c5 = sm(T.cinco6 - 0.15, T.cinco6 + 0.1, t), s5 = 1 + 0.25 * pulse(t, T.cinco6 + 0.1, 0.15);
  if (c5 > 0) { g.save(); g.globalAlpha = cl(a) * c5; g.translate(0, 92); g.scale(s5, s5); txt('≈ 4,8 POR PLAZA', 0, 0, 92, ORANGE2, 400, 'center', 'Bebas'); g.restore(); }
  g.restore();
}
// la grabación REAL del 1 vs 1 en un móvil (mientras «mándaselo… a ver quién gana»)
function loadImg(src) { const im = new Image(); im.src = src; return im.decode().then(() => im); }
const REC = new Map(), RECN = 486;
function recFrame(i) {
  i = Math.max(1, Math.min(RECN, Math.round(i)));
  if (!REC.has(i)) REC.set(i, loadImg(`../out/rec_1vs1/r${String(i).padStart(4, '0')}.jpg`).catch(() => null));
  return REC.get(i);
}
const PH = { x: 330, y: 900, w: 420, h: 900, r: 58, bz: 12 };
const SCR = { x: PH.x + PH.bz, y: PH.y + PH.bz, w: PH.w - 2 * PH.bz, h: PH.h - 2 * PH.bz };
async function phone(t) {
  const a = sm(T.compartir + 0.2, T.compartir + 0.6, t) * (1 - sm(T.marca - 0.35, T.marca - 0.05, t));
  if (a <= 0.003) return;
  const rs = mx(2.1, 7.4, pr(t, T.compartir + 0.3, T.descripcion - T.compartir - 0.2));          // ruleta (tras la transición)…
  const rq = mx(7.4, 10.5, pr(t, T.descripcion - 0.1, T.marca - T.descripcion));                   // …y la pregunta con la cuenta atrás
  const sec = t < T.descripcion - 0.1 ? rs : rq;
  const img = await recFrame(30 * sec + 1);
  const yOff = (1 - e3(a)) * 900;
  g.save(); g.globalAlpha = cl(a * 1.4); g.translate(0, yOff);
  g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 60; g.shadowOffsetY = 20; rr(PH.x, PH.y, PH.w, PH.h, PH.r); g.fillStyle = '#0a0a0c'; g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.save(); rr(SCR.x, SCR.y, SCR.w, SCR.h, PH.r - PH.bz); g.clip(); g.fillStyle = '#0d0e11'; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
  if (img) {
    const h = img.height * SCR.w / img.width, top = SCR.y - 44;
    g.drawImage(img, SCR.x, top, SCR.w, h);
    // la franja de los jugadores (foto de la cuenta y nombre del rival) tapada con un marcador genérico; sin barra de estado
    const band = top + 0.262 * h - SCR.y;
    g.fillStyle = '#121316'; g.fillRect(SCR.x, SCR.y, SCR.w, band);
    avatar(SCR.x + 62, SCR.y + band * 0.58, 24, GOLD2); txt('TÚ', SCR.x + 96, SCR.y + band * 0.58 + 12, 34, '#F4F6F8', 400, 'left', 'Bebas');
    txt('VS', SCR.x + SCR.w / 2, SCR.y + band * 0.58 + 12, 34, 'rgba(255,255,255,0.55)', 400, 'center', 'Bebas');
    avatar(SCR.x + SCR.w - 62, SCR.y + band * 0.58, 24, RED2); txt('RIVAL', SCR.x + SCR.w - 96, SCR.y + band * 0.58 + 12, 34, '#F4F6F8', 400, 'right', 'Bebas');
  }
  g.restore();
  rr(PH.x, PH.y, PH.w, PH.h, PH.r); g.lineWidth = 5; g.strokeStyle = '#3a3d44'; g.stroke();
  rr(540 - 50, PH.y + 20, 100, 26, 13); g.fillStyle = '#000'; g.fill();
  g.restore();
  pill(540, PH.y - 36 + yOff, 'GRABACIÓN REAL · 1 VS 1', GOLD2, a, 34);
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  hud(t);
  // tú y el rival en la escena
  const ph = proj(you.position.clone().add(V(0, 2.35, 0)));
  chip(ph.x, ph.y, 'TÚ', GOLD2, ph.ok ? Math.max(sm(0.5, 0.9, t) * (1 - sm(T.oA - 0.4, T.oA, t)), sm(T.esquina - 0.7, T.esquina - 0.3, t) * (1 - sm(T.cuarenta - 0.3, T.cuarenta, t))) : 0, 0.95, null, 50);
  const pr2 = proj(rival.position.clone().add(V(0, 2.35, 0)));
  chip(pr2.x, pr2.y, 'RIVAL', RED2, pr2.ok ? sm(T.tiempo + 0.3, T.tiempo + 0.6, t) * (1 - sm(T.amortiguador - 0.3, T.amortiguador, t)) : 0, 0.95, null, 50);
  // las letras en los caminos
  paths.forEach((P, i) => {
    const t0 = [T.oA, T.oB, T.oC][i], q = proj(P.p0.clone().add(V(0, 0.4, 0)));
    const a = sm(t0 - 0.05, t0 + 0.2, t) * (1 - sm(T.tiempo - 0.2, T.tiempo + 0.1, t));
    if (q.ok) letterDot(q.x, q.y, ['A', 'B', 'C'][i], COLS[i], a, 36);
  });
  // el disparo
  const pb = proj(V(CAR_F + 0.2, 1.0, -0.5));
  chip(pb.x, pb.y - 90, 'AMORTIGUADOR', RED2, pb.ok ? sm(T.amortiguador - 0.1, T.amortiguador + 0.2, t) * (1 - sm(T.l0 - 0.1, T.l0 + 0.1, t)) : 0, 0.95, 'warn', 50);
  // la explicación: zonas de disparo, la diagonal y los 45°
  const pf = proj(V(CAR_F + 6, 0.2, 0)), pbk = proj(V(CAR_B - 6, 0.2, 0));
  chip(pf.x, pf.y, 'DELANTE ✗', RED2, pf.ok ? sm(T.delante - 0.1, T.delante + 0.2, t) * (1 - sm(T.detras5 - 0.2, T.detras5, t)) : 0, 0.95, 'warn', 50);
  chip(pbk.x, pbk.y, 'DETRÁS ✗', RED2, pbk.ok ? sm(T.detras5 - 0.1, T.detras5 + 0.2, t) * (1 - sm(T.esquina - 0.3, T.esquina, t)) : 0, 0.95, 'warn', 50);
  const pa = proj(CORNER.clone().add(V(-1.85 * Math.cos(Math.PI / 8), 0.2, -1.85 * Math.sin(Math.PI / 8))));
  chip(pa.x - 70, pa.y + 10, '45°', GOLD2, pa.ok ? sm(T.cuarenta - 0.2, T.cuarenta + 0.1, t) * (1 - sm(T.madrid - 0.2, T.madrid + 0.1, t)) : 0, 1.05 + 0.2 * pulse(t, T.cuarenta + 0.15, 0.2), null, 70);
  const pc = proj(YOU2.clone().add(V(0, 2.35, 0)));
  chip(pc.x, pc.y, 'POR LA ESQUINA', GREEN2, pc.ok ? sm(T.esquina - 0.15, T.esquina + 0.15, t) * (1 - sm(T.madrid - 0.3, T.madrid, t)) : 0, 0.95, 'ok', 50);
  // tarjetas, «comenta tu letra», cuenta 1 → 5 y «¡TIEMPO!»
  cards(t);
  const ck = sm(T.comenta - 0.1, T.comenta + 0.25, t) * (1 - sm(T.count1 - 0.05, T.count1 + 0.2, t));
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
  stamp('+1', 1080, GOLD2, Math.exp(-Math.pow((t - T.punto - 0.35) / 0.3, 4)), 200, -0.05);
  madridCard(t);
  // final: confiésalo
  const ce = sm(T.confiesalo - 0.15, T.confiesalo + 0.15, t) * (1 - sm(T.fin - 0.3, T.fin + 0.05, t));
  if (ce > 0) {
    const b = 1 + 0.05 * Math.max(0, Math.sin((t - T.confiesalo) * 6));
    g.save(); g.globalAlpha = ce; g.translate(540, 1560); g.scale(b, b); rr(-400, -56, 800, 112, 56); g.fillStyle = 'rgba(8,10,14,0.84)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('💬  CONFIÉSALO EN COMENTARIOS', 0, 20, 56, '#F2F5F8', 400, 'center', 'Bebas'); g.restore();
  }
  share(t);
  await phone(t);
  closing(t);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.01)'; g.fillRect(0, 0, 2, 2);
}

// ------------------------------------------------------------------ fotograma
function subframes(t) {
  const a = camAt(t - 1 / 240), b = camAt(t + 1 / 240);
  const ang2 = a.q.angleTo(b.q), mv = a.p.distanceTo(b.p) / Math.max(0.5, (a.focus + b.focus) / 2);
  const fast = t > T.l0 - 0.05 && t < T.l0 + 2.0 ? 3 : 1;           // el amortiguador volando: estela
  return Math.max(fast, Math.min(4, Math.ceil((ang2 + mv) * H2 / (a.fov * Math.PI / 180) / 22)));
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
  const fl1 = Math.exp(-Math.pow((t - T.tiempo - 0.03) / 0.07, 2)) * 0.35, fl2 = Math.exp(-Math.pow((t - T.l0 - 0.03) / 0.09, 2)) * 0.08, fl3 = Math.exp(-Math.pow((t - T.punto - 0.05) / 0.08, 2)) * 0.22;
  const fm = Math.max(fl1, fl2, fl3);
  finMat.uniforms.uFlash.value = fm;
  if (fm === fl2) finMat.uniforms.uFlashCol.value.setRGB(1, 0.75, 0.45); else if (fm === fl3) finMat.uniforms.uFlashCol.value.setRGB(1, 0.85, 0.35); else finMat.uniforms.uFlashCol.value.setRGB(1, 0.35, 0.3);
  finMat.uniforms.uDim.value = (t >= T.fin ? mx(1, 0.45, sm(T.compartir - 0.2, T.compartir + 0.3, t)) : 1) * (1 - sm(T.end - 0.3, T.end, t));
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
    hoseUpdate();
    renderer.compile(scene, cam);
    window.READY3D = true;
  } catch (e) { window.failed = 'reto: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
