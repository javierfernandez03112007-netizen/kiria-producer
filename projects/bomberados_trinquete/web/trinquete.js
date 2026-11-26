// «La puerta se te cierra encima» — el trinquete de seguridad (rope ratchet), idea de Adrián (Notion «JUEVES 26», con
// publicidad de Élite); 30–40 s. De día, en una carretera en cuesta (Javi, 25 nov: «vida real»): un coche contra el
// guardarraíl, con el herido dentro; curiosos detrás del guardarraíl y en el arcén, la autobomba y la ambulancia con sus
// luces. Un bombero (A) atiende al herido de rodillas en el hueco de la puerta; la puerta se cierra sola (cuesta arriba) y
// otro (B) la para; el tercero (C) saca el trinquete: un gancho a la puerta, el otro a la rueda, tira del extremo suelto y
// la cuerda se tensa (por dentro, el trinquete solo deja girar en un sentido); B suelta y la puerta no se mueve.
// Cierre: ¿lo conocías? (sí/no) y la placa de ÉLITE BOMBEROS. Todo depende solo de t. Motor de guia.js.
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

// ================================================================== de día, una carretera en cuesta: coche contra el guardarraíl, tres bomberos y el trinquete
const world = new THREE.Group(); scene.add(world);
const RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D', WHITE2 = '#F4F6F8', BLUE2 = '#62B0FF';
const LBLY = 690;
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
const std = (c, r = 0.6, mt = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt });
const ALPHA = 7 * Math.PI / 180, TA = Math.tan(ALPHA);           // la cuesta (12 %): sube hacia +X
const hY = x => x * TA;                                           // altura del suelo en x
const CAR0 = V(0, 0, 3.1), CAR_YAW = -0.12;                       // el coche, contra el guardarraíl (z = 4.3)
let car, carR, patient, collar, A, B, C, F, tool, rope = {}, truck, amb, beacons = [], ambLights = [], hz = [], ropeSegs = [], freeSegs = [], sunL;
const SW = 0.89;                                                  // media anchura del coche
const HINGE = V(0.62, 0, -SW), DOORL = 1.1;
const RIM = V(1.3, 0.56, -0.905);                                 // donde se engancha el trinquete: un radio de la llanta delantera izquierda
const CORNER_D = V(-1.05, 1.355, -0.035);                         // esquina de arriba y atrás del marco de la ventanilla (coordenadas de la puerta)

function carW(x, y, z) { return car.localToWorld(V(x, y, z)); }
function onGround(obj, wx, wz, dy = 0) { obj.position.set(wx, hY(wx) - dy, wz); }

// ------------------------------------------------------------------ el coche accidentado (con la puerta del conductor que se abre y el herido dentro)
function makeRescueCar(col) {
  const G = new THREE.Group(), R = { G };
  const paint = new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.5 });
  const dark = std(0x111214, 0.85), trim = std(0x26282c, 0.7), seatM = std(0x2b2e34, 0.9), chrome = new THREE.MeshStandardMaterial({ color: 0xd8dbe0, metalness: 1, roughness: 0.2 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0x1b2632, roughness: 0.04, metalness: 0.5, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, p = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; };
  const bar = (a, b, r, mat, p = G) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), mat); between(m, a, b); m.castShadow = true; p.add(m); return m; };
  // carrocería baja: delante, detrás, el lado del acompañante, el estribo del conductor y el suelo
  add(new RoundedBoxGeometry(1.5, 0.62, 1.78, 4, 0.14), paint, 1.36, 0.61, 0);
  add(new RoundedBoxGeometry(1.62, 0.62, 1.78, 4, 0.14), paint, -1.29, 0.61, 0);
  add(new THREE.BoxGeometry(1.12, 0.62, 0.06), paint, 0.07, 0.61, SW - 0.03);
  add(new THREE.BoxGeometry(1.12, 0.14, 0.12), paint, 0.07, 0.37, -SW + 0.06);
  add(new THREE.BoxGeometry(1.12, 0.06, 1.7), dark, 0.07, 0.33, 0);
  add(new THREE.BoxGeometry(4.24, 0.12, 1.82), std(0x0d0d0f, 0.9), 0, 0.3, 0);
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
  const P = new THREE.Group(); G.add(P);
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

// ------------------------------------------------------------------ el trinquete de seguridad (genérico): polea con trinquete, dos ganchos y la cuerda
let ratchet = {};
let lens = null, bigP = null;                                      // la lupa: el trinquete en grande y en rayos X, flotando encima de su línea
const LENS = V(1.02, 1.73, -0.96), LENS_R = 0.5, LENS_K = 0.84;   // dónde flota (coordenadas del coche: encima del capó, sin tocar a nadie), radio y escala
function hookMesh(mat) {             // gancho en J (acero)
  const pts = [V(0, 0, 0), V(0, -0.05, 0), V(0, -0.075, 0), V(0.006, -0.088, 0), V(0.022, -0.092, 0), V(0.034, -0.082, 0), V(0.036, -0.066, 0)];
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0042, 8), mat); m.castShadow = true; return m;
}
function makeRatchet() {
  const G = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 1, roughness: 0.25 });
  const plateM = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.4, metalness: 0.3, transparent: true, opacity: 1 });
  // dos chapas laterales, el eje, la rueda dentada (se ve en rayos X) y el trinquete con su muelle
  for (const z of [-0.011, 0.011]) { const p = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.075, 0.005, 2, 0.008), plateM); p.position.set(0, -0.02, z); p.castShadow = true; G.add(p); }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 8), steel); axle.rotation.x = Math.PI / 2; axle.position.y = -0.025; G.add(axle);
  const sheave = new THREE.Group(); sheave.position.y = -0.025; G.add(sheave);
  const sm2 = new THREE.MeshStandardMaterial({ color: 0xd8dde4, metalness: 0.9, roughness: 0.25, emissive: 0x48d6ff, emissiveIntensity: 0 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 20), sm2); disc.rotation.x = Math.PI / 2; sheave.add(disc);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, t = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.012), sm2); t.position.set(Math.cos(a) * 0.0155, Math.sin(a) * 0.0155, 0); t.rotation.z = a + 0.6; sheave.add(t); }
  const pawl = new THREE.Group(); pawl.position.set(0.016, 0.0, 0); G.add(pawl);
  const pm = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.6, roughness: 0.3, emissive: 0xff8a3d, emissiveIntensity: 0 });
  const pw = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.022, 0.008), pm); pw.position.set(-0.004, -0.012, 0); pw.rotation.z = 0.5; pawl.add(pw);
  const lever = new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.03, 0.006, 2, 0.003), std(0xd8241c, 0.5)); lever.position.set(0.026, -0.02, 0); lever.rotation.z = -0.2; G.add(lever);
  // el gancho de la polea (arriba)
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0025, 6, 14), steel); eye.position.y = 0.022; G.add(eye);
  const hk = hookMesh(steel); hk.position.y = 0.012; hk.rotation.z = Math.PI; G.add(hk);
  G.scale.setScalar(2.0);                         // a su tamaño real (unos 15 cm la polea con su gancho)
  ratchet = { G, plateM, sheave, pawl, pm, sm2 };
  return G;
}
function ropeLine(n, r, mat) { const L = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 7), mat); m.castShadow = true; world.add(m); L.push(m); } return L; }
function placeRope(L, pts) { for (let i = 0; i < L.length; i++) { const a = pts[Math.min(i, pts.length - 2)], b = pts[Math.min(i + 1, pts.length - 1)]; between(L[i], a, b); L[i].visible = a.distanceTo(b) > 1e-4; } }
function sagCurve(a, b, sag, n) { const P = []; for (let i = 0; i <= n; i++) { const k = i / n, p = a.clone().lerp(b, k); p.y -= sag * 4 * k * (1 - k); P.push(p); } return P; }

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

