// ---------------------------------------------------------------- tiempos y animación (todo depende solo del instante t)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const fract = x => x - Math.floor(x);
const _o = new THREE.Object3D(), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3();
let TT = {};
function buildTimes() {
  TT = {
    crack: K.no1,                                              // 1: la etiqueta «GRATIS» se raja
    reg: K.gana2,                                              // 2: la caja registradora
    qm: K.truco3, qmOff: K.haz4,                               // 3: «el truco que no ves»
    big0: K.haz4, total: K.n3_4, iva: K.n27_5,                 // 4-5: el vaso gigante, la cuenta
    beer: K.n50_6 + 0.35, quedan: K.quedan7,                   // 6-7: la cerveza (desde la bodega) y lo que queda
    icons: [K.tapa7, K.local7, K.sueldos7, K.ganar7],
    bigOut: K.pero8,                                           // 8: el vaso gigante se va; la segunda caña
    rounds: [K.segunda8, K.ronda9, K.siguiente9, K.mejor9],    // 8-9: las rondas
    salt: K.saladas10, sed: K.sed10, drink: K.paga10, coins: K.canas10,   // 10: la sal, la sed, se pagan cañas
    out: K.pero11,                                             // 11: a la calle
    fly: K.tapa12, ringOn: K.regalo12 + 0.1, enter: K.regalo12,           // 12: la tapa se convierte en el letrero; entra la gente
    adOff: K.ellos13 - 0.25,                                   // 13: el anuncio de pago se apaga con «ellos te la sirven…»
    shops: K.negocio14,                                        // 14: ¿cuál es su tapa?
    poll: K.granada15, serve: K.granada15 + 0.1,               // 15: la votación; el camarero pone otra tapa (bucle)
  };
}
function flick(t, t0, d = 0.32) { const u = (t - t0) / d; if (u <= 0) return 0; if (u >= 1) return 1; return (u > 0.1 && u < 0.22) || (u > 0.38 && u < 0.5) || u > 0.72 ? 1 : 0.12; }

// ---------------------------------------------------------------- la caña y la tapa protagonistas, la etiqueta, la tapa que vuela al letrero
const SIGNP = v3(0, BH + 0.5, BZ + 0.42);
function heroAt(t) {
  // etiqueta: entera hasta «no existe»; se raja y los trozos caen; vuelve entera con la tapa nueva del final
  const P = S.tag.userData.pieces, newT = t >= TT.serve;
  P.forEach((p, i) => { const u = clamp((t - TT.crack - i * 0.03) / 0.55), sd = i % 2 ? 1 : -1, up = i < 2 ? -1 : 1;
    p.position.copy(p.userData.home); p.rotation.set(0, 0, 0);
    if (!newT && u > 0) { p.position.x += sd * 0.05 * u; p.position.y += 0.03 * Math.sin(u * Math.PI) - 0.07 * u * u + up * 0.004; p.position.z += 0.04 * u; p.rotation.set(u * 2.2 * sd, u * 1.4, u * 3 * sd); }
    p.visible = newT || t < TT.fly; });
  S.tag.userData.pick.visible = newT || t < TT.fly;
  // la tapa del principio: en la barra; con «la tapa» (12) vuela, crece y se queda como letrero
  const T0 = S.htapa, home = v3(HERO.x + 0.14, TOP, HERO.z + 0.04);
  if (t < TT.fly) { T0.position.copy(home); T0.rotation.set(0, 0, 0); T0.scale.setScalar(1); }
  else { const u = eio(clamp((t - TT.fly) / 1.25)); _p1.copy(home).lerp(SIGNP, u); _p1.y += Math.sin(Math.PI * u) * 1.6; T0.position.copy(_p1);
    T0.rotation.set(lerp(0, Math.PI / 2, u), 0, Math.sin(u * Math.PI) * 0.6); T0.scale.setScalar(lerp(1, 7.8, u)); }
  // la tapa nueva: el camarero la desliza por la barra hasta el sitio de la primera (antes que la etiqueta, que va con ella)
  S.ntapa.visible = t >= TT.serve - 0.6;
  { const u = eio(clamp((t - TT.serve + 0.6) / 0.7)); S.ntapa.position.set(lerp(home.x + 0.9, home.x, u), TOP, lerp(home.z - 0.25, home.z, u)); }
  // la etiqueta acompaña a su tapa (la del principio o la nueva)
  const tp = newT ? S.ntapa : T0; S.tag.visible = newT || t < TT.fly;
  if (S.tag.visible) { S.tag.position.set(tp.position.x + 0.01, TOP + 0.022, tp.position.z - 0.01); }
  // el letrero de siempre se apaga cuando llega la tapa
  S.barSign.visible = t < TT.fly + 0.95 || t > TT.serve; if (S.barSign.visible) S.barSign.material.opacity = 1;
  // el aro de luz del letrero
  const rk = win(t, TT.ringOn + 0.9, 0.35); S.ring.visible = rk > 0.01; S.ring.material.opacity = rk; S.ring.position.copy(SIGNP).add(v3(0, 0, 0.02));
  S.signGlow.visible = rk > 0.01; S.signGlow.position.copy(SIGNP).add(v3(0, 0, 0.05)); S.signGlow.material.opacity = rk * (0.55 + 0.1 * Math.sin(t * 6)); S.signGlow.quaternion.copy(cam.quaternion);
  // el «?» encima de la tapa
  const qk = cwin(t, TT.qm, TT.qmOff, 0.3, 0.25); S.qm.visible = qk > 0.01;
  if (S.qm.visible) { S.qm.position.set(home.x, TOP + 0.2 + Math.sin(t * 3) * 0.008, home.z); S.qm.scale.setScalar(0.22 * backOut(clamp((t - TT.qm) / 0.35)) * (1 - win(t, TT.qmOff - 0.2, 0.2) * 0.999)); S.qm.rotation.y = t * 1.4; }
  // la caja registradora: el cajón sale y saltan monedas (con «gana dinero» y con «se paga en cañas»)
  const dr = S.reg.userData.drawer, open = Math.max(cwin(t, TT.reg, TT.reg + 0.9, 0.12, 0.3), cwin(t, TT.coins, TT.coins + 0.9, 0.12, 0.3)); dr.position.z = 0.02 + open * 0.22;
  S.coins.forEach((c, i) => { const t0 = (i < 5 ? TT.reg : TT.coins) + (i % 5) * 0.05, u = (t - t0) / 0.7; c.visible = u > 0 && u < 1;
    if (c.visible) { wpos(S.reg, _p2); c.position.set(_p2.x + (hash(i) - 0.5) * 0.2 * u, _p2.y + 0.15 + u * 0.5 - u * u * 0.55, _p2.z + 0.25 + u * 0.1); c.rotation.set(u * 9 + i, u * 4, 0); } });
}

