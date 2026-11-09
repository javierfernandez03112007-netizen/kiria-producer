// ---------------------------------------------------------------- tiempos y animación (todo depende solo del instante t)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const fract = x => x - Math.floor(x);
const _o = new THREE.Object3D(), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3(), _c1 = new THREE.Color();
let TT = {};
const RISE = 3.4, PRE = 1.0;          // la ciudad brota en 3,4 s, empezando 1 s antes del 0 (el primer fotograma ya está brotando)
function buildTimes() {
  TT = {
    crack: K.movil1,                                            // 1: «no te cabría en el móvil»: la caja de 128 GB se pone roja y la pantalla se raja
    qm: K.por2, qmOff: K.abrirlo2 + 0.25,                       // 2: «¿Por qué pesa tanto?»
    gb: K.hasta3, n212: K.n212_3,                               // 3: «hasta 212 gigas»
    discs: K.n50000_4, rd: K.doble4,                            // 4: canciones y Red Dead 2
    fiber: K.fibra5, clock: K.tardarias5,                       // 5: la fibra y el reloj
    code: K.codigo6, menos: K.realidad6,                        // 6: el código, diminuto
    ves: K.ves7, oyes: K.oyes7,                                 // 7: se enciende la ciudad; anillos de sonido
    wall: K.pared8, car: K.coche8, face: K.cara8, big: K.imagenes8, back: K.para8, blur: K.cerca8,   // 8: las láminas
    voz: K.voz9, song: K.cancion9, noise: K.ruido9, store: K.sonido9,                                 // 9: el sonido
    whole: K.ciudad10, race: K.lista10, raceEnd: K.esperar10 + 0.25,                                  // 10: la ciudad entera
    resp: K.respuesta11, pad: K.no11, padX: K.juego11, down: K.te11b, brick: K.cada11, brickOff: K.playstation12 - 0.2,   // 11: la respuesta
    poll: K.playstation12, hueco: K.haciendo12,                 // 12: votación; los iconos salen del móvil
  };
  TT.downEnd = TT.down + 1.7; TT.reRise = END - PRE;
}
// progreso de la ciudad: 0 = dentro del móvil, 1,15 = arriba del todo (por debajo de 0,15 solo asoma por la pantalla)
function riseAt(t) {
  const up = u => 1.15 * Math.sin(clamp(u) * Math.PI / 2);
  if (t >= TT.reRise) return up((t - TT.reRise) / RISE);
  if (t < TT.down) return up((t + PRE) / RISE);
  if (t < TT.downEnd) return 1.15 * (1 - eio(clamp((t - TT.down) / (TT.downEnd - TT.down))));
  return 0;
}
function cityState(t) {
  const p = riseAt(t), q = clamp((p - 0.15) / 1.0), em = clamp(p / 0.15);
  const sc = lerp(0.2, 1, q), base = p < 0.15 ? PH.t - 0.5 * (1 - em) : PH.t + PIL.h * q;
  return { p, q, sc, base, hp: PIL.h * q };
}
// ---------------------------------------------------------------- el móvil, la columna y la ciudad
function deviceAt(t) {
  const st = cityState(t), C = S.city;
  C.visible = st.p > 0.001; C.position.set(0, st.base + CH * st.sc, 0); C.scale.setScalar(st.sc);
  // los edificios brotan escalonados mientras crece la columna
  for (const b of S.blds) { const k = backOut(clamp((st.q * 1.25 - b.userData.delay) / 0.45)); b.scale.set(1, Math.max(0.001, k), 1); }
  S.pil.visible = st.hp > 0.002; S.pil.scale.set(1, Math.max(0.001, st.hp), 1); S.pil.position.y = PH.t;
  M.data.map.offset.y = -20 * t / END; M.data2.map.offset.y = -34 * t / END + 0.37;      // vueltas enteras: bucle exacto
  // la caja de 128 GB: blanca; con «móvil» se pone roja, parpadea y se va
  const r = win(t, TT.crack, 0.12), gone = win(t, TT.crack + 0.7, 0.5);
  const bin = win(t, K.cabria1 - 0.35, 0.3); S.box128.visible = bin > 0.001 && gone < 0.999 && t < TT.down; S.box128M.color.setRGB(lerp(1, 1, r), lerp(1, 0.3, r), lerp(1, 0.35, r)); S.box128M.opacity = bin * (1 - gone) * (r > 0 && r < 1 && Math.sin(t * 60) > 0 ? 0.4 : 1);
  // la pantalla se raja con «móvil» y se arregla cuando la ciudad vuelve a entrar
  S.phone.userData.crack.material.opacity = win(t, TT.crack, 0.15) * (1 - win(t, TT.down, 0.8)) * 0.85;
  // regla: con «hasta 212»
  const rk = cwin(t, TT.gb - 0.2, TT.rd + 2.6, 0.4, 0.4); S.ruler.visible = rk > 0.01; S.ruler.children[0].material.opacity = rk * 0.9; S.rulerLabs.forEach(l => l.material.opacity = rk);
  // Red Dead 2: la otra columna sube de la mesa
  const rd = backOut(clamp((t - TT.rd) / 0.6)) * (1 - win(t, TT.code - 0.6, 0.5)); S.rd.visible = rd > 0.002; S.rd.scale.set(1, 1, 1);
  S.rdCol.forEach(m => { m.scale.y = Math.max(0.001, H99 * rd); m.position.y = 0.04 + H99 * rd / 2; });
  // la «?» encima de la ciudad
  const qk = cwin(t, TT.qm, TT.qmOff, 0.3, 0.3); S.qm.visible = qk > 0.01;
  if (S.qm.visible) { S.qm.position.set(0.35, CTOP + 0.95 + Math.sin(t * 2.4) * 0.03, 0.2); S.qm.scale.setScalar(1.5 * backOut(clamp((t - TT.qm) / 0.45)) * (qk < 1 ? qk : 1)); S.qm.rotation.y = t * 1.2; }
  // agua y noria
  M.ground.map.offset.set(0, 0); S.wheel.rotation.z = -t / END * Math.PI * 2;
}
// ---------------------------------------------------------------- discos (canciones), fibra con pulsos y reloj
function discsAt(t) {
  const N = S.discData.length, t0 = TT.discs - 0.1, dur = 1.35, gone = win(t, TT.code - 0.6, 0.5);
  S.discs.visible = t > t0 && gone < 1;
  if (!S.discs.visible) return;
  S.discData.forEach((d, i) => { const ti = t0 + (i / N) * dur, u = clamp((t - ti) / 0.45);
    if (u <= 0) { _o.position.set(0, -50, 0); _o.scale.setScalar(0.0001); }
    else { const e = u * u; _o.position.set(lerp(d.x0, d.p.x, u), lerp(1.9, d.p.y, e), lerp(d.z0, d.p.z, u)); _o.rotation.set(d.rx * (1 + (1 - u) * 6), 0, d.rz * (1 + (1 - u) * 6)); _o.scale.setScalar(1 - gone * 0.999); }
    _o.updateMatrix(); S.discs.setMatrixAt(i, _o.matrix); });
  S.discs.instanceMatrix.needsUpdate = true;
}
function fiberAt(t) {
  const k = cwin(t, TT.fiber - 0.3, TT.code - 0.5, 0.4, 0.4); S.fiber.visible = k > 0.01; S.pulses.visible = k > 0.01;
  if (!S.fiber.visible) return; S.fiber.scale.setScalar(1);
  for (let i = 0; i < 14; i++) { const u = fract(t * 0.32 + i / 14), p = S.fiberCurve.getPointAt(u), tg = S.fiberCurve.getTangentAt(u);
    _o.position.copy(p).add(v3(0, 0.012, 0)); _o.quaternion.setFromUnitVectors(v3(0, 1, 0), tg); _o.scale.setScalar(k * (u > 0.97 ? (1 - u) / 0.03 : 1)); _o.updateMatrix(); S.pulses.setMatrixAt(i, _o.matrix); }
  S.pulses.instanceMatrix.needsUpdate = true;
}
// ---------------------------------------------------------------- la ciudad viva: coches, luces, código, láminas, sonido
const _cityM = new THREE.Matrix4();
function cityLocal(p) { return S.city.localToWorld(p.clone()); }
function lifeAt(t) {
  // coches: vueltas exactas por su calle (bucle)
  for (const c of S.cars) { const s = fract(c.s0 + c.dir * c.n * t / END), u = s * 3.0 - 1.5; const off = c.dir * 0.025;
    if (c.L.a === 'z') { c.g.position.set(c.L.c + off, 0, u); c.g.rotation.y = c.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
    else { c.g.position.set(Math.min(u, 0.42), 0, c.L.c + off); c.g.rotation.y = c.dir > 0 ? 0 : Math.PI; c.g.visible = u < 0.42; } }
  // el coche que corre por el paseo con «cualquier sitio»
  { const u = eio(clamp((t - TT.race) / (TT.raceEnd - TT.race))), z = t > TT.downEnd + 0.1 && t < TT.race ? -1.35 : lerp(-1.35, 1.35, u); S.racer.position.set(AVES[1] - 0.025, 0, t >= TT.downEnd ? -1.35 : z); S.racer.rotation.y = -Math.PI / 2; }
  // luces de la ciudad: tenues desde el principio; con «ves» se encienden del todo; se apagan al volver al móvil (bucle)
  const on = win(t, TT.ves - 0.05, 0.5) * (1 - win(t, TT.downEnd, 0.3)), L = 0.25 + 0.95 * on;
  M.fac.forEach(m => m.emissiveIntensity = L * 1.1); M.tower.forEach(m => m.emissiveIntensity = L * 0.9);
  M.neon.forEach((m, i) => { m.opacity = 0.35 + 0.65 * win(t, TT.ves + i * 0.06, 0.25) * (1 - win(t, TT.downEnd, 0.3)); });
  S.signs.forEach((s, i) => { s.material.opacity = 0.3 + 0.7 * win(t, TT.ves + 0.1 + i * 0.08, 0.2) * (1 - win(t, TT.downEnd, 0.3)); });
  // el cubito de código gira y su texto corre
  S.code.rotation.y = 5 * Math.PI * 2 * t / END; M.code.map.offset.y = -14 * t / END;
}
// curva de despegue: la lámina gira sobre su borde de arriba y se curva como una pegatina
function peelShape(m, k) {
  const pa = m.geometry.attributes.position, b = m.userData.base, h = m.userData.h;
  for (let i = 0; i < pa.count; i++) { const y = b[i * 3 + 1], v = -y / h; pa.setXYZ(i, b[i * 3], y, b[i * 3 + 2] + Math.pow(v, 2) * h * 0.55 * k); }
  pa.needsUpdate = true; m.geometry.computeVertexNormals();
}
const _e1 = new THREE.Euler();
function peelsAt(t) {
  const items = [
    { m: S.peelWall, t0: TT.wall, A: v3(HERO_B.x, HERO_B.h, HERO_B.z + HERO_B.d / 2 + 0.002), big: v3(-0.45, 2.75, -1.7), bs: 5.5, g: S.grids[0], tilt: 0.75, fw: 0.07 },
    { m: S.peelCar, t0: TT.car, A: v3(HERO_CAR.x, 0.03, HERO_CAR.z + 0.0205), big: v3(0.62, 1.55, -1.5), bs: 12, g: S.grids[1], tilt: 0.6, fw: 0.04 },
    { m: S.peelFace, t0: TT.face, A: v3(HERO_PED.x, 0.096, HERO_PED.z + 0.0138), big: v3(0.62, 2.75, -1.5), bs: 20, g: S.grids[2], tilt: 0.5, fw: 0.03 },
  ];
  const sc = S.city.scale.x, alive = t > 1.0 && t < TT.down, back = eio(clamp((t - TT.back) / 0.6));
  for (const it of items) {
    const m = it.m; m.visible = alive; if (!alive) { it.g.visible = false; continue; }
    const k = eio(clamp((t - it.t0) / 0.6)) * (1 - back), fly = eio(clamp((t - TT.big + 0.15) / 0.9)) * (1 - back);
    // despegada: se separa hacia la cámara, se curva por abajo y ondea; luego sube al cielo y crece; con «para que de cerca» vuelve a su sitio
    _p1.copy(cityLocal(it.A)).add(v3(0, 0.02 * k * sc, it.fw * k * sc)); _p2.copy(it.big).add(v3(0, CTOP, 0));
    m.position.copy(_p1).lerp(_p2, fly); const s = lerp(sc, sc * it.bs, fly); m.scale.setScalar(s);
    peelShape(m, k * (1 - fly) * 0.9);
    m.rotation.set(-it.tilt * k * (1 - fly), (Math.sin(t * 1.7 + it.bs) * 0.18 * k) * (1 - fly) + Math.sin(t * 0.6 + it.bs) * 0.08 * fly, 0);
    // cuadrícula de píxeles sobre la lámina grande (gira con ella sobre el eje vertical: sin desfase)
    const gk = fly * (1 - win(t, TT.back - 0.2, 0.2)); it.g.visible = gk > 0.01;
    if (it.g.visible) { it.g.material.opacity = gk * 0.8; it.g.rotation.set(0, m.rotation.y, 0); it.g.scale.set(m.userData.w * s, m.userData.h * s, 1);
      it.g.position.copy(m.position).add(v3(Math.sin(m.rotation.y) * 0.004, -m.userData.h * s / 2, Math.cos(m.rotation.y) * 0.004)); }
  }
  // la mitad borrosa de la fachada, solo en la comparación de cerca
  const bk = cwin(t, TT.blur - 0.35, TT.voz - 0.3, 0.2, 0.25); S.blurHalf.visible = S.blurDiv.visible = bk > 0.01;
  S.heroGrey.visible = t > TT.wall - 0.02 && t < TT.back + 0.62;
}
function soundAt(t) {
  const src = [cityLocal(v3(HERO_PED.x, 0.1, HERO_PED.z)), cityLocal(v3(HERO_CAR.x, 0.05, HERO_CAR.z)), cityLocal(v3(0.43, 0.04, -0.2))];
  const t0s = [TT.voz, TT.song, TT.noise], store = eio(clamp((t - TT.store) / 0.7)), sc = S.city.scale.x;
  S.waves.forEach((w, i) => { const k = clamp((t - t0s[i]) / 0.5), on = k > 0 && store < 1 && t < TT.whole + 0.2; w.visible = on; if (!on) return;
    const n = w.userData.n, dir = v3(i === 1 ? -0.7 : i === 2 ? 0.3 : 0.5, 0.75, 0.5).normalize(), L = 0.5 * sc * k;
    for (let j = 0; j < n; j++) { const u = j / (n - 1), a = Math.abs(Math.sin(u * 9 + t * (6 + i * 3) + i)) * (0.4 + 0.6 * Math.abs(Math.sin(u * 23 + t * 3 + i * 2))) * (i === 0 ? 1 : 1.3) * (1 - u * 0.4);
      _p1.copy(src[i]).addScaledVector(dir, u * L);
      // «guardado»: se van a la columna
      _p2.set(0, PH.t + PIL.h * (0.4 + i * 0.15), 0); _p1.lerp(_p2, store);
      _o.position.copy(_p1); _o.rotation.set(0, 0.6, 0); _o.scale.set(0.008 * sc, Math.max(0.0005, a * 0.12 * sc * (1 - store * 0.7)), 0.008 * sc); _o.updateMatrix(); w.setMatrixAt(j, _o.matrix); }
    w.instanceMatrix.needsUpdate = true; });
  // anillos con «oyes»
  S.rings.forEach((r, i) => { const u = (t - TT.oyes - (i % 4) * 0.22) / 1.1; r.visible = u > 0 && u < 1 && t < TT.wall; if (!r.visible) return;
    const P = [cityLocal(v3(HERO_CAR.x, 0.02, HERO_CAR.z)), cityLocal(v3(0.43, 0.02, -0.6)), cityLocal(v3(-0.35, 0.02, 0.2)), cityLocal(v3(-0.7, 0.3, -0.4))][i % 4];
    r.position.copy(P); const R = (0.03 + u * 0.35) * S.city.scale.x; r.scale.set(R, R, R * 0.6); r.material.opacity = (1 - u) * 0.9; });
}
// ---------------------------------------------------------------- la respuesta: el mando tachado, el ladrillo, los iconos que salen
function answerAt(t) {
  const pk = cwin(t, TT.pad, TT.down + 0.3, 0.35, 0.3); S.pad.visible = pk > 0.01;
  if (S.pad.visible) { S.pad.position.set(0, CTOP + 0.55, 0.9); S.pad.scale.setScalar(1.7 * backOut(clamp((t - TT.pad) / 0.4)) * (pk < 1 ? pk : 1)); S.pad.rotation.set(0.15, Math.sin(t * 1.4) * 0.25, 0); }
  const xk = cwin(t, TT.padX, TT.down + 0.3, 0.12, 0.3); S.crossM.visible = S.crossM2.visible = xk > 0.01 && S.pad.visible;
  if (S.crossM.visible) { for (const [m, a] of [[S.crossM, 0.75], [S.crossM2, -0.75]]) { m.position.copy(S.pad.position).add(v3(0, 0, 0.12)); m.rotation.set(0, 0, a); m.scale.set(xk * 1.7, 1.7, 1.7); } }
  // el ladrillo: sale de la pantalla, vuela a la cámara y vuelve a entrar
  const bk0 = clamp((t - TT.brick + 0.15) / 0.9), bk1 = clamp((t - TT.brickOff) / 0.6); S.brick.visible = bk0 > 0 && bk1 < 1;
  if (S.brick.visible) { const e = eio(bk0) * (1 - eio(bk1)); _p1.set(0, PH.t + 0.02, 0); _p2.set(0.0, 0.72, 0.62); S.brick.position.copy(_p1).lerp(_p2, e); S.brick.scale.setScalar(lerp(0.2, 1.0, e));
    S.brick.rotation.set(lerp(-1.2, 0.18, e), lerp(2.4, -0.45, e) + Math.sin(t * 0.9) * 0.05 * e, lerp(0.6, 0.04, e)); }
  // «haciendo hueco»: iconos que salen del móvil disparados
  S.icons.forEach((m, i) => { const t0 = TT.hueco - 0.25 + i * 0.045, u = (t - t0) / 1.1; m.visible = u > 0 && u < 1;
    if (!m.visible) return; const gx = (i % 3 - 1) * 0.2, gz = (Math.floor(i / 3) % 6 - 2.5) * 0.22, a = hash(i * 3.1) * 6.283, sp = 0.9 + hash(i * 5.7) * 0.8;
    m.position.set(gx + Math.cos(a) * sp * u, PH.t + 0.02 + 2.6 * u - 2.4 * u * u, gz + Math.sin(a) * sp * u); m.rotation.set(-Math.PI / 2 + u * 4 * (hash(i) - 0.5), u * 3, u * 2 * (hash(i * 2) - 0.5)); m.scale.setScalar(Math.min(1, u * 8) * (1 - win(t, t0 + 0.85, 0.25))); });
}
function sceneAt(t) { deviceAt(t); discsAt(t); fiberAt(t); lifeAt(t); peelsAt(t); soundAt(t); answerAt(t); }
