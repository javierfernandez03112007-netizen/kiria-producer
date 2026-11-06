// ---------------------------------------------------------------- HUD: cabecera con la actividad en vivo, la pregunta pendiente, rótulos con línea guía, flechas,
// el osciloscopio de estímulo y respuesta, el contador del cerebro, el sello y las etiquetas del final
function buildHudPlan() {}
const HP = '#FF5FA8', HB = '#6FB8FF', HG = '#FFC24A';
const cw = (t, t0, t1) => win(t, t0, 0.22) * (1 - win(t, t1, 0.22));
function lab(P, txt, sub, k, opt) { if (k <= 0.01 || !P) return; callout(P, txt, sub, k, { size: 27, subSize: 19, bg: true, ...opt }); }
function bracketMsg(t, txt, col, k, blink) {
  if (k <= 0.01) return; const on = !blink || Math.sin(t * 9) > -0.3;
  hg.save(); hg.globalAlpha = k; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right'; hg.textBaseline = 'alphabetic';
  const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
  hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath();
  hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
  hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
  hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y); hg.restore();
}
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('PERRO ROBOT', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText('GUIADO POR NEURONAS HUMANAS', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  // a la derecha: la actividad de las neuronas, en vivo
  hg.textAlign = 'right'; hg.letterSpacing = '3px'; hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('ACTIVIDAD', 1024, 104);
  const x0 = 830, x1 = 1024, yb = 152;
  hg.beginPath(); for (let i = 0; i <= 96; i++) { const u = i / 96, tau = t - (1 - u) * 1.6; let v = 0; for (let j = 0; j < 6; j++) v = Math.max(v, spike(j, tau)); v *= Math.min(1.2, nAct(tau) + 0.25);
    const y = yb - v * 34 + Math.sin(u * 60 + t * 9) * 1.2; i ? hg.lineTo(lerp(x0, x1, u), y) : hg.moveTo(x0, y); }
  glowStroke(HP, 2.2, 10); hg.stroke(); noGlow();
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('EN VIVO', 1024, 182);
  if (Math.sin(t * 6) > -0.2) { hg.fillStyle = HC.red; hg.beginPath(); hg.arc(1024 - hg.measureText('EN VIVO').width - 16, 176, 6, 0, 7); hg.fill(); }
  hg.restore();
  bracketMsg(t, '¿QUÉ APRENDIERON?', HC.amber, win(t, K.aprendido2 + 0.1, 0.3) * (1 - win(t, K.pong11 - 0.05, 0.12)), true);
  bracketMsg(t, 'PONG', HG, win(t, K.pong11 - 0.05, 0.15) * (1 - win(t, K.doom11 - 0.05, 0.08)), false);
  bracketMsg(t, 'PONG · DOOM', HG, win(t, K.doom11 - 0.05, 0.12) * (1 - win(t, END - 1.3, 0.3)), false);
}
const chipPt = p => S.dog.chip.localToWorld(p.clone());
// flecha gruesa con brillo (dirección en grados: 180 izquierda, 0 derecha, -90 arriba)
function bigArrow(x, y, ang, k, col, txt) {
  if (k <= 0.01) return; const s = 0.6 + 0.4 * backOut(clamp(k * 1.6));
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(x, y);
  hg.save(); hg.rotate(ang * Math.PI / 180); hg.scale(s, s);
  hg.beginPath(); hg.moveTo(-110, -26); hg.lineTo(20, -26); hg.lineTo(20, -70); hg.lineTo(120, 0); hg.lineTo(20, 70); hg.lineTo(20, 26); hg.lineTo(-110, 26); hg.closePath();
  hg.fillStyle = 'rgba(0,0,0,.45)'; hg.fill(); glowStroke(col, 5, 22); hg.stroke(); noGlow(); hg.restore();
  hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '8px'; hfont(40); hg.fillStyle = col; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 14;
  hg.fillText(txt, 0, ang === -90 ? 150 : 128); hg.restore();
}
// osciloscopio de dos canales: estímulo del chip (azul) y respuesta de las neuronas (rosa)
function stimScope(t, a) {
  if (a <= 0.01) return;
  const x = 56, y = 1290, w = 968, h = 226;
  hg.save(); hg.globalAlpha = a; hg.fillStyle = 'rgba(0,0,0,.62)'; hg.strokeStyle = 'rgba(238,242,246,.28)'; hg.lineWidth = 1.5; rr(hg, x, y, w, h, 8); hg.fill(); hg.stroke();
  const rows = [['ESTÍMULO', HB, u => { const tau = t - (1 - u) * 1.4, e = stimEnv(tau); return e * (fract(tau * 5) < 0.35 ? 1 : 0); }, win(t, K.manda5, 0.2)],
    ['RESPUESTA', HP, u => { const tau = t - (1 - u) * 1.4; let v = 0; for (let j = 0; j < 8; j++) v = Math.max(v, spike(j, tau)); return v * Math.min(1, nAct(tau)); }, win(t, K.escucha5, 0.2)]];
  rows.forEach(([name, col, fn, k], r) => {
    const yy = y + 34 + r * 100, gx = x + 220, gw = w - 250;
    hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.letterSpacing = '3px'; hfont(21); hg.fillStyle = col; hg.globalAlpha = a * (0.35 + 0.65 * k); hg.fillText(name, x + 26, yy + 30);
    hg.strokeStyle = 'rgba(238,242,246,.12)'; hg.lineWidth = 1; hg.beginPath(); hg.moveTo(gx, yy + 58); hg.lineTo(gx + gw, yy + 58); hg.stroke();
    hg.save(); hg.beginPath(); hg.rect(gx, yy - 4, gw, 70); hg.clip(); hg.beginPath();
    for (let i = 0; i <= 300; i++) { const u = i / 300, v = fn(u) * k; const py = yy + 58 - v * 54 + (r ? Math.sin(u * 140 + t * 30) * 1.5 : 0); i ? hg.lineTo(gx + gw * u, py) : hg.moveTo(gx, py); }
    glowStroke(col, 2.6, 12); hg.stroke(); noGlow(); hg.restore();
  });
  hg.restore();
}
// línea de datos discontinua que corre de A a B
function flowLine(A, B, k, col, t) {
  if (k <= 0.01 || !A || !B || !A.ok || !B.ok) return; const e = eo(clamp(k * 1.5));
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.setLineDash([12, 14]); hg.lineDashOffset = -t * 160; glowStroke(col, 3, 12);
  hg.beginPath(); hg.moveTo(A.x, A.y); hg.lineTo(lerp(A.x, B.x, e), lerp(A.y, B.y, e)); hg.stroke(); hg.setLineDash([]); noGlow();
  hg.fillStyle = col; hg.beginPath(); hg.arc(lerp(A.x, B.x, e), lerp(A.y, B.y, e), 6, 0, 7); hg.fill(); hg.restore();
}
// el programa en 9 (es software: va en el HUD, a la izquierda)
function codeCard(t, k, t0) {
  if (k <= 0.01) return; const x = 56, y = 540, w = 372, h = 300, e = eo(clamp(k * 1.6));
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.fillStyle = 'rgba(6,10,16,.86)'; rr(hg, x, y, w * e, h, 12); hg.fill(); hg.strokeStyle = 'rgba(46,230,201,.7)'; hg.lineWidth = 2; rr(hg, x, y, w * e, h, 12); hg.stroke();
  if (e > 0.95) { hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.letterSpacing = '3px'; hfont(17); hg.fillStyle = '#62E3D4'; hg.fillText('PROGRAMA · EJEMPLO', x + 22, y + 32);
    hg.fillStyle = 'rgba(238,242,246,.22)'; hg.fillRect(x + 22, y + 52, w - 44, 1.5); hg.letterSpacing = '0px'; hfont(17);
    let left = clamp((t - t0) / 0.8) * CODE.reduce((s2, l) => s2 + l[0].length, 0);
    CODE.forEach(([s2, col], i) => { const n = Math.max(0, Math.min(s2.length, Math.floor(left))); left -= s2.length; hg.fillStyle = col; hg.fillText(s2.slice(0, n), x + 22, y + 84 + i * 32); }); }
  hg.restore();
}
const fmtN = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function hudAt(t) {
  hudBegin(); hdr(t);
  const D = S.dog, U = D.chip.userData;
  D.dog.updateMatrixWorld(true);
  const headP = D.head.localToWorld(v3(0, 0.03, 0.12)), domeP = D.dome.localToWorld(v3(0, 0.13, 0));
  // 1: «no tiene cerebro» (la cabeza) · «neuronas humanas vivas» (la cúpula)
  { const k = cw(t, K.cerebro1 - 0.05, K.pero1 + 0.15); if (k > 0.01) { const P = proj(headP); brackets(P, 210, 190, k, HC.red, 3); lab(headP, 'SIN CEREBRO', null, k, { dx: -150, dy: -170, color: HC.red }); } }
  lab(domeP, 'NEURONAS HUMANAS', t > K.vivas1 - 0.03 ? 'VIVAS' : null, cw(t, K.neuronas1 - 0.03, K.y2 + 0.25), { dx: 150, dy: -210, color: HP, subCol: HC.white });
  // 3: Cortical Labs · Australia · Melbourne
  { const k = cw(t, K.cortical3 - 0.03, TT.ausOff - 0.15); if (k > 0.01) { bigText('CORTICAL LABS', W / 2, 1450, 66, HC.white, k, { glow: 12, dark: 24 }); bigText('EMPRESA · AUSTRALIA', W / 2, 1530, 30, '#62E3D4', win(t, K.empresa3 - 0.03, 0.2) * k, { dark: 16, ls: 6 }); } }
  lab(v3(dogXZ(t)[0], 0.3, 0), 'MELBOURNE', null, cw(t, K.australia3 + 0.2, TT.ausOff - 0.2), { dx: 110, dy: -120, color: '#62E3D4' });
  // 4: chip, electrodos, neuronas humanas, cultivadas en laboratorio
  lab(chipPt(v3(0.07, CHIP.t / 2, 0.07)), 'CHIP', null, cw(t, K.chip4 + 0.05, K.electrodos4 - 0.05), { dx: 150, dy: -170, color: HC.white });
  lab(chipPt(U.ePos[44]), 'ELECTRODOS', null, cw(t, K.electrodos4 - 0.02, K.crecen4 - 0.05), { dx: 150, dy: -200, color: HB });
  lab(chipPt(U.cells[5]), 'NEURONAS HUMANAS', null, cw(t, K.neuronas4 - 0.03, K.cultivadas4 - 0.05), { dx: -150, dy: -190, color: HP });
  lab(chipPt(v3(0.045, CHIP.t / 2 + 0.008, -0.04)), 'CULTIVADAS EN LABORATORIO', 'A PARTIR DE CÉLULAS MADRE', cw(t, K.cultivadas4 - 0.03, K.el5 - 0.05), { dx: 60, dy: -200, color: HC.white, len: 30 });
  // 5: señales y respuesta
  stimScope(t, cw(t, K.manda5 - 0.15, K.programa6 - 0.1));
  lab(chipPt(U.ePos[U.stimE[3]]), 'SEÑALES ELÉCTRICAS', null, cw(t, K.senales5 - 0.03, K.escucha5 - 0.05), { dx: 150, dy: -200, color: HB });
  lab(chipPt(U.cells[12]), 'RESPUESTA', null, cw(t, K.responden5 - 0.03, K.programa6 - 0.05), { dx: -150, dy: -210, color: HP });
  // 6: el programa; la respuesta → pasos; izquierda, derecha, adelante
  { const Pn = S.code.panel; if (Pn.visible) lab(Pn.position.clone().add(v3(0, 0.17, 0)), 'PROGRAMA', null, cw(t, K.programa6 - 0.03, K.izquierda6 - 0.2), { dx: 120, dy: -140, color: '#62E3D4' }); }
  { const A = proj(domeP), Pn = S.code.panel, B = Pn.visible ? proj(Pn.position) : null;
    flowLine(A, B, cw(t, K.convierte6 - 0.05, K.izquierda6 - 0.15), HP, t);
    const k2 = cw(t, K.pasos6 - 0.25, K.izquierda6 - 0.1); if (B && k2 > 0.01) for (const L of D.legs) flowLine(B, proj(L.hm.getWorldPosition(new THREE.Vector3())), k2, HC.amber, t);
    lab(D.legs[1].hm.getWorldPosition(new THREE.Vector3()), 'PASOS', null, cw(t, K.pasos6 - 0.03, K.izquierda6 - 0.1), { dx: 140, dy: 120, color: HC.amber }); }
  bigArrow(W / 2, 1330, 180, cwin(t, K.izquierda6 - 0.03, K.derecha6 - 0.05, 0.08, 0.1), HC.amber, 'IZQUIERDA');
  bigArrow(W / 2, 1330, 0, cwin(t, K.derecha6 - 0.03, K.adelante6 - 0.05, 0.08, 0.1), HC.amber, 'DERECHA');
  bigArrow(W / 2, 1330, -90, cwin(t, K.adelante6 - 0.03, K.adelante6 + 0.75, 0.08, 0.2), HC.amber, 'ADELANTE');
  // 7: el objetivo
  lab(v3(RT.tx, 0.02, 0), 'OBJETIVO', t > TT.fb ? 'ALCANZADO' : null, cw(t, K.objetivo7 - 0.03, K.ojo8 + 0.1), { dx: 140, dy: -170, color: '#FF4D61', subCol: '#7CF0A9' });
  // 8: no es un cerebro · el tuyo: 86.000 millones · aquí, un puñado
  lab(domeP, 'NO ES UN CEREBRO', null, cw(t, K.no8 - 0.03, K.tuyo8 - 0.05), { dx: 150, dy: -170, color: HC.red });
  if (S.brain.g.visible) lab(S.brain.g.position.clone().add(v3(0, 0.3, 0)), 'TU CEREBRO', null, cw(t, K.tuyo8 - 0.03, K.aqui8 - 0.05), { dx: -140, dy: -120, color: HC.white });
  { const k = cw(t, K.n86_8 - 0.1, K.aqui8 + 0.15); if (k > 0.01) { const u = clamp((t - (K.n86_8 - 0.1)) / (K.millones8 + 0.15 - K.n86_8 + 0.1));
      bigText(fmtN(86e9 * Math.pow(u, 3)), W / 2, 1110, 74, '#FF8FC8', k, { type: false, glow: 16, dark: 24, ls: 4 });
      bigText('NEURONAS · CEREBRO HUMANO', W / 2, 1182, 25, HC.white, k, { dark: 14, ls: 5 }); } }
  lab(chipPt(U.cells[9]), 'UN PUÑADO', null, cw(t, K.punado8 - 0.05, K.chip9 - 0.1), { dx: 150, dy: -190, color: HP });
  // 9: chip, programa y motores: máquina
  lab(chipPt(v3(0.07, CHIP.t / 2, 0.07)), 'CHIP', null, cw(t, K.chip9 - 0.03, K.maquina9 + 0.4), { dx: 140, dy: -130, color: HC.white });
  codeCard(t, cw(t, K.programa9 - 0.03, K.todavia10 - 0.05), K.programa9 - 0.03);
  lab(D.legs[1].hm.getWorldPosition(new THREE.Vector3()), 'MOTORES', null, cw(t, K.motores9 - 0.03, K.maquina9 + 0.4), { dx: 150, dy: 110, color: HC.amber });
  { const k = cw(t, K.maquina9 - 0.05, K.todavia10 + 0.1); if (k > 0.01) { const P = proj(D.body.localToWorld(v3(0, 0.0, 0.05))); brackets({ x: P.x, y: P.y - 40 }, 760, 700, k, HC.white, 3); bigText('MÁQUINA', W / 2, 1480, 64, HC.white, k, { glow: 10, dark: 22 }); } }
  // 10: sin revisar
  { const k = cwin(t, K.revisado10 - 0.03, K.aprendido11 - 0.25, 0.15, 0.25); if (k > 0.01) stamp('SIN REVISAR', W / 2, 1450, k, HC.red, 78); }
  // 11: según la empresa; Pong; Doom
  { const Sc = S.screen.g; if (Sc.visible && t > K.aprendido11) { const top = Sc.position.clone().add(v3(0, 0.2, 0));
      { const k = cw(t, K.segun11 - 0.03, K.le12); if (k > 0.01) { const P = proj(Sc.position.clone().add(v3(0, -0.24, 0))); bigText('SEGÚN CORTICAL LABS', W / 2, clamp(P.y + 40, 600, 1500), 28, HC.white, k, { dark: 16, ls: 5 }); } }
      lab(top, 'PONG', null, win(t, K.pong11 - 0.03, 0.22) * (t < K.doom11 - 0.04 ? 1 : 0), { dx: 120, dy: -110, color: HG });
      lab(top, 'DOOM', null, win(t, K.doom11 - 0.04, 0.22) * (1 - win(t, K.le12 + 0.1, 0.2)), { dx: 120, dy: -110, color: HG }); } }
  // 12: ¿derechos?
  lab(headP, '¿DERECHOS?', null, cw(t, K.derechos12 - 0.03, END - 1.5), { dx: 130, dy: -200, color: HG, size: 34 });
}