// ---------------------------------------------------------------- el vaso gigante (la cuenta) y los iconos de lo que queda
function bigAt(t) {
  const G = S.big, k = backOut(clamp((t - TT.big0) / 0.55)) * (1 - eio(clamp((t - TT.bigOut) / 0.45)));
  G.visible = k > 0.002; if (!G.visible) return;
  G.scale.set(Math.max(0.0001, k), Math.max(0.0001, k), Math.max(0.0001, k)); G.rotation.y = t * 0.15;
  const fills = [eo(clamp((t - TT.iva) / 0.5)), eo(clamp((t - TT.beer) / 0.9)), eo(clamp((t - TT.quedan) / 0.8))];
  S.layers.forEach((L, i) => { L.visible = fills[i] > 0.003; L.scale.y = Math.max(0.0001, fills[i]); });
  const ly = S.layers[2].userData, cy = ly.y0 + ly.h * 0.5;
  S.icons.forEach((ic, i) => { const t0 = TT.icons[i], u = eo(clamp((t - t0) / 0.6)); ic.visible = u > 0.002;
    if (!ic.visible) return; const a = -0.9 + i * 0.6 - t * 0.15, R = lerp(0.1, 0.78, u), y = lerp(cy, 0.55 + i * 0.28, u);
    ic.position.set(Math.cos(a) * R, y + Math.sin(t * 2 + i) * 0.02, Math.sin(a) * R + 0.15); ic.rotation.y = -G.rotation.y + 0.3 + Math.sin(t + i) * 0.2; ic.scale.setScalar((i === 0 ? 2.2 : i === 2 ? 3.2 : 1) * backOut(clamp((t - t0) / 0.45))); });
  // el chorro de cerveza que sube por el tubo desde la bodega (solo mientras se ve la bodega)
}
function cellarAt(t) {
  const u = clamp((t - (K.cerveza6 + 0.2)) / 1.2); S.beerFlow.visible = u > 0.01 && t < TT.quedan + 0.5;
  if (S.beerFlow.visible) { const n = S.beerFlow.geometry.index ? S.beerFlow.geometry.index.count : S.beerFlow.geometry.attributes.position.count; S.beerFlow.geometry.setDrawRange(0, Math.floor(n * u)); }
}

