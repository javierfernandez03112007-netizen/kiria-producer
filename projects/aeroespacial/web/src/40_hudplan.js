// ---------------------------------------------------------------- rótulos técnicos (HUD 2D encima del 3D): pocos, con línea guía, y solo con datos que tienen fuente (FUENTES.md)
function buildHudPlan() {}
const wp = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
function hudAt(t) {
  hudBegin();
  // la nota de corte: lectura del altímetro (sube con el avión y se queda en 12,484)
  const nk = env(t, K.politecnica - 0.2, K.crees + 0.35, 0.3, 0.35);
  if (nk > 0.01) {
    const v = NOTA(t), txt = v.toFixed(3).replace('.', ','), y = 1395;
    hg.save(); hg.globalAlpha = nk; hg.textAlign = 'center'; hg.textBaseline = 'middle';
    hg.fillStyle = 'rgba(0,0,0,.5)'; rr(hg, 300, y - 120, 480, 230, 18); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 1.5; hg.stroke();
    hg.letterSpacing = '5px'; hfont(22, false); hg.fillStyle = HC.grey; hg.fillText('NOTA DE CORTE · UPM 2025', 540, y - 80);
    const done = t > K.nota + 1.0; hg.letterSpacing = '4px'; hfont(96); hg.shadowColor = done ? HC.amber : 'transparent'; hg.shadowBlur = done ? 22 : 0;
    hg.fillStyle = done ? '#FFC85A' : HC.white; hg.fillText(txt, 520, y + 5); hg.shadowBlur = 0;
    hfont(34, false); hg.fillStyle = HC.grey; hg.textAlign = 'left'; hg.fillText('/ 14', 690, y + 20);
    hg.restore();
  }
  // túnel de viento: dónde baja y dónde sube la presión; peso y sustentación
  if (S.aero.visible) {
    const A = AER, kp = env(t, K.aerod + 0.55, K.avion6 - 0.1, 0.35, 0.3);
    callout(A.clone().add(v3(-0.15, 0.22, 0.62)), 'BAJA PRESIÓN', 'el aire va más rápido', kp, { color: '#7FC4FF', dx: -120, dy: -150, size: 27, bg: true });
    callout(A.clone().add(v3(0.1, -0.16, 0.62)), 'ALTA PRESIÓN', null, kp, { color: '#FF7A6E', dx: 120, dy: 170, size: 27, bg: true });
    const jw = S.aeroJet.visible ? wp(S.aero, S.aeroJet.position.x, S.aeroJet.position.y - 1.2, S.aeroJet.position.z) : null;
    if (jw) callout(jw, 'PESO', 'cientos de toneladas', env(t, K.toneladas + 0.15, K.estructuras - 0.1, 0.3, 0.25), { color: '#FF7A6E', dx: 130, dy: 60, size: 28, bg: true });
    if (jw) callout(jw.clone().add(v3(0, 2.1, 0)), 'SUSTENTACIÓN', 'empuja hacia arriba', env(t, K.sostiene + 0.2, K.estructuras - 0.1, 0.3, 0.25), { color: '#7FC4FF', dx: -130, dy: -80, size: 28, bg: true });
  }
  // ensayo del ala: la estructura se certifica a 1,5 veces la carga máxima prevista (CS-25.303 / 25.305)
  if (S.wingRig.visible) {
    const tip = WNG.clone().add(wTop(0.97, 0.3, S.bigWingM.userData.u.uFlex.value));
    callout(tip, 'ENSAYO: 150 % DE LA CARGA LÍMITE', 'y no se rompe', env(t, K.alas + 0.45, K.fibra - 0.25, 0.35, 0.25), { color: HC.amber, dx: -150, dy: -140, size: 25, bg: true });
    const pl = WNG.clone().add(wTop(0.25, 0.42, S.bigWingM.userData.u.uFlex.value)).add(v3(0, 0.3, 0));
    callout(pl, 'FIBRA DE CARBONO', 'capas a 0°, 45°, 90° y −45°', env(t, K.carbono + 0.05, K.propulsion - 0.05, 0.3, 0.2), { color: HC.white, dx: 120, dy: -170, size: 27, bg: true });
  }
  // turbofán en corte y motor cohete
  if (S.engine.visible) {
    const E = S.engine, k0 = K.motores + 0.45, k1 = K.cohetes - 0.05, s = 0.95;
    callout(wp(E, 0.05 * s, 0.62 * s, 0.45 * s), 'FAN', null, env(t, k0, k1, 0.3, 0.25), { dx: 90, dy: -150, size: 27, bg: true });
    callout(wp(E, -0.95 * s, 0.32 * s, 0.25 * s), 'COMPRESOR', null, env(t, k0 + 0.15, k1, 0.3, 0.25), { dx: -90, dy: -190, size: 27, bg: true });
    callout(wp(E, -1.48 * s, 0.27 * s, 0.15 * s), 'CÁMARA DE COMBUSTIÓN', null, env(t, K.reaccion - 0.05, k1, 0.3, 0.25), { color: '#FFB06A', dx: -60, dy: 210, size: 26, bg: true });
    callout(wp(E, -2.05 * s, 0.38 * s, 0.25 * s), 'TURBINA', null, env(t, K.reaccion + 0.15, k1, 0.3, 0.25), { dx: 80, dy: 160, size: 27, bg: true });
    callout(wp(S.rke, 0.45, 0.2, 0.15), 'MOTOR COHETE', 'combustible + oxidante', env(t, K.cohetes + 0.3, K.mecanica - 0.35, 0.3, 0.2), { dx: -120, dy: -150, size: 27, bg: true });
  }
  // órbita: la gravedad tira hacia la Tierra; la velocidad lateral hace que «caiga» sin llegar nunca
  if (S.earth.visible && S.gArrow.visible) {
    const p = wp(S.gArrow, 0, 0.75, 0), q = wp(S.vArrow, 0, 1.05, 0), k = env(t, K.porque9 + 0.15, K.y10 - 0.05, 0.3, 0.25);
    callout(p, 'GRAVEDAD', null, k, { color: '#FF7A6E', dx: -110, dy: 110, size: 28, bg: true });
    callout(q, 'VELOCIDAD', '≈ 28.000 km/h', k, { color: '#7CF0A9', dx: 110, dy: -120, size: 28, bg: true });
  }
  // llegadas a Madrid: separación entre aviones
  if (S.earth.visible && S.approach[3].p.visible) {
    callout(wp(S.approach[3].p, 0, 0, 0), 'SEPARACIÓN MÍNIMA', 'entre cada avión', env(t, K.sin10 - 0.05, CUT3 - 0.15, 0.3, 0.15), { color: '#7CF0A9', dx: 120, dy: -120, size: 27, bg: true });
  }
}
