// ---------------------------------------------------------------- «El efecto dominó»: LA FRASE de arriba (fija desde el primer fotograma, blanca, monoespaciada, dos líneas).
function buildHudPlan() { HFONT = MONO; HW = [700, 400]; }
const PHRASE = ['LO PEQUEÑO', 'MUEVE LO ENORME.'];
function hudAt(t) { hudBegin(); hg.save(); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '10px'; hfont(48);
  hg.shadowColor = 'rgba(0,0,0,0.9)'; hg.shadowBlur = 18; hg.fillStyle = '#F0F0F0'; hg.fillText(PHRASE[0], W / 2 + 5, 262); hg.fillText(PHRASE[1], W / 2 + 5, 330); hg.restore(); }
window.labelsAt = function (t) { frame(t); return { p: [], h: [], k: [] }; };
