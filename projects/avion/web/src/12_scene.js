// ---------------------------------------------------------------- «Por qué vuela un avión»: un aula en corte (sin techo ni pared delantera) en un campo,
// de día; la pizarra con el dibujo de siempre; un avión de pasajeros gigante (genérico: sin aerolínea ni logotipos) que pasa por encima;
// un túnel de viento en el aula con el ala en corte y su humo CALCULADO (ala de Joukowski con la condición de Kutta: el aire de arriba llega
// antes de verdad); un avión acrobático boca abajo; el aire empujado hacia abajo; la presión en colores; la estela del avión.
const ROOM = { w: 8, d: 6, h: 3.2 };                       // el aula: x ∈ [-4, 4], z ∈ [-3, 3]
const BOARD = { w: 4.2, h: 1.5, y: 1.65, z: -2.97 };       // la pizarra
const TUN = { x: 0.4, y: 1.55, z: 0.65, L: 4.0, H: 1.3, D: 1.0 };   // el túnel de viento (centro del ala)
const CHORD = 1.4;

// ---------------------------------------------------------------- el ala de Joukowski y su flujo (potencial, con Kutta)
const JK = { mu: { x: -0.09, y: 0.11 } };
JK.R = Math.hypot(1 - JK.mu.x, -JK.mu.y); JK.beta = Math.asin(JK.mu.y / JK.R);
const cadd = (a, b) => ({ x: a.x + b.x, y: a.y + b.y }), csub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const cmul = (a, b) => ({ x: a.x * b.x - a.y * b.y, y: a.x * b.y + a.y * b.x });
const cdiv = (a, b) => { const d = b.x * b.x + b.y * b.y; return { x: (a.x * b.x + a.y * b.y) / d, y: (a.y * b.x - a.x * b.y) / d }; };
const csqrt = a => { const r = Math.hypot(a.x, a.y), t = Math.atan2(a.y, a.x) / 2, s = Math.sqrt(r); return { x: s * Math.cos(t), y: s * Math.sin(t) }; };
const jk = z => cadd(z, cdiv({ x: 1, y: 0 }, z));                         // ζ → z
function jkInv(z) {                                                       // z → ζ (la rama de fuera del círculo)
  const s = csqrt(csub(cmul(z, z), { x: 4, y: 0 })), a = { x: (z.x + s.x) / 2, y: (z.y + s.y) / 2 }, b = { x: (z.x - s.x) / 2, y: (z.y - s.y) / 2 };
  return Math.hypot(a.x - JK.mu.x, a.y - JK.mu.y) >= Math.hypot(b.x - JK.mu.x, b.y - JK.mu.y) ? a : b;
}
function dwdzeta(zt, al) {                                                // velocidad compleja en el plano ζ (U = 1, ángulo de ataque al)
  const d = csub(zt, JK.mu), e1 = { x: Math.cos(al), y: -Math.sin(al) }, e2 = { x: Math.cos(al), y: Math.sin(al) };
  const G = 4 * Math.PI * JK.R * Math.sin(al + JK.beta);
  return cadd(csub(e1, cmul({ x: JK.R * JK.R, y: 0 }, cdiv(e2, cmul(d, d)))), cdiv({ x: 0, y: G / (2 * Math.PI) }, d));
}
function velZ(z, al) {                                                    // (u, v) en el plano del ala
  const zt = jkInv(z), A = dwdzeta(zt, al), B = csub({ x: 1, y: 0 }, cdiv({ x: 1, y: 0 }, cmul(zt, zt))), w = cdiv(A, B);
  return { x: w.x, y: -w.y, zt };
}
// trayectoria de una partícula (integración en ζ: dζ/dt = conj(dw/dζ) / |dz/dζ|²), muestreada cada dt
function jkPath(z0, al, T, dt) {
  let zt = jkInv(z0); const out = [];
  const f = p => { const A = dwdzeta(p, al), B = csub({ x: 1, y: 0 }, cdiv({ x: 1, y: 0 }, cmul(p, p))), b2 = B.x * B.x + B.y * B.y; return { x: A.x / Math.max(b2, 1e-6), y: -A.y / Math.max(b2, 1e-6) }; };
  const sub = 6, h = dt / sub;
  for (let k = 0; k <= T / dt; k++) {
    out.push(jk(zt));
    for (let s = 0; s < sub; s++) {
      const k1 = f(zt), k2 = f({ x: zt.x + k1.x * h / 2, y: zt.y + k1.y * h / 2 }), k3 = f({ x: zt.x + k2.x * h / 2, y: zt.y + k2.y * h / 2 }), k4 = f({ x: zt.x + k3.x * h, y: zt.y + k3.y * h });
      zt = { x: zt.x + h * (k1.x + 2 * k2.x + 2 * k3.x + k4.x) / 6, y: zt.y + h * (k1.y + 2 * k2.y + 2 * k3.y + k4.y) / 6 };
      const d = Math.hypot(zt.x - JK.mu.x, zt.y - JK.mu.y); if (d < JK.R * 1.003) { const s2 = JK.R * 1.003 / d; zt = { x: JK.mu.x + (zt.x - JK.mu.x) * s2, y: JK.mu.y + (zt.y - JK.mu.y) * s2 }; }
    }
  }
  return out;
}
// del plano del ala (cuerda ≈ 4) al mundo: girado -α (el viento llega horizontal y el ala se levanta α) y a escala
const JS = CHORD / 4.1;
function zWorld(z, al, out = new THREE.Vector3()) { const c = Math.cos(-al), s = Math.sin(-al); return out.set(TUN.x + JS * (z.x * c - z.y * s), TUN.y + JS * (z.x * s + z.y * c), TUN.z); }
function airfoilPts(n = 160) { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push(jk({ x: JK.mu.x + JK.R * Math.cos(a), y: JK.mu.y + JK.R * Math.sin(a) })); } return pts; }

