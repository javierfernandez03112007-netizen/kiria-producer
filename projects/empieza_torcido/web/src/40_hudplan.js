// ---------------------------------------------------------------- «Empieza torcido» (v2): LA FRASE de arriba (fija desde el primer fotograma, blanca y monoespaciada).
function buildHudPlan() { HFONT = MONO; HW = [700, 400]; }
const PHRASE = 'EMPIEZA TORCIDO.';
function hudAt(t) { hudBegin(); hg.save(); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '11px'; hfont(50);
  hg.shadowColor = 'rgba(255,255,255,0.35)'; hg.shadowBlur = 14; hg.fillStyle = '#F2F2F2'; hg.fillText(PHRASE, W / 2 + 5, 290); hg.restore(); }
window.labelsAt = function (t) { frame(t); return { p: [], h: [], k: [] }; };
