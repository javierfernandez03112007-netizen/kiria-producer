// ---------------------------------------------------------------- piezas: la polaroid (de ella sale el tarro), la peana del visor de kiriaai.com, las seis
// presentaciones (caja, bolsa, tarro, botella, lata y taza: mismas formas y etiquetas que la web, web_estudio/index.html «productos en 3D»),
// el móvil, el calendario, la interrogación «¿el tuyo?» y el bocadillo «KIRIA» con el avión de papel
let FONT3 = null;
const PHN = { w: 0.82, h: 1.72, d: 0.085, sw: 0.765, sh: 1.66, y: 0.92 };     // móvil de pie (centro a y = PHN.y)
const SCR = { w: 540, h: Math.round(540 * PHN.sh / PHN.sw) };                    // lienzo de la pantalla
const PS = 0.5;                                                                 // unidades del visor de la web → metros de la escena
const FOTO = { w: 0.8, h: 0.97, d: 0.012, iw: 0.7, top: 0.05, tilt: -0.08, base: 0.045 };   // polaroid de pie en su soporte (inclinada hacia atrás)
const FOTO_IMG_Y = FOTO.h - FOTO.top - FOTO.iw / 2;                             // centro de la imagen (sobre el canto de abajo)
const FOTO_FLOOR = FOTO_IMG_Y - FOTO.iw / 2 + 0.1;                              // «suelo» dentro de la foto (donde está el tarro)
const JAR_R = 0.42 * PS;                                                        // radio del tarro (para pegarlo a la foto)
const PED0 = v3(0, 0, 0.8), PEDW = v3(0, 0.86, 0.34), PEDW_S = 0.62;            // peana: en el suelo delante de la foto / delante de la pantalla
const PED_R = 0.85 * PS, PED_H = 0.16 * PS;
const PHOTO_H = 352, PHOTO_S = 0.7;                                             // tono y saturación de la foto de las fresas (como domColor de la web)
const BRAND = 'TU MARCA', PNAME = 'Fresa';
let FRESAS = null;                                                              // la «foto» del producto: un dibujo de fresas (1024 × 1024)

function rplane(w, h, r, seg = 10) { const g = new THREE.ShapeGeometry(rrShape(w, h, r), seg); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5); return g; }
function text3(str, size, depth, mats, { bevel = 0.008, base = false } = {}) {
  const g = new TextGeometry(str, { font: FONT3, size, depth, curveSegments: 8, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.55, bevelSegments: 2 });
  g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, base ? 0 : -(b.max.y + b.min.y) / 2, -(b.max.z + b.min.z) / 2);
  const m = new THREE.Mesh(g, mats); m.castShadow = true; m.receiveShadow = true; m.userData.w = b.max.x - b.min.x; m.userData.h = b.max.y - b.min.y; return m;
}

