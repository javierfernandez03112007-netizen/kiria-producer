// ---------------------------------------------------------------- tiempos y animación (todo es función del instante: se puede dibujar en cualquier orden)
// Hay dos relojes: t (el del vídeo: voz, subtítulos, rótulos) y st (el de la escena 3D). Son el mismo salvo en el rebobinado
// («Como el de este»: la escena vuelve hacia atrás hasta el primer fotograma y lo vuelve a reproducir), en el cierre y en el bucle final.
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const easeIn = x => x * x * x;
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const ZS0 = 0.15;
let TT = {};
const T1 = -0.3;                       // instante de la escena al que llega el rebobinado: justo antes del primer fotograma (el tarro aún en el borde)
function buildTimes() {
  TT = {
    stop: K.pare2 + 0.04, dec0: K.pare2 - 0.8,                                        // la cinta frena y se para en seco en «pare»
    foto0: K.mandanos3 - 0.1, fotoLand: K.foto3 + 0.12, up1: K.producto3 + 0.2,      // cae la foto y se sube
    stand0: K.convertimos4 - 0.05, stand1: K.convertimos4 + 0.4,                       // la foto se pone de pie
    pedUp: K.en4 - 0.05, inflate1: K.d3_4 + 0.12, detach: K.d3_4 + 0.2, land: K.con4 + 0.02,   // el tarro sale de la foto («3D») y salta a la peana
    fotoOut: K.con4 + 0.1, luz: K.luz4 - 0.03, mov: K.movimiento4 - 0.02, voz: K.voz4 - 0.03,
    sink0: K.asi5 - 0.1, sink1: K.asi5 + 0.42,                                         // el estudio se recoge en la pantalla: los vídeos del canal
    cam0: K.sin5 - 0.08, camGone: K.camara5 + 0.02,
    cnt0: K.dias6 - 0.25, cntA: K.sumado6, cntB: K.millones6 + 0.05, big3: K.n32_6 - 0.03,
    scrub0: K.secreto7 - 0.15, first: K.primer7 - 0.02, unexp: K.inesperado7 - 0.03,
    rw0: K.como8 - 0.03, rw1: K.este8 + 0.08,
    cta0: K.quieres9 - 0.05, web: K.entra9 - 0.12, bio: K.bio9 - 0.25,
    loop0: END - 1.45,
  };
  TT.swap = (TT.web + TT.bio) / 2;         // con la web tapando la pantalla, el reloj de la escena salta al bucle (no se ve)
  feedSetup();
}
// reloj de la escena
function sceneT(t) {
  if (t < TT.rw0) return t;
  if (t < TT.rw1) { const u = (t - TT.rw0) / (TT.rw1 - TT.rw0); return lerp(TT.rw0, T1, 1 - Math.pow(1 - u, 1.6)); }
  if (t < TT.swap) return T1 + (t - TT.rw1);
  return t - END;
}

