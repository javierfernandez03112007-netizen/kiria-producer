// ---------------------------------------------------------------- 24 · DENTRO DE LA FIBRA (decorado micro, prefijo fib). Escala propia: 1 unidad = 10 µm.
// Fibra monomodo «pelada» (sin la funda de plástico de 250 µm): revestimiento de cristal Ø 125 µm (radio 6,25) y núcleo Ø 9 µm (radio 0,45)
// por el que corren los PULSOS (paquetes de bits de luz) y unos rayos que rebotan en zigzag (reflexión total). Al lado, paralelo y en el mismo
// plano vertical (z = 0), un PELO humano castaño de Ø 80 µm (radio 4) con sus escamas de cutícula. Grupo con origen al principio de la fibra,
// la fibra a lo largo de +X (0 … FIB_L). Fondo negro (moodSet('fibra')) y una rejilla de 100 µm muy tenue debajo.
// API: buildFiber() → Group (userData.anchors: fiber, hair, core, fiberTop, hairBottom)
//      fiberAt(t, {speed, hair, pulses, cam}) · speed/hair/pulses 0..1; cam = [x,y,z] de la cámara en el marco local (si no, se toma la de la escena)
//      FIB_CAM(u) → [px,py,pz, lx,ly,lz, fov] en el marco local, u 0..1 (5,9 s: túnel → sale de lado (fibra + pelo) → corre al lado → al núcleo).
const FIB_L = 800, FIB_R = 6.25, FIB_RC = 0.45, FIB_HR = 4, FIB_HY = -(FIB_R + FIB_HR + 4.5), FIB_XS = 226;   // FIB_XS: x del plano medio con el pelo
const FIB_NR = 200, FIB_RS = FIB_L / FIB_NR;                    // anillos de la pared (cada 40 µm)
const FIB_NL = 4 * 66, FIB_LS = 12;                             // marcas de luz (4 por anillo de lámparas, cada 120 µm)
const FIB_NP = 50, FIB_PS = FIB_L / FIB_NP, FIB_BITS = 6;       // paquetes de luz (6 bits cada uno)
const FIB_NZ = 3, FIB_ZH = 30, FIB_ZS = 22, FIB_ZP = 2.6;      // rayos en zigzag: 3 planos × 30 cabezas, 22 trocitos de estela
const FIB_ZPAT = [];
let FIB = null;
const fibTri = x => { const f = x - Math.floor(x); return f < 0.5 ? 4 * f - 1 : 3 - 4 * f; };   // onda triangular −1..1
const fibWrap = x => ((x % FIB_L) + FIB_L) % FIB_L;

const FIB_GLASS_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = -mv.xyz; gl_Position = projectionMatrix * mv;
#include <logdepthbuf_vertex>
}`;
const FIB_GLASS_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 col; uniform float k, rim, spec, inside; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){
#include <logdepthbuf_fragment>
  vec3 n = normalize(vN), v = normalize(vV); float c = abs(dot(n, v)), f = pow(1. - c, 3.);
  if (dot(n, v) < 0.) n = -n;
  vec3 L1 = normalize(vec3(0.35, 0.85, 0.45)), L2 = normalize(vec3(-0.5, -0.3, 0.6));
  float fr = gl_FrontFacing ? 1. : 0.25; float s = fr * pow(max(dot(reflect(-v, n), L1), 0.), 140.) * 1.4 + pow(max(dot(reflect(-v, n), L2), 0.), 30.) * 0.35;
  // dentro: la pared lejana brilla (bruma de luz al fondo del túnel); vetas finas a lo largo, como el cristal estirado
  float vet = 0.5 + 0.5 * sin(atan(vP.z, vP.y) * 18.);
  float dist = length(vV); float far = smoothstep(25., 160., dist) * inside;
  vec3 a = col * (0.03 + rim * f * (1. + 0.4 * vet)) + vec3(0.85, 0.97, 1.) * s * spec + col * far * 0.6;
  gl_FragColor = vec4(a * k, 1.);
}`;

