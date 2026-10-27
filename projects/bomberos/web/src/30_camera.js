// ---------------------------------------------------------------- cámara: cascos (0,·,0) → multitudes (0,·,-12) → examen (9,·,-20) → criba (18,·,-15) → app (4,·,-32)
// zonas lejos unas de otras: cada vuelo atraviesa el campo de brasas y deja estelas
let CK = [], CK_OPEN = [];
function buildCam() {
  // primer segundo: pegados al escudo del casco de arriba, entre brasas; luego se abre la rejilla de diez
  CK_OPEN = [
    [-1.5, [-0.15, 1.9, 0.68], [-0.2, 1.8, 0.08], 32, 0.03],
    [0.0, [-0.16, 1.89, 0.56], [-0.2, 1.8, 0.08], 32, 0.05],
    [0.6, [-0.11, 1.72, 0.95], [-0.17, 1.68, 0.0], 32, 0.02],
  ];
  CK = [
    ...CK_OPEN,
    [K.diez, [0.1, 1.36, 4.6], [0, 1.3, 0], 32, 0.01],
    [K.quedan, [0.05, 1.34, 4.8], [0, 1.3, 0], 32],
    [K.plaza + 0.2, [0.25, 1.3, 4.4], [0, 1.28, 0], 32, -0.01],
    // Madrid: 1.285 figuras para 267 plazas
    [K.ultima + 0.15, [-2.4, 4.6, -7.6], [-2.4, 0, -12.3], 32, 0.03],
    [K.doscientas + 0.4, [-2.37, 4.4, -7.9], [-2.4, 0, -12.32], 32],
    // València y el País Vasco
    [K.valencia + 0.05, [0, 5.0, -7.3], [0, 0, -12.35], 32, -0.02],
    [K.noventa + 0.35, [0.03, 4.8, -7.55], [0, 0, -12.35], 32],
    [K.pais + 0.05, [2.4, 4.6, -7.6], [2.4, 0, -12.3], 32, 0.02],
    [K.examen3 + 0.2, [2.37, 4.4, -7.9], [2.4, 0, -12.32], 32],
    // ¿por qué? se eleva sobre las tres
    [K.porque + 0.15, [0.3, 7.0, -6.0], [0, 0, -12.9], 40],
    [K.gente + 0.3, [0.2, 8.0, -6.6], [0, 0, -13.2], 42],
    // el examen
    [K.uno + 0.1, [9.2, 1.2, -15.4], [9, 1.05, -20], 32, 0.02],
    [K.decenas, [9.12, 1.15, -15.6], [9, 1.05, -20], 32],
    [K.fallo, [9.05, 1.12, -15.75], [8.98, 1.05, -20], 32],
    [K.resta + 0.5, [9.1, 1.12, -15.7], [9.0, 1.05, -20], 32],
    // el tiempo
    [K.tiempo + 0.1, [10.2, 1.3, -17.45], [10.05, 1.05, -19.85], 32, -0.02],
    [K.contestar + 0.3, [10.12, 1.25, -17.8], [10.05, 1.05, -19.85], 32],
    // leer ≠ entrenar: plano general de temario, examen y reloj
    [K.tres + 0.1, [9.18, 1.55, -11.0], [9.2, 1.0, -20], 32],
    [K.examen7 + 0.3, [9.22, 1.53, -11.4], [9.2, 1.0, -20], 32],
    // la criba: la puerta del test y, al fondo, la prueba física
    [K.duro + 0.1, [18.9, 1.5, -10.9], [18.3, 0.9, -17.5], 32, 0.02],
    [K.cae, [18.1, 2.4, -11.6], [18, 0.2, -15.4], 34],
    [K.test8 + 0.3, [17.9, 2.6, -11.9], [18, 0.2, -15.6], 34],
    // la app: el nombre, la ruleta, la pregunta, el duelo y la IA
    [K.existe + 0.2, [4, 1.5, -28.3], [4, 1.45, -31.7], 32, 0.03],
    [K.opositores9, [4, 1.5, -28.5], [4, 1.45, -31.7], 32],
    [K.giras + 0.1, [4.05, 1.45, -27.8], [4, 1.35, -32], 32],
    [K.haces + 0.1, [4.1, 1.42, -29.5], [4, 1.36, -31.75], 32],
    [K.compites + 0.2, [4.0, 1.25, -26.7], [4, 0.85, -32.2], 32],
    [K.inteligencia, [4.15, 1.25, -26.8], [4.13, 0.88, -32.2], 32],
    [K.estudias + 0.2, [3.9, 1.2, -26.9], [4, 0.85, -32.2], 32, -0.02],
    [K.dia11, [4.0, 1.25, -26.7], [4, 0.88, -32.2], 32],
    // cierre: la marca
    [K.bomberados12 + 0.15, [4, 1.5, -28.4], [4, 1.42, -31.7], 32],
    [END - 0.75, [4, 1.5, -28.6], [4, 1.42, -31.7], 32],
  ];
}
function blendCam(A, B, w) { return { p: A.p.clone().lerp(B.p, w), l: A.l.clone().lerp(B.l, w), f: lerp(A.f, B.f, w), roll: lerp(A.roll, B.roll, w) }; }
function camAt(t) {
  let c = camKeys(t, CK);
  const we = win(t, END - 0.72, 0.62); if (we > 0) c = blendCam(c, camKeys(t - END, CK_OPEN), we);   // golpe rápido de vuelta a los cascos (bucle)
  let sh = 0; for (const [t0, a] of [[K.quedan + 0.3, 0.012], [K.setenta, 0.006], [K.fallo, 0.006], [K.contestar, 0.008], [K.cae, 0.01], [K.bomberados9, 0.008], [K.bomberados12, 0.008]]) if (t > t0) sh += a * Math.exp(-(t - t0) * 8);
  if (sh > 1e-4) { c.p.x += sh * Math.sin(t * 97); c.p.y += sh * Math.cos(t * 83); }
  return c;
}
// las luces acompañan a lo que se mira (siempre las mismas 4)
function rigFollow(l) { const R = S.rig; R.key.position.set(l.x - 1.7, Math.max(l.y, 0.6) + 3.0, l.z + 2.1); R.key.target.position.set(l.x, Math.max(0, l.y - 0.6), l.z); R.key.target.updateMatrixWorld();
  R.rimC.position.set(l.x - 2.3, 0.6, l.z - 1.9); R.rimW.position.set(l.x + 2.3, 0.7, l.z - 1.7); R.fill.position.set(l.x + 0.6, l.y + 1.4, l.z + 3.2); }
