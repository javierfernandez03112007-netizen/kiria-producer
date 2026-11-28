// ---------------------------------------------------------------- «Empieza torcido»: LA FRASE de arriba (fija desde el primer fotograma, monoespaciada, como un rótulo).
function buildHudPlan() { HFONT = MONO; HW = [700, 400]; }
const PHRASE = 'EMPIEZA TORCIDO.';
function hudAt(t) { hudBegin(); hg.save(); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '11px'; hfont(52);
  hg.shadowColor = 'rgba(255,236,214,0.7)'; hg.shadowBlur = 16; hg.fillStyle = '#241A14'; hg.fillText(PHRASE, W / 2 + 5, 300); hg.restore(); }
window.labelsAt = function (t) { frame(t); return { p: [], h: [], k: [] }; };
