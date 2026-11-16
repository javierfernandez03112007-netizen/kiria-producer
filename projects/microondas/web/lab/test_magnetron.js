// ---------------------------------------------------------------- prueba del magnetrón (lab.sh). t entero = vista fija (la parte decimal anima el tiempo):
//  0 montado sobre la encimera · 1 vista explosionada · 2 corte con el filamento al rojo y los electrones · 3 macro del ánodo desde arriba
//  (corte horizontal) · 4 corte y frentes de onda al aire · 5 corte con la guía de ondas · 6 corte horizontal, plano general · 7 corte a medias ·
//  (con EXTRA=../src/12_microwave.js) 10 en su sitio dentro del microondas (carcasa transparente) · 11 las ondas llenan la cavidad (flow 1) ·
//  12 las ondas saliendo por la mica (flow 0,3).
//  t ≥ 20: el tramo del vídeo (τ = t − 16, de 4 a 14 s): la carcasa se vuelve transparente, el magnetrón sale flotando y se despieza,
//  se corta, el filamento se pone al rojo, los electrones giran y las ondas salen por la antena y llenan el horno.
let MAGLMW = null;
async function labBuild() {
  { const ce = console.error.bind(console); console.error = (...a) => ce(...a.map(x => typeof x === 'string' ? x.replace(/VALIDATE_STATUS false/g, 'VS=false').replace(/Program Info Log/g, 'PIL').replace(/Material (Name|Type)/g, 'Mat $1') : x)); }   // que se vean los errores de sombreador
  buildMagnetron({ guide: true }); scene.add(MAG.group);
  if (typeof buildMicrowave === 'function') { MAGLMW = buildMicrowave(); MAGLMW.position.set(0, 0, -6); scene.add(MAGLMW); buildMagWaves(); MAGLMW.add(MAGW.group); }
  if (window.MAGDBG) { const L = []; MAG.group.traverse(o => { if (o.isMesh) { const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (g.isInstancedBufferGeometry ? g.instanceCount : 1); L.push([Math.round(n), (o.parent && o.parent.name) + '/' + (o.material.type || '') + '/' + g.type]); } }); L.sort((a, b) => b[0] - a[0]); console.error('INFO ' + L.slice(0, 14).map(x => x.join(':')).join(' | ')); }
  console.error('INFO magnetrón: ' + Math.round(MAG.tris) + ' triángulos' + (MAGW ? ' · ondas del horno: ' + Math.round(MAGW.tris) + ' (' + MAGW.sets.length + ' fuentes)' : ''));
}
const MAGQ = Math.PI / 2;
const MAGV = [
  { at: [0, 5.25, 8], ry: -0.5, P: {}, cam: [27.5, 19.5, 47, 0, 5.2, 8, 26] },
  { at: [0, 12.6, 8], ry: -0.25, P: { explode: 1 }, cam: [20, 27, 70, 2.2, 14.2, 8, 28] },
  { at: [0, 5.25, 8], ry: 0, P: { cut: 1, glow: 1, electrons: 1 }, cam: [27, 24.5, 39, 0, 4.8, 8, 26] },
  { at: [0, 5.25, 8], ry: 0, P: { cut: 1, glow: 1, electrons: 1, cutYaw: MAGQ, cutHalf: MAGQ, cutTop: 0.04 }, cam: [0.9, 10.6, 13.2, 0, 5.2, 8, 34] },
  { at: [0, 5.25, 8], ry: 0, P: { cut: 1, glow: 1, electrons: 1, wave: 1 }, cam: [24, 17, 40, 0, 8, 8, 30] },
  { at: [0, 5.25, 8], ry: 0, P: { cut: 1, glow: 1, electrons: 1, wave: 1, guide: 1 }, cam: [24, 18, 40, 0, 8, 8, 30] },
  { at: [0, 5.25, 8], ry: 0.3, P: { cut: 1, glow: 1, electrons: 1, cutYaw: MAGQ, cutHalf: MAGQ, cutTop: 0.04 }, cam: [9, 26, 38, 0, 4.6, 8, 26] },
  { at: [0, 5.25, 8], ry: 0, P: { cut: 0.5, glow: 0.5 }, cam: [27, 24.5, 39, 0, 4.8, 8, 26] },
];
function magLabMW(on) {     // el magnetrón dentro del microondas (o fuera, sobre la encimera)
  if (on && MAGLMW) { if (MAG.group.parent !== MAGLMW) MAGLMW.add(MAG.group); MAG.group.position.set(17, 15.5, -14); MAG.group.rotation.set(0, 0, Math.PI / 2); MAG.group.scale.setScalar(1); }
  else { if (MAG.group.parent !== scene) scene.add(MAG.group); }
}
function magLabShell(op) { if (!MAGLMW) return; const m = MAGLMW.userData.M.metal; m.transparent = op < 0.999; m.opacity = op; m.depthWrite = op > 0.5; MAGLMW.userData.M.enamel.transparent = op < 0.999; MAGLMW.userData.M.enamel.opacity = Math.max(op, 0.35); }
function labAt(t) {
  { const now = performance.now(); if (window._magT) console.error('INFO t=' + window._magK + ' ' + (now - window._magT).toFixed(0) + ' ms · programas ' + renderer.info.programs.length + ' · llamadas ' + renderer.info.render.calls + ' · triángulos ' + renderer.info.render.triangles); window._magT = now; window._magK = t; }   // cronómetro
  MAG.group.visible = true;
  if (window.MAGHIDE || t >= 30 && t < 32) { MAG.group.visible = false; if (MAGLMW) MAGLMW.visible = false; return MAGV[t >= 31 ? 2 : 0].cam; }   // sin magnetrón (la base, para comparar)
  if (window.MAGONLY) MAG.group.traverse(o => { if (o.isMesh && !window.MAGONLY.includes(o.material.type)) o.visible = false; });
  if (t >= 20) return magLabTimeline(t - 16);
  if (t >= 40 && t < 50) {   // experimentos de coste (vista 2): 40 normal · 41 sin interior · 42 sin electrones · 43 a una cara · 44 sin sombras del magnetrón
    const e = Math.floor(t) - 40; const V = MAGV[2]; magLabMW(false); MAG.group.position.set(...V.at); MAG.group.rotation.set(0, V.ry, 0); magnetronAt(t, V.P); if (MAGLMW) MAGLMW.visible = false;
    if (e === 1) MAG.inA.visible = false; if (e === 2) { MAG.el.visible = false; MAG.haze.visible = false; }
    for (const pc of MAG.pieces) for (const m of pc.mats) { const want = e === 3 ? THREE.FrontSide : THREE.DoubleSide; if (m.side !== want && !m.userData.magClipOnly) { m.side = want; m.needsUpdate = true; } }
    MAG.group.traverse(o => { if (o.isMesh && o.userData.cs0 === undefined) o.userData.cs0 = o.castShadow; if (o.isMesh) o.castShadow = e === 4 ? false : o.userData.cs0; });
    for (const pc of MAG.pieces) for (const m of pc.mats) m.shadowSide = e === 5 ? THREE.BackSide : null;
    return V.cam; }
  let k = Math.floor(t + 1e-6);
  if (k >= 10 && !MAGLMW) k = 0;
  if (k < 10) { if (k >= MAGV.length) k = 0; const V = MAGV[k]; magLabMW(false); MAG.group.position.set(...V.at); MAG.group.rotation.set(0, V.ry, 0); MAG.group.scale.setScalar(1);
    magnetronAt(t, V.P); if (MAGLMW) { MAGLMW.visible = false; magWavesAt(t, {}); } return V.cam; }
  MAGLMW.visible = true; magLabMW(true);
  if (k === 10) { magLabShell(0.18); microwaveAt(MAGLMW, { on: 1, turn: t * 0.6, door: 0, display: '1:00' }); magnetronAt(t, { cut: 1, glow: 1, electrons: 1, wave: 1, guide: 1 }); magWavesAt(t, { on: 1, flow: 0.5 });
    return [62, 42, 46, 13, 15, -19, 26]; }
  magLabShell(1); microwaveAt(MAGLMW, { on: 1, turn: t * 0.6, door: 1, display: '1:00' }); magnetronAt(t, {});
  magWavesAt(t, { on: 1, flow: k === 11 ? 1 : 0.3 });
  return [-14, 24, 46, -6, 14, -21, 36];
}
// el tramo del vídeo (τ en segundos): 4,4–9,1 «Tu microondas lleva dentro un magnetrón…» · 9,2–13,7 «Dispara ondas que vibran 2.450 millones…»
function magLabTimeline(tau) {
  if (!MAGLMW) return [21, 12.5, 34, 0, 5.4, 8, 26];
  MAGLMW.visible = true; magLabMW(true);
  const sh = 1 - 0.85 * win(tau, 4.5, 0.8); magLabShell(sh);
  microwaveAt(MAGLMW, { on: tau > 9.2 ? 1 : 0, turn: tau * 0.6, door: 0, display: tau > 9.2 ? '1:00' : '12:34' });
  // sale flotando: de su sitio (17, 15.5, −14 en el microondas) a delante del panel, girando para enseñar el costado; luego vuelve a su sitio
  const out = win(tau, 5.0, 2.2) * (1 - win(tau, 10.6, 1.6)), p0 = v3(17, 15.5, -14), p1 = v3(16, 23, 16);
  MAG.group.position.lerpVectors(p0, p1, out); MAG.group.rotation.set(0, 0, Math.PI / 2 * (1 - out)); MAG.group.rotateY(-0.6 * out);
  const P = { explode: win(tau, 6.0, 2.0) * (1 - win(tau, 9.0, 1.0)), cut: win(tau, 9.3, 1.1), glow: win(tau, 9.6, 0.6), electrons: win(tau, 10.0, 0.8), wave: win(tau, 11.0, 0.8), guide: out < 0.5 ? 1 : 0 };
  magnetronAt(tau, P); magWavesAt(tau, { on: win(tau, 11.6, 0.5), flow: win(tau, 11.6, 2.0) });
  const c = camKeys(tau, [[4.0, [40, 34, 74], [8, 14, -14], 30], [6.5, [44, 30, 70], [14, 20, 6], 30], [8.5, [36, 28, 52], [15, 21, 12], 30], [10.2, [22, 30, 40], [15, 20, 12], 26],
    [11.6, [40, 36, 60], [10, 16, -10], 30], [14, [30, 30, 60], [0, 14, -14], 34]]);
  return [c.p.x, c.p.y, c.p.z, c.l.x, c.l.y, c.l.z, c.f];
}