// ---------------------------------------------------------------- la foto de las fresas (dibujada: brillo, semillas, cáliz y sombra)
function drawFresas() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  let gr = g.createRadialGradient(560, 380, 40, 512, 520, 780); gr.addColorStop(0, '#fff3ee'); gr.addColorStop(0.5, '#ffd6cf'); gr.addColorStop(1, '#ee9f9f');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 9; i++) { const x = hash(i * 3.3) * 1024, y = hash(i * 7.1) * 520, r = 30 + hash(i * 5.7) * 70; const b = g.createRadialGradient(x, y, 0, x, y, r); b.addColorStop(0, 'rgba(255,255,255,.35)'); b.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = b; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  const berry = (x, y, s, rot) => {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    g.save(); g.filter = 'blur(22px)'; g.fillStyle = 'rgba(110,15,30,.38)'; g.beginPath(); g.ellipse(20, 215, 160, 36, 0, 0, 7); g.fill(); g.restore();
    const body = new Path2D(); body.moveTo(0, -150); body.bezierCurveTo(125, -178, 195, -98, 178, 4); body.bezierCurveTo(160, 104, 64, 188, 0, 218); body.bezierCurveTo(-64, 188, -160, 104, -178, 4); body.bezierCurveTo(-195, -98, -125, -178, 0, -150); body.closePath();
    const rg = g.createRadialGradient(-55, -70, 16, 0, 10, 240); rg.addColorStop(0, '#ff7276'); rg.addColorStop(0.42, '#e3203a'); rg.addColorStop(1, '#880c1e');
    g.fillStyle = rg; g.fill(body);
    g.save(); g.clip(body);
    for (let r = -6; r <= 8; r++) for (let q = -6; q <= 6; q++) { const sx = q * 40 + (r % 2 ? 20 : 0), sy = r * 31 + 8, d = Math.hypot(sx / 178, (sy - 20) / 205); if (d > 0.93) continue;
      g.save(); g.translate(sx, sy); g.rotate(sx / 380); g.fillStyle = 'rgba(80,6,18,.42)'; g.beginPath(); g.ellipse(0, 3, 7.5, 10.5, 0, 0, 7); g.fill();
      g.fillStyle = '#f7d36e'; g.beginPath(); g.ellipse(0, 0, 4.6, 7.6, 0, 0, 7); g.fill(); g.restore(); }
    const hl = g.createRadialGradient(-72, -78, 4, -72, -78, 120); hl.addColorStop(0, 'rgba(255,255,255,.6)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.fillRect(-220, -220, 440, 440);
    const rim = g.createRadialGradient(0, 30, 120, 0, 30, 240); rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(60,0,10,.35)'); g.fillStyle = rim; g.fillRect(-220, -220, 440, 460);
    g.restore();
    for (const a of [-2.3, -1.55, -0.8, 0.8, 1.55, 2.3]) { g.save(); g.translate(0, -150); g.rotate(a);
      const lg = g.createLinearGradient(0, 0, 0, -110); lg.addColorStop(0, '#22702b'); lg.addColorStop(1, '#5fc466'); g.fillStyle = lg;
      g.beginPath(); g.moveTo(-20, 0); g.quadraticCurveTo(-30, -70, 0, -112); g.quadraticCurveTo(30, -70, 20, 0); g.closePath(); g.fill(); g.restore(); }
    g.fillStyle = '#2f8a37'; rr(g, -10, -236, 20, 92, 10); g.fill();
    g.restore();
  };
  berry(286, 690, 0.92, -0.38); berry(760, 700, 0.88, 0.34); berry(522, 500, 1.22, 0.05);
  return c;
}

// ---------------------------------------------------------------- etiquetas (port de PAINT de la web; Anton → Bebas, Instrument Sans → Inter, JetBrains Mono → SpaceMono)
const FD = 'Bebas', FB = 'Inter', FM = 'SpaceMono';
const hsl = (h, s, l) => `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
function pal(kind) {     // como pal() de la web con la foto de las fresas (tono 352, saturación 0,7)
  const h = PHOTO_H, s = PHOTO_S, paper = kind === 'tarro' || kind === 'botella' || kind === 'taza';
  const pb = { tarro: '#f4ecdc', botella: '#f1e8d3', taza: '#f3f1ec' }[kind];
  return { a1: hsl(h, s, 0.5), a2: hsl(h, s, 0.24), base: paper ? pb : kind === 'bolsa' ? hsl(h, s * 0.8, 0.5) : hsl(h, s, 0.2),
    ink: paper ? hsl(h, s, 0.17) : '#ffffff', rope: '#f3eee6', fill: hsl(h, 0.78, 0.33), lid: hsl(h, s, 0.34), cap: hsl(h, s, 0.3), glass: hsl(h, 0.35, 0.09), inner: hsl(h, s, 0.5) };
}
const slugW = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); };
const tline = (g, t, x, y, mw, px, fam, wt = '', ls = 0) => {
  const set = s => { g.font = `${wt} ${s}px ${fam}`; g.letterSpacing = (ls * s).toFixed(1) + 'px'; };
  set(px); const w = g.measureText(t).width; if (w > mw) set(px * mw / w);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y); g.letterSpacing = '0px';
};
const ttitle = (g, t, x, y, mw, mh, fam) => {
  const words = t.split(/\s+/).filter(Boolean); let best = null;
  for (let n = 1; n <= Math.min(3, words.length); n++) {
    const target = t.length / n, ls = []; let cur = '';
    for (const w of words) { if (cur && cur.length + 1 + w.length > target * 1.2 && ls.length < n - 1) { ls.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
    ls.push(cur); g.font = `100px ${fam}`;
    const mx = Math.max(...ls.map(l => g.measureText(l).width)), s = Math.min(mw / mx * 100, mh / (ls.length * 1.04));
    if (!best || s > best.s * 1.04) best = { s, ls };
  }
  g.font = `900 ${best.s}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  best.ls.forEach((l, i) => g.fillText(l, x, y + (i - (best.ls.length - 1) / 2) * best.s * 1.04));
};
const cover = (g, im, x, y, w, h) => { const s = Math.max(w / im.width, h / im.height), iw = im.width * s, ih = im.height * s; g.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); };
const art = (g, x, y, w, h, P, r = 0) => { g.save(); rr(g, x, y, w, h, Math.max(0.01, r)); g.clip(); g.fillStyle = P.base; g.fillRect(x, y, w, h); cover(g, FRESAS, x, y, w, h); g.restore(); };
const tlines = (g, x, y, w, n, lh, col, a = 0.22) => { g.fillStyle = col; g.globalAlpha = a; for (let i = 0; i < n; i++) { rr(g, x, y + i * lh, w * (i === n - 1 ? 0.5 : 0.78 + 0.22 * ((i * 0.618) % 1)), lh * 0.42, lh * 0.21); g.fill(); } g.globalAlpha = 1; };
const tbars = (g, x, y, w, h) => { g.fillStyle = '#ffffff'; rr(g, x - w * 0.08, y - h * 0.12, w * 1.16, h * 1.24, 6); g.fill(); g.fillStyle = '#121212'; const u = w / 96; let px = x, i = 0; while (px < x + w - u) { const bw = u * (1 + ((i * 7 + 3) % 4)); if (i % 2 === 0) g.fillRect(px, y, bw, h); px += bw; i++; } };
const PAINT = {
  boxFront(g, W2, H2, P) { const b = H2 * 0.235; g.fillStyle = P.base; g.fillRect(0, 0, W2, H2); art(g, 0, 0, W2, H2 - b, P);
    const gr = g.createLinearGradient(0, 0, W2, 0); gr.addColorStop(0, P.a1); gr.addColorStop(1, P.a2); g.fillStyle = gr; g.fillRect(0, H2 - b, W2, H2 * 0.009);
    g.fillStyle = P.ink; g.globalAlpha = 0.72; tline(g, BRAND, W2 / 2, H2 - b * 0.68, W2 * 0.84, H2 * 0.03, FM, '700', 0.16); g.globalAlpha = 1;
    tline(g, PNAME, W2 / 2, H2 - b * 0.34, W2 * 0.88, H2 * 0.062, FB, '700'); },
  boxBack(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2); g.fillStyle = P.ink; tline(g, BRAND, W2 / 2, H2 * 0.12, W2 * 0.8, H2 * 0.085, FD);
    g.globalAlpha = 0.85; tline(g, PNAME, W2 / 2, H2 * 0.21, W2 * 0.8, H2 * 0.042, FB, '700'); g.globalAlpha = 1; tlines(g, W2 * 0.1, H2 * 0.3, W2 * 0.8, 9, H2 * 0.042, P.ink); tbars(g, W2 * 0.58, H2 * 0.8, W2 * 0.3, H2 * 0.09); },
  boxSide(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2); g.save(); g.translate(W2 / 2, H2 / 2); g.rotate(-Math.PI / 2); g.fillStyle = P.ink;
    tline(g, BRAND, 0, -W2 * 0.1, H2 * 0.78, W2 * 0.42, FD); g.globalAlpha = 0.75; tline(g, PNAME, 0, W2 * 0.25, H2 * 0.7, W2 * 0.12, FB, '700'); g.restore(); },
  boxTop(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2); g.fillStyle = P.ink; tline(g, BRAND, W2 / 2, H2 / 2, W2 * 0.7, H2 * 0.34, FD); },
  bagFront(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2); art(g, W2 * 0.09, H2 * 0.09, W2 * 0.82, H2 * 0.6, P, W2 * 0.035);
    g.fillStyle = P.ink; tline(g, BRAND, W2 / 2, H2 * 0.8, W2 * 0.8, H2 * 0.1, FD); g.globalAlpha = 0.7; tline(g, slugW(BRAND) + '.es', W2 / 2, H2 * 0.9, W2 * 0.7, H2 * 0.035, FM, '700', 0.06); g.globalAlpha = 1; },
  bagBack(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2); g.fillStyle = P.ink; tline(g, BRAND, W2 / 2, H2 * 0.46, W2 * 0.78, H2 * 0.16, FD);
    g.globalAlpha = 0.7; tline(g, slugW(BRAND) + '.es', W2 / 2, H2 * 0.6, W2 * 0.7, H2 * 0.04, FM, '700', 0.06); g.globalAlpha = 1; },
  bagSide(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2);
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 3; g.beginPath(); g.moveTo(W2 / 2, 0); g.lineTo(W2 / 2, H2 * 0.8); g.lineTo(0, H2 * 0.94); g.moveTo(W2 / 2, H2 * 0.8); g.lineTo(W2, H2 * 0.94); g.stroke();
    const sh = g.createLinearGradient(0, 0, W2, 0); sh.addColorStop(0, 'rgba(0,0,0,0.1)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.06)'); sh.addColorStop(1, 'rgba(0,0,0,0.1)'); g.fillStyle = sh; g.fillRect(0, 0, W2, H2); },
  plain(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2); },
  jarLabel(g, W2, H2, P) { rr(g, 2, 2, W2 - 4, H2 - 4, H2 * 0.07); g.fillStyle = P.base; g.fill();
    g.strokeStyle = P.ink; g.globalAlpha = 0.35; g.lineWidth = 3; rr(g, H2 * 0.04, H2 * 0.04, W2 - H2 * 0.08, H2 - H2 * 0.08, H2 * 0.045); g.stroke(); g.globalAlpha = 1;
    art(g, W2 * 0.09, H2 * 0.1, W2 * 0.82, H2 * 0.54, P, H2 * 0.035);
    g.fillStyle = P.ink; tline(g, BRAND, W2 / 2, H2 * 0.745, W2 * 0.8, H2 * 0.1, FD); g.globalAlpha = 0.8; tline(g, PNAME, W2 / 2, H2 * 0.865, W2 * 0.8, H2 * 0.066, FB, '700'); g.globalAlpha = 1; },
  bottleLabel(g, W2, H2, P) { rr(g, 2, 2, W2 - 4, H2 - 4, H2 * 0.05); g.fillStyle = P.base; g.fill(); g.strokeStyle = P.ink; g.lineWidth = 3;
    g.globalAlpha = 0.45; rr(g, H2 * 0.035, H2 * 0.035, W2 - H2 * 0.07, H2 - H2 * 0.07, H2 * 0.03); g.stroke(); g.globalAlpha = 0.25; rr(g, H2 * 0.06, H2 * 0.06, W2 - H2 * 0.12, H2 - H2 * 0.12, H2 * 0.02); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = P.ink; tline(g, BRAND, W2 / 2, H2 * 0.17, W2 * 0.66, H2 * 0.12, FD); art(g, W2 * 0.24, H2 * 0.27, W2 * 0.52, H2 * 0.45, P, H2 * 0.03);
    ttitle(g, PNAME, W2 / 2, H2 * 0.83, W2 * 0.7, H2 * 0.13, FB); },
  canPrint(g, W2, H2, P) { g.fillStyle = P.base; g.fillRect(0, 0, W2, H2);
    const gr = g.createLinearGradient(0, 0, 0, H2); gr.addColorStop(0, 'rgba(255,255,255,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2);
    art(g, W2 * 0.31, H2 * 0.07, W2 * 0.38, H2 * 0.66, P, H2 * 0.04);
    g.fillStyle = P.ink; tline(g, BRAND, W2 / 2, H2 * 0.85, W2 * 0.36, H2 * 0.15, FD);
    for (const u of [0.19, 0.81]) { g.save(); g.translate(W2 * u, H2 / 2); g.rotate(-Math.PI / 2); g.globalAlpha = 0.9; tline(g, PNAME.toUpperCase(), 0, 0, H2 * 0.84, W2 * 0.035, FB, '700', 0.04); g.restore(); }
    tbars(g, W2 * 0.025, H2 * 0.62, W2 * 0.07, H2 * 0.2); tlines(g, W2 * 0.9, H2 * 0.18, W2 * 0.08, 8, H2 * 0.07, P.ink, 0.3); },
  mugPrint(g, W2, H2, P) { g.save(); rr(g, 2, 2, W2 - 4, H2 - 4, H2 * 0.06); g.clip(); cover(g, FRESAS, 2, 2, W2 - 4, H2 - 4);
    g.fillStyle = 'rgba(255,255,255,.88)'; rr(g, W2 * 0.3, H2 * 0.74, W2 * 0.4, H2 * 0.17, H2 * 0.04); g.fill(); g.fillStyle = P.a2; tline(g, BRAND, W2 / 2, H2 * 0.83, W2 * 0.36, H2 * 0.12, FD); g.restore(); },
};
function paintTex(w, h, fn, kind) { const T = canvasTex(w, h, (g, W2, H2) => PAINT[fn](g, W2, H2, pal(kind))); return T; }

