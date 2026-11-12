// ---------------------------------------------------------------- HUD: cabecera (odontología · 5 años) con la pregunta pendiente (¿qué es tu ortodoncista?), titulares en placas
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A', HD = '#8FE6FF', HR = '#FF5247';
function hdr(t) {
  hg.save(); const gr = hg.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, 'rgba(6,10,18,.55)'); gr.addColorStop(1, 'rgba(6,10,18,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, W, 300);
  hg.textBaseline = 'alphabetic'; hg.shadowColor = 'rgba(0,0,0,.6)'; hg.shadowBlur = 10;
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = '#ffffff'; hg.textAlign = 'left'; hg.fillText('ODONTOLOGÍA', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = '#E3E8EE'; hg.fillText('POR DENTRO · LO QUE NADIE TE CUENTA', 56, 182);
  hg.fillStyle = 'rgba(255,255,255,.45)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = '#E3E8EE'; hg.fillText('GRADO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('5 AÑOS', 1024, 148);
  hfont(17, false); hg.fillStyle = '#E3E8EE'; hg.fillText('300 ECTS', 1024, 178);
  const mk = win(t, K.final2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = '¿QUÉ ES TU ORTODONCISTA? · ???', col = HR, blink = true;
    if (t > K.master7) { txt = 'DENTISTA + MÁSTER ✓'; col = HC.green; blink = false; }
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
function checklist(items, x, y, t, a = 1, size = 40) {
  for (let i = 0; i < items.length; i++) { const [txt, t0, col] = items[i], k = cw(t, t0 - 0.08, 1e9) * a; if (k <= 0.01) continue;
    hg.save(); hg.letterSpacing = '3px'; hfont(size); const tw = hg.measureText(txt).width; hg.globalAlpha = clamp(k * 3) * 0.78; hg.fillStyle = 'rgba(10,12,18,1)'; rr(hg, x - 22, y + i * (size * 1.6) - size * 0.75, tw + 44, size * 1.5, 12); hg.fill(); hg.restore();
    bigText(txt, x, y + i * (size * 1.6), size, col || HC.white, k, { align: 'left', ls: 3 }); }
}
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1440;
  // 1
  { cap('TU ORTODONCISTA', Y - 45, 50, '#ffffff', cw(t, K.ortodoncista1 - 0.1, K.porque1 - 0.05)); cap('NO ES ESPECIALISTA', Y + 45, 58, HR, cw(t, K.especialista1 - 0.05, K.porque1 - 0.05), { glow: 10, bar: HR });
    cap('EN ESPAÑA, ESA ESPECIALIDAD', Y - 45, 40, '#ffffff', cw(t, K.espana1 - 0.1, K.entonces2 - 0.1)); cap('NO EXISTE', Y + 45, 76, HR, cw(t, K.existe1 - 0.05, K.entonces2 - 0.1), { glow: 14, type: false, bar: HR }); }
  // 2
  { cap('¿ENTONCES QUÉ ES?', Y, 58, HG, cw(t, K.entonces2 - 0.05, K.odontologia3 - 0.15), { glow: 10, bar: HG }); cap('TE LO DIGO AL FINAL ↓', Y + 100, 32, '#ffffff', cw(t, K.digo2 - 0.05, K.odontologia3 - 0.15)); }
  // 3
  { cap('ODONTOLOGÍA', Y - 60, 46, '#ffffff', cw(t, K.odontologia3 - 0.05, K.acabar4 - 0.15)); cap('5 AÑOS', Y + 30, 76, HG, cw(t, K.cinco3 - 0.1, K.acabar4 - 0.15), { glow: 12, type: false, bar: HG });
    cap('+ MUCHAS HORAS CON PACIENTES', Y + 125, 34, HD, cw(t, K.muchas3 - 0.05, K.acabar4 - 0.15)); }
  // 4
  { const a = cw(t, K.acabar4 - 0.05, K.salen5 - 0.15); cap('AL ACABAR YA PUEDES', Y - 130, 34, HC.grey, a);
    checklist([['✓ EMPASTAR', K.empastar4, HC.green], ['✓ SACAR MUELAS', K.sacar4, HC.green], ['✓ PONER BRACKETS', K.brackets4, HC.green]], 300, Y - 50, t, a, 44);
    cap('TODO, CON EL GRADO', Y + 150, 40, HG, cw(t, K.todo4 - 0.05, K.salen5 - 0.15), { bar: HG }); }
  // 5
  { const n1 = lerp(0, 1700, eo(clamp((t - K.n1700 + 0.1) / 0.8))), n2 = lerp(1700, 43000, eio(clamp((t - K.n43000 + 0.4) / 0.9)));
    cap(fmt(n1), Y - 20, 86, HG, cw(t, K.n1700 - 0.1, K.pais5 - 0.1), { glow: 14, type: false, bar: HG }); cap('DENTISTAS NUEVOS CADA AÑO', Y + 80, 34, '#ffffff', cw(t, K.dentistas5 - 0.05, K.pais5 - 0.1));
    cap('+' + fmt(n2), Y - 20, 86, '#ffffff', cw(t, K.pais5 - 0.05, K.segun6 - 0.1), { glow: 12, type: false, bar: '#ffffff' }); cap('DENTISTAS COLEGIADOS EN ESPAÑA', Y + 80, 32, HD, cw(t, K.n43000 - 0.1, K.segun6 - 0.1)); }
  // 6
  { cap('SEGÚN EL CONSEJO DE DENTISTAS', Y - 120, 30, HC.grey, cw(t, K.segun6 - 0.05, K.julio6 - 0.15)); cap('ESPAÑA: EL ÚNICO PAÍS DE LA UE', Y - 40, 44, '#ffffff', cw(t, K.unico6 - 0.1, K.julio6 - 0.15));
    cap('SIN ESPECIALIDADES OFICIALES', Y + 45, 50, HR, cw(t, K.sin6 - 0.05, K.julio6 - 0.15), { glow: 10, bar: HR });
    cap('JULIO DE 2026 · SANIDAD', Y - 60, 34, HC.grey, cw(t, K.julio6 - 0.05, K.asi7 - 0.15)); cap('RECHAZA CREAR 6', Y + 20, 62, HR, cw(t, K.rechazo6 - 0.1, K.asi7 - 0.15), { glow: 12, type: false, bar: HR });
    cap('ENTRE ELLAS, ORTODONCIA', Y + 110, 40, HG, cw(t, K.ortodoncia6 - 0.1, K.asi7 - 0.15)); }
  // 7
  { cap('TU ORTODONCISTA =', Y - 60, 40, '#ffffff', cw(t, K.ortodoncista7 - 0.1, K.brackets8 - 0.15)); cap('DENTISTA + MÁSTER', Y + 20, 60, HG, cw(t, K.master7 - 0.1, K.brackets8 - 0.15), { glow: 10, type: false, bar: HG });
    cap('ESPECIALISTA OFICIAL: NO', Y + 110, 42, HR, cw(t, K.oficial7 - 0.05, K.brackets8 - 0.15), { bar: HR }); }
  // 8
  { const d = cw(t, K.brackets8 - 0.05, K.mandaselo8 - 0.05); cap('¿BRACKETS', Y - 40, 70, '#ffffff', d, { type: false, bar: '#ffffff' }); cap('O INVISIBLES?', Y + 60, 70, HD, cw(t, K.invisibles8 - 0.1, K.mandaselo8 - 0.05), { glow: 10, type: false, bar: HD });
    const m = cw(t, K.mandaselo8 - 0.05, END - 0.6); cap('MÁNDASELO A QUIEN', Y - 30, 46, '#ffffff', m); cap('LLEVA APARATO', Y + 60, 56, HG, cw(t, K.aparato8 - 0.1, END - 0.6), { bar: HG }); }
}
