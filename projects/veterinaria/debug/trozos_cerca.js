// qué trozos pasan cerca de la cámara (índice, distancia mínima, fotograma) y dónde acaban en el suelo
const out = [];
S.shards.forEach((m, i) => {
  let best = 9, bf = -1;
  for (let f = 0; f < 120; f++) { const t = f / 60; NOW = t; const st = camAt(t); shardAt(m, burstU(t)); const d = m.position.clone().add(S.wall.position).distanceTo(st.p); if (d < best) { best = d; bf = f; } }
  shardAt(m, 5); const r = m.position.clone().add(S.wall.position);
  if (best < 0.6) out.push(`#${i} d=${best.toFixed(2)} f=${bf} reposo=(${r.x.toFixed(2)},${r.y.toFixed(2)},${r.z.toFixed(2)}) c=(${m.userData.c.x.toFixed(2)},${m.userData.c.y.toFixed(2)}) k=${m.userData.k.toFixed(2)}`);
});
let far = 0; S.shards.forEach(m => { shardAt(m, 5); if (m.position.z + S.wall.position.z > 0.55) far++; });
console.log('ERROR ' + out.join(' | ') + ' || fuera del suelo de la clínica: ' + far + ' de ' + S.shards.length);
