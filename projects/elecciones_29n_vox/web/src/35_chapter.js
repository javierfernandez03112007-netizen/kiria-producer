// ---------------------------------------------------------------- 29N · VOX (capítulo de un partido; misma plantilla que el del PSOE).
// Gancho: el libro gigante del programa, abierto y pasando páginas solo, encima de la pantalla del partido. La página de la derecha dice «IRPF más bajo
// según los hijos»… y la columna del cuánto son interrogaciones. La pantalla grande cuenta sus 66 páginas y no aparece; los «15 %» y «25 %» que circulan
// dan vueltas alrededor del libro y acaban pegados en OTRO documento, el de 2025. Después, sobre el atril de Vox, las medidas como objetos (a la izquierda)
// con su rótulo (a la derecha). Al final, la intriga del siguiente capítulo sobre el atril de ese partido.
const CH = { id: 'vox', next: 'fa' };
const BOOKP = [0.45, 3.52, -1.6];                     // encima de la pantalla del partido
const PAPER = '#f6f2e8';
// ---- páginas: texto genérico (titular y renglones) o la página de la promesa
function pageTex(n) { return signTex(512, 710, (c, w, h) => { c.fillStyle = PAPER; c.fillRect(0, 0, w, h); c.fillStyle = PARTY[CH.id].css; c.fillRect(44, 58, 190 + (n * 53) % 170, 24);
  c.fillStyle = '#bdb7aa'; for (let i = 0; i < 16; i++) c.fillRect(44, 126 + i * 33, (i % 5 === 4 ? 240 : 424) - ((n + i) * 37) % 60, 12);
  c.fillStyle = '#8b8577'; c.font = '700 26px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), w / 2, h - 34); }); }
function promiseTex() { return signTex(768, 1065, (c, w, h) => { c.fillStyle = PAPER; c.fillRect(0, 0, w, h); c.textBaseline = 'middle';
  c.fillStyle = PARTY[CH.id].css; c.fillRect(60, 70, 250, 44); c.fillStyle = '#ffffff'; c.font = '900 30px Inter'; c.textAlign = 'left'; c.fillText('IMPUESTOS', 76, 93);
  c.fillStyle = '#14161a'; c.font = '900 76px Inter'; c.fillText('IRPF MÁS BAJO', 60, 205); c.fillText('SEGÚN LOS HIJOS', 60, 295);
  c.fillStyle = '#bdb7aa'; for (let i = 0; i < 2; i++) c.fillRect(60, 372 + i * 34, 600 - i * 170, 13);
  ['SIN HIJOS', '1 HIJO', '2 HIJOS', '3 HIJOS'].forEach((s, i) => { const y = 520 + i * 118; c.fillStyle = '#e9e3d6'; c.fillRect(48, y - 50, w - 96, 100); c.fillStyle = '#14161a'; c.font = '900 58px Inter'; c.textAlign = 'left'; c.fillText(s, 76, y);
    if (!i) { c.fillStyle = '#6b7280'; c.textAlign = 'right'; c.fillText('IRPF', w - 76, y); } });
  c.fillStyle = '#8b8577'; c.font = '700 30px Inter'; c.textAlign = 'center'; c.fillText('·', w / 2, h - 44); }); }
// ---- el libro del programa: tapas del color del partido, dos bloques de hojas, la doble página abierta y seis hojas sueltas que pasan
function bigBook() { const g = new THREE.Group(), U = g.userData, PW = 0.62, PH = 0.86, A = 0.14; U.A = A; U.PW = PW; U.PH = PH;
  const cov = nightMat(new THREE.MeshStandardMaterial({ color: PARTY[CH.id].col, emissive: PARTY[CH.id].col, emissiveIntensity: 0.25, roughness: 0.6 }), 'pad'), pm = new THREE.MeshBasicMaterial({ color: 0xded8ca });
  const basic = (t, k = 1) => new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color().setScalar(k), side: THREE.DoubleSide, toneMapped: false });
  for (const sd of [-1, 1]) { const hf = new THREE.Group(); hf.rotation.y = -sd * A; g.add(hf);
    hf.add(box(PW + 0.03, PH + 0.05, 0.02, cov, sd * (PW + 0.03) / 2, 0, -0.03)); hf.add(box(PW - 0.01, PH - 0.02, 0.036, pm, sd * PW / 2, 0, -0.002));
    const top = new THREE.Mesh(new THREE.PlaneGeometry(PW - 0.02, PH - 0.03), basic(sd > 0 ? promiseTex() : pageTex(40), 0.9)); top.position.set(sd * PW / 2, 0, 0.018); hf.add(top); if (sd > 0) U.right = hf; }
  g.add(box(0.05, PH + 0.05, 0.03, cov, 0, 0, -0.04));                                                   // el lomo
  // las interrogaciones del «cuánto» (laten cuando se pregunta)
  U.q = [1, 2, 3].map(i => { const m = plate('−? %', 0.2, 0.085, { bg: 'rgba(0,0,0,0)', ink: '#0a7a3c' }); m.position.set(PW - 0.135, PH / 2 - PH * (520 + i * 118) / 1065, 0.024); U.right.add(m); return m; });
  // hojas que pasan (de la derecha a la izquierda, con la bisagra en el lomo)
  U.pages = []; for (let j = 0; j < 6; j++) { const pv = new THREE.Group(), m = new THREE.Mesh(new THREE.PlaneGeometry(PW - 0.03, PH - 0.04), basic(pageTex(7 + j * 9))); m.position.set((PW - 0.03) / 2 + 0.004, 0, 0); pv.add(m); pv.position.z = 0.02; pv.visible = false; g.add(pv); U.pages.push({ pv, m }); }
  shadowAll(g, false, false); return g; }
// las hojas pasan durante cada tramo [a, b): una empieza cada DT segundos y tarda D en cruzar
const FLIP = { DT: 0.085, D: 0.38 };
function flipSpans() { return [[-0.6, TL.irpf - 0.4], [TL.programa + 0.1, TL.paginas + 0.4], [END - 0.6, END + 1]]; }
function bookAt(t) { const B = S.book, U = B.userData, T = TL;
  U.pages.forEach((p, j) => { let u = -1; for (const [a, b] of flipSpans()) { const k = Math.floor((t - a - j * FLIP.DT) / (6 * FLIP.DT)); if (k < 0) continue; const s = a + (j + 6 * k) * FLIP.DT; if (s < b && t - s < FLIP.D) u = (t - s) / FLIP.D; }
    p.pv.visible = u >= 0; if (u >= 0) { const th = U.A + (Math.PI - 2 * U.A) * sm5(u); p.pv.rotation.y = -th; p.m.material.color.setScalar(0.78 + 0.22 * Math.abs(Math.cos(th))); } });
  const qk = 1 + 0.35 * bump(t, T.cuanto - 0.1, T.cuanto + 0.55, 0.15, 0.3) * (0.6 + 0.4 * Math.sin(t * 22)); U.q.forEach((m, i) => m.scale.setScalar(Math.max(0.001, pop(t, T.hijos - 0.15 + i * 0.1, 0.3)) * qk));
  { const ts = t > 30 ? t - END : t; B.rotation.z = 0.012 * Math.sin(ts * 0.9); B.position.y = BOOKP[1] + 0.03 * Math.sin(ts * 1.3); }      // vaivén: al final se cuenta desde END (bucle)
  const vis = clamp(1 - win(t, T.L[3] + 0.45, 0.4) + win(t, T.manda + 0.2, 0.45)); B.visible = vis > 0.01; B.scale.setScalar(Math.max(0.01, vis));
  // «el 15 y el 25 por ciento que circulan»: dos tarjetas dan vueltas alrededor del libro… y acaban en OTRO documento (el de 2025), que aparece a su izquierda
  const D = S.doc, dk = bump(t, T.otro - 0.2, T.L[3] + 0.35, 0.001, 0.25); D.visible = dk > 0.01; if (D.visible) D.scale.setScalar(Math.max(0.01, pop(t, T.otro - 0.2, 0.4)) * Math.min(1, dk * 1.2));
  S.cards.forEach((c, i) => { const t0 = (i ? T.veinticinco : T.quince) - 0.12, k = bump(t, t0, T.L[3] + 0.35, 0.001, 0.25); c.visible = k > 0.01; if (!c.visible) return;
    const th = 2.2 + i * Math.PI + 2.3 * (t - t0), ox = BOOKP[0] + 0.82 * Math.cos(th), oy = BOOKP[1] + 0.05 + 0.16 * Math.sin(th * 2 + i), oz = BOOKP[2] + 0.12 + 0.55 * Math.sin(th);
    const d = sm5(seg(t, T.documento - 0.05 + i * 0.12, T.documento + 0.5 + i * 0.12)), dx = DOCP[0] + 0.01, dy = DOCP[1] + 0.13 - i * 0.2, dz = DOCP[2] + 0.05;
    c.position.set(lerp(ox, dx, d), lerp(oy, dy, d), lerp(oz, dz, d)); c.rotation.set(0, lerp(0, 0.22, d), lerp(0.08 * Math.sin(t * 3 + i), 0, d)); c.scale.setScalar(Math.max(0.01, pop(t, t0, 0.3)) * Math.min(1, k * 1.2) * lerp(1, 0.78, d)); }); }
const DOCP = [BOOKP[0] - 1.02, BOOKP[1] - 0.08, BOOKP[2] + 0.25];
function buildHook(G) { S.book = bigBook(); S.book.position.set(...BOOKP); G.add(S.book); nightSrc(_v(BOOKP[0], BOOKP[1] + 0.5, BOOKP[2] + 1.8), 0xfff0dc, 7, 2.8, 'pad');
  const d = new THREE.Group(); d.position.set(...DOCP); d.rotation.y = 0.22; G.add(d); S.doc = d; d.add(box(0.44, 0.6, 0.03, new THREE.MeshBasicMaterial({ color: 0x9aa4ae }), 0, 0, -0.016));
  const cv = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.6), new THREE.MeshBasicMaterial({ map: signTex(512, 698, (c, w, h) => { c.fillStyle = '#dfe4ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#5b6672'; c.fillRect(0, 0, w, 90); c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 40px Inter'; c.fillText('OTRO DOCUMENTO', w / 2, 47);
    c.fillStyle = '#14161a'; c.font = '900 150px Inter'; c.fillText('2025', w / 2, h - 96); }), toneMapped: false })); d.add(cv);
  S.cards = ['15 %', '25 %'].map(s => { const m = plate(s, 0.34, 0.17, { bg: PAPER, ink: '#14161a', edge: '#8b8577' }); m.visible = false; G.add(m); return m; }); }
