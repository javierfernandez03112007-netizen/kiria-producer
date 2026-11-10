// La pared de listones se agrieta (dos golpes) y revienta: sale el «3,6M» en 3D y se queda flotando al lado de Javi.
// La cámara 3D es la de la grabación: la pared es un plano que llena el encuadre con la misma imagen (wall_a8695.png), así que
// donde no se rompe se ve idéntica a la pared del montaje. Dos capas por fotograma: 'bg' (pared, trozos, polvo) y 'num' (el número).
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1080, H = 1920, FOV = 60, D = 1.4;
const TF = Math.tan(FOV / 2 * Math.PI / 180);
const HP = 2 * D * TF, WP = HP * W / H, PXM = H / HP;
// tiempos (segundos de la grabación a8695): golpes y reventón (la palabra «3,7» empieza en 2,40)
const TH1 = 0.62, TH2 = 1.56, TB = 2.36;
const NUM_TXT = window.NUM_TXT || '3,6M';
// dónde se rompe (píxeles de pantalla) y radio
const BX = 300, BY = 392, BR = 196;
const wx = px => (px / W - 0.5) * WP, wy = py => (0.5 - py / H) * HP;
const at = (px, py, depth) => { const h = 2 * depth * TF, w = h * W / H; return new THREE.Vector3((px / W - .5) * w, (.5 - py / H) * h, -depth); };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lin = (t, a, b) => clamp((t - a) / (b - a));
const eOut = x => 1 - Math.pow(1 - x, 3);
const eIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eBack = x => { const c1 = 1.3, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, premultipliedAlpha: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.02, 30);
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;

