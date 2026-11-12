// ---------------------------------------------------------------- objetos de «GTA 6: el dinero» (escala real: 1 unidad = 1 m): cajas de videojuego (portadas
// inventadas, sin logos), fajos de billetes (billete inventado), bobinas de cine, el calendario de mesa, la etiqueta del precio, el tique, la maqueta del
// rascacielos y el documento que se sella.
// ---------- cajas de videojuego
function caseTex(title, sub, theme) {
  const [c0, c1, c2] = theme;
  return canvasTex(512, 640, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, c0); gr.addColorStop(0.55, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,236,190,.95)'; g.beginPath(); g.arc(w * 0.62, h * 0.5, 70, 0, 7); g.fill();
    g.fillStyle = 'rgba(10,8,20,.92)'; for (let i = 0; i < 22; i++) { const x = i * 24 - 6, bh = 60 + hash(i * 3.7) * 190; g.fillRect(x, h * 0.78 - bh, 20 + hash(i) * 8, bh); }
    g.fillRect(0, h * 0.78, w, h * 0.22);
    for (let i = 0; i < 4; i++) { const x = 60 + i * 120, y = h * 0.78; g.fillRect(x - 2, y - 150, 5, 150); g.beginPath(); g.ellipse(x, y - 150, 40, 12, -0.3 + i * 0.2, 0, 7); g.fill(); }
    g.fillStyle = '#ffffff'; g.font = '900 120px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 18; g.fillText(title, w / 2, 112);
    g.shadowBlur = 0; g.font = '700 30px Inter'; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillText(sub, w / 2, 192);
    });
}
function spineTex(title) { return canvasTex(64, 512, (g, w, h) => { g.fillStyle = '#121418'; g.fillRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2); g.fillStyle = '#ffffff'; g.font = '900 34px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(title, 0, 2); g.restore(); }); }
function gameCase(title, sub, theme, s = 1) {      // caja de videojuego de 13,5 × 17 × 1,5 cm (× s); su cara +z es la portada
  const W2 = 0.135, H2 = 0.17, D = 0.015, g = new THREE.Group();
  const body = rbox(W2, H2, D, new THREE.MeshPhysicalMaterial({ color: 0x15171c, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }), 0.006); g.add(body);
  const cov = mesh(new THREE.PlaneGeometry(W2 * 0.93, H2 * 0.95), new THREE.MeshPhysicalMaterial({ map: caseTex(title, sub, theme), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }), false); cov.position.z = D / 2 + 0.0008; g.add(cov);
  const sp = mesh(new THREE.PlaneGeometry(D * 0.86, H2 * 0.95), new THREE.MeshStandardMaterial({ map: spineTex(title), roughness: 0.4 }), false); sp.rotation.y = -Math.PI / 2; sp.position.x = -W2 / 2 - 0.0008; g.add(sp);
  const back = mesh(new THREE.PlaneGeometry(W2 * 0.93, H2 * 0.95), new THREE.MeshStandardMaterial({ color: 0x1c1f26, roughness: 0.5 }), false); back.rotation.y = Math.PI; back.position.z = -D / 2 - 0.0008; g.add(back);
  g.scale.setScalar(s); g.userData.s0 = s; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
const TH5 = ['#1c3f7a', '#e0874a', '#3b1d3f'], TH6 = ['#ff7a59', '#e9478e', '#3a1f7a'];
// ---------- billetes y fajos (billete inventado: ni retrato ni diseño real)
function billDraw(g, x, y, w, h) {
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#d6e2c6'); gr.addColorStop(1, '#b5c9a2'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.strokeStyle = '#2f6247'; g.lineWidth = Math.max(1, h * 0.04); g.strokeRect(x + h * 0.06, y + h * 0.06, w - h * 0.12, h - h * 0.12);
  g.beginPath(); g.ellipse(x + w * 0.62, y + h * 0.5, h * 0.3, h * 0.33, 0, 0, 7); g.fillStyle = 'rgba(47,98,71,.22)'; g.fill(); g.strokeStyle = 'rgba(47,98,71,.6)'; g.lineWidth = Math.max(1, h * 0.03); g.stroke();
  for (let r = 0.08; r < 0.3; r += 0.07) { g.beginPath(); g.ellipse(x + w * 0.62, y + h * 0.5, h * r, h * (r + 0.02), 0, 0, 7); g.stroke(); }
  g.fillStyle = '#2f6247'; g.font = `900 ${h * 0.24}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('100', x + w * 0.13, y + h * 0.2); g.fillText('100', x + w * 0.88, y + h * 0.8);
  g.fillStyle = 'rgba(47,98,71,.2)'; for (let i = 0; i < 5; i++) g.fillRect(x + w * 0.08, y + h * (0.36 + i * 0.08), w * 0.24, h * 0.02);
}
let BUNDLE_M = null;
function bundleMats() {
  if (BUNDLE_M) return BUNDLE_M;
  const band = (g, w, h, vertical) => { g.fillStyle = '#d9c27a'; if (vertical) g.fillRect(w * 0.45, 0, w * 0.1, h); else g.fillRect(0, h * 0.45, w, h * 0.1); g.fillStyle = 'rgba(120,80,20,.35)'; if (vertical) { g.fillRect(w * 0.42, 0, 2, h); g.fillRect(w * 0.58 - 2, 0, 2, h); } };
  const top = canvasTex(512, 220, (g, w, h) => { billDraw(g, 0, 0, w, h); band(g, w, h, true); });
  const edge = (long) => canvasTex(512, 48, (g, w, h) => { g.fillStyle = '#bfd1ac'; g.fillRect(0, 0, w, h); for (let y = 1; y < h; y += 2.1) { g.fillStyle = `rgba(30,62,40,${0.18 + hash(y * 3) * 0.22})`; g.fillRect(0, y, w, 0.9); } if (long) { g.fillStyle = '#d9c27a'; g.fillRect(w * 0.45, 0, w * 0.1, h); g.fillStyle = 'rgba(110,80,30,.4)'; g.fillRect(w * 0.45, 0, 2, h); g.fillRect(w * 0.55 - 2, 0, 2, h); } });
  const mT = new THREE.MeshStandardMaterial({ map: top, roughness: 0.75 }), mL = new THREE.MeshStandardMaterial({ map: edge(true), roughness: 0.8 }), mS = new THREE.MeshStandardMaterial({ map: edge(false), roughness: 0.8 });
  BUNDLE_M = [mS, mS, mT, mT, mL, mL]; return BUNDLE_M;
}
const BUN = { w: 0.156, h: 0.012, d: 0.066 };          // un fajo de 100 billetes de 100
function bundleGeo() { return new THREE.BoxGeometry(BUN.w, BUN.h, BUN.d); }
// columna de fajos (instanciada): capas de 2 fajos cruzadas (como ladrillos); setN(k) enseña k capas (la última, cayendo)
function bundleColumn(maxLayers, s = 1) {
  const im = new THREE.InstancedMesh(bundleGeo(), bundleMats(), maxLayers * 2); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
  const g = new THREE.Group(); g.add(im); g.scale.setScalar(s); g.userData.s0 = s;
  const C = { g, im, k: -1, top: 0, setN(k, drop = 0.12) { k = Math.max(0, Math.min(maxLayers, k)); if (Math.abs(k - C.k) < 1e-4) return; C.k = k; const full = Math.floor(k), part = k - full; let c = 0;
      for (let l = 0; l < maxLayers; l++) for (let j = 0; j < 2; j++) { const on = l < full || (l === full && part > 0.02);
        if (!on) { im.setMatrixAt(c++, _zero4); continue; }
        const off = (j - 0.5) * (BUN.d + 0.002), y = BUN.h / 2 + l * BUN.h * 1.02 + (l === full ? (1 - part) * drop : 0);
        if (l % 2 === 0) _o4.position.set((hash(l * 7 + j) - 0.5) * 0.006, y, off); else _o4.position.set(off, y, (hash(l * 5 + j) - 0.5) * 0.006);
        _o4.rotation.set(0, (l % 2 ? Math.PI / 2 : 0) + (hash(l * 4 + j) - 0.5) * 0.05, 0); _o4.scale.setScalar(1); _o4.updateMatrix(); im.setMatrixAt(c++, _o4.matrix); }
      im.instanceMatrix.needsUpdate = true; C.top = (full + (part > 0.02 ? 1 : 0)) * BUN.h * 1.02; } };
  C.setN(0); return C;
}
const _o4 = new THREE.Object3D(), _zero4 = new THREE.Matrix4().makeScale(0, 0, 0);
// ---------- bobinas de cine
function reelFaceTex(gold) { return canvasTex(256, 256, (g, w, h) => { const c = w / 2; g.fillStyle = gold ? '#d9a93f' : '#b9bec7'; g.beginPath(); g.arc(c, c, c - 2, 0, 7); g.fill();
  const gr = g.createRadialGradient(c - 30, c - 30, 10, c, c, c); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = gr; g.beginPath(); g.arc(c, c, c - 2, 0, 7); g.fill();
  g.fillStyle = '#16120e'; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.26; g.beginPath(); g.arc(c + Math.cos(a) * c * 0.55, c + Math.sin(a) * c * 0.55, c * 0.22, 0, 7); g.fill(); }
  g.beginPath(); g.arc(c, c, c * 0.09, 0, 7); g.fill(); g.strokeStyle = gold ? '#8a6418' : '#7d838e'; g.lineWidth = 6; g.beginPath(); g.arc(c, c, c - 5, 0, 7); g.stroke(); }); }
function reelSmallParts(R = 0.034, T = 0.012) {
  const geo = new THREE.CylinderGeometry(R, R, T, 28).rotateX(Math.PI / 2);
  const side = new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.5, metalness: 0.2 });
  return { geo, mats: [side, new THREE.MeshStandardMaterial({ map: reelFaceTex(false), roughness: 0.3, metalness: 0.75 }), new THREE.MeshStandardMaterial({ map: reelFaceTex(false), roughness: 0.3, metalness: 0.75 })],
    gold: [side, new THREE.MeshStandardMaterial({ map: reelFaceTex(true), roughness: 0.25, metalness: 0.85 }), new THREE.MeshStandardMaterial({ map: reelFaceTex(true), roughness: 0.25, metalness: 0.85 })] };
}
function reelBig(R, gold = false) {        // bobina de aluminio de verdad (seis huecos, película enrollada y tira que cae)
  const g = new THREE.Group(), sh = new THREE.Shape(); sh.absarc(0, 0, R, 0, Math.PI * 2, false);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.26, hp = new THREE.Path(); hp.absarc(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55, R * 0.24, 0, Math.PI * 2, true); sh.holes.push(hp); }
  const hub = new THREE.Path(); hub.absarc(0, 0, R * 0.07, 0, Math.PI * 2, true); sh.holes.push(hub);
  const fg = new THREE.ExtrudeGeometry(sh, { depth: R * 0.03, bevelEnabled: true, bevelThickness: R * 0.012, bevelSize: R * 0.012, bevelSegments: 2, curveSegments: 40 });
  const al = gold ? M.gold : new THREE.MeshStandardMaterial({ color: 0xc8ccd4, roughness: 0.25, metalness: 0.9 });
  for (const z of [-R * 0.16, R * 0.13]) { const f = mesh(fg, al); f.position.z = z; g.add(f); }
  const wound = mesh(new THREE.CylinderGeometry(R * 0.8, R * 0.8, R * 0.27, 64).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.45, metalness: 0.2 })); g.add(wound);
  const core = mesh(new THREE.CylinderGeometry(R * 0.16, R * 0.16, R * 0.36, 24).rotateX(Math.PI / 2), al); g.add(core);
  const out = new THREE.Group(); g.position.y = R; out.add(g); out.userData.R = R; return out;
}
// ---------- calendario de mesa (19 NOV)
function deskCalendar(s = 1) {
  const t = canvasTex(512, 600, (g, w, h) => { g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, w, h); g.fillStyle = '#c62828'; g.fillRect(0, 0, w, 150); g.fillStyle = '#ffffff'; g.font = '900 78px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NOVIEMBRE', w / 2, 80);
    g.fillStyle = '#16181d'; g.font = '900 330px Inter'; g.fillText('19', w / 2, 360); g.fillStyle = '#c62828'; g.font = '900 54px Inter'; g.fillText('JUEVES · 2026', w / 2, 540);
    g.fillStyle = '#9aa1ab'; for (let x = 40; x < w; x += 54) { g.beginPath(); g.arc(x, 18, 9, 0, 7); g.fill(); } });
  const side = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.85 }), m = mesh(new THREE.BoxGeometry(0.16, 0.19, 0.045).translate(0, 0.095, 0), [side, side, side, side, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), side]);
  const stand = mesh(new THREE.BoxGeometry(0.17, 0.012, 0.09).translate(0, 0.006, -0.01), M.woodL); const g = grp(stand, m); m.position.y = 0.012; m.rotation.x = -0.12; g.scale.setScalar(s); g.userData.s0 = s; return g;
}
// ---------- calendario de taco con «DÍA n» (frase 3)
function dayCalendar() {
  const tex = canvasTex(400, 480, () => {}); const side = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.85 });
  const m = mesh(new THREE.BoxGeometry(0.13, 0.155, 0.04).translate(0, 0.0775, 0), [side, side, side, side, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), side]);
  const ring = mesh(new THREE.BoxGeometry(0.135, 0.012, 0.045), M.brass); ring.position.y = 0.16; const g = grp(m, ring); g.userData.tex = tex; g.userData.n = -1;
  g.userData.draw = (n) => { if (g.userData.n === n) return; g.userData.n = n; const G = tex.userData.g, w = 400, h = 480; G.fillStyle = '#fbfaf6'; G.fillRect(0, 0, w, h); G.fillStyle = '#16181d'; G.fillRect(0, 0, w, 110);
    G.fillStyle = '#ffffff'; G.font = '900 62px Inter'; G.textAlign = 'center'; G.textBaseline = 'middle'; G.fillText('DÍA', w / 2, 58); G.fillStyle = n === 1 ? '#16181d' : '#c62828'; G.font = '900 300px Inter'; G.fillText(String(n), w / 2, 300);
    G.fillStyle = '#7d838e'; G.font = '700 34px Inter'; G.fillText('SEPT. 2013', w / 2, 445); tex.needsUpdate = true; };
  g.userData.draw(1); return g;
}
// ---------- etiqueta del precio y tique de compra
function priceTagObj() {
  const W2 = 0.2, H2 = 0.11, s = new THREE.Shape(); s.moveTo(-W2 / 2 + 0.03, H2 / 2); s.lineTo(W2 / 2 - 0.01, H2 / 2); s.quadraticCurveTo(W2 / 2, H2 / 2, W2 / 2, H2 / 2 - 0.01); s.lineTo(W2 / 2, -H2 / 2 + 0.01); s.quadraticCurveTo(W2 / 2, -H2 / 2, W2 / 2 - 0.01, -H2 / 2);
  s.lineTo(-W2 / 2 + 0.03, -H2 / 2); s.lineTo(-W2 / 2, 0); s.lineTo(-W2 / 2 + 0.03, H2 / 2); const hole = new THREE.Path(); hole.absarc(-W2 / 2 + 0.022, 0, 0.007, 0, 7, true); s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.002, bevelEnabled: false }); const pos = geo.attributes.position, uv = []; for (let i = 0; i < pos.count; i++) uv.push((pos.getX(i) + W2 / 2) / W2, (pos.getY(i) + H2 / 2) / H2); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const mk = txt => canvasTex(1000, 550, (g, w, h) => { g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c62828'; g.lineWidth = 14; g.strokeRect(190, 24, w - 214, h - 48);
    g.fillStyle = '#c62828'; g.font = '900 200px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 590, 290, 740); });
  const tA = mk('79,99 €'), tB = mk('¿80 €?'), m = mesh(geo, new THREE.MeshStandardMaterial({ map: tA, roughness: 0.6 }));
  const str = mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.2, 5).translate(0, 0.1, 0), new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 0.8 }), false); str.position.set(-W2 / 2 + 0.022, 0, 0.001);
  const g = grp(m, str); g.userData = { m, tA, tB }; return g;
}
function receiptObj() {
  const t = canvasTex(400, 900, (g, w, h) => { g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2b30'; g.textAlign = 'center'; g.font = '700 30px DejaVuMono'; g.fillText('TIENDA DE EJEMPLO', w / 2, 70); g.font = '400 22px DejaVuMono'; g.fillText('19/11/2026  10:00', w / 2, 110);
    g.fillText('--------------------------', w / 2, 150); g.textAlign = 'left'; g.font = '700 26px DejaVuMono'; g.fillText('GTA VI ED. ESTÁNDAR', 30, 210); g.textAlign = 'right'; g.fillText('79,99', w - 30, 260);
    g.textAlign = 'center'; g.font = '400 22px DejaVuMono'; g.fillText('--------------------------', w / 2, 320); g.textAlign = 'left'; g.font = '900 34px DejaVuMono'; g.fillText('TOTAL', 30, 390); g.textAlign = 'right'; g.fillText('79,99 €', w - 30, 390);
    g.textAlign = 'center'; g.font = '400 20px DejaVuMono'; g.fillText('IVA INCLUIDO', w / 2, 440); for (let i = 0; i < 26; i++) { g.fillRect(70 + i * 10 + (hash(i) > 0.5 ? 2 : 0), 520, hash(i * 3) > 0.5 ? 6 : 3, 90); } g.fillText('¡GRACIAS!', w / 2, 680); });
  const p = mesh(new THREE.PlaneGeometry(0.08, 0.18, 1, 12), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide }), false); const pa = p.geometry.attributes.position;
  for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); pa.setZ(i, 0.008 * Math.sin((y + 0.09) * 30)); } p.geometry.computeVertexNormals(); return p;
}
// ---------- maqueta blanca de un superrascacielos inventado (planta en tres alas, retranqueos y aguja)
function supertall(H) {
  const g = new THREE.Group(), wm = new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.55 }), gm = new THREE.MeshPhysicalMaterial({ color: 0x9fb8cc, roughness: 0.1, metalness: 0.6, clearcoat: 1 });
  const wing = (len, wd, h) => { const s = new THREE.Shape(); s.moveTo(-wd / 2, 0); s.lineTo(wd / 2, 0); s.lineTo(wd / 2, len - wd / 2); s.absarc(0, len - wd / 2, wd / 2, 0, Math.PI, false); s.lineTo(-wd / 2, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 10 }); geo.rotateX(-Math.PI / 2); return geo; };
  const segs = 9; let y = 0;
  for (let i = 0; i < segs; i++) { const h = H * 0.62 / segs, sc = 1 - i / segs * 0.82;
    for (let k = 0; k < 3; k++) { if (i > 5 && k === i % 3) continue; const len = H * 0.17 * sc * (k === (i % 3) ? 0.82 : 1), m = mesh(wing(len, H * 0.075 * (0.55 + 0.45 * sc), h), i % 2 ? wm : gm); m.position.y = y; m.rotation.y = k * 2.094; g.add(m); }
    y += h; }
  const core = mesh(new THREE.CylinderGeometry(H * 0.012, H * 0.04, H * 0.18, 12), wm); core.position.y = y + H * 0.09; g.add(core);
  const spire = mesh(new THREE.CylinderGeometry(0.0015, H * 0.012, H * 0.2, 8), wm); spire.position.y = y + H * 0.28; g.add(spire);
  const base = mesh(new THREE.CylinderGeometry(H * 0.22, H * 0.24, 0.012, 40), M.woodL); base.position.y = 0.006; g.add(base); return g;
}
// ---------- documento que se sella (frase 5)
function stampDoc() {
  const draw = (g, w, h, k) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '900 46px Inter'; g.fillText('¿COSTÓ GTA 6', w / 2, 90); g.fillText('MÁS QUE EL', w / 2, 146); g.fillText('BURJ KHALIFA?', w / 2, 202);
    g.font = '600 26px Inter'; g.fillText('El edificio más alto del mundo: 1.500 M$', w / 2, 252); textLines(g, 60, 300, w - 120, 9, 26, 'rgba(40,36,30,.45)', 4);
    if (k > 0) { g.save(); g.globalAlpha = Math.min(1, k * 1.5); g.translate(w / 2, h * 0.72); g.rotate(-0.14); g.strokeStyle = '#c62828'; g.lineWidth = 14; rr(g, -190, -78, 380, 156, 16); g.stroke(); g.fillStyle = '#c62828'; g.font = '900 120px Inter'; g.textBaseline = 'middle'; g.fillText('NO', 0, 6);
      g.font = '800 22px Inter'; g.fillText('ROCKSTAR GAMES', 0, -58); g.restore(); } };
  const t = canvasTex(768, 1000, (g, w, h) => draw(g, w, h, 0)); const p = mesh(new THREE.PlaneGeometry(0.21, 0.274), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1 }), false);
  p.userData = { tex: t, draw, k: -1 }; return p;
}
