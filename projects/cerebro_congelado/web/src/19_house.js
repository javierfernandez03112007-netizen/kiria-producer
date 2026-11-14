// ---------------------------------------------------------------- Springfield (Javi, 14-11, con la imagen de la casa): la casa de los Simpson en versión real —estuco
// melocotón, tejado marrón de tejas asfálticas con el canto gris, la chimenea a la izquierda con ladrillos a la vista, los dos miradores con su toldo de lona,
// la puerta rosa en arco, las ventanas de arriba, el ala de la derecha y el garaje con su puerta blanca—, el jardín, el camino, la acera, la calle, los dos
// coches (el rosa y la ranchera naranja), los árboles, las vallas, la casa del vecino, el buzón, la antena y el cielo con nubes.
// Se construye en decímetros reales con la puerta en el origen y la fachada en z = 0; luego se escala (HSC) para que la puerta mida unas 1,35 veces lo que
// Homer, que está de pie delante de la puerta (cabeza en el origen del mundo, pies en y = GY).
const GY = -13.6, HSC = 0.86, HZ = -6.5;
const SUN_DIR = new THREE.Vector3(-0.42, 0.78, 0.62).normalize();
// textura que se repite (canvas)
function tex2(w, h, draw, srgb = true) { const t = canvasTex(w, h, draw); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (!srgb) t.colorSpace = THREE.NoColorSpace; return t; }
// motas sin costuras (cada una se dibuja también en las copias de los bordes)
function speckle(g, w, h, n, cols, r0, r1, seed = 1) {
  for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; const r = r0 + hash(i * 1.7 + seed) * (r1 - r0), x = hash(i * 3.1 + seed * 7) * w, y = hash(i * 5.3 + seed * 3) * h;
    for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) { if ((ox && Math.abs(x + ox - w / 2) > w / 2 + r) || (oy && Math.abs(y + oy - h / 2) > h / 2 + r)) continue; g.beginPath(); g.arc(x + ox, y + oy, r, 0, 7); g.fill(); } }
}
function blotches(g, w, h, n, cols, r0, r1, a, seed = 1) {
  for (let i = 0; i < n; i++) { const x = hash(i * 9.1 + seed) * w, y = hash(i * 4.7 + seed) * h, r = r0 + hash(i * 2.3 + seed) * (r1 - r0), c = cols[i % cols.length];
    for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, 2 * r, 2 * r); } }
}
// coordenadas de textura a escala real (s = decímetros que cubre la textura): cada cara se proyecta según su normal
function boxUV(geo, s, swap = false) {
  if (geo.index) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  const P = geo.attributes.position, N = geo.attributes.normal, uv = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) { const nx = Math.abs(N.getX(i)), ny = Math.abs(N.getY(i)), nz = Math.abs(N.getZ(i)), x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (ny >= nx && ny >= nz) { uv[i * 2] = (swap ? z : x) / s; uv[i * 2 + 1] = (swap ? x : z) / s; } else if (nx >= nz) { uv[i * 2] = z / s; uv[i * 2 + 1] = y / s; } else { uv[i * 2] = x / s; uv[i * 2 + 1] = y / s; } }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
}
// pared con huecos (rectángulos o arcos) en su plano (u, v), extruida th hacia +z
function wallGeo(u0, u1, v0, v1, holes, th) {
  const s = new THREE.Shape(); s.moveTo(u0, v0); s.lineTo(u1, v0); s.lineTo(u1, v1); s.lineTo(u0, v1); s.closePath();
  for (const H of holes) s.holes.push(H.a ? archPath(H.u, H.v, H.w, H.h) : rectPath(H.u, H.v, H.w, H.h));
  return new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false, curveSegments: 28 });
}
function rectPath(u, v, w, h, P = new THREE.Path()) { P.moveTo(u - w / 2, v); P.lineTo(u + w / 2, v); P.lineTo(u + w / 2, v + h); P.lineTo(u - w / 2, v + h); P.closePath(); return P; }
function archPath(u, v, w, h, P = new THREE.Path()) { const r = w / 2; P.moveTo(u - r, v); P.lineTo(u + r, v); P.lineTo(u + r, v + h - r); P.absarc(u, v + h - r, r, 0, Math.PI, false); P.closePath(); return P; }
function triGeo(u0, u1, v0, um, v1, th, holes = []) { const s = new THREE.Shape(); s.moveTo(u0, v0); s.lineTo(u1, v0); s.lineTo(um, v1); s.closePath(); for (const H of holes) s.holes.push(rectPath(H.u, H.v, H.w, H.h)); return new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false }); }
// caja que se estrecha (abajo w0 × d0, arriba w1 × d1)
function frustumGeo(w0, d0, w1, d1, h) { const g = new THREE.BoxGeometry(1, h, 1), P = g.attributes.position; for (let i = 0; i < P.count; i++) { const top = P.getY(i) > 0; P.setX(i, P.getX(i) * (top ? w1 : w0)); P.setZ(i, P.getZ(i) * (top ? d1 : d0)); } g.computeVertexNormals(); return g; }

