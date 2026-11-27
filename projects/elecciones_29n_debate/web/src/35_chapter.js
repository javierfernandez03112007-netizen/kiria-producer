// ---------------------------------------------------------------- 29N · EL DEBATE A CUATRO (jueves 26-11-2026, 22:00). Vídeo del viernes 27: qué pasó.
// El plató de los cuatro atriles (fotos reales) con un MARCADOR de pabellón colgado encima (el tiempo lo controlaron árbitros de baloncesto) y un reloj de
// posesión encima de cada pantalla. Cada ataque: el reloj del que habla corre, un haz de luz va de su pantalla a la del atacado y el marcador enseña la
// frase. Mismo trato para los cuatro: un ataque de cada uno, el mismo haz, el mismo color y el mismo sitio. Al final, el marcador no da resultado
// («¿quién ganó?»: la ley prohíbe publicar encuestas) y vuelve a 20:00 (bucle).
const CH = { id: null, next: null };
const SB = { X: 0, Y: 3.78, Z: -0.62, W: 2.8, H: 1.266 };              // el marcador
const CW = 2048, CHh = 926, AMB = '#ffb547', LED = '#ff5a3c', GOLDC = '#ffd66a';
const BEAM_Y = 2.86;
const SIG = { pp: 'FEIJÓO', psoe: 'SÁNCHEZ', vox: 'ABASCAL', fa: 'COLAU' };
// ---- marcador: un lienzo que se repinta solo cuando cambia lo que enseña
function ledText(c, s, x, y, px, col, align = 'center') { c.textAlign = align; c.textBaseline = 'middle'; c.font = `700 ${px}px DejaVuMono, monospace`;
  c.fillStyle = 'rgba(255,90,60,0.07)'; c.fillText(s.replace(/[0-9]/g, '8'), x, y); c.shadowColor = col; c.shadowBlur = px * 0.18; c.fillStyle = col; c.fillText(s, x, y); c.shadowBlur = 0; }
