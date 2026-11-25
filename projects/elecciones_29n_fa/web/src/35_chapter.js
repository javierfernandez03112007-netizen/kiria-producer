// ---------------------------------------------------------------- 29N · FRENTE AMPLIO (capítulo de un partido; misma plantilla; es el último: cierra la serie).
// Gancho: una torre de lingotes que se apila sola encima de la pantalla del partido; una raya marca el tope («10 millones por heredero») y los lingotes que
// pasan de ahí («?» → «100 %») vuelan hasta dos bloques de pisos: el gasto en vivienda social, duplicado («×2»). Después, sobre el atril, las medidas como
// objetos (a la izquierda) con su rótulo (a la derecha). Al final no hay siguiente capítulo: se encienden las cuatro pantallas y «el domingo decides tú».
const CH = { id: 'fa', next: null };
const TP = [1.42, 2.9, -1.6], NI = 14, LIM = 10, IH = 0.086;      // base de la torre, lingotes, tope y alto de cada lingote
const HSP = [TP[0] - 1.32, TP[1] + 0.02, TP[2]];                  // donde está la vivienda social (a la izquierda de la torre)
const PAPER = '#f6f2e8', AMB = '#ffd66a';
function buildHook(G) { const g = new THREE.Group(); g.position.set(...TP); G.add(g); S.tower = g; nightSrc(_v(TP[0] - 0.4, TP[1] + 1.2, TP[2] + 1.8), 0xfff0dc, 7, 3.0, 'pad');
  S.overM = new THREE.MeshBasicMaterial({ color: 0xffb547, toneMapped: false }); const gm = [new THREE.MeshBasicMaterial({ color: 0xe9bd42, toneMapped: false }), new THREE.MeshBasicMaterial({ color: 0xd3a32c, toneMapped: false })];
  g.add(box(0.5, 0.05, 0.3, new THREE.MeshBasicMaterial({ color: 0x232a36 }), 0, -0.03, 0));
  S.ing = []; for (let i = 0; i < NI; i++) { const b = box(0.36, IH - 0.008, 0.17, i >= LIM ? S.overM : gm[i % 2], 0, IH / 2 + i * IH, 0); b.userData.y = IH / 2 + i * IH; g.add(b); S.ing.push(b); const tp = box(0.3, 0.004, 0.12, new THREE.MeshBasicMaterial({ color: i >= LIM ? 0xffd08a : 0xf6dc85, toneMapped: false }), 0, IH / 2 - 0.006, 0.03); b.add(tp); }
  S.lim = box(0.95, 0.009, 0.012, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), -0.2, LIM * IH, 0.1); g.add(S.lim);
  S.limL = plate(['10 MILLONES', 'POR HEREDERO'], 0.62, 0.2, { sz: [0.4, 0.3], ys: [0.32, 0.73], nbig: 1 }); S.limL.position.set(-0.68, LIM * IH + 0.13, 0.08); g.add(S.limL);
  S.qm = badge('?', 0.24, AMB, '#12100a'); S.qm.position.set(0.34, LIM * IH + 0.2, 0.1); g.add(S.qm); S.cien = plate('100 %', 0.5, 0.2, { ink: '#ffb547' }); S.cien.position.set(-0.62, LIM * IH + 0.42, 0.08); g.add(S.cien);
  // la vivienda social: un bloque y, al duplicar, otro igual
  const h = new THREE.Group(); h.position.set(...HSP); G.add(h); S.hsoc = h; h.add(box(0.95, 0.05, 0.3, new THREE.MeshBasicMaterial({ color: 0x232a36 }), 0, -0.03, 0));
  S.blk = [-1, 1].map(sd => { const b = miniBlock(5, sd < 0 ? 0xdfe3ea : 0xe9dcc4, 1.55); b.position.set(sd * 0.22, 0, 0); h.add(b); return b; });
  S.hsL = plate(['GASTO EN', 'VIVIENDA SOCIAL'], 0.62, 0.17, { sz: [0.3, 0.36], ys: [0.3, 0.72], nbig: 2 }); S.hsL.position.set(0, -0.17, 0.12); h.add(S.hsL); S.x2 = badge('×2', 0.24, AMB, '#12100a'); S.x2.position.set(0.42, 0.72, 0.14); h.add(S.x2);
  shadowAll(g, false, false); }
