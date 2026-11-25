// ---------------------------------------------------------------- 29N · EL PP (capítulo de un partido; misma plantilla que los del PSOE y Vox).
// Gancho: una nómina gigante encima de la pantalla del partido: la rueda del IRPF gira y se para en «0» (primer año de trabajo). «La letra pequeña»: una
// lupa baja al pie de la nómina («de 18 a 35 años») y a su derecha crecen cuatro barras: la rebaja de cada año (100, 75, 50 y 25 %). Después, sobre el
// atril del PP, las medidas como objetos (a la izquierda) con su rótulo (a la derecha). Al final, la intriga del siguiente capítulo sobre el atril de ese
// partido (el candado de las pensiones, con las cifras girando).
const CH = { id: 'pp', next: 'psoe' };
const HP = [-1.72, 3.55, -1.6];                       // la nómina, encima de la pantalla del partido
const PAPER = '#f6f2e8', ROWY = 0.06;                 // altura de la fila del IRPF dentro de la nómina
// ---- el candado de combinación: cuerpo de latón con el rótulo, tres cifras que ruedan (tira de 0 a 9 que se desliza) y un arco que intenta cerrar
function digitStrip() { return signTex(128, 11 * 176, (c, w, h) => { c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 150px Inter';
  for (let k = 0; k <= 10; k++) { c.fillStyle = '#14161a'; c.fillText(String(k % 10), w / 2, k * 176 + 94); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, k * 176, w, 4); } }); }
function padlock() { const g = new THREE.Group(), U = g.userData, BW = 0.9, BH = 0.7, BD = 0.22; U.BH = BH;
  g.add(box(BW, BH, BD, M.brass, 0, 0, 0));
  const face = signPlane(BW - 0.04, BH - 0.04, 1024, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#dcb96e'); gr.addColorStop(1, '#a9843e'); c.fillStyle = gr; rr(c, 0, 0, w, h, 40); c.fill();
    c.fillStyle = '#2a1e08'; c.textAlign = 'center'; c.textBaseline = 'middle'; fitFont(c, 'PENSIONES', 900, 124, w - 120); c.fillText('PENSIONES', w / 2, h * 0.14); fitFont(c, 'EN LA CONSTITUCIÓN', 900, 60, w - 120); c.fillText('EN LA CONSTITUCIÓN', w / 2, h * 0.27);
    c.fillStyle = '#17120a'; rr(c, w * 0.12, h * 0.36, w * 0.76, h * 0.44, 26); c.fill();
    c.fillStyle = '#2a1e08'; fitFont(c, 'DIPUTADOS', 900, 64, w - 120); c.fillText('DIPUTADOS', w / 2, h * 0.905); }, { r: 0.4 });
  face.position.z = BD / 2 + 0.002; g.add(face);
  U.dig = []; const strip = digitStrip(); for (let i = 0; i < 3; i++) { const t = strip.clone(); t.needsUpdate = true; t.repeat.set(1, 1 / 11); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.26), new THREE.MeshBasicMaterial({ map: t })); m.position.set(-0.215 + i * 0.215, -0.053, BD / 2 + 0.004); g.add(m); U.dig.push(t); }
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.27), new THREE.MeshBasicMaterial({ map: signTex(64, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0.8)'); gr.addColorStop(0.28, 'rgba(0,0,0,0)'); gr.addColorStop(0.72, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.8)'); c.clearRect(0, 0, w, h); c.fillStyle = gr; c.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false })); shade.position.set(0, -0.053, BD / 2 + 0.006); shade.renderOrder = 6; g.add(shade);
  U.sh = new THREE.Group(); U.sh.position.set(0.26, BH / 2, 0); g.add(U.sh);                                    // el arco gira sobre su pata derecha
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.055, 14, 40, Math.PI), M.steel); arc.position.set(-0.26, 0.2, 0); arc.castShadow = true; U.sh.add(arc);
  ad(U.sh, cyl(0.055, 0.055, 0.5, M.steel, 16)).position.set(0, -0.05, 0); ad(U.sh, cyl(0.055, 0.055, 0.22, M.steel, 16)).position.set(-0.52, 0.09, 0);
  for (const sx of [-1, 1]) g.add(box(0.14, 0.03, BD + 0.02, M.dsteel, sx * 0.26, BH / 2 + 0.012, 0));                    // casquillos por donde entra el arco
  shadowAll(g, true, true); return g; }