// ---------------------------------------------------------------- las presentaciones (geometría como en la web, en sus unidades; la escala PS va en el soporte)
const V2 = pts => pts.map(([x, y]) => new THREE.Vector2(x, y));
const latheG = (pts, n = 96) => new THREE.LatheGeometry(V2(pts), n);
function roundBox(W2, H2, D, r, n = 20) {      // caja con cantos redondeados (los vértices de una caja con muchos segmentos se empujan a una caja interior + radio)
  const geo = new THREE.BoxGeometry(W2, H2, D, n, Math.max(2, Math.round(n * H2 / W2)), Math.max(2, Math.round(n * D / W2)));
  const p = geo.attributes.position, nr = geo.attributes.normal, v = new THREE.Vector3(), c = new THREE.Vector3(), hx = W2 / 2 - r, hy = H2 / 2 - r, hz = D / 2 - r;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz)); v.sub(c).normalize(); nr.setXYZ(i, v.x, v.y, v.z); p.setXYZ(i, c.x + v.x * r, c.y + v.y * r, c.z + v.z * r); }
  return geo;
}
function buildKind(k) {
  const g = new THREE.Group(), P = pal(k), DS = THREE.DoubleSide, add = (geo, m) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  let h = 1;
  if (k === 'caja') {
    const W2 = 0.92, H2 = 1.22, D = 0.4, m = t => new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3 });
    const ms = m(paintTex(448, 1358, 'boxSide', k)), mt = m(paintTex(1024, 446, 'boxTop', k));
    add(roundBox(W2, H2, D, 0.016, 24), [ms, ms, mt, mt, m(paintTex(1024, 1358, 'boxFront', k)), m(paintTex(1024, 1358, 'boxBack', k))]).position.y = H2 / 2; h = H2;
  } else if (k === 'bolsa') {
    const W2 = 0.98, H2 = 1.0, D = 0.38, m = t => new THREE.MeshStandardMaterial({ map: t, roughness: 0.82 }), ms = m(paintTex(400, 1045, 'bagSide', k));
    add(new THREE.BoxGeometry(W2, H2, D), [ms, ms, new THREE.MeshBasicMaterial({ visible: false }), m(paintTex(256, 128, 'plain', k)), m(paintTex(1024, 1045, 'bagFront', k)), m(paintTex(1024, 1045, 'bagBack', k))]).position.y = H2 / 2;
    const inM = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.BackSide, color: new THREE.Color(P.base).multiplyScalar(0.5) });
    add(new THREE.BoxGeometry(W2 - 0.008, H2 - 0.004, D - 0.008), inM).position.y = H2 / 2 + 0.002;
    const rope = new THREE.MeshStandardMaterial({ roughness: 0.75, color: P.rope });
    for (const z of [D / 2 - 0.035, -(D / 2 - 0.035)]) add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.2, H2 - 0.07], [-0.19, H2 + 0.15], [0, H2 + 0.27], [0.19, H2 + 0.15], [0.2, H2 - 0.07]].map(([x, y]) => v3(x, y, z))), 48, 0.013, 10), rope);
    h = H2 + 0.27;
  } else if (k === 'tarro') {
    const r = 0.42, Rl = r - 0.06 + 0.03;
    const glass = add(latheG([[0.001, 0], [r - 0.05, 0], [r - 0.012, 0.012], [r, 0.05], [r, 0.68], [r - 0.014, 0.73], [r - 0.05, 0.765], [r - 0.06, 0.78], [r - 0.06, 0.84]]),
      new THREE.MeshPhysicalMaterial({ color: 0xeef5ff, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.2, specularIntensity: 0.3, side: DS, depthWrite: false, envMapIntensity: 0.7 }));
    glass.castShadow = false; glass.renderOrder = 2;
    add(latheG([[0.001, 0.02], [r - 0.045, 0.02], [r - 0.022, 0.045], [r - 0.022, 0.71], [r - 0.06, 0.725], [0.001, 0.73]]), new THREE.MeshPhysicalMaterial({ color: P.fill, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.2, specularIntensity: 0.5, side: DS }));
    add(latheG([[Rl - 0.012, 0.79], [Rl, 0.8], [Rl, 0.935], [Rl - 0.004, 0.95], [Rl - 0.03, 0.955], [0.001, 0.955]]), new THREE.MeshStandardMaterial({ color: P.lid, metalness: 0.85, roughness: 0.32, side: DS }));
    add(new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.5, 96, 1, true, -0.85, 1.7), new THREE.MeshStandardMaterial({ map: paintTex(1024, 712, 'jarLabel', k), roughness: 0.62, alphaTest: 0.5, side: DS })).position.y = 0.37;
    h = 0.96;
  } else if (k === 'botella') {
    const glass = new THREE.MeshPhysicalMaterial({ color: P.glass, roughness: 0.07, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, side: DS });
    add(latheG([[0.001, 0], [0.22, 0], [0.262, 0.016], [0.27, 0.06], [0.27, 0.78], [0.262, 0.84], [0.236, 0.92], [0.185, 0.995], [0.125, 1.065], [0.097, 1.12], [0.089, 1.18], [0.089, 1.36], [0.099, 1.372], [0.099, 1.398], [0.085, 1.41], [0.001, 1.41]]), glass);
    add(latheG([[0.093, 1.2], [0.096, 1.212], [0.096, 1.404], [0.09, 1.418], [0.001, 1.42]]), new THREE.MeshStandardMaterial({ color: P.cap, metalness: 0.55, roughness: 0.38, side: DS }));
    add(new THREE.CylinderGeometry(0.273, 0.273, 0.44, 96, 1, true, -1.25, 2.5), new THREE.MeshStandardMaterial({ map: paintTex(1024, 660, 'bottleLabel', k), roughness: 0.66, alphaTest: 0.5, side: DS })).position.y = 0.42;
    h = 1.42;
  } else if (k === 'lata') {
    const met = new THREE.MeshStandardMaterial({ color: 0xd4d8df, metalness: 1, roughness: 0.26, side: DS });
    add(latheG([[0.001, 0.035], [0.19, 0.016], [0.232, 0.0], [0.262, 0.004], [0.288, 0.04], [0.3, 0.075], [0.3, 0.905], [0.287, 0.95], [0.266, 0.982], [0.27, 0.99], [0.266, 1.0], [0.254, 0.995], [0.249, 0.978], [0.001, 0.975]]), met);
    add(new THREE.CylinderGeometry(0.3015, 0.3015, 0.83, 128, 1, true, Math.PI, Math.PI * 2), new THREE.MeshPhysicalMaterial({ map: paintTex(2048, 898, 'canPrint', k), metalness: 0.35, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.15 })).position.y = 0.49;
    add(roundBox(0.1, 0.008, 0.17, 0.0035, 8), met).position.set(0, 0.982, 0.05);
    h = 1.0;
  } else if (k === 'taza') {
    const cer = new THREE.MeshPhysicalMaterial({ color: 0xf4f2ee, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.08, side: DS });
    add(latheG([[0.001, 0], [0.37, 0], [0.392, 0.012], [0.4, 0.045], [0.4, 0.84], [0.396, 0.856], [0.386, 0.862]]), cer);
    add(latheG([[0.386, 0.862], [0.374, 0.856], [0.366, 0.836], [0.366, 0.1], [0.35, 0.075], [0.001, 0.07]]), new THREE.MeshPhysicalMaterial({ color: P.inner, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.08, side: DS }));
    const hd = add(new THREE.TorusGeometry(0.19, 0.042, 20, 48, Math.PI), cer); hd.rotation.z = -Math.PI / 2; hd.position.set(0.385, 0.45, 0);
    add(new THREE.CylinderGeometry(0.4025, 0.4025, 0.56, 96, 1, true, -1.02, 2.04), new THREE.MeshPhysicalMaterial({ map: paintTex(1024, 697, 'mugPrint', k), roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.08, alphaTest: 0.5, side: DS })).position.y = 0.45;
    h = 0.86;
  } else if (k === 'q') {      // «¿el tuyo?»
    const q = qmark(paint(0xf2f3f5, 0.2, 1)); q.scale.setScalar(1.75); q.position.y = 0.26 * 1.75 + 0.06; g.add(q); h = 1.05;
  }
  g.userData = { h }; return g;
}