const mmss = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const mss = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function sbDraw(st) { const key = JSON.stringify(st); if (key === S.sbKey) return; S.sbKey = key; const c = S.sbC.getContext('2d'), W = CW, H = CHh;
  c.fillStyle = '#05070a'; c.fillRect(0, 0, W, H); c.strokeStyle = '#1d2430'; c.lineWidth = 10; c.strokeRect(5, 5, W - 10, H - 10);
  c.fillStyle = '#0d1118'; c.fillRect(10, 10, W - 20, 130); c.textBaseline = 'middle';
  c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.font = '900 76px Inter'; c.fillText('DEBATE 29N', 46, 76);
  if (st.head) { c.textAlign = 'right'; c.fillStyle = AMB; fitFont(c, st.head, 900, 66, 1180); c.fillText(st.head, W - 46, 76); }
  const M = st.mode, y0 = 150, y1 = H - 20;
  if (M === 'clock') { ledText(c, mmss(st.clock), W / 2, (y0 + y1) / 2 + 10, 440, LED); }
  else if (M === 'aud') { c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.font = '900 300px Inter'; c.fillText(st.aud, W / 2, 400); c.fillStyle = '#c9d5f2'; c.font = '900 92px Inter'; c.fillText('ESPECTADORES DE MEDIA', W / 2, 640);
    c.fillStyle = AMB; c.font = '900 78px Inter'; c.fillText('5 BLOQUES · 20 MINUTOS CADA UNO', W / 2, 800); }
  else if (M === 'blocks') { const B = ['VIVIENDA', 'ECONOMÍA', 'SERVICIOS PÚBLICOS', 'CORRUPCIÓN', 'INMIGRACIÓN'];
    B.forEach((b, i) => { const y = 215 + i * 142, on = i < st.nb, cur = i === st.nb - 1; c.fillStyle = cur ? '#2a2006' : '#0d1118'; rr(c, 60, y - 58, 1240, 116, 20); c.fill();
      c.textAlign = 'left'; c.fillStyle = on ? (cur ? GOLDC : '#ffffff') : '#3a4250'; c.font = '900 84px Inter'; c.fillText((i + 1) + '  ' + b, 100, y + 4); });
    ledText(c, mmss(st.clock), 1660, 520, 230, LED); c.textAlign = 'center'; c.fillStyle = '#c9d5f2'; c.font = '900 60px Inter'; c.fillText('POR BLOQUE', 1660, 700); }
  else if (M === 'atk') { c.textAlign = 'center'; const a = st.a, b = [].concat(st.b), NM = st.party ? PARTY : null, nm = o => NM ? PARTY[o].sig : SIG[o];
    c.font = '900 104px Inter'; const parts = [[SIG[a], PARTY[a].css], ['  →  ', '#c9d5f2'], [nm(b[0]), PARTY[b[0]].css]];
    if (b.length > 1) parts.push([' Y ', '#c9d5f2'], [nm(b[1]), PARTY[b[1]].css]);
    let tw = parts.reduce((s, [t]) => s + c.measureText(t).width, 0), x = W / 2 - tw / 2; c.textAlign = 'left';
    for (const [t, col] of parts) { c.fillStyle = col; c.fillText(t, x, 230); x += c.measureText(t).width; }
    c.textAlign = 'center'; (st.q || []).forEach((q, i) => { const n = st.q.length, big = st.qbig ?? 150; c.fillStyle = i === 0 && st.qc0 ? st.qc0 : '#ffffff'; fitFont(c, q, 900, i === 0 ? big : (st.qsmall ?? 96), W - 160); c.fillText(q, W / 2, 470 + (i - (n - 1) / 2) * (n > 2 ? 150 : 190)); });
    if (st.note) { c.fillStyle = '#c9d5f2'; fitFont(c, st.note, 900, 66, W - 200); c.fillText(st.note, W / 2, 790); } }
  else if (M === 'open') { c.textAlign = 'center'; c.fillStyle = PARTY.fa.css; c.font = '900 92px Inter'; c.fillText('COLAU PIDE CONDENAR', W / 2, 225);
    c.fillStyle = '#ffffff'; c.font = '900 210px Inter'; c.fillText('49', W / 2 - 560, 440); c.textAlign = 'left'; c.font = '900 84px Inter'; c.fillText('ASESINATOS', W / 2 - 400, 395); c.fillText('MACHISTAS DEL AÑO', W / 2 - 400, 490);
    const row = (y, lab, ids, k) => { if (!k) return; c.globalAlpha = k; c.font = '900 84px Inter'; const parts = [[lab, '#c9d5f2']].concat(ids.flatMap((o, i) => (i ? [[' · ', '#c9d5f2']] : []).concat([[SIG[o], PARTY[o].css]]))); let x = W / 2 - parts.reduce((s2, [t2]) => s2 + c.measureText(t2).width, 0) / 2;
      c.textAlign = 'left'; for (const [t2, cl] of parts) { c.fillStyle = cl; c.fillText(t2, x, y); x += c.measureText(t2).width; } c.globalAlpha = 1; };
    row(660, 'SE SUMARON: ', ['psoe', 'pp'], st.k1); row(800, 'NO SE SUMÓ: ', ['vox'], st.k2); }
  else if (M === 'dato') { const row = (y, a, b, txt, col, k) => { c.globalAlpha = k; c.textAlign = 'left'; c.font = '900 92px Inter'; const parts = [[SIG[a], PARTY[a].css], [' · ', '#c9d5f2'], [SIG[b], PARTY[b].css]]; let x = W / 2 - parts.reduce((s2, [t2]) => s2 + c.measureText(t2).width, 0) / 2;
      for (const [t2, cl] of parts) { c.fillStyle = cl; c.fillText(t2, x, y); x += c.measureText(t2).width; } c.textAlign = 'center'; c.fillStyle = col; c.font = '900 130px Inter'; c.fillText(txt, W / 2, y + 135); c.globalAlpha = 1; };
    row(300, 'psoe', 'fa', 'SE TUTEARON', GOLDC, st.k1); row(610, 'pp', 'vox', 'APENAS SE HABLARON', '#9aa4b4', st.k2); }
  else if (M === 'end') { c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.font = '900 150px Inter'; c.fillText('¿QUIÉN GANÓ?', W / 2, 300);
    if (st.k1) { c.globalAlpha = st.k1; c.fillStyle = AMB; fitFont(c, 'ENCUESTAS PROHIBIDAS HASTA EL DOMINGO', 900, 96, W - 160); c.fillText('ENCUESTAS PROHIBIDAS HASTA EL DOMINGO', W / 2, 520); c.fillStyle = '#8a93a6'; c.font = '900 56px Inter'; c.fillText('LEY ELECTORAL · ART. 69.7', W / 2, 630); c.globalAlpha = 1; }
    if (st.k2) { c.globalAlpha = st.k2; c.fillStyle = GOLDC; c.font = '900 130px Inter'; c.fillText('LO DECIDES TÚ', W / 2, 800); c.globalAlpha = 1; } }
  S.sbT.needsUpdate = true; }
