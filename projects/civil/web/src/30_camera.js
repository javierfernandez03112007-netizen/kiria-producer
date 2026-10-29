// ---------------------------------------------------------------- cámara: el plano (A) → el duelo (B) → bajo tierra y la torre (C) → presa y mapa (D, E) → el libro (F) → vuelta al plano: el cartel y la casa
let CK = [], CK_OPEN = [];
const add = (a, b) => [a.x + b[0], a.y + b[1], a.z + b[2]];
function buildCam() {
  const HW = HSX.clone().add(S.house.win), RXD = S.river.RXD, RZ = ZD.z + 0.25;
  const MAD = mp(...CITY.mad, 0), sl = i => S.slots[i];
  // primer segundo: a ras del papel, con la punta del compás dibujando el arco y la pata gigante subiendo
  CK_OPEN = [
    [-1.0, [-1.3, 0.5, -1.45], [-1.85, 0.1, -0.35], 32, 0.02],
    [0.0, [-0.75, 0.55, -1.55], [-1.3, 0.1, -0.49], 32, 0.03],
    [0.55, [0.1, 0.6, -0.95], [-0.6, 0.15, -0.35], 33, 0.01],
  ];
  CK = [
    ...CK_OPEN,
    [1.05, [0.6, 0.45, 0.55], [-1.3, 0.2, -0.35], 34, 0.0],                                      // el arco se levanta del papel
    [K.puente1 + 0.15, [0.35, 0.55, 0.9], [-1.2, 0.25, -0.3], 36, -0.02],                     // el tablero sube
    [K.ingeniero + 0.12, [1.05, 0.42, 1.45], [1.45, 0.2, 0.3], 33, 0.02],                         // golpe de cámara a la casa
    [K.caminos1 + 0.4, [1.7, 0.62, 1.55], [1.55, 0.22, 0.3], 34],
    [K.no1 + 0.05, [1.82, 0.8, 1.62], [1.55, 0.18, 0.32], 36],                                    // el sello la aplasta
    [K.tu1 + 0.05, [1.72, 1.05, 1.38], [1.55, 0.02, 0.36], 34],
    [K.dicen + 0.15, [1.35, 0.85, 0.65], [0.75, 0.3, -0.95], 34],                                 // cae el libro de la ley
    [K.ley2 + 0.25, [1.25, 0.62, -0.05], [0.65, 0.08, -1.05], 32],
    [K.tribunal + 0.1, [1.85, 0.5, -0.45], [1.3, 0.18, -1.15], 32],                             // el mazo
    [K.supremo2 + 0.25, [1.72, 0.4, -0.62], [1.32, 0.14, -1.15], 32, 0.02],
    [K.porque3 + 0.25, [0.75, 0.75, 1.65], [-0.45, 0.6, -0.95], 34],                              // las barras vuelan del puente al «?»
    [K.digo, [0.55, 1.1, 2.3], [-0.25, 1.05, -1.45], 32],
    [K.nadie + 0.15, [0.25, 1.05, 1.2], [-0.25, 1.0, -1.45], 32, -0.03],
    // vuelo al duelo (pantalla partida en vertical: arriba Caminos, abajo Arquitectura)
    [K.caminos4 + 0.15, [6.1, 1.42, -2.95], [6.0, 1.12, -4.5], 33, 0.03],
    [K.vosotros4 - 0.05, [6.1, 1.25, -3.05], [6.0, 1.12, -4.5], 32],
    [K.dibujais + 0.1, [5.95, 0.45, -3.0], [6.0, 0.36, -4.5], 32, -0.02],
    [K.nosotros4 + 0.1, [6.05, 0.9, -1.8], [6.0, 0.86, -4.5], 33],
    [K.caiga + 0.3, [6.0, 0.88, -1.55], [6.0, 0.85, -4.5], 33],
    [K.arquitectos5 + 0.1, [5.92, 0.42, -2.85], [6.0, 0.37, -4.5], 32, 0.02],
    [K.calculais + 0.1, [6.12, 1.35, -3.05], [6.0, 1.3, -4.5], 32],
    [K.nosotros5 + 0.1, [6.0, 0.9, -1.75], [6.0, 0.85, -4.5], 33],
    [K.vivir + 0.1, [5.98, 0.48, -2.95], [6.0, 0.42, -4.5], 32],
    [K.dentro5 + 0.45, [6.0, 0.45, -2.85], [6.0, 0.4, -4.5], 32],
    // «por dentro»: picado bajo tierra, el corte del terreno
    [K.dentro6 + 0.35, [9.6, -0.1, -6.2], [11.3, -0.35, -9.0], 36, 0.06],
    [K.esto + 0.2, [11.3, -0.32, -6.5], [11.5, -0.42, -9.0], 35],
    [K.suelos + 0.45, [11.65, -0.4, -6.4], [11.5, -0.5, -9.0], 36],
    [K.inclina + 0.1, [12.0, 0.15, -6.55], [11.65, 0.32, -9.0], 33],
    [K.pisa + 0.2, [11.95, 0.32, -6.7], [11.75, 0.42, -9.0], 33, -0.02],
    [K.estructuras + 0.15, [11.95, 0.4, -7.6], [11.9, 0.3, -9.0], 34],
    [K.estructuras + 0.6, [11.5, 0.62, -6.8], [12.2, 0.32, -9.0], 34],
    [K.trenes + 0.05, [13.25, 0.52, -7.75], [12.2, 0.42, -9.0], 32, 0.03],
    [K.viento + 0.2, [13.6, 0.95, -6.8], [12.3, 0.4, -9.0], 33],
    // la presa
    [K.presas + 0.1, [16.05, 0.52, -12.15], [RXD - 0.15, 0.12, RZ], 33],
    [K.frenan + 0.25, [16.25, 0.42, -12.35], [RXD - 0.2, 0.1, RZ], 33],
    [K.rios + 0.2, [16.35, 0.75, -12.15], [RXD - 0.1, 0.05, RZ - 0.1], 36],
    // el mapa (se abre el plano con un zoom: fov amplio)
    [K.carreteras + 0.25, [17.7, 2.4, -11.1], [17.75, 0.0, -13.25], 44],
    [K.espana + 0.1, [17.72, 3.3, -10.7], [17.75, 0.0, -13.28], 48],
    [K.mundo + 0.1, [17.78, 3.45, -10.6], [17.75, 0.0, -13.3], 48, 0.01],
    // Madrid: el polideportivo y la casa
    [K.supremo8 + 0.2, [17.7, 0.95, -12.3], [MAD.x, 0.05, MAD.z], 38],
    [K.polideportivo + 0.2, [MAD.x - 0.04, 0.75, MAD.z + 1.4], [MAD.x, 0.08, MAD.z + 0.05], 50],
    [K.tu8 + 0.15, [MAD.x + 0.03, 0.72, MAD.z + 1.38], [MAD.x + 0.01, 0.08, MAD.z + 0.05], 50],
    [K.no8 + 0.2, [MAD.x + 0.02, 0.76, MAD.z + 1.42], [MAD.x + 0.01, 0.08, MAD.z + 0.05], 50],
    // el libro de la ley y sus edificios
    [K.ley9 + 0.15, [22.1, 1.05, -16.2], [21.7, 0.1, -17.55], 34, 0.03],
    [K.dice9 + 0.1, [21.95, 0.7, -16.75], [21.75, 0.1, -17.55], 32],
    [K.edificio9 + 0.05, [21.6, 1.25, -15.7], [21.4, 0.3, -18.0], 40],
    [K.vive + 0.35, [sl(0).x + 0.12, 1.15, -17.2], [sl(0).x, 0.25, sl(0).z], 36],
    [K.estudia + 0.35, [sl(1).x + 0.1, 1.15, -17.2], [sl(1).x, 0.25, sl(1).z], 36],
    [K.cura + 0.35, [sl(2).x + 0.08, 1.17, -17.2], [sl(2).x, 0.27, sl(2).z], 36],
    [K.reza + 0.35, [sl(3).x + 0.05, 1.2, -17.2], [sl(3).x, 0.28, sl(3).z], 36],
    [K.firma + 0.3, [21.4, 1.25, -16.2], [21.4, 0.22, -18.3], 46],
    [K.arquitecto9 + 0.2, [21.35, 1.35, -16.0], [21.4, 0.22, -18.3], 46],
    // vuelta al plano: el puente (no es un edificio), el cartel y el mazo
    [K.puente10 + 0.1, [-0.35, 0.3, 1.25], [-1.0, 0.2, -0.2], 36, -0.04],
    [K.edificio10 + 0.3, [-0.5, 0.45, 1.05], [-1.0, 0.25, -0.2], 34],
    [K.colegio + 0.1, [0.55, 0.62, 2.6], [-0.38, 0.45, 0.72], 33],
    [K.exclusiva + 0.2, [0.45, 0.62, 2.45], [-0.36, 0.48, 0.74], 32],
    [K.dijo + 0.15, [0.42, 0.68, 2.35], [-0.35, 0.5, 0.75], 33, 0.02],
    [K.no10 + 0.2, [0.45, 0.6, 2.45], [-0.35, 0.3, 0.75], 34],
    // la casa: fórmulas alrededor, la ventana y quien duerme dentro
    [K.ley11 + 0.3, [2.3, 0.62, 1.85], [1.55, 0.2, 0.38], 34],
    [K.mejor + 0.2, [2.0, 0.5, 1.6], [1.58, 0.18, 0.4], 33],
    [K.mira11b + 0.2, [1.7, 0.22, 1.0], [HW.x - 0.01, HW.y, 0.35], 33],
    [K.dormir - 0.12, [HW.x, HW.y + 0.008, HW.z + 0.12], [HW.x - 0.02, HW.y - 0.01, 0.3], 36],
    [K.dormir + 0.12, [HW.x + 0.02, HW.y + 0.035, HW.z - 0.035], [1.56, 0.07, 0.3], 52],
    [K.dentro11 + 0.3, [HW.x + 0.03, HW.y + 0.035, HW.z - 0.05], [1.555, 0.075, 0.295], 52],
    [K.caminos12 + 0.1, [HW.x + 0.03, HW.y + 0.035, HW.z - 0.055], [1.555, 0.078, 0.295], 52],
    [K.arquitectura12 + 0.25, [HW.x, HW.y + 0.01, HW.z + 0.1], [1.56, 0.12, 0.3], 36],      // salimos por la ventana
    [K.mandaselo + 0.2, [3.0, 0.95, 0.85], [0.2, 0.15, 0.0], 38],
    [END - LOOP_D, [3.6, 1.35, 1.0], [0.0, 0.15, -0.1], 38],
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ' (' + CK[i][0].toFixed(2) + ')');
}
function blendCam(A, B, w) { return { p: A.p.clone().lerp(B.p, w), l: A.l.clone().lerp(B.l, w), f: lerp(A.f, B.f, w), roll: lerp(A.roll, B.roll, w) }; }
function camAt(t) {
  let c = camKeys(t, CK);
  const we = win(t, END - LOOP_D, LOOP_D - 0.04); if (we > 0) c = blendCam(c, camKeys(t - END, CK_OPEN), we);   // golpe de vuelta al principio (bucle)
  let sh = 0; for (const [t0, a] of [[K.no1 + 0.02, 0.012], [K.ley2, 0.006], [K.supremo2 + 0.08, 0.008], [K.caiga, 0.004], [K.estructuras + 0.3, 0.008], [K.dijo + 0.04, 0.01], [K.no8, 0.004]]) if (t > t0) sh += a * Math.exp(-(t - t0) * 9);
  if (sh > 1e-4) { const k = c.p.distanceTo(c.l); c.p.x += sh * k * Math.sin(t * 97); c.p.y += sh * k * Math.cos(t * 83); }
  return c;
}
function rigFollow(l, t, camP) {
  const R = S.rig;
  R.key.position.set(l.x - 1.6, Math.max(l.y, 0) + 3.0, l.z + 2.2); R.key.target.position.set(l.x, Math.max(-1, l.y - 0.4), l.z); R.key.intensity = 18; R.key.target.updateMatrixWorld();
  R.rimC.position.set(l.x - 2.2, l.y + 0.6, l.z - 1.8); R.rimW.position.set(l.x + 2.2, l.y + 0.7, l.z - 1.6); R.fill.position.set(l.x + 0.6, l.y + 1.4, l.z + 3.0);
  // dentro de la casa: la lámpara de la mesilla
  const inside = S.house.lamp ? clamp(1 - (camP.distanceTo(wpos(S.house.lamp)) - 0.25) / 0.6) : 0;
  if (S.house.lamp) wpos(S.house.lamp, R.houseL.position); R.houseL.intensity = 0.55 * inside;
}