// ------------------------------------------------------------------ el mundo: carretera en cuesta, cunetas, guardarraíl, campo, árboles, autobomba, ambulancia, curiosos
function slopeMesh(geo, mat, y = 0) { geo.rotateX(-Math.PI / 2); const m = new THREE.Mesh(geo, mat); m.rotation.z = ALPHA; m.position.y = y; m.receiveShadow = true; world.add(m); return m; }
function onSlope(obj, x, z, yaw = 0, dy = 0) { obj.position.set(x, hY(x) + dy, z); obj.quaternion.setFromEuler(new THREE.Euler(0, 0, ALPHA)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0))); }
function buildWorld() {
  mats(); M.paint = new THREE.MeshStandardMaterial({ color: 0xb0121a, roughness: 0.28, metalness: 0.05 });
  NOISE = NOISE || noiseTex();
  // cielo, sol y calima (el sol viene del lado de la carretera: ilumina la puerta y a los bomberos)
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
  sunL = new THREE.DirectionalLight(0xfff0dc, 2.7); sunL.position.copy(SUN2).multiplyScalar(60); sunL.target.position.set(0, 0, 2);
  sunL.castShadow = true; sunL.shadow.mapSize.set(1536, 1536);
  Object.assign(sunL.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 20, far: 110 }); sunL.shadow.camera.updateProjectionMatrix();
  sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.03; world.add(sunL, sunL.target);
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // el campo (hierba seca) y la carretera con sus líneas
  const grass = canvasTex(512, 512, (x) => { x.fillStyle = '#7d7a45'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 22000; i++) { const g2 = 90 + rnd(i) * 70; x.fillStyle = `rgba(${g2 + 20},${g2 + 12},${g2 - 40},0.5)`; x.fillRect(rnd(i * 3.7) * 512, rnd(i * 6.1) * 512, 2, 4); } }, { aniso: 8 });
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(60, 40);
  slopeMesh(new THREE.PlaneGeometry(240, 160), new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 }), -0.02);
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#4c4e52'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 16000; i++) { const v = 55 + rnd(i) * 45; x.fillStyle = `rgba(${v},${v},${v + 2},0.5)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 8 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(30, 2);
  slopeMesh(new THREE.PlaneGeometry(240, 7.6), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.88 }), 0.0).position.z = 0;
  const line = std(0xe6e6de, 0.6);
  for (let x = -80; x < 80; x += 6) { const l = slopeMesh(new THREE.PlaneGeometry(3, 0.12), line, 0.006); l.position.set(x * Math.cos(ALPHA), hY(x * Math.cos(ALPHA)) + 0.006, 0); }
  for (const z of [-3.6, 3.6]) { const l = slopeMesh(new THREE.PlaneGeometry(240, 0.12), line, 0.006); l.position.z = z; }
  // guardarraíl (doble onda) a la derecha
  const railM = new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.8, roughness: 0.35 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(240, 0.3, 0.06), railM); rail.position.set(0, 0.62, 4.3); rail.rotation.z = ALPHA; rail.castShadow = true; world.add(rail);
  for (let x = -60; x <= 60; x += 2) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.12), std(0x8a8f96, 0.5, 0.6)); p.position.set(x, hY(x) + 0.38, 4.38); p.castShadow = true; world.add(p); }
  // señal de pendiente
  const sg = new THREE.Group(); onGround(sg, -15, -4.6); world.add(sg);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.2, 8), std(0x9aa0a6, 0.4, 0.7)); post.position.y = 1.1; sg.add(post);
  const tri = canvasTex(256, 224, (x) => { x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(128, 6); x.lineTo(250, 218); x.lineTo(6, 218); x.closePath(); x.fill(); x.strokeStyle = '#d0201a'; x.lineWidth = 22; x.stroke();
    x.fillStyle = '#111'; x.beginPath(); x.moveTo(70, 180); x.lineTo(190, 180); x.lineTo(190, 110); x.closePath(); x.fill(); x.font = '700 40px Inter'; x.textAlign = 'center'; x.fillText('12%', 120, 165); });
  const tm = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.7), new THREE.MeshStandardMaterial({ map: tri, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide })); tm.position.y = 2.25; tm.rotation.y = -Math.PI / 2; sg.add(tm);
  // árboles, matas y colinas a lo lejos
  for (let i = 0; i < 16; i++) { const x = -40 + i * 5.3 + rnd(i) * 2, z = 9 + rnd(i * 3) * 9, t = makeTree(5.5 + rnd(i * 5) * 2.5, i + 30); onGround(t, x, z); world.add(t); trees.push(t); }
  for (let i = 0; i < 12; i++) { const x = -36 + i * 6.4 + rnd(i * 7) * 2, z = -8 - rnd(i * 9) * 8, t = makeTree(5 + rnd(i * 11) * 2.5, i + 60); onGround(t, x, z); world.add(t); trees.push(t); }
  const hillM = new THREE.MeshStandardMaterial({ color: 0x6f7a55, roughness: 1, flatShading: true });
  for (let i = 0; i < 7; i++) { const h = new THREE.Mesh(new THREE.IcosahedronGeometry(30 + rnd(i) * 25, 1), hillM); h.scale.set(1.6, 0.35, 1); h.position.set(-120 + i * 45, hY(-120 + i * 45) - 4, i % 2 ? 110 : -120); world.add(h); }
  // el coche accidentado
  carR = makeRescueCar(0x3d5f86); car = carR.G; onSlope(car, CAR0.x, CAR0.z, CAR_YAW); world.add(car); car.updateMatrixWorld(true);
  // la autobomba (de culata hacia el coche, cuesta abajo) y la ambulancia (cuesta arriba)
  truck = makeTruck(); onSlope(truck, -10.5, 1.6, Math.PI); world.add(truck); truck.updateMatrixWorld(true); beacons = truck.userData.lbar;
  truck.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  amb = new THREE.Group(); onSlope(amb, 11, 1.7, Math.PI); world.add(amb);
  const white = std(0xf2f2ee, 0.4, 0.1), add2 = (geo, m, x, y, z) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = k.receiveShadow = true; amb.add(k); return k; };
  add2(new RoundedBoxGeometry(3.6, 2.2, 2.1, 3, 0.1), white, -0.6, 1.5, 0); add2(new RoundedBoxGeometry(1.5, 1.6, 2.05, 3, 0.12), white, 1.9, 1.2, 0);
  add2(new THREE.BoxGeometry(5.0, 0.12, 2.12), new THREE.MeshStandardMaterial({ color: 0xd8241c, roughness: 0.5 }), 0.2, 1.05, 0);
  add2(new THREE.BoxGeometry(5.0, 0.1, 2.13), new THREE.MeshStandardMaterial({ color: 0xf2c21a, roughness: 0.5 }), 0.2, 0.88, 0);
  add2(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.05, metalness: 0.6 }), 2.66, 1.55, 0).rotation.y = Math.PI / 2;
  for (const [x, z] of [[1.8, 0.95], [1.8, -0.95], [-1.6, 0.95], [-1.6, -0.95]]) { const w = add2(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 22), M.rubber, x, 0.36, z); w.rotation.x = Math.PI / 2; }
  for (const z of [-0.6, 0.6]) { const b = add2(new RoundedBoxGeometry(0.3, 0.14, 0.5, 2, 0.04), new THREE.MeshBasicMaterial({ color: 0x2a6bff }), 1.5, 2.66, z); ambLights.push(b.material); }
  const ambL = new THREE.PointLight(0x2f6bff, 0, 0, 2); ambL.position.set(1.5, 3.2, 0); amb.add(ambL); amb.userData.pl = ambL;
  // otro bombero, en la bomba de la autobomba
  F = makeHero({ noEra: true, helmet: 0xe6e8ea }); world.add(F.G);
  const pump = truck.localToWorld(V(-3.86, 0, 0)); onGround(F.G, pump.x + 0.62, pump.z); F.G.rotation.y = Math.PI / 2;
  F.pose(V(-0.16, 1.22, -0.46), V(0.14, 1.28, -0.46), V(-0.33, 1.05, -0.12), V(0.33, 1.08, -0.12));
  // curiosos detrás del guardarraíl (en el campo) y en el arcén de enfrente, con un coche parado
  const P0 = [
    { x: -2.6, z: 5.25, top: 0xc0392b, legs: 0x2b3346, gesto: 'movil', seed: 1 }, { x: -1.7, z: 5.55, top: 0x3d5a80, legs: 0x1f1f22, gesto: 'brazos', seed: 2, hair: 0x111111, h: 1.04 },
    { x: -0.7, z: 5.3, top: 0xe7e2d6, legs: 0x4a5b78, gesto: 'señala', seed: 3, hair: 0x6b4a2a, h: 0.97 }, { x: 1.9, z: 5.5, top: 0x4f6b3a, legs: 0x2b3346, gesto: 'boca', seed: 4, long: true, hair: 0xa07a4a, h: 0.95 },
    { x: 2.9, z: 5.3, top: 0xe0a32b, legs: 0x23262e, gesto: 'movil', seed: 5, long: true, hair: 0x2b1b10, h: 0.95 }, { x: 3.9, z: 5.6, top: 0x6c6f75, legs: 0x1b1d22, gesto: 'bolsillos', seed: 6, cap: 0x222222 },
    { x: 3.5, z: -4.6, top: 0x1f3d5a, legs: 0x4a4038, gesto: 'movil', seed: 7, cap: 0xa83226 }, { x: 4.4, z: -4.9, top: 0x8a4b2f, legs: 0x2b3346, gesto: 'señala', seed: 8 },
  ];
  for (const q of P0) { const p = makePerson(q); onGround(p.G, q.x, q.z); const toCar = V(CAR0.x - q.x, 0, CAR0.z - q.z); p.G.rotation.y = Math.atan2(-toCar.x, -toCar.z); world.add(p.G); people.push(p); }
  const stopped = makeCar(0xb8b8b4); onSlope(stopped, 7.5, -1.8, Math.PI); world.add(stopped); hazards.push(...stopped.userData.hz);
  // los tres bomberos del rescate: A (de rodillas, atiende al herido), B (de pie, sujeta la puerta), C (de rodillas, el trinquete)
  A = makeHero({ noEra: true }); kneel(A, 0.37, true); world.add(A.G);
  B = makeHero({ noEra: true, helmet: 0xe6e8ea }); world.add(B.G);
  C = makeHero({ noEra: true }); kneel(C, 0.37, false); world.add(C.G);
  const place = (R, lx, lz, yaw, dy = 0) => { const w = carW(lx, 0, lz); onGround(R.G, w.x, w.z, dy); R.G.rotation.y = yaw; };
  place(A, 0.0, -1.06, CAR_YAW + Math.PI, 0.37);
  place(B, -0.12, -2.08, CAR_YAW + Math.PI + 0.25);
  place(C, 1.5, -1.32, CAR_YAW + Math.PI / 2, 0.37);
  // el trinquete y la cuerda
  tool = makeRatchet(); world.add(tool);
  const ropeM = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.8 });
  ropeSegs = ropeLine(18, 0.0042, ropeM); freeSegs = ropeLine(14, 0.0042, ropeM);
  rope.hookB = hookMesh(new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 1, roughness: 0.25 })); rope.hookB.scale.setScalar(2.0); world.add(rope.hookB);
  rope.coil = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 28), ropeM); rope.coil.castShadow = true; world.add(rope.coil);
  // la lupa (Javi: «los rayos X flotando encima de su línea, en la misma escena»): el mismo trinquete 4,5 veces más grande,
  // con las chapas de cristal, la cuerda que pasa por la polea (hacia la puerta y el extremo suelto) y un fondo oscuro para leerlo
  lens = new THREE.Group(); lens.visible = false; world.add(lens);
  const realP = ratchet, bigX = makeRatchet(); bigP = ratchet; ratchet = realP;
  bigX.scale.setScalar(2.0 * 4.5); bigX.position.y = 0.025 * 9; lens.add(bigX);
  bigX.traverse(o => { if (o.isMesh && o.geometry.type === 'TubeGeometry') o.visible = false; });   // sin el gancho (no cabe en la lupa)
  bigP.plateM.color.set(0x5d7a96); bigP.plateM.opacity = 0.16; bigP.plateM.depthWrite = false;
  bigP.sm2.emissiveIntensity = 0.45; bigP.pm.emissiveIntensity = 0.5;
  const lensBack = new THREE.Mesh(new THREE.CircleGeometry(LENS_R, 72), new THREE.MeshBasicMaterial({ color: 0x0a0e13, transparent: true, opacity: 0.78, depthWrite: false, fog: false }));
  lensBack.position.z = -0.2; lensBack.renderOrder = -1; lens.add(lensBack);
  const lensRim = new THREE.Mesh(new THREE.TorusGeometry(LENS_R, 0.012, 8, 120), GLOW(CYAN2, 1.1)); lensRim.position.z = -0.2; lens.add(lensRim);
  const ropeTex = (rx, ry) => { const tx = canvasTex(64, 64, x => { x.fillStyle = '#e9e4d8'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#8f877a'; x.lineWidth = 9;
    for (let i = -64; i < 128; i += 21) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, 64); x.stroke(); } }); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(rx, ry); return tx; };
  const lropeM = new THREE.MeshStandardMaterial({ map: ropeTex(10, 1), roughness: 0.8, emissive: 0x3a3630, emissiveIntensity: 0.5 });
  const lropeS = new THREE.MeshStandardMaterial({ map: ropeTex(1, 7), roughness: 0.8, emissive: 0x3a3630, emissiveIntensity: 0.5 });
  const RR = 0.2, yb = -Math.sqrt(LENS_R * LENS_R - RR * RR) + 0.01;
  const wrap = new THREE.Mesh(new THREE.TorusGeometry(RR, 0.032, 8, 40, Math.PI), lropeM); lens.add(wrap);
  for (const sx of [-1, 1]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1, 10), lropeS); between(s, V(sx * RR, 0, 0), V(sx * RR, yb, 0)); lens.add(s); }
  lens.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
}