function shotDraw(i, st) { const k = JSON.stringify(st), S2 = S.shot[i]; if (k === S2.key) return; S2.key = k; const c = S2.c.getContext('2d'), w = 512, h = 224;
  c.fillStyle = '#05070a'; c.fillRect(0, 0, w, h); c.strokeStyle = st.on ? PARTY[ORDER[i]].css : '#1d2430'; c.lineWidth = 12; c.strokeRect(6, 6, w - 12, h - 12);
  ledText(c, st.q ? '?' : mss(st.s), w / 2, h / 2 + 6, 150, st.on ? LED : 'rgba(255,90,60,0.45)'); S2.t.needsUpdate = true; }
// ---- haz de luz de una pantalla a otra (crece de la del que habla a la del atacado) y punta de flecha
function beam(a, b, col, r = 0.02, dz = 0.25, op = 1) { const A = S.top[a], B = S.top[b], d = A.distanceTo(B), mid = A.clone().add(B).multiplyScalar(0.5); mid.y += 0.2 + 0.045 * d; mid.z += dz;
  const curve = new THREE.QuadraticBezierCurve3(A.clone().add(_v(0, 0, dz)), mid, B.clone().add(_v(0, 0, dz))), geo = new THREE.TubeGeometry(curve, 90, r, 8, false);
  const m = new THREE.MeshBasicMaterial({ color: col, toneMapped: false, transparent: op < 1, opacity: op }); const mesh = new THREE.Mesh(geo, m); mesh.visible = false; S.G.add(mesh);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 3.2, r * 9, 14), m); tip.visible = false; S.G.add(tip); const end = curve.getPoint(1), tan = curve.getTangent(1);
  tip.position.copy(end); tip.quaternion.setFromUnitVectors(_v(0, 1, 0), tan); return { mesh, tip, n: geo.index.count, curve }; }
function beamAt(B, t, wins, tip = true) { let a = -1, b = -1; for (const w of wins) if (t > w[0] && t < w[1]) { a = w[0]; b = w[1]; } const k = clamp((t - a) / 0.45), vis = a >= 0; B.mesh.visible = vis; B.tip.visible = tip && vis && k >= 1; if (!vis) return;
  B.mesh.geometry.setDrawRange(0, Math.max(6, Math.round(B.n * sm5(k) / 6) * 6)); const p = 0.75 + 0.25 * Math.sin(t * 9); B.mesh.material.color.setScalar ? 0 : 0; B.mesh.scale.setScalar(1); B.tip.scale.setScalar(Math.max(0.01, pop(t, a + 0.45, 0.3))); }
