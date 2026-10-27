// ---------------------------------------------------------------- estado de la escena en cada instante (todo es función de t)
const wpos = (o, v = new THREE.Vector3()) => o.getWorldPosition(v);
const popS = (t, t0, d = 0.35) => Math.max(1e-4, pop(t, t0, d));
function loopT(t) { return t > END - 1.25 ? t - END : t; }      // al final, el principio otra vez (bucle)
const wink = (t, t0, d) => { const u = (t - t0) / d; return u > 0 && u < 1 ? Math.pow(Math.sin(Math.PI * u), 0.7) : 0; };
function blinkAt(t) {   // 0 abierto → 1 cerrado: guiño en «engañando»
  return wink(t, K.enganando + 0.12, 0.34);
}
const _ec = new THREE.Color(), _m = new THREE.Matrix4(), _qq = new THREE.Quaternion(), _ee = new THREE.Euler(), _pp = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
function eyeAt(t) {
  const E = S.eye, tt = loopT(t), inLoop = t > END - 1.25;
  const vis = tt < K.borra + 0.9 || t > K.truco14 - 1.4; E.G.visible = vis; if (!vis) return;
  const burst = inLoop ? 0 : sm5(clamp((tt - K.borrado + 0.02) / 0.5)) * (1 - sm5(clamp((tt - K.notado + 0.05) / 0.45)));
  const gl = inLoop ? 0 : env(tt, -0.1, K.mas1 + 0.1, 0.05, 0.25);      // filas que tiemblan al principio (imagen «sospechosa»)
  const b = blinkAt(tt), bp = blinkAt(tt - 0.06);
  const mv = 0;
  const dimS = env(t, K.sonido16 - 0.35, K.ahora + 0.2, 0.4, 0.5);        // detrás del espectro, más oscuro
  const split = t > K.luz - 0.15 && t < K.sonido16 ? sm5(clamp((t - K.luz + 0.15) / 0.6)) * (1 - sm5(clamp((t - K.menos - 0.35) / 0.5))) : 0;
  const N = EYE_NX * EYE_NY, open = E.L.open, skin = E.L.skin; let na = 0;
  E.vox.visible = split < 0.001; E.luma.visible = split >= 0.001; E.chroma.visible = split > 0.12;
  const target = split >= 0.001 ? E.luma : E.vox;
  for (let i = 0; i < N; i++) {
    const ix = i % EYE_NX, iy = Math.floor(i / EYE_NX), yc = iy + 0.5, top = E.lidTop[ix], bot = E.lidBot[ix];
    const ye = top + b * (bot - top), yp = top + bp * (bot - top);
    let r = open[i * 3], g = open[i * 3 + 1], bl = open[i * 3 + 2];
    if (b > 0.001 && yc > top && yc < ye) { r = skin[i * 3]; g = skin[i * 3 + 1]; bl = skin[i * 3 + 2]; }
    if (b > 0.02 && Math.abs(yc - ye) < 0.9) { r *= 0.12; g *= 0.1; bl *= 0.1; }          // pestañas en el borde que baja
    const moving = (b > 0.001 || bp > 0.001) && yc > top - 0.5 && ((yc > Math.min(ye, yp) - 0.6 && yc < Math.max(ye, yp) + 0.6) && Math.abs(ye - yp) > 0.05);
    let k = 1;
    if (mv > 0) { k = moving ? 1 + 0.9 * mv : 1 - 0.9 * mv; if (moving && na < 160 && ix % 3 === 1) {
        const P = E.base[i]; _ee.set(0, 0, ye > yp ? Math.PI : 0); _qq.setFromEuler(_ee); _m.compose(_pp.set(P.x, P.y, 0.03), _qq, _one.setScalar(mv)); E.arrows.setMatrixAt(na++, _m); _one.set(1, 1, 1); } }
    if (dimS > 0) k *= 1 - 0.62 * dimS;
    if (split >= 0.001) { const l = E.L.luma, s = clamp(split * 3); r = lerp(r, l[i * 3], s); g = lerp(g, l[i * 3 + 1], s); bl = lerp(bl, l[i * 3 + 2], s); }
    target.instanceColor.setXYZ(i, r * k, g * k, bl * k);
    const P = E.base[i], sd = E.seed[i];
    let x = P.x, y = P.y, z = 0;
    if (gl > 0) { const hr = hash(iy * 7.7 + Math.floor(tt * 14) * 1.3); if (hr > 0.82) x += (hash(iy * 3.1 + Math.floor(tt * 14)) - 0.5) * 0.09 * gl; }
    if (burst > 0 && !sd.keep) { const u = clamp(burst * 1.15 - sd.d); x += sd.dir.x * u * 1.2; y += sd.dir.y * u * 1.2; z += sd.dir.z * u * 1.4;
      _ee.set(sd.spin.x * u, sd.spin.y * u, sd.spin.z * u); _qq.setFromEuler(_ee); } else _qq.identity();
    _m.compose(_pp.set(x, y, z), _qq, _one); target.setMatrixAt(i, _m);
  }
  E.arrows.count = na; E.arrows.instanceMatrix.needsUpdate = true;
  target.instanceMatrix.needsUpdate = true; target.instanceColor.needsUpdate = true;
  E.luma.position.set(-0.12 * split, 0, 0.36 * split); E.chroma.position.set(0.12 * split, 0, -0.36 * split);
  E.fr.visible = burst < 0.5 && split < 0.05;
}
// ---------------------------------------------------------------- el duelo y el veredicto
function duelAt(t) {
  const Z = S.duel, U = Z.userData;
  const vis = (t > K.borra - 0.8 && t < K.asi + 0.7) || (t > K.entonces - 1.3 && t < K.truco14 + 0.6); Z.visible = vis; if (!vis) return;
  // emblemas vivos
  U.tw.userData.waves.forEach((w, k) => { const u = (t * 0.7 + k / 3) % 1; w.scale.setScalar(0.25 + u * 2.4); w.material.opacity = (1 - u) * 0.8; });
  U.tw.userData.beacon.material.emissiveIntensity = Math.sin(t * 5) > 0.55 ? 4 : 0.6;
  const vo = voice(t); U.sp.userData.cone.position.z = 0.143 + 0.01 * vo * Math.sin(t * 38); U.sp.userData.cap.position.z = 0.1 + 0.01 * vo * Math.sin(t * 38);
  U.sp.userData.rings.forEach((r, k) => { const u = (t * 1.1 + k / 3) % 1; r.scale.setScalar(1 + u * 1.6); r.position.z = 0.16 + u * 0.35; r.material.opacity = (1 - u) * 0.75 * (0.4 + vo); });
  U.ln.rotation.y = Math.sin(t * 0.8) * 0.35 - 0.2; U.ln.position.y = 1.02 + 0.03 * Math.sin(t * 2.1);
  // quién está hablando: el aro de su podio brilla más
  const hiS = env(t, K.borra, K.teleco2, 0.2, 0.3) + env(t, K.sonido6 - 0.1, K.asi, 0.2, 0.3), hiT = env(t, K.teleco2 - 0.05, K.municion + 0.3, 0.2, 0.3);
  U.pS.userData.rim.material.color.copy(CTe).multiplyScalar(0.6 + 1.6 * clamp(hiS)); U.pT.userData.rim.material.color.copy(CAm).multiplyScalar(0.6 + 1.6 * hiT);
  // barras de notas de corte (0,16 m por punto)
  // suben al decir cada nombre; se esconden mientras hablan FP y la tele, y vuelven para el veredicto
  const bv = (t > K.municion - 0.3 && t < K.responde + 0.6) || (t > K.entonces - 0.4 && t < K.dos12 + 0.2); U.bT.visible = U.bS.visible = bv;
  if (bv) { const fo = t < K.entonces - 0.4 ? 1 - sm5(clamp((t - K.sonido6 + 0.1) / 0.5)) : sm5(clamp((t - K.entonces + 0.4) / 0.6)) * (1 - sm5(clamp((t - K.dos12 + 0.2) / 0.4)));
    const gT = t < K.entonces - 0.4 ? sm5(clamp((t - K.politecnica) / Math.max(0.5, K.cuatro4 - K.politecnica + 0.2))) : 1, gS = t < K.entonces - 0.4 ? sm5(clamp((t - K.sonido4 + 0.1) / Math.max(0.5, K.ocho - K.sonido4 + 0.2))) : 1;
    setBarH(U.bT, 9.408 * 0.16 * gT * fo); setBarH(U.bS, 8.066 * 0.16 * gS * fo);
    const crowdShot = t > K.nota - 0.1;   // en el plano del público las cifras quedarían bajo la cabecera
    U.bT.userData.top.visible = t > K.nueve && fo > 0.3 && !crowdShot; U.bS.userData.top.visible = t > K.ocho - 0.05 && fo > 0.3 && !crowdShot; }
  // la tele: una serie… y sin Sonido e Imagen, sin señal
  const tvk = env(t, K.responde - 0.4, K.asi + 0.3, 0.35, 0.3); U.T.visible = tvk > 0.01; U.T.scale.setScalar(Math.max(1e-3, tvk));
  const off = t > K.veriais; U.T.userData.scr.material.map = off ? U.T.userData.nT : U.T.userData.sT; U.T.userData.off.visible = off;
  if (off) U.T.userData.nT.offset.set(hash(Math.floor(t * 60) * 1.7), hash(Math.floor(t * 60) * 2.9));
  // el público que pide cada carrera (nota de corte = cuánta gente la quiere)
  for (const [m, t0] of [[U.crT, K.gente - 0.1], [U.crS, K.gente + 0.15]]) { const cv = t > t0 && t < K.dos12 + 0.4; m.visible = cv; if (!cv) continue;
    const fo = 1 - sm5(clamp((t - K.dos12) / 0.4)); m.userData.P.forEach((P, i) => { const s = sm5(clamp((t - t0 - hash(i * 1.1) * 0.6) / 0.25)) * fo; _m.compose(_pp.set(P.x, P.y + 0.03 * Math.abs(Math.sin(t * 6 + i)), P.z), _qq.identity(), _one.setScalar(Math.max(1e-3, s))); m.setMatrixAt(i, _m); });
    _one.set(1, 1, 1); m.instanceMatrix.needsUpdate = true; }
  // títulos: llegan de cada podio, se funden en uno y entran por la puerta del máster
  const dv = t > K.dos12 - 0.1 && t < K.facil13 + 0.2; U.dT.visible = U.dS.visible = dv;
  if (dv) { const m1 = sm5(clamp((t - K.dos12) / Math.max(0.5, K.profesion - K.dos12))), m2 = sm5(clamp((t - K.master + 0.1) / 0.8));
    const C = v3(0, 1.15, 0.35), Dr = v3(0, 0.75, -1.9);
    U.dT.position.copy(v3(-0.62, 0.95, 0.25).lerp(C, m1)).lerp(Dr, m2); U.dS.position.copy(v3(0.62, 0.95, 0.25).lerp(C, m1)).lerp(Dr, m2);
    U.dT.rotation.set(0, (1 - m1) * 0.6 + m2 * 0.0, (1 - m1) * 0.2); U.dS.rotation.set(0, -(1 - m1) * 0.6, -(1 - m1) * 0.2);
    U.dS.visible = m1 < 0.98; const s = popS(t, K.dos12 - 0.1, 0.4) * (1 - 0.6 * m2); U.dT.scale.setScalar(s); U.dS.scale.setScalar(s); U.dT.position.z += 0.002; }
  U.door.visible = t > K.master - 0.45 && t < K.teleco13b - 0.1; U.door.scale.setScalar(popS(t, K.master - 0.45, 0.45)); U.dl.material.opacity = 0.85 * sm5(clamp((t - K.master + 0.1) / 0.4));
  // TELECO + el apellido
  const sv = t > K.teleco13b - 0.15; U.sign.visible = sv && t < K.truco14 + 0.6;
  if (sv) { U.sTel.scale.setScalar(popS(t, K.teleco13b - 0.1, 0.4)); const pk = sm5(clamp((t - K.apellido + 0.25) / 0.35)); U.plate.position.x = U.pTxt.position.x = (1 - pk) * 2.2; U.plate.visible = U.pTxt.visible = pk > 0.001; }
}
// ---------------------------------------------------------------- por dentro
function insideAt(t) {
  const Z = S.inside, U = Z.userData; const vis = t > K.asi - 1.0 && t < K.entonces + 0.5; Z.visible = vis; if (!vis) return;
  U.wave.userData.U.uA.value = eo(clamp((t - K.serie) / Math.max(0.9, K.senales - K.serie + 0.2)));
  const sg = sm5(clamp((t - K.convierten + 0.1) / 0.6));
  U.sv.forEach((s, i) => { const g = sm5(clamp(sg * 1.6 - i / U.sv.length * 0.6)), h = Math.abs(s.v) * g + 1e-3; _m.compose(_pp.set(s.x, 1.45 + Math.sign(s.v) * h / 2, 0), _qq.identity(), _one.set(1, h, 1)); U.samp.setMatrixAt(i, _m); });
  _one.set(1, 1, 1); U.samp.instanceMatrix.needsUpdate = true; U.samp.visible = sg > 0.01;
  U.digits.forEach((d, k) => { const u = clamp((t - K.numeros + 0.1 - k * 0.07) / 0.9); d.visible = u > 0; d.position.set(-0.75 + (k % 3) * 0.75, 1.75 + Math.floor(k / 3) * 0.16 + u * 0.35, 0.05 + k * 0.01); d.material.opacity = sm5(u) * (1 - 0.3 * Math.max(0, u - 0.8)); });
  // sala: el altavoz suena con la voz y el micro capta
  const vo = voice(t), on = env(t, K.altavoces - 0.2, K.video9 + 0.3, 0.2, 0.3) + 0.25;
  U.spk.userData.cone.position.z = 0.143 + 0.014 * vo * on * Math.sin(t * 40);
  U.spk.userData.rings.forEach((r, k) => { const u = (t * 1.2 + k / 3) % 1; r.scale.setScalar(1 + u * 2.4); r.position.z = 0.16 + u * 0.7; r.material.opacity = (1 - u) * 0.8 * clamp(on); });
  // emisión: anillos que salen de la antena y pantallas que se encienden al llegarles
  const t0 = K.llega - 0.15;
  U.bR.forEach((r, k) => { const rad = Math.max(0.01, (t - t0 - k * 0.32) * 4.2); r.visible = t > t0 + k * 0.32 && rad < 9; r.scale.setScalar(rad); r.material.opacity = 0.9 * clamp(1 - rad / 9); });
  const front = (t - t0) * 4.2; U.scr.visible = t > K.video9 - 0.6;
  U.sP.forEach((s, i) => { const d = front - s.r, lit = d > 0 ? 1 : 0, fl = d > 0 ? Math.exp(-d * 1.5) : 0, k = hash(i * 5.3);
    const base = lit ? 0.55 + 0.25 * Math.sin(t * 3 + i) : 0.03; _ec.setRGB(k < 0.5 ? 0.25 : 0.9, k < 0.5 ? 0.95 : 0.9, k < 0.5 ? 0.9 : 0.95).multiplyScalar(base + 1.8 * fl);
    U.scr.setColorAt(i, _ec); });
  U.scr.instanceColor.needsUpdate = true;
  U.ant.userData.waves.forEach((w, k) => { const u = (t * 0.9 + k / 3) % 1; w.scale.setScalar(0.25 + u * 2.6); w.material.opacity = (1 - u) * 0.8; });
  U.ant.userData.beacon.material.emissiveIntensity = Math.sin(t * 5) > 0.55 ? 4 : 0.6;
}
// ---------------------------------------------------------------- el truco del sonido
function spectrumAt(t) {
  const Z = S.spec, U = Z.userData; const vis = t > K.sonido16 - 0.8 && t < END - 0.9; Z.visible = vis; if (!vis) return;
  const a = sm5(clamp((t - K.sonido16 + 0.6) / 0.6)) * (1 - sm5(clamp((t - K.ahora - 0.2) / 0.5)));
  const lg = 0.35 + 0.65 * sm5(clamp((t - K.fuerte + 0.1) / 0.4)), gone = t > K.tira;
  for (let i = 0; i < U.N; i++) { let h = U.H0[i] * (1 + 0.12 * Math.sin(t * 7 + i * 1.7)); if (i === U.LOUD) h = U.H0[i] * lg; if (i === U.WEAK && gone) h = 0; h = Math.max(1e-3, h * a);
    _m.compose(_pp.set((i - (U.N - 1) / 2) * 0.034, h / 2, 0), _qq.identity(), _one.set(1, h, 1)); U.bars.setMatrixAt(i, _m);
    _ec.copy(i === U.LOUD ? CAm : i === U.WEAK ? CTe : _ec.setRGB(0.75, 0.78, 0.82)); if (i === U.LOUD || i === U.WEAK) _ec.multiplyScalar(0.55); U.bars.setColorAt(i, _ec); }
  _one.set(1, 1, 1); U.bars.instanceMatrix.needsUpdate = true; U.bars.instanceColor.needsUpdate = true;
  const tk = sm5(clamp((t - K.tapa + 0.05) / 0.45)); U.tent.visible = tk > 0.01; U.tent.position.set((U.LOUD - (U.N - 1) / 2) * 0.034, 0, 0.03); U.tent.scale.set(0.8, Math.max(1e-3, U.H0[U.LOUD] * lg * a * tk * 1.05), 1);
  const u = t - K.tira; U.shards.visible = u > 0 && u < 1.4;
  if (U.shards.visible) { const x0 = (U.WEAK - (U.N - 1) / 2) * 0.034; for (let i = 0; i < 40; i++) { const an = hash(i * 3.3) * 6.283, sp = 0.5 + hash(i * 5.1) * 1.4;
      _ee.set(u * 9 + i, u * 7, 0); _qq.setFromEuler(_ee); _m.compose(_pp.set(x0 + Math.cos(an) * sp * u * 0.5, 0.1 + hash(i * 2.2) * 0.12 + Math.abs(Math.sin(an)) * sp * u * 0.6 - 1.4 * u * u, Math.sin(an) * sp * u * 0.4), _qq, _one.setScalar(Math.max(1e-3, 1 - u / 1.4))); U.shards.setMatrixAt(i, _m); }
    _one.set(1, 1, 1); U.shards.instanceMatrix.needsUpdate = true; }
}
function stageAt(t) { eyeAt(t); duelAt(t); insideAt(t); spectrumAt(t); }
