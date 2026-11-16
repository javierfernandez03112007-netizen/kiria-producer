// ---------------------------------------------------------------- 22 · LA PLAYA DE BRASIL al atardecer (prefijo bea): el móvil del hijo en la toalla
// Marco local (el de la viñeta): origen en la orilla (x = 0) en el centro de la franja, y = 0 nivel del mar; tierra en x ∈ [−40, 0], z ∈ [−20, 20].
// API: buildBeach() → Group (userData.anchors: phone, screenN, towel, manhole, shore, kiosk, palms) · beachAt(t, {screen, notif, buzz})
//      beaMsgPath(k) → {pos, scale}: camino de la burbuja msgBubble() desde el agua (x≈1, z = CABLE_Z) hasta meterse en la pantalla del móvil.
//      BEA_CAM0 = [px,py,pz, lx,ly,lz, fov] (marco local): el primer fotograma (el móvil de cerca con la notificación).
// El mar (x > 0) no está aquí. Ambiente: moodSet('brasil').

// ---------- el terreno: playa que sube suave, orilla mojada, dunas hacia dentro
function beaH(x, z) {
  const u = Math.max(0, -x);
  let y = 0.55 * (1 - Math.exp(-u / 2.6)) + 1.0 * _sm(9, 17, u) + 0.4 * _sm(21, 32, u);
  const dn = _sm(10, 16, u);
  y += dn * (0.3 * Math.sin(z * 0.23 + u * 0.31) * Math.sin(u * 0.17 - z * 0.11 + 1.3) + 0.12 * Math.sin(z * 0.57 - u * 0.4 + 0.7));
  y += _sm(2, 6, u) * (1 - dn) * 0.035 * Math.sin(z * 0.8 + u * 0.6);
  const dc = z - CABLE_Z; y -= 0.03 * Math.exp(-dc * dc / 0.06) * (1 - _sm(4.4, 5.0, u));          // la marca del cable en la arena (desde la orilla a la arqueta)
  const kx = x + 25, kz = z + 3; y = lerp(y, 1.62, Math.exp(-(kx * kx / 18 + kz * kz / 14)) * 0.9);   // explanada del chiringuito
  return y;
}
const BEA = { towel: [-7, 9], towelYaw: 0.12, man: [-5, CABLE_Z], kiosk: [-25, -3] };
// el móvil: en la toalla, boca arriba, con la parte de arriba hacia el mar (+x) y un poco girado
const BEA_PH = (() => { const [tx, tz] = BEA.towel, a = BEA.towelYaw, lx = 0.22, lz = 0.06;
  const x = tx + lx * Math.cos(a) + lz * Math.sin(a), z = tz - lx * Math.sin(a) + lz * Math.cos(a);
  return { x, z, yaw: -Math.PI / 2 + 0.22, y: beaH(x, z) + 0.0075 + 0.0043 }; })();
const BEA_SCREEN = new THREE.Vector3(BEA_PH.x, BEA_PH.y + 0.0045, BEA_PH.z);
// primer fotograma: cámara alta y algo oblicua desde tierra (mira hacia el mar), el móvil derecho en el cuadro
const BEA_CAM0 = (() => { const p = BEA_SCREEN, f = new THREE.Vector3(Math.cos(BEA_PH.yaw + Math.PI / 2), 0, -Math.sin(BEA_PH.yaw + Math.PI / 2));   // f = hacia dónde apunta la parte de arriba del móvil
  const c = p.clone().addScaledVector(f, -0.2).add(new THREE.Vector3(0, 0.27, 0)), l = p.clone().addScaledVector(f, 0.006);
  return [c.x, c.y, c.z, l.x, l.y, l.z, 34]; })();