function buildHook(G) { S.G = G;
  // el marcador colgado: caja, cara (lienzo), dos cables al techo
  const g = new THREE.Group(); g.position.set(SB.X, SB.Y, SB.Z); G.add(g); S.sb = g; g.add(box(SB.W + 0.08, SB.H + 0.08, 0.16, new THREE.MeshBasicMaterial({ color: 0x14181f }), 0, 0, -0.085));
  S.sbC = cnv(CW, CHh); S.sbT = new THREE.CanvasTexture(S.sbC); S.sbT.colorSpace = THREE.SRGBColorSpace; S.sbT.anisotropy = 8;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(SB.W, SB.H), new THREE.MeshBasicMaterial({ map: S.sbT, toneMapped: false })); face.position.z = 0.002; g.add(face);
  for (const sx of [-1, 1]) ad(g, cyl(0.012, 0.012, 3.0, new THREE.MeshBasicMaterial({ color: 0x2a3140 }), 16)).position.set(sx * SB.W * 0.38, SB.H / 2 + 1.5, -0.08);
  // los relojes de posesión, encima de cada pantalla, y el punto de salida de los haces
  G.updateMatrixWorld(true); S.shot = []; S.top = {}; ORDER.forEach((o, i) => { S.tot[o].g.updateWorldMatrix(true, true); const bb = new THREE.Box3().setFromObject(S.tot[o].g), cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
    const q = new THREE.Group(); q.position.set(cx, bb.max.y + 0.14, cz + 0.06); q.rotation.y = lectRy(i); G.add(q); q.add(box(0.56, 0.26, 0.12, new THREE.MeshBasicMaterial({ color: 0x14181f }), 0, 0, -0.065));
    const c = cnv(512, 224), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const f = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.227), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); f.position.z = 0.002; q.add(f);
    S.shot.push({ g: q, c, t, key: '' }); S.top[o] = _v(cx, BEAM_Y, cz + 0.1); });
  const GC = 0xffd66a; S.bm = { pp_psoe: beam('pp', 'psoe', GC), fa_pp: beam('fa', 'pp', GC), pp_fa: beam('pp', 'fa', GC), vox_psoe: beam('vox', 'psoe', GC), psoe_pp: beam('psoe', 'pp', GC), psoe_vox: beam('psoe', 'vox', GC), fa_vox: beam('fa', 'vox', GC),
    d1: beam('psoe', 'fa', GC, 0.02, 0.12), d2: beam('pp', 'vox', 0x8a93a6, 0.012, 0.38, 0.55) };
  S.tu = badge('TÚ', 0.2, GOLDC, '#12100a'); S.tu.position.copy(S.bm.d1.curve.getPoint(0.62)).add(_v(0, -0.12, 0.05)); S.tu.visible = false; G.add(S.tu);
  S.dots = badge('…', 0.16, '#8a93a6', '#12100a'); S.dots.position.copy(S.bm.d2.curve.getPoint(0.5)).add(_v(0, -0.1, 0.05)); S.dots.visible = false; G.add(S.dots); }
function buildProps(G) { return {}; }
// ---- quién está «en pista» en cada momento (brillo de su pantalla) y los ataques
function atkList() { const T = TL; return [
  { a: 'fa', b: [], t0: T.L[3] - 0.1, t1: T.L[4] - 0.1 },
  { a: 'pp', b: 'psoe', t0: T.L[5] - 0.1, t1: T.L[6] - 0.1 },
  { a: 'fa', b: 'pp', t0: T.L[6] - 0.1, t1: T.L[7] - 0.1 },
  { a: 'pp', b: 'fa', t0: T.L[7] - 0.1, t1: T.L[8] - 0.1 },
  { a: 'vox', b: 'psoe', t0: T.L[8] - 0.1, t1: T.L[9] - 0.1 },
  { a: 'psoe', b: ['pp', 'vox'], t0: T.L[9] - 0.1, t1: T.L[10] - 0.1 },
  { a: 'psoe', b: ['pp', 'vox'], t0: T.L[10] - 0.1, t1: T.L[11] - 0.1 },
  { a: 'fa', b: 'vox', t0: T.L[11] - 0.1, t1: T.L[12] - 0.1 }]; }