// ---------------------------------------------------------------- la cinta de publicaciones: desplazamiento (px) con «tirones» del dedo, frenada y parada
const FV = { V0: 1000, P: 0.66, a: 0.55, b: 1.05, tau: 0.17 };
const FV_I = FV.a * FV.P + FV.b * FV.tau * (1 - Math.exp(-FV.P / FV.tau));
function offBase(t) { const n = Math.floor(t / FV.P), ph = t - n * FV.P; return FV.V0 * (n * FV_I + FV.a * ph + FV.b * FV.tau * (1 - Math.exp(-ph / FV.tau))); }
function velBase(t) { const ph = t - Math.floor(t / FV.P) * FV.P; return FV.V0 * (FV.a + FV.b * Math.exp(-ph / FV.tau)); }
let OFF_SHIFT = 0, JAR_I = 0, JAR0_I = 0;
const FCY = FEED.top + FEED.img0 + FEED.imgH / 2;        // centro de la imagen de la publicación 0 cuando el desplazamiento es 0
function feedOff(st) {
  if (st <= TT.dec0) return offBase(st) + OFF_SHIFT;
  const d = TT.stop - TT.dec0, v0 = velBase(TT.dec0), u = clamp((st - TT.dec0) / d);
  return offBase(TT.dec0) + v0 * d * (1 - (1 - u) * (1 - u)) / 2 + OFF_SHIFT;
}
const postCy = (i, st) => FCY + i * FEED.postH - feedOff(st);      // centro (y del lienzo) de la imagen de la publicación i
function feedSetup() {
  // que una publicación (con el tarro) se pare justo en el borde: centro de su imagen a 15 px del canto de arriba
  OFF_SHIFT = 0; const o = feedOff(TT.stop), i = Math.ceil((o - FCY + 15) / FEED.postH);
  OFF_SHIFT = FCY + i * FEED.postH - 15 - o; JAR_I = i;
  // y que en el primer fotograma otro tarro esté cayendo: el que cruzó el borde entre 0,45 y 0,1 s antes
  JAR0_I = null; for (let k = -6; k < 6; k++) { const te = crossT(k); if (te > -0.5 && te < -0.08) { JAR0_I = k; break; } }
}
function crossT(i) {      // cuándo cruza el borde de arriba el centro de la publicación i (bisección: el desplazamiento siempre crece)
  const target = FCY + i * FEED.postH; if (feedOff(TT.stop) < target) return 1e9;
  let a = -30, b = TT.stop; for (let k = 0; k < 50; k++) { const m = (a + b) / 2; if (feedOff(m) < target) a = m; else b = m; } return (a + b) / 2;
}
function kindOf(i) { if (i === JAR_I || i === JAR0_I) return 'tarro'; return FKINDS[((i % FKINDS.length) + FKINDS.length) % FKINDS.length]; }
// pose de un producto de la cinta (o null si no se ve)
function feedPose(i, st) {
  const cy = postCy(i, st), H2 = BSCR.h;
  if (cy > H2 + 40) return null;
  const grow = eo(clamp((H2 + 40 - cy) / 170));
  const z = scrZ(cy), x = 0;
  if (cy >= 0) {
    // inercia: cuando la cinta da un tirón, el producto se inclina un poco hacia atrás
    const acc = (velAt(st + 0.02) - velAt(st - 0.02)) / 0.04, tilt = clamp(acc * 2.2e-5, -0.06, 0.12);
    let rx = tilt, y = TOPY;
    if (i === JAR_I && st > TT.stop - 0.25) {         // se queda en el borde, tambaleándose
      const u = st - TT.stop + 0.25; rx = -0.22 * Math.sin(u * 9) * Math.exp(-u * 1.6) - 0.03; y = TOPY;
    }
    const gone = eio(clamp((st - TT.foto0 + 0.25) / 0.4));          // al caer la foto, los que quedan se meten en la pantalla
    return { p: v3(x, y - 0.1 * gone, z), rx, s: grow * (1 - gone), rot: 0.35 * Math.sin(i * 1.7) };
  }
  const te = crossT(i), dt = st - te; if (dt > 1.6) return null;
  const vz = -0.45 * velAt(te) / H2 * BIG.sl;         // al salir por el borde sigue un poco hacia delante y cae
  return { p: v3(x, TOPY - 4.9 * dt * dt, -BIG.sl / 2 + vz * dt), rx: -(2.6 * dt + 3.2 * dt * dt), s: 1, rot: 0.35 * Math.sin(i * 1.7) + 0.6 * dt * Math.sin(i * 3.1) };
}
function velAt(st) { return (feedOff(st + 0.004) - feedOff(st - 0.004)) / 0.008; }
function feedProducts(st, vis) {
  for (const k in S.fp) for (const o of S.fp[k]) o.visible = false;
  if (!vis) return;
  const used = {}, o0 = feedOff(st), i0 = Math.floor((o0 - FCY - 900) / FEED.postH), i1 = Math.ceil((o0 - FCY + BSCR.h + 200) / FEED.postH);
  for (let i = i0; i <= i1; i++) {
    const P = feedPose(i, st); if (!P || P.s <= 0.002) continue;
    const k = kindOf(i), n = used[k] || 0; used[k] = n + 1; const o = S.fp[k][n]; if (!o) continue;
    o.visible = true; o.position.copy(P.p); o.rotation.set(P.rx, P.rot + Math.PI, 0);      // de frente hacia el borde (la cámara del gancho)
    o.scale.setScalar(Math.max(0.001, P.s * (1 - S.ctaHide)) * PSF);
  }
}

