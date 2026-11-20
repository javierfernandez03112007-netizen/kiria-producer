// ---------------------------------------------------------------- RÓTULOS: los nombres de los seguidores NO están aquí (privacidad): el montaje los pinta en local con las posiciones
// que da window.labelsAt(t) (quién se ve, dónde cae su cabeza y a cuántos píxeles por metro). Aquí, en la imagen, no se dibuja nada.
function buildHudPlan() { HFONT = 'Inter'; HW = [700, 500]; }
function hudAt(t) { hudBegin(); }
window.labelsAt = function (t) {
  frame(t); const out = [], e = vpOf().elements, f = (H / 2) / Math.tan(cam.fov * Math.PI / 360), inHall = cam.position.z < -16.6 && Math.abs(cam.position.x) < 13, R = v => Math.round(v);
  PEOPLE.forEach((p, i) => { if (!p.visible || (p === S.statue)) return; const isHall = p.parent === S.hall; if (isHall !== inHall) return;
    p.updateMatrixWorld(true); const hp = p.userData.J.head.getWorldPosition(_v()).add(_v(0, 0.36 * p.userData.k, 0)), cw = e[3] * hp.x + e[7] * hp.y + e[11] * hp.z + e[15]; if (cw <= 0.3) return;
    const ppm = f / cw; if (ppm < 95) return; const sx = ((e[0] * hp.x + e[4] * hp.y + e[8] * hp.z + e[12]) / cw + 1) / 2 * W, sy = (1 - (e[1] * hp.x + e[5] * hp.y + e[9] * hp.z + e[13]) / cw) / 2 * H;
    if (sx < -150 || sx > W + 150 || sy < 0 || sy > H + 150) return; out.push([i, R(sx), R(sy), R(ppm * 10)]); });
  return { p: out, h: [] }; };
// quién es quién (índices de PEOPLE): los cuatro que nombra la voz y el oficio de algunos
window.whoIs = () => { const r = {}; PEOPLE.forEach((p, i) => { const R0 = p.userData.role; r[i] = { k: R0.k, vip: R0.vip || null }; }); return r; };
