// ---------------------------------------------------------------- LA ESCENA Y SU COREOGRAFÍA (un solo plano continuo; tiempos de la voz de Javi)
// 0 puerta: el LUNES asoma tras los edificios · 2,2 «el lunes ya está saliendo» (sube como la luna) · 5,2 su cara · 6,8 el cuarto · 9,9 la mano al pecho (el nudo)
// 11,3 los ojos · 12,5 el cerebro y los pensamientos del lunes dando vueltas · 17,2 la alarma y el pulso al pecho · 19,4 la cámara sale: 8 de las 10 ventanas
// 26,1 vuelve: escribe en el cuaderno (los pensamientos caen a la página) · 29,9 quien apunta se duerme 9 min antes · 36 suelta el boli, respira, puerta (bucle).
let TL = {};
async function buildScene() {
  TL = { lunes: K['lunes_1'], face: K['por_2'], room: K['estas_3'], chest: K['encoge_3'], eyes: K['no_4'], brain: K['cerebro_4'], viv: K['viviendo_4'], alarm: K['enciende_5'], al2: K['alarma_5'], only: K['y_6'],
    casi: K['casi_6'], diez: K['diez_6'], help: K['lo_7'], write: K['escribe_7'], est: K['en_8'], dormir: K['dormir_8'], dormian: K['dormian_8'], nueve: K['nueve_8'], send: K['mandaselo_9'] };
  S.room = buildRoom(); S.city = buildCity(); S.fac = buildFacade(); scene.add(S.room, S.city, S.fac); clockDraw(S.room);
  const b = S.boy = animeBoy(); b.position.set(BOY.x, BED.top + 0.03, BOY.z); b.rotation.y = BOY.yaw; scene.add(b);
  S.brain = buildBrain(); S.brain.position.set(0, 0.022, -0.012); b.userData.headC.add(S.brain); S.pulse = buildPulse(); scene.add(S.pulse); S.knot = buildKnot(); S.knot.position.set(0, 0.2, 0); S.knot.scale.set(1, 0.72, 1); b.userData.J.chest.add(S.knot);
  S.nb = buildNotebook(); S.nb.rotation.order = 'YXZ'; scene.add(S.nb); S.pen = buildPen(); scene.add(S.pen); S.icons = thoughtIcons(); for (const i of S.icons) { scene.add(i); i.traverse(o => { if (o.material && o.material.color) o.userData.c0 = o.material.color.clone(); }); }
  S.L.fillD.set(-0.04, 0.1, -1).normalize();
}
const _v = () => new THREE.Vector3(), nbXa = nb => new THREE.Vector3(1, 0, 0).applyQuaternion(nb.quaternion), nbZa = nb => new THREE.Vector3(0, 0, 1).applyQuaternion(nb.quaternion);
// orden en que se encienden las ventanas de la fachada (la suya es la 1) y cuándo
function litTimes() { const n = S.fac.userData.rooms.filter(r => r.has).length, t0 = TL.casi - 0.05, t1 = TL.diez + 0.25; return [...Array(n)].map((_, i) => t0 + (i + 1) * (t1 - t0) / n); }
function stageAt(t, st) {
  NOW = t; const b = S.boy, U = b.userData, J = U.J, inside = cam.position.z > -2.6, vz = voice(t);
  // ---- luz: el sol entra por la ventana; el LUNES, al subir, da una luz fría de luna
  const loopIn = win(t, END - 2.3, 2.3), rise = t < 20 ? lerp(0.6, 1, sm5(seg(t, 0.2, TL.lunes + 2.0))) : (1 - sm5(seg(t, TL.write - 0.2, TL.write + 2.4))) * 1 + 0.6 * loopIn * (t > TL.write + 2.4 ? 1 : 0);
  lunesAt(S.city, rise, t); S.L.fill.color.setHex(0xcdd6ff); S.L.fill.intensity = 0.08 + 0.4 * clamp(rise);
  if (inside) lightsAt(_v().set(0, 1.2, -0.3), 6.6); else lightsAt(_v().set(2, 1.5, -2.2), Math.max(8, Math.min(26, -cam.position.z)));
  S.fac.userData.ext.visible = cam.position.z < -2.0; S.room.userData.winFrame.visible = cam.position.z > -2.15 || cam.position.z < -4;
  // ---- estados
  const worry = t < TL.help ? lerp(0.7, 1, win(t, TL.face - 0.3, 0.6)) : lerp(1, 0.12, sm5(seg(t, TL.help, TL.est + 1.5))) + 0.58 * loopIn, calm = sm5(seg(t, TL.write, TL.send + 0.6)) * (1 - loopIn);
  const kChest = bump(t, TL.chest - 0.62, TL.only + 0.1, 0.5, 0.6), squeeze = bump(t, TL.chest - 0.1, TL.eyes + 0.2, 0.3, 0.6), ghost = bump(t, TL.brain - 0.3, TL.only + 0.2, 0.55, 0.6), alarm = win(t, TL.alarm - 0.12, 0.35) * (1 - win(t, TL.only - 0.1, 0.5));
  const nbOn = t > TL.only + 2.2 && t < TL.send + 1.25, kW = nbOn ? win(t, TL.help - 0.2, 0.5) * (1 - win(t, TL.send + 0.15, 0.5)) : 0, kHold = nbOn ? 1 - win(t, TL.send + 0.95, 0.3) : 0;
  // ---- cuerpo: piernas cruzadas, espalda encorvada por la preocupación; respira (más deprisa con la alarma)
  poseCross(b); const br = Math.sin(t * (1.7 + 2.6 * alarm)) * (0.5 + 0.8 * alarm), slump = worry * (1 - 0.5 * calm) + 0.25 * bump(t, TL.face - 0.2, TL.room, 0.4, 0.5), sigh = bump(t, TL.send + 0.3, TL.send + 1.6, 0.5, 0.7);
  J.chest.rotation.x = 0.06 + 0.17 * slump + 0.012 * br - 0.05 * sigh; J.chest.position.y = 0.12 + 0.004 * br + 0.012 * sigh; J.neck.rotation.x = 0.1 * slump; U.torso.scale.set(1 - 0.05 * squeeze + 0.012 * br, 1, 0.7 + 0.012 * br - 0.03 * squeeze);
  for (const k of ['shL', 'shR']) J[k].position.y = 0.325 + 0.018 * squeeze + 0.006 * br - 0.012 * calm;
  const kCam = Math.max(0.6 * bump(t, TL.face - 0.4, TL.room + 0.2, 0.5, 0.6), 0.45 * bump(t, TL.room - 0.3, TL.chest + 0.3, 0.7, 0.7), 0.75 * bump(t, TL.eyes - 0.5, TL.only + 0.3, 0.6, 0.7));      // cuánto se gira hacia la cámara en los planos de cara
  // ---- cabeza: mira a la ventana (al LUNES); baja con «¿por qué pesa tanto?»; al cuaderno mientras escribe; al final levanta la vista
  const nbLook = nbOn ? win(t, TL.help - 0.3, 0.6) * (1 - win(t, TL.send + 0.35, 0.6)) : 0, down = bump(t, TL.face + 0.3, TL.eyes - 0.2, 0.6, 0.6) * 0.5 + 0.3 * bump(t, TL.chest - 0.3, TL.eyes - 0.3, 0.4, 0.4);
  // ---- el cuaderno: cerrado a su lado en la cama; mientras escribe, abierto en el regazo
  const nb = S.nb; nb.userData.open.visible = nbOn; nb.userData.closed.visible = !nbOn; b.updateMatrixWorld(true);
  const rest = b.localToWorld(_v().set(-0.5, 0.012, 0.02)), lap = b.localToWorld(_v().set(0.03, 0.215, 0.36)), back = win(t, TL.send + 0.95, 0.3);
  if (nbOn) { nb.position.copy(lap).lerp(rest.clone().add(_v().set(0, 0.1, 0)), back); nb.rotation.set(0.2 * (1 - back), BOY.yaw + Math.PI + 0.1, 0); } else { nb.position.copy(rest); nb.rotation.set(0, BOY.yaw + 0.35, 0); }
  nb.updateMatrixWorld(true);
  const wr = [seg(t, TL.write - 0.3, TL.write + 0.4), ...[0, 1, 2].map(i => seg(t, TL.write + 0.5 + i * 0.72, TL.write + 1.16 + i * 0.72))], sR = { a: seg(t, TL.est + 0.45, TL.est + 1.25), b: seg(t, K['apuntaban_8'] - 0.05, K['apuntaban_8'] + 1.0), moon: seg(t, TL.dormir - 0.1, TL.dormir + 0.6), nine: seg(t, TL.nueve - 0.03, TL.nueve + 0.45) };
  let tip = null; if (nbOn) { const tp = drawNote(nb, wr, sR); const away = win(t, TL.nueve + 0.3, 0.4); tip = notePt(nb, tp[0], tp[1], 0.002 + 0.02 * bump(t, TL.est - 0.2, TL.est + 0.45, 0.2, 0.2) + 0.03 * away).addScaledVector(nbXa(nb), 0.1 * away).addScaledVector(nbZa(nb), 0.07 * away); }
  // ---- manos: en las rodillas · la derecha al pecho · escribir (derecha) y sujetar el cuaderno (izquierda)
  const fw = _v().set(0, 0, 1).applyQuaternion(b.quaternion), rt = _v().set(1, 0, 0).applyQuaternion(b.quaternion), up = _v().set(0, 1, 0), nbX = _v().set(1, 0, 0).applyQuaternion(nb.quaternion), nbZ = _v().set(0, 0, 1).applyQuaternion(nb.quaternion), nbY = _v().set(0, 1, 0).applyQuaternion(nb.quaternion);
  for (const [k, s] of [['L', 1], ['R', -1]]) { const knee = b.localToWorld(_v().set(0.3 * s, 0.19, 0.3)), F = fw.clone().multiplyScalar(0.85).addScaledVector(rt, -0.3 * s).addScaledVector(up, -0.35), N = up.clone().negate().addScaledVector(fw, 0.25); let T = knee, curl = 0.28, spread = 0.3, sw = 0.5 * s;
    if (k === 'R') { const C = J.chest.localToWorld(_v().set(0.035, 0.215, 0.118)), cf = _v().set(0.62, 0.72, 0.15).applyQuaternion(J.chest.getWorldQuaternion(_qa)), cn = _v().set(0, -0.12, -1).applyQuaternion(_qa); const wc = C.clone().addScaledVector(cf.clone().normalize(), -0.052).addScaledVector(cn.clone().normalize(), -0.016);
      T = knee.clone().lerp(wc, kChest); F.lerp(cf, kChest); N.lerp(cn, kChest); curl = lerp(curl, 0.1 + 0.12 * squeeze, kChest); spread = lerp(spread, 1, kChest); sw = lerp(sw, -0.95, kChest);
      if (kW > 0.001 && tip) { const wp = tip.clone().addScaledVector(nbX, 0.06).addScaledVector(nbY, 0.045).addScaledVector(nbZ, 0.1); T.lerp(wp, kW); F.lerp(tip.clone().addScaledVector(nbY, 0.02).sub(wp).normalize(), kW); N.lerp(nbY.clone().negate().addScaledVector(nbX, -0.25), kW); curl = lerp(curl, 0.85, kW); spread = lerp(spread, 0, kW); sw = lerp(sw, -0.6, kW); } }
    else if (kHold > 0.001) { const hp = notePt(nb, 0, 830, 0.018).addScaledVector(nbX, -0.155); T = knee.clone().lerp(hp, kHold); F.lerp(nbX.clone().addScaledVector(nbZ, -0.22), kHold); N.lerp(nbY.clone().negate(), kHold); curl = lerp(curl, 0.32, kHold); spread = lerp(spread, 0, kHold); }
    armTo(b, k, T, sw); handAim(b, k, F, N); handCurl(U['hand' + k], curl, spread); }
  // el boli: en la mano mientras escribe; si no, sobre el cuaderno cerrado
  { const p = S.pen; if (nbOn && tip && kW > 0.5) { p.position.copy(tip); const hw = wpos(J.hR); p.quaternion.setFromUnitVectors(_v().set(0, 1, 0), hw.clone().addScaledVector(nbY, 0.07).addScaledVector(nbZ, 0.03).sub(tip).normalize()); } else { p.position.copy(nbOn ? nb.position : rest).add(_v().set(0, 0.022, 0)).addScaledVector(nbX, 0.02); p.quaternion.setFromUnitVectors(_v().set(0, 1, 0), nbZ.clone().addScaledVector(nbX, 0.3).normalize()); p.position.addScaledVector(nbZ, -0.07); } }
  // la cabeza (después de las manos, para que mire lo que toca)
  { const far = _v().set(-6 + 3 * Math.sin(t * 0.4), 8 + 20 * rise, -300), hw = headW(b), dF = far.sub(hw).normalize(), dC = cam.position.clone().sub(hw).normalize(), tgt = hw.clone().addScaledVector(dF.lerp(dC, kCam).normalize(), 5); lookAtPt(b, tgt, 1 - nbLook); if (nbLook > 0.001) lookAtPt(b, nb.position.clone().addScaledVector(nbY, 0.02), nbLook); J.head.rotation.x += 0.3 * down * (1 - nbLook) + 0.05 * slump; J.head.rotation.z = 0.06 * slump - 0.05 * sigh; }
  // ---- cara: ojos (parpadeo, mirada, preocupación, el LUNES reflejado) y boca
  const blinks = [1.1, 4.7, 6.55, 8.9, 10.95, 13.4, 16.2, 18.9, 26.9, 29.7, 32.5, 35.75, 37.4], bl = Math.max(...blinks.map(x => bump(t, x, x + 0.07, 0.05, 0.09))), sighC = bump(t, TL.send + 0.5, TL.send + 1.2, 0.2, 0.3);
  const open = (1 - 0.95 * Math.max(bl, sighC)) * (1 - 0.18 * nbLook - 0.1 * down + 0.12 * alarm), gx = 0.1 * Math.sin(t * 0.9) - 0.42 * kCam + 0.3 * bump(t, TL.eyes + 0.25, TL.eyes + 0.75, 0.08, 0.1), gy = 0.25 * nbLook + 0.2 * down - 0.1 * alarm, refl = bump(t, TL.eyes - 0.5, TL.brain + 0.2, 0.4, 0.3);
  drawEye(U.eyeL, { open, gx, gy, worry, refl }); drawEye(U.eyeR, { open, gx, gy, worry, refl, mirror: true }); drawMouth(U.mouthT, lerp(-0.7, 0.55, calm) - 0.25 * alarm);
  // ---- el nudo del pecho, la cabeza translúcida con el cerebro, la alarma y el pulso
  { const k = S.knot; k.visible = squeeze > 0.01; const s = lerp(1.9, 1.0, sm5(seg(t, TL.chest - 0.15, TL.chest + 0.45))) * (1 + 0.025 * Math.sin(t * 14)); k.scale.set(s, s * 0.72, 1); k.material.opacity = squeeze * 0.95; }
  boyGhost(b, ghost); brainAt(S.brain, ghost, alarm, t);
  { const a = S.brain.userData.amy.getWorldPosition(_v()), n = J.neck.getWorldPosition(_v()), hC = J.chest.localToWorld(_v().set(0.05, 0.2, 0.06)); pulseAt(S.pulse, [a, a.clone().lerp(n, 0.6).add(_v().set(0, 0, 0)), n, n.clone().lerp(hC, 0.55), hC], alarm * win(t, TL.al2 - 0.15, 0.3), alarm, t); S.pulse.visible = alarm > 0.01; }
  // ---- los pensamientos del lunes: giran alrededor de la cabeza; con la alarma, rojos y deprisa; luego caen al cuaderno y se vuelven renglones
  { const hw = headW(b), n = S.icons.length; S.icons.forEach((ic, i) => { const a0 = pop(t, TL.viv - 0.05 + i * 0.27, 0.35) * (1 - win(t, TL.only - 0.15 + i * 0.08, 0.3)); let sc = a0, vis = a0 > 0.01;
      if (vis) { const ang = i / n * Math.PI * 2 + t * (1.5 + 2.2 * alarm) + 0.6 * Math.sin(t * 0.7); ic.position.set(hw.x + Math.cos(ang) * 0.225, hw.y + 0.03 + 0.035 * Math.sin(t * 2.1 + i * 2), hw.z + Math.sin(ang) * 0.225); if (i === 0 && alarm > 0.3) ic.position.x += 0.006 * Math.sin(t * 70); }
      else if (nbOn && t < TL.est) { const tw = TL.write + 0.5 + i * 0.72, a1 = pop(t, TL.help + 0.35 + i * 0.12, 0.3), fall = sm5(seg(t, tw - 0.1, tw + 0.3)); sc = a1 * (1 - fall); vis = sc > 0.01; const hov = notePt(nb, 560, NOTE_Y[i] - 16, 0.035 + 0.006 * Math.sin(t * 3 + i)), land = notePt(nb, 320, NOTE_Y[i] - 16, 0.004); sc *= 0.4; ic.position.copy(hov).lerp(land, fall); }
      ic.visible = vis; if (!vis) return; ic.scale.setScalar(sc * (0.9 + 0.12 * alarm)); ic.quaternion.copy(cam.quaternion); ic.traverse(o => { if (o.userData.c0) o.material.color.copy(o.userData.c0).lerp(_c.setRGB(1.6, 0.3, 0.25), 0.55 * alarm * (0.6 + 0.4 * Math.sin(t * 9))); }); ic.userData.halo.material.color.setHex(0xffd9a0).lerp(_c.setHex(0xff3030), alarm); }); }
  // ---- la fachada: se encienden las habitaciones de quienes están igual que él
  if (!inside) { const LT = litTimes(); let n = 0; S.fac.userData.rooms.forEach(r => { roomLit(r, r.has ? win(t, LT[n++], 0.3) : 0); }); }
}
// velo rojo muy suave con la alarma
function fillAt(t) { const a = win(t, TL.alarm - 0.12, 0.35) * (1 - win(t, TL.only - 0.1, 0.5)); return { k: 0.07 * a * (0.5 + 0.5 * Math.sin(t * 9)), c: [1, 0.12, 0.1] }; }
