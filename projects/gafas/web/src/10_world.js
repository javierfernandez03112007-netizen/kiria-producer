// ---------------------------------------------------------------- el mundo: pista nevada, montañas, cielo con el sol y la nieve que brilla
const SUN_DIR = v3(-0.36, 0.5, -0.79).normalize();          // hacia el sol (alto, detrás y a la izquierda del esquiador)
const SOFT_DIR = v3(-0.3, 0.25, 0.92).normalize();           // luz del día nublado: baja, desde un lado (+z)
const SUN_D = 240, SUN_P = SUN_DIR.clone().multiplyScalar(SUN_D);
const W0 = {};                                              // piezas del mundo
let SNOW, SNOWF;
function n2(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, h = (a, b) => hash(a * 157.31 + b * 311.73 + 0.17);
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v);
}
function fbm(x, z, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * n2(x * f, z * f); f *= 2.03; a *= 0.5; } return s; }
// los baches (bañeras) de la bajada: siempre están, pero con luz plana casi no se ven
function mogul(x, z) { const m = Math.max(0, 1 - Math.abs(z + 1.5) / 9) * clamp((x - 5) / 4) * (1 - clamp((x - 60) / 10)); return m * 0.44 * (Math.sin(x * 0.92 + Math.sin(z * 0.5) * 0.9) * Math.sin(z * 0.85 + x * 0.21)); }
function groundH(x, z) {
  const d = Math.hypot(x + 10, z + 20), slope = -0.17 * x;
  const roll = (fbm(x * 0.05 + 3, z * 0.05 + 7) - 0.5) * 2.4;
  const mtn = Math.pow(Math.max(0, d - 70) / 130, 1.35) * 95 * (0.5 + 0.95 * fbm(x * 0.011 + 11, z * 0.011 + 5, 6));
  const near = Math.exp(-(x * x + z * z) / 140);
  return slope + lerp(roll, 0, near * 0.9) + mtn + mogul(x, z);
}
// luz plana: con el cielo cubierto la nieve se ilumina como si fuera lisa (la normal se aplana hacia la de la ladera: uFlat).
// A través de la lente naranja (máscara uMask, que entra de izquierda a derecha hasta uLensW) vuelve la normal real: vuelve el relieve
const RELIEF = { uFlat: { value: 0 }, uLensK: { value: 0 }, uLensW: { value: 1 }, uMask: { value: rtM.texture }, uRes: { value: new THREE.Vector2(W * PR, H * PR) } };
function reliefPatch(m) {
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, RELIEF);
    sh.fragmentShader = 'uniform float uFlat, uLensK, uLensW; uniform sampler2D uMask; uniform vec2 uRes;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      { vec2 sv = gl_FragCoord.xy / uRes; float inL = texture2D(uMask, sv).r * (1.0 - smoothstep(uLensW - 0.025, uLensW + 0.025, sv.x));
        vec3 upV = normalize((viewMatrix * vec4(0.168, 0.986, 0.0, 0.0)).xyz); normal = normalize(mix(normal, upV, uFlat * (1.0 - uLensK * inL))); }`); };
  m.customProgramCacheKey = () => 'relief';
}
function buildMats() {
  SNOW = new THREE.MeshStandardMaterial({ color: 0xf2f6fc, roughness: 0.82, metalness: 0, envMapIntensity: 0.6 }); reliefPatch(SNOW);
  SNOWF = new THREE.MeshStandardMaterial({ color: 0xf6f9ff, roughness: 0.9, metalness: 0 }); reliefPatch(SNOWF);
}
const SKY_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vD; void main(){ vD = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`;
const SKY_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 sunDir; uniform float over, space, dark; varying vec3 vD;
void main(){
  #include <logdepthbuf_fragment>
  vec3 d = normalize(vD); float h = clamp(d.y, -0.2, 1.0);
  vec3 zen = vec3(0.05, 0.22, 0.62), hor = vec3(0.62, 0.78, 0.95);
  vec3 c = mix(hor, zen, pow(max(h, 0.0), 0.55));
  c = mix(c, vec3(0.86, 0.9, 0.95), smoothstep(0.02, -0.12, d.y));
  float s = max(dot(d, sunDir), 0.0); c += vec3(1.0, 0.92, 0.75) * (pow(s, 380.0) * 6.0 + pow(s, 24.0) * 0.45 + pow(s, 5.0) * 0.12);
  vec3 ov = vec3(0.72, 0.75, 0.79) - vec3(0.06) * max(h, 0.0);      // cielo cubierto: gris plano
  c = mix(c, ov, over);
  vec3 sp = mix(vec3(0.0, 0.01, 0.04), vec3(0.03, 0.08, 0.2), smoothstep(-0.3, 0.6, d.y)) + vec3(1.0, 0.9, 0.7) * pow(s, 24.0) * 0.6;   // casi el espacio
  c = mix(c, sp, space); c *= 1.0 - dark;
  gl_FragColor = vec4(c, 1.0);
}`;
function buildWorld() {
  const Z = new THREE.Group(); scene.add(Z); W0.Z = Z;
  // cielo
  W0.sky = new THREE.Mesh(new THREE.SphereGeometry(330, 48, 24), new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false,
    uniforms: { sunDir: { value: SUN_DIR.clone() }, over: { value: 0 }, space: { value: 0 }, dark: { value: 0 } } }));
  W0.sky.renderOrder = -10; W0.sky.frustumCulled = false; Z.add(W0.sky);
  // terreno
  const N = 300, SZ = 520, g = new THREE.PlaneGeometry(SZ, SZ, N, N); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); P.setY(i, groundH(x, z)); }
  g.computeVertexNormals();
  W0.ground = new THREE.Mesh(g, SNOW); W0.ground.receiveShadow = true; Z.add(W0.ground);
  // detalle fino cerca del esquiador y de los baches (malla densa)
  const g2 = new THREE.PlaneGeometry(90, 40, 360, 160); g2.rotateX(-Math.PI / 2); g2.translate(28, 0.01, -1.5);
  const P2 = g2.attributes.position; for (let i = 0; i < P2.count; i++) { const x = P2.getX(i), z = P2.getZ(i); P2.setY(i, groundH(x, z) + 0.012 + (n2(x * 3.1, z * 3.1) - 0.5) * 0.03); }
  g2.computeVertexNormals(); W0.near = new THREE.Mesh(g2, SNOW); W0.near.receiveShadow = true; Z.add(W0.near);
  // el sol: disco brillante + halo
  const sunM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.82).multiplyScalar(9), toneMapped: false, fog: false });
  W0.sun = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48), sunM); W0.sun.position.copy(SUN_P); Z.add(W0.sun);
  W0.halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: starTex0(), color: new THREE.Color(1, 0.86, 0.62).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
  W0.halo.position.copy(SUN_P); W0.halo.scale.setScalar(70); Z.add(W0.halo);
  // la nieve que centellea (cristales que pillan el sol según desde dónde se miren)
  const n = 2600, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const r = 2 + Math.pow(hash(i * 1.7), 0.7) * 26, a = hash(i * 3.3) * Math.PI * 2, x = Math.cos(a) * r + 4, z = Math.sin(a) * r * 0.8; pos.set([x, groundH(x, z) + 0.03, z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const sd = new Float32Array(n); for (let i = 0; i < n; i++) sd[i] = hash(i * 9.1); sg.setAttribute('seed', new THREE.Float32BufferAttribute(sd, 1));
  W0.glint = new THREE.Points(sg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, k: { value: 1 }, sunDir: { value: SUN_DIR.clone() }, map: { value: starTex0() } },
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
attribute float seed; uniform float time, k; uniform vec3 sunDir; varying float vA;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
#include <logdepthbuf_vertex>
vec3 vd = normalize(cameraPosition - position); vec3 nrm = normalize(vec3(sin(seed * 91.0), 2.2, cos(seed * 57.0)));
float spec = pow(max(dot(reflect(-sunDir, nrm), vd), 0.0), 60.0); float tw = 0.5 + 0.5 * sin(time * (3.0 + seed * 6.0) + seed * 40.0);
vA = k * clamp(spec * 3.0 * tw + 0.04 * tw, 0.0, 1.4); gl_PointSize = clamp(260.0 / -mv.z, 1.5, 9.0) * (0.6 + seed); }`,
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D map; varying float vA; void main(){
#include <logdepthbuf_fragment>
vec4 c = texture2D(map, gl_PointCoord); if (vA * c.a < 0.01) discard; gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * vA * c.a * 2.0, vA * c.a); }` }));
  W0.glint.frustumCulled = false; Z.add(W0.glint);
  // pinos lejanos (conos oscuros) para dar escala
  const tm = new THREE.MeshStandardMaterial({ color: 0x2a3a36, roughness: 0.9 }), cone = new THREE.ConeGeometry(1, 3.2, 7); cone.translate(0, 1.6, 0);
  const trees = new THREE.InstancedMesh(cone, tm, 140); let ti = 0; const M = new THREE.Matrix4();
  for (let i = 0; ti < 140 && i < 3000; i++) { const x = (hash(i * 4.1) - 0.5) * 300, z = -55 - hash(i * 7.7) * 130; const s = 0.9 + hash(i * 2.3) * 1.5; M.compose(v3(x, groundH(x, z) - 0.2, z), new THREE.Quaternion(), v3(s * 0.8, s, s * 0.8)); trees.setMatrixAt(ti++, M); }
  trees.count = ti; trees.castShadow = true; Z.add(trees); W0.trees = trees;
  // balizas a los lados de la pista: con luz plana se siguen viendo; lo que desaparece es el relieve
  const pm = paint(0x1c1f24, 0.5, 0.3), pb = paint(0xd8262a, 0.4, 0.3); W0.poles = new THREE.Group(); Z.add(W0.poles);
  for (let i = 0; i < 16; i++) { const side = i % 2 ? 1 : -1, x = 8 + Math.floor(i / 2) * 6.2 + (side > 0 ? 3.1 : 0), z = -1.5 + side * 6.4, y = groundH(x, z) - 0.05;
    const a = cyl(0.028, 0.028, 1.55, pm, 8); a.position.set(x, y + 0.775, z); W0.poles.add(a);
    const b = cyl(0.031, 0.031, 0.38, pb, 8); b.position.set(x, y + 1.36, z); W0.poles.add(b); }
  scene.fog = new THREE.FogExp2(0xd6e4f4, 0.0017); W0.fogC = new THREE.Color(0xd6e4f4);
  // copos y polvo de nieve en el aire (dejan estela cuando la cámara se mueve)
  S.flow = [flowCloud(2600, i => { const r = 16 * Math.cbrt(hash(i * 1.13)), a = hash(i * 2.21) * Math.PI * 2; return [Math.cos(a) * r + 2.5, 0.2 + hash(i * 3.37) * 9, Math.sin(a) * r * 0.9]; }, { size: 1.1, bright: 0.16, col: 0xeef4ff, drift: 0.06, seed: 3 })];
}
function buildLights() {
  W0.hemi = new THREE.HemisphereLight(0xbfd8ff, 0xf3f6fb, 0.8); scene.add(W0.hemi);
  W0.sunL = new THREE.DirectionalLight(0xfff1dc, 3.0); W0.sunL.castShadow = true; W0.sunL.shadow.mapSize.set(2048, 2048);
  const sc = W0.sunL.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 120; W0.sunL.shadow.bias = -0.0004; W0.sunL.shadow.normalBias = 0.02;
  scene.add(W0.sunL); scene.add(W0.sunL.target);
  // día nublado: una luz lateral baja y suave (sin sombras) que modela los baches; fuera de la lente se aplana (uFlat)
  W0.soft = new THREE.DirectionalLight(0xfff3e6, 0); scene.add(W0.soft); scene.add(W0.soft.target);
  // luces de estudio para las gafas desmontadas
  W0.key = new THREE.SpotLight(0xffffff, 0, 6, 0.6, 0.6, 1.2); scene.add(W0.key); scene.add(W0.key.target);
  W0.rim = new THREE.PointLight(0x9fc2ff, 0, 3, 1.5); scene.add(W0.rim);
}
// estado del mundo en cada instante: sol, cielo cubierto (nublado), «espacio» (al subir al sol), oscuridad (estudio)
function worldAt(t, o) {
  const u = W0.sky.material.uniforms; u.over.value = o.over; u.space.value = o.space; u.dark.value = o.dark;
  const over = o.over, lit = (1 - over) * (1 - o.dark);
  W0.sunL.intensity = 2.3 * lit; W0.sunL.position.copy(o.focus).addScaledVector(SUN_DIR, 60); W0.sunL.target.position.copy(o.focus); W0.sunL.target.updateMatrixWorld();
  W0.hemi.intensity = lerp(0.58, 0.6, over) * (1 - o.dark * 0.92);
  W0.soft.intensity = 4.6 * over * (1 - o.dark); W0.soft.position.copy(o.focus).addScaledVector(SOFT_DIR, 50); W0.soft.target.position.copy(o.focus); W0.soft.target.updateMatrixWorld();
  RELIEF.uFlat.value = 0.9 * over * (1 - o.dark);
  W0.hemi.color.setRGB(lerp(0.75, 0.86, over), lerp(0.85, 0.88, over), lerp(1.0, 0.9, over));
  W0.sun.visible = W0.halo.visible = over < 0.95 && o.dark < 0.95;
  W0.sun.material.color.setRGB(1, 0.95, 0.82).multiplyScalar(9 * (1 - over) * (1 - o.dark));
  W0.halo.material.opacity = (1 - over) * (1 - o.dark); W0.halo.quaternion.copy(cam.quaternion); W0.sun.quaternion.copy(cam.quaternion);
  W0.glint.material.uniforms.time.value = t; W0.glint.material.uniforms.k.value = lit;
  scene.fog.density = lerp(0.0017, 0.024, over) * (1 - o.space * 0.9); scene.fog.color.copy(W0.fogC).lerp(new THREE.Color(0xc3c8ce), over).multiplyScalar(1 - o.dark);
  W0.ground.visible = W0.near.visible = W0.trees.visible = W0.poles.visible = o.dark < 0.999;
  scene.background.setRGB(0, 0, 0);
}