const HMAT = {};
function houseMats() {
  const M = HMAT;
  const stC = tex2(512, 512, (g, w, h) => { g.fillStyle = '#dea781'; g.fillRect(0, 0, w, h); blotches(g, w, h, 34, ['255,228,200', '160,100,62'], 30, 110, 0.08);
    speckle(g, w, h, 7000, ['rgba(255,236,214,.16)', 'rgba(140,86,52,.12)'], 0.5, 1.5); });
  const stB = tex2(512, 512, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); speckle(g, w, h, 16000, ['rgba(255,255,255,.22)', 'rgba(0,0,0,.24)'], 0.5, 1.7, 3); }, false);
  M.stucco = new THREE.MeshStandardMaterial({ map: stC, bumpMap: stB, bumpScale: 0.9, roughness: 0.93 });
  // tejas asfálticas: filas al tresbolillo, con su sombra y el grano
  const shingle = (bump) => tex2(512, 512, (g, w, h) => { const rows = 16, rh = h / rows; g.fillStyle = bump ? '#7a7a7a' : '#5e4130'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) { const tw = w / 8, off = (r % 2) * tw / 2;
      for (let k = -1; k < 9; k++) { const x = k * tw + off + (hash(r * 13 + k) - 0.5) * 6, c = hash(r * 7.3 + k * 1.9);
        g.fillStyle = bump ? `rgb(${150 + c * 40 | 0},${150 + c * 40 | 0},${150 + c * 40 | 0})` : `rgb(${92 + c * 34 | 0},${62 + c * 22 | 0},${42 + c * 16 | 0})`;
        g.fillRect(x + 1, r * rh + 1, tw - 2, rh - 1); }
      const gr = g.createLinearGradient(0, r * rh + rh * 0.62, 0, r * rh + rh); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, bump ? 'rgba(0,0,0,.55)' : 'rgba(20,10,4,.45)'); g.fillStyle = gr; g.fillRect(0, r * rh, w, rh); }
    speckle(g, w, h, 9000, bump ? ['rgba(255,255,255,.25)', 'rgba(0,0,0,.25)'] : ['rgba(170,130,96,.25)', 'rgba(30,18,10,.25)'], 0.4, 1.2, 5); }, !bump);
  M.roof = new THREE.MeshStandardMaterial({ map: shingle(false), bumpMap: shingle(true), bumpScale: 2.2, roughness: 0.88 });
  M.trim = new THREE.MeshStandardMaterial({ color: 0x7d8486, roughness: 0.6 });
  M.trimD = new THREE.MeshStandardMaterial({ color: 0x6f4630, roughness: 0.55 });          // marcos marrones
  M.frame = new THREE.MeshStandardMaterial({ color: 0x6a4431, roughness: 0.5 });
  M.white = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.6 });
  const brick = tex2(256, 256, (g, w, h) => { g.fillStyle = '#c9b8a6'; g.fillRect(0, 0, w, h); const bh = h / 8, bw = w / 3.5;
    for (let r = 0; r < 8; r++) for (let k = -1; k < 5; k++) { const c = hash(r * 5 + k * 3.3); g.fillStyle = `rgb(${150 + c * 40 | 0},${58 + c * 20 | 0},${40 + c * 14 | 0})`; g.fillRect(k * bw + (r % 2) * bw / 2 + 2, r * bh + 2, bw - 4, bh - 4); }
    speckle(g, w, h, 1500, ['rgba(0,0,0,.18)', 'rgba(255,220,200,.12)'], 0.5, 1.4, 9); });
  M.brick = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.85, bumpMap: brick, bumpScale: 1.4 });
  const conc = (joint) => tex2(512, 512, (g, w, h) => { g.fillStyle = '#b8b4ab'; g.fillRect(0, 0, w, h); blotches(g, w, h, 20, ['90,88,80', '230,228,220'], 20, 80, 0.07, 4); speckle(g, w, h, 9000, ['rgba(70,66,60,.22)', 'rgba(250,250,245,.2)'], 0.4, 1.3, 7);
    if (joint) { g.fillStyle = 'rgba(60,56,50,.55)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); } });
  M.conc = new THREE.MeshStandardMaterial({ map: conc(false), roughness: 0.9 }); M.concJ = new THREE.MeshStandardMaterial({ map: conc(true), roughness: 0.9 });
  const asph = tex2(512, 512, (g, w, h) => { g.fillStyle = '#3a3c3f'; g.fillRect(0, 0, w, h); blotches(g, w, h, 26, ['20,20,22', '90,90,92'], 30, 120, 0.12, 2); speckle(g, w, h, 16000, ['rgba(150,150,150,.3)', 'rgba(10,10,10,.3)'], 0.4, 1.2, 11); });
  M.asph = new THREE.MeshStandardMaterial({ map: asph, roughness: 0.95 });
  // césped: briznas en muchos verdes (y, encima, manchas grandes de otro verde por el shader)
  const grass = tex2(1024, 1024, (g, w, h) => { g.fillStyle = '#3f6e22'; g.fillRect(0, 0, w, h); g.lineCap = 'round';
    for (let i = 0; i < 26000; i++) { const x = hash(i * 1.37) * w, y = hash(i * 2.91) * h, l = 4 + hash(i * 5.1) * 9, a = -1.57 + (hash(i * 7.7) - 0.5) * 1.1, c = hash(i * 3.3);
      g.strokeStyle = `rgba(${40 + c * 70 | 0},${85 + c * 75 | 0},${18 + c * 30 | 0},.85)`; g.lineWidth = 1 + hash(i * 9.9) * 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } });
  grass.anisotropy = 8;
  M.grass = new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 });
  M.grass.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vGW; float gH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(gH(i), gH(i + vec2(1, 0)), f.x), mix(gH(i + vec2(0, 1)), gH(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{ vec2 q = vGW.xz; float m = gN(q / 260.) * 0.6 + gN(q / 90.) * 0.4; diffuseColor.rgb *= mix(vec3(0.82, 0.86, 0.7), vec3(1.12, 1.1, 0.95), m); }`); };
  M.wood = new THREE.MeshStandardMaterial({ color: 0x8b4b31, roughness: 0.75 });
  M.woodL = new THREE.MeshStandardMaterial({ map: tex2(256, 256, (g, w, h) => { g.fillStyle = '#a77b52'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '70,44,24' : '200,160,120'},.18)`; g.fillRect(hash(i * 3.1) * w, 0, 1 + hash(i * 1.7) * 2, h); } g.fillStyle = 'rgba(40,24,12,.6)'; g.fillRect(0, 0, 3, h); }), roughness: 0.8 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0x24363d, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.62, envMapIntensity: 1.8, depthWrite: false });
  M.curtain = new THREE.MeshStandardMaterial({ map: tex2(256, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (let i = 0; i <= 16; i++) gr.addColorStop(i / 16, i % 2 ? '#d9d2c2' : '#f4efe4'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), roughness: 0.9 });
  M.fabric = new THREE.MeshStandardMaterial({ map: tex2(512, 64, (g, w, h) => { for (let i = 0; i < 16; i++) { const gr = g.createLinearGradient(i * w / 16, 0, (i + 1) * w / 16, 0); gr.addColorStop(0, '#5e3420'); gr.addColorStop(0.5, '#8a5232'); gr.addColorStop(1, '#5e3420'); g.fillStyle = gr; g.fillRect(i * w / 16, 0, w / 16, h); } speckle(g, w, h, 1500, ['rgba(0,0,0,.15)', 'rgba(255,220,180,.08)'], 0.4, 1, 13); }), roughness: 0.85, side: THREE.DoubleSide });
  M.door = new THREE.MeshStandardMaterial({ map: canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#d27c6a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,30,20,.5)'; g.lineWidth = 3;
    for (const [x, y, ww, hh] of [[14, 70, 42, 90], [72, 70, 42, 90], [14, 175, 42, 66], [72, 175, 42, 66]]) { g.strokeRect(x, y, ww, hh); g.strokeStyle = 'rgba(255,200,180,.35)'; g.strokeRect(x + 3, y + 3, ww - 6, hh - 6); g.strokeStyle = 'rgba(90,30,20,.5)'; }
    speckle(g, w, h, 800, ['rgba(0,0,0,.06)', 'rgba(255,255,255,.06)'], 0.5, 1.2, 17); }), roughness: 0.45 });
  M.gdoor = new THREE.MeshStandardMaterial({ map: canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#ece5d6'; g.fillRect(0, 0, w, h); for (let r = 1; r < 4; r++) { g.fillStyle = 'rgba(80,70,55,.45)'; g.fillRect(0, r * h / 4 - 2, w, 3); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(0, r * h / 4 + 1, w, 2); }
    for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { g.strokeStyle = 'rgba(120,108,90,.28)'; g.lineWidth = 2; g.strokeRect(k * w / 6 + 8, r * h / 4 + 10, w / 6 - 16, h / 4 - 20); } }), roughness: 0.5 });
  M.metal = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 1, roughness: 0.35 });
  M.brass = new THREE.MeshStandardMaterial({ color: 0xd9b25e, metalness: 1, roughness: 0.25 });
  M.bark = new THREE.MeshStandardMaterial({ map: tex2(256, 256, (g, w, h) => { g.fillStyle = '#4b3b2c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '20,14,8' : '120,104,86'},.35)`; g.fillRect(hash(i * 3.1) * w, hash(i * 5.7) * h, 1 + hash(i * 1.3) * 3, 10 + hash(i * 2.9) * 50); } }), roughness: 0.95 });
  const leafB = tex2(256, 256, (g, w, h) => { g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { const x = hash(i * 1.9) * w, y = hash(i * 3.7) * h, a = hash(i * 7.1) * 6.28, c = 90 + hash(i * 5.5) * 165 | 0;
    g.fillStyle = `rgb(${c},${c},${c})`; g.beginPath(); g.ellipse(x, y, 7, 3.4, a, 0, 7); g.fill(); } }, false);
  M.leaf = new THREE.MeshStandardMaterial({ color: 0xffffff, bumpMap: leafB, bumpScale: 6, roughness: 0.82 });
  M.conifer = new THREE.MeshStandardMaterial({ color: 0x1f4a2a, bumpMap: leafB, bumpScale: 5, roughness: 0.85 });
}

// ---------- piezas
function hMesh(G, geo, m, s = 40, o = {}) { geo = boxUV(geo, s, o.swap); const me = new THREE.Mesh(geo, m); me.castShadow = o.cast !== false; me.receiveShadow = true; G.add(me); return me; }
function hBox(G, x0, y0, z0, x1, y1, z1, m, s = 40, o = {}) { return hMesh(G, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), m, s, o); }
// ventana: marco marrón, parteluz, cristal y visillos; f = 'z' (en una pared que mira a +z) o 'x-' (pared que mira a −x)
function hWindow(G, cx, cy, w, h, face = 'z', o = {}) {
  const M = HMAT, g = new THREE.Group(); G.add(g); g.position.set(cx, cy, 0);
  if (face === 'z') g.position.z = o.z ?? 0; else { g.position.x = o.x ?? 0; g.position.z = cx; g.position.y = cy; g.rotation.y = face === 'x-' ? -Math.PI / 2 : Math.PI / 2; }
  const fr = new THREE.Shape(); fr.moveTo(-w / 2 - 1, -h / 2 - 1); fr.lineTo(w / 2 + 1, -h / 2 - 1); fr.lineTo(w / 2 + 1, h / 2 + 1); fr.lineTo(-w / 2 - 1, h / 2 + 1); fr.closePath(); fr.holes.push(rectPath(0, -h / 2, w, h));
  const fm = new THREE.Mesh(new THREE.ExtrudeGeometry(fr, { depth: 1.4, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.2, bevelSegments: 1 }), M.frame); fm.position.z = -0.6; fm.castShadow = true; g.add(fm);
  const mul = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.9), M.frame); mul.position.z = -0.9; g.add(mul);
  const mh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, 0.8), M.frame); mh.position.set(0, h * 0.18, -0.9); g.add(mh);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.glass); gl.position.z = -1.2; gl.renderOrder = 2; g.add(gl);
  const cu = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.42, h * 0.95), M.curtain); for (const s of [-1, 1]) { const c = cu.clone(); c.position.set(s * w * 0.3, 0, -3.2); g.add(c); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0x2c2620, roughness: 1 })); back.position.z = -6; g.add(back);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 3.4, 1.0, 2.6), M.trim); sill.position.set(0, -h / 2 - 1.4, 0.6); sill.castShadow = true; g.add(sill);
  return g;
}