// ---- la nómina: cabecera del color del partido, filas grises y la fila del IRPF con una rueda de cifras; al pie, la letra pequeña
function payslip() { const g = new THREE.Group(), U = g.userData, PW = 0.92, PH = 1.28; U.PW = PW; U.PH = PH;
  g.add(box(PW + 0.03, PH + 0.03, 0.02, new THREE.MeshBasicMaterial({ color: 0xcfc9bb }), 0, 0, -0.012));
  const tex = signTex(920, 1280, (c, w, h) => { c.fillStyle = PAPER; c.fillRect(0, 0, w, h); c.fillStyle = PARTY[CH.id].css; c.fillRect(0, 0, w, 150); c.textBaseline = 'middle'; c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.font = '900 84px Inter'; c.fillText('NÓMINA', 56, 80);
    c.textAlign = 'right'; c.font = '900 38px Inter'; c.fillText('PRIMER AÑO', w - 56, 56); c.fillText('DE TRABAJO', w - 56, 104);
    const row = (y, lab, wd) => { c.fillStyle = '#14161a'; c.textAlign = 'left'; c.font = '900 44px Inter'; c.fillText(lab, 56, y); c.fillStyle = '#c4beb1'; c.fillRect(w - 56 - wd, y - 12, wd, 24); c.fillStyle = '#e4dfd3'; c.fillRect(56, y + 44, w - 112, 4); };
    row(250, 'SALARIO', 250); row(360, 'SEG. SOCIAL', 150);
    c.fillStyle = '#fff3c4'; c.fillRect(30, 500, w - 60, 200); c.strokeStyle = '#d9a93a'; c.lineWidth = 8; c.strokeRect(30, 500, w - 60, 200); c.fillStyle = '#14161a'; c.textAlign = 'left'; c.font = '900 120px Inter'; c.fillText('IRPF', 64, 604);
    c.fillStyle = '#14161a'; c.textAlign = 'right'; c.fillText('€', w - 64, 604);
    row(800, 'A PERCIBIR', 320); c.fillStyle = '#bdb7aa'; for (let i = 0; i < 4; i++) c.fillRect(56, 930 + i * 40, (i === 3 ? 380 : 808) - (i * 67) % 90, 14);
    c.fillStyle = '#8b8577'; for (let i = 0; i < 3; i++) c.fillRect(56, 1150 + i * 26, 620 - i * 110, 7); });        // la letra pequeña (ilegible hasta que llega la lupa)
  const face = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); g.add(face); U.face = face;
  // la rueda de cifras del IRPF (una tira de 0 a 9 que se desliza)
  const st = digitStrip(); st.repeat.set(1, 1 / 11); U.dig = st; const wm = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.17), new THREE.MeshBasicMaterial({ map: st, toneMapped: false })); wm.position.set(0.17, ROWY, 0.004); g.add(wm);
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.19), new THREE.MeshBasicMaterial({ color: 0x14161a })); fr.position.set(0.17, ROWY, 0.002); g.add(fr);
  U.stamp = plate(['PROMESA', 'DEL ' + PARTY[CH.id].sig], 0.4, 0.2, { edge: PARTY[CH.id].css, sz: [0.3, 0.38], ys: [0.3, 0.7], nbig: 2 }); U.stamp.position.set(0.22, -0.3, 0.03); U.stamp.rotation.z = -0.1; g.add(U.stamp);
  // la lupa: aro, mango y, dentro, la letra pequeña ya legible
  const lu = new THREE.Group(); g.add(lu); U.lupa = lu; const rm = new THREE.MeshBasicMaterial({ color: 0x2a3140 }); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.022, 12, 48), rm); lu.add(ring);
  const hd = box(0.05, 0.3, 0.03, rm, 0.25, -0.31, 0); hd.rotation.z = 0.7; lu.add(hd); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.232, 48), new THREE.MeshBasicMaterial({ color: 0xfbf8ef, toneMapped: false })); lens.position.z = -0.004; lu.add(lens);
  U.small = plate(['DE 18 A 35', 'AÑOS'], 0.4, 0.22, { bg: 'rgba(0,0,0,0)', ink: '#14161a', sz: [0.42, 0.42], ys: [0.3, 0.74], nbig: 2 }); U.small.position.z = 0.004; lu.add(U.small); lu.position.z = 0.06;
  shadowAll(g, false, false); return g; }
