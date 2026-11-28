// «Salva a tu hermano» — la cámara térmica, como un videojuego (idea de Adrián, Notion «DOMINGO 29», con publicidad de
// Élite Bomberos; formato de Javi del 26 nov con lo que pidió el cliente: 5 s para elegir y la herramienta explicada entera).
// De día, en una calle: la casa echa humo por las ventanas; curiosos tras el cordón, la autobomba y la ambulancia. Dentro, el
// pasillo lleno de humo: no se ve nada. Tú, con el ERA y la cámara térmica; su pantalla, en grande, enseña lo que ve: una
// pasada aparte en la que cada pieza tiene su temperatura (el humo no cuenta; el cristal no deja pasar el infrarrojo y
// refleja: en él sales tú). La cámara por dentro (lente de germanio → microbolómetro → procesador → pantalla), las escalas
// (blanco/negro y rojo/azul), lo que ve y lo que no. Al final, tu hermano a salvo en la ambulancia. Todo depende solo de t.
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
uniform vec3 uOrigin, uExtent, uDir, uWind; uniform float uFloor;
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
    p += uWind * age;
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
      uSX: { value: 1 }, uWind: { value: o.wind || V(0, 0, 0) }, uFloor: { value: o.floor ?? -1e9 }, uOrigin: { value: V(0, 0, 0) }, uExtent: { value: o.extent ? C(o.extent) : V(0.1, 0.1, 0.1) }, uDir: { value: V(1, 0, 0) },
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

// ================================================================== de día, una calle: la casa con humo y, dentro, el pasillo lleno de humo con TU HERMANO en el suelo
const world = new THREE.Group(); scene.add(world);
const outside = new THREE.Group(), inside = new THREE.Group(); world.add(outside, inside);     // en la pasada térmica solo cuenta «inside»
const RED2 = '#FF4B3E', GREEN2 = '#3EF08A', GOLD2 = '#FFC83D', CYAN2 = '#48D6FF', ORANGE2 = '#FF8A3D', WHITE2 = '#F4F6F8', BLUE2 = '#62B0FF', PINK2 = '#FF5C8A';
const LBLY = 690;
const GLOW = (col, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: col, fog: false }); m.color.multiplyScalar(k); return m; };
const std = (c, r = 0.6, mt = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt });
function onGround(obj, wx, wz, dy = 0) { obj.position.set(wx, -dy, wz); }
// la casa: fachada en z = 0 mirando a la calle (+Z); el pasillo en el centro, la cocina a la derecha y el salón (con el fuego) a la izquierda
const HX = 4.0, HZ = -9.0, H1 = 2.8, HTOP = 5.8, WT = 0.25;
const HALL = { x: 0.8, z0: -WT, z1: -8.6, h: 2.6 };
const KD = { z0: -3.45, z1: -2.05, h: 2.1 };            // la puerta de la cocina (doble, con cristal), en la pared derecha del pasillo
const LD = { z0: -8.0, z1: -7.1, h: 2.1 };            // la puerta del salón (abierta: el foco del fuego), en la pared izquierda
const HERO_P = V(-0.05, 0, -2.4);                     // tú, con la cámara térmica, delante de la puerta de la cocina
const BRO_Z = -6.75;                                  // tu hermano, boca abajo en el suelo del pasillo (pies en BRO_Z, cabeza hacia la puerta)
const DOOR = { x0: -0.5, x1: 0.5, h: 2.2 };
let sunL, hemi, truck, amb, beacons = [], ambLights = [];
let hero, heroM, dev, devM, bro, broOut, medic, partner, heroOut, pumpF, doorF;
let glassMeshes = [], kitchen, livingFire, fireL, glowSpr = [], hallSmoke = [], extSmoke = [], doorSmoke = [];
let thermRT, thermCam, scrMat, panelMat, panelU, uiScene, uiCam, UI = {};
const TH = { cache: new Map() };
function th(m, T, Gr = 0.0, F = 0.0, N = 0.04) { m.userData.th = { T, Gr, F, N }; return m; }
function thAll(obj, T, Gr = 0, F = 0, N = 0.04) { obj.traverse(o => { if (o.isMesh && !o.userData.th) th(o, T, Gr, F, N); }); return obj; }

// ------------------------------------------------------------------ paredes con huecos (puertas y ventanas) a base de bloques
function wallHoles(x0, x1, y0, y1, holes, mk) {            // holes: [[hx0, hx1, hy0, hy1], ...]; mk(cx0, cx1, cy0, cy1) crea el bloque
  const xs = [...new Set([x0, x1, ...holes.flatMap(h => [h[0], h[1]])])].sort((a, b) => a - b);
  const ys = [...new Set([y0, y1, ...holes.flatMap(h => [h[2], h[3]])])].sort((a, b) => a - b);
  for (let i = 0; i < xs.length - 1; i++) {
    let run = null;
    for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
      const hole = holes.some(h => cx > h[0] && cx < h[1] && cy > h[2] && cy < h[3]);
      if (!hole) { run = run ? [run[0], ys[j + 1]] : [ys[j], ys[j + 1]]; }
      if ((hole || j === ys.length - 2) && run) { mk(xs[i], xs[i + 1], run[0], run[1]); run = null; }
    }
  }
}
function plasterTex(base, seed, soot) {
  return canvasTex(512, 512, (x) => {
    x.fillStyle = base; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) { const v = rnd(i * 1.7 + seed); x.fillStyle = `rgba(${v < 0.5 ? '0,0,0' : '255,255,255'},0.035)`; x.fillRect(rnd(i * 2.3 + seed) * 512, rnd(i * 4.1 + seed) * 512, 3, 3); }
    if (soot) { for (let i = 0; i < 6; i++) { const gx = rnd(i * 5.3 + seed) * 512, gg = x.createRadialGradient(gx, 0, 10, gx, 0, 260); gg.addColorStop(0, 'rgba(20,18,16,0.55)'); gg.addColorStop(1, 'rgba(20,18,16,0)'); x.fillStyle = gg; x.fillRect(0, 0, 512, 512); } }
  }, { aniso: 8 });
}
function tileTex() {
  return canvasTex(512, 512, (x) => {
    x.fillStyle = '#b9ab92'; x.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const v = 170 + rnd(r * 8 + c) * 30; x.fillStyle = `rgb(${v},${v - 12},${v - 34})`; x.fillRect(c * 64 + 2, r * 64 + 2, 60, 60); }
  }, { aniso: 8 });
}

// ------------------------------------------------------------------ la cámara térmica (genérica, sin marca): cuerpo amarillo de goma, lente delante (−Z), pantalla detrás (+Z)
function makeTIC(screenMat) {
  const G = new THREE.Group();
  const yel = std(0xf0b21c, 0.5), blk = std(0x17181b, 0.55), rub = std(0x0c0c0d, 0.85);
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.rotation.set(rx, ry, rz); k.castShadow = true; G.add(k); return k; };
  add(new RoundedBoxGeometry(0.165, 0.135, 0.12, 3, 0.03), yel, 0, 0, 0);
  for (const y of [-0.06, 0.06]) add(new RoundedBoxGeometry(0.172, 0.026, 0.128, 2, 0.012), rub, 0, y, 0);
  add(new THREE.CylinderGeometry(0.036, 0.04, 0.05, 28), blk, 0, 0.004, -0.083, Math.PI / 2, 0, 0);
  const ge = new THREE.MeshPhysicalMaterial({ color: 0x24262d, metalness: 0.65, roughness: 0.12, clearcoat: 1, iridescence: 0.6, iridescenceIOR: 1.6 });
  add(new THREE.CircleGeometry(0.028, 32), ge, 0, 0.004, -0.1085, 0, Math.PI, 0);
  add(new RoundedBoxGeometry(0.13, 0.102, 0.012, 2, 0.006), blk, 0, 0.006, 0.062);
  const scr = add(new THREE.PlaneGeometry(0.112, 0.084), screenMat, 0, 0.006, 0.0685); scr.castShadow = false;
  add(new RoundedBoxGeometry(0.05, 0.03, 0.1, 2, 0.012), blk, 0, 0.092, 0);                  // asa
  for (const z of [-0.04, 0.04]) add(new THREE.BoxGeometry(0.03, 0.03, 0.016), blk, 0, 0.075, z);
  return { G, lens: V(0, 0.004, -0.115), scr };
}

// ------------------------------------------------------------------ tu hermano: un chico joven (camiseta, vaqueros); en el suelo boca abajo o, al final, sentado con manta y oxígeno
function personParts(R) {                     // materiales de piel y ropa para la pasada térmica
  R.G.traverse(o => { if (!o.isMesh) return; const c = o.material.color ? o.material.color.getHex() : 0;
    th(o, o.material === R.skinM ? 0.95 : o.material === R.hairM ? 0.8 : o.material === R.shoeM ? 0.56 : 0.84, 0, 0.22, 0.03); });
}
function makeBroLying() {
  const R = makePerson({ top: 0x3b6ea8, legs: 0x2d3b55, hair: 0x2a1d14, seed: 21, h: 1.02 });
  R.G.traverse(o => { if (o.isMesh) { const h = o.material.color.getHex(); if (h === 0xc89a7a) R.skinM = o.material; if (h === 0x2a1d14) R.hairM = o.material; if (h === 0x1c1c1e) R.shoeM = o.material; } });
  const k = 1.02, SH = s => V(0.22 * s, 1.34 * k, 0);
  R.pose = (t) => {                          // los brazos estirados hacia la puerta (iba gateando hacia la salida)
    const br = 0.006 * Math.sin(t * 2.2);
    R.head.rotation.set(0.25, 1.15, 0.0);
    for (const A of R.arms) {
      const W = V(0.2 * A.s + (A.s > 0 ? 0.06 : -0.02), 1.88 * k, -0.08 + (A.s > 0 ? 0.05 : -0.02)), E = V(0.3 * A.s, 1.62 * k, 0.02);
      const S = SH(A.s), r = ik2(S, W, E, 0.27 * k, 0.25 * k);
      between(A.up, S, r.E); A.el.position.copy(r.E); between(A.fo, r.E, r.W); A.hand.position.copy(r.W);
    }
    R.G.position.y = 0.13 + br;
  };
  const Q = new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, 0, 1), V(0, 1, 0));
  R.G.quaternion.setFromRotationMatrix(Q); R.G.position.set(0.14, 0.13, BRO_Z);
  R.pose(0); personParts(R);
  return R;
}
function makeBroSitting() {                    // sentado en la culata de la ambulancia: manta térmica y mascarilla de oxígeno
  const P = new THREE.Group(), z0 = -0.42;
  const tee = std(0x3b6ea8, 0.8), jeans = std(0x2d3b55, 0.85), skin = std(0xc89a7a, 0.6), hair = std(0x2a1d14, 0.9), shoe = std(0x1c1c1e, 0.6);
  const cap = (a, b, r, m) => { const k = new THREE.Mesh(new THREE.CapsuleGeometry(r, 1, 4, 10), m); const d = b.clone().sub(a), L = d.length(); k.position.copy(a).add(b).multiplyScalar(0.5); k.scale.set(1, Math.max(0.01, L / (1 + 2 * r)), 1); k.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); k.castShadow = true; P.add(k); return k; };
  const hip = V(-0.2, 0.68, z0), chest = V(-0.08, 1.07, z0);
  cap(hip, chest, 0.15, tee);
  for (const s of [-1, 1]) { const z = z0 + 0.1 * s;
    cap(V(-0.12, 0.64, z), V(0.26, 0.66, z), 0.075, jeans); cap(V(0.28, 0.63, z), V(0.38, 0.4, z), 0.065, jeans);
    const sh = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.08, 0.1, 2, 0.03), shoe); sh.position.set(0.43, 0.38, z); P.add(sh); }
  for (const s of [-1, 1]) {                  // las manos juntas sobre las rodillas
    const sh = chest.clone().add(V(0, -0.03, 0.19 * s)), el = V(0.05, 0.84, z0 + 0.2 * s), wr = V(0.22, 0.72, z0 + 0.05 * s);
    cap(sh, el, 0.05, tee); cap(el, wr, 0.044, skin);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.044, 10, 8), skin); hd.position.copy(wr); P.add(hd);
  }
  const neckTop = chest.clone().add(V(0.04, 0.1, 0));
  cap(chest.clone().add(V(0, 0.02, 0)), neckTop, 0.048, skin);
  const head = new THREE.Group(); head.position.copy(neckTop).add(V(0.02, 0.1, 0)); head.rotation.set(0, 0, -0.12); P.add(head);
  const hm = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 14), skin); hm.scale.set(1, 1.1, 0.92); head.add(hm);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.106, 18, 14, 0, Math.PI * 2, 0, 1.5), hair); hr.rotation.set(0, 0, 0.35); hr.position.set(-0.015, 0.012, 0); head.add(hr);
  // la mascarilla de oxígeno (transparente, verde) con su goma y el tubo
  const mk = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x9fe8c0, roughness: 0.15, transparent: true, opacity: 0.6, transmission: 0.3 }));
  mk.rotation.z = -Math.PI / 2; mk.position.set(0.085, -0.035, 0); mk.scale.set(1, 0.6, 0.9); head.add(mk);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.004, 6, 32), std(0x7fcfa0, 0.6)); band.rotation.set(0, 0, 0.4); band.position.set(0.0, 0.0, 0); band.scale.set(1, 0.8, 1.02); head.add(band);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.16, 1.27, z0), V(0.22, 1.05, z0 + 0.1), V(0.1, 0.85, z0 + 0.25), V(-0.3, 0.75, z0 + 0.4)]), 24, 0.008, 6), new THREE.MeshPhysicalMaterial({ color: 0xbff0d8, roughness: 0.2, transparent: true, opacity: 0.8 }));
  P.add(tube);
  const bm = new THREE.MeshStandardMaterial({ color: 0xd8a83a, metalness: 0.85, roughness: 0.32, side: THREE.DoubleSide, emissive: 0x3a2a08, emissiveIntensity: 0.4 });
  const bl = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.36, 0.64, 20, 1, true, -2.4, 4.8), bm); bl.position.set(-0.11, 0.84, z0); bl.rotation.set(0, -Math.PI / 2, 0.12); bl.castShadow = true; P.add(bl);
  P.userData.head = head;
  P.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return P;
}

