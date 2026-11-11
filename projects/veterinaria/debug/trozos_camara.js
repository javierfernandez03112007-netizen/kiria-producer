// lista los fotogramas en los que algún trozo de la pared pasa a menos de 0,5 m de la cámara
const near = [];
for (let f = 0; f < Math.round(END * 60); f++) {
  const t = f / 60; if (t > CUTS[0] + 0.05 && t < CUTS[CUTS.length - 1] - 0.05) continue;
  NOW = t; const st = camAt(t), u = burstU(t); let dmin = 9;
  for (const m of S.shards) { shardAt(m, u); const w = m.position.clone().add(S.wall.position); dmin = Math.min(dmin, w.distanceTo(st.p)); }
  if (dmin < 0.5) near.push(f + ':' + dmin.toFixed(2));
}
console.log('ERROR cerca ' + near.join(' '));
