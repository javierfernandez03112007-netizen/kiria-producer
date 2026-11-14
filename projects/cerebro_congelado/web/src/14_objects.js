// ---------------------------------------------------------------- objetos de «Qué pasa cuando te crujes los dedos» (1 unidad = 1 m; las piezas del centro, gigantes):
// la mano en rayos X (huesos de verdad y piel translúcida; cada dedo se dobla por el nudillo), la maqueta del nudillo en corte con su líquido y la
// burbuja, el manómetro, la resonancia, las campanas de cristal del debate, el reloj de 20 minutos, la caja de luz con las radiografías, el premio
// y las figuritas.
// las caras de las bobinas pequeñas son espejos planos: al levantarse, alguna refleja el foco hacia la cámara y da un fogonazo de un
// fotograma (valor ≈ 30) que el resplandor convierte en una mancha blanca. Se limita su brillo por debajo del umbral del resplandor (1,7):
// el brillo normal no cambia y el reflejo se queda en un destello pequeño.
const capGlint = (m, c = 1.2) => { m.onBeforeCompile = sh => { const f = sh.fragmentShader.replace('#include <opaque_fragment>', `outgoingLight = min(outgoingLight, vec3(${c.toFixed(2)}));\n#include <opaque_fragment>`);
  if (f === sh.fragmentShader) console.error('ERROR capGlint: no encuentro opaque_fragment'); sh.fragmentShader = f; }; return m; };