function fibGradTex() { return canvasTex(8, 256, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, '#ffffff'); r.addColorStop(0.12, '#bff6ff'); r.addColorStop(0.5, '#2a7f99'); r.addColorStop(1, '#000000'); g.fillStyle = r; g.fillRect(0, 0, w, h); }); }

// la cutícula del pelo: escamas como tejas (bordes irregulares cada ~6 µm), en color y en relieve
function fibHairTex() {
  const W0 = 512, H0 = 256, rows = 20, R = [];
  for (let j = 0; j < rows; j++) { const pts = []; for (let i = 0; i <= 64; i++) pts.push(j * H0 / rows + 3.2 * Math.sin(i * 0.31 + j * 1.7) + 2.2 * Math.sin(i * 0.9 + j * 4.1) + (hash(j * 77 + i) - 0.5) * 2.2); pts[64] = pts[0]; R.push(pts); }
  const draw = bump => (g, w, h) => {
    g.fillStyle = bump ? '#808080' : '#3e2416'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const x = hash(i * 3.1) * w; g.fillStyle = bump ? `rgba(${hash(i) > 0.5 ? 255 : 0},${hash(i) > 0.5 ? 255 : 0},${hash(i) > 0.5 ? 255 : 0},0.05)` : `rgba(${hash(i) > 0.5 ? '120,80,50' : '30,16,8'},0.18)`; g.fillRect(x, 0, 1 + hash(i * 5) * 3, h); }
    for (let j = 0; j < rows; j++) for (let rep = -1; rep <= 1; rep++) {
      const P = R[j], y0 = rep * h;
      // cada escama: oscura justo bajo el borde (sombra) y clara hacia el borde siguiente (sube la teja)
      const gr = g.createLinearGradient(0, y0 + j * h / rows, 0, y0 + (j + 1) * h / rows);
      if (bump) { gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0.75)'); } else { gr.addColorStop(0, 'rgba(10,4,0,0.35)'); gr.addColorStop(0.8, 'rgba(150,100,62,0.12)'); gr.addColorStop(1, 'rgba(200,150,100,0.3)'); }
      g.fillStyle = gr; g.beginPath(); for (let i = 0; i <= 64; i++) g.lineTo(i * w / 64, y0 + P[i]); const Q = R[(j + 1) % rows]; const dy = j + 1 === rows ? h : 0;
      for (let i = 64; i >= 0; i--) g.lineTo(i * w / 64, y0 + Q[i] + dy); g.closePath(); g.fill();
      g.strokeStyle = bump ? 'rgba(255,255,255,0.9)' : 'rgba(205,160,115,0.55)'; g.lineWidth = 1.4; g.beginPath(); for (let i = 0; i <= 64; i++) g.lineTo(i * w / 64, y0 + P[i] + dy * 0 - 0.8); g.stroke();
    }
  };
  const c = canvasTex(W0, H0, draw(false)), b = canvasTex(W0, H0, draw(true));
  for (const t of [c, b]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, FIB_L / 12); t.anisotropy = 8; }
  c.colorSpace = THREE.SRGBColorSpace; b.colorSpace = THREE.NoColorSpace; return { c, b };
}

