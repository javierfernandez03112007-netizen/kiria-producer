// ---------------------------------------------------------------- objetos de «El jefe de Nvidia dimite» (escala real: 1 unidad = 1 m; las piezas del centro, gigantes):
// la alianza, el chip que se parte, la silla de director, el calendario de años, la placa de su mesa, la carta, el documento del consejo, la campana,
// el panel de bolsa, el expediente con el micrófono, las siluetas (sin cara ni nombre) y el organigrama. Sin logotipos: Nvidia solo va escrito.
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
// las caras de las bobinas pequeñas son espejos planos: al levantarse, alguna refleja el foco hacia la cámara y da un fogonazo de un
// fotograma (valor ≈ 30) que el resplandor convierte en una mancha blanca. Se limita su brillo por debajo del umbral del resplandor (1,7):
// el brillo normal no cambia y el reflejo se queda en un destello pequeño.
const capGlint = (m, c = 1.2) => { m.onBeforeCompile = sh => { const f = sh.fragmentShader.replace('#include <opaque_fragment>', `outgoingLight = min(outgoingLight, vec3(${c.toFixed(2)}));\n#include <opaque_fragment>`);
  if (f === sh.fragmentShader) console.error('ERROR capGlint: no encuentro opaque_fragment'); sh.fragmentShader = f; }; return m; };