function hookAt(t) { const T = TL, g = S.tower, back = t > T.manda, t0 = back ? END - 0.6 : -0.6;
  const vis = clamp(1 - win(t, T.L[3] + 0.45, 0.4) + win(t, T.manda + 0.2, 0.45)); g.visible = vis > 0.01; g.scale.setScalar(Math.max(0.01, vis));
  // los lingotes se apilan solos (uno cada 0,11 s; al volver, la torre empieza otra vez para que el bucle case)
  const fly = i => back ? 0 : sm5(seg(t, T.iria - 0.05 + (i - LIM) * 0.12, T.iria + 0.75 + (i - LIM) * 0.12));
  S.ing.forEach((b, i) => { const s = t0 + i * 0.11, k = pop(t, s, 0.28), e = clamp((t - s) / 0.22); b.visible = t > s; if (!b.visible) return; let x = 0, y = b.userData.y + 0.3 * (1 - e) * (1 - e), sc = Math.max(0.01, k);
    if (i >= LIM) { const f = fly(i); if (f > 0) { x = lerp(0, HSP[0] - TP[0] + 0.22, f); y = lerp(b.userData.y, 0.35, f) + 0.45 * Math.sin(f * Math.PI); sc *= 1 - 0.75 * f; b.visible = f < 0.98; } }
    b.position.set(x, y, 0); b.scale.setScalar(sc); b.rotation.z = 0; });
  S.overM.color.setHex(0xffb547).multiplyScalar(!back && t > T.pase - 0.2 ? 0.75 + 0.25 * Math.sin(t * 11) : 1);
  S.lim.scale.x = Math.max(0.001, back ? 0 : win(t, T.diez - 0.3, 0.4)); S.limL.scale.setScalar(Math.max(0.001, back ? 0 : pop(t, T.diez - 0.25, 0.35)));
  S.qm.scale.setScalar(Math.max(0.001, back ? 0 : pop(t, T.pase - 0.2, 0.3) * (1 - win(t, T.cien - 0.15, 0.2)))); S.cien.scale.setScalar(Math.max(0.001, back ? 0 : pop(t, T.cien - 0.12, 0.35)));
  const hk = back ? 0 : bump(t, T.iria - 0.3, T.L[3] + 0.35, 0.001, 0.25); S.hsoc.visible = hk > 0.01; if (S.hsoc.visible) { S.hsoc.scale.setScalar(Math.max(0.01, pop(t, T.iria - 0.3, 0.4)) * Math.min(1, hk * 1.2)); S.blk[1].scale.set(1, Math.max(0.001, pop(t, T.duplicar + 0.1, 0.45)), 1); S.blk[1].visible = t > T.duplicar + 0.1; S.x2.scale.setScalar(Math.max(0.001, pop(t, T.duplicar + 0.3, 0.35))); } }