// ---- los objetos de las medidas, sobre el atril del partido (y la intriga, sobre el atril del siguiente)
function noSign(d) { const t = signTex(256, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#e4002b'; c.lineWidth = 34; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 22, 0, 7); c.stroke(); c.beginPath(); c.moveTo(w * 0.22, h * 0.22); c.lineTo(w * 0.78, h * 0.78); c.stroke(); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(d, d), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, alphaTest: 0.05 })); m.renderOrder = 6; return m; }
function buildProps(G) { const P = {}, id = CH.id, OX = -0.26, PX = 0.275, PW = 0.54, PH = 0.34, PY = 0.19, S3 = { sz: [0.4, 0.2, 0.17], ys: [0.28, 0.62, 0.84], nbig: 1 }, S3c = { sz: [0.26, 0.2, 0.2], ys: [0.24, 0.55, 0.8], nbig: 1 }, S2 = { sz: [0.34, 0.34], ys: [0.32, 0.71], nbig: 2 }, AMB = '#ffd66a';
  const g = new THREE.Group(); g.position.set(0, STAGE.Y, 0.02); S.lect[id].add(g); P.g = g;
  const grp = () => { const q = new THREE.Group(); q.visible = false; g.add(q); return q; }, pl = (txt, o = {}) => { const p = plate(txt, PW, PH, { edge: PARTY[id].css, ...o }); p.position.set(PX, PY, 0.1); return p; }, slab = (w, d) => box(w, 0.02, d, stdM(0x1a2230, 0.5), OX, 0.01, 0);
  const lit = (col, I = 0.5) => nightMat(new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: I, roughness: 0.5 }));
  const flat = (w, h, px, draw) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTex(px, Math.round(px * h / w), draw), transparent: true, toneMapped: false, alphaTest: 0.05 })); m.renderOrder = 5; return m; };
  P.tabs = ['VIVIENDA', 'INMIGRACIÓN', 'AYUDAS', 'SANIDAD'].map((s, n) => { const m = plate((n + 1) + ' · ' + s, 0.36, 0.075, { ink: '#ffb547' }); m.position.set(PX - PW / 2 + 0.18, PY + PH / 2 + 0.045, 0.1); m.visible = false; g.add(m); return m; });   // el tema, en ámbar (como en los subtítulos)
  // «trae ciento quince medidas»: el libro del programa, ya pequeño
  { const q = P.prog = grp(), bk = new THREE.Group(); bk.position.set(OX, 0.185, 0); bk.rotation.set(0.05, 0.25, 0); q.add(bk); P.book = bk; const cc = '#2f7d12'; bk.add(box(0.26, 0.35, 0.07, stdM(0x2f7d12, 0.5), 0, 0, 0)); bk.add(box(0.24, 0.33, 0.076, M.paper, 0.008, 0, 0));
    const cv = signPlane(0.26, 0.35, 512, (c, w, h) => { c.fillStyle = cc; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; fitFont(c, 'PROGRAMA', 900, 80, w - 60); c.fillText('PROGRAMA', w / 2, h * 0.2); fitFont(c, PARTY[id].sig, 900, 150, w - 60); c.fillText(PARTY[id].sig, w / 2, h * 0.5); c.font = '700 44px Inter'; c.fillText('29N · 2026', w / 2, h * 0.78); }, { r: 0.5 }); cv.position.z = 0.039; bk.add(cv);
    q.add(pl(['115', 'MEDIDAS', '66 PÁGINAS'], S3)); }
  // «cuatro que te tocan»
  { const q = P.tiles = grp(); P.tile = [1, 2, 3, 4].map(n => { const m = plate(String(n), 0.22, 0.22, { edge: PARTY[id].css }); m.position.set(-0.39 + (n - 1) * 0.26, 0.17, 0.08); q.add(m); return m; }); }
  // 1 · vivienda: IVA cero al comprar la primera casa (la etiqueta «IVA 10 %» pasa a «0 %»), si es nueva y la compra una familia española
  { const q = P.viv = grp(); q.add(slab(0.5, 0.2)); P.hs = miniHouse(0xf2efe8, 0xb8452f, 1.25); P.hs.position.set(OX - 0.06, 0.02, 0); q.add(P.hs);
    P.iva10 = badge('10 %', 0.17, '#8a93a6', '#ffffff'); P.iva0 = badge('0 %', 0.19, AMB, '#12100a'); for (const b of [P.iva10, P.iva0]) { b.position.set(OX + 0.17, 0.27, 0.1); q.add(b); }
    P.ivaL = plate('IVA', 0.13, 0.06, {}); P.ivaL.position.set(OX + 0.17, 0.39, 0.1); q.add(P.ivaL); P.nueva = plate('OBRA NUEVA', 0.26, 0.065, { ink: AMB }); P.nueva.position.set(OX + 0.01, 0.055, 0.16); q.add(P.nueva);
    P.vA = pl(['IVA 0 %', 'PRIMERA CASA'], { sz: [0.4, 0.24], ys: [0.34, 0.72], nbig: 1 }); q.add(P.vA); P.vB = pl(['IVA 0 %', 'PRIMERA CASA', 'NUEVA · FAMILIA ESPAÑOLA'], S3); q.add(P.vB); }
  // 2 · inmigración: prohibir las regularizaciones masivas (papeles con la señal de prohibido) y repatriar a quien esté en situación irregular (un avión que despega)
  { const q = P.inm = grp(); q.add(slab(0.5, 0.2)); const pp = new THREE.Group(); pp.position.set(OX - 0.07, 0.185, 0); q.add(pp); P.papers = pp;
    for (let i = 2; i >= 0; i--) { const s = flat(0.23, 0.31, 384, (c, w, h) => { c.fillStyle = i ? '#e6e1d4' : PAPER; c.fillRect(0, 0, w, h); c.strokeStyle = '#c9c2b2'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); if (i) return;
        c.fillStyle = '#14161a'; c.textAlign = 'center'; c.textBaseline = 'middle'; fitFont(c, 'REGULARIZACIÓN', 900, 44, w - 44); c.fillText('REGULARIZACIÓN', w / 2, 62); fitFont(c, 'MASIVA', 900, 60, w - 44); c.fillText('MASIVA', w / 2, 122); c.fillStyle = '#bdb7aa'; for (let k = 0; k < 9; k++) c.fillRect(34, 190 + k * 32, (k % 4 === 3 ? 180 : 316) - (k * 37) % 50, 12); });
      s.position.set(i * 0.022, i * 0.012, -i * 0.012); s.rotation.z = (i - 1) * 0.05 + 0.03; pp.add(s); }
    P.no = noSign(0.3); P.no.position.set(OX - 0.07, 0.19, 0.06); q.add(P.no);
    const pn = new THREE.Group(); q.add(pn); P.plane = pn; const wm = lit(0xeef2f6, 0.55); const fu = cyl(0.024, 0.024, 0.2, wm, 14); fu.rotation.z = Math.PI / 2; pn.add(fu); const ns = sph(0.024, wm, 12, 10); ns.position.x = -0.1; ns.scale.x = 1.6; pn.add(ns);
    pn.add(box(0.06, 0.007, 0.24, wm, 0.0, -0.004, 0)); pn.add(box(0.035, 0.006, 0.09, wm, 0.09, 0.004, 0)); const fin = box(0.04, 0.055, 0.006, wm, 0.085, 0.03, 0); fin.rotation.z = -0.35; pn.add(fin); shadowAll(pn, false, false);
    P.iA = pl(['PROHIBIR', 'REGULARIZACIONES', 'MASIVAS'], S3c); q.add(P.iA); P.iB = pl(['REPATRIAR', 'A QUIEN ESTÉ EN', 'SITUACIÓN IRREGULAR'], S3c); q.add(P.iB); }
  // 3 · ayudas: prioridad nacional (el «1.º») en vivienda pública (casa), guarderías (cubos) y ayudas sociales (moneda)
  { const q = P.ayu = grp(); q.add(slab(0.5, 0.2)); P.first = badge('1.º', 0.2, AMB, '#12100a'); P.first.position.set(OX - 0.15, 0.25, 0.1); q.add(P.first); P.pod = box(0.2, 0.11, 0.14, lit(0xdfe5ee, 0.35), OX - 0.15, 0.075, 0); q.add(P.pod);
    P.it = []; { const h = miniHouse(0xf2efe8, 0x4a78b8, 0.62); h.position.set(OX + 0.0, 0.02, 0.02); q.add(h); P.it.push(h); }
    { const b = box(0.085, 0.085, 0.085, stdM(0x58b368, 0.6), OX + 0.115, 0.063, 0.02); const l = plate('A', 0.075, 0.075, { bg: 'rgba(0,0,0,0)' }); l.position.z = 0.044; b.add(l); q.add(b); P.it.push(b); }
    { const cn = new THREE.Group(); cn.position.set(OX + 0.215, 0.085, 0.02); const c = cyl(0.062, 0.062, 0.022, lit(0xc9962e, 0.4), 28); c.rotation.x = Math.PI / 2; cn.add(c); const b = badge('€', 0.125, '#f0c648', '#5a3d08'); b.position.z = 0.0125; cn.add(b); q.add(cn); P.it.push(cn); }
    P.aA = pl(['PRIORIDAD', 'NACIONAL'], S2); q.add(P.aA); P.aB = pl(['ESPAÑOLES, PRIMERO', 'VIVIENDA PÚBLICA,', 'GUARDERÍAS Y AYUDAS'], S3c); q.add(P.aB); }
  // 4 · sanidad: tarjeta sanitaria única; para extranjeros sin residencia legal, solo urgencias graves (el rótulo de urgencias)
  { const q = P.san = grp(); q.add(slab(0.5, 0.2)); P.card = flat(0.36, 0.228, 640, (c, w, h) => { c.clearRect(0, 0, w, h); const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#f4f8fb'); gr.addColorStop(1, '#bfe3ea'); c.fillStyle = gr; rr(c, 4, 4, w - 8, h - 8, 34); c.fill(); c.strokeStyle = '#7fb6c2'; c.lineWidth = 8; rr(c, 8, 8, w - 16, h - 16, 30); c.stroke();
      c.fillStyle = '#0f8a9c'; c.fillRect(56, 60, 34, 110); c.fillRect(18, 98, 110, 34); c.fillStyle = '#14161a'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = '900 50px Inter'; c.fillText('TARJETA', 160, 86); c.fillText('SANITARIA', 160, 146); c.fillStyle = '#0f8a9c'; c.font = '900 84px Inter'; c.fillText('ÚNICA', 160, 250);
      c.fillStyle = '#d9b24a'; rr(c, 40, 250, 96, 74, 12); c.fill(); c.fillStyle = '#bdb7aa'; c.fillRect(40, 352, 380, 14); });
    P.card.position.set(OX + 0.01, 0.2, 0.04); P.card.rotation.set(-0.05, 0.12, -0.05); q.add(P.card);
    const ur = new THREE.Group(); ur.position.set(OX + 0.01, 0.17, 0.02); q.add(ur); P.urg = ur; P.urgM = new THREE.MeshStandardMaterial({ color: 0xd81e2c, emissive: 0xd81e2c, emissiveIntensity: 0.6, roughness: 0.5 }); ur.add(box(0.4, 0.2, 0.04, P.urgM, 0, 0, -0.022));
    ur.add(flat(0.4, 0.2, 640, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#d81e2c'; rr(c, 0, 0, w, h, 26); c.fill(); c.fillStyle = '#ffffff'; c.fillRect(54, 96, 124, 44); c.fillRect(94, 56, 44, 124); c.textAlign = 'left'; c.textBaseline = 'middle'; fitFont(c, 'URGENCIAS', 900, 86, w - 260); c.fillText('URGENCIAS', 220, 122); c.font = '900 40px Inter'; c.fillText('GRAVES', 222, 196); }));
    P.sA = pl(['TARJETA SANITARIA', 'ÚNICA'], { sz: [0.25, 0.4], ys: [0.3, 0.7], nbig: 2 }); q.add(P.sA); P.sB = pl(['SIN RESIDENCIA LEGAL', 'SOLO', 'URGENCIAS GRAVES'], { sz: [0.21, 0.2, 0.25], ys: [0.22, 0.5, 0.79], nbig: 1 }); q.add(P.sB); }
  // «¿y con qué dinero?»: recortando el gasto que llama superfluo e ideológico (unas tijeras cortan un trozo de la barra del gasto: «?»)
  { const q = P.tax = grp(); q.add(slab(0.52, 0.2)); P.coin = new THREE.Group(); P.coin.position.set(OX, 0.2, 0); q.add(P.coin); { const c = cyl(0.13, 0.13, 0.03, lit(0xc9962e, 0.4), 40); c.rotation.x = Math.PI / 2; P.coin.add(c); P.coinF = [-1, 1].map(sz => { const b = badge('€', 0.262, '#f0c648', '#5a3d08'); b.position.z = sz * 0.0165; b.rotation.y = sz < 0 ? Math.PI : 0; P.coin.add(b); return b; }); }
    const cut = new THREE.Group(); q.add(cut); P.cut = cut; P.barA = box(0.3, 0.1, 0.06, lit(0x8a93a6, 0.35), OX - 0.09, 0.1, 0); cut.add(P.barA); P.barB = box(0.15, 0.1, 0.06, lit(0xffb547, 0.5), OX + 0.145, 0.1, 0); cut.add(P.barB);
    const gl = plate('GASTO', 0.2, 0.065, {}); gl.position.set(OX - 0.09, 0.1, 0.04); cut.add(gl); P.barQ = plate('?', 0.09, 0.085, { bg: 'rgba(0,0,0,0)', ink: '#12100a' }); P.barQ.position.set(0, 0, 0.034); P.barB.add(P.barQ);
    const sc = new THREE.Group(); sc.position.set(OX + 0.065, 0.3, 0.03); sc.scale.setScalar(1.5); cut.add(sc); P.sc = sc; P.blade = [-1, 1].map(sd => { const b = new THREE.Group(); const bl = box(0.014, 0.17, 0.006, M.steel, 0, -0.07, sd * 0.004); b.add(bl); const hd = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 20), lit(0xd81e2c, 0.5)); hd.position.set(sd * 0.012, 0.05, 0); b.add(hd); sc.add(b); return b; }); shadowAll(sc, false, false);
    P.t0 = pl(['¿Y CON QUÉ', 'DINERO?'], { sz: [0.3, 0.36], ys: [0.33, 0.68], nbig: 2 }); q.add(P.t0); P.t1 = pl(['RECORTAR GASTO', '«SUPERFLUO', 'E IDEOLÓGICO»'], S3c); q.add(P.t1); P.t2 = pl(['¿CUÁNTO?', 'TAMPOCO', 'LO DICE'], { sz: [0.36, 0.2, 0.2], ys: [0.27, 0.6, 0.82], nbig: 1, ink: AMB }); q.add(P.t2); }
  // la intriga del siguiente capítulo, sobre SU atril: que nadie herede más de 10 millones (un montón de lingotes con la raya del tope; lo que pasa de ahí, «?»)
  { const L2 = S.lect[CH.next], gg = new THREE.Group(); gg.position.set(0, STAGE.Y, 0.02); L2.add(gg); const q = P.nx = new THREE.Group(); q.visible = false; gg.add(q); q.add(slab(0.5, 0.14));
    P.overM = new THREE.MeshStandardMaterial({ color: 0xffb547, emissive: 0xffb547, emissiveIntensity: 0.6, roughness: 0.5 }); P.bars = []; for (let i = 0; i < 9; i++) { const over = i >= 6, b = box(0.2, 0.034, 0.1, over ? P.overM : lit(0xd9a93a, 0.4), OX - 0.02, 0.04 + i * 0.038, 0); q.add(b); P.bars.push(b); }
    P.lim = box(0.42, 0.007, 0.012, nightMat(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffffff, emissiveIntensity: 2.2 })), OX - 0.02, 0.04 + 6 * 0.038 - 0.019, 0.06); q.add(P.lim);
    P.limL = plate('10 M €', 0.2, 0.065, {}); P.limL.position.set(OX + 0.13, 0.21, 0.08); q.add(P.limL); P.over = badge('?', 0.15, AMB, '#12100a'); P.over.position.set(OX + 0.14, 0.34, 0.1); q.add(P.over);
    const p = plate(['HERENCIAS', 'TOPE: 10 MILLONES', '¿Y LO QUE PASE?'], PW, PH, { edge: PARTY[CH.next].css, sz: [0.3, 0.2, 0.26], ys: [0.23, 0.52, 0.8], nbig: 1 }); p.position.set(PX, PY, 0.1); q.add(p); P.np = p; }
  return P; }
