let SV;
async function labBuild() { SV = await buildStove(); }
const P0 = () => STOVE_POS.clone().add(POT_L);
function labAt(t) { const k = Math.round(t), p = P0();
  stoveAt(SV, t, { heat: 1, cut: k >= 1 ? 1 : 0, boil: k >= 1 ? 1 : 0.3 });
  if (k === 0) return [p.x + 45, p.y + 45, p.z + 70, p.x, p.y + 3, p.z, 30];
  if (k === 1) return [p.x + 6, p.y + 12, p.z + 34, p.x, p.y + 4, p.z, 32];
  return [p.x + 2, p.y + 3, p.z + 9, p.x, p.y + 0.8, p.z - 3, 40]; }
