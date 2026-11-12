// ---------------------------------------------------------------- HUD: cabecera (GTA 6 · el dinero · sale el 19 NOV) con la pregunta pendiente (¿cuánto va a ganar?) y titulares en placas
function buildHudPlan() {}
const HG = '#FFC24A', HD = '#8FE6FF', HR = '#FF5247', HV = '#7CF0A9';
function hdr(t) {
  hg.save(); const gr = hg.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, 'rgba(6,10,18,.5)'); gr.addColorStop(1, 'rgba(6,10,18,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, W, 300);
  hg.textBaseline = 'alphabetic'; hg.shadowColor = 'rgba(0,0,0,.6)'; hg.shadowBlur = 10;
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = '#ffffff'; hg.textAlign = 'left'; hg.fillText('GTA 6', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = '#E3E8EE'; hg.fillText('EL DINERO · LO QUE NADIE TE CUENTA', 56, 182);
  hg.fillStyle = 'rgba(255,255,255,.45)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = '#E3E8EE'; hg.fillText('SALE EL', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('19 NOV', 1024, 148);
  hfont(17, false); hg.fillStyle = '#E3E8EE'; hg.fillText('PS5 · XBOX SERIES', 1024, 178);
  const mk = win(t, K.ganar2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = '¿CUÁNTO VA A GANAR? · ???', col = HR, blink = true;
    if (t > K.tres8 + 0.2) { txt = '3.200 M$ EL 1.ER AÑO (ANALISTAS) ✓'; col = HC.green; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = mk; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.shadowBlur = 0; hg.fillStyle = 'rgba(8,10,14,.6)'; hg.fillRect(x0, y - 22, w, 32);
    hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath();
    hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
    hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
    hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y);
  }
  hg.restore();
}
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function cap(txt, y, size, col, k, o = {}) {
  if (k <= 0.01) return; hg.save(); hg.letterSpacing = (o.ls ?? Math.round(size * 0.12)) + 'px'; hfont(size); const tw = hg.measureText(txt).width, pw = tw + size * 1.1, ph = size * 1.55, x = o.x ?? W / 2;
  const e = eo(clamp(k * 1.4)); hg.globalAlpha = clamp(k * 3) * 0.78; hg.fillStyle = o.bg || 'rgba(10,12,18,1)'; rr(hg, x - pw / 2 * e, y - ph / 2, pw * e, ph, ph * 0.22); hg.fill();
  if (o.bar) { hg.globalAlpha = clamp(k * 3); hg.fillStyle = o.bar; hg.fillRect(x - pw / 2 * e, y - ph / 2, 8, ph); } hg.restore();
  bigText(txt, x, y + 2, size, col, k, { glow: o.glow, type: o.type, ls: o.ls ?? Math.round(size * 0.12) });
}
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1440;
  // 1
  { cap('NINGUNA PELÍCULA', Y - 45, 52, '#ffffff', cw(t, K.pelicula1 - 0.1, K.es2 - 0.1)); cap('HA GANADO TANTO', Y + 45, 60, HG, cw(t, K.ganado1 - 0.05, K.es2 - 0.1), { glow: 10, bar: HG }); }
  // 2
  { cap('GTA 5', Y, 86, HV, cw(t, K.gta2 - 0.1, K.y2 - 0.05), { glow: 12, type: false, bar: HV });
    cap('19 DE NOVIEMBRE', Y - 45, 44, '#ffffff', cw(t, K.diecinueve2 - 0.1, K.cuanto2 - 0.1)); cap('SALE GTA 6', Y + 45, 64, HG, cw(t, K.sale2 - 0.05, K.cuanto2 - 0.1), { glow: 10, type: false, bar: HG });
    cap('¿CUÁNTO VA A GANAR?', Y, 58, HG, cw(t, K.cuanto2 - 0.05, K.el3 - 0.1), { glow: 10, bar: HG }); cap('TE LO DIGO AL FINAL ↓', Y + 100, 32, '#ffffff', cw(t, K.digo2 - 0.05, K.el3 - 0.1)); }
  // 3
  { const n1 = lerp(0, 800, eo(clamp((t - K.n800 + 0.15) / 0.7))), n2 = lerp(800, 1000, eo(clamp((t - K.n1000 + 0.1) / 0.5)));
    cap('EL PRIMER DÍA', Y - 60, 40, '#ffffff', cw(t, K.primer3 - 0.1, K.en3 - 0.1)); cap(fmt(n1) + ' M$', Y + 30, 82, HV, cw(t, K.n800 - 0.1, K.en3 - 0.1), { glow: 12, type: false, bar: HV });
    cap('EN 3 DÍAS', Y - 60, 40, '#ffffff', cw(t, K.en3 - 0.05, K.lleva4 - 0.1)); cap(fmt(t < K.n1000 - 0.1 ? 800 : n2) + ' M$', Y + 30, 82, HV, cw(t, K.n1000 - 0.15, K.lleva4 - 0.1), { glow: 12, type: false, bar: HV });
    cap('RÉCORD GUINNESS', Y + 130, 38, HG, cw(t, K.record3 - 0.05, K.lleva4 - 0.1), { bar: HG }); }
  // 4
  { const n = lerp(0, 230, eo(clamp((t - K.n230 + 0.1) / 0.9)));
    cap('+' + fmt(n) + ' MILLONES', Y - 40, 66, HV, cw(t, K.n230 - 0.1, K.y5 - 0.1), { glow: 10, type: false, bar: HV }); cap('DE COPIAS', Y + 50, 40, '#ffffff', cw(t, K.copias4 - 0.1, K.y5 - 0.1));
    cap('MÁS QUE HABITANTES TIENE BRASIL', Y + 135, 34, HG, cw(t, K.mas4b - 0.05, K.y5 - 0.1), { bar: HG }); }
  // 5
  { cap('¿Y GTA 6?', Y, 76, HG, cw(t, K.y5 - 0.05, K.rockstar5 - 0.05), { glow: 12, type: false, bar: HG });
    cap('ROCKSTAR NIEGA QUE COSTARA', Y - 50, 40, '#ffffff', cw(t, K.negar5 - 0.1, K.los6 - 0.1)); cap('MÁS QUE EL BURJ KHALIFA', Y + 40, 54, HR, cw(t, K.edificio5 - 0.1, K.los6 - 0.1), { glow: 10, bar: HR }); }
  // 6
  { cap('LOS ANALISTAS CALCULAN', Y - 60, 38, HC.grey, cw(t, K.los6 - 0.05, K.y7 - 0.1)); cap('1.000–1.500 M$', Y + 25, 76, HG, cw(t, K.n1000b - 0.1, K.y7 - 0.1), { glow: 12, type: false, bar: HG });
    cap('MÁS QUE CUALQUIER PELÍCULA', Y + 125, 38, '#ffffff', cw(t, K.mas6 - 0.05, K.y7 - 0.1)); }
  // 7
  { cap('Y A TI TE COSTARÁ', Y - 45, 44, '#ffffff', cw(t, K.y7 - 0.05, K.respuesta8 - 0.1)); cap('79,99 €', Y + 50, 84, HR, cw(t, K.n80 - 0.15, K.respuesta8 - 0.1), { glow: 12, type: false, bar: HR }); }
  // 8
  { const n = lerp(0, 3200, eio(clamp((t - K.tres8 + 0.1) / 2.4)));
    cap('LA RESPUESTA', Y - 60, 40, '#ffffff', cw(t, K.respuesta8 - 0.05, K.tres8 - 0.1)); cap('SEGÚN LOS ANALISTAS', Y - 60, 34, HC.grey, cw(t, K.segun8 - 0.05, K.pagarias9 - 0.1));
    cap(fmt(n) + ' M$', Y + 30, 92, HV, cw(t, K.tres8 - 0.1, K.pagarias9 - 0.1), { glow: 14, type: false, bar: HV });
    cap('SOLO EL PRIMER AÑO', Y + 135, 40, HG, cw(t, K.solo8 - 0.05, K.mas8 - 0.05), { bar: HG }); cap('MÁS QUE LA PELÍCULA N.º 1', Y + 135, 40, HG, cw(t, K.mas8 - 0.05, K.pagarias9 - 0.1), { bar: HG }); }
  // 9
  { cap('¿PAGARÍAS 80 €', Y - 45, 66, '#ffffff', cw(t, K.pagarias9 - 0.05, K.mandaselo9 - 0.05), { type: false, bar: '#ffffff' }); cap('POR UN VIDEOJUEGO?', Y + 50, 56, HG, cw(t, K.videojuego9 - 0.15, K.mandaselo9 - 0.05), { glow: 10, type: false, bar: HG });
    cap('MÁNDASELO A QUIEN DICE QUE', Y - 30, 40, '#ffffff', cw(t, K.mandaselo9 - 0.05, END - 0.6)); cap('JUGAR ES TIRAR EL DINERO', Y + 55, 50, HG, cw(t, K.jugar9 - 0.1, END - 0.6), { bar: HG }); }
}
