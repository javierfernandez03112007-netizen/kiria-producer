// ---------------------------------------------------------------- el dinero: torres de fajos de billetes que salen de la arena (la altura es el dinero: MS unidades por cada 1.000 M$),
// las bobinas de cine (la película más taquillera y la más cara), la torre de cristal de GTA 6 que se llena al final, el rascacielos, el contador de días con la medalla,
// la torre de cajas de juego frente a la pirámide de gente de Brasil, el calendario del 19 de noviembre y la etiqueta del precio. Billetes que vuelan.
const MS = 1.2;
const PZ = { g5: v3(2.3, 0, -0.9), reel: v3(4.6, 0, -1.5), g6: v3(6.9, 0, -0.5), cost: v3(7.4, 0, -16.5), sky: v3(7.5, 0, -15.55), reel2: v3(7.3, 0, -17.65), cal: v3(5.45, 0, 1.05) };
function canvasPlane(w, h, px, draw, opts = {}) {
  const t = canvasTex(px, Math.round(px * h / w), draw); const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: opts.r ?? 0.85, transparent: !!opts.tr, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }), opts.cs ?? false);
  m.userData.tex = t; return m;
}
const ST1 = { tw: v3(2.7, 0, -12.6), sign: v3(1.72, 0, -12.15) }, ST2 = { box: v3(3.0, 0, -20.4), pyr: v3(4.4, 0, -20.9) };
const HOOK_CAM = v3(0.6, 0.42, 8.2);
// ---------- texturas: billete (inventado: sin retrato ni diseño real), fajos de lado y desde arriba
function billDraw(g, x, y, w, h) {
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#e7efdc'); gr.addColorStop(1, '#c9d9bc'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.strokeStyle = '#2f6247'; g.lineWidth = Math.max(1, h * 0.04); g.strokeRect(x + h * 0.06, y + h * 0.06, w - h * 0.12, h - h * 0.12);
  g.fillStyle = 'rgba(47,98,71,.18)'; for (let i = 0; i < 6; i++) g.fillRect(x + w * 0.08, y + h * (0.3 + i * 0.08), w * 0.25, h * 0.02);
  g.beginPath(); g.ellipse(x + w * 0.62, y + h * 0.5, h * 0.3, h * 0.33, 0, 0, 7); g.fillStyle = 'rgba(47,98,71,.25)'; g.fill(); g.strokeStyle = 'rgba(47,98,71,.6)'; g.lineWidth = Math.max(1, h * 0.03); g.stroke();
  for (let r = 0.08; r < 0.3; r += 0.07) { g.beginPath(); g.ellipse(x + w * 0.62, y + h * 0.5, h * r, h * (r + 0.02), 0, 0, 7); g.stroke(); }
  g.fillStyle = '#2f6247'; g.font = `900 ${h * 0.24}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('100', x + w * 0.13, y + h * 0.2); g.fillText('100', x + w * 0.88, y + h * 0.8);
}
let BILL_T = null, SIDE_T = null, TOP_T = null;
function moneyTex() {
  BILL_T = canvasTex(256, 110, (g, w, h) => billDraw(g, 0, 0, w, h));
  SIDE_T = canvasTex(512, 512, (g, w, h) => { const cols = 6, rows = 16, bw = w / cols, bh = h / rows; g.fillStyle = '#26301f'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) { const x = c * bw + (r % 2 ? bw / 2 : 0) + 2, y = r * bh + 2, ww = bw - 4, hh = bh - 4, k = hash(r * 31 + c * 7);
      const base = `rgb(${190 + k * 22},${206 + k * 16},${176 + k * 18})`; g.fillStyle = base; g.fillRect(x, y, ww, hh);
      for (let yy = y + 2; yy < y + hh; yy += 2.2) { g.fillStyle = `rgba(40,70,48,${0.12 + hash(yy * 3 + c) * 0.16})`; g.fillRect(x, yy, ww, 0.8); }
      g.fillStyle = '#e2c770'; g.fillRect(x + ww * 0.42, y, ww * 0.16, hh); g.fillStyle = 'rgba(120,80,20,.35)'; g.fillRect(x + ww * 0.42, y, 1.5, hh); g.fillRect(x + ww * 0.58 - 1.5, y, 1.5, hh);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x, y, ww, 1.5); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y + hh - 1.5, ww, 1.5); } });
  TOP_T = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#26301f'; g.fillRect(0, 0, w, h); const cols = 4, rows = 8, bw = w / cols, bh = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = c * bw + 3, y = r * bh + 3; billDraw(g, x, y, bw - 6, bh - 6); g.fillStyle = '#e2c770'; g.fillRect(x + (bw - 6) * 0.42, y, (bw - 6) * 0.16, bh - 6); } });
  for (const t of [SIDE_T, TOP_T]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
}
// ---------- torre de fajos: setH(h) cambia la altura sin estirar la textura
function moneyTower(w, d = w) {
  const side = SIDE_T.clone(), sideZ = SIDE_T.clone(), top = TOP_T.clone(); for (const t of [side, sideZ, top]) { t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  const mS = new THREE.MeshStandardMaterial({ map: side, roughness: 0.72 }), mZ = new THREE.MeshStandardMaterial({ map: sideZ, roughness: 0.72 }), mT = new THREE.MeshStandardMaterial({ map: top, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), [mZ, mZ, mT, mT, mS, mS]); body.castShadow = true; body.receiveShadow = true;
  const g = new THREE.Group(); g.add(body); scene.add(g);
  const T = { g, body, w, d, h: -1, setH(h) { h = Math.max(0.0005, h); if (Math.abs(h - T.h) < 1e-5) return; T.h = h; body.scale.set(w, h, d); side.repeat.set(w / 0.96, h / 1.12); sideZ.repeat.set(d / 0.96, h / 1.12); top.repeat.set(w / 0.9, d / 0.9); } };
  T.setH(0.001); return T;
}
// ---------- rótulo flotante (placa oscura con dos líneas) que mira a la cámara
function tag3(l1, l2, c2 = '#FFC24A', w = 1.4, c1 = '#ffffff') {
  const h = w * 0.42, t = canvasTex(640, Math.round(640 * h / w), (g, W2, H2) => { g.clearRect(0, 0, W2, H2); g.fillStyle = 'rgba(12,16,24,.86)'; rr(g, 6, 6, W2 - 12, H2 - 12, H2 * 0.16); g.fill();
    g.fillStyle = c2; g.fillRect(6, H2 - 18, W2 - 12, 12);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = c1; g.font = `900 ${H2 * (l2 ? 0.34 : 0.48)}px Inter`; g.fillText(l1, W2 / 2, l2 ? H2 * 0.32 : H2 * 0.48, W2 * 0.9);
    if (l2) { g.fillStyle = c2; g.font = `900 ${H2 * 0.3}px Inter`; g.fillText(l2, W2 / 2, H2 * 0.68, W2 * 0.9); } });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  m.renderOrder = 8; scene.add(m); m.visible = false; return m;
}
function faceCam(o) { o.rotation.set(0, Math.atan2(cam.position.x - o.position.x, cam.position.z - o.position.z), 0); }
function showTag(o, pos, k) { o.visible = k > 0.01; if (!o.visible) return; o.position.copy(pos); faceCam(o); o.scale.setScalar(Math.max(0.0001, k)); }
// ---------- bobina de cine (aluminio con seis huecos, película enrollada y una tira que cae hasta la arena)
function filmTex() { return canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#1a1612'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) { g.fillStyle = '#e8e2d4'; g.fillRect(8, y + 4, 12, 8); g.fillRect(w - 20, y + 4, 12, 8); }
  for (let y = 0; y < h; y += 96) { const gr = g.createLinearGradient(0, y, 0, y + 88); gr.addColorStop(0, '#ff9a5a'); gr.addColorStop(0.5, '#e8508a'); gr.addColorStop(1, '#5a3cc0'); g.fillStyle = gr; g.fillRect(28, y + 6, w - 56, 84);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(w / 2, y + 40, 14, 0, 7); g.fill(); } }); }
function reel(R) {
  const g = new THREE.Group(), sh = new THREE.Shape(); sh.absarc(0, 0, R, 0, Math.PI * 2, false);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.26, h = new THREE.Path(); h.absarc(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55, R * 0.24, 0, Math.PI * 2, true); sh.holes.push(h); }
  const hub = new THREE.Path(); hub.absarc(0, 0, R * 0.07, 0, Math.PI * 2, true); sh.holes.push(hub);
  const fg = new THREE.ExtrudeGeometry(sh, { depth: R * 0.03, bevelEnabled: true, bevelThickness: R * 0.012, bevelSize: R * 0.012, bevelSegments: 2, curveSegments: 40 });
  const al = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, roughness: 0.28, metalness: 0.85 });
  for (const z of [-R * 0.16, R * 0.13]) { const f = new THREE.Mesh(fg, al); f.position.z = z; f.castShadow = true; f.receiveShadow = true; g.add(f); }
  const wound = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.82, R * 0.82, R * 0.27, 64, 1, false).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.45, metalness: 0.2 })); wound.castShadow = true; g.add(wound);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.16, R * 0.16, R * 0.36, 24).rotateX(Math.PI / 2), al); g.add(core);
  // la tira de película que baja desde el borde y se enrolla en la arena
  const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(v3(R * 0.82 + u * R * 0.5, -u * u * R * 0.95 + (1 - u) * R * 0.05, 0)); }
  for (let i = 1; i <= 12; i++) { const u = i / 12; pts.push(v3(R * 1.32 + u * R * 0.6, -R * 0.99, Math.sin(u * 3) * R * 0.25)); }
  const curve = new THREE.CatmullRomCurve3(pts), N = 120, pos = [], uv = [], idx = [], wdt = R * 0.12;
  for (let i = 0; i <= N; i++) { const u = i / N, p = curve.getPoint(u); pos.push(p.x, p.y, p.z - wdt, p.x, p.y, p.z + wdt); uv.push(0, u * 9, 1, u * 9); if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); sg.setIndex(idx); sg.computeVertexNormals();
  const ft = filmTex(); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; const strip = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: ft, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide })); strip.castShadow = true; g.add(strip);
  const out = new THREE.Group(); g.position.y = R; out.add(g); scene.add(out); return { g: out, R };
}
// ---------- rascacielos (maqueta de un superrascacielos inventado: planta en tres alas, retranqueos y aguja)
function skyscraper(H) {
  const g = new THREE.Group(), gm = new THREE.MeshPhysicalMaterial({ color: 0x9fc4e0, roughness: 0.12, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.05 }), fm = new THREE.MeshStandardMaterial({ color: 0xe9eef2, roughness: 0.4, metalness: 0.5 });
  const wing = (len, wd, h) => { const s = new THREE.Shape(); s.moveTo(-wd / 2, 0); s.lineTo(wd / 2, 0); s.lineTo(wd / 2, len - wd / 2); s.absarc(0, len - wd / 2, wd / 2, 0, Math.PI, false); s.lineTo(-wd / 2, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 10 }); geo.rotateX(-Math.PI / 2); return geo; };
  const segs = 9; let y = 0;
  for (let i = 0; i < segs; i++) { const h = H * 0.62 / segs, sc = 1 - i / segs * 0.82;
    for (let k = 0; k < 3; k++) { if (i > 0 && k === i % 3 && i > 5) continue; const len = H * 0.17 * sc * (k === (i % 3) ? 0.82 : 1), m = new THREE.Mesh(wing(len, H * 0.075 * (0.55 + 0.45 * sc), h), gm); m.position.y = y; m.rotation.y = k * 2.094; m.castShadow = true; g.add(m); }
    const band = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.05 * (0.5 + 0.5 * sc), H * 0.05 * (0.5 + 0.5 * sc), h * 0.06, 12), fm); band.position.y = y + h; g.add(band); y += h; }
  const core = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.012, H * 0.04, H * 0.18, 12), gm); core.position.y = y + H * 0.09; g.add(core);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.002, H * 0.012, H * 0.2, 8), fm); spire.position.y = y + H * 0.28; spire.castShadow = true; g.add(spire);
  scene.add(g); return g;
}
// ---------- calendario de taco (19 NOV) y etiqueta de precio
function calendarBlock() {
  const t = canvasTex(512, 600, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#e53935'; g.fillRect(0, 0, w, 150); g.fillStyle = '#ffffff'; g.font = '900 78px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NOVIEMBRE', w / 2, 80);
    g.fillStyle = '#16181d'; g.font = '900 330px Inter'; g.fillText('19', w / 2, 360); g.fillStyle = '#e53935'; g.font = '900 56px Inter'; g.fillText('JUEVES · 2026', w / 2, 540);
    g.fillStyle = '#9aa1ab'; for (let x = 40; x < w; x += 54) { g.beginPath(); g.arc(x, 18, 9, 0, 7); g.fill(); } });
  const side = flatM(0xf2efe8, 0.8), m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.17, 0.26).translate(0, 0.585, 0), [side, side, side, side, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), side]);
  m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
function priceTag() {
  const W2 = 1.0, H2 = 0.56, s = new THREE.Shape(); s.moveTo(-W2 / 2 + 0.16, H2 / 2); s.lineTo(W2 / 2 - 0.05, H2 / 2); s.quadraticCurveTo(W2 / 2, H2 / 2, W2 / 2, H2 / 2 - 0.05); s.lineTo(W2 / 2, -H2 / 2 + 0.05); s.quadraticCurveTo(W2 / 2, -H2 / 2, W2 / 2 - 0.05, -H2 / 2);
  s.lineTo(-W2 / 2 + 0.16, -H2 / 2); s.lineTo(-W2 / 2, 0); s.lineTo(-W2 / 2 + 0.16, H2 / 2); const hole = new THREE.Path(); hole.absarc(-W2 / 2 + 0.11, 0, 0.035, 0, 7, true); s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 }); geo.translate(0, 0, -0.01);
  const pos = geo.attributes.position, uv = []; for (let i = 0; i < pos.count; i++) uv.push((pos.getX(i) + W2 / 2) / W2, (pos.getY(i) + H2 / 2) / H2); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const mk = txt => canvasTex(1000, 560, (g, w, h) => { g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e53935'; g.lineWidth = 16; g.strokeRect(190, 26, w - 216, h - 52);
    g.fillStyle = '#e53935'; g.font = '900 210px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 590, 300, 740); });
  const tA = mk('79,99 €'), tB = mk('¿80 €?'); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tA, roughness: 0.55 })); m.castShadow = true;
  const g = new THREE.Group(); m.position.set(W2 / 2 - 0.11, -0.12, 0); m.rotation.z = -0.22; g.add(m);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 3, 5).translate(0, 1.5, 0), flatM(0x8a6a44)); str.position.set(0, -0.12, 0); g.add(str);
  scene.add(g); g.visible = false; return { g, m, tA, tB };
}
// ---------- la pirámide de Brasil: gradas con gente (se crean con el resto de la gente) y la bandera arriba
const BRZ = { tiers: 5, h: 2.13 / 5, w0: 1.5, w1: 0.34 };
function buildBrazilPeople(add) {
  const c = ST2.pyr;
  for (let k = 0; k < BRZ.tiers; k++) { const y = (k + 1) * BRZ.h, half = (BRZ.w0 - (BRZ.w0 - BRZ.w1) * (k + 1) / BRZ.tiers) / 2, n = Math.max(6, Math.round(half * 8 / 0.09));
    for (let i = 0; i < n; i++) { const u = i / n, side = Math.floor(u * 4), f = (u * 4) % 1, e = half - 0.035; let x, z;
      if (side === 0) { x = -e + f * 2 * e; z = e; } else if (side === 1) { x = e; z = e - f * 2 * e; } else if (side === 2) { x = e - f * 2 * e; z = -e; } else { x = -e; z = -e + f * 2 * e; }
      const t0 = k * 0.12 + hash(i * 3.3 + k) * 0.18;
      add({ x: c.x + x, z: c.z + z, y, yaw: Math.atan2(x, z), grp: 4, k0: t => pop(t, K.mas4b - 0.2 + t0, 0.3) * (1 - win(t, K.rockstar5 + 0.3, 0.3)) }); } }
}
// ---------- todo junto
function buildMoney() {
  moneyTex();
  S.g5 = moneyTower(1.05); S.g5.g.position.copy(PZ.g5);
  S.reel = reel(2.925 * MS / 2); S.reel.g.position.copy(PZ.reel); S.reel.g.rotation.y = Math.atan2(HOOK_CAM.x - PZ.reel.x, HOOK_CAM.z - PZ.reel.z) + 0.05;
  // la torre de cristal de GTA 6 (vacía hasta el final) con su interrogación y la línea de la película más taquillera
  { const G = new THREE.Group(); G.position.copy(PZ.g6); scene.add(G); S.g6G = G;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.4, 1.1).translate(0, 2.2, 0), new THREE.MeshPhysicalMaterial({ color: 0xcfeaff, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, clearcoat: 1, side: THREE.DoubleSide }));
    glass.renderOrder = 3; G.add(glass); edges(glass, 0xffffff, 2.2, 28, 0.9);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.3).translate(0, 0.04, 0), flatM(0xffffff, 0.5)); base.castShadow = true; base.receiveShadow = true; G.add(base);
    for (let k = 1; k <= 3; k++) { const tick = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.012, 1.12).translate(0, k * MS, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })); G.add(tick); }
    S.g6 = moneyTower(0.95); S.g6.g.position.set(PZ.g6.x, 0.08, PZ.g6.z);
    S.qm = canvasPlane(0.85, 1.06, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ffb547'; g.font = '900 560px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(255,170,60,.9)'; g.shadowBlur = 40; g.fillText('?', w / 2, h * 0.54); }, { tr: true });
    S.qm.material = new THREE.MeshBasicMaterial({ map: S.qm.userData.tex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }); S.qm.renderOrder = 6; scene.add(S.qm);
    // la línea de la película n.º 1 (a la altura de la bobina), de la bobina a la torre de GTA 6
    const top = 2.925 * MS, a = v3(PZ.reel.x, top, PZ.reel.z), b = v3(PZ.g6.x + 0.55, top, PZ.g6.z); S.topLine = polyline([a, b], lineMat(0xffc24a, 3, 0.95, true)); S.topLine.visible = false; scene.add(S.topLine); }
  // el coste (frases 5 y 6): torre de coste, rascacielos, sello «NO» y la bobina de la película más cara
  S.cost = moneyTower(0.8); S.cost.g.position.copy(PZ.cost);
  { const gt = SIDE_T.clone(); gt.needsUpdate = true; gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(0.84 / 0.96, 0.5 * MS / 1.12); S.bandT = gt; }
  S.band = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1, 0.84).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ map: S.bandT, color: 0xfff0c0, transparent: true, opacity: 0.42, depthWrite: false, roughness: 0.6 })); S.band.position.copy(PZ.cost); S.band.renderOrder = 4; scene.add(S.band); edges(S.band, 0xffc24a, 2, 28, 0.9);
  S.sky = S.sky; S.tower = skyscraper(1.5 * MS); S.tower.position.copy(PZ.sky);
  S.no = canvasPlane(0.9, 0.5, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.rotate(-0.12); g.strokeStyle = '#ff3b30'; g.lineWidth = 22; rr(g, -w / 2 + 20, -h / 2 + 20, w - 40, h - 40, 26); g.stroke();
    g.fillStyle = '#ff3b30'; g.font = '900 190px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NO', 0, 8); g.restore(); }, { tr: true });
  S.no.material = new THREE.MeshBasicMaterial({ map: S.no.userData.tex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }); S.no.renderOrder = 9; scene.add(S.no);
  S.reel2 = reel(0.659 * MS / 2); S.reel2.g.position.copy(PZ.reel2); S.reel2.g.rotation.y = 0.9;
  // la parada 1: el contador de días, la torre que sube y la medalla
  S.day = moneyTower(0.85); S.day.g.position.copy(ST1.tw);
  { const t = canvasTex(512, 256, () => {}); S.dayT = t; const side = flatM(0x23262d, 0.5); S.dayBoard = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.06), [side, side, side, side, new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), side]);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04).translate(0, -0.47, 0), flatM(0x2b2f36)); S.dayBoard.add(legs); S.dayBoard.position.set(ST1.sign.x, 0.72, ST1.sign.z); S.dayBoard.rotation.y = -0.65; S.dayBoard.castShadow = true; scene.add(S.dayBoard); }
  { const g = new THREE.Group(), disc = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 40).rotateX(Math.PI / 2), M.gold); disc.castShadow = true; g.add(disc);
    const face = canvasPlane(0.4, 0.4, 256, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = '#7a4f0a'; gg.font = '900 58px Inter'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText('RÉCORD', w / 2, h * 0.42); gg.font = '900 40px Inter'; gg.fillText('MUNDIAL', w / 2, h * 0.62); }, { tr: true });
    face.position.z = 0.03; g.add(face); const f2 = face.clone(); f2.rotation.y = Math.PI; f2.position.z = -0.03; g.add(f2);
    for (const s of [-1, 1]) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.01), new THREE.MeshStandardMaterial({ color: s < 0 ? 0xd62828 : 0x1d4ed8, roughness: 0.6 })); rib.position.set(s * 0.07, 0.36, -0.01); rib.rotation.z = s * 0.25; g.add(rib); }
    scene.add(g); S.medal = g; }
  // la parada 2: la torre de cajas de juego (copias) y la pirámide de Brasil con su bandera
  { const cover = canvasTex(256, 320, (g, w, h) => { g.fillStyle = '#0f1a2b'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 30, 0, h - 30); gr.addColorStop(0, '#ffb15c'); gr.addColorStop(0.55, '#ff5c8a'); gr.addColorStop(1, '#3b2a8f'); g.fillStyle = gr; g.fillRect(14, 40, w - 28, h - 54);
      g.fillStyle = '#ffe9b0'; g.beginPath(); g.arc(w / 2, h * 0.55, 42, 0, 7); g.fill(); g.fillStyle = '#1c1030'; for (let i = 0; i < 3; i++) { g.fillRect(40 + i * 70, h * 0.5, 6, h * 0.42); g.beginPath(); g.ellipse(43 + i * 70, h * 0.5, 34, 10, -0.3, 0, 7); g.fill(); }
      g.fillStyle = '#ffffff'; g.fillRect(14, 10, w - 28, 22); });
    const spine = canvasTex(256, 32, (g, w, h) => { g.fillStyle = '#f4f6f9'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f5fd6'; g.fillRect(0, 0, 34, h); g.fillStyle = '#ff5c8a'; g.fillRect(40, 9, w - 60, h - 18); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, h - 3, w, 3); });
    const spineM = new THREE.MeshStandardMaterial({ map: spine, roughness: 0.45 }), caseM = [spineM, spineM, new THREE.MeshStandardMaterial({ map: cover, roughness: 0.4 }), flatM(0x1b2232), spineM, spineM];
    const geo = new THREE.BoxGeometry(0.23, 0.028, 0.29); S.boxes = []; const nl = Math.round(2.3 / 0.03);
    S.boxIM = new THREE.InstancedMesh(geo, caseM, nl * 9); S.boxIM.castShadow = true; S.boxIM.receiveShadow = true; S.boxIM.frustumCulled = false; scene.add(S.boxIM);
    for (let l = 0; l < nl; l++) for (let c = 0; c < 9; c++) S.boxes.push({ l, x: ((c % 3) - 1) * 0.245 + (hash(l * 9 + c) - 0.5) * 0.02, z: (Math.floor(c / 3) - 1) * 0.305 + (hash(l * 7 + c) - 0.5) * 0.02, ry: (hash(l * 5 + c) - 0.5) * 0.08 }); }
  { const g = new THREE.Group(), stoneM = [flatM(0x1f9e4a, 0.8), flatM(0x2bb15a, 0.8)], edgeM = flatM(0xf7d116, 0.6);
    for (let k = 0; k < BRZ.tiers; k++) { const w = BRZ.w0 - (BRZ.w0 - BRZ.w1) * k / BRZ.tiers, b = new THREE.Mesh(new THREE.BoxGeometry(w, BRZ.h, w).translate(0, BRZ.h / 2 + k * BRZ.h, 0), stoneM[k % 2]); b.castShadow = true; b.receiveShadow = true; g.add(b);
      const e = new THREE.Mesh(new THREE.BoxGeometry(w + 0.012, 0.03, w + 0.012).translate(0, (k + 1) * BRZ.h - 0.015, 0), edgeM); g.add(e); }
    const flagT = canvasTex(300, 210, (gg, w, h) => { gg.fillStyle = '#1f9e4a'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#f7d116'; gg.beginPath(); gg.moveTo(w / 2, 18); gg.lineTo(w - 22, h / 2); gg.lineTo(w / 2, h - 18); gg.lineTo(22, h / 2); gg.closePath(); gg.fill();
      gg.fillStyle = '#2a4fbf'; gg.beginPath(); gg.arc(w / 2, h / 2, 52, 0, 7); gg.fill(); gg.strokeStyle = '#ffffff'; gg.lineWidth = 6; gg.beginPath(); gg.arc(w / 2, h / 2 + 70, 92, -2.2, -0.95); gg.stroke(); });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35, 12, 1), new THREE.MeshStandardMaterial({ map: flagT, side: THREE.DoubleSide, roughness: 0.7 })); flag.position.set(0.27, BRZ.tiers * BRZ.h + 0.42, 0); flag.castShadow = true; g.add(flag); S.flag = flag;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.62, 6).translate(0, 0.31, 0), flatM(0xe8e8e8)); pole.position.y = BRZ.tiers * BRZ.h; g.add(pole);
    g.position.copy(ST2.pyr); scene.add(g); S.pyr = g; }
  S.cal = calendarBlock(); S.cal.position.copy(PZ.cal); S.cal.scale.setScalar(0.68);
  S.tag = priceTag();
  // rótulos
  S.tags = { g5: tag3('GTA 5', 'MÁS DE 6.000 M$', '#7CF0A9', 1.25), reel: tag3('PELÍCULA N.º 1', '2.925 M$', '#FFC24A', 1.3), g6: tag3('GTA 6', 'SALE EL 19', '#FFB547', 0.95),
    day: tag3('GTA 5', '', '#7CF0A9', 1.2), boxes: tag3('COPIAS DE GTA 5', '230 M', '#7CF0A9', 0.95), brazil: tag3('HABITANTES DE BRASIL', '213 M', '#F7D116', 1.0),
    sky: tag3('EL EDIFICIO MÁS ALTO', '1.500 M$', '#8FE6FF', 1.05), cost: tag3('COSTE DE GTA 6', '1.000–1.500 M$', '#FFC24A', 1.0), reel2: tag3('LA PELÍCULA MÁS CARA', '659 M$', '#FF8A80', 1.0),
    g6b: tag3('GTA 6 · 1.ER AÑO', '3.200 M$', '#7CF0A9', 1.2), costQ: tag3('COSTE DE GTA 6', '¿?', '#FFB547', 1.0) };
  buildBills();
}
// ---------- billetes que vuelan: la explosión de GTA 5 (con la arena), la de GTA 6 al pasar a la película y la lluvia del final
function buildBills() {
  const N = 520; S.billN = N; S.bills = [];
  for (let i = 0; i < N; i++) S.bills.push({ a: hash(i * 1.37) * 6.283, v: 0.6 + hash(i * 2.91) * 1.6, up: 1.4 + hash(i * 4.13) * 3.2, h0: hash(i * 7.7), spin: 2 + hash(i * 5.5) * 6, ax: hash(i * 6.1), grp: i < 300 ? 0 : i < 420 ? 1 : 2 });
  const m = new THREE.MeshStandardMaterial({ map: BILL_T, side: THREE.DoubleSide, roughness: 0.7 });
  S.billIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 0.052), m, N); S.billIM.castShadow = true; S.billIM.frustumCulled = false; scene.add(S.billIM);
  S.sandIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 0), flatM(0xe2c48f, 0.95), 160); S.sandIM.castShadow = true; S.sandIM.frustumCulled = false; scene.add(S.sandIM);
}
// tiempo de la explosión inicial: corre normal y, en el último medio segundo, rebobina hasta el estado del primer fotograma (bucle)
const ERUPT0 = 0.12;          // en el primer fotograma la torre ya va por un tercio
const REW = 0.55;
function eruptT(t) { if (t > END - REW) return ERUPT0 + (END - t) / REW * 1.25; return t + ERUPT0; }
function billsAt(t) {
  const te = eruptT(t), top5 = S.g5.h, M2 = S.billIM;
  for (let i = 0; i < S.billN; i++) { const b = S.bills[i]; let p = null, sc = 1, tt = 0;
    if (b.grp === 0) { tt = te - b.h0 * 0.5; if (tt > 0 && tt < 6) { const r = b.v * (1 - Math.exp(-tt * 1.6)) * 1.6, y0 = top5 * (0.15 + b.h0 * 0.85);
        p = _p.set(PZ.g5.x + Math.cos(b.a) * (0.55 + r), Math.max(0.01, y0 + b.up * tt * Math.exp(-tt * 1.2) - 0.55 * tt), PZ.g5.z + Math.sin(b.a) * (0.55 + r)); sc = (1 - win(tt, 5.2, 0.6)) * (t > END - REW ? win(t, END - REW, 0.2) : 1); } }
    else if (b.grp === 1) { tt = t - (K.pelicula8 - 0.05) - b.h0 * 0.35; if (tt > 0 && t < END - 0.65) { const r = b.v * (1 - Math.exp(-tt * 1.4)) * 1.4, y0 = S.g6.h + 0.1;
        p = _p.set(PZ.g6.x + Math.cos(b.a) * (0.5 + r), Math.max(0.01, y0 + b.up * 0.6 * tt * Math.exp(-tt) - 0.32 * tt), PZ.g6.z + Math.sin(b.a) * (0.5 + r)); sc = 1 - win(t, END - 1.0, 0.35); } }
    else { tt = t - K.pagarias9 + b.h0 * 2.5; if (tt > 0 && t < END - 0.65) { const fall = 7 - 0.7 * tt; if (fall > 0.01) p = _p.set(3 + Math.cos(b.a) * 4.5 * b.ax + 1.5, fall, 0.5 + Math.sin(b.a) * 4.5 * b.ax); sc = 1 - win(t, END - 1.0, 0.35); } }
    if (!p || sc <= 0.01) { M2.setMatrixAt(i, _zero); continue; }
    const fl = p.y > 0.02 ? 1 : 0; _q.setFromEuler(_e.set(fl ? Math.sin(tt * b.spin) * 1.2 : -Math.PI / 2, b.a + tt * b.spin * 0.3 * fl, fl ? Math.cos(tt * b.spin * 0.7) * 0.8 : 0));
    _s.setScalar(sc * (b.grp === 2 ? 1.3 : 1)); _m4.compose(p, _q, _s); M2.setMatrixAt(i, _m4); }
  M2.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < 160; i++) { const a = hash(i * 3.9) * 6.283, v = 0.8 + hash(i * 1.3) * 2, up = 2 + hash(i * 2.2) * 3, tt = te - hash(i * 8.1) * 0.25;
    if (tt <= 0 || tt > 1.6) { S.sandIM.setMatrixAt(i, _zero); continue; }
    const y = 0.02 + up * tt - 4.5 * tt * tt; _p.set(PZ.g5.x + Math.cos(a) * (0.5 + v * tt), Math.max(0.01, y), PZ.g5.z + Math.sin(a) * (0.5 + v * tt)); _q.identity(); _s.setScalar((0.6 + hash(i) * 1.2) * (1 - win(tt, 1.1, 0.5)) * (t > END - REW ? win(t, END - REW, 0.2) : 1)); _m4.compose(_p, _q, _s); S.sandIM.setMatrixAt(i, _m4); }
  S.sandIM.instanceMatrix.needsUpdate = true;
}
function dayBoard(n, k) {
  const g = S.dayT.userData.g, w = 512, h = 256; g.clearRect(0, 0, w, h); g.fillStyle = '#16181d'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2a2e36'; g.fillRect(16, 16, w - 32, h - 32); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(16, h / 2 - 2, w - 32, 4);
  g.save(); g.translate(w / 2, h / 2); g.scale(1, Math.max(0.05, Math.abs(Math.cos(k * Math.PI)))); g.fillStyle = '#FFC24A'; g.font = '900 150px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DÍA ' + n, 0, 8); g.restore();
  S.dayT.needsUpdate = true;
}
const _vt = new THREE.Vector3();
function moneyAt(t) {
  // GTA 5: sale de la arena en el primer segundo (y rebobina al final)
  const te = eruptT(t), h5 = 6.0 * MS * (1 - Math.pow(1 - clamp(te / 1.05), 3)) * (1 + 0.04 * Math.sin(clamp(te / 1.05) * 9) * (1 - clamp(te / 1.05)));
  S.g5.setH(Math.max(0.002, h5)); S.g5.g.position.y = 0; S.g5.g.rotation.y = 0.04 * Math.sin(te * 20) * Math.exp(-te * 3);
  showTag(S.tags.g5, _vt.set(PZ.g5.x - 0.05, Math.min(h5 * 0.5, 2.3), PZ.g5.z + 0.62), Math.max(window.COVER_G5 ? 1 : 0, win(t, K.es2 - 0.15, 0.3) * (1 - win(t, K.el3 - 0.1, 0.3))));
  if (t < K.el3) showTag(S.tags.reel, _vt.set(PZ.reel.x - 0.75, 1.45, PZ.reel.z + 0.85), win(t, K.pelicula1 - 0.1, 0.3) * (1 - win(t, K.y2 + 0.4, 0.3)));
  else showTag(S.tags.reel, _vt.set(PZ.reel.x + 0.15, 2.925 * MS + 0.36, PZ.reel.z), win(t, K.pelicula8 - 0.1, 0.3) * (1 - win(t, K.pagarias9 - 0.2, 0.3)));
  // GTA 6: el calendario cae, la interrogación flota y, en la respuesta, se llena hasta los 3.200 M$ y pasa a la película
  { const k = win(t, K.diecinueve2 - 0.35, 0.35), land = clamp((t - K.diecinueve2 + 0.05) / 0.25), y = k < 1 ? 7 * (1 - k * k) : 0;
    S.cal.visible = t > K.diecinueve2 - 0.4 && t < K.gta3 + 0.6; S.cal.position.y = Math.max(0, y) + (land > 0 ? Math.abs(Math.sin(land * Math.PI * 2)) * 0.06 * (1 - land) : 0); S.cal.rotation.z = (1 - k) * 0.4; }
  const fill = keyed(t, [[0, 0], [K.tres8 - 0.15, 0], [K.millones8 + 0.15, 2.0 * MS], [K.ano8 + 0.1, 2.75 * MS], [K.pelicula8 - 0.05, 3.2 * MS]]);
  S.g6.setH(Math.max(0.002, fill)); S.g6.g.visible = fill > 0.003;
  { const k = win(t, K.gta2 - 0.1, 0.3) * (1 - win(t, K.tres8 - 0.2, 0.3)), q = S.qm; q.visible = k > 0.01; q.position.set(PZ.g6.x, 1.9 + 0.1 * Math.sin(t * 2.2), PZ.g6.z); faceCam(q); q.scale.setScalar(Math.max(0.0001, k * (1 + 0.12 * win(t, K.cuanto2, 0.15) * (1 - win(t, K.cuanto2 + 0.4, 0.3))))); }
  showTag(S.tags.g6, _vt.set(PZ.g6.x, 3.15, PZ.g6.z + 0.1), win(t, K.gta2 - 0.15, 0.3) * (1 - win(t, K.el3 - 0.1, 0.3)));
  showTag(S.tags.g6b, _vt.set(PZ.g6.x, fill + 0.42, PZ.g6.z + 0.3), win(t, K.ano8 - 0.15, 0.3) * (1 - win(t, K.pagarias9 - 0.2, 0.3)));
  S.topLine.visible = t > K.pelicula8 - 0.6 && t < K.mandaselo9; if (S.topLine.visible) S.topLine.material.opacity = 0.95 * win(t, K.pelicula8 - 0.6, 0.3);
  // el coste: el rascacielos sube, la torre del coste lo intenta y el sello dice NO; luego la franja de los analistas y la película más cara
  { const ks = win(t, K.costara5 - 0.1, 1.3) * (1 - win(t, K.y7 - 0.2, 0.4)); S.tower.visible = ks > 0.005; S.tower.scale.set(1, Math.max(0.001, ks), 1);
    const c = keyed(t, [[0, 0], [K.y5 + 0.2, 0], [K.rockstar5 + 0.2, 0.75 * MS], [K.costara5, 0.85 * MS], [K.alto5, 1.45 * MS], [K.mundo5 + 0.1, 1.5 * MS], [K.entre6 - 0.1, 1.5 * MS], [K.n1000b + 0.3, 1.0 * MS], [K.y7 - 0.25, 1.0 * MS], [K.y7 + 0.25, 0]]);
    S.cost.setH(Math.max(0.002, c)); S.cost.g.visible = c > 0.004;
    const kb = win(t, K.entre6 - 0.1, 0.3) * (1 - win(t, K.y7 - 0.3, 0.3)); S.band.visible = kb > 0.01; S.band.position.set(PZ.cost.x, 1.0 * MS, PZ.cost.z); S.band.scale.set(1, 0.5 * MS * Math.max(0.001, kb), 1);
    const kn = pop(t, K.mundo5 - 0.1, 0.3) * (1 - win(t, K.entre6 - 0.2, 0.3)); S.no.visible = kn > 0.01; S.no.position.set(PZ.cost.x - 0.1, 1.5 * MS + 0.12, PZ.cost.z - 0.2); faceCam(S.no); S.no.scale.setScalar(Math.max(0.0001, kn * (1 + 0.6 * (1 - win(t, K.mundo5 - 0.1, 0.18)))));
    const kr = pop(t, K.cualquier6 - 0.2, 0.35) * (1 - win(t, K.y7 - 0.2, 0.3)); S.reel2.g.visible = kr > 0.01; S.reel2.g.scale.setScalar(Math.max(0.0001, kr));
    showTag(S.tags.sky, _vt.set(PZ.sky.x - 0.1, 1.5 * MS * ks + 0.36, PZ.sky.z - 0.1), win(t, K.edificio5 + 0.1, 0.3) * (1 - win(t, K.entre6 - 0.1, 0.3)));
    showTag(S.tags.cost, _vt.set(PZ.cost.x - 0.05, 1.5 * MS + 0.42, PZ.cost.z + 0.1), win(t, K.entre6 - 0.1, 0.3) * (1 - win(t, K.y7 - 0.3, 0.3)));
    showTag(S.tags.costQ, _vt.set(PZ.cost.x - 0.05, c + 0.38, PZ.cost.z + 0.1), win(t, K.y5 + 0.4, 0.3) * (1 - win(t, K.mundo5 - 0.3, 0.25)));
    showTag(S.tags.reel2, _vt.set(PZ.reel2.x, 0.659 * MS + 0.34, PZ.reel2.z + 0.1), win(t, K.cualquier6 - 0.05, 0.3) * (1 - win(t, K.y7 - 0.25, 0.3))); }
  // parada 1: el contador de días y la torre que sube a 800 M$ y a 1.000 M$; la medalla del récord
  { const h = keyed(t, [[0, 0], [K.el3, 0], [K.n800 + 0.2, 0.8 * MS], [K.dolares3 + 0.3, 0.8 * MS], [K.n1000 - 0.1, 0.8 * MS], [K.n1000 + 0.35, 1.0 * MS]]) * (1 - win(t, K.copias4, 0.4) * 0);
    S.day.setH(Math.max(0.002, h)); S.day.g.visible = h > 0.003 && t < K.y5 + 1.5;
    const n = t < K.en3 ? 1 : t < K.n3 + 0.25 ? 2 : 3, fk = t < K.en3 ? clamp((t - K.en3 + 0.2) / 0.2) : t < K.n3 + 0.25 ? clamp((t - K.n3 - 0.05) / 0.2) : 0;
    dayBoard(n, fk); S.dayBoard.visible = t > K.el3 - 0.5 && t < K.y5 + 1.5; S.dayBoard.scale.setScalar(Math.max(0.0001, pop(t, K.el3 - 0.25, 0.35)));
    const km = pop(t, K.record3 - 0.1, 0.4); S.medal.visible = km > 0.01 && t < K.y5 + 1.5; S.medal.position.set(ST1.tw.x, h + 0.55 + 0.04 * Math.sin(t * 3), ST1.tw.z + 0.1); S.medal.rotation.y = Math.atan2(cam.position.x - ST1.tw.x, cam.position.z - ST1.tw.z) + 0.3 * Math.sin(t * 2); S.medal.scale.setScalar(Math.max(0.0001, km));
    showTag(S.tags.day, _vt.set(ST1.tw.x, Math.max(0.35, h * 0.5), ST1.tw.z + 0.6), 0); }
  // parada 2: las cajas caen capa a capa (230 M) y la pirámide de gente de Brasil (213 M) sube con la bandera
  { const t0 = K.n230 - 0.3, per = 0.016; let n = 0;
    for (const b of S.boxes) { const tl = t0 + b.l * per + hash(b.l * 3 + b.x) * 0.03, k = clamp((t - tl) / 0.12), vis = t > tl && t < K.y5 + 1.5;
      if (!vis) { S.boxIM.setMatrixAt(n++, _zero); continue; } _p.set(ST2.box.x + b.x, 0.014 + b.l * 0.03 + (1 - k * k) * 0.22, ST2.box.z + b.z); _q.setFromEuler(_e.set(0, b.ry + (1 - k) * 0.3, 0)); _s.setScalar(1); _m4.compose(_p, _q, _s); S.boxIM.setMatrixAt(n++, _m4); }
    S.boxIM.instanceMatrix.needsUpdate = true;
    const kp = win(t, K.mas4b - 0.3, 0.6); S.pyr.visible = kp > 0.005 && t < K.y5 + 1.5; S.pyr.scale.set(1, Math.max(0.001, kp), 1);
    const fp = S.flag.geometry.attributes.position; if (!S.flag.userData.x0) S.flag.userData.x0 = Float32Array.from(fp.array);
    for (let i = 0; i < fp.count; i++) { const x0 = S.flag.userData.x0[i * 3], u = (x0 + 0.25) / 0.5; fp.setZ(i, Math.sin(u * 5 - t * 7) * 0.035 * u); } fp.needsUpdate = true;
    showTag(S.tags.boxes, _vt.set(ST2.box.x + 0.1, 1.15, ST2.box.z + 0.55), win(t, K.copias4 - 0.15, 0.3) * (1 - win(t, K.y5, 0.3)));
    showTag(S.tags.brazil, _vt.set(ST2.pyr.x + 0.35, 2.13 * kp * 0.42, ST2.pyr.z + 0.95), win(t, K.brasil4 - 0.15, 0.3) * (1 - win(t, K.y5, 0.3))); }
  // la etiqueta del precio: baja balanceándose delante de la cámara (frase 7) y vuelve con «¿80 €?» (frase 9)
  { const kA = win(t, K.costara7 - 0.35, 0.45) * (1 - win(t, K.euros7 + 0.25, 0.3)), kB = win(t, K.pagarias9 - 0.3, 0.4) * (1 - win(t, K.mandaselo9 + 0.1, 0.35)), k = Math.max(kA, kB);
    const T = S.tag; T.g.visible = k > 0.005; if (T.g.visible) { const B = kB > kA, st = camAt(t), fw = _vt.subVectors(st.l, st.p).normalize(), rt = v3(-fw.z, 0, fw.x).normalize(), base = st.p.clone().addScaledVector(fw, 3.1).addScaledVector(rt, -0.3);
      T.m.material.map = B ? T.tB : T.tA; T.g.position.set(base.x, base.y + 0.22 + (1 - k) * 2.4, base.z); T.g.rotation.set(0, Math.atan2(-fw.x, -fw.z), 0.22 * Math.sin((t - (B ? K.pagarias9 : K.costara7)) * 3.1) * Math.exp(-Math.max(0, t - (B ? K.pagarias9 : K.costara7)) * 0.6)); } }
  billsAt(t);
}
