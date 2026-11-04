// ---------------------------------------------------------------- cámara: un plano continuo por la maqueta (sin cortes) que acaba donde empieza (bucle)
let CKS = [];
let NOWL = new THREE.Vector3();
function buildCam() {
  const A0 = [[32.0, 0.6, 7.2], [13.0, -4.1, -1.2], 40];                  // gancho: desde el banco, la losa y el túnel iluminado hasta la casa del «césped»
  CKS = [
    [0, ...A0],
    [K.metros1, [30.6, 0.1, 6.4], [12.0, -4.2, -1.2], 40],
    [K.camara1 - 0.1, [27.0, -0.4, 6.8], [22.5, -2.0, -2.6], 40],
    [K.banco1 + 0.25, [28.5, 4.0, 12.5], [23.0, 1.5, -2.5], 40],
    // 2: Fortaleza, 2005: toda la calle de noche
    [K.brasil2, [30.5, 1.6, 9.5], [21.5, 5.0, -2.4], 38],
    [K.alquilan3 - 0.1, [14.0, 4.5, 14.0], [2.0, 1.5, -3.0], 38],
    // 3–4: la casa del «césped» y la tierra que sale
    [K.casa3 + 0.3, [1.2, 3.0, 9.8], [-4.0, 2.0, -3.5], 38],
    [K.cesped3, [0.8, 2.6, 9.4], [-3.3, 2.3, -2.4], 38],
    [K.vender4, [2.2, 3.0, 10.4], [-2.4, 1.2, -3.0], 38],
    [K.sale4, [5.5, 3.8, 9.5], [3.2, 0.6, -6.0], 38],
    // 5: bajo la avenida, el túnel avanza
    [K.bajo5 + 0.25, [-4.0, 1.0, 9.0], [6.0, -3.8, -1.2], 40],
    [K.vigas5, [-1.5, -2.6, 5.0], [8.0, -4.4, -1.0], 40],
    [K.ventilacion5, [6.0, -3.4, 4.6], [16.0, -4.4, -1.0], 40],
    // 6: el último obstáculo: la losa de 1,10 m
    [K.obstaculo6, [26.0, -3.2, 5.5], [20.0, -3.9, -1.0], 40],
    [K.hormigon6, [24.8, -3.5, 3.8], [22.0, -3.5, -0.8], 38],
    // 7: la perforación y la capa fina
    [K.martillos7, [24.0, -4.1, 2.6], [23.0, -3.4, -0.6], 38],
    [K.capa7, [23.9, -3.4, 2.3], [23.0, -3.0, -0.6], 38],
    [K.esperan7 + 0.3, [24.2, -3.6, 2.8], [23.0, -3.2, -0.6], 38],
    // 8: el viernes, con el banco cerrado; rompen la capa y entran
    [K.rompen8 + 0.4, [24.3, -3.5, 2.7], [23.0, -2.9, -0.7], 38],
    [K.entran8 + 0.25, [23.6, -1.2, 3.2], [23.0, -1.3, -1.8], 38],
    // 9–10: dentro de la cámara: cámaras y sensores; los billetes de 50
    [K.camaras9, [24.6, -1.7, 4.4], [20.0, -0.5, -2.6], 40],
    [K.funcionan9, [24.0, -1.6, 4.6], [19.6, -0.6, -3.6], 40],
    [K.billetes10, [27.6, -1.3, 2.8], [25.4, -2.0, -3.8], 38],
    [K.rastrear10, [27.9, -1.0, 3.2], [25.6, -2.1, -3.7], 38],
    // 11: salen por el túnel
    [K.sacan11 + 0.2, [25.6, 0.1, 4.8], [23.0, -2.6, -0.9], 40],
    [K.billetes11, [21.4, -3.5, 3.4], [14.0, -4.4, -1.0], 40],
    [K.millones11, [26.5, -2.0, 6.4], [12.0, -4.3, -1.0], 40],
    // 12: el lunes abren la cámara
    [K.lunes12, [26.0, -0.6, 7.4], [21.8, -1.4, -4.0], 38],
    [K.agujero12, [25.0, -0.6, 5.2], [22.9, -2.4, -1.2], 38],
    [K.agujero12 + 0.9, [24.6, -0.8, 4.6], [22.9, -2.6, -1.0], 38],
    // 13–14: el mayor robo de Brasil… ¿dónde está?
    [K.mayor13 + 0.3, [34.0, 6.5, 13.0], [10.0, -2.2, -2.0], 40],
    [K.dinero13, [33.5, 5.0, 11.5], [10.5, -2.6, -1.8], 40],
    [END - 1.6, [33.0, 3.0, 10.0], [12.0, -3.5, -1.2], 40],
    [END, ...A0],
  ];
}
function camAt(t) {
  const st = camKeys(t, CKS);
  for (const [t0, a0] of [[TT.brk, 0.035], [TT.drill0, 0.012]]) { const u = t - t0; if (u > 0 && u < (t0 === TT.drill0 ? TT.drill1 - TT.drill0 : 0.5)) { const a = a0 * (t0 === TT.drill0 ? 1 : Math.exp(-u * 8)); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; } }
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[TT.brk, 0.12], [K.abren12 + 0.25, 0.05]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09);
  return f;
}
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t; NOWL.copy(st.l);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 7, 0.5, 2.6);
  rigAt(c, yaw, k, 0.55, 0.6);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.22;
  stageAt2(t);
  post.uniforms.fade.value = 0;
}
