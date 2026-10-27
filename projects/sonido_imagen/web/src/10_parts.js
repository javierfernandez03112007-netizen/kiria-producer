// ---------------------------------------------------------------- «Sonido e Imagen»: piezas
// bandos: TELECO ámbar, SONIDO E IMAGEN turquesa, FP magenta
const AMB = 0xf0a332, TEA = 0x2fc7b6, MAG = 0xe0569a;
const CAm = new THREE.Color(1.9, 1.05, 0.25), CTe = new THREE.Color(0.25, 1.6, 1.45), CMg = new THREE.Color(1.8, 0.35, 0.95);
const plasticS = (c, r = 0.28) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.05 });
const metalS = (c, r = 0.25) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 1 });
const SANS = '"Inter", "SpaceMono", sans-serif';
function signPlane(txt, { w = 1, h = 0.25, col = '#EEF2F6', bg = null, size = 0.62, font = SANS, weight = 900, ls = 0 } = {}) {
  const tw = 1024, th = Math.round(1024 * h / w);
  const tex = canvasTex(tw, th, (g, W2, H2) => { if (bg) { g.fillStyle = bg; rr(g, 4, 4, W2 - 8, H2 - 8, H2 * 0.18); g.fill(); }
    let px = Math.round(H2 * size); g.letterSpacing = ls + 'px'; g.font = `${weight} ${px}px ${font}`; const mw = g.measureText(txt).width; if (mw > W2 * 0.92) { px = Math.floor(px * W2 * 0.92 / mw); g.font = `${weight} ${px}px ${font}`; }
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W2 / 2, H2 / 2 + H2 * 0.04); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 6; return m;
}
// tubo que se dibuja poco a poco (uA: 0 → 1 a lo largo del tubo)
function growTube(curve, r, mat, seg = 160, rs = 10) {
  const U = { uA: { value: 0 } };
  mat.onBeforeCompile = sh => { sh.uniforms.uA = U.uA;
    sh.vertexShader = 'varying float vU;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vU = uv.x;');
    sh.fragmentShader = 'uniform float uA; varying float vU;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n if (vU > uA) discard;'); };
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, rs, false), mat); m.castShadow = true; m.userData.U = U; return m;
}
// brillo propio proporcional al color (para que la imagen de vóxeles se lea como una pantalla)
function selfLit(mat, k) { mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ${k.toFixed(3)};`); }; return mat; }

// ---------------------------------------------------------------- el ojo: imagen 9:16 hecha de 54 × 96 vóxeles
const EYE_NX = 54, EYE_NY = 96, VOX = 0.02, EYE_C = v3(0, 1.62, 0);
const EW = 540, EH = 960;                       // lienzo de dibujo (10 px por vóxel)
const LID_P = [[-40, 520], [270, 120], [580, 470]], LOW_P = [[-40, 520], [270, 880], [580, 470]];   // párpados (cuadráticas)
function quadY(P, x) { // y de la cuadrática P en la abscisa x (búsqueda por bisección; x(s) es creciente)
  let a = 0, b = 1; for (let i = 0; i < 22; i++) { const s = (a + b) / 2, xs = (1 - s) * (1 - s) * P[0][0] + 2 * (1 - s) * s * P[1][0] + s * s * P[2][0]; if (xs < x) a = s; else b = s; }
  const s = (a + b) / 2; return (1 - s) * (1 - s) * P[0][1] + 2 * (1 - s) * s * P[1][1] + s * s * P[2][1];
}
function drawSkin(g) {
  const sk = g.createLinearGradient(0, 0, 0, EH); sk.addColorStop(0, '#1d1411'); sk.addColorStop(0.3, '#6b4636'); sk.addColorStop(0.5, '#8a5c47'); sk.addColorStop(0.72, '#6b4636'); sk.addColorStop(1, '#1d1411');
  g.fillStyle = sk; g.fillRect(0, 0, EW, EH);
  // pliegue del párpado y ceja
  g.strokeStyle = 'rgba(30,18,14,.75)'; g.lineWidth = 16; g.beginPath(); g.moveTo(-20, 420); g.quadraticCurveTo(270, 20, 560, 380); g.stroke();
  g.strokeStyle = 'rgba(24,16,12,.9)'; g.lineWidth = 38; g.beginPath(); g.moveTo(10, 150); g.quadraticCurveTo(250, 30, 540, 120); g.stroke();
}
function drawEye(g) {
  drawSkin(g);
  g.save(); g.beginPath(); g.moveTo(...LID_P[0]); g.quadraticCurveTo(...LID_P[1], ...LID_P[2]); g.quadraticCurveTo(...LOW_P[1], ...LOW_P[0]); g.closePath(); g.clip();
  const sc = g.createRadialGradient(270, 500, 40, 270, 500, 340); sc.addColorStop(0, '#f6f1ec'); sc.addColorStop(0.7, '#e0d2c8'); sc.addColorStop(1, '#a88f84');
  g.fillStyle = sc; g.fillRect(0, 0, EW, EH);
  g.strokeStyle = 'rgba(190,60,60,.35)'; g.lineWidth = 2;
  for (let i = 0; i < 26; i++) { const sx = hash(i * 3.3) < 0.5 ? -10 : 550, sy = 420 + hash(i * 5.1) * 160; g.beginPath(); g.moveTo(sx, sy); let x = sx, y = sy; for (let k = 0; k < 6; k++) { x += (sx < 0 ? 1 : -1) * (14 + hash(i * 7 + k) * 18); y += (hash(i * 11 + k) - 0.5) * 22; g.lineTo(x, y); } g.stroke(); }
  // iris: oro alrededor de la pupila, turquesa por fuera (los dos colores del vídeo)
  const cx = 270, cy = 495, R = 212;
  const ir = g.createRadialGradient(cx, cy, 60, cx, cy, R); ir.addColorStop(0, '#ffcf6a'); ir.addColorStop(0.28, '#f0a332'); ir.addColorStop(0.42, '#b9853a'); ir.addColorStop(0.55, '#2fc7b6'); ir.addColorStop(0.85, '#167f78'); ir.addColorStop(1, '#0a3534');
  g.fillStyle = ir; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  for (let i = 0; i < 1100; i++) { const a = hash(i * 1.7) * 6.2832, r0 = R * (0.3 + hash(i * 2.9) * 0.15), r1 = R * (0.6 + hash(i * 4.3) * 0.38);
    g.strokeStyle = hash(i * 6.1) < 0.5 ? `rgba(180,255,240,${0.12 + hash(i) * 0.2})` : `rgba(255,214,140,${0.1 + hash(i * 9) * 0.2})`; g.lineWidth = 1 + hash(i * 8.8) * 2;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a + 0.05) * r1, cy + Math.sin(a + 0.05) * r1); g.stroke(); }
  for (let i = 0; i < 40; i++) { const a = hash(i * 13.1) * 6.2832, r = R * (0.45 + hash(i * 17.3) * 0.4); g.fillStyle = 'rgba(5,30,30,.45)'; g.beginPath(); g.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 9, 4, a, 0, 7); g.fill(); }
  g.lineWidth = 22; g.strokeStyle = 'rgba(4,22,24,.85)'; g.beginPath(); g.arc(cx, cy, R - 6, 0, 7); g.stroke();
  g.fillStyle = '#020203'; g.beginPath(); g.arc(cx, cy, 80, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.95)'; rr(g, cx - 120, cy - 128, 78, 56, 18); g.fill(); g.beginPath(); g.arc(cx + 70, cy + 64, 13, 0, 7); g.fill();
  // sombra del párpado superior sobre el ojo
  const sh = g.createLinearGradient(0, 120, 0, 420); sh.addColorStop(0, 'rgba(0,0,0,.75)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(0, 0, EW, 420);
  g.restore();
  // pestañas
  g.strokeStyle = '#0b0807'; g.lineCap = 'round';
  for (let i = 0; i < 46; i++) { const x = 10 + i * 11.6, y = quadY(LID_P, x); g.lineWidth = 5; g.beginPath(); g.moveTo(x, y + 4); g.quadraticCurveTo(x - 6, y - 26, x - 16 + i * 0.25, y - 44 - 10 * Math.sin(i / 46 * Math.PI)); g.stroke(); }
  g.lineWidth = 10; g.beginPath(); g.moveTo(...LID_P[0]); g.quadraticCurveTo(...LID_P[1], ...LID_P[2]); g.stroke();
}
function sampleGrid(draw) {
  const c = document.createElement('canvas'); c.width = EW; c.height = EH; const g = c.getContext('2d'); draw(g);
  const d = g.getImageData(0, 0, EW, EH).data, out = new Float32Array(EYE_NX * EYE_NY * 3);
  for (let iy = 0; iy < EYE_NY; iy++) for (let ix = 0; ix < EYE_NX; ix++) { let r = 0, gg = 0, b = 0, n = 0;
    for (let y = iy * 10 + 2; y < iy * 10 + 9; y += 2) for (let x = ix * 10 + 2; x < ix * 10 + 9; x += 2) { const k = (y * EW + x) * 4; r += d[k]; gg += d[k + 1]; b += d[k + 2]; n++; }
    const i = iy * EYE_NX + ix; out[i * 3] = r / n / 255; out[i * 3 + 1] = gg / n / 255; out[i * 3 + 2] = b / n / 255; }
  return out;   // sRGB 0-1
}
function buildEye() {
  const G = new THREE.Group(); G.position.copy(EYE_C); scene.add(G);
  const N = EYE_NX * EYE_NY, open = sampleGrid(drawEye), skin = sampleGrid(drawSkin);
  const geo = new THREE.BoxGeometry(VOX * 0.93, VOX * 0.93, VOX * 0.93);
  const mk = (n, k, sz = 1) => { const m = new THREE.InstancedMesh(sz === 1 ? geo : new THREE.BoxGeometry(VOX * 0.93 * sz, VOX * 0.93 * sz, VOX * 0.93), selfLit(new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0 }), k), n);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); m.frustumCulled = false; m.castShadow = true; G.add(m); return m; };
  const vox = mk(N, 0.62);
  const base = [], seed = [];
  for (let i = 0; i < N; i++) { const ix = i % EYE_NX, iy = Math.floor(i / EYE_NX); base.push(v3((ix - (EYE_NX - 1) / 2) * VOX, ((EYE_NY - 1) / 2 - iy) * VOX, 0));
    const a = hash(i * 3.17) * 6.2832, e = hash(i * 7.73);
    seed.push({ keep: hash(i * 1.913 + 0.37) < 0.01, dir: v3(Math.cos(a) * (0.6 + e), Math.sin(a) * (0.6 + e) * 0.8 + 0.3, 1.2 + hash(i * 9.1) * 3.2), spin: v3(hash(i * 2.1) * 9, hash(i * 4.2) * 9, hash(i * 5.3) * 9), d: hash(i * 6.4) * 0.12 }); }
  const lin = (src) => { const out = new Float32Array(src.length); const c = new THREE.Color(); for (let i = 0; i < src.length; i += 3) { c.setRGB(src[i], src[i + 1], src[i + 2], THREE.SRGBColorSpace); out[i] = c.r; out[i + 1] = c.g; out[i + 2] = c.b; } return out; };
  // capa de luz (gris, todo el detalle) y capa de color (la mitad de resolución en cada eje: 27 × 48, ¼ de muestras)
  const lumS = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const l = 0.2126 * open[i * 3] + 0.7152 * open[i * 3 + 1] + 0.0722 * open[i * 3 + 2]; lumS[i * 3] = lumS[i * 3 + 1] = lumS[i * 3 + 2] = l; }
  const CX = EYE_NX / 2, CY = EYE_NY / 2, chrS = new Float32Array(CX * CY * 3), cbase = [];
  for (let j = 0; j < CY; j++) for (let i = 0; i < CX; i++) { let r = 0, g2 = 0, b = 0; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const k = ((j * 2 + dy) * EYE_NX + i * 2 + dx) * 3; r += open[k]; g2 += open[k + 1]; b += open[k + 2]; }
    r /= 4; g2 /= 4; b /= 4; const l = Math.max(0.05, 0.2126 * r + 0.7152 * g2 + 0.0722 * b), s = 0.55 / l, q = (j * CX + i) * 3;
    chrS[q] = Math.min(1, r * s); chrS[q + 1] = Math.min(1, g2 * s); chrS[q + 2] = Math.min(1, b * s); cbase.push(v3((i * 2 + 0.5 - (EYE_NX - 1) / 2) * VOX, ((EYE_NY - 1) / 2 - j * 2 - 0.5) * VOX, 0)); }
  const luma = mk(N, 0.62), chroma = mk(CX * CY, 0.7, 2);
  const L = { open: lin(open), skin: lin(skin), luma: lin(lumS), chroma: lin(chrS) };
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) { m4.makeTranslation(base[i].x, base[i].y, 0); luma.setMatrixAt(i, m4); luma.instanceColor.setXYZ(i, L.luma[i * 3], L.luma[i * 3 + 1], L.luma[i * 3 + 2]); }
  for (let i = 0; i < CX * CY; i++) { m4.makeTranslation(cbase[i].x, cbase[i].y, 0); chroma.setMatrixAt(i, m4); chroma.instanceColor.setXYZ(i, L.chroma[i * 3], L.chroma[i * 3 + 1], L.chroma[i * 3 + 2]); }
  luma.instanceMatrix.needsUpdate = chroma.instanceMatrix.needsUpdate = true; luma.instanceColor.needsUpdate = chroma.instanceColor.needsUpdate = true;
  // párpado: para cada columna, la y (en vóxeles) del borde superior abierto y del inferior
  const lidTop = [], lidBot = []; for (let ix = 0; ix < EYE_NX; ix++) { const x = ix * 10 + 5; lidTop.push(quadY(LID_P, x) / 10); lidBot.push(quadY(LOW_P, x) / 10); }
  // flechas de movimiento (vectores) sobre los vóxeles que cambian al parpadear
  const arrows = new THREE.InstancedMesh(new THREE.ConeGeometry(0.008, 0.03, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6), toneMapped: false }), 160);
  arrows.frustumCulled = false; arrows.count = 0; G.add(arrows);
  // marco fino alrededor de la imagen
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(EYE_NX * VOX + 0.04, EYE_NY * VOX + 0.04), new THREE.MeshBasicMaterial({ color: 0x0b0d10 })); fr.position.z = -0.016; G.add(fr);
  const fe = edges(new THREE.Mesh(new THREE.BoxGeometry(EYE_NX * VOX + 0.04, EYE_NY * VOX + 0.04, 0.001)), 0xdfe6ee, 1.4, 1, 0.5); fr.add(fe);
  return { G, vox, luma, chroma, base, cbase, seed, L, lidTop, lidBot, arrows, fr };
}

// ---------------------------------------------------------------- emblemas de los bandos
function podium(col, name, r = 0.3) {
  const g = new THREE.Group();
  const body = cyl(r, r * 1.06, 1, plasticS(0x15181d, 0.5), 48); g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.99, 0.008, 8, 64), basicGlow(col, 1.4)); rim.rotation.x = Math.PI / 2; g.add(rim);
  const lab = signPlane(name, { w: r * 1.5, h: r * 0.34, col: '#' + new THREE.Color(col).getHexString() }); g.add(lab);
  g.userData = { body, rim, lab, r }; return g;
}
function setPodiumH(p, h) { const { body, rim, lab, r } = p.userData; body.scale.y = h; body.position.y = h / 2; rim.position.y = h + 0.002; lab.position.set(0, h * 0.5, r * 1.04); }
function tower(col) {
  const g = new THREE.Group(), m = plasticS(col, 0.3);
  const mast = cyl(0.02, 0.03, 1.0, m, 16); mast.position.y = 0.5; g.add(mast);
  for (let k = 0; k < 4; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.006, 6, 20), m); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2 + k * 0.2; g.add(ring); }
  const panels = [];
  for (let k = 0; k < 3; k++) { const p = rbox(0.07, 0.26, 0.03, plasticS(0xe9edf2, 0.35), 0.012); const a = k * 2.094 + 0.5; p.position.set(Math.sin(a) * 0.075, 0.9, Math.cos(a) * 0.075); p.rotation.y = a; g.add(p); panels.push(p); }
  const prof = []; for (let i = 0; i <= 14; i++) { const u = i / 14 * 0.11; prof.push(new THREE.Vector2(u, u * u * 4)); }
  const dish = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), new THREE.MeshStandardMaterial({ color: 0xcfd5dc, roughness: 0.3, side: THREE.DoubleSide }));
  const dg = new THREE.Group(); dg.position.set(0.075, 0.62, 0.04); dg.rotation.set(0.35, 0.65, 0); g.add(dg);
  dish.rotation.x = Math.PI / 2; dg.add(dish); edges(dish, 0x9aa1ab, 1.1, 40, 0.6);
  const feed = cyl(0.004, 0.004, 0.1, m, 6); feed.rotation.x = Math.PI / 2; feed.position.set(0, 0, 0.06); dg.add(feed);
  const beacon = sph(0.022, glowM(0xff3b30, 3)); beacon.position.y = 1.04; g.add(beacon);
  // ondas que salen de la antena
  const waves = []; for (let k = 0; k < 3; k++) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.006, 6, 48), basicGlow(col, 1.6)); w.position.y = 0.9; w.rotation.x = Math.PI / 2; g.add(w); waves.push(w); }
  g.userData = { beacon, waves, dish }; return g;
}
function speaker(col) {
  const g = new THREE.Group();
  const box = rbox(0.34, 0.5, 0.28, plasticS(0x15181d, 0.55), 0.03); box.position.y = 0.25; g.add(box);
  const prof = []; for (let i = 0; i <= 12; i++) { const u = i / 12; prof.push(new THREE.Vector2(0.02 + u * 0.115, -0.045 * (1 - u) * (1 - u))); }
  const cone = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), plasticS(col, 0.35)); cone.rotation.x = Math.PI / 2; cone.position.set(0, 0.19, 0.143); g.add(cone);
  const sur = new THREE.Mesh(new THREE.TorusGeometry(0.137, 0.012, 8, 48), plasticS(0x0c0e11, 0.6)); sur.position.set(0, 0.19, 0.143); g.add(sur);
  const cap = sph(0.034, plasticS(0x0c0e11, 0.3)); cap.scale.z = 0.45; cap.position.set(0, 0.19, 0.1); g.add(cap);
  const tw = sph(0.03, metalS(0xd9dde3, 0.2)); tw.scale.z = 0.5; tw.position.set(0, 0.41, 0.142); g.add(tw);
  const twr = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.006, 6, 32), basicGlow(col, 1.3)); twr.position.set(0, 0.41, 0.143); g.add(twr);
  // anillos de sonido delante del cono
  const rings = []; for (let k = 0; k < 3; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.005, 6, 48), basicGlow(col, 1.6)); r.position.set(0, 0.19, 0.16); g.add(r); rings.push(r); }
  g.userData = { cone, cap, rings }; return g;
}
function lens(col) {
  const g = new THREE.Group(), dark = plasticS(0x111317, 0.45);
  const b1 = cyl(0.1, 0.1, 0.07, dark, 40); b1.rotation.x = Math.PI / 2; g.add(b1);
  for (let k = 0; k < 6; k++) { const rg = cyl(0.104, 0.104, 0.006, plasticS(0x22262c, 0.6), 40); rg.rotation.x = Math.PI / 2; rg.position.z = -0.03 + k * 0.012; g.add(rg); }
  const b2 = cyl(0.115, 0.108, 0.05, dark, 40); b2.rotation.x = Math.PI / 2; b2.position.z = 0.06; g.add(b2);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.006, 8, 48), basicGlow(col, 1.8)); ring.position.z = 0.086; g.add(ring);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.1, 40, 16, 0, Math.PI * 2, 0, 0.55), new THREE.MeshStandardMaterial({ color: 0x050b12, roughness: 0.04, metalness: 0.9, emissive: col, emissiveIntensity: 0.18 }));
  glass.rotation.x = Math.PI / 2; glass.position.z = 0.04; g.add(glass);
  const back = cyl(0.07, 0.08, 0.05, dark, 32); back.rotation.x = Math.PI / 2; back.position.z = -0.06; g.add(back);
  return g;
}
function plug(col) {
  const g = new THREE.Group();
  const body = cyl(0.026, 0.03, 0.12, plasticS(col, 0.3), 24); body.rotation.x = Math.PI / 2; g.add(body);
  const sl = cyl(0.016, 0.016, 0.03, metalS(0xd0d4da), 20); sl.rotation.x = Math.PI / 2; sl.position.z = 0.072; g.add(sl);
  const tip = cyl(0.008, 0.008, 0.08, metalS(0xe6e9ee, 0.15), 16); tip.rotation.x = Math.PI / 2; tip.position.z = 0.12; g.add(tip);
  const nub = sph(0.01, metalS(0xe6e9ee, 0.15)); nub.position.z = 0.16; g.add(nub);
  return g;
}
function coil(col) {   // rollo de cable
  const g = new THREE.Group(), m = plasticS(col, 0.35);
  for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.15 - k * 0.006, 0.014, 10, 56), m); t.rotation.x = Math.PI / 2; t.position.y = 0.016 + k * 0.026; t.castShadow = true; g.add(t); }
  return g;
}
function bar(col, label, name) {
  const g = new THREE.Group();
  const b = rbox(0.2, 1, 0.2, plasticS(col, 0.22), 0.03); g.add(b);
  const top = signPlane(label, { w: 0.42, h: 0.14, col: '#EEF2F6' }); g.add(top);
  const nm = signPlane(name, { w: 0.5, h: 0.08, col: '#' + new THREE.Color(col).getHexString() }); nm.position.set(0, 0.06, 0.13); g.add(nm);
  g.userData = { b, top, nm }; return g;
}
function setBarH(B, h) { const { b, top } = B.userData; b.scale.y = Math.max(1e-3, h); b.position.y = h / 2; top.position.set(0, h + 0.1, 0); }
// tele con una serie (o sin señal)
function seriesTex() {
  return canvasTex(512, 296, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#120a2e'); sky.addColorStop(0.6, '#5a2a6e'); sky.addColorStop(1, '#f08a4b'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,240,210,.95)'; g.beginPath(); g.arc(380, 92, 34, 0, 7); g.fill();
    for (let i = 0; i < 18; i++) { const bw = 22 + hash(i * 3.1) * 30, bh = 60 + hash(i * 5.3) * 120, x = i * 30 - 10; g.fillStyle = '#0a0612'; g.fillRect(x, h - bh, bw, bh);
      for (let k = 0; k < 10; k++) if (hash(i * 7 + k) > 0.55) { g.fillStyle = 'rgba(255,200,120,.85)'; g.fillRect(x + 4 + (k % 3) * 7, h - bh + 8 + Math.floor(k / 3) * 14, 4, 6); } }
    g.fillStyle = '#0a0612'; g.beginPath(); g.arc(150, h - 40, 16, 0, 7); g.fill(); g.fillRect(138, h - 26, 24, 40); g.beginPath(); g.arc(196, h - 44, 18, 0, 7); g.fill(); g.fillRect(182, h - 28, 28, 40);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, h - 22, w, 22); g.fillStyle = '#ff4e42'; g.fillRect(12, h - 13, w * 0.42, 5); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(12 + w * 0.42, h - 13, w * 0.52, 5);
    g.fillStyle = '#EEF2F6'; g.font = '700 20px SpaceMono'; g.fillText('T1 · EP 4', 14, 30);
  });
}
function noiseTex() { const t = canvasTex(256, 148, (g, w, h) => { const d = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { const v = Math.floor(hash(i * 0.731) * 255); d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; } g.putImageData(d, 0, 0); });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function tv() {
  const g = new THREE.Group();
  const frame = rbox(0.66, 0.4, 0.03, plasticS(0x0e1014, 0.4), 0.014); frame.position.y = 0.2; g.add(frame);
  const sT = seriesTex(), nT = noiseTex();
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), new THREE.MeshBasicMaterial({ map: sT, toneMapped: false })); scr.position.set(0, 0.2, 0.0155); g.add(scr);
  const off = signPlane('SIN SEÑAL', { w: 0.4, h: 0.07, col: '#EEF2F6', bg: 'rgba(0,0,0,.75)', size: 0.5, font: '"SpaceMono"', weight: 700, ls: 6 }); off.position.set(0, 0.2, 0.018); off.visible = false; g.add(off);
  const neck = cyl(0.012, 0.012, 0.14, plasticS(0x0e1014), 12); neck.position.y = -0.06; g.add(neck);
  const foot = rbox(0.24, 0.012, 0.12, plasticS(0x0e1014), 0.006); foot.position.y = -0.13; g.add(foot);
  g.userData = { scr, sT, nT, off }; return g;
}

// ---------------------------------------------------------------- zona del duelo
const DZ = v3(0, 0, -9);
const DPOS = { tel: v3(-0.62, 0, 0), si: v3(0.62, 0, 0), fp: v3(0, 0, -0.95) };
function buildDuel() {
  const Z = new THREE.Group(); Z.position.copy(DZ); scene.add(Z);
  const pT = podium(AMB, 'TELECO'), pS = podium(TEA, 'SONIDO E IMAGEN'), pF = podium(MAG, 'FP', 0.24);
  pT.position.copy(DPOS.tel); pS.position.copy(DPOS.si); pF.position.copy(DPOS.fp); Z.add(pT, pS, pF);
  setPodiumH(pT, 0.3); setPodiumH(pS, 0.3); setPodiumH(pF, 0.22);
  const tw = tower(AMB); tw.position.set(DPOS.tel.x, 0.3, 0); tw.scale.setScalar(0.95); Z.add(tw);
  const sp = speaker(TEA); sp.position.set(DPOS.si.x, 0.3, 0); sp.rotation.y = -0.25; Z.add(sp);
  const ln = lens(TEA); ln.position.set(DPOS.si.x, 1.05, 0.05); Z.add(ln);
  const cl = coil(MAG); cl.position.set(DPOS.fp.x, 0.22, DPOS.fp.z); Z.add(cl);
  const pl = plug(MAG); Z.add(pl);
  // cable de FP hasta la parte de atrás del altavoz
  const curve = new THREE.CatmullRomCurve3([v3(0.05, 0.3, -0.95), v3(0.12, 0.62, -0.75), v3(0.4, 0.75, -0.45), v3(0.58, 0.55, -0.28), v3(0.62, 0.48, -0.17)]);
  const cable = growTube(curve, 0.011, plasticS(MAG, 0.35), 140, 8); Z.add(cable);
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), basicGlow(0xffd0f0, 2)); Z.add(spark);
  // barras de notas de corte (UPM 2025-26) detrás de cada bando: 0,16 m por punto
  const bT = bar(AMB, '9,408', 'TELECO'), bS = bar(TEA, '8,066', 'SONIDO E IMAGEN');
  bT.position.set(-0.36, 0, -1.6); bS.position.set(0.36, 0, -1.6); Z.add(bT, bS);
  // tele: «sin nosotros no veríais ni una serie»
  const T = tv(); T.position.set(1.3, 0.62, 0.35); T.rotation.y = -0.55; Z.add(T);
  // público: cuánta gente pide cada carrera (ilustrativo)
  const mkCrowd = (n, col, cx) => { const m = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.026, 0.06, 3, 8), plasticS(col, 0.4), n); m.frustumCulled = false; m.castShadow = true; Z.add(m);
    const P = []; for (let i = 0; i < n; i++) { const a = hash(i * 3.7 + cx) * 6.283, r = Math.sqrt(hash(i * 5.9 + cx)) * 0.62; P.push(v3(cx + Math.cos(a) * r, 0.056, 0.8 + Math.sin(a) * r * 0.65)); } m.userData.P = P; return m; };
  const crT = mkCrowd(420, AMB, -0.95), crS = mkCrowd(300, TEA, 0.95);
  // títulos: dos diplomas que se funden en uno
  const dipTex = (head, col) => canvasTex(640, 420, (g, w, h) => { g.fillStyle = '#F2EEE6'; rr(g, 0, 0, w, h, 26); g.fill(); g.strokeStyle = col; g.lineWidth = 14; rr(g, 18, 18, w - 36, h - 36, 18); g.stroke();
    g.fillStyle = '#1B1F27'; g.textAlign = 'center'; g.font = '700 30px SpaceMono'; g.letterSpacing = '4px'; g.fillText(head, w / 2, 100);
    g.font = '900 40px Inter'; g.letterSpacing = '0px'; g.fillText('INGENIERO TÉCNICO', w / 2, 200); g.fillText('DE TELECOMUNICACIÓN', w / 2, 252);
    g.fillStyle = col; g.beginPath(); g.arc(w / 2, 340, 34, 0, 7); g.fill(); });
  const dip = (head, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2625), new THREE.MeshStandardMaterial({ map: dipTex(head, col), roughness: 0.6, side: THREE.DoubleSide })); m.castShadow = true; Z.add(m); return m; };
  const dT = dip('GRADO EN TELECO', '#F0A332'), dS = dip('GRADO EN SONIDO E IMAGEN', '#2FC7B6');
  // puerta del máster
  const door = new THREE.Group(); door.position.set(0, 0, -1.9); Z.add(door);
  const pm = plasticS(0xe9edf2, 0.35); const p1 = rbox(0.08, 1.3, 0.08, pm, 0.02), p2 = p1.clone(), lt = rbox(0.9, 0.1, 0.1, pm, 0.02);
  p1.position.set(-0.42, 0.65, 0); p2.position.set(0.42, 0.65, 0); lt.position.set(0, 1.33, 0); door.add(p1, p2, lt);
  const dl = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 1.25), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.35, 1.25), transparent: true, opacity: 0, toneMapped: false, depthWrite: false })); dl.position.set(0, 0.63, 0); door.add(dl);
  const dlab = signPlane('MÁSTER', { w: 0.6, h: 0.13, col: '#EEF2F6' }); dlab.position.set(0, 1.5, 0); door.add(dlab);
  // TELECO + apellido
  const sign = new THREE.Group(); sign.position.set(0, 1.55, -0.35); Z.add(sign);
  const sTel = signPlane('TELECO', { w: 1.3, h: 0.32, col: '#EEF2F6' }); sign.add(sTel);
  const plate = rbox(1.0, 0.16, 0.04, plasticS(TEA, 0.25), 0.03); plate.position.set(0, -0.27, 0); sign.add(plate);
  const pTxt = signPlane('SONIDO E IMAGEN', { w: 0.92, h: 0.13, col: '#04110F' }); pTxt.position.set(0, -0.27, 0.022); sign.add(pTxt);
  Z.userData = { pT, pS, pF, tw, sp, ln, cl, pl, curve, cable, spark, bT, bS, T, crT, crS, dT, dS, door, dl, sign, sTel, plate, pTxt };
  return Z;
}

// ---------------------------------------------------------------- por dentro: señales, sala, micro y altavoz, emisión a miles de pantallas
const IZ = v3(9, 0, -16);
function buildInside() {
  const Z = new THREE.Group(); Z.position.copy(IZ); scene.add(Z);
  // señal: onda continua → muestras → números
  const wpts = []; for (let i = 0; i <= 160; i++) { const u = i / 160, x = -0.9 + u * 1.8; wpts.push(v3(x, 1.45 + 0.28 * Math.sin(u * 13) * (0.6 + 0.4 * Math.sin(u * 3.1)), 0)); }
  const wave = growTube(new THREE.CatmullRomCurve3(wpts), 0.008, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.2, 2.0), toneMapped: false }), 320, 6); Z.add(wave);
  const NS = 36, samp = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 1, 0.03), plasticS(0xe9edf2, 0.3), NS); samp.frustumCulled = false; samp.castShadow = true; Z.add(samp);
  const sv = []; for (let i = 0; i < NS; i++) { const u = (i + 0.5) / NS; sv.push({ x: -0.9 + u * 1.8, v: 0.28 * Math.sin(u * 13) * (0.6 + 0.4 * Math.sin(u * 3.1)) }); }
  const digits = []; for (let k = 0; k < 6; k++) { const s = signPlane(['0110 1001', '1011 0010', '0001 1110', '1100 0101', '0111 0011', '1010 1100'][k], { w: 0.62, h: 0.1, col: '#62E3D4', font: '"SpaceMono"', weight: 700, ls: 4 }); Z.add(s); digits.push(s); }
  // sala con paneles acústicos, micro y altavoz
  const R = new THREE.Group(); R.position.set(2.6, 0, -0.4); Z.add(R);
  const wm = plasticS(0x1a1d22, 0.8);
  const back = rbox(1.6, 1.2, 0.05, wm, 0.01); back.position.set(0, 0.6, -0.6); const side = rbox(0.05, 1.2, 1.2, wm, 0.01); side.position.set(-0.8, 0.6, 0); R.add(back, side);
  const foam = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.07, 4), plasticS(0x2b3038, 0.9), 200); foam.frustumCulled = false; foam.castShadow = true; R.add(foam);
  { let n = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let j = 0; j < 9; j++) for (let i = 0; i < 14; i++) { e.set(Math.PI / 2, 0, Math.PI / 4); q.setFromEuler(e); m4.compose(v3(-0.72 + i * 0.11, 0.12 + j * 0.12, -0.55), q, v3(1, 1, 1)); foam.setMatrixAt(n++, m4); }
    for (let j = 0; j < 9; j++) for (let i = 0; i < 8 && n < 200; i++) { e.set(0, 0, -Math.PI / 2); q.setFromEuler(e); m4.compose(v3(-0.75, 0.12 + j * 0.12, -0.45 + i * 0.12), q, v3(1, 1, 1)); foam.setMatrixAt(n++, m4); }
    foam.count = n; foam.instanceMatrix.needsUpdate = true; }
  const mic = new THREE.Group(); mic.position.set(-0.25, 0, 0.1); R.add(mic);
  const stand = cyl(0.008, 0.008, 1.0, metalS(0x8c939d), 10); stand.position.y = 0.5; const mbase = cyl(0.1, 0.11, 0.02, metalS(0x3a3f47), 24); mbase.position.y = 0.01;
  const body = cyl(0.03, 0.022, 0.14, metalS(0x2a2e35, 0.3), 24); body.position.y = 1.07; body.rotation.z = 0.25;
  const grille = sph(0.045, new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.35, metalness: 0.9, wireframe: true })); grille.position.set(-0.025, 1.17, 0);
  const gcore = sph(0.038, metalS(0x30343b, 0.4)); gcore.position.copy(grille.position);
  mic.add(stand, mbase, body, grille, gcore);
  const spk = speaker(TEA); spk.position.set(0.45, 0, -0.1); spk.rotation.y = -0.6; spk.scale.setScalar(1.1); R.add(spk);
  // emisión: antena alta y un campo de pantallas que se encienden cuando llega la onda
  const B = new THREE.Group(); B.position.set(5.6, 0, -1.2); Z.add(B);
  const ant = tower(0xe9edf2); ant.scale.setScalar(1.8); B.add(ant);
  const NSC = 2400, scr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.09, 0.008), selfLit(new THREE.MeshStandardMaterial({ roughness: 0.4 }), 1.2), NSC);
  scr.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NSC * 3), 3); scr.frustumCulled = false; B.add(scr);
  const sP = []; { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let n = 0;
    for (let i = 0; i < NSC; i++) { const a = hash(i * 2.3) * 6.283, r = 0.7 + Math.sqrt(hash(i * 4.1)) * 7.5, P = v3(Math.cos(a) * r, 0.06 + hash(i * 6.7) * 0.06, Math.sin(a) * r);
      q.setFromEuler(new THREE.Euler(-0.15, -a - Math.PI / 2, 0)); m4.compose(P, q, v3(1, 1, 1)); scr.setMatrixAt(n++, m4); sP.push({ P, r }); }
    scr.instanceMatrix.needsUpdate = true; }
  const bR = []; for (let k = 0; k < 3; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 96), basicGlow(0x9fe9ff, 1.4)); r.rotation.x = Math.PI / 2; r.position.y = 0.06; B.add(r); bR.push(r); }
  Z.userData = { wave, samp, sv, digits, R, foam, mic, spk, B, ant, scr, sP, bR };
  return Z;
}

// ---------------------------------------------------------------- el truco del sonido: espectro y curva de enmascaramiento
function buildSpectrum() {
  const Z = new THREE.Group(); Z.position.set(0, 0, 0.75); scene.add(Z);
  const N = 26, bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.026, 1, 0.026), plasticS(0xe9edf2, 0.28), N);
  bars.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); bars.frustumCulled = false; bars.castShadow = true; Z.add(bars);
  const H0 = []; for (let i = 0; i < N; i++) H0.push(0.07 + 0.12 * hash(i * 3.9) + 0.06 * Math.sin(i * 0.7) ** 2);
  const LOUD = 12, WEAK = 14; H0[LOUD] = 0.6; H0[WEAK] = 0.13;
  // curva de enmascaramiento: tienda alrededor del sonido fuerte
  const sh = new THREE.Shape(); sh.moveTo(-0.12, 0); sh.lineTo(0, 1.0); sh.lineTo(0.22, 0); sh.closePath();
  const tent = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.85, 0.25), transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  Z.add(tent); const tl = polyline([v3(-0.12, 0, 0), v3(0, 1.0, 0), v3(0.22, 0, 0)], lineMat(0xffb547, 2.4, 1)); tent.add(tl);
  const shards = new THREE.InstancedMesh(new THREE.BoxGeometry(0.014, 0.014, 0.014), plasticS(TEA, 0.3), 40); shards.frustumCulled = false; Z.add(shards);
  Z.userData = { bars, H0, LOUD, WEAK, N, tent, shards };
  return Z;
}