// ---------------------------------------------------------------- las rondas, la sal y la sed
function roundsAt(t) {
  S.rounds.forEach((R, i) => { const t0 = TT.rounds[i], gone = clamp((t - (TT.shops - 0.4)) / 0.3);
    const k = clamp((t - t0) / 0.45); R.c.visible = R.tp.visible = k > 0 && gone < 1;
    if (!R.c.visible) return;
    const e = eio(k); R.c.position.set(ROUND_X[i + 1] + (1 - e) * 0.5, TOP, HERO.z); R.tp.position.set(ROUND_X[i + 1] + 0.12 + (1 - e) * 0.5, TOP, HERO.z + 0.06);
    R.tp.rotation.y = (1 - e) * 1.5; const s = Math.max(0.0001, 1 - gone); R.c.scale.setScalar(s); R.tp.scale.setScalar(s);
    // «la sed se paga en cañas»: se beben (baja la cerveza) y llegan llenas otra vez
    const d = clamp((t - TT.drink - i * 0.08) / 0.35), r = clamp((t - TT.coins - i * 0.06) / 0.3);
    canaLevel(R.c, t < TT.drink ? 1 : r > 0 ? lerp(0.12, 1, eio(r)) : lerp(1, 0.12, eio(d)));
  });
  canaLevel(S.hero, 1);
  // la sal: destellos sobre las tapas
  const sk = cwin(t, TT.salt, TT.drink + 0.6, 0.2, 0.4); S.salt.visible = sk > 0.01;
  if (S.salt.visible) { const a = S.salt.geometry.attributes.position.array;
    for (let i = 0; i < 160; i++) { const j = i % 5, x = j === 0 ? HERO.x + 0.14 : ROUND_X[j] + 0.12, tt = fract(t * 0.7 + hash(i * 3.1)), y = TOP + 0.14 - tt * 0.12;
      a[i * 3] = x + (hash(i * 5.3) - 0.5) * 0.09; a[i * 3 + 1] = y; a[i * 3 + 2] = HERO.z + 0.06 + (hash(i * 7.7) - 0.5) * 0.08; }
    S.salt.geometry.attributes.position.needsUpdate = true; S.salt.material.opacity = sk; }
}

// ---------------------------------------------------------------- la calle: gente que pasa (bucle exacto) y, con el letrero, entra; el anuncio de pago; las tiendas
const PED_W = 40;
function streetAt(t) {
  const P = S.peds, v0 = PED_W / END;          // cada uno da una vuelta exacta en todo el vídeo
  S.pedData.forEach((d, i) => {
    const v = Math.sign(d.v) * v0 * (1 + (i % 3)), xl = ((d.x0 + v * t + PED_W / 2) % PED_W + PED_W) % PED_W - PED_W / 2;
    let x = xl, z = d.z, sc = 1;
    if (d.enter && t > TT.enter + d.delay) {
      const t1 = TT.enter + d.delay, xe = ((d.x0 + v * t1 + PED_W / 2) % PED_W + PED_W) % PED_W - PED_W / 2, u = clamp((t - t1) / 2.6), e = u * u * (3 - 2 * u);
      const door = v3((hash(i * 4.4) - 0.5) * 3.0, 0, BZ - 0.6);
      x = lerp(xe, door.x, e); z = lerp(d.z, door.z, e); sc = 1 - clamp((u - 0.75) / 0.25);
      if (Math.abs(xe) > 9) sc = 0;            // los que están lejos siguen andando fuera de cuadro
    }
    const hop = Math.abs(Math.sin((x + z) * 3.2)) * 0.04;
    _o.position.set(x, hop, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(Math.max(0.0001, sc)); _o.updateMatrix(); P.setMatrixAt(i, _o.matrix);
  });
  P.instanceMatrix.needsUpdate = true;
  // el anuncio de pago: parpadea y se apaga con «otros pagan publicidad»; vuelve al final (bucle)
  const on = t < TT.adOff ? 1 : 1 - flick(t, TT.adOff + 0.25, 0.45) * 0.88 + win(t, END - 2.5, 0.8) * 0.88;
  S.adFace.material.color.setScalar(lerp(0.12, 1.0, clamp(on)));
  // platos vacíos con «?» sobre las otras tiendas
  S.shopQ.forEach((g, i) => { const k = cwin(t, TT.shops + i * 0.18, TT.poll - 0.2, 0.35, 0.3); g.visible = k > 0.01; if (g.visible) { g.scale.setScalar(Math.max(0.0001, backOut(clamp((t - TT.shops - i * 0.18) / 0.4)) * (k < 1 ? k : 1))); g.children[1].rotation.y = t * 1.6; } });
}
function sceneAt(t) { heroAt(t); bigAt(t); cellarAt(t); roundsAt(t); streetAt(t); }