// ------------------------------------------------------------------ tú: el bombero con el ERA y la cámara térmica en las manos (y su gemelo «reflejado» para el cristal)
function heroWithTIC(screenMat) {
  const R = makeHero({ helmet: 0xe8be2c });
  const T = makeTIC(screenMat); R.G.add(T.G); R.tic = T;
  R.aim = (pitch, lift) => {                 // la cámara delante del pecho; lift 0 = baja, 1 = en alto apuntando
    const p = lerpV(V(0.05, 1.02, -0.3), V(0.04, 1.3, -0.44), lift);
    T.G.position.copy(p); T.G.rotation.set(mx(-0.9, pitch, lift), 0, 0); T.G.updateMatrix();
    const L = V(-0.092, -0.02, 0.025).applyMatrix4(T.G.matrix), Rr = V(0.092, -0.02, 0.025).applyMatrix4(T.G.matrix);
    R.pose(L, Rr, V(-0.34, 1.08, -0.12), V(0.34, 1.08, -0.12));
  };
  return R;
}

// ------------------------------------------------------------------ la pasada térmica: cada pieza tiene su «temperatura» (0 frío … 1 muy caliente)
const THV = `varying vec3 vW; varying vec3 vN; varying vec3 vV;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const THF = `uniform float uT, uGr, uF, uN, uA; uniform sampler2D uTex; varying vec3 vW; varying vec3 vN; varying vec3 vV;
void main(){
  float T = uT + uGr * smoothstep(1.1, 2.6, vW.y);
  float n = texture2D(uTex, vW.xz * 0.37 + vW.y * vec2(0.21, 0.13)).r;
  T += (n - 0.5) * uN * 2.0;
  float f = abs(dot(normalize(vN), normalize(vV)));
  T -= uF * (1.0 - f);
  gl_FragColor = vec4(vec3(clamp(T, 0.0, 1.0)), uA);
}`;
function thMat(d) {
  const key = [d.T, d.Gr, d.F, d.N, d.A ?? 1].join('|');
  if (TH.cache.has(key)) return TH.cache.get(key);
  const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: d.T }, uGr: { value: d.Gr }, uF: { value: d.F }, uN: { value: d.N }, uA: { value: d.A ?? 1 }, uTex: { value: NOISE } },
    vertexShader: THV, fragmentShader: THF, side: THREE.DoubleSide, transparent: (d.A ?? 1) < 1, depthWrite: (d.A ?? 1) >= 1, fog: false });
  TH.cache.set(key, m); return m;
}

// ------------------------------------------------------------------ el mundo
function buildWorld() {
  mats(); M.paint = new THREE.MeshStandardMaterial({ color: 0xb0121a, roughness: 0.28, metalness: 0.05 });
  NOISE = NOISE || noiseTex();
  const SUN2 = V(0.38, 0.7, 0.6).normalize();
  scene.background = HAZE.clone(); scene.fog = new THREE.FogExp2(HAZE.clone(), 0.006); scene.environmentIntensity = 0.45;
  cam.far = 300; cam.updateProjectionMatrix();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(250, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: SUN2 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vD; uniform vec3 uSun; void main(){ float h = clamp(vD.y, 0.0, 1.0);
      vec3 c = mix(vec3(0.76, 0.76, 0.74), vec3(0.34, 0.52, 0.76), pow(h, 0.5)); float s = max(dot(vD, uSun), 0.0);
      c += vec3(1.0, 0.86, 0.62) * (pow(s, 300.0) * 6.0 + pow(s, 8.0) * 0.25); gl_FragColor = vec4(c, 1.0); }` }));
  sky.renderOrder = -1; sky.frustumCulled = false; outside.add(sky);
  hemi = new THREE.HemisphereLight(0xb4c6dc, 0x5a5040, 1.15); world.add(hemi);
  sunL = new THREE.DirectionalLight(0xfff0dc, 2.7); sunL.position.copy(SUN2).multiplyScalar(60).add(V(0, 0, 2)); sunL.target.position.set(0, 0, 2);
  sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
  Object.assign(sunL.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 20, far: 110 }); sunL.shadow.camera.updateProjectionMatrix();
  sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.03; world.add(sunL, sunL.target);
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const flat = (geo, mat, y = 0, p = outside) => { geo.rotateX(-Math.PI / 2); const m = new THREE.Mesh(geo, mat); m.position.y = y; m.receiveShadow = true; p.add(m); return m; };
  // la calle: aceras, bordillos, asfalto con sus líneas y pasos de cebra; tierra y césped detrás de las casas
  const dirt = canvasTex(512, 512, (x) => { x.fillStyle = '#7d7a45'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 22000; i++) { const g2 = 90 + rnd(i) * 70; x.fillStyle = `rgba(${g2 + 20},${g2 + 12},${g2 - 40},0.5)`; x.fillRect(rnd(i * 3.7) * 512, rnd(i * 6.1) * 512, 2, 4); } }, { aniso: 8 });
  dirt.wrapS = dirt.wrapT = THREE.RepeatWrapping; dirt.repeat.set(60, 40);
  flat(new THREE.PlaneGeometry(240, 160), new THREE.MeshStandardMaterial({ map: dirt, roughness: 0.95 }), -0.03);
  const asph = canvasTex(512, 512, (x) => { x.fillStyle = '#4c4e52'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 16000; i++) { const v = 55 + rnd(i) * 45; x.fillStyle = `rgba(${v},${v},${v + 2},0.5)`; x.fillRect(rnd(i * 3.1) * 512, rnd(i * 5.3) * 512, 2, 2); } }, { aniso: 8 });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(30, 1);
  const road = flat(new THREE.PlaneGeometry(240, 7.0), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.88 }), 0.0); road.position.z = 6.5;
  const pav = canvasTex(512, 512, (x) => { x.fillStyle = '#b8b3aa'; x.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const v = 172 + rnd(r * 8 + c + 50) * 26; x.fillStyle = `rgb(${v},${v - 4},${v - 10})`; x.fillRect(c * 64 + 2, r * 64 + 2, 60, 60); } }, { aniso: 8 });
  pav.wrapS = pav.wrapT = THREE.RepeatWrapping; pav.repeat.set(120, 1.5);
  for (const [z, d] of [[1.5, 3.0], [11.75, 3.5]]) { const s = flat(new THREE.PlaneGeometry(240, d), new THREE.MeshStandardMaterial({ map: pav, roughness: 0.8 }), 0.14); s.position.z = z; }
  const curbM = std(0xcfcac0, 0.7);
  for (const z of [3.0, 10.0]) { const c = new THREE.Mesh(new THREE.BoxGeometry(240, 0.15, 0.16), curbM); c.position.set(0, 0.075, z); c.receiveShadow = true; outside.add(c); }
  const line = std(0xe6e6de, 0.6);
  for (let x = -80; x < 80; x += 6) { const l = flat(new THREE.PlaneGeometry(3, 0.12), line, 0.006); l.position.set(x, 0.006, 6.5); }
  for (let k = 0; k < 7; k++) { const l = flat(new THREE.PlaneGeometry(0.5, 4.2), line, 0.007); l.position.set(-17 + k * 0.9, 0.007, 6.5); }
  // las casas de al lado (adosadas) y las de enfrente
  const nb = [[-8.35, 8.3, 6.2, 5, 2, 3, '#d9c7a4'], [8.35, 8.3, 6.8, 5, 2, 4, '#cfd6d8'], [-16.6, 8.2, 9.0, 5, 3, 5, '#e2d3b8'], [16.6, 8.2, 8.4, 5, 3, 6, '#d6c2b0']];
  for (const [x, w, h, c, r, sd, col] of nb) { const b = dayBuilding(w, h, 9, c, r, sd, col); b.position.set(x, h / 2, -4.5); outside.add(b); }
  for (let i = 0; i < 6; i++) { const w = 7.5 + rnd(i * 3) * 2, h = 6 + rnd(i * 5) * 5, x = -22 + i * 8.6; const b = dayBuilding(w, h, 9, 5, Math.round(h / 3), 10 + i, ['#d8cdb6', '#c9d2d6', '#e0cfb4', '#d1c6bb', '#cbd4c4', '#e4d8c2'][i]); b.position.set(x, h / 2, 21.0); b.rotation.y = Math.PI; outside.add(b); }
  // árboles en las aceras
  for (const [x, z, h, sd] of [[-13.5, 12.4, 6.5, 31], [-4.2, 12.6, 6.0, 32], [6.5, 12.5, 6.8, 33], [14.5, 12.4, 6.2, 34], [-14.0, 2.4, 6.0, 35], [13.6, 2.4, 6.4, 36]]) { const t = makeTree(h, sd); onGround(t, x, z); outside.add(t); trees.push(t); }

  // ---------------------------------------------------------------- la casa
  const facade = new THREE.MeshStandardMaterial({ map: plasterTex('#e6d9bf', 3, true), roughness: 0.9 });
  const frameM = std(0xf2f0ea, 0.5), sillM = std(0xcfc9bd, 0.6);
  const box = (x0, x1, y0, y1, z0, z1, m, p = outside) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); b.castShadow = b.receiveShadow = true; p.add(b); return b; };
  const winsF = [[-3.1, -1.7, 0.9, 2.25], [1.7, 3.1, 0.9, 2.25], [-3.0, -1.9, 3.6, 4.95], [-0.55, 0.55, 3.6, 4.95], [1.9, 3.0, 3.6, 4.95]];
  const holes = [[DOOR.x0, DOOR.x1, 0, DOOR.h], ...winsF];
  wallHoles(-HX, HX, 0, HTOP, holes, (a, b, c, d) => th(box(a, b, c, d, -WT, 0, facade, inside), 0.3, 0.1, 0, 0.03));
  for (const [a, b, c, d] of winsF) {                          // marcos, alféizares; dentro, oscuro (humo)
    box(a - 0.06, b + 0.06, d, d + 0.08, 0.0, 0.05, frameM); box(a - 0.06, b + 0.06, c - 0.06, c, 0.0, 0.12, sillM);
    box(a - 0.06, a, c, d, 0, 0.05, frameM); box(b, b + 0.06, c, d, 0, 0.05, frameM);
  }
  box(DOOR.x0 - 0.08, DOOR.x0, 0, DOOR.h + 0.08, 0, 0.06, frameM); box(DOOR.x1, DOOR.x1 + 0.08, 0, DOOR.h + 0.08, 0, 0.06, frameM); box(DOOR.x0 - 0.08, DOOR.x1 + 0.08, DOOR.h, DOOR.h + 0.08, 0, 0.06, frameM);
  box(-0.75, 0.75, 0, 0.14, 0.0, 0.5, sillM);                // escalón de la entrada
  const sideM = new THREE.MeshStandardMaterial({ map: plasterTex('#dccfb4', 5, false), roughness: 0.9 });
  th(box(-HX, -HX + WT, 0, HTOP, HZ, -WT, sideM, inside), 0.3); th(box(HX - WT, HX, 0, HTOP, HZ, -WT, sideM, inside), 0.3); th(box(-HX, HX, 0, HTOP, HZ - 0.01, HZ + WT, sideM, inside), 0.3);
  // tejado a dos aguas (teja árabe)
  const tiles = canvasTex(512, 512, (x) => { x.fillStyle = '#9c4a2c'; x.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) { const v = rnd(r * 16 + c + 7); x.fillStyle = `rgba(${150 + v * 50},${70 + v * 25},${40 + v * 15},0.9)`; x.fillRect(c * 32 + (r % 2) * 16, r * 32, 30, 28); x.fillStyle = 'rgba(40,20,10,0.35)'; x.fillRect(c * 32 + (r % 2) * 16, r * 32 + 26, 30, 4); } }, { aniso: 8 });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(4, 3);
  const roofM = new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.75 }), RH = 1.6, RL = Math.hypot(4.7, RH);
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.08, RL), roofM); r.position.set(0, HTOP + RH / 2, -4.5 + s * 2.35); r.rotation.x = s * Math.atan2(RH, 4.7); r.castShadow = r.receiveShadow = true; outside.add(r); }
  const gableM = sideM.clone(); gableM.side = THREE.DoubleSide;
  for (const s of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(-4.5, 0); sh.lineTo(4.5, 0); sh.lineTo(0, RH); sh.closePath(); const gb = new THREE.Mesh(new THREE.ShapeGeometry(sh), gableM); gb.rotation.y = Math.PI / 2; gb.position.set(s * (HX - 0.01), HTOP, -4.5); outside.add(gb); }
  // la planta de arriba: su suelo (el techo del pasillo) y, tras las ventanas, humo oscuro
  th(box(-HX + WT, HX - WT, HALL.h, H1, HZ + WT, -WT, std(0x8a847a, 0.9), inside), 0.78, 0, 0, 0.06);
  const dark = GLOW(0x141210, 1);
  for (const [a, b, c, d] of winsF.slice(2)) { const p = new THREE.Mesh(new THREE.PlaneGeometry(b - a, d - c), dark); p.position.set((a + b) / 2, (c + d) / 2, -0.6); outside.add(p); }
  // el pasillo: suelo de baldosa, paredes con hollín, techo; la puerta de la cocina (con cristal) a la derecha y la del salón a la izquierda
  const tt = tileTex(); tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(2, 10);
  const floor = flat(new THREE.PlaneGeometry(7.5, 8.75), new THREE.MeshStandardMaterial({ map: tt, roughness: 0.55 }), 0.002, inside); floor.position.z = -4.5 - 0.12; th(floor, 0.24, 0, 0, 0.03);
  const hallM = new THREE.MeshStandardMaterial({ map: plasterTex('#cfc4ae', 9, true), roughness: 0.92 });
  wallHoles(HALL.z1, HALL.z0, 0, HALL.h, [[KD.z0, KD.z1, 0, KD.h]], (a, b, c, d) => th(box(HALL.x, HALL.x + 0.1, c, d, a, b, hallM, inside), 0.36, 0.34, 0, 0.05));
  wallHoles(HALL.z1, HALL.z0, 0, HALL.h, [[LD.z0, LD.z1, 0, LD.h]], (a, b, c, d) => th(box(-HALL.x - 0.1, -HALL.x, c, d, a, b, hallM, inside), 0.38, 0.34, 0, 0.05));
  th(box(-HALL.x - 0.1, HALL.x + 0.1, 0, HALL.h, HALL.z1 - 0.12, HALL.z1, hallM, inside), 0.42, 0.3, 0, 0.05);
  const skirt = std(0x5a524a, 0.7);
  for (const s of [-1, 1]) th(box(s * HALL.x - (s > 0 ? 0.01 : 0), s * HALL.x + (s > 0 ? 0 : 0.01), 0, 0.09, HALL.z1, HALL.z0, skirt, inside), 0.3);
  // la puerta de la cocina: dos hojas con cristal (B, «tras el cristal»)
  const leafM = std(0xb08a5a, 0.6);
  const kdz = (KD.z0 + KD.z1) / 2, lw = (KD.z1 - KD.z0) / 2;
  for (const s of [-1, 1]) {
    const zc = kdz + s * lw / 2, z0 = zc - lw / 2, z1 = zc + lw / 2, gx = HALL.x + 0.05;
    wallHoles(z0, z1, 0, KD.h, [[z0 + 0.09, z1 - 0.09, 0.45, KD.h - 0.12]], (a, b, c, d) => th(box(gx - 0.025, gx + 0.025, c, d, a, b, leafM, inside), 0.36, 0.3, 0, 0.03));
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(lw - 0.18, KD.h - 0.57), new THREE.MeshPhysicalMaterial({ color: 0xb8c8cc, roughness: 0.04, metalness: 0.0, transparent: true, opacity: 0.22, depthWrite: false, envMapIntensity: 1.6 }));
    gl.rotation.y = -Math.PI / 2; gl.position.set(gx - 0.002, 0.45 + (KD.h - 0.57) / 2, zc); inside.add(gl); glassMeshes.push(gl);
    th(gl, 0.32, 0.06, 0, 0.0); gl.userData.th.A = 0.42;
    box(gx - 0.035, gx - 0.025, 1.0, 1.06, zc - s * (lw / 2 - 0.12) - 0.06, zc - s * (lw / 2 - 0.12) + 0.06, std(0xc9ccd2, 0.3, 0.8), inside);   // tirador
  }
  // la cocina (tras el cristal): oscura y con humo; en la pasada térmica no se ve (el cristal no deja pasar el infrarrojo)
  kitchen = new THREE.Group(); world.add(kitchen);
  const kM = std(0x8c8a84, 0.8);
  box(HALL.x + 0.1, HX - WT, 0, HALL.h, -4.6, -4.5, kM, kitchen);
  box(2.9, 3.7, 0, 0.9, -4.4, -0.4, std(0xd8d4cc, 0.6), kitchen); box(2.9, 3.7, 0.9, 0.95, -4.4, -0.4, std(0x3a3a3c, 0.4), kitchen);
  box(2.95, 3.65, 0, 1.85, -1.4, -0.75, std(0xe8e8e8, 0.35, 0.2), kitchen);
  box(1.5, 2.3, 0, 0.75, -3.4, -2.2, std(0x8b6a48, 0.7), kitchen);
  // el salón (izquierda, al fondo): el foco del fuego en el sofá
  const lv = new THREE.Group(); inside.add(lv);
  th(box(-HX + WT, -HALL.x - 0.1, 0, HALL.h, -4.7, -4.6, std(0x3a3632, 0.9), lv), 0.62, 0.3);
  const sofa = th(box(-3.4, -1.6, 0, 0.75, -8.6, -7.8, std(0x4a2a1e, 0.9), lv), 0.97, 0, 0, 0.03);
  th(box(-3.4, -1.6, 0.4, 1.0, -8.75, -8.55, std(0x3a1e16, 0.9), lv), 0.95);
  th(box(-3.7, -3.3, 0, 1.6, -6.4, -5.2, std(0x2a2a2c, 0.6), lv), 0.66);
  livingFire = new Flames(tongues(16, 5, (i, r) => [-3.3 + r(1) * 1.6, 0.6, -8.4 + r(2) * 0.5, 0.5 + r(3) * 0.4, 0.9 + r(4) * 0.9]), { seed: 5, bright: 1.8 });
  lv.add(livingFire.mesh); livingFire.mesh.userData.thKeep = true;
  fireL = new THREE.PointLight(0xff7a2a, 30, 9, 1.6); fireL.position.set(-2.4, 1.2, -7.9); inside.add(fireL);
  // el fuego también en la habitación de delante (se ve desde la calle por la ventana de abajo a la izquierda; desde el pasillo, la pared lo tapa)
  const frontFire = new Flames(tongues(12, 9, (i, r) => [-3.0 + r(1) * 1.2, 0.2, -1.0 - r(2) * 0.6, 0.55 + r(3) * 0.35, 1.1 + r(4) * 1.0]), { seed: 9, bright: 2.0 });
  outside.add(frontFire.mesh);
  const ffL = new THREE.PointLight(0xff7a2a, 18, 7, 1.6); ffL.position.set(-2.4, 1.3, -0.9); outside.add(ffL); window.FFL = ffL;
  th(box(-3.6, -1.2, 0, 0.5, -1.6, -0.9, std(0x3a2418, 0.9), outside), 0.9);
  // la puerta del salón: las llamas salen al pasillo por arriba (se ven al fondo, a la izquierda)
  const doorFire = new Flames(tongues(10, 13, (i, r) => [-0.95 - r(1) * 0.3, 0.15 + r(5) * 0.8, -7.9 + r(2) * 0.75, 0.35 + r(3) * 0.25, 0.8 + r(4) * 0.8]), { seed: 13, bright: 1.7 });
  lv.add(doorFire.mesh); doorFire.mesh.userData.thKeep = true;
  // el brillo del fuego entre el humo (se ve desde el pasillo, por la puerta del salón)
  const glowTex = canvasTex(256, 256, (x) => { const gg = x.createRadialGradient(128, 128, 0, 128, 128, 128); gg.addColorStop(0, 'rgba(255,170,80,1)'); gg.addColorStop(0.35, 'rgba(255,110,30,0.45)'); gg.addColorStop(1, 'rgba(255,80,20,0)'); x.fillStyle = gg; x.fillRect(0, 0, 256, 256); }, { srgb: true });
  for (const [x, y, z, s] of [[-0.95, 1.0, -7.55, 2.2], [-2.3, 1.2, -7.9, 3.0]]) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    sp.position.set(x, y, z); sp.scale.setScalar(s); sp.material.color.setScalar(1.4); inside.add(sp); glowSpr.push(sp); }
  // la puerta de la calle, abierta hacia dentro
  const door = new THREE.Group(); door.position.set(DOOR.x0 + 0.02, 0, -WT); door.rotation.y = -1.62; inside.add(door);
  th(box(0, 0.98, 0, DOOR.h - 0.02, -0.025, 0.025, std(0x6b4a30, 0.6), door), 0.3);
  // la manguera: de la autobomba, por la acera, hasta dentro del pasillo
  const hp = [V(-5.6, 0.95, 4.95), V(-5.4, 0.2, 4.6), V(-4.6, 0.2, 3.4), V(-3.0, 0.2, 2.2), V(-1.2, 0.2, 1.3), V(-0.2, 0.22, 0.6), V(0.15, 0.06, -0.4), V(0.35, 0.05, -1.4), V(0.42, 0.05, -2.0)];
  const hose = hoseMesh(hp, 0.045, 0xe9e3d3); outside.add(hose.mesh); hose.mesh.receiveShadow = true;
  const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.32, 16), std(0x2c2e33, 0.4, 0.7)); noz.position.set(0.44, 0.05, -2.2); noz.rotation.x = Math.PI / 2; inside.add(noz); th(noz, 0.3);

  // ---------------------------------------------------------------- tú, tu hermano y el gemelo reflejado (solo para la pasada térmica)
  thermRT = new THREE.WebGLRenderTarget(640, 480, { type: THREE.UnsignedByteType, depthBuffer: true });
  thermRT.texture.minFilter = THREE.LinearFilter; thermRT.texture.magFilter = THREE.LinearFilter;
  thermCam = new THREE.PerspectiveCamera(36, 4 / 3, 0.04, 30);
  panelU = { tT: { value: thermRT.texture }, uSplit: { value: 1 }, uOn: { value: 0 }, uTime: { value: 0 }, uZoom: { value: 1 }, uZc: { value: new THREE.Vector2(0.5, 0.5) }, uGain: { value: 1 }, uBoot: { value: 0 } };
  const PANF = `uniform sampler2D tT; uniform float uSplit, uOn, uTime, uZoom, uGain, uBoot; uniform vec2 uZc; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  vec3 iron(float x){
    vec3 c0 = vec3(0.03, 0.04, 0.28), c1 = vec3(0.3, 0.05, 0.62), c2 = vec3(0.86, 0.06, 0.36), c3 = vec3(1.0, 0.38, 0.02), c4 = vec3(1.0, 0.85, 0.18), c5 = vec3(1.0, 1.0, 0.92);
    if (x < 0.25) return mix(c0, c1, x / 0.25); if (x < 0.5) return mix(c1, c2, (x - 0.25) / 0.25); if (x < 0.72) return mix(c2, c3, (x - 0.5) / 0.22);
    if (x < 0.9) return mix(c3, c4, (x - 0.72) / 0.18); return mix(c4, c5, (x - 0.9) / 0.1); }
  void main(){
    vec2 uv = uZc + (vUv - 0.5) / uZoom;
    float T = texture2D(tT, uv).r;
    T += (h(floor(vUv * vec2(320.0, 240.0)) + fract(uTime * 3.7)) - 0.5) * 0.035;
    T = clamp(T, 0.0, 1.0);
    vec3 gray = vec3(pow(T, 1.15));
    vec3 col = vUv.x < uSplit ? gray : iron(T);
    float boot = step(vUv.y, uBoot) * 1.0;
    float scan = 0.94 + 0.06 * sin(vUv.y * 480.0);
    vec3 noise = vec3(h(vUv * 777.0 + uTime) * 0.25 + 0.08);
    col = mix(noise, col * scan, uOn);
    col *= boot;
    gl_FragColor = vec4(col * uGain, 1.0);
  }`;
  const PANV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  panelMat = new THREE.ShaderMaterial({ uniforms: panelU, vertexShader: PANV, fragmentShader: PANF, depthTest: false, depthWrite: false });
  scrMat = new THREE.ShaderMaterial({ uniforms: { ...panelU, uGain: { value: 1.7 } }, vertexShader: PANV, fragmentShader: PANF });
  hero = heroWithTIC(scrMat); inside.add(hero.G); hero.G.position.copy(HERO_P);
  hero.G.traverse(o => { if (o.isMesh) th(o, 0.6, 0, 0.18, 0.03); });
  heroM = heroWithTIC(scrMat); world.add(heroM.G); heroM.G.matrixAutoUpdate = false; heroM.G.visible = false;
  heroM.G.traverse(o => { if (o.isMesh) th(o, o.material === scrMat ? 0.92 : 0.74, 0, 0.22, 0.03); });
  bro = makeBroLying(); inside.add(bro.G);
  hero.G.name = 'TU'; heroM.G.name = 'REFLEJO'; bro.G.name = 'HERMANO';
  // ---------------------------------------------------------------- el humo: columnas negras por las ventanas, gris por la puerta; dentro, humo que rueda por el techo
  const SM_OUT = [[0.07, 0.065, 0.06], [0.16, 0.15, 0.14], [0.3, 0.29, 0.28], [0.46, 0.46, 0.47]];
  const ext = (n, x, y, z, o) => { const p = new Parts(n, { life: o.life || 4.5, rise: o.rise ?? 0.9, acc: 0.08, size: o.size || 0.5, grow: o.grow || 3.2, turb: o.turb ?? 0.45, opacity: o.op ?? 0.8, c: o.c || SM_OUT, seed: o.seed, extent: o.ext || [0.4, 0.2, 0.12], order: 11, wind: o.wind || V(0.35, 0, 0.1) });
    p.at(x, y, z); outside.add(p.mesh); extSmoke.push(p); return p; };
  ext(60, -2.45, 4.85, 0.25, { seed: 1, size: 0.55 }); ext(60, 0.0, 4.85, 0.25, { seed: 2, size: 0.5 }); ext(55, 2.45, 4.85, 0.25, { seed: 3, size: 0.5 });
  ext(55, -2.4, 2.1, 0.25, { seed: 4, size: 0.45, life: 3.6 });
  ext(80, 0.6, 7.4, -3.5, { seed: 5, size: 1.1, grow: 3.0, life: 7.0, rise: 1.3, ext: [3.0, 0.4, 2.5], op: 0.7 });
  ext(30, 2.45, 2.1, 0.25, { seed: 6, size: 0.35, life: 3.2, op: 0.5, c: [[0.2, 0.19, 0.18], [0.3, 0.29, 0.28], [0.42, 0.42, 0.42], [0.55, 0.55, 0.56]] });
  const ds = new Parts(45, { life: 3.4, rise: 0.55, acc: 0.06, size: 0.42, grow: 2.6, turb: 0.3, opacity: 0.75, c: [[0.22, 0.21, 0.2], [0.3, 0.29, 0.28], [0.42, 0.42, 0.42], [0.55, 0.55, 0.56]], seed: 7, extent: [0.38, 0.12, 0.1], order: 11, wind: V(0.1, 0, 0.35) });
  ds.at(0, 2.0, 0.15); outside.add(ds.mesh); doorSmoke.push(ds);
  // la cortina de humo justo dentro de la puerta (desde fuera no se ve el pasillo) y el humo del pasillo
  const HS = [[0.1, 0.097, 0.092], [0.12, 0.116, 0.11], [0.13, 0.126, 0.12], [0.12, 0.117, 0.112]];
  const hs = (n, x, y, z, o) => { const p = new Parts(n, { life: o.life || 6, rise: o.rise ?? 0.05, acc: 0, size: o.size || 1.2, grow: 1.6, turb: o.turb ?? 0.25, opacity: o.op ?? 0.5, c: HS, seed: o.seed, extent: o.ext, order: 11, rot: 1.0, wind: o.wind || V(0, 0, 0.18) });
    p.at(x, y, z); inside.add(p.mesh); hallSmoke.push(p); p.base = ['uC0', 'uC1', 'uC2', 'uC3'].map(k => p.u[k].value.clone()); return p; };
  hs(26, 0, 1.4, -0.7, { seed: 11, ext: [0.6, 0.8, 0.35], op: 0.55, size: 1.0 });
  hs(40, 0, 2.15, -4.2, { seed: 12, ext: [0.65, 0.35, 3.8], op: 0.5, size: 1.4, wind: V(0, 0, 0.3) });
  hs(40, 0, 0.9, -5.2, { seed: 13, ext: [0.6, 0.7, 2.6], op: 0.45, size: 1.2 });
  hs(18, 2.2, 1.3, -2.6, { seed: 14, ext: [1.0, 0.9, 1.6], op: 0.55, size: 1.4 });

  // ---------------------------------------------------------------- la autobomba, la ambulancia, los bomberos de fuera y los curiosos
  truck = makeTruck(); truck.position.set(-8.6, 0, 6.0); world.add(truck); outside.attach(truck); truck.updateMatrixWorld(true); beacons = truck.userData.lbar;
  truck.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  amb = new THREE.Group(); amb.position.set(9.4, 0, 5.6); outside.add(amb);
  const white = std(0xf2f2ee, 0.4, 0.1), add2 = (geo, m, x, y, z, p = amb) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = k.receiveShadow = true; p.add(k); return k; };
  add2(new RoundedBoxGeometry(3.6, 2.2, 2.1, 3, 0.1), white, -0.6, 1.5, 0); add2(new RoundedBoxGeometry(1.5, 1.6, 2.05, 3, 0.12), white, 1.9, 1.2, 0);
  add2(new THREE.BoxGeometry(5.0, 0.12, 2.12), new THREE.MeshStandardMaterial({ color: 0xd8241c, roughness: 0.5 }), 0.2, 1.05, 0);
  add2(new THREE.BoxGeometry(5.0, 0.1, 2.13), new THREE.MeshStandardMaterial({ color: 0xf2c21a, roughness: 0.5 }), 0.2, 0.88, 0);
  add2(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.05, metalness: 0.6 }), 2.66, 1.55, 0).rotation.y = Math.PI / 2;
  for (const [x, z] of [[1.8, 0.95], [1.8, -0.95], [-1.6, 0.95], [-1.6, -0.95]]) { const w = add2(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 22), M.rubber, x, 0.36, z); w.rotation.x = Math.PI / 2; }
  for (const z of [-0.6, 0.6]) { const b = add2(new RoundedBoxGeometry(0.3, 0.14, 0.5, 2, 0.04), new THREE.MeshBasicMaterial({ color: 0x2a6bff }), 1.5, 2.66, z); ambLights.push(b.material); }
  const ambL = new THREE.PointLight(0x2f6bff, 0, 0, 2); ambL.position.set(1.5, 3.2, 0); amb.add(ambL); amb.userData.pl = ambL;
  add2(new THREE.BoxGeometry(0.04, 1.6, 1.7), std(0x1c1e22, 0.9), -2.41, 1.55, 0);
  add2(new THREE.BoxGeometry(0.3, 0.06, 1.75), std(0xbfc3c8, 0.5, 0.4), -2.5, 0.74, 0);
  add2(new THREE.BoxGeometry(0.22, 0.05, 1.2), std(0x2b2d31, 0.6, 0.5), -2.55, 0.42, 0);
  for (const s of [-1, 1]) { const h = new THREE.Group(); h.position.set(-2.42, 0, s * 1.02); h.rotation.y = s * 2.75; amb.add(h);
    add2(new THREE.BoxGeometry(0.05, 1.7, 0.98), white, 0, 1.55, -s * 0.5, h); add2(new THREE.BoxGeometry(0.06, 0.1, 0.98), new THREE.MeshStandardMaterial({ color: 0xd8241c, roughness: 0.5 }), 0, 1.05, -s * 0.5, h); }
  // al final: tu hermano, ya fuera, sentado en la culata con manta y oxígeno; el sanitario, tú y tu compañero
  broOut = makeBroSitting(); broOut.position.set(9.4 - 2.6, 0.28, 5.6 - 0.42); broOut.rotation.y = Math.PI; broOut.visible = false; outside.add(broOut);
  medic = makePerson({ top: 0x2f7d4a, legs: 0x2b3346, gesto: 'brazos', seed: 11, hair: 0x2a1d14 }); onGround(medic.G, 6.25, 6.55); medic.G.rotation.y = Math.atan2(-(6.8 - 6.25), -(5.18 - 6.55)); medic.G.visible = false; outside.add(medic.G); people.push(medic);
  heroOut = makeHero({ helmet: 0xe8be2c }); onGround(heroOut.G, 6.05, 4.1); heroOut.G.rotation.y = Math.atan2(-(6.8 - 6.05), -(5.18 - 4.1)); heroOut.G.visible = false; outside.add(heroOut.G);
  heroOut.pose(V(-0.2, 1.2, -0.35), V(0.25, 1.02, -0.28), V(-0.34, 1.08, -0.1), V(0.34, 1.0, -0.06));
  partner = makeHero({ helmet: 0xe6e8ea }); onGround(partner.G, 5.25, 4.05); partner.G.rotation.y = Math.atan2(-(6.8 - 5.25), -(5.18 - 4.05)); partner.G.visible = false; outside.add(partner.G);
  // el compañero en la puerta (sujeta la manguera) y el de la bomba
  doorF = makeHero({ helmet: 0xe6e8ea }); onGround(doorF.G, 1.85, 1.3); doorF.G.rotation.y = Math.atan2(-(0 - 1.85), -(0 - 1.3)) ; outside.add(doorF.G);
  doorF.pose(V(-0.12, 1.0, -0.42), V(0.14, 0.95, -0.38), V(-0.33, 1.02, -0.12), V(0.33, 0.98, -0.1));
  pumpF = makeHero({ noEra: true, helmet: 0xe6e8ea }); outside.add(pumpF.G);
  const pump = truck.localToWorld(V(-3.86, 0, 0)); onGround(pumpF.G, pump.x - 0.62, pump.z); pumpF.G.rotation.y = -Math.PI / 2;
  pumpF.pose(V(-0.16, 1.22, -0.46), V(0.14, 1.28, -0.46), V(-0.33, 1.05, -0.12), V(0.33, 1.08, -0.12));
  // curiosos: en la acera de enfrente, detrás del cordón, y en la de la casa, lejos
  cordonOut([V(-7, 0.14, 10.45), V(-3.5, 0.14, 10.45), V(0, 0.14, 10.45), V(3.5, 0.14, 10.45), V(7, 0.14, 10.45)]);
  cordonOut([V(-5.0, 0.14, 0.2), V(-5.0, 0.14, 2.8)]); cordonOut([V(5.0, 0.14, 0.2), V(5.0, 0.14, 2.8)]);
  const P0 = [
    { x: -4.6, z: 11.0, top: 0xc0392b, legs: 0x2b3346, gesto: 'movil', seed: 1 }, { x: -3.7, z: 11.4, top: 0x3d5a80, legs: 0x1f1f22, gesto: 'brazos', seed: 2, hair: 0x111111, h: 1.04 },
    { x: -2.2, z: 11.05, top: 0xe7e2d6, legs: 0x4a5b78, gesto: 'señala', seed: 3, hair: 0x6b4a2a, h: 0.97 }, { x: -0.9, z: 11.5, top: 0x4f6b3a, legs: 0x2b3346, gesto: 'boca', seed: 4, long: true, hair: 0xa07a4a, h: 0.95 },
    { x: 0.8, z: 11.1, top: 0xe0a32b, legs: 0x23262e, gesto: 'movil', seed: 5, long: true, hair: 0x2b1b10, h: 0.95 }, { x: 2.1, z: 11.45, top: 0x6c6f75, legs: 0x1b1d22, gesto: 'brazos', seed: 6, cap: 0x222222 },
    { x: 3.6, z: 11.05, top: 0x8a4b2f, legs: 0x2b3346, gesto: 'boca', seed: 8, long: true, hair: 0x3a2a1a, h: 0.93 }, { x: 4.9, z: 11.6, top: 0x1f3d5a, legs: 0x4a4038, gesto: 'señala', seed: 7, cap: 0xa83226 },
    { x: -6.2, z: 1.3, top: 0x7a3d8a, legs: 0x2b3346, gesto: 'boca', seed: 9, long: true, hair: 0x1a1210, h: 0.96 }, { x: -6.9, z: 2.1, top: 0x2b2d31, legs: 0x3a3226, gesto: 'movil', seed: 10, h: 1.02 },
  ];
  doorF.G.name = 'BOMBERO_PUERTA'; pumpF.G.name = 'BOMBERO_BOMBA'; medic.G.name = 'SANITARIO'; heroOut.G.name = 'TU_FUERA'; partner.G.name = 'COMPANERO'; broOut.name = 'HERMANO_FUERA';
  for (const q of P0) { const p = makePerson(q); p.G.name = 'CURIOSO'; onGround(p.G, q.x, q.z); const to = V(0 - q.x, 0, 0.6 - q.z); p.G.rotation.y = Math.atan2(-to.x, -to.z); outside.add(p.G); people.push(p); }
  for (const [x, z, col, ry] of [[-15.5, 4.1, 0xb8b8b4, 0], [15.8, 4.15, 0x8a1d22, Math.PI], [-21, 8.9, 0x2f4f6f, Math.PI], [21.5, 8.9, 0x5a5f64, 0]]) { const c = makeCar(col); c.position.set(x, 0, z); c.rotation.y = ry; outside.add(c); hazards.push(...c.userData.hz); }
  // ---------------------------------------------------------------- la escena de la interfaz (por encima de todo): la pantalla grande de la cámara y la cámara por dentro
  uiScene = new THREE.Scene(); uiCam = new THREE.OrthographicCamera(0, W2, 0, -H2, -2000, 2000);
  uiScene.environment = scene.environment;
  uiScene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 1.4)); const ud = new THREE.DirectionalLight(0xffffff, 2.2); ud.position.set(300, 600, 900); uiScene.add(ud);
  UI.panel = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), panelMat); UI.panel.renderOrder = 1; uiScene.add(UI.panel);
  const it = makeTIC(scrMat); UI.item = new THREE.Group(); UI.item.add(it.G); it.G.scale.setScalar(1500); UI.item.visible = false; uiScene.add(UI.item);   // «nuevo objeto»: la cámara térmica
  buildInnards();
}
function cordonOut(pts) {                    // cordón de balizamiento (rojo y blanco) entre postes, fuera
  const tex = canvasTex(256, 32, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#d8241c' : '#f4f2ec'; x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32 + 32, 0); x.lineTo(i * 32 + 16, 32); x.lineTo(i * 32 - 16, 32); x.fill(); } }, { aniso: 4 });
  tex.wrapS = THREE.RepeatWrapping;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.0, 8), std(0xd8d8d8, 0.4, 0.5)); post.position.set(p.x, p.y + 0.5, p.z); post.castShadow = true; outside.add(post);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 14), std(0x222222, 0.8)); base.position.set(p.x, p.y + 0.025, p.z); outside.add(base);
    if (i === 0) continue;
    const a = pts[i - 1].clone().add(V(0, 0.98, 0)), b = p.clone().add(V(0, 0.98, 0)), mid = a.clone().lerp(b, 0.5).add(V(0, -0.06, 0));
    const c = new THREE.QuadraticBezierCurve3(a, mid, b), L = a.distanceTo(b);
    const t2 = tex.clone(); t2.needsUpdate = true; t2.repeat.set(L * 3, 1);
    outside.add(new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.035, 2, false), new THREE.MeshStandardMaterial({ map: t2, roughness: 0.6, side: THREE.DoubleSide })));
  }
}
const lerpV = (a, b, k) => a.clone().lerp(b, k);

