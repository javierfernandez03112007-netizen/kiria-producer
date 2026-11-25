// ---------------------------------------------------------------- 29N · EL PSOE (capítulo de un partido; misma plantilla para los cuatro).
// Gancho: un candado gigante de combinación («PENSIONES EN LA CONSTITUCIÓN») delante del hemiciclo: la clave es 210 (tres quintos del Congreso) y
// ningún partido ha pasado de 202 → no cierra. Después, sobre el atril del PSOE y delante de la foto de su candidato, las medidas del programa como
// objetos (a la izquierda) con su rótulo (a la derecha). Al final, la intriga del siguiente capítulo sobre el atril de ese partido.
const CH = { id: 'psoe', next: 'vox' };
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
// las tres cifras en el instante t: giran al empezar, se paran en 2-1-0, pasan a 2-0-2 (el récord) y al final vuelven a girar (bucle)
function padDigits(t) { const A = [2, 1, 0], B = [2, 0, 2], out = [];
  for (let i = 0; i < 3; i++) { const rate = 7 + 2.5 * i, base = [3.3, 7.1, 5.6][i], a = TL.doscientos - 0.35 + 0.22 * i, b = TL.dos2 - 0.25 + 0.14 * i, c = TL.L[10] + 0.5 + 0.1 * i; let v;
    if (t < a - 0.8) v = base + rate * t;
    else if (t < a) { const v0 = base + rate * (a - 0.8), land = A[i] + 10 * Math.ceil((v0 + rate * 0.3 - A[i]) / 10), u = (t - (a - 0.8)) / 0.8; v = lerp(v0, land, 1 - Math.pow(1 - u, 3)); }
    else { v = A[i]; if (t >= b) { const u = clamp((t - b) / 0.45), d = ((B[i] - A[i]) % 10 + 10) % 10; v = A[i] + d * (1 - Math.pow(1 - u, 3)); }
      if (t >= c) { const sp = base + rate * (t - END), sc = base + rate * (c - END), m = Math.ceil((B[i] - sc) / 10), u = clamp((t - c) / 0.7); v = B[i] + (sp + 10 * m - B[i]) * u * u; } }
    out.push(((v % 10) + 10) % 10); }
  return out; }
function padAt(t) { const U = S.pad.userData, D = padDigits(t); for (let i = 0; i < 3; i++) U.dig[i].offset.y = 1 - (D[i] + 1) / 11;
  const tau = TL.dos2 + 0.4, pulse = Math.exp(-Math.pow((t - tau - 0.14) / 0.07, 2)) + 0.5 * Math.exp(-Math.pow((t - tau - 0.44) / 0.06, 2)), o = 1 - 0.9 * Math.min(1, pulse);   // el arco baja, choca y rebota: no cierra
  U.sh.position.y = U.BH / 2 + 0.15 * o; U.sh.rotation.y = 0.7 * o; S.pad.rotation.z = 0.035 * Math.sin(t * 46) * Math.min(1, pulse) + 0.012 * Math.sin(t * 0.9); S.pad.position.y = PADP[1] + 0.03 * Math.sin(t * 1.3);
  const vis = clamp(1 - win(t, TL.psoe - 0.25, 0.4) + win(t, TL.manda + 0.2, 0.45)); S.pad.visible = vis > 0.01; S.pad.scale.setScalar(Math.max(0.01, vis)); }