// brillo de cada pantalla: la del capítulo, encendida; las demás, en penumbra; en la intriga se enciende la del siguiente
function teaserK(t) { return bump(t, TL.frente - 0.35, TL.L[10] + 0.3, 0.35, 0.4); }
function totK(o, t) { const k = teaserK(t); return o === CH.id ? 1 - 0.55 * k : o === CH.next ? 0.3 + 0.7 * k : 0.3; }
function chapterAt(t, st) { const P = S.P, T = TL, id = CH.id;
  for (const o of ORDER) S.tot[o].mat.color.setScalar(SCREEN_I * totK(o, t));
  S.dims.forEach(d => { d.userData.pl.emissiveIntensity = 0; d.userData.tm.color.setScalar(0.1); });
  bookAt(t);
  // la pantalla grande: cuenta las 66 páginas y da el resultado; al final, el aviso del siguiente capítulo
  { const q2 = x => Math.round(x * 20) / 20, n = Math.max(1, Math.round(66 * seg(t, T.programa + 0.1, T.paginas + 0.35))), verdict = t > T.no - 0.12;
    wallDraw({ band: ORDER.map(o => q2(0.25 + 0.65 * (totK(o, t) - 0.3) / 0.7)), pill: verdict ? '66 PÁGINAS · NO LO DICE' : 'PÁGINA ' + n + ' DE 66', pillC: verdict ? '#ffb547' : '#eef2fc',
      pillA: q2(win(t, T.programa - 0.1, 0.3) * (1 - win(t, T.quince - 0.4, 0.3))), next: q2(bump(t, T.proximo + 0.12, T.frente + 0.75, 0.3, 0.3)) }); }
  // los objetos (cada uno aparece con su palabra)
  const vis = (g, a, b) => { const k = bump(t, a, b, 0.001, 0.2); g.visible = k > 0.01; if (g.visible) g.scale.setScalar(Math.max(0.01, pop(t, a, 0.4)) * Math.min(1, k * 1.2)); return g.visible; }, ps = (o, t0, d = 0.35, s = 1) => o.scale.setScalar(Math.max(0.001, pop(t, t0, d)) * s);
  const sw = (a, b, t0) => { const f = t > t0; a.visible = !f; b.visible = f; ps(b, t0); };
  P.tabs.forEach((m, n) => { const a = T.L[4 + n] - 0.05, k = bump(t, a, T.L[5 + n] - 0.22, 0.001, 0.2); m.visible = k > 0.01; if (m.visible) m.scale.setScalar(Math.max(0.01, pop(t, a, 0.35)) * Math.min(1, k * 1.2)); });
  if (vis(P.prog, T.ciento - 0.12, T.cuatro - 0.12)) P.book.rotation.y = 0.25 + 0.08 * Math.sin(t * 1.4);
  if (vis(P.tiles, T.cuatro - 0.08, T.L[4] - 0.3)) P.tile.forEach((m, i) => ps(m, T.cuatro - 0.05 + i * 0.1, 0.3));
  if (vis(P.viv, T.L[4] - 0.08, T.L[5] - 0.22)) { ps(P.hs, T.L[4] + 0.05); ps(P.ivaL, T.iva - 0.08); sw(P.iva10, P.iva0, T.cero - 0.05); ps(P.iva10, T.iva - 0.08); sw(P.vA, P.vB, T.nueva - 0.1); ps(P.vA, T.iva - 0.08); ps(P.nueva, T.nueva - 0.1); P.hs.rotation.y = 0.25 + 0.12 * Math.sin(t * 1.3); }
  if (vis(P.inm, T.L[5] - 0.08, T.L[6] - 0.22)) { ps(P.papers, T.L[5] + 0.05); ps(P.no, T.prohibir - 0.06, 0.28); const f = t > T.repatriar - 0.1; P.iA.visible = !f; P.iB.visible = f; ps(P.iA, T.prohibir - 0.08); ps(P.iB, T.repatriar - 0.1);
    const k = seg(t, T.repatriar - 0.05, T.repatriar + 2.2), e = sm5(k); P.plane.visible = k > 0 && k < 1; P.plane.position.set(lerp(-0.02, -0.5, e) + OXK, lerp(0.1, 0.5, e * e), 0.1); P.plane.rotation.z = -0.1 - 0.35 * e; P.plane.scale.setScalar(Math.max(0.01, pop(t, T.repatriar - 0.05, 0.3)) * (1 - 0.5 * win(t, T.repatriar + 1.7, 0.5))); }
  if (vis(P.ayu, T.L[6] - 0.08, T.L[7] - 0.22)) { sw(P.aA, P.aB, T.espanoles - 0.1); ps(P.aA, T.prioridad - 0.08); ps(P.pod, T.prioridad - 0.08); ps(P.first, T.primero - 0.1);
    [T.vivienda6, T.guarderias, T.sociales - 0.25].forEach((tt, i) => ps(P.it[i], tt - 0.08)); P.it[2].rotation.y = 0.5 * Math.sin(t * 2); }
  if (vis(P.san, T.L[7] - 0.08, T.L[8] - 0.22)) { const f = t > T.extranjeros - 0.1, f2 = t > T.solo - 0.12; P.card.visible = !f2; P.urg.visible = f2; ps(P.card, T.tarjeta - 0.08); ps(P.urg, T.solo - 0.12); P.sA.visible = !f; P.sB.visible = f; ps(P.sA, T.tarjeta - 0.08); ps(P.sB, T.extranjeros - 0.1);
    P.card.rotation.y = 0.12 + 0.1 * Math.sin(t * 1.5); P.urgM.emissiveIntensity = 0.45 + 0.3 * (0.5 + 0.5 * Math.sin(t * 9)); }
  if (vis(P.tax, T.L[8] - 0.08, T.L[9] - 0.25)) { const f = t > T.recortando - 0.1, f2 = t > T.cuanto8 - 0.08; P.t0.visible = !f; P.t1.visible = f && !f2; P.t2.visible = f2; ps(P.t1, T.recortando - 0.1); ps(P.t2, T.cuanto8 - 0.08);
    { const ck = 1 - win(t, T.recortando - 0.12, 0.2), a = t * 2.4; P.coin.visible = ck > 0.02; P.coin.scale.setScalar(Math.max(0.01, ck)); P.coin.rotation.y = a; P.coinF.forEach(b => b.material.color.setScalar(0.62 + 0.38 * Math.abs(Math.cos(a)))); }
    P.cut.visible = f; if (f) { P.cut.scale.setScalar(Math.max(0.01, pop(t, T.recortando - 0.1, 0.35))); const c = sm5(seg(t, T.gasto + 0.15, T.gasto + 0.75)); P.barB.position.set(OXK + 0.145 + 0.035 * c, 0.1 - 0.035 * c, 0); P.barB.rotation.z = -0.22 * c;
      const sn = Math.abs(Math.sin((t - T.recortando) * 9)) * (1 - win(t, T.gasto + 0.5, 0.3)); P.blade.forEach((b, i) => { b.rotation.z = (i ? 1 : -1) * (0.08 + 0.3 * sn); }); P.sc.position.y = 0.3 - 0.035 * seg(t, T.recortando, T.gasto + 0.4); ps(P.barQ, T.cuanto8 - 0.08); } }
  if (vis(P.nx, T.frente + 0.55, T.L[10] + 0.2)) { P.bars.forEach((b, i) => ps(b, T.nadie - 0.2 + i * 0.05, 0.25)); ps(P.np, T.nadie - 0.2); ps(P.lim, T.diez - 0.1); ps(P.limL, T.diez - 0.1); ps(P.over, T.pase - 0.25);
    P.overM.emissiveIntensity = t > T.pase - 0.25 ? 0.6 * (0.6 + 0.4 * Math.sin(t * 10)) : 0.6; }
}
const OXK = -0.26;