// ---- los objetos de las medidas, sobre el atril del partido
function buildProps(G) { const P = {}, id = CH.id, OX = -0.26, PX = 0.275, PW = 0.54, PH = 0.34, PY = 0.19, S3 = { sz: [0.4, 0.2, 0.17], ys: [0.28, 0.62, 0.84], nbig: 1 }, S3c = { sz: [0.26, 0.2, 0.2], ys: [0.24, 0.55, 0.8], nbig: 1 }, S2 = { sz: [0.34, 0.34], ys: [0.32, 0.71], nbig: 2 }, S2b = { sz: [0.4, 0.22], ys: [0.36, 0.74], nbig: 1 };
  const g = new THREE.Group(); g.position.set(0, STAGE.Y, 0.02); S.lect[id].add(g); P.g = g;
  const grp = () => { const q = new THREE.Group(); q.visible = false; g.add(q); return q; }, pl = (txt, o = {}) => { const p = plate(txt, PW, PH, { edge: PARTY[id].css, ...o }); p.position.set(PX, PY, 0.1); return p; }, slab = (w, d) => box(w, 0.02, d, stdM(0x1a2230, 0.5), OX, 0.01, 0);
  const lit = (col, I = 0.5) => nightMat(new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: I, roughness: 0.5 }));
  P.tabs = ['TRABAJO', 'VIVIENDA', 'FAMILIAS', 'COLEGIO'].map((s, n) => { const m = plate((n + 1) + ' · ' + s, 0.36, 0.075, { ink: '#ffb547' }); m.position.set(PX - PW / 2 + 0.18, PY + PH / 2 + 0.045, 0.1); m.visible = false; g.add(m); return m; });   // el tema, en ámbar (como en los subtítulos)
  // «su programa tiene ciento cincuenta y una páginas»: el libro del programa
  { const q = P.prog = grp(), bk = new THREE.Group(); bk.position.set(OX, 0.185, 0); bk.rotation.set(0.05, 0.25, 0); q.add(bk); P.book = bk; const cc = '#d9480f'; bk.add(box(0.26, 0.35, 0.09, stdM(0xd9480f, 0.5), 0, 0, 0)); bk.add(box(0.24, 0.33, 0.096, M.paper, 0.008, 0, 0));
    const cv = signPlane(0.26, 0.35, 512, (c, w, h) => { c.fillStyle = cc; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; fitFont(c, 'PROGRAMA', 900, 80, w - 60); c.fillText('PROGRAMA', w / 2, h * 0.2); fitFont(c, 'FRENTE', 900, 110, w - 60); c.fillText('FRENTE', w / 2, h * 0.43); fitFont(c, 'AMPLIO', 900, 110, w - 60); c.fillText('AMPLIO', w / 2, h * 0.59); c.font = '700 44px Inter'; c.fillText('29N · 2026', w / 2, h * 0.8); }, { r: 0.5 }); cv.position.z = 0.049; bk.add(cv);
    q.add(pl(['151', 'PÁGINAS'], { sz: [0.46, 0.24], ys: [0.38, 0.76], nbig: 1 })); }
  // «cuatro medidas que te tocan»
  { const q = P.tiles = grp(); P.tile = [1, 2, 3, 4].map(n => { const m = plate(String(n), 0.22, 0.22, { edge: PARTY[id].css }); m.position.set(-0.39 + (n - 1) * 0.26, 0.17, 0.08); q.add(m); return m; }); }
  // 1a · trabajo: la jornada, de 40 a 32 horas (la barra se acorta), cobrando lo mismo («=»); el primer paso, 37,5 (una marca en la barra)
  { const q = P.jor = grp(); q.add(box(0.5, 0.02, 0.1, stdM(0x1a2230, 0.5), OX, 0.05, 0)); P.jbar = box(0.44, 0.13, 0.06, lit(0xffd66a, 0.55), 0, 0, 0); const jb = new THREE.Group(); jb.position.set(OX - 0.22, 0.13, 0); jb.add(P.jbar); P.jbar.position.x = 0.22; q.add(jb); P.jb = jb;
    P.j40 = plate('40 h', 0.2, 0.085, {}); P.j32 = plate('32 h', 0.22, 0.085, { ink: AMB }); for (const m of [P.j40, P.j32]) { m.position.set(OX - 0.1, 0.27, 0.06); q.add(m); }
    P.eq = badge('=', 0.15, AMB, '#12100a'); P.eq.position.set(OX + 0.17, 0.3, 0.1); q.add(P.eq); P.eqL = plate('SUELDO', 0.16, 0.055, {}); P.eqL.position.set(OX + 0.17, 0.4, 0.1); q.add(P.eqL);
    P.tick = box(0.008, 0.19, 0.07, new THREE.MeshBasicMaterial({ color: 0x5cf2e6, toneMapped: false }), OX - 0.22 + 0.44 * 37.5 / 40, 0.13, 0.005); q.add(P.tick); P.tickL = plate('1.º: 37,5 h', 0.26, 0.06, { ink: '#5cf2e6' }); P.tickL.position.set(OX + 0.1, 0.02, 0.09); q.add(P.tickL);
    P.jA = pl(['32 HORAS', 'COBRANDO LO MISMO'], S2b); q.add(P.jA); P.jB = pl(['32 HORAS', 'COBRANDO LO MISMO', 'PRIMER PASO: 37,5 HORAS'], S3); q.add(P.jB); }
  // 1b · salario mínimo: el 60 % del sueldo medio (dos barras y la raya del 60 %)
  { const q = P.smi = grp(); q.add(slab(0.5, 0.14)); P.avg = box(0.13, 0.3, 0.09, stdM(0x8a93a6, 0.6), OX - 0.11, 0.17, 0); q.add(P.avg); P.min = box(0.13, 0.3, 0.09, lit(0x5cf2e6, 0.5), OX + 0.11, 0.17, 0); q.add(P.min);
    const la = plate(['SUELDO', 'MEDIO'], 0.2, 0.1, { sz: [0.4, 0.4], ys: [0.3, 0.72], nbig: 2 }); la.position.set(OX - 0.11, 0.07, 0.06); q.add(la); const lb = plate(['SALARIO', 'MÍNIMO'], 0.2, 0.1, { sz: [0.4, 0.4], ys: [0.3, 0.72], nbig: 2 }); lb.position.set(OX + 0.11, 0.07, 0.06); q.add(lb);
    P.line = box(0.5, 0.006, 0.012, new THREE.MeshBasicMaterial({ color: 0xffd66a, toneMapped: false }), OX, 0.2, 0.05); q.add(P.line); P.p60 = plate('60 %', 0.15, 0.07, { ink: AMB }); P.p60.position.set(OX + 0.11, 0.255, 0.08); q.add(P.p60);
    q.add(pl(['SALARIO MÍNIMO', '60 % DEL', 'SUELDO MEDIO'], { sz: [0.27, 0.24, 0.24], ys: [0.23, 0.53, 0.8], nbig: 1 })); }
  // 2 · vivienda: 1,5 millones de pisos públicos en 12 años (bloques que suben) y un tope al precio del alquiler (una tapa sobre la etiqueta)
  { const q = P.viv = grp(); q.add(slab(0.5, 0.2)); P.blocks = [0, 1, 2].map(i => { const b = miniBlock(4 + i, [0xdfe3ea, 0xe9dcc4, 0xcfd8e6][i], 0.6); b.position.set(OX - 0.13 + i * 0.1, 0.02, (i % 2) * 0.05 - 0.02); q.add(b); return b; });
    P.tag = new THREE.Group(); P.tag.position.set(OX + 0.02, 0.15, 0.1); q.add(P.tag); P.tag.add(plate(['ALQUILER', '€ € €'], 0.3, 0.17, { bg: PAPER, ink: '#14161a', ink2: '#14161a', edge: '#8b8577', sz: [0.3, 0.36], ys: [0.3, 0.72], nbig: 2 }));
    P.cap = box(0.36, 0.03, 0.05, new THREE.MeshBasicMaterial({ color: 0x5cf2e6, toneMapped: false }), OX + 0.02, 0.26, 0.1); q.add(P.cap); P.capL = plate('TOPE', 0.16, 0.06, { ink: '#5cf2e6' }); P.capL.position.set(OX + 0.02, 0.32, 0.1); q.add(P.capL);
    P.vA = pl(['1.500.000', 'PISOS PÚBLICOS', 'EN 12 AÑOS'], S3); q.add(P.vA); P.vB = pl(['TOPE AL PRECIO', 'DEL ALQUILER'], S2); q.add(P.vB); }
  // 3 · familias: 200 € al mes por cada hijo menor de 18, ganes lo que ganes (biberón, cubos y la cifra)
  { const q = P.cri = grp(); q.add(slab(0.5, 0.2)); const bt = new THREE.Group(); bt.position.set(OX - 0.15, 0.02, 0.02); q.add(bt); P.bottle = bt;
    ad(bt, cyl(0.039, 0.039, 0.08, stdM(0xfaf6ea, 0.5), 20)).position.y = 0.045; ad(bt, cyl(0.04, 0.04, 0.14, new THREE.MeshPhysicalMaterial({ color: 0xeaf4ff, roughness: 0.1, transparent: true, opacity: 0.5 }), 20)).position.y = 0.07; ad(bt, cyl(0.045, 0.045, 0.03, stdM(0x4aa3df, 0.5), 20)).position.y = 0.155; ad(bt, cyl(0.012, 0.028, 0.045, stdM(0xe9c9a0, 0.6), 14)).position.y = 0.19;
    P.cubes = [['A', 0xe2574c, 0, 0], ['B', 0x4aa3df, 0.085, 0], ['C', 0x58b368, 0.042, 0.085]].map(([ch, col, x, y]) => { const b = box(0.08, 0.08, 0.08, stdM(col, 0.6), OX + 0.02 + x, 0.06 + y, 0); q.add(b); const l = plate(ch, 0.07, 0.07, { bg: 'rgba(0,0,0,0)' }); l.position.z = 0.041; b.add(l); return b; });
    P.e200 = badge('200 €', 0.19, AMB, '#12100a'); P.e200.position.set(OX + 0.19, 0.33, 0.1); q.add(P.e200); P.mes = plate('AL MES', 0.18, 0.055, {}); P.mes.position.set(OX + 0.19, 0.205, 0.1); q.add(P.mes);
    P.fA = pl(['200 € AL MES', 'POR CADA HIJO', 'MENOR DE 18'], { sz: [0.3, 0.21, 0.21], ys: [0.24, 0.55, 0.8], nbig: 1 }); q.add(P.fA); P.fB = pl(['200 € AL MES', 'POR CADA HIJO', 'GANES LO QUE GANES'], { sz: [0.3, 0.21, 0.21], ys: [0.24, 0.55, 0.8], nbig: 1 }); q.add(P.fB); }
  // 4 · colegio: comedor escolar gratis (una bandeja con su plato, la manzana y el vaso; «0 €»)
  { const q = P.com = grp(); q.add(slab(0.5, 0.2)); const tr = new THREE.Group(); tr.position.set(OX - 0.03, 0.03, 0.02); tr.rotation.x = 0.5; q.add(tr); P.tray = tr; tr.add(box(0.36, 0.014, 0.24, lit(0x7fb6c2, 0.35), 0, 0, 0));
    const dish = cyl(0.075, 0.06, 0.016, lit(0xf4f6f8, 0.4), 28); dish.position.set(-0.07, 0.016, 0.01); tr.add(dish); const fd = cyl(0.05, 0.05, 0.012, lit(0xe0a23c, 0.4), 22); fd.position.set(-0.07, 0.03, 0.01); tr.add(fd);
    const ap = sph(0.036, lit(0xd62f2f, 0.35), 16, 12); ap.position.set(0.09, 0.04, -0.05); tr.add(ap); const gl = cyl(0.026, 0.022, 0.06, lit(0xbfe3ea, 0.4), 16); gl.position.set(0.1, 0.037, 0.06); tr.add(gl); tr.add(box(0.01, 0.004, 0.11, M.steel, 0.02, 0.012, 0.02));
    P.free = badge('0 €', 0.19, AMB, '#12100a'); P.free.position.set(OX + 0.19, 0.3, 0.1); q.add(P.free);
    P.cA = pl(['COMEDOR', 'ESCOLAR'], S2); q.add(P.cA); P.cB = pl(['COMEDOR', 'ESCOLAR', 'GRATIS'], { sz: [0.3, 0.3, 0.26], ys: [0.2, 0.5, 0.81], nbig: 2, ink2: AMB }); q.add(P.cB); }
  // «¿y con qué dinero?»: más impuestos a las grandes fortunas (caja fuerte) y que las empresas paguen, como mínimo, un 20 % (un edificio de oficinas)
  { const q = P.tax = grp(); q.add(slab(0.52, 0.2)); const safe = new THREE.Group(); safe.position.set(OX - 0.13, 0.02, 0); q.add(safe); P.safe = safe; const sm = stdM(0x66717f, 0.4, { metalness: 0.35 });
    safe.add(box(0.2, 0.22, 0.15, sm, 0, 0.11, 0)); safe.add(box(0.16, 0.18, 0.01, stdM(0x8793a3, 0.35, { metalness: 0.35 }), 0, 0.11, 0.078)); const dial = cyl(0.03, 0.03, 0.02, M.steel, 20); dial.rotation.x = Math.PI / 2; dial.position.set(0, 0.11, 0.09); safe.add(dial);
    for (let i = 0; i < 3; i++) ad(safe, cyl(0.05, 0.05, 0.02, lit(i % 2 ? 0xc9962e : 0xf0c648, 0.4), 20)).position.set(-0.02 + i * 0.02, 0.235 + i * 0.022, 0);
    P.ofi = miniBlock(5, 0xb9c4d4, 0.62); P.ofi.position.set(OX + 0.12, 0.02, 0); q.add(P.ofi); P.p20 = badge('20 %', 0.17, AMB, '#12100a'); P.p20.position.set(OX + 0.2, 0.33, 0.12); q.add(P.p20);
    P.coin = new THREE.Group(); P.coin.position.set(OX, 0.2, 0); q.add(P.coin); { const c = cyl(0.13, 0.13, 0.03, lit(0xc9962e, 0.4), 40); c.rotation.x = Math.PI / 2; P.coin.add(c); P.coinF = [-1, 1].map(sz => { const b = badge('€', 0.262, '#f0c648', '#5a3d08'); b.position.z = sz * 0.0165; b.rotation.y = sz < 0 ? Math.PI : 0; P.coin.add(b); return b; }); }
    P.t0 = pl(['¿Y CON QUÉ', 'DINERO?'], { sz: [0.3, 0.36], ys: [0.33, 0.68], nbig: 2 }); q.add(P.t0); P.t1 = pl(['MÁS IMPUESTOS', 'A LAS GRANDES', 'FORTUNAS'], S3c); q.add(P.t1); P.t2 = pl(['EMPRESAS:', 'COMO MÍNIMO,', 'UN 20 %'], { sz: [0.3, 0.2, 0.3], ys: [0.22, 0.5, 0.79], nbig: 1 }); q.add(P.t2); }
  return P; }