async function main() {
  const tex = await new THREE.TextureLoader().loadAsync('img/wall_a8695.png');
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  const R = rng(20261112);
  const bx = wx(BX), by = wy(BY), br = BR / PXM;
  // ---- borde irregular de la zona que se rompe
  const NB = 44, bound = [];
  for (let k = 0; k < NB; k++) { const a = k / NB * Math.PI * 2; const r = br * (0.84 + 0.3 * R()); bound.push([bx + Math.cos(a) * r, by + Math.sin(a) * r]); }
  // ---- semillas (más densas en el centro) y celdas de Voronoi recortadas al borde
  const seeds = [];
  while (seeds.length < 38) { const a = R() * Math.PI * 2, r = br * 0.98 * Math.pow(R(), 0.65); const p = [bx + Math.cos(a) * r, by + Math.sin(a) * r];
    if (seeds.every(s => Math.hypot(s[0] - p[0], s[1] - p[1]) > br * 0.11)) seeds.push(p); }
  const clip = (poly, a, b) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = b[0] - a[0], ny = b[1] - a[1]; const out = [];
    for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; const dp = (p[0] - mx) * nx + (p[1] - my) * ny, dq = (q[0] - mx) * nx + (q[1] - my) * ny;
      if (dp <= 0) out.push(p); if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } }
    return out; };
  const T = 0.032;                                                         // grosor de los listones
  const cellMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, L: { value: new THREE.Vector3(0.35, -0.3, 1).normalize() }, dark: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 L; varying vec2 vUv; varying vec3 vN;
      void main(){ vec4 c = texture2D(map, vUv); vec3 n = normalize(vN);
        float sh = clamp(0.32 + 0.68 * max(dot(n, L), 0.0) / L.z, 0.25, 1.45);
        float side = 1.0 - smoothstep(0.55, 0.92, abs(n.z));
        vec3 core = vec3(0.075, 0.045, 0.028);
        vec3 col = mix(c.rgb, core, side * 0.8) * sh;
        if (n.z < -0.5) col = core * 0.6;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }` });
  const cells = [];
  seeds.forEach((s, i) => {
    let poly = bound.slice();
    seeds.forEach((o, j) => { if (j !== i && poly.length > 2) poly = clip(poly, s, o); });
    if (poly.length < 3) return;
    let cx = 0, cy = 0, A = 0;
    for (let k = 0; k < poly.length; k++) { const p = poly[k], q = poly[(k + 1) % poly.length]; const cr = p[0] * q[1] - q[0] * p[1]; A += cr; cx += (p[0] + q[0]) * cr; cy += (p[1] + q[1]) * cr; }
    A /= 2; cx /= 6 * A; cy /= 6 * A;
    const shape = new THREE.Shape(poly.map(p => new THREE.Vector2(p[0] - cx, p[1] - cy)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, steps: 1, curveSegments: 1 });
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let k = 0; k < pos.count; k++) uv.setXY(k, (pos.getX(k) + cx + WP / 2) / WP, (pos.getY(k) + cy + HP / 2) / HP);
    uv.needsUpdate = true;
    const m = new THREE.Mesh(geo, cellMat);
    const dist = Math.hypot(cx - bx, cy - by) / br;
    const rin = Math.sqrt(Math.abs(A) / Math.PI);
    const ax = new THREE.Vector3(R() - .5, R() - .5, (R() - .5) * .6).normalize();
    const radial = new THREE.Vector2(cx - bx, cy - by).normalize();
    cells.push({ m, cx, cy, dist, rin, fly: dist < 0.72 || (dist < 0.85 && R() < 0.4), tc: dist < 0.42 ? TH1 + dist * 0.15 : TH2 + (dist - 0.42) * 0.25,
      gap: (dist < 0.42 ? 0.0064 : 0.0046), delay: dist * 0.05, vx: radial.x * (0.35 + 0.9 * R()) + (R() - .5) * .3, vy: radial.y * (0.35 + 0.9 * R()) + 0.25 + 0.5 * R(),
      vz: 1.1 + 1.7 * R() * (1 - dist * .4), ax, w: 5 + 9 * R(), jolt: [(R() - .5) * 0.05, (R() - .5) * 0.05, 0.002 + 0.004 * R()] });
    scene.add(m);
  });
  // ---- pared con el hueco (todo lo que no se rompe)
  const wshape = new THREE.Shape([new THREE.Vector2(-WP / 2 - .01, -HP / 2 - .01), new THREE.Vector2(WP / 2 + .01, -HP / 2 - .01), new THREE.Vector2(WP / 2 + .01, HP / 2 + .01), new THREE.Vector2(-WP / 2 - .01, HP / 2 + .01)]);
  wshape.holes.push(new THREE.Path(bound.slice().reverse().map(p => new THREE.Vector2(p[0], p[1]))));
  const wgeo = new THREE.ShapeGeometry(wshape, 1);
  { const pos = wgeo.attributes.position, uv = wgeo.attributes.uv; for (let k = 0; k < pos.count; k++) uv.setXY(k, (pos.getX(k) + WP / 2) / WP, (pos.getY(k) + HP / 2) / HP); uv.needsUpdate = true; }
  const wallMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: true });
  const wall = new THREE.Mesh(wgeo, wallMat); wall.position.z = -D; scene.add(wall);
  // ---- hueco: caja oscura detrás (se ve por las grietas y por el agujero)
  const cav = new THREE.Mesh(new THREE.BoxGeometry(br * 2.6, br * 2.6, 0.16), new THREE.MeshStandardMaterial({ color: 0x17120f, roughness: 1, side: THREE.BackSide }));
  cav.position.set(bx, by, -D - T - 0.08); scene.add(cav);
  const cavLight = new THREE.PointLight(0xb45cff, 0, 0.6, 1.6); cavLight.position.set(bx, by, -D - 0.05); scene.add(cavLight);
  // ---- grietas que salen del borde hacia la pared sana (quads finos)
  const crackMat = new THREE.MeshBasicMaterial({ color: 0x0b0806, transparent: true, opacity: 0.95, toneMapped: false, depthTest: false });
  const cracks = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7 + R() * .1) * Math.PI * 2; let r0 = br * (0.95 + 0.1 * R()); let x = bx + Math.cos(a) * r0, y = by + Math.sin(a) * r0;
    const len = 0.05 + 0.1 * R(), segs = 5; const pts = [[x, y]]; let ang = a;
    for (let s = 0; s < segs; s++) { ang += (R() - .5) * 0.9; x += Math.cos(ang) * len / segs; y += Math.sin(ang) * len / segs; pts.push([x, y]); }
    const g = new THREE.BufferGeometry(); const v = [];
    for (let s = 0; s < segs; s++) { const p = pts[s], q = pts[s + 1]; const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); const nx = -dy / L, ny = dx / L;
      const w0 = 0.003 * (1 - s / segs) + 0.0006, w1 = 0.003 * (1 - (s + 1) / segs) + 0.0006;
      v.push(p[0] + nx * w0, p[1] + ny * w0, 0, p[0] - nx * w0, p[1] - ny * w0, 0, q[0] + nx * w1, q[1] + ny * w1, 0, p[0] - nx * w0, p[1] - ny * w0, 0, q[0] - nx * w1, q[1] - ny * w1, 0, q[0] + nx * w1, q[1] + ny * w1, 0); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setDrawRange(0, 0);
    const m = new THREE.Mesh(g, crackMat); m.position.z = -D + 0.0004; m.renderOrder = 2; scene.add(m); cracks.push({ m, segs });
  }
  // ---- polvo (puntos con tamaño y transparencia por partícula; todo función del tiempo)
  const NP = 1200; const pg = new THREE.BufferGeometry();
  const pp = new Float32Array(NP * 3), ps = new Float32Array(NP), pa = new Float32Array(NP);
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('aSize', new THREE.BufferAttribute(ps, 1)); pg.setAttribute('aAlpha', new THREE.BufferAttribute(pa, 1));
  const dust = [];
  for (let i = 0; i < NP; i++) {
    const te = i < 220 ? TH1 : i < 400 ? TH2 : TB + R() * 0.12; const big = te >= TB;
    const a = R() * Math.PI * 2, r = br * (big ? 0.75 : 0.45) * Math.sqrt(R());
    dust.push({ te, x: bx + Math.cos(a) * r, y: by + Math.sin(a) * r, vx: Math.cos(a) * (big ? .15 + .55 * R() : .05 + .15 * R()), vy: Math.sin(a) * (big ? .15 + .55 * R() : .05 + .15 * R()) + (big ? .1 * R() : 0),
      vz: big ? .15 + 1.3 * R() : .03 + .12 * R(), life: (big ? 1.4 : 0.9) + 1.6 * R(), s0: 4 + 6 * R(), s1: (big ? 26 : 18) + 30 * R(), al: (big ? .38 : .42) * (0.5 + .5 * R()) });
  }
  const dustMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { scale: { value: H / (2 * TF) } },
    vertexShader: `attribute float aSize; attribute float aAlpha; varying float vA; uniform float scale; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * scale / -mv.z * 0.001; vA = aAlpha; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; float a = smoothstep(1.0, 0.0, r); a *= a; gl_FragColor = vec4(vec3(0.50, 0.43, 0.36) * (0.85 + 0.15 * (1.0 - r)), a * vA);
      #include <colorspace_fragment>
    }` });
  const dustPts = new THREE.Points(pg, dustMat); dustPts.frustumCulled = false; dustPts.renderOrder = 5; scene.add(dustPts);
  // ---- astillas pequeñas
  const NS = 140; const chipGeo = new THREE.BoxGeometry(1, 1, 1);
  const chipMat = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.8 });
  const chips = new THREE.InstancedMesh(chipGeo, chipMat, NS); chips.frustumCulled = false; scene.add(chips);
  const chip = [];
  for (let i = 0; i < NS; i++) { const a = R() * Math.PI * 2, r = br * 0.6 * Math.sqrt(R());
    chip.push({ te: TB + R() * 0.08, x: bx + Math.cos(a) * r, y: by + Math.sin(a) * r, vx: Math.cos(a) * (.3 + 1.4 * R()), vy: Math.sin(a) * (.3 + 1.4 * R()) + .6 * R(), vz: .5 + 2.6 * R(),
      s: [0.003 + 0.007 * R(), 0.002 + 0.005 * R(), 0.002 + 0.004 * R()], ax: new THREE.Vector3(R() - .5, R() - .5, R() - .5).normalize(), w: 6 + 20 * R() }); }
  // ---- el número
  const font = new FontLoader().parse(await (await fetch('anton.typeface.json')).json());
  const tg = new TextGeometry(NUM_TXT, { font, size: 0.1, depth: 0.03, curveSegments: 14, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.0028, bevelSegments: 5 });
  tg.computeBoundingBox(); { const b = tg.boundingBox; tg.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, -(b.max.z + b.min.z) / 2); }
  tg.computeBoundingBox();
  const numW = tg.boundingBox.max.x - tg.boundingBox.min.x;
  const front = new THREE.MeshPhysicalMaterial({ color: 0xfff1de, roughness: 0.26, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12, emissive: 0x3a2c1f, emissiveIntensity: 0.6 });
  const sideM = new THREE.MeshPhysicalMaterial({ color: 0xa55cff, roughness: 0.22, metalness: 0.75, clearcoat: 0.6, emissive: 0x2a0d55, emissiveIntensity: 0.5 });
  const num = new THREE.Mesh(tg, [front, sideM]);
  const numG = new THREE.Group(); numG.add(num); scene.add(numG);
  // brillo detrás del número
  const gc = document.createElement('canvas'); gc.width = gc.height = 256; const gx = gc.getContext('2d');
  const grd = gx.createRadialGradient(128, 128, 0, 128, 128, 128); grd.addColorStop(0, 'rgba(180,92,255,0.55)'); grd.addColorStop(0.45, 'rgba(120,90,255,0.18)'); grd.addColorStop(1, 'rgba(79,125,255,0)');
  gx.fillStyle = grd; gx.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(gc); glowTex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  numG.add(glow); glow.position.z = -0.03;
  const key = new THREE.DirectionalLight(0xfff1e0, 2.2); key.position.set(0.7, -0.35, 1); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb45cff, 2.4); rim.position.set(-1, 0.6, -0.5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x4f7dff, 0.8); fill.position.set(-0.6, -0.4, 0.8); scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  // trayectoria del número: sale del hueco, se acerca y se queda a la izquierda de la cara (pantalla ~270,650)
  const FIN_D = 0.86, FIN = at(258, 640, FIN_D), OUTP = at(318, 470, 1.12), HOLE = new THREE.Vector3(bx, by, -D - 0.06);
  const finW = 400 / (H / (2 * FIN_D * TF));                                // 400 px de ancho al final
  const S_FIN = finW / numW;

  const q = new THREE.Quaternion(), e = new THREE.Euler(), m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), sc3 = new THREE.Vector3();
  function update(ts) {
    // celdas: grietas (se separan un poco), abombado en el 2.º golpe, sacudida y vuelo en el reventón
    for (const c of cells) {
      const g = c.gap * eOut(lin(ts, c.tc, c.tc + 0.06));
      const s = 1 - g / c.rin;
      let x = c.cx, y = c.cy, z = -D - T; c.m.quaternion.identity();
      const bul = (1 - c.dist) * eOut(lin(ts, TH2, TH2 + 0.08)) * (1 - lin(ts, TB, TB + .01));
      z += bul * 0.004 + (1 - c.dist) * eOut(lin(ts, TH1, TH1 + .06)) * 0.0015;
      if (ts >= TB + c.delay && c.fly) {
        const dt = ts - TB - c.delay;
        x += c.vx * dt; y += c.vy * dt - 0.5 * 3.2 * dt * dt; z += c.vz * dt;
        c.m.quaternion.setFromAxisAngle(c.ax, c.w * dt);
        c.m.visible = z < -0.14;
      } else if (ts >= TB && !c.fly) {
        const k = eOut(lin(ts, TB, TB + .08));
        z += c.jolt[2] * k; e.set(c.jolt[0] * k, c.jolt[1] * k, 0); c.m.quaternion.setFromEuler(e); c.m.visible = true;
      } else c.m.visible = true;
      c.m.position.set(x, y, z); c.m.scale.set(s, s, 1);
    }
    // grietas de fuera
    for (const k of cracks) { const p = 0.3 * eOut(lin(ts, TH1, TH1 + .05)) + 0.3 * eOut(lin(ts, TH2, TH2 + .1)) + 0.4 * eOut(lin(ts, TB, TB + .08)); k.m.geometry.setDrawRange(0, Math.round(k.segs * p) * 6); }
    // polvo
    for (let i = 0; i < NP; i++) { const d = dust[i]; const dt = ts - d.te;
      if (dt < 0 || dt > d.life) { pa[i] = 0; ps[i] = 0; pp[i * 3] = d.x; pp[i * 3 + 1] = d.y; pp[i * 3 + 2] = -D; continue; }
      const kd = 2.4, f = (1 - Math.exp(-kd * dt)) / kd;
      pp[i * 3] = d.x + d.vx * f; pp[i * 3 + 1] = d.y + d.vy * f - 0.5 * 0.12 * dt * dt; pp[i * 3 + 2] = -D + 0.004 + d.vz * f;
      const u = dt / d.life; ps[i] = d.s0 + (d.s1 - d.s0) * Math.sqrt(u); pa[i] = d.al * Math.pow(1 - u, 1.6) * clamp(dt / 0.04); }
    pg.attributes.position.needsUpdate = true; pg.attributes.aSize.needsUpdate = true; pg.attributes.aAlpha.needsUpdate = true;
    // astillas
    for (let i = 0; i < NS; i++) { const c = chip[i]; const dt = ts - c.te;
      if (dt < 0) { m4.makeScale(0, 0, 0); chips.setMatrixAt(i, m4); continue; }
      v3.set(c.x + c.vx * dt, c.y + c.vy * dt - 0.5 * 6 * dt * dt, -D + 0.01 + c.vz * dt);
      if (v3.z > -0.12) { m4.makeScale(0, 0, 0); chips.setMatrixAt(i, m4); continue; }
      q.setFromAxisAngle(c.ax, c.w * dt); sc3.set(c.s[0], c.s[1], c.s[2]); m4.compose(v3, q, sc3); chips.setMatrixAt(i, m4); }
    chips.instanceMatrix.needsUpdate = true;
    // el número
    const show = ts >= TB - 0.02;
    numG.visible = show;
    if (show) {
      const k1 = eOut(lin(ts, TB - 0.02, TB + 0.16));                         // atraviesa la pared
      const k2 = eIO(lin(ts, TB + 0.12, TB + 1.0));                          // va a su sitio
      const p = new THREE.Vector3().lerpVectors(HOLE, OUTP, k1);
      p.lerp(FIN, k2);
      const fl = lin(ts, TB + 0.9, TB + 1.4);
      p.y += Math.sin((ts - TB) * 2.1) * 0.0035 * fl; p.x += Math.sin((ts - TB) * 1.3) * 0.002 * fl;
      numG.position.copy(p);
      const s = (0.55 + 0.45 * k1) * S_FIN;
      num.scale.setScalar(s);
      const ry = -0.5 * (1 - k2) + 0.22 * k2 + Math.sin((ts - TB) * 1.1) * 0.05 * fl;
      const rx = -0.35 * (1 - k2) + 0.05 * k2 + Math.sin((ts - TB) * 1.7) * 0.03 * fl;
      e.set(rx, ry, 0.15 * (1 - k2)); num.quaternion.setFromEuler(e);
      glow.scale.set(numW * s * 1.9, numW * s * 1.25, 1);
      glow.material.opacity = 0.9 * k1;
      cavLight.intensity = 0.45 * (1 - k2) * k1;
    }
  }
  function renderAt(ts, layer) {
    update(ts);
    const bg = layer === 'bg';
    for (const c of cells) c.m.material = cellMat;
    wall.visible = true; cav.visible = true; dustPts.visible = bg; chips.visible = bg;
    for (const k of cracks) k.m.visible = bg;
    // en la capa del número la pared y los trozos solo tapan (escriben profundidad, no color)
    wallMat.colorWrite = bg; cellMat.colorWrite = bg; cav.material.colorWrite = bg;
    numG.visible = !bg && ts >= TB - 0.02;
    renderer.render(scene, cam);
    return { num: ts >= TB - 0.02 };
  }
  window.renderAt = renderAt; window.ready = true;
}
main().catch(e => { window.failed = String(e && e.stack || e); });