// la rueda: gira al empezar, se para en 0 al decir «cero» y al final vuelve a girar hasta quedar como en el primer fotograma (bucle)
function wheelAt(t) { const rate = 9, base = 3.3, a = TL.cero + 0.3, c = TL.L[10] + 0.5;
  const pre = tt => { if (tt < a - 0.8) return base + rate * tt; const v0 = base + rate * (a - 0.8), land = 10 * Math.ceil((v0 + rate * 0.3) / 10), u = clamp((tt - (a - 0.8)) / 0.8); return lerp(v0, land, 1 - Math.pow(1 - u, 3)); };
  if (t < c) return ((pre(Math.min(t, a)) % 10) + 10) % 10;
  const V0 = ((pre(0) % 10) + 10) % 10, u = clamp((t - c) / (END - c)); return ((V0 + 20) * u * u) % 10; }
const BARS = [1, 0.75, 0.5, 0.25];
function buildHook(G) { S.pay = payslip(); S.pay.position.set(...HP); G.add(S.pay); nightSrc(_v(HP[0], HP[1] + 0.5, HP[2] + 1.8), 0xfff0dc, 7, 2.8, 'pad');
  // las cuatro barras de la rebaja (año 1: 100 %; año 2: 75 %; año 3: 50 %; año 4: 25 %), a la derecha de la nómina
  const bg = new THREE.Group(); bg.position.set(HP[0] + 0.74, HP[1] - 0.58, HP[2]); G.add(bg); S.bars = bg; S.bar = BARS.map((k, i) => { const q = new THREE.Group(); q.position.x = i * 0.37; bg.add(q); const h = 1.15 * k;
    const m = new THREE.MeshBasicMaterial({ color: i ? 0x5cf2e6 : 0xffd66a, toneMapped: false }); const b = box(0.29, h, 0.1, m, 0, h / 2, 0); q.add(b);
    const top = plate(['100 %', '75 %', '50 %', '25 %'][i], 0.34, 0.13, { ink: i ? '#5cf2e6' : '#ffd66a' }); top.position.set(0, h + 0.1, 0.06); q.add(top); const lab = plate('AÑO ' + (i + 1), 0.33, 0.1, {}); lab.position.set(0, -0.08, 0.06); q.add(lab); return q; });
  S.barT = plate('REBAJA DEL IRPF', 0.9, 0.13, { ink: '#ffb547' }); S.barT.position.set(0.555, 1.55, 0.06); bg.add(S.barT); shadowAll(bg, false, false); }
function hookAt(t) { const T = TL, P = S.pay, U = P.userData; U.dig.offset.y = 1 - (wheelAt(t) + 1) / 11;
  P.rotation.z = 0.012 * Math.sin(t * 0.9); P.position.y = HP[1] + 0.03 * Math.sin(t * 1.3);
  const vis = clamp(1 - win(t, T.L[3] + 0.45, 0.4) + win(t, T.manda + 0.2, 0.45)); P.visible = vis > 0.01; P.scale.setScalar(Math.max(0.01, vis));
  U.stamp.scale.setScalar(Math.max(0.001, pop(t, T.promesa - 0.1, 0.35) * (1 - win(t, T.L[3] + 0.3, 0.3))));
  // la lupa entra desde la derecha y se queda sobre la letra pequeña del pie
  const lk = bump(t, T.letra - 0.15, T.L[3] + 0.35, 0.001, 0.25), e = sm5(seg(t, T.letra - 0.15, T.letra + 0.5)); U.lupa.visible = lk > 0.01; U.lupa.position.set(lerp(0.95, -0.08, e), lerp(-0.2, -0.47, e), 0.06); U.lupa.scale.setScalar(Math.min(1, lk * 1.2)); U.small.scale.setScalar(Math.max(0.001, pop(t, T.dieciocho - 0.12, 0.35)));
  const bk = bump(t, T.baja - 0.2, T.L[3] + 0.35, 0.001, 0.25); S.bars.visible = bk > 0.01; if (S.bars.visible) { S.bars.scale.setScalar(Math.min(1, bk * 1.2)); const ts = [T.baja - 0.12, T.setenta - 0.12, T.mitad - 0.12, T.veinticinco - 0.12]; S.bar.forEach((q, i) => { const k = pop(t, ts[i], 0.4); q.scale.set(1, Math.max(0.001, k), 1); q.visible = t > ts[i]; }); S.barT.scale.setScalar(Math.max(0.001, pop(t, T.baja - 0.12, 0.35))); } }
