// ---------------------------------------------------------------- UN SOLO PLANO, SIN CORTES: la cámara no para; se acerca a la boca del callejón, sube, baja hasta el testigo,
// vuelve al coche y al protagonista… y acaba donde empezó (bucle).
let CK = [];
function buildCam() {
  const k = (t, p, l, f = 40) => [t, p, l, f];
  const C0 = [[9.0, 2.4, 0.9], [0, 1.5, -0.3], 40];
  CK = [
    // A · calle abajo, hacia la puesta de sol: la ropa sola rodeada de focos; el maniquí se escabulle hacia la cámara
    k(0, ...C0), k(5.5, [7.6, 2.25, 0.7], [0, 1.45, -0.2], 40),
    // B · vuelve a su ropa; llega Lucía (Jason y Lucía)
    k(7.6, [10.6, 3.5, 1.5], [0.4, 1.4, -0.5], 40), k(9.7, [6.9, 2.2, 1.2], [0.4, 1.4, 0.3], 40),
    // C · GTA 5: corre al callejón y se esconde; la cámara le sigue hasta la boca del callejón mientras pasa la patrulla
    k(10.9, [8.0, 3.6, 2.2], [3.0, 1.2, -4.5], 44), k(11.9, [6.3, 5.0, 2.0], [5.9, 0.9, -8.6], 44), k(14.4, [6.0, 5.4, 1.7], [5.9, 0.8, -9.0], 44),
    // D · sube y vuelve a mirar calle abajo: las seis estrellas sobre el cielo y, debajo, las pistas
    k(15.4, [8.4, 5.7, 2.6], [2.6, 2.0, -3.2], 43), k(16.5, [10.4, 5.0, 1.4], [0.4, 2.6, -1.0], 41), k(18.7, [11.0, 2.6, 0.5], [0, 2.1, -0.2], 40),
    // E · las pistas: coche, ropa, aspecto, cámara
    k(24.0, [9.6, 2.5, 0.2], [0, 2.0, -0.2], 40),
    // F · el testigo y la alarma (la joyería, a la derecha)
    k(25.5, [1.8, 2.5, -0.8], [-3.5, 1.9, -6.0], 42), k(28.9, [0.6, 2.7, -1.6], [-3.3, 2.5, -6.6], 42),
    // G · vuelve: cada pista se puede borrar
    k(30.6, [9.2, 2.5, 0.6], [0.5, 1.9, -0.4], 40),
    // H · cambia de coche; gafas y gorra
    k(32.0, [9.6, 2.5, 0.5], [2.8, 1.0, -0.7], 40), k(33.7, [4.6, 1.95, 0.6], [0, 1.5, 0], 40),
    // I · la patrulla pasa de largo
    k(36.2, [6.4, 2.3, 1.0], [0, 1.4, -0.5], 40), k(37.3, [7.6, 2.5, 0.9], [0.3, 1.5, -0.2], 40),
    // J · buscan a una pareja… sepáralos
    k(39.3, [12.5, 3.2, 0.4], [1.8, 1.3, -0.6], 40), k(41.2, [13.8, 3.4, 0.2], [2, 1.2, -0.7], 40),
    // K · ¿huyes o te cambias?; vuelven las patrullas: como al principio
    k(43.2, [12.0, 3.0, 0.6], [0.5, 1.5, -0.5], 40), k(45.6, [9.8, 2.6, 0.85], [0, 1.5, -0.3], 40), k(END, ...C0),
  ];
  S.C0 = C0;
}
function camAt(t) { if (t <= 1e-6 || t >= END - 1e-6) { const c = S.C0; return { p: v3(...c[0]), l: v3(...c[1]), f: c[2], roll: 0 }; } return camKeys(t, CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { let f = 0; for (const t0 of [(TL.swap0 + TL.swap1) / 2, TL.merge1]) if (t > t0) f += 0.05 * Math.exp(-(t - t0) / 0.1); return f; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l); return { focus: f, scale: (f < 8 ? 0.34 : 0.2) * f }; }
