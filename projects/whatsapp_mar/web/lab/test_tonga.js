// prueba de la maqueta de Tonga: t = 0..6,5 s (43,3–49,8 s del vídeo). Erupción en u = 0,15 (t ≈ 0,98 s); internet se apaga de t ≈ 3,4 a 6.
async function labBuild() { moodSet('tonga'); scene.add(buildTonga()); }
function labAt(t) {
  const u = clamp(t / 6.5), te = t - 0.15 * 6.5, net = 1 - win(t, 3.4, 2.6);
  tongaAt(t, { te, net });
  return TON_CAM(u);
}
