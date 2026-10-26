// ---------------------------------------------------------------- cámara: zonas lejos unas de otras para que los vuelos dejen estelas
let CK = [], CK_OPEN = [];
function buildCam() {
  CK_OPEN = [
    [-1.5, [1.4, 2.0, 12.5], [0, 1.55, 0], 34, 0.05],
    [0.0, [0.7, 1.75, 8.6], [0, 1.55, 0], 32, 0.02],
    [1.0, [0.4, 1.65, 7.0], [0, 1.55, 0], 32, 0],
  ];
  CK = [
    ...CK_OPEN,
    [K.la1, [-0.3, 1.6, 6.8], [0, 1.55, 0], 32],
    [K.y2 - 0.05, [-0.45, 1.6, 6.6], [0, 1.55, 0], 32],
    // vuelo a la arena
    [K.hay2 + 0.1, [2.3, 1.75, -2.3], [0, 0.95, -7], 32, -0.04],
    [K.nunca, [0.9, 1.9, -1.6], [0.1, 1.15, -7], 32],
    [K.nivel + 0.25, [0.6, 1.85, -1.9], [0.1, 1.15, -7], 32],
    [K.tienen + 0.45, [0.35, 1.3, -4.6], [0, 1.05, -7.4], 32],
    [K.bando, [-0.5, 1.2, -4.3], [0, 1.0, -7.4], 32, 0.03],
    // los de FP / los de la carrera
    [K.dos4, [-2.6, 1.5, -3.0], [-0.85, 0.9, -7], 32],
    [K.trabajar, [-2.4, 1.4, -2.8], [-0.85, 0.9, -7], 32],
    [K.cuatro, [2.8, 1.85, -2.6], [0.95, 1.2, -7], 32],
    [K.teoria + 0.3, [2.95, 1.95, -2.3], [1.05, 1.25, -7.1], 32],
    [K.responden, [1.8, 1.7, -2.6], [0.3, 1.15, -7], 32],
    [K.herramientas, [-1.9, 1.6, -2.9], [-0.62, 1.25, -7], 32],
    // «lo que hay debajo»: baja por debajo del suelo
    [K.debajo, [-1.0, -0.35, -4.3], [-0.62, -0.55, -7], 38],
    // vuelo a los datos: títulos y profesiones reguladas
    [K.programar, [7.75, 1.55, -7.9], [7, 1.5, -11.6], 32, 0.03],
    [K.titulo, [7.55, 1.6, -7.7], [7, 1.5, -11.6], 32],
    [K.ingenieria + 0.2, [7.35, 1.55, -5.8], [7, 1.5, -12.4], 32],
    [K.punto8 + 0.3, [6.8, 1.5, -6.0], [7, 1.5, -12.4], 32],
    // vuelo a las oposiciones
    [K.oposiciones + 0.1, [15.3, 1.5, -1.4], [14.15, 1.55, -7], 32, -0.03],
    [K.grupo9, [15.2, 2.2, -1.5], [14.2, 2.3, -7], 32],
    [K.con9 + 0.1, [15.1, 1.6, -1.6], [14.2, 1.6, -7], 32],
    [K.b9 + 0.1, [15.0, 1.9, -1.6], [14.3, 1.9, -7], 32],
    [K.master, [16.6, 1.15, -2.9], [15.7, 0.8, -6.65], 32],
    [K.punto11 + 0.3, [16.4, 1.3, -2.7], [15.6, 0.85, -6.7], 32],
    // vuelta a la arena: ¿quién tiene razón?
    [K.quien + 0.1, [0.4, 1.35, -4.3], [0, 1.05, -7.4], 32, 0.03],
    [K.antes - 0.75, [0.2, 1.38, -4.15], [0, 1.05, -7.4], 32],
    [K.antes, [-2.5, 1.7, -2.6], [-1.15, 1.4, -7], 32],
    [K.fp13 + 0.15, [-2.5, 2.4, -2.6], [-1.15, 2.4, -7], 32],
    [K.puertas, [2.6, 2.0, -2.8], [1.15, 1.55, -7], 32],
    [K.carrera13, [2.5, 2.05, -2.6], [1.15, 1.6, -7], 32],
    // la jugada maestra: trofeo de los dos colores y el puente a la universidad
    [K.maestra + 0.2, [0.45, 1.45, -3.9], [0, 1.05, -7.4], 32],
    [K.primero + 0.2, [-1.6, 2.2, -0.6], [0.3, 0.9, -8.0], 32],
    [K.selectividad, [0.2, 1.9, -1.0], [0.35, 0.95, -8.3], 32],
    [K.convalidado, [1.4, 1.8, -1.6], [0.6, 0.9, -7.8], 32],
    // ¿equipo FP o equipo carrera?
    [K.equipo + 0.15, [0.2, 2.3, -1.4], [0, 2.15, -7], 32],
    [K.comentarios, [-0.2, 2.35, -1.3], [0, 2.15, -7], 32],
  ];
}
function blendCam(A, B, w) { return { p: A.p.clone().lerp(B.p, w), l: A.l.clone().lerp(B.l, w), f: lerp(A.f, B.f, w), roll: lerp(A.roll, B.roll, w) }; }
function camAt(t) {
  let c = camKeys(t, CK);
  const we = win(t, END - 1.25, 0.95); if (we > 0) c = blendCam(c, camKeys(t - END, CK_OPEN), we);
  let sh = 0; for (const [t0, a] of [[K.nunca, 0.006], [K.exige, 0.012], [K.punto8, 0.008], [K.punto11, 0.008], [K.las, 0.01]]) if (t > t0) sh += a * Math.exp(-(t - t0) * 8);
  if (sh > 1e-4) { c.p.x += sh * Math.sin(t * 97); c.p.y += sh * Math.cos(t * 83); }
  return c;
}
// las luces acompañan a lo que se mira (siempre las mismas 4)
function rigFollow(l) { const R = S.rig; R.key.position.set(l.x - 1.7, Math.max(l.y, 0.6) + 3.0, l.z + 2.1); R.key.target.position.set(l.x, Math.max(0, l.y - 0.6), l.z); R.key.target.updateMatrixWorld();
  R.rimC.position.set(l.x - 2.3, 0.6, l.z - 1.9); R.rimW.position.set(l.x + 2.3, 0.7, l.z - 1.7); R.fill.position.set(l.x + 0.6, l.y + 1.4, l.z + 3.2); }
