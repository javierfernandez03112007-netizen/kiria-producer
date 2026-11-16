// prueba del mapa (20_map.js): t = 0..7 → planos. bash lab/lab.sh ../src/20_map.js test_map.js map 0 1 2 3 4 5 6 7
async function labBuild() { S.fogK = 1; moodSet('museo'); scene.add(buildMap()); }
function labAt(t) {
  const shot = Math.floor(t + 1e-4), f = t - shot;
  const fog = k => { if (S.fogK !== k) { S.fogK = k; moodSet('museo'); } };
  const mid = mapP(-24, 17);
  if (shot <= 1) { fog(1); mapAt(t, { draw: shot === 0 ? 1 : 0.45, ella: 0.55, sat: 1 });
    return [mid.x - 90, 150, mid.z + 230, mid.x - 20, 0, mid.z - 40, 40]; }
  if (shot <= 3) { fog(0.04); mapAt(t, { breaks: shot === 3 ? 1 : 0, ace: shot === 3 ? 1 : 0, sat: 1 });
    return [-150, 3300, 3900, -150, 0, -250, 40]; }
  if (shot >= 8) { fog(1); mapAt(t, { sat: 1, ella: 0.3 }); const sp = mapAnchor('sat'); return [sp.x + 30, sp.y + 12, sp.z + 48, sp.x, sp.y - 12, sp.z, 40]; }
  const nk = mapAnchor('mauritania'), ac = mapAnchor('ace');
  if (shot <= 5) { fog(1); const off = shot === 5; mapAt(t, { ace: off ? 1 : 0, mauritania: off ? 0 : 1, sat: 0 });
    const c = nk.clone().lerp(ac, 0.72); return [c.x - 5, 80, c.z + 95, c.x, 0, c.z, 40]; }
  fog(1); const off = shot === 7, tg = mapAnchor('tonga'), fj = mapAnchor('fiji'); mapAt(t, { tongaCut: off ? 1 : 0, tonga: off ? 0 : 1, sat: 0 });
  const c = tg.clone().lerp(fj, 0.3); return [c.x + 20, 150, c.z + 150, c.x, 0, c.z, 40];
}
