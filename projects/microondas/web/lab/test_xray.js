// ---------------------------------------------------------------- prueba de xray.js (lab.sh con EXTRA="../src/12_microwave.js magnetron.js"). Fondo: vacío oscuro y una losa limpia.
// t entero = vista fija (la parte decimal anima): 0 cerrado · 1 abierto · 2 abierto en rayos X (brillo, calor, ventilador, ondas) · 3 el magnetrón arriba ·
// 4 el radar apareciendo · 5 el radar entero · 6–9 el vuelo por la guía (u = 0, 0,4, 0,72, 1).
// t ≥ 20: el tramo del vídeo con UNA sola cámara (τ = t − 16: de 4 a 10,5 s): se abre, sube el magnetrón, aparece el radar, vuelve y la cámara entra por la guía.
let XRMW = null;
async function labBuild() {
  { const ce = console.error.bind(console); console.error = (...a) => ce(...a.map(x => typeof x === 'string' ? x.replace(/VALIDATE_STATUS false/g, 'VS=false').replace(/Program Info Log/g, 'PIL') : x)); }
  scene.background = canvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b0f17'); gr.addColorStop(0.55, '#06080c'); gr.addColorStop(1, '#020203'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  if (S.counter) S.counter.visible = false;
  const slab = rbox(120, 3, 90, new THREE.MeshPhysicalMaterial({ color: 0x1c1e22, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4 }), 1.2); slab.rotation.x = -Math.PI / 2; slab.position.set(0, -1.5, -24); scene.add(slab);
  XRMW = buildMicrowave(); XRMW.position.set(0, 0, -6); scene.add(XRMW); buildXray(XRMW);
  if (typeof buildMagWaves === 'function') { buildMagWaves(); XRMW.add(MAGW.group); }
  console.error('INFO xray: ' + Math.round(XR.tris) + ' triángulos (sin el magnetrón: ' + Math.round(XR.mag.tris) + ' más)');
}
function xrLabState(P, mwOn = 0, t = 0) { microwaveAt(XRMW, { on: mwOn, turn: t * 0.6, door: 0, display: mwOn ? '1:00' : '12:34' }); xrayAt(t, P); if (MAGW) magWavesAt(t, { on: P.waves || 0, flow: P.flow || 0 }); }
const XRV = [
  [{}, [92, 44, 96, 2, 15, -22, 36]],
  [{ open: 1, fan: 1 }, [92, 70, 102, 3, 17, -22, 36]],
  [{ open: 1, glow: 1, hot: 1, fan: 1, beam: 1 }, [92, 70, 102, 3, 17, -22, 36]],
  [{ open: 1, glow: 0.4, fan: 1, lift: 1 }, [86, 74, 100, 10, 30, -24, 36]],
  [{ open: 1, glow: 0.3, fan: 1, lift: 1, radar: 0.45 }, [70, 62, 78, 15, 46, -27, 36]],
  [{ open: 1, glow: 0.3, fan: 1, lift: 1, radar: 1 }, [70, 62, 78, 15, 46, -27, 36]],
];
function labAt(t) {
  { const now = performance.now(); if (window._xrT) console.error('INFO t=' + window._xrK + ' ' + (now - window._xrT).toFixed(0) + ' ms'); window._xrT = now; window._xrK = t; }
  if (t >= 20) return xrLabTimeline(t - 16);
  const k = Math.floor(t + 1e-6);
  if (k < XRV.length) { xrLabState(XRV[k][0], 0, t); return XRV[k][1]; }
  const u = [0, 0.4, 0.72, 1][Math.min(3, k - 6)] ?? 0; xrLabState({ open: 1, fan: 1, beam: 1, fly: u, waves: u > 0.7 ? 1 : 0, flow: 0.6 }, 1, t); return xrayCam(u);
}
// el tramo del vídeo: una sola toma, sin cortes
function xrLabTimeline(tau) {
  const P = { open: win(tau, 4.4, 1.3), glow: 0.55 * win(tau, 4.7, 1.0) * (1 - win(tau, 9.3, 0.4)), fan: 1, lift: win(tau, 5.8, 1.4) * (1 - win(tau, 9.0, 0.5)),
    radar: win(tau, 7.2, 1.0) * (1 - win(tau, 8.55, 0.55)), beam: win(tau, 9.35, 0.4), hot: 0.6 * win(tau, 9.2, 0.6), fly: tau >= 9.55 ? clamp((tau - 9.7) / 0.8) : -1,
    waves: win(tau, 10.25, 0.25), flow: win(tau, 10.25, 1.0) };
  xrLabState(P, tau > 9.2 ? 1 : 0, tau);
  const c0 = xrayCam(0), K0 = [[4.0, [96, 42, 96], [2, 15, -22], 36], [5.8, [92, 70, 102], [3, 17, -22], 36], [7.0, [82, 76, 98], [12, 33, -24], 36], [7.7, [70, 62, 78], [15, 46, -27], 36],
    [9.0, [64, 60, 70], [15, 44, -27], 36], [9.4, [34, 46, 6], [12, 20, -34], 46], [9.7, [c0[0], c0[1], c0[2]], [c0[3], c0[4], c0[5]], c0[6]]];
  if (tau < 9.7) { const c = camKeys(tau, K0); return [c.p.x, c.p.y, c.p.z, c.l.x, c.l.y, c.l.z, c.f]; }
  return xrayCam((tau - 9.7) / 0.8);
}
