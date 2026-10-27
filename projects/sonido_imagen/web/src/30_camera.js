// ---------------------------------------------------------------- cámara: el ojo (0,1.62,0), el duelo (0,0,-9) y «por dentro» (9,0,-16), lejos para que los vuelos dejen estelas
let CK = [], CK_OPEN = [];
const EYE_L = [0, 1.62, 0];
function buildCam() {
  // primer segundo: tan cerca de la pupila que solo se ven cubos; luego se descubre el ojo
  CK_OPEN = [
    [-1.5, [-0.1, 1.705, 0.7], [-0.11, 1.7, 0], 32, 0.02],
    [0.0, [-0.105, 1.702, 0.45], [-0.11, 1.7, 0], 32, 0.04],
    [0.7, [-0.08, 1.69, 0.85], [-0.09, 1.68, 0], 32, 0.02],
  ];
  CK = [
    ...CK_OPEN,
    [K.noventa, [0.08, 1.61, 2.2], EYE_L, 32, 0.01],
    [K.borrado - 0.05, [0.12, 1.62, 3.3], EYE_L, 32],
    [K.notado, [0.05, 1.62, 3.55], EYE_L, 32, -0.01],
    // al duelo: primero Sonido e Imagen, luego Teleco
    [K.borra + 0.2, [1.85, 1.45, -6.4], [0.62, 0.8, -9], 32, -0.03],
    [K.sonido2 + 0.4, [1.45, 1.3, -6.8], [0.62, 0.85, -9], 32],
    [K.teleco2 + 0.05, [-1.55, 1.5, -6.7], [-0.62, 0.9, -9], 32, 0.02],
    [K.facil2 + 0.3, [-1.3, 1.55, -6.9], [-0.62, 0.95, -9], 32],
    // ¿tienen razón? plano general de los tres bandos
    // munición: notas de corte
    [K.municion, [0, 1.65, -4.9], [0, 1.0, -10.4], 32],
    [K.teleco4, [-0.5, 1.5, -5.9], [-0.2, 0.95, -10.6], 32, 0.02],
    [K.nueve + 0.4, [-0.45, 1.7, -5.9], [-0.18, 1.3, -10.6], 32],
    [K.sonido4, [0.5, 1.5, -5.9], [0.2, 0.95, -10.6], 32, -0.02],
    [K.ocho + 0.15, [0.08, 1.7, -4.7], [0, 1.3, -10.6], 32],
    [K.ocho + 0.7, [0.04, 1.72, -4.5], [0, 1.3, -10.6], 32],
    // la tele: sin nosotros, ni una serie
    [K.responde, [2.0, 1.05, -7.2], [1.3, 0.82, -8.65], 32],
    [K.serie + 0.35, [1.85, 1.0, -7.4], [1.3, 0.82, -8.65], 32],
    // así es por dentro: señales → sala → emisión
    [K.asi + 0.25, [9.0, 1.6, -13.3], [9, 1.5, -16], 32, 0.03],
    [K.numeros + 0.35, [9.1, 1.75, -13.5], [9, 1.62, -16], 32],
    [K.acustica + 0.05, [12.0, 1.25, -13.6], [11.45, 0.75, -16.4], 32],
    [K.altavoces + 0.3, [12.45, 1.1, -14.0], [11.8, 0.65, -16.45], 32],
    [K.video9 + 0.05, [15.7, 1.05, -14.6], [14.6, 0.95, -17.2], 32],
    [K.millones, [15.6, 6.5, -11.0], [14.6, 0.0, -17.6], 36],
    [K.vez + 0.35, [15.2, 8.0, -10.2], [14.6, 0.0, -17.8], 38],
    // veredicto: vuelta al duelo
    [K.entonces + 0.25, [0, 1.9, -3.4], [0, 1.0, -9.6], 32],
    [K.facil10 + 0.3, [0.05, 1.85, -3.6], [0, 1.0, -9.6], 32],
    [K.nota + 0.05, [0, 2.5, -3.9], [0, 0.5, -8.7], 36],
    [K.dificil + 0.25, [0, 2.65, -3.6], [0, 0.45, -8.6], 36],
    [K.dos12 + 0.05, [0, 1.5, -5.4], [0, 1.0, -9.0], 32],
    [K.profesion, [0, 1.4, -6.2], [0, 1.1, -8.8], 32],
    [K.master + 0.1, [0.15, 1.35, -6.6], [0, 0.85, -10.5], 32],
    [K.facil13, [0, 1.55, -4.6], [0, 1.4, -9.35], 32],
    [K.apellido + 0.5, [0, 1.5, -4.75], [0, 1.38, -9.35], 32],
    // el truco: vuelta al ojo
    [K.truco14 + 0.3, [0.6, 1.66, 3.2], EYE_L, 32, 0.02],
    [K.luz, [2.35, 1.9, 2.45], EYE_L, 32],
    [K.menos + 0.3, [2.15, 1.8, 2.65], EYE_L, 32],
    [K.sonido16 + 0.05, [0.0, 0.62, 3.6], [0, 0.42, 0.75], 32],
    [K.tira + 0.4, [0.05, 0.6, 3.4], [0.05, 0.4, 0.75], 32],
    // vuelve a verlo: el ojo entero y otra vez hacia la pupila
    [K.ahora + 0.1, [0, 1.62, 3.45], EYE_L, 32],
    [K.leo, [0.02, 1.61, 2.7], [0.01, 1.6, 0], 32],
  ];
}
function blendCam(A, B, w) { return { p: A.p.clone().lerp(B.p, w), l: A.l.clone().lerp(B.l, w), f: lerp(A.f, B.f, w), roll: lerp(A.roll, B.roll, w) }; }
function camAt(t) {
  let c = camKeys(t, CK);
  const we = win(t, END - 1.25, 0.95); if (we > 0) c = blendCam(c, camKeys(t - END, CK_OPEN), we);
  let sh = 0; for (const [t0, a] of [[K.borrado, 0.012], [K.veriais, 0.006], [K.no13, 0.01], [K.apellido, 0.008], [K.tira, 0.008]]) if (t > t0) sh += a * Math.exp(-(t - t0) * 8);
  if (sh > 1e-4) { c.p.x += sh * Math.sin(t * 97); c.p.y += sh * Math.cos(t * 83); }
  return c;
}
// las luces acompañan a lo que se mira (siempre las mismas 4)
function rigFollow(l) { const R = S.rig; R.key.position.set(l.x - 1.7, Math.max(l.y, 0.6) + 3.0, l.z + 2.1); R.key.target.position.set(l.x, Math.max(0, l.y - 0.6), l.z); R.key.target.updateMatrixWorld();
  R.rimC.position.set(l.x - 2.3, 0.6, l.z - 1.9); R.rimW.position.set(l.x + 2.3, 0.7, l.z - 1.7); R.fill.position.set(l.x + 0.6, l.y + 1.4, l.z + 3.2); }
