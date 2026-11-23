// ---------------------------------------------------------------- RÓTULOS: los nombres de los seguidores NO están aquí (privacidad): el montaje los pinta en local con las posiciones
// que da window.labelsAt(t) (quién se ve, dónde cae su cabeza y a cuántos píxeles por metro). Aquí, en la imagen, no se dibuja nada.
function buildHudPlan() { HFONT = 'Inter'; HW = [700, 500]; }
function hudAt(t) { hudBegin(); }
// paredes que tapan (cajas): sin esto salían nombres de soldados por encima del muro del cuartel o de la gente de la azotea vista desde la calle
let OCC = null; const _ray = new THREE.Ray(), _hit = new THREE.Vector3();
function occBoxes() { const B = (x0, y0, z0, x1, y1, z1) => new THREE.Box3(_v(x0, y0, z0), _v(x1, y1, z1)), o = [];
  o.push(B(-16.3, 0, -14, -15.7, 3.1, -3.5), B(-16.3, 0, 3.5, -15.7, 3.1, 14), B(-40, 0, -14.3, -16, 3.1, -13.7), B(-40, 0, 13.7, -27.5, 3.1, 14.3), B(-23.5, 0, 13.7, -16, 3.1, 14.3), B(-40, 0, -12, -34, 7.2, 12));   // cuartel (día 5: puerta sur)
  o.push(B(HOT.X0 + 0.3, 0.5, HOT.Z0 + 0.3, HOT.X1 - 0.3, HOT.TOP + 0.33, HOT.Z1 - 0.3));                                                             // hotel (macizo)
  o.push(B(-28.2, 0, 23.5, -20.6, 14, 31.5), B(-20.2, 0, 23.5, 15.5, 14, 31.5));                                                              // manzana del sur (el chino aparte: se ve por el escaparate)
  o.push(B(-0.95, 0, -0.95, 0.95, 2.84, 0.95), B(-0.55, 2.84, -0.55, 0.65, 6.6, 0.55));                                                              // pedestal y estatua
  o.push(B(25.2, 0, -40, 34, 20, 16)); o.push(B(-14, 0, -45, 14, 18, -17.2));                                                                     // tiendas del este y ayuntamiento
  return o; }
function hiddenBy(from, to, skipIn) { _ray.origin.copy(from); _ray.direction.copy(to).sub(from); const d = _ray.direction.length(); _ray.direction.normalize();
  for (const b of OCC) { if (b.containsPoint(to) || b.containsPoint(from)) continue; if (_ray.intersectBox(b, _hit) && _hit.distanceTo(from) < d - 0.25) return true; } return false; }
window.labelsAt = function (t) {
  frame(t); if (!OCC) OCC = occBoxes(); const out = [], e = vpOf().elements, f = (H / 2) / Math.tan(cam.fov * Math.PI / 360), inHall = cam.position.z < -16.6 && Math.abs(cam.position.x) < 13, R = v => Math.round(v);
  PEOPLE.forEach((p, i) => { if (!p.visible || (p === S.statue)) return; const isHall = p.userData.hallAt ? p.userData.hallAt(t) : p.parent === S.hall; if (isHall !== inHall) return;
    p.updateMatrixWorld(true); const hp = p.userData.J.head.getWorldPosition(_v()).add(_v(0, 0.36 * p.userData.k, 0)), cw = e[3] * hp.x + e[7] * hp.y + e[11] * hp.z + e[15]; if (cw <= 0.3) return;
    const ppm = f / cw; if (ppm < 95) return; const sx = ((e[0] * hp.x + e[4] * hp.y + e[8] * hp.z + e[12]) / cw + 1) / 2 * W, sy = (1 - (e[1] * hp.x + e[5] * hp.y + e[9] * hp.z + e[13]) / cw) / 2 * H;
    if (sx < -150 || sx > W + 150 || sy < 0 || sy > H + 150) return; if (hiddenBy(cam.position, hp)) return; out.push([i, R(sx), R(sy), R(ppm * 10)]); });
  // zonas que ningún nombre puede tapar: las tarjetas del comentario y el bocadillo «¡Adelante!» (rectángulo en pantalla)
  const K = []; for (const o of [S.card, S.bubble]) { if (!o || !o.visible) continue; o.updateMatrixWorld(true); const g = o.geometry.parameters, hw = g.width / 2, hh = g.height / 2; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ok = true;
    for (const [a, b] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) { const q = o.localToWorld(_v(a, b, 0)), cw = e[3] * q.x + e[7] * q.y + e[11] * q.z + e[15]; if (cw <= 0.05) { ok = false; break; }
      const sx = ((e[0] * q.x + e[4] * q.y + e[8] * q.z + e[12]) / cw + 1) / 2 * W, sy = (1 - (e[1] * q.x + e[5] * q.y + e[9] * q.z + e[13]) / cw) / 2 * H; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
    if (ok) K.push([R(x0), R(y0), R(x1), R(y1)]); }
  return { p: out, h: [], k: K }; };
// quién es quién (índices de PEOPLE): los cuatro que nombra la voz y el oficio de algunos
window.whoIs = () => { const r = {}; PEOPLE.forEach((p, i) => { const R0 = p.userData.role; r[i] = { k: R0.k, vip: R0.vip || null, vipW: R0.vipW || null }; }); return r; };
