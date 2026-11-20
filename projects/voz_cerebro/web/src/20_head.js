// ---------------------------------------------------------------- LA CABEZA DE CRISTAL (lámina 2 de Javi) con el cerebro de luz dentro, la vía que baja hasta la boca y la garganta,
// la lengua, los labios y la laringe (los músculos del habla) y la onda de la palabra que se queda atrapada detrás de los labios.
// Escaneo de cabeza: LeePerrySmith (Infinite-Realities, CC BY 3.0; viene con los ejemplos de three.js). La cara mira a +z; su lado izquierdo es +x.
const HEAD = { s: 1 };
// tubo con pulsos de luz que viajan (u de 0 a 1 a lo largo); «alive» = hasta dónde llega la señal; más allá, la vía apagada (gris y rota)
const PATH_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float time, alive, op, speed; uniform vec3 col; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
#include <logdepthbuf_fragment>
  float u = vUv.x, f = 1. - abs(dot(normalize(vN), normalize(vV)));
  float p = fract(u * 7. - time * speed), pulse = smoothstep(0.0, 0.05, p) * smoothstep(0.22, 0.05, p);
  float on = 1. - smoothstep(alive - 0.015, alive + 0.015, u);
  float broken = step(0.5, fract(u * 40.)) * 0.5;
  vec3 c = col * on * (0.25 + 0.4 * f + 2.6 * pulse) + vec3(0.25, 0.27, 0.32) * (1. - on) * broken * 0.35;
  float a = op * (on * (0.35 + 0.65 * pulse + 0.4 * f) + (1. - on) * broken * 0.35);
  gl_FragColor = vec4(c * op, a);
}`;
const PATH_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`;
function pathMat(col = GOLD) { return new THREE.ShaderMaterial({ vertexShader: PATH_VS, fragmentShader: PATH_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { time: { value: 0 }, alive: { value: 1 }, op: { value: 1 }, speed: { value: 1.2 }, col: { value: col.clone() } } }); }
async function buildHead() { const g = new THREE.Group(), U = g.userData;
  const gl = await new GLTFLoader().loadAsync(ASSET + 'LeePerrySmith.glb'); let mesh = null; gl.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
  const geo = mesh.geometry.clone(); geo.computeBoundingBox(); const bb = geo.boundingBox, sz = bb.getSize(_v()), ctr = bb.getCenter(_v());
  const s = 2.3 / sz.y; geo.translate(-ctr.x, -ctr.y, -ctr.z); geo.scale(s, s, s); HEAD.s = s;
  // el escaneo trae dentro la «bolsa» de la boca y los ojos: se queda solo la piel (la pieza conectada más grande, uniendo vértices repetidos)
  { const P = geo.attributes.position, I = geo.index.array, n = P.count, key = new Map(), weld = new Int32Array(n);
    for (let i = 0; i < n; i++) { const k = Math.round(P.getX(i) * 2000) + ',' + Math.round(P.getY(i) * 2000) + ',' + Math.round(P.getZ(i) * 2000); if (!key.has(k)) key.set(k, i); weld[i] = key.get(k); }
    const par = new Int32Array(n).map((_, i) => i), f = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }, un = (a, b) => { a = f(a); b = f(b); if (a !== b) par[a] = b; };
    for (let i = 0; i < I.length; i += 3) { un(weld[I[i]], weld[I[i + 1]]); un(weld[I[i]], weld[I[i + 2]]); }
    const cnt = new Map(); for (let i = 0; i < I.length; i += 3) { const r = f(weld[I[i]]); cnt.set(r, (cnt.get(r) || 0) + 1); } let big = -1, bn = 0; cnt.forEach((v, k) => { if (v > bn) { bn = v; big = k; } });
    const keep = []; for (let i = 0; i < I.length; i += 3) if (f(weld[I[i]]) === big) keep.push(I[i], I[i + 1], I[i + 2]); geo.setIndex(keep); U.cut = { tris: I.length / 3, kept: keep.length / 3, parts: cnt.size }; }
  geo.computeVertexNormals();
  // la piel de cristal se pinta solo en su cara más cercana: primero su profundidad (sin color) y luego el brillo; así no se ven la nuca ni lo de dentro del escaneo.
  // Lo que va dentro de la cabeza (cerebro, vías, músculos, chips) se pinta ANTES (orden < 5) y se ve a través del cristal.
  const pre = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, transparent: true })); pre.renderOrder = 5; g.add(pre); U.pre = pre;
  U.holo = holoMat(CYAN, 1, { edge: 2.0 }); U.holo.depthFunc = THREE.LessEqualDepth; const h = new THREE.Mesh(geo, U.holo); h.renderOrder = 8; g.add(h); U.mesh = h; U.geo = geo;
  // puntos de referencia de la cara (sacados del escaneo): punta de la nariz, labios, barbilla
  { const p = geo.attributes.position; let nose = null; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i), x = p.getX(i); if (Math.abs(x) < 0.06 && y > -0.4 && (!nose || z > nose.z)) nose = _v().set(x, y, z); }
    let lip = null; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i), x = p.getX(i); if (Math.abs(x) < 0.04 && y < nose.y - 0.2 && y > nose.y - 0.34 && (!lip || z > lip.z)) lip = _v().set(0, y, z); }
    let chin = null; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i), x = p.getX(i); if (Math.abs(x) < 0.04 && y < nose.y - 0.42 && y > nose.y - 0.62 && (!chin || z > chin.z)) chin = _v().set(0, y, z); }
    U.nose = nose; U.lip = lip; U.chin = chin; }
  // el cerebro real (Conte69) dentro de la cabeza: ≈ 1,12 de largo; centrado en (0, 0,56, −0,10)
  const B = await realBrain({ pink: true }); const BS = 0.00655; B.scale.setScalar(BS); B.position.set(0, 0.56 - 15 * BS, -0.1 + 17 * BS); g.add(B); U.brain = B; B.updateMatrixWorld(true);
  // la corteza motora del habla (hemisferio izquierdo, giro precentral ventral; MNI ≈ (−56, −2, 28) → en el modelo (56, 28, −2)): el vértice más cercano y su normal
  // la normal es la media de 15 mm alrededor (la de la superficie «de fuera», no la de la pared de un surco) y el punto es el más saliente a ≤ 9 mm: la cresta del giro
  { const G = await loadBrainGeo(), P = G.lh.attributes.position, Nn = G.lh.attributes.normal, tgt = _v().set(56, 28, -2), d2 = i => (P.getX(i) - tgt.x) ** 2 + (P.getY(i) - tgt.y) ** 2 + (P.getZ(i) - tgt.z) ** 2;
    const avg = _v(); for (let i = 0; i < P.count; i++) { const d = d2(i); if (d < 225) avg.add(_v().set(Nn.getX(i), Nn.getY(i), Nn.getZ(i)).multiplyScalar(1 - Math.sqrt(d) / 15)); } avg.normalize();
    let best = 0, bs = -1e9; for (let i = 0; i < P.count; i++) { const d = d2(i); if (d < 81) { const s = (P.getX(i) - tgt.x) * avg.x + (P.getY(i) - tgt.y) * avg.y + (P.getZ(i) - tgt.z) * avg.z - 0.02 * d; if (s > bs) { bs = s; best = i; } } }
    const lhMesh = B.userData.parts[0]; lhMesh.updateMatrixWorld(true); U.speechL = _v().set(P.getX(best), P.getY(best), P.getZ(best)); U.speechN = avg.clone();
    U.speech = lhMesh.localToWorld(U.speechL.clone()); U.speechNW = U.speechN.clone().transformDirection(lhMesh.matrixWorld); U.lhMesh = lhMesh; }
  for (const m of B.userData.mats) m.uniforms.hot.value.set(U.speech.x, U.speech.y, U.speech.z, 0.09);
  // músculos del habla: lengua, labios y laringe (holograma azul que se apaga)
  const mm = holoMat(new THREE.Color(0.3, 0.85, 1.0), 0, { edge: 1.6, col2: new THREE.Color(0.1, 0.35, 0.6) });
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 20), mm); tongue.scale.set(0.75, 0.38, 1.25); tongue.position.copy(U.lip).add(_v().set(0, 0.0, -0.32)); g.add(tongue);
  const lips = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 12, 40), mm); lips.scale.set(1, 0.45, 1); lips.position.copy(U.lip).add(_v().set(0, 0, -0.02)); g.add(lips);
  const lar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.24, 24, 1, true), mm); lar.position.set(0, U.chin.y - 0.28, U.chin.z - 0.42); lar.rotation.x = 0.25; g.add(lar);
  U.muscles = [tongue, lips, lar]; U.mm = mm; mm.depthTest = false; U.muscles.forEach(m => m.renderOrder = 4);
  // la vía: de la corteza del habla, por el tronco del encéfalo, a la lengua, a los labios y a la laringe
  const stem = B.localToWorld(_v().set(0, -25, -30)), stem2 = B.localToWorld(_v().set(0, -62, -22)), br = _v().set(0, U.chin.y + 0.05, U.chin.z - 0.55);
  const P0 = [U.speech, U.speech.clone().lerp(stem, 0.5).add(_v().set(0.05, 0.05, 0)), stem, stem2, br];
  const routes = [[...P0, tongue.position.clone().add(_v().set(0, -0.02, -0.06))], [...P0, U.lip.clone().add(_v().set(0, -0.05, -0.1)), lips.position.clone()], [...P0, lar.position.clone().add(_v().set(0, 0.1, 0))]];
  U.pm = pathMat(GOLD); U.paths = routes.map(r => { const c = new THREE.CatmullRomCurve3(r, false, 'centripetal'); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 160, 0.011, 8), U.pm); m.renderOrder = 4; g.add(m); return c; }); U.pm.depthTest = false;
  // la palabra que quiere salir: una onda dorada entre la lengua y los labios, y el destello al chocar
  { const N = 220, pos = new Float32Array(N * 3); const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    U.word = new THREE.Points(gg, new THREE.PointsMaterial({ color: new THREE.Color(1, 0.75, 0.3).multiplyScalar(2), size: 0.034, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: starTex0() })); U.word.frustumCulled = false; U.word.renderOrder = 4; U.word.material.depthTest = false; g.add(U.word);
    U.hit = glowSprite(0xff6a4a, 0.5, 0); U.hit.renderOrder = 4; U.hit.position.copy(U.lip).add(_v().set(0, 0, 0.02)); g.add(U.hit); }
  return g; }
// la onda de la palabra: avanza de la lengua a los labios (k de 0 a 1) y se aplasta contra ellos; a = brillo
function wordWave(U, k, a, t) { const p = U.word.geometry.attributes.position, N = p.count, z0 = U.lip.z - 0.36, z1 = U.lip.z - 0.03, front = lerp(z0, z1, Math.min(1, k));
  for (let i = 0; i < N; i++) { const u = i / (N - 1), z = front - u * 0.22, amp = 0.075 * Math.sin(u * Math.PI) * (k > 1 ? Math.max(0, 1 - (k - 1) * 2) : 1); p.setXYZ(i, Math.sin(u * 40 - t * 14) * amp * 0.5, U.lip.y + Math.sin(u * 22 - t * 10) * amp, Math.min(z, z1)); }
  p.needsUpdate = true; U.word.material.opacity = a; }