// ---------------------------------------------------------------- texturas
// la pizarra en dos capas: el fondo (con el título, siempre) y el dibujo de tiza (el ala, los caminos, los rótulos), que se despega
// cuando el ala sale de la pizarra y vuelve a aparecer al final (bucle)
const BD = { cx: 1000, cy: 420, sc: 240, W: 2048, H: 732 };
BD.x0 = (BD.cx / BD.W - 0.5) * BOARD.w; BD.y0 = BOARD.y + (0.5 - BD.cy / BD.H) * BOARD.h; BD.k = BD.sc * BOARD.w / BD.W / JS;   // dónde está el ala de tiza y a qué escala
function boardBaseTex() {
  return canvasTex(BD.W, BD.H, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1e3a2b'); gr.addColorStop(1, '#183126'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.012 + hash(i) * 0.03})`; g.beginPath(); g.ellipse(hash(i * 2.1) * w, hash(i * 3.7) * h, 60 + hash(i * 5.3) * 200, 20 + hash(i * 7.1) * 60, hash(i) * 3, 0, 7); g.fill(); }
    g.font = '700 70px "Bebas"'; g.fillStyle = 'rgba(245,245,238,.85)'; g.fillText('¿POR QUÉ VUELA UN AVIÓN?', 90, 110);
  });
}
function boardDrawTex() {
  return canvasTex(BD.W, BD.H, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const chalk = (draw, lw = 6, col = 'rgba(245,245,238,') => { for (let k = 0; k < 3; k++) { g.strokeStyle = col + (0.35 + k * 0.2) + ')'; g.lineWidth = lw - k * 1.5; g.lineCap = 'round'; g.lineJoin = 'round'; g.save(); g.translate((hash(k * 3.3) - 0.5) * 2.5, (hash(k * 5.1) - 0.5) * 2.5); draw(); g.restore(); } };
    // el perfil del ala
    const P = airfoilPts(120), cx = BD.cx, cy = BD.cy, sc = BD.sc;
    chalk(() => { g.beginPath(); P.forEach((p, i) => { const x = cx + p.x * sc, y = cy - p.y * sc; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); }, 7);
    // los dos caminos «a la vez»
    g.setLineDash([22, 18]);
    chalk(() => { g.beginPath(); g.moveTo(cx - 640, cy - 10); g.lineTo(cx - 520, cy - 10); g.bezierCurveTo(cx - 420, cy - 210, cx + 280, cy - 170, cx + 560, cy - 30); g.stroke(); }, 5, 'rgba(255,214,120,');
    chalk(() => { g.beginPath(); g.moveTo(cx - 640, cy + 10); g.lineTo(cx - 520, cy + 10); g.bezierCurveTo(cx - 380, cy + 110, cx + 260, cy + 90, cx + 560, cy + 10); g.stroke(); }, 5, 'rgba(140,210,255,');
    g.setLineDash([]);
    g.font = '700 54px "Bebas"'; g.fillStyle = 'rgba(255,214,120,.9)'; g.fillText('A: MÁS CAMINO', cx - 300, cy - 200);
    g.fillStyle = 'rgba(140,210,255,.9)'; g.fillText('B', cx - 300, cy + 150);
    g.fillStyle = 'rgba(245,245,238,.9)'; g.font = '700 62px "Bebas"'; g.fillText('¡LLEGAN A LA VEZ!', cx + 470, cy - 70);
    g.font = '700 58px "Bebas"'; g.fillText('→ VA MÁS RÁPIDO → MENOS PRESIÓN', 110, h - 70);
  });
}
function crossTex() {                                       // la equis roja de rotulador encima del dibujo
  return canvasTex(1024, 366, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#ff3b3b'; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { g.lineWidth = 26 - k * 6; g.globalAlpha = 0.55 + k * 0.2; g.beginPath(); g.moveTo(160 + k * 3, 50); g.lineTo(860, 320 - k * 2); g.moveTo(860 - k * 2, 46); g.lineTo(170, 318); g.stroke(); } });
}
function skyDome() {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = clamp(vP.y, -0.2, 1.0); vec3 top = vec3(0.07, 0.27, 0.74), hor = vec3(0.70, 0.84, 1.0), low = vec3(0.62, 0.74, 0.86); vec3 c = h > 0. ? mix(hor, top, pow(h, 0.42)) : mix(hor, low, -h * 5.); gl_FragColor = vec4(c * 1.08, 1.); }' });
  const s = new THREE.Mesh(new THREE.SphereGeometry(380, 32, 16), m); s.renderOrder = -2; return s;
}
function cloudTex(seed) {
  return canvasTex(512, 256, (g, w, h) => { g.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const x = w * (0.18 + hash(i * 3.1 + seed) * 0.64), y = h * (0.45 + hash(i * 5.3 + seed) * 0.25), r = 40 + hash(i * 7.7 + seed) * 70;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } });
}
function grassTex() {
  const t = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#6fa64a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '40,90,30' : '150,200,90'},${0.08 + hash(i * 3.3) * 0.12})`; g.fillRect(hash(i * 1.7) * w, hash(i * 2.9) * h, 3, 7); } });
  return repTex(t, 40, 40);
}
function pressureTex(al) {                                  // presión alrededor del ala (Cp): azul donde baja, rojo donde sube
  const W2 = 640, H2 = 320, X0 = -2.2, X1 = 2.4, Y0 = -1.15, Y1 = 1.15;   // en metros, respecto al centro del ala
  return canvasTex(W2, H2, (g) => {
    const img = g.createImageData(W2, H2), poly = airfoilPts(200);
    for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
      const X = X0 + (X1 - X0) * i / (W2 - 1), Y = Y1 - (Y1 - Y0) * j / (H2 - 1);
      const c = Math.cos(al), s = Math.sin(al), zx = (X * c - Y * s) / JS, zy = (X * s + Y * c) / JS;      // deshace el giro -α
      let inside = false; for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) { const pa = poly[a], pb = poly[b]; if ((pa.y > zy) !== (pb.y > zy) && zx < (pb.x - pa.x) * (zy - pa.y) / (pb.y - pa.y) + pa.x) inside = !inside; }
      const k = (j * W2 + i) * 4; if (inside) { img.data[k + 3] = 0; continue; }
      const v = velZ({ x: zx, y: zy }, al), cp = 1 - (v.x * v.x + v.y * v.y), q = cp > 0 ? Math.min(1, cp / 0.55) : Math.max(-1, cp / 1.6);
      const r = q > 0 ? 255 : 255 * (1 + q * 0.75), gg = q > 0 ? 255 * (1 - q * 0.75) : 255 * (1 + q * 0.45), bb = q > 0 ? 255 * (1 - q * 0.85) : 255;
      const fall = Math.min(1, Math.max(0, 1.25 - Math.hypot(X / 2.2, Y / 1.1)));
      img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = bb; img.data[k + 3] = 255 * Math.min(1, Math.abs(q) * 1.4) * fall * 0.85;
    }
    g.putImageData(img, 0, 0);
  });
}

