// ---------------------------------------------------------------- cámara: claves + giro cenital (frase 4) + vuelta al primer plano (bucle)
let CK = [], CK_OPEN = [];
function buildCam() {
  // distancias pensadas para vertical (9:16): a 32° caben de ancho ≈ 0,32 × distancia
  CK_OPEN = [
    [-1.4, [1.2, 2.6, 7.8], [0, 0.95, 0], 34, 0.06],
    [0.0, [2.3, 1.85, 4.9], [0, 0.9, 0], 32, 0.035],
    [0.9, [2.0, 1.55, 3.85], [0, 0.85, 0], 32, 0.0],
    [K.cada, [1.85, 1.4, 3.55], [0, 0.75, 0], 32, 0],
  ];
  CK = [
    ...CK_OPEN,
    // cae y se apoya: la cámara baja con él y gira alrededor
    [K.apoyas + 0.2, [2.2, 2.25, 3.4], [0, 0.12, 0], 32],
    [K.y2 + 0.3, [1.15, 2.35, 3.85], [0, 0.15, 0], 32],
    [K.final + 0.25, [-1.1, 2.25, 3.7], [0, 0.15, 0], 32, -0.03],
    // «el truco»: picado rápido al cargador (el móvil sale disparado hacia arriba)
    [K.dentro - 0.1, [0.85, 1.25, 2.0], [0, 0.05, 0], 32, 0.06],
    [K.bobina3, [0.5, 1.45, 1.75], [0, 0.04, 0], 32],
    [K.su, [0.12, 1.75, 1.0], [0, 0.04, 0], 34],
    [K.crea - 0.15, [0.3, 1.9, 0.25], [0, 0.04, 0], 36],
    // el campo sube y el móvil baja hasta él (vista de perfil)
    [K.campo5 + 0.3, [2.4, 0.75, 3.0], [0, 0.3, 0], 32],
    [K.bobina5 + 0.2, [2.9, 0.55, 3.0], [0, 0.42, 0], 32],
    [K.corriente5 + 0.2, [2.6, 0.5, 3.4], [0, 0.44, 0], 32],
    // Faraday: de frente (el anillo está en el plano XY)
    [K.induccion + 0.3, [0.9, 0.55, 4.3], [0, 0.4, 0], 32],
    [K.faraday + 0.4, [-0.5, 0.48, 4.25], [0, 0.4, 0], 32],
    // «parece que carga por contacto»: a ras del borde
    [K.contacto + 0.05, [2.2, 0.45, 1.9], [0.15, 0.12, 0.05], 30],
    [K.realidad, [1.6, 0.3, 1.9], [0.05, 0.1, 0], 30],
    // corte transversal: de frente al corte (z = 0)
    [K.dos7, [0.2, 0.16, 2.3], [0, 0.085, 0], 28],
    [K.tocan + 0.2, [0.05, 0.1, 1.25], [0, 0.08, 0], 26],
    [K.forma, [-0.3, 0.25, 1.8], [0, 0.09, 0], 28],
    // la prueba: se aleja mucho y sube (barras)
    [K.prueba + 0.25, [1.9, 1.8, 5.8], [-0.25, 1.2, -0.6], 32],
    [K.mas9, [2.2, 2.0, 6.2], [-0.25, 1.25, -0.7], 32],
    [K.aun + 0.4, [1.9, 1.95, 5.9], [-0.2, 1.3, -0.7], 32],
    // imanes: arriba, en picado
    [K.imanes, [1.2, 2.4, 2.6], [0.05, 0.08, 0], 32],
    [K.centran + 0.3, [0.9, 2.2, 2.3], [0, 0.1, 0], 32],
    // «¿y qué le dice?»: baja en picado hasta la altura del hueco entre las dos bobinas (se acerca y abre el angular a la vez)
    [K.y11 + 0.25, [0.6, 0.3, 1.05], [0, 0.22, 0], 46],
    [K.el11 + 0.3, [1.5, 1.45, 2.6], [0, 0.25, 0], 34],
    [K.compatible, [0.95, 1.5, 2.75], [0, 0.25, 0], 34],
    [K.bien, [-0.75, 1.4, 2.7], [0, 0.25, 0], 34],
    // se aleja para ver el campo con los golpecitos
    [K.mismo + 0.35, [-1.5, 1.25, 3.2], [0, 0.25, 0], 34],
    [K.morse + 0.3, [2.0, 1.0, 3.0], [0, 0.15, 0], 32],
    // la moneda
    [K.algo, [2.4, 1.45, 3.0], [0.03, 0.12, 0.03], 30],
    [K.moneda, [1.5, 1.0, 1.95], [0.05, 0.11, 0.05], 30],
    [K.corta, [1.42, 0.95, 1.85], [0.04, 0.11, 0.04], 30],
    [K.corta + 0.6, [2.0, 1.3, 2.7], [0.03, 0.12, 0.02], 30],
    // vuelve a apoyarse y «están hablando»
    [K.apoyes + 0.2, [2.1, 1.55, 3.4], [0, 0.2, 0], 32],
    [K.hablando + 0.3, [2.4, 1.4, 3.9], [0, 0.35, 0], 32],
    // «¿con cable o sin cable?»: plano abierto con el cable USB a la izquierda
    [K.con15, [0.25, 1.5, 5.0], [-0.25, 0.35, 0], 32],
    [K.cable15b + 0.3, [0.5, 1.6, 5.3], [-0.2, 0.4, 0], 32],
  ];
}
function spinCam(t) {    // casi cenital sobre la bobina, girando cada vez más deprisa con los cambios de sentido
  const a = 1.2 + 0.35 * (t - K.su) + 0.55 * Math.pow(Math.max(0, t - K.cambia), 1.7), r = 0.36;
  return { p: v3(r * Math.cos(a), 1.9, r * Math.sin(a)), l: v3(0, 0.044, 0), f: 36, roll: 0 };
}
function blendCam(A, B, w) { return { p: A.p.clone().lerp(B.p, w), l: A.l.clone().lerp(B.l, w), f: lerp(A.f, B.f, w), roll: lerp(A.roll, B.roll, w) }; }
function camAt(t) {
  let c = camKeys(t, CK);
  const ws = win(t, K.su - 0.2, 0.5) * (1 - win(t, K.crea - 0.4, 0.45)); if (ws > 0) c = blendCam(c, spinCam(t), ws);
  const we = win(t, END - 1.3, 1.0); if (we > 0) c = blendCam(c, camKeys(t - END, CK_OPEN), we);
  // sacudidas: aterrizajes, imanes y el corte
  let sh = 0; for (const [t0, a] of [[K.apoyas + 0.16, 0.006], [K.contacto + 0.1, 0.004], [K.centran + 0.16, 0.008], [K.corta, 0.012], [K.apoyes + 0.12, 0.005]]) if (t > t0) sh += a * Math.exp(-(t - t0) * 9);
  if (sh > 1e-4) { c.p.x += sh * Math.sin(t * 97); c.p.y += sh * Math.cos(t * 83); c.l.x += sh * 0.5 * Math.sin(t * 71); }
  return c;
}