// brillo de cada pantalla: la del capítulo, encendida; las demás, en penumbra; al final («ya has visto los cuatro programas») se encienden las cuatro
function finK(t) { return bump(t, TL.L[9] - 0.1, TL.L[10] + 0.4, 0.4, 0.4); }
function totK(o, t) { return o === CH.id ? 1 : 0.3 + 0.7 * finK(t); }
const OXK = -0.26;
function chapterAt(t, st) { const P = S.P, T = TL, id = CH.id;
  for (const o of ORDER) S.tot[o].mat.color.setScalar(SCREEN_I * totK(o, t));
  S.dims.forEach(d => { d.userData.pl.emissiveIntensity = 0; d.userData.tm.color.setScalar(0.1); });
  hookAt(t);
  { const q2 = x => Math.round(x * 20) / 20; wallDraw({ band: ORDER.map(o => q2(0.25 + 0.65 * (totK(o, t) - 0.3) / 0.7)), pill: '', pillA: 0, next: q2(bump(t, T.domingo - 0.15, T.L[10] + 0.5, 0.3, 0.3)), t1: '29N · EL DOMINGO', t2: 'DECIDES TÚ' }); }
  // los objetos (cada uno aparece con su palabra)
  const vis = (g, a, b) => { const k = bump(t, a, b, 0.001, 0.2); g.visible = k > 0.01; if (g.visible) g.scale.setScalar(Math.max(0.01, pop(t, a, 0.4)) * Math.min(1, k * 1.2)); return g.visible; }, ps = (o, t0, d = 0.35, s = 1) => o.scale.setScalar(Math.max(0.001, pop(t, t0, d)) * s);
  const sw = (a, b, t0) => { const f = t > t0; a.visible = !f; b.visible = f; ps(b, t0); };
  P.tabs.forEach((m, n) => { const a = T.L[4 + n] - 0.05, k = bump(t, a, T.L[5 + n] - 0.22, 0.001, 0.2); m.visible = k > 0.01; if (m.visible) m.scale.setScalar(Math.max(0.01, pop(t, a, 0.35)) * Math.min(1, k * 1.2)); });
  if (vis(P.prog, T.programa - 0.12, T.cuatro - 0.12)) P.book.rotation.y = 0.25 + 0.08 * Math.sin(t * 1.4);
  if (vis(P.tiles, T.cuatro - 0.08, T.L[4] - 0.3)) P.tile.forEach((m, i) => ps(m, T.cuatro - 0.05 + i * 0.1, 0.3));
  if (vis(P.jor, T.L[4] - 0.08, T.salario - 0.3)) { const k = sm5(seg(t, T.treinta - 0.05, T.treinta + 0.5)); const f = k > 0.5; P.j40.visible = !f; P.j32.visible = f; ps(P.j32, T.treinta + 0.2); P.jb.scale.set(Math.max(0.001, pop(t, T.jornada - 0.08, 0.35)) * lerp(1, 0.8, k), Math.max(0.001, pop(t, T.jornada - 0.08, 0.35)), 1);
    ps(P.j40, T.jornada - 0.05); ps(P.eq, T.cobrando - 0.08); ps(P.eqL, T.cobrando - 0.02); sw(P.jA, P.jB, T.empezando - 0.1); ps(P.jA, T.treinta - 0.1); const ft = t > T.treinta2 - 0.1; P.tick.visible = P.tickL.visible = ft; ps(P.tickL, T.treinta2 - 0.1); }
  if (vis(P.smi, T.salario - 0.25, T.L[5] - 0.22)) { const k = 0.6 * sm5(seg(t, T.sesenta - 0.25, T.sesenta + 0.45)) + 0.001; P.min.scale.y = k; P.min.position.y = 0.02 + 0.15 * k; P.line.scale.x = Math.max(0.001, win(t, T.sesenta - 0.1, 0.35)); ps(P.p60, T.sesenta + 0.3); ps(P.avg, T.salario - 0.15); }
  if (vis(P.viv, T.L[5] - 0.08, T.L[6] - 0.22)) { const f = t > T.tope - 0.1; P.blocks.forEach((b, i) => { b.scale.set(1, Math.max(0.001, pop(t, T.millon - 0.05 + i * 0.25, 0.45)), 1); b.visible = !f; }); P.vA.visible = !f; P.vB.visible = f; ps(P.vA, T.millon - 0.1); ps(P.vB, T.tope - 0.1);
    P.tag.visible = P.cap.visible = P.capL.visible = f; ps(P.tag, T.tope - 0.1); const c = sm5(seg(t, T.tope + 0.1, T.tope + 0.6)); P.cap.position.y = lerp(0.45, 0.26, c); ps(P.capL, T.tope + 0.45); P.capL.position.y = P.cap.position.y + 0.06; }
  if (vis(P.cri, T.L[6] - 0.08, T.L[7] - 0.22)) { ps(P.bottle, T.L[6] + 0.05); P.cubes.forEach((b, i) => ps(b, T.hijo - 0.1 + i * 0.1)); ps(P.e200, T.doscientos - 0.08); ps(P.mes, T.mes - 0.08); sw(P.fA, P.fB, T.ganes - 0.1); ps(P.fA, T.doscientos - 0.08); P.bottle.rotation.z = 0.08 * Math.sin(t * 2.2); }
  if (vis(P.com, T.L[7] - 0.08, T.L[8] - 0.22)) { ps(P.tray, T.comedor - 0.1); ps(P.free, T.gratis - 0.08); sw(P.cA, P.cB, T.gratis - 0.08); ps(P.cA, T.comedor - 0.1); P.tray.rotation.y = 0.15 * Math.sin(t * 1.5); }
  if (vis(P.tax, T.L[8] - 0.08, T.L[9] - 0.25)) { const f = t > T.impuestos - 0.1, f2 = t > T.empresas - 0.1; P.t0.visible = !f; P.t1.visible = f && !f2; P.t2.visible = f2; ps(P.t1, T.impuestos - 0.1); ps(P.t2, T.empresas - 0.1);
    { const ck = 1 - win(t, T.impuestos - 0.12, 0.2), a = t * 2.4; P.coin.visible = ck > 0.02; P.coin.scale.setScalar(Math.max(0.01, ck)); P.coin.rotation.y = a; P.coinF.forEach(b => b.material.color.setScalar(0.62 + 0.38 * Math.abs(Math.cos(a)))); }
    ps(P.safe, T.fortunas - 0.25); P.safe.visible = f; ps(P.ofi, T.empresas - 0.1); P.ofi.visible = f2; ps(P.p20, T.veinte - 0.1); P.p20.visible = t > T.veinte - 0.1; }
}