// ---------------------------------------------------------------- materiales
function buildSceneMats() {
  M.wall = new THREE.MeshStandardMaterial({ color: 0xf1e9da, roughness: 0.9 });
  M.wall2 = new THREE.MeshStandardMaterial({ color: 0xcfe1d8, roughness: 0.9 });
  M.board = new THREE.MeshStandardMaterial({ map: boardBaseTex(), roughness: 0.95 });
  M.boardDraw = new THREE.MeshStandardMaterial({ map: boardDrawTex(), roughness: 0.95, transparent: true, depthWrite: false });
  M.boardFrame = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.6 });
  M.cross = new THREE.MeshBasicMaterial({ map: crossTex(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  M.deskTop = M.wood; M.leg = metal(0x9aa3ad, 0.4); M.chair = plastic(0x3c7bd6, 0.4);
  M.grass = new THREE.MeshStandardMaterial({ map: grassTex(), roughness: 0.95 });
  M.plane = paint(0xf4f6f9, 0.28); M.belly = paint(0xdfe5ec, 0.32); M.tail = paint(0x1b3a6b, 0.3); M.stripe = paint(0x24b3c4, 0.3);
  M.engine = metal(0xb9c0c8, 0.3); M.fan = new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.4, metalness: 0.6 });
  M.win = new THREE.MeshStandardMaterial({ color: 0x0f1724, roughness: 0.15, metalness: 0.5 });
  M.acro = paint(0xe8322f, 0.25); M.acro2 = paint(0xf6f6f6, 0.25);
  M.foil = new THREE.MeshPhysicalMaterial({ color: 0xe9edf2, roughness: 0.25, metalness: 0.3, clearcoat: 1 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.035, roughness: 0.05, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  M.tunBack = new THREE.MeshBasicMaterial({ color: 0x040507, transparent: true, opacity: 1, toneMapped: false });
  M.smoke = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(1.2), transparent: true, opacity: 0.9, toneMapped: false });
  M.balA = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb13b).multiplyScalar(1.6), toneMapped: false });
  M.balB = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x46b8ff).multiplyScalar(1.6), toneMapped: false });
  M.block = new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = 'rgba(190,232,255,.38)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(40,130,255,1)'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12); g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 4; g.strokeRect(13, 13, w - 26, h - 26); }),
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  M.wake = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd8f2ff).multiplyScalar(1.3), transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
  M.arrUp = new THREE.MeshPhysicalMaterial({ color: 0xff9a2e, roughness: 0.3, clearcoat: 1, emissive: 0x6a2a00, emissiveIntensity: 0.6 });
  M.arrDn = new THREE.MeshPhysicalMaterial({ color: 0x3aa8ff, roughness: 0.3, clearcoat: 1, emissive: 0x00305a, emissiveIntensity: 0.6 });
}