// ---------- rayos X: la piel brilla en el borde (fresnel) y los huesos, más blancos; todo aditivo, como una radiografía en el aire
function xrayMat(col, base, pw, op) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    uniforms: { col: { value: new THREE.Color(col) }, base: { value: base }, pw: { value: pw }, op: { value: op } },
    // con los trozos del búfer de profundidad logarítmico (el renderizador lo usa): sin ellos, el suelo tapa la mano por debajo del horizonte
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv;\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: '#include <logdepthbuf_pars_fragment>\nuniform vec3 col; uniform float base, pw, op; varying vec3 vN; varying vec3 vV; void main(){\n#include <logdepthbuf_fragment>\nfloat r = 1. - abs(dot(normalize(vN), normalize(vV))); float a = op * (base + (1. - base) * pow(r, pw)); gl_FragColor = vec4(col * a, 1.); }' });
}
let XM = null;
function xrayMats() { if (!XM) XM = { bone: xrayMat(0xdcefff, 0.38, 1.4, 0.95), skin: xrayMat(0x6fb4ff, 0.015, 2.6, 0.75), nail: xrayMat(0x9fd0ff, 0.05, 2.0, 0.5) }; return XM; }
// hueso genérico de largo 1 (eje +y): caña fina y extremos ensanchados
let BONE_G = null;
function boneGeo() { if (!BONE_G) BONE_G = new THREE.LatheGeometry([[0.0, 0.0], [0.62, 0.0], [1.0, 0.05], [0.95, 0.12], [0.62, 0.22], [0.5, 0.5], [0.55, 0.78], [0.9, 0.9], [0.95, 0.96], [0.6, 1.0], [0.0, 1.0]].map(([x, y]) => new THREE.Vector2(x, y)), 18); return BONE_G; }
function boneSeg(len, r, m) { const b = new THREE.Mesh(boneGeo(), m); b.scale.set(r, len, r); return b; }
const _up = new THREE.Vector3(0, 1, 0);
function boneBetween(a, b, r, m) { const d = b.clone().sub(a), L = d.length(); const o = boneSeg(L, r, m); o.position.copy(a); o.quaternion.setFromUnitVectors(_up, d.normalize()); return o; }
// mano derecha con la palma hacia +z y los dedos hacia +y; la muñeca en el origen. Cada dedo: grupo en el nudillo (MCP) que se dobla con rotation.x
function xrayHand(s = 1) {
  const X = xrayMats(), g = new THREE.Group(), fingers = [];
  const F = [ // [base del metacarpiano, nudillo, ángulo (grados), largos de las falanges, radio]
    { b: [0.125, 0.07], k: [0.235, 0.27], a: 38, L: [0.15, 0.115], r: 0.02 },            // pulgar (dos falanges)
    { b: [0.07, 0.12], k: [0.11, 0.42], a: 6, L: [0.2, 0.12, 0.09], r: 0.017 },
    { b: [0.02, 0.125], k: [0.035, 0.44], a: 0, L: [0.22, 0.14, 0.1], r: 0.018 },
    { b: [-0.03, 0.12], k: [-0.04, 0.42], a: -5, L: [0.2, 0.13, 0.095], r: 0.017 },
    { b: [-0.075, 0.11], k: [-0.105, 0.375], a: -12, L: [0.16, 0.1, 0.08], r: 0.015 },
  ];
  for (const f of F) {
    const b = v3(f.b[0], f.b[1], 0), k = v3(f.k[0], f.k[1], 0);
    g.add(boneBetween(b, k, f.r * 1.05, X.bone));                                   // metacarpiano
    const root = new THREE.Group(); root.position.copy(k); root.rotation.z = -f.a * D2; g.add(root);
    let parent = root, y = 0; const joints = [root];
    f.L.forEach((L, i) => {
      const seg = new THREE.Group(); seg.position.y = i === 0 ? 0.008 : y; parent.add(seg); if (i > 0) joints.push(seg);
      const r = f.r * (1 - i * 0.16); seg.add(at(boneSeg(L - 0.012, r, X.bone), 0, 0.006, 0));
      const sk = new THREE.Mesh(new THREE.CapsuleGeometry(r * 2.15, L - 0.02, 6, 16), X.skin); sk.position.y = L / 2; seg.add(sk);
      if (i === f.L.length - 1) { const nail = new THREE.Mesh(new THREE.SphereGeometry(r * 1.6, 12, 8), X.nail); nail.scale.set(1, 1.4, 0.35); nail.position.set(0, L * 0.7, -r * 1.5); seg.add(nail); }
      parent = seg; y = L;
    });
    fingers.push({ root, joints, k: k.clone() });
  }
  // carpo, radio y cúbito
  for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.024 + hash(i) * 0.008, 12, 10), X.bone); c.position.set(-0.07 + (i % 4) * 0.048 + hash(i * 3) * 0.01, 0.035 + Math.floor(i / 4) * 0.045, (hash(i * 7) - 0.5) * 0.02); c.scale.set(1, 0.85, 0.8); g.add(c); }
  g.add(boneBetween(v3(0.06, -0.42, 0), v3(0.07, 0.0, 0), 0.026, X.bone), boneBetween(v3(-0.055, -0.42, 0), v3(-0.05, -0.01, 0), 0.022, X.bone));
  // piel de la palma y del antebrazo
  const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.2, 8, 24), X.skin); palm.scale.set(1.2, 1.1, 0.42); palm.position.set(0.015, 0.25, 0); g.add(palm);
  const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.105, 0.6, 28, 1, true), X.skin); fore.position.set(0.005, -0.28, 0); fore.scale.z = 0.62; g.add(fore);
  // destellos de los nudillos (uno por dedo)
  const fl = canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(170,220,255,.8)'); gr.addColorStop(1, 'rgba(80,160,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const flashes = fingers.map(f => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fl, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false })); sp.position.copy(f.k); sp.position.z = 0.03; sp.scale.setScalar(0.0001); sp.renderOrder = 9; g.add(sp); return sp; });
  g.scale.setScalar(s); g.userData = { fingers, flashes, s0: s }; return g;
}
// pose de los dedos: ang[i] = flexión del nudillo (rad); la articulación de en medio acompaña un poco
function handPose(h, ang) { h.userData.fingers.forEach((f, i) => { const a = ang[i] || 0; f.root.rotation.x = a; for (let j = 1; j < f.joints.length; j++) f.joints[j].rotation.x = a * (j === 1 ? 0.45 : 0.3); }); }
// ---------- maqueta del nudillo en corte (frase 3): cabeza del metacarpiano, base de la falange, cartílago, cápsula, líquido y la burbuja
function knuckleModel() {
  const g = new THREE.Group();
  const boneM = new THREE.MeshPhysicalMaterial({ color: 0xe8dcc4, roughness: 0.55, clearcoat: 0.25 }), cart = new THREE.MeshPhysicalMaterial({ color: 0xcfe3f2, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  const meta = lathe([[0.0, -0.5], [0.06, -0.5], [0.055, -0.3], [0.06, -0.16], [0.09, -0.08], [0.105, -0.02], [0.1, 0.02], [0.07, 0.07], [0.0, 0.085]], 40, boneM); meta.rotation.z = -Math.PI / 2; meta.position.x = -0.12; g.add(meta);
  const capA = new THREE.Mesh(new THREE.SphereGeometry(0.098, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), cart); capA.rotation.z = -Math.PI / 2; capA.position.x = -0.122; g.add(capA);
  const ph = new THREE.Group(); g.add(ph);
  const prox = lathe([[0.0, 0.42], [0.05, 0.42], [0.045, 0.2], [0.055, 0.08], [0.085, 0.02], [0.09, 0.0], [0.0, 0.0]], 40, boneM); prox.rotation.z = -Math.PI / 2; prox.position.x = 0.0; ph.add(prox);
  const cup = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 12, 0, Math.PI * 2, Math.PI * 0.8, Math.PI * 0.2), cart); cup.rotation.z = -Math.PI / 2; cup.position.x = 0.11; ph.add(cup);
  const caps = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshPhysicalMaterial({ color: 0xf2d9c6, roughness: 0.2, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide })); caps.scale.set(0.2, 0.15, 0.15); caps.renderOrder = 6; g.add(caps);
  const fluid = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0xf2b24a, emissive: 0x6b3a08, emissiveIntensity: 0.6, roughness: 0.1, transparent: true, opacity: 0.38, depthWrite: false })); fluid.scale.set(0.045, 0.11, 0.11); fluid.renderOrder = 5; g.add(fluid);
  const bub = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.55, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.3, emissive: 0x88c8ff, emissiveIntensity: 0.4, depthWrite: false })); bub.scale.setScalar(0.0001); bub.renderOrder = 7; g.add(bub);
  g.userData = { ph, fluid, bub, caps }; return g;
}
// manómetro de latón (la presión cae): esfera con aguja
function gauge() {
  const tex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#f4efe2'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 6, 0, 7); c.fill(); c.strokeStyle = '#2b2218'; c.lineWidth = 6;
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.75 + 1.5 * i / 10); c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * 200, h / 2 + Math.sin(a) * 200); c.lineTo(w / 2 + Math.cos(a) * 228, h / 2 + Math.sin(a) * 228); c.stroke(); }
    c.fillStyle = '#c62828'; c.beginPath(); c.arc(w / 2, h / 2, 200, Math.PI * 0.75, Math.PI * 1.05); c.arc(w / 2, h / 2, 186, Math.PI * 1.05, Math.PI * 0.75, true); c.fill();
    c.fillStyle = '#2b2218'; c.font = '800 46px Inter'; c.textAlign = 'center'; c.fillText('PRESIÓN', w / 2, h * 0.72); });
  const g = new THREE.Group(); const rim = cyl(0.11, 0.11, 0.035, M.brass, 48); rim.rotation.x = Math.PI / 2; g.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.1, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })); face.position.z = 0.018; g.add(face);
  const nd = new THREE.Group(); nd.position.z = 0.021; const n = mesh(new THREE.BoxGeometry(0.006, 0.085, 0.003).translate(0, 0.035, 0), new THREE.MeshStandardMaterial({ color: 0x111111 })); nd.add(n); g.add(nd);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.1, 48), M.glass); glass.position.z = 0.024; g.add(glass);
  const st = cyl(0.012, 0.012, 0.18, M.brass, 12); st.position.y = -0.18; g.add(st); const ft = cyl(0.06, 0.07, 0.02, M.wood, 32); ft.position.y = -0.27; g.add(ft);
  g.userData.nd = nd; return g;
}
// ---------- resonancia en miniatura (anillo, carcasa y camilla) y su monitor con la imagen del dedo (k: la cavidad aparece)
function mriMachine() {
  const g = new THREE.Group(), wm = new THREE.MeshPhysicalMaterial({ color: 0xf1f3f5, roughness: 0.3, clearcoat: 0.8 });
  const body = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.09, 24, 64), wm); body.position.y = 0.3; body.scale.z = 1.6; g.add(body);
  const box = rbox(0.62, 0.6, 0.26, wm, 0.06); box.position.y = 0.3; g.add(box);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.3, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.6, side: THREE.BackSide })); hole.rotation.x = Math.PI / 2; hole.position.y = 0.3; g.add(hole);
  const bed = rbox(0.18, 0.5, 0.05, wm, 0.02); bed.rotation.x = Math.PI / 2; bed.position.set(0, 0.17, 0.35); g.add(bed);
  const leg = rbox(0.12, 0.14, 0.2, M.dsteel, 0.02); leg.position.set(0, 0.07, 0.42); g.add(leg);
  const strip = rbox(0.4, 0.02, 0.27, new THREE.MeshStandardMaterial({ color: 0x46b4ff, emissive: 0x46b4ff, emissiveIntensity: 0.8 }), 0.005); strip.position.set(0, 0.52, 0.0); g.add(strip);
  return g;
}
function mriScreen() {
  const tex = canvasTex(720, 900, () => {}); let lk = -1;
  const scr = mesh(new THREE.PlaneGeometry(0.3, 0.375), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), false); scr.position.set(0, 0.38, 0.016);
  const fr = rbox(0.33, 0.405, 0.03, M.black, 0.01); fr.position.y = 0.38; const st = cyl(0.012, 0.012, 0.18, M.dsteel, 12); st.position.y = 0.09; const ft = rbox(0.16, 0.1, 0.012, M.dsteel, 0.006); ft.rotation.x = Math.PI / 2; ft.position.y = 0.006;
  const g = grp(fr, scr, st, ft);
  g.userData.draw = (k) => { k = Math.round(k * 40) / 40; if (k === lk) return; lk = k; const c = tex.userData.g, w = 720, h = 900; c.fillStyle = '#020304'; c.fillRect(0, 0, w, h);
    const gap = 18 + 26 * clamp(k * 1.5);
    const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#3a3d42'); gr.addColorStop(0.5, '#5d6168'); gr.addColorStop(1, '#3a3d42');
    c.fillStyle = 'rgba(120,124,132,.55)'; c.beginPath(); c.ellipse(w / 2, h / 2, 170, 400, 0, 0, 7); c.fill();
    c.fillStyle = '#d9dde3'; c.beginPath(); c.ellipse(w / 2, h / 2 + 230 + gap / 2, 70, 190, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(w / 2, h / 2 - 230 - gap / 2, 78, 200, 0, 0, 7); c.fill();
    c.fillStyle = '#9aa0a8'; c.beginPath(); c.ellipse(w / 2, h / 2 - 40 - gap / 2, 84, 46, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(w / 2, h / 2 + 44 + gap / 2, 80, 42, 0, 0, 7); c.fill();
    if (k > 0.35) { const r = 34 * clamp((k - 0.35) / 0.3); c.fillStyle = '#000'; c.beginPath(); c.ellipse(w / 2, h / 2, r * 1.6, r, 0, 0, 7); c.fill(); }
    c.fillStyle = '#7f8792'; c.font = '700 30px DejaVuMono'; c.textAlign = 'left'; c.fillText('RM · DEDO', 30, 50); c.textAlign = 'right'; c.fillText((0.31 * clamp(k)).toFixed(2).replace('.', ',') + ' s', w - 30, 50);
    tex.needsUpdate = true; };
  g.userData.draw(0); return g;
}
// ---------- campana de cristal con su burbuja (frase 5)
function bellJar() {
  const g = new THREE.Group(); const base = cyl(0.13, 0.14, 0.04, M.wood, 48); base.position.y = 0.02; g.add(base);
  const dome = lathe([[0.0, 0.42], [0.04, 0.418], [0.09, 0.39], [0.115, 0.32], [0.12, 0.2], [0.12, 0.04], [0.112, 0.04], [0.112, 0.2], [0.107, 0.31], [0.083, 0.378], [0.037, 0.406], [0.0, 0.408]], 48, M.glass); dome.renderOrder = 7; g.add(dome);
  const liq = cyl(0.105, 0.105, 0.18, new THREE.MeshPhysicalMaterial({ color: 0xf2b24a, emissive: 0x6b3a08, emissiveIntensity: 0.5, transparent: true, opacity: 0.3, depthWrite: false }), 40); liq.position.y = 0.13; liq.renderOrder = 5; g.add(liq);
  const bub = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.55, clearcoat: 1, iridescence: 1, emissive: 0x88c8ff, emissiveIntensity: 0.45, depthWrite: false })); bub.position.y = 0.13; bub.renderOrder = 6; g.add(bub);
  const bits = []; for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), bub.material); b.scale.setScalar(0.0001); b.position.y = 0.13; g.add(b); bits.push(b); }
  g.userData = { bub, bits }; return g;
}
// ---------- reloj de 20 minutos (frase 6)
function clock20() {
  const tex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#f4efe2'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 6, 0, 7); c.fill(); c.fillStyle = '#2b2218'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI * 2; c.fillRect(w / 2 + Math.cos(a) * 205 - 3, h / 2 + Math.sin(a) * 205 - 3, 6, 6); if (i % 5 === 0) { c.font = '800 44px Inter'; c.fillText(String(i), w / 2 + Math.cos(a) * 160, h / 2 + Math.sin(a) * 160); } }
    c.font = '700 30px Inter'; c.fillText('MINUTOS', w / 2, h * 0.68); });
  const g = new THREE.Group(); const rim = cyl(0.15, 0.15, 0.04, M.brass, 48); rim.rotation.x = Math.PI / 2; g.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.138, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })); face.position.z = 0.021; g.add(face);
  const hd = new THREE.Group(); hd.position.z = 0.025; hd.add(mesh(new THREE.BoxGeometry(0.008, 0.12, 0.003).translate(0, 0.05, 0), new THREE.MeshStandardMaterial({ color: 0xc62828 }))); g.add(hd);
  const sweep = new THREE.Mesh(new THREE.CircleGeometry(0.134, 48, Math.PI / 2, 0.001), new THREE.MeshBasicMaterial({ color: 0x46b4ff, transparent: true, opacity: 0.25, depthWrite: false })); sweep.position.z = 0.023; g.add(sweep);
  const st = cyl(0.012, 0.012, 0.2, M.brass, 12); st.position.y = -0.24; g.add(st); const ft = cyl(0.07, 0.08, 0.02, M.wood, 32); ft.position.y = -0.34; g.add(ft);
  g.userData = { hd, sweep }; return g;
}
// ---------- caja de luz (negatoscopio) con dos radiografías de manos sin artritis (frase 8)
function radiographTex(left) {
  return canvasTex(400, 520, (c, w, h) => { c.fillStyle = '#0b0f14'; c.fillRect(0, 0, w, h); c.save(); if (left) { c.translate(w, 0); c.scale(-1, 1); }
    c.strokeStyle = 'rgba(210,225,240,.9)'; c.lineCap = 'round';
    const fingers = [[230, 300, 290, 150, 9], [205, 250, 215, 60, 8], [180, 245, 180, 40, 8.5], [155, 250, 148, 62, 8], [132, 262, 112, 100, 7]];
    for (const [x0, y0, x1, y1, r] of fingers) { const segs = 4; for (let i = 0; i < segs; i++) { const a = i / segs, b = (i + 0.86) / segs; c.lineWidth = r * 2 * (1 - i * 0.12); c.beginPath(); c.moveTo(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a); c.lineTo(x0 + (x1 - x0) * b, y0 + (y1 - y0) * b); c.stroke(); } }
    c.lineWidth = 20; for (const [x0, x1] of [[200, 205], [160, 165]]) { c.beginPath(); c.moveTo(x0, 330); c.lineTo(x1, 500); c.stroke(); }
    c.fillStyle = 'rgba(210,225,240,.8)'; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(150 + (i % 4) * 22, 290 + Math.floor(i / 4) * 22, 10, 0, 7); c.fill(); }
    c.restore(); c.fillStyle = 'rgba(160,190,220,.8)'; c.font = '700 22px DejaVuMono'; c.fillText(left ? 'IZQUIERDA · CRUJE' : 'DERECHA · NO CRUJE', 18, 34); });
}
function lightBox() {
  const g = new THREE.Group(); const box = rbox(0.62, 0.42, 0.06, M.dsteel, 0.012); box.position.y = 0.36; g.add(box);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.38), new THREE.MeshBasicMaterial({ color: 0xf2f6ff, toneMapped: false })); glow.position.set(0, 0.36, 0.031); g.add(glow);
  const films = [true, false].map((l, i) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.338), new THREE.MeshBasicMaterial({ map: radiographTex(l), transparent: true, opacity: 0.94, toneMapped: false })); f.position.set(-0.145 + i * 0.29, 0.36, 0.034); g.add(f); return f; });
  const st = cyl(0.014, 0.014, 0.16, M.dsteel, 12); st.position.y = 0.08; g.add(st); const ft = rbox(0.24, 0.12, 0.014, M.dsteel, 0.006); ft.rotation.x = Math.PI / 2; ft.position.y = 0.007; g.add(ft);
  g.userData = { films, glow }; return g;
}
// ---------- el premio (estatuilla de latón con su placa)
function prize() {
  const g = new THREE.Group(); const base = rbox(0.12, 0.12, 0.05, M.wood, 0.008); base.rotation.x = Math.PI / 2; base.position.y = 0.025; g.add(base);
  const cup = lathe([[0.0, 0.05], [0.025, 0.05], [0.012, 0.07], [0.01, 0.12], [0.03, 0.14], [0.055, 0.2], [0.06, 0.26], [0.0, 0.26]], 40, M.gold); g.add(cup);
  for (const sd of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.005, 8, 24, Math.PI), M.gold); h.position.set(sd * 0.06, 0.22, 0); h.rotation.z = sd > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(h); }
  const t = canvasTex(512, 160, (c, w, h) => { c.fillStyle = '#c9a24d'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a1d0c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 62px Inter'; c.fillText('IG NOBEL', w / 2, 58); c.font = '700 40px Inter'; c.fillText('MEDICINA · 2009', w / 2, 120); });
  const pl = mesh(new THREE.PlaneGeometry(0.1, 0.031), new THREE.MeshPhysicalMaterial({ map: t, metalness: 0.7, roughness: 0.3 }), false); pl.position.set(0, 0.025, 0.061); g.add(pl); return g;
}
