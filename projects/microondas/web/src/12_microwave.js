// ---------------------------------------------------------------- el microondas (de los de casa, de encimera): carcasa de acero cepillado con los bordes redondeados,
// puerta de cristal negro ahumado con la rejilla de agujeros detrás, panel de mandos de cristal negro con la pantalla de cifras y los botones, interior
// esmaltado con su luz cálida, la tapa de mica de la guía de ondas en la pared derecha y el plato de cristal que gira sobre su aro de ruedas.
// Unidades: cm. Origen del grupo: abajo, en el centro del plano delantero de la carcasa; la puerta mira a +z.
const MWD = { W: 48, H: 28, D: 36, foot: 0.8, cav: { x0: -21, x1: 9, y0: 3.4, y1: 24.6, z0: -33, z1: 0 }, doorX1: 11.5 };
function roundRectShape(x0, y0, x1, y1, r, sh = new THREE.Shape()) {
  sh.moveTo(x0 + r, y0); sh.lineTo(x1 - r, y0); sh.quadraticCurveTo(x1, y0, x1, y0 + r); sh.lineTo(x1, y1 - r); sh.quadraticCurveTo(x1, y1, x1 - r, y1);
  sh.lineTo(x0 + r, y1); sh.quadraticCurveTo(x0, y1, x0, y1 - r); sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0); return sh;
}
function rectPathXY(x0, y0, x1, y1) { const p = new THREE.Path(); p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1); p.lineTo(x0, y1); p.closePath(); return p; }
// acero cepillado: vetas finas horizontales (rugosidad y relieve)
function brushedTex(w = 1024, h = 256) {
  const t = canvasTex(w, h, (g) => { g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const y = hash(i * 1.37) * h, l = 40 + hash(i * 2.9) * 400, x = hash(i * 4.1) * w, c = 110 + hash(i * 7.3) * 60 | 0; g.fillStyle = `rgba(${c},${c},${c},${0.25 + hash(i * 5.5) * 0.35})`; g.fillRect(x, y, l, 1); g.fillRect(x - w, y, l, 1); } });
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function mwMats() {
  const br = brushedTex();
  const metal = new THREE.MeshPhysicalMaterial({ color: 0xb4b9bf, metalness: 0.78, roughness: 0.4, roughnessMap: br, bumpMap: br, bumpScale: 0.15, clearcoat: 0.2, clearcoatRoughness: 0.3, envMapIntensity: 0.85 });
  const enamelT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#d9d9d5'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = hash(i * 1.7) > 0.5 ? 'rgba(160,150,135,.10)' : 'rgba(255,255,255,.12)'; g.fillRect(hash(i * 3.1) * w, hash(i * 5.3) * h, 1.2, 1.2); } });
  enamelT.wrapS = enamelT.wrapT = THREE.RepeatWrapping; enamelT.repeat.set(3, 3);
  const enamel = new THREE.MeshPhysicalMaterial({ map: enamelT, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, side: THREE.DoubleSide });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0c0d10, roughness: 0.08, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.7 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 });
  return { metal, enamel, black, rubber };
}
// la rejilla de la puerta: chapa negra con agujeros redondos (≈ 1,5 mm cada 2,5 mm) — por eso la luz pasa y las microondas no
function meshScreenTex(px = 1024, holes = 96) {
  const t = canvasTex(px, px, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; const s = w / holes;
    for (let j = 0; j < holes; j++) for (let i = 0; i < holes; i++) { g.beginPath(); g.arc((i + 0.5 + (j % 2) * 0.5) * s, (j + 0.5) * s, s * 0.32, 0, 7); g.fill(); } });
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// panel de mandos: la pantalla (se redibuja) y los botones serigrafiados
function panelTex() {
  const t = canvasTex(400, 900, () => {}); const g = t.userData.g;
  t.userData.draw = (txt, on) => { const w = 400, h = 900; g.fillStyle = '#07080a'; g.fillRect(0, 0, w, h);
    // pantalla
    g.fillStyle = '#020303'; rr(g, 40, 50, 320, 130, 14); g.fill(); g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; rr(g, 40, 50, 320, 130, 14); g.stroke();
    g.font = '700 92px "DejaVuMono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = on ? '#7dffb2' : 'rgba(125,255,178,.18)'; g.shadowColor = '#7dffb2'; g.shadowBlur = on ? 18 : 0; g.fillText(txt, 200, 118); g.shadowBlur = 0;
    // botones: potencia, descongelar, tiempo, 0–9, parar, empezar
    g.font = '600 24px "Inter", sans-serif'; g.fillStyle = 'rgba(230,232,235,.78)';
    const B = [['POTENCIA', 'DESCONG.'], ['TIEMPO', 'RELOJ'], ['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['PARAR', '0', '+30 s']];
    let y = 250; for (const row of B) { const n = row.length, bw = 300 / n; row.forEach((s, k) => { const x = 50 + bw * k; g.strokeStyle = 'rgba(255,255,255,.14)'; rr(g, x + 6, y - 30, bw - 12, 62, 10); g.stroke(); g.fillText(s, x + bw / 2, y + 2); }); y += 88; }
    g.fillStyle = 'rgba(120,200,255,.85)'; rr(g, 56, y - 30, 288, 66, 12); g.globalAlpha = 0.18; g.fill(); g.globalAlpha = 1; g.fillStyle = 'rgba(200,235,255,.95)'; g.font = '700 28px "Inter", sans-serif'; g.fillText('INICIO', 200, y + 4);
    t.needsUpdate = true; };
  t.userData.draw(':', false); return t;
}
function buildMicrowave() {
  const M = mwMats(), G = new THREE.Group(), U = { M }, C = MWD.cav, W = MWD.W, H = MWD.H, D = MWD.D, y0 = MWD.foot, y1 = y0 + H;
  // carcasa: rectángulo redondeado extruido hacia atrás con el hueco de la cavidad; las paredes del hueco son el esmalte de dentro
  { const sh = roundRectShape(-W / 2, y0, W / 2, y1, 1.8); sh.holes.push(rectPathXY(C.x0, C.y0, C.x1, C.y1));
    const g = new THREE.ExtrudeGeometry(sh, { depth: D - 1.2, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.6, bevelSegments: 4, curveSegments: 10 }); g.translate(0, 0, -D + 0.6);
    // grupos: 0 tapas, 1 lados de fuera, 2 paredes de la cavidad (las que están dentro del hueco)
    const P = g.attributes.position, idx = []; const groups = { 0: [], 1: [], 2: [] };
    for (const gr of g.groups) for (let i = gr.start; i < gr.start + gr.count; i += 3) { const cx = (P.getX(i) + P.getX(i + 1) + P.getX(i + 2)) / 3, cy = (P.getY(i) + P.getY(i + 1) + P.getY(i + 2)) / 3;
      const inside = cx > C.x0 - 0.01 && cx < C.x1 + 0.01 && cy > C.y0 - 0.01 && cy < C.y1 + 0.01; groups[gr.materialIndex === 1 && inside ? 2 : gr.materialIndex].push(i); }
    const ng = new THREE.BufferGeometry(); const attrs = ['position', 'normal', 'uv']; const out = {}; for (const a of attrs) out[a] = [];
    g.clearGroups(); let start = 0;
    for (const k of [0, 1, 2]) { for (const i of groups[k]) for (let v = 0; v < 3; v++) for (const a of attrs) { const A = g.attributes[a]; for (let c = 0; c < A.itemSize; c++) out[a].push(A.array[(i + v) * A.itemSize + c]); }
      ng.addGroup(start, groups[k].length * 3, k); start += groups[k].length * 3; }
    for (const a of attrs) ng.setAttribute(a, new THREE.Float32BufferAttribute(out[a], g.attributes[a].itemSize));
    // uv a escala real para el cepillado y el esmalte
    const UV = ng.attributes.uv, PP = ng.attributes.position, NN = ng.attributes.normal; for (let i = 0; i < UV.count; i++) { const nx = Math.abs(NN.getX(i)), ny = Math.abs(NN.getY(i)); const a = nx > 0.5 ? PP.getZ(i) : PP.getX(i), b = ny > 0.5 ? PP.getZ(i) : PP.getY(i); UV.setXY(i, a / 48, b / 48); }
    const shell = new THREE.Mesh(ng, [M.metal, M.metal, M.enamel]); shell.castShadow = true; shell.receiveShadow = true; G.add(shell); U.shell = shell; }
  // fondo de la cavidad y tapa trasera
  { const bw = new THREE.Mesh(new THREE.PlaneGeometry(C.x1 - C.x0, C.y1 - C.y0), M.enamel); bw.position.set((C.x0 + C.x1) / 2, (C.y0 + C.y1) / 2, C.z0); G.add(bw);
    const bp = new THREE.Mesh(new THREE.PlaneGeometry(C.x1 - C.x0 + 2, C.y1 - C.y0 + 2), M.metal); bp.position.set((C.x0 + C.x1) / 2, (C.y0 + C.y1) / 2, -D - 0.05); bp.rotation.y = Math.PI; G.add(bp); }
  // la tapa de mica de la guía de ondas (pared derecha de la cavidad) y la rejilla de la luz
  { const mica = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshPhysicalMaterial({ color: 0xc9b18a, roughness: 0.55, clearcoat: 0.3, side: THREE.DoubleSide }));
    mica.position.set(C.x1 - 0.02, 15.5, -14); mica.rotation.y = -Math.PI / 2; G.add(mica); U.mica = mica;
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshStandardMaterial({ color: 0x302820, emissive: 0xffc070, emissiveIntensity: 0, alphaMap: meshScreenTex(256, 18), transparent: true, side: THREE.DoubleSide }));
    gr.position.set(C.x1 - 0.03, 21.5, -27); gr.rotation.y = -Math.PI / 2; G.add(gr); U.lampGrille = gr;
    for (const [y, z] of [[11.8, -10.2], [11.8, -17.8], [19.2, -10.2], [19.2, -17.8]]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 12), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 1, roughness: 0.3 })); s.rotation.z = Math.PI / 2; s.position.set(C.x1 - 0.06, y, z); G.add(s); } }
  // la luz de dentro (cálida) y la del plato
  { const L = new THREE.PointLight(0xffe2b4, 0, 60, 2); L.position.set(C.x1 - 3, C.y1 - 3, -26); G.add(L); U.lamp = L;
    const L2 = new THREE.PointLight(0xffe8c4, 0, 50, 2); L2.position.set(-14, C.y1 - 2, -6); G.add(L2); U.lamp2 = L2; }
  // el plato giratorio de cristal sobre su aro de ruedas
  { const cx = (C.x0 + C.x1) / 2, cz = (C.z0 + C.z1) / 2; U.plateC = v3(cx, C.y0, cz);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(9, 0.35, 10, 64), new THREE.MeshStandardMaterial({ color: 0x2a2b2f, roughness: 0.6 })); ring.rotation.x = Math.PI / 2; ring.position.set(cx, C.y0 + 0.6, cz); G.add(ring);
    for (let k = 0; k < 3; k++) { const a = k * 2.094, wh = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.5, 16), M.rubber); wh.rotation.z = Math.PI / 2; wh.rotation.y = a; wh.position.set(cx + Math.cos(a) * 9, C.y0 + 0.75, cz + Math.sin(a) * 9); G.add(wh); }
    const plate = new THREE.Group(); plate.position.set(cx, C.y0 + 1.5, cz); G.add(plate); U.plate = plate;
    const prof = [[0.01, 0.0], [10.5, 0.0], [12.6, 0.35], [13.4, 0.9], [13.6, 1.25], [13.4, 1.35], [12.9, 1.1], [12.2, 0.55], [10.4, 0.25], [0.01, 0.25]].map(([r, y]) => new THREE.Vector2(r, y));
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xe8f2f0, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.32, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
    const pm = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), glass); pm.renderOrder = 3; plate.add(pm); U.plateTop = 0.25 + C.y0 + 1.5; }
  // la puerta: marco de acero, cristal negro ahumado (opaco alrededor, translúcido en la ventana) y la rejilla de agujeros detrás
  { const D2 = new THREE.Group(); D2.position.set(-W / 2, 0, 0); G.add(D2); U.door = D2;      // bisagra a la izquierda
    const dw = MWD.doorX1 + W / 2, wx0 = 3.5, wx1 = dw - 4.5, wy0 = y0 + 4.2, wy1 = y1 - 3.6;
    const fs = roundRectShape(0, y0, dw, y1, 1.4); fs.holes.push(rectPathXY(wx0 - 0.8, wy0 - 0.8, wx1 + 0.8, wy1 + 0.8));
    const fg = new THREE.ExtrudeGeometry(fs, { depth: 2.0, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.4, bevelSegments: 3, curveSegments: 8 }); fg.translate(0, 0, 0.4);
    const fm = new THREE.Mesh(fg, M.metal); fm.castShadow = true; fm.receiveShadow = true; D2.add(fm);
    const alpha = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); const x0 = (wx0 / dw) * w, x1 = (wx1 / dw) * w, ya = (1 - (wy1 - y0) / (y1 - y0)) * h, yb = (1 - (wy0 - y0) / (y1 - y0)) * h; g.fillStyle = '#7a7a7a'; rr(g, x0, ya, x1 - x0, yb - ya, 8); g.fill(); });
    alpha.colorSpace = THREE.NoColorSpace;
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(dw - 1.6, y1 - y0 - 1.6), new THREE.MeshPhysicalMaterial({ color: 0x08090b, roughness: 0.03, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, alphaMap: alpha, transparent: true, envMapIntensity: 1.3, depthWrite: false }));
    gl.position.set(dw / 2, (y0 + y1) / 2, 2.46); gl.renderOrder = 6; D2.add(gl); U.doorGlass = gl;
    const sc = meshScreenTex(); sc.repeat.set((wx1 - wx0) / 25, (wy1 - wy0) / 25);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(wx1 - wx0 + 1.6, wy1 - wy0 + 1.6), new THREE.MeshStandardMaterial({ color: 0x1b1c1f, metalness: 0.7, roughness: 0.45, alphaMap: sc, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    scr.position.set((wx0 + wx1) / 2, (wy0 + wy1) / 2, 1.2); scr.renderOrder = 5; D2.add(scr); U.screen = scr;
    // con la cámara muy cerca, la rejilla queda desenfocada: un velo oscuro uniforme (como en una foto de verdad)
    const veil = new THREE.Mesh(scr.geometry, new THREE.MeshBasicMaterial({ color: 0x0b0c0e, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); veil.position.copy(scr.position); veil.renderOrder = 5; D2.add(veil); U.veil = veil; U.win = { x0: wx0 - W / 2, x1: wx1 - W / 2, y0: wy0, y1: wy1 };
    // junta interior (se ve con la puerta abierta)
    const gs = roundRectShape(1, y0 + 1, dw - 1, y1 - 1, 1.2); gs.holes.push(rectPathXY(wx0 - 0.8, wy0 - 0.8, wx1 + 0.8, wy1 + 0.8));
    const gk = new THREE.Mesh(new THREE.ShapeGeometry(gs), new THREE.MeshStandardMaterial({ color: 0x2d2f33, roughness: 0.7, side: THREE.DoubleSide })); gk.position.z = 0.38; D2.add(gk); }
  // panel de mandos (cristal negro con la pantalla y los botones) y el botón de abrir la puerta
  { const pw = W / 2 - MWD.doorX1 - 0.3, px = MWD.doorX1 + 0.3 + pw / 2; const tex = panelTex(); U.panelTex = tex;
    const pg = new THREE.ExtrudeGeometry(roundRectShape(-pw / 2, y0 + 0.2, pw / 2, y1 - 0.2, 1.2), { depth: 1.6, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3, bevelSegments: 3 }); pg.translate(px, 0, 0.3);
    const pmesh = new THREE.Mesh(pg, M.black); pmesh.castShadow = true; G.add(pmesh);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(pw - 0.6, y1 - y0 - 1.4), new THREE.MeshPhysicalMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true }));
    face.position.set(px, (y0 + y1) / 2, 2.22); face.renderOrder = 4; G.add(face); U.panelFace = face; U.panelX = px;
    const ob = rbox(pw - 3.5, 2.6, 0.8, M.metal, 0.5); ob.position.set(px, y0 + 3.4, 2.4); G.add(ob); }
  // patas
  for (const [x, z] of [[-W / 2 + 4, -4], [W / 2 - 4, -4], [-W / 2 + 4, -D + 4], [W / 2 - 4, -D + 4]]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, MWD.foot, 20), M.rubber); f.position.set(x, MWD.foot / 2, z); G.add(f); }
  G.userData = U; return G;
}
// estado: luz encendida (0–1), giro del plato, puerta (0 cerrada … 1 abierta 100°), texto de la pantalla
function microwaveAt(MW, o) {
  const U = MW.userData, on = o.on ?? 0;
  const lamp = o.lamp ?? on; U.lamp.intensity = 380 * lamp; U.lamp2.intensity = 140 * lamp; U.lampGrille.material.emissiveIntensity = 3 * lamp;
  U.plate.rotation.y = o.turn ?? 0; U.door.rotation.y = -(o.door ?? 0) * 1.75;
  const txt = o.display ?? ':'; if (U._txt !== txt + on) { U._txt = txt + on; U.panelTex.userData.draw(txt, on > 0.5); }
}