// ---- los objetos de las medidas, sobre el atril del partido (y la intriga, sobre el atril del siguiente)
function buildProps(G) { const P = {}, id = CH.id, OX = -0.26, PX = 0.275, PW = 0.54, PH = 0.34, PY = 0.19, S3 = { sz: [0.4, 0.2, 0.17], ys: [0.28, 0.62, 0.84], nbig: 1 }, S3c = { sz: [0.26, 0.2, 0.2], ys: [0.24, 0.55, 0.8], nbig: 1 }, S2 = { sz: [0.34, 0.34], ys: [0.32, 0.71], nbig: 2 }, AMB = '#ffd66a';
  const g = new THREE.Group(); g.position.set(0, STAGE.Y, 0.02); S.lect[id].add(g); P.g = g;
  const grp = () => { const q = new THREE.Group(); q.visible = false; g.add(q); return q; }, pl = (txt, o = {}) => { const p = plate(txt, PW, PH, { edge: PARTY[id].css, ...o }); p.position.set(PX, PY, 0.1); return p; }, slab = (w, d) => box(w, 0.02, d, stdM(0x1a2230, 0.5), OX, 0.01, 0);
  const lit = (col, I = 0.5) => nightMat(new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: I, roughness: 0.5 }));
  P.tabs = ['VIVIENDA', 'LA COMPRA', 'PENSIONES', 'INMIGRACIÓN'].map((s, n) => { const m = plate((n + 1) + ' · ' + s, 0.36, 0.075, { ink: '#ffb547' }); m.position.set(PX - PW / 2 + 0.18, PY + PH / 2 + 0.045, 0.1); m.visible = false; g.add(m); return m; });   // el tema, en ámbar (como en los subtítulos)
  // «trae doscientas cuarenta y nueve medidas»: el libro del programa
  { const q = P.prog = grp(), bk = new THREE.Group(); bk.position.set(OX, 0.185, 0); bk.rotation.set(0.05, 0.25, 0); q.add(bk); P.book = bk; const cc = '#1565b3'; bk.add(box(0.26, 0.35, 0.07, stdM(0x1565b3, 0.5), 0, 0, 0)); bk.add(box(0.24, 0.33, 0.076, M.paper, 0.008, 0, 0));
    const cv = signPlane(0.26, 0.35, 512, (c, w, h) => { c.fillStyle = cc; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; fitFont(c, 'PROGRAMA', 900, 80, w - 60); c.fillText('PROGRAMA', w / 2, h * 0.2); fitFont(c, PARTY[id].sig, 900, 170, w - 60); c.fillText(PARTY[id].sig, w / 2, h * 0.5); c.font = '700 44px Inter'; c.fillText('29N · 2026', w / 2, h * 0.78); }, { r: 0.5 }); cv.position.z = 0.039; bk.add(cv);
    q.add(pl(['249', 'MEDIDAS', '82 PÁGINAS'], S3)); }
  // «cuatro que te tocan»
  { const q = P.tiles = grp(); P.tile = [1, 2, 3, 4].map(n => { const m = plate(String(n), 0.22, 0.22, { edge: PARTY[id].css }); m.position.set(-0.39 + (n - 1) * 0.26, 0.17, 0.08); q.add(m); return m; }); }
  // 1 · vivienda: un millón de casas nuevas (casitas que brotan) y el IVA de la primera, del 10 al 4 %, para menores de 40
  { const q = P.viv = grp(); q.add(slab(0.5, 0.22)); P.hs = []; for (let i = 0; i < 6; i++) { const h = miniHouse([0xf2efe8, 0xe9dcc4, 0xdfe6ee][i % 3], [0xb8452f, 0x4a78b8, 0x7a5a3a][i % 3], 0.56); h.position.set(OX - 0.17 + (i % 3) * 0.125, 0.02, i < 3 ? -0.04 : 0.07); if (i >= 3) h.position.x += 0.06; q.add(h); P.hs.push(h); }
    P.iva10 = badge('10 %', 0.17, '#8a93a6', '#ffffff'); P.iva4 = badge('4 %', 0.19, AMB, '#12100a'); for (const b of [P.iva10, P.iva4]) { b.position.set(OX + 0.18, 0.3, 0.12); q.add(b); } P.ivaL = plate('IVA', 0.13, 0.06, {}); P.ivaL.position.set(OX + 0.18, 0.42, 0.12); q.add(P.ivaL);
    P.vA = pl(['1.000.000', 'DE CASAS NUEVAS'], { sz: [0.4, 0.22], ys: [0.36, 0.74], nbig: 1 }); q.add(P.vA); P.vB = pl(['IVA: 10 % → 4 %', 'PRIMERA CASA'], { sz: [0.3, 0.24], ys: [0.34, 0.72], nbig: 1 }); q.add(P.vB); P.vC = pl(['IVA: 10 % → 4 %', 'PRIMERA CASA', 'MENORES DE 40 AÑOS'], { sz: [0.3, 0.2, 0.2], ys: [0.24, 0.55, 0.8], nbig: 1 }); q.add(P.vC); }
  // 2 · la compra: IVA cero en los alimentos básicos (una cesta), mientras dure la crisis de precios
  { const q = P.com = grp(); q.add(slab(0.5, 0.2)); const bk = new THREE.Group(); bk.position.set(OX - 0.04, 0.02, 0); q.add(bk); P.basket = bk; const wk = stdM(0xb98a4e, 0.8);
    bk.add(box(0.3, 0.012, 0.2, wk, 0, 0.006, 0)); for (const sx of [-1, 1]) bk.add(box(0.012, 0.12, 0.2, wk, sx * 0.15, 0.06, 0)); for (const sz of [-1, 1]) bk.add(box(0.3, 0.12, 0.012, wk, 0, 0.06, sz * 0.1));
    const hd = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.01, 8, 28, Math.PI), wk); hd.position.y = 0.12; bk.add(hd);
    P.food = []; { const br = cyl(0.035, 0.035, 0.2, stdM(0xc98d4b, 0.8), 14); br.rotation.z = 1.1; br.position.set(-0.07, 0.17, 0); bk.add(br); P.food.push(br); }
    { const mk = box(0.07, 0.15, 0.07, lit(0xf4f6f8, 0.35), 0.03, 0.15, -0.02); bk.add(mk); mk.add(box(0.072, 0.04, 0.072, lit(0x2f7fd0, 0.4), 0, 0.02, 0)); P.food.push(mk); }
    { const ap = sph(0.042, lit(0xd62f2f, 0.35), 16, 12); ap.position.set(0.1, 0.13, 0.03); bk.add(ap); P.food.push(ap); } { const eg = sph(0.03, lit(0xf3e9d8, 0.3), 14, 10); eg.scale.y = 1.25; eg.position.set(-0.01, 0.125, 0.05); bk.add(eg); P.food.push(eg); }
    P.iva0 = badge('0 %', 0.19, AMB, '#12100a'); P.iva0.position.set(OX + 0.19, 0.3, 0.12); q.add(P.iva0); P.ivaL2 = plate('IVA', 0.13, 0.06, {}); P.ivaL2.position.set(OX + 0.19, 0.42, 0.12); q.add(P.ivaL2);
    P.cA = pl(['IVA 0 %', 'ALIMENTOS BÁSICOS'], { sz: [0.4, 0.22], ys: [0.36, 0.74], nbig: 1 }); q.add(P.cA); P.cB = pl(['IVA 0 %', 'ALIMENTOS BÁSICOS', 'MIENTRAS DURE LA CRISIS'], S3); q.add(P.cB); }
  // 3 · pensiones: suben cada año lo que suba el IPC (dos escaleras que suben a la vez)
  { const q = P.pen = grp(); q.add(slab(0.5, 0.2)); P.st = []; for (let i = 0; i < 4; i++) { const h = 0.09 + i * 0.055, a = box(0.05, h, 0.06, lit(0x8a93a6, 0.35), OX - 0.2 + i * 0.125, 0.02 + h / 2, 0), b = box(0.05, h, 0.06, lit(0xffd66a, 0.5), OX - 0.145 + i * 0.125, 0.02 + h / 2, 0); q.add(a); q.add(b); P.st.push([a, b, h]); }
    const la = plate('IPC', 0.14, 0.06, { ink: '#c9d5f2' }); la.position.set(OX - 0.13, 0.36, 0.08); q.add(la); const lb = plate('PENSIÓN', 0.2, 0.06, { ink: AMB }); lb.position.set(OX + 0.08, 0.36, 0.08); q.add(lb); P.penL = [la, lb];
    q.add(pl(['PENSIONES', 'SUBEN CADA AÑO', 'LO QUE SUBA EL IPC'], { sz: [0.3, 0.21, 0.21], ys: [0.24, 0.55, 0.8], nbig: 1 })); }
  // 4 · inmigración: un cupo anual según los trabajadores que hagan falta (cascos de obra) y más control de fronteras (una barrera que baja)
  { const q = P.inm = grp(); q.add(slab(0.52, 0.2)); P.cupo = plate(['CUPO', 'ANUAL'], 0.2, 0.15, { sz: [0.38, 0.38], ys: [0.3, 0.72], nbig: 2, ink: AMB }); P.cupo.position.set(OX - 0.15, 0.31, 0.06); q.add(P.cupo);
    P.hats = [0, 1, 2].map(i => { const hg = new THREE.Group(); hg.position.set(OX - 0.2 + i * 0.105, 0.03, 0.03); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.045, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), lit(0xf2c230, 0.5)); hg.add(dome); const brim = cyl(0.058, 0.058, 0.008, lit(0xf2c230, 0.5), 20); brim.position.y = 0.004; hg.add(brim); hg.add(box(0.012, 0.03, 0.09, lit(0xf2c230, 0.5), 0, 0.03, 0)); q.add(hg); return hg; });
    const gt = new THREE.Group(); gt.position.set(OX + 0.16, 0.02, 0.02); q.add(gt); P.gate = gt; gt.add(box(0.035, 0.2, 0.035, stdM(0x5b6672, 0.5), 0, 0.1, 0)); const arm = new THREE.Group(); arm.position.set(0, 0.19, 0.02); gt.add(arm); P.arm = arm;
    for (let i = 0; i < 6; i++) arm.add(box(0.06, 0.03, 0.02, lit(i % 2 ? 0xf4f6f8 : 0xd62f2f, 0.5), -0.03 - i * 0.06, 0, 0));
    P.iA = pl(['CUPO ANUAL', 'SEGÚN LOS TRABAJADORES', 'QUE HAGAN FALTA'], { sz: [0.3, 0.19, 0.19], ys: [0.24, 0.55, 0.8], nbig: 1 }); q.add(P.iA); P.iB = pl(['MÁS CONTROL', 'DE FRONTERAS'], S2); q.add(P.iB); }
  // «¿y con qué dinero?»: empieza por auditar todo el gasto público en sus primeros 100 días (un libro de cuentas bajo la lupa y la hoja de «100 días»)
  { const q = P.tax = grp(); q.add(slab(0.52, 0.2)); P.coin = new THREE.Group(); P.coin.position.set(OX, 0.2, 0); q.add(P.coin); { const c = cyl(0.13, 0.13, 0.03, lit(0xc9962e, 0.4), 40); c.rotation.x = Math.PI / 2; P.coin.add(c); P.coinF = [-1, 1].map(sz => { const b = badge('€', 0.262, '#f0c648', '#5a3d08'); b.position.z = sz * 0.0165; b.rotation.y = sz < 0 ? Math.PI : 0; P.coin.add(b); return b; }); }
    const au = new THREE.Group(); q.add(au); P.aud = au; const lg = new THREE.Group(); lg.position.set(OX - 0.06, 0.17, 0); lg.rotation.set(-0.08, 0.12, 0); au.add(lg); lg.add(box(0.3, 0.28, 0.03, stdM(0x4d5866, 0.6), 0, 0, -0.016));
    const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.26), new THREE.MeshBasicMaterial({ map: signTex(448, 416, (c, w, h) => { c.fillStyle = PAPER; c.fillRect(0, 0, w, h); c.fillStyle = '#14161a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 46px Inter'; c.fillText('GASTO PÚBLICO', w / 2, 50); c.fillStyle = '#bdb7aa'; for (let i = 0; i < 7; i++) { c.fillRect(30, 112 + i * 40, 230 - (i * 53) % 70, 12); c.fillRect(w - 130, 112 + i * 40, 100, 12); } }), toneMapped: false })); lg.add(lf);
    const lu = new THREE.Group(); au.add(lu); P.lupa = lu; const rm = new THREE.MeshBasicMaterial({ color: 0xdfe5ee }); lu.add(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 10, 32), rm)); const hd = box(0.02, 0.1, 0.012, rm, 0.075, -0.095, 0); hd.rotation.z = 0.7; lu.add(hd);
    P.dias = badge('100', 0.17, AMB, '#12100a'); P.dias.position.set(OX + 0.17, 0.33, 0.1); q.add(P.dias); P.diasL = plate('DÍAS', 0.14, 0.06, {}); P.diasL.position.set(OX + 0.17, 0.215, 0.1); q.add(P.diasL);
    P.t0 = pl(['¿Y CON QUÉ', 'DINERO?'], { sz: [0.3, 0.36], ys: [0.33, 0.68], nbig: 2 }); q.add(P.t0); P.t1 = pl(['AUDITAR', 'TODO EL GASTO PÚBLICO', 'EN SUS PRIMEROS 100 DÍAS'], { sz: [0.32, 0.2, 0.18], ys: [0.24, 0.55, 0.8], nbig: 1 }); q.add(P.t1); }
  // la intriga del siguiente capítulo, sobre SU atril: el candado de las pensiones en la Constitución, con las cifras girando («¿qué le hace falta?»)
  { const L2 = S.lect[CH.next], gg = new THREE.Group(); gg.position.set(0, STAGE.Y, 0.02); L2.add(gg); const q = P.nx = new THREE.Group(); q.visible = false; gg.add(q); q.add(slab(0.5, 0.14));
    P.pad = padlock(); P.pad.scale.setScalar(0.3); P.pad.position.set(OX + 0.0, 0.13, 0.02); q.add(P.pad);
    const p = plate(['PENSIONES', 'EN LA CONSTITUCIÓN', '¿QUÉ LE HACE FALTA?'], PW, PH, { edge: PARTY[CH.next].css, sz: [0.3, 0.2, 0.24], ys: [0.23, 0.52, 0.8], nbig: 1 }); p.position.set(PX, PY, 0.1); q.add(p); P.np = p; }
  return P; }