// ---------------------------------------------------------------- piezas
function desk() {
  const g = new THREE.Group(); g.add(at(mesh(new THREE.BoxGeometry(1.1, 0.04, 0.55), M.deskTop), 0, 0.74, 0));
  for (const [x, z] of [[-0.5, -0.22], [0.5, -0.22], [-0.5, 0.22], [0.5, 0.22]]) g.add(at(mesh(new THREE.BoxGeometry(0.035, 0.72, 0.035), M.leg), x, 0.36, z));
  const ch = new THREE.Group(); ch.add(at(mesh(new THREE.BoxGeometry(0.42, 0.04, 0.4), M.chair), 0, 0.45, 0)); ch.add(at(mesh(new THREE.BoxGeometry(0.42, 0.36, 0.035), M.chair), 0, 0.66, 0.2));
  for (const [x, z] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) ch.add(at(mesh(new THREE.BoxGeometry(0.025, 0.45, 0.025), M.leg), x, 0.225, z));
  ch.position.set(0, 0, 0.55); g.add(ch); return g;
}
function airliner() {                                       // avión de pasajeros de dos pisos, genérico: 46 m de largo
  const g = new THREE.Group(), L = 46, R0 = 3.0;
  const prof = []; for (let i = 0; i <= 40; i++) { const u = i / 40, x = u * L; let r;
    if (u < 0.1) r = R0 * Math.sqrt(1 - Math.pow(1 - u / 0.1, 2)); else if (u < 0.72) r = R0; else r = R0 * (1 - Math.pow((u - 0.72) / 0.28, 1.6) * 0.86); prof.push(new THREE.Vector2(Math.max(0.05, r), x)); }
  prof[0].x = 0.001; prof[prof.length - 1].x = 0.3;
  const fus = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), M.plane); fus.rotation.z = -Math.PI / 2; fus.position.x = -L / 2; fus.scale.set(1, 1, 1); fus.castShadow = true;
  const F = new THREE.Group(); F.add(fus); F.scale.set(1, 1.18, 1); g.add(F);
  // la cola sube (el cono de cola) y la panza más clara
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(R0 * 0.985, R0 * 0.985, L * 0.6, 40, 1, true, Math.PI * 0.7, Math.PI * 0.6), M.belly); belly.rotation.z = Math.PI / 2; belly.position.set(-L * 0.08, 0, 0); F.add(belly);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(R0 * 1.004, R0 * 1.004, L * 0.62, 40, 1, true, Math.PI * 0.46, Math.PI * 0.035), M.stripe); st.rotation.z = Math.PI / 2; st.position.set(-L * 0.07, 0, 0); F.add(st);
  const st2 = st.clone(); st2.rotation.x = Math.PI; F.add(st2);
  // ventanillas: dos pisos, a los dos lados
  const wg = new THREE.BoxGeometry(0.32, 0.42, 0.06), N = 46, wins = new THREE.InstancedMesh(wg, M.win, N * 4); let k = 0;
  for (const side of [-1, 1]) for (const deck of [0, 1]) for (let i = 0; i < N; i++) { const x = -L / 2 + L * 0.13 + i * (L * 0.56 / N);
    _o.position.set(x, deck ? 1.35 : -0.25, side * (R0 - 0.02)); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); _o.updateMatrix(); wins.setMatrixAt(k++, _o.matrix); }
  F.add(wins);
  const ck = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 3.0), M.win); ck.position.set(-L / 2 + 2.6, 1.5, 0); ck.rotation.z = -0.35; F.add(ck);
  // alas en flecha (planta extruida, con diedro)
  const wing = (side) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(9.5, 28); s.lineTo(13, 28); s.lineTo(14.5, 0); s.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelSegments: 2 }); geo.rotateX(Math.PI / 2); geo.translate(0, 0.27, 0);
    const m = new THREE.Mesh(geo, M.plane); m.castShadow = true; m.scale.z = side; m.position.set(-5, -1.6, 0); m.rotation.x = -side * 0.09; return m; };
  S.wings = [wing(1), wing(-1)]; S.wings.forEach(w => g.add(w));
  // motores
  for (const side of [-1, 1]) for (const f of [0.33, 0.64]) { const z = side * 28 * f, x = -5 + 9.5 * f - 1.0;
    const n = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.05, 5.2, 28), M.engine); n.rotation.z = Math.PI / 2; n.position.set(x - 1.5, -3.75 + 0.0899 * Math.abs(z), z); n.castShadow = true; g.add(n);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(1.15, 28), M.fan); fan.rotation.y = -Math.PI / 2; fan.position.set(x - 4.12, n.position.y, z); g.add(fan); fan.position.x = n.position.x - 2.62;
    const py = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 0.3), M.plane); py.position.set(x - 0.4, n.position.y + 1.3, z); g.add(py); }
  // cola: deriva y estabilizadores
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(6.5, 10.5); fin.lineTo(10, 10.5); fin.lineTo(10.5, 0); fin.lineTo(0, 0);
  const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.45, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.15, bevelSegments: 2 }); fg.translate(0, 0, -0.22);
  const fm = new THREE.Mesh(fg, M.tail); fm.position.set(L / 2 - 12, 2.2, 0); fm.castShadow = true; g.add(fm);
  for (const side of [-1, 1]) { const hs = new THREE.Shape(); hs.moveTo(0, 0); hs.lineTo(4.5, 9); hs.lineTo(6.8, 9); hs.lineTo(7.5, 0);
    const hg2 = new THREE.ExtrudeGeometry(hs, { depth: 0.35, bevelEnabled: false }); hg2.rotateX(Math.PI / 2); const h = new THREE.Mesh(hg2, M.plane); h.scale.z = side; h.position.set(L / 2 - 9.5, 1.1, 0); h.castShadow = true; g.add(h); }
  g.userData.L = L; return g;
}
function acroPlane() {                                      // avioneta acrobática roja (genérica)
  const g = new THREE.Group(), prof = [];
  for (let i = 0; i <= 20; i++) { const u = i / 20; prof.push(new THREE.Vector2(Math.max(0.02, 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * 0.55)), u * 7)); }
  prof[0].x = 0.001;
  const f = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), M.acro); f.rotation.z = -Math.PI / 2; f.position.x = -3.5; f.castShadow = true; g.add(f);
  g.add(at(mesh(new THREE.BoxGeometry(1.5, 0.14, 8.5), M.acro2), -1.2, -0.15, 0));
  g.add(at(mesh(new THREE.BoxGeometry(0.9, 0.08, 3.0), M.acro2), 3.0, 0.2, 0));
  g.add(at(mesh(new THREE.BoxGeometry(1.2, 1.3, 0.08), M.acro), 3.2, 0.75, 0));
  const can = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.win); can.scale.set(1.6, 0.8, 0.8); can.position.set(-0.6, 0.35, 0); g.add(can);
  for (const z of [-0.95, 0.95]) { g.add(bar(v3(-1.6, -0.2, z * 0.35), v3(-1.75, -1.25, z), 0.06, M.leg)); const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 20), MAT.rubber); wh.rotation.x = Math.PI / 2; wh.position.set(-1.75, -1.3, z); g.add(wh); }
  g.add(bar(v3(3.2, 0.0, 0), v3(3.45, -0.45, 0), 0.04, M.leg)); { const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 14), MAT.rubber); tw.rotation.x = Math.PI / 2; tw.position.set(3.45, -0.5, 0); g.add(tw); }
  g.add(at(mesh(new THREE.BoxGeometry(1.52, 0.02, 8.52), M.acro), -1.2, -0.07, 0));      // franja roja por encima del ala blanca
  S.prop = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })); S.prop.rotation.y = Math.PI / 2; S.prop.position.x = -3.6; g.add(S.prop);
  return g;
}