// ------------------------------------------------------------------ la cámara por dentro (en la interfaz): lente de germanio → microbolómetro → procesador → pantalla
function buildInnards() {
  const G = new THREE.Group(); G.visible = false; uiScene.add(G); UI.inn = G;
  const mk = (geo, m) => { const k = new THREE.Mesh(geo, m); return k; };
  // lente de germanio: gris oscuro con reflejos violetas
  const lens = new THREE.Group(); G.add(lens); UI.lens = lens;
  const ge = new THREE.MeshPhysicalMaterial({ color: 0x5a6070, metalness: 0.35, roughness: 0.14, clearcoat: 1, iridescence: 0.85, iridescenceIOR: 1.8, iridescenceThicknessRange: [250, 650], envMapIntensity: 1.6 });
  const lg = new THREE.SphereGeometry(130, 48, 12, 0, Math.PI * 2, 0, 0.42); lg.translate(0, -130 * Math.cos(0.42), 0);
  const l1 = mk(lg, ge); l1.rotation.x = Math.PI / 2; l1.scale.set(1, 1.4, 1); lens.add(l1);
  const l2 = mk(lg, ge); l2.rotation.x = -Math.PI / 2; l2.scale.set(1, 1.4, 1); lens.add(l2);
  const rim = mk(new THREE.TorusGeometry(53.5, 6, 12, 64), std(0x9aa0aa, 0.3, 0.9)); lens.add(rim);
  // microbolómetro: el chip con su rejilla de píxeles
  const mb = new THREE.Group(); G.add(mb); UI.mb = mb;
  const grid = canvasTex(256, 256, (x) => { x.fillStyle = '#2a2420'; x.fillRect(0, 0, 256, 256); for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) { const v = rnd(r * 16 + c); x.fillStyle = `rgb(${170 + v * 60},${130 + v * 50},${60 + v * 30})`; x.fillRect(c * 16 + 2, r * 16 + 2, 12, 12); } }, { aniso: 4 });
  UI.mbTop = new THREE.MeshStandardMaterial({ map: grid, roughness: 0.35, metalness: 0.6, emissive: 0xffa040, emissiveIntensity: 0 });
  const mbm = [std(0x3a3a3e, 0.5, 0.6), std(0x3a3a3e, 0.5, 0.6), std(0x3a3a3e, 0.5, 0.6), std(0x3a3a3e, 0.5, 0.6), UI.mbTop, std(0x3a3a3e, 0.5, 0.6)];
  mb.add(mk(new THREE.BoxGeometry(96, 96, 14), mbm));
  const pinM = std(0xd8c06a, 0.3, 0.9);
  for (let k = 0; k < 8; k++) for (const s of [-1, 1]) { const p = mk(new THREE.BoxGeometry(6, 14, 4), pinM); p.position.set(-42 + k * 12, s * 55, -6); mb.add(p); }
  // procesador
  const cpu = new THREE.Group(); G.add(cpu); UI.cpu = cpu;
  UI.cpuTop = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.4, metalness: 0.3, emissive: 0x48d6ff, emissiveIntensity: 0 });
  cpu.add(mk(new RoundedBoxGeometry(92, 92, 16, 2, 4), UI.cpuTop));
  for (let k = 0; k < 7; k++) for (const s of [-1, 1]) { const p = mk(new THREE.BoxGeometry(6, 12, 4), std(0xc9ccd2, 0.3, 0.9)); p.position.set(-36 + k * 12, s * 52, -6); cpu.add(p); const q = p.clone(); q.rotation.z = Math.PI / 2; q.position.set(s * 52, -36 + k * 12, -6); cpu.add(q); }
  // la pantalla (LCD): enseña lo mismo que la grande
  const lcd = new THREE.Group(); G.add(lcd); UI.lcd = lcd;
  lcd.add(mk(new RoundedBoxGeometry(150, 116, 14, 2, 8), std(0x16171a, 0.5)));
  const s2 = mk(new THREE.PlaneGeometry(132, 99), panelMat); s2.position.z = 7.5; lcd.add(s2);
  G.traverse(o => { if (o.isMesh) { o.renderOrder = 3; } }); s2.renderOrder = 4;
}