function buildFiber() {
  const G = new THREE.Group(); G.name = 'fiber';
  const toX = geo => { geo.rotateZ(-Math.PI / 2); return geo; };     // +Y → +X
  const light = new THREE.Color(COL.light);
  // --- el revestimiento de cristal (brilla en los bordes; por dentro, las paredes del túnel)
  const gm = new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(0x5fd8f0) }, k: { value: 1 }, rim: { value: 1.6 }, spec: { value: 1 }, inside: { value: 0 } },
    vertexShader: FIB_GLASS_VS, fragmentShader: FIB_GLASS_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  const clad = new THREE.Mesh(toX(new THREE.CylinderGeometry(FIB_R, FIB_R, FIB_L, 96, 1, true).translate(0, FIB_L / 2, 0)), gm); clad.renderOrder = 2; G.add(clad);
  // la funda de plástico (250 µm) solo al principio: el tramo que se ve está pelado
  const coat = new THREE.Mesh(toX(new THREE.CylinderGeometry(12.5, 12.5, 40, 64).translate(0, -20, 0)), new THREE.MeshStandardMaterial({ color: 0x1c3a44, roughness: 0.6, emissive: 0x0a2a33, emissiveIntensity: 0.4 }));
  G.add(coat);
  // --- el núcleo: un hilo de luz (desde dentro, todo luz)
  const coreM = new THREE.MeshBasicMaterial({ color: light.clone().multiplyScalar(1.6), toneMapped: false, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const core = new THREE.Mesh(toX(new THREE.CylinderGeometry(FIB_RC, FIB_RC, FIB_L, 24, 1, true).translate(0, FIB_L / 2, 0)), coreM); G.add(core);
  const coreHaloM = new THREE.MeshBasicMaterial({ color: light.clone().multiplyScalar(0.07), toneMapped: false, side: THREE.FrontSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const coreHalo = new THREE.Mesh(toX(new THREE.CylinderGeometry(FIB_RC * 2.4, FIB_RC * 2.4, FIB_L, 24, 1, true).translate(0, FIB_L / 2, 0)), coreHaloM); G.add(coreHalo);
  // --- anillos de la pared y marcas de luz (lámparas del túnel; se alargan en estelas con la velocidad)
  const add = () => new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const ringM = add(); ringM.color.set(0x48c8e0);
  const rings = new THREE.InstancedMesh(toX(new THREE.TorusGeometry(FIB_R - 0.03, 0.035, 4, 96).rotateX(Math.PI / 2)), ringM, FIB_NR); G.add(rings);
  const grad = fibGradTex();
  const lampM = add(); lampM.map = grad;
  const lamps = new THREE.InstancedMesh(toX(new THREE.CylinderGeometry(0.11, 0.11, 1, 8, 1).translate(0, -0.5, 0)), lampM, FIB_NL); G.add(lamps);
  const LC = [0xdff9ff, 0x7fe6ff, 0xffd7a0, 0x7fe6ff];       // una de las cuatro, cálida (como las lámparas del metro)
  for (let i = 0; i < FIB_NL; i++) lamps.setColorAt(i, new THREE.Color(LC[i % 4]).multiplyScalar(i % 4 === 2 ? 2.2 : 2.6));
  // --- los pulsos: paquetes de 6 bits muy brillantes con una estela detrás y un halo
  const bitM = add(); bitM.color.set(0xffffff);
  const bits = new THREE.InstancedMesh(toX(new THREE.CapsuleGeometry(FIB_RC * 0.82, 0.38, 4, 10)), bitM, FIB_NP * FIB_BITS); G.add(bits);
  const BITS = [];
  for (let p = 0; p < FIB_NP; p++) for (let b = 0; b < FIB_BITS; b++) BITS.push(b === 0 || hash(p * 13.7 + b * 3.3) > 0.42 ? 1 : 0);
  const tailM = add(); tailM.map = grad;
  const tails = new THREE.InstancedMesh(toX(new THREE.CylinderGeometry(FIB_RC * 0.95, FIB_RC * 0.5, 1, 12, 1, true).translate(0, -0.5, 0)), tailM, FIB_NP); G.add(tails);
  const halos = [], haloM = new THREE.SpriteMaterial({ map: starTex0(), color: 0x9ff3ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  for (let p = 0; p < FIB_NP; p++) { const s = new THREE.Sprite(haloM); G.add(s); halos.push(s); }
  // --- rayos en zigzag dentro del núcleo (la luz rebota en la pared del núcleo: reflexión total)
  const zigM = add(); zigM.color.set(0xffffff);
  const zig = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.045, 0.045), zigM, FIB_NZ * FIB_ZH * FIB_ZS); G.add(zig);
  for (let i = 0; i < FIB_NZ * FIB_ZH * FIB_ZS; i++) { const j = i % FIB_ZS, f = 1 - j / FIB_ZS; zig.setColorAt(i, new THREE.Color(0x8fefff).multiplyScalar(2.2 * f * f + 0.04)); }
  // --- motas alrededor (polvo de luz fuera del cristal): con la cámara corriendo al lado, son estelas que pasan
  const moteM = add(); moteM.map = grad; moteM.color.set(0x9fe9ff);
  const motes = new THREE.InstancedMesh(toX(new THREE.CylinderGeometry(0.07, 0.07, 1, 6, 1, true).translate(0, -0.5, 0)), moteM, 500); G.add(motes);
  const MOTES = []; for (let i = 0; i < 500; i++) { const a = hash(i * 1.37) * Math.PI * 2, r = FIB_R + 3 + hash(i * 2.71) * 34; MOTES.push([hash(i * 5.3) * FIB_L, Math.cos(a) * r * 0.8 - 4, Math.sin(a) * r, 0.5 + hash(i * 9.1)]); }
  // --- el pelo: castaño oscuro, un poco elíptico e irregular, con escamas
  const hg = new THREE.CylinderGeometry(FIB_HR, FIB_HR, FIB_L, 72, 240, true), hp = hg.attributes.position;
  for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i), a = Math.atan2(z, x), yy = y + FIB_L / 2;
    const k = 1 + 0.035 * Math.sin(yy * 0.045) + 0.02 * Math.sin(yy * 0.13 + 1) + 0.05 * Math.cos(2 * a);       // sección ovalada y grosor que varía
    hp.setX(i, x * k); hp.setZ(i, z * k * 0.97); }
  hg.translate(0, FIB_L / 2, 0); hg.computeVertexNormals(); toX(hg);
  const HT = fibHairTex();
  const hairM = new THREE.MeshPhysicalMaterial({ color: 0x86705f, map: HT.c, bumpMap: HT.b, bumpScale: 2.2, roughness: 0.42, metalness: 0, sheen: 0.7, sheenColor: new THREE.Color(0x9a6a44), sheenRoughness: 0.4, clearcoat: 0.35, clearcoatRoughness: 0.3, transparent: true });
  const hair = new THREE.Mesh(hg, hairM); hair.position.y = FIB_HY; G.add(hair);
  // --- rejilla de micras debajo (líneas cada 100 µm), muy tenue
  const gt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,200,230,0.55)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,200,230,0.18)'; g.lineWidth = 1; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(i * w / 5, 0); g.lineTo(i * w / 5, h); g.moveTo(0, i * h / 5); g.lineTo(w, i * h / 5); g.stroke(); } });
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(FIB_L / 50 + 4, 6); gt.anisotropy = 8;
  const gridM = new THREE.MeshBasicMaterial({ map: gt, color: 0x2a5a66, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(FIB_L + 200, 300).rotateX(-Math.PI / 2), gridM); grid.position.set(FIB_L / 2, FIB_HY - FIB_HR - 9, 0); G.add(grid);
  // --- luces: una cálida delante-arriba (el pelo se ve castaño) y una cian al otro lado (perfil); siguen a la cámara en x
  const warm = new THREE.PointLight(0xfff0e2, 2.6, 0, 0), cool = new THREE.PointLight(0x7fe6ff, 1.4, 0, 0); G.add(warm, cool);
  G.userData.anchors = { fiber: v3(FIB_XS, 0, FIB_R), fiberTop: v3(FIB_XS, FIB_R, 0), core: v3(FIB_XS, 0, 0), hair: v3(FIB_XS, FIB_HY, FIB_HR), hairBottom: v3(FIB_XS, FIB_HY - FIB_HR, 0) };
  FIB = { G, gm, coreM, coreHaloM, rings, ringM, lamps, lampM, bits, bitM, BITS, tails, halos, haloM, zig, hair, hairM, grid, motes, moteM, MOTES, gridM, warm, cool };
  fiberAt(0, {});
  return G;
}