// ------------------------------------------------------------------ tiempos y cámara (un dron que no para)
let T = {}, KEYS = null, KH = null;
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  T.sw0 = T.puerta - 0.05; T.sw1 = T.encima;                          // la puerta se cierra sobre el que atiende… y B la para
  T.cat0 = T.encima - 0.32;                                            // la mano de B llega a la puerta
  T.tug0 = T.vuelve - 0.1; T.tug1 = T.avisa + 0.4;                     // la puerta tira (vuelve sola)
  T.up0 = T.esto - 0.5; T.up1 = T.esto + 0.05; T.dn0 = T.gancho - 0.45; // C enseña el trinquete
  T.hb0 = T.gancho - 0.15; T.hb1 = T.gancho + 0.45;                    // B engancha la puerta
  T.ha0 = T.otro - 0.1; T.ha1 = T.coche2 + 0.3;                        // C engancha la rueda
  T.p0 = T.tiras - 0.05; T.p1 = T.suelto + 0.55;                       // C tira del extremo suelto: la cuerda se tensa y abre la puerta
  T.x0 = T.cuerda + 0.25; T.x1 = T.puerta3 - 0.15;                     // rayos X del trinquete
  T.back = T.volver - 0.1;                                             // la cuerda intenta volver: el trinquete la bloquea
  T.rel0 = T.puerta3 + 0.1; T.rel1 = T.puerta3 + 0.6;                  // B suelta la puerta: no se mueve
  T.col0 = T.trabajas + 0.2; T.col1 = T.tranquilo + 0.3;               // el collarín
  KEYS = camKeys(); KH = KEYS;
}
function camKeys() {
  const k = (t, p, q, fov) => { const P = carW(...p), Q = carW(...q); return [t, [P.x, P.y, P.z, Q.x, Q.y, Q.z, fov]]; };
  const K = [
    k(0, [-11, 6.8, -6.5], [0.3, 0.6, -0.6], 42),                     // desde arriba, cuesta abajo: la carretera, el coche, la autobomba, los curiosos
    k(T.herido + 0.4, [-5.5, 3.6, -4.2], [0.2, 0.85, -1.1], 40),
    k(T.cierra, [-3.3, 2.8, -4.2], [0.15, 0.85, -1.4], 38),             // la puerta se cierra sobre el que atiende… y B la para
    k(T.encima + 0.4, [-3.15, 2.75, -4.1], [0.15, 0.85, -1.4], 38),
    k(T.cuesta + 0.25, [2.2, 2.0, -6.5], [0.4, 0.8, -0.9], 36),       // tres cuartos por delante: la cuesta, la puerta, los tres
    k(T.avisa + 0.2, [2.1, 2.0, -6.3], [0.4, 0.8, -0.9], 36),
    k(T.esto, [1.0, 1.3, -2.65], [1.12, 0.98, -1.3], 28),              // C levanta el trinquete
    k(T.seguridad + 0.35, [1.02, 1.28, -2.62], [1.12, 0.97, -1.3], 28),
    k(T.gancho + 0.2, [0.9, 2.1, -4.4], [0.8, 0.85, -1.45], 36),       // un gancho a la puerta, el otro a la rueda
    k(T.tiras, [1.0, 2.0, -4.2], [0.9, 0.8, -1.4], 35),
    k(T.suelto + 0.3, [1.05, 1.9, -4.0], [0.95, 0.78, -1.35], 35),
    k(T.tensa - 0.35, [2.9, 2.2, -4.7], [1.05, 1.3, -1.1], 39),         // se abre el plano: la cuerda tensa y, encima, el trinquete en grande (rayos X)
    k(T.volver + 0.4, [3.3, 2.3, -5.0], [1.0, 1.3, -1.1], 40),
    k(T.puerta3 + 0.3, [2.6, 2.1, -4.4], [0.4, 1.0, -1.4], 38),          // la puerta ya no se mueve
    k(T.mueve + 0.4, [2.45, 2.15, -4.3], [0.4, 1.0, -1.4], 38),
    k(T.trabajas + 0.35, [1.6, 2.9, -4.9], [0.15, 1.0, -0.85], 36),      // trabajas tranquilo: todo a la vista, todo sujeto
    k(T.herido2 + 0.5, [1.05, 3.1, -5.2], [0.1, 1.0, -0.85], 37),
    k(T.conocias + 0.4, [-3.2, 3.8, -6.8], [0.4, 0.9, -1.2], 38),      // abierto: ¿lo conocías?
    k(T.compartir + 0.6, [-4.2, 5.0, -8.5], [0.4, 1.0, -1.0], 40),
    k(T.end, [-5.5, 6.5, -10.5], [0.4, 1.0, -1.0], 42),
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
  const sh = 0.006 * pulse(t, T.encima, 0.12);
  return pose(V(v[0] + 0.015 * s * Math.sin(t * 0.7) + sh * Math.sin(t * 90), v[1] + 0.012 * s * Math.sin(t * 0.53 + 1) + sh * Math.sin(t * 70), v[2]), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t (todo depende solo de t)
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
const lerpV = (a, b, k) => a.clone().lerp(b, k);
const D2R = Math.PI / 180;
let TIMED = [], curPhi = 70;
function doorPhi(t) {                 // ángulo de la puerta (grados desde cerrada)
  let p = 70;
  if (t >= T.sw0) { const u = cl((t - T.sw0) / (T.sw1 - T.sw0)); p = 70 - 18 * u * u; }
  if (t >= T.sw1) p = 52 - 1.4 * Math.exp(-(t - T.sw1) * 6) * Math.sin((t - T.sw1) * 22);
  if (t >= T.tug0 && t < T.tug1) p -= 1.2 * Math.sin(Math.PI * pr(t, T.tug0, T.tug1 - T.tug0)) * (0.6 + 0.4 * Math.sin(t * 9));
  if (t >= T.p0 + 0.25) p = mx(52, 66, e3(pr(t, T.p0 + 0.25, T.p1 - T.p0 - 0.25)));
  if (t >= T.rel1) p = 66 + 0.6 * Math.exp(-(t - T.rel1) * 5) * Math.sin((t - T.rel1) * 18);
  return p;
}
function toLocal(R, w) { R.G.updateMatrixWorld(true); return R.G.worldToLocal(w.clone()); }
const DW = (x, y, z) => carR.door.localToWorld(V(x, y, z));
function update(t) {
  const P0 = camAt(t);
  cam.position.copy(P0.p); cam.quaternion.copy(P0.q); cam.fov = P0.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = true; dofMat.uniforms.uFocus.value = P0.focus; dofMat.uniforms.uAp.value = mx(0.22, 0.06, sm(1.2, 4.5, P0.focus));
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
  // la puerta
  curPhi = doorPhi(t);
  carR.door.rotation.y = -curPhi * D2R; car.updateMatrixWorld(true);
  const corner = DW(CORNER_D.x, CORNER_D.y, CORNER_D.z), post = DW(-1.07, 1.02, -0.07), rimW = carW(RIM.x, RIM.y, RIM.z);
  // A: una mano en la cabeza del herido y otra en el hombro (control cervical); con el collarín, las dos en el cuello
  const colK = e3(pr(t, T.col0, T.col1 - T.col0));
  const aH1 = lerpV(carW(0.0, 1.21, -0.52), carW(-0.04, 1.13, -0.5), colK), aH2 = lerpV(carW(-0.12, 1.06, -0.57), carW(-0.06, 1.1, -0.34), colK);
  A.pose(toLocal(A, aH1), toLocal(A, aH2), V(-0.38, 1.05, -0.12), V(0.38, 1.05, -0.12));
  collar.visible = t > T.col0; collar.scale.setScalar(mx(0.7, 1, e3(pr(t, T.col0, 0.35))));
  // B: la mano izquierda para la puerta y la sujeta hasta que el trinquete la aguanta; la derecha lleva el gancho
  const restL = V(-0.335, 0.985, -0.17), restR = V(0.335, 0.985, -0.17);
  const catchK = e3(pr(t, T.cat0, 0.3)) * (1 - e3(pr(t, T.rel0, T.rel1 - T.rel0)));
  const bL = lerpV(restL, toLocal(B, post), catchK);
  const hookHand = toLocal(B, corner.clone().add(V(0, -0.03, 0)));
  const holdR = V(0.3, 1.02, -0.32);
  const bR = t < T.hb0 ? holdR : t < T.hb1 ? lerpV(holdR, hookHand, e3(pr(t, T.hb0, T.hb1 - T.hb0))) : lerpV(hookHand, restR, e3(pr(t, T.hb1 + 0.1, 0.5)));
  B.pose(bL, bR, V(-0.36, 1.18, 0.0), V(0.36, 1.16, 0.0));
  // C (de rodillas, de lado junto a la rueda): enseña el trinquete, lo engancha en la rueda (izquierda) y tira del extremo suelto (derecha)
  const upK = e3(pr(t, T.up0, T.up1 - T.up0)) * (1 - e3(pr(t, T.dn0, 0.45)));
  const cRestL = V(-0.13, 0.83, -0.36), cRestR = V(0.3, 0.95, -0.28), cShowL = V(-0.05, 1.32, -0.43), cShowR = V(0.11, 1.27, -0.38);
  const rimT = toLocal(C, rimW.clone().add(carW(0, 0.05, -0.03).sub(carW(0, 0, 0))));
  const hookK = e3(pr(t, T.ha0, T.ha1 - T.ha0));
  let cL = lerpV(cRestL, cShowL, upK);
  if (t >= T.dn0) cL = lerpV(lerpV(cShowL, cRestL, e3(pr(t, T.dn0, 0.45))), rimT, hookK);
  if (t > T.ha1 + 0.2) cL = lerpV(rimT, cRestL, e3(pr(t, T.ha1 + 0.2, 0.5)));
  const pulleyW = rimW.clone().add(carW(0, -0.06, -0.04).sub(carW(0, 0, 0)));
  const grab = toLocal(C, pulleyW.clone().add(carW(0, -0.1, -0.1).sub(carW(0, 0, 0))));
  const pulled = toLocal(C, pulleyW.clone().add(carW(0, -0.15, -0.45).sub(carW(0, 0, 0))));
  const pullK = e3(pr(t, T.p0, T.p1 - T.p0));
  let cR = lerpV(cRestR, cShowR, upK);
  if (t >= T.ha1) cR = lerpV(cRestR, grab, e3(pr(t, T.ha1, 0.4)));
  if (t >= T.p0) cR = lerpV(grab, pulled, pullK * 0.5 + 0.5 * Math.abs(Math.sin(pullK * Math.PI * 3)) * (1 - pullK));
  if (t >= T.p1 + 0.1) cR = lerpV(pulled, cRestR, e3(pr(t, T.p1 + 0.1, 0.5)));
  C.pose(cL, cR, V(-0.36, 1.05, -0.05), V(0.36, 1.05, -0.05));
  C.G.updateMatrixWorld(true); B.G.updateMatrixWorld(true);
  // el trinquete: en la mano de C, luego colgado de la rueda (orientado hacia la puerta)
  const handLw = C.arms[0].glove.getWorldPosition(V());
  const inHand = handLw.clone().add(V(0, -0.05, 0));
  const tp = t < T.ha1 ? inHand : pulleyW;
  tool.position.copy(tp);
  const toDoor = corner.clone().sub(tp).normalize();
  tool.quaternion.setFromUnitVectors(V(0, -1, 0), t < T.ha1 ? V(0, -1, 0) : toDoor.clone().negate().multiplyScalar(-1));
  if (t >= T.ha1) { tool.up.set(0, 1, 0); tool.quaternion.setFromUnitVectors(V(0, 1, 0), toDoor.clone().negate()); }
  // rayos X: las chapas se vuelven transparentes; la rueda dentada gira al tirar y el trinquete la bloquea al volver
  const xr = sm(T.x0 - 0.2, T.x0 + 0.2, t) * (1 - sm(T.x1 - 0.2, T.x1, t));
  ratchet.plateM.opacity = 1 - 0.8 * xr; ratchet.plateM.depthWrite = xr < 0.5;
  ratchet.sheave.rotation.z = -Math.PI * 6 * pullK + 0.18 * pulse(t, T.back + 0.1, 0.08);
  ratchet.pawl.rotation.z = 0.25 * Math.abs(Math.sin(pullK * Math.PI * 12)) * (pullK < 1 ? 1 : 0);
  ratchet.pm.emissiveIntensity = 2.2 * xr * (0.4 + 0.6 * pulse(t, T.back + 0.12, 0.25)); ratchet.sm2.emissiveIntensity = 0.6 * xr;
  // la lupa: aparece al tensarse la cuerda, gira (clic, clic…) en el sentido de tirar y, al volver, el trinquete la bloquea
  const lk = sm(T.x0 - 0.2, T.x0 + 0.2, t) * (1 - sm(T.x1 - 0.25, T.x1, t));
  lens.visible = lk > 0.003;
  if (lens.visible) {
    lens.position.copy(carW(LENS.x, LENS.y, LENS.z)); lens.lookAt(cam.position);
    lens.scale.setScalar(LENS_K * Math.max(0.001, mx(0.2, 1, bk(cl(lk)))));
    const spinK = e3(pr(t, T.cuerda + 0.3, T.trinquete2 - T.cuerda - 0.45));
    bigP.sheave.rotation.z = -Math.PI * 2.5 * spinK + 0.14 * pulse(t, T.back + 0.12, 0.07);
    bigP.pawl.rotation.z = spinK > 0 && spinK < 1 ? 0.3 * Math.abs(Math.sin(spinK * Math.PI * 15)) : 0;
    bigP.pm.emissiveIntensity = 0.5 + 3.2 * pulse(t, T.back + 0.14, 0.22);
  }
  // la cuerda: del gancho de B (en su mano o en la puerta) al trinquete (con comba hasta que se tensa)
  const hookPos = t < T.hb1 ? B.arms[1].glove.getWorldPosition(V()).add(V(0, -0.06, 0)) : corner;
  rope.hookB.position.copy(hookPos); rope.hookB.rotation.set(0, B.G.rotation.y, Math.PI);
  const ropeA = hookPos.clone().add(V(0, -0.005, 0)), ropeB = tool.localToWorld(V(0, -0.03, 0));
  const L0 = ropeA.distanceTo(ropeB), slack = mx(0.55, 0.0, sm(T.p0 + 0.1, T.p1 - 0.2, t));
  let pts = sagCurve(ropeA, ropeB, slack * (0.4 + 0.6 * Math.min(1, L0)), 18);
  pts = pts.map(p => { const g0 = hY(p.x) + 0.012; if (p.y < g0) p.y = g0; return p; });
  placeRope(ropeSegs, pts);
  // el extremo suelto: del trinquete a la mano de C (mientras tira) y al rollo en el suelo
  const handL = C.arms[1].glove.getWorldPosition(V());
  const coilW = carW(1.25, 0.012, -1.78); coilW.y = hY(coilW.x) + 0.012; rope.coil.position.copy(coilW); rope.coil.rotation.set(Math.PI / 2, 0, 0);
  const holding = t >= T.ha1 && t < T.p1 + 0.4;
  const fpts = holding ? [ropeB, handL, coilW] : [ropeB, coilW];
  const fcurve = new THREE.CatmullRomCurve3(fpts.length === 2 ? [ropeB, ropeB.clone().lerp(coilW, 0.5).add(V(0, -0.05, 0)), coilW] : fpts);
  placeRope(freeSegs, fcurve.getPoints(freeSegs.length).map(p => { const g0 = hY(p.x) + 0.012; if (p.y < g0) p.y = g0; return p; }));
}

// ------------------------------------------------------------------ la capa 2D
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
function chip(x, y, txt0, col, a, s = 1) {
  if (a <= 0.01) return;
  g.save(); g.globalAlpha = cl(a); g.translate(x, y); g.scale(s, s);
  rr(-140, -62, 280, 124, 30); g.fillStyle = 'rgba(8,10,14,0.92)'; g.fill(); g.strokeStyle = col; g.lineWidth = 6; g.stroke();
  txt(txt0, 0, 26, 76, '#F4F6F8', 400, 'center', 'Bebas'); g.restore();
}
function closingElite(t) {             // la placa de ÉLITE BOMBEROS (venta de la academia, como pide Adrián)
  const a = prog(t, CUE.marca - 0.1, 0.35);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const hg = g.createRadialGradient(540, 900, 50, 540, 900, 620);
  hg.addColorStop(0, 'rgba(255,122,47,0.45)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = hg; g.fillRect(0, 300, W2, 1200);
  const s = lerp(0.6, 1, back(prog(t, CUE.marca - 0.1, 0.55)));
  g.save(); g.translate(540, 880); g.scale(s, s);
  g.font = `400 132px Bebas`; const tw = g.measureText('ÉLITE BOMBEROS').width;
  const pw = tw + 100, ph = 200;
  rr(-pw / 2, -ph / 2, pw, ph, 32);
  const pg = g.createLinearGradient(0, -ph / 2, 0, ph / 2); pg.addColorStop(0, '#FFD65C'); pg.addColorStop(1, '#E88C1E');
  g.fillStyle = pg; g.shadowColor = 'rgba(255,122,47,0.9)'; g.shadowBlur = 60; g.fill(); g.shadowBlur = 0;
  rr(-pw / 2 + 8, -ph / 2 + 8, pw - 16, 22, 11); g.fillStyle = 'rgba(255,240,190,0.35)'; g.fill();
  txt('ÉLITE BOMBEROS', 0, 48, 132, '#160F05', 400, 'center', 'Bebas');
  g.restore();
  const la = eo(prog(t, CUE.marca + 0.6, 0.4));
  g.globalAlpha = a * la;
  txt('Prepárate de la mano de un bombero.', 540, 1080 + 20 * (1 - la), 50, WHITE, 800, 'center');
  const pa = prog(t, CUE.prueba, 0.45);
  if (pa > 0) {
    const ps = back(pa);
    g.globalAlpha = a * clamp(pa * 2);
    g.save(); g.translate(540, 1270); g.scale(ps, ps);
    rr(-430, -78, 860, 156, 78); g.fillStyle = EMBER; g.shadowColor = 'rgba(255,122,47,0.8)'; g.shadowBlur = 40; g.fill(); g.shadowBlur = 0;
    txt('SIN MATRÍCULA · SIN PERMANENCIA', 0, 26, 70, '#FFFFFF', 400, 'center', 'Bebas');
    g.restore();
    g.globalAlpha = a * prog(t, CUE.prueba + 0.5, 0.4);
    txt('elitebomberos.com · enlace en la bio', 540, 1420, 40, DIM, 600, 'center');
  }
  g.restore();
}
async function overlay(t) {
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const win = (t0, t1) => sm(t0 - 0.12, t0 + 0.08, t) * (1 - sm(t1 - 0.2, t1, t));
  const pop = t0 => 1 + 0.16 * pulse(t, t0 + 0.12, 0.18);
  const corner = DW(CORNER_D.x, CORNER_D.y, CORNER_D.z), rimW = carW(RIM.x, RIM.y, RIM.z);
  // el herido y la puerta que se cierra
  tag(carW(0.0, 1.22, -0.42), 'HERIDO', ORANGE2, win(T.herido - 0.1, T.cierra), 0, 0, { px: 60, icon: 'warn', at: [300, 1000], s: pop(T.herido) });
  const da = win(T.cierra - 0.2, T.cuesta - 0.1);
  if (da > 0.01) { const a0 = DW(-1.0, 0.95, -0.05), d1 = DW(-1.0, 0.95, 0.45); arrow2(a0, d1, RED2, da * (t < T.encima + 0.1 ? 1 : 0.5)); }
  label(540, 1430, t < T.encima ? '¡SE CIERRA!' : '¡QUIETA!', t < T.encima ? RED2 : GREEN2, win(T.cierra - 0.1, T.cuesta - 0.15), { px: 76, icon: t < T.encima ? 'warn' : 'ok', s: pop(t < T.encima ? T.cierra : T.encima) });
  // la cuesta: flecha sobre la carretera; la puerta vuelve sola
  const sa = win(T.cuesta - 0.1, T.sabes - 0.1);
  if (sa > 0.01) { const r0 = carW(-1.8, 0.02, -2.8), r1 = carW(1.8, 0.02, -2.8); arrow2(r0, r1, GOLD2, sa, 10);
    const m = proj(r0.clone().lerp(r1, 0.5)); if (m.ok) label(m.x, m.y + 70, 'CUESTA ARRIBA 12 %', GOLD2, sa, { px: 56 }); }
  tag(DW(-0.9, 1.0, -0.06), 'LA PUERTA VUELVE SOLA', RED2, win(T.vuelve - 0.1, T.sabes - 0.1), 0, 0, { px: 56, icon: 'warn', at: [560, 1450], s: pop(T.vuelve) });
  // ¿qué es esto? → el trinquete de seguridad
  const tw0 = tool.getWorldPosition(V());
  label(540, 760, '¿QUÉ ES ESTO?', GOLD2, win(T.sabes - 0.1, T.trinquete - 0.05), { px: 96, s: pop(T.sabes) });
  ring(tw0, GOLD2, win(T.esto - 0.1, T.trinquete - 0.05), T.esto, t, 44);
  tag(tw0, 'TRINQUETE DE SEGURIDAD', GOLD2, win(T.trinquete - 0.08, T.gancho - 0.1), 0, 0, { px: 62, sub: 'ROPE RATCHET', at: [540, 1380], s: pop(T.trinquete) });
  // los dos ganchos y el tirón
  tag(corner, 'GANCHO 1 · PUERTA', CYAN2, win(T.gancho - 0.05, T.cuerda), 0, 0, { px: 56, at: [330, 880], s: pop(T.gancho) });
  tag(rimW, 'GANCHO 2 · COCHE', CYAN2, win(T.otro - 0.05, T.cuerda), 0, 0, { px: 56, at: [720, 1430], s: pop(T.otro) });
  const pa = win(T.tiras - 0.1, T.suelto + 0.6);
  if (pa > 0.01) { const p0 = tool.localToWorld(V(0, -0.06, 0)), dirW = carW(0.15, -0.2, -0.42).sub(carW(0, 0, 0)).normalize(); arrow2(p0.clone().add(dirW.clone().multiplyScalar(0.12)), p0.clone().add(dirW.clone().multiplyScalar(0.5)), GREEN2, pa);
    label(800, 1520, 'TIRA', GREEN2, pa, { px: 70, s: pop(T.tiras) }); }
  const mid = corner.clone().lerp(rimW, 0.5);
  tag(mid, 'TENSA', GREEN2, win(T.tensa - 0.05, T.volver - 0.1), 0, 0, { px: 60, icon: 'ok', at: [270, 1210], s: pop(T.tensa) });
  // por dentro: el trinquete (el diente que solo deja girar en un sentido)
  // la lupa: el cono que la une al trinquete de verdad (en la rueda) y las flechas de la cuerda
  if (lens.visible) {
    const lk = sm(T.x0 - 0.2, T.x0 + 0.2, t) * (1 - sm(T.x1 - 0.25, T.x1, t));
    const pc = proj(lens.position), rgt = V(1, 0, 0).applyQuaternion(cam.quaternion), pe = proj(lens.position.clone().add(rgt.multiplyScalar(LENS_R * lens.scale.x)));
    const R = Math.hypot(pe.x - pc.x, pe.y - pc.y), p0 = proj(tool.getWorldPosition(V())), la = cl(lk * 1.2);
    const dx = p0.x - pc.x, dy = p0.y - pc.y, dd = Math.hypot(dx, dy);
    if (pc.ok && p0.ok && dd > R + 20) {
      const th = Math.atan2(dy, dx), ph = Math.acos(R / dd), t1 = [pc.x + R * Math.cos(th + ph), pc.y + R * Math.sin(th + ph)], t2 = [pc.x + R * Math.cos(th - ph), pc.y + R * Math.sin(th - ph)];
      g.save(); g.globalAlpha = la * 0.9;
      g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(t1[0], t1[1]); g.arc(pc.x, pc.y, R, th + ph, th - ph + Math.PI * 2, false); g.closePath(); g.fillStyle = 'rgba(72,214,255,0.10)'; g.fill();
      g.beginPath(); g.moveTo(t1[0], t1[1]); g.lineTo(p0.x, p0.y); g.lineTo(t2[0], t2[1]); g.strokeStyle = CYAN2; g.lineWidth = 3; g.setLineDash([14, 10]); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(p0.x, p0.y, 16, 0, 7); g.lineWidth = 5; g.stroke(); g.restore();
    }
    const LW = (x, y) => lens.localToWorld(V(x, y, 0));
    const ga = win(T.cuerda + 0.25, T.trinquete2 + 0.35) * la;          // al tirar: la cuerda entra por un lado y sale por el otro
    arrow2(LW(-0.2, -0.44), LW(-0.2, -0.12), GREEN2, ga, 9); arrow2(LW(0.2, -0.12), LW(0.2, -0.44), GREEN2, ga, 9);
    const ra = win(T.volver - 0.1, T.puerta3 - 0.1) * la;               // la puerta tira hacia atrás… y no se mueve
    arrow2(LW(-0.2, -0.12), LW(-0.2, -0.44), RED2, ra * (0.55 + 0.45 * pulse(t, T.back + 0.12, 0.3)), 9);
    tag(bigP.pawl.getWorldPosition(V()), 'TRINQUETE', GOLD2, win(T.trinquete2 - 0.05, T.puerta3 - 0.1) * la, 0, 0, { px: 60, sub: 'SOLO GIRA EN UN SENTIDO', at: [540, 1050], s: pop(T.trinquete2) });
  }
  const bk2 = win(T.volver - 0.1, T.puerta3 - 0.1);
  if (bk2 > 0.01) {
    label(540, 1480, 'NO VUELVE', GREEN2, bk2, { px: 72, icon: 'ok', s: pop(T.volver) }); }
  label(540, 1460, 'NO SE MUEVE', GREEN2, win(T.mueve - 0.1, T.trabajas), { px: 78, icon: 'ok', s: pop(T.mueve) });
  tag(carW(0.0, 1.22, -0.42), 'HERIDO', GREEN2, win(T.herido2 - 0.12, T.conocias - 0.1), 0, 0, { px: 60, icon: 'ok', at: [330, 960], s: pop(T.herido2) });   // el herido, atendido con calma (como al principio, pero en verde)
  // ¿lo conocías?
  const qa = sm(T.conocias - 0.15, T.conocias + 0.15, t) * (1 - sm(T.compartir - 0.4, T.compartir - 0.1, t));
  if (qa > 0.005) {
    g.save(); g.globalAlpha = qa; g.translate(540, 760);
    rr(-400, -66, 800, 132, 32); g.fillStyle = 'rgba(8,10,14,0.92)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke();
    txt('¿LO CONOCÍAS?', 0, 26, 80, '#F4F6F8', 400, 'center', 'Bebas'); g.restore();
    chip(360, 1470, 'SÍ', '#2DD4BF', qa * sm(T.si - 0.12, T.si + 0.1, t), 0.7 + 0.3 * bk(cl((t - T.si + 0.12) / 0.35)));
    chip(720, 1470, 'NO', '#F0457A', qa * sm(T.no - 0.12, T.no + 0.1, t), 0.7 + 0.3 * bk(cl((t - T.no + 0.12) / 0.35)));
    const ce = sm(T.comenta - 0.1, T.comenta + 0.2, t) * qa;
    if (ce > 0) { g.save(); g.globalAlpha = ce; g.translate(540, 1640); rr(-220, -44, 440, 88, 44); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 5; g.stroke(); txt('💬  COMENTA', 0, 18, 52, '#F2F5F8', 400, 'center', 'Bebas'); g.restore(); }
  }
  share(t);
  closingElite(t);
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
  const fr = pulse(t, T.encima - 0.05, 0.08) * 0.28;
  finMat.uniforms.uFlash.value = fr; finMat.uniforms.uFlashCol.value.setRGB(0.9, 0.08, 0.04);
  finMat.uniforms.uDim.value = mx(1, 0.88, sm(T.conocias - 0.1, T.conocias + 0.3, t) * (1 - sm(T.compartir - 0.3, T.compartir, t))) * mx(1, 0.72, sm(T.compartir - 0.2, T.compartir + 0.3, t)) * (1 - sm(T.end - 0.3, T.end, t));
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
    window.DBG = { scene, renderer, dof, bloom, finMat, A, B, C, car, carR, world, cam, THREE, update, tool };
    window.READY3D = true;
  } catch (e) { window.failed = 'trinquete: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
