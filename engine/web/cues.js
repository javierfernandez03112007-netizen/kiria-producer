// Marcas por palabra: cada imagen aparece JUSTO cuando se oye su palabra (tiempos.json de la voz).
//   const C = await loadCues('../tiempos.json');
//   C.at('dónut')        → segundo exacto en que empieza «dónut» (1.ª vez);  C.at('euríbor', 2) → 2.ª vez
//   C.seq([['esfera','sphere'], ['dónut','donut']])  → [[t, 'sphere'], [t, 'donut']] para Morpher.play
const norm = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');

export async function loadCues(url, lead = 0.04) {
  const lines = await (await fetch(url)).json();
  const words = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), line: li + 1 })));
  const at = (word, k = 1) => {
    const key = norm(word); let c = 0;
    for (const w of words) if (w.n.startsWith(key) && ++c === k) return w.start - lead;
    console.error('ERROR cue sin palabra: ' + word); return 1e9;
  };
  const seq = pairs => pairs.map(([word, value, k]) => [at(word, k || 1), value]);
  return { words, at, seq, lines };
}