function fiberAt(t, o = {}) {
  const F = FIB; if (!F) return;
  const speed = o.speed ?? 1, hk = clamp(o.hair ?? 0), pk = clamp(o.pulses ?? 1);
  let cp = o.cam ? v3(o.cam[0], o.cam[1], o.cam[2]) : F.G.worldToLocal(cam.position.clone());
  const rad = Math.hypot(cp.y, cp.z), inside = 1 - ss(clamp((rad - FIB_R + 0.6) / 2.2));   // 1 dentro del cristal
  const cx = clamp(cp.x, 0, FIB_L), coreIn = 1 - ss(clamp((rad - FIB_RC) / 0.8));   // dentro del núcleo: destello
  // desplazamientos (sin estado: se pueden pedir fotogramas en cualquier orden; cambia speed despacio)
  const vM = 18 + 70 * speed, vP = 60 + 170 * speed;       // marcas que corren hacia atrás · pulsos hacia delante (adelantan a la cámara)
  const sM = t * vM, sP = t * vP;
  // cristal
  F.gm.uniforms.inside.value = inside; F.gm.uniforms.rim.value = lerp(0.55, 0.22, inside); F.gm.uniforms.spec.value = lerp(0.8, 0.25, inside); F.gm.uniforms.k.value = 1;
  F.coreM.color.set(COL.light).multiplyScalar(lerp(0.75, 0.22, inside) + 0.2 * pk + 2.5 * coreIn);
  // anillos (dentro se ven bien; fuera, apenas)
  F.ringM.color.set(0x48c8e0).multiplyScalar(lerp(0.08, 1.1, inside));
  for (let i = 0; i < FIB_NR; i++) { _o.position.set(fibWrap(i * FIB_RS - sM), 0, 0); _o.rotation.set(0, 0, 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); F.rings.setMatrixAt(i, _o.matrix); }
  F.rings.instanceMatrix.needsUpdate = true;
  // lámparas en la pared: 4 por fila (arriba-izq., arriba-der., abajo…), estelas con la velocidad
  const lLen = 0.35 + 7 * speed * speed;
  F.lampM.color.setScalar(lerp(0.08, 1, inside));
  for (let i = 0; i < FIB_NL; i++) { const row = Math.floor(i / 4), a = [0.7, 2.44, -0.75, 3.95][i % 4];
    _o.position.set(fibWrap(row * FIB_LS + (i % 4) * 3 - sM), Math.cos(a) * (FIB_R - 0.14), Math.sin(a) * (FIB_R - 0.14)); _o.rotation.set(0, 0, 0); _o.scale.set(lLen, 1, 1); _o.updateMatrix(); F.lamps.setMatrixAt(i, _o.matrix); }
  F.lamps.instanceMatrix.needsUpdate = true;
  // pulsos
  const tLen = 3 + 26 * speed * speed;
  for (let p = 0; p < FIB_NP; p++) {
    const x0 = fibWrap(p * FIB_PS + hash(p * 7.7) * 5 + sP), on = pk > 0.01;
    for (let b = 0; b < FIB_BITS; b++) { const i = p * FIB_BITS + b, s = on && F.BITS[i] ? 1 : 0.0001;
      _o.position.set(x0 - b * 0.95, 0, 0); _o.rotation.set(0, 0, 0); _o.scale.set(s, s * pk + 0.0001, s * pk + 0.0001); _o.updateMatrix(); F.bits.setMatrixAt(i, _o.matrix); }
    _o.position.set(x0 - (FIB_BITS - 1) * 0.95 - 0.3, 0, 0); _o.scale.set(on ? tLen : 0.0001, pk + 0.0001, pk + 0.0001); _o.updateMatrix(); F.tails.setMatrixAt(p, _o.matrix);
    const h = F.halos[p]; h.position.set(x0 - 2.4, 0, 0); h.scale.set(5 * pk + 0.001, 2.6 * pk + 0.001, 1); h.visible = on;
  }
  F.bitM.color.set(0xeafdff).multiplyScalar(5.5); F.tailM = F.tails.material; F.tailM.color.set(COL.light).multiplyScalar(1.4 * pk);
  F.haloM.opacity = 0.55 * pk;
  F.bits.instanceMatrix.needsUpdate = true; F.tails.instanceMatrix.needsUpdate = true;
  // rayos en zigzag: el camino es fijo en la fibra; la luz avanza por él dejando estela
  const ds = 0.32, vZ = 50 + 120 * speed;
  for (let z = 0; z < FIB_NZ; z++) { const az = z * Math.PI / FIB_NZ + 0.4, ca = Math.cos(az), sa = Math.sin(az), ph = z * 0.37;
    const P = x => v3(x, ca * FIB_RC * 0.92 * fibTri(x / FIB_ZP + ph), sa * FIB_RC * 0.92 * fibTri(x / FIB_ZP + ph));
    for (let hI = 0; hI < FIB_ZH; hI++) { const xh = fibWrap(hI * (FIB_L / FIB_ZH) + z * 9 + t * vZ);
      for (let j = 0; j < FIB_ZS; j++) { const i = (z * FIB_ZH + hI) * FIB_ZS + j, a = P(xh - j * ds), b = P(xh - j * ds + ds), d = b.clone().sub(a), L = d.length();
        _o.position.copy(a).add(b).multiplyScalar(0.5); _o.quaternion.setFromUnitVectors(v3(1, 0, 0), d.normalize()); const w = pk > 0.01 ? 1 : 0.0001; _o.scale.set(L * 1.15, w, w); _o.updateMatrix(); F.zig.setMatrixAt(i, _o.matrix); } } }
  F.zig.instanceMatrix.needsUpdate = true; F.zig.material.opacity = pk;
  // motas: fijas en el espacio + un poco de deriva; se alargan con la velocidad
  const mLen = 0.2 + 9 * speed * speed; F.moteM.color.set(0x9fe9ff).multiplyScalar(0.9 * (1 - inside) + 0.05);
  for (let i = 0; i < 500; i++) { const m = F.MOTES[i]; _o.position.set(fibWrap(m[0] - sM * 0.3), m[1], m[2]); _o.quaternion.identity(); _o.scale.set(mLen * m[3], m[3], m[3]); _o.updateMatrix(); F.motes.setMatrixAt(i, _o.matrix); }
  F.motes.instanceMatrix.needsUpdate = true;
  // pelo: aparece subiendo un poco y haciéndose opaco
  F.hair.visible = hk > 0.003; F.hairM.opacity = ss(hk); F.hairM.transparent = hk < 0.999; F.hairM.depthWrite = hk > 0.5; F.hair.position.y = FIB_HY - (1 - ss(hk)) * 6;
  F.gridM.opacity = lerp(0.35, 0.8, 1 - inside);
  // luces junto a la cámara
  F.warm.position.set(cx + 10, 22, 30); F.cool.position.set(cx + 25, FIB_HY - 6, -26);
  F.warm.intensity = 2.6 * (0.3 + 0.7 * hk); F.cool.intensity = 1.4 * (0.3 + 0.7 * hk);
}