function beaGrainTex() {
  const t = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#e9e4da'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const y0 = hash(i * 3.7) * h, a = 0.035 + hash(i * 1.9) * 0.03; g.strokeStyle = `rgba(120,95,60,${a})`; g.lineWidth = 6 + hash(i) * 10; g.beginPath();
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + 14 * Math.sin(x / w * Math.PI * 2 * 2 + i) + 6 * Math.sin(x / w * Math.PI * 2 * 5 + i * 2)); g.stroke(); }   // ondulitas del viento
    for (let i = 0; i < 60000; i++) { const x = hash(i * 1.13) * w, y = hash(i * 2.71) * h, r = 0.7 + hash(i * 3.9) * 1.8, k = hash(i * 5.3);
      g.fillStyle = k > 0.62 ? `rgba(255,252,240,${0.25 + 0.4 * hash(i * 7.1)})` : k > 0.2 ? `rgba(150,118,80,${0.12 + 0.2 * hash(i * 6.1)})` : `rgba(70,50,35,${0.15 + 0.2 * hash(i * 8.1)})`; g.fillRect(x, y, r, r); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function beaTerrain() {
  const X0 = -40, X1 = 0, Z0 = -20, Z1 = 20, NX = 200, NZ = 160, P = [], C = [], U = [], I = [];
  const dry = new THREE.Color(0xf6d9a2), wet = new THREE.Color(0xa8865e), dune = new THREE.Color(0xf2cf96), c = new THREE.Color();
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
    const x = lerp(X0, X1, i / NX), z = lerp(Z0, Z1, j / NZ), y = beaH(x, z), u = -x;
    P.push(x, y, z); U.push(x / 1.6, z / 1.6);
    c.copy(dry).lerp(dune, _sm(9, 16, u)); const wk = 1 - _sm(0.4, 2.6 + 0.3 * Math.sin(z * 0.7), u); c.lerp(wet, wk * 0.85);
    const dc = z - CABLE_Z; c.multiplyScalar(1 - 0.12 * Math.exp(-dc * dc / 0.08) * (1 - _sm(4.4, 5.0, u)));
    c.multiplyScalar(0.94 + 0.06 * hash(i * 13.1 + j * 7.7)); C.push(c.r, c.g, c.b);
    if (i && j) { const a = j * (NX + 1) + i, b = a - 1, d = a - (NX + 1), e = d - 1; I.push(e, b, d, d, b, a); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I); geo.computeVertexNormals();
  const gt = beaGrainTex();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: gt, bumpMap: gt, bumpScale: 0.6, roughness: 0.93, metalness: 0 }));
  m.receiveShadow = true; return m;
}
// la espuma que va y viene (una capa fina pegada a la arena, se desplaza su textura)
function beaSwash() {
  const X0 = -2.8, X1 = 0.0, NX = 36, NZ = 120, P = [], U = [], I = [];
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const x = lerp(X0, X1, i / NX), z = lerp(-20, 20, j / NZ); P.push(x, beaH(x, z) + 0.006, z); U.push(i / NX, z / 40 * 14);
    if (i && j) { const a = j * (NX + 1) + i, b = a - 1, d = a - (NX + 1), e = d - 1; I.push(e, b, d, d, b, a); } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I); geo.computeVertexNormals();
  const tex = canvasTex(1024, 1024, (g, w, h) => {
    const fx = v => w * 0.5 + 26 * Math.sin(v / h * Math.PI * 2 * 2) + 12 * Math.sin(v / h * Math.PI * 2 * 5 + 1) + 6 * Math.sin(v / h * Math.PI * 2 * 11);
    for (let v = 0; v < h; v += 2) { const x0 = fx(v); const gr = g.createLinearGradient(x0, 0, w, 0); gr.addColorStop(0, 'rgba(225,240,240,0.55)'); gr.addColorStop(0.08, 'rgba(150,200,205,0.32)'); gr.addColorStop(1, 'rgba(80,150,165,0.42)');
      g.fillStyle = gr; g.fillRect(x0, v, w - x0, 2); }
    for (let i = 0; i < 9000; i++) { const v = hash(i * 1.7) * h, d = Math.pow(hash(i * 2.3), 2.2) * 50, x = fx(v) + d - 3, r = 1.2 + hash(i * 3.1) * 3.2;   // la espuma: encaje blanco en el borde
      g.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * hash(i * 4.4)})`; g.beginPath(); g.arc(x, v, r, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 2500; i++) { const v = hash(i * 5.7) * h, x = fx(v) + 50 + hash(i * 6.3) * 380, r = 0.8 + hash(i * 7.9) * 2;                // restos de espuma detrás
      g.fillStyle = `rgba(255,255,255,${0.2 + 0.35 * hash(i * 8.2)})`; g.beginPath(); g.ellipse(x, v, r * 2.5, r, 0, 0, Math.PI * 2); g.fill(); }
  });
  tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.RepeatWrapping;
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.12, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.receiveShadow = true; m.renderOrder = 1; return m;
}

// ---------- la toalla (rayas de colores, algo de caída y arrugas, flecos)
function beaTowel() {
  const L = 1.8, Wd = 0.9, Lf = 1.9, g = new THREE.Group(), [cx, cz] = BEA.towel, a = BEA.towelYaw;
  const geo = new THREE.PlaneGeometry(Lf, Wd, 95, 45); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const lx = p.getX(i), lz = p.getZ(i), wx = cx + lx * Math.cos(a) + lz * Math.sin(a), wz = cz - lx * Math.sin(a) + lz * Math.cos(a);
    let y = beaH(wx, wz) + 0.006;
    y += 0.014 * Math.exp(-Math.pow((lx * 0.8 + lz * 0.6 + 0.62) / 0.05, 2)) * _sm(-0.45, 0.1, lz);        // arrugas suaves (lejos del móvil)
    y += 0.011 * Math.exp(-Math.pow((lx * 0.9 - lz * 0.4 + 0.45) / 0.04, 2)) * (1 - _sm(-0.1, 0.3, lz));
    y += 0.009 * Math.exp(-Math.pow((lx - 0.62) / 0.035, 2)) * _sm(0.05, 0.4, lz);
    y += 0.03 * _sm(-0.72, -0.95, lx) * (0.6 + 0.4 * Math.sin(lz * 9));                                     // el extremo de tierra algo enrollado
    y += 0.004 * Math.sin(lx * 23 + lz * 7) * Math.sin(lz * 17 - lx * 5);
    p.setXYZ(i, lx, y, lz); }
  geo.computeVertexNormals();
  const tex = canvasTex(2048, 1024, (c, w, h) => {
    const fr = w * (Lf - L) / Lf / 2, cols = ['#13b5c7', '#fff4e0', '#ffcf2e', '#ff5a5f', '#fff4e0', '#1f5fbf', '#3ccf6e', '#fff4e0', '#ffcf2e', '#ff8a3d', '#13b5c7'];
    const sw = (w - 2 * fr) / cols.length;
    cols.forEach((cl, k) => { c.fillStyle = cl; c.fillRect(fr + k * sw, 0, sw + 1, h); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(fr + k * sw + sw * 0.08, 0, sw * 0.04, h); });
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(fr, h * 0.06, w - 2 * fr, h * 0.02); c.fillRect(fr, h * 0.92, w - 2 * fr, h * 0.02);
    for (let i = 0; i < 90000; i++) { const x = fr + hash(i * 1.3) * (w - 2 * fr), y = hash(i * 2.9) * h; c.fillStyle = hash(i * 4.1) > 0.5 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.10)'; c.fillRect(x, y, 2, 2); }   // rizo del algodón
    for (const s of [0, 1]) for (let y = 4; y < h; y += 14) { c.strokeStyle = '#fff1dc'; c.lineWidth = 6; c.beginPath(); const x0 = s ? w - fr : fr, x1 = s ? w - 4 - hash(y) * 14 : 4 + hash(y) * 14;   // flecos
      c.moveTo(x0, y); c.quadraticCurveTo((x0 + x1) / 2, y + 6 * Math.sin(y), x1, y + 3); c.stroke(); }
  });
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.97, metalness: 0, side: THREE.DoubleSide, alphaTest: 0.5 }));
  tex.colorSpace = THREE.SRGBColorSpace; m.receiveShadow = true; m.castShadow = true;
  g.position.set(cx, 0, cz); g.rotation.y = a; g.add(m); return g;
}

// ---------- el móvil (boca arriba; pantalla de bloqueo + la notificación de «Mamá»)
const BEA_SW = 0.0692, BEA_SH = 0.1532, BEA_TW = 1024, BEA_TH = Math.round(1024 * BEA_SH / BEA_SW);
function beaIcon(c, x, y, r) {       // icono genérico: círculo verde con un bocadillo blanco (sin logos)
  const gr = c.createLinearGradient(0, y - r, 0, y + r); gr.addColorStop(0, '#5ee47f'); gr.addColorStop(1, '#22b552'); c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y - r * 0.05, r * 0.52, r * 0.42, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(x - r * 0.32, y + r * 0.22); c.lineTo(x - r * 0.42, y + r * 0.52); c.lineTo(x - r * 0.05, y + r * 0.33); c.fill();
}
function beaLockTex() {
  return canvasTex(BEA_TW, BEA_TH, (c, w, h) => {
    // fondo: atardecer suave sobre el mar
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a2c6e'); gr.addColorStop(0.3, '#7d4a9a'); gr.addColorStop(0.52, '#ee7a6a'); gr.addColorStop(0.64, '#ffb978'); gr.addColorStop(0.66, '#f39a6c'); gr.addColorStop(0.8, '#5a4c86'); gr.addColorStop(1, '#2a2a5c');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const sy = h * 0.6; let rg = c.createRadialGradient(w * 0.5, sy, 0, w * 0.5, sy, w * 0.75); rg.addColorStop(0, 'rgba(255,214,150,.9)'); rg.addColorStop(0.18, 'rgba(255,190,130,.45)'); rg.addColorStop(1, 'rgba(255,160,120,0)');
    c.fillStyle = rg; c.fillRect(0, 0, w, h);
    c.save(); c.beginPath(); c.rect(0, 0, w, h * 0.65); c.clip(); c.fillStyle = '#ffe2a8'; c.beginPath(); c.arc(w * 0.5, sy + 30, 120, 0, Math.PI * 2); c.fill(); c.restore();
    for (let i = 0; i < 26; i++) { const y = h * 0.655 + i * i * 0.9 + i * 8, ww = (220 - i * 6) * (0.6 + 0.4 * hash(i)); c.fillStyle = `rgba(255,205,140,${0.5 - i * 0.017})`; c.fillRect(w * 0.5 - ww / 2 + (hash(i * 3) - 0.5) * 40, y, ww, 4 + i * 0.3); }
    c.fillStyle = 'rgba(30,20,50,.55)'; c.beginPath(); c.moveTo(0, h * 0.62); c.quadraticCurveTo(w * 0.15, h * 0.6, w * 0.3, h * 0.655); c.lineTo(0, h * 0.66); c.fill();   // un cabo lejano
    // la barra de estado
    c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) c.fillRect(w - 250 + i * 22, 78 - i * 9, 14, 18 + i * 9);
    c.strokeStyle = '#fff'; c.lineWidth = 4; rr(c, w - 150, 50, 82, 40, 11); c.stroke(); c.fillRect(w - 143, 57, 58, 26); c.fillRect(w - 64, 63, 6, 14);
    c.fillStyle = '#000'; rr(c, w / 2 - 175, 34, 350, 100, 50); c.fill();                         // la isla de la cámara
    // candado, fecha y hora
    c.fillStyle = 'rgba(255,255,255,.95)'; c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 9; rr(c, w / 2 - 30, 222, 60, 46, 9); c.fill(); c.beginPath(); c.arc(w / 2, 222, 20, Math.PI, 0); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.shadowColor = 'rgba(40,20,60,.35)'; c.shadowBlur = 18;
    c.font = '600 64px Inter'; c.fillText('lunes, 16 de noviembre', w / 2, 380);
    c.font = '700 300px Inter'; c.fillText('18:47', w / 2, 660); c.shadowBlur = 0;
    // abajo: linterna y cámara, y la raya de inicio
    for (const s of [-1, 1]) { const x = w / 2 + s * 360, y = h - 250; c.fillStyle = 'rgba(30,25,45,.45)'; c.beginPath(); c.arc(x, y, 78, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff';
      if (s < 0) { rr(c, x - 16, y - 40, 32, 80, 8); c.fill(); c.fillStyle = 'rgba(30,25,45,.8)'; c.fillRect(x - 6, y - 14, 12, 12); }
      else { rr(c, x - 38, y - 24, 76, 52, 10); c.fill(); c.fillRect(x - 14, y - 34, 28, 12); c.fillStyle = 'rgba(30,25,45,.8)'; c.beginPath(); c.arc(x, y + 2, 15, 0, Math.PI * 2); c.fill(); } }
    c.fillStyle = 'rgba(255,255,255,.9)'; rr(c, w / 2 - 190, h - 52, 380, 14, 7); c.fill();
  });
}
const BEA_CARD = { y0: 750, h: 300 };
function beaCardTex() {
  return canvasTex(BEA_TW, BEA_CARD.h + 40, (c, w, h) => {
    const x0 = 34, y0 = 20, cw = w - 68, ch = BEA_CARD.h;
    c.shadowColor = 'rgba(30,10,40,.35)'; c.shadowBlur = 24; c.shadowOffsetY = 6; c.fillStyle = 'rgba(250,246,248,.86)'; rr(c, x0, y0, cw, ch, 62); c.fill(); c.shadowColor = 'transparent';
    beaIcon(c, x0 + 104, y0 + ch / 2, 64);
    c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.fillStyle = '#121216'; c.font = '800 74px Inter'; c.fillText('Mamá', x0 + 200, y0 + 122);
    c.textAlign = 'right'; c.fillStyle = '#6e6a74'; c.font = '500 52px Inter'; c.fillText('ahora', x0 + cw - 44, y0 + 116);
    c.textAlign = 'left'; c.fillStyle = '#1c1c22'; c.font = '500 70px Inter'; c.fillText('Hijo, ¿dónde estás?', x0 + 200, y0 + 226);
  });
}
function beaRRGeo(w, h, r) { const g = new THREE.ShapeGeometry(rrShape(w, h, r), 10), p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5); return g; }
function beaPhone() {
  const outer = new THREE.Group(), inner = new THREE.Group(); outer.add(inner); inner.rotation.x = -Math.PI / 2;     // inner: XY = pantalla, +z = hacia arriba
  const PW = 0.0752, PH = 0.1605, PD = 0.0086;
  const frameM = new THREE.MeshPhysicalMaterial({ color: 0x3a3f4a, roughness: 0.28, metalness: 0.85, clearcoat: 0.6 });
  const body = rbox(PW, PH, PD, frameM, 0.0115); inner.add(body);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: 0.05, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02 });
  const glass = new THREE.Mesh(beaRRGeo(PW - 0.0016, PH - 0.0016, 0.0105), glassM); glass.position.z = PD / 2 + 0.0002; glass.receiveShadow = true; inner.add(glass);
  const scrM = new THREE.MeshBasicMaterial({ map: beaLockTex(), toneMapped: false });
  const scr = new THREE.Mesh(beaRRGeo(BEA_SW, BEA_SH, 0.0088), scrM); scr.position.z = PD / 2 + 0.0004; inner.add(scr);
  const cardTex = beaCardTex(), ch = BEA_SW * cardTex.image.height / BEA_TW;
  const cardM = new THREE.MeshBasicMaterial({ map: cardTex, transparent: true, depthWrite: false, toneMapped: false });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(BEA_SW, ch), cardM); card.renderOrder = 2;
  const cardY = (0.5 - (BEA_CARD.y0 + 20 + BEA_CARD.h / 2) / BEA_TH) * BEA_SH; card.position.set(0, cardY, PD / 2 + 0.0006); inner.add(card);
  const shine = new THREE.Mesh(beaRRGeo(BEA_SW, BEA_SH, 0.0088), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    map: canvasTex(256, 512, (c, w, h) => { const g = c.createLinearGradient(0, h * 0.15, w, h * 0.55); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.42, 'rgba(255,236,215,0)'); g.addColorStop(0.5, 'rgba(255,236,215,.22)');
      g.addColorStop(0.62, 'rgba(255,236,215,.06)'); g.addColorStop(0.7, 'rgba(255,236,215,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }) }));
  shine.position.z = PD / 2 + 0.0008; shine.renderOrder = 3; inner.add(shine);
  for (const [y, l, s] of [[0.03, 0.022, 1], [0.0, 0.012, -1], [-0.018, 0.012, -1]]) { const b = rbox(0.0016, l, 0.0028, frameM, 0.0007); b.position.set(s * (PW / 2 + 0.0004), y, 0); inner.add(b); }   // botones
  const glow = new THREE.PointLight(0xffe2cf, 0, 0.6, 2); glow.position.set(0, 0, 0.05); inner.add(glow);
  outer.position.set(BEA_PH.x, BEA_PH.y, BEA_PH.z); outer.rotation.y = BEA_PH.yaw;
  outer.userData = { inner, scrM, card, cardM, cardY, shine, glow, glass }; return outer;
}

// ---------- cosas de playa
function beaFlipFlop(col, strapCol) {
  const g = new THREE.Group(), s = new THREE.Shape(), N = 40;
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, y = Math.sin(a), wdt = 0.043 * (1 + 0.22 * y) * (0.82 + 0.18 * Math.cos(2 * a) ** 2), x = Math.cos(a) * wdt - 0.008 * y * y; const yy = y * 0.125;
    i ? s.lineTo(x, yy) : s.moveTo(x, yy); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 8 }); geo.rotateX(-Math.PI / 2);
  const sole = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.55, clearcoat: 0.3 })); sole.castShadow = sole.receiveShadow = true; sole.position.y = 0.004; g.add(sole);
  const top = new THREE.Mesh(new THREE.ShapeGeometry(s, 12), new THREE.MeshStandardMaterial({ color: 0xfff3e2, roughness: 0.7 })); top.rotation.x = -Math.PI / 2; top.position.y = 0.0205; top.scale.setScalar(0.9); top.receiveShadow = true; g.add(top);
  const sm = new THREE.MeshPhysicalMaterial({ color: strapCol, roughness: 0.4, clearcoat: 0.5 });
  const toe = v3(0, 0.021, -0.075);
  for (const sd of [-1, 1]) g.add(tube([toe, v3(sd * 0.022, 0.042, -0.05), v3(sd * 0.04, 0.038, -0.012), v3(sd * 0.044, 0.021, 0.008)], 0.0055, sm, 20, false, 8));
  const knob = sph(0.007, sm); knob.position.copy(toe).setY(0.026); g.add(knob);
  return g;
}
function beaSunglasses() {
  const g = new THREE.Group(), fm = new THREE.MeshPhysicalMaterial({ color: 0x1b1414, roughness: 0.25, clearcoat: 1 });
  const lm = new THREE.MeshPhysicalMaterial({ color: 0x2a1a10, roughness: 0.03, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.2 });
  for (const s of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.026, 32), lm); lens.scale.set(1.15, 0.95, 1); lens.position.set(s * 0.034, 0.03, 0); lens.rotation.x = -1.15; g.add(lens);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0028, 8, 40), fm); rim.scale.set(1.15, 0.95, 1); rim.position.copy(lens.position); rim.rotation.copy(lens.rotation); rim.castShadow = true; g.add(rim);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.003, 0.11), fm); arm.position.set(s * 0.058, 0.004, -0.045); arm.rotation.y = s * 0.55; arm.castShadow = true; g.add(arm);
  }
  g.add(bar(v3(-0.008, 0.042, -0.008), v3(0.008, 0.042, -0.008), 0.0025, fm));
  return g;
}
function beaCoconut() {
  const g = new THREE.Group(), hm = new THREE.MeshStandardMaterial({ color: 0x7fa83a, roughness: 0.6 });
  const n = lathe([[0.0001, 0], [0.05, 0.006], [0.085, 0.04], [0.095, 0.08], [0.085, 0.125], [0.055, 0.155], [0.045, 0.158]], 40, hm); g.add(n);
  const cut = new THREE.Mesh(new THREE.CircleGeometry(0.046, 32), new THREE.MeshStandardMaterial({ color: 0xf1ead2, roughness: 0.8 })); cut.rotation.x = -Math.PI / 2; cut.position.y = 0.1585; g.add(cut);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.012, 20), new THREE.MeshStandardMaterial({ color: 0x3a3020 })); hole.rotation.x = -Math.PI / 2; hole.position.set(0.006, 0.159, 0); g.add(hole);
  const st = canvasTex(64, 256, (c, w, h) => { for (let y = 0; y < h; y += 32) { c.fillStyle = '#ff4f7a'; c.fillRect(0, y, w, 16); c.fillStyle = '#fff6ee'; c.fillRect(0, y + 16, w, 16); } }); st.wrapS = st.wrapT = THREE.RepeatWrapping;
  g.add(tube([v3(0.006, 0.1, 0), v3(0.01, 0.2, 0.004), v3(0.02, 0.255, 0.01), v3(0.05, 0.275, 0.02)], 0.0045, new THREE.MeshPhysicalMaterial({ map: st, roughness: 0.3, clearcoat: 0.6 }), 30, false, 10));
  const fl = new THREE.Mesh(new THREE.CircleGeometry(0.03, 6), new THREE.MeshStandardMaterial({ color: 0xff7aa8, side: THREE.DoubleSide, roughness: 0.6 })); fl.position.set(-0.03, 0.165, 0.02); fl.rotation.set(-1.2, 0, 0.4); g.add(fl);   // una florecita
  const fc = sph(0.008, new THREE.MeshStandardMaterial({ color: 0xffd23f })); fc.position.set(-0.03, 0.17, 0.022); g.add(fc);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g;
}
function beaUmbrella() {
  const g = new THREE.Group(), H = 2.15, R = 1.05, pm = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.35, metalness: 0.4 });
  const pole = cyl(0.018, 0.018, H + 0.35, pm, 12); pole.position.y = (H + 0.35) / 2 - 0.35; g.add(pole);
  const cols = [0xff6a4d, 0xfff4e4, 0x16b3c4, 0xfff4e4]; const N = 8;
  for (let i = 0; i < N; i++) { const geo = new THREE.ConeGeometry(R, 0.42, 6, 4, true, i / N * Math.PI * 2, Math.PI * 2 / N), p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k), r = Math.hypot(x, z) / R, a = Math.atan2(z, x) - i / N * Math.PI * 2; p.setY(k, p.getY(k) - 0.06 * r * r - 0.05 * r * Math.pow(Math.sin(a * N / 2 - Math.PI / 2 + Math.PI / 2), 2) * 0); }
    geo.computeVertexNormals(); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cols[i % 4], roughness: 0.75, side: THREE.DoubleSide })); m.position.y = H; m.castShadow = true; m.receiveShadow = true; g.add(m); }
  const top = sph(0.035, pm); top.position.y = H + 0.23; g.add(top);
  for (let i = 0; i < N; i++) { const a = (i + 0.5) / N * Math.PI * 2; g.add(bar(v3(0, H - 0.25, 0), v3(Math.sin(a) * R * 0.62, H - 0.03, Math.cos(a) * R * 0.62), 0.004, pm, 4)); }
  return g;
}
// palmera de maqueta: tronco anillado y curvo, hojas arqueadas con foliolos, cocos
let _beaFrondT = null;
function beaFrondTex() {
  if (_beaFrondT) return _beaFrondT;
  _beaFrondT = canvasTex(256, 1024, (c, w, h) => {
    for (let i = 0; i < 70; i++) { const y = i / 70 * h, len = w * 0.5 * Math.sin(Math.PI * Math.pow(y / h, 0.75)) * 0.98 + 6;
      const col = `hsl(${92 + 14 * hash(i)}, ${48 + 10 * hash(i * 3)}%, ${30 + 10 * hash(i * 5) + 10 * (y / h)}%)`; c.fillStyle = col;
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(w / 2, y); c.quadraticCurveTo(w / 2 + s * len * 0.6, y + 2, w / 2 + s * len, y + 26 + 14 * (1 - y / h)); c.lineTo(w / 2 + s * len * 0.98, y + 31 + 14 * (1 - y / h)); c.quadraticCurveTo(w / 2 + s * len * 0.5, y + 14, w / 2, y + 12); c.fill(); } }
    c.fillStyle = '#c9b56a'; c.fillRect(w / 2 - 4, 0, 8, h);
  });
  return _beaFrondT;
}
function beaPalm(h, lean, seed) {
  const g = new THREE.Group(), pts = [];
  for (let i = 0; i <= 10; i++) { const s = i / 10; pts.push(v3(lean * h * (0.55 * s * s + 0.15 * s) + 0.15 * Math.sin(s * 3 + seed), s * h, 0.12 * Math.sin(s * 2.3 + seed * 2) * s)); }
  const cv = new THREE.CatmullRomCurve3(pts), NS = 180, NR = 14, P = [], C = [], I = [], len = cv.getLength();
  for (let i = 0; i <= NS; i++) { const s = i / NS, c = cv.getPointAt(s), T = cv.getTangentAt(s), N = new THREE.Vector3(0, 0, 1).cross(T).normalize(), B = T.clone().cross(N).normalize();
    const L = s * len, f = (L * 5.2) % 1, ring = Math.min(1, f / 0.12) * (1 - Math.max(0, (f - 0.12) / 0.5)), r = lerp(0.2, 0.12, s) * (1 + 0.09 * Math.max(0, ring)) + 0.14 * Math.exp(-s * 28);
    const sh = 0.55 + 0.3 * (1 - ring) + 0.08 * hash(i + seed * 50);
    for (let j = 0; j <= NR; j++) { const a = j / NR * Math.PI * 2; P.push(c.x + (Math.cos(a) * N.x + Math.sin(a) * B.x) * r, c.y + (Math.cos(a) * N.y + Math.sin(a) * B.y) * r, c.z + (Math.cos(a) * N.z + Math.sin(a) * B.z) * r);
      C.push(0.62 * sh, 0.5 * sh, 0.38 * sh); if (i && j) { const q = i * (NR + 1) + j; I.push(q - NR - 2, q - 1, q - NR - 1, q - NR - 1, q - 1, q); } } }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); tg.setIndex(I); tg.computeVertexNormals();
  const trunk = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })); trunk.castShadow = trunk.receiveShadow = true; g.add(trunk);
  const top = cv.getPointAt(1), crown = sph(0.2, new THREE.MeshStandardMaterial({ color: 0x6b6a34, roughness: 0.8 })); crown.scale.set(1, 0.8, 1); crown.position.copy(top); g.add(crown);
  const cm = new THREE.MeshStandardMaterial({ color: 0x6f8f2c, roughness: 0.55 });
  for (let k = 0; k < 5; k++) { const a = k * 1.3 + seed, cc = sph(0.1, cm, 16, 12); cc.position.set(top.x + Math.cos(a) * 0.17, top.y - 0.17 - 0.05 * hash(k + seed), top.z + Math.sin(a) * 0.17); g.add(cc); }
  const fm = new THREE.MeshStandardMaterial({ map: beaFrondTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 }), geos = [];
  const NF = 10;
  for (let k = 0; k < NF; k++) {
    const yaw = k / NF * Math.PI * 2 + 0.4 * hash(k + seed * 7), Lf = 2.2 + 0.7 * hash(k * 3 + seed), th0 = 0.75 + 0.35 * hash(k * 5 + seed), th1 = -0.6 - 0.6 * hash(k * 9 + seed);
    const NS2 = 18, NW = 4, PP = [], UU = [], II = []; let x = 0, y = 0;
    const dir = v3(Math.cos(yaw), 0, Math.sin(yaw)), side = v3(-Math.sin(yaw), 0, Math.cos(yaw));
    for (let i = 0; i <= NS2; i++) { const s = i / NS2, th = lerp(th0, th1, Math.pow(s, 1.25)); if (i) { x += Math.cos(th) * Lf / NS2; y += Math.sin(th) * Lf / NS2; }
      const wd = 0.42 * Math.sin(Math.PI * Math.pow(Math.min(s, 0.999), 0.72)) * (1 - 0.25 * s) + 0.01;
      for (let j = 0; j <= NW; j++) { const v = j / NW * 2 - 1, droop = -Math.abs(v) * wd * 0.45 + (v > 0 ? 0.04 : 0) * s;
        const p = dir.clone().multiplyScalar(x).addScaledVector(side, v * wd).add(v3(0, y + droop, 0)).add(top); PP.push(p.x, p.y, p.z); UU.push(j / NW, 1 - s);
        if (i && j) { const q = i * (NW + 1) + j; II.push(q - NW - 2, q - 1, q - NW - 1, q - NW - 1, q - 1, q); } } }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(PP, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(UU, 2)); fg.setIndex(II); geos.push(fg);
  }
  const fronds = new THREE.Mesh(mergeGeometries(geos), fm); fronds.geometry.computeVertexNormals(); fronds.castShadow = true; fronds.receiveShadow = true; g.add(fronds);
  g.userData.top = top; return g;
}
// el chiringuito: tejado de paja, barra, taburetes y luces cálidas colgadas
function beaKiosk() {
  const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ map: woodTex ? woodTex('#9a6a3e', '#6e4626', '#c08a55', 4) : null, color: 0xffffff, roughness: 0.8 });
  const straw = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#c9a24f'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const x = hash(i * 1.7) * w, y = hash(i * 2.3) * h; c.strokeStyle = `rgba(${hash(i) > 0.5 ? '255,225,150' : '110,80,30'},${0.25 + 0.3 * hash(i * 3)})`; c.lineWidth = 1 + hash(i * 5) * 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (hash(i * 7) - 0.5) * 6, y + 30 + hash(i * 9) * 40); c.stroke(); } });
  straw.wrapS = straw.wrapT = THREE.RepeatWrapping; straw.repeat.set(3, 2);
  const sm = new THREE.MeshStandardMaterial({ map: straw, roughness: 0.95, side: THREE.DoubleSide });
  const deck = rbox(4.2, 3.2, 0.15, wood, 0.03); deck.rotation.x = -Math.PI / 2; deck.position.y = 0.075; g.add(deck);
  for (const [x, z] of [[-1.9, -1.4], [1.9, -1.4], [-1.9, 1.4], [1.9, 1.4]]) { const p = cyl(0.07, 0.08, 2.5, wood, 10); p.position.set(x, 1.25, z); g.add(p); }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.4, 4, 3), sm); roof.rotation.y = Math.PI / 4; roof.position.y = 2.5 + 0.7; roof.scale.set(1, 1, 0.82); roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
  const fringe = new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.3, 0.35, 4, 1, true), new THREE.MeshStandardMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95,
    map: canvasTex(1024, 64, (c, w, h) => { for (let x = 0; x < w; x += 3) { c.fillStyle = hash(x) > 0.5 ? '#b8903f' : '#d8b468'; c.fillRect(x, 0, 3, h * (0.55 + 0.45 * hash(x * 1.3))); } }) }));
  fringe.rotation.y = Math.PI / 4; fringe.scale.set(1, 1, 0.82); fringe.position.y = 2.38; fringe.castShadow = true; g.add(fringe);
  const cnt = rbox(3.0, 1.05, 0.55, new THREE.MeshPhysicalMaterial({ color: 0x14a3a8, roughness: 0.45, clearcoat: 0.6 }), 0.04); cnt.position.set(0, 0.15 + 0.52, 1.0); g.add(cnt);
  const topb = rbox(3.2, 0.06, 0.7, wood, 0.02); topb.position.set(0, 1.23, 1.0); g.add(topb);
  const stripes = [0xffcf2e, 0xff5a5f, 0x3ccf6e]; stripes.forEach((cl, i) => { const s = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.07, 0.01), plastic(cl, 0.3)); s.position.set(0, 0.45 + i * 0.12, 1.28); g.add(s); });
  for (let i = 0; i < 3; i++) { const st = new THREE.Group(), seat = cyl(0.2, 0.2, 0.06, plastic(0xff8a3d, 0.3), 20); seat.position.y = 0.78; st.add(seat); const leg = cyl(0.03, 0.04, 0.7, MAT.steel || wood, 8); leg.position.y = 0.4; st.add(leg); st.position.set(-1 + i, 0.15, 1.75); g.add(st); }
  const shelf = rbox(2.6, 0.04, 0.3, wood, 0.01); shelf.position.set(0, 1.55, -1.1); g.add(shelf);
  for (let i = 0; i < 9; i++) { const b = cyl(0.04, 0.045, 0.24, new THREE.MeshPhysicalMaterial({ color: [0x3ccf6e, 0xffcf2e, 0xff5a5f, 0x9fe8ff][i % 4], roughness: 0.1, transmission: 0, clearcoat: 1 }), 12); b.position.set(-1.1 + i * 0.27, 1.69, -1.1); g.add(b); }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(512, 146, (c, w, h) => { c.fillStyle = '#fff4dd'; rr(c, 4, 4, w - 8, h - 8, 24); c.fill();
    c.fillStyle = '#ff5a5f'; c.font = '900 84px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BAR', w / 2, h / 2 + 4); for (const s of [-1, 1]) { c.fillStyle = '#3ccf6e'; c.beginPath(); c.arc(w / 2 + s * 160, h / 2, 22, 0, Math.PI * 2); c.fill(); } }) }));
  sign.position.set(0, 2.3, 1.55); g.add(sign);
  // las luces colgadas: desde el tejado a dos postes delante
  const bm = new THREE.MeshStandardMaterial({ color: 0x221100, emissive: 0xffb860, emissiveIntensity: 5, roughness: 0.4 }), wm = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
  const poles = [v3(-3.6, 0, 3.6), v3(3.6, 0, 3.6)]; for (const p of poles) { const pc = cyl(0.04, 0.05, 2.6, wood, 8); pc.position.copy(p).setY(1.3); g.add(pc); }
  const runs = [[v3(-1.9, 2.35, 1.4), v3(-3.6, 2.55, 3.6)], [v3(-3.6, 2.55, 3.6), v3(3.6, 2.55, 3.6)], [v3(3.6, 2.55, 3.6), v3(1.9, 2.35, 1.4)], [v3(-1.9, 2.35, 1.4), v3(1.9, 2.35, 1.4)]];
  for (const [a, b] of runs) { const pts = [], n = 14, sag = a.distanceTo(b) * 0.09;
    for (let i = 0; i <= n; i++) { const s = i / n; pts.push(a.clone().lerp(b, s).add(v3(0, -sag * 4 * s * (1 - s), 0))); }
    g.add(tube(pts, 0.008, wm, 40, false, 5)); for (let i = 1; i < n; i += 1) { const bl = sph(0.045, bm, 10, 8); bl.castShadow = false; bl.position.copy(pts[i]).add(v3(0, -0.06, 0)); g.add(bl); } }
  const pl = new THREE.PointLight(0xffb366, 0, 9, 1.6); pl.position.set(0, 2.0, 1.6); g.add(pl); g.userData.light = pl;
  g.traverse(o => { if (o.isMesh && o.castShadow === false && o.material !== bm) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
// la arqueta del cable (tapa de hormigón, sin letras)
function beaManhole() {
  const g = new THREE.Group(), ct = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#a7a39b'; c.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { c.fillStyle = hash(i) > 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(40,35,30,.16)'; c.fillRect(hash(i * 1.3) * w, hash(i * 2.7) * h, 1 + hash(i * 3) * 2, 1 + hash(i * 5) * 2); } });
  const cm = new THREE.MeshStandardMaterial({ map: ct, roughness: 0.9 }), cm2 = new THREE.MeshStandardMaterial({ map: ct, color: 0xcfc8bc, roughness: 0.85 });
  const frame = rbox(0.86, 0.86, 0.22, cm, 0.02); frame.rotation.x = -Math.PI / 2; g.add(frame);
  const lid = rbox(0.7, 0.7, 0.05, cm2, 0.012); lid.rotation.x = -Math.PI / 2; lid.position.y = 0.09; g.add(lid);
  for (const s of [-1, 1]) { const h = cyl(0.025, 0.025, 0.012, new THREE.MeshStandardMaterial({ color: 0x2a2724 }), 14); h.position.set(s * 0.24, 0.112, 0); g.add(h); }
  const ln = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.004, 0.012), new THREE.MeshStandardMaterial({ color: 0x77736b })); ln.position.y = 0.116; g.add(ln);
  return g;
}
// huellas en la arena (pisadas que van de la toalla al agua)
function beaFootprints() {
  const tex = canvasTex(128, 256, (c, w, h) => { const blob = (x, y, rx, ry, a) => { const r = c.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); r.addColorStop(0, `rgba(0,0,0,${a})`); r.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.translate(x, y); c.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); c.translate(-x, -y); c.fillStyle = r; c.beginPath(); c.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2); c.fill(); c.restore(); };
    blob(64, 190, 34, 48, 0.85); blob(60, 100, 40, 62, 0.85); for (let i = 0; i < 5; i++) blob(36 + i * 14, 36 + Math.abs(i - 1) * 5, 9, 12, 0.8); });
  const pts = [];
  const track = (x0, z0, x1, z1, n, seed) => { for (let i = 0; i < n; i++) { const s = i / (n - 1), x = lerp(x0, x1, s) + 0.25 * Math.sin(s * 3 + seed), z = lerp(z0, z1, s) + 0.3 * Math.sin(s * 4.2 + seed), d = Math.atan2(x1 - x0, z1 - z0), side = i % 2 ? 1 : -1;
    pts.push([x + Math.cos(d) * 0.09 * side, z - Math.sin(d) * 0.09 * side, d]); } };
  track(-6.0, 10.0, -0.7, 12.2, 18, 1); track(-8.6, 9.6, -14, 11.2, 14, 2); track(-1.2, 4.8, -4.3, 3.0, 9, 3);
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.11, 0.24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6a4a28, map: tex, transparent: true, opacity: 0.45, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), pts.length);
  pts.forEach(([x, z, d], i) => { _o.position.set(x, beaH(x, z) + 0.008, z); _o.rotation.set(0, d + Math.PI, 0); _o.scale.setScalar(1); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); });
  im.receiveShadow = true; im.renderOrder = 1; return im;
}
// vegetación rastrera de las dunas (hojitas redondas en guías) y matas de hierba
function beaPlants() {
  const g = new THREE.Group();
  const leafG = new THREE.CircleGeometry(0.07, 7).rotateX(-Math.PI / 2); leafG.scale(1, 1, 0.8);
  const leafs = [], tufts = [];
  for (let r = 0; r < 70; r++) { let x = -11 - hash(r * 1.7) * 28, z = -19 + hash(r * 2.9) * 38, a = hash(r * 4.1) * 6.28; if (Math.hypot(x - BEA.kiosk[0], z - BEA.kiosk[1]) < 4.5) continue;
    const n = 30 + Math.floor(hash(r * 5.3) * 40); for (let i = 0; i < n; i++) { a += (hash(r * 100 + i) - 0.5) * 0.7; x += Math.cos(a) * 0.09; z += Math.sin(a) * 0.09; if (x > -10 || x < -39.5 || Math.abs(z) > 19.5) break;
      for (let q = 0; q < 4; q++) { const rr2 = 0.05 + 0.22 * hash(r * 17 + i * 5 + q), aa = hash(r * 13 + i * 7 + q) * 6.28; leafs.push([x + Math.cos(aa) * rr2, z + Math.sin(aa) * rr2, aa, 0.8 + 0.7 * hash(r * 31 + i * 3 + q)]); } } }
  for (let i = 0; i < 260; i++) { const x = -10.5 - Math.pow(hash(i * 3.3), 0.8) * 29, z = -19 + hash(i * 5.1) * 38; if (Math.hypot(x - BEA.kiosk[0], z - BEA.kiosk[1]) < 4.5) continue; tufts.push([x, z, hash(i * 7.7) * 6.28, 0.7 + 0.8 * hash(i * 9.1)]); }
  const lm = new THREE.InstancedMesh(leafG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide }), leafs.length), c = new THREE.Color();
  leafs.forEach(([x, z, a, s], i) => { _o.position.set(x, beaH(x, z) + 0.02, z); _o.rotation.set(0.2 * Math.sin(i), a, 0.25 * Math.cos(i * 1.3)); _o.scale.setScalar(s); _o.updateMatrix(); lm.setMatrixAt(i, _o.matrix);
    lm.setColorAt(i, c.setHSL(0.27 + 0.05 * hash(i * 1.1), 0.5, 0.26 + 0.1 * hash(i * 2.2))); });
  lm.castShadow = true; lm.receiveShadow = true; g.add(lm);
  const blades = []; for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, b = new THREE.BufferGeometry(), r = 0.03, hh = 0.35 + 0.15 * hash(k), lean = 0.12 + 0.1 * hash(k * 3);
    b.setAttribute('position', new THREE.Float32BufferAttribute([Math.cos(a + 1.57) * r, 0, Math.sin(a + 1.57) * r, -Math.cos(a + 1.57) * r, 0, -Math.sin(a + 1.57) * r, Math.cos(a) * lean, hh, Math.sin(a) * lean], 3)); b.computeVertexNormals(); blades.push(b); }
  const tm = new THREE.InstancedMesh(mergeGeometries(blades), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide }), tufts.length);
  tufts.forEach(([x, z, a, s], i) => { _o.position.set(x, beaH(x, z) - 0.01, z); _o.rotation.set(0, a, 0); _o.scale.set(s, s * (0.8 + 0.4 * hash(i)), s); _o.updateMatrix(); tm.setMatrixAt(i, _o.matrix);
    tm.setColorAt(i, c.setHSL(0.17 + 0.06 * hash(i * 1.9), 0.42, 0.42 + 0.1 * hash(i * 2.8))); });
  tm.castShadow = true; tm.receiveShadow = true; g.add(tm);
  return g;
}

// ---------- montaje
function buildBeach() {
  const g = new THREE.Group(); g.name = 'beach';
  g.add(beaTerrain());
  const sw = beaSwash(); g.add(sw);
  const band = { band: 0.55, bandCol: 0xd8b57a };
  const xs = []; for (let i = 0; i <= 160; i++) xs.push(-40 + i * 0.25);
  const zs = []; for (let i = 0; i <= 160; i++) zs.push(-20 + i * 0.25);
  g.add(strataFace(xs, x => beaH(x, 20), 20, band), strataFace(xs, x => beaH(x, -20), -20, band), strataFace(zs, z => beaH(-40, z), -40, { ...band, normalX: -1 }));
  g.add(beaTowel());
  const phone = beaPhone(); g.add(phone);
  // las cosas de la toalla
  const [tx, tz] = BEA.towel, ta = BEA.towelYaw, onT = (lx, lz) => { const x = tx + lx * Math.cos(ta) + lz * Math.sin(ta), z = tz - lx * Math.sin(ta) + lz * Math.cos(ta); return v3(x, beaH(x, z) + 0.006, z); };
  const ff1 = beaFlipFlop(0xff5a7a, 0xfff6ec), ff2 = beaFlipFlop(0xff5a7a, 0xfff6ec); ff1.position.copy(onT(-0.55, 0.64)); ff1.position.y -= 0.006; ff1.rotation.y = 1.9; g.add(ff1);
  ff2.position.copy(onT(-0.32, 0.7)); ff2.position.y -= 0.006; ff2.rotation.y = 1.55; g.add(ff2);
  const sg = beaSunglasses(); sg.position.copy(onT(0.02, -0.16)).add(v3(0, 0.004, 0)); sg.rotation.y = 2.3; g.add(sg);
  const co = beaCoconut(); co.position.copy(onT(-0.18, -0.62)); co.position.y -= 0.03; co.rotation.y = 0.6; g.add(co);
  const um = beaUmbrella(); um.position.set(-5.6, beaH(-5.6, 7.0), 7.0); um.rotation.set(0.1, 0.4, 0.12); g.add(um);
  // palmeras (inclinadas hacia el mar)
  const PALMS = [[-13.4, 12.6, 7.0, 0.38, 0.45], [-8.6, 4.2, 6.4, 0.42, 0.0], [-10.8, -2.6, 7.6, 0.3, 0.2], [-17.2, 9.0, 7.6, 0.3, -0.2], [-12.6, -14.6, 7.0, 0.36, 0.5], [-15.5, 1.5, 8.4, 0.22, -0.4]];
  const palms = [], pA = [];
  PALMS.forEach(([x, z, h, l, yaw], i) => { const p = beaPalm(h, l, i + 1); p.position.set(x, beaH(x, z) - 0.05, z); p.rotation.y = yaw; g.add(p); palms.push(p); p.updateMatrix(); pA.push(p.userData.top.clone().applyMatrix4(p.matrix)); });
  const ki = beaKiosk(); ki.position.set(BEA.kiosk[0], beaH(...BEA.kiosk) - 0.05, BEA.kiosk[1]); ki.rotation.y = Math.PI / 2 + 0.25; g.add(ki);
  const mh = beaManhole(); mh.position.set(BEA.man[0], beaH(...BEA.man) - 0.08, BEA.man[1]); g.add(mh);
  g.add(beaFootprints(), beaPlants());
  const anchors = { phone: BEA_SCREEN.clone(), screenN: v3(0, 1, 0), towel: onT(0, 0), manhole: mh.position.clone().add(v3(0, 0.13, 0)), shore: v3(0, 0, CABLE_Z),
    kiosk: ki.position.clone().add(v3(0, 2.6, 0)), palms: pA };
  g.userData = { anchors, phone, swash: sw, kiosk: ki };
  S.bea = g; return g;
}
// t en segundos (la espuma va y viene sola); screen 0..1 enciende la pantalla, notif 0..1 entra la tarjeta (deslizamiento + rebote), buzz 0..1 vibra
function beachAt(t, o = {}) {
  const g = S.bea; if (!g) return; const U = g.userData, ph = U.phone.userData;
  const sc = clamp(o.screen ?? 1), nk = clamp(o.notif ?? 1), bz = clamp(o.buzz ?? 0);
  // la ola: sube rápido y se retira despacio (ciclo de ~5,5 s)
  const cyc = (t / 5.5) % 1, wv = cyc < 0.35 ? Math.sin(cyc / 0.35 * Math.PI / 2) : 0.5 + 0.5 * Math.cos((cyc - 0.35) / 0.65 * Math.PI);
  const front = lerp(-0.25, -2.1, wv);                     // x del frente de la espuma
  U.swash.material.map.offset.x = 0.5 - (front + 2.8) / 2.8; U.swash.material.opacity = 0.75 + 0.25 * wv;
  // pantalla
  ph.scrM.color.setScalar(1.18 * sc); ph.cardM.color.setScalar(1.18 * sc);
  const kb = nk >= 1 ? 1 : nk <= 0 ? 0 : 1 + 2.70158 * Math.pow(nk - 1, 3) + 1.70158 * Math.pow(nk - 1, 2);      // easeOutBack
  ph.card.position.y = ph.cardY + (1 - kb) * 0.022; ph.card.scale.setScalar(0.9 + 0.1 * kb); ph.cardM.opacity = clamp(nk * 3) * sc; ph.card.visible = nk > 0.001 && sc > 0.001;
  ph.glow.intensity = 0.012 * sc;
  ph.shine.material.opacity = 1;
  // vibración
  const P = U.phone; P.position.set(BEA_PH.x + Math.sin(t * 173) * 0.0011 * bz, BEA_PH.y + Math.abs(Math.sin(t * 211)) * 0.0004 * bz, BEA_PH.z + Math.sin(t * 157 + 1) * 0.0009 * bz);
  P.rotation.y = BEA_PH.yaw + Math.sin(t * 190) * 0.02 * bz;
  U.kiosk.userData.light.intensity = 5;
}
// el camino de la burbuja: sale del agua junto a la arqueta (con un saltito), sube por la arena y se mete en la pantalla del móvil
let _beaCurve = null;
function beaMsgPath(k) {
  const P = BEA_SCREEN;
  if (!_beaCurve) _beaCurve = new THREE.CatmullRomCurve3([v3(1.2, -0.35, CABLE_Z), v3(0.7, 0.55, CABLE_Z + 0.1), v3(0.05, 0.85, CABLE_Z + 0.2), v3(-0.9, 0.62, CABLE_Z + 0.5), v3(-2.3, 0.95, CABLE_Z + 1.2),
    v3(-3.9, 1.05, CABLE_Z + 2.0), v3(P.x + 0.75, P.y + 0.6, P.z + 0.35), v3(P.x + 0.18, P.y + 0.2, P.z + 0.05), v3(P.x, P.y + 0.012, P.z)], false, 'centripetal', 0.5);
  const u = clamp(k), s = u < 0.12 ? ss(u / 0.12) * 0.12 : u;                             // sale del agua despacio
  const pos = _beaCurve.getPointAt(clamp(s));
  pos.y += 0.25 * Math.sin(clamp((u - 0.1) / 0.18) * Math.PI) * (u > 0.1 && u < 0.28 ? 1 : 0);   // el saltito al salir del agua
  const scale = lerp(0.42, 0.55, _sm(0, 0.15, u)) * (1 - _sm(0.72, 1, u)) + 0.055 * _sm(0.72, 1, u);
  return { pos, scale };
}
