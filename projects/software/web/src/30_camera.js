// ---------------------------------------------------------------- cámara: el ring de frente → alrededor del círculo de estaciones (por fuera, mirando hacia dentro) → vuelta al ring.
// Sin cortes: todo es un vuelo continuo (flujo óptico). El último fotograma es el primero (bucle).
let CK = [], CUTS = [];
const stCam = (a, dist, h, dx = 0) => { const p = stP(a, dist, h).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const stLook = (a, y, dx = 0, r = R_ST) => { const p = stP(a, r, y).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
function buildCam() {
  const { C, D, E, F, G, H, I, J } = ANG, T0 = [0.08, 0.62, 2.85], L0 = [0, 0.5, 0], TA = [0.14, 0.64, 2.98];
  CK = [
    [-1.0, TA, L0, 32], [0.0, T0, L0, 32],
    [K.rivales, [0.0, 0.58, 2.45], [0, 0.48, 0], 32],                                                  // choque de guantes
    [K.boe1 - 0.25, [0.0, 0.95, 2.45], [0, 0.42, 0], 33],                                             // cae el BOE
    [K.parte + 0.1, [-0.25, 0.62, 1.75], [-0.3, 0.5, 0], 31], [K.otra + 0.2, [-0.18, 0.62, 1.9], [-0.25, 0.5, 0], 31],   // el código entra en el chip
    [K.final2, [0.0, 0.85, 2.3], [0, 0.5, 0], 33], [K.ley2 + 0.2, [0.0, 0.95, 2.0], [0, 0.6, 0], 33], [K.ninguna + 0.1, [0.0, 0.8, 2.3], [0, 0.5, 0], 33],
    [K.dicen3, [-0.55, 0.66, 1.95], [-0.3, 0.52, 0], 32], [K.solo + 0.1, [-0.45, 0.62, 1.8], [-0.05, 0.5, 0], 32],
    [K.funciona, stCam(C, R_CAM + 0.4, 1.3), stLook(C, 0.5), 34], [K.ordenador3 + 0.2, stCam(C, R_CAM - 0.7, 0.9), stLook(C, 0.38), 34],
    [K.dentro + 0.3, stCam(C, R_CAM - 0.6, 0.95, 0.05), stLook(C, 0.42, 0.0, R_ST + 0.4), 38],
    [K.vosotros4, stCam(C, R_CAM - 0.6, 0.92), stLook(C, 0.4, 0, R_ST + 0.3), 37], [K.ordenador4 + 0.1, stCam(C, R_CAM - 0.2, 0.95), stLook(C, 0.36), 34],
    [K.construimos, stCam(D, R_CAM - 0.3, 1.1), stLook(D, 0.82), 34], [K.programas + 0.3, stCam(D, R_CAM - 0.8, 0.8), stLook(D, 0.5), 34],
    [K.millones + 0.45, stCam(D, R_CAM + 0.7, 2.3), stLook(D, 0.0, 0, R_ST - 1.0), 40],
    [K.generalista, stCam(E, R_CAM + 0.4, 1.3), stLook(E, 0.85), 36], [K.circuitos, stCam(E, R_CAM - 0.05, 1.0), stLook(E, 0.85), 35], [K.software5 + 0.3, stCam(E, R_CAM + 0.1, 1.05), stLook(E, 0.86), 35],
    [K.grano, stCam(F, R_CAM - 0.3, 1.45), stLook(F, 1.2), 34], [K.arquitectura + 0.1, stCam(F, R_CAM - 0.4, 1.2), stLook(F, 0.95), 34], [K.pruebas + 0.1, stCam(F, R_CAM - 0.4, 0.9), stLook(F, 0.6), 34],
    [K.entregan, stCam(F, R_CAM - 0.25, 0.75), stLook(F, 0.4), 34], [K.semanas + 0.3, stCam(F, R_CAM + 0.2, 0.95), stLook(F, 0.7), 36],
    [K.y2025, stCam(G, R_CAM + 0.3, 1.0), stLook(G, 0.7), 36], [K.n1 - 0.2, stCam(G, R_CAM - 0.1, 0.9), stLook(G, 0.6), 34], [K.ni7 - 0.2, stCam(G, R_CAM - 0.2, 1.05), stLook(G, 0.85), 34],
    [K.decimas + 0.35, stCam(G, R_CAM - 1.0, 0.95, 0.01), stLook(G, 0.9, 0.01), 31],
    [K.boe8 + 0.1, stCam(H, R_CAM + 0.2, 1.1), stLook(H, 0.8), 36], [K.cinco, stCam(H, R_CAM - 0.2, 1.05), stLook(H, 0.95), 34], [K.informatica8 + 0.3, stCam(H, R_CAM - 0.5, 1.1), stLook(H, 1.05), 33],
    [K.mitad + 0.2, stCam(I, R_CAM + 0.1, 0.8), stLook(I, 0.55), 35], [K.n48, stCam(I, R_CAM - 0.2, 0.9), stLook(I, 0.65), 34], [K.especialidad9 + 0.4, stCam(I, R_CAM - 0.3, 0.95), stLook(I, 0.7), 34],
    [K.ley10 + 0.1, stCam(J, R_CAM - 0.7, 1.05), stLook(J, 0.08), 34], [K.nada + 0.3, stCam(J, R_CAM - 0.95, 1.05), stLook(J, 0.04, -0.05), 34],
    [K.profesion, stCam(J, R_CAM - 0.7, 0.85), stLook(J, 0.42), 34], [K.otra11 + 0.2, stCam(J, R_CAM - 0.6, 0.9), stLook(J, 0.48), 34],
    [K.titulo12 + 0.1, stCam(J, R_CAM - 0.8, 0.75), stLook(J, 0.42, -0.1), 34], [K.colegio + 0.15, stCam(J, R_CAM - 0.8, 0.72), stLook(J, 0.3, 0.12), 34],
    [K.pelea + 0.2, [0.45, 1.2, 3.0], [0, 0.45, 0], 34], [K.quien, [0.2, 0.72, 1.6], [0, 0.42, 0], 33], [K.hacerlo + 0.2, [0.12, 0.64, 1.38], [0, 0.42, 0], 32],
    [K.software14 + 0.1, [0.2, 0.7, 2.2], [0.12, 0.48, 0], 33], [K.informatica14 + 0.1, [-0.2, 0.7, 2.2], [-0.12, 0.48, 0], 33], [K.comentarios + 0.2, [0.0, 0.8, 2.6], [0, 0.5, 0], 33],
    [END - 1.0, TA, L0, 32], [END, T0, L0, 32],
  ];
}
function camAt(t) { return camKeys(t, CK); }
function prevT(t, dt) { return t - dt; }