// cámara (marco local), u 0..1 en 5,9 s: 0–0,3 túnel · 0,3–0,55 sale de lado: fibra + pelo · 0,55–0,95 corre al lado · 0,95–1 al núcleo
const FIB_KEYS = [
  [0.00, [16, 0, 0], [60, 0, 0], 86],                     // dentro del núcleo: todo luz
  [0.06, [36, 2.4, 0.4], [80, 0.2, 0], 76],
  [0.18, [110, 2.9, 0.9], [155, 0, -0.4], 72],
  [0.30, [175, 2.9, 1.4], [220, -0.2, -0.6], 70],
  [0.37, [192, 4, 14], [222, -4, 0], 50],               // atraviesa la pared del cristal
  [0.45, [FIB_XS - 52, 15, 56], [FIB_XS, -7, 0], 34],    // plano medio: fibra arriba, pelo abajo («fino como un pelo»)
  [0.55, [FIB_XS - 36, 13, 50], [FIB_XS + 14, -6.6, 0], 36],
  [0.66, [272, 6, 32], [322, -6, 0], 44],
  [0.82, [345, 0.5, 25], [396, -5, 0], 50],
  [0.93, [398, 0.8, 9], [442, -0.8, 0], 62],
  [1.00, [430, 0, 0], [480, 0, 0], 88],                   // otra vez en el núcleo: todo luz
];
function FIB_CAM(u) { const c = camKeys(clamp(u), FIB_KEYS); return [c.p.x, c.p.y, c.p.z, c.l.x, c.l.y, c.l.z, c.f]; }
