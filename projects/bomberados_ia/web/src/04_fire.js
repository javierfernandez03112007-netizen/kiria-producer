// ---------------------------------------------------------------- fuego: partículas que suben de la sartén; dos grupos forman la V y la F
// Cada partícula vive en bucle (edad 0→1): nace en el aceite, sube estrechándose y se enfría (blanco → naranja → rojo).
// Las de los grupos 1 (V) y 2 (F) pueden dejar la llama y colocarse en su letra (form 0→1), que se mueve y escala
// con L0 / L1 (centro y altura en metros). Estela = su propio movimiento + el de la cámara (posición ahora y hace dtp).
const FIRE_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 corner; attribute vec4 seed; attribute vec3 tgt; attribute float grp;
uniform mat4 VP, PVP; uniform vec2 res; uniform float ppu, pxs, time, dtp, size, lsize, bright;
uniform vec3 orig; uniform float rad, hgt, power;
uniform vec4 L0, L1, L0p, L1p; uniform vec2 form, heat;
varying float vA; varying float vS; varying float vT; varying float vLen; varying vec3 vC;
vec3 flameP(float T, float age) {
  // lenguas de fuego: cada partícula nace en el aceite y, al subir, se junta en una de 7 lenguas que ondean
  float lane = floor(seed.z * 7.0), la = lane / 7.0 * 6.2831853 + sin(T * 0.6 + lane * 1.3) * 0.5;
  float a = seed.y * 6.2831853, r = sqrt(seed.w) * rad;
  float tall = 0.3 + 0.95 * pow(fract(seed.x * 3.7 + lane * 0.37), 1.4);
  float h = pow(age, 0.72) * hgt * tall * power;
  vec2 base = vec2(cos(a), sin(a)) * r, tg = vec2(cos(la), sin(la)) * rad * (0.35 + 0.25 * fract(lane * 0.618));
  vec2 xz = mix(base, tg * (1.0 - 0.55 * age), smoothstep(0.08, 0.6, age));
  xz += vec2(sin(T * 5.1 + lane * 1.7 + age * 4.5), cos(T * 4.4 + lane * 2.3 + age * 3.8)) * 0.045 * age * power;
  xz += vec2(sin(T * 14.0 + seed.y * 21.0), cos(T * 12.0 + seed.w * 17.0)) * 0.008 * age;
  return orig + vec3(xz.x, h, xz.y);
}
vec3 letterP(float T, float age, vec4 L) {
  // la letra arde: cada partícula nace en el trazo y sube como una lengua corta que se enfría
  vec3 p = L.xyz + tgt * L.w;
  float lick = pow(age, 1.3) * (0.1 + 0.22 * seed.x) * L.w;
  p.y += lick;
  p.x += sin(T * 7.0 + seed.z * 40.0 + age * 5.0) * 0.03 * age * L.w;
  p.z += cos(T * 6.0 + seed.w * 40.0) * 0.02 * L.w;
  return p;
}
vec3 posAt(float T, vec4 LA, vec4 LB, out float age, out float f, out float ht, out float lw) {
  float r = grp < 0.5 ? 1.15 + seed.x * 0.9 : 1.7 + seed.x * 1.3;
  age = fract(T * r + seed.y * 7.31);
  vec3 p = flameP(T, age);
  f = 0.0; ht = 1.0; lw = 0.3;
  if (grp > 0.5) {
    vec4 L = grp < 1.5 ? LA : LB; float fm = grp < 1.5 ? form.x : form.y; ht = grp < 1.5 ? heat.x : heat.y; lw = L.w;
    f = clamp((fm - seed.w * 0.35) / 0.65, 0.0, 1.0); f = f * f * (3.0 - 2.0 * f);
    if (f > 0.0) { vec3 q = letterP(T, age, L); vec3 m = mix(p, q, f); m.y += sin(3.14159 * f) * 0.25 * max(L.w, 0.1); p = m; }
  }
  return p;
}
void main(){
  float ag, f, ht, lw, ag2, f2, ht2, lw2;
  vec3 P = posAt(time, L0, L1, ag, f, ht, lw);
  vec3 P2 = posAt(time - dtp, L0p, L1p, ag2, f2, ht2, lw2);
  if (ag2 > ag) P2 = P;
  vec4 a = VP * vec4(P, 1.), b = PVP * vec4(P2, 1.);
  float vis = mix(power, 1.0, f) * ht;
  if (a.w < 0.015 || b.w < 0.008 || vis < 0.003) { gl_Position = vec4(0.,0.,-2.,1.); vA = 0.; vS = 0.; vT = 0.; vLen = 0.; vC = vec3(0.); return; }
  vec2 pa = a.xy / a.w * res * 0.5, pb = b.xy / b.w * res * 0.5;
  vec2 d = pb - pa; float L = min(length(d), 520.0 * pxs);
  vec2 dir = L > 0.01 ? normalize(d) : vec2(1., 0.); vec2 nr = vec2(-dir.y, dir.x);
  float wf = size * (0.55 + 0.8 * seed.x) * (0.45 + 0.9 * ag) * (1.0 - smoothstep(0.75, 1.0, ag) * 0.5);
  float wl = lsize * lw * (0.55 + 0.6 * seed.x) * (0.8 + 0.7 * ag);
  float sz = clamp(mix(wf, wl, f) * ppu / a.w, 1.0 * pxs, 85.0 * pxs);
  vec2 px = (corner.x > 0.5 ? pa - dir * sz : pa + dir * (L + sz)) + nr * corner.y * sz;
  gl_Position = vec4(px / (res * 0.5) * a.w, a.z, a.w);
  #include <logdepthbuf_vertex>
  vec3 c0 = vec3(1.0, 0.78, 0.38), c1 = vec3(1.0, 0.38, 0.06), c2 = vec3(0.55, 0.06, 0.01);
  vec3 cf = ag < 0.25 ? mix(c0, c1, ag / 0.25) : mix(c1, c2, (ag - 0.25) / 0.75);
  vec3 cl = ag < 0.3 ? mix(vec3(1.0, 0.82, 0.45), vec3(1.0, 0.45, 0.08), ag / 0.3) : mix(vec3(1.0, 0.45, 0.08), vec3(0.6, 0.07, 0.01), (ag - 0.3) / 0.7);
  vC = mix(cf, cl, f);
  float fade = (1.0 - smoothstep(0.35, 1.0, ag)) * smoothstep(0.0, 0.05, ag);
  vA = bright * vis * mix(fade, (1.0 - smoothstep(0.25, 1.0, ag)) * 1.5, f) * (0.45 + 0.55 * seed.z) * clamp((2.0 * sz) / (L * 0.5 + 2.0 * sz), 0.35, 1.0);
  vS = corner.x > 0.5 ? -1.0 : (L / sz + 1.0); vT = corner.y; vLen = L / sz;
}`;
const FIRE_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
varying float vA; varying float vS; varying float vT; varying float vLen; varying vec3 vC;
void main(){
  #include <logdepthbuf_fragment>
  float ds = max(0., max(-vS, vS - vLen)), dist = length(vec2(ds, vT));
  float a = smoothstep(1.0, 0.0, dist); a = a * a * vA * mix(1.0, 0.25, clamp(vS / max(vLen, 0.001), 0., 1.));
  if (a < 0.002) discard;
  gl_FragColor = vec4(vC * a, a);
}`;
// puntos dentro de una letra (canvas → muestreo), en unidades de altura 1, centrados
function glyphPoints(ch, n, sd) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.font = '900 236px Inter'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(ch, 128, 214);
  const d = g.getImageData(0, 0, 256, 256).data; let y0 = 256, y1 = 0;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (d[(y * 256 + x) * 4 + 3] > 128) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const hh = Math.max(1, y1 - y0), cy = (y0 + y1) / 2, out = new Float32Array(n * 3); let k = 0, i = 0;
  while (k < n && i < n * 400) { i++; const x = hash(i * 1.37 + sd) * 256, y = y0 + hash(i * 2.71 + sd * 3.1) * hh;
    if (d[(Math.floor(y) * 256 + Math.floor(x)) * 4 + 3] > 128) { out[k * 3] = (x - 128) / hh; out[k * 3 + 1] = (cy - y) / hh; out[k * 3 + 2] = (hash(i * 5.3 + sd) - 0.5) * 0.08; k++; } }
  return out;
}
function buildFire(o) {
  const n0 = o.n0, nl = o.nl, N = n0 + 2 * nl;
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
  g.setAttribute('corner', new THREE.Float32BufferAttribute([1, -1, 1, 1, 0, -1, 0, 1], 2));
  g.setIndex([0, 2, 1, 2, 3, 1]);
  const sd = new Float32Array(N * 4), tg = new Float32Array(N * 3), gr = new Float32Array(N);
  for (let i = 0; i < N * 4; i++) sd[i] = hash(i * 0.731 + 11.3);
  const pv = glyphPoints('V', nl, 1), pf = glyphPoints('F', nl, 2);
  for (let i = 0; i < nl; i++) { const a = n0 + i, b = n0 + nl + i; gr[a] = 1; gr[b] = 2; for (let c = 0; c < 3; c++) { tg[a * 3 + c] = pv[i * 3 + c]; tg[b * 3 + c] = pf[i * 3 + c]; } }
  g.setAttribute('seed', new THREE.InstancedBufferAttribute(sd, 4)); g.setAttribute('tgt', new THREE.InstancedBufferAttribute(tg, 3)); g.setAttribute('grp', new THREE.InstancedBufferAttribute(gr, 1));
  g.instanceCount = N;
  const m = new THREE.ShaderMaterial({ vertexShader: FIRE_VS, fragmentShader: FIRE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { VP: { value: new THREE.Matrix4() }, PVP: { value: new THREE.Matrix4() }, res: { value: new THREE.Vector2(W / 2, H / 2) }, ppu: { value: 1000 }, pxs: { value: 0.5 }, time: { value: 0 }, dtp: { value: 1 / 36 },
      size: { value: o.size }, lsize: { value: o.lsize }, bright: { value: o.bright }, orig: { value: o.orig.clone() }, rad: { value: o.rad }, hgt: { value: o.hgt }, power: { value: 1 },
      L0: { value: new THREE.Vector4(0, 0, 0, 0.3) }, L1: { value: new THREE.Vector4(0, 0, 0, 0.3) }, L0p: { value: new THREE.Vector4(0, 0, 0, 0.3) }, L1p: { value: new THREE.Vector4(0, 0, 0, 0.3) }, form: { value: new THREE.Vector2(0, 0) }, heat: { value: new THREE.Vector2(1, 1) } } });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 3; fireScene.add(mesh);   // en su propia escena (ver rtF)
  return { mesh, u: m.uniforms };
}
function fireUpdate(F, t, VP, PVP) {
  const u = F.u; u.VP.value.copy(VP); u.PVP.value.copy(PVP); u.time.value = t;
  u.ppu.value = H * 0.25 / Math.tan(cam.fov * Math.PI / 360);   // píxeles del lienzo del fuego (media resolución)
}