// ------------------------------------------------------------------ tiempos y cámara
let T = {}, KEYS = null, KH = null;
function setupTimes() {
  T = { ...CUE, end: END };
  T.fin = T.compartir - 0.25;
  T.cnt0 = T.segundos + 0.55; T.cnt1 = T.cnt0 + 5.0;                    // la cuenta atrás (5 s): elige tú
  T.on = T.lac + 0.1;                                                    // se enciende la pantalla de la cámara
  T.turnA = T.paredes - 0.45; T.turnB = T.hielo + 0.15; T.turnC = T.ahi - 0.35;   // la pared, el cristal y otra vez el pasillo
  T.dark0 = T.ve - 0.05; T.dark1 = T.pero - 0.25;                        // sin luz
  T.out = T.sacais - 0.12;                                               // (fuera: en la ambulancia)
  KEYS = camKeys(); KH = KEYS;
}
function camKeys() {
  const k = (t, p, q, fov) => [t, [...p, ...q, fov]];
  const K = [
    k(0, [4.0, 2.6, 15.9], [-0.6, 2.4, 0.0], 42),                         // desde arriba: la casa echando humo, la calle, la autobomba, los curiosos
    k(T.hermano + 0.6, [2.55, 2.6, 14.4], [-0.4, 2.6, 0.0], 42),
    k(T.casa + 0.1, [2.4, 3.4, 9.0], [0.0, 1.9, 0.0], 42),                  // bajando hacia la puerta
    k(T.humo - 0.1, [1.15, 1.85, 3.3], [0.0, 1.45, -1.0], 48),
    k(T.nada - 0.05, [0.15, 1.75, 0.95], [0.0, 1.5, -2.5], 58),            // entra por la puerta…
    k(T.llevas - 0.2, [0.08, 1.98, -0.32], [-0.05, 1.25, -3.2], 64),       // …y dentro, humo: tú, de espaldas, con la cámara térmica
    k(T.termica + 0.15, [0.22, 2.1, -0.45], [0.0, 1.35, -3.3], 62),       // la cámara, por encima del hombro
    k(T.donde + 0.1, [0.08, 2.08, -0.3], [0.0, 1.05, -3.8], 66),           // las opciones: A la pared, B el cristal, C el humo
    k(T.c + 0.3, [0.04, 2.1, -0.28], [0.0, 1.0, -4.0], 66),
    k(T.cnt0 + 0.3, [0.03, 2.1, -0.38], [0.0, 1.0, -4.0], 65),             // la cuenta: el dron sigue, despacio
    k(T.cnt1, [0.0, 2.1, -0.55], [0.0, 1.0, -4.0], 64),
    k(T.lac + 0.35, [0.28, 2.15, -0.62], [-0.05, 1.6, -3.6], 60),           // ¡la C!: la pantalla grande arriba, tú abajo
    k(T.cuerpo, [0.32, 2.12, -0.7], [-0.05, 1.6, -3.6], 60),
    k(T.lente, [-0.2, 2.14, -0.74], [0.0, 1.6, -3.6], 60),
    k(T.caliente2, [0.22, 2.12, -0.8], [0.0, 1.6, -3.6], 60),
    k(T.ve, [0.02, 2.16, -0.82], [0.0, 1.55, -3.6], 60),
    k(T.paredes, [0.08, 2.15, -0.86], [-0.1, 1.5, -3.4], 60),              // la pared y el cristal
    k(T.cristal3, [0.0, 2.15, -0.9], [0.1, 1.5, -3.4], 60),
    k(T.ahi, [0.08, 2.12, -0.92], [0.0, 1.45, -4.0], 60),                  // ahí está: en el suelo del pasillo
    k(T.ahora - 0.05, [0.12, 2.08, -0.8], [0.05, 1.25, -4.6], 58),
    k(T.sacais - 0.32, [0.1, 1.95, 0.7], [0.4, 1.5, 4.0], 58),            // ¡lo sacáis!: sale por la puerta…
    k(T.sacais + 0.12, [2.7, 1.85, 9.0], [6.6, 1.0, 5.0], 44),            // …y, fuera, a salvo en la ambulancia
    k(T.sacais + 1.2, [3.0, 1.95, 9.3], [6.6, 1.05, 5.0], 42),
    k(T.elegido, [-1.0, 7.5, 14.5], [1.5, 2.6, 2.0], 44),                  // abierto: ¿tú qué habrías elegido?
    k(T.compartir + 0.6, [-3.0, 9.5, 15.0], [1.0, 3.0, 1.0], 44),
    k(T.end, [-5.0, 12.0, 15.5], [0.5, 3.5, 0.0], 46),
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
  if (window.COVER_CAM && window.COVER_T !== undefined) { const c = window.COVER_CAM; return pose(V(c[0], c[1], c[2]), V(c[3], c[4], c[5]), c[6]); }   // portada: cámara a medida
  const v = hermite(KH, t), s = Math.min(1, Math.hypot(v[0] - v[3], v[1] - v[4], v[2] - v[5]) / 2);
  const sh = 0.004 * pulse(t, T.lac + 0.05, 0.12);
  return pose(V(v[0] + 0.012 * s * Math.sin(t * 0.7) + sh * Math.sin(t * 90), v[1] + 0.01 * s * Math.sin(t * 0.53 + 1) + sh * Math.sin(t * 70), v[2]), V(v[3], v[4], v[5]), v[6]);
}

// ------------------------------------------------------------------ estado de la escena en t (todo depende solo de t)
const pulse = (t, t0, w = 0.35) => Math.exp(-Math.pow((t - t0) / w, 2));
const D2R = Math.PI / 180;
let TIMED = [];
const SMOKE_IN = new THREE.Color(0.12, 0.115, 0.108), FOG_IN = 0.3;
const XG = HALL.x + 0.05 - 0.002;                                  // el plano del cristal (para el reflejo)
const MREF = new THREE.Matrix4().set(-1, 0, 0, 2 * XG, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
function aimAt(t) {                     // hacia dónde apunta la cámara térmica: yaw del cuerpo, inclinación de la cámara, en alto
  let yaw = 0.12 * Math.sin(t * 0.9) * (1 - sm(T.lac - 0.4, T.lac, t));            // buscando, antes de la respuesta
  yaw += (Math.PI / 2) * e3(pr(t, T.turnA, 0.5)) * (1 - e3(pr(t, T.turnB, 0.9)));    // la pared (izquierda)
  yaw -= (Math.PI / 2) * e3(pr(t, T.turnB, 0.9)) * (1 - e3(pr(t, T.turnC, 0.5)));    // el cristal (derecha)
  let pitch = mx(-0.08, -0.28, e3(pr(t, T.lac - 0.1, 0.5)));
  pitch = mx(pitch, 0.0, e3(pr(t, T.turnA, 0.4)) * (1 - e3(pr(t, T.turnC, 0.5))));
  pitch = mx(pitch, -0.3, e3(pr(t, T.turnC + 0.1, 0.5)));
  const lift = mx(0.82, 1, e3(pr(t, T.llevas, 0.6)));
  return { yaw, pitch, lift };
}
function lifeK(t) { return 1 - 0.62 * sm(0.3, T.ahi, t) + 0.62 * e3(pr(t, T.sacais - 0.05, 0.6)); }
function darkK(t) { return sm(T.dark0 - 0.1, T.dark0 + 0.2, t) * (1 - sm(T.dark1 - 0.25, T.dark1, t)); }
function update(t) {
  const P0 = camAt(t);
  cam.position.copy(P0.p); cam.quaternion.copy(P0.q); cam.fov = P0.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  dof.enabled = true; dofMat.uniforms.uFocus.value = P0.focus; dofMat.uniforms.uAp.value = mx(0.16, 0.04, sm(1.2, 4.5, P0.focus));
  for (const u of TIMED) u.uTime.value = t;
  for (const f of FLAMES) f.u.uCam.value.copy(cam.position);
  // dentro o fuera: niebla de humo dentro de la casa (según dónde esté el dron)
  const kin = sm(0.55, -0.45, cam.position.z) * (Math.abs(cam.position.x) < 4 ? 1 : 0), dk = darkK(t);
  scene.fog.density = mx(0.006, FOG_IN, kin);
  scene.fog.color.copy(HAZE).lerp(SMOKE_IN.clone().multiplyScalar(mx(1, 0.22, dk)), kin);
  scene.background.copy(scene.fog.color);
  hemi.intensity = mx(1.15, 0.85, kin) * mx(1, 0.12, dk); sunL.intensity = 2.7 * mx(1, 0.12, dk);
  scene.environmentIntensity = 0.45 * mx(1, 0.15, dk);
  fireL.intensity = (26 + 10 * Math.sin(t * 13) + 6 * Math.sin(t * 31)) * mx(1, 0.6, dk);
  glowSpr.forEach((s, i) => { s.material.opacity = 0.75 + 0.2 * Math.sin(t * (9 + i * 4)); });
  for (const p of hallSmoke) ['uC0', 'uC1', 'uC2', 'uC3'].forEach((k, i) => p.u[k].value.copy(p.base[i]).multiplyScalar(mx(1, 0.25, dk)));
  // luces: autobomba, ambulancia, coches
  const ph = (t * 2.6) % 1, on = (ph < 0.12 || (ph > 0.24 && ph < 0.36)) ? 1 : 0;
  beacons.forEach((m, j) => m.material.color.setRGB(0.25 * (1 + 4 * on * (j === 0 ? 1 : 0.4)), 0.5 * (1 + 4 * on), 2.4 * (0.4 + 2.2 * on)));
  truck.userData.pl.intensity = 2 + 24 * on;
  const ph2 = (t * 2.2 + 0.3) % 1, on2 = ph2 < 0.15 || (ph2 > 0.5 && ph2 < 0.65) ? 1 : 0;
  ambLights.forEach(m => m.color.setRGB(0.3 + 1.2 * on2, 0.6 + 2.0 * on2, 2.0 + 3.0 * on2)); amb.userData.pl.intensity = 1 + 16 * on2;
  const hzOn = (t * 1.6) % 1 < 0.5; for (const m of hazards) m.color.setRGB(hzOn ? 2.2 : 0.25, hzOn ? 1.2 : 0.14, 0.0);
  for (const q of people) q.pose(t);
  for (const tr of trees) { const c = tr.userData.crown, sd = tr.userData.seed; c.rotation.z = 0.025 * Math.sin(t * 1.3 + sd) + 0.012 * Math.sin(t * 3.1 + sd * 2); c.rotation.x = 0.018 * Math.sin(t * 1.1 + sd * 1.7); }
  // tú: la cámara térmica en las manos; y tu gemelo reflejado en el cristal (solo lo ve la cámara térmica)
  const A0 = aimAt(t);
  hero.G.rotation.y = A0.yaw; hero.G.position.copy(HERO_P); hero.G.updateMatrix(); hero.aim(A0.pitch, A0.lift);
  heroM.aim(A0.pitch, A0.lift); heroM.G.matrix.multiplyMatrices(MREF, hero.G.matrix); heroM.G.matrixWorldNeedsUpdate = true;
  hero.G.updateMatrixWorld(true);
  bro.pose(t);
  const outNow = t >= T.out;
  hero.G.visible = bro.G.visible = !outNow;
  broOut.visible = medic.G.visible = heroOut.G.visible = partner.G.visible = outNow;
  heroOut.pose(V(-0.2, 1.2, -0.35), V(0.25, 1.02 + 0.02 * Math.sin(t * 1.7), -0.28), V(-0.34, 1.08, -0.1), V(0.34, 1.0, -0.06));
  partner.pose(V(-0.2, 1.0, -0.2), V(0.2, 1.0, -0.2), V(-0.34, 1.02, -0.05), V(0.34, 1.02, -0.05));
  if (broOut.visible) broOut.userData.head.rotation.set(0.05 * Math.sin(t * 0.8), 0.1 * Math.sin(t * 0.5), -0.12);
}

// ------------------------------------------------------------------ la pasada térmica (lo que ve la cámara): solo cuenta el calor
const _q = new THREE.Quaternion();
function thermVisible(t) { return window.COVER_T === undefined && t >= T.on - 0.05 && t < T.out; }
function renderThermal(t) {
  hero.G.updateMatrixWorld(true);
  thermCam.position.copy(hero.tic.G.localToWorld(hero.tic.lens.clone()));
  hero.tic.G.getWorldQuaternion(_q); thermCam.quaternion.copy(_q); thermCam.updateMatrixWorld(); thermCam.updateProjectionMatrix();
  const saveFog = scene.fog, saveBg = scene.background;
  scene.fog = null; scene.background = new THREE.Color(0, 0, 0);
  const vis = [[outside, outside.visible], [kitchen, kitchen.visible], [hero.G, hero.G.visible], [heroM.G, heroM.G.visible]];
  outside.visible = false; kitchen.visible = false; hero.G.visible = false; heroM.G.visible = true;
  const hid = []; for (const p of hallSmoke) { hid.push(p.mesh); p.mesh.visible = false; } for (const s of glowSpr) { hid.push(s); s.visible = false; }
  const swapped = [], DEF = { T: 0.33, Gr: 0.2, F: 0, N: 0.04 };
  for (const root of [inside, heroM.G]) root.traverse(o => { if (o.isMesh && !o.userData.thKeep) { swapped.push([o, o.material]); o.material = thMat(o.userData.th || DEF); } });
  for (const f of FLAMES) f.u.uCam.value.copy(thermCam.position);
  renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(thermRT); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, thermCam);
  renderer.shadowMap.autoUpdate = true;
  for (const [o, m] of swapped) o.material = m;
  for (const o of hid) o.visible = true;
  for (const [o, v] of vis) o.visible = v;
  for (const f of FLAMES) f.u.uCam.value.copy(cam.position);
  scene.fog = saveFog; scene.background = saveBg;
}
function thProj(P) {                      // punto del mundo → píxel dentro de la pantalla grande (con su zoom)
  const R = panelRect(TNOW); const p = P.clone().project(thermCam); const z = panelU.uZoom.value, c = panelU.uZc.value;
  const u = ((p.x * 0.5 + 0.5) - c.x) * z + 0.5, v = ((p.y * 0.5 + 0.5) - c.y) * z + 0.5;
  return { x: R.x + (u - 0.5) * R.w, y: R.y - (v - 0.5) * R.h, ok: p.z < 1 && u > 0.02 && u < 0.98 && v > 0.02 && v < 0.98 };
}
let TNOW = 0;
const PAN = { x: 540, y: 800, w: 860, h: 645 };
function panelRect(t) {                   // dónde está la pantalla grande: aparece al elegir la C; se encoge cuando se ve la cámara por dentro
  const a = sm(T.on - 0.05, T.on + 0.35, t) * (1 - sm(T.sacais - 0.55, T.sacais - 0.3, t));
  const pop = bk(pr(t, T.on - 0.05, 0.45));
  const ins = e3(pr(t, T.lente - 0.35, 0.5)) * (1 - e3(pr(t, T.caliente2 - 0.45, 0.5)));
  const s = mx(0.35, 1, pop) * mx(1, 0.78, ins);
  return { x: PAN.x, y: mx(PAN.y, 735, ins), w: PAN.w * s, h: PAN.h * s, a };
}
function uiUpdate(t) {
  const R = panelRect(t), on = thermVisible(t) && R.a > 0.003;
  UI.panel.visible = on;
  const ip = itemPose(t); UI.item.visible = ip.a > 0.005;
  if (UI.item.visible) { UI.item.position.set(ip.x, -(ip.y - 20 * ip.s), 50); UI.item.scale.setScalar(Math.max(0.001, ip.s * (0.85 + 0.15 * bk(pr(t, T.llevas - 0.1, 0.45)))));
    UI.item.rotation.set(0.25 + 0.08 * Math.sin(t * 1.3), 2.6 + 0.9 * Math.sin(t * 0.9), 0); }
  panelU.uTime.value = t;
  panelU.uOn.value = e3(pr(t, T.on + 0.15, 0.45)); panelU.uBoot.value = e3(pr(t, T.on, 0.35)) * 1.001;
  // la escala de colores: blanco/negro y, al decir «rojo», mitad y mitad
  panelU.uSplit.value = mx(1, 0.5, e3(pr(t, T.rojo - 0.2, 0.45))) + 0.5 * e3(pr(t, T.ve - 0.35, 0.45));
  // «ahí está»: zoom sobre tu hermano
  const zk = e3(pr(t, T.ahi - 0.05, 0.6)) * (1 - e3(pr(t, T.sacais - 0.6, 0.3)));
  panelU.uZoom.value = mx(1, 1.55, zk);
  const bp = bro.G.position.clone().add(V(0, 0.1, 0.75)).project(thermCam);
  panelU.uZc.value.set(mx(0.5, cl(bp.x * 0.5 + 0.5, 0.3, 0.7), zk), mx(0.5, cl(bp.y * 0.5 + 0.5, 0.3, 0.7), zk));
  if (on) { UI.panel.position.set(R.x, -R.y, 0); UI.panel.scale.set(R.w, R.h, 1); }
  // la cámara por dentro: lente, microbolómetro, procesador y pantalla, cada pieza al nombrarla
  const ins = window.COVER_T === undefined ? sm(T.lente - 0.3, T.lente, t) * (1 - sm(T.caliente2 - 0.4, T.caliente2 - 0.1, t)) : 0;
  UI.inn.visible = ins > 0.003;
  if (UI.inn.visible) {
    const Y = 1270, parts = [[UI.lens, 175, T.lente], [UI.mb, 405, T.microbolometro], [UI.cpu, 650, T.procesador], [UI.lcd, 895, T.pinta]];
    for (const [o, x, t0] of parts) { const k = bk(pr(t, t0 - 0.15, 0.45)); o.visible = k > 0.003; o.position.set(x, -Y, 0); o.scale.setScalar(Math.max(0.001, 1.25 * k * ins)); o.rotation.set(0.42 + 0.05 * Math.sin(t * 0.9 + x), -0.35 + 0.18 * Math.sin(t * 0.6 + x * 0.01), 0); }
    UI.lens.rotation.set(0.15, 0.75 + 0.15 * Math.sin(t * 0.7), 0);
    UI.mbTop.emissiveIntensity = 0.9 * pulse(t, T.enfoca + 0.25, 0.35) + 0.5 * sm(T.enfoca, T.enfoca + 0.4, t) * (0.6 + 0.4 * Math.sin(t * 10));
    UI.cpuTop.emissiveIntensity = 0.8 * sm(T.procesador - 0.1, T.procesador + 0.2, t) * (0.6 + 0.4 * Math.sin(t * 13));
  }
}

// ------------------------------------------------------------------ la capa 2D: el videojuego (misión, vida, tarjetas A/B/C, pasos) y los rótulos
function arrow2p(p, q, col, alpha, w = 8) {
  if (alpha <= 0.01) return;
  g.save(); g.globalAlpha = cl(alpha); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 10;
  g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke();
  const an = Math.atan2(q.y - p.y, q.x - p.x); g.beginPath(); g.moveTo(q.x + Math.cos(an) * 10, q.y + Math.sin(an) * 10);
  g.lineTo(q.x - Math.cos(an - 0.5) * 30, q.y - Math.sin(an - 0.5) * 30); g.lineTo(q.x - Math.cos(an + 0.5) * 30, q.y - Math.sin(an + 0.5) * 30); g.closePath(); g.fill(); g.restore();
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
function marker(P, L, a, hot, t) {      // la letra flotando en su sitio: A en la pared, B en el cristal, C entre el humo
  if (a <= 0.01) return; const q = proj(P); if (!q.ok) return;
  const s = (0.75 + 0.25 * bk(cl(a))) * (1 + 0.14 * hot * (0.5 + 0.5 * Math.sin(t * 14)));
  g.save(); g.globalAlpha = cl(a); g.translate(q.x, q.y); g.scale(s, s);
  g.beginPath(); g.arc(0, 0, 60, 0, 7); g.fillStyle = 'rgba(8,10,14,0.55)'; g.fill();
  g.lineWidth = hot > 0.5 ? 9 : 6; g.strokeStyle = hot > 0.5 ? GOLD2 : LETC[L]; g.shadowColor = g.strokeStyle; g.shadowBlur = 24; g.setLineDash([16, 10]); g.lineDashOffset = -t * 40; g.stroke(); g.setLineDash([]); g.shadowBlur = 0;
  g.beginPath(); g.arc(0, 0, 36, 0, 7); g.fillStyle = LETC[L]; g.fill();
  txt(L, 0, 22, 62, '#0A0C10', 400, 'center', 'Bebas');
  g.restore();
}
function hud(t) {
  const a = sm(0.05, 0.3, t) * (1 - sm(T.compartir - 0.4, T.compartir - 0.1, t));
  if (a <= 0.005) return;
  g.save(); g.globalAlpha = a;
  const s = mx(0.7, 1, bk(pr(t, 0.05, 0.4)));
  g.save(); g.translate(540, 148); g.scale(s, s);
  rr(-420, -44, 840, 88, 26); g.fillStyle = 'rgba(8,10,14,0.86)'; g.fill(); g.strokeStyle = GOLD2; g.lineWidth = 4; g.stroke();
  txt('🎮  MISIÓN: SALVA A TU HERMANO', 0, 20, 58, '#FFD65C', 400, 'center', 'Bebas');
  g.restore();
  const lk = lifeK(t), safe = t > T.sacais;
  const beat = 1 + 0.18 * Math.pow(Math.max(0, Math.sin(t * Math.PI * (safe ? 1.4 : 2.6))), 8);
  rr(110, 196, 860, 52, 26); g.fillStyle = 'rgba(8,10,14,0.8)'; g.fill();
  heart(158, 224, 1.05 * beat, safe ? '#3EF08A' : '#FF3B4E');
  txt('HERMANO', 206, 237, 38, '#F4F6F8', 400, 'left', 'Bebas');
  rr(340, 208, 600, 28, 14); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fill();
  const col = safe ? GREEN2 : lk < 0.6 ? RED2 : ORANGE2;
  rr(340, 208, 600 * lk, 28, 14); g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 14; g.fill(); g.shadowBlur = 0;
  if (!safe && lk < 0.7) { g.globalAlpha = a * 0.5 * (0.5 + 0.5 * Math.sin(t * 12)); rr(340, 208, 600 * lk, 28, 14); g.fillStyle = '#ffffff'; g.fill(); }
  g.restore();
}
function step(t) {
  const S = [[T.lac + 0.4, T.lente - 0.2, 'PASO 1/4 · NO VE LA LUZ: VE EL CALOR'], [T.lente - 0.2, T.caliente2 - 0.2, 'PASO 2/4 · ASÍ FUNCIONA POR DENTRO'],
    [T.caliente2 - 0.2, T.ve - 0.2, 'PASO 3/4 · LOS COLORES'], [T.ve - 0.2, T.ahi - 0.1, 'PASO 4/4 · QUÉ VE Y QUÉ NO']];
  for (const [t0, t1, s] of S) {
    const a = sm(t0, t0 + 0.2, t) * (1 - sm(t1 - 0.15, t1, t)); if (a <= 0.01) continue;
    g.save(); g.globalAlpha = a; g.translate(540, 1600); const k = 0.85 + 0.15 * bk(pr(t, t0, 0.35)); g.scale(k, k);
    g.font = '400 52px Bebas'; const w = g.measureText(s).width + 80;
    rr(-w / 2, -42, w, 84, 42); g.fillStyle = 'rgba(8,10,14,0.88)'; g.fill(); g.strokeStyle = CYAN2; g.lineWidth = 4; g.stroke();
    txt(s, 0, 19, 52, '#E8F8FF', 400, 'center', 'Bebas'); g.restore();
  }
}
function chip(x, y, text, col, a, o = {}) {           // rótulo pequeño en cualquier sitio (sin los límites de label)
  if (a <= 0.005) return;
  const px = o.px || 48, s = (o.s || 1) * (0.8 + 0.2 * bk(cl(a * 1.3)));
  g.save(); g.globalAlpha = cl(a); g.translate(x, y); g.scale(s, s);
  g.font = `400 ${px}px Bebas`; const tw = g.measureText(text).width, ic = o.icon ? 60 : 0, w = tw + 56 + ic, h = px * 1.42;
  rr(-w / 2, -h / 2, w, h, h / 2); g.fillStyle = 'rgba(8,10,14,0.88)'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  const cx = -w / 2 + 40;
  if (o.icon === 'ok') { g.beginPath(); g.moveTo(cx - 14, 0); g.lineTo(cx - 3, 11); g.lineTo(cx + 16, -12); g.strokeStyle = GREEN2; g.lineWidth = 7; g.lineCap = 'round'; g.stroke(); }
  if (o.icon === 'no') { g.strokeStyle = RED2; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 12, -12); g.lineTo(cx + 12, 12); g.moveTo(cx + 12, -12); g.lineTo(cx - 12, 12); g.stroke(); }
  txt(text, ic / 2, px * 0.35, px, '#F4F6F8', 400, 'center', 'Bebas');
  g.restore();
}
function ptag(P, text, col, a, lx, ly, o = {}) {      // rótulo con su línea hasta un punto DENTRO de la pantalla térmica
  if (a <= 0.005) return; const q = thProj(P); if (!q.ok) return;
  g.save(); g.globalAlpha = cl(a);
  g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(lx, ly); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
  g.beginPath(); g.arc(q.x, q.y, 34 * (1 + 0.25 * pulse(TNOW, o.t0 ?? 0, 0.2)), 0, 7); g.lineWidth = 6; g.shadowColor = col; g.shadowBlur = 16; g.stroke(); g.shadowBlur = 0;
  g.restore();
  chip(lx, ly, text, col, a, o);
}
function panelFrame(t) {                 // el marco de la pantalla de la cámara térmica, su escala de colores y el punto de mira
  const R = panelRect(t); if (!thermVisible(t) || R.a <= 0.003) return;
  const x0 = R.x - R.w / 2, y0 = R.y - R.h / 2;
  g.save(); g.globalAlpha = cl(R.a);
  rr(x0 - 16, y0 - 62, R.w + 32, R.h + 78, 34); g.strokeStyle = '#F0B21C'; g.lineWidth = 12; g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 26; g.stroke(); g.shadowBlur = 0;
  rr(x0 - 10, y0 - 56, R.w + 20, 50, 18); g.fillStyle = 'rgba(14,14,16,0.92)'; g.fill();
  g.beginPath(); g.rect(x0 - 10, y0 - 10, 10, R.h + 20); g.rect(x0 + R.w, y0 - 10, 10, R.h + 20); g.rect(x0 - 10, y0 + R.h, R.w + 20, 10); g.fillStyle = 'rgba(14,14,16,0.92)'; g.fill();
  const k = R.w / PAN.w;
  txt('◉ CÁMARA TÉRMICA', x0 + 18, y0 - 20, 40 * k, '#FFD65C', 400, 'left', 'Bebas');
  const pal = panelU.uSplit.value < 0.99 ? 'BLANCO · COLOR' : 'BLANCO = CALIENTE';
  txt(pal, x0 + R.w - 18, y0 - 20, 34 * k, 'rgba(240,244,248,0.85)', 400, 'right', 'Bebas');
  // punto de mira
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; const cx = R.x, cy = R.y, d = 26 * k;
  g.beginPath(); g.moveTo(cx - d, cy); g.lineTo(cx - d * 0.35, cy); g.moveTo(cx + d * 0.35, cy); g.lineTo(cx + d, cy); g.moveTo(cx, cy - d); g.lineTo(cx, cy - d * 0.35); g.moveTo(cx, cy + d * 0.35); g.lineTo(cx, cy + d); g.stroke();
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const ex = R.x + sx * (R.w / 2 - 22 * k), ey = R.y + sy * (R.h / 2 - 22 * k); g.beginPath(); g.moveTo(ex, ey - sy * 40 * k); g.lineTo(ex, ey); g.lineTo(ex - sx * 40 * k, ey); g.stroke(); }
  // barra de temperaturas (frío abajo, caliente arriba)
  const bx = x0 + R.w - 40 * k, by0 = y0 + 60 * k, by1 = y0 + R.h - 60 * k, gr = g.createLinearGradient(0, by1, 0, by0);
  if (panelU.uSplit.value > 0.99) { gr.addColorStop(0, '#000'); gr.addColorStop(1, '#fff'); } else { gr.addColorStop(0, '#08104a'); gr.addColorStop(0.35, '#5a10a0'); gr.addColorStop(0.6, '#e01060'); gr.addColorStop(0.8, '#ff7a08'); gr.addColorStop(1, '#fff6c8'); }
  rr(bx - 9 * k, by0, 18 * k, by1 - by0, 9 * k); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.stroke();
  g.restore();
}
function spectrum(t) {                   // la regla de ondas: lo que ven tus ojos (380–750 nm) y lo que ve la cámara (infrarrojos, 8–14 µm)
  const a = sm(T.luz - 0.35, T.luz - 0.05, t) * (1 - sm(T.cuerpo + 0.2, T.cuerpo + 0.5, t)); if (a <= 0.005) return;
  const y = 1300, x0 = 70, x1 = 1010;
  g.save(); g.globalAlpha = a;
  rr(x0 - 20, y - 158, x1 - x0 + 40, 270, 34); g.fillStyle = 'rgba(8,10,14,0.88)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
  // luz visible
  const vA = sm(T.luz - 0.3, T.luz, t), v0 = 110, v1 = 330;
  const rb = g.createLinearGradient(v0, 0, v1, 0); ['#7b2cff', '#2a5cff', '#20d0ff', '#30e070', '#f8e020', '#ff8a10', '#ff2a10'].forEach((c, i) => rb.addColorStop(i / 6, c));
  g.globalAlpha = a * vA; rr(v0, y - 22, v1 - v0, 44, 12); g.fillStyle = rb; g.fill();
  txt('LUZ VISIBLE', (v0 + v1) / 2, y - 40, 40, '#F4F6F8', 400, 'center', 'Bebas'); txt('380–750 nm', (v0 + v1) / 2, y + 66, 38, 'rgba(226,232,240,0.92)', 800, 'center', 'Inter');
  // el ojo
  g.save(); g.translate((v0 + v1) / 2, y + 102); g.beginPath(); g.ellipse(0, 0, 0, 0, 0, 0, 7); g.restore();
  // infrarrojos
  const iA = sm(T.calor - 0.25, T.calor + 0.05, t), i0 = 600, i1 = 960, glow = 0.6 + 0.4 * Math.sin(t * 8);
  g.globalAlpha = a * iA; const ig = g.createLinearGradient(i0, 0, i1, 0); ig.addColorStop(0, '#ff4a10'); ig.addColorStop(1, '#a01008');
  g.shadowColor = '#ff5a1f'; g.shadowBlur = 30 * glow; rr(i0, y - 22, i1 - i0, 44, 12); g.fillStyle = ig; g.fill(); g.shadowBlur = 0;
  txt('INFRARROJOS (CALOR)', (i0 + i1) / 2, y - 40, 40, '#FFB08A', 400, 'center', 'Bebas');
  const nA = sm(T.ocho - 0.2, T.ocho + 0.1, t); g.globalAlpha = a * iA * nA;
  txt('8–14 µm', (i0 + i1) / 2, y + 68, 44, '#FFD65C', 800, 'center', 'Inter');
  // ondas
  g.globalAlpha = a; g.lineWidth = 4;
  for (const [xa, xb, col, f, k] of [[v0, v1, 'rgba(255,255,255,0.0)', 0, 0], [i0, i1, '#ff7a3a', 0.06, iA]]) { if (k <= 0) continue; g.strokeStyle = col; g.globalAlpha = a * k * 0.8; g.beginPath(); for (let xx = xa; xx <= xb; xx += 4) { const yy = y + 12 * Math.sin((xx - xa) * f - t * 9); xx === xa ? g.moveTo(xx, yy) : g.lineTo(xx, yy); } g.stroke(); }
  // los iconos: tus ojos (la luz) y la cámara (el calor)
  chip(220, y - 116, '👁  TUS OJOS', '#F4F6F8', a * vA, { px: 36 });
  chip(780, y - 116, 'LA CÁMARA TÉRMICA', ORANGE2, a * iA, { px: 36 });
  g.restore();
}
function irWaves(t) {                    // todo lo que está por encima del cero absoluto emite infrarrojos (más cuanto más caliente)
  const a = sm(T.cuerpo - 0.2, T.cuerpo + 0.1, t) * (1 - sm(T.lente - 0.4, T.lente - 0.15, t)); if (a <= 0.005 || !thermVisible(t)) return;
  const src = [[bro.G.position.clone().add(V(0, 0.12, 1.1)), 1.0], [V(-0.95, 1.0, -7.55), 1.35], [V(0.0, 2.45, -5.5), 0.55], [V(-0.78, 1.2, -3.8), 0.3]];
  g.save();
  for (const [P, k] of src) { const q = thProj(P); if (!q.ok) continue; const hot = sm(T.caliente - 0.2, T.caliente + 0.3, t);
    for (let i = 0; i < 4; i++) { const ph = ((t * 0.9 + i / 4) % 1), r = 20 + ph * 110 * (0.6 + 0.6 * k) * (1 + 0.5 * hot * k);
      g.globalAlpha = a * (1 - ph) * (0.35 + 0.5 * k); g.strokeStyle = '#ff5a2a'; g.lineWidth = 4 + 4 * k * hot; g.beginPath(); g.arc(q.x, q.y, r, 0, 7); g.stroke(); } }
  g.restore();
  chip(540, 1222, 'TODO LO QUE ESTÁ A MÁS DE 0 K (−273 °C) EMITE INFRARROJOS', ORANGE2, sm(T.cero - 0.2, T.cero + 0.1, t) * a, { px: 40 });
  chip(540, 1335, 'CUANTO MÁS CALIENTE, MÁS', GOLD2, sm(T.caliente - 0.15, T.caliente + 0.15, t) * a, { px: 52, s: 1 + 0.12 * pulse(t, T.mas + 0.1, 0.2) });
}
function innards(t) {                    // flechas y rótulos de la cámara por dentro
  const a = sm(T.lente - 0.3, T.lente, t) * (1 - sm(T.caliente2 - 0.4, T.caliente2 - 0.1, t)); if (a <= 0.005) return;
  const Y = 1270; g.save();
  const ra = sm(T.lente - 0.1, T.lente + 0.2, t) * a;                          // los infrarrojos entran por la lente
  g.lineWidth = 5; g.strokeStyle = '#ff5a2a'; g.shadowColor = '#ff5a2a'; g.shadowBlur = 12;
  for (const dy of [-38, 0, 38]) { g.globalAlpha = ra; g.beginPath(); for (let x = 0; x <= 120; x += 4) { const yy = Y + dy + 8 * Math.sin(x * 0.12 - t * 10); x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
  const fa = sm(T.enfoca - 0.15, T.enfoca + 0.2, t) * a;                       // y la lente los enfoca en el microbolómetro
  g.globalAlpha = fa; for (const dy of [-38, 0, 38]) { g.beginPath(); g.moveTo(232, Y + dy); g.lineTo(350, Y + dy * 0.12); g.stroke(); }
  g.shadowBlur = 0;
  const sa = sm(T.senal - 0.15, T.senal + 0.15, t) * a;                       // señal eléctrica: pulsos hacia el procesador
  if (sa > 0.01) { g.globalAlpha = sa; g.strokeStyle = GOLD2; g.lineWidth = 6; g.setLineDash([18, 14]); g.lineDashOffset = -t * 160; g.beginPath(); g.moveTo(462, Y); g.lineTo(592, Y); g.stroke(); g.setLineDash([]);
    g.fillStyle = GOLD2; for (let i = 0; i < 3; i++) { const u = ((t * 1.6 + i / 3) % 1); g.beginPath(); g.arc(470 + u * 120, Y, 7, 0, 7); g.fill(); } }
  const pa = sm(T.pinta - 0.2, T.pinta + 0.1, t) * a;                          // el procesador la pinta en la pantalla
  if (pa > 0.01) arrow2p({ x: 708, y: Y }, { x: 808, y: Y }, CYAN2, pa, 7);
  const la = sm(T.pantalla - 0.15, T.pantalla + 0.15, t) * a;                  // y esa pantalla es la grande
  if (la > 0.01) arrow2p({ x: 895, y: Y - 75 }, { x: 895, y: Y - 150 }, CYAN2, la, 7);
  g.restore();
  chip(205, 1410, 'LENTE DE GERMANIO', '#B9A2FF', sm(T.germanio - 0.25, T.germanio + 0.05, t) * a, { px: 40, s: 1 + 0.12 * pulse(t, T.germanio + 0.1, 0.2) });
  chip(410, 1490, 'MICROBOLÓMETRO', GOLD2, sm(T.microbolometro - 0.15, T.microbolometro + 0.15, t) * a, { px: 40, s: 1 + 0.12 * pulse(t, T.microbolometro + 0.15, 0.2) });
  chip(528, 1180, 'SEÑAL ELÉCTRICA', GOLD2, sm(T.senal - 0.15, T.senal + 0.15, t) * a, { px: 34 });
  chip(655, 1410, 'PROCESADOR', CYAN2, sm(T.procesador - 0.15, T.procesador + 0.15, t) * a, { px: 40, s: 1 + 0.12 * pulse(t, T.procesador + 0.15, 0.2) });
  chip(880, 1490, 'PANTALLA', CYAN2, sm(T.pantalla - 0.15, T.pantalla + 0.15, t) * a, { px: 40, s: 1 + 0.12 * pulse(t, T.pantalla + 0.15, 0.2) });
}
function palettes(t) {                   // caliente: blanco o rojo; frío: negro o azul
  const a = sm(T.caliente2 - 0.2, T.caliente2 + 0.1, t) * (1 - sm(T.ve - 0.35, T.ve - 0.1, t)); if (a <= 0.005) return;
  const R = panelRect(t), xl = R.x - R.w / 4, xr = R.x + R.w / 4;
  chip(xl, 1215, 'CALIENTE = BLANCO', '#FFFFFF', sm(T.blanco - 0.2, T.blanco + 0.1, t) * a, { px: 44, s: 1 + 0.12 * pulse(t, T.blanco + 0.1, 0.2) });
  chip(xr, 1215, 'CALIENTE = ROJO', '#FF5A2A', sm(T.rojo - 0.2, T.rojo + 0.1, t) * a, { px: 44, s: 1 + 0.12 * pulse(t, T.rojo + 0.1, 0.2) });
  chip(xl, 1330, 'FRÍO = NEGRO', '#9AA0A8', sm(T.negro - 0.25, T.negro + 0.05, t) * a, { px: 44, s: 1 + 0.12 * pulse(t, T.negro + 0.1, 0.2) });
  chip(xr, 1330, 'FRÍO = AZUL', '#5A8CFF', sm(T.azul - 0.25, T.azul + 0.05, t) * a, { px: 44, s: 1 + 0.12 * pulse(t, T.azul + 0.1, 0.2) });
}
function itemK(t) { return window.COVER_T === undefined ? sm(T.llevas - 0.15, T.llevas + 0.15, t) * (1 - sm(T.donde - 0.25, T.donde + 0.15, t)) : 0; }
function itemPose(t) {
  const a = itemK(t), go = e3(pr(t, T.donde - 0.25, 0.4)), dp = proj(hero.tic.G.localToWorld(V(0, 0, 0)));
  return { a, x: mx(540, dp.x, go), y: mx(780, dp.y, go), s: mx(1, 0.15, go) * (0.8 + 0.2 * bk(pr(t, T.llevas - 0.15, 0.4))) };
}
function itemCard(t) {                    // el marco de «nuevo objeto» (sin fondo: la cámara 3D se pinta debajo, en WebGL)
  const { a, x, y, s } = itemPose(t); if (a <= 0.005) return;
  g.save(); g.globalAlpha = cl(a * 1.3); g.translate(x, y); g.scale(s, s);
  rr(-300, -330, 600, 600, 46); g.strokeStyle = GOLD2; g.lineWidth = 7; g.shadowColor = GOLD2; g.shadowBlur = 30; g.stroke(); g.shadowBlur = 0;
  rr(-300, -330, 600, 104, { upperLeft: 46, upperRight: 46, lowerLeft: 0, lowerRight: 0 }); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill();
  rr(-300, 150, 600, 120, { upperLeft: 0, upperRight: 0, lowerLeft: 46, lowerRight: 46 }); g.fillStyle = 'rgba(8,10,14,0.9)'; g.fill();
  txt('NUEVO OBJETO', 0, -262, 52, '#FFD65C', 400, 'center', 'Bebas');
  txt('CÁMARA TÉRMICA', 0, 236, 78, '#F4F6F8', 400, 'center', 'Bebas');
  g.restore();
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
const PA_ = () => V(-0.79, 1.3, -3.3), PB_ = () => V(HALL.x + 0.04, 1.3, -3.1), PC_ = () => V(0.05, 0.55, -5.3);
async function overlay(t) {
  TNOW = t;
  g.setTransform(PRX, 0, 0, PRX, 0, 0); g.clearRect(0, 0, W2, H2);
  const win = (t0, t1) => sm(t0 - 0.12, t0 + 0.08, t) * (1 - sm(t1 - 0.2, t1, t));
  const pop = t0 => 1 + 0.16 * pulse(t, t0 + 0.12, 0.18);
  const COV = window.COVER_T !== undefined;
  // tu hermano está dentro; dentro no se ve nada
  if (!COV) tag(V(0, 1.6, 0.0), 'TU HERMANO ESTÁ DENTRO', PINK2, win(T.dentro - 0.1, T.humo + 0.2), 0, 0, { px: 60, at: [540, 1330], s: pop(T.dentro) });
  if (!COV) label(540, 1330, '¡NO SE VE NADA!', RED2, win(T.nada - 0.15, T.llevas + 0.6), { px: 72, icon: 'warn', s: pop(T.nada) });
  if (!COV) itemCard(t);
  // las tres opciones: tarjetas de juego y su letra en el sitio; el cursor salta durante la cuenta
  const cA = T.a - 0.12, cB = T.b - 0.12, cC = T.c - 0.12, sel = T.lac - 0.05, hide = T.lac + 0.85;
  const cur = t < cB ? 'A' : t < cC ? 'B' : t < T.cnt0 ? 'C' : ['A', 'B', 'C'][Math.floor((t - T.cnt0) / 0.42) % 3], chosen = t >= sel;
  const ap = (t0) => sm(t0, t0 + 0.18, t) * (1 - sm(hide, hide + 0.3, t));
  if (COV) {
    if (cam.position.z < 0) { marker(PA_(), 'A', 1, 0, t); marker(PB_(), 'B', 1, 0, t); marker(PC_(), 'C', 1, 0, t); }   // (portada de fuera: sin las letras en su sitio)
    card(1260, 'A', 'TRAS LA PARED', 1, 0); card(1415, 'B', 'TRAS EL CRISTAL', 1, 0); card(1570, 'C', 'ENTRE EL HUMO', 1, 0);
    g.setTransform(1, 0, 0, 1, 0, 0); return;
  }
  const mk = (t0) => sm(t0, t0 + 0.18, t) * (1 - sm(sel + 0.25, sel + 0.6, t));
  const counting = t > T.cnt0 && t < sel;
  marker(PA_(), 'A', mk(cA), counting && cur === 'A' ? 1 : 0, t); marker(PB_(), 'B', mk(cB), counting && cur === 'B' ? 1 : 0, t); marker(PC_(), 'C', mk(cC), (counting && cur === 'C') || (chosen && t < sel + 0.6) ? 1 : 0, t);
  card(1110, 'A', 'TRAS LA PARED', ap(cA), chosen ? 3 : cur === 'A' ? 1 : 0);
  card(1265, 'B', 'TRAS EL CRISTAL', ap(cB), chosen ? 3 : cur === 'B' ? 1 : 0);
  card(1420, 'C', 'ENTRE EL HUMO', ap(cC), chosen ? 2 : cur === 'C' && t > cC ? 1 : 0);
  const ka = sm(T.cnt0 - 0.1, T.cnt0 + 0.1, t) * (1 - sm(T.cnt1 - 0.05, T.cnt1 + 0.2, t));
  if (ka > 0.01) {
    const el = cl((t - T.cnt0) / 5), n = Math.max(1, 5 - Math.floor((t - T.cnt0) + 1e-6)), fr = (t - T.cnt0) % 1, pp = 1 + 0.22 * Math.exp(-fr * 7);
    g.save(); g.globalAlpha = ka; g.translate(540, 640);
    g.beginPath(); g.arc(0, 0, 132, 0, 7); g.fillStyle = 'rgba(8,10,14,0.88)'; g.fill();
    g.beginPath(); g.arc(0, 0, 132, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - el), false); g.strokeStyle = n <= 2 ? RED2 : GOLD2; g.lineWidth = 14; g.lineCap = 'round'; g.shadowColor = g.strokeStyle; g.shadowBlur = 24; g.stroke(); g.shadowBlur = 0;
    g.scale(pp, pp); txt(String(n), 0, 70, 200, n <= 2 ? '#FF6B5E' : '#FFFFFF', 400, 'center', 'Bebas'); g.restore();
    g.save(); g.globalAlpha = ka; txt('ELIGE: A, B O C', 540, 470, 62, '#FFD65C', 400, 'center', 'Bebas'); g.restore();
  }
  const ok = win(sel, T.lac + 0.8);
  if (ok > 0.01) stamp('¡CORRECTA!', 1250, GREEN2, ok, 130, -0.05);
  // la pantalla de la cámara térmica (la imagen la pinta WebGL; aquí, el marco) y su línea hasta la cámara en tus manos
  panelFrame(t);
  if (thermVisible(t)) { const R = panelRect(t), dp = proj(hero.tic.G.localToWorld(V(0, 0, 0.07)));
    if (dp.ok && R.a > 0.01 && dp.y > R.y + R.h / 2 + 30) { g.save(); g.globalAlpha = R.a * 0.8; g.strokeStyle = '#F0B21C'; g.lineWidth = 4; g.setLineDash([14, 10]);
      g.beginPath(); g.moveTo(dp.x, dp.y); g.lineTo(R.x - R.w * 0.2, R.y + R.h / 2 + 16); g.moveTo(dp.x, dp.y); g.lineTo(R.x + R.w * 0.2, R.y + R.h / 2 + 16); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(dp.x, dp.y, 12, 0, 7); g.fillStyle = '#F0B21C'; g.fill(); g.restore(); } }
  // paso 1: no ve la luz, ve el calor (la regla de ondas) · todo emite infrarrojos
  spectrum(t); irWaves(t);
  const bh = bro.G.position.clone().add(V(0, 0.12, 1.15));
  // paso 2: por dentro
  innards(t);
  // paso 3: los colores
  palettes(t);
  // paso 4: sin luz y a través del humo (víctimas y foco del fuego) · pero no atraviesa paredes, hielo ni cristal
  chip(330, 1225, 'SIN LUZ', GREEN2, win(T.sinluz - 0.15, T.victimas - 0.2), { px: 50, icon: 'ok', s: pop(T.sinluz) });
  chip(750, 1225, 'A TRAVÉS DEL HUMO', GREEN2, win(T.humo3 - 0.15, T.victimas - 0.2), { px: 50, icon: 'ok', s: pop(T.humo3) });
  ptag(bh, 'VÍCTIMA', PINK2, win(T.victimas - 0.2, T.pero - 0.2), 330, 1225, { px: 52, s: pop(T.victimas), t0: T.victimas });
  ptag(V(-0.95, 1.0, -7.55), 'FOCO DEL FUEGO', ORANGE2, win(T.foco - 0.15, T.pero - 0.2), 760, 1225, { px: 52, s: pop(T.foco), t0: T.foco });
  const na = win(T.paredes - 0.2, T.ahi - 0.3);
  chip(230, 1225, 'PAREDES', RED2, na, { px: 50, icon: 'no', s: pop(T.paredes) });
  chip(540, 1225, 'HIELO', RED2, win(T.hielo - 0.15, T.ahi - 0.3), { px: 50, icon: 'no', s: pop(T.hielo) });
  chip(840, 1225, 'CRISTAL', RED2, win(T.cristal2 - 0.15, T.ahi - 0.3), { px: 50, icon: 'no', s: pop(T.cristal2) });
  const wx = win(T.paredes - 0.05, T.hielo + 0.3);
  if (wx > 0.01 && thermVisible(t)) { const R = panelRect(t); g.save(); g.globalAlpha = wx * 0.9; g.strokeStyle = RED2; g.lineWidth = 16; g.lineCap = 'round'; g.shadowColor = RED2; g.shadowBlur = 24;
    g.beginPath(); g.moveTo(R.x - 110, R.y - 110); g.lineTo(R.x + 110, R.y + 110); g.moveTo(R.x + 110, R.y - 110); g.lineTo(R.x - 110, R.y + 110); g.stroke(); g.restore();
    chip(R.x, R.y + 170, 'NO LA ATRAVIESA', RED2, wx, { px: 50 }); }
  const me = heroM.G.localToWorld ? V(0, 1.62, -0.1).applyMatrix4(heroM.G.matrix) : null;
  if (me) ptag(me, '¡ERES TÚ! (TU REFLEJO)', GOLD2, win(T.cristal3 - 0.1, T.ahi - 0.35), 540, 1345, { px: 54, s: pop(T.cristal3), t0: T.cristal3 });
  // ahí está: en el suelo del pasillo
  ptag(bh, '¡TU HERMANO!', PINK2, win(T.ahi - 0.05, T.sacais - 0.5), 540, 1228, { px: 64, s: pop(T.ahi), t0: T.ahi });
  chip(540, 1338, 'EN EL SUELO DEL PASILLO', PINK2, win(T.suelo - 0.15, T.sacais - 0.5), { px: 46 });
  // ¡misión cumplida!: tu hermano, a salvo en la ambulancia
  const mo = broOut.userData.head.getWorldPosition(V());
  tag(mo, 'HERMANO · A SALVO', GREEN2, win(T.sacais + 0.05, T.elegido - 0.1), 0, 0, { px: 60, icon: 'ok', at: [330, 1350], s: pop(T.sacais) });
  const wa = win(T.sacais, T.elegido - 0.15);
  if (wa > 0.01) {
    stamp('¡MISIÓN CUMPLIDA!', 800, GOLD2, wa, 124, -0.04);
    g.save(); for (let i = 0; i < 26; i++) { const an = rnd(i * 3.1) * Math.PI * 2, sp = 260 + rnd(i * 7.7) * 380, k = pr(t, T.sacais, 1.1), r = sp * e3(k);
      g.globalAlpha = wa * (1 - k); g.fillStyle = i % 3 ? GOLD2 : WHITE2; const x = 540 + Math.cos(an) * r, y = 800 + Math.sin(an) * r * 0.8;
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
  closingElite(t);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.01)'; g.fillRect(0, 0, 2, 2);
}

// ------------------------------------------------------------------ fotograma
window.renderAt = async t => {
  const N = window.FAST ? 1 : Math.min(2, subframes(t));
  update(t);
  if (thermVisible(t)) renderThermal(t);
  renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < N; k++) {
    update(N === 1 ? t : t + (k / (N - 1) - 0.5) / 120);
    composer.render();
    accMat.uniforms.tSrc.value = composer.readBuffer.texture; accMat.uniforms.uW.value = 1 / N;
    renderer.setRenderTarget(accRT); renderer.autoClear = false; renderer.render(accScene, quadCam); renderer.autoClear = true;
  }
  if (N > 1) update(t);
  finMat.uniforms.tSrc.value = accRT.texture; finMat.uniforms.uTime.value = t;
  const fg = pulse(t, T.lac + 0.02, 0.09) * 0.22, fw = pulse(t, T.out + 0.02, 0.1) * 0.55, fs = pulse(t, T.sacais + 0.15, 0.12) * 0.2;
  const fm = Math.max(fg, fw, fs);
  finMat.uniforms.uFlash.value = fm;
  if (fm === fg) finMat.uniforms.uFlashCol.value.setRGB(0.2, 0.95, 0.5); else if (fm === fw) finMat.uniforms.uFlashCol.value.setRGB(1, 1, 1); else finMat.uniforms.uFlashCol.value.setRGB(1.0, 0.82, 0.3);
  const ins = sm(T.lente - 0.3, T.lente, t) * (1 - sm(T.caliente2 - 0.4, T.caliente2 - 0.1, t));
  finMat.uniforms.uDim.value = mx(1, 0.42, ins) * mx(1, 0.6, itemK(t)) * mx(1, 0.86, sm(T.elegido - 0.1, T.elegido + 0.3, t) * (1 - sm(T.compartir - 0.3, T.compartir, t))) * mx(1, 0.72, sm(T.compartir - 0.2, T.compartir + 0.3, t)) * (1 - sm(T.end - 0.3, T.end, t));
  finMat.uniforms.uExp.value = 1.0;
  finMat.uniforms.uCA.value = 0.0025 + 0.002 * (N > 1 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(finScene, quadCam);
  uiUpdate(t);
  if (UI.panel.visible || UI.inn.visible || UI.item.visible) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(uiScene, uiCam); renderer.autoClear = true; }
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
    window.DBG = { scene, renderer, dof, finMat, world, cam, THREE, update, hero, bro, thermCam, renderThermal, outside, inside };
    window.READY3D = true;
  } catch (e) { window.failed = 'termica: ' + (e.stack || e); console.log('ERROR', e.stack || e); }
})();