const PADP = [0, 3.5, -1.6];
// ---- los objetos de las medidas, sobre el atril del partido (y la intriga, sobre el atril del siguiente)
function buildProps(G) { const P = {}, id = CH.id, OX = -0.26, PX = 0.275, PW = 0.54, PH = 0.34, PY = 0.19, S3 = { sz: [0.4, 0.2, 0.17], ys: [0.28, 0.62, 0.84], nbig: 1 }, S3b = { sz: [0.36, 0.19, 0.26], ys: [0.25, 0.55, 0.81], nbig: 1 };
  const g = new THREE.Group(); g.position.set(0, STAGE.Y, 0.02); S.lect[id].add(g); P.g = g;
  const grp = () => { const q = new THREE.Group(); q.visible = false; g.add(q); return q; }, pl = (txt, o = {}) => { const p = plate(txt, PW, PH, { edge: PARTY[id].css, ...o }); p.position.set(PX, PY, 0.1); return p; }, slab = (w, d) => box(w, 0.02, d, stdM(0x1a2230, 0.5), OX, 0.01, 0);
  const lit = (col, I = 0.5) => nightMat(new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: I, roughness: 0.5 }));
  // «su programa trae quinientas»: el libro del programa
  { const q = P.prog = grp(), bk = new THREE.Group(); bk.position.set(OX, 0.185, 0); bk.rotation.set(0.05, 0.25, 0); q.add(bk); P.book = bk; bk.add(box(0.26, 0.35, 0.07, stdM(0xb31220, 0.5), 0, 0, 0)); bk.add(box(0.24, 0.33, 0.076, M.paper, 0.008, 0, 0));
    const cv = signPlane(0.26, 0.35, 512, (c, w, h) => { c.fillStyle = '#b31220'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; fitFont(c, 'PROGRAMA', 900, 80, w - 60); c.fillText('PROGRAMA', w / 2, h * 0.2); fitFont(c, PARTY[id].sig, 900, 150, w - 60); c.fillText(PARTY[id].sig, w / 2, h * 0.5); c.font = '700 44px Inter'; c.fillText('29N · 2026', w / 2, h * 0.78); }, { r: 0.5 }); cv.position.z = 0.039; bk.add(cv);
    q.add(pl(['500', 'COMPROMISOS', '114 PÁGINAS'], S3)); }
  // «cuatro que te tocan»
  { const q = P.tiles = grp(); P.tile = [1, 2, 3, 4].map(n => { const m = plate(String(n), 0.22, 0.22, { edge: PARTY[id].css }); m.position.set(-0.39 + (n - 1) * 0.26, 0.17, 0.08); q.add(m); return m; }); }
  // 1 · vivienda: el 1 % del PIB cada año (una moneda del montón) y 100.000 pisos públicos (bloques que suben)
  { const q = P.viv = grp(), stack = new THREE.Group(); stack.position.set(OX - 0.17, 0, 0); q.add(stack); P.stack = stack; const cg = [lit(0xf0c648, 0.42), lit(0xc9962e, 0.38)]; for (let i = 0; i < 9; i++) ad(stack, cyl(0.075, 0.075, 0.027, cg[i % 2], 28)).position.y = 0.014 + i * 0.03; const lb = plate('PIB', 0.16, 0.075, {}); lb.position.set(0, 0.13, 0.09); stack.add(lb);
    P.slice = cyl(0.075, 0.075, 0.012, nightMat(new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffc840, emissiveIntensity: 1.2, metalness: 0.8, roughness: 0.3 })), 28); q.add(P.slice);
    q.add(box(0.32, 0.02, 0.2, stdM(0x1a2230, 0.5), OX + 0.1, 0.01, 0)); P.blocks = [0, 1, 2].map(i => { const b = miniBlock(4 + i, [0xdfe3ea, 0xe9dcc4, 0xcfd8e6][i], 0.6); b.position.set(OX + i * 0.1, 0.02, (i % 2) * 0.05 - 0.02); q.add(b); return b; });
    q.add(pl(['100.000', 'PISOS PÚBLICOS', '1 % DEL PIB CADA AÑO'], S3)); }
  // 2a · trabajo: la jornada, de 40 a 37,5 horas (16 casillas de dos horas y media: se va una)
  { const q = P.jor = grp(); q.add(box(0.46, 0.02, 0.1, stdM(0x1a2230, 0.5), OX, 0.05, 0)); const cm = lit(0xffd66a, 0.55); P.cells = []; for (let i = 0; i < 16; i++) { const d = box(0.023, 0.2, 0.06, cm, OX - 0.2025 + i * 0.027, 0.16, 0); q.add(d); P.cells.push(d); }
    P.j40 = plate('40 h', 0.2, 0.085, {}); P.j40.position.set(OX, 0.32, 0.06); q.add(P.j40); P.j37 = plate('37,5 h', 0.24, 0.085, { ink: '#ffd66a' }); P.j37.position.set(OX - 0.016, 0.32, 0.06); q.add(P.j37);
    P.p40 = pl(['40 HORAS', 'A LA SEMANA', 'HOY'], { ...S3, edge: '#8a93a6' }); q.add(P.p40); P.p37 = pl(['37,5 HORAS', 'A LA SEMANA'], { sz: [0.4, 0.22], ys: [0.36, 0.74], ink: '#ffd66a' }); q.add(P.p37); }
  // 2b · el salario mínimo, por ley, en el 60 % del sueldo medio (dos barras y la raya del 60 %)
  { const q = P.smi = grp(); q.add(slab(0.5, 0.14)); P.avg = box(0.13, 0.3, 0.09, stdM(0x8a93a6, 0.6), OX - 0.11, 0.17, 0); q.add(P.avg); P.min = box(0.13, 0.3, 0.09, lit(0x5cf2e6, 0.5), OX + 0.11, 0.17, 0); q.add(P.min);
    const la = plate(['SUELDO', 'MEDIO'], 0.2, 0.1, { sz: [0.4, 0.4], ys: [0.3, 0.72], nbig: 2 }); la.position.set(OX - 0.11, 0.07, 0.06); q.add(la); const lb = plate(['SALARIO', 'MÍNIMO'], 0.2, 0.1, { sz: [0.4, 0.4], ys: [0.3, 0.72], nbig: 2 }); lb.position.set(OX + 0.11, 0.07, 0.06); q.add(lb);
    P.line = box(0.5, 0.006, 0.012, nightMat(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd66a, emissiveIntensity: 2.2 })), OX, 0.2, 0.05); q.add(P.line);
    P.p60 = plate('60 %', 0.15, 0.07, { ink: '#ffd66a' }); P.p60.position.set(OX + 0.11, 0.255, 0.08); q.add(P.p60);
    q.add(pl(['SALARIO MÍNIMO', '60 % DEL SUELDO MEDIO', 'POR LEY'], { sz: [0.27, 0.19, 0.25], ys: [0.24, 0.52, 0.8], nbig: 1 })); }
  // 3 · familias: paga por crianza para todos los hogares con hijos (biberón y cubos); «cuánto, no lo dice»
  { const q = P.cri = grp(); q.add(slab(0.5, 0.2)); const bt = new THREE.Group(); bt.position.set(OX - 0.15, 0.02, 0.02); q.add(bt); P.bottle = bt;
    ad(bt, cyl(0.039, 0.039, 0.08, stdM(0xfaf6ea, 0.5), 20)).position.y = 0.045; ad(bt, cyl(0.04, 0.04, 0.14, new THREE.MeshPhysicalMaterial({ color: 0xeaf4ff, roughness: 0.1, transparent: true, opacity: 0.5 }), 20)).position.y = 0.07; ad(bt, cyl(0.045, 0.045, 0.03, stdM(0x4aa3df, 0.5), 20)).position.y = 0.155; ad(bt, cyl(0.012, 0.028, 0.045, stdM(0xe9c9a0, 0.6), 14)).position.y = 0.19;
    P.cubes = [['A', 0xe2574c, 0, 0], ['B', 0x4aa3df, 0.085, 0], ['C', 0x58b368, 0.042, 0.085]].map(([ch, col, x, y]) => { const b = box(0.08, 0.08, 0.08, stdM(col, 0.6), OX + 0.02 + x, 0.06 + y, 0); q.add(b); const l = plate(ch, 0.07, 0.07, { bg: 'rgba(0,0,0,0)' }); l.position.z = 0.041; b.add(l); return b; });
    P.kids = plate('8.000.000 DE NIÑOS', 0.44, 0.07, { ink: '#ffd66a' }); P.kids.position.set(OX, 0.325, 0.08); q.add(P.kids);
    P.c1 = pl(['PAGA POR CRIANZA', 'TODOS LOS HOGARES', 'CON HIJOS'], { sz: [0.26, 0.2, 0.2], ys: [0.24, 0.55, 0.8], nbig: 1 }); q.add(P.c1); P.c2 = pl(['¿CUÁNTO?', 'EL PROGRAMA', 'NO LO DICE'], { sz: [0.36, 0.2, 0.2], ys: [0.27, 0.6, 0.82], nbig: 1, ink: '#ffd66a' }); q.add(P.c2); }
  // 4a · estudiantes: el primer curso de la universidad pública, gratis (birrete sobre libros)
  { const q = P.uni = grp(); q.add(slab(0.5, 0.2)); [[0x2f5fa8, 0], [0xb7a68a, 0.045], [0x3f8a5e, 0.09]].forEach(([col, y], i) => { const b = box(0.24 - i * 0.02, 0.04, 0.17, stdM(col, 0.6), OX + (i - 1) * 0.01, 0.04 + y, 0); b.rotation.y = (i - 1) * 0.12; q.add(b); });
    const cap = new THREE.Group(); cap.position.set(OX, 0.19, 0); cap.rotation.set(0.12, 0.5, 0.06); q.add(cap); P.cap = cap; const km = stdM(0x15171c, 0.5); cap.add(cyl(0.07, 0.075, 0.05, km, 20)); cap.add(box(0.24, 0.012, 0.24, km, 0, 0.03, 0)); const tas = cyl(0.006, 0.006, 0.11, stdM(0xffd66a, 0.4), 8); tas.position.set(0.11, -0.02, 0.11); cap.add(tas); ad(cap, sph(0.014, stdM(0xffd66a, 0.4), 10, 8)).position.set(0.11, -0.08, 0.11);
    P.free = badge('0 €', 0.15, '#ffd66a', '#12100a'); P.free.position.set(OX + 0.18, 0.3, 0.1); q.add(P.free); q.add(pl(['1.er CURSO', 'UNIVERSIDAD PÚBLICA', 'GRATIS'], S3b)); }
  // 4b · ayuda de hasta 200 € al año para el dentista (una muela)
  { const q = P.den = grp(); q.add(slab(0.4, 0.2)); const th = new THREE.Group(); th.position.set(OX, 0.2, 0); q.add(th); P.tooth = th; const wm = new THREE.MeshPhysicalMaterial({ color: 0xfbfaf4, roughness: 0.25, clearcoat: 0.6 });
    const cr = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), wm); cr.scale.set(0.1, 0.085, 0.075); cr.position.y = 0.03; th.add(cr);
    for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), wm); b.scale.set(0.05, 0.035, 0.05); b.position.set(s * 0.045, 0.1, 0); th.add(b); const r = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.15, 16), wm); r.position.set(s * 0.045, -0.085, 0); r.rotation.z = Math.PI + s * 0.12; th.add(r); } shadowAll(th, true, true);
    P.eur = badge('200 €', 0.17, '#ffd66a', '#12100a'); P.eur.position.set(OX + 0.18, 0.29, 0.1); q.add(P.eur); q.add(pl(['DENTISTA', 'AYUDA DE HASTA', '200 € AL AÑO'], S3b)); }
  // «¿y con qué dinero?»: impuestos nuevos a los grandes patrimonios (caja fuerte) y a quien especula con la vivienda (casa con %)
  { const q = P.tax = grp(); q.add(slab(0.52, 0.2)); const safe = new THREE.Group(); safe.position.set(OX - 0.13, 0.02, 0); q.add(safe); P.safe = safe; const sm = stdM(0x66717f, 0.4, { metalness: 0.35 });
    safe.add(box(0.2, 0.22, 0.15, sm, 0, 0.11, 0)); safe.add(box(0.16, 0.18, 0.01, stdM(0x8793a3, 0.35, { metalness: 0.35 }), 0, 0.11, 0.078)); const dial = cyl(0.03, 0.03, 0.02, M.steel, 20); dial.rotation.x = Math.PI / 2; dial.position.set(0, 0.11, 0.09); safe.add(dial); safe.add(box(0.012, 0.05, 0.012, M.steel, 0.055, 0.11, 0.09));
    for (let i = 0; i < 3; i++) ad(safe, cyl(0.05, 0.05, 0.02, lit(i % 2 ? 0xc9962e : 0xf0c648, 0.4), 20)).position.set(-0.02 + i * 0.02, 0.235 + i * 0.022, 0);
    P.hs = miniHouse(0xf2efe8, 0xb8452f, 1.0); P.hs.position.set(OX + 0.13, 0.02, 0); q.add(P.hs); P.pct = badge('%', 0.13, '#ffd66a', '#12100a'); P.pct.position.set(OX + 0.2, 0.28, 0.12); q.add(P.pct);
    P.coin = new THREE.Group(); P.coin.position.set(OX, 0.2, 0); q.add(P.coin); { const c = cyl(0.13, 0.13, 0.03, lit(0xc9962e, 0.4), 40); c.rotation.x = Math.PI / 2; P.coin.add(c); P.coinF = [-1, 1].map(sz => { const b = badge('€', 0.262, '#f0c648', '#5a3d08'); b.position.z = sz * 0.0165; b.rotation.y = sz < 0 ? Math.PI : 0; P.coin.add(b); return b; }); }
    P.t0 = pl(['¿Y CON QUÉ', 'DINERO?'], { sz: [0.3, 0.36], ys: [0.33, 0.68], nbig: 2 }); q.add(P.t0); P.t1 = pl(['IMPUESTOS NUEVOS', 'GRANDES PATRIMONIOS', 'Y ESPECULACIÓN'], { sz: [0.25, 0.19, 0.19], ys: [0.24, 0.54, 0.79], nbig: 1 }); q.add(P.t1); }
  // la intriga del siguiente capítulo, sobre SU atril: el IRPF según los hijos (el programa no da cifras: «−?»)
  { const L2 = S.lect[CH.next], gg = new THREE.Group(); gg.position.set(0, STAGE.Y, 0.02); L2.add(gg); const q = P.nx = new THREE.Group(); q.visible = false; gg.add(q); q.add(slab(0.5, 0.12));
    const card = signPlane(0.46, 0.3, 768, (c, w, h) => { c.fillStyle = '#f6f2e8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c9c2b2'; c.lineWidth = 8; c.strokeRect(8, 8, w - 16, h - 16); c.textBaseline = 'middle';
      [['SIN HIJOS', ''], ['1 HIJO', '−?'], ['2 HIJOS', '−?'], ['3 HIJOS', '−?']].forEach(([a, b], i) => { const y = h * (0.15 + i * 0.235); c.fillStyle = '#1a1d22'; c.textAlign = 'left'; c.font = '900 58px Inter'; c.fillText(a, 40, y); c.textAlign = 'right'; c.fillStyle = i ? '#0a7a3c' : '#6b7280'; c.fillText(i ? 'IRPF ' + b : 'IRPF', w - 40, y); if (i < 3) { c.fillStyle = '#d7dbe2'; c.fillRect(36, y + h * 0.115, w - 72, 4); } }); }, { r: 0.8 });
    card.position.set(OX + 0.01, 0.185, 0.02); card.rotation.set(-0.04, 0.08, 0); q.add(card); P.card = card;
    const p = plate(['IRPF MÁS BAJO', 'SEGÚN LOS HIJOS', '¿CUÁNTO?'], PW, PH, { edge: PARTY[CH.next].css, sz: [0.26, 0.2, 0.3], ys: [0.22, 0.5, 0.8], nbig: 1 }); p.position.set(PX, PY, 0.1); q.add(p); P.np = p; }
  return P; }