function totK(o, t) { const A = atkList(); for (const x of A) if (t > x.t0 - 0.15 && t < x.t1 - 0.05) { const on = x.a === o || [].concat(x.b).includes(o); return on ? 1 : 0.38; } return 0.9; }
function chapterAt(t, st) { const T = TL, A = atkList();
  for (const o of ORDER) S.tot[o].mat.color.setScalar(SCREEN_I * totK(o, t));
  S.dims.forEach(d => { d.userData.pl.emissiveIntensity = 0; d.userData.tm.color.setScalar(0.1); });
  { const q2 = x => Math.round(x * 20) / 20; wallDraw({ band: ORDER.map(o => q2(0.25 + 0.65 * (totK(o, t) - 0.3) / 0.7)), pill: '', pillA: 0, next: 0 }); }
  // relojes de posesión: 5:00 para todos; en cada ataque corre el del que habla; en el «¿quién ganó?», interrogaciones; al final, otra vez 5:00
  const shot = ORDER.map(() => 300); let act = -1;
  A.forEach(x => { const i = ORDER.indexOf(x.a); if (t > x.t0) shot[i] = 300 - Math.min(t, x.t1) + x.t0; if (t > x.t0 && t < x.t1) act = i; });
  const lit = ORDER.map((o, i) => t > T.cuatro - 0.1 + i * 0.12), qm = t > T.gano - 0.1 && t < T.manda + 0.3, reset = t > T.manda + 0.3;
  ORDER.forEach((o, i) => { shotDraw(i, { s: reset ? 300 : Math.round(shot[i]), on: (i === act || (t < T.L[2] && lit[i]) || qm) && !reset ? 1 : 0, q: qm ? 1 : 0 }); S.shot[i].g.scale.setScalar(Math.max(0.01, t < T.L[2] ? pop(t, T.cuatro - 0.1 + i * 0.12, 0.3) || 0.001 : 1)); });
  if (t < T.cuatro - 0.1) ORDER.forEach((o, i) => { S.shot[i].g.scale.setScalar(0.001); });
  // el marcador
  let s; const after = (w, d = 0.12) => t > w - d;
  if (t < T.L[2] - 0.15 || t > T.manda + 0.3) s = { mode: 'clock', head: t < T.L[2] ? 'BLOQUE 1 · CRONO: ÁRBITROS DE BALONCESTO' : 'BLOQUE 1', clock: 1200 - Math.max(0, Math.floor((t > T.manda ? 0 : t) - 0.4)) };
  else if (t < T.cinco - 0.15) { const k = sm5(seg(t, T.siguieron - 0.1, T.millones + 0.3)); s = { mode: 'aud', head: 'AUDIENCIA', aud: (k * 10.2).toFixed(1).replace('.', ',') + ' M' }; }
  else if (t < T.L[3] - 0.1) { const nb = 1 + Math.min(4, Math.floor(seg(t, T.cinco, T.inmigracion + 0.1) * 5)); s = { mode: 'blocks', head: '5 BLOQUES', nb, clock: 1200 - Math.floor((t - T.cinco) * 60) % 1200 }; }
  else if (t < T.L[4] - 0.1) s = { mode: 'open', head: 'EL ARRANQUE', k1: after(T.sanchez3) ? 1 : 0, k2: after(T.abascal3) ? 1 : 0 };
  else if (t < T.L[5] - 0.1) s = { mode: 'big', head: 'DOS DE CADA UNO', big: '8 ATAQUES', sub: 'DOS DE CADA UNO' };
  else if (t < T.L[6] - 0.1) s = { mode: 'atk', head: 'ATAQUE 1 DE 8', a: 'pp', b: 'psoe', q: after(T.pizza, 0.2) ? ['«PIZZA COJONUDA»'] : [], qbig: 200, qc0: GOLDC, note: after(T.tuiteo) ? 'SU TUIT DE 2010 · LO QUE HAN SUBIDO LOS PRECIOS' : '' };
  else if (t < T.L[7] - 0.1) s = { mode: 'atk', head: 'ATAQUE 2 DE 8', a: 'fa', b: 'pp', q: after(T.gestion, 0.35) ? ['¿«BUENA GESTIÓN»?'] : [], qbig: 180, qc0: GOLDC, note: after(T.mantiene) ? 'SI EL PP MANTIENE AFORADO A MAZÓN' : '' };
  else if (t < T.L[8] - 0.1) { const two = after(T.sanchez7); s = { mode: 'atk', head: 'ATAQUE 3 DE 8', a: 'pp', b: 'fa', q: two ? (after(T.feijoo7b) ? ['SÁNCHEZ: «ES MACHISTA»', 'FEIJÓO: REPROCHE POR PAIPORTA'] : ['SÁNCHEZ: «ES MACHISTA»']) : ['«Y USTED, CALLADITA»'], qbig: two ? 132 : 190, qsmall: 132, qc0: two ? '#ffffff' : GOLDC }; }
  else if (t < T.L[9] - 0.1) { const g = after(T.banda); s = { mode: 'atk', head: g ? 'ATAQUE 5 DE 8' : 'ATAQUE 4 DE 8', a: 'vox', b: 'psoe', q: g ? ['«BANDA DE GUARROS»'] : ['«BUITRE»'], qbig: g ? 170 : 230, qc0: GOLDC, note: g ? (after(T.primarias, 0.6) ? 'QUIENES LE ACOMPAÑARON EN LAS PRIMARIAS DE 2017' : '') : (after(T.fondos) ? 'HABLANDO DE FONDOS BUITRE' : '') }; }
  else if (t < T.L[10] - 0.1) s = { mode: 'atk', head: 'ATAQUE 6 DE 8', a: 'psoe', b: ['pp', 'vox'], party: 1, q: after(T.motosierra, 0.3) ? ['«LA MOTOSIERRA»', '112.000 MILLONES AL AÑO'] : [], qbig: 190, qsmall: 104, qc0: GOLDC };
  else if (t < T.L[11] - 0.1) { const r = after(T.abascal10b); s = { mode: 'atk', head: 'ATAQUE 7 DE 8', a: 'psoe', b: ['pp', 'vox'], q: r ? ['ABASCAL: «MÁS SERVICIO MILITAR»'] : (after(T.unico) ? ['EL ÚNICO DE LOS TRES', 'QUE HIZO LA MILI Y JURÓ BANDERA'] : []), qbig: r ? 120 : 140, qsmall: 104, qc0: r ? '#ffffff' : GOLDC }; }
  else if (t < T.L[12] - 0.1) s = { mode: 'atk', head: 'ATAQUE 8 DE 8', a: 'fa', b: 'vox', q: after(T.verguenza) ? ['«UNA VERGÜENZA»', 'NORMALIZAR ESOS INSULTOS'] : [], qbig: 170, qsmall: 100, qc0: GOLDC };
  else if (t < T.L[13] - 0.1) s = { mode: 'dato', head: 'UN DATO', k1: after(T.sanchez12) ? 1 : 0, k2: after(T.feijoo12) ? 1 : 0 };
  else s = { mode: 'end', head: '29N · DOMINGO', k1: after(T.ley) ? 1 : 0, k2: after(T.decides) ? 1 : 0 };
  sbDrawSafe(s);
  S.sb.position.y = SB.Y + 0.01 * Math.sin((t > 30 ? t - END : t) * 1.1);
  // los haces: cada ataque, del que habla al atacado; en el dato, Sánchez–Colau (se tutearon) y Feijóo–Abascal (apenas se hablaron)
  const W_ = { pp_psoe: [[T.pizza - 0.35, T.L[6] - 0.15]], fa_pp: [[T.gestion - 0.35, T.L[7] - 0.15]], pp_fa: [[T.usted - 0.25, T.L[8] - 0.15]], vox_psoe: [[T.buitre - 0.25, T.banda - 0.3], [T.banda - 0.2, T.L[9] - 0.15]],
    psoe_pp: [[T.gobernar - 0.1, T.L[10] - 0.15], [T.feijoo10 - 0.1, T.L[11] - 0.15]], psoe_vox: [[T.gobernar, T.L[10] - 0.15], [T.abascal10 - 0.1, T.L[11] - 0.15]], fa_vox: [[T.abascal11 - 0.1, T.L[12] - 0.15]],
    d1: [[T.tutearon - 0.35, T.L[13] - 0.2]], d2: [[T.feijoo12 - 0.05, T.L[13] - 0.2]] };
  for (const k in S.bm) beamAt(S.bm[k], t, W_[k], k[0] !== 'd');
  const d1 = W_.d1[0], d2 = W_.d2[0];
  S.tu.visible = t > d1[0] + 0.45 && t < d1[1]; if (S.tu.visible) S.tu.scale.setScalar(Math.max(0.01, pop(t, d1[0] + 0.45, 0.3)));
  S.dots.visible = t > d2[0] + 0.45 && t < d2[1]; if (S.dots.visible) S.dots.scale.setScalar(Math.max(0.01, pop(t, d2[0] + 0.45, 0.3)));
}
function sbDrawSafe(s) { if (s.mode === 'big') { const c = S.sbC.getContext('2d'); const key = JSON.stringify(s); if (key === S.sbKey) return; S.sbKey = key; c.fillStyle = '#05070a'; c.fillRect(0, 0, CW, CHh); c.strokeStyle = '#1d2430'; c.lineWidth = 10; c.strokeRect(5, 5, CW - 10, CHh - 10);
    c.fillStyle = '#0d1118'; c.fillRect(10, 10, CW - 20, 130); c.textBaseline = 'middle'; c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.font = '900 76px Inter'; c.fillText('DEBATE 29N', 46, 76); c.textAlign = 'right'; c.fillStyle = AMB; c.font = '900 66px Inter'; c.fillText(s.head, CW - 46, 76);
    c.textAlign = 'center'; c.fillStyle = GOLDC; c.font = '900 260px Inter'; c.fillText(s.big, CW / 2, 450); c.fillStyle = '#c9d5f2'; c.font = '900 96px Inter'; c.fillText(s.sub, CW / 2, 700); S.sbT.needsUpdate = true; return; }
  sbDraw(s); }