// ---------------------------------------------------------------- la peana del visor (gira con el producto): aro con el degradado de la marca, ondas, sombra y halo
function buildPed() {
  const g = new THREE.Group(), turn = new THREE.Group(); g.add(turn);
  const T = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#171c29'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 1.5; for (let r = 30; r < 256; r += 13) { circ(c, 256, 256, r); c.stroke(); } });
  const side = new THREE.MeshStandardMaterial({ color: 0x121622, roughness: 0.35, metalness: 0.45 }), top = new THREE.MeshStandardMaterial({ map: T, roughness: 0.42, metalness: 0.3 });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(PED_R, PED_R * 1.046, PED_H, 120), [side, top, side]); ped.position.y = PED_H / 2; ped.castShadow = true; ped.receiveShadow = true; turn.add(ped);
  const GT = canvasTex(512, 2, (c, w) => { const lg = c.createLinearGradient(0, 0, w, 0); [['#ff4d61', 0], ['#b45cff', 0.25], ['#4f7dff', 0.5], ['#b45cff', 0.75], ['#ff4d61', 1]].forEach(([col, o]) => lg.addColorStop(o, col)); c.fillStyle = lg; c.fillRect(0, 0, w, 2); });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(PED_R * 1.001, 0.0085 * PS * 1.4, 8, 180), new THREE.MeshBasicMaterial({ map: GT, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) })); ring.rotation.x = Math.PI / 2; ring.position.y = PED_H; turn.add(ring);
  const radial = (a0, col) => canvasTex(256, 256, (c) => { const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, `rgba(${col},${a0})`); gr.addColorStop(0.55, `rgba(${col},${a0 * 0.45})`); gr.addColorStop(1, `rgba(${col},0)`); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(PED_R * 1.25, PED_R * 1.25), new THREE.MeshBasicMaterial({ map: radial(0.7, '0,0,0'), transparent: true, depthWrite: false, toneMapped: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = PED_H + 0.001; turn.add(sh);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.9 * PS, 3.9 * PS), new THREE.MeshBasicMaterial({ map: radial(0.5, '180,92,255'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); halo.rotation.x = -Math.PI / 2; halo.position.y = 0.004; g.add(halo);
  const ripG = new THREE.RingGeometry(0.962 * PED_R, PED_R, 128);
  const rips = [0, 1, 2].map(i => { const m = new THREE.Mesh(ripG, new THREE.MeshBasicMaterial({ color: i === 1 ? 0xffa31f : 0xff4d61, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = PED_H + 0.002 + i * 0.0005; turn.add(m); return { m, ph: i / 3 }; });
  scene.add(g); S.ped = { g, turn, ring, halo, rips, sh };
}

// ---------------------------------------------------------------- la polaroid en su soporte (la imagen: fondo de estudio, revelado de las fresas)
function drawFondo(g, w, h) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f4dcd2'); gr.addColorStop(0.58, '#ecc6b8'); gr.addColorStop(1, '#d9a596'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = g.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.55, w * 0.8); r.addColorStop(0, 'rgba(255,255,255,.4)'); r.addColorStop(1, 'rgba(110,60,45,.22)'); g.fillStyle = r; g.fillRect(0, 0, w, h);
}
let FOTO_STATE = -1;
function drawFoto(k) {      // k: 0 = fondo vacío; 0..1 = se revela la foto de las fresas; 1 = foto
  const q = Math.round(k * 40) / 40; if (q === FOTO_STATE) return; FOTO_STATE = q;
  const T = S.fotoT, g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height; g.setTransform(1, 0, 0, 1, 0, 0); g.filter = 'none';
  drawFondo(g, w, h);
  if (q > 0) { g.save(); g.globalAlpha = clamp(q * 1.6); g.filter = `saturate(${(0.15 + 0.85 * q).toFixed(2)}) contrast(${(0.55 + 0.45 * q).toFixed(2)}) brightness(${(1.35 - 0.35 * q).toFixed(2)})`; cover(g, FRESAS, 0, 0, w, h); g.restore(); g.filter = 'none';
    if (q < 1) { g.fillStyle = `rgba(60,80,70,${(0.25 * (1 - q) * clamp(q * 4)).toFixed(3)})`; g.fillRect(0, 0, w, h); } }
  T.needsUpdate = true;
}
function buildFoto() {
  const root = new THREE.Group(), tilt = new THREE.Group(); root.add(tilt); tilt.position.y = FOTO.base; tilt.rotation.x = FOTO.tilt;
  const card = rbox(FOTO.w, FOTO.h, FOTO.d, new THREE.MeshPhysicalMaterial({ color: 0xf3f0e9, roughness: 0.55, clearcoat: 0.25 }), 0.01); card.position.y = FOTO.h / 2; tilt.add(card);
  S.fotoT = canvasTex(768, 768);
  const img = new THREE.Mesh(new THREE.PlaneGeometry(FOTO.iw, FOTO.iw), new THREE.MeshPhysicalMaterial({ map: S.fotoT, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.08 }));
  img.position.set(0, FOTO_IMG_Y, FOTO.d / 2 + 0.0008); img.receiveShadow = true; tilt.add(img);
  const shT = canvasTex(256, 64, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(70,30,25,.55)'); gr.addColorStop(1, 'rgba(70,30,25,0)'); c.save(); c.scale(1, h / w); c.fillStyle = gr; c.fillRect(0, 0, w, w); c.restore(); });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.14), new THREE.MeshBasicMaterial({ map: shT, transparent: true, depthWrite: false, toneMapped: false })); sh.position.set(0, FOTO_FLOOR + 0.004, FOTO.d / 2 + 0.0016); sh.renderOrder = 1; tilt.add(sh);
  const stand = rbox(0.58, 0.07, 0.16, plastic(0x14161b, 0.3), 0.025); stand.position.set(0, 0.035, 0); root.add(stand);
  root.traverse(o => { if (o.isMesh && o !== sh) o.castShadow = true; });
  scene.add(root); S.foto = { root, tilt, img, sh };
  drawFoto(0);
}

// ---------------------------------------------------------------- el móvil
function buildPhone() {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshPhysicalMaterial({ color: 0x0b0c10, roughness: 0.28, metalness: 0.65, clearcoat: 1, clearcoatRoughness: 0.05 });
  g.add(rbox(PHN.w, PHN.h, PHN.d, bodyM, 0.13));
  const rimM = metal(0x9aa0aa, 0.22);
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(PHN.w + 0.006, PHN.h + 0.006, 0.12), { depth: 0.03, bevelEnabled: false, curveSegments: 12 }), rimM); rim.geometry.translate(0, 0, -0.015); g.add(rim);
  for (const [y, h] of [[0.42, 0.16], [0.18, 0.09], [0.06, 0.09]]) { const b = rbox(0.012, h, 0.022, rimM, 0.005); b.position.set(y > 0.3 ? PHN.w / 2 + 0.006 : -PHN.w / 2 - 0.006, y, 0); g.add(b); }
  const T = canvasTex(SCR.w, SCR.h); T.anisotropy = 8;
  const scr = new THREE.Mesh(rplane(PHN.sw, PHN.sh, 0.1), new THREE.MeshBasicMaterial({ map: T, toneMapped: false, color: new THREE.Color(1.12, 1.12, 1.12) })); scr.position.z = PHN.d / 2 + 0.0012; g.add(scr);
  const glass = new THREE.Mesh(rplane(PHN.sw + 0.02, PHN.sh + 0.02, 0.11), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.16, depthWrite: false }));
  glass.position.z = PHN.d / 2 + 0.0035; g.add(glass);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.position.set(0, -2, -0.06); scene.add(g); S.phone = g; S.scrT = T; S.scr = scr;
}

// ---------------------------------------------------------------- el calendario «DOMINGO», el bocadillo «KIRIA» y el avión de papel
function buildCal() {
  const g = new THREE.Group(); g.add(rbox(0.5, 0.37, 0.05, plastic(0x17191e, 0.3), 0.03));
  const f = textPlane(0.48, 0.35, (c, w, h) => { c.fillStyle = '#ff4d61'; rr(c, 0, 0, w, h * 0.3, 18); c.fill(); c.fillRect(0, h * 0.15, w, h * 0.15);
    c.fillStyle = '#f2f4f8'; for (const x of [0.28, 0.72]) { c.beginPath(); c.arc(w * x, h * 0.11, h * 0.045, 0, 7); c.fill(); }
    c.fillStyle = '#ffffff'; c.font = `900 ${h * 0.21}px Inter`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '4px'; c.fillText('DOMINGO', w / 2, h * 0.64); }, 512);
  f.position.z = 0.0262; g.add(f);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g); S.cal = g;
}
function buildCTA() {
  const bw = 0.62, bh = 0.27, r = 0.09, s = new THREE.Shape(), x0 = -bw / 2, y0 = -bh / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x0 + 0.16, y0); s.lineTo(x0 + 0.05, y0 - 0.1); s.lineTo(x0 + 0.26, y0); s.lineTo(x0 + bw - r, y0); s.quadraticCurveTo(x0 + bw, y0, x0 + bw, y0 + r);
  s.lineTo(x0 + bw, y0 + bh - r); s.quadraticCurveTo(x0 + bw, y0 + bh, x0 + bw - r, y0 + bh); s.lineTo(x0 + r, y0 + bh); s.quadraticCurveTo(x0, y0 + bh, x0, y0 + bh - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const bg = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.016, bevelSegments: 4, curveSegments: 14 }); bg.translate(0, 0, -0.025);
  const bub = new THREE.Group(); const bm = new THREE.Mesh(bg, paint(0xf6f6f7, 0.25, 1)); bm.castShadow = true; bub.add(bm);
  const lm = paint(0x111317, 0.25, 1);
  S.letters = 'KIRIA'.split('').map(c => text3(c, 0.13, 0.03, lm, { bevel: 0.005 }));
  let lw = 0; S.letters.forEach((o, i) => { lw += o.userData.w + (i ? 0.022 : 0); });
  let lx = -lw / 2; S.letters.forEach((o, i) => { if (i) lx += 0.022; o.position.set(lx + o.userData.w / 2, 0.004, 0.06); lx += o.userData.w; bub.add(o); });
  scene.add(bub); S.bubble = bub;
  const pl = new THREE.Group(), pm = new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.45, side: THREE.DoubleSide });
  const tri = (a, b, c) => { const g = new THREE.BufferGeometry().setFromPoints([a, b, c]); g.computeVertexNormals(); const m = new THREE.Mesh(g, pm); m.castShadow = true; return m; };
  pl.add(tri(v3(0, 0, 0.3), v3(-0.17, 0.02, -0.12), v3(0, -0.02, -0.1)), tri(v3(0, 0, 0.3), v3(0.17, 0.02, -0.12), v3(0, -0.02, -0.1)), tri(v3(0, 0, 0.3), v3(0, -0.02, -0.1), v3(0, -0.09, -0.11)));
  scene.add(pl); S.plane = pl;
}

// ---------------------------------------------------------------- todo junto: el producto va en un soporte (pose de la foto ↔ pose de la peana) y gira dentro
const KINDS = ['caja', 'bolsa', 'tarro', 'botella', 'lata', 'taza', 'q'];
function buildL2() {
  FRESAS = drawFresas();
  buildFoto(); buildPed(); buildPhone(); buildCal(); buildCTA();
  const carrier = new THREE.Group(), spin = new THREE.Group(); carrier.add(spin); scene.add(carrier);
  S.kinds = {}; for (const k of KINDS) { const o = buildKind(k); o.visible = false; spin.add(o); S.kinds[k] = o; }
  S.carrier = carrier; S.spin = spin;
}