// brillo de cada pantalla: la del capítulo, encendida; las demás, en penumbra; en la intriga se enciende la del siguiente
function teaserK(t) { return bump(t, TL.vox - 0.35, TL.L[10] + 0.3, 0.35, 0.4); }
function totK(o, t) { const k = teaserK(t); return o === CH.id ? 1 - 0.55 * k : o === CH.next ? 0.3 + 0.7 * k : 0.3; }
function chapterAt(t, st) { const P = S.P, T = TL, id = CH.id;
  for (const o of ORDER) S.tot[o].mat.color.setScalar(SCREEN_I * totK(o, t));
  S.dims.forEach(d => { d.userData.pl.emissiveIntensity = 0; d.userData.tm.color.setScalar(0.1); });
  padAt(t);
  // la pantalla grande: el hemiciclo (210 dorados → el récord, 202, y los 8 que faltan) y, al final, el aviso del siguiente capítulo
  { const q2 = x => Math.round(x * 20) / 20, hA = Math.max(1 - win(t, T.psoe - 0.2, 0.6), win(t, T.L[10] + 0.25, 0.5)), rec = t > T.record - 0.15 && t < T.L[4] ? 1 : 0;
    const lit = t > T.L[4] ? 0 : rec ? 202 : Math.round(210 * seg(t, T.hacen - 0.1, T.doscientos + 0.35));
    wallDraw({ band: ORDER.map(o => q2(0.25 + 0.65 * (totK(o, t) - 0.3) / 0.7)), hemiA: q2(hA), lit, rec, blink: rec ? Math.floor(t * 5) % 2 : 0, lab: q2(win(t, T.doscientos - 0.15, 0.3) * (1 - win(t, T.E[2] + 0.3, 0.35))), next: q2(bump(t, T.proximo + 0.12, T.vox + 0.3, 0.3, 0.3)) }); }
  // los objetos (cada uno aparece con su palabra)
  const vis = (g, a, b) => { const k = bump(t, a, b, 0.001, 0.2); g.visible = k > 0.01; if (g.visible) g.scale.setScalar(Math.max(0.01, pop(t, a, 0.4)) * Math.min(1, k * 1.2)); return g.visible; }, ps = (o, t0, d = 0.35, s = 1) => o.scale.setScalar(Math.max(0.001, pop(t, t0, d)) * s);
  if (vis(P.prog, T.programa - 0.12, T.cuatro - 0.12)) P.book.rotation.y = 0.25 + 0.08 * Math.sin(t * 1.4);
  if (vis(P.tiles, T.cuatro - 0.08, T.L[4] - 0.3)) P.tile.forEach((m, i) => ps(m, T.cuatro - 0.05 + i * 0.1, 0.3));
  if (vis(P.viv, T.L[4] - 0.08, T.L[5] - 0.22)) { const k = sm5(seg(t, T.pib - 0.1, T.cien - 0.05)); P.slice.position.set(lerp(-0.43, -0.2, k), lerp(0.29, 0.1, k) + 0.1 * Math.sin(k * Math.PI), 0); P.slice.rotation.z = -k * 1.2; P.slice.visible = t > T.uno4 && k < 0.97; ps(P.stack, T.uno4 - 0.05);
    P.blocks.forEach((b, i) => { b.scale.set(1, Math.max(0.001, pop(t, lerp(T.cien - 0.05, T.publicos - 0.05, i / 2), 0.45)), 1); }); }
  if (vis(P.jor, T.L[5] - 0.08, T.salario - 0.3)) { const f = win(t, T.treinta5 + 0.1, 0.5), c = P.cells[15]; c.scale.set(1, Math.max(0.02, 1 - f), 1); c.position.y = 0.06 + 0.1 * Math.max(0.02, 1 - f); c.visible = f < 0.98;
    P.cells.forEach((d, i) => { if (i < 15) d.scale.setScalar(Math.max(0.001, pop(t, T.jornada - 0.05 + i * 0.02, 0.25))); }); P.p40.visible = P.j40.visible = f < 0.5; P.p37.visible = P.j37.visible = f >= 0.5; ps(P.p37, T.treinta5 + 0.32); ps(P.j37, T.treinta5 + 0.32); }
  if (vis(P.smi, T.salario - 0.25, T.L[6] - 0.22)) { const k = 0.6 * sm5(seg(t, T.sesenta - 0.25, T.sesenta + 0.45)) + 0.001; P.min.scale.y = k; P.min.position.y = 0.02 + 0.15 * k; P.line.scale.x = Math.max(0.001, win(t, T.sesenta - 0.1, 0.35)); ps(P.p60, T.sesenta + 0.3); ps(P.avg, T.salario - 0.15); }
  if (vis(P.cri, T.L[6] - 0.08, T.L[7] - 0.22)) { ps(P.bottle, T.paga - 0.05); P.cubes.forEach((b, i) => ps(b, T.crianza - 0.05 + i * 0.12)); ps(P.kids, T.ocho - 0.05); const f = t > T.cuanto - 0.08; P.c1.visible = !f; P.c2.visible = f; ps(P.c2, T.cuanto - 0.08); P.bottle.rotation.z = 0.08 * Math.sin(t * 2.2); }
  if (vis(P.uni, T.L[7] - 0.08, T.ayuda - 0.45)) { ps(P.cap, T.primer - 0.05); ps(P.free, T.gratis - 0.08); P.cap.rotation.y = 0.5 + 0.15 * Math.sin(t * 1.6); }
  if (vis(P.den, T.ayuda - 0.35, T.L[8] - 0.22)) { ps(P.tooth, T.ayuda - 0.25); ps(P.eur, T.doscientos7 - 0.08); P.tooth.rotation.y = 0.35 * Math.sin(t * 1.5); }
  if (vis(P.tax, T.L[8] - 0.08, T.L[9] - 0.25)) { const f = t > T.impuestos - 0.1; P.t0.visible = !f; P.t1.visible = f; ps(P.t1, T.impuestos - 0.1); { const ck = 1 - win(t, T.grandes - 0.12, 0.2), a = t * 2.4; P.coin.visible = ck > 0.02; P.coin.scale.setScalar(Math.max(0.01, ck)); P.coin.rotation.y = a; P.coinF.forEach(b => b.material.color.setScalar(0.62 + 0.38 * Math.abs(Math.cos(a)))); } ps(P.safe, T.grandes - 0.1); ps(P.hs, T.especula - 0.1); ps(P.pct, T.especula + 0.15); }
  if (vis(P.nx, T.vox + 0.25, T.L[10] + 0.2)) { ps(P.card, T.irpf - 0.15); ps(P.np, T.promete - 0.1); }
}