// brillo de cada pantalla: la del capítulo, encendida; las demás, en penumbra; en la intriga se enciende la del siguiente
function teaserK(t) { return bump(t, TL.psoe - 0.35, TL.L[10] + 0.3, 0.35, 0.4); }
function totK(o, t) { const k = teaserK(t); return o === CH.id ? 1 - 0.55 * k : o === CH.next ? 0.3 + 0.7 * k : 0.3; }
const OXK = -0.26;
function chapterAt(t, st) { const P = S.P, T = TL, id = CH.id;
  for (const o of ORDER) S.tot[o].mat.color.setScalar(SCREEN_I * totK(o, t));
  S.dims.forEach(d => { d.userData.pl.emissiveIntensity = 0; d.userData.tm.color.setScalar(0.1); });
  hookAt(t);
  { const q2 = x => Math.round(x * 20) / 20; wallDraw({ band: ORDER.map(o => q2(0.25 + 0.65 * (totK(o, t) - 0.3) / 0.7)), pill: '', pillA: 0, next: q2(bump(t, T.proximo + 0.12, T.psoe + 0.75, 0.3, 0.3)) }); }
  // los objetos (cada uno aparece con su palabra)
  const vis = (g, a, b) => { const k = bump(t, a, b, 0.001, 0.2); g.visible = k > 0.01; if (g.visible) g.scale.setScalar(Math.max(0.01, pop(t, a, 0.4)) * Math.min(1, k * 1.2)); return g.visible; }, ps = (o, t0, d = 0.35, s = 1) => o.scale.setScalar(Math.max(0.001, pop(t, t0, d)) * s);
  const sw = (a, b, t0) => { const f = t > t0; a.visible = !f; b.visible = f; ps(b, t0); };
  P.tabs.forEach((m, n) => { const a = T.L[4 + n] - 0.05, k = bump(t, a, T.L[5 + n] - 0.22, 0.001, 0.2); m.visible = k > 0.01; if (m.visible) m.scale.setScalar(Math.max(0.01, pop(t, a, 0.35)) * Math.min(1, k * 1.2)); });
  if (vis(P.prog, T.doscientas - 0.12, T.cuatro - 0.12)) P.book.rotation.y = 0.25 + 0.08 * Math.sin(t * 1.4);
  if (vis(P.tiles, T.cuatro - 0.08, T.L[4] - 0.3)) P.tile.forEach((m, i) => ps(m, T.cuatro - 0.05 + i * 0.1, 0.3));
  if (vis(P.viv, T.L[4] - 0.08, T.L[5] - 0.22)) { P.hs.forEach((h, i) => ps(h, (i ? T.millon - 0.1 + (i - 1) * 0.09 : T.L[4] + 0.05), 0.3)); const f1 = t > T.iva - 0.1, f2 = t > T.menos - 0.1; P.vA.visible = !f1; P.vB.visible = f1 && !f2; P.vC.visible = f2; ps(P.vA, T.millon - 0.1); ps(P.vB, T.iva - 0.1); ps(P.vC, T.menos - 0.1);
    ps(P.ivaL, T.iva - 0.1); const f4 = t > T.cuatro4 - 0.05; P.iva10.visible = f1 && !f4; P.iva4.visible = f4; ps(P.iva10, T.diez - 0.08); ps(P.iva4, T.cuatro4 - 0.05); P.ivaL.visible = f1; }
  if (vis(P.com, T.L[5] - 0.08, T.L[6] - 0.22)) { ps(P.basket, T.L[5] + 0.05); P.food.forEach((f, i) => ps(f, T.alimentos - 0.15 + i * 0.09, 0.28)); ps(P.ivaL2, T.iva5 - 0.08); ps(P.iva0, T.cero5 - 0.05); sw(P.cA, P.cB, T.mientras - 0.1); ps(P.cA, T.iva5 - 0.08); P.basket.rotation.y = 0.2 + 0.1 * Math.sin(t * 1.4); }
  if (vis(P.pen, T.L[6] - 0.08, T.L[7] - 0.22)) { P.st.forEach(([a, b, h], i) => { const k = Math.max(0.001, pop(t, T.subirlas - 0.05 + i * 0.16, 0.3)); for (const m of [a, b]) { m.scale.y = k; m.position.y = 0.02 + h * k / 2; } }); P.penL.forEach((m, i) => ps(m, (i ? T.subirlas : T.ipc) - 0.1)); }
  if (vis(P.inm, T.L[7] - 0.08, T.L[8] - 0.22)) { ps(P.cupo, T.cupo - 0.08); P.hats.forEach((h, i) => ps(h, T.trabajadores - 0.1 + i * 0.1, 0.28)); sw(P.iA, P.iB, T.control - 0.1); ps(P.iA, T.cupo - 0.08); ps(P.gate, T.control - 0.1); P.arm.rotation.z = -Math.PI / 2 * (1 - sm5(seg(t, T.control + 0.05, T.fronteras + 0.25))); }
  if (vis(P.tax, T.L[8] - 0.08, T.L[9] - 0.25)) { const f = t > T.empieza - 0.1; P.t0.visible = !f; P.t1.visible = f; ps(P.t1, T.empieza - 0.1);
    { const ck = 1 - win(t, T.empieza - 0.12, 0.2), a = t * 2.4; P.coin.visible = ck > 0.02; P.coin.scale.setScalar(Math.max(0.01, ck)); P.coin.rotation.y = a; P.coinF.forEach(b => b.material.color.setScalar(0.62 + 0.38 * Math.abs(Math.cos(a)))); }
    P.aud.visible = f; if (f) { P.aud.scale.setScalar(Math.max(0.01, pop(t, T.empieza - 0.1, 0.35))); const u = t - T.auditar; P.lupa.position.set(OXK - 0.06 + 0.08 * Math.sin(u * 2.2), 0.17 + 0.05 * Math.sin(u * 3.1 + 1), 0.05); } ps(P.dias, T.cien - 0.1); ps(P.diasL, T.cien - 0.05); }
  if (vis(P.nx, T.psoe + 0.55, T.L[10] + 0.2)) { ps(P.np, T.blindar - 0.2); ps(P.pad, T.blindar - 0.2, 0.35, 0.3); const U = P.pad.userData; for (let i = 0; i < 3; i++) U.dig[i].offset.y = 1 - ((((3.3 + i * 2.1 + (7 + 2.5 * i) * t) % 10) + 10) % 10 + 1) / 11; U.sh.position.y = U.BH / 2 + 0.15; U.sh.rotation.y = 0.7; }
}