// ---------- la alianza (de pie, en el plano x-y: la cámara la ve redonda desde +z)
function ringObj(R = 0.32, wd = 0.12, th = 0.05) {
  const ri = R - th, b = th * 0.32, prof = [[ri, -wd / 2 + 0.01], [R - b, -wd / 2], [R - b * 0.2, -wd / 2 + b * 0.9], [R + th * 0.06, 0], [R - b * 0.2, wd / 2 - b * 0.9], [R - b, wd / 2], [ri, wd / 2 - 0.01], [ri - th * 0.05, 0], [ri, -wd / 2 + 0.01]];
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffc865, metalness: 1, roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.15 }); capGlint(m, 2.2);
  const band = lathe(prof.map(([x, y]) => [x, y]), 96, m); band.rotation.x = Math.PI / 2;      // eje del anillo a lo largo de z
  const g = new THREE.Group(); g.add(band); g.userData = { R, wd }; return g;
}
// ---------- el chip gigante (encapsulado de una tarjeta gráfica genérico): dos mitades que se separan con el golpe
function chipTopTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#c9ced6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${hash(i * 1.7) * 0.06})`; g.fillRect(hash(i * 3.1) * w, hash(i * 5.3) * h, 2 + hash(i) * 30, 1); }
    g.strokeStyle = 'rgba(70,76,86,.55)'; g.lineWidth = 6; rr(g, 40, 40, w - 80, h - 80, 30); g.stroke();
    g.fillStyle = 'rgba(52,58,68,.85)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 210px Inter'; g.fillText('GPU', w / 2, h * 0.44);
    g.font = '700 54px DejaVuMono'; g.fillText('CHIP GRÁFICO · 2026', w / 2, h * 0.62);
    g.beginPath(); g.arc(120, h - 120, 26, 0, 7); g.fill();
  });
}
function chipSubTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#18202b'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(214,170,80,.55)'; g.lineWidth = 3;
    for (let i = 0; i < 160; i++) { const s = Math.floor(hash(i * 2.3) * 4), p = 40 + hash(i * 7.7) * (w - 80); g.beginPath();
      if (s === 0) { g.moveTo(p, 30); g.lineTo(p, 30 + 40 + hash(i) * 140); } else if (s === 1) { g.moveTo(p, h - 30); g.lineTo(p, h - 70 - hash(i) * 140); } else if (s === 2) { g.moveTo(30, p); g.lineTo(70 + hash(i) * 140, p); } else { g.moveTo(w - 30, p); g.lineTo(w - 70 - hash(i) * 140, p); } g.stroke(); }
    g.fillStyle = '#d9b25c'; for (let i = 0; i < 46; i++) { const p = 50 + i * ((w - 100) / 45); g.fillRect(p - 7, 8, 14, 22); g.fillRect(p - 7, h - 30, 14, 22); g.fillRect(8, p - 7, 22, 14); g.fillRect(w - 30, p - 7, 22, 14); }
  });
}
function uvPlane(w, h, u0, u1, v0, v1) { const p = new THREE.PlaneGeometry(w, h); const uv = p.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0)); return p; }
function chipObj(S0 = 0.9) {
  const sub = new THREE.MeshPhysicalMaterial({ map: chipSubTex(), roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 }), edge = new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.6 });
  const ihs = new THREE.MeshPhysicalMaterial({ map: chipTopTex(), metalness: 0.85, roughness: 0.32, clearcoat: 0.3 }); capGlint(ihs, 2.0);
  const ihsSide = new THREE.MeshStandardMaterial({ color: 0xb9bec7, metalness: 0.9, roughness: 0.35 });
  const T = 0.045, IH = 0.03, IW = S0 * 0.62, halves = [];
  for (const sd of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.x = sd * S0 / 2; const h = new THREE.Group(); h.position.x = -sd * S0 / 2; piv.add(h);
    const sb = mesh(new THREE.BoxGeometry(S0 / 2 - 0.004, T, S0), [edge, edge, sub, edge, edge, edge]); sb.position.set(sd * (S0 / 4 + 0.002), T / 2 + 0.012, 0);
    { const uvs = sb.geometry.attributes.uv; for (let i = 0; i < uvs.count; i++) { const f = Math.floor(i / 4); if (f === 2) uvs.setX(i, sd < 0 ? uvs.getX(i) * 0.5 : 0.5 + uvs.getX(i) * 0.5); } }
    h.add(sb);
    const ib = mesh(new THREE.BoxGeometry(IW / 2 - 0.004, IH, IW), ihsSide); ib.position.set(sd * (IW / 4 + 0.002), 0.012 + T + IH / 2, 0); h.add(ib);
    const it = mesh(uvPlane(IW / 2 - 0.004, IW, sd < 0 ? 0 : 0.5, sd < 0 ? 0.5 : 1, 0, 1), ihs, false); it.rotation.x = -Math.PI / 2; it.position.set(sd * (IW / 4 + 0.002), 0.012 + T + IH + 0.0008, 0); h.add(it);
    for (let i = 0; i < 26; i++) { const x = sd * (IW / 2 + 0.03 + hash(i * 3.3 + sd) * (S0 / 2 - IW / 2 - 0.07)), z = (hash(i * 7.1 + sd * 3) - 0.5) * S0 * 0.86; const c = mesh(new THREE.BoxGeometry(0.03, 0.014, 0.016), i % 3 ? M.ceramicD : M.brass); c.position.set(x, 0.012 + T + 0.007, z); c.rotation.y = hash(i) > 0.5 ? Math.PI / 2 : 0; h.add(c); }
    const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 8, 6), M.silver || M.steel, 14 * 28); let k = 0;
    for (let a = 0; a < 14; a++) for (let b = 0; b < 28; b++) { _o4.position.set(sd * (0.02 + a * 0.03), 0.007, -S0 / 2 + 0.03 + b * 0.031); _o4.rotation.set(0, 0, 0); _o4.scale.setScalar(1); _o4.updateMatrix(); balls.setMatrixAt(k++, _o4.matrix); }
    h.add(balls); halves.push(piv);
  }
  const g = grp(...halves); g.userData = { halves, S0, top: 0.012 + T + IH }; return g;
}
// ---------- silla de director (piel negra, base de cinco radios con ruedas)
function execChair(s = 1) {
  const g = new THREE.Group(), lea = M.leather(0x111215), alu = M.steel;
  const seat = rbox(0.5, 0.5, 0.09, lea, 0.04); seat.rotation.x = Math.PI / 2; seat.position.y = 0.5; g.add(seat);
  const back = rbox(0.48, 0.66, 0.09, lea, 0.05); back.position.set(0, 0.9, -0.24); back.rotation.x = -0.12; g.add(back);
  const head = rbox(0.34, 0.16, 0.08, lea, 0.04); head.position.set(0, 1.3, -0.29); head.rotation.x = -0.12; g.add(head);
  for (const sd of [-1, 1]) { const ar = rbox(0.06, 0.3, 0.05, lea, 0.02); ar.rotation.x = Math.PI / 2; ar.position.set(sd * 0.27, 0.68, -0.02); g.add(ar);
    g.add(bar(v3(sd * 0.27, 0.66, 0.06), v3(sd * 0.24, 0.52, 0.02), 0.012, alu)); }
  const post = cyl(0.025, 0.03, 0.36, alu, 20); post.position.y = 0.28; g.add(post);
  for (let i = 0; i < 5; i++) { const a = i * 1.2566, e = v3(Math.cos(a) * 0.32, 0.07, Math.sin(a) * 0.32); g.add(bar(v3(0, 0.11, 0), e, 0.016, alu)); const w = sph(0.03, M.black); w.position.set(e.x, 0.03, e.z); g.add(w); }
  g.scale.setScalar(s); g.userData.s0 = s; return g;
}
// ---------- calendario de taco con años (frase 3: de 1993 a 2026)
function yearCalendar() {
  const tex = canvasTex(400, 480, () => {}); const side = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.85 });
  const m = mesh(new THREE.BoxGeometry(0.13, 0.155, 0.04).translate(0, 0.0775, 0), [side, side, side, side, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), side]);
  const ring = mesh(new THREE.BoxGeometry(0.135, 0.012, 0.045), M.brass); ring.position.y = 0.16; const g = grp(m, ring); g.userData.tex = tex; g.userData.n = -1;
  g.userData.draw = (y) => { if (g.userData.n === y) return; g.userData.n = y; const G = tex.userData.g, w = 400, h = 480; G.fillStyle = '#fbfaf6'; G.fillRect(0, 0, w, h); G.fillStyle = '#16181d'; G.fillRect(0, 0, w, 110);
    G.fillStyle = '#ffffff'; G.font = '900 52px Inter'; G.textAlign = 'center'; G.textBaseline = 'middle'; G.fillText('AL FRENTE', w / 2, 58); G.fillStyle = y >= 2026 ? '#c62828' : '#16181d'; G.font = '900 150px Inter'; G.fillText(String(y), w / 2, 290);
    G.fillStyle = '#7d838e'; G.font = '700 34px Inter'; G.fillText(y >= 2026 ? 'NOVIEMBRE' : 'AÑO ' + (y - 1992), w / 2, 435); tex.needsUpdate = true; };
  g.userData.draw(1993); return g;
}
// ---------- placa de su mesa (madera y latón)
function nameplate(l1, l2, s = 1) {
  const g = new THREE.Group(); const wd = new THREE.Shape(); wd.moveTo(-0.03, 0); wd.lineTo(0.03, 0); wd.lineTo(0.008, 0.06); wd.lineTo(-0.008, 0.06); wd.closePath();
  const blk = mesh(new THREE.ExtrudeGeometry(wd, { depth: 0.3, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2 }).translate(0, 0, -0.15), M.wood); blk.rotation.y = Math.PI / 2; g.add(blk);
  const t = canvasTex(1024, 220, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e9cd88'); gr.addColorStop(1, '#b58f45'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.strokeStyle = '#7a5a22'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#2a1d0c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 96px Inter'; c.fillText(l1, w / 2, 86); c.font = '700 54px Inter'; c.fillText(l2, w / 2, 170); });
  const pl = mesh(new THREE.PlaneGeometry(0.28, 0.06), new THREE.MeshPhysicalMaterial({ map: t, metalness: 0.75, roughness: 0.3 }), false); pl.position.set(0, 0.031, 0.0265); pl.rotation.x = -Math.atan2(0.022, 0.06); g.add(pl);
  g.scale.setScalar(s); g.userData.s0 = s; return g;
}
// ---------- la carta del domingo: la frase se escribe a máquina (k de 0 a 1)
function letterObj() {
  const tex = canvasTex(768, 1000, () => {}); let lastK = -1;
  const p = mesh(new THREE.PlaneGeometry(0.21, 0.274), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1 }), false);
  p.userData.draw = (k) => { k = Math.round(k * 40) / 40; if (k === lastK) return; lastK = k; const g = tex.userData.g, w = 768, h = 1000;
    g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = '700 30px DejaVuMono'; g.fillText('PARA: TODOS LOS EMPLEADOS', 60, 90); g.font = '400 28px DejaVuMono'; g.fillText('8 DE NOVIEMBRE DE 2026', 60, 136);
    g.fillRect(60, 160, w - 120, 3); const q = 'Fui infiel a mi mujer.', n = Math.floor(q.length * clamp(k));
    g.font = '700 48px DejaVuMono'; g.fillText(q.slice(0, n), 60, 280); if (k > 0 && k < 1 && Math.floor(k * 40) % 2 === 0) g.fillRect(60 + g.measureText(q.slice(0, n)).width + 4, 244, 22, 44);
    textLines(g, 60, 360, w - 120, 13, 38, 'rgba(40,36,30,.35)', 7); g.font = '400 24px DejaVuMono'; g.fillStyle = 'rgba(40,36,30,.6)'; g.fillText('(traducción de la carta publicada)', 60, h - 60); tex.needsUpdate = true; };
  p.userData.draw(0); return p;
}
// ---------- documento que se sella (frase 5: el consejo abre la investigación)
function boardDoc() {
  const draw = (g, w, h, k) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '800 34px Inter'; g.fillText('CONSEJO DE ADMINISTRACIÓN', w / 2, 90);
    g.font = '900 52px Inter'; g.fillText('INVESTIGACIÓN', w / 2, 170); g.fillText('INDEPENDIENTE', w / 2, 228); g.font = '600 26px Inter'; g.fillText('Comité de consejeros independientes y abogados externos', w / 2, 280);
    textLines(g, 60, 330, w - 120, 8, 28, 'rgba(40,36,30,.42)', 5);
    if (k > 0) { g.save(); g.globalAlpha = Math.min(1, k * 1.5); g.translate(w / 2, h * 0.76); g.rotate(-0.12); g.strokeStyle = '#c62828'; g.lineWidth = 14; rr(g, -220, -70, 440, 140, 16); g.stroke(); g.fillStyle = '#c62828'; g.font = '900 96px Inter'; g.textBaseline = 'middle'; g.fillText('ABIERTA', 0, 6); g.restore(); } };
  const t = canvasTex(768, 1000, (g, w, h) => draw(g, w, h, 0)); const p = mesh(new THREE.PlaneGeometry(0.21, 0.274), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1 }), false);
  p.userData = { tex: t, draw, k: -1 }; return p;
}
// ---------- carpeta (vitrina de la frase 2 y expediente de la frase 7)
function folderObj(l1, l2, stampTxt) {
  const t = canvasTex(700, 900, (g, w, h) => { g.fillStyle = '#d8b878'; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(120,80,30,${hash(i * 2.1) * 0.08})`; g.fillRect(hash(i * 3.7) * w, hash(i * 9.1) * h, 3, 3); }
    g.fillStyle = '#f4efe2'; g.fillRect(120, 160, w - 240, 170); g.strokeStyle = '#6b5530'; g.lineWidth = 4; g.strokeRect(120, 160, w - 240, 170);
    g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 58px Inter'; g.fillText(l1, w / 2, 222, w - 280); g.font = '700 34px Inter'; g.fillText(l2, w / 2, 290, w - 280);
    g.save(); g.translate(w / 2, 600); g.rotate(-0.16); g.strokeStyle = '#b8121b'; g.lineWidth = 12; rr(g, -250, -62, 500, 124, 14); g.stroke(); g.fillStyle = '#b8121b'; g.font = '900 84px Inter'; g.fillText(stampTxt, 0, 6); g.restore(); });
  const side = new THREE.MeshStandardMaterial({ color: 0xc9a868, roughness: 0.8 });
  const m = mesh(new THREE.BoxGeometry(0.24, 0.012, 0.31), [side, side, new THREE.MeshStandardMaterial({ map: t, roughness: 0.75 }), side, side, side]); m.position.y = 0.006; return grp(m);
}
// ---------- campana de apertura de la bolsa (latón, en su arco de madera) con su martillo
function bellObj() {
  const g = new THREE.Group();
  const bell = lathe([[0.004, 0.17], [0.03, 0.165], [0.052, 0.14], [0.06, 0.09], [0.07, 0.04], [0.088, 0.008], [0.092, 0.0], [0.084, 0.002], [0.062, 0.04], [0.05, 0.09], [0.042, 0.14], [0.02, 0.158], [0.004, 0.16]], 48, M.gold);
  const hb = new THREE.Group(); hb.position.y = 0.42; bell.position.y = -0.18; hb.add(bell); g.add(hb);
  const clap = sph(0.016, M.brass); clap.position.y = -0.16; hb.add(clap);
  for (const sd of [-1, 1]) { const p = rbox(0.04, 0.46, 0.04, M.wood, 0.008); p.position.set(sd * 0.16, 0.23, 0); g.add(p); }
  const top = rbox(0.38, 0.05, 0.05, M.wood, 0.01); top.position.y = 0.47; g.add(top); const base = rbox(0.44, 0.04, 0.16, M.wood, 0.01); base.rotation.x = Math.PI / 2; base.position.y = 0.02; g.add(base);
  const ham = new THREE.Group(); ham.position.set(0.15, 0.3, 0.06); const hh = cyl(0.016, 0.016, 0.06, M.wood, 16); hh.rotation.z = Math.PI / 2; hh.position.x = -0.1; const hs = cyl(0.005, 0.005, 0.12, M.woodL, 8); hs.rotation.z = Math.PI / 2; hs.position.x = -0.04; ham.add(hh, hs); g.add(ham);
  g.userData = { hb, ham }; return g;
}
// ---------- panel de bolsa: la acción el miércoles y el desplome al abrir el jueves (k: 0 → 1)
function tickerBoard() {
  const tex = canvasTex(900, 640, () => {}); let lk = -1;
  const scr = mesh(new THREE.PlaneGeometry(0.54, 0.384), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), false); scr.position.set(0, 0.36, 0.016);
  const fr = rbox(0.58, 0.43, 0.03, M.black, 0.01); fr.position.y = 0.36; const st = cyl(0.012, 0.012, 0.16, M.dsteel, 12); st.position.y = 0.08; const ft = rbox(0.18, 0.1, 0.012, M.dsteel, 0.006); ft.rotation.x = Math.PI / 2; ft.position.y = 0.006;
  const g = grp(fr, scr, st, ft);
  g.userData.draw = (k) => { k = Math.round(k * 60) / 60; if (k === lk) return; lk = k; const c = tex.userData.g, w = 900, h = 640; c.fillStyle = '#05070a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c8ced8'; c.font = '700 34px DejaVuMono'; c.textAlign = 'left'; c.fillText('ACCIÓN DE NVIDIA (EN $)', 36, 56); c.fillStyle = '#5c6470'; c.font = '400 24px DejaVuMono'; c.fillText('MIÉ 11 NOV', 70, h - 30); c.fillText('JUE 12 · APERTURA', 470, h - 30);
    c.strokeStyle = 'rgba(120,130,145,.25)'; c.lineWidth = 1; for (let y = 120; y < h - 70; y += 70) { c.beginPath(); c.moveTo(36, y); c.lineTo(w - 36, y); c.stroke(); }
    const yOf = p => 130 + (180 - p) / (180 - 140) * (h - 230), pts = []; for (let i = 0; i <= 40; i++) pts.push([60 + i * 9.5, yOf(173.8 + Math.sin(i * 0.9) * 1.2 + Math.sin(i * 2.3) * 0.6)]);
    c.strokeStyle = '#9fe0b4'; c.lineWidth = 5; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
    c.setLineDash([8, 10]); c.strokeStyle = 'rgba(200,206,216,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(440, 100); c.lineTo(440, h - 60); c.stroke(); c.setLineDash([]);
    if (k > 0) { const kk = clamp(k), x0 = 440, y0 = pts[pts.length - 1][1], drop = [[x0, y0], [x0 + 26, yOf(160)], [x0 + 44, yOf(152)], [x0 + 70, yOf(149)], [x0 + 110, yOf(150.5)], [x0 + 160, yOf(149.3)], [x0 + 230, yOf(151)]];
      const n = 1 + kk * (drop.length - 1), fi = Math.floor(n); c.strokeStyle = '#ff4d5e'; c.lineWidth = 6; c.beginPath(); c.moveTo(pts[pts.length - 1][0], y0); for (let i = 0; i < Math.min(fi, drop.length); i++) c.lineTo(drop[i][0], drop[i][1]);
      if (fi < drop.length) { const a = drop[fi - 1], b = drop[fi], f = n - fi; c.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); } c.stroke();
      c.globalAlpha = clamp((kk - 0.5) / 0.3); c.fillStyle = '#ff4d5e'; c.font = '900 120px DejaVuMono'; c.textAlign = 'right'; c.fillText('−13 %', w - 40, 200); c.globalAlpha = 1; }
    tex.needsUpdate = true; };
  g.userData.draw(0); return g;
}
// ---------- micrófono oculto (frase 7)
function bugObj() {
  const g = new THREE.Group(); const b = rbox(0.05, 0.03, 0.014, M.black, 0.005); b.rotation.x = Math.PI / 2; b.position.y = 0.008; g.add(b);
  const grill = cyl(0.009, 0.009, 0.004, M.dsteel, 16); grill.position.set(-0.012, 0.016, 0); g.add(grill); const led = sph(0.003, M.redLed); led.position.set(0.016, 0.016, 0.008); g.add(led);
  g.add(bar(v3(0.022, 0.012, 0), v3(0.07, 0.008, 0.03), 0.0012, M.dsteel, 6)); g.userData.led = led; return g;
}
// ---------- silueta sin cara (busto de metacrilato oscuro sobre una peana de latón): no representa a nadie concreto
function silhouette(h = 0.3, col = 0x24262c) {
  const s = new THREE.Shape(), r = h * 0.15, nw = h * 0.07, sw = h * 0.42, cy = h * 0.74;
  s.moveTo(-sw, 0); s.bezierCurveTo(-sw, h * 0.3, -sw * 0.75, h * 0.42, -nw * 1.6, h * 0.46); s.lineTo(-nw, h * 0.52); s.lineTo(-nw, cy - r * 0.9);
  s.absarc(0, cy, r, Math.PI * 1.32, Math.PI * -0.32, true); s.lineTo(nw, h * 0.52); s.lineTo(nw * 1.6, h * 0.46); s.bezierCurveTo(sw * 0.75, h * 0.42, sw, h * 0.3, sw, 0); s.lineTo(-sw, 0);
  const m = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const b = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2, curveSegments: 24 }).translate(0, 0.012, -0.006), m);
  const base = rbox(sw * 2.3, 0.07, 0.014, M.brass, 0.005); base.rotation.x = Math.PI / 2; base.position.y = 0.007; const g = grp(b, base); g.userData.m = m; return g;
}
// ---------- organigrama en un atril (k: la línea del CEO a la directiva se dibuja)
function orgChart() {
  const tex = canvasTex(700, 820, () => {}); let lk = -1;
  const board = mesh(new THREE.PlaneGeometry(0.34, 0.4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), false); board.position.set(0, 0.36, 0.012); board.rotation.x = -0.12;
  const back = rbox(0.36, 0.42, 0.016, M.wood, 0.008); back.position.set(0, 0.36, 0.0); back.rotation.x = -0.12;
  const legs = [bar(v3(-0.14, 0.0, 0.06), v3(-0.12, 0.42, -0.02), 0.008, M.woodL), bar(v3(0.14, 0.0, 0.06), v3(0.12, 0.42, -0.02), 0.008, M.woodL), bar(v3(0, 0.0, -0.12), v3(0, 0.4, -0.03), 0.008, M.woodL)];
  const g = grp(back, board, ...legs);
  g.userData.draw = (k) => { k = Math.round(k * 30) / 30; if (k === lk) return; lk = k; const c = tex.userData.g, w = 700, h = 820; c.fillStyle = '#f2eee3'; c.fillRect(0, 0, w, h);
    const box = (x, y, bw, txt, on) => { c.fillStyle = on ? '#2b2218' : 'rgba(43,34,24,.18)'; c.strokeStyle = on ? '#2b2218' : 'rgba(43,34,24,.35)'; c.lineWidth = 5; rr(c, x - bw / 2, y - 45, bw, 90, 12); c.stroke(); c.font = '800 38px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x, y + 2); };
    c.strokeStyle = 'rgba(43,34,24,.35)'; c.lineWidth = 4; c.beginPath(); c.moveTo(350, 175); c.lineTo(350, 300); c.moveTo(130, 300); c.lineTo(570, 300); for (const x of [130, 350, 570]) { c.moveTo(x, 300); c.lineTo(x, 380); } c.stroke();
    box(350, 130, 260, 'CEO', true); box(130, 425, 190, 'VP', false); box(570, 425, 190, 'VP', false); box(350, 425, 210, 'DIRECTIVA', k > 0.5);
    if (k > 0) { c.strokeStyle = '#c62828'; c.lineWidth = 9; c.beginPath(); c.moveTo(350, 175); c.lineTo(350, 175 + 205 * clamp(k * 1.4)); c.stroke(); }
    c.fillStyle = 'rgba(43,34,24,.55)'; c.font = '600 26px Inter'; c.fillText('A SUS ÓRDENES', 350, 520); tex.needsUpdate = true; };
  g.userData.draw(0); return g;
}