// ---------------------------------------------------------------- la pantalla del móvil gigante (lienzo 2D)
function bStatus(g, light = false) {
  g.fillStyle = light ? '#111' : '#ffffff'; g.font = '700 30px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('9:41', 46, 46);
  g.lineWidth = 3; g.strokeStyle = g.fillStyle; rr(g, BSCR.w - 98, 32, 54, 27, 7); g.stroke(); g.fillRect(BSCR.w - 94, 36, 40, 19);
  g.fillStyle = '#000000'; rr(g, BSCR.w / 2 - 76, 18, 152, 46, 23); g.fill();
}
function postImg(g, i, x, y, w, h) {       // la «foto» de cada publicación: fondo de estudio del color de la marca
  const [hh, ss] = POSTC[((i % POSTC.length) + POSTC.length) % POSTC.length];
  const gr = g.createRadialGradient(x + w / 2, y + h * 0.35, 10, x + w / 2, y + h * 0.55, w * 0.85);
  gr.addColorStop(0, hsl(hh, ss * 0.6, 0.86)); gr.addColorStop(0.55, hsl(hh, ss * 0.7, 0.62)); gr.addColorStop(1, hsl(hh, ss, 0.3)); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x + w / 2, y + h * 0.8, w * 0.22, h * 0.05, 0, 0, 7); g.fill();
}
function drawPost(g, i, top) {
  const n = ((i % POSTN.length) + POSTN.length) % POSTN.length;
  g.fillStyle = '#3a3f49'; g.beginPath(); g.arc(46, top + 46, 26, 0, 7); g.fill();
  g.fillStyle = hsl(POSTC[n][0], 0.6, 0.6); g.beginPath(); g.arc(46, top + 46, 20, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.font = '800 26px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(POSTN[n], 86, top + 46);
  g.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(BSCR.w - 70 + k * 14, top + 46, 3.5, 0, 7); g.fill(); }
  postImg(g, i, 0, top + FEED.img0, BSCR.w, FEED.imgH);
  const iy = top + FEED.img0 + FEED.imgH + 34; g.strokeStyle = '#ffffff'; g.lineWidth = 4.5; g.lineJoin = 'round';
  let x = 42; g.beginPath(); g.moveTo(x, iy + 12); g.bezierCurveTo(x - 24, iy - 4, x - 15, iy - 24, x, iy - 11); g.bezierCurveTo(x + 15, iy - 24, x + 24, iy - 4, x, iy + 12); g.stroke();
  x = 100; g.beginPath(); g.arc(x, iy - 2, 15, 0.4, Math.PI * 2 - 0.1); g.lineTo(x + 18, iy + 16); g.closePath(); g.stroke();
  x = 152; g.beginPath(); g.moveTo(x - 16, iy - 4); g.lineTo(x + 16, iy - 15); g.lineTo(x + 5, iy + 16); g.lineTo(x - 1, iy + 1); g.closePath(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.3)'; rr(g, 30, iy + 34, 300, 14, 7); g.fill();
}
function drawFeed(g, st, dim = 0) {
  g.fillStyle = '#0c0e14'; g.fillRect(0, 0, BSCR.w, BSCR.h);
  const o = feedOff(st), i0 = Math.floor((o - FEED.top) / FEED.postH) - 1;
  for (let i = i0; i < i0 + 5; i++) drawPost(g, i, FEED.top + i * FEED.postH - o);
  g.fillStyle = '#0c0e14'; g.fillRect(0, 0, BSCR.w, 92); bStatus(g);
  if (dim > 0) { g.fillStyle = `rgba(6,7,10,${0.82 * dim})`; g.fillRect(0, 0, BSCR.w, BSCR.h); }
}
// subir la foto: recuadro discontinuo, la foto dentro y el progreso
const UPB = { x: 300, y: 0, w: 430, h: 520 };
function drawUpload(g, st, k) {
  const fz = S.fotoFlatZ, cy = (fz / BIG.sl + 0.5) * BSCR.h; UPB.y = cy;
  g.save(); g.globalAlpha = k;
  const p = clamp((st - TT.fotoLand) / (TT.up1 - TT.fotoLand)), done = p >= 1;
  g.strokeStyle = done ? '#7cf0a9' : 'rgba(255,255,255,.75)'; g.lineWidth = 4; g.setLineDash(done ? [] : [18, 12]); rr(g, UPB.x - UPB.w / 2, cy - UPB.h / 2, UPB.w, UPB.h, 30); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#ffffff'; g.font = '800 30px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(done ? '✓  Foto subida' : st < TT.fotoLand ? 'Suelta aquí tu foto' : 'Subiendo…', UPB.x, cy + UPB.h / 2 + 52);
  if (st > TT.fotoLand - 0.05) { const bw = UPB.w - 40, by = cy + UPB.h / 2 + 100; g.fillStyle = 'rgba(255,255,255,.15)'; rr(g, UPB.x - bw / 2, by, bw, 14, 7); g.fill(); g.fillStyle = done ? '#7cf0a9' : '#ffffff'; rr(g, UPB.x - bw / 2, by, Math.max(14, bw * eio(p)), 14, 7); g.fill(); }
  g.restore();
}
function drawStudioBg(g, k) {        // como el visor de la web: degradado azul noche con el halo violeta
  g.save(); g.globalAlpha = k;
  let gr = g.createRadialGradient(BSCR.w / 2, BSCR.h * 0.3, 0, BSCR.w / 2, BSCR.h * 0.3, BSCR.h * 0.9); gr.addColorStop(0, '#1b2133'); gr.addColorStop(1, '#090b11'); g.fillStyle = gr; g.fillRect(0, 0, BSCR.w, BSCR.h);
  const pz = (PEDP.z / BIG.sl + 0.5) * BSCR.h; gr = g.createRadialGradient(BSCR.w / 2, pz, 0, BSCR.w / 2, pz, BSCR.w * 0.75); gr.addColorStop(0, 'rgba(180,92,255,0.3)'); gr.addColorStop(1, 'rgba(180,92,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, BSCR.w, BSCR.h);
  g.restore();
}
function drawGrid(g, st, k) {        // el perfil del canal: nuestros vídeos (portadas reales)
  g.save(); g.globalAlpha = k; g.fillStyle = '#0c0e14'; g.fillRect(0, 0, BSCR.w, BSCR.h); bStatus(g);
  g.fillStyle = '#ffffff'; g.font = '900 34px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('kiria.ai', BSCR.w / 2, 128);
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '700 21px SpaceMono'; g.letterSpacing = '3px'; g.fillText('VÍDEOS HECHOS CON IA', BSCR.w / 2, 170); g.letterSpacing = '0px';
  const cw = 196, ch = Math.round(cw * 16 / 9), gap = 6, x0 = (BSCR.w - 3 * cw - 2 * gap) / 2, y0 = 210 - 60 * clamp((st - TT.sink1) / 3);
  THUMBS.forEach((im, i) => { const c = i % 3, r = Math.floor(i / 3), x = x0 + c * (cw + gap), y = y0 + r * (ch + gap);
    const a = clamp((st - TT.sink0 - 0.06 * i) / 0.25); if (a <= 0) return; g.save(); g.globalAlpha = k * a; g.drawImage(im, x, y + 20 * (1 - a), cw, ch); g.restore(); });
  g.restore();
}
function drawCounter(g, st, k) {
  g.save(); g.globalAlpha = k; g.fillStyle = '#090b10'; g.fillRect(0, 0, BSCR.w, BSCR.h); bStatus(g);
  const u = eio(clamp((st - TT.cntA) / (TT.cntB - TT.cntA))), n = Math.round(3200000 * u);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffffff'; g.font = '900 88px Inter'; g.fillText(n.toLocaleString('es-ES'), BSCR.w / 2, 600);
  g.fillStyle = '#ffc24a'; g.font = '800 36px Inter'; g.fillText('visualizaciones', BSCR.w / 2, 676);
  g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '700 24px SpaceMono'; g.letterSpacing = '4px'; g.fillText('EN 7 DÍAS', BSCR.w / 2, 736); g.letterSpacing = '0px';
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; rr(g, BSCR.w / 2 - 110, 800, 220, 64, 32); g.stroke();
  g.fillStyle = '#ffffff'; g.font = '800 30px Inter'; g.fillText('0 cámaras', BSCR.w / 2, 833);
  g.restore();
}
// la barra del vídeo: el primer segundo se enciende
const SCRUB = { x0: 50, x1: 550, y: 1145 };
function drawScrub(g, st, k, t) {
  g.save(); g.globalAlpha = k; g.fillStyle = '#05060a'; g.fillRect(0, 0, BSCR.w, BSCR.h);
  if (PRIMER) { const iw = 540, ih = iw * 16 / 9, x = (BSCR.w - iw) / 2, y = 100; g.save(); g.globalAlpha = k * (0.6 + 0.4 * win(st, TT.unexp, 0.3)); rr(g, x, y, iw, ih, 18); g.clip(); g.drawImage(PRIMER, x, y, iw, ih); g.restore();
    const f = win(st, TT.unexp, 0.25) * (1 - win(st, TT.unexp + 0.9, 0.4)); if (f > 0) { g.save(); g.globalAlpha = k * f; g.strokeStyle = '#ffc24a'; g.lineWidth = 6; g.shadowColor = '#ffc24a'; g.shadowBlur = 24; rr(g, x, y, iw, ih, 18); g.stroke(); g.restore(); } }
  const gr = g.createLinearGradient(0, BSCR.h * 0.7, 0, BSCR.h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.85)'); g.fillStyle = gr; g.fillRect(0, 0, BSCR.w, BSCR.h);
  const L = SCRUB.x1 - SCRUB.x0, one = L / END, f = win(st, TT.first, 0.25), ph = lerp(0.62, 1 / END, eio(clamp((st - TT.first) / 0.5)));
  g.fillStyle = 'rgba(255,255,255,.28)'; rr(g, SCRUB.x0, SCRUB.y - 6, L, 12, 6); g.fill();
  g.fillStyle = '#ffffff'; rr(g, SCRUB.x0, SCRUB.y - 6, L * ph, 12, 6); g.fill();
  if (f > 0) { g.save(); g.shadowColor = '#ffc24a'; g.shadowBlur = 26 * f; g.fillStyle = '#ffc24a'; rr(g, SCRUB.x0 - 4, SCRUB.y - 11, one + 8, 22, 9); g.fill(); g.restore(); }
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(SCRUB.x0 + L * ph, SCRUB.y, 15, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '700 24px SpaceMono'; g.textAlign = 'left'; g.textBaseline = 'middle';
  const s = Math.round(ph * END); g.fillText(`0:${String(s).padStart(2, '0')}`, SCRUB.x0, SCRUB.y + 46); g.textAlign = 'right'; g.fillText(`0:${String(Math.round(END)).padStart(2, '0')}`, SCRUB.x1, SCRUB.y + 46);
  g.restore();
}
// la web (kiriaai.com: «Vídeos que paran el scroll.») y el perfil con el enlace en la bio
function drawWeb(g, t, k) {
  g.save(); g.globalAlpha = k; g.fillStyle = '#0a0b10'; g.fillRect(0, 0, BSCR.w, BSCR.h); bStatus(g);
  g.fillStyle = '#1a1f2c'; rr(g, 20, 88, BSCR.w - 40, 64, 32); g.fill();
  g.strokeStyle = '#8f98ab'; g.lineWidth = 3; g.beginPath(); g.arc(58, 116, 7, Math.PI, 0); g.stroke(); g.fillStyle = '#8f98ab'; rr(g, 48, 116, 20, 15, 3); g.fill();
  g.fillStyle = '#e6eaf2'; g.font = '700 27px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('kiriaai.com', 84, 121);
  g.fillStyle = '#ff6b7d'; g.font = '700 21px SpaceMono'; g.letterSpacing = '4px'; g.fillText('KIRIA.AI ESTUDIO', 44, 250); g.letterSpacing = '0px';
  g.fillStyle = '#ffffff'; g.font = '900 64px Inter';
  g.fillText('Vídeos que', 42, 330);
  const gr = g.createLinearGradient(42, 0, 260, 0); gr.addColorStop(0, '#ff4d61'); gr.addColorStop(1, '#4f7dff'); g.fillStyle = gr; g.fillText('paran', 42, 404);
  g.fillStyle = '#ffffff'; g.fillText(' el scroll.', 42 + g.measureText('paran').width, 404);
  g.fillStyle = 'rgba(255,255,255,.22)'; rr(g, 44, 460, 470, 16, 8); g.fill(); rr(g, 44, 492, 380, 16, 8); g.fill();
  // tres trabajos (portadas reales)
  const cw = 160, ch = Math.round(cw * 16 / 9);
  [1, 6, 0].forEach((j, i) => { const im = THUMBS[j]; if (!im) return; const x = 44 + i * (cw + 16), y = 560; g.save(); rr(g, x, y, cw, ch, 16); g.clip(); g.drawImage(im, x, y, cw, ch); g.restore(); });
  const by = 960, pr = t > TT.web + 0.6 && t < TT.web + 0.75 ? 0.96 : 1;
  g.save(); g.translate(BSCR.w / 2, by); g.scale(pr, pr); g.fillStyle = '#ffffff'; rr(g, -(BSCR.w - 88) / 2, -44, BSCR.w - 88, 88, 44); g.fill();
  g.fillStyle = '#0c0e14'; g.font = '800 31px Inter'; g.textAlign = 'center'; g.fillText('Pedir propuesta', 0, 2); g.restore();
  g.restore();
}
function drawBio(g, t, k) {
  g.save(); g.globalAlpha = k; g.fillStyle = '#0c0e14'; g.fillRect(0, 0, BSCR.w, BSCR.h); bStatus(g);
  g.fillStyle = '#ffffff'; g.font = '800 30px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('kiria.ai', BSCR.w / 2, 126);
  const ax = 110, ay = 260; const ag = g.createLinearGradient(ax - 70, ay - 70, ax + 70, ay + 70); ag.addColorStop(0, '#ff4d61'); ag.addColorStop(1, '#4f7dff');
  g.strokeStyle = ag; g.lineWidth = 6; g.beginPath(); g.arc(ax, ay, 72, 0, 7); g.stroke(); g.fillStyle = '#16181d'; g.beginPath(); g.arc(ax, ay, 64, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.font = '900 40px Inter'; g.fillText('k', ax, ay + 2);
  g.textAlign = 'left'; g.font = '900 30px Inter'; g.fillText('kiria.ai', 220, 236); g.fillStyle = 'rgba(255,255,255,.65)'; g.font = '600 24px Inter'; g.fillText('Vídeos hechos con IA', 220, 276);
  g.fillStyle = 'rgba(255,255,255,.22)'; rr(g, 44, 380, 420, 16, 8); g.fill(); rr(g, 44, 410, 330, 16, 8); g.fill();
  const lk = 0.5 + 0.5 * Math.sin((t - TT.bio) * 8), on = t > TT.bio;
  g.save(); if (on) { g.shadowColor = '#7cc4ff'; g.shadowBlur = 18 + 14 * lk; }
  g.fillStyle = on ? '#9fd0ff' : '#7aa7d6'; g.strokeStyle = g.fillStyle; g.lineWidth = 5; g.lineCap = 'round';
  g.save(); g.translate(62, 476); g.rotate(-0.78); rr(g, -20, -9, 22, 18, 9); g.stroke(); rr(g, -2, -9, 22, 18, 9); g.stroke(); g.restore();   // eslabones
  g.font = '800 34px Inter'; g.fillText('kiriaai.com', 96, 476); g.restore();
  if (on) { g.strokeStyle = `rgba(159,208,255,${0.5 + 0.4 * lk})`; g.lineWidth = 3; rr(g, 30, 444, 320, 64, 16); g.stroke(); }
  const cw = 176, ch = Math.round(cw * 16 / 9);
  THUMBS.slice(0, 3).forEach((im, i) => { const x = 18 + (i % 3) * (cw + 6), y = 560; g.drawImage(im, x, y, cw, ch); });
  g.restore();
}
function drawBigScreen(t, st) {
  const g = S.bscrT.userData.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  if (t >= TT.cta0 && t < TT.loop0 + 0.45) {      // cierre: la cinta (que sigue) → la web → el perfil con el enlace → la cinta otra vez (bucle)
    drawFeed(g, st);
    const kw = win(t, TT.web - 0.1, 0.35) * (1 - win(t, TT.loop0 + 0.05, 0.35));
    if (kw > 0) { if (t < TT.bio) drawWeb(g, t, kw); else { drawWeb(g, t, kw * (1 - win(t, TT.bio, 0.3))); drawBio(g, t, kw * win(t, TT.bio, 0.3)); } }
  } else if (st < TT.foto0 - 0.4 || t >= TT.loop0 + 0.45) drawFeed(g, st);
  else if (st < TT.stand1) { drawFeed(g, st, win(st, TT.foto0 - 0.4, 0.35)); drawUpload(g, st, win(st, TT.foto0 - 0.3, 0.3) * (1 - win(st, TT.stand0, 0.4))); if (st > TT.stand0) drawStudioBg(g, win(st, TT.stand0, 0.4)); }
  else if (st < TT.sink0) drawStudioBg(g, 1);
  else if (st < TT.cnt0) { drawStudioBg(g, 1); drawGrid(g, st, win(st, TT.sink0, 0.35)); }
  else if (st < TT.scrub0) { drawGrid(g, st, 1); drawCounter(g, st, win(st, TT.cnt0, 0.35)); }
  else { drawCounter(g, st, 1); drawScrub(g, st, win(st, TT.scrub0, 0.35), t); }
  g.restore(); S.bscrT.needsUpdate = true;
}

// ---------------------------------------------------------------- el estudio: foto, peana, tarro, focos, cámara de cine y «3,2 M»
const _qa = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _pa = new THREE.Vector3(), _pb = new THREE.Vector3();
function bez(p0, p1, p2, p3, u, out) { const v = 1 - u; return out.set(0, 0, 0).addScaledVector(p0, v * v * v).addScaledVector(p1, 3 * v * v * u).addScaledVector(p2, 3 * v * u * u).addScaledVector(p3, u * u * u); }
function photoPose(zs, outP, outQ) { S.foto.tilt.updateWorldMatrix(true, false); outP.set(0, FOTO_FLOOR, FOTO.d / 2 + 0.0015 + JAR_R * zs).applyMatrix4(S.foto.tilt.matrixWorld); S.foto.tilt.getWorldQuaternion(outQ); }
const studioK = st => 1 - eio(clamp((st - TT.sink0) / (TT.sink1 - TT.sink0)));        // el estudio se recoge
function spinAt(st) { return 0.5 * Math.max(0, st - TT.land) + 2 * Math.PI * eio(clamp((st - TT.mov) / 0.8)); }
function stageStudio(st) {
  const sk = studioK(st), on = st > TT.foto0 && st < TT.sink1 + 0.05;
  // la foto: cae plana sobre la pantalla, se sube, se pone de pie; cuando sale el tarro se esconde en la pantalla
  { const R = S.foto.root, vis = on && st < TT.fotoOut + 0.4; R.visible = vis;
    if (vis) { const fz = S.fotoFlatZ0;
      if (st < TT.fotoLand) { const u = clamp((st - TT.foto0) / (TT.fotoLand - TT.foto0)); R.position.set(0.1 * (1 - u), lerp(1.1, TOPY + 0.004, u * u), fz); R.rotation.set(-Math.PI / 2 + 0.5 * (1 - u), 0.6 * (1 - u), 0); }
      else if (st < TT.stand0) { const b = st - TT.fotoLand; R.position.set(0, TOPY + 0.004 + 0.03 * Math.abs(Math.sin(b * 14)) * Math.exp(-b * 9), fz); R.rotation.set(-Math.PI / 2, 0, 0); }
      else { const u = eio(clamp((st - TT.stand0) / (TT.stand1 - TT.stand0))); R.position.set(0, TOPY + 0.004, fz); R.rotation.set(-Math.PI / 2 * (1 - u), 0, 0); }
      const out = clamp((st - TT.fotoOut) / 0.4); R.scale.setScalar(Math.max(0.001, 1 - easeIn(out))); R.position.y -= 0.3 * out;
      S.foto.stand.visible = st > TT.stand1 - 0.1; S.foto.tilt.rotation.x = FOTO.tilt * eio(clamp((st - TT.stand0) / (TT.stand1 - TT.stand0)));   // plana del todo sobre la pantalla
      drawFoto(st < TT.fotoLand ? 1 : 1); }
  }
  // la peana sube de la pantalla en «en (3D)»
  { const P = S.ped, vis = on && st > TT.pedUp; P.g.visible = vis && sk > 0.002;
    if (P.g.visible) { const u = backOut((st - TT.pedUp) / 0.4); P.g.position.set(PEDP.x, PEDP.y - (1 - clamp(u)) * 0.12, PEDP.z); P.g.scale.setScalar(Math.max(0.001, clamp(u, 0, 1.2) * sk) * 0.86); P.turn.rotation.y = spinAt(st);
      const fl = Math.exp(-Math.max(0, st - TT.land) / 0.25) * (st > TT.land ? 1 : 0) + Math.exp(-Math.max(0, st - TT.luz) / 0.3) * (st > TT.luz ? 1 : 0);
      P.halo.material.opacity = 0.85 + fl * 0.4; P.ring.material.color.setScalar(1.5 + fl * 1.2);
      P.rips.forEach(r => { const q = (st * 0.3 + r.ph) % 1; r.m.scale.setScalar(0.36 + 0.71 * q); r.m.material.opacity = (0.42 + fl * 0.6) * Math.pow(1 - q, 1.6) * Math.min(1, q / 0.08); }); } }
  // el tarro: dentro de la foto (relieve), se hincha («3D»), salta a la peana y gira
  { const C = S.jarC, vis = on && st > TT.stand0 + 0.05 && sk > 0.002; C.visible = vis;
    if (vis) { const top = v3(PEDP.x, PEDP.y + PED_H * 0.86, PEDP.z), ps = 0.5 * 0.86 * sk;
      if (st < TT.detach) { const zs = lerp(ZS0, 1, eio(clamp((st - K.en4 + 0.05) / (TT.inflate1 - K.en4 + 0.05)))); photoPose(zs, C.position, C.quaternion); C.scale.set(0.5, 0.5, 0.5 * zs); }
      else if (st < TT.land) { const e = eio((st - TT.detach) / (TT.land - TT.detach)); photoPose(1, _pa, _qa); bez(_pa, _pa.clone().add(v3(0, 0.3, 0.25)), top.clone().add(v3(0, 0.45, 0)), top, e, C.position); C.quaternion.copy(_qa).slerp(_qi, e); C.scale.setScalar(lerp(0.5, ps, e)); }
      else { C.position.copy(top); C.quaternion.identity(); C.scale.setScalar(ps); const b = st - TT.land; if (b < 0.42) { const sq = 0.12 * Math.sin(b / 0.42 * Math.PI) * (1 - b / 0.42); C.scale.set(ps * (1 + sq * 0.5), ps * (1 - sq), ps * (1 + sq * 0.5)); }
        C.position.y -= 0.12 * (1 - sk); }
      S.jar.rotation.y = st > TT.land ? spinAt(st) - 0.35 : 0; } }
  // los focos: salen en «luz» y se encienden
  S.lights.forEach((L, i) => { const t0 = TT.luz - 0.12 + i * 0.05, k = on ? pop(st, t0, 0.35) * sk : 0; L.visible = k > 0.002;
    if (!L.visible) return; const [lx, lz] = [[-0.62, 0.5], [0.62, 0.5], [0.0, -0.18]][i];
    L.position.set(PEDP.x + lx, TOPY, lz); L.scale.setScalar(Math.max(0.001, k));
    L.userData.head.lookAt(v3(PEDP.x, PEDP.y + 0.3, PEDP.z)); const lit = win(st, TT.luz + i * 0.06, 0.08); L.userData.panelM.emissiveIntensity = 2.6 * lit; });
  // la cámara de cine: aparece en «sin» y se deshace en «cámara»
  { const Cm = S.filmCam, k = pop(st, TT.cam0, 0.35), gone = clamp((st - TT.camGone) / 0.32), vis = st > TT.cam0 && gone < 1 && st < TT.cnt0; Cm.visible = vis;
    if (vis) { Cm.position.set(-0.3, TOPY, 0.1); Cm.rotation.set(0, 0.6 + 0.2 * Math.sin(st), 0); Cm.scale.setScalar(Math.max(0.001, k * (1 - easeIn(gone))) * 1.45); setOp(Cm, 1 - gone); }
    const sp = S.camSparks, sv = st > TT.camGone && st < TT.camGone + 0.9; sp.visible = sv; if (sv) { burst(sp, v3(-0.3, TOPY + 0.55, 0.1), st, TT.camGone, 0.55, 0.9, false, 0.4); sp.material.opacity = 1 - clamp((st - TT.camGone - 0.4) / 0.5); } }
  // «3,2 M» en 3D: sale de la pantalla
  { const B = S.big3, k = pop(st, TT.big3, 0.45), out = clamp((st - TT.scrub0) / 0.3), vis = st > TT.big3 && out < 1; B.visible = vis;
    if (vis) { B.position.set(0, TOPY + 0.05 + 0.02 * Math.sin(st * 2), -0.62); B.scale.setScalar(Math.max(0.001, k * (1 - easeIn(out))) * 0.8); } }
}
function stageAt2(t, st) {
  S.ctaHide = t >= TT.cta0 && t < TT.loop0 + 0.3 ? eio(clamp((t - TT.web + 0.5) / 0.35)) : 0;     // en el cierre, los productos se van antes de que salga la web
  feedProducts(st, (st < TT.foto0 + 0.6 || st < 0) && !(t >= TT.cta0 && t < TT.loop0 + 0.3 && t >= TT.web + 0.2));
  stageStudio(st);
  drawBigScreen(t, st);
}
