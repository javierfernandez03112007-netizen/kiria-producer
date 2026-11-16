// ---------------------------------------------------------------- la escena entera: el mapa (20), la franja del Atlántico (21), la playa de Brasil (22), la península (23),
// la fibra por dentro (24, decorado aparte), Tonga (25) y los incidentes del fondo (26). Si una pieza aún no existe, se pone un sustituto sencillo.
// stageAt(t, st) lo anima todo con la línea de tiempo de la voz (K) y elige la luz según dónde está la cámara.
const FIB0 = new THREE.Vector3(0, -1500, 0);          // la fibra por dentro: lejos, bajo el mapa
const TONm = mapP(...GEO.TONGA), FIJm = mapP(...GEO.FIJI);
const TX = TONm.clone().sub(FIJm).setY(0).normalize(), TZ = new THREE.Vector3().crossVectors(TX, SY), TON_SEA = 30;
const TON_M = new THREE.Matrix4().makeBasis(TX, SY, TZ).setPosition(TONm.clone().setY(TON_SEA));
const Bw = (x, y, z) => slabP(x, y + SEA, z), Iw = (x, y, z) => slabP(SL + x, y + SEA, z), Sw = (x, y, z) => slabP(x, y, z);
const Tw = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(TON_M), Fw = (x, y, z) => new THREE.Vector3(x, y, z).add(FIB0);
function fnOf(n) { try { return eval('typeof ' + n + " === 'function' ? " + n + ' : null'); } catch (e) { return null; } }
function placeholder(txt, w = 4, col = '#ffcf6b') { const g = new THREE.Group(); const l = label(txt, { size: 70, w, pill: true, color: col }); l.position.y = w * 0.3; g.add(l); g.userData.anchors = {}; g.userData.ph = l; return g; }
async function buildScene() {
  S.world = new THREE.Group(); scene.add(S.world);
  // el mapa (o un suelo azul oscuro)
  const fMap = fnOf('buildMap');
  if (fMap) { S.map = await fMap(); S.world.add(S.map); }
  else { const pl = new THREE.Mesh(new THREE.PlaneGeometry(3600, 1800), new THREE.MeshStandardMaterial({ color: 0x0b1a2c, roughness: 0.85 })); pl.rotation.x = -Math.PI / 2; pl.receiveShadow = true; S.world.add(pl); }
  // la franja del Atlántico
  S.slab = await buildSlab(); S.world.add(S.slab);
  // la playa de Brasil y la península (en el marco de la franja)
  const fB = fnOf('buildBeach'), fI = fnOf('buildIberia'), fT = fnOf('buildTonga'), fF = fnOf('buildFiber'), fN = fnOf('buildIncidents');
  S.beach = fB ? await fB() : placeholder('PLAYA DE BRASIL', 6); atBeach(S.beach); S.world.add(S.beach);
  S.iberia = fI ? await fI() : placeholder('PUEBLO · COCINA · ANTENA', 8, '#9fd0ff'); atIberia(S.iberia); S.world.add(S.iberia);
  if (!fI) S.iberia.userData.ph.position.set(30, 6, 0);
  if (!fB) S.beach.userData.ph.position.set(-10, 4, 0);
  S.inc = fN ? await fN() : null; if (S.inc) { atBeach(S.inc); S.world.add(S.inc); }
  // Tonga, en su sitio del Pacífico
  S.tonga = fT ? await fT() : placeholder('TONGA', 10, '#ff8a6b'); S.tonga.matrixAutoUpdate = false; S.tonga.matrix.copy(TON_M); S.world.add(S.tonga);
  // la fibra por dentro (decorado aparte)
  S.fiber = fF ? await fF() : placeholder('FIBRA (DENTRO)', 30, '#9ff3ff'); S.fiber.position.copy(FIB0); scene.add(S.fiber);
  // la burbuja del mensaje (cuando sale del mar en Brasil y sube por la playa)
  S.msg = msgBubble(); S.msg.visible = false; S.world.add(S.msg);
  envAll(scene);
}
// ---------- la luz según dónde está la cámara (se mezcla al pasar de un sitio a otro)
const _wTmp = new THREE.Vector3();
function moodWeights(p, t) {
  if (inFiberWin(t)) return { fibra: 1 };
  const sl = slabLocal(p);
  if (sl.x > -XB && sl.x < SL + XE && Math.abs(sl.z) < SW / 2 && sl.y < SEA && sl.x > 0 && sl.x < SL) {      // bajo el mar de la franja
    const dep = SEA - sl.y; return { agua: 1 - _sm(9, 18, dep), abismo: _sm(9, 18, dep) };
  }
  const dB = p.distanceTo(BEACH0()), dI = p.distanceTo(Iw(25, 0, 0)), dT = p.distanceTo(Tw(-30, 0, 0));
  const w = { brasil: 1 - _sm(45, 170, dB), iberia: 1 - _sm(60, 200, dI), tonga: 1 - _sm(80, 320, dT) };
  w.museo = Math.max(0, 1 - w.brasil - w.iberia - w.tonga); return w;
}
function stageAt(t, st) {
  NOW = t; const fib = inFiberWin(t);
  S.world.visible = !fib; S.fiber.visible = fib;
  moodMix(moodWeights(st.p, t));
  const under = !fib && slabUnderLoose(st.p);
  // la franja: pulsos del mensaje (frase 2: llega a Brasil; frase 8: cruza de Portugal a Brasil; frase 12: sale en Brasil)
  let pulse = -1, pk = 1;
  if (t > 4.3 && t < 6.2) pulse = lerp(0.13, -0.02, clamp((t - 4.3) / 1.6));
  else if (t > K['hunde_8'] - 0.3 && t < K['segundo_8'] + 0.6) pulse = lerp(1.0, -0.01, eio(clamp((t - K['hunde_8']) / (K['segundo_8'] + 0.1 - K['hunde_8']))));
  else if (t > 50.2 && t < 51.6) pulse = lerp(0.07, -0.01, clamp((t - 50.2) / 1.3));
  slabAt(t, { under, pulse, pulseK: pk, pulseS: 1 });
  // el mapa
  const mAt = fnOf('mapAt');
  if (S.map && mAt) {
    mAt(t, { draw: win(t, K['99_3'] - 0.1, 3.4), glow: 1 + 0.6 * env(t, K['cables_3'] - 0.1, K['cables_3'] + 0.7, 0.15, 0.4) + 0.4 * env(t, K['600_9'] - 0.2, K['ano_9'], 0.2, 0.5),
      ella: t > K['hunde_8'] ? clamp((t - K['hunde_8']) / (K['segundo_8'] + 0.1 - K['hunde_8'])) : 0, breaks: t > K['rompen_9'] - 0.1 && t < 43 ? clamp((t - K['rompen_9'] + 0.1) / 2.2) : 0,
      mauritania: t < 20 ? 1 - win(t, K['entero_4'] - 0.35, 0.6) : 1, tonga: 1 - win(t, K['pais_11'] - 0.1, 1.8), sat: env(t, K['99_3'] - 0.3, K['si_4'], 0.4, 0.5), ace: t > K['rompe_4'] - 0.05 && t < 20 ? 1 : 0 });
  }
  // la playa: el móvil (encendido con la notificación al principio y al final = bucle)
  const fBeach = fnOf('beachAt');
  if (fBeach) fBeach(t, { screen: t < 6 ? 1 : win(t, 56.2, 0.12), notif: t < 6 ? 1 : win(t, 56.3, 0.45), buzz: env(t, 0.12, 0.62, 0.05, 0.1) + env(t, 0.95, 1.4, 0.05, 0.1) + env(t, 56.3, 57.0, 0.05, 0.25) });
  // la burbuja del mensaje sale del mar y sube por la playa hasta el móvil (frase 12)
  { const k = clamp((t - 51.2) / (56.25 - 51.2)), vis = t > 51.2 && t < 56.3; S.msg.visible = vis;
    if (vis) { const fP = fnOf('beaMsgPath'); if (fP) { const r = fP(eio(k)); S.msg.position.copy(S.beach.localToWorld(r.pos.clone())); S.msg.scale.setScalar(r.scale); }
      else { const a = Bw(1, 0.4, 6), b = Bw(-7, 1.0, 9); S.msg.position.lerpVectors(a, b, eio(k)); S.msg.position.y += Math.sin(k * Math.PI) * 1.5; S.msg.scale.setScalar(lerp(1.4, 0.15, k)); }
      S.msg.quaternion.copy(cam.quaternion); } }
  // la península: escribe, envía, ondas, pulso por la torre y el tubo, y de la estación al mar
  const fIb = fnOf('iberiaAt');
  if (fIb) fIb(t, { type: win(t, 13.6, 0.85), send: win(t, K['enviarlo_5'] + 0.15, 0.45), waves: clamp((t - K['su_5'] - 0.1) / (K['antena_5'] + 0.5 - K['su_5'])), pulse: clamp((t - K['entra_6']) / (K['luz_6'] - K['entra_6'] + 0.1)),
    pulse2: clamp((t - K['portugal_8'] + 0.1) / (K['hunde_8'] + 0.35 - K['portugal_8'])) });
  // la fibra
  const fFb = fnOf('fiberAt'); if (fFb && fib) fFb(t, { speed: 1, hair: win(t, K['fino_7'] - 0.2, 0.5), pulses: 1 });
  // los incidentes del fondo (frase 10)
  const fInc = fnOf('incidentsAt');
  if (fInc && S.inc) fInc(t, { shark: clamp((t - K['y_10'] + 0.1) / (K['tres_10'] - K['y_10'] + 0.2)), anchor: clamp((t - K['tres_10']) / (K['ancla_10'] + 0.25 - K['tres_10'])), snap: clamp((t - K['ancla_10'] - 0.2) / 0.5),
    net: clamp((t - K['o_10'] + 0.2) / (K['pesca_10'] + 0.6 - K['o_10'])) });
  // Tonga (frase 11): la erupción con «volcán»; sin internet desde «el país entero»
  const fTon = fnOf('tongaAt'); if (fTon) fTon(t, { te: t - (K['volcan_11'] + 0.05), net: 1 - win(t, K['pais_11'] - 0.1, 1.8) });
  // luces que siguen a lo que se mira
  const c = st.l; lightsAt(c, st.p.distanceTo(c));
  for (const u of SLB.U) u.value = t;
}
// la cámara bajo el agua de la franja (con un margen para la superficie)
function slabUnderLoose(pw) { const p = slabLocal(pw); return p.x > 0 && p.x < SL && Math.abs(p.z) < SW / 2 + 0.01 && p.y < SEA - 0.02 && p.y > 0; }
