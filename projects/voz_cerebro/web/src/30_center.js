// ---------------------------------------------------------------- LA COREOGRAFÍA (un solo plano; tiempos de la voz de Javi)
// 0 cabeza de cristal con el cerebro de luz: la palabra se queda en los labios · 5,1 ELA: la señal baja hacia la boca y se corta · 10,7 el cerebro solo (lámina 1), la zona del habla
// 12,9 el cerebro se vuelve rosa y bajan los brazos cromados (lámina del implante) · 16,6 colocan los 4 chips; 19,7 «256»: las agujas entran · 21,8 la cámara entra: neuronas (lámina 1b)
// 24,4 la señal sube por la aguja → el cerebro azul con la onda (lámina «señales») y las palabras · 30,7 el 97 % · 35,2 la cara de partículas y su voz (lámina «una voz propia»)
// 42,4 «2025», 1/40 de segundo · 47,9 vuelve la cabeza de cristal con los chips: la voz sale sin mover los labios · 56,2 vuelta al principio (bucle).
let TL = {};
const GOLDA = new THREE.Color(1.0, 0.55, 0.12), BLUEB = new THREE.Color(0.18, 0.45, 1.0), EL_A = new THREE.Color(0.3, 0.62, 1.15), EL_B = new THREE.Color(0.12, 0.32, 1.0);
async function buildScene() {
  TL = { hablar: K['hablar_1'], decir: K['decir_1'], ela: K['ela_2'], destruye: K['destruye_2'], neur: K['neuronas_2'], musc: K['musculos_2'], pens: K['pensamientos_3'], intactos: K['intactos_3'],
    cient: K['cientificos_4'], escuch: K['escucharlos_4'], impl: K['implantaron_5'], cuatro: K['cuatro_5'], chips: K['chips_5'], e256: K['256_5'], electr: K['electrodos_5'], captar: K['captar_5'],
    cuando: K['cuando_6'], intenta: K['intenta_6'], ia: K['inteligencia_6'], interpreta: K['interpreta_6'], senales: K['senales_6'], convierte: K['convierte_6'], palabras: K['palabras_6'],
    result: K['resultado_7'], prec: K['precision_7'], p97: K['97_7'], incre: K['increible_8'], grab: K['grabaciones_8'], recon: K['reconstruir_8'], voz: K['voz_8'], robot: K['robotica_8'],
    y2025: K['2025_9'], tecno: K['tecnologia_9'], treal: K['tiempo_9'], todavia: K['todavia_10'], posib: K['posibilidad_10'], recup: K['recuperar_10'], mover: K['mover_10'], labios: K['labios_10'],
    futuro: K['futuro_11'], perder: K['perder_11'], palabras2: K['palabras_11'] };
  TL.k = [0, 1, 2, 3].map(i => TL.cuatro - 0.35 + i * 0.55);                       // cuándo se posa cada chip
  TL.fly0 = TL.incre - 0.77; TL.fly1 = TL.grab - 0.57;                               // el vuelo del cerebro azul a la cara (recto, por −x)
  S.head = await buildHead(); scene.add(S.head); const U = S.head.userData; U.arms = buildArms(S.head);
  S.neuro = buildNeuro(); scene.add(S.neuro);
  // reflejos de estudio (cromo, chips, cerebro rosa, aguja): sin ellos el metal se ve negro en el vacío
  const studioOn = o => { const m = o.material; if (m && (m.metalness > 0.5 || m.userData.studio || m.clearcoat > 0.5)) { m.envMap = S.studio; m.envMapIntensity = m.metalness > 0.5 ? 1.3 : 0.4; m.needsUpdate = true; } };
  S.head.traverse(studioOn); S.neuro.traverse(studioOn); U.brain.userData.pm.envMap = S.studio; U.brain.userData.pm.envMapIntensity = 0.4;
  // brillo azul oscuro de fondo detrás del cerebro rosa (como la lámina del brazo robótico)
  S.haze = [0, 1, 2].map(i => { const h = glowSprite(i === 1 ? 0x1a3a7a : 0x10264f, 5 + i * 2, 0); h.position.set(-1.5 - i * 1.2, 0.6 + (i - 1) * 0.8, -1.5 - i); scene.add(h); return h; });
  S.voice = buildVoice(U.geo); scene.add(S.voice);
  // la onda EEG que atraviesa el cerebro azul
  S.eeg = waveLine(6000, [new THREE.Color(0.6, 0.85, 2.2), new THREE.Color(1.6, 1.9, 2.4), new THREE.Color(0.6, 0.85, 2.2)], 0.03); scene.add(S.eeg);
  S.eeg2 = waveLine(4000, [new THREE.Color(0.25, 0.5, 1.8), new THREE.Color(0.5, 0.8, 2.0)], 0.018); scene.add(S.eeg2);
  for (const e of [S.eeg, S.eeg2]) { e.material.depthTest = false; e.renderOrder = 20; }
  // flujo óptico: polvo de luz alrededor de la cabeza, en el camino a la cara (VOX) y entre las neuronas
  // (con rng: hash() con índices seguidos hacía columnas de puntos)
  const ballR = (R, r0, rnd) => { let x, y, z; do { x = rnd() * 2 - 1; y = rnd() * 2 - 1; z = rnd() * 2 - 1; } while (x * x + y * y + z * z > 1 || x * x + y * y + z * z < r0 * r0); return [x * R, y * R, z * R]; };
  const r1 = rng(11), r2 = rng(22), r3 = rng(33);
  S.flow = [flowCloud(9000, () => ballR(9, 0.22, r1), { size: 1.3, bright: 0.45, seed: 1, nearF: 0.08, farF: 0.05, col: 0x9fc8ff }),
    // el túnel del vuelo cerebro → cara (a lo largo de −x): estelas largas y brillantes (keep alto) para que el viaje se vea
    flowCloud(14000, () => { const x = -4 - r2() * 51, a = r2() * 6.2832, rr = 0.35 + Math.sqrt(r2()) * 2.6; return [x, 0.35 + Math.sin(a) * rr * 0.9, Math.cos(a) * rr]; }, { size: 1.5, bright: 0.85, seed: 2, nearF: 0.06, farF: 0.02, keep: 0.4, col: 0xb8b0ff }),
    flowCloud(7000, () => { const b = ballR(10, 0.1, r3); return [NEU.x + b[0], NEU.y + b[1], NEU.z + b[2] - 2]; }, { size: 1.3, bright: 0.5, seed: 3, nearF: 0.05, farF: 0.05, col: 0xffd28a })];
}
const ZERO4 = [0, 0, 0, 0];
function stageAt(t, st) {
  NOW = t; const U = S.head.userData, B = U.brain, vz = voice(t), loopK = win(t, END - 1.6, 1.4);
  U.holo.uniforms.time.value = t; U.pm.uniforms.time.value = t;
  // ---- la cabeza de cristal: se ve al principio, en la ELA, y otra vez al final (con los chips)
  const headOp = Math.max(1 - win(t, TL.pens - 0.3, 0.9), win(t, TL.todavia - 0.6, 1.0) * (1 - win(t, END + 1, 1)));
  U.holo.uniforms.op.value = headOp; U.mesh.visible = headOp > 0.01;
  // ---- el cerebro: luz de oro (1) → rosa (2) → azul eléctrico (3) → rosa con chips (4) → luz de oro (vuelta al principio)
  const toPink = win(t, TL.cient - 0.2, 1.1) * (1 - win(t, TL.e256 + 2.2, 0.6)), toBlue = win(t, TL.cuando + 0.6, 0.6) * (1 - win(t, TL.incre - 0.4, 0.8)), pink2 = win(t, TL.todavia - 0.4, 1.0) * (1 - win(t, TL.futuro - 0.3, 1.2));
  const pink = Math.max(toPink, pink2), glowOp = clamp(1 - pink), cA = GOLDA.clone().lerp(EL_A, toBlue), cB = BLUEB.clone().lerp(EL_B, toBlue);
  const act = 0.65 + 0.6 * bump(t, TL.pens - 0.2, TL.cient, 0.5, 0.6) + 0.15 * toBlue + 0.25 * vz;
  const gridK = bump(t, TL.result, TL.incre - 0.5, 0.4, 0.4);
  brainGlowAt(B, t, { op: glowOp * (1 - 0.35 * toBlue) * (1 - 0.55 * gridK), pink: pink, act, cA, cB, sparks: 1 - 0.5 * toBlue });
  S.haze.forEach((h, i) => { h.material.opacity = 0.55 * Math.max(toPink, pink2 * 0.6); });
  const hotK = bump(t, TL.intactos - 0.6, TL.e256, 0.5, 0.6); for (const m of B.userData.mats) { m.uniforms.hotK.value = hotK; m.uniforms.lines.value = 1 + 0.8 * toBlue; }
  B.visible = !(st.p.z < -100);
  S.flow[1].material.uniforms.bright.value = 0.85 * bump(t, TL.fly0 - 0.1, TL.fly1 + 0.2, 0.3, 0.4);
  // ---- la ELA: la señal baja por la vía; con «destruye» se corta a mitad y los músculos se apagan
  const elaOn = bump(t, TL.ela - 0.6, TL.pens + 0.2, 0.5, 0.6), alive = 1 - 0.58 * sm5(seg(t, TL.destruye, TL.musc + 0.3)); U.pm.uniforms.op.value = elaOn; U.pm.uniforms.alive.value = alive;
  U.mm.uniforms.op.value = elaOn * (1 - 0.82 * sm5(seg(t, TL.destruye + 0.6, TL.musc + 0.5))); U.mm.uniforms.time.value = t; U.muscles.forEach(m => m.visible = elaOn > 0.01);
  // ---- la palabra que se queda en los labios (al principio y, fuera ya del bucle, nada más)
  { const k = seg(t, 1.9, TL.decir - 0.1) + 0.6 * seg(t, TL.decir - 0.1, TL.decir + 0.6), a = bump(t, 1.8, TL.decir + 0.5, 0.3, 0.4); wordWave(U, k, a, t); const hit = bump(t, TL.decir - 0.25, TL.decir + 0.5, 0.08, 0.35); U.hit.material.opacity = hit * 0.7; U.hit.scale.setScalar(0.07 + 0.09 * hit); }
  // ---- brazos y chips
  { const k = TL.k.map(tk => seg(t, tk - 0.6, tk)), out = TL.k.map(tk => seg(t, tk + 0.15, tk + 0.75)), armsVis = bump(t, TL.cient + 0.2, TL.e256 + 0.8, 0.3, 0.3), chipsVis = t > TL.cient ? 1 : 0;
    const ins = seg(t, TL.e256 + 0.05, TL.e256 + 0.9), endFade = 1 - win(t, END - 2.2, 1.6);
    armsAt(S.head, t, { k: k.map(x => armsVis > 0 || x >= 1 ? x : 0), out: out.map((x, i) => armsVis > 0.01 ? x : 1), ins, lights: Math.max(toPink, pink2), glow: bump(t, TL.e256 - 0.1, TL.captar, 0.2, 0.5) + 0.6 * bump(t, TL.posib, TL.labios + 0.6, 0.4, 0.5), a: chipsVis * endFade, showChips: chipsVis, big: bump(t, TL.posib - 0.3, TL.labios + 0.6, 0.5, 0.6) });
    U.arms.userData.tools.forEach(T => T.visible = T.visible && armsVis > 0.01); }
  // ---- las neuronas (se ve solo con la cámara allí)
  { const inN = st.p.distanceTo(NEU) < 30; neuroAt(S.neuro, t, { a: inN ? 1 : 0, syn: 1, fire: 0.5 + 0.8 * bump(t, TL.cuando - 0.1, TL.cuando + 1.4, 0.2, 0.4), listen: win(t, TL.captar - 0.5, 0.4) }); }
  // ---- la onda EEG que atraviesa el cerebro azul: se dibuja de izquierda a derecha y, con «palabras», se convierte en letras (HUD)
  { const a = bump(t, TL.ia - 0.5, TL.result + 0.4, 0.5, 0.5) * (st.p.z > -100 ? 1 : 0), c = S.head.localToWorld(_v().set(0, 0.56, -0.1)), sh = seg(t, TL.ia - 0.5, TL.interpreta + 0.4);
    eegAt(S.eeg, -2.6, 2.6, c.y, c.z + 0.05, t, 0.26 + 0.16 * vz, 0.35, sh, a); S.eeg.position.set(0, 0, 0); S.eeg.rotation.y = Math.PI / 2;
    eegAt(S.eeg2, -2.6, 2.6, c.y - 0.06, c.z + 0.05, t * 0.8, 0.09, 0.15, sh, a * 0.6, 7); S.eeg2.rotation.y = Math.PI / 2; }
  // ---- la cara de partículas y su voz
  { const V = S.voice.userData, a = bump(t, TL.incre - 1.2, TL.todavia - 0.2, 0.8, 0.8); V.face.material.opacity = a * 0.95; V.face.visible = a > 0.01;
    const amp = (0.35 + 0.9 * vz) * win(t, TL.recon - 0.2, 0.5), wa = a * win(t, TL.recon - 0.3, 0.5);
    V.waves.forEach((w, k) => { voiceAt(w, { x: V.mouth.x, y: V.mouth.y, z: V.mouth.z, dx: -1 }, k, t, amp * (1 - 0.1 * k), wa * (1 - k * 0.1), 3.4); w.position.set(0, 0, (k - 2.5) * 0.02); });
    const fa = a * bump(t, TL.grab - 0.3, TL.robot + 0.4, 0.4, 0.6); V.films.forEach((P, i) => drawFilm(P, i, t, fa * win(t, TL.grab - 0.3 + i * 0.2, 0.3)));
    { const p = V.feed.geometry.attributes.position, n = p.count, A0 = _v().set(-0.62, -0.85, 0.3), A1 = _v().set(-0.15, -0.55, 0.25), A2 = _v().set(0.25, -0.1, 0.0); for (let i = 0; i < n; i++) { const u = i / (n - 1), q = A0.clone().lerp(A1, Math.min(1, u * 2)).lerp(A2, Math.max(0, u * 2 - 1)); p.setXYZ(i, q.x + Math.sin(u * 40 - t * 12) * 0.05 * Math.sin(u * Math.PI), q.y + Math.cos(u * 34 - t * 10) * 0.05 * Math.sin(u * Math.PI), q.z); } p.needsUpdate = true; V.feed.material.opacity = fa * win(t, TL.grab + 0.6, 0.4); }
    drawRobot(V.robot, t, a * bump(t, TL.robot - 1.0, TL.y2025 + 0.4, 0.3, 0.4), seg(t, TL.robot - 0.1, TL.robot + 0.5)); }
  // ---- la voz final: sale de la cabeza de cristal (desde los chips) sin mover los labios
  { const a = bump(t, TL.recup - 0.2, TL.futuro + 0.6, 0.5, 0.8); U.voiceOut = U.voiceOut || (() => { const ws = [0, 1, 2].map(k => { const w = waveLine(700, [new THREE.Color(0.35, 0.7, 1.6), new THREE.Color(0.8, 0.45, 1.8), new THREE.Color(1.2, 0.45, 1.3)], 0.02); S.head.add(w); return w; }); return ws; })();
    U.voiceOut.forEach((w, k) => voiceAt(w, { x: U.lip.x, y: U.lip.y - 0.01, z: U.lip.z + 0.07, dir: _v().set(0, 0, 1), up: _v().set(0, 1, 0), side: _v().set(1, 0, 0) }, k, t, 0.35 + 0.8 * vz, a * (1 - 0.15 * k), 2.6)); }
}
function fillAt(t) { return { k: 0, c: [0, 0, 0] }; }
