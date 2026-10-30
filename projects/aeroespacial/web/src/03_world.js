// ---------------------------------------------------------------- cielo: noche azul con estrellas (como «Industrial») que se abre en amanecer sobre el horizonte, y espacio negro
const SUN = new THREE.Vector3(-0.62, 0.1, -0.78).normalize();
const STAR_TEX = (() => { const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, '#04060c'); gr.addColorStop(0.5, '#0b1124'); gr.addColorStop(1, '#06080f'); g.fillStyle = gr; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 12; i++) { const x = hash(i * 31) * 2048, y = 200 + hash(i * 17) * 400, r = 160 + hash(i * 7) * 320, rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, ['rgba(60,80,170,.20)', 'rgba(150,70,40,.12)', 'rgba(90,50,140,.16)'][i % 3]); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 2200; i++) { const b = hash(i * 1.7); g.fillStyle = `rgba(215,225,255,${0.1 + b * b * 0.6})`; const s = b > 0.97 ? 2.2 : b > 0.85 ? 1.5 : 1; g.fillRect(hash(i * 3.3) * 2048, hash(i * 5.1) * 1024, s, s); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const SKY_VS = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; gl_Position.z = gl_Position.w * 0.99999; }`;
const SKY_FS = `uniform sampler2D tStars; uniform vec3 sunDir, camP; uniform float dawn, space, starK; varying vec3 vW;
void main(){
  vec3 d = normalize(vW - camP); float h = d.y;
  vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1., 1.)) / 3.14159265 + 0.5);
  vec3 night = texture2D(tStars, uv).rgb; night = pow(night, vec3(2.2)) * starK;
  vec3 zen = vec3(0.018, 0.045, 0.15), mid = vec3(0.09, 0.18, 0.42);
  vec2 dh = normalize(d.xz + 1e-5), sh = normalize(sunDir.xz + 1e-5); float az = max(dot(dh, sh), 0.);
  vec3 hor = mix(vec3(0.3, 0.28, 0.46), vec3(1.0, 0.5, 0.24), pow(az, 3.0));
  float sd = max(dot(d, sunDir), 0.);
  vec3 day = mix(hor, mid, smoothstep(-0.02, 0.24, h)); day = mix(day, zen, smoothstep(0.2, 0.8, h));
  day += vec3(1.0, 0.5, 0.2) * pow(sd, 8.0) * 0.8 * exp(-max(h, 0.) * 3.0) + vec3(1.0, 0.86, 0.62) * pow(sd, 900.0) * 6.5;
  day = mix(day, vec3(0.1, 0.09, 0.15), smoothstep(0.0, -0.35, h));
  day += night * smoothstep(0.25, 0.9, h) * 0.5;
  vec3 c = mix(night, day, dawn * (1. - space));
  gl_FragColor = vec4(c, 1.);
}`;
function buildSky() {
  const m = new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { tStars: { value: STAR_TEX }, sunDir: { value: SUN.clone() }, camP: { value: new THREE.Vector3() }, dawn: { value: 0 }, space: { value: 0 }, starK: { value: 1.4 } } });
  const s = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), m); s.renderOrder = -10; s.frustumCulled = false; scene.add(s); S.sky = s; return s;
}
// ---------------------------------------------------------------- mar de nubes: un suelo de nubes hasta el horizonte (ruido fbm iluminado por el sol bajo)
const CLOUD_Y = -6;
const CF_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`;
const CF_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 sunDir, camP, fogC; uniform float time, op, dawn; varying vec3 vW;
float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ns(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.; for (int i = 0; i < 6; i++){ s += a * ns(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float fb3(vec2 p){ float a = 0.5, s = 0.; for (int i = 0; i < 3; i++){ s += a * ns(p); p = p * 2.1 + vec2(4.3, 1.1); a *= 0.5; } return s; }
void main(){
  #include <logdepthbuf_fragment>
  vec2 p = vW.xz * 0.045 + vec2(time * 0.012, time * 0.004), sd = normalize(sunDir.xz + 1e-5);
  float dist = distance(vW, camP), near = 1. - smoothstep(8., 70., dist);
  // de cerca, rizos pequeños de nube (si no, el mar de nubes es una mancha lisa)
  float det = (fb3(vW.xz * 0.55 + time * 0.03) - 0.45) * 0.16 * near, det2 = (fb3((vW.xz + sd * 0.25) * 0.55 + time * 0.03) - 0.45) * 0.16 * near;
  float d = fbm(p) + det, d2 = fbm(p + sd * 0.05) + det2;
  float cov = smoothstep(0.36, 0.7, d);
  float lit = clamp(0.58 + (d - d2) * 6.5, 0., 1.35);
  vec3 sh = vec3(0.12, 0.15, 0.3), li = mix(vec3(0.5, 0.55, 0.72), vec3(1.05, 0.72, 0.56), dawn) * (0.75 + 0.35 * max(dot(normalize(vW.xz - camP.xz + 1e-4), normalize(sunDir.xz)), 0.));
  vec3 c = mix(sh * 0.6, mix(sh, li, lit), cov);
  float f = 1. - exp(-dist * 0.0028);
  c = mix(c, fogC, f);
  gl_FragColor = vec4(c, op);
}`;
function buildCloudFloor() {
  const m = new THREE.ShaderMaterial({ vertexShader: CF_VS, fragmentShader: CF_FS, transparent: true, depthWrite: true, fog: false,
    uniforms: { sunDir: { value: SUN.clone() }, camP: { value: new THREE.Vector3() }, fogC: { value: new THREE.Color(0.32, 0.3, 0.44) }, time: { value: 0 }, op: { value: 1 }, dawn: { value: 1 } } });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000, 1, 1), m); p.rotation.x = -Math.PI / 2; p.position.set(60, CLOUD_Y, 0); p.renderOrder = -5; scene.add(p); S.cfloor = p; return p;
}
// ---------------------------------------------------------------- nubes de verdad alrededor de la cámara: billboards con textura de cúmulo, luz del sol por arriba
const PUFF_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 corner; attribute vec4 ip; attribute vec4 iq;
uniform vec3 camR, camU, camP; uniform float op;
varying vec2 vUv; varying float vA; varying float vY; varying float vT;
void main(){
  vec3 c = ip.xyz; float sz = ip.w;
  vec3 P = c + (camR * corner.x * 1.6 + camU * corner.y) * sz;
  vUv = corner * 0.5 + 0.5; vY = corner.y; vT = iq.x;
  float d = distance(c, camP);
  vA = op * iq.y * smoothstep(sz * 0.6, sz * 2.2, d) * (1. - smoothstep(160., 260., d));
  vec4 mv = viewMatrix * vec4(P, 1.); gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
const PUFF_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D tPuff; uniform vec3 litC, shC; varying vec2 vUv; varying float vA; varying float vY; varying float vT;
void main(){
  #include <logdepthbuf_fragment>
  vec4 tx = texture2D(tPuff, vec2(vUv.x * 0.5 + (vT > 0.5 ? 0.5 : 0.), vUv.y));
  float a = tx.a * vA * smoothstep(-0.95, -0.3, vY); if (a < 0.004) discard;      // por abajo se deshace (no se ve el corte con el mar de nubes)
  vec3 c = mix(shC, litC, clamp(0.35 + vY * 0.55 + tx.r * 0.35, 0., 1.2));
  gl_FragColor = vec4(c, a);
}`;
const PUFF_TEX = canvasTex(512, 256, (g, w, h) => {
  for (let k = 0; k < 2; k++) { const ox = k * 256;
    for (let i = 0; i < 70; i++) { const a = hash(i * 3.1 + k * 50) * Math.PI * 2, rr2 = Math.pow(hash(i * 7.7 + k), 0.7) * 70, x = ox + 128 + Math.cos(a) * rr2 * 1.25, y = 140 + Math.sin(a) * rr2 * 0.55 - hash(i * 1.3) * 25, r = 26 + hash(i * 5.3 + k) * 44;
      const gr = g.createRadialGradient(x, y - r * 0.25, 0, x, y, r); const l = Math.round(200 + hash(i) * 55);
      gr.addColorStop(0, `rgba(${l},${l},${l},.95)`); gr.addColorStop(0.55, `rgba(${l - 25},${l - 25},${l - 25},.7)`); gr.addColorStop(1, 'rgba(120,120,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
});
function puffCloud(N, gen, o = {}) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
  g.setAttribute('corner', new THREE.Float32BufferAttribute([-1, -1, 1, -1, -1, 1, 1, 1], 2)); g.setIndex([0, 1, 2, 2, 1, 3]);
  const ip = new Float32Array(N * 4), iq = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { const q = gen(i); ip.set([q[0], q[1], q[2], q[3]], i * 4); iq.set([hash(i * 9.1 + (o.seed || 0)), q[4] ?? 1, 0, 0], i * 4); }
  g.setAttribute('ip', new THREE.InstancedBufferAttribute(ip, 4)); g.setAttribute('iq', new THREE.InstancedBufferAttribute(iq, 4)); g.instanceCount = N;
  const m = new THREE.ShaderMaterial({ vertexShader: PUFF_VS, fragmentShader: PUFF_FS, transparent: true, depthWrite: false,
    uniforms: { tPuff: { value: PUFF_TEX }, camR: { value: new THREE.Vector3(1, 0, 0) }, camU: { value: new THREE.Vector3(0, 1, 0) }, camP: { value: new THREE.Vector3() }, op: { value: 1 },
      litC: { value: new THREE.Color(o.lit || 0xfff0e2) }, shC: { value: new THREE.Color(o.sh || 0x6f7a99) } } });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 6; scene.add(mesh); return mesh;
}
// ---------------------------------------------------------------- flujo óptico: motas en el aire que dejan estelas según se mueve la cámara (como en «Civil»)
const FLOW_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 corner; attribute vec3 ipos; attribute float iseed;
uniform mat4 VP, PVP; uniform vec2 res; uniform float size, bright, time, nearF, farF, drift, keep;
varying float vA; varying float vS; varying float vT; varying float vLen;
void main(){
  vec3 P = ipos + vec3(sin(time*0.31+iseed*40.), cos(time*0.23+iseed*17.), sin(time*0.27+iseed*9.)) * drift * (0.4 + iseed);
  vec4 a = VP * vec4(P,1.), b = PVP * vec4(P,1.);
  if (a.w < nearF * 0.5 || b.w < nearF * 0.25) { gl_Position = vec4(0.,0.,-2.,1.); vA = 0.; vS = 0.; vT = 0.; vLen = 0.; return; }
  vec2 pa = a.xy / a.w * res * 0.5, pb = b.xy / b.w * res * 0.5;
  vec2 d = pb - pa; float L = min(length(d), 700.0);
  vec2 dir = L > 0.01 ? normalize(d) : vec2(1., 0.); vec2 nr = vec2(-dir.y, dir.x);
  float sz = size * (0.55 + iseed * 0.9) * clamp(2.6 / a.w, 0.4, 2.4);
  vec2 px = (corner.x > 0.5 ? pa - dir * sz : pa + dir * (L + sz)) + nr * corner.y * sz;
  gl_Position = vec4(px / (res * 0.5) * a.w, a.z, a.w);
  #include <logdepthbuf_vertex>
  float fog = exp(-a.w * farF), nf = smoothstep(nearF, nearF * 3.0, a.w);
  vA = bright * (0.3 + 0.7 * iseed) * fog * nf * clamp((2.0 * sz) / (L * 0.5 + 2.0 * sz), keep, 1.0);
  vS = corner.x > 0.5 ? -1.0 : (L / sz + 1.0); vT = corner.y; vLen = L / sz;
}`;
const FLOW_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 col; uniform float op; varying float vA; varying float vS; varying float vT; varying float vLen;
void main(){
  #include <logdepthbuf_fragment>
  float ds = max(0., max(-vS, vS - vLen)), dist = length(vec2(ds, vT));
  float a = smoothstep(1.0, 0.2, dist) * vA * op * mix(1.0, 0.2, clamp(vS / max(vLen, 0.001), 0., 1.));
  if (a < 0.002) discard;
  gl_FragColor = vec4(col * a, a);
}`;
function flowCloud(N, gen, o = {}) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
  g.setAttribute('corner', new THREE.Float32BufferAttribute([1, -1, 1, 1, 0, -1, 0, 1], 2));
  g.setIndex([0, 2, 1, 2, 3, 1]);
  const P = new Float32Array(N * 3), Sd = new Float32Array(N);
  for (let i = 0; i < N; i++) { const p = gen(i); P[i * 3] = p[0]; P[i * 3 + 1] = p[1]; P[i * 3 + 2] = p[2]; Sd[i] = Math.pow(hash(i * 7.31 + (o.seed || 0)), 1.6); }
  g.setAttribute('ipos', new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute('iseed', new THREE.InstancedBufferAttribute(Sd, 1)); g.instanceCount = N;
  const m = new THREE.ShaderMaterial({ vertexShader: FLOW_VS, fragmentShader: FLOW_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { VP: { value: new THREE.Matrix4() }, PVP: { value: new THREE.Matrix4() }, res: { value: new THREE.Vector2(W, H) }, size: { value: o.size || 1.6 }, bright: { value: o.bright || 0.6 },
      time: { value: 0 }, nearF: { value: o.nearF || 0.25 }, farF: { value: o.farF || 0.03 }, drift: { value: o.drift ?? 0.03 }, keep: { value: o.keep || 0.1 }, op: { value: 1 }, col: { value: new THREE.Color(o.col || 0xd8e2ee) } } });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.layers.set(1); mesh.renderOrder = 2; scene.add(mesh); return mesh;
}
const gauss = i => { const u = Math.max(1e-6, hash(i * 1.37)), v = hash(i * 2.91); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const PUFFS = [];
function buildWorld() {
  buildSky(); buildCloudFloor();
  // (sin capa de cúmulos sueltos: lavaban toda la imagen; el mar de nubes es el suelo fbm)
  S.puffs = puffCloud(1, () => [0, -999, 0, 0.01, 0], { seed: 3 }); S.puffs.visible = false;
  S.flow = [
    flowCloud(16000, i => [-15 + hash(i * 3.1) * 110, -5 + Math.pow(hash(i * 5.7), 1.2) * 20, -14 + hash(i * 8.3) * 30], { size: 1.6, bright: 0.75, farF: 0.025, seed: 2 }),
    flowCloud(6000, i => [gauss(i) * 3.5, 0.2 + Math.abs(gauss(i + 9e3)) * 2.5, gauss(i + 2e4) * 3.5], { size: 1.3, bright: 0.55, seed: 1, nearF: 0.05, farF: 0.06, col: 0xfff0d0 }),
  ];
}
function worldUpdate(t, VP, PVP, camP) {
  for (const m of S.flow) { const u = m.material.uniforms; u.VP.value.copy(VP); u.PVP.value.copy(PVP); u.time.value = t; }
  S.sky.position.copy(camP); S.sky.material.uniforms.camP.value.copy(camP);
  const cu = S.cfloor.material.uniforms; cu.camP.value.copy(camP); cu.time.value = t;
  cam.updateMatrixWorld();
  for (const P of PUFFS) { const pu = P.material.uniforms; pu.camP.value.copy(camP); pu.camR.value.setFromMatrixColumn(cam.matrixWorld, 0); pu.camU.value.setFromMatrixColumn(cam.matrixWorld, 1); }
}
// mapa de entorno (reflejos de los aviones): el cielo del amanecer con el mar de nubes abajo
function skyEnv() {
  const sc = new THREE.Scene(), m = S.sky.material.clone(); m.uniforms.camP.value = new THREE.Vector3(); m.uniforms.dawn.value = 1; m.uniforms.space.value = 0;
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), m));
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.42, 0.4, 0.52) })); fl.rotation.x = -Math.PI / 2; fl.position.y = -8; sc.add(fl);
  const pm = new THREE.PMREMGenerator(renderer); const e = pm.fromScene(sc, 0, 0.1, 1000).texture; pm.dispose(); return e;
}