// ---------------------------------------------------------------- montaje
function buildWorld() {
  scene.add(skyDome());
  const grd = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), M.grass); grd.rotation.x = -Math.PI / 2; grd.position.y = -0.01; grd.receiveShadow = true; scene.add(grd);
  S.clouds = [];
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ map: cloudTex(i + 1), transparent: true, depthWrite: false, fog: false, opacity: 0.7 }));
    const a = hash(i * 3.3) * Math.PI * 2 * 0.5 + Math.PI * 0.75, r = 230 + hash(i * 5.1) * 90; m.position.set(Math.cos(a) * r, 22 + hash(i * 7.3) * 40, Math.sin(a) * r); m.scale.setScalar(70 + hash(i * 2.2) * 50); m.lookAt(0, m.position.y, 0); scene.add(m); S.clouds.push(m); }
  // el aula
  const C = new THREE.Group(); scene.add(C); S.room = C;
  const fl = mesh(new THREE.BoxGeometry(ROOM.w, 0.12, ROOM.d), M.wood); fl.position.y = -0.06; C.add(fl);
  C.add(at(mesh(new THREE.BoxGeometry(ROOM.w + 0.3, ROOM.h, 0.22), M.wall), 0, ROOM.h / 2, -ROOM.d / 2 - 0.11));
  C.add(at(mesh(new THREE.BoxGeometry(ROOM.w + 0.3, 0.9, 0.04), M.wall2), 0, 0.45, -ROOM.d / 2 + 0.01));
  for (const sx of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(0.22, ROOM.h, ROOM.d + 0.22), M.wall); w.position.set(sx * (ROOM.w / 2 + 0.11), ROOM.h / 2, 0); C.add(w); }
  // ventana en la pared izquierda (hueco con marco y cristal)
  const win = new THREE.Group(); win.position.set(-ROOM.w / 2 + 0.005, 1.75, -0.2);
  win.add(at(mesh(new THREE.BoxGeometry(0.04, 1.3, 2.2), new THREE.MeshPhysicalMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.35, roughness: 0.05 })), 0.02, 0, 0));
  for (const z of [-1.1, 0, 1.1]) win.add(at(mesh(new THREE.BoxGeometry(0.08, 1.36, 0.06), M.boardFrame), 0.04, 0, z));
  for (const y of [-0.65, 0.65]) win.add(at(mesh(new THREE.BoxGeometry(0.08, 0.06, 2.26), M.boardFrame), 0.04, y, 0));
  C.add(win);
  // la pizarra, su marco, la tiza y la equis roja
  const bd = mesh(new THREE.PlaneGeometry(BOARD.w, BOARD.h), M.board); bd.position.set(0, BOARD.y, BOARD.z); C.add(bd); S.board = bd;
  S.boardDraw = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w, BOARD.h), M.boardDraw); S.boardDraw.position.set(0, BOARD.y, BOARD.z + 0.006); S.boardDraw.renderOrder = 3; C.add(S.boardDraw);
  for (const [w2, h2, x, y] of [[BOARD.w + 0.16, 0.08, 0, BOARD.y + BOARD.h / 2 + 0.04], [BOARD.w + 0.16, 0.08, 0, BOARD.y - BOARD.h / 2 - 0.04], [0.08, BOARD.h, -BOARD.w / 2 - 0.04, BOARD.y], [0.08, BOARD.h, BOARD.w / 2 + 0.04, BOARD.y]])
    C.add(at(mesh(new THREE.BoxGeometry(w2, h2, 0.05), M.boardFrame), x, y, BOARD.z + 0.01));
  C.add(at(mesh(new THREE.BoxGeometry(BOARD.w, 0.04, 0.1), M.boardFrame), 0, BOARD.y - BOARD.h / 2 - 0.08, BOARD.z + 0.06));
  S.cross = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w * 0.86, BOARD.h * 0.86), M.cross); S.cross.position.set(0.15, BOARD.y, BOARD.z + 0.012); S.cross.renderOrder = 4; C.add(S.cross);
  // reloj de pared
  const clk = new THREE.Group(); clk.position.set(2.9, 2.55, BOARD.z + 0.02); C.add(clk);
  clk.add(new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })));
  clk.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 8, 32), M.leg), 0, 0, 0.005));
  S.clockH = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.12, 0.01), M.fan); S.clockH.geometry.translate(0, 0.06, 0); S.clockH.position.z = 0.01; clk.add(S.clockH);
  S.clockM = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.18, 0.01), M.fan); S.clockM.geometry.translate(0, 0.09, 0); S.clockM.position.z = 0.012; clk.add(S.clockM);
  // pupitres (3 filas × 4) y la mesa del profe
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { if (r === 1 && c >= 1) continue; const d = desk(); d.position.set(-2.55 + c * 1.7, 0, -0.6 + r * 1.45); C.add(d); }
  const td = new THREE.Group(); td.position.set(-2.6, 0, -2.0); td.add(at(mesh(new THREE.BoxGeometry(1.6, 0.06, 0.8), M.wood), 0, 0.76, 0)); td.add(at(mesh(new THREE.BoxGeometry(1.5, 0.7, 0.7), M.woodD), 0, 0.37, 0)); C.add(td);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), new THREE.MeshStandardMaterial({ color: 0x3f8fd6, roughness: 0.4 })); globe.position.set(-2.1, 1.02, -2.0); C.add(globe);
  C.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.1, 16), M.leg), -2.1, 0.84, -2.0));
  // el avión gigante y la avioneta
  S.big = airliner(); scene.add(S.big);
  S.acro = acroPlane(); scene.add(S.acro);
  S.acroSmoke = new THREE.InstancedMesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.85, depthWrite: false }), 260); scene.add(S.acroSmoke);
  // los efectos del cielo: bloques de aire, estela, presión alrededor del avión
  S.blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(7, 7, 7), M.block, 140); S.blocks.renderOrder = 2; scene.add(S.blocks);
  // «la diferencia lo levanta»: flechas naranjas debajo del avión
  S.liftArrows = [0, 1, 2].map(() => { const a = arrow3(14, M.arrUp, 0.9); scene.add(a); return a; });
  S.wake = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 8, 6), M.wake, 1400); scene.add(S.wake);
  // presión alrededor del avión: halo azul encima de las alas (baja) y rojo debajo (alta), siempre de cara a la cámara
  const halo = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  S.lowP = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0x1f6dff, transparent: true, depthWrite: false, opacity: 0, fog: false }));
  S.highP = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xff3d1f, transparent: true, depthWrite: false, opacity: 0, fog: false }));
  S.lowP.material.blending = THREE.AdditiveBlending; scene.add(S.lowP, S.highP);
}
function buildTunnel() {
  const T = new THREE.Group(); scene.add(T); S.tunnel = T;
  // mesas debajo y la caja de cristal con sus aristas
  T.add(at(mesh(new THREE.BoxGeometry(TUN.L + 0.3, 0.06, TUN.D + 0.3), M.wood), TUN.x + 0.2, TUN.y - TUN.H / 2 - 0.04, TUN.z));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) T.add(at(mesh(new THREE.BoxGeometry(0.06, TUN.y - TUN.H / 2 - 0.07, 0.06), M.leg), TUN.x + 0.2 + x * (TUN.L / 2 - 0.05), (TUN.y - TUN.H / 2 - 0.07) / 2, TUN.z + z * (TUN.D / 2 - 0.05)));
  const box = new THREE.Mesh(new THREE.BoxGeometry(TUN.L, TUN.H, TUN.D), M.glass); box.position.set(TUN.x + 0.2, TUN.y, TUN.z); T.add(box); edges(box, 0xcfefff, 1.6, 28, 0.9); S.tunBox = box;
  S.tunBack = new THREE.Mesh(new THREE.PlaneGeometry(TUN.L - 0.02, TUN.H - 0.02), M.tunBack); S.tunBack.position.set(TUN.x + 0.2, TUN.y, TUN.z - TUN.D / 2 + 0.012); T.add(S.tunBack);
  S.tunFloor = new THREE.Mesh(new THREE.PlaneGeometry(TUN.L - 0.02, TUN.D - 0.02), M.tunBack); S.tunFloor.rotation.x = -Math.PI / 2; S.tunFloor.position.set(TUN.x + 0.2, TUN.y - TUN.H / 2 + 0.012, TUN.z); T.add(S.tunFloor);
  const fanG = new THREE.Group(); fanG.position.set(TUN.x + 0.2 - TUN.L / 2 - 0.05, TUN.y, TUN.z); T.add(fanG);
  fanG.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 10, 40), M.leg), 0, 0, 0, Math.PI / 2));
  S.fanBlades = new THREE.Group(); fanG.add(S.fanBlades);
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.1), M.fan); b.geometry.translate(0, 0.22, 0); b.rotation.x = i / 6 * Math.PI * 2; S.fanBlades.add(b); }
  // el ala (perfil de Joukowski extruido a lo ancho del túnel)
  const P = airfoilPts(160), sh = new THREE.Shape(); P.forEach((p, i) => i ? sh.lineTo(p.x * JS, p.y * JS) : sh.moveTo(p.x * JS, p.y * JS));
  const fg = new THREE.ExtrudeGeometry(sh, { depth: TUN.D * 0.96, bevelEnabled: false, curveSegments: 1 }); fg.translate(0, 0, -TUN.D * 0.48);
  S.foil = new THREE.Mesh(fg, M.foil); S.foil.castShadow = true; S.foil.position.set(TUN.x, TUN.y, TUN.z); T.add(S.foil);
  // el flujo calculado: líneas de corriente con 3° y con 9°, pulsos de humo, las dos bolitas
  S.AL0 = 3 * Math.PI / 180; S.AL1 = 9 * Math.PI / 180;
  const NL = 21, NP = 160, seeds = []; for (let i = 0; i < NL; i++) seeds.push(-1.7 + 3.4 * i / (NL - 1));
  const lineSet = al => seeds.map(y0 => { const raw = jkPath({ x: -6.2, y: y0 }, al, 15, 0.025);
    const pts = raw.map(z => zWorld(z, al)).filter(p => p.x <= TUN.x + 0.2 + TUN.L / 2 - 0.02 && p.x >= TUN.x + 0.2 - TUN.L / 2 + 0.02);
    const out = []; for (let k = 0; k < NP; k++) out.push(pts[Math.min(pts.length - 1, Math.round(k / (NP - 1) * (pts.length - 1)))].clone()); return out; });
  S.lines0 = lineSet(S.AL0); S.lines1 = lineSet(S.AL1);
  S.slMat = lineMat(0xf2f8ff, 2.0, 0.0);
  S.slines = S.lines0.map(pts => { const l = polyline(pts, S.slMat); T.add(l); return l; });
  // pulsos de humo (como en el túnel de Cambridge): 4 pulsos de 34 partículas soltadas a la vez
  S.pulseN = 34; S.pulses = [];
  for (let k = 0; k < 4; k++) for (let i = 0; i < S.pulseN; i++) { const y0 = -1.5 + 3.0 * i / (S.pulseN - 1); S.pulses.push({ k, y0, path: jkPath({ x: -4.2, y: y0 }, S.AL0, 12, 0.03) }); }
  S.smoke = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 8, 6), M.smoke, S.pulses.length); T.add(S.smoke);
  S.pulses1 = []; for (let k = 0; k < 4; k++) for (let i = 0; i < S.pulseN; i++) { const y0 = -1.5 + 3.0 * i / (S.pulseN - 1); S.pulses1.push({ k, y0, path: jkPath({ x: -4.2, y: y0 }, S.AL1, 12, 0.03) }); }
  S.smoke1 = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 8, 6), M.smoke, S.pulses1.length); T.add(S.smoke1);
  // las dos bolitas: la de arriba y la de abajo de la línea que se divide en el borde de ataque
  const Y0 = -0.5197;                                                   // línea que se divide en el borde de ataque (calculada con 3°)
  S.pA = jkPath({ x: -4.2, y: Y0 + 0.04 }, S.AL0, 12, 0.03); S.pB = jkPath({ x: -4.2, y: Y0 - 0.04 }, S.AL0, 12, 0.03);
  S.ballA = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), M.balA); S.ballB = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), M.balB); T.add(S.ballA, S.ballB);
  // el contorno del perfil (para el «mito»: las bolitas van pegadas al ala y llegan a la vez)
  const n = P.length, iTE = P.reduce((b, p, i) => p.x > P[b].x ? i : b, 0), iLE = P.reduce((b, p, i) => p.x < P[b].x ? i : b, 0);
  const walk = (a, b, dir) => { const o = []; for (let i = a; ; i = (i + dir + n) % n) { o.push(P[i]); if (i === b) break; } return o; };
  const up = walk(iLE, iTE, -1), dn = walk(iLE, iTE, 1); S.upPath = up.reduce((s, p) => s + (p.y > JK.mu.y ? 1 : 0), 0) > up.length / 2 ? up : dn; S.dnPath = S.upPath === up ? dn : up;
  // la cara de arriba, para iluminarla en «curva por arriba»
  S.upPts = S.upPath.map(p => zWorld(p, S.AL0).add(v3(0, 0, TUN.D * 0.485))); S.upLineMat = lineMat(0xffc24a, 6, 1); S.upLine = polyline(S.upPts, S.upLineMat); S.upLine.renderOrder = 6; T.add(S.upLine);
  // la presión (con 9°) en un panel delante del ala, y las flechas
  S.press = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), new THREE.MeshBasicMaterial({ map: pressureTex(S.AL1), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  S.press.position.set(TUN.x + 0.1, TUN.y, TUN.z + TUN.D * 0.49); S.press.renderOrder = 5; T.add(S.press);
  S.arrUp = arrow3(0.5, M.arrUp, 0.055); S.arrDn = arrow3(0.5, M.arrDn, 0.055); S.arrDn.rotation.z = Math.PI; T.add(S.arrUp, S.arrDn);
  S.arrUp.position.set(TUN.x - 0.05, TUN.y + 0.1, TUN.z + 0.25); S.arrDn.position.set(TUN.x + 1.12, TUN.y + 0.02, TUN.z + 0.25);
  // la carrera: la línea de meta en el borde de salida y el rastro de cada bolita
  const TEz = S.upPath[S.upPath.length - 1]; S.teX = zWorld(TEz, S.AL0).x; S.teY = zWorld(TEz, S.AL0).y;
  S.finMat = lineMat(0xffffff, 3, 0.9, true); S.finMat.dashSize = 0.045; S.finMat.gapSize = 0.035;
  S.finish = polyline([v3(S.teX, TUN.y - 0.6, TUN.z + TUN.D * 0.5 + 0.01), v3(S.teX, TUN.y + 0.6, TUN.z + TUN.D * 0.5 + 0.01)], S.finMat); S.finish.renderOrder = 6; T.add(S.finish);
  const endX = TUN.x + 0.2 + TUN.L / 2 - 0.05, trail = (path, col) => { const pts = []; for (const z of path) { const p = zWorld(z, S.AL0).add(v3(0, 0, TUN.D * 0.5)); if (p.x > endX) break; pts.push(p); } const m = lineMat(col, 3.5, 0.75); const l = polyline(pts, m); l.renderOrder = 5; T.add(l); l.userData.n = pts.length; l.userData.m = m; return l; };
  S.trailA = trail(S.pA, 0xffb13b); S.trailB = trail(S.pB, 0x46b8ff);
  const cross = path => { for (let i = 1; i < path.length; i++) { const a = zWorld(path[i - 1], S.AL0).x, b = zWorld(path[i], S.AL0).x; if (a < S.teX && b >= S.teX) return (i - 1 + (S.teX - a) / (b - a)) * 0.03; } return 99; };
  S.tauA = cross(S.pA); S.tauB = cross(S.pB);
  // la corriente que sale del borde de salida con el ala inclinada (9°): hacia abajo (para la flecha «aire hacia abajo»)
  { const al = S.AL1, c = Math.cos(al), sn = Math.sin(al), rot = (p, a) => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
    let Wp = rot(TEz, -al); Wp = { x: Wp.x + 0.1, y: Wp.y - 0.02 }; S.dnFlow = [];
    for (let i = 0; i < 80; i++) { S.dnFlow.push(v3(TUN.x + JS * Wp.x, TUN.y + JS * Wp.y, TUN.z + TUN.D * 0.5 + 0.02));
      const v = velZ(rot(Wp, al), al), w = rot(v, -al), L = Math.hypot(w.x, w.y) || 1; Wp = { x: Wp.x + w.x / L * 0.05, y: Wp.y + w.y / L * 0.05 }; } }
}