// ---------- la casa
function buildHouse() {
  houseMats(); const M = HMAT, G = new THREE.Group(); G.scale.setScalar(HSC); G.position.set(0, GY, HZ);
  const tp = Math.tan(28 * Math.PI / 180), cp = Math.cos(28 * Math.PI / 180), P = 28 * Math.PI / 180, TH = 3;
  const XL = -52, XR = 50, ZB = -80, EH = 56, RY = EH + 40 * tp;
  // fachada con la puerta en arco y las dos ventanas de arriba
  const holes = [{ a: 1, u: 0, v: 1.6, w: 11, h: 22.5 }, { u: -27, v: 34, w: 20, h: 14 }, { u: 25, v: 34, w: 20, h: 14 }];
  hMesh(G, wallGeo(XL, XR, 0, EH, holes, TH).translate(0, 0, -TH), M.stucco);
  // pared izquierda (con dos ventanas), derecha y trasera
  hMesh(G, wallGeo(ZB, 0, 0, EH, [{ u: -50, v: 34, w: 16, h: 14 }, { u: -50, v: 9, w: 16, h: 14 }], TH).rotateY(-Math.PI / 2).translate(XL + TH, 0, 0), M.stucco);
  hMesh(G, wallGeo(0, -ZB, 0, EH, [], TH).rotateY(Math.PI / 2).translate(XR - TH, 0, 0), M.stucco);
  hMesh(G, wallGeo(-XR, -XL, 0, EH, [], TH).rotateY(Math.PI).translate(0, 0, ZB + TH), M.stucco);
  // hastiales (triángulos de los lados)
  hMesh(G, triGeo(ZB, 0, EH, ZB / 2, RY, TH).rotateY(-Math.PI / 2).translate(XL + TH, 0, 0), M.stucco);
  hMesh(G, triGeo(0, -ZB, EH, -ZB / 2, RY, TH).rotateY(Math.PI / 2).translate(XR - TH, 0, 0), M.stucco);
  // suelo/techo interior (para que por las ventanas no se vea el cielo)
  hBox(G, XL + TH, 27, ZB + TH, XR - TH, 28, -TH, M.white, 40, { cast: false });
  // tejado a dos aguas: faldones, cumbrera, canto gris (frente y lados) y alero
  const ZR = ZB / 2, OV = 7, SL = (40 + OV) / cp, XC = (XL + XR) / 2, RW = XR - XL + 10;
  for (const s of [1, -1]) { const zc = ZR + s * (40 + OV) / 2, yc = EH + ((40 + OV) / 2 - OV) * tp + 1.4 / cp + 0.2;
    hMesh(G, new THREE.BoxGeometry(RW, 2.8, SL).rotateX(s * P).translate(XC, yc, zc), M.roof, 24);
    const ye = EH - OV * tp;      // altura del alero
    hBox(G, XC - RW / 2 - 0.6, ye - 3.4, s > 0 ? OV - 0.4 : ZB - OV - 1.0, XC + RW / 2 + 0.6, ye + 1.6, s > 0 ? OV + 1.0 : ZB - OV + 0.4, M.trim);
    hBox(G, XC - RW / 2, ye - 2.6, s > 0 ? 0 : ZB - OV, XC + RW / 2, ye - 1.8, s > 0 ? OV : ZB, M.trim, 40, { cast: false });
    for (const xx of [XC - RW / 2 - 0.2, XC + RW / 2 + 0.2]) hMesh(G, new THREE.BoxGeometry(1.4, 4.4, SL + 0.6).rotateX(s * P).translate(xx, yc - 1.2, zc), M.trim); }
  hBox(G, XC - RW / 2, RY + 2.6, ZR - 2.2, XC + RW / 2, RY + 4.0, ZR + 2.2, M.roof, 24);
  // la chimenea (por fuera de la pared izquierda, cerca del frente): base ancha, hombro inclinado, tiro y remate; ladrillos a la vista
  { const cz = -22, X0 = XL - 11;
    hBox(G, X0, 0, cz - 8, XL, 34, cz + 8, M.stucco);
    hMesh(G, frustumGeo(11, 16, 8, 9, 6).translate(XL - 5.5, 37, cz), M.stucco);
    hBox(G, XL - 9.5, 40, cz - 4.5, XL - 1.5, RY + 10, cz + 4.5, M.stucco);
    hBox(G, XL - 10.4, RY + 10, cz - 5.4, XL - 0.6, RY + 12, cz + 5.4, M.trim);
    hBox(G, XL - 7.5, RY + 12, cz - 2.6, XL - 3.5, RY + 13, cz + 2.6, new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 1 }));
    for (const [y, z, w, h] of [[8, cz + 8.05, 5, 3.2], [20, cz + 8.05, 4, 2.4], [48, cz + 4.55, 3.5, 2.6], [62, cz + 4.55, 4, 2.2]]) hBox(G, (y < 34 ? X0 + 2 : XL - 8) , y, z - 0.01, (y < 34 ? X0 + 2 : XL - 8) + w, y + h, z + 0.35, M.brick, 6);
    for (const [y, z, h] of [[14, cz - 3, 3], [26, cz + 2, 2.4], [55, cz - 1, 2.6]]) hBox(G, (y < 34 ? X0 : XL - 9.5) - 0.35, y, z, (y < 34 ? X0 : XL - 9.5) + 0.01, y + h, z + 4.5, M.brick, 6); }
  // la antena de la tele (en el tejado, a la izquierda)
  { const ax = -30, ay = RY + 2.8; G.add(bar(v3(ax, ay, ZR), v3(ax, ay + 17, ZR), 0.32, M.metal, 8));
    for (const [y, l] of [[ay + 16, 9], [ay + 13.5, 7], [ay + 11, 5]]) G.add(bar(v3(ax - l / 2, y, ZR + 0.6), v3(ax + l / 2, y, ZR + 0.6), 0.16, M.metal, 6));
    G.add(bar(v3(ax, ay + 16, ZR + 0.6), v3(ax, ay + 16, ZR + 7), 0.16, M.metal, 6)); }
  // los miradores: base de estuco, banda de cristal en tres paños, remate y el toldo de lona en cuarto de cúpula
  for (const xb of [-27, 25]) {
    const trap = (bw, fw, dp, inset = 0) => { const s = new THREE.Shape(); s.moveTo(xb - bw / 2 + inset, 0); s.lineTo(xb + bw / 2 - inset, 0); s.lineTo(xb + fw / 2 - inset * 0.6, -dp + inset); s.lineTo(xb - fw / 2 + inset * 0.6, -dp + inset); s.closePath(); return s; };
    const up = (shape, y0, h, m, s = 40) => hMesh(G, new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, y0, 0), m, s);
    up(trap(26, 15, 7), 0, 7, M.stucco); up(trap(27, 16, 7.6), 6.6, 0.9, M.trim);
    const gb = up(trap(26, 15, 7, 0.6), 7.5, 16.5, M.glass); gb.castShadow = false; gb.renderOrder = 2;
    up(trap(25, 14, 6.2, 1.2), 7.5, 16.5, M.curtain);
    up(trap(27, 16, 7.6), 24, 1.6, M.trim);
    for (const [x, z] of [[xb - 13, 0], [xb - 7.5, 7], [xb + 7.5, 7], [xb + 13, 0]]) hBox(G, x - 0.6, 7.5, z - 0.6, x + 0.6, 24, z + 0.6, M.frame, 10);
    const aw = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 14, 0, Math.PI, 0, Math.PI / 2), M.fabric); aw.scale.set(14.5, 8.2, 9.6); aw.position.set(xb, 25.6, 0.2); aw.castShadow = true; aw.receiveShadow = true; G.add(aw);
    const hem = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 64, Math.PI), M.trimD); hem.rotation.x = Math.PI / 2; hem.scale.set(14.5, 9.6, 8); hem.position.set(xb, 25.6, 0.2); G.add(hem);
  }
  // la puerta: arco marrón, hoja rosa (con su pomo), escalón y felpudo
  { const ring = archPath(0, 0.4, 14.6, 25.2, new THREE.Shape()); ring.holes.push(archPath(0, 1.6, 11, 22.5));
    hMesh(G, new THREE.ExtrudeGeometry(ring, { depth: 0.9, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelSegments: 2, curveSegments: 28 }), M.trimD, 20);
    const leaf = new THREE.Mesh(new THREE.ExtrudeGeometry(archPath(0, 1.6, 11, 22.5, new THREE.Shape()), { depth: 1.0, bevelEnabled: false, curveSegments: 28 }), M.door); leaf.position.z = -2.4;
    { const g = leaf.geometry, Pp = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < Pp.count; i++) uv.setXY(i, (Pp.getX(i) + 5.5) / 11, (Pp.getY(i) - 1.6) / 22.5); }
    leaf.receiveShadow = true; G.add(leaf);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), M.brass); kn.position.set(3.7, 11.8, -1.0); G.add(kn);
    const kp = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.3, 16), M.brass); kp.rotation.x = Math.PI / 2; kp.position.set(3.7, 11.8, -1.35); G.add(kp);
    hBox(G, -8.5, 0, 0, 8.5, 1.6, 4.8, M.conc, 30);
    hBox(G, -4.2, 1.6, 0.4, 4.2, 1.75, 3.6, new THREE.MeshStandardMaterial({ color: 0x3d4a2c, roughness: 1 }), 10, { cast: false });
    const lamp = new THREE.Group(); lamp.position.set(9.5, 17, 0.6); G.add(lamp);
    const lb = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.0, 2.0), new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 0.25, roughness: 0.4 })); lb.position.set(0, 0, 0.9); lamp.add(lb);
    const lt = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 2.6), M.frame); lt.position.set(0, 1.7, 0.9); lamp.add(lt); }
  // ventanas
  hWindow(G, -27, 41, 20, 14, 'z', { z: 0 }); hWindow(G, 25, 41, 20, 14, 'z', { z: 0 });
  hWindow(G, -50, 41, 16, 14, 'x-', { x: XL }); hWindow(G, -50, 16, 16, 14, 'x-', { x: XL });
  // ala derecha (dos plantas, retranqueada) con su ventana y su tejado
  { const X0 = XR - 0.5, X1 = 76, Z0 = -14, Z1 = -78, E2 = 50, R2 = E2 + 32 * tp;
    hMesh(G, wallGeo(X0, X1, 0, E2, [{ u: 64, v: 33, w: 14, h: 12 }], TH).translate(0, 0, Z0 - TH), M.stucco);
    hMesh(G, wallGeo(-Z0, -Z1, 0, E2, [], TH).rotateY(Math.PI / 2).translate(X1 - TH, 0, 0), M.stucco);
    hMesh(G, triGeo(-Z0, -Z1, E2, (-Z0 - Z1) / 2, R2, TH).rotateY(Math.PI / 2).translate(X1 - TH, 0, 0), M.stucco);
    hWindow(G, 64, 39, 14, 12, 'z', { z: Z0 });
    const ZR2 = (Z0 + Z1) / 2, SL2 = (32 + 6) / cp;
    for (const s of [1, -1]) { const zc = ZR2 + s * 38 / 2, yc = E2 + (19 - 6) * tp + 1.4 / cp + 0.2; hMesh(G, new THREE.BoxGeometry(X1 - X0 + 6, 2.8, SL2).rotateX(s * P).translate((X0 + X1 + 6) / 2, yc, zc), M.roof, 24);
      const ye = E2 - 6 * tp; hBox(G, X0, ye - 3.2, s > 0 ? Z0 + 5 : Z1 - 7, X1 + 6.6, ye + 1.4, s > 0 ? Z0 + 7 : Z1 - 5, M.trim); } }
  // el garaje: puerta blanca de paneles, hastial con su ventanuco, tejado a dos aguas con la cumbrera hacia la calle
  { const X0 = 56, X1 = 116, Z0 = 4, Z1 = -56, E3 = 26, q = 24 * Math.PI / 180, tq = Math.tan(q), cq = Math.cos(q), XM = (X0 + X1) / 2, R3 = E3 + 30 * tq;
    { const s = new THREE.Shape(); s.moveTo(X0, 0); s.lineTo(XM - 22, 0); s.lineTo(XM - 22, 21); s.lineTo(XM + 22, 21); s.lineTo(XM + 22, 0); s.lineTo(X1, 0); s.lineTo(X1, E3); s.lineTo(X0, E3); s.closePath();
      hMesh(G, new THREE.ExtrudeGeometry(s, { depth: TH, bevelEnabled: false }).translate(0, 0, Z0 - TH), M.stucco); }
    hMesh(G, triGeo(X0, X1, E3, XM, R3, TH, [{ u: XM, v: 29, w: 5, h: 5 }]).translate(0, 0, Z0 - TH), M.stucco);
    hMesh(G, wallGeo(-Z0, -Z1, 0, E3, [], TH).rotateY(Math.PI / 2).translate(X1 - TH, 0, 0), M.stucco);
    hMesh(G, wallGeo(Z1, Z0, 0, E3, [], TH).rotateY(-Math.PI / 2).translate(X0 + TH, 0, 0), M.stucco);
    hBox(G, XM - 22, 0, Z0 - 2.2, XM + 22, 21, Z0 - 1.4, M.gdoor, 44);
    { const gd = G.children[G.children.length - 1].geometry, Pp = gd.attributes.position, uv = gd.attributes.uv; for (let i = 0; i < Pp.count; i++) uv.setXY(i, (Pp.getX(i) - XM + 22) / 44, Pp.getY(i) / 21); }
    for (const [x0, x1, y0, y1] of [[XM - 23.2, XM - 22, 0, 22.2], [XM + 22, XM + 23.2, 0, 22.2], [XM - 23.2, XM + 23.2, 21, 22.2]]) hBox(G, x0, y0, Z0 - 0.2, x1, y1, Z0 + 0.6, M.white, 20);
    hWindow(G, XM, 31.5, 5, 5, 'z', { z: Z0 });
    const SL3 = (30 + 4) / cq;
    for (const s of [-1, 1]) { const xc = XM + s * 17, yc = E3 + (17 - 4) * tq + 1.4 / cq + 0.2;
      hMesh(G, new THREE.BoxGeometry(SL3, 2.8, Z0 - Z1 + 8).rotateZ(-s * q).translate(xc, yc, (Z0 + Z1) / 2), M.roof, 24, { swap: true });
      hMesh(G, new THREE.BoxGeometry(SL3 + 0.6, 4.2, 1.4).rotateZ(-s * q).translate(xc, yc - 1.2, Z0 + 4.2), M.trim);
      const xe = XM + s * 34; hBox(G, Math.min(xe, xe - s * 1.4), E3 - 4 * tq - 3.4, Z1 - 4, Math.max(xe, xe - s * 1.4), E3 - 4 * tq + 1.4, Z0 + 4, M.trim); }
    hBox(G, XM - 1.6, R3 + 2.3, Z1 - 4, XM + 1.6, R3 + 3.6, Z0 + 4, M.roof, 24, { swap: true }); }
  // suelo: césped (a los dos lados de la calle), camino, entrada de coches, acera con juntas, bordillos y asfalto
  { const lawn = (z0, z1) => { const g = new THREE.PlaneGeometry(2400, z1 - z0, 1, 1).rotateX(-Math.PI / 2).translate(0, 0, (z0 + z1) / 2); return hMesh(G, g, M.grass, 30, { cast: false }); };
    lawn(-1300, 86); lawn(161.5, 1300);
    hBox(G, -6, 0, 4.8, 6, 0.35, 72, M.conc, 30, { cast: false }); hBox(G, 6, 0, 34, 58, 0.33, 44, M.conc, 30, { cast: false });
    hBox(G, 58, 0, 4, 114, 0.4, 72, M.concJ, 28, { cast: false });
    hBox(G, -1200, 0, 72, 1200, 0.45, 86, M.concJ, 14, { cast: false }); hBox(G, -1200, 0, 161.5, 1200, 0.45, 175.5, M.concJ, 14, { cast: false });
    hBox(G, -1200, -1.6, 86, 1200, 0.55, 87.6, M.conc, 30, { cast: false }); hBox(G, -1200, -1.6, 159.9, 1200, 0.55, 161.5, M.conc, 30, { cast: false });
    hBox(G, -1200, -1.8, 87.6, 1200, -1.25, 159.9, M.asph, 40, { cast: false }); }
  // el buzón
  { const bx = -12, bz = 68; hBox(G, bx - 0.5, 0, bz - 0.5, bx + 0.5, 10, bz + 0.5, M.woodL, 10);
    const mb = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 5, 24, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x6d7378, metalness: 0.6, roughness: 0.4 }));
    mb.rotation.z = Math.PI / 2; mb.rotation.y = Math.PI / 2; mb.position.set(bx, 10.2, bz); mb.castShadow = true; G.add(mb); hBox(G, bx - 1.6, 9.6, bz - 2.5, bx + 1.6, 10.2, bz + 2.5, mb.material, 10);
    hBox(G, bx + 1.6, 10.5, bz + 0.5, bx + 1.9, 13, bz + 1.4, new THREE.MeshStandardMaterial({ color: 0xc8322a, roughness: 0.5 }), 10); }
  // vallas: de estacas (izquierda) y de tablas (detrás)
  { const pk = new THREE.Shape(); pk.moveTo(-0.65, 0); pk.lineTo(0.65, 0); pk.lineTo(0.65, 10); pk.lineTo(0, 11.4); pk.lineTo(-0.65, 10); pk.closePath();
    const pg = new THREE.ExtrudeGeometry(pk, { depth: 0.5, bevelEnabled: false }); const n = 34, im = new THREE.InstancedMesh(pg, M.wood, n); im.castShadow = im.receiveShadow = true;
    for (let i = 0; i < n; i++) { _o.position.set(-96, 0, -30 + i * 3); _o.rotation.set(0, Math.PI / 2, 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); } G.add(im);
    for (const y of [3, 8]) hBox(G, -97.2, y, -31, -96.4, y + 1, 72, M.wood, 20);
    const bw = 2.2, nb = Math.round(250 / bw), bi = new THREE.InstancedMesh(new THREE.BoxGeometry(bw - 0.15, 18, 0.6), M.woodL, nb); bi.castShadow = bi.receiveShadow = true;
    for (let i = 0; i < nb; i++) { _o.position.set(-97 + i * bw, 9, -112); _o.rotation.set(0, 0, 0); _o.scale.set(1, 1 + (hash(i) - 0.5) * 0.03, 1); _o.updateMatrix(); bi.setMatrixAt(i, _o.matrix); } G.add(bi);
    const nb2 = Math.round(95 / bw), bj = new THREE.InstancedMesh(new THREE.BoxGeometry(bw - 0.15, 18, 0.6), M.woodL, nb2); bj.castShadow = bj.receiveShadow = true;
    for (let i = 0; i < nb2; i++) { _o.position.set(140, 9, -112 + i * bw); _o.rotation.set(0, Math.PI / 2, 0); _o.updateMatrix(); bj.setMatrixAt(i, _o.matrix); } G.add(bj); }
  buildCars(G); buildPlants(G); buildNeighbour(G);
  return G;
}
// (_o: el Object3D de trabajo de 20_stations.js)
// ---------- los coches: berlina rosa y ranchera naranja (carrocería extruida de su perfil, habitáculo de cristal, ruedas, luces, cromados)
function carMesh(color, wagon = false) {
  const g = new THREE.Group(), paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.3, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x141c22, roughness: 0.05, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, metalness: 1, roughness: 0.15 }), rub = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.85 });
  const L = 23, W = 8.6;
  const body = new THREE.Shape(); body.moveTo(-L, 3.2); body.lineTo(-L, 9.2); body.quadraticCurveTo(-L + 0.4, 10.4, -L + 2, 10.5); body.lineTo(L - 2.4, 9.9); body.quadraticCurveTo(L, 9.6, L + 0.3, 8);
  body.lineTo(L + 0.3, 3.4); body.lineTo(15.2 + 4.3, 3.2); body.absarc(15.2, 3.2, 4.3, 0, Math.PI, false); body.lineTo(-14 + 4.3, 3.2); body.absarc(-14, 3.2, 4.3, 0, Math.PI, false); body.closePath();
  const bg = new THREE.ExtrudeGeometry(body, { depth: 2 * W - 2.4, bevelEnabled: true, bevelSize: 1.2, bevelThickness: 1.2, bevelSegments: 4, curveSegments: 16 }); bg.translate(0, 0, -(W - 1.2));
  const bm = new THREE.Mesh(bg, paint); bm.castShadow = bm.receiveShadow = true; g.add(bm);
  const cab = new THREE.Shape(); const r0 = wagon ? -L + 1.2 : -12.5, r1 = wagon ? -L + 1.8 : -6.8; cab.moveTo(r0, 10.3); cab.lineTo(r1, 14.6); cab.lineTo(5.2, 14.8); cab.lineTo(11.5, 10.1); cab.closePath();
  const cg = new THREE.ExtrudeGeometry(cab, { depth: 2 * W - 3.4, bevelEnabled: true, bevelSize: 0.7, bevelThickness: 0.7, bevelSegments: 3 }); cg.translate(0, 0, -(W - 1.7));
  const cm = new THREE.Mesh(cg, glass); cm.castShadow = true; g.add(cm);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.2 - r1 + 0.6, 0.7, 2 * W - 2.6), paint); roof.position.set((5.2 + r1) / 2, 14.95, 0); roof.castShadow = true; g.add(roof);
  for (const x of [r1 + 0.3, (r1 + 5.2) / 2 + (wagon ? -3 : 0), 5.0]) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.4, 0.5), paint); p.position.set(x, 12.6, s * (W - 1.1)); p.rotation.z = x > 4 ? -0.6 : x < r1 + 1 ? (wagon ? 0.1 : 0.62) : 0; g.add(p); }
  for (const [x, y, z] of [[15.2, 3.3, 1], [-14, 3.3, 1], [15.2, 3.3, -1], [-14, 3.3, -1]]) {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(2.6, 1.15, 14, 32), rub); tire.position.set(x, y, z * (W - 1.6)); tire.scale.z = 1.25; tire.castShadow = true; g.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.5, 24), chrome); rim.rotation.x = Math.PI / 2; rim.position.set(x, y, z * (W - 0.55)); g.add(rim); }
  for (const s of [-1, 1]) { const hl = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 20), new THREE.MeshStandardMaterial({ color: 0xf6f3e8, emissive: 0xfff2d0, emissiveIntensity: 0.2, roughness: 0.1 })); hl.rotation.z = Math.PI / 2; hl.position.set(L + 0.55, 7.4, s * 5.6); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 2.6), new THREE.MeshStandardMaterial({ color: 0x9a1010, emissive: 0x5a0606, emissiveIntensity: 0.4, roughness: 0.2 })); tl.position.set(-L - 0.55, 8.2, s * 6.2); g.add(tl); }
  for (const x of [L + 0.9, -L - 0.9]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 2 * W + 0.4), chrome); b.position.set(x, 4.6, 0); b.castShadow = true; g.add(b); }
  const gr = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.4, 6.4), new THREE.MeshStandardMaterial({ color: 0x1a1c1e, metalness: 0.5, roughness: 0.4 })); gr.position.set(L + 0.5, 6.7, 0); g.add(gr);
  return g;
}
function buildCars(G) {
  const c1 = carMesh(0xd77fc8); c1.position.set(76, 0.4, 44); c1.rotation.y = Math.PI / 2 + 0.06; G.add(c1);
  const c2 = carMesh(0xd6582e, true); c2.position.set(100, 0.4, 30); c2.rotation.y = Math.PI / 2 - 0.05; G.add(c2);
}
// ---------- árboles (copa de grumos con relieve de hojas), coníferas, arbustos y seto
function buildPlants(G) {
  const M = HMAT, ico = new THREE.SphereGeometry(1, 22, 14);      // malla con índices: normales suaves (las del icosaedro salían en facetas)
  { const P = ico.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const k = 1 + 0.16 * Math.sin(v.x * 5.1 + v.y * 3.3) * Math.sin(v.z * 4.7 - v.y * 2.1) + 0.08 * Math.sin(v.x * 11 + v.z * 9); v.multiplyScalar(k); P.setXYZ(i, v.x, v.y, v.z); } ico.computeVertexNormals(); }
  const blobs = []; const col = new THREE.Color();
  const tree = (x, z, h, r, seed) => { const tr = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.09, r * 0.15, h * 0.62, 12), M.bark); tr.position.set(x, h * 0.31, z); tr.castShadow = true; G.add(tr);
    for (let i = 0; i < 6; i++) { const a = hash(seed + i * 3.1) * 6.28, l = r * (0.4 + hash(seed + i) * 0.4); G.add(bar(v3(x, h * (0.42 + 0.06 * i), z), v3(x + Math.cos(a) * l, h * (0.6 + 0.05 * i), z + Math.sin(a) * l), r * 0.035, M.bark, 6)); }
    for (let i = 0; i < 46; i++) { const u = hash(seed + i * 1.37), w = hash(seed + i * 2.71), q = hash(seed + i * 4.13); const th = u * 6.283, ph = Math.acos(1 - 2 * w * 0.9), rr = r * (0.55 + 0.45 * Math.cbrt(q));
      blobs.push([x + Math.sin(ph) * Math.cos(th) * rr, h * 0.72 + Math.cos(ph) * rr * 0.8, z + Math.sin(ph) * Math.sin(th) * rr, r * (0.3 + 0.18 * hash(seed + i * 5.9)), 0.75 + 0.35 * hash(seed + i * 7.3) + 0.15 * (Math.cos(ph))]); } };
  for (const [x, z, h, r, s] of [[-75, -150, 120, 42, 1], [-10, -175, 135, 48, 2], [52, -160, 112, 40, 3], [-150, -60, 105, 38, 4], [-165, 40, 125, 44, 5], [-118, -190, 110, 40, 6], [100, -205, 120, 44, 7], [-230, -120, 120, 46, 8], [230, 220, 110, 40, 9], [-240, 230, 120, 44, 10]]) tree(x, z, h, r, s * 17.3);
  // arbustos junto a la casa y el seto de la derecha
  const bush = (x, z, r, n, seed) => { for (let i = 0; i < n; i++) { const a = hash(seed + i) * 6.28, d = r * 0.45 * hash(seed + i * 2.2); blobs.push([x + Math.cos(a) * d, r * (0.5 + 0.3 * hash(seed + i * 3.3)), z + Math.sin(a) * d, r * (0.5 + 0.25 * hash(seed + i * 4.4)), 0.7 + 0.3 * hash(seed + i * 5.5)]); } };
  for (const [x, z, r, s] of [[-13, 6, 4.2, 1], [13, 6, 4.2, 2], [-44, 12, 5.5, 3], [-66, 6, 6, 4], [41, 11, 5, 5], [8, 11, 2.2, 6], [-90, 50, 5, 7]]) bush(x, z, r, 7, s * 31.7);
  for (let i = 0; i < 20; i++) bush(124, -30 + i * 5.2, 5.6, 3, 900 + i * 13.1);
  const im = new THREE.InstancedMesh(ico, M.leaf, blobs.length); im.castShadow = im.receiveShadow = true;
  blobs.forEach((b, i) => { _o.position.set(b[0], b[1], b[2]); _o.rotation.set(hash(i * 1.1) * 6, hash(i * 2.2) * 6, 0); _o.scale.setScalar(b[3]); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix);
    col.setRGB(0.16 * b[4], 0.33 * b[4], 0.1 * b[4]); im.setColorAt(i, col); });
  G.add(im);
  // coníferas (a la derecha, detrás)
  for (const [x, z, h, s] of [[160, -140, 150, 1], [188, -100, 120, 2], [214, -160, 160, 3], [176, -60, 95, 4]]) { const tr = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, h * 0.3, 8), M.bark); tr.position.set(x, h * 0.15, z); G.add(tr);
    for (let k = 0; k < 6; k++) { const y0 = h * (0.14 + k * 0.13), rr = h * (0.2 - k * 0.028); const c = new THREE.Mesh(new THREE.ConeGeometry(rr, h * 0.3, 18, 1), M.conifer); c.position.set(x, y0 + h * 0.15, z); c.rotation.y = hash(s * 9 + k) * 3; c.castShadow = true; c.receiveShadow = true; G.add(c); } }
}
// ---------- la casa del vecino (a la derecha): estuco claro, tejado gris a cuatro aguas
function buildNeighbour(G) {
  const M = HMAT, m = new THREE.MeshStandardMaterial({ map: M.stucco.map, bumpMap: M.stucco.bumpMap, bumpScale: 0.9, roughness: 0.93, color: 0xf0e6cf });
  hBox(G, 160, 0, -100, 290, 48, -12, m);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4, 1), new THREE.MeshStandardMaterial({ map: M.roof.map, bumpMap: M.roof.bumpMap, bumpScale: 2.2, roughness: 0.88, color: 0x9a9fa6 })); roof.rotation.y = Math.PI / 4; roof.scale.set(104, 26, 70); roof.position.set(225, 48 + 13, -56); roof.castShadow = true; G.add(roof);
  for (const x of [175, 205, 245, 270]) hWindow(G, x, 36, 14, 12, 'z', { z: -12 });
  for (const x of [175, 270]) hWindow(G, x, 14, 14, 12, 'z', { z: -12 });
  hBox(G, 214, 0, -12.4, 226, 22, -11.6, M.white, 20);
}
// ---------- el cielo: degradado, sol y nubes de algodón (fbm); dk = 1 lo oscurece (dentro de la cabeza)
const SKY_U = { sun: { value: SUN_DIR.clone() }, dk: { value: 0 }, env: { value: 0 } };
function skyMat() {
  return new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: SKY_U,
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: `#include <logdepthbuf_pars_fragment>
uniform vec3 sun; uniform float dk, env; varying vec3 vD;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0., w = 0.5; for (int i = 0; i < 6; i++) { a += w * n2(p); p = p * 2.07 + vec2(1.7, 9.2); w *= 0.5; } return a; }
void main(){
#include <logdepthbuf_fragment>
  vec3 d = normalize(vD); float e = d.y;
  vec3 zen = vec3(0.075, 0.2, 0.52), hor = vec3(0.5, 0.66, 0.86), c = mix(hor, zen, pow(clamp(e, 0., 1.), 0.6));
  c = mix(c, vec3(0.16, 0.17, 0.12), smoothstep(0.0, -0.08, e));
  float s = max(dot(d, sun), 0.); c += vec3(1.0, 0.86, 0.62) * (pow(s, 6.) * 0.22 + pow(s, 60.) * 0.6) + vec3(1.0, 0.95, 0.85) * pow(s, 2000.) * 30. * (1. - env);
  if (e > 0.01 && env < 0.5) { vec2 uv = d.xz / (e + 0.08) * 1.1; float cl = fbm(uv * 0.9 + vec2(3.1, 1.3)), cl2 = fbm(uv * 0.9 + vec2(3.1, 1.3) + sun.xz * 0.06);
    float k = smoothstep(0.5, 0.74, cl) * smoothstep(0.01, 0.12, e) * (1. - smoothstep(0.75, 0.98, e));
    vec3 cc = mix(vec3(0.55, 0.6, 0.7), vec3(1.25, 1.22, 1.15), clamp(0.5 + (cl - cl2) * 6., 0., 1.)); c = mix(c, cc, k * 0.92); }
  c = mix(c, vec3(0.004, 0.008, 0.02), dk);
  gl_FragColor = vec4(c, 1.); }` });
}
// el mundo de fuera: cielo, casa, luz del sol (con la sombra que sigue a la cámara), cielo de relleno y contraluz; y el entorno para los reflejos
function buildWorld() {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), skyMat()); sky.renderOrder = -2; sky.frustumCulled = false; scene.add(sky); S.sky = sky;
  { const es = new THREE.Scene(), m = skyMat(); m.uniforms = { sun: SKY_U.sun, dk: { value: 0 }, env: { value: 1 } }; es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), m));
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.0, 0.1, 100).texture; scene.environmentIntensity = 0.75; }
  S.house = buildHouse(); scene.add(S.house);
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.4); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.radius = 3; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xb9d4ff, 0x56603a, 0.55), rim = new THREE.DirectionalLight(0xdfe9ff, 1.3); scene.add(hemi, rim, rim.target);
  S.L = { sun, hemi, rim };
  scene.fog = new THREE.FogExp2(0xa9c2dc, 0.00022);
}
// la sombra del sol cubre lo que se ve: más ancha cuanto más lejos está la cámara
function sunAt(c, d, yaw) {
  const L = S.L, R = clamp(d * 0.62, 4.5, 260), sh = L.sun.shadow, cmr = sh.camera;
  L.sun.position.copy(c).addScaledVector(SUN_DIR, 900); L.sun.target.position.copy(c);
  cmr.left = cmr.bottom = -R; cmr.right = cmr.top = R; cmr.near = 900 - 3 * R - 60; cmr.far = 900 + 3 * R + 120; cmr.updateProjectionMatrix();
  sh.bias = -0.00006; sh.normalBias = R * 0.0016;
  L.rim.position.set(c.x + Math.sin(yaw + 2.6) * 50, c.y + 30, c.z + Math.cos(yaw + 2.6) * 50); L.rim.target.position.copy(c);
}
